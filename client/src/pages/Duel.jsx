import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useWebRTC } from '../hooks/useWebRTC.js';
import PetTracker from '../components/PetTracker.jsx';

const SCORE_FUNCTION_URL = import.meta.env.VITE_SCORE_FUNCTION_URL;
const DUEL_SECONDS = 10;

export default function Duel({ onResult }) {
  const { player, isPremium, session } = useAuth();

  const [phase, setPhase]     = useState('matchmaking');
  const [roomId, setRoomId]   = useState(null);
  const [isInit, setIsInit]   = useState(false);
  const [countdown, setCount] = useState(DUEL_SECONDS);
  const [connState, setConn]  = useState('connecting');

  const timerRef   = useRef(null);
  const scoringRef = useRef(false);

  const { localVideoRef, remoteVideoRef, connectionState, cameraError, captureFrame } =
    useWebRTC(phase === 'duel' ? roomId : null, isInit);

  useEffect(() => { setConn(connectionState); }, [connectionState]);

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
        setIsInit(false);
        startDuel(data.roomId);
        return;
      }
      subscribeToRoomCreation(player.id);
    }

    tryMatch();

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      supabase.removeChannel(supabase.channel(`queue:${player.id}`));
      supabase.rpc('leave_queue', { p_player_id: player.id }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  function subscribeToRoomCreation(playerId) {
    const ch = supabase
      .channel(`queue:${playerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'rooms',
        filter: `player1_id=eq.${playerId}`,
      }, ({ new: row }) => {
        supabase.removeChannel(ch);
        setRoomId(row.id);
        setIsInit(true);
        startDuel(row.id);
      })
      .subscribe();
  }

  function startDuel(rid) {
    setPhase('duel');
    setCount(DUEL_SECONDS);
    const ch = supabase
      .channel(`result:${rid}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${rid}`,
      }, ({ new: row }) => {
        if (row.status === 'complete') {
          supabase.removeChannel(ch);
          handleRoomComplete(row);
        }
      })
      .subscribe();
  }

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

  const handleCapture = useCallback(async () => {
    if (scoringRef.current) return;
    scoringRef.current = true;
    setPhase('scoring');
    const frame = captureFrame();
    const token = session?.access_token;
    if (!frame) {
      await supabase.rpc('submit_score', { p_room_id: roomId, p_player_id: player.id, p_score: 5.0, p_pet_type: 'unknown', p_breakdown: null, p_verdict: 'Caught mid-blink!' });
      return;
    }
    try {
      const res = await fetch(SCORE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ imageBase64: frame, roomId }),
      });
      if (!res.ok) throw new Error('Score API error');
    } catch {
      await supabase.rpc('submit_score', { p_room_id: roomId, p_player_id: player.id, p_score: 5.5, p_pet_type: 'mystery pup', p_breakdown: null, p_verdict: 'A true mystery!' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, session]);

  function handleRoomComplete(row) {
    const isP1 = row.player1_id === player.id;
    const myScore  = isP1 ? { score: row.player1_score, breakdown: row.player1_breakdown, verdict: row.player1_verdict, petType: row.player1_pet_type }
                          : { score: row.player2_score, breakdown: row.player2_breakdown, verdict: row.player2_verdict, petType: row.player2_pet_type };
    const oppScore = isP1 ? { score: row.player2_score, breakdown: row.player2_breakdown, verdict: row.player2_verdict, petType: row.player2_pet_type }
                          : { score: row.player1_score, breakdown: row.player1_breakdown, verdict: row.player1_verdict, petType: row.player1_pet_type };
    onResult({
      winnerId: row.winner_id,
      myScore: myScore.score, oppScore: oppScore.score,
      myScoreDetails: myScore, oppScoreDetails: oppScore,
      eloDelta: isP1 ? row.player1_elo_delta : row.player2_elo_delta,
      newElo:   isP1 ? row.player1_new_elo   : row.player2_new_elo,
    });
  }

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full border border-sky-500/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-24 h-24 rounded-full border border-sky-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-3xl">
            🐾
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-ink tracking-tight">Finding opponent<span className="animate-dots" /></h2>
          <p className="text-ink-muted text-sm mt-2">Get your pet ready for the camera</p>
        </div>
      </div>
    );
  }

  if (phase === 'scoring') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink">Gemini is judging...</h2>
          <p className="text-ink-muted text-sm mt-1">Analyzing cuteness, coat, eyes & expression</p>
        </div>
      </div>
    );
  }

  const pct = (countdown / DUEL_SECONDS) * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;

  return (
    <div className="min-h-screen flex flex-col bg-surface">

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${connState === 'connected' ? 'text-emerald-400' : 'text-ink-muted'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connState === 'connected' ? 'bg-emerald-400' : 'bg-ink-muted'}`} />
          {connState === 'connected' ? 'Connected' : 'Connecting...'}
        </span>
        <span className="text-xs text-ink-muted font-medium">Hold your pet up to the camera</span>
        <div className="w-20" />
      </div>

      {/* Video feeds */}
      <div className="flex flex-1 min-h-0">
        {/* Your feed */}
        <div className="flex-1 relative bg-surface-raised">
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ minHeight: 300 }}
          />
          <PetTracker videoRef={localVideoRef} color="#0EA5E9" active />
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs font-bold text-sky-400 tracking-wide">
            YOU
          </div>
        </div>

        {/* Center divider with countdown */}
        <div className="flex flex-col items-center justify-center gap-3 px-4 bg-surface z-10" style={{ minWidth: 80 }}>
          <svg width="72" height="72" className="-rotate-90">
            <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(147,210,255,0.08)" strokeWidth="3" />
            <circle
              cx="36" cy="36" r={r} fill="none"
              stroke={countdown <= 3 ? '#F87171' : '#0EA5E9'}
              strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
            <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
              className="rotate-90" style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px' }}
              fill={countdown <= 3 ? '#F87171' : '#EFF6FF'}
              fontSize="18" fontWeight="800" fontFamily="system-ui">
              {countdown}
            </text>
          </svg>
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">VS</span>
        </div>

        {/* Opponent feed */}
        <div className="flex-1 relative bg-surface-raised">
          {connState !== 'connected' ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ minHeight: 300 }}>
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl opacity-30">🐶</div>
              <p className="text-xs text-ink-muted">Waiting for opponent...</p>
            </div>
          ) : (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay playsInline
                className="w-full h-full object-cover"
                style={{ minHeight: 300 }}
              />
              <PetTracker videoRef={remoteVideoRef} color="#10B981" active />
            </>
          )}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs font-bold text-emerald-400 tracking-wide">
            OPPONENT
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6 py-3 border-t border-border text-center">
        <p className="text-xs text-ink-muted">
          Pet detection by <span className="text-ink">MediaPipe</span> · Scored by <span className="text-ink">Gemini 2.0</span>
        </p>
      </div>
    </div>
  );
}
