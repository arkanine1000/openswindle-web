import type { Move, MoveResponse, RoundReveal, Seat } from '../api/types';
import { parseBid } from './bids';

/**
 * A presentation step the scene plays in order. `POST /moves` returns
 * everything the NPC did before it's the human's turn again (possibly a
 * call, the reveal, and its opening bid of the next round); converting the
 * response into an explicit queue keeps that sequencing correct by
 * construction and testable without DOM.
 */
export type Step =
  | { type: 'npcMove'; move: Move; talk: string }
  | { type: 'reveal'; reveal: RoundReveal }
  | { type: 'roundStart'; roundNo: number; yourHand: number[]; opener: Seat }
  | { type: 'matchEnd'; winner: Seat | null };

/**
 * Interleave a MoveResponse into chronological steps.
 *
 * Reveal ordering rule: a reveal happens exactly when someone calls — the
 * player's own call consumes the first entry of `reveals`, and each NPC
 * `call` event consumes the next. A non-final reveal is followed by a
 * `roundStart` (the loser opens; if that loser is the NPC, its opening bid
 * is already queued right behind).
 *
 * `playerMove` is null for aborts (the engine reveals without a move).
 */
export function buildSteps(playerMove: Move | null, response: MoveResponse): Step[] {
  const { view, npc_events, reveals } = response;
  const steps: Step[] = [];
  let revealIndex = 0;

  const pushReveal = () => {
    const reveal = reveals[revealIndex++];
    if (!reveal) throw new Error('Move response missing an expected reveal');
    steps.push({ type: 'reveal', reveal });
    if (view.phase !== 'finished' || revealIndex < reveals.length) {
      steps.push({
        type: 'roundStart',
        roundNo: reveal.round_no + 1,
        yourHand: view.your_hand,
        opener: reveal.loser,
      });
    }
  };

  if (playerMove === null || playerMove.action === 'call') pushReveal();

  for (const event of npc_events) {
    if (event.action === 'bid') {
      if (!event.bid) throw new Error('NPC bid event without a bid');
      steps.push({
        type: 'npcMove',
        move: { action: 'bid', bid: parseBid(event.bid) },
        talk: event.table_talk,
      });
    } else {
      steps.push({ type: 'npcMove', move: { action: 'call' }, talk: event.table_talk });
      pushReveal();
    }
  }

  // Aborted matches finish with winner null; the result screen renders a walk-away.
  if (view.phase === 'finished') {
    steps.push({ type: 'matchEnd', winner: view.winner });
  }
  return steps;
}
