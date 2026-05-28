#!/usr/bin/env python3
"""Filtrira listu kandidata: zadrži samo reči koje su U reci.txt I još NEMAJU definiciju.

Upotreba: echo "rec1 rec2 rec3" | python3 build/filter_candidates.py
ili:       cat kandidati.txt | python3 build/filter_candidates.py   (razmaci ili nove linije)
"""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

defs = set(json.load(open(DEFS, encoding="utf-8")))
words = set(l.strip() for l in open(RECI, encoding="utf-8"))

cands = sys.stdin.read().split()
todo = [w for w in cands if w in words and w not in defs]
already = [w for w in cands if w in defs]
notdict = [w for w in cands if w not in words and w not in defs]

print("ZA PISANJE ({}): {}".format(len(todo), " ".join(todo)))
if already:
    print("preskoči-postoje ({}): {}".format(len(already), " ".join(already)))
if notdict:
    print("nije-u-rečniku ({}): {}".format(len(notdict), " ".join(notdict)))
