#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Odbijanje reči iz grupe C po naredbi vlasnice: briše oblike iz reci.txt/definicije.json, označi u PREDLOG-C, osveži C-sigurne-za-odluku.md, upiše u ODLUKE.md.
Pokretanje: python3 scripts/sj5-c-odbij.py reč [reč…]   (posle svega: lanac podataka – podeli_definicije, akcenat, kante, osvezi, gen_pages)"""
import json, re, sys, os, datetime
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(K, 'public'); AU = os.path.join(K, 'AUDIT/SJ-5-razvrstano')
reci_za = sys.argv[1:]
d = json.load(open(f'{PUB}/definicije.json', encoding='utf-8'))
reci = [l for l in open(f'{PUB}/reci.txt', encoding='utf-8').read().split('\n') if l]; R = set(reci)
obl = {}
for w, v in d.items():
    m = re.match(r'^Oblik reči ([^\s.,;(]+)', v if isinstance(v, str) else '')
    if m: obl.setdefault(m.group(1), []).append(w)
log = []
for x in reci_za:
    for o in obl.get(x, []):
        if o in R: reci.remove(o); R.discard(o)
        d.pop(o, None); log.append(f'{x}: obrisan oblik {o}')
    if x in R: reci.remove(x); R.discard(x); log.append(f'{x}: obrisana osnova')
    d.pop(x, None)
    if not obl.get(x): log.append(f'{x}: nije imala oblike u rečniku')
reci.sort()
open(f'{PUB}/reci.txt', 'w', encoding='utf-8').write('\n'.join(reci) + '\n')
json.dump(d, open(f'{PUB}/definicije.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
p = f'{AU}/PREDLOG-C-objasnjenja.json'; c = json.load(open(p, encoding='utf-8'))
for x in c:
    if x['x'] in reci_za: x['sigurnost'] = 'odbijeno'; x['odluka'] = f'vlasnica {datetime.date.today():%d.%m.%Y}: izbriši'
json.dump(c, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
sig = sorted([x for x in c if x['sigurnost'] == 'sigurno'], key=lambda x: x['x'].lower())
odb = sorted(x['x'] for x in c if x['sigurnost'] == 'odbijeno')
with open(f'{AU}/C-sigurne-za-odluku.md', 'w', encoding='utf-8') as f:
    f.write(f'# SJ-5 grupa C – SIGURNE reči ({len(sig)}) sa predloženim objašnjenjem\n\n> Osnove kojih nema u rečniku, a čiji oblici stoje u rečniku sa napomenom „Oblik reči X". Objašnjenja pisana svojim rečima. Ništa nije uneto. Odluka: „da za C sigurne" ili pojedinačno „X ne" / „za X piši …".\n> Odbijeno ({len(odb)}): {", ".join(odb)}.\n\n| # | Reč | Vrsta | Oblici u rečniku | Objašnjenje |\n|---|---|---|---|---|\n')
    for i, x in enumerate(sig, 1): f.write(f"| {i} | {x['x']} | {x['vrsta']} | {x['primeri']} | {x['def']} |\n")
with open(f'{AU}/ODLUKE.md', 'a', encoding='utf-8') as f:
    f.write(f'\n- {datetime.date.today():%d.%m.%Y} grupa C, izbriši: ' + '; '.join(log) + '\n')
print('\n'.join(log)); print(f'C sigurnih: {len(sig)} · odbijeno: {len(odb)} · reci.txt: {len(reci)}')
