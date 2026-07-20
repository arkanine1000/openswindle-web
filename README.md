# OpenSwindle Web

The web client for [**OpenSwindle**](https://github.com/arkanine1000/openswindle) — an
open-source re-implementation of **Swindlestones**, the dice bluffing game from inkle's
_Sorcery!_. That repo is the authoritative game server (dealing, adjudication, cryptographic
fairness proofs, LLM opponents) and is also MIT; this client renders the table: your opponent
across it, your dice cupped under your hand, and every bid and barb exchanged in speech
bubbles.

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:5174
```

The client expects the engine running locally (defaults to `http://localhost:8000`):

```bash
# in the openswindle repo
uv run uvicorn openswindle.api:app --reload
```

Offline development without an LLM key: set `OPENSWINDLE_MOCK_LLM=true` in the engine's `.env`
to play against the deterministic scripted policy (or pick "Scripted (practice)" under _Choose
your opponent_ on the splash screen).

Point the client at a deployed engine with `VITE_API_BASE`:

```bash
VITE_API_BASE=https://your-engine.example pnpm build
```

> The dev server sits on **5174**, not Vite's default 5173, so an installed PWA on that origin
> can't share this one's service worker and storage. The engine's default
> `OPENSWINDLE_CORS_ORIGINS` matches.

## Scripts

| Command                     | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                  | Vite dev server (port 5174)                                 |
| `pnpm build`                | Type-check + production build                               |
| `pnpm preview`              | Serve the production build                                  |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                           |
| `pnpm test`                 | Unit tests (vitest)                                         |
| `pnpm e2e`                  | Playwright end-to-end suite (boots the engine in mock mode) |

## How the client is put together

```
public/         favicon, PWA manifest, service worker, social card (served at the root)
scripts/        generate-placeholders.mjs (art stand-ins), generate-icons.mjs (brand mark)
src/
  api/          types.ts (wire contract), client.ts (fetch wrapper)
  game/         pure logic: bids, transcript, choreography, pacing, tableTalk, store
  assets/       manifest.ts (semantic slots) + placeholders/ (art files)
  components/
    scene/      TableScene layers: backdrop, NPC figure, table, hand, dice
    bubbles/    speech bubbles, thinking filler, bid carousel, player composer
    hud/        dice-count pips, history sheet
    screens/    splash, game, result, autopsy
  styles/       tokens.css (all design tokens), global.css (reset + input affordances)
```

Two ideas carry the architecture:

- **The choreography queue** (`game/choreography.ts`). `POST /moves` is synchronous and returns
  everything the opponent did before it's your turn again — possibly a call, the round reveal,
  and their opening bid of the next round. The response is converted into an ordered list of
  presentation steps that the store plays out with paced delays. Sequencing is correct by
  construction and unit-testable without a DOM. While the request is in flight the opponent
  "thinks" out loud (rotating filler chatter), which is exactly the window an LLM opponent
  needs.
- **Presentation state vs. authoritative state** (`game/store.ts`). The server view is applied
  between beats, never mid-play, so the HUD can't leak a round's outcome before its reveal has
  played.

Pacing collapses under `?choreo=fast` (used by the e2e suite) and shortens under
`prefers-reduced-motion`; `motion`'s animations also respect the user's reduced-motion setting.

### Two layouts, one component tree

Desktop keeps a rolling three-bubble conversation column between the players. Mobile has no room
for it, so `GameScreen` renders a different tree below 768px: the opponent's latest utterance
alone, right-aligned with its tail pointing up at the figure, and the bid composer dropped near
your hand. The full exchange lives in the history drawer — swipe down from anywhere, or use the
tab in the top bar. The split is a JS breakpoint rather than CSS visibility because mounting both
would duplicate live test ids and input elements.

### Table talk

You can type a line to send with any bid, or hand it over: the speech-bubble toggle left of the
input picks from a canned dictionary (`game/tableTalk.ts`). Aggression tracks the bid's share of
the dice still in play — small talk on a low opener, taunts near the top — and the phrase that
shipped with your last bid is never offered again. Face is ignored: raising to a higher face at
the same count doesn't raise the stakes, so it doesn't change the tone. The preference persists
in `localStorage`.

### Depth

Scenery layers declare a rough distance from the player's eye and derive their pointer parallax
from it, so the wall sweeps, the opponent drifts less, the table barely stirs, and your own hands
never move. Retuning means changing a plausible distance, not three magic pixel values.

## Replacing placeholder art

Every graphic is a **semantic slot** resolved through `src/assets/manifest.ts` — components
never hardcode a path. Remaining stand-ins are labeled SVGs from
`node scripts/generate-placeholders.mjs`. To slot in real art, replace the file 1:1 (same name,
same aspect ratio) or repoint one line in the manifest.

| Slot                           | File(s)                                                    | Notes                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backdrop.wall`                | `backdrop-wall.webp`                                       | Parallax layer behind everything (16:10)                                                                                                                                    |
| `table.surface`                | `table-surface.webp`                                       | Foreground planks strip (4:1)                                                                                                                                               |
| `npcVariants[0..3]`            | `npc-variant-0-seated.webp`, `npc-variant-0-accusing.webp` | Pose pair, 800×1000, hands' contact line on the bottom edge — the scene anchors that edge to the table. Variant 0 stands in for all four seats until its siblings are drawn |
| `hand.cupped` / `hand.open`    | `hand-cupped.webp`                                         | Player hand overlay (10:7). One asset serves both states: the reveal slides it off-screen rather than opening the palm                                                      |
| `dice.player.*` / `dice.npc.*` | `die-player-N.svg`, `die-npc-N.svg`                        | Octahedra seen face-on, values 1–4 in two colorways (square). Each value sits on two of the eight faces, so the odds match a d4                                             |
| `pips.*`                       | `pip-player.svg`, `pip-npc.svg`, `pip-lost.svg`            | Dice-count gems in the top bar (square)                                                                                                                                     |
| `brand.mark`                   | `public/icon.svg`                                          | The splash logo. The one slot served from `public/` rather than imported — the favicon and web manifest need it at a stable, unhashed URL                                   |

The splash title is live type, not art; there is no hero image to replace.

## Brand mark, icons and the PWA

`node scripts/generate-icons.mjs` draws the mark — the game's own die, from the same octahedron
geometry as the in-game dice, so icon and table can't drift — and writes every derivative into
`public/`: the SVG favicon, PNGs at 192/512/maskable-512/180, and the 1200×630 social card. PNGs
are rasterized with `rsvg-convert` when it's installed; the committed copies are the build
inputs, so a machine without it can still build.

The app is installable. `public/manifest.webmanifest` carries the icons and metadata, and
`public/sw.js` keeps the shell openable offline. Two things worth knowing:

- **The worker never caches the engine.** A match is authoritative server state, and a stale
  cached view would be a lie the player could act on. Cross-origin requests pass straight
  through.
- **Its precache list is written at build time** by a small plugin in `vite.config.ts`, which
  knows the hashed filenames Vite emitted and derives the cache name from them — so each deploy
  lands in a fresh cache and evicts the last. The worker registers in production builds only,
  keeping it clear of HMR and the e2e suite.

Known gap: reloading while _already offline_ serves the cached shell but its scripts don't
execute, so the app doesn't remount. Installing, launching, and online play are unaffected.

## CSS convention

- One `*.module.css` per component, camelCase class names, co-located.
- Every magic value (color, spacing, z-index, type size, duration) is a custom property in
  `src/styles/tokens.css`; modules consume `var()` only. Translucent uses of the accent go
  through `--color-accent-rgb` so they track the token instead of freezing a stale `rgba()`.
- `src/styles/global.css` stays tiny: reset, fonts, body, and the app-wide input affordances
  (no text selection or I-beam over scenery; typing fields and the autopsy's seed opt back in).
  Anything else almost certainly belongs in a module.
- Layer order is the documented `--z-*` scale in tokens — never a raw z-index.
- One breakpoint: mobile-first, `@media (min-width: 768px)` for the desktop spread.

## Testing

**Unit (vitest, `tests/`)** — the pure game logic: bid enumeration and the raise rule,
choreography sequencing for every response shape (counter-bid, call, match end, abort),
transcript formatting, and the table-talk dictionary (register thresholds, no-repeat guard,
phrase length budget). `pnpm test`.

**End-to-end (Playwright, `e2e/`)** — `pnpm e2e` boots the real engine from the sibling
`../openswindle` checkout with `OPENSWINDLE_MOCK_LLM=true` (deterministic, offline, no key) plus
a Vite server, then plays real matches in two projects: desktop Chrome (1280×800) and
iPhone-class mobile emulation. Covered: the splash controls, a full match from sit-down through
the WIN/DEFEAT card to the autopsy report, table talk riding along with a move into the history
sheet, carousel arming/submitting, ghosted (impossible) bids staying inert, and walking away
mid-match. Deals are salted server-side and can't be replayed, so match tests are strategy
loops rather than fixed move scripts. Screenshots of key screens land in
`test-results/screens/`.

The suite runs on its own ports — engine **8001**, client **5175** — so it can never adopt a
running dev pair. That matters: `reuseExistingServer` would otherwise pick up your dev server,
which points at the real LLM engine on :8000, burning tokens and making matches
non-deterministic.

First run: `pnpm exec playwright install chromium`.

## Deployment

The client is a static bundle and the engine is a long-lived container. They need each other's
origins, so deploy the engine first.

### Engine → Railway

A persistent container is what makes the in-memory match store viable: state survives between
turns without Redis. **Do not** use serverless or edge runtimes — a cold start drops every match
in flight.

- Start command: `uvicorn openswindle.api:app --host 0.0.0.0 --port $PORT`
- `OPENROUTER_API_KEY` — the LLM opponent's key.
- `OPENSWINDLE_LLM_EXTRA_BODY` — containers have no `.env`, so set the reasoning-off value
  explicitly (see the engine's `.env.example`); it's cheaper, faster to first token, and makes a
  beatable opponent.
- `OPENSWINDLE_CORS_ORIGINS` — the client's origin. Fill this in after the first Vercel deploy,
  then redeploy.

### Client → Vercel

- Framework preset **Vite**; build `pnpm build`, output `dist`.
- `VITE_API_BASE` — the Railway URL, e.g. `https://your-app.up.railway.app`. It is read at
  **build** time and inlined, so changing it requires a redeploy, not just an env edit.
- No rewrite rules needed: the app is a single page with no client-side routing, and everything
  in `public/` (manifest, service worker, icons) is already served from the root, which the
  worker's scope requires.

Then add the resulting Vercel domain — plus any preview domains you want playable — to the
engine's `OPENSWINDLE_CORS_ORIGINS` and redeploy the engine.

## Attribution

Swindlestones comes from [inkle](https://www.inklestudios.com/)'s _Sorcery!_ video-game series,
itself built on the _Sorcery!_ gamebooks by **Steve Jackson**. This project is an independent,
unofficial re-implementation of the game's rules, made with affection for both; it uses no
assets, text, or code from their works. If you enjoy this game, play
[Sorcery!](https://www.inklestudios.com/sorcery/) — it's wonderful.

## License

[MIT](LICENSE)
