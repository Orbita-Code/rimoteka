# Izvori za rečnik — šta je provereno i šta se od čega može očekivati

> Zapisano 27.07.2026. Ovo je informativni dokument o spoljnim izvorima koje smo
> ispitali. Pravila kako se sa njima postupa su u
> `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`, pravilo 3b.

---

## 1. Rečnik srpskoga jezika, Matica srpska (2011)

### Šta je
Jednotomni rečnik, oko **85.000 odrednica**, 1.561 strana, ćirilica. Urednik
Miroslav Nikolić. Najviši normativni autoritet za pitanje **da li reč postoji**
u srpskom književnom jeziku.

### Gde se koristi

**Digitalno izdanje koje koristimo:**
https://archive.org/details/recnik-srpskoga-jezika-2011

Tu je i **čitanje stranica** (slike su savršene) i **prepoznat tekst** koji
mašina može da obrađuje. Zvanično digitalno izdanje Matice srpske ne postoji —
provereno.

**Kako se koristi:** za proveru **da li reč postoji** i koja je odrednica.
Objašnjenja se **ne prepisuju** — pišemo svoja, samo proveravamo da znače isto.
Tako nema sudara sa autorskim pravima.

### Kvalitet prepoznatog teksta — ključno za rad
Skenirane **slike stranica su savršene**. Ali mašina ne čita slike nego
**tekstualni sloj** izvučen iz njih, i tu je stanje ovakvo:

**Odrednice (masna slova) — TAČNE.**
Provereno na uzorku: `дисај`, `дисајни`, `дисакорд`, `дисакордан`, `дисалица`,
`дисање`, `дисати`, `дисертација` — sve ispravno. Od izvučenih odrednica
**56% se poklopilo sa rečima koje već imamo**, što je nezavisna potvrda da se
odrednice čitaju pouzdano.

**Objašnjenja i primeri (kurziv) — POKVARENI.**
Kurzivno ćirilično **т** se čita kao **ш**, a **г** kao **ћ**:

| U tekstu piše | Treba da bude |
|---|---|
| вазауха | ваздуха |
| шихи шум | тихи шум |
| нарочишим | нарочитим |
| ћрудноћ коша | грудног коша |
| дисаши ошежано | дисати отежано |

**Zato se objašnjenja iz tog rečnika ne koriste** — a i ne treba, naša
objašnjenja pišemo sami.

### Najveće ograničenje
**Oznake uz odrednice se ne mogu pročitati.** Kvalifikatori *покр.*
(pokrajinski), *заст.* (zastarelo), *дијал.* (dijalekatski) štampani su
kurzivom i uništeni su. U celom rečniku nađene su:

| Oznaka | Čitljivih pojava |
|---|---|
| `покр.` | **0** |
| `заст.` | 3 |
| `дијал.` | 1 |

**Posledica:** iz ovog izvora se **ne može automatski izbaciti** pokrajinsko,
zastarelo ni hrvatsko. Poznat primer: `kolodvor` **jeste** odrednica u tom
rečniku, sigurno sa oznakom koja se ne vidi.

### Šta je iz njega izvučeno
13.893 sirove odrednice → 12.445 posle odbacivanja grešaka čitanja → od toga
**6.986 već imamo**, a **5.459 su nove**. Lista je u `RECNIK-NOVE-RECI.md`.

---

## 2. srLex 1.3 — morfološki rečnik

### Šta je
Mašinski čitljiv spisak oblika sa gramatičkim oznakama. Napravljen iz **srWaC**,
korpusa skinutog sa **`.rs` domena**. Radili Institut Jožef Štefan (Ljubljana),
Univerzitet u Cirihu i Filološki fakultet u Beogradu (projekat ReLDI).

Format svakog reda: `oblik · osnovni oblik · gramatička oznaka · vrsta reči ·
broj pojava`.

### Obim — izmereno
| | |
|---|---|
| oblika | **6.905.941** |
| lema | **169.328** |

Po vrstama reči:

| Vrsta | Lema | Napomena |
|---|---|---|
| **vlastita imena** | 63.876 (38%) | šum iz veba — imena ljudi, firmi, mesta |
| pridevi | 51.797 | |
| imenice | 35.315 | |
| prilozi | 31.344 | |
| **glagoli** | **9.653** | **premalo za srpski** |

### Hrvatski sadržaj — izmereno
Hrvatske reči **postoje** u srLex-u, ali kao manjinski ostatak:

| Hrvatska | Pojava | Srpska | Pojava | Odnos |
|---|---|---|---|---|
| kolodvor | 35 | stanica | 17.182 | 491× |
| zrakoplov | 56 | avion | 10.468 | 187× |
| nogomet | 168 | fudbal | 15.007 | 89× |
| shvaćanje | 95 | shvatanje | 4.942 | 52× |
| unatoč | 930 | uprkos | 40.845 | 44× |
| tvrtka | 860 | firma | 30.012 | 35× |
| tisuća | 1.603 | hiljada | **0** | — |

**`hiljada` uopšte nema u srLex-u** — rupa u njihovom resursu.

### ZAŠTO SRLEX NIJE MERODAVAN — najvažnije o njemu

**1. Sadrži hrvatske reči.** Izmereno, vidi tabelu iznad: `kolodvor`,
`zrakoplov`, `nogomet`, `glazba`, `tvrtka`, `vlak`, `kruh`, `kazalište`,
`povijest`, `unatoč`, `tisuća`, `shvaćanje` — sve postoje u njemu, sa stvarnim
brojem pojava.

**2. Sadrži pokrajinske, žargonske i zastarele reči** — jednako kao i
standardne. Nema načina da se razlikuju.

**3. NEMA NIJEDNU NORMATIVNU OZNAKU.** Ovo je ključno. Svaki red sadrži samo:
oblik, osnovni oblik, gramatičku oznaku, vrstu reči i broj pojava. **Nigde ne
piše da li je reč standardna, pokrajinska, zastarela ili hrvatska** — takvog
polja jednostavno nema. srLex beleži *šta se u tekstovima pojavljuje*, a ne
*šta je pravilno*.

**4. Šum iz veba:** 38% su vlastita imena (imena ljudi, firmi, mesta).

**5. Glagoli su slabo pokriveni** — 9.653 leme je malo za srpski jezik.

**Zaključak: srLex se NE SME koristiti kao dokaz da je reč pravilan srpski.**
Sme samo:
- za **frekvencije** (koliko se reč koristi),
- kao **drugi izvor koji potvrđuje postojanje oblika** — ako je reč i u Rečniku
  Matice srpske i u srLex-u, veće je poverenje,
- za **gramatičke oznake kao trag**, nikad kao dokaz.

Ako je reč **samo** u srLex-u, to ne znači ništa o njenoj ispravnosti.

### Kako se iz njega prepoznaje hrvatsko

Postoji parnjak istog resursa za hrvatski (hrLex, 6,4 miliona oblika). Reč se
meri u **oba korpusa** i upoređuje se učestalost, normalizovana po veličini
korpusa (hrvatski je oko 1,4× veći). Reč koja je bar **tri puta češća u
hrvatskom** i ima bar **300 pojava** tamo označava se kao hrvatska.

Primeri (apsolutni broj pojava):

| Reč | srpski | hrvatski | ocena |
|---|---:|---:|---|
| glazba | 210 | 46.243 | hrvatska |
| kruh | 454 | 33.955 | hrvatska |
| val | 697 | 18.609 | hrvatska |
| šalica | 27 | 4.250 | hrvatska |
| tjedan | 0 | 144.855 | hrvatska |
| srce | 31.550 | 102.947 | srpska |
| talas | 7.427 | 0 | srpska |

**Prag od 300 pojava je nužan.** Bez njega su `agrotehničar` (6 pojava u
hrvatskom), `aritmetičar` (1) i `ekskavator` (3) ispadali „hrvatski", iako su
samo retki u oba korpusa.

**Filter nije savršen** — označio je i `sedamdesetak` i `sranje`, koje su obične
srpske reči, samo češće u hrvatskom veb tekstu. Zato je rezultat **oznaka za
pregled, ne presuda**.

### Licenca
CC BY-SA 4.0 (traži navođenje autora i istu licencu za izvedeno delo).
**Vlasnica je 27.07.2026. odlučila da se izvor ne navodi.**

---

## 3. Naš `frekvencija.json` — bio je pokvaren

Napravljen je iz srLex-a, ali sa dve greške:

**Greška 1 — prepisivanje umesto sabiranja.** Isti oblik se u srLex-u pojavljuje
više puta, sa različitim gramatičkim oznakama (`voda` je i *voda* i genitiv
množine od *vod*). Umesto da se brojevi saberu, svaki novi red je prepisivao
prethodni, pa je ostajalo poslednje pročitano — često najređe značenje.

**110.931 od 208.700 reči imalo je pogrešan broj:**

| Reč | Bilo | Ispravno |
|---|---|---|
| koji | 5 | 2.805.274 |
| kao | 49 | 2.091.751 |
| dva | 9 | 344.730 |
| veliki | 34 | 198.997 |
| voda | 876 | 47.298 |

**Greška 2 — filtriran na naš rečnik.** Fajl sadrži **isključivo** reči koje su
već u `reci.txt` (provereno: nula reči koje nisu). Zbog toga **ne može da
potvrdi nijednu novu reč** — kao nezavisan izvor je bezvredan.

> Ova druga greška je dovela do pogrešnog zaključka: test „ima li srLex hrvatske
> reči" davao je „nema", a zapravo je merio naš sopstveni rečnik. Prava mera je
> u tabeli iznad.

**Posledica po sajt:** rangiranje rima je delimično pogrešno. Ispravan fajl je
napravljen i čeka odluku o postavljanju.

---

## 4. Šta iz svega ovoga sledi

| Pitanje | Ko može da odgovori |
|---|---|
| Da li je oblik ispravno izveden? | gramatička pravila (imamo ih zapisana) |
| Da li reč postoji u srpskom? | Rečnik Matice srpske |
| Da li je reč pokrajinska/zastarela/hrvatska? | **niko od izvora koje imamo** — samo vlasnica |
| Koliko se reč koristi? | srLex (uz ogradu da je opisan) |

**Nijedan izvor koji imamo ne rešava pitanje pokrajinskog i hrvatskog.**
To ostaje na vlasnici — ona presuđuje sporne reči, po potrebi otvarajući
digitalno izdanje na linku iznad.
