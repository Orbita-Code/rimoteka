#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Predlog dopune padeža za IMENICE SREDNJEG RODA. NIŠTA NE UPISUJE.

Metod — osnova se ČITA iz potvrđenog genitiva, ne izvodi iz nominativa:
  selo → sela  → osnova „sel"   → selu, selom, sela, selima
  more → mora  → osnova „mor"   → moru, morem, mora, morima
  ime  → imena → osnova „imen"  → imenu, imenom, imena, imenima   (proširena osnova!)
  tele → teleta→ osnova „telet" → teletu, teletom                 (množina je zbirna: telad)

Da je osnova uzimana iz nominativa, od „ime" bi ispalo „ima, imu, imom" — pogrešno.
Ako genitiv NIJE u rečniku, osnova se ne pogađa nego se imenica odvaja na stranu.

Instrumental: -em ako je osnova nepromenjena a nominativ na -e (more → morem,
polje → poljem, sunce → suncem) ili ako se osnova završava mekim suglasnikom;
inače -om (selo → selom, ime → imenom, tele → teletom).
"""
import os, json, re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
reci = [l.strip() for l in open(os.path.join(PUB,'reci.txt'), encoding='utf-8') if l.strip()]
S = set(reci)
defs = json.load(open(os.path.join(PUB,'definicije.json'), encoding='utf-8'))
# Frekvencija iz srLex korpusa — jedini objektivan pokazatelj da li se reč
# stvarno koristi. Predlog nasleđuje kvalitet osnovnog rečnika: ako je osnovna
# reč sumnjiva, njeni padeži su takođe sumnjivi. Zato se predlog sortira po
# frekvenciji, a reči bez ijedne pojave u korpusu izdvajaju na kraj.
frek = json.load(open(os.path.join(PUB,'frekvencija.json'), encoding='utf-8'))

# Objašnjenja vezuju oblik za osnovnu reč na DVA načina:
#   „Oblik reči „tele“; …"           -> OBLIK
#   „… (množina od more)."           -> OD_KOGA
# Raniji kod je hvatao samo prvi, pa je promašivao „mora (množina od more)".
OBLIK  = re.compile(r'^Oblik (?:reči|glagola|prideva|imenice)\s+[„"]?([a-zčćžšđ]+)[„"]?', re.I)
OD_KOGA = re.compile(r'\((?:množina|jednina|genitiv|oblik)\s+od\s+([a-zčćžšđ]+)\)', re.I)
MEKI = set('čćžšđj') | {'c'}

osnova_od = {}
for w, o in defs.items():
    o = o.strip()
    m = OBLIK.match(o) or OD_KOGA.search(o)
    if m:
        b = m.group(1).lower()
        if b != w and b in S: osnova_od[w] = b
oblici_od = defaultdict(set)
for w, b in osnova_od.items(): oblici_od[b].add(w)

def je_pridev(b): return (b+'og') in S or (b+'oga') in S

srednji = [b for b in oblici_od
           if len(b) > 3 and b[-1] in ('o','e')
           and not b.endswith('ti') and not b.endswith('ći')
           and not je_pridev(b)]

def nadji_genitiv(b):
    """Genitiv mora da zadovolji DVA uslova istovremeno:
       1. da ima dozvoljen OBLIK genitiva srednjeg roda
          (selo→sela, ime→imena, tele→teleta, nebo→nebesa),
       2. da ga OBJAŠNJENJE veže baš za ovu reč.

    Nijedan uslov sam nije dovoljan:
      - samo oblik  → „more" se zakači za „morena" (nanos lednika),
                      „tele" za „tela" (od TELO);
      - samo objašnjenje → uhvati „morima/vremenima", što je dativ MNOŽINE
                      (i on se završava na „a").
    """
    koren = b[:-1]
    for kand in (koren+'a', koren+'ena', koren+'eta', koren+'esa'):
        if kand == b or kand not in S:
            continue
        if osnova_od.get(kand) == b:      # objašnjenje pokazuje na ovu reč
            return kand
    return None

redovi, bez_genitiva = [], []
for b in sorted(srednji):
    g = nadji_genitiv(b)
    if not g:
        bez_genitiva.append(b); continue
    st = g[:-1]                                # osnova iz genitiva
    prosirena = (st != b[:-1])
    zadnji = st[-1]
    if not prosirena and b.endswith('e'):      inst = st+'em'
    elif zadnji in MEKI:                       inst = st+'em'
    else:                                      inst = st+'om'

    ob = {'D/L jd': st+'u', 'I jd': inst}
    # Množina: preskačemo glagolske imenice (-nje) i tip „tele" (osnova na -et),
    # jer im množina nije pravilna (pevanje nema množinu; tele → telad).
    # Neke imenice imaju PROŠIRENU MNOŽINU koja se ne vidi iz singularne osnove:
    # nebo → nebesa (ne „neba"), čudo → čudesa, telo → telesa. Kod njih bi iz
    # osnove „neb" ispalo „nebima" umesto „nebesima". Ako u rečniku postoji
    # proširen oblik, množinu uopšte ne predlažemo.
    prosirena_mnozina = any((b[:-1]+x) in S for x in ('esa','ena','eta'))
    # MNOŽINU predlažemo samo ako je već POTVRĐENA u rečniku. Mnoge imenice
    # srednjeg roda su apstraktne ili zbirne i množinu nemaju: zdravlje, povrće,
    # mleko, stanovništvo, osoblje, članstvo. Ranije je od njih ispadalo
    # „zdravljima, povrćima, mlekima" — oblici koji se ne koriste.
    # Potvrda = neki oblik ove reči je u objašnjenju označen kao množina.
    ima_mnozinu = any(re.search(r'\(množina od ' + re.escape(b) + r'\)', defs.get(f,''), re.I)
                      for f in oblici_od[b])
    if ima_mnozinu and not b.endswith('nje') and not st.endswith('et') and not prosirena_mnozina:
        ob['N/A/G mn'] = st+'a'
        ob['D/I/L mn'] = st+'ima'

    novi = {k: v for k, v in ob.items() if v not in S}
    if not novi: continue
    napomena = 'proširena osnova' if prosirena else ''
    for k, v in novi.items():
        redovi.append((b, g, k, v, napomena))

redovi.sort(key=lambda r: (-(frek.get(r[0]) or 0), r[0]))
with open(os.path.join(ROOT,'build','predlog_srednji_rod.tsv'),'w',encoding='utf-8') as f:
    f.write("imenica\tfrekvencija\tpotvrđen_genitiv\tpadež\tpredlog\tnapomena\n")
    for r in redovi:
        f.write('\t'.join([r[0], str(frek.get(r[0]) or 0), r[1], r[2], r[3], r[4]])+'\n')

print(f"imenica srednjeg roda:            {len(srednji)}")
print(f"sa potvrđenim genitivom:          {len(srednji)-len(bez_genitiva)}")
print(f"BEZ genitiva (ne diramo):         {len(bez_genitiva)}")
print(f"predloženih oblika:               {len(redovi)}")
print(f"imenica koje dobijaju bar 1 oblik:{len(set(r[0] for r in redovi))}")
print()
print("izlaz: build/predlog_srednji_rod.tsv")
