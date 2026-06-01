#!/usr/bin/env python3
"""Briše strana lična imena i prezimena iz public/definicije.json.
Rimoteka rečnik: ulaze SAMO naša (srpska/regionalna) imena, geografski nazivi,
ekavica i ijekavica. Strana lična imena/prezimena (Džek, Smith, Costa, Noks...) izbaciti.
Pokretanje: python3 build/clean_foreign.py
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")

_raw = open(DEFS, encoding="utf-8").read()
d, _ = json.JSONDecoder().raw_decode(_raw)

# strogi imenski prefiksi (samo lična imena/prezimena/fiktivni likovi) — NE diram geografske/reči
strict = re.compile(r'^(Muško lično ime|Žensko lično ime|Lično ime|Prezime|Oblik imena|Oblik prezimena|Izmišljeni|Nadimak)')
# strane oznake porekla u definiciji => sigurno strano
nat = re.compile(r'(englesk|špansk|francusk|italijansk|nemačk|rusk|japansk|kinesk|indijsk|skandinavsk|škotsk|portugalsk|hebrejsk|arapsk)')

# NAŠA imena/pojmovi koje uvek zadržavam
KEEP = {
 'aleksandar','aleksandra','anja','antonija','antonije','arkadije','boris','dragan','drazen',
 'đina','đino','đoku','igor','igore','ivan','ivana','jakov','jovan','jovana','kata','marija',
 'mariji','marijom','marko','markov','milan','miroslav','muhamed','nataša','nikola','pavle',
 'petar','petre','selim','selima','selma','srećko','stefan','stefana','tanja','vanda','vesna',
 'vladimir','žućko','isus','isusa','isuse','isusu','hriste','hristos','hrista',
}

todel = [k for k, v in d.items() if strict.match(v) and k not in KEEP]
for k in todel:
    d.pop(k, None)

TMP = DEFS + f".tmp.{os.getpid()}"
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
    f.write("\n")
os.replace(TMP, DEFS)
print(f"clean_foreign: obrisano {len(todel)} stranih imena | ukupno sada: {len(d)}")
