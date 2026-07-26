#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Meri koliko su IMENICE u rečniku promenjene po rodu, broju i padežu.
NIŠTA NE UPISUJE — pravi samo izveštaj.

Metod (bez ijednog izmišljenog oblika):
  1. `definicije.json` u 63% slučajeva kaže „Oblik reči X" / „Oblik glagola X" /
     „Oblik prideva X" — odatle se dobija veza OBLIK → OSNOVNA REČ.
  2. Osnovne reči se razvrstavaju: glagol (završava na -ti/-ći), pridev (postoji
     oblik na -og, imenice ga nemaju), inače imenica.
  3. Za svaku imenicu se BROJI koliko oblika stvarno postoji u rečniku i poredi
     sa tipičnom veličinom paradigme za taj rod.

Zašto ovako: raniji pokušaj je oblike gradio po pravilima i grešio, jer se
oblici prideva (`žutog`, `živom`) i glagola (`življah`) po završetku ne
razlikuju od imenica, a imenice imaju nepostojano A (`žižak → žiška`),
sibilarizaciju i palatalizaciju. Brojanje postojećih oblika ne može da pogreši.
"""
import os, json, re
from collections import defaultdict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
reci = [l.strip() for l in open(os.path.join(PUB,'reci.txt'), encoding='utf-8') if l.strip()]
S = set(reci)
defs = json.load(open(os.path.join(PUB,'definicije.json'), encoding='utf-8'))

OBLIK = re.compile(r'^Oblik (?:reči|glagola|prideva|imenice)\s+[„"]?([a-zčćžšđ]+)[„"]?', re.I)

# 1) oblik -> osnovna reč
osnova_od = {}
for w, o in defs.items():
    m = OBLIK.match(o.strip())
    if m:
        b = m.group(1).lower()
        if b != w and b in S:
            osnova_od[w] = b

# 2) osnovna reč -> svi njeni oblici
oblici_od = defaultdict(set)
for w, b in osnova_od.items():
    oblici_od[b].add(w)
for b in list(oblici_od):
    oblici_od[b].add(b)

# 3) razvrstavanje osnovnih reči
def vrsta(b):
    if b.endswith('ti') or b.endswith('ći'): return 'glagol'
    if (b + 'og') in S or (b + 'oga') in S:  return 'pridev'
    if b.endswith('a'):        return 'imenica ž'
    if b[-1] in ('o','e'):     return 'imenica s'
    if b[-1] not in 'aeiou':   return 'imenica m'
    return 'ostalo'

# tipičan broj različitih oblika u punoj paradigmi (jd + mn, bez ponavljanja)
PUNA = {'imenica m': 9, 'imenica ž': 9, 'imenica s': 7}

if __name__ == '__main__':
    stat = Counter(); po_rodu = defaultdict(list)
    for b, obl in oblici_od.items():
        v = vrsta(b)
        stat[v] += 1
        if v.startswith('imenica'):
            po_rodu[v].append((len(obl), b))

    print("=== osnovne reči prepoznate iz objašnjenja ===")
    for k, n in stat.most_common():
        print(f"  {k:<12} {n:>7}")
    print()
    ukupno_im = sum(len(v) for v in po_rodu.values())
    print(f"=== pokrivenost paradigme imenica ({ukupno_im} imenica) ===")
    for rod in ('imenica m','imenica ž','imenica s'):
        lst = po_rodu[rod]
        if not lst: continue
        puna = PUNA[rod]
        c = Counter()
        for n, b in lst:
            c[min(n, puna) * 100 // puna // 25 * 25] += 1
        print(f"\n  {rod}  ({len(lst)} imenica, puna paradigma ≈ {puna} oblika)")
        for k in sorted(c, reverse=True):
            print(f"    {k:>3}-{k+24}% : {c[k]:>6}")
        lst.sort()
        print(f"    primeri najkrnjijih: " + ', '.join(f"{b}({n})" for n, b in lst[:8]))

    prosek = {r: sum(n for n,_ in v)/len(v) for r, v in po_rodu.items() if v}
    print()
    for r, p in prosek.items():
        print(f"  prosečno oblika po imenici — {r}: {p:.1f} / {PUNA[r]}")
