/**
 * Regenerates the labeled SVG placeholders in src/assets/placeholders/.
 * Real art replaces these files 1:1 (same name, same viewBox aspect).
 *
 *   node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/assets/placeholders');
mkdirSync(outDir, { recursive: true });

const files = {};

function svg(name, w, h, body, label) {
  files[`${name}.svg`] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
${body}
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#8a6d3b" stroke-width="2" stroke-dasharray="10 6" opacity="0.6"/>
  <text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.max(14, Math.min(w, h) / 18)}" fill="#8a6d3b" opacity="0.85">${label}</text>
</svg>
`;
}

/* --- Backdrop: a wall (stands in for Sorcery!'s world map) --- */
{
  const bricks = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const off = row % 2 ? 90 : 0;
      bricks.push(
        `<rect x="${col * 180 + off - 90}" y="${row * 100}" width="172" height="92" rx="4" fill="#241d15" stroke="#17110b" stroke-width="3"/>`,
      );
    }
  }
  svg(
    'backdrop-wall',
    1600,
    1000,
    `<rect width="1600" height="1000" fill="#1c1610"/>\n${bricks.join('\n')}`,
    'PLACEHOLDER · backdrop.wall · tavern wall, parallax layer',
  );
}

/* --- Table foreground: wood planks --- */
{
  const planks = [];
  for (let i = 0; i < 5; i++) {
    planks.push(
      `<rect x="0" y="${i * 80}" width="1600" height="76" fill="${i % 2 ? '#3a2d20' : '#33271b'}"/>`,
      `<line x1="0" y1="${i * 80 + 78}" x2="1600" y2="${i * 80 + 78}" stroke="#1f1710" stroke-width="4"/>`,
    );
  }
  svg(
    'table-surface',
    1600,
    400,
    planks.join('\n'),
    'PLACEHOLDER · table.surface · foreground planks',
  );
}

/* --- NPC figures: 4 variants x 2 poses ---
 * Drawn edge-to-edge in the viewBox (head grazes the top, body meets both
 * sides and the bottom) so on-screen bounds match the layout box exactly. */
const npcTints = ['#6b625a', '#5d6b5a', '#5a606b', '#6b5a66'];
for (let v = 0; v < 4; v++) {
  const tint = npcTints[v];
  // Seated: head + hunched shoulders + folded arms at table edge.
  svg(
    `npc-variant-${v}-seated`,
    800,
    1000,
    `<ellipse cx="400" cy="175" rx="150" ry="175" fill="${tint}"/>
     <path d="M 0 1000 Q 25 470 400 395 Q 775 470 800 1000 Z" fill="${tint}"/>
     <path d="M 60 840 Q 400 660 740 840 L 740 1000 L 60 1000 Z" fill="#4c453e"/>
     <circle cx="345" cy="150" r="17" fill="#241d15"/>
     <circle cx="455" cy="150" r="17" fill="#241d15"/>
     <path d="M 340 255 Q 400 290 460 255" stroke="#241d15" stroke-width="12" fill="none"/>`,
    `PLACEHOLDER · npc.variant-${v}.seated`,
  );
  // Accusing: risen, arm thrown out toward the viewer.
  svg(
    `npc-variant-${v}-accusing`,
    800,
    1000,
    `<ellipse cx="450" cy="150" rx="140" ry="150" fill="${tint}"/>
     <path d="M 110 1000 Q 130 330 450 275 Q 790 330 800 1000 Z" fill="${tint}"/>
     <path d="M 300 430 Q 120 500 20 640 L 0 590 Q 110 420 285 375 Z" fill="${tint}"/>
     <circle cx="30" cy="625" r="42" fill="${tint}"/>
     <circle cx="400" cy="125" r="16" fill="#241d15"/>
     <circle cx="500" cy="125" r="16" fill="#241d15"/>
     <path d="M 390 230 Q 450 205 510 230" stroke="#241d15" stroke-width="12" fill="none"/>`,
    `PLACEHOLDER · npc.variant-${v}.accusing`,
  );
}

/* --- Player hand: cupped (hiding dice) and open (revealing) --- */
svg(
  'hand-cupped',
  600,
  420,
  `<path d="M 30 420 Q 20 220 140 150 Q 260 90 420 130 Q 560 170 580 300 L 580 420 Z" fill="#d9cbb2"/>
   <path d="M 140 150 Q 180 240 160 330 M 250 115 Q 290 220 270 330 M 360 115 Q 400 220 385 330 M 460 145 Q 500 240 480 340" stroke="#b3a180" stroke-width="12" fill="none"/>`,
  'PLACEHOLDER · hand.cupped',
);
svg(
  'hand-open',
  600,
  420,
  `<path d="M 30 420 Q 40 300 150 270 Q 280 230 430 260 Q 560 290 580 380 L 580 420 Z" fill="#d9cbb2"/>
   <path d="M 150 270 Q 170 320 165 380 M 260 250 Q 285 320 275 385 M 370 250 Q 400 320 390 390 M 470 275 Q 500 330 490 395" stroke="#b3a180" stroke-width="12" fill="none"/>`,
  'PLACEHOLDER · hand.open',
);

/* --- Dice: d4 renders, player (blue) and npc (red) colorways, faces 1-4 --- */
const pipLayouts = {
  1: [[100, 118]],
  2: [
    [78, 138],
    [122, 98],
  ],
  3: [
    [100, 88],
    [76, 140],
    [124, 140],
  ],
  4: [
    [78, 96],
    [122, 96],
    [78, 146],
    [122, 146],
  ],
};
// Puffy rounded-triangle d4s like the reference art: gradient body, side
// facet shading, speckled stone texture, dished pips with a catchlight.
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
       <ellipse cx="100" cy="180" rx="78" ry="12" fill="#000000" opacity="0.3"/>
       <path d="M 91 30 Q 100 14 109 30 L 183 156 Q 192 172 174 172 L 26 172 Q 8 172 17 156 Z"
             fill="url(#body)" stroke="${c.dark}" stroke-width="5" stroke-linejoin="round"/>
       <path d="M 109 30 L 183 156 Q 192 172 174 172 L 148 172 Q 160 96 104 34 Z"
             fill="${c.deep}" opacity="0.55"/>
       <path d="M 91 30 Q 100 14 109 30 L 116 42 Q 100 30 84 42 Z" fill="#ffffff" opacity="0.35"/>
       <path d="M 26 172 L 174 172" stroke="${c.dark}" stroke-width="7" opacity="0.5" stroke-linecap="round"/>
       ${speckles}
       ${pips}`,
      `die.${who}.${face}`,
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
    `pip.${who}`,
  );
}

/* --- Splash hero --- */
svg(
  'splash-title',
  1200,
  400,
  `<rect width="1200" height="400" fill="none"/>
   <text x="600" y="215" text-anchor="middle" font-family="Georgia, serif" font-size="120" fill="#f4efe4">SWINDLESTONES</text>
   <path d="M 300 270 L 900 270" stroke="#8a6d3b" stroke-width="4"/>
   <path d="M 560 60 L 585 105 L 535 105 Z" fill="#4a7fb5"/>
   <path d="M 640 60 L 665 105 L 615 105 Z" fill="#b54a55"/>`,
  'PLACEHOLDER · splash.title',
);

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content);
}
console.log(`Wrote ${Object.keys(files).length} placeholders to ${outDir}`);
