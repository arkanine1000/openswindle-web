import { describe, expect, it } from 'vitest';
import { enumerateBids, parseBid, raises, spokenBid } from '../src/game/bids';
import type { Bid } from '../src/api/types';

const bid = (quantity: number, face: 1 | 2 | 3 | 4): Bid => ({ quantity, face });

describe('raises', () => {
  it('accepts a higher quantity regardless of face', () => {
    expect(raises(bid(3, 1), bid(2, 4))).toBe(true);
  });
  it('accepts the same quantity with a higher face', () => {
    expect(raises(bid(2, 3), bid(2, 2))).toBe(true);
  });
  it('rejects the same bid, lower faces, and lower quantities', () => {
    expect(raises(bid(2, 2), bid(2, 2))).toBe(false);
    expect(raises(bid(2, 1), bid(2, 2))).toBe(false);
    expect(raises(bid(1, 4), bid(2, 1))).toBe(false);
  });
});

describe('enumerateBids', () => {
  it('opens with every bid up to the start total, all selectable', () => {
    const options = enumerateBids(null, 8, 8);
    expect(options).toHaveLength(32); // 8 quantities x 4 faces
    expect(options.every((o) => o.selectable)).toBe(true);
    expect(options[0]?.bid).toEqual(bid(1, 1));
    expect(options.at(-1)?.bid).toEqual(bid(8, 4));
  });

  it('orders ascending by quantity then face', () => {
    const options = enumerateBids(null, 4, 4);
    const pairs = options.map((o) => [o.bid.quantity, o.bid.face]);
    const sorted = [...pairs].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
    expect(pairs).toEqual(sorted);
  });

  it('omits bids that do not strictly raise', () => {
    const options = enumerateBids(bid(2, 3), 8, 8);
    expect(options[0]?.bid).toEqual(bid(2, 4));
    expect(options[1]?.bid).toEqual(bid(3, 1));
    expect(options.some((o) => !raises(o.bid, bid(2, 3)))).toBe(false);
  });

  it('ghosts quantities above the current board total but keeps them visible', () => {
    // Start 8 dice, 3 lost: bids of 6-8 render but cannot be submitted.
    const options = enumerateBids(bid(4, 4), 8, 5);
    const selectable = options.filter((o) => o.selectable).map((o) => o.bid.quantity);
    const ghosted = options.filter((o) => !o.selectable).map((o) => o.bid.quantity);
    expect(Math.max(...selectable)).toBe(5);
    expect(Math.min(...ghosted)).toBe(6);
    expect(Math.max(...ghosted)).toBe(8);
  });

  it('returns only ghosted options when the last bid saturates the board', () => {
    const options = enumerateBids(bid(5, 4), 8, 5);
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => !o.selectable)).toBe(true);
  });
});

describe('parseBid / spokenBid', () => {
  it('round-trips the engine string form', () => {
    expect(parseBid('2x3')).toEqual(bid(2, 3));
    expect(parseBid('12x1')).toEqual(bid(12, 1));
  });
  it('rejects malformed strings', () => {
    expect(() => parseBid('2x5')).toThrow();
    expect(() => parseBid('call')).toThrow();
  });
  it('speaks bids like the reference UI', () => {
    expect(spokenBid(bid(2, 4))).toBe('2 fours');
    expect(spokenBid(bid(1, 3))).toBe('1 three');
    expect(spokenBid(bid(5, 1))).toBe('5 ones');
  });
});
