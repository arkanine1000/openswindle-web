import { motion } from 'motion/react';
import type { Face } from '../../api/types';
import { assets } from '../../assets/manifest';
import { PACING } from '../../game/pacing';
import { Die } from './Die';
import { dicePileStagger } from './dicePileStagger';
import styles from './PlayerHand.module.css';

interface PlayerHandProps {
  dice: number[];
  /** Hand slides off-screen to the left, baring the dice: end-of-round
   * reveal. */
  revealed: boolean;
  /** Remounts the dice so each new round tumbles in. */
  rollKey: number;
  rolling: boolean;
}

export function PlayerHand({ dice, revealed, rollKey, rolling }: PlayerHandProps) {
  return (
    <div className={styles.wrap} data-testid="player-hand" data-revealed={revealed}>
      <div className={styles.dice}>
        {dice.map((face, i) => {
          const { rotate: restRotate, y: restY } = dicePileStagger(i);
          return (
            <motion.div
              key={`${rollKey}-${i}`}
              initial={rolling ? { y: -90, rotate: -200, opacity: 0 } : false}
              animate={{ y: restY, rotate: restRotate, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 17,
                delay: (i * PACING.diceRollMs) / (dice.length * 1000),
              }}
            >
              <Die face={face as Face} owner="player" />
            </motion.div>
          );
        })}
      </div>
      <motion.img
        className={styles.hand}
        src={revealed ? assets.hand.open : assets.hand.cupped}
        alt={
          revealed
            ? 'your hand drawn aside, revealing your dice'
            : 'your hand cupped over your dice'
        }
        animate={revealed ? { x: '-105%' } : { x: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        draggable={false}
      />
    </div>
  );
}
