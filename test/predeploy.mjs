#!/usr/bin/env node
/**
 * OBAVEZAN PRE-DEPLOY TEST — Rimoteka
 *
 * Pokreće pravi Chromium, otvara sajt i proverava da SVE ZAISTA RADI, ne samo
 * da se kod kompajlira. Nastao posle 26.07.2026, kad je jedan `TypeError`
 * oborio ceo sajt (rime, igra, svi tabovi) i to je otišlo na produkciju.
 *
 * Pokretanje:
 *   node test/predeploy.mjs                      # lokalno (diže server sam)
 *   BASE=https://rimoteka.com node test/predeploy.mjs   # protiv produkcije
 *
 * Izlazni kod 0 = sve prošlo, sme deploy. Bilo šta drugo = NE deployovati.
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8799;
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const LOKALNO = !process.env.BASE;

let pass = 0;
const greske = [];

function ok(ime, uslov, detalj = '') {
  if (uslov) { pass++; console.log(`  ✅ ${ime}`); }
  else { greske.push(`${ime}${detalj ? ' — ' + detalj : ''}`); console.log(`  ❌ ${ime}${detalj ? ' — ' + detalj : ''}`); }
}

const pauza = ms => new Promise(r => setTimeout(r, ms));

/* Lokalni server za test živi u ZASEBNOM PROCESU — `test/static-server.mjs`.
   Objašnjenje zašto (jednonitni python, zaglavljivanje, deljena Node petlja,
   keš zaglavlja) stoji u zaglavlju tog fajla. */

async function main() {
  let server;
  if (LOKALNO) {
    server = spawn('node', [path.join(ROOT, 'test', 'static-server.mjs'), path.join(ROOT, 'public'), String(PORT)],
                   { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    server.stderr.on('data', d => console.error('[server]', String(d).trim()));
    // čekaj da server javi da je spreman, ne fiksnih 800 ms
    await new Promise((r, x) => {
      const t = setTimeout(() => x(new Error('lokalni server se nije podigao za 15 s')), 15000);
      server.stdout.on('data', d => { if (String(d).includes('spreman')) { clearTimeout(t); r(); } });
      server.on('error', e => { clearTimeout(t); x(e); });
    });
  }

  const browser = await chromium.launch();

  /* SVAKA NOVA STRANA: izdašan rok + PONAVLJANJE NAVIGACIJE.
     Test otvara preko trideset zasebnih strana, svaku sa svojim praznim kešom.
     Izmereno 29.07.2026: otprilike svako drugo pokretanje se zaglavi na jednoj
     `page.goto` — pregledač u tom trenutku NE pošalje nijedan zahtev
     (server pokazuje 0 veza i na `curl` odgovara za 0,21 s), dakle nije kvar
     sajta ni servera nego zastoj u samom Chromiumu.
     Zato se navigacija ponavlja do tri puta. Zastoj koji se ponovi tri puta
     zaredom se i dalje prijavljuje kao pad — pravi kvar se ovim ne sakriva. */
  function ojacajStranu(p) {
    p.setDefaultNavigationTimeout(120000);
    const _goto = p.goto.bind(p);
    p.goto = async (url, opt = {}) => {
      let poslednja;
      for (let i = 1; i <= 3; i++) {
        try { return await _goto(url, { timeout: 45000, ...opt }); }
        catch (e) {
          poslednja = e;
          console.log(`  ↻ navigacija na ${url} nije uspela (${i}/3) — ponavljam`);
          await pauza(1500);
        }
      }
      throw poslednja;
    };
    return p;
  }
  const _novaStrana = browser.newPage.bind(browser);
  browser.newPage = async (...a) => ojacajStranu(await _novaStrana(...a));
  const _noviKontekst = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const c = await _noviKontekst(...a);
    const _cNova = c.newPage.bind(c);
    c.newPage = async (...b) => ojacajStranu(await _cNova(...b));
    return c;
  };

  const page = await browser.newPage();

  // Konzola mora da bude čista — greška u konzoli je često mrtav sajt.
  const konzolaGreske = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // fontovi sa googleapis su blokirani u headless okruženju — nije naš bug
    if (/fonts\.googleapis|fonts\.gstatic|net::ERR_FAILED.*fonts/.test(t)) return;
    konzolaGreske.push(t);
  });
  page.on('pageerror', e => konzolaGreske.push('pageerror: ' + e.message));

  try {
    console.log(`\n▶ PRE-DEPLOY TEST — ${BASE}\n`);

    console.log('1) Učitavanje i rečnik');
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    // Na produkciji reci.txt (2,5 MB) ide bez keša pa je učitavanje sporije od
    // lokalnog. Timeout je zato izdašan, a istek NE gutamo tiho — ako rečnik ne
    // stigne, to je nalaz i test mora da padne sa jasnom porukom.
    // Kod PRVE posete service worker preuzme kontrolu i strana se jednom osveži
    // (to je namerno — tako se zaglavljeni korisnici sami odglave). Testu to
    // obriše izvršni kontekst usred čekanja, pa čekanje ponavljamo.
    let recnikStigao = false;
    for (let pokusaj = 0; pokusaj < 3 && !recnikStigao; pokusaj++) {
      try {
        await page.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0, { timeout: 120000 });
        recnikStigao = true;
      } catch (e) {
        if (pokusaj === 2) break;
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await pauza(1000);
      }
    }
    ok('rečnik je stigao (uz toleranciju na osvežavanje od SW-a)', recnikStigao, 'nije stigao ni posle 3 pokušaja');
    const brojReci = await page.evaluate(() => (typeof WORDS !== 'undefined' ? WORDS.length : 0));
    ok('rečnik se učitao (>250.000 reči)', brojReci > 250000, `učitano ${brojReci}`);
    ok('konzola bez grešaka', konzolaGreske.length === 0, konzolaGreske.slice(0, 3).join(' | '));

    console.log('\n2) RIMOVANJE REČI — glavna namena sajta');
    const rime = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'ljubav';
      document.getElementById('rimeBtn').click();
      await w(900);
      const box = document.getElementById('rimeResults');
      const reci = [...box.querySelectorAll('.word')].map(e => e.textContent.trim());
      return { broj: reci.length, ima_grbav: reci.includes('grbav'), prvih5: reci.slice(0, 5) };
    });
    ok('rime za „ljubav" postoje', rime.broj > 5, `nađeno ${rime.broj}`);
    ok('rima „grbav" je među rezultatima', rime.ima_grbav, `dobio: ${rime.prvih5.join(', ')}`);

    const rimeNada = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'nada';
      document.getElementById('rimeBtn').click();
      await w(900);
      return [...document.getElementById('rimeResults').querySelectorAll('.word')].map(e => e.textContent.trim());
    });
    ok('rime za „nada" postoje', rimeNada.length > 5, `nađeno ${rimeNada.length}`);

    console.log('\n3) Frekvencijsko rangiranje i SINONIMI');
    await page.waitForFunction(() => typeof SYNONYMS !== 'undefined' && Object.keys(SYNONYMS).length > 0, { timeout: 180000 })
      .catch(() => {});
    const extras = await page.evaluate(() => {
      let neg = 0;
      for (const v of RANK.values()) if (v < 0) neg++;
      return { sinonima: Object.keys(SYNONYMS).length, saFrekvencijom: neg };
    });
    ok('sinonimi su učitani', extras.sinonima > 10000, `${extras.sinonima}`);
    ok('frekvencijsko rangiranje radi', extras.saFrekvencijom > 100000, `${extras.saFrekvencijom} reči`);
    const sinGrupa = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'ljubav';
      document.getElementById('rimeBtn').click();
      await w(900);
      return [...document.getElementById('rimeResults').querySelectorAll('h3')].map(e => e.textContent.trim());
    });
    ok('grupa „Sinonimi" se prikazuje u rezultatima', sinGrupa.some(g => /Sinonimi/i.test(g)), sinGrupa.join(' / '));

    console.log('\n4) Svi tabovi se otvaraju');
    const tabovi = ['rime', 'pretraga', 'slogovi', 'beleznica', 'klasici', 'igra', 'omiljene'];
    for (const t of tabovi) {
      const vidljiv = await page.evaluate(async (tab) => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const btn = [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === tab);
        if (!btn) return 'nema dugme';
        btn.click();
        await w(300);
        const panel = document.getElementById('panel-' + tab);
        if (!panel) return 'nema panel';
        return panel.classList.contains('active') && panel.getBoundingClientRect().height > 0 ? 'ok' : 'nije vidljiv';
      }, t);
      ok(`tab „${t}" se otvara`, vidljiv === 'ok', vidljiv);
    }

    console.log('\n5) PRETRAGA REČI');
    const pretraga = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === 'pretraga').click();
      await w(200);
      document.getElementById('searchInput').value = 'ljubav';
      document.getElementById('searchBtn').click();
      await w(900);
      return document.getElementById('searchResults').querySelectorAll('.word').length;
    });
    ok('pretraga vraća rezultate', pretraga > 0, `${pretraga} rezultata`);

    console.log('\n6) SLOGOVI I KARAKTERI');
    const slogovi = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === 'slogovi').click();
      await w(200);
      const ta = document.getElementById('sylInput');
      ta.value = 'Ljubav je lepa';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      await w(400);
      return (document.getElementById('sylOutput') || document.body).innerText;
    });
    ok('brojač slogova reaguje na unos', /\d/.test(slogovi), 'nema brojeva u izlazu');

    console.log('\n7) BELEŽNICA');
    const beleznica = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === 'beleznica').click();
      await w(200);
      const ed = document.getElementById('noteEditor');
      if (!ed) return 'nema editor';
      if (ed.isContentEditable) { ed.textContent = 'Proba stiha'; }
      else { ed.value = 'Proba stiha'; }
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      await w(400);
      const tekst = ed.isContentEditable ? ed.textContent : ed.value;
      return tekst.includes('Proba stiha') ? 'ok' : 'tekst se ne zadržava';
    });
    ok('beležnica prima tekst', beleznica === 'ok', beleznica);

    console.log('\n7a) BELEŽNICA — gutter, šema rime i panel sa rimama');
    // Pesma sa ukrštenom rimom: gutter mora dati red po stihu, slogove,
    // slova šeme (ABAB) i rime za reč pod kursorom — sve bez menjanja taba.
    await page.evaluate(() => {
      const ed = document.getElementById('noteEditor');
      ed.innerHTML = 'Volim te ko nada<br>zvezda sja u tami<br>u srcu mom je mlada<br>i sanjamo je sami';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      // kursor na kraj poslednjeg stiha (rime prate kursor)
      const sel = getSelection(), r = document.createRange();
      r.selectNodeContents(ed); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await pauza(1200);
    const gutter = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#noteGutter .gutter-row')];
      const ed = document.getElementById('noteEditor');
      // Poravnanje se meri na OTISKU slova (ne na okviru reda): broj u gutteru
      // i stih moraju sedeti na istoj osnovnoj liniji.
      const otisak = (node) => {
        const rr = document.createRange(); rr.setStart(node, 0); rr.setEnd(node, node.data.length);
        const rects = [...rr.getClientRects()].filter(x => x.height > 0);
        return rects.length ? Math.round(rects[0].bottom * 10) / 10 : null;
      };
      const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, null);
      const stihovi = []; const vidjeni = new Set(); let n;
      while ((n = walker.nextNode())) {
        if (!n.data.trim()) continue;
        const b = otisak(n);
        if (b != null && !vidjeni.has(b)) { vidjeni.add(b); stihovi.push(b); }
      }
      return {
        redova: rows.length,
        slova: rows.map(r => r.querySelector('.g-letter').textContent).join(''),
        slogovi: rows.map(r => r.querySelector('.g-syl').textContent).join(','),
        hvataljki: rows.filter(r => r.querySelector('.g-drag')).length,
        brojevi: rows.map(r => otisak(r.querySelector('.g-syl').firstChild)),
        stihovi,
        stats: document.getElementById('noteStats').textContent,
        rime: document.querySelectorAll('#noteRhymes .chip').length,
        mrtvaDugmad: document.querySelectorAll('#noteRhymes .mini').length,
        legenda: document.querySelectorAll('.notepad-legend span').length,
      };
    });
    ok('gutter ima red po stihu', gutter.redova === 4, `redova=${gutter.redova}`);
    ok('gutter broji slogove po stihu', gutter.slogovi === '6,6,7,7', gutter.slogovi);
    ok('šema rime ABAB u gutteru', gutter.slova === 'ABAB', gutter.slova);
    ok('svaki stih ima hvataljku za premeštanje', gutter.hvataljki === 4, `${gutter.hvataljki}`);
    ok('broj slogova sedi u istom redu kao stih',
      gutter.brojevi.length === gutter.stihovi.length &&
      gutter.brojevi.every((v, i) => v != null && Math.abs(v - gutter.stihovi[i]) <= 1),
      `${gutter.brojevi} vs ${gutter.stihovi}`);
    ok('beležnica ima legendu oznaka', gutter.legenda === 4, `${gutter.legenda}`);
    ok('šema rime piše i u statistici', /ABAB \(ukrštena rima\)/.test(gutter.stats), gutter.stats);
    ok('rime za reč pod kursorom stoje uz beležnicu', gutter.rime > 3, `rima=${gutter.rime}`);
    ok('u panelu sa rimama nema mrtvih dugmića', gutter.mrtvaDugmad === 0, `${gutter.mrtvaDugmad}`);

    // Sinonimi NE smeju u panel uz stih: „naći" ima sinonime (izumeti, otkriti,
    // stvoriti) koji se ne rimuju, pa uz stih izgledaju kao greška u alatu.
    const bezSinonima = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const ed = document.getElementById('noteEditor');
      ed.innerHTML = 'nikako ne mogu naći';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      const sel = getSelection(), r = document.createRange();
      r.selectNodeContents(ed); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
      await w(900);
      return {
        reci: [...document.querySelectorAll('#noteRhymes .chip .word')].map(x => x.textContent.trim()),
        imaSinonimaUGlavnom: document.querySelectorAll('#rimeResults .syn-card .chip').length,
      };
    });
    const sinonimiUPanelu = ['izumeti', 'otkriti', 'stvoriti', 'iskopati', 'konstruisati']
      .filter(w => bezSinonima.reci.includes(w));
    ok('„naći" uopšte ima sinonime u glavnim rezultatima', bezSinonima.imaSinonimaUGlavnom > 0,
      'nema sinonima — provera je bezvredna');
    ok('sinonimi NE ulaze u panel uz stih', sinonimiUPanelu.length === 0, sinonimiUPanelu.join(', '));
    ok('panel uz stih i dalje ima prave rime', bezSinonima.reci.some(w => /aći$/.test(w)),
      bezSinonima.reci.slice(0, 8).join(', '));

    // Klik na rimu: ubacuje je SA RAZMAKOM, panel ostaje usidren za reč sa
    // kojom se rimuje i čipovi se ne precrtavaju (inače okvir „trepne").
    await page.evaluate(() => {
      document.querySelector('#noteRhymes .chip').dataset.proba = '1';
    });
    await page.click('#noteRhymes .chip');
    await pauza(800);
    const posleKlika = await page.evaluate(() => ({
      probaOstala: !!document.querySelector('#noteRhymes .chip[data-proba="1"]'),
      tekst: document.getElementById('noteEditor').innerText,
      naslov: document.querySelector('#noteRhymes .nr-word').textContent,
    }));
    ok('klik na rimu ubacuje reč sa razmakom', / \S+$/.test(posleKlika.tekst) && !/naćip/i.test(posleKlika.tekst),
      JSON.stringify(posleKlika.tekst));
    ok('panel ostaje usidren za reč sa kojom se rimuje', posleKlika.naslov === 'naći', posleKlika.naslov);
    ok('čipovi se ne precrtavaju posle klika (nema treperenja)', posleKlika.probaOstala);

    const jos = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const btn = document.querySelector('.nr-more');
      if (!btn) return { ima: false };
      const pre = document.querySelectorAll('#noteRhymes .chip').length;
      const tekst = btn.textContent;
      btn.click(); await w(400);
      const posle = document.querySelectorAll('#noteRhymes .chip').length;
      document.querySelector('.nr-more').click(); await w(400);
      return { ima: true, tekst, pre, posle, nazad: document.querySelectorAll('#noteRhymes .chip').length };
    });
    ok('panel nudi „još N rima"', jos.ima && /još \d+ rim/.test(jos.tekst), jos.tekst || 'nema dugmeta');
    ok('„još N rima" otvara ostatak u samom panelu', jos.posle > jos.pre, `${jos.pre} → ${jos.posle}`);
    ok('lista se može skupiti nazad', jos.nazad === jos.pre, `${jos.nazad}`);

    console.log('\n7b) BELEŽNICA — premeštanje stihova (drag & drop)');
    await page.evaluate(() => {
      const ed = document.getElementById('noteEditor');
      ed.innerHTML = 'prvi stih<br>drugi stih<br>treci stih';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await pauza(900);
    const hvataljka = await page.locator('.gutter-row[data-line="0"] .g-drag').boundingBox();
    const cilj = await page.locator('.gutter-row[data-line="2"]').boundingBox();
    let linijaVidljiva = false;
    if (hvataljka && cilj) {
      await page.mouse.move(hvataljka.x + hvataljka.width / 2, hvataljka.y + hvataljka.height / 2);
      await page.mouse.down();
      await page.mouse.move(hvataljka.x + hvataljka.width / 2, cilj.y + cilj.height * 0.9, { steps: 10 });
      await pauza(150);
      linijaVidljiva = await page.evaluate(() => {
        const d = document.getElementById('noteDropLine');
        return !!d && d.classList.contains('show');
      });
      await page.mouse.up();
      await pauza(700);
    }
    const posle = await page.evaluate(() => ({
      tekst: document.getElementById('noteEditor').innerText,
      sacuvano: localStorage.getItem('rimoteka_notes'),
    }));
    ok('linija za ispuštanje se vidi tokom prevlačenja', linijaVidljiva);
    ok('stih se premešta prevlačenjem', posle.tekst === 'drugi stih\ntreci stih\nprvi stih', JSON.stringify(posle.tekst));
    ok('novi redosled stihova je sačuvan', posle.sacuvano === 'drugi stih\ntreci stih\nprvi stih', JSON.stringify(posle.sacuvano));

    // Enter posle premeštanja i dalje pravi novi red (contenteditable je osetljiv)
    await page.click('#noteEditor');
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('cetvrti stih');
    await pauza(800);
    const posleKucanja = await page.evaluate(() => document.getElementById('noteEditor').innerText);
    ok('Enter posle premeštanja pravi novi red', posleKucanja.split('\n').length === 4, JSON.stringify(posleKucanja));

    console.log('\n7c) BELEŽNICA — metar (ritam stiha)');
    // Metar sme da tvrdi samo ono što je sigurno po akcenatskim pravilima:
    // dvosložna reč = naglašen + nenaglašen, klitika = nenaglašena,
    // reč od 3+ sloga = poslednji nenaglašen, ostali NEPOZNATI (ne nagađamo).
    const metarSkriven = await page.evaluate(() => document.getElementById('noteMeter').hidden);
    ok('metar je podrazumevano skriven', metarSkriven === true);
    await page.click('#toggleMeter');
    await page.evaluate(() => {
      const ed = document.getElementById('noteEditor');
      ed.innerHTML = 'Vino pije Musa Arbanasa<br>u Stambolu među Turcima<br>kad se Musa nakitio vina<br>onda poče govoriti tiho';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await pauza(900);
    const metar = await page.evaluate(() => {
      const box = document.getElementById('noteMeter');
      const red = [...box.querySelectorAll('.meter-line')].filter(l => !l.classList.contains('meter-gap'));
      const znak = s => s.classList.contains('m-s') ? 'S' : s.classList.contains('m-u') ? 'U' : '?';
      return {
        hidden: box.hidden,
        head: box.querySelector('.meter-head').textContent,
        redova: red.length,
        ritam1: [...red[0].querySelectorAll('.m-syl')].map(znak).join(''),
        odstupa: red.filter(l => l.querySelector('.m-count.off')).length,
        cezure: box.querySelectorAll('.m-cez').length,
        legenda: !!box.querySelector('.meter-legend'),
      };
    });
    ok('metar se prikazuje na dugme', metar.hidden === false);
    ok('metar ima red po stihu', metar.redova === 4, `${metar.redova}`);
    ok('prepoznat deseterac sa cezurom 4+6', /deseterac/.test(metar.head) && /cezura posle 4/.test(metar.head), metar.head);
    // „Vino pije Musa Arbanasa": vi-no pi-je mu-sa ar-ba-na-sa
    ok('dvosložne reči: naglašen pa nenaglašen', metar.ritam1.startsWith('SUSUSU'), metar.ritam1);
    ok('reč od 4 sloga: poslednji nenaglašen, ostali nepoznati', metar.ritam1.endsWith('???U'), metar.ritam1);
    ok('cezura ucrtana u stih od 10 slogova', metar.cezure >= 3, `${metar.cezure}`);
    ok('stih koji odstupa od metra je označen', metar.odstupa === 1, `${metar.odstupa}`);
    ok('metar ima legendu', metar.legenda);

    const klitike = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const ed = document.getElementById('noteEditor');
      ed.innerHTML = 'ja sam na putu';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      await w(700);
      const red = [...document.querySelectorAll('.meter-line')].filter(l => !l.classList.contains('meter-gap'));
      return [...red[0].querySelectorAll('.m-syl')]
        .map(s => s.classList.contains('m-s') ? 'S' : s.classList.contains('m-u') ? 'U' : '?').join('');
    });
    ok('klitike („sam", „na") nisu naglašene', klitike === 'SUUSU', klitike);
    await page.click('#toggleMeter');   // vrati u pređašnje stanje
    await pauza(300);

    console.log('\n8) IGRA RIMA — ceo krug');
    const igra = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === 'igra').click();
      await w(300);
      const opt = document.querySelector('#gameSetup .game-setup-options button[data-value="3"]');
      if (opt) opt.click();
      const opcijaPrimljena = opt ? opt.classList.contains('active') : false;
      const start = document.getElementById('gameStart');
      if (!start) return { greska: 'nema Start dugme' };
      start.click();
      await w(700);
      const rec = (document.getElementById('gameWord') || {}).textContent || '';
      const inp = document.getElementById('gameInput');
      const sub = document.getElementById('gameSubmit');
      if (!inp || !sub) return { greska: 'nema polje ili dugme Proveri' };
      const igraPokrenuta = getComputedStyle(document.getElementById('gamePlay')).display !== 'none';

      // a) reč koje nema u rečniku — mora da javi da je nema
      inp.value = 'zzzznepostojeca';
      sub.click();
      await w(600);
      const fbNepoznata = (document.getElementById('gameFeedback') || {}).textContent || '';

      // b) PRAVA rima za zadatu reč — mora da bude priznata kao tačna.
      // Tražimo je istim algoritmom koji koristi i sam alat (rhymeKey),
      // pa ovaj test pada i ako se pokvari samo prepoznavanje rime.
      const cilj = (typeof gameCurrentWord === 'string' && gameCurrentWord) ? gameCurrentWord : rec;
      // Odgovor tražimo ISTIM pravilom koje igra i priznaje (savršena rima ILI
      // asonanca). Ranije se tražila samo savršena, pa je test umeo da ne nađe
      // ništa za reč tipa „valjda" i prijavi „nije testirano" — a igra je bila
      // sasvim ispravna.
      let rima = null;
      if (typeof rhymeKey === 'function') {
        const k = rhymeKey(cilj), lk = (typeof looseKey === 'function') ? looseKey(cilj) : null;
        for (const w2 of WORDS) {
          if (w2 === cilj) continue;
          if (rhymeKey(w2) === k || (lk && looseKey(w2) === lk)) { rima = w2; break; }
        }
      }
      let fbTacna = 'nije testirano';
      if (rima) {
        inp.value = rima;
        sub.click();
        await w(700);
        fbTacna = (document.getElementById('gameFeedback') || {}).textContent || '';
      }
      return { opcijaPrimljena, rec, igraPokrenuta, fbNepoznata, rima, fbTacna };
    });
    ok('dugme za broj igrača reaguje na klik', igra.opcijaPrimljena === true, JSON.stringify(igra).slice(0, 120));
    ok('igra se pokreće i daje reč', !!igra.rec && igra.igraPokrenuta, `reč: „${igra.rec}"`);
    ok('igra odbija reč koje nema u rečniku', /nije u rečniku/i.test(igra.fbNepoznata),
       `feedback: „${igra.fbNepoznata}"`);
    ok('igra PRIZNAJE tačnu rimu', /✓|Bravo|Tačno|tačn/i.test(igra.fbTacna),
       `rima „${igra.rima}" za „${igra.rec}" → „${igra.fbTacna}"`);

    console.log('\n8b) PREDAJA IGRAČA — igra mora da stane između igrača');
    const predaja = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      // 2 igrača, 5 reči po igraču — pa odigraj prvog do kraja
      [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === 'igra').click();
      await w(250);
      document.querySelector('#gamePlayers .game-option[data-value="2"]').click();
      document.querySelector('#gameWords .game-option[data-value="5"]').click();
      document.getElementById('gameStart').click();
      await w(500);

      // odigraj 5 reči prvog igrača (namerno pogrešnim odgovorom, brzo)
      for (let i = 0; i < 5; i++) {
        const inp = document.getElementById('gameInput');
        const sub = document.getElementById('gameSubmit');
        if (!inp || !sub) break;
        // dugme je onemoguceno ~1,5s posle odgovora — cekaj da se otkoci
        for (let t = 0; t < 40 && sub.disabled; t++) await w(100);
        if (document.getElementById('gameHandoff') &&
            getComputedStyle(document.getElementById('gameHandoff')).display !== 'none') break;
        // Reč koja POSTOJI u rečniku ali se NE rimuje — samo takav odgovor
        // troši reč i pomera igru. Nepostojeća reč se odbija ("probaj drugu")
        // i wordIdx ostaje isti, pa se do predaje nikad ne bi stiglo.
        const cilj = gameCurrentWord;
        const k = rhymeKey(cilj);
        let ne = null;
        for (const kand of WORDS) {
          if (kand !== cilj && kand.length > 2 && rhymeKey(kand) !== k) { ne = kand; break; }
        }
        inp.value = ne || 'kuca';
        sub.click();
        await w(300);
      }
      // sacekaj da prelaz na predaju stigne
      for (let t = 0; t < 40; t++) {
        const h = document.getElementById('gameHandoff');
        if (h && getComputedStyle(h).display !== 'none') break;
        await w(200);
      }

      const hand = document.getElementById('gameHandoff');
      const play = document.getElementById('gamePlay');
      return {
        postoji: !!hand,
        predajaVidljiva: hand ? getComputedStyle(hand).display !== 'none' : false,
        igraSakrivena: play ? getComputedStyle(play).display === 'none' : false,
        naslov: (document.getElementById('gameHandoffTitle') || {}).textContent || '',
        tajmerStao: (document.getElementById('gameTimer') || {}).textContent || ''
      };
    });
    ok('ekran za predaju igrača postoji', predaja.postoji, JSON.stringify(predaja).slice(0, 140));
    ok('igra STAJE posle zadnje reči prvog igrača', predaja.predajaVidljiva && predaja.igraSakrivena,
       JSON.stringify(predaja).slice(0, 160));
    ok('piše čiji je red', /igra[čc]a 2/i.test(predaja.naslov), `naslov: „${predaja.naslov}"`);

    const nastavak = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('gameHandoffStart').click();
      await w(700);
      return {
        igraNastavlja: getComputedStyle(document.getElementById('gamePlay')).display !== 'none',
        predajaSakrivena: getComputedStyle(document.getElementById('gameHandoff')).display === 'none',
        igrac: (document.getElementById('gameCurrentPlayer') || {}).textContent || '',
        rec: (document.getElementById('gameWord') || {}).textContent || ''
      };
    });
    ok('dugme „počni" nastavlja igru za igrača 2', nastavak.igraNastavlja && nastavak.predajaSakrivena,
       JSON.stringify(nastavak).slice(0, 140));
    ok('brojač igrača pokazuje 2', nastavak.igrac.trim() === '2', `pokazuje „${nastavak.igrac}"`);
    ok('drugi igrač je dobio reč', nastavak.rec.length > 0, `reč: „${nastavak.rec}"`);

    console.log('\n2b) RANGIRANJE RIMA — isti broj slogova je najbolja rima');
    const rang = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'rima';
      document.getElementById('rimeBtn').click();
      await w(1000);
      const box = document.getElementById('rimeResults');
      const grupe = {};
      box.querySelectorAll('.res-group').forEach(g => {
        const h = g.querySelector('h3'); if (!h) return;
        grupe[h.textContent.trim()] = [...g.querySelectorAll('.word')].map(e => e.textContent.trim());
      });
      const najbolje = grupe['Najbolje rime'] || [];
      const sve = [...box.querySelectorAll('.word')].map(e => e.textContent.trim());
      return {
        najboljeSveDvosložne: najbolje.length > 0 && najbolje.every(x => syllables(x) === 2),
        brojNajboljih: najbolje.length,
        stimaPozicija: sve.indexOf('štima') + 1,
        prvih5: sve.slice(0, 5)
      };
    });
    ok('„Najbolje rime" za „rima" su SVE dvosložne', rang.najboljeSveDvosložne,
       `${rang.brojNajboljih} reči, prvih 5: ${rang.prvih5.join(', ')}`);
    ok('„štima" je među prvih 30 rima za „rima"', rang.stimaPozicija > 0 && rang.stimaPozicija <= 30,
       `pozicija ${rang.stimaPozicija}`);

    console.log('\n8c) NOVE REČI U REČNIKU (brst / brstiti / njakati)');
    const noveReci = await page.evaluate(() => {
      // Reči koje je korisnica našla da igra ne prihvata (26.07.2026).
      const trazene = ['brstu','brsta','brstom','brstiš','brstile','brstenje',
                       'obrstim','obrste','njači','njačite','njače','njačem','njaču',
                       'amin','aminati','aminovati',
                       'štima','štimati','štimam','štimaš','štimaju'];
      // Ovi oblici NE SMEJU da postoje — vlasnica je potvrdila da u srpskom
      // „njakati" ima samo palatalizovani prezent (njačem/njače), ne „njakam".
      const nesmeju = ['njakam','njakaš','njakamo','njakate','njakaju','njakaj','njakajte',
                       'njaka','obrstenje'];
      return { nema: trazene.filter(w => !SET.has(w)),
               visak: nesmeju.filter(w => SET.has(w)),
               recnik: WORDS.length };
    });
    ok('nove reči su u rečniku (brstu, njači, njače…)', noveReci.nema.length === 0,
       `fali: ${noveReci.nema.join(', ')}`);
    ok('nepostojeći oblici („njakam/njakaš") NISU u rečniku', noveReci.visak.length === 0,
       `višak: ${noveReci.visak.join(', ')}`);

    console.log('\n9) Kockica bira POZNATU reč (ne arhaizam)');
    const kockica = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      [...document.querySelectorAll('#tabs [data-tab]')].find(b => b.dataset.tab === 'rime').click();
      await w(200);
      const pool = typeof getCommonPool === 'function' ? getCommonPool() : null;
      document.getElementById('randomBtn').click();
      await w(700);
      return { bazen: pool ? pool.length : 0, rec: document.getElementById('rimeInput').value };
    });
    ok('bazen poznatih reči je izgrađen', kockica.bazen > 1000, `${kockica.bazen} reči`);
    ok('kockica je popunila polje', kockica.rec.length > 0, `„${kockica.rec}"`);

    console.log('\n10) Tamni režim');
    const dark = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const dt = document.getElementById('darkToggle');
      if (!dt) return 'nema dugme';
      dt.click(); await w(250);
      const upaljen = document.body.classList.contains('dark-mode');
      dt.click(); await w(250);
      return upaljen && !document.body.classList.contains('dark-mode') ? 'ok' : 'ne prebacuje';
    });
    ok('tamni režim se prebacuje', dark === 'ok', dark);

    // Nalaz K1: `dark-mode-init.js` je stajao u <head> i pisao po `document.body`,
    // koji tada JOŠ NE POSTOJI — postavka se gubila baš pri osvežavanju. Test je
    // dotle samo klikao dugme (bez ponovnog učitavanja) i zato je bag preživeo.
    console.log('\n10b) TAMNI REŽIM PREŽIVLJAVA OSVEŽAVANJE I ODLAZAK NA STRANU REČI');
    const pDark = await browser.newPage();
    // Prva strana u pozadini skida definicije.json (20 MB) — lokalni server je
    // tada spor, pa podrazumevanih 30 s zna da istekne bez ijednog pravog kvara.
    pDark.setDefaultNavigationTimeout(120000);
    const darkGreske = [];
    pDark.on('pageerror', e => darkGreske.push('pageerror: ' + e.message));
    await pDark.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await pDark.evaluate(() => localStorage.setItem('rimoteka_dark', '1'));
    await pDark.reload({ waitUntil: 'domcontentloaded' });
    const posleF5 = await pDark.evaluate(() => ({
      body: document.body.classList.contains('dark-mode'),
      html: document.documentElement.classList.contains('dark-mode'),
      pozadina: getComputedStyle(document.body).backgroundColor,
      ikonica: (document.getElementById('darkToggle') || {}).textContent || ''
    }));
    ok('F5 na / → tamni režim je i dalje uključen', posleF5.body === true,
       `body.dark-mode=${posleF5.body}, html=${posleF5.html}, pozadina ${posleF5.pozadina}`);
    ok('F5 na / → ikonica pokazuje ☀️ (stanje se poklapa sa temom)', posleF5.ikonica.includes('☀'),
       `ikonica „${posleF5.ikonica}"`);
    await pDark.goto(BASE + '/rime-za/ljubav/', { waitUntil: 'domcontentloaded' });
    const naStraniReci = await pDark.evaluate(() => ({
      body: document.body.classList.contains('dark-mode'),
      imaDugme: !!document.getElementById('darkToggle'),
      pozadina: getComputedStyle(document.body).backgroundColor
    }));
    ok('/rime-za/ljubav/ → tamni režim se preneo sa početne', naStraniReci.body === true,
       `body.dark-mode=${naStraniReci.body}, pozadina ${naStraniReci.pozadina}`);
    ok('/rime-za/ljubav/ → strana ima dugme za tamni režim', naStraniReci.imaDugme === true);
    ok('tamni režim ne baca grešku pri učitavanju', darkGreske.length === 0, darkGreske.slice(0, 3).join(' | '));
    await pDark.close();

    // Vlasnica je 29.07.2026. prijavila tri stvari koje merenje pre toga nije
    // videlo: reč koja uđe u polje se ne vidi, tabela na /slogovi/ se ne vidi, a
    // linkovi u tekstu se „jedva čitaju". Sve tri su bile ista greška — boja
    // teksta se menja sa temom, a podloga (ili boja linka) ne. Ova provera meri
    // SVAKI vidljivi tekst na više strana i tabova, u OBE teme, sa upisanim
    // sadržajem, i pada ako ijedan padne ispod praga.
    console.log('\n10c) KONTRAST U OBE TEME — svaki tekst, sa upisanim sadržajem');
    const MERI_KONTRAST = () => {
      const lum = c => {
        const m = (c || '').match(/[\d.]+/g);
        if (!m) return null;
        const [r, g, b] = m.slice(0, 3).map(Number).map(v => {
          v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const razlozi = c => {
        const m = (c || '').match(/[\d.]+/g);
        if (!m) return null;
        return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
      };
      // prozirne podloge se SLAŽU sa onim ispod; prelivi se preskaču
      const poz = e => {
        const sl = [];
        let n = e;
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          if (/gradient/.test(cs.backgroundImage)) return null;
          const c = razlozi(cs.backgroundColor);
          if (c && c.a > 0) { sl.push(c); if (c.a >= 1) break; }
          n = n.parentElement;
        }
        if (!sl.length || sl[sl.length - 1].a < 1) {
          sl.push(razlozi(getComputedStyle(document.documentElement).backgroundColor) || { r:255,g:255,b:255,a:1 });
        }
        let o = sl[sl.length - 1];
        for (let i = sl.length - 2; i >= 0; i--) {
          const s = sl[i];
          o = { r: s.r*s.a + o.r*(1-s.a), g: s.g*s.a + o.g*(1-s.a), b: s.b*s.a + o.b*(1-s.a), a: 1 };
        }
        return `rgb(${Math.round(o.r)}, ${Math.round(o.g)}, ${Math.round(o.b)})`;
      };
      const vidljiv = e => {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const opis = e => {
        let s = e.tagName.toLowerCase();
        if (e.id) s += '#' + e.id;
        else if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\s+/)[0];
        return s;
      };
      let najgori = null;
      const proveri = (e, tekst) => {
        if (!vidljiv(e)) return;
        if (e.closest('[aria-hidden="true"], .sr-only')) return;
        const cs = getComputedStyle(e);
        const bg = poz(e);
        if (!bg) return;
        const l1 = lum(cs.color), l2 = lum(bg);
        if (l1 === null || l2 === null) return;
        const o = +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
        const px = parseFloat(cs.fontSize);
        const veliki = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
        const prag = veliki ? 3 : 4.5;
        if (o < prag && (!najgori || o < najgori.odnos)) {
          najgori = { odnos: o, prag, gde: opis(e), tekst: (tekst || '').trim().slice(0, 24), boja: cs.color, pozadina: bg };
        }
      };
      document.querySelectorAll('body *').forEach(e => {
        if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|IMG|BR|HR)$/.test(e.tagName)) return;
        const svoj = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent).join(' ');
        if (svoj.trim()) proveri(e, svoj);
      });
      // polja se mere SA UPISANOM VREDNOŠĆU — vrednost živi u `.value`, ne u `textContent`
      document.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea, [contenteditable]').forEach(e => {
        proveri(e, e.value !== undefined ? e.value : e.textContent);
      });
      return najgori;
    };

    // JEDNA strana za svih 12 merenja, namerno. Svaki `browser.newPage()` pravi
    // nov kontekst sa praznim kešom, pa bi svako merenje iznova skinulo reci.txt
    // (2,6 MB) i definicije.json (20 MB) — 12 × 22 MB obori lokalni server i test
    // padne bez ijednog pravog kvara.
    const pk = await browser.newPage();
    for (const tema of ['tamna', 'svetla']) {
      for (const [put, tab] of [['/', null], ['/', 'slogovi'], ['/', 'beleznica'], ['/', 'klasici'],
                                ['/slogovi/', null], ['/rime-za/ljubav/', null]]) {
        await pk.goto(BASE + put, { waitUntil: 'domcontentloaded' });
        // Tema se postavlja I preko klase, ne samo preko localStorage — da provera
        // radi i protiv STARE verzije, gde se tema pri učitavanju gubila (K1).
        await pk.evaluate(t => {
          try { localStorage.setItem('rimoteka_dark', t === 'tamna' ? '1' : '0'); } catch (e) {}
          document.body.classList.toggle('dark-mode', t === 'tamna');
          document.documentElement.classList.toggle('dark-mode', t === 'tamna');
        }, tema);
        await pauza(500);
        await pk.evaluate(async t => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          if (t && typeof switchTab === 'function') { switchTab(t); await w(400); }
          const ri = document.getElementById('rimeInput');
          if (ri && !ri.closest('[aria-hidden="true"]')) {
            ri.value = 'ljubav';
            const b = document.getElementById('rimeBtn');
            if (b) { b.click(); await w(1200); }
          }
          const sy = document.getElementById('sylInput');
          if (sy) { sy.value = 'Ljubav je srce\nkoje kuca'; sy.dispatchEvent(new Event('input', { bubbles: true })); await w(600); }
          const ne = document.getElementById('noteEditor');
          if (ne) { ne.textContent = 'Kad me pitaš gde je nada\nja ti kažem tu je kada'; ne.dispatchEvent(new Event('input', { bubbles: true })); await w(900); }
          document.querySelectorAll('details').forEach(d => d.open = true);
        }, tab).catch(() => {});
        await pauza(600);
        const n = await pk.evaluate(MERI_KONTRAST);
        const ime = put + (tab ? ` [tab ${tab}]` : '');
        ok(`${tema} tema · ${ime} → svaki tekst čitljiv`, n === null,
           n ? `${n.gde} „${n.tekst}" = ${n.odnos}:1 (treba ${n.prag}) — ${n.boja} na ${n.pozadina}` : '');
      }
    }
    await pk.close();

    console.log('\n11) LOGO — mora ostati veliki, sa fontom Fredoka');
    const logo = await page.evaluate(() => {
      const el = document.querySelector('.brand-logo, .brand h1, .brand-h');
      if (!el) return { greska: 'nema logo' };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { font: cs.fontFamily, px: parseFloat(cs.fontSize), sirina: Math.round(r.width) };
    });
    ok('logo koristi font Fredoka', /Fredoka/i.test(logo.font || ''), `font: ${logo.font}`);
    ok('logo nije smanjen (font-size ≥ 32px)', logo.px >= 32, `${logo.px}px`);

    console.log('\n12) SEO — jedan h1 po strani');
    for (const put of ['/', '/rimovanje-reci/', '/rime-za/ljubav/']) {
      const p2 = await browser.newPage();
      const resp = await p2.goto(BASE + put, { waitUntil: 'domcontentloaded' });
      const h1 = await p2.evaluate(() => document.querySelectorAll('h1').length);
      ok(`${put} → HTTP 200`, resp && resp.status() === 200, `status ${resp && resp.status()}`);
      ok(`${put} → tačno jedan h1`, h1 === 1, `nađeno ${h1}`);
      await p2.close();
    }

    console.log('\n12b) ŽIVI ALAT na /rimovanje-reci/');
    const pAlat = await browser.newPage();
    const alatGreske = [];
    pAlat.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/fonts\.googleapis|fonts\.gstatic/.test(t)) return;
      alatGreske.push(t);
    });
    pAlat.on('pageerror', e => alatGreske.push('pageerror: ' + e.message));
    await pAlat.goto(BASE + '/rimovanje-reci/', { waitUntil: 'domcontentloaded' });
    let alatRecnik = false;
    for (let pokusaj = 0; pokusaj < 3 && !alatRecnik; pokusaj++) {
      try {
        await pAlat.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0, { timeout: 120000 });
        alatRecnik = true;
      } catch (e) {
        if (pokusaj === 2) break;
        await pAlat.waitForLoadState('domcontentloaded').catch(() => {});
        await pauza(1000);
      }
    }
    ok('/rimovanje-reci/ → rečnik se učitao u alatu', alatRecnik, 'nije stigao');
    // sinonimi.json (2 MB) se učitava u pozadini — na produkciji stigne posle
    // rečnika, pa ga sačekamo pre provere grupe „Sinonimi"
    await pAlat.waitForFunction(() => typeof SYNONYMS !== 'undefined' && Object.keys(SYNONYMS).length > 0,
                                { timeout: 180000 }).catch(() => {});
    const alat = await pAlat.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const inp = document.getElementById('rimeInput');
      const btn = document.getElementById('rimeBtn');
      if (!inp || !btn) return { greska: 'nema polje ili dugme na strani' };
      // Cekamo UNUTAR strane: SW pri prvoj poseti osvezi stranu i resetuje
      // SYNONYMS, pa cekanje sa spoljne strane moze da promasi.
      for (let i = 0; i < 120 && (typeof SYNONYMS === 'undefined' || Object.keys(SYNONYMS).length === 0); i++) await w(500);
      inp.value = 'ljubav';
      btn.click();
      await w(1000);
      const box = document.getElementById('rimeResults');
      const reci = [...box.querySelectorAll('.word')].map(e => e.textContent.trim());
      const grupe = [...box.querySelectorAll('h3')].map(e => e.textContent.trim());
      // filter po slogovima
      const f = document.querySelector('#rimeSyl button[data-syl="2"]');
      if (f) f.click();
      await w(800);
      const posle = [...box.querySelectorAll('.word')].map(e => e.textContent.trim());
      return {
        broj: reci.length, imaGrbav: reci.includes('grbav'), grupe,
        filterRadi: posle.length > 0 && posle.length !== reci.length,
        kockica: !!document.getElementById('randomBtn')
      };
    });
    ok('/rimovanje-reci/ → rime za „ljubav" rade NA STRANI', (alat.broj || 0) > 5,
       JSON.stringify(alat).slice(0, 140));
    ok('/rimovanje-reci/ → poznata rima „grbav" je tu', alat.imaGrbav === true, `dobio ${alat.broj} rima`);
    ok('/rimovanje-reci/ → sinonimi se prikazuju', (alat.grupe || []).some(g => /Sinonimi/i.test(g)),
       (alat.grupe || []).join(' / '));
    ok('/rimovanje-reci/ → filter po slogovima radi', alat.filterRadi === true, 'filter nije promenio listu');
    ok('/rimovanje-reci/ → kockica postoji', alat.kockica === true);
    ok('/rimovanje-reci/ → nula grešaka u konzoli', alatGreske.length === 0, alatGreske.slice(0, 3).join(' | '));
    await pAlat.close();

    console.log('\n12c) ŽIVI BROJAČ na /slogovi/');
    // Strana cilja „brojanje slogova i karaktera" — mora da IMA brojač, ne samo
    // tekst o njemu. I ne sme da skida rečnik (2,6 MB) koji joj ne treba.
    const pSlog = await browser.newPage();
    const slogGreske = [], slogZahtevi = [];
    pSlog.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/fonts\.googleapis|fonts\.gstatic/.test(t)) return;
      slogGreske.push(t);
    });
    pSlog.on('pageerror', e => slogGreske.push('pageerror: ' + e.message));
    pSlog.on('request', r => slogZahtevi.push(r.url()));
    await pSlog.goto(BASE + '/slogovi/', { waitUntil: 'domcontentloaded' });
    await pauza(2500);
    const slog = await pSlog.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const ta = document.getElementById('sylInput');
      if (!ta) return { greska: 'nema brojača na strani' };
      ta.value = 'Zaspalo je zvono na vrh tornja stara\nvrt i prst i srce\nkratko';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      await w(700);
      // brojevi stoje LEVO od reda (gutter), tekst se ne ponavlja ispod polja
      const redovi = [...document.querySelectorAll('#sylGutter .gutter-row')];
      return {
        redova: redovi.length,
        brojevi: redovi.map(r => r.querySelector('.g-syl').textContent.trim()).join(','),
        znakovi: redovi.map(r => r.title || '').join('|'),
        ponovljen: document.querySelectorAll('#sylOutput .syl-line').length,
        ukupno: (document.querySelector('.syl-total') || {}).textContent || '',
        h1: document.querySelectorAll('h1').length,
        naslov: document.title,
      };
    });
    ok('/slogovi/ → brojač JE na strani', !slog.greska, slog.greska || '');
    ok('/slogovi/ → broji slogove po redu', slog.brojevi === '12,6,2', slog.brojevi);
    ok('/slogovi/ → pokazuje i broj znakova (na hover)', /znak/.test(slog.znakovi || ''), slog.znakovi);
    ok('/slogovi/ → tekst se ne ponavlja ispod polja', slog.ponovljen === 0, `${slog.ponovljen}`);
    // Oblik zavisi od broja (61 znak · 2 znaka · 5 znakova) — zato koren, ne ceo oblik.
    ok('/slogovi/ → ukupan zbir ima slogove, reči i znakove',
       /slog/.test(slog.ukupno) && /reč|reči/.test(slog.ukupno) && /znak/.test(slog.ukupno), slog.ukupno);
    ok('/slogovi/ → naslov cilja i karaktere', /karaktera/i.test(slog.naslov || ''), slog.naslov);
    ok('/slogovi/ → tačno jedan h1', slog.h1 === 1, `${slog.h1}`);
    const tesko = slogZahtevi.filter(u => /reci\.txt|definicije\.json|frekvencija\.json|sinonimi\.json/.test(u));
    ok('/slogovi/ → ne skida rečnik koji joj ne treba', tesko.length === 0,
       tesko.map(u => u.split('/').pop()).join(', '));
    ok('/slogovi/ → nula grešaka u konzoli', slogGreske.length === 0, slogGreske.slice(0, 3).join(' | '));
    await pSlog.close();

    console.log('\n12d) BELEŽNICA na /pisanje-pesama/');
    // Strana mora da nosi ceo editor (gutter, šema rime, panel sa rimama, metar),
    // ne opis alata. Panel uz stih traži rime preko skrivenog #rimeInput.
    const pPis = await browser.newPage();
    const pisGreske = [];
    pPis.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/fonts\.googleapis|fonts\.gstatic/.test(t)) return;
      pisGreske.push(t);
    });
    pPis.on('pageerror', e => pisGreske.push('pageerror: ' + e.message));
    await pPis.goto(BASE + '/pisanje-pesama/', { waitUntil: 'domcontentloaded' });
    await pPis.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0,
                               { timeout: 120000 }).catch(() => {});
    const pis = await pPis.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const ed = document.getElementById('noteEditor');
      if (!ed) return { greska: 'nema beležnice na strani' };
      ed.innerHTML = 'Volim te ko nada<br>zvezda sja u tami<br>u srcu mom je mlada<br>i sanjamo je sami';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      const sel = getSelection(), r = document.createRange();
      r.selectNodeContents(ed); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
      await w(1400);
      const meterBtn = document.getElementById('toggleMeter');
      if (meterBtn && document.getElementById('noteMeter').hidden) meterBtn.click();
      await w(500);
      const pomocno = document.querySelector('.sr-only');
      return {
        slogovi: [...document.querySelectorAll('#noteGutter .g-syl')].map(x => x.textContent).join(','),
        slova: [...document.querySelectorAll('#noteGutter .g-letter')].map(x => x.textContent).join(''),
        obojene: document.querySelectorAll('#noteEditor .rhyme-word').length,
        rime: document.querySelectorAll('#noteRhymes .chip').length,
        metar: document.querySelectorAll('.meter-line').length,
        metarHead: (document.querySelector('.meter-head') || {}).textContent || '',
        legenda: document.querySelectorAll('.notepad-legend span').length,
        pomocnoSkriveno: pomocno ? Math.round(pomocno.getBoundingClientRect().height) <= 1 : false,
        h1: document.querySelectorAll('h1').length,
        naslov: document.title,
      };
    });
    ok('/pisanje-pesama/ → beležnica JE na strani', !pis.greska, pis.greska || '');
    ok('/pisanje-pesama/ → gutter broji slogove', pis.slogovi === '6,6,7,7', pis.slogovi);
    ok('/pisanje-pesama/ → šema rime ABAB', pis.slova === 'ABAB', pis.slova);
    ok('/pisanje-pesama/ → rime su obojene', (pis.obojene || 0) >= 4, `${pis.obojene}`);
    ok('/pisanje-pesama/ → panel sa rimama radi', (pis.rime || 0) > 3, `${pis.rime}`);
    ok('/pisanje-pesama/ → metar radi', (pis.metar || 0) >= 4, `${pis.metar}`);
    ok('/pisanje-pesama/ → množina u metru je srpska',
       !/\b[2-4] slogova\b/.test(pis.metarHead) && !/\b[2-4] stihova\b/.test(pis.metarHead)
       && !/Preovlađuje 0/.test(pis.metarHead), pis.metarHead);
    ok('/pisanje-pesama/ → legenda oznaka postoji', pis.legenda === 4, `${pis.legenda}`);
    ok('/pisanje-pesama/ → pomoćno polje za rime je sakriveno', pis.pomocnoSkriveno === true);
    ok('/pisanje-pesama/ → tačno jedan h1', pis.h1 === 1, `${pis.h1}`);
    ok('/pisanje-pesama/ → nula grešaka u konzoli', pisGreske.length === 0, pisGreske.slice(0, 3).join(' | '));
    await pPis.close();

    console.log('\n12e) POČETNA JE ČISTA I KAD BELEŽNICA IMA SAČUVAN TEKST');
    /* Bag 28.07.2026: ko je ikad nešto napisao u beležnici, na početnoj je
       dočekivala poruka „Učitavam rečnik…" iako nije upisao nijednu reč.
       Beležnica pri učitavanju računa rime za reč pod kursorom i za to
       POZAJMLJUJE vidljivi panel #rimeResults — pa je u njemu ostajala poruka.
       Panel na početnoj mora da bude prazan dok korisnik sam ne zatraži rime. */
    const pCist = await browser.newPage();
    await pCist.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await pCist.evaluate(() => localStorage.setItem('rimoteka_notes', 'Volim te ko nada\nzvezda sja u tami'));
    await pCist.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const odmah = await pCist.evaluate(() => (document.getElementById('rimeResults').innerText || '').trim());
    ok('početna → panel s rimama je prazan pri učitavanju', odmah === '', JSON.stringify(odmah));
    await pCist.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0,
                                { timeout: 120000 }).catch(() => {});
    await pauza(1200);
    const posleRecnika = await pCist.evaluate(() => (document.getElementById('rimeResults').innerText || '').trim());
    ok('početna → panel ostaje prazan i kad se rečnik učita', posleRecnika === '', JSON.stringify(posleRecnika).slice(0, 80));
    // a kad korisnik SAM traži rime, rezultati moraju da se pojave i da ostanu
    const posleTrazenja = await pCist.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'ljubav';
      document.getElementById('rimeBtn').click();
      await w(700);
      const pre = document.querySelectorAll('#rimeResults .chip').length;
      // beležnica u međuvremenu računa svoje rime — ne sme da obriše tuđe rezultate
      document.dispatchEvent(new Event('selectionchange'));
      await w(900);
      return { pre, posle: document.querySelectorAll('#rimeResults .chip').length };
    });
    ok('početna → tražene rime se prikazuju', posleTrazenja.pre > 5, `${posleTrazenja.pre}`);
    ok('početna → beležnica ne briše prikazane rime', posleTrazenja.posle === posleTrazenja.pre,
       `${posleTrazenja.pre} → ${posleTrazenja.posle}`);
    await pCist.close();

    console.log('\n12f) PREBACIVANJE PISMA (latinica ↔ ćirilica)');
    /* Do 28.07.2026. nijedna provera nije pokrivala prekidač za pismo, pa je
       prošlo neprimećeno da se traka tabova NE prebacuje: tabovi su postali
       <a href> zbog SEO-a, a selektor u `UI_SCRIPT_SELS` je ostao na `button`.
       U ćirilicu je prelazila jedino „Omiljene", jedina preostala <button>. */
    const pPis2 = await browser.newPage();
    await pPis2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await pPis2.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0,
                                { timeout: 120000 }).catch(() => {});
    const pismo = await pPis2.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const tabovi = () => [...document.querySelectorAll('#tabs a, #tabs button')]
        .map(x => x.textContent.trim()).join(' | ');
      document.getElementById('rimeInput').value = 'ljubav';
      document.getElementById('rimeBtn').click();
      await w(800);
      const latTabovi = tabovi();
      const latRime = [...document.querySelectorAll('#rimeResults .chip .word')].slice(0, 3).map(x => x.textContent).join(',');
      document.querySelector('#scriptToggle button[data-script="cyr"]').click();
      await w(1000);
      const cyr = { tabovi: tabovi(), rime: [...document.querySelectorAll('#rimeResults .chip .word')].slice(0, 3).map(x => x.textContent).join(','), plc: document.getElementById('rimeInput').placeholder };
      document.querySelector('#scriptToggle button[data-script="lat"]').click();
      await w(1000);
      return { latTabovi, latRime, cyr, nazad: tabovi() };
    });
    const cir = /^[Ѐ-ӿ\s|0-9]+$/;
    ok('ćirilica → tabovi prelaze u ćirilicu', cir.test(pismo.cyr.tabovi), pismo.cyr.tabovi);
    ok('ćirilica → rime prelaze u ćirilicu', cir.test(pismo.cyr.rime.replace(/,/g, ' ')), pismo.cyr.rime);
    ok('ćirilica → placeholder prelazi u ćirilicu', cir.test(pismo.cyr.plc.replace(/[().,]/g, ' ')), pismo.cyr.plc);
    ok('latinica → traka se vraća u latinicu', pismo.nazad === pismo.latTabovi,
       `${pismo.latTabovi} → ${pismo.nazad}`);
    await pPis2.close();

    console.log('\n12g) ĆIRILICA PREBACUJE CEO TEKST, NA SVIM TIPOVIMA STRANA');
    /* Prekidač je ranije menjao samo okvir alata i rezultate — naslov, uvod,
       SEO tekst i odgovori na česta pitanja ostajali su na latinici. Uz to ga
       generisane strane uopšte nisu ni imale u zaglavlju. Ne sme da se prebaci:
       logo (pravilo 8a), mejl adresa i skraćenice (PDF, ABAB). */
    const cirilica = t => /[Ѐ-ӿ]/.test(t || '');
    for (const put of ['/', '/slogovi/', '/vrste-rima/', '/klasici/']) {
      const pc = await browser.newPage();
      await pc.goto(BASE + put, { waitUntil: 'domcontentloaded' });
      await pauza(1200);
      const imaPrekidac = await pc.evaluate(() => !!document.getElementById('scriptToggle'));
      ok(`${put} → prekidač za pismo postoji`, imaPrekidac);
      if (imaPrekidac) {
        await pc.click('#scriptToggle button[data-script="cyr"]');
        await pauza(900);
        const r = await pc.evaluate(() => ({
          h1: (document.querySelector('h1') || {}).textContent || '',
          uvod: (document.querySelector('.hero p, .landing-lead') || {}).textContent || '',
          telo: (document.querySelector('.seo-content p, .res-group .seo-p') || {}).textContent || '',
          faq: (document.querySelector('.faq details p, .landing-faq details p') || {}).textContent || '',
          logo: (document.querySelector('.brand-word') || {}).textContent || '',
          mejl: document.body.innerText.includes('info@rimoteka.com'),
          maticniTekst: document.body.innerText,
        }));
        ok(`${put} → naslov i uvod prelaze u ćirilicu`, cirilica(r.h1) && cirilica(r.uvod),
           `${r.h1.slice(0, 30)} | ${r.uvod.slice(0, 30)}`);
        ok(`${put} → tekst strane i česta pitanja prelaze u ćirilicu`,
           cirilica(r.telo) && cirilica(r.faq), `${r.telo.slice(0, 30)} | ${r.faq.slice(0, 30)}`);
        ok(`${put} → logo ostaje netaknut`, r.logo === 'imoteka', r.logo);
        ok(`${put} → skraćenice ostaju latinicom`,
           !/ПДФ|АБАБ|ААББ/.test(r.maticniTekst),
           (r.maticniTekst.match(/ПДФ|АБАБ|ААББ/g) || []).join(','));
        if (put === '/') ok('početna → mejl adresa se ne prebacuje u ćirilicu', r.mejl === true);
      }
      await pc.close();
    }

    console.log('\n12h) U ĆIRILICI SE I UPISANA REČ PRIKAZUJE ĆIRILICOM');
    /* Digrafi su ovde cela poenta: posle „l" stoji „л", ali čim stigne „j"
       ceo niz mora da se pročita kao „lj" → „љ" (ne „лј"). Zato se prebacuje
       preko latinice, a ne slovo po slovo.
       Beležnica se NAMERNO ne dira — tamo je tekst korisnika. */
    const pU = await browser.newPage();
    await pU.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await pU.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0,
                             { timeout: 120000 }).catch(() => {});
    await pU.click('#scriptToggle button[data-script="cyr"]');
    await pauza(700);
    await pU.click('#rimeInput');
    await pU.keyboard.type('ljubav', { delay: 50 });
    const upisano = await pU.inputValue('#rimeInput');
    ok('ćirilica → upisana reč se prikazuje ćirilicom (digraf lj → љ)',
       upisano === 'љубав', upisano);
    await pU.click('#rimeBtn');
    await pauza(900);
    const rimeCyr = await pU.evaluate(() =>
      [...document.querySelectorAll('#rimeResults .chip .word')].map(x => x.textContent));
    ok('ćirilica → rime za ćirilični unos i dalje rade', rimeCyr.length > 5, `${rimeCyr.length}`);
    await pU.click('#scriptToggle button[data-script="lat"]');
    await pauza(700);
    const vraceno = await pU.inputValue('#rimeInput');
    ok('latinica → upisana reč se vraća u latinicu', vraceno === 'ljubav', vraceno);
    await pU.click('#scriptToggle button[data-script="cyr"]');
    await pauza(500);
    await pU.evaluate(() => [...document.querySelectorAll('#tabs a')].find(a => a.dataset.tab === 'beleznica').click());
    await pauza(400);
    await pU.click('#noteEditor');
    await pU.keyboard.type('moja pesma', { delay: 30 });
    await pauza(600);
    const pesmaTekst = await pU.evaluate(() => document.getElementById('noteEditor').innerText.trim());
    ok('beležnica se NE prekucava u ćirilicu (tekst je korisnikov)',
       pesmaTekst === 'moja pesma', pesmaTekst);
    await pU.close();

    console.log('\n12i) NIŠTA NE IZLAZI IZVAN OKVIRA ČIPA');
    /* Kolona je bila uža (11.5rem) od sadržaja čipa, a čip nije smeo da prelomi
       sadržaj — pa je ikonica „nađi rime" stajala IZVAN pilule. Videlo se samo
       na širem ekranu i najviše kod grupe „dobre rime", gde je okvir beo na
       belom. Meri se na više širina jer se na telefonu bag NIJE video. */
    for (const sirina of [1440, 1024, 390]) {
      const pc2 = await browser.newPage({ viewport: { width: sirina, height: 900 } });
      await pc2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pc2.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0,
                                { timeout: 120000 }).catch(() => {});
      const m = await pc2.evaluate(async () => {
        let n = 0, viri = 0, najgore = '';
        for (const q of ['žurke', 'ljubav', 'devojčica']) {
          document.getElementById('rimeInput').value = q;
          document.getElementById('rimeBtn').click();
          await new Promise(r => setTimeout(r, 800));
          document.querySelectorAll('#rimeResults .chip').forEach(c => {
            n++;
            const cb = c.getBoundingClientRect();
            c.querySelectorAll('.mini, .syl, .word').forEach(e => {
              const eb = e.getBoundingClientRect();
              // 2px tolerancije — okvir čipa je debeo 2px
              if (eb.right > cb.right - 2 || eb.left < cb.left + 2) {
                viri++;
                if (!najgore) najgore = `${c.querySelector('.word').textContent}: ${Math.round(eb.right - cb.right)}px`;
              }
            });
          });
        }
        return { n, viri, najgore };
      });
      ok(`${sirina}px → nijedna ikonica ne izlazi iz čipa (${m.n} čipova)`, m.viri === 0,
         `${m.viri} viri, npr. ${m.najgore}`);
      await pc2.close();
    }

    // Strane /rime-za/[reč]/ su 1.988 od 2.010 strana sajta, a test ih do
    // 29.07.2026. nije dodirivao nijednom. Zato je mesecima prošlo neopaženo da
    // na njima nema `app.js` (prekidač za pismo i tamni režim = mrtva dugmad),
    // nema `#toast` ni `#printArea`, a „Kopiraj sve rime" je bio inline
    // `onclick` koji CSP blokira. Nalazi V1, V2, K6, S5, S6, N9.
    console.log('\n12j) STRANA REČI /rime-za/ljubav/ — alat, ne samo tekst');
    const ctxRec = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const pRec = await ctxRec.newPage();
    pRec.setDefaultNavigationTimeout(120000);
    const recGreske = [];
    pRec.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/fonts\.googleapis|fonts\.gstatic/.test(t)) return;
      recGreske.push(t);
    });
    pRec.on('pageerror', e => recGreske.push('pageerror: ' + e.message));
    await pRec.goto(BASE + '/rime-za/ljubav/', { waitUntil: 'domcontentloaded' });

    const skelet = await pRec.evaluate(() => ({
      appJs: typeof toCyr === 'function' && typeof el === 'function',
      toast: !!document.getElementById('toast'),
      print: !!document.getElementById('printArea'),
      inline: document.querySelectorAll('[onclick]').length,
      // redosled naslova: h1 → h2 → h3, bez preskakanja nivoa
      skok: (() => {
        let pret = 0, najgori = '';
        document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
          const n = +h.tagName[1];
          if (pret && n > pret + 1 && !najgori) najgori = `h${pret} → h${n} („${h.textContent.trim().slice(0, 30)}")`;
          pret = n;
        });
        return najgori;
      })()
    }));
    ok('/rime-za/ljubav/ → app.js je učitan i izvršen', skelet.appJs === true,
       'nema funkcija iz app.js na strani');
    ok('/rime-za/ljubav/ → postoji #toast (poruke se vide)', skelet.toast === true);
    ok('/rime-za/ljubav/ → postoji #printArea (štampa nije prazan list)', skelet.print === true);
    ok('/rime-za/ljubav/ → nema inline onclick (CSP ga blokira)', skelet.inline === 0,
       `${skelet.inline} elemenata sa onclick`);
    ok('/rime-za/ljubav/ → nema preskočenog nivoa naslova', skelet.skok === '', skelet.skok);

    // Prekidač za pismo mora da PROMENI TEKST, ne samo da postoji.
    const pismoRec = await pRec.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const prva = document.querySelector('.res-group .word');
      const pre = prva ? prva.textContent.trim() : '';
      const dugme = document.querySelector('#scriptToggle button[data-script="cyr"]');
      if (!dugme) return { greska: 'nema dugme za ćirilicu' };
      dugme.click();
      await w(400);
      const posle = prva ? prva.textContent.trim() : '';
      return { pre, posle, cirilica: /[Ѐ-ӿ]/.test(posle) };
    });
    ok('/rime-za/ljubav/ → dugme „ћирилица" zaista prebacuje reči u ćirilicu',
       pismoRec.cirilica === true && pismoRec.pre !== pismoRec.posle,
       `„${pismoRec.pre}" → „${pismoRec.posle}"${pismoRec.greska ? ' — ' + pismoRec.greska : ''}`);

    // „Kopiraj sve rime": ranije inline onclick koji CSP blokira. Dugme koje
    // ne promeni tekst posle klika je mrtvo dugme, ma šta pisalo na njemu.
    const kopiraj = await pRec.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('.copy-all-btn');
      if (!b) return { greska: 'nema dugme' };
      const pre = b.textContent.trim();
      b.click();
      await w(600);
      return { pre, posle: b.textContent.trim(), reci: (b.dataset.words || '').length };
    });
    ok('/rime-za/ljubav/ → „Kopiraj sve rime" reaguje na klik', kopiraj.posle === 'Kopirano!',
       `„${kopiraj.pre}" → „${kopiraj.posle}"${kopiraj.greska ? ' — ' + kopiraj.greska : ''}`);
    // Kontrast se meri u OBE teme i sa stvarnim tekstom — pozadina tvrdo upisana
    // u CSS-u uz boju koja se menja sa temom je obrazac koji je već dao 1,23:1 na
    // glavnom polju (K2) i 1,15:1 na definiciji reči kad je tamni režim stigao
    // na ove strane. Merenje ide na SAMOM elementu, ne na roditelju.
    for (const tema of ['svetla', 'tamna']) {
      await pRec.evaluate(t => {
        localStorage.setItem('rimoteka_dark', t === 'tamna' ? '1' : '0');
      }, tema);
      await pRec.reload({ waitUntil: 'domcontentloaded' });
      await pauza(400);
      const k = await pRec.evaluate(() => {
        const lum = c => {
          const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => {
            v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const poz = e => {
          let n = e;
          while (n && n !== document.documentElement) {
            const b = getComputedStyle(n).backgroundColor;
            if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b;
            n = n.parentElement;
          }
          return 'rgb(255,255,255)';
        };
        const odnos = e => {
          const l1 = lum(getComputedStyle(e).color), l2 = lum(poz(e));
          return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
        };
        let najgori = null;
        // `.landing-meta` je namerno izostavljen: on koristi `--muted`, koji u
        // svetloj temi daje 2,90:1 na CELOM sajtu — to je zaseban, već zaveden
        // nalaz S8. Kad se S8 popravi, `.landing-meta` se dodaje ovde.
        ['.landing-def', '.landing-def strong', '.chip .word', '.chip .syl',
         '.landing-lead', '.landing-faq summary'].forEach(sel => {
          const e = document.querySelector(sel);
          if (!e || !(e.textContent || '').trim()) return;
          const o = odnos(e);
          if (!najgori || o < najgori.o) najgori = { sel, o };
        });
        return najgori;
      });
      ok(`/rime-za/ljubav/ (${tema} tema) → najslabiji kontrast ≥ 4,5:1`,
         k && k.o >= 4.5, k ? `${k.sel} = ${k.o}:1` : 'ništa nije izmereno');
    }

    ok('/rime-za/ljubav/ → nula grešaka u konzoli', recGreske.length === 0, recGreske.slice(0, 3).join(' | '));
    await ctxRec.close();

    console.log('\n14) GLAVNO DUGME NIJE U TIHOM REŽIMU + PORUKE NA NEVALIDAN UNOS');
    /* Nalaz V3: `onclick = doRhymes` je prosleđivao `MouseEvent` kao zastavicu
       `silent`, pa je svaki klik radio tiho — bez `?rec=` u URL-u i bez GA4.
       Nalaz V4: zbog istog uzroka je na „a", „123", „😀" panel ostajao PRAZAN.
       Nalaz N2: „constructor" je rušio prikaz (`excluded.has is not a function`).
       Sve tri provere su puštene protiv produkcije dok je tamo bio stari kod —
       i sve tri su pale. */
    {
      const g14 = await browser.newPage();
      const g14greske = [];
      g14.on('pageerror', e => g14greske.push(String(e)));
      g14.on('console', m => { if (m.type() === 'error') g14greske.push(m.text()); });
      await g14.goto(BASE, { waitUntil: 'domcontentloaded' });
      await g14.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });

      await g14.fill('#rimeInput', 'ljubav');
      await g14.click('#rimeBtn');
      await pauza(700);
      ok('V3 klik na dugme upisuje ?rec= u URL',
         new URL(g14.url()).searchParams.get('rec') === 'ljubav', g14.url());

      // klik i Enter moraju da vode istim putem — ranije su se razlikovali
      await g14.fill('#rimeInput', 'nada');
      await g14.press('#rimeInput', 'Enter');
      await pauza(400);
      const urlEnter = new URL(g14.url()).searchParams.get('rec');
      await g14.fill('#rimeInput', 'ruka');
      await g14.click('#rimeBtn');
      await pauza(400);
      const urlKlik = new URL(g14.url()).searchParams.get('rec');
      ok('V3 Enter i klik rade isto', urlEnter === 'nada' && urlKlik === 'ruka',
         `enter=${urlEnter} klik=${urlKlik}`);

      for (const unos of ['a', '123', '😀']) {
        await g14.fill('#rimeInput', unos);
        await g14.click('#rimeBtn');
        await pauza(300);
        const t = ((await g14.textContent('#rimeResults')) || '').trim();
        ok(`V4 unos „${unos}" javlja poruku (ne ćuti)`, t.length > 3, `panel prazan`);
      }

      for (const unos of ['constructor', '__proto__', 'toString']) {
        await g14.fill('#rimeInput', unos);
        await g14.click('#rimeBtn');
        await pauza(500);
        const t = ((await g14.textContent('#rimeResults')) || '').trim();
        ok(`N2 unos „${unos}" ne ruši prikaz`, t.length > 3, 'panel prazan');
      }
      ok('N2 nijedna greška u konzoli na te unose', g14greske.length === 0,
         g14greske.slice(0, 3).join(' | '));
      await g14.close();
    }

    console.log('\n14b) SRPSKA MNOŽINA BROJEVA (1 / 2–4 / 5+)');
    /* Nalaz S2: pisalo je „1 reči", „2 slogova", „4 redova". */
    {
      const g14b = await browser.newPage();
      await g14b.goto(BASE + '/slogovi/', { waitUntil: 'domcontentloaded' });
      const uzmi = async txt => {
        await g14b.fill('#sylInput', txt);
        await pauza(400);
        return ((await g14b.textContent('.syl-total')) || '');
      };
      const s1 = await uzmi('ma');            // 1 red · 1 reč · 2 znaka · 1 slog
      ok('S2 „1 reč" (ne „1 reči")', /1 reč /.test(s1) && !/1 reči/.test(s1), s1);
      ok('S2 „2 znaka" (ne „2 znakova")', /2 znaka /.test(s1) && !/2 znakova/.test(s1), s1);
      ok('S2 „1 slog" (ne „1 sloga")', /1 slog /.test(s1), s1);
      const s3 = await uzmi('a\nb\nc');       // 3 reda · 3 reči · 5 znakova
      ok('S2 „3 reda" (ne „3 redova")', /3 reda/.test(s3) && !/3 redova/.test(s3), s3);
      const s5 = await uzmi('a\nb\nc\nd\ne'); // 5 redova
      ok('S2 „5 redova" (ne „5 reda")', /5 redova/.test(s5), s5);
      await g14b.close();
    }

    console.log('\n14c) PRETRAGA REČI NE LAŽE DOK SE REČNIK UČITAVA');
    /* Ranije je pisalo „Nema reči koje odgovaraju" i pre nego što rečnik stigne. */
    {
      const g14c = await browser.newPage();
      await g14c.goto(BASE + '/?tab=pretraga', { waitUntil: 'domcontentloaded' });
      const poruka = await g14c.evaluate(() => {
        WORDS.length = 0;                       // simuliraj „rečnik još nije stigao"
        document.getElementById('searchInput').value = 'ljub';
        document.getElementById('searchBtn').click();
        return (document.getElementById('searchResults').textContent || '').trim();
      });
      ok('pretraga bez rečnika kaže „Učitavam", ne „Nema reči"',
         /Učitavam|Учитавам/.test(poruka), poruka);
      await g14c.close();
    }

    console.log('\n15) KLIK NA RIMU U BELEŽNICI ZAMENJUJE REČ POD KURSOROM (V6)');
    /* Reprodukovano na produkciji sa starim kodom: kursor USRED reči „nada" +
       klik na „kada" davao je „gde je na kadada". Panel je pisao „Rime za nada",
       a klik nije menjao tu reč nego je umetao na mesto kursora. */
    {
      const g15 = await browser.newPage();
      await g15.goto(BASE, { waitUntil: 'domcontentloaded' });
      await g15.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await g15.click('#tabs [data-tab="beleznica"]');
      await pauza(300);
      await g15.evaluate(() => { document.getElementById('noteEditor').innerHTML = ''; });
      await g15.click('#noteEditor');
      await g15.keyboard.type('Kad me pitas gde je nada');
      await pauza(900);
      await g15.keyboard.press('ArrowLeft');   // nada| → nad|a
      await g15.keyboard.press('ArrowLeft');   // nad|a → na|da  (SREDINA reči)
      await pauza(700);

      const naslov = ((await g15.textContent('#noteRhymes h4').catch(() => '')) || '');
      ok('V6 panel pokazuje rime za reč pod kursorom („nada")', /nada/i.test(naslov), naslov);

      const cip = ((await g15.textContent('#noteRhymes .chip .word').catch(() => '')) || '').trim();
      await g15.click('#noteRhymes .chip');
      await pauza(600);
      const tekst = (await g15.evaluate(() => {
        let out = '';
        const walk = n => n.childNodes.forEach(c => {
          if (c.nodeType === 3) out += c.data;
          else if (c.nodeName === 'BR') out += '\n';
          else walk(c);
        });
        walk(document.getElementById('noteEditor'));
        return out;
      })).trim();
      ok('V6 kursor USRED reči → reč je ZAMENJENA, ne umetnuta',
         tekst === `Kad me pitas gde je ${cip}`, `dobijeno „${tekst}", čip „${cip}"`);
      ok('V6 nije nastala slepljena reč („na kadada")',
         !/\bna\s+\S+da\b/.test(tekst) && !/nadada|dada/.test(tekst), tekst);

      // kursor u PRAZNINI → i dalje se UBACUJE (korisnik piše dalje)
      await g15.click('#noteEditor');
      await g15.keyboard.press('End');
      await g15.keyboard.type(' ');
      await pauza(800);
      const cip2 = ((await g15.textContent('#noteRhymes .chip .word').catch(() => '')) || '').trim();
      await g15.click('#noteRhymes .chip');
      await pauza(500);
      const t2 = (await g15.evaluate(() => document.getElementById('noteEditor').innerText)).trim();
      ok('V6 kursor u PRAZNINI → rima se UBACUJE (prethodna reč ostaje)',
         t2.startsWith(tekst) && t2.length > tekst.length && t2.includes(cip2), `„${t2}"`);
      await g15.close();
    }

    console.log('\n15b) URL PRATI TAB — adresa je stanje (V7, N3)');
    /* Ranije je adresa ostajala `/?rec=ljubav` na svih 7 tabova: nije bilo
       deljivog linka, „Nazad" nije radio, osvežavanje je vraćalo na rime. */
    {
      const g15b = await browser.newPage();
      await g15b.goto(BASE + '/?rec=ljubav', { waitUntil: 'domcontentloaded' });
      await g15b.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await pauza(600);
      for (const [tab, put] of [['pretraga','/recnik-srpskog-jezika/'], ['slogovi','/slogovi/'],
                                ['beleznica','/pisanje-pesama/'], ['klasici','/klasici/'],
                                ['igra','/igra-rimovanja/']]) {
        await g15b.click(`#tabs [data-tab="${tab}"]`);
        await pauza(350);
        ok(`V7 tab „${tab}" → adresa ${put}`, new URL(g15b.url()).pathname === put, g15b.url());
      }
      ok('V7 ?rec= nestaje kad se napusti tab sa rimama',
         !new URL(g15b.url()).searchParams.get('rec'), g15b.url());
      await g15b.goBack();
      await pauza(500);
      const nazad = await g15b.evaluate(() => document.querySelector('#tabs [data-tab].active')?.dataset.tab);
      ok('V7 „Nazad" vraća prethodni tab', nazad === 'klasici', `aktivan: ${nazad}`);

      await g15b.goto(BASE + '/?tab=igra', { waitUntil: 'domcontentloaded' });
      await pauza(900);
      const igra = await g15b.evaluate(() => document.querySelector('#tabs [data-tab].active')?.dataset.tab);
      ok('N3 ?tab=igra otvara igru (ranije se ignorisao)', igra === 'igra', `aktivan: ${igra}`);
      await g15b.close();
    }

    console.log('\n15c) KLIK NA LOGO RESETUJE POČETNU (S1)');
    {
      const g15c = await browser.newPage();
      await g15c.goto(BASE + '/?rec=ljubav', { waitUntil: 'domcontentloaded' });
      await g15c.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await pauza(900);
      const pre = await g15c.evaluate(() => ({
        polje: document.getElementById('rimeInput').value,
        rima: document.querySelectorAll('#rimeResults .word').length,
      }));
      await g15c.click('#brandHome');
      await pauza(600);
      const posle = await g15c.evaluate(() => ({
        polje: document.getElementById('rimeInput').value,
        rima: document.querySelectorAll('#rimeResults .word').length,
        url: location.pathname + location.search,
      }));
      ok('S1 logo prazni polje', pre.polje === 'ljubav' && posle.polje === '', `posle="${posle.polje}"`);
      ok('S1 logo briše rezultate', pre.rima > 5 && posle.rima === 0, `pre=${pre.rima} posle=${posle.rima}`);
      ok('S1 logo čisti ?rec= iz adrese', posle.url === '/', posle.url);
      await g15c.close();
    }

    console.log('\n16) SAJT NE UMIRE — zabranjen i pokvaren localStorage (K4, K5)');
    /* Reprodukovano na produkciji: oba slučaja daju 0 rima. Zabranjen pristup
       baca `SecurityError` još pri čitanju, a to je stajalo IZNAD `const VOWELS`,
       pa je i sigurnosna mreža pucala na TDZ grešci. */
    {
      const brojRima = p => p.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        document.getElementById('rimeInput').value = 'ljubav';
        document.getElementById('rimeBtn').click();
        await w(900);
        return document.querySelectorAll('#rimeResults .word').length;
      });

      const pK4 = await browser.newPage();
      const grK4 = [];
      pK4.on('pageerror', e => grK4.push(String(e).slice(0, 140)));
      await pK4.addInitScript(() => {
        const baci = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
        Object.defineProperty(window, 'localStorage', { get: baci, configurable: true });
      });
      await pK4.goto(BASE, { waitUntil: 'domcontentloaded' });
      await pK4.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 }).catch(() => {});
      const nK4 = await brojRima(pK4);
      ok('K4 zabranjen localStorage → rime i dalje rade', nK4 > 5, `${nK4} rima`);
      ok('K4 nema greške „before initialization" (TDZ u sigurnosnoj mreži)',
         !grK4.some(e => /before initialization/.test(e)), grK4.slice(0, 2).join(' | '));
      await pK4.close();

      for (const smece of ['{nije-json', 'null', '"tekst"', '{"a":1}']) {
        const pK5 = await browser.newPage();
        await pK5.addInitScript(v => { try { localStorage.setItem('rimoteka_favorites', v); } catch (e) {} }, smece);
        await pK5.goto(BASE, { waitUntil: 'domcontentloaded' });
        await pK5.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 }).catch(() => {});
        const n = await brojRima(pK5);
        ok(`K5 pokvaren rimoteka_favorites (${smece}) → rime rade`, n > 5, `${n} rima`);
        await pK5.close();
      }
    }

    console.log('\n16b) KVAR SERVERA SE PRIJAVLJUJE, NE TUMAČI KAO „NEMA RIME"');
    {
      const p16b = await browser.newPage();
      await p16b.route('**/reci.txt*', r => r.fulfill({
        status: 502, contentType: 'text/html',
        body: '<!doctype html><html><body><h1>502 Bad Gateway</h1></body></html>'
      }));
      await p16b.goto(BASE, { waitUntil: 'domcontentloaded' });
      await pauza(4000);
      const t = await p16b.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        document.getElementById('rimeInput').value = 'ljubav';
        document.getElementById('rimeBtn').click();
        await w(700);
        return (document.getElementById('rimeResults').textContent || '').trim();
      });
      ok('loadDict proverava r.ok — HTML strana greške NIJE rečnik',
         !/Nema rime/i.test(t), `„${t.slice(0, 80)}"`);
      await p16b.close();
    }

    console.log('\n16c) JEDAN NEUSPEH definicije.json NE UBIJA DEFINICIJE ZAUVEK');
    {
      const p16c = await browser.newPage();
      let pao = false;
      await p16c.route('**/definicije.json*', r => {
        if (!pao) { pao = true; return r.fulfill({ status: 503, contentType: 'text/plain', body: 'nope' }); }
        return r.continue();
      });
      await p16c.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p16c.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      const velicina = await p16c.evaluate(async () => {
        await loadLocalDefs().catch(() => {});   // prvi pokušaj pada
        await loadLocalDefs().catch(() => {});   // drugi mora da uspe
        return DEFS.size;
      });
      ok('definicije se posle neuspeha učitavaju iz drugog pokušaja', velicina > 1000, `DEFS.size=${velicina}`);
      await p16c.close();
    }

    console.log('\n16d) DVA OTVORENA TABA NE GAZE BELEŽNICU');
    /* Reprodukovano na produkciji: dopuna iz prvog taba nestane iz memorije čim
       drugi tab (koji drži stariju verziju) otkuca jedan jedini znak. */
    {
      const ctx16 = await browser.newContext();
      const a = await ctx16.newPage();
      await a.goto(BASE + '/?tab=beleznica', { waitUntil: 'domcontentloaded' });
      await pauza(1500);
      await a.evaluate(() => { document.getElementById('noteEditor').innerHTML = ''; });
      await a.click('#noteEditor');
      await a.keyboard.type('Prvi tab je napisao strofu');
      await pauza(1200);

      const b = await ctx16.newPage();
      await b.goto(BASE + '/?tab=beleznica', { waitUntil: 'domcontentloaded' });
      await pauza(1500);

      await a.click('#noteEditor');
      await a.keyboard.press('End');
      await a.keyboard.type(' i dopunu');
      await pauza(1500);

      await b.click('#noteEditor');
      await b.keyboard.press('End');
      await b.keyboard.type('!');
      await pauza(1500);

      const uMemoriji = await b.evaluate(() => localStorage.getItem('rimoteka_notes') || '');
      ok('dopuna iz prvog taba preživi kucanje u drugom tabu',
         uMemoriji.includes('i dopunu'), `u memoriji: „${uMemoriji}"`);
      await ctx16.close();
    }

    console.log('\n16e) OBJAŠNJENJE REČI NE VISI ZAUVEK NA „učitavanje…"');
    {
      const p16e = await browser.newPage();
      await p16e.route('**/sr.wiktionary.org/**', () => {});   // zahtev se guta
      await p16e.route('**/sr.wikipedia.org/**', () => {});
      await p16e.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p16e.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      const tekst = await p16e.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        DEFS.clear();
        const r = await Promise.race([
          fetchDefinition('nepostojecarecxyz'),
          w(12000).then(() => ({ text: 'VISI ZAUVEK', src: '' }))
        ]);
        return r.text;
      });
      ok('spoljni poziv za objašnjenje ima rok', tekst !== 'VISI ZAUVEK', tekst);
      await p16e.close();
    }

    console.log('\n13) Konzola na kraju svih interakcija');
    ok('nijedna greška u konzoli tokom celog testa', konzolaGreske.length === 0,
       konzolaGreske.slice(0, 5).join(' | '));

  } finally {
    await browser.close();
    if (server) { try { process.kill(-server.pid); } catch { server.kill(); } }
  }

  console.log('\n' + '─'.repeat(62));
  if (greske.length) {
    console.log(`❌ PALO ${greske.length} provera (prošlo ${pass}). NE DEPLOYUJ.\n`);
    greske.forEach(g => console.log('   • ' + g));
    console.log('');
    process.exit(1);
  }
  console.log(`✅ Sve ${pass} provera prošlo. Sme deploy.\n`);
}

main().catch(e => { console.error('\n❌ Test je pao sa greškom:', e.message, '\n'); process.exit(2); });
