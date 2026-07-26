const CACHE = 'rimoteka-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=20260724b',
  '/app.js?v=20260724b',
  '/reci.txt?v=20260717',
  '/definicije.json?v=228',
  '/logo-icon.png',
  '/favicon.ico'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Ne keširaj stranice sa query parametrima niti rime-za stranice
  const isStaticAsset = ASSETS.some(a => url.pathname === a || url.pathname.startsWith('/assets/'));
  const isApi = url.pathname.includes('/api/');
  const hasQuery = url.search.length > 0;
  const isRimePage = url.pathname.startsWith('/rime-za/');

  if (isApi || e.request.method !== 'GET') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (hasQuery || isRimePage) {
    // Network-first za dinamičke stranice
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first samo za statičke fajlove
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
