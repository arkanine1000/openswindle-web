/** Deterministic per-slot jitter shared by both dice piles: a loose scatter,
 * not a parade, and identical between the player's hand and the opponent's
 * reveal so the two piles read as the same kind of object. */
export function dicePileStagger(i: number): { rotate: number; y: number } {
  return { rotate: ((i * 47) % 25) - 12, y: ((i * 31) % 9) - 2 };
}
