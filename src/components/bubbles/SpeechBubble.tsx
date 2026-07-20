import type { ReactNode } from 'react';
import styles from './SpeechBubble.module.css';

interface SpeechBubbleProps {
  /** Which edge the tail points toward: the NPC's side, the player's seat,
   * or — mobile's single right-aligned NPC bubble — straight up into the
   * figure looming above it. */
  tail: 'npc' | 'player' | 'up';
  children: ReactNode;
  testId?: string;
  className?: string;
}

const TAIL_CLASSES = { npc: 'tailNpc', player: 'tailPlayer', up: 'tailUp' } as const;

/** Presentation only — enter/exit/shift animation belongs to whoever places
 * the bubble (the conversation column animates the rolling window). */
export function SpeechBubble({ tail, children, testId, className }: SpeechBubbleProps) {
  const tailClass = styles[TAIL_CLASSES[tail]];
  return (
    <div
      className={`${styles.bubble} ${tailClass}${className ? ` ${className}` : ''}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
