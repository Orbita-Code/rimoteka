#!/usr/bin/env node
/**
 * VERZIJE PODATAKA SE RAČUNAJU IZ SADRŽAJA, NE PAMTE SE (nalaz V5, 24.08.2026)
 *
 * Zašto ovaj fajl postoji. Adrese podataka u `app.js` nose `?v=…` da bi pregledač
 * i service worker znali kad da povuku novu verziju — keš gleda ADRESU, ne datum
 * fajla. Do 24.08.2026. je taj broj kucao čovek. Posledica, izmerena u auditu:
 * `reci.txt` i `definicije.json` su 20.08. izmenjeni (izbačen `kapučino`), a `?v=`
 * je ostao od 17.08. — svako ko je već bio na sajtu dobijao je STARI rečnik, sa
 * rečju koju je vlasnica tražila da se izbaci, sve do svoje sledeće posete.
 *
 * Sada `?v=` NIJE broj koji se pamti nego prvih osam znakova otiska (sha256)
 * samog fajla. Promeni se sadržaj — promeni se adresa. Nema šta da se zaboravi.
 *
 * Pokretanje posle SVAKE izmene bilo kog fajla sa podacima:
 *     node scripts/osvezi-verzije-podataka.mjs
 *
 * Pre-deploy test (sekcija 41) proverava da su verzije usklađene i PADA ako nisu,
 * pa se ne može desiti da neko izmeni rečnik a zaboravi da pusti ovu komandu.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const APP = path.join(ROOT, 'public', 'app.js');

/* Svi fajlovi sa podacima koje `app.js` skida sa adrese sa `?v=`. Kad se doda nov,
   dopisuje se ovde — i test i ova skripta ga tada odmah pokrivaju. */
export const FAJLOVI = [
  'reci.txt', 'reci_jekavica.txt', 'definicije.json',
  'frekvencija.json', 'sinonimi.json', 'matica.json', 'jekavski.json',
];

export function otisak(root, ime) {
  const buf = readFileSync(path.join(root, 'public', ime));
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

/** Vraća {ime: {ocekivano, upisano}} za svaki fajl. Ne menja ništa. */
export function stanjeVerzija(root = ROOT) {
  const app = readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const out = {};
  for (const ime of FAJLOVI) {
    const re = new RegExp(`/${ime.replace('.', '\\.')}\\?v=([^'"\`)\\s]+)`);
    const m = app.match(re);
    out[ime] = { ocekivano: otisak(root, ime), upisano: m ? m[1] : null };
  }
  return out;
}

/* Kad se pokrene direktno — prepiši verzije u `app.js`. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let app = readFileSync(APP, 'utf8');
  let promena = 0;
  for (const ime of FAJLOVI) {
    const h = otisak(ROOT, ime);
    const re = new RegExp(`(/${ime.replace('.', '\\.')}\\?v=)([^'"\`)\\s]+)`, 'g');
    const pre = app;
    app = app.replace(re, (_, glava, staro) => {
      if (staro !== h) { console.log(`  ${ime.padEnd(22)} ${staro} → ${h}`); promena++; }
      return glava + h;
    });
    if (pre === app && !new RegExp(`/${ime.replace('.', '\\.')}\\?v=`).test(app)) {
      console.error(`  ⚠️  ${ime} se ne pominje u app.js — proveri spisak FAJLOVI`);
    }
  }
  writeFileSync(APP, app);
  console.log(promena ? `\nOsveženo verzija: ${promena}` : '\nSve verzije su već usklađene.');
}
