/**
 * Service worker — keep cache version in sync with deploys that must bust old JS/CSS.
 * v3: network-first for /assets/* so new hashed bundles load immediately (fixes stale FSC UI).
 */
const CACHE_NAME = 'smart-quote-v3';
const STATIC_ASSETS = ['/manifest.json', '/icon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) return;

  // Hashed Vite bundles: always try network first so deploys take effect immediately.
  if (url.pathname.startsWith('/assets/') && /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Other static files (icons, etc.): stale-while-revalidate
  if (/\.(png|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // HTML / SPA navigation: network-only (avoid stale index shell referencing old chunks).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }
});
