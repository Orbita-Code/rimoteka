#!/usr/bin/env python3
"""Dodaj NOVE reči (poznate ličnosti i sl.) u reci.txt I u definicije.json.

Baziramo se na origin/main verziji OBA fajla (zbog paralelne sesije), pa
union-dodajemo nove ključeve i nove reči, commit, push.

Upotreba:
  python3 build/add_words.py <defs.json> "<commit poruka>"

- defs.json: {"reč":"definicija", ...}
- reč se dodaje u reci.txt ako je nema; definicija u definicije.json ako je nema.
"""
import json, os, re, sys, subprocess, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

defs_path = sys.argv[1]
msg = sys.argv[2]
new = json.load(open(defs_path, encoding="utf-8"))

# cyr-check
cyr = re.compile(r'[Ѐ-ӿ]')
bad = [k for k, v in new.items() if cyr.search(k) or cyr.search(v)]
if bad:
    print("ABORT — ćirilica u:", bad[:10]); sys.exit(1)

def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)

run(["git", "fetch", "-q", "origin", "main"])

origin_defs = json.loads(run(["git", "show", "origin/main:public/definicije.json"]).stdout)
origin_reci = run(["git", "show", "origin/main:public/reci.txt"]).stdout.split("\n")
origin_reci = [w.strip() for w in origin_reci if w.strip()]

# 1) reci.txt: dodaj nove reči (sortiran redosled — reci.txt je sortiran)
reci_set = set(origin_reci)
added_reci = [w for w in new.keys() if w not in reci_set]
allreci = sorted(reci_set | set(new.keys()))
open(RECI, "w", encoding="utf-8").write("\n".join(allreci) + "\n")

# 2) definicije.json: union-merge
o = collections.OrderedDict(origin_defs)
added_def = 0
for k, v in new.items():
    if k not in o:
        o[k] = v; added_def += 1
json.dump(o, open(DEFS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

run(["git", "reset", "-q", "--mixed", "origin/main"])
run(["git", "add", "public/definicije.json", "public/reci.txt"])
run(["git", "-c", "user.email=noreply@orbitacode.com", "-c", "user.name=Orbita Code",
     "commit", "-q", "-m", msg])
p = run(["git", "push", "-q", "origin", "main"])
print(f"nove reči {len(added_reci)} | nove def {added_def} | ukupno reci {len(allreci)} | push rc={p.returncode}")
if p.returncode != 0:
    print(p.stderr[-400:])
