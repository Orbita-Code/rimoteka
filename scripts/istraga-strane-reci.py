#!/usr/bin/env python3
"""KOJE REČI ZASLUŽUJU STRANU — ukrštanje tri merila (istraga vlasnice, 08.09.2026).

Ulazi:
  AUDIT/analiza/kraj-stiha.json   — koliko puta reč stoji na kraju stiha (477 pesama, Vikizvornik)
  AUDIT/analiza/rime-po-reci.json — koliko rima ima svaka reč, izmereno pravim alatom
  public/frekvencija.json         — učestalost u veb-korpusu (srLex) — dosadašnje JEDINO merilo

Izlaz: ispis + AUDIT/analiza/istraga-strane-reci.md
  1) sadašnje strane koje po SVA TRI merila ne zaslužuju stranu (malo rima, nikad na kraju stiha, retke)
  2) reči sa kraja stiha koje NEMAJU stranu, a imaju bar 5 pravih rima
  3) reči sa najviše rima uopšte koje nemaju stranu
  4) kandidati za primer u polju („npr. svet"): mnogo najboljih I dobrih rima, poetska, kratka
"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def j(p): return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
korpus = j('AUDIT/analiza/kraj-stiha.json')['reci']
rime = j('AUDIT/analiza/rime-po-reci.json')
frek = j('public/frekvencija.json')
strane = {}
for d in os.listdir(os.path.join(ROOT, 'public', 'rime-za')):
    f = os.path.join(ROOT, 'public', 'rime-za', d, 'index.html')
    if os.path.isfile(f):
        m = re.search(r'<h1 class="landing-h1">Rime za reč „([^“]+)“', open(f, encoding='utf-8').read())
        strane[m.group(1) if m else d] = d
# ODREDNICE Rečnika Matice srpske — samo OSNOVNI oblici (bez „želim", „životom", „žrtava"), bez imena.
CIR = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z','и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c','ч':'č','џ':'dž','ш':'š'}
def lat(x): return ''.join(CIR.get(c, c) for c in x.lower())
ODREDNICE = set()
try:
    for line in open(os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt'), encoding='utf-8', errors='ignore'):
        # Red ODREDNICE nosi gramatičku oznaku odmah posle reči (ili posle genitiva): „пунац, -нца м",
        # „брзо прил.", „гледати, -ам несвр", pridev „леп, -а, -о". Redovi nastavka to nemaju.
        m = (re.match(r'^([а-яђљњћџј]{2,})(?:, -[а-яђљњћџј]+)?,? (?:м|ж|с|прил|прид|свр|несвр|зам|узв|речца|везн|предл|бр)(?: |\.|,)', line)
             or re.match(r'^([а-яђљњћџј]{2,}), -а, -о', line))
        if m: ODREDNICE.add(lat(m.group(1)))
except Exception as e:
    print('Matica nije učitana:', e)
STOP = set('se je nije jeste biti bio bila bilo bili bile jesam sam si smo ste su ja ti on ona ono mi vi oni one me te ga je ju nas vas ih mu joj im moj moja moje tvoj tvoja tvoje svoj svoja svoje naš vaš njihov ovaj ova ovo taj ta to onaj ona ono koji koja koje šta što ko gde kad kako zašto da ne ni niti i a ali pa te ili već još samo tako ovako onako tu tamo ovde sad sada tada onda zato jer ako dok kao nego neka nek eto evo eno više manje može mogu mora treba hoće neće ću ćeš će ćemo ćete zna kaže'.split())
VELIKA = {w for w in open(os.path.join(ROOT, 'public', 'reci.txt'), encoding='utf-8').read().split('\n') if w[:1].isupper()}
IMENA = {w.lower() for w in VELIKA}
def osnovna(w): return w in ODREDNICE and w not in STOP and w not in IMENA and len(w) >= 3
def r(w): v = rime.get(w) or {}; return v.get('najbolje', 0), v.get('dobre', 0), v.get('rezerva', 0)
def ukupno(w): a, b, c = r(w); return a + b

izlaz = []
def P(s=''): print(s); izlaz.append(s)

P('# Istraga: koje reči zaslužuju stranu — 08.09.2026')
P(f'\nStrana sada: {len(strane)} · reči sa kraja stiha (≥1): {len(korpus)} · izmereno rima za {len(rime)} reči · odrednica Matice: {len(ODREDNICE)}\n')

# 1) sadašnje strane koje ne zaslužuju stranu
slabe = []
for t in strane:
    k = korpus.get(t.lower(), 0); u = ukupno(t); fr = frek.get(t, 0) or 0
    if k == 0 and u < 12 and fr < 30000:
        slabe.append((u, fr, t))
slabe.sort()
P(f'## 1) Sadašnje strane koje po sva tri merila ne zaslužuju stranu: {len(slabe)}')
P('(nikad na kraju stiha u korpusu · manje od 12 rima (najbolje+dobre) · učestalost ispod 30.000)\n')
P('| reč | rima (najbolje+dobre) | učestalost |'); P('|---|---|---|')
GRAD = set(j('build/obavezne-drzave-gradovi.json'))
for u, fr, t in slabe[:80]: P(f'| {t}{" (grad/država — odluka vlasnice 10.08.)" if t in GRAD else ""} | {u} | {fr:,} |'.replace(',', '.'))
if len(slabe) > 80: P(f'… i još {len(slabe) - 80}')

# 2) reči sa kraja stiha bez strane
bez = []
for w, n in korpus.items():
    if n >= 3 and osnovna(w) and w not in strane and w not in {s.lower() for s in strane}:
        a, b, c = r(w)
        if a + b + c >= 5: bez.append((n, a + b, w))
bez.sort(reverse=True)
P(f'\n## 2) Reči koje stoje na kraju stiha (bar 3 puta), imaju bar 5 rima, a NEMAJU stranu: {len(bez)}\n')
P('| reč | puta na kraju stiha | rima (najbolje+dobre) |'); P('|---|---|---|')
for n, u, w in bez[:120]: P(f'| {w} | {n} | {u} |')
if len(bez) > 120: P(f'… i još {len(bez) - 120}')

# 3) reči sa najviše rima bez strane
naj = sorted(((ukupno(w), (frek.get(w, 0) or 0), w) for w in rime if osnovna(w) and w not in strane and (frek.get(w, 0) or 0) >= 1000), reverse=True)[:60]
P(f'\n## 3) Reči sa najviše rima koje nemaju stranu (učestalost bar 1.000): prvih 60\n')
P(', '.join(f'{w} ({u} rima, {fr:,} učest.)'.replace(',', '.') for u, fr, w in naj))

# 4) placeholder
kand = 'svet ljubav srce san dan noć sunce more zvezda cvet reč pesma sreća nada duša glas sen sjaj dom rod zora zima leto kiša sneg vetar nebo grad put oči ruka kuća voda vatra mrak tuga bol radost rima'.split()
P('\n## 4) Primer u polju („npr. …") — reč koja odmah pokaže sajt u punom sjaju\n')
P('| reč | najbolje | dobre | rezerva | na kraju stiha | učestalost |'); P('|---|---|---|---|---|---|')
for w in sorted(kand, key=lambda w: -(r(w)[0] * 2 + r(w)[1])):
    a, b, c = r(w); P(f'| {w} | {a} | {b} | {c} | {korpus.get(w, 0)} | {(frek.get(w, 0) or 0):,} |'.replace(',', '.'))

os.makedirs(os.path.join(ROOT, 'AUDIT', 'analiza'), exist_ok=True)
with open(os.path.join(ROOT, 'AUDIT', 'analiza', 'istraga-strane-reci.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(izlaz) + '\n')
