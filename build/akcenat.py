#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AKCENAT ZA SVAKU REČ → `public/akcenat.txt` (+ `public/akcenat_jekavica.txt`), odluka vlasnice 05.10.2026 („da, ugradi akcente").

Za svaku reč iz `reci.txt` (red po red, isti redosled) upisuje JEDAN broj: od kog SLOGA OD KRAJA počinje prava rima
(„akcenatska jedinica"). 1 = poslednji slog, 2 = pretposlednji (ženska rima)… Alat i generator iz toga prave ključ:
reč od tog samoglasnika do kraja (`akcKey`).

Pravilo (GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md, pogl. 7 i 7a; AUDIT/akcenti/pokrivenost.md):
  · rima počinje od naglašenog sloga;
  · kod UZLAZNOG akcenta ton prelazi na sledeći slog, pa ako iza naglašenog ima bar dva sloga, rima počinje od sloga iza njega
    (telèvīzor → -izor, dìrektor → -ektor); silazni ne prelazi (stvȃrima → -arima).
Odakle akcenat, redom: (1) Wiktionary, sama reč; (2) Wiktionary, osnova reči preko srLex-a (mesto akcenta OD POČETKA se
prenosi na oblik); (3) 1–2 sloga: prvi slog (poslednji nikad nije naglašen); (4) predviđanje po završetku (≥3 primera,
≥75 % slaganja); (5) podrazumevano: pretposlednji slog (najčešći obrazac). Izvor po reči ide u AUDIT/akcenti/izvori.json.

Izvori: build/akcenti-osnove.json (iz `scripts/akcenti-iz-wiktionary.py`, kaikki.org izvod en.wiktionary, CC BY-SA),
~/Literatura/srLex/srLex_v1.3.gz. Pokretanje: python3 build/akcenat.py (posle svake izmene reci.txt / reci_jekavica.txt, PRE kante.py).
"""
import json, os, gzip, collections, sys
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(K, 'public')
VOWELS = set('aeiou')
def vowel_positions(w):   # 1:1 sa gen_pages.py i app.js (vowelPositions)
    w = w.lower(); p = []
    for i, ch in enumerate(w):
        if ch in VOWELS: p.append(i)
        elif ch == 'r':
            prevV = i > 0 and w[i-1] in VOWELS; nextV = i < len(w)-1 and w[i+1] in VOWELS
            if not prevV and not nextV: p.append(i)
    return p
akc = json.load(open(os.path.join(K, 'build/akcenti-osnove.json'), encoding='utf-8'))
ek = [l for l in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8').read().split('\n') if l]
jek = [l for l in open(os.path.join(PUB, 'reci_jekavica.txt'), encoding='utf-8').read().split('\n') if l]
sve = set(ek) | set(jek); lema = {}
with gzip.open(os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz'), 'rt', encoding='utf-8') as f:
    for l in f:
        p = l.split('\t')
        if len(p) > 2 and p[0] in sve and p[0] not in lema: lema[p[0]] = p[1]
suf = collections.defaultdict(collections.Counter)
for w, v in akc.items():
    op = v['slogova'] - v['od_kraja'] + 1
    for n in (3, 4, 5, 6):
        if len(w) >= n: suf[(n, w[-n:], v['slogova'])][(op, v['tip'])] += 1
def mesto(w):
    """→ (slog od kraja od kog počinje rima, izvor)"""
    m = w.lower(); vp = vowel_positions(m); ns = len(vp)
    if ns == 0: return 1, 'bez-samoglasnika'
    op = tip = None; izvor = None
    if m in akc: v = akc[m]; op, tip, izvor = v['slogova'] - v['od_kraja'] + 1, v['tip'], 'wikt'
    else:
        l = lema.get(w, '').lower()
        if l in akc and akc[l]['slogova'] - akc[l]['od_kraja'] + 1 <= ns: v = akc[l]; op, tip, izvor = v['slogova'] - v['od_kraja'] + 1, v['tip'], 'lema'
    if op is None:
        if ns <= 2: op, tip, izvor = 1, '', 'pravilo'
        else:
            for n in (6, 5, 4, 3):
                c = suf.get((n, m[-n:], ns)) if len(m) >= n else None
                if c and sum(c.values()) >= 3:
                    (o, t), k = c.most_common(1)[0]
                    if k / sum(c.values()) >= 0.75: op, tip, izvor = o, t, 'zavrsetak'; break
    if op is None: op, tip, izvor = max(1, ns - 1), 'uzlazni', 'podrazumevano'
    start = op + 1 if (tip == 'uzlazni' and ns - op >= 2) else op
    start = max(1, min(start, ns))
    return ns - start + 1, izvor
stat = collections.Counter(); izvori = {}
def pisi(reci, ime):
    out = []
    for w in reci:
        n, iz = mesto(w); out.append(str(n)); stat[iz] += 1; izvori[w] = iz
    open(os.path.join(PUB, ime), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
pisi(ek, 'akcenat.txt'); pisi(jek, 'akcenat_jekavica.txt')
os.makedirs(os.path.join(K, 'AUDIT/akcenti'), exist_ok=True)
json.dump(izvori, open(os.path.join(K, 'AUDIT/akcenti/izvori.json'), 'w', encoding='utf-8'), ensure_ascii=False)
rasp = collections.Counter(open(os.path.join(PUB, 'akcenat.txt'), encoding='utf-8').read().split())
print('akcenat.txt redova:', len(ek), '| akcenat_jekavica.txt:', len(jek), '| izvori:', dict(stat), '| slog od kraja:', dict(sorted(rasp.items())))
