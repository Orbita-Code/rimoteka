/* Meri skakanje strane (CLS) više puta i ispisuje RASPON, ne jedan broj.
   Nalaz P16: strana je skakala 50 px kad stigne web-font. Popravka su rezervni
   fontovi usklađenih mera (`style.css`, @font-face `… rezerva`).

   Pravila koja su plaćena skupo (PROPUSTI.md, pravilo 5 i 4):
     · jedan dobar broj NIJE dokaz — meri se deset puta i piše se raspon;
     · NE meriti u minutu posle deploy-a — kontejner se tada diže;
     · meriti na BRZOJ vezi — na sporoj strana ionako čeka font, pa se kvar ne vidi.

   Pokretanje:
     node test/meri-cls.mjs                          # lokalno (diže svoj server)
     BASE=https://rimoteka.com node test/meri-cls.mjs # protiv produkcije
     PROLAZA=10 node test/meri-cls.mjs                # broj merenja po strani  */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PROLAZA = Number(process.env.PROLAZA || 10);
const PUTANJE = ['/', '/rimovanje-reci/', '/rime-za/ljubav/'];
const TIP = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.txt':'text/plain', '.svg':'image/svg+xml',
  '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon' };

let server = null, BASE = process.env.BASE;
if (!BASE) {
  const KOREN = new URL('../public/', import.meta.url).pathname;
  server = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    try {
      const buf = await readFile(join(KOREN, p));
      res.writeHead(200, { 'Content-Type': TIP[extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch { res.writeHead(404).end('404'); }
  });
  await new Promise(r => server.listen(0, r));
  BASE = `http://localhost:${server.address().port}`;
}

const b = await chromium.launch();
console.log(`\n  Merim CLS ${PROLAZA}× po strani — ${BASE}\n`);
let najgori = 0;

for (const put of PUTANJE) {
  const svi = [];
  for (let i = 0; i < PROLAZA; i++) {
    /* SVAKO merenje dobija SVOJ kontekst. Zamka iz prošle sesije: `addInitScript`
       je stajao unutar petlje nad istom stranom, pa su se posmatrači gomilali i CLS
       se brojao dvostruko — provera je padala na ISPRAVNOM kodu. */
    const ctx = await b.newContext();
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await p.goto(BASE + put, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1200);          // font stigne ~736 ms — merimo i posle toga
    svi.push(await p.evaluate(() => +window.__cls.toFixed(4)));
    await ctx.close();
  }
  svi.sort((a, b) => a - b);
  const min = svi[0], max = svi[svi.length - 1], med = svi[Math.floor(svi.length / 2)];
  najgori = Math.max(najgori, max);
  const z = max < 0.1 ? '✅' : (max < 0.25 ? '⚠️ ' : '❌');
  console.log(`  ${z} ${put.padEnd(20)} raspon ${String(min).replace('.', ',')} – ${String(max).replace('.', ',')}   sredina ${String(med).replace('.', ',')}`);
  console.log(`     svih ${PROLAZA}: ${svi.map(v => String(v).replace('.', ',')).join(' · ')}`);
}

console.log(`\n  Najgori izmereni CLS: ${String(najgori).replace('.', ',')}  (granica je 0,1)`);
console.log(najgori < 0.1 ? '  ✅ P16 se drži — nijedno od merenja nije prešlo granicu.\n'
                          : '  ❌ P16 NIJE zatvoren — bar jedno merenje je preko granice.\n');
await b.close();
if (server) server.close();
process.exit(najgori < 0.1 ? 0 : 1);
