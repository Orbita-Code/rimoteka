/* ga-init.js — pokretanje Google Analytics-a + ISKLJUČIVANJE SOPSTVENOG PROMETA
 *
 * ZAŠTO ISKLJUČIVANJE POSTOJI (26.08.2026, zahtev vlasnice).
 * Vlasnica otvara svoj sajt svaki dan — da proveri izmenu, da nekome pokaže, da
 * pročita tekst. Svaka ta poseta je do sada ulazila u statistiku kao i svaka druga.
 * Na sajtu koji ima nekoliko stotina poseta mesečno to nije sitnica nego može biti
 * veći deo podataka, pa svaki zaključak izveden iz njih postaje pogrešan.
 *
 * ZAŠTO OVAKO, A NE KROZ GA4.
 * GA4 nudi „Define internal traffic" (isključivanje po IP adresi), ali:
 *   · taj ekran se ne da podesiti automatski — ne reaguje na skriptovan klik;
 *   · kućna IP adresa se menja, pa filter s vremenom prestane da hvata;
 *   · ne pokriva telefon na mobilnoj mreži ni putovanja.
 * Ovo rešenje je u našem kodu, radi na SVAKOM uređaju posebno i ne zavisi ni od
 * adrese ni od dodataka za pregledač.
 *
 * KAKO SE UKLJUČUJE (jednom po uređaju i po pregledaču):
 *     https://rimoteka.com/?interno=1     → od sada se taj uređaj NE broji
 *     https://rimoteka.com/?interno=0     → ponovo se broji
 * Izbor se pamti u `localStorage` i preživljava zatvaranje pregledača.
 *
 * ⚠️ Isključivanje važi SAMO UNAPRED. Posete koje su već izbrojane ostaju u GA4
 * zauvek — Google ih ne može obrisati unazad.
 *
 * KAKO SE PROVERAVA da radi: otvori sajt, pa u konzoli `window.__rimotekaInterno`.
 * `true` znači da se ne brojiš.
 */
(function () {
  'use strict';

  var MERNI_ID = 'G-F88VM8CWBQ';
  var KLJUC = 'rimoteka_interno';

  /* `localStorage` ume da baci izuzetak (privatni režim, blokirani kolačići,
     školski pregledač). Ako padne, ponašamo se kao da oznake nema — merenje radi
     normalno. Nikad ne sme da obori stranu. */
  function citaj() {
    try { return localStorage.getItem(KLJUC) === '1'; } catch (e) { return false; }
  }
  function pisi(vrednost) {
    try {
      if (vrednost) localStorage.setItem(KLJUC, '1');
      else localStorage.removeItem(KLJUC);
    } catch (e) { /* namerno tiho — v. komentar iznad */ }
  }

  /* `?interno=1` uključuje, `?interno=0` isključuje. Radi na bilo kojoj strani. */
  try {
    var p = new URLSearchParams(location.search).get('interno');
    if (p === '1' || p === '0') pisi(p === '1');
  } catch (e) { /* stariji pregledači bez URLSearchParams — preskoči */ }

  var interno = citaj();
  window.__rimotekaInterno = interno;

  /* Google-ov zvaničan prekidač. MORA da se postavi PRE nego što se `gtag.js`
     izvrši — zato ovaj fajl stoji odmah uz njega u zaglavlju i nije `async`.
     Kad je `true`, biblioteka ne šalje nijedan zahtev. */
  if (interno) window['ga-disable-' + MERNI_ID] = true;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MERNI_ID);
})();
