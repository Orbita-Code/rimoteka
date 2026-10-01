#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SJ-5 — UNOS po odluci vlasnice (01.10.2026): „da za A i za B sigurne reči, hrvatske izbriši, ijekavske ubaci
da budu aktivne u ijekavskom režimu".

Šta radi (sve se loguje u AUDIT/SJ-5-razvrstano/UNOS-<datum>.md):
  1. osnove iz A i B sa sigurnost=sigurno → u `reci.txt` (sortirano kao fajl) + objašnjenje u `definicije.json`
  2. hrvatske osnove → njihovi oblici („Oblik reči X") se BRIŠU iz `reci.txt`/`reci_jekavica.txt` i `definicije.json`
  3. ijekavske osnove → oblici se PREMEŠTAJU iz `reci.txt` u `reci_jekavica.txt`; osnova ide u `reci_jekavica.txt` + objašnjenje
  4. lipica: oblici upućuju na `lipica` (biljka), ne na `Lipica`
  5. ostalo (42 sporne) se NE dira – čeka odluku
Posle: python3 build/podeli_definicije.py && python3 build/kante.py && node scripts/osvezi-verzije-podataka.mjs && python3 build/gen_pages.py
"""
import json, os, re, datetime
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(K, 'public'); AU = os.path.join(K, 'AUDIT/SJ-5-razvrstano')
predlog = json.load(open(os.path.join(AU, 'PREDLOG-objasnjenja.json'), encoding='utf-8'))
odl = json.load(open(os.path.join(AU, 'B-sporne-odluka.json'), encoding='utf-8'))
defs = json.load(open(os.path.join(PUB, 'definicije.json'), encoding='utf-8'))
reci = [l for l in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8').read().split('\n') if l]
jek = [l for l in open(os.path.join(PUB, 'reci_jekavica.txt'), encoding='utf-8').read().split('\n') if l]
R, J = set(reci), set(jek)
HRV, IJEK, OST = set(odl['hrvatski']), set(odl['ijekavski']), set(odl['ostalo_ceka_odluku'])
sporne = {x['x'] for x in predlog if x['sigurnost'] != 'sigurno'}
assert sporne == HRV | IJEK | OST, ('sporne ≠ odluka', sporne ^ (HRV | IJEK | OST))

oblici = {}
for w, d in defs.items():
    m = re.match(r'^Oblik reči ([^\s.,;(]+)', d if isinstance(d, str) else '')
    if m: oblici.setdefault(m.group(1), []).append(w)

log = {'dodato': [], 'dodato_jek': [], 'obrisano': [], 'premesteno': [], 'preskoceno': [], 'lipica': []}
# 1) sigurne osnove iz A i B
for x in predlog:
    w = x['x']
    if x['sigurnost'] != 'sigurno' or w in HRV or w in IJEK or w in OST: continue
    if w in R or w in J or w.lower() in R: log['preskoceno'].append((w, 'već u rečniku')); continue
    if not x['def'].strip(): log['preskoceno'].append((w, 'prazno objašnjenje')); continue
    reci.append(w); R.add(w); defs[w] = x['def'].strip(); log['dodato'].append(w)
# 2) hrvatske: brisanje oblika
for w in sorted(HRV):
    for o in oblici.get(w, []):
        if o in R: reci.remove(o); R.discard(o); log['obrisano'].append((o, w, 'reci.txt'))
        if o in J: jek.remove(o); J.discard(o); log['obrisano'].append((o, w, 'reci_jekavica.txt'))
        defs.pop(o, None)
    defs.pop(w, None)
# 3) ijekavske: premeštanje oblika + osnova u ijekavicu
for w in sorted(IJEK):
    for o in oblici.get(w, []):
        if o in R:
            reci.remove(o); R.discard(o)
            if o not in J: jek.append(o); J.add(o)
            log['premesteno'].append((o, w))
    if w not in J and w not in R:
        jek.append(w); J.add(w); log['dodato_jek'].append(w)
    defs[w] = odl['ijekavski_objasnjenja'][w]
# 4) lipica
for o in oblici.get('Lipica', []):
    if o in defs: defs[o] = 'Oblik reči lipica (biljka).'; log['lipica'].append(o)
# upis
reci.sort(); jek.sort()
open(os.path.join(PUB, 'reci.txt'), 'w', encoding='utf-8').write('\n'.join(reci) + '\n')
open(os.path.join(PUB, 'reci_jekavica.txt'), 'w', encoding='utf-8').write('\n'.join(jek) + '\n')
json.dump(defs, open(os.path.join(PUB, 'definicije.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
dat = datetime.date.today().isoformat()
with open(os.path.join(AU, f'UNOS-{dat}.md'), 'w', encoding='utf-8') as f:
    f.write(f'# SJ-5 – unos {dat} po odluci vlasnice\n\n| Šta | Koliko |\n|---|---|\n')
    for k, v in log.items(): f.write(f'| {k} | {len(v)} |\n')
    f.write('\n## Dodato u reci.txt\n' + ', '.join(log['dodato']) + '\n\n## Dodato u reci_jekavica.txt (osnove)\n' + ', '.join(log['dodato_jek']))
    f.write('\n\n## Premešteno u ijekavicu (oblik ← osnova)\n' + ', '.join(f'{o}←{w}' for o, w in log['premesteno']))
    f.write('\n\n## Obrisano (hrvatski oblici)\n' + ', '.join(f'{o}←{w}' for o, w, _ in log['obrisano']))
    f.write('\n\n## Preskočeno\n' + ', '.join(f'{w} ({r})' for w, r in log['preskoceno']) + '\n\n## lipica – oblici prepisani\n' + ', '.join(log['lipica']) + '\n')
print({k: len(v) for k, v in log.items()}, '| reci.txt:', len(reci), '| jekavica:', len(jek), '| definicija:', len(defs))
print('preskočeno:', log['preskoceno'][:10])
