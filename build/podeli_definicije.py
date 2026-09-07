#!/usr/bin/env python3
"""DEFINICIJE PO SLOVIMA (nalaz S-20, audit 07.09.2026).

`definicije.json` ima 20,7 MB (5,4 MB gzip) i skidao se CEO na prvi dodir „značenje" —
na WiFi 3,7 s, na 1,6 Mb/s računato 27 s. Ovo ga deli na male fajlove po PRVOM slovu
reči (a za velika slova — p, s, n, o… — po prva DVA slova), pa se za jedno značenje
skida 30–300 KB umesto 5,4 MB.

Izlaz: `public/definicije/<ime>.json` + `public/definicije/spisak.json` (koje slovo ima
koliko nivoa). `app.js` (`loadLocalDefs`) računa ime fajla ISTIM pravilom kao ovde —
ako se pravilo menja, menja se na oba mesta. Pre-deploy test (sekcija 53) proverava
da zbir unosa u deljenim fajlovima = unosi u `definicije.json`.

Pokretanje: posle SVAKE izmene `definicije.json`, pre `osvezi-verzije-podataka.mjs`:
    python3 build/podeli_definicije.py
Ceo `definicije.json` OSTAJE (izvor istine i za skripte rečnika); sajt ga više ne skida.
"""
import json, os, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IZVOR = os.path.join(ROOT, 'public', 'definicije.json')
CILJ = os.path.join(ROOT, 'public', 'definicije')
SLOVA = 'abcčćdđefghijklmnoprsštuvzž'
IME = {'č': 'cx', 'ć': 'cy', 'š': 'sx', 'ž': 'zx', 'đ': 'dx'}
GRANICA = 700_000          # bajtova sirovog JSON-a po slovu iznad koje se deli na dva slova

def ime_fajla(kljuc):
    return ''.join(IME.get(c, c) for c in kljuc)

def main():
    with open(IZVOR, encoding='utf-8') as f:
        defs = json.load(f)
    po_slovu = defaultdict(dict)
    for k, v in defs.items():
        w = k.lower()
        a = w[0] if w and w[0] in SLOVA else '_'
        po_slovu[a][k] = v
    nivo = {}
    fajlovi = {}
    for a, grupa in po_slovu.items():
        velicina = sum(len(k) + len(v) + 6 for k, v in grupa.items())
        if a != '_' and velicina > GRANICA:
            nivo[a] = 2
            for k, v in grupa.items():
                w = k.lower()
                b = (w[1] if len(w) >= 2 and w[1] in SLOVA else '_') if len(w) >= 2 else ''
                fajlovi.setdefault(a + b, {})[k] = v
        else:
            nivo[a] = 1
            fajlovi.setdefault(a, {}).update(grupa)
    os.makedirs(CILJ, exist_ok=True)
    for stari in os.listdir(CILJ):
        if stari.endswith('.json'):
            os.remove(os.path.join(CILJ, stari))
    najveci = (None, 0)
    for k, grupa in fajlovi.items():
        put = os.path.join(CILJ, ime_fajla(k) + '.json')
        with open(put, 'w', encoding='utf-8') as f:
            json.dump(grupa, f, ensure_ascii=False, separators=(',', ':'))
        vel = os.path.getsize(put)
        if vel > najveci[1]:
            najveci = (ime_fajla(k), vel)
    with open(os.path.join(CILJ, 'spisak.json'), 'w', encoding='utf-8') as f:
        json.dump({'nivo': nivo, 'ukupno': len(defs), 'fajlova': len(fajlovi)}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'Definicija: {len(defs)} · fajlova: {len(fajlovi)} · slova na dva nivoa: {sum(1 for v in nivo.values() if v == 2)} · najveći: {najveci[0]}.json {najveci[1] / 1e6:.2f} MB')
    return 0

if __name__ == '__main__':
    sys.exit(main())
