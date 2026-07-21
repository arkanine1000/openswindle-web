import type { Move, MoveResponse, PublicMatchView, RoundReveal, Seat } from '../api/types';
import { otherSeat } from '../api/types';
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

/**
 * Build the steps for what the *remote opponent* did between two polled views.
 *
 * Human matches have no synchronous MoveResponse — the waiting seat learns of
 * the opponent's move by polling GET /matches/{id}, so we reconstruct the
 * opponent's actions from the difference between the last-applied view and the
 * freshly polled one. Per polling cycle the opponent produces at most one of:
 *   - a single bid (the turn passes back to me);
 *   - a call → reveal → (if the match continues) the next round's deal, plus
 *     the opponent's opening bid when it is the one who lost and re-opens;
 *   - a walk-away (abort): a reveal that finishes the match with no winner and
 *     no move to voice.
 *
 * Feeds the same Step queue and playSteps renderer as the NPC path.
 */
export function buildRemoteSteps(
  prevView: PublicMatchView,
  newView: PublicMatchView,
  mySeat: Seat,
): Step[] {
  const opponent = otherSeat(mySeat);
  const steps: Step[] = [];
  const newReveals = newView.reveals.slice(prevView.reveals.length);

  if (newReveals.length === 0) {
    // Same round, no call: the opponent raised. Everything past the bids I had
    // already seen is theirs (the guard defends against an unexpected diff).
    for (const record of newView.bid_history.slice(prevView.bid_history.length)) {
      if (record.seat !== opponent) continue;
      steps.push({
        type: 'npcMove',
        move: { action: 'bid', bid: record.bid },
        talk: record.table_talk ?? '',
      });
    }
    return steps;
  }

  newReveals.forEach((reveal, i) => {
    const isLast = i === newReveals.length - 1;
    const finishedHere = newView.phase === 'finished' && isLast;
    const abandoned = finishedHere && newView.winner === null;

    // A genuine call ends the round; a walk-away leaves no move to voice.
    if (!abandoned) {
      steps.push({ type: 'npcMove', move: { action: 'call' }, talk: reveal.table_talk ?? '' });
    }
    steps.push({ type: 'reveal', reveal });

    if (!finishedHere) {
      steps.push({
        type: 'roundStart',
        roundNo: reveal.round_no + 1,
        yourHand: newView.your_hand,
        opener: reveal.loser,
      });
      // If the opponent lost and re-opens, its opening bid is already on the
      // board of the round we just polled into.
      if (isLast && reveal.loser === opponent) {
        const opening = newView.bid_history[0];
        if (opening?.seat === opponent) {
          steps.push({
            type: 'npcMove',
            move: { action: 'bid', bid: opening.bid },
            talk: opening.table_talk ?? '',
          });
        }
      }
    }
  });

  if (newView.phase === 'finished') {
    steps.push({ type: 'matchEnd', winner: newView.winner });
  }
  return steps;
}
