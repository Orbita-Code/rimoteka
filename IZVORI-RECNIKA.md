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

### Dostupnost
- **Papirno izdanje se kupuje** — oko 5.000–8.000 RSD.
- **Zvanično digitalno izdanje ne postoji.** Provereno; Matica srpska ga nema.
- Skenirana kopija sa prepoznatim tekstom postoji na Internet Archive-u
  (postavio privatni korisnik 2020, bez naznake dozvole izdavača).

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

### Ocena
- **Jak za:** frekvencije, prideve, imenice, gramatičke oznake
- **Slab za:** glagole (9.653 leme je malo)
- **Šum:** 38% vlastita imena, hrvatski ostatak
- **Nije normativan** — beleži šta se u tekstovima pojavljuje, ne šta je pravilno

**Ne može zameniti Rečnik Matice srpske.** Koristan je kao *drugi* izvor koji
potvrđuje ili ne potvrđuje ono što nađemo u prvom.

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

**Nijedan izvor koji imamo ne rešava pitanje pokrajinskog i hrvatskog.** To
ostaje na vlasnici, ili na kupovini papirnog Rečnika i Pravopisa.
