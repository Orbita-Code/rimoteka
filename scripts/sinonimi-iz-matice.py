#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sinonimi iz Rečnika Matice srpske — samo DOKUMENTOVANI odnosi, sa dokazom.

Zahtev vlasnice 16.08.2026: sinonimi moraju biti u skladu sa pravopisom —
svaki par mora imati dokaz (red iz Matice) ili odluku vlasnice. Mašinski
sinonimi bez provere (sinonimi.json, 160.787 parova, 50% van Matice) se
ODBACUJU u celini osim ručnih odluka vlasnice.

Tri tipa dokaza:
  A) upućivanje „в. X" (vidi X) u tumačenju — Matica sama kaže „za ovo značenje vidi X"
  B) oblici-varijante odrednice: „X/, Y" i „X и Y" na početku reda
  C) sinonim u glosu definicije, ali samo ako se reči UZAJAMNO pominju
     (W ima G u definiciji i G ima W u svojoj) — jak dokaz istoznačnosti

Filteri: obe reči moraju biti odrednice u Matici I u našem reci.txt; bez
ijekavice; bez OCR-sumnjivih oblika; duplikati se skidaju. Ručne odluke
vlasnice (OVERRIDE dole) imaju poslednju reč.

Izlaz:
  public/sinonimi.json                     — novi fajl (samo dokazani parovi)
  AUDIT/sinonimi-iz-matice.md              — svaki par sa dokazom (za pregled)
"""
import re, os, json
from collections import defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATICA = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')

CIR2LAT = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z','и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c','ч':'č','џ':'dž','ш':'š'}
def ul(r): return ''.join(CIR2LAT.get(z, z) for z in r)

# ── Ručne odluke vlasnice (konačni autoritet) ──
OVERRIDE = {
    'sunce': ['zvezda', 'svetlost', 'toplota'],
    'šišarka': ['šišarica'],
}

OZNAKE = (r'ж|м|с|мн|прил|предл|узв|вез|зам|бр|речца|свр|несвр|-[ајеиоум]|и\s|јек\.|непром')
ODREDNICA = re.compile(r'^([а-шђћчџжљњ]{2,})(?:,\s*[^ ]+)?\s+(?:' + OZNAKE + r')')

# ── 1. Parsiraj Maticu: odrednica → ceo tekst ──
matica, red_za = {}, {}
trenutna, tekst = None, []
for sirova in open(MATICA, encoding='utf-8', errors='replace'):
    linija = sirova.rstrip('\n')
    m = ODREDNICA.match(linija)
    if m:
        if trenutna: matica.setdefault(trenutna, ' '.join(tekst))
        trenutna = ul(m.group(1))
        red_za[trenutna] = linija[:200]
        tekst = [linija]
    elif trenutna:
        tekst.append(linija)
        if len(' '.join(tekst)) > 2500:
            matica.setdefault(trenutna, ' '.join(tekst))
            trenutna, tekst = None, []
if trenutna: matica.setdefault(trenutna, ' '.join(tekst))

reci_txt = set(l.strip() for l in open(os.path.join(KOREN, 'public/reci.txt'), encoding='utf-8') if l.strip())
jekavica = set(l.strip() for l in open(os.path.join(KOREN, 'public/reci_jekavica.txt'), encoding='utf-8') if l.strip())

def ocr_sumnja(w):
    if len(w) > 2 and w[0] == w[1]: return True
    if re.search(r'b[nl]', w): return True
    if not re.fullmatch(r'[a-zčćžšđ]+', w): return True
    return False

def prihvatljivo(w):
    return (w in matica and w in reci_txt and w not in jekavica and not ocr_sumnja(w))

parovi = defaultdict(set)          # reč → {sinonimi}
dokaz = defaultdict(dict)          # reč → sinonim → (tip, red)

def dodaj(w, s, tip):
    if w == s or not prihvatljivo(w) or not prihvatljivo(s): return
    parovi[w].add(s)
    dokaz[w].setdefault(s, (tip, red_za.get(w, '')[:150]))

# ── 2. Tip A: „в. X" u tumačenju ──
REF = re.compile(r'в\.\s*([а-шђћчџжљњ]{3,})')
for w, t in matica.items():
    for x in REF.findall(t):
        dodaj(w, ul(x), 'A: в. ' + ul(x))

# ── 3. Tip B: varijante odrednice „X/, Y" i „X и Y" ──
for linija in open(MATICA, encoding='utf-8', errors='replace'):
    m = re.match(r'^([а-шђћчџжљњ]{3,})/?,?\s+([а-шђћчџжљњ]{3,})\.\s', linija)
    if m:
        dodaj(ul(m.group(1)), ul(m.group(2)), 'B: varijanta')

# ── 4. Tip C: glos sa uzajamnim pomenom ──
# glos = prve 1–3 reči definicije posle gramatičkih oznaka, pre prve tačke/zareza duži tekst
VOWEL = set('aeiou')
def glosovi(w, t):
    # tekst posle prvog razmaka-oznake; grubo: reči pre prvog „." ili „:"
    telo = re.sub(r'^[а-шђћчџжљњ,;\-/\.\s]+?(ж|м|с|мн|прил)\s+', '', t, count=1)
    glavni = re.split(r'[.;:•]', telo)[0]
    reci = [ul(x) for x in re.findall(r'[а-шђћчџжљњ]{3,}', glavni)]
    return [r for r in reci if r != w]
for w, t in matica.items():
    for g in glosovi(w, t):
        if g in matica and re.search(r'\b' + re.escape(w) + r'\b', ul(matica[g])):
            dodaj(w, g, 'C: uzajamni pomen')

# ── 5. Sklapanje: simetrija + override ──
final = defaultdict(set)
for w, ss in parovi.items():
    final[w] |= ss
    for s in ss:
        final[s].add(w)          # sinonimija je simetrična
for w, s in list(final.items()):
    final[w] = {x for x in s if x != w and prihvatljivo(x)}
for w, ss in OVERRIDE.items():
    final[w] = set(ss)           # ručne odluke zamenjuju mašinske

# ── 6. Ispis ──
out = {w: sorted(ss) for w, ss in sorted(final.items()) if ss}
with open(os.path.join(KOREN, 'public/sinonimi.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False)

with open(os.path.join(KOREN, 'AUDIT/sinonimi-iz-matice.md'), 'w', encoding='utf-8') as f:
    f.write('# Sinonimi iz Rečnika Matice — obnovljeno 16.08.2026\n\n')
    f.write(f'Ključeva: {len(out)}; parova: {sum(len(v) for v in out.values())}\n\n')
    f.write('Samo dokumentovani odnosi (A: upućivanje „в.", B: varijante, C: uzajamni pomen)\n')
    f.write('+ ručne odluke vlasnice. Stari mašinski sinonimi (160.787 parova, 50% van\n')
    f.write('Matice) odbačeni u celini.\n\n')
    for w in sorted(out):
        dok = ', '.join(f'{s} [{dokaz.get(w, {}).get(s, ("ručna odluka", ""))[0]}]' for s in out[w])
        f.write(f'- **{w}** → {dok}\n')

print(f'ključeva: {len(out)}')
print(f'parova: {sum(len(v) for v in out.values())}')
print(f'tip A (в.): {sum(1 for w in dokaz for s in dokaz[w] if dokaz[w][s][0].startswith("A"))}')
print(f'tip B (varijanta): {sum(1 for w in dokaz for s in dokaz[w] if dokaz[w][s][0].startswith("B"))}')
print(f'tip C (uzajamni): {sum(1 for w in dokaz for s in dokaz[w] if dokaz[w][s][0].startswith("C"))}')
print('\nuzorak:')
for w in list(out)[:20]: print(f'  {w} → {out[w]}')
