/**
 * Skener kontrasta za NOĆNI REŽIM — Rimoteka.
 *
 * Prolazi sve tipove strana i sve tabove, u tamnoj temi, i meri odnos
 * `color` : `background-color` na SAMOM elementu (ne na roditelju), i to:
 *   - za obične tekstualne čvorove (samo listovi, da se tekst ne broji dvaput)
 *   - za `input`, `textarea` i `[contenteditable]` — SA UPISANOM VREDNOŠĆU,
 *     jer vrednost polja živi u `.value`, ne u `textContent` (uzrok 3 iz PROPUSTI.md)
 *   - posebno za linkove, koje vlasnica prijavljuje kao „jedva čitljive"
 *
 * Prag: 4,5:1 za običan tekst, 3:1 za veliki (≥24px, ili ≥18.66px podebljan).
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://localhost:8765';

const MERAC = () => {
  const lum = c => {
    const m = (c || '').match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const razlozi = c => {
    const m = (c || '').match(/[\d.]+/g);
    if (!m) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
  };
  // Prozirnu pozadinu treba SLOŽITI sa onim ispod, ne uzeti njenu nominalnu boju.
  // Bez ovoga „crveno 13% preko tamne" ispadne kao „crveno na crvenom" = 1:1,
  // što je lažan nalaz. Isto važi i za prelive: `background-color` im je
  // proziran, pa bi se merila pozadina roditelja umesto samog dugmeta.
  const poz = e => {
    const slojevi = [];
    let n = e, preliv = false;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (n !== e && /gradient/.test(cs.backgroundImage)) { preliv = true; break; }
      if (n === e && /gradient/.test(cs.backgroundImage)) return { preliv: true };
      const c = razlozi(cs.backgroundColor);
      if (c && c.a > 0) {
        slojevi.push(c);
        if (c.a >= 1) break;
      }
      n = n.parentElement;
    }
    if (preliv) return { preliv: true };
    if (!slojevi.length || slojevi[slojevi.length - 1].a < 1) {
      slojevi.push(razlozi(getComputedStyle(document.documentElement).backgroundColor) || { r:255,g:255,b:255,a:1 });
    }
    // slaganje odozdo nagore
    let out = slojevi[slojevi.length - 1];
    for (let i = slojevi.length - 2; i >= 0; i--) {
      const s2 = slojevi[i];
      out = {
        r: s2.r * s2.a + out.r * (1 - s2.a),
        g: s2.g * s2.a + out.g * (1 - s2.a),
        b: s2.b * s2.a + out.b * (1 - s2.a),
        a: 1
      };
    }
    return { boja: `rgb(${Math.round(out.r)}, ${Math.round(out.g)}, ${Math.round(out.b)})` };
  };
  const put = e => {
    const d = [];
    let n = e;
    for (let i = 0; n && i < 3; i++, n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      else if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.');
      d.unshift(s);
    }
    return d.join(' ');
  };

  const nalazi = [];
  const vidljiv = e => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const izmeri = (e, tekst, tip) => {
    if (!vidljiv(e)) return;
    const cs = getComputedStyle(e);
    const p2 = poz(e);
    // preliv se ne meri automatski — upisuje se posebno i proverava rukom
    if (p2.preliv) return;
    const l1 = lum(cs.color), l2 = lum(p2.boja);
    if (l1 === null || l2 === null) return;
    const o = +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
    const px = parseFloat(cs.fontSize);
    const debeo = +cs.fontWeight >= 700 || cs.fontWeight === 'bold';
    const veliki = px >= 24 || (px >= 18.66 && debeo);
    const prag = veliki ? 3 : 4.5;
    if (o < prag) {
      nalazi.push({ put: put(e), tip, tekst: (tekst || '').trim().slice(0, 26), odnos: o, prag,
                    boja: cs.color, pozadina: p2.boja, px: Math.round(px),
                    link: e.tagName === 'A' });
    }
  };

  // 1) tekstualni listovi
  document.querySelectorAll('body *').forEach(e => {
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|IMG|BR|HR)$/.test(e.tagName)) return;
    if (e.closest('[aria-hidden="true"], .sr-only')) return;
    const svoj = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent).join(' ');
    if (!svoj.trim()) return;
    izmeri(e, svoj, 'tekst');
  });

  // 2) polja — SA vrednošću
  document.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable]').forEach(e => {
    const v = e.value !== undefined ? e.value : e.textContent;
    izmeri(e, v || '(prazno — merim boju vrednosti)', 'polje');
  });

  return nalazi;
};

const STRANE = [
  ['/', null],
  ['/', 'pretraga'], ['/', 'slogovi'], ['/', 'beleznica'],
  ['/', 'klasici'], ['/', 'igra'], ['/', 'omiljene'],
  ['/rimovanje-reci/', null], ['/recnik-srpskog-jezika/', null], ['/slogovi/', null],
  ['/pisanje-pesama/', null], ['/klasici/', null], ['/igra-rimovanja/', null],
  ['/rime-za/ljubav/', null], ['/rime-za-decu/', null], ['/vrste-rima/', null],
  ['/kako-napisati-pesmu/', null], ['/404.html', null],
];

const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
p.setDefaultNavigationTimeout(120000);

const TEMA = process.env.TEMA === 'svetla' ? '0' : '1';
await p.addInitScript(t => { try { localStorage.setItem('rimoteka_dark', t); } catch (e) {} }, TEMA);

const sve = new Map();
for (const [put, tab] of STRANE) {
  await p.goto(BASE + put, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  // popuni polja i otvori tab, da se meri STVARNO stanje, ne prazan ekran
  await p.evaluate(async t => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    if (t && typeof switchTab === 'function') { switchTab(t); await w(500); }
    const ri = document.getElementById('rimeInput');
    if (ri && !ri.closest('[aria-hidden="true"]')) {
      ri.value = 'ljubav';
      const bt = document.getElementById('rimeBtn');
      if (bt) { bt.click(); await w(1500); }
    }
    const si = document.getElementById('searchInput');
    if (si) { si.value = 'srce'; si.dispatchEvent(new Event('input', { bubbles: true })); await w(900); }
    const sy = document.getElementById('sylInput');
    if (sy) { sy.value = 'Ljubav je srce\nkoje kuca'; sy.dispatchEvent(new Event('input', { bubbles: true })); await w(700); }
    const ne = document.getElementById('noteEditor');
    if (ne) { ne.textContent = 'Kad me pitaš gde je nada\nja ti kažem tu je kada'; ne.dispatchEvent(new Event('input', { bubbles: true })); await w(900); }
    const nt = document.getElementById('noteTitle');
    if (nt) nt.value = 'Moja pesma';
    const mt = document.querySelector('.mini-tool input[type=text]');
    if (mt && !mt.value) mt.value = 'ljubav';
  }, tab).catch(() => {});
  await p.waitForTimeout(600);

  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await p.waitForTimeout(300);
  const nalazi = await p.evaluate(MERAC);
  const ime = put + (tab ? ' [tab ' + tab + ']' : '');
  for (const n of nalazi) {
    const k = n.put + '|' + n.tip;
    if (!sve.has(k) || sve.get(k).odnos > n.odnos) sve.set(k, { ...n, gde: ime });
  }
}
await b.close();

const lista = [...sve.values()].sort((a, b2) => a.odnos - b2.odnos);
console.log(`\nTEMA: ${TEMA === '1' ? 'NOĆNI REŽIM' : 'DNEVNI REŽIM'} — nađeno ${lista.length} elemenata ispod praga:\n`);
for (const n of lista) {
  console.log(`${String(n.odnos).padStart(5)}:1 (prag ${n.prag})  ${n.tip.padEnd(6)} ${n.put}`);
  console.log(`             „${n.tekst}"  ${n.boja} na ${n.pozadina}  ${n.px}px  — ${n.gde}`);
}
