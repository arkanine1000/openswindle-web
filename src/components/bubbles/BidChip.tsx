import type { Bid } from '../../api/types';
import { Die, type DieOwner } from '../scene/Die';
import styles from './BidChip.module.css';

/** A bid as one inline token — "3x" beside its die — so bubbles can seat it
 * left of the table talk. */
export function BidChip({ bid, owner }: { bid: Bid; owner: DieOwner }) {
  return (
    <span className={styles.chip} data-testid="bid-chip" data-bid={`${bid.quantity}x${bid.face}`}>
      <b className={styles.count}>{bid.quantity}x</b>
      <Die face={bid.face} owner={owner} small />
    </span>
  );
}
