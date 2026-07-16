#!/usr/bin/env python3
"""Uredi rečnik: DODAJ nove reči/def i OBRIŠI zadate ključeve iz OBA fajla.

Bazira se na origin/main verziji oba fajla (zbog paralelne sesije).

Upotreba:
  python3 build/edit_words.py <add.json> "<msg>" [--del w1 w2 ...]

- add.json: {"reč":"definicija", ...} — dodaje u reci.txt (ako fali) i definicije.json (ako fali)
- --del: reči koje se BRIŠU iz reci.txt I iz definicije.json
"""
import json, os, re, sys, subprocess, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

add_path = sys.argv[1]
msg = sys.argv[2]
dels = set()
if "--del" in sys.argv:
    dels = set(sys.argv[sys.argv.index("--del") + 1:])

new = json.load(open(add_path, encoding="utf-8")) if add_path != "-" else {}

cyr = re.compile(r'[Ѐ-ӿ]')
bad = [k for k, v in new.items() if cyr.search(k) or cyr.search(v)]
if bad:
    print("ABORT — ćirilica u:", bad[:10]); sys.exit(1)

def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)

run(["git", "fetch", "-q", "origin", "main"])
origin_defs = json.loads(run(["git", "show", "origin/main:public/definicije.json"]).stdout)
origin_reci = [w.strip() for w in run(["git", "show", "origin/main:public/reci.txt"]).stdout.split("\n") if w.strip()]

# reci.txt: (skup - dels) + nove reči
reci_set = (set(origin_reci) - dels) | set(new.keys())
open(RECI, "w", encoding="utf-8").write("\n".join(sorted(reci_set)) + "\n")

# definicije.json: obriši dels, dodaj nove
o = collections.OrderedDict((k, v) for k, v in origin_defs.items() if k not in dels)
added = 0
for k, v in new.items():
    if k not in o:
        o[k] = v; added += 1
deleted_def = len([d for d in dels if d in origin_defs])
json.dump(o, open(DEFS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

run(["git", "reset", "-q", "--mixed", "origin/main"])
run(["git", "add", "public/definicije.json", "public/reci.txt"])
run(["git", "-c", "user.email=noreply@orbitacode.com", "-c", "user.name=Orbita Code",
     "commit", "-q", "-m", msg])
p = run(["git", "push", "-q", "origin", "main"])
print(f"nove def {added} | obrisano def {deleted_def} | obrisano reci {len(dels)} | ukupno reci {len(reci_set)} | push rc={p.returncode}")
if p.returncode != 0:
    print(p.stderr[-400:])
