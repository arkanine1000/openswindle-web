import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { assets } from '../../assets/manifest';
import styles from './TopBar.module.css';

interface TopBarProps {
  /** Dice each side started the match with (socket count). */
  perPlayer: number;
  playerCount: number;
  npcCount: number;
  onHistoryToggle: () => void;
  historyOpen: boolean;
}

function PipStrip({ total, alive, who }: { total: number; alive: number; who: 'player' | 'npc' }) {
  const prevAlive = useRef(alive);
  // Index of the die just lost, animated once as it's struck from the plate.
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  useEffect(() => {
    if (alive < prevAlive.current) {
      // The pip at index `alive` just flipped from held to lost.
      setFlashIndex(alive);
      const timer = setTimeout(() => setFlashIndex(null), 900);
      prevAlive.current = alive;
      return () => clearTimeout(timer);
    }
    prevAlive.current = alive;
  }, [alive]);

  return (
    <div className={styles.plate} data-testid={`pips-${who}`}>
      {Array.from({ length: total }, (_, i) => {
        const held = i < alive;
        const flashing = i === flashIndex;
        // Keep the owner's colour while it blinks so you see whose die is
        // being struck; it greys out to "lost" once the blink settles.
        const shown = held || flashing;
        return (
          <motion.img
            key={i}
            className={styles.pip}
            src={shown ? assets.pips[who] : assets.pips.lost}
            alt={shown ? `${who === 'player' ? 'your' : "opponent's"} die` : 'lost die'}
            animate={
              flashing
                ? { opacity: [1, 0.12, 1, 0.12, 0.9], scale: [1, 1.22, 1, 1.16, 1] }
                : { opacity: 1, scale: 1 }
            }
            transition={
              flashing
                ? { duration: 0.85, times: [0, 0.2, 0.45, 0.7, 1], ease: 'easeInOut' }
                : { duration: 0 }
            }
          />
        );
      })}
    </div>
  );
}

/** Dice-count gems (you left, opponent right) around the history tab. */
export function TopBar({
  perPlayer,
  playerCount,
  npcCount,
  onHistoryToggle,
  historyOpen,
}: TopBarProps) {
  return (
    <div className={styles.bar}>
      <PipStrip total={perPlayer} alive={playerCount} who="player" />
      <button
        type="button"
        className={styles.historyTab}
        onClick={onHistoryToggle}
        aria-expanded={historyOpen}
        data-testid="history-tab"
      >
        {/* Points the way the sheet will travel: down to unroll it, up to
         * send it back. The open state matches the arrow on the sheet's own
         * tab, which slides down over this one — mismatched arrows showed as
         * a flicker at the start of the animation. */}
        <span className={historyOpen ? styles.arrowUp : styles.arrowDown} aria-hidden />
        <span className={styles.visuallyHidden}>
          {historyOpen ? 'Close the table-talk history' : 'Read the table-talk history'}
        </span>
      </button>
      <PipStrip total={perPlayer} alive={npcCount} who="npc" />
    </div>
  );
}
