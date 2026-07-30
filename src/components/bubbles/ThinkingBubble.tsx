import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { SpeechBubble } from './SpeechBubble';
import styles from './ThinkingBubble.module.css';

const fillers = () => i18n.t('thinking.fillers', { returnObjects: true }) as unknown as string[];

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
  const { t } = useTranslation();
  const [filler, setFiller] = useState(() => {
    const pool = fillers();
    return pool[Math.floor(Math.random() * pool.length)];
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      timer = setTimeout(
        () => {
          setFiller((prev) => {
            const next = fillers().filter((f) => f !== prev);
            return next[Math.floor(Math.random() * next.length)];
          });
          tick();
        },
        1800 + Math.random() * 2200,
      );
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <SpeechBubble tail={tail} testId="thinking-bubble">
      <span className={styles.filler}>{filler}</span>
      <span className={styles.dots} aria-label={t('thinking.aria')}>
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
