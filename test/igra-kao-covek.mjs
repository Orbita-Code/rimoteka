/* IGRA RIMOVANJA – PARTIJE SA 2–3 IGRAČA, ODGOVORI KAO ČOVEK (zahtev vlasnice 08.09.2026).
 *
 * Proverava ono što `igra-100-partija.mjs` ne dodiruje:
 *  - odgovor je reč koju bi čovek dao: NAJČEŠĆA savršena rima (po učestalosti), ne prva po abecedi;
 *    povremeno pogrešna reč, VARKA (isto poslednje slovo, a nije rima), rečca od 2 slova, ćirilični unos,
 *    veliko slovo i razmak;
 *  - BODOVI potez po potezu: poruka „+N" mora biti 10 + preostale sekunde + min(50, niz×5), i zbir igrača
 *    mora da poraste tačno za N;
 *  - PRELAZ SA IGRAČA NA IGRAČA: ekran predaje se vidi, broj sledećeg igrača tačan, sažetak prethodnog
 *    tačan (bodovi, tačnih od), tajmer STOJI dok se ne klikne, niz se resetuje, posle klika „Igrač: 2" i „1/5";
 *  - REZULTATI: svi igrači, opadajuće po bodovima, pehar prvom, nerešeno se vidi, bez engleskih reči;
 *  - REČI KOJE IGRA ZADAJE su iz spiska `igra-reci.json` (imenice/glagoli/pridevi, 2–4 sloga);
 *  - REŽIM „TRI RIME" (svaka treća partija): 1/3, 2/3 ne troše zadatak, ista rima se odbija, pogrešna seče niz
 *    a tajmer teče, treća završava reč; ODGOVOR GLASOM (lažno prepoznavanje) priznaje rimu iz rečenice;
 *    bez prepoznavanja govora dugme mikrofona je sakriveno.
 * Izlaz: AUDIT/analiza/igra-kao-covek.md (+ .json). Pokretanje: node test/igra-kao-covek.mjs
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://localhost:8765';
const PARTIJA = Number(process.env.PARTIJA || 12);
const T = 10, WPP = 5;

const b = await chromium.launch();
const nalazi = []; const dnevnik = []; const zadate = [];
let konzola = []; let glasom = 0, triRime = 0, varki = 0, recca = 0;
const N = (g, extra) => nalazi.push(Object.assign({ partija: g }, extra));

for (let g = 0; g < PARTIJA; g++) {
  const igraci = 2 + (g % 2);                 // 2, 3, 2, 3 …
  const cir = g % 4 === 3;                    // svaka četvrta partija u ćirilici
  const bezGlasa = g % 4 === 2;               // pregledač bez prepoznavanja govora
  const mod = g % 3 === 2 ? 3 : 1;            // svaka treća partija: tri rime po reči
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await c.addInitScript(({ cir, bezGlasa }) => {
    localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true }));
    if (cir) localStorage.setItem('rimoteka_script', 'cyr');
    if (bezGlasa) { try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true }); Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true }); } catch (e) {} }
    else { window.SpeechRecognition = class { start() { setTimeout(() => { this.onstart && this.onstart(); this.onresult && this.onresult({ results: [[{ transcript: window.__glas || '' }]] }); this.onend && this.onend(); }, 60); } stop() {} }; try { Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true }); } catch (e) {} }
  }, { cir, bezGlasa });
  const p = await c.newPage();
  p.on('console', m => { if (m.type() === 'error') konzola.push(`p${g}: ` + m.text().slice(0, 160)); }); p.on('pageerror', e => konzola.push(`p${g} pageerror: ` + e.message.slice(0, 160)));
  await p.goto(BASE + '/igra-rimovanja/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 });
  await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('ljubav') < 0 && JEKAVSKI.size > 0, null, { timeout: 60000 }).catch(() => N(g, { greska: 'učestalost/ijekavski spisak nisu stigli' }));
  const mic = await p.evaluate(() => document.getElementById('gameMic') && document.getElementById('gameMic').hidden);
  if (bezGlasa && mic !== true) N(g, { greska: 'bez prepoznavanja govora dugme mikrofona se vidi' });
  if (!bezGlasa && mic !== false) N(g, { greska: 'sa prepoznavanjem govora dugme mikrofona je sakriveno' });
  await p.evaluate(({ igraci, T, WPP, mod }) => {
    const kl = (id, v) => document.querySelectorAll(`#${id} .game-option`).forEach(b => { if (b.dataset.value === String(v)) b.click(); });
    kl('gamePlayers', igraci); kl('gameWords', WPP); kl('gameTime', T); kl('gameRima', mod);
  }, { igraci, T, WPP, mod });
  await p.tap('#gameStart').catch(async () => { await p.evaluate(() => document.getElementById('gameStart').click()); });
  await p.waitForFunction(() => document.getElementById('gamePlay').style.display === 'block' && gameCurrentWord && document.getElementById('gameWord').textContent !== '...', null, { timeout: 10000 }).catch(() => N(g, { greska: 'igra nije počela' }));
  const spisak = await p.evaluate(() => Array.isArray(IGRA_RECI) ? IGRA_RECI.length : 0);
  if (spisak < 500) N(g, { greska: `spisak reči za igru nije učitan (${spisak})` });
  const ocekivano = Array.from({ length: igraci }, () => ({ score: 0, correct: 0 }));
  let potez = 0;

  // pošalje unos i vrati stanje posle njega
  const posalji = async (unos, glasom) => {
    if (glasom) { await p.evaluate((u) => { window.__glas = 'rima je ' + u; document.getElementById('gameMic').click(); }, unos); await new Promise(r => setTimeout(r, 350)); }
    else { await p.fill('#gameInput', unos); await p.evaluate(() => document.getElementById('gameSubmit').click()); await new Promise(r => setTimeout(r, 200)); }
    return p.evaluate(() => ({ t: document.getElementById('gameFeedback').textContent, k: document.getElementById('gameFeedback').className, score: gamePlayersData[gameCurrentPlayerIdx].score, combo: gameCombo, badge: document.getElementById('gameComboBadge').hidden ? '' : document.getElementById('gameComboBadge').textContent, idx: gameCurrentWordIdx, dugme: document.getElementById('gameSubmit').disabled, nadjene: (typeof gameNadjene !== 'undefined' ? gameNadjene.length : 0) }));
  };
  const stanjePre = () => p.evaluate(() => ({ t: gameTimeLeft, score: gamePlayersData[gameCurrentPlayerIdx].score, combo: gameCombo, idx: gameCurrentWordIdx }));

  for (let pl = 0; pl < igraci; pl++) {
    let niz = 0;
    for (let i = 0; i < WPP; i++) {
      const st = await p.evaluate(() => ({ rec: gameCurrentWord, prikaz: document.getElementById('gameWord').textContent, igrac: document.getElementById('gameCurrentPlayer').textContent, brojac: document.getElementById('gameWordCount').textContent, script, uSpisku: Array.isArray(IGRA_RECI) ? IGRA_RECI.includes(gameCurrentWord) : null, slog: syllables(gameCurrentWord), uputstvo: document.querySelector('#gamePlay .game-instruction').textContent }));
      if (!st.rec) { N(g, { igrac: pl + 1, potez: i, greska: 'nema reči' }); break; }
      zadate.push(st.rec);
      if (st.uSpisku === false) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: 'zadata reč nije iz spiska igra-reci.json' });
      if (st.slog < 2 || st.slog > 4) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `zadata reč ima ${st.slog} slogova (dozvoljeno 2–4)` });
      if (+st.igrac !== pl + 1) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `na ekranu piše „Igrač: ${st.igrac}"` });
      if (st.brojac !== `${i + 1}/${WPP}`) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `brojač reči „${st.brojac}", treba ${i + 1}/${WPP}` });
      if (st.script === 'cyr' && /[a-zčćžšđ]/i.test(st.prikaz)) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `zadata reč latinicom u ćirilici: „${st.prikaz}"` });
      if (mod === 3 && !/tri rime|три риме/.test(st.uputstvo)) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `uputstvo u režimu tri rime: „${st.uputstvo}"` });
      if (mod === 1 && /tri rime|три риме/.test(st.uputstvo)) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `uputstvo u običnom režimu: „${st.uputstvo}"` });

      // kandidati kao što bi čovek birao: najčešće savršene rime, pa završni slog; varka; pogrešna
      const k = await p.evaluate((w) => {
        const key = rhymeKey(w), lk = finalSylKey(w), lo = looseKey(w), male = w.toLowerCase();
        const sav = [], sir = []; let protiv = null, protivR = Infinity, varka = null, varkaR = Infinity;
        for (let i = 0; i < jekStart; i++) {
          const x = WORDS[i]; if (MALE[i] === male || x.length < 3 || BLOCKED.has(MALE[i]) || /[A-ZČĆŽŠĐ]/.test(x[0])) continue;
          const r = RANK.get(x); if (r === undefined || r >= 0) continue;
          if (KEYS[i] === key) sav.push([r, x]);
          else if (finalSylKey(x) === lk) sir.push([r, x]);
          else if (looseKey(x) === lo) { if (x.length >= 4 && r < varkaR) { varkaR = r; varka = x; } }
          else if (x.length >= 4 && r < protivR) { protivR = r; protiv = x; }
        }
        sav.sort((a, b) => a[0] - b[0]); sir.sort((a, b) => a[0] - b[0]);
        const kratka = ['je', 'ma', 'da', 'se', 'ne', 'ti', 'mi', 'su', 'li', 'ga', 'na', 'te', 'to', 'ko'].find(x => finalSylKey(x) === lk || rhymeKey(x) === key) || null;
        return { rime: sav.map(a => a[1]).slice(0, 5), sire: sir.map(a => a[1]).slice(0, 5), protiv, varka, kratka };
      }, st.rec);
      const dobre = [...k.rime, ...k.sire];
      const vrsta = potez % 5 === 4 ? 'pogresna' : 'tacna';

      // (a) rečca od 2 slova – PRE pravog odgovora (posle njega je dugme ugašeno)
      if (potez % 11 === 10 && k.kratka) { recca++; const fk = await posalji(k.kratka, false); if (!/hint/.test(fk.k)) N(g, { igrac: pl + 1, potez: i, rec: st.rec, odgovor: k.kratka, greska: `rečca od 2 slova „${k.kratka}" nije odbijena (${fk.k})` }); }

      if (vrsta === 'pogresna') {
        const unos = k.varka || k.protiv || 'kuća'; const tip = k.varka ? 'varka-isto-slovo' : 'pogresna'; if (k.varka) varki++;
        const pre = await stanjePre(); const fb = await posalji(unos, false);
        dnevnik.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos, tip, ishod: fb.k.replace('game-feedback', '').trim(), poruka: fb.t.slice(0, 80), sek: pre.t });
        if (/correct/.test(fb.k)) N(g, { igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos, greska: `reč koja se ne rimuje priznata kao tačna (${tip})` });
        if (fb.score !== pre.score) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: 'bodovi se menjaju posle pogrešnog odgovora' });
        if (fb.badge) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: 'oznaka niza ostala posle greške' });
        niz = 0;
        if (mod === 3) {
          // pogrešna u režimu tri rime ne troši zadatak – tajmer teče, dugme radi; reč se završava sa 3 rime
          if (fb.idx !== pre.idx || fb.dugme) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: 'u režimu tri rime pogrešna reč je završila zadatak' });
          if (dobre.length < 3) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `zadata reč ima samo ${dobre.length} poznate rime – nerešiva u režimu tri rime` });
          for (let r = 0; r < 3 && r < dobre.length; r++) { const pre2 = await stanjePre(); const f2 = await posalji(dobre[r], false); if (/correct/.test(f2.k)) { niz++; const n = +((f2.t.match(/\+(\d+)/) || [])[1]); ocekivano[pl].score += n; } }
          if (dobre.length >= 3) ocekivano[pl].correct++;
        }
      } else {
        if (mod === 3) {
          triRime++;
          if (dobre.length < 3) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `zadata reč ima samo ${dobre.length} poznate rime – nerešiva u režimu tri rime` });
          const tri = dobre.slice(0, 3);
          if (!tri.length) { N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: 'nijedna poznata rima' }); }
          for (let r = 0; r < tri.length; r++) {
            const glas = potez % 4 === 1 && !bezGlasa && r === 1;
            const pre = await stanjePre(); const fb = await posalji(tri[r], glas); if (glas) glasom++;
            const tacno = /correct/.test(fb.k);
            dnevnik.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: tri[r], tip: (r < k.rime.length ? 'savrsena' : 'siroka') + (glas ? '+glas' : ''), ishod: fb.k.replace('game-feedback', '').trim(), poruka: fb.t.slice(0, 80), sek: pre.t });
            if (!tacno) { N(g, { igrac: pl + 1, potez: i, rec: st.rec, odgovor: tri[r], greska: `rima ${r + 1}/3 „${tri[r]}"${glas ? ' (glasom)' : ''} nije priznata: „${fb.t.slice(0, 60)}"` }); continue; }
            niz++;
            const n = +((fb.t.match(/\+(\d+)/) || [])[1]); const ocek = 10 + pre.t + Math.min(50, niz * 5);
            if (n !== ocek && n !== ocek - 1) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `poruka kaže +${n}, formula (10 + ${pre.t} s + niz ${niz}×5) daje ${ocek}` });
            if (fb.score - pre.score !== n) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `zbir porastao za ${fb.score - pre.score}, a poruka kaže +${n}` });
            ocekivano[pl].score += n;
            if (r < 2) {
              if (!new RegExp(`${r + 1}/3`).test(fb.t)) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `posle ${r + 1}. rime poruka „${fb.t.slice(0, 40)}" ne kaže ${r + 1}/3` });
              if (fb.idx !== pre.idx || fb.dugme) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `posle ${r + 1}. rime zadatak je završen pre treće` });
              if (r === 0) { const d = await posalji(tri[0], false); if (!/hint/.test(d.k) || d.score !== fb.score) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `ista rima drugi put: „${d.t.slice(0, 40)}" (${d.k})` }); }
            } else {
              if (!/3\/3/.test(fb.t) || fb.idx !== pre.idx + 1) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `posle 3. rime: „${fb.t.slice(0, 40)}", idx ${pre.idx}→${fb.idx}` });
              ocekivano[pl].correct++;
            }
          }
        } else {
          const odg = k.rime[0] || k.sire[0]; const tip = k.rime[0] ? 'savrsena' : 'siroka';
          if (!odg) { N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: 'čovek ne bi našao poznatu rimu (nijedna sa učestalošću)' }); }
          let unos = odg || 'kuća';
          const glas = potez % 4 === 1 && !bezGlasa;
          const oblik = glas ? 'glas' : potez % 9 === 8 ? 'cir' : potez % 7 === 6 ? 'veliko' : 'obicno';
          if (oblik === 'cir') unos = await p.evaluate((u) => toCyr(u), unos);
          if (oblik === 'veliko') unos = ' ' + unos[0].toUpperCase() + unos.slice(1) + ' ';
          await new Promise(r => setTimeout(r, 300 + ((potez * 3 + g * 7 + pl * 2) % 6) * 400));   // čovek razmišlja 0,3–2,3 s
          const pre = await stanjePre(); const fb = await posalji(unos, glas); if (glas) glasom++;
          const tacno = /correct/.test(fb.k);
          dnevnik.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos.trim(), tip: tip + (glas ? '+glas' : ''), ishod: fb.k.replace('game-feedback', '').trim(), poruka: fb.t.slice(0, 80), sek: pre.t });
          if (!tacno) N(g, { igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos, greska: `${tip} rima „${unos.trim()}" (${oblik}) nije priznata: „${fb.t.slice(0, 70)}"` });
          if (tacno) {
            niz++;
            const n = +((fb.t.match(/\+(\d+)/) || [])[1]); const ocek = 10 + pre.t + Math.min(50, niz * 5);
            if (n !== ocek && n !== ocek - 1) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `poruka kaže +${n}, formula (10 + ${pre.t} s + niz ${niz}×5) daje ${ocek}` });
            if (fb.score - pre.score !== n) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `zbir porastao za ${fb.score - pre.score}, a poruka kaže +${n}` });
            if (niz >= 2 && !fb.badge) N(g, { igrac: pl + 1, potez: i, rec: st.rec, greska: `niz ${niz}, a oznaka niza se ne vidi` });
            ocekivano[pl].score += n; ocekivano[pl].correct++;
          } else niz = 0;
        }
      }
      potez++;
      await p.waitForFunction(({ i }) => gameState !== 'play' || (gameCurrentWordIdx === i + 1 && !document.getElementById('gameSubmit').disabled), { i }, { timeout: 5000 }).catch(() => {});
    }
    // --- PRELAZ NA SLEDEĆEG IGRAČA ---
    if (pl < igraci - 1) {
      await p.waitForFunction(() => gameState === 'handoff', null, { timeout: 5000 }).catch(() => N(g, { igrac: pl + 1, greska: 'posle poslednje reči nema ekrana predaje' }));
      const h = await p.evaluate(() => ({ st: gameState, vidi: document.getElementById('gameHandoff').style.display, play: document.getElementById('gamePlay').style.display, badge: document.getElementById('gameHandoffBadge').textContent, naslov: document.getElementById('gameHandoffTitle').textContent, sub: document.getElementById('gameHandoffSub').textContent, tajmer: document.getElementById('gameTimer').textContent, pi: gameCurrentPlayerIdx, combo: gameCombo, badgeVidi: !document.getElementById('gameComboBadge').hidden }));
      await new Promise(r => setTimeout(r, 1300));
      const h2 = await p.evaluate(() => ({ tajmer: document.getElementById('gameTimer').textContent, st: gameState, pi: gameCurrentPlayerIdx }));
      if (h.st === 'handoff') {
        if (h.vidi !== 'block' || h.play !== 'none') N(g, { igrac: pl + 1, greska: `ekran predaje: handoff=${h.vidi}, play=${h.play}` });
        if (h.badge !== String(pl + 2)) N(g, { igrac: pl + 1, greska: `značka predaje „${h.badge}", treba ${pl + 2}` });
        if (!h.naslov.includes(String(pl + 2))) N(g, { igrac: pl + 1, greska: `naslov predaje „${h.naslov}" bez broja ${pl + 2}` });
        const o = ocekivano[pl];
        if (!h.sub.includes(String(o.score)) || !h.sub.includes(`${o.correct} `)) N(g, { igrac: pl + 1, greska: `sažetak „${h.sub}" ne slaže se sa ${o.score} bodova / ${o.correct} tačnih` });
        if (h2.st !== 'handoff' || h2.pi !== h.pi || h2.tajmer !== h.tajmer) N(g, { igrac: pl + 1, greska: `tajmer ili igra idu dalje dok se čeka predaja (${h.tajmer}→${h2.tajmer}, ${h.st}→${h2.st})` });
        if (h.combo !== 0 || h.badgeVidi) N(g, { igrac: pl + 1, greska: `niz prethodnog igrača (${h.combo}) prenet na sledećeg` });
        if (/[a-zčćžšđ]/i.test(h.naslov + h.sub) && cir) N(g, { igrac: pl + 1, greska: `ekran predaje latinicom u ćirilici: „${(h.naslov + ' ' + h.sub).slice(0, 60)}"` });
        await p.tap('#gameHandoffStart').catch(async () => { await p.evaluate(() => document.getElementById('gameHandoffStart').click()); });
        await p.waitForFunction(() => gameState === 'play' && gameCurrentWord && document.getElementById('gameWord').textContent !== '...', null, { timeout: 5000 }).catch(() => N(g, { igrac: pl + 2, greska: 'posle „Spreman sam" igra ne kreće' }));
        const s2 = await p.evaluate(() => ({ igrac: document.getElementById('gameCurrentPlayer').textContent, brojac: document.getElementById('gameWordCount').textContent, tajmer: +document.getElementById('gameTimer').textContent }));
        if (+s2.igrac !== pl + 2 || s2.brojac !== `1/${WPP}`) N(g, { igrac: pl + 2, greska: `posle predaje piše Igrač ${s2.igrac}, reč ${s2.brojac}` });
        if (s2.tajmer < T - 1) N(g, { igrac: pl + 2, greska: `tajmer novog igrača počeo od ${s2.tajmer}` });
      }
    }
  }
  // --- REZULTATI ---
  await p.waitForFunction(() => gameState === 'results', null, { timeout: 8000 }).catch(() => N(g, { greska: 'rezultati se nisu pojavili' }));
  const r = await p.evaluate(() => ({ stavke: [...document.querySelectorAll('#gameResultsList .game-result-item')].map(e => ({ tekst: e.textContent.replace(/\s+/g, ' ').trim(), pobednik: e.classList.contains('winner'), score: +e.querySelector('.game-result-score').textContent })), sve: document.getElementById('gameResultsList').textContent.replace(/\s+/g, ' '), data: gamePlayersData.map(p => ({ score: p.score, correct: p.correct, wrong: p.wrong })) }));
  if (r.stavke.length !== igraci) N(g, { greska: `rezultati prikazuju ${r.stavke.length} igrača od ${igraci}` });
  for (let q = 1; q < r.stavke.length; q++) if (r.stavke[q].score > r.stavke[q - 1].score) N(g, { greska: 'rezultati nisu opadajuće po bodovima' });
  for (let q = 0; q < igraci; q++) if (r.data[q].score !== ocekivano[q].score || r.data[q].correct !== ocekivano[q].correct) N(g, { greska: `igrač ${q + 1}: igra ima ${r.data[q].score}/${r.data[q].correct} tačnih, prebrojano ${ocekivano[q].score}/${ocekivano[q].correct}` });
  if (r.stavke.length >= 2 && r.stavke[0].score === r.stavke[1].score && !(/Nerešeno|Нерешено/.test(r.sve) && r.stavke[0].pobednik && r.stavke[1].pobednik)) N(g, { greska: `NEREŠENO (${r.stavke[0].score}:${r.stavke[1].score}) prikazano kao pobeda: „${r.stavke[0].tekst}"`, vrsta: 'sadržaj' });
  if (r.stavke.length >= 2 && r.stavke[0].score !== r.stavke[1].score && r.stavke[1].pobednik) N(g, { greska: 'drugi po bodovima označen kao pobednik' });
  if (/combo/i.test(r.sve)) N(g, { greska: `engleska reč na ekranu rezultata: „${r.sve.match(/\S*combo\S*/i)[0]}"`, vrsta: 'sadržaj' });
  if (cir && /[a-zčćžšđ]/.test(r.sve)) N(g, { greska: `rezultati latinicom u ćirilici: „${r.sve.slice(0, 80)}"`, vrsta: 'sadržaj' });
  if (!r.stavke[0] || !r.stavke[0].pobednik) N(g, { greska: 'prvi u rezultatima nije označen kao pobednik' });
  const najb = r.data.reduce((a, x) => Math.max(a, x.correct), 0);
  if (najb === WPP && !/Sve tačno|Све тачно/.test(r.sve)) N(g, { greska: 'neko ima sve tačno, a dostignuće „Sve tačno" se ne vidi' });
  await c.close();
  process.stderr.write(`\rpartija ${g + 1}/${PARTIJA} (${igraci} igrača${cir ? ', ćirilica' : ''}${mod === 3 ? ', tri rime' : ''}${bezGlasa ? ', bez glasa' : ''}), nalaza ${nalazi.length}`);
}
await b.close();
const jedinstveni = [...new Set(nalazi.map(n => n.greska.replace(/\d+/g, 'N').slice(0, 60)))];
mkdirSync(path.join(ROOT, 'AUDIT', 'analiza'), { recursive: true });
const md = [`# Igra rimovanja – ${PARTIJA} partija sa 2–3 igrača, odgovori kao čovek (${new Date().toISOString().slice(0, 10)}, ${BASE})`, '',
  `Poteza ${dnevnik.length} · tačnih ${dnevnik.filter(d => d.ishod === 'correct').length} · glasom ${glasom} · reči u režimu tri rime ${triRime} · varki ${varki} · rečca ${recca} · zadatih reči ${zadate.length} (jedinstvenih ${new Set(zadate).size}) · greške u konzoli ${konzola.length} · **nalaza ${nalazi.length}** (vrsta: ${jedinstveni.length})`, '',
  '## Nalazi', '', '| partija | igrač | potez | reč | šta ne valja |', '|---|---|---|---|---|', ...nalazi.map(n => `| ${n.partija} | ${n.igrac ?? ''} | ${n.potez ?? ''} | ${n.rec || ''} | ${n.greska} |`), '',
  '## Zadate reči (šta bi dete dobilo)', '', zadate.join(', '), '',
  '## Dnevnik poteza (prvih 80)', '', '| partija | igrač | reč | odgovor | vrsta | ishod | sek | poruka |', '|---|---|---|---|---|---|---|---|', ...dnevnik.slice(0, 80).map(d => `| ${d.partija} | ${d.igrac} | ${d.rec} | ${d.odgovor} | ${d.tip} | ${d.ishod} | ${d.sek} | ${d.poruka} |`), '',
  ...(konzola.length ? ['## Konzola', ...konzola.slice(0, 20).map(k => '- ' + k)] : [])];
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-kao-covek.md'), md.join('\n') + '\n');
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-kao-covek.json'), JSON.stringify({ nalazi, dnevnik, zadate, konzola }, null, 1));
console.log(`\npartija ${PARTIJA} · poteza ${dnevnik.length} · glasom ${glasom} · tri rime ${triRime} · nalaza ${nalazi.length} · konzola ${konzola.length}`);
for (const n of nalazi.slice(0, 30)) console.log('  ', JSON.stringify(n));
process.exit(nalazi.length || konzola.length ? 1 : 0);
