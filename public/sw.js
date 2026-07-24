const CACHE = 'rimoteka-v1';
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
  // Network-first za API/pretrage, cache-first za statičke fajlove
  if (e.request.url.includes('/api/') || e.request.method !== 'GET') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
