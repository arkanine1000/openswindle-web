import type { Move, RoundReveal } from '../api/types';
import { HUMAN_SEAT } from '../api/types';
import { spokenBid } from './bids';

export type Speaker = 'you' | 'npc';

/** The client's own chronological log — the engine exposes no transcript
 * endpoint, so the history sheet is built from what this seat has seen. */
export type TranscriptEntry =
  | { kind: 'narration'; roundNo: number; text: string }
  | { kind: 'move'; roundNo: number; speaker: Speaker; move: Move; talk: string | null }
  | { kind: 'reveal'; roundNo: number; reveal: RoundReveal; youLost: boolean };

export type MoveTranscriptEntry = Extract<TranscriptEntry, { kind: 'move' }>;
export type RevealTranscriptEntry = Extract<TranscriptEntry, { kind: 'reveal' }>;

export function moveEntry(
  roundNo: number,
  speaker: Speaker,
  move: Move,
  talk: string | null,
): MoveTranscriptEntry {
  return { kind: 'move', roundNo, speaker, move, talk: talk || null };
}

export function revealEntry(reveal: RoundReveal): RevealTranscriptEntry {
  return {
    kind: 'reveal',
    roundNo: reveal.round_no,
    reveal,
    youLost: reveal.loser === HUMAN_SEAT,
  };
}

export function narrationEntry(roundNo: number, text: string): TranscriptEntry {
  return { kind: 'narration', roundNo, text };
}

/** History-sheet line for a move: the reference renders talk with the bid
 * folded into the quote ("'So do you live in Kharé? 1 three.' you ask."). */
export function describeMove(entry: MoveTranscriptEntry): string {
  const deed = entry.move.action === 'bid' ? spokenBid(entry.move.bid) : 'Call!';
  if (entry.talk) {
    return entry.speaker === 'you'
      ? `'${entry.talk} ${deed}.' you say.`
      : `'${entry.talk} ${deed}.'`;
  }
  if (entry.move.action === 'call') {
    return entry.speaker === 'you' ? 'You call!' : 'Your opponent calls!';
  }
  return entry.speaker === 'you' ? `You bid ${deed}.` : `The reply comes: ${deed}.`;
}

export function describeReveal(entry: RevealTranscriptEntry): string {
  const { reveal, youLost } = entry;
  const bid = spokenBid(reveal.final_bid);
  const stood = reveal.bid_met
    ? `the bid of ${bid} stood — ${reveal.actual_count} on the table`
    : `the bid of ${bid} fell short — only ${reveal.actual_count} on the table`;
  return `Hands shown: ${stood}. ${youLost ? 'You lose a die.' : 'Your opponent loses a die.'}`;
}
