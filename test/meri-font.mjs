/* Meri odnos širina web-fonta prema Arialu, na pravim rečenicama sa sajta.
   Brojevi se MERE, ne prepisuju — pravilo iz style.css (nalaz P16).

   ⚠️ ZAMKA KOJA SE STVARNO DESILA (30.07.2026): prva verzija ovog merenja nije
   čekala da se font UČITA. `document.fonts.check` je vraćao false, a skripta je
   uredno ispisivala brojeve — merila je Arial protiv Ariala. Zato su za dva
   RAZLIČITA fonta izašli ISTI brojevi (0,9131 / 0,9214 / 0,8992 / 0,8837), i to je
   bio jedini znak da nešto nije u redu.
   Sada skripta PADA ako font nije učitan, i to za svaki podskup posebno — ćirilica
   je kod Google-a odvojen fajl (`unicode-range`), pa se mora tražiti ćiriličnim
   tekstom, inače se učita samo latinica.

   Pokretanje:  node meri-font.mjs "Fira Sans" */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';

const FONT = process.argv[2] || 'Fira Sans';
const URL_FONT = FONT.replace(/ /g, '+');

const RECENICE = [
  ['latinica', 'Rimoteka — pronađi rimu za svaku reč srpskog jezika'],
  ['latinica', 'Najbolje rime imaju isti broj slogova kao tražena reč'],
  ['ćirilica', 'Упиши реч и добићеш риме, синониме и објашњење'],
  ['ćirilica', 'Брзо, тачно и без затрпавања — алат за писање песама'],
];

const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=${URL_FONT}:wght@400;500;600;700&display=swap" rel="stylesheet">
</head><body><div id="m" style="position:absolute;white-space:nowrap;font-size:16px"></div></body></html>`);

// izričito traži i latinicu i ćirilicu — to su dva odvojena fajla
const ucitano = await p.evaluate(async (font) => {
  await Promise.all([
    document.fonts.load(`400 16px "${font}"`, 'Rimoteka'),
    document.fonts.load(`600 16px "${font}"`, 'Rimoteka'),
    document.fonts.load(`400 16px "${font}"`, 'Ћирилица'),
    document.fonts.load(`600 16px "${font}"`, 'Ћирилица'),
  ]);
  await document.fonts.ready;
  return {
    lat: document.fonts.check(`400 16px "${font}"`, 'Rimoteka'),
    cir: document.fonts.check(`400 16px "${font}"`, 'Ћирилица'),
    ucitanih: [...document.fonts].filter(f => f.status === 'loaded').length,
  };
}, FONT);

console.log(`\n  FONT: ${FONT}`);
console.log(`  učitano — latinica: ${ucitano.lat ? 'DA' : 'NE'} · ćirilica: ${ucitano.cir ? 'DA' : 'NE'} · fajlova: ${ucitano.ucitanih}`);
if (!ucitano.lat || !ucitano.cir) {
  console.error(`\n  ❌ MERENJE NE VREDI — font nije učitan. Ne upisivati nikakve brojeve.`);
  await b.close();
  process.exit(1);
}

const rez = await p.evaluate(({ font, recenice }) => {
  const m = document.getElementById('m');
  const meri = (fam, txt) => { m.style.fontFamily = fam; m.textContent = txt; return m.getBoundingClientRect().width; };
  const out = recenice.map(([pismo, t]) => {
    const w = meri(`"${font}"`, t), a = meri('Arial', t);
    return { pismo, tekst: t.slice(0, 32), font: +w.toFixed(1), arial: +a.toFixed(1), odnos: +(w / a).toFixed(4) };
  });
  const cv = document.createElement('canvas').getContext('2d');
  const met = (fam) => { cv.font = `100px ${fam}`; const mm = cv.measureText('Hxdpj'); return {
    asc: +(mm.fontBoundingBoxAscent / 100).toFixed(4), desc: +(mm.fontBoundingBoxDescent / 100).toFixed(4) }; };
  return { redovi: out, fontMet: met(`"${font}"`), arialMet: met('Arial') };
}, { font: FONT, recenice: RECENICE });

console.log(`\n  odnos širina prema Arialu (16px):\n`);
for (const r of rez.redovi)
  console.log(`    ${r.odnos.toFixed(4)}  ${r.pismo.padEnd(9)} ${String(r.font).padStart(7)} px : ${String(r.arial).padStart(7)} px   „${r.tekst}…"`);

const pros = rez.redovi.reduce((s, r) => s + r.odnos, 0) / rez.redovi.length;
const lat = rez.redovi.filter(r => r.pismo === 'latinica'), cir = rez.redovi.filter(r => r.pismo === 'ćirilica');
const pr = a => (a.reduce((s, r) => s + r.odnos, 0) / a.length).toFixed(4);
console.log(`\n  prosek latinica: ${pr(lat)}   prosek ćirilica: ${pr(cir)}   ukupan prosek: ${pros.toFixed(4)}`);
console.log(`  ==> size-adjust: ${(pros * 100).toFixed(1)}%   (konvencija iz style.css: odnos × 100)`);
console.log(`\n  metrike ${FONT}: ascent ${rez.fontMet.asc}  descent ${rez.fontMet.desc}`);
console.log(`  metrike Arial:   ascent ${rez.arialMet.asc}  descent ${rez.arialMet.desc}`);
console.log(`  ==> ascent-override ${(rez.fontMet.asc * 100).toFixed(0)}%  descent-override ${(rez.fontMet.desc * 100).toFixed(0)}%`);
await b.close();
