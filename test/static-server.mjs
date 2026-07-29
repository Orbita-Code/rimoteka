#!/usr/bin/env node
/**
 * Statički server za pre-deploy test — POKREĆE SE KAO ZASEBAN PROCES.
 *
 * Zašto ne `python3 -m http.server`: jednonitan je, pa dok jedna strana skida
 * `definicije.json` (20 MB) i `reci.txt` (2,6 MB), sve ostale čekaju u redu i
 * `page.goto` istekne posle 120 s — test padne BEZ IJEDNOG PRAVOG KVARA.
 * `ThreadingHTTPServer` se pod istim opterećenjem posle nekoliko minuta
 * zaglavi i prestane da prihvata veze (izmereno: `curl` visi iako proces sluša).
 *
 * Zašto zaseban proces, a ne server unutar `predeploy.mjs`: test i server bi
 * delili istu Node petlju, pa dok test čeka na Playwright protokol server ne
 * stigne da odgovori — i opet `goto` istekne bez pravog kvara.
 *
 * Zašto keš zaglavlja: test otvara preko trideset strana, a svaka u pozadini
 * skida iste velike fajlove. Bez `Cache-Control` to je preko 600 MB po
 * pokretanju. Produkcija ionako šalje svoja keš zaglavlja, pa je ovo i vernije.
 *
 * Pokretanje: node test/static-server.mjs <koren> <port>
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const KOREN = process.argv[2];
const PORT = Number(process.argv[3]);

const TIPOVI = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gif': 'image/gif',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff'
};

let aktivni = 0;
const srv = http.createServer((req, res) => {
  aktivni++;
  res.on('close', () => aktivni--);
  const put = decodeURIComponent(req.url.split('?')[0]);
  let fajl = path.join(KOREN, path.normalize(put).replace(/^(\.\.[/\\])+/, ''));
  let st;
  try { st = fs.statSync(fajl); } catch { st = null; }
  if (st && st.isDirectory()) {
    fajl = path.join(fajl, 'index.html');
    try { st = fs.statSync(fajl); } catch { st = null; }
  }
  if (!st) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404'); return; }

  const etag = '"' + st.size + '-' + Math.round(st.mtimeMs) + '"';
  if (req.headers['if-none-match'] === etag) { res.writeHead(304); res.end(); return; }

  res.writeHead(200, {
    'Content-Type': TIPOVI[path.extname(fajl).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'public, max-age=3600',
    'ETag': etag,
    'Content-Length': st.size
  });
  /* Tok se MORA ugasiti kad pregledač prekine vezu.
     Test zatvara strane usred skidanja `definicije.json` (20 MB); bez ovoga
     otvoren fajl-deskriptor ostane da visi, a posle nekoliko desetina takvih
     prekida server udari u granicu deskriptora i PRESTANE da prihvata veze.
     Izmereno: `curl` na server istekne posle 5 s, a `page.goto` posle 120 s —
     test padne kao da je sajt pokvaren, iako nije. */
  const tok = fs.createReadStream(fajl);
  res.on('close', () => tok.destroy());
  tok.on('error', () => res.destroy());
  tok.pipe(res);
});

srv.keepAliveTimeout = 2000;

if (process.env.LOG_ZAHTEVA) {
  setInterval(() => {
    srv.getConnections((e, n) => console.log(new Date().toISOString(), 'veza:', n, 'aktivnih zahteva:', aktivni));
  }, 2000);
}
srv.listen(PORT, () => console.log('spreman'));
