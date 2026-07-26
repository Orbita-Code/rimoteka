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
# PAŽNJA: završetak na -ati/-iti/-eti NIJE dokaz da je reč glagol.
# „bankomati", „akrobati", „aparati" su imenice u MNOŽINI, a raniji kod ih je
# tretirao kao infinitive i pravio „bankomam, akrobaš, aparate" — oblike kojih
# u srpskom nema. Zato reč prihvatamo kao glagol SAMO ako rečnik već sadrži
# njen nesumnjiv glagolski oblik (radni pridev ili prvo lice prezenta).
def je_glagol(w):
    if w.endswith('uti'):
        st = w[:-3]
        potvrde = (st+'uo', st+'em', st+'nuo', st+'nem')
    elif w.endswith('ovati'):
        st = w[:-5]
        potvrde = (st+'ovao', st+'ujem', st+'uje')
    elif w.endswith('irati'):
        st = w[:-2]
        potvrde = (w[:-2]+'o', st+'m', st+'')
    else:
        st = w[:-3]
        potvrde = (st+'ao', st+'io', st+'eo', st+'im', st+'am', st+'em', st+'ujem')
    return any(f in S for f in potvrde if f and f != w)

kandidati = [w for w in reci if len(w) >= 6 and (w[-3:] in ('ati','iti','eti') or w.endswith('uti'))]
infinitivi = [w for w in kandidati if je_glagol(w)]
odbaceno = len(kandidati) - len(infinitivi)

# ---- 2) klasifikacija i predlog oblika -------------------------------------
# Palatalizacija kod -ati glagola: k->č, g->ž, h->š, s->š, z->ž, t->ć, d->đ
PALAT = {'k':'č', 'g':'ž', 'h':'š', 's':'š', 'z':'ž', 'c':'č', 't':'ć', 'd':'đ'}

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
    if inf.endswith('ati') or inf.endswith('eti'):
        # Glagoli na -ati/-eti imaju više obrazaca prezenta (-am, -em, -im i
        # palatalizovani -em). Nastavak infinitiva NE govori koji je — zato se
        # obrazac ČITA iz rečnika, iz oblika koji već postoje.
        # Gledamo samo PRVO i DRUGO lice; treće lice (-a/-e/-i) se prečesto
        # poklapa sa imenicama („plesa/plesi" je od ples, „sezam" je susam),
        # pa bi vodilo u pogrešan zaključak.
        st = inf[:-3]
        pal = st[:-1] + PALAT[st[-1]] if st and st[-1] in PALAT else None

        glasovi = []
        if (st+'am') in S or (st+'aš') in S: glasovi.append('am')
        if (st+'em') in S or (st+'eš') in S: glasovi.append('em')
        if (st+'im') in S or (st+'iš') in S: glasovi.append('im')
        if pal and ((pal+'em') in S or (pal+'eš') in S): glasovi.append('pal')

        proslo = ([st+'ao', st+'ala', st+'alo', st+'ali', st+'ale'] if inf.endswith('ati')
                  else [st+'eo', st+'ela', st+'elo', st+'eli', st+'ele'])

        if len(glasovi) != 1:
            # Ili nema nijednog pouzdanog oblika, ili se protivreče —
            # ne izmišljamo prezent, nudimo samo prošlo vreme (uvek pravilno).
            razlog = 'nema oblika prezenta u rečniku' if not glasovi else 'protivrečni oblici: ' + '/'.join(glasovi)
            return ('-ati/-eti (obrazac NEPOZNAT: %s)' % razlog, 'odluči ti', proslo)

        k = glasovi[0]
        if k == 'am':
            pre = [st+'am', st+'aš', st+'a', st+'amo', st+'ate', st+'aju', st+'aj', st+'ajte']
        elif k == 'em':
            pre = [st+'em', st+'eš', st+'e', st+'emo', st+'ete', st+'u', st+'i', st+'ite']
        elif k == 'im':
            pre = [st+'im', st+'iš', st+'i', st+'imo', st+'ite', st+'e', st+'i', st+'ite']
        else:
            pre = [pal+'em', pal+'eš', pal+'e', pal+'emo', pal+'ete', pal+'u', pal+'i', pal+'ite']
        return ('-ati/-eti (obrazac -%s, pročitan iz rečnika)' % k, 'visoka', pre + proslo)

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
print(f"kandidata (-ati/-iti/-eti/-uti): {len(kandidati)}")
print(f"odbačeno kao NE-glagoli:         {odbaceno}")
print(f"pravih glagola:                  {len(infinitivi)}")
print(f"krnjih glagola:      {len(krnji)}")
print(f"predloženih oblika:  {ukupno_novih}")
print("izveštaj:            RECNIK-PREDLOG.md")
print("za upis kasnije:     build/predlog_oblika.tsv")
