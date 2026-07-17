import { describe, expect, it } from 'vitest';
import { buildSteps } from '../src/game/choreography';
import { bid, moveResponse, npcBid, npcCall, reveal, view } from './helpers';

describe('buildSteps', () => {
  it('plain NPC counter-bid: one npcMove step, no reveal', () => {
    const res = moveResponse({ npc_events: [npcBid('3x2', 'Bold of you.')] });
    const steps = buildSteps({ action: 'bid', bid: bid(2, 4) }, res);
    expect(steps).toEqual([
      { type: 'npcMove', move: { action: 'bid', bid: bid(3, 2) }, talk: 'Bold of you.' },
    ]);
  });

  it('player calls, loses, NPC keeps quiet: reveal then roundStart opened by player', () => {
    const r = reveal({ loser: 'a', bid_met: true });
    const res = moveResponse({
      view: view({ round_no: 2, your_hand: [1, 4, 4], dice_counts: { a: 3, b: 4 } }),
      reveals: [r],
    });
    const steps = buildSteps({ action: 'call' }, res);
    expect(steps).toEqual([
      { type: 'reveal', reveal: r },
      { type: 'roundStart', roundNo: 2, yourHand: [1, 4, 4], opener: 'a' },
    ]);
  });

  it('player calls and wins: NPC lost, opens next round in the same response', () => {
    const r = reveal({ loser: 'b', bid_met: false });
    const res = moveResponse({
      view: view({ round_no: 2, your_hand: [2, 2, 3, 3], dice_counts: { a: 4, b: 3 } }),
      npc_events: [npcBid('1x2', 'Fine. Again.')],
      reveals: [r],
    });
    const steps = buildSteps({ action: 'call' }, res);
    expect(steps.map((s) => s.type)).toEqual(['reveal', 'roundStart', 'npcMove']);
    expect(steps[1]).toMatchObject({ opener: 'b', roundNo: 2 });
    expect(steps[2]).toMatchObject({ move: { action: 'bid', bid: bid(1, 2) } });
  });

  it('NPC calls the player and the player loses the round', () => {
    const r = reveal({ caller: 'b', loser: 'a', bid_met: false });
    const res = moveResponse({
      view: view({ round_no: 2, your_hand: [3, 3, 4], dice_counts: { a: 3, b: 4 } }),
      npc_events: [npcCall('I do not believe you.')],
      reveals: [r],
    });
    const steps = buildSteps({ action: 'bid', bid: bid(4, 4) }, res);
    expect(steps.map((s) => s.type)).toEqual(['npcMove', 'reveal', 'roundStart']);
    expect(steps[0]).toMatchObject({ move: { action: 'call' }, talk: 'I do not believe you.' });
    expect(steps[2]).toMatchObject({ opener: 'a' });
  });

  it('match-ending call produces matchEnd and no roundStart', () => {
    const r = reveal({ caller: 'b', loser: 'a' });
    const res = moveResponse({
      view: view({ phase: 'finished', winner: 'b', dice_counts: { a: 0, b: 2 } }),
      npc_events: [npcCall()],
      reveals: [r],
    });
    const steps = buildSteps({ action: 'bid', bid: bid(2, 1) }, res);
    expect(steps.map((s) => s.type)).toEqual(['npcMove', 'reveal', 'matchEnd']);
    expect(steps.at(-1)).toEqual({ type: 'matchEnd', winner: 'b' });
  });

  it('abort (null player move): reveal straight to matchEnd with null winner', () => {
    const r = reveal();
    const res = moveResponse({
      view: view({ phase: 'finished', winner: null }),
      reveals: [r],
    });
    const steps = buildSteps(null, res);
    expect(steps).toEqual([
      { type: 'reveal', reveal: r },
      { type: 'matchEnd', winner: null },
    ]);
  });

  it('throws when a call has no matching reveal', () => {
    const res = moveResponse({ npc_events: [npcCall()] });
    expect(() => buildSteps({ action: 'bid', bid: bid(2, 1) }, res)).toThrow(/missing/);
  });
});
