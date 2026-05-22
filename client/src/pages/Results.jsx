import ScoreReveal from '../components/ScoreReveal.jsx';
import RankBadge from '../components/RankBadge.jsx';
import AdBanner from '../components/AdBanner.jsx';

export default function Results({ result, myId, myScore, oppScore, onPlayAgain, onHome }) {
  if (!result) return null;

  if (result.walkover) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-4xl animate-scale-in">
          🏃
        </div>
        <div className="animate-fade-up">
          <h1 className="text-3xl font-black text-gradient-primary">Opponent Fled!</h1>
          <p className="text-ink-muted mt-1">You win by forfeit 🐶</p>
        </div>
        <div className="glass-card px-8 py-5 text-center animate-fade-up">
          <div className="text-5xl font-black text-emerald-400">+{result.eloDelta}</div>
          <div className="text-xs text-ink-muted uppercase tracking-widest mt-1">ELO Gained</div>
          <div className="mt-3"><RankBadge elo={result.newElo} size="md" /></div>
        </div>
        <div className="flex gap-3 animate-fade-up">
          <button onClick={onPlayAgain} className="btn-primary px-6 py-3">Play Again</button>
          <button onClick={onHome} className="btn-ghost px-6 py-3">Home</button>
        </div>
        <AdBanner slot="bottom" className="w-full max-w-sm" />
      </div>
    );
  }

  const won = result.winnerId === myId;
  const { eloDelta, newElo } = result;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-7 relative">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="text-center animate-fade-up">
        <h1 className={`text-4xl font-black ${won ? 'text-gradient-primary' : 'text-ink-muted'}`}>
          {won ? 'YOUR DOG MOGGED! 🏆' : 'YOUR DOG GOT MOGGED 🐶'}
        </h1>
        <p className="text-ink-muted text-sm mt-1.5">
          {won ? 'Most adorable doggo in the lobby!' : 'Better luck next duel!'}
        </p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center w-full max-w-2xl animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex-1 min-w-[260px]">
          <ScoreReveal score={result.myScore} breakdown={myScore?.breakdown} verdict={myScore?.verdict}
            petType={myScore?.petType} isWinner={won} username="Your Dog" />
        </div>
        <div className="flex-1 min-w-[260px]">
          <ScoreReveal score={result.oppScore} breakdown={oppScore?.breakdown} verdict={oppScore?.verdict}
            petType={oppScore?.petType} isWinner={!won} username="Opponent's Dog" />
        </div>
      </div>

      <div className="glass-card px-8 py-5 text-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className={`text-5xl font-black tabular-nums ${eloDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {eloDelta >= 0 ? '+' : ''}{eloDelta}
        </div>
        <div className="text-xs text-ink-muted uppercase tracking-widest mt-1 mb-3">ELO Change</div>
        <RankBadge elo={newElo} size="md" />
        <div className="text-xs text-ink-muted mt-1">{newElo} total</div>
      </div>

      {result.rankUpgrade && (
        <div className="glass-card border-sky-500/40 shadow-primary-glow px-8 py-5 text-center animate-scale-in">
          <div className="text-[10px] text-sky-400 font-bold uppercase tracking-[0.2em] mb-2">Rank Up!</div>
          <div className="text-3xl font-black text-ink">{result.rankUpgrade.emoji} {result.rankUpgrade.name}</div>
        </div>
      )}

      <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '0.25s' }}>
        <button onClick={onPlayAgain} className="btn-primary px-7 py-3.5">Play Again</button>
        <button onClick={onHome} className="btn-ghost px-7 py-3.5">Home</button>
      </div>

      <AdBanner slot="bottom" className="w-full max-w-sm" />
    </div>
  );
}
