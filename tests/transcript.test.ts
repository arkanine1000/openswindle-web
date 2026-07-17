import { describe, expect, it } from 'vitest';
import { describeMove, describeReveal, moveEntry, revealEntry } from '../src/game/transcript';
import { bid, reveal } from './helpers';

describe('describeMove', () => {
  it('folds the bid into the quote like the reference UI', () => {
    const entry = moveEntry(
      1,
      'you',
      { action: 'bid', bid: bid(1, 3) },
      'So do you live in Kharé?',
    );
    expect(describeMove(entry)).toBe("'So do you live in Kharé? 1 three.' you say.");
  });

  it('handles silent bids and calls for both speakers', () => {
    expect(describeMove(moveEntry(1, 'you', { action: 'bid', bid: bid(2, 4) }, null))).toBe(
      'You bid 2 fours.',
    );
    expect(describeMove(moveEntry(1, 'npc', { action: 'call' }, null))).toBe(
      'Your opponent calls!',
    );
  });

  it('treats empty talk as silence', () => {
    expect(moveEntry(1, 'npc', { action: 'call' }, '')).toMatchObject({ talk: null });
  });
});

describe('revealEntry / describeReveal', () => {
  it('frames the loss from the viewer side', () => {
    const lost = revealEntry(reveal({ loser: 'a', bid_met: true, actual_count: 3 }));
    expect(lost).toMatchObject({ youLost: true });
    expect(describeReveal(lost)).toContain('You lose a die.');

    const won = revealEntry(reveal({ loser: 'b', bid_met: false, actual_count: 1 }));
    expect(won).toMatchObject({ youLost: false });
    expect(describeReveal(won)).toContain('Your opponent loses a die.');
  });
});
