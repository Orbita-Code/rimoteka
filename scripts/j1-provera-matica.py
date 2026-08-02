#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
J1 — provera 277 spornih oblika kroz Rečnik srpskoga jezika (Matica srpska, 2011).

Zašto postoji: spisak `AUDIT/J1-sporne-reci.md` je nastao automatski, tako što je
provera tražila `ije`, `je` ili `dj` U SAMOJ REČI. Oblici kao `bdio` ili `dio` te
slogove nemaju, pa su „izgledali ekavski" iako to nisu — Matica kod odrednice
`bdeti` izričito piše: r. pr. `bdeo, bdela` **jek.** `bdio, bdjela`.

Kako se odlučuje (redom, prvi pogodak presuđuje):
  1. reč stoji u rečniku ODMAH IZA oznake „јек."         → IJEKAVSKI (krije se)
  2. reč je ODREDNICA (početak reda, iza nje gram. oznaka) → STANDARDNA (ostaje)
  3. reč se u rečniku ne pojavljuje, a njen ekavski parnjak
     (io→eo, ije→e, je→e) JESTE odrednica                 → IJEKAVSKI (krije se)
  4. sve ostalo                                            → NEODREĐENO (vlasnici)

Rečnik je OCR ćirilicom i ima grešaka (`бдбо` umesto `бдео`), zato se nijedan
nalaz ne piše bez reda iz rečnika u kome je nađen — da se svaka presuda može
proveriti golim okom.

Pokretanje:  python3 scripts/j1-provera-matica.py
Ispis:       AUDIT/J1-presuda-matica.md
"""
import re, os, sys, unicodedata

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECNIK = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')
SPISAK = os.path.join(KOREN, 'AUDIT/J1-sporne-reci.md')
IZLAZ  = os.path.join(KOREN, 'AUDIT/J1-presuda-matica.md')

# ── latinica → ćirilica (rečnik je ćirilicom) ────────────────────────────────
LAT2CIR = [('lj','љ'),('nj','њ'),('dž','џ'),('dj','ђ'),
           ('a','а'),('b','б'),('c','ц'),('č','ч'),('ć','ћ'),('d','д'),('đ','ђ'),
           ('e','е'),('f','ф'),('g','г'),('h','х'),('i','и'),('j','ј'),('k','к'),
           ('l','л'),('m','м'),('n','н'),('o','о'),('p','п'),('r','р'),('s','с'),
           ('š','ш'),('t','т'),('u','у'),('v','в'),('z','з'),('ž','ж')]

def u_cirilicu(rec):
    r = rec.lower()
    for lat, cir in LAT2CIR:
        r = r.replace(lat, cir)
    return r

def ekavski_parnjak(rec):
    """Ijekavski oblik → mogući ekavski parnjaci (jat se vraća u „e").

    Pravila su izvedena iz parova koji stvarno stoje u našem rečniku:
    dugi jat `ije`→`e` (rijeka–reka), kratki jat `je`→`e` (djeca–deca),
    `ij`→`ej` ispred samoglasnika (grijati–grejati), `io`→`eo` u radnom
    pridevu (bdio–bdeo). Jedno pravilo ne pokriva sve, zato se vraća SPISAK
    kandidata pa se svaki proverava — dovoljno je da jedan postoji.
    """
    k = []
    if rec.endswith('io'):
        k.append(rec[:-2] + 'eo')                                  # bdio → bdeo
        k.append(rec[:-2] + 'eo')
    if 'ije' in rec:  k.append(rec.replace('ije', 'e'))            # rijeka → reka
    if 'je' in rec:   k.append(rec.replace('je', 'e'))             # djeca → deca
    if 'lje' in rec:  k.append(rec.replace('lje', 'le'))           # ljepota → lepota
    if 'nje' in rec:  k.append(rec.replace('nje', 'ne'))
    k.append(re.sub(r'ij(?=[aeiou])', 'ej', rec))                  # grijati → grejati
    k.append(re.sub(r'ij(?=[aeiou])', 'e', rec))                   # grijalica → grealica (rezerva)
    # hrvatske/varijantne zamene koje se u našem spisku ponavljaju
    for a, b in (('h', 'v'), ('kat', 'sprat'), ('ir', 'is')):
        if a in rec: k.append(rec.replace(a, b, 1))
    return [x for x in dict.fromkeys(k) if x != rec]

# Naš ekavski rečnik — najbolji dokaz da parnjak POSTOJI, jer sadrži i
# promenjene oblike (`grejali`), a Rečnik Matice ima samo osnovne (`grejati`).
EKAVSKI = set()
_p = os.path.join(KOREN, 'public/reci.txt')
if os.path.exists(_p):
    EKAVSKI = {w.strip() for w in open(_p, encoding='utf-8') if w.strip()}
_JEK_OZNAKE = ('ijekavski', 'jekavski')

# ── učitavanje rečnika ───────────────────────────────────────────────────────
if not os.path.exists(RECNIK):
    sys.exit('Nema rečnika Matice na putanji: ' + RECNIK)
with open(RECNIK, encoding='utf-8', errors='replace') as f:
    REDOVI = f.read().split('\n')

# Indeks: svaka ćirilična reč → redovi u kojima se javlja. Bez ovoga bi 277 reči
# tražilo 277 prolaza kroz 17 MB teksta.
from collections import defaultdict
INDEKS = defaultdict(list)
REC_U_REDU = re.compile(r'[а-шђћчџжљњ]+')
for i, red in enumerate(REDOVI):
    for w in set(REC_U_REDU.findall(red.lower())):
        INDEKS[w].append(i)

# Sve odrednice rečnika: prva reč u redu, ako iza nje ide razmak i još nešto.
# Služe za prepoznavanje PROMENJENIH oblika — rečnik ima „несретан", nema
# „несретника", pa se traži zajednička osnova.
ODREDNICE = {}
# Odrednice razvrstane po prvih šest slova. Poređenje „odrednica je početak reči"
# ne valja u oba smera: `toplinom` ima osnovu `toplin-`, a odrednica je `toplina`
# — nijedna nije početak druge. Zato se porede PRVIH ŠEST SLOVA obe reči.
# Zbog toga je `toplinom` prvo pogrešno završilo među „nema ih u rečniku", a to
# je obična srpska reč.
PO_OSNOVI = {}
for i, red in enumerate(REDOVI):
    m = re.match(r'([а-шђћчџжљњ]{3,})[ ,]', red.strip().lower())
    if m and m.group(1) not in ODREDNICE:
        ODREDNICE[m.group(1)] = i
    if m and len(m.group(1)) >= 6:
        PO_OSNOVI.setdefault(m.group(1)[:6], (m.group(1), i))

SPOREDNA = re.compile(r'\bрег\b|\bв\.|\bпокр\b|\bзаст\b|\bдијал\b')
def sporedna_odrednica(i):
    """Rečnik je ima, ali sa oznakom „рег." (regionalno), „в." (vidi — upućuje
    na standardnu reč), „покр.", „заст.". Takva reč nije ravnopravan standard,
    pa se izdvaja: `vlak` je „рег. в. воз", `suradnja` je „в. сарадња"."""
    return bool(SPOREDNA.search(REDOVI[i][:90].lower()))

def je_odrednica(rec_cir, i):
    """Odrednica počinje red i iza nje ide gramatička oznaka ili tumačenje."""
    red = REDOVI[i].strip().lower()
    return red.startswith(rec_cir + ' ') or red.startswith(rec_cir + ',')

def iza_jek(rec_cir, i):
    """Reč stoji iza oznake „јек." — dakle rečnik je izričito zove ijekavskom."""
    red = REDOVI[i].lower()
    for m in re.finditer(r'јек\.?', red):
        # CELA reč, ne deo reči. Sa `in` je `ded` bilo proglašeno ijekavskim,
        # jer se iza „јек." u istom redu našlo `deda` — a `ded` je baš EKAVSKI
        # oblik iz te odrednice („дед јек. дјед").
        if re.search(r'(?<![а-шђћчџжљњ])' + re.escape(rec_cir) + r'(?![а-шђћчџжљњ])',
                     red[m.end(): m.end() + 40]):
            return True
    return False

# ── spisak spornih reči ──────────────────────────────────────────────────────
reci = []
for red in open(SPISAK, encoding='utf-8'):
    m = re.match(r'\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|', red)
    if m:
        reci.append((m.group(1), m.group(2)))

presude = []
for rec, opis in reci:
    c = u_cirilicu(rec)
    redovi = INDEKS.get(c, [])
    presuda, razlog, dokaz = None, '', ''

    for i in redovi:                                   # 1. izričito „јек."
        if iza_jek(c, i):
            presuda, razlog = 'IJEKAVSKI', 'rečnik je izričito zove ijekavskom (oznaka „јек.")'
            dokaz = REDOVI[i].strip()[:150]
            break

    if not presuda:                                    # 2. sama je odrednica
        for i in redovi:
            if je_odrednica(c, i):
                if sporedna_odrednica(i):
                    presuda = 'SPOREDNA U REČNIKU'
                    razlog = 'rečnik je ima, ali kao regionalnu ili sa uputom na drugu reč'
                else:
                    presuda, razlog = 'STANDARDNA', 'stoji kao odrednica u Rečniku Matice'
                dokaz = REDOVI[i].strip()[:150]
                break

    if not presuda:                                    # 3. ekavski parnjak postoji
        for kand in ekavski_parnjak(rec):
            # 3a. parnjak je u NAŠEM ekavskom rečniku — najjači dokaz, jer on
            #     ima i promenjene oblike koje Matica kao odrednice nema.
            if kand in EKAVSKI:
                presuda = 'IJEKAVSKI'
                razlog = 'ekavski parnjak „%s" postoji u našem rečniku' % kand
                dokaz = '—'
                break
            # 3b. parnjak je odrednica u Rečniku Matice
            ck = u_cirilicu(kand)
            for i in INDEKS.get(ck, []):
                if je_odrednica(ck, i):
                    presuda = 'IJEKAVSKI'
                    razlog = 'ekavski parnjak „%s" je odrednica u Rečniku Matice' % kand
                    dokaz = REDOVI[i].strip()[:150]
                    break
            if presuda: break

    # 4. Promenjen oblik — Matica ima samo osnovni („nesretnika" nema, „nesretan"
    #    bi imala). Traži se odrednica koja deli osnovu od bar 5 slova; ako je
    #    ima, reč je izvedena iz srpske odrednice i ostaje.
    if not presuda:
        for duz in range(len(c) - 1, 5, -1):
            osnova = c[:duz]
            i = ODREDNICE.get(osnova)
            if i is not None:
                if sporedna_odrednica(i):
                    presuda = 'SPOREDNA U REČNIKU'
                    razlog = 'promenjen oblik odrednice „%s", koju rečnik vodi kao regionalnu ili sa uputom' % osnova
                else:
                    presuda = 'STANDARDNA'
                    razlog = 'promenjen oblik odrednice „%s" iz Rečnika Matice' % osnova
                dokaz = REDOVI[i].strip()[:150]
                break

    # 5. Ni osnove nema u rečniku — to su po pravilu hrvatske ili varijantne reči
    #    (`historija`, `listopad`, `kisik`, `nesretan`). Ne krije ih skripta:
    #    odluka je vlasničina, ali se izdvajaju da se ne mešaju sa nejasnima.
    # 4b. Ista osnova od šest slova sa nekom odrednicom — `toplinom`/`toplina`,
    #     `nalećete`/`naletati`, `ekavice`/`ekavica`.
    if not presuda and len(c) >= 6:
        pog = PO_OSNOVI.get(c[:6])
        if pog:
            odr, i = pog
            if sporedna_odrednica(i):
                presuda = 'SPOREDNA U REČNIKU'
                razlog = 'ista osnova kao odrednica „%s", koju rečnik vodi kao regionalnu ili sa uputom' % odr
            else:
                presuda = 'STANDARDNA'
                razlog = 'ista osnova kao odrednica „%s" iz Rečnika Matice' % odr
            dokaz = REDOVI[i].strip()[:150]

    if not presuda:
        presuda = 'NIJE U MATICI'
        razlog = 'ni reč ni njena osnova nisu u Rečniku Matice — verovatno hrvatski ili varijantni oblik'

    presude.append((rec, presuda, razlog, dokaz, opis))

# ── ispis ────────────────────────────────────────────────────────────────────
red_prvo = {'IJEKAVSKI': 0, 'NIJE U MATICI': 1, 'SPOREDNA U REČNIKU': 2, 'STANDARDNA': 3}
presude.sort(key=lambda p: (red_prvo[p[1]], p[0]))
broj = {k: sum(1 for p in presude if p[1] == k) for k in red_prvo}

with open(IZLAZ, 'w', encoding='utf-8') as f:
    f.write('# J1 — presuda Rečnika Matice srpske za 277 spornih oblika\n\n')
    f.write('> Automatski provučeno kroz „Rečnik srpskoga jezika", Matica srpska 2011.\n')
    f.write('> Uz svaku presudu stoji red iz rečnika u kome je nađena, da se može proveriti.\n')
    f.write('> Rečnik je OCR, pa u dokazu ima slovnih grešaka — to ne menja presudu.\n\n')
    f.write('| Presuda | Koliko | Šta znači |\n|---|---|---|\n')
    f.write('| IJEKAVSKI | %d | krije se kad ijekavica nije uključena |\n' % broj['IJEKAVSKI'])
    f.write('| STANDARDNA | %d | ostaje i u ekavici — nije greška |\n' % broj['STANDARDNA'])
    f.write('| NIJE U MATICI | %d | ni reč ni osnova nisu u rečniku — odlučuje vlasnica |\n' % broj['NIJE U MATICI'])
    f.write('| SPOREDNA U REČNIKU | %d | rečnik je ima, ali kao regionalnu ili sa uputom na drugu reč |\n\n' % broj['SPOREDNA U REČNIKU'])
    for stanje in ('IJEKAVSKI', 'NIJE U MATICI', 'SPOREDNA U REČNIKU', 'STANDARDNA'):
        f.write('\n## %s (%d)\n\n' % (stanje, broj[stanje]))
        f.write('| Reč | Zašto | Red iz Rečnika Matice |\n|---|---|---|\n')
        for rec, p, razlog, dokaz, _ in presude:
            if p != stanje: continue
            f.write('| `%s` | %s | %s |\n' % (rec, razlog, dokaz.replace('|', '/') or '—'))

print('reči: %d | ijekavski: %d | nije u Matici: %d | sporedne: %d | standardne: %d'
      % (len(presude), broj['IJEKAVSKI'], broj['NIJE U MATICI'],
         broj['SPOREDNA U REČNIKU'], broj['STANDARDNA']))
print('ispis:', IZLAZ)
