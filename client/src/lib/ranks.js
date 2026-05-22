export const RANKS = [
  { name: 'Shelter Pup',   min: 0,    emoji: '🐾', color: '#9CA3AF' },
  { name: 'Good Boy',      min: 1000, emoji: '🦴', color: '#D97706' },
  { name: 'Show Dog',      min: 1200, emoji: '🎀', color: '#3B82F6' },
  { name: 'Best in Breed', min: 1400, emoji: '🏅', color: '#8B5CF6' },
  { name: 'Best in Show',  min: 1600, emoji: '🏆', color: '#0D9488' },
  { name: 'Supreme Champ', min: 1800, emoji: '👑', color: '#F59E0B' },
];

export function getRankTier(elo) {
  let tier = RANKS[0];
  for (const rank of RANKS) {
    if (elo >= rank.min) tier = rank;
  }
  return tier;
}
