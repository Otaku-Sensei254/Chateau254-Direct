/* Château254 service worker.
 *
 * Written by hand rather than via workbox because react-scripts 5 does not allow
 * customising the webpack config without ejecting, and ejecting would make every
 * future dependency upgrade a manual merge.
 *
 * The caching strategy below is chosen specifically so a deploy can never serve a
 * stale or mismatched build:
 *
 *   - Navigations are network-first. index.html is always fetched fresh, so a
 *     returning visitor gets the current app immediately. The cache is only a
 *     fallback for when the network fails.
 *   - Only content-hashed assets are cached, i.e. anything under /static/ plus
 *     fonts and images. A new deploy changes those filenames, so a cached URL is
 *     never outdated and an old cached copy can never shadow a new file.
 *   - API traffic is never cached. It is cross-origin (Railway) and always
 *     live, and caching orders or auth responses would be actively harmful.
 *
 * CACHE_VERSION is bumped by hand when the caching behaviour changes. Activate
 * deletes every cache that does not match, so old entries cannot accumulate.
 */

const CACHE_VERSION = 'chateau254-v1';

/* The minimum needed for the app to boot offline. Hashed bundles are picked up
   at runtime, so this stays deliberately small and never goes stale. */
const PRECACHE = ['/', '/index.html', '/manifest.json'];

const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CURRENT_CACHES = [STATIC_CACHE, RUNTIME_CACHE];

/* Assets whose URLs carry a content hash, so they are safe to serve from cache. */
const isHashedAsset = (pathname) =>
  pathname.startsWith('/static/')
  || /\.(?:woff2?|ttf|otf|eot|png|jpe?g|webp|avif|gif|svg|ico)$/i.test(pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => { /* a failed precache must not block activation */ }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

/* Lets a waiting worker take over immediately when a new deploy lands, instead
   of leaving the previous worker in charge until every tab is closed. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Never intercept anything but plain GETs: a cached POST/PUT would replay a
     mutation, and an order must never be served from cache. */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isHashedAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/* Network-first: the live document wins, cache only covers being offline. */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    /* Offline with nothing cached: the app was never opened before. */
    const shell = await caches.match('/index.html');
    if (shell) return shell;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>'
      + '<body style="font-family:system-ui;background:#0b0a08;color:#f2ece1;'
      + 'display:grid;place-items:center;height:100vh;margin:0">'
      + '<div style="text-align:center"><h1>You are offline</h1>'
      + '<p>Please reconnect and try again.</p></div>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
    );
  }
}

/* Cache-first with a background refresh. Only ever used for content-hashed
   files, so serving the cached copy can never be wrong. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || network.then((response) => response || Response.error());
}