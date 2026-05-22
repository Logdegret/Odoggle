export default function ScoreReveal({ score, breakdown, verdict, petType, isWinner, username }) {
  const metrics = [
    { key: 'cuteness',    label: 'Cute',  icon: '🥰' },
    { key: 'coatQuality', label: 'Coat',  icon: '✨' },
    { key: 'eyeAppeal',   label: 'Eyes',  icon: '👁️' },
    { key: 'expression',  label: 'Mood',  icon: '😄' },
  ];

  return (
    <div className={`glass-card overflow-hidden animate-score-pop ${isWinner ? 'border-sky-500/40 shadow-primary-glow' : ''}`}>
      <div className={`h-1 ${isWinner ? 'bg-primary-gradient' : 'bg-secondary-gradient'}`} />

      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted uppercase tracking-widest">{username}</span>
          {isWinner && <span className="text-base">🏆</span>}
        </div>

        <div className="text-center py-2">
          <span className={`text-6xl font-black tabular-nums ${isWinner ? 'text-gradient-primary' : 'text-ink-muted'}`}>
            {score?.toFixed(1)}
          </span>
          <span className="text-ink-muted text-lg font-bold"> /10</span>
        </div>

        {breakdown && (
          <div className="grid grid-cols-2 gap-2">
            {metrics.map(({ key, label, icon }) => (
              <div key={key} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-base">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-ink-muted uppercase tracking-wide">{label}</div>
                  <div className="text-sm font-bold text-ink">{breakdown[key]?.toFixed(1)}</div>
                </div>
                <div className="w-10 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isWinner ? 'bg-sky-500' : 'bg-emerald-500'}`}
                    style={{ width: `${(breakdown[key] / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {petType && <p className="text-[11px] text-ink-muted text-center capitalize tracking-wide">{petType}</p>}

        {verdict && (
          <blockquote className={`italic text-sm text-center px-3 py-2.5 rounded-lg leading-relaxed ${
            isWinner
              ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
              : 'bg-white/[0.03] text-ink-muted border border-border'
          }`}>
            "{verdict}"
          </blockquote>
        )}
      </div>
    </div>
  );
}
