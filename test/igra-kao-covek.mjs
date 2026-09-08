/* IGRA RIMOVANJA – PARTIJE SA 2–3 IGRAČA, ODGOVORI KAO ČOVEK (zahtev vlasnice 08.09.2026).
 *
 * Proverava ono što `igra-100-partija.mjs` ne dodiruje:
 *  - odgovor je reč koju bi čovek dao: NAJČEŠĆA savršena rima (po učestalosti), ne prva po abecedi;
 *    povremeno pogrešna reč, ćirilični unos, veliko slovo i razmak;
 *  - BODOVI potez po potezu: poruka „+N" mora biti 10 + preostale sekunde + min(50, niz×5), i zbir igrača
 *    mora da poraste tačno za N;
 *  - PRELAZ SA IGRAČA NA IGRAČA: ekran predaje se vidi, broj sledećeg igrača tačan, sažetak prethodnog
 *    tačan (bodovi, tačnih od), tajmer STOJI dok se ne klikne, niz se resetuje, posle klika „Igrač: 2" i „1/5";
 *  - REZULTATI: svi igrači, opadajuće po bodovima, pehar prvom, nerešeno se vidi, engleske reči („combo").
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
let konzola = [];
for (let g = 0; g < PARTIJA; g++) {
  const igraci = 2 + (g % 2);                 // 2, 3, 2, 3 …
  const cir = g % 4 === 3;                    // svaka četvrta partija u ćirilici
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await c.addInitScript((cir) => { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); if (cir) localStorage.setItem('rimoteka_script', 'cyr'); }, cir);
  const p = await c.newPage();
  p.on('console', m => { if (m.type() === 'error') konzola.push(`p${g}: ` + m.text().slice(0, 160)); }); p.on('pageerror', e => konzola.push(`p${g} pageerror: ` + e.message.slice(0, 160)));
  await p.goto(BASE + '/igra-rimovanja/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 });
  await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('ljubav') < 0 && JEKAVSKI.size > 0, null, { timeout: 60000 }).catch(() => nalazi.push({ partija: g, greska: 'učestalost/ijekavski spisak nisu stigli' }));
  await p.evaluate(({ igraci, T, WPP }) => {
    document.querySelectorAll('#gamePlayers .game-option').forEach(b => { if (+b.dataset.value === igraci) b.click(); });
    document.querySelectorAll('#gameWords .game-option').forEach(b => { if (+b.dataset.value === WPP) b.click(); });
    document.querySelectorAll('#gameTime .game-option').forEach(b => { if (+b.dataset.value === T) b.click(); });
  }, { igraci, T, WPP });
  await p.tap('#gameStart').catch(async () => { await p.evaluate(() => document.getElementById('gameStart').click()); });
  await p.waitForFunction(() => document.getElementById('gamePlay').style.display === 'block' && document.getElementById('gameWord').textContent !== '...', null, { timeout: 10000 }).catch(() => nalazi.push({ partija: g, greska: 'igra nije počela' }));
  const ocekivano = Array.from({ length: igraci }, () => ({ score: 0, correct: 0 }));
  let potez = 0;
  for (let pl = 0; pl < igraci; pl++) {
    let niz = 0;
    for (let i = 0; i < WPP; i++) {
      const st = await p.evaluate(() => ({ rec: gameCurrentWord, prikaz: document.getElementById('gameWord').textContent, igrac: document.getElementById('gameCurrentPlayer').textContent, brojac: document.getElementById('gameWordCount').textContent, pi: gameCurrentPlayerIdx, wi: gameCurrentWordIdx, script }));
      if (!st.rec) { nalazi.push({ partija: g, igrac: pl + 1, potez: i, greska: 'nema reči' }); break; }
      zadate.push(st.rec);
      if (+st.igrac !== pl + 1) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: `na ekranu piše „Igrač: ${st.igrac}"` });
      if (st.brojac !== `${i + 1}/${WPP}`) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: `brojač reči „${st.brojac}", treba ${i + 1}/${WPP}` });
      if (st.script === 'cyr' && /[a-zčćžšđ]/i.test(st.prikaz)) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: `zadata reč latinicom u ćirilici: „${st.prikaz}"` });
      const vrsta = potez % 5 === 4 ? 'pogresna' : 'tacna';
      const odg = await p.evaluate(({ w, vrsta }) => {
        const k = rhymeKey(w), lk = finalSylKey(w);   // isto pravilo kao igra
        let best = null, bestR = Infinity, bestL = null, bestLR = Infinity, protiv = null, protivR = Infinity, varka = null, varkaR = Infinity;
        for (let i = 0; i < jekStart; i++) {
          const x = WORDS[i]; if (x === w || x.length < 3 || BLOCKED.has(MALE[i]) || /[A-ZČĆŽŠĐ]/.test(x[0])) continue;
          const r = RANK.get(x); if (r === undefined || r >= 0) continue;
          if (KEYS[i] === k) { if (r < bestR) { bestR = r; best = x; } }
          else if (finalSylKey(x) === lk) { if (r < bestLR) { bestLR = r; bestL = x; } }
          else if (looseKey(x) === looseKey(w)) { if (x.length >= 4 && r < varkaR) { varkaR = r; varka = x; } }   // isto POSLEDNJE slovo, a nije rima (rupa zatvorena 08.09.)
          else if (x.length >= 4 && r < protivR) { protivR = r; protiv = x; }
        }
        if (vrsta === 'pogresna') return varka ? { odg: varka, tip: 'varka-isto-slovo' } : { odg: protiv, tip: 'pogresna' };
        return best ? { odg: best, tip: 'savrsena' } : { odg: bestL, tip: 'siroka' };
      }, { w: st.rec, vrsta });
      if (!odg.odg) { nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: 'čovek ne bi našao poznatu rimu (nijedna sa učestalošću)' }); }
      let unos = odg.odg || 'kuća';
      const oblik = potez % 9 === 8 ? 'cir' : potez % 7 === 6 ? 'veliko' : 'obicno';
      if (oblik === 'cir') unos = await p.evaluate((u) => toCyr(u), unos);
      if (oblik === 'veliko') unos = ' ' + unos[0].toUpperCase() + unos.slice(1) + ' ';
      if (potez % 11 === 10) {   // rečca od 2 slova sa istim završetkom mora da bude odbijena bez trošenja poteza – PRE pravog odgovora (posle njega je dugme ugašeno, pa klik ne radi ništa)
        const kratka = await p.evaluate((w) => { const k = finalSylKey(w); for (const x of ['je', 'ma', 'da', 'se', 'ne', 'ti', 'mi', 'su', 'li', 'ga', 'na', 'te', 'to', 'ko']) if (finalSylKey(x) === k || rhymeKey(x) === rhymeKey(w)) return x; return null; }, st.rec);
        if (kratka) { await p.fill('#gameInput', kratka); const fk = await p.evaluate(() => { document.getElementById('gameSubmit').click(); return document.getElementById('gameFeedback').className; }); if (!/hint/.test(fk)) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: kratka, greska: `rečca od 2 slova „${kratka}" nije odbijena (${fk})` }); }
      }
      await p.fill('#gameInput', unos);
      await new Promise(r => setTimeout(r, 300 + ((potez * 3 + g * 7 + pl * 2) % 6) * 400));   // čovek razmišlja 0,3–2,3 s, različito po potezu i igraču (5 reči × 7 ≡ 0 mod 5 je davalo iste bodove svima)
      const pre = await p.evaluate(() => ({ t: gameTimeLeft, score: gamePlayersData[gameCurrentPlayerIdx].score, combo: gameCombo }));
      const t = await p.evaluate(() => { const t = gameTimeLeft; document.getElementById('gameSubmit').click(); return t; });
      await new Promise(r => setTimeout(r, 200));
      const fb = await p.evaluate(() => ({ t: document.getElementById('gameFeedback').textContent, k: document.getElementById('gameFeedback').className, score: gamePlayersData[gameCurrentPlayerIdx].score, combo: gameCombo, badge: document.getElementById('gameComboBadge').hidden ? '' : document.getElementById('gameComboBadge').textContent }));
      const tacno = /correct/.test(fb.k);
      dnevnik.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos.trim(), tip: odg.tip, ishod: fb.k.replace('game-feedback', '').trim(), poruka: fb.t.slice(0, 80), sek: t });
      if (vrsta === 'tacna' && !tacno) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos, greska: `${odg.tip} rima „${unos.trim()}" (${oblik}) nije priznata: „${fb.t.slice(0, 70)}"` });
      if (vrsta === 'pogresna' && tacno) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, odgovor: unos, greska: `reč koja se ne rimuje priznata kao tačna (${odg.tip})` });
      if (tacno) {
        niz++;
        const ocek = 10 + t + Math.min(50, niz * 5);
        const m = fb.t.match(/\+(\d+)/); const n = m ? +m[1] : NaN;
        if (n !== ocek && n !== ocek - 1) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: `poruka kaže +${n}, formula (10 + ${t} s + niz ${niz}×5) daje ${ocek}` });
        if (fb.score - pre.score !== n) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: `zbir porastao za ${fb.score - pre.score}, a poruka kaže +${n}` });
        if (niz >= 2 && !fb.badge) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: `niz ${niz}, a oznaka niza se ne vidi` });
        ocekivano[pl].score += n; ocekivano[pl].correct++;
      } else {
        niz = 0;
        if (fb.score !== pre.score) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: 'bodovi se menjaju posle pogrešnog odgovora' });
        if (fb.badge) nalazi.push({ partija: g, igrac: pl + 1, potez: i, rec: st.rec, greska: 'oznaka niza ostala posle greške' });
      }
      potez++;
      await p.waitForFunction(({ i }) => gameState !== 'play' || (gameCurrentWordIdx === i + 1 && !document.getElementById('gameSubmit').disabled), { i }, { timeout: 5000 }).catch(() => {});
    }
    // --- PRELAZ NA SLEDEĆEG IGRAČA ---
    if (pl < igraci - 1) {
      await p.waitForFunction(() => gameState === 'handoff', null, { timeout: 5000 }).catch(() => nalazi.push({ partija: g, igrac: pl + 1, greska: 'posle poslednje reči nema ekrana predaje' }));
      const h = await p.evaluate(() => ({ st: gameState, vidi: document.getElementById('gameHandoff').style.display, play: document.getElementById('gamePlay').style.display, badge: document.getElementById('gameHandoffBadge').textContent, naslov: document.getElementById('gameHandoffTitle').textContent, sub: document.getElementById('gameHandoffSub').textContent, tajmer: document.getElementById('gameTimer').textContent, timerAktivan: !!gameTimer, pi: gameCurrentPlayerIdx, combo: gameCombo, badgeVidi: !document.getElementById('gameComboBadge').hidden }));
      await new Promise(r => setTimeout(r, 1300));
      const h2 = await p.evaluate(() => ({ tajmer: document.getElementById('gameTimer').textContent, st: gameState, pi: gameCurrentPlayerIdx }));
      if (h.st === 'handoff') {
        if (h.vidi !== 'block' || h.play !== 'none') nalazi.push({ partija: g, igrac: pl + 1, greska: `ekran predaje: handoff=${h.vidi}, play=${h.play}` });
        if (h.badge !== String(pl + 2)) nalazi.push({ partija: g, igrac: pl + 1, greska: `značka predaje „${h.badge}", treba ${pl + 2}` });
        if (!h.naslov.includes(String(pl + 2))) nalazi.push({ partija: g, igrac: pl + 1, greska: `naslov predaje „${h.naslov}" bez broja ${pl + 2}` });
        const o = ocekivano[pl];
        if (!h.sub.includes(String(o.score)) || !h.sub.includes(`${o.correct} `)) nalazi.push({ partija: g, igrac: pl + 1, greska: `sažetak „${h.sub}" ne slaže se sa ${o.score} bodova / ${o.correct} tačnih` });
        // `gameTimer` posle clearInterval i dalje drži stari broj – gleda se da li se TEKST tajmera i stanje menjaju
        if (h2.st !== 'handoff' || h2.pi !== h.pi || h2.tajmer !== h.tajmer) nalazi.push({ partija: g, igrac: pl + 1, greska: `tajmer ili igra idu dalje dok se čeka predaja (${h.tajmer}→${h2.tajmer}, ${h.st}→${h2.st})` });
        if (h.combo !== 0 || h.badgeVidi) nalazi.push({ partija: g, igrac: pl + 1, greska: `niz prethodnog igrača (${h.combo}) prenet na sledećeg` });
        if (/[a-zčćžšđ]/i.test(h.naslov + h.sub) && cir) nalazi.push({ partija: g, igrac: pl + 1, greska: `ekran predaje latinicom u ćirilici: „${(h.naslov + ' ' + h.sub).slice(0, 60)}"` });
        await p.tap('#gameHandoffStart').catch(async () => { await p.evaluate(() => document.getElementById('gameHandoffStart').click()); });
        await p.waitForFunction(() => gameState === 'play' && gameCurrentWord && document.getElementById('gameWord').textContent !== '...', null, { timeout: 5000 }).catch(() => nalazi.push({ partija: g, igrac: pl + 2, greska: 'posle „Spreman sam" igra ne kreće' }));
        const s2 = await p.evaluate(() => ({ igrac: document.getElementById('gameCurrentPlayer').textContent, brojac: document.getElementById('gameWordCount').textContent, tajmer: +document.getElementById('gameTimer').textContent }));
        if (+s2.igrac !== pl + 2 || s2.brojac !== `1/${WPP}`) nalazi.push({ partija: g, igrac: pl + 2, greska: `posle predaje piše Igrač ${s2.igrac}, reč ${s2.brojac}` });
        if (s2.tajmer < T - 1) nalazi.push({ partija: g, igrac: pl + 2, greska: `tajmer novog igrača počeo od ${s2.tajmer}` });
      }
    }
  }
  // --- REZULTATI ---
  await p.waitForFunction(() => gameState === 'results', null, { timeout: 8000 }).catch(() => nalazi.push({ partija: g, greska: 'rezultati se nisu pojavili' }));
  const r = await p.evaluate(() => ({ stavke: [...document.querySelectorAll('#gameResultsList .game-result-item')].map(e => ({ tekst: e.textContent.replace(/\s+/g, ' ').trim(), pobednik: e.classList.contains('winner'), score: +e.querySelector('.game-result-score').textContent })), sve: document.getElementById('gameResultsList').textContent.replace(/\s+/g, ' '), data: gamePlayersData.map(p => ({ score: p.score, correct: p.correct, wrong: p.wrong })) }));
  if (r.stavke.length !== igraci) nalazi.push({ partija: g, greska: `rezultati prikazuju ${r.stavke.length} igrača od ${igraci}` });
  for (let k = 1; k < r.stavke.length; k++) if (r.stavke[k].score > r.stavke[k - 1].score) nalazi.push({ partija: g, greska: 'rezultati nisu opadajuće po bodovima' });
  for (let k = 0; k < igraci; k++) if (r.data[k].score !== ocekivano[k].score || r.data[k].correct !== ocekivano[k].correct) nalazi.push({ partija: g, greska: `igrač ${k + 1}: igra ima ${r.data[k].score}/${r.data[k].correct} tačnih, prebrojano ${ocekivano[k].score}/${ocekivano[k].correct}` });
  if (r.stavke.length >= 2 && r.stavke[0].score === r.stavke[1].score && !(/Nerešeno|Нерешено/.test(r.sve) && r.stavke[0].pobednik && r.stavke[1].pobednik)) nalazi.push({ partija: g, greska: `NEREŠENO (${r.stavke[0].score}:${r.stavke[1].score}) prikazano kao pobeda: „${r.stavke[0].tekst}"`, vrsta: 'sadržaj' });
  if (r.stavke.length >= 2 && r.stavke[0].score !== r.stavke[1].score && r.stavke[1].pobednik) nalazi.push({ partija: g, greska: 'drugi po bodovima označen kao pobednik' });
  if (/combo/i.test(r.sve)) nalazi.push({ partija: g, greska: `engleska reč na ekranu rezultata: „${r.sve.match(/\S*combo\S*/i)[0]}"`, vrsta: 'sadržaj' });
  if (cir && /[a-zčćžšđ]/.test(r.sve.replace(/combo/gi, ''))) nalazi.push({ partija: g, greska: `rezultati latinicom u ćirilici: „${r.sve.slice(0, 80)}"`, vrsta: 'sadržaj' });
  if (!r.stavke[0] || !r.stavke[0].pobednik) nalazi.push({ partija: g, greska: 'prvi u rezultatima nije označen kao pobednik' });
  const najb = r.data.reduce((a, x) => Math.max(a, x.correct), 0);
  if (najb === WPP && !/Sve tačno|Све тачно/.test(r.sve)) nalazi.push({ partija: g, greska: 'neko ima sve tačno, a dostignuće „Sve tačno" se ne vidi' });
  await c.close();
  process.stderr.write(`\rpartija ${g + 1}/${PARTIJA} (${igraci} igrača${cir ? ', ćirilica' : ''}), nalaza ${nalazi.length}`);
}
await b.close();
const jedinstveni = [...new Set(nalazi.map(n => n.greska.replace(/\d+/g, 'N').slice(0, 60)))];
mkdirSync(path.join(ROOT, 'AUDIT', 'analiza'), { recursive: true });
const md = [`# Igra rimovanja – ${PARTIJA} partija sa 2–3 igrača, odgovori kao čovek (${new Date().toISOString().slice(0, 10)}, ${BASE})`, '',
  `Poteza ${dnevnik.length} · tačnih ${dnevnik.filter(d => d.ishod === 'correct').length} · zadatih reči ${zadate.length} (jedinstvenih ${new Set(zadate).size}) · greške u konzoli ${konzola.length} · **nalaza ${nalazi.length}** (vrsta: ${jedinstveni.length})`, '',
  '## Nalazi', '', '| partija | igrač | potez | reč | šta ne valja |', '|---|---|---|---|---|', ...nalazi.map(n => `| ${n.partija} | ${n.igrac ?? ''} | ${n.potez ?? ''} | ${n.rec || ''} | ${n.greska} |`), '',
  '## Zadate reči (šta bi dete dobilo)', '', zadate.join(', '), '',
  '## Dnevnik poteza (prvih 60)', '', '| partija | igrač | reč | odgovor | vrsta | ishod | sek | poruka |', '|---|---|---|---|---|---|---|---|', ...dnevnik.slice(0, 60).map(d => `| ${d.partija} | ${d.igrac} | ${d.rec} | ${d.odgovor} | ${d.tip} | ${d.ishod} | ${d.sek} | ${d.poruka} |`), '',
  ...(konzola.length ? ['## Konzola', ...konzola.slice(0, 20).map(k => '- ' + k)] : [])];
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-kao-covek.md'), md.join('\n') + '\n');
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-kao-covek.json'), JSON.stringify({ nalazi, dnevnik, zadate, konzola }, null, 1));
console.log(`\npartija ${PARTIJA} · poteza ${dnevnik.length} · nalaza ${nalazi.length} · konzola ${konzola.length}`);
for (const n of nalazi.slice(0, 30)) console.log('  ', JSON.stringify(n));
process.exit(nalazi.length ? 1 : 0);
