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
  const touchY = useRef<number | null>(null);

  /** True once the last entry is on screen, so carrying on rolls the sheet
   * back up rather than fighting the scroll. */
  const pastTheEnd = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

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
              if (e.deltaY > 20 && pastTheEnd(e.currentTarget)) onClose();
            }}
            onTouchStart={(e) => {
              touchY.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(e) => {
              // The same gesture as the wheel handler, which touch never
              // fires: at the end of the log, a finger still travelling up
              // is asking for the next thing, and there isn't one.
              const start = touchY.current;
              const y = e.touches[0]?.clientY;
              if (start == null || y == null) return;
              if (start - y > 40 && pastTheEnd(e.currentTarget)) {
                touchY.current = null;
                onClose();
              }
            }}
            onTouchEnd={() => {
              touchY.current = null;
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
