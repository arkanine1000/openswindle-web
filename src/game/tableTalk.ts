/**
 * Canned player table talk for the auto-talk toggle. Aggression scales with
 * the bid's quantity as a share of the dice still in play — three fours in a
 * twelve-die opener is small talk, in a four-die endgame it's a war cry.
 * Face never factors in: a same-count raise to a higher face doesn't change
 * the stakes, so it doesn't change the tone.
 */

import i18n from '../i18n';

export type TalkLevel = 0 | 1 | 2 | 3 | 4;

/** The mobile bid bubble's per-phrase character budget (English reference).
 * Kept for the corpus budget test; the corpus itself lives in the i18n
 * catalog now, one array-of-arrays per locale. */
export const MAX_TALK_LENGTH = 25;

/** The active locale's auto-talk corpus: 5 aggression levels × 16 phrases. */
export function talkPool(): readonly string[][] {
  return i18n.t('tableTalk', { returnObjects: true }) as unknown as string[][];
}

/** Which register a bid belongs to, by its share of the dice in play. */
export function talkLevel(quantity: number, diceInPlay: number): TalkLevel {
  const ratio = quantity / Math.max(diceInPlay, 1);
  if (ratio <= 0.25) return 0;
  if (ratio <= 0.4) return 1;
  if (ratio <= 0.55) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/* The phrase that actually shipped with the last bid — not mere previews —
 * so the table never hears the same line twice running. */
let lastUsed: string | null = null;

/** Record the phrase submitted with a bid; the next pick won't offer it. */
export function markTalkUsed(phrase: string): void {
  lastUsed = phrase;
}

/** A phrase for the level, drawn from the pool minus the last-used line. */
export function pickTalk(level: TalkLevel, random: () => number = Math.random): string {
  const phrases = talkPool()[level] ?? [];
  const pool = phrases.filter((phrase) => phrase !== lastUsed);
  const pick = pool.length ? pool : phrases;
  return pick[Math.floor(random() * pick.length) % pick.length] ?? '';
}
