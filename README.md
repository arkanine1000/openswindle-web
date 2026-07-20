# OpenSwindle Web

The web client for [**OpenSwindle**](https://github.com/arkanine1000/openswindle) — an
open-source re-implementation of **Swindlestones**, the dice bluffing game from inkle's
_Sorcery!_. That repo (also MIT) is the authoritative game server; this one renders the table:
your opponent across it, your dice cupped under your hand, and every bid and barb exchanged in
speech bubbles.

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

The dev server sits on 5174, not Vite's default, so an installed PWA on 5173 can't share this
origin's service worker and storage. The engine's default CORS origin matches.

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
  "thinks" out loud, which is exactly the window an LLM opponent needs.
- **Presentation state vs. authoritative state** (`game/store.ts`). The server view is applied
  between beats, never mid-play, so the HUD can't leak a round's outcome before its reveal has
  played.

Pacing collapses under `?choreo=fast` (used by the e2e suite) and shortens under
`prefers-reduced-motion`.

Smaller things that aren't obvious from a file listing:

- **Two layouts, one tree.** Below 768px `GameScreen` renders a different tree — one opponent
  bubble and a composer near your hand, the exchange living in the history drawer. It's a JS
  breakpoint rather than CSS visibility because mounting both would duplicate live test ids and
  inputs.
- **Art is never referenced by path.** Every graphic is a semantic slot in
  `src/assets/manifest.ts`, so swapping a placeholder for real art is a one-line change (or a
  1:1 file replacement at the same aspect). Stand-ins come from
  `node scripts/generate-placeholders.mjs`; the brand mark and every icon derivative come from
  `node scripts/generate-icons.mjs`.
- **Auto table talk** (`game/tableTalk.ts`) picks a canned line whose aggression tracks the
  bid's share of the dice still in play. Face is ignored — raising to a higher face at the same
  count doesn't raise the stakes.
- **Parallax by depth.** Scenery layers declare a distance from the player's eye and derive
  their drift from it, so retuning means changing a plausible distance rather than three magic
  pixel values.

### Installable

`public/manifest.webmanifest` and `public/sw.js` make the client installable and let the shell
open offline. The worker **never caches the engine** — a match is authoritative server state,
and a stale cached view would be a lie the player could act on. Its precache list is written at
build time by a plugin in `vite.config.ts` that knows the hashed filenames Vite emitted, so each
deploy lands in a fresh cache; it registers in production builds only, keeping it clear of HMR
and the e2e suite.

Known gap: reloading while _already offline_ serves the cached shell but its scripts don't
execute, so the app doesn't remount. Installing, launching, and online play are unaffected.

## CSS convention

- One `*.module.css` per component, camelCase class names, co-located.
- Every magic value (color, spacing, z-index, type size, duration) is a custom property in
  `src/styles/tokens.css`; modules consume `var()` only. Translucent uses of the accent go
  through `--color-accent-rgb` so they track the token instead of freezing a stale `rgba()`.
- `src/styles/global.css` stays tiny: reset, fonts, body, and the app-wide input affordances
  (no text selection or I-beam over scenery; typing fields and the autopsy's seed opt back in).
- Layer order is the documented `--z-*` scale in tokens — never a raw z-index.
- One breakpoint: mobile-first, `@media (min-width: 768px)` for the desktop spread.

## Testing

**Unit** (vitest, `tests/`) covers the pure logic: bid enumeration and the raise rule,
choreography sequencing for every response shape, transcript formatting, and the table-talk
dictionary.

**End-to-end** (Playwright, `e2e/`) boots the real engine from the sibling `../openswindle`
checkout in mock-LLM mode plus a Vite server, then plays real matches on desktop Chrome and
iPhone-class emulation — splash through match, reveal, result card and autopsy, including table
talk, the bid carousel, and walking away. Deals are salted server-side and can't be replayed, so
match tests are strategy loops rather than fixed scripts.

The suite runs on its own ports — engine 8001, client 5175 — so it can never adopt a running dev
pair. That matters: `reuseExistingServer` would otherwise pick up your dev server, which points
at the real LLM engine on :8000, burning tokens and making matches non-deterministic.

First run: `pnpm exec playwright install chromium`.

## Deployment

The client is a static bundle; the engine is a long-lived container that must be deployed first,
since the build needs its URL. See the [engine README][engine-deploy] for the Railway side.

**Client → Vercel**

- Framework preset **Vite**; build `pnpm build`, output `dist`.
- `VITE_API_BASE` — the engine's URL. It's read at **build** time and inlined, so changing it
  requires a redeploy, not just an env edit.
- No rewrite rules needed: the app is a single page with no client-side routing, and everything
  in `public/` already serves from the root, which the service worker's scope requires.

Then add the resulting Vercel domain — plus any preview domains you want playable — to the
engine's `OPENSWINDLE_CORS_ORIGINS` and redeploy the engine.

[engine-deploy]: https://github.com/arkanine1000/openswindle#deployment

## Attribution

Swindlestones comes from [inkle](https://www.inklestudios.com/)'s _Sorcery!_, itself built on
the gamebooks by **Steve Jackson**. This is an independent, unofficial re-implementation of the
game's rules that uses no assets, text, or code from their works — see the
[engine README](https://github.com/arkanine1000/openswindle#attribution) for the fuller note. If
you enjoy this game, play [Sorcery!](https://www.inklestudios.com/sorcery/) — it's wonderful.

## License

[MIT](LICENSE)
