import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../../game/transcript';
import { describeMove, describeReveal } from '../../game/transcript';
import styles from './HistorySheet.module.css';

interface HistorySheetProps {
  open: boolean;
  entries: TranscriptEntry[];
  onClose: () => void;
}

function line(entry: TranscriptEntry): string {
  switch (entry.kind) {
    case 'narration':
      return entry.text;
    case 'move':
      return describeMove(entry);
    case 'reveal':
      return describeReveal(entry);
  }
}

/** The stitched-linen table-talk log that unrolls over the scene. */
export function HistorySheet({ open, entries, onClose }: HistorySheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Open at the latest exchange, like the reference's live page bottom.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, entries.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          className={styles.sheet}
          data-testid="history-sheet"
          initial={{ y: '-105%' }}
          animate={{ y: 0 }}
          exit={{ y: '-105%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          aria-label="Table-talk history"
        >
          <div
            className={styles.scroll}
            ref={scrollRef}
            onWheel={(e) => {
              // Scrolling on past the latest entry rolls the sheet back up.
              const el = e.currentTarget;
              if (e.deltaY > 20 && el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
                onClose();
              }
            }}
          >
            {entries.map((entry, i) => (
              <p
                key={i}
                className={entry.kind === 'move' ? styles.spoken : styles.narration}
                data-testid="history-entry"
              >
                {line(entry)}
              </p>
            ))}
          </div>
          <button
            type="button"
            className={styles.closeTab}
            onClick={onClose}
            aria-label="Close history"
          >
            <span className={styles.arrowUp} aria-hidden />
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
