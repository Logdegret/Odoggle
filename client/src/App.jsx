import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Nav from './components/Nav.jsx';
import Landing from './pages/Landing.jsx';
import Duel from './pages/Duel.jsx';
import Results from './pages/Results.jsx';

function AppInner() {
  const { player, refreshPlayer, loading } = useAuth();

  const [page, setPage]       = useState('landing');
  const [duelResult, setResult] = useState(null);

  function handlePlay() {
    setPage('duel');
    setResult(null);
  }

  function handleResult(result) {
    setResult(result);
    refreshPlayer();
    setPage('results');
  }

  function handlePlayAgain() {
    setResult(null);
    setPage('duel');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl spin-slow">🐾</div>
      </div>
    );
  }

  return (
    <>
      <Nav />
      {page === 'landing'  && <Landing onPlay={handlePlay} />}
      {page === 'duel'     && <Duel onResult={handleResult} />}
      {page === 'results'  && (
        <Results
          result={duelResult}
          myId={player?.id}
          myScore={duelResult?.myScoreDetails}
          oppScore={duelResult?.oppScoreDetails}
          onPlayAgain={handlePlayAgain}
          onHome={() => setPage('landing')}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
