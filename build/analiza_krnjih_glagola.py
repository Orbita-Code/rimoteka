#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nalazi glagole u reci.txt koji stoje skoro sami (krnja paradigma) i predlaže
oblike koji fale. NIŠTA NE UPISUJE u rečnik — pravi samo izveštaj za pregled.

Pokretanje:  python3 build/analiza_krnjih_glagola.py
Izlaz:       RECNIK-PREDLOG.md  (za čitanje)  +  build/predlog_oblika.tsv (za upis kasnije)
"""
import os, json
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')

reci = [l.strip() for l in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8') if l.strip()]
S = set(reci)
defs = json.load(open(os.path.join(PUB, 'definicije.json'), encoding='utf-8'))

# ---- 1) skup svih infinitiva ------------------------------------------------
# Ranije se koristila heuristika "malo srodnih oblika iz istog korena", ali je
# promašivala baš prave primere: `njakati` ima 9 srodnih oblika i `brstiti` 7,
# pa su ispadali iz liste iako im fali skoro cela paradigma. Sada se za SVAKI
# glagol generiše očekivana paradigma i broji koliko oblika stvarno fali.
infinitivi = [w for w in reci if len(w) >= 6 and (w[-3:] in ('ati','iti','eti') or w.endswith('uti'))]

# ---- 2) klasifikacija i predlog oblika -------------------------------------
# Palatalizacija kod -ati glagola: k->č, g->ž, h->š, s->š, z->ž, t->ć, d->đ
PALAT = {'k':'č', 'g':'ž', 'h':'š', 's':'š', 'z':'ž', 'c':'č'}

def predlog(inf):
    """Vrati (tip, sigurnost, [oblici]). sigurnost: 'visoka' | 'proveri'."""
    o = []
    # NAPOMENA: glagolske imenice (-anje/-enje) se NE generišu. Obrazac varira
    # od glagola do glagola (brstiti -> brstenje, ali čistiti -> čišćenje), pa
    # ih nije bezbedno praviti automatski.
    # -irati / -isati / -ovati -> najpravilniji, visoka sigurnost
    if inf.endswith('irati'):
        k = inf[:-3]                       # deducirati -> deducira?
        st = inf[:-2]                      # deducira
        o = [st+'m', st+'š', st, st+'mo', st+'te', st+'ju',
             inf[:-2]+'o', inf[:-2]+'la', inf[:-2]+'lo', inf[:-2]+'li', inf[:-2]+'le',
             st+'j', st+'jte']
        return ('-irati', 'visoka', o)
    if inf.endswith('ovati'):
        st = inf[:-5] + 'uj'               # kupovati -> kupuj-
        o = [st+'em', st+'eš', st+'e', st+'emo', st+'ete', st+'u',
             inf[:-2]+'o', inf[:-2]+'la', inf[:-2]+'lo', inf[:-2]+'li', inf[:-2]+'le',
             st, st+'te']
        return ('-ovati', 'visoka', o)
    if inf.endswith('nuti'):
        # „banuti" bez „uti" = „ban". Ranije se dodavalo još jedno „n" i
        # dobijalo se „bannem/banne" — pogrešno. Particip je „banuo", ne „banuto".
        st = inf[:-3]                      # banuti -> ban
        o = [st+'em', st+'eš', st+'e', st+'emo', st+'ete', st+'u',
             st+'uo', st+'ula', st+'ulo', st+'uli', st+'ule',
             st+'i', st+'ite']
        return ('-nuti', 'visoka', o)
    if inf.endswith('iti'):
        st = inf[:-3]                      # cediti -> ced-
        o = [st+'im', st+'iš', st+'i', st+'imo', st+'ite', st+'e',
             st+'io', st+'ila', st+'ilo', st+'ili', st+'ile']
        return ('-iti', 'visoka', o)
    if inf.endswith('eti'):
        st = inf[:-3]
        o = [st+'im', st+'iš', st+'i', st+'imo', st+'ite', st+'e',
             st+'eo', st+'ela', st+'elo', st+'eli', st+'ele']
        return ('-eti', 'proveri', o)      # -eti je najnepravilniji tip
    if inf.endswith('ati'):
        st = inf[:-3]                      # njakati -> njak-
        # pravilan tip: -am
        pravilan = [st+'am', st+'aš', st+'a', st+'amo', st+'ate', st+'aju',
                    st+'aj', st+'ajte']
        proslo = [st+'ao', st+'ala', st+'alo', st+'ali', st+'ale']
        zadnje = st[-1]
        if zadnje in PALAT:
            # Koren na k/g/h/s/z: prezent ide SAMO sa palatalizacijom.
            # Ranije su se predlagala oba obrasca (i „njakam" i „njačem"), pa je
            # u rečnik ušlo „njakam/njakaš" — vlasnica je potvrdila da ti oblici
            # ne postoje. Sada se pravilan (-am) obrazac uopšte ne predlaže.
            p = st[:-1] + PALAT[zadnje]    # njak- -> njač-
            palat = [p+'em', p+'eš', p+'e', p+'emo', p+'ete', p+'u', p+'i', p+'ite']
            return ('-ati (palatalizacija)', 'proveri', palat + proslo)
        return ('-ati', 'visoka', pravilan + proslo)
    return ('nepoznat', 'proveri', [])

# ---- 3) izveštaj ----------------------------------------------------------
# Glagol je "krnj" ako mu fali najmanje 60% očekivane paradigme.
PRAG = 0.60
krnji = []
for inf in infinitivi:
    tip, sig, oblici = predlog(inf)
    oblici = [w for w in dict.fromkeys(oblici) if w]
    if len(oblici) < 5:
        continue
    fali = [w for w in oblici if w not in S]
    if len(fali) / len(oblici) >= PRAG:
        krnji.append(inf)
krnji.sort()

redovi = []
po_tipu = defaultdict(list)
ukupno_novih = 0
for inf in krnji:
    tip, sig, oblici = predlog(inf)
    novi = [w for w in dict.fromkeys(oblici) if w and w not in S]
    if not novi:
        continue
    ukupno_novih += len(novi)
    obj = defs.get(inf, '')
    po_tipu[(tip, sig)].append((inf, novi, obj))
    for w in novi:
        redovi.append(f"{inf}\t{tip}\t{sig}\t{w}")

with open(os.path.join(ROOT, 'build', 'predlog_oblika.tsv'), 'w', encoding='utf-8') as f:
    f.write("infinitiv\ttip\tsigurnost\tpredlozeni_oblik\n")
    f.write("\n".join(redovi) + "\n")

md = []
md.append("# Predlog dopune rečnika — glagoli sa krnjom paradigmom\n")
md.append("> Automatski izveštaj. **NIŠTA nije upisano u `reci.txt`.**\n")
md.append(f"- Glagola sa krnjom paradigmom: **{len(krnji)}**")
md.append(f"- Predloženih novih oblika: **{ukupno_novih}**")
md.append(f"- Svaki novi oblik bi dobio objašnjenje u `definicije.json` (pravilo projekta).\n")
md.append("## Kako čitati\n")
md.append("- **sigurnost: visoka** — tip glagola je pravilan, oblici su predvidivi. Može se odobriti grupno.")
md.append("- **sigurnost: proveri** — postoji više mogućih obrazaca, treba tvoja odluka. "
          "Npr. `njakati` ide ili `njakam, njaka` ili `njačem, njače` — oba se sreću, "
          "a u rečniku već postoji `njaka`, pa treba odlučiti da li dodajemo i „č\" oblike.\n")

for sig in ('visoka', 'proveri'):
    grupe = {k: v for k, v in po_tipu.items() if k[1] == sig}
    n_gl = sum(len(v) for v in grupe.values())
    n_ob = sum(len(o) for v in grupe.values() for _, o, _ in v)
    md.append(f"\n---\n\n# SIGURNOST: {sig.upper()} — {n_gl} glagola, {n_ob} oblika\n")
    for (tip, _), lista in sorted(grupe.items()):
        md.append(f"\n## Tip `{tip}` — {len(lista)} glagola\n")
        for inf, novi, obj in lista:
            o = f" — *{obj[:80]}*" if obj else " — **nema objašnjenje u rečniku**"
            md.append(f"- **{inf}**{o}")
            md.append(f"  - predlog: {', '.join(novi)}")

open(os.path.join(ROOT, 'RECNIK-PREDLOG.md'), 'w', encoding='utf-8').write("\n".join(md) + "\n")
print(f"krnjih glagola:      {len(krnji)}")
print(f"predloženih oblika:  {ukupno_novih}")
print("izveštaj:            RECNIK-PREDLOG.md")
print("za upis kasnije:     build/predlog_oblika.tsv")
