#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Simulacija: rime PO AKCENTU naspram današnjih (po slogovima). Ništa ne menja na sajtu.
Akcenat: Wiktionary (osnova) → srLex (oblik → osnova) → mesto naglašenog sloga OD POČETKA se prenosi na oblik.
Za reči bez podatka: predviđanje po završetku (statistika nad 28.934 akcentovanih osnova), sa pouzdanošću.
Pokretanje: python3 scripts/akcenti-simulacija.py televizor rima sloboda ..."""
import json, os, gzip, sys, collections
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
akc = json.load(open(os.path.join(K, 'AUDIT/akcenti/akcenti-osnove.json'), encoding='utf-8'))
freq = json.load(open(os.path.join(K, 'public/frekvencija.json'), encoding='utf-8'))
reci = [l for l in open(os.path.join(K, 'public/reci.txt'), encoding='utf-8').read().split('\n') if l]
R = set(reci); lema = {}
with gzip.open(os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz'), 'rt', encoding='utf-8') as f:
    for l in f:
        p = l.split('\t')
        if len(p) > 2 and p[0] in R and p[0] not in lema: lema[p[0]] = p[1]
VOK = set('aeiou')
def vokali(w):
    w = w.lower(); poz = []
    for i, c in enumerate(w):
        if c in VOK: poz.append(i)
        elif c == 'r' and (i == 0 or w[i-1] not in VOK) and (i + 1 >= len(w) or w[i+1] not in VOK) and not (i > 0 and w[i-1] == 'r'): poz.append(i)
    return poz
def rhyme_key(w):
    w = w.lower(); vp = vokali(w)
    if not vp: return w
    last = vp[-1]
    if last < len(w) - 1: return w[last:]
    return w[vp[-2]:] if len(vp) >= 2 else w[last:]
# statistika završetaka: za predviđanje mesta akcenta (od početka) kod reči bez podatka
suf_stat = collections.defaultdict(collections.Counter)
for w, v in akc.items():
    od_poc = v['slogova'] - v['od_kraja'] + 1
    for n in (3, 4, 5, 6):
        if len(w) >= n: suf_stat[(n, w[-n:], v['slogova'])][(od_poc, v['tip'])] += 1
def akcenat(w):
    """→ (od_početka, tip, slogova_oblika, izvor) ili None. izvor: 'wikt', 'lema', 'pravilo' (1–2 sloga), 'zavrsetak(k/n)', 'podrazumevano'."""
    m = w.lower(); nslog = len(vokali(m))
    if nslog == 0: return None
    if m in akc:
        v = akc[m]; return v['slogova'] - v['od_kraja'] + 1, v['tip'], nslog, 'wikt'
    l = lema.get(w, '').lower()
    if l and l in akc:
        v = akc[l]; op = v['slogova'] - v['od_kraja'] + 1
        if op <= nslog: return op, v['tip'], nslog, 'lema'
    if nslog <= 2: return 1, '', nslog, 'pravilo'   # poslednji slog nikad nije naglašen → dvosložna: prvi slog
    for n in (6, 5, 4, 3):
        if len(m) >= n:
            c = suf_stat.get((n, m[-n:], nslog))
            if c and sum(c.values()) >= 3:
                (op, tip), k = c.most_common(1)[0]
                if k / sum(c.values()) >= 0.75: return op, tip, nslog, 'zavrsetak'
    return nslog - 1, 'uzlazni', nslog, 'podrazumevano'   # najčešći obrazac: ženska rima od pretposlednjeg sloga
IZVORI = collections.Counter()
def akc_key(w):
    """Ključ rime po AKCENATSKOJ JEDINICI: od naglašenog sloga; kod UZLAZNOG akcenta ton prelazi na sledeći slog,
    pa kad iza naglašenog ima bar dva sloga, rima počinje od sloga IZA naglašenog (telèvīzor → -izor, dìrektor → -ektor)."""
    a = akcenat(w)
    if not a: return None
    op, tip, n, izvor = a; IZVORI[izvor] += 1
    start = op
    if tip == 'uzlazni' and n - op >= 2: start = op + 1
    vp = vokali(w)
    if start - 1 >= len(vp): return None
    return w.lower()[vp[start - 1]:], izvor
def rank(w): f = freq.get(w, 0); return -f if f >= 10 else 10**9
def common_suffix(a, b):
    n = 0
    while n < len(a) and n < len(b) and a[-1-n] == b[-1-n]: n += 1
    return n
for q in sys.argv[1:]:
    key = rhyme_key(q); qs = len(vokali(q)); qa = akc_key(q)
    cands = [w for w in reci if rhyme_key(w) == key and w.lower() != q]
    a_txt = akc.get(q, {}).get('akc', '(nema u Wiktionary-ju)'); ka = qa[0] if qa else '?'; iz = qa[1] if qa else 'bez podatka'
    print('\n=== ' + q + ': akcenat ' + a_txt + ' / ključ po slogovima ' + key + ' / ključ po akcentu ' + ka + ' (' + iz + ') / kandidata ' + str(len(cands)))
    if not qa: print('  ne može po akcentu – ostaje današnje pravilo'); continue
    prave, ostale, nepoznate = [], [], []
    for w in cands:
        k = akc_key(w)
        if k is None: nepoznate.append(w)
        elif k[0] == qa[0]: prave.append(w)
        else: ostale.append(w)
    srt = lambda L: sorted(L, key=lambda w: (abs(len(vokali(w)) - qs), -common_suffix(q, w.lower()), rank(w)))
    print('  PRAVE rime (ista akcenatska jedinica):', ', '.join(srt(prave)[:16]) or '–')
    print('  OSTALE (poklapa se samo kraj, akcenat drugde):', ', '.join(srt(ostale)[:12]) or '–')
    print(f'  bez podatka o akcentu: {len(nepoznate)} od {len(cands)} →', ', '.join(srt(nepoznate)[:8]))

# pokrivenost po izvoru nad celim rečnikom
IZVORI.clear()
for w in reci: akc_key(w)
print('\nIzvor ključa za svih', len(reci), 'oblika:', dict(IZVORI))
