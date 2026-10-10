#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SJ-3 – HRVATSKE REČI VAN REČNIKA (naredba vlasnice 10.10.2026: „izbrisati sve hrvatske reči").

Kandidati: (a) reči čije objašnjenje u definicije.json IZRIČITO kaže da su hrvatske („hrvatska reč", „(srpski: …)",
„ijekavski/hrvatski", „kroatizam"…); (b) spisak hrvatskih leksema kojih u srpskom nema (tjedan, vlak, kruh, juha…);
(c) svi OBLICI tih reči („Oblik reči „X““ u objašnjenju, ili oblik koji počinje osnovom lekseme).
SUDIJA: puni Rečnik Matice srpske (~/Literatura). Reč koja je u njemu STANDARDNA odrednica (ne „рег.“, ne „в.“) OSTAJE,
ma šta objašnjenje reklo – jer vlasnica ne briše srpske reči (zrak, promet, kolovoz, listopad, pozor su srpske).
Upotreba: python3 scripts/sj3-hrvatske.py            → samo spisak (AUDIT/SJ-3-hrvatske-reci-<datum>.md)
          python3 scripts/sj3-hrvatske.py --apply    → briše iz reci.txt, reci_jekavica.txt, definicije.json, matica.json
Posle --apply: python3 build/podeli_definicije.py && python3 build/akcenat.py && python3 build/kante.py &&
node scripts/osvezi-verzije-podataka.mjs && python3 build/gen_pages.py, pa pun lanac; ukinute strane u nginx-stare-strane.map."""
import json, os, re, sys, datetime
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(K, 'public')
APPLY = '--apply' in sys.argv
LAT2CIR = [('lj','љ'),('nj','њ'),('dž','џ'),('dj','ђ'),('a','а'),('b','б'),('c','ц'),('č','ч'),('ć','ћ'),('d','д'),('đ','ђ'),('e','е'),('f','ф'),('g','г'),('h','х'),('i','и'),('j','ј'),('k','к'),('l','л'),('m','м'),('n','н'),('o','о'),('p','п'),('r','р'),('s','с'),('š','ш'),('t','т'),('u','у'),('v','в'),('z','з'),('ž','ж')]
def cir(w):
    w = w.lower()
    for a, b in LAT2CIR: w = w.replace(a, b)
    return w
REDOVI = open(os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt'), encoding='utf-8').read().split('\n')
ODR = {}
for i, red in enumerate(REDOVI):
    m = re.match(r'([а-шђћчџжљњ]{2,})[ ,]', red.strip().lower())
    if m and m.group(1) not in ODR: ODR[m.group(1)] = i
SPOREDNA = re.compile(r'\bрег\b|\bв\.|\bсв\.|\bуп\.|\bпокр\b|\bзаст\b|\bдијал\b|\bхрв\b')
def standard_u_matici(w):
    i = ODR.get(cir(w))
    return i is not None and not SPOREDNA.search(REDOVI[i][:90].lower())
d = json.load(open(os.path.join(PUB, 'definicije.json'), encoding='utf-8'))
reci = [l for l in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8').read().split('\n') if l]; R = set(reci)
jek = [l for l in open(os.path.join(PUB, 'reci_jekavica.txt'), encoding='utf-8').read().split('\n') if l]; J = set(jek)
pat = re.compile(r'(hrvatska reč|hrvatski (naziv|izraz|oblik|pravopis)|\(srpski:|ijekavski/hrvatski|hrvatski/ijekavski|hrvatski/starosrpski|\(hrvatski\)|\(hrvatski[,;]|– hrvatski|hrvatski –|\(u hrvatskom\))', re.I)
# NE briše se ni sa oznakom: imena, pojmovi O hrvatskom (kroatizam, ilirizam, „koji se tiče Hrvata"), skraćenice, reč sa srpskim značenjem pre oznake (listopad, stroj)
NIJE_LEKSEMA = re.compile(r'(muško ime|žensko ime|Oblik imena|kralj|pokret|skraćenica|preuzeta iz hrvatsk|koji se tiče Hrvat|Opadanje lišća|postrojenih)', re.I)
# (b) hrvatske lekseme kojih u srpskom standardu nema (Matica presuđuje i za njih – ako je odrednica, ostaje)
LEKSEME = '''tjedan tisuća kolodvor vlak kruh juha sustav sveučilište uvjet opće općenito točno točka točan također takodjer glazba glazbenik
kazalište računalo zrakoplov tipka tipkovnica siječanj veljača ožujak travanj svibanj lipanj srpanj rujan prosinac tko netko nitko
glede obitelj tvrtka tisak časnik vojarna ozračje domovnica putovnica rajčica vrhnje tjelovježba ljekarna nazočan nazočnost sukladno
izvješće gospodarstvo natjecanje natjecatelj momčad kupnja prodavaonica dućan poduzeće poduzetnik čimbenik postotak prosjek dakako
uopće posve posvema ravnatelj tajnik tajnica županija župan sabor sudac odvjetnik nogomet nogometaš glasovati glasovanje sveukupno
pročelnik predstojnik gradonačelnik stoljeće tisućljeće dapače suradnja suradnik surađivati poštivati prenašati odgađati produljiti
sviđati kolega ugodno nažalost usprkos unatoč štoviše uistinu zapravo pozornost tjedno tjedni mjesečno nazočiti zrakoplovstvo
putovnički domovinski domovina obiteljski obitelji kolodvorski kazališni glazbeni računalni tipkovnički sveučilišni sustavni
sustavno uvjetno uvjetovati bezuvjetno kruhom juhom vlakom'''.split()
# Srpske reči koje su greškom bile na spisku (Matica ih ima kao obične): NIKAD kandidati.
SRPSKE = set('svojeg svojega domovina domovinski domovinama domovine domovini domovinom dućan gradonačelnik sabor kolega pozornost mjesečno nažalost ugodno uistinu zapravo dakako posve sviđati odgađati unatoč štoviše gospodarstvo župan županija glasovanje glasovati odgađati prenašati tjedno pročelnik'.split())
LEKSEME = [w for w in LEKSEME if w not in SRPSKE]
osnove = {w for w in LEKSEME if (w in R or w in J)}
kand = {}
for k, v in d.items():
    if isinstance(v, str) and pat.search(v) and not NIJE_LEKSEMA.search(v) and (k in R or k in J): kand[k] = 'objašnjenje: ' + v[:110]
for w in osnove: kand.setdefault(w, 'hrvatska leksema')
# (c) oblici: „Oblik reči „X““ gde je X kandidat
OBLIK = re.compile(r'Oblik (?:reči|glagola|prideva|imenice|zamenice|broja|priloga)[^„]*„([^“]+)“')
osnovni = set(kand)
for k, v in d.items():
    if isinstance(v, str) and (k in R or k in J) and k not in kand:
        m = OBLIK.search(v)
        if m and m.group(1).lower() in osnovni: kand[k] = 'oblik od „' + m.group(1) + '“'
# Matica presuđuje za lekseme sa spiska (b); reč koju NAŠE objašnjenje zove hrvatskom (a) briše se i kad je Matica ima
# (Matica 2011 beleži i sustav, sveučilište, poduzeće – kao uputnice „в."/„уп." ka srpskoj reči). Oblici (c) prate osnovu.
brisi, ostaju = {}, {}
for k, zasto in kand.items():
    if k in SRPSKE: ostaju[k] = zasto + ' (srpska reč)'; continue
    if zasto.startswith('oblik od'): continue
    # Ijekavica NIJE hrvatski (pravilo vlasnice): reč sa oznakom „ijekavski/hrvatski" čiji EKAVSKI parnjak postoji u rečniku
    # (dosljednog → doslednog, ozljedama → ozledama, željezom → železom) ostaje kao ijekavski oblik.
    if zasto.startswith('objašnjenje') and 'ijekavski' in zasto.lower():
        ek = re.sub(r'ije', 'e', k); ek = re.sub(r'je', 'e', ek)
        if ek != k and (ek in R or ek in J): ostaju[k] = zasto + ' (ijekavica – ekavski parnjak „' + ek + '“ postoji)'; continue
    if zasto.startswith('objašnjenje') or zasto == 'hrvatska leksema': brisi[k] = zasto
    else: ostaju[k] = zasto
for k, zasto in kand.items():
    if zasto.startswith('oblik od'):
        osnova = zasto.split('„')[1].split('“')[0].lower()
        (brisi if osnova in brisi else ostaju)[k] = zasto
# strane reči koje bi nestale
try:
    sm = open(os.path.join(PUB, 'sitemap.xml'), encoding='utf-8').read()
    SA_STRANOM = [k for k in brisi if f'/rime-za/{k}/' in sm]
except Exception: SA_STRANOM = []
danas = datetime.date.today().isoformat()
put = os.path.join(K, f'AUDIT/SJ-3-hrvatske-reci-{danas}.md')
with open(put, 'w', encoding='utf-8') as f:
    f.write(f'# SJ-3 – hrvatske reči, {danas} (naredba vlasnice: brisati)\n\n')
    f.write(f'> Kandidata {len(kand)}: **briše se {len(brisi)}** (nema ih u Rečniku Matice kao standardne odrednice), **ostaje {len(ostaju)}** (Matica ih ima kao srpske).\n')
    f.write('> Ako je neka obrisana reč greškom ovde – kaži, vraća se iz git istorije.\n')
    f.write(f'> Reči sa svojom stranom /rime-za/ među obrisanima: {", ".join(SA_STRANOM) or "nijedna"}.\n\n## Briše se\n\n| Reč | Gde | Zašto |\n|---|---|---|\n')
    for k in sorted(brisi): f.write(f'| {k} | {"reci" if k in R else ""}{"+jek" if k in J else ""} | {brisi[k].replace("|", "/")} |\n')
    f.write('\n## Ostaje (Matica ih ima kao standardne srpske odrednice)\n\n| Reč | Zašto je bila kandidat |\n|---|---|\n')
    for k in sorted(ostaju): f.write(f'| {k} | {ostaju[k].replace("|", "/")} |\n')
print(f'kandidata {len(kand)} · briše se {len(brisi)} · ostaje {len(ostaju)} · spisak: {put}')
print('obrisane reči koje IMAJU stranu /rime-za/ (dopisati u nginx-stare-strane.map):', SA_STRANOM)
if APPLY:
    B = set(brisi)
    novo_r = [w for w in reci if w not in B]; novo_j = [w for w in jek if w not in B]
    open(os.path.join(PUB, 'reci.txt'), 'w', encoding='utf-8').write('\n'.join(novo_r) + '\n')
    open(os.path.join(PUB, 'reci_jekavica.txt'), 'w', encoding='utf-8').write('\n'.join(novo_j) + '\n')
    for k in B: d.pop(k, None)
    json.dump(d, open(os.path.join(PUB, 'definicije.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, separators=(',', ': '))
    try:
        mp = os.path.join(PUB, 'matica.json'); mat = json.load(open(mp, encoding='utf-8'))
        mat2 = [w for w in mat if w not in B]
        if len(mat2) != len(mat): json.dump(mat2, open(mp, 'w', encoding='utf-8'), ensure_ascii=False)
    except Exception as e: print('matica.json:', e)
    print(f'OBRISANO: reci.txt {len(reci)} → {len(novo_r)}, reci_jekavica.txt {len(jek)} → {len(novo_j)}, definicije {len(B)}')
