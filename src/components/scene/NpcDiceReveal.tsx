import { motion } from 'motion/react';
import type { Face, RoundReveal } from '../../api/types';
import { otherSeat } from '../../api/types';
import { useGameStore } from '../../game/store';
import { Die } from './Die';
import { dicePileStagger } from './dicePileStagger';
import styles from './NpcDiceReveal.module.css';

/** The opponent's dice hitting the table when a round ends, in the same
 * loose scatter as the player's hand. */
export function NpcDiceReveal({ reveal }: { reveal: RoundReveal }) {
  const opponentSeat = otherSeat(useGameStore((s) => s.mySeat));
  return (
    <div className={styles.row} data-testid="npc-dice-reveal">
      {reveal.hands[opponentSeat].map((face, i) => {
        const { rotate: restRotate, y: restY } = dicePileStagger(i);
        return (
          <motion.div
            key={i}
            initial={{ y: -50, opacity: 0, rotate: -90 }}
            animate={{ y: restY, opacity: 1, rotate: restRotate }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.09 }}
          >
            <Die face={face as Face} owner="npc" />
          </motion.div>
        );
      })}
    </div>
  );
}
