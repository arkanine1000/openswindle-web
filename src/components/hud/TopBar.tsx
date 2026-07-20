import { assets } from '../../assets/manifest';
import styles from './TopBar.module.css';

interface TopBarProps {
  /** Dice each side started the match with (socket count). */
  perPlayer: number;
  playerCount: number;
  npcCount: number;
  onHistoryToggle: () => void;
  historyOpen: boolean;
}

function PipStrip({ total, alive, who }: { total: number; alive: number; who: 'player' | 'npc' }) {
  return (
    <div className={styles.plate} data-testid={`pips-${who}`}>
      {Array.from({ length: total }, (_, i) => (
        <img
          key={i}
          className={styles.pip}
          src={i < alive ? assets.pips[who] : assets.pips.lost}
          alt={i < alive ? `${who === 'player' ? 'your' : "opponent's"} die` : 'lost die'}
        />
      ))}
    </div>
  );
}

/** Dice-count gems (you left, opponent right) around the history tab. */
export function TopBar({
  perPlayer,
  playerCount,
  npcCount,
  onHistoryToggle,
  historyOpen,
}: TopBarProps) {
  return (
    <div className={styles.bar}>
      <PipStrip total={perPlayer} alive={playerCount} who="player" />
      <button
        type="button"
        className={styles.historyTab}
        onClick={onHistoryToggle}
        aria-expanded={historyOpen}
        data-testid="history-tab"
      >
        {/* Points the way the sheet will travel: down to unroll it, up to
         * send it back. The open state matches the arrow on the sheet's own
         * tab, which slides down over this one — mismatched arrows showed as
         * a flicker at the start of the animation. */}
        <span className={historyOpen ? styles.arrowUp : styles.arrowDown} aria-hidden />
        <span className={styles.visuallyHidden}>
          {historyOpen ? 'Close the table-talk history' : 'Read the table-talk history'}
        </span>
      </button>
      <PipStrip total={perPlayer} alive={npcCount} who="npc" />
    </div>
  );
}
