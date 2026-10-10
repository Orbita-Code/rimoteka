#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SJ-8 (naredba vlasnice 10.10.2026: „izbaci nepoznata strana mesta"): iz rečnika izlaze malo poznata STRANA mesta
(gradovi, pokrajine, reke van našeg regiona) sa spiska ispod. Države i svetski poznati gradovi OSTAJU; mesta iz Srbije i
regiona OSTAJU. Reči su već velikim slovom (SJ-7). Upotreba: python3 scripts/sj8-strana-mesta.py [--apply]"""
import json, os, re, sys, datetime
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(K, 'public')
IZBACI = '''almerija asturije arlington astrahan bolton brindizi burgas burgos debrecin denkerk dizeldorf edmonton ferara fukuoka gloster
guam hagen henan himki junan kalinin kasel katanija kavaja klajd klivland kolambus kompton kozana krems kutaisi lemgo lester lids
lokarno lubin lund malopoljska manitoba medan merida natal opole oradea oran ostende pert pleven preston puebla reading rosario
samokov santos'''.split()
sp = open(os.path.join(K, 'AUDIT/SJ-7-imena-malim-slovom-2026-10-10.md'), encoding='utf-8').read()
mesta = {m.group(1): m.group(2) for m in re.finditer(r'^\| ([a-zčćšđž]+) \| ([^|]+) \|', sp, re.M)
         if re.match(r'^[A-ZČĆŠĐŽ][a-zčćšđž]+ – (grad|reka|država|planina|ostrvo|selo|varoš|jezero|pokrajina|oblast|republika|prestonica|luka)', m.group(2))}
reci = [l for l in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8').read().split('\n') if l]; R = set(reci)
def veliko(w): return w[0].upper() + w[1:]
brisi = {veliko(w): mesta.get(w, '') for w in IZBACI if veliko(w) in R}
ostaju = {veliko(w): d for w, d in mesta.items() if w not in IZBACI and veliko(w) in R}
danas = datetime.date.today().isoformat(); put = os.path.join(K, f'AUDIT/SJ-8-strana-mesta-{danas}.md')
with open(put, 'w', encoding='utf-8') as f:
    f.write(f'# SJ-8 – malo poznata strana mesta izbačena iz rečnika ({danas})\n\n> Naredba vlasnice: „izbaci nepoznata strana mesta". Izbačeno {len(brisi)}; zadržano {len(ostaju)} (države, svetski poznati gradovi i sva mesta iz Srbije i regiona). Ako nešto treba drugačije – kaži, reč se vraća iz git istorije ili briše.\n\n## Izbačeno ({len(brisi)})\n\n| Reč | Objašnjenje |\n|---|---|\n')
    for w in sorted(brisi): f.write(f'| {w} | {brisi[w][:90]} |\n')
    f.write(f'\n## Zadržano ({len(ostaju)})\n\n| Reč | Objašnjenje |\n|---|---|\n')
    for w in sorted(ostaju): f.write(f'| {w} | {ostaju[w][:90]} |\n')
print(f'izbacuje se {len(brisi)}, ostaje {len(ostaju)} · spisak {put}')
if '--apply' in sys.argv:
    B = set(brisi)
    open(os.path.join(PUB, 'reci.txt'), 'w', encoding='utf-8').write('\n'.join(w for w in reci if w not in B) + '\n')
    d = json.load(open(os.path.join(PUB, 'definicije.json'), encoding='utf-8'))
    for w in B: d.pop(w, None)
    json.dump(d, open(os.path.join(PUB, 'definicije.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, separators=(',', ': '))
    mp = os.path.join(PUB, 'matica.json'); mat = json.load(open(mp, encoding='utf-8')); mat2 = [w for w in mat if w not in B and veliko(w) not in B]
    if len(mat2) != len(mat): json.dump(mat2, open(mp, 'w', encoding='utf-8'), ensure_ascii=False)
    print('OBRISANO', len(B))
