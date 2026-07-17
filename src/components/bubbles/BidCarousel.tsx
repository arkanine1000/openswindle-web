import { animate, motion, useMotionValue } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { itemKey, itemSelectable, type CarouselItem } from '../../game/carousel';
import { Die } from '../scene/Die';
import styles from './BidCarousel.module.css';

const ITEM_W = 76; // px, matches .item width in the module

interface BidCarouselProps {
  items: CarouselItem[];
  armedIndex: number;
  onArm: (index: number) => void;
  /** Fired when the armed item is tapped again: the confirm gesture. */
  onSubmit: (item: CarouselItem) => void;
}

/**
 * The reference UI's horizontal picker: drag (or tap a neighbor) to center
 * an entry, tap the centered entry to play it. Ghosted entries are bids
 * whose quantity exceeds the dice still on the board — visible, dead.
 */
export function BidCarousel({ items, armedIndex, onArm, onSubmit }: BidCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const x = useMotionValue(0);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centerOffset = viewportW / 2 - ITEM_W / 2;

  useEffect(() => {
    const controls = animate(x, centerOffset - armedIndex * ITEM_W, {
      type: 'spring',
      stiffness: 400,
      damping: 34,
    });
    return () => controls.stop();
  }, [armedIndex, centerOffset, x]);

  const settle = () => {
    const idx = Math.round((centerOffset - x.get()) / ITEM_W);
    onArm(Math.min(items.length - 1, Math.max(0, idx)));
  };

  return (
    <div className={styles.viewport} ref={viewportRef} data-testid="bid-carousel">
      <motion.div
        className={styles.strip}
        drag="x"
        style={{ x }}
        dragConstraints={{
          left: centerOffset - (items.length - 1) * ITEM_W,
          right: centerOffset,
        }}
        dragElastic={0.08}
        onDragEnd={settle}
      >
        {items.map((item, i) => {
          const armed = i === armedIndex;
          const selectable = itemSelectable(item);
          return (
            <motion.button
              key={itemKey(item)}
              type="button"
              className={styles.item}
              data-testid={item.kind === 'call' ? 'call-button' : `bid-option-${itemKey(item)}`}
              data-armed={armed}
              data-selectable={selectable}
              animate={{
                scale: armed ? 1.12 : 0.88,
                opacity: selectable ? (armed ? 1 : 0.5) : 0.22,
              }}
              onTap={() => {
                if (armed && selectable) onSubmit(item);
                else onArm(i);
              }}
              aria-disabled={!selectable}
              aria-label={
                item.kind === 'call'
                  ? 'call the last bid'
                  : `bid ${item.option.bid.quantity} of face ${item.option.bid.face}${selectable ? '' : ' (not possible with the dice left)'}`
              }
            >
              {item.kind === 'call' ? (
                <span className={styles.callLabel}>Call!</span>
              ) : (
                <>
                  <Die face={item.option.bid.face} owner="player" small />
                  <b className={styles.count}>{item.option.bid.quantity}x</b>
                </>
              )}
            </motion.button>
          );
        })}
      </motion.div>
      <div className={styles.fadeLeft} aria-hidden />
      <div className={styles.fadeRight} aria-hidden />
    </div>
  );
}
