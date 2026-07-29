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

## 5a. GRAMATIKA SRPSKOG JEZIKA — OBAVEZNO PRE RADA SA REČNIKOM

> **Pre bilo kakvog dodavanja reči u `reci.txt`/`definicije.json`, i pre pisanja
> koda koji generiše oblike reči, pročitati `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`.**

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

### 6.3 Kvalitet rima
- Rime moraju biti validne srpske reči.
- Ako rečnik sadrži sumnjiv/grešan oblik — prijaviti korisnici, ne preuzimati automatske odluke.
- Za dečje reči — pažljivo sa rime koje su neprikladne za decu.

---

## 7. ŠTA JE DOZVOLJENO BEZ PITANJA

- Lokalni razvoj i testiranje
- SEO poboljšanja unutar postojeće strukture (title, meta, schema, sitemap)
- Dodavanje novih `/rime-za/[reč]/` stranica kroz build generator
- Ispravljanje bagova u alatu
- Ažuriranje ovog `CLAUDE.md` fajla
- Istraživanje konkurencije i pripremanje analiza

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
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
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

Posle deploy-a **ponovo pokrenuti test protiv produkcije** (`BASE=...`) — lokalno prošlo ne znači da je deploy prošao.

**Kad se doda nova funkcija, u `test/predeploy.mjs` MORA da se doda i provera za nju.**

---

## 9b. AUDIT — NA SVAKA 3 DANA (OBAVEZNO)

> Metod, ritam i evidencija: **`/Users/jovana.jovic/AUDIT-PROTOKOL.md`** — pročitati pre audita.
> Čeklista šta se proverava: `/Users/jovana.jovic/TESTING.md`.

**Na početku SVAKE sesije proveriti kad je bio poslednji audit:**
```bash
ls -1 /Users/jovana.jovic/Desktop/Projects/rimoteka/AUDIT/ | grep audit | sort | tail -1
```
Ako je prošlo **3 ili više dana** — sam prijaviti vlasnici i predložiti audit.

**Evidencija:**
- `AUDIT/GGGG-MM-DD-audit.md` — svaki audit je NOV fajl, nikad se ne prepisuje stari
- `AUDIT/NALAZI-OTVORENI.md` — živi spisak; ažurirati posle svakog audita i posle svake popravke

**Zatečeno stanje (28–29.07.2026): ocena 7,2/10, 33 otvorena nalaza.**
Pre bilo kakvog novog feature-a pogledati `AUDIT/NALAZI-OTVORENI.md` — 6 nalaza je kritično.

### Zašto test od 140 provera nije dovoljan
Prolazio je **140/140**, a audit je našao **33 nalaza**. Rupe koje treba zatvoriti stoje
u tabeli na dnu `AUDIT/NALAZI-OTVORENI.md`. Najvažnije:
- test obilazi **6 od 2.010 strana** — nijednu `/rime-za/`
- proverava da element **postoji**, ne da **radi** (ćirilica je mrtvo dugme na 1.988 strana)
- nikad ne **osveži stranu** u tamnom režimu (K1)
- nikad ne **kuca** u polje u tamnom režimu (K2)
- uvek klikne dugme, nikad ne poredi klik sa Enter-om (V3, V4)

**Pravilo:** svaka popravka dobija proveru, pa se provera pusti protiv produkcije
**dok je tamo stari kod** — ako ne padne, provera ne valja.

---

## 9. ZABRANJENO (NE KRŠITI)

- ❌ **Deploy bez prolaska `node test/predeploy.mjs`** (vidi sekciju 9a)
- ❌ **Menjanje logotipa — veličine, fonta, boje, taga ili CSS-a oko njega** (vidi sekciju 8a)
- ❌ Objavljivanje brojeva „iz glave" (broj reči, definicija, sinonima) — **prvo prebrojati u fajlu**, pa napisati
- ❌ Direktan push/commit na `main` bez feature grane
- ❌ Push bez odobrenja korisnice
- ❌ Dodavanje nav menija, bloga, reklama bez odobrenja
- ❌ Zatrpavanje homepage-a tekstom/widgetima
- ❌ Hardkodovanje tajni (API ključeva, lozinki) u repo
- ❌ Brisanje ili menjanje `reci.txt`, `reci_jekavica.txt`, `definicije.json` bez eksplicitnog odobrenja
- ❌ Vraćanje Cloudflare proxy-a ako je isključen (po globalnim pravilima)

---

## 10. ČESTE OPERACIJE

### Lokalni preview
```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka/public
python3 -m http.server 8765
```
Otvori: `http://localhost:8765`

### Regeneracija stranica
```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
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

*Poslednje ažuriranje: 25. jul 2026.*
