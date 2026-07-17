import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { AutopsyScreen } from './components/screens/AutopsyScreen';
import { GameScreen } from './components/screens/GameScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { SplashScreen } from './components/screens/SplashScreen';
import { useGameStore } from './game/store';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const rehydrate = useGameStore((s) => s.rehydrate);

  // Pick an interrupted match back up after a refresh (in-memory server
  // permitting); no-op when there's nothing stored.
  useEffect(() => {
    void rehydrate();
  }, [rehydrate]);

  let screen;
  switch (phase) {
    case 'splash':
      screen = <SplashScreen />;
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

  // reducedMotion="user" stills every motion animation for users who ask.
  return <MotionConfig reducedMotion="user">{screen}</MotionConfig>;
}
