import { MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { AutopsyScreen } from './components/screens/AutopsyScreen';
import { GameScreen } from './components/screens/GameScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { SplashScreen } from './components/screens/SplashScreen';
import { JoiningScreen, WaitingScreen } from './components/screens/WaitingScreen';
import { useGameStore } from './game/store';

/** An invite link carries the match id as `?match=<id>`. */
function inviteIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('match');
}

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const rehydrate = useGameStore((s) => s.rehydrate);
  const joinMatch = useGameStore((s) => s.joinMatch);
  // Show the holding screen from first paint when arriving via an invite link,
  // so the splash never flashes before the join resolves.
  const [joining, setJoining] = useState(() => inviteIdFromUrl() !== null);

  useEffect(() => {
    let cancelled = false;
    const inviteId = inviteIdFromUrl();
    // A resumable match in this tab wins over an invite link; otherwise, if we
    // arrived by invite, claim seat B.
    void rehydrate().then((resumed) => {
      if (cancelled) return;
      if (!resumed && inviteId) {
        // Drop the param first so a later refresh resumes via storage rather
        // than trying to re-join (seat B is a one-time claim).
        window.history.replaceState(null, '', window.location.pathname);
        void joinMatch(inviteId).finally(() => {
          if (!cancelled) setJoining(false);
        });
      } else {
        setJoining(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rehydrate, joinMatch]);

  let screen;
  if (joining && phase === 'splash') {
    // Between mount and the join resolving (or failing back to splash).
    screen = <JoiningScreen />;
  } else {
    switch (phase) {
      case 'splash':
        screen = <SplashScreen />;
        break;
      case 'waiting':
        screen = <WaitingScreen />;
        break;
      case 'result':
        screen = <ResultScreen />;
        break;
      case 'autopsy':
        screen = <AutopsyScreen />;
        break;
      default:
        screen = <GameScreen />;
    }
  }

  // reducedMotion="user" stills every motion animation for users who ask.
  return <MotionConfig reducedMotion="user">{screen}</MotionConfig>;
}
