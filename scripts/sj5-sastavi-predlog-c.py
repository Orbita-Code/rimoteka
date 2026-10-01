#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SJ-5 grupa C — sastavlja PREDLOG-C-objasnjenja.md/.json iz scratchpad/sj5c-def-NN.json (isto kao sj5-sastavi-predlog.py, ali sa poljem `razlog`).
Pokretanje: python3 scripts/sj5-sastavi-predlog-c.py <scratchpad-dir>"""
import json, os, re, sys, glob
from collections import Counter
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = sys.argv[1]; IZ = os.path.join(K, 'AUDIT/SJ-5-razvrstano')
reci = {}
for f in sorted(glob.glob(os.path.join(S, 'sj5c-batch-*.json'))):
    n = int(os.path.basename(f).split('-')[2].split('.')[0])
    for z in json.load(open(f, encoding='utf-8')): reci[z['x']] = {'serija': n, 'primeri': z['primeri_oblika'], 'oblika': z['broj_oblika']}
defs = {}
for f in sorted(glob.glob(os.path.join(S, 'sj5c-def-*.json'))):
    try: defs.update(json.load(open(f, encoding='utf-8')))
    except Exception as e: print('⚠️', f, e)
nema = [x for x in reci if x not in defs]
def gres(d):
    p = []
    if '—' in d: p.append('dugačka crta')
    if re.search(r', (i|pa|te|ni) ', d): p.append('zarez pred i/pa/te/ni')
    if '"' in d: p.append('ravni navodnici')
    return p
out = []
for x, z in reci.items():
    d = defs.get(x)
    if not d: continue
    out.append({'x': x, 'grupa': 'C', 'serija': z['serija'], 'primeri': z['primeri'], 'oblika': z['oblika'], 'def': (d.get('def') or '').strip(), 'vrsta': d.get('vrsta', ''), 'sigurnost': d.get('sigurnost', ''), 'razlog': d.get('razlog', '') or '', 'greske': gres(d.get('def') or '')})
json.dump(out, open(os.path.join(IZ, 'PREDLOG-C-objasnjenja.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
sig = [o for o in out if o['sigurnost'] == 'sigurno']; prov = [o for o in out if o['sigurnost'] != 'sigurno']
raz = Counter(o['razlog'] for o in prov)
with open(os.path.join(IZ, 'PREDLOG-C-objasnjenja.md'), 'w', encoding='utf-8') as f:
    f.write('# SJ-5 grupa C – PREDLOG objašnjenja (osnove bez traga u skeniranoj Matici i bez učestalosti) – za odluku vlasnice\n\n')
    f.write(f'> Napisano svojim rečima, iz znanja srpskog (Matica ovde nije imala odrednicu). Ništa nije uneto u rečnik.\n> Ukupno {len(out)} osnova; sigurno {len(sig)}; „proveriti" {len(prov)} – po razlogu: ' + ', '.join(f'{k or "bez razloga"} {v}' for k, v in raz.most_common()) + f'. Bez objašnjenja: {len(nema)}.\n\n')
    f.write('## „Proveriti" – po razlogu\n\n')
    for r, _ in raz.most_common():
        f.write(f'### {r or "bez razloga"} ({raz[r]})\n\n| X | oblici | predlog | odluka |\n|---|---|---|---|\n')
        for o in sorted([o for o in prov if o['razlog'] == r], key=lambda o: o['x']): f.write(f"| {o['x']} | {o['primeri']} | {o['def']} | |\n")
        f.write('\n')
    f.write(f'## Sigurno ({len(sig)})\n\n| X | vrsta | oblici | objašnjenje | odluka |\n|---|---|---|---|---|\n')
    for o in sorted(sig, key=lambda o: o['x']): f.write(f"| {o['x']} | {o['vrsta']} | {o['primeri']} | {o['def']} | |\n")
print(f'C: osnova {len(reci)} · sa objašnjenjem {len(out)} · bez {len(nema)} · sigurno {len(sig)} · proveriti {len(prov)} · razlozi {dict(raz)}')
