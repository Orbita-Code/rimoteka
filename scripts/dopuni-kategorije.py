#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dopuna rečnika tematskim krugovima (planete, praznici, države, gradovi, aparati,
posuđe, saobraćaj, nauke) — sa svim oblicima iz srLex-a.

Razlika u odnosu na `dopuni-iz-srlex.py`: ovde se ČUVA VELIKO POČETNO SLOVO.
Vlastita imena idu u rečnik kao `Beograd`, `Saturn`, `Isus` — odluka vlasnice
02.08.2026. Razlog je beležnica: klik na ponuđenu rimu ubacuje reč pravo u stih,
pa bi `beograd` ostavio grešku u gotovoj pesmi.

Zato se za reč napisanu velikim slovom u srLex-u traži zapis TAKAV KAKAV JE, i
uzimaju se svi njegovi oblici — `Beograd, Beograda, Beogradu, Beogradom`. Za reč
napisanu malim slovom radi se isto što i pre.

Pokretanje:  python3 scripts/dopuni-kategorije.py [--upisi]
"""
import gzip, os, sys, unicodedata
from collections import defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')
SPISAK = os.path.join(KOREN, 'scripts/dopuna-kategorije.txt')
RECI = os.path.join(KOREN, 'public/reci.txt')
UPISI = '--upisi' in sys.argv

SLOVA = set('abcčćdđefghijklmnopqrsštuvwxyzž')
def slovna(r): return not (set(r.lower()) - SLOVA)

lema_oblici = defaultdict(set)
oblik_leme = defaultdict(set)
with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        d = red.split('\t')
        if len(d) < 2:
            continue
        oblik, lema = d[0].strip(), d[1].strip()
        if not oblik or not slovna(oblik):
            continue
        oznaka = d[2].strip() if len(d) > 2 else ''
        broj = 0
        if len(d) > 6:
            try: broj = int(float(d[6]))
            except ValueError: broj = 0
        # izmišljeni komparativi odnosnih prideva — v. `dopuni-iz-srlex.py`
        if oznaka[:1] == 'A' and oznaka[2:3] in ('c', 's') and broj == 0:
            continue
        lema_oblici[lema].add(oblik)
        oblik_leme[oblik].add(lema)

trazene = [r.strip() for r in open(SPISAK, encoding='utf-8')
           if r.strip() and not r.startswith('#')]
nasi = {w.strip() for w in open(RECI, encoding='utf-8') if w.strip()}

nove, nenadjene = set(), []
for rec in trazene:
    leme = set(oblik_leme.get(rec, ()))
    if not leme:
        # ime kojeg srLex nema u tom zapisu — proba se i mali oblik, pa se, ako
        # ni to ne uspe, dodaje samo onako kako ga je vlasnica napisala
        leme = set(oblik_leme.get(rec.lower(), ()))
        if not leme:
            if rec not in nasi:
                nove.add(rec)
            nenadjene.append(rec)
            continue
    oblici = set()
    for lema in leme:
        oblici |= lema_oblici[lema]
    # Ako je tražena reč velikim slovom, uzimaju se samo oblici koji to i jesu —
    # inače bi uz `Zemlja` (planeta) upala i `zemlja` (tlo) sa svim padežima.
    if rec[:1].isupper():
        oblici = {o for o in oblici if o[:1].isupper()}
    nove |= {o for o in oblici if o not in nasi}

print('sa spiska: %d | novih oblika: %d' % (len(trazene), len(nove)))
if nenadjene:
    print('\nsrLex ih nema — dodata samo osnovna reč (%d):' % len(nenadjene))
    print('  ' + ', '.join(nenadjene))

if UPISI:
    sve = sorted(nasi | nove, key=lambda w: (w.lower(), w))
    open(RECI, 'w', encoding='utf-8').write('\n'.join(sve) + '\n')
    print('\nupisano. rečnik: %d → %d' % (len(nasi), len(sve)))
else:
    print('\n(probni prolaz) uzorak:', ', '.join(sorted(nove)[:30]))
