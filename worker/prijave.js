/* Sanduče za prijave grešaka sa rimoteka.com (06.09.2026).
   POST /prijava   ← sajt šalje {rec, upit, slogova, razlog, napomena, strana, mejl(zamka), proba}
   GET  /prijave?kljuc=…&format=json|html   ← privatni pregled (ključ je secret KLJUC)
   Bez imena, bez mejla, bez kolačića. IP se čuva samo kao skraćen otisak (za brojanje). */

const DOZVOLJENA_POREKLA = ['https://rimoteka.com', 'https://www.rimoteka.com'];
/* Lokalni razvoj i test: bilo koji port na localhost/127.0.0.1 (pre-deploy test bira svoj
   port, 8799). 06.09.2026: test je padao jer je sanduče znalo samo za 8765/8766. */
const LOKALNO = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const dozvoljeno = o => DOZVOLJENA_POREKLA.includes(o) || LOKALNO.test(o);
const RAZLOZI = new Set(['slogovi', 'nije-rec', 'pogresno-napisana', 'ne-rimuje-se', 'nije-za-decu', 'drugo']);
const GRANICE = { rec: 60, upit: 60, napomena: 500, strana: 200 };
const LIMIT_PO_SATU = 10;
const CUVANJE_SEK = 365 * 24 * 3600;

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  const ok = dozvoljeno(origin);
  return { 'Access-Control-Allow-Origin': ok ? origin : DOZVOLJENA_POREKLA[0], 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
const json = (o, status, extra) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(extra || {}) } });
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const polje = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

async function otisak(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function limitProbijen(env, ip) {
  const k = `rate:${ip}`;
  const n = parseInt((await env.PRIJAVE.get(k)) || '0', 10);
  if (n >= LIMIT_PO_SATU) return true;
  await env.PRIJAVE.put(k, String(n + 1), { expirationTtl: 3600 });
  return false;
}

async function primi(request, env) {
  const h = cors(request);
  const origin = request.headers.get('Origin') || '';
  if (!dozvoljeno(origin)) return json({ ok: false, greska: 'poreklo' }, 403, h);
  let t; try { t = await request.json(); } catch { return json({ ok: false, greska: 'json' }, 400, h); }
  if (typeof t !== 'object' || t === null) return json({ ok: false, greska: 'json' }, 400, h);
  if (polje(t.mejl, 10)) return json({ ok: true, proba: true }, 200, h);            // zamka za robote: polje koje čovek ne vidi
  const p = { rec: polje(t.rec, GRANICE.rec), upit: polje(t.upit, GRANICE.upit), slogova: Number.isInteger(t.slogova) && t.slogova >= 0 && t.slogova < 30 ? t.slogova : null,
              razlog: RAZLOZI.has(t.razlog) ? t.razlog : null, napomena: polje(t.napomena, GRANICE.napomena), strana: polje(t.strana, GRANICE.strana) };
  if (!p.rec || !p.razlog) return json({ ok: false, greska: 'nepotpuno' }, 400, h);
  if (t.proba === true) return json({ ok: true, proba: true }, 200, h);            // test sajta: proveri sve, ne čuvaj ništa
  const ip = request.headers.get('CF-Connecting-IP') || 'nepoznat';
  if (await limitProbijen(env, ip)) return json({ ok: false, greska: 'previse' }, 429, h);
  const kad = new Date().toISOString();
  const zapis = { ...p, kad, ko: await otisak(ip + '|' + (request.headers.get('User-Agent') || '').slice(0, 80)),
                  uredjaj: /Mobi|Android|iPhone/i.test(request.headers.get('User-Agent') || '') ? 'telefon' : 'računar' };
  await env.PRIJAVE.put(`prijava:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, JSON.stringify(zapis), { expirationTtl: CUVANJE_SEK });
  const uk = parseInt((await env.PRIJAVE.get('broj:ukupno')) || '0', 10) + 1;
  await env.PRIJAVE.put('broj:ukupno', String(uk));
  return json({ ok: true }, 200, h);
}

/* Adresa strane se čuva onako kako je pregledač šalje (`gri%C5%BEnja`); u pregledu se
   prikazuje čitljivo (`grižnja`). 06.09.2026, prijava vlasnice. */
const citljivaAdresa = a => { try { return decodeURIComponent(a || ''); } catch { return a || ''; } };
const NAZIV = { slogovi: 'pogrešan broj slogova', 'nije-rec': 'nije ispravna reč', 'pogresno-napisana': 'pogrešno napisana', 'ne-rimuje-se': 'ne rimuje se', 'nije-za-decu': 'nije za decu', drugo: 'nešto drugo' };

async function pregled(request, env) {
  const url = new URL(request.url);
  if (!env.KLJUC || url.searchParams.get('kljuc') !== env.KLJUC) return new Response('Nema pristupa.', { status: 403 });
  const posle = url.searchParams.get('posle') || '';                           // ISO vreme: vrati samo novije (za dnevni izveštaj)
  const lista = await env.PRIJAVE.list({ prefix: 'prijava:', limit: 1000 });
  const sve = [];
  for (const k of lista.keys) { const v = await env.PRIJAVE.get(k.name); if (v) { const z = JSON.parse(v); z.id = k.name; if (!posle || z.kad > posle) sve.push(z); } }
  sve.sort((a, b) => (a.kad < b.kad ? 1 : -1));
  const ukupno = (await env.PRIJAVE.get('broj:ukupno')) || '0';
  if (url.searchParams.get('format') === 'json') return json({ ukupno: Number(ukupno), prijave: sve });
  const red = z => `<tr><td>${esc(z.kad.slice(0, 16).replace('T', ' '))}</td><td><b>${esc(z.rec)}</b>${z.slogova != null ? ` <small>(${z.slogova})</small>` : ''}</td><td>${esc(z.upit)}</td><td>${esc(NAZIV[z.razlog] || z.razlog)}</td><td>${esc(z.napomena)}</td><td><small>${esc(citljivaAdresa(z.strana))} · ${esc(z.uredjaj)}</small></td></tr>`;
  const html = `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Prijave grešaka — Rimoteka</title>
<style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:20px;background:#fdfcff;color:#393257}h1{color:#5a3fd0}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(90,63,208,.13)}th{background:#5a3fd0;color:#fff;padding:10px;text-align:left;font-size:.85em}
td{padding:9px 10px;border-bottom:1px solid #e8e4f7;font-size:.92em;vertical-align:top}tr:hover{background:#f8f6ff}.p{color:#756e94}</style>
<h1>Prijave grešaka — Rimoteka</h1><p class="p">Ukupno od početka: <b>${esc(ukupno)}</b> · prikazano: ${sve.length}${posle ? ` (posle ${esc(posle)})` : ''}</p>
<table><tr><th>Kad</th><th>Reč (slogova)</th><th>Traženo</th><th>Šta ne valja</th><th>Napomena</th><th>Strana</th></tr>${sve.map(red).join('') || '<tr><td colspan="6" class="p">Nema prijava.</td></tr>'}</table>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });
    if (request.method === 'POST' && url.pathname === '/prijava') return primi(request, env);
    if (request.method === 'GET' && url.pathname === '/prijave') return pregled(request, env);
    if (request.method === 'GET' && url.pathname === '/zdravlje') return json({ ok: true });
    return new Response('Rimoteka — sanduče za prijave grešaka.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
