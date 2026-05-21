// Service Worker — dynamic route so it ships in standalone builds.
// Served at: https://mugtee.in/sw.js with the required JS MIME type and scope header.
//
// Behaviour matches the previous public/sw.js exactly:
//   • precache offline shell
//   • network-first for navigations with /offline fallback
//   • cache-first for /_next/static + /icons
//   • bypass /api/*, /auth/*, Supabase, PostHog, AdSense
import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = false

const SW = `/* Mugtee AI Studio — Service Worker (PWA v1) */
const CACHE_VERSION = 'mugtee-pwa-v1';
const STATIC_CACHE  = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';
const OFFLINE_URL = '/offline';
const PRECACHE = ['/offline','/manifest.json','/icons/icon-192.png','/icons/icon-512.png','/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE).catch(()=>{})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json';
}
function shouldBypass(url) {
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
  let url; try { url = new URL(req.url); } catch { return; }
  if (shouldBypass(url)) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(() => cached))
    );
  }
});
`

export async function GET() {
  return new NextResponse(SW, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
