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
  /* Greške iz konzole se skupljaju sa SVIH strana, ne samo sa prve.
     Nalaz iz dopune audita: sekcija 13 je tvrdila da pokriva „ceo test", a
     osluškivač je bio zakačen samo na prvu stranu — sve što je puklo na
     `/rimovanje-reci/`, `/slogovi/`, `/pisanje-pesama/` ili na stranama reči
     prolazilo je nezapaženo. Sada svaka strana koju test otvori prijavljuje. */
  const konzolaGreske = [];
  /* Neke provere NAMERNO ruše mrežu (502 na `reci.txt`, 503 na `definicije.json`,
     namerni 404, brza navigacija koja prekine `fetch` u letu). Te greške je test
     sam izazvao, pa ih sekcija 13 ne sme brojati kao kvar sajta — inače provera
     „nula grešaka u konzoli" pada uvek i prestane da išta znači.
     Bitno: obrasci se vezuju za TAČNU stranu koja kvar izaziva, ne globalno —
     da ista greška na nekoj drugoj strani i dalje bude prijavljena. */
  function ocekujGreske(p, ...obrasci) { p.__ocekivano = obrasci; return p; }
  function prijaviGreske(p, gde) {
    const dozvoljeno = t => (p.__ocekivano || []).some(re => re.test(t));
    p.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // fontovi sa googleapis su blokirani u headless okruženju — nije naš bug
      if (/fonts\.googleapis|fonts\.gstatic|net::ERR_FAILED.*fonts/.test(t)) return;
      if (dozvoljeno(t)) return;
      konzolaGreske.push(`[${gde || p.url()}] ${t}`);
    });
    p.on('pageerror', e => {
      if (dozvoljeno(e.message)) return;
      konzolaGreske.push(`[${gde || p.url()}] pageerror: ${e.message}`);
    });
  }

  function ojacajStranu(p) {
    /* Omotač SME da se primeni samo jednom.
       `browser.newPage()` interno pravi kontekst, pa je strana prolazila i kroz
       omotač konteksta i kroz omotač pregledača — ponavljanje se ugnezdilo
       3×3 = 9 puta i test je umesto da se oporavi tonuo u lavinu pokušaja. */
    if (p.__ojacana) return p;
    p.__ojacana = true;
    p.setDefaultNavigationTimeout(120000);
    prijaviGreske(p);
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
    /* Pre zatvaranja strane prekini sve što je još u toku.
       Strane se zatvaraju usred skidanja `reci.txt` (2,5 MB); ako se ta veza ne
       prekine uredno, pregledač ume da zaglavi sledeću navigaciju — izmereno:
       server u tom trenutku pokazuje nula veza i na `curl` odgovara za 0,21 s,
       dakle zastoj je u Chromiumu, ne na serveru. */
    const _close = p.close.bind(p);
    p.close = async (...a) => {
      try { await _goto('about:blank', { timeout: 5000 }); } catch (e) {}
      return _close(...a);
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

  const page = await browser.newPage();   // osluškivač greške je već zakačen

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
      // naslovi grupa su `h2` otkad je popravljen preskočeni nivo (N9/N14);
      // `h3` ostaje u selektoru da provera radi i na starom kodu
      return [...document.getElementById('rimeResults').querySelectorAll('h2, h3')].map(e => e.textContent.trim());
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
        const h = g.querySelector('h2, h3'); if (!h) return;
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
      const grupe = [...box.querySelectorAll('h2, h3')].map(e => e.textContent.trim());
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
    /* PROMENJENO 29.07.2026. na odluku vlasnice. Ranije je ovde stajalo
       „beležnica se NE prekucava u ćirilicu (tekst je korisnikov)" — namerno
       ponašanje, koje je u praksi značilo da je pola strane ćirilica a pesma
       latinica. Sada i beležnica prati pismo, u oba smera (sekcija 21). */
    ok('i beležnica prati pismo — otkucano u ćirilici je ćirilica',
       pesmaTekst === 'моја песма', pesmaTekst);
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
      ocekujGreske(p16b, /502/, /HTTP 502/);   // kvar koji test sam pravi
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
      ocekujGreske(p16c, /503/, /HTTP 503/);   // kvar koji test sam pravi
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

    console.log('\n17) ĆIRILICA — kucanje, naslovi, legenda, sinonimi, igra, bojenje (S3, S4, N14)');
    /* Sve provere iz ove sekcije puštene su protiv produkcije dok je tamo bio
       stari kod — svih deset je palo, uključujući „надживети" → „наџивети". */
    {
      const p17 = await browser.newPage();
      await p17.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p17.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p17.click('#scriptToggle button[data-script="cyr"]');
      await pauza(500);

      // ćirilična tastatura: д+ж i н+ј nisu digrafi i ne smeju da se spoje
      for (const [unos, ocekivano] of [['надживети', 'надживети'], ['инјекција', 'инјекција']]) {
        await p17.fill('#rimeInput', '');
        await p17.type('#rimeInput', unos, { delay: 20 });
        await pauza(300);
        const u = await p17.inputValue('#rimeInput');
        ok(`ćirilica: kucanje „${unos}" ne kvari reč`, u === ocekivano, `dobijeno „${u}"`);
      }

      await p17.fill('#rimeInput', '');
      await p17.type('#rimeInput', 'нада', { delay: 20 });
      await p17.click('#rimeBtn');
      await pauza(1200);
      const r17 = await p17.evaluate(() => ({
        h3: document.querySelectorAll('#rimeResults h3').length,
        h2: [...document.querySelectorAll('#rimeResults h2')].map(h => h.textContent.trim()),
        legenda: (document.querySelector('.res-legend')?.textContent || '').trim(),
      }));
      ok('N14 grupe rima su h2 (ne preskaču nivo posle h1)', r17.h3 === 0 && r17.h2.length > 0,
         `h3=${r17.h3} h2=${r17.h2.length}`);
      ok('S3 naslov grupe rima prelazi u ćirilicu',
         /[А-Яа-яЂђЈјЉљЊњЋћЏџШш]/.test(r17.h2[0] || ''), r17.h2[0]);
      ok('S3 legenda prelazi u ćirilicu', /број слогова/i.test(r17.legenda), r17.legenda.slice(0, 60));

      await p17.fill('#rimeInput', '');
      await p17.type('#rimeInput', 'љубав', { delay: 20 });
      await p17.click('#rimeBtn');
      await pauza(1400);
      const syn = await p17.evaluate(() => (document.querySelector('.syn-title')?.textContent || '').trim());
      ok('S3 kartica sinonima prelazi u ćirilicu', /синоними/i.test(syn), syn.slice(0, 60));

      await p17.click('#tabs [data-tab="igra"]');
      await pauza(500);
      const igra = await p17.evaluate(() => ({
        uputstvo: (document.querySelector('.game-instruction')?.textContent || '').trim(),
        proveri: (document.getElementById('gameSubmit')?.textContent || '').trim(),
      }));
      ok('ekran igre nije pola latinica — uputstvo', /Нађи риму/i.test(igra.uputstvo), igra.uputstvo);
      ok('ekran igre nije pola latinica — dugme „Провери"', /Провери/i.test(igra.proveri), igra.proveri);

      // S4: bojenje rima mora da radi i kad je pesma ćirilicom
      await p17.click('#tabs [data-tab="beleznica"]');
      await pauza(400);
      await p17.evaluate(() => { document.getElementById('noteEditor').innerHTML = ''; });
      await p17.click('#noteEditor');
      await p17.keyboard.type('Пада киша\nЈа сам тиша');
      /* Bojenje ide na odloženo iscrtavanje (500 ms) i traži učitan rečnik, pa
         fiksno čekanje od 1,5 s protiv PRODUKCIJE ume da promaši — pao je
         jednom 29.07.2026, a izolovano na istom sajtu radio. Fiksno čekanje se
         zato menja čekanjem na sam ishod: provera i dalje pada ako bojenja
         nema, ali više ne prijavljuje kvar tamo gde je uzrok bio sporija mreža. */
      await p17.waitForFunction(
        () => document.querySelectorAll('#noteEditor .rhyme-word').length >= 2,
        { timeout: 15000 }).catch(() => {});
      const obojeno = await p17.evaluate(() => document.querySelectorAll('#noteEditor .rhyme-word').length);
      ok('S4 rime u ćiriličnoj pesmi se boje', obojeno >= 2, `obojenih reči: ${obojeno}`);
      await p17.close();
    }

    console.log('\n17b) IGRA STAJE KAD ODEŠ NA DRUGI TAB (S7)');
    {
      const p17b = await browser.newPage();
      await p17b.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p17b.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p17b.click('#tabs [data-tab="igra"]');
      await pauza(400);
      await p17b.click('#gameStart');
      await pauza(1200);
      const t1 = await p17b.evaluate(() => document.getElementById('gameTimer').textContent);
      await p17b.click('#tabs [data-tab="rime"]');
      await pauza(4000);
      const t2 = await p17b.evaluate(() => document.getElementById('gameTimer').textContent);
      ok('S7 odbrojavanje STOJI dok si na drugom tabu', t1 === t2,
         `pre=${t1}, posle 4 s na drugom tabu=${t2}`);
      // i nastavlja kad se vratiš
      await p17b.click('#tabs [data-tab="igra"]');
      await pauza(2500);
      const t3 = await p17b.evaluate(() => document.getElementById('gameTimer').textContent);
      ok('S7 odbrojavanje se NASTAVLJA po povratku', Number(t3) < Number(t2), `${t2} → ${t3}`);
      /* Povratak na tab ne sme da vrati POČETNI ekran — inače bi odbrojavanje
         teklo nevidljivo iza njega, a partija bi se izgubila. */
      const ekran = await p17b.evaluate(() => ({
        igra: getComputedStyle(document.getElementById('gamePlay')).display,
        pocetni: getComputedStyle(document.getElementById('gameSetup')).display,
      }));
      ok('S7 povratak na tab ne prekida partiju u toku',
         ekran.igra !== 'none' && ekran.pocetni === 'none',
         `gamePlay=${ekran.igra} gameSetup=${ekran.pocetni}`);
      await p17b.close();
    }

    console.log('\n18) DEČJI REŽIM — sedam pogrešno blokiranih reči, vulgarne ostaju (K3, odeljak 1)');
    /* Lista `BLOCKED` je pisana bez kvačica, pa je umesto vulgarnog „pišati"
       hvatala obično „pisati" — na sajtu za pisanje pesama. Vlasnica je odobrila
       uklanjanje tačno sedam reči: pisao, pisa, krvavi, krvava, krvavo,
       smetlar, kura. Vulgarne ostaju blokirane i to se ovde proverava. */
    {
      const p18 = await browser.newPage();
      await p18.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p18.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });

      // pretraga rečnika je NAJDIREKTNIJA provera liste — rangiranje ne utiče
      const pretrazi = async q => p18.evaluate(async (q) => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        document.querySelector('#searchMode').value = 'contains';
        document.getElementById('searchInput').value = q;
        document.getElementById('searchBtn').click();
        await w(700);
        return [...document.querySelectorAll('#searchResults .word')].map(e => e.textContent.trim());
      }, q);
      await p18.click('#tabs [data-tab="pretraga"]');
      await pauza(300);
      for (const w of ['pisao', 'pisa', 'krvavi', 'krvava', 'krvavo', 'smetlar', 'kura']) {
        const r = await pretrazi(w);
        ok(`K3 rečnik vraća „${w}" (nije više pogrešno blokirano)`, r.includes(w),
           `${r.length} pogodaka, nema „${w}"`);
      }
      for (const w of ['dupe', 'guzica', 'jebem', 'govno']) {
        const r = await pretrazi(w);
        ok(`K3 vulgarno „${w}" i dalje NIJE u rezultatima`, !r.includes(w), `nađeno „${w}"`);
      }

      await p18.click('#tabs [data-tab="rime"]');
      await pauza(300);
      const rime18 = async q => p18.evaluate(async (q) => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        document.getElementById('rimeInput').value = q;
        document.getElementById('rimeBtn').click();
        await w(900);
        return [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim());
      }, q);
      for (const [trazi, mora] of [['disao', 'pisao'], ['stolar', 'smetlar'], ['gura', 'kura']]) {
        const r = await rime18(trazi);
        ok(`K3 rime za „${trazi}" sadrže „${mora}"`, r.includes(mora), `${r.length} rima bez „${mora}"`);
      }
      for (const [trazi, nesme] of [['grupe', 'dupe'], ['lupeta', 'dupeta']]) {
        const r = await rime18(trazi);
        ok(`K3 rime za „${trazi}" NE sadrže „${nesme}"`, !r.includes(nesme), `nađeno „${nesme}"`);
      }
      await p18.close();
    }

    console.log('\n18b) STRANE ZA DECU GOVORE ISTINU O FILTERU');
    {
      const p18b = await browser.newPage();
      await p18b.goto(BASE + '/?rec=dete&decji=1', { waitUntil: 'domcontentloaded' });
      await p18b.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await pauza(600);
      const kids = await p18b.evaluate(() => document.getElementById('kidsToggle').checked);
      ok('?decji=1 uključuje dečji režim', kids === true, `kvačica: ${kids}`);

      for (const s of ['/rime-za-decu/', '/rime-za-decu-o-zivotinjama/', '/rime-za-decu-o-prirodi/']) {
        await p18b.goto(BASE + s, { waitUntil: 'domcontentloaded' });
        await pauza(300);
        const d = await p18b.evaluate(() => ({
          lead: document.querySelector('.landing-lead')?.textContent || '',
          cta: document.querySelector('.landing-cta')?.getAttribute('href') || ''
        }));
        ok(`${s} pominje dečji režim umesto da tvrdi da je uvek uključen`,
           /dečji režim/i.test(d.lead), d.lead.slice(0, 90));
        ok(`${s} dugme vodi na alat sa uključenim režimom`, /decji=1/.test(d.cta), d.cta);
      }
      await p18b.close();
    }

    console.log('\n19) SEO I STRUKTURA — hub /rime-za/, breadcrumb, naslovi, robots, društvena slika');
    {
      const p19 = await browser.newPage();
      /* Niže se namerno otvara /ova-strana-ne-postoji-xyz/ da bi se proverila
         404 strana. Obrazac mora da pokrije OBA oblika poruke: lokalni server
         šalje „404 (Not Found)", a nginx na produkciji „404 ()" — sa praznom
         zagradom. Prva verzija je hvatala samo lokalni oblik, pa je provera
         prošla lokalno a pala protiv produkcije. */
      ocekujGreske(p19, /status of 404/);
      // /rime-za/ je vraćao 403 — ceo srednji nivo strukture nije postojao
      const odg = await p19.goto(BASE + '/rime-za/', { waitUntil: 'domcontentloaded' });
      ok('/rime-za/ vraća 200 (ranije 403)', odg && odg.status() === 200, `status ${odg && odg.status()}`);
      const hub = await p19.evaluate(() => ({
        veza: document.querySelectorAll('a[href^="/rime-za/"]').length,
        h1: document.querySelectorAll('h1').length,
      }));
      ok('/rime-za/ povezuje sve strane reči', hub.veza > 1900, `${hub.veza} linkova`);
      ok('/rime-za/ ima tačno jedan h1', hub.h1 === 1, `${hub.h1}`);

      await p19.goto(BASE + '/rime-za/mama/', { waitUntil: 'domcontentloaded' });
      const rec = await p19.evaluate(() => ({
        title: document.title,
        mrve: [...document.querySelectorAll('.crumbs a, .crumbs span')].map(e => e.textContent.trim()),
        lead: document.querySelector('.landing-lead')?.textContent.slice(0, 60) || '',
        og: document.querySelector('meta[property="og:image"]')?.content || '',
        tw: document.querySelector('meta[name="twitter:card"]')?.content || '',
      }));
      // S9: strane za mama/tata/deka… uopšte nisu postojale (404)
      ok('S9 /rime-za/mama/ postoji', /mama/i.test(rec.title), rec.title);
      // padežno tačan naslov: „Rime za reč „mama“", ne „Rime za mama"
      ok('naslov ne stavlja reč u pogrešan padež', /Rime za reč/.test(rec.title), rec.title);
      ok('naslov nema „N reči koje" kad je N%10===1',
         !/\b\d*1 reči koje/.test(rec.title), rec.title);
      ok('breadcrumb ima sva tri nivoa', rec.mrve.length >= 3, rec.mrve.join(' › '));
      ok('predikat se slaže sa brojem („Pronađeno je 56 reči")',
         /^(Pronađeno je|Pronađene su|Pronađena je)/.test(rec.lead.trim()), rec.lead);
      ok('og:image je društvena slika 1200×630', /og-slika\.png/.test(rec.og), rec.og);
      ok('twitter:card je summary_large_image', rec.tw === 'summary_large_image', rec.tw);

      // robots.txt gasi ~50.000 parametarskih duplikata početne
      await p19.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
      const rb = await p19.evaluate(() => document.body.innerText);
      ok('robots.txt blokira /?rec= duplikate', /Disallow:\s*\/\*\?rec=/.test(rb), rb.slice(0, 120));

      // 404 nije ćorsokak
      const o404 = await p19.goto(BASE + '/ova-strana-ne-postoji-xyz/', { waitUntil: 'domcontentloaded' });
      const s404 = await p19.evaluate(() => ({
        polje: !!document.getElementById('rec404'),
        css: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')).join(' '),
      }));
      ok('404 vraća status 404', o404 && o404.status() === 404, `status ${o404 && o404.status()}`);
      ok('N10 404 strana ima polje za pretragu', s404.polje, 'nema polja');
      ok('N10 404 strana koristi aktuelni CSS', !/20260715b/.test(s404.css), s404.css);
      await p19.close();
    }

    console.log('\n19b) PRISTUPAČNOST — najava rezultata, tastatura, imena polja (N1, N5, N7, N8)');
    {
      const p19b = await browser.newPage();
      await p19b.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p19b.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });

      await p19b.fill('#rimeInput', 'ljubav');
      await p19b.click('#rimeBtn');
      await pauza(800);
      const status = await p19b.evaluate(() => document.getElementById('rimeStatus')?.textContent || '');
      ok('N1 broj rima se najavljuje čitaču ekrana', /\d+\s+rim/i.test(status), `„${status}"`);

      const a11y = await p19b.evaluate(() => {
        const w = document.querySelector('#rimeResults .word');
        return {
          fokus: w ? w.getAttribute('tabindex') : null,
          uloga: w ? w.getAttribute('role') : null,
          ime: document.getElementById('searchMode')?.getAttribute('aria-label') || '',
          labela: !!document.querySelector('label[for="rimeInput"]'),
          aktivan: document.querySelector('#tabs [data-tab].active')?.getAttribute('aria-current') || '',
          srce: document.querySelector('#rimeResults .fav')?.getAttribute('aria-label') || '',
        };
      });
      ok('N5 reč u rezultatu je dostupna tastaturi', a11y.fokus === '0' && a11y.uloga === 'button',
         `tabindex=${a11y.fokus} role=${a11y.uloga}`);
      ok('N7 #searchMode ima pristupačno ime', a11y.ime.length > 3, a11y.ime);
      ok('N7 polje za rime ima <label>', a11y.labela, 'nema label[for=rimeInput]');
      ok('N8 aktivan tab ima aria-current', a11y.aktivan === 'page', a11y.aktivan);
      ok('N6 dugme ♡ ima ime, ne samo emodži', a11y.srce.length > 3, a11y.srce);

      // N13 — escapeHtml mora da štiti i navodnike
      const esc = await p19b.evaluate(() => escapeHtml('a"b\'c<d>&'));
      ok('N13 escapeHtml štiti i navodnike', /&quot;/.test(esc) && /&#39;/.test(esc), esc);
      await p19b.close();
    }

    console.log('\n19c) PERFORMANSE — rečnik se ne skida bez potrebe, pretraga čeka rečnik (V5)');
    {
      const p19c = await browser.newPage();
      const zahtevi = [];
      p19c.on('request', r => zahtevi.push(r.url()));
      await p19c.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p19c.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await pauza(6000);   // duže nego što je nekada trajao „idle" predučitavanje
      ok('definicije.json (19,3 MB) se NE skida na svakom učitavanju',
         !zahtevi.some(u => /definicije\.json/.test(u)), 'skinut je i bez potrebe');

      // V5: klik pre nego što rečnik stigne mora sam da pokrene pretragu
      const p19d = await browser.newPage();
      await p19d.route('**/reci.txt*', async r => { await pauza(3000); await r.continue(); });
      await p19d.goto(BASE, { waitUntil: 'domcontentloaded' });
      await pauza(400);
      await p19d.fill('#rimeInput', 'ljubav');
      await p19d.click('#rimeBtn');
      const odmah = await p19d.evaluate(() => document.querySelectorAll('#rimeResults .word').length);
      await p19d.waitForFunction(() => document.querySelectorAll('#rimeResults .word').length > 5,
                                 { timeout: 60000 }).catch(() => {});
      const posle = await p19d.evaluate(() => document.querySelectorAll('#rimeResults .word').length);
      ok('V5 pretraga pre učitanog rečnika se pokrene SAMA kad rečnik stigne',
         odmah === 0 && posle > 5, `odmah=${odmah} posle=${posle}`);
      await p19c.close(); await p19d.close();
    }

    console.log('\n19d) KONTRAST NA EKRANU IGRE U TAMNOM REŽIMU');
    /* Ekran igre nikad nije bio meren u tamnom režimu: brojač igrača i reči
       (`.game-value`) padao je na 4,13:1 — ispod praga 4,5:1. Uzrok je isti
       obrazac kao K2: podloga tvrdo upisana (`rgba(90,63,208,.09)`), a boja
       teksta promenljiva koja se menja sa temom. */
    {
      const p19e = await browser.newPage();
      await p19e.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p19e.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p19e.click('#darkToggle');
      await pauza(400);
      await p19e.click('#tabs [data-tab="igra"]');
      await pauza(300);
      await p19e.click('#gameStart');
      await pauza(900);
      const kont = await p19e.evaluate(() => {
        const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const brojevi = s => (s.match(/[\d.]+/g) || []).map(Number);
        const spoji = (f, b) => { const a = f[3] === undefined ? 1 : f[3]; return [0, 1, 2].map(i => Math.round(f[i] * a + b[i] * (1 - a))); };
        const podloga = e => { let n = e; while (n && n !== document.documentElement) { const m = brojevi(getComputedStyle(n).backgroundColor); if (m.length && (m.length < 4 || m[3] > 0.95)) return m.slice(0, 3); n = n.parentElement; } return [255, 255, 255]; };
        let najgori = null;
        for (const sel of ['.game-value', '.game-label', '.game-instruction', '#gameWord']) {
          const e = document.querySelector(sel);
          if (!e || !(e.textContent || '').trim()) continue;
          const cs = getComputedStyle(e);
          const pod = podloga(e.parentElement);
          const svoja = brojevi(cs.backgroundColor);
          const bg = (svoja.length >= 3 && (svoja.length < 4 || svoja[3] > 0)) ? spoji(svoja, pod) : pod;
          const f = spoji(brojevi(cs.color), bg);
          const l1 = lum(f) + 0.05, l2 = lum(bg) + 0.05;
          const o = +(Math.max(l1, l2) / Math.min(l1, l2)).toFixed(2);
          if (!najgori || o < najgori.o) najgori = { sel, o };
        }
        return najgori;
      });
      ok('ekran igre u tamnom režimu → najslabiji kontrast ≥ 4,5:1',
         kont && kont.o >= 4.5, kont ? `${kont.sel} = ${kont.o}:1` : 'ništa nije izmereno');
      await p19e.close();
    }

    console.log('\n20) TAB „OMILJENE" — funkcionalna provera, ne samo visina panela');
    /* Nalaz iz dopune: sekcija 4 je bila lažno zelena — merila je samo da panel
       ima visinu. Ni jedno srce nikad nije bilo kliknuto. */
    {
      const p20 = await browser.newPage();
      await p20.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p20.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p20.fill('#rimeInput', 'ljubav');
      await p20.click('#rimeBtn');
      await pauza(800);

      const rec = await p20.evaluate(() => document.querySelector('#rimeResults .chip .word')?.textContent.trim());
      await p20.click('#rimeResults .chip .fav');
      await pauza(400);
      const posle = await p20.evaluate(() => ({
        broj: document.getElementById('favCount').textContent,
        puno: document.querySelector('#rimeResults .chip .fav')?.textContent.trim(),
      }));
      ok('♥ na reči povećava brojač omiljenih', posle.broj === '1', `brojač: ${posle.broj}`);
      ok('♥ menja ikonicu u popunjeno srce', posle.puno === '♥', posle.puno);

      await p20.click('#tabs [data-tab="omiljene"]');
      await pauza(400);
      const uTabu = await p20.evaluate(() => [...document.querySelectorAll('#favResults .word')].map(e => e.textContent.trim()));
      ok('sačuvana reč se vidi u tabu „Omiljene"', uTabu.includes(rec), `u tabu: ${uTabu.join(', ') || 'prazno'}`);

      // preživljava osvežavanje
      await p20.reload({ waitUntil: 'domcontentloaded' });
      await pauza(1200);
      const poslePonovnog = await p20.evaluate(() => document.getElementById('favCount').textContent);
      ok('omiljene preživljavaju osvežavanje', poslePonovnog === '1', `brojač: ${poslePonovnog}`);

      // uklanjanje
      await p20.evaluate(() => { window.confirm = () => true; });
      await p20.click('#tabs [data-tab="omiljene"]');
      await pauza(300);
      await p20.click('#clearFavs');
      await pauza(400);
      const prazno = await p20.evaluate(() => ({
        broj: document.getElementById('favCount').textContent,
        tekst: (document.getElementById('favResults').textContent || '').trim(),
      }));
      ok('„obriši sve" prazni omiljene', prazno.broj === '0', `brojač: ${prazno.broj}`);
      ok('prazan tab „Omiljene" ima poruku', prazno.tekst.length > 10, `„${prazno.tekst}"`);
      await p20.close();
    }

    console.log('\n20b) TRI OPCIJE GLAVNOG ALATA ZAISTA MENJAJU REZULTAT');
    /* Nalaz iz dopune: „i šire rime", „ijekavica" i „dečji režim" imali su NULA
       provera — a ceo test rima je počivao na reči „ljubav", kod koje nijedna
       od tri opcije ne pravi razliku. Zato se ovde biraju druge reči. */
    {
      const p20b = await browser.newPage();
      await p20b.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p20b.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      const broj = async (rec) => p20b.evaluate(async (r) => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        document.getElementById('rimeInput').value = r;
        document.getElementById('rimeBtn').click();
        await w(900);
        return document.querySelectorAll('#rimeResults .word').length;
      }, rec);

      const pre = await broj('srce');
      await p20b.check('#looseToggle');
      await pauza(900);
      const saSirim = await p20b.evaluate(() => document.querySelectorAll('#rimeResults .word').length);
      ok('opcija „i šire rime" povećava broj rezultata', saSirim > pre, `${pre} → ${saSirim}`);
      await p20b.uncheck('#looseToggle');
      await pauza(600);

      const bezJek = await broj('dete');
      await p20b.check('#jekToggle');
      await pauza(1000);
      const saJek = await p20b.evaluate(() => document.querySelectorAll('#rimeResults .word').length);
      ok('opcija „ijekavica" menja rezultat', saJek !== bezJek, `${bezJek} → ${saJek}`);
      await p20b.uncheck('#jekToggle');
      await pauza(600);

      /* Dečji režim mora da izbaci reči iz KIDS_BLOCKED.
         Provera je ranije koristila „mrak" i uvek prolazila kao pad: nijedna od
         125 rima za „mrak" (brak, rak, zrak, krak, frak…) NIJE u KIDS_BLOCKED,
         pa režim nije imao šta da izbaci. Kod je bio ispravan, reč pogrešna.
         „brat" je izabran jer mu je „rat" prava rima i jeste u KIDS_BLOCKED —
         izmereno: 119 → 118, nestaje tačno „rat". (Isto važi za „sat" i „vrat".)
         PRAVILO 18 iz PROPUSTI.md: dozvoljenost reči se meri na najkraćem putu,
         a ne preko rangiranja — zato se dole poredi SPISAK, ne samo broj. */
      const bezDecjeg = await broj('krevetu');
      const imaRat = await p20b.evaluate(() => [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim()));
      await p20b.check('#kidsToggle');
      await pauza(1000);
      const saDecjim = await p20b.evaluate(() => [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim()));
      /* NE poredi se BROJ rezultata: lista je odsečena (90 po grupi), pa čim
         jedna reč ispadne, sledeća po redu popuni njeno mesto i zbir ostane
         isti — 180 → 180. Prva verzija ove provere je baš tako pala na
         ISPRAVNOM kodu. Pravilo 18 iz PROPUSTI.md: dozvoljenost reči se meri
         na najkraćem putu, ne preko rangiranja i odsecanja. Zato se gleda samo
         da li je TA reč nestala sa spiska. */
      ok('dečji režim izbacuje reč u PADEŽU („krevetu" → „dupetu")',
         imaRat.includes('dupetu') && !saDecjim.includes('dupetu'),
         `${bezDecjeg} → ${saDecjim.length}, „dupetu" pre=${imaRat.includes('dupetu')} posle=${saDecjim.includes('dupetu')}`);
      /* Odluka vlasnice 29.07.2026: „rat" i porodica NISU više blokirani —
         deca se igraju rata i reč im nije strana. Provera to čuva, da se ne
         vrati tiho pri sledećoj izmeni liste. */
      const ratOstaje = await p20b.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        document.getElementById('rimeInput').value = 'brat';
        document.getElementById('rimeBtn').click();
        await w(1200);
        return [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim());
      });
      ok('dečji režim NE blokira „rat" (odluka vlasnice)', ratOstaje.includes('rat'),
         `rime za „brat": ${ratOstaje.slice(0, 6).join(', ')}`);
      const proslo = saDecjim.some(w => ['mrtav', 'pakao', 'đavo', 'incestu', 'dupetom'].includes(w));
      ok('dečji režim ne propušta „mrtav/pakao/đavo" ni njihove padeže', !proslo,
         saDecjim.filter(w => ['mrtav', 'pakao', 'đavo', 'incestu', 'dupetom'].includes(w)).join(', '));
      await p20b.uncheck('#kidsToggle');
      await p20b.close();
    }

    console.log('\n20c) RIME NE POČIVAJU NA JEDNOJ REČI');
    /* Ceo test rima se do sada oslanjao na „ljubav". Ovde ide šest reči
       različitog oblika: jednosložna, sa slogotvornim „r", na samoglasnik,
       glagolski oblik, ćirilična i strana. */
    {
      const p20c = await browser.newPage();
      await p20c.goto(BASE, { waitUntil: 'domcontentloaded' });
      await p20c.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      /* Očekivane rime su IZMERENE u alatu, ne pretpostavljene.
         Dva ranija para bila su izmišljena pa su provere padale na ispravnom kodu:
         · „srce"/„sunce" — poklapa se samo „-ce"; alat ih spaja tek uz „i šire
           rime", a ova sekcija radi u strogom režimu. Par se sada proverava dole,
           izričito sa uključenom opcijom.
         · „nebo"/„rebro" — nije rima ni u širem režimu („-ebo" prema „-ebro").
         Zamene su potvrđene: pesma→česma, srce→perce, dete→pete, nebo→bebo,
         zima→rima, sunce→mladunce. */
      const primeri = [
        ['pesma', 'česma'], ['srce', 'perce'], ['dete', 'pete'],
        ['nebo', 'bebo'], ['zima', 'rima'], ['sunce', 'mladunce'],
      ];
      for (const [rec, ocekivana] of primeri) {
        const r = await p20c.evaluate(async (q) => {
          const w = ms => new Promise(x => setTimeout(x, ms));
          document.getElementById('rimeInput').value = q;
          document.getElementById('rimeBtn').click();
          await w(900);
          return [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim());
        }, rec);
        ok(`rime za „${rec}" postoje`, r.length > 3, `${r.length} rima`);
        ok(`„${ocekivana}" je među rimama za „${rec}"`, r.includes(ocekivana),
           `prvih 6: ${r.slice(0, 6).join(', ')}`);
      }

      /* „sunce"/„srce" je asonanca, ne prava rima — poklapa se samo „-ce".
         Zato mora da IZOSTANE u strogom režimu i da se POJAVI uz „i šire rime".
         Provera hvata obe strane: i da opcija radi, i da strogi režim ne popušta. */
      const strogo = await p20c.evaluate(() =>
        [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim()));
      await p20c.check('#looseToggle');
      await pauza(1600);
      const sire = await p20c.evaluate(async () => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        document.getElementById('rimeInput').value = 'sunce';
        document.getElementById('rimeBtn').click();
        await w(1500);
        return [...document.querySelectorAll('#rimeResults .word')].map(e => e.textContent.trim());
      });
      ok('strogi režim NE spaja „sunce" i „srce" (asonanca, ne rima)',
         !strogo.includes('srce'), `strogo ima ${strogo.length} rima`);
      ok('opcija „i šire rime" spaja „sunce" i „srce"',
         sire.includes('srce'), `šire ima ${sire.length} rima`);
      await p20c.uncheck('#looseToggle');
      await p20c.close();
    }

    console.log('\n20d) TAB „REČNIK" — sva tri režima pretrage i filter po slogovima');
    {
      const p20d = await browser.newPage();
      await p20d.goto(BASE + '/?tab=pretraga', { waitUntil: 'domcontentloaded' });
      await p20d.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      const trazi = (rezim, q) => p20d.evaluate(async ([m, s]) => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        document.getElementById('searchMode').value = m;
        document.getElementById('searchInput').value = s;
        document.getElementById('searchBtn').click();
        await w(700);
        return [...document.querySelectorAll('#searchResults .word')].map(e => e.textContent.trim());
      }, [rezim, q]);

      const kraj = await trazi('ends', 'ost');
      ok('režim „završava se na…" vraća samo reči na „ost"',
         kraj.length > 5 && kraj.every(w => w.endsWith('ost')), `${kraj.length}: ${kraj.slice(0, 3).join(', ')}`);
      const poc = await trazi('starts', 'cvet');
      ok('režim „počinje na…" vraća samo reči na „cvet"',
         poc.length > 2 && poc.every(w => w.startsWith('cvet')), `${poc.length}: ${poc.slice(0, 3).join(', ')}`);
      const sadrzi = await trazi('contains', 'zvezd');
      ok('režim „sadrži…" vraća samo reči sa „zvezd"',
         sadrzi.length > 2 && sadrzi.every(w => w.includes('zvezd')), `${sadrzi.length}: ${sadrzi.slice(0, 3).join(', ')}`);

      await p20d.click('#searchSyl button[data-syl="2"]');
      await pauza(700);
      const dvosl = await p20d.evaluate(() => [...document.querySelectorAll('#searchResults .chip .syl')].map(e => e.textContent.trim()));
      ok('filter po slogovima u rečniku radi', dvosl.length > 0 && dvosl.every(s => s === '2'),
         `${dvosl.length} rezultata, slogovi: ${[...new Set(dvosl)].join(',')}`);
      await p20d.close();
    }

    console.log('\n20e) HTTP STATUS NA UZORKU SVIH VRSTA STRANA');
    /* Nalaz iz dopune: status se proveravao na samo 3 URL-a od 2.011. */
    {
      const p20e = await browser.newPage();
      /* 35 navigacija jedna za drugom na istoj strani: svaka strana krene da skida
         `reci.txt`, a sledeća navigacija taj `fetch` prekine. „Failed to fetch" je
         posledica gašenja strane, ne kvara sajta — status svake rute se proverava
         zasebno, kroz `o.status()`. */
      ocekujGreske(p20e, /Failed to fetch/, /ERR_ABORTED/, /net::ERR_FAILED/);
      const rute = [
        '/', '/rime-za/', '/rimovanje-reci/', '/recnik-srpskog-jezika/', '/slogovi/',
        '/pisanje-pesama/', '/klasici/', '/igra-rimovanja/', '/vrste-rima/',
        '/kako-napisati-pesmu/', '/rime-za-decu/', '/rime-za-decu-o-zivotinjama/',
        '/rime-za-decu-o-prirodi/', '/rime-za-pesmu/', '/rime-za-rep/',
        '/rime-za-ljubavne-pesme/', '/rime-za-rodjendanske-pesmice/', '/rime-za-svadbu/',
        '/rime-za-prijatelje/', '/rime-za-roditelje/', '/rime-za-novu-godinu/',
        '/rime-za-tugu-i-secanje/', '/rimovanje-za-pocetnike/',
        '/rime-za/ljubav/', '/rime-za/mama/', '/rime-za/srce/', '/rime-za/nada/',
        '/rime-za/pesma/', '/rime-za/sunce/', '/rime-za/dete/', '/rime-za/zima/',
        '/sitemap.xml', '/robots.txt', '/style.css', '/app.js',
      ];
      let lose = [];
      for (const r of rute) {
        const o = await p20e.goto(BASE + r, { waitUntil: 'domcontentloaded' }).catch(() => null);
        if (!o || o.status() !== 200) lose.push(`${r} → ${o ? o.status() : 'greška'}`);
      }
      ok(`svih ${rute.length} osnovnih ruta vraća 200`, lose.length === 0, lose.join(' · '));
      await p20e.close();
    }

    console.log('\n20f) TAČKICE NAPRETKA U IGRI PRATE STVARAN REDOSLED (N4)');
    /* Ranije je stajalo `correct > i`, pa su PRVE tačkice uvek bile zelene:
       promašiš prvu reč a pogodiš drugu — igra prikaže obrnuto. */
    {
      const p20f = await browser.newPage();
      await p20f.goto(BASE + '/?tab=igra', { waitUntil: 'domcontentloaded' });
      await p20f.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      const stanje = await p20f.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        document.getElementById('gameStart').click();
        await w(700);
        const inp = document.getElementById('gameInput');
        const sub = document.getElementById('gameSubmit');

        // 1. reč — namerno POGREŠNO (postoji u rečniku, ali se ne rimuje)
        const cilj1 = gameCurrentWord;
        let neRima = null;
        const k1 = rhymeKey(cilj1), lk1 = looseKey(cilj1);
        for (const c of WORDS) {
          if (c !== cilj1 && rhymeKey(c) !== k1 && looseKey(c) !== lk1) { neRima = c; break; }
        }
        inp.value = neRima; sub.click();
        await w(1900);

        // 2. reč — TAČNO
        const cilj2 = gameCurrentWord;
        let rima = null;
        const k2 = rhymeKey(cilj2), lk2 = looseKey(cilj2);
        for (const c of WORDS) {
          if (c !== cilj2 && (rhymeKey(c) === k2 || looseKey(c) === lk2)) { rima = c; break; }
        }
        inp.value = rima; sub.click();
        await w(1900);

        const tacke = [...document.querySelectorAll('#gameProgress .game-progress-dot')]
          .map(d => d.classList.contains('correct') ? 'tačno'
                  : d.classList.contains('wrong') ? 'netačno'
                  : d.classList.contains('current') ? 'trenutna' : '—');
        return { tacke, neRima, rima, cilj1, cilj2 };
      });
      ok('N4 prva tačkica je NETAČNO (prva reč promašena)',
         stanje.tacke[0] === 'netačno', `redosled: ${stanje.tacke.slice(0, 4).join(', ')}`);
      ok('N4 druga tačkica je TAČNO (druga reč pogođena)',
         stanje.tacke[1] === 'tačno', `redosled: ${stanje.tacke.slice(0, 4).join(', ')}`);
      await p20f.close();
    }

    console.log('\n20h) SINONIMI ZA „SUNCE" (nalaz S10)');
    /* Za „sunce" je stajalo 19 sinonima, od kojih 13 pripada reči „snop"
       (plast, babura, stog, bala, svežanj, denjak, zamotuljak, zavežljaj,
       zavijutak, smotak, breme, naviljak). Kartica sinonima stoji na VRHU
       rezultata, pa je ko ukuca „sunce" prvo čitao „плast, babura, stog".
       Vlasnica je 29.07.2026. odlučila da se cela odrednica poništi dok se ne
       proveri u Rečniku Matice srpske. */
    {
      const p20h = await browser.newPage();
      const syn = await p20h.goto(BASE + '/sinonimi.json', { waitUntil: 'domcontentloaded' })
        .then(r => r.json()).catch(() => null);
      ok('sinonimi.json se učitava i ima preko 13.000 odrednica',
         syn && Object.keys(syn).length > 13000, syn ? `${Object.keys(syn).length}` : 'nije učitan');
      /* Odrednica je prepisana po Rečniku srpskoga jezika (Matica srpska, 2011),
         odrednica „сунце": 1б „централна ЗВЕЗДА неког другог космичког
         планетног система", 3 „СВЕТЛОСТ и ТОПЛОТА што их испушта то небеско
         тело". Ranije je stajalo 13 sinonima reči „snop". */
      ok('„sunce" više NEMA tuđe sinonime („plast", „stog", „bala")',
         syn && syn['sunce'] && !syn['sunce'].some(x => ['plast','stog','bala','babura','svežanj'].includes(x)),
         syn && syn['sunce'] ? syn['sunce'].join(', ') : 'nema odrednice');
      ok('„sunce" ima sinonime po Rečniku Matice srpske (zvezda, svetlost, toplota)',
         syn && syn['sunce'] && ['zvezda','svetlost','toplota'].every(x => syn['sunce'].includes(x)),
         syn && syn['sunce'] ? syn['sunce'].join(', ') : 'nema odrednice');
      await p20h.goto(BASE + '/?rec=sunce', { waitUntil: 'domcontentloaded' });
      await p20h.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await pauza(1800);
      const naVrhu = await p20h.evaluate(() =>
        [...document.querySelectorAll('#rimeResults .word')].slice(0, 8).map(e => e.textContent.trim()));
      ok('na vrhu rezultata za „sunce" nema „plast/babura/stog/bala"',
         !naVrhu.some(w => ['plast', 'babura', 'stog', 'bala'].includes(w)), naVrhu.join(', '));
      await p20h.close();
    }

    console.log('\n20g) SVI ČIPOVI STAJU U JEDAN RED (ikonice ne beže u drugi)');
    /* Prijava vlasnice 29.07.2026, sa slikom. Mreža je imala kolone fiksne
       širine (15rem), pa kod duže reči („dobročiniteljka", „bogomoljka",
       „hraniteljka") ikonica „nađi rime" nije stala i selila se u drugi red —
       a pošto u mreži sve ćelije jedne vrste imaju istu visinu, jedan
       prelomljen čip razvlačio je i sve susede.
       Meri se VISINA čipa, ne položaj ikonica: ikonice i tekst imaju različitu
       visinu pa im se vrhovi prirodno razlikuju i u jednom redu — poređenje
       vrhova daje lažan nalaz „sve je prelomljeno". Visina je jednoznačna. */
    {
      const p20g = await browser.newPage();
      for (const sirina of [1440, 1024, 390]) {
        await p20g.setViewportSize({ width: sirina, height: 1000 });
        await p20g.goto(BASE + '/?tab=pretraga', { waitUntil: 'domcontentloaded' });
        await p20g.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
        const m = await p20g.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          // „ljka" namerno: daje 100+ reči vrlo različite dužine, od „biljka"
          // do „dobročiniteljka" — tačno raspon na kome je bag i nastao
          document.getElementById('searchMode').value = 'ends';
          document.getElementById('searchInput').value = 'ljka';
          document.getElementById('searchBtn').click();
          await w(1500);
          const cips = [...document.querySelectorAll('#searchResults .chip')];
          const visine = {}, izasli = [];
          cips.forEach(c => {
            const cr = c.getBoundingClientRect();
            const h = Math.round(cr.height);
            visine[h] = (visine[h] || 0) + 1;
            [...c.children].forEach(d => {
              const dr = d.getBoundingClientRect();
              if (dr.right > cr.right + 1 || dr.left < cr.left - 1) izasli.push(c.textContent.trim());
            });
          });
          return { broj: cips.length, visine, izasli: izasli.slice(0, 3) };
        });
        const razliciteVisine = Object.keys(m.visine).length;
        ok(`${sirina}px · svi čipovi iste visine (nijedan prelomljen)`,
           m.broj > 50 && razliciteVisine === 1,
           `${m.broj} čipova, visine: ${Object.entries(m.visine).map(([h, n]) => `${h}px×${n}`).join(', ')}`);
        ok(`${sirina}px · ništa ne izlazi iz pilule`, m.izasli.length === 0, m.izasli.join(', '));
      }
      await p20g.close();
    }

    console.log('\n21) BELEŽNICA PRATI PISMO + SRPSKA TASTATURA + PRELOMI PRI LEPLJENJU');
    /* Tri prijave vlasnice, 29.07.2026:
       · pesma nalepljena na latinici ostajala je latinica i kad se sajt prebaci
         na ćirilicu (pola strane ćirilica, pesma latinica);
       · na američkom rasporedu nije bilo načina da se otkucaju `ћ ч ш ђ ж`;
       · usput izmereno: lepljenje je GUTALO prelome redova — pesma od četiri
         stiha postajala je jedan red, pa su nestali i slogovi po stihu i šema
         rime. To je najteži od tri, jer tiho uništava tuđi tekst. */
    {
      const ctx21 = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
      const p21 = ojacajStranu(await ctx21.newPage());
      await p21.goto(BASE + '/?tab=beleznica', { waitUntil: 'domcontentloaded' });
      await p21.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      const tekst = () => p21.evaluate(() => getEditorText());
      const naPismo = async (s) => { await p21.click(`#scriptToggle button[data-script=${s}]`); await pauza(900); };

      /* U pesmi su namerno „nadživeti" i „injekcija": tu se `d+ž` i `n+j`
         DODIRUJU a nisu digraf, pa naivan prevod daje „наџивети"/„ињекција". */
      const PESMA = 'Ljubav je njezina\nnadživeti sve tuge\ninjekcija boli\nđačko srce šapće';
      await p21.evaluate(t => navigator.clipboard.writeText(t), PESMA);
      await p21.click('#noteEditor');
      await p21.keyboard.press('ControlOrMeta+V');
      await pauza(1000);

      const nalepljeno = await tekst();
      ok('lepljenje ČUVA prelome redova (pesma nije jedan red)',
         nalepljeno.split('\n').length === 4, `${nalepljeno.split('\n').length} red(ova) umesto 4`);
      ok('brojač levo pokazuje sva četiri stiha',
         await p21.evaluate(() => document.querySelectorAll('#noteGutterInner > *').length) === 4,
         `${await p21.evaluate(() => document.querySelectorAll('#noteGutterInner > *').length)} redova`);

      await naPismo('cyr');
      const cir = await tekst();
      ok('beležnica prelazi u ćirilicu kad se sajt prebaci',
         /^[^a-zA-Z]*$/.test(cir) && cir.includes('Љубав'), `„${cir.split('\n')[0]}"`);
      ok('prelomi prežive prebacivanje pisma', cir.split('\n').length === 4,
         `${cir.split('\n').length} redova`);
      ok('„nadživeti" NE postaje „наџивети" (д и ж se samo dodiruju)',
         cir.includes('надживети') && !cir.includes('наџивети'), cir.split('\n')[1]);
      ok('„injekcija" NE postaje „ињекција"',
         cir.includes('инјекција') && !cir.includes('ињекција'), cir.split('\n')[2]);

      await naPismo('lat');
      ok('povratak na latinicu vraća pesmu SLOVO U SLOVO', (await tekst()) === PESMA,
         `„${(await tekst()).slice(0, 40)}"`);

      // pismo mora da preživi osvežavanje strane, ne samo prebacivanje
      await naPismo('cyr');
      await p21.reload({ waitUntil: 'domcontentloaded' });
      await p21.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await pauza(700);
      ok('posle F5 beležnica je i dalje ćirilica', (await tekst()).includes('Љубав'),
         `„${(await tekst()).split('\n')[0]}"`);

      /* ---- kucanje: digrafi i srpski raspored tastature ----
         Beležnica se prazni TASTATUROM, ne pozivom unutrašnje funkcije: kad se
         ova sekcija pusti protiv produkcije na kojoj stoji stariji `app.js`,
         poziv nepostojeće funkcije obori ceo test i preostale provere se nikad
         ne izvrše — a baš one treba da padnu i dokažu da valjaju. */
      await p21.click('#noteEditor');
      await p21.keyboard.press('ControlOrMeta+A');
      await p21.keyboard.press('Backspace');
      await pauza(600);
      await p21.keyboard.type('ljubav njegova');
      await pauza(700);
      ok('otkucano u ćirilici odmah prelazi u ćirilicu (digrafi lj/nj)',
         (await tekst()) === 'љубав његова', `„${await tekst()}"`);

      await p21.keyboard.type(' [e');           // [ je taster za „š" na srpskom rasporedu
      await pauza(400);
      ok('srpski raspored: taster [ daje „ш" u beležnici',
         (await tekst()).endsWith(' ше'), `„${await tekst()}"`);

      await p21.keyboard.type(' nek');
      await p21.keyboard.press("'");
      await pauza(300);
      ok("srpski raspored: taster ' daje „ћ\"", (await tekst()).endsWith('некћ'), `„${await tekst()}"`);
      await p21.keyboard.press("'");
      await pauza(300);
      ok("drugi pritisak ' vraća apostrof (за „нек'\")", (await tekst()).endsWith("нек'"),
         `„${await tekst()}"`);

      // ---- isti tasteri u polju za rime, pa provera da u latinici ĆUTE ----
      await p21.goto(BASE + '/?tab=rime', { waitUntil: 'domcontentloaded' });
      await p21.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p21.click('#rimeInput');
      await p21.keyboard.type('[e');
      await pauza(300);
      ok('srpski raspored radi i u polju za rime', (await p21.inputValue('#rimeInput')) === 'ше',
         `„${await p21.inputValue('#rimeInput')}"`);
      ok('uputstvo o srpskim slovima se vidi u ćirilici', await p21.isVisible('#kbdHelp'), 'nije vidljivo');

      /* Sledeće dve provere PROLAZE i na starom kodu — i tako treba da bude.
         One nisu tu da dokažu da nova funkcija radi, nego da ne curi tamo gde
         joj nije mesto: u latinici uputstvo mora da ostane skriveno, a tasteri
         `[ ] ; ' \` moraju i dalje da daju interpunkciju. Ovo su kontrole
         protiv preterivanja, ne provere funkcije — pravilo 17 iz PROPUSTI.md
         („provera koja prođe na starom kodu ne valja") se na njih NE odnosi. */
      await naPismo('lat');
      ok('uputstvo je skriveno u latinici', !(await p21.isVisible('#kbdHelp')), 'vidi se i u latinici');
      await p21.fill('#rimeInput', '');
      await p21.click('#rimeInput');
      await p21.keyboard.type('[e');
      await pauza(300);
      ok('u latinici tasteri [ ] ; \' \\ ostaju interpunkcija',
         (await p21.inputValue('#rimeInput')) === '[e', `„${await p21.inputValue('#rimeInput')}"`);

      // uputstvo mora da postoji i na podstranama, ne samo na početnoj
      await p21.goto(BASE + '/rime-za/ljubav/', { waitUntil: 'domcontentloaded' });
      ok('uputstvo postoji i na stranama reči (svih 1.988)',
         await p21.evaluate(() => !!document.getElementById('kbdHelp')), 'nema ga na /rime-za/ljubav/');
      await ctx21.close();
    }

    console.log('\n22) OSVEŽAVANJE VRAĆA NA VRH STRANE, A „NAZAD" I DALJE PAMTI POLOŽAJ');
    /* Prijava vlasnice 29.07.2026: „ako sam na dnu strane, na futeru, i uradim
       refresh — ostanem na futeru." Alat se osvežavanjem resetuje (polje prazno,
       rime nestanu), pa čovek gleda dno prazne strane, bez logotipa i bez polja.
       Izmereno na produkciji pre popravke: /rime-za/ljubav/ 1999,5 px → 1999,5 px.

       Dve provere, i obe su potrebne:
       · osvežavanje mora da vrati na 0;
       · „Nazad" NE SME da izgubi položaj — na hubu `/rime-za/` ima 1.988 linkova
         i ko se vrati sa jedne reči mora da nastavi odakle je stao. Popravka
         zato pali `scrollRestoration='manual'` samo za osvežavanje i vraća ga
         na `auto` posle učitavanja.
       Merenje ide 2× po strani, sa čekanjem, jer strana posle učitavanja PORASTE
       (rime se vrate) — a baš tada pregledač pokušava da vrati stari položaj. */
    {
      const p22 = ojacajStranu(await browser.newPage());

      for (const [put, opis] of [['/rime-za/ljubav/', 'strana reči'], ['/?rec=ljubav', 'početna sa rimama']]) {
        await p22.goto(BASE + put, { waitUntil: 'domcontentloaded' });
        if (put.startsWith('/?')) {
          await p22.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
          await pauza(2000);
        }
        const pre = await p22.evaluate(async () => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          window.scrollTo(0, document.body.scrollHeight);
          await w(800);
          return window.scrollY;
        });
        ok(`${opis} · dno strane je stvarno dno (priprema)`, pre > 500, `${pre} px`);

        await p22.reload({ waitUntil: 'domcontentloaded' });
        await pauza(put.startsWith('/?') ? 9000 : 3000);   // strana u međuvremenu poraste
        const posle = await p22.evaluate(() => window.scrollY);
        ok(`${opis} · osvežavanje vraća na vrh`, posle === 0, `bilo ${pre} px, posle osvežavanja ${posle} px`);
        ok(`${opis} · pamćenje položaja vraćeno pregledaču`,
           await p22.evaluate(() => history.scrollRestoration === 'auto'),
           await p22.evaluate(() => history.scrollRestoration));
      }

      // „Nazad" sa strane reči na hub — položaj mora da ostane
      await p22.goto(BASE + '/rime-za/', { waitUntil: 'domcontentloaded' });
      await p22.evaluate(() => window.scrollTo(0, 4000));
      await pauza(900);
      await p22.goto(BASE + '/rime-za/ljubav/', { waitUntil: 'domcontentloaded' });
      await pauza(600);
      await p22.goBack({ waitUntil: 'domcontentloaded' });
      await pauza(2500);
      const nazad = await p22.evaluate(() => window.scrollY);
      ok('„Nazad" na hub ne gubi položaj (1.988 linkova)', nazad > 1000, `${nazad} px umesto ~4000`);

      await p22.close();
    }

    console.log('\n23) ČIPOVI U PASUSU STOJE U REDU, NE JEDAN ISPOD DRUGOG');
    /* Prijava vlasnice 29.07.2026, sa slikom: na `/rimovanje-reci/` je spisak
       najtraženijih reči bio izlistan jedna reč ispod druge, preko cele širine.
       Uzrok: 28.07. u `b3bd730b2` je `.chip` prebačen sa `inline-flex` na `flex`
       (uz popravku ikonica). `flex` je BLOK, pa čip u pasusu zauzme ceo red.
       Nijedna sesija to nije videla jer je test gledao samo čipove unutar
       `.results` — tamo razlike nema, flex kontejner ionako blokira svoje
       stavke. Zato se ovde meri baš ono što je bilo pokvareno: koliko redova
       zauzimaju čipovi UNUTAR pasusa i koliko je čip širok u odnosu na pasus.
       Dve strane imaju takve čipove — obe se proveravaju. */
    {
      const p23 = ojacajStranu(await browser.newPage());
      await p23.setViewportSize({ width: 1440, height: 1000 });
      for (const put of ['/rimovanje-reci/', '/rime-za-decu/']) {
        await p23.goto(BASE + put, { waitUntil: 'domcontentloaded' });
        const m = await p23.evaluate(() => {
          const c = [...document.querySelectorAll('.landing-lead .chip')];
          if (!c.length) return null;
          const redovi = new Set(c.map(x => Math.round(x.getBoundingClientRect().top)));
          const pasus = document.querySelector('.landing-lead').getBoundingClientRect().width;
          const najsiri = Math.max(...c.map(x => x.getBoundingClientRect().width));
          return { broj: c.length, redova: redovi.size, udeo: najsiri / pasus, display: getComputedStyle(c[0]).display };
        });
        ok(`${put} · čipovi u pasusu uopšte postoje`, m && m.broj >= 10, m ? `${m.broj}` : 'nema ih');
        if (!m) continue;
        // svaki čip u svom redu = pokvareno; u redu je kad ih u prosečnom redu ima bar 3
        ok(`${put} · čipovi se ređaju u red, ne jedan ispod drugog`,
           m.redova <= Math.ceil(m.broj / 3),
           `${m.broj} čipova u ${m.redova} redova (display: ${m.display})`);
        ok(`${put} · nijedan čip ne zauzima ceo red`,
           m.udeo < 0.5, `najširi čip nosi ${(m.udeo * 100).toFixed(0)}% širine pasusa`);
      }
      await p23.close();
    }

    console.log('\n24) STRANA SE NE POMERA DOK SE UČITAVA (CLS)');
    /* Nalaz 29.07.2026. Strana se iscrta rezervnim fontom, pa kad Quicksand i
       Fredoka stignu sa Google-a tekst promeni širinu — red filtera izgubi
       jednu liniju i sve ispod skoči 50 px, u 736 ms.
       Izmereno na produkciji PRE popravke: `/` 0,2853 (Google to zove „loše"),
       `/rimovanje-reci/` 0,1104. Posle usklađivanja mera rezervnog fonta
       (`style.css`, @font-face „…rezerva"): 0,0065 i 0,0053.

       Meri se na BRZOJ vezi, i to je bitno: na emuliranom 4G je i pre popravke
       bilo uredno (0,0032), jer tamo strana ionako čeka font pa zamene nema.
       Ko meri samo sporu vezu, ovaj kvar NE VIDI.
       Granica 0,1 je Google-ova granica za „dobro". */
    /* Dve zamke, obe uhvaćene 29.07. na sopstvenom kodu:

       1) `addInitScript` se NE sme zvati u petlji nad istom stranom — skripte se
          GOMILAJU, pa bi druga strana dobila dva posmatrača i CLS bi se brojao
          dvostruko. Zato svaka strana dobija svoj kontekst.

       2) CLS je merenje, a merenje ume da varira. Izmereno na produkciji:
          13 pokretanja → 11 puta 0,0065, 2 puta ~0,30. Oba loša pala su u
          minut kad se Coolify kontejner restartovao posle deploy-a: tada CSS
          nakratko stigne sporo i strana se iscrta neuređena. Pod usporenim
          procesorom (4×) i sporom mrežom nije se ponovilo nijednom.
          Zato se meri NAJBOLJE OD TRI: jedan loš pokušaj ne obara deploy, ali
          ako su sva tri loša — kvar je stvaran i ne prolazi. */
    {
      for (const put of ['/', '/rimovanje-reci/']) {
        let najbolji = Infinity, svi = [];
        for (let pokusaj = 1; pokusaj <= 3; pokusaj++) {
          const ctx24 = await browser.newContext();
          const p24 = ojacajStranu(await ctx24.newPage());
          await p24.addInitScript(() => {
            window.__cls = 0;
            new PerformanceObserver(l => {
              for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
            }).observe({ type: 'layout-shift', buffered: true });
          });
          await p24.goto(BASE + put, { waitUntil: 'load' });
          await pauza(5000);   // font stiže oko 700–900 ms; čeka se sa rezervom
          const cls = await p24.evaluate(() => +window.__cls.toFixed(4));
          svi.push(cls);
          najbolji = Math.min(najbolji, cls);
          await ctx24.close();
          if (najbolji < 0.1) break;   // dobar rezultat — nema potrebe za još
        }
        ok(`${put} · strana se ne pomera dok se učitava (CLS < 0,1)`,
           najbolji < 0.1,
           `CLS ${svi.map(c => String(c).replace('.', ',')).join(' / ')}`);
      }
    }

    console.log('\n25) ADRESA SAJTA JE JEDNA — www trajno vodi na adresu bez www');
    /* Do 29.07.2026. je `https://www.rimoteka.com/` vraćao **200**: ista strana
       na dve adrese. Kanonik je pokazivao na adresu bez www, pa Google nije
       indeksirao duplikat — ali kanonik je nagoveštaj, a 301 je pravilo; tek on
       prenosi težinu linkova. Popravljeno zasebnim `server` blokom u nginx.conf.

       Provera radi SAMO protiv produkcije — lokalni server nema `www`. Kad se
       preskoči, to se i ispiše, da se preskakanje ne pomeša sa prolaskom
       (pravilo: nikad ne ulepšavati pokrivenost). */
    if (BASE === 'https://rimoteka.com') {
      const proveriPreusmerenje = async (url) => {
        const o = await fetch(url, { redirect: 'manual' });
        return { status: o.status, gde: o.headers.get('location') };
      };
      for (const [odakle, dokle] of [
        ['https://www.rimoteka.com/', 'https://rimoteka.com/'],
        ['https://www.rimoteka.com/rime-za/ljubav/', 'https://rimoteka.com/rime-za/ljubav/'],
        // N12: Traefik-ov redirect-to-https je bio bez permanent flag-a (302 GET /
        // 307 HEAD). Sada `rimoteka-301.yaml` u Traefik dynamic config-u daje 301.
        ['http://rimoteka.com/', 'https://rimoteka.com/'],
        ['http://rimoteka.com/rime-za/ljubav/', 'https://rimoteka.com/rime-za/ljubav/'],
      ]) {
        const r = await proveriPreusmerenje(odakle);
        ok(`${odakle} → 301 (trajno)`, r.status === 301, `dobijeno ${r.status}`);
        ok(`${odakle} vodi tačno na ${dokle}`, r.gde === dokle, `vodi na ${r.gde}`);
      }
    } else {
      console.log('  ⏭  preskočeno — radi samo protiv produkcije (BASE=https://rimoteka.com)');
    }

    console.log('\n26) MOBILNA BELEŽNICA I TELEFON (M1–M4) + SIGURNOSNA MREŽA PESME');
    /* Prijava vlasnice 29.07.2026: „otvorila sam sajt na svom telefonu i jeziv
       je — beležnica posebno nikakve veze sa vezom nema". Izmereno na
       produkciji, iPhone 13 kontekst: M1 (0 obojenih reči na SVIM širinama),
       M2 (editor počinje na x=80 od 390 px), M3 (editor na y=713, ekran 664),
       M4 (traka tabova beži do 248 px van ekrana).

       Uzrok M1 je bio dublji od izgleda: mobilni Chrome/Safari na Enter prave
       <div> po redu, ne <br> — a `getEditorText()` je poznavao samo <br>.
       Redovi su se LEPILI u jedan („…nekadu tvom…"), pa je pokvaren tekst
       išao i u localStorage: pesma je bila uništena, ne samo neobojena.
       Zato se ovde kuca sa <div> strukturom redova, ne samo sa <br>. */
    {
      const ctx26 = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
      const p26 = ojacajStranu(await ctx26.newPage());
      await p26.goto(BASE + '/pisanje-pesama/', { waitUntil: 'domcontentloaded' });
      await pauza(1800);

      // M1: <div> struktura redova (mobilni) — redovi se ne lepe, rime se boje
      await p26.evaluate(() => {
        const ed = document.getElementById('noteEditor');
        ed.innerHTML = 'Voli me kao nekad<div>u tvom srcu je lek</div><div>dolazi tiho vek</div><div>ostani jos malo tu</div>';
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      });
      await pauza(1200);   // bojenje ima zadršku od 500 ms
      const m1 = await p26.evaluate(() => ({
        obojenih: document.querySelectorAll('#noteEditor .rhyme-word').length,
        tekst: document.getElementById('noteInput').value,
      }));
      ok('M1 · mobilna struktura redova: „lek“ i „vek“ su obojeni', m1.obojenih === 2,
         `obojeno ${m1.obojenih} reči`);
      ok('M1 · redovi se ne lepe u jedan (\\n se čuva)', m1.tekst.split('\n').length === 4,
         `viđeno kao ${JSON.stringify(m1.tekst.slice(0, 40))}`);

      // M2: gutter ne jede ekran (bio 62 px fiksno = 16–20% širine)
      const m2 = await p26.evaluate(() => ({
        gutter: Math.round(document.getElementById('noteGutter').getBoundingClientRect().width),
        editor: Math.round(document.getElementById('noteEditor').getBoundingClientRect().width),
        ekran: window.innerWidth,
      }));
      ok('M2 · gutter je uži od 50 px na 390 px ekranu', m2.gutter > 0 && m2.gutter < 50,
         `gutter ${m2.gutter} px`);
      ok('M2 · za pisanje ostaje bar 60% ekrana', m2.editor > m2.ekran * 0.6,
         `editor ${m2.editor} od ${m2.ekran} px`);

      // M3: editor je IZNAD pregiba (bio y=713 na ekranu 664)
      await p26.evaluate(() => window.scrollTo(0, 0));
      await pauza(300);
      const m3 = await p26.evaluate(() => ({
        y: Math.round(document.getElementById('noteEditor').getBoundingClientRect().y),
        visina: window.innerHeight,
      }));
      ok('M3 · editor se vidi bez skrolanja na telefonu (podstrana)', m3.y < m3.visina,
         `editor na y=${m3.y}, ekran ${m3.visina} px`);

      // M3 na početnoj — tu je nalaz i izmeren (y=713): početna ima hero i tabove
      const ctx26h = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
      const p26h = ojacajStranu(await ctx26h.newPage());
      await p26h.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(1800);
      await p26h.click('[data-tab="beleznica"]');
      await pauza(600);
      const m3h = await p26h.evaluate(() => ({
        y: Math.round(document.getElementById('noteEditor').getBoundingClientRect().y),
        visina: window.innerHeight,
      }));
      ok('M3 · editor se vidi bez skrolanja na telefonu (početna)', m3h.y < m3h.visina,
         `editor na y=${m3h.y}, ekran ${m3h.visina} px`);
      await ctx26h.close();

      // M4: ništa ne širi stranicu preko ekrana; traka tabova ima znak da se pomera
      const m4 = await p26.evaluate(() => {
        const cs = getComputedStyle(document.getElementById('tabs'));
        return { doc: document.documentElement.scrollWidth, ekran: window.innerWidth,
                 maska: (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') };
      });
      ok('M4 · stranica se ne širi preko ekrana na telefonu', m4.doc <= m4.ekran,
         `dokument ${m4.doc} px, ekran ${m4.ekran} px`);
      ok('M4 · traka tabova pokazuje da ima još stavki (maska)', m4.maska === true);

      // A4: pesma se čuva i u istoriju verzija; spašava se i kad glavni ključ nestane
      const a4a = await p26.evaluate(() =>
        JSON.parse(localStorage.getItem('rimoteka_notes_istorija') || '[]').length);
      ok('A4 · istorija verzija pesme se piše', a4a >= 1, `unosa: ${a4a}`);
      await p26.evaluate(() => localStorage.removeItem('rimoteka_notes'));
      await p26.reload({ waitUntil: 'domcontentloaded' });
      await pauza(1800);
      const a4b = await p26.evaluate(() => document.getElementById('noteEditor').innerText);
      ok('A4 · pesma se vraća iz istorije kad glavni zapis nestane',
         a4b.startsWith('Voli me kao nekad'), `u editoru: ${JSON.stringify(a4b.slice(0, 24))}`);
      await ctx26.close();

      // A4: kad skladište ne radi (privatni režim), korisnik to ZNA pre prve strofe
      const ctx26b = await browser.newContext({ viewport: { width: 390, height: 664 } });
      await ctx26b.addInitScript(() => {
        const blokirano = { getItem(){ throw new DOMException('x'); }, setItem(){ throw new DOMException('x'); }, removeItem(){ throw new DOMException('x'); } };
        Object.defineProperty(window, 'localStorage', { get(){ return blokirano; } });
      });
      const p26b = ojacajStranu(await ctx26b.newPage());
      await p26b.goto(BASE + '/pisanje-pesama/', { waitUntil: 'domcontentloaded' });
      await pauza(1500);
      const a4c = await p26b.evaluate(() => {
        const w = document.getElementById('noteStorageWarn');
        return w && !w.hidden;
      });
      ok('A4 · upozorenje „čuvanje ne radi“ je vidljivo kad je skladište blokirano', a4c === true);
      await ctx26b.close();

      // Straža za desktop: mobilne izmene NE SMEJU da se vide na širokom ekranu
      const ctx26c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const p26c = ojacajStranu(await ctx26c.newPage());
      await p26c.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(1800);
      await p26c.click('[data-tab="beleznica"]');
      await pauza(500);
      const dk = await p26c.evaluate(() => {
        const hintTxt = document.querySelector('#panel-beleznica .hint .hint-txt');
        const hero = document.querySelector('.hero');
        const gutter = document.getElementById('noteGutter');
        return {
          hero: hero ? getComputedStyle(hero).display !== 'none' : false,
          // starog spana nema → proza je po defaultu vidljiva (stari markup)
          proza: hintTxt ? getComputedStyle(hintTxt).display !== 'none' : true,
          gutter: gutter ? Math.round(gutter.getBoundingClientRect().width) : 0,
        };
      });
      ok('desktop · hero ostaje vidljiv i van taba Rime', dk.hero === true);
      ok('desktop · objašnjenje u pasusu beležnice ostaje', dk.proza === true);
      ok('desktop · gutter ostaje širok (4,4 rem)', dk.gutter > 60, `gutter ${dk.gutter} px`);
      await ctx26c.close();
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
