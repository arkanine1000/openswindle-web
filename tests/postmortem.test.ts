import { describe, expect, it } from 'vitest';
import { buildPostmortem } from '../src/game/postmortem';
import { moveEntry } from '../src/game/transcript';
import { bid, reveal } from './helpers';

// Three rounds from seat A's chair: catch a bluff (take a die), then lose two.
const reveals = [
  reveal({ round_no: 1, caller: 'a', bid_met: false, loser: 'b', final_bid: bid(2, 3) }),
  reveal({ round_no: 2, caller: 'a', bid_met: true, loser: 'a', final_bid: bid(3, 4) }),
  reveal({ round_no: 3, caller: 'b', bid_met: false, loser: 'a', final_bid: bid(4, 2) }),
];

const transcript = [
  moveEntry(1, 'you', { action: 'bid', bid: bid(2, 3) }, 'I never lie'),
  moveEntry(1, 'npc', { action: 'call' }, null),
  moveEntry(2, 'npc', { action: 'bid', bid: bid(3, 4) }, null),
];

function statValue(label: string, outcome: 'win' | 'defeat' | 'abandoned' = 'win') {
  const p = buildPostmortem(reveals, transcript, 'a', 'Morwenna', outcome);
  return p.stats.find((s) => s.label === label)?.value;
}

describe('buildPostmortem', () => {
  it('recaps a win with the opponent and round count', () => {
    const p = buildPostmortem(reveals, transcript, 'a', 'Morwenna', 'win');
    expect(p.recap).toContain('outlasted Morwenna');
    expect(p.recap).toContain('3 rounds');
  });

  it('tallies dice taken, lost, and bluffs caught from the viewer seat', () => {
    expect(statValue('Rounds')).toBe(3);
    expect(statValue('Dice you took')).toBe(1);
    expect(statValue('Dice you lost')).toBe(2);
    expect(statValue('Bluffs you caught')).toBe(1);
  });

  it('frames each round headline from the player side', () => {
    const p = buildPostmortem(reveals, transcript, 'a', 'Morwenna', 'win');
    expect(p.rounds[0]?.youLost).toBe(false);
    expect(p.rounds[0]?.headline).toContain('caught the bluff');
    expect(p.rounds[1]?.youLost).toBe(true);
    expect(p.rounds[1]?.headline).toContain('You doubted');
    expect(p.rounds[2]?.headline).toContain('caught your bluff');
  });

  it('groups the exchange by round', () => {
    const p = buildPostmortem(reveals, transcript, 'a', 'Morwenna', 'win');
    expect(p.rounds[0]?.exchange).toHaveLength(2);
    expect(p.rounds[1]?.exchange).toHaveLength(1);
    expect(p.rounds[2]?.exchange).toHaveLength(0);
  });

  it('relabels the final round of a walk-away as a forfeit', () => {
    const p = buildPostmortem(reveals, transcript, 'a', 'Morwenna', 'abandoned');
    expect(p.rounds[2]?.headline).toContain('walked from the table');
  });

  it('reframes losses from seat B', () => {
    // Seat B called and caught the bluff — the opponent (seat a) lost.
    const bView = [reveal({ round_no: 1, caller: 'b', bid_met: false, loser: 'a' })];
    const p = buildPostmortem(bView, [], 'b', 'a stranger', 'defeat');
    expect(p.rounds[0]?.youLost).toBe(false);
    expect(p.stats.find((s) => s.label === 'Dice you took')?.value).toBe(1);
  });
});
