import { assets } from '../../assets/manifest';
import styles from './Backdrop.module.css';

/** The wall behind the table. Overscanned so the parallax drift never shows
 * an edge; the transform is applied by TableScene on desktop pointers. */
export function Backdrop({ offsetX = 0, offsetY = 0 }: { offsetX?: number; offsetY?: number }) {
  return (
    <div
      className={styles.backdrop}
      style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
      aria-hidden
    >
      <img src={assets.backdrop.wall} alt="" />
    </div>
  );
}
