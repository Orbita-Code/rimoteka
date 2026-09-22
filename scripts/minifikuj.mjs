#!/usr/bin/env node
/**
 * MINIFIKACIJA `app.js` (nalaz PF-3, audit 22.09.2026): 105 KB gzip → ~45 KB po poseti.
 *
 * Izvor sa komentarima OSTAJE `public/app.js` (komentari su dokumentacija projekta). Ova skripta
 * pravi `public/app.min.js`, a server (nginx: `location = /app.js { alias … app.min.js }`; lokalni
 * `test/static-server.mjs` isto) ga servira POD ADRESOM `/app.js` – pa se ni testovi, ni `?v=`, ni
 * service worker ne menjaju. Prvi red minifikovanog fajla nosi otisak izvora; test proverava da se
 * poklapa sa `app.js` (zastareo `app.min.js` = pad).
 *
 * Pokreće je `osvezi-verzije-podataka.mjs` (posle svake izmene `app.js`), a može i ručno:
 *     node scripts/minifikuj.mjs
 * Traži globalni terser (`npm i -g terser`); bez njega pada sa jasnom porukom.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IZVOR = path.join(ROOT, 'public', 'app.js');
const IZLAZ = path.join(ROOT, 'public', 'app.min.js');

export function otisakIzvora() {
  return createHash('sha256').update(readFileSync(IZVOR)).digest('hex').slice(0, 12);
}
export function otisakUMin() {
  try { const m = readFileSync(IZLAZ, 'utf8').slice(0, 120).match(/sha:([0-9a-f]{12})/); return m ? m[1] : null; } catch { return null; }
}

export async function minifikuj() {
  let terser;
  try { terser = await import('/opt/homebrew/lib/node_modules/terser/main.js'); }
  catch { try { terser = await import('terser'); } catch { throw new Error('terser nije instaliran: npm i -g terser'); } }
  const src = readFileSync(IZVOR, 'utf8');
  const r = await terser.minify(src, { compress: { passes: 2 }, mangle: true, format: { comments: false } });
  if (!r.code) throw new Error('terser nije vratio kod');
  const glava = `/* Rimoteka app.min.js – generisano iz app.js sha:${otisakIzvora()} (scripts/minifikuj.mjs); izvor sa komentarima je public/app.js */\n`;
  writeFileSync(IZLAZ, glava + r.code);
  return { pre: src.length, posle: r.code.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await minifikuj();
  console.log(`app.min.js: ${(r.pre / 1024).toFixed(1)} KB → ${(r.posle / 1024).toFixed(1)} KB`);
}
