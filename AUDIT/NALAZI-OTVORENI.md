# Otvoreni nalazi — Rimoteka

> Živi spisak. Popravljeno se **briše**, novo se **dodaje**.
> Kolona „viđen" je datum kad je nalaz PRVI put zabeležen — po njoj se vidi šta se odlaže.
>
> Pun opis svakog nalaza: `AUDIT/2026-07-28-audit.md` i `AUDIT/2026-07-29-dopuna.md`
> Metod rada: `/Users/jovana.jovic/AUDIT-PROTOKOL.md`

**Stanje na dan 29.07.2026 (posle sesije popravki): 5 otvorenih nalaza** (bilo 64).
> Peti nalaz (**S10**) otkriven je 29.07. uveče, pri proveri zašto pre-deploy test pada.
Ocena poslednjeg audita: **6,9 / 10** — nova ocena se računa u auditu 31.07.2026.

**Zatvoreno u ovoj sesiji: 60 nalaza.** Test podignut sa **167 na 265+ provera**.
Svaka nova provera je prvo puštena **protiv produkcije dok je tamo stari kod** i
tek kad je pala uzeta je kao valjana — ukupno **74 provere pale na produkciji**.

---

## OTVORENO (5)

| # | Nalaz | Zašto nije zatvoreno | Fajl | Viđen |
|---|---|---|---|---|
| **S10** | Sinonimi za **„sunce"** su tuđi: **13 od 19** su sinonimi reči **„snop"** — *plast, babura, stog, bala, mlaz, svežanj, denjak, zamotuljak, zavežljaj, zavijutak, smotak, breme, naviljak*. Kartica sinonima stoji **na vrhu rezultata**, pa ko ukuca „sunce" prvo pročita „plast, babura, stog". Ispravno je samo 6 (*svetlo, luč, obasjanost, zrak, luča, zraka*). Uzrok je verovatno spojeno značenje „snop svetlosti". Provereno: greška je **usamljena** — od 13.505 odrednica samo „sunce" nosi taj skup, ostalih 9 (*snop, seno, plast, stog, bala, svežanj, zavežljaj, zamotuljak, paketić*) ga nose s pravom. **Ne vidi se u HTML-u** podstrana, samo u alatu (`sinonimi.json` se učitava u pregledaču). | **Traži odluku vlasnice** — koje od 6 preostalih zadržati. Popravka je jedan red u podacima, ali dira sadržaj. | `public/sinonimi.json` | 29.07. |
| **K3** (ostatak) | Dečji režim propušta vulgarne reči kroz padeže — **284 propuštena oblika kod 75 blokiranih reči** („krevetu" → *dupetu*, „protestu" → *incestu*). Predlog: blokirati **osnove** umesto tačnih oblika, uz listu izuzetaka da *ratar* ne strada zbog *rat*. | **Traži odluku vlasnice.** Odobren je bio samo Odeljak 1 (sedam pogrešno blokiranih reči) — i on je urađen. Ostatak je u `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`, odeljci 2–4. | `public/app.js` · `build/gen_pages.py` | 28.07. |
| **N12** | `http://rimoteka.com` vraća **302** umesto **301** | Preusmerenje radi **Traefik u Coolify-ju**, ne nginx iz repozitorijuma (`Location` je apsolutan, a nginx ima `absolute_redirect off`). Traži pristup panelu: Coolify → Rimoteka → Domains, ili oznaka `traefik.http.middlewares.…redirectscheme.permanent=true`. | Coolify / Traefik | 28.07. |
| **P1** | `logo-icon.png` je **292 KB (512×512)**, a prikazuje se na **46×46 px** — na 4G okupira vezu ~5 s i gura `reci.txt` na kraj reda | **Pravilo 8a: logo se ne dira** — ni slika, ni tag, ni CSS. Rešenje traži ili novu, manju verziju slike ili `srcset` u `<img>` logotipa; oboje dodiruje logo. **Odluka je vlasničina.** | `public/index.html` · `build/gen_pages.py` | 29.07. |
| **P2** | CLS 0,045 na podstranama `/rime-za/` zbog kasne zamene Google fontova | Popravka je **primenjena** (`<link rel="preload" as="style">` na sve tri vrste strana), ali **NIJE izmerena** — mašina je u toku sesije ostala bez efemernih portova (v. `PROPUSTI.md`), pa merenje Core Web Vitals nije moglo da se izvrši. **Nalaz ostaje otvoren dok se ne izmeri.** | `public/index.html` · `build/gen_pages.py` · `public/404.html` | 29.07. |

---

## ZATVORENO U SESIJI 29.07.2026 (60 nalaza)

### Kritično i visoko

| # | Bilo | Sada | Gde |
|---|---|---|---|
| K4 | Zabranjen `localStorage` (privatni režim, blokirani kolačići) obori sajt na **0 rima**; sigurnosna mreža pukne s njim na TDZ grešci | sva čitanja/pisanja idu kroz `lsGet`/`lsSet`/`lsRemove` koji nikad ne bacaju | `app.js:88–104` |
| K5 | Pokvaren `rimoteka_favorites` (`{nije-json`, `null`, pogrešan tip) obori sajt na 0 rima | `lsJSON` vraća podrazumevanu vrednost umesto da pukne | `app.js:96` |
| V3 | Klik na glavno dugme radio u **tihom režimu** — `onclick = doRhymes` prosleđivao `MouseEvent` kao zastavicu `silent`; nema `?rec=` u URL-u ni GA4 događaja | `onclick = () => doRhymes()` + `silent = silent === true` | `app.js:436`, `:591` |
| V4 | Na `a`, `123`, `😀` panel ostane **prazan** — alat deluje pokvareno | dve različite poruke: prekratka reč / unos bez ijednog slova | `app.js:448` |
| V5 | Na 4G rime prorade tek posle **10,3 s**, i to tek posle **drugog** klika | reč se zapamti i pretraga krene **sama** čim rečnik stigne; dugme pokazuje stanje | `app.js:449`, `:432` |
| V6 | Kursor **usred** reči + klik na rimu → „gde je **na kadada**" umesto „gde je **kada**" | klik **zamenjuje** reč pod kursorom; u praznini i dalje ubacuje | `app.js:1934` |
| V7 | Adresa ostaje `/?rec=ljubav` na **svih 7 tabova** — nema deljivog linka, „Nazad" ne radi | `pushState` po tabu + `popstate`; `?rec=` nestaje van tabа sa rimama | `app.js:2169–2240` |
| — | `/rime-za-decu/` tvrdi da su rezultati **uvek** filtrirani, a dečji režim je podrazumevano isključen | tekst kaže šta je uvek isključeno a šta radi dečji režim; dugme vodi na `?decji=1` | `gen_pages.py:1215` |
| — | Dva otvorena taba gaze jedan drugom beležnicu — **pesma nestane bez upozorenja** | `storage` događaj: bezbedno preuzimanje ili jasno upozorenje | `app.js:106–133`, `:2010` |

### Srednje

| # | Bilo | Sada |
|---|---|---|
| S1 | Klik na logo ne resetuje stranu (polje, 180 rima i `?rec=` ostaju) | prazni polje, rezultate i adresu — **logo nije diran** (pravilo 8a) |
| S2 | „1 reči", „2 slogova", „4 redova" | `recRec`, `znakRec`, `redRec`, `poenRec` — pravilo 1 / 2–4 / 5+ |
| S3 | Ćirilica ne prebacuje naslove grupa, legendu ni karticu sinonima | sve tri prolaze kroz `uiTxt` |
| S4 | Bojenje rima ne radi za **ćirilične** pesme (`lastIndexOf` traži latinicu u ćiriličnom redu) | opseg reči se računa nad **izvornim** redom |
| S7 | Igra radi u pozadini posle prelaska na drugi tab (zvuk, promašaji, troše se reči) | pauzira se pri odlasku, nastavlja po povratku |
| S9 | `/rime-za/mama/` je **404** (i tata, deka, maca, škola, drug, kućica) | dodate 34 dečje i porodične reči, sve proverene u rečniku |
| — | Ćirilična tastatura: „надживети" → **„наџивети"**, „инјекција" → „ињекција" | čuvar između `д+ж`, `н+ј`, `л+ј` u povratnom prolazu |
| — | Ekran igre ostaje **pola latinica** | uputstvo, „Провери" i sve povratne poruke prate pismo |
| — | Premeštanje stiha (drag) baca kursor na **početak pesme** | kursor ostaje na kraju premeštenog stiha |
| — | Ćirilica: kolona kursora se ne poklapa zbog `љ/њ/џ`, panel nudi rime za pogrešnu reč | traži se nad izvornim redom |
| — | „sačuvaj rime" i „preuzmi listu" čuvaju rime za **drugu** reč nego što panel pokazuje | prate reč koju panel prikazuje |
| — | `loadDict` ne proverava `r.ok` — HTML strana greške postane „rečnik", sajt kaže „nema rime" | status + provera da odgovor nije HTML + provera dužine |
| — | Pretraga laže „Nema reči koje odgovaraju" dok se rečnik učitava | jasno kaže „Učitavam rečnik…" |
| — | Jedan neuspeh `definicije.json` **trajno** ubija sve definicije | pamćenje se briše, sledeći pokušaj prolazi |
| — | `definicije.json` (**19,3 MB**) kreće na svakom učitavanju i gura spremnost rečnika sa 7,3 s na 10,6 s | skida se tek kad zatreba (prvi prelazak preko ⓘ) |
| — | Obrada `reci.txt` zamrzava glavnu nit **824 ms u jednom komadu** | komadi po 20.000 reči uz predah |
| — | `<title>` padežno pogrešan: „Rime za **nada**" na 557 od 1.988 strana | „Rime za reč „nada“" — imenica ostaje u nominativu |
| — | **~50.000** parametarskih URL-ova `/?rec=` — duplikat početne, bez `nofollow` i bez blokade | `robots.txt` + `rel="nofollow"` |
| — | **222 strane bez ijednog internog linka**; `/rime-za/` vraća **403**; breadcrumb preskače srednji nivo | nova hub strana `/rime-za/` sa svih **1.988** linkova + trostepeni breadcrumb |
| — | Aktivni tab do **309 px desno** od vidljivog dela trake na podstranama | traka se sama pomera da se aktivan tab vidi |

### Nisko

| # | Bilo | Sada |
|---|---|---|
| N1 | Nema `aria-live` — čitač ekrana ne najavi 195 rima | najavljuje se **broj** (ne svih 195 reči) |
| N2 | Unos `constructor` ruši prikaz (`excluded.has is not a function`) | provera vlasništva ključa; isto i za `SYNONYMS` |
| N3 | `?tab=igra` se ignoriše | poštuje se |
| N4 | Tačkice napretka u igri pokazuju **pogrešan redosled** (prve su uvek zelene) | pamti se stvaran ishod po reči |
| N5 | Reč u rezultatu je `<span onclick>` — nedostupna tastaturi | `tabindex` + `role` + Enter/Space |
| N6 | Dugmad imenovana samo emodžijem („white heart suit") | `aria-label` sa imenom reči |
| N7 | `#searchMode` bez imena; nijedno polje nema `<label>` | labele za sva polja + imena za grupe dugmadi |
| N8 | Aktivno stanje tabova samo kao CSS klasa | `aria-current="page"` |
| N10 | 404: zastareo CSS `?v=20260715b`, nema polja za pretragu | polje za pretragu, linkovi ka hubu i alatima, aktuelan CSS |
| N11 | Mrtav `loadDefs()` — da se pozove, pokvario bi rangiranje | obrisan |
| N13 | `escapeHtml` ne štiti navodnike | štiti i `"` i `'` |
| N14 | Živi rezultati preskaču nivo naslova (`h1 → h3`) | `h2` |
| — | Ćirilica × brojač slogova: „Ukupno:" ostaje latinica | prati pismo |
| — | Ćirilica × prazan tab „Omiljene": poruka ostaje latinica | prati pismo |
| — | Tamni režim × ekran igre: `.game-value` **4,13:1** | **7,25:1** |
| — | **108 SERP naslova** sa pogrešnom množinom („51 reči koje se rimuju") | „51 reč koja se rimuje" |
| — | `og:image` kvadratni logo uz `twitter:card=summary` | nova slika **1200×630 (58 KB)** + `summary_large_image` |
| — | „Pronađene su 56 reči" — pogrešno slaganje predikata | „Pronađeno je 56 reči" / „Pronađene su 3 reči" / „Pronađena je 1 reč" |
| — | „shema rime" (hrvatski oblik) u Pro modalu | „šema rime" |
| — | Mešani navodnici (`„` pa ASCII `"`) | `„…“` — **67** mesta u `gen_pages.py`, **4** u `index.html` |
| — | Meta opis `/rime-za-ljubavne-pesme/` nabraja nominative iza „sa" | „sa rečima ljubav, srce, duša i sreća" |
| — | Padajuća lista predloga: vidljiv **1 od 8** predloga kad je tastatura otvorena | visina vezana za vidljivi deo ekrana (`dvh`) |
| — | Fiksni panel rima guta trećinu ekrana; u pejzažu **2 od 16** predloga | `max-height` po `dvh`, sa skrolom |
| — | Sedam dugmadi u beležnici visine **23,3 px**, među njima „obriši sve" | **44 px** na dodirnim ekranima |
| — | Oblačić sa objašnjenjem **zauvek** stoji na „učitavanje…" | rok 4 s + 3,5 s |

### Rupe u testu (dimenzija `test-pokrivenost`)

| # | Bilo | Sada |
|---|---|---|
| — | Test obilazi **7 od 2.010** strana, HTTP status na **3** URL-a | 35 ruta se proverava na status + hub strana sa 1.988 linkova |
| — | Sekcije 12, 12e–12i nemaju osluškivač grešaka, a sekcija 13 tvrdi da pokriva „ceo test" | osluškivač je na **svakoj** strani koju test otvori, sa oznakom gde je greška nastala |
| — | Tab „Omiljene" nema nijednu funkcionalnu proveru — merila se samo visina panela | ♥ → brojač → tab → osvežavanje → „obriši sve" |
| — | „i šire rime", „ijekavica", „dečji režim" imaju **0 provera** | sve tri se biraju i meri se promena rezultata |
| — | Ceo test rima počiva na **jednoj** reči — „ljubav" | šest reči različitog oblika, svaka sa očekivanom rimom |
| — | Tab „Rečnik": tri režima pretrage i filter po slogovima nikad se ne biraju | sva tri režima + filter, sa proverom **sadržaja** rezultata |

---

## SLEDEĆI AUDIT

**Zakazan za: 31.07.2026.** Pokrenuti po `/Users/jovana.jovic/AUDIT-PROTOKOL.md`,
upisati u `AUDIT/2026-07-31-audit.md`.

**Prvo izmeriti:** CLS na `/rime-za/` (nalaz P2) — popravka je primenjena ali nije potvrđena merenjem.
