# Otvoreni nalazi — Rimoteka

> Živi spisak. Popravljeno se **briše**, novo se **dodaje**.
> Kolona „viđen" je datum kad je nalaz PRVI put zabeležen — po njoj se vidi šta se odlaže.
> Nalaz otvoren duže od 3 audita posebno se ističe u sledećem izveštaju.
>
> Pun opis svakog nalaza: `AUDIT/2026-07-28-audit.md`
> Metod rada: `/Users/jovana.jovic/AUDIT-PROTOKOL.md`

**Stanje na dan 29.07.2026: 66 otvorenih nalaza** (bilo 72, zatvoreno 7, dodat 1 nov — N14).
Ocena poslednjeg audita: **6,9 / 10**

**Zatvoreno u sesiji 29.07.2026 — GRUPA 1 (šablon generisanih strana):**
**K1 · K6 · V1 · V2 · S5 · S6 · N9** — sedam nalaza, jednom izmenom šablona koja
je pogodila **2.009 od 2.010 strana**. Uz njih su nađena i popravljena **dva nova
nalaza o kontrastu** (odeljak „Nađeno i popravljeno usput" niže) — ona nikad nisu
bila otvorena, pa se ne broje u 72. Test: **140 → 155 provera**.

**Pokrivenost:** prvi audit 3/10 dimenzija (7 se zaglavilo) · dopuna 8/8 dimenzija ✅
Zajedno su sve dimenzije sada pokrivene.

---

## KRITIČNO (4)

| # | Nalaz | Fajl | Viđen |
|---|---|---|---|
| K2 | U tamnom režimu se **ne vidi šta se kuca** — kontrast 1,23:1 (sudar specifičnosti, pozadina tvrdo `#fff`) | `public/style.css:436` vs `:133` | 29.07. |
| K3 | Dečji režim propušta vulgarne reči kroz padeže (1.148 oblika) **I pogrešno filtrira obične reči** — „pisao", „krvava", „smetlar", „kura". Lista za odluku: `AUDIT/DECJI-REZIM-ZA-ODLUKU.md` | `public/app.js:93–110` | 28.07. |
| K4 | Zabranjen localStorage obori ceo sajt na 0 rima; sigurnosna mreža pukne s njim (TDZ) | `public/app.js:86–88` | 28.07. |
| K5 | Pokvaren `rimoteka_favorites` obori ceo sajt (`JSON.parse` bez `try/catch`) | `public/app.js:88` | 28.07. |

## VISOKO (3)

| # | Nalaz | Fajl | Viđen |
|---|---|---|---|
| V3 | Glavno dugme radi u tihom režimu → nema `?rec=` u URL-u ni GA4 događaja | `public/app.js:491` | 28.07. |
| V4 | Na nevalidan unos (`a`, `123`, `😀`) pretraga ćuti — panel ostane prazan | `public/app.js:372–378` | 28.07. |
| V5 | Na 4G rime prorade tek posle 10,3 s (strana iscrtana za 1,5 s) | `public/app.js:188` | 28.07. |

## VISOKO — dodato 29.07. po prijavi vlasnice (2)

| # | Nalaz | Fajl | Viđen |
|---|---|---|---|
| V6 | **Beležnica: klik na ponuđenu rimu NE zamenjuje reč nego ubacuje na mesto kursora.** Panel ispravno kaže „RIME ZA NADA", ali `insertRhymeAtCaret` ne briše tu reč. Ako je kursor usred reči → „Kad me pitaš gde je **na kadada**" umesto „…gde je **kada**". | `public/app.js:1779` | 29.07. |
| V7 | **URL se nikad ne menja pri prebacivanju tabova.** Svaki tab ima pravi `href` (`/slogovi/`, `/klasici/`…), ali klik je presretnut i adresa ostaje `/?rec=ljubav` na svih 7 tabova. Suprotno odluci „svaki alat dobija svoju stranu". | `public/app.js` — presretanje klika na tab | 29.07. |

## SREDNJE (7)

| # | Nalaz | Fajl | Viđen |
|---|---|---|---|
| S1 | Klik na logo ne resetuje stranu — logo na početnoj **nije link**, a ima `cursor:pointer` | `public/index.html` | 29.07. |
| S2 | Srpska množina: „1 reči", „2 slogova", „4 redova" — ispravne funkcije **već postoje** na `:1755` | `public/app.js:1581`, `:742` | 28.07. |
| S3 | Ćirilica ne prebacuje naslove grupa, legendu ni karticu sinonima | `public/app.js:1925` | 28.07. |
| S4 | Bojenje rima u beležnici ne radi za ćirilične pesme | `public/app.js:937` | 28.07. |
| S7 | Igra radi u pozadini posle prelaska na drugi tab (zvuk, promašaji, troši reči) | `public/app.js:1886` | 28.07. |
| S8 | Kontrast pada: filter slogova 1,67:1, interni linkovi 1,8:1, `--muted` 2,90:1 | `public/style.css:467,310,13` | 28.07. |
| S9 | Nema strana za mama/tata/deka/maca/škola/drug/kućica — `/rime-za/mama/` je **404** | `build/gen_pages.py:109` | 28.07. |

## NISKO (13)

| # | Nalaz | Fajl | Viđen |
|---|---|---|---|
| N1 | Nema `aria-live` na rezultatima — čitač ekrana ne najavi 195 rima | `public/index.html:145` | 28.07. |
| N2 | Unos `constructor` ruši pretragu (`excluded.has is not a function`) | `public/app.js:382` | 28.07. |
| N3 | `?tab=igra` se ignoriše | `public/app.js:2408` | 28.07. |
| N4 | Tačkice napretka u igri pokazuju pogrešan redosled | `public/app.js:2937` | 28.07. |
| N5 | Reč u rezultatu je `<span>` sa `onclick` — nedostupna tastaturi | `public/app.js:279` | 28.07. |
| N6 | Dugmad imenovana samo emodžijem („white heart suit") | `public/app.js:281` | 28.07. |
| N7 | `#searchMode` nema pristupačno ime; nijedno polje nema `<label>` | `public/index.html:151` | 28.07. |
| N8 | Aktivno stanje tabova postoji samo kao CSS klasa, nije u kodu | `public/index.html:100` | 28.07. |
| N10 | 404 strana: zastareo CSS `?v=20260715b`, nema polja za pretragu | `public/404.html` | 28.07. |
| N11 | Mrtav kod `loadDefs()` — da se pozove, pokvario bi rangiranje | `public/app.js:237` | 28.07. |
| N12 | `http://` vraća 302 umesto 301 | nginx / Coolify | 28.07. |
| N13 | Latentna HTML injekcija (`escapeHtml` ne štiti navodnike) — **danas nije iskoristivo** | `public/app.js:755` | 28.07. |
| N14 | **Živi rezultati i dalje preskaču nivo naslova:** `app.js` iscrtava grupe kao `<h3>` odmah ispod `<h1>` — reprodukovano na `/` i `/rimovanje-reci/` („h1 → h3, Najbolje rime"). Statične strane su popravljene (N9), živi alat nije. Popravka je jedna linija u `app.js`, ali menja i selektor u testu (`querySelectorAll('h3')`), pa ide u istu grupu sa S3. | `public/app.js` — iscrtavanje grupa | 29.07. |

---

---

## NAĐENO I POPRAVLJENO USPUT (29.07.2026, GRUPA 1)

> Oba je otkrila **nova provera kontrasta u testu**, ne agent i ne oko. Oba su
> **isti obrazac kao K2**: pozadina tvrdo upisana u CSS, a boja teksta promenljiva
> koja se menja sa temom. Tema se pomeri, pozadina ne.

| Šta | Bilo | Sada | Fajl |
|---|---|---|---|
| Definicija reči na stranama `/rime-za/` u **tamnoj** temi (`.landing-def`) | 1,92:1 | **8,61:1** | `public/style.css` |
| Podebljana reč u toj definiciji (`.landing-def strong`) | **1,15:1** — praktično nevidljivo | **8,19:1** | `public/style.css` |
| Broj slogova u čipu (`.chip .syl`, `.res-legend .syl`) u **svetloj** temi | 2,56:1 | **5,27:1** | `public/style.css` |
| Isti taj broj u **tamnoj** temi | 2,02:1 | **8,68:1** | `public/style.css` |

**Vidljiva promena za vlasnicu:** broj slogova u malom balončiću uz svaku reč sada je
tamnija nijansa iste plave (`#26a2f8` → `#146ba8`). Ništa drugo se u svetloj temi nije
promenilo. Ako se ne dopadne — vraća se jednom linijom (`--syl-ink` u `style.css`).

**Zašto je uopšte iskrslo:** tamni režim do sada **nije ni postojao** na tih 2.009
strana, pa tamo nikad nije ni izmeren nijedan kontrast. Kad se upali nova mogućnost,
ona povuče sa sobom i sve provere koje za nju važe.

---

## ISPRAVKA NALAZA K1 (29.07.2026) — čitati pre popravke

Prvi izveštaj je tvrdio da se tamni režim „nikad ne vrati". **To je bilo prešturo.**
Vlasnica je prijavila da njoj tamni režim opstaje — i bila je u pravu. Izmereno:

| Radnja | Tamni režim | URL |
|---|---|---|
| klik na 🌙 | ✅ uključen, ikonica postaje ☀️ | `/` |
| prebacivanje svih 7 tabova | ✅ **ostaje uključen** | `/` — **nikad se ne menja** |
| **osvežavanje (F5)** | ❌ **gubi se**, pozadina bela, ikonica opet 🌙 | `/` |
| **odlazak na `/rime-za/ljubav/`** | ❌ gubi se, nema ni dugmeta | — |

**Zašto se retko primeti:** prebacivanje tabova **ne učitava stranu ponovo** (klik na
tab je presretnut — nalaz V7), pa se tamni režim ne gubi tokom uobičajenog rada.
Gubi se tek pri pravom osvežavanju ili odlasku na stranu reči.

**Uzrok stoji:** `app.js` nigde ne primenjuje tamni režim pri učitavanju — jedini koji
to radi je `dark-mode-init.js`, a on puca. Popravka je ista.

**Pouka za protokol:** nalaz mora da navede **u kojoj tačno situaciji** se kvar dešava.
„Ne radi" bez konteksta je netačno i gubi poverenje.

---

## RUPE U TESTU (test je sa 140 podignut na **155** provera)

| Šta test ne dodiruje | Koji nalaz bi uhvatio | Stanje |
|---|---|---|
| ~~nijednu od 1.988 `/rime-za/` strana~~ | V1, V2, K6, N9 | ✅ **zatvoreno** — sekcija 12j |
| ~~osvežavanje strane sa uključenim tamnim režimom~~ | K1 | ✅ **zatvoreno** — sekcija 10b |
| ~~kontrast na stranama reči, u obe teme~~ | dva nova nalaza | ✅ **zatvoreno** — sekcija 12j |
| **kucanje** u polje u tamnom režimu | K2 | otvoreno |
| klik na logo posle pretrage | S1 | otvoreno |
| zabranjen / pokvaren localStorage | K4, K5 | otvoreno |
| klik na dugme naspram tastera Enter (različiti putevi) | V3, V4 | otvoreno |
| padeže blokiranih reči u dečjem režimu | K3 | otvoreno |
| ~~štampu i toast na podstranama~~ | S5, S6 | ✅ **zatvoreno** — sekcija 12j |
| prelazak na drugi tab dok igra traje | S7 | otvoreno |
| klik na ponuđenu rimu kad je kursor **usred** reči | V6 | otvoreno |
| da li se URL menja pri prebacivanju tabova | V7 | otvoreno |

---

## SLEDEĆI AUDIT

**Zakazan za: 31.07.2026.** (3 dana od 28.07.)
Pokrenuti po `/Users/jovana.jovic/AUDIT-PROTOKOL.md`, upisati u `AUDIT/2026-07-31-audit.md`.

---

## DOPUNA AUDITA 29.07.2026 — 37 novih nalaza

> Ovo je rezultat **ponavljanja 7 dimenzija koje su se 28.07. zaglavile**, plus nove
> dimenzije `kombinacije-stanja` nastale iz analize propusta (`PROPUSTI.md`).
> Ovaj put: **54/54 agenta završilo, nijedan se nije zaglavio.** Odbačeno 9 lažnih nalaza.


### VISOKO (2)

| Nalaz | Dimenzija | Fajl |
|---|---|---|
| Strana /rime-za-decu/ tvrdi da su rezultati uvek filtrirani i bezbedni, a dečji režim je po defaultu ISKLJUČEN | `sadrzaj` | `build/gen_pages.py:1164` |
| Dva otvorena taba Rimoteke gaze jedan drugom beležnicu i omiljene reči — pesma nestane bez upozorenja | `kod-greske` | `public/app.js:952` |

### SREDNJE (20)

| Nalaz | Dimenzija | Fajl |
|---|---|---|
| Ćirilična tastatura + ćirilični režim: alat kvari reč dok korisnik kuca (надживети → наџивети) | `kombinacije-stanja` | `public/app.js:1971` |
| Ćirilica × tab „Igra": ekran igre ostaje pola latinica („NAĐI RIMU ZA REČ", „Proveri", povratne poruke) | `kombinacije-stanja` | `public/index.html:275` |
| Premeštanje stiha (drag ⠿) izbacuje kursor na sam početak pesme — sledeći kucani znak upada u prvi red | `interakcije-kursor` | `public/app.js:1483` |
| Ćirilica: kolona kursora se ne poklapa sa latiničnim tekstom (љ/њ/џ), pa panel nudi rime za pogrešnu reč | `interakcije-kursor` | `public/app.js:1623` |
| Dugmad „sačuvaj rime" i „preuzmi listu" ignorišu kursor — čuvaju rime za drugu reč nego što panel pokazuje | `interakcije-kursor` | `public/app.js:1808` |
| Test obilazi 7 od 2.010 strana, a HTTP status proverava na samo 3 URL-a | `test-pokrivenost` | `test/predeploy.mjs:597` |
| Nijedna stranica iz sekcija 12, 12e, 12f, 12g, 12h, 12i nema listener za greške — a sekcija 13 tvrdi da pokriva „ceo test" | `test-pokrivenost` | `test/predeploy.mjs:952` |
| Tab „Omiljene" (♥) nema nijednu funkcionalnu proveru — sekcija 4 je lažno zelena jer meri samo visinu panela | `test-pokrivenost` | `test/predeploy.mjs:137` |
| Tri opcije glavnog alata — „i šire rime", „ijekavica", „dečji režim" — imaju 0 provera | `test-pokrivenost` | `test/predeploy.mjs:85` |
| Ceo test rima počiva na jednoj reči — „ljubav" — i to baš na onoj kod koje opcije ne prave nikakvu razliku | `test-pokrivenost` | `test/predeploy.mjs:95` |
| ~50.000 parametarskih URL-ova /?rec= koji su bajt-za-bajt duplikat početne, bez nofollow i bez blokade u robots.txt | `seo` | `build/gen_pages.py:251` |
| 222 strane bez ijednog internog linka; /rime-za/ vraća 403 i ne postoji hub strana; breadcrumb preskače srednji nivo | `seo` | `build/gen_pages.py:728` |
| logo-icon.png je 298 KB (512×512) a prikazuje se na 46×46 px — 5,4 s okupira 4G vezu i gura reci.txt na kraj reda | `performanse` | `public/index.html:96` |
| definicije.json (5,3 MB gzip / 20 MB) kreće ~4 ms posle reci.txt i produžava spremnost rečnika sa 7,3 s na 10,6 s | `performanse` | `public/app.js:3072` |
| Obrada reci.txt zamrzava glavnu nit 824 ms u jednom komadu (ukupno 1.174 ms blokirano) | `performanse` | `public/app.js:197` |
| <title> generisanih strana je padežno pogrešan: „Rime za nada“ umesto „Rime za nadu“ — 557 od 1.988 strana | `sadrzaj` | `build/gen_pages.py:718` |
| Aktivni tab je potpuno van vidljivog dela trake na SEO podstranama (do 309 px desno) | `mobilni` | `public/style.css:835` |
| loadDict ne proverava r.ok — HTML strana greške postaje rečnik, sajt tvrdi „nema rime“ umesto da prijavi kvar | `kod-greske` | `public/app.js:191` |
| Pretraga reči nema zaštitu dok se rečnik učitava i lažno javlja „Nema reči koje odgovaraju“ | `kod-greske` | `public/app.js:623` |
| Jedan neuspeh definicije.json trajno ubija sve definicije i keš trajno pamti „Nema objašnjenja za ovu reč“ | `kod-greske` | `public/app.js:184` |

### NISKO (15)

| Nalaz | Dimenzija | Fajl |
|---|---|---|
| Ćirilica × tab „Brojač slogova": sažetak počinje latiničnim „Ukupno:" | `kombinacije-stanja` | `public/app.js:740` |
| Ćirilica × prazan tab „Omiljene": poruka praznog stanja ostaje latinica | `kombinacije-stanja` | `public/app.js:1869` |
| Tamni režim × ekran igre: brojač igrača/reči (.game-value) pada na ~4,1:1 kontrasta | `kombinacije-stanja` | `public/style.css:166` |
| Tab „Rečnik": tri režima pretrage i filter po slogovima nikad se ne biraju — jedina provera je „broj > 0" | `test-pokrivenost` | `test/predeploy.mjs:152` |
| 108 SERP naslova sa pogrešnom srpskom množinom: „51 reči koje se rimuju" umesto „51 reč koja se rimuje" | `seo` | `build/gen_pages.py:718` |
| og:image je kvadratni logo 512x512 (292 KB) uz twitter:card=summary — nema velikog društvenog pregleda | `seo` | `public/index.html:1` |
| CLS 0,045 na podstranama /rime-za/ zbog kasne zamene Google fontova (na početnoj je 0) | `performanse` | `public/index.html:25` |
| „Pronađene su 56 reči“ — pogrešno slaganje predikata sa brojem, na svim generisanim stranama | `sadrzaj` | `build/gen_pages.py:758` |
| „shema rime“ (hrvatski oblik) u Pro modalu — na svim ostalim mestima piše „šema rime“ | `sadrzaj` | `public/index.html:392` |
| Mešani navodnici: otvara se srpskim „ a zatvara ASCII " — u FAQ-u i na svih 1.988 generisanih strana | `sadrzaj` | `public/index.html:327` |
| Meta opis strane /rime-za-ljubavne-pesme/ nabraja reči u nominativu iza predloga „sa“ | `sadrzaj` | `build/gen_pages.py:1213` |
| Padajuća lista predloga izlazi ispod ekrana — vidljiv samo 1 od 8 predloga kad je tastatura otvorena | `mobilni` | `public/style.css:441` |
| Fiksni panel rima u beležnici guta trećinu ekrana; u pejzažu vidljiva su 2 od 16 predloga | `mobilni` | `public/style.css:817` |
| Sedam akcionih dugmadi u beležnici visine 23,3 px bez vertikalnog razmaka — među njima destruktivno „obriši sve“ | `mobilni` | `public/index.html:186` |
| Tooltip sa objašnjenjem zauvek stoji na „učitavanje…“ — spoljni pozivi nemaju timeout | `kod-greske` | `public/app.js:2067` |

**Pun opis svakog nalaza sa scenarijem i popravkom:** `AUDIT/2026-07-29-dopuna.md`

