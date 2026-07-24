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

## 9. ZABRANJENO (NE KRŠITI)

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
