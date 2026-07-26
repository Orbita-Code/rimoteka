/* ====================== SERVICE WORKER ======================
 * Pravila (naučeno na incidentu 26.07.2026, kad je polomljena verzija
 * ostala zaglavljena u kešu korisnicima):
 *
 * 1. HTML (`/`, `/index.html`) NIKAD ne ide cache-first. Ako početna
 *    strana dođe iz keša, jedan pokvaren deploy ostaje zaglavljen
 *    korisnicima i posle popravke. HTML je uvek network-first, a keš
 *    služi samo kao offline rezerva.
 * 2. U precache NE idu veliki fajlovi (definicije.json je 20 MB,
 *    reci.txt 2,6 MB). Aplikacija ih učitava sama kad zatreba.
 * 3. Precache je tolerantan — `cache.addAll` je sve-ili-ništa, pa jedan
 *    neuspeo fajl obori celu instalaciju, novi SW se ne aktivira i
 *    stari keš se NIKAD ne obriše. Zato keširamo fajl po fajl.
 * 4. Pri svakoj promeni ovog fajla podigni CACHE verziju — `activate`
 *    briše sve keševe koji nisu tekući.
 * ============================================================ */
const CACHE = 'rimoteka-v4';

// Samo mali fajlovi ljuske. BEZ definicije.json i reci.txt (preveliki),
// bez verzionisanih ?v= putanja (menjaju se pri svakom deployu).
const ASSETS = [
  '/logo-icon.png',
  '/favicon.ico'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // fajl po fajl — jedan neuspeh ne sme da obori instalaciju
    await Promise.all(ASSETS.map(a => cache.add(a).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // strani domeni (GA i sl.) — ne diramo
  if (url.pathname.includes('/api/')) return;            // Pro backend — nikad keš

  // HTML uvek network-first: keš je samo offline rezerva.
  const wantsHTML = req.mode === 'navigate' ||
                    (req.headers.get('accept') || '').includes('text/html');
  if (wantsHTML) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // Ostalo (slike, css, js, json) — stale-while-revalidate:
  // odmah iz keša ako ima, a u pozadini se osvežava. Bezbedno je jer
  // app.js i style.css imaju ?v= u putanji, pa nova verzija = nov URL.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && res.ok) {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
