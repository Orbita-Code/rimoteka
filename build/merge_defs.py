#!/usr/bin/env python3
"""Spaja novi talas objašnjenja u public/definicije.json.

Upotreba: echo '{"rec":"opis", ...}' | python3 build/merge_defs.py
Dodaje samo NOVE ključeve (preskače već definisane), čuva redosled unosa,
prijavljuje koliko je dodato, koliko preskočeno i koliko reči nije u rečniku.
"""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

new = json.load(sys.stdin)
defs = json.load(open(DEFS, encoding="utf-8"))
words = set(l.strip() for l in open(RECI, encoding="utf-8"))

added, skipped, not_in_dict = 0, 0, []
for k, v in new.items():
    if k in defs:
        skipped += 1
        continue
    defs[k] = v
    added += 1
    if k not in words:
        not_in_dict.append(k)

with open(DEFS, "w", encoding="utf-8") as f:
    json.dump(defs, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"+{added} novih | preskočeno {skipped} (već postoje) | ukupno sada: {len(defs)}")
if not_in_dict:
    print(f"  ⚠ {len(not_in_dict)} nije u reci.txt: {not_in_dict[:15]}")
