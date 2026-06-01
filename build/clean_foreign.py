#!/usr/bin/env python3
"""Briše STRANA (anglo/zapadnjačka) lična imena i prezimena iz definicije.json.

Rimoteka rečnik: NAŠA i regionalna imena (Selma, Vanda, Đina, Branimir, Kosta...),
geografski nazivi, ekavica i ijekavica OSTAJU. Briše se SAMO ono što je sigurno
strano — da se nikad ne obriše naša reč:

  1) Definicija EKSPLICITNO nosi stranu oznaku porekla (englesko/špansko/...).
  2) Ključ je u ručnoj blocklisti anglo filmskih imena (Costa, Knox, Jeff...).
  3) Ključ sadrži slovo/spoj kojeg u srpskoj ćirilici/latinici NEMA
     (w, x, y, q, dvostruko slovo, 'th', 'ck'...) -> transkripciono strano.

Konzervativno: kad nismo sigurni — NE brišemo (radije zadrži stranu reč nego
da obrišeš našu). Pokretanje: python3 build/clean_foreign.py
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")

_raw = open(DEFS, encoding="utf-8").read()
d, _ = json.JSONDecoder().raw_decode(_raw)

# unos liči na lično ime / prezime / nadimak (NE diram geografske nazive ni reči)
strict = re.compile(r'^(Muško lično ime|Žensko lično ime|Lično ime|Prezime|Oblik imena|Oblik prezimena|Izmišljeni|Nadimak)')
# eksplicitna strana oznaka porekla u definiciji => sigurno strano
nat = re.compile(r'(englesk|špansk|francusk|italijansk|nemačk|holandsk|rusk|japansk|kinesk|korejsk|indijsk|skandinavsk|norvešk|švedsk|finsk|škotsk|irsk|velšk|portugalsk|brazilsk|meksičk|američk|tursk|grčk|hebrejsk|jevrejsk|arapsk|persijsk|latinsk|keltsk|anglosaksonsk)')
# slova/spojevi kojih u srpskom standardno nema -> transkripciono strana reč
foreign_letters = re.compile(r'[wxyq]')
foreign_digraph = re.compile(r'(th|ck|ph|sh|oo|ee|ll|ss|tt|ff|gh|ous|tion)')

# ručna blocklista anglo/zapadnih filmskih imena (KLJUČEVI, mala slova).
# Dodavati ovde kad se uoči novo strano ime — NE diramo naša/regionalna.
BLOCK = {
 'costa','noks','knox','jeff','jeffa','jeffu','džek','dzek','jack','džeka','smit','smith',
 'olaf','riker','rejns','raines','rejnsa','majls','miles','bред','bред',
}

def is_foreign(k, v):
    if nat.search(v):
        return True
    if k in BLOCK:
        return True
    if foreign_letters.search(k) or foreign_digraph.search(k):
        return True
    return False

todel = [k for k, v in d.items() if strict.match(v) and is_foreign(k, v)]
for k in todel:
    d.pop(k, None)

TMP = DEFS + f".tmp.{os.getpid()}"
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
    f.write("\n")
os.replace(TMP, DEFS)
print(f"clean_foreign: obrisano {len(todel)} stranih imena | ukupno sada: {len(d)}")
