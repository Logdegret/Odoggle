import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useWebRTC } from '../hooks/useWebRTC.js';
import CamBox from '../components/CamBox.jsx';
import CountdownRing from '../components/CountdownRing.jsx';

const SCORE_FUNCTION_URL = import.meta.env.VITE_SCORE_FUNCTION_URL;
const DUEL_SECONDS = 10;

export default function Duel({ onResult }) {
  const { player, isPremium, session } = useAuth();

  const [phase, setPhase]     = useState('matchmaking'); // matchmaking | duel | scoring
  const [roomId, setRoomId]   = useState(null);
  const [isInit, setIsInit]   = useState(false);
  const [countdown, setCount] = useState(DUEL_SECONDS);
  const [connState, setConn]  = useState('connecting');

  const timerRef   = useRef(null);
  const pollRef    = useRef(null);
  const scoringRef = useRef(false);

  const { localVideoRef, remoteVideoRef, connectionState, cameraError, captureFrame } =
    useWebRTC(phase === 'duel' ? roomId : null, isInit);

  // Sync WebRTC connection state up
  useEffect(() => { setConn(connectionState); }, [connectionState]);

  // ── Matchmaking ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;

    let cancelled = false;

    async function tryMatch() {
      const { data, error } = await supabase.rpc('join_queue', {
        p_player_id: player.id,
        p_is_premium: isPremium,
      });

      if (cancelled || error) return;

      if (data.status === 'matched') {
        setRoomId(data.roomId);
        setIsInit(false); // joiner is not initiator — the waiter is player1/initiator
        startDuel(data.roomId);
        return;
      }

      // status === 'queued' — we are now player1 (the waiter), subscribe to room creation
      subscribeToRoomCreation(player.id);
    }

    tryMatch();

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
      supabase.removeChannel(supabase.channel(`queue:${player.id}`));
      supabase.rpc('leave_queue', { p_player_id: player.id }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  function subscribeToRoomCreation(playerId) {
    const ch = supabase
      .channel(`queue:${playerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rooms',
        filter: `player1_id=eq.${playerId}`,
      }, ({ new: row }) => {
        supabase.removeChannel(ch);
        setRoomId(row.id);
        setIsInit(true); // we were the waiter, so we are the WebRTC initiator
        startDuel(row.id);
      })
      .subscribe();
  }

  function startDuel(rid) {
    setPhase('duel');
    setCount(DUEL_SECONDS);

    // Subscribe to room completion so we get results
    const ch = supabase
      .channel(`result:${rid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${rid}`,
      }, ({ new: row }) => {
        if (row.status === 'complete') {
          supabase.removeChannel(ch);
          handleRoomComplete(row);
        }
      })
      .subscribe();
  }

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'duel') return;
    timerRef.current = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleCapture(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Capture + Score ──────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (scoringRef.current) return;
    scoringRef.current = true;
    setPhase('scoring');

    const frame = captureFrame();
    const token = session?.access_token;

    if (!frame) {
      await submitScore(roomId, 5.0, 'unknown', null, 'Caught mid-blink!', token);
      return;
    }

    try {
      const res = await fetch(SCORE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: frame, roomId }),
      });
      if (!res.ok) throw new Error('Score API error');
      // Edge function already called submit_score via RPC — nothing else to do
    } catch {
      await submitScore(roomId, 5.5, 'mystery pup', null, 'A true mystery!', token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, session]);

  async function submitScore(rid, score, petType, breakdown, verdict, token) {
    await supabase.rpc('submit_score', {
      p_room_id:   rid,
      p_player_id: player.id,
      p_score:     score,
      p_pet_type:  petType,
      p_breakdown: breakdown,
      p_verdict:   verdict,
    });
  }

  // ── Result dispatch ──────────────────────────────────────────────────────
  function handleRoomComplete(row) {
    const isP1  = row.player1_id === player.id;
    const myScore = isP1 ? {
      score: row.player1_score, breakdown: row.player1_breakdown,
      verdict: row.player1_verdict, petType: row.player1_pet_type,
    } : {
      score: row.player2_score, breakdown: row.player2_breakdown,
      verdict: row.player2_verdict, petType: row.player2_pet_type,
    };
    const oppScore = isP1 ? {
      score: row.player2_score, breakdown: row.player2_breakdown,
      verdict: row.player2_verdict, petType: row.player2_pet_type,
    } : {
      score: row.player1_score, breakdown: row.player1_breakdown,
      verdict: row.player1_verdict, petType: row.player1_pet_type,
    };

    onResult({
      winnerId:  row.winner_id,
      myScore:   myScore.score,
      oppScore:  oppScore.score,
      myScoreDetails:  myScore,
      oppScoreDetails: oppScore,
      eloDelta:  isP1 ? row.player1_elo_delta : row.player2_elo_delta,
      newElo:    isP1 ? row.player1_new_elo   : row.player2_new_elo,
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">📷</div>
        <div>
          <h2 className="text-xl font-bold text-ink">Camera Access Required</h2>
          <p className="text-ink-muted text-sm mt-1 max-w-xs">{cameraError}</p>
        </div>
        <button onClick={() => window.location.reload()} className="btn-primary px-6 py-3">Try Again</button>
      </div>
    );
  }

  if (phase === 'matchmaking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-4xl spin-slow">
            🐾
          </div>
          <div className="absolute inset-0 rounded-full border border-sky-500/10 scale-125 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-ink">Finding your opponent<span className="animate-dots" /></h2>
        </div>
        <p className="text-xs text-ink-faint">Get your dog ready for the camera!</p>
      </div>
    );
  }

  if (phase === 'scoring') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center">
        <div className="text-5xl animate-bounce">🔍</div>
        <div>
          <h2 className="text-xl font-bold text-ink">Gemini is judging...</h2>
          <p className="text-ink-muted text-sm mt-1">Analyzing cuteness, coat, eyes &amp; expression</p>
        </div>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-sky-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8 relative">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-50" />

      <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-sky-500/70">Live Duel</span>

      <div className="flex items-center gap-6 flex-wrap justify-center">
        <CamBox videoRef={localVideoRef} label="Your Dog" mirrored borderColor="primary" trackPet />

        <div className="flex flex-col items-center gap-4">
          <div className="glass-card px-4 py-2 rounded-full">
            <span className="text-sm font-black text-ink-muted tracking-widest">VS</span>
          </div>
          <CountdownRing seconds={countdown} total={DUEL_SECONDS} />
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
            connState === 'connected'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-ink-muted bg-white/5 border border-border'
          }`}>
            {connState === 'connected' ? '● Connected' : '○ Connecting...'}
          </span>
        </div>

        <CamBox
          videoRef={remoteVideoRef}
          label="Opponent"
          borderColor="secondary"
          placeholder={connState !== 'connected'}
          trackPet={connState === 'connected'}
        />
      </div>

      <p className="text-ink-muted text-sm font-medium animate-pulse relative">
        Hold your dog up to the camera!
      </p>
    </div>
  );
}
