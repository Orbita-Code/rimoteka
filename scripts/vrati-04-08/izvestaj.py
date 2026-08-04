#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sastavlja AUDIT/vracene-reci-04-08-2026.md iz primena.json + radni.json + srLex frekvencija."""
import gzip, json, os
from collections import Counter, defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OVDE = os.path.dirname(os.path.abspath(__file__))
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')

p = json.load(open(os.path.join(OVDE, 'primena.json'), encoding='utf-8'))
radni = json.load(open(os.path.join(OVDE, 'radni.json'), encoding='utf-8'))
kandidati, C = p['kandidati'], p['C']
vec_vracene = p.get('vec_vracene', [])

# srLex frekvencija (relativna) za C reči — jedan prolaz
c_reci = set(C)
freq = {}
with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        d = red.split('\t')
        if len(d) < 8:
            continue
        o = d[0].strip()
        if o in c_reci or o.lower() in c_reci:
            try:
                freq[o] = freq.get(o, 0.0) + float(d[7])
            except ValueError:
                pass

korpe = Counter(k for k, _ in kandidati.values())
primeri_a = ['abrazivna', 'božićima', 'albanče', 'belegi', 'poliglotu', 'sljedbeništvo', 'tajniji']
primeri_b = ['ablativ', 'abraziv', 'adekvatnost', 'afektivnost', 'tajan', 'baždar', 'činjeničnost', 'svetosavlje']

def matica_kolona(w):
    m = radni[w]['matica']
    lm = radni[w]['lema_matica']
    if m == 'da':
        return 'da (token)'
    if m.startswith('fuzzy'):
        return 'fuzzy (%s)' % m[6:]
    if lm == 'da':
        return 'samo lema'
    if lm.startswith('fuzzy'):
        return 'lema fuzzy (%s)' % lm[6:]
    return 'ne'

def srlex_kolona(w):
    u = radni[w]['u_srlex']
    f = freq.get(w) or freq.get(w.capitalize()) or 0.0
    if u or f:
        return 'da (%.6f)' % f if f else 'da'
    return 'ne'

out = []
a = out.append
a('# Vraćene reči 04.08.2026. — izveštaj')
a('')
a('> Vlasničina naredba: vratiti 3.964 reči obrisanе 04.08. (spisak')
a('> `AUDIT/MATICA-fali/07-obrisane-bez-objasnjenja.md`), ali svaku pre toga proveriti')
a('> u Rečniku Matice srpske (2011); šta se ne potvrdi ili ne može se definisati —')
a('> na spisak za odluku. Radna evidencija i odluke: `scripts/vrati-04-08/`')
a('> (`analiza.py`, `glosa.py`, `odluke-01…12.py`, `primeni.py`, `primena.json`).')
a('')
a('## Zbiru')
a('')
a('| Korpa | Reči | Šta znači |')
a('|---|---|---|')
a('| **A — vraćene, izvedeno objašnjenje** | %d | „Oblik prideva/imenice/glagola… „lema“ (…)“ — lema ima objašnjenje (postojeće ili sveže napisano za glavu familije) |' % korpe['A'])
a('| **B — vraćene, pisano objašnjenje** | %d | kratko objašnjenje svojim rečima, provereno na glosi u Matici; leme familija |' % korpe['B'])
a('| **C — NE vraćene, vlasnica odlučuje** | %d | nisu u Matici (ni fuzzy), ili značenje nejasno/sporno, ili vulgarno |' % len(C))
a('| već vraćene ranije (main agent, unapred odobrene) | %d | znanstven, znanstveno, znanstvenik, znanstvenost — bile na spisku obrisanih; objašnjenja odobrena |' % len(vec_vracene))
a('| **ukupno na spisku** | **3.964** | %d A + %d B + %d C + %d već vraćene |' % (korpe['A'], korpe['B'], len(C), len(vec_vracene)))
a('')
a('Dodatno, van spiska obrisanih (unapred odobreno, uneo main agent): **znanstvena**,')
a('**zakupno**, **zakupnom** — sva tri su u `reci.txt` sa odobrenim objašnjenjima.')
a('Provera cele familije: svih 15 reči `znanstven*`/`zakupn*` koje postoje u `reci.txt`')
a('imaju objašnjenje (ništa nije trebalo dodavati).')
a('')
a('**Pravilo „nijedna reč bez objašnjenja" važi i posle upisa:** provereno — 0 reči u')
a('`reci.txt` bez objašnjenja u `definicije.json`.')
a('')
a('### Primeri iz korpe A (izvedena objašnjenja)')
a('')
a('| Reč | Objašnjenje |')
a('|---|---|')
for w in primeri_a:
    if w in kandidati:
        a('| `%s` | %s |' % (w, kandidati[w][1]))
a('')
a('### Primeri iz korpe B (pisana objašnjenja, proverena u Matici)')
a('')
a('| Reč | Objašnjenje |')
a('|---|---|')
for w in primeri_b:
    if w in kandidati:
        a('| `%s` | %s |' % (w, kandidati[w][1]))
a('')
a('## Korpa C — kompletan spisak za vlasnicu (%d reči)' % len(C))
a('')
a('| Reč | U Matici? | U srLex-u? (frekvencija) | Zašto je sporna |')
a('|---|---|---|---|')
for w in sorted(C, key=lambda x: x.lower()):
    a('| `%s` | %s | %s | %s |' % (w, matica_kolona(w), srlex_kolona(w), C[w].replace('|', '/')))
a('')
a('## Neobičnosti i napomene')
a('')
a('- **OCR-fuzzy pogoci pri vraćenju:** `abrazivni` (Matica: „абразибни", в→б), `belegi`')
a('  („белети"), `najtajniji` („најшајнији", т→ш) — u sva tri slučaja familija je')
a('  potvrđena (abrazivan / beleg / tajan), a fuzzy pogodak je samo na nivou oblika.')
a('- **„predživot" i familija „zatamnenje" (8 oblika)** nisu nađeni kao tokeni zbog')
a('  OCR dijakritika, ali su odrednice locirane direktno u normalizovanim redovima')
a('  (glosa pročitana, objašnjenje iz nje).')
a('- **„mikrotalasan" + 6 oblika** poslati u C: Matica vodi samo imenicu „mikrotalas",')
a('  pridevska familija nije potvrđena kao token.')
a('- **Uvozni artefakti u C:** `Filipin`, `Malezi` (odsečena imena država), familija')
a('  `Zelanda` (delovi višečlanog imena „Novi Zeland"), `matematik`/`matematicima`/')
a('  `matematiče` (verovatno pokvaren uvoz), `eurska` (OCR-pokvarena „evrika"),')
a('  `laca` (token iz predgovora rečnika), `priređivanje` (kolofon rečnika).')
a('- **Vulgarne reči** (`drkati`, `fukati`, `sranje`, `šupak`, `kurvetina`, `popizditi`,')
a('  `posrati`, `prokurvati`…) nisu vraćene: rečnik takve reči uopšte ne vodi')
a('  (npr. „picka" i „govno" nikad nisu bile u `reci.txt`).')
a('- **Toponimi u C:** familije `Skoplje`/`Skopje` (9), `Prokuplje` (5), `Aranđelovac` (3),')
a('  `Venera` (3) — Matica ih ne vodi kao toponime/oblike; oblici su legitimni i')
a('  imena/leme imaju objašnjenja u našem rečniku, pa ih je lako odobriti.')
a('- **„sud" i „suda"** su u C iako je reč očito standardna: odrednica „суд" nije')
a('  čitljivo locirana u OCR-u Matice, pa glosa nije mogla da se proveri.')
a('- **Hrvatski naglasci** među vraćenima (Matica ih vodi): npr. `izniman`, `sustav`,')
a('  `mirovinski`, `sudelovati` — vraćeni su jer ih Matica navodi kao odrednice.')
a('- **Frekvencije:** `frekvencija.json` NIJE diran. `rank` u `build/gen_pages.py`')
a('  (linija 676) se gradi od samog `reci.txt` (`rank = {w: i for i, w in enumerate(words)}`),')
a('  a frekvencija se čita sa `freq.get(w, 0)` (linija 760) — reč bez frekvencije ne')
a('  ruši ni ne poremeti generator; samo se ređa pri dnu. Zato nula-dopune nije bilo.')
a('')
open(os.path.join(KOREN, 'AUDIT/vracene-reci-04-08-2026.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('izveštaj zapisan:', os.path.join(KOREN, 'AUDIT/vracene-reci-04-08-2026.md'))
print('A:', korpe['A'], 'B:', korpe['B'], 'C:', len(C))
