#!/usr/bin/env python3
"""Merguje nove definicije iz JSON fajla u public/definicije.json.
Čuva postojeći redosled i NE dira postojeće ključeve (dodaje samo nove na kraj).
Upotreba: python3 build/merge_new_defs.py /tmp/defs_batchN.json
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")

defs = json.load(open(DEFS, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
new = json.load(open(sys.argv[1], encoding="utf-8"))

added = 0
skipped = 0
for k, v in new.items():
    if k in defs:
        skipped += 1
        continue
    defs[k] = v
    added += 1

TMP = DEFS + ".tmp"
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(defs, f, ensure_ascii=False, indent=2)
os.replace(TMP, DEFS)
print(f"dodato {added} | preskočeno (već postoji) {skipped} | ukupno defs sada {len(defs)}")
