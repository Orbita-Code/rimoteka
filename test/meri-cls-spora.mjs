/* SKAKANJE STRANE NA SPOROJ VEZI (CLS) — provera koja hvata ono što
   `meri-cls.mjs` ne može da vidi.

   Zašto postoji zaseban alat:
   `meri-cls.mjs` meri na BRZOJ vezi, i to sa razlogom (nalaz P16 — čekanje
   web-fonta se na sporoj vezi sakrije, pa se kvar ne vidi). Ali postoji i
   obrnuta klasa kvarova, koja se vidi SAMO na sporoj vezi:

     pravilo izgleda koje zavisi od toga da li se JavaScript već učitao.

   Izmereno 02.08.2026 na produkciji: `style.css` je imao
   `body:not([data-tab="rime"]) .hero{display:none}`, a oznaku `data-tab`
   postavlja `app.js`. Na brzoj vezi app.js stigne za 528 ms — pre nego što se
   išta iscrta, pa je CLS bio 0,005 i sve je delovalo savršeno. Na vezi od
   1,6 Mb/s app.js stiže tek na 1.996 ms, naslovni blok tada iskoči i gurne
   polje za unos za 130 px naniže — izmereno skakanje 0,118–0,121, pri granici
   0,1. Deset merenja na brzoj vezi to nikad ne bi otkrilo.

   Pravilo koje iz ovoga sledi, i koje ova provera čuva:
   izgled strane ne sme da zavisi od toga da li je skripta stigla.

   Pokretanje:
     node test/meri-cls-spora.mjs                            # lokalno
     BASE=https://rimoteka.com node test/meri-cls-spora.mjs  # protiv produkcije
     PROLAZA=5 node test/meri-cls-spora.mjs

   Izlazni kod 1 ako ijedno merenje pređe granicu.                            */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';

const GRANICA = Number(process.env.GRANICA || 0.1);
const PROLAZA = Number(process.env.PROLAZA || 3);
const PUTANJE = (process.env.PUTANJE || '/,/rimovanje-reci/,/rime-za/ljubav/').split(',');

/* Mreža: 1,6 Mb/s naniže, 750 kb/s naviše, kašnjenje 150 ms. To je obična
   mobilna veza van grada — ne najgori slučaj, nego čest slučaj. */
const MREZA = { offline: false, downloadThroughput: 1.6 * 1024 * 1024 / 8,
                uploadThroughput: 750 * 1024 / 8, latency: 150 };

let server = null, BASE = process.env.BASE;
if (!BASE) {
  const luka = 8799;
  server = spawn(process.execPath, [new URL('./static-server.mjs', import.meta.url).pathname, String(luka)],
                 { stdio: 'ignore', detached: true });
  await new Promise(r => setTimeout(r, 1200));
  BASE = `http://localhost:${luka}`;
}

const zarez = n => String(n).replace('.', ',');
const browser = await chromium.launch();
let najgori = 0, palo = 0;

console.log(`\n  Merim skakanje strane na SPOROJ vezi (1,6 Mb/s, kašnjenje 150 ms) — ${BASE}`);
console.log(`  Granica: ${zarez(GRANICA)}\n`);

for (const put of PUTANJE) {
  const merenja = [], krivci = [];
  for (let i = 0; i < PROLAZA; i++) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', MREZA);

    /* Ništa se ne klikće i ne kuca. Svaka interakcija postavlja
       `hadRecentInput`, pomeraji se tada NE broje, i merenje ispadne lažno
       dobro — a upravo je to zamka zbog koje je prvo merenje 02.08. moralo da
       se ponovi. */
    await p.addInitScript(() => {
      window.__cls = 0; window.__ko = [];
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__cls += e.value;
          if (e.value > 0.01) window.__ko.push({
            v: Math.round(e.value * 10000) / 10000, t: Math.round(e.startTime),
            ko: (e.sources || []).map(s => s.node
              ? s.node.nodeName.toLowerCase() + (s.node.className ? '.' + String(s.node.className).split(' ')[0] : '')
              : '?').slice(0, 2),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await p.goto(BASE + put, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(9000);   // app.js na ovoj brzini stiže oko 2 s; čekamo i posle toga
    const m = await p.evaluate(() => ({ cls: Math.round(window.__cls * 10000) / 10000, ko: window.__ko }));
    merenja.push(m.cls); krivci.push(...m.ko);
    await ctx.close();
  }

  const max = Math.max(...merenja), min = Math.min(...merenja);
  najgori = Math.max(najgori, max);
  const dobro = max <= GRANICA;
  if (!dobro) palo++;
  console.log(`  ${dobro ? '✅' : '❌'} ${put.padEnd(22)} raspon ${zarez(min)} – ${zarez(max)}`);
  console.log(`     svih ${PROLAZA}: ${merenja.map(zarez).join(' · ')}`);
  if (krivci.length) {
    const zbir = {};
    for (const k of krivci) { const kljuc = k.ko.join(', ') || '?'; zbir[kljuc] = Math.max(zbir[kljuc] || 0, k.v); }
    for (const [ko, v] of Object.entries(zbir)) console.log(`     pomera raspored: ${ko} (${zarez(v)})`);
  }
}

await browser.close();
if (server) { try { process.kill(-server.pid); } catch { server.kill(); } }

console.log(`\n  Najgori izmereni CLS na sporoj vezi: ${zarez(Math.round(najgori * 10000) / 10000)}  (granica ${zarez(GRANICA)})`);
if (palo) {
  console.log(`  ❌ ${palo} strana skače preko granice na sporoj vezi.`);
  console.log('     Najčešći uzrok: CSS pravilo koje zavisi od oznake koju postavlja app.js.\n');
  process.exit(1);
}
console.log('  ✅ Nijedna strana ne skače preko granice ni na sporoj vezi.\n');
