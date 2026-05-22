import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import RankBadge from './RankBadge.jsx';
import MatchHistory from './MatchHistory.jsx';
import { RANKS, getRankTier } from '../lib/ranks.js';

const AVATARS = ['🐶','🐕','🦮','🐕‍🦺','🐩','🦴','🐾','🎾','🏆','⭐','👑','🌟'];

export default function ProfileModal({ onClose, onUpgrade }) {
  const { player, isGuest, isPremium, signOut, updateProfile } = useAuth();
  const [tab, setTab] = useState('stats'); // stats | history | settings
  const [editName, setEditName] = useState(player?.username || '');
  const [saving, setSaving] = useState(false);

  if (!player) return null;

  const tier = getRankTier(player.elo);
  const nextRank = RANKS.find(r => r.min > player.elo);
  const progress = nextRank
    ? ((player.elo - tier.min) / (nextRank.min - tier.min)) * 100
    : 100;

  async function handleSave() {
    setSaving(true);
    await updateProfile({ username: editName });
    setSaving(false);
  }

  async function handleAvatar(emoji) {
    await updateProfile({ avatar: emoji });
  }

  const tabs = [
    { id: 'stats',    label: 'Stats'    },
    { id: 'history',  label: 'History'  },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card w-full sm:max-w-md flex flex-col animate-fade-up sm:animate-scale-in rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh]">

        {/* Profile header */}
        <div className="relative bg-gradient-to-b from-sky-500/10 to-transparent px-6 pt-6 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-ink-muted hover:text-ink text-xl">×</button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="relative text-4xl w-16 h-16 flex items-center justify-center rounded-2xl bg-surface-overlay border-2"
              style={isPremium ? { borderColor: tier.color, boxShadow: `0 0 16px ${tier.color}40` } : { borderColor: 'rgba(147,210,255,0.15)' }}
            >
              {player.avatar || '🐶'}
              {isPremium && <span className="absolute -top-1.5 -right-1.5 text-sm">👑</span>}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-ink truncate">{player.username}</h3>
                {isPremium && <span className="text-[10px] bg-primary-gradient text-white font-bold px-2 py-0.5 rounded-full">PRO</span>}
                {isGuest && <span className="text-[10px] text-ink-muted border border-border px-2 py-0.5 rounded-full">Guest</span>}
              </div>
              <RankBadge elo={player.elo} size="sm" />
            </div>
          </div>

          {/* Rank progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-ink-muted mb-1">
              <span>{tier.emoji} {tier.name}</span>
              <span>{nextRank ? `${player.elo} / ${nextRank.min} → ${nextRank.name}` : 'MAX RANK'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${tier.color}, ${nextRank?.color || tier.color})` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2.5 px-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {tab === 'stats' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'ELO',     value: player.elo,    color: 'text-sky-400'     },
                  { label: 'Wins',    value: player.wins,   color: 'text-emerald-400' },
                  { label: 'Losses',  value: player.losses, color: 'text-red-400'     },
                ].map(s => (
                  <div key={s.label} className="glass-card p-3 text-center">
                    <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-ink-muted uppercase tracking-widest">{s.label}</div>
                  </div>
                ))}
              </div>

              {player.wins + player.losses > 0 && (
                <div className="glass-card p-4">
                  <div className="text-xs text-ink-muted uppercase tracking-widest mb-2">Win Rate</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(player.wins / (player.wins + player.losses)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-ink tabular-nums">
                      {Math.round((player.wins / (player.wins + player.losses)) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* All ranks */}
              <div>
                <div className="text-xs text-ink-muted uppercase tracking-widest mb-2">Rank Tiers</div>
                <div className="flex flex-col gap-1">
                  {RANKS.map(r => (
                    <div key={r.name} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${r.name === tier.name ? 'bg-white/[0.05] border border-border-bright' : ''}`}>
                      <span>{r.emoji}</span>
                      <span className="flex-1 font-medium" style={{ color: r.color }}>{r.name}</span>
                      <span className="text-xs text-ink-muted tabular-nums">{r.min}+</span>
                      {r.name === tier.name && <span className="text-[10px] text-sky-400 font-bold">YOU</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && <MatchHistory />}

          {tab === 'settings' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.15em] block mb-2">Display Name</label>
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    maxLength={20}
                    className="flex-1 rounded-xl bg-white/[0.04] border border-border-bright text-ink px-3 py-2 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all"
                  />
                  <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.15em] block mb-2">
                  Avatar {!isPremium && <span className="text-sky-400 normal-case">· More with Premium</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(isPremium ? AVATARS : AVATARS.slice(0, 6)).map(e => (
                    <button
                      key={e}
                      onClick={() => handleAvatar(e)}
                      className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        player.avatar === e ? 'bg-sky-500/20 border-2 border-sky-500' : 'bg-white/[0.03] border border-border hover:bg-white/[0.06]'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {!isPremium && (
                <button onClick={onUpgrade} className="btn-primary w-full py-3">
                  👑 Upgrade to Premium
                </button>
              )}

              <button onClick={signOut} className="btn-ghost w-full py-2.5 text-sm text-red-400 hover:text-red-300">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
