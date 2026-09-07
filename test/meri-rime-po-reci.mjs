/* KOLIKO RIMA IMA SVAKA REČ — merenje pravim alatom (08.09.2026, istraga vlasnice).
 *
 * Za spisak reči pokreće `doRhymes` u pravom pregledaču i broji „Najbolje rime", „Dobre rime"
 * i rezervnu grupu — tačno ono što posetilac vidi. Služi za dve odluke: koje reči zaslužuju
 * svoju stranu (uz reči sa kraja stiha iz `scripts/korpus-kraj-stiha.py`) i koja reč je
 * najbolji primer u polju („npr. svet").
 *
 * Pokretanje (lokalni server na 8765 mora da radi):
 *     node test/meri-rime-po-reci.mjs reci.txt izlaz.json      # reč po redu
 *     node test/meri-rime-po-reci.mjs --kandidati izlaz.json   # ugrađeni kandidati za placeholder
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8765';
const [ulaz, izlaz] = process.argv.slice(2);
const KANDIDATI = 'svet ljubav srce san dan noć sunce more zvezda cvet reč pesma sreća nada duša glas sen sjaj dom rod cvetak zora zima leto kiša sneg vetar nebo grad put oči ruka kuća voda vatra mrak tuga bol radost rima'.split(' ');
const reci = ulaz === '--kandidati' ? KANDIDATI : readFileSync(ulaz, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
await c.addInitScript(() => localStorage.setItem('rimoteka_interno', '1'));
const p = await c.newPage();
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 });
await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('ljubav') < 0, null, { timeout: 30000 }).catch(() => {});
const out = {};
const KOMAD = 200;
for (let i = 0; i < reci.length; i += KOMAD) {
  const deo = reci.slice(i, i + KOMAD);
  const r = await p.evaluate((deo) => {
    const res = {};
    for (const w of deo) {
      rimeInput.value = w; doRhymes(true);
      const g = [...document.querySelectorAll('#rimeResults .res-group')];
      const broj = (naslov) => { const x = g.find(e => (e.querySelector('h2') || {}).textContent === naslov); return x ? x.querySelectorAll('.chip').length : 0; };
      res[w] = { najbolje: broj('Najbolje rime'), dobre: broj('Dobre rime'), rezerva: broj('Dobre rime (isti završni slog)'), slogova: syllables(w) };
    }
    rimeInput.value = ''; return res;
  }, deo);
  Object.assign(out, r);
  process.stderr.write(`\r${Math.min(i + KOMAD, reci.length)}/${reci.length}`);
}
await b.close();
writeFileSync(izlaz, JSON.stringify(out, null, 0));
const red = Object.entries(out).sort((a, b) => (b[1].najbolje + b[1].dobre) - (a[1].najbolje + a[1].dobre));
console.log(`\nizmereno ${red.length} reči → ${izlaz}`);
console.log('prvih 40 po (najbolje+dobre):', red.slice(0, 40).map(([w, v]) => `${w} ${v.najbolje}+${v.dobre}`).join(', '));
