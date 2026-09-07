#!/usr/bin/env python3
"""Ocena bazena reči koje igra sme da zada (ulaz: AUDIT/analiza/igra-bazen.json iz test/igra-bazen.mjs).

Za svaku reč: vrsta reči i lema iz srLex-a (~/Literatura/srLex), odrednica i oznake u Rečniku Matice srpske
(~/Literatura/recnik-matice-srpske-2011.txt), hrvatski oblici (spisak leksema), težina (slogovi, dužina).
Izlaz: AUDIT/analiza/igra-bazen.md. Ništa se ne menja u igri – ovo je nalaz za odluku vlasnice.
"""
import json, gzip, os, re, collections
KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(KOREN, 'AUDIT/analiza/igra-bazen.json'), encoding='utf-8'))
reci = [r for r in d['reci'] if r['igra']]
skup = {r['w'].lower() for r in reci}

# --- srLex: oblik -> (lema, vrsta) po najčešćoj upotrebi ---
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')
upotrebe = collections.defaultdict(lambda: collections.Counter())
lema_po = {}
with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        k = red.split('\t')
        if len(k) < 8: continue
        ob = k[0].lower()
        if ob not in skup: continue
        try: n = int(k[6])
        except ValueError: n = 0
        upotrebe[ob][(k[1].lower(), k[4])] += n + 1
vrsta = {}; lema = {}
for ob, c in upotrebe.items():
    (l, v), _ = c.most_common(1)[0]
    vrsta[ob] = v; lema[ob] = l

# --- Matica: odrednice + oznake ---
CIR2LAT = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z','и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c','ч':'č','џ':'dž','ш':'š'}
def lat(r): return ''.join(CIR2LAT.get(z, z) for z in r)
OZNAKE = r'ж|м|с|мн|прил|предл|узв|вез|зам|бр|речца|свр|несвр|-[ајеиоум]|и\s|јек\.|непром'
ODREDNICA = re.compile(r'^([а-шђћчџжљњ]{2,})(?:,\s*[^ ]+)?\s+(?:' + OZNAKE + r')')
ZASTARELE = re.compile(r'\bзаст\b|\bарх\b|\bпокр\b|\bдијал\b|\bварв\b')
matica = {}
with open(os.path.expanduser('~/Literatura/recnik-matice-srpske-2011.txt'), encoding='utf-8') as f:
    for red in f:
        m = ODREDNICA.match(red.strip())
        if not m: continue
        l = lat(m.group(1))
        z = bool(ZASTARELE.search(red[:160]))
        if l not in matica or (matica[l] and not z): matica[l] = z   # ako ima i običnu i zastarelu odrednicu – nije zastarela

# Hrvatske lekseme: kratke se porede CELE (inače „kat" hvata „kategorija", a „prije" hvata „prijem"),
# duže po početku. srLex je nastao iz hrLex-a pa lemu za „ko" piše „tko" – zato se gleda samo OBLIK, ne lema.
HRV_CELE = {'tko','netko','nitko','prije','gdje','ovdje','negdje','dvije','vlak','plin','otok','tijek','tisak','skrb','glede','gumb','kat','zrak','opće','kruh','sudac','rujan','šport','žlica','tjedan','točka','točno','tisuća','mrkva'}
HRV = ['tjedn','tisuć','kolodvor','glazb','tvrtk','sustav','povijes','znanos','obitelj','nazočn','ljekarn','kazališ','uvjet','tvornic','zrakoplov','rajčic','ožujk','ožujak','travanj','travnj','svibanj','svibnj','lipanj','lipnj','srpanj','srpnj','kolovoz','listopad','prosinac','prosinc','siječ','veljač','žlic','nogomet','odvjetni','ravnatelj','gospodarstv','poduzeć','natjecanj','postrojb','prosvjed','priopć','izvješć','vojarn','zapovjedn','tiskovn','sveučiliš','veleposlan','inozem','europ','kemij','kirurg','kršćan','općin','oporb','otoč','prijevoz','promidžb','pristojb','putovnic','rabit','ročišt','skladatelj','sljedeć','sudjel','susjed','tjelesn','trenutačn','ustroj','vijeć','vjerojatn','zdjel','željezn','šalic','glasnogovorn','umirovljen','naklad','znanstven','svjetl','cjelin','cijen','mjesec','mjest','vrijem','uvijek','čovjek','djec','dijet','lijep','vjer','rječ','riječ','svijet','cvijet','tijel','bijel','poslije','htjel','vidjel','živjel','razumjel','smjel']
def hrv(w): return w in HRV_CELE or any(w.startswith(h) for h in HRV)

nepun = {'DET','PRON','ADP','CCONJ','SCONJ','PART','AUX','NUM'}
grupe = collections.defaultdict(list)
for r in reci:
    w = r['w'].lower(); v = vrsta.get(w); l = lema.get(w, w)
    r['vrsta'] = v; r['lema'] = l
    if v is None: grupe['srlex_ne_zna'].append(r)
    elif v in nepun: grupe['nepunoznacne'].append(r)
    elif v == 'PROPN' or r['w'][0].isupper(): grupe['imena'].append(r)
    elif v == 'ADV': grupe['prilozi'].append(r)
    if hrv(w): grupe['hrvatske'].append(r)
    if l in matica and matica[l]: grupe['zastarele'].append(r)
    if l not in matica and w not in matica: grupe['nema_u_matici'].append(r)
    if r['s'] >= 5 or len(w) >= 12: grupe['preteske'].append(r)
    if r['savrsena'] == 0: grupe['bez_savrsene'].append(r)
    if r['f'] < 1000: grupe['retke'].append(r)

vrste = collections.Counter(r.get('vrsta') or '?' for r in reci)
def sp(rs, n=40): return ', '.join(f"{r['w']} ({r['f']:,})".replace(',', '.') for r in sorted(rs, key=lambda x: -x['f'])[:n])
najredja = min(reci, key=lambda r: r['f'])
L = [f"# Bazen reči igre rimovanja – ocena ({len(reci)} reči koje igra sme da zada, {os.popen('date +%Y-%m-%d').read().strip()})", '',
     '> Bazen = 8.000 najčešćih reči iz veb-korpusa (srLex) sa ≥2 sloga i ≥3 slova, bez vulgarnih i ijekavskih, koje imaju bar jednu rimu.',
     f'> Najređa reč u bazenu: „{najredja["w"]}" ({najredja["f"]:,} pojava u korpusu).'.replace(',', '.'), '',
     '## Vrste reči (srLex, najčešća upotreba oblika)', '', '| vrsta | koliko | udeo |', '|---|---|---|',
     *[f'| {v} | {n} | {100*n/len(reci):.1f} % |' for v, n in vrste.most_common()], '',
     '## Nalazi', '', '| # | šta | koliko | primeri (najčešći prvo, broj = pojava u korpusu) |', '|---|---|---|---|',
     f"| 1 | **nepunoznačne reči** (zamenice, veznici, predlozi, rečce, brojevi, pomoćni glagoli) – dete dobije *kojima* ili *njihovih* | {len(grupe['nepunoznacne'])} | {sp(grupe['nepunoznacne'])} |",
     f"| 2 | **prilozi** (odnosno, međutim, takođe…) – teško za rimu | {len(grupe['prilozi'])} | {sp(grupe['prilozi'])} |",
     f"| 3 | **vlastita imena** | {len(grupe['imena'])} | {sp(grupe['imena'])} |",
     f"| 4 | **hrvatski oblici** (spisak leksema + ijekavica) | {len(grupe['hrvatske'])} | {sp(grupe['hrvatske'], 80)} |",
     f"| 5 | **zastarele / pokrajinske po Matici** (lema nosi oznaku заст./арх./покр./дијал.) | {len(grupe['zastarele'])} | {sp(grupe['zastarele'], 60)} |",
     f"| 6 | **leme kojih nema kao odrednice u Matici** (strane reči, skraćenice, greške) | {len(grupe['nema_u_matici'])} | {sp(grupe['nema_u_matici'], 80)} |",
     f"| 7 | **preteške** (≥5 slogova ili ≥12 slova) | {len(grupe['preteske'])} | {sp(grupe['preteske'], 50)} |",
     f"| 8 | **bez savršene rime** (igra prima samo široku, npr. asonancu) | {len(grupe['bez_savrsene'])} | {sp(grupe['bez_savrsene'], 60)} |",
     f"| 9 | **srLex ne zna oblik** | {len(grupe['srlex_ne_zna'])} | {sp(grupe['srlex_ne_zna'], 40)} |",
     f"| 10 | **ređe od 1.000 pojava** u korpusu | {len(grupe['retke'])} | {sp(grupe['retke'], 30)} |", '',
     '## Ceo spisak po grupama (za odluku vlasnice)', '']
for k in ['nepunoznacne', 'prilozi', 'imena', 'hrvatske', 'zastarele', 'nema_u_matici', 'preteske', 'bez_savrsene']:
    L += [f'### {k} ({len(grupe[k])})', '', ', '.join(r['w'] for r in sorted(grupe[k], key=lambda x: -x['f'])), '']
open(os.path.join(KOREN, 'AUDIT/analiza/igra-bazen.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
json.dump({k: [r['w'] for r in v] for k, v in grupe.items()}, open(os.path.join(KOREN, 'AUDIT/analiza/igra-bazen-grupe.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('reči', len(reci), {k: len(v) for k, v in grupe.items()})
