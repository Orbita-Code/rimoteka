/* PRE-DEPLOY U SVA TRI MOTORA PREGLEDAČA (zahtev vlasnice 08.09.2026: „hoću da se pređu svi pretraživači
 * posebno i da to bude deo testa pre deploya svaki put").
 *
 * Glavni test (predeploy.mjs, 800+ provera) ide u Chromiumu. Ovaj prolazi KLJUČNE mobilne tokove u
 * WebKit-u (= Safari i SVAKI pregledač na iPhone-u, uključujući Chrome – Apple dozvoljava samo svoj motor)
 * i u Firefox-u, na telefonu 390×844 sa lažiranom tastaturom: rime, traka nad reči, beležnica (traka na vrhu,
 * red sa kursorom vidljiv), brojač slogova (dodir ne odnosi stranu), igra (tačna rima priznata), tabovi,
 * ćirilica, tamna tema, baner. Pada na prvom motoru u kom nešto ne radi.
 *
 * Pokretanje:  node test/predeploy-motori.mjs            (lokalni server se diže sam)
 *              BASE=https://rimoteka.com node test/predeploy-motori.mjs
 *              MOTORI=webkit node test/predeploy-motori.mjs  (samo jedan)
 */
import { chromium, webkit, firefox } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8797;
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const MOTORI = (process.env.MOTORI || 'webkit,firefox,chromium').split(',');
let pass = 0; const greske = [];
const ok = (ime, uslov, detalj = '') => { if (uslov) { pass++; console.log('  ✅ ' + ime); } else { greske.push(ime + (detalj ? ' – ' + detalj : '')); console.log('  ❌ ' + ime + (detalj ? ' – ' + detalj : '')); } };
const pauza = ms => new Promise(r => setTimeout(r, ms));
const TASTATURA = async (p) => p.evaluate(async () => { const VV = window.visualViewport; const nova = window.innerHeight - 336; Object.defineProperty(VV, 'height', { get: () => nova, configurable: true }); Object.defineProperty(VV, 'offsetTop', { get: () => 0, configurable: true }); VV.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('resize')); await new Promise(r => setTimeout(r, 500)); return nova; });

let server = null;
if (!process.env.BASE) {
  server = spawn('node', [path.join(ROOT, 'test', 'static-server.mjs'), path.join(ROOT, 'public'), String(PORT)]);
  await new Promise((r, x) => { const t = setTimeout(() => x(new Error('server')), 15000); server.stdout.on('data', d => { if (String(d).includes('spreman')) { clearTimeout(t); r(); } }); });
}
const MOTOR = { webkit, firefox, chromium };
try {
  for (const ime of MOTORI) {
    console.log(`\n═══ ${ime.toUpperCase()} ${ime === 'webkit' ? '(Safari + Chrome/Firefox na iPhone-u)' : ''} ═══`);
    let browser;
    try { browser = await MOTOR[ime].launch(); } catch (e) { ok(`${ime} · motor se pokreće`, false, e.message.slice(0, 120)); continue; }
    const konzola = [];
    const ctx = async (opt = {}) => {
      // Firefox ne podržava isMobile – telefon se emulira širinom i dodirom
      const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(ime === 'firefox' ? {} : { isMobile: true }), ...opt });
      await c.addInitScript((o) => { try { localStorage.setItem('rimoteka_interno', '1'); localStorage.setItem('rimoteka_kolacici', JSON.stringify({ analitika: true, v: 1, test: true })); if (o.cyr) localStorage.setItem('rimoteka_script', 'cyr'); if (o.dark) localStorage.setItem('rimoteka_dark', '1'); } catch (e) {} }, opt.__o || {});
      await c.route(/googletagmanager|google-analytics/, r => r.fulfill({ status: 200, body: '' }));
      return c;
    };
    const stranica = async (c) => { const p = await c.newPage(); p.on('pageerror', e => konzola.push(`${ime}: ${e.message.slice(0, 120)}`)); p.on('console', m => { if (m.type() === 'error' && !/favicon|net::|Failed to load resource/.test(m.text())) konzola.push(`${ime}: ${m.text().slice(0, 120)}`); }); return p; };
    const dodir = async (p, sel) => { try { await p.tap(sel, { timeout: 8000 }); } catch (e) { await p.click(sel, { timeout: 8000 }); } };

    // 1) RIME + TRAKA + PRIJAVA sa tastaturom
    {
      const c = await ctx(); const p = await stranica(c);
      await p.goto(BASE + '/?rec=nada', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => document.querySelectorAll('#rimeResults .chip').length > 5, null, { timeout: 180000 });
      await p.waitForFunction(() => typeof RANK !== 'undefined' && RANK.get('ljubav') < 0, null, { timeout: 30000 }).catch(() => {}); await pauza(500);
      const r1 = await p.evaluate(() => ({ chip: document.querySelectorAll('#rimeResults .chip').length, prvi: (document.querySelector('#rimeResults .chip .word') || {}).textContent, grupe: [...document.querySelectorAll('#rimeResults h2')].map(h => h.textContent), sirina: document.documentElement.scrollWidth }));
      ok(`${ime} · rime za „nada": ${r1.chip} kapsula, grupe ${r1.grupe.join('/')}`, r1.chip > 20 && /Najbolje/.test(r1.grupe[0] || ''), JSON.stringify(r1));
      ok(`${ime} · strana ne preliva vodoravno`, r1.sirina <= 390, `${r1.sirina}`);
      const cip = p.locator('#rimeResults .chip').nth(1); await cip.scrollIntoViewIfNeeded(); await dodir(p, '#rimeResults .chip:nth-child(2)');
      await pauza(400);
      const t1 = await p.evaluate(() => { const t = document.querySelector('.chip-actions'); const r = t ? t.getBoundingClientRect() : null; return { traka: !!t && !t.hidden, dugmadi: t ? t.querySelectorAll('.ca-btn').length : 0, uEkranu: r ? r.left >= 0 && r.right <= 390 : false }; });
      ok(`${ime} · dodir na reč otvara traku sa 5 radnji, u ekranu`, t1.traka && t1.dugmadi === 5 && t1.uEkranu, JSON.stringify(t1));
      await dodir(p, '.chip-actions .ca-btn[data-act="def"]');
      await p.waitForFunction(() => { const t = document.getElementById('deftip'); return t && t.style.display === 'block' && !/učitavanje/.test(t.textContent); }, null, { timeout: 60000 }).catch(() => {});
      const d1 = await p.evaluate(() => { const t = document.getElementById('deftip'); const r = t.getBoundingClientRect(); return { tekst: t.textContent.slice(0, 40), u: r.left >= 0 && r.right <= 390 }; });
      ok(`${ime} · oblačić sa značenjem se otvara i staje u ekran`, d1.tekst.length > 5 && d1.u, JSON.stringify(d1));
      await p.keyboard.press('Escape');
      await cip.scrollIntoViewIfNeeded(); await dodir(p, '#rimeResults .chip:nth-child(2)'); await pauza(300); await dodir(p, '.chip-actions .ca-btn[data-act="prijavi"]'); await pauza(400);
      const vid = await TASTATURA(p);
      const pr = await p.evaluate(() => { const b = document.querySelector('.prijava'); const r = b ? b.getBoundingClientRect() : null; return r ? { dno: Math.round(r.bottom), l: Math.round(r.left), d: Math.round(r.right) } : null; });
      ok(`${ime} · prozorčić prijave staje u ekran i iznad tastature`, !!pr && pr.dno <= vid + 1 && pr.l >= 0 && pr.d <= 390, JSON.stringify(pr) + ` tastatura od ${vid}`);
      await c.close();
    }
    // 2) BELEŽNICA sa tastaturom: traka na vrhu, red sa kursorom vidljiv, gutter čitav
    for (const cyr of [false, true]) {
      const c = await ctx({ __o: { cyr } }); const p = await stranica(c);
      await p.goto(BASE + '/pisanje-pesama/', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 });
      await dodir(p, '#noteEditor');
      await p.evaluate((cyr) => { const ed = document.getElementById('noteEditor'); ed.innerHTML = cyr ? 'Како је досадно бити порастао<div>Да знају то, нико не би порастао</div><div>Ма каква зубић вила</div>' : 'Kako je dosadno biti porastao<div>Da znaju to, niko ne bi porastao</div><div>Ma kakva zubić vila</div>'; ed.dispatchEvent(new InputEvent('input', { bubbles: true })); }, cyr);
      await pauza(1200);
      const vid = await TASTATURA(p);
      await p.evaluate(() => { const ed = document.getElementById('noteEditor'); const sel = window.getSelection(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); ed.dispatchEvent(new InputEvent('input', { bubbles: true })); }); await pauza(1300);
      const b = await p.evaluate(() => { const box = document.getElementById('noteRhymes'); const r = box.getBoundingClientRect(); const ed = document.getElementById('noteEditor'); const zadnji = [...ed.childNodes].reverse().find(n => n.textContent && n.textContent.trim()); const z = (zadnji && zadnji.nodeType === 1 ? zadnji : ed).getBoundingClientRect();
        const g = document.querySelector('.gutter'); const gr = g.getBoundingClientRect(); const br = [...g.querySelectorAll('.g-syl')].map(e => Math.round(e.getBoundingClientRect().right));
        return { trakaVrh: Math.round(r.top), trakaDno: Math.round(r.bottom), rime: box.querySelectorAll('.chip').length, red: { top: Math.round(z.top), bottom: Math.round(z.bottom) }, gutterDesno: Math.round(gr.right), brojeviDesno: Math.max(...br, 0), brojevi: [...g.querySelectorAll('.g-syl')].map(e => e.textContent) }; });
      ok(`${ime} · beležnica${cyr ? ' (ćirilica)' : ''} · traka sa rimama na vrhu ekrana, ${b.rime} rima`, b.trakaVrh <= 1 && b.rime > 0, JSON.stringify(b));
      ok(`${ime} · beležnica${cyr ? ' (ćirilica)' : ''} · red sa kursorom ISPOD trake i IZNAD tastature`, b.red.top >= b.trakaDno - 1 && b.red.bottom <= vid + 1, `red ${b.red.top}–${b.red.bottom}, traka do ${b.trakaDno}, tastatura od ${vid}`);
      ok(`${ime} · beležnica${cyr ? ' (ćirilica)' : ''} · brojevi slogova nisu odsečeni (${b.brojevi.join(',')})`, b.brojeviDesno <= b.gutterDesno, `broj do ${b.brojeviDesno}, kolona do ${b.gutterDesno}`);
      if (!cyr) {
      /* ENTER USRED PESME (prijava vlasnice 08.09.2026: „Enter za novi red me baci na poslednji red beležnice"):
         12 stihova, kursor na kraju 2. reda, Enter → strana sme da se pomeri najviše za jedan red, a novi red
         mora da ostane između trake i tastature. Uzrok je bio pravougaonik CELOG editora kao zamena za prazan red. */
      await p.evaluate((st) => { const ed = document.getElementById('noteEditor'); ed.innerHTML = st.join('<br>'); ed.dispatchEvent(new InputEvent('input', { bubbles: true })); }, ['Mesec po bregu mesečinu sipa','pospana polja on umiva zrakom','a mati moja šećerom posipa','kolače što ću podeliti s Markom','Kroz prozor gledam tu haljinu belu','i čekam kad će zvono da zazvrči','jer lavež pasa odzvanja po selu','zbog Milice što sokakom trči','Zvono se začu a misao puče','i slika što se kroz prozor nazrla','Da li je to ona moje milo luče','Pred vratima behu dva oka vrla']);
      await pauza(500);
      await p.evaluate(() => { const ed = document.getElementById('noteEditor'); const sel = window.getSelection(); const r = document.createRange(); let tn = null, k = 0; for (const n of ed.childNodes) { if (n.nodeType === 3 && n.data.trim()) { k++; if (k === 2) { tn = n; break; } } } r.setStart(tn, tn.data.length); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); });
      await pauza(500);
      const preEnter = await p.evaluate(() => Math.round(window.scrollY));
      await p.keyboard.press('Enter'); await pauza(700);
      const e2 = await p.evaluate(() => { const ed = document.getElementById('noteEditor'); const box = document.getElementById('noteRhymes'); const tr = box.getBoundingClientRect(); const vv = window.visualViewport; const sel = window.getSelection(); const rng = sel.getRangeAt(0); let r = rng.getBoundingClientRect(); if (!r.height) { const sc = rng.startContainer; const pre = sc.nodeType === 1 && rng.startOffset > 0 ? sc.childNodes[rng.startOffset - 1] : null; if (pre && pre.getBoundingClientRect) { const pr = pre.getBoundingClientRect(); r = { top: pr.bottom, bottom: pr.bottom + 30 }; } } const edr = ed.getBoundingClientRect(); return { scrollY: Math.round(window.scrollY), kursorTop: Math.round(r.top), kursorDno: Math.round(r.bottom), trakaDno: Math.round(tr.bottom), vid: vv.height, dnoEditora: Math.round(edr.bottom), redova: (ed.innerText.match(/\n/g) || []).length }; });
      ok(`${ime} · beležnica · Enter usred pesme NE baca na dno (pomak ${e2.scrollY - preEnter} px, dozvoljeno ≤ 40)`, Math.abs(e2.scrollY - preEnter) <= 40, JSON.stringify({ preEnter, e2 }));
      ok(`${ime} · beležnica · posle Entera novi red je između trake i tastature`, e2.kursorTop >= e2.trakaDno - 2 && e2.kursorDno <= e2.vid + 2, JSON.stringify(e2));
      }
      await c.close();
    }
    // 3) BROJAČ SLOGOVA: dodir u prazno polje ne odnosi stranu
    {
      const c = await ctx(); const p = await stranica(c);
      await p.goto(BASE + '/slogovi/', { waitUntil: 'domcontentloaded' }); await pauza(500);
      await dodir(p, '#sylInput');
      const pre = await p.evaluate(() => window.scrollY); await TASTATURA(p);
      const s = await p.evaluate(() => ({ scrollY: window.scrollY, top: Math.round(document.getElementById('sylInput').getBoundingClientRect().top) }));
      ok(`${ime} · brojač slogova · dodir u prazno polje pomeri stranu ≤ 120 px, vrh polja u kadru`, s.scrollY - pre <= 120 && s.top > 60, JSON.stringify({ pre, s }));
      await p.fill('#sylInput', 'Volim te kao sunce\nti si moja luda'); await pauza(500);
      ok(`${ime} · brojač slogova · broji stihove i slogove`, /2 reda/.test(await p.evaluate(() => (document.querySelector('.syl-total') || {}).textContent || '')), await p.evaluate(() => (document.querySelector('.syl-total') || {}).textContent || ''));
      await c.close();
    }
    // 4) IGRA: pokreće se, tačna rima priznata, nepostojeća odbijena
    {
      const c = await ctx(); const p = await stranica(c);
      await p.goto(BASE + '/igra-rimovanja/', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof WORDS !== 'undefined' && WORDS.length > 250000, null, { timeout: 180000 }); await pauza(300);
      await dodir(p, '#gameStart');
      await p.waitForFunction(() => document.getElementById('gamePlay').style.display === 'block' && document.getElementById('gameWord').textContent !== '...', null, { timeout: 15000 }).catch(() => {});
      const rec = await p.evaluate(() => gameCurrentWord);
      await p.fill('#gameInput', 'xqzwv'); await dodir(p, '#gameSubmit'); await pauza(300);
      const fb1 = await p.evaluate(() => document.getElementById('gameFeedback').className);
      const tacna = await p.evaluate((w) => { const k = rhymeKey(w); for (let i = 0; i < jekStart; i++) if (WORDS[i] !== w && KEYS[i] === k && !BLOCKED.has(MALE[i])) return WORDS[i]; return null; }, rec);
      await p.fill('#gameInput', tacna || 'kuća'); await dodir(p, '#gameSubmit'); await pauza(300);
      const fb2 = await p.evaluate(() => document.getElementById('gameFeedback').className);
      ok(`${ime} · igra · „${rec}": nepostojeća reč odbijena, tačna rima „${tacna}" priznata`, /hint/.test(fb1) && /correct/.test(fb2), `${fb1} / ${fb2}`);
      await c.close();
    }
    // 5) TABOVI + ĆIRILICA + TAMNA + BANER
    {
      const c = await ctx({ __o: { cyr: true, dark: true } }); const p = await stranica(c);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pauza(600);
      const t = await p.evaluate(() => ({ tamna: document.body.classList.contains('dark-mode'), h1: document.querySelector('h1').textContent, tab: [...document.querySelectorAll('#tabs [data-tab]')].map(a => a.textContent.trim()).slice(0, 3), futer: (document.querySelector('.footer-orbita') || {}).textContent || '' }));
      ok(`${ime} · tamna tema + ćirilica: h1 ćirilicom, tabovi ćirilicom, „Powered by Orbita Code" latinicom`, t.tamna && /[Ѐ-ӿ]/.test(t.h1) && t.tab.every(x => /[Ѐ-ӿ]/.test(x)) && /Orbita Code/.test(t.futer), JSON.stringify(t));
      await dodir(p, '#tabs [data-tab="slogovi"]'); await pauza(300);
      ok(`${ime} · tab „slogovi" se prebacuje i adresa prati`, await p.evaluate(() => document.getElementById('panel-slogovi').classList.contains('active') && /slogovi/.test(location.pathname)));
      await c.close();
      const cb = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(ime === 'firefox' ? {} : { isMobile: true }) });
      await cb.addInitScript(() => { try { localStorage.removeItem('rimoteka_kolacici'); localStorage.removeItem('rimoteka_interno'); } catch (e) {} });
      await cb.route(/googletagmanager|google-analytics/, r => r.fulfill({ status: 200, body: '' }));
      const pb = await stranica(cb); await pb.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await pauza(900);
      const bn = await pb.evaluate(() => { const k = document.querySelector('.kolacici'); const r = k ? k.getBoundingClientRect() : null; const i = document.getElementById('rimeInput').getBoundingClientRect(); return { ima: !!k, dugmad: k ? [...k.querySelectorAll('.kolacici-dugmad button')].map(b => b.textContent) : [], neZaklanja: r ? r.top > i.bottom : false, udeo: r ? Math.round(r.height / window.innerHeight * 100) : 0 }; });
      ok(`${ime} · baner: vidi se, ne zaklanja polje, ${bn.udeo} % ekrana`, bn.ima && bn.dugmad.length === 2 && bn.neZaklanja && bn.udeo < 25, JSON.stringify(bn));
      await cb.close();
    }
    ok(`${ime} · nijedna greška u konzoli`, konzola.length === 0, konzola.slice(0, 3).join(' | '));
    await browser.close();
  }
} finally {
  if (server) { try { process.kill(server.pid); } catch {} }
}
console.log('\n' + '─'.repeat(62));
if (greske.length) { console.log(`❌ MOTORI: PALO ${greske.length} (prošlo ${pass}). NE DEPLOYUJ.`); greske.forEach(g => console.log('   • ' + g)); process.exit(1); }
console.log(`✅ MOTORI: svih ${pass} provera prošlo u ${MOTORI.join(', ')}. Sme deploy.`);
