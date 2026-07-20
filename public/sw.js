/*
 * Minimal service worker: enough to make the client installable and to let
 * the shell open offline. It deliberately does not touch the engine — a
 * match is authoritative server state, and a stale cached view would be a
 * lie the player can act on.
 *
 * BUILD_ID and PRECACHE are rewritten by the precacheServiceWorker plugin in
 * vite.config.ts, which knows the hashed filenames Vite emitted. Without
 * that precache the shell would only survive offline from the *second*
 * visit, since the worker registers after the first page has already loaded.
 * The values below are the inert dev defaults; the worker is registered in
 * production builds only.
 */
const BUILD_ID = 'dev';
const PRECACHE = ['/'];

const CACHE = `openswindle-${BUILD_ID}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Tolerant of individual misses: one 404 must not cost us the shell.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Cross-origin (the engine lives elsewhere in production) stays untouched.
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, falling back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('/', response.clone());
          return response;
        } catch {
          const cached = await caches.match('/');
          if (cached) return cached;
          throw new Error('offline and no cached shell');
        }
      })(),
    );
    return;
  }

  // Static assets: serve from cache, refreshing in the background.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const network = fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);
      const response = cached ?? (await network);
      if (!response) throw new Error(`offline and uncached: ${url.pathname}`);
      return response;
    })(),
  );
});
