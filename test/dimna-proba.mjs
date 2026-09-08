/* DIMNA PROBA – brzi lanac tokom rada (09.09.2026). Ne zamenjuje pun test; proverava da GLAVNE namene rade posle
 * svake izmene: rime (2 reči, redosled po učestalosti), kartica na klik + 5 radnji, pretraga, brojač slogova,
 * beležnica (rime uz stih), igra (start + tačna rima), futer i konzola bez grešaka. Jedan kontekst, jedan rečnik.
 * Pokretanje: node test/dimna-proba.mjs  (BASE=… za produkciju) */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
const BASE = process.env.BASE || 'http://localhost:8765';
const T0 = Date.now(); let pass = 0; const greske = [];
const ok = (ime, uslov, detalj = '') => { if (uslov) { pass++; console.log('  ✅ ' + ime); } else { greske.push(ime + (detalj ? ' – ' + detalj : '')); console.log('  ❌ ' + ime + (detalj ? ' – ' + detalj : '')); } };
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
await c.addInitScript(() => { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_proba', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); });
const p = await c.newPage(); const kon = []; p.on('pageerror', e => kon.push('pageerror ' + e.message.slice(0, 120))); p.on('console', m => { if (m.type() === 'error') kon.push(m.text().slice(0, 120)); });
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000 && typeof RANK !== 'undefined' && RANK.get('ljubav') < 0, null, { timeout: 180000 });
ok('rečnik učitan (> 250.000 reči) sa učestalošću', true);
const rime = async (w) => { await p.fill('#rimeInput', w); await p.evaluate(() => document.getElementById('rimeBtn').click()); await p.waitForTimeout(400); return p.evaluate(() => [...document.querySelectorAll('#rimeResults .res-group')].map(g => ({ n: g.querySelector('h2')?.textContent, reci: [...g.querySelectorAll('.word')].slice(0, 5).map(x => x.textContent.trim()) }))); };
const r1 = await rime('ljubav'); ok('rime za „ljubav": grupa „Najbolje rime" sa „gubav" na vrhu', r1[0] && /Najbolje/.test(r1[0].n) && r1[0].reci[0] === 'gubav', JSON.stringify(r1[0]));
const r2 = await rime('nada'); ok('rime za „nada": prvih pet po učestalosti (kada, sada, tada…)', r2[0] && r2[0].reci.slice(0, 3).join(',') === 'kada,sada,tada', JSON.stringify(r2[0]));
const kol = await p.evaluate(() => { const w = document.querySelector('#rimeResults .res-group .results'); const s = [...w.querySelectorAll('.chip')].map(c => Math.round(c.getBoundingClientRect().width)); return { poravnato: w.classList.contains('poravnato'), min: Math.min(...s), max: Math.max(...s) }; });
ok('ravne kolone (pilule iste širine)', kol.poravnato && kol.max - kol.min <= 1, JSON.stringify(kol));
await p.mouse.move(5, 5); await p.locator('#rimeResults .chip').nth(1).hover(); await p.waitForTimeout(500);
ok('prelazak miša NE otvara karticu', await p.evaluate(() => { const t = document.querySelector('.chip-actions'); return !t || t.hidden; }));
await p.locator('#rimeResults .chip').nth(1).click(); await p.waitForTimeout(350);
ok('klik otvara karticu sa 5 radnji', await p.evaluate(() => { const t = document.querySelector('.chip-actions'); return !!t && !t.hidden && t.querySelectorAll('.ca-btn').length === 5; }));
await p.click('.chip-actions .ca-btn[data-act="def"]'); await p.waitForFunction(() => { const t = document.getElementById('deftip'); return t && t.style.display === 'block' && !/učitavanje/.test(t.textContent); }, null, { timeout: 30000 }).catch(() => {});
ok('„značenje" otvara objašnjenje reči', await p.evaluate(() => { const t = document.getElementById('deftip'); return !!t && t.style.display === 'block' && t.textContent.length > 10; }));
await p.keyboard.press('Escape');
ok('legenda: „Klikni na reč…"', /Klikni na reč/.test(await p.evaluate(() => document.querySelector('.res-legend')?.textContent || '')));
await p.evaluate(() => switchTab('pretraga')); await p.fill('#searchInput', 'ljub'); await p.evaluate(() => document.getElementById('searchBtn').click()); await p.waitForTimeout(500);
ok('pretraga „ljub" daje rezultate', (await p.evaluate(() => document.querySelectorAll('#searchResults .chip, #searchResults .word').length)) > 3);
await p.evaluate(() => switchTab('slogovi')); await p.fill('#sylInput', 'Mesec po bregu mesečinu sipa\npospana polja on umiva zrakom'); await p.waitForTimeout(400);
ok('brojač slogova: 2 reda, broji slogove', /2 reda/.test(await p.evaluate(() => (document.querySelector('.syl-total') || {}).textContent || '')), await p.evaluate(() => (document.querySelector('.syl-total') || {}).textContent || ''));
await p.evaluate(() => switchTab('beleznica')); await p.click('#noteEditor'); await p.evaluate(() => { const ed = document.getElementById('noteEditor'); ed.innerHTML = 'Volim te kao sunce<br>ti si moja luda'; ed.dispatchEvent(new InputEvent('input', { bubbles: true })); const sel = window.getSelection(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }); await p.waitForTimeout(700);
ok('beležnica nudi rime uz stih („luda")', (await p.evaluate(() => document.querySelectorAll('#noteRhymes .chip').length)) > 0, String(await p.evaluate(() => document.querySelectorAll('#noteRhymes .chip').length)));
await p.evaluate(() => switchTab('igra')); await p.evaluate(() => document.getElementById('gameStart').click()); await p.waitForFunction(() => gameState === 'play' && gameCurrentWord, null, { timeout: 10000 }).catch(() => {});
const rec = await p.evaluate(() => gameCurrentWord); const odg = await p.evaluate((w) => { const k = rhymeKey(w); for (let i = 0; i < jekStart; i++) if (MALE[i] !== w.toLowerCase() && WORDS[i].length >= 3 && KEYS[i] === k && !BLOCKED.has(MALE[i])) return WORDS[i]; return null; }, rec);
if (odg) { await p.fill('#gameInput', odg); await p.evaluate(() => document.getElementById('gameSubmit').click()); await p.waitForTimeout(250); }
ok(`igra: reč „${rec}" iz spiska, tačna rima „${odg}" priznata`, !!rec && !!odg && /correct/.test(await p.evaluate(() => document.getElementById('gameFeedback').className)), await p.evaluate(() => document.getElementById('gameFeedback').textContent.slice(0, 60)));
const st = await (await fetch(BASE + '/rime-za/ljubav/')).text();
ok('statička strana /rime-za/ljubav/: ima rime i futer sa pilulama', /class="word"/.test(st) && /footer-rimes/.test(st) && !/<\/a> · <a /.test(st));
ok('konzola bez grešaka', kon.length === 0, kon.slice(0, 3).join(' | '));
await b.close();
console.log(`\n${greske.length ? '❌ PALO ' + greske.length : '✅ SVE ' + pass + ' prošlo'} · ${((Date.now() - T0) / 1000) | 0} s`);
process.exit(greske.length ? 1 : 0);
