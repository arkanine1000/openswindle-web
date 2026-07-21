import { describe, expect, it } from 'vitest';
import { buildRemoteSteps } from '../src/game/choreography';
import type { BidRecord } from '../src/api/types';
import { bid, reveal, view } from './helpers';

const record = (seat: 'a' | 'b', q: number, f: 1 | 2 | 3 | 4, talk: string | null = null): BidRecord => ({
  seat,
  bid: bid(q, f),
  table_talk: talk,
});

describe('buildRemoteSteps', () => {
  it('renders a single opponent raise (same round, no reveal)', () => {
    const prev = view({ turn: 'b', bid_history: [record('a', 1, 1)] });
    const next = view({ turn: 'a', bid_history: [record('a', 1, 1), record('b', 1, 2, 'higher')] });
    const steps = buildRemoteSteps(prev, next, 'a');
    expect(steps).toEqual([
      { type: 'npcMove', move: { action: 'bid', bid: bid(1, 2) }, talk: 'higher' },
    ]);
  });

  it('renders a call → reveal → my open when I lose the round', () => {
    const prev = view({ turn: 'b', bid_history: [record('a', 1, 1)] });
    const next = view({
      turn: 'a',
      round_no: 2,
      bid_history: [],
      reveals: [reveal({ loser: 'a', round_no: 1, table_talk: 'gotcha' })],
    });
    const steps = buildRemoteSteps(prev, next, 'a');
    expect(steps.map((s) => s.type)).toEqual(['npcMove', 'reveal', 'roundStart']);
    expect(steps[0]).toMatchObject({ move: { action: 'call' }, talk: 'gotcha' });
    expect(steps[2]).toMatchObject({ type: 'roundStart', roundNo: 2, opener: 'a' });
  });

  it('renders a call → reveal → the opponent re-opening when it loses', () => {
    const prev = view({ turn: 'b', bid_history: [record('a', 1, 1)] });
    const next = view({
      turn: 'a',
      round_no: 2,
      bid_history: [record('b', 1, 1, 'again')],
      reveals: [reveal({ loser: 'b', round_no: 1 })],
    });
    const steps = buildRemoteSteps(prev, next, 'a');
    expect(steps.map((s) => s.type)).toEqual(['npcMove', 'reveal', 'roundStart', 'npcMove']);
    expect(steps[2]).toMatchObject({ opener: 'b' });
    expect(steps[3]).toMatchObject({ move: { action: 'bid', bid: bid(1, 1) }, talk: 'again' });
  });

  it('ends the match when the opponent call takes my last die', () => {
    const prev = view({ turn: 'b', bid_history: [record('a', 1, 1)] });
    const next = view({
      phase: 'finished',
      winner: 'b',
      turn: 'a',
      bid_history: [record('a', 1, 1)],
      reveals: [reveal({ loser: 'a' })],
    });
    const steps = buildRemoteSteps(prev, next, 'a');
    expect(steps.map((s) => s.type)).toEqual(['npcMove', 'reveal', 'matchEnd']);
    expect(steps.at(-1)).toEqual({ type: 'matchEnd', winner: 'b' });
  });

  it('treats a walk-away (finished, no winner) as a reveal without a voiced move', () => {
    const prev = view({ turn: 'b', bid_history: [record('a', 1, 1)] });
    const next = view({
      phase: 'finished',
      winner: null,
      turn: 'a',
      bid_history: [record('a', 1, 1)],
      reveals: [reveal({ loser: 'a' })],
    });
    const steps = buildRemoteSteps(prev, next, 'a');
    // No npcMove 'call' — an abort has no move to attribute to the opponent.
    expect(steps.map((s) => s.type)).toEqual(['reveal', 'matchEnd']);
    expect(steps.at(-1)).toEqual({ type: 'matchEnd', winner: null });
  });

  it('reads the board from seat B (opponent is seat a)', () => {
    const prev = view({ seat: 'b', turn: 'a', bid_history: [] });
    const next = view({ seat: 'b', turn: 'b', bid_history: [record('a', 2, 3, 'mine')] });
    const steps = buildRemoteSteps(prev, next, 'b');
    expect(steps).toEqual([
      { type: 'npcMove', move: { action: 'bid', bid: bid(2, 3) }, talk: 'mine' },
    ]);
  });
});
