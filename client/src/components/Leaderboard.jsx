import { useEffect, useState } from 'react';
import { getRankTier } from '../lib/ranks.js';

export default function Leaderboard({ limit = 10 }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return <div className="glass-card p-6 text-center text-ink-muted text-sm animate-pulse">Loading leaderboard...</div>;
  }

  const rows = data.leaderboard.slice(0, limit);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <h3 className="font-bold text-ink text-sm tracking-wide">Top Dogs</h3>
        <span className="text-xs text-ink-muted">{data.totalPlayers} players · {data.totalMatches} duels</span>
      </div>

      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-muted text-sm">No players yet — be the first!</div>
        ) : rows.map((p, i) => {
          const tier = getRankTier(p.elo);
          return (
            <div key={p.rank} className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02] ${i === 0 ? 'bg-sky-500/5' : ''}`}>
              <span className="w-6 text-center text-sm font-bold text-ink-muted">{medals[i] || p.rank}</span>
              <span style={{ color: tier.color }}>{tier.emoji}</span>
              <span className="flex-1 font-semibold text-ink text-sm truncate">{p.username}</span>
              <span className="font-black text-sky-400 tabular-nums text-sm">{p.elo}</span>
              <span className="text-xs text-ink-muted tabular-nums hidden sm:block w-16 text-right">{p.wins}W/{p.losses}L</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
