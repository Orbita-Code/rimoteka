# Handover — Rimoteka

> Najnovije je na vrhu. Ispod stoje handoveri prethodnih sesija.

---

# Sesija 29. jul 2026 (druga) — POPRAVKE: GRUPA 1 + ceo noćni režim

> **NIŠTA NIJE PUSHOVANO.** Sve stoji na grani `fix/audit-grupa1`, tri commita.
> Vlasnica je izričito rekla: **prvo ona gleda na lokalu, pa tek onda push.**

## Gde je posao stao

| Stavka | Stanje |
|---|---|
| Grana | `fix/audit-grupa1` (3 commita, **nije** pushovana) |
| Test | **167/167 prolazi** lokalno, izlazni kod 0 (bilo 140) |
| Otvorenih nalaza | **64** (bilo 72; zatvoreno 9, dodat 1 nov — N14) |
| Ocena | još nije preračunata — sledeći audit **31.07.2026.** |
| Lokalni pregled | `cd public && python3 -m http.server 8765` |

## Šta je zatvoreno

**GRUPA 1 — jedna izmena šablona `build/gen_pages.py`, pogodila 2.009 od 2.010 strana:**

| Nalaz | Bilo | Sada |
|---|---|---|
| K6 | tamnog režima nema na 2.009 strana | dugme + skripta na svakoj strani |
| K1 | `dark-mode-init.js` u `<head>` piše po `document.body`, koji tada ne postoji → tema se gubi pri `F5` | klasa ide na `<html>`, pa se prenese na `<body>` |
| V1 | `app.js` nema na 1.988 strana → ćirilica mrtvo dugme | `app.js` ide i na strane reči (rečnik se **ne** skida) |
| V2 | „Kopiraj sve rime" inline `onclick`, CSP ga blokira | rukovalac u `app.js` |
| S5 | nema `#printArea` → štampa prazan list | dodato u podnožje |
| S6 | nema `#toast` → nijedna radnja ne javlja ništa | dodato u podnožje |
| N9 | `h1 → h3` na 1.988 strana | `h2`, CSS pokriva oba nivoa |

**KONTRAST — po prijavi vlasnice, sve tri stavke reprodukovane:**

| Nalaz | Bilo | Sada |
|---|---|---|
| K2 | reč koja klikom uđe u polje: **1,23:1** | 12,4:1 |
| S8 | filter slogova 2,05:1 · interni linkovi **1,80:1** · `--muted` 2,90:1 | svi ≥ 4,5:1 |
| — | tabela na `/slogovi/`: **1,23:1** (td), 3,87:1 (th) | ≥ 5,3:1 |
| — | definicija reči na stranama `/rime-za/`: **1,15:1** | 8,19:1 |
| — | paleta boja za rime u beležnici: svetla do **1,89:1**, tamna do 3,16:1 | sve ≥ 4,6:1 |

**Skener kroz 18 stanja strana** (sve strane × svi tabovi × obe teme, sa upisanim
sadržajem) našao je **27 elemenata ispod praga**. Sada **0 u obe teme**.

## Tri stvari koje treba razumeti pre nastavka

**1. Uzrok je uvek isti obrazac, ne pojedinačna boja.**
Boja teksta je promenljiva koja se menja sa temom, a podloga je tvrdo upisana
(`background:#fff`). Tema se pomeri, podloga ne. Zato su podloge sada promenljive:
`--field-bg` (polja) · `--menu-bg` (padajuća lista) · `--card-bg` (male bele kutije:
tabela, filter slogova, značka) · `--tag-bg` / `--tag-ink` (oznake u Klasicima) ·
`--syl-ink` / `--syl-bg` (broj slogova) · `--link` / `--link-visited`.

> **Ne dodavati jače pravilo `body.dark-mode ...` kao popravku.** Tako je i nastao K2:
> `.search-row input[type=text]` ima specifičnost (0,2,1) i nadjačava
> `body.dark-mode input` (0,1,2). Podloga MORA da ide kroz promenljivu.

**2. Linkovima u tekstu boju do sada nije postavljalo nijedno CSS pravilo.**
Uzimali su podrazumevanu boju pregledača: `#0000EE` (**1,80:1** na tamnoj), a
posećeni `#551A8B` (**1,53:1**). Testni profil nema posećene linkove, pa se to
merenjem nikad ne bi videlo — vlasnica ih ima. Sada `a{color:var(--link)}` i
`a:visited`, specifičnost 0,0,1, pa tabovi/čipovi/logo/futer ostaju netaknuti.

**3. Boje rima u beležnici su upisane INLINE u HTML.**
CSS ih ne može nadjačati. Zato su dve palete u `app.js` (`RHYME_COLORS_SVETLA` /
`RHYME_COLORS_TAMNA`, iste nijanse, pomerena samo svetlina) i **ponovno iscrtavanje
pri promeni teme** — bez toga posle prebacivanja ostanu boje stare teme.

## Vidljive promene koje vlasnica treba da odobri

| Šta | Bilo | Sada | Vraća se |
|---|---|---|---|
| Broj slogova u balončiću uz reč | svetloplavo `#26a2f8` | tamnije plavo `#146ba8` | `--syl-ink` |
| Sporedni tekst u **svetloj** temi (`--muted`) | `#9a93b8` | `#756e94` | `--muted` |
| Boje rimskih grupa u beležnici | jedna paleta | dve, po temi | `RHYME_COLORS_*` u `app.js` |
| Značka „sinonimi" | belo slovo | tamno slovo, ista plava | `.syn-badge` |

Sve četiri su popravke čitljivosti (svaka je bila ispod 4,5:1), ali menjaju izgled —
zato stoje ovde, a ne u fusnoti.

## Test — sa 140 na 167 provera

| Sekcija | Šta hvata |
|---|---|
| `10b` | tema preživljava `F5` i odlazak na stranu reči + ikonica se poklapa sa temom |
| `10c` | **svaki vidljivi tekst** na 6 strana, u obe teme, sa upisanim sadržajem |
| `12j` | strana reči kao alat: `app.js`, ćirilica, kopiranje, `#toast`, `#printArea`, naslovi, kontrast |

**Sve nove provere su prvo puštene protiv produkcije DOK JE TAMO STARI KOD i sve su
pale** — 13 iz prvog kruga, 12 iz drugog. To je jedini dokaz da provera nešto hvata.

> **Zamka koju ne ponavljati:** sekcija `10c` je isprva otvarala 12 zasebnih strana.
> Svaki `browser.newPage()` pravi nov kontekst sa praznim kešom, pa je svako merenje
> iznova skidalo `reci.txt` + `definicije.json` — 12 × 22 MB obori lokalni server i
> test padne bez ijednog pravog kvara. Sada je jedna strana za svih 12 merenja.

## Šta NIJE urađeno

- **GRUPE 2–7 iz `AUDIT/UPUTSTVO-ZA-POPRAVKE.md`** — osim K2 i S8, koje su odrađene
  ranije jer ih je vlasnica prijavila. Ostaje V3, V4, S2, V6, V7, S1, K4, K5, ćirilica,
  performanse i sve iz dopune audita.
- **K3 (dečji režim)** — čeka odluku, `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`.
  Vlasnica je odobrila **samo Odeljak 1** (uklanjanje 7 pogrešno blokiranih reči:
  *pisao, pisa, krvavi, krvava, krvavo, smetlar, kura*). **To još NIJE urađeno** —
  liste `BLOCKED` stoje na dva mesta: `public/app.js:93` i `build/gen_pages.py:550`.
  Posle izmene se MORA ponovo pokrenuti `python3 build/gen_pages.py`.
- **N14 (novo)** — živi rezultati i dalje iscrtavaju `<h3>` odmah ispod `<h1>` na `/`
  i `/rimovanje-reci/`. Statične strane su popravljene, živi alat nije.

## Alatka koja ostaje sledećoj sesiji

Skener kontrasta:
`/private/tmp/claude-501/-Users-jovana-jovic/076b64b6-822c-4afd-a92e-03bd6e50532d/scratchpad/skener-kontrasta.mjs`

```bash
node skener-kontrasta.mjs               # noćni režim
TEMA=svetla node skener-kontrasta.mjs   # dnevni režim
```

Prolazi sve strane i tabove, slaže prozirne podloge, preskače prelive, meri i polja
sa upisanom vrednošću. **Prekopirati ga u `test/` da ne nestane sa privremenim folderom.**

---

# Sesija 28–29. jul 2026 — KOMPLETAN AUDIT (bez ijedne izmene koda)

> **Sledeća sesija radi POPRAVKE. Radni nalog je gotov:**
> **`AUDIT/UPUTSTVO-ZA-POPRAVKE.md`** — pročitati ga prvo, sve je tamo poređano po
> redosledu i sa tačnim linijama.

## Šta je urađeno

**Nijedna linija koda nije promenjena.** Sesija je bila isključivo audit i dokumentacija.

| Šta | Ishod |
|---|---|
| Postojeći test protiv produkcije | **140/140 prolazi** ✅ |
| Prvi audit (39 agenata) | 27 nalaza — ali **samo 3/10 dimenzija završilo**, 7 se zaglavilo |
| Vlasnica prijavila ručno | **5 bagova, svih 5 potvrđeno** — 3 nije našao nijedan agent |
| Dopuna audita (54 agenta) | **8/8 dimenzija**, 37 novih nalaza, 0 zaglavljenih |
| **Ukupno otvoreno** | **72 nalaza** — 6 kritičnih, 7 visokih |
| **Ocena** | **6,9 / 10** |

## Stanje sajta

**Jezgro je odlično, ivice su polomljene.** Rimovanje radi brzo (60–145 ms) i tačno,
LCP 704–796 ms, CLS ~0, beležnica sa metrom i šemom rime nema premca na srpskom.
Ali **98,9% sajta su generisane strane** i tamo se raspada: nema tamnog režima na
2.009 od 2.010 strana, prekidač za ćirilicu je mrtvo dugme na 1.988 strana, a
„Kopiraj sve rime" CSP blokira.

**Šest kritičnih:** tamni režim se gubi na `F5` · u tamnom režimu se ne vidi šta se
kuca (kontrast 1,23:1) · dečji režim propušta vulgarne reči kroz padeže (284 oblika) ·
zabranjen localStorage obori sajt na 0 rima · pokvaren `rimoteka_favorites` isto ·
tamni režim ne postoji na podstranama.

## Novi fajlovi

| Fajl | Šta je |
|---|---|
| `AUDIT/UPUTSTVO-ZA-POPRAVKE.md` | **radni nalog za sledeću sesiju** |
| `AUDIT/NALAZI-OTVORENI.md` | živi spisak 72 nalaza — izvor istine |
| `AUDIT/2026-07-28-audit.md` | prvi izveštaj |
| `AUDIT/2026-07-29-dopuna.md` | dopuna, 37 nalaza sa scenarijima |
| `AUDIT/PROPUSTI.md` | **zašto je audit promašio ono što je vlasnica našla** |
| `MONETIZACIJA.md` | plan za budućnost — **ne radi se sada** |

## Šta je promenjeno u pravilima (globalno, važi za sve projekte)

- **Audit na svaka 3 dana**, rezultati pod datumom u `AUDIT/GGGG-MM-DD-audit.md`
- **Podsetnik na početku svake sesije** — otvoreni nalazi, sledeće iz TODO, kad je
  bio poslednji audit, šta je zaostalo. **Prvo bagovi, pa novo.**
- **Posle svakog posla obavezan predlog šta dalje + bar jedan istražen inovativan predlog**
- Kompletan protokol za audit upisan u globalni `CLAUDE.md` (ritam, metod, devet
  provera koje se najčešće propuste, pravila za višeagentni audit)
- `TODO.md` dobio odeljak A (inovativni predlozi) i B (šta ne raditi)

## Zamke koje MORAŠ znati

- **Zaglavljen agent nije obavljen posao.** Prvi audit je prijavljen kao gotov, a 70%
  dimenzija se zaglavilo. Pokrivenost ide u naslov izveštaja, ne u fusnotu.
- **Test od 140 provera prolazio je dok je sajt imao 72 nalaza** — obilazi 7 od 2.010
  strana i proverava da element *postoji*, ne da *radi*.
- **Bagovi žive na preseku dva stanja** — tamni režim *i* kucanje; klik na rimu *i*
  kursor usred reči; pretraga *i* prebacivanje tabova. Testirati kombinacije, ne ose.
- **`grep -c` broji redove, ne pojave** — umalo lažna uzbuna da strane nisu
  server-renderovane. Jesu (86–129 reči u statičkom HTML-u).
- **Nalaz mora da navede u kojoj tačno situaciji se kvar dešava.** Prijavljeno je
  „tamni režim se nikad ne vrati" — netačno; opstaje kroz tabove, gubi se na `F5`.
- **Kad vlasnica kaže suprotno od izmerenog — ona je prva u pravu.**

## Podaci koje vredi zapamtiti

- **Saobraćaj (GA, 7 dana):** 38 aktivnih korisnika, 150 pregleda, 124 pretrage rima.
  Srbija 24 · Španija 7. Rast +58% nedeljno. Oko **150 korisnika mesečno** — premalo
  za reklame, dovoljno da se vidi da alat živi.
- **Rimoteka Pro je već napravljena** (backend + frontend), samo nije deployovana;
  Pro dugme zakomentarisano u `index.html:104`. Detalji: `STRIPE-BRIEF-ZA-DRUGO-MISLJENJE.md`.
- **Strane reči su potpuno server-renderovane** — presudno jer GPTBot i ClaudeBot ne
  izvršavaju JavaScript. Uz mali jezik, to je najveća prilika za citiranje u AI odgovorima.

## Sledeći puni audit: 31.07.2026.

---

# Sesija 28. jul 2026 (druga) — „Učitavam rečnik", ćirilica, čipovi, interno povezivanje

> **Stanje: sve je na produkciji i zeleno.** `BASE=https://rimoteka.com node
> test/predeploy.mjs` → **140/140**. Poslednja verzija `?v=20260728j`.
> Sitemap poslat u GSC, IndexNow pinguje Bing/Yandex, Request Indexing urađen
> za 8 strana.

## 0. Šta je vlasnica prijavila i šta je bio uzrok

| Prijava | Pravi uzrok | Zašto niko nije primetio |
|---|---|---|
| „Učitavam rečnik" na početnoj bez ijedne upisane reči | beležnica pozajmljuje vidljivi panel `#rimeResults` da izračuna rime za reč pod kursorom | vidi se samo ako u beležnici ima sačuvanog teksta; na praznom pregledaču nikad |
| ćirilica ne prebacuje nazive tabova | tabovi su postali `<a href>` zbog SEO-a, a selektor je ostao `#tabs button` | nijedna provera nije pokrivala prekidač za pismo |
| ćirilica ne prebacuje tekst strane | prebacivao se samo okvir alata; generisane strane prekidač uopšte nisu ni imale | isto — nula provera |
| ikonice izlaze iz okvira čipa | kolona 11.5rem (184px), a sadržaj čipa traži 196–282px; čip je `inline-flex` bez prelamanja | na telefonu se NE vidi (kolona je tamo šira), a u grupi „dobre rime" okvir je beo na belom |

**Zajednički imenilac: sve četiri su preživele jer ih test nije doticao.** Zato
je uz svaku popravku dodata i provera — test je narastao sa 104 na **140**.

## 0a. Nove sekcije u `test/predeploy.mjs`

| Sekcija | Šta čuva |
|---|---|
| **12e** | panel s rimama je prazan pri učitavanju i kad beležnica ima sačuvan tekst |
| **12f** | prebacivanje pisma — tabovi, rime, placeholder, povratak na latinicu |
| **12g** | ćirilica menja CEO tekst na 4 tipa strana; logo, mejl i skraćenice ostaju |
| **12h** | upisana reč prelazi u ćirilicu (digraf lj → љ); beležnica se NE dira |
| **12i** | nijedna ikonica ne izlazi iz čipa, na 1440/1024/390px |

Sekcija 12e je i **dokazano** hvatala bag: puštena protiv produkcije dok je tamo
još bio stari `app.js` — pala; lokalno sa popravkom — prošla.

## 1. Bag: „Učitavam rečnik…" na početnoj bez ijedne upisane reči

Vlasnica je prijavila da je na početnoj dočekuje poruka „Učitavam rečnik…" iako
ništa nije upisala. Reprodukovano na produkciji i nađen uzrok.

**Uzrok:** beležnica nema svoj pretraživač rima — pri učitavanju računa rime za
reč pod kursorom tako što **pozajmi vidljivi panel `#rimeResults`**
(`renderNoteRhymes` → `doRhymes(true)`). Rečnik u tom trenutku još nije stigao,
pa `doRhymes` u panel upiše „Učitavam rečnik…" i **tu ostane**.

**Koga je pogađalo:** svakog ko je ikad nešto napisao u beležnici (tekst stoji u
`localStorage`). Na potpuno praznom pregledaču se ne vidi — zato je i preživelo.

**Popravka (`public/app.js`):**
- poruke o stanju („Upiši reč", „Učitavam rečnik…") pišu se **samo kad korisnik
  sam traži rime** — tihi poziv ih preskače
- nova funkcija **`tiheRime(word)`** — pozajmi panel, pročita čipove i **vrati
  panel u zatečeno stanje**. Sadržaj se pamti kao **čvorovi, ne `innerHTML`** —
  preko `innerHTML` bi ⓘ/♡/🔁 izgubili osluškivače i postali mrtva dugmad.
  Koriste je `renderNoteRhymes` i `getRhymeListForLastWord`.

**Nuspojava koja je takođe rešena:** beležnica više ne briše rezultate koje
korisnik vidi na tabu „Rimovanje reči".

**Test:** nova sekcija **12e** (4 provere). Dokazano da hvata bag — protiv
produkcije (stari kod) pada, lokalno (novi kod) prolazi.

## 2. Interno povezivanje — šta je bilo pogrešno

**Brojač slogova NIJE bio bez linkova**, kako je delovalo: stajao je u traci
tabova i u futeru, dakle na svih 2.010 strana. Ali su to **šablonski** linkovi,
koje Google jako obezvređuje. Iz **teksta** početne nije vodio **nijedan** —
a tu je „broj slogova" tri puta stajalo kao podebljan **običan tekst**.
Sada ih ima 7 (sa 2).

**Šest strana je bilo u sitemapu, a bez ijednog linka sa sajta:**
`/rime-za-prijatelje/`, `/rime-za-roditelje/`, `/rime-za-novu-godinu/`,
`/rime-za-tugu-i-secanje/`, `/rime-za-decu-o-prirodi/`,
`/rime-za-decu-o-zivotinjama/`. To je stanje koje Google po pravilu ostavlja na
„otkriveno, nije indeksirano". Sada svaka ima **bar dva** linka iz sadržaja
(`SRODNO` mapa u `gen_pages.py`, blok „Srodne strane" na dnu svake tematske
strane) **plus** link u futeru.

## 3. Ključne fraze koje nijedna strana nije pokrivala

Izmereno pretragom kroz svih 2.010 strana — bilo je **nula** pojava:
`podela reči na slogove`, `rastavljanje reči na slogove`, `brojač karaktera`,
`brojač znakova`, `brojač reči`. Alat sve to **radi**, samo nije bilo napisano
onako kako ljudi kucaju. Dodato na `/slogovi/` (dve nove sekcije + dva FAQ-a) i
na početnu (dva FAQ-a).

Uz to ispravljeno: u FAQ-u početne je pisalo „u tabu **Slogovi i znakovi**" —
tab se odavno zove „Brojač slogova i karaktera" i ima svoju stranu. Ispravljeno
i u vidljivom tekstu i u `FAQPage` šemi (moraju da se poklapaju).

## 4. Ćirilica — sada menja ceo tekst, ali NE sve

Prekidač je bio ograničen na okvir alata i rezultate. Sada menja i naslov, uvod,
SEO tekst, sekcije, česta pitanja, futer — i to na **svim tipovima strana**
(prekidač je dodat u zaglavlje generisanih strana, a `app.js` ide na svaku
tematsku stranu; rečnik se pri tom **ne skida**, `bootstrap` ga traži samo ako
na strani postoji alat koji pretražuje reči).

**Šta se NAMERNO ne prebacuje** — sve troje bi bio kvar, ne osobina:

| Ne dira se | Zašto |
|---|---|
| logo i ime u futeru | pravilo 8a u `CLAUDE.md` — logo se ne dira |
| mejl i domen (`info@rimoteka.com`) | u ćirilici prestaje da bude adresa |
| skraćenice velikim slovima (PDF, ABAB, AABB) | to su oznake, ne reči |
| **beležnica i brojač slogova** | tamo je tekst korisnika; pesma se čuva na uređaju i alat je ne sme prekucavati sam |

**Upisana reč** u poljima za rime, pretragu i igru prelazi u izabrano pismo, u
oba smera. Prebacuje se **preko latinice** (`toCyr(toLatin(v))`) — bez toga
digrafi ne rade: posle „l" stoji „л", pa bi „j" dalo „лј" umesto „љ".

## 5. Česta pitanja — zašto u njima nije bilo nijednog linka

Odgovori su se HTML-escapeovali (`esc(a)`), pa bi svaki `<a>` ispao kao goli
tekst. Zato **nijedan generisani FAQ nije imao ijedan link**, iako odgovori
pominju druge alate („u tabu Klasici", „ima beležnicu…").

Rešenje: `faq_sa_linkovima()` — escapuje pa naziv alata pretvara u link. Traži
samo po delovima koji **još nisu link** (inače bi se kasnija fraza uhvatila
unutar već ubačenog `href`-a), preskače link na samu sebe, najviše **2 po
odgovoru**. `FAQPage` šema i dalje dobija **čist tekst** — HTML u šemi nije
dozvoljen. Padeži stoje izbrojani u `FAQ_LINKOVI` (nastavci se u srpskom ne
izvode iz nominativa).

**Rezultat:** 10 odgovora je dobilo link, 0 ih je ostalo da pominje alat bez linka.

**Da li su česta pitanja ista na svim stranama?** Nisu: **81 različito pitanje
na 22 strane**, a ponavljaju se samo tri, po dva puta — i to na strani kojoj
pitanje prirodno pripada (početna + `/rimovanje-reci/`, početna + `/slogovi/`).
Nije problem duplog sadržaja.

## 6. Čipovi — zašto su ikonice izlazile iz okvira

Izmereno: sadržaj čipa (reč + broj slogova + tri ikonice) traži **196–282px**, a
kolona je bila `minmax(11.5rem, 1fr)` = **184px**. Čip je bio `inline-flex` bez
prelamanja, pa mu je sadržaj probijao sopstveni okvir.

Popravka: kolona **15rem** + `flex-wrap:wrap` i `min-width:0` na čipu, pa kod
duge reči ikonice pređu u drugi red **unutar** pilule; reč ostaje cela.
`overflow-wrap:anywhere` na reči je krajnja zaštita za uzak ekran.

**Fiksna širina ne može oba** — kratke reči bi trošile prazan prostor, duge bi
i dalje virile. Zato prelamanje, ne šira kolona.

## Zamke

- **`?v=` podignut na `20260728j`** u `public/index.html` **i**
  `build/gen_pages.py` — obavezno oba.
- **Blok „Srodne strane" koristi postojeće klase** (`.res-group`, `.seo-p`) —
  nije dodata nijedna linija CSS-a.
- **Futer mora biti isti** u `public/index.html` i `FOOTER_TMPL` u
  `gen_pages.py`. Red „Namene" je proširen sa 6 na 12 linkova — u oba fajla.
- **`app.js` sada ide na SVAKU tematsku stranu**, i kad na njoj nema alata —
  bez njega prekidač za pismo ne bi radio.
- **Oznaka za skraćenice u `convertTextNodes` mora biti ` `**, ne broj —
  sa običnim brojem bi „ima 3 sloga" bilo prepoznato kao oznaka i tekst bi se
  pokvario.

## 7. Google Search Console — urađeno

- **Sitemap** ponovo poslat (2.010 URL-ova) — „Sitemap submitted successfully"
- **IndexNow** ping: Bing 200, Yandex 202
- **Request Indexing** za 8 strana. Zatečeno stanje je potvrdilo dijagnozu —
  sve strane bez dolaznih linkova bile su **„URL is not on Google"**:

| Strana | Zatečeno stanje |
|---|---|
| `/rime-za-prijatelje/` | nije bila na Google-u |
| `/rime-za-roditelje/` | nije bila na Google-u |
| `/rime-za-novu-godinu/` | nije bila na Google-u |
| `/pisanje-pesama/` | nije bila na Google-u |
| `/recnik-srpskog-jezika/` | nije bila na Google-u |
| `/klasici/` | nije bila na Google-u |
| `/igra-rimovanja/` | nije bila na Google-u |
| `/slogovi/` | jeste bila |
| `/rimovanje-reci/` | jeste bila (prvi pokušaj pao sa „Something went wrong", drugi prošao) |

**Redosled je ispravila vlasnica** i bila je u pravu: krenuo sam od strana bez
ijednog linka, a prednost imaju **nove strane alata** — one su vrednije, a
dnevna kvota za Request Indexing je oko 10-12.

**Ostalo za sutra (kvota):** `/rime-za-tugu-i-secanje/`,
`/rime-za-decu-o-prirodi/`, `/rime-za-decu-o-zivotinjama/`.

> Podatak koji vredi zapamtiti: GSC pokazuje **124 indeksirane** i **1.012
> neindeksiranih** strana. Interno povezivanje iz ove sesije cilja upravo taj
> odnos.

## Šta čeka

1. Sutra: Request Indexing za preostale 3 strane (kvota)
2. Za 7-10 dana proveriti u GSC da li su strane iz tabele prešle u „indeksirano"
3. Ostalo je nedirnuto u `TODO.md` (dečji režim, nove reči, staging grana,
   4.769 reči sa objašnjenjem kojih nema u rečniku)

---

# Sesija 28. jul 2026 — svaki alat dobio svoju stranu

> **Stanje: sve je na produkciji i zeleno.** `node test/predeploy.mjs` → **104/104**,
> i lokalno i protiv `https://rimoteka.com`. Commit `2067fe2e`.

## 1. Traka tabova je postala navigacija sajta

Do sada su svi alati živeli na jednom URL-u, pa je Google mogao da rangira samo
**jednu** nameru i prečice u rezultatima nisu bile moguće. Sada svaki alat ima
svoju stranu **sa živim alatom na njoj**, a ista traka stoji na **svakoj** strani.

| Tab | Strana | Napomena |
|-----|--------|----------|
| Rimovanje reči | `/rimovanje-reci/` | postojala |
| Rečnik | `/recnik-srpskog-jezika/` | novo (bilo „Pretraga reči") |
| Brojač slogova i karaktera | `/slogovi/` | postojala, ali **bez alata** — sada ga ima |
| Pisanje pesama | `/pisanje-pesama/` | novo |
| Klasici | `/klasici/` | novo |
| Igra rimovanja | `/igra-rimovanja/` | novo |

„Omiljene" namerno nema stranu — lične reči, Google tu nema šta da indeksira.

**Kako radi:** stavke su pravi `<a href>`. Gde panel postoji (na početnoj svi),
klik se presreće i tab se prebaci **bez osvežavanja**; gde ga nema, link radi
normalno. **Markup alata se ne prepisuje** u `gen_pages.py` nego se čita iz
`index.html` pri buildu — dve kopije bi se razišle.

## 2. Beležnica

Metar (ritam slog po slog, cezura deseterac 4+6 i dvanaesterac 6+6, mera stiha,
broj stihova koji odstupaju), šema rime A/B/C, premeštanje stihova prevlačenjem,
panel sa rimama uz editor (na telefonu prikačen za dno), „još N rima", legenda.

**Akcenat se izvodi samo iz sigurnih pravila.** Kod reči od 3+ sloga mesto
akcenta se **ne nagađa** — stoji „akcenat je na jednom od ovih slogova".

## 3. Brojač slogova — jedno polje umesto dva

Brojevi stoje levo od reda; tekst se više ne ponavlja ispod. Polje je i dalje
`<textarea>`, a položaj redova se meri na nevidljivoj kopiji (`#sylMirror`) —
po jedan `<div>` za svaki red, pa se prelama identično.

## 4. Rečnik

- **−48 ćelavih latinica** (`zmurke`→`žmurke`). Pre brisanja provereno da svaka
  ima ispravan parnjak — svih 48 ga je imalo.
- **19 imperativa glagola na -ći** (`tuci`, `izvuci`, `uteci`) prepoznato kao
  **ispravno** i zadržano — umalo obrisani zajedno sa ćelavima.
- **−1** izmišljena `mladoturke` · **+2** `tate`, `tati` (falili kod *tata*).

## 5. SEO tekst

Izbačene tvrdnje koje ne bi izdržale proveru (stajalo je „nema ga nijedan rimer
u svetu" — RhymeZone ima objašnjenja, na engleskom). Brojevi se zaokružuju
**naniže**. Tekst o alatu pripada tabu „Rimovanje reči" i ne stoji nad ostalim
tabovima. Dodato interno povezivanje — tri strane nisu imale nijedan dolazni
link iz sadržaja.

## Bugovi nađeni i popravljeni

1. **`app.js` je padao na svakoj strani bez polja za rime** — `rimeInput.parentNode`
   je `null`; skripta pukne i **obori sve alate na toj strani**. Izašlo tek kad je
   napravljena prva takva strana.
2. **Igra je zadavala nerešive reči.** Prva „popravka" je bila POGREŠNA: igra
   priznaje savršenu rimu **ili asonancu**, a provera je gledala samo savršenu.
3. **Gutter je merio vrh otiska slova umesto linijskog okvira** — brojevi su
   sedeli pola proreda niže; klizio i kod prelomljenih redova.
4. Rime su bile u flex rasporedu pa je poslednja visila sama → mreža.
5. Sinonimi su ulazili u panel uz stih („naći" → *izumeti, otkriti*).
6. Klik na rimu ju je lepio bez razmaka i rušio panel (okvir je „treperio").
7. Srpska množina u metru („2 sloga"), i „0 slogova" više ne postoji.

## Zamke koje MORAŠ znati

- **Brojač i beležnica dele klasu `.gutter-row`** — svaki upit vezati za svoj
  gutter (`#noteGutter …` / `#sylGutter …`), inače hvata oba.
- **Verzija keša `?v=`** mora da se podigne u `public/index.html` **i** u
  `build/gen_pages.py`. Bile su tri različite u opticaju i korisnica je danima
  gledala staru skriptu.
- **Dve sesije rade u istom folderu** — komitovati samo svoje fajlove
  (`git add <putanje>`), nikad `git add -A`.
- **Tvrdnje na sajtu**: „jedini na srpskom" sme, „prvi u svetu" ne (postoje
  Versepad, GoRhyme, RHYMEBOOK, Poem Analysis na engleskom). Brojevi se prebroje
  pa zaokruže naniže. Pravilo je u `TODO.md`, tačka 8.

## Sledeće — sve je u `TODO.md`

Dečji režim · nove reči · **staging grana** · GSC · **4.769 reči ima objašnjenje
ali ih nema u rečniku** · stope (trohej, jamb) čekaju akcentovani rečnik.

---

# Handover — sesija 26–27. jul 2026

> Prethodni handover (26.07. u 03:00) upozoravao je da je sajt „možda pokvaren".
> **Bio je pokvaren. Sada radi.** Uzrok je nađen, popravljen i pokriven testom.

---

## STANJE SAJTA

**Produkcija radi.** `https://rimoteka.com` — rime rade, svih 7 tabova radi,
konzola bez grešaka. **84 provere prolaze** i lokalno i protiv produkcije.

**Pre bilo kakvog deploy-a:**

```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
node test/predeploy.mjs                              # lokalno
BASE=https://rimoteka.com node test/predeploy.mjs    # posle deploy-a
```

Deploy je dozvoljen **samo** ako ispiše „Sme deploy". **Test se pokreće i posle
deploy-a protiv produkcije** — lokalno prošlo ne znači da je deploy prošao. To
se već pokazalo tačnim: prvo pokretanje protiv produkcije je palo.

---

## 1. ŠTA JE OBORILO SAJT

**Uzrok:** Pro dugme je bilo zakomentarisano u `index.html`, a `app.js` je i
dalje radio `proToggle.onclick = ...`. To je na top-levelu bacilo `TypeError`
koji je prekinuo izvršavanje **cele skripte pre `loadDict()`** na kraju fajla.
`WORDS` prazan, večno „Učitavam rečnik…", mrtvo dugme „Nađi rime", mrtva igra,
mrtvi tabovi. **Jedna greška = ceo sajt.**

**Popravke:**
- **Sigurnosna mreža** — `bootstrap()` se poziva i iz `setTimeout` na vrhu
  fajla, pa se rečnik učita i kad skripta pukne. Testirano namernim fatalnim
  crashom na istom mestu.
- **`el(id)`** — vraća pravi element ili bezopasan prazan objekat.
  **VAŽNO:** `el()` nikad ne vraća `null`, pa se **ne sme** koristiti tamo gde
  `if (element)` odlučuje *da li* se nešto radi (Pro tok, predaja igrača, tamni
  režim) — tamo ostaje `getElementById`.
- **`loadExtras`** — `Math.max(...Object.values(freqRes))` sa 435.000
  argumenata je obarao stek i tiho gasio i rangiranje i sinonime. Zamenjeno
  petljom. **Sinonimi i frekvencija su time proradili prvi put.**
- **Apsolutne putanje** — `fetch('reci.txt')` je sa `/rimovanje-reci/` tražio
  `/rimovanje-reci/reci.txt`.
- **`/api/status`** se više ne zove kad je Pro sakriven (bio 404 na svakoj poseti).

---

## 2. KEŠ — zašto je korisnicima ostajala pokvarena verzija

Tri uzroka. **Ne vraćati ništa od ovoga:**

1. **HTML nikad cache-first.** `sw.js` je imao `/` i `/index.html` u `ASSETS`.
2. **Bez velikih fajlova u precache.** `cache.addAll` je skidao
   `definicije.json` (20 MB); pošto je sve-ili-ništa, jedan neuspeh je obarao
   instalaciju SW-a i **stari keš se nikad nije brisao**.
3. **`sw.js` i `sw-register.js` su `no-store`** u `nginx.conf`, iznad pravila za
   `.js`. Bili su keširani 7 dana — a `sw.js` je prekidač za sve ostale keševe.

**Osvežavanje radi service worker sam** (`client.navigate()` u `activate`), ne
skripta na strani — zaglavljen korisnik učitava stari `index.html`, pa i staru
verziju te skripte.

**Na `localhost` nema service workera** — ne registruje se, a postojeći se
odjavljuje i keš mu se briše. *(Ovo je bilo pravi problem: vlasnica je dva puta
prijavila da „ništa ne radi na lokalu", a radilo je — gledala je keš.)*

**Poslednja linija odbrane:** ako rečnik ipak ne uspe, korisnik dobija dugme
„Očisti i probaj ponovo" umesto mrtve strane.

---

## 3. ŠTA JE URAĐENO NA SAJTU

- **Legenda ispod pretrage** — objašnjava `2` (slogovi), `ⓘ` (značenje), `♡`
  (Omiljene), `🔁` (nađi rime), i da se klikom na reč kopira. Nastala jer je
  vlasnica na telefonu videla „usvajanje (4)" i tri sitne ikonice bez ijednog
  objašnjenja; na telefonu nema prelaska mišem pa `title` ne pomaže.
- **Sinonimi u zasebnoj kartici** — mint akcent, odmah ispod „Najbolje rime".
  Ranije na dnu ispod stotinu rima, praktično nevidljivi.
- **Dizajn igre** — sedam klasa iz HTML-a (`game-word-box`, `game-word`,
  `game-input-row`, `game-feedback`, `game-label`, `game-value`, `game-combo`)
  **nije imalo nijednu liniju CSS-a**. Dodato: reč u gradijentu, tajmer kao
  prsten, bedž „🔥 N u nizu", animacije, obojena dugmad.
- **Ekran za predaju igrača** — igra staje između igrača. Ranije je drugom
  igraču vreme otkucavalo dok je uređaj bio u prvoj ruci. Uz to sređena i trka
  zakazanih prelaza (`gameState`).
- **Živi alat na `/rimovanje-reci/`** — rimuje na mestu. Koristi **isti
  `app.js`**, namerno, da se dva algoritma nikad ne raziđu.
- **Jedan `h1` po strani** — logo je bio `h1` na svakoj strani uz pravi naslov.
- **Kockica i igra** biraju iz 8.000 najčešćih reči (davalo je „praotaca").
- **Ispravljena netačna tvrdnja** na početnoj: „preko 340.000 reči sa
  objašnjenjima" → stvarno ih je 282.900.
- **SEO:** nova strana `/rimovanje-reci/` (exact-match slug), istaknute
  prednosti (definicije, sinonimi, bliske rime, brojač slogova i karaktera,
  igra), link u footeru svih 1.988 strana, IndexNow ping.

### Novo rangiranje rima (27.07.)
**„Najbolje rime" = reči sa istim brojem slogova** kao tražena reč.
Ranije je merilo bilo „više zajedničkih slova", pa su za „rima" u vrh ulazili
`stvarima`, `centrima`, `dobrima` — gde je zajedničko `rima` **nenaglašeno** —
a `štima` je padalo na **111. mesto**. Sada je na 22, a prvih 15 su sve
dvosložne. Detalji u poglavlju 6.

---

## 4. PRAVILA UVEDENA U OVOJ SESIJI (ne kršiti)

| Pravilo | Gde je zapisano |
|---|---|
| **Obavezan test pre svakog deploy-a** — 84 provere u pravom Chromiumu; kad se doda funkcija, dodaje se i provera | `CLAUDE.md` 9a |
| **Logo se ne dira** — nije `h1`, pa mu `font-family: Fredoka` mora biti eksplicitan; bez toga tiho padne na Quicksand | `CLAUDE.md` 8a |
| **Izvor istine je zvanična literatura, ne naš rečnik** — `reci.txt` i `definicije.json` su predmet provere, ne merilo; zabranjeno nagađanje | `CLAUDE.md` 0, gramatika 3b |
| **Isti broj slogova = najbolja rima** — ne vraćati staro pravilo | `CLAUDE.md` 6.2a, gramatika 7a |
| **Izveštaji vlasnici idu u TABELI**, ne u rečenicama | gramatika 9b |

---

## 5. GRAMATIKA — `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`

**Obavezno pročitati pre bilo kakvog rada sa rečnikom.**

Središnje pravilo: **glagol ima dve osnove** — infinitivnu i prezentsku — i
jedna se ne izvodi iz druge (*pisati → pišem*, *šaptati → šapćem*,
*dreždati → dreždim*). Odatle su došle skoro sve greške.

Sadrži: vrste reči i zamke homografa; imenice (rod, broj, padež, tri
deklinacije, glasovne promene); pridevi; glagoli (lični/nelični oblici, vid,
obrasci prezenta); glasovne promene; slogovi i slogotvorno `r`; akcenat i veza
sa kvalitetom rime; pravopis; operativna pravila.

- **Poglavlje 7a** — pravilo o rangiranju rima
- **Poglavlje 9a** — izmereno stanje rečnika
- **Poglavlje 9b** — **13 grešaka** koje je moj kod napravio, svaka sa uzrokom
  i pravilom
- **Poglavlje 10** — **dnevnik ispravki vlasnice**, najpouzdaniji deo dokumenta

---

## 6. REČNIK — šta je urađeno

### Dodato (uz odobrenje vlasnice)
- **40 oblika** za `brst` / `brstiti` / `obrstiti` / `njakati`
- **`brstenje`** (nije `brštenje` — jotovanje se ne primenjuje mehanički)
- **13 oblika glagola `štimati`** — reč iz slogana sajta („rimovanje za lakše
  štimovanje") **nije bila u `reci.txt`** pa nije mogla da se rimuje.
  Zanimljivo: `štimati` je **imao objašnjenje** u `definicije.json` a reči nije
  bilo u `reci.txt`.

### Sklonjeno
- `njakam`, `njakaš`, `njakamo`, `njakate`, `njakaju`, `njakaj`, `njakajte`,
  `njaka` — vlasnica potvrdila da ne postoje. Glagol *njakati* ima samo
  palatalizovani prezent: *njačem, njačeš, njače, njačemo, njačete, njaču*.

### Ispravljena objašnjenja
- **`slik`** — pisalo je samo „nadimak; sjajan sloj (engleski slick)". Rečnik
  Matice srpske potvrđuje da su **`slik` i `srok` srpski književni termini za
  rimu** („слик (срок, рима) књиж."). Sinonimi za „rima" su bili tačni —
  greška je bila u našem objašnjenju.
- **`aminati`** postoji i ostaje; značenja razdvojena: *aminati* = izgovarati
  reč amin, *aminovati* = složiti se s tuđim mišljenjem.

### Izmereno stanje
- **Glagoli:** od 6.120 potvrđenih, **1.827 ima krnju paradigmu**
- **Imenice:** 23.907 prepoznato; prosečno **fali oko polovine padeža**
  (muški 4,8/9, ženski 3,9/9, srednji 3,3/7)

---

## 7. IZVORI — `IZVORI-RECNIKA.md`

### Rečnik srpskoga jezika, Matica srpska (2011)
https://archive.org/details/recnik-srpskoga-jezika-2011

- **Odrednice se čitaju TAČNO** — 56% izvučenih poklopilo se sa rečima koje već
  imamo, što je nezavisna potvrda
- **Objašnjenja su POKVARENA** — kurzivno `т` → `ш`, `г` → `ћ` (*вазауха*,
  *шихи шум*, *нарочишим*). Zato objašnjenja **pišemo sami**, samo proveravamo
  da znače isto
- **Oznake `покр.` / `заст.` / `дијал.` se NE MOGU pročitati** — 0, 3 i 1
  čitljiva pojava u celom rečniku. **Pokrajinsko i zastarelo se iz tog izvora
  ne može automatski izbaciti**

### srLex 1.3 — NIJE MERODAVAN
6.905.941 oblik, 169.328 lema. Pet razloga zašto se ne sme uzeti kao autoritet:

1. **sadrži hrvatske reči** — izmereno: `kolodvor`, `zrakoplov`, `nogomet`,
   `glazba`, `tvrtka`, `tisuća`, `shvaćanje`
2. **sadrži pokrajinske, žargonske i zastarele** jednako kao standardne
3. **nema nijednu normativnu oznaku** — nigde ne piše da li je reč standardna
4. **38% su vlastita imena** iz veba
5. **glagola ima samo 9.653 leme** — malo za srpski

Sme se koristiti za frekvencije, kao **drugi izvor koji potvrđuje postojanje
oblika**, i za gramatičke oznake **kao trag** — nikad kao dokaz.

### Prepoznavanje hrvatskog
Reč se meri u **oba korpusa** (srpskom i hrvatskom), učestalost se normalizuje
po veličini (hrvatski je oko 1,4× veći), i ono što je bar **tri puta češće u
hrvatskom uz bar 300 pojava tamo** označava se kao hrvatsko.

**Prag od 300 je nužan** — bez njega su `agrotehničar` (6 pojava), `aritmetičar`
(1) i `ekskavator` (3) ispadali „hrvatski".

**Filter nije savršen** — označio je i `sedamdesetak` i `sranje`, obične srpske
reči koje su samo češće u hrvatskom veb tekstu.

### Naš `frekvencija.json` je bio pokvaren — DVA razloga
1. **Prepisivanje umesto sabiranja.** Isti oblik se u izvoru pojavljuje više
   puta sa različitim oznakama (`voda` je i *voda* i genitiv množine od *vod*).
   **110.931 od 208.700 reči ima pogrešan broj** — `koji` 5 umesto 2.805.274,
   `kao` 49 umesto 2.091.751, `dva` 9 umesto 344.730, `voda` 876 umesto 47.298.
2. **Filtriran je na naš rečnik** — sadrži nula reči kojih nema u `reci.txt`,
   pa **ne može da potvrdi nijednu novu reč**.

> Druga greška je dovela do pogrešnog zaključka: test „ima li srLex hrvatske
> reči" davao je „nema", a zapravo je merio naš sopstveni rečnik.

**Ispravan fajl je napravljen, NIJE postavljen.**

---

## 8. ČEKA ODLUKU VLASNICE

1. **`RECNIK-NOVE-RECI.md`** — 5.459 reči iz Rečnika Matice srpske kojih nemamo:
   - **A1 preporučene (1.140)** — u dva izvora, nisu označene kao hrvatske
   - A2 označene kao hrvatske (135) — proveriti, ima grešaka
   - B samo u Rečniku MS (4.184) — nisu proverene ni na hrvatsko
2. **Ispravan `frekvencija.json`** — ne dodaje nijednu reč, samo ispravlja
   redosled rima
3. **Presuda o pokrajinskom i zastarelom** — nijedan izvor koji imamo to ne zna

### Zamrznuto
- `RECNIK-PREDLOG.md` — 13.827 oblika za glagole
- `RECNIK-PREDLOG-SREDNJI-ROD.md` — 1.058 padeža za imenice srednjeg roda

Zamrznuto na zahtev vlasnice: nema smisla dopunjavati rečnik dok se ne zna šta
u njemu već ne valja. Vidi `TODO-RECNIK.md`.

---

## 9. ZAMKE ZA SLEDEĆU SESIJU

**Dve sesije u istom folderu se gaze.** Druga sesija je dva puta vratila
`app.js`, `style.css` i `index.html` na poslednji commit i pojela gotov posao.
Proveriti `git status` pre i posle svake veće izmene.

**Lokalni server iz mojih komandi vlasnica ne vidi.** Komande se izvršavaju u
izolovanom okruženju sa svojom mrežom. Ako treba da pregleda lokalno, server
mora ona da pokrene (`! python3 -m http.server 8765` iz `public/`).

**`gen_pages.py` briše `public/rime-za/`** pre generisanja. Ako neko čita iz tog
foldera, `rmtree` pukne i ostavi ga pola obrisanog. Sada ima zaštitu, ali pre
pokretanja: `pkill -f http.server`.

**Test ne sme string-evaluaciju** — sajtov CSP zabranjuje `eval`, pa je test
prijavljivao lažnu grešku koju sajt nije pravio.

**Pri prvoj poseti SW osveži stranu** i testu obriše kontekst — zato test
čekanje na rečnik ponavlja do 3 puta.

**`clarin.si` je spor** — treba 240s timeout i pokretanje van izolovanog
okruženja.

---

## 10. ŠTA BIH SLEDEĆE PREDLOŽIO

1. **Postaviti ispravan `frekvencija.json`** — jedina merljiva greška koja
   *sada* kvari sajt; 110.931 reč je rangirana po pogrešnom broju
2. **Pregled grupe A1** iz `RECNIK-NOVE-RECI.md` — 1.140 reči, najveći dobitak
   uz najmanji rizik
3. **Izdići definicije** u rezultatima, kao što su izdignuti sinonimi — 282.900
   objašnjenja se vidi samo klikom na sitnu ikonicu, a to je prednost koju
   konkurencija nema
4. **GSC** — pozicija za „rimovanje reči" bila je 4,4 dana 24.07.; podaci za
   dane kad je sajt bio pokvaren stižu sa zakašnjenjem

---

## 11. ŠTA JE OVA SESIJA NAUČILA

**Skoro svaka moja veća greška došla je iz nagađanja**, ne iz neznanja o kodu:
`njakam`, `bankomam`, `akrobaša`, `prošaptam`, `dreždam`, `telesu`, `čudesu`,
`nebima`, `finalem`, `morimu`, `bannem`, `brštenje`.

Sve ih je uhvatila ili vlasnica ili kontrola na rečima gde se odgovor zna
unapred. **Nijedna nije ušla u rečnik.**

Zato su pravila o **zvaničnoj literaturi kao jedinom izvoru** i o **tabelarnim
izveštajima** važnija od bilo koje pojedinačne popravke — ona sprečavaju klasu
grešaka, ne jednu grešku.

Drugi nauk: **dva izvora štite samo od one greške koju ne dele.** Grupu A sam
označio kao „potvrđena u dva izvora" i time joj dao lažno poverenje — a oba
izvora sadrže hrvatski, pa protiv hrvatskog nisu štitila nimalo. Vlasnica je to
odmah videla po rečima `val` i `šalica`.

---

*Poslednje ažuriranje: 27. jul 2026.*
