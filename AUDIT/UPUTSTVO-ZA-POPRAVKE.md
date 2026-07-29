# RADNI NALOG — sesija za popravke posle audita

> **Ovo je jedini zadatak te sesije: POPRAVLJATI. Bez novih funkcija.**
> Napisano 29.07.2026. posle kompletnog audita.
>
> Pre početka pročitaj, tim redom:
> 1. `CLAUDE.md` projekta (naročito 8a — logo, i 9a — obavezan test)
> 2. `/Users/jovana.jovic/CLAUDE.md` — odeljak „AUDIT I TESTIRANJE"
> 3. `AUDIT/NALAZI-OTVORENI.md` — 72 nalaza, ovo je izvor istine
> 4. `AUDIT/PROPUSTI.md` — zašto je audit prvi put promašio stvari

---

## 0. ŠTA JE PRETHODNA SESIJA URADILA (kontekst)

**Nije dirala nijednu liniju koda.** Radila je isključivo audit i dokumentaciju.

| Šta | Ishod |
|---|---|
| Postojeći test protiv produkcije | 140/140 prolazi ✅ |
| Prvi audit (39 agenata) | 27 nalaza, ali **samo 3/10 dimenzija završilo** — 7 se zaglavilo |
| Vlasnica prijavila ručno | **5 bagova, svih 5 potvrđeno**; 3 nije našao nijedan agent |
| Dopuna audita (54 agenta) | **8/8 dimenzija**, 37 novih nalaza, 0 zaglavljenih |
| **Ukupno otvoreno** | **72 nalaza** — 6 kritičnih, 7 visokih |
| Ocena | **6,9 / 10** |

**Šta je promenjeno u dokumentaciji (ne u kodu):**
- `AUDIT/` folder: dva izveštaja po datumu, živi spisak nalaza, dnevnik propusta
- `MONETIZACIJA.md` — plan za budućnost, **ne radi se sada**
- `TODO.md` — dodati inovativni predlozi (odeljak A) i „šta ne raditi" (odeljak B)
- Globalni `CLAUDE.md` — kompletan protokol za audit, audit na svaka 3 dana,
  podsetnik na početku sesije, pravilo o inovaciji

**Nekomitovano u radnom folderu:** `CLAUDE.md`, `TODO.md`, `AUDIT/`, `MONETIZACIJA.md`.

---

## 1. PRAVILA KOJA VAŽE ZA CEO OVAJ POSAO

1. **Deploy je zabranjen bez `node test/predeploy.mjs` sa izlaznim kodom 0.**
   Posle deploy-a ponovo, protiv produkcije: `BASE=https://rimoteka.com node test/predeploy.mjs`
2. **Svaka popravka dobija proveru u `test/predeploy.mjs`** (sada ima 114 provera).
   Zatim: **pusti novu proveru protiv produkcije DOK JE TAMO STARI KOD** — ako ne padne,
   provera ne valja i mora se prepraviti. Ovo nije formalnost, dokazano hvata loše provere.
3. **`?v=` se podiže u OBA fajla** — `public/index.html` i `build/gen_pages.py`.
   Trenutno je `20260728j`. Ako ostanu različiti, vlasnica danima gleda stari kod.
4. **LOGO SE NE DIRA** (pravilo 8a). Tiče se nalaza S1 — vidi upozorenje tamo.
5. **Push i merge samo uz izričito odobrenje vlasnice.** Rad na feature granama.
6. **Dve sesije mogu raditi u istom folderu** — komituj samo svoje putanje
   (`git add <putanja>`), nikad `git add -A`.
7. **Pre `python3 build/gen_pages.py` uraditi `pkill -f http.server`** — skripta briše
   `public/rime-za/` i pukne ako neko čita iz tog foldera.
8. **Ne popravljati ono što nije nalaz.** Ako naiđeš na nešto novo — upiši u
   `AUDIT/NALAZI-OTVORENI.md`, ne popravljaj usput.

---

## 2. REDOSLED POSLA

> Poređano po odnosu efekta i truda. **Raditi grupu po grupu**, testirati posle svake,
> i posle svake grupe pitati vlasnicu da li da se deployuje.

### GRUPA 1 — jedna izmena šablona popravlja 6 nalaza na 2.009 strana ⭐ prvo ovo

**Fajl:** `build/gen_pages.py`

| Nalaz | Šta fali | Gde dodati |
|---|---|---|
| K6 | `<script src="/dark-mode-init.js?v=1">` | `HEAD_TMPL` (~linija 182) |
| K6 | dugme `<button class="dark-toggle" id="darkToggle">🌙</button>` | zaglavlje, kao u `index.html:103` |
| V1 | `TOOL_SCRIPT` (`app.js`) i na strane `/rime-za/[reč]/` | funkcija koja gradi strane reči (~722) |
| S5 | `<div id="printArea" aria-hidden="true"></div>` | `FOOTER_TMPL` (~215) |
| S6 | `<div id="toast" class="toast"></div>` | `FOOTER_TMPL` (~215) |
| N9 | preskočen nivo naslova h1 → h3 | šablon generisanih strana |

Zatim: `pkill -f http.server && python3 build/gen_pages.py`

**Ovim se rešava:** tamni režim na 2.009 strana, mrtvo dugme za ćirilicu na 1.988 strana,
prazan list pri štampi, nevidljive poruke, i preskočeni naslovi.

**Provera posle:** `curl -s https://rimoteka.com/rime-za/ljubav/ | grep -c 'app.js'`
mora biti ≥ 1 na svakoj vrsti strane.

---

### GRUPA 2 — četiri sitne izmene, veliki efekat

**2a. K1 — tamni režim se gubi pri osvežavanju**
`public/dark-mode-init.js:4` — skripta radi u `<head>`, gde `document.body` **ne postoji**.
```js
(function(){
  try{ if(localStorage.getItem('rimoteka_dark')==='1')
    document.documentElement.classList.add('dark-mode'); }catch(e){}
})();
```
U `style.css` pravila vezati za `html.dark-mode` (ili dodati `html.dark-mode body{…}`).
> **Pažnja na opseg:** tamni režim **opstaje** pri prebacivanju tabova (strana se ne
> učitava ponovo), gubi se **samo** pri `F5` i na stranama reči. Ne prijavljivati kao
> „nikad ne radi" — vidi ispravku u `NALAZI-OTVORENI.md`.

**2b. K2 — u tamnom režimu se ne vidi šta se kuca (kontrast 1,23:1)**
Sudar specifičnosti: `.search-row input[type=text]` (0,2,1) nadjačava
`body.dark-mode input` (0,1,2), pa pozadina ostaje tvrdo `#fff`, a boja teksta ide
kroz `var(--ink)` koja se **menja sa temom**.
```css
:root            { --field-bg:#fff; }
body.dark-mode   { --field-bg:#2a2440; }
.search-row input[type=text], .search-row select { background:var(--field-bg); }
```
Pogađa `#rimeInput` i `#searchInput`. **Proveriti i ostala polja istim postupkom** —
gde god je pozadina tvrdo upisana, a boja promenljiva.

**2c. V3 — glavno dugme radi u „tihom" režimu**
`public/app.js:491` — `el('rimeBtn').onclick = doRhymes;` prosleđuje `MouseEvent` kao
prvi argument, a prvi argument je zastavica `silent`.
```js
el('rimeBtn').onclick = () => doRhymes();
```
I u samoj funkciji, radi sigurnosti: `function doRhymes(silent){ silent = silent === true; … }`
> Ovim se ujedno rešava i **V4** (pretraga ćuti na unos `a`, `123`, `😀`) i vraćaju se
> `?rec=` u URL-u i GA4 događaj `rhyme_search`.

**2d. S2 — srpska množina brojeva**
`public/app.js:1581` (beležnica) i `:742` (brojač): piše „1 reči", „2 slogova", „4 redova".
**Ispravne funkcije već postoje u istom fajlu na liniji 1755+** (`slogRec`, `stihRec`,
`rimaRec`) — samo se tu ne koriste. Dodati i `recRec()`, `znakRec()`, `redRec()` po
istom obrascu (`n%10`, `n%100`, opseg 2–4).

---

### GRUPA 3 — ono što je vlasnica prijavila

**3a. V6 — klik na rimu u beležnici ne zamenjuje reč**
`public/app.js:1779` `insertRhymeAtCaret()`. `renderNoteRhymes()` uredno nađe reč pod
kursorom (panel piše „RIME ZA NADA"), ali ubacivanje samo umetne na mesto kursora.
```
sada:  kursor usred „nada" + klik „kada" → „gde je na kadada"
treba: → „gde je kada"
```
**Popravka:** izračunati opseg reči pod kursorom (istom logikom koju koristi
`getWordAtLineCol`) i **zameniti taj opseg**.
> **Važna nijansa:** kad je kursor u praznini na kraju stiha, korisnik piše novi stih —
> tada je ubacivanje ispravno. Dakle: **zameni kad je kursor u reči ili uz nju, ubaci
> kad je u praznini.**

**3b. V7 — URL se ne menja pri prebacivanju tabova**
Svaki tab ima pravi `href` (`/slogovi/`, `/klasici/`…), ali klik je presretnut pa adresa
ostaje `/?rec=ljubav` na svih 7 tabova.
**Popravka:** pri prebacivanju taba `history.pushState` sa `href`-om tog taba; obrisati
`?rec=` kad se napušta tab sa rimama; dodati `popstate` da „Nazad" vraća tab.
> Suprotno je odluci iz jula da svaki alat dobije svoju stranu. Rešava i to što
> osvežavanje na „Klasicima" vraća na rime.

**3c. S1 — klik na logo ne resetuje stranu**
Na početnoj `.brand-logo` je `<div>` sa `cursor:pointer` — izgleda klikabilno, a nije link.
Na generisanim stranama jeste `<a class="brand" href="/">` i tamo uredno resetuje.
> ⚠️ **PRAVILO 8a — LOGO SE NE DIRA.** Umotavanje u `<a href="/">` **ne sme** promeniti
> nijedan CSS koji na logo utiče. Dodati `.brand a{color:inherit;text-decoration:none;display:block}`
> i **obavezno proveriti da provera logotipa u testu (font Fredoka, veličina) i dalje prolazi.**
> Ako postoji i najmanja sumnja — pitati vlasnicu pre izmene.

---

### GRUPA 4 — otpornost (sajt prestaje da umire)

**K4 + K5** — `public/app.js:86–88`. Tri čitanja `localStorage` stoje **pre**
`const VOWELS` (linija 90). Kad je pristup uskraćen, skripta pukne na 86, a „sigurnosna
mreža" iz `setTimeout` (linija 12) udari u `ReferenceError: Cannot access 'VOWELS'
before initialization`.
```js
function lsGet(k, d=null){ try { return localStorage.getItem(k); } catch { return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch {} }
```
Sva čitanja kroz `lsGet`, i `try/catch` oko `JSON.parse` za `rimoteka_favorites`
(pokvaren JSON i vrednost `null` oba obore sajt na 0 rima).
**Sigurnosnu mrežu premestiti ispod deklaracija** ili je učiniti otpornom na TDZ.

Uz to iz dopune audita (`AUDIT/2026-07-29-dopuna.md`):
- `loadDict` ne proverava `r.ok` → HTML strana greške postane „rečnik"
- jedan neuspeh `definicije.json` **trajno** ubija sve definicije
- dva otvorena taba gaze jedan drugom beležnicu — **pesma nestane**
- tooltip zauvek stoji na „učitavanje…" (spoljni pozivi bez timeout-a)

---

### GRUPA 5 — ćirilica (skup nalaza)

- **Kucanje kvari reč:** „надживети" → „наџивети", „инјекција" → „ињекција".
  `public/app.js:1971` radi povratni prolaz kroz latinicu na svaki otkucaj, pa se
  ćirilični par `д+ж` pročita kao digraf. Popravka: čuvari za već ćirilične `д, н, л`
  pre `toLatin()`, po istom obrascu koji `convertTextNodes` koristi za skraćenice.
- Ekran igre ostaje pola latinica (`.game-instruction`, `#gameSubmit`, `#gameFeedback`)
- Naslovi grupa, legenda i kartica sinonima ostaju latinicom (`app.js:1925` — redosled poziva)
- Bojenje rima u beležnici ne radi za ćirilične pesme (`app.js:937`)
- Kolona kursora se ne poklapa zbog `љ/њ/џ`

---

### GRUPA 6 — traži ODLUKU VLASNICE, ne raditi sam

**K3 — dečji režim propušta vulgarne reči kroz padeže.**
Izmereno: **284 propuštena oblika kod 75 blokiranih reči.** U dečjem režimu:
„krevetu" → *dupetu*, „detetom" → *dupetom*, „protestu" → *incestu* (2. mesto od 20).

Predlog: blokirati **osnove** umesto tačnih oblika, uz kratku listu izuzetaka da
*ratar* ne strada zbog *rat*. Očistiti i mrtve unose (37/47 u `BLOCKED` i 25/137 u
`KIDS_BLOCKED` su reči kojih nema u rečniku).

> **Claude priprema listu i predlog, ne briše i ne dodaje sam** (`TODO.md`, tačka 1).
> Vlasnica je izvorni govornik i konačni autoritet.
>
> **LISTA JE VEĆ SPREMNA: `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`** — čeka odluku vlasnice.
> U njoj je i hitan nalaz: **`BLOCKED` sada pogrešno filtrira sedam običnih reči**,
> među njima **„pisao"** — na sajtu za pisanje pesama, i to uvek, ne samo u dečjem režimu.
> Taj deo (Odeljak 1) je jedini hitan i može se raditi čim vlasnica potvrdi.

Uz to: `/rime-za-decu/` tvrdi da su rezultati **uvek** filtrirani, a dečji režim je
podrazumevano **isključen** — ili promeniti tekst, ili uključiti režim na toj strani.

---

### GRUPA 7 — performanse i ostalo (kad gore bude gotovo)

- **V5:** na 4G rime prorade tek posle **10,3 s**. Najjeftinije prvo: stanje „učitavam"
  na dugmetu koje zapamti unos i samo pokrene pretragu kad rečnik stigne.
  Trajno rešenje: unapred izračunat indeks rima pri buildu.
- `logo-icon.png` je **298 KB (512×512), a prikazuje se na 46×46 px**
- obrada `reci.txt` zamrzava glavnu nit **824 ms u jednom komadu**
- `definicije.json` (5,3 MB gzip) kreće ~4 ms posle `reci.txt`
- **~50.000 parametarskih URL-ova `/?rec=`** koji su duplikat početne
- 222 strane bez ijednog internog linka; `/rime-za/` vraća 403
- 108 SERP naslova sa pogrešnom množinom („51 reči koje se rimuju")
- `<title>` generisanih strana padežno pogrešan: „Rime za nada" umesto „Rime za nadu"
- `aria-live` na rezultatima; prava dugmad umesto `<span onclick>`
- 404 strana: zastareo CSS `?v=20260715b`, nema polja za pretragu
- `http://` vraća 302 umesto 301

---

## 3. RUPE U TESTU KOJE TREBA ZATVORITI

Test prolazi **140/140**, a nalaza ima **72**. Zato uz popravke **obavezno** dodati:

| Nova provera | Hvata |
|---|---|
| bar jedna `/rime-za/[reč]/` strana | K6, V1, V2, N9 |
| `F5` sa uključenim tamnim režimom | K1 |
| **kucanje** u polje u tamnom režimu (kontrast) | K2 |
| klik na dugme naspram tastera `Enter` | V3, V4 |
| klik na rimu kad je kursor **usred reči** | V6 |
| menja li se URL pri prebacivanju tabova | V7 |
| klik na logo posle pretrage | S1 |
| zabranjen i pokvaren `localStorage` | K4, K5 |
| padeži blokiranih reči u dečjem režimu | K3 |
| štampa i toast na podstranama | S5, S6 |
| prelazak na drugi tab dok igra traje | S7 |
| kucanje ćirilicom („надживети") | ćirilica |

---

## 4. KAD ZAVRŠIŠ

1. Ažuriraj `AUDIT/NALAZI-OTVORENI.md` — **obriši popravljeno**, ostavi ostalo.
2. Ako otkriješ sopstveni propust — upiši u `AUDIT/PROPUSTI.md` sa uzrokom i pravilom.
3. Dopuni `HANDOVER.md` novim unosom na vrhu.
4. Pokreni test lokalno pa protiv produkcije.
5. Javi vlasnici koliko je nalaza zatvoreno i kolika je nova ocena.

**Sledeći puni audit: 31.07.2026.** — po `/Users/jovana.jovic/AUDIT-PROTOKOL.md`,
u `AUDIT/2026-07-31-audit.md`.

---

## 5. NAJVAŽNIJE ŠTO TREBA DA ZNAŠ

**Test od 140 provera je prolazio 140/140 dok je sajt imao 72 nalaza.** Razlog:
obilazio je 7 od 2.010 strana i proveravao **da element postoji**, ne **da radi**.

Tri baga je našla vlasnica, a nije nijedan od 39 agenata — jer sva tri traže da se sa
alatom **zaista radi**: da se kuca u polje dok je tamni režim uključen, da se klikne
usred reči, da se pogleda adresa dok se šeta po tabovima.

**Zato: posle svake popravke otvori sajt i uradi to rukama.** Automatski test je
neophodan, ali nije dovoljan.
