/* Pak Tax Calculator — minimal, safe service worker.
 *
 * Strategy:
 *   - HTML pages : network-first (you always serve fresh tax rates),
 *                  cached copy only as an offline fallback.
 *   - Static files: stale-while-revalidate (fast repeat loads).
 *   - Never caches: POST/non-GET, cross-origin, admin, query-string pages.
 *
 * KILL SWITCH: if anything ever goes wrong, replace this whole file with
 *   self.addEventListener('install', () => self.skipWaiting());
 *   self.addEventListener('activate', (e) => e.waitUntil(
 *     caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))
 *       .then(() => self.registration.unregister())
 *   ));
 * and every visitor unregisters on their next visit.
 */

const VERSION     = 'ptc-v1';
const PAGE_CACHE  = VERSION + '-pages';
const ASSET_CACHE = VERSION + '-assets';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then((c) => c.addAll([OFFLINE_URL]))
      .catch(() => {})            // missing offline.html must not break install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\.(?:css|js|woff2?|ttf|png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname);
}

function isCacheableDocument(url) {
  if (url.search) return false;                       // don't cache filtered/param'd pages
  return !/^\/(wp-admin|wp-login|wp-json|cart|checkout|my-account)/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;    // let the network handle third parties

  // ---- HTML navigations: network first ----
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && isCacheableDocument(url)) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // ---- static assets: stale-while-revalidate ----
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || network;
      })
    );
  }
});
