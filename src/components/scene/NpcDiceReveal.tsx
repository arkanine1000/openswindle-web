import { motion } from 'motion/react';
import type { Face, RoundReveal } from '../../api/types';
import { NPC_SEAT } from '../../api/types';
import { Die } from './Die';
import styles from './NpcDiceReveal.module.css';

/** The opponent's dice hitting the table when a round ends. */
export function NpcDiceReveal({ reveal }: { reveal: RoundReveal }) {
  return (
    <div className={styles.row} data-testid="npc-dice-reveal">
      {reveal.hands[NPC_SEAT].map((face, i) => (
        <motion.div
          key={i}
          initial={{ y: -50, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.09 }}
        >
          <Die face={face as Face} owner="npc" />
        </motion.div>
      ))}
    </div>
  );
}
