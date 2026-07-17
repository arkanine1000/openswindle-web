import type { Bid } from '../../api/types';
import { Die, type DieOwner } from '../scene/Die';
import styles from './BidChip.module.css';

/** The reference UI's bid form: a die icon with "Nx" beneath it. */
export function BidChip({ bid, owner }: { bid: Bid; owner: DieOwner }) {
  return (
    <span className={styles.chip} data-testid="bid-chip" data-bid={`${bid.quantity}x${bid.face}`}>
      <Die face={bid.face} owner={owner} small />
      <b className={styles.count}>{bid.quantity}x</b>
    </span>
  );
}
