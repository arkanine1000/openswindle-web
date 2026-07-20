/**
 * Canned player table talk for the auto-talk toggle. Aggression scales with
 * the bid's quantity as a share of the dice still in play — three fours in a
 * twelve-die opener is small talk, in a four-die endgame it's a war cry.
 * Face never factors in: a same-count raise to a higher face doesn't change
 * the stakes, so it doesn't change the tone.
 */

export type TalkLevel = 0 | 1 | 2 | 3 | 4;

/** Four-plus short phrases per level, small talk through open taunting. */
export const TABLE_TALK: readonly (readonly string[])[] = [
  ['Cold night for dice.', 'Watered ale, this.', 'Easy start.', 'The night is long.'],
  ['Just feeling the table.', 'A friendly wager.', 'Nothing reckless. Yet.', 'Follow me up?'],
  ['The stones favour me.', 'Start counting.', 'Match that.', 'You look pale, friend.'],
  ['Push back, if you dare.', 'Your luck thins.', 'I smell doubt.', 'Count and weep.'],
  ["You're bluffing.", 'This is where you break.', 'Call it, coward.', 'No nerve for it.'],
];

/** Which register a bid belongs to, by its share of the dice in play. */
export function talkLevel(quantity: number, diceInPlay: number): TalkLevel {
  const ratio = quantity / Math.max(diceInPlay, 1);
  if (ratio <= 0.25) return 0;
  if (ratio <= 0.4) return 1;
  if (ratio <= 0.55) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/* Remembered across picks so the same line never lands twice in a row. */
const lastPick: Partial<Record<TalkLevel, number>> = {};

/** A phrase for the level, never the one used last time at that level. */
export function pickTalk(level: TalkLevel, random: () => number = Math.random): string {
  const phrases = TABLE_TALK[level]!;
  let index = Math.floor(random() * phrases.length) % phrases.length;
  if (index === lastPick[level]) index = (index + 1) % phrases.length;
  lastPick[level] = index;
  return phrases[index]!;
}
