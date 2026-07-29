// Priprema strane PRE iscrtavanja. Dve stvari koje moraju da se odrade ranije
// nego što se bilo šta vidi: tamni režim i položaj skrola.
//
// Zašto sve stoji u ovom fajlu, a ne kao inline <script>: CSP sajta je
// `script-src 'self' https://*.googletagmanager.com` — bez `'unsafe-inline'`,
// pa bi inline skripta bila tiho blokirana. A zaseban fajl bi značio još jedan
// zahtev koji blokira iscrtavanje.
//
// ── 1) TAMNI REŽIM ──────────────────────────────────────────────────────────
//
// Ranije je ova skripta stajala u <head> i pisala po `document.body`, a `body`
// tada JOŠ NE POSTOJI — `classList` na `null` baci grešku i postavka se gubila
// baš pri učitavanju (nalaz K1). Zato:
//   1) klasa ide na <html>, koji u <head> uvek postoji → pozadina je odmah tamna;
//   2) čim `body` postoji, ista klasa se prenosi i na njega, jer se svih 117
//      pravila u style.css vezuje za `body.dark-mode`.
// localStorage je u try/catch: u privatnom režimu i uz blokirane kolačiće
// čitanje baca SecurityError, a to ne sme da obori stranu.
(function () {
  var dark = false;
  try { dark = localStorage.getItem('rimoteka_dark') === '1'; } catch (e) {}
  if (!dark) return;
  document.documentElement.classList.add('dark-mode');
  var naBody = function () {
    if (document.body) document.body.classList.add('dark-mode');
  };
  naBody();
  if (!document.body) document.addEventListener('DOMContentLoaded', naBody);
})();

// ── 2) OSVEŽAVANJE VRAĆA NA VRH STRANE ────────────────────────────────────────
//
// Pregledač po pravilu vrati skrol tamo gde je bio pre osvežavanja. Na običnom
// sajtu to je korisno, na Rimoteci nije: alat se osvežavanjem RESETUJE — polje
// je prazno, rima nema, pesma se ne prikazuje. Ko pritisne F5 dok je kod futera
// ostane da gleda dno prazne strane, bez logotipa i bez polja za unos.
// Izmereno na produkciji, `/rime-za/ljubav/`: pre osvežavanja 1999,5 px →
// posle osvežavanja 1999,5 px (ništa se nije pomerilo).
//
// Tri stvari koje ovo NE sme da pokvari:
//   · „Nazad" — na hub strani `/rime-za/` ima 1.988 linkova; ko se vrati sa
//     jedne reči mora da nastavi odakle je stao. Zato se `scrollRestoration`
//     postavlja na `manual` SAMO za osvežavanje, i vraća na `auto` čim strana
//     završi učitavanje;
//   · sidra (`#nesto` u adresi) — ako ih ima, ne diramo ništa;
//   · korisnika koji je već krenuo da skroluje dok se strana učitavala — čim
//     dodirne točkić, ekran ili taster, prestajemo da ga vraćamo na vrh.
(function () {
  if (!('scrollRestoration' in history)) return;
  if (location.hash) return;

  var ulaz = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var osvezavanje = ulaz
    ? ulaz.type === 'reload'
    : !!(performance.navigation && performance.navigation.type === 1);
  if (!osvezavanje) return;

  history.scrollRestoration = 'manual';

  var dirao = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (dogadjaj) {
    addEventListener(dogadjaj, function () { dirao = true; }, { once: true, passive: true });
  });
  var naVrh = function () { if (!dirao) window.scrollTo(0, 0); };

  naVrh();
  document.addEventListener('DOMContentLoaded', naVrh);
  addEventListener('load', function () {
    naVrh();
    // Slike i fontovi mogu da pomere stranu i posle `load`. Posle toga se
    // pamćenje položaja vraća pregledaču, da „Nazad" i dalje radi kako treba.
    setTimeout(function () {
      naVrh();
      history.scrollRestoration = 'auto';
    }, 400);
  });
})();
