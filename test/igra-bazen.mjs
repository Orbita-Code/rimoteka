/* BAZEN REČI KOJE IGRA SME DA ZADA – izvlačenje iz PRAVOG koda igre (zahtev vlasnice 08.09.2026:
 * „da li su sve zadate reči validne, srpske, da nema hrvatskih i nekih preteških, zastarelih").
 *
 * Ne rekonstruiše bazen „u glavi" – učita stranu igre i pozove iste funkcije koje igra koristi
 * (`getCommonPool`, `BLOCKED`, `jeJekavskaRec`, `imaRimu`, `isKidsBlocked`). Za svaku reč zapiše
 * učestalost, slogove, ima li savršenu rimu i da li je u Matici (kao odrednica). Ocenu daje
 * `scripts/igra-bazen-analiza.py` (srLex vrsta reči, Matica oznake, hrvatski oblici, težina).
 *
 * Izlaz: AUDIT/analiza/igra-bazen.json. Pokretanje: node test/igra-bazen.mjs
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch();
const c = await b.newContext();
await c.addInitScript(() => { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); });
const p = await c.newPage();
await p.goto(BASE + '/igra-rimovanja/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 });
await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('ljubav') < 0 && JEKAVSKI.size > 0 && MATICA.size > 0, null, { timeout: 60000 });
const rez = await p.evaluate(() => {
  const pool = getCommonPool();
  imaRimu('kuća');   // gradi RHYME_COUNTS
  const out = [];
  for (const w of pool) {
    const igra = !BLOCKED.has(w) && !jeJekavskaRec(w) && imaRimu(w);
    out.push({ w, f: -RANK.get(w), s: syllables(w), matica: MATICA.has(w) || MATICA.has(w.toLowerCase()), igra, deca: igra && !isKidsBlocked(w), savrsena: (RHYME_COUNTS.get(rhymeKey(w)) || 0) - 1, siroka: (LOOSE_COUNTS.get(looseKey(w)) || 0) - 1 });
  }
  return { velicina: pool.length, reci: out };
});
await b.close();
mkdirSync(path.join(ROOT, 'AUDIT', 'analiza'), { recursive: true });
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'igra-bazen.json'), JSON.stringify(rez));
const uIgri = rez.reci.filter(r => r.igra).length;
console.log(`bazen ${rez.velicina} reči · igra sme da zada ${uIgri} · dečji režim ${rez.reci.filter(r => r.deca).length} · bez savršene rime (samo široka) ${rez.reci.filter(r => r.igra && r.savrsena === 0).length}`);
