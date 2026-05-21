/* Mugtee AI Studio — Service Worker (PWA v1)
 *
 * Strategy:
 *  • Pre-cache a minimal offline shell on install.
 *  • Network-first for navigations (HTML) with offline fallback to /offline.
 *  • Cache-first for static assets under /icons/ and /_next/static/.
 *  • Never intercept API routes (/api/*) — they must hit the network.
 *  • Never intercept auth callbacks or Supabase requests.
 *  • Bumping CACHE_VERSION evicts stale caches automatically.
 */
const CACHE_VERSION = 'mugtee-pwa-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const OFFLINE_URL = '/offline';
const PRECACHE = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname === '/manifest.json';
}

function shouldBypass(url) {
  // Never touch API, auth callbacks, Supabase, PostHog, or AdSense
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname.startsWith('/auth/')) return true;
  if (url.hostname.includes('supabase')) return true;
  if (url.hostname.includes('posthog')) return true;
  if (url.hostname.includes('googlesyndication')) return true;
  if (url.hostname.includes('googleads')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (shouldBypass(url)) return;

  // Navigation requests → network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful HTML for offline replay
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets → cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached))
    );
  }
});
