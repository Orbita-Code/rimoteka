# TO-DO: temeljna provera rečnika po zvaničnoj literaturi

> Zadatak postavila vlasnica 27.07.2026.
> **Izvor istine je isključivo zvanična gramatika i pravopis srpskog jezika** —
> literatura koja se koristi u školama i na fakultetima u Republici Srbiji.
> `reci.txt` i `definicije.json` su PREDMET provere, ne merilo.
> Detalji pravila: `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`, pravilo 3b.

---

## ⏸ PREGLED SPISKA 01b — UKINUT RUČNI PREGLED (16.08.2026)

Vlasnica je 16.08.2026. odbacila ručni pregled 20.021 reda (`01b-za-pregled.md`):
„ja nisam mašina da pregledam tolike reči — nađi mi bolje rešenje". Mašinska
trijaža je urađena istog dana (`01b-ARHIVA-trijaza.md`):

| Kanta | Koliko | Ishod |
|---|---|---|
| OCR šum (duplo slovo, bn/bl) | 759 | ispravljeno mašinski; **190 dokazanih su SVE već u rečniku** (duplikati); 569 nedokazanih — arhiva, NE dodaje se (pravilo: bez nagađanja) |
| Već u rečniku | 67 | duplikat |
| Zastarelo/narodno po Matici | 111 | odbačeno — pravopis, ne govor |
| Retke samostalne reči | 19.084 | **ARHIVA** — vadi se po TEMI kad vlasnica zatraži |

Prava vrednost umesto trpanja OCR spiska: **sistematska pokrivenost oblika**
(primer: „znanstveni" je falio, „zdravstveni" postojao). Spisak
`08-pridevski-i-za-dodavanje.md` — **131** određeni pridevski oblik na -i koje
Matica potvrđuje, a mi nemamo. **16.08: vlasnica prošla spisak — 96 UPISANO
u rečnik (280.433 reči), 35+3 izbačeno njenim pregledom.** Iz „odbijenih" —
59 reči sa slova A–B UPISANO (280.478), `boljeli` izbačena kao ijekavica.
Ona nastavlja po slovima; mi upisujemo proverene grupe istim postupkom.

Uz to čekaju, po njenom zahtevu od 02.08.2026, celi tematski krugovi kojih u
rečniku nema ili su nepotpuni:

| Krug | Šta obuhvata |
|---|---|
| praznici i slave | Aranđelovdan, Nikoljdan, Cveti, Zadušnice, Božić, Vaskrs, Bogojavljanje, svinjokolj, Đurđevdan… |
| države i gradovi | najpoznatije zemlje sveta i njihovi gradovi |
| biblijski pojmovi | Juda, Isus, jevanđelje, devica, apostol… |
| planete | proveriti da li ih imamo sve, uključujući Pluton |
| kućni i kuhinjski aparati | plus posuđe i escajg |
| saobraćaj i prevozna sredstva | drumski, rečni, pomorski, vazdušni; od bicikla do lokomotive i podmornice |
| nauke | arheologija, astrofizika, bioenergetika i ostale |

**Vlastita imena idu VELIKIM početnim slovom** (`Beograd`, `Saturn`, `Isus`) —
odluka vlasnice 02.08.2026. Razlog nije pravopisna doslednost nego beležnica: ko
klikne na ponuđenu rimu, ona mu uđe u stih, pa bi `beograd` ostavio grešku u
gotovoj pesmi. Traži izmenu u `app.js` — poređenje bez razlike u veličini slova,
prikaz pravog zapisa.

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

## Izvori — provereno 27.07.2026.

### Rečnik srpskoga jezika, Matica srpska (2011) — GLAVNI IZVOR
**Digitalno izdanje koje koristimo:**
https://archive.org/details/recnik-srpskoga-jezika-2011

~85.000 odrednica. Koristi se za proveru **da li reč postoji**. Objašnjenja se
NE prepisuju — pišemo svoja, samo proveravamo da znače isto.

**Ograničenje:** oznake `покр.` / `заст.` / `дијал.` su štampane kurzivom i
prepoznavanje teksta ih je uništilo (0, 3 i 1 čitljiva pojava u celom rečniku).
Pokrajinsko, zastarelo i hrvatsko se iz njega **ne može automatski izbaciti** —
to ostaje na vlasnici.

### srLex 1.3 — morfološki rečnik, slobodan i mašinski čitljiv
- **169.328 lema, 6.905.941 oblik**
- svaki oblik ima: reč, lemu, **vrstu reči**, **padež/lice/rod/broj**, frekvenciju
- licenca **CC BY-SA 4.0**, besplatno preuzimanje bez registracije (54 MB)
- `http://hdl.handle.net/11356/1233` (CLARIN.SI, Institut Jožef Štefan / ReLDI)
- **Naš `frekvencija.json` je izvučen upravo iz srLex-a — uzeti su samo brojevi,
  a gramatičke oznake su ostale neiskorišćene.**

**VAŽNA RAZLIKA:** srLex je OPISAN, ne NORMATIVAN.
- „da li je `licu` ispravan dativ od `lice`" -> srLex odgovara pouzdano
- „da li se piše `iskorišćavanje` ili `iskorištavanje`" -> odgovara Pravopis

**LICENCA:** korišćenje srLex-a samo za PROVERU našeg rečnika ne stvara obaveze.
Prepisivanje njegovih oblika u `reci.txt` verovatno povlači CC BY-SA i na naš
rečnik. **Odluka je na vlasnici.**

## HITNO: `frekvencija.json` je pogrešno izvučen (nađeno 27.07.2026)

U srLex-u se **isti oblik pojavljuje više puta**, sa različitim gramatičkim
oznakama — `voda` je i *voda* (tečnost) i **genitiv množine od *vod*** (vojna
jedinica). Onaj ko je pravio `frekvencija.json` je **prepisivao umesto da
sabira**, pa je za svaki oblik ostalo poslednje pročitano čitanje, često
najređe.

Posledice, merljive:
- `voda` = 876 (treba desetine hiljada)
- `veliki` = 34, `dva` = 9 — besmisleno
- `hiljada` i `hiljadu` uopšte nema
- fajl ima 208.687 unosa, srLex 6.905.941 oblik

**Rangiranje rima na sajtu je zbog ovoga delimično pogrešno.** Popravka:
ponovo izvući iz srLex-a i **sabrati** frekvencije po obliku.

- [ ] Ponovo izvući `frekvencija.json` iz srLex-a, uz sabiranje po obliku

## Ocena srLex-a (provereno 27.07.2026)

Vlasnica je posumnjala da srLex nije pouzdan jer su ga radili van Srbije.
Provereno:

- **Ko:** ReLDI projekat — finansirala Švajcarska (Univerzitet u Cirihu),
  radili Institut Jožef Štefan (Ljubljana) **i Filološki fakultet u Beogradu**.
  Materijal je srWaC, korpus skinut sa **`.rs` domena**.
- **Hrvatski ostatak — izmereno na 16 jednoznačno hrvatskih reči:**
  12 ih uopšte nema (*tisuća, tjedan, kolodvor, zrakoplov, nogomet, glazba,
  tvrtka, kruh, povijest, unatoč, tjedni, općina*); 4 postoje ali 30-60 puta
  ređe od srpskog parnjaka (*vlak* 133 : *voz* 4.101; *kazalište* 299 :
  *pozorište* 9.581; *shvaćanje* 52 : *shvatanje* 3.022). *otok* 1.584 je
  ispravna srpska reč (oteklina).
- **Zaključak:** nije hrvatski materijal prelepljen kao srpski, ali jeste
  OPISAN resurs iz veb teksta sa hrvatskim ostatkom.

**srLex NE SME biti autoritet** za pitanje šta je pravilan srpski — to bi bila
ista kružnost, samo šira. Sme se koristiti samo za:
1. popravku frekvencija (vidi gore),
2. gramatičke oznake kao **trag**, nikad kao dokaz.

**Autoritet ostaje Rečnik Matice srpske (link gore) ili vlasnica.**

## Redosled rada

- [ ] 0. **Odluka vlasnice: preuzeti srLex 1.3 i koristiti ga za proveru?**
      (vidi napomenu o licenci gore)
- [ ] 1. Napraviti mašinski zapis pravila iz zvanične gramatike:
      deklinacije (tri vrste), konjugacije (vrste glagola), glasovne promene
      (nepostojano A, sibilarizacija, palatalizacija, jotovanje, jednačenja)
- [ ] 2. Razvrstati rečnik po vrstama reči **po gramatici**, ne po završetku
- [ ] 3. Za svaku reč proveriti da li je oblik ispravno izveden po pravilima
- [ ] 4. Rezultat dati vlasnici **u tabeli** (reč | šta je sporno | predlog),
      nikako u rečenicama
- [ ] 5. Tek po njenom odobrenju menjati `reci.txt`

## Sporno / čeka odluku vlasnice

- [ ] **Parovi „ista reč, dva pisma" (č/ć)** — nađeno 16.08.2026. Izbačeni su
      `većera` i `većeras` (odluka vlasnice: „rečnik prati pravopis, ne govor").
      Grubo skeniranje daje ~180 parova gde obe č/ć varijante postoje, ali je
      većina lažnih pozitiva u oba smera (`braća/brače`, `bića/biče`, prezimena).
      Treba prolaz kroz Maticu reč po reč: par gde JEDNA varijanta nije u Matici,
      a definicija druge kaže „oblik reči X" — isti postupak kao `većera`.
      Čeka zeleno svetlo vlasnice za prolaz.
- [ ] **Određeni oblici prideva (-i) nisu sistematski pokriveni** — nađeno 16.08.2026.
      Igra je odbila `znanstveni` („Ta reč nije u rečniku"), iako rečnik ima
      `znanstven`, `znanstvena`, `znanstveno`, a neke određene oblike ipak ima
      (`zdravstveni` sa frekvencijom 8.100). `znanstveni` je ubacen istog dana
      (Matica: `знанствен, -а, -о — који се односи на знаност`; objašnjenje naše).
      Gruba provera: među osnovama koje imaju i ženski (-a) i srednji (-o) oblik,
      za ~620 ne postoji određeni -i oblik — među njima su i lažni kandidati
      (prisvojni tipa `anin`, `apostolov` ga ne grade isto), pa spisak traži
      pregled pre ikakvog upisa. Isti problem verovatno važi i za druge padeže
      (`znanstvenog`, `znanstvenom` takođe nema).
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

- Predlog padeža za imenice srednjeg roda (`docs/recnik/RECNIK-PREDLOG-SREDNJI-ROD.md`)
- Predlog oblika za glagole (`docs/recnik/RECNIK-PREDLOG.md`)

Nema smisla dopunjavati rečnik dok se ne zna šta u njemu već ne valja.
