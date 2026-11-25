const CACHE_NAME = 'anyfreebook-v5'; // bumped: drops saved pages, which could outlive the scripts they need
const OFFLINE_FALLBACK = '/offline.html';
const PRECACHE = [
  OFFLINE_FALLBACK,
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // allSettled: one unreachable file must not abort the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/offline.html' ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|mjs)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin (Supabase, book APIs, ads) or API/auth routes
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Static, hashed assets: cache-first (they're immutable)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          (cached && !(cached.headers.get('content-type') || '').includes('text/html') ? cached : null) ||
          fetch(request).then((response) => {
            // Only cache a real asset: an HTML error page served for a stale
            // script URL must never be stored, or that script stays broken forever.
            const type = response.headers.get('content-type') || '';
            if (response.ok && !type.includes('text/html')) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Pages: always from the network, so they match the current build. Offline gets a clear
  // offline page. Everything else (including the router's data requests) is left to the
  // browser: answering those with a saved page or a placeholder breaks navigation.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_FALLBACK).then(
        (cached) =>
          cached ||
          new Response('<!doctype html><meta name=viewport content="width=device-width"><title>Offline</title><p style="font:16px system-ui;padding:24px">You are offline. <a href="">Try again</a></p>', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
      )
    )
  );
});
