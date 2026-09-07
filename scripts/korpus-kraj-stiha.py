#!/usr/bin/env python3
"""KOJE REČI STOJE NA KRAJU STIHA U SRPSKIM PESMAMA (istraga za vlasnicu, 08.09.2026).

Pitanje vlasnice: „Šta se najčešće u srpskim pesmama koristi od reči koje se rimuju? Te reči
moraju da imaju svoje strane." Do sada su strane reči birane po učestalosti u VEB-KORPUSU
(srLex — novine, sajtovi), pa su stranu dobile „kurs", „već", „vrh", „krv", a to nisu reči
kojima se završava stih.

Ovo skida pesme iz javnog vlasništva sa Vikizvornika (sr.wikisource.org — Zmaj, Dučić,
Jakšić, Šantić, Rakić, Kostić…, plus narodne pesme) i broji POSLEDNJU REČ SVAKOG STIHA.
Rezultat: `AUDIT/analiza/kraj-stiha.json` (reč → broj stihova) + ispis prvih 150.
Licenca: dela su u javnom vlasništvu (autori umrli pre 70+ godina); brojimo reči, ne
prepisujemo tekst (globalno pravilo o tuđim izvorima).

Pokretanje: python3 scripts/korpus-kraj-stiha.py [dodatne kategorije…]
"""
import json, re, sys, time, os, urllib.request, urllib.parse
from collections import Counter

API = 'https://sr.wikisource.org/w/api.php'
UA = {'User-Agent': 'Rimoteka-istraga/1.0 (eureka@rimoteka.com)'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IZLAZ = os.path.join(ROOT, 'AUDIT', 'analiza')

def api(**params):
    params['format'] = 'json'
    u = API + '?' + urllib.parse.urlencode(params)
    for pokusaj in range(3):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read())
        except Exception as e:
            time.sleep(2)
    return {}

def kategorije():
    out = []
    for prefix in ('Песме', 'Поезија', 'Збирке песама'):
        cont = None
        while True:
            d = api(action='query', list='allcategories', acprefix=prefix, aclimit=500, **({'accontinue': cont} if cont else {}))
            out += [c['*'] for c in d.get('query', {}).get('allcategories', [])]
            cont = d.get('continue', {}).get('accontinue')
            if not cont:
                break
    return out

def clanovi(kat):
    out, cont = [], None
    while True:
        d = api(action='query', list='categorymembers', cmtitle='Категорија:' + kat, cmlimit=500, cmnamespace=0, **({'cmcontinue': cont} if cont else {}))
        out += [m['title'] for m in d.get('query', {}).get('categorymembers', [])]
        cont = d.get('continue', {}).get('cmcontinue')
        if not cont:
            break
    return out

def tekst(naslov):
    d = api(action='parse', page=naslov, prop='wikitext')
    return d.get('parse', {}).get('wikitext', {}).get('*', '')

CIR = {'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z','и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c','ч':'č','џ':'dž','ш':'š'}
def lat(s):
    return ''.join(CIR.get(c, c) for c in s.lower())

def poslednje_reci(wikitext):
    t = re.sub(r'<ref[^>]*>.*?</ref>', '', wikitext, flags=re.S)
    t = re.sub(r'\{\{[^}]*\}\}|\[\[[^\]]*\]\]|<[^>]+>|\'\'+|^[=#*:;].*$', '', t, flags=re.M)
    out = []
    for line in t.split('\n'):
        line = line.strip().rstrip(' .,;:!?…„“"»«)—–-')
        if not line or len(line) > 90:          # prozni pasus, ne stih
            continue
        m = re.search(r'([А-Яа-яЂђЉљЊњЋћЏџЈј]+)$', line)
        if m:
            w = lat(m.group(1))
            if len(w) >= 2:
                out.append(w)
    return out

def main():
    os.makedirs(IZLAZ, exist_ok=True)
    kats = [k for k in kategorije() if not re.search(r'кад се|на |код |при |уз |у колу|о [А-Я]|против|обичај|Бадње', k)] + sys.argv[1:]
    print('kategorija:', len(kats))
    brojac = Counter(); pesama = 0; stihova = 0; videne = set()
    for k in kats:
        naslovi = clanovi(k)
        print(f'  {k}: {len(naslovi)} strana')
        for n in naslovi:
            if n in videne or n.startswith(('Категорија:', 'Аутор:')):
                continue
            videne.add(n)
            reci = poslednje_reci(tekst(n))
            if len(reci) < 4:
                continue
            pesama += 1; stihova += len(reci); brojac.update(reci)
            time.sleep(0.05)
    with open(os.path.join(IZLAZ, 'kraj-stiha.json'), 'w', encoding='utf-8') as f:
        json.dump({'pesama': pesama, 'stihova': stihova, 'kategorija': kats, 'reci': dict(brojac.most_common())}, f, ensure_ascii=False, indent=0)
    print(f'\npesama {pesama} · stihova {stihova} · različitih završnih reči {len(brojac)}')
    print('prvih 150:', ', '.join(f'{w} {n}' for w, n in brojac.most_common(150)))

if __name__ == '__main__':
    main()
