/* kartice.js — POKRET ISPOD ALATA (02.08.2026)
 *
 * Glavni posao radi CSS: ulaz kartica, potez mastilom niz marginu i svetlucanje
 * slova A · B · A vode `animation-timeline: view()` — dakle POLOŽAJ pri skrolu,
 * ne vreme. Ovaj fajl radi samo dvoje:
 *
 *   1) NAGINJANJE KARTICE PREMA KURSORU (sa mekim sjajem ispod prsta);
 *   2) REZERVU za pregledače koji `view()` još nemaju (Firefox, stanje 08/2026;
 *      podrška je oko 82% — Chrome, Edge i Safari 26+ imaju).
 *
 * Šta NE radi, i to namerno:
 *   · ne dira alat (polje za unos, dugmad, rime) — tamo se meri jedna sekunda;
 *   · ne ubacuje ni slovo teksta — sav tekst je u HTML-u, zbog pretraživača;
 *   · ne pomera raspored — animiraju se samo `transform`, `opacity` i boja, pa
 *     strana ne poskoči (CLS, granica 0,1);
 *   · u rezervi sakriva SAMO ono što je CELO ispod pregiba. Izmereno na sporoj
 *     vezi: strana se iscrta na 2.884 ms, a ovaj fajl odradi svoje na 4.248 ms —
 *     kad bi sakrio nešto što se vidi, tekst bi nestao pred čovekom na 1,4 s.
 *
 * Zašto zaseban fajl, a ne <script> u strani: CSP sajta je `script-src 'self'`
 * (nginx.conf), pa bi skripta upisana u stranu bila tiho blokirana.
 *
 * Ako se ovaj fajl ne učita — kartice su i dalje tu, čitljive, a u Chrome-u i
 * Safariju i dalje lepo ulaze, jer to radi CSS. Proverava pre-deploy test.
 */
(function () {
  'use strict';

  var miran = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  if (miran && miran.matches) return;   // „smanji pokret" — ništa se ne dešava

  var grupe = [
    { okvir: document.querySelector('.seo-blokovi'), stavke: '.seo-blok', pomeraj: 0 },
    // 35 ms pomaka: dve kolone se preklapaju kao dve ruke koje dele isti špil,
    // umesto da krenu u istom trenutku i deluju kao jedan blok.
    { okvir: document.querySelector('.faq'), stavke: 'details', pomeraj: 35 }
  ].filter(function (g) { return g.okvir; });
  if (!grupe.length) return;

  document.documentElement.classList.add('js-kartice');

  var imaView = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()');

  var sve = [];
  grupe.forEach(function (g) {
    sve = sve.concat([].slice.call(g.okvir.querySelectorAll(g.stavke)));
  });

  // ── REZERVA: ulaz vođen vremenom, samo tamo gde CSS ne ume drugačije ────────
  if (!imaView && 'IntersectionObserver' in window) {
    var KORAK = 70;     // razmak između dve kartice, ms — ceo špil stane u ~830 ms
    var NAJVISE = 8;    // više od osam se ne broji, inače niz postane čekanje

    grupe.forEach(function (g) {
      var kartice = [].slice.call(g.okvir.querySelectorAll(g.stavke));
      if (!kartice.length) return;

      // Samo ono što je CELO ispod pregiba. Sve što se makar delom vidi ostaje
      // kako jeste — bolje bez ulaza nego da tekst trepne.
      if (g.okvir.getBoundingClientRect().top < window.innerHeight) return;

      kartice.forEach(function (k) { k.classList.add('kartica-ceka'); });

      var motritelj = new IntersectionObserver(function (upisi) {
        upisi.forEach(function (u) {
          if (!u.isIntersecting) return;
          motritelj.disconnect();
          kartice.forEach(function (k, i) {
            k.style.animationDelay = (g.pomeraj + Math.min(i, NAJVISE - 1) * KORAK) + 'ms';
            k.classList.remove('kartica-ceka');
            k.classList.add('kartica-ulazi');
          });
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });

      motritelj.observe(g.okvir);
    });
  }

  // ── NAGINJANJE PREMA KURSORU ───────────────────────────────────────────────
  // Samo tamo gde kursor stvarno postoji. Na dodir se ne dešava ništa i ništa
  // se ne gubi — kartica se otvara klikom, kao i pre.
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  sve.forEach(function (k) {
    var okvir = null, ceka = false, dogadjaj = null;

    k.addEventListener('pointerenter', function () {
      okvir = k.getBoundingClientRect();   // mera se uzima jednom po ulasku
    });

    k.addEventListener('pointermove', function (e) {
      dogadjaj = e;
      if (ceka || !okvir) return;
      ceka = true;
      requestAnimationFrame(function () {
        ceka = false;
        var x = (dogadjaj.clientX - okvir.left) / okvir.width;
        var y = (dogadjaj.clientY - okvir.top) / okvir.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        k.style.setProperty('--nagib-y', ((x - 0.5) * 6.4).toFixed(2) + 'deg');
        k.style.setProperty('--nagib-x', ((0.5 - y) * 4).toFixed(2) + 'deg');
        k.style.setProperty('--sjaj-x', (x * 100).toFixed(1) + '%');
        k.style.setProperty('--sjaj-y', (y * 100).toFixed(1) + '%');
      });
    });

    k.addEventListener('pointerleave', function () {
      okvir = null;
      k.style.setProperty('--nagib-x', '0deg');
      k.style.setProperty('--nagib-y', '0deg');
    });
  });
})();
