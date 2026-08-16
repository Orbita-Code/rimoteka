#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Poredjenje NAŠIH objašnjenja sa Rečnikom Matice srpske (2011).

Zahtev vlasnice 16.08.2026: proći reč po reč iz Rečnika Matice i proveriti
(1) imamo li je u `reci.txt` i (2) da li naša definicija nosi ISTO značenje,
ali PREFORMULISANO — da ne ispadne prepisano iz Matice.

Izlaz su SPISKOVI ZA PREGLED — ništa se ne menja automatski (pravilo projekta:
rečnik se ne dira bez odobrenja vlasnice). Tri grupe:

  01-deluje-prepisano.md    naša definicija je suviše slivna sa Maticinom →
                            kandidat za preformulisanje
  02-proveriti-znacenje.md  naša i Maticina definicija se gotovo ne dodiruju →
                            možda drugo značenje ili prekratko — proveriti
  03-nema-nase-definicije.md reč je u reci.txt i u Matici, a mi objašnjenje
                            nemamo
  04-zastarele-oznake.md    Matica je obeležava заст./арх./нар. — kod nas stoji
                            kao obična reč (informativno)

Ograničenja (pošteno): Rečnik Matice je SKENIRAN (OCR) — pun slovnih grešaka
(`шврдоће`, `усиљено`). Sličnost se zato meri grubo i granične vrednosti su
namerno široke: spiskovi su za PREGLED, ne za automatske odluke.
"""
import re, os, json
from collections import defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATICA = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')
IZLAZ = os.path.join(KOREN, 'AUDIT/MATICA-znacenja')
os.makedirs(IZLAZ, exist_ok=True)

CIR2LAT = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z',
           'и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o',
           'п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c',
           'ч':'č','џ':'dž','ш':'š'}
def u_latinicu(r): return ''.join(CIR2LAT.get(z, z) for z in r)

OZNAKE = (r'ж|м|с|мн|прил|предл|узв|вез|зам|бр|речца|свр|несвр|'
          r'-[ајеиоум]|и\s|јек\.|непром')
ODREDNICA = re.compile(r'^([а-шђћчџжљњ]{3,})(?:,\s*[^ ]+)?\s+(?:' + OZNAKE + r')')

ZASTARELE = re.compile(r'\b(заст|арх|нар|покр)\b\.?')

STOP = set('''i ili a ali pa te ni niti li da ne se na u za od do iz po pri pre nad pod
kroz uz o ob s sa pred posle između prema protiv uprkos usled zbog radi čije koji koja koje
koji je su sam si smo ste što kao ovde tamo gde kada tada onaj ona ono ovaj ova ovo taj ta to
svi sve svaka svako jedan jedna jedno mnogi mnoge mnoga neki neka neko bilo biti bude imati ima
imaju može mora treba hoće će ćemo ćete njegov njena njeno njihov svoj svoja svoje taj toga tom
tome tim mu joj im ih ga je ju muž žena čovek čoveka ljudi reč reči stvar stvari vreme godina
dan danas noć put puta deo dela više manje najviše najmanje vrlo veoma sasvim skoro baš samo
takođe tako ovako onako inače npr itd sl npr. itd. sl. nakon tokom usled zahvaljujući'''.split())

def reci_iz_teksta(t):
    t = t.lower()
    t = re.sub(r'[^a-zčćžšđljnj ]+', ' ', t)
    return [r for r in t.split() if len(r) > 2 and r not in STOP]

def jaccard(a, b):
    A, B = set(a), set(b)
    if not A or not B: return 0.0
    return len(A & B) / len(A | B)

def poklapanje_sadrzajnih(nase, matica):
    """Koliki deo NAŠIH sadržajnih reči postoji u Maticinom tekstu (i obrnuto)."""
    A, B = set(nase), set(matica)
    if not A or not B: return 0.0, 0.0
    return len(A & B) / len(A), len(A & B) / len(B)

# ── 1. Učitaj naše podatke ─────────────────────────────────────────────────
reci_nase = set(l.strip() for l in open(os.path.join(KOREN, 'public/reci.txt'), encoding='utf-8') if l.strip())
definicije = json.load(open(os.path.join(KOREN, 'public/definicije.json'), encoding='utf-8'))

# ── 2. Parsiraj Maticu: odrednica → ceo tekst tumačenja ────────────────────
matica = {}          # latinica → tekst tumačenja (latinizovan)
red_za = {}          # latinica → sirov red (za prikaz u spisku)
zastarele = set()
trenutna, tekst = None, []
broj_linija = 0
for sirova in open(MATICA, encoding='utf-8', errors='replace'):
    broj_linija += 1
    linija = sirova.rstrip('\n')
    m = ODREDNICA.match(linija)
    if m:
        if trenutna:
            matica.setdefault(trenutna, u_latinicu(' '.join(tekst)))
        trenutna = u_latinicu(m.group(1))
        red_za[trenutna] = linija[:160]
        if ZASTARELE.search(linija): zastarele.add(trenutna)
        tekst = [linija]
    elif trenutna:
        tekst.append(linija)
        if len(' '.join(tekst)) > 2500:   # dovoljno za sličnost; štednja memorije
            matica.setdefault(trenutna, u_latinicu(' '.join(tekst)))
            trenutna, tekst = None, []
if trenutna:
    matica.setdefault(trenutna, u_latinicu(' '.join(tekst)))

# ── 3. Poredjenje ──────────────────────────────────────────────────────────
fali_u_nasem, nema_def = [], []
prepisano, drugo_znacenje, zastarele_kod_nas = [], [], []
ok = 0

for rec, tekst_m in matica.items():
    if rec not in reci_nase:
        fali_u_nasem.append(rec)
        continue
    nasa = definicije.get(rec)
    if not nasa:
        nema_def.append(rec)
        continue
    if nasa.startswith('Oblik reči'):
        continue                      # pokazivač na drugu reč — ne meri se
    if rec in zastarele:
        zastarele_kod_nas.append(rec)
    nase_r = reci_iz_teksta(nasa)
    mat_r = reci_iz_teksta(tekst_m)
    jac = jaccard(nase_r, mat_r)
    nase_u_m, m_u_nama = poklapanje_sadrzajnih(nase_r, mat_r)
    # „Deluje prepisano": visoka leksička sličnost + veći deo naših reči u Matici.
    # Prag proveren na simuliranom prepisu (jac 0,5 / poklapanje 0,78 → pada).
    if len(nasa) >= 40 and jac >= 0.45 and nase_u_m >= 0.6:
        prepisano.append((rec, jac, nase_u_m, nasa))
    # „Drugo značenje": gotovo nijedna naša sadržajna reč nije u Matici
    elif len(mat_r) >= 8 and nase_u_m < 0.15:
        drugo_znacenje.append((rec, nase_u_m, nasa, tekst_m[:200]))
    else:
        ok += 1

# ── 4. Ispis ───────────────────────────────────────────────────────────────
def ispisi(ime, naslov, redovi, fmt):
    with open(os.path.join(IZLAZ, ime), 'w', encoding='utf-8') as f:
        f.write(f'# {naslov} ({len(redovi)})\n\n')
        for r in redovi:
            f.write(fmt(r) + '\n')

ispisi('01-deluje-prepisano.md', 'Naša definicija deluje suviše slivna sa Maticom — za preformulisanje',
       sorted(prepisano, key=lambda x: -x[1]),
       lambda r: f'| `{r[0]}` | sličnost {r[1]:.2f} | naše: {r[3]} |')
ispisi('02-proveriti-znacenje.md', 'Naša i Maticina definicija se ne dodiruju — proveriti značenje',
       sorted(drugo_znacenje),
       lambda r: f'| `{r[0]}` | poklapanje {r[1]:.2f} | naše: {r[2]} | Matica: {r[3]}… |')
ispisi('03-nema-nase-definicije.md', 'Reč je u reci.txt i u Matici, a mi objašnjenje nemamo',
       sorted(nema_def), lambda r: f'- `{r}`')
ispisi('04-zastarele-oznake.md', 'Matica: заст./арх./нар. — kod nas stoji kao obična reč',
       sorted(zastarele_kod_nas), lambda r: f'- `{r}`')

with open(os.path.join(IZLAZ, '00-izvestaj.md'), 'w', encoding='utf-8') as f:
    f.write(f'''# Poredjenje sa Rečnikom Matice srpske — izveštaj

| Šta | Koliko |
|---|---|
| Odrednica pročitano iz Matice | {len(matica)} |
| …kojih NEMA u našem reci.txt | {len(fali_u_nasem)} |
| …kojih IMA u našem reci.txt | {len(matica) - len(fali_u_nasem)} |
| Pokrivenost Maticinih odrednica | {(len(matica)-len(fali_u_nasem))/max(1,len(matica))*100:.1f}% |
| Bez naše definicije (spisak 03) | {len(nema_def)} |
| Definicija „Oblik reči X" (pokazivač — ne meri se) | preskočene pri merenju |
| Značenje u redu (gruba provera) | {ok} |
| Deluje prepisano (spisak 01) | {len(prepisano)} |
| Drugo značenje? (spisak 02) | {len(drugo_znacenje)} |
| Zastarele po Matici, obične kod nas (spisak 04) | {len(zastarele_kod_nas)} |

Ograničenja: Rečnik Matice je skeniran (OCR) — sličnost je gruba, spiskovi su
za pregled vlasnice, ne za automatske odluke.
''')

print(f'odrednica iz Matice: {len(matica)}')
print(f'nema u nasem reci.txt: {len(fali_u_nasem)} (pokrivenost {(len(matica)-len(fali_u_nasem))/max(1,len(matica))*100:.1f}%)')
print(f'bez nase definicije: {len(nema_def)}')
print(f'deluje prepisano: {len(prepisano)}')
print(f'drugo znacenje?: {len(drugo_znacenje)}')
print(f'zastarele kod nas kao obične: {len(zastarele_kod_nas)}')
print(f'značenje u redu (grubo): {ok}')
