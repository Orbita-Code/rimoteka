/* SKENER TAMNOG REŽIMA — čitljivost i stanje na svakoj vrsti strane (zahtev vlasnice 08.09.2026).
 *
 * Za svaku VRSTU strane (početna sa svim tabovima i stanjima, strana reči, hub, slogovi, vodiči, tematske,
 * 404) uključi tamni režim i izmeri SVAKI vidljiv tekst: boju slova naspram stvarne pozadine iza njega
 * (ide uz roditelje dok ne nađe neprozirnu pozadinu). Prijavljuje: tekst ispod 4,5 (sitan) / 3 (krupan
 * ≥24 px ili ≥19 px podebljan), polja za unos ispod 4,5, okvire polja/dugmadi ispod 3, i elemente koji
 * u tamnoj temi imaju TVRDO upisanu belu pozadinu (#fff) — najčešći uzrok „belih okvira".
 * Plus stanje: tema preživi F5, drugi tab (nova strana), zatvaranje i ponovni dolazak, i prati sistemsku
 * postavku kad korisnik nije birao.
 *
 * Izlaz: AUDIT/analiza/tamna-skener.json + .md (jedinstveni nalazi, sa merenjem, po strani i elementu).
 * Pokretanje: node test/skener-tamna.mjs     (lokalni server 8765) · BASE=https://rimoteka.com …
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://localhost:8765';

const sm = readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
const sve = [...sm.matchAll(/<loc>https:\/\/rimoteka\.com([^<]*)<\/loc>/g)].map(m => m[1]);
// vrste strana: sve što nije /rime-za/<reč>/ + 6 strana reči (različite dužine) + hub + 404
const strane = [...new Set([...sve.filter(u => !/^\/rime-za\/[^/]+\/$/.test(u)), '/rime-za/ljubav/', '/rime-za/srce/', '/rime-za/sunce/', '/rime-za/beograd/', '/rime-za/zvezda/', '/rime-za/a/', '/404.html'])];

const MERI = () => {
  const pRGB = s => { const m = (s || '').match(/[\d.]+/g) || [0, 0, 0, 1]; return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const odnos = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const mesaj = (top, dole) => ({ r: top.r * top.a + dole.r * (1 - top.a), g: top.g * top.a + dole.g * (1 - top.a), b: top.b * top.a + dole.b * (1 - top.a), a: 1 });
  const pozadina = (el) => { let boja = { r: 255, g: 255, b: 255, a: 1 }; const lanac = []; let e = el; while (e) { lanac.push(e); e = e.parentElement; } lanac.reverse();
    for (const x of lanac) { const cs = getComputedStyle(x); const bg = pRGB(cs.backgroundColor); if (bg.a > 0) boja = mesaj(bg, boja); if (/gradient/.test(cs.backgroundImage)) return { boja, gradijent: true }; } return { boja, gradijent: false }; };
  const nalazi = [];
  const opis = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const videni = new Set(); let n;
  while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || videni.has(el) || el.closest('script,style,noscript,[hidden],.sr-only')) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.opacity === '0') continue; videni.add(el);
    const boja = pRGB(cs.color); const { boja: bg, gradijent } = pozadina(el); if (gradijent) continue; const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const krupan = size >= 24 || (size >= 18.66 && bold); const granica = krupan ? 3 : 4.5; const k = odnos(boja, bg);
    if (k < granica) nalazi.push({ vrsta: 'tekst', el: opis(el), tekst: t.slice(0, 40), kontrast: Math.round(k * 100) / 100, granica, boja: cs.color, pozadina: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` }); }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable],button,.chip,.syl-filter button,.loose-toggle')) { const r = el.getBoundingClientRect(); if (!r.width || el.closest('[hidden]')) continue; const cs = getComputedStyle(el); const bg = pRGB(cs.backgroundColor); const { boja: iza } = pozadina(el.parentElement || el);
    if (/input|textarea/i.test(el.tagName) || el.isContentEditable) { const efektivna = bg.a > 0 ? mesaj(bg, iza) : iza; const k = odnos(pRGB(cs.color), efektivna); if (k < 4.5) nalazi.push({ vrsta: 'polje', el: opis(el), kontrast: Math.round(k * 100) / 100, granica: 4.5, boja: cs.color, pozadina: cs.backgroundColor }); }
    const okvir = pRGB(cs.borderTopColor); if (parseFloat(cs.borderTopWidth) > 0 && okvir.a > 0) { const k = odnos(mesaj(okvir, iza), iza); if (k < 3 && !/gradient/.test(cs.backgroundImage) && bg.a < 0.99) nalazi.push({ vrsta: 'okvir', el: opis(el), kontrast: Math.round(k * 100) / 100, granica: 3, boja: cs.borderTopColor }); }
    if (document.body.classList.contains('dark-mode') && /^rgb\(255, 255, 255\)$/.test(cs.backgroundColor) && el.getClientRects().length) nalazi.push({ vrsta: 'bela-pozadina-u-tamnoj', el: opis(el), boja: cs.backgroundColor }); }
  return nalazi;
};

const browser = await chromium.launch();
const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
await c.addInitScript(() => { try { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_proba', '1');   /* prijave iz skenera su PROBE – 08.09. je skener 11 puta upisao „ubav“ u pravo sanduče */ localStorage.setItem('rimoteka_dark', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, kad: '2026-09-06T00:00:00.000Z', v: 1, test: true })); } catch (e) {} });
await c.route(/googletagmanager|google-analytics/, r => r.fulfill({ status: 200, body: '' }));
const svi = new Map();
const upisi = (gde, lista) => { for (const x of lista) { const k = `${x.vrsta}|${x.el}|${x.kontrast || ''}|${x.tekst || ''}`; const z = svi.get(k) || { ...x, gde: new Set() }; z.gde.add(gde); svi.set(k, z); } };
const p = await c.newPage();
for (const put of strane) {
  try { await p.goto(BASE + put, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(600);
    const tamna = await p.evaluate(() => document.body.classList.contains('dark-mode'));
    if (!tamna) upisi(put, [{ vrsta: 'tema-nije-tamna', el: 'body' }]);
    upisi(put, await p.evaluate(MERI));
  } catch (e) { upisi(put, [{ vrsta: 'greška', el: e.message.slice(0, 60) }]); }
}
// početna: stanja
await p.goto(BASE + '/?rec=ljubav', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => document.querySelectorAll('#rimeResults .chip').length > 5, null, { timeout: 180000 });
await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('gubav') < 0, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(500);
upisi('/ rezultati', await p.evaluate(MERI));
await p.mouse.move(5, 5); await p.locator('#rimeResults .chip').first().hover(); await p.waitForTimeout(650); upisi('/ traka', await p.evaluate(MERI));
await p.click('.chip-actions .ca-btn[data-act="def"]').catch(() => {}); await p.waitForFunction(() => { const t = document.getElementById('deftip'); return t && t.style.display === 'block' && !/učitavanje/.test(t.textContent); }, null, { timeout: 60000 }).catch(() => {}); upisi('/ oblačić', await p.evaluate(MERI)); await p.keyboard.press('Escape');
await p.mouse.move(5, 5); await p.locator('#rimeResults .chip').nth(1).hover(); await p.waitForTimeout(650); await p.click('.chip-actions .ca-btn[data-act="prijavi"]').catch(() => {}); await p.waitForTimeout(300); upisi('/ prijava', await p.evaluate(MERI)); await p.keyboard.press('Escape');
await p.fill('#rimeInput', 'xqzwptr'); await p.evaluate(() => document.getElementById('rimeBtn').click()); await p.waitForTimeout(300); upisi('/ nema rime', await p.evaluate(MERI));
for (const tab of ['pretraga', 'slogovi', 'beleznica', 'klasici', 'igra', 'omiljene']) {
  await p.evaluate((t) => switchTab(t), tab); await p.waitForTimeout(300);
  if (tab === 'pretraga') { await p.fill('#searchInput', 'ava'); await p.evaluate(() => document.getElementById('searchBtn').click()); await p.waitForTimeout(500); }
  if (tab === 'slogovi') { await p.fill('#sylInput', 'Volim te kao sunce\nti si moja luda'); await p.waitForTimeout(400); }
  if (tab === 'beleznica') { await p.click('#noteEditor'); await p.evaluate(() => { const ed = document.getElementById('noteEditor'); ed.innerHTML = 'Volim te kao sunce<div>ti si moja luda</div>'; ed.dispatchEvent(new InputEvent('input', { bubbles: true })); }); await p.waitForTimeout(1200); }
  if (tab === 'igra') { await p.click('#gameStart').catch(() => {}); await p.waitForTimeout(800); }
  upisi('/ tab ' + tab, await p.evaluate(MERI));
  if (tab === 'igra') {
    // ekran predaje i ekran rezultata (nalaz 08.09.: stavke rezultata u tamnoj imale kontrast 1,11)
    await p.evaluate(() => { gamePlayersData = [{ score: 130, correct: 4, wrong: 1, maxCombo: 4, ishodi: [] }, { score: 130, correct: 3, wrong: 2, maxCombo: 2, ishodi: [] }, { score: 90, correct: 3, wrong: 2, maxCombo: 2, ishodi: [] }]; gamePlayers = 3; gameCurrentPlayerIdx = 1; gameWordsPerPlayer = 5; showHandoff(); });
    await p.waitForTimeout(200); upisi('/ igra predaja', await p.evaluate(MERI));
    await p.evaluate(() => { gameMaxCombo = 5; showResults(); }); await p.waitForTimeout(200); upisi('/ igra rezultati', await p.evaluate(MERI));
  }
}
// baner kolačića u tamnoj
const cb = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
await cb.addInitScript(() => { try { localStorage.setItem('rimoteka_dark', '1'); localStorage.removeItem('rimoteka_kolacici'); localStorage.removeItem('rimoteka_interno'); } catch (e) {} });
await cb.route(/googletagmanager|google-analytics/, r => r.fulfill({ status: 200, body: '' }));
const pb = await cb.newPage(); await pb.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pb.waitForTimeout(900); await pb.click('.kolacici-podesi-btn').catch(() => {}); await pb.waitForTimeout(200); upisi('/ baner (telefon)', await pb.evaluate(MERI)); await cb.close();

// STANJE TEME: F5, druga strana, „zatvori i vrati se", sistemska postavka bez izbora
const stanje = {};
{ const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' }); await c2.addInitScript(() => { try { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_proba', '1');   /* prijave iz skenera su PROBE – 08.09. je skener 11 puta upisao „ubav“ u pravo sanduče */ localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); } catch (e) {} });
  const q = await c2.newPage(); await q.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await q.click('#darkToggle'); await q.waitForTimeout(200);
  stanje.klik = await q.evaluate(() => document.body.classList.contains('dark-mode'));
  await q.reload({ waitUntil: 'domcontentloaded' }); stanje.f5 = await q.evaluate(() => document.body.classList.contains('dark-mode'));
  await q.goto(BASE + '/slogovi/', { waitUntil: 'domcontentloaded' }); stanje.drugaStrana = await q.evaluate(() => document.body.classList.contains('dark-mode'));
  const q2 = await c2.newPage(); await q2.goto(BASE + '/rime-za/ljubav/', { waitUntil: 'domcontentloaded' }); stanje.noviTab = await q2.evaluate(() => document.body.classList.contains('dark-mode'));
  await q.close(); await q2.close();
  const q3 = await c2.newPage(); await q3.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); stanje.ponovniDolazak = await q3.evaluate(() => document.body.classList.contains('dark-mode'));
  stanje.metaThemeColor = await q3.evaluate(() => (document.querySelector('meta[name="theme-color"]') || {}).content);
  stanje.colorScheme = await q3.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  await c2.close();
  const c3 = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' }); await c3.addInitScript(() => { try { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_proba', '1');   /* prijave iz skenera su PROBE – 08.09. je skener 11 puta upisao „ubav“ u pravo sanduče */ localStorage.removeItem('rimoteka_dark'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); } catch (e) {} });
  const q4 = await c3.newPage(); await q4.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); stanje.sistemTamnaBezIzbora = await q4.evaluate(() => document.body.classList.contains('dark-mode')); await c3.close();
}
await browser.close();

const lista = [...svi.values()].map(x => ({ ...x, gde: [...x.gde] })).sort((a, b) => (a.kontrast || 0) - (b.kontrast || 0));
mkdirSync(path.join(ROOT, 'AUDIT', 'analiza'), { recursive: true });
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'tamna-skener.json'), JSON.stringify({ base: BASE, strana: strane.length, stanje, nalazi: lista }, null, 1));
const md = [`# Skener tamnog režima — ${new Date().toISOString().slice(0, 10)} (${BASE})`, '', `Strana (vrste): ${strane.length} + 12 stanja alata + baner. Nalaza: **${lista.length}**.`, '', '## Stanje teme', '', `| klik | F5 | druga strana | novi tab | ponovni dolazak | sistem tamna, bez izbora | meta theme-color | color-scheme |`, '|---|---|---|---|---|---|---|---|', `| ${stanje.klik} | ${stanje.f5} | ${stanje.drugaStrana} | ${stanje.noviTab} | ${stanje.ponovniDolazak} | ${stanje.sistemTamnaBezIzbora} | ${stanje.metaThemeColor} | ${stanje.colorScheme} |`, '', '## Nalazi', '', '| vrsta | element | tekst | kontrast | treba | boja / pozadina | gde |', '|---|---|---|---|---|---|---|',
  ...lista.map(x => `| ${x.vrsta} | ${x.el} | ${(x.tekst || '').replace(/\|/g, '¦')} | ${x.kontrast || ''} | ${x.granica || ''} | ${x.boja || ''} / ${x.pozadina || ''} | ${x.gde.slice(0, 3).join(', ')}${x.gde.length > 3 ? ` (+${x.gde.length - 3})` : ''} |`)];
writeFileSync(path.join(ROOT, 'AUDIT', 'analiza', 'tamna-skener.md'), md.join('\n') + '\n');
console.log(`strana ${strane.length} · nalaza ${lista.length} · stanje ${JSON.stringify(stanje)}`);
for (const x of lista.slice(0, 30)) console.log(`  ${x.vrsta} ${x.el} ${x.kontrast || ''}/${x.granica || ''} „${x.tekst || ''}" ← ${x.gde[0]}`);
