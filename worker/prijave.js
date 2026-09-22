import { connect } from 'cloudflare:sockets';
/* Sanduče za prijave grešaka sa rimoteka.com (06.09.2026).
   08.09.2026: svaka nova prijava ide i MEJLOM vlasnici (zahtev: „može li da mi stiže mejl kad neko prijavi grešku").
   Šalje se preko Gmail SMTP-a (smtp.gmail.com:465, TLS, AUTH PLAIN) sa posebnom Google app-lozinkom
   „rimoteka-prijave" – secrets SMTP_KORISNIK, SMTP_LOZINKA, MEJL_ZA (wrangler secret put). Slanje ide POSLE
   odgovora sajtu (ctx.waitUntil) i nikad ne obara prijavu: ako mejl ne prođe, prijava je ipak u sanduču.
   POST /prijava   ← sajt šalje {rec, upit, slogova, razlog, napomena, strana, mejl(zamka), proba}
   GET  /prijave?kljuc=…&format=json|html   ← privatni pregled (ključ je secret KLJUC)
   Bez imena, bez mejla, bez kolačića. IP se čuva samo kao skraćen otisak (za brojanje).
   22.09.2026 (audit, BZ-2/BZ-3/B-3/B-1): ključ se poredi u stalnom vremenu (`istiKljuc`); `/proba-mejla` ne odaje
   dužine tajni; pogrešan ključ na pregledu se broji po IP-u (10 u 10 min → 429); sanduče ima globalni plafon
   (60 prijava na sat → 429, ništa se ne čuva ni ne šalje) i ne čuva istu prijavu (reč+razlog+otisak) dva puta u 10 min. */

const DOZVOLJENA_POREKLA = ['https://rimoteka.com', 'https://www.rimoteka.com'];
/* Lokalni razvoj i test: bilo koji port na localhost/127.0.0.1 (pre-deploy test bira svoj
   port, 8799). 06.09.2026: test je padao jer je sanduče znalo samo za 8765/8766. */
const LOKALNO = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const dozvoljeno = o => DOZVOLJENA_POREKLA.includes(o) || LOKALNO.test(o);
const RAZLOZI = new Set(['slogovi', 'nije-rec', 'pogresno-napisana', 'ne-rimuje-se', 'nije-za-decu', 'drugo']);
const GRANICE = { rec: 60, upit: 60, napomena: 500, strana: 200 };
const LIMIT_PO_SATU = 10;              // prijava po IP-u na sat
const PLAFON_PO_SATU = 60;             // B-1: prijava UKUPNO na sat (svi zajedno) – preko toga 429, ništa se ne čuva ni ne šalje
const DUPLIKAT_SEK = 600;              // B-1: ista reč+razlog+otisak u ovom roku se ne čuva drugi put
const KLJUC_GRESAKA_MAX = 10;          // B-3: pogrešnih ključeva po IP-u u 10 min pre 429
const KLJUC_GRESAKA_SEK = 600;
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
/* B-1: globalni plafon – KV nema atomično uvećanje, pa dve prijave u istoj sekundi mogu brojati jednu (podbroj);
   prva prijava u satu NIKAD nije odbijena jer `get` vrati null → 0. Vraća sekunde do isteka sata ako je plafon pun. */
async function plafonPun(env) {
  const sad = new Date();
  const k = `plafon:${sad.toISOString().slice(0, 13).replace('T', '-')}`;
  const n = parseInt((await env.PRIJAVE.get(k)) || '0', 10);
  if (n >= PLAFON_PO_SATU) return 3600 - (sad.getUTCMinutes() * 60 + sad.getUTCSeconds());
  await env.PRIJAVE.put(k, String(n + 1), { expirationTtl: 3600 });
  return 0;
}
/* B-1: ista prijava (reč + razlog + otisak) u poslednjih 10 min → ne čuva se ni ne šalje drugi put. */
async function duplikat(env, p, ko) {
  const k = `dup:${await otisak(p.rec + '|' + p.razlog + '|' + ko)}`;
  if (await env.PRIJAVE.get(k)) return true;
  await env.PRIJAVE.put(k, '1', { expirationTtl: DUPLIKAT_SEK });
  return false;
}
/* BZ-2: poređenje ključa u stalnom vremenu – `!==` staje na prvom različitom bajtu, pa se ključ može pogađati merenjem.
   `crypto.subtle.timingSafeEqual` je proširenje Workers-a; ako ga nema, XOR petlja preko svih bajtova. */
function istiKljuc(dat, pravi) {
  if (typeof dat !== 'string' || typeof pravi !== 'string' || !pravi) return false;
  const a = new TextEncoder().encode(dat), b = new TextEncoder().encode(pravi);
  if (a.byteLength !== b.byteLength) return false;
  if (crypto.subtle && typeof crypto.subtle.timingSafeEqual === 'function') return crypto.subtle.timingSafeEqual(a, b);
  let r = 0; for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i]; return r === 0;
}
/* B-3: pogrešan ključ se broji po IP-u; posle KLJUC_GRESAKA_MAX u 10 min → 429 (i sa tačnim ključem, dok ne istekne). */
async function kljucBlokiran(env, ip) {
  const n = parseInt((await env.PRIJAVE.get(`kljuc-greske:${ip}`)) || '0', 10);
  return n >= KLJUC_GRESAKA_MAX;
}
async function zabeleziPogresanKljuc(env, ip) {
  const k = `kljuc-greske:${ip}`;
  const n = parseInt((await env.PRIJAVE.get(k)) || '0', 10);
  await env.PRIJAVE.put(k, String(n + 1), { expirationTtl: KLJUC_GRESAKA_SEK });
}
const ipOd = request => request.headers.get('CF-Connecting-IP') || 'nepoznat';
const nemaPristupa = (extra) => new Response('Nema pristupa.', { status: 403, headers: extra || {} });
const previsePokusaja = () => new Response('Previše pokušaja. Pokušaj kasnije.', { status: 429, headers: { 'Retry-After': String(KLJUC_GRESAKA_SEK), 'Cache-Control': 'no-store' } });

/* --- mejl vlasnici: mali SMTP klijent (Workers nemaju ugrađen mejl bez Cloudflare Email Routing-a) --- */
function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
async function posaljiMejl(env, zapis, poreklo) {
  if (!env.SMTP_KORISNIK || !env.SMTP_LOZINKA || !env.MEJL_ZA) return;
  const sock = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on', allowHalfOpen: false });
  const w = sock.writable.getWriter(); const r = sock.readable.getReader();
  const dec = new TextDecoder(); const enc = new TextEncoder();
  let bafer = '';
  const citaj = async (ocekuj) => {          // čita dok ne stigne ceo odgovor (poslednji red „NNN " sa razmakom)
    for (let i = 0; i < 40; i++) {
      const m = bafer.match(/^(\d{3})[ ](.*)$/m);
      if (m && /^\d{3} /m.test(bafer)) { const kod = m[1]; const sve = bafer; bafer = ''; if (!ocekuj.includes(kod)) throw new Error('SMTP ' + sve.slice(0, 120)); return sve; }
      const { value, done } = await r.read(); if (done) break; bafer += dec.decode(value);
    }
    throw new Error('SMTP: nema odgovora (' + bafer.slice(0, 80) + ')');
  };
  const reci = async (linija, ocekuj) => { await w.write(enc.encode(linija + '\r\n')); return citaj(ocekuj); };
  try {
    await citaj(['220']);
    await reci('EHLO rimoteka.com', ['250']);
    /* AUTH LOGIN (korisnik i lozinka zasebno, oba base64) – Gmail je 08.09. odbijao AUTH PLAIN iz Workera
       iako je ista lozinka radila sa računara; LOGIN je prošao. Lozinka se čisti od razmaka i novih redova. */
    const kor = String(env.SMTP_KORISNIK).trim(), loz = String(env.SMTP_LOZINKA).replace(/\s+/g, '');
    await reci('AUTH LOGIN', ['334']);
    await reci(btoa(kor), ['334']);
    await reci(btoa(loz), ['235']);
    await reci('MAIL FROM:<' + env.SMTP_KORISNIK + '>', ['250']);
    await reci('RCPT TO:<' + env.MEJL_ZA + '>', ['250', '251']);
    await reci('DATA', ['354']);
    const naslov = 'Rimoteka – nova prijava greške: ' + zapis.rec;
    const telo = [
      'Reč: ' + zapis.rec,
      'Razlog: ' + (NAZIV[zapis.razlog] || zapis.razlog),
      zapis.upit ? 'Traženo: ' + zapis.upit : '',
      zapis.slogova != null ? 'Slogova (po alatu): ' + zapis.slogova : '',
      zapis.napomena ? 'Napomena: ' + zapis.napomena : '',
      'Strana: ' + citljivaAdresa(zapis.strana),
      'Uređaj: ' + zapis.uredjaj + ' · ' + zapis.kad,
      /* Link sa ključem: mejl ide samo vlasnici, a bez ključa je sanduče vraćalo „Nema pristupa" (08.09.2026). */
      '', 'Pregled svih prijava (privatan link, ne prosleđuj): ' + (poreklo || 'https://rimoteka-prijave.jovana-daskovic.workers.dev') + '/prijave?kljuc=' + encodeURIComponent(env.KLJUC || '')
    ].filter(Boolean).join('\r\n');
    const poruka = [
      'From: Rimoteka <' + (env.MEJL_OD || 'eureka@rimoteka.com') + '>',
      'To: <' + env.MEJL_ZA + '>',
      'Subject: =?UTF-8?B?' + b64(naslov) + '?=',
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit',
      'Date: ' + new Date().toUTCString(),
      '', telo.replace(/^\./gm, '..'), '.'
    ].join('\r\n');
    await reci(poruka, ['250']);
    await reci('QUIT', ['221']).catch(() => {});
  } finally {
    try { await w.close(); } catch {}
    try { sock.close(); } catch {}
  }
}

async function primi(request, env, ctx) {
  const h = cors(request);
  const origin = request.headers.get('Origin') || '';
  if (!dozvoljeno(origin)) return json({ ok: false, greska: 'poreklo' }, 403, h);
  let t; try { t = await request.json(); } catch { return json({ ok: false, greska: 'json' }, 400, h); }
  if (typeof t !== 'object' || t === null) return json({ ok: false, greska: 'json' }, 400, h);
  if (polje(t.mejl, 10)) return json({ ok: true }, 200, h);                         // zamka za robote: odgovor ISTI kao pravi (N-13: `proba:true` je odavao zamku)
  const p = { rec: polje(t.rec, GRANICE.rec), upit: polje(t.upit, GRANICE.upit), slogova: Number.isInteger(t.slogova) && t.slogova >= 0 && t.slogova < 30 ? t.slogova : null,
              razlog: RAZLOZI.has(t.razlog) ? t.razlog : null, napomena: polje(t.napomena, GRANICE.napomena), strana: polje(t.strana, GRANICE.strana) };
  if (!p.rec || !p.razlog) return json({ ok: false, greska: 'nepotpuno' }, 400, h);
  if (t.proba === true) return json({ ok: true, proba: true }, 200, h);            // test sajta: proveri sve, ne čuvaj ništa
  const ip = ipOd(request);
  if (await limitProbijen(env, ip)) return json({ ok: false, greska: 'previse' }, 429, h);
  const ko = await otisak(ip + '|' + (request.headers.get('User-Agent') || '').slice(0, 80));
  if (await duplikat(env, p, ko)) return json({ ok: true, duplikat: true }, 200, h);   // B-1: ista prijava u 10 min – ne čuva se, mejl ne ide
  const cekaj = await plafonPun(env);
  if (cekaj) return json({ ok: false, greska: 'plafon' }, 429, { ...h, 'Retry-After': String(cekaj) });   // B-1: sanduče puno za ovaj sat
  const kad = new Date().toISOString();
  const zapis = { ...p, kad, ko,
                  uredjaj: /Mobi|Android|iPhone/i.test(request.headers.get('User-Agent') || '') ? 'telefon' : 'računar' };
  await env.PRIJAVE.put(`prijava:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, JSON.stringify(zapis), { expirationTtl: CUVANJE_SEK });
  if (ctx && ctx.waitUntil) ctx.waitUntil(posaljiMejl(env, zapis, new URL(request.url).origin).catch(e => console.log('mejl nije poslat: ' + (e && e.message))));
  /* Brojač `broj:ukupno` je UKINUT (N-13): KV nema atomično uvećanje, pa su dve prijave u istoj sekundi
     brojale jednu; „ukupno" se sada uvek prebroji iz spiska ključeva (v. pregled). */
  return json({ ok: true }, 200, h);
}

/* Adresa strane se čuva onako kako je pregledač šalje (`gri%C5%BEnja`); u pregledu se
   prikazuje čitljivo (`grižnja`). 06.09.2026, prijava vlasnice. */
const citljivaAdresa = a => { try { return decodeURIComponent(a || ''); } catch { return a || ''; } };
const NAZIV = { slogovi: 'pogrešan broj slogova', 'nije-rec': 'nije ispravna reč', 'pogresno-napisana': 'pogrešno napisana', 'ne-rimuje-se': 'ne rimuje se', 'nije-za-decu': 'nije za decu', drugo: 'nešto drugo' };

async function pregled(request, env) {
  const url = new URL(request.url);
  /* Ključ ide u ZAGLAVLJU `X-Kljuc` (N-13: u adresi ostaje u logovima); `?kljuc=` je zadržan samo za HTML
     pregled u pregledaču (tamo se zaglavlje ne može poslati). */
  const kljuc = request.headers.get('X-Kljuc') || url.searchParams.get('kljuc');
  const ip = ipOd(request);
  if (await kljucBlokiran(env, ip)) return previsePokusaja();                     // B-3: 10 pogrešnih ključeva u 10 min → 429
  if (!istiKljuc(kljuc, env.KLJUC)) { await zabeleziPogresanKljuc(env, ip); return nemaPristupa(); }   // BZ-2: stalno vreme
  const posle = url.searchParams.get('posle') || '';                           // ISO vreme: vrati samo novije (za dnevni izveštaj)
  const lista = await env.PRIJAVE.list({ prefix: 'prijava:', limit: 1000 });
  const sve = [];
  for (const k of lista.keys) { const v = await env.PRIJAVE.get(k.name); if (v) { const z = JSON.parse(v); z.id = k.name; if (!posle || z.kad > posle) sve.push(z); } }
  sve.sort((a, b) => (a.kad < b.kad ? 1 : -1));
  /* „Ukupno“ je broj STVARNO sačuvanih prijava (brojač u KV je posle brisanja neprecizan). */
  const ukupno = String(posle ? lista.keys.filter(k => k.name.startsWith('prijava:')).length : sve.length);   // N-13: bez KV brojača
  if (url.searchParams.get('format') === 'json') return json({ ukupno: Number(ukupno), prijave: sve });
  const red = z => `<tr><td>${esc(z.kad.slice(0, 16).replace('T', ' '))}</td><td><b>${esc(z.rec)}</b>${z.slogova != null ? ` <small>(${z.slogova})</small>` : ''}</td><td>${esc(z.upit)}</td><td>${esc(NAZIV[z.razlog] || z.razlog)}</td><td>${esc(z.napomena)}</td><td><small>${esc(citljivaAdresa(z.strana))} · ${esc(z.uredjaj)}</small></td></tr>`;
  const html = `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Prijave grešaka – Rimoteka</title>
<style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:20px;background:#fdfcff;color:#393257}h1{color:#5a3fd0}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(90,63,208,.13)}th{background:#5a3fd0;color:#fff;padding:10px;text-align:left;font-size:.85em}
td{padding:9px 10px;border-bottom:1px solid #e8e4f7;font-size:.92em;vertical-align:top}tr:hover{background:#f8f6ff}.p{color:#756e94}</style>
<h1>Prijave grešaka – Rimoteka</h1><p class="p">Ukupno od početka: <b>${esc(ukupno)}</b> · prikazano: ${sve.length}${posle ? ` (posle ${esc(posle)})` : ''}</p>
<table><tr><th>Kad</th><th>Reč (slogova)</th><th>Traženo</th><th>Šta ne valja</th><th>Napomena</th><th>Strana</th></tr>${sve.map(red).join('') || '<tr><td colspan="6" class="p">Nema prijava.</td></tr>'}</table>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });
    if (request.method === 'POST' && url.pathname === '/prijava') return primi(request, env, ctx);
    /* Proba mejla (samo sa ključem): pošalje probnu poruku i vrati grešku ako SMTP ne prođe. */
    if (request.method === 'POST' && url.pathname === '/proba-mejla') {
      if (!istiKljuc(request.headers.get('X-Kljuc') || '', env.KLJUC)) return nemaPristupa();   // BZ-2
      try { await posaljiMejl(env, { rec: 'proba', razlog: 'drugo', napomena: 'Ovo je proba slanja iz sanduča.', strana: 'https://rimoteka.com/', uredjaj: 'proba', kad: new Date().toISOString() }, url.origin); return json({ ok: true }); }
      catch (e) { return json({ ok: false, greska: String(e && e.message), postavljeno: { korisnik: !!env.SMTP_KORISNIK, lozinka: !!env.SMTP_LOZINKA } }, 500); }   // BZ-3: ne odaje dužine tajni
    }
    if (request.method === 'GET' && url.pathname === '/prijave') return pregled(request, env);
    if (request.method === 'GET' && url.pathname === '/zdravlje') return json({ ok: true });
    /* Brisanje jedne prijave (samo sa ključem) – za probne zapise koji su omaškom ušli (07.09.2026). */
    if (request.method === 'POST' && url.pathname === '/obrisi') {
      if (!istiKljuc(request.headers.get('X-Kljuc') || url.searchParams.get('kljuc'), env.KLJUC)) return nemaPristupa();   // BZ-2
      const id = url.searchParams.get('id') || '';
      if (!/^prijava:\d+:[a-z0-9]+$/.test(id)) return json({ ok: false, greska: 'id' }, 400);
      await env.PRIJAVE.delete(id);
      return json({ ok: true, obrisano: id });
    }
    return new Response('Rimoteka – sanduče za prijave grešaka.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};
