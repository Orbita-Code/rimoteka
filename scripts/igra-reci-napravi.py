#!/usr/bin/env python3
"""Spisak reči koje IGRA sme da zada – odluka vlasnice 08.09.2026: samo imenice, glagoli i pridevi od 2 do 4 sloga.

Ulaz: AUDIT/analiza/igra-bazen.json (bazen iz pravog koda igre: 8.000 najčešćih, bez vulgarnih/ijekavskih, sa rimom)
      + srLex (vrsta reči po najčešćoj upotrebi oblika). Izlaz: public/igra-reci.json (niz reči, po učestalosti).
Kockica i ostatak sajta i dalje koriste stari bazen – ovo je SAMO za igru.
Pokretanje: node test/igra-bazen.mjs && python3 scripts/igra-reci-napravi.py, pa node scripts/osvezi-verzije-podataka.mjs
"""
import json, gzip, os, collections
KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(KOREN, 'AUDIT/analiza/igra-bazen.json'), encoding='utf-8'))
kandidati = [r for r in d['reci'] if r['igra'] and 2 <= r['s'] <= 4 and r['w'][0].islower()]
skup = {r['w'] for r in kandidati}
upotrebe = collections.defaultdict(collections.Counter)
with gzip.open(os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz'), 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        k = red.split('\t')
        if len(k) < 8 or k[0] not in skup: continue
        try: n = int(k[6])
        except ValueError: n = 0
        upotrebe[k[0]][k[4]] += n + 1
DOZVOLJENE = {'NOUN', 'VERB', 'ADJ'}
izabrane = []
odbijene = collections.Counter()
for r in sorted(kandidati, key=lambda x: -x['f']):
    c = upotrebe.get(r['w'])
    if not c: odbijene['srLex ne zna'] += 1; continue
    vrsta = c.most_common(1)[0][0]
    if vrsta not in DOZVOLJENE: odbijene[vrsta] += 1; continue
    izabrane.append(r['w'])
json.dump(izabrane, open(os.path.join(KOREN, 'public/igra-reci.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('kandidata (2–4 sloga, malo slovo, sa rimom):', len(kandidati), '· izabrano:', len(izabrane), '· odbijeno po vrsti:', dict(odbijene.most_common()))
print('prvih 30:', ', '.join(izabrane[:30]))
print('poslednjih 15:', ', '.join(izabrane[-15:]))
