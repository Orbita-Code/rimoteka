#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SJ-7 nastavak (10.10.2026): reč koja je ISTOVREMENO ime/mesto i obična reč (pisa = Piza i „oblik glagola pisati";
neda = ime i „ne da"; iko = ime i zamenica) dobija OBA zapisa: veliko slovo za ime (već urađeno), i mali zapis sa objašnjenjem
običnog značenja (drugi deo objašnjenja iza „;"). Test K3 je uhvatio „pisa". Upotreba: python3 scripts/sj7-dvosmislene.py"""
import json, os, re
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(K, 'public')
sp = open(os.path.join(K, 'AUDIT/SJ-7-imena-malim-slovom-2026-10-10.md'), encoding='utf-8').read()
reci = [m.group(1) for m in re.finditer(r'^\| ([a-zčćšđž]+) \|', sp, re.M)]
d = json.load(open(os.path.join(PUB, 'definicije.json'), encoding='utf-8'))
l = [x for x in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8').read().split('\n') if x]; R = set(l)
OBICNA = re.compile(r'oblik (glagola|zamenice|reči|prideva|imena)|trpni pridev|turcizam|dijalekatski|dijal\.|žargonski|arhaično|mitraljez|vrsta patke|biljka|čestica|mesec avgust|bodež|titula|mladica|nadzornik|zarez|kamen \(|hleb –|sve teče|laboratorija|mina \(|oblik krova|jezero \(|luka \(|reka \(|planina, breg|država \(|crven vo|rasad|sadnica|ljiljan|slava \(|veličina|pesak|kraljica\)|lav \(|marka \(novac|putovanje, pohod|horoskopski|virus', re.I)
dodato = []
for w in reci:
    W = w[0].upper() + w[1:]
    v = str(d.get(W, ''))
    if W not in R or w in R: continue
    delovi = [x.strip() for x in v.split(';')]
    if len(delovi) < 2: continue
    ostatak = '; '.join(delovi[1:]).rstrip('.')
    if not OBICNA.search(ostatak): continue
    obj = ostatak[0].upper() + ostatak[1:] + '.'
    l.append(w); d[w] = obj; dodato.append((w, obj))
open(os.path.join(PUB, 'reci.txt'), 'w', encoding='utf-8').write('\n'.join(l) + '\n')
json.dump(d, open(os.path.join(PUB, 'definicije.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, separators=(',', ': '))
print(f'vraćen mali zapis za {len(dodato)} reči:'); [print(' ', w, '|', o) for w, o in dodato]
