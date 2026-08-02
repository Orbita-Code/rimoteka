#!/usr/bin/env node
/**
 * Snimak futera na 390 i 1440 px, u svetloj i tamnoj temi.
 * Pomoćni alat za dizajn — ne ulazi u pre-deploy test.
 *
 *   node test/snimi-futer.mjs <folder>            # lokalni server 8765
 *   BASE=https://rimoteka.com node test/snimi-futer.mjs <folder>
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://localhost:8765';
const IZLAZ = path.join(ROOT, 'AUDIT', 'screenshots', process.argv[2] || 'futer');
fs.mkdirSync(IZLAZ, { recursive: true });

const pauza = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch();
for (const [ime, w, h] of [['390', 390, 844], ['1440', 1440, 900]]) {
  for (const tema of ['svetla', 'tamna']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    if (tema === 'tamna') {
      await ctx.addInitScript(() => { try { localStorage.setItem('rimoteka_dark', '1'); } catch (e) {} });
    }
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await pauza(1200);
    const el = await p.$('footer.site-footer');
    await el.scrollIntoViewIfNeeded();
    await pauza(900);           // da diskretan ulazak nota stigne da se odigra
    await el.screenshot({ path: path.join(IZLAZ, `futer-${ime}-${tema}.png`) });
    const mere = await p.evaluate(() => {
      const f = document.querySelector('footer.site-footer').getBoundingClientRect();
      return { visina: Math.round(f.height),
               preliv: document.documentElement.scrollWidth > window.innerWidth };
    });
    console.log(`${ime} px · ${tema}: futer visok ${mere.visina} px, horizontalno skrolovanje: ${mere.preliv ? 'IMA' : 'nema'}`);
    await ctx.close();
  }
}
await b.close();
console.log('Snimci u ' + IZLAZ);
