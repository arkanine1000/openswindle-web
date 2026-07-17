import { AnimatePresence, motion } from 'motion/react';
import type { NpcArt } from '../../assets/manifest';
import type { NpcPose } from '../../game/store';
import styles from './NpcFigure.module.css';

interface NpcFigureProps {
  art: NpcArt;
  pose: NpcPose;
  name: string;
}

/** The opponent across the table. Poses crossfade; the accusing pose also
 * rises slightly, selling the "stands up to call" beat. */
export function NpcFigure({ art, pose, name }: NpcFigureProps) {
  return (
    <motion.div
      className={styles.figure}
      data-testid="npc-figure"
      data-pose={pose}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={pose}
          className={styles.pose}
          src={pose === 'seated' ? art.seated : art.accusing}
          alt={`${name}, ${pose === 'seated' ? 'seated at the table' : 'standing to accuse'}`}
          initial={{ opacity: 0, y: pose === 'accusing' ? 24 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          draggable={false}
        />
      </AnimatePresence>
    </motion.div>
  );
}
