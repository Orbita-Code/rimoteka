# Tekst na glavnim stranama — pregled 31.07.2026

> Sve tvrdnje o alatu proverene u `public/app.js`. Nijedan broj nije napisan iz glave —
> prebrojan je u fajlu (komanda u odeljku „Prebrojano“). Nijedan fajl nije menjan;
> ovo je predlog koji čeka odobrenje vlasnice, rečenicu po rečenicu.

---

## Ocena po stranama

| Strana | Ocena /10 | Glavni problem u jednoj rečenici |
|---|---|---|
| `/` (početna) | **7** | Tekst kaže da su rime „rangirane po kvalitetu, od savršenih do bliskih“, a alat ih deli po **broju slogova** i asonancu uopšte ne prikazuje dok ne štikliraš kvačicu. |
| `/rimovanje-reci/` | **3** | Najposećenija podstrana (646 pregleda) tvrdi neistinu o redosledu rima, objavljuje spisak traženih reči i šalje čoveka „na početnu stranu“ iako alat stoji tu, iznad tog teksta. |
| `/recnik-srpskog-jezika/` | **6** | Dva broja koji rastu (270.000 i 13.000), opis od 176 znakova koji Google preseca, a najjača stvar — objašnjenje uz **svaku** reč — sakrivena je u drugu rečenicu. |
| `/pisanje-pesama/` | **8** | Odličan tekst sa jednim brojem koji raste i predugačkim opisom (183 znaka). |
| `/kako-napisati-pesmu/` | **5** | Četiri koraka koje bi napisao svako; nema nijedne rečenice koju samo Rimoteka može da kaže, a ponavlja i netačnu tvrdnju o „rangiranju po kvalitetu“. |
| `/rimovanje-za-pocetnike/` | **4** | Najtanja strana na sajtu — tri pasusa od po jedne rečenice — i tvrdi da alat „pokazuje kvalitet svake rime“, što ne radi. |
| `/klasici/` | **8** | Sadržajno najbolja strana; smeta samo opis od 185 znakova i to što nigde ne piše čije su pesme. |
| `/igra-rimovanja/` | **7** | Pitanje „je li primerena deci“ odgovoreno sa „jeste“, a puna zaštita radi tek kad se uključi dečji režim (`app.js:4137`). |
| `/404.html` | **3** | Jedina strana na sajtu koja persira („Vratite se…“), i to u opisu koji Google prikazuje. |

---

## `/` (početna) — koga otvara i šta hoće

Čoveka koji je ukucao „rimovanje“ ili „rimoteka“ i hoće **odmah** da ukuca reč i dobije rimu; tekst ispod alata postoji samo da mu pokaže da ovde ima i sve ostalo za pisanje pesme.

> ⚠️ **Naslov i opis početne su promenjeni 30.07.2026** baš zbog upita `recnik rima`
> (204 prikaza, 0 klikova), a merenje je zakazano za **13.08.2026**
> (`AUDIT/analitika/2026-07-30.md`). Ako se sada opet promene, 13.08. se neće znati
> šta je izazvalo šta. **Preporuka: naslov ne dirati do 13.08.** Opis ipak menjam,
> jer sadrži broj koji raste — ali to je jedina izmena u zaglavlju i datum se zavodi.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Rimoteka je besplatan rečnik rima na srpskom jeziku. Upiši reč i odmah dobiješ sve reči koje se rimuju sa njom — rangirane po kvalitetu, od savršenih do bliskih rima, sa brojem slogova uz svaku. Rečnik ima preko 270.000 reči i uz svaku ide objašnjenje, pa vidiš i šta reč znači pre nego što je staviš u stih.“ | „Rimoteka je besplatan **rečnik rima** na srpskom jeziku. Upiši reč i odmah dobiješ sve reči koje se rimuju sa njom. Na vrhu, pod **Najbolje rime**, stoje one sa istim brojem slogova kao tvoja reč — takve najlepše legnu na kraj stiha. Ispod, pod **Dobre rime**, idu duže i kraće, pa ako ti u stihu fali slog, spustiš se niže. Uz svaku reč piše koliko ima slogova i šta znači, pa nećeš staviti u pesmu reč koju ne poznaješ.“ | `app.js:942–948` sortira **prvo po blizini broja slogova**, pa po dužini zajedničkog završetka, pa po učestalosti. `app.js:963–964` deli na `best` (isti broj slogova) i `good` (drugi broj slogova). Nigde nema podele „savršene → bliske“. Asonanca (`app.js:1039`) izlazi **samo** ako je kvačica „i šire (slabije) rime“ uključena. Broj 270.000 je broj koji raste. |
| 2 | „Rimoteka nalazi savršene (čiste) rime, dobre rime i šire, asonantne rime, i rangira ih po kvalitetu. Rezultate možeš filtrirati po broju slogova da lakše nađeš reč koja se uklapa u stih. Sve vrste su objašnjene na strani vrste rima.“ *(Česta pitanja: „Kakve rime Rimoteka pronalazi?“)* | „Prvo dobiješ čiste rime, podeljene u dve grupe: **Najbolje rime** imaju isti broj slogova kao tvoja reč, **Dobre rime** su duže ili kraće. Kad ti treba slobodniji zvuk, štikliraš **„i šire (slabije) rime“** pa se ispod pojave i asonance — rime koje se poklapaju samo u samoglasnicima. Sve tri grupe možeš da suziš na tačan broj slogova. Vrste rima su objašnjene na strani **vrste rima**.“ | Isti dokaz. Ovako naslovi u tekstu doslovno odgovaraju naslovima koje čovek vidi u alatu (`app.js:991`, `:1003`, `:1039`) — sada ne odgovaraju nijednom. |
| 3 | „Upiši reč u polje „Rime“ i klikni „Nađi rime“. Rimoteka odmah izlistava sve reči koje se rimuju, rangirane po kvalitetu rime, uz mogućnost filtriranja po broju slogova.“ *(Česta pitanja: „Kako da pronađem rime za neku reč?“)* | „Upiši reč u polje na vrhu strane i klikni **„Nađi rime“**. Prvo izlaze rime sa istim brojem slogova kao tvoja reč, pa duže i kraće. Ako ti treba rima od tačno dva ili tri sloga, klikni taj broj iznad liste.“ | Tab se u sučelju zove **„Rimovanje reči“**, ne „Rime“ (`index.html:135`) — tekst upućuje na dugme koje ne postoji pod tim imenom. Ostalo isto kao gore. |
| 4 | „Rimovanje reči je pronalaženje reči koje se slično završavaju i skladno zvuče na kraju stiha. Rimoteka za svaku reč odmah pronalazi najbolje i dobre rime, pa je rimovanje brzo i lako — za pesme, tekstove i rep.“ | „Rimovanje reči je traženje reči kojima se poklapaju glasovi na kraju — od poslednjeg naglašenog samoglasnika nadalje. To je ono što stih drži na okupu: *nada — livada*, *srce — lice*. Rimoteka ti za svaku reč izbaci ceo spisak, pa biraš.“ | „brzo i lako“ je zabranjeni par (izaberi jedno; agent, odeljak 1). Definicija bez naglašenog samoglasnika je netačna — to je ono što pesnika najviše zanima, i po tome se sortira. |
| 5 | „Unesi reč i odmah pronađi sve rime — piši pesme, tekstove i rep uz alat koji broji slogove i čuva beleške.“ *(podnaslov ispod H1)* | „Upiši reč i odmah dobiješ sve rime. Uz svaku piše koliko ima slogova i šta znači — a pesmu možeš tu i da napišeš.“ | „Unesi“ je iz obrasca, ne iz govora; ceo sajt inače koristi „upiši“ (`index.html:154`, `app.js:889`). Prednost Rimoteke je **objašnjenje uz rimu** — nje u podnaslovu nema, a jedina je stvar koju konkurencija nema (prebrojano: 272.746 od 272.746 reči ima objašnjenje). |
| 6 | Modal „Rimoteka Pro“: „📊 Napredna analiza — metar, ritam, šema rime **uskoro**“ · „💾 Čuvanje u oblaku — pesme na svim uređajima **uskoro**“ · „📤 Izvoz u PDF/DOCX — profesionalni format **uskoro**“ | **Obrisati sve tri stavke sa oznakom „uskoro“.** Ostaje: „🚫 Bez reklama“ · „🎯 Prioritetna podrška — odgovor u roku od 24 h“ · „⭐ Pro oznaka — podržavaš razvoj Rimoteke“. | Tri od šest stavki koje čovek plaća **ne postoje**. Uz to su dve od njih **već besplatne**: metar i šema rime rade u beležnici (`index.html:218` dugme „prikaži metar“, `app.js` šema rime u beležnici), a „štampaj / PDF“ takođe stoji u besplatnoj traci (`index.html:218`). Naplaćivati ono što na istom ekranu piše besplatno je najbrži način da izgubiš poverenje. |
| 7 | „Otključaj pun potencijal Rimoteke — bez reklama, sa naprednim alatima za pisanje.“ | „Rimoteka je i ostaje besplatna. Pro je za one koji hoće da je održe u životu — dobiješ prostor bez reklama i brz odgovor kad nešto zapne.“ | „Otključaj pun potencijal“ je prevedena engleska fraza i sugeriše da je besplatna verzija osakaćena — a nije. Na sajtu **trenutno nema nijedne reklame**, pa „bez reklama“ kao glavno obećanje ne znači ništa dok ih ne bude. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rimovanje reči na srpskom — rime, slogovi, pesme \| Rimoteka | **ne dirati do 13.08.2026** (merenje u toku) | 59 |
| Opis | Rimovanje reči na srpskom jeziku, objašnjenje svake reči, brojanje slogova i karaktera, pisanje pesama i igra rimovanja. 270.000 reči, besplatno. | Rimovanje reči na srpskom jeziku: rime, značenje svake reči, brojanje slogova, beležnica za pisanje pesama i igra rimovanja. Besplatno i bez reklama. | sada 145 → **149** |

---

## `/rimovanje-reci/` — koga otvara i šta hoće

Čoveka koji je u Google ukucao „rimovanje reči“ ili „rečnik rima“ i hoće da ukuca svoju reč — alat je **na toj strani**, iznad teksta, i tekst mora da ga vodi u njega, a ne nazad na početnu.

Ova strana se piše **ispočetka**. Ispod je ceo gotov tekst, spreman za `build/gen_pages.py`.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Rimovanje reči na srpskom, za sekundu: upišeš reč i Rimoteka izlista sve rime — sa brojem slogova, značenjem i sinonimima, besplatno i bez reklama. Rečnik ima preko 270.000 srpskih reči, a rime su poređane od najčešćih ka manje poznatim, pa prve koje vidiš jesu i one koje ljudi zaista koriste. Evo reči za koje se rime najviše traže: ljubav, srce, duša, sreća, tuga, nada, more, nebo, sunce, mesec, zvezda, kiša, cvet, oči, ruka, put, noć, dan, vetar, reka, pesma, život, san, svet.“ | **Rimovanje reči** na srpskom jeziku: upiši reč u polje iznad i odmah vidiš **sve reči koje se rimuju** sa njom — uz svaku piše koliko ima slogova i šta znači.<br><br>Treba ti **rima za pesmu**, za rođendansku čestitku, za rep ili za pesmicu detetu? Upiši reč i to je to. Ne prijavljuješ se, ne plaćaš ništa i nema reklama.<br><br>Rime ne izlaze kako stigne. Prvo dobiješ one koje imaju **isti broj slogova** kao tvoja reč — takve najlepše legnu na kraj stiha. Posle njih idu duže i kraće, pa ako ti u stihu fali slog, samo se spustiš niže.<br><br>Uz svaku reč piše i šta znači, pa nećeš staviti u pesmu reč koju ne poznaješ. A ako se reč rimuje ali ti ne odgovara po smislu, tu su **sinonimi**: zameniš poslednju reč u stihu i tražiš rimu za nju.<br><br>Rimoteka razume i **ćirilicu i latinicu**, i ekavicu i ijekavicu. Kad pišeš za decu, uključiš **dečji režim** pa ostaju samo reči primerene deci.<br><br>Kod nas ne moraš da otvaraš pet strana. **Rečnik rima**, značenje svake reči, **brojanje slogova** i beležnica u kojoj pišeš pesmu — sve je na jednom mestu. | Tri greške u jednom pasusu. (a) **„poređane od najčešćih ka manje poznatim“ je neistina** — `app.js:942–948` sortira prvo po blizini broja slogova, pa po dužini zajedničkog završetka, a učestalost (`RANK`) je **treće i najslabije** merilo. (b) Spisak od 24 reči je **ručno otkucan** u `build/gen_pages.py:1259` i predstavljen kao podatak o pretragama — nije, a i da jeste, ne objavljuje se (uputstvo konkurenciji). (c) 270.000 je broj koji raste; danas ih je 272.746. |
| 2 | „Rečnik ima preko 270.000 srpskih reči, uz frekvencijske podatke koji najčešće i najkorisnije rime stavljaju na vrh liste.“ *(Česta pitanja: „Koliko reči ima u rečniku?“)* | „Rečnik pokriva srpski jezik u celini i stalno se dopunjuje — uz svaku reč ide i objašnjenje. Na vrh liste idu rime sa **istim brojem slogova** kao tvoja reč; učestalost razdvaja samo one koje su po tome izjednačene.“ | Ista neistina, drugi put na istoj strani. `app.js:948` — `RANK` se poziva **tek posle** dva jača merila, i to samo kad su oba izjednačena. |
| 3 | „1. Upiši reč u polje **na početnoj strani** — može latinicom ili ćirilicom. 2. Klikni „Nađi rime“ i dobićeš sve rime iz rečnika. 3. Filtriraj po broju slogova da rima stane u ritam tvog stiha.“ | „1. Upiši reč u polje **iznad** — može latinicom ili ćirilicom. 2. Klikni **„Nađi rime“** ili pritisni Enter. 3. Ako ti treba rima od tačno dva ili tri sloga, klikni taj broj iznad liste pa ostaju samo takve. To je sve.“ | Alat je **na ovoj strani** — `build/gen_pages.py:378` („Živi alat za rime na tematskoj strani (za sada samo `/rimovanje-reci/`)“), potvrđeno i u gotovom HTML-u: polje, dugme „Nađi rime“, kockica i kvačice stoje iznad H1. Slanje na početnu je gubljenje čoveka koji je već stigao. Enter radi — `app.js:1044`. |
| 4 | „Čista rima se poklapa u potpunosti (**ljubav — nesloga** nije, ljubav — grbav jeste). Bliska rima, ili asonanca, poklapa se samo u samoglasnicima i zvuči slobodnije — često se koristi u repu. Rimoteka prikazuje i jedne i druge, pa biraš šta ti treba.“ | „Čiste rime se poklapaju do kraja: **nada — livada**, **srce — lice**. Bliske rime, asonance, poklapaju se samo u samoglasnicima: **nada — mama**. Zvuče slobodnije i često se koriste u repu. Rimoteka daje i jedne i druge — bliske uključiš kvačicom **„i šire (slabije) rime“** ispod polja.“ | „ljubav — nesloga“ nije ni blizu rime, pa primer ne objašnjava ništa — objašnjava se **šta jeste**, ne šta nije. Uz to: asonance se **ne prikazuju same od sebe** (`app.js:1039` je unutar grane `if(loose)`), pa je „prikazuje i jedne i druge“ netačno dok se kvačica ne uključi. Ime kvačice prepisano doslovno iz `index.html:171`. |
| 5 | „Za dečje pesmice rečnik se može uključiti u dečji režim, koji izbacuje neprikladne reči.“ | „Psovke i vulgarne reči Rimoteka **nikad** ne prikazuje. Kad pišeš pesmicu detetu, uključi **„dečji režim“** pa se izbacuju i nasilne i seksualne reči. Više o tome na strani **rime za decu**.“ | Provereno u kodu: `BLOCKED` (`app.js:176`) se izbacuje **uvek**, u sve tri grane (`:923`, `:976`, `:1031`); `KIDS_BLOCKED` (`app.js:179`) samo kad je `kidsMode` uključen. Sada tekst propušta jaču polovinu obećanja — da je sajt čist i **bez** dečjeg režima. |
| 6 | „Rimoteka je pravljena za srpski jezik — prepoznaje ćirilicu i latinicu, ekavicu i ijekavicu i naše nastavke. Uz rime dobijaš i značenje svake reči — objašnjenje ima svaka reč u rečniku, sinonime kad ti rima ne odgovara po smislu, bliske rime za slobodniji zvuk, brojač slogova i karaktera, beležnicu u kojoj pišeš pesmu i vidiš rime u boji, i igru rima za uvežbavanje. Sve besplatno, bez registracije i bez reklama.“ *(H2 „Zašto Rimoteka, a ne bilo koji rimer?“)* | *(naslov: **Šta Rimoteka ima, a drugi rimeri nemaju**)*<br>„**Objašnjenje uz svaku reč** — ne moraš da otvaraš rečnik u drugom prozoru. **Sinonime**, kad ti se rima ne uklapa po smislu. **Dečji režim**. **Brojanje slogova.** I **beležnicu** u kojoj pišeš pesmu i vidiš koje se reči rimuju, u boji, dok kucaš. Sve besplatno, bez prijave i bez reklama.“ | Rečenica od 47 reči sa devet nabrajanja — čovek na telefonu je ne pročita. „Objašnjenje ima svaka reč u rečniku“ je **tačno** (prebrojano: 272.746 od 272.746) i to je najjača stvar koju imamo — zato ide prva i sama, a ne peta u nizu. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rimovanje reči — pronađi rimu za svaku srpsku reč \| Rimoteka | **Rimovanje reči — rečnik rima za svaku srpsku reč \| Rimoteka** | sada 60 → **59** |
| Opis | Rimovanje reči na srpskom, za sekundu: upišeš reč i Rimoteka izlista sve rime — sa brojem slogova, značenjem i sinonimima, besplatno i bez reklama. | Rimovanje reči na srpskom jeziku: upiši reč i dobij sve rime, a uz svaku broj slogova i objašnjenje šta znači. Rečnik rima, besplatno i bez reklama. | sada 147 → **148** |

> **Zašto baš „rečnik rima“ u naslovu:** `recnik rima` je 30.07. imao **204 prikaza i 0 klikova**
> (`AUDIT/analitika/2026-07-30.md`) — Google nas već pokazuje, a te fraze na strani nema nigde.
> To je jedina izmena na ovoj strani koja stoji na izmerenom podatku. Meri se **13.08.2026**.

### Blok sa linkovima *(24 reči izlaze iz uvodnog pasusa u svoj blok)*

> ### Rečnik rima — gotove strane
> Za ove reči rime su već složene:
> `ljubav` `srce` `duša` `sreća` `tuga` `nada` `more` `nebo` `sunce` `mesec` `zvezda` `kiša` `cvet` `oči` `ruka` `put` `noć` `dan` `vetar` `reka` `pesma` `život` `san` `svet`

Iste reči, isti linkovi, ali bez rečenice „evo reči za koje se rime najviše traže“ — dakle bez tvrdnje koju ne možemo da dokažemo i bez uputstva konkurenciji.

---

## `/recnik-srpskog-jezika/` — koga otvara i šta hoće

Čoveka koji traži **šta neka reč znači** ili mu treba reč na „-ost“ za stih; on je pola koraka od rima, i tekst mora da ga prevede tamo.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Rečnik srpskog jezika sa preko 270.000 reči — i uz svaku objašnjenje. Reč možeš tražiti i po slovima — onu koja se završava na „-ost“, počinje na „cvet“ ili negde u sebi ima „zvezd“ — a uz svaku stoji broj slogova i značenje.“ | „**Rečnik srpskog jezika** u kom **svaka reč ima objašnjenje**. Reč možeš tražiti i po slovima: onu koja se završava na **-ost**, počinje na **cvet** ili negde u sebi ima **zvezd**. Uz svaku stoji broj slogova i značenje, pa se odmah vidi da li ti staje u stih.“ | 270.000 je broj koji raste (danas 272.746). „Svaka reč ima objašnjenje“ je **jače od bilo kog broja** i tačno je — prebrojano, 272.746 od 272.746. Broj koji raste zamenjen je tvrdnjom koja ne stari. |
| 2 | „Preko 270.000 reči, i uz svaku objašnjenje značenja. Za više od 13.000 reči tu su i sinonimi.“ *(Česta pitanja: „Koliko reči ima rečnik?“)* | „Rečnik pokriva srpski jezik u celini i stalno se dopunjuje. **Uz svaku reč ide objašnjenje**, a za veliki broj reči i **sinonimi** — kad ti rima ne odgovara po smislu, zameniš reč bližom pa tražiš rimu za nju.“ | Dva broja koja rastu u jednoj rečenici (danas: 272.746 reči, 13.503 reči sa sinonimima). Odgovor je usput pretvoren u razlog da čovek ode u rime — sada je ćorsokak. |
| 3 | „Uz svaku reč u rezultatima stoji dugme za objašnjenje — kratka definicija iz rečnika. Objašnjenje ima svaka reč u rečniku.“ | „Klikni na dugme pored reči i otvara se kratka definicija. **Objašnjenje ima svaka reč u rečniku** — nema reči koju ćeš potražiti a da ostaneš bez odgovora.“ | Tvrdnja je tačna, ali stoji kao dodatak posle tačke. Prebacuje se napred i dobija posledicu koju čovek oseti. |
| 4 | „Najčešća pretraga kod pisanja: uneseš završetak i dobiješ sve reči koje se tako završavaju. Korisno kad tražiš određen nastavak, a ne poklapanje po zvuku — za rimu je bolji pretraživač rima.“ | „Upišeš završetak i dobiješ sve reči koje se tako završavaju. Ovo traži **slova**, ne zvuk — zato ti za rimu bolje radi **rimovanje reči**, koje gleda poklapanje od poslednjeg naglašenog samoglasnika.“ | „Najčešća pretraga kod pisanja“ je tvrdnja o prometu koju ne merimo (i ne objavljujemo). „Uneseš“ → „upišeš“, radi doslednosti sa ostatkom sajta. Razlika slova/zvuk je ono što pesnik stvarno treba da zna. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rečnik srpskog jezika — pretraga reči i značenja \| Rimoteka | **Rečnik srpskog jezika — značenje svake reči, pretraga \| Rimoteka** | sada 59 → **64** |
| Opis | Rečnik srpskog jezika sa preko 270.000 reči i objašnjenja. Traži reč po značenju ili po slovima — koje se završavaju, počinju ili sadrže zadata slova, uz broj slogova za svaku. | Rečnik srpskog jezika sa objašnjenjem uz svaku reč. Traži reč koja se završava, počinje ili sadrži zadata slova — a uz svaku stoji i broj slogova u njoj. | sada **176 (Google ga preseca)** → **153** |

---

## `/pisanje-pesama/` — koga otvara i šta hoće

Pesnika i tekstopisca koji hoće da **piše**, a ne da traži — i koji treba da vidi da mu rime dolaze same, bez izlaska iz teksta.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Klikni na bilo koju reč u pesmi i sa strane dobiješ rime baš za nju. Klik na rimu je ubacuje u stih, na mesto kursora. Ne moraš da otvaraš drugu stranu ni da prekidaš misao — **a rečnik iza toga ima preko 270.000 reči**.“ | „Klikni na bilo koju reč u pesmi i sa strane dobiješ rime baš za nju. Klik na rimu je ubacuje u stih, na mesto kursora. Ne moraš da otvaraš drugu stranu ni da prekidaš misao — **a iza toga stoji ceo srpski rečnik, sa objašnjenjem uz svaku reč**.“ | Broj koji raste. Zamena nije samo bezbednija nego i jača: „objašnjenje uz svaku reč“ je tačno (272.746 od 272.746) i konkurencija to nema. |
| 2 | „Ovde se pesma i piše, ne samo rimuje.“ | ostaviti — **ne dirati** | Najbolja rečenica na sajtu. U šest reči kaže celu razliku prema konkurenciji. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Pisanje pesama — beležnica sa rimama, slogovima i metrom \| Rimoteka | ostaviti | 67 |
| Opis | Piši pesmu i odmah vidi rime za reč na kojoj si, broj slogova po stihu, šemu rime i ritam. Besplatna beležnica za pesnike, tekstopisce i repere — tekst ostaje sačuvan na tvom uređaju. | Piši pesmu i odmah vidiš rime za reč na kojoj si, broj slogova po stihu, šemu rime i metar. Besplatna beležnica — tekst ostaje na tvom uređaju, kod tebe. | sada **183 (presečen)** → **153** |

---

## `/kako-napisati-pesmu/` — koga otvara i šta hoće

Čoveka koji nikad nije napisao pesmu, a mora ili hoće — i kome treba **prvi stih**, ne teorija.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Pisanje pesme je veština koja se uči. Evo jednostavnih koraka — od ideje do gotovog stiha — uz alat koji ti pomaže oko rime i ritma.“ | „**Kako napisati pesmu**: izabereš temu, napišeš prvi stih, nađeš rimu za poslednju reč i ujednačiš broj slogova. Ispod je svaki korak razložen — i uz svaki dugme kojim to odmah uradiš, na ovom sajtu.“ | Prva rečenica je jedina koju Google prikazuje, a sada ne sadrži ni odgovor ni ključnu frazu — samo najavljuje da će nešto biti rečeno (zabranjeno, agent, odeljak 1). Nova rečenica je i **odgovor koji Google može da citira** u isečku. |
| 2 | „Za ključne reči na kraju stihova potraži rime. U Rimoteci upišeš reč i odmah dobiješ najbolje rime, **rangirane po kvalitetu**.“ | „Napiši stih do kraja, pa uzmi njegovu poslednju reč i potraži joj rimu. Prve rime koje dobiješ imaju **isti broj slogova** kao tvoja reč — one najlakše legnu na kraj sledećeg stiha.“ | Ista netačnost kao na početnoj i na `/rimovanje-reci/`, treći put. `app.js:942–948` i `:963–964`. |
| 3 | „Odluči o čemu pišeš i koje osećanje želiš da preneseš — ljubav, tuga, radost, sećanje. Jasna tema drži pesmu na okupu.“ | „Odluči o čemu pišeš i šta hoćeš da se oseti — ljubav, tuga, radost, sećanje na nekoga. Napiši to jednom rečenicom, običnim rečima, pre nego što uopšte kreneš da rimuješ. Ta rečenica ti je kasnije merilo: sve što joj ne služi, izbaci.“ | Postojeći korak kaže **šta**, ne **kako** — pa čovek ostane tačno tamo gde je bio. Konkretan postupak je razlog da ostane na strani. |
| 4 | „Refren je deo koji se ponavlja i najlakše se pamti. Neka bude kratak, melodičan i emotivno jak.“ | „Refren je ono što se ponavlja i što se jedino i pamti. Neka bude kratak i neka mu svi stihovi imaju sličan broj slogova — proveri ih **brojačem slogova**. Ako se refren teško izgovara naglas, neće se ni pevati.“ | Tri prideva u nizu („kratak, melodičan i emotivno jak“) su zabranjeni obrazac. Zamenjeni su proverom koju čovek može da uradi na sajtu — što je i razlog da ostane. |
| 5 | *(nedostaje peti korak)* | **5. Pročitaj naglas i doteraj** — „Pesma se proverava uvom, ne okom. Pročitaj je naglas i slušaj gde zapneš — tu je ili slog viška ili rima koja ne stoji. Otvori **beležnicu za pisanje pesama** i prepiši je tamo: pored svakog stiha vidiš broj slogova i slovo šeme rime, pa se odmah vidi šta štrči.“ | Strana od četiri koraka završava se u vazduhu i nikuda ne vodi. Ovo je jedini korak koji vodi pravo u naš najjači alat, a i tačan je (`/pisanje-pesama/` prikazuje slogove i šemu rime uz svaki stih). |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Kako napisati pesmu — koraci, rima i ritam \| Rimoteka | **Kako napisati pesmu — od prve ideje do gotovog stiha \| Rimoteka** | sada 53 → **63** |
| Opis | Kako napisati pesmu ili tekst: izbor teme, rima, ritam i broj slogova, refren. Praktični koraci i besplatan alat za rime i brojanje slogova. | Kako napisati pesmu korak po korak: tema, rima, broj slogova, refren i doterivanje. Uz svaki korak alat kojim to odmah uradiš — besplatno, bez prijave. | sada 140 → **151** |

---

## `/rimovanje-za-pocetnike/` — koga otvara i šta hoće

Čoveka koji prvi put traži rimu i ne zna ni šta da očekuje — njemu treba **jedan pokušaj koji uspe**, ne definicija.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Rimovanje nije magija — to je veština koju svako može da nauči. Ovaj vodič objašnjava osnove rimovanja i pokazuje kako Rimoteka može da ti bude prvi saveznik.“ | „**Rimovanje** je traženje reči koje se na kraju isto čuju — *nada* i *livada*, *srce* i *lice*. Ako ti to sada zvuči teško, nije: upišeš svoju reč, a spisak rima ti stigne gotov. Ispod je sve što treba da znaš da bi napisao prvi stih.“ | Sadašnji uvod ne odgovara ni na jedno pitanje — samo najavljuje vodič (zabranjeno). „Prvi saveznik“ je prazna reč. Nova prva rečenica sadrži ključnu frazu i **odmah odgovara**, pa je Google može citirati. |
| 2 | „Rima je poklapanje glasova na kraju stihova. Najčešće se rimuju poslednji naglašeni slogovi dve ili više reči.“ | „Rima je poklapanje glasova na kraju dve reči, počevši od **poslednjeg naglašenog samoglasnika**. Zato se *nada* i *livada* rimuju, a *nada* i *rada* — koliko god ličile — ne zvuče isto jako, jer im naglasak ne pada na isto mesto.“ | Sadašnja druga rečenica je nerazumljiva („rimuju se slogovi dve ili više reči“). Naglašeni samoglasnik je i osnova onoga po čemu alat sortira (`app.js:936–940`, komentar iznad sortiranja) — pa tekst i alat govore istu stvar. |
| 3 | „Parna rima (AABB), ukrštena rima (ABAB) i obgrljena rima (ABBA) su najčešće šeme za početnike.“ | „**Parna (AABB)** — rimuju se prvi sa drugim, treći sa četvrtim. Najlakša, i tako je pisana većina dečjih pesama.<br>**Ukrštena (ABAB)** — prvi sa trećim, drugi sa četvrtim. Zvuči odmerenije, otud je ima najviše u klasičnoj poeziji.<br>**Obgrljena (ABBA)** — prvi sa četvrtim, a dva unutrašnja međusobno.<br>Kad ovo hoćeš da vidiš na pravim pesmama, otvori **klasike** — tamo uz svaki stih stoji slovo šeme.“ | Jedna rečenica sa tri skraćenice ne uči nikoga ničemu. Slova se ovde objašnjavaju, a `/klasici/` ih **stvarno prikazuje uz svaki stih** — što je i razlog da čovek ostane na sajtu. |
| 4 | „Unesi reč u polje za pretragu, klikni „Nađi rime“ i biraj najbolju rimu **po kvalitetu** i broju slogova.“ | „Upiši reč, klikni **„Nađi rime“** i dobićeš dve grupe: **Najbolje rime** imaju isti broj slogova kao tvoja reč, **Dobre rime** su duže ili kraće. Ako ti stih traži tačno tri sloga, klikni **3** iznad liste pa ostaju samo takve.“ | Alat **ne prikazuje kvalitet pojedinačne rime** — nema ni ocene, ni zvezdica, ni oznake uz reč. Postoje samo naslovi grupa (`app.js:991`, `:1003`, `:1039`). Tekst obećava nešto što čovek na ekranu neće naći. |
| 5 | „Čista rima je jača od asonance. **Rimoteka ti pokazuje kvalitet svake rime** — odaberi one koje najbolje zvuče.“ *(Česta pitanja: „Kako da znam koja rima je bolja?“)* | „Čista rima je jača od bliske. Rimoteka ti čiste rime daje prve, u grupama **Najbolje rime** i **Dobre rime**, a bliske tek kad štikliraš **„i šire (slabije) rime“**. Znači: što je viša na spisku, to bolje legne — ali poslednju reč ima uvo, ne alat.“ | Ista netačna tvrdnja, drugi put na istoj strani. Uz to: asonance uopšte ne izlaze bez kvačice (`app.js:1039` je unutar `if(loose)`). |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rimovanje za početnike — kako pronaći i koristiti rime \| Rimoteka | **Rimovanje za početnike — kako se traži i bira rima \| Rimoteka** | sada 65 → **61** |
| Opis | Rimovanje za početnike: osnovni pojmovi, vrste rima, kako pronaći rime i pisati stihove. Besplatan vodič za sve koji žele da počnu. | Rimovanje za početnike: šta je rima, koje vrste rima postoje i kako da nađeš rimu za svoju reč. Kratak vodič i besplatan alat za rime, bez registracije. | sada 131 → **152** |

---

## `/klasici/` — koga otvara i šta hoće

Đaka, studenta i pesnika koji hoće da **vidi** kako izgleda šema rime na pravoj pesmi, a ne da je zamišlja.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Pesme velikih srpskih pesnika čija su dela u javnom vlasništvu.“ *(Česta pitanja: „Čije su pesme ovde?“)* | „Pesme srpskih pesnika čija su dela u javnom vlasništvu — Santić, Dučić, Dis, Rakić i drugi. Zato ih smemo prikazati u celini, a ti ih smeš i preuzeti i koristiti.“ | Odgovor koji ne odgovara: čovek pita **čije**, a dobija pravnu napomenu. *(Imena pesnika treba prepisati iz spiska pesama u kodu pre upisa — u ovom pregledu spisak nije otvaran, pa se navedena imena moraju proveriti.)* |
| 2 | „Najbolji način da naučiš rimu jeste da vidiš kako su je pravili oni koji su je umeli.“ | ostaviti — **ne dirati** | Tačno, kratko, i tačno na mestu gde treba da ubedi čoveka da skroluje dalje. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Srpske pesme — klasici sa šemom rime i brojem slogova \| Rimoteka | ostaviti | 64 |
| Opis | Poznate pesme srpskih pesnika sa označenom šemom rime (ABAB, AABB) i brojem slogova u svakom stihu. Vidi kako su veliki pesnici gradili ritam i rimu — i klikni na reč da joj nađeš rime. | Poznate srpske pesme sa šemom rime i brojem slogova uz svaki stih. Vidi kako su veliki pesnici gradili ritam i rimu — i klikni na reč da joj nađeš rime. | sada **185 (presečen)** → **152** |

---

## `/igra-rimovanja/` — koga otvara i šta hoće

Roditelja, učitelja i društvo — njima treba da za pet sekundi shvate **kako se igra**, a ne šta je rima.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Jeste. Reči koje se zadaju biraju se iz poznatog dela rečnika, a **neprimerene reči su isključene**.“ *(Česta pitanja: „Je li igra primerena deci?“)* | „Jeste. Zadate reči se biraju iz poznatog dela rečnika, pa nema arhaizama koje niko ne zna. Psovke i vulgarne reči su isključene uvek. Kad igraju mlađa deca, **uključi „dečji režim“** na strani sa rimama pa ispadaju i nasilne i seksualne reči.“ | `app.js:4137`: `randomCommonWord(x => !BLOCKED.has(x) && !(kidsMode && isKidsBlocked(x)) && imaRimu(x))`. `BLOCKED` (psovke) otpada **uvek**, ali `KIDS_BLOCKED` **samo ako je dečji režim uključen**. Sadašnji odgovor obećava punu zaštitu koja podrazumevano ne radi. |
| 2 | „Alat postaje igra: dobiješ reč, a ti nađeš rimu pre nego što istekne vreme. Igra se sam ili u društvu, sa poenima i nizovima — a usput se rečnik širi bez ijedne vežbe koja liči na zadatak.“ | „Dobiješ reč, a ti nađeš rimu pre nego što istekne vreme. Igra se sam ili u društvu, sa poenima i nizovima. Igra prima **samo prave srpske reči koje se stvarno rimuju** — pa se rečnik širi sam od sebe, bez ijedne vežbe koja liči na zadatak.“ | „Alat postaje igra“ je pisano iz ugla onoga ko je pravio sajt, ne onoga ko igra. Ubačena je tvrdnja koja je proverena i koja je jedini pravi razlog da ovo bude „vežba“ — `app.js:4228` odbija reč koje nema u rečniku, a `app.js:4097–4099` traži stvarnu rimu. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Igra rimovanja — vežbaj rime na vreme, sam ili sa društvom \| Rimoteka | ostaviti | 69 |
| Opis | Besplatna igra rimovanja: dobiješ reč, nađeš rimu pre isteka vremena. Za jednog ili više igrača, sa poenima i nizovima. Zabavan način da deca i odrasli vežbaju rimu i bogate rečnik. | Dobiješ reč, nađeš rimu pre nego što istekne vreme. Igra rimovanja za jednog ili više igrača, sa poenima i nizovima. Besplatna je i ne traži prijavu. | sada **181 (presečen)** → **149** |

---

## `/404.html` — koga otvara i šta hoće

Čoveka koji je stigao na mrtav link — najčešće na `/rime-za/[reč]/` koje više nema — i koji za tri sekunde odlučuje da li ostaje.

| # | SADA PIŠE | TREBA DA PIŠE | Zašto (dokaz) |
|---|---|---|---|
| 1 | „Tražena stranica ne postoji. **Vratite se** na Rimoteku i **pronađite** rime, **brojite** slogove ili **pišite** pesme.“ *(meta description)* | „Ova strana ne postoji. Upiši reč i otvoriće se njena strana sa rimama, ili idi pravo na rečnik, brojanje slogova i beležnicu za pisanje pesama.“ | **Jedino persiranje na celom sajtu**, i to u tekstu koji Google prikazuje. Ceo ostatak sajta govori „ti“ (`app.js:889`, `index.html:154`). |
| 2 | „Ova stranica nije pronađena — možda je reč promenila oblik ili se preselila.“ | „Ove strane nema. Možda je link star, možda je reč napisana malo drugačije. Nema veze — upiši je ovde i vodim te pravo na njene rime.“ | „stranica nije pronađena“ je pasiv i prevod („page not found“). „reč promenila oblik“ je naš žargon iz generatora — čovek ne zna šta to znači. |
| 3 | „Upiši reč ovde — otvoriće se njena strana sa rimama.“ | ostaviti — **ne dirati** | Retko dobra 404 strana: umesto izvinjenja daje polje za unos. Ovo je razlog zašto ocena nije još niža. |
| 4 | „Ili idi na spisak svih strana sa rimama, brojač slogova ili beležnicu za pisanje pesama.“ | „Ili idi pravo na **rimovanje reči**, **brojanje slogova** ili **beležnicu za pisanje pesama**.“ | „spisak svih strana sa rimama“ vodi na `/rime-za/` — hub koji je po otvorenom nalazu **P11 zid od 2.000 linkova** (`CLAUDE.md`, odeljak 9b). Slati izgubljenog čoveka u zid od 2.000 linkova je najgori mogući sledeći korak. |

### Naslov i opis te strane

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Stranica nije pronađena — Rimoteka | **Ova strana ne postoji — Rimoteka** | sada 34 → **32** |
| Opis | Tražena stranica ne postoji. Vratite se na Rimoteku i pronađite rime, brojite slogove ili pišite pesme. | Ova strana ne postoji. Upiši reč i otvoriće se njena strana sa rimama, ili idi pravo na rečnik, brojanje slogova i beležnicu za pisanje pesama. | sada 103 → **143** |

> **Napomena, ne izmena:** na `/404.html` je `<h1>` **logotip**, a „404“ je `<h2>`. Na svim
> ostalim stranama logo nije `h1`. Po pravilu iz `CLAUDE.md` odeljak 8a **ne diram logo**
> ni CSS oko njega — prijavljujem i čekam odluku vlasnice.

---

## Mikrokopija u alatu

| Gde | Sada | Predlog | Zašto |
|---|---|---|---|
| Rezultati igre, `app.js:4317` | „🔥 **Combo master** (5x+)“ | „🔥 **Majstor niza** (5 zaredom)“ | Engleski na srpskom sajtu, na ekranu koji deca vide. |
| Rezultati igre, `app.js:4318` | „⚡ **Combo legend** (10x+)“ | „⚡ **Nezaustavljiv** (10 zaredom)“ | Isto. |
| Rezultati igre, `app.js:4319` | „🎯 **Perfect score**“ | „🎯 **Sve tačno**“ | Isto. Uz to je i najlepše postignuće, a jedino se ne razume. |
| Igra, `index.html:259` | dugme „**custom**“ (broj igrača) | „**više**“ | Engleska reč usred srpskih brojeva 1 · 2 · 3. |
| Igra, `index.html:284` | „**Start igre**“ | „**Počni igru**“ | Pola engleski, pola srpski. Ostatak sajta koristi glagole („Nađi rime“, „Traži“, „Proveri“). |
| Igra, `index.html:313` | placeholder „**upiši rimu...**“ | „**npr. ljubav — kubav**“ ili prosto „**upiši rimu**“ | Tri tačke umesto trotačke (…), a ceo sajt inače koristi „…“ (`index.html:210`, `:225`). Placeholder koji ponavlja naslov ne uči ničemu (agent, odeljak 4). |
| Rime, `index.html:154` | placeholder „**upiši reč (npr. devojčica)**“ | „**upiši reč — npr. ljubav**“ | Primer treba da bude reč koju čovek stvarno kuca. `ljubav` je prva u našem spisku popularnih rima i najčešća reč u toj vrsti pretrage; `devojčica` niko ne kuca prvu. Zagrada se izbacuje jer na 360 px pojede pola polja. |
| Beležnica, `index.html:222` | placeholder „**Naslov pesme (opciono)**“ | „**Naslov pesme, ako hoćeš**“ | „opciono“ je kancelarijski anglicizam; ovde je prostor da tekst zvuči kao čovek. |
| Beležnica, `index.html:218` | dugme „**sačuvaj rime**“ | „**sačuvaj rime u Omiljene**“ | Sada se ne zna gde se čuvaju. Idu u „Omiljene“ (`app.js:2799`, tab `index.html:141`), a čovek ih tamo ne traži. |
| Beležnica + Omiljene, `index.html:218` i `:332` | **dva različita dugmeta piše isto: „obriši sve“** | u beležnici: „**obriši pesmu**“ · u Omiljenima: ostaje „**obriši sve**“ | Isto dugme sa istim tekstom briše dve različite stvari, a beležnica je jedino mesto gde se gubi nepovratan rad. |
| Rime, `app.js:988` | „Nema rime za ovu reč. Probaj da uključiš „šire rime“ ispod.“ | „Nema čiste rime za ovu reč. Štikliraj **„i šire (slabije) rime“** ispod polja — tada ulaze i bliske rime. Ako i tada nema, probaj kraću reč ili neku drugu reč sa kraja stiha.“ | Kvačica se u sučelju zove **„i šire (slabije) rime“** (`index.html:171`), a poruka je zove „šire rime“ — čovek traži tekst koji ne postoji. Dodat je i drugi izlaz, da poruka ne bude ćorsokak (agent, odeljak 4). |
| Rečnik, `app.js:1230` | „**Nema reči koje odgovaraju.**“ | „Nema reči sa tim slovima. Probaj kraći niz — na primer **ost** umesto **nost** — ili promeni način pretrage gore.“ | Ćorsokak bez sledećeg koraka. Predlog kaže **zašto** i **šta sada**. |
| Beležnica, `app.js:2799` | toast „**Nema rima za čuvanje**“ | „Prvo klikni na reč u pesmi — rime za nju se pojave sa strane, pa ih onda sačuvaš.“ | Poruka kaže šta se nije desilo, a ne kako da se desi. |
| Beležnica, `app.js:2807` | toast „**Nema rima za preuzimanje**“ | „Nema još nijedne rime — klikni na reč u pesmi pa se rime pojave sa strane.“ | Isto. |
| Beležnica, `app.js:2820` | toast „**Nema teksta za preuzimanje**“ | „Beležnica je prazna — napiši prvi stih pa je preuzmi.“ | Isto, i usklađuje se sa `app.js:1912` gde već piše „Beležnica je prazna.“ |
| Beležnica, `app.js:2829` | toast „**Preuzeta pesma**“ | „**Pesma je preuzeta**“ | Krnja rečenica bez glagola; ostali toastovi su cele rečenice (`app.js:3844`, `:3874`). |
| Rime, `app.js:899` | „Učitavam rečnik… rime za tu reč stižu čim bude gotovo.“ | ostaviti — **ne dirati** | Poruka o čekanju napisana tačno kako treba: kaže šta se dešava i šta sledi. |
| Igra, `app.js:4228` | „Ta reč nije u rečniku — probaj drugu“ | ostaviti — **ne dirati** | Ne okrivljuje čoveka, kaže razlog i sledeći korak. Uzor za ostale poruke. |
| Beležnica, `app.js` (poruka o blokiranom skladištu) | „Čuvanje ne radi u ovom pregledaču (privatni režim ili blokirano skladište) — pesma se neće sačuvati na uređaju. Preuzmi je dugmetom „preuzmi pesmu“ da je ne izgubiš.“ | ostaviti — **ne dirati** | Najbolja poruka o grešci na sajtu: razlog, posledica, i tačno dugme koje spasava rad. |

---

## Šta radi odlično — ne dirati

| Šta | Zašto se ne dira |
|---|---|
| „**Ovde se pesma i piše, ne samo rimuje**“ (`/pisanje-pesama/`) | Cela razlika prema konkurenciji u šest reči. Kandidat da postane i podnaslov početne. |
| Ceo tekst strane `/klasici/` | Jedina strana koja uči tako što **pokazuje**, a ne objašnjava. Svaki pasus vodi u alat. |
| „Najbolji način da naučiš rimu jeste da vidiš kako su je pravili oni koji su je umeli.“ | Zna se odakle dolazi — od nekoga ko ovo radi, a ne od nekoga ko piše sajt. |
| Odeljak „Metar srpskog stiha“ (`/pisanje-pesama/`) | Šesterac, sedmerac, deseterac 4+6, dvanaesterac 6+6 — ovo pesnik prepozna kao znanje. Ovaj odeljak sam po sebi drži prva tri čitaoca sa spiska. |
| Poruka o blokiranom skladištu i poruka „Učitavam rečnik…“ | Uzorna mikrokopija: razlog, posledica, sledeći korak. |
| Polje za unos reči na `/404.html` | 404 koja umesto izvinjenja nudi da posao ipak obavi. |
| „Objašnjenje ima svaka reč u rečniku“ | **Tačno je** — 272.746 od 272.746. Najjača tvrdnja na sajtu; treba je ponoviti češće, ne rediti. |

---

## Šta sam odbacio kao lažan nalaz

| Sumnja | Provera | Presuda |
|---|---|---|
| „Objašnjenje ima svaka reč u rečniku“ zvuči kao preterivanje | Prebrojano: 272.746 reči u `reci.txt`, 282.852 unosa u `definicije.json`, poklapanje **272.746 / 272.746 = 100%** | **Tvrdnja je tačna** — ostaje, i to naglašena |
| „Psovke i vulgarne reči Rimoteka nikad ne prikazuje“ | `BLOCKED` (`app.js:176`) se primenjuje u sve tri grane rimovanja: `:923`, `:976`, `:1031` — bez ijednog uslova | **Tačno**, bez ograde |
| „Preko 270.000 reči“ — je li broj uopšte istinit? | 272.746 u `reci.txt` | Broj **jeste tačan danas**; menja se ne zato što laže nego zato što raste i stoji na oko 2.000 strana |
| „Za više od 13.000 reči tu su i sinonimi“ | `sinonimi.json` ima **13.503** ključa | Tačno danas; isti razlog za izbacivanje — broj raste |
| Sumnja da tekst „rangirane po kvalitetu“ ipak opisuje neki skriveni sistem ocena | Pretraženo `app.js` za oznaku kvaliteta uz pojedinačnu reč — postoje samo **naslovi grupa** (`:991`, `:1003`, `:1004`, `:1039`) i legenda (`:502`) | **Nema ocene po reči** — tvrdnja se briše sa obe strane gde stoji |
| Sumnja da `/igra-rimovanja/` prima bilo koju reč | `app.js:4228` odbija reč van rečnika; `:4097–4099` traži savršenu rimu ili asonancu | Tvrdnja „prihvata samo pravu srpsku reč koja se rimuje“ je **tačna** — ostaje |

---

## Prebrojano (komandom, 31.07.2026)

```
reci.txt                    272.746 reči
definicije.json             282.852 unosa
reči sa objašnjenjem        272.746 / 272.746  =  100,0 %
sinonimi.json                13.503 reči sa sinonimima
COMMON_POOL_SIZE (app.js:1086)   8.000 „poznatih reči“ za kockicu i igru
```

Nijedan od ova četiri broja **ne ide na sajt** — svi rastu. Navedeni su samo da se vidi
da su tvrdnje u predloženom tekstu pokrivene.

---

## Šta ostaje nerešeno (i čija je odluka)

| Šta | Čija odluka |
|---|---|
| Naslov početne — menjati ili čekati merenje 13.08.2026 | **vlasnica**; moja preporuka: čekati |
| Tri stavke „uskoro“ u Pro modalu — brisati ili isporučiti | **vlasnica** (produktna odluka, `CLAUDE.md` odeljak 8) |
| `<h1>` na `/404.html` je logotip | **vlasnica** (pravilo 8a — logo se ne dira bez pitanja) |
| Imena pesnika u odgovoru „Čije su pesme ovde?“ | prepisati iz spiska pesama u kodu pre upisa; u ovom pregledu spisak nije otvaran |
| Link „spisak svih strana sa rimama“ sa 404 vodi u hub `/rime-za/` (otvoren nalaz P11) | zavisi od odluke o izgledu huba |

---

## Posle odobrenja — redosled posla

1. Izmene upisati u **`build/gen_pages.py`** (tematske strane se generišu, `gen_pages.py:456–464`), mikrokopiju u `public/app.js` i `public/index.html`.
2. `python3 build/gen_pages.py`
3. `node test/predeploy.mjs` — mora izlazni kod 0.
4. Posle deploya `BASE=https://rimoteka.com node test/predeploy.mjs`.
5. U Search Console-u zatražiti ponovno indeksiranje za `/rimovanje-reci/`, `/recnik-srpskog-jezika/`, `/kako-napisati-pesmu/`, `/rimovanje-za-pocetnike/`.
6. **Zavesti datum izmene.** Broj koji se meri 13.08.2026: klikovi na upite `recnik rima`, `rimovanje reči na srpskom`, `rimovanje reci na srpskom` — sada 0.
