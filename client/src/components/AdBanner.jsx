import { useAuth } from '../hooks/useAuth.jsx';

export default function AdBanner({ slot = 'top', className = '' }) {
  const { isPremium } = useAuth();
  if (isPremium) return null;

  const slotStyles = {
    top:    'h-16 max-w-2xl',
    bottom: 'h-16 max-w-2xl',
    side:   'h-64 w-40',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-dashed border-border text-ink-faint text-xs ${slotStyles[slot] ?? 'h-16'} ${className}`}
      aria-label="Advertisement"
    >
      {/* Replace with real AdSense <ins> tag */}
      Ad · {slot}
    </div>
  );
}
