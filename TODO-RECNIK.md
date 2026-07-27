# TO-DO: temeljna provera rečnika po zvaničnoj literaturi

> Zadatak postavila vlasnica 27.07.2026.
> **Izvor istine je isključivo zvanična gramatika i pravopis srpskog jezika** —
> literatura koja se koristi u školama i na fakultetima u Republici Srbiji.
> `reci.txt` i `definicije.json` su PREDMET provere, ne merilo.
> Detalji pravila: `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`, pravilo 3b.

---

## Glavni zadatak

**Proći reč po reč kroz `public/reci.txt` (272.780 reči) i po zvaničnoj
literaturi utvrditi šta je ispravno a šta nije. Rezultat se prvo pokazuje
vlasnici na odobrenje. Ništa se ne briše ni ne dodaje bez njene reči.**

## Podela na dva tipa pitanja

| Tip | Primer | Ko odlučuje | Status |
|---|---|---|---|
| **Gramatičko** — da li je oblik ispravno izveden | *licu* od *lice* | pravila iz gramatike | mogu automatski, po pravilima |
| **Leksičko** — da li reč uopšte postoji | *steža*, *bajbok* | Rečnik Matice srpske | **BLOKIRANO** — vidi dole |

## Blokada koju treba rešiti

Za leksička pitanja potreban je **Rečnik srpskoga jezika Matice srpske** u
mašinski čitljivom obliku. Bez njega se ne sme tvrditi da reč postoji ili ne
postoji. Mogućnosti:
- nabaviti digitalno izdanje / pristup
- koristiti Vikirečnik kao delimičan izvor (već imamo `sinonimi.json` odatle)
- vlasnica ručno presuđuje sporne slučajeve

**Dok se ovo ne reši, leksička pitanja idu vlasnici na odluku.**

## Redosled rada

- [ ] 1. Napraviti mašinski zapis pravila iz zvanične gramatike:
      deklinacije (tri vrste), konjugacije (vrste glagola), glasovne promene
      (nepostojano A, sibilarizacija, palatalizacija, jotovanje, jednačenja)
- [ ] 2. Razvrstati rečnik po vrstama reči **po gramatici**, ne po završetku
- [ ] 3. Za svaku reč proveriti da li je oblik ispravno izveden po pravilima
- [ ] 4. Rezultat dati vlasnici **u tabeli** (reč | šta je sporno | predlog),
      nikako u rečenicama
- [ ] 5. Tek po njenom odobrenju menjati `reci.txt`

## Sporno / čeka odluku vlasnice

- [ ] `steža`, `maštav`, `teom` — nepoznate reči, proveriti u rečniku
- [ ] `stoljetni`, `iskorištavanje`, `shvaćanje` — hrvatski oblici, ne ijekavica
- [ ] `pterosaurus` — latinski oblik; srpski bi bio *pterosaur*
- [ ] `stodvadeset`, `dvestotom` — brojevi pisani sastavljeno
- [ ] `bajbok` — potvrđeno da postoji (žargonski: zatvor), ostaje

## Rešeno

- [x] `njakam`, `njakaš` — ne postoje, sklonjeno (26.07.2026)
- [x] `njaka` — ne postoji, sklonjeno (27.07.2026)
- [x] `brstenje` — ispravno, dodato (27.07.2026)
- [x] `aminati` — postoji, ostaje; značenja razdvojena od *aminovati*
- [x] `obrstenje` — ne postoji, nije dodato
- [x] Padeži za *brst* i oblici za *brstiti*/*obrstiti* — dodato

## Zamrznuto do završetka provere

- Predlog padeža za imenice srednjeg roda (`RECNIK-PREDLOG-SREDNJI-ROD.md`)
- Predlog oblika za glagole (`RECNIK-PREDLOG.md`)

Nema smisla dopunjavati rečnik dok se ne zna šta u njemu već ne valja.
