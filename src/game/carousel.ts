import type { BidOption } from './bids';

/** CALL! rides the strip as its first entry, exactly like the reference. */
export type CarouselItem = { kind: 'call' } | { kind: 'bid'; option: BidOption };

export function itemKey(item: CarouselItem): string {
  return item.kind === 'call' ? 'call' : `${item.option.bid.quantity}x${item.option.bid.face}`;
}

export function itemSelectable(item: CarouselItem): boolean {
  return item.kind === 'call' || item.option.selectable;
}
