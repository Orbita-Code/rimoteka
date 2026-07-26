// Service Worker registracija
//
// Zašto ovde ima logike za osvežavanje:
// stari service worker ostaje glavni do kraja tekućeg učitavanja strane.
// Ako je taj stari SW imao pokvarenu verziju u kešu (incident 26.07.2026),
// korisnik na PRVOJ poseti posle popravke vidi staru, pokvarenu stranu, a
// tek na drugoj dobija ispravnu. Zato kad novi SW preuzme kontrolu jednom
// osvežimo stranu, pa se popravka primeni odmah, bez ručnog Ctrl+Shift+R.
// (Glavni mehanizam za to je u `sw.js` — `client.navigate()` u `activate` —
// jer zaglavljen korisnik učitava STARI index.html, pa i staru verziju ovog
// fajla. Ovo ispod je dodatni pojas.)

// NA LOKALU NEMA SERVICE WORKERA.
// Lokalni pregled NIKAD ne sme da dolazi iz keša — inače pregledaš staru
// verziju i misliš da je nova pokvarena. Zato na localhost-u ne registrujemo
// SW, a postojeći aktivno odjavljujemo i brišemo mu keš.
const LOKALNO = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(location.hostname);

if ('serviceWorker' in navigator && LOKALNO) {
  (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const bioAktivan = regs.length > 0;
      await Promise.all(regs.map(r => r.unregister()));
      // Keš brišemo UVEK na lokalu, ne samo kad je bilo registracije — keš
      // preživi odjavu SW-a i inače bi ostao da zavarava lokalni pregled.
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if (!bioAktivan) return;
      // Bio je aktivan SW i tek smo ga sklonili — strana je do sad možda
      // dolazila iz keša, pa je jednom osvežimo da vidiš pravo stanje.
      const FLAG = 'rimoteka_local_sw_cleaned';
      if (!sessionStorage.getItem(FLAG)) {
        sessionStorage.setItem(FLAG, '1');
        console.warn('[Rimoteka] Lokalni service worker je odjavljen i keš obrisan — osvežavam.');
        location.reload();
      }
    } catch (e) {}
  })();
}

if ('serviceWorker' in navigator && !LOKALNO) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });

  // Samo za korisnike koji VEĆ imaju aktivan SW — kod njih promena
  // kontrolora znači "stigla je nova verzija". Kod prvog dolaska
  // kontrolora nema, pa listener ni ne postavljamo i nema nepotrebnog
  // osvežavanja. Osvežavamo najviše jednom po tabu, da nema petlje.
  if (navigator.serviceWorker.controller) {
    const RELOAD_FLAG = 'rimoteka_sw_reloaded';
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch (e) {}
      location.reload();
    });
  }
}
