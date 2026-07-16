#!/usr/bin/env python3
"""Primeni jedan talas: cyr-check definicija, obriši strana/junk iz reci.txt,
union-merge definicija nad origin/main, commit, push.

Upotreba:
  python3 build/apply_batch.py <defs.json> "<commit poruka>" [del1 del2 ...]

- defs.json: {"reč":"definicija", ...} — dodaju se SAMO ako ključ već ne postoji
- del reči: brišu se iz reci.txt SAMO ako su nedefinisane i nisu u defs.json
"""
import json, os, re, sys, subprocess, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

defs_path = sys.argv[1]
msg = sys.argv[2]
dels = set(sys.argv[3:])

new = json.load(open(defs_path, encoding="utf-8"))

# 1) cyr-check
cyr = re.compile(r'[Ѐ-ӿ]')
bad = [k for k, v in new.items() if cyr.search(k) or cyr.search(v)]
if bad:
    print("ABORT — ćirilica u:", bad[:10]); sys.exit(1)

def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)

run(["git", "fetch", "-q", "origin", "main"])

# 2) brisanje iz reci.txt (po origin verziji defs, da ne brišem definisano)
origin_defs = json.loads(run(["git", "show", "origin/main:public/definicije.json"]).stdout)
defset = set(origin_defs.keys()) | set(new.keys())
dels = {d for d in dels if d not in defset}
reci = [l.rstrip("\n") for l in open(RECI, encoding="utf-8")]
todel = set(w.strip() for w in reci if w.strip() in dels)
kept = [l for l in reci if l.strip() not in todel]
open(RECI, "w", encoding="utf-8").write("\n".join(l for l in kept if l.strip()) + "\n")

# 3) union-merge definicija nad origin
o = collections.OrderedDict(origin_defs)
added = 0
for k, v in new.items():
    if k not in o:
        o[k] = v; added += 1
json.dump(o, open(DEFS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# 4) reset na origin index, commit samo naša dva fajla, push
run(["git", "reset", "-q", "--mixed", "origin/main"])
run(["git", "add", "public/definicije.json", "public/reci.txt"])
run(["git", "-c", "user.email=noreply@orbitacode.com", "-c", "user.name=Orbita Code",
     "commit", "-q", "-m", msg])
p = run(["git", "push", "-q", "origin", "main"])
print(f"dodato {added} def | obrisano {len(todel)} | ukupno {len(o)} | push rc={p.returncode}")
if p.returncode != 0:
    print(p.stderr[-400:])
