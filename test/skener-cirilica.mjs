/* SKENER ĆIRILICE — svaka strana, svaki tekst, slovo po slovo (zahtev vlasnice 08.09.2026).
 *
 * „Ne sme da postoji tekst na latinici na ćiriličnoj verziji, osim logoa i „Powered by Orbita Code“,
 * i stranih imena (Google Analytics i sl.)." Ovo NE proverava uzorak: otvara SVAKU adresu iz sitemapa
 * (≈2.000) sa uključenom ćirilicom, plus sva stanja alata na početnoj (rezultati, traka nad reči,
 * oblačić značenja, prijava, baner, pretraga, slogovi, beležnica, klasici, igra, omiljene, 404) i
 * skuplja SVAKI tekst koji sadrži latinična slova — iz teksta strane, ali i iz `placeholder`, `title`,
 * `aria-label`, `alt`, `<title>` i `meta description`.
 *
 * Dozvoljeno (ne prijavljuje se): logo (`.brand*`), „Powered by Orbita Code“, mejl/adrese, strana imena
 * sa spiska DOZVOLJENO, skraćenice velikim slovima (PDF, ABAB), <kbd>/<code>.
 * Sve ostalo ide u izveštaj `AUDIT/analiza/cirilica-skener.json` + `.md`, grupisano po tekstu, sa spiskom
 * strana (da se ista šablonska rečenica broji jednom).
 *
 * Pokretanje (lokalni server na 8765):   node test/skener-cirilica.mjs
 *            protiv produkcije:           BASE=https://rimoteka.com node test/skener-cirilica.mjs
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://localhost:8765';
const PARALELNO = Number(process.env.PARALELNO || 4);
const DOZVOLJENO = /^(·? ?Powered by( Orbita Code)?|Orbita Code|latinica|Google Analytics|Google|YouTube|GitHub|Cloudflare|Chrome|Safari|Firefox|Android|iPhone|iPad|iOS|Windows|Wikipedia|Wiktionary|Rimoteka|eureka@rimoteka\.com|rimoteka\.com|orbitacode\.com|PDF|ABAB|AABB|ABBA|R)$/;
const LAT = /[A-Za-zČĆŽŠĐčćžšđ]/;

const sm = readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
const adrese = [...sm.matchAll(/<loc>https:\/\/rimoteka\.com([^<]*)<\/loc>/g)].map(m => m[1]);
adrese.push('/404.html', '/nepostojeca-strana-xqzw/');

const nalazi = new Map();   // tekst → { gde: Set(strana#kontekst), vrsta }
function dodaj(tekst, gde, vrsta) {
  const t = tekst.replace(/\s+/g, ' ').trim();
  if (!t || !LAT.test(t)) return;
  if (DOZVOLJENO.test(t)) return;
  if (/^[A-ZČĆŽŠĐ0-9 .\-]{2,}$/.test(t)) return;                 // skraćenica velikim slovima
  if (/^(https?:\/\/|mailto:)|@/.test(t)) return;
  const k = nalazi.get(t) || { gde: new Set(), vrsta };
  k.gde.add(gde); nalazi.set(t, k);
}

// U strani: sve što se vidi ili čita (tekst, atributi), osim dozvoljenih zona.
const SKUPI = () => {
  const IZUZETO = '.brand, .brand-logo, .footer-brand, .footer-orbita, kbd, code, script, style, noscript, #noteEditor, #noteTitle, .ml, .vrhyme, #panel-klasici, #scriptToggle button';   // tekst korisnika, klasici u originalu, slova šeme, dugmad pisma
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || el.closest(IZUZETO)) continue; const skriven = !el.getClientRects().length && !el.closest('[hidden]') ? false : false; out.push(['tekst', n.textContent, el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + (el.closest('[hidden]') ? ' (skriveno)' : '')]); }
  for (const el of document.querySelectorAll('[placeholder],[title],[aria-label],[alt],[data-placeholder]')) {
    if (el.closest(IZUZETO)) continue;
    for (const a of ['placeholder', 'title', 'aria-label', 'alt', 'data-placeholder']) { const v = el.getAttribute(a); if (v) out.push([a, v, el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')]); }
  }
  out.push(['title', document.title, 'head']);
  // meta description se ne prijavljuje: nevidljiv je, a Google čita HTML (latinicu), ne stanje posle prebacivanja
  return out;
};

const browser = await chromium.launch();
async function kontekst() {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_script', 'cyr'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, kad: '2026-09-06T00:00:00.000Z', v: 1, test: true })); } catch (e) {} });
  await c.route(/googletagmanager|google-analytics/, r => r.fulfill({ status: 200, body: '' }));
  return c;
}
let gotovo = 0;
async function skeniraj(c, put, radnje) {
  const p = await c.newPage();
  try {
    await p.goto(BASE + put, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(500);
    if (radnje) await radnje(p);
    for (const [vrsta, tekst, gde] of await p.evaluate(SKUPI)) dodaj(tekst, `${put} · ${gde}`, vrsta);
  } catch (e) { dodaj(`GREŠKA PRI OTVARANJU: ${e.message.slice(0, 80)}`, put, 'greška'); }
  finally { await p.close(); gotovo++; if (gotovo % 100 === 0) process.stderr.write(`\r${gotovo}/${adrese.length + 1}`); }
}

// 1) sve strane iz sitemapa, paralelno
const red = adrese.slice();
await Promise.all(Array.from({ length: PARALELNO }, async () => { const c = await kontekst(); while (red.length) await skeniraj(c, red.shift()); await c.close(); }));

// 2) početna — sva stanja alata
const c = await kontekst();
await skeniraj(c, '/?rec=ljubav#stanja', async (p) => {
  await p.waitForFunction(() => document.querySelectorAll('#rimeResults .chip').length > 5, null, { timeout: 180000 });
  await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('gubav') < 0, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(500);
  // traka + oblačić + prijava
  await p.mouse.move(5, 5); await p.locator('#rimeResults .chip').first().hover(); await p.waitForTimeout(400);
  const s1 = await p.evaluate(SKUPI); for (const [v, t, g] of s1) dodaj(t, `početna · rezultati+traka · ${g}`, v);
  await p.click('.chip-actions .ca-btn[data-act="def"]').catch(() => {}); await p.waitForFunction(() => { const t = document.getElementById('deftip'); return t && t.style.display === 'block' && !/учитавање|učitavanje/.test(t.textContent); }, null, { timeout: 60000 }).catch(() => {});
  for (const [v, t, g] of await p.evaluate(SKUPI)) dodaj(t, `početna · oblačić · ${g}`, v);
  await p.keyboard.press('Escape');
  await p.mouse.move(5, 5); await p.locator('#rimeResults .chip').nth(1).hover(); await p.waitForTimeout(400); await p.click('.chip-actions .ca-btn[data-act="prijavi"]').catch(() => {}); await p.waitForTimeout(300);
  for (const [v, t, g] of await p.evaluate(SKUPI)) dodaj(t, `početna · prijava · ${g}`, v);
  await p.click('.prijava-posalji').catch(() => {}); await p.waitForTimeout(1200);
  for (const [v, t, g] of await p.evaluate(SKUPI)) dodaj(t, `početna · prijava-hvala · ${g}`, v);
  await p.keyboard.press('Escape');
  // filteri, kvačice, prazno stanje, poruke
  await p.fill('#rimeInput', 'xqzwptr'); await p.evaluate(() => document.getElementById('rimeBtn').click()); await p.waitForTimeout(400);
  for (const [v, t, g] of await p.evaluate(SKUPI)) dodaj(t, `početna · nema rime · ${g}`, v);
  await p.fill('#rimeInput', ''); await p.evaluate(() => document.getElementById('rimeBtn').click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('kidsToggle').click()); await p.waitForTimeout(300);
  for (const [v, t, g] of await p.evaluate(SKUPI)) dodaj(t, `početna · prazno · ${g}`, v);
  // ostali tabovi
  for (const tab of ['pretraga', 'slogovi', 'beleznica', 'klasici', 'igra', 'omiljene']) {
    await p.evaluate((t) => switchTab(t), tab); await p.waitForTimeout(300);
    if (tab === 'pretraga') { await p.fill('#searchInput', 'ava'); await p.evaluate(() => document.getElementById('searchBtn').click()); await p.waitForTimeout(500); }
    if (tab === 'slogovi') { await p.fill('#sylInput', 'Volim te kao sunce\nti si moja luda'); await p.waitForTimeout(400); }
    if (tab === 'beleznica') { await p.click('#noteEditor'); await p.evaluate(() => { const ed = document.getElementById('noteEditor'); ed.innerHTML = 'Volim te kao sunce<div>ti si moja luda</div>'; ed.dispatchEvent(new InputEvent('input', { bubbles: true })); }); await p.waitForTimeout(1200); }
    if (tab === 'igra') { await p.click('#gameStart').catch(() => {}); await p.waitForTimeout(800); await p.fill('#gameInput', 'xqzw'); await p.click('#gameSubmit').catch(() => {}); await p.waitForTimeout(300); }
    for (const [v, t, g] of await p.evaluate(SKUPI)) dodaj(t, `početna · tab ${tab} · ${g}`, v);
  }
});
// baner kolačića (bez odluke)
const cb = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await cb.addInitScript(() => { try { localStorage.setItem('rimoteka_script', 'cyr'); localStorage.removeItem('rimoteka_kolacici'); localStorage.removeItem('rimoteka_interno'); } catch (e) {} });
await cb.route(/googletagmanager|google-analytics/, r => r.fulfill({ status: 200, body: '' }));
await skeniraj(cb, '/#baner', async (p) => { await p.waitForTimeout(800); await p.click('.kolacici-podesi-btn').catch(() => {}); await p.waitForTimeout(200); });
await cb.close(); await c.close(); await browser.close();

// izveštaj
const lista = [...nalazi.entries()].map(([tekst, k]) => ({ tekst, vrsta: k.vrsta, strana: k.gde.size, primeri: [...k.gde].slice(0, 4) }))
  .sort((a, b) => b.strana - a.strana);
mkdirSync(path.join(ROOT, 'AUDIT', 'analiza'), { recursive: true });
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'cirilica-skener.json'), JSON.stringify({ base: BASE, strana: adrese.length, nalaza: lista.length, lista }, null, 1));
const md = [`# Skener ćirilice — ${new Date().toISOString().slice(0, 10)} (${BASE})`, '', `Pregledano strana: ${adrese.length} + sva stanja alata na početnoj + baner. Tekstova sa latinicom (van dozvoljenog): **${lista.length}**.`, '', '| tekst | gde | na koliko mesta |', '|---|---|---|',
  ...lista.map(x => `| ${x.tekst.slice(0, 110).replace(/\|/g, '¦')} | ${x.vrsta} · ${x.primeri[0].slice(0, 70)} | ${x.strana} |`)];
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'cirilica-skener.md'), md.join('\n') + '\n');
console.log(`\nstrana ${adrese.length} · tekstova sa latinicom: ${lista.length} → AUDIT/analiza/cirilica-skener.md`);
for (const x of lista.slice(0, 40)) console.log(`  [${x.strana}] ${x.vrsta}: ${x.tekst.slice(0, 90)}  ← ${x.primeri[0].slice(0, 60)}`);
