export default function CountdownRing({ seconds, total = 10 }) {
  const radius = 44;
  const stroke = 6;
  const size = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (seconds / total) * circumference;
  const urgent = seconds <= 3;
  const color = urgent ? '#EF4444' : '#0EA5E9';
  const glow  = urgent ? 'rgba(239,68,68,0.5)' : 'rgba(14,165,233,0.45)';

  return (
    <div className={`relative flex items-center justify-center ${urgent ? 'animate-pulse-ring' : ''}`}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(147,210,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={`absolute text-4xl font-black tabular-nums ${urgent ? 'text-red-400' : 'text-ink'}`}>
        {seconds}
      </span>
    </div>
  );
}
