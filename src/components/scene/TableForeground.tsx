import { assets } from '../../assets/manifest';
import styles from './TableForeground.module.css';

export function TableForeground() {
  return (
    <div className={styles.table} aria-hidden>
      <img src={assets.table.surface} alt="" />
    </div>
  );
}
