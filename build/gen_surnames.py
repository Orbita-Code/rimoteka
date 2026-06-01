#!/usr/bin/env python3
"""Poluautomatski generator definicija za srpska PREZIMENA (-ić/-ović) iz
liste reci.txi sa 2+ srpskih dijakritika (gotovo nikad strana).

Klasifikuje:
  - reč na -ić            -> "Prezime (Cap)."
  - -ić + prisvojni nast. -> "Oblik prisvojnog prideva od prezimena Base."
  - -ić + padežni nast.   -> "Oblik prezimena Base."
Sve ostalo (glagoli, imenice, deminutivi) ide u OSTALO za RUČNU obradu.

Upotreba:
  python3 build/gen_surnames.py START END           # ispiši predlog + OSTALO + -čić kontrolu
  python3 build/gen_surnames.py START END --json OUT # upiši auto-prezime JSON u OUT
"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
defs = json.load(open(os.path.join(ROOT, "public", "definicije.json"), encoding="utf-8"))
words = [l.strip() for l in open(os.path.join(ROOT, "public", "reci.txt"), encoding="utf-8") if l.strip()]
und = sorted(set(w for w in words if w not in defs))

dia = re.compile(r'[čćžšđ]')
foreign = re.compile(r'[wxyq]')
cand = [w for w in und if dia.search(w) and not foreign.search(w) and 4 <= len(w) <= 16]

prisv = re.compile(r'^(.*ić)(ev|eva|eve|evi|evih|evim|evom|evog|evu|evoj|evo)$')
obl = re.compile(r'^(.*ić)(a|u|em|e|i|ima|ka|ki|kom)$')

# reči koje obrazac lažno hvata kao prezime — NIKAD ne definisati kao prezime
NON_SURNAME = {
    'cigančići', 'jevrejčić', 'dedčić', 'džigeričić', 'madžarčić', 'pičić',
    'amerića', 'amerićki', 'beatriće', 'bići', 'blagobiće', 'svastičić',
}
# deminutivi/glagolski oblici koje treba preusmeriti na pravu definiciju
DEM = {
    'autiće': 'Oblik reči autić (mali automobil, igračka).',
    'autiću': 'Oblik reči autić (mali automobil, igračka).',
    'bića': 'Oblik reči biće (stvorenje, živo biće).',
    'baviće': 'Oblik glagola baviti se (budući: baviće se).',
    'baviću': 'Oblik glagola baviti se (budući: baviću se).',
    'boraviće': 'Oblik glagola boraviti (budući: boraviće).',
    'braniće': 'Oblik glagola braniti (budući: braniće).',
    'magarčić': 'Oblik reči magarčić (mladi magarac, magare).',
    'oblačići': 'Oblik reči oblačić (mali oblak).',
    'lančića': 'Oblik reči lančić (mali lanac, ogrlica).',
    'lončića': 'Oblik reči lončić (mali lonac, posuda).',
}

def classify(w):
    if w in NON_SURNAME:
        return None
    if w in DEM:
        return DEM[w]
    cap = w[0].upper() + w[1:]
    if w.endswith('ić'):
        return 'Prezime (' + cap + ').'
    m = prisv.match(w)
    if m:
        b = m.group(1); return 'Oblik prisvojnog prideva od prezimena ' + b[0].upper() + b[1:] + '.'
    m = obl.match(w)
    if m:
        b = m.group(1); return 'Oblik prezimena ' + b[0].upper() + b[1:] + '.'
    return None

start, end = int(sys.argv[1]), int(sys.argv[2])
sl = cand[start:end]
prez, other = {}, []
for w in sl:
    d = classify(w)
    if d:
        prez[w] = d
    else:
        other.append(w)

if '--json' in sys.argv:
    outp = sys.argv[sys.argv.index('--json') + 1]
    json.dump(prez, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"upisano {len(prez)} prezime-defs -> {outp}")
else:
    cic = [w for w in prez if w.endswith('čić') or 'čić' in w[:-2]]
    print(f"PREZIME: {len(prez)} | OSTALO: {len(other)}")
    print("=== -čić KONTROLA (mogući deminutivi) ===")
    for w in cic: print('  ', w, '->', prez[w])
    print("=== OSTALO (ručno) ===")
    for w in other: print('  ', w)
