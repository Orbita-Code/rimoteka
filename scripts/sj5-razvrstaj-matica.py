#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SJ-5 — razvrstavanje 6.067 osnova („Oblik reči X" gde X nije u rečniku) po Rečniku Matice srpske (2011).

Zahtev vlasnice 25.09.2026: „razvrstaj SJ-5 po Matici". Ništa se ne menja u podacima — izlaz su tri spiska
za njenu odluku, svaki red sa redom iz Matice u kome je osnova nađena (OCR, ćirilica), da se presuda može
proveriti golim okom.

Gomile:
  A  Matica IMA osnovu kao odrednicu            → predlog: dodati osnovu u rečnik + objašnjenje svojim rečima
  B  Matica NEMA, ali oblici žive u korpusu     → predlog: prepisati objašnjenje oblika (bez upućivanja)
  C  Matica NEMA i oblici su bez učestalosti     → predlog: na brisanje (ili ostaviti kako jeste)

Pokretanje: python3 scripts/sj5-razvrstaj-matica.py
Ispis: AUDIT/SJ-5-razvrstano/{A-matica-ima,B-zivi-oblici,C-bez-traga}.md + pregled.json
"""
import re, os, json
from collections import defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATICA = os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt')
SPISAK = os.path.join(KOREN, 'AUDIT/SJ-5-za-odluku.md')
IZLAZ = os.path.join(KOREN, 'AUDIT/SJ-5-razvrstano'); os.makedirs(IZLAZ, exist_ok=True)

LAT2CIR = [('lj','љ'),('nj','њ'),('dž','џ'),('dj','ђ'),('a','а'),('b','б'),('c','ц'),('č','ч'),('ć','ћ'),('d','д'),('đ','ђ'),
           ('e','е'),('f','ф'),('g','г'),('h','х'),('i','и'),('j','ј'),('k','к'),('l','л'),('m','м'),('n','н'),('o','о'),
           ('p','п'),('r','р'),('s','с'),('š','ш'),('t','т'),('u','у'),('v','в'),('z','з'),('ž','ж')]
def u_cir(r):
    r = r.lower()
    for a, b in LAT2CIR: r = r.replace(a, b)
    return r

# odrednica: početak reda + ćirilična reč, pa ILI gramatička oznaka (м ж с свр несвр прил…) ILI nastavak sa crticom („, -а, -о").
# Strože nego ranije (25.09.): red iz sredine odrednice („чин, као аналфабеша") je lažno prolazio kao odrednica „чин".
POS = r'м|ж|с|мн|прил|предл|узв|вез|зам|бр|речца|свр|несвр|непром'
ODREDNICA = re.compile(r'^([а-шђћчџжљњ]{3,})(?:\s+(?:' + POS + r')\b|,\s*-[а-шђћчџжљњ0-9]+|,\s*[а-шђћчџжљњ]{2,}\s+(?:' + POS + r')\b)')

def ucitaj_maticu():
    """Vraća {odrednica(ćir): [tekst odrednice…]} — tekst je red odrednice + nastavak do praznog reda, spojen."""
    ind = defaultdict(list)
    tekuci = None; buf = []
    def zatvori():
        if tekuci and buf:
            t = ' '.join(x.strip() for x in buf)
            t = re.sub(r'-\s+', '', t)          # prelom sa crticom: доку- менф → докуменф
            ind[tekuci].append(t[:400])
    with open(MATICA, encoding='utf-8', errors='replace') as f:
        for line in f:
            s = line.rstrip('\n')
            if not s.strip():
                zatvori(); tekuci = None; buf = []; continue
            m = ODREDNICA.match(s)
            if m:
                zatvori(); tekuci = m.group(1); buf = [s]
            elif tekuci:
                buf.append(s)
    zatvori()
    return ind

def ucitaj_spisak():
    red = re.compile(r'^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*([^|]*?)\s*\|')
    out = []
    for l in open(SPISAK, encoding='utf-8'):
        m = red.match(l)
        if m and m.group(1) not in ('X', '---'):
            out.append((m.group(1), int(m.group(2)), m.group(3)))
    return out

def main():
    matica = ucitaj_maticu()
    print('odrednica u Matici (OCR):', len(matica))
    spisak = ucitaj_spisak(); print('osnova u SJ-5:', len(spisak))
    freq = json.load(open(os.path.join(KOREN, 'public/frekvencija.json'), encoding='utf-8'))
    defin = json.load(open(os.path.join(KOREN, 'public/definicije.json'), encoding='utf-8'))
    # oblici po osnovi (za učestalost): iz definicija „Oblik reči X"
    oblici = defaultdict(list)
    for w, d in defin.items():
        m = re.match(r'^Oblik reči ([^\s.,;(]+)', d if isinstance(d, str) else str(d))
        if m: oblici[m.group(1)].append(w)
    A, B, C = [], [], []
    for x, n, primeri in spisak:
        c = u_cir(x)
        pog = matica.get(c) or []
        forme = oblici.get(x, [])
        uc = sum(freq.get(o, 0) or freq.get(o.lower(), 0) or 0 for o in forme)
        zapis = {'x': x, 'oblika': n, 'primeri': primeri, 'ucestalost_oblika': uc, 'matica': (max(pog, key=len) if pog else ''), 'matica_zapisa': len(pog)}
        if pog: A.append(zapis)
        elif uc >= 10: B.append(zapis)
        else: C.append(zapis)
    def pisi(ime, naslov, lista, predlog, kolone):
        with open(os.path.join(IZLAZ, ime), 'w', encoding='utf-8') as f:
            f.write(f'# {naslov}\n\n> {predlog}\n> Napravljeno skriptom `scripts/sj5-razvrstaj-matica.py`; ništa nije menjano u podacima. Osnova: {len(lista)}.\n\n')
            f.write('| ' + ' | '.join(kolone) + ' | odluka |\n|' + '---|' * (len(kolone) + 1) + '\n')
            for z in lista:
                vr = [z['x'], str(z['oblika']), z['primeri'], str(z['ucestalost_oblika'])]
                if 'Matica (OCR)' in kolone: vr.append(z['matica'].replace('|', '/'))
                f.write('| ' + ' | '.join(vr) + ' | |\n')
    pisi('A-matica-ima.md', 'A – Matica IMA osnovu', sorted(A, key=lambda z: -z['ucestalost_oblika']),
         'Predlog: dodati osnovu u rečnik sa objašnjenjem napisanim svojim rečima (ne prepisom Matice).',
         ['X', 'oblika', 'primeri', 'učestalost oblika', 'Matica (OCR)'])
    pisi('B-zivi-oblici.md', 'B – Matica NEMA osnovu, oblici žive u korpusu (učestalost ≥ 10)', sorted(B, key=lambda z: -z['ucestalost_oblika']),
         'Predlog: prepisati objašnjenje oblika da kaže šta znači, bez upućivanja na osnovu; osnova se ne dodaje.',
         ['X', 'oblika', 'primeri', 'učestalost oblika'])
    pisi('C-bez-traga.md', 'C – Matica NEMA osnovu, oblici bez učestalosti', sorted(C, key=lambda z: -z['oblika']),
         'Predlog: brisanje oblika iz rečnika (ili ostaviti) – odluka vlasnice, ništa se ne briše bez naredbe.',
         ['X', 'oblika', 'primeri', 'učestalost oblika'])
    json.dump({'A': len(A), 'B': len(B), 'C': len(C), 'oblika': {'A': sum(z['oblika'] for z in A), 'B': sum(z['oblika'] for z in B), 'C': sum(z['oblika'] for z in C)}},
              open(os.path.join(IZLAZ, 'pregled.json'), 'w'), indent=1)
    print(f'A (Matica ima): {len(A)} osnova / {sum(z["oblika"] for z in A)} oblika · B (žive): {len(B)} / {sum(z["oblika"] for z in B)} · C (bez traga): {len(C)} / {sum(z["oblika"] for z in C)}')

if __name__ == '__main__':
    main()
