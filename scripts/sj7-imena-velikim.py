#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SJ-7 (odluka vlasnice 10.10.2026: „pretvori u velika"): imena i mesta iz AUDIT/SJ-7-imena-malim-slovom-2026-10-10.md
dobijaju veliko početno slovo u reci.txt (isti red) i definicije.json (isti ključ). Ništa se ne briše. Posle ovoga ide
lanac: podeli_definicije → akcenat → kante → osvezi-verzije → gen_pages (pravilo 6.4). Upotreba: python3 scripts/sj7-imena-velikim.py"""
import json, os, re
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(K, 'public')
sp = open(os.path.join(K, 'AUDIT/SJ-7-imena-malim-slovom-2026-10-10.md'), encoding='utf-8').read()
reci = {m.group(1) for m in re.finditer(r'^\| ([a-zčćšđž]+) \|', sp, re.M)}
def veliko(w): return w[0].upper() + w[1:]
p = os.path.join(PUB, 'reci.txt'); l = open(p, encoding='utf-8').read().split('\n')
postoji = set(l); n = 0; preskoceno = []
for i, w in enumerate(l):
    if w in reci:
        if veliko(w) in postoji: preskoceno.append(w); continue
        l[i] = veliko(w); n += 1
open(p, 'w', encoding='utf-8').write('\n'.join(l))
d = json.load(open(os.path.join(PUB, 'definicije.json'), encoding='utf-8')); m = 0
for w in list(reci):
    if w in d and veliko(w) not in d and w not in preskoceno: d[veliko(w)] = d.pop(w); m += 1
json.dump(d, open(os.path.join(PUB, 'definicije.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, separators=(',', ': '))
print(f'reci.txt preimenovano {n}, definicije {m}, preskočeno (već ima veliki dvojnik) {len(preskoceno)}: {preskoceno[:10]}')
