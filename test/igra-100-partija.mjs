/* IGRA RIMOVANJA — 100 PARTIJA KAO DETE KOJE IGRA (zahtev vlasnice 08.09.2026).
 *
 * Na telefonu (390×844, dodir), po 33–34 partije sa 10, 15 i 20 sekundi po reči, 1 igrač, 5 reči (5 s ne postoji u igri).
 * U svakoj partiji naizmenično: TAČNA rima (reč iz rečnika sa istim ključem rime), POGREŠNA reč
 * (postoji, ne rimuje se), NEPOSTOJEĆA reč, ISTA reč, i jedno puštanje da vreme istekne.
 * Za svaki potez se beleži šta je igra rekla i da li je to tačno. Na kraju: rezultat mora da se
 * slaže sa zbirom tačnih, tajmer mora da stigne do 0 kad se ne odgovori, nijedna greška u konzoli,
 * i svaka ponuđena reč mora da ima bar jednu rimu u rečniku (inače je nerešiva).
 *
 * Izlaz: AUDIT/analiza/igra-100-partija.md + .json. Pokretanje: node test/igra-100-partija.mjs
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://localhost:8765';
const PARTIJA = Number(process.env.PARTIJA || 100);

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await c.addInitScript(() => { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); });
const p = await c.newPage();
const konzola = []; p.on('console', m => { if (m.type() === 'error') konzola.push(m.text().slice(0, 160)); }); p.on('pageerror', e => konzola.push('pageerror: ' + e.message.slice(0, 160)));
await p.goto(BASE + '/igra-rimovanja/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 });
await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('ljubav') < 0, null, { timeout: 30000 }).catch(() => {});

const nalazi = []; const potezi = { tacna: 0, pogresna: 0, nepostojeca: 0, ista: 0, istek: 0 };
const vremena = [10, 15, 20];   // igra nema 5 s (nudi 10/15/20/30) – vlasnica pitana da li da se doda
for (let g = 0; g < PARTIJA; g++) {
  const t = vremena[g % 3];
  await p.evaluate((t) => { document.querySelectorAll('#gameTime .game-option').forEach(b => { if (+b.dataset.value === t) b.click(); }); document.querySelectorAll('#gameWords .game-option').forEach(b => { if (+b.dataset.value === 5) b.click(); }); document.querySelectorAll('#gamePlayers .game-option').forEach(b => { if (+b.dataset.value === 1) b.click(); }); }, t);
  const izabrano = await p.evaluate(() => +((document.querySelector('#gameTime .game-option.active') || {}).dataset || {}).value);
  if (izabrano !== t) nalazi.push({ partija: g, greska: `opcija ${t} s se nije izabrala (aktivno ${izabrano})` });
  await p.tap('#gameStart').catch(async () => { await p.evaluate(() => document.getElementById('gameStart').click()); });
  await p.waitForFunction(() => document.getElementById('gamePlay').style.display === 'block' && document.getElementById('gameWord').textContent !== '...', null, { timeout: 10000 }).catch(() => nalazi.push({ partija: g, greska: 'igra nije počela' }));
  let ocekivano = 0;
  for (let i = 0; i < 5; i++) {
    const stanje = await p.evaluate(() => ({ rec: gameCurrentWord, prikaz: document.getElementById('gameWord').textContent, tajmer: +document.getElementById('gameTimer').textContent, idx: gameCurrentWordIdx }));
    if (!stanje.rec) { nalazi.push({ partija: g, potez: i, greska: 'nema reči' }); break; }
    const ima = await p.evaluate((w) => imaRimu(w), stanje.rec);
    if (!ima) nalazi.push({ partija: g, potez: i, rec: stanje.rec, greska: 'ponuđena reč nema nijednu rimu u rečniku (nerešiva)' });
    if (stanje.tajmer !== t) nalazi.push({ partija: g, potez: i, rec: stanje.rec, greska: `tajmer počeo od ${stanje.tajmer}, ne ${t}` });
    const vrsta = ['tacna', 'pogresna', 'nepostojeca', 'ista', 'istek'][(i + g) % 5];
    potezi[vrsta]++;
    if (vrsta === 'istek') {
      await p.waitForFunction(() => /Vreme isteklo|Време истекло/.test(document.getElementById('gameFeedback').textContent), null, { timeout: (t + 3) * 1000 }).catch(() => nalazi.push({ partija: g, potez: i, rec: stanje.rec, greska: 'vreme nije isteklo u roku' }));
      const tajmer = await p.evaluate(() => +document.getElementById('gameTimer').textContent);
      if (tajmer !== 0) nalazi.push({ partija: g, potez: i, rec: stanje.rec, greska: `posle isteka tajmer pokazuje ${tajmer}` });
    } else {
      const odgovor = await p.evaluate(({ w, vrsta }) => {
        const k = rhymeKey(w); const lk = finalSylKey(w);   // isto pravilo kao igra
        if (vrsta === 'ista') return w;
        if (vrsta === 'nepostojeca') return 'xqz' + w.slice(0, 3) + 'wv';
        if (vrsta === 'tacna') { for (let i = 0; i < WORDS.length; i++) { const x = WORDS[i]; if (MALE[i] !== w.toLowerCase() && x.length >= 3 && KEYS[i] === k && !BLOCKED.has(MALE[i]) && i < jekStart) return x; }   /* ne „Mesec" za „mesec" – igra to (ispravno) odbija kao istu reč */ for (let i = 0; i < WORDS.length; i++) { const x = WORDS[i]; if (x !== w && x.length >= 3 && finalSylKey(x) === lk && i < jekStart) return x; } return null; }
        for (let i = 0; i < WORDS.length; i += 997) { const x = WORDS[i]; if (x !== w && rhymeKey(x) !== k && finalSylKey(x) !== lk && i < jekStart && x.length > 3) return x; } return 'kuća';
      }, { w: stanje.rec, vrsta });
      if (odgovor === null) { nalazi.push({ partija: g, potez: i, rec: stanje.rec, greska: 'za ponuđenu reč nije nađena nijedna rima (nerešiva)' }); }
      await p.fill('#gameInput', odgovor || 'kuća'); await p.tap('#gameSubmit').catch(async () => { await p.evaluate(() => document.getElementById('gameSubmit').click()); });
      await new Promise(r => setTimeout(r, 250));
      const fb = await p.evaluate(() => ({ t: document.getElementById('gameFeedback').textContent, k: document.getElementById('gameFeedback').className }));
      const ocek = { tacna: /correct/, pogresna: /wrong/, nepostojeca: /hint/, ista: /hint/ }[vrsta];
      if (!ocek.test(fb.k)) nalazi.push({ partija: g, potez: i, rec: stanje.rec, odgovor, vrsta, greska: `očekivano ${vrsta}, igra kaže: „${fb.t.slice(0, 60)}"` });
      if (vrsta === 'tacna' && /correct/.test(fb.k)) ocekivano++;
      if (vrsta === 'nepostojeca' || vrsta === 'ista') { /* nije potrošen potez — sad daj tačnu da igra ide dalje */
        const tacna = await p.evaluate((w) => { const k = rhymeKey(w); for (let i = 0; i < jekStart; i++) if (MALE[i] !== w.toLowerCase() && WORDS[i].length >= 3 && KEYS[i] === k && !BLOCKED.has(MALE[i])) return WORDS[i]; return 'kuća'; }, stanje.rec);
        await p.fill('#gameInput', tacna); await p.evaluate(() => document.getElementById('gameSubmit').click()); await new Promise(r => setTimeout(r, 250));
        const fb2 = await p.evaluate(() => document.getElementById('gameFeedback').className); if (/correct/.test(fb2)) ocekivano++; else if (!/wrong/.test(fb2)) nalazi.push({ partija: g, potez: i, rec: stanje.rec, odgovor: tacna, greska: 'tačna rima posle nevažećeg unosa nije priznata' });
      }
    }
    await p.waitForFunction((idx) => gameCurrentWordIdx > idx || gameState !== 'play', idx => idx, { timeout: 4000 }).catch(() => {});
    await p.waitForFunction((i) => gameState !== 'play' || (gameCurrentWordIdx === i + 1 && document.getElementById('gameSubmit').disabled === false), i, { timeout: 4000 }).catch(() => {});
    if (await p.evaluate(() => gameState) !== 'play') break;
  }
  await p.waitForFunction(() => gameState === 'results', null, { timeout: 8000 }).catch(() => nalazi.push({ partija: g, greska: 'rezultati se nisu pojavili' }));
  const rez = await p.evaluate(() => ({ tacnih: gamePlayersData[0] && gamePlayersData[0].correct, netacnih: gamePlayersData[0] && gamePlayersData[0].wrong, bodova: gamePlayersData[0] && gamePlayersData[0].score, tekst: (document.getElementById('gameResultsList') || {}).textContent || '' }));
  if (rez.tacnih !== ocekivano) nalazi.push({ partija: g, greska: `rezultat kaže ${rez.tacnih} tačnih, a bilo je ${ocekivano}` });
  if (!/\d/.test(rez.tekst)) nalazi.push({ partija: g, greska: 'ekran rezultata bez brojeva' });
  await p.evaluate(() => document.getElementById('gameAgain').click()); await new Promise(r => setTimeout(r, 200));
  if ((g + 1) % 10 === 0) process.stderr.write(`\r${g + 1}/${PARTIJA} partija, nalaza ${nalazi.length}`);
}
await b.close();
mkdirSync(path.join(ROOT, 'AUDIT', 'analiza'), { recursive: true });
const md = [`# Igra rimovanja — ${PARTIJA} partija na telefonu (${new Date().toISOString().slice(0, 10)}, ${BASE})`, '', `Poteza: tačnih ${potezi.tacna}, pogrešnih ${potezi.pogresna}, nepostojećih ${potezi.nepostojeca}, istih ${potezi.ista}, isteklih ${potezi.istek}. Greške u konzoli: ${konzola.length}. **Nalaza: ${nalazi.length}.**`, '',
  '| partija | potez | reč | odgovor | šta ne valja |', '|---|---|---|---|---|', ...nalazi.map(n => `| ${n.partija} | ${n.potez ?? ''} | ${n.rec || ''} | ${n.odgovor || ''} | ${n.greska} |`), '', ...(konzola.length ? ['## Konzola', ...konzola.slice(0, 20).map(k => '- ' + k)] : [])];
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-100-partija.md'), md.join('\n') + '\n');
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-100-partija.json'), JSON.stringify({ potezi, nalazi, konzola }, null, 1));
console.log(`\npartija ${PARTIJA} · poteza ${Object.values(potezi).reduce((a, b) => a + b, 0)} · nalaza ${nalazi.length} · konzola ${konzola.length}`);
for (const n of nalazi.slice(0, 25)) console.log('  ', JSON.stringify(n));
process.exit(nalazi.length || konzola.length ? 1 : 0);   // do 08.09. je vraćao 0 i sa nalazima – lanac ga nije mogao zaustaviti
