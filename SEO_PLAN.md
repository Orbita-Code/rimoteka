# SEO Plan — Rimoteka (rimoteka.com)

> Izrađeno 14.07.2026. Cilj: prva strana Google pretrage za relevantne fraze, uz poštovanje vizije „alat, minimalno teksta, kucaš reč → dobiješ rimu". Bez pravljenja Frankenštajna — indeksiranje odmah i **pravilno** od prvog dana.

---

## 1. Gde smo sada (dijagnoza iz GSC + koda)

| Metrika | Stanje | Komentar |
|---|---|---|
| Indeksirane strane | **1** (početna) | Jeste u indeksu, ali samo homepage |
| Neindeksirane | 3 | Verovatno favicon/varijante, ne prave strane |
| Klikovi (6 nedelja) | **20** | Sitno ali ne-nula → domen „diše" |
| Starost domena | ~6 nedelja (od 28.05.) | **Glavni razlog** slabog ranga — nema autoriteta |
| Sirovi HTML za Googlebot | **~296 reči**, „rimovanje" **0×** | SPA generiše sav sadržaj JS-om → Google vidi praznu stranu |
| Sitemap | **1 URL**, star (28.05.) | Mora da raste sa stranama |

**Zaključak:** sajt radi i indeksiran je, ali nema ni sadržaja ni strana ni autoriteta da rangira za konkurentne fraze.

---

## 2. Konkurentska analiza (koga pobeđujemo i kako)

| Konkurent | Model URL-ova | Snaga | Pouka |
|---|---|---|---|
| **rimovanje.com** | `/[reč]` (strana po reči, auto iz pretraga) | Exact-match domen + godine | Ime domena = fraza; ne možemo oteti head-termin brzo |
| **sr.azrhymes.com** | `?rime=[reč]`, `/kontekst?q=` | **Najjači** — multi-jezična platforma, ogroman autoritet | Pozicija „za tekstopisce, reperiste i pesnike" = NAŠA publika |
| **igrarecima.com** | `/rime-za-rec/[reč]` | Deep-path per-reč strane | Isti trik — strana po reči |
| **rime.com.hr** | `?rime=[reč]` (ijekavica) | Hrvatsko tržište | — |
| wordcount.com/syllable-counter | — | Engleski, brojač slogova | Brojač slogova na srpskom = **slabija konkurencija** |

### 🔑 Ključni uvid
**SVI konkurenti rangiraju istom taktikom: jedna indeksirana strana po reči** (`/rime-za/ljubav`). To je ono što hvata long-tail „rime za [reč]". Mi to nemamo — imamo 1 stranu.

### Naša 3 prednosti koje oni nemaju
1. **Filtriran za decu** (bez psovki/vulgarnosti) — niko drugi to ne radi → pozicija „rime za dečje pesmice" je prazna.
2. ~~Vlasnica ima druge sajtove za backlinkove~~ — **UKINUTO 19.08.2026 (odluka vlasnice: nisu ista niša, nikad).**
3. **Rečnik sa objašnjenjima** (definicije.json) — možemo prikazati i značenje reči, ne samo rimu → bogatiji, jedinstveniji sadržaj.

---

## 3. Mapa ključnih reči (šta ljudi stvarno kucaju)

| Fraza / obrazac | Namera | Težina | Naša strategija |
|---|---|---|---|
| `rimovanje reči`, `rime`, `rečnik rima` | head | 🔴 teško (EMD + autoritet) | dugoročno, homepage title |
| **`rime za [reč]`** (ljubav, srce, život…) | long-tail | 🟢 osvojivo | **per-reč prerender strane** ← glavni potez |
| **`reči koje se rimuju sa [reč]`** / `šta se rimuje sa [reč]` | long-tail | 🟢 osvojivo | ista strana, alias u tekstu/H2 |
| `rime za pesmu`, `rime za rep`, `rime za tekst` | publika | 🟡 srednje | positioning + FAQ |
| `rime za decu` / `dečje pesmice rima` | niša | 🟢 prazno! | naša unikat prednost (filtrirano) |
| `brojanje slogova` / `broj slogova u reči` / `brojač slogova` | alat #2 | 🟢 slaba konk. na srpskom | zaseban prerender + H2 na homepage |
| `podela reči na slogove` | edukacija | 🟡 | FAQ/tekst uz brojač |
| `vrste rima`, `kako napisati pesmu/rimu` | sadržaj | 🟡 | 2-3 mini članka (autoritet) |

**Prioritetna lista reči za prve strane (poezija/tekstovi, česte teme):**
ljubav, srce, život, oči, san, sreća, bol, duša, noć, dan, ruka, put, svet, nebo, zvezda, cvet, reka, more, sunce, mesec, kiša, vetar, ruža, usne, poljubac, suza, osmeh, dete, majka, prijatelj, sloboda, vreme, godina, grad, zemlja, voda, vatra, zima, leto, jesen, proleće…
→ + automatski dodati **najtraženije reči iz GA4** (feedback petlja, vidi §7).

---

## 4. Strategija — kako pomiriti „alat bez teksta" sa SEO-om

**Vizija ostaje netaknuta:** homepage je čist alat, kucaš reč → dobiješ rimu. Bez zatrpavanja tekstom.

**Trik:** per-reč strane se **ne prave ručno** — auto-generišu se iz rečnika koji već imamo, pri buildu, kao **statički HTML**. Homepage se ne menja u suštini; samo dobija **footer sa linkovima** ka najpopularnijim rime-stranama (kao što si i sama predložila).

```
rimoteka.com/                      → čist alat (homepage, minimalno teksta)
rimoteka.com/rime-za/ljubav        → statička strana: rime za „ljubav" + isti alat
rimoteka.com/rime-za/srce          → …
rimoteka.com/slogovi               → brojač slogova (poseban ulaz za taj keyword)
rimoteka.com/vrste-rima            → kratak edukativni tekst (autoritet)
```

Svaka `/rime-za/[reč]` strana ima:
- **stvarne rime upisane u HTML** (Google ih vidi bez JS-a),
- isti interaktivni alat (korisnik odmah može da kuca dalje),
- 2-3 rečenice + značenje reči iz rečnika (jedinstven sadržaj, ne prazan šablon),
- linkove ka srodnim rimama (interno povezivanje).

---

## 5. Tehnički plan — „indeksiraj odmah i PRAVILNO" (bez Frankenštajna)

Pouke sa drugih sajtova (canonical=home bug, SPA ne renderuje) → uradimo ispravno iz prve:

### a) Statički prerender (srce rešenja)
- Python skripta pri buildu generiše `public/rime-za/[reč]/index.html` za svaku reč sa liste.
- Nema JS-zavisnosti za indeksiranje — Google dobija pun HTML odmah.
- Infra već postoji (`build/` folder, Python pipeline za rečnik).

### b) Svaka strana — čist on-page (baked u HTML, NE preko JS-a)
- Jedinstven `<title>`, `<meta description>`, `<h1>` — po reči.
- **Ispravan `<link rel=canonical>` po strani** (NE home! — to je bio bug na BLB-u).
- OpenGraph/Twitter po strani.
- Breadcrumb.

### c) Structured data (Schema.org)
- Homepage: `WebApplication` (već postoji) + `FAQPage`.
- `/rime-za/[reč]`: `BreadcrumbList` + `DefinedTerm`/`FAQPage` („Koje reči se rimuju sa X?").
- `/slogovi`: `HowTo` (kako se broje slogovi).

### d) Sitemap + robots
- Auto-generisan `sitemap.xml` sa **svim** stranama (+ `sitemap-index.xml` ako pređe 1000 URL-ova; limit je 50k/50MB po fajlu).
- `lastmod` tačan; `robots.txt` već OK.

### e) Ubrzavanje indeksiranja (svi legalni poluzi)
1. ~~Backlinkovi sa sopstvenih sajtova~~ — **UKINUTO odlukom vlasnice 19.08.2026:
   nikad linkovi sa njenih drugih sajtova (orbitacode.com, babylovebox.rs,
   spomenicibeograd.rs) — nisu ista niša. Ne predlagati ponovo.**
   Backlinkovi se traže SAMO iz niše: pesničke zajednice, književni blogovi,
   obrazovni sadržaji, Pinterest/zajednice o pisanju.
2. GSC → Submit sitemap + **Request Indexing** za top 10-20 strana ručno.
3. Jako **interno povezivanje** (footer hub + „srodne rime" između strana) → Google puzi dublje.
4. **IndexNow** (besplatno) → instant ping Bing/Yandex (Google ne koristi, ali Bing da).
5. Brz, statički HTML = Google renderuje trenutno, bez čekanja JS-a → veći crawl budget.

> **Realno:** Google NE indeksira hiljade strana „preko noći" na domenu od 6 nedelja. Zato krećemo od **~200 kvalitetnih strana**, pravilno, pa širimo. Bolje 200 čistih indeksiranih nego 2000 „thin" koje Google odbije (i pravi Frankenštajna).

---

## 6. Faze (PM raspored, po prioritetu efekta/rizika)

### Faza 0 — Homepage on-page (DANAS, ~30 min, 0 rizika)
- Title/description/H1 sa pravim frazama („rime i rečnik rima", „brojanje slogova").
- Statički SEO pasus + **FAQ sekcija** (vidljivo Googlu bez JS-a).
- FAQPage schema.
- ⇒ Bez diranja izgleda/funkcija alata.

### Faza 1 — Prerender infra + top 200 reči (glavni potez)
- Python generator `build/gen_pages.py`.
- 200 strana `/rime-za/[reč]`, pun on-page + interni linkovi.
- Sitemap auto-gen. Footer sa linkovima ka 20-30 popularnih.

### Faza 2 — Širenje + drugi alat
- Do 1000-2000 reči (po GA4 podacima o traženju).
- `/slogovi` strana (keyword „brojanje slogova").
- „Srodne rime" blok između strana.

### Faza 3 — Autoritet
- `/vrste-rima`, `/kako-napisati-pesmu`, `/rime-za-decu` (nišni tekstovi).
- IndexNow. (Bez backlinkova sa njenih sajtova — v. zabranu u tački e.)

### Faza 4 — Merenje i iteracija (stalno)
- GA4 event po pretrazi → koje reči fale → nove strane.
- GSC praćenje: koje strane hvataju impresije/klikove.

---

## 7. Google Analytics / merenje (feedback petlja)

- **GA4 event `rhyme_search`** sa parametrom `word` → vidimo šta ljudi kucaju.
- Mesečno: top tražene reči koje **nemaju** svoju stranu → auto u sledeći batch prerendera.
- GSC „Performance": pratiti impresije po strani; strane sa impresijama ali bez klikova → poboljšati title/description.
- Cilj metrике: broj indeksiranih strana ↑, organski klikovi ↑, prosečna pozicija za „rime za *" ↓ (bolja).

---

## 8. Realna očekivanja (iskreno, kao mentor)

| Period | Očekivanje |
|---|---|
| Nedelja 1-2 | Homepage on-page fix live; prvih ~200 strana poslato + počinje indeksiranje |
| Mesec 1-2 | Long-tail „rime za [reč]" počinje da hvata impresije/klikove |
| Mesec 3-6 | Autoritet raste; brojač slogova i dečje rime se penju; head-termini bolji |
| Head „rimovanje reči" | Teško brzo (EMD konkurent) — cilj je zbir long-taila, ne jedna fraza |

**Suština:** ne jurimo jednu tešku frazu — osvajamo **stotine lakih** koje zbirno donose više saobraćaja i grade autoritet da se vremenom popnemo i na teške.

---

## 9. Otvorena pitanja / odluke pre kretanja
- URL oblik: `/rime-za/ljubav` (predlog) — čitljivo, keyword-rich, srpski (u skladu sa pravilom o srpskim URL-ovima).
- Latinica/ćirilica: generisati obe verzije ili canonical na latinicu + `hreflang`? (predlog: latinica kanonski, ćirilica preko toggle-a kao sad; ne dupliramo strane).
- Koliko reči u prvom batch-u (predlog: 200).
- Da li smemo da dodamo footer sa linkovima (vizuelno malo proširenje homepage-a) — **korisnica: DA, uslovno**.
