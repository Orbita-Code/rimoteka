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
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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

async function main() {
  let server;
  if (LOKALNO) {
    server = spawn('python3', ['-m', 'http.server', String(PORT)], {
      cwd: path.join(ROOT, 'public'), stdio: 'ignore'
    });
    await pauza(1500);
  }

  const browser = await chromium.launch();
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
        const btn = [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === tab);
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
      [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'pretraga').click();
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
      [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'slogovi').click();
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
      [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'beleznica').click();
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
      const rows = [...document.querySelectorAll('.gutter-row')];
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
      [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'igra').click();
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
      let rima = null;
      if (typeof rhymeKey === 'function') {
        const k = rhymeKey(cilj);
        for (const w2 of WORDS) {
          if (w2 !== cilj && rhymeKey(w2) === k) { rima = w2; break; }
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
      [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'igra').click();
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
      [...document.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'rime').click();
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

    console.log('\n13) Konzola na kraju svih interakcija');
    ok('nijedna greška u konzoli tokom celog testa', konzolaGreske.length === 0,
       konzolaGreske.slice(0, 5).join(' | '));

  } finally {
    await browser.close();
    if (server) server.kill();
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
