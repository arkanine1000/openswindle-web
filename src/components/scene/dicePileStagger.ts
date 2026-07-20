/* Per-slot jitter shared by both dice piles — the player's hand and the
 * opponent's reveal — so the two read as the same kind of object.
 *
 * Explicit tables rather than a modulus: any (i * n) % m walks in equal
 * steps until it wraps, which lines the pile up into the staircase this is
 * meant to avoid. Each die sits on the opposite side of the resting line
 * from its neighbour, by a different amount. Six entries covers the longest
 * match (6 dice apiece); longer piles cycle. */
const LIFT_PX = [-9, 7, -12, 5, -6, 11];
const TILT_DEG = [-11, 6, 2, -7, 12, -3];

export function dicePileStagger(i: number): { rotate: number; y: number } {
  return { rotate: TILT_DEG[i % TILT_DEG.length]!, y: LIFT_PX[i % LIFT_PX.length]! };
}
