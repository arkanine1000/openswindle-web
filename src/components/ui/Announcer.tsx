import styles from './Announcer.module.css';

/** Always mounted so assistive tech has the region registered before the text
 * lands — beats vanishing on a timer are otherwise never announced. */
export function Announcer({ message }: { message: string }) {
  return (
    <div className={styles.announcer} role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
