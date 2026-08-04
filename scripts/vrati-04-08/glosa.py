#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Drugi prolaz: bolje izvlačenje glosa iz Matice + kompaktan fajl za ručni pregled.

Odrednica = red koji počinje rečju, a PRETHODNI red je prazan (pasusi).
Fallback za pod-odrednice zalepljene unutar pasusa: token + gram. oznaka
usred reda. Svaka glosa dobija oznaku kvaliteta:
  [H]  prava odrednica (početak pasusa)
  [P]  pod-odrednica / kontekst usred pasusa (proveriti okom)
  [-]  nema glose (samo token negde u tekstu)
"""
import json, os, re, unicodedata

OVDE = os.path.dirname(os.path.abspath(__file__))
MATICA = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

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

redovi = [norm(r) for r in open(MATICA, encoding='utf-8', errors='replace').read().split('\n')]

# prava odrednica: prethodni red prazan, red počinje rečju + razmak/zapeta/zagrada
odr_start = {}
ODR_RE = re.compile(r'^([а-яђјљњћџёѕ]{2,})[ ,(-]')
for i, r in enumerate(redovi):
    s = r.strip()
    if not s:
        continue
    if i > 0 and redovi[i-1].strip():
        continue
    m = ODR_RE.match(s)
    if m:
        odr_start.setdefault(m.group(1), i)

# indeks tokena → redovi (za fallback)
from collections import defaultdict
CIR_RE = re.compile(r'[а-яђјљњћџёѕ]+')
indeks = defaultdict(list)
for i, r in enumerate(redovi):
    for t in set(CIR_RE.findall(r)):
        indeks[t].append(i)

GRAM = re.compile(r'\b(м|ж|с|прил|свр|несвр|прт|прд|зам|бр|узв|прет|вез|јек|ек)\b')

def pasus(i, n=6, maxc=260):
    out = []
    for r in redovi[i:i+n]:
        if not r.strip():
            break
        out.append(r.strip())
    t = re.sub(r'-\s+', '', ' '.join(out))
    return re.sub(r'\s+', ' ', t).strip()[:maxc]

def glosa_za(c):
    """Vraća (oznaka, tekst) za ćiriličnu reč."""
    i = odr_start.get(c)
    if i is not None:
        return 'H', pasus(i)
    # fallback: token usred reda, uz gramatičku oznaku u blizini
    for j in indeks.get(c, [])[:30]:
        r = redovi[j]
        for m in re.finditer(re.escape(c) + r'[ ,(]', r):
            pos = m.start()
            # glava pasusa ili iza tačke/tirea — tipično mesto pod-odrednice
            pre = r[max(0, pos-3):pos]
            if pos < 3 or re.search(r'[.•—–-]\s*$', pre) or GRAM.search(r[pos:pos+60]):
                frag = re.sub(r'-\s+', '', r[pos:])
                if j+1 < len(redovi) and redovi[j+1].strip():
                    frag += ' ' + re.sub(r'-\s+', '', redovi[j+1].strip())
                if j+2 < len(redovi) and redovi[j+2].strip():
                    frag += ' ' + re.sub(r'-\s+', '', redovi[j+2].strip())
                return 'P', re.sub(r'\s+', ' ', frag).strip()[:260]
    return '-', ''

radni = json.load(open(os.path.join(OVDE, 'radni.json'), encoding='utf-8'))

# B-leme (na spisku ili sopstvena lema, bez objašnjenja) + leme van spiska
b_leme = {}
for w, d in radni.items():
    if d['lema_ima_def']:
        continue
    b_leme.setdefault(d['najlema'], {'oblici': [], 'pos': d['pos'], 'na_spisku': d['lema_na_spisku'] or d['najlema'] == w})
    b_leme[d['najlema']]['oblici'].append(w)

red = []
for lema in sorted(b_leme, key=lambda x: x.lower()):
    d = b_leme[lema]
    ob = sorted(d['oblici'])
    # glosa: prvo lema, pa svaki oblik po redu — prvi pogodak dobija
    ozn, g, pogodak = '-', '', None
    for kand in [lema] + ob:
        c = u_cirilicu(kand)
        o2, g2 = glosa_za(c)
        if o2 != '-':
            ozn, g, pogodak = o2, g2, kand
            break
    u_matici = any(u_cirilicu(k) in indeks for k in [lema] + ob)
    red.append({'lema': lema, 'pos': d['pos'], 'oblici': ob,
                'oznaka': ozn if u_matici else '-', 'glosa': g,
                'matica': 'da' if u_matici else 'ne',
                'pogodak': pogodak,
                'na_spisku': d['na_spisku']})
json.dump(red, open(os.path.join(OVDE, 'b-leme.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

with open(os.path.join(OVDE, 'pregled.txt'), 'w', encoding='utf-8') as f:
    for r in red:
        ob = r['oblici']
        prikaz_oblike = not (len(ob) == 1 and ob[0] == r['lema'])
        tag = '%s|%s|oblika:%d' % (r['oznaka'], r['pos'] or '?', len(ob))
        if prikaz_oblike:
            tag += '|' + ','.join(ob)
        f.write('%s [%s] %s\n' % (r['lema'], tag, r['glosa']))

from collections import Counter
print('lema za pregled:', len(red))
print(Counter(r['oznaka'] for r in red))
print('lema van spiska obrisanih:', sum(1 for r in red if not r['na_spisku']))
