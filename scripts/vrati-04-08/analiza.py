#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vraćanje obrisanih reči (04.08.2026.) — analiza i svrstavanje u korpe A/B/C.

Ulaz:
  - AUDIT/MATICA-fali/07-obrisane-bez-objasnjenja.md  (3.964 obrisane reči)
  - public/reci.txt, public/definicije.json
  - ~/Literatura/srLex/srLex_v1.3.gz                  (oblik → lema + vrsta reči)
  - ~/Literatura/recnik-matice-srpske-2011.txt        (autoritet za proveru)

Provera u Matici: lat → ćir, lower, skidanje dijakritika (NFD, Mn), pogodak
CELE reči (token) bilo gde u fajlu. Fuzzy prolaz: zamene poštapalica OCR-a
(т↔ш и sl.) — označava se posebno.

Izlaz (u scripts/vrati-04-08/):
  - radni.json        — za svaku reč: leme, POS, matica status, predlog korpe
  - b-kandidati.md    — leme kojima treba PISATI objašnjenje + red iz Matice
"""
import gzip, json, os, re, sys, unicodedata
from collections import defaultdict, Counter

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OVDE = os.path.dirname(os.path.abspath(__file__))
RECI = os.path.join(KOREN, 'public/reci.txt')
DEFS = os.path.join(KOREN, 'public/definicije.json')
SPISAK = os.path.join(KOREN, 'AUDIT/MATICA-fali/07-obrisane-bez-objasnjenja.md')
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')
MATICA = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')

# ── latinica → ćirilica ──────────────────────────────────────────────────────
LAT2CIR = [('lj','љ'),('nj','њ'),('dž','џ'),
           ('a','а'),('b','б'),('c','ц'),('č','ч'),('ć','ћ'),('d','д'),('đ','ђ'),
           ('e','е'),('f','ф'),('g','г'),('h','х'),('i','и'),('j','ј'),('k','к'),
           ('l','л'),('m','м'),('n','н'),('o','о'),('p','п'),('r','р'),('s','с'),
           ('š','ш'),('t','т'),('u','у'),('v','в'),('z','з'),('ž','ж')]

def u_cirilicu(rec):
    r = rec.lower()
    for lat, cir in LAT2CIR:
        r = r.replace(lat, cir)
    return r

def norm(s):
    """Lowercase + skidanje svih kombinujućih dijakritika (akcenata)."""
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

# ── obrisanе reči ────────────────────────────────────────────────────────────
obrisane = []
for line in open(SPISAK, encoding='utf-8'):
    m = re.match(r'^- `(.+?)`', line.strip())
    if m:
        obrisane.append(m.group(1))
print('obrisanih:', len(obrisane))

# ── srLex: oblik → leme (sa brojem pojava), oblik/lema → vrsta reči ─────────
SLOVA = set('abcčćdđefghijklmnopqrsštuvwxyzž')
oblik_leme = defaultdict(Counter)   # oblik -> Counter(lema -> pojava)
oblik_pos = defaultdict(Counter)    # oblik -> Counter(POS -> pojava)
lema_pos = {}                       # lema -> POS (iz zapisa gde je oblik==lema)
propn_oblici = defaultdict(Counter) # VELIKIM slovom u srLex-u (rezervni prolaz)
with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        d = red.split('\t')
        if len(d) < 7:
            continue
        o, l, pos = d[0].strip(), d[1].strip(), d[4].strip()
        if not o or set(o.lower()) - SLOVA:
            continue
        try:
            br = int(d[6])
        except ValueError:
            br = 0
        if o[0].isupper():
            propn_oblici[o.lower()][l] += br
            continue
        oblik_leme[o][l] += br
        oblik_pos[o][pos] += br
        if o == l and l not in lema_pos:
            lema_pos[l] = pos

# ── postojeće ────────────────────────────────────────────────────────────────
reci = set(l.strip() for l in open(RECI, encoding='utf-8') if l.strip())
defs = json.load(open(DEFS, encoding='utf-8'))

# ── Matica: tokeni i odrednice ───────────────────────────────────────────────
CIR_RE = re.compile(r'[а-яђјљњћџёѕ]+')
tokeni = set()
redovi_raw = open(MATICA, encoding='utf-8', errors='replace').read().split('\n')
redovi = [norm(r) for r in redovi_raw]
odrednica_red = {}                  # ćir odrednica -> broj reda (prva pojava)
ODR_RE = re.compile(r'^([а-яђјљњћџёѕ]{2,})[ ,]')
for i, r in enumerate(redovi):
    for t in set(CIR_RE.findall(r)):
        tokeni.add(t)
    m = ODR_RE.match(r.strip())
    if m and m.group(1) not in odrednica_red:
        odrednica_red[m.group(1)] = i
print('matica tokena:', len(tokeni), '| odrednica:', len(odrednica_red))

# ── fuzzy: OCR poštapalice (konzervativno) ───────────────────────────────────
# Uzorkovanjem fajla: т se često čita kao ш; реđe г→т, н→п, в→б, з→е...
OCR_ZAMENE = {'т': 'ш', 'ш': 'т', 'г': 'т', 'н': 'п', 'в': 'б', 'и': 'л'}

def fuzzy_pogoci(c):
    """Sve jednoslovne zamene iz tablice poštapalica; vraća pogotke iz tokena."""
    out = set()
    for i, ch in enumerate(c):
        zamena = OCR_ZAMENE.get(ch)
        if zamena and c[:i] + zamena + c[i+1:] in tokeni:
            out.add(c[:i] + zamena + c[i+1:])
    return sorted(out)

# ── svrstavanje ──────────────────────────────────────────────────────────────
POS_SR = {'ADJ': 'prideva', 'NOUN': 'imenice', 'VERB': 'glagola', 'ADV': 'priloga',
          'PRON': 'zamenice', 'NUM': 'broja', 'PROPN': 'imenice', 'INTJ': 'uzvika',
          'ADP': 'predloga', 'CONJ': 'veznika', 'DET': 'zamenice', 'PART': 'rečce',
          'AUX': 'glagola', 'SCONJ': 'veznika', 'CCONJ': 'veznika'}

radni = {}
spisku = set(obrisane)
for w in obrisane:
    c = u_cirilicu(w)
    leme = oblik_leme.get(w, Counter())
    preko_propn = False
    if not leme and w in propn_oblici:
        leme = propn_oblici[w]
        preko_propn = True
    # glava familije: lema koja je i sama na spisku; inače najčešća; inače sama reč
    na_spisku_leme = [l for l in leme if l in spisku]
    if na_spisku_leme:
        najlema = sorted(na_spisku_leme, key=lambda l: -leme[l])[0]
    elif leme:
        najlema = leme.most_common(1)[0][0]
    else:
        najlema = w
    pos = (oblik_pos.get(w) or Counter()).most_common(1)
    pos = pos[0][0] if pos else lema_pos.get(najlema, '')
    u_matici = c in tokeni
    fuz = [] if u_matici else fuzzy_pogoci(c)
    # lema u Matici?
    c_lema = u_cirilicu(najlema)
    lema_u_matici = c_lema in tokeni
    lema_fuz = [] if lema_u_matici else ([] if najlema == w else fuzzy_pogoci(c_lema))
    lema_def = None
    for l in list(leme) + ([] if preko_propn else []):
        if l in defs:
            lema_def = l
            break
    radni[w] = {
        'leme': leme.most_common(),
        'najlema': najlema,
        'pos': pos,
        'matica': 'da' if u_matici else ('fuzzy:' + ','.join(fuz) if fuz else 'ne'),
        'matica_odrednica': odrednica_red.get(c),
        'lema_matica': 'da' if lema_u_matici else ('fuzzy:' + ','.join(lema_fuz) if lema_fuz else 'ne'),
        'lema_odrednica': odrednica_red.get(c_lema),
        'lema_ima_def': lema_def,
        'lema_na_spisku': najlema in spisku,
        'u_srlex': bool(leme),
        'preko_propn': preko_propn,
    }

json.dump(radni, open(os.path.join(OVDE, 'radni.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

# ── statistika ───────────────────────────────────────────────────────────────
kat = Counter()
b_leme = set()
for w, r in radni.items():
    if r['lema_ima_def']:
        kat['A (lema ima objašnjenje)'] += 1
    elif r['lema_na_spisku'] or r['najlema'] == w:
        kat['B? (lema bez objašnjenja, na spisku ili sam lema)'] += 1
        b_leme.add(r['najlema'])
    else:
        kat['? lema van spiska i bez objašnjenja'] += 1
for k, v in kat.most_common():
    print('%-55s %d' % (k, v))
print()
print('matica exact:', sum(1 for r in radni.values() if r['matica'] == 'da'))
print('matica fuzzy:', sum(1 for r in radni.values() if r['matica'].startswith('fuzzy')))
print('matica ne:   ', sum(1 for r in radni.values() if r['matica'] == 'ne'))
print('lema exact:  ', sum(1 for r in radni.values() if r['lema_matica'] == 'da'))
print('nije u srLex:', sum(1 for r in radni.values() if not r['u_srlex']))
print('različitih B-lema:', len(b_leme))

# ── B kandidati sa redovima iz Matice (za ručno pisanje objašnjenja) ─────────
def pasus_odrednice(i, max_redova=6):
    out = []
    for r in redovi_raw[i:i+max_redova]:
        if not r.strip():
            break
        out.append(r.strip())
    t = ' '.join(out)
    return re.sub(r'-\s+', '', norm(t))[:400]

with open(os.path.join(OVDE, 'b-kandidati.md'), 'w', encoding='utf-8') as f:
    for lema in sorted(b_leme):
        rs = [w for w, r in radni.items() if r['najlema'] == lema]
        r0 = radni[rs[0]]
        f.write('### %s  (POS: %s, oblika na spisku: %d, lema u Matici: %s)\n' %
                (lema, r0['pos'], len(rs), r0['lema_matica']))
        f.write('oblici: %s\n' % ', '.join(sorted(rs)))
        i = r0['lema_odrednica']
        if i is not None:
            f.write('matica: %s\n' % pasus_odrednice(i))
        f.write('\n')
print('b-kandidati.md zapisan')
