#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vraćanje obrisanih reči (04.08.2026.) — spajanje odluka i upis.

Korpe:
  A — izvedeno objašnjenje („Oblik prideva/imenice/glagola/priloga… „lema“ (…)“),
      iz postojećeg objašnjenja leme ili iz B-objašnjenja glave familije.
  B — ručno pisano objašnjenje (provereno u Matici), DEC ključ koji JE obrisana reč.
  C — vlasnica odlučuje; ne vraća se.

Pokretanje:  python3 scripts/vrati-04-08/primeni.py [--upisi]
Bez --upisi: samo probni ispis i provere.
"""
import gzip, json, os, re, sys, glob, unicodedata
from collections import Counter, defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OVDE = os.path.dirname(os.path.abspath(__file__))
RECI = os.path.join(KOREN, 'public/reci.txt')
DEFS = os.path.join(KOREN, 'public/definicije.json')
SPISAK = os.path.join(KOREN, 'AUDIT/MATICA-fali/07-obrisane-bez-objasnjenja.md')
UPISI = '--upisi' in sys.argv

# ── odluke ───────────────────────────────────────────────────────────────────
DEC, C, IZVEDENO = {}, {}, {}
for fn in sorted(glob.glob(os.path.join(OVDE, 'odluke-*.py'))):
    g = {}
    exec(open(fn, encoding='utf-8').read(), g)
    for k, v in g.get('DEC', {}).items():
        if k in DEC and DEC[k] != v:
            print('!! DEC konflikat %s: %r vs %r' % (k, DEC[k], v))
        DEC[k] = v
    for k, v in g.get('C', {}).items():
        if k in C and C[k] != v:
            print('!! C konflikat %s' % k)
        C[k] = v
    IZVEDENO.update(g.get('IZVEDENO', {}))
print('DEC:', len(DEC), '| C ključeva:', len(C), '| IZVEDENO:', len(IZVEDENO))

# ── radni podaci iz analize ──────────────────────────────────────────────────
radni = json.load(open(os.path.join(OVDE, 'radni.json'), encoding='utf-8'))
obrisane = list(radni.keys())
print('obrisanih na spisku:', len(obrisane))

grupa_glava = {w: radni[w]['najlema'] for w in obrisane}
glave = defaultdict(list)
for w in obrisane:
    glave[grupa_glava[w]].append(w)

reci = [l.strip() for l in open(RECI, encoding='utf-8') if l.strip()]
reci_set = set(reci)
defs = json.load(open(DEFS, encoding='utf-8'))
print('u reci.txt:', len(reci), '| u definicije.json:', len(defs))

POS_SR = {'ADJ': 'prideva', 'NOUN': 'imenice', 'VERB': 'glagola', 'ADV': 'priloga',
          'PRON': 'zamenice', 'NUM': 'broja', 'PROPN': 'imena', 'INTJ': 'uzvika',
          'DET': 'zamenice', 'AUX': 'glagola'}

OBICNI_POCECIN = set()

def sazmi(t, lema=None):
    """Prva rečenica, bez tačke; skraćena ako je dugačka; mala početna
    osim kad je prva reč sama lema (vlastito ime). Početna zagrada
    (npr. „(Nasisati se) …") otpada — u izvedenici je suvišna."""
    t = re.split(r'(?<=[^0-9])\.\s', t.strip())[0].rstrip('.').strip()
    if len(t) > 90:
        t = re.split(r'[;]', t)[0].strip()
    if len(t) > 90:
        t = re.split(r'\s+\(', t)[0].strip()
    if len(t) > 90:
        t = t[:88].rsplit(' ', 1)[0].strip()
    if t.startswith('('):
        t = re.sub(r'^\([^)]*\)\s*', '', t).strip()
    if t and t[0].isupper() and not t.startswith(('„', '"')):
        prva = t.split(' ', 1)[0].strip('.,;:')
        if not (lema and prva.lower() == lema.lower()):
            t = t[0].lower() + t[1:]
    return t

def izvedeno_def(w, lema, def_leme):
    if def_leme.lower().startswith('oblik '):
        return def_leme  # lema je i sama oblik — preuzmi isto objašnjenje
    pos = POS_SR.get(radni[w]['pos'], 'reči')
    return 'Oblik %s „%s“ (%s).' % (pos, lema, sazmi(def_leme, lema))

# ── razvrstavanje ────────────────────────────────────────────────────────────
kandidati = {}   # reč -> (korpa, objašnjenje)
nezadovoljene = {}
vec_vracene = []  # na spisku obrisanih, ali već u reci.txt (uneo main agent sa odobrenim objašnjenjima)
for w in obrisane:
    if w in reci_set:
        vec_vracene.append(w); continue
    h = grupa_glava[w]
    if w in C:
        nezadovoljene[w] = C[w]; continue
    if w in IZVEDENO:
        kandidati[w] = ('A', IZVEDENO[w]); continue
    if w in DEC:
        kandidati[w] = ('B', DEC[w]); continue
    if h in C:
        nezadovoljene[w] = C[h] + ' [glava: %s]' % h; continue
    # glava (ili mala varijanta glave) u DEC → izvedi
    glava_def, glava_ime = None, None
    for kand in (h, h.lower()):
        if kand in DEC:
            glava_def, glava_ime = DEC[kand], kand
            break
    if glava_def:
        kandidati[w] = ('A', izvedeno_def(w, glava_ime, glava_def)); continue
    # srLex leme (i mala varijanta) sa postojećim objašnjenjem
    leme = [l for l, _ in radni[w]['leme']] + [h, h.lower()]
    done = False
    for l in leme:
        if l in defs and l != w:
            kandidati[w] = ('A', izvedeno_def(w, l, defs[l])); done = True
            break
        if l.lower() in defs and l.lower() != w:
            kandidati[w] = ('A', izvedeno_def(w, l.lower(), defs[l.lower()])); done = True
            break
    if done:
        continue
    nezadovoljene[w] = 'bez odluke (sigurnosna mreža) — proveriti'

# ── kontrole ─────────────────────────────────────────────────────────────────
print('\nkandidati A+B:', len(kandidati), '| C:', len(nezadovoljene))
korpe = Counter(k for k, _ in kandidati.values())
print('  A:', korpe['A'], ' B:', korpe['B'])

# sirovi DEC ključevi (niti obrisana reč, niti glava grupe)
svi_kljucni = set(obrisane) | set(glave) | {h.lower() for h in glave}
sirovi = [k for k in DEC if k not in svi_kljucni]
if sirovi:
    print('\n!! DEC ključevi koji ništa ne pogađaju (tipfeljeri?):')
    for k in sirovi: print('   ', k)

# C ključevi koji ne pogađaju ništa
sirovi_c = [k for k in C if k not in svi_kljucni]
if sirovi_c:
    print('\n!! C ključevi koji ništa ne pogađaju:')
    for k in sirovi_c: print('   ', k)

# reči već u rečniku (idemponentnost — preskoči)
vec_u = [w for w in kandidati if w in reci_set]
if vec_u:
    print('\nveć u reci.txt (preskaču se):', vec_u)
for w in vec_u:
    del kandidati[w]

# A/B reči koje ni reč ni lema nema u Matici — upozorenje
print('\nA/B bez ikakvog traga u Matici (reč ni lema):')
n = 0
for w, (k, d) in sorted(kandidati.items()):
    if radni[w]['matica'] == 'ne' and radni[w]['lema_matica'] == 'ne':
        print('   ', w, '->', k, d[:70]); n += 1
print('   ukupno:', n)

# fuzzy reči koje se vraćaju — za izveštaj
print('\nA/B sa fuzzy Matica pogotkom:')
for w, (k, d) in sorted(kandidati.items()):
    m = radni[w]['matica']
    if m.startswith('fuzzy'):
        print('   ', w, m)

if not UPISI:
    print('\n(probni prolaz — ništa nije upisano)')
    # sačuvaj mapu za izveštaj
    json.dump({'kandidati': kandidati, 'C': nezadovoljene, 'vec_vracene': vec_vracene},
              open(os.path.join(OVDE, 'primena.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    sys.exit(0)

# ── upis ─────────────────────────────────────────────────────────────────────
nove_reci = [w for w in kandidati]
nove_defs = {w: d for w, (_, d) in kandidati.items()}

# znanstven*/zakupn* familije: oblici koji su VEĆ u reci.txt a nemaju objašnjenje
dodatak = {}
for w in reci_set:
    if w in defs or w in nove_defs:
        continue
    if w.startswith('znanstven'):
        dodatak[w] = 'Oblik prideva „znanstven“ (koji se odnosi na znanost; naučni).'
    elif w.startswith('zakupn') and w != 'zakupni':
        dodatak[w] = 'Oblik prideva „zakupni“ (koji se odnosi na zakup).'
print('\nznanstven*/zakupn* oblici u reci.txt bez objašnjenja → dodaje se:', len(dodatak))
for w, d in sorted(dodatak.items()):
    print('   ', w, '->', d)

sve_reci = sorted(reci + nove_reci, key=lambda x: x.lower())
open(RECI, 'w', encoding='utf-8').write('\n'.join(sve_reci) + '\n')
for k, v in dodatak.items():
    nove_defs[k] = v
defs.update(nove_defs)
json.dump(defs, open(DEFS, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump({'kandidati': kandidati, 'C': nezadovoljene, 'dodatak': dodatak,
           'vec_vracene': vec_vracene},
          open(os.path.join(OVDE, 'primena.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('\nUPISANO: %d reči u reci.txt (ukupno %d), %d objašnjenja u definicije.json (ukupno %d)'
      % (len(nove_reci), len(sve_reci), len(nove_defs), len(defs)))
