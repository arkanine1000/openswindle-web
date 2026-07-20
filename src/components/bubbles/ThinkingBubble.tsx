import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { SpeechBubble } from './SpeechBubble';
import styles from './ThinkingBubble.module.css';

const FILLERS = ['Well…', 'Hmm…', 'Maybe…', 'Let me see…', 'Mm.', 'Now then…', 'Hah…'];

interface ThinkingBubbleProps {
  /** Matches whichever NPC bubble this stands in for — sideways on
   * desktop's conversation column, up on mobile's single right-aligned
   * slot. */
  tail?: 'npc' | 'up';
}

/** Placeholder chatter while the move request is in flight, so the opponent
 * never looks frozen: filler phrases rotate on a jittered clock and the
 * ellipsis pulses continuously. */
export function ThinkingBubble({ tail = 'npc' }: ThinkingBubbleProps) {
  const [filler, setFiller] = useState(() => FILLERS[Math.floor(Math.random() * FILLERS.length)]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      timer = setTimeout(
        () => {
          setFiller((prev) => {
            const next = FILLERS.filter((f) => f !== prev);
            return next[Math.floor(Math.random() * next.length)];
          });
          tick();
        },
        900 + Math.random() * 1100,
      );
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <SpeechBubble tail={tail} testId="thinking-bubble">
      <span className={styles.filler}>{filler}</span>
      <span className={styles.dots} aria-label="opponent is thinking">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={styles.dot}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </span>
    </SpeechBubble>
  );
}
