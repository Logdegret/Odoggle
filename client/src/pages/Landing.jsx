import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getRankTier, RANKS } from '../lib/ranks.js';
import Leaderboard from '../components/Leaderboard.jsx';
import RankBadge from '../components/RankBadge.jsx';
import AdBanner from '../components/AdBanner.jsx';
import AuthModal from '../components/AuthModal.jsx';
import PremiumModal from '../components/PremiumModal.jsx';

export default function Landing({ onPlay }) {
  const { player, isAuthenticated, isGuest, isPremium, loading } = useAuth();
  const [showAuth, setShowAuth]       = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [username, setUsername]       = useState('');

  const elo    = player?.elo    ?? 1000;
  const wins   = player?.wins   ?? 0;
  const losses = player?.losses ?? 0;
  const tier   = getRankTier(elo);
  const nextRank  = RANKS.find(r => r.min > elo);
  const progress  = nextRank ? ((elo - tier.min) / (nextRank.min - tier.min)) * 100 : 100;

  function handlePlay() {
    if (!isAuthenticated) { setShowAuth(true); return; }
    onPlay();
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 gap-7 relative">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <AdBanner slot="top" className="w-full max-w-md" />

      {/* Hero */}
      <div className="text-center animate-fade-up mt-2">
        <h1 className="text-6xl font-black tracking-tight">
          <span className="text-ink">Dog</span><span className="text-gradient-primary">gle</span>
        </h1>
        <p className="text-ink-muted text-sm font-medium mt-2">
          1v1 Dog Beauty Duels · Judged by Gemini AI
        </p>
      </div>

      {/* Player card (only if authenticated) */}
      {isAuthenticated && player && (
        <div className="w-full max-w-sm glass-card p-5 flex flex-col gap-4 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-start gap-4">
            {/* Avatar with rank frame for premium */}
            <div
              className="text-4xl w-16 h-16 flex items-center justify-center rounded-2xl flex-shrink-0"
              style={isPremium ? { background: `${tier.color}15`, border: `2px solid ${tier.color}50`, boxShadow: `0 0 16px ${tier.color}30` } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(147,210,255,0.1)' }}
            >
              {player.avatar || '🐶'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-ink text-lg leading-none truncate">{player.username}</h2>
                {isPremium && <span className="text-[9px] bg-primary-gradient text-white font-black px-2 py-0.5 rounded-full">PRO</span>}
                {isGuest   && <span className="text-[9px] text-ink-muted border border-border px-2 py-0.5 rounded-full">Guest</span>}
              </div>
              <RankBadge elo={elo} size="sm" />
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-sky-400 tabular-nums">{elo}</div>
              <div className="text-[10px] text-ink-muted">ELO</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: wins,   label: 'Wins',   color: 'text-emerald-400' },
              { v: losses, label: 'Losses', color: 'text-red-400'     },
              { v: wins + losses > 0 ? `${Math.round(wins/(wins+losses)*100)}%` : '—', label: 'Win Rate', color: 'text-sky-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] rounded-xl py-2">
                <div className={`font-black text-sm tabular-nums ${s.color}`}>{s.v}</div>
                <div className="text-[9px] text-ink-muted uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Rank progress */}
          <div>
            <div className="flex justify-between text-[10px] text-ink-muted mb-1">
              <span>{tier.emoji} {tier.name}</span>
              {nextRank && <span>{elo} / {nextRank.min} ELO → {nextRank.name}</span>}
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${tier.color}, ${nextRank?.color || tier.color})` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Not signed in yet — guest teaser */}
      {!isAuthenticated && !loading && (
        <div className="w-full max-w-sm glass-card p-5 flex flex-col gap-3 animate-fade-up">
          <p className="text-sm text-ink-muted text-center">Sign in to track your ELO and rank</p>
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.15em] block mb-2">Guest Name (optional)</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="FluffMaster99"
              maxLength={20}
              className="w-full rounded-xl bg-white/[0.04] border border-border-bright text-ink placeholder:text-ink-faint px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="w-full max-w-sm flex flex-col gap-2 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <button onClick={handlePlay} className="btn-primary w-full py-4 text-lg">
          {isPremium ? '⚡ Play Now (Priority Queue)' : 'Play Now 🐾'}
        </button>
        {!isPremium && isAuthenticated && (
          <button onClick={() => setShowPremium(true)} className="btn-ghost w-full py-2.5 text-sm">
            👑 Upgrade to Premium — Skip Queue + No Ads
          </button>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-full max-w-sm animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <Leaderboard limit={10} />
      </div>

      <AdBanner slot="bottom" className="w-full max-w-md" />

      <p className="text-[11px] text-ink-faint text-center max-w-xs pb-4">
        Face tracking powered by MediaPipe · AI scoring by Gemini 2.0 Flash
      </p>

      {showAuth    && <AuthModal    onClose={() => setShowAuth(false)} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
    </div>
  );
}
