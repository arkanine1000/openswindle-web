import type { Bid, Face } from '../api/types';

export const FACES: readonly Face[] = [1, 2, 3, 4];

/** A carousel entry. Ghosted bids exceed the dice currently on the board:
 * they render (showing the space shrinking) but cannot be submitted. */
export interface BidOption {
  bid: Bid;
  selectable: boolean;
}

/** Engine raise rule: higher quantity, or same quantity and higher face. */
export function raises(bid: Bid, previous: Bid): boolean {
  if (bid.quantity !== previous.quantity) return bid.quantity > previous.quantity;
  return bid.face > previous.face;
}

/**
 * Every bid the carousel shows, ordered ascending (quantity, then face).
 * Quantities run up to the match-start total even after dice have been lost;
 * bids above the *current* total are ghosted (the server rejects them).
 */
export function enumerateBids(
  lastBid: Bid | null,
  startTotal: number,
  currentTotal: number,
): BidOption[] {
  const options: BidOption[] = [];
  for (let quantity = 1; quantity <= startTotal; quantity++) {
    for (const face of FACES) {
      const bid: Bid = { quantity, face };
      if (lastBid !== null && !raises(bid, lastBid)) continue;
      options.push({ bid, selectable: quantity <= currentTotal });
    }
  }
  return options;
}

/** Parse the engine's "NxF" string form (NPCEvent.bid). */
export function parseBid(text: string): Bid {
  const match = /^(\d+)x([1-4])$/.exec(text);
  if (!match) throw new Error(`Unparseable bid string: ${text}`);
  return { quantity: Number(match[1]), face: Number(match[2]) as Face };
}

const FACE_WORDS: Record<Face, [string, string]> = {
  1: ['one', 'ones'],
  2: ['two', 'twos'],
  3: ['three', 'threes'],
  4: ['four', 'fours'],
};

/** "2 fours", "1 three" — the reference UI's spoken bid form. */
export function spokenBid(bid: Bid): string {
  return `${bid.quantity} ${FACE_WORDS[bid.face][bid.quantity === 1 ? 0 : 1]}`;
}
