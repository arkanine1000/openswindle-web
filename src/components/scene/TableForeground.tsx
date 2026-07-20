import { assets } from '../../assets/manifest';
import styles from './TableForeground.module.css';

/** The table between the players. Nearest of the drifting layers, so it
 * stirs only slightly; overscanned sideways so the travel never bares an
 * edge. */
export function TableForeground({
  offsetX = 0,
  offsetY = 0,
}: {
  offsetX?: number;
  offsetY?: number;
}) {
  return (
    <div
      className={styles.table}
      style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
      aria-hidden
    >
      <img src={assets.table.surface} alt="" />
    </div>
  );
}
