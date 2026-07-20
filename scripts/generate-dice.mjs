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

/* --- Dice: octahedron (d8) renders, player (blue) and npc (red) colorways.
 * Faces run 1-4 — each value sits on two of the eight faces, so the odds
 * match a d4. Drawn face-on: hexagonal silhouette, pips on the front
 * triangular face, the three visible neighbours shaded by light from the
 * upper left. Pip layouts live inside that front face. --- */
const pipLayouts = {
  1: [[100, 102]],
  2: [
    [80, 108],
    [120, 108],
  ],
  3: [
    [100, 68],
    [76, 116],
    [124, 116],
  ],
  // 4: one pip at the face's incenter, three equidistant satellites echoing
  // the face's own triangular symmetry (top, bottom-left, bottom-right).
  4: [
    [100, 102],
    [100, 66],
    [69, 120],
    [131, 120],
  ],
};
// Hexagon corners: T/LL/LR are the front face, UL/B/UR the back face's
// projected points.
const HEX = {
  T: '100 22',
  UR: '169 62',
  LR: '169 142',
  B: '100 182',
  LL: '31 142',
  UL: '31 62',
};
// Puffy stone look: gradient body, facet shading, speckled texture, dished
// pips with a catchlight.
const diceColors = {
  player: { light: '#6e9fce', mid: '#4a7fb5', deep: '#2f5f92', dark: '#1f4166' },
  npc: { light: '#c9707a', mid: '#b54a55', deep: '#8f2f3a', dark: '#611f27' },
};
const SPECKLES = [
  [72, 70],
  [128, 82],
  [96, 60],
  [60, 128],
  [142, 130],
  [104, 150],
  [82, 108],
  [120, 116],
];
for (const [who, c] of Object.entries(diceColors)) {
  for (let face = 1; face <= 4; face++) {
    const pips = pipLayouts[face]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="13" fill="#f6f2e7"/>
           <circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${c.dark}" stroke-opacity="0.4" stroke-width="2.5"/>
           <circle cx="${x - 4}" cy="${y - 4}" r="3.5" fill="#ffffff" opacity="0.85"/>`,
      )
      .join('\n');
    const speckles = SPECKLES.map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${1.6 + (i % 3) * 0.6}" fill="${i % 2 ? c.dark : '#f6f2e7'}" opacity="0.16"/>`,
    ).join('\n');
    svg(
      `die-${who}-${face}`,
      200,
      200,
      `<defs>
         <radialGradient id="body" cx="0.38" cy="0.3" r="1">
           <stop offset="0%" stop-color="${c.light}"/>
           <stop offset="55%" stop-color="${c.mid}"/>
           <stop offset="100%" stop-color="${c.deep}"/>
         </radialGradient>
       </defs>
       <ellipse cx="100" cy="188" rx="70" ry="10" fill="#000000" opacity="0.3"/>
       <path d="M ${HEX.T} L ${HEX.UR} L ${HEX.LR} L ${HEX.B} L ${HEX.LL} L ${HEX.UL} Z"
             fill="url(#body)" stroke="${c.dark}" stroke-width="5" stroke-linejoin="round"/>
       <path d="M ${HEX.T} L ${HEX.UL} L ${HEX.LL} Z" fill="#ffffff" opacity="0.12"/>
       <path d="M ${HEX.T} L ${HEX.UR} L ${HEX.LR} Z" fill="${c.deep}" opacity="0.55"/>
       <path d="M ${HEX.LL} L ${HEX.B} L ${HEX.LR} Z" fill="${c.dark}" opacity="0.5"/>
       <path d="M ${HEX.T} L ${HEX.LR} L ${HEX.LL} Z"
             fill="none" stroke="${c.dark}" stroke-width="3.5" opacity="0.8" stroke-linejoin="round"/>
       <path d="M 88 34 Q 100 22 112 34" stroke="#ffffff" stroke-width="6" opacity="0.35"
             fill="none" stroke-linecap="round"/>
       ${speckles}
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
