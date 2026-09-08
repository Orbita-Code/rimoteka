#!/usr/bin/env python3
"""Objašnjenja tipa „Oblik reči X" – X pod navodnicima, i UVEK sa značenjem glavne reči u zagradi.

Odluka vlasnice 08.09.2026: „ako navodimo glavnu reč, u ovom slučaju „čad", onda da u zagradi i napišemo šta ta reč
znači – to bi bilo sjajno iskustvo korisnika". Bilo: `Oblik reči čibuk (deo lule…).` i `Oblik reči van.` (bez značenja).
Sad: `Oblik reči „čibuk“ (deo lule…).` i `Oblik reči „van“ (prilog i predlog: izvan, napolju).` – značenje se uzima iz
objašnjenja glavne reči (prva rečenica, malo slovo, bez tačke na kraju). Kad glavne reči nema u rečniku, ostaje bez zagrade.
Navodnici: „…“ (srpski, kao na sajtu). Pokretanje: python3 build/oblik_reci_navodnici.py [--primeni]
Posle: python3 build/podeli_definicije.py && node scripts/osvezi-verzije-podataka.mjs && python3 build/gen_pages.py
"""
import json, re, sys, os
KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(KOREN, 'public/definicije.json')
d = json.load(open(P, encoding='utf-8'))
R = re.compile(r'^Oblik reči (?:„|")?([^\s„“"().]+)(?:“|")?(?: \((.*)\))?\.?$')
def prva_recenica(t):
    t = t.strip()
    t = re.split(r'(?<=[.;])\s', t, 1)[0].rstrip('.;').strip()
    if not t: return ''
    return t[0].lower() + t[1:] if len(t) > 1 and not t.isupper() and not t[0:2].isupper() else t
n = {'ukupno': 0, 'navodnici': 0, 'dodato_znacenje': 0, 'bez_glavne': 0, 'bez_promene': 0}
primeri = []
novo = {}
for k, v in d.items():
    m = R.match(v)
    if not m: novo[k] = v; continue
    n['ukupno'] += 1
    g, zn = m.group(1), m.group(2)
    if not zn:
        gd = d.get(g)
        if gd and not gd.startswith('Oblik'):
            zn = prva_recenica(gd); n['dodato_znacenje'] += 1
        else:
            n['bez_glavne'] += 1
    nv = f'Oblik reči „{g}“' + (f' ({zn})' if zn else '') + '.'
    if nv == v: n['bez_promene'] += 1
    else:
        n['navodnici'] += 1
        if len(primeri) < 8 and (not m.group(2) or len(primeri) < 4): primeri.append((k, v, nv))
    novo[k] = nv
print(n)
for p in primeri: print('  ', p[0], '|', p[1], '→', p[2])
if '--primeni' in sys.argv:
    json.dump(novo, open(P, 'w', encoding='utf-8'), ensure_ascii=False)
    print('UPISANO u definicije.json')
