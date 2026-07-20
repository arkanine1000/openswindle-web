/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Everything worth having on a cold offline start: the shell, the hashed
 * bundles and fonts, the sprites, the icons. Excludes the worker itself,
 * sourcemaps, and the social card (a scraper's concern, not a player's). */
function shouldPrecache(path: string): boolean {
  if (path === 'sw.js' || path.endsWith('.map')) return false;
  if (path.startsWith('og-image')) return false;
  return true;
}

function filesIn(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesIn(full, root) : [relative(root, full)];
  });
}

/**
 * Rewrites the worker's inert dev defaults with the real build: the hashed
 * filenames Vite just emitted, and a cache name derived from them so a new
 * deploy always lands in a fresh cache and evicts the last one.
 */
function precacheServiceWorker(): Plugin {
  return {
    name: 'precache-service-worker',
    apply: 'build',
    closeBundle() {
      const outDir = 'dist';
      const swPath = join(outDir, 'sw.js');
      const assets = filesIn(outDir).filter(shouldPrecache).sort();
      const urls = ['/', ...assets.map((file) => `/${file}`)];
      const buildId = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12);

      const source = readFileSync(swPath, 'utf8');
      const rewritten = source
        .replace("const BUILD_ID = 'dev';", `const BUILD_ID = ${JSON.stringify(buildId)};`)
        .replace("const PRECACHE = ['/'];", `const PRECACHE = ${JSON.stringify(urls)};`);
      if (rewritten === source) {
        // A silent miss here ships a worker that never precaches anything.
        throw new Error('sw.js: BUILD_ID/PRECACHE markers not found — did the worker change?');
      }
      writeFileSync(swPath, rewritten);
    },
  };
}

export default defineConfig({
  plugins: [react(), precacheServiceWorker()],
  server: {
    // Not Vite's default 5173: another installed PWA there would share this
    // origin, and with it the service worker registration and storage.
    port: 5174,
    strictPort: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
