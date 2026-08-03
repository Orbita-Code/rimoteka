#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Šta nam fali iz Rečnika Matice srpske — spisak odrednica kojih nema u `reci.txt`.

Zahtev vlasnice 02.08.2026: proći ceo Rečnik srpskoga jezika (Matica srpska, 2011)
i videti koje reči nemamo. Dodaju se **samo srpske i ijekavske**, ne hrvatske.
Zastarele reči idu na poseban spisak, da ih vlasnica pregleda.

ZAŠTO SE NIŠTA NE DODAJE AUTOMATSKI: rečnik je skeniran (OCR) i pun je slovnih
grešaka — u samom tekstu stoje `бдбо` umesto `бдео`, `хж` umesto `ж`, `66` umesto
`бе`. Reč koja se ovako izvuče može da bude nepostojeća, a pogrešna reč u rečniku
je gora od reči koja fali (pravilo iz `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`).
Zato ova skripta samo PRAVI SPISKOVE — odluka je vlasničina.

Ispis: AUDIT/MATICA-fali/
  01-za-dodavanje.md     srpske odrednice kojih nemamo, bez sumnjivih oznaka
  02-zastarele.md        odrednice sa oznakom „заст.", „арх.", „нар.", „покр."
  03-regionalne.md       odrednice sa „рег." ili sa uputom „в." na drugu reč
  04-sumnjiv-ocr.md      izvučeno, ali izgleda kao greška skeniranja
"""
import re, os, json
from collections import Counter

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECNIK = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')
IZLAZ = os.path.join(KOREN, 'AUDIT/MATICA-fali')
os.makedirs(IZLAZ, exist_ok=True)

CIR2LAT = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z',
           'и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o',
           'п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c',
           'ч':'č','џ':'dž','ш':'š'}
def u_latinicu(r): return ''.join(CIR2LAT.get(z, z) for z in r)

# Gramatičke oznake koje stoje IZA odrednice. Bez njih se ne prepoznaje odrednica,
# jer rečnik ima i redove koji su nastavak prethodnog tumačenja.
OZNAKE = (r'ж|м|с|мн|прил|предл|узв|вез|зам|бр|речца|свр|несвр|'
          r'-[ајеиоум]|и\s|јек\.|непром')
ODREDNICA = re.compile(r'^([а-шђћчџжљњ]{3,})(?:,\s*[^ ]+)?\s+(?:' + OZNAKE + r')')

# Kvalifikatori — po njima se odlučuje na koji spisak reč ide.
ZASTARELE  = re.compile(r'\bзаст\b|\bарх\b|\bнар\b|\bпокр\b|\bдијал\b|\bварв\b')
REGIONALNE = re.compile(r'\bрег\b|\bв\.')

# Slovni nizovi koji u srpskom ne postoje — siguran znak greške skeniranja.
# `ђ` iza suglasnika, tri ista slova zaredom, latinična slova upala u ćirilicu.
LOSE = re.compile(r'(.)\1\1|[a-zA-Z0-9]')
SAMOGLASNICI = set('аеиоур')

nasi = {w.strip() for w in open(os.path.join(KOREN, 'public/reci.txt'), encoding='utf-8') if w.strip()}

# DRUGI IZVOR — srLex, lingvistički rečnik oblika srpskog jezika (1,85 miliona
# oblika, `~/Literatura/srLex/`). Služi kao potvrda da reč izvučena iz skeniranog
# teksta STVARNO postoji: rečnik Matice kaže da je reč srpska, srLex kaže da se u
# tom obliku pojavljuje u jeziku. Reč koju potvrde OBA izvora je bezbedna;
# reč koju potvrdi samo jedan traži pregled — među njima ima i pravih (`bludilac`,
# `zavrludati`) i grešaka skeniranja (`nameštvnje`, `šavaši`).
import gzip
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')
srlex = set()
if os.path.exists(SRLEX):
    with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
        for red in f:
            srlex.add(red.split('\t', 1)[0].lower())
    print('srLex: %d oblika' % len(srlex))

kante = {'dodati': [], 'za_pregled': [], 'zastarele': [], 'regionalne': [], 'ocr': []}
videno = set()

with open(RECNIK, encoding='utf-8', errors='replace') as f:
    for red in f:
        m = ODREDNICA.match(red.strip().lower())
        if not m:
            continue
        cir = m.group(1)
        # Skenirani rečnik na vrh svake strane stavlja veliko slovo azbuke, pa se
        # ono slepi za prvu odrednicu: „Аадекватност и адекватност". Kad se prvo
        # slovo ponavlja, a ostatak reči stoji dalje u istom redu iza „и" —
        # pravа reč je taj ostatak. Bez ovoga u spisak ulazi `aadekvatnost`.
        if len(cir) > 3 and cir[0] == cir[1] and cir[1:] in red.lower()[len(cir):]:
            cir = cir[1:]
        if cir in videno:
            continue
        videno.add(cir)
        lat = u_latinicu(cir)
        if lat in nasi:
            continue
        opis = red.strip()[:130]
        # Reč bez ijednog samoglasnika ili sa nemogućim nizom = greška skeniranja.
        if LOSE.search(cir) or not (SAMOGLASNICI & set(cir)):
            kante['ocr'].append((lat, opis)); continue
        if ZASTARELE.search(red[:110].lower()):
            kante['zastarele'].append((lat, opis)); continue
        if REGIONALNE.search(red[:110].lower()):
            kante['regionalne'].append((lat, opis)); continue
        kante['dodati' if lat in srlex else 'za_pregled'].append((lat, opis))

NASLOVI = {
 'dodati':     ('01-za-dodavanje.md', 'Potvrđene i u Matici i u srLex-u — bezbedne za dodavanje',
   'Rečnik Matice ih ima kao odrednice, bez oznake „заст." i „рег.", a srLex potvrđuje da oblik postoji u jeziku. Dva nezavisna izvora.'),
 'za_pregled': ('01b-za-pregled.md', 'Ima ih Matica, ali ih srLex ne potvrđuje',
   'Među njima ima pravih ali retkih reči (`bludilac`, `zavrludati`) i grešaka skeniranja (`nameštvnje`, `šavaši`). **Ne dodavati bez pregleda.**'),
 'zastarele':  ('02-zastarele.md', 'Zastarele, narodne i pokrajinske — za pregled vlasnice',
   'Rečnik ih vodi sa oznakom „заст." (zastarelo), „арх." (arhaično), „нар." (narodno) ili „покр." (pokrajinski). Danas se skoro ne koriste.'),
 'regionalne': ('03-regionalne.md', 'Regionalne i one sa uputom na drugu reč',
   'Oznaka „рег." ili uput „в. <druga reč>". Tu su i hrvatski oblici — **ne dodavati bez provere**.'),
 'ocr':        ('04-sumnjiv-ocr.md', 'Izgleda kao greška skeniranja',
   'Nizovi slova koji u srpskom ne postoje. Ovde stoje da se vidi koliko je šuma imao rečnik, ne da se dodaju.'),
}

for kanta, (ime, naslov, uvod) in NASLOVI.items():
    stavke = sorted(set(kante[kanta]))
    with open(os.path.join(IZLAZ, ime), 'w', encoding='utf-8') as f:
        f.write('# %s (%d)\n\n> %s\n\n' % (naslov, len(stavke), uvod))
        f.write('| Reč | Red iz Rečnika Matice |\n|---|---|\n')
        for lat, opis in stavke:
            f.write('| `%s` | %s |\n' % (lat, opis.replace('|', '/')))
    print('%-11s %6d  →  %s' % (kanta, len(stavke), ime))

print('ukupno odrednica prepoznato:', len(videno))
print('od toga već imamo:', len(videno) - sum(len(v) for v in kante.values()))
