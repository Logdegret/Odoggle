import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getRankTier, RANKS } from '../lib/ranks.js';
import Leaderboard from '../components/Leaderboard.jsx';
import RankBadge from '../components/RankBadge.jsx';
import AuthModal from '../components/AuthModal.jsx';
import PremiumModal from '../components/PremiumModal.jsx';

export default function Landing({ onPlay }) {
  const { player, isAuthenticated, isGuest, isPremium, loading } = useAuth();
  const [showAuth, setShowAuth]       = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [username, setUsername]       = useState('');

  const elo     = player?.elo    ?? 1000;
  const wins    = player?.wins   ?? 0;
  const losses  = player?.losses ?? 0;
  const tier    = getRankTier(elo);
  const nextRank = RANKS.find(r => r.min > elo);
  const progress = nextRank ? ((elo - tier.min) / (nextRank.min - tier.min)) * 100 : 100;

  function handlePlay() {
    if (!isAuthenticated) { setShowAuth(true); return; }
    onPlay();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Left panel — branding + CTA */}
      <div className="flex flex-col justify-center px-8 py-12 lg:w-96 lg:min-h-screen lg:border-r lg:border-border relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-60" />

        <div className="relative flex flex-col gap-8 max-w-sm mx-auto lg:mx-0 w-full">
          {/* Logo */}
          <div>
            <h1 className="text-5xl font-black tracking-tight leading-none">
              <span className="text-ink">O</span><span className="text-gradient-primary">doggle</span>
            </h1>
            <p className="text-ink-muted text-sm mt-2">1v1 pet beauty duels — judged by AI</p>
          </div>

          {/* How it works */}
          <div className="flex flex-col gap-3">
            {[
              { n: '1', text: 'Get matched with a random opponent' },
              { n: '2', text: 'Hold your pet up to the camera' },
              { n: '3', text: 'Gemini AI scores both pets' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-[11px] font-black text-sky-400 flex-shrink-0">
                  {s.n}
                </div>
                <span className="text-sm text-ink-muted">{s.text}</span>
              </div>
            ))}
          </div>

          {/* Guest name input */}
          {!isAuthenticated && !loading && (
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.15em] block mb-2">
                Display Name (optional)
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="FluffMaster99"
                maxLength={20}
                className="w-full rounded-xl bg-white/[0.04] border border-border-bright text-ink placeholder:text-ink-faint px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
            </div>
          )}

          {/* Player stats (if signed in) */}
          {isAuthenticated && player && (
            <div className="glass-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: `${tier.color}15`, border: `1.5px solid ${tier.color}40` }}>
                  {player.avatar || '🐶'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-ink truncate">{player.username}</span>
                    {isGuest && <span className="text-[9px] text-ink-muted border border-border px-1.5 py-0.5 rounded-full">Guest</span>}
                  </div>
                  <RankBadge elo={elo} size="sm" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-sky-400 tabular-nums">{elo}</div>
                  <div className="text-[10px] text-ink-muted">ELO</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { v: wins,   label: 'W',  color: 'text-emerald-400' },
                  { v: losses, label: 'L',  color: 'text-red-400' },
                  { v: wins + losses > 0 ? `${Math.round(wins/(wins+losses)*100)}%` : '—', label: 'WR', color: 'text-sky-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] rounded-lg py-1.5">
                    <div className={`font-black text-sm tabular-nums ${s.color}`}>{s.v}</div>
                    <div className="text-[9px] text-ink-muted uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {nextRank && (
                <div>
                  <div className="flex justify-between text-[10px] text-ink-muted mb-1">
                    <span>{tier.emoji} {tier.name}</span>
                    <span>{elo} / {nextRank.min}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${tier.color}, ${nextRank.color || tier.color})` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <button onClick={handlePlay} className="btn-primary w-full py-4 text-base font-black tracking-wide">
              {isPremium ? '⚡ Play — Priority Queue' : 'Start Matching'}
            </button>
            {!isPremium && isAuthenticated && (
              <button onClick={() => setShowPremium(true)} className="btn-ghost w-full py-2.5 text-sm">
                👑 Premium — Skip Queue & No Ads
              </button>
            )}
            {!isAuthenticated && !loading && (
              <button onClick={() => setShowAuth(true)} className="btn-ghost w-full py-2.5 text-sm">
                Sign in to track ELO
              </button>
            )}
          </div>

          <p className="text-[11px] text-ink-faint">
            Pet tracking by MediaPipe · AI scoring by Gemini 2.0 Flash
          </p>
        </div>
      </div>

      {/* Right panel — leaderboard */}
      <div className="flex-1 px-8 py-12 flex flex-col gap-6">
        <h2 className="text-xs font-bold text-ink-muted uppercase tracking-[0.2em]">Leaderboard</h2>
        <Leaderboard limit={20} />
      </div>

      {showAuth    && <AuthModal    onClose={() => setShowAuth(false)} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
    </div>
  );
}
