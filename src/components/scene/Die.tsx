import type { Face } from '../../api/types';
import { assets } from '../../assets/manifest';
import styles from './Die.module.css';

export type DieOwner = 'player' | 'npc';

interface DieProps {
  face: Face;
  owner: DieOwner;
  /** Chip-sized rendering for speech bubbles and the history sheet. */
  small?: boolean;
}

export function Die({ face, owner, small = false }: DieProps) {
  return (
    <img
      className={small ? styles.small : styles.die}
      src={assets.dice[owner][face]}
      alt={`${owner === 'player' ? 'your' : "opponent's"} die showing ${face}`}
      draggable={false}
    />
  );
}
