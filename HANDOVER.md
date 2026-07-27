# Handover — Rimoteka (sesija 26–27. jul 2026)

> Prethodni handover (26.07. u 03:00) upozoravao je da je sajt „možda pokvaren".
> **Bio je pokvaren. Sada radi.** Uzrok je nađen, popravljen i pokriven testom.

---

## STANJE SAJTA

**Produkcija radi.** `https://rimoteka.com` — rime rade, svih 7 tabova radi,
konzola bez grešaka. **84 provere prolaze** i lokalno i protiv produkcije.

**Pre bilo kakvog deploy-a:**

```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
node test/predeploy.mjs                              # lokalno
BASE=https://rimoteka.com node test/predeploy.mjs    # posle deploy-a
```

Deploy je dozvoljen **samo** ako ispiše „Sme deploy". **Test se pokreće i posle
deploy-a protiv produkcije** — lokalno prošlo ne znači da je deploy prošao. To
se već pokazalo tačnim: prvo pokretanje protiv produkcije je palo.

---

## 1. ŠTA JE OBORILO SAJT

**Uzrok:** Pro dugme je bilo zakomentarisano u `index.html`, a `app.js` je i
dalje radio `proToggle.onclick = ...`. To je na top-levelu bacilo `TypeError`
koji je prekinuo izvršavanje **cele skripte pre `loadDict()`** na kraju fajla.
`WORDS` prazan, večno „Učitavam rečnik…", mrtvo dugme „Nađi rime", mrtva igra,
mrtvi tabovi. **Jedna greška = ceo sajt.**

**Popravke:**
- **Sigurnosna mreža** — `bootstrap()` se poziva i iz `setTimeout` na vrhu
  fajla, pa se rečnik učita i kad skripta pukne. Testirano namernim fatalnim
  crashom na istom mestu.
- **`el(id)`** — vraća pravi element ili bezopasan prazan objekat.
  **VAŽNO:** `el()` nikad ne vraća `null`, pa se **ne sme** koristiti tamo gde
  `if (element)` odlučuje *da li* se nešto radi (Pro tok, predaja igrača, tamni
  režim) — tamo ostaje `getElementById`.
- **`loadExtras`** — `Math.max(...Object.values(freqRes))` sa 435.000
  argumenata je obarao stek i tiho gasio i rangiranje i sinonime. Zamenjeno
  petljom. **Sinonimi i frekvencija su time proradili prvi put.**
- **Apsolutne putanje** — `fetch('reci.txt')` je sa `/rimovanje-reci/` tražio
  `/rimovanje-reci/reci.txt`.
- **`/api/status`** se više ne zove kad je Pro sakriven (bio 404 na svakoj poseti).

---

## 2. KEŠ — zašto je korisnicima ostajala pokvarena verzija

Tri uzroka. **Ne vraćati ništa od ovoga:**

1. **HTML nikad cache-first.** `sw.js` je imao `/` i `/index.html` u `ASSETS`.
2. **Bez velikih fajlova u precache.** `cache.addAll` je skidao
   `definicije.json` (20 MB); pošto je sve-ili-ništa, jedan neuspeh je obarao
   instalaciju SW-a i **stari keš se nikad nije brisao**.
3. **`sw.js` i `sw-register.js` su `no-store`** u `nginx.conf`, iznad pravila za
   `.js`. Bili su keširani 7 dana — a `sw.js` je prekidač za sve ostale keševe.

**Osvežavanje radi service worker sam** (`client.navigate()` u `activate`), ne
skripta na strani — zaglavljen korisnik učitava stari `index.html`, pa i staru
verziju te skripte.

**Na `localhost` nema service workera** — ne registruje se, a postojeći se
odjavljuje i keš mu se briše. *(Ovo je bilo pravi problem: vlasnica je dva puta
prijavila da „ništa ne radi na lokalu", a radilo je — gledala je keš.)*

**Poslednja linija odbrane:** ako rečnik ipak ne uspe, korisnik dobija dugme
„Očisti i probaj ponovo" umesto mrtve strane.

---

## 3. ŠTA JE URAĐENO NA SAJTU

- **Legenda ispod pretrage** — objašnjava `2` (slogovi), `ⓘ` (značenje), `♡`
  (Omiljene), `🔁` (nađi rime), i da se klikom na reč kopira. Nastala jer je
  vlasnica na telefonu videla „usvajanje (4)" i tri sitne ikonice bez ijednog
  objašnjenja; na telefonu nema prelaska mišem pa `title` ne pomaže.
- **Sinonimi u zasebnoj kartici** — mint akcent, odmah ispod „Najbolje rime".
  Ranije na dnu ispod stotinu rima, praktično nevidljivi.
- **Dizajn igre** — sedam klasa iz HTML-a (`game-word-box`, `game-word`,
  `game-input-row`, `game-feedback`, `game-label`, `game-value`, `game-combo`)
  **nije imalo nijednu liniju CSS-a**. Dodato: reč u gradijentu, tajmer kao
  prsten, bedž „🔥 N u nizu", animacije, obojena dugmad.
- **Ekran za predaju igrača** — igra staje između igrača. Ranije je drugom
  igraču vreme otkucavalo dok je uređaj bio u prvoj ruci. Uz to sređena i trka
  zakazanih prelaza (`gameState`).
- **Živi alat na `/rimovanje-reci/`** — rimuje na mestu. Koristi **isti
  `app.js`**, namerno, da se dva algoritma nikad ne raziđu.
- **Jedan `h1` po strani** — logo je bio `h1` na svakoj strani uz pravi naslov.
- **Kockica i igra** biraju iz 8.000 najčešćih reči (davalo je „praotaca").
- **Ispravljena netačna tvrdnja** na početnoj: „preko 340.000 reči sa
  objašnjenjima" → stvarno ih je 282.900.
- **SEO:** nova strana `/rimovanje-reci/` (exact-match slug), istaknute
  prednosti (definicije, sinonimi, bliske rime, brojač slogova i karaktera,
  igra), link u footeru svih 1.988 strana, IndexNow ping.

### Novo rangiranje rima (27.07.)
**„Najbolje rime" = reči sa istim brojem slogova** kao tražena reč.
Ranije je merilo bilo „više zajedničkih slova", pa su za „rima" u vrh ulazili
`stvarima`, `centrima`, `dobrima` — gde je zajedničko `rima` **nenaglašeno** —
a `štima` je padalo na **111. mesto**. Sada je na 22, a prvih 15 su sve
dvosložne. Detalji u poglavlju 6.

---

## 4. PRAVILA UVEDENA U OVOJ SESIJI (ne kršiti)

| Pravilo | Gde je zapisano |
|---|---|
| **Obavezan test pre svakog deploy-a** — 84 provere u pravom Chromiumu; kad se doda funkcija, dodaje se i provera | `CLAUDE.md` 9a |
| **Logo se ne dira** — nije `h1`, pa mu `font-family: Fredoka` mora biti eksplicitan; bez toga tiho padne na Quicksand | `CLAUDE.md` 8a |
| **Izvor istine je zvanična literatura, ne naš rečnik** — `reci.txt` i `definicije.json` su predmet provere, ne merilo; zabranjeno nagađanje | `CLAUDE.md` 0, gramatika 3b |
| **Isti broj slogova = najbolja rima** — ne vraćati staro pravilo | `CLAUDE.md` 6.2a, gramatika 7a |
| **Izveštaji vlasnici idu u TABELI**, ne u rečenicama | gramatika 9b |

---

## 5. GRAMATIKA — `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`

**Obavezno pročitati pre bilo kakvog rada sa rečnikom.**

Središnje pravilo: **glagol ima dve osnove** — infinitivnu i prezentsku — i
jedna se ne izvodi iz druge (*pisati → pišem*, *šaptati → šapćem*,
*dreždati → dreždim*). Odatle su došle skoro sve greške.

Sadrži: vrste reči i zamke homografa; imenice (rod, broj, padež, tri
deklinacije, glasovne promene); pridevi; glagoli (lični/nelični oblici, vid,
obrasci prezenta); glasovne promene; slogovi i slogotvorno `r`; akcenat i veza
sa kvalitetom rime; pravopis; operativna pravila.

- **Poglavlje 7a** — pravilo o rangiranju rima
- **Poglavlje 9a** — izmereno stanje rečnika
- **Poglavlje 9b** — **13 grešaka** koje je moj kod napravio, svaka sa uzrokom
  i pravilom
- **Poglavlje 10** — **dnevnik ispravki vlasnice**, najpouzdaniji deo dokumenta

---

## 6. REČNIK — šta je urađeno

### Dodato (uz odobrenje vlasnice)
- **40 oblika** za `brst` / `brstiti` / `obrstiti` / `njakati`
- **`brstenje`** (nije `brštenje` — jotovanje se ne primenjuje mehanički)
- **13 oblika glagola `štimati`** — reč iz slogana sajta („rimovanje za lakše
  štimovanje") **nije bila u `reci.txt`** pa nije mogla da se rimuje.
  Zanimljivo: `štimati` je **imao objašnjenje** u `definicije.json` a reči nije
  bilo u `reci.txt`.

### Sklonjeno
- `njakam`, `njakaš`, `njakamo`, `njakate`, `njakaju`, `njakaj`, `njakajte`,
  `njaka` — vlasnica potvrdila da ne postoje. Glagol *njakati* ima samo
  palatalizovani prezent: *njačem, njačeš, njače, njačemo, njačete, njaču*.

### Ispravljena objašnjenja
- **`slik`** — pisalo je samo „nadimak; sjajan sloj (engleski slick)". Rečnik
  Matice srpske potvrđuje da su **`slik` i `srok` srpski književni termini za
  rimu** („слик (срок, рима) књиж."). Sinonimi za „rima" su bili tačni —
  greška je bila u našem objašnjenju.
- **`aminati`** postoji i ostaje; značenja razdvojena: *aminati* = izgovarati
  reč amin, *aminovati* = složiti se s tuđim mišljenjem.

### Izmereno stanje
- **Glagoli:** od 6.120 potvrđenih, **1.827 ima krnju paradigmu**
- **Imenice:** 23.907 prepoznato; prosečno **fali oko polovine padeža**
  (muški 4,8/9, ženski 3,9/9, srednji 3,3/7)

---

## 7. IZVORI — `IZVORI-RECNIKA.md`

### Rečnik srpskoga jezika, Matica srpska (2011)
https://archive.org/details/recnik-srpskoga-jezika-2011

- **Odrednice se čitaju TAČNO** — 56% izvučenih poklopilo se sa rečima koje već
  imamo, što je nezavisna potvrda
- **Objašnjenja su POKVARENA** — kurzivno `т` → `ш`, `г` → `ћ` (*вазауха*,
  *шихи шум*, *нарочишим*). Zato objašnjenja **pišemo sami**, samo proveravamo
  da znače isto
- **Oznake `покр.` / `заст.` / `дијал.` se NE MOGU pročitati** — 0, 3 i 1
  čitljiva pojava u celom rečniku. **Pokrajinsko i zastarelo se iz tog izvora
  ne može automatski izbaciti**

### srLex 1.3 — NIJE MERODAVAN
6.905.941 oblik, 169.328 lema. Pet razloga zašto se ne sme uzeti kao autoritet:

1. **sadrži hrvatske reči** — izmereno: `kolodvor`, `zrakoplov`, `nogomet`,
   `glazba`, `tvrtka`, `tisuća`, `shvaćanje`
2. **sadrži pokrajinske, žargonske i zastarele** jednako kao standardne
3. **nema nijednu normativnu oznaku** — nigde ne piše da li je reč standardna
4. **38% su vlastita imena** iz veba
5. **glagola ima samo 9.653 leme** — malo za srpski

Sme se koristiti za frekvencije, kao **drugi izvor koji potvrđuje postojanje
oblika**, i za gramatičke oznake **kao trag** — nikad kao dokaz.

### Prepoznavanje hrvatskog
Reč se meri u **oba korpusa** (srpskom i hrvatskom), učestalost se normalizuje
po veličini (hrvatski je oko 1,4× veći), i ono što je bar **tri puta češće u
hrvatskom uz bar 300 pojava tamo** označava se kao hrvatsko.

**Prag od 300 je nužan** — bez njega su `agrotehničar` (6 pojava), `aritmetičar`
(1) i `ekskavator` (3) ispadali „hrvatski".

**Filter nije savršen** — označio je i `sedamdesetak` i `sranje`, obične srpske
reči koje su samo češće u hrvatskom veb tekstu.

### Naš `frekvencija.json` je bio pokvaren — DVA razloga
1. **Prepisivanje umesto sabiranja.** Isti oblik se u izvoru pojavljuje više
   puta sa različitim oznakama (`voda` je i *voda* i genitiv množine od *vod*).
   **110.931 od 208.700 reči ima pogrešan broj** — `koji` 5 umesto 2.805.274,
   `kao` 49 umesto 2.091.751, `dva` 9 umesto 344.730, `voda` 876 umesto 47.298.
2. **Filtriran je na naš rečnik** — sadrži nula reči kojih nema u `reci.txt`,
   pa **ne može da potvrdi nijednu novu reč**.

> Druga greška je dovela do pogrešnog zaključka: test „ima li srLex hrvatske
> reči" davao je „nema", a zapravo je merio naš sopstveni rečnik.

**Ispravan fajl je napravljen, NIJE postavljen.**

---

## 8. ČEKA ODLUKU VLASNICE

1. **`RECNIK-NOVE-RECI.md`** — 5.459 reči iz Rečnika Matice srpske kojih nemamo:
   - **A1 preporučene (1.140)** — u dva izvora, nisu označene kao hrvatske
   - A2 označene kao hrvatske (135) — proveriti, ima grešaka
   - B samo u Rečniku MS (4.184) — nisu proverene ni na hrvatsko
2. **Ispravan `frekvencija.json`** — ne dodaje nijednu reč, samo ispravlja
   redosled rima
3. **Presuda o pokrajinskom i zastarelom** — nijedan izvor koji imamo to ne zna

### Zamrznuto
- `RECNIK-PREDLOG.md` — 13.827 oblika za glagole
- `RECNIK-PREDLOG-SREDNJI-ROD.md` — 1.058 padeža za imenice srednjeg roda

Zamrznuto na zahtev vlasnice: nema smisla dopunjavati rečnik dok se ne zna šta
u njemu već ne valja. Vidi `TODO-RECNIK.md`.

---

## 9. ZAMKE ZA SLEDEĆU SESIJU

**Dve sesije u istom folderu se gaze.** Druga sesija je dva puta vratila
`app.js`, `style.css` i `index.html` na poslednji commit i pojela gotov posao.
Proveriti `git status` pre i posle svake veće izmene.

**Lokalni server iz mojih komandi vlasnica ne vidi.** Komande se izvršavaju u
izolovanom okruženju sa svojom mrežom. Ako treba da pregleda lokalno, server
mora ona da pokrene (`! python3 -m http.server 8765` iz `public/`).

**`gen_pages.py` briše `public/rime-za/`** pre generisanja. Ako neko čita iz tog
foldera, `rmtree` pukne i ostavi ga pola obrisanog. Sada ima zaštitu, ali pre
pokretanja: `pkill -f http.server`.

**Test ne sme string-evaluaciju** — sajtov CSP zabranjuje `eval`, pa je test
prijavljivao lažnu grešku koju sajt nije pravio.

**Pri prvoj poseti SW osveži stranu** i testu obriše kontekst — zato test
čekanje na rečnik ponavlja do 3 puta.

**`clarin.si` je spor** — treba 240s timeout i pokretanje van izolovanog
okruženja.

---

## 10. ŠTA BIH SLEDEĆE PREDLOŽIO

1. **Postaviti ispravan `frekvencija.json`** — jedina merljiva greška koja
   *sada* kvari sajt; 110.931 reč je rangirana po pogrešnom broju
2. **Pregled grupe A1** iz `RECNIK-NOVE-RECI.md` — 1.140 reči, najveći dobitak
   uz najmanji rizik
3. **Izdići definicije** u rezultatima, kao što su izdignuti sinonimi — 282.900
   objašnjenja se vidi samo klikom na sitnu ikonicu, a to je prednost koju
   konkurencija nema
4. **GSC** — pozicija za „rimovanje reči" bila je 4,4 dana 24.07.; podaci za
   dane kad je sajt bio pokvaren stižu sa zakašnjenjem

---

## 11. ŠTA JE OVA SESIJA NAUČILA

**Skoro svaka moja veća greška došla je iz nagađanja**, ne iz neznanja o kodu:
`njakam`, `bankomam`, `akrobaša`, `prošaptam`, `dreždam`, `telesu`, `čudesu`,
`nebima`, `finalem`, `morimu`, `bannem`, `brštenje`.

Sve ih je uhvatila ili vlasnica ili kontrola na rečima gde se odgovor zna
unapred. **Nijedna nije ušla u rečnik.**

Zato su pravila o **zvaničnoj literaturi kao jedinom izvoru** i o **tabelarnim
izveštajima** važnija od bilo koje pojedinačne popravke — ona sprečavaju klasu
grešaka, ne jednu grešku.

Drugi nauk: **dva izvora štite samo od one greške koju ne dele.** Grupu A sam
označio kao „potvrđena u dva izvora" i time joj dao lažno poverenje — a oba
izvora sadrže hrvatski, pa protiv hrvatskog nisu štitila nimalo. Vlasnica je to
odmah videla po rečima `val` i `šalica`.

---

*Poslednje ažuriranje: 27. jul 2026.*
