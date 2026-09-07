/* Google Analytics + BANER ZA KOLAČIĆE (06.09.2026, odluka vlasnice).
 *
 * Do 06.09.2026. se Analytics učitavao bez pitanja. Od sada se biblioteka (gtag.js)
 * učitava TEK POSLE „Prihvati sve" ili posle uključenog prekidača u „Podesi".
 * Bez odluke — nema kolačića i nema merenja. Odluka se pamti u localStorage
 * (`rimoteka_kolacici`), a menja se linkom „Kolačići" u futeru.
 *
 * Baner NE blokira sajt (reči se vide i alat radi) — zid preko celog ekrana Google
 * tretira kao nametljiv međuekran na telefonu i spušta rangiranje, a nama je
 * indeksiranje najveći problem. „Prihvati sve" je jedan klik; „Podesi" traži još
 * dva (prekidač + „Sačuvaj").
 *
 * `?interno=1` (vlasnica, test) i dalje gasi merenje na uređaju — i tada baner ne
 * smeta, jer odluke nema šta da menja.
 *
 * TEKST BANERA JE ODREDILA VLASNICA 07.09.2026 — isti kao na orbitacode.com. Kratak i
 * uopšten, NAMERNO: ne objašnjava šta se meri. Prihvatanje 1 klik, odbijanje kroz „Podesi"
 * — i to je namerno. Ne „poboljšavati", ne dodavati „Odbij", ne pominjati EU/GDPR (sajt je
 * za Srbiju i Balkan — odluka vlasnice, globalni CLAUDE.md „Kolačići i pravo").
 *
 * `gtag` stub postoji UVEK, da `gtag('event', …)` iz app.js nikad ne pukne; dok
 * nema pristanka, događaji se samo slažu u `dataLayer` i nikud ne odlaze. */
(function () {
  'use strict';
  var MERNI_ID = 'G-F88VM8CWBQ';
  var KLJUC_INTERNO = 'rimoteka_interno';
  var KLJUC_KOLACICI = 'rimoteka_kolacici';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privatni režim — tiho */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* tiho */ } }

  /* ---------- interni režim (bez merenja na ovom uređaju) ---------- */
  try {
    var p = new URLSearchParams(location.search).get('interno');
    if (p === '1') lsSet(KLJUC_INTERNO, '1');
    if (p === '0') lsDel(KLJUC_INTERNO);
  } catch (e) { /* stariji pregledači */ }
  var interno = lsGet(KLJUC_INTERNO) === '1';
  window.__rimotekaInterno = interno;
  if (interno) window['ga-disable-' + MERNI_ID] = true;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  /* ---------- odluka o kolačićima ---------- */
  function odluka() {
    var s = lsGet(KLJUC_KOLACICI);
    if (!s) return null;
    try { var o = JSON.parse(s); return (o && typeof o.analitika === 'boolean') ? o : null; } catch (e) { return null; }
  }
  function sacuvaj(analitika) {
    lsSet(KLJUC_KOLACICI, JSON.stringify({ analitika: !!analitika, kad: new Date().toISOString(), v: 1 }));
  }

  var ucitano = false;
  function ucitajAnalitiku() {
    if (ucitano || interno) return;
    ucitano = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MERNI_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', MERNI_ID);
  }

  /* ---------- ćirilica za tekst banera (isto pravilo kao u app.js) ---------- */
  var CYR = { a:'а',b:'б',c:'ц',č:'ч',ć:'ћ',d:'д',đ:'ђ',e:'е',f:'ф',g:'г',h:'х',i:'и',j:'ј',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',r:'р',s:'с',š:'ш',t:'т',u:'у',v:'в',z:'з',ž:'ж' };
  function toCyr(s) {
    return s.replace(/dž|Dž|lj|Lj|nj|Nj/g, function (m) { return { 'dž':'џ','Dž':'Џ','lj':'љ','Lj':'Љ','nj':'њ','Nj':'Њ' }[m]; })
            .replace(/[a-zčćđšž]/g, function (ch) { return CYR[ch] || ch; })
            .replace(/[A-ZČĆĐŠŽ]/g, function (ch) { var m = CYR[ch.toLowerCase()]; return m ? m.toUpperCase() : ch; });
  }
  /* Ime brenda (Google Analytics) ostaje latinicom i u ćirilici — isto pravilo kao za
     logo, mejl i skraćenice u app.js. */
  function t(s) {
    if (lsGet('rimoteka_script') !== 'cyr') return s;
    return s.split('Google Analytics').map(toCyr).join('Google Analytics');
  }

  /* ---------- baner ---------- */
  var baner = null;
  function el(tag, cls, tekst) { var e = document.createElement(tag); if (cls) e.className = cls; if (tekst != null) e.textContent = tekst; return e; }
  function zatvori() { if (baner) { baner.remove(); baner = null; } }
  function otvoriBaner(saPodesavanjem) {
    zatvori();
    baner = el('div', 'kolacici');
    baner.setAttribute('role', 'dialog');
    baner.setAttribute('aria-label', t('Kolačići'));
    var glava = el('div', 'kolacici-glava');
    glava.appendChild(el('strong', 'kolacici-naslov', t('Kolačići na Rimoteci')));
    glava.appendChild(el('p', 'kolacici-tekst', t('Koristimo kolačiće kako bismo poboljšali vaše iskustvo na našem sajtu.')));
    baner.appendChild(glava);

    var podesi = el('div', 'kolacici-podesi');
    podesi.hidden = !saPodesavanjem;
    function red(naslov, opis, ukljuceno, zakljucano, ime) {
      var r = el('label', 'kolacici-red');
      var box = el('input'); box.type = 'checkbox'; box.checked = ukljuceno; box.disabled = zakljucano; box.name = ime;
      var prek = el('span', 'kolacici-prekidac');
      var txt = el('span', 'kolacici-red-tekst');
      txt.appendChild(el('b', null, naslov));
      txt.appendChild(el('span', null, opis));
      r.appendChild(box); r.appendChild(prek); r.appendChild(txt);
      return r;
    }
    podesi.appendChild(red(t('Neophodno'), t('uvek uključeno: pamti temu, pismo i beležnicu na tvom uređaju'), true, true, 'neophodno'));
    podesi.appendChild(red(t('Merenje posete (Google Analytics)'), t('koje strane i dugmad se koriste; ne zna ko si'), false, false, 'analitika'));
    var sacuvajBtn = el('button', 'kolacici-dugme kolacici-sacuvaj', t('Sačuvaj izbor'));
    sacuvajBtn.type = 'button';
    sacuvajBtn.onclick = function () {
      var a = podesi.querySelector('input[name=analitika]').checked;
      sacuvaj(a); zatvori(); if (a) ucitajAnalitiku();
    };
    podesi.appendChild(sacuvajBtn);
    baner.appendChild(podesi);

    var dugmad = el('div', 'kolacici-dugmad');
    var prihvati = el('button', 'kolacici-dugme kolacici-prihvati', t('Prihvati sve'));
    prihvati.type = 'button';
    prihvati.onclick = function () { sacuvaj(true); zatvori(); ucitajAnalitiku(); };
    var podesiBtn = el('button', 'kolacici-dugme kolacici-podesi-btn', t('Podesi'));
    podesiBtn.type = 'button';
    podesiBtn.setAttribute('aria-expanded', saPodesavanjem ? 'true' : 'false');
    podesiBtn.onclick = function () { podesi.hidden = !podesi.hidden; podesiBtn.setAttribute('aria-expanded', podesi.hidden ? 'false' : 'true'); };
    dugmad.appendChild(prihvati); dugmad.appendChild(podesiBtn);
    baner.appendChild(dugmad);
    document.body.appendChild(baner);
  }

  /* javno: futer link „Kolačići" i test */
  window.rimotekaKolacici = {
    otvori: function () { otvoriBaner(true); },
    odluka: odluka,
    ucitano: function () { return ucitano; }
  };

  function start() {
    var o = odluka();
    if (o && o.analitika) { ucitajAnalitiku(); return; }
    if (o) return;                               // odbio merenje — ništa
    if (interno) return;                         // vlasnica/test — bez banera
    otvoriBaner(false);
    /* Link „Kolačići" u futeru otvara baner kad god (promena odluke). */
  }
  function veziFuter() {
    var l = document.querySelector('.futer-kolacici, [data-kolacici]');
    if (l) l.addEventListener('click', function (e) { e.preventDefault(); otvoriBaner(true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { start(); veziFuter(); });
  else { start(); veziFuter(); }
})();
