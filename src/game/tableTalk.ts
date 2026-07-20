/**
 * Canned player table talk for the auto-talk toggle. Aggression scales with
 * the bid's quantity as a share of the dice still in play — three fours in a
 * twelve-die opener is small talk, in a four-die endgame it's a war cry.
 * Face never factors in: a same-count raise to a higher face doesn't change
 * the stakes, so it doesn't change the tone.
 */

export type TalkLevel = 0 | 1 | 2 | 3 | 4;

/** Eight short phrases per level, small talk through open taunting. */
export const TABLE_TALK: readonly (readonly string[])[] = [
  [
    'Cold night for dice.',
    'Watered ale, this.',
    'Easy start.',
    'The night is long.',
    'A gentle opening, nothing more.',
    'Barely worth the breath, this one.',
    'Warm fire, low stakes.',
    "We're just getting acquainted.",
  ],
  [
    'Just feeling the table.',
    'A friendly wager.',
    'Nothing reckless. Yet.',
    'Follow me up?',
    "Let's see what you're made of.",
    'A little pressure on the seams.',
    "I've thrown bolder in my sleep.",
    'Your move. Make it interesting.',
  ],
  [
    'The stones favour me.',
    'Start counting.',
    'Match that.',
    'You look pale, friend.',
    "I'd fold now, while it's cheap.",
    'The odds lean my way, and you know it.',
    'That twitch of yours says plenty.',
    'Getting steep for you, is it?',
  ],
  [
    'Push back, if you dare.',
    'Your luck thins.',
    'I smell doubt.',
    'Count and weep.',
    "You've followed me too far already.",
    'One more step and you drown.',
    "Bold words won't save your stones.",
    "I've buried better players than you.",
  ],
  [
    "You're bluffing.",
    'This is where you break.',
    'Call it, coward.',
    'No nerve for it.',
    'Every stone on the table says you fold.',
    'Look me in the eye and call it.',
    'This ends with your cup empty.',
    "Pray, if that's your habit.",
  ],
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

/* The phrase that actually shipped with the last bid — not mere previews —
 * so the table never hears the same line twice running. */
let lastUsed: string | null = null;

/** Record the phrase submitted with a bid; the next pick won't offer it. */
export function markTalkUsed(phrase: string): void {
  lastUsed = phrase;
}

/** A phrase for the level, drawn from the pool minus the last-used line. */
export function pickTalk(level: TalkLevel, random: () => number = Math.random): string {
  const pool = TABLE_TALK[level]!.filter((phrase) => phrase !== lastUsed);
  return pool[Math.floor(random() * pool.length) % pool.length]!;
}
