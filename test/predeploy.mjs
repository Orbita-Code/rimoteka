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
        await page.waitForFunction('typeof WORDS !== "undefined" && WORDS.length > 0', { timeout: 120000 });
        recnikStigao = true;
      } catch (e) {
        if (pokusaj === 2) break;
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await pauza(1000);
      }
    }
    ok('rečnik je stigao (uz toleranciju na osvežavanje od SW-a)', recnikStigao, 'nije stigao ni posle 3 pokušaja');
    const brojReci = await page.evaluate('typeof WORDS !== "undefined" ? WORDS.length : 0');
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
    await page.waitForFunction('typeof SYNONYMS !== "undefined" && Object.keys(SYNONYMS).length > 0', { timeout: 180000 })
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
      const h1 = await p2.evaluate('document.querySelectorAll("h1").length');
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
        await pAlat.waitForFunction('typeof WORDS !== "undefined" && WORDS.length > 0', { timeout: 120000 });
        alatRecnik = true;
      } catch (e) {
        if (pokusaj === 2) break;
        await pAlat.waitForLoadState('domcontentloaded').catch(() => {});
        await pauza(1000);
      }
    }
    ok('/rimovanje-reci/ → rečnik se učitao u alatu', alatRecnik, 'nije stigao');
    const alat = await pAlat.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const inp = document.getElementById('rimeInput');
      const btn = document.getElementById('rimeBtn');
      if (!inp || !btn) return { greska: 'nema polje ili dugme na strani' };
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
