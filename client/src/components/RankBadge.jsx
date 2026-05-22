import { getRankTier } from '../lib/ranks.js';

export default function RankBadge({ elo, size = 'md' }) {
  const tier = getRankTier(elo);
  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-wide ${sizes[size]}`}
      style={{
        background: `${tier.color}18`,
        color: tier.color,
        border: `1px solid ${tier.color}40`,
        boxShadow: `0 0 12px ${tier.color}20`,
      }}
    >
      <span>{tier.emoji}</span>
      <span>{tier.name}</span>
    </span>
  );
}
