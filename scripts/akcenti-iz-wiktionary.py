#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AKCENTI IZ WIKTIONARY-JA (istraživanje za rime po akcentu, 04.10.2026, zahtev vlasnice).

Izvor: kaikki.org izvod engleskog Wiktionary-ja, deo „Serbo-Croatian" (CC BY-SA – ista licenca kao Vikirečnik,
dozvoljena uz navođenje izvora; v. globalni CLAUDE.md „TUĐI REČNICI"). Odrednice nose akcenat (telèvīzor).
Most do naših oblika: srLex (oblik → osnova).

Izlaz: AUDIT/akcenti/akcenti-osnove.json  {osnova: {"akc": akcentovan zapis, "slog": redni broj naglašenog sloga od KRAJA (1 = poslednji)}}
       AUDIT/akcenti/pokrivenost.md       brojevi
Ništa se ne menja na sajtu.
"""
import json, os, gzip, unicodedata, re, collections
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser('~/Literatura/wiktionary/kaikki-sh.jsonl')
IZ = os.path.join(K, 'AUDIT/akcenti'); os.makedirs(IZ, exist_ok=True)
STRESS = {'̀', '́', '̏', '̑'}   # kratkouzlazni, dugouzlazni, kratkosilazni, dugosilazni
VOK = set('aeiou')
def ocisti(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))
def naglasen_slog_od_kraja(akc):
    """Vraća (broj slogova, redni broj naglašenog od kraja) ili None. Slogovi = samoglasnici (+ slogotvorno r između suglasnika, grubo)."""
    d = unicodedata.normalize('NFD', akc.lower())
    slogovi = []   # lista (indeks_slova, naglasen)
    i = 0; base = ''
    while i < len(d):
        c = d[i]; j = i + 1; marks = set()
        while j < len(d) and unicodedata.combining(d[j]): marks.add(d[j]); j += 1
        if c in VOK or (c == 'r' and marks & (STRESS | {'̄'})):
            slogovi.append('uzlazni' if marks & {'\u0300', '\u0301'} else ('silazni' if marks & {'\u030f', '\u0311'} else ''))
        i = j
    if not slogovi or not any(slogovi): return None
    n = len(slogovi); poz = max(k for k, s in enumerate(slogovi) if s)
    return n, n - poz, slogovi[poz]
akc = {}; pos_count = collections.Counter(); bez = 0; ukupno = 0
with open(SRC, encoding='utf-8') as f:
    for line in f:
        e = json.loads(line); ukupno += 1
        w = e.get('word', '')
        if not re.fullmatch(r"[A-Za-zčćžšđČĆŽŠĐ]+", w): continue
        kan = next((fm['form'] for fm in e.get('forms', []) if 'canonical' in fm.get('tags', [])), None)
        if not kan: bez += 1; continue
        r = naglasen_slog_od_kraja(kan)
        if not r: bez += 1; continue
        n, od_kraja, tip = r
        key = w.lower()
        if key not in akc: akc[key] = {'akc': kan, 'slogova': n, 'od_kraja': od_kraja, 'tip': tip, 'pos': e.get('pos')}
        pos_count[e.get('pos')] += 1
json.dump(akc, open(os.path.join(IZ, 'akcenti-osnove.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
# most: srLex oblik → osnova
reci = [l for l in open(os.path.join(K, 'public/reci.txt'), encoding='utf-8').read().split('\n') if l]
R = set(reci); lema = {}
with gzip.open(os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz'), 'rt', encoding='utf-8') as f:
    for l in f:
        p = l.split('\t')
        if len(p) > 2 and p[0] in R and p[0] not in lema: lema[p[0]] = p[1]
leme = set(lema.values())
leme_sa_akc = {l for l in leme if l.lower() in akc}
oblici_sa_akc = sum(1 for w in reci if lema.get(w, w).lower() in akc or w.lower() in akc)
direktno = sum(1 for w in reci if w.lower() in akc)
od_kraja = collections.Counter(v['od_kraja'] for v in akc.values())
with open(os.path.join(IZ, 'pokrivenost.md'), 'w', encoding='utf-8') as f:
    f.write(f"""# Akcenti iz Wiktionary-ja – pokrivenost (04.10.2026)

| Šta | Koliko |
|---|---|
| zapisa u izvodu (sve vrste) | {ukupno} |
| osnova sa akcentom | {len(akc)} |
| zapisa bez upotrebljivog akcenta | {bez} |
| naših oblika u `reci.txt` | {len(reci)} |
| naših oblika koje srLex zna da svede na osnovu | {len(lema)} ({len(lema)/len(reci):.0%}) |
| različitih osnova naših oblika | {len(leme)} |
| od toga osnova sa akcentom u Wiktionary-ju | {len(leme_sa_akc)} ({len(leme_sa_akc)/max(1,len(leme)):.0%}) |
| **naših oblika koji dobijaju akcenat** (preko osnove ili direktno) | **{oblici_sa_akc} ({oblici_sa_akc/len(reci):.0%})** |
| naših oblika koji su sami odrednica sa akcentom | {direktno} |

Mesto akcenta od kraja reči (1 = poslednji slog): {dict(sorted(od_kraja.items()))}
""")
print(open(os.path.join(IZ, 'pokrivenost.md'), encoding='utf-8').read())
for w in ['televizor', 'revizor', 'ambasador', 'ventilator', 'sloboda', 'voda', 'loboda', 'rima', 'štima', 'stvar', 'ljubav', 'nada', 'iznenada', 'motor', 'direktor', 'sunce', 'pesma']:
    print(w, '→', akc.get(w))
