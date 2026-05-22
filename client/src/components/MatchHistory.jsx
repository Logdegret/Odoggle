import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';

const LIMIT_FREE    = 5;
const LIMIT_PREMIUM = 100;

function ago(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MatchHistory() {
  const { player, isPremium } = useAuth();
  const [matches, setMatches] = useState([]);
  const [limited, setLimited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    const limit = isPremium ? LIMIT_PREMIUM : LIMIT_FREE;

    supabase
      .from('match_history')
      .select('*')
      .or(`player1_id.eq.${player.id},player2_id.eq.${player.id}`)
      .order('played_at', { ascending: false })
      .limit(limit + 1)
      .then(({ data }) => {
        if (!data) return;
        if (data.length > limit) {
          setMatches(data.slice(0, limit));
          setLimited(true);
        } else {
          setMatches(data);
          setLimited(false);
        }
      })
      .finally(() => setLoading(false));
  }, [player?.id, isPremium]);

  if (loading) return <div className="text-center py-6 text-ink-muted text-sm animate-pulse">Loading matches...</div>;
  if (!matches.length) return <div className="text-center py-6 text-ink-muted text-sm">No duels yet — play your first match!</div>;

  return (
    <div className="flex flex-col gap-1">
      {matches.map(m => {
        const isP1     = m.player1_id === player?.id;
        const myScore  = isP1 ? m.player1_score   : m.player2_score;
        const oppScore = isP1 ? m.player2_score   : m.player1_score;
        const oppName  = isP1 ? m.player2_username : m.player1_username;
        const oppAvatar = isP1 ? m.player2_avatar  : m.player1_avatar;
        const won = m.winner_id === player?.id;

        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-border hover:bg-white/[0.04] transition-colors">
            <span className={`text-xs font-black w-8 text-center px-1 py-0.5 rounded-md ${won ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              {won ? 'W' : 'L'}
            </span>
            <span className="text-base">{oppAvatar || '🐶'}</span>
            <span className="flex-1 text-sm text-ink font-medium truncate">{oppName}</span>
            <span className={`text-sm font-black tabular-nums ${won ? 'text-emerald-400' : 'text-red-400'}`}>
              {myScore?.toFixed(1)}
            </span>
            <span className="text-ink-faint text-xs">vs</span>
            <span className="text-sm text-ink-muted tabular-nums">{oppScore?.toFixed(1)}</span>
            <span className="text-[10px] text-ink-faint tabular-nums">{ago(m.played_at)}</span>
          </div>
        );
      })}

      {limited && (
        <div className="mt-2 text-center text-xs text-ink-muted py-2 rounded-lg bg-white/[0.02] border border-dashed border-border">
          Showing last {LIMIT_FREE} matches · <span className="text-sky-400 font-semibold">Upgrade to Premium</span> for full history
        </div>
      )}
    </div>
  );
}
