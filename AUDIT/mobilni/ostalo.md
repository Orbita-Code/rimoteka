# Mobilni pregled – sve osim beležnice i rimovanja (07.09.2026)

> Lokalno (`http://localhost:8765`), Playwright Chromium, `isMobile` + `hasTouch`, širine 320 i 390 × 844.
> Sve izmereno, ništa pretpostavljeno. Skripte: scratchpad sesije (`mob-a.mjs`, `mob-c.mjs`, `mob-d.mjs`, `ver1.mjs`, `ver2.mjs`).
> Dokazi: `AUDIT/screenshots/mobilni-ostalo-*.png`.

## Opseg koji je stvarno prošao

| Šta | Kako | Ishod |
|---|---|---|
| 11 strana × 5 režima (390, 320, 390 ćir, 390 tamna, 320 ćir+tamna) | prelivanje, mali ciljevi, latinica u ćirilici, svetli okviri u tamnoj, konzola, slike | 55 učitavanja, 0 prelivanja, 0 grešaka u konzoli (osim nalaza 1) |
| Tabovi slogovi / pretraga (3 režima) / klasici / omiljene / igra | sa `/slogovi/`, `/rime-po-zavrsetku/`, `/klasici/`, `/igra-rimovanja/` i sa `/?tab=…` | rade, v. nalaze 1 i 4 |
| Igra: 2 igrača × 5 reči × 10 s, predaja uređaja, rezultati | 390 i 320, po jedna cela partija | 10/10 odgovora, rezultati ispravni, fokus u polju |
| Navigacija | tap na tab menja adresu, „Nazad" ×2, F5, logo, `/?tab=` za 5 tabova | sve ispravno |
| `/rime-za/` hub | lepljiva azbuka, pretraga u spisku (lat, ćir, nepostojeća), klik na slovo, prvi link | v. nalaze 2 i 3 |
| Futer | 55 linkova sa `/rime-za/ljubav/` (`GET`, bez preusmerenja) | svih 55 → 200 |
| Baner kolačića 390 i 320 | prvi dolazak, „Podesi", prekidač, „Sačuvaj izbor", „Prihvati sve", futer „Kolačići" | sve radi |
| Pismo + tema | prebacivanje pa F5 na početnoj; svaka statička strana u ćir i tamnoj | pamti se; v. nalaz 4 |

## Nalazi

| # | Ozbiljnost | Gde | Koraci | Izmereno | Očekivano | Popravka |
|---|---|---|---|---|---|---|
| 1 | **VISOKO** | `/klasici/` (statička strana, ona na koju Google šalje) | otvori `/klasici/` → tap „prebaci u brojač slogova" ispod prve pesme | ništa se ne desi; konzola: `PAGEERROR sylInput.dispatchEvent is not a function`. Ista radnja na `/?tab=klasici` radi (prebaci na slogove, tekst „Sinoć, kad se vratih…" u polju) | pesma se prebaci u brojač slogova | `public/app.js:1794` `const sylInput = el('sylInput')` na statičkoj strani vraća `NOOP_EL` (`app.js:44`), a `app.js:4404` zove `dispatchEvent`. Na strani bez `#sylInput` dugme treba da odvede na `/slogovi/` i preda tekst (npr. `sessionStorage`), ili da se ne prikazuje |
| 2 | **VISOKO** | `/rime-za/` | tap na slovo u azbuci (npr. „M") | naslov „M" završi na `top=0`, a lepljivi blok (pretraga + azbuka, `.hub-alat`, `style.css:2410`) pokriva 0–241 px na 390 i 0–284 px na 320. Ispod bloka sakriveno **33 linka (390) / 29 linkova (320)**; naslov se ne vidi (`elementFromPoint` vraća polje za pretragu). `scroll-margin-top: 0px` | naslov slova i prvi linkovi vidljivi ispod lepljivog bloka | `h2[id^="slovo-"]{scroll-margin-top:<visina .hub-alat>}` ili JS skrol sa pomakom. Dokaz: `mobilni-ostalo-hub-slovo-M-320.png`, `-390.png` |
| 3 | SREDNJE | `/rime-za/` | listaj spisak od 1.985 linkova | lepljivi blok stalno zauzima **241 px = 29 % ekrana (390)**, **284 px = 34 % (320)**; slova azbuke 33×35 px (ispod 44) | lepljivi deo ≤ ~15 % ekrana, slova ≥ 44 px | na telefonu azbuka u jednom redu sa vodoravnim skrolom (ili samo azbuka lepljiva, pretraga ne); veći ciljevi |
| 4 | SREDNJE | `/klasici/` i `/?tab=klasici` u ćirilici | uključi ћирилица → otvori klasike | dugme „prebaci u brojač slogova" ostaje **latinicom** ispod svake pesme (4 puta); ostalo na strani je ćirilicom | ćirilicom kao sve ostalo | `app.js:4403` `btn.textContent='prebaci u brojač slogova'` bez transliteracije (ostali natpisi idu kroz istu funkciju kao „Шема риме") |
| 5 | NISKO | igra, zaglavlje, `/rime-za/ljubav/` | izmeri dugmad | opcije igre **42 px** visine (širina 43–65), prekidač latinica/ћирилица **40 px**, „Kopiraj sve rime" **40 px**; granica je 44 px | ≥ 44 px | `min-height:44px` na `.game-option`, `.copy-all-btn` i prekidaču pisma |
| 6 | NISKO | `/klasici/`, `/rime-za/ljubav/` | pogledaj broj slogova uz stih / uz reč | `.vsyl` **9,92 px** (klasici), `.syl` **10,4 px** (kapsule na statičkoj strani); ispod 12 px se na telefonu ne čita | ≥ 12 px | podići na 12 px (0,75 rem) |
| 7 | NISKO (pitanje) | `/slogovi/` | upiši dva stiha → F5 | polje prazno posle osvežavanja (beležnica pamti, brojač ne) | ako je namerno, u redu; ako nije, pamtiti kao beležnicu | odluka vlasnice |

## Šta radi dobro (ne dirati)

| Provereno | Merenje |
|---|---|
| Ništa ne preliva | `scrollWidth` = širina na svih 55 učitavanja (11 strana × 5 režima) i posle unosa/rezultata u svim tabovima |
| Tabovi su pravi linkovi | 7 tabova, svi 44 px visoki, adresa se menja (`/slogovi/`, `/rime-po-zavrsetku/`, …), „Nazad" vraća tačan tab, F5 ostaje na tabu, logo (`a.brand`, 189×62) vodi na `/` |
| Traka nad reči na dodir | tap na reč otvara traku sa 5 radnji: 60×50 px (390), 41×50 px (320); ♡ upisuje u Omiljene (brojač 0→1), „kopiraj" daje toast, „obriši" prazni spisak |
| Pretraga reči | 3 režima daju rezultate („ost" 600, „lju" 502, „ubav" 72), bez prelivanja, dugmad ≥ 44 px |
| Igra | ceo tok 2 igrača na 390 i 320: reč → odgovor → „✓ Tačno! +25…" → predaja „Vreme je za igrača 2" → rezultati sa poenima i značkama; fokus je u polju za unos posle svake reči, dugme „Proveri" 57 px, „Igraj ponovo" 59 px |
| Baner kolačića | 123 px visok, dno na 836/844, **ne zaklanja** polje (polje 344–406 px); „Prihvati sve" 44 px i „Podesi" 44 px; „Podesi" otvara dva reda (72 i 53 px), neophodno je zaključano, analitika se pali tapom na natpis; „Sačuvaj izbor" i „Prihvati sve" sklone baner i upišu `rimoteka_kolacici`; GA skripta se učitava **tek posle** pristanka; futer „Kolačići" ponovo otvara baner. Isto na 320 |
| Futer i 404 | 55 linkova → 200; `/ovo-ne-postoji/` → 404 sa poljem za reč (62 px) i ćirilicom kad je uključena |
| Pismo i tema | ćirilica na svih 11 strana bez latinice (osim logotipa, `code`/`kbd` primera i nalaza 4); tamna tema bez belih okvira; oba prežive F5 |

## Lažni tragovi (provereno pa odbačeno)

| Trag | Zašto nije nalaz |
|---|---|
| „Slab kontrast 1,19" na aktivnom tabu i dugmetu „Nađi rime" u tamnoj | pozadina je gradijent (`linear-gradient(95deg, rgb(192,174,248)…)`), merač je gledao samo `background-color`; tamni tekst na lavanda podlozi je čitljiv |
| Dugme ♡ u kapsuli (`.mini.fav`) „nevidljivo" na telefonu | namerno (`app.js:1010`, odluka 06.09.) – radnje su u traci koja se otvara tapom na reč |
| `h1="imoteka"` na 404 | logotip je podeljen na `R` + `imoteka`; stvarni naslov je „404 / Ова страница није пронађена" |

## Nisam stigao

- Pravi telefon / Safari na iPhone-u (virtuelna tastatura koja podiže sadržaj, `100vh`).
- Položeni ekran (landscape) i spora mreža.
- Tok „prebaci u brojač slogova" na 320 (proveren samo na 390; uzrok je isti kod).
- Vizuelni pregled svakog screenshot-a oko za oko – merenja su automatska.
- 100 partija igre (druga skripta), beležnica i rimovanje (`beleznica.md`, `rimovanje.md`).
