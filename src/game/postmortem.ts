import type { RoundReveal, Seat } from '../api/types';
import i18n from '../i18n';
import { spokenBid } from './bids';
import type { Outcome } from './store';
import type { MoveTranscriptEntry, TranscriptEntry } from './transcript';

/** A glanceable headline number for the "at a glance" strip. */
export interface PostmortemStat {
  label: string;
  value: number;
}

export interface RoundSummary {
  roundNo: number;
  /** The bids/calls of the round, in order, with any table talk. */
  exchange: MoveTranscriptEntry[];
  /** Both hands and the adjudication — the authoritative round outcome. */
  reveal: RoundReveal;
  youLost: boolean;
  /** One player-framed line: who called what, and who bled for it. */
  headline: string;
}

export interface Postmortem {
  recap: string;
  stats: PostmortemStat[];
  rounds: RoundSummary[];
}

/** Player-framed one-liner for a round's adjudication. `bid_met` means the
 * final bid was true (so the caller misjudged); otherwise it was a bluff the
 * caller caught. */
function roundHeadline(reveal: RoundReveal, mySeat: Seat, opponent: string): string {
  const youCalled = reveal.caller === mySeat;
  const bid = spokenBid(reveal.final_bid);
  if (reveal.bid_met) {
    // The bid held; the caller was wrong to doubt it.
    const key = youCalled ? 'postmortem.headlineHeldYou' : 'postmortem.headlineHeldNpc';
    return i18n.t(key, { bid, opponent });
  }
  // A bluff, called out; the bidder was lying.
  const key = youCalled ? 'postmortem.headlineBluffYou' : 'postmortem.headlineBluffNpc';
  return i18n.t(key, { bid, opponent });
}

function recapLine(
  outcome: Outcome,
  opponent: string,
  rounds: number,
  finalCounts: { yours: number; theirs: number },
): string {
  if (outcome === 'win') {
    return i18n.t('postmortem.recapWin', { count: rounds, opponent });
  }
  if (outcome === 'defeat') {
    return i18n.t('postmortem.recapDefeat', { count: rounds, opponent, theirs: finalCounts.theirs });
  }
  return i18n.t('postmortem.recapAbandoned', { count: rounds });
}

export function buildPostmortem(
  reveals: RoundReveal[],
  transcript: TranscriptEntry[],
  mySeat: Seat,
  opponent: string,
  outcome: Outcome,
): Postmortem {
  const movesByRound = new Map<number, MoveTranscriptEntry[]>();
  for (const e of transcript) {
    if (e.kind !== 'move') continue;
    const list = movesByRound.get(e.roundNo) ?? [];
    list.push(e);
    movesByRound.set(e.roundNo, list);
  }

  const rounds: RoundSummary[] = reveals.map((reveal) => ({
    roundNo: reveal.round_no,
    exchange: movesByRound.get(reveal.round_no) ?? [],
    reveal,
    youLost: reveal.loser === mySeat,
    headline: roundHeadline(reveal, mySeat, opponent),
  }));

  // A walk-away's final reveal is a forfeit, not a real call — relabel it.
  const lastRound = rounds.at(-1);
  if (outcome === 'abandoned' && lastRound) {
    lastRound.headline = i18n.t('postmortem.headlineAbandoned');
  }

  const diceTaken = reveals.filter((r) => r.loser !== mySeat).length;
  const diceLost = reveals.filter((r) => r.loser === mySeat).length;
  const bluffsCaught = reveals.filter(
    (r) => r.caller === mySeat && !r.bid_met && r.loser !== mySeat,
  ).length;

  const last = reveals[reveals.length - 1];
  const finalCounts = last
    ? { yours: last.hands[mySeat].length, theirs: last.hands[mySeat === 'a' ? 'b' : 'a'].length }
    : { yours: 0, theirs: 0 };

  return {
    recap: recapLine(outcome, opponent, reveals.length, finalCounts),
    stats: [
      { label: i18n.t('autopsy.statRounds'), value: reveals.length },
      { label: i18n.t('autopsy.statDiceTaken'), value: diceTaken },
      { label: i18n.t('autopsy.statDiceLost'), value: diceLost },
      { label: i18n.t('autopsy.statBluffsCaught'), value: bluffsCaught },
    ],
    rounds,
  };
}
