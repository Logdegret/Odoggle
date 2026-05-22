-- Run this entire file in Supabase → SQL Editor

-- Players (extends auth.users, auto-created via trigger)
CREATE TABLE IF NOT EXISTS public.players (
  id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username     TEXT        NOT NULL DEFAULT 'Guest',
  elo          INTEGER     NOT NULL DEFAULT 1000,
  wins         INTEGER     NOT NULL DEFAULT 0,
  losses       INTEGER     NOT NULL DEFAULT 0,
  is_premium   BOOLEAN     NOT NULL DEFAULT FALSE,
  avatar       TEXT        NOT NULL DEFAULT '🐶',
  is_anonymous BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;
DROP POLICY IF EXISTS "Own row update"          ON public.players;
CREATE POLICY "Anyone can read players"  ON public.players FOR SELECT  USING (true);
CREATE POLICY "Own row update"           ON public.players FOR UPDATE  USING (auth.uid() = id);

-- Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id       UUID        REFERENCES public.players(id),
  player2_id       UUID        REFERENCES public.players(id),
  winner_id        UUID        REFERENCES public.players(id),
  player1_score    REAL,
  player2_score    REAL,
  player1_pet_type TEXT,
  player2_pet_type TEXT,
  played_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read matches" ON public.matches;
CREATE POLICY "Anyone can read matches"  ON public.matches FOR SELECT  USING (true);

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS public.queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID        REFERENCES public.players(id) ON DELETE CASCADE UNIQUE,
  is_premium   BOOLEAN     NOT NULL DEFAULT FALSE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own queue row" ON public.queue;
CREATE POLICY "Own queue row"  ON public.queue FOR ALL  USING (auth.uid() = player_id);

-- Rooms (active duels)
CREATE TABLE IF NOT EXISTS public.rooms (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id        UUID        REFERENCES public.players(id),
  player2_id        UUID        REFERENCES public.players(id),
  status            TEXT        NOT NULL DEFAULT 'waiting',
  player1_score     REAL,
  player2_score     REAL,
  player1_breakdown JSONB,
  player2_breakdown JSONB,
  player1_verdict   TEXT,
  player2_verdict   TEXT,
  player1_pet_type  TEXT,
  player2_pet_type  TEXT,
  winner_id         UUID        REFERENCES public.players(id),
  player1_elo_delta INTEGER,
  player2_elo_delta INTEGER,
  player1_new_elo   INTEGER,
  player2_new_elo   INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Room participants can read" ON public.rooms;
CREATE POLICY "Room participants can read" ON public.rooms FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Auto-create player profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.players (id, username, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Guest_' || LEFT(NEW.id::text, 6)
    ),
    COALESCE((NEW.raw_app_meta_data->>'provider') = 'anonymous', TRUE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic matchmaking: claim the oldest waiting opponent, create a room, remove both from queue
CREATE OR REPLACE FUNCTION public.join_queue(p_player_id UUID, p_is_premium BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_opponent_id UUID;
  v_room_id     UUID;
BEGIN
  -- Remove any stale entry for this player
  DELETE FROM public.queue WHERE player_id = p_player_id;

  -- Try to find an opponent (premium players match first)
  SELECT player_id INTO v_opponent_id
  FROM public.queue
  WHERE player_id <> p_player_id
  ORDER BY is_premium DESC, joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent_id IS NULL THEN
    -- No opponent: add self to queue
    INSERT INTO public.queue (player_id, is_premium)
    VALUES (p_player_id, p_is_premium)
    ON CONFLICT (player_id) DO UPDATE SET joined_at = NOW();
    RETURN jsonb_build_object('status', 'queued');
  END IF;

  -- Remove opponent from queue
  DELETE FROM public.queue WHERE player_id = v_opponent_id;

  -- Create the room (caller is player2, the waiter is player1/initiator)
  INSERT INTO public.rooms (player1_id, player2_id)
  VALUES (v_opponent_id, p_player_id)
  RETURNING id INTO v_room_id;

  RETURN jsonb_build_object(
    'status',      'matched',
    'roomId',      v_room_id,
    'opponentId',  v_opponent_id,
    'isInitiator', FALSE
  );
END;
$$;

-- Atomic score submission + ELO calculation
CREATE OR REPLACE FUNCTION public.submit_score(
  p_room_id    UUID,
  p_player_id  UUID,
  p_score      REAL,
  p_pet_type   TEXT,
  p_breakdown  JSONB,
  p_verdict    TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room         public.rooms%ROWTYPE;
  v_is_p1        BOOLEAN;
  v_both_scored  BOOLEAN;
  v_winner_id    UUID;
  v_p1_delta     INTEGER;
  v_p2_delta     INTEGER;
  v_p1_new_elo   INTEGER;
  v_p2_new_elo   INTEGER;
  v_p1_elo       INTEGER;
  v_p2_elo       INTEGER;
  K              CONSTANT INTEGER := 32;
  v_expected_p1  REAL;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;

  v_is_p1 := (v_room.player1_id = p_player_id);

  IF v_is_p1 THEN
    UPDATE public.rooms SET player1_score = p_score, player1_pet_type = p_pet_type,
      player1_breakdown = p_breakdown, player1_verdict = p_verdict
    WHERE id = p_room_id;
  ELSE
    UPDATE public.rooms SET player2_score = p_score, player2_pet_type = p_pet_type,
      player2_breakdown = p_breakdown, player2_verdict = p_verdict
    WHERE id = p_room_id;
  END IF;

  -- Refresh
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;

  v_both_scored := (v_room.player1_score IS NOT NULL AND v_room.player2_score IS NOT NULL);

  IF NOT v_both_scored THEN
    RETURN jsonb_build_object('status', 'waiting');
  END IF;

  -- Calculate ELO
  SELECT elo INTO v_p1_elo FROM public.players WHERE id = v_room.player1_id;
  SELECT elo INTO v_p2_elo FROM public.players WHERE id = v_room.player2_id;

  v_expected_p1 := 1.0 / (1.0 + POWER(10.0, (v_p2_elo - v_p1_elo)::REAL / 400.0));

  IF v_room.player1_score > v_room.player2_score THEN
    v_winner_id := v_room.player1_id;
    v_p1_delta  := ROUND(K * (1 - v_expected_p1));
    v_p2_delta  := ROUND(K * (0 - (1 - v_expected_p1)));
  ELSIF v_room.player2_score > v_room.player1_score THEN
    v_winner_id := v_room.player2_id;
    v_p1_delta  := ROUND(K * (0 - v_expected_p1));
    v_p2_delta  := ROUND(K * (1 - (1 - v_expected_p1)));
  ELSE
    v_winner_id := NULL;
    v_p1_delta  := 0;
    v_p2_delta  := 0;
  END IF;

  v_p1_new_elo := GREATEST(0, v_p1_elo + v_p1_delta);
  v_p2_new_elo := GREATEST(0, v_p2_elo + v_p2_delta);

  -- Update room as complete
  UPDATE public.rooms SET
    status            = 'complete',
    winner_id         = v_winner_id,
    player1_elo_delta = v_p1_delta,
    player2_elo_delta = v_p2_delta,
    player1_new_elo   = v_p1_new_elo,
    player2_new_elo   = v_p2_new_elo
  WHERE id = p_room_id;

  -- Update player stats
  UPDATE public.players SET
    elo    = v_p1_new_elo,
    wins   = wins   + CASE WHEN v_winner_id = player1_id THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN v_winner_id = player2_id THEN 1 ELSE 0 END
  WHERE id = v_room.player1_id;

  UPDATE public.players SET
    elo    = v_p2_new_elo,
    wins   = wins   + CASE WHEN v_winner_id = player2_id THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN v_winner_id = player1_id THEN 1 ELSE 0 END
  WHERE id = v_room.player2_id;

  -- Save match record
  INSERT INTO public.matches (
    player1_id, player2_id, winner_id,
    player1_score, player2_score,
    player1_pet_type, player2_pet_type
  ) VALUES (
    v_room.player1_id, v_room.player2_id, v_winner_id,
    v_room.player1_score, v_room.player2_score,
    v_room.player1_pet_type, v_room.player2_pet_type
  );

  RETURN jsonb_build_object('status', 'complete');
END;
$$;

-- Remove player from queue (called on cleanup / disconnect)
CREATE OR REPLACE FUNCTION public.leave_queue(p_player_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.queue WHERE player_id = p_player_id;
END;
$$;

-- Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard AS
  SELECT
    id, username, elo, wins, losses, is_premium, avatar, is_anonymous,
    RANK() OVER (ORDER BY elo DESC) AS rank
  FROM public.players
  ORDER BY elo DESC;

-- Match history view (includes opponent username)
CREATE OR REPLACE VIEW public.match_history AS
  SELECT
    m.id,
    m.player1_id,
    m.player2_id,
    m.winner_id,
    m.player1_score,
    m.player2_score,
    m.player1_pet_type,
    m.player2_pet_type,
    m.played_at,
    p1.username AS player1_username,
    p1.avatar   AS player1_avatar,
    p2.username AS player2_username,
    p2.avatar   AS player2_avatar
  FROM public.matches m
  JOIN public.players p1 ON m.player1_id = p1.id
  JOIN public.players p2 ON m.player2_id = p2.id;
