#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rime PO AKCENTU – veran prepis podele iz alata/generatora, nad PRAVIM podacima (`public/akcenat.txt`). Ništa ne menja.

Koristi funkcije iz `build/gen_pages.py` (rhyme_key, akc_key, rimovanih_slogova, syllables, load_rank) i isti podatak o
akcentu koji koristi sajt – pa je ovo isto što i otvoriti sajt, bez pregledača. (Jedino se ne primenjuju BLOCKED i
RHYME_EXCLUSIONS – oni su u `main()` generatora.)

Pokretanje:
  python3 scripts/akcenti-simulacija.py televizor kaniti slobodan      # zadate reči
  python3 scripts/akcenti-simulacija.py --nasumicno 20                 # 20 nasumičnih reči za pregled vlasnici
                                                                       # (pola sa 3+ sloga; pravilo PROPUSTI 07.10.2026)
  python3 scripts/akcenti-simulacija.py --nasumicno 20 --seme 7        # ponovljiv izbor
Posle svake izmene rečnika ili akcenta prvo: python3 build/akcenat.py
"""
import os, sys, json, random, collections
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(K, 'build'))
import gen_pages as g

args = sys.argv[1:]
nasumicno = 0; seme = None; reci_arg = []
i = 0
while i < len(args):
    if args[i] == '--nasumicno': nasumicno = int(args[i + 1]); i += 2
    elif args[i] == '--seme': seme = int(args[i + 1]); i += 2
    else: reci_arg.append(args[i]); i += 1

words, _defs = g.load()
rank = g.load_rank(words)
keygroup = collections.defaultdict(list)
for w in words: keygroup[g.rhyme_key(w)].append(w)
try: wikt = json.load(open(os.path.join(K, 'build/akcenti-osnove.json'), encoding='utf-8'))
except Exception: wikt = {}
try: izvori = json.load(open(os.path.join(K, 'AUDIT/akcenti/izvori.json'), encoding='utf-8'))
except Exception: izvori = {}

def grupe(t):
    """→ (najbolje, dobre, rezerva_koriscena) – 1:1 sa gen_pages.py (petlja u main) i app.js doRhymes."""
    key = g.rhyme_key(t); tsyl = g.syllables(t); tl = t.lower()
    cands = [w for w in keygroup[key] if w.lower() != tl]
    cands.sort(key=lambda w: (abs(g.syllables(w) - tsyl), -g.common_suffix(t, w), rank.get(w, 10**9)))
    akc_t = g.AKCK.get(t) or g.akc_key(t, 2)
    best = [w for w in cands if (g.AKCK.get(w) or g.akc_key(w, 2)) == akc_t]
    rezerva = False
    if len(best) < 3:
        rezerva = True
        n_t = g.AKCN.get(t, 2); u = set(best)
        best += [w for w in cands if w not in u and g.AKCN.get(w, 2) == n_t and g.syllables(w) == tsyl and g.rimovanih_slogova(t, w) >= 2]
    u_best = set(best); best = best[:90]
    good = [w for w in cands if w not in u_best][:max(90, 180 - len(best))]
    return best, good, rezerva, akc_t

def opis_akcenta(t):
    v = wikt.get(t.lower())
    if v: return v['akc'] + (' (dug slog iza)' if v.get('iza_dug') else '')
    return '(' + izvori.get(t, 'bez podatka') + ')'

if nasumicno:
    rnd = random.Random(seme)
    duge = [w for w in words if g.syllables(w) >= 3 and w.islower()]
    kratke = [w for w in words if g.syllables(w) <= 2 and w.islower()]
    izbor = rnd.sample(duge, nasumicno - nasumicno // 2) + rnd.sample(kratke, nasumicno // 2)
    print('| # | Reč | Akcenat (izvor) | Ključ | Najbolje rime (prvih 8) | Rezerva | Presuda |')
    print('|---|---|---|---|---|---|---|')
    for n, t in enumerate(izbor, 1):
        best, good, rez, k = grupe(t)
        print(f'| {n} | {t} | {opis_akcenta(t)} | -{k} | {", ".join(best[:8]) or "–"} | {"da" if rez else ""} | |')
    sys.exit(0)

for t in reci_arg:
    best, good, rez, k = grupe(t)
    print(f'\n=== {t}: akcenat {opis_akcenta(t)} / slog od kraja {g.AKCN.get(t, "?")} / ključ prave rime -{k} / kandidata {len(keygroup[g.rhyme_key(t)])}' + (' / REZERVA' if rez else ''))
    print('  NAJBOLJE:', ', '.join(best[:16]) or '–')
    print('  DOBRE:   ', ', '.join(good[:12]) or '–')
