/** Presentation pacing, in ms. `?choreo=fast` (used by the e2e suite) and
 * prefers-reduced-motion both collapse the theatrical pauses. */

function speedFactor(): number {
  if (typeof window === 'undefined') return 1;
  if (new URLSearchParams(window.location.search).get('choreo') === 'fast') return 0.05;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0.3;
  return 1;
}

const factor = speedFactor();

export const PACING = {
  /** NPC bubble stays up before the next step (scaled by text length elsewhere). */
  npcBubbleMs: 1800 * factor,
  /** Extra reading time per character of table talk. */
  perCharMs: 18 * factor,
  /** Hands-open reveal linger. */
  revealMs: 3200 * factor,
  /** New round deal/roll. */
  roundStartMs: 1600 * factor,
  /** Beat between the final reveal and the WIN!/DEFEAT! card. */
  matchEndPauseMs: 1400 * factor,
  /** Dice tumble duration inside the roll animation. */
  diceRollMs: 900 * factor,
} as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
