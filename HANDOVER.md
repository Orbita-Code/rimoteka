# Handover — Rimoteka (27. jul 2026)

> Prethodni handover (26.07. u 03:00) upozoravao je da je sajt „možda pokvaren".
> **Bio je pokvaren. Sada radi.** Uzrok je nađen, popravljen i pokriven testom.

---

## STANJE SAJTA

**Produkcija radi.** `https://rimoteka.com` — HTTP 200, rime rade, svih 7 tabova
radi, konzola bez grešaka.

**Pre bilo kakvog deploy-a pokrenuti:**

```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
node test/predeploy.mjs                              # lokalno
BASE=https://rimoteka.com node test/predeploy.mjs    # posle deploy-a
```

Deploy je dozvoljen **samo** ako ispiše „Sme deploy". Detalji u `CLAUDE.md`,
sekcija 9a. **Test se pokreće i posle deploy-a protiv produkcije** — lokalno
prošlo ne znači da je deploy prošao (to se već pokazalo tačnim).

---

## 1. ŠTO JE OBORILO SAJT I KAKO JE POPRAVLJENO

**Uzrok:** Pro dugme je bilo zakomentarisano u `index.html`, a `app.js` je i
dalje radio `proToggle.onclick = ...`. To je na top-levelu bacilo `TypeError`
koji je prekinuo izvršavanje **cele skripte pre `loadDict()`** na kraju fajla.
Posledica: `WORDS` prazan, večno „Učitavam rečnik…", mrtvo dugme „Nađi rime",
mrtva igra, mrtvi tabovi. **Jedna greška = ceo sajt.**

**Popravke:**
- **Sigurnosna mreža** — `bootstrap()` se poziva i iz `setTimeout` na vrhu
  fajla, pa se rečnik učita i kad skripta pukne. Testirano namernim fatalnim
  crashom na istom mestu.
- **`el(id)`** — vraća pravi element ili bezopasan prazan objekat. Nedostajući
  element više ne obara aplikaciju. **VAŽNO:** `el()` nikad ne vraća `null`, pa
  se ne sme koristiti tamo gde `if (element)` odlučuje *da li* se nešto radi
  (Pro tok, predaja igrača, tamni režim) — tamo ostaje `getElementById`.
- **`loadExtras`** — `Math.max(...Object.values(freqRes))` sa 435.000 argumenata
  je obarao stek i tiho gasio i rangiranje i sinonime. Zamenjeno petljom.
  **Sinonimi i frekvencija su time proradili prvi put.**
- **Apsolutne putanje** — `fetch('reci.txt')` je sa `/rimovanje-reci/` tražio
  `/rimovanje-reci/reci.txt`. Sve putanje rečnika su sada apsolutne.

---

## 2. KEŠ — zašto je korisnicima ostajala pokvarena verzija

Tri uzroka, sva popravljena. **Ne vraćati ništa od ovoga:**

1. **HTML nikad cache-first.** `sw.js` je imao `/` i `/index.html` u `ASSETS` i
   servirao ih iz keša, pa je pokvarena verzija ostajala i posle popravke.
2. **Bez velikih fajlova u precache.** `cache.addAll` je skidao
   `definicije.json` (20 MB); pošto je sve-ili-ništa, jedan neuspeh je obarao
   instalaciju SW-a, novi SW se nije aktivirao i **stari keš se nikad nije
   brisao**.
3. **`sw.js` i `sw-register.js` moraju biti `no-store`** u `nginx.conf`, iznad
   pravila za `.js`. Bili su keširani 7 dana — a `sw.js` je prekidač za sve
   ostale keševe.

**Osvežavanje radi service worker sam** (`client.navigate()` u `activate`), ne
skripta na strani — jer zaglavljen korisnik učitava stari `index.html`, pa i
staru verziju te skripte. Radi samo kad zamenjuje stariju verziju.

**Na `localhost` nema service workera.** Ne registruje se, a postojeći se
odjavljuje i keš mu se briše. Lokalni pregled više ne može da pokaže staru
verziju. *(Ovo je bilo pravi problem — vlasnica je dva puta prijavila da „ništa
ne radi na lokalu", a radilo je; gledala je keširanu verziju.)*

**Poslednja linija odbrane:** ako rečnik ipak ne uspe, korisnik dobija dugme
„Očisti i probaj ponovo" umesto mrtve strane.

---

## 3. ŠTA JE URAĐENO NA SAJTU

- **Legenda ispod pretrage** — objašnjava `2` (broj slogova), `ⓘ` (značenje
  reči), `♡` (Omiljene), `🔁` (nađi rime za tu reč) i da se klikom na reč
  kopira. Nastala jer je vlasnica na telefonu videla „usvajanje (4)" i tri
  sitne ikonice bez ijednog objašnjenja. Na telefonu nema prelaska mišem, pa
  `title` atributi ne pomažu.
- **Sinonimi u zasebnoj kartici** — mint akcent, odmah ispod „Najbolje rime".
  Ranije su bili na dnu ispod stotinu rima i praktično se nisu videli.
- **Dizajn igre** — sedam klasa iz HTML-a (`game-word-box`, `game-word`,
  `game-input-row`, `game-feedback`, `game-label`, `game-value`, `game-combo`)
  **nije imalo nijednu liniju CSS-a**. Dodato: reč u gradijentu, tajmer kao
  prsten, bedž „🔥 N u nizu", animacije, obojena dugmad.
- **Ekran za predaju igrača** — igra staje između igrača i čeka klik. Ranije je
  drugom igraču vreme već otkucavalo dok je uređaj bio u prvoj ruci.
- **Živi alat na `/rimovanje-reci/`** — rimuje na mestu umesto da šalje na
  početnu. Koristi **isti `app.js`**, namerno, da se dva algoritma nikad ne
  raziđu.
- **Jedan `h1` po strani** — logo je bio `h1` na svakoj strani uz pravi naslov.
- **Kockica i igra** biraju iz 8.000 najčešćih reči (davalo je „praotaca").
- **Ispravljena netačna tvrdnja** na početnoj: pisalo „preko 340.000 reči sa
  objašnjenjima", a ima ih 282.888.

---

## 4. PRAVILA UVEDENA U OVOJ SESIJI (ne kršiti)

### Obavezan test pre svakog deploy-a
`test/predeploy.mjs` — 76 provera u pravom Chromiumu. Detalji: `CLAUDE.md` 9a.
**Kad se doda nova funkcija, dodaje se i provera za nju.**

### Logo se ne dira
`CLAUDE.md` 8a. Logo **nije** `h1`, pa mu `font-family: Fredoka` mora biti
eksplicitno naveden — bez toga tiho padne na Quicksand i deluje manji.
Test pada ako se logo promeni.

### Izvor istine je zvanična literatura, ne naš rečnik
`CLAUDE.md` pravilo 0, `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md` pravilo 3b.
`reci.txt` i `definicije.json` su **predmet provere, ne merilo**. Zabranjeno
nagađanje i zaključivanje „po analogiji". Frekvencija služi samo za redosled
pregleda, nikad kao dokaz ispravnosti.

### Izveštaji vlasnici idu u TABELI, ne u rečenicama
Vlasnica je odustala od pregleda usred liste pisane u rečenicama. Čim je
napravljena tabela, na prvi pogled su se videle greške (`telesu`, `čudesu`).

---

## 5. GRAMATIKA — `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`

**Obavezno pročitati pre bilo kakvog rada sa rečnikom.** Nastao posle serije
grešaka u kojima je generator predlagao oblike kojih u srpskom nema.

Središnje pravilo: **glagol ima dve osnove** — infinitivnu i prezentsku — i
jedna se ne izvodi iz druge (*pisati → pišem*, *šaptati → šapćem*,
*dreždati → dreždim*). Odatle i sve greške.

U poglavlju 9b je **13 grešaka** koje je moj kod napravio, svaka sa uzrokom i
pravilom. U poglavlju 10 je **dnevnik ispravki vlasnice** — najpouzdaniji deo
dokumenta.

---

## 6. REČNIK — šta je urađeno i šta čeka

### Urađeno
- Dodato 40 oblika za `brst` / `brstiti` / `obrstiti` / `njakati`, svaki sa
  objašnjenjem.
- Sklonjeni nepostojeći oblici: `njakam`, `njakaš`, `njakamo`, `njakate`,
  `njakaju`, `njakaj`, `njakajte`, `njaka`.
- Dodato `brstenje` (nije `brštenje` — jotovanje se ne primenjuje mehanički).
- `aminati` **postoji** i ostaje; značenja razdvojena od `aminovati`.

### Čeka odluku vlasnice
- **`RECNIK-NOVE-RECI.md`** — 5.459 reči iz Rečnika Matice srpske kojih nemamo.
  Grupa A (1.275) potvrđena u dva izvora, grupa B (4.184) samo u RMS.
  **Nisu prosejane** od pokrajinskih, zastarelih i hrvatskih — te oznake su u
  kurzivu koji je OCR uništio.
- **Ispravan `frekvencija.json`** — napravljen, nije postavljen. Ne dodaje
  nijednu reč, samo ispravlja redosled rima. **110.931 od 208.700 reči ima
  pogrešan broj** (`koji` 5 umesto 2.805.274; `voda` 876 umesto 47.298).
- **Presuda o spornim rečima** — da li je reč pokrajinska, zastarela ili
  hrvatska ne može da odluči nijedan izvor koji imamo. To je na vlasnici.

### Zamrznuto
- `RECNIK-PREDLOG.md` — 13.827 oblika za glagole
- `RECNIK-PREDLOG-SREDNJI-ROD.md` — 1.058 padeža za imenice srednjeg roda

Zamrznuto na zahtev vlasnice: nema smisla dopunjavati rečnik dok se ne zna šta
u njemu već ne valja. Vidi `TODO-RECNIK.md`.

---

## 7. IZVORI — `IZVORI-RECNIKA.md`

Sve provereno o Rečniku Matice srpske i o srLex-u, sa merenjima. Najvažnije:

- **Rečnik Matice srpske (2011)** — glavni izvor, digitalno izdanje:
  https://archive.org/details/recnik-srpskoga-jezika-2011
  **Odrednice** se čitaju **tačno** (56% izvučenih poklopilo se sa onim što već
  imamo), ali **objašnjenja su pokvarena** (kurzivno `т` → `ш`, `г` → `ћ`) —
  zato objašnjenja pišemo sami.
- **Oznake `покр.` / `заст.` / `дијал.` se ne mogu pročitati** — 0, 3 i 1
  čitljiva pojava u celom rečniku. **Pokrajinsko i hrvatsko se iz tog izvora ne
  može automatski izbaciti.**
- **srLex NIJE merodavan.** Sadrži hrvatske reči (izmereno: `kolodvor`,
  `zrakoplov`, `nogomet`, `glazba`, `tvrtka`, `tisuća`, `shvaćanje` — sve su u
  njemu), pokrajinske i zastarele jednako kao standardne, i **nema nijednu
  normativnu oznaku** — nigde ne piše da li je reč standardna ili nije. Uz to
  38% su vlastita imena, a glagola ima samo 9.653 leme. Sme se koristiti za
  frekvencije i kao *drugi* izvor koji potvrđuje postojanje oblika, **nikad kao
  dokaz da je reč pravilan srpski**.
- **Nijedan izvor koji imamo ne odgovara** da li je reč pokrajinska ili
  hrvatska. To ostaje na vlasnici.

---

## 8. ZAMKE ZA SLEDEĆU SESIJU

**Dve sesije u istom folderu se gaze.** Tokom rada je druga sesija dva puta
vratila `app.js`, `style.css` i `index.html` na poslednji commit i pojela
gotov posao. Ako se radi paralelno — proveriti `git status` pre i posle svake
veće izmene.

**Lokalni server iz mojih komandi korisnica ne vidi.** Komande se izvršavaju u
izolovanom okruženju sa svojom mrežom. Ako treba da vlasnica pregleda lokalno,
server mora ona da pokrene (`! python3 -m http.server 8765` iz `public/`).

**`gen_pages.py` briše `public/rime-za/`** pre generisanja. Ako neko čita iz
tog foldera (lokalni server), `rmtree` pukne i ostavi ga pola obrisanog. Sada
ima zaštitu, ali pre pokretanja ugasiti server: `pkill -f http.server`.

**Test ne sme da koristi string-evaluaciju.** Sajtov CSP zabranjuje `eval`, pa
je test prijavljivao lažnu grešku koju sajt nije pravio.

**Pri prvoj poseti SW osveži stranu** i testu obriše kontekst. Zato test
čekanje na rečnik ponavlja do 3 puta.

---

## 9. ŠTA BIH SLEDEĆE PREDLOŽIO

1. **Postaviti ispravan `frekvencija.json`** — jedina merljiva greška koja
   *sada* kvari sajt. Rangiranje rima je pogrešno za 110.931 reč.
2. **Pregled grupe A** iz `RECNIK-NOVE-RECI.md` (1.275 reči, potvrđene u dva
   izvora) — najveći dobitak uz najmanji rizik.
3. **Definicije izdići u rezultatima**, kao što su sinonimi izdignuti. 282.888
   objašnjenja se sada vide samo klikom na sitnu ikonicu, a to je prednost koju
   konkurencija nema.
4. **GSC** — proveriti poziciju za „rimovanje reči" (24.07. bila 4,4; podaci za
   dane kad je sajt bio pokvaren stižu sa zakašnjenjem).

---

*Poslednje ažuriranje: 27. jul 2026.*
