import type { Face } from '../../api/types';
import { assets } from '../../assets/manifest';
import i18n from '../../i18n';
import styles from './Die.module.css';

export type DieOwner = 'player' | 'npc';

interface DieProps {
  face: Face;
  owner: DieOwner;
  /** Chip-sized rendering for speech bubbles and the history sheet. */
  small?: boolean;
  /** For dice inside an element that already carries the label. */
  decorative?: boolean;
}

export function Die({ face, owner, small = false, decorative = false }: DieProps) {
  return (
    <img
      className={small ? styles.small : styles.die}
      src={assets.dice[owner][face]}
      alt={decorative ? '' : i18n.t(owner === 'player' ? 'scene.dieYou' : 'scene.dieOpp', { face })}
      draggable={false}
    />
  );
}
