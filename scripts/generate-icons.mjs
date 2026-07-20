/**
 * Regenerates the brand mark in public/: favicon, PWA icons and the social
 * card. The mark is the game's own die — a d4-valued octahedron in the
 * player's blue — drawn with the same geometry as the in-game dice so the
 * icon and the table never drift apart.
 *
 *   node scripts/generate-icons.mjs
 *
 * PNGs are rasterized with rsvg-convert when it is installed; the committed
 * copies in public/ are the build inputs, so a machine without it can still
 * build the app.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../public');
mkdirSync(publicDir, { recursive: true });

const BACKDROP = '#17130e';
const C = { light: '#6e9fce', mid: '#4a7fb5', deep: '#2f5f92', dark: '#1f4166' };

/* Octahedron seen face-on, in a 200x200 box — the same hexagon corners and
 * four-pip layout the placeholder dice use. */
const HEX = {
  T: '100 22',
  UR: '169 62',
  LR: '169 142',
  B: '100 182',
  LL: '31 142',
  UL: '31 62',
};
const PIPS = [
  [100, 102],
  [100, 66],
  [69, 120],
  [131, 120],
];

function die() {
  const pips = PIPS.map(
    ([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#f6f2e7"/>
       <circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${C.dark}" stroke-opacity="0.4" stroke-width="2.5"/>
       <circle cx="${x - 4}" cy="${y - 4}" r="3.5" fill="#ffffff" opacity="0.85"/>`,
  ).join('\n');
  return `<path d="M ${HEX.T} L ${HEX.UR} L ${HEX.LR} L ${HEX.B} L ${HEX.LL} L ${HEX.UL} Z"
        fill="url(#body)" stroke="${C.dark}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M ${HEX.T} L ${HEX.UL} L ${HEX.LL} Z" fill="#ffffff" opacity="0.12"/>
  <path d="M ${HEX.T} L ${HEX.UR} L ${HEX.LR} Z" fill="${C.deep}" opacity="0.55"/>
  <path d="M ${HEX.LL} L ${HEX.B} L ${HEX.LR} Z" fill="${C.dark}" opacity="0.5"/>
  <path d="M ${HEX.T} L ${HEX.LR} L ${HEX.LL} Z"
        fill="none" stroke="${C.dark}" stroke-width="3.5" opacity="0.8" stroke-linejoin="round"/>
  <path d="M 88 34 Q 100 22 112 34" stroke="#ffffff" stroke-width="6" opacity="0.35"
        fill="none" stroke-linecap="round"/>
  ${pips}`;
}

const GRADIENT = `<radialGradient id="body" cx="0.38" cy="0.3" r="1">
      <stop offset="0%" stop-color="${C.light}"/>
      <stop offset="55%" stop-color="${C.mid}"/>
      <stop offset="100%" stop-color="${C.deep}"/>
    </radialGradient>`;

/**
 * @param coverage fraction of the canvas the die spans. Maskable icons keep
 *   it inside the platform's safe zone; the plain favicon runs close to full
 *   bleed so it stays legible at 16px.
 */
function icon({ size = 512, coverage = 0.82, background = null }) {
  // The die's own ink spans 31..169 horizontally and 22..182 vertically.
  const artW = 138;
  const artH = 160;
  const scale = (size * coverage) / Math.max(artW, artH);
  const x = (size - artW * scale) / 2 - 31 * scale;
  const y = (size - artH * scale) / 2 - 22 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    ${GRADIENT}
  </defs>
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">
    ${die()}
  </g>
</svg>
`;
}

/** 1200x630 social card: the mark beside the title, on the table's dark. */
function socialCard() {
  const scale = 2.2;
  const x = 250 - 100 * scale;
  const y = 315 - 102 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    ${GRADIENT}
  </defs>
  <rect width="1200" height="630" fill="${BACKDROP}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})">
    ${die()}
  </g>
  <text x="440" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="86" fill="#f4efe4">OpenSwindle</text>
  <text x="440" y="368" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-style="italic" fill="#f4efe4" opacity="0.7">A game of dice and lies.</text>
  <path d="M 440 410 L 1030 410" stroke="#e3b23c" stroke-width="3"/>
</svg>
`;
}

const svgs = {
  // Transparent: browser tabs supply their own light or dark backing.
  'icon.svg': icon({ size: 512, coverage: 0.92 }),
  'icon-opaque.svg': icon({ size: 512, coverage: 0.82, background: BACKDROP }),
  // Platform masks crop to a circle or squircle — stay inside the safe zone.
  'icon-maskable.svg': icon({ size: 512, coverage: 0.6, background: BACKDROP }),
  'og-image.svg': socialCard(),
};

for (const [name, content] of Object.entries(svgs)) {
  writeFileSync(join(publicDir, name), content);
}

/* Raster copies for the manifest, iOS home screens and social scrapers,
 * none of which accept SVG reliably. */
const rasters = [
  ['icon-opaque.svg', 'icon-192.png', 192, 192],
  ['icon-opaque.svg', 'icon-512.png', 512, 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512, 512],
  ['icon-opaque.svg', 'apple-touch-icon.png', 180, 180],
  ['og-image.svg', 'og-image.png', 1200, 630],
];

try {
  for (const [from, to, w, h] of rasters) {
    execFileSync('rsvg-convert', [
      '-w', String(w), '-h', String(h),
      join(publicDir, from), '-o', join(publicDir, to),
    ]);
  }
  console.log(`Wrote ${Object.keys(svgs).length} SVGs and ${rasters.length} PNGs to ${publicDir}`);
} catch {
  console.warn(
    `Wrote ${Object.keys(svgs).length} SVGs to ${publicDir}.\n` +
      'rsvg-convert not found — the committed PNGs were left untouched.',
  );
}
