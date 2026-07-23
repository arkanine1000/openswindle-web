import { Modal } from '../ui/Modal';
import styles from './RulesModal.module.css';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

/** A brief, in-fiction rules primer for a stranger to the table. */
export function RulesModal({ open, onClose }: RulesModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="How to Swindle" testId="rules-modal">
      <div className={styles.rules}>
        <p className={styles.lede}>
          A liar's game of four-sided bones. You and your opponent each hide a handful of dice
          (faces 1–4). Nobody sees the other's hand.
        </p>
        <ol className={styles.steps}>
          <li>
            <b>Bid</b> a claim like <span className={styles.bid}>3 × four</span> — that at least
            three fours lie across <i>both</i> hands, yours and theirs together.
          </li>
          <li>
            <b>Raise</b> or beat every bid: a higher count, or the same count on a higher face.
          </li>
          <li>
            <b>Call</b> instead, if you smell a lie. Both hands come open — if the bid holds, the
            caller loses a die; if it was a bluff, the bidder does.
          </li>
          <li>
            <b>Survive.</b> Lose your last die and you're out. Take theirs and the table is yours.
          </li>
        </ol>
        <p className={styles.aside}>
          Talk is part of the game. Bluff, needle, or hold your tongue.
        </p>
      </div>
    </Modal>
  );
}
