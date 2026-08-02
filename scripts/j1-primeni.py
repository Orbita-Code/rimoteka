#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
J1 — primena presude: ijekavski oblici se KRIJU, hrvatski se BRIŠU.

Ulaz: `AUDIT/J1-presuda-matica.md` (pravi ga `scripts/j1-provera-matica.py`).

Dve radnje:
  1. 95 oblika koje Rečnik Matice vodi kao ijekavske → `public/jekavski.json`
     (spisak koji alat krije dok prekidač za ijekavicu nije uključen; ništa se
     ne briše, uključivanjem ijekavice se sve vraća)
  2. hrvatski oblici → izbacuju se iz `public/reci.txt`

ZAŠTO SE GRUPA „NIJE U MATICI" NE BRIŠE CELA (118 reči): u njoj su izmešane
tri stvari — hrvatske reči (`historija`, `ožujak`), ijekavski i dijalekatski
oblici (`đevojka`, `sjutra`, `zagrijavam`) i obične srpske reči koje su tu samo
zato što ih OCR rečnika nije dao (`ekavice`, `nalećete`, `sol`). Brisanje cele
grupe izbacilo bi i srpske reči, a to je gore od reči koja fali. Zato su ispod
tri IZRIČITA spiska, reč po reč — ništa se ne izvodi iz obrasca.
"""
import json, os, re, shutil

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRESUDA = os.path.join(KOREN, 'AUDIT/J1-presuda-matica.md')
RECI = os.path.join(KOREN, 'public/reci.txt')
JEK = os.path.join(KOREN, 'public/jekavski.json')

# ── 1. HRVATSKI OBLICI — brišu se iz ekavskog rečnika ────────────────────────
# Merilo: reč nema srpski standardni status ni u Rečniku Matice, a srpski
# parnjak postoji i koristi se (historija–istorija, ožujak–mart, tanjur–tanjir).
HRVATSKE = """
brončana dražbi grožnja historija historiju itko janjici kisik korištene
korišteni lipnja ožujak ožujku prijašnji puhala puhne saopćavanja shvaćali
shvaćanja shvaćanju sretni stol stroj strojnica studij sudionici sudionika
suradnik suvremen suvremena suvremeni suvremenica suvremenik suvremenika
suvremeno talijan talijana talijane talijani talijanima talijanka tanjur
teritorij tiskara ubojice ubojstvo udruga uporabi upute ureda uspija utornik
vanjska vapnenac vapno virtualni virtualno vodik vodika vojarna zbroj zbrojiti
štovanoj štujte židovske židovskim židovsko židovskoj židovskom židovsku
""".split() + """
lipanj listopad listopada listopadu prosinac prosinoda
nesretne nesretnih nesretnik nesretnika nesretno nesretnog nesretnu
sudac suradnja suradnju općiti pučanstava usporedba usporedbe usporedbi
usprkos vanjski vanjsko uputa zainteresirana tlak ugljik vlak
""".split()
# Drugi deo spiska (29 reči) su oblici koje Rečnik Matice ima, ali sa oznakom
# „рег." ili sa uputom „в." na srpsku reč — hrvatski nazivi meseci, `sudac`
# (в. судија), `vlak` (рег. в. воз), `ugljik` (в. угљеник). Odluka vlasnice
# 02.08.2026: brišu se kao i ostale hrvatske.
#
# Iz te iste grupe NIJE obrisano `toplinom` — „toplina" je obična srpska reč,
# rečnik samo upućuje na „toplota". Provera ju je uhvatila zato što gleda samu
# oznaku „в.", a ta oznaka stoji i kod ravnopravnih sinonima.

# ── 2. IJEKAVSKI I DIJALEKATSKI — kriju se, ne brišu ─────────────────────────
# Ovo su srpski oblici, samo ne ekavski. Ko uključi ijekavicu, dobija ih.
IJEKAVSKI_RUCNO = """
bešnjahu dosao nasmijavaj nasmijavaju nasmijavam nasmijavao nasmijte neđe
neđeljicu neđeljka neđeljko neđeljku neđeljom neđelju neđo ogrij ođe podgrija
podgrijte sjutra sjutradan smijurija zagrijavam zagrijavamo ćerati đecu đed
đeda đede đevojka đevojke šćape šćenu živili živiti šuti šutke šutljivi
šutljivih šutljivo šutljivom šutnji šutnjom
smio ogluhnuti ogluhnula
""".split()

# ── 3. OSTAJU NETAKNUTE — obične srpske reči ─────────────────────────────────
# `ekavice` je oblik reči „ekavica"; `nalećete` je oblik glagola „naletati";
# `sol` je nota (solmizacija). U grupi „nema ih u Matici" su samo zato što ih
# OCR rečnika nije dao ili im se osnova ne poklapa sa odrednicom.
OSTAJU = ['ekavice', 'nalećete', 'sol', 'sudaca', 'sućuti']

# ── presuda iz izveštaja ─────────────────────────────────────────────────────
def reci_iz_grupe(naziv):
    unutra, out = False, []
    for red in open(PRESUDA, encoding='utf-8'):
        if red.startswith('## '):
            unutra = red.strip() == '## ' + naziv or red.startswith('## ' + naziv + ' (')
            continue
        m = re.match(r'\|\s*`([^`]+)`', red)
        if unutra and m:
            out.append(m.group(1))
    return out

iz_presude = reci_iz_grupe('IJEKAVSKI')

# ── upis ─────────────────────────────────────────────────────────────────────
shutil.copy(RECI, RECI + '.pre-j1')          # povratna kopija, za svaki slučaj

stari_jek = json.load(open(JEK, encoding='utf-8'))
novi_jek = sorted(set(stari_jek) | set(iz_presude) | set(IJEKAVSKI_RUCNO))
json.dump(novi_jek, open(JEK, 'w', encoding='utf-8'), ensure_ascii=False)

za_brisanje = set(HRVATSKE)
sve = [w.strip() for w in open(RECI, encoding='utf-8')]
ostalo = [w for w in sve if w not in za_brisanje]
obrisano = [w for w in sve if w in za_brisanje]
open(RECI, 'w', encoding='utf-8').write('\n'.join(ostalo) + '\n')

print('jekavski.json: %d → %d oblika (dodato %d)'
      % (len(stari_jek), len(novi_jek), len(novi_jek) - len(stari_jek)))
print('reci.txt: obrisano %d hrvatskih oblika, ostalo %d reči'
      % (len(obrisano), len(ostalo)))
nedostaju = sorted(za_brisanje - set(obrisano))
if nedostaju:
    print('NAPOMENA — ovih nije ni bilo u rečniku:', ', '.join(nedostaju))
print('netaknuto (srpske reči iz iste grupe):', ', '.join(OSTAJU))
