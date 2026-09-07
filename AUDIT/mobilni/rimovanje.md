# Mobilni test — Rimovanje reči (07.09.2026)

> Testirano na lokalnom serveru `http://localhost:8765`, Playwright Chromium, 390×844 i 320×844, `isMobile` + dodir.
> Latinica i ćirilica, svetla i tamna tema. Tastatura lažirana (`visualViewport.height = innerHeight − 336`, vidljivo 0–508 px).
> Prijave greške presretnute (`route` → lažni 200), ništa nije poslato na pravo sanduče.
> Sve vrednosti su IZMERENE (`getBoundingClientRect`, `scrollY`, WCAG kontrast), ne procenjene.
> Skripte: scratchpad sesije `rime-mob.mjs`, `rime-mob2.mjs`. Snimci: `AUDIT/screenshots/mobilni-rime-*.png`.

## Dokazani nalazi

| # | Ozbiljnost | Šta se kvari | Koraci | Izmereno | Očekivano | Uzrok / popravka |
|---|---|---|---|---|---|---|
| M-1 | **VISOKO** | Posle reči bez rime (kucanje pogrešne reči je najčešći tok na telefonu), sledeća PRAVA pretraga ostavlja korisnika na DNU liste — vidi najgore rime i tekst ispod, a „Najbolje rime" su 2.500 px iznad | 390 px: upiši `nada` → Nađi rime; upiši `xkqzvw` → Nađi rime (poruka „Nema čiste rime…"); upiši `Beograd` → Nađi rime | `scrollY` skoči sa 672 na **3217** već na 0 ms posle dodira; vrh rezultata je na 680 px dokumenta, tj. **2.537 px iznad** ekrana. Isto sa `nada` posle prazne pretrage (`scrollY` 2623). Reprodukovano 3/3. Snimak `mobilni-rime-posle-nepostojece-390.png` — vidi se rep liste (`pilad, obad, presad…`) i naslov ispod nje | Ekran na vrhu liste, „Najbolje rime" pod prstom, kao posle svake druge pretrage (`scrollY` 672) | Pregledačevo *scroll anchoring* (Chrome „drži" element koji je bio u vidnom polju — a to je bio sadržaj ISPOD prazne poruke, jer je poruka mala) pomeri stranu naniže za visinu nove liste (3217 − 672 = 2.545 px). Zatim `pokaziRimeNaTelefonu()` (`public/app.js:1120`) ima uslov `if(y > window.scrollY)` pa **odbije da skroluje nagore**. Popravka: skrolovati na rezultate uvek kad `Math.abs(y − scrollY) > 8` (ne samo naniže), i/ili `overflow-anchor:none` na `#rimeResults`. Provera za pre-deploy test: prazna pretraga pa puna → `scrollY` mora biti ≈ vrh `#rimeResults` |
| M-2 | SREDNJE | Dugmad filtera slogova `1 2 3 4` su preuska za prst | 390 px i 320 px, posle pretrage, izmeri `#rimeSyl button` | 390 px: širine **34, 36, 36, 37 px** (visina 44 ✓); 320 px: **25, 27, 27, 27 px**; razmak 4–5 px. Sve ostalo (kvačice 44 px, kockica 61×52, „Nađi rime" 128×52, trake 60×50) prolazi | ≥ 44×44 px (WCAG 2.5.5, i naše pravilo 44 px) | `min-width:44px` na `.syl-filter button`; na 320 px stane 6 dugmadi × 44 + razmaci = 284 px, ima mesta |
| M-3 | SREDNJE | „Nazad" na telefonu posle dve pretrage NE vraća na prethodnu reč nego napušta stranu | `/` → `nada` → `srce` → dugme Nazad | `history.length` 3 posle dve pretrage (pretraga ne dodaje unos); Nazad vodi na stranu PRE Rimoteke (u testu: prethodni URL), ne na `?rec=nada` | Pesnik na telefonu ide „Nazad" da vrati prošlu reč — očekuje `?rec=nada` | `history.replaceState` u `public/app.js:1256`. Namerna odluka (da se istorija ne puni) ali na telefonu je Nazad glavna navigacija. Predlog: `pushState` za svesnu pretragu (dugme/Enter), `replaceState` samo za promenu filtera; `popstate` već čita `?rec=` |
| M-4 | NISKO | Kvačica „i šire (slabije) rime" kod reči sa mnogo rima ne menja NIŠTA vidljivo, bez poruke | `ljubav` → štikliraj „i šire" | Pre: 180 kapsula (90 + 90), grupe „Najbolje / Dobre"; posle: **180, iste grupe, nema „Šire rime"**. Kod `sunce` radi (9 → 79, pojavi se „ŠIRE RIME (ASONANCA)") | Ili da se šire rime dodaju, ili kratka poruka „ova reč već ima dovoljno čistih rima — šire se ne prikazuju" | Grupe su ograničene na 90 kapsula, pa šire nikad ne dođu na red. Pisac misli da je kvačica pokvarena |
| M-5 | NISKO | Poruka za čitač ekrana (`#rimeStatus`, `aria-live`) ostane stara kad se upiše prazno ili jedno slovo | posle `ljubav` upiši `a` ili samo razmake → Nađi rime | Na ekranu „Upiši reč (bar dva slova)."; `#rimeStatus` i dalje „180 rima za „ljubav"" | Status prati poruku | Postaviti `rimeStatus` i u grani „prekratka reč" |
| M-6 | NISKO | Na 320 px dugmad trake nad reči su uska | 320 px, dodir na reč | 5 dugmadi po **41×50 px** (na 390 px 60×50 ✓); traka 220 px široka, ništa ne preliva (`scrollWidth` = 320) | ≥ 44 px | `min-width:44px` — 5 × 44 = 220 + razmaci stane u 320 |

## Šta radi dobro (izmereno, ne dirati)

| Oblast | Dokaz |
|---|---|
| Pretraga | `nada` 122, `srce` 90, `ljubav` 180, `sunce` 6 + 3 sinonima, `Beograd` → `?rec=beograd` (malo slovo) 140, ćirilica `љубав` u latiničnom režimu → `?rec=ljubav` 180; nepostojeća → jasna poruka sa uputstvom; prazno/jedno slovo → „Upiši reč (bar dva slova)" |
| Grupe | „Najbolje rime" (istaknuta) / „Dobre rime" / „Dobre rime (isti završni slog)" / „Šire rime (asonanca)" — naslovi jasni, u ćirilici prevedeni |
| Skrol posle pretrage | Posle dugmeta/Enter lista dolazi pod prst (`scrollY` 672, vrh `#rimeResults` na 8 px) — osim u slučaju M-1 |
| Filter slogova | `?slog=2/3/5` u adresi, u listi samo taj broj slogova (`sylSet` = ["2"]), „sve" briše `?slog`; osvežavanje `?rec=srce&slog=2` vraća reč, filter (aktivno „2") i 90 rezultata |
| Kvačice | Sve tri (šire, ijekavica, dečji) 44 px visoke, dodir na tekst radi |
| Traka nad reči | 5 radnji, 60×50 px, na 390 px cela u ekranu (8–327 px); **značenje** — oblačić 211×99 px, tekst 11,9:1 svetla / 13,7:1 tamna, u ekranu na 320 (desna ivica tačno 320) i 390; **omiljene** — brojač 0→1, ikonica se popuni, reč vidljiva u tabu Omiljene, drugi dodir vraća na 0; **nađi rime** — nova pretraga `?rec=kada`, lista pod prstom; **kopiraj** — poruka „kopirano: kada", u ostavi „kada"; **prijavi** — prozor 390×475 px staje u ekran, 6 opcija po 44 px, sa tastaturom prozor 33–508 px, polje 365–429, „Pošalji" 446–490 — sve IZNAD tastature; posle slanja „Hvala! Prijava za „sada" je stigla." |
| Tastatura + polje | Sa otvorenom tastaturom polje (175–237 px) i dugme (246–299 px) vidljivi; posle dodira tastatura se zatvara (`activeElement` = dugme), prva kapsula na 182 px |
| Kockica | 61×52 px, daje reč (`napadi`, `pravnog`), lista i `?rec=` |
| `/rimovanje-reci/` | Isti alat, isti rezultati (`nada` 122), traka radi, nema prelivanja |
| 320 px | `scrollWidth` = 320 u praznom stanju, sa rezultatima, sa trakom, sa oblačićem i sa prozorom prijave |
| Statička `/rime-za/ljubav/` | 262 kapsula (46 px visoke), 3 grupe, traka nad reči radi (5 radnji, 60×50), značenje se otvara, „nađi rime" vodi na `/?rec=ubav`, „Kopiraj sve rime" upiše 60 reči u ostavu i javi „Kopirano!", susedne reči 49 px visoke, u ćirilici naslov „Риме за реч „љубав"" |
| Tamna tema | Reč u kapsuli 13,7:1, kružić slogova 8,7:1, naslov grupe 5,7:1, legenda 8,2 / 4,7:1, kvačice 9,2:1, dugmad trake 7,7:1, prijava 13,9 / 7,7:1 — sve iznad 4,5 |
| Legenda | Jedna rečenica za kružić + jedna za dodir; svetla tema 6,4 / 4,5:1 (12,8 px) — prolazi, ali tik uz granicu |
| Konzola | Nijedna JS greška ni `pageerror` u svih 6 konteksta |

## Utisci pisca (nisu bagovi)

- Kad otkucam pogrešno pa ispravim (M-1), prvo što vidim su `pilad, obad, jihad` — pomislim da je ovo sve što sajt zna, a najbolje rime su daleko gore. To je najgori prvi utisak koji alat može da ostavi.
- Kad štikliram „i šire rime" za `ljubav` i ništa se ne desi, mislim da je kvačica pokvarena (M-4). Jedna rečenica bi rešila zabunu.
- Kockica daje reč, ali lista ostane 680 px niže — vidim samo prvih 160 px rezultata i moram da skrolujem; posle dugmeta „Nađi rime" lista dolazi pod prst, posle kockice ne. Nedosledno.
- Kad sačuvam reč u Omiljene, nema poruke — samo se ikonica popuni i brojač u tabu (koji je van ekrana kad sam u listi) poraste. Jedna kratka poruka „sačuvano: kada" (kao kod kopiranja) bila bi umirujuća.
- Legenda je jasna i kratka; „Dodirni reč i videćeš njeno objašnjenje, možeš da je sačuvaš…" tačno opisuje traku. Druga rečenica je sitna (12,8 px) i bleda (4,5:1) — čita se, ali na suncu teško.
- Kod `sunce` piše „6 rima" a vidim 9 kapsula (3 sinonima u posebnoj kartici) — jasno je tek kad pročitam naslov kartice.

## Lažni tragovi (provereno pa odbačeno)

| Trag | Zašto nije nalaz |
|---|---|
| „Kopiraj sve rime" na statičkoj strani javio „Greška" | Playwright bez dozvole za ostavu; sa `permissions: clipboard-write` → „Kopirano!" i 60 reči u ostavi. Kod nema `execCommand` rezervu (`app.js:4440`), ali na `https` na pravom telefonu radi |
| Aktivno dugme slogova u tamnoj temi kontrast 1,05:1 | Merač uzeo `background-color` (providan) umesto gradijenta `linear-gradient(#8fd0f8, #5ab8f8)`; tamni tekst na svetloplavom je ≈ 12:1 (snimak `tamna-filter-390.png`) |
| Tab „Rimovanje reči" nedostaje kad sam u Omiljene | Tabovi alata su `<a>`, ne `<button>` — moj selektor. Svih 7 tabova 44 px visoki, povratak na `/` vraća reč i listu iz `?rec=` |

## Nisam stigao

- Pravi telefon (iOS Safari — tastatura, gest „Nazad", `100vh`), samo Chromium emulacija.
- Dečji režim sa reči koja stvarno ima nepristojne rime (na `ljubav` 180 → 180); ijekavica sa reči koja ima `ije` oblike.
- Prijava greške sa statičke `/rime-za/` strane i sa 320 px + tastatura.
- Dodir na sinonim u kartici „Druge reči za …"; kapsule u futeru; `5+` slogova na 320 px.
- Da li 90 po grupi seče prave rime (status „180 rima za ljubav" — koliko ih zapravo ima).
