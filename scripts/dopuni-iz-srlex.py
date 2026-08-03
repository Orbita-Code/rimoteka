#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dopuna rečnika po spisku vlasnice — sa SVIM oblicima reči, iz srLex-a.

Zahtev vlasnice 02.08.2026: „uvek kad pišem po rodu, mislim da uz to dodaš ako
fali u rečniku i blještava, blještavo, blještavi… po broju ne znam kako se beše
menja, ali ti znaš."

Zato se oblici NE izmišljaju nego uzimaju iz `srLex`-a (`~/Literatura/srLex/`) —
to je lingvistički rečnik oblika srpskog jezika: uz svaki od 1,85 miliona oblika
stoji i osnovna reč (lema) i gramatička oznaka. Za „blještav" srLex vrati sve
oblike po rodu, broju i padežu, tačno i bez nagađanja.

Kako radi:
  1. reč sa spiska se nađe u srLex-u — i kad je otkucana bez kvačica
     (`arandjelovdan` → `aranđelovdan`, `aritmican` → `aritmičan`)
  2. uzme se njena osnovna reč (lema), pa SVI oblici te leme
  3. dodaje se samo ono čega u `public/reci.txt` nema

Pokretanje:  python3 scripts/dopuni-iz-srlex.py [--upisi]
Bez `--upisi` ništa se ne menja — samo se ispiše šta bi se dodalo.
"""
import gzip, os, sys, unicodedata
from collections import defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')
SPISAK = os.path.join(KOREN, 'scripts/dopuna-spisak-vlasnice.txt')
RECI = os.path.join(KOREN, 'public/reci.txt')
UPISI = '--upisi' in sys.argv

SLOVA = set('abcčćdđefghijklmnopqrsštuvwxyzž')

def bez_kvacica(r):
    r = r.replace('đ', 'dj').replace('Đ', 'dj')
    return ''.join(z for z in unicodedata.normalize('NFD', r)
                   if unicodedata.category(z) != 'Mn').lower()

# ── srLex: oblik → leme, lema → svi oblici ───────────────────────────────────
lema_oblici = defaultdict(set)
gola_u_pravu = defaultdict(set)     # zapis bez kvačica → pravi zapisi
with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        d = red.split('\t')
        if len(d) < 2:
            continue
        oblik, lema = d[0].strip().lower(), d[1].strip().lower()
        # Samo srpska latinica. srLex ponegde ima oblike sa dužinskim znakom
        # („abortusâ") i to nisu zapisi koje iko kuca — u rečniku bi bili smeće.
        if not oblik or set(oblik) - SLOVA:
            continue
        # Poređenje prideva koje niko ne izgovara. srLex je i GENERATOR oblika,
        # pa za odnosne prideve („advokatski", „autobuski") izvede i komparativ
        # („advokatskiji") koji u korpusu ima NULA pojava. Takav oblik ne ide u
        # rečnik: rimovao bi se sa nečim, a ne postoji. Oznaka: A=pridev,
        # treće slovo c/s = komparativ/superlativ; sedma kolona = broj pojava.
        oznaka = d[2].strip() if len(d) > 2 else ''
        broj = 0
        if len(d) > 6:
            try: broj = int(float(d[6]))
            except ValueError: broj = 0
        if oznaka[:1] == 'A' and oznaka[2:3] in ('c', 's') and broj == 0:
            continue
        lema_oblici[lema].add(oblik)
        gola_u_pravu[bez_kvacica(oblik)].add(oblik)
print('srLex: %d osnovnih reči, %d oblika' % (len(lema_oblici), len(gola_u_pravu)))

oblik_u_leme = defaultdict(set)
for lema, oblici in lema_oblici.items():
    for o in oblici:
        oblik_u_leme[o].add(lema)

# ── spisak vlasnice ──────────────────────────────────────────────────────────
trazene = [r.strip().lower() for r in open(SPISAK, encoding='utf-8')
           if r.strip() and not r.startswith('#')]

nasi = {w.strip() for w in open(RECI, encoding='utf-8') if w.strip()}

nove, nenadjene, po_reci = set(), [], {}
for rec in trazene:
    # tačan zapis, pa zapis bez kvačica (vlasnica često kuca bez njih)
    kandidati = {rec} if rec in oblik_u_leme else gola_u_pravu.get(bez_kvacica(rec), set())
    if not kandidati:
        nenadjene.append(rec)
        continue
    sve_leme = set()
    for k in kandidati:
        sve_leme |= oblik_u_leme.get(k, set())
    oblici = set()
    for lema in sve_leme:
        oblici |= lema_oblici[lema]
    fale = {o for o in oblici if o not in nasi}
    po_reci[rec] = (sorted(sve_leme), len(oblici), len(fale))
    nove |= fale

print('sa spiska: %d reči | nađeno u srLex-u: %d | nije nađeno: %d'
      % (len(trazene), len(trazene) - len(nenadjene), len(nenadjene)))
print('novih oblika za dodavanje: %d' % len(nove))
if nenadjene:
    print('\nNIJE NAĐENO U srLex-u (traži ručnu proveru):')
    print('  ' + ', '.join(nenadjene))

if UPISI:
    sve = sorted(nasi | nove)
    open(RECI, 'w', encoding='utf-8').write('\n'.join(sve) + '\n')
    print('\nupisano. rečnik: %d → %d reči' % (len(nasi), len(sve)))
else:
    print('\n(probni prolaz — ništa nije upisano; pokreni sa --upisi)')
    uzorak = sorted(nove)[:40]
    print('uzorak novih oblika:', ', '.join(uzorak))
