import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getRankTier } from '../lib/ranks.js';
import AuthModal from './AuthModal.jsx';
import ProfileModal from './ProfileModal.jsx';
import PremiumModal from './PremiumModal.jsx';

export default function Nav() {
  const { player, isAuthenticated, isPremium, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const tier = player ? getRankTier(player.elo) : null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3"
        style={{ background: 'rgba(2,13,26,0.85)', borderBottom: '1px solid rgba(147,210,255,0.07)', backdropFilter: 'blur(16px)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl">🐶</span>
          <span className="text-base font-black tracking-tight">
            <span className="text-ink">Dog</span><span className="text-gradient-primary">gle</span>
          </span>
        </div>

        <div className="flex-1" />

        {loading ? (
          <div className="w-24 h-7 rounded-lg bg-white/5 animate-pulse" />
        ) : !isAuthenticated ? (
          <button onClick={() => setShowAuth(true)} className="btn-primary px-4 py-1.5 text-sm">
            Sign In
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Premium CTA (only for non-premium) */}
            {!isPremium && (
              <button
                onClick={() => setShowPremium(true)}
                className="hidden sm:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-all"
              >
                👑 Premium
              </button>
            )}

            {/* ELO chip */}
            {player && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-border text-xs">
                <span style={{ color: tier?.color }}>{tier?.emoji}</span>
                <span className="font-black text-ink tabular-nums">{player.elo}</span>
              </div>
            )}

            {/* Avatar / profile button */}
            <button
              onClick={() => setShowProfile(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 relative"
              style={isPremium && tier ? { background: `${tier.color}20`, border: `1.5px solid ${tier.color}60` } : { background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(147,210,255,0.12)' }}
            >
              {player?.avatar || '🐶'}
              {isPremium && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
            </button>
          </div>
        )}
      </nav>

      {/* Spacer so content doesn't hide under nav */}
      <div className="h-14" />

      {showAuth    && <AuthModal    onClose={() => setShowAuth(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onUpgrade={() => { setShowProfile(false); setShowPremium(true); }} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
    </>
  );
}
