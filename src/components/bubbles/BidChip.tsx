import type { Bid } from '../../api/types';
import { spokenBid } from '../../game/bids';
import i18n from '../../i18n';
import { Die, type DieOwner } from '../scene/Die';
import styles from './BidChip.module.css';

/** A bid as one inline token — "3x" beside its die — so bubbles can seat it
 * left of the table talk. The die denotes the bid's face, not a die anyone
 * holds, so the chip carries one label and the parts are decorative. */
export function BidChip({ bid, owner }: { bid: Bid; owner: DieOwner }) {
  return (
    <span
      className={styles.chip}
      data-testid="bid-chip"
      data-bid={`${bid.quantity}x${bid.face}`}
      role="img"
      aria-label={i18n.t('scene.bidChip', { bid: spokenBid(bid) })}
    >
      <b className={styles.count} aria-hidden>
        {bid.quantity}x
      </b>
      <Die face={bid.face} owner={owner} small decorative />
    </span>
  );
}
