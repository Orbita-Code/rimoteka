#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AK-3 (audit 07.10.2026): koliko greši pretpostavka „pretposlednji slog, uzlazni" i koliko bi pomogao blaži prag
prediktora po završetku. Merenje OSTAVI-JEDNOG-NAPOLJU nad Wiktionary osnovama (build/akcenti-osnove.json): za svaku
reč sa 3+ sloga, statistika završetaka se gradi bez nje, pa se predviđa i poredi sa istinom (slog od kraja od kog
počinje rima, po pravilu AK-1). Ispis: za svaki prag – pokrivenost (koliko reči prediktor uopšte zna), tačnost tamo
gde zna, i ukupna tačnost kad ostatak dobije podrazumevano. Ništa ne menja na sajtu.
Pokretanje: python3 scripts/akcenti-prediktor-ocena.py"""
import json, os, collections, sys
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(K, 'build'))
akc = json.load(open(os.path.join(K, 'build/akcenti-osnove.json'), encoding='utf-8'))
VOWELS = set('aeiou')
def vowel_positions(w):
    w = w.lower(); p = []
    for i, ch in enumerate(w):
        if ch in VOWELS: p.append(i)
        elif ch == 'r':
            prevV = i > 0 and w[i-1] in VOWELS; nextV = i < len(w)-1 and w[i+1] in VOWELS
            if not prevV and not nextV: p.append(i)
    return p
def od_kraja(ns, op, tip, dug):
    start = op + 1 if (tip == 'uzlazni' and dug and ns - op >= 2) else op
    start = max(1, min(start, ns)); return ns - start + 1
reci = [(w, v) for w, v in akc.items() if len(vowel_positions(w)) >= 3]
suf = collections.defaultdict(collections.Counter)
for w, v in akc.items():
    op = v['slogova'] - v['od_kraja'] + 1
    for n in (3, 4, 5, 6):
        if len(w) >= n: suf[(n, w[-n:], v['slogova'])][(op, v['tip'], bool(v.get('iza_dug')))] += 1
def istina(w, v):
    ns = len(vowel_positions(w)); return od_kraja(ns, v['slogova'] - v['od_kraja'] + 1, v['tip'], bool(v.get('iza_dug')))
def podrazumevano(w):
    ns = len(vowel_positions(w)); return od_kraja(ns, max(1, ns - 1), 'uzlazni', False)
def predvidi(w, v, nmin, prag):
    ns = len(vowel_positions(w)); moj = (v['slogova'] - v['od_kraja'] + 1, v['tip'], bool(v.get('iza_dug')))
    for n in (6, 5, 4, 3):
        if len(w) < n: continue
        c = suf.get((n, w[-n:], v['slogova']))
        if not c: continue
        c = c.copy(); c[moj] -= 1
        if c[moj] <= 0: del c[moj]
        uk = sum(c.values())
        if uk >= nmin:
            (o, t, d), k = c.most_common(1)[0]
            if k / uk >= prag: return od_kraja(ns, o, t, d)
    return None
print(f'reči sa 3+ sloga u Wiktionary-ju: {len(reci)}')
tacno_podr = sum(1 for w, v in reci if podrazumevano(w) == istina(w, v))
print(f'PODRAZUMEVANO (pretposlednji, uzlazni): tačno {tacno_podr}/{len(reci)} = {100*tacno_podr/len(reci):.1f} %')
print('\n| nmin | prag | pokriveno | tačno gde zna | ukupno (ostatak podrazumevano) |')
print('|---|---|---|---|---|')
for nmin in (2, 3, 4, 5):
    for prag in (0.6, 0.7, 0.75, 0.85):
        pok = tac = uk = 0
        for w, v in reci:
            p = predvidi(w, v, nmin, prag); t = istina(w, v)
            if p is None: uk += (podrazumevano(w) == t)
            else: pok += 1; tac += (p == t); uk += (p == t)
        print(f'| {nmin} | {prag} | {100*pok/len(reci):.1f} % | {100*tac/max(1,pok):.1f} % | {100*uk/len(reci):.1f} % |')
