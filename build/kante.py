#!/usr/bin/env python3
"""
REČNIK PO KANTAMA – prva rima pre nego što stigne ceo rečnik (nalaz PF-1, audit 22.09.2026).

Zašto: na sporoj vezi (1,6 Mbps) `reci.txt` (666 KB gzip) stiže za ~5 s, pa čovek koji je već
ukucao reč čeka 7 s na prvu rimu. Sve rime za jednu reč dele njen ZAVRŠETAK: ključ prave rime
(`rhyme_key`) je sufiks reči, isto i ključ završnog sloga i „šire rime" – pa je za jednu reč
dovoljna kanta reči koje se završavaju na ista DVA slova. Kanta ima u proseku par stotina
reči (najveće par desetina hiljada), dakle par kilobajta umesto 666.

Šta se piše: `public/kante/<xy>.txt` – jedan red po reči: `reč<TAB>učestalost<TAB>M`
(učestalost prazna kad je ispod praga 10; `M` = odrednica u Rečniku Matice srpske; `J` = jekavski oblik iz `jekavski.json`).
Redosled: prvo reči iz `reci.txt` (ekavski), pa iz `reci_jekavica.txt`, u istom redosledu kao u
fajlovima – da rangiranje reči bez učestalosti (po rednom broju) da ISTI redosled kao ceo rečnik.
Plus `public/kante/_manifest.json` (spisak kanti i brojevi) po kome `osvezi-verzije-podataka.mjs`
računa `?v=` (KANTE_V u `app.js`).

Ime kante: poslednja dva mala slova reči; jednoslovna reč ide u kantu od jednog slova. Reči
sa velikim slovom (Beograd) idu po malim slovima. Isto pravilo je u `app.js` (`imeKante`).

Pokretanje: python3 build/kante.py   (posle svake izmene rečnika, pre osvezi-verzije-podataka.mjs)
"""
import json, os, sys, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
IZLAZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(PUB, 'kante')
PRAG = 10   # isti prag kao u app.js (`loadExtras`): ispod 10 pojava = nema signala

def ime_kante(w):
    m = w.lower()
    return m[-2:] if len(m) >= 2 else m

def main():
    ek = [l for l in open(os.path.join(PUB, 'reci.txt'), encoding='utf-8').read().split('\n') if l]
    jek = [l for l in open(os.path.join(PUB, 'reci_jekavica.txt'), encoding='utf-8').read().split('\n') if l]
    u_ek = set(ek)
    jek = [w for w in jek if w not in u_ek]   # isto pravilo kao `loadDict` (SJ-1)
    freq = json.load(open(os.path.join(PUB, 'frekvencija.json'), encoding='utf-8'))
    matica = set(json.load(open(os.path.join(PUB, 'matica.json'), encoding='utf-8')))
    jekavski = set(json.load(open(os.path.join(PUB, 'jekavski.json'), encoding='utf-8')))   # isti filter kao `JEKAVSKI` u app.js

    kante = {}
    def dodaj(w):
        m = w.lower()
        f = freq.get(w) or freq.get(m) or 0
        fs = str(f) if f >= PRAG else ''
        ms = ('M' if (w in matica or m in matica) else '') + ('J' if m in jekavski else '')
        kante.setdefault(ime_kante(w), []).append(f'{w}\t{fs}\t{ms}')
    for w in ek: dodaj(w)
    granica = {k: len(v) for k, v in kante.items()}   # koliko je ekavskih u svakoj kanti (jekStart)
    for w in jek: dodaj(w)

    os.makedirs(IZLAZ, exist_ok=True)
    for f in os.listdir(IZLAZ):
        if f.endswith('.txt'): os.remove(os.path.join(IZLAZ, f))
    manifest = {}
    ukupno = 0
    for k, redovi in sorted(kante.items()):
        put = os.path.join(IZLAZ, k + '.txt')
        telo = str(granica.get(k, len(redovi))) + '\n' + '\n'.join(redovi) + '\n'   # prvi red = jekStart
        with open(put, 'w', encoding='utf-8') as f: f.write(telo)
        manifest[k] = len(redovi); ukupno += len(redovi)
    with open(os.path.join(IZLAZ, '_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump({'kanti': len(manifest), 'reci': ukupno, 'kante': manifest}, f, ensure_ascii=False, sort_keys=True)
    najvece = sorted(manifest.items(), key=lambda x: -x[1])[:5]
    velicine = sorted(os.path.getsize(os.path.join(IZLAZ, k + '.txt')) for k in manifest)
    print(f'Kanti: {len(manifest)} · reči: {ukupno} · najveće: {najvece} · najveći fajl: {velicine[-1]//1024} KB · medijana: {velicine[len(velicine)//2]//1024} KB')

if __name__ == '__main__':
    main()
