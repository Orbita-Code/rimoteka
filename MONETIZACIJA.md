# Plan monetizacije — Rimoteka

> **Status: PLAN ZA BUDUĆNOST. Ne radi se sada.**
> Zapisano 29.07.2026. na zahtev vlasnice — ideje da ne propadnu, da se time bavimo
> kad sajt poraste.
>
> **Ništa iz ovog dokumenta se ne počinje bez izričite odluke vlasnice.**
> Monetizacija je u `CLAUDE.md` (sekcija 8) navedena kao kapija koja traži odobrenje.

---

## 0. Zašto ne sada — zatečeno stanje

Izmereno u Google Analytics, poslednjih 7 dana (28.07.2026):

| Podatak | Vrednost |
|---|---|
| Aktivni korisnici | **38** (+58,3%) |
| Novi korisnici | 36 |
| Pregleda strana | 150 |
| Pretraga rima (`rhyme_search`) | 124 |
| Sesije | ~58 |
| Zemlje | Srbija 24 · Španija 7 · SAD 3 · Nemačka, Hrvatska, Holandija, Slovenija po 1 |
| Izvor | organska pretraga 33 · direktno 25 |

Dakle red veličine **150–160 korisnika mesečno** i **~600 pregleda strana mesečno**.

**Šta to znači:**
- **Reklame su besmislene na ovom saobraćaju.** Pri uobičajenim prihodima za ovaj
  region i ovakav sadržaj, 600 pregleda mesečno donosi manje od jednog evra — a
  košta nas jedini adut koji svetski konkurenti nemaju: **čisto sučelje bez reklama**.
- **Pretplata na ovom saobraćaju daje jednocifren broj pretplatnika u najboljem slučaju.**
- **Rast je dobar znak** (+58% nedeljno, 124 pretrage rima) i ide u pravom smeru.

**Zaključak: prvo saobraćaj i kvalitet, pa naplata.** Svaka naplata na malom
saobraćaju donosi malo novca, a troši poverenje koje je jedini kapital koji sad imamo.

---

## 1. Šta VEĆ postoji — ne graditi ispočetka

> Ovo je lako zaboraviti: **Rimoteka Pro je već napravljena i testirana, samo nije
> uključena.** Detalji u `STRIPE-BRIEF-ZA-DRUGO-MISLJENJE.md`, kod na grani
> `feat/stripe-pro`.

| Deo | Stanje |
|---|---|
| Backend (Node.js + Express, zaseban servis) | ✅ napisan i testiran, **nije deployovan** |
| Frontend — modal, prijava mejlom, izbor plana | ✅ napisan, **dugme zakomentarisano** u `index.html:104` |
| Stripe nalog „Orbita Code" | ✅ otvoren, LIVE režim |
| Proizvodi i cene u Stripe-u | ❌ nema nijedan |
| Poreske registracije | ❌ nula |
| AdSense | kod dodat, **čeka odobrenje Google-a**; uz to bi ga trenutni CSP blokirao |
| Slanje mejlova sa rimoteka.com | ❌ ne može — Porkbun samo prosleđuje dolaznu poštu |

**Planirane cene (već odlučeno):** 3 EUR mesečno, 30 EUR godišnje.
**Pro pogodnosti na startu:** bez reklama, Pro oznaka, prioritetna podrška.
**Najavljene a nenapravljene:** napredna analiza stiha, čuvanje pesama u oblaku,
izvoz u PDF/DOCX.

**Osam otvorenih odluka (A–H)** čeka u `STRIPE-BRIEF-ZA-DRUGO-MISLJENJE.md` — baza
podataka, slanje mejla, identifikacija korisnika, `automatic_tax`, Checkout vs
Managed Payments, prikaz nenapravljenih funkcija, gde se izvršava backend,
statement descriptor.

**Poreski okvir:** vlasnica je **autónoma u Španiji**. Prodaja digitalne usluge
kupcu u **Srbiji** (van EU) tretira se drugačije nego kupcu u EU; Union OSS pokriva
samo prekograničnu B2C prodaju **unutar** EU, ne i domaću ni B2B. Pre uključivanja
naplate ovo mora da se razreši sa knjigovođom — **`automatic_tax` bez registracije
ne javlja grešku nego naplati 0 EUR poreza**, što je zamka.

---

## 2. Ideje vlasnice — sve zabeležene

Redosled je kako ih je iznela; procena i redosled izvođenja su u odeljku 3.

### 2.1 Pro plan (plaćeni nivo)
Već napravljen (vidi odeljak 1). Ostaje pitanje **šta se tačno naplaćuje**.

### 2.2 AdSense reklame
Kod dodat, čeka odobrenje. Napomena: trenutni CSP bi ih blokirao, pa bi morao da se
proširi.

### 2.3 Affiliate — knjižare i kursevi pisanja
Provizija sa prodaje knjiga poezije, priručnika za pisanje i kurseva kreativnog pisanja.

### 2.4 Nalozi korisnika + lični panel
Pesnici dobijaju nalog gde čuvaju **rukopise, beleške, inspiraciju, tekstove** —
sve na jednom mestu, dostupno sa svakog uređaja.

### 2.5 Affiliate — audio knjige
Audible i slični servisi; proveriti i domaće (Audioteka, Storytel, Bookmate).

### 2.6 Panel za predavače kurseva
Predavač dobija svoj prostor; **učenici kače svoje radove**, a predavač ih u našem
alatu **pregleda, ocenjuje i komentariše**.

---

## 3. Procena i redosled — moje mišljenje

> Poređano po odnosu prihoda, truda i rizika za brend. Ovo je predlog, ne odluka.

| # | Kanal | Kada ima smisla | Trud | Rizik za brend |
|---|---|---|---|---|
| 1 | **Nalozi + lični panel** (2.4) | čim se poprave kritični bagovi | srednji | nizak — ako se poštuje pravilo ispod |
| 2 | **Pro plan** (2.1) | kad panel postoji i kad ima šta da se naplati | mali (već napravljen) | srednji |
| 3 | **Panel za predavače** (2.6) | kad postoje nalozi i bar jedan zainteresovan predavač | **veliki** | nizak, prihod najizvesniji |
| 4 | **Affiliate knjige/kursevi** (2.3) | bilo kada — ne traži saobraćaj da bi se probalo | mali | nizak ako je diskretno |
| 5 | **Affiliate audio knjige** (2.5) | uz 2.3, isti mehanizam | mali | nizak |
| 6 | **AdSense** (2.2) | **tek na višestruko većem saobraćaju** | mali | **visok** |

### Zašto tim redom

**Nalozi i lični panel su temelj svega ostalog.** Bez naloga nema ni Pro plana koji
vredi (danas Pro nudi „bez reklama" — a reklama nema), ni panela za predavače.
Uz to rešavaju **najveću bolnu tačku celog tržišta**: izgubljen tekst. Iz istraživanja
recenzija — najčešća i najljuća pritužba na sve konkurentske alate je
*„izgubio sam pesme"*. Naša beležnica trenutno živi samo u `localStorage`, koji smo
u auditu **dokazano uspeli da pokvarimo i time oborimo ceo sajt**. Dakle: najveća
prilika i najveći tehnički rizik su na istom mestu.

**Pro plan tek kad ima šta da se naplati.** Naplaćivati listu rima je gubitnička
strategija — RhymeZone je besplatan i korisnici to doslovno pišu u recenzijama
(*„Why pay for a service identical to free RhymeZone"*). **Naplaćuje se tok rada**:
čuvanje u oblaku, sinhronizacija između uređaja, izvoz, verzije pesme.

**Panel za predavače je ideja sa najizvesnijim prihodom**, jer je jedina B2B: škole i
kursevi imaju budžet, plaćaju godišnje i ne otkazuju posle mesec dana. Uz to se
savršeno spaja sa našom nišom — **dečji režim je jedina prednost koju niko na svetu
nema**, a upravo je učiteljima najvažnija. Ali je i **daleko najveći poduhvat**:
traži naloge, uloge, kačenje fajlova, pregled, ocene, komentare, obaveštenja.
Ne počinjati dok nalozi ne rade i dok ne postoji bar jedan predavač koji je rekao
„da, ovo bih koristio".

**Affiliate se može probati odmah** jer ne zavisi od saobraćaja da bi se postavio —
samo od toga koliko donese. Prirodno mesto: strane `/kako-napisati-pesmu/`,
`/vrste-rima/`, `/klasici/` i eventualno diskretan blok na dnu strana reči.
Pre bilo čega proveriti **da li srpske knjižare uopšte imaju affiliate program** i
**da li je Audible dostupan u Srbiji** — to nije istraženo.

**AdSense poslednji, i to sa oprezom.** Tri razloga:
1. Na 600 pregleda mesečno ne donosi ništa merljivo.
2. **Reklame koje prekidaju pisanje su druga najčešća pritužba na celom tržištu**
   (*„if i think of a lyric i can't write it down cause i have to sit through an ad"*).
3. Čisto sučelje je adut kojim se svetski konkurenti **hvale u marketingu**, a mi ga
   već imamo besplatno.

Ako se ikad uvedu — **nikad u beležnici i nikad u toku pisanja**; eventualno samo na
statičnim SEO stranama.

---

## 3a. Reklamne mreže — pragovi (istraženo 29.07.2026, da se ne traži ponovo)

| Mreža | Prag saobraćaja | Geo/jezik | Prag isplate |
|---|---|---|---|
| **AdSense** | nema | ✅ srpski podržan | EFT iz Španije |
| **Journey by Mediavine** | **1.000 sesija** | ✅ *„premium traffic from anywhere in the world"* | 100 $ |
| **Setupad** | ~100k posetilaca | ✅ nema geo-uslov, EU firma | 100 € |
| Ezoic | 250.000 | ✅ | — |
| Snigel / Publisher Collective | **3.000.000** PV | ✅ | — |
| ❌ Monumetric | 10.000 | **traži 50% saobraćaja iz US/UK/CAN/AUS** | — |
| ❌ Newor Media | nema | **„all sites must be in English"** | — |
| ❌ Playwire | 500.000 PV | traži publiku iz zemalja engleskog govornog područja | — |
| ⚠️ Adsterra / Monetag | nema | ✅, isplata od **5 $** | — |

**Zaključci:**
- **Monumetric, Newor, Playwire i Raptive nas isključuju po jeziku/geografiji** — srpski
  sajt tu ne prolazi bez obzira na saobraćaj. Ne gubiti vreme.
- **Journey by Mediavine je jedina premium mreža bez geo-barijere**, a prag je samo
  1.000 sesija — to je realno dostižno. Traži njihov dodatak instaliran 30 dana.
- **Adsterra i Monetag nemaju prag i plaćaju od 5 $, ali koriste popunder i push
  formate** — to bi uništilo iskustvo alata za pisanje. Ne dolazi u obzir.
- **Najveći rizik kod AdSense-a nije prag nego odbijanje zbog „low value content"** —
  alat sa malo teksta recenzentu nema šta da pročita. Pre prijave bi trebalo 8–12
  tekstova o rimi, metru, vrstama stiha i srpskoj versifikaciji, plus stranice
  *O nama*, *Kontakt* i *Politika privatnosti*.

> Napomena: taj sadržajni sloj bi ionako doneo organski saobraćaj koji nam treba i za
> Journey. Dakle **pisanje sadržaja je korak koji vredi i bez reklama** — i zato je
> jedini deo monetizacije koji ima smisla raditi rano.

---

## 3b. Audio knjige i affiliate — istraženo 29.07.2026 (ne tražiti ponovo)

### Audible je mrtav kanal za srpsku publiku

| Pitanje | Nalaz |
|---|---|
| Ima li Audible tržište za Srbiju? | **Ne.** Postoje: US, UK, CA, AU, DE, FR, IT, ES, IN, JP |
| Širenje 2026? | Mart 2026. dodaje **11 novih tržišta** (Poljska, Turska, Švedska, Holandija…) — **Balkan se ne pominje** |
| Ima li RSD naplatu ili srpski katalog? | Ne |

**Amazon Associates Španija** (`afiliados.amazon.es`) **jeste** otvoren za rezidente
Španije i plaća: **10 € proba · 15 € pretplata** (promo 20 € do 31.7.2026).
**Ali** — bounty važi samo za korisnike koji ispunjavaju uslove **tog tržišta**, a
srpski posetilac ne može postati Audible pretplatnik. Dakle: program radi za vlasnicu,
ali ne za publiku Rimoteke.

### Nijedna srpska ni regionalna platforma nema affiliate program

Provereno direktnim proverama domena — svuda 404 ili ne postoji:

| Servis | Radi u Srbiji | Cena | Affiliate |
|---|---|---|---|
| **Slušaj.rs** (jedini pravi srpski audio servis) | ✅ 500+ naslova | **999 RSD/mes** | ❌ nema |
| **Bookmate** | ✅ srpski interfejs | 599 RSD/mes (Yettel) | ❌ nema |
| **EDEN Books** (Delfi/Laguna) | ✅ 2000+ e-knjiga | 599 RSD/mes | ❌ nema |
| **Delfi.rs** | ✅ prodaje po naslovu | — | ❌ nema |
| Knjižare Vulkan | nema e-knjige | — | ❌ nema |
| **Audioteka** | ❌ **ne radi u Srbiji** | — | — |
| **Storytel** | ❌ **ne radi u Srbiji** | — | — |
| book&zvook (HR) | ✅ kupovina po naslovu | 6–18 €/knjiga | ❌ nema |

### Šta iz toga sledi

**Affiliate mreže za knjige na srpskom tržištu praktično ne postoje.** Ideje 2.3 i 2.5
ne mogu da se izvedu na uobičajen način — nema programa na koji bi se prijavili.

**Jedini realan put je direktan dogovor.** Dva domaća igrača kojima bi saobraćaj
koristio i koji imaju vidljive kontakte: **Slušaj.rs** i **EDEN Books**. To nije
affiliate nego partnerstvo — dogovor jedan na jedan, verovatno po fiksnoj naknadi ili
po pretplati koju dovedemo.

> **Zaključak za plan:** affiliate premestiti niže po prioritetu nego što je bilo
> procenjeno u odeljku 3 — ne zato što je loša ideja, nego zato što **infrastruktura
> ne postoji**. Kad dođe vreme, prvi korak nije prijava na program nego **mejl
> Slušaj.rs-u i EDEN Books-u**.

---

## 4. Crvene linije — nikad, bez obzira na prihod

Iz istraživanja recenzija konkurenata (App Store, Hacker News). Svaki od ovih obrazaca
proizvodi jednu zvezdicu i odlazak korisnika:

- **Nikad ne naplaćivati pristup korisnikovom sopstvenom tekstu.** Poetizer je
  udžbenički primer: *„i can't read my own drafts???"* — korisnici izgubili 260+ pesama.
- **Nikad nedeljna pretplata.** 8,99 $ nedeljno korisnici sami preračunaju u 468 $
  godišnje i to citiraju u recenzijama.
- **Nikad prelazak sa jednokratne kupovine na pretplatu** bez nadoknade starim kupcima.
- **Nikad „besplatan probni period" koji naplati.** Ponavlja se kroz sve alate kao
  najveći izvor besa.
- **Nikad zamućene rime** („plati da vidiš ostatak") — to je za korisnike prevara.
- **Nikad reklame u beležnici.**

---

## 5. Uslovi koji moraju biti ispunjeni PRE bilo kakve naplate

1. **Zatvoreni kritični nalazi iz audita.** Naplaćivati alat koji se obori kad je
   `localStorage` zabranjen — ne ide. Stanje: `AUDIT/NALAZI-OTVORENI.md`.
2. **Rešeno čuvanje teksta.** Ako naplaćujemo čuvanje pesama, ono mora biti
   pouzdanije od trenutnog.
3. **Poreski okvir razrešen sa knjigovođom** (Španija ↔ EU ↔ Srbija).
4. **Rešeno slanje mejlova** — bez toga nema prijave na nalog.
5. **Saobraćaj dovoljan da se isplati.** Postaviti prag unapred, npr. „vraćamo se na
   ovo kad pređemo N korisnika mesečno", da odluka ne zavisi od raspoloženja.

---

## 6. Šta uraditi kad dođe vreme — prvi konkretan korak

Ne birati kanal, nego **pitati korisnike**. Na sajtu već postoji saobraćaj od pravih
pesnika; jedno diskretno pitanje („šta bi ti najviše značilo?") daje odgovor koji
vredi više od svake procene odavde.

Do tada: **rasti, popravljati bagove i graditi poverenje.** Kad Rimoteka bude alat
bez ijedne mane, naplata će biti lakša nego danas.

---

*Zapisano 29.07.2026. Ne počinjati bez izričite odluke vlasnice.*
