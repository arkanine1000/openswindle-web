import type { ReactNode } from 'react';
import styles from './SpeechBubble.module.css';

interface SpeechBubbleProps {
  /** Which table edge the tail points toward. */
  tail: 'npc' | 'player';
  children: ReactNode;
  testId?: string;
  className?: string;
}

/** Presentation only — enter/exit/shift animation belongs to whoever places
 * the bubble (the conversation column animates the rolling window). */
export function SpeechBubble({ tail, children, testId, className }: SpeechBubbleProps) {
  const tailClass = tail === 'npc' ? styles.tailNpc : styles.tailPlayer;
  return (
    <div
      className={`${styles.bubble} ${tailClass}${className ? ` ${className}` : ''}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
