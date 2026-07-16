#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ijekavica čišćenje: briše junk iz reci_jekavica.txt i dodaje definicije pravim rečima/imenima."""
import os, json

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, '..', 'public')

# --- JUNK: fragmenti, tipfeleri, malformirani oblici (nisu prave reči ni imena) ---
JUNK = set("""
amijel amijen arijeta artijem bertje betje bezsjemeno bjeh davorje dijem dijes dijev dje dorje
fijestu gdjeje gijem hadje havijeru hilijer ijeta katje lijeru lijevča litje lje lotje matje
mjenjolici mjenjolika pimijenta pjele prijen rijem rijeć rje sitijem slijedeči terje tijem
tijeri tjeri tovje vasje vdje vijega vijeme vje bjega bjegao čiješ podpredsjednik podpredsjednika
""".split())

# --- DEFINICIJE: prave ijekavske reči + imena/mesta/prezimena ---
DEFS = {
    # gradovi / mesta
    "kijev": "Kijev — glavni grad Ukrajine.",
    "kijeva": "Oblik reči Kijev (glavni grad Ukrajine).",
    "kijevo": "Oblik reči Kijev (glavni grad Ukrajine).",
    "kijevom": "Oblik reči Kijev (glavni grad Ukrajine).",
    "kijevu": "Oblik reči Kijev (glavni grad Ukrajine).",
    "osijek": "Grad u istočnoj Hrvatskoj (Slavonija), na rijeci Dravi.",
    "osječko": "Oblik prideva osječki (koji se odnosi na Osijek).",
    "bijeljinu": "Oblik reči Bijeljina (grad u Bosni i Hercegovini, u Semberiji).",
    "bjelasicom": "Oblik reči Bjelasica (planina u Crnoj Gori).",
    "rivijere": "Oblik reči rivijera (primorski kraj s plažama i letovalištima).",
    "rivijeru": "Oblik reči rivijera (primorski kraj s plažama i letovalištima).",
    "sijera": "Sijera — planinski venac (od španskog „sierra“); npr. Sijera Nevada.",
    "sijere": "Oblik reči sijera (planinski venac).",
    "sijeri": "Oblik reči sijera (planinski venac).",
    "sijeru": "Oblik reči sijera (planinski venac).",
    "riječana": "Oblik reči Riječanin (stanovnik grada Rijeke).",
    # imena i prezimena
    "molijera": "Oblik imena Molijer (francuski komediograf iz 17. vijeka).",
    "ljermontov": "Ljermontov — ruski pjesnik i pisac (Mihail Ljermontov, 19. vijek).",
    "pijer": "Muško ime (francuski oblik imena Petar — Pjer).",
    "pijetro": "Muško ime (italijanski oblik imena Petar — Pjetro).",
    "pjetra": "Oblik imena Pjetar/Pjetro (muško ime).",
    "stjepane": "Oblik imena Stjepan (muško ime).",
    "stjepanom": "Oblik imena Stjepan (muško ime).",
    "stjepanu": "Oblik imena Stjepan (muško ime).",
    "stjepić": "Prezime (Stjepić).",
    "vjekoslav": "Muško ime (Vjekoslav).",
    "vjekoslava": "Oblik imena Vjekoslav (muško ime).",
    "ljeposava": "Žensko ime (Ljeposava).",
    "ljeposave": "Oblik imena Ljeposava (žensko ime).",
    "ljeposavi": "Oblik imena Ljeposava (žensko ime).",
    "đorđijem": "Oblik imena Đorđije (muško ime).",
    "marijen": "Ime (Marijen).",
    "cvijetin": "Muško ime i prezime (Cvijetin).",
    "cvijetića": "Oblik prezimena Cvijetić.",
    "bijelić": "Prezime (Bijelić).",
    "bijelića": "Oblik prezimena Bijelić.",
    "bijelićem": "Oblik prezimena Bijelić.",
    "bjelić": "Prezime (Bjelić).",
    "bjelića": "Oblik prezimena Bjelić.",
    "bjelović": "Prezime (Bjelović).",
    "bjelošević": "Prezime (Bjelošević).",
    "bjegović": "Prezime (Bjegović).",
    "bjeković": "Prezime (Bjeković).",
    "liješević": "Prezime (Liješević).",
    "lješević": "Prezime (Lješević).",
    "salijević": "Prezime (Salijević).",
    "pijević": "Prezime (Pijević).",
    "bjelica": "Prezime (Bjelica).",
    "bjelice": "Oblik prezimena Bjelica.",
    "bjelici": "Oblik prezimena Bjelica.",
    "bjelicom": "Oblik prezimena Bjelica.",
    "bjelicu": "Oblik prezimena Bjelica.",
    "bjelka": "Bjelka — životinja bijele boje (npr. bijela kobila ili koka); takođe žensko ime.",
    # prave ijekavske reči i oblici
    "bijelcem": "Oblik reči bijelac (čovjek bijele puti; ijekavski oblik reči belac).",
    "bijelcu": "Oblik reči bijelac (čovjek bijele puti; ijekavski oblik reči belac).",
    "bijelijem": "Stariji oblik reči bijelim (od bijeli — beo).",
    "bjelini": "Oblik reči bjelina (bjelina — belina, bijela boja; ijekavski).",
    "bjelinu": "Oblik reči bjelina (bjelina — belina, bijela boja; ijekavski).",
    "bijen": "Trpni oblik glagola biti (u smislu: udaran) — pretučen, izudaran.",
    "bijene": "Oblik reči bijen (pretučen, izudaran).",
    "bijeni": "Oblik reči bijen (pretučen, izudaran).",
    "bjehu": "Stariji (arhaični) oblik glagola biti — bijahu, bjehu (oni su bili).",
    "bjesmo": "Stariji oblik glagola biti — bijasmo, bjesmo (mi smo bili).",
    "bjesovima": "Oblik reči bijes (bijes — bes; ijekavski) — silnim naletima besa.",
    "brijete": "Oblik glagola brijati (ijekavski) — vi brijete, uklanjate dlačice britvom.",
    "cvijeti": "Oblik reči cvijet (cvijet — cvet; ijekavski) — cvjetovi.",
    "djevo": "Oblik reči djeva (djevojka, mlada žena; ijekavski) — obraćanje: o djevo!",
    "grijem": "Oblik glagola grijati (grejati; ijekavski) — ja grijem, dajem toplotu.",
    "hijeni": "Oblik reči hijena (divlja životinja nalik psu koja se hrani strvinom).",
    "lijem": "Oblik glagola liti/lijevati (ijekavski) — ja lijem, sipam tečnost.",
    "liješće": "Liješće — leskov šumarak, mjesto gdje raste lijeska (lešnik).",
    "niječe": "Oblik glagola nijekati (poricati; ijekavski) — on niječe, odriče.",
    "odjeci": "Oblik reči odjek (jeka, zvuk koji se vraća) — odjeci, jeke.",
    "salijem": "Oblik glagola saliti/salijevati (ijekavski) — ja salijem, izlivam u kalup.",
    "tijeka": "Oblik reči tijek (tok; ijekavski) — u tijeka, tokom.",
    "vjeke": "Oblik reči vijek (vijek — vek; ijekavski) — vjekove, duge periode.",
}

def main():
    # 1) briši junk iz reci_jekavica.txt
    p = os.path.join(PUB, 'reci_jekavica.txt')
    words = [w for w in open(p, encoding='utf-8').read().split('\n') if w]
    kept = [w for w in words if w not in JUNK]
    removed = len(words) - len(kept)
    with open(p, 'w', encoding='utf-8') as f:
        f.write('\n'.join(kept) + '\n')

    # 2) dodaj definicije (samo nove)
    dp = os.path.join(PUB, 'definicije.json')
    defs = json.load(open(dp, encoding='utf-8'))
    added = 0
    for w, d in DEFS.items():
        if w not in defs:
            defs[w] = d
            added += 1
    with open(dp, 'w', encoding='utf-8') as f:
        json.dump(defs, f, ensure_ascii=False, indent=2)

    print(f"reci_jekavica.txt: obrisano {removed} junk reči (ostalo {len(kept)})")
    print(f"definicije.json: dodato {added} novih definicija (ukupno {len(defs)})")

if __name__ == '__main__':
    main()
