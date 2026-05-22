import PetTracker from './PetTracker.jsx';

export default function CamBox({ videoRef, label, mirrored = false, borderColor = 'primary', placeholder = false, trackPet = false }) {
  const isPrimary = borderColor === 'amber' || borderColor === 'primary';
  const labelCls  = isPrimary
    ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  const glowCls   = isPrimary ? 'border-glow-primary' : 'border-glow-secondary';
  const trackerColor = isPrimary ? '#0EA5E9' : '#10B981';

  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full border ${labelCls}`}>
        {label}
      </span>

      <div
        className={`relative rounded-2xl overflow-hidden bg-surface-raised border-2 ${glowCls}`}
        style={{ width: 288, height: 216 }}
      >
        {placeholder ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl opacity-20">🐶</span>
            <span className="text-xs text-ink-muted">Waiting for opponent...</span>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={mirrored}
              className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
            />
            {trackPet && (
              <PetTracker videoRef={videoRef} color={trackerColor} active={!placeholder} />
            )}
          </>
        )}

        {/* Corner accents */}
        <div className={`absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 rounded-tl-xl ${isPrimary ? 'border-sky-400' : 'border-emerald-400'}`} />
        <div className={`absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 rounded-br-xl ${isPrimary ? 'border-sky-400' : 'border-emerald-400'}`} />
      </div>
    </div>
  );
}
