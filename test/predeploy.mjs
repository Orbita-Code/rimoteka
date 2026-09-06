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

  /* MERENJE NE SME DA ULAZI U ANALITIKU (26.08.2026).
     Test otvara 34 sveža konteksta po prolazu, svaki bez kolačića — a to je za
     GA4 svaki put NOV KORISNIK. Pušten protiv produkcije, jedan prolaz je u
     statistiku ubacivao desetine lažnih poseta kratkog trajanja. Izmereno pre
     popravke: grad iz kog se test pušta imao je 206 korisnika, od toga 203
     „nova", uz prosečno zadržavanje od 12 sekundi — dok je stvarna publika
     imala 2m 56s.

     PRVI POKUŠAJ je bio `--host-resolver-rules` (preusmeravanje domena u prazno)
     i bio je pogrešan: pregledač tada prijavi `ERR_CONNECTION_REFUSED`, pa je
     svaka provera „nula grešaka u konzoli" počela da pada. Umesto da se izuzetak
     dopisuje u svaki osluškivač redom, zahtev se PRESREĆE i odgovara mu se
     praznim 200 — nijedan bajt ne izađe, a konzola ostaje čista.

     Presretanje se kači na SVAKI kontekst, tako što se `newContext` i `newPage`
     umotaju jednom, ovde. Da se kači ručno, promašio bi se prvi sledeći kontekst
     koji neko doda. Zaglavlje `x-blokirano-u-testu` je dokaz za sekciju 43. */
  {
    const OBRAZAC = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;
    async function blokiraj(ctx) {
      await ctx.route(OBRAZAC, r => r.fulfill({
        status: 200,
        headers: { 'content-type': 'application/javascript', 'x-blokirano-u-testu': '1' },
        body: ''
      }));
      return ctx;
    }
    const _nc = browser.newContext.bind(browser);
    browser.newContext = async (...a) => blokiraj(await _nc(...a));
    const _np = browser.newPage.bind(browser);
    browser.newPage = async (...a) => {
      const p = await _np(...a);
      await blokiraj(p.context());
      return p;
    };
  }

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
      const loc = (m.location() && m.location().url) || '';
      /* Fontovi sa Google-a nisu naš bug ni u jednom obliku: u headless
         okruženju bivaju blokirani (`net::ERR_FAILED` — tada URL stoji u
         TEKSTU poruke), a 16.08.2026. je Google-ov CDN poživeo da na neke
         Rubik woff2 podatke odgovara 404 — tada je tekst poruke generičan
         („Failed to load resource… 404"), a URL stoji samo u `location()`.
         Zato se filtrira i jedno i drugo. */
      if (/fonts\.googleapis|fonts\.gstatic/.test(t) || /fonts\.googleapis|fonts\.gstatic/.test(loc)) return;
      if (/net::ERR_FAILED.*fonts/.test(t)) return;
      /* Ista klasa kao fontovi gore: Google Analitika je spoljni CDN koji u
         headless okruženju povremeno padne na mreži (`ERR_CONNECTION_CLOSED`,
         viđeno 19.08.2026. na localhostu i produkciji, dok `curl` isti URL
         učitava normalno). Nije naš resurs ni naš bug — a zbog nje bi test
         padao nasumično. */
      if (/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(t) || /googletagmanager\.com|google-analytics\.com/.test(loc)) return;
      if (dozvoljeno(t)) return;
      /* „Failed to load resource" bez URL-a resursa je nedijagnosticira —
         poruka nosi samo adresu STRANE. `location().url` je izvor resursa. */
      const izvor = loc ? ' ← ' + loc.slice(0, 160) : '';
      konzolaGreske.push(`[${gde || p.url()}] ${t}${izvor}`);
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

    /* č≡ć pri merenju sličnosti (prijava vlasnice 16.08.2026): „partnera" je
       bila među „najboljima" za „šećera" jer je slovno „era" = „era" — a
       „večera" (bolja rima, č≈ć) je gubila na učestalost. Sada „večera" mora
       biti IZNAD „partnera", a dijalekatske „većera" više nema u rečniku. */
    const secer = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'šećera';
      document.getElementById('rimeBtn').click();
      await w(900);
      const najbolje = document.querySelector('#rimeResults .res-group');
      const reci = [...najbolje.querySelectorAll('.chip .word')].map(e => e.textContent.trim());
      return { reci: reci.slice(0, 8), ve: reci.indexOf('večera'), pa: reci.indexOf('partnera'), vec: reci.includes('većera') };
    });
    ok('„večera" je među najboljim rimama za „šećera"', secer.ve >= 0, secer.reci.join(', '));
    ok('„večera" se rangira iznad „partnera" za „šećera"',
       secer.ve >= 0 && (secer.pa === -1 || secer.ve < secer.pa), `večera #${secer.ve}, partnera #${secer.pa}`);
    ok('„većera" (ć) nije u rečniku ni u rimama', secer.vec === false);

    /* ── 2b) ?rec= SEO PARAMETRI (odluka vlasnice 19.08.2026)
       Dinamička adresa po reči je SEO nosilac za reči bez statičke strane
       (model: azrhymes/rime.com.hr). Mora: robots.txt je ne blokira, naslov
       i opis prate reč, a kanonikal je statičkoj strani kad reč ima stranu,
       inače samoj adresi. */
    {
      const robots = await (await fetch(BASE + '/robots.txt')).text();
      ok('robots.txt ne blokira ?rec= adresu', !/Disallow:\s*\/\*\?rec=/.test(robots),
         robots.split('\n').filter(l => l.includes('rec=')).join(' | '));

      const pSeo = ojacajStranu(await browser.newPage());
      await pSeo.goto(BASE + '/?rec=malena', { waitUntil: 'domcontentloaded' });
      await pSeo.waitForFunction(() => document.querySelectorAll('#rimeResults .word').length > 5, { timeout: 180000 }).catch(() => {});
      await pauza(800);
      const seo1 = await pSeo.evaluate(() => ({
        title: document.title,
        desc: document.querySelector('meta[name="description"]')?.content || '',
        kan: document.querySelector('link[rel="canonical"]')?.href || '',
      }));
      ok('?rec=malena · naslov prati reč', /malena/.test(seo1.title) && /Rime za reč/.test(seo1.title), seo1.title);
      ok('?rec=malena · opis prati reč', /malena/.test(seo1.desc), seo1.desc.slice(0, 90));
      ok('?rec=malena · kanonikal samoj adresi (nema statičku stranu)',
         seo1.kan.includes('?rec=malena'), seo1.kan);

      await pSeo.goto(BASE + '/?rec=ljubav', { waitUntil: 'domcontentloaded' });
      await pSeo.waitForFunction(() => document.querySelectorAll('#rimeResults .word').length > 5, { timeout: 180000 }).catch(() => {});
      /* Kanonikal za `?rec=` se postavlja tek kad stigne `rime-strane.json` (u pozadini) —
         na produkciji izmereno 0,1–1,3 s POSLE rezultata. Čeka se stanje, do 15 s. */
      await pSeo.waitForFunction(() => /\/rime-za\//.test(document.querySelector('link[rel="canonical"]')?.href || ''), null, { timeout: 15000 }).catch(() => {});
      const seo2 = await pSeo.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || '');
      ok('?rec=ljubav · kanonikal na statičku stranu (autoritet se ne deli)',
         /\/rime-za\/ljubav\/$/.test(seo2), seo2);
      await pSeo.close();
    }

    console.log('\n3) Frekvencijsko rangiranje i SINONIMI');
    await page.waitForFunction(() => typeof SYNONYMS !== 'undefined' && Object.keys(SYNONYMS).length > 0, { timeout: 180000 })
      .catch(() => {});
    const extras = await page.evaluate(() => {
      let neg = 0;
      for (const v of RANK.values()) if (v < 0) neg++;
      return { sinonima: Object.keys(SYNONYMS).length, saFrekvencijom: neg };
    });
    ok('sinonimi se učitavaju (kurirani rečnik — bez mašinskog šuma)', extras.sinonima >= 2, `${extras.sinonima}`);
    ok('frekvencijsko rangiranje radi', extras.saFrekvencijom > 100000, `${extras.saFrekvencijom} reči`);
    const sinGrupa = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'sunce';
      document.getElementById('rimeBtn').click();
      await w(900);
      // naslovi grupa su `h2` otkad je popravljen preskočeni nivo (N9/N14);
      // `h3` ostaje u selektoru da provera radi i na starom kodu
      return [...document.getElementById('rimeResults').querySelectorAll('h2, h3')].map(e => e.textContent.trim());
    });
    ok('grupa „Sinonimi" se prikazuje za kuriranu reč („sunce")', sinGrupa.some(g => /Sinonimi/i.test(g)), sinGrupa.join(' / '));
    /* Od 20.08.2026. sinonimi su KURIRANI (vlasnica: „bolje nijedan nego
       gluposti") — reč bez kuriranog unosa NE sme pokazivati grupu. */
    const sinLjubav = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('rimeInput').value = 'ljubav';
      document.getElementById('rimeBtn').click();
      await w(900);
      return [...document.getElementById('rimeResults').querySelectorAll('h2, h3')].map(e => e.textContent.trim());
    });
    ok('reč bez kuriranih sinonima NE prikazuje grupu („ljubav")', !sinLjubav.some(g => /Sinonimi/i.test(g)), sinLjubav.join(' / '));

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

    // Sinonimi NE smeju u panel uz stih: kurirana reč „šišarka" ima sinonim
    // („šišarica") koji se ne rimuje, pa uz stih izgleda kao greška u alatu.
    // (Do 20.08.2026. ovde je bila „naći" — tad su sinonimi bili mašinski;
    // sada su kurirani, pa se proverava na kuriranoj reči. „šišarka" ima
    // dovoljno rima i za tok „još N rima" ispod.)
    const bezSinonima = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      // glavni rezultati dobiju „šišarka" (kurirana reč) — kartica sinonima
      document.getElementById('rimeInput').value = 'šišarka';
      document.getElementById('rimeBtn').click();
      await w(1000);
      const syn = document.querySelectorAll('#rimeResults .syn-card .chip').length;
      const ed = document.getElementById('noteEditor');
      ed.innerHTML = 'tu je moja šišarka';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      const sel = getSelection(), r = document.createRange();
      r.selectNodeContents(ed); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
      await w(900);
      return {
        reci: [...document.querySelectorAll('#noteRhymes .chip .word')].map(x => x.textContent.trim()),
        imaSinonimaUGlavnom: syn,
      };
    });
    const sinonimiUPanelu = ['šišarica']
      .filter(w => bezSinonima.reci.includes(w));
    ok('„šišarka" ima sinonime u glavnim rezultatima (kurirani)', bezSinonima.imaSinonimaUGlavnom > 0,
      'nema sinonima — provera je bezvredna');
    ok('sinonimi NE ulaze u panel uz stih', sinonimiUPanelu.length === 0, sinonimiUPanelu.join(', '));
    ok('panel uz stih i dalje ima prave rime', bezSinonima.reci.some(w => /arka$/.test(w)),
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
    ok('klik na rimu ubacuje reč sa razmakom', / \S+$/.test(posleKlika.tekst) && !/šišarka\p{L}/iu.test(posleKlika.tekst),
      JSON.stringify(posleKlika.tekst));
    ok('panel ostaje usidren za reč sa kojom se rimuje', posleKlika.naslov === 'šišarka', posleKlika.naslov);
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

    /* Ijekavica u igri NIKAD (prijava vlasnice 16.08.2026: igra je ponudila
       „dvije"). Bazen poznatih reči se gradi po frekvenciji iz celog WORDS —
       dakle i iz ijekavskog dela — pa se sada filtrira pri izboru. Ista
       provera štiti i kockicu kad kvačica „ijekavica" nije uključena. */
    const jek = await page.evaluate(() => {
      const izborIgre = x => !BLOCKED.has(x) && !jeJekavskaRec(x) && imaRimu(x);
      let profulo = null;
      for (let i = 0; i < 400; i++) {
        const w = randomCommonWord(izborIgre);
        if (w && jeJekavskaRec(w)) { profulo = w; break; }
      }
      /* Igra ne sme ponuditi ijekavicu NI KAD je kvačica „uključi ijekavicu"
         uključena — pravilo je apsolutno. Privremeno uključimo i probamo. */
      const bilo = includeJek;
      includeJek = true;
      let profuloJek = null;
      for (let i = 0; i < 400; i++) {
        const w = randomCommonWord(izborIgre);
        if (w && jeJekavskaRec(w)) { profuloJek = w; break; }
      }
      includeJek = bilo;
      return {
        dvijeJestJek: jeJekavskaRec('dvije'), dveNije: !jeJekavskaRec('dve'),
        profulo, profuloJek, znanstveni: SET.has('znanstveni'),
      };
    });
    ok('igra poznaje ijekavske oblike (dvije → jeste, dve → nije)',
       jek.dvijeJestJek === true && jek.dveNije === true);
    ok('igra u 400 izbora ne ponudi nijednu ijekavsku reč',
       jek.profulo === null, jek.profulo ? `ponudila: „${jek.profulo}"` : '');
    ok('igra ne ponudi ijekavicu ni kad je „uključi ijekavicu" čekirano',
       jek.profuloJek === null, jek.profuloJek ? `ponudila: „${jek.profuloJek}"` : '');
    ok('rečnik ima „znanstveni" (prijava vlasnice 16.08.2026)', jek.znanstveni === true);

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

    /* Do 30.07.2026. je logo bio Fredoka, a ostatak sajta Quicksand. Vlasnica je tog dana
       odlučila: **jedan font na celoj temi** — Rubik. Razlog nije ukus nego kvar: Fredoka
       NEMA slova č, ć, đ ni ђ ћ њ љ џ (izmereno — imala su tačno širinu sistemskog serifa),
       pa je svako „reč" u naslovu mešalo dva fonta, na svih 1.993 strane. Quicksand nema
       ćirilicu uopšte. Rubik ima sve, provereno merenjem širine glifa.
       Pravilo 8a i dalje važi: veličina i debljina logotipa se NE diraju. */
    console.log('\n11) LOGO — mora ostati veliki, sa fontom Rubik (jedan font na celom sajtu)');
    const logo = await page.evaluate(() => {
      const el = document.querySelector('.brand-logo, .brand h1, .brand-h');
      if (!el) return { greska: 'nema logo' };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { font: cs.fontFamily, px: parseFloat(cs.fontSize), sirina: Math.round(r.width) };
    });
    ok('logo koristi font Rubik (isti kao ceo sajt)', /Rubik/i.test(logo.font || ''), `font: ${logo.font}`);
    ok('nijedan stari font nije ostao u logotipu', !/Fredoka|Quicksand|Fira Sans/i.test(logo.font || ''), `font: ${logo.font}`);
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
      if (/fonts\.googleapis|fonts\.gstatic/.test((m.location() && m.location().url) || '')) return;
      /* Od 26.08.2026. test SAM blokira Google-ovu analitiku (v. `chromium.launch`),
         pa pregledač za nju prijavi `ERR_CONNECTION_REFUSED`. To je posledica naše
         namerne blokade, ne kvar sajta — inače bi provera „nula grešaka" padala uvek
         i prestala da išta znači. Isti izuzetak već postoji u globalnom osluškivaču. */
      if (/googletagmanager|google-analytics|analytics\.google/.test(t)) return;
      if (/googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
      if (/ERR_CONNECTION_REFUSED/.test(t) && /googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
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
    /* Sinonimi su od 20.08.2026. kurirani (bez mašinskog šuma) — proverava se
       na kuriranoj reči („sunce"), jer „ljubav" kurirani sinonim još nema. */
    const sinNaStrani = await pAlat.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const ri = document.getElementById('rimeInput');
      ri.value = 'sunce'; document.getElementById('rimeBtn').click();
      await w(1000);
      return [...document.getElementById('rimeResults').querySelectorAll('h2, h3')].map(e => e.textContent.trim());
    });
    ok('/rimovanje-reci/ → sinonimi se prikazuju za kuriranu reč', (sinNaStrani || []).some(g => /Sinonimi/i.test(g)),
       (sinNaStrani || []).join(' / '));
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
      if (/fonts\.googleapis|fonts\.gstatic/.test((m.location() && m.location().url) || '')) return;
      /* Od 26.08.2026. test SAM blokira Google-ovu analitiku (v. `chromium.launch`),
         pa pregledač za nju prijavi `ERR_CONNECTION_REFUSED`. To je posledica naše
         namerne blokade, ne kvar sajta — inače bi provera „nula grešaka" padala uvek
         i prestala da išta znači. Isti izuzetak već postoji u globalnom osluškivaču. */
      if (/googletagmanager|google-analytics|analytics\.google/.test(t)) return;
      if (/googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
      if (/ERR_CONNECTION_REFUSED/.test(t) && /googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
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
      if (/fonts\.googleapis|fonts\.gstatic/.test((m.location() && m.location().url) || '')) return;
      /* Od 26.08.2026. test SAM blokira Google-ovu analitiku (v. `chromium.launch`),
         pa pregledač za nju prijavi `ERR_CONNECTION_REFUSED`. To je posledica naše
         namerne blokade, ne kvar sajta — inače bi provera „nula grešaka" padala uvek
         i prestala da išta znači. Isti izuzetak već postoji u globalnom osluškivaču. */
      if (/googletagmanager|google-analytics|analytics\.google/.test(t)) return;
      if (/googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
      if (/ERR_CONNECTION_REFUSED/.test(t) && /googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
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
    /* Od 31.07.2026. panel NIJE prazan — u njemu stoji prazno stanje (`.prazno-stanje`),
       tekst koji jedini kaže da uz rime idu značenje, sinonimi i beležnica. Provera zato
       više ne traži prazan panel nego ono zbog čega je i nastala: da tu NEMA rima ni
       poruke o učitavanju dok korisnik sam ne zatraži. Tražiti doslovno prazno značilo bi
       da provera zabranjuje sadržaj, a ne bag. */
    const stanjePanela = () => pCist.evaluate(() => {
      const box = document.getElementById('rimeResults');
      return { rima: box.querySelectorAll('.chip, .word').length,
               poruka: /Učitavam|Nema rime|Greška/i.test(box.innerText || ''),
               praznoStanje: !!box.querySelector('.prazno-stanje') };
    });
    const odmah = await stanjePanela();
    ok('početna → panel nema rime ni poruku o učitavanju pri učitavanju',
       odmah.rima === 0 && !odmah.poruka && odmah.praznoStanje, JSON.stringify(odmah));
    await pCist.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0,
                                { timeout: 120000 }).catch(() => {});
    await pauza(1200);
    const posleRecnika = await stanjePanela();
    ok('početna → panel ostaje bez rima ni kad se rečnik učita',
       posleRecnika.rima === 0 && !posleRecnika.poruka && posleRecnika.praznoStanje,
       JSON.stringify(posleRecnika));
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
          /* Adresa za saradnju je od 02.08.2026. `eureka@`, ne više `info@`.
             `info@` i dalje radi kao rezerva, ali se NIGDE na sajtu ne
             prikazuje — zato se ovde traži nova, a stara se proverava zasebno
             (niže) da nije negde ostala. */
          mejl: document.body.innerText.includes('eureka@rimoteka.com'),
          mejlHref: [...document.querySelectorAll('a[href^="mailto:"]')]
            .some(a => a.getAttribute('href').startsWith('mailto:eureka@rimoteka.com')),
          staraAdresa: document.body.innerText.includes('info@rimoteka.com'),
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
        /* Adresa se od 03.08.2026. više NE ispisuje — nosi je dugme „Saradnja"
           preko `mailto:`. Provera zato gleda samu adresu u `href`-u: ono zbog
           čega je nastala (da se `eureka` ne pretvori u `еурека`) i dalje važi. */
        if (put === '/') ok('početna → mejl adresa se ne prebacuje u ćirilicu',
                            r.mejlHref === true, r.mejlHref === true ? '' : 'adresa u dugmetu nije latinična');
        if (put === '/') ok('početna → stara adresa info@ se više ne prikazuje',
                            r.staraAdresa === false, 'nađena stara adresa na strani');
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
              /* Od 31.07.2026. su ⓘ ♡ 🔁 na telefonu sklonjeni iz pilule i
                 pojavljuju se iznad reči na dodir. Sakriven element ima
                 pravougaonik 0×0 na koordinati 0,0 — što je levo od čipa, pa
                 bi ga ova provera prijavila kao „viri". Ne vidi se uopšte,
                 dakle ne može da viri; ono što se VIDI i dalje se meri. */
              if (eb.width === 0 && eb.height === 0) return;
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
      if (/fonts\.googleapis|fonts\.gstatic/.test((m.location() && m.location().url) || '')) return;
      /* Od 26.08.2026. test SAM blokira Google-ovu analitiku (v. `chromium.launch`),
         pa pregledač za nju prijavi `ERR_CONNECTION_REFUSED`. To je posledica naše
         namerne blokade, ne kvar sajta — inače bi provera „nula grešaka" padala uvek
         i prestala da išta znači. Isti izuzetak već postoji u globalnom osluškivaču. */
      if (/googletagmanager|google-analytics|analytics\.google/.test(t)) return;
      if (/googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
      if (/ERR_CONNECTION_REFUSED/.test(t) && /googletagmanager|google-analytics|analytics\.google/.test((m.location() && m.location().url) || '')) return;
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
      for (const [tab, put] of [['pretraga','/rime-po-zavrsetku/'], ['slogovi','/slogovi/'],
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
      await p17.type('#rimeInput', 'сунце', { delay: 20 });   // kurirana reč (sinonimi su kurirani od 20.08.)
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
        /* Obrazac hvata PADEŽE — srpski je padežan jezik, pa „sa dečjim režimom" i „uključi
           dečji režim" moraju oba da prođu. Do 31.07.2026. je tražen samo nominativ
           („dečji režim"), pa je provera pala na tekstu koji uredno pominje režim u
           instrumentalu. Provera ne sme da diktira padež — samo da traži da je pomenut. */
        ok(`${s} pominje dečji režim umesto da tvrdi da je uvek uključen`,
           /dečj\w*\s+režim\w*/i.test(d.lead), d.lead.slice(0, 90));
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
      /* PADEŽ U NASLOVU — pravilo, ne određen tekst.
         „Rime za mama" je pogrešno (treba „za mamu"), a padež se NE SME izvoditi iz
         završetka: „-a" imaju i imenice, i pridevi, i glagoli. Ranije se to rešavalo
         umetanjem reči „reč" („Rime za reč „mama“"), pa je i provera tražila baš taj
         tekst. Od 28.08.2026. naslov je pitanje koje ljudi kucaju („Šta se rimuje sa
         „mama“?"), a padež rešavaju NAVODNICI: reč u navodnicima je citat i ostaje u
         nominativu i kad predlog traži drugi padež.
         Zato provera više ne traži određenu formulaciju nego ono što je zaista bitno:
         reč mora biti u navodnicima i NE SME stajati gola iza predloga. */
      const uNavodnicima = /„mama“/.test(rec.title);
      const golaIzaPredloga = /\b(sa|za|o|u|s)\s+mama\b/i.test(rec.title);
      ok('naslov ne stavlja reč u pogrešan padež (reč je u navodnicima)',
         uNavodnicima && !golaIzaPredloga, rec.title);
      ok('naslov nema „N reči koje" kad je N%10===1',
         !/\b\d*1 reči koje/.test(rec.title), rec.title);
      ok('breadcrumb ima sva tri nivoa', rec.mrve.length >= 3, rec.mrve.join(' › '));
      /* Uvod je 31.07.2026. prepisan („Sve što se rimuje sa „mama" — 86 reči…"), pa provera
         više ne traži predikat nego ono zbog čega je i postojala: da se OBLIK reči slaže sa
         brojem. U srpskom oblik zavisi od POSLEDNJE cifre — 1 reč, 2 reči, 21 reč, 11 reči. */
      /* NE koristiti \b: u JS-u je granica reči definisana samo nad [A-Za-z0-9_], pa „č“
         važi kao NE-slovo — zbog toga „reč\b“ pogađa i unutar „reči“ i provera daje
         tačno obrnut rezultat. Zato duži oblik ide prvi i traži se da posle njega
         nema slova (\p{L} uz zastavicu u). */
      const _bp = rec.lead.match(/(\d+)\s+(reči|reč)(?!\p{L})/u);
      const _jedn = _bp && Number(_bp[1]) % 10 === 1 && Number(_bp[1]) % 100 !== 11;
      ok('oblik reči se slaže sa brojem („1 reč" / „86 reči")',
         !!_bp && (_jedn ? _bp[2] === 'reč' : _bp[2] === 'reči'), rec.lead);
      ok('og:image je društvena slika 1200×630', /og-slika\.png/.test(rec.og), rec.og);
      ok('twitter:card je summary_large_image', rec.tw === 'summary_large_image', rec.tw);

      // robots.txt — do 19.08.2026. je gasio ~50.000 parametarskih duplikata
      // početne; tada je `?rec=` NAMERNO odblokiran (dinamičke adrese su SEO
      // nosilac za reči bez statičke strane — v. sekciju 2b). Blokirani moraju
      // ostati ostali upitnici.
      await p19.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
      const rb = await p19.evaluate(() => document.body.innerText);
      ok('robots.txt i dalje blokira ostale upitnike (?tab=, ?pesma=)',
         /Disallow:\s*\/\*\?tab=/.test(rb) && /Disallow:\s*\/\*\?pesma=/.test(rb), rb.slice(0, 160));

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
      /* Od 06.09.2026 (varijanta B) ikonice ne stoje u kapsuli: prelazak mišem otvara
         traku nad reči, pa se „omiljene" bira u njoj. Stanje (`.fav.on`) ostaje na čipu. */
      await p20.locator('#rimeResults .chip').first().hover();
      await pauza(500);
      await p20.click('.chip-actions .ca-btn[data-act="fav"]');
      await pauza(400);
      /* Od 02.08.2026. sačuvana reč više NE dobija puno srce nego PUNU
         LJUBIČASTU NOTU — isti crtež kao note u futeru (zahtev vlasnice).
         Zato se ne gleda tekst dugmeta nego: da li je nota vidljiva, da li je
         srce sklonjeno i da li je nota u boji note, a ne u boji srca. */
      const posle = await p20.evaluate(() => {
        const b = document.querySelector('#rimeResults .chip .fav');
        const tb = document.querySelector('.chip-actions .ca-btn[data-act="fav"]');
        const nota = tb?.querySelector('.ca-ic svg');
        return {
          broj: document.getElementById('favCount').textContent,
          ukljucena: b?.classList.contains('on') && tb?.classList.contains('on'),
          notaVidljiva: nota ? +getComputedStyle(nota).opacity : -1,
          srceSakriveno: tb && /♡|srce/.test(tb.innerHTML) ? 1 : 0,
          bojaNote: tb ? getComputedStyle(tb.querySelector('.ca-ic')).color : '',
          visinaNote: nota ? Math.round(nota.getBoundingClientRect().height) : 0,
        };
      });
      ok('♥ na reči povećava brojač omiljenih', posle.broj === '1', `brojač: ${posle.broj}`);
      ok('sačuvana reč dobija punu notu u traci, ne srce',
         posle.ukljucena === true && posle.notaVidljiva === 1 && posle.srceSakriveno === 0,
         `nota ${posle.notaVidljiva}, srce ${posle.srceSakriveno}`);
      ok('nota je nacrtana i ima veličinu',
         posle.visinaNote >= 12, `visina note ${posle.visinaNote} px`);
      ok('nota je u ljubičastoj boji note, ne u boji srca',
         /^rgb\(111, 75, 208\)$|^rgb\(184, 165, 245\)$/.test(posle.bojaNote), posle.bojaNote);

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
         kraj.length > 5 && kraj.every(w => w.toLowerCase().endsWith('ost')), `${kraj.length}: ${kraj.slice(0, 3).join(', ')}`);
      const poc = await trazi('starts', 'cvet');
      /* Poređenje ide malim slovima: od 02.08.2026. u rečniku stoje i vlastita
         imena velikim slovom (`Cveta`, `Beograd`), pa `startsWith('cvet')` na
         zapisu daje lažan pad — reč JESTE pogodak, samo počinje velikim C. */
      ok('režim „počinje na…" vraća samo reči na „cvet"',
         poc.length > 2 && poc.every(w => w.toLowerCase().startsWith('cvet')),
         `${poc.length}: ${poc.slice(0, 3).join(', ')}`);
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
        '/', '/rime-za/', '/rimovanje-reci/', '/rime-po-zavrsetku/', '/slogovi/',
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
      ok('sinonimi.json se učitava (kurirani — bez mašinskog šuma)',
         syn && Object.keys(syn).length >= 2, syn ? `${Object.keys(syn).length}` : 'nije učitan');
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
              // sakriveno na telefonu (ikonice od 31.07.2026) ne može da viri
              if (dr.width === 0 && dr.height === 0) return;
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

      // M4: ništa ne širi stranicu preko ekrana; traka tabova se PRELAMA —
      // svaka stavka je CELA vidljiva (odluka vlasnice 16.08.2026: ništa se ne
      // seče — ranija maska je pilule pravila odsečenim na ivici ekrana)
      const m4 = await p26.evaluate(() => {
        const lose = [...document.querySelectorAll('#tabs [data-tab]')].filter(a => {
          const r = a.getBoundingClientRect();
          return r.left < -0.5 || r.right > window.innerWidth + 0.5;
        }).map(a => a.textContent.trim());
        return { doc: document.documentElement.scrollWidth, ekran: window.innerWidth, lose };
      });
      ok('M4 · stranica se ne širi preko ekrana na telefonu', m4.doc <= m4.ekran,
         `dokument ${m4.doc} px, ekran ${m4.ekran} px`);
      ok('M4 · sve stavke trake tabova su cele vidljive (ništa se ne seče)',
         m4.lose.length === 0, `odsečene: ${m4.lose.join(', ')}`);

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

    console.log('\n27) UČESTALOST JE SABRANA, NE PREPISANA (nalaz F1)');
    /* Do 30.07.2026. je `frekvencija.json` za svaki oblik čuvao ZADNJE pročitano
       čitanje iz srLex-a umesto SUME. Dokaz: oblik `voda` ima u srLex-u četiri reda
       (1.346 + 12.793 + 32.283 + 876 = 47.298), a u fajlu je stajalo **876** —
       vrednost zadnjeg reda, i to glagola `vodati`. Zato je `voda` ispadala iz
       bazena „poznatih reči" za kockicu i igru, a `dva` (9) i `veliki` (34) su bili
       prijavljeni kao ređi od reči koje niko ne govori.
       Ove provere su puštene protiv STAROG fajla i pale su — tek tad su uzete kao
       valjane (pravilo iz PROPUSTI.md). */
    {
      const f = await (await fetch(`${BASE}/frekvencija.json?v=20260730a`)).json();
      // 1) sabrano, ne prepisano — granice su znatno ispod stvarnih suma
      ok('frekvencija · „voda" je sabrana (> 40.000, bilo 876)',
         (f['voda'] || 0) > 40000, `voda = ${f['voda']}`);
      ok('frekvencija · „dva" je sabrano (> 300.000, bilo 9)',
         (f['dva'] || 0) > 300000, `dva = ${f['dva']}`);
      ok('frekvencija · „veliki" je sabran (> 150.000, bilo 34)',
         (f['veliki'] || 0) > 150000, `veliki = ${f['veliki']}`);
      // 2) česta reč ne sme biti ređa od retke — obrnut poredak je bio simptom
      ok('frekvencija · „voda" je češća od „zavoda"',
         (f['voda'] || 0) > (f['zavoda'] || 0), `voda ${f['voda']} vs zavoda ${f['zavoda']}`);
      // 3) Matica pokriva rupe u srLex-u
      const m = await (await fetch(`${BASE}/matica.json?v=1`)).json();
      ok('matica.json · postoji i ima sadržaj', Array.isArray(m) && m.length > 1000,
         `${Array.isArray(m) ? m.length : 0} reči`);
      ok('matica.json · „hiljada" je potvrđena (srLex je ne zna)',
         Array.isArray(m) && m.includes('hiljada'));
      // 4) reč potvrđena u Matici mora ići PRED reč koju nijedan izvor ne potvrđuje
      const rang = await page.evaluate(() => ({
        hiljada: RANK.get('hiljada'), abakuse: RANK.get('abakuse'), voda: RANK.get('voda')
      }));
      ok('rang · „voda" ima stvaran broj (negativan rang)', rang.voda < 0, `rang ${rang.voda}`);
      ok('rang · „hiljada" ide PRED „abakuse" (viđen 1 put)',
         rang.hiljada < rang.abakuse, `hiljada ${rang.hiljada} vs abakuse ${rang.abakuse}`);
    }

    console.log('\n28) JEKAVSKI OBLICI NE IZLAZE BEZ KVAČICE (nalaz J1)');
    /* Prijava vlasnice 30.07.2026: „naizmjence izašlo iako nije čekirana ijekavica".
       Uzrok: ijekavica se uključuje širenjem granice (`limit = includeJek ?
       WORDS.length : jekStart`), a `naizmjence` stoji u `reci.txt` — PRE granice —
       pa je izlazilo uvek. Takvih reči je 1.127; 850 nedvosmislenih se filtrira
       preko `jekavski.json`, a 277 spornih (`ded`, `dio`, `dobivati`) čeka odluku
       vlasnice jer su u Rečniku Matice srpske kao standardne.
       Ova provera je puštena protiv starog koda i pala je. */
    {
      const j = await (await fetch(`${BASE}/jekavski.json?v=1`)).json();
      ok('jekavski.json · postoji i ima sadržaj', Array.isArray(j) && j.length > 500,
         `${Array.isArray(j) ? j.length : 0} reči`);
      ok('jekavski.json · sadrži „naizmjence" (prijava vlasnice)',
         Array.isArray(j) && j.includes('naizmjence'));

      const ctx28 = await browser.newContext();
      const p28 = ojacajStranu(await ctx28.newPage());
      await p28.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await p28.waitForFunction(() => typeof JEKAVSKI !== 'undefined' && JEKAVSKI.size > 0, { timeout: 25000 })
        .catch(() => {});
      // kvačica je podrazumevano ISKLJUČENA — jekavski oblik ne sme izaći
      const bez = await p28.evaluate(() => {
        const rez = { kvacica: document.getElementById('jekToggle')?.checked, ima: null, ukupno: 0 };
        document.getElementById('rimeInput').value = 'naizmence';
        doRhymes(true);
        const reci = [...document.getElementById('rimeResults').querySelectorAll('.word')].map(e => e.textContent.trim());
        rez.ukupno = reci.length;
        rez.ima = reci.includes('naizmjence');
        return rez;
      }).catch(() => null);
      if (bez) {
        ok('kvačica za ijekavicu je podrazumevano isključena', bez.kvacica === false);
        ok('bez kvačice · „naizmjence" NE izlazi među rimama za „naizmence"',
           bez.ima === false, `rima ukupno ${bez.ukupno}`);
        ok('bez kvačice · rime za „naizmence" ipak postoje (nije sve pobrisano)',
           bez.ukupno > 0, `${bez.ukupno} rima`);
      } else {
        ok('bez kvačice · „naizmjence" NE izlazi među rimama', false, 'provera nije mogla da se izvrši');
      }
      await ctx28.close();
    }

    console.log('\n29) FONT IMA SVA SRPSKA SLOVA (nalaz T1)');
    /* 30.07.2026: vlasnica je primetila da slovo „č" u naslovima izgleda drugačije.
       Ispalo je da Fredoka NEMA `č ć đ` ni `ђ ћ њ љ џ` — pregledač je za svako to slovo
       tiho uzimao sistemski serif, pa je „reč" u naslovu mešalo dva fonta, na svih
       1.993 strane. Isto je i Quicksand bio bez cele ćirilice, a Fira Sans bez `ђ ћ њ љ џ`.

       KLJUČNO: `document.fonts.check()` i `unicode-range` NE POMAŽU — oni najavljuju
       opseg, a ne garantuju da glyph postoji. Fredoka je za `č` vraćala `true`.
       Jedini pouzdan način je MERENJE ŠIRINE: ako slovo u našem fontu ima potpuno istu
       širinu kao u sistemskom serifu, a obično slovo (npr. „a") nema — glifa nema. */
    {
      const SLOVA = ['č','ć','đ','š','ž','Č','Ć','Đ','Š','Ž',      // srpska latinica
                     'ђ','ћ','њ','љ','џ','Ђ','Ћ','Њ','Љ','Џ',      // srpska ćirilica
                     'а','б','в','г','д','ж','з','и','ј','к'];      // osnovna ćirilica
      const nalaz = await page.evaluate(async (slova) => {
        const fam = getComputedStyle(document.body).fontFamily;
        const prvi = fam.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
        await document.fonts.load(`400 200px "${prvi}"`, slova.join('') + 'a');
        await document.fonts.load(`700 200px "${prvi}"`, slova.join('') + 'a');
        await document.fonts.ready;
        const m = document.createElement('span');
        m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:200px';
        document.body.appendChild(m);
        const w = (f, z) => { m.style.fontFamily = f; m.textContent = z; return +m.getBoundingClientRect().width.toFixed(1); };
        // kontrola: font se uopšte učitao? („a" mora da se razlikuje od serifa)
        const ucitan = w(`"${prvi}"`, 'a') !== w('serif', 'a');
        const fali = ucitan ? slova.filter(z => w(`"${prvi}"`, z) === w('serif', z)) : [];
        m.remove();
        return { font: prvi, ucitan, fali };
      }, SLOVA);

      ok(`font strane se učitao (${nalaz.font})`, nalaz.ucitan === true,
         nalaz.ucitan ? '' : 'meri se rezervni font — provera ispod ne vredi');
      ok(`font „${nalaz.font}" ima sva srpska slova`, nalaz.ucitan && nalaz.fali.length === 0,
         nalaz.fali.length ? `FALI: ${nalaz.fali.join(' ')} — ta slova padaju na sistemski serif` : '');

      // isto za font naslova — može biti drugi ako neko opet uvede dva fonta
      const nalazH = await page.evaluate(async (slova) => {
        const h = document.querySelector('h1') || document.body;
        const fam = getComputedStyle(h).fontFamily;
        const prvi = fam.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
        await document.fonts.load(`700 200px "${prvi}"`, slova.join('') + 'a');
        await document.fonts.ready;
        const m = document.createElement('span');
        m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:200px;font-weight:700';
        document.body.appendChild(m);
        const w = (f, z) => { m.style.fontFamily = f; m.textContent = z; return +m.getBoundingClientRect().width.toFixed(1); };
        const ucitan = w(`"${prvi}"`, 'a') !== w('serif', 'a');
        const fali = ucitan ? slova.filter(z => w(`"${prvi}"`, z) === w('serif', z)) : [];
        m.remove();
        return { font: prvi, ucitan, fali };
      }, SLOVA);
      ok(`naslovi imaju sva srpska slova (${nalazH.font})`, nalazH.ucitan && nalazH.fali.length === 0,
         nalazH.fali.length ? `FALI: ${nalazH.fali.join(' ')}` : '');
      ok('naslovi i telo koriste ISTI font (jedan font na celom sajtu)',
         nalaz.font === nalazH.font, `telo ${nalaz.font} · naslovi ${nalazH.font}`);
    }

    /* ─────────────────────────────────────────────────────────────────────
       30) MOBILNA VERZIJA — 31.07.2026

       Tri prijave/nalaza, sve tri izmerene pre popravke na 390×844:

       · TASTATURA JE ZAKLANJALA RIME U BELEŽNICI (prijava vlasnice). Panel je
         `position:fixed; bottom:0`, a to se meri prema layout viewport-u koji
         se pri otvaranju tastature NE smanjuje. Panel je stajao 557–844 px, a
         tastatura pokriva od ~508 naniže — dakle nijedna rima se nije videla.
       · RIME SU BILE JEDNA ISPOD DRUGE. Čip sa tri ikonice bio je širok 228 px
         od 390, pa je u red stajala jedna reč: 195 rima = spisak od 12.524 px.
       · IKONICE SU SE GUBILE. Sklonjene su iz pilule, pa mora da postoji drugi
         put do njih — dodir na reč.

       Provere su prvo puštene protiv STAROG koda (`git stash`) i tamo padaju
       — inače ne bi ništa dokazivale. Rezultat na starom kodu: pala prva
       (panel 557 > 508), pala treća (2,83 → 1,00 reč po redu), pala peta
       (nema `.chip-actions` uopšte). */
    console.log('\n30) MOBILNA VERZIJA — tastatura, mreža rima, traka nad rečju');
    {
      const ctx30 = await browser.newContext({
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
        deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });
      const p30 = ojacajStranu(await ctx30.newPage());

      // ── A. RIME: pilule grle reč i pakuju se gusto (2–4 u redu), bez ikonica
      // u piluli. Od 16.08.2026 (druga prijava vlasnice) više nema mreže sa
      // jednakim kolonama — pilula je široka tačno koliko reč, pa u red staje
      // onoliko koliko stvarno stane; granica od 4 sprečava povratak na
      // „jedna ispod druge" i na „natrpanih 6 u redu".
      await p30.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p30.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p30.evaluate(() => {
        document.getElementById('rimeInput').value = 'ljubav';
        document.getElementById('rimeBtn').click();
      });
      await pauza(1500);
      const a30 = await p30.evaluate(() => {
        const chips = [...document.querySelectorAll('#rimeResults .chip')];
        const redovi = {};
        chips.forEach(c => { const t = Math.round(c.getBoundingClientRect().top); (redovi[t] ||= []).push(c); });
        const brojevi = Object.values(redovi).map(r => r.length);
        const vidljiveIkonice = chips.reduce((n, c) => n + [...c.querySelectorAll('.mini')]
          .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.classList.contains('fav'); }).length, 0);
        const niski = chips.filter(c => c.getBoundingClientRect().height < 44).length;
        return {
          broj: chips.length,
          poRedu: brojevi.length ? (chips.length / brojevi.length) : 0,
          najviseURedu: Math.max(...brojevi),
          vidljiveIkonice, niski,
          visinaSpiska: Math.round(document.getElementById('rimeResults').getBoundingClientRect().height),
          preliv: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      ok('mobilni · u redu stoje 2–4 rime, ne jedna i ne natrpano',
         a30.poRedu >= 2 && a30.najviseURedu <= 4, `prosek ${a30.poRedu.toFixed(2)}, najviše ${a30.najviseURedu}`);
      ok('mobilni · ⓘ i 🔁 nisu u pilули (šire je i guraju reči u novi red)',
         a30.vidljiveIkonice === 0, `vidljivih ${a30.vidljiveIkonice}`);
      ok('mobilni · spisak od 195 rima je kraći od 6.000 px (bio 12.524)',
         a30.visinaSpiska > 0 && a30.visinaSpiska < 6000, `${a30.visinaSpiska} px`);
      ok('mobilni · svaka pilula je bar 44 px visoka (dodirni cilj)',
         a30.broj > 50 && a30.niski === 0, `nižih od 44 px: ${a30.niski}`);
      ok('mobilni · strana se ne širi preko ekrana', a30.preliv === false);

      /* REČ SE NE SEČE — NIKAD (odluka vlasnice 16.08.2026, posle „aerobi…",
         „aforist…" na njenom telefonu). Elipsa je uklonjena iz CSS-a, a
         `izmeriCipove()` širi pilulu za svaki manjak. Provera: ni jedna `.word`
         ne sme imati sadržaj širi od svog okvira. */
      const secene = await p30.evaluate(() =>
        [...document.querySelectorAll('#rimeResults .chip .word')]
          .filter(w => w.scrollWidth > w.clientWidth + 1)
          .map(w => w.textContent));
      ok('mobilni · nijedna reč u piluli nije odsečena (bez „…")',
         secene.length === 0, `odsečene: ${secene.slice(0, 8).join(', ')}`);

      // ── B. Dodir na reč otvara traku sa radnjama IZNAD reči
      const b30 = await p30.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const cip = [...document.querySelectorAll('#rimeResults .chip')][6];
        cip.scrollIntoView({ block: 'center' });
        await w(150);
        cip.querySelector('.word').click();
        await w(150);
        const t = document.querySelector('.chip-actions');
        if (!t || t.hidden) return { ima: false };
        const tr = t.getBoundingClientRect(), cr = cip.getBoundingClientRect();
        return {
          ima: true,
          rec: cip.dataset.w,
          dugmadi: [...t.querySelectorAll('.ca-btn')].map(b => b.dataset.act),
          iznad: tr.bottom <= cr.top + 1,
          uEkranu: tr.left >= 0 && tr.right <= window.innerWidth && tr.top >= 0,
          najnize: Math.min(...[...t.querySelectorAll('.ca-btn')].map(b => Math.round(b.getBoundingClientRect().height))),
          izabran: cip.classList.contains('chip-izabran'),
        };
      });
      ok('mobilni · dodir na reč otvara traku sa radnjama', b30.ima === true);
      ok('mobilni · traka nudi sve četiri radnje',
         b30.ima && ['def', 'fav', 'rime', 'kopiraj'].every(a => (b30.dugmadi || []).includes(a)),
         (b30.dugmadi || []).join(','));
      ok('mobilni · traka stoji IZNAD reči i cela je u ekranu',
         b30.iznad === true && b30.uEkranu === true, JSON.stringify(b30));
      ok('mobilni · dugmad u traci su bar 44 px visoka', b30.najnize >= 44, `${b30.najnize} px`);
      ok('mobilni · dodirnuta reč je vidno označena', b30.izabran === true);

      // radnja „omiljene" mora zaista da radi, ne samo da postoji
      /* Svaki korak niže PROVERAVA da element postoji pre nego što ga dodirne.
         Bez toga jedan `null.click()` obara ceo test i sve sekcije POSLE ove
         ostanu nepokrenute — a test koji stane nije test koji je prošao. */
      const b30b = await p30.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const dug = document.querySelector('.chip-actions .ca-btn[data-act="fav"]');
        if (!dug) return { nema: true };
        const pre = JSON.parse(localStorage.getItem('rimoteka_favorites') || '[]').length;
        dug.click();
        await w(250);
        const posle = JSON.parse(localStorage.getItem('rimoteka_favorites') || '[]');
        const rec = document.querySelector('.chip-actions').dataset.w;
        /* Traži se po REČI, ne po `.chip-izabran`: traka se zatvara na svako
           pomeranje strane, pa bi provera zavisila od toga da li se pomeranje
           u međuvremenu smirilo — a meri se nešto sasvim drugo (ostaje li
           puno srce na sačuvanoj reči). */
        const cip = document.querySelector(`#rimeResults .chip[data-w="${CSS.escape(rec)}"]`);
        return { pre, posle: posle.length, sadrzi: posle.includes(rec),
                 znak: !!(cip && cip.querySelector('.fav.on')) };
      });
      ok('mobilni · „omiljene" iz trake zaista sačuva reč',
         b30b.posle === b30b.pre + 1 && b30b.sadrzi === true, JSON.stringify(b30b));
      ok('mobilni · sačuvana reč se prepozna i bez otvaranja trake (puno srce)',
         b30b.znak === true);

      // ── C. BELEŽNICA: panel sa rimama beži iznad tastature
      /* Playwright nema pravu tastaturu na ekranu, pa se `visualViewport`
         lažira tačno onako kako ga menja prava: visina padne za visinu
         tastature, `offsetTop` ostaje 0. Isto radi i iOS i Android. */
      for (const put of ['/', '/pisanje-pesama/']) {
        await p30.goto(BASE + put, { waitUntil: 'domcontentloaded' });
        await p30.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
        if (put === '/') { await p30.evaluate(() => switchTab('beleznica')); await pauza(400); }
        await p30.click('#noteEditor');
        await p30.evaluate(() => {
          const ed = document.getElementById('noteEditor');
          ed.innerHTML = 'Volim te kao sunce<div>ti si moja luda</div>';
          ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
        });
        await pauza(1200);

        const VISINA_TASTATURE = 336;          // iPhone 13, srpska tastatura
        const c30 = await p30.evaluate(async (kbH) => {
          const VV = window.visualViewport;
          const nova = window.innerHeight - kbH;
          Object.defineProperty(VV, 'height', { get: () => nova, configurable: true });
          Object.defineProperty(VV, 'offsetTop', { get: () => 0, configurable: true });
          VV.dispatchEvent(new Event('resize'));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const box = document.getElementById('noteRhymes');
          const p = box.getBoundingClientRect();
          const cip = box.querySelector('.chip');
          const c = cip ? cip.getBoundingClientRect() : null;
          return {
            kb: getComputedStyle(document.documentElement).getPropertyValue('--kb').trim(),
            vrhTastature: nova,
            panelDno: Math.round(p.bottom), panelVisina: Math.round(p.height),
            rima: box.querySelectorAll('.chip').length,
            prvaRimaDno: c ? Math.round(c.bottom) : null,
            imaStrelicu: !!box.querySelector('.nr-toggle'),
          };
        }, VISINA_TASTATURE);

        ok(`${put} · sajt zna koliko je tastatura visoka`, c30.kb === VISINA_TASTATURE + 'px', `--kb=${c30.kb}`);
        ok(`${put} · CEO panel sa rimama je iznad tastature`,
           c30.panelDno <= c30.vrhTastature + 1,
           `panel do ${c30.panelDno} px, tastatura počinje na ${c30.vrhTastature} px`);
        ok(`${put} · prva ponuđena rima se vidi`,
           c30.prvaRimaDno !== null && c30.prvaRimaDno <= c30.vrhTastature,
           `rima do ${c30.prvaRimaDno} px`);
        ok(`${put} · traka je niska da bi se video i stih (do 130 px)`,
           c30.panelVisina > 0 && c30.panelVisina <= 130, `${c30.panelVisina} px`);
        ok(`${put} · ima bar 8 rima nadohvat prsta`, c30.rima >= 8, `${c30.rima}`);

        // strelica razvija traku u pun list — i on mora da ostane iznad tastature
        const d30 = await p30.evaluate(async () => {
          const box = document.getElementById('noteRhymes');
          const s = box.querySelector('.nr-toggle');
          if (!s) return { nema: true, otvoren: false, dno: 1e9, visina: 0, vidljivih: 0 };
          s.click();
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const p = box.getBoundingClientRect();
          return { otvoren: box.classList.contains('nr-open'), dno: Math.round(p.bottom), visina: Math.round(p.height),
                   vidljivih: [...box.querySelectorAll('.chip')].filter(c => {
                     const r = c.getBoundingClientRect();
                     return r.top >= 0 && r.bottom <= window.innerHeight;
                   }).length };
        });
        ok(`${put} · strelica razvija traku u pun list`,
           d30.otvoren === true && d30.visina > c30.panelVisina, JSON.stringify(d30));
        ok(`${put} · razvijen list je i dalje iznad tastature`,
           d30.dno <= c30.vrhTastature + 1, `list do ${d30.dno} px`);
      }

      // ── D. Traka alata u beležnici: sedam dugmadi, sva dodirljiva
      /* Na /pisanje-pesama/ NEMA `#panel-beleznica` — postojeće pravilo za
         44 px bilo je vezano samo za taj id, pa se na strani koja SLUŽI za
         pisanje pesama nikad nije primenilo. Izmereno: 23 px. */
      const e30 = await p30.evaluate(() => {
        const b = [...document.querySelectorAll('.hint-actions .link-btn')];
        return { broj: b.length,
                 najnize: b.length ? Math.min(...b.map(x => Math.round(x.getBoundingClientRect().height))) : 0,
                 obrisiCrven: (() => {
                   const c = document.getElementById('clearNotes');
                   return c ? getComputedStyle(c).color : '';
                 })() };
      });
      ok('/pisanje-pesama/ · sve akcije u beležnici su bar 44 px visoke',
         e30.broj >= 7 && e30.najnize >= 44, `${e30.broj} dugmadi, najniže ${e30.najnize} px`);
      /* Akcije se PRELAMAJU u više redova — nijedna ne sme biti odsečena ivicom
         ekrana (odluka vlasnice 16.08.2026; ranije su „preuzmi…", „štampaj…"
         bile usečene u redu koji se pomerao u stranu). */
      const e30v = await p30.evaluate(() =>
        [...document.querySelectorAll('.hint-actions .link-btn')].filter(b => {
          const r = b.getBoundingClientRect();
          return r.left < -0.5 || r.right > window.innerWidth + 0.5;
        }).map(b => b.textContent.trim()));
      ok('/pisanje-pesama/ · nijedna akcija nije odsečena ivicom ekrana',
         e30v.length === 0, `odsečene: ${e30v.join(', ')}`);
      ok('/pisanje-pesama/ · „obriši sve" se bojom razlikuje od ostalih',
         /^rgb\(1(7|8)\d,\s*\d+,\s*\d+\)$/.test(e30.obrisiCrven), e30.obrisiCrven);

      /* Ista dugmad u TAMNOM režimu. Svetla pravila nose `id` u selektoru, pa
         su bila teža od tamnih — tamnocrvena #b3372a je ostajala na podlozi
         #241f38, izmereno 2,4:1. Meri se odnos, ne boja. */
      await p30.evaluate(() => { localStorage.setItem('rimoteka_dark', '1'); });
      await p30.reload({ waitUntil: 'domcontentloaded' });
      await pauza(2500);
      const e30t = await p30.evaluate(() => {
        const rel = rgb => { const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
          .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const odnos = id => { const e = document.getElementById(id); if (!e) return null;
          const cs = getComputedStyle(e);
          const a = rel(cs.color), b = rel(cs.backgroundColor);
          return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2); };
        return { tamna: document.body.classList.contains('dark-mode'),
                 obrisi: odnos('clearNotes'), obicno: odnos('saveRhymeList') };
      });
      ok('/pisanje-pesama/ · tamni režim se stvarno uključio', e30t.tamna === true);
      ok('/pisanje-pesama/ · „obriši sve" je čitljivo i u tamnom režimu',
         e30t.obrisi !== null && e30t.obrisi >= 4.5, `${e30t.obrisi}:1`);
      ok('/pisanje-pesama/ · ostale akcije čitljive u tamnom režimu',
         e30t.obicno !== null && e30t.obicno >= 4.5, `${e30t.obicno}:1`);
      await p30.evaluate(() => { localStorage.setItem('rimoteka_dark', '0'); });

      // ── E. IGRA: polje, dugme „Proveri" i poruka moraju da se vide i sa tastaturom
      /* Pregledač sam pomeri POLJE u vidokrug kad se tastatura otvori, ali ne
         zna za ono što stoji ispod polja. Izmereno pre popravke: polje i dugme
         na 668–725 px, poruka o tačnosti na 739–763, a tastatura počinje na
         641 — igrač nije video ni šta kuca ni da li je pogodio. */
      await p30.goto(BASE + '/igra-rimovanja/', { waitUntil: 'domcontentloaded' });
      await p30.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
      await p30.click('#gameStart');
      await pauza(1200);
      await p30.click('#gameInput');
      const f30 = await p30.evaluate(async (kb) => {
        const VV = window.visualViewport;
        const nova = document.documentElement.clientHeight - kb;
        Object.defineProperty(VV, 'height', { get: () => nova, configurable: true });
        Object.defineProperty(VV, 'offsetTop', { get: () => 0, configurable: true });
        VV.dispatchEvent(new Event('resize'));
        await new Promise(r => setTimeout(r, 400));
        const d = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().bottom) : null; };
        return { vrh: nova, rec: d('gameWord'), unos: d('gameInput'), dugme: d('gameSubmit'), poruka: d('gameFeedback') };
      }, 336);
      ok('igra · reč koju treba rimovati se vidi i sa tastaturom', f30.rec !== null && f30.rec <= f30.vrh,
         `dno ${f30.rec}, tastatura od ${f30.vrh}`);
      ok('igra · polje za unos se vidi i sa tastaturom', f30.unos !== null && f30.unos <= f30.vrh,
         `dno ${f30.unos}, tastatura od ${f30.vrh}`);
      ok('igra · dugme „Proveri" se vidi i sa tastaturom', f30.dugme !== null && f30.dugme <= f30.vrh,
         `dno ${f30.dugme}, tastatura od ${f30.vrh}`);
      ok('igra · poruka o tačnosti se vidi i sa tastaturom', f30.poruka !== null && f30.poruka <= f30.vrh,
         `dno ${f30.poruka}, tastatura od ${f30.vrh}`);

      // ── F. KLASICI: slovo šeme rime je OZNAKA, ne dugme
      /* Odluka vlasnice 27.08.2026: klasici su prave, postojeće pesme — nema
         smisla tražiti rime za reči koje je pesnik već izabrao. Klik je uklonjen
         zajedno sa uputstvom koje ga je obećavalo.
         Istorija, da se ne vrati: slovo je 31.07. bilo MRTVO DUGME na `/klasici/`
         (tamo nema taba sa rimama, pa klik nije radio ništa na 138 stihova); tada
         je popravljeno da vodi na `/?rec=…`. Uz to je uputstvo govorilo „klikni na
         završnu REČ", a klikalo se SLOVO — dakle i obećanje je bilo netačno.
         Sada nema ni klika ni obećanja, pa nema ni nesklada. */
      await p30.goto(BASE + '/klasici/', { waitUntil: 'domcontentloaded' });
      await pauza(2500);
      const g30 = await p30.evaluate(() => {
        const s = document.querySelector('.vrhyme');
        const d = document.querySelector('.poem-foot .link-btn');
        return {
          imaSlovo: !!s,
          /* Ne sme da bude dugme: bez `data-w`, bez naslova koji obećava klik,
             bez pokazivača miša. */
          jeDugme: !!(s && (s.dataset.w || s.title || getComputedStyle(s).cursor === 'pointer')),
          slovo: s ? Math.round(s.getBoundingClientRect().height) : 0,
          slovoSirina: s ? Math.round(s.getBoundingClientRect().width) : 0,
          dugme: d ? Math.round(d.getBoundingClientRect().height) : 0,
        };
      });
      ok('/klasici/ · „prebaci u brojač slogova" je bar 44 px visoko', g30.dugme >= 44, `${g30.dugme} px`);
      /* Pun prag od 44 px ovde nije moguć: razmak između stihova je 26 px i
         veći cilj bi razmakao pesmu. Meri se da je cilj OSETNO veći od
         zatečenih 24×18, a da red ostane red pesme. */
      ok('/klasici/ · slovo šeme rime je veći cilj za prst (bilo 24×18)',
         g30.slovoSirina >= 34 && g30.slovo >= 28, `${g30.slovoSirina}×${g30.slovo}`);
      /* Stih mora da stane u JEDAN red na telefonu (prijava vlasnice 16.08.2026:
         „Emina" se lomila — 96 od 138 stihova na 375 px). Bočne oznake su
         stišane, a kartica izlazi na ivicu ekrana da stih dobije mesta. */
      const g30l = await p30.evaluate(() =>
        [...document.querySelectorAll('.verse .vtext')].filter(t =>
          t.getBoundingClientRect().height > parseFloat(getComputedStyle(t).lineHeight) * 1.4
        ).map(t => t.textContent));
      ok('/klasici/ · nijedan stih se ne lomi u dva reda na telefonu',
         g30l.length === 0, `lome se: ${g30l.slice(0, 3).join(' / ')}`);
      ok('/klasici/ · strana ima stihove sa slovom šeme rime', g30.imaSlovo === true,
         'nijedan .vrhyme');
      ok('/klasici/ · slovo šeme rime NIJE dugme (odluka vlasnice 27.08.2026)',
         g30.jeDugme === false, 'slovo se i dalje ponaša kao dugme');
      /* Uputstvo ne sme da obećava klik — to je bio nalaz E: tekst je govorio
         „klikni na završnu reč", a klikalo se slovo. */
      const uput = await p30.evaluate(() =>
        [...document.querySelectorAll('.hint')].map(e => e.textContent).join(' '));
      ok('/klasici/ · uputstvo ne obećava klik na reč',
         !/[Kk]likni/.test(uput), uput.slice(0, 120));

      await ctx30.close();
    }

    /* ─────────────────────────────────────────────────────────────────────
       30G) MOBILNI — DRUGA PRIJAVA VLASNICE 16.08.2026
       Tabovi su lomili tekst u piluli i svaki red je počinjao drugde;
       pilule rima su bile dvostruko šire od reči; „obriši pesmu" je stajala
       sama u redu uz prazninu; „Powered by" i „Orbita Code" u dva reda;
       ~120 px praznine između alata i teksta; na omiljenim se objašnjenje
       ponavljalo ispod liste; traka rima je pri skrolu „plovila" preko
       editora, a na iPhone-u je Safari traka prekrivala pilule. */
    console.log('\n30G) MOBILNI — tabovi, gustina pilula, futer, razmaci, traka rima');
    {
      const ctx30g = await browser.newContext({
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
        deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });
      const p30g = ojacajStranu(await ctx30g.newPage());
      await p30g.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p30g.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });

      // G1. TABOVI: tekst u jednom redu u svakoj piluli; redovi od iste ivice
      const t30 = await p30g.evaluate(() => {
        const dugmad = [...document.querySelectorAll('#tabs [data-tab]')];
        const lomljene = dugmad.filter(b =>
          b.getBoundingClientRect().height > parseFloat(getComputedStyle(b).lineHeight) * 1.6 + 30
        ).map(b => b.textContent.trim());
        const redovi = {};
        dugmad.forEach(b => { const t = Math.round(b.getBoundingClientRect().top); (redovi[t] ||= []).push(b); });
        const leve = Object.values(redovi).map(r => Math.round(Math.min(...r.map(b => b.getBoundingClientRect().left))));
        return { lomljene, leve };
      });
      ok('mobilni · tekst taba ne lomi se u dva reda u piluli',
         t30.lomljene.length === 0, `lome se: ${t30.lomljene.join(', ')}`);
      ok('mobilni · svaki red tabova počinje od iste leve ivice',
         t30.leve.every(x => Math.abs(x - t30.leve[0]) <= 1), t30.leve.join(', '));

      // G2. PILULE GRLE REČ: ni jedna nije šira od svog sadržaja (bilo ~120 px praznog)
      await p30g.evaluate(() => {
        document.getElementById('rimeInput').value = 'ljubav';
        document.getElementById('rimeBtn').click();
      });
      await pauza(1500);
      const gustina = await p30g.evaluate(() => {
        const labudovi = [];
        document.querySelectorAll('#rimeResults .results > .chip').forEach(c => {
          const cs = getComputedStyle(c);
          const vidljivaDeca = [...c.children].filter(x => getComputedStyle(x).display !== 'none');
          const sadrzaj = vidljivaDeca.reduce((n, x) => n + x.offsetWidth, 0)
            + parseFloat(cs.columnGap || 0) * Math.max(0, vidljivaDeca.length - 1)
            + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
            + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
          const labud = c.offsetWidth - sadrzaj;
          if (labud > 8) labudovi.push(`${c.querySelector('.word')?.textContent}(${Math.round(labud)}px)`);
        });
        return labudovi;
      });
      ok('mobilni · pilula grli reč — bez praznog prostora u njoj',
         gustina.length === 0, gustina.slice(0, 6).join(', '));

      // G3. AKCIJE BELEŽNICE: svaki red je pun (nema usamljene pilule uz prazninu)
      await p30g.evaluate(() => switchTab('beleznica'));
      const punRed = await p30g.evaluate(() => {
        const traka = document.querySelector('#panel-beleznica .hint-actions');
        const W = traka.getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(traka).columnGap) || 0;
        const redovi = {};
        traka.querySelectorAll('.link-btn').forEach(b => { const t = Math.round(b.getBoundingClientRect().top); (redovi[t] ||= []).push(b); });
        return Object.values(redovi).map(r =>
          (r.reduce((n, b) => n + b.getBoundingClientRect().width, 0) + gap * (r.length - 1)) / W);
      });
      ok('mobilni · akcije beležnice pune svaki red (nema praznog desnog kraja)',
         punRed.every(f => f >= 0.9), punRed.map(f => (f * 100).toFixed(0) + '%').join(', '));

      // G4. OMILJENE: bez dvostrukog objašnjenja — hero se na tom tabu ne prikazuje
      await p30g.evaluate(() => switchTab('omiljene'));
      const o30 = await p30g.evaluate(() => getComputedStyle(document.querySelector('.hero')).display);
      ok('mobilni · na omiljenim se objašnjenje ne ponavlja ispod liste', o30 === 'none', o30);
      await p30g.evaluate(() => switchTab('rime'));
      const o30b = await p30g.evaluate(() => getComputedStyle(document.querySelector('.hero')).display);
      ok('mobilni · naslov se vrati kad se ode sa omiljenih', o30b !== 'none', o30b);

      // G5. RAZMAK ALAT → TEKST: prepolovljen (bilo ~122 px čiste praznine)
      const r30 = await p30g.evaluate(() => {
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const seo = document.querySelector('.seo-content').getBoundingClientRect();
        return Math.round(seo.top - hero.bottom);
      });
      ok('mobilni · razmak između alata i teksta je stišan (bilo ~122 px)',
         r30 >= 0 && r30 <= 72, `${r30} px`);

      // G6. FUTER: „Powered by Orbita Code" u jednom redu
      const f30 = await p30g.evaluate(() => {
        const p = document.querySelector('.footer-orbita');
        if (!p) return null;
        const a = p.querySelector('a');
        return { visina: Math.round(p.getBoundingClientRect().height),
                 istiRed: a ? Math.abs(a.getBoundingClientRect().top - p.getBoundingClientRect().top) < 4 : false };
      });
      ok('mobilni · „Powered by Orbita Code" je u jednom redu',
         f30 !== null && f30.visina <= 48 && f30.istiRed, JSON.stringify(f30));

      // G7. TRAKA RIMA SE LEPI ZA VIDOKRUG i kad se strana pomera prstom
      // (lažni „scroll" događaj: vidokrug sklizne 150 px — traka mora da ostane
      // na dnu VIDOKRUGA, ne da plovi preko teksta. Na iOS UA: −56 px Safari trake.)
      await p30g.evaluate(() => switchTab('beleznica'));
      await p30g.click('#noteEditor');
      await p30g.evaluate(() => {
        const ed = document.getElementById('noteEditor');
        ed.innerHTML = 'mleka puna casa<div>i od mrkve kasa</div>';
        ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      });
      await pauza(1200);
      const l30 = await p30g.evaluate(async () => {
        const VV = window.visualViewport;
        const nova = document.documentElement.clientHeight - 336;
        Object.defineProperty(VV, 'height', { get: () => nova, configurable: true });
        Object.defineProperty(VV, 'offsetTop', { get: () => 150, configurable: true });
        VV.dispatchEvent(new Event('scroll'));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const p = document.getElementById('noteRhymes').getBoundingClientRect();
        return { dno: Math.round(p.bottom), ocekivano: Math.round(150 + nova - 56) };
      });
      ok('mobilni · traka rima ostaje lepljena za dno vidokruga i pri pomeranju',
         Math.abs(l30.dno - l30.ocekivano) <= 2, JSON.stringify(l30));

      await ctx30g.close();
    }

    /* ─────────────────────────────────────────────────────────────────────
       31) OZNAKE UZ STIH SU PORAVNATE SA STIHOM

       Nađeno 31.07.2026. pri sređivanju mobilne beležnice, ali NIJE mobilni
       nalaz — isto se dešava i na 1440 px.

       `getEditorText()` je 29.07. naučen da svaki BLOK (`<div>`, `<p>`) računa
       kao novi red, jer mobilni Chrome i Safari na Enter prave blokove a ne
       `<br>` (nalaz M1). Ali `editorTextIndex()`, koji kaže GDE se koje slovo
       tog teksta nalazi u DOM-u, ostao je da broji samo slova i `<br>`-ove —
       pa mu je posle svakog bloka nedostajao po jedan znak.

       Izmereno na starom kodu: pesma otkucana na telefonu imala je poslednja
       dva stiha pomerena za ceo red (−30 px na 390, −35 na 1440), a pesma sa
       praznim redom između strofa za DVA reda (−59 odnosno −68 px). Pesme
       kucane na računaru (`<br>`) bile su u redu — zato se i nije primetilo.

       Provera pušta šest oblika unosa na dve širine. Na starom kodu pada
       6 od 12. */
    console.log('\n31) OZNAKE UZ STIH (slogovi i šema rime) PRATE STIH');
    {
      const SLUCAJEVI = [
        ['telefon (blokovi)', 'Volim te kao sunce<div>ti si moja luda</div><div>u srcu mi gori</div><div>plamen koji ludi</div>'],
        ['računar (br)', 'Volim te kao sunce<br>ti si moja luda<br>u srcu mi gori<br>plamen koji ludi'],
        ['prazan red između strofa', 'prva strofa jedan<div>prva strofa dva</div><div><br></div><div>druga strofa tri</div><div>druga strofa cet</div>'],
        ['mešano br i blokovi', 'red jedan<br>red dva<div>red tri</div><div>red cetiri<br>red pet</div>'],
        ['jedan stih', 'sam jedan stih'],
        ['prazan red na kraju', 'prvi stih<div>drugi stih</div><div><br></div>'],
      ];
      for (const sirina of [390, 1440]) {
        const ctx31 = await browser.newContext({ viewport: { width: sirina, height: 900 }, isMobile: sirina < 600, hasTouch: sirina < 600 });
        const p31 = ojacajStranu(await ctx31.newPage());
        await p31.goto(BASE + '/pisanje-pesama/', { waitUntil: 'domcontentloaded' });
        await p31.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, { timeout: 180000 });
        for (const [ime, html] of SLUCAJEVI) {
          await p31.click('#noteEditor');
          await p31.evaluate(h => {
            const e = document.getElementById('noteEditor');
            e.innerHTML = h;
            e.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }, html);
          await pauza(900);
          const m = await p31.evaluate(() => {
            const ed = document.getElementById('noteEditor');
            const lines = getEditorText().split('\n');
            const boxes = measureLineBoxes(lines);
            const cs = getComputedStyle(ed);
            let ocek = parseFloat(cs.paddingTop) || 0;
            const razlike = [];
            boxes.forEach(b => { razlike.push(Math.round(b.top - ocek)); ocek += b.height; });
            return { redova: lines.length, razlike };
          });
          const najgore = Math.max(...m.razlike.map(Math.abs));
          ok(`${sirina}px · „${ime}" — oznake stoje uz svoj stih`, najgore <= 2,
             `${m.redova} redova, odstupanja ${JSON.stringify(m.razlike)} px`);
        }
        await ctx31.close();
      }
    }

    /* ─────────────────────────────────────────────────────────────────────────
       32) REČ NAVEDENA KAO RIMA MORA DA BUDE RIMA

       Nalaz T2 (31.07.2026): u „Čestim pitanjima" na šest tematskih strana stajalo je
       49 reči navedenih kao rime — i **nijedna se nije rimovala**. Za „majka" je pisalo
       „reka, čeka, njega, lepa, neba" (0 od 8), za „prijatelj" — „smeh, dnevnik,
       željeznički" (0 od 6). Jedna navedena „rima" (`bliza`) ne postoji ni u rečniku.

       ZAŠTO NIJEDNA AUTOMATIKA OVO NIJE UHVATILA: reči iz bloka „Rime za druge reči"
       (ranije „Još popularnih rima") nose ISTU klasu `.word` kao prave rime. Naivna
       provera „da li reč postoji na strani /rime-za/X/" zato prolazi i za reč koja
       nije rima. Ova provera zato PRVO odseca sve od tog bloka nadalje.

       PRVA VERZIJA OVE PROVERE BILA JE LAŽNO ZELENA — i to je uhvaćeno tek puštanjem
       protiv produkcije (pravilo H4). Ona je uzimala RUČNU TABELU tačnih rima i
       proveravala nju protiv strane — a tabela je po definiciji tačna, pa je provera
       prolazila i na produkciji, gde u tekstu piše „majka: reka, čeka, njega". Provera
       koja ne može da padne ne čuva ništa (PROPUSTI, pravilo 50).

       ZATO OVA VERZIJA ČITA SPISAK IZ SAMOG TEKSTA STRANE: uzima prvu rečenicu odgovora,
       deli je po zarezima i tačkama-zarezima, uzima POSLEDNJU reč svakog dela (tako
       „…rimuje — imaš neljubav" daje `neljubav`) i traži svaku od njih među pravim
       rimama. Ništa se ne poredi sa unapred upisanim spiskom.
       ───────────────────────────────────────────────────────────────────────── */
    console.log('\n32) REČ NAVEDENA KAO RIMA MORA DA BUDE RIMA (nalaz T2)');
    {
      /* Gde stoji tvrdnja: strana + pitanje po kom se nalazi odgovor + kako se čita.
         `oblik: 'spisak'` — jedna ciljna reč, spisak rima („Majka: bajka, hajka…").
         `oblik: 'parovi'` — više parova u jednom odgovoru („sunce — unce, lonce;
         zvezda — gnezda…"), pa se ciljna reč čita IZ TEKSTA, za svaki par posebno. */
      const TVRDNJE = [
        { strana: '/rime-za-roditelje/',            pitanje: /majka/i,        oblik: 'spisak', slug: 'majka' },
        { strana: '/rime-za-prijatelje/',           pitanje: /prijatelj/i,    oblik: 'spisak', slug: 'prijatelj' },
        { strana: '/rime-za-novu-godinu/',          pitanje: /godina/i,       oblik: 'spisak', slug: 'godina' },
        { strana: '/rime-za-rodjendanske-pesmice/', pitanje: /rođendan/i,     oblik: 'spisak', slug: 'rodjendan' },
        { strana: '/rime-za-ljubavne-pesme/',       pitanje: /ljubav/i,       oblik: 'spisak', slug: 'ljubav' },
        { strana: '/rime-za-svadbu/',               pitanje: /ljubav/i,       oblik: 'spisak', slug: 'ljubav' },
        { strana: '/rime-za-tugu-i-secanje/',       pitanje: /tuga/i,         oblik: 'spisak', slug: 'tuga' },
        { strana: '/rime-za-decu-o-prirodi/',       pitanje: /iz prirode/i,   oblik: 'parovi' },
      ];
      const SLUG = { 'kiša': 'kisa', 'rođendan': 'rodjendan', 'sunce': 'sunce', 'zvezda': 'zvezda',
                     'sneg': 'sneg', 'cvet': 'cvet', 'reka': 'reka' };

      const p32 = await (await browser.newContext()).newPage();
      const kesRima = new Map();

      /* prave rime za reč — SVE POSLE bloka „Rime za druge reči" se odbacuje, jer te
         reči nose istu klasu `.word` a nisu rime (upravo zbog toga je nalaz T2 i nastao) */
      const praveRime = async (slug) => {
        if (!kesRima.has(slug)) {
          await p32.goto(`${BASE}/rime-za/${slug}/`, { waitUntil: 'domcontentloaded' });
          kesRima.set(slug, new Set(await p32.evaluate(() => {
            const main = document.querySelector('main');
            if (!main) return [];
            const granica = [...main.querySelectorAll('h2')]
              .find(h => /Rime za druge reči|Još popularnih rima/.test(h.textContent));
            const skup = new Set();
            for (const e of main.querySelectorAll('.word')) {
              if (granica && (granica.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
              skup.add(e.textContent.trim().toLowerCase());
            }
            return [...skup];
          })));
        }
        return kesRima.get(slug);
      };

      /* Iz dela spiska uzima POSLEDNJU reč — tako „…rimuje — imaš neljubav" daje `neljubav`.
         Delovi duži od tri reči su rečenica, ne stavka spiska, pa se preskaču (npr.
         „kruga — ali izaberi one koje nose pravo značenje"). */
      const stavke = (deo) => deo.split(/[,;]/)
        .map(d => d.trim().replace(/[.„“"]/g, ''))
        .filter(d => d && d.split(/\s+/).length <= 3)
        .map(d => d.split(/\s+/).pop().toLowerCase())
        .filter(r => /^[a-zšđčćž-]{2,}$/i.test(r));

      for (const t of TVRDNJE) {
        await p32.goto(BASE + t.strana, { waitUntil: 'domcontentloaded' });
        const odgovor = await p32.evaluate((izvor) => {
          const re = new RegExp(izvor.slice(1, izvor.lastIndexOf('/')), 'i');
          const d = [...document.querySelectorAll('.landing-faq details')]
            .find(x => re.test(x.querySelector('summary')?.textContent || '')
                       && /rim/i.test(x.querySelector('summary')?.textContent || ''));
          return d ? d.querySelector('p')?.textContent.trim() || '' : '';
        }, t.pitanje.toString());

        if (!odgovor) { ok(`${t.strana} · odgovor o rimama postoji`, false, 'nije nađen'); continue; }
        const prvaRecenica = odgovor.split(/\.\s/)[0];

        if (t.oblik === 'spisak') {
          const prave = await praveRime(t.slug);
          const izTeksta = stavke(prvaRecenica).filter(r => r !== t.slug);
          const nisuRime = izTeksta.filter(r => !prave.has(r));
          ok(`${t.strana} · svaka reč navedena kao rima za „${t.slug}" JESTE rima`,
             izTeksta.length > 0 && nisuRime.length === 0,
             nisuRime.length ? `NIJE RIMA: ${nisuRime.join(', ')}` : `${izTeksta.length} provereno`);
        } else {
          let ukupno = 0; const lose = [];
          for (const par of prvaRecenica.split(';')) {
            const [cilj, spisak] = par.split(/\s[—–-]\s/);
            if (!spisak) continue;
            const slug = SLUG[cilj.trim().toLowerCase()];
            if (!slug) { lose.push(`nepoznata ciljna reč: ${cilj.trim()}`); continue; }
            const prave = await praveRime(slug);
            for (const r of stavke(spisak)) { ukupno++; if (!prave.has(r)) lose.push(`${cilj.trim()} — ${r}`); }
          }
          ok(`${t.strana} · svaki par „reč — rima" se ZAISTA rimuje`,
             ukupno > 0 && lose.length === 0,
             lose.length ? `NIJE RIMA: ${lose.join(', ')}` : `${ukupno} para provereno`);
        }
      }
      await p32.close();
    }

    /* ─────────────────────────────────────────────────────────────────────────
       33) PRAZNO STANJE PANELA SA RIMAMA (31.07.2026)

       Pre prve pretrage panel je bio prazan, a čovek u njega gleda par sekundi.
       Tu sada stoji tekst koji jedini kaže da uz rime idu značenje, sinonimi i
       beležnica. Provera pokriva ono što se lako pokvari:
         · da se uopšte vidi pre pretrage,
         · da ga rezultati zamene (ne da ostane iznad njih),
         · da se VRATI posle klika na logo — `goHome()` ga je ranije brisao u prazno,
         · da je čitljiv u TAMNOJ temi (tvrdo upisana boja je česta zamka).
       ───────────────────────────────────────────────────────────────────────── */
    console.log('\n33) PRAZNO STANJE PANELA SA RIMAMA');
    {
      const p33 = await (await browser.newContext()).newPage();
      await p33.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(400);

      const pre = await p33.evaluate(() => {
        const e = document.querySelector('#rimeResults .prazno-stanje');
        if (!e) return null;
        const s = getComputedStyle(e);
        return { tekst: e.textContent.trim(), vidljiv: e.offsetHeight > 0,
                 linkova: e.querySelectorAll('a').length, boja: s.color };
      });
      ok('prazno stanje se vidi pre pretrage', !!pre && pre.vidljiv, pre ? `${pre.tekst.slice(0,60)}…` : 'nema ga');
      ok('prazno stanje pominje značenje, sinonim i beležnicu',
         !!pre && /znač/i.test(pre.tekst) && /sinonim/i.test(pre.tekst) && /beležnic/i.test(pre.tekst),
         pre ? pre.tekst.slice(0, 90) : '');
      ok('prazno stanje vodi bar na jednu drugu stranu', !!pre && pre.linkova >= 1, `linkova: ${pre?.linkova}`);

      // rezultati moraju da ga ZAMENE, ne da se nakaleme ispod njega
      await p33.fill('#rimeInput', 'ljubav');
      await p33.click('#rimeBtn');
      await pauza(1400);
      const posle = await p33.evaluate(() => ({
        praznoOstalo: !!document.querySelector('#rimeResults .prazno-stanje'),
        rima: document.querySelectorAll('#rimeResults .word').length
      }));
      ok('pretraga zamenjuje prazno stanje rezultatima',
         posle.rima > 0 && !posle.praznoOstalo, `rima: ${posle.rima}, prazno ostalo: ${posle.praznoOstalo}`);

      // klik na logo vraća „na početak" — prazno stanje mora ponovo da se pojavi
      await p33.evaluate(() => (window.goHome ? window.goHome() : document.querySelector('.brand-h')?.click()));
      await pauza(500);
      const nazad = await p33.evaluate(() => !!document.querySelector('#rimeResults .prazno-stanje'));
      ok('povratak na početak vraća prazno stanje (ne ostavlja prazan panel)', nazad, `vraćeno: ${nazad}`);

      // kontrast u TAMNOJ temi — boja teksta naspram pozadine panela
      await p33.evaluate(() => document.getElementById('darkToggle')?.click());
      await pauza(400);
      const kontrast = await p33.evaluate(() => {
        const e = document.querySelector('#rimeResults .prazno-stanje');
        if (!e) return null;
        const lum = (c) => { const [r,g,b] = c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number)
            .map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
          return 0.2126*r + 0.7152*g + 0.0722*b; };
        let poz = getComputedStyle(document.body).backgroundColor, el = e;
        while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(el).backgroundColor)) el = el.parentElement;
        if (el) poz = getComputedStyle(el).backgroundColor;
        const a = lum(getComputedStyle(e).color), b = lum(poz);
        return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)) * 100) / 100;
      });
      ok('prazno stanje je čitljivo u tamnoj temi (kontrast ≥ 4,5:1)',
         kontrast !== null && kontrast >= 4.5, `kontrast: ${kontrast}:1`);
      await p33.close();
    }

    /* ─────────────────────────────────────────────────────────────────────────
       34) PRAVOPIS — ZAREZ SE NE PIŠE ISPRED „I", „PA", „TE", „NI"

       Prijava vlasnice 02.08.2026: „zarez u srpskom jeziku NIKADA ne ide ispred
       slova i". Pravilo je stajalo u projektu (`GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`,
       odeljak 8.5), ali ga ništa nije proveravalo — pa je na sajtu bilo šest mesta.

       Rečenica se NE popravlja brisanjem zareza nego se PREPIŠE: ako je zarez tu
       „potreban", rečenica je loše sastavljena.

       PROVERAVA SE SAMO „I" — namerno. Prva verzija je hvatala i `pa`, `te`, `ni` i
       odmah pala na pet mesta, a NIJEDNO nije bila greška: „Klikni je, pa iz spiska
       izaberi rimu" — tu `pa` znači *zatim*, uvodi posledicu i redosled, i zarez po
       pravopisu STOJI. Pravilo glasi „ne piše se ispred i, pa, te, ni **kad povezuju
       istorodne delove**", a to razlikovanje traži značenje, ne obrazac. Provera koja
       pada na tačnom tekstu tera pisca da kvari jezik da bi je zadovoljio — gore je
       od nikakve. Zato ostaje samo `i`, gde je pravilo jednoznačno.

       Izuzetak koji pravopis dozvoljava: nabrajanje sa PONOVLJENIM veznikom
       („i imenice, i pridevi, i glagoli"). Zato se prijavljuje samo kad se veznik
       ne ponavlja neposredno pre zareza.
       ───────────────────────────────────────────────────────────────────────── */
    console.log('\n34) PRAVOPIS — zarez ispred „i"');
    {
      const p34 = await (await browser.newContext()).newPage();
      const STRANE = ['/', '/rimovanje-reci/', '/rime-za-decu/', '/rime-za-roditelje/',
                      '/rime-za-ljubavne-pesme/', '/pisanje-pesama/', '/rime-za/ljubav/'];
      for (const put of STRANE) {
        await p34.goto(BASE + put, { waitUntil: 'domcontentloaded' });
        const nalazi = await p34.evaluate(() => {
          const t = (document.querySelector('main')?.innerText || '').replace(/\s+/g, ' ');
          const out = [];
          for (const m of t.matchAll(/(.{0,60}), (i) ([a-zćčšđž].{0,40})/g)) {
            // Dozvoljeno je SAMO nabrajanje sa ponovljenim veznikom („i imenice, i pridevi"),
            // a ono se prepoznaje po tome što deo NEPOSREDNO pre zareza POČINJE sa „i".
            //
            // Ranije je ovde stajalo `new RegExp(\`\\b${m[2]} [a-zćčšđž]\`).test(pre)` — dakle
            // „ima li „i" BILO GDE u prethodnih 60 znakova". Zbog toga je provera tiho
            // preskakala svaku rečenicu u kojoj se „i" pojavilo ranije, a takvih je većina.
            // Bila je LAŽNO ZELENA: 02.08.2026. je prošla 496/496 dok je na
            // `/rimovanje-reci/` stajalo „…pišeš pesmu i vidiš rime u boji, i igru rima…".
            // Provera koja javlja da je čisto, a ne gleda, gora je od nikakve provere.
            const pre = m[1];
            const posl = pre.split(/[,;:—]/).pop().trim();
            if (/^i\s+[a-zćčšđž]/i.test(posl)) continue;
            out.push(`„…${pre.slice(-45)}, ${m[2]} ${m[3].slice(0, 25)}…"`);
          }
          return out;
        });
        ok(`${put} · nema zareza ispred „i"`, nalazi.length === 0,
           nalazi.length ? nalazi.slice(0, 2).join(' ‖ ') : 'čisto');
      }
      await p34.close();
    }

    /* ─────────────────────────────────────────────────────────────────────
       35) POČETNA STRANA — POLOŽAJ POLJA, KONTRAST ISPUNA, AKTIVAN TAB

       Sve četiri provere su napisane iz merenja od 02.08.2026 na produkciji i
       svaka bi tada PALA (provereno protiv produkcije dok je tamo stario kod):
         · polje za unos bilo je na 402 px od vrha ekrana od 664 px (60,5%);
         · belo slovo na dugmetu „Nađi rime" davalo je 2,84 u svetloj i 2,10 u
           tamnoj temi, pri granici 4,5;
         · aktivan tab u tamnoj temi bio je PIKSEL U PIKSEL isti kao neaktivan;
         · naslovni blok se pojavljivao tek kad stigne app.js i gurao polje za
           130 px naniže (skakanje strane 0,12 pri granici 0,1).

       Kontrast se NE čita iz `getComputedStyle` za ispune sa prelivom — preliv
       vraća providnu `backgroundColor`, pa se boje vade iz `background-image`
       i meri se GORI kraj preliva. Ta zamka je već jednom dala lažno „prolazi".
       ───────────────────────────────────────────────────────────────────── */
    console.log('\n35) POČETNA — polje u gornjem delu, kontrast ispuna, aktivan tab');
    {
      const MERE35 = `
        function pRGB(s){const m=String(s).match(/rgba?\\(([^)]+)\\)/);if(!m)return null;
          const p=m[1].split(',').map(x=>parseFloat(x));return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
        function lin(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
        function LUM(c){return 0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);}
        function odnos(a,b){const l1=LUM(a),l2=LUM(b),hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);}
        function ispune(el){const cs=getComputedStyle(el);
          const iz=[...String(cs.backgroundImage||'').matchAll(/rgba?\\([^)]+\\)/g)].map(m=>pRGB(m[0])).filter(Boolean);
          const sam=pRGB(cs.backgroundColor); if(sam&&sam.a>0.99) iz.push(sam);
          return iz;}
        function najgoriKontrast(el){const fg=pRGB(getComputedStyle(el).color);
          const bg=ispune(el); if(!fg||!bg.length) return null;
          return Math.min(...bg.map(c=>odnos(fg,c)));}
      `;

      for (const tema of ['svetla', 'tamna']) {
        const ctx35 = await browser.newContext({
          viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
        });
        if (tema === 'tamna') {
          await ctx35.addInitScript(() => { try { localStorage.setItem('rimoteka_dark', '1'); } catch (e) {} });
        }
        const p35 = ojacajStranu(await ctx35.newPage());
        await p35.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await pauza(900);

        // A) polje za unos u gornjem delu ekrana (bilo 402 px = 60,5%)
        /* Granica je bila 45% dok se traka tabova pomerala u stranu (jedan red
           od 48 px). Od 16.08.2026. se traka PRELAMA u tri reda dodirnih ciljeva
           od 44 px (odluka vlasnice: nijedna stavka se ne seče ivicom), pa polje
           stoji na ~52% — i dalje na PRVOM ekranu, sa dugmetom i filterima,
           bez skrolanja. Granica 55% i dalje hvata regresiju tipa 60,5%. */
        const polozaj = await p35.evaluate(() => {
          const r = document.getElementById('rimeInput').getBoundingClientRect();
          return { top: Math.round(r.top), vh: window.innerHeight,
                   procenat: Math.round(r.top / window.innerHeight * 1000) / 10 };
        });
        ok(`početna (${tema}) · polje za unos je na prvom ekranu`,
           polozaj.procenat <= 55,
           `polje na ${polozaj.top} px od ${polozaj.vh} px = ${polozaj.procenat}% (granica 55%, bilo 60,5%)`);

        // B) kontrast ispunjenih dugmadi — najgori kraj preliva, granica 4,5
        const kontrasti = await p35.evaluate(({ MERE35 }) => {
          eval(MERE35);
          const meta = {};
          const seli = { 'Nađi rime': '#rimeBtn', 'aktivno pismo': '.script-toggle button.active',
                         'aktivan tab': '.tabs a.active', 'filter slogova': '#rimeSyl button.active' };
          for (const [ime, sel] of Object.entries(seli)) {
            const e = document.querySelector(sel);
            meta[ime] = e ? Math.round(najgoriKontrast(e) * 100) / 100 : null;
          }
          // natpis u praznom polju
          const inp = document.getElementById('rimeInput');
          const csp = getComputedStyle(inp, '::placeholder');
          const fg = pRGB(csp.color) || pRGB(getComputedStyle(inp).color);
          const bg = pRGB(getComputedStyle(inp).backgroundColor);
          meta['natpis u polju'] = (fg && bg) ? Math.round(odnos(fg, bg) * 100) / 100 : null;
          return meta;
        }, { MERE35 });

        for (const [ime, k] of Object.entries(kontrasti)) {
          ok(`početna (${tema}) · kontrast „${ime}" je bar 4,5`,
             k !== null && k >= 4.5, `izmereno ${String(k).replace('.', ',')} (granica 4,5)`);
        }

        // C) aktivan tab mora da se razlikuje od neaktivnog — i bojom i bez boje
        const tabovi = await p35.evaluate(({ MERE35 }) => {
          eval(MERE35);
          const a = document.querySelector('.tabs a.active'), n = document.querySelector('.tabs a:not(.active)');
          if (!a || !n) return null;
          const bgA = ispune(a), bgN = ispune(n);
          const razlika = (bgA.length && bgN.length) ? Math.min(...bgA.map(c => odnos(c, bgN[0]))) : 0;
          return { razlika: Math.round(razlika * 100) / 100,
                   fwA: getComputedStyle(a).fontWeight, fwN: getComputedStyle(n).fontWeight };
        }, { MERE35 });
        ok(`početna (${tema}) · aktivan tab se razlikuje od neaktivnog (bar 3,0)`,
           tabovi && tabovi.razlika >= 3,
           `razlika pozadina ${String(tabovi?.razlika).replace('.', ',')} (u tamnoj temi je bila 1,0 — isti piksel)`);
        ok(`početna (${tema}) · razlika aktivnog taba se vidi i bez boje (debljina slova)`,
           tabovi && Number(tabovi.fwA) > Number(tabovi.fwN),
           `aktivan ${tabovi?.fwA} prema neaktivnom ${tabovi?.fwN}`);

        await ctx35.close();
      }

      /* D) IZGLED NE SME DA ZAVISI OD app.js.
         Uzrok skoka od 130 px bio je `body:not([data-tab="rime"]) .hero`, a
         oznaku `data-tab` postavlja app.js. Provera je namerno napisana bez
         merenja vremena: gasi se app.js i gleda se da li je raspored isti. */
      const ctx35b = await browser.newContext({
        viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
      });
      /* app.js se zamenjuje PRAZNIM fajlom, ne prekida se (`abort`): prekinut
         zahtev pregledač upiše kao grešku u konzolu, pa bi provera „nula
         grešaka u konzoli" pala zbog samog testa. Prazan fajl daje isti uslov
         — skripta se nikad ne izvrši — bez lažne greške. */
      await ctx35b.route('**/app.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
      const p35b = await ctx35b.newPage();
      await p35b.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(700);
      const bezSkripte = await p35b.evaluate(() => {
        const r = document.getElementById('rimeInput').getBoundingClientRect();
        return { top: Math.round(r.top), imaOznaku: document.body.hasAttribute('data-tab') };
      });
      await ctx35b.close();

      const ctx35c = await browser.newContext({
        viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
      });
      const p35c = ojacajStranu(await ctx35c.newPage());
      await p35c.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(1200);
      const saSkriptom = await p35c.evaluate(() =>
        Math.round(document.getElementById('rimeInput').getBoundingClientRect().top));
      await ctx35c.close();

      ok('početna · polje stoji na istom mestu i bez app.js (nema skoka pri učitavanju)',
         Math.abs(bezSkripte.top - saSkriptom) <= 8,
         `bez app.js ${bezSkripte.top} px, sa app.js ${saSkriptom} px — razlika ${Math.abs(bezSkripte.top - saSkriptom)} px (bilo 130 px)`);

      /* E) Sklopivi blokovi: tekst mora OSTATI u HTML-u (SEO) i mora da se
            otvara sa tastature. `<details>` to radi sam, pa se proverava da
            blokovi postoje i da im je sadržaj u dokumentu. */
      const ctx35d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p35d = ojacajStranu(await ctx35d.newPage());
      await p35d.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      const blokovi = await p35d.evaluate(() => {
        const b = [...document.querySelectorAll('.seo-blok')];
        return { broj: b.length,
                 naslovi: b.map(x => x.querySelector('summary h3')?.textContent.trim()).filter(Boolean).length,
                 znakova: b.reduce((n, x) => n + (x.querySelector('.seo-blok-telo')?.textContent.trim().length || 0), 0),
                 linkova: b.reduce((n, x) => n + x.querySelectorAll('.seo-blok-telo a').length, 0) };
      });
      ok('početna · sklopivi blokovi postoje i naslovi su ostali pravi h3',
         blokovi.broj === 3 && blokovi.naslovi === 3, `blokova ${blokovi.broj}, h3 naslova ${blokovi.naslovi}`);
      ok('početna · tekst u blokovima je ostao u HTML-u (pretraživač ga vidi)',
         blokovi.znakova > 1500 && blokovi.linkova >= 8,
         `${blokovi.znakova} znakova, ${blokovi.linkova} linkova`);

      /* Otvaranje tastaturom. Sve je null-sigurno: kad blokova nema (stara
         verzija strane), provera mora da PADNE, ne da obori ceo test —
         provereno 02.08.2026, prvi pokušaj je pukao na `.focus()` nad `null`
         i prekinuo preostalih pet provera. */
      const imaSummary = await p35d.evaluate(() => {
        const s = document.querySelector('.seo-blok summary');
        if (s) s.focus();
        return !!s;
      });
      let otvoren = false;
      if (imaSummary) {
        await p35d.keyboard.press('Enter');
        await pauza(250);
        otvoren = await p35d.evaluate(() => !!document.querySelector('.seo-blok')?.open);
      }
      ok('početna · sklopivi blok se otvara tasterom Enter', otvoren === true,
         imaSummary ? 'blok se nije otvorio' : 'nema sklopivih blokova na strani');

      // F) futer: dodirni ciljevi i da nijedan link nije izgubljen
      const futerDesktop = await p35d.evaluate(() => ({
        linkova: document.querySelectorAll('.futer-v2 .footer-link').length,
        rima: document.querySelectorAll('.futer-v2 .futer-rime-spisak .footer-link').length,
        imaCta: !!document.querySelector('.saradnja-traka .saradnja-cta[href^="mailto:eureka@rimoteka.com"]'),
      }));
      /* 54, ne 55: ispisana adresa u bloku saradnje je 03.08.2026. uklonjena —
         stajala je odmah ispod dugmeta koje vodi na istu adresu. Dugme se broji
         posebno (`.futer-cta`), pa se proverava i ono. */
      ok('futer · svi linkovi su tu (23 u kolonama + 30 rima + kontakt + Orbita)',
         futerDesktop.linkova >= 54 && futerDesktop.rima === 30 && futerDesktop.imaCta === true,
         `ukupno ${futerDesktop.linkova}, popularnih rima ${futerDesktop.rima}, dugme ${futerDesktop.imaCta}`);
      await ctx35d.close();

      const ctx35e = await browser.newContext({
        viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
      });
      const p35e = ojacajStranu(await ctx35e.newPage());
      await p35e.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(500);
      const futerMob = await p35e.evaluate(() => {
        const linkovi = [...document.querySelectorAll('.futer-v2 .futer-kolona .footer-link, .futer-v2 .futer-rime-spisak .footer-link')];
        const niski = linkovi.filter(a => a.getBoundingClientRect().height < 44)
          .map(a => `${a.textContent.trim()} ${Math.round(a.getBoundingClientRect().height)}px`);
        return { ukupno: linkovi.length, niski: niski.slice(0, 4), brojNiskih: niski.length,
                 preliv: document.documentElement.scrollWidth > window.innerWidth };
      });
      /* `ukupno > 50` NIJE ukras: bez njega je provera LAŽNO ZELENA na staroj
         verziji futera — selektor tamo ne pogodi nijedan element, spisak
         „preniskih" je prazan, i provera prolazi iako futer uopšte ne postoji.
         Provereno 02.08.2026 protiv produkcije: prvi oblik ove provere je
         prošao nad starim kodom. Provera koja ne padne nad starim kodom ne
         valja — mora se proveriti i DA IMA šta da se meri. */
      ok('futer na telefonu · svaki link je dodirni cilj od bar 44 px',
         futerMob.ukupno > 50 && futerMob.brojNiskih === 0,
         futerMob.ukupno <= 50
           ? `nađeno samo ${futerMob.ukupno} linkova — nov futer nije na strani`
           : (futerMob.brojNiskih ? `${futerMob.brojNiskih} nižih: ${futerMob.niski.join(', ')} (bilo 16–19 px)`
                                  : `svih ${futerMob.ukupno} prolazi`));
      ok('futer na telefonu · nema horizontalnog skrolovanja', futerMob.preliv === false);
      await ctx35e.close();
    }

    console.log('\n36) FUTER — note, dugme „Saradnja", kompozicija, sitan tekst');
    {
      /* Zašto ova sekcija postoji: 02.08.2026. je futer bio zanatski tačan
         (dodirni ciljevi, kolone), ali je vlasnica rekla „gde su note, zašto
         je sve levo poravnato, gde je redizajn" — i bila je u pravu. Nije bilo
         ni nota, ni dugmeta za kontakt, ni kompozicije.
         Provere ispod čuvaju SVE troje. Puštene su protiv produkcije dok je
         tamo stajao stari futer i tamo PADAJU — provera koja ne padne nad
         starim kodom ne valja. */
      const MERE36 = `
        function pRGB(s){const m=String(s).match(/rgba?\\(([^)]+)\\)/);if(!m)return null;
          const p=m[1].split(',').map(x=>parseFloat(x));return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
        function lin(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
        function LUM(c){return 0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);}
        function odnos(a,b){const l1=LUM(a),l2=LUM(b),hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);}
        function bojeSloja(el){const cs=getComputedStyle(el);
          const iz=[...String(cs.backgroundImage||'').matchAll(/rgba?\\([^)]+\\)/g)].map(m=>pRGB(m[0])).filter(Boolean);
          const sam=pRGB(cs.backgroundColor); if(sam&&sam.a>0.99) iz.push(sam);
          return iz;}
        /* Podloga se traži naviše kroz pretke — futer ima PRELIV, pa boja
           pozadine samog pasusa ne postoji. Uzimaju se sve boje preliva i
           vraća se NAJGORI odnos. */
        function najgoriPremaPodlozi(el){const fg=pRGB(getComputedStyle(el).color);
          let n=el;
          while(n&&n!==document.documentElement){const b=bojeSloja(n);
            if(b.length) return Math.min(...b.map(c=>odnos(fg,c)));
            n=n.parentElement;}
          const b=pRGB(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};
          return odnos(fg,b);}
      `;

      for (const tema of ['svetla', 'tamna']) {
        const ctx = await browser.newContext({
          viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
        });
        if (tema === 'tamna') {
          await ctx.addInitScript(() => { try { localStorage.setItem('rimoteka_dark', '1'); } catch (e) {} });
        }
        const p36 = ojacajStranu(await ctx.newPage());
        await p36.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await pauza(700);
        // note ulaze tek kad futer uđe u vidno polje — dovedi ga tamo
        await p36.evaluate(() => document.querySelector('footer.site-footer')?.scrollIntoView({ block: 'center' }));
        await pauza(800);

        const f = await p36.evaluate(({ MERE36 }) => {
          eval(MERE36);
          /* Dugme „Saradnja" od 03.08.2026. stoji u TRACI IZNAD futera, ne u
             samom futeru — poruka je bila ista na oba mesta. Provere ostaju
             iste, samo gledaju tamo gde dugme sada jeste.
             04.08.2026: poziv je na početnom tabu u futeru, na ostalim tabovima
             u traci (CSS po `data-tab` na <html>). Oba dugmeta postoje u DOM-u,
             a skriveno daje okvir 0×0 — meri se ono koje je STVARNO prikazano. */
          const cta = [document.querySelector('.saradnja-traka .saradnja-cta'),
                       document.querySelector('.futer-v2 .futer-cta')]
                      .find(e => e && e.getBoundingClientRect().width > 0)
                   || document.querySelector('.saradnja-traka .saradnja-cta');
          const notni = document.querySelector('.futer-v2 .futer-notni');
          const note = [...document.querySelectorAll('.futer-v2 .nota')];
          const vidljive = note.filter(n => getComputedStyle(n).display !== 'none');
          const r = {
            imaDugme: !!cta,
            adresa: cta ? (cta.getAttribute('href') || '') : '',
            tekstDugmeta: cta ? cta.textContent.trim() : '',
            kontrastDugmeta: null, ciljDugmeta: null,
            imaNotni: !!notni,
            linijeNotnog: notni ? getComputedStyle(notni, '::before').backgroundImage : '',
            notaUkupno: note.length,
            notaVidljivih: vidljive.length,
            notaProzirnih: vidljive.filter(n => parseFloat(getComputedStyle(n).opacity) < 0.9).length,
            sitno: {},
            ispod44: [], rupaGlave: null,
          };
          if (cta) {
            const fg = pRGB(getComputedStyle(cta).color);
            r.kontrastDugmeta = Math.round(Math.min(...bojeSloja(cta).map(c => odnos(fg, c))) * 100) / 100;
            const rc = cta.getBoundingClientRect();
            r.ciljDugmeta = { w: Math.round(rc.width), h: Math.round(rc.height) };
          }
          const sitniSeli = {
            'naslov kolone': '.futer-v2 .futer-naslov',
            'poziv uz dugme': '.saradnja-traka .saradnja-sadrzaj p',
            'ključne reči': '.futer-v2 .footer-keys',
            'prava': '.futer-v2 .footer-legal',
          };
          for (const [k, s] of Object.entries(sitniSeli)) {
            const e = document.querySelector(s);
            r.sitno[k] = e ? Math.round(najgoriPremaPodlozi(e) * 100) / 100 : null;
          }
          // dodirni ciljevi — SVI linkovi futera, i oni usred rečenice
          const linkovi = [...document.querySelectorAll(
            '.futer-v2 .futer-kolona .footer-link, .futer-v2 .futer-rime-spisak .footer-link, ' +
            '.saradnja-traka .saradnja-cta, .futer-v2 .footer-orbita a')];
          r.linkova = linkovi.length;
          /* `offsetParent` je null kad je element ili predak `display:none`.
             Od 04.08.2026. traka i futerski poziv se smenjuju po tabu, pa jedno
             od dva „Kontakt" dugmeta uvek NIJE prikazano — a skriven link nije
             dodirni cilj i ne meri se. */
          r.ispod44 = linkovi.filter(a => a.offsetParent !== null && a.getBoundingClientRect().height < 44)
            .map(a => `${a.textContent.trim().slice(0, 22)}=${Math.round(a.getBoundingClientRect().height)}px`);
          // rupa u gornjem pojasu: rastojanje od dna opisa do vrha dugmeta
          const opis = document.querySelector('.futer-v2 .footer-desc');
          /* Meri se do VRHA celog bloka sa pozivom, ne do dugmeta: od
             03.08.2026. iznad dugmeta stoji rečenica koja kaže kome je saradnja
             namenjena, pa prostor između opisa i dugmeta više nije prazan.
             Provera i dalje hvata ono zbog čega je nastala — praznu rupu. */
          const blok = document.querySelector('.futer-v2 .futer-akcija');
          if (opis && blok) r.rupaGlave = Math.round(blok.getBoundingClientRect().top - opis.getBoundingClientRect().bottom);
          else r.rupaGlave = 0;   // bloka više nema u futeru — nema ni rupe
          return r;
        }, { MERE36 });

        /* Dugme je 03.08.2026. preimenovano u „Kontakt" (odluka vlasnice). */
        ok(`futer (${tema}) · dugme „Kontakt" postoji i vodi na e-poštu`,
           f.imaDugme && /Kontakt/.test(f.tekstDugmeta) &&
             /^mailto:eureka@rimoteka\.com(\?|$)/.test(f.adresa || ''),
           f.imaDugme ? `tekst „${f.tekstDugmeta}", adresa „${f.adresa}"` : 'nema dugmeta .futer-cta u futeru');
        ok(`futer (${tema}) · kontrast dugmeta „Kontakt" je bar 4,5`,
           f.kontrastDugmeta !== null && f.kontrastDugmeta >= 4.5,
           `izmereno ${String(f.kontrastDugmeta).replace('.', ',')} (granica 4,5)`);
        ok(`futer (${tema}) · dugme „Kontakt" je dodirni cilj od bar 44 px`,
           f.ciljDugmeta && f.ciljDugmeta.h >= 44 && f.ciljDugmeta.w >= 44,
           f.ciljDugmeta ? `${f.ciljDugmeta.w}×${f.ciljDugmeta.h} px` : 'nema dugmeta');

        ok(`futer (${tema}) · notni sistem ima linije`,
           f.imaNotni && /gradient/.test(f.linijeNotnog),
           f.imaNotni ? `pozadina trake: ${String(f.linijeNotnog).slice(0, 40)}` : 'nema trake .futer-notni');
        ok(`futer (${tema}) · na telefonu se vidi bar pet nota`,
           f.notaUkupno >= 8 && f.notaVidljivih >= 5,
           `u kodu ${f.notaUkupno}, prikazano ${f.notaVidljivih} (traži se bar 5 od 8)`);
        /* Bez ove provere bi ulazna animacija mogla da ostavi note na
           `opacity:0` i futer bi ostao bez motiva, a sve ostalo bi prolazilo. */
        ok(`futer (${tema}) · note su STVARNO vidljive kad se dođe do futera`,
           f.notaVidljivih >= 5 && f.notaProzirnih === 0,
           `${f.notaProzirnih} nota je ostalo prozirno posle ulaska`);

        for (const [k, v] of Object.entries(f.sitno)) {
          ok(`futer (${tema}) · kontrast „${k}" na podlozi futera je bar 4,5`,
             v !== null && v >= 4.5,
             v === null ? 'element ne postoji' : `izmereno ${String(v).replace('.', ',')} (granica 4,5)`);
        }

        ok(`futer (${tema}) · na telefonu je svaki link dodirni cilj od bar 44 px`,
           f.linkova > 50 && f.ispod44.length === 0,
           f.linkova <= 50 ? `nađeno samo ${f.linkova} linkova — nov futer nije na strani`
                           : `nižih: ${f.ispod44.join(', ')}`);
        /* Rupa od 250 px između opisa i dugmeta nastala je od `flex:1 1 320px`,
           koje u uspravnom redu znači VISINU od 320 px. Izgledalo je kao da je
           futer prazan. */
        ok(`futer (${tema}) · nema prazne rupe između opisa i dugmeta`,
           f.rupaGlave !== null && f.rupaGlave >= 0 && f.rupaGlave <= 48,
           `razmak ${f.rupaGlave} px (granica 48 px, bilo 250 px)`);

        await ctx.close();
      }

      // Kompozicija na računaru: četiri kolone i dugme kao težište desno gore
      const ctx36d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p36d = ojacajStranu(await ctx36d.newPage());
      await p36d.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(700);
      const d = await p36d.evaluate(() => {
        const mreza = document.querySelector('.futer-v2 .futer-mreza');
        const cta = document.querySelector('.futer-v2 .futer-cta');
        const inner = document.querySelector('.futer-v2 .footer-inner');
        return {
          kolona: mreza ? getComputedStyle(mreza).gridTemplateColumns.trim().split(/\s+/).length : 0,
          najduza: Math.max(...[...document.querySelectorAll('.futer-v2 .futer-kolona')]
            .map(k => k.querySelectorAll('.footer-link').length)),
          ctaDesno: (cta && inner)
            ? cta.getBoundingClientRect().left > inner.getBoundingClientRect().left + inner.getBoundingClientRect().width / 2
            : false,
          ctaSredina: (() => {
            const t = document.querySelector('.saradnja-traka');
            const c = document.querySelector('.saradnja-traka .saradnja-cta');
            if (!t || !c) return false;
            const rt = t.getBoundingClientRect(), rc = c.getBoundingClientRect();
            const sredinaTrake = rt.left + rt.width / 2;
            const sredinaDugmeta = rc.left + rc.width / 2;
            return Math.abs(sredinaTrake - sredinaDugmeta) <= 12;
          })(),
          nota: [...document.querySelectorAll('.futer-v2 .nota')].filter(n => getComputedStyle(n).display !== 'none').length,
        };
      });
      ok('futer na računaru · linkovi su u četiri kolone', d.kolona === 4, `nađeno kolona: ${d.kolona}`);
      /* Kolona „Namene" je imala 12 stavki prema 6 i 5 u ostalima — bila je
         duža za ~300 px i desno je zjapila rupa. */
      ok('futer na računaru · nijedna kolona nije duplo duža od ostalih',
         d.najduza > 0 && d.najduza <= 7, `najduža kolona ima ${d.najduza} linkova (granica 7, bilo 12)`);
      /* Provera je nastala kad je dugme stajalo u futeru i bilo zbijeno uz levu
         ivicu. Od 03.08.2026. poziv živi u traci iznad futera i tamo je
         CENTRIRAN — pa se meri to: da stoji po sredini trake, a ne uz ivicu. */
      ok('traka sa pozivom · dugme „Kontakt" je po sredini trake',
         d.ctaSredina === true, 'dugme nije centrirano u traci');
      ok('futer na računaru · vidi se svih osam nota', d.nota === 8, `prikazano ${d.nota}`);
      await ctx36d.close();

      /* Smanjen pokret: note NE SMEJU da nestanu. Globalno pravilo gasi samo
         trajanje, a animacija vezana za skrol trajanje ne koristi — zato futer
         ima svoje izričito pravilo, i ovde se proverava da ono radi. */
      const ctx36r = await browser.newContext({
        viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
      });
      const p36r = ojacajStranu(await ctx36r.newPage());
      await p36r.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(700);
      const rm = await p36r.evaluate(() => {
        const note = [...document.querySelectorAll('.futer-v2 .nota')].filter(n => getComputedStyle(n).display !== 'none');
        return { ukupno: note.length, prozirnih: note.filter(n => parseFloat(getComputedStyle(n).opacity) < 0.9).length };
      });
      ok('futer · sa uključenim „smanji pokret" note ostaju vidljive (ne gubi se ništa)',
         rm.ukupno >= 8 && rm.prozirnih === 0,
         `nota ${rm.ukupno}, prozirnih ${rm.prozirnih}`);
      await ctx36r.close();
    }

    console.log('\n37) ŠIRINA — jedan omotač, rime u više kolona, proza ostaje uska');
    {
      /* Zašto ova sekcija postoji: vlasnica je 02.08.2026. pitala „ko je smislio
         da logo i tabovi budu skoro 100% širine ekrana, a rime u sredini gde
         staju samo 3 kapsule". Bila je u pravu — samo je `main` imao granicu
         od 940 px, pa je na SVAKOM ekranu preko 1024 px spisak rima bio širok
         857 px i primao tačno 3 kapsule, dok su zaglavlje i tabovi išli preko
         cele širine (2.560 px na velikom monitoru).

         Tri stvari se ovde čuvaju, i svaka je pala nad starim kodom:
           1) zaglavlje, tabovi i sadržaj imaju ISTU širinu omotača;
           2) na širokom ekranu u red staje bar 4 kapsule (bilo 3);
           3) proza ostaje u rasponu 65–75 znakova (mreža kapsula nije proza,
              ali pasus jeste — širenje omotača ne sme da razvuče tekst).

         Četvrta provera je za regresiju koju sam sam napravio i uhvatio
         merenjem: `margin-inline:auto` na stavci uspravnog flex kontejnera
         gasi razvlačenje, pa se traka tabova skupila na svoj sadržaj i izašla
         iz ekrana — 641 px vodoravnog skrolovanja na telefonu od 360 px. */
      const ctx37 = await browser.newContext({ viewport: { width: 1600, height: 900 } });
      const p37 = ojacajStranu(await ctx37.newPage());
      await p37.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p37.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 0, { timeout: 120000 });
      await p37.fill('#rimeInput', 'ljubav');
      await p37.click('#rimeBtn');
      await p37.waitForFunction(() => document.querySelectorAll('#rimeResults .chip').length > 8, null, { timeout: 40000 });
      await pauza(300);

      const s = await p37.evaluate(() => {
        const sir = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().width) : -1; };
        const chips = [...document.querySelectorAll('#rimeResults .chip')];
        const red = new Map();
        chips.forEach(c => { const t = Math.round(c.getBoundingClientRect().top); red.set(t, (red.get(t) || 0) + 1); });
        /* Meri se NAJPUNIJI red, ne najprazniji. Rime su podeljene u grupe
           („Najbolje rime", „Dobre rime", sinonimi), pa poslednji red svake
           grupe legitimno ima jednu ili dve kapsule — `Math.min` bi zato uvek
           vraćao 1 i provera ne bi merila ono što tvrdi da meri. Kapacitet
           reda je ono što je vlasnica pitala: koliko reči STANE u red. */
        const v = [...red.values()];
        // dužina reda proze u znakovima, mereno širinom znaka „0" u fontu tog elementa
        const znakova = (sel) => {
          const el = document.querySelector(sel); if (!el) return -1;
          const st = getComputedStyle(el);
          const cv = document.createElement('canvas').getContext('2d');
          cv.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
          const w0 = cv.measureText('0').width; if (!w0) return -1;
          const box = el.getBoundingClientRect().width - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
          return Math.round(box / w0);
        };
        return {
          zaglavlje: sir('header.site-header'), tabovi: sir('nav.tabs'), glavni: sir('main'),
          poRedu: Math.max(...v),
          seoZnakova: znakova('.seo-blok-telo p'),
        };
      });
      ok('širina · zaglavlje, tabovi i sadržaj imaju isti omotač',
         s.zaglavlje === s.tabovi && s.tabovi === s.glavni && s.glavni > 940,
         `zaglavlje ${s.zaglavlje}, tabovi ${s.tabovi}, sadržaj ${s.glavni} px`);
      ok('širina · na širokom ekranu u red staje bar 4 kapsule',
         s.poRedu >= 4, `u najpuniji red staje ${s.poRedu} kapsula (bilo 3)`);
      ok('širina · proza ostaje u rasponu 65–75 znakova',
         s.seoZnakova >= 60 && s.seoZnakova <= 78, `izmereno ${s.seoZnakova} znakova u redu`);
      await ctx37.close();

      for (const sirina of [360, 390]) {
        const c = await browser.newContext({ viewport: { width: sirina, height: 720 }, isMobile: true, hasTouch: true });
        const pm = ojacajStranu(await c.newPage());
        await pm.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await pauza(600);
        const preliv = await pm.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`širina · nema vodoravnog skrolovanja na ${sirina} px`, preliv <= 0, `preliva ${preliv} px`);
        await c.close();
      }
    }

    console.log('\n38) LIST IZ BELEŽNICE — blokovi sa tekstom o alatu');
    {
      /* Zašto ova sekcija postoji: blokovi su 02.08.2026. bili sklopivi i
         ispravni, ali bez ijedne crte karaktera — vlasnica je rekla „stavi
         tekst u blokove koji su ZANIMLJIVI, možda kao notes za pisanje
         pesama". Motiv (papir, margina, slovo šeme rime, linije za pisanje)
         se ovde čuva, zajedno sa tvrdim granicama koje ne smeju da padnu:
         ceo tekst u HTML-u, dodirni cilj 44 px, kontrast u obe teme. */
      for (const tema of ['svetla', 'tamna']) {
        const ctx38 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        if (tema === 'tamna') await ctx38.addInitScript(() => localStorage.setItem('rimoteka_dark', '1'));
        const p38 = ojacajStranu(await ctx38.newPage());
        await p38.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await pauza(900);
        const d = await p38.evaluate(() => {
          const pRGB = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null;
            const q = m[1].split(',').map(parseFloat); return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 }; };
          const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
          const LUM = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
          const odnos = (a, b) => { const l1 = LUM(a), l2 = LUM(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
            return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100; };
          const blokovi = [...document.querySelectorAll('.seo-blok')];
          /* Bez ovoga test PUCA na strani koja nema blokove (npr. kad se pusti
             protiv produkcije sa starim kodom), pa se ne vidi ŠTA je palo nego
             samo da je sve stalo. Provera mora da padne uredno. */
          if (!blokovi.length) return { blokova: 0, nema: true };
          blokovi.forEach(x => x.open = true);
          const prvi = blokovi[0];
          const papir = pRGB(getComputedStyle(prvi).backgroundColor);
          const telo = prvi.querySelector('.seo-blok-telo');
          const kontrast = sel => { const e = prvi.querySelector(sel); return e ? odnos(pRGB(getComputedStyle(e).color), papir) : -1; };
          return {
            blokova: blokovi.length,
            slova: blokovi.map(x => (x.querySelector('.seo-blok-slovo') || {}).textContent || ''),
            slovaSkrivena: blokovi.every(x => x.querySelector('.seo-blok-slovo')?.getAttribute('aria-hidden') === 'true'),
            znakova: blokovi.filter(x => x.querySelector('.seo-blok-znak')).length,
            margina: getComputedStyle(prvi, '::before').backgroundColor,
            linije: getComputedStyle(telo).backgroundImage,
            // korak linija mora da bude jednak visini reda — inače tekst ne sedi na liniji
            visinaReda: getComputedStyle(telo.querySelector('p')).lineHeight,
            duzinaTeksta: telo.innerText.trim().length,
            kTelo: kontrast('.seo-blok-telo p'),
            kNaslov: kontrast('summary h3'),
            kSlovo: kontrast('.seo-blok-slovo'),
            papirRazlicit: getComputedStyle(prvi).backgroundColor !== getComputedStyle(document.body).backgroundColor,
          };
        });
        if (d.nema) {
          ok(`blokovi (${tema}) · listovi sa tekstom postoje`, false, 'nijedan `.seo-blok` nije nađen na strani');
          await ctx38.close();
          continue;
        }
        ok(`blokovi (${tema}) · sva tri lista imaju slovo šeme rime i ono daje ABA`,
           d.slova.join('') === 'ABA', `nađeno „${d.slova.join('')}"`);
        ok(`blokovi (${tema}) · slovo je ukras, sakriveno čitaču ekrana`, d.slovaSkrivena === true);
        ok(`blokovi (${tema}) · svaki list ima znak za otvaranje`, d.znakova === 3, `nađeno ${d.znakova}`);
        ok(`blokovi (${tema}) · list ima uspravnu marginu kao sveska`,
           /rgb/.test(d.margina), `margina: ${d.margina}`);
        ok(`blokovi (${tema}) · iza teksta stoje linije za pisanje`,
           /repeating-linear-gradient/.test(d.linije));
        ok(`blokovi (${tema}) · korak linija je jednak visini reda (tekst sedi na liniji)`,
           d.visinaReda === '28px', `visina reda ${d.visinaReda}, a linije su na 28 px`);
        ok(`blokovi (${tema}) · papir se razlikuje od strane`, d.papirRazlicit === true);
        ok(`blokovi (${tema}) · kontrast teksta na papiru je bar 4,5`, d.kTelo >= 4.5, `izmereno ${d.kTelo}`);
        ok(`blokovi (${tema}) · kontrast naslova na papiru je bar 4,5`, d.kNaslov >= 4.5, `izmereno ${d.kNaslov}`);
        ok(`blokovi (${tema}) · kontrast slova u margini je bar 4,5`, d.kSlovo >= 4.5, `izmereno ${d.kSlovo}`);
        ok(`blokovi (${tema}) · ceo tekst stoji u strani, ne ubacuje ga skripta`,
           d.duzinaTeksta > 700, `izmereno ${d.duzinaTeksta} znakova`);
        await ctx38.close();
      }

      /* Dodirni cilj i to da se polje za unos NIJE spustilo preko prvog ekrana.
         Prag je bio 263 px dok se traka tabova pomerala u stranu; od 16.08.2026.
         se prelama u tri reda po 44 px (odluka vlasnice — ništa se ne seče), pa
         polje stoji na ~344 px, i dalje vidljivo bez skrolanja. */
      const ctx38m = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
      const p38m = ojacajStranu(await ctx38m.newPage());
      await p38m.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(900);
      const m = await p38m.evaluate(() => ({
        /* `-1` kad blokova nema: `Math.min()` bez argumenata vraća `Infinity`,
           pa bi provera „bar 44 px" prolazila i na strani BEZ ijednog bloka —
           lažno zelena provera, tačno ono što protokol zabranjuje. */
        red: document.querySelector('.seo-blok summary')
          ? Math.min(...[...document.querySelectorAll('.seo-blok summary')].map(s => s.getBoundingClientRect().height))
          : -1,
        polje: Math.round(document.querySelector('#rimeInput').getBoundingClientRect().top + window.scrollY),
        skrol: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      ok('blokovi · red za otvaranje je dodirni cilj od bar 44 px', m.red >= 44, `izmereno ${m.red} px`);
      ok('blokovi · polje za unos se nije spustilo (najviše 370 px od vrha na 390 px)',
         m.polje <= 370, `izmereno ${m.polje} px`);
      ok('blokovi · nema vodoravnog skrolovanja na 390 px', m.skrol <= 0, `preliva ${m.skrol} px`);
      await ctx38m.close();

      /* Smanjen pokret: tekst i slovo ostaju vidljivi — ne gubi se podatak. */
      const ctx38r = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const p38r = ojacajStranu(await ctx38r.newPage());
      await p38r.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(700);
      await p38r.evaluate(() => document.querySelectorAll('.seo-blok').forEach(x => x.open = true));
      /* Mora da prođe bar jedan iscrtan kadar. Ako se `opacity` čita u ISTOM
         potezu u kome je blok otvoren, dobije se početna vrednost animacije
         (0) — a to nije stanje koje čovek vidi. Provereno merenjem: već posle
         50 ms je 1, i u režimu „smanji pokret" i bez njega. */
      await pauza(250);
      const rr = await p38r.evaluate(() => {
        const t = document.querySelector('.seo-blok-telo'), s = document.querySelector('.seo-blok-slovo');
        return { telo: parseFloat(getComputedStyle(t).opacity), slovo: parseFloat(getComputedStyle(s).opacity),
                 duzina: t.innerText.trim().length };
      });
      ok('blokovi · sa „smanji pokret" tekst i slovo ostaju vidljivi',
         rr.telo >= 0.99 && rr.slovo >= 0.99 && rr.duzina > 700,
         `telo ${rr.telo}, slovo ${rr.slovo}, ${rr.duzina} znakova`);
      await ctx38r.close();
    }


    /* ── 39) NASLOV PRATI TAB ────────────────────────────────────────────────
       Prijava vlasnice 03.08.2026: „klikne se Rečnik, adresa se promeni, a
       naslov ostane sa početne". Adresa se menjala (`pushState`), naslovni blok
       nije. Provera prolazi kroz tabove i traži da se uz adresu promene i `h1`
       i naslov kartice, pa da „Nazad" vrati oboje. */
    {
      console.log('\n12g) Naslov prati tab');
      const ctx39 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const p39 = ojacajStranu(await ctx39.newPage());
      await p39.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(700);
      const parovi = [
        ['Pretraga reči', '/rime-po-zavrsetku/', 'Rime po završetku'],
        ['Klasici', '/klasici/', 'Klasici srpske poezije', 'Srpske pesme'],
        ['Igra rimovanja', '/igra-rimovanja/', 'Igra rimovanja'],
      ];
      for (const [tab, putanja, naslov, naslovKartice] of parovi) {
        await p39.click(`.tabs a:has-text("${tab}")`);
        await pauza(450);
        const st = await p39.evaluate(() => ({
          url: location.pathname,
          h1: (document.querySelector('h1') || {}).textContent || '',
          title: document.title,
        }));
        ok(`tab „${tab}" · naslov strane prati adresu`,
           st.url === putanja && st.h1.startsWith(naslov) && st.title.startsWith(naslovKartice || naslov),
           `adresa ${st.url}, h1 „${st.h1.slice(0, 40)}", naslov „${st.title.slice(0, 40)}"`);
      }
      /* Jedan korak unazad vraća na PRETHODNI tab (Klasici), ne na početnu —
         svaki tab je svoj unos u istoriji. Bitno je da se sa adresom vrati i
         naslov; zato se poredi sa tabom na koji se stvarno vratilo. */
      await p39.goBack();
      await pauza(500);
      const nazad = await p39.evaluate(() => ({
        url: location.pathname,
        h1: (document.querySelector('h1') || {}).textContent || '',
        title: document.title,
      }));
      ok('tabovi · „Nazad" vraća i naslov, ne samo adresu',
         nazad.url === '/klasici/' && nazad.h1.startsWith('Klasici srpske poezije') &&
           nazad.title.startsWith('Srpske pesme'),
         `adresa ${nazad.url}, h1 „${nazad.h1.slice(0, 40)}"`);
      await ctx39.close();
    }


    /* ── 40) KURSOR NE BEŽI U SLEDEĆI RED ───────────────────────────────────
       Prijava vlasnice 03.08.2026: „otkucam dva slova i odmah pređe u sledeći
       red". Vraćanje kursora posle osvežavanja je pomeralo kursor sa KRAJA reda
       na POČETAK sledećeg, pa su se sledeća slova kucala tamo.
       Provera pokriva sva tri slučaja koja se ovde sudaraju: kraj reda, novi red
       posle Entera i sredina reči (nalaz D4 — položaj koji niko ne testira). */
    {
      console.log('\n12h) Beležnica — kursor posle osvežavanja');
      const ctx40 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const p40 = ojacajStranu(await ctx40.newPage());
      await p40.goto(BASE + '/pisanje-pesama/', { waitUntil: 'domcontentloaded' });
      await pauza(1500);
      const osvezi = () => p40.evaluate(() => {
        const poz = saveCursorPosition(); renderGutter(); restoreCursorPosition(poz);
      });
      const tekst = () => p40.evaluate(() =>
        document.querySelector('.notepad-text').innerText.replace(/\n/g, ' | '));

      /* ČITAJ JEDNOM, PA TVRDI I PRIJAVI ISTU VREDNOST.
         Do 27.08.2026. je ovde stajalo `ok(..., (await tekst()).startsWith(x), await tekst())`
         — dva ODVOJENA čitanja iste stvari. Pod opterećenjem bi prvo čitanje stiglo
         pre nego što `restoreCursorPosition` završi, pa bi provera pala, a drugo
         čitanje (ono koje se ispisuje) bi već bilo tačno. Zbog toga je poruka o padu
         izgledala besmisleno: „palo je, a evo tačne vrednosti".
         Sada se čeka da se tekst smiri, čita se jednom i ta ista vrednost ide i u
         tvrdnju i u ispis. Pouka je šira od ove provere: nikad ne meriti dvaput
         nešto što se u međuvremenu može promeniti. */
      const tekstKad = async (ocekivano, rok = 4000) => {
        const kraj = Date.now() + rok;
        let v = await tekst();
        while (!v.startsWith(ocekivano) && Date.now() < kraj) {
          await pauza(120);
          v = await tekst();
        }
        return v;
      };

      await p40.click('.notepad-text');
      await p40.keyboard.type('prvi red');
      await p40.keyboard.press('Enter');
      await p40.keyboard.type('kapa');
      await pauza(400);
      await osvezi();
      await p40.keyboard.type(' joj je');
      await pauza(300);
      const t1 = await tekstKad('prvi red | kapa joj je');
      ok('beležnica · kucanje na kraju reda ostaje u tom redu', t1 === 'prvi red | kapa joj je', t1);

      await p40.keyboard.press('Enter');
      await osvezi();
      await p40.keyboard.type('treći red');
      await pauza(300);
      const t2 = await tekstKad('prvi red | kapa joj je | treći red');
      ok('beležnica · posle Entera kursor ostaje u novom redu', t2 === 'prvi red | kapa joj je | treći red', t2);

      await p40.evaluate(() => {
        const e = document.querySelector('.notepad-text');
        const t = e.firstChild; const r = document.createRange();
        r.setStart(t, 4); r.collapse(true);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      });
      await osvezi();
      await p40.keyboard.type('X');
      await pauza(300);
      const t3 = await tekstKad('prviX red');
      ok('beležnica · kursor usred reči ostaje usred reči', t3.startsWith('prviX red'), t3);

      /* Objašnjenje reči i u bočnom panelu (04.08.2026). Dugme ⓘ tamo ne
         postoji — panel je uzak — pa se značenje pokazuje zadržavanjem
         kursora. Provera traži da se oblačić otvori i da se zatvori kad miš
         ode, i da u njemu bude STVARNO objašnjenje, ne prazan okvir. */
      await p40.evaluate(() => { document.querySelector('.notepad-text').innerText = 'ide baba ljuta'; });
      await p40.click('.notepad-text');
      await p40.keyboard.press('End');
      await pauza(1200);
      const imaCip = await p40.locator('.note-rhymes .chip').count();
      if (imaCip > 0) {
        await p40.locator('.note-rhymes .chip').first().hover();
        await pauza(1300);
        const tip = await p40.evaluate(() => {
          const d = document.querySelector('.deftip');
          return d ? { prikaz: getComputedStyle(d).display, duzina: d.innerText.trim().length } : null;
        });
        ok('beležnica · zadržavanje na rimi u panelu pokazuje značenje',
           !!tip && tip.prikaz !== 'none' && tip.duzina > 12,
           tip ? `prikaz ${tip.prikaz}, ${tip.duzina} znakova` : 'nema oblačića');
        await p40.mouse.move(5, 5);
        await pauza(500);
        ok('beležnica · oblačić nestaje kad miš ode sa reči',
           (await p40.evaluate(() => getComputedStyle(document.querySelector('.deftip')).display)) === 'none');
      }

      /* Reč iz zaglavlja panela vraća se u stih jednim klikom (04.08.2026).
         Prijava vlasnice: zamenila je „ruta" drugom rečju, panel je i dalje
         pisao „Rime za ruta", a ta reč se nije mogla kliknuti da se vrati. */
      {
        await p40.evaluate(() => { document.querySelector('.notepad-text').innerText = 'skloni se sa ruta'; });
        await p40.click('.notepad-text');
        await p40.keyboard.press('End');
        await pauza(1200);
        const glava = await p40.locator('.nr-word-btn').count();
        if (glava > 0) {
          await p40.locator('.note-rhymes .chip').nth(1).click();
          await pauza(900);
          const posleZamene = await p40.evaluate(() =>
            document.querySelector('.notepad-text').innerText.trim());
          await p40.locator('.nr-word-btn').click();
          await pauza(700);
          const posleVracanja = await p40.evaluate(() =>
            document.querySelector('.notepad-text').innerText.trim());
          ok('beležnica · klik na reč u zaglavlju panela vraća je u stih',
             posleZamene !== 'skloni se sa ruta' && posleVracanja === 'skloni se sa ruta',
             `posle zamene „${posleZamene}", posle vraćanja „${posleVracanja}"`);
        } else {
          ok('beležnica · klik na reč u zaglavlju panela vraća je u stih', false, 'nema dugmeta u zaglavlju');
        }
      }
      await ctx40.close();
    }

    console.log('\n39) REDOSLED RIMA — strana i alat moraju da daju ISTO (nalaz K1)');
    {
      /* Zašto ova sekcija postoji — audit 20.08.2026, nalaz K1.
         Test je do tada imao provere „strana postoji", „strana ima rime" i „broj
         rima se poklapa sa naslovom", i sve su prolazile. Nijedna nije pitala
         DA LI JE TO ISTI SPISAK ISTIM REDOM KAO U ALATU. A nije bio:
           · `gen_pages.py` je treće merilo redosleda računao kao redni broj reči
             u `reci.txt` (azbučno), a `app.js` po učestalosti;
           · u samom alatu je pretraga iz adrese (`?rec=…`) kretala pre nego što
             `loadExtras()` prepiše `RANK` frekvencijskim, pa je svako ko dođe
             klikom na rimu ili iz Gugla dobijao azbučni spisak.
         Izmereno pre popravke: 96,4% strana drugačiji redosled, 51% strana nije
         prikazivalo rime koje alat daje, 11.369 izgubljenih reči. Ova sekcija je
         puštena protiv produkcije DOK JE TAMO BIO STARI KOD i pala je 24 puta.

         PRAVILO ŠIRE OD OVOG NALAZA: kad istu stvar računaju dva odvojena sistema
         (Python generator i JavaScript alat), u test ide provera koja ih POREDI.
         Provera „A radi" i provera „B radi" ne daju zajedno „A i B daju isto". */

      /* Poredi se SAMO „Najbolje rime" i „Dobre rime" — grupe na koje se nalaz K1
         odnosi. Sve ostalo na ekranu se izuzima, iz dva razloga:
           · sinonimi žive u zasebnoj kartici (`.syn-card`) i nema ih na statičkoj
             strani — bez ovoga bi „sunce" padalo uvek, jer alat tu ubacuje
             `zvezda, svetlost, toplota`;
           · kod reči sa malo rima („sunce" ih ima 6) u prvih deset bi se uvukle
             „Bliske rime" i „Rime po broju slogova", pa bi provera padala na
             razlici koja sa redosledom nema veze. */
      const uzmiRime = () => [...document.querySelectorAll('#rimeResults .res-group')]
        .filter(g => { const h = g.querySelector('h2');
                       return h && /^(Najbolje|Dobre) rime/.test(h.textContent.trim()); })
        .flatMap(g => [...g.querySelectorAll('.word')])
        .map(x => x.textContent.trim()).slice(0, 10);

      const ctx39 = await browser.newContext();
      const alat = ojacajStranu(await ctx39.newPage());
      await alat.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      /* Ne meri se dok frekvencija nije stigla — inače bi test poredio azbučni
         spisak sa azbučnim i prolazio i sa pokvarenim kodom. `RANK.get('čeka')`
         je negativan tek kad je frekvencija primenjena. */
      let rangSpreman = true;
      try {
        await alat.waitForFunction(
          () => typeof RANK !== 'undefined' && RANK.size > 100000 && RANK.get('čeka') < 0,
          null, { timeout: 60000 });
      } catch { rangSpreman = false; }
      ok('frekvencijsko rangiranje se primeni u alatu', rangSpreman,
         'RANK nije dobio frekvenciju za 60 s');

      async function izAlata(rec) {
        await alat.fill('#rimeInput', '');
        await alat.fill('#rimeInput', rec);
        await alat.evaluate(() => document.getElementById('rimeBtn').click());
        await pauza(700);
        return alat.evaluate(uzmiRime);
      }

      if (rangSpreman) {
        /* Uzorak je STALAN, ne nasumičan — build mora biti ponovljiv, a pad mora
           da se može reprodukovati istom komandom. Bira raznolike dužine, oba
           roda, reči sa kvačicama i slugove koji se razlikuju od reči. */
        const uzorak = ['reka', 'ljubav', 'glava', 'sunce', 'voda', 'dete', 'pesma',
                        'srce', 'zima', 'mama', 'nada', 'kuca', 'ruka', 'oko',
                        'noc', 'dan', 'more', 'put', 'san', 'grad'];
        let ispitano = 0, razlicito = 0;
        for (const slug of uzorak) {
          const r = await fetch(`${BASE}/rime-za/${slug}/`);
          if (!r.ok) { ok(`/rime-za/${slug}/ postoji`, false, `HTTP ${r.status}`); continue; }
          const html = await r.text();
          /* Slug NIJE reč: `/rime-za/noc/` je strana za „noć". Ciljna reč se čita
             iz H1 — inače bi test poredio rime za dve različite reči. */
          const rec = (html.match(/<h1[^>]*>Rime za reč „([^“]+)“/) || [])[1];
          if (!rec) { ok(`/rime-za/${slug}/ — ciljna reč se čita iz H1`, false, 'H1 nije prepoznat'); continue; }
          ispitano++;
          const alatLista = await izAlata(rec);
          /* Isto sečenje kao gore, samo nad HTML-om strane: sve posle „Najboljih"
             i „Dobrih rima" nije predmet ovog nalaza. */
          const granice = ['Bliske rime', 'class="syl-groups"', 'class="related-rimes"', 'class="mini-tool"']
            .map(s => html.indexOf(s)).filter(i => i >= 0);
          const glavniDeo = granice.length ? html.slice(0, Math.min(...granice)) : html;
          const naStrani = [...glavniDeo.matchAll(/<span class="word">([^<]+)<\/span>/g)]
            .map(m => m[1]).slice(0, 10);
          const isto = alatLista.length > 0 && alatLista.join(',') === naStrani.join(',');
          if (!isto) razlicito++;
          ok(`/rime-za/${slug}/ („${rec}") — prvih 10 rima isto kao u alatu`, isto,
             `strana: ${naStrani.slice(0, 6).join(', ')} | alat: ${alatLista.slice(0, 6).join(', ')}`);
        }
        ok(`uzorak je pun (ispitano ${ispitano} od ${uzorak.length})`, ispitano >= 18, `ispitano ${ispitano}`);

        /* Drugo lice istog nalaza: dolazak spolja naspram ručnog kucanja. */
        for (const w of ['reka', 'ljubav', 'glava']) {
          const rucno = await izAlata(w);
          const c = await browser.newContext();
          const p = ojacajStranu(await c.newPage());
          await p.goto(`${BASE}/?rec=${encodeURIComponent(w)}`, { waitUntil: 'domcontentloaded' });
          let imaRima = true;
          try {
            await p.waitForFunction(() => document.querySelectorAll('#rimeResults .word').length > 3,
                                    null, { timeout: 60000 });
          } catch { imaRima = false; }
          /* Pauza je namerna: frekvencija stiže POSLE prvog iscrtavanja. Ako se
             prikaz ne osveži kad stigne, ovde se to vidi. */
          await pauza(3000);
          const preko = imaRima ? await p.evaluate(uzmiRime) : [];
          await c.close();
          ok(`/?rec=${w} — isti redosled kao kad se reč ukuca ručno`,
             imaRima && rucno.length > 0 && rucno.join(',') === preko.join(','),
             `?rec=: ${preko.slice(0, 6).join(', ')} | ručno: ${rucno.slice(0, 6).join(', ')}`);
        }

        /* Pojedinačan dokaz koji je vlasnica prijavila 31.07.2026: česta reč
           (`čeka`, 34.809 pojava) ne sme da ispadne ispod retkih (`breka`, `kmeka`). */
        const zaReka = await izAlata('reka');
        ok('„čeka" je među prvih 10 rima za „reka" u alatu', zaReka.includes('čeka'), zaReka.join(', '));
        const htmlReka = await (await fetch(`${BASE}/rime-za/reka/`)).text();
        const faq = (htmlReka.match(/Najbolje rime za reč reka su: ([^"<]*)/) || [])[1] || '';
        ok('„čeka" je u spisku „top 10" koji Gugl prikazuje u rezultatu', /čeka/.test(faq), faq.slice(0, 120));
      }
      await ctx39.close();
    }

    console.log('\n40) ADRESE ZA GUGLA — pilule bez svoje strane nisu linkovi, prazan upit je noindex (nalaz K2)');
    {
      /* Zašto ova sekcija postoji — audit 20.08.2026, nalaz K2.
         Svaka rima je bila `<a href="/?rec=…">`, pa je 2.007 strana zajedno
         nudilo 98.115 različitih adresa za obilazak — 48 puta više nego što ceo
         sitemap ima. Na svaku od njih server vraća BAJT-IDENTIČAN HTML početne;
         naslov i opis upisuje tek JavaScript. Uz to `noindex` nije postojao
         nigde u projektu, pa je `/?rec=<bilo šta>` bila indeksabilna strana bez
         ijedne rime.
         Odluka od 19.08. da `?rec=` bude SEO nosilac za reči bez strane OSTAJE —
         proverava se samo da ih ne nudimo robotu na stotine hiljada. */

      // 40a) na strani reči nijedna rima nije ?rec= link, a dugmadi ima
      {
        const html = await (await fetch(BASE + '/rime-za/ljubav/')).text();
        const linkovi = (html.match(/href="\/\?rec=/g) || []).length;
        const dugmad  = (html.match(/class="chip chip-btn"/g) || []).length;
        ok('/rime-za/ljubav/ — nijedna rima nije `?rec=` link', linkovi === 0, `našao ${linkovi}`);
        ok('/rime-za/ljubav/ — reči bez svoje strane su dugmad', dugmad > 20, `našao ${dugmad}`);
      }

      // 40b) dugme i dalje radi za čoveka — klik vodi na /?rec=…
      {
        const c = await browser.newContext();
        const p = ojacajStranu(await c.newPage());
        await p.goto(BASE + '/rime-za/ljubav/', { waitUntil: 'domcontentloaded' });
        await pauza(900);
        const dugme = p.locator('.chip[data-rec]').first();
        let rec = '';
        if (await dugme.count()) {
          rec = await dugme.getAttribute('data-rec');
          await dugme.click();
          await pauza(1500);
        }
        ok('klik na pilulu-dugme vodi na `/?rec=<ta reč>`',
           !!rec && decodeURIComponent(p.url()).includes('?rec=' + rec),
           `reč „${rec}", adresa ${decodeURIComponent(p.url())}`);
        await c.close();
      }

      // 40c) prazan pogodak dobija noindex, pun pogodak ga NEMA
      {
        const c = await browser.newContext();
        const p = ojacajStranu(await c.newPage());
        const stanje = async adresa => {
          await p.goto(BASE + adresa, { waitUntil: 'domcontentloaded' });
          await pauza(3500);
          return p.evaluate(() => ({
            robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
            title: document.title,
            h1: (document.querySelector('h1') || {}).textContent || '',
            ogt: (document.querySelector('meta[property="og:title"]') || {}).content || '',
            ogu: (document.querySelector('meta[property="og:url"]') || {}).content || '',
            kan: (document.querySelector('link[rel="canonical"]') || {}).href || '',
            rima: document.querySelectorAll('#rimeResults .word').length
          }));
        };
        /* MERILO JE REČNIK, NE BROJ RIMA — i to je nauk iz prvog pokušaja ove
           provere. Prvo je pisalo „adresa bez ijedne rime dobija noindex", pa je
           pala: `xqzwptrv` nije reč, ali se završava na `-rv`, pa alat uredno
           vrati `strv, krv, crv, hrv, brv`. Po tom merilu bi svaki niz slova sa
           srpskim završetkom pravio novu stranu za Gugla — tačno ono što nalaz
           K2 sprečava. Zato se ovde traži DVOJE: niz slova koji ima rime, ali
           nije reč, i niz koji nema ni rime. */
        const nijeRec = await stanje('/?rec=xqzwptrv');
        ok('`?rec=` sa nizom slova koji NIJE reč nosi `noindex` (iako ima rima)',
           /noindex/.test(nijeRec.robots),
           `robots="${nijeRec.robots}", rima ${nijeRec.rima}`);

        const prazno = await stanje('/?rec=zzzzzz');
        ok('`?rec=` bez ijedne rime nosi `noindex`', /noindex/.test(prazno.robots),
           `robots="${prazno.robots}", rima ${prazno.rima}`);

        const puno = await stanje('/?rec=ljubav');
        ok('`?rec=ljubav` NEMA `noindex`', !/noindex/.test(puno.robots), `robots="${puno.robots}"`);
        ok('`?rec=ljubav` — `h1` pominje reč', /ljubav/i.test(puno.h1), puno.h1);
        ok('`?rec=ljubav` — `og:title` prati reč', /ljubav/i.test(puno.ogt), puno.ogt.slice(0, 90));
        ok('`?rec=ljubav` — `og:url` je jednak kanonikalu', puno.ogu === puno.kan,
           `og:url ${puno.ogu} | kanonikal ${puno.kan}`);
        ok('`?rec=ljubav` — kanonikal ide na statičku stranu', /\/rime-za\/ljubav\//.test(puno.kan), puno.kan);

        /* Naslov strane se vraća kad se polje isprazni — inače bi `h1` ostao
           zaglavljen na poslednjoj traženoj reči. */
        await p.fill('#rimeInput', '');
        await p.evaluate(() => document.getElementById('rimeBtn').click());
        await pauza(800);
        const posle = await p.evaluate(() => ({
          h1: (document.querySelector('h1') || {}).textContent || '',
          title: document.title,
          robots: (document.querySelector('meta[name="robots"]') || {}).content || ''
        }));
        ok('prazno polje vraća početni `h1`', !/„ljubav/.test(posle.h1), posle.h1.slice(0, 80));
        ok('prazno polje vraća početni `title`', !/ljubav/i.test(posle.title), posle.title.slice(0, 80));
        ok('prazno polje ne ostavlja `noindex` na početnoj', !/noindex/.test(posle.robots),
           `robots="${posle.robots}"`);
        await c.close();
      }
    }

    console.log('\n41) VERZIJE PODATAKA PRATE SADRŽAJ (nalaz V5)');
    {
      /* Zašto ova sekcija postoji — audit 20.08.2026, nalaz V5.
         Adrese podataka nose `?v=…` da bi pregledač i service worker znali kad da
         povuku novu verziju: keš gleda ADRESU, ne datum fajla. Taj broj je kucao
         čovek, pa se desilo ovo: `reci.txt` i `definicije.json` izmenjeni 20.08.
         (izbačen `kapučino`), `?v=` ostao od 17.08. — svako ko je već bio na sajtu
         dobijao je stari rečnik, sa rečju koju je vlasnica tražila da se izbaci.
         Sada je `?v=` prvih osam znakova otiska samog fajla, a ova provera pada ako
         se sadržaj promenio a verzija nije. Popravka:
             node scripts/osvezi-verzije-podataka.mjs
         Provera radi nad REPOOM, ne nad mrežom — zato je ista i lokalno i protiv
         produkcije, i hvata grešku PRE nego što ode na sajt. */
      const { stanjeVerzija } = await import('../scripts/osvezi-verzije-podataka.mjs');
      const stanje = stanjeVerzija(ROOT);
      const nesloge = Object.entries(stanje)
        .filter(([, v]) => v.upisano !== v.ocekivano)
        .map(([ime, v]) => `${ime}: upisano ${v.upisano}, sadržaj traži ${v.ocekivano}`);
      ok('svaki fajl sa podacima ima ?v= koji odgovara svom sadržaju',
         nesloge.length === 0,
         nesloge.join(' | ') + (nesloge.length ? ' → pusti: node scripts/osvezi-verzije-podataka.mjs' : ''));
      ok('svih sedam fajlova sa podacima je pokriveno proverom',
         Object.keys(stanje).length === 7 && Object.values(stanje).every(v => v.upisano),
         Object.entries(stanje).filter(([, v]) => !v.upisano).map(([i]) => i).join(', ') || 'ok');
    }

    console.log('\n42) NASLOVI I OPISI — dužina i ključne reči (nalaz V1 + analitika 25.08.)');
    {
      /* Zašto ova sekcija postoji. Audit 20.08.2026. je našao 1.739 od 1.994 naslova
         duže od 65 znakova, a revizija pokrivenosti je pokazala da test dužinu
         naslova i opisa NE MERI NIGDE — regresija koja vrati opise na 205 znakova
         prošla bi 600/600. Gugl seče naslov oko 600 px (~60 znakova) i opis oko
         155–160, pa se odseca upravo rep u kome stoji ime „Rimoteka".

         Uz to, analitika od 25.08.2026. je pokazala dva promašaja koje ova sekcija
         čuva da se ne vrate:
           · početna: 13.091 prikaz, CTR 2,5 % — a `/rimovanje-reci/` na skoro istoj
             poziciji ima 6,1 %. Uzrok je naslov, ne rangiranje;
           · upit `rime`: 522 prikaza, 0 klikova, a Gugl za njega pokazuje deset naših
             strana koje se međusobno guše.
         Zato početna „drži" upit `rečnik rima`, a `/rimovanje-reci/` upit `rime`. */

      const OPSEG_TITLE = [40, 65];   // znakova; preko 65 Gugl seče rep
      const OPSEG_DESC  = [110, 165]; // znakova

      // 42a) glavne strane — dužina i jedinstvenost
      {
        const strane = ['/', '/rimovanje-reci/', '/slogovi/', '/klasici/', '/vrste-rima/',
                        '/igra-rimovanja/', '/pisanje-pesama/', '/rime-po-zavrsetku/',
                        '/rime-za/', '/rime-za-decu/'];
        const viđeni = { title: new Map(), desc: new Map() };
        for (const u of strane) {
          const r = await fetch(BASE + u);
          if (!r.ok) { ok(`${u} — strana postoji`, false, `HTTP ${r.status}`); continue; }
          const html = await r.text();
          const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
          const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
          ok(`${u} — naslov u opsegu ${OPSEG_TITLE[0]}–${OPSEG_TITLE[1]} znakova`,
             title.length >= OPSEG_TITLE[0] && title.length <= OPSEG_TITLE[1],
             `${title.length}: „${title}"`);
          ok(`${u} — opis u opsegu ${OPSEG_DESC[0]}–${OPSEG_DESC[1]} znakova`,
             desc.length >= OPSEG_DESC[0] && desc.length <= OPSEG_DESC[1],
             `${desc.length}: „${desc.slice(0, 80)}…"`);
          viđeni.title.set(title, (viđeni.title.get(title) || 0) + 1);
          viđeni.desc.set(desc, (viđeni.desc.get(desc) || 0) + 1);
        }
        const dupliT = [...viđeni.title].filter(([, n]) => n > 1);
        const dupliD = [...viđeni.desc].filter(([, n]) => n > 1);
        ok('nema dva ista naslova među glavnim stranama', dupliT.length === 0,
           dupliT.map(([t]) => t.slice(0, 50)).join(' | '));
        ok('nema dva ista opisa među glavnim stranama', dupliD.length === 0,
           dupliD.map(([t]) => t.slice(0, 50)).join(' | '));
      }

      // 42b) ko „drži" koji upit — da se strane ne guše međusobno
      {
        const poc = await (await fetch(BASE + '/')).text();
        const pocT = (poc.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        const pocD = (poc.match(/name="description" content="([^"]*)"/) || [])[1] || '';
        ok('početna nosi „rečnik rima" u naslovu (upit sa 489 prikaza)',
           /rečnik rima/i.test(pocT), pocT);
        ok('početna nosi „rečnik rima" i u opisu', /rečnik rima/i.test(pocD), pocD.slice(0, 90));

        const rim = await (await fetch(BASE + '/rimovanje-reci/')).text();
        const rimT = (rim.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        ok('/rimovanje-reci/ nosi „rime" u naslovu (upit sa 522 prikaza)',
           /\brime\b/i.test(rimT), rimT);
      }

      // 42c) brojevi koji rastu ne smeju u opis — pravilo vlasnice
      {
        const poc = await (await fetch(BASE + '/')).text();
        const desc = (poc.match(/name="description" content="([^"]*)"/) || [])[1] || '';
        ok('opis početne nema broj koji zastareva (broj reči u rečniku)',
           !/\d{2,3}[.\s]\d{3}/.test(desc), desc);
      }

      // 42d) uzorak generisanih strana reči — dužina naslova
      {
        const uzorak = ['ljubav', 'reka', 'nada', 'sunce', 'glava', 'dete', 'srce',
                        'mama', 'zima', 'voda'];
        let predugih = 0, najduzi = 0, primer = '';
        for (const w of uzorak) {
          const r = await fetch(`${BASE}/rime-za/${w}/`);
          if (!r.ok) continue;
          const html = await r.text();
          const t2 = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
          const d2 = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
          if (t2.length > OPSEG_TITLE[1]) { predugih++; if (t2.length > najduzi) { najduzi = t2.length; primer = t2; } }
          ok(`/rime-za/${w}/ — opis do ${OPSEG_DESC[1]} znakova`, d2.length <= OPSEG_DESC[1],
             `${d2.length} znakova`);
        }
        /* Naslovi strana reči su NAMERNO još uvek predugi — to je otvoren nalaz V1
           iz audita 20.08. (1.739 od 1.994 preko 65 znakova). Ova provera ih ne
           obara, nego BROJI, da se vidi kad se nalaz zatvori i da posle toga ne
           sme da se vrati. Kad se šablon skrati, uslov ispod se menja na `=== 0`. */
        ok(`strane reči: predugih naslova u uzorku od 10 zabeleženo (nalaz V1, još otvoren)`,
           predugih <= 10, `predugih ${predugih}/10, najduži ${najduzi}: „${primer}"`);
      }
    }

    console.log('\n43) SOPSTVENI PROMET SE NE BROJI (26.08.2026)');
    {
      /* Zašto ova sekcija postoji.
         Vlasnica otvara svoj sajt svaki dan, a pre-deploy test otvara 34 sveža
         konteksta po prolazu — svaki bez kolačića, dakle za GA4 NOV KORISNIK.
         Izmereno pre popravke: grad iz kog se test pušta imao je 206 korisnika,
         203 „nova", uz prosečno zadržavanje od 12 sekundi — dok je stvarna
         publika imala 2m 56s. Na sajtu ove veličine to je bio veći deo podataka.

         Dve popravke koje ova sekcija čuva:
           · `ga-init.js` poštuje `?interno=1` i tada gasi merenje na tom uređaju;
           · sam test blokira Google-ove merne domene na nivou pregledača
             (presretanje zahteva, v. vrh fajla), pa nijedan njegov
             prolaz više ne ulazi u statistiku.
         ⚠️ Važi samo unapred — već izbrojane posete GA4 ne briše. */

      const c43 = await browser.newContext();
      const p43 = ojacajStranu(await c43.newPage());
      const stanje = async () => p43.evaluate(() => ({
        interno: window.__rimotekaInterno === true,
        prekidac: window['ga-disable-G-F88VM8CWBQ'] === true,
        gtagPostoji: typeof window.gtag === 'function'
      }));

      // podrazumevano se meri
      await p43.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(600);
      const podrazumevano = await stanje();
      ok('podrazumevano se promet BROJI (prekidač je isključen)',
         !podrazumevano.interno && !podrazumevano.prekidac, JSON.stringify(podrazumevano));
      ok('`gtag` postoji i kad se meri', podrazumevano.gtagPostoji, JSON.stringify(podrazumevano));

      // ?interno=1 gasi merenje
      await p43.goto(BASE + '/?interno=1', { waitUntil: 'domcontentloaded' });
      await pauza(600);
      const upaljeno = await stanje();
      ok('`?interno=1` gasi merenje na tom uređaju',
         upaljeno.interno && upaljeno.prekidac, JSON.stringify(upaljeno));

      // izbor se PAMTI i bez parametra u adresi
      await p43.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await pauza(600);
      const pamti = await stanje();
      ok('izbor se pamti i posle odlaska na običnu adresu',
         pamti.interno && pamti.prekidac, JSON.stringify(pamti));

      // ?interno=0 vraća merenje
      await p43.goto(BASE + '/?interno=0', { waitUntil: 'domcontentloaded' });
      await pauza(600);
      const ugaseno = await stanje();
      ok('`?interno=0` vraća merenje', !ugaseno.interno && !ugaseno.prekidac, JSON.stringify(ugaseno));
      await c43.close();

      /* Prekidač NE SME da obori stranu kad je `localStorage` zabranjen
         (privatni režim, blokirani kolačići) — tada se ponaša kao da ga nema. */
      {
        const cz = await browser.newContext();
        await cz.addInitScript(() => {
          const baci = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
          Object.defineProperty(window, 'localStorage', { get: baci, configurable: true });
        });
        const pz = ojacajStranu(await cz.newPage());
        await pz.goto(BASE + '/?interno=1', { waitUntil: 'domcontentloaded' });
        await pauza(2500);
        const zivo = await pz.evaluate(() => ({
          reci: (typeof WORDS !== 'undefined' ? WORDS.length : 0),
          gtag: typeof window.gtag === 'function'
        }));
        ok('zabranjen `localStorage` + `?interno=1` ne obara stranu',
           zivo.reci > 1000 && zivo.gtag, JSON.stringify(zivo));
        await cz.close();
      }

      /* Sam test ne sme da šalje ništa Google-u — merni domeni su blokirani na
         nivou pregledača, pa se skripta ne učita ni na jednoj strani. */
      {
        const cb = await browser.newContext();
        const pb = ojacajStranu(await cb.newPage());
        let mernihZahteva = 0;
        pb.on('request', r => {
          if (/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(r.url())) mernihZahteva++;
        });
        let stigloDoGoogla = 0;
        pb.on('response', async r => {
          if (!/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(r.url())) return;
          /* Presretnut zahtev nosi naše zaglavlje. Ako ga nema, odgovor je stigao
             SA MREŽE — dakle nešto je ipak otišlo Google-u. */
          try { if (!(await r.allHeaders())['x-blokirano-u-testu']) stigloDoGoogla++; }
          catch { stigloDoGoogla++; }
        });
        await pb.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await pauza(2500);
        ok('nijedan zahtev iz TESTA ne stigne do Google-ove analitike',
           stigloDoGoogla === 0, `pokušaja ${mernihZahteva}, uspelo ${stigloDoGoogla}`);
        await cb.close();
      }
    }

    console.log('\n44) TAMNA TEMA — pilule nemaju beo okvir (nalaz M12)');
    {
      /* Zašto ova sekcija postoji — nalaz M12, otvoren 31.07.2026.
         `.chip` ima `border:2px solid #fff`, a tamni režim je menjao samo pozadinu,
         pa je oko svake „dobre rime" stajao BEO prsten na podlozi #1e1a2e.
         Izmereno: odnos prema podlozi 15,1:1, a razdelnoj liniji treba oko 3:1 —
         pet puta jače nego što treba, pa svetli kao neon.

         Popravka je 31.07. bila upisana UNUTAR `@media(max-width:560px)`, pa je
         važila samo na telefonu — na računaru i tabletu je okvir ostao beo kroz
         TRI audita. Zato se ovde meri na obe širine, ne samo na jednoj.

         Pravilo šire od ovog nalaza: kad se nešto popravi „za telefon", proveri se
         da pravilo nije zaključano u medija-upit ako važi za sve širine. */
      for (const sirina of [390, 1440]) {
        const c44 = await browser.newContext({ viewport: { width: sirina, height: 900 } });
        await c44.addInitScript(() => localStorage.setItem('rimoteka_dark', '1'));
        const p44 = ojacajStranu(await c44.newPage());
        await p44.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await pauza(1200);
        await p44.fill('#rimeInput', 'ljubav');
        await p44.evaluate(() => document.getElementById('rimeBtn').click());
        /* Rezultati na produkciji (rečnik od 2,5 MB preko mreže) umeju da stignu posle
           1,5 s — čeka se grupa „Dobre rime" do 20 s, ne fiksno vreme. */
        await p44.waitForFunction(() => [...document.querySelectorAll('#rimeResults .res-group h2')].some(h => /^Dobre rime/.test(h.textContent.trim())), null, { timeout: 20000 }).catch(() => {});
        await pauza(300);

        const m = await p44.evaluate(() => {
          const pRGB = s => { const q = String(s).match(/rgba?\(([^)]+)\)/);
            if (!q) return null; const d = q[1].split(',').map(parseFloat);
            return { r: d[0], g: d[1], b: d[2] }; };
          const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
          const LUM = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
          const odnos = (a, b) => { const l1 = LUM(a), l2 = LUM(b);
            return Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100; };
          const grupe = [...document.querySelectorAll('#rimeResults .res-group')];
          const dobre = grupe.find(g => { const h = g.querySelector('h2');
            return h && /^Dobre rime/.test(h.textContent.trim()); });
          if (!dobre) return { nema: true };
          const cip = dobre.querySelector('.chip');
          if (!cip) return { nemaCipa: true };
          const gs = getComputedStyle(cip);
          const okvir = pRGB(gs.borderColor);
          const podloga = pRGB(getComputedStyle(document.body).backgroundColor);
          return {
            okvir: gs.borderColor,
            beo: okvir && okvir.r > 245 && okvir.g > 245 && okvir.b > 245,
            odnosPremaPodlozi: (okvir && podloga) ? odnos(okvir, podloga) : null,
            tamna: document.body.classList.contains('dark-mode')
          };
        });

        ok(`${sirina}px · tamna tema je uključena`, m.tamna === true, JSON.stringify(m));
        ok(`${sirina}px · „dobre rime" NEMAJU beo okvir`, m.beo === false, JSON.stringify(m));
        /* Granica 6 je namerno labava: razdelnoj liniji treba oko 3:1, a beo okvir
           je davao 15,1:1. Sve ispod 6 znači da prsten više ne viče. */
        ok(`${sirina}px · okvir ne blješti (odnos prema podlozi ispod 6)`,
           m.odnosPremaPodlozi !== null && m.odnosPremaPodlozi < 6,
           `odnos ${m.odnosPremaPodlozi}, boja ${m.okvir}`);
        await c44.close();
      }
    }

    console.log('\n45) SLOGOVI — veliko početno slovo broji se isto kao malo (prijava korisnika 06.09.2026)');
    {
      /* Zašto ova sekcija postoji — prijava korisnika (Dragan M.) od 06.09.2026:
         za „nepostojan" filter „1 slog" nudi „Iran", a u „2 sloga" ga nema.
         Uzrok: `countSyl` u app.js NIJE prebacivao reč u mala slova, a `VOWELS`
         sadrži samo mala — pa veliko početno A/E/I/O/U nije bilo samoglasnik.
         `vowelPositions` je istu popravku dobio 02.08. (za „Amerika"), `countSyl`
         nije. Isti kvar i u `build/gen_pages.py` (`count_syl`, `rhyme_key`…).
         Izmereno pre popravke: 155 reči rečnika počinje velikim samoglasnikom;
         146 pilula na 133 statičke strane nosilo pogrešan broj (npr. „Ilindan" 2
         umesto 3 na /rime-za/slobodan/).

         Pravilo šire od nalaza: kad se ista logika popravi u JEDNOJ funkciji,
         pretražiti sve funkcije nad istim podatkom — kvar je klasa, ne instanca.
         Ovde se proverava (a) ceo rečnik u alatu, (b) korisnikov tok, (c) statička
         strana — da Python i JS daju isti broj. */
      const c45 = await browser.newContext();
      const p45 = ojacajStranu(await c45.newPage());
      await p45.goto(BASE + '/?rec=nepostojan', { waitUntil: 'domcontentloaded' });
      await pauza(2500);

      // (a) ceo rečnik: svaka reč velikim slovom broji se kao njen mali oblik
      const recnik = await p45.evaluate(() => {
        const velike = WORDS.filter(w => /^[A-ZČĆŠĐŽ]/.test(w));
        const lose = velike.filter(w => syllables(w) !== syllables(w.toLowerCase()));
        return { velikih: velike.length, losih: lose.length, primeri: lose.slice(0, 5),
                 iran: syllables('Iran'), ana: syllables('Ana'), evropa: syllables('Evropa') };
      });
      ok('rečnik ima reči velikim slovom (test nešto proverava)', recnik.velikih > 100, `${recnik.velikih}`);
      /* 06.09.2026, odluka vlasnice: ime ne sme da stoji i malim slovom („Iran" i „iran"
         jedno do drugog među rimama). Obrisano 488 malih oblika; prave reči koje se
         samo pišu isto (rima/Rima, prag/Prag, danska/Danska) ostaju — zato prag 130. */
      const blizanci = await p45.evaluate(() => {
        const male = new Set(WORDS.filter(w => !/^[A-ZČĆŠĐŽ]/.test(w)));
        const dup = WORDS.filter(w => /^[A-ZČĆŠĐŽ]/.test(w) && male.has(w.toLowerCase()));
        return { n: dup.length, primeri: dup.slice(0, 8) };
      });
      ok('ime velikim slovom nema dvojnika malim slovom (osim pravih reči, najviše 130)',
         blizanci.n <= 130, `${blizanci.n}: ${blizanci.primeri.join(', ')}`);
      /* Učestalost se učitava u pozadini (`loadExtras`), na produkciji i po nekoliko sekundi —
         čeka se da stigne, ne fiksno vreme (na produkciji je 06.09. pala baš zbog toga). */
      await p45.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('Srbija') < 0, null, { timeout: 20000 }).catch(() => {});
      const rangImena = await p45.evaluate(() => {
        const r = RANK.get('Srbija'); return { beograd: r, negativan: typeof r === 'number' && r < 0 };
      });
      ok('„Srbija" dobija učestalost iako je u rečniku velikim slovom (RANK < 0)',
         rangImena.negativan, `RANK=${rangImena.beograd}`);
      ok('nijedna reč velikim slovom ne broji slogove drugačije od malog oblika',
         recnik.losih === 0, `${recnik.losih} od ${recnik.velikih}: ${recnik.primeri.join(', ')}`);
      ok('„Iran" = 2 sloga, „Ana" = 2, „Evropa" = 3',
         recnik.iran === 2 && recnik.ana === 2 && recnik.evropa === 3,
         `Iran ${recnik.iran}, Ana ${recnik.ana}, Evropa ${recnik.evropa}`);

      // (b) korisnikov tok: nepostojan → filter 1 → ne sme „Iran"; filter 2 → sme
      const citaj45 = () => p45.evaluate(() => [...document.querySelectorAll('#rimeResults .chip')]
        .map(c => ({ w: c.querySelector('.word')?.textContent.trim() ?? '', s: c.querySelector('.syl')?.textContent.trim() ?? '' })));
      await p45.click('#rimeSyl button[data-syl="1"]'); await pauza(700);
      const jedan = await citaj45();
      const dvaSamoglasnika = jedan.filter(x => (x.w.toLowerCase().match(/[aeiou]/g) || []).length >= 2);
      ok('„nepostojan" · filter „1 slog" daje rezultate', jedan.length > 0, `${jedan.length}`);
      ok('„nepostojan" · filter „1 slog" ne nudi „Iran"', !jedan.some(x => x.w === 'Iran'),
         jedan.filter(x => /^[AEIOU]/.test(x.w)).map(x => `${x.w}:${x.s}`).join(', '));
      ok('„nepostojan" · u „1 slog" nema reči sa dva ili više samoglasnika', dvaSamoglasnika.length === 0,
         dvaSamoglasnika.map(x => `${x.w}:${x.s}`).join(', '));
      await p45.click('#rimeSyl button[data-syl="2"]'); await pauza(700);
      const dva = await citaj45();
      ok('„nepostojan" · filter „2 sloga" — svaka pilula piše 2', dva.length > 0 && dva.every(x => x.s === '2'),
         dva.filter(x => x.s !== '2').map(x => `${x.w}:${x.s}`).join(', '));

      // (c) statička strana: broj na piluli (Python) = broj u alatu (JS)
      await p45.goto(BASE + '/rime-za/slobodan/', { waitUntil: 'domcontentloaded' });
      await pauza(2000);
      const staticka = await p45.evaluate(() => {
        const cips = [...document.querySelectorAll('.chip')].map(c => ({
          w: c.querySelector('.word')?.textContent.trim() ?? '', s: parseInt(c.querySelector('.syl')?.textContent ?? '0', 10) }))
          .filter(x => x.w);
        const lose = cips.filter(x => x.s !== syllables(x.w));
        const ilindan = cips.find(x => x.w === 'Ilindan');
        return { ukupno: cips.length, lose: lose.slice(0, 6).map(x => `${x.w}:${x.s}≠${syllables(x.w)}`), losih: lose.length, ilindan: ilindan ? ilindan.s : null };
      });
      ok('/rime-za/slobodan/ · ima pilula', staticka.ukupno > 20, `${staticka.ukupno}`);
      ok('/rime-za/slobodan/ · „Ilindan" nosi 3 sloga', staticka.ilindan === 3, `${staticka.ilindan}`);
      ok('/rime-za/slobodan/ · svaka pilula nosi isti broj slogova kao alat',
         staticka.losih === 0, `${staticka.losih}: ${staticka.lose.join(', ')}`);
      await c45.close();
    }

    console.log('\n46) „PRIJAVI GREŠKU" — dugme, prozorčić i slanje u sanduče (06.09.2026)');
    {
      /* Zašto ova sekcija postoji: 06.09.2026. korisnik je MEJLOM prijavio da „Iran" ima
         jedan slog. Tačno, i mesecima neprimećeno. Odluka vlasnice: uz svaku reč ide
         prijava na tri dodira — telefon: peto dugme u traci nad reči; računar: četvrta
         ikonica (zastavica) uz reč, pored ⓘ ♡ 🔁. Šalje se u `worker/prijave.js` (Cloudflare KV).

         Test šalje PRAVI zahtev sanduču sa `proba:true` (uređaj označen `rimoteka_interno`):
         sanduče sve proveri (poreklo, polja, razlog) i vrati ok, a ne zapiše ništa. Tako se
         proverava i CSP (`connect-src` u nginx.conf) — kad bi adresa sanduča ispala iz CSP-a,
         zahtev bi pukao u pregledaču i ova sekcija bi pala. Ne proverava se samo da dugme
         postoji nego da ceo tok radi: dugme → prozorčić → šest odgovora → slanje → „Hvala". */
      const SANDUCE = 'https://rimoteka-prijave.jovana-daskovic.workers.dev/prijava';

      // (a) telefon
      const c46 = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
      await c46.addInitScript(() => localStorage.setItem('rimoteka_interno', '1'));
      const p46 = ojacajStranu(await c46.newPage());
      const poslato = [];
      p46.on('request', r => { if (r.url() === SANDUCE && r.method() === 'POST') poslato.push(r.postDataJSON()); });
      const odgovori = [];
      p46.on('response', async r => { if (r.url() === SANDUCE && r.request().method() === 'POST') odgovori.push({ status: r.status(), telo: await r.text().catch(() => '') }); });
      await p46.goto(BASE + '/?rec=nepostojan', { waitUntil: 'domcontentloaded' });
      await p46.waitForSelector('#rimeResults .chip', { timeout: 20000 });
      await pauza(1200);
      await p46.click('#rimeSyl button[data-syl="2"]'); await pauza(500);
      const cip46 = p46.locator('#rimeResults .chip').nth(5);
      await cip46.scrollIntoViewIfNeeded(); await cip46.tap(); await pauza(500);
      const traka = await p46.evaluate(() => [...document.querySelectorAll('.chip-actions .ca-btn')].map(b => b.dataset.act));
      ok('telefon · traka nad reči ima dugme „prijavi" (peto)', traka.includes('prijavi') && traka.length === 5, traka.join(','));
      await p46.tap('.chip-actions .ca-btn[data-act="prijavi"]'); await pauza(500);
      const forma = await p46.evaluate(() => {
        const b = document.querySelector('.prijava'); if (!b) return null;
        return { sheet: b.classList.contains('sheet'), opcije: [...b.querySelectorAll('.prijava-opcija')].map(l => l.textContent.trim()),
                 naslov: (b.querySelector('.prijava-naslov') || {}).textContent || '', izabrano: (b.querySelector('input[name=prijava-razlog]:checked') || {}).value,
                 uEkranu: b.getBoundingClientRect().bottom <= window.innerHeight + 1 && b.getBoundingClientRect().top >= 0 };
      });
      ok('telefon · prozorčić se otvara odozdo', !!forma && forma.sheet === true, JSON.stringify(forma));
      ok('telefon · naslov nosi reč („Šta ne valja kod reči „…"?")', !!forma && /Šta ne valja kod reči „.+“\?/.test(forma.naslov), forma && forma.naslov);
      ok('telefon · šest odgovora, tačnim redom', !!forma && forma.opcije.length === 6
         && /^Pogrešan broj slogova \(piše \d+\)$/.test(forma.opcije[0]) && forma.opcije[1] === 'Ovo nije ispravna reč'
         && forma.opcije[2] === 'Pogrešno napisana reč' && /^Ne rimuje se sa „nepostojan“$/.test(forma.opcije[3])
         && forma.opcije[4] === 'Nije za decu' && forma.opcije[5] === 'Nešto drugo', forma && forma.opcije.join(' | '));
      ok('telefon · prvi odgovor (slogovi) je unapred izabran', !!forma && forma.izabrano === 'slogovi', forma && forma.izabrano);
      ok('telefon · ceo prozorčić je u ekranu (ne seče se)', !!forma && forma.uEkranu === true, JSON.stringify(forma));
      await p46.fill('.prijava-napomena', 'Proba iz testa — ne čuvati.');
      await p46.tap('.prijava-posalji');
      /* Sanduče na hladnom startu ume da odgovori tek posle 2–4 s — čeka se „Hvala" do 8 s,
         ne fiksne 2 s (prvi prolaz testa je pao baš na tome). */
      await p46.waitForSelector('.prijava.hvala', { timeout: 8000 }).catch(() => {});
      const posle = await p46.evaluate(() => { const b = document.querySelector('.prijava'); return b ? b.textContent.trim() : 'NEMA'; });
      ok('telefon · posle slanja piše „Hvala! Prijava za „…" je stigla."', /Hvala!.*Prijava za „.+“ je stigla/.test(posle), posle.slice(0, 120));
      ok('telefon · zahtev je stigao do sanduča i sanduče je odgovorilo 200', odgovori.length === 1 && odgovori[0].status === 200, JSON.stringify(odgovori));
      ok('telefon · zahtev nosi reč, traženu reč, broj slogova, razlog i PROBU (ništa se ne čuva)',
         poslato.length === 1 && poslato[0].rec && poslato[0].upit === 'nepostojan' && Number.isInteger(poslato[0].slogova)
         && poslato[0].razlog === 'slogovi' && poslato[0].proba === true && poslato[0].mejl === '', JSON.stringify(poslato[0] || {}));
      await p46.waitForSelector('.prijava', { state: 'detached', timeout: 5000 }).catch(() => {});
      ok('telefon · prozorčić se sam zatvara posle „Hvala"', await p46.evaluate(() => !document.querySelector('.prijava')), 'još stoji');
      await c46.close();

      // (b) računar: dugme u prozorčiću sa značenjem, prozorčić pored reči
      const c46b = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await c46b.addInitScript(() => localStorage.setItem('rimoteka_interno', '1'));
      const p46b = ojacajStranu(await c46b.newPage());
      const poslato2 = [];
      p46b.on('request', r => { if (r.url() === SANDUCE && r.method() === 'POST') poslato2.push(r.postDataJSON()); });
      await p46b.goto(BASE + '/?rec=nepostojan', { waitUntil: 'domcontentloaded' });
      await p46b.waitForSelector('#rimeResults .chip', { timeout: 20000 });
      await pauza(1200);
      /* Varijanta B (odluka vlasnice 06.09.): kapsula bez ikonica, traka na prelazak mišem. */
      const kapsule = await p46b.evaluate(() => { const c = [...document.querySelectorAll('#rimeResults .chip')];
        const vidljive = c.reduce((n, x) => n + [...x.querySelectorAll('.mini')].filter(m => m.getBoundingClientRect().width > 0).length, 0);
        const redovi = {}; c.forEach(x => { const t = Math.round(x.getBoundingClientRect().top); redovi[t] = (redovi[t] || 0) + 1; });
        const poRedu = Object.values(redovi); return { cipova: c.length, vidljiveIkonice: vidljive, poRedu: poRedu.length > 1 ? poRedu.slice(0, -1).reduce((a, b) => a + b, 0) / (poRedu.length - 1) : poRedu[0],
          legenda: (document.querySelector('.res-legend') || {}).textContent || '' }; });
      ok('računar · u kapsuli nema vidljivih ikonica (radnje su u traci)', kapsule.cipova > 0 && kapsule.vidljiveIkonice === 0, JSON.stringify(kapsule));
      ok('računar · u red stane bar 7 reči (na 1280 px; bilo 4 sa ikonicama)', kapsule.poRedu >= 7, `${kapsule.poRedu}`);
      ok('računar · legenda kaže kako se dolazi do radnji (prelazak mišem) i da klik kopira', /pređi mišem preko reči/.test(kapsule.legenda) && /kopira/.test(kapsule.legenda) && /prijavi/.test(kapsule.legenda), kapsule.legenda);
      await p46b.evaluate(() => document.querySelector('#rimeResults .chip').scrollIntoView({ block: 'center' })); await pauza(300);
      await p46b.locator('#rimeResults .chip').first().hover(); await pauza(500);
      const traka2 = await p46b.evaluate(() => { const t = document.querySelector('.chip-actions'); return t && !t.hidden ? [...t.querySelectorAll('.ca-btn')].map(b => b.dataset.act) : []; });
      ok('računar · prelazak mišem otvara traku sa pet radnji (značenje, omiljene, rime, kopiraj, prijavi)', traka2.join(',') === 'def,fav,rime,kopiraj,prijavi', traka2.join(','));
      /* LEPLJIVA traka (prijava vlasnice 06.09.): na putu do „prijavi" kursor okrzne susednu reč —
         traka NE sme da preskoči ni da nestane. Prolazak preko tri reči je ne pomera; tek
         zadržavanje na drugoj reči (350 ms) je prebacuje; izlazak iz spiska (700 ms) je zatvara. */
      const kutija = async i => await p46b.locator('#rimeResults .chip').nth(i).boundingBox();
      const stanjeTrake = () => p46b.evaluate(() => { const t = document.querySelector('.chip-actions'); return t && !t.hidden ? t.dataset.w : 'zatvorena'; });
      const k12 = await kutija(12); await p46b.mouse.move(k12.x + k12.width / 2, k12.y + k12.height / 2); await pauza(300);
      const rec12 = await stanjeTrake();
      const kTr = await p46b.locator('.chip-actions').boundingBox(); const k13 = await kutija(13);
      await p46b.mouse.move(k13.x + 10, k13.y + k13.height / 2, { steps: 4 }); await pauza(120);
      await p46b.mouse.move(kTr.x + kTr.width - 30, kTr.y + kTr.height / 2, { steps: 6 }); await pauza(300);
      const podKursorom = await p46b.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? ((el.closest('.ca-btn') || {}).dataset || {}).act || el.className : 'ništa'; }, [kTr.x + kTr.width - 30, kTr.y + kTr.height / 2]);
      ok('računar · traka ostaje na istoj reči kad kursor na putu do „prijavi" okrzne susednu reč', rec12 !== 'zatvorena' && (await stanjeTrake()) === rec12 && podKursorom === 'prijavi', `${rec12} → ${await stanjeTrake()}, pod kursorom: ${podKursorom}`);
      for (const i of [14, 15, 16]) { const k = await kutija(i); await p46b.mouse.move(k.x + k.width / 2, k.y + k.height / 2, { steps: 2 }); await pauza(90); }
      ok('računar · brz prolazak preko tri reči ne pomera traku', (await stanjeTrake()) === rec12, await stanjeTrake());
      await pauza(450);
      ok('računar · zadržavanje na drugoj reči prebacuje traku na nju', (await stanjeTrake()) !== rec12 && (await stanjeTrake()) !== 'zatvorena', await stanjeTrake());
      await p46b.mouse.move(640, 5); await pauza(900);
      ok('računar · kad kursor napusti spisak, traka se zatvori', (await stanjeTrake()) === 'zatvorena', await stanjeTrake());
      /* Reč se dovede u gornju trećinu ekrana da ISPOD nje ima mesta — tada prozorčić mora dole.
         (Kad nema mesta ni gore ni dole, prozorčić se priteže u ekran — to je druga provera.) */
      await p46b.evaluate(() => { document.querySelector('#rimeResults .chip').scrollIntoView({ block: 'start' }); window.scrollBy(0, -140); }); await pauza(300);
      await p46b.locator('#rimeResults .chip').first().hover(); await pauza(500);
      await p46b.click('.chip-actions .ca-btn[data-act="prijavi"]'); await pauza(500);
      const forma2 = await p46b.evaluate(() => { const b = document.querySelector('.prijava'); if (!b) return null; const r = b.getBoundingClientRect();
        const cip = document.querySelector('#rimeResults .chip').getBoundingClientRect();
        return { sheet: b.classList.contains('sheet'), opcije: b.querySelectorAll('.prijava-opcija').length, ispodReci: r.top > cip.bottom,
                 uEkranu: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth }; });
      ok('računar · prozorčić stoji uz reč (ne odozdo), ispod nje kad ima mesta', !!forma2 && forma2.sheet === false && forma2.opcije === 6 && forma2.ispodReci === true, JSON.stringify(forma2));
      ok('računar · prozorčić je ceo u ekranu', !!forma2 && forma2.uEkranu === true, JSON.stringify(forma2));
      await p46b.locator('.prijava-opcija').nth(1).click();
      await p46b.click('.prijava-posalji');
      await p46b.waitForSelector('.prijava.hvala', { timeout: 8000 }).catch(() => {});
      const posle2 = await p46b.evaluate(() => { const b = document.querySelector('.prijava'); return b ? b.textContent.trim() : 'NEMA'; });
      ok('računar · slanje prolazi i piše „Hvala"', /Hvala!/.test(posle2) && poslato2.length === 1 && poslato2[0].razlog === 'nije-rec' && poslato2[0].proba === true, posle2.slice(0, 80) + ' | ' + JSON.stringify(poslato2[0] || {}));
      // Escape zatvara prozorčić (bez slanja)
      await p46b.waitForSelector('.prijava', { state: 'detached', timeout: 5000 }).catch(() => {});
      await p46b.evaluate(() => { if (typeof zatvoriPrijavu === 'function') zatvoriPrijavu(); });   // da otvoren prozorčić ne presretne sledeće klikove
      // „značenje" iz trake: oblačić mora da stane UZ reč, ne u gornji levi ugao (prijava vlasnice 06.09.)
      await p46b.locator('#rimeResults .chip').nth(2).hover(); await pauza(450);
      const rimeNatpis = await p46b.evaluate(() => (document.querySelector('.chip-actions .ca-btn[data-act="rime"] .ca-txt') || {}).textContent || '');
      ok('računar · dugme za rime u traci piše „nađi rime" (kao glavno dugme), ne „rime"', rimeNatpis === 'nađi rime', rimeNatpis);
      await p46b.click('.chip-actions .ca-btn[data-act="def"]'); await pauza(1500);
      const oblacic = await p46b.evaluate(() => { const t = document.querySelector('.deftip'); const cip = [...document.querySelectorAll('#rimeResults .chip')][2].getBoundingClientRect(); const r = t.getBoundingClientRect();
        return { vidljiv: t.style.display !== 'none', razmakIspod: Math.round(r.top - cip.bottom), levo: Math.round(r.left - cip.left), top: Math.round(r.top) }; });
      ok('računar · oblačić značenja iz trake stoji odmah ispod reči (ne u uglu)', oblacic.vidljiv && oblacic.razmakIspod >= 0 && oblacic.razmakIspod <= 40 && oblacic.levo >= -20 && oblacic.levo <= 200, JSON.stringify(oblacic));
      await p46b.keyboard.press('Escape'); await p46b.mouse.click(5, 5); await pauza(300);
      await p46b.locator('#rimeResults .chip').nth(1).hover(); await pauza(450);
      await p46b.click('.chip-actions .ca-btn[data-act="prijavi"]'); await pauza(300);
      await p46b.keyboard.press('Escape'); await pauza(200);
      ok('računar · Escape zatvara prozorčić bez slanja', await p46b.evaluate(() => !document.querySelector('.prijava')) && poslato2.length === 1, `zahteva: ${poslato2.length}`);
      await c46b.close();

      // (c) sanduče odbija tuđe poreklo i nepotpunu prijavu (mimo pregledača)
      const tudje = await fetch(SANDUCE, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://zlo.example' }, body: JSON.stringify({ rec: 'x', razlog: 'drugo' }) });
      ok('sanduče · odbija zahtev sa tuđeg sajta (403)', tudje.status === 403, `${tudje.status}`);
      const nepotpuno = await fetch(SANDUCE, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://rimoteka.com' }, body: JSON.stringify({ rec: 'x', razlog: 'izmišljeno', proba: true }) });
      ok('sanduče · odbija nepoznat razlog (400)', nepotpuno.status === 400, `${nepotpuno.status}`);
      const pregled = await fetch(SANDUCE.replace('/prijava', '/prijave'));
      ok('sanduče · pregled prijava bez ključa ne otvara (403)', pregled.status === 403, `${pregled.status}`);
    }

    console.log('\n47) BANER ZA KOLAČIĆE — GA tek posle pristanka, ne blokira sajt (06.09.2026)');
    {
      /* Odluka vlasnice 06.09.2026: Google Analytics se učitava TEK POSLE pristanka.
         „Prihvati sve" jedan klik; „Podesi" otvara prekidače. Baner NE blokira sajt
         (Google kažnjava nametljive međuekrane na telefonu — vlasnica: „ne želim da
         stanem Google-u na žulj"). Svi drugi konteksti u testu kreću sa prihvaćenim
         kolačićima (v. bez-analitike.mjs); ovde se odluka briše da se baner vidi. */
      const GA = /googletagmanager\.com\/gtag\/js/;
      const svez = async (sirina, dodatno) => {
        const c = await browser.newContext({ viewport: { width: sirina, height: sirina < 600 ? 780 : 800 }, isMobile: sirina < 600, hasTouch: sirina < 600 });
        /* Briše odluku SAMO pri prvom učitavanju u kontekstu — init skripta se izvršava pri svakoj
           navigaciji, pa bi inače obrisala i odluku koju test upravo proverava posle osvežavanja. */
        await c.addInitScript(() => { try { if (!sessionStorage.getItem('t47')) { localStorage.removeItem('rimoteka_kolacici'); localStorage.removeItem('rimoteka_interno'); sessionStorage.setItem('t47', '1'); } } catch (e) {} });
        if (dodatno) await c.addInitScript(dodatno);
        const p = ojacajStranu(await c.newPage());
        const ga = []; p.on('request', r => { if (GA.test(r.url())) ga.push(r.url()); });
        return { c, p, ga };
      };
      // (a) telefon: baner se vidi, GA se NE učitava, polje za reč je slobodno
      let { c, p, ga } = await svez(390);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pauza(1500);
      const b1 = await p.evaluate(() => { const b = document.querySelector('.kolacici'); if (!b) return null; const r = b.getBoundingClientRect(); const i = document.getElementById('rimeInput').getBoundingClientRect();
        return { vidljiv: r.height > 0, naslov: (b.querySelector('.kolacici-naslov') || {}).textContent, dugmad: [...b.querySelectorAll('.kolacici-dugmad button')].map(x => x.textContent.trim()), podesiSkriveno: b.querySelector('.kolacici-podesi').hidden,
          neZaklanjaPolje: r.top > i.bottom, gaSkripta: !!document.querySelector('script[src*="googletagmanager"]'), visinaBanera: Math.round(r.height), ekran: window.innerHeight }; });
      ok('telefon · baner se vidi, sa „Prihvati sve" i „Podesi"', !!b1 && b1.vidljiv && b1.dugmad.join('|') === 'Prihvati sve|Podesi', JSON.stringify(b1));
      ok('telefon · baner ne zaklanja polje za reč (ne blokira sajt)', !!b1 && b1.neZaklanjaPolje === true && b1.visinaBanera < b1.ekran * 0.5, JSON.stringify(b1));
      ok('telefon · bez pristanka GA se NE učitava (ni skripta ni zahtev)', !!b1 && b1.gaSkripta === false && ga.length === 0, `skripta ${b1 && b1.gaSkripta}, zahteva ${ga.length}`);
      await p.fill('#rimeInput', 'ljubav'); await p.evaluate(() => document.getElementById('rimeBtn').click());
      await p.waitForFunction(() => document.querySelectorAll('#rimeResults .chip').length > 5, null, { timeout: 30000 }).catch(() => {});
      ok('telefon · alat radi i dok baner stoji', (await p.locator('#rimeResults .chip').count()) > 5);
      await p.tap('.kolacici-prihvati'); await pauza(1200);
      const b2 = await p.evaluate(() => ({ baner: !!document.querySelector('.kolacici'), odluka: localStorage.getItem('rimoteka_kolacici'), gaSkripta: !!document.querySelector('script[src*="googletagmanager"]') }));
      ok('telefon · „Prihvati sve" sakrije baner, upiše odluku i učita GA', !b2.baner && /"analitika":true/.test(b2.odluka || '') && b2.gaSkripta && ga.length >= 1, JSON.stringify(b2) + ` zahteva ${ga.length}`);
      await p.reload({ waitUntil: 'domcontentloaded' }); await pauza(1200);
      ok('telefon · posle osvežavanja baner se ne vraća, GA se učitava', await p.evaluate(() => !document.querySelector('.kolacici') && !!document.querySelector('script[src*="googletagmanager"]')));
      await c.close();
      // (b) računar: „Podesi" → prekidač isključen → „Sačuvaj" → bez GA, baner nestaje; futer „Kolačići" vraća baner
      ({ c, p, ga } = await svez(1280));
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pauza(1500);
      await p.click('.kolacici-podesi-btn'); await pauza(200);
      const b3 = await p.evaluate(() => { const pd = document.querySelector('.kolacici-podesi'); return { otvoreno: !pd.hidden, redova: pd.querySelectorAll('.kolacici-red').length, neophodno: pd.querySelector('input[name=neophodno]').checked && pd.querySelector('input[name=neophodno]').disabled, analitika: pd.querySelector('input[name=analitika]').checked }; });
      ok('računar · „Podesi" otvara dva reda: neophodno (zaključano, uključeno) i merenje (isključeno)', b3.otvoreno && b3.redova === 2 && b3.neophodno === true && b3.analitika === false, JSON.stringify(b3));
      await p.click('.kolacici-sacuvaj'); await pauza(800);
      const b4 = await p.evaluate(() => ({ baner: !!document.querySelector('.kolacici'), odluka: localStorage.getItem('rimoteka_kolacici'), gaSkripta: !!document.querySelector('script[src*="googletagmanager"]') }));
      ok('računar · „Sačuvaj" sa isključenim merenjem: baner nestaje, odluka „ne", GA se NE učitava', !b4.baner && /"analitika":false/.test(b4.odluka || '') && !b4.gaSkripta && ga.length === 0, JSON.stringify(b4) + ` zahteva ${ga.length}`);
      await p.evaluate(() => document.querySelector('.futer-kolacici').scrollIntoView()); await p.click('.futer-kolacici'); await pauza(300);
      ok('računar · link „Kolačići" u futeru ponovo otvara baner sa podešavanjem', await p.evaluate(() => { const b = document.querySelector('.kolacici'); return !!b && !b.querySelector('.kolacici-podesi').hidden; }));
      await c.close();
      // (c) ćirilica: tekst banera je na ćirilici
      ({ c, p, ga } = await svez(1280, () => { try { localStorage.setItem('rimoteka_script', 'cyr'); } catch (e) {} }));
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pauza(1500);
      const b5 = await p.evaluate(() => ({ naslov: (document.querySelector('.kolacici-naslov') || {}).textContent || '', dugme: (document.querySelector('.kolacici-prihvati') || {}).textContent || '', tekst: (document.querySelector('.kolacici-tekst') || {}).textContent || '' }));
      ok('ćirilica · baner je na ćirilici („Колачићи на Римотеци", „Прихвати све")', b5.naslov === 'Колачићи на Римотеци' && b5.dugme === 'Прихвати све', JSON.stringify(b5));
      ok('ćirilica · ime brenda „Google Analytics" ostaje latinicom', /Google Analytics/.test(b5.tekst) && !/Гоогле/.test(b5.tekst), b5.tekst.slice(0, 60));
      await c.close();
      // (d) ?interno=1: bez banera i bez GA
      ({ c, p, ga } = await svez(1280));
      await p.goto(BASE + '/?interno=1', { waitUntil: 'domcontentloaded' }); await pauza(1500);
      ok('interno · sa ?interno=1 nema banera i nema GA', await p.evaluate(() => !document.querySelector('.kolacici') && !document.querySelector('script[src*="googletagmanager"]')) && ga.length === 0, `zahteva ${ga.length}`);
      await c.close();
    }

    console.log('\n48) SITEMAP lastmod PRATI SADRŽAJ STRANE (nalaz S8, 06.09.2026)');
    if (LOKALNO) {
      /* Do 06.09.2026 je svaka adresa u sitemapu nosila lastmod = datum gradnje, pa je
         Google svaki put video „sve se promenilo" i prestao da veruje (GSC: statičke
         strane „Discovered – not indexed"). Sada `build/strane-otisci.json` čuva otisak
         svake strane; lastmod se menja samo kad se otisak promeni. Ovde: mapa postoji,
         pokriva sve adrese iz sitemapa, i sitemap nosi baš te datume. Samo lokalno —
         produkcija ne servira `build/`. */
      const fs = await import('node:fs');
      const otisci = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'strane-otisci.json'), 'utf8'));
      const sm = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
      const unosi = [...sm.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map(m => ({ url: m[1], lastmod: m[2] }));
      const bezOtiska = unosi.filter(u => !otisci[u.url]);
      const drugiDatum = unosi.filter(u => otisci[u.url] && otisci[u.url].lastmod !== u.lastmod);
      ok('sitemap ima unose sa lastmod-om', unosi.length > 1000, `${unosi.length}`);
      ok('svaka adresa iz sitemapa ima otisak u build/strane-otisci.json', bezOtiska.length === 0, bezOtiska.slice(0, 3).map(u => u.url).join(', '));
      ok('lastmod u sitemapu je onaj iz mape otisaka (ne datum gradnje)', drugiDatum.length === 0, drugiDatum.slice(0, 3).map(u => `${u.url} ${u.lastmod}≠${otisci[u.url].lastmod}`).join(', '));
    } else {
      console.log('  (preskočeno na produkciji — mapa otisaka je u build/, ne na sajtu)');
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
