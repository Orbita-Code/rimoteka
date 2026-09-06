# RIMOTEKA — Sistemske Instrukcije

> **OBAVEZNO PROČITATI NA POČETKU SVAKE SESIJE**
> Ovaj dokument je jedini izvor istine o infrastrukturi, viziji i workflow-u projekta.
>
> ## GLOBALNA PRAVILA — PROČITAJ ODMAH
> **Na početku SVAKE sesije OBAVEZNO pročitaj fajl `/Users/jovana.jovic/CLAUDE.md`**
> Taj fajl sadrži globalna pravila koja važe za SVE projekte:
> - Kako se ponašati i komunicirati sa korisnikom
> - URL pravila (srpski URL-ovi na srpskim sajtovima, slug transliteracija)
> - SEO pravila (sitemap, GSC, schema.org)
> - Post-deploy provera (curl svaki URL posle promene ruta)
> - Eksterni servisi (Playwright za Supabase/Coolify/GSC/Analytics - NIKAD ne slati korisnika da ručno radi)
> - Zabrane (ne menjati sadržaj/strukturu bez odobrenja)
> ```bash
> cat /Users/jovana.jovic/CLAUDE.md
> ```

---

## 1. OSNOVNI PODACI O PROJEKTU

> **Putanja projekta: `/Users/jovana.jovic/Projects/rimoteka`** (od 29.07.2026).
> Pre toga je bio u `Desktop/Projects/` — premеšten jer je iCloud (Desktop je u
> iCloud Drive-u) pravio konflikt-kopije fajlova usred git operacija; jednom je
> 1.047 duplikata ušlo u commit, a `.git` refovi su bili pokvareni. Detalji:
> `HANDOVER.md`, sesija 29.07. (šesta), odeljak 7. **Ne vraćati projekat u
> iCloud-sinhronizovane foldere.**

| Podatak | Vrednost |
|---------|----------|
| **Naziv projekta** | Rimoteka |
| **Domen (produkcija)** | rimoteka.com |
| **Tip sajta** | Statički sajt generisan Python build-om (HTML/CSS/JS) |
| **GitHub repo** | `Orbita-Code/rimoteka` |
| **Vlasnik** | Jovana Jović / OrbitaCode |
| **Cilj** | Profesionalni alat za pronalazak rima na srpskom jeziku — jednostavan, brz, SEO-jak |

---

## 2. VIZIJA I PRODUKTNA FILOZOFIJA (KRITIČNO)

> **Rimoteka je pre svega ALAT, ne portal.** Korisnik dolazi, kuca reč, dobija rimu. Bez zatrpavanja.

### 2.1 Dizajn principi
- **Maksimalno jednostavna početna strana** — polje za unos reči + logo + minimalan tekst.
- **NE dodavati header sa nav menijem** bez eksplicitnog odobrenja korisnice.
- **NE dodavati nepotrebne stranice, opcije, widgete, pop-up-ove** — svaki element mora imati jasan cilj.
- **Brzina i čistoca iznad svega.**
- **Mobile-first:** većina korisnika dolazi sa telefona.

### 2.2 Šta je dozvoljeno na homepage-u
- Logo i kratki slogan/tagline
- Glavni input za unos reči
- Rezultati rima
- Footer sa linkovima ka najpopularnijim rime-stranama (SEO hub, već odobreno)
- Minimalan FAQ (za SEO, ispod rezultata ili u footer-u)

### 2.3 Šta NIJE dozvoljeno bez odobrenja
- Glavni nav meni
- Blog / članci na početnoj
- Reklame ili affiliate baneri
- Registracija korisnika
- Paywall
- Komplikovani filteri koji ometaju glavni rad

---

## 3. TEHNOLOŠKI STACK

| Sloj | Tehnologija |
|------|-------------|
| Frontend | Vanilla HTML/CSS/JS (`public/`) |
| Build alati | Python 3 (`build/`) |
| Rečnik | `reci.txt`, `reci_jekavica.txt`, `definicije.json` |
| Hosting | Coolify (self-hosted na Hetzner) |
| Reverse proxy | nginx / Traefik |
| CI/CD | GitHub → Coolify (auto-deploy na push u `main`) |

### Ključni fajlovi
- `public/index.html` — homepage
- `public/app.js` — glavna aplikacija
- `public/style.css` — stilovi
- `build/gen_pages.py` — generator statičkih stranica `/rime-za/[reč]/`
- `public/sitemap.xml` — sitemap
- `public/robots.txt` — robots
- `nginx.conf` — nginx konfiguracija (lokalna/Docker)

---

## 4. INFRASTRUKTURA

### 4.1 Coolify konfiguracija (produkcija)

| Podešavanje | Vrednost |
|-------------|----------|
| **Coolify Panel** | `https://panel.orbitacode.com` |
| **Project** | Orbita Code → production → Rimoteka |
| **Build Pack** | Docker (po potrebi) ili Nixpacks — proveriti u Coolify UI |
| **Repository** | `Orbita-Code/rimoteka` |
| **Branch** | `main` |
| **Domen** | `https://rimoteka.com`, `https://www.rimoteka.com` |
| **Auto-deploy** | ✅ Omogućen na push u `main` |

### 4.2 Branch strategija

```
┌─────────────┐     merge     ┌─────────────┐
│   feature   │ ────────────► │    main     │
│   grana     │               │ (produkcija)│
└─────────────┘               └─────────────┘
```

- Nema posebnog `staging` branch-a za sada.
- Feature grane: `feat/ime-promene`
- **NIKADA** direktno commitovati na `main` bez feature grane.
- Push/merge **SAMO** uz eksplicitno odobrenje korisnice (ona želi da pregleda lokalno pre merge-a).

### 4.3 Deploy proces
1. Lokalna izmena
2. Lokalni preview (`python3 -m http.server 8765` u `public/`)
3. Korisnica pregleda i odobri
4. `git checkout -b feat/...`
5. `git add -A && git commit -m "..."`
6. `git push -u origin feat/...`
7. Merge u `main`
8. Coolify automatski deployuje

---

## 5. SEO PRAVILA SPECIFIČNA ZA RIMOTEKU

> Detaljan SEO plan: `SEO_PLAN.md`

### 5.1 URL struktura
- `/` — homepage (čist alat)
- `/rime-za/[reč]/` — statička stranica za svaku reč (npr. `/rime-za/ljubav/`)
- **`/?rec=[reč]` — dinamička adresa po reči (od 19.08.2026, odluka vlasnice).**
  SEO nosilac za reči BEZ statičke strane: naslov/opis prate reč, kanonikal je
  statičkoj strani kad reč ima stranu (spisak u `public/rime-strane.json`),
  inače samoj adresi. Model je isti kao kod azrhymes/rime.com.hr. `robots.txt`
  je odblokiran SAMO za `?rec=` — ostali upitnici (`?tab=`, `?pesma=`…)
  ostaju blokirani.
- `/slogovi/` — brojač slogova
- `/vrste-rima/` — edukativna stranica
- `/kako-napisati-pesmu/` — edukativna stranica
- `/rime-za-decu/` — nišna stranica
- `/rime-za-ljubavne-pesme/` — nišna stranica
- `/rime-za-prijatelje/`, `/rime-za-roditelje/`, `/rime-za-svadbu/`, `/rime-za-novu-godinu/`, `/rime-za-tugu-i-secanje/`, `/rime-za-rodjendanske-pesmice/`, `/rime-za-decu-o-prirodi/`, `/rime-za-decu-o-zivotinjama/` — tematske stranice

### 5.2 On-page SEO (obavezno na svakoj stranici)
- Jedinstven `<title>` (60-70 karaktera)
- Jedinstven `<meta name="description">` (150-160 karaktera)
- Tačan `<link rel="canonical">`
- Samo jedan `<h1>` po stranici
- `BreadcrumbList` schema gde ima smisla
- `WebApplication` schema na homepage-u
- OpenGraph tagovi

### 5.3 Sitemap i indeksiranje
- `public/sitemap.xml` se generiše pri buildu.
- Posle SVAKE promene URL-ova ili dodavanja stranica — regenerisati sitemap.
- Posle deploy-a — submitovati sitemap u Google Search Console.
- Request Indexing za top 10-20 strana.
- IndexNow ping za Bing/Yandex.

### 5.4 Content / rime stranice
- Svaka `/rime-za/[reč]/` stranica mora sadržati:
  - Stvarne rime upisane u HTML (ne samo JS)
  - Isti interaktivni alat
  - Definiciju reči iz `definicije.json` ako postoji
  - Linkove ka srodnim rimama
  - Jedinstven title/description

---

## 5a. GRAMATIKA I PRAVOPIS — OBAVEZNO PRE SVAKOG PISANJA

> **PRE NEGO ŠTO NAPIŠEŠ IJEDNU REČ TEKSTA NA SAJTU — pročitaj
> `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`, naročito odeljak 8.5 (interpunkcija).**
> Isto važi pre dodavanja reči u `reci.txt`/`definicije.json` i pre pisanja koda
> koji generiše oblike reči.
>
> Ovo nije preporuka. Rimoteka je **alat za srpski jezik** — sajt koji greši u
> srpskom nema pravo da uči ljude kako se piše pesma.

### Šta se čita, i za šta

| Izvor | Gde | Za šta |
|---|---|---|
| `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md` | koren projekta | interpunkcija (8.5), oblici reči, česte greške |
| **Rečnik Matice srpske (2011)** | `~/Literatura/recnik-matice-srpske-2011.txt` | postoji li reč, šta znači, koji je oblik standardni |

**Zabranjeno nagađanje i „po analogiji".** Ako oblik ne umeš da dokažeš iz jednog od
ta dva izvora — pitaj vlasnicu. Ona je izvorni govornik i konačni autoritet.

### ZAREZ SE NE PIŠE ISPRED „I", „PA", „TE", „NI" — NIKAD

> Prijava vlasnice 02.08.2026: *„zarez u srpskom jeziku NIKADA ne ide ispred slova i".*
> Pravilo je stajalo u `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md` (red 364) **od ranije**,
> ali ga nijedna sesija nije čitala pre pisanja teksta — pa je na sajtu bilo **šest mesta**.

Ako rečenica „traži" zarez ispred *i*, rečenica je **loše sastavljena**. Ne briše se
zarez — **prepisuje se rečenica**:

| Ne | Da |
|---|---|
| „…vidiš rime u boji, **i** broj slogova uz stih." | „…vidiš rime u boji, uz svaki stih piše i broj slogova." |
| „Uključe ga jednom, **i** ostaje upamćen." | „Uključe ga jednom i ostaje upamćen." |
| „Kada je „r" između suglasnika, **i** ono nosi slog." | „Kada je „r" između suglasnika, ono nosi slog." |

**Jedini izuzetak koji pravopis dozvoljava** je nabrajanje sa ponovljenim veznikom:
*„i imenice, i pridevi, i glagoli"*.

> **Za `pa`, `te`, `ni` pravilo NIJE isto tako oštro.** Ono važi kad povezuju
> **istorodne delove**; kad `pa` uvodi posledicu ili redosled radnji — *„Klikni je, pa
> iz spiska izaberi rimu"* — zarez **stoji**. To razlikovanje traži značenje, pa se ne
> proverava programski: provera koja pada na tačnom tekstu tera pisca da kvari jezik.

**Provera pre predaje:** `grep -n ", i " <fajl>` mora da vrati prazno.
**Provera u testu:** sekcija 34 prolazi kroz sedam strana i pada na svakom takvom zarezu.

### Ostala interpunkcija koja se najčešće greši

- **Zarez ide** ispred *a, ali, već, nego, dok* (suprotno značenje).
- **Zavisna rečenica ispred glavne** odvaja se zarezom: *Kad je došao, svi su ućutali.*
- **Umetnuta rečenica** zatvara se sa obe strane: *Rima, koja je duža, jače zvuči.*
- **Navodnici su srpski** — „ovako", ne "ovako" ni “ovako”.
- **Crta (—) nije minus (-).**
- **Trotačka je jedan znak (…)**, ne tri tačke zaredom.

> Ko piše tekst: agent **`tekstopisac`** (`.claude/agents/tekstopisac.md`) — sva ova
> pravila su i tamo, u koraku 0, zajedno sa tonom i čeklistom pre predaje.

Taj dokument postoji zato što je automatski generator ubacio u predlog rečnika
oblike kojih u srpskom nema (`bankomam`, `akrobaša`, `njakam`, `prošaptam`,
`dreždam`). Tri pravila koja su iz toga izvedena:

0. **IZVOR ISTINE JE ZVANIČNA LITERATURA, NE NAŠ REČNIK.** `reci.txt` i
   `definicije.json` su predmet provere, ne merilo. Dozvoljeni izvori: Pravopis
   Matice srpske, Normativna gramatika (Piper–Klajn), Klajnova gramatika,
   Rečnik srpskoga jezika Matice srpske, Stanojčić–Popović. **Zabranjeno
   nagađanje i „po analogiji".** Frekvencija služi samo za redosled pregleda,
   nikad kao dokaz ispravnosti. Da li je oblik dobro izveden — odlučuju pravila;
   da li reč uopšte postoji — odlučuje rečnik Matice srpske ili vlasnica.
1. **Završetak reči nije dokaz vrste reči.** `bankomati`, `akrobati`, `aparati`
   završavaju se na `-ati` ali su imenice u množini. Vrsta reči se utvrđuje po
   gramatici, ne po završetku.
2. **Glagol ima DVE osnove** — infinitivnu i prezentsku — i jedna se ne izvodi
   iz druge (*pisati → pišem*, *šaptati → šapćem*, *dreždati → dreždim*).
   Obrazac prezenta se utvrđuje po **vrsti glagola iz gramatike**. Postojeći
   oblik u našem rečniku sme da posluži kao *trag*, ali NIJE dokaz — u rečniku
   ima i pogrešnih oblika (`đubra`, `njakam`).
3. **Pogrešna reč u rečniku je gora od reči koja fali.** Kad nisi siguran,
   napravi listu i pitaj vlasnicu. Ona je izvorni govornik i konačni autoritet;
   svaka njena ispravka se upisuje u dnevnik u tom dokumentu.

---

## 6. REČNIK I RIME — PRAVILA

### 6.1 Izvori reči
- `public/reci.txt` — osnovni rečnik (latinica)
- `public/reci_jekavica.txt` — jekavica
- `public/definicije.json` — definicije reči

### 6.2 Filtriranje rima
- Postoji mehanizam `RHYME_EXCLUSIONS` u `app.js` i `gen_pages.py`.
- Kontekstualna isključenja — za određenu reč ne prikazujemo određene rime.
- Primer: za reč `dete` ne prikazujemo `bidete`, `bide`, `bidi`.
- NOVE reči za isključenje dodavati SAMO na eksplicitni zahtev korisnice.
- **NE uvoditi globalna pravila bez odobrenja** — svaka reč se razmatra posebno.

### 6.2a Rangiranje rima — ISTI BROJ SLOGOVA JE NAJBOLJA RIMA

**„Najbolje rime" = reči sa istim brojem slogova kao tražena reč.**
**„Dobre rime" = drugačiji broj slogova.**
Redosled unutar grupe: bliži broj slogova → duži zajednički završetak → učestalost.

Razlog: prava rima počinje od poslednjeg **naglašenog** samoglasnika, a podatke
o akcentu nemamo. Isti broj slogova je najbolja zamena. Po starom pravilu
(„više zajedničkih slova = bolja rima") za „rima" su na vrh izlazili
*stvarima, centrima, dobrima* — gde je `rima` nenaglašeno — a `štima`, prava
rima, padalo je na 111. mesto.

Detaljno: `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`, poglavlje 7a.
**Ne vraćati staro pravilo.**

### 6.2b Tri merila redosleda — ZAPAMTI REDOM, i ne pretpostavljaj

Kod: `app.js:593` (`strong.sort`), `:630` (rezervna grupa), `:685` („šire rime").

| Red | Merilo | Koliko odlučuje |
|---|---|---|
| **1** | **bliži broj slogova** traženoj reči | **najviše** — po tome se i deli na „Najbolje" / „Dobre rime" (`:616–617`) |
| **2** | duži zajednički završetak | srednje |
| **3** | učestalost (`RANK`) | **najmanje** — samo razdvaja reči koje su izjednačene po 1 i 2 |

> **ZABRANJENO tvrditi bilo šta o redosledu rima bez pokretanja pravog algoritma.**
> 30.07.2026. je jedna sesija (Claude) tvrdila vlasnici da „`voda` pada na 31. mesto od
> 99 rima za `sloboda`" — jer je u proveri sortirala **samo po učestalosti** i preskočila
> merilo 1 i 2. Vlasnica je to uhvatila. Stvarno stanje: `sloboda` (3 sloga) i `voda`
> (2 sloga) nisu ni u istoj grupi — `voda` je u „Dobrim rimama", a „Najbolje rime" za
> `voda` su `svoda, proda, boda, broda, koda, moda, hoda` — tačno kako pravilo nalaže.
> **Ako proveravaš redosled, prepiši sva tri merila iz `app.js:593`, ne jedno.**

### 6.2c Reč BEZ frekvencije pada ispod reči koja se pojavila JEDAN put

`app.js:376`: `RANK.set(w, freq > 0 ? -freq : i)` — reč sa brojem dobija **negativan**
rang, reč bez broja **pozitivan** (redni broj po abecedi). Sortira se rastuće, pa **sve
negativno ide pred sve pozitivno**. Posledica, izmereno:

- `hiljada`, `hiljadu`, `hiljade`, `hiljadama` **su u `reci.txt` i imaju objašnjenje**,
  ali nemaju broj (rupa u srLex-u), pa ih pretiče `abakuse` sa brojem **1**.
- Iste reči su zato **izvan bazena od 8.000 „poznatih reči"** (`app.js:737`), pa ih
  kockica i igra rima **nikad ne mogu ponuditi**. Izvan bazena su i `voda` (876),
  `hleb` (6.201), `sneg` (6.703), `kuća` (3.077), `dva` (9), `veliki` (34).

> **Nedostatak broja NIJE isto što i „najređa reč".** Kad se F1 rešava, ne traži se
> izmišljen broj za `hiljada` — ispravlja se to da kod nedostatak broja tretira kao
> „nepoznato", a ne kao nulu. Reč koja je u **Rečniku Matice srpske** je standardna
> srpska reč bez obzira na to šta veb-korpus o njoj kaže.

### 6.3 Kvalitet rima
- Rime moraju biti validne srpske reči.
- Ako rečnik sadrži sumnjiv/grešan oblik — prijaviti korisnici, ne preuzimati automatske odluke.
- Za dečje reči — pažljivo sa rime koje su neprikladne za decu.

---

## 7. ŠTA JE DOZVOLJENO BEZ PITANJA

- Lokalni razvoj i testiranje
- SEO poboljšanja unutar postojeće strukture (title, meta, schema, sitemap)
- Ispravljanje bagova u alatu
- Ažuriranje ovog `CLAUDE.md` fajla
- Istraživanje konkurencije i pripremanje analiza

> **ZABRANE PO ODLUCI VLASNICE 19.08.2026 (trajne):**
> 1. **ZABRANJENO praviti nove strane** — ima ih previše, a Google deo njih
>    ne prima („Discovered — not indexed"). Fokus je JAČANJE postojećih, ne
>    širenje. Zamenjuje ranije dozvoljeno „dodavanje novih strana kroz build
>    generator" — više ne važi.
> 2. **ZABRANJENI backlinkovi sa njenih drugih sajtova** (orbitacode.com,
>    babylovebox.rs, spomenicibeograd.rs) — nisu ista niša. Nikad, i ne
>    predlagati ponovo. Backlink samo iz niše (pesničke zajednice, blogovi,
>    obrazovanje).

---

## 8. ŠTA ZAHTEVA ODOBRENJE (kapije)

| Akcija | Zašto tražiti odobrenje |
|---|---|
| Promena vizije/dizajna homepage-a | Produktna odluka |
| Dodavanje nav menija | Produktna odluka |
| Dodavanje novih kategorija stranica | Struktura sajta |
| Promena URL strukture | SEO i redirecti |
| Push/merge u `main` | Produkcija |
| Dodavanje monetizacije / reklama / plaćanja | Biznis model |
| Dodavanje registracije korisnika | Opseg proizvoda |
| Promena brenda/domena | Identitet |
| Uvođenje engleskog ili drugih jezika | Opseg proizvoda |

---

## 8a. LOGO — NE DIRATI (APSOLUTNO PRAVILO)

> Logo je već drugi put slučajno promenjen. Više se ne dira. Nikad.

- **ZABRANJENO** menjati logo: veličinu, font, boju, razmak, sliku, HTML tag ili bilo koji CSS koji na njega utiče.
- Logo mora ostati **veliki** — `font-size: clamp(2rem,5vw,3rem)` i font **`Fredoka`**.
- Logo **nije `<h1>`** (SEO pravilo je jedan `h1` po strani, a `h1` je glavni naslov strane). Zato `font-family` MORA biti eksplicitno naveden u `.brand h1, .brand-logo` i `.brand-h` — globalno pravilo `h1,h2,h3{font-family:Fredoka}` ga ne pokriva. **Bez te linije logo tiho padne na Quicksand i deluje manji i tanji.**
- Ako neka izmena dodiruje `.brand`, `.brand-logo`, `.brand-h`, `.brand-word` ili `.logo-r` — **prvo pitati korisnicu.**
- Pre-deploy test (sekcija 9a) proverava font i veličinu logotipa i **pada** ako je logo promenjen.

---

## 9a. OBAVEZAN TEST PRE SVAKOG DEPLOY-A (NE PRESKAKATI)

> 26.07.2026. je jedan `TypeError` oborio ceo sajt — rime, igra i svi tabovi — i to je otišlo na produkciju. Nikad više bez testa.

```bash
cd /Users/jovana.jovic/Projects/rimoteka
node test/predeploy.mjs                              # lokalno
BASE=https://rimoteka.com node test/predeploy.mjs    # posle deploy-a, protiv produkcije
```

**Deploy je dozvoljen SAMO ako test ispiše „Sme deploy" (izlazni kod 0).** Ako bilo šta padne — popraviti, pa ponovo testirati.

Test proverava, u pravom Chromiumu:
1. **Rimovanje reči** — glavna namena sajta: rime za „ljubav" i „nada", i da je poznata rima među rezultatima
2. **Rečnik** — učitano preko 250.000 reči
3. **Sinonimi** — učitani i prikazani kao grupa u rezultatima
4. **Frekvencijsko rangiranje** — radi
5. **Svaki tab** — rime, pretraga, slogovi, beležnica, klasici, igra, omiljene
6. **Pretraga reči** — vraća rezultate
7. **Brojač slogova i karaktera** — reaguje na unos
8. **Beležnica** — prima i zadržava tekst
9. **Igra rima** — dugmad reaguju, igra se pokreće, odbija nepostojeću reč i **priznaje tačnu rimu**
10. **Kockica** — bira poznatu reč, ne arhaizam
11. **Tamni režim** — prebacuje se
12. **Logo** — font Fredoka i nije smanjen
13. **SEO** — tačno jedan `h1` na `/`, `/rimovanje-reci/` i `/rime-za/ljubav/`
14. **Konzola** — nula grešaka kroz ceo test

15. **Mobilna verzija** (sekcija 30, od 31.07.2026) — sa **lažiranom tastaturom** od 336 px:
    panel sa rimama u beležnici mora ceo da bude iznad nje, rime moraju stajati 2–3 u redu,
    dodir na reč mora otvoriti traku sa radnjama, u igri se moraju videti polje, „Proveri"
    i poruka o tačnosti
16. **Oznake uz stih** (sekcija 31) — broj slogova i slovo šeme rime moraju stajati
    uz SVOJ stih, za šest oblika unosa (`<br>`, `<div>`, mešano, prazan red u sredini
    i na kraju) i na dve širine

> **Tastatura se u testu PRAVI ručno** — Playwright je nema. Pet linija:
> `visualViewport.height` se smanji i pošalje se `resize`. Bez toga cela klasa
> bagova ostaje nevidljiva: sekcija 26 je prolazila, a rime u beležnici su na
> pravom telefonu bile 100% ispod tastature.

Posle deploy-a **ponovo pokrenuti test protiv produkcije** (`BASE=...`) — lokalno prošlo ne znači da je deploy prošao.

**Kad se doda nova funkcija, u `test/predeploy.mjs` MORA da se doda i provera za nju.**

### 9a-2. Merne skripte (30.07.2026) — brojevi se MERE, ne prepisuju

```bash
node test/meri-cls.mjs                 # skakanje strane, 10× po strani, ispisuje RASPON
BASE=https://rimoteka.com node test/meri-cls.mjs
node test/meri-font.mjs "Fira Sans"    # odnos širina prema Arialu, za size-adjust
```

- `meri-cls.mjs` — nalaz P16. Meri **deset puta**, jer jedan dobar broj nije dokaz;
  ne meriti u minutu posle deploy-a; meriti na **brzoj** vezi (na sporoj strana ionako
  čeka font pa se kvar ne vidi). Svako merenje dobija **svoj kontekst** pregledača.
- `meri-font.mjs` — **pada** ako se font nije učitao. Zamka koja se stvarno desila:
  skripta je merila Arial protiv Ariala i dala „size-adjust 90,4%" umesto **100,9%**;
  jedini znak bio je što su dva različita fonta dala iste brojeve. Vidi PROPUSTI 44–46.
- **Posle svake promene fonta** obe skripte se puštaju ponovo i brojevi u
  `style.css` (`size-adjust`, `ascent-override`, `descent-override`) se **prepisuju
  izmerenim**, nikad procenjenim.

### 9a-1. `nginx.conf` — POSEBAN TEST, OBAVEZAN (29.07.2026.)

> Sajt je 29.07.2026. bio oboren ~3 minuta zbog jedne izmene u `nginx.conf`.
> Sintaksa je bila savršeno ispravna. Ponašanje nije.

```bash
bash test/nginx-provera.sh    # traži: brew install nginx
```

**`nginx.conf` se NE deployuje bez izlaznog koda 0 iz ove skripte.**
Ona diže **pravi nginx** i meri šta se dešava po `Host` zaglavlju:

| Host | mora | zašto |
|---|---|---|
| `rimoteka.com` | 200 | sajt radi |
| `www.rimoteka.com` | 301 na tačno odredište | jedna adresa, sa putanjom i upitom |
| **`nepoznato.test`** | **200, ne 301** | **baš ovaj red hvata grešku od 29.07.** |
| `localhost` | 200 | zdravstvena provera Coolify-ja |

**Šta se tada desilo:** dodat je blok `server { server_name www.rimoteka.com; return 301 …; }`
**ispred** glavnog. U nginx-u `server_name _` **nije hvatalica za sve domene** — `_` je
namerno nevažeće ime koje se nikad ne poklopi sa `Host` zaglavljem; taj blok hvata sve
samo dok je **podrazumevani**, a podrazumevani je prvi blok na portu. Novi blok je
postao podrazumevani i preusmeravao je i `rimoteka.com` na samog sebe.

Zato glavni blok sada ima izričito **`listen 80 default_server;`** — i to se ne briše.

**Pravilo šire od nginx-a:** izmene koje mogu da obore ceo sajt (`nginx.conf`,
`Dockerfile`, CSP, preusmerenja) idu **same, u zasebnom deploy-u**, i odmah posle
deploy-a se proverava **glavna adresa**, ne samo ono što je menjano.

---

## 9b. AUDIT — NA SVAKA 3 DANA (OBAVEZNO)

> Metod, ritam i evidencija: **`~/.claude/AUDIT-PROTOKOL.md`** — pročitati pre audita.
> Čeklista šta se proverava: `~/.claude/TESTING.md`.

**Na početku SVAKE sesije proveriti kad je bio poslednji audit:**
```bash
ls -1 /Users/jovana.jovic/Projects/rimoteka/AUDIT/ | grep audit | sort | tail -1
```
Ako je prošlo **3 ili više dana** — sam prijaviti vlasnici i predložiti audit.

**Evidencija:**
- `AUDIT/GGGG-MM-DD-audit.md` — svaki audit je NOV fajl, nikad se ne prepisuje stari
- `AUDIT/NALAZI-OTVORENI.md` — živi spisak; ažurirati posle svakog audita i posle svake popravke

**Stanje na 07.09.2026: pun audit, ocena 7,3/10** (bilo 6,2). 0 kritičnih, 8 visokih (A1–A6 novi od
06–07.09. + V3 HSTS + V2 sinonimi), 26 srednjih, 20 niskih. Prvo ide **A1: traka nad reči nedostupna
tastaturom** (regresija varijante B). Pun izveštaj: `AUDIT/2026-09-06-audit.md`. Spisak za praćenje:
`AUDIT/NALAZI-OTVORENI.md` (odeljak „STANJE NA DAN 07.09.2026").

> Stanje od 24.08. (ispod) zadržano je samo za istoriju.

**Stanje na 24.08.2026: 24 otvorena nalaza** (oba kritična i V5 zatvoreni). Ocena 6,2/10 je
iz audita 20.08. Pun izveštaj: `AUDIT/2026-08-20-audit.md`.

| Ozbiljnost | Koliko | Najvažnije |
|---|---|---|
| ~~KRITIČNO~~ | **0** | **K1 i K2 ZATVORENI 24.08.2026.** Redosled rima se sada poklapa sa alatom na svih 1.994 strane i na `?rec=` adresama; jedinstvenih `?rec=` adresa u HTML-u 98.115 → **13**. Trag: `AUDIT/NALAZI-OTVORENI.md`, odeljak „ZATVORENO 24.08.2026" |
| VISOKO | 4 | 1.739 predugih naslova · sinonimi obećani a ima ih za 2 reči · nema HSTS · M12 beli okvir (treći audit) |
| SREDNJE | 9 | v. spisak |
| NISKO | 11 | v. spisak |

> **Test je prolazio 564/564, a K1 je bio kritičan.** Uzrok: nijedna provera nije
> poredila stranu sa alatom. Zatvoreno 24.08. sekcijama 39 i 40 (test sada **604**
> provere). Pouka je u `AUDIT/PROPUSTI.md` pod brojem 18 — **kad istu stvar računaju
> dva sistema, u test ide provera koja ih POREDI**, ne dve provere koje svaki zasebno
> kažu „radim". Pod 21 i 22 su dve greške napravljene pri samoj toj popravci.

> Tabela ispod je stanje od 31.07. i **zadržana je samo za istoriju**. Tri nalaza iz
> nje (R1-ostatak, J1-ostatak) su zatvorena 02.08.; P11 i dalje stoji.

> **31.07.2026 — mobilna verzija odrađena u celini (M5–M15).** Prijava vlasnice
> („ponuđene reči za rimu se ne vide od tastature") potvrđena merenjem i
> zatvorena, uz još osam nalaza nađenih usput. Test **372 → 422 provere**
> (nove sekcije 30 i 31). Detalji: `AUDIT/NALAZI-OTVORENI.md`, odeljak
> „ZATVORENO 31.07.2026". Dve stvari čekaju odluku vlasnice — v. tamo napomenu
> o M8 i M12.

| # | Nalaz | Status |
|---|---|---|
| **R1-ostatak** | šest reči čeka presudu vlasnice (`gojence`, `gojenac`, `grnce`, `grne`, `krol`, `klube`) | čeka odluku — spisak u `AUDIT/R1-reci-za-odluku.md` |
| **J1-ostatak** | 277 spornih „ijekavskih" oblika koje Matica ima kao standardne | čeka odluku — spisak u `AUDIT/J1-sporne-reci.md` |
| **P11** | hub `/rime-za/` je zid od 2.000 linkova | čeka odluku o izgledu (po slovima / po temama) |

> **Ova tabela je do 31.07. nabrajala F1, P10 i P16 kao otvorene.** Sva tri su
> zatvorena 30.07. i to piše u `AUDIT/NALAZI-OTVORENI.md` — ovde nije bilo
> preneto. Isti propust koji je opisan dva pasusa niže, drugi put. **Izvor
> istine je spisak nalaza; ovde stoji samo prepis i mora se menjati zajedno sa njim.**

> **Ovaj odeljak je do 30.07. tvrdio „7,2/10, 33 otvorena, 6 kritičnih".** To je bilo
> stanje 28.07., **pre** nego što je sesija 29.07. zatvorila 60 nalaza — pa je svaka
> sesija koja je čitala samo `CLAUDE.md` počinjala sa pogrešnom slikom. Izvor istine
> je **`AUDIT/NALAZI-OTVORENI.md`**, ne ovaj odeljak; ovde stoji samo sažetak i mora
> se ažurirati kad se spisak menja.

### Zašto test od 140 provera nije dovoljan
Prolazio je **140/140**, a audit 28.07. je našao **33 nalaza** (test je od tada podignut
na **358 provera**). Rupe koje treba zatvoriti stoje u tabeli na dnu
`AUDIT/NALAZI-OTVORENI.md`. Najvažnije:
- test obilazi **6 od 2.010 strana** — nijednu `/rime-za/`
- proverava da element **postoji**, ne da **radi** (ćirilica je mrtvo dugme na 1.988 strana)
- nikad ne **osveži stranu** u tamnom režimu (K1)
- nikad ne **kuca** u polje u tamnom režimu (K2)
- uvek klikne dugme, nikad ne poredi klik sa Enter-om (V3, V4)

**Pravilo:** svaka popravka dobija proveru, pa se provera pusti protiv produkcije
**dok je tamo stari kod** — ako ne padne, provera ne valja.

---

## 9c. ANALITIKA — NA SVAKA 14 DANA (OBAVEZNO)

> Postavljeno 30.07.2026, pošto su podaci iz Search Console-a u jednoj sesiji promenili
> tri odluke koje su pre toga donošene po osećaju.

**Ritam: svakih 14 dana**, i **uvek u roku od dve nedelje posle svake izmene naslova,
opisa ili URL-ova** — jer se tek tada vidi da li je izmena pomogla.

Zašto 14 dana a ne češće: sajt ima **63 sesije za 90 dana**. Na tom uzorku nedeljno
merenje pokazuje samo šum. Zašto ne ređe: Search Console čuva podatke 16 meseci, ali
promena naslova se oceni za 2–3 nedelje — posle toga se ne zna šta je izazvalo šta.

```
Pokreni agenta:   analitika
```

Agent `analitika` (`~/.claude/agents/analitika.md`) zna kako da uđe u oba servisa i šta
da gleda. Ulazi se **AppleScript-om nad pravim Chrome-om** — postupak je u globalnom
`~/.claude/CLAUDE.md`. **Ne tražiti od vlasnice da se prijavljuje.**

**Šta se gleda svaki put, i zašto:**

| Šta | Zašto |
|---|---|
| upiti sa **mnogo prikaza, malo klikova** | najbrža dobit — rangiramo, ne otvaraju nas; problem je naslov, ne pozicija |
| upiti na **poziciji 8–20** | mali potez daje veliku razliku |
| **kako ljudi kucaju** — sa kvačicama i bez | `recnik rima` je imao 204 prikaza, `rečnik rima` 45 |
| **indeksiranost** (primljeno/odbijeno) | 30.07.2026: 124 primljeno, 1.014 odbijeno — **ispod 40% znači: ne dodavati nove strane** |
| **koje reči ljudi kucaju u sam alat** | GA4 događaji; to su kandidati za nove `/rime-za/` strane |
| **telefon naspram računara**, odvojeno | većina dolazi sa telefona |

**Zapis:** `AUDIT/analitika/GGGG-MM-DD.md` — sirovi brojevi **pre** tumačenja, da sledeći
put ima sa čim da se poredi.

**Zatečeno stanje 30.07.2026** (polazna tačka za sva buduća poređenja):

| Mera | Vrednost |
|---|---|
| indeksirano / nije indeksirano | **124 / 1.014** |
| ukupno klikova (90 dana) | ~39, od toga **22 brendiranih** („rimoteka") |
| najjači upit bez brenda | `rimovanje` — 428 prikaza, 5 klikova |
| najveći propust | `recnik rima` — **204 prikaza, 0 klikova** |
| sesija (GA4, 90 dana) | 63 |

---

## 9e. KOLAČIĆI I GOOGLE ANALYTICS (06.09.2026)

GA se učitava **tek posle pristanka** u baneru (`public/ga-init.js`). Ne vraćati statični
`<script src="…gtag/js…">` u zaglavlje. Baner **ne blokira** sajt (Google kažnjava
međuekrane). Odluka: `localStorage.rimoteka_kolacici` `{analitika:true|false}`; link
„Kolačići“ u futeru je menja. Od 06.09. GA broji samo one koji prihvate — pad brojeva u
Analyticsu posle tog datuma NIJE pad posete (upisati u svaki izveštaj analitike).

## 9d. SANDUČE ZA PRIJAVE GREŠAKA (06.09.2026)

**Od 06.09.2026 kapsule sa rimama na računaru nemaju ikonice** (odluka vlasnice, varijanta B):
sve radnje (značenje, omiljene, rime, kopiraj, prijavi grešku) su u traci `.chip-actions` koja
se otvara na dodir (telefon), prelazak mišem ili fokus (računar). Ne vraćati ikonice u kapsulu.

Dugme „Prijavi grešku" (peto dugme u toj traci) šalje
prijavu u Cloudflare worker **`worker/prijave.js`** → `https://rimoteka-prijave.jovana-daskovic.workers.dev`.

| Šta | Gde |
|---|---|
| kod sanduča | `worker/prijave.js`, `worker/wrangler.toml` (KV `PRIJAVE`) |
| objava sanduča | `cd worker && npx wrangler deploy` (wrangler prijavljen kao vlasnica) |
| ključ za pregled | `~/.config/rimoteka/prijave-kljuc.json` — **nikad u repo**; secret `KLJUC` na workeru |
| pregled prijava | `/prijave?kljuc=…` (HTML) ili `&format=json` (`&posle=<ISO>` za nove) |
| režim probe | uređaj sa `rimoteka_interno=1` (`?interno=1`) šalje `proba:true` → sanduče proveri, ne čuva |
| CSP | adresa sanduča mora biti u `connect-src` (`nginx.conf`) — bez toga pregledač ćutke odbije slanje |
| test | sekcija 46 — pada ako CSP, dugme, prozorčić ili sanduče ne rade |

**Na početku sesije proveriti nove prijave** (`curl "<pregled>&format=json"`) i uneti ih u
rad kao prijave korisnika — one imaju prednost nad nalazima alata (protokol, D8).

---

## 9. ZABRANJENO (NE KRŠITI)

- ❌ **Deploy bez prolaska `node test/predeploy.mjs`** (vidi sekciju 9a)
- ❌ **Menjanje logotipa — veličine, fonta, boje, taga ili CSS-a oko njega** (vidi sekciju 8a)
- ❌ Objavljivanje brojeva „iz glave" (broj reči, definicija, sinonima) — **prvo prebrojati u fajlu**, pa napisati
- ❌ Direktan push/commit na `main` bez feature grane
- ❌ Push bez odobrenja korisnice
- ❌ Menjati `worker/prijave.js` bez ponovnog `wrangler deploy` i testa (sekcija 46) — sajt i sanduče moraju da se slažu
- ❌ Dodavanje nav menija, bloga, reklama bez odobrenja
- ❌ Zatrpavanje homepage-a tekstom/widgetima
- ❌ Hardkodovanje tajni (API ključeva, lozinki) u repo
- ❌ Brisanje ili menjanje `reci.txt`, `reci_jekavica.txt`, `definicije.json` bez eksplicitnog odobrenja
- ❌ Vraćanje Cloudflare proxy-a ako je isključen (po globalnim pravilima)

---

## 10. ČESTE OPERACIJE

### Lokalni preview
```bash
cd /Users/jovana.jovic/Projects/rimoteka/public
python3 -m http.server 8765
```
Otvori: `http://localhost:8765`

### Regeneracija stranica
```bash
cd /Users/jovana.jovic/Projects/rimoteka
python3 build/gen_pages.py
```

### Provera rime u lokalnom preview-u
```bash
curl -s http://localhost:8765/rime-za/dete/ | grep -o '<span class="word">[^<]*</span>' | sed 's/<[^>]*>//g' | head -20
```

### Git workflow
```bash
git checkout -b feat/ime-promene
# izmene
git add -A
git commit -m "feat: opis promene"
git push -u origin feat/ime-promene
# kreirati PR ili merge ručno nakon odobrenja
```

---

## 11. KONKURENCIJA I POZICIONIRANJE

> Detaljna analiza: `COMPETITIVE-ANALYSIS.md`

### Ključna prednost Rimoteke
1. **Filtrirane rime za decu** — niko drugi to ne radi.
2. **Rečnik sa definicijama** — jedinstveniji sadržaj po stranici.
3. **OrbitaCode ekosistem** — besplatni relevantni backlinkovi sa drugih sajtova.
4. **Jednostavnost alata** — nema zatrpavanja.

### Glavni konkurenti
- `rimovanje.com` — exact-match domen, najjači
- `sr.azrhymes.com` — multi-jezična platforma, najveći autoritet
- `igrarecima.com` — deep-path per-reč strane
- `rime.com.hr` — hrvatsko tržište

---

## 12. BUDUĆNOST / OTVORENE ODLUKE

> Ove odluke se NE donose bez korisnice.

- **Monetizacija:** affiliate knjige/poezija, premium feature, saradnja sa kursevima/piscima, reklame?
- **Engleski jezik:** da li proširiti alat za engleski (ogromno tržište, ali drugačija SEO dinamika)?
- **Dodatni alati:** brojač slogova (već postoji), analiza metra, generator stihova?
- **Saradnje:** knjižare, pesnici, kursevi kreativnog pisanja, edukativni sajtovi?

---

## 13. KONTAKT I LINKOVI

| Resurs | URL |
|--------|-----|
| Produkcija | https://rimoteka.com |
| GitHub repo | https://github.com/Orbita-Code/rimoteka |
| Coolify Panel | https://panel.orbitacode.com |
| SEO Plan | `SEO_PLAN.md` |
| Konkurentska analiza | `COMPETITIVE-ANALYSIS.md` |

---

*Poslednje ažuriranje: 24. avgust 2026. (posle popravke K1 i K2)*
