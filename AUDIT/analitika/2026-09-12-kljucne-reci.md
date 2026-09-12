# Ključne reči za rime na srpskom – šta ljudi kucaju, ko to cilja, šta mi pokrivamo (12.09.2026)

> Sve iz merenih izvora. Ništa nagađano. Sirovi Google predlozi stoje u
> `AUDIT/analitika/2026-09-12-predlozi-sirovo.txt` (3.678 redova, kolone: jezičko
> podešavanje, početni upit, predlog).

## Kako je rađeno

| Izvor | Šta je uzeto | Koliko |
|---|---|---|
| Google predlozi za dopunu (`suggestqueries.google.com`, `gl=rs`) | 132 početna upita (66 zadatih + „rime za X", „sta se rimuje sa X", „rimovanje X" za 22 slova) × 4 jezička podešavanja (`sr`, `sr-Latn`, `hr`, `bs`) | 528 poziva, 3.678 različitih redova, 0 grešaka, 24 upita bez ijednog predloga |
| Search Console (izveštaj od 08.09.2026, 3 meseca: 2.230 klikova, 50.400 prikaza) | 15 najjačih upita, pismo, ijekavica | prepisano iz `2026-09-08.md`, nije ponovo otvarano |
| Konkurenti | naslov, h1, opis, adresa strane po reči, brojanje reči u tekstu | 5 živih sajtova + 2 nedostupna + 3 koji nisu alati |
| Naš sajt (produkcija) | naslov, h1, opis, prvih 300 znakova, postojanje `/rime-za/<reč>/` | 13 strana alata + 47 provera strana po reči |
| Kod | `build/gen_pages.py` – pravilo po kom se bira 1.990 reči za strane | red 242–249 |

**Šta Google predlog znači:** to je ono što ljudi stvarno kucaju, ali **bez broja** – Google
ne kaže koliko puta. Zato je „važnost" ovde ocenjena ovako: **visoka** = upit ima prikaze u
našoj Search Console (izmereno) ili ga Google predlaže u više jezičkih podešavanja i za više
početnih upita; **srednja** = predložen u jednom podešavanju za jedan upit; **niska** = samo
kod konkurenta ili u jednom podešavanju sa kvačicom „nema predloga" u ostalim.

---

## A. Ključne reči po nameri

### A1. Rimovanje i rime uopšte (alat)

| Ključna reč | Izvor | Važnost | Imamo stranu koja je cilja? |
|---|---|---|---|
| rimovanje | GSC: 5.432 prikaza, 628 klikova, mesto 3,8 (najjači upit sajta) | visoka | da – `/` (h1), `/rimovanje-reci/` (naslov) |
| rimovanje reči / rimovanje reci | GSC: 1.349 + 863 prikaza, 308 + 149 klikova, CTR 22,8 % (najbolji na sajtu) | visoka | da – `/rimovanje-reci/`, `/` (h1) |
| rimovanje reci na srpskom / reči na srpskom | GSC: 201 + 111 prikaza, 23 + 8 klikova | visoka | da – `/` h1 „Rimovanje reči na srpskom jeziku" |
| rimovanje reci online | predlog u sva 4 podešavanja, 21 predlog sadrži „online" | visoka | **ne** – reč „online" nema ni u jednom naslovu ni h1 |
| rimovanje reci pesme / rimovanje reci za pesmu | predlog `sr`, `hr` | srednja | delimično – `/rime-za-pesmu/` |
| rime | GSC: 856 prikaza, **4 klika**, CTR 0,5 % (najveći promašaj) | visoka | naslov `/rimovanje-reci/` počinje sa „Rime i rimovanje reči"; Google i dalje daje upit početnoj (124 od 145 prikaza u 7 dana) |
| rima | GSC: 233 prikaza, 7 klikova | srednja | ne izričito – `/vrste-rima/` objašnjava šta je rima |
| rečnik rima / recnik rima | GSC: 140 + 677 prikaza, 10 + 14 klikova, mesto 4,0; predlog „recnik rima rs" | visoka | da – `/` naslov počinje „Rečnik rima" (od 26.08.; CTR za taj upit i dalje 0 na 112 prikaza u 7 dana) |
| reči koje se rimuju / reci koje se rimuju | GSC: 78 + 439 prikaza, 3 + 24 klika; predlog u sva 4 podešavanja | visoka | **ne u naslovu** – fraza ne stoji ni u jednom naslovu ni h1 (samo Google sam pravi „136 reči koje se rimuju" za `?rec=`) |
| šta se rimuje sa / sta se rimuje sa | GSC: 42 + 218 prikaza, 4 + 3 klika; predlog u sva 4 podešavanja sa 100+ nastavaka | visoka | da – naslov svake `/rime-za/<reč>/`: „Šta se rimuje sa „dan“?" |
| rimuje se sa | predlog `sr` | srednja | da – ista grupa strana |
| rimovane reči / rimovane reci | predlog `sr`, `sr-Latn` | srednja | ne u naslovu |
| generator rima / rimovanje generator / генератор рима | predlog `sr` (3 oblika), `hr` („rime generator") | srednja | **ne** – reč „generator" nema nigde |
| program za rimovanje reci / rimovanje sajt / rimovanje rs / rimovanje com | predlog `sr`, `hr` | srednja | ne (ljudi traže alat po imenu domena – „rimovanje.com" je konkurent) |
| rimovanje za tekstopisce | predlog `sr` | srednja | **ne** – nemamo ni „tekstopisac", ni „reper", ni „pesnik" u naslovima; AZRhymes ima sva tri u h1 |
| pronalazač rima | zadato | niska | nema predloga ni u jednom podešavanju |
| rime na om / rime na ma / rime na srce / rime na dan / rime na srpskom | predlog `sr` | srednja | delimično – `/rime-po-zavrsetku/` (naslov „nađi reč koja se završava na…"), bez fraze „rime na" |
| vrste rime / vrste rima | GSC: 47 + 44 prikaza, **0 klikova** | srednja | da – `/vrste-rima/`, ali ne daje klik |
| rimovanje samoglasnika / rimovanje stihova / rimovanje recenica | predlog `sr` | niska | ne |

### A2. Rime za KONKRETNU reč – koje reči ljudi najviše kucaju

Iz 3.678 predloga izdvojeno je **344 različite reči** iza „šta se rimuje sa / rimovanje / rime za".
**146 od 344 (42 %) ima našu stranu `/rime-za/<reč>/`, 198 nema.**

Najčešće tražene reči (koliko puta se reč pojavila kao nastavak, kroz sva podešavanja i sve
početne upite; broj 51 znači „u 51 različitom predlogu"):

| Reč | Pojava u predlozima | Strana `/rime-za/<reč>/` |
|---|---|---|
| dan | 51 | da |
| nema | 31 | da |
| sve | 29 | da |
| **tebe** | 28 | **ne (404)** |
| **mene** | 25 | **ne (404)** |
| **ja** | 19 | **ne (404)** |
| srce | 17 | da |
| zemlja | 16 | da |
| put | 16 | da |
| rodi | 16 | nije provereno |
| puno | 15 | da |
| **sam** | 14 | **ne (404)** |
| ljubav | 13 | da |
| kraj | 12 | da |
| **ima** | 12 | **ne** |
| pravi | 12 | nije provereno |
| vrata | 10 | da |
| **volim** | 10 | **ne (404)** |
| šumi (hr) | 10 | nije provereno |
| zima | 9 | da |
| mir / glas / moja | 9 / 9 / 9 | da / da / **ne** |
| more / mala / nas | 7 / 7 / 7 | da / **ne** / nije provereno |
| sunce / tiho / treba / ti | 6 / 6 / 6 / 6 | da / **ne** / **ne** / **ne** |

Najpopularnije pretrage **nedelje kod AZRhymes-a** (konkurent objavljuje spisak, prepisano
12.09.): *da, ne, ja, dana, ću, ti, mnom, mu, kad, nje, sve, njom, na, puta, budem, njim, im,
samo, njoj, jer, za, ako, god, kraju, ko, gradu, sna, ste, ma, glavi, ona, znam, nije, kada,
tvom, kraja, kao, ljude, šta, od*. **Od 40 reči, 34 su zamenice, veznici, predlozi ili
glagolski oblici.** Meseca: *metohije, tišinom, pa, sad, nisam, njen, očima, dok, svog, ali,
nema, stalo, grudima, svi, krvi, spas, svane, dna, sobi, hajde…*

**Uzrok rupe je u kodu, ne u podacima.** `build/gen_pages.py`, red 242–247:

> „SADRŽAJNE reči (imenica, pridev, glagol, prilog) po oznakama iz srLex-a. Bez ovoga vrh
> spiska po učestalosti čine `koji`, `što`, `kao`, `ali`, `nije`, `ili` – veznici, zamenice i
> predlozi. **Za njih niko ne traži rimu**, a zauzeli bi stotine strana."

Ta rečenica je pretpostavka iz 30.07. i **podaci je obaraju**: „tebe", „mene", „ja", „sam",
„ti", „ona", „nije", „znam" su među 20 najtraženijih reči u Google predlozima, a kod
konkurenta čine skoro ceo vrh nedelje. Provereno na 47 najtraženijih reči: **22 nemaju
stranu** (tebe, mene, ja, sam, ima, volim, ti, ona, nije, znam, da, ne, dana, kad, kao,
ljude, tiho, treba, mala, moja + 2 sa kvačicom koje imaju stranu pod slugom bez kvačice:
oči → `oci`, noć → `noc`). Sve tih 20 reči **jesu u `reci.txt`** (alat ih zna, `?rec=tebe`
radi), samo nemaju stalnu adresu koju Google može da rangira.

**Imena:** Google predlaže „šta se rimuje sa ana / anja / andrea / andrej / ivan / ivana /
luka / petra / filip / jana / ema", plus „rime za imena", „rimovanje imena". Provereno 12
imena: **12 od 12 su u `reci.txt`, 0 od 12 ima stranu.**

**Oblici koji nisu osnovni:** „dana", „ljude", „očima", „kraja", „zauvek" – u `reci.txt`
jesu, stranu nemaju; „godine", „ruke", „mnogo", „puno", „zajedno", „osmeh" – imaju.

### A3. Rime za priliku

| Ključna reč | Izvor | Važnost | Naša strana |
|---|---|---|---|
| rime za pesmu / dobre rime za pesmu / rime za pesme | predlog u sva 4 podešavanja | visoka | da – `/rime-za-pesmu/` |
| rime za rep / najbolje rime za rep / rime za rap / rime za rap battle / rime za freestyle | predlog `sr`, `hr`, `bs` | visoka | da – `/rime-za-rep/`; fraze „najbolje", „freestyle", „rap" nema |
| rime za decu / kratke rime za decu / smesne rime za decu / reci koje se rimuju za decu | predlog `sr` | visoka | da – `/rime-za-decu/`; „kratke" i „smešne" nema |
| rime za rodjendan / rime za srecan rodjendan / smesne rime za rodjendan / saljive rime za rodjendan / rimovanje za rodjendan | predlog `sr`, `hr` | visoka | delimično – `/rime-za-rodjendanske-pesmice/`; naslov kaže „rođendanske pesmice", a ljudi kucaju „rime za rođendan" |
| rime za ljubav / ljubavne rime za devojku / ljubavne rime za decka / rime ljubavne | predlog `sr` | visoka | delimično – `/rime-za-ljubavne-pesme/`; „za devojku", „za dečka" nema |
| rime za tebe / rime za mene / rime za sebe | predlog `sr`, `hr` | srednja | ne (v. A2) |
| rime za brojeve / rime za imena | predlog `sr` | srednja | ne |
| rime za zezanje / rime za vredjanje / najbolje rime za uvrede / rime za zajebancije | predlog `sr`, `hr` | srednja | ne – **namerno**, sajt ima dečji režim; ne ciljati |
| rime za svadbu | zadato | niska | strana postoji (`/rime-za-svadbu/`), a Google **nema nijedan predlog** – potražnja je mala |
| rime za novu godinu | zadato | niska | strana postoji, **nema predloga** |
| rime za zimu / jesen / uskrs / bozic / laku noc / dobro jutro / skolu / mamu / brata / kumu | predlog `sr`, `hr` | niska–srednja | ne (postoje `/rime-za/zima/`, `/rime-za/mama/`) |
| pesma za rodjendan (bratu, sestri, majci, muzu, sinu, ćerki, unuci, drugarici) + tekst | predlog `sr`, 10 nastavaka | visoka, ali **druga namera** – ljudi hoće gotovu pesmu, ne alat | ne; bliska je `/rime-za-rodjendanske-pesmice/` |
| stihovi za (rodjendan, 18. rodjendan, prvi rodjendan, krstenje, vencanje, penziju, oca koji je umro, unuku, sina od majke) | predlog `sr`, `hr`, 10+ nastavaka | visoka, druga namera (gotov stih) | delimično – `/rime-za-tugu-i-secanje/`, `/rime-za-roditelje/`, `/rime-za-prijatelje/` |

### A4. Kako napisati pesmu / rep

| Ključna reč | Izvor | Važnost | Naša strana |
|---|---|---|---|
| kako napisati pesmu | predlog `sr` | visoka | da – `/kako-napisati-pesmu/` |
| kako napisati pesmu **koja se rimuje** | predlog `sr` | visoka | ne u naslovu |
| kako napisati rep pesmu / kako napisati rep | predlog `sr` (2×) | visoka | **ne** – ni `/rime-za-rep/` ni `/kako-napisati-pesmu/` nemaju „kako napisati rep" |
| kako napisati pesmu o ljubavi / o proleću / za pevanje / šaljivu pesmu / tekst za pesmu / dobru pesmu | predlog `sr`, 6 nastavaka | srednja | ne |
| kako se piše pesma | predlog `sr` | srednja | ne u naslovu (sinonim za „kako napisati") |
| rep tekst / rep tekstovi rime / rep tekstovi freestyle / pravi rep tekst | predlog `sr` | srednja | ne |
| freestyle rime | zadato | niska | predlozi su italijanski i engleski; na srpskom samo „rime za freestyle" (`hr`) |
| rimovanje za pocetnike | naš naslov | – | da – `/rimovanje-za-pocetnike/` (nema Google predlog, mala potražnja) |

### A5. Slogovi

| Ključna reč | Izvor | Važnost | Naša strana |
|---|---|---|---|
| brojač karaktera / brojac karaktera / online brojač karaktera / бројач карактера | GSC: 198 + 17 prikaza, 4 klika; predlog `sr` (5 oblika) | visoka | da – `/slogovi/` naslov „Brojač slogova i karaktera" |
| brojac slogova / brojanje slogova / brojač slogova | predlog `sr`, `hr` | srednja | da – `/slogovi/` |
| koliko slogova ima rec (bicikl, mrav, slon) / koliko slogova ima u reči bicikl | predlog `sr`, `hr` – školska pitanja | srednja | **ne** – fraza „koliko slogova ima reč" ne stoji nigde; strane po reči pišu „1 slog" |

### A6. Sinonimi

| Ključna reč | Izvor | Važnost | Naša strana |
|---|---|---|---|
| sinonimi za (dobro, lepo, lepotu, ljubav, mir, novac, prelepo, sreću, uporan, kafanu) | predlog `sr`, 10 nastavaka | srednja | **ne** – alat pokazuje sinonime uz svaku reč, ali reč „sinonimi" stoji samo u opisu `/rimovanje-reci/`, ni u jednom naslovu |

### A7. Ćirilica

| Ključna reč | Izvor | Važnost | Naša strana |
|---|---|---|---|
| римовање / римовање речи | predlog `sr` (i kad se kuca latinicom „rimovanje reči" Google nudi ćirilični oblik) | visoka | ne u naslovu; ćirilica na stranama samo u bloku „Како се куцају српска слова" |
| речник рима / има рима речник | predlog `sr` | visoka | ne |
| речи које се римују / шта се римује са | predlog `sr` (samo sam upit, bez nastavaka) | srednja | ne |
| генератор рима / бројач карактера | predlog `sr` | srednja | ne |

Search Console: ćirilica je **34 upita, 279 prikaza, 48 klikova – CTR 17 %**, dok je ceo sajt
na 4,4 %. Malo prikaza, ali skoro svaki peti klikne: ko kuca ćirilicom, nas hoće.
Konkurent igrarecima.com ima ćirilicu u naslovu („Rimovanje reci – Римовање речи"); AZRhymes
ima dugme „koristi ćirilicu".

### A8. Ijekavica

| Ključna reč | Izvor | Važnost | Naša strana |
|---|---|---|---|
| rimovanje riječi / rimovanje rijeci | GSC: 552 + 270 prikaza, 15 + 10 klikova, mesto 6,2 / 5,5 | visoka | **ne** – „riječ" se ne pojavljuje ni na jednoj od 4 glavne strane (0 pojava), samo kvačica „uključi ijekavicu" |
| riječi koje se rimuju (sa dan, more, nema, sto, volim, zemlja, zima, kiša, kraj, sve; za djecu) | predlog `sr`, `hr`, `bs` | visoka | ne |
| rime na riječ / rime na rijeci / rima na riječ / rime za rijeci | predlog `sr`, `hr` | srednja | ne |
| rječnik rima / hrvatski rjecnik rima / rime hrvatski / rimovanje hr | predlog `sr`, `hr` | srednja | ne (hrvatski nije naš cilj, ali ijekavski govornici u Srbiji, BiH i Crnoj Gori jesu) |
| što se rimuje sa (dan, sreća, sunce, sve, šumi, zemlja, more, zima, ljeto, kamen) | predlog `sr`, `hr` | srednja | ne |
| rime za djecu / kratke rime za djecu / smiješne rime za djecu / rime za pjesmu / rime za pjesme | predlog `sr`, `hr` | srednja | ne |
| sta se rimuje sa ljeto / vrijeme / osmijeh | predlog `hr`, `bs` | niska | ne |

Search Console: ijekavica je **20 upita, 1.004 prikaza, 46 klikova (CTR 4,6 %)** i raste
(25.08. bilo 626 prikaza) **bez ijednog reda napisanog za nju**.

---

## B. Rupe – ključne reči bez strane i bez naslova

| # | Rupa | Dokaz | Koliko je velika |
|---|---|---|---|
| 1 | **Zamenice, glagolski oblici, čestice: tebe, mene, ja, sam, ti, ona, nije, znam, ima, volim, da, ne, kad, kao, treba, tiho, mala, moja, dana, ljude** | 20 od 47 najtraženijih reči nema stranu; kod AZRhymes-a 34 od 40 reči nedelje su baš takve; `gen_pages.py` ih izbacuje uz komentar „niko ne traži" | najveća – to su reči na kraju stiha (rima je najčešće na „tebe / mene / sve / nema") |
| 2 | **Ijekavica u tekstu**: „rimovanje riječi", „riječi koje se rimuju", „rime za djecu" | 1.004 prikaza, 46 klikova, 0 reči „riječ" na sajtu | druga po veličini – Google nas već pokazuje, samo mu ne dajemo razlog za klik |
| 3 | **Imena**: ana, anja, ivan, ivana, luka, petra, filip, jana, ema, marija, andrea, andrej + „rime za imena" | 12 od 12 u rečniku, 0 od 12 ima stranu | srednja – rođendanske pesmice i čestitke se pišu za ime |
| 4 | **„online", „generator", „program", „sajt"** uz rimovanje | 21 predlog sa „online", 4 sa „generator"; nijedan naš naslov ih nema | srednja |
| 5 | **„kako napisati rep (pesmu)"** | 2 predloga, nijedna strana | srednja – `/rime-za-rep/` je tu, treba joj rečenica |
| 6 | **„reči koje se rimuju"** kao fraza u naslovu | 439 + 78 prikaza, fraza ne stoji ni u jednom naslovu | srednja – Google je sam pravi za `?rec=` strane, dokaz da je traži |
| 7 | **Ćirilica u naslovu** („римовање речи", „речник рима") | CTR 17 % na 279 prikaza | mala po prikazima, velika po klik-stopi |
| 8 | **„koliko slogova ima reč"** (školska pitanja: bicikl, mrav, slon) | 3 predloga u `sr`, 1 u `hr` | mala – ali deca i roditelji su ciljna grupa dečjeg režima |
| 9 | **„sinonimi za"** u naslovu | 10 predloga, alat ima sinonime, naslov ih ne pominje | mala–srednja |
| 10 | **„rime za rođendan"** (ne „rođendanske pesmice"), „smešne rime za rođendan", „rime za srećan rođendan" | 5 predloga; naš naslov koristi ređi oblik | mala – strana postoji, naslov promašuje reč |
| 11 | **„pesma za rođendan", „stihovi za…"** (gotov tekst, ne alat) | 20+ predloga | druga namera – ne juriti alatom; jedna rečenica na rođendanskoj strani „ako hoćeš da napišeš svoju pesmu za rođendan…" |
| 12 | „rime za tekstopisce, repere i pesnike" (ko je alat za) | AZRhymes h1; predlog „rimovanje za tekstopisce" | mala |

Reči koje se **ne ciljaju namerno**: „rime za vređanje / zezanje / uvrede / zajebancije" (7
predloga) – sajt ima dečji režim i sme da propusti ovu publiku.

---

## C. Konkurenti

| Konkurent | Naslov početne (`<title>`) | h1 | Strana po reči | Ima | Nema | Reči koje cilja u naslovu |
|---|---|---|---|---|---|---|
| **rimovanje.com** | „Rimovanje riječi! Rimovanje.com" | nema h1 (h2: „Web aplikacija za rimovanje riječi i traženje rime!") | da, `/{reč}` (npr. `/ljubav`, `/reci`, `/recnik`); naslov strane po reči (iz Google-a): „Rimovanje riječi reci – Rimovanje.com" | tačan domen za najjači upit; „rimovanje" 17 puta na strani; spisak poslednjih pretraga kao linkovi | slogove, definicije, beležnicu, igru, ćirilicu; isti opis na svim stranama; bez h1 | rimovanje, riječi (ijekavica), stihova, pjesama |
| **sr.azrhymes.com** | „Rečnik rima za tekstopisce, reperiste i pesnike – AZRhymes" | isto | da, `/?rime=dan`; naslov „Rime za: dan – AZRhymes" | slogovi (grupisano), bliske rime, tabovi Rime / Ideje / Lirics / Aliteracije / Konteksti, dugme „koristi ćirilicu", igra, tamna tema, **javni spisak najpopularnijih pretraga nedelje i meseca** | definicije, dečji režim, beležnicu; reklame + Pro nalog 2,92 € mesečno; adresa sa `?` | rečnik rima, tekstopisce, reperiste, pesnike, rime za |
| **rime.com.hr** | „Rječnik rima za tekstopisca, repera i pjesnike – Rime.com.hr" | isto | da, `/?rime=dan`; „Rime za: dan – Rime.com.hr" | isto što i AZRhymes + **filter po vrsti riječi** (imenice / glagoli / pridjevi / prilozi) | isto što i AZRhymes | rječnik rima, tekstopisca, repera, pjesnika (hrvatski, ijekavica) |
| **igrarecima.com** | iz Google-a: „Rimovanje reci – Римовање речи"; strana po reči: „Rime za rec razredimo u srpskom jeziku" | nije dostupno | da, `/latinica/rimovanje-reci/rime-za-rec/<reč>` (ima i ćiriličnu granu) | ćirilica u naslovu, „u srpskom jeziku" u naslovu strane po reči | **sajt ne odgovara** (12.09.: veza odbijena, 3 pokušaja; isto 25.07.) – Google ga i dalje pokazuje | rimovanje reci, римовање речи, rime za rec, srpski jezik |
| **rhymebook.com/hr** | iz Google-a: „Riječi koje se Rimuju s Ri (200) \| RHYMEBOOK" | nije dostupno (Cloudflare blokira, 403) | da, `/hr/rime/<završetak>`, sortirano po slogovima, broj rezultata u naslovu | broj rima u naslovu, strane po završetku | nije provereno | riječi koje se rimuju |
| **susjed.com/sto-se-rimuje-sa/** | „Što se rimuje sa – Susjed" | „Što se rimuje sa" | ne – jedan članak | „rimovanje" 63 puta, „riječ" 41 put; izlazi za „šta se rimuje sa" | alat; samo tekst iz 2023. | što se rimuje sa, rimovanje |
| forum.krstarica.com „Rimovanje reči" | tema na forumu, igra „nađi rimu" | – | ne | **izlazi prvi** za „rimovanje reči" u pretrazi iz SAD (WebSearch); u Srbiji nije mereno | – | rimovanje reči |
| wordwall.net („Riječi koje se rimuju – Spoji") | školske vežbe (hr) | – | ne | pokazuje da upit „riječi koje se rimuju" ima **školsku** nameru u Hrvatskoj | – | riječi koje se rimuju |
| kontekst.io | „rimuju: slične reči i sinonimi" | – | ne | sinonimi, ne rime | – | sinonimi |

Domeni koji **ne postoje** (provereno 12.09., 0 odgovora): rimovanje.rs, rimovanje.net,
rimovanje.hr, rime.rs, rime.hr, rimarij.hr, rimuj.com, rimuj.rs, rimovanje.info, rime.ba,
rimovanje.ba, srpskerime.com, rimarium.hr, rimovanje.org, rimoteka.rs.

### Šta oni imaju, a mi ne

| Šta | Ko | Vredi li nama |
|---|---|---|
| Strane za zamenice i glagolske oblike (tebe, mene, ja, ti, nije…) | AZRhymes (sve reči), rimovanje.com (sve reči) | **da, najviše** – v. B1 |
| Ijekavica u naslovu i tekstu | rimovanje.com, rime.com.hr | da, u tekstu, ne u novim stranama |
| „tekstopisci, reperi, pesnici" u h1 | AZRhymes, rime.com.hr | da, jedna rečenica |
| Filter po vrsti reči (imenica / glagol / pridev) | rime.com.hr | inovacija za kasnije, ne SEO |
| Javni spisak najtraženijih reči | AZRhymes | **ne** – pravilo projekta: ne objavljivati sopstveni promet |
| Broj rima u naslovu strane po reči | RHYMEBOOK („(200)") | već predloženo u izveštaju 08.09. (preporuka 2) |
| Ćirilica u naslovu | igrarecima.com | da |

### Šta mi imamo, a oni ne

| Šta | Ko od konkurenata nema |
|---|---|
| Značenje uz svaku rimu | niko od 5 |
| Dečji režim (bez ružnih reči) | niko |
| Beležnica gde se rime boje dok kucaš | niko |
| Brojač slogova i karaktera za ceo tekst | niko (AZRhymes broji slogove samo u rezultatu) |
| Bez reklama, bez naloga | AZRhymes i rime.com.hr naplaćuju uklanjanje reklama |
| Čista adresa `/rime-za/<reč>/` | AZRhymes i rime.com.hr imaju `?rime=` |
| Ekavica + ijekavica jednim klikom | rimovanje.com daje samo ijekavicu |

---

## D. Kako da se ključne reči provuku kroz sajt

Pravilo iz `CLAUDE.md`: **dok je indeksiranost niska, ne dodaju se nove strane** (08.09.: Google
odbio 5.193 strane, „otkriveno, nije obiđeno" 1.123 – od toga 999 su `/rime-za/`). Zato prvo
ide ono što **ne traži nijednu novu adresu**: naslovi, prve rečenice, interni linkovi.

### D1. Naslov, h1 i prva rečenica – bez nove strane

| Strana | Ključne reči koje dobija | Gde | Zašto baš tu |
|---|---|---|---|
| `/` | rimovanje riječi (ijekavica), reči koje se rimuju, online | prva rečenica ispod h1: „…sve reči koje se rimuju – ekavicom ili ijekavicom (rimovanje riječi), online i besplatno" | najjači upiti sajta idu početnoj (20.087 prikaza); ijekavica ima 1.004 prikaza a 0 pojava reči „riječ" |
| `/rimovanje-reci/` | reči koje se rimuju, rimovanje reci online, za tekstopisce / repere / pesnike, sinonimi | naslov: „Rimovanje reči online – reči koje se rimuju, sa slogovima i sinonimima"; rečenica u tekstu „…za pesnike, repere i tekstopisce" | strana sa najboljim CTR-om (7,0 %), ima 19.262 prikaza; fraza „reči koje se rimuju" ima 517 prikaza bez ijednog naslova |
| `/rime-za/<reč>/` (1.990 strana) | šta se rimuje sa X, reči koje se rimuju sa X, koliko slogova ima reč X | opis već ima broj rima; u prvu rečenicu dodati „koliko slogova ima reč „dan“ – 1" | dve fraze iz predloga na 1.990 strana odjednom, kroz generator (`gen_pages.py`), ne rukom |
| `/rime-za-rep/` | kako napisati rep, najbolje rime za rep, rime za freestyle | h2 „Kako napisati rep – tri koraka" + rečenica „najbolje rime za rep su one sa istim brojem slogova"; „freestyle" jednom u tekstu | 2 predloga „kako napisati rep" bez ijedne strane; strana već ima 65 prikaza za „recnik rima" |
| `/kako-napisati-pesmu/` | kako napisati pesmu koja se rimuje, kako se piše pesma, kako napisati pesmu o ljubavi, tekst za pesmu | naslov: „Kako napisati pesmu koja se rimuje – koraci, rima i ritam"; podnaslov „Kako se piše pesma o ljubavi, o prirodi ili šaljiva" | 8 predloga sa „kako napisati pesmu …", naslov sad hvata samo osnovni |
| `/rime-za-rodjendanske-pesmice/` | rime za rođendan, smešne rime za rođendan, rime za srećan rođendan, pesma za rođendan | naslov: „Rime za rođendan – smešne i nežne rime za rođendansku pesmicu"; rečenica „ako tražiš gotovu pesmu za rođendan – ovde pišeš svoju, za ime koje slaviš" | 5 predloga koriste „rime za rođendan", 0 „rođendanske pesmice" |
| `/rime-za-ljubavne-pesme/` | rime za ljubav, ljubavne rime za devojku, za dečka | rečenica „ljubavne rime za devojku ili za dečka – upiši ime…" | 4 predloga |
| `/rime-za-decu/` | kratke rime za decu, smešne rime za decu, rime za djecu, koliko slogova ima reč | h2 „Kratke i smešne rime za decu"; rečenica „koliko slogova ima reč – piše uz svaku (bicikl 2, mrav 1, slon 1)" | 4 predloga + 3 školska pitanja o slogovima; ijekavski oblik „djecu" jednom u tekstu |
| `/slogovi/` | brojanje slogova, koliko slogova ima reč | prva rečenica „Brojanje slogova: upiši reč ili ceo tekst i vidiš koliko slogova ima svaka reč" | 4 predloga, strana ima 1.304 prikaza a CTR 1,2 % |
| `/rime-po-zavrsetku/` | rime na (om, ma, ica), rime na riječ | naslov: „Rime na završetak – nađi sve reči na „-ica“, „-om“, „-ma“" | 5 predloga „rime na …"; jedina izmena naslova od 26.08. koja je upalila (CTR 4,3 %) je bila baš na ovoj strani |
| `/vrste-rima/` | vrste rime, vrste rima, rima | naslov: „Vrste rima i rime – parna, ukrštena, obgrljena (sa primerima)" | 91 prikaz, 0 klikova; treba oba oblika (rime / rima) |
| `/rimovanje-za-pocetnike/` | šta je rimovanje, rimovanje definicija, rimovanje značenje | h2 „Šta je rimovanje – definicija i značenje" | 3 predloga („sta je rimovanje", „rimovanje definicija", „rimovanje znacenje") |
| `/` i `/rimovanje-reci/` | римовање речи, речник рима | jedna rečenica ćirilicom u tekstu (ne u naslovu): „Римовање речи и речник рима раде и на ћирилици – укуцај реч било којим писмом." | CTR ćirilice 17 %; strane već imaju ćirilični blok o kucanju, ali ne i ove dve fraze |

Ćirilica u **naslovu** se ne predlaže – naslov je jedan, a 93 % klikova dolazi latinicom.

### D2. Interni linkovi – tekst linka je ključna reč

| Sa strane | Na stranu | Tekst linka |
|---|---|---|
| `/` | `/rimovanje-reci/` | „reči koje se rimuju" |
| `/` | `/rime-za-pesmu/` | „rime za pesmu" |
| `/` | `/rime-za-rep/` | „rime za rep" |
| `/` | `/slogovi/` | „brojač slogova i karaktera" |
| `/rimovanje-reci/` | `/rime-za/dan/`, `/rime-za/nema/`, `/rime-za/sve/`, `/rime-za/srce/`, `/rime-za/ljubav/` | „šta se rimuje sa „dan“" (5 najtraženijih reči **koje imaju stranu**) |
| `/rime-za-rep/` | `/kako-napisati-pesmu/` | „kako napisati rep pesmu" |
| `/kako-napisati-pesmu/` | `/rime-za-rep/` | „rime za rep" |
| `/kako-napisati-pesmu/` | `/vrste-rima/` | „vrste rima" |
| `/kako-napisati-pesmu/` | `/slogovi/` | „koliko slogova ima reč" |
| `/rime-za-decu/` | `/rime-za-rodjendanske-pesmice/` | „rime za rođendan" |
| `/rime-za-rodjendanske-pesmice/` | `/rime-za-decu/` | „rime za decu" |
| `/rime-za-ljubavne-pesme/` | `/rime-za/srce/`, `/rime-za/ljubav/` | „šta se rimuje sa „srce“" |
| `/rime-za/<reč>/` (svaka) | `/rime-po-zavrsetku/` | „rime na „-<završetak>“" (generator zna završetak) |
| `/rime-za/<reč>/` (svaka) | `/slogovi/` | „brojač slogova" |
| `/vrste-rima/` | `/rimovanje-za-pocetnike/` | „šta je rimovanje" |

Napomena iz `reference_rimoteka_interno_povezivanje`: link u tab-traci ili futeru **nije**
interni link za Google – ovi idu u tekst strane.

### D3. Nove strane – **tek kad indeksiranost dozvoli** (08.09.: 75 % primljeno; pravilo je bilo „ispod 40 % ništa", a 999 `/rime-za/` još čeka obilazak)

| Redosled | Strana | Ključne reči | Zašto | Kako |
|---|---|---|---|---|
| 1 | `/rime-za/tebe/`, `/mene/`, `/ja/`, `/sam/`, `/ti/`, `/ona/`, `/nije/`, `/znam/`, `/ima/`, `/volim/`, `/da/`, `/ne/`, `/kad/`, `/kao/`, `/treba/`, `/tiho/`, `/mala/`, `/moja/`, `/dana/`, `/ljude/` (20 strana) | šta se rimuje sa tebe… | 20 od 47 najtraženijih reči; kod konkurenta vrh nedelje | u `gen_pages.py` dodati spisak `TRAZENE_RECI` (kao postojeći `GA_RECI`) koji zaobilazi filter „sadržajne"; **ne** ukidati filter – on i dalje sprečava stotine strana za „ili", „ali" |
| 2 | `/rime-za/ana/`, `/anja/`, `/ivan/`, `/ivana/`, `/luka/`, `/petra/`, `/filip/`, `/jana/`, `/ema/`, `/marija/`, `/andrea/`, `/andrej/` (12 strana) | šta se rimuje sa ana, rime za imena | 12 od 12 u rečniku, 0 strana; rođendanske pesmice se pišu za ime | isti spisak; kad bude više podataka, 30 najčešćih imena iz matične knjige, ne nagađanje |
| 3 | `/rime-za-rodjendan/` kao **preusmerenje** (301) na `/rime-za-rodjendanske-pesmice/` – ne nova strana | rime za rodjendan | ljudi kucaju kraći oblik | samo u `nginx.conf`, bez sadržaja |
| 4 | `/rimovanje-rijeci/` (ijekavska strana alata) | rimovanje riječi, riječi koje se rimuju, rime za djecu | 1.004 prikaza, 46 klikova bez ijedne strane | **tek posle** D1 – prvo videti koliko rečenica sa „riječi" na `/` i `/rimovanje-reci/` podigne CTR ijekavskih upita sa 4,6 % (granica: preko 8 % znači da nova strana nije potrebna) |
| 5 | `/kako-napisati-rep/` | kako napisati rep, rep tekst, rime za freestyle | 4 predloga | tek ako h2 na `/rime-za-rep/` ne donese klik za 30 dana |
| 6 | `/sinonimi/` | sinonimi za lepo, dobro, ljubav… | 10 predloga, alat ima podatke | najniži prioritet – druga namera od rima |

**Ne praviti:** strane za „rime za svadbu" i „rime za novu godinu" već postoje, a Google
nema nijedan predlog za njih – ne dodavati još strana za prilike bez dokaza potražnje
(uskrs, božić, jesen, škola).

---

## Šta ovaj spisak NE zna

| Ograničenje | Posledica |
|---|---|
| Google predlozi nemaju broj pretraga | važnost je rangirana po broju pojava kroz upite i podešavanja, ne po stvarnoj potražnji; jedini pravi brojevi su iz Search Console |
| WebSearch radi iz SAD | redosled rezultata (npr. forum Krstarice prvi) ne mora važiti u Srbiji |
| igrarecima.com i rhymebook.com nisu otvoreni | podaci o njima su iz Google naslova, ne sa sajta |
| Nije provereno koje od 198 reči bez strane imaju bar 10 rima u rečniku | pre pravljenja strana iz D3 to proveriti u `gen_pages.py` (prag koji već postoji za ostale reči) |
| rimovanje.com kroz `curl` vraća isti naslov za sve strane | moguće je da pravi naslov strane po reči daje tek posle JavaScript-a; Google prikazuje „Rimovanje riječi reci – Rimovanje.com" |
