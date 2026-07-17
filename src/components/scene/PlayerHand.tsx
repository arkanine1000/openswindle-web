import { motion } from 'motion/react';
import type { Face } from '../../api/types';
import { assets } from '../../assets/manifest';
import { PACING } from '../../game/pacing';
import { Die } from './Die';
import styles from './PlayerHand.module.css';

interface PlayerHandProps {
  dice: number[];
  /** Hand slides away and the open palm shows: end-of-round reveal. */
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
          // Deterministic per-slot stagger: a loose pile, not a parade.
          const restRotate = ((i * 47) % 17) - 8;
          const restY = ((i * 31) % 9) - 2;
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
        alt={revealed ? 'your open hand revealing your dice' : 'your hand cupped over your dice'}
        animate={revealed ? { y: '52%', opacity: 0.95 } : { y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        draggable={false}
      />
    </div>
  );
}
