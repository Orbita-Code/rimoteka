#!/usr/bin/env python3
"""KORAK 1 čišćenja reci.txt: briše SAMO nedefinisane reči koje su SIGURNO
ne-srpske ili đubre. Konzervativno — nikad ne dira definisane reči.

Briše nedefinisanu reč ako:
  A) ima neoboriv strani pravopis (ck, th, ph, gh, dvostruki suglasnik, eng. nastavci), ili
  B) hrvatski leksem (marker -irati/općin/poštiv/stoljeće/tisuć...), ili
  C) tipfeler: vraćanje kvačice (c->č/ć, s->š, z->ž, dj->đ) ili digraf (sh->š, ch->č, zh->ž)
     daje reč koja JESTE u definicije.json.

NE dira: transliterovana strana imena srpskog pravopisa (sergej, tomas) — to je Korak 2
(traži srpski rečnik-validator), niti bilo koju definisanu reč.

Upotreba: python3 build/clean_foreign_reci.py [--apply]
"""
import json, os, re, sys, itertools, random, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

defs = set(json.load(open(DEFS, encoding="utf-8")).keys())
reci = [l.rstrip("\n") for l in open(RECI, encoding="utf-8")]

iron = re.compile(r'(gh|ll|ff|pp|kk|bb|gg|cc|zz|w|x|y|q|ohn|wood|ville|shire|sson|aux|ough|sch|son$)')
hrv = re.compile(r'(irati|iramo|iraju|irala|irali|irao|iranje|tjeti|općin|poštiv|prenaš|odgađ|tisuć|sveučil|odvjetn|kazališ|glazb|nogomet|stoljeć|produlj|dapač|tjedan|sviđ a)')

OPTc = {'c': ['c', 'č', 'ć'], 's': ['s', 'š'], 'z': ['z', 'ž']}
def is_restorable_typo(w):
    units = []; i = 0
    while i < len(w):
        if w[i] == 'd' and i+1 < len(w) and w[i+1] == 'j':
            units.append(['dj', 'đ']); i += 2
        elif w[i] in OPTc:
            units.append(OPTc[w[i]]); i += 1
        else:
            units.append([w[i]]); i += 1
    amb = sum(1 for o in units if len(o) > 1)
    if 1 <= amb <= 7:
        for c in itertools.product(*units):
            cc = ''.join(c)
            if cc != w and cc in defs:
                return True
    return False

def is_digraph_typo(w):
    # sh->š, ch->č, zh->ž (sve kombinacije); ako rezultat u defs -> tipfeler
    parts = re.split(r'(sh|ch|zh)', w)
    idx = [i for i, p in enumerate(parts) if p in ('sh', 'ch', 'zh')]
    if not idx or len(idx) > 6:
        return False
    rep = {'sh': 'š', 'ch': 'č', 'zh': 'ž'}
    for combo in itertools.product(*[[parts[i], rep[parts[i]]] for i in idx]):
        p2 = parts[:]
        for j, i in enumerate(idx):
            p2[i] = combo[j]
        cc = ''.join(p2)
        if cc != w and cc in defs:
            return True
    return False

todel = set()
reasons = {'pravopis': [], 'hrv': [], 'typo': [], 'digraf': []}
for w in reci:
    ws = w.strip()
    if not ws or ws in defs:
        continue
    if iron.search(ws):
        todel.add(ws); reasons['pravopis'].append(ws)
    elif hrv.search(ws):
        todel.add(ws); reasons['hrv'].append(ws)
    elif ('sh' in ws or 'ch' in ws or 'zh' in ws) and is_digraph_typo(ws):
        todel.add(ws); reasons['digraf'].append(ws)
    elif is_restorable_typo(ws):
        todel.add(ws); reasons['typo'].append(ws)

print(f"reci.txt: {len(reci)} | za brisanje (Korak 1): {len(todel)}")
for k, v in reasons.items():
    random.seed(1)
    print(f"  {k}: {len(v)}  | uzorak: {random.sample(v, min(12, len(v)))}")

if '--apply' in sys.argv:
    shutil.copy(RECI, RECI + ".bak2")
    kept = [l for l in reci if l.strip() not in todel]
    TMP = RECI + ".tmp"
    open(TMP, 'w', encoding='utf-8').write('\n'.join(kept) + '\n')
    os.replace(TMP, RECI)
    print(f"\nPRIMENJENO: izbačeno {len(todel)} | ostalo {len(kept)} | backup: reci.txt.bak2")
