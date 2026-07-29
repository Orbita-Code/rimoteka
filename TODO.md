# TODO — Rimoteka (sajt i alati)

> Rečnik ima svoj spisak u `TODO-RECNIK.md`. Ovde je sve ostalo.
> Poslednje ažuriranje: 29. jul 2026.

---

## ⚠️ PROČITATI PRVO — STANJE NA DAN 29.07.2026 (uveče)

| | |
|---|---|
| **Otvorenih nalaza iz audita** | **2** (0 kritičnih) → `AUDIT/NALAZI-OTVORENI.md` |
| Sve popravljeno je **na produkciji** | `main` = deployovano, test protiv produkcije prolazi |
| Ocena poslednjeg audita | **6,9 / 10** (nova se računa u auditu 31.07.) |
| Sledeći audit | **31.07.2026** |
| Zašto propusti | `AUDIT/PROPUSTI.md` |
| **Plan monetizacije** | `MONETIZACIJA.md` — **ne radi se sada**, sajt je još mali (150–160 korisnika mesečno) |

---

## 0. SLEDEĆE PO REDU — dogovoreno sa vlasnicom 29.07.2026

### 0.0 Hub `/rime-za/` i izbor reči za strane — **ODLOŽENO NA ZAHTEV VLASNICE (29.07. uveče)**

> Dva nalaza, **isti uzrok**: `AUDIT/NALAZI-OTVORENI.md` → **P10** i **P11**.

**Šta je zatečeno, prebrojano u fajlovima:**

| Merenje | Vrednost |
|---|---|
| strana reči ukupno | 1.988 |
| od toga na slovo „a" | **1.577** (`aaa`, `aah`, `abadzija`, `abakusi`, `abazur`…) |
| visina hub strane `/rime-za/` | 8.027 px, 1.988 linkova na jednoj strani |
| slovo „C" | 9 strana · „E" 1 · „H" 1 |

**Uzrok (`build/gen_pages.py`):** auto-dopuna do 2.000 meta-reči ide `for w in words`,
a `words` je `reci.txt` **redom kako stoji u fajlu — abecedno**. Generator je zato
stao na slovu „b". Uz to `rank = {w: i for i, w in enumerate(words)}` (linija 605)
je **redni broj po abecedi**, a ne učestalost — `gen_pages.py` **nikad ne učita
`frekvencija.json`**, iako komentar na liniji 646 tvrdi „frekvencijski rangirane".
Živi alat (`app.js:346`) učestalost **koristi**, pa se dva rangiranja razilaze:
`/rime-za/ljubav/` daje `neljubav, gubav, ubav…`, alat za istu reč `gubav, ubav, glibav…`.

**Zašto nije urađeno odmah:** popravka izbora reči briše **1.577 postojećih adresa**.
Ako ih je Google indeksirao, to je 1.577 novih 404-ki. Traži plan preusmerenja
(301 ka hubu ili ka najbližoj reči), pa se ne gura u isti deploy sa popravkama bagova.

**Predložen redosled kad se uzme:**
1. `gen_pages.py` učita `frekvencija.json` i `rank` računa po učestalosti (isto kao `app.js`).
2. Izvući spisak **postojećih** 1.988 slugova pre regeneracije → uporediti sa novim →
   za svaki koji nestaje napisati 301 u `nginx.conf`.
3. Hub podeliti po slovima: `/rime-za/` = 30 kartica sa slovima i brojevima,
   spisak se seli na `/rime-za/a/`, `/rime-za/b/`… Nijedan URL strane reči se ne dira.
4. Sitemap, GSC, pa merenje.

### 0.1 Strana `/omiljene/` umesto `/?tab=omiljene` — **ODOBRENO**

Omiljene reči žive **samo na uređaju korisnika**, pa strana mora da nosi
`<meta name="robots" content="noindex,follow">` i **ne sme u sitemap** — inače bi
Google indeksirao stranu koja je za svakog posetioca prazna.

**Zašto nije urađeno odmah:** podstrane (`/klasici/`, `/slogovi/`…) **nemaju
panele uopšte** — svaka je zasebna strana sa jednim ugrađenim alatom, a ne kopija
početne. Znači ovo nije preimenovanje nego **nov tip strane**, i nije se smelo
gurati u isti deploy sa svim ostalim.

Koraci:
1. U `build/gen_pages.py`, po uzoru na hub stranu (`/rime-za/`), napraviti
   `/omiljene/` sa `noindex` i **bez** upisa u `sitemap_entries`.
2. Telo strane: prazan okvir u koji `renderFavorites()` upiše spisak iz
   `localStorage`, plus poruka kad je prazno („Još nemaš omiljenih reči…").
3. U `public/app.js` promeniti `TAB_URL_FALLBACK.omiljene` sa `/?tab=omiljene`
   na `/omiljene/`, a dugme u `index.html` u `<a href="/omiljene/">` (ostaje
   `data-tab="omiljene"`, `tabHref()` sam pokupi `href`).
4. `Disallow: /*?tab=` u `robots.txt` može da ostane.
5. Provera u `test/predeploy.mjs`: `/omiljene/` vraća 200, ima `noindex`, **nije**
   u sitemapu, i „Nazad" iz omiljenih vraća na prethodni tab.

### 0.2 Verzije logotipa — **TRAŽI ALAT ZA CRTANJE, ne mogu ja**

Vlasnica: logo je pravljen u alatu tipa *nano banana*; treba više verzija, jer
kad neko stavlja link ka Rimoteci na svoj sajt, mora da ima šta da uzme.

**Šta tačno treba naručiti:**

| Verzija | Za šta služi | Format |
|---|---|---|
| **A — samo „R" sa lupom** | favicon, avatar, aplikacija, mali prostori | SVG + PNG 512, 192, 48 |
| **B — „R" + „imoteka"** | zaglavlje sajta, potpis, tuđi sajtovi | SVG + PNG 1200×630 (OG), 600, 300 |
| **C — jednobojna** (crna i bela) | štampa, tamne podloge, sponzorske trake | SVG |

Uz to: **prozirna pozadina**, isti font (**Fredoka**), i strana `/logo/` ili
`/za-medije/` odakle se sve skida (dobra i za link building).

> **Vezano za nalaz P1:** `logo-icon.png` je sada **292 KB, 512×512**, a prikazuje se
> na **46×46 px** — na 4G zauzme vezu ~5 s i gura rečnik na kraj reda. To NIJE
> greška u dizajnu logotipa nego samo u veličini fajla. Kad stigne verzija A u
> pravim veličinama, P1 se zatvara sam. Do tada logo ostaje netaknut (pravilo 8a).

### 0.3 `/slogovi/` se NE preimenuje — **odlučeno**

Razmatrano `/brojac-slogova-i-karaktera/`. Odbačeno: ključna reč je već u adresi,
`<title>` i `<h1>` nose pun izraz („Brojanje slogova i karaktera"), a promena URL-a
košta 301 i ponovno indeksiranje. Rast na tom upitu traži **sadržaj na strani**
(pitanja i odgovori „koliko slogova ima reč…", tabela primera), ne dužu adresu.

**PRAVILO REDOSLEDA: prvo se popravljaju bagovi, pa se onda gradi novo.**
Inovacije iz odeljka A ispod **ne počinju** dok kritični nalazi nisu zatvoreni.
Cilj nije više funkcija nego **najbolji alat bez bagova**.

**Claude na početku SVAKE sesije podseća na ovaj spisak** — koliko je otvorenih
nalaza, šta je sledeće po redu, i koliko je prošlo od poslednjeg audita.

---

## A. INOVATIVNI PREDLOZI — istraženi, ne izmišljeni

> Svaki je proveren naspram onoga što rade najbolji svetski alati (RhymeZone,
> RapPad, RhymeFlux, MasterWriter, RHYMEBOOK, Rhymer's Block).
> Poređano po odnosu vrednosti i truda.

### A1. „Zameni i vrati u meru" — spoj zamene rime sa metrom
**Šta:** kad zameniš reč na kraju stiha, alat odmah proveri da li stih i dalje ima isti
broj slogova kao ostali — i ako ne, ponudi rime koje ga vraćaju u meru.

**Zašto:** metar, šemu rime i slogove **već računamo** — ovo ih samo spaja sa zamenom
reči. **Nijedan istraženi alat ne povezuje zamenu rime sa proverom metra**; svi daju
listu pa se snađi. Autori dečjih knjiga izričito kažu da im je nekonzistentan metar
veći problem od rime.

**Trud:** nekoliko dana. **Uslov:** prvo popraviti V6 (zamena reči uopšte ne radi kako treba).

### A2. MCP server za Rimoteku
**Šta:** alati `rime(reč)`, `slogovi(tekst)`, `značenje(reč)` — alat postaje pozivljiv
direktno iz Claude-a i ChatGPT-a.

**Zašto:** **ne postoji nijedan MCP server za srpske rime.** Najveća asimetrija truda i
konkurencije koju je istraživanje našlo. Uz to su nam strane reči već potpuno
server-renderovane (86–129 reči u statičkom HTML-u), što je preduslov koji većina
sajtova ne ispunjava — GPTBot i ClaudeBot ne izvršavaju JavaScript.

**Trud:** nekoliko dana.

### A3. Javni JSON API
**Šta:** `GET /api/rime/{reč}` → `{reč, slogovi, rime[], definicija}` + OpenAPI opis.

**Zašto:** Datamuse je tako postao standard za engleske rime — ljudi ga ugrade, pa
nastanu linkovi i pominjanja, a dokumentacija uđe u trening budućih modela.

**Trud:** dan-dva (podaci već postoje).

### A4. „Nikad ne izgubi pesmu"
**Šta:** dva ključa naizmenično u `localStorage`, čuvanje poslednje tri verzije,
vidljivo dugme „Preuzmi pesmu", i upozorenje ako je čuvanje onemogućeno.

**Zašto:** **izgubljen tekst je ubedljivo najbolnija pritužba celog tržišta**
(„4 hours worth of feelings, gone"), a naša beležnica živi u `localStorage` koji smo
u auditu **dokazano uspeli da pokvarimo** — i time oborimo ceo sajt. Najveća bolna
tačka tržišta i naš najveći tehnički rizik su na istom mestu.

**Trud:** dan. **Ovo je zapravo popravka koliko i funkcija — zato ide pre ostalih.**

### A5. Kulturne reference u rečniku
**Šta:** imena pevača, brendovi, gradovi, sleng — reči koje se stvarno koriste u repu
i savremenoj poeziji, a nema ih u rečniku Matice srpske.

**Zašto:** RhymePlug se time izdvaja (5.600+ referenci). Za srpski to niko nema.

**Trud:** srednji, i traži odluku vlasnice šta ulazi (vidi pravilo o izvoru istine).

### A6. Akcentovani rečnik → imenovanje stope
Vidi tačku 9 i 9a ispod. **Jedina funkcija koja nam stvarno fali** u odnosu na
akademske alate. Otključava „trohejski osmerac" umesto „akcenat je na jednom od ovih slogova".

---

## B. ŠTA NE RADITI (istraženo, da se ne troši vreme)

- **`llms.txt`** — Google izričito ne koristi; 97% takvih fajlova nikad nije preuzeto
- **nove `FAQPage` šeme** — bogati rezultati ugašeni 7.5.2026 (postojeće ne dirati)
- **zajednica / društvena mreža za pesnike** — protivi se viziji „alat, ne portal",
  a kod konkurenata se pune spamom
- **reklame** — čisto sučelje je adut kojim se svetski konkurenti hvale, a mi ga imamo
- **mobilna aplikacija koja je samo sajt u omotu** — najveća zamerka RhymeZone-ovoj
  aplikaciji („it's literally just the website in a app"); PWA je bolji put
- **naplata rima ili pristupa korisnikovom tekstu** — jedini obrazac koji garantovano
  proizvodi jednu zvezdicu

---

## 1. Pregledati reči koje dečji režim isključuje

**Zašto:** „Dečji režim" je naša najveća prednost — niko drugi na srpskom nema
filtrirane rime za decu. Ako lista propusti neprikladnu reč, gubimo poverenje
roditelja i učitelja; ako izbaci previše, deca ostaju bez sasvim običnih reči.

**Šta treba:**
- Ispisati celu `KIDS_BLOCKED` listu iz `public/app.js` i pročitati je red po red
- Odvojiti: (a) opravdano isključene, (b) nepotrebno isključene, (c) fali a treba isključiti
- Proveriti i `BLOCKED` (globalna lista, važi i van dečjeg režima)
- Posle izmena: proveriti rime za par tipičnih dečjih reči (mama, tata, kuca, maca, sunce)

**Ko odlučuje:** vlasnica. Claude priprema listu, ne briše i ne dodaje sam.

---

## 2. Pregledati nove reči iz rečnika

**Zašto:** Pogrešna reč u rečniku je gora od reči koja fali — izlazi kao „rima"
i kvari poverenje u alat. Vidi `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`.

**Šta treba:**
- Proći `RECNIK-NOVE-RECI.md` i `RECNIK-PREDLOG*.md` (rad druge sesije)
- Za svaku novu reč: postoji li stvarno u srpskom, i ima li definiciju
- Posebno paziti na oblike koje je generator izveo iz nastavka (obrazac
  „bankomam / njakam / mladoturke")

**Već urađeno 27–28.07.:** obrisano 48 ćelavih latinica (`zmurke` → `žmurke`),
obrisana `mladoturke`, dodati `tate` i `tati`. Rezervne kopije u scratchpad-u.

---

## 3. Staging grana na GitHubu

**Zašto:** Sada sve ide pravo u `main`, a `main` se automatski deployuje na
produkciju. Nema mesta gde se promena vidi uživo pre nego što je vide korisnici.
Uz to, dve sesije rade paralelno u istom radnom folderu — staging razdvaja rad.

**Šta treba:**
- Napraviti granu `staging` na `Orbita-Code/rimoteka`
- U Coolify dodati drugi resurs: `staging.rimoteka.com` → grana `staging`
- Podesiti da staging ima `noindex` (da Google ne indeksira dvojnik sajta!)
- Tok rada: `feat/…` → `staging` → provera na `staging.rimoteka.com` → `main`
- Dopuniti `CLAUDE.md` sekciju 4.2 novim tokom

**Pažnja:** memorijski limit servera. Produkcijski sajtovi imaju 512 MB,
staging poddomeni 256 MB — vidi tabelu u globalnom `CLAUDE.md`.

---

## 4. Brojač slogova — spojiti unos i rezultat u jedno polje

**Zašto:** Sada se tekst pojavljuje **dvaput** — jednom u polju za unos, drugi put
u listi ispod, gde stoje brojevi. Korisnik čita isti stih dva puta i mora da
premešta pogled gore-dole. Beležnica je taj problem već rešila: brojevi stoje
levo od stiha, u istom okviru.

**Šta treba:**
- Preneti mehanizam gutter-a iz beležnice na `/slogovi/` i tab „Slogovi i znakovi"
- Brojevi slogova levo od svakog reda, u istom okviru gde se kuca
- Na dnu ostaje samo zbir: slogova, reči, karaktera (sa i bez razmaka), redova
- Rešiti gde ide broj znakova po redu (sada je desno u listi) — predlog: na hover
- Zadržati poravnanje i kad se dug red prelomi (već rešeno u beležnici)

**Nije samo lepše:** uklanja duplirani tekst sa strane, što je i SEO plus.

---

## 5. Odluka: `/` ili `/rimovanje-reci/` kao glavna za „rimovanje reči"

Obe strane imaju alat i ciljaju istu frazu — Google bira jednu i razvodnjava
rangiranje. Odluku doneti **tek kad Search Console pokaže** koja od te dve već
dobija prikaze; do tada ne nagađati.

---

## 6. Google Search Console

Tek kad sve gore bude gotovo (izričit dogovor sa vlasnicom):
- submitovati `sitemap.xml` (2.010 URL-ova)
- Request Indexing za nove strane: `/pisanje-pesama/`, `/recnik-srpskog-jezika/`,
  `/klasici/`, `/igra-rimovanja/`, `/slogovi/`
- IndexNow ping (`build/indexnow_ping.py`)

---

## 7. 4.769 reči ima objašnjenje, ali ih nema u rečniku

**Otkriveno 28.07.2026.** `definicije.json` ima 282.852 unosa, a `reci.txt` +
`reci_jekavica.txt` zajedno 278.083 reči. Razlika nisu smeće — to su **prave
srpske reči kojima alat ne može da nađe rimu**, iako im imamo značenje:

`jaglac, plišanac, gurabija, vijača, strižibuba, romobil, sunčić, kovrdžav,
ljutkast, slankast, glancati, stabaoce` …

**Šta treba:** proći listu, potvrditi da je svaka reč ispravna, pa je dodati u
`reci.txt` (definicija već postoji). Time rečnik prelazi 282.000 reči.

**Kako izvući listu:**
```python
import json
reci = set(w.strip() for w in open('public/reci.txt', encoding='utf-8') if w.strip())
jek  = set(w.strip() for w in open('public/reci_jekavica.txt', encoding='utf-8') if w.strip())
defs = json.load(open('public/definicije.json', encoding='utf-8'))
fale = [k for k in defs if k not in reci | jek]
```

---

## 8. Pravilo za tvrdnje u tekstu na sajtu (SEO copy)

Na sajtu su nađene tvrdnje koje ne bi izdržale proveru („nema ga nijedan rimer
u svetu" — RhymeZone ima objašnjenja, na engleskom). Ispravljeno 28.07.2026.

**Pravilo:**
- „jedini/prvi **na srpskom**" — sme, dokazano konkurentskom analizom
- „jedini/prvi **u svetu**" — NE, osim ako imamo dokaz; za pisanje pesama
  postoje Versepad, GoRhyme Lyric Meter, RHYMEBOOK, Poem Analysis (engleski)
- brojevi se **prebroje u fajlu** pa zaokruže NANIŽE (imamo 278.083 → „preko
  270.000"). Nikad naviše — „preko 300.000" bi bilo netačno.

---

## 9. Stopa (trohej, jamb) — čeka akcentovani rečnik

Metar sada meri **broj slogova i cezuru** (deseterac 4+6, dvanaesterac 6+6) —
to je mera srpskog narodnog i klasičnog stiha i ne traži akcenat svake reči.

**Imenovanje stope** (trohej, jamb, daktil, amfibrah, anapest) traži da se za
SVAKI slog zna da li je naglašen. Kod reči od tri i više slogova to se ne može
izvesti iz oblika reči (v. tačku o akcentovanom rečniku i odeljak 7 u
`GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`) — zato u metru stoji oznaka
„akcenat je na jednom od ovih slogova".

**Kad nabavimo akcentovani rečnik, jednim potezom dobijamo dvoje:**
1. oznaka „ne znamo" nestaje — svaki slog dobija tačan akcenat
2. postaje moguće imenovati stopu i meru (npr. „trohejski osmerac = 4 troheja")

### 9a. Gde tražiti akcentovani rečnik (istražiti)

Bez ovoga stopa ne može, pa je ovo uslov za tačku 9.

- **`akcenat.com`** — postoji kao sajt sa akcentovanim rečima; proveriti da li
  postoji izvoz podataka ili dozvola za korišćenje. Nije mašinski čitljiv izvor
  „iz kutije".
- **Vikirečnik (sr.wiktionary)** — srpskohrvatske odrednice često nose
  akcentovane oblike (нȃћи). Već ga koristimo za `sinonimi.json`, pa postoji i
  postupak za izvlačenje. **Prvi kandidat.**
- **Rečnik Matice srpske** — autoritet, ali nije mašinski čitljiv i nije slobodan.
- **srLex 1.3** — koristimo ga za `frekvencija.json`; proveriti ima li akcenat
  (verovatno nema, ali proveriti pre nego što se odbaci).
- **Univerzitetski/akademski korpusi** — pitati da li postoji otvoren skup sa
  akcentima (npr. korpus savremenog srpskog jezika).

**Pravno:** pre preuzimanja proveriti licencu svakog izvora. Ne preuzimati
sadržaj rečnika koji nije slobodan.

**Redosled posla kad se izvor nađe:**
1. izvući parove `reč → akcentovani oblik` i izmeriti pokrivenost
2. zameniti oznaku „ne znamo" tačnim akcentom u metru
3. tek onda imenovanje stope (trohej, jamb, daktil, amfibrah, anapest)
4. dodati proveru u `test/predeploy.mjs` za svaku novu tvrdnju alata
