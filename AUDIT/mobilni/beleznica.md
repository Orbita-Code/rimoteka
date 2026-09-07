# Beležnica na telefonu — ispitivanje 07.09.2026

> Sve izmereno na lokalnom serveru (`http://localhost:8765`, isti kod kao u repou), Playwright Chromium,
> vidokrug 390×844 i 320×844, `isMobile` + `hasTouch`, tastatura lažirana preko `visualViewport`
> (vidljivi deo 0–508 px). Nijedan fajl projekta nije menjan. Skripte:
> `scratchpad/beleznica.mjs` (tri scenarija) i `scratchpad/beleznica2.mjs` (kontrast svetle teme,
> pilula „još N rima", fantomski red).

**Scenariji:** 390 latinica svetla (pun prolaz, tačke 1–8) · 390 ćirilica tamna (1–4, 7, 10) · 320 latinica svetla (1–4, 7).
**Konzola:** 0 grešaka u sva tri scenarija.

## Dokazani nalazi

| # | Ozbiljnost | Šta se kvari | Koraci | Izmereno | Očekivano | Dokaz |
|---|---|---|---|---|---|---|
| 1 | **visoko** | Dodir na pilulu **„još 36 rima"** u razvijenoj traci ne razvije listu, nego izbaci pisca iz pisanja: editor gubi fokus (tastatura se zatvara), traka nestaje sa vrha i pada ispod editora | 1. upiši 3 stiha, kursor na „polje" 2. strelicom razvij traku 3. dodirni „još 36 rima" | posle dodira: `document.activeElement` = `body` (bio `noteEditor`), `body.className` = `kb-open` (izgubljen `notes-typing`), traka `position: static`, `top` = 736 px (van vidljivih 508), broj rima **16 → 16**, natpis i dalje „još 36 rima" | lista se razvije na 52 rime, fokus i tastatura ostaju | `AUDIT/screenshots/mobilni-beleznica-jos-rima-posle-dodira.png` |
| 2 | nisko | Lepljenje (paste) posle „označi sve → obriši" ostavlja **fantomski prazan red** na kraju — u koloni levo piše „·", a u sačuvanoj pesmi stoji `\n` viška | 1. upiši bilo šta 2. označi sve, obriši 3. nalepi 2 (ili 6) stihova | tekst editora `"Prvi stih je tih\ndrugi stih je stih\n\n"`, redova u koloni **3** (`A5, A5, ·`) za 2 nalepljena stiha; isto 7 redova za 6 stihova; `localStorage.rimoteka_notes` završava sa `\n`. Kucanje posle brisanja NE pravi fantom (`"nova pesma"`, 1 red) | onoliko redova koliko je nalepljeno stihova | `AUDIT/screenshots/mobilni-beleznica-paste-fantomski-red.png` |
| 3 | nisko | U razvijenoj traci pilula „još 36 rima" je **odsečena** donjim rubom trake — mora da se skroluje unutar trake da se vidi cela | 1. 3 stiha 2. strelica ▾ | traka `bottom` = 371 px, pilula `top` 343 / `bottom` 384 → **13 px odsečeno**; `scrollHeight` 391 > `clientHeight` 370 | pilula cela u traci (ili traka dovoljno visoka) | `AUDIT/screenshots/mobilni-beleznica-lista-otvorena-pilula-odsecena.png` |
| 4 | nisko | Strelica za razvijanje/skupljanje trake je **niža od 44 px** | izmeriti `.nr-toggle` | 44 × **30** px (na 390 i na 320, u oba pisma) | ≥ 44 × 44 px | — |

Uzrok nalaza 1 (pročitano, ne pretpostavljeno): `public/app.js` sprečava gubitak fokusa samo za `.chip`
(`noteRhymesBox.addEventListener('pointerdown', e => { if(e.target.closest('.chip')) e.preventDefault(); })`,
oko reda 2430), a pilula je `button.nr-more` (red ~3256). Dodir na nju → `blur` editora → `setTypingMode(false)` →
traka se ponovo iscrta u običnom rasporedu, pa `click` više nema šta da pogodi. Popravka: u isti `pointerdown`
uslov dodati `.nr-more` (i `.nr-toggle`, da se ne pojavi isti kvar tamo — strelica trenutno radi jer stoji van
`.results`, ali proveriti posle izmene).

## Šta radi dobro (izmereno)

| Tačka | 390 lat. svetla | 390 ćir. tamna | 320 lat. |
|---|---|---|---|
| 1. Traka „RIME ZA …" na vrhu vidljivog ekrana dok se kuca | `top` 0, `bottom` 101 px, `position: fixed` | isto | isto |
| 1. Red sa kursorom vidljiv između trake i tastature (101–508 px) | stih 1: 376–395 · stih 2: 288–307 · stih 3: 317–336 | 376–395 · 288–307 · 317–336 | 374–394 · 292–312 · 322–342 |
| 1. Traka prati poslednju reč stiha | „svoju" → „pokoju" → „polje", 16 rima svaki put | „своју" → „покоју" → „поље" | isto |
| 2. Kolona slogova/šeme nije odsečena | `.gutter-row` right = 60 px ≤ editor left = 61 px; `scrollWidth` = `clientWidth` = 58 | isto | isto (i na 320!) |
| 2. Tačnost za 3 stiha | „Ptica peva pesmu svoju / kraj planine u pokoju / sunce greje celo polje" → **A 8, A 8, B 8** — tačno | isto, ćirilicom | isto |
| 2. Tačnost za 6 nalepljenih stihova | tih/stih/dalje/sanje/jad/sad → A5 A5 B6 C6 D5 D5 — tačno (dalje≠sanje ispravno razdvojeno) | — | — |
| 3. Dodir na rimu | „polje" → „bolje" zamenjeno pod kursorom, 3 reda pre i posle, fokus ostaje na editoru, visina trake bez ijedne promene (0 treperenja, ResizeObserver) | „поље" → „боље", isto | isto |
| 4. Strelica | `aria-expanded` false → true → false; traka 101 → 371 → 101 px; red sa kursorom posle skupljanja na 375–394 (vidljiv) | isto | traka 101 → 371 → 101 |
| 5. Naslov | „Pesma o ptici" upisan, sačuvan, preživeo osvežavanje | — | — |
| 5. Brisanje | označi sve + Backspace → editor prazan (`<br>`), 1 red | — | — |
| 5. Paste 6 stihova | svih 6 prelома ostalo (v. nalaz 2 za viška red) | — | — |
| 6. Čuvanje | posle osvežavanja tekst i naslov isti; `localStorage.rimoteka_notes` 98 znakova | — | — |
| 7. Dodir u sred reči | dodir u sredinu „peva" → traka „Rime za peva" | „пева" | „peva" |
| 7. Dodir na kraj reči | kraj „pesmu" → „Rime za pesmu"; kraj „planine" → „Rime za planine" | isto | isto |
| 7. Prazan red | kursor u novom praznom redu → traka ostaje na „polje" (poslednja reč prethodnog stiha) — korisno ponašanje, ne bag | isto | isto |
| 8. Dugmad ≥ 44 px | svih 7 dugmadi visine **44 px** (`min-height: 44px`), razmak u redu 9 px, između redova 7 px | — | — |
| 8. preuzmi pesmu | skinut `pesma-2026-09-07.txt` sa naslovom + 6 stihova | | |
| 8. štampaj / PDF | `window.print()` pozvan 1×, `#printArea` ima naslov + stihove | | |
| 8. podeli link | u klipbord `…/pisanje-pesama/?pesma=…`, toast „Link kopiran — slobodno ga podeli!" | | |
| 8. prikaži metar | `#noteMeter` otkriven: „Preovlađuje 5 slogova · 2 stiha odstupa", natpis → „sakrij metar", `aria-pressed` true | | |
| 8. sačuvaj rime u Omiljene | toast „Sačuvano 109 rima za „sad"" | | |
| 8. preuzmi listu | skinut `rime-za-sad.txt` | | |
| 8. obriši pesmu | `confirm` „Obrisati celu belešku?" → editor, naslov i `localStorage` prazni | | |
| `/?tab=beleznica` | panel `display: flex`, editor vidljiv | | |
| 10. Kontrast (tamna) | tekst 13,7:1 · obojena rima u editoru 4,62:1 · naslov trake 7,8:1 · reč u traci 5,65:1 · rima-pilula 13,7:1 · broj slogova u pilulи 8,7:1 · strelica 5,67:1 · A u koloni 5,54:1 · broj slogova/„⠿" u koloni 4,66:1 · legenda 4,66:1 · dugme 7,8:1 — sve ≥ 4,5 (granica za čitljivost) | | |
| 10. Kontrast (svetla) | obojena rima 4,63:1 · A 5,73:1 · B 6,87:1 · broj slogova 4,76:1 · reč u traci 5,01:1 · naslov trake 6,87:1 · pilula 11,9:1 · broj u piluli 5,27:1 · legenda 4,76:1 · dugme 6,0:1 — sve ≥ 4,5 | | |

## Šta mi kao piscu smeta (nije dokazan bag, nego utisak)

| Šta | Zašto smeta |
|---|---|
| Dok kucam, između trake rima (0–101 px) i editora stoje naslov strane „Pisanje pesama uz rime…" i polje za naslov — oko 250 px od 508 vidljivih ide na stvari koje mi ne trebaju dok pišem; vidim samo 3–4 stiha (v. `mobilni-beleznica-kucanje-390-svetla.png`) | Na duže pesme se strana skroluje pa je bolje, ali prvih desetak stihova pišem „kroz prorez". Predlog: dok je `notes-typing`, sakriti (ili skupiti) naslov strane i mrvice. |
| Dodir na rimu **zamenjuje** reč pod kursorom („polje" → „bolje"), a uputstvo kaže „klikni na ponuđenu rimu da je ubaciš u stih" | „Ubaciš" zvuči kao dodavanje; prvi put me iznenadilo što mi je reč nestala. Ili promeniti natpis („…da zameni reč pod kursorom") ili ponašanje. |
| Posle zamene traka i dalje piše „RIME ZA polje", a „polje" više nema u stihu | Namerno (komentar u kodu), i logično kad se shvati — ali zbunjuje prvi put. |
| Zadatak je tražio dugmad „kopiraj" i „prebaci u brojač" — **ne postoje** | Postoje: obriši pesmu · sačuvaj rime u Omiljene · preuzmi listu · preuzmi pesmu · štampaj / PDF · podeli link · prikaži metar. „Kopiraj pesmu" u klipbord bi na telefonu bilo korisnije od „preuzmi" (fajl na iPhone-u ode u Files, teško se nađe). |
| „sačuvaj rime u Omiljene" i „preuzmi listu" rade za reč pod kursorom, ali kad kursor nije u editoru (dodirnem dugme), sačuvane su rime za **poslednju reč** („sad") bez ikakve naznake koje reči | Toast to kaže tek posle. Pre klika nemam pojma za koju reč će sačuvati. |
| Skupljena traka pokazuje 4 rime, peta odsečena („kolje"), i mora se prevlačiti u stranu (traka široka 1738 px u 368 px prozora) | Radi, ali odsečena pilula na rubu je jedini nagoveštaj da ima još. |

## Šta nisam stigao da proverim

- Pravi iOS Safari (adresna traka, Safari traka iznad tastature, `visualViewport.offsetTop` ≠ 0) — sve ovde je Chromium sa lažiranom tastaturom, `offsetTop` uvek 0.
- Prevlačenje stihova prstom („⠿ prevuci da premestiš stih") na dodirnom ekranu.
- Paste kad je editor **zaista prazan** posle osvežavanja (moj pokušaj je zakazao jer se pesma vratila iz `localStorage` pri osvežavanju — `removeItem` pre `reload` nije dovoljan, app upisuje pri zatvaranju).
- Ponašanje sa dugom pesmom (30+ stihova) — skrolovanje editora naspram skrolovanja strane dok je tastatura otvorena.
- Dodir na rimu kad je traka **razvijena** (test je dirao rimu samo u skupljenoj traci).
- Zabranjen/pokvaren `localStorage` na telefonu (globalni protokol D5) — nije bilo u opsegu.
- Tamna tema na 320 px i ćirilica na 320 px (na 320 samo latinica svetla).
