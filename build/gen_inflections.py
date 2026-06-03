#!/usr/bin/env python3
"""Automatski definiše FLEKTOVANE oblike čija je OSNOVA već u definicije.json.
Konzervativno: oblik se definiše SAMO ako vraćanjem na osnovni oblik (nominativ
imenice / muški rod prideva / infinitiv-koren) dobijemo reč koja JESTE u rečniku.
Tada upisuje 'Oblik reči X' / 'Oblik prideva X' i sl.

NE dira definisane reči. NE pogađa osnovu koja nije u rečniku (tako se izbegavaju
strana imena — njihove osnove nisu u kurираном rečniku).

Upotreba:
  python3 build/gen_inflections.py            # DRY-RUN: koliko bi se definisalo + uzorak
  python3 build/gen_inflections.py --json OUT  # upiše predloge u OUT (za merge)
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

defs = json.load(open(DEFS, encoding="utf-8"))
defset = set(defs.keys())
reci = [l.strip() for l in open(RECI, encoding="utf-8") if l.strip()]
und = [w for w in reci if w not in defset]

def is_lemma(cand):
    # prava odrednica: postoji i njena definicija NE počinje sa "Oblik" (nije lanac)
    d = defs.get(cand)
    return bool(d) and not d.startswith("Oblik")

def base_noun(w):
    # imenički padeži: probaj da skineš nastavak i dobiješ nominativ u rečniku
    # m.r.: -a -u -om -e -i -ima ; ž.r.: -e -i -u -om -ama -o(vok) ; mn. -ovi -evi
    for suf, repl in [
        ("ovima",""),("evima",""),("ovi",""),("evi",""),("ova",""),("eva",""),
        ("ima",""),("ama","a"),("ama",""),
        ("om",""),("em",""),("u",""),("e",""),("i",""),("a",""),("o","a"),("o",""),
    ]:
        if w.endswith(suf) and len(w)-len(suf) >= 3:
            cand = w[:len(w)-len(suf)] + repl
            if is_lemma(cand):
                return cand
    return None

def base_adj(w):
    # pridevski nastavci -> osnovni vid (-i ili bez)
    for suf in ["oga","ome","ima","ih","im","og","om","oj","u","e","a","o"]:
        if w.endswith(suf) and len(w)-len(suf) >= 3:
            for base in (w[:len(w)-len(suf)] + "i", w[:len(w)-len(suf)]):
                if is_lemma(base):
                    return base
    return None

prop = {}
for w in und:
    if len(w) < 4 or any(c in w for c in "wxyq0123456789"):
        continue
    b = base_noun(w)
    if b:
        # ne pravi cikличне (isti koren) i preskoči ako je osnova predugo kraća
        prop[w] = f"Oblik reči {b}."
        continue
    b = base_adj(w)
    if b:
        prop[w] = f"Oblik prideva {b}."

print(f"nedefinisanih: {len(und)} | auto-flektovanih predloga: {len(prop)}")
import random
random.seed(3)
sample = random.sample(sorted(prop.items()), min(40, len(prop)))
for w, d in sample:
    print(f"  {w}  ->  {d}")

if "--json" in sys.argv:
    outp = sys.argv[sys.argv.index("--json") + 1]
    json.dump(prop, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\nupisano {len(prop)} predloga -> {outp}")
