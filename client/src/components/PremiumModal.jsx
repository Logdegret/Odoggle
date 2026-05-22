import { useAuth } from '../hooks/useAuth.jsx';

const PERKS = [
  { icon: '🚫', label: 'No Ads',            desc: 'Clean interface, zero interruptions'    },
  { icon: '⚡', label: 'Priority Queue',    desc: 'Skip ahead — match in seconds'           },
  { icon: '👑', label: 'Premium Badge',     desc: 'Crown + rank frame on your profile'      },
  { icon: '📊', label: 'Full Match History', desc: 'All time vs 5 duels for free users'      },
  { icon: '🎨', label: 'Custom Avatar',     desc: 'More emoji choices + rank-colored border' },
  { icon: '🏆', label: 'Rank Frames',       desc: 'Glowing border matches your rank tier'    },
];

export default function PremiumModal({ onClose }) {
  const { isPremium } = useAuth();

  function handleSubscribe(plan) {
    // TODO: integrate Stripe Checkout
    // 1. Call POST /api/premium/create-checkout-session { plan }
    // 2. Redirect to session.url
    alert(`Stripe integration coming soon! Plan: ${plan}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card w-full max-w-md p-6 flex flex-col gap-5 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center">
          <div className="text-3xl mb-1">👑</div>
          <h2 className="text-2xl font-black text-gradient-primary">Odoggle Premium</h2>
          <p className="text-ink-muted text-sm mt-1">Elevate your dog dueling experience</p>
        </div>

        {/* Perks list */}
        <div className="flex flex-col gap-2">
          {PERKS.map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-border">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div>
                <div className="font-bold text-sm text-ink">{label}</div>
                <div className="text-xs text-ink-muted">{desc}</div>
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className="text-emerald-400 text-xs font-bold">✓</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        {!isPremium && (
          <div className="flex gap-3">
            <button
              onClick={() => handleSubscribe('monthly')}
              className="flex-1 glass-card border-border-bright p-4 rounded-xl text-center hover:border-sky-500/40 transition-all group cursor-pointer"
            >
              <div className="text-xs text-ink-muted uppercase tracking-widest mb-1">Monthly</div>
              <div className="text-2xl font-black text-ink group-hover:text-gradient-primary">$4.99</div>
              <div className="text-xs text-ink-muted">per month</div>
            </button>

            <button
              onClick={() => handleSubscribe('yearly')}
              className="flex-1 glass-card border-sky-500/40 shadow-primary-glow p-4 rounded-xl text-center hover:shadow-primary-glow transition-all group cursor-pointer relative"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary-gradient text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider">
                BEST VALUE
              </div>
              <div className="text-xs text-sky-400 uppercase tracking-widest mb-1">Yearly</div>
              <div className="text-2xl font-black text-gradient-primary">$39</div>
              <div className="text-xs text-ink-muted">per year · save 35%</div>
            </button>
          </div>
        )}

        {isPremium ? (
          <div className="text-center py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm">
            ✓ You're already Premium — thanks for your support!
          </div>
        ) : (
          <p className="text-center text-xs text-ink-muted">
            Cancel anytime · Stripe-secured payment · Billed in USD
          </p>
        )}

        <button onClick={onClose} className="btn-ghost w-full py-2.5 text-sm">
          Maybe later
        </button>
      </div>
    </div>
  );
}
