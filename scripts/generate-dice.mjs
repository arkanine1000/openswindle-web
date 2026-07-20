/**
 * Regenerates the dice faces and the HUD's dice-count pips into
 * src/assets/placeholders/. These started as stand-ins and stayed: they are
 * the shipping art, so nothing here is labelled or boxed.
 *
 *   node scripts/generate-dice.mjs
 *
 * The scene's other art (backdrop, table, opponent, hand) is hand-drawn and
 * lives beside these as .webp — this script must never emit those names, or
 * a run would bury them.
 *
 * Drawn to sit with that ink-and-wash art rather than beside it: flat fills
 * instead of gradients, a heavy outline on a hexagon whose edges bow and
 * whose corners sit slightly off-true, cross-hatching where a render would
 * put a shadow, and pips with a real ink ring instead of a specular dot.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/assets/placeholders');
mkdirSync(outDir, { recursive: true });

const files = {};

function svg(name, w, h, body) {
  files[`${name}.svg`] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
${body}
</svg>
`;
}

/* --- Dice: octahedron (d8) seen face-on, player (blue) and npc (red).
 * Values run 1-4 — each sits on two of the eight faces, so the odds match a
 * d4. Pips live on the front triangular face; the two facets away from the
 * light are hatched, the one toward it stays clear. --- */
const INK = '#151310';

// Hand-drawn hexagon: bowed edges, corners a pixel or two off true.
const OUTLINE = `M 100 20
  Q 137 40 169 62
  Q 172 103 167 144
  Q 134 164 100 184
  Q 66 163 32 142
  Q 30 102 33 61
  Q 67 41 100 20 Z`;
const FRONT = 'M 100 20 Q 134 82 167 144 Q 100 145 33 142 Q 66 81 100 20 Z';
const RIGHT = 'M 100 20 Q 137 40 169 62 L 167 144 Q 134 82 100 20 Z';
const LEFT = 'M 100 20 Q 67 41 33 61 L 32 142 Q 66 81 100 20 Z';
const BOTTOM = 'M 33 142 Q 100 145 167 144 L 100 184 Z';

// Pip positions within the front face. The 4 is one pip at the incenter with
// three equidistant satellites, echoing the face's own symmetry.
const pipLayouts = {
  1: [[100, 104]],
  // The 2 stacks vertically, sitting high: the front face narrows toward its
  // apex, so the pair reads centred well above the arithmetic centre.
  2: [
    [100, 74],
    [100, 118],
  ],
  3: [
    [100, 70],
    [76, 118],
    [124, 118],
  ],
  4: [
    [100, 104],
    [100, 68],
    [69, 122],
    [131, 122],
  ],
};

const diceColors = {
  player: { front: '#4a7fb5', right: '#2f5f92', bottom: '#24507d', left: '#6e9fce' },
  npc: { front: '#b54a55', right: '#8f2f3a', bottom: '#75252f', left: '#c9707a' },
};

for (const [who, c] of Object.entries(diceColors)) {
  for (let face = 1; face <= 4; face++) {
    const pips = pipLayouts[face]
      .map(
        ([x, y], i) => `
    <circle cx="${x}" cy="${y}" r="14" fill="#f6f2e7" stroke="${INK}" stroke-width="3"/>
    <path d="M ${x - 9} ${y + 7} a 11 11 0 0 0 ${18 - i} -1" fill="none" stroke="${INK}"
          stroke-width="2" opacity="0.5" stroke-linecap="round"/>`,
      )
      .join('');

    svg(
      `die-${who}-${face}`,
      200,
      200,
      `  <defs>
    <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="${INK}" stroke-width="1.8" opacity="0.45"/>
    </pattern>
    <pattern id="hatchDeep" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="${INK}" stroke-width="1.8" opacity="0.5"/>
    </pattern>
  </defs>

  <!-- No shadow here: the viewBox leaves only ~16px below the die, and the
       6px outline eats most of that. It lives in Die.module.css instead,
       where a CSS filter can paint outside the element's box. -->
  <path d="${OUTLINE}" fill="${c.front}"/>
  <path d="${LEFT}" fill="${c.left}"/>
  <path d="${RIGHT}" fill="${c.right}"/>
  <path d="${RIGHT}" fill="url(#hatch)"/>
  <path d="${BOTTOM}" fill="${c.bottom}"/>
  <path d="${BOTTOM}" fill="url(#hatchDeep)"/>
  <path d="${FRONT}" fill="${c.front}"/>

  <!-- A few strokes of form on the lit face, in place of a gradient. -->
  <path d="M 52 132 q 12 -22 24 -44 M 62 137 q 10 -18 20 -36" stroke="${INK}" stroke-width="1.8"
        opacity="0.28" fill="none" stroke-linecap="round"/>

  <path d="${FRONT}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="${OUTLINE}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  ${pips}`,
    );
  }
}

/* --- HUD pips: dice-count gems --- */
const gemColors = { player: '#4a7fb5', npc: '#b54a55', lost: '#2b2b2b' };
for (const [who, fill] of Object.entries(gemColors)) {
  svg(
    `pip-${who}`,
    80,
    80,
    `<path d="M 40 6 L 72 30 L 60 72 L 20 72 L 8 30 Z" fill="${fill}" stroke="#17130e" stroke-width="4" stroke-linejoin="round"/>
     <path d="M 40 6 L 40 40 L 8 30 M 40 40 L 72 30 M 40 40 L 60 72 M 40 40 L 20 72" stroke="#17130e" stroke-width="2" opacity="0.4" fill="none"/>`,
  );
}

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content);
}
console.log(`Wrote ${Object.keys(files).length} dice and pip files to ${outDir}`);
