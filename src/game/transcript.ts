import type { Move, RoundReveal, Seat } from '../api/types';
import i18n from '../i18n';
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

export function revealEntry(reveal: RoundReveal, mySeat: Seat): RevealTranscriptEntry {
  return {
    kind: 'reveal',
    roundNo: reveal.round_no,
    reveal,
    youLost: reveal.loser === mySeat,
  };
}

export function narrationEntry(roundNo: number, text: string): TranscriptEntry {
  return { kind: 'narration', roundNo, text };
}

/** History-sheet line for a move: the reference renders talk with the bid
 * folded into the quote ("'So do you live in Kharé? 1 three.' you ask."). */
export function describeMove(entry: MoveTranscriptEntry): string {
  const deed = entry.move.action === 'bid' ? spokenBid(entry.move.bid) : i18n.t('game.callShout');
  if (entry.talk) {
    const key = entry.speaker === 'you' ? 'transcript.moveYouSay' : 'transcript.moveNpcSay';
    return i18n.t(key, { talk: entry.talk, deed });
  }
  if (entry.move.action === 'call') {
    return i18n.t(entry.speaker === 'you' ? 'transcript.moveYouCall' : 'transcript.moveNpcCall');
  }
  return i18n.t(entry.speaker === 'you' ? 'transcript.moveYouBid' : 'transcript.moveNpcBid', {
    deed,
  });
}

export function describeReveal(entry: RevealTranscriptEntry): string {
  const { reveal, youLost } = entry;
  const bid = spokenBid(reveal.final_bid);
  const call = reveal.bid_met
    ? i18n.t('transcript.revealHeld', { bid })
    : i18n.t('transcript.revealBluff', { bid });
  const who = youLost ? i18n.t('transcript.revealYouLose') : i18n.t('transcript.revealOppLose');
  return `${call} ${who}`;
}
