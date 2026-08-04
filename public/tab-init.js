/* Oznaka aktivnog taba na <html>, PRE iscrtavanja tela. Po njoj CSS skriva
   traku za saradnju na početnom tabu, a poziv prikazuje u futeru (04.08.2026).

   Mora kao SPOLJNI fajl: CSP zaglavlje na produkciji (`script-src 'self'`)
   blokira inline skripte — ista ova logika je u HTML-u ćutke bila blokirana,
   pa su na početnoj traka ostajala vidljiva, a futerski poziv skriven
   (uhvatio test protiv produkcije, BASE=rimoteka.com). Zato je ovde, rame uz
   rame sa `dark-mode-init.js` koji iz istog razloga živi kao fajl. */
document.documentElement.dataset.tab = (function () {
  var t = new URLSearchParams(location.search).get('tab');
  return ['beleznica', 'slogovi', 'pretraga', 'igra', 'klasici', 'omiljene'].indexOf(t) !== -1 ? t : 'rime';
})();
