// Service Worker registracija
//
// Zašto ovde ima logike za osvežavanje:
// stari service worker ostaje glavni do kraja tekućeg učitavanja strane.
// Ako je taj stari SW imao pokvarenu verziju u kešu (incident 26.07.2026),
// korisnik na PRVOJ poseti posle popravke vidi staru, pokvarenu stranu, a
// tek na drugoj dobija ispravnu. Zato kad novi SW preuzme kontrolu jednom
// osvežimo stranu, pa se popravka primeni odmah, bez ručnog Ctrl+Shift+R.
if ('serviceWorker' in navigator) {
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
