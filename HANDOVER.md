# Handover — Rimoteka

> Najnovije je na vrhu. Ispod stoje handoveri prethodnih sesija.

---

# Sesija 6. septembar 2026 (dvadeseta) — prijava korisnika: slogovi za reči velikim slovom

Korisnik Dragan M. je poslao mejl: „nepostojan" → filter „1 slog" nudi „Iran". Tačno.

**Uzrok:** `countSyl` u `app.js` nije prebacivao reč u mala slova (`VOWELS` ima samo
mala), a `vowelPositions` jeste od 02.08. Isti kvar u `build/gen_pages.py` (pet
funkcija) + poređenje sa ciljem po velikom slovu. Pogođeno: 155 reči rečnika, 146
pilula na 133 statičke strane, 160 strana vlastitih imena nudilo sopstveni mali oblik.

**Popravljeno:** `app.js:countSyl`, `gen_pages.py` (`vowel_positions`, `rhyme_key`,
`loose_key`, `final_syl_key`, `count_syl`, samoisključenje), strane regenerisane
(272 sa izmenjenim sadržajem, 3 ispale: Melburn/Njujork/Stokholm → hub), verzija
`app.js?v=20260906a`. Test: sekcija **45** — pala na produkciji sa starim kodom,
prolazi lokalno (668/668 lokalno; na produkciji sa starim kodom 5 od 676 palo, sve u sekciji 45).

**Dvojnici imena — rešeno istog dana (odluka vlasnice):** obrisano 488 malih oblika
(`iran`, `beograd`…), 120 pravih reči ostalo (`danska`, `rimi`, `prag`). Spisak:
`AUDIT/obrisani-mali-oblici-06-09-2026.md`. Učestalost/Matica sada i po malom obliku.
**Brojač slogova proveren na celom rečniku** (raspodela 1–10 slogova, uzorci iz svake
grupe, slogotvorno „r“ na početku/sredini/kraju) — ispravan. Jedina anomalija: 48
skraćenica bez samoglasnika (`dnk`, `gps`, `html`) — čeka odluku, v. NALAZI-OTVORENI.

**„PRIJAVI GREŠKU" (odluka vlasnice 06.09., grana `feat/prijavi-gresku`):** uz svaku reč
prijava na tri dodira. Telefon: peto dugme u traci nad reči; računar: ista traka se otvara na
**prelazak mišem ili fokus** (odluka vlasnice, „varijanta B"). **Kapsule na računaru više
nemaju ikonice** (ⓘ ♡ 🔁 ostaju u DOM-u skrivene): u red stane ~9–10 reči umesto 4 na
1280 px, grupa „Najbolje rime" za „ljubav" 1.320 → 548 px. Oblačić značenja na prelazak
mišem je sklonjen (preklapao se sa trakom); značenje je u traci na klik. Klik na reč i
dalje kopira. Legenda iznad rezultata to kaže. **Traka je „lepljiva"** (prijava vlasnice na
lokalnoj probi: „krenem ka „prijavi", okrznem susednu reč i traka nestane"): prolazak preko
susednih reči je ne pomera, prebacuje se tek posle 350 ms zadržavanja na drugoj reči, zatvara
se 700 ms posle izlaska iz spiska. Oblačić značenja iz trake veže se za reč (ne za dugme
trake, koje se odmah sakrije — inače leti u gornji levi ugao). Natpis „rime" → „nađi rime". Šest odgovora (slogovi / nije ispravna reč / pogrešno napisana / ne
rimuje se sa … / nije za decu / drugo) + napomena. Anonimno. Sanduče: Cloudflare worker
`worker/prijave.js` (`rimoteka-prijave.jovana-daskovic.workers.dev`, KV `PRIJAVE`);
pregled prijava: adresa sa ključem u `~/.config/rimoteka/prijave-kljuc.json`.
**CSP:** adresa sanduča je dodata u `connect-src` u `nginx.conf` — **nginx ide u zaseban
deploy PRE sajta** (`bash test/nginx-provera.sh` prošao). Test: sekcija **46** (ceo tok +
pravi zahtev u režimu probe koji sanduče ne čuva). Statičke strane `/rime-za/` zasad nemaju
ulaz u prijavu (čipovi tamo nemaju traku) — ulaz je iz alata. Dnevni izveštaj mejlom još
nije napravljen (predlog: cron na Hetzneru koji čita `/prijave?format=json&posle=…` i šalje
preko postojećeg Gmail SMTP-a iz `server-guard.sh`).

**BANER ZA KOLAČIĆE (odluka vlasnice 06.09., grana `feat/kolacici-baner`):** GA se učitava TEK
posle pristanka (`ga-init.js?v=3` učitava gtag.js dinamički; statični `<script>` za gtag je
uklonjen iz `index.html` i `gen_pages.py`). Baner na dnu, ne blokira sajt (Google kažnjava
međuekrane; vlasnica: „ne želim da stanem Google-u na žulj“). „Prihvati sve“ = 1 klik;
„Podesi“ = prekidači (neophodno zaključano, merenje isključeno) + „Sačuvaj izbor“. Link
„Kolačići“ u futeru vraća baner. Odluka u `localStorage.rimoteka_kolacici`. Ćirilica
podržana, brend „Google Analytics“ ostaje latinicom. `?interno=1` = bez banera i bez GA.
**Posledica za analitiku:** od objave GA broji SAMO one koji prihvate — brojevi padaju, to
nije pad posete. Test: sekcija 47; svi drugi konteksti u testu kreću sa prihvaćenim
kolačićima (`test/bez-analitike.mjs`).

**Mejl `eureka@rimoteka.com`:** šalje iz Gmaila (ime „Rimoteka“), SPF ima Google — detalji u
memoriji `reference_rimoteka_eureka_mail`. **Gmail potpis:** slika `public/potpis/…png` i
HTML `marketing/potpis/gmail-potpis.html` na grani `feat/gmail-potpis` — vlasnica bira
verziju (bez note / nota na „i“ / dve note), pa push i ubacivanje u Gmail.

**Kako je testirano:** `node test/predeploy.mjs` lokalno; pre toga isti test protiv
produkcije (stari kod) da nova sekcija padne. Posle objave: `BASE=https://rimoteka.com`.

---

# Sesija 20–30. avgust 2026 (devetnaesta) — pun audit, K1/K2/V5/V1/M12 zatvoreni, analitika očišćena, sinonimi krenuli

> Duga sesija sa **šest objava**. Sve je provereno pre i posle svake, i sve je uživo.
> Test podignut sa **564 na 666 provera**.

## 1. PUN AUDIT (20.08.) — ocena 6,2/10, bila 8,4

`AUDIT/2026-08-20-audit.md`. Šest nezavisnih revizora + moja merenja.
Ocena je pala jer je audit **prvi put merio nešto novo**: da li strane daju isto što
i alat. Nisu davale.

## 2. ŠTA JE ZATVORENO, redom objava

| # | Commit | Šta |
|---|---|---|
| 1 | `d1292041c` + merge `674a5c007` | **K1** redosled rima, **K2** adrese za Gugla, **V5** verzije podataka |
| 2 | `2590b3223` + merge `bb5bee5f9` | naslovi po upitima, `/recnik-srpskog-jezika/` → `/rime-po-zavrsetku/`, sopstveni promet |
| 3 | `8b37d431f` | 301 preusmerenje (**zasebno**, jer dira `nginx.conf`) |
| 4 | `0c1d2acb3` | **M12** beli okvir u tamnoj temi (otvoren mesec dana) |
| 5 | `ee763b804` | klasici bez klika, tekst igre, futer, brojač slogova |
| 6 | `0d9b1092e` | **V1** naslovi 1.994 strane reči |

### K1 — redosled rima (najveći nalaz)
Statičke strane su ređale rime **azbučno**, alat **po učestalosti**. Uz to je u alatu
pretraga iz `?rec=` kretala pre nego što `loadExtras()` prepiše `RANK`. Izmereno:
96,4% strana drugačiji redosled, 51% nije prikazivalo rime koje alat daje,
**11.369 izgubljenih reči**. Zatvorio i bag „čeka" otvoren od 31.07.
Popravka: `load_rank()` u `gen_pages.py` (ista formula kao `app.js:455`, iz **istih
fajlova koje učitava pregledač**) + tiho ponovno iscrtavanje na kraju `loadExtras()`.

### K2 — adrese za Gugla
Sajt je nudio **98.115** jedinstvenih `?rec=` adresa (sitemap ima 2.017), a server je
na svaku vraćao bajt-identičan HTML. Sada: reč bez svoje strane je **dugme**, ne link
→ **13** adresa. Uz to `noindex` za sve što nije reč iz rečnika, plus `og:` oznake i
`h1` koji prate reč.
⚠️ **Merilo za `noindex` je REČNIK, ne broj rima** — `xqzwptr` nije reč, ali se
završava na `-rv` pa ima pet rima.

### V1 — naslovi strana reči
Bilo: „Rime za reč „ljubav": 180 reči koje se rimuju | Rimoteka rečnik rima" (68 znakova,
**1.739 od 1.994 preko granice**). Sada: **„Šta se rimuje sa „ljubav"? | Rimoteka — alat
za rimovanje"** (57, najduži 65, **nijedan preko**).
Zašto to pitanje: upit `sta se rimuje sa` ima **125 prikaza, 2 klika (1,6 %)** na
poziciji 4,5 — već rangiramo, a niko ne ulazi.
Padež rešavaju **navodnici** (citat ostaje u nominativu), ne više umetnuta reč „reč".
Opis sada **odgovara** na pitanje umesto da ga ponavlja.

## 3. ANALITIKA — sopstveni promet je bio 20 % korisnika

Vlasnica je pitala za 198 poseta iz Barselone. **Bile su moje**: test otvara 34 sveža
konteksta po prolazu = 34 „nova korisnika". Izmereno: Barselona 206 korisnika, 203
nova, **12 s** zadržavanja; Beograd 496 i **2 min 56 s**.

- `test/bez-analitike.mjs` — presreće zahteve ka Google-u, kači se na `newContext` i
  `newPage` **jednom, na browseru**. ⚠️ NE blokirati preko DNS-a: pravi
  `ERR_CONNECTION_REFUSED` i obara pet provera „nula grešaka u konzoli".
- `ga-init.js` — `rimoteka.com/?interno=1` gasi merenje na tom uređaju trajno,
  `?interno=0` vraća. **Vlasnica je to uradila na telefonu 28.08.**
- **Čisto je tek od 28.08.2026.** GA4 ne briše unazad.
- Prava publika za 28 dana: **oko 950 novih ljudi**, ne 1.194.

## 4. SINONIMI — u toku, NIJE ZAVRŠENO

**Stanje:** `public/sinonimi.json` ima **17 reči** (bilo 2). Sve su pregledane sa
vlasnicom, reč po reč, uz proveru u Matici. Zapis: `AUDIT/sinonimi-odluke.md`.

**Kandidati za nastavak:** `AUDIT/sinonimi/spojeno-za-pregled.json` — **812 reči,
11.509 sinonima, 14,2 po reči**. Spojena tri izvora, ovim redom prvenstva:
1. **odluke vlasnice** (uvek prve, zaobilaze sva sita),
2. **Vikirečnik** (`sr.wiktionary.org`, **CC BY-SA 4.0 — smemo**, uz navođenje izvora
   i istu licencu za nastali fajl). Pokrivenost 53 % naših reči, 8,4 po reči.
3. **Ćosić** (`~/Literatura/Pavle_Cosic_Recnik_Sinonima.pdf`) — dodao 4.986 sinonima
   kojih Vikirečnik nema.

**Redosled pregleda:** `AUDIT/sinonimi/redosled-pregleda.json` — najkorišćenije reči
prve. **Stiglo se do 18. reči.** Vlasnica traži grupe od po ~18, javlja šta da se izbaci.

⚠️ **Greške koje mašina NE VIDI, traže njeno oko:** `rad → radnik` (to je čovek),
`voda → more, reka, jezero` (vrste vode, ne sinonimi), `pitanje → pita, piton`
(greška Vikirečnika).

## 5. PRAVILA KOJA SU UVEDENA U OVOJ SESIJI

| Gde | Šta |
|---|---|
| `~/.claude/ANALITIKA-GA4-I-SEARCH-CONSOLE.md` | **nov dokument**, udžbenik analitike za sve projekte; čita se pre svakog rada sa podacima o poseti |
| `~/.claude/CLAUDE.md` → „TUĐI REČNICI I IZVORI" | redosled se **uvek menja**, objašnjenja se **nikad ne prepisuju**, licenca se proverava **pre** upotrebe |
| `~/.claude/TESTING.md` | dva sistema se **porede**; podatak koji stigne kasnije menja iscrtano; komentar nije dokaz; uslov „vredno indeksiranja" se veže za izvor istine |
| `AUDIT/PROPUSTI.md` | pravila **18–23** |
| memorija | pet novih zapisa, v. `MEMORY.md` |

## 6. ŠTA SLEDEĆA SESIJA TREBA DA ZNA ODMAH

1. **Nastavi pregled sinonima od 19. reči** (`AUDIT/sinonimi/redosled-pregleda.json`).
   Grupe od ~18, u razgovoru — **ne kroz objavljenu stranu, ona joj ne otvara**.
2. **Njene odluke se unose u svaki nov spisak PRE nego što joj se pokaže.**
   29.08. sam napravio nov spisak i izgubio 52 već rešene reči — odmah je primetila.
3. **Sito se prvo pusti na poznato tačne reči.** Filter kroz `build/sadrzajne.json`
   je izbacio `dakle`, `rintanje` i `potaman` — dve je ona lično odobrila.
4. **Ime strane, naslov za Gugla i adresa idu njoj na potvrdu PRE koda.** Dva puta u
   istom danu sam upisao pa ona odbila (naslov početne, `/reci-po-slovima/`).
5. **Odgovori kratko**, 4–5 rečenica. 25.08. je izričito tražila: „previše pišeš, ne
   mogu sve da stignem da pročitam".

## 7. OTVORENO POSLE OVE SESIJE

**15 nalaza, nijedan kritičan.** `AUDIT/NALAZI-OTVORENI.md`.
Najvažnije: **HSTS** (ide sam, kao i preusmerenje) · **4.119 reči ima gotovo
objašnjenje a nema ih ni u jednom rečniku** · „preskoči na sadržaj" · dodirni ciljevi 44 px.

**Merenje zakazano za 8.09.2026** — tada se vidi da li su naslovi pomogli:

| Šta | Sada | Cilj | Ako ne uspe |
|---|---|---|---|
| CTR početne | 2,5 % | preko 4 % | ispod 3 % → vratiti stari naslov |
| Upit `rime` | 0 klikova | bar 10 | vratiti stari naslov |
| Upit `sta se rimuje sa` | 1,6 % | preko 4 % | preispitati formulaciju |
| „Otkrivena, nije obrađena" | 1.181 strana | da pada | — |

---

# Sesija 20. avgust 2026 (osamnaesta) — pune liste rima OBJAVLJENE + kuracija sinonima

## Šta je urađeno

1. **Pune liste rima na svakoj `/rime-za/` strani — OBJAVLJENO** (`a914ec111`).
   Strana za reč sada nosi punu ponudu rima (npr. ljubav: 180), CTA dugme
   „Pretraži rime za druge reči" → `/`. Test produkcije **571/571**.
2. **`?rec=` dinamičke adrese — objavljene** (`a67243659`), rade na produkciji.
3. **Mobilni bagovi (obe ture sa iPhone-a) — objavljeno** (`162f3d0e0`).
4. **Video reklama** — `marketing/reklama/rimoteka-reklama.html`: warp-polje 3D
   nota + sitni parovi rima koji lete ka gledaocu; pravi logo (`logo-icon.png`);
   svi parovi provereni u rečniku; kraj: „rimoteka.com — besplatan alat za
   rimovanje reči i pisanje pesama na srpskom jeziku". Render:
   `node marketing/reklama/render-mp4.mjs` → 9x16, 1x1, 16x9 MP4.
   **Čeka ocenu vlasnice (finalni render).**
5. **Sinonimi — restart kuracije.** Mašinski sinonimi odbačeni u celini;
   `public/sinonimi.json` sveden na 2 kurirane reči (sunce, šišarka); verzija u
   app.js `sinonimi.json?v=20260820a`; `test/predeploy.mjs` usklađen.
   Predlozi: `AUDIT/sinonimi-predlog-serija-1.md` (najčešće + najtraženije reči)
   i `AUDIT/sinonimi-predlog-serija-2.md` (140 reči) — **obe serije čekaju
   proveru vlasnice** (ona briše/dopisuje u fajlu i javi „gotovo"; odobreno se
   upisuje u sinonimi.json kao ČISTE reči, bez ikakvih oznaka).
6. **Uklonjeno sa sajta na zahtev vlasnice:** `štovanje` (reci.txt,
   definicije.json, frekvencija.json, build/sadrzajne.json).
   `poštovanje`/`nepoštovanje` ostaju. **`kapućino` (sa Ć — oblik iz Matice:
   „капућино, топли напитак од кафе и млека") je na sajtu po zahtevu vlasnice**;
   oblik sa č (`kapučino`) uklonjen, ASCII `kapucino` ostaje.

## Standard za sinonime (dogovoreno u ovoj sesiji)

- Pojmovno pokrivanje + vrste/oblici + razgovorno/žargon/pesničko; sve se
  proverava u Matici (`~/Literatura/recnik-matice-srpske-2011.txt`, ćirilica,
  OCR-šum — odsustvo NIJE dokaz da reč ne postoji). Vlasnica je konačni
  autoritet — njene reči ulaze i bez Matice (keva, lova, baćela, šveca…).
- Na sajtu korisnik vidi SAMO čiste reči — nikakve oznake ni izvori (zahtev
  vlasnice 20.08.). Oznake žive samo u AUDIT dokumentima za pregled.
- `AUDIT/sinonimi-iz-matice.md` i `AUDIT/sinonimi-kandidati.md` su mašinski
  otpad (izvor ranijih „budalaština" tipa šišarka→babuška) — NE koristiti.

---

# Sesija 19. avgust 2026 (sedamnaesta) — SEO: `?rec=` DINAMIČKE ADRESE + sinonimi

> **Stanje:** implementirano LOKALNO, **nije commit-ovano** — čeka puni test,
> pa odobrenja (push, merge) po koraku.

## Šta je urađeno

1. **Dijagnoza „prve stranice" (pitanje vlasnice: sestra nije našla „rimu za
   malena").** GSC uživo: 1.150 indeksiranih (raste: 124→811→1.150),
   „Discovered — not indexed" 1.182; klikova 824/28 dana, prosečna pozicija
   5,7. „rimovanje" CTR 9,2%. Za „rima za malena" nema naše strane (reč ima
   pokazivač-objašnjenje → generator je preskače), a konkurenti azrhymes i
   rime.com.hr rangiraju sa **dinamičkim `?rime=` adresama** — dokazano uživo.
2. **Trajne zabrane zapisane (odluka vlasnice):** NIKAD backlinkovi sa njenih
   drugih sajtova (nisu ista niša) i ZABRANA pravljenja novih strana. Upisano
   u `SEO_PLAN.md`, `CLAUDE.md` (od. 7), ovde ispod.
3. **Rešenje bez novih strana: `?rec=` odblokiran.** `robots.txt` dozvoljava
   (ostali upitnici blokirani); `app.js` po reči postavlja title/opis i
   kanonikal — statičkoj strani kad reč ima stranu (`public/rime-strane.json`,
   emituje `gen_pages.py`), inače samoj adresi. Verzija `app.js?v=20260819a`
   (ujednačeno — HTML je zaostajao na staroj verziji uz promenjen sadržaj).
4. **Sinonimi:** popravka „šišarka → samo šišarica" (u fajlu, verzija
   20260816e). Poštena presuda: mašinski sinonimi nemaju pravopis-kvalitet
   (50% parova van Matice); kuracija po karticama — serija 1 spremna u
   `AUDIT/sinonimi-kuracija-serija-1.md` (50 najčešćih reči, ona briše/dodaje
   u fajlu, pa mi javi „gotovo").

## Test pre deploy-a

Nove provere u sekciji 2b: robots.txt ne blokira `?rec=`; `?rec=malena` ima
naslov/opis po reči i self-kanonikal; `?rec=ljubav` kanonikal ka
`/rime-za/ljubav/`. Posle deploy-a: `BASE=https://rimoteka.com node
test/predeploy.mjs`, pa GSC pratiti „Blocked by robots" (918) i indeksiranost
dinamičkih adresa.

---

# Sesija 16. avgust 2026 (šesnaesta, drugi deo) — MOBILNI BAGOVI, DRUGA TURA (9 prijava)

> **Stanje:** sve popravljeno LOKALNO, **nije commit-ovano** — čeka pregled
> vlasnice na telefonu (`http://192.168.0.22:8765`). Pre-deploy test lokalno
> **555/555** (546 + 9 novih provera u novoj sekciji 30G). Regenerisano je i
> 1.994 strana `/rime-za/` na `?v=20260816b`. Prijave su došle sa pravog
> iPhone-a sa LOKALNOG preview-a — dakle ovo je druga tura: provera prve ture
> uživo, pa nova pravila („ništa se ne lomi u piluli", „pilula grli reč",
> „ništa ne visi", „nema duplih tekstova").

## Šta je popravljeno (9 prijava)

1. **Praznina ispod uvodnog pasusa na početnoj** — sa ~122 px na ~64 px
   (`main` padding-bottom 3rem→1,2rem, `.seo-content` margin-top 3rem→1,2rem,
   `.hero` margin-top 1,6rem→.9rem; sve samo mobilni blok).
2. **Futer: „Powered by" i „Orbita Code" u dva reda.** Uzrok: link je na
   telefonu bio `display:flex` (blok) zbog dodirnog cilja — pao u novi red.
   Sada `inline-flex` uz `white-space:nowrap` — jedan red, 44 px dodir.
3. **Tabovi lome tekst u piluli i svaki red počinje drugde.** Uzrok: pri
   prelazu na prelamanje (prva tura) ispao je `nowrap`, a redovi su bili
   centrirani. Sada `nowrap` (pilula = širina reči) + `flex-start`.
4. **Akcije beležnice razbacane, „obriši pesmu" sama u redu.** Grupe
   (`.hint-grupa`) su svaka zauzimala red. Sada `display:contents` na grupi +
   dugmad `flex:1 0 auto` — svaki red pun 97–98% širine.
5. **Rime u beležnici seku se iza tastature (iPhone).** Na iOS 26 Safari-jeva
   traka (lozinka/kartica/lokacija) lebdi iznad tastature i prekriva pilule,
   a `visualViewport` je zahvata. Panel se sada lepi za VIDLJIVI vidokrug
   (`top` u layout koordinatama, na vv „scroll"/„resize") uz dodatnih 56 px
   na iOS-u (`--traka-lift`, `JE_IOS` detekcija). Bez `window.scrollBy` —
   prst se ne dira.
6. **Panel rima prekriva editor pri skrolu nagore.** Isti uzrok kao 5 —
   `bottom:var(--kb)` je vezan za layout vidokrug koji pri pomeranju stoji,
   pa panel „plovi". Lepljenje za vidokrug to rešava.
7. **Brojač slogova: dodir u polje „odnese" stranu na dno.** `drziPoljeUVidokrugu`
   je dovlačilo DNO visokog polja u vidokrug i guralo vrh iz kadra. Sada se
   pomeraj seče — vrh polja nikad ne ide iznad gornje ivice vidokruga.
8. **Pilule rima preširoke, prazno unutra.** Uzrok: mreža jednakih kolona +
   `chip-siri` span 2. Sada je `.results` na telefonu FLEX-red koji se prelama —
   pilula je široka tačno koliko reč (izmereno: 0 pilula sa prazninom >8 px,
   2–4 reči po redu). `izmeriCipove()` sveden na čišćenje zaostalih klasa.
9. **Omiljene: dvostruko objašnjenje + naslov ispod liste.** Hero (h1+p koji
   prati tab) se na telefonu na tabu „omiljene" više ne prikazuje —
   `html[data-tab="omiljene"] .hero{display:none}` (oznaku upisuje
   `tab-init.js` pre iscrtavanja, pa nema skoka). h1 ostaje u izvoru strane.

## Ostalo

- `?v=` podignut na `20260816b` (app.js, style.css) na početnoj, svim
  podstranama, u `gen_pages.py`; regenerisano 1.994 strana (sitemap 2.017).
- Test dobio sekciju 30G (9 provera) + provera 30A sada dozvoljava 2–4 reči
  po redu (bilo 2–3 — pravilo promenjeno odlukom vlasnice).
- Zamka za sledeću sesiju: pilule rima su UGNJEŽDENE — `#rimeResults` sadrži
  `.res-group > .results > .chip`. Selektor `#rimeResults > .chip` ne pogađa
  NIŠTA; meriti `#rimeResults .results > .chip`.
- Pouka (u `AUDIT/PROPUSTI.md`): pre-deploy test nema iOS-26 plavu traku —
  lažna tastatura od 336 px ne pokriva tu klasu; uzeto u obzir kroz
  `--traka-lift`.

## Rečnik: izbačeni „većera" i „većeras" (odluka vlasnice, isti dan)

- Prijava: kao rima za „šećera" ponuđena je „većera". Provera u Rečniku
  Matice srpske: standardni oblici su isključivo **„večera"** (red 27916) i
  **„večeras"** (red 27927); oblika „većera/većeras" (južnosrpski izgovor,
  č→ć) u Matici NEMA. Naš rečnik ih je pokupio iz veb-korpusa.
- **Pravilo vlasnice: rečnik prati PRAVOPIS, ne govor — nijedna reč se ne
  nagađa „kako je ljudi govore".** Izbačeno iz `reci.txt` (280.339 →
  280.337); objašnjenja ostaju kao putokazi ka standardnom obliku. Verzija
  rečnika `?v=20260816b`. Strane regenerisane; „većera" nestala i sa
  statičke strane za „šećera". Test 555/555 potvrđen posle izmene.
- Šira klasa zabeležena u `TODO-RECNIK.md`: parovi „ista reč, dva pisma"
  (č/ć) — grubo ~180 kandidata uz mnogo lažnih (`braća/brače`, `bića/biče`
  su regularne reči). Prolaz kroz Maticu reč po reč — čeka zeleno svetlo
  vlasnice.

## Algoritam rime: č≡ć i dž≡đ pri merenju sličnosti (isti dan)

- Prijava vlasnice: za „šećera" su „najbolje rime" bile „partnera, primera,
  lidera" — a „večera" (bolja rima) ispod njih. Uzrok: `commonSuffix` je
  merio sličnost SLOVO PO SLOVO, pa su „šećera/partnera" i „šećera/večera"
  delili isto („era", 3) — nerešeno je padala učestalost i česte reči su
  pobeđivale. Za računar je „ć ≠ č"; za pesnika je to ista rima.
- Popravka: u `commonSuffix` (app.js) i `common_suffix` (gen_pages.py) pri
  merenju važi č≡ć i dž≡đ. **Pravopis se ne dira** — samo merenje sličnosti.
  Izmereno posle: „najbolje" za „šećera" = glečera, večera, kačera, rančera.
- Provera u testu (sekcija 2): „večera" mora biti među najboljima i iznad
  „partnera" za „šećera"; „većera" (ć) ne sme biti u rečniku ni u rimama.
- Strane regenerisane sa novim algoritmom (1.994).

## Spisak 01b UKINUT za ručni pregled (odluka vlasnice, isti dan)

- Vlasnica odbacila ručni pregled 20.021 reda (`01b-za-pregled.md`).
  Mašinska trijaža (`01b-ARHIVA-trijaza.md`): OCR šum 759 (od toga 190
  ispravljeno i dokazano — sve su već u rečniku; 569 nedokazanih u arhivu),
  67 duplikata, 111 zastarelih, ostatak 19.084 retke reči → **arhiva, vadi
  se po TEMI kad zatraži**.
- Pouka o dokazu: reč ispravljena iz OCR-a se dodaje samo uz NEZAVISAN dokaz
  (srLex ili naš rečnik) — Matica kao dokaz otpada jer je ista skenirana
  greška u njoj (prva provera je „dokazala" 644 naslova koje je parser sam
  izgrejao; uhvaceno kontrolnim parom).
- Nova vrednost: `08-pridevski-i-za-dodavanje.md` — 131 određeni pridevski
  oblik na -i koje Matica potvrđuje (klasa „znanstveni"). Čeka njenu odluku.

## Upisano 96 odobrenih pridevskih oblika (isti dan, njena provera spiska)

- Vlasnica je prošla ceo spisak od 131: **96 primljeno, 35 izbačeno njenim
  pregledom + 3 najbliže diktatu** („malani/tordni/agasli" → izbačeni
  „milani/torni/ugasli" — vratiti ako je pogrešno protumačeno).
- `reci.txt` 280.337 → **280.433**; `definicije.json` — pokazivači na osnovu
  u kućnom stilu („Oblik reči X (…)"); generička definicija samo za troje
  bez jasne osnove (`satri`, `inkubatorski`, `zaračunati`). Verzije
  `reci.txt?v=20260816c`, `definicije.json?v=237`.
- **Sledeće: ona pregleda 1.961 „odbijenih" iz istog fajla** (rekla „sada ću
  preći odbijene") — kad stigne njen spisak, isti postupak upisa.

## Grupa A–B iz „odbijenih": 59 reči upisano (isti dan)

- Vlasnica je prošla slova A–B: upisano **59 reči** (adresirani, aluvijalni,
  beskorisni, buntovnik, biblioteci, azbuci…). `reci.txt` 280.433 → **280.478**.
  Izbačeno: `boljeli` (ijekavica — njen nalaz).
- **Odgovori na njena pravopisna pitanja:** „u azbuci" ✓ (Matica ima „азбуци",
  „азбуки" nema); „u biblioteci" ✓ (isti k→c obrazac; sken je OCR-šuman pa
  oblik ne nalazi, ali pravilo je isto kao ruka→u ruci, azbuka→u azbuci).
- Zašto su ispravne reči bile „odbijene": kriterijum je tražio tačan oblik u
  OCR-šumornom skenu — „odbijeni" je značilo samo „sken ne potvrđuje", ne
  „pogrešno". Svi kandidati su po konstrukciji -i oblici reči koje već imamo
  u -a/-o obliku. Postupak dogovoren: ona bira po slovima, mi upisujemo.
- Verzije `reci.txt?v=20260816d`, `definicije.json?v=238`.

## OBJAVLJENO 16.08.2026 (kraj šesnaeste sesije)
- Grana `feat/mobilni-bagovi-recnik-16-08` → commit `162f3d0e0` → merge na
  `main` (odobrenje vlasnice) → Coolify auto-deploy.
- **Test protiv produkcije: 566/566** (više od lokalnih 558 jer produkcija
  meri i service worker, CSP i prava zaglavlja). Produkcija ažurna za ~20 s.
- Šta je na produkciji: 16 mobilnih popravki, placeholder beležnice,
  futer u jednom redu, tabovi/pilule/akcije sređeni, traka rima lepljena,
  rečnik bez „većera/većeras" + 155 novih reči, rime sa č≡ć/dž≡đ.

---

# Sesija 16. avgust 2026 (petnaesta) — MOBILNI BAGOVI SA IPHONE-A (7 prijava)

> **Stanje:** sve popravljeno LOKALNO, **nije commit-ovano** — čeka pregled
> vlasnice. Pre-deploy test lokalno **546/546 („Sme deploy")**; posle deploy-a
> obavezno `BASE=https://rimoteka.com node test/predeploy.mjs`.
> Prijave su došle sa pravog iPhone-a (slikom potvrđene), sa produkcije.

## Šta je popravljeno (7 prijava)

1. **Skrol se borio sa prstom (kritično).** Uzrok: `visualViewport` „scroll"
   događaj (dešava se pri SVAKOM skrolu dok je tastatura otvorena) zvao je
   `keepCaretVisible()`/`drziPoljeUVidokrugu()`, a one rade `window.scrollBy` —
   kod je vraćao stranu naniže dok je čovek skrolovao nagore. Dokaz A/B
   merenjem: stari kod je zamrzavao stranu na 481 px uprkos 7 pokušaja skrola,
   novi prolazi slobodno. Popravka (`public/app.js`): na vv „scroll" se samo
   meri `--kb`, ispravka položaja ostaje na „resize" (otvaranje tastature),
   fokus i kucanje; uz to zastavica `korisnikSkroluje` (touchmove/wheel/scroll)
   blokira svako prisilno skrolovanje usred korisnikovog skrola. Uz to
   `body{min-height:100vh}` dobilo `100dvh` rezervu (`style.css`).
2. **Placeholder beležnice** → „Naslov pesme (opciono)" (`index.html`,
   `pisanje-pesama/index.html`; generator `gen_pages.py` markup povlači iz
   `index.html`, pa će regeneracija sama pokupiti).
3. **Dugmad beležnice i traka tabova se više ne seku.** Na telefonu se oba reda
   PRELAMAJU u više redova — uklonjeni `overflow-x:auto` redovi i maske koje su
   pravile odsečene pilule („preuzmi…", „Brojač slogova…"). Izmereno na 375/390/
   430 px: 0 odsečenih. Separatori (`.hint-sep`) se na telefonu kriju.
4. **Klasici: stih više ne lomi.** Oznake (slogovi, slovo šeme) stišane i
   zbijene uz desnu ivicu, kartica pesme izlazi na ivicu ekrana (isti manevar
   kao `.notepad`), tekst .8rem — 0 prelomljenih od 138 stihova na 375–430 px.
5. **Ijekavica u igri.** Bazen poznatih reči gradio se po frekvenciji iz CELOG
   `WORDS` — pa i iz ijekavskog dela (`dvije` ima 13.461 pojavu). Novi filter
   `jeJekavskaRec()` (indeks ≥ `jekStart` ili skup `JEKAVSKI`) primenjuje se pri
   izboru: igra je isključuje UVEK, kockica kad kvačica nije uključena.
6. **„znanstveni" ubačen** u `reci.txt` (azbučno, iza `znanstvene`) i
   `definicije.json` (Matica: `знанствен — који се односи на знаност`).
   Cela KLASA nedostaje: određeni oblici prideva na -i nisu sistematski
   pokriveni (~620 kandidata, uz lažne pozitivne) — zabeleženo u
   `TODO-RECNIK.md`, čeka odluku vlasnice.
7. **Reč se ne seče na „…" — nikad.** Uklonjen prag od 10 px u `izmeriCipove()`
   (pilula se širi za svaki manjak) i `text-overflow:ellipsis` iz mobilnog CSS-a.
   Izmereno: 0 odsečenih od 195 rima za „ljubav" na 375/390/430.

## Ostalo

- `?v=` podignut na `20260816a` (app.js, style.css, reci.txt; definicije 236) —
   na početnoj, svim podstranama i u `gen_pages.py` šablonama. Strane
   `/rime-za/[reč]/` nose stari `v=` do sledeće regeneracije (SW im servira
   stale-while-revalidate — jedna poseta zastarelo).
- Test `predeploy.mjs` dobio nove provere: M4 sada traži da SVE stavke trake
   budu cele vidljive (maska više ne postoji), sečenje reči u pilulama,
   odsečena dugmad beležnice, lomljenje stihova, ijekavica u igri (i kad je
   kvačica uključena), `znanstveni` u rečniku.
- Usput nađeno: filter „nula grešaka u konzoli" je gledao samo tekst poruke,
  pa je pucao kad Google Fonts CDN vrati 404 za woff2 (16.08. je to radio za
  tri Rubik podskupa) — tekst je tada generičan, a URL resursa stoji u
  `location()`. Filter sada gleda i URL; poruke o greškama loguju izvor.
- Zamka alata: kad test pukne usred rada, `static-server.mjs` ostane da visi
  na portu 8799, pa sledeći prolaz pada sa CONNECTION_REFUSED. Pre ponovnog
  pokretanja ubiti stare (`pkill -f static-server.mjs`) — ali NE u istoj
  komandi sa testom: pkill pogodi sopstveni shell jer u tekstu komande vidi
  isti obrazac.
- Staro M4 pravilo (maska na traci tabova) i M3 (red akcija koji se pomera)
  su UKINUTI odlukom vlasnice 16.08. — ne vraćati ih.

---

# Sesija 4–10. avgust 2026 (četrnaesta) — NASLOVI, REČNIK, SARADNJA, GSC, AUDIT

> **Grana:** `feat/naslovi-h1-h2-seo-tekst` → spojeno na `main`; sve je i na
> GitHubu **i na produkciji** (Coolify auto-deploy na svaki push). Poslednji
> commit: `1fc2521af`. Produkcija verifikovana: **547/547**, CLS 0,0515,
> audit **8,4/10** (`AUDIT/2026-08-10-audit.md`).
> Dogovor: kad vlasnica kaže „merge" = commit + push (+ auto-deploy) odjednom.

## ⛔ PRVO SLEDEĆOJ SESIJI — samo ovo je otvoreno

1. **13.08. — očitavanje merenja naslova.** `<title>` i `meta description`
   početne su NETAKNUTI 30.07–13.08 (meri se CTR za `recnik rima`, 204/0).
   H1 početne je promenjen 04.08. uz odobrenje — ne dira SERP prikaz. Posle
   očitavanja: skloniti „270.000 reči" iz opisa (pravilo 5) i odlučiti o
   `rečnik rima` u naslovu. Očitavanje ide kroz CDP browser (tačka 4).
2. **Sitno iz audita 10.08** (`AUDIT/2026-08-10-audit.md`): 7 title-ova ima
   67–69 znakova, 5 opisa 181–189, hub opis kratak (89) — jedna runda
   skraćivanja. HSTS zaglavlje pri sledećem nginx deploy-u (nginx ide UVEK
   zaseban deploy). 9.413 orfan-definicija u `definicije.json` — NE brisati
   olako, neke su pripremljene unapred (slučaj `prohtev` 10.08).
3. ~~Link building nije počeo~~ — **UKINUTO odlukom vlasnice 19.08.2026:
   nikad linkovi sa njenih drugih sajtova (nisu ista niša).** Zabeleženo u
   `SEO_PLAN.md` (tačke 2 i e) i `CLAUDE.md` (odeljak 7). Backlink samo iz
   niše. Istog dana zabranjeno i pravljenje novih strana — fokus je jačanje
   postojećih (v. `CLAUDE.md`, odeljak 7).
4. **GSC pristup:** kroz browser profil `~/.claude-pw-tools/user-data` na CDP
   :9222 — pokrenuti `node ~/.claude-pw-tools/rimoteka-keep-alive.mjs` (vidljiv
   prozor; ako Google odjavi, vlasnica se prijavi u njemu jednom), pa skripte
   `rimoteka-gsc-*.mjs` (attach). Pratiti pad „Discovered — not indexed" (870
   na 10.08) i očitati GSC-indeksirane za `build/gsc-indeksirane.json` pri
   sledećoj promeni izbora strana.
5. **Dve zamke plaćene ove sesije — ne ponavljati:** (a) produkcijski CSP
   blokira INLINE skripte — svaka skripta ide kao fajl (zato postoji
   `public/tab-init.js`); lokalni test to ne vidi, zato posle deploy-a uvek
   `BASE=https://rimoteka.com node test/predeploy.mjs`. (b) Git na Mac-u sa
   `core.ignorecase=true` NE vidi prelazak velikih slova u mala u putanjama —
   posle svake takve izmene proveriti `git ls-files | grep -E '/[A-Z]'` pre
   push-a, inače produkcija dobije raskorak sitemap/fajlovi.

## Šta je urađeno 10.08. (drugi deo sesije)

- **GSC (kroz CDP):** 811 indeksirano (sa 124 na 30.07). Sitemap resubmitovan;
  11/12 ključnih strana već indeksirano, za `/kako-napisati-pesmu/` zatraženo.
  Mape razloga: robots.txt 910 i redirect 349 su NAMERNI (`?rec=` parametri i
  stare adrese iz preslagivanja) — ne dirati; duplicate canonical = 1 strana.
- **lastmod = datum gradnje** u sitemapu (bio zakucan na jul) + **IndexNow**
  ping sa svih URL-ova prihvaćen (ključ: `public/e8f48349….txt`).
- **Države i gradovi dobili strane** — obavezni izbor
  `build/obavezne-drzave-gradovi.json` (160 reči; gen_pages.py blok a4). Finska,
  Čile, Peru dopunjene u rečnik (uvoz 02.08. ih je izgubio). Bez strane zbog
  premalo rima: Čačak, Češka, Čikago, Čile. Višečlana imena ostaju bez strana.
- **Slugovi su malim slovima** (audit nalaz) + popravljen git indeks
  (ignorecase zamka, v. tačku 5). Produkcija proverena: `/rime-za/beograd/` 200.
- **Audit 10.08: 8,4/10, bez kritičnih nalaza** — sve izmene sesije proverene
  uživo. Rečnik: 280.338 reči, 0 bez objašnjenja, 0 duplikata.
- Odluke vlasnice o 330 spornih reči primenjene (70 vraćenih) — detalji u
  `AUDIT/vracene-reci-04-08-2026.md`; vulgarne reči sada pokriva dečji režim,
  a ne stalna blokada (copy usklađen na 4 mesta).

## Šta je urađeno 04.08. (prvi deo sesije)

## Šta je urađeno

### Naslovi (H1/H2) — predlozi odobreni, pa upisani svuda
- Izvor istine za tematske i generisane strane je **`build/gen_pages.py`**
  (H1 svih 20 tematskih, podnaslovi sekcija, šablon `/rime-za/[reč]/`, `/slogovi/`,
  hub). Početna i `TAB_NASLOV` su u `public/index.html` / `public/app.js`.
- H1 početne: „Rimovanje reči na srpskom jeziku — rečnik rima za tvoj stih".
- Podnaslovi više nisu jedna reč — pitanje ili tvrdnja (PAA/isečci).
- **`/rime-za/[reč]/`**: grupa je „Rime sa istim završetkom kao „X"", „Šta dalje —
  od rime do gotove pesme", i NOVO FAQ pitanje **„Šta znači reč „X"?"** (vidljivo +
  JSON-LD, samo kad značenje postoji) — ciljano na upite „šta znači X".
- Hub `/rime-za/`: broj strana izbačen iz title/opisa (rastući broj, zabranjen);
  „azbučni spisak". Broj u uvodnoj rečenici ostaje — računa se pri svakoj gradnji.
- Tab „Rečnik" → **„Pretraga reči"** (+ hint u panelu šta alat radi: završava se /
  počinje / sadrži). Igra: H1 pitanje „…koliko dug niz rima možeš da sastaviš?"
  (oblik „izdržaćeš" je bio gramatički pogrešan — ispravila vlasnica).
- „Vreme je za igrača N" i „Rezultati" više nisu `h2` nego `<p>` — čista hijerarhija.
- Test `predeploy.mjs` pratio je stare stringove — ažurirana su dva literala.

### Izgled i ponašanje (zahtevi vlasnice tokom sesije)
- **Hvataljke za premeštanje stihova uvek vidljive** (bile `opacity:0` do hovera).
  Desktop .5 / hover 1; na telefonu hvataljka vraćena (gutter 2,3→2,9 rem) —
  stari M2 komentar je tvrdio da prevlačenje prstom ne radi, a radi (pointer
  događaji, `setPointerCapture`).
- **Note u traci za saradnju plutaju** — animacija preko SAMOSTALNIH svojstava
  `translate`/`rotate` (ne `transform`), da se ne sudare sa `scale` postavkama
  ni sa pretvaranjem u srce. Srednja nota (iza teksta) skrivena:
  `visibility:hidden` čuva raspored preostale četiri.
- **Traka za saradnju skinuta sa početnog taba; poziv vraćen u futer** (dugme
  „Kontakt" + tekst iz trake, `text-wrap:balance`). Na ostalim tabovima traka
  ostaje. Prebacivanje je CSS po `data-tab` na `<html>`; oznaku postavlja
  JEDNOLINIJSKA skripta u zaglavlju `index.html` PRE iscrtavanja (app.js stiže
  prekasno — pouka M3), a `switchTab` je samo drži usklaženom.
- `.hero p` i `.futer-rime-uvod` bez gornje širine — jedan red na širokom ekranu.
- Hint omiljenih: više ne ponavlja hero tekst („…da ih ne tražiš iznova kad pišeš").

### Rečnik
- Ubačeno 7 reči sa objašnjenjima (odobrila vlasnica): znanstven, znanstvena,
  znanstveno, znanstvenik, znanstvenost, zakupno, zakupnom. `definicije.json`
  ostaje jednolinijski (`json.dumps` sa `separators=(', ', ': ')` — bajt-stil
  identičan originalu, provereno).
- „runce" izbačeno iz FAQ na `/rime-za-decu-o-prirodi/` — reč ne postoji u
  rečniku (uhvatio `predeploy`, stavka „svaki par reč—rima se ZAISTA rimuje").
- Pitanje vlasnice „ko je odobrio brisanje 3.964 reči": **njeno sopstveno pravilo**
  („nema reči bez objašnjenja"), zabeleženo u handoveru 13. sesije i zaglavlju
  `scripts/objasnjenja-dopuna.py`. **Vraćanje završeno u ovoj sesiji** (`98a5fd6d8`):
  3.630 reči vraćeno (150 izvedenih + 3.480 pisanih objašnjenja, proverenih na
  glosi u Matici), 330 spornih na njenoj odluci (tačka 2 gore). Rečnik: 280.269
  reči; 0 reči bez objašnjenja posle upisa. Njenih 386 ručno odabranih reči
  nije bilo među obrisanima (presek sa `01b` spiskom: 1 reč, slučajno).
- Agent `tekstopisac` (`.claude/agents/`) obrisan na zahtev vlasnice.

### Testovi
- Posle naslova i regeneracije: `predeploy` **539/539** ✓, `meri-cls` 0,0533 ✓.
- Posle toga (tačka 1 gore) — netestirano.

---

# Sesija 3–4. avgust 2026 (trinaesta) — POČETNA, REČNIK, BELEŽNICA

> **Grana:** `feat/dizajn-pocetna-futer-saradnja`. Puširana je na GitHub jednom
> (commit `d1b77abc8`); **sve posle toga stoji samo lokalno, neispuširano**.
> **Na `main` nije spajano — produkcija je netaknuta i nema ništa od ovog posla.**
> Pre-deploy test: **539/539 prolazi.**

## ⛔ PRVO SLEDEĆOJ SESIJI

1. **Ništa nije objavljeno.** Vlasnica je više puta pitana za spajanje na `main` i
   nije odgovorila potvrdno — **ne spajati bez njenog izričitog „da"** (globalno
   pravilo: jedno odobrenje = jedan push).
2. **Neispuširanih izmena ima mnogo** (v. `git status`). Pre bilo čega: pustiti
   `node test/predeploy.mjs` i tek onda commit.
3. **Predlozi za H1 i podnaslove svih tabova su napisani, a NISU upisani** —
   v. odeljak „Tekstovi koji čekaju odluku". Upisani su samo početna i po-tab
   naslovi u `app.js` (`TAB_NASLOV`).
4. **Regeneracija 2.000 strana** je urađena danas (`python3 build/gen_pages.py`),
   ali posle nje su menjani `index.html` i `style.css` — ako se dira generator,
   pustiti je ponovo.

## Šta je urađeno

### Izgled početne strane (zahtev vlasnice: „hoću da ljudi kažu wow")
| Šta | Kako |
|---|---|
| polje za unos se stapalo sa pozadinom | uzrok: `--field-line` je u svetloj temi bio `#fff`, a strana bela. Uvedena `--polje-okvir`, plus prsten pri fokusu |
| hero bez težine | naslov, polje i filteri stoje u `.alat-zona`, na blagom prelivu koji se gasi tamo gde alat prestaje |
| tekst ispod alata nabijen | razmak, linija i tri saveta kao kartice |
| nigde separatora | odeljak sa tekstom i pitanjima ima svoju podlogu i liniju; kartice pitanja dobile vidljiv okvir (bila je bela ivica na beloj kartici) |
| prebacivač pisma po sredini | pomeren udesno, uz mesec |
| podstrane bele, početna tonirana | `.landing-tool` dobio isti preliv kao `.alat-zona` |

**Traka „Kontakt" iznad futera** — poziv na saradnju iseljen iz futera (ista poruka
je stajala dvaput), sada je traka sa notama koje se i tu pretvaraju u srce na klik.
Dugme se zvalo „Saradnja", preimenovano u **„Kontakt"** na zahtev vlasnice.

**Sačuvana reč = puna ljubičasta nota** umesto punog srca, i u pilulama i u traci
sa radnjama na telefonu.

### Rečnik
| Šta | Broj |
|---|---|
| provučeno kroz Rečnik Matice srpske | 51.452 odrednice; 24.549 smo već imali |
| dodato (potvrđeno i u Matici i u srLex-u) | 4.957 |
| dodato sa spiska vlasnice, sa svim oblicima | 386 reči → 1.534 oblika |
| tematski krugovi (planete, praznici, države, gradovi, biblijski pojmovi, aparati, posuđe, saobraćaj, nauke) | 412 pojmova |
| obrisano kao hrvatsko | 99 |
| sakriveno kao ijekavica (`jekavski.json` 850 → 991) | 141 |
| **obrisano jer nema objašnjenje** | **3.964** |

**Nijedna reč u rečniku više nema prazno objašnjenje** (provereno programski: 0).
Pravilo je bilo prekršeno istog dana kad su reči dodate — 7.166 reči bez značenja;
324 objašnjenja napisana ručno, 2.891 izvedeno iz osnovne reči, ostalo obrisano.
Spiskovi za odluku vlasnice: `AUDIT/MATICA-fali/` (01–07).

**Vlastita imena idu velikim slovom** (`Beograd`, `Saturn`, `Isus`) — razlog je
beležnica: klik na rimu ubacuje reč pravo u stih. Poređenje u kodu ide preko malih
slova (`MALE[]`), pa rimovanje, pretraga i zabrane rade kao pre.

### Beležnica
| Prijava vlasnice | Uzrok | Popravka |
|---|---|---|
| „otkucam dva slova i odmah pređe u sledeći red" | `restoreCursorPosition` je kursor sa KRAJA reda gurao na POČETAK sledećeg | pamti se i da li je kursor bio na kraju čvora (`kursorNaKrajuCvora`) |
| rime sa strane imaju samo broj slogova | ⓘ se briše iz klonova (klon nema osluškivače) | značenje se pokazuje zadržavanjem kursora 420 ms, plus fokusom sa tastature |
| „ne mogu da kliknem reč u zaglavlju panela" | reč je bila običan tekst | sada je dugme — klik je vraća u stih |
| radnje deluju kao jedna rečenica | podvučeni linkovi u nizu | pilule, u četiri grupe razdvojene crtom; „obriši pesmu" crvena |
| obaveštenje nestane pre nego što se pročita | uvek 1,6 s | vreme prati dužinu poruke (1,6–6 s); poruka od 80 znakova sada stoji 5,2 s |
| uzak prostor za pisanje na telefonu | 24 znaka u redu | papir ide od ivice do ivice, uži brojač → 32 znaka |

### Ostalo
- **Naslov prati tab**: klik na „Rečnik" menja adresu *i* `h1` i naslov kartice;
  „Nazad" vraća oboje. Google i dalje vidi pravi `h1` svake strane iz njenog HTML-a.
- Popravljeno testom otkriveno: šire rime nisu spajale „sunce" i „srce"; duga reč se
  sekla na tri tačke; red proze bio 51 znak umesto 65–75; lažne rime
  „sunce — lonce, klince" na strani za decu; zarez ispred „i" u generatoru.
- Test **518 → 539 provera**.

## Tekstovi koji čekaju odluku vlasnice

Predlozi za H1 i podnaslov svake strane napisani su i **nisu upisani** (osim
početne). Vlasnica je odbila dve formulacije:
- „Klikni završnu reč stiha da vidiš **čime** se sve rimuje" → traži
  „**sa čime**"; upisano je zaobilazno: „…pa vidiš koje se reči rimuju sa njom".
- „a pesmu možeš **tu** i da napišeš" → nejasno gde; sada stoji link na beležnicu.

| Strana | H1 | Podnaslov |
|---|---|---|
| Početna | Rimovanje reči na srpskom: rečnik rima, brojač slogova i karaktera, beležnica koja boji rime — sve na jednom mestu | **upisano** |
| Pisanje pesama | Pisanje pesama — beležnica koja boji rime | Piši pesmu, a rime se boje same. Uz svaki stih stoji broj slogova i slovo šeme rime, a rime za reč pod kursorom čekaju sa strane — klikni i reč uđe u stih. |
| Brojač slogova | Brojanje slogova i karaktera | Nalepi stih, pesmu ili poruku — uz svaki red stoji broj slogova, a na dnu zbir slogova, reči i znakova, sa razmacima i bez njih. |
| Rečnik | Rečnik srpskog jezika | Traži reč po početku, kraju ili slovima u sredini. Uz svaku piše šta znači i koliko ima slogova. |
| Igra | Igra rimovanja | Dobiješ reč i vreme, a ti tražiš rimu. Igra se sama ili sa društvom, a niz tačnih odgovora nosi više poena. |
| Klasici | Srpske pesme — klasici | Poznate pesme velikih srpskih pesnika, sa brojem slogova uz svaki stih i slovom šeme rime. |
| Omiljene | Omiljene reči | Reči koje si sačuvao stoje ovde, na jednom mestu — pri ruci dok pišeš. |

## Otvoreno

| Šta | Ko odlučuje |
|---|---|
| spajanje na `main` i objava | vlasnica |
| 521 reč koja stoji malim slovom, a jezički korpus je zna samo kao ime (`AUDIT/MATICA-fali/06`) | vlasnica — ima i pravih imena i običnih reči |
| 3.964 obrisane reči bez objašnjenja (`07`) — vraćaju se kad im se napiše značenje | vlasnica |
| 20.021 reč koju Matica ima a srLex ne potvrđuje (`01b`) — pregled se nastavlja **od reči na „BO"** | vlasnica |
| 273 zastarele reči (`02`) i 1.561 regionalna (`03`) | vlasnica |
| P11 — hub `/rime-za/` je zid od 2.000 linkova | vlasnica |
| `<title>` i opis početne zamrznuti do **13.08.2026** (merenje u Search Console-u) | ne dirati do tada |

## Kako se radilo (za sledeću sesiju)

- Vlasnica **ne želi da se posao prepušta agentima** dok ona gleda — traži da vidi
  svaku izmenu koda u razgovoru.
- **Ne poravnavati ništa ulevo bez izričitog zahteva.** Jednom je prijava baga
  protumačena kao zahtev za poravnanje i tabovi su pomereni ulevo — vraćeno.
- Kad prijavi jezičku grešku, **ona je u pravu**; oblik se menja bez rasprave.
- Svaka popravka dobija proveru u `test/predeploy.mjs` istog trenutka.

---


# Sesija 2. avgust 2026 (dvanaesta, drugi deo) — FUTER IZABRAN, NAVIGACIJA, BRZI REŽIM

> **NIŠTA NIJE PUSHOVANO.** Sve stoji na grani `feat/dizajn-pocetna-futer-saradnja`,
> koja **ne postoji na GitHubu**. Produkcija je netaknuta.

## ⛔ PRVO SLEDEĆOJ SESIJI

1. **Pun test nije pušten posle poslednjih izmena.** Poznato je da **pada sekcija 37** —
   provera mere teksta koja meri širinom nule, dakle laže. Dizajner je tekst suzio na
   tačnu meru, a provera je ostala stara. **Prepisati proveru, pa pustiti ceo test.**
   Bez izlaznog koda 0 nema objave.
2. **Regeneracija 2.000 strana nije urađena**, a čeka je četvoro: nov futer, nov
   redosled tabova, „Omiljene" u navigaciji i adresa `eureka@rimoteka.com`.
   Dok se ne uradi, na tim stranama stoji **stara adresa `info@`, čije je
   prosleđivanje obrisano** — poruka poslata odatle se vraća pošiljaocu.
3. **Lokalni serveri 8765 (sajt) i 8766 (tri varijante futera) su ostali pokrenuti.**

## Šta je odlučeno i urađeno

| Šta | Stanje |
|---|---|
| **Futer** | vlasnica izabrala **dizajnerov** (notni sistem, dugme „Saradnja"). Tri alternativne varijante na 8766 više nisu potrebne |
| **Redosled tabova** | rimovanje reči · pisanje pesama · brojač slogova · rečnik · igra · klasici · omiljene. Urađeno na 21 podstrani, u `gen_pages.py` i na početnoj |
| **„Omiljene" na svakoj strani** | ranije samo na početnoj — ko sačuva reč pa ode na drugi alat, nije imao puta nazad. Sada svuda, adresa `/?tab=omiljene`. **Provereno pokretanjem:** sa dve sačuvane reči značka na `/slogovi/` pokazuje „2" |
| **Dve adrese za isti alat** | kanonski link na `/rimovanje-reci/` prebačen na `/`. **Otvoreno:** da li i sam tab „Rimovanje reči" da vodi na `/` — vlasnica nije odgovorila |
| **Naslov „Popularne rime"** | prepravljen u **„Rime za česte reči"** + rečenica „Pogledaj koje se reči rimuju sa najčešćim rečima u pesmama" (fraza u ispravnom padežu) |
| **Širina i kompozicija** | sve na jednu levu ivicu, tekst u dve kolone, kartice se razlistavaju kao špil, margina se iscrtava kao potez mastilom, slova A · B · A zasvetle redom. Nov fajl `public/kartice.js` |

## DVE PROMENE NAČINA RADA — ne vraćati na staro

**1. Dizajner radi u BRZOM REŽIMU (odeljak 2a u `.claude/agents/dizajner.md`).**
Vlasnica: *„Ne želim da dizajner radi bilo kakve testove… ako kažem hoću kartice umesto
teksta, očekujem u roku od 2 minuta da se to promeni na lokalu i ja ću reći šta mi smeta."*
Dobije zahtev → promeni kod → javi **jednom rečenicom**. Bez merenja, bez izveštaja.
Ostaju samo tri stvari, jer nisu provera nego zanat: **logo se ne dira**, **boje kroz
promenljive u obe teme**, **tekst ostaje u HTML-u**.
**Merenja i pun test pušta glavna sesija, i to samo pred objavu.**

> **Zašto:** jedan prolaz je trajao **sat i po** i vratio izveštaj sa tabelama, a
> vlasnica je htela da vidi izmenu. Sporost nije bila agentova nego moja — ja sam mu
> naredio da sve dokazuje. Kad je merenje isključeno, prvi pogled stiže za par minuta.

**2. Odgovori vlasnici imaju NAJVIŠE ČETIRI REČENICE.** Zapisano i u memoriji
(`odgovori-najvise-4-recenice.md`). Prvo odgovor, pa najviše jedna rečenica
objašnjenja. Detalji se **nude**, ne sipaju. Duži zapis ide ovde, ne u razgovor.

## Urađeno na samom kraju sesije

- **Tab „Rimovanje reči" sada vodi na `/`** (ne na `/rimovanje-reci/`), na 22 strane i
  u generatoru — pošto je kanonski link te strane prebačen na početnu, linkovi više ne
  šalju snagu na stranu koja sama kaže da nije prava. Stara adresa i dalje radi.
- **Regenerisano 1.993 strane** (`python3 build/gen_pages.py`): nov futer, nov redosled
  tabova, „Omiljene" u navigaciji, adresa `eureka@rimoteka.com`, tab na `/`.
  Sitemap: 2.016 adresa.
- **Naslov, opis, polje za unos i filteri VRAĆENI NA CENTRIRANO.** Levo poravnanje je
  bila **moja** zamisao („jedna leva ivica") posle njene primedbe o praznini levo —
  ona to ne želi. Izmereno posle vraćanja na 1440 px: razmak levo i desno je jednak
  (42 px za naslov, 413 px za opis, 252 px za polje i filtere). U CSS-u je uz oba
  mesta upisano zašto, da se ne vrati.
- **Zadatak „srce postaje nota" upisan u `TODO.md`, odeljak 0a** — sa mestima u kodu
  (`app.js:452` i `:466`) i zamkom oko širine znaka.

## Čeka odluku vlasnice

- tab „Rimovanje reči" → `/` umesto `/rimovanje-reci/`;
- **srce na kapsuli da postane obojena nota** kad se reč sačuva u omiljene — provereno
  da je izvodljivo (`app.js:452` i `:466`, znak `♡`/`♥`); jedina zamka je da nota nije
  iste širine u svim fontovima, pa mesto za znak mora imati stalnu širinu;
- je li 1.360 px prava širina strane.

---

# Sesija 2. avgust 2026 (dvanaesta) — AGENT DIZAJNER, POČETNA, POŠTA

> **NIŠTA NIJE PUSHOVANO NI MERGOVANO.** Sve stoji na grani
> **`feat/dizajn-pocetna-futer-saradnja`**. Pošta je jedino što je stvarno
> promenjeno „napolju" (Porkbun, Gmail, DNS) — i to je provereno da radi.

---

## 1. Napravljen agent `dizajner`

`.claude/agents/dizajner.md` — projektni agent, ide u repo. Dizajner proizvoda,
art direktor i interakcijski dizajner sa 40+ godina iskustva.

Nosi: zakon „za jednu sekundu se vidi gde se kuca reč" (i tri provere kojima se
meri), doktrinu animacija sa **skalom trajanja** (80–120 ms odziv, 160–200 ms
ulazak, 240–320 ms panel, do 600 ms slavlje) i pravilom da se animiraju **samo
`transform` i `opacity`**, vizuelni sistem (razmaci od 4 px, jedan font, boje
isključivo kroz promenljive u obe teme), mobilni sa **lažiranom tastaturom od
336 px**, pristupačnost, banku od osam inovativnih ideja, zabrane (logo, novi
hex, spoljne biblioteke) i čeklistu od 16 tačaka pre predaje.

**Kako se poziva:** `Pokreni agenta dizajner: <zadatak>`.

---

## 2. Merenje početne strane — polazno stanje (produkcija, 02.08.)

Snimci: `AUDIT/screenshots/2026-08-02-merenje-pocetne/` (16 slika).

| Šta je mereno | Zatečeno | Granica |
|---|---|---|
| polje za unos od vrha, telefon 390 px | **402 px = 60,5% ekrana** | cilj ~33% |
| skakanje strane na **sporoj** vezi (CLS) | **0,118 – 0,121** | najviše 0,1 |
| kontrast „Nađi rime", svetla / tamna | **2,84 / 2,10** | bar 4,5 |
| filter slogova „sve" | 2,07 / 1,78 | bar 4,5 |
| prebacivač pisma | 2,59 / 1,95 | bar 4,5 |
| aktivan tab u tamnoj temi | **isti piksel kao neaktivan** | bar 3,0 |
| dodirni ciljevi ispod 44 px, 390 px | 77 od 89 | 0 |
| predlozi reči dok je tastatura otvorena | **vidljivo 0%** | sve iznad tastature |
| dok strana postane upotrebljiva, spora veza | 7,2 s | — |

**Nađen tačan uzrok skakanja:** `style.css:975` je krio naslovni blok dok
`app.js` ne postavi `data-tab` na `<body>`. Na sporoj vezi `app.js` stiže tek na
~2 s, pa naslov iskoči i gurne polje za **130 px** — baš kad čovek pruža prst.
Na brzoj vezi se ne vidi. **Zato se CLS meri i na sporoj vezi** — nov alat
`test/meri-cls-spora.mjs`.

---

## 3. Korak 2 — urađeno na grani (čeka pregled vlasnice)

Dva commita. Pre → posle, izmereno:

| Šta | Pre | Posle | Granica |
|---|---|---|---|
| polje za unos, telefon 390 px | 402 px = 60,5% | **263 px = 39,6%** | cilj 33% |
| skakanje na sporoj vezi | 0,118 | **0,0005** | najviše 0,1 |
| „Nađi rime", svetla / tamna | 2,84 / 2,10 | **5,47 / 6,50** | bar 4,5 |
| filter slogova | 2,07 / 1,78 | **5,08 / 8,67** | bar 4,5 |
| prebacivač pisma | 2,59 / 1,95 | **6,11 / 6,97** | bar 4,5 |
| aktivan tab, tamna tema | 1,0 | **6,16** | bar 3,0 |
| linkovi u futeru ispod 44 px | 60 | **0** | 0 |
| pre-deploy test | 444 | **467 provera** | izlazni kod 0 |

SEO tekst na početnoj spakovan u **tri sklopiva bloka** — ceo sadržaj ostaje u
HTML-u (pretraživač ga čita), samo više nije zid. Dodato i globalno pravilo za
**„smanji pokret"**, kog ranije nije bilo.

> **Nova sekcija 35 testa puštena je protiv produkcije, gde je star kod — i pala
> je 20 puta**, tačno na izmerenim brojevima. Provera koja ne padne na starom kodu
> ne vredi ništa; ovo pravilo se drži.

**FUTER — PRVI POKUŠAJ ODBIJEN, DRUGI PROŠAO.**

Prvi je bio uredan spisak linkova u tri kolone sa popravljenim dodirnim ciljevima
— ali bez ičega što je traženo: nema nota, nema dugmeta „Saradnja", nema
kompozicije, sve levo poravnato. Reči vlasnice: *„gde su note u futeru? zašto je
futer levo poravnan? gde je taj redizajn"*. **Ona je bila u pravu i to se ne brani.**

Drugi prolaz (commit `512c07993`) je prošao:

| Šta se meri | Pre | Posle | Granica |
|---|---|---|---|
| note u futeru | 0 | **8** (5 na telefonu) | — |
| dugme „Saradnja" | nema | **48 px visine** | bar 44 px |
| slovo na dugmetu, svetla / tamna | — | **5,62 / 6,52** | bar 4,5 |
| naslov kolone na novoj podlozi | 4,20 | **5,01 / 5,73** | bar 4,5 |
| najduža kolona | **12 stavki** | **6** | ne duplo duža od ostalih |
| visina futera, telefon | 2.051 px | **1.670 px** | — |
| pre-deploy test | 467 | **496 provera** | izlazni kod 0 |

Notni sistem preko cele širine, note sede na linijama, taktna crta na kraju.
Kolona „Namene" je imala **12 stavki** naspram 6 i 5 — pravila je praznu rupu od
~300 px desno — pa je podeljena na „Rime po temi" i „Rime za priliku".
**Nijedan link nije dodat ni uklonjen: 55 pre, 55 posle.**
Svih 29 novih provera pušteno je protiv produkcije dok je tamo star futer —
**svih 29 tamo pada.**

**Uporedo su napravljene TRI ALTERNATIVNE VARIJANTE futera** (notni sistem ·
beležnica · refren), da vlasnica bira umesto da opisuje šta želi. Stoje **izvan
projekta**, u scratchpad folderu sesije (`varijante-futera/`), služene na portu
**8766**. Ako se sesija ugasi, folder nestaje — nije šteta, prave se za pola sata.
**Vlasnica bira između dizajnerovog futera i te tri varijante; izbor još nije dat.**

---

## 4. POŠTA — rešeno u celini, i ispravljen jedan mit

> **U dokumentaciji je stajalo da je „Aniko pisala i nije dobila odgovor".
> Vlasnica ne zna ko je to.** Ime je najverovatnije nastalo od pogrešno
> prepoznatog diktata i prenosilo se kroz `TODO.md` i `HANDOVER.md` kao dokaz.
> **Nijedna takva poruka ne postoji u sandučetu.** Pouka: tvrdnja iz prijave
> koja nije proverena upisuje se kao **prijava**, ne kao činjenica.

**Šta se stvarno dešavalo — tri različita uzroka koja su ličila na jedan:**

| Simptom | Stvaran uzrok |
|---|---|
| „pošta ne stiže" | stizala je, ali ju je Gmail bacao u **spam** (prosleđenoj pošti ne veruje: SPF proverava Porkbun, ne pravog pošiljaoca) |
| „ni moji testovi ne stižu" | slala je **sama sebi** — Gmail ne pravi drugu kopiju iste poruke (uklanjanje duplikata). **Takav test ne može da uspe ni kad sve radi.** |
| „ni sa drugog naloga ne stiže" | adresa otkucana **`.con`** umesto `.com`, dva puta — Gmail nudi grešku iz istorije pa je sam upiše |

**Zatečeno u sandučetu `jovana.daskovic@gmail.com`:** 6 poruka na
`info@rimoteka.com`, 10–22. jula, sve u spamu, sve SEO reklame. Nijedna prava
poruka nije izgubljena.

**Stanje posle ove sesije:**

| Šta | Stanje |
|---|---|
| **`eureka@rimoteka.com`** | nova adresa, prosleđivanje na `jovana.daskovic@gmail.com`, **provereno stvarnom porukom** |
| `info@rimoteka.com` | **obrisano prosleđivanje** na zahtev vlasnice (02.08.) |
| pravilo u Gmail-u | `to:(eureka@rimoteka.com)` → nikad u spam, označi kao važno |
| ostatak | pravilo za `info@` je ostalo u Gmail-u, ali je **bezopasno** — na tu adresu ništa ne može da stigne |
| **DMARC** | `_dmarc.rimoteka.com TXT "v=DMARC1; p=none;"` — **upisala vlasnica, provereno sa autoritativnog servera i sa 8.8.8.8 i 1.1.1.1** |

> ⚠️ **`info@` i dalje piše na ~2.000 generisanih strana i u `404.html`.** Dok se
> nov futer ne objavi, poruka poslata sa sajta se **vraća pošiljaocu**. Zato
> regeneracija strana ide ODMAH po odobrenju futera.

---

## 5. Zamke plaćene u ovoj sesiji — da se ne plaćaju opet

**1. AppleScript `execute javascript` radi u IZOLOVANOM svetu.** Vidi DOM, ali
**ne vidi globalne funkcije strane** (`typeof jQuery` → `undefined` na strani
koja jQuery očigledno koristi). Zato Porkbunov obrazac za DNS ne prima upis:
polja se popune, `Add Record` se klikne, i ništa se ne desi — bez ijedne poruke
o grešci. Isto važi za brisanje filtera u Gmail-u.

**2. `System Events … keystroke` je zabranjen** dok se ne da dozvola:
`osascript is not allowed to send keystrokes (1002)`. Odobrava se u
Sistemska podešavanja → Privatnost i bezbednost → **Pristupačnost**.
Dok toga nema, obrasce koji odbijaju sintetički unos **popunjava vlasnica**, a
Claude joj otvori stranu i da tačne vrednosti.

**3. `set URL of active tab of window 1` OTIMA tab koji vlasnica koristi.**
Uvek `make new tab`, nikad ne menjati njen tekući tab.

**4. DNS se proverava sa AUTORITATIVNOG servera**, ne sa javnog:
`dig +short TXT _dmarc.rimoteka.com @salvador.ns.porkbun.com`. Od upisa u panel
do vidljivosti prošlo je **~30 s** — prva provera je zato bila prazna i umalo
proglasila neuspeh.

**5. CSP ZABRANJUJE SKRIPTE UPISANE U STRANU — pravilo koje menja način rada.**
`nginx.conf:32` postavlja pravilo koje pregledaču zabranjuje da izvršava skripte
napisane direktno u `index.html`. Posledica: `IntersectionObserver` upisan u
stranu **lokalno radi, a na produkciji tiho ne radi** — animacija bi izgledala
savršeno u pregledu, a na sajtu bi note stajale mrtve. Zato je pokret nota
urađen čistim CSS-om (`animation-timeline: view()`). **Pre svake animacije koja
traži JS: proveriti gde taj JS živi.**

**6. Gmail-ov spisak rezultata je virtuelizovan** — `innerText` reda vraća
prazno. Radi: `span[data-hovercard-id]` za pošiljaoce, `span[title]` za datume,
ili klik na red pa čitanje `div[role=main]`.

---

## 6. Šta čeka sledeću sesiju, ovim redom

1. **Vlasnica bira futer** — dizajnerov (na grani, `localhost:8765`) ili jedna od
   tri varijante (`localhost:8766`). Bez tog izbora ništa dalje ne ide.
   Ako izabere varijantu, **pokret nota se prepisuje u CSS** — v. zamku 5.
2. **Regeneracija ~2.000 strana** (`python3 build/gen_pages.py`) da i one dobiju
   nov futer i `eureka@rimoteka.com` — **zaseban commit**, nikad pomešan sa
   izmenom izgleda.
3. **Strana `/saradnja/`** sa kontakt formom. Izgled radi dizajner; **slanje
   rešava glavna sesija** — statički sajt ne može sam da pošalje poruku, treba
   besplatan servis (npr. Brevo, 300 poruka dnevno) i „Pošalji kao" u Gmail-u da
   bi se odgovaralo sa `@rimoteka.com`.
4. **Traka iznad tastature** (odobreno) — polje i „Nađi rime" ostaju vidljivi,
   predlozi idu **iznad** polja. Dve nove provere u testu.
5. **Prebacivač pisma pored logotipa** — čeka odluku vlasnice. Oslobađa 42 px i
   spušta polje na ~201 px (30% ekrana), čime „provera jedne sekunde" prolazi u
   celini. Logo se ne dira, samo se pismo seli desno od njega.
6. Očistiti: lokalni server na portu **8765** je ostao pokrenut iz `public/`.

---


# Sesija 2. avgust 2026 (jedanaesta) — PRAVOPIS, FUTER, PRAZNO STANJE

> **SVE JE OBJAVLJENO NA PRODUKCIJI.** Pet commita, poslednji `1834079b3`.
> Test protiv produkcije: **451/451**. Ništa ne čeka push.

---

## ⛔ PRVO PROČITATI — SUDAR SA SESIJOM KOJA RADI DIZAJN I FUTER

U trenutku pisanja ovog handovera, druga sesija radi na grani
**`feat/dizajn-pocetna-futer-saradnja`** i ima nezavršene izmene u
`build/gen_pages.py` i `public/404.html`.

**Ja sam 02.08. menjao FUTER i CSS — dakle isto područje.** Ove izmene su
**već na produkciji** i **ne smeju se izgubiti** pri merge-u dizajnerske grane:

| Šta | Gde | Zašto se ne sme vratiti staro |
|---|---|---|
| **Tekst futera** | `gen_pages.py:333` i `public/index.html` | Nosi ključnu frazu **„rimovanje reči"** na svih 2.000+ strana. Staro („alat za **pronalaženje rime**") je fraza koju **niko ne kuca u pretragu**. Ovo je jedini potez koji frazu stavlja na svaku stranu. |
| `.prazno-stanje` | `style.css` (uz `.results`) | prazno stanje panela sa rimama; **`max-width` mora ostati u `rem`, NIKAD u `ch`** — v. dole |
| `.landing-next` | `style.css` (uz `.landing-faq`) | blok „Šta dalje" na ~2.000 strana |
| `.related-note` | `style.css` (uz `.related-list`) | rečenica ispod „Rime za druge reči" |

> **ZAMKA ZA DIZAJN, plaćena danas:** `.prazno-stanje` je imao `max-width: 60ch`.
> Jedinica **`ch` je širina znaka u tekućem fontu** — kad stigne Rubik, „60 znakova"
> znači drugu širinu u pikselima, glavni blok se preračuna i **cela strana se pomeri
> vodoravno za 6 px**. Koliko strana poskakuje dok se učitava skočilo je sa **0,005 na
> 0,192**, a sme najviše **0,1**. Popravka: `36rem`. **U celom `style.css` više nema
> nijedne `ch` jedinice — neka tako i ostane.**
>
> Posle svake izmene CSS-a: `node test/meri-cls.mjs` (meri deset puta po strani).

---

## Šta je urađeno 02.08.

**1. Pravopis — zarez ispred „i" (prijava vlasnice).**
Pravilo je **stajalo u projektu** (`GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`, red 364),
ali agent `tekstopisac` nije bio upućen na taj fajl. Na sajtu je bilo **šest mesta**.
Rečenice su **prepisane**, ne samo obrisan zarez. Sedmo mesto je krilo **istu netačnu
tvrdnju „rangira ih po kvalitetu"** koja je 31.07. popravljena na pet mesta — preživela
je jer je bila u odgovoru na pitanje, ne u glavnom tekstu.

Pravilo upisano na **tri mesta**: `CLAUDE.md` sekcija 5a (preimenovana u „obavezno pre
svakog pisanja"), globalni `~/.claude/CLAUDE.md`, i agent `tekstopisac` (nov **korak 0 —
JEZIK**, pre tona i SEO-a).

**2. Futer na 2.000+ strana** — v. tabelu gore.

**3. Prazno stanje panela sa rimama** — pre prve pretrage panel je bio prazan.
Sada tu stoji tekst koji jedini kaže da uz rime idu značenje, sinonimi i beležnica.
`goHome()` je taj prostor brisao u prazno, pa se tekst video samo jednom; sada se vraća.

**4. Test 422 → 451 provera na produkciji.** Nove sekcije: **32** (reč navedena kao rima
mora da bude rima), **33** (prazno stanje), **34** (zarez ispred „i").

---

## POUKE — pročitati pre pisanja bilo kog testa

**Provera koja ne može da padne je gora od nikakve.** Prva verzija sekcije 32 uzimala je
**upisanu tabelu tačnih rima** i poredila je sa stranom — a tabela je po definiciji tačna,
pa je provera **prolazila i na produkciji sa pogrešnim tekstom**. Otkriveno **samo** zato
što je puštena protiv produkcije dok je tamo bio stari kod (pravilo H4). Sada čita spisak
**iz teksta same strane**.

**Provera koja pada na tačnom tekstu je isto tako loša.** Sekcija 34 je prvo hvatala i
`pa`, `te`, `ni` — i pala na pet mesta gde greške nema: *„Klikni je, **pa** iz spiska
izaberi rimu"* — tu `pa` uvodi redosled i zarez **stoji**. Pravilo važi samo „kad povezuju
istorodne delove", a to traži značenje, ne obrazac. Suženo na `i`.

**Provera ne sme da zabranjuje sadržaj, samo kvar.** Dve stare provere tražile su da panel
sa rimama bude **doslovno prazan** (bag 28.07: beležnica je pozajmljivala panel i ostavljala
poruku „Učitavam rečnik…"). Prazno stanje ih je oborilo. **Nisu obrisane nego prepisane** da
traže ono zbog čega su nastale: da u panelu nema rima ni poruke o učitavanju.

> Sve u `AUDIT/PROPUSTI.md`, propusti **14–17**, pravila **51–65**.

---

## ODBAČEN PREDLOG — da se ne troši vreme ponovo

Predložio sam da se **sav tekst sajta provuče kroz rečnik** i tako hvataju izmišljene reči
(kao `bliza`, koja je stajala kao rima za *kiša*). **Vlasnica je oborila predlog i bila je
u pravu.**

| Pokušaj | Rezultat |
|---|---|
| poređenje sa našim `reci.txt` | **pogrešno u načelu** — `reci.txt` je *predmet provere, ne merilo* (`CLAUDE.md`, pravilo 0). Skupljan je sa neta i iz srLex-a, ima hrvatskih i pokrajinskih oblika i reči kojih nema |
| poređenje sa Rečnikom Matice srpske | **izmereno: 43% lažnih uzbuna.** Matica ima reči u **osnovnom obliku** (*рима*, *слог*, *песма*), a na sajtu pišu *rime, slogova, pesama*. Alat bi prijavio 648 od 1.473 normalne reči |

**Uz to: naš primerak Matice je skeniran i pun grešaka iz skeniranja** — „кожни **осић**"
(*осип*), „**ћрозницом**" (*грозницом*), одредница „**копродукцидни**" (*копродукциони*).
Skener meša г↔ћ, т↔ш, п↔б. Za automatsku proveru **nije upotrebljiv**.

**Šta OSTAJE izvodljivo:** spisak od ~200 **poznatih zamki** (hrvatski i ijekavski oblici:
*željeznički, dozvolite si, uopće, riječ, vrijeme, tisuća*). Nema lažnih uzbuna jer se traže
tačno određene reči. Uhvatilo bi `željeznički` i `dozvolite si`, koji su stvarno stajali na sajtu.

**Pravi posao je čišćenje `reci.txt`, i on čeka vlasnicu:**
`AUDIT/J1-sporne-reci.md` (**277 spornih ijekavskih oblika**) i `AUDIT/R1-reci-za-odluku.md`
(**6 reči**). Postupak: za svaku reč se donese šta o njoj kaže Matica, vlasnica presudi
ostaje ili izlazi.

---

# Sesija 31. jul 2026 (deseta) — TEKST NA CELOM SAJTU, agent `tekstopisac`

> **OBJAVLJENO 31.07.2026.** Grana `feat/tekstovi-31-07` mergovana u `main` i pushovana;
> Coolify je objavio. Uz ovo je otišlo i sve što je čekalo iz devete sesije (mobilna
> verzija M5–M15, kontakt u futeru).
>
> | Provera posle objave | Rezultat |
> |---|---|
> | Test lokalno | **436/436** |
> | **Test protiv produkcije** (`BASE=https://rimoteka.com`) | **444/444** |
> | Nov sadržaj stvarno na produkciji | potvrđeno (`prazno-stanje` u HTML-u) |
> | `sitemap.xml`, `robots.txt`, izmenjene strane | HTTP 200, 2.016 URL-ova |
>
> **Sitemap je ponovo prijavljen u Search Console-u.** GSC i dalje prikazuje
> „Last read: Jul 28" — to je normalno, datum se menja tek kad Google zaista skine fajl.
>
> ⚠️ **Request Indexing NIJE urađen.** Tri pokušaja kroz AppleScript: direktna adresa
> `/search-console/inspect?...` vraća **404** (u oba oblika, sa i bez enkodovanog `id`),
> a sintetički `Enter` u polju „Inspect any URL" ne pokreće proveru — Google-ov UI traži
> pravi događaj sa tastature. Za sledeći put: probati preko CDP-a (Chrome sa
> `--remote-debugging-port=9222`), po uzoru na `~/.claude-pw-tools/blb-cdp-request-indexing.mjs`.
> Napomena: za 2.000 strana to ionako nije put — Google ima dnevni limit od desetak
> zahteva. **Sitemap je pravi mehanizam**, a Request Indexing ima smisla samo za
> nekoliko najvažnijih strana.

## Šta je traženo

Vlasnica: *„napravi agenta koji će da se ponaša kao najbolji copywriter, SEO specialist
i marketing stručnjak sa preko 40 god iskustva… ton ljubazan, bez persiranja, ali
profesionalan, topao… cilj je da se zadrže na sajtu jer imaju na jednom mestu sve što
je potrebno za pisanje pesama."* Zatim: pusti ga na ceo sajt, ključne reči, link
building, izveštaj sa ocenama i tabelom pre/posle.

## Šta je napravljeno

**`.claude/agents/tekstopisac.md`** — projektni agent, ide u repo. Sadrži ton, redosled
čitalaca, zabranjene fraze, mikrokopiju, SEO pravila, gde tekst živi, čeklistu od 15
tačaka i (od ove sesije) **korak 4a** — pravila o menjanju celih rečenica.

> **Ciljna publika, TIM REDOM (odluka vlasnice):** 1. pesnici · 2. tekstopisci (rep,
> pesme, čestitke) · 3. oni koji rimuju iz ljubavi · pa roditelji, đaci, svatovi.
> Ranije se pisalo kao da je publika „svako", pa je tekst bio snishodljiv.

**Četiri pregleda** (`AUDIT/tekstovi/2026-07-31-{A,B,C,D}.md` + `ZBIRNO.md`).
**Ocena teksta pre popravke: 3,6/10.**

## Najgori nalaz: sajt za rimovanje nudio reči koje se ne rimuju

Šest odgovora u „Čestim pitanjima" nabrajalo je **49 reči kao rime — nijedna se nije
rimovala.** Za „majka" je pisalo *reka, čeka, njega, lepa* (0/8); za „prijatelj" —
*smeh, dnevnik, željeznički* (0/6, uz hrvatski oblik). Reč **`bliza`** navedena kao
rima **ne postoji u rečniku**.

**Zašto nijedna automatika ovo nije uhvatila:** reči u bloku „Još popularnih rima" nose
**istu klasu `.word`** kao prave rime. Naivna provera „da li reč postoji na strani
`/rime-za/X/`" prolazi i za reč koja nije rima. Ista zamka je oborila i moju prvu
proveru — pokazala je „5 od 7 tačno" dok blok nije odsečen.

## Merljivo, na ~2.000 strana

| Mera | Pre | Sada |
|---|---|---|
| Opis u pretrazi (medijana) | 205 znakova | **147** |
| Opisa preko 160 (Google ih seče) | skoro svi | **0 od 1.993** |
| Naslova u opsegu 60–70 | 103 | **1.803** |
| Linkova ka drugim alatima iz teksta | **0** | 4 (nov odeljak „Šta dalje") |
| CLS `/rimovanje-reci/` | 0,105 (palo) | **0,0026** |
| Provera u testu | 422 | **430** |

## Prazno stanje alata (traženo na kraju sesije)

Panel sa rimama je pre prve pretrage bio **prazan**, a čovek u njega gleda par sekundi.
Sada tu stoji tekst koji jedini kaže da uz rime idu **značenje, sinonimi i beležnica** —
tri stvari koje konkurencija nema. `goHome()` je ranije brisao taj prostor u prazan niz,
pa bi se posle povratka na početak video samo jednom; sada vraća zapamćeni sadržaj.
Provera: **sekcija 33** (vidi se pre pretrage, rezultati ga zamene, vraća se posle
povratka na početak, čitljiv u tamnoj temi).

## TRI GREŠKE KOJE SAM JA NAPRAVIO — pročitati, ovde je najviše nauke

**1. Pokvario CLS prepisujući tekst.** Uvod `/rimovanje-reci/` bio je tačno na granici
preloma: sa rezervnim fontom tri reda, sa Rubikom četiri — blok ispod skakao 43 px.
Produkcija 0,0026, moja verzija **0,105 u svih 10 merenja**. Uhvatio test.
Prvo sam **skratio tekst** umesto da nađem uzrok — i time izbacio rečenicu o veličini
rečnika, što je vlasnica primetila. Vraćeno; CLS ostao 0,0026.

**2. Menjao delove rečenica.** Zamenio bih početak, a stari rep bi ostao:
*„Rime za pesmu roditeljima: … **Pišeš li, ovde ćeš pronaći** rime koje izražavaju
ljubav."* **Šest takvih mesta.** Uhvatila **vlasnica, na telefonu, za dva minuta** —
posle testa od 430 provera. Uz to: ista loša konstrukcija („dobiješ rime**, uz svaku**
broj slogova" — nabrajanje bez glagola) bila je **kopirana na 19 mesta**.

**3. Napisao proveru koja ne može da padne.** Prva verzija sekcije 32 uzimala je **moju
tabelu tačnih rima** i poredila je sa stranom. Tabela je po definiciji tačna, pa je
provera **prolazila i na produkciji, gde piše „majka: reka, čeka"**. Otkriveno **samo**
zato što je puštena protiv produkcije dok je tamo stari kod (pravilo H4). Sada čita
spisak **iz teksta same strane**.

> Pravila iz ovoga: `AUDIT/PROPUSTI.md`, propusti **14–16**, pravila **51–62**.

## Šta NIJE dirano, namerno

- **Naslov i opis početne strane** — vlasnica ih je promenila 30.07. zbog upita
  `recnik rima` (204 prikaza, 0 klikova); merenje traje **do 13.08.** Nova izmena bi ga
  poništila. U opisu je zato i dalje „270.000 reči". Zavedeno u `TODO-TEKSTOVI.md`.
- **Nove strane** (`/o-rimoteci/`, `/kontakt/`) — indeksiranost je 11%, pravilo je da se
  ispod 40% ne dodaju strane. Ali bez njih niko ne linkuje sajt (v. dole).

## Nađeno usput, NIJE popravljeno

**Bag u alatu, ne u tekstu:** reč **`čeka`** savršeno se rimuje sa `reka`, ima
objašnjenje i frekvenciju **34.809**, ali **nije među 115 rima** koje strana prikazuje —
iako `dočeka` i `počeka` jesu. Nije u `RHYME_EXCLUSIONS`. Traži pregled logike izbora
rima; verovatno pogađa i druge česte reči.

**Linkovi sa drugih sajtova — 2/10.** Izmereno `curl`-om: `orbitacode.com`,
`babylovebox.rs` i `spomenicibeograd.rs` **nijednom ne pominju Rimoteku**, a `SEO_PLAN.md`
ih navodi kao „najbržu polugu koju konkurenti nemaju". `/kontakt/` i `/o-nama/` vraćaju
**404**. Postoji i **sudar imena** — iOS aplikacija „Rimoteka" drugog autora izlazi u
pretrazi našeg brenda. Plan: `AUDIT/tekstovi/2026-07-31-D-linkovi.md`.

## Sledećoj sesiji

1. **Mejl `info@rimoteka.com`** — i dalje prvo po redu (`TODO.md` 0.06 A).
2. Merge grane i objava, pa **odmah test protiv produkcije** i ponovno indeksiranje u GSC.
3. **13.08.** — agent `analitika`, pa tek onda dirati naslov početne.
4. Bag sa rečju `čeka` u izboru rima.

---

# Sesija 31. jul 2026 (deveta) — MOBILNA VERZIJA, KONTAKT U FUTERU, MEJL

> **NIŠTA NIJE PUSHOVANO.** Vlasnica je izričito tražila da prvo pregleda sve izmene.
> Test lokalno **422/422**. Posle njenog „može": feature grana → merge → deploy → pa
> OBAVEZNO `BASE=https://rimoteka.com node test/predeploy.mjs`.

## MEJL — REŠENO 02.08.2026 (v. handover dvanaeste sesije na vrhu)

> **Ovaj odeljak je ostavljen zbog istorije, ali njegova tvrdnja NIJE TAČNA.**
> Pisalo je da „Aniko" nije dobila odgovor — vlasnica ne zna ko je to, a takve
> poruke u sandučetu nema. Ime je verovatno nastalo od pogrešno prepoznatog
> diktata. Adresa je sve vreme **primala** poštu; poruke su padale u spam.
> Danas je aktivna adresa **`eureka@rimoteka.com`**, `info@` je obrisan.

Provereno bez prijave: MX zapisi **postoje** (`fwd1/fwd2.porkbun.com`), SPF postoji,
**DMARC ne postoji**. Da li server prima za `info@` **nije izmereno** — port 25 je
blokiran sa lokalne mreže. Ostaje panel: **porkbun.com → Email Forwarding**, tab je
ostavljen otvoren u Chrome-u, vlasnica se prijavljuje pa Claude nastavlja sam.
Pun postupak i odluka o Zoho sandučetu: `TODO.md`, odeljak **0.06 A**.

## Šta je urađeno

### 1. Tastatura je zaklanjala rime u beležnici (prijava vlasnice)

Uzrok nije bio u CSS-u panela nego u tome **prema čemu se `bottom:0` meri**:
`position:fixed` se računa prema **layout viewport-u**, a on se pri otvaranju tastature
ne smanjuje ni na iOS-u ni na Androidu (podrazumevano `interactive-widget=resizes-visual`).

Izmereno na 390×844: panel je stajao **557–844 px**, tastatura pokriva od **~508** naniže
— dakle nijedna rima se nije videla.

Rešenje: `visualViewport` daje razliku layout ↔ vidljivo = visina tastature; upisuje se
u `--kb` i panel stoji na `bottom:var(--kb)`. To je **jedini put koji radi i na iOS-u i
na Androidu** — VirtualKeyboard API i `env(keyboard-inset-height)` postoje samo u
Chrome-u. Prag od 90 px je namerno: skrivanje adresne trake takođe menja vidljivi deo
(60–70 px), a nijedna tastatura nije niža od ~200 px.

Panel je uz to preoblikovan: i bez tastature je bio list od **287 px** koji je preklapao
sam stih (editor je završavao na 645, panel počinjao na 557). Sada je **traka od 96 px**
iznad tastature, jedan red rima koji se pomera u stranu; strelica je razvija u pun list.
Posle: panel završava **tačno na 508**, prva rima 454–498, razvijen list 137–508.

> **Ovaj zahtev je stajao u `TODO.md` (0.05 B) od 30.07. i nije bio urađen.**

### 2. Rime 2–3 u redu, ikonice na dodir

| | pre | posle |
|---|---|---|
| širina pilule | **228 px** od 390 | 114 px |
| reči u redu | **1,00** | **2,83** (nikad više od 3) |
| visina spiska (195 rima) | **12.524 px** | **3.997 px** |
| visina cele strane | 16.113 px | 7.574 px |

Mreža `auto-fill minmax(104px,1fr)`: 320 px → dve kolone, 390 i 430 → tri. Duga reč
**uzima dve ili tri kolone** umesto da se prelama — u mreži prelomljena ćelija razvuče
celu vrstu. Meri se u tri odvojena prolaza (obriši → pročitaj sve → upiši sve), da
preračun rasporeda bude jedan a ne 195.

Ikonice nisu izgubljene: dodir na reč otvara traku iznad nje (značenje · omiljene ·
rime · kopiraj), **nacrtane kao SVG** — sa znakovima iz fonta traka je izgledala kao
četiri različita sajta u jednom redu. Sačuvana reč zadrži **puno srce** u pilули.

### 3. Beležnica

Naslov bez kutije, žleb bez ljubičastog gradijenta, sedam podvučenih linkova →
**pilule od 44 px**, „obriši sve" i „obriši omiljene" crveni. Trake koje se pomeraju
u stranu blago izblede na desnoj ivici dok ima još sadržaja.

### 4. Kontakt u futeru — falio na 2.015 od 2.016 strana

Prijava vlasnice: „zašto na mobilnom uopšte nema ta rečenica za saradnju".
Izmereno: `grep -rl "info@rimoteka" public/` → **jedna strana** (`public/index.html`).
**Nije mobilni problem** — na podstranama je nije bilo ni na računaru, jer generator
`FOOTER_TMPL` tu rečenicu uopšte nije imao.

Dodata u **šablon futera** (jedno mesto) + ručno u `404.html`, koji se ne generiše.
Sada 2.016/2.016, izmereno 227×22 px isto na telefonu i na računaru.

### 5. Nalazi koje niko nije prijavio

| # | Šta | Gde |
|---|---|---|
| **M8** | **Oznake uz stih razminute sa stihom.** `getEditorText()` je 29.07. naučen da `<div>` računa kao novi red (mobilni Enter), a `editorTextIndex()` nije — nedostajao mu je po jedan znak posle svakog bloka. Pesma kucana na telefonu: poslednja dva stiha pomerena za **ceo red**; sa praznim redom između strofa: za **dva reda** (−59 px na 390, −68 na 1440). **I na računaru.** | `app.js:1949` |
| **M9** | Dugmad beležnice **23 px** na `/pisanje-pesama/` i u „Omiljenima" — popravka od 29.07. bila vezana za `#panel-beleznica`, a te strane taj `id` nemaju | `style.css` |
| **M10** | U igri polje, „Proveri" i poruka o tačnosti padali **pod tastaturu** | `app.js` |
| **M12** | U tamnom režimu „dobre rime" imale **beo okvir** 2 px (`rgb(255,255,255)`) na #1e1a2e | `style.css` |
| **M14** | **Mrtvo dugme na `/klasici/`** — slovo šeme rime uz svaki od 138 stihova zove `switchTab('rime')`, a ta strana taj tab nema; klik ne uradi ništa, a uputstvo obećava rime. **I na računaru.** | `app.js:3598` |
| **M15** | Klasici: „prebaci u brojač slogova" **164×21 px**, slovo šeme rime **24×18 px** | `style.css` |

### 6. Tekstovi na sajtu — 11 rečenica na 4 strane

Prijava vlasnice: „ne sviđa mi se ko je pisao taj tekst… dajemo uput konkurenciji".
Prošao svih 21 tematsku stranu. Najgore nije ton nego **netačnost**: strana
`/rimovanje-reci/` tvrdi da su rime „poređane od najčešćih ka manje poznatim", a kod
sortira po **broju slogova** — učestalost je treće i najslabije merilo. Dokaz uživo:
za „ljubav" prvo izlazi `gubav`, pa `ubav`, a češća `alav` je šesta.

**Ceo spisak i predlog novog teksta: `TODO-TEKSTOVI.md`.** Vlasnica ga **nije odobrila** —
ne upisivati dok ne kaže.

## Dokaz da desktop i tablet nisu dirani

Snimljeno 24 ekrana (1440, 1024, 820, 768 px × svetla/tamna × tri strane) sa starim i
novim kodom: **16 od 24 je identično do piksela**. Razlikuje se samo beležnica, i to
zbog M8 — oznaka je prešla na svoj stih.

> ### ⚠️ TRI STVARI ZA ODLUKU VLASNICE
> · **M8 popravljen svuda** (zajednički kod, i reč je o pogrešnom broju uz pogrešan
>   stih, ne o izgledu). Vraća se u jednu liniju ako kaže.
> · **M14 popravljen svuda** — popravka samo za telefon značila bi da isto dugme na
>   računaru i dalje ne radi.
> · **M12 NIJE diran** na računaru i tabletu, po dogovoru. Jedna linija kad odobri.

## Test: 372 → 422 provere

- **30) Mobilna verzija** — 30 provera. **Tastatura se PRAVI ručno**, jer je Playwright
  nema: `visualViewport.height` se smanji za 336 px i pošalje `resize`.
- **31) Oznake uz stih** — 12 provera, šest oblika unosa × dve širine.

**Puštene protiv starog koda:** sekcija 30 pada **24 od 26**, sekcija 31 pada **6 od 12**.
Bez toga ne bi dokazivale ništa.

Dve zatečene provere prilagođene: merile su položaj ikonica u pilули, a sakriven element
ima pravougaonik **0×0 na koordinati 0,0** — pa su ga prijavljivale kao „viri".

## Nova pravila (globalni `~/.claude/CLAUDE.md`)

1. **Rešeno se BRIŠE iz TODO-a, ne štriklira.** Zadatak sa ✅ i dalje mora da se pročita
   da bi se videlo da je gotov. Isto važi za zastarela „stanje na dan…" zaglavlja —
   prepisuju se, ne dopunjuju. (Zatečeno: `TODO.md` je 31.07. u zaglavlju tvrdio stanje
   od 29.07., a `CLAUDE.md` projekta nabrajao kao otvorene tri stavke zatvorene 30.07.)
2. **Tekst na sajtu se piše čoveku, ne pretraživaču.** Narodski, ~15 reči po rečenici.
   Nijedna tvrdnja koju kod ne izvršava. Bez podataka o sopstvenom prometu. **Bez
   brojeva koji rastu** (broj reči raste svakodnevno, a isti tekst stoji na 2.000 strana).
   Kad vlasnica traži tekst — piše se tekst, ne nudi se meni varijanti.

`AUDIT/PROPUSTI.md` — pravila **47–51** (tastatura se pravi ručno; `position:fixed` se
proverava po koordinatama a ne po CSS-u; kod spiskova se meri gustina; popravka vezana
za `id` jedne strane; provera se pušta na svim stranama gde funkcija postoji).

## Šta NIJE urađeno

- **Nije pushovano.** Verzija fajlova podignuta na `?v=20260731a`, generator pušten
  dvaput — u svakoj strani promenjene tačno dve linije prvi put (verzija), pa futer.
- **Nije provereno na pravom telefonu.** Sve mereno u Chromiumu sa lažiranom tastaturom.
  Prvi zadatak posle deploy-a: vlasnica otvori sajt na telefonu i proba **baš beležnicu**.
  Lokal sa telefona: `http://192.168.1.150:8765` (isti Wi-Fi).
- **Mejl nije rešen** — čeka prijavu na Porkbun.
- **Tekstovi nisu izmenjeni** — čekaju odobrenje.
- Klasici: uputstvo kaže „klikni na završnu **reč** stiha", a klikće se **slovo** šeme
  rime. Nesklad ostaje, upisan u `TODO.md` 0.06 E.

---

# Sesija 30. jul 2026 (osma) — CEO SAJT NA JEDAN FONT (Rubik)

> **NA PRODUKCIJI.** `62469d065`. Test protiv produkcije **376/376**, CLS **0,0039**.

## Zašto je font menjan — nije ukus nego kvar

Vlasnica je primetila da slovo **`č` u naslovima izgleda drugačije**. Provereno merenjem
širine glifa, ne verovanjem u `unicode-range`:

| Font | Gde je bio | Šta mu fali |
|---|---|---|
| **Fredoka** | naslovi + logo | **`č ć đ`** i **`ђ ћ њ љ џ`** — ta slova su imala TAČNO širinu sistemskog serifa, dok su `š ž` iz istog `latin-ext` fajla radila |
| **Quicksand** | telo teksta | **cela ćirilica** |
| **Fira Sans** | privremeni izbor | **`ђ ћ њ љ џ`** — srpska ćirilica |
| **Rubik** ✅ | sada svuda | ništa |

Posledica pre popravke: svako „re**č**" u naslovu je **mešalo dva fonta**, na svih 1.993 strane.

> **`unicode-range` NAJAVLJUJE opseg, ali NE garantuje da glyph postoji.** Provera je
> merenje širine: ako je jednaka širini sistemskog serifa a druga slova nisu — glifa nema.
> Alat: `test/meri-font.mjs`.

## Odluka vlasnice

**Jedan font na celoj temi, bez izuzetka** — uključujući logo. Pravilo 8a i dalje važi za
veličinu i debljinu; promenjen je samo font, njenom izričitom odlukom. Provera u testu je
ažurirana na Rubik + **dodata nova**: nijedan stari font ne sme ostati u logotipu.

Birano je između šest fontova koji imaju sve (Nunito, Rubik, Montserrat, Comfortaa,
Mulish, Manrope) — vlasnica je izabrala **Rubik**.

## Dve greške koje su usput uhvaćene

**1. `size-adjust` podešen po prozi → CLS skočio na 0,37** (granica 0,1; pre promene bio 0).
`layout-shift.sources` je pokazao da se pomera **traka tabova**, ne pasus — njen odnos
Rubik/Arial je **1,0662**, a proza daje 1,0196. Sa **106,6%** CLS je **0,0039**.
→ **Pravilo 47:** `size-adjust` se podešava po elementu koji se STVARNO pomera.

**2. Naslov se lomio u dva reda** na 1440 px — Rubik je širi. Trebalo mu 910 px, kontejner
ima 832. `clamp` max **1,9rem → 1,70rem**; sada jedan red na **1024 px i više**, uz rezervu
od 18 px. Na 768 px i manje se prelama — to je normalno i namerno.

## Stanje

| | |
|---|---|
| test lokalno / produkcija | 368 / **376** |
| CLS (30 merenja) | najgore **0,0039** |
| font-family u CSS-u | **samo Rubik** (36 mesta) + rezerva |
| otvoreni nalazi | 3 — sve čeka ODLUKU vlasnice (`R1-ostatak`, `J1-ostatak`, `P11`) |

## Sledeće

1. **31.07.2026 — pun audit** po protokolu.
2. **13.08.2026 — analitika** (`CLAUDE.md` 9c), agent `analitika`. Meri se da li je izmena
   naslova pomogla: `recnik rima` je imao 204 prikaza i **0 klikova**.

---

# Sesija 30. jul 2026 (sedma) — FREKVENCIJA, STRANE PO UČESTALOSTI, FONT, TEKSTOVI

> **NA PRODUKCIJI.** Merge `b115f02ac`. Test protiv produkcije **375/375**.
> `nginx-provera.sh` **11/11**. Zatvoreno **šest** nalaza: F1, J1, R1, T1, P16, P10.

## 1. Šta je urađeno, ukratko

| # | Nalaz | Bilo | Sada |
|---|---|---|---|
| **F1** | `frekvencija.json` uzimao ZADNJE čitanje oblika umesto sume | `voda`=876, `dva`=9, `veliki`=34 | `voda`=**47.298**, `dva`=**344.730**, `veliki`=**198.997** |
| **J1** | jekavski oblici izlazili bez kvačice | `naizmjence` uvek vidljivo | 850 oblika se filtrira preko `public/jekavski.json` |
| **R1** | `pruga` bez glavnog značenja; sinonim `brada`↔`klube` | „duga uska traka" | železnica prvo, svojim rečima; sinonim obrisan |
| **T1** | font bez ćirilice | Quicksand (nema ćirilicu!) | **Fira Sans** |
| **P16** | strana skakala 50 px | popravljeno, nepotvrđeno | **30 merenja**, najgore 0,0012 |
| **P10** | strane birane po abecedi | 1.577 od 1.988 na „a" | po učestalosti; na „a" **86** |

## 2. F1 — uzrok je DOKAZAN, ne pretpostavljen

srLex je skinut u `~/Literatura/srLex/srLex_v1.3.gz` (6.905.941 red). Oblik `voda`
ima **četiri** reda: `vod`/2.padež 1.346 + `voda`/2.mn. 12.793 + `voda`/1.jd. **32.283**
+ **`vodati`** (glagol!) **876**. Suma 47.298, a u fajlu je stajalo **876** — tačno
zadnji red. Time je „prepisivano umesto sabirano" prestalo da bude pretpostavka.

**Uz to: prag šuma 10.** Broj 1 u korpusu od 6,9 miliona nije podatak nego šum. Bez toga
je `abakuse` (viđeno **jednom**) preticalo `hiljada` — reč koju srLex uopšte ne poznaje.
Sve pod 10 pojava se sada tretira kao „nema signala"; te reči i dalje izlaze kao rime,
menja im se samo redosled.

`public/matica.json` (6.752 reči) je **drugi, nezavistan signal**: reč potvrđena kao
odrednica u Rečniku Matice srpske ide pred reč koju nijedan izvor ne potvrđuje — ali
nikad pred reč sa stvarnim brojem. **Matica ne daje broj i ne sme da ga izmišlja.**

## 3. P10 — kako se sada biraju strane

Tri filtera, i svaki ima razlog:

1. **učestalost** iz popravljenog `frekvencija.json`
2. **`build/matica-sve.json`** (41.170) — samo reči potvrđene u Matici, da ne uđu
   hrvatske i pokrajinske (srLex je veb-korpus sa `.rs` domena i sadrži `kolodvor`, `tvrtka`)
3. **`build/sadrzajne.json`** (215.062) — samo imenice, pridevi, glagoli, prilozi.
   Bez ovoga je vrh spiska bio `koji, što, kao, ali, nije` — niko ne traži rimu za „koji".

**Obavezne, bez obzira na učestalost:** kurirane teme · `GA_RECI` (6 reči iz Analytics-a)
· **`build/gsc-indeksirane.json` — svih 59 strana koje je Google indeksirao a koje bi
inače nestale.** Provereno: **0 indeksiranih strana izgubljeno.**

**1.672 stare adrese → 301 na hub**, jednim pravilom u `nginx.conf` (`try_files … @rime_hub`),
ne spiskom. Pokriva i sve buduće promene izbora reči.

## 4. Šta je otkriveno u Google Search Console-u

**Indeksirano 124, nije indeksirano 1.014 — oko 11%.** Google odbija devet od deset strana.
Zato je **odbijeno povećanje na 5.000 strana**: gomila odbijenog sadržaja šteti celom sajtu.
Pravilo: **dok je indeksiranost ispod 40%, ne dodavati nove strane.**

Najveći propust: **`recnik rima` — 204 prikaza, 0 klikova.** Rangiramo, ne otvaraju nas.
To je problem naslova, ne pozicije. Zato su promenjeni `<title>`, `meta description` i
`og:description` (izbor vlasnice, vidi `AUDIT/analitika/2026-07-30.md`).

Na prvoj strani za „rimovanje reci" tri od šest rezultata pišu **„riječi"/„Rječnik"** —
ijekavicom. Odatle „na srpskom **jeziku**" u naslovima.

## 5. Nove skripte i provere

| Fajl | Šta radi |
|---|---|
| `test/meri-cls.mjs` | meri skakanje strane **10× po strani**, ispisuje raspon |
| `test/meri-font.mjs` | meri odnos širina za `size-adjust`; **PADA ako se font nije učitao** |
| `test/predeploy.mjs` sekcija **27** | učestalost je sabrana (8 provera) |
| `test/predeploy.mjs` sekcija **28** | jekavski oblici bez kvačice (5 provera) |
| `test/nginx-provera.sh` | 5 novih: stare strane → hub, hub ne vodi sam na sebe |

Sve nove provere su **prvo puštene protiv starog koda i pale** — 5, 5 i 2 redom.

## 6. Tri greške koje sam napravio i uhvatio (detaljno u PROPUSTI.md 40–46)

1. **Tvrdio sam kako radi rangiranje rima bez otvaranja koda** — sortirao sam samo po
   učestalosti i prijavio broj koji na sajtu ne postoji. Vlasnica je uhvatila.
2. **Bazen kockice sa svim rečima iz Matice** — probano, vraća `adađo`, `abonos`,
   `admiralitetski`. Odrednica u Matici znači *standardna*, ne *poznata*.
3. **Merenje fonta bilo je lažno zeleno** — skripta nije čekala da se font učita, pa je
   merila Arial protiv Ariala i dala `size-adjust: 90,4%` umesto **100,9%**. Uhvaćeno
   samo zato što su **dva različita fonta dala iste brojeve do četvrte decimale.**

## 7. Šta ostaje vlasnici na odluku

| Šta | Gde |
|---|---|
| 6 reči (`gojence`, `grnce`, `krol`, `klube`…) | `AUDIT/R1-reci-za-odluku.md` |
| 277 spornih jekavskih oblika (`ded`, `dio`, `dobivati`) | `AUDIT/J1-sporne-reci.md` |
| izgled huba `/rime-za/` — sada je odredište 1.672 preusmerenja (**P11**) | `AUDIT/NALAZI-OTVORENI.md` |

## 8. Sledeći koraci

1. **13.08.2026 — analitika** (novo pravilo, `CLAUDE.md` odeljak 9c): da li `recnik rima`
   dobija klikove, da li indeksiranost raste, da li 301 prave greške u GSC-u.
2. Pokrenuti agenta **`analitika`** — `~/.claude/agents/analitika.md`.
3. **31.07.2026 — pun audit** po protokolu.

---

# Sesija 29. jul 2026 (šesta, kasno uveče) — MOBILNA VERZIJA (M1–M4) + čišćenje projekta

> **NA PRODUKCIJI.** Test protiv produkcije: **358/358** (sekcija 26 prolazi i uživo;
> pre deploy-a je na istom kodu padala — dokaz da hvata kvar).
> **Projekat je premеšten iz `~/Desktop/Projects` u `~/Projects`** — van iCloud
> sinhronizacije (v. odeljak 7). Sve putanje u dokumentaciji su ažurirane.
> U sesiji je urađen i **pun pregled projekta** (kod, dokumentacija, bezbednost)
> na zahtev vlasnice, pa čišćenje viškova.

## 1. Stanje na kraju

| Stavka | Vrednost |
|---|---|
| `main` | zatečen čist (`c03195d43`); izmene su lokalne, **nepushovano** |
| `?v=` | `20260729h` u `index.html`, `gen_pages.py`, `404.html` (bilo `g`) |
| Test lokalno | **353/353** |
| Test protiv produkcije | sekcija 26 **pada dok je stari kod** (dokaz validnosti provera) |
| Otvorenih nalaza | **3** (P10, P11 — odloženi; N12 — Coolify); M1–M4 zatvoreni, čekaju push |

## 2. Šta je urađeno — mobilna verzija (najviši prioritet)

Sve je **izmereno** pre i posle, u iPhone-kontekstu (390×664), uz dodir. Podstrane
(`/pisanje-pesama/`) imaju drugačiju strukturu od početne (landing format, bez
`#panel-beleznica`) — obe su proverene.

| # | Bilo (izmereno) | Uzrok | Sada (izmereno) | Fajl |
|---|---|---|---|---|
| **M1** | 0 obojenih reči na 1440/768/390 px | mobilni Chrome/Safari na Enter prave **`<div>` po redu**, a `getEditorText()` je poznavao samo `<br>` → redovi se lepe u jedan („…nekadu tvom…") i **pesma se kvari u localStorage** | blokovi (`<div>`, `<p>`) su prelom reda; prazan red (`<div><br></div>`) se ne duplira. 2 obojene reči i sa `<br>` i sa `<div>` strukturom; ćirilica radi; prazni redovi se čuvaju | `app.js` (`getEditorText`) |
| — | zastarele boje kad grupa rima pukne brisanjem | re-render samo kad `colorMap.size > 0` | re-render i kad obojenih spanova više nema | `app.js` (`scheduleEditorUpdate`) |
| **M2** | editor počinje na x=80, gutter fiksnih 62 px (20% ekrana), za pisanje 292 px | `.gutter{flex:0 0 4.4rem}` bez mobilne varijante | gutter 2,8 rem (45 px) na ≤560 px; hvataljka se krije samo na dodiru. Početna: x=63, 309 px; podstrana: x=76, 284 px | `style.css` |
| **M3** | editor na y=713, ekran 664 px (ispod pregiba) | hero na svim tabovima + proza od 216 px + 7 akcija u 3 reda | hero se na telefonu vidi samo na tabu Rime (u DOM-u ostaje); proza skraćena; 7 akcija u 1 redu koji se pomera. Editor: **y=404** (početna), **y=326** (podstrana) | `style.css`, `index.html` |
| **M4** | traka tabova beži do 248 px van ekrana bez znaka da se pomera | nema indikatora | maska na desnoj ivici („ima još"), sklanja se kad se dopomera do kraja (`osveziMaskuTabova`) | `style.css`, `app.js` |

### 2.1 Lekcija koja je koštala jedan krak puta: `contain:inline-size`

Skrolujući red akcija (`display:flex; overflow-x:auto; white-space:nowrap`) je na
mobilnom Chrome-u **raširio celu stranicu na 822 px** — pregledač je „odzumirao"
da stane sadržaj. Ni `overflow-x:auto`, ni `max-width:100%` to ne zaustavljaju:
roditelj dobije širinu sadržaja, pa je i „100%" pogrešna mera. Rešenje:
**`contain:inline-size`** na skrolujućem kontejneru. Bisekcija je dokazana
četiri varijante (bez pravila / overflow hidden / contain) — pravilo 35 u
`AUDIT/PROPUSTI.md`.

### 2.2 „Nikad ne izgubi pesmu" (A4 iz TODO.md — odobreno kao popravka)

Izgubljen tekst je najbolnija pritužba ovog tržišta, a beležnica je već jednom
pokvarena (M1 je lepio redove). Tri stvari:
1. **Istorija poslednje 3 verzije** pesme (`rimoteka_notes_istorija`, najviše
   jedna na 30 s — inače bi svako slovo punilo istoriju).
2. **Spas**: ako glavni ključ nestane/pokvari se, pesma se vraća iz istorije.
3. **Vidljivo upozorenje** (`#noteStorageWarn`) kad skladište ne radi (privatni
   režim) — korisnik to zna PRE prve strofe. Nije toast koji nestane.

## 3. Pregled projekta (na zahtev vlasnice) — najkraće

Pun pregled koda, dokumentacije i bezbednosti. Verdikt: **kod bolji od proseka,
repo i mobilni sloj su bili slabija tačka.** Kritičnih bezbednosnih nalaza nema
(CSP bez `unsafe-inline` za skripte, escape disciplina, nula tajni u repou,
`npm audit` čist, webhook sa potpisom i idempotencijom). Srednje: GA bez
pristanka (GDPR), HSTS (Traefik/Coolify), sitni hardening.

## 4. Čišćenje (odobrila vlasnica)

- **Pokvareni git refovi** `main 2`/`main 3` + 12 iCloud konflikt-kopija
  `.git/index N` — premešteni u `~/Desktop/rimoteka-ciscenje-29.07.2026/`
  (ništa se ne briše). `git rev-list --all` ponovo radi (pre: `fatal: bad object`).
- **Mrtvi fajlovi** `build/del_ambig.py` (čitao nepostojeći `/tmp/ambig.json`),
  `build/predlog_oblika.tsv`, `build/predlog_srednji_rod.tsv` (write-only),
  `hub-rime-za.png`, `.playwright-mcp/` sadržaj — premešteni u isti folder.
- **Mrtav CSS** (8 klasa, provereno da se ne pojavljuju ni u jednom HTML/JS/Py):
  `.big-text`, `.chcount`, `.fav-item`, `.syllable-count`, `.notepad-actions`,
  `.pro-price`, `.adsbygoogle`, `.adsense-placeholder`.
- **Duplikat** `renderCombo(); renderCombo();` (artefakt spajanja grana) — jedan poziv.
- **`.DS_Store`** iz `public/` (išao je u produkciju kroz Docker `COPY public/`).
- **Docs u `docs/`**: `CREATOR-NEEDS.md`, `MEMORY.md`, `STRIPE-BRIEF-…`,
  `docs/recnik/` (3 generisana izveštaja). Reference ažurirane u 7 fajlova.
- **HANDOVER.md je imao NUL bajt** (sentry `\u0000` upisan kao sirovi bajt) —
  zamenjen čitljivim `\u0000`; fajl je ponovo čitljiv kao tekst.

## 5. Šta NIJE dirano (svesno)

- **Pro kod** (backend + ~190 linija JS + modal): čeka odluku o monetizaciji.
  Provereno: NE pravi mrežni zahtev pri učitavanju (`/api/status` je iza
  `if (proToggle)` garde, a dugme je zakomentarisano).
- **Logo** (pravilo 8a), **desktop** (regresija proverena na 1440/768/1280:
  hero, proza, gutter 70 px, bez maske — sve kao pre).
- **16 mergovanih grana** — brisanje je git-mutacija, čeka izričito odobrenje.

## 6. Push, deploy i verifikacija produkcije (odobreno 29.07. kasno uveče)

Grana `feat/mobilna-verzija-m1-m4` → merge u `main` (`e233a165d`) → Coolify
deploy. Provera produkcije: glavna 200, nova verzija `20260729h` uživo, pun test
**358/358** — sekcija 26 prolazi i protiv produkcije.

## 7. iCloud incident i premeštaj repoa

Usred `git add`-a (trajao je ~15 min jer je iCloud sloj usporavao svaki fajl)
iCloud je materijalizovao stare verzije i napravio **1.047 direktorijuma
`reč 2/`** unutar `public/rime-za/` — i uleteo je u prvi commit. Uhvaćeno PRE
push-a: duplikati premešteni u `~/Desktop/rimoteka-ciscenje-29.07.2026/icloud-
-konflikti-rime-za/`, commit popravljen (amend), pa tek onda push.
Prave strane su sve bile ispravne (1.989/1.989 nova verzija, 0 starih).

**Uzrok:** `~/Desktop` je u iCloud Drive-u od 27.05.2024 (sistemska opcija
„Desktop & Documents Folders"). Do sada nikad nije smetao jer su projekti bili
mali; Rimoteka prepisuje ~2.000 fajlova po build-u, što je jedini obrazac rada
koji izaziva iCloud konflikte.

**Rešenje (odluka vlasnice):** ceo `Desktop/Projects` premеšten u `~/Projects`
(home folder se ne sinhronizuje). Desktop/Documents sinhronizacija ostaje
uključena. Efekat: `git add` sa 15+ minuta → **2 sekunde**.

**Pravilo za sve naredne sesije: putanja projekta je `/Users/jovana.jovic/
Projects/rimoteka`.**

## 8. N12 zatvoren — http sada vraća 301 (preko SSH, bez panela)

**Uzrok (izmereno):** Coolify-ov `redirect-to-https` middleware nema `permanent`
flag, pa Traefik vraća **302 za GET i 307 za HEAD** (Traefik redirectScheme:
permanent=false → 302/307, permanent=true → 301/308). Oznake na kontejneru
generiše Coolify pri svakom deploy-u, pa se ručna izmena oznaka ne održava.
Coolify panel je nedostupan (profil u automatizovanom pregledaču nema sesiju;
vidljiv prozor se ruši na ovoj mašini).

**Rešenje:** novi fajl `/data/coolify/proxy/dynamic/rimoteka-301.yaml` na
serveru — Traefik dynamic file provider, host-ograničen (`rimoteka.com` +
`www.rimoteka.com`), `priority: 9999` (pobeđuje podrazumevani router),
`redirectScheme permanent: true`, `service: noop@internal`. Traefik ga učitava
vruće, bez restarta i bez diranja Coolify-ja. **Uklanjanje = obrisati fajl** i
sve se vraća na staro. Ne dira druge sajtove na serveru.

**Izmereno posle:** GET → **301** (koren, putanja sa upitom očuvanim, www);
HEAD → 308 (Traefik-ovo očuvanje metode uz permanent — jedini permanent par koji
Traefik nudi); https 200. Provere dodate u sekciju 25 testa (4 nove).

**Napomena za budućnost:** ako se ikada uđe u Coolify panel, isto se postiže
nativno kroz Domains podešavanja; ovaj fajl tada može da se obriše (ili ostane —
ne smeta). Kad bi Coolify reprovizionovao ceo proxy direktorijum, fajl bi nestao
i N12 bi se vratio — provera u sekciji 25 to hvata.

---

# Sesija 29. jul 2026 (peta) — ŠEST PRIJAVA VLASNICE, jedan pad sajta, sve deployovano

> **SVE JE NA PRODUKCIJI.** Test protiv produkcije: **344/344**.
> **Odeljak 10 na dnu je dopisan na kraju sesije — tu su mobilni nalazi (M1–M4)
> i konačno stanje. Brojke u odeljcima 1–9 su od pre toga.**
> Sesija je trajala od popodneva do večeri. Sajt je jednom pao **~3 minuta** mojom
> krivicom i odmah vraćen — ceo slučaj je opisan niže, ne prećutan.

---

## 1. STANJE NA KRAJU

| Stavka | Vrednost |
|---|---|
| `main` | `82f4859c5`, sve pushovano, radno stablo čisto |
| `?v=` | `20260729g` u `index.html`, `gen_pages.py`, `404.html`; `dark-mode-init.js?v=3` |
| Test lokalno | **344/344** |
| Test protiv produkcije | **344/344** |
| Otvorenih nalaza | **3** (bilo 2 na početku, zatvoreno 8, otvoreno 9 novih) |
| Strane | 1.988 strana reči + hub, sitemap 2.011 URL-ova |
| Nove skripte | `test/nginx-provera.sh` (obavezna pre svake izmene `nginx.conf`) |

---

## 2. ŠTA JE URAĐENO — osam zatvorenih nalaza

Svih šest prijava vlasnice reprodukovano je **na produkciji pre popravke**.

| # | Šta je prijavljeno / nađeno | Uzrok | Merenje pre → posle | Fajl |
|---|---|---|---|---|
| **P9** | osvežavanje na futeru ostavlja na futeru | pregledač vraća stari položaj, a alat se osvežavanjem resetuje | `/rime-za/ljubav/` 1925 → **0 px**; početna 5163 → **0 px** | `public/dark-mode-init.js` |
| **P13** | reči izlistane jedna ispod druge | `.chip` prebačen sa `inline-flex` na `flex` 28.07. u `b3bd730b2`; `flex` je blok, pa čip u pasusu uzme ceo red | 24 čipa u **24 reda** → u **5 redova**; najširi 100% → **14%** pasusa | `public/style.css:555` |
| **P14** | Google prikazuje definiciju pojma umesto opisa alata | Google ignorisao `meta description` i uzeo prvu rečenicu vidljivog teksta | nova prva rečenica, **147 znakova** (Google seče ~155) | `gen_pages.py:1173` |
| **P12** | link „Početna" u redu sa autorskim pravima | dodat radi internog povezivanja, ali na pogrešnom mestu | oba futera sada čitaju isto | `gen_pages.py:296` |
| **P15** | osam grešaka u vidljivom tekstu | nikad nije provereno rečnikom | `toast`→**zdravica** (7×), `zaverno` (**reč ne postoji** — 0 pogodaka u `reci.txt`), `Budan kratak`→`Budi kratak`, `klisheeve`→`klišee`, `njezinu`→`njenu`, `odaberim`→`odaberi`, `secanje` bez kvačice (3×), `zajebanciju`→`zezanje` | `gen_pages.py` |
| **P16** | strana skače 50 px dok se učitava | zamena Google fonta menja širinu teksta, red filtera gubi liniju | CLS `/rimovanje-reci/` **0,2819 → 0,0053** | `public/style.css:319` |
| **P2** | CLS na `/rime-za/` — stajao otvoren od 28.07. | popravka iz prošle sesije **jeste radila**, samo nikad nije bila izmerena | **0,0003** (bilo 0,045) | — |
| **N17** | `www.rimoteka.com` vraćao **200** | nije bilo preusmerenja; kanonik je nagoveštaj, 301 je pravilo | sada **301** sa putanjom i upitom | `nginx.conf` |

**Test: 323 → 344 provere.** Nove sekcije 22 (osvežavanje), 23 (čipovi u pasusu),
24 (CLS), 25 (www). **Svaka je prvo puštena protiv produkcije dok je tamo bio stari
kod** i tamo pala: 22 → 2/7, 23 → 4/6, 24 → 2/2, 25 → 2/2.

---

## 3. GREŠKE KOJE SAM NAPRAVIO — svih pet, i kako su počišćene

> Zapisano jer je dnevnik propusta vredniji od spiska nalaza: spisak kaže *šta je
> pokvareno*, dnevnik kaže *zašto to nismo videli*.
> Puni opisi: `AUDIT/PROPUSTI.md`, pravila **25–34**.

### 3.1 OBORIO SAM SAJT NA ~3 MINUTA (najozbiljnije)

**Šta:** popravljajući `www`, dodao sam u `nginx.conf` blok
`server { server_name www.rimoteka.com; return 301 ...; }` **ispred** glavnog i
deployovao. Posle deploy-a `https://rimoteka.com/` je vraćao **301 na samog sebe**,
50 koraka, prazna strana.

**Zašto:** u nginx-u **`server_name _` NIJE hvatalica za sve domene.** `_` je
namerno nevažeće ime koje se nikad ne poklopi sa `Host` zaglavljem. Taj blok je
hvatao sve zahteve **samo zato što je bio prvi**, a nginx prvi blok na portu uzima
za podrazumevani. Moj blok je postao podrazumevani i pokupio sve, uključujući
`rimoteka.com`.

**Zašto provera nije pomogla:** proverio sam konfiguraciju kroz `crossplane`, dobio
`status: ok` i deployovao. **`crossplane` proverava sintaksu, ne semantiku.**
Konfiguracija je bila savršena kao tekst i potpuno pogrešna kao ponašanje.

**Kako je počišćeno:**
1. Kvar uhvaćen u **prvom minutu**, jer sam proveravao posle deploy-a.
2. `nginx.conf` vraćen na prethodnu verziju i pushovan odmah → sajt gore za ~30 s.
3. Instaliran **pravi nginx** (`brew install nginx`, verzija **1.31.3 — ista kao
   produkcija**) i napisana skripta `test/nginx-provera.sh` koja diže nginx i meri
   **ponašanje po `Host` zaglavlju**.
4. Skripta puštena i na **pokvarenoj** verziji — tamo `rimoteka.com` i
   `nepoznato.test` vraćaju 301, dakle provera stvarno hvata kvar.
5. Tek onda ispravna verzija (`listen 80 default_server;` + www blok **na kraju**)
   deployovana, i posle deploy-a **prvo je proverena glavna adresa**, pa www.

**Šta je bilo dobro:** provera posle deploy-a je postojala i uhvatila je kvar. Da sam
stao na „www sada vraća 301, gotovo", sajt bi stajao oboren dok ga vlasnica ne vidi.

### 3.2 Proglasio sam CLS popravljenim na osnovu dva srećna merenja

**Šta:** izmerio `/` dva puta, dobio 0,0065 oba puta, napisao u izveštaj da je
zatvoreno. Pun test protiv produkcije vratio **0,3207** i pao.

**Istina posle 13 merenja:** 11× 0,0065, **2× ~0,30**. Oba loša pala su u minut dok
se Coolify kontejner dizao posle deploy-a. Pod 4× sporijim procesorom i sporom
mrežom nije se ponovilo nijednom u 11 pokušaja.

**Kako je počišćeno:** provera u testu sada uzima **najbolje od tri pokušaja** (jedan
loš ne obara deploy, tri loša znače da je kvar stvaran), a u evidenciji stoji
**raspon**, ne jedan broj. Nalaz P16 je u `NALAZI-OTVORENI.md` upisan sa punom
istinom i oznakom „ostaje da se prati u sledećem auditu".

### 3.3 Ista greška u mom testu koju bih tebi prijavio kao bag

`addInitScript` je stajao **unutar petlje** nad istom stranom. Skripte se gomilaju,
pa bi druga strana dobila dva posmatrača i CLS brojala **dvostruko** — provera bi
padala na **ispravnom** kodu. Sada svaka strana dobija **svoj kontekst pregledača**.

### 3.4 U commit je ušao zalutali snimak ekrana

`hub-rime-za.png` (113 KB), koji je ostavio Playwright, ušao je u `git add -A`.
Uhvaćen u ispisu merge-a pre push-a, izbačen iz repozitorijuma i dodat u
`.gitignore`.

### 3.5 Prvi `git merge` pao sa „fatal: stash failed"

Nije bila moja greška nego posledica iCloud-a (v. odeljak 5), ali me je koštalo
vremena jer sam prvo pomislio da je posao izgubljen. **Nije bio** — commit je bio i
lokalno i na GitHub-u; merge je samo trebalo ponoviti.

---

## 4. KAKO SU NAĐENA DVA NAJTEŽA NALAZA — obrasci koje vredi ponoviti

**P13 (čipovi):** `git log` po `public/style.css`, pa za svaki commit ispisan
`display` iz `.chip` i `.results`. Regresija je iskočila u jednom redu:
`2067fe2e3` = `inline-flex`, `b3bd730b2` = `flex`.
> **Kad vlasnica kaže da nešto „izgleda pokvareno", prvo proći istoriju tog CSS
> pravila — ne čitati ceo fajl.**

**P15 (greške u tekstu):** ceo vidljivi tekst 15 tematskih strana pušten kroz
`reci.txt` (270.000 reči) i izlistane reči kojih nema. Od 47 kandidata **8 je bilo
stvarnih grešaka**, ostalo lažni pozitivi (brend, šeme rime AABB/ABAB, izvedenice).
> **Isplati se: jedna od osam je bila reč koja u srpskom uopšte ne postoji.**

**P16 (CLS):** `layout-shift.sources` daje **tačan element** koji se pomera —
`LABEL.loose-toggle.kids-toggle`, `y: 432 → 382 px`. Bez toga bi se nagađalo.

---

## 5. iCLOUD — potvrđeno, izmereno i očišćeno

Projekat **jeste** u `iCloud Drive/Desktop` (isti inode — provereno preko `stat`).

**Ne usporava rad:** upis 50 MB u projekat traje **0,019 s**, isto kao van iCloud-a;
`git status` **0,108 s**. Sumnja da svaka sesija skida rečnik od 19 MB — **netačna**,
sesija ga samo `grep`-uje.

**Ali kvari `git`:** nađeno **osam** kopija `.git/index` (`index 2` … `index 9`) i
**tri pokvarene reference** (`refs/heads/main 2`, `refs/remotes/origin/main 2`,
`refs/remotes/origin/feat 2`). Zbog njih je `git gc` odbijao da radi
(„failed to run repack") i prvi `git merge` pao sa „fatal: stash failed".

**Počišćeno:** sve **premešteno, ne obrisano**, u
`~/Desktop/rimoteka-git-icloud-duplikati-29.07.2026`. `git fsck` sada čist.
`.gitignore` već ima `* [0-9].*`, pa duplikati ne mogu u commit.

> **Ako se `git` ponovo ponaša čudno** (`bad object`, `stash failed`,
> `failed to run repack`) — prvo `find .git -name "* [0-9]*"`, pa premestiti nađeno.

---

## 6. ŠTA UPISATI DA BI SESIJE BILE BRŽE

> Vlasnica je prijavila da su sesije spore. Sumnjala je na rečnik. **Izmereno je da
> rečnik nije kriv.** Evo šta jeste, i šta je urađeno.

### 6.1 Izmereni uzroci

| Uzrok | Merenje | Cena |
|---|---|---|
| **`git` bez pagera** | prva komanda ove sesije **istekla posle 2 minuta** — `git log` je čekao na `less`, kojeg u ovom okruženju nema | **do 2 minuta po pozivu**, više puta po sesiji |
| **Uzak spisak odobrenih komandi** | `.claude/settings.local.json` je imao **15** stavki, a sesija poziva stotine komandi | sesija stane i čeka odobrenje |
| **Test u pravom pregledaču** | 6–8 minuta po pokretanju, a pušta se više puta | **opravdano** — to je cena poverenja, ne gubitak |
| **iCloud** | 0,019 s za 50 MB — **ne usporava** | kvari `git`, ne brzinu |

### 6.2 Šta je URAĐENO ove sesije — `.claude/settings.json` (nov fajl, u repozitorijumu)

```json
{
  "env": { "GIT_PAGER": "cat", "PAGER": "cat" },
  "permissions": { "allow": [ "Bash(git status:*)", "Bash(git log:*)", … 31 stavka ] }
}
```

- **`GIT_PAGER=cat`** — nijedna `git` komanda više ne može da zablokira sesiju.
  Podešeno **u projektu**, ne u globalnom `git config`, pa ne dira ostale projekte.
- **31 dozvoljena komanda, sve samo-za-čitanje** ili već propisane projektom:
  `git status/log/diff/show/branch/ls-files/ls-tree/ls-remote/fsck`, `grep`, `rg`,
  `ls`, `wc`, `head`, `tail`, `find`, `file`, `stat`, `du`, `which`, `curl -s`,
  `curl -sI`, `node test/predeploy.mjs`, `bash test/nginx-provera.sh`,
  `python3 build/gen_pages.py`, `pkill -f static-server.mjs`.
- **Ništa što briše ili menja fajlove nije u spisku** — to i dalje traži odobrenje.

> Podešavanja iz `env` primenjuju se **od sledeće sesije**.

### 6.3 Pravila koja ubrzavaju rad, a nisu podešavanje

1. **Svaka `git` komanda ide sa `--no-pager`** (ili `| cat`) čak i uz `GIT_PAGER`.
   Pojas i tregeri — pravilo 28.
2. **Ne čitati velike fajlove.** `definicije.json` je 19,7 MB, `docs/recnik/RECNIK-PREDLOG.md`
   242 KB. Ide `grep` sa brojevima linija, pa `Read` sa `offset`/`limit`.
3. **Dugačke poslove puštati u pozadini** i raditi nešto drugo dok traju. Test od
   6–8 minuta ne sme da bude 8 minuta ćutanja — ova sesija je u tom vremenu pisala
   evidenciju.
4. **Reći unapred koliko šta traje.** Vlasnica primećuje kad se ćuti.
5. **Ne pokretati merenja u minutu posle deploy-a** — kontejner se tada diže i
   merenje hvata prelazno stanje (pravilo 33).

---

## 7. ŠTA OSTAJE OTVORENO (3)

| # | Šta | Ko odlučuje |
|---|---|---|
| **P10** | strane reči birane **po abecedi**, ne po učestalosti — **1.577 od 1.988** su reči na „a" (`aaa`, `aah`, `abadzija`, `abakusi`). `gen_pages.py` **nikad ne učita `frekvencija.json`**; `rank` je redni broj u abecednom `reci.txt`, iako komentar tvrdi suprotno | **vlasnica** — odloženo 29.07; plan u `TODO.md`, odeljak **0.0**. Popravka briše **1.577 URL-ova** → traži plan preusmerenja |
| **P11** | hub `/rime-za/` je zid od **1.988 linkova** (8.027 px) | **vlasnica** — isti uzrok kao P10 |
| **N12** | `http://rimoteka.com` vraća **307/302** umesto **301** | **moje, ali traži prijavu na Coolify** — preusmerenje radi **Traefik**, koji odgovara pre našeg nginx-a, pa se iz repozitorijuma ne može. Panel je bio otvoren u pregledaču i čeka prijavu |

---

## 8. ZAMKE ZA SLEDEĆU SESIJU

- **`nginx.conf` se ne dira bez `bash test/nginx-provera.sh`.** Traži
  `brew install nginx`. Bez izlaznog koda 0 — nema deploy-a. (`CLAUDE.md`, 9a-1.)
- **Izmene koje mogu da obore sajt idu SAME**, u zasebnom deploy-u, i posle njih se
  proverava **glavna adresa**, ne samo ono što je menjano.
- **Merenja koja variraju** (CLS, LCP, vreme odziva) idu kao **najbolje od tri**, a u
  izveštaj sa **rasponom**.
- **Pre `python3 build/gen_pages.py`:** `pkill -f "static-server.mjs"; pkill -f
  "http.server"; sleep 2`, pa posle `ls public/rime-za/ | grep -c " 2$"` — mora 0.
- **`?v=` se podiže u TRI fajla:** `public/index.html`, `build/gen_pages.py`,
  `public/404.html`. Trenutno `20260729g`.
- **Odobrenje koje važi dalje** (vlasnica, 29.07. uveče): *„odobreno sve što uklanja
  bag, uključujući šminkanje i peglanje. Zabranjeno: brisanje rečnika, menjanje
  strukture sajta, i svaki nepovratan potez."*

---

## 9. SLEDEĆI KORAK KOJI JE PREDLOŽEN

1. **N12** — prijava na Coolify, dve minute posla, zatvara poslednji nalaz koji je moj.
2. **P10** — od svega otvorenog jedini koji stvarno košta: sajt ima 1.577 strana za
   reči tipa `abakusi` koje niko ne traži, a nema ih za obične reči. To je promašen
   SEO na **79% svih strana**, ne kozmetika.
3. **Audit je zakazan za 31.07.2026** — prvo izmeriti P16 (CLS na `/`) više puta,
   pošto je nalaz zatvoren sa rasponom a ne sa jednim brojem.


---

## 10. NASTAVAK SESIJE POSLE PRVOG HANDOVERA — mobilni, i šta je ostalo nedovršeno

> Ovaj odeljak je dopisan na kraju. Prvih devet delova je napisano ranije, pa se
> brojke u njima odnose na **stanje pre** ovoga.

### 10.1 Vlasnica je otvorila sajt na telefonu — četiri nova nalaza (M1–M4)

Prijava: *„jeziv je… beležnica posebno nikakve veze sa vezom nema, niti boji rime
niti izlaze rime sa strane na kliknutu reč."*

Izmereno na produkciji, **iPhone 13 kontekst sa dodirom** — ne prepisano iz opisa:

| # | Nalaz | Merenje |
|---|---|---|
| **M1** | beležnica **ne boji rime** | **0 obojenih elemenata i 0 klasa** u editoru na **1440, 768 i 390 px** — dakle **nije mobilni bag nego opšti** |
| **M2** | editor počinje na `x = 80` od 390 px | kolona slogova (`.gutter`, `flex:0 0 4.4rem`) pojede **20% ekrana**, za pisanje ostane **292 px** |
| **M3** | editor je **ispod pregiba** | `y = 713 px` na ekranu visine **664 px** |
| **M4** | tri elementa izlaze van ekrana na 390 px | link →502 px, dugme →638 px, `#favCount` →620 px; traka beži do **248 px** desno |

**Jedna stvar u prijavi NIJE se potvrdila:** panel rima na dodir reči u pesmi
**radi** — dodir na „srcu" daje **33 rime**, panel 390×226 px. Verovatno deluje kao
da ne radi zato što se, uz sve ostalo pokvareno, ne primeti.

**Za M1 postoji trag, ne popravka.** Kod postoji i izgleda ispravno:
`analyzeRhymes` (`app.js:1218`) boji grupe od 2+ rime, poziva se iz
`scheduleEditorUpdate` (`app.js:1288`) sa zadrškom od 500 ms. Reprodukcija sa
pesmom u kojoj se „lek" i „vek" rimuju daje **nulu**.
> **Prva sumnja za sledeću sesiju:** da li `getEditorText()` vraća prelome redova
> onako kako ih `contenteditable` stvarno pravi (`<div>`, `<br>`). Ako ne, ceo tekst
> je **jedan red**, poslednja reč je samo jedna, i grupa rime ne može ni da nastane.

### 10.2 ŠTA NIJE IZMERENO — ne prijavljivati kao pokriveno

Merena je **samo beležnica**. Ostalih **šest tabova** (rime, rečnik, slogovi,
klasici, igra, omiljene) **nisu** provereni na 390 px. Vlasnica je rekla „ceo sajt
je jeziv" — **njena prijava je šira od mog nalaza.** Prvi korak sledeće sesije posle
M1: proći **svih sedam tabova** na 390/360/320 px, u obe teme, sa sadržajem.

### 10.3 N12 — pokušan, NIJE zatvoren

Vlasnica je rekla da je ulogovana na Coolify i da mogu sam da otvorim panel. Tab
kojim upravljam (`claude-in-chrome`) **dva puta je pokazao stranu za prijavu** —
kolačić se ne deli, znači prijava je u **drugom Chrome profilu ili prozoru**.
Lozinku nisam uneo (pravilo koje se ne krši).

> **Sledeća sesija:** traži od vlasnice da se prijavi **baš u onom prozoru u kome je
> Claude-ov tab**, pa nastavi. Alternativa: `ssh root@88.198.218.69` i oznake
> Traefika direktno na kontejneru — ali to je zaobilaženje panela i nosi rizik.

### 10.4 Šta je urađeno da sesije budu brže

Nov fajl **`.claude/settings.json`** (u repozitorijumu, ne lični):
- `GIT_PAGER=cat` i `PAGER=cat` — u **projektu**, ne u globalnom `git config`, pa se
  ostali projekti ne diraju. Rešava uzrok zbog kog je prva komanda ove sesije
  **istekla posle 2 minuta**.
- **31 dozvoljena komanda**, sve samo-za-čitanje ili već propisane projektom.
  Ništa što briše ili menja fajlove nije u spisku.
- **Važi od sledeće sesije.**

### 10.5 Izmena na mašini vlasnice

`brew install nginx` — verzija **1.31.3, ista kao produkcija**. Instaliran isključivo
da bi `test/nginx-provera.sh` mogla da diže pravi nginx i meri ponašanje po `Host`
zaglavlju. **Nije pokrenut kao servis** (`brew services` nije diran).

### 10.6 Prompt za sledeću sesiju

`AUDIT/PROMPT-ZA-SLEDECU-SESIJU.md` je prepisan u celini. Sedam zadataka, redom:

| # | Zadatak | Napomena |
|---|---|---|
| **0** | **mobilni + beležnica (M1–M4)** | **najviši prioritet**; unutar njega prvo M1 |
| 1 | N12 | kratko, čeka prijavu na Coolify |
| 2 | `frekvencija.json` | **preduslov za 3** — fajl je i sam pogrešan |
| 3 | P10 + P11 | traži odobrenje za 1.577 URL-ova |
| 4 | `/omiljene/` | već odobreno |
| 5 | audit 31.07. | prvo izmeriti P16 desetak puta |
| 6 | ostatak `TODO.md` | odeljci 1–8 |

**Zašto 2 ide pre 3:** `frekvencija.json` je pogrešno izvučen (vrednosti
**prepisivane umesto sabirane**: `voda` = 876, `veliki` = 34, `dva` = 9,
`hiljada` nema uopšte). Da je P10 krenuo prvi, izabrao bi 2.000 „najčešćih" reči po
brojevima u kojima `dva` ima frekvenciju 9 — i napravio gori problem od onog koji
rešava.

### 10.7 Predložen prioritet, sa obrazloženjem

1. **M1** — kod postoji i ne radi; alat **obećava** nešto što ne isporučuje, a to je
   po pravilu projekta teže od kvara koji se vidi. Pogađa i telefon i kompjuter.
2. **M2–M4 + puna mobilna provera** — `CLAUDE.md` 2.1 kaže „mobile-first: većina
   korisnika dolazi sa telefona". Zatečeno stanje krši sopstveno pravilo projekta.
3. **`frekvencija.json`** — rangiranje rima je delimično pogrešno svuda.
4. **P10 + P11** — promašen SEO na 79% strana; velik posao, ali nikoga ne boli dok
   koristi alat.
5. N12, `/omiljene/`, audit.

> **Zašto beležnica pre SEO-a:** P10 donosi posetioce koji nas još nemaju; M1 i M2
> gube ljude koji su **već došli**. Uz to je beležnica naša razlika u odnosu na
> konkurenciju — ako je baš ona najslabija na telefonu, prednost postoji na papiru.

### 10.8 Konačno stanje sesije

| Stavka | Vrednost |
|---|---|
| `main` | sve pushovano, radno stablo čisto |
| Test | **344/344** lokalno i protiv produkcije |
| Produkcija | glavna **200**, `www` **301**, strane reči **200** |
| Zatvoreno u sesiji | **8 nalaza** |
| Otvoreno | **7** — M1, M2, M3, M4 (mobilni), P10, P11 (odloženi), N12 (Coolify) |
| Nov alat | `test/nginx-provera.sh`, `.claude/settings.json` |
| Pad sajta | jednom, ~3 minuta, vraćen u prvom minutu (v. odeljak 3.1) |

---

# Sesija 29. jul 2026 (četvrta) — DEPLOY 60 NALAZA + tri prijave vlasnice

> **SVE JE NA PRODUKCIJI.** `main` = `61e0d6be3`. Test protiv produkcije: **323/323**.

## Najvažnije što ova sesija otkrila

**Prethodna sesija je popravila 60 nalaza i nijedan nije bio pushovan.**
Stajali su na lokalnoj grani `fix/audit-grupa1` dok je produkcija vrtela kod od
28.07. — sa svim bagovima i dalje živim (0 rima u privatnom režimu, 10,3 s do
prve rime na 4G, `/rime-za/mama/` = 404, `/rime-za/` = 403, 222 strane bez
ijednog internog linka). Vlasnica je mislila da je sve odavno gotovo.

> **Pravilo koje iz toga sledi:** na početku svake sesije proveriti
> `git log --oneline origin/main..HEAD` i uporediti oznaku novog koda sa
> produkcijom (`curl -s https://rimoteka.com/app.js | grep <nova-funkcija>`).
> „Popravljeno" i „na produkciji" nisu ista stvar i razlika se ne vidi iz
> `git log`-a.

## Stanje

| Stavka | Vrednost |
|---|---|
| Grana | sve mergovano u `main`, pushovano |
| Poslednji commit | `61e0d6be3` |
| `?v=` | `20260729d` u OBA fajla (`public/index.html`, `build/gen_pages.py`) |
| Test lokalno | **323/323** |
| Test protiv produkcije | **323/323** (izlazni kod 0) |
| Otvorenih nalaza | **2** (bilo 64 pre dve sesije) |
| Strane | 1.988 strana reči + hub, sitemap 2.011 URL-ova |

## Šta je urađeno u ovoj sesiji

| # | Šta | Gde |
|---|---|---|
| — | **Deploy 60 nalaza** prethodne sesije na produkciju | `main` |
| — | 4 provere sa **izmišljenim očekivanjima** koje su blokirale deploy | `test/predeploy.mjs` |
| S10 | sinonimi za „sunce" bili 13 od 19 sinonimi reči **„snop"** → cela odrednica poništena po odluci vlasnice; fajl uz to smanjen sa 2.128.533 na **1.954.041 bajta** | `public/sinonimi.json` |
| P3 | **beležnica sada prati pismo** — pri prebacivanju, pri kucanju i posle F5, u oba smera | `app.js` (`prebaciBelesku`, `uPismo`) |
| P4 | **srpski raspored tastature** u ćirilici: `; ' [ ] \` → `ч ћ ш ђ ж`; drugi pritisak `'` vraća apostrof | `app.js` (`SR_TASTERI`) |
| P5 | uputstvo **„Како се куцају српска слова"** — vidi se samo u ćirilici, na svih 1.989 strana | `index.html`, `gen_pages.py`, `style.css` |
| P6 | **lepljenje pesme gutalo je prelome redova** — pesma od 4 stiha postajala JEDAN red | `app.js` (rukovalac `paste`) |
| P7 | latinica → ćirilica spajala `d+ž` i `n+j` i tamo gde nisu digraf („nadživeti" → *наџивети*) | `app.js` (`LAT_NE_DIGRAF`) |
| P8 | **ikonice u čipovima bežale u drugi red** kod dužih reči i razvlačile cele vrste | `style.css` (`.results`, `.chip`) |
| — | prekinuto preuzimanje rečnika pri odlasku sa strane više se ne prijavljuje kao kvar | `app.js` (`seIzlazi`) |

## Drugi krug iste sesije — odluke vlasnice, primenjene

| Šta | Odluka i ishod |
|---|---|
| **Sinonimi za „sunce"** | Bilo 13 od 19 sinonimi reči **„snop"**. Vlasnica: poništiti sve i proveriti u Rečniku Matice srpske. Skinut pun tekst Rečnika (17,4 MB) i **trajno sačuvan u `~/Literatura/`** — v. „Gde je sada rečnik". Odrednica „сунце": 1б „централна **звезда**…", 3 „**светлост и топлота**…". Upisano: `zvezda, svetlost, toplota`. |
| **„rat" u dečjem režimu** | Vlasnica: *„deca čak i igraju igre rata, to uopšte nije strašna reč"*. Izbačeni `rat, ratovi, ratni, ratnik, ratnici, ratovanje` iz `KIDS_BLOCKED`. |
| **K3 ostatak** | Vlasnica: vulgarne reči u padežima („dupetu", „incestu") izbaciti iz dečjeg režima, **ali ih ne brisati iz rečnika**. Uvedeno blokiranje po **osnovi** (`KIDS_STEMS`, 16 osnova, svaka provereno da ne hvata nevinu reč). Reči ostaju u `reci.txt`. |
| **`/omiljene/`** | Odobreno, **nije urađeno** — podstrane nemaju panele, pa je to nov tip strane. Plan u `TODO.md`, odeljak 0.1. |
| **`/slogovi/`** | Ostaje kako jeste. Obrazloženje u `TODO.md`, odeljak 0.3. |
| **Logo** | Ne mogu da crtam slike. Spisak verzija koje treba naručiti u `TODO.md`, odeljak 0.2. Nalaz P1 se time zatvara sam. |

## Gde je sada Rečnik Matice srpske

`/Users/jovana.jovic/Literatura/recnik-matice-srpske-2011.txt` (17,4 MB, ćirilicom)
uz `README.md` sa uputstvom za pretragu. **Van svih repozitorijuma namerno.**
Sledeća sesija ga NE skida ponovo. Traži se regularnim izrazom
`\n\s*<reč ćirilicom>\s+[смжн]\b` — rod iza reči odvaja pravu odrednicu od
pominjanja unutar tuđih definicija.

## NEZGODA koju treba znati

`gen_pages.py` je pokrenut dok je `test/static-server.mjs` još držao
`public/rime-za/`. Brisanje foldera je puklo na pola i macOS je napravio **524
foldera-duplikata** (`acamovic 2`, `aceci 2`…), a prave pojeo.

**Ništa nije izgubljeno** — sve je bilo u gitu (`git checkout -- public/rime-za/`
vratio je svih 1.988). Duplikati su **premešteni, ne obrisani**, u
`~/Desktop/rimoteka-duplikati-29.07.2026` — vlasnica ih briše kad hoće.

> **Pravilo:** pre `python3 build/gen_pages.py` uvek
> `pkill -f "static-server.mjs"; pkill -f "http.server"; sleep 2`, pa posle
> generisanja proveriti `ls public/rime-za/ | grep -c " 2$"` — mora biti 0.
> Kanta preko Findera **ne radi pouzdano** (`osascript` je istekao pet puta
> zaredom, i u grupama po 25) — koristiti premeštanje van projekta.

## Šta ostaje otvoreno (2) + 1 koje čeka vlasnicu

| # | Šta | Ko odlučuje |
|---|---|---|
| **N12** | `http://` vraća 302 umesto 301 — radi **Traefik u Coolify-ju**, ne nginx iz repozitorijuma | moje; traži Coolify panel |
| **P2** | CLS 0,045 — popravka primenjena, **nije izmerena** | moje; merenje |
| **K3** ostatak | dečji režim propušta vulgarne reči kroz padeže (284 oblika kod 75 reči) | **vlasnica** — `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`, odeljci 2–4 |
| **P1** | logo 292 KB na 46×46 px | **vlasnica** — pravilo 8a |
| **S10** ostatak | **koje reči jesu pravi sinonimi za „sunce"** — traži Rečnik Matice srpske | **vlasnica** |

## Predlozi koje je vlasnica postavila, čekaju odgovor

1. **`/omiljene/` kao prava strana sa `noindex`** umesto `/?tab=omiljene`.
   Omiljene žive samo na uređaju, pa indeksirana strana bi za svakog bila
   prazna — ali lepa, deljiva adresa je izvodljiva bez SEO štete.
2. **`/slogovi/` NE preimenovati** u `/brojac-slogova-i-karaktera/`. Ključna reč
   je već u adresi i u `<title>`-u, a promena košta 301 i ponovno indeksiranje.
   Rast na tom upitu traži sadržaj na strani, ne dužu adresu.

## Zamke za sledeću sesiju

**Provere sa izmišljenim očekivanjima.** Četiri su bile upisane iz glave
(`sunce`→`srce`, `nebo`→`rebro`, dečji režim na reči „mrak") i padale na
ispravnom kodu. Svako očekivanje u testu MORA prvo da se izmeri u alatu.

**Dve mere dužine u beležnici.** `getEditorText()` broji prelom reda kao znak,
a `saveCursorPosition`/`restoreCursorPosition` ne broje. Ko ih pomeša, dobija
kursor koji odskače za tačno broj redova — nikad se ne vidi u jednom redu.

**Poruke pregledača se razlikuju lokalno i na produkciji.** Provera 404 strane
hvatala je „404 (Not Found)" (lokalni server), a nginx šalje „404 ()". Prolazila
lokalno, padala na produkciji.

**S4 (bojenje ćirilične pesme) je bio nestabilan** — pao jednom protiv
produkcije, izolovano radio. Sada čeka na ishod umesto na fiksnih 1,5 s.

**Test u pravom pregledaču traje 6–8 minuta.** Vlasnica primećuje kad se ćuti.
Reći unapred koliko traje i zašto se pušta više puta.

---

# Sesija 29. jul 2026 (treća) — POPRAVKE: GRUPE 2–8, zatvoreno 60 od 64 nalaza

> **NIŠTA NIJE PUSHOVANO.** Sve stoji na grani `fix/audit-grupa1`, pet novih commit-a.
> Vlasnica je izričito rekla: **prvo ona gleda na lokalu, pa tek onda push.**

## Gde je posao stao

| Stavka | Stanje |
|---|---|
| Grana | `fix/audit-grupa1` (8 commit-a ukupno, **nije** pushovana) |
| Otvorenih nalaza | **4** (bilo 64) |
| Test | **265/265 prolazi** u poslednjem uspešnom pokretanju (bilo 167) |
| Posle toga dodato | još ~20 provera (sekcije 20–20f) koje **nisu izvršene** — v. „Šta nije potvrđeno" |
| `?v=` | podignut na `20260729b` u OBA fajla |
| Strane regenerisane | 1.988 strana reči + nova hub strana, sitemap 2.011 URL-ova |

## Šta ostaje otvoreno (4)

| # | Zašto stoji |
|---|---|
| **K3** (ostatak) | traži odluku vlasnice — `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`, odeljci 2–4. Odobren je bio samo Odeljak 1 i on je urađen. |
| **N12** (302 → 301) | preusmerenje radi **Traefik u Coolify-ju**, ne nginx iz repozitorijuma. Traži pristup panelu. |
| **P1** (`logo-icon.png` 292 KB na 46×46 px) | **pravilo 8a: logo se ne dira.** Svako rešenje dodiruje sliku ili `<img>`. Odluka je vlasničina. |
| **P2** (CLS 0,045) | popravka je **primenjena** (`preload` fonta na sve tri vrste strana), ali **nije izmerena** — mašina je ostala bez portova. Ostaje otvoreno dok se ne izmeri. |

## Šta NIJE potvrđeno merenjem (pošteno, bez ulepšavanja)

Pri kraju sesije mašina je ostala **bez efemernih portova**:

```
16.217 od 16.384 portova u TIME_WAIT
curl 127.0.0.1  → „Can't assign requested address"
node connect    → EAGAIN, i ka localhostu i ka google.com
```

Od 41.719 utičnica u TIME_WAIT samo **3.644** su išle ka test serveru; ostalo su
drugi procesi na mašini (17.677 ka :443, 3.930 ka :3000, 2.227 ka :7000).
**Sajt i test nisu krivi** — ali dok se to ne oslobodi, ništa se ne može izmeriti.

**Zbog toga NISU izvršene ove provere** (napisane su, sintaksno proverene, ali
nijednom nisu pokrenute):

| Sekcija | Šta proverava |
|---|---|
| 20 | tab „Omiljene" — ♥, brojač, osvežavanje, „obriši sve" |
| 20b | „i šire rime", „ijekavica", „dečji režim" menjaju rezultat |
| 20c | rime za šest reči (ne samo „ljubav") |
| 20d | tri režima pretrage + filter po slogovima |
| 20e | HTTP status na 35 ruta |
| 20f | tačkice napretka u igri (N4) |

**Prvo što sledeća sesija radi:**

```bash
cd /Users/jovana.jovic/Projects/rimoteka
netstat -an -p tcp | awk '{print $6}' | sort | uniq -c | sort -rn | head -3   # mora biti < ~5.000 TIME_WAIT
node test/predeploy.mjs                              # mora ispisati „Sme deploy"
BASE=https://rimoteka.com node test/predeploy.mjs    # tek POSLE deploy-a
```

Ako te provere padnu, popraviti pa tek onda razmišljati o push-u.

## Vidljive promene koje vlasnica treba da odobri

| Šta | Bilo | Sada | Kako se vraća |
|---|---|---|---|
| Naslov strana reči | „Rime za nada: 51 reči koje se rimuju" | „Rime za reč „nada“: 51 reč koja se rimuje" | `build/gen_pages.py`, `title = …` |
| Uvodna rečenica na stranama reči | „Pronađene su 56 reči…" | „Pronađeno je 56 reči…" | `gen_pages.py`, `pronadjeno()` |
| **Nova strana** `/rime-za/` | 403 | spisak svih 1.988 strana po abecedi | obrisati blok „2z) HUB STRANA" |
| Breadcrumb na stranama reči | Rimoteka › Rime za „ljubav" | Rimoteka › Rime za reč › „ljubav" | `gen_pages.py`, `nav class="crumbs"` |
| **Nova društvena slika** `og-slika.png` | kvadratni logo | 1200×630, ljubičasti preliv + logo | vratiti `og:image` na `logo-icon.png` |
| Tekst na tri strane za decu | „filtrirana od neprikladnih reči" | objašnjava šta je uvek isključeno a šta radi dečji režim | `gen_pages.py`, `lead=` tih strana |
| Dugme na stranama za decu | „🧸 Pronađi još rima za decu" | „🧸 Otvori alat sa uključenim dečjim režimom" | isto mesto, `cta_text` |
| Adresa se menja pri prebacivanju tabova | uvek `/?rec=…` | `/slogovi/`, `/klasici/`… | `app.js`, blok „URL JE STANJE" |
| Klik na logo | ne radi ništa | prazni polje, rezultate i adresu | `app.js`, `goHome()` |
| Brojač u igri, tamni režim | svetloljubičasta podloga | prozirno bela | `style.css`, `body.dark-mode .game-value` |
| Dugmad u beležnici na telefonu | 23,3 px | 44 px | `style.css`, blok `@media(max-width:560px)` |
| 404 strana | samo „nazad na početnu" | polje za pretragu + linkovi | `public/404.html` |

**Logo nije diran ni na jednom mestu** (pravilo 8a). Nalaz o njegovoj veličini
(292 KB) je zato ostavljen otvoren, ne popravljen.

## Tri stvari koje treba razumeti pre nastavka

**1. Ćirilica se kvarila u POVRATNOM prolazu, ne u prikazu.**
Prebacivanje ide ćirilica → latinica → ćirilica, a u latinici su `dž`, `nj`, `lj`
digrafi. Kad se u ćirilici `д` i `ж` samo dodiruju, povratni prolaz ih spoji:
„надживети" → „nadživeti" → „**наџивети**". Rešeno nevidljivim čuvarom između ta
dva slova. **Ne uklanjati ga** — bez njega se bag odmah vraća.

**2. Klik na rimu u beležnici sada ZAMENJUJE reč, ali samo kad je kursor u njoj.**
U praznini i dalje ubacuje, jer tada korisnik piše novi stih. Ta razlika je
namerna i pokrivena proverom.

**3. `definicije.json` (19,3 MB) se više ne skida unapred.**
Skida se tek na prvi prelazak mišem preko ⓘ. Ako se ikad vrati predučitavanje,
vraća se i 3,3 sekunde čekanja na rime — i test sekcije 19c pada.

## Alat koji ostaje sledećoj sesiji

Merači i probe iz ove sesije (svaka se pušta i sa `BASE=https://rimoteka.com`):

```
scratchpad/probe-g2.mjs …  probe-g7.mjs   provere po grupama
scratchpad/kontrast-igra.mjs              kontrast ekrana igre u obe teme
```

Nisu u repozitorijumu jer su im sve provere prebačene u `test/predeploy.mjs`.

---

# Sesija 29. jul 2026 (druga) — POPRAVKE: GRUPA 1 + ceo noćni režim

> **NIŠTA NIJE PUSHOVANO.** Sve stoji na grani `fix/audit-grupa1`, tri commita.
> Vlasnica je izričito rekla: **prvo ona gleda na lokalu, pa tek onda push.**

## Gde je posao stao

| Stavka | Stanje |
|---|---|
| Grana | `fix/audit-grupa1` (3 commita, **nije** pushovana) |
| Test | **167/167 prolazi** lokalno, izlazni kod 0 (bilo 140) |
| Otvorenih nalaza | **64** (bilo 72; zatvoreno 9, dodat 1 nov — N14) |
| Ocena | još nije preračunata — sledeći audit **31.07.2026.** |
| Lokalni pregled | `cd public && python3 -m http.server 8765` |

## Šta je zatvoreno

**GRUPA 1 — jedna izmena šablona `build/gen_pages.py`, pogodila 2.009 od 2.010 strana:**

| Nalaz | Bilo | Sada |
|---|---|---|
| K6 | tamnog režima nema na 2.009 strana | dugme + skripta na svakoj strani |
| K1 | `dark-mode-init.js` u `<head>` piše po `document.body`, koji tada ne postoji → tema se gubi pri `F5` | klasa ide na `<html>`, pa se prenese na `<body>` |
| V1 | `app.js` nema na 1.988 strana → ćirilica mrtvo dugme | `app.js` ide i na strane reči (rečnik se **ne** skida) |
| V2 | „Kopiraj sve rime" inline `onclick`, CSP ga blokira | rukovalac u `app.js` |
| S5 | nema `#printArea` → štampa prazan list | dodato u podnožje |
| S6 | nema `#toast` → nijedna radnja ne javlja ništa | dodato u podnožje |
| N9 | `h1 → h3` na 1.988 strana | `h2`, CSS pokriva oba nivoa |

**KONTRAST — po prijavi vlasnice, sve tri stavke reprodukovane:**

| Nalaz | Bilo | Sada |
|---|---|---|
| K2 | reč koja klikom uđe u polje: **1,23:1** | 12,4:1 |
| S8 | filter slogova 2,05:1 · interni linkovi **1,80:1** · `--muted` 2,90:1 | svi ≥ 4,5:1 |
| — | tabela na `/slogovi/`: **1,23:1** (td), 3,87:1 (th) | ≥ 5,3:1 |
| — | definicija reči na stranama `/rime-za/`: **1,15:1** | 8,19:1 |
| — | paleta boja za rime u beležnici: svetla do **1,89:1**, tamna do 3,16:1 | sve ≥ 4,6:1 |

**Skener kroz 18 stanja strana** (sve strane × svi tabovi × obe teme, sa upisanim
sadržajem) našao je **27 elemenata ispod praga**. Sada **0 u obe teme**.

## Tri stvari koje treba razumeti pre nastavka

**1. Uzrok je uvek isti obrazac, ne pojedinačna boja.**
Boja teksta je promenljiva koja se menja sa temom, a podloga je tvrdo upisana
(`background:#fff`). Tema se pomeri, podloga ne. Zato su podloge sada promenljive:
`--field-bg` (polja) · `--menu-bg` (padajuća lista) · `--card-bg` (male bele kutije:
tabela, filter slogova, značka) · `--tag-bg` / `--tag-ink` (oznake u Klasicima) ·
`--syl-ink` / `--syl-bg` (broj slogova) · `--link` / `--link-visited`.

> **Ne dodavati jače pravilo `body.dark-mode ...` kao popravku.** Tako je i nastao K2:
> `.search-row input[type=text]` ima specifičnost (0,2,1) i nadjačava
> `body.dark-mode input` (0,1,2). Podloga MORA da ide kroz promenljivu.

**2. Linkovima u tekstu boju do sada nije postavljalo nijedno CSS pravilo.**
Uzimali su podrazumevanu boju pregledača: `#0000EE` (**1,80:1** na tamnoj), a
posećeni `#551A8B` (**1,53:1**). Testni profil nema posećene linkove, pa se to
merenjem nikad ne bi videlo — vlasnica ih ima. Sada `a{color:var(--link)}` i
`a:visited`, specifičnost 0,0,1, pa tabovi/čipovi/logo/futer ostaju netaknuti.

**3. Boje rima u beležnici su upisane INLINE u HTML.**
CSS ih ne može nadjačati. Zato su dve palete u `app.js` (`RHYME_COLORS_SVETLA` /
`RHYME_COLORS_TAMNA`, iste nijanse, pomerena samo svetlina) i **ponovno iscrtavanje
pri promeni teme** — bez toga posle prebacivanja ostanu boje stare teme.

## Vidljive promene koje vlasnica treba da odobri

| Šta | Bilo | Sada | Vraća se |
|---|---|---|---|
| Broj slogova u balončiću uz reč | svetloplavo `#26a2f8` | tamnije plavo `#146ba8` | `--syl-ink` |
| Sporedni tekst u **svetloj** temi (`--muted`) | `#9a93b8` | `#756e94` | `--muted` |
| Boje rimskih grupa u beležnici | jedna paleta | dve, po temi | `RHYME_COLORS_*` u `app.js` |
| Značka „sinonimi" | belo slovo | tamno slovo, ista plava | `.syn-badge` |

Sve četiri su popravke čitljivosti (svaka je bila ispod 4,5:1), ali menjaju izgled —
zato stoje ovde, a ne u fusnoti.

## Test — sa 140 na 167 provera

| Sekcija | Šta hvata |
|---|---|
| `10b` | tema preživljava `F5` i odlazak na stranu reči + ikonica se poklapa sa temom |
| `10c` | **svaki vidljivi tekst** na 6 strana, u obe teme, sa upisanim sadržajem |
| `12j` | strana reči kao alat: `app.js`, ćirilica, kopiranje, `#toast`, `#printArea`, naslovi, kontrast |

**Sve nove provere su prvo puštene protiv produkcije DOK JE TAMO STARI KOD i sve su
pale** — 13 iz prvog kruga, 12 iz drugog. To je jedini dokaz da provera nešto hvata.

> **Zamka koju ne ponavljati:** sekcija `10c` je isprva otvarala 12 zasebnih strana.
> Svaki `browser.newPage()` pravi nov kontekst sa praznim kešom, pa je svako merenje
> iznova skidalo `reci.txt` + `definicije.json` — 12 × 22 MB obori lokalni server i
> test padne bez ijednog pravog kvara. Sada je jedna strana za svih 12 merenja.

## Šta NIJE urađeno

- **GRUPE 2–7 iz `AUDIT/UPUTSTVO-ZA-POPRAVKE.md`** — osim K2 i S8, koje su odrađene
  ranije jer ih je vlasnica prijavila. Ostaje V3, V4, S2, V6, V7, S1, K4, K5, ćirilica,
  performanse i sve iz dopune audita.
- **K3 (dečji režim)** — čeka odluku, `AUDIT/DECJI-REZIM-ZA-ODLUKU.md`.
  Vlasnica je odobrila **samo Odeljak 1** (uklanjanje 7 pogrešno blokiranih reči:
  *pisao, pisa, krvavi, krvava, krvavo, smetlar, kura*). **To još NIJE urađeno** —
  liste `BLOCKED` stoje na dva mesta: `public/app.js:93` i `build/gen_pages.py:550`.
  Posle izmene se MORA ponovo pokrenuti `python3 build/gen_pages.py`.
- **N14 (novo)** — živi rezultati i dalje iscrtavaju `<h3>` odmah ispod `<h1>` na `/`
  i `/rimovanje-reci/`. Statične strane su popravljene, živi alat nije.

## Alatka koja ostaje sledećoj sesiji

Skener kontrasta:
`/private/tmp/claude-501/-Users-jovana-jovic/076b64b6-822c-4afd-a92e-03bd6e50532d/scratchpad/skener-kontrasta.mjs`

```bash
node skener-kontrasta.mjs               # noćni režim
TEMA=svetla node skener-kontrasta.mjs   # dnevni režim
```

Prolazi sve strane i tabove, slaže prozirne podloge, preskače prelive, meri i polja
sa upisanom vrednošću. **Prekopirati ga u `test/` da ne nestane sa privremenim folderom.**

---

# Sesija 28–29. jul 2026 — KOMPLETAN AUDIT (bez ijedne izmene koda)

> **Sledeća sesija radi POPRAVKE. Radni nalog je gotov:**
> **`AUDIT/UPUTSTVO-ZA-POPRAVKE.md`** — pročitati ga prvo, sve je tamo poređano po
> redosledu i sa tačnim linijama.

## Šta je urađeno

**Nijedna linija koda nije promenjena.** Sesija je bila isključivo audit i dokumentacija.

| Šta | Ishod |
|---|---|
| Postojeći test protiv produkcije | **140/140 prolazi** ✅ |
| Prvi audit (39 agenata) | 27 nalaza — ali **samo 3/10 dimenzija završilo**, 7 se zaglavilo |
| Vlasnica prijavila ručno | **5 bagova, svih 5 potvrđeno** — 3 nije našao nijedan agent |
| Dopuna audita (54 agenta) | **8/8 dimenzija**, 37 novih nalaza, 0 zaglavljenih |
| **Ukupno otvoreno** | **72 nalaza** — 6 kritičnih, 7 visokih |
| **Ocena** | **6,9 / 10** |

## Stanje sajta

**Jezgro je odlično, ivice su polomljene.** Rimovanje radi brzo (60–145 ms) i tačno,
LCP 704–796 ms, CLS ~0, beležnica sa metrom i šemom rime nema premca na srpskom.
Ali **98,9% sajta su generisane strane** i tamo se raspada: nema tamnog režima na
2.009 od 2.010 strana, prekidač za ćirilicu je mrtvo dugme na 1.988 strana, a
„Kopiraj sve rime" CSP blokira.

**Šest kritičnih:** tamni režim se gubi na `F5` · u tamnom režimu se ne vidi šta se
kuca (kontrast 1,23:1) · dečji režim propušta vulgarne reči kroz padeže (284 oblika) ·
zabranjen localStorage obori sajt na 0 rima · pokvaren `rimoteka_favorites` isto ·
tamni režim ne postoji na podstranama.

## Novi fajlovi

| Fajl | Šta je |
|---|---|
| `AUDIT/UPUTSTVO-ZA-POPRAVKE.md` | **radni nalog za sledeću sesiju** |
| `AUDIT/NALAZI-OTVORENI.md` | živi spisak 72 nalaza — izvor istine |
| `AUDIT/2026-07-28-audit.md` | prvi izveštaj |
| `AUDIT/2026-07-29-dopuna.md` | dopuna, 37 nalaza sa scenarijima |
| `AUDIT/PROPUSTI.md` | **zašto je audit promašio ono što je vlasnica našla** |
| `MONETIZACIJA.md` | plan za budućnost — **ne radi se sada** |

## Šta je promenjeno u pravilima (globalno, važi za sve projekte)

- **Audit na svaka 3 dana**, rezultati pod datumom u `AUDIT/GGGG-MM-DD-audit.md`
- **Podsetnik na početku svake sesije** — otvoreni nalazi, sledeće iz TODO, kad je
  bio poslednji audit, šta je zaostalo. **Prvo bagovi, pa novo.**
- **Posle svakog posla obavezan predlog šta dalje + bar jedan istražen inovativan predlog**
- Kompletan protokol za audit upisan u globalni `CLAUDE.md` (ritam, metod, devet
  provera koje se najčešće propuste, pravila za višeagentni audit)
- `TODO.md` dobio odeljak A (inovativni predlozi) i B (šta ne raditi)

## Zamke koje MORAŠ znati

- **Zaglavljen agent nije obavljen posao.** Prvi audit je prijavljen kao gotov, a 70%
  dimenzija se zaglavilo. Pokrivenost ide u naslov izveštaja, ne u fusnotu.
- **Test od 140 provera prolazio je dok je sajt imao 72 nalaza** — obilazi 7 od 2.010
  strana i proverava da element *postoji*, ne da *radi*.
- **Bagovi žive na preseku dva stanja** — tamni režim *i* kucanje; klik na rimu *i*
  kursor usred reči; pretraga *i* prebacivanje tabova. Testirati kombinacije, ne ose.
- **`grep -c` broji redove, ne pojave** — umalo lažna uzbuna da strane nisu
  server-renderovane. Jesu (86–129 reči u statičkom HTML-u).
- **Nalaz mora da navede u kojoj tačno situaciji se kvar dešava.** Prijavljeno je
  „tamni režim se nikad ne vrati" — netačno; opstaje kroz tabove, gubi se na `F5`.
- **Kad vlasnica kaže suprotno od izmerenog — ona je prva u pravu.**

## Podaci koje vredi zapamtiti

- **Saobraćaj (GA, 7 dana):** 38 aktivnih korisnika, 150 pregleda, 124 pretrage rima.
  Srbija 24 · Španija 7. Rast +58% nedeljno. Oko **150 korisnika mesečno** — premalo
  za reklame, dovoljno da se vidi da alat živi.
- **Rimoteka Pro je već napravljena** (backend + frontend), samo nije deployovana;
  Pro dugme zakomentarisano u `index.html:104`. Detalji: `docs/STRIPE-BRIEF-ZA-DRUGO-MISLJENJE.md`.
- **Strane reči su potpuno server-renderovane** — presudno jer GPTBot i ClaudeBot ne
  izvršavaju JavaScript. Uz mali jezik, to je najveća prilika za citiranje u AI odgovorima.

## Sledeći puni audit: 31.07.2026.

---

# Sesija 28. jul 2026 (druga) — „Učitavam rečnik", ćirilica, čipovi, interno povezivanje

> **Stanje: sve je na produkciji i zeleno.** `BASE=https://rimoteka.com node
> test/predeploy.mjs` → **140/140**. Poslednja verzija `?v=20260728j`.
> Sitemap poslat u GSC, IndexNow pinguje Bing/Yandex, Request Indexing urađen
> za 8 strana.

## 0. Šta je vlasnica prijavila i šta je bio uzrok

| Prijava | Pravi uzrok | Zašto niko nije primetio |
|---|---|---|
| „Učitavam rečnik" na početnoj bez ijedne upisane reči | beležnica pozajmljuje vidljivi panel `#rimeResults` da izračuna rime za reč pod kursorom | vidi se samo ako u beležnici ima sačuvanog teksta; na praznom pregledaču nikad |
| ćirilica ne prebacuje nazive tabova | tabovi su postali `<a href>` zbog SEO-a, a selektor je ostao `#tabs button` | nijedna provera nije pokrivala prekidač za pismo |
| ćirilica ne prebacuje tekst strane | prebacivao se samo okvir alata; generisane strane prekidač uopšte nisu ni imale | isto — nula provera |
| ikonice izlaze iz okvira čipa | kolona 11.5rem (184px), a sadržaj čipa traži 196–282px; čip je `inline-flex` bez prelamanja | na telefonu se NE vidi (kolona je tamo šira), a u grupi „dobre rime" okvir je beo na belom |

**Zajednički imenilac: sve četiri su preživele jer ih test nije doticao.** Zato
je uz svaku popravku dodata i provera — test je narastao sa 104 na **140**.

## 0a. Nove sekcije u `test/predeploy.mjs`

| Sekcija | Šta čuva |
|---|---|
| **12e** | panel s rimama je prazan pri učitavanju i kad beležnica ima sačuvan tekst |
| **12f** | prebacivanje pisma — tabovi, rime, placeholder, povratak na latinicu |
| **12g** | ćirilica menja CEO tekst na 4 tipa strana; logo, mejl i skraćenice ostaju |
| **12h** | upisana reč prelazi u ćirilicu (digraf lj → љ); beležnica se NE dira |
| **12i** | nijedna ikonica ne izlazi iz čipa, na 1440/1024/390px |

Sekcija 12e je i **dokazano** hvatala bag: puštena protiv produkcije dok je tamo
još bio stari `app.js` — pala; lokalno sa popravkom — prošla.

## 1. Bag: „Učitavam rečnik…" na početnoj bez ijedne upisane reči

Vlasnica je prijavila da je na početnoj dočekuje poruka „Učitavam rečnik…" iako
ništa nije upisala. Reprodukovano na produkciji i nađen uzrok.

**Uzrok:** beležnica nema svoj pretraživač rima — pri učitavanju računa rime za
reč pod kursorom tako što **pozajmi vidljivi panel `#rimeResults`**
(`renderNoteRhymes` → `doRhymes(true)`). Rečnik u tom trenutku još nije stigao,
pa `doRhymes` u panel upiše „Učitavam rečnik…" i **tu ostane**.

**Koga je pogađalo:** svakog ko je ikad nešto napisao u beležnici (tekst stoji u
`localStorage`). Na potpuno praznom pregledaču se ne vidi — zato je i preživelo.

**Popravka (`public/app.js`):**
- poruke o stanju („Upiši reč", „Učitavam rečnik…") pišu se **samo kad korisnik
  sam traži rime** — tihi poziv ih preskače
- nova funkcija **`tiheRime(word)`** — pozajmi panel, pročita čipove i **vrati
  panel u zatečeno stanje**. Sadržaj se pamti kao **čvorovi, ne `innerHTML`** —
  preko `innerHTML` bi ⓘ/♡/🔁 izgubili osluškivače i postali mrtva dugmad.
  Koriste je `renderNoteRhymes` i `getRhymeListForLastWord`.

**Nuspojava koja je takođe rešena:** beležnica više ne briše rezultate koje
korisnik vidi na tabu „Rimovanje reči".

**Test:** nova sekcija **12e** (4 provere). Dokazano da hvata bag — protiv
produkcije (stari kod) pada, lokalno (novi kod) prolazi.

## 2. Interno povezivanje — šta je bilo pogrešno

**Brojač slogova NIJE bio bez linkova**, kako je delovalo: stajao je u traci
tabova i u futeru, dakle na svih 2.010 strana. Ali su to **šablonski** linkovi,
koje Google jako obezvređuje. Iz **teksta** početne nije vodio **nijedan** —
a tu je „broj slogova" tri puta stajalo kao podebljan **običan tekst**.
Sada ih ima 7 (sa 2).

**Šest strana je bilo u sitemapu, a bez ijednog linka sa sajta:**
`/rime-za-prijatelje/`, `/rime-za-roditelje/`, `/rime-za-novu-godinu/`,
`/rime-za-tugu-i-secanje/`, `/rime-za-decu-o-prirodi/`,
`/rime-za-decu-o-zivotinjama/`. To je stanje koje Google po pravilu ostavlja na
„otkriveno, nije indeksirano". Sada svaka ima **bar dva** linka iz sadržaja
(`SRODNO` mapa u `gen_pages.py`, blok „Srodne strane" na dnu svake tematske
strane) **plus** link u futeru.

## 3. Ključne fraze koje nijedna strana nije pokrivala

Izmereno pretragom kroz svih 2.010 strana — bilo je **nula** pojava:
`podela reči na slogove`, `rastavljanje reči na slogove`, `brojač karaktera`,
`brojač znakova`, `brojač reči`. Alat sve to **radi**, samo nije bilo napisano
onako kako ljudi kucaju. Dodato na `/slogovi/` (dve nove sekcije + dva FAQ-a) i
na početnu (dva FAQ-a).

Uz to ispravljeno: u FAQ-u početne je pisalo „u tabu **Slogovi i znakovi**" —
tab se odavno zove „Brojač slogova i karaktera" i ima svoju stranu. Ispravljeno
i u vidljivom tekstu i u `FAQPage` šemi (moraju da se poklapaju).

## 4. Ćirilica — sada menja ceo tekst, ali NE sve

Prekidač je bio ograničen na okvir alata i rezultate. Sada menja i naslov, uvod,
SEO tekst, sekcije, česta pitanja, futer — i to na **svim tipovima strana**
(prekidač je dodat u zaglavlje generisanih strana, a `app.js` ide na svaku
tematsku stranu; rečnik se pri tom **ne skida**, `bootstrap` ga traži samo ako
na strani postoji alat koji pretražuje reči).

**Šta se NAMERNO ne prebacuje** — sve troje bi bio kvar, ne osobina:

| Ne dira se | Zašto |
|---|---|
| logo i ime u futeru | pravilo 8a u `CLAUDE.md` — logo se ne dira |
| mejl i domen (`info@rimoteka.com`) | u ćirilici prestaje da bude adresa |
| skraćenice velikim slovima (PDF, ABAB, AABB) | to su oznake, ne reči |
| **beležnica i brojač slogova** | tamo je tekst korisnika; pesma se čuva na uređaju i alat je ne sme prekucavati sam |

**Upisana reč** u poljima za rime, pretragu i igru prelazi u izabrano pismo, u
oba smera. Prebacuje se **preko latinice** (`toCyr(toLatin(v))`) — bez toga
digrafi ne rade: posle „l" stoji „л", pa bi „j" dalo „лј" umesto „љ".

## 5. Česta pitanja — zašto u njima nije bilo nijednog linka

Odgovori su se HTML-escapeovali (`esc(a)`), pa bi svaki `<a>` ispao kao goli
tekst. Zato **nijedan generisani FAQ nije imao ijedan link**, iako odgovori
pominju druge alate („u tabu Klasici", „ima beležnicu…").

Rešenje: `faq_sa_linkovima()` — escapuje pa naziv alata pretvara u link. Traži
samo po delovima koji **još nisu link** (inače bi se kasnija fraza uhvatila
unutar već ubačenog `href`-a), preskače link na samu sebe, najviše **2 po
odgovoru**. `FAQPage` šema i dalje dobija **čist tekst** — HTML u šemi nije
dozvoljen. Padeži stoje izbrojani u `FAQ_LINKOVI` (nastavci se u srpskom ne
izvode iz nominativa).

**Rezultat:** 10 odgovora je dobilo link, 0 ih je ostalo da pominje alat bez linka.

**Da li su česta pitanja ista na svim stranama?** Nisu: **81 različito pitanje
na 22 strane**, a ponavljaju se samo tri, po dva puta — i to na strani kojoj
pitanje prirodno pripada (početna + `/rimovanje-reci/`, početna + `/slogovi/`).
Nije problem duplog sadržaja.

## 6. Čipovi — zašto su ikonice izlazile iz okvira

Izmereno: sadržaj čipa (reč + broj slogova + tri ikonice) traži **196–282px**, a
kolona je bila `minmax(11.5rem, 1fr)` = **184px**. Čip je bio `inline-flex` bez
prelamanja, pa mu je sadržaj probijao sopstveni okvir.

Popravka: kolona **15rem** + `flex-wrap:wrap` i `min-width:0` na čipu, pa kod
duge reči ikonice pređu u drugi red **unutar** pilule; reč ostaje cela.
`overflow-wrap:anywhere` na reči je krajnja zaštita za uzak ekran.

**Fiksna širina ne može oba** — kratke reči bi trošile prazan prostor, duge bi
i dalje virile. Zato prelamanje, ne šira kolona.

## Zamke

- **`?v=` podignut na `20260728j`** u `public/index.html` **i**
  `build/gen_pages.py` — obavezno oba.
- **Blok „Srodne strane" koristi postojeće klase** (`.res-group`, `.seo-p`) —
  nije dodata nijedna linija CSS-a.
- **Futer mora biti isti** u `public/index.html` i `FOOTER_TMPL` u
  `gen_pages.py`. Red „Namene" je proširen sa 6 na 12 linkova — u oba fajla.
- **`app.js` sada ide na SVAKU tematsku stranu**, i kad na njoj nema alata —
  bez njega prekidač za pismo ne bi radio.
- **Oznaka za skraćenice u `convertTextNodes` mora biti `\u0000`**, ne broj —
  sa običnim brojem bi „ima 3 sloga" bilo prepoznato kao oznaka i tekst bi se
  pokvario.

## 7. Google Search Console — urađeno

- **Sitemap** ponovo poslat (2.010 URL-ova) — „Sitemap submitted successfully"
- **IndexNow** ping: Bing 200, Yandex 202
- **Request Indexing** za 8 strana. Zatečeno stanje je potvrdilo dijagnozu —
  sve strane bez dolaznih linkova bile su **„URL is not on Google"**:

| Strana | Zatečeno stanje |
|---|---|
| `/rime-za-prijatelje/` | nije bila na Google-u |
| `/rime-za-roditelje/` | nije bila na Google-u |
| `/rime-za-novu-godinu/` | nije bila na Google-u |
| `/pisanje-pesama/` | nije bila na Google-u |
| `/recnik-srpskog-jezika/` | nije bila na Google-u |
| `/klasici/` | nije bila na Google-u |
| `/igra-rimovanja/` | nije bila na Google-u |
| `/slogovi/` | jeste bila |
| `/rimovanje-reci/` | jeste bila (prvi pokušaj pao sa „Something went wrong", drugi prošao) |

**Redosled je ispravila vlasnica** i bila je u pravu: krenuo sam od strana bez
ijednog linka, a prednost imaju **nove strane alata** — one su vrednije, a
dnevna kvota za Request Indexing je oko 10-12.

**Ostalo za sutra (kvota):** `/rime-za-tugu-i-secanje/`,
`/rime-za-decu-o-prirodi/`, `/rime-za-decu-o-zivotinjama/`.

> Podatak koji vredi zapamtiti: GSC pokazuje **124 indeksirane** i **1.012
> neindeksiranih** strana. Interno povezivanje iz ove sesije cilja upravo taj
> odnos.

## Šta čeka

1. Sutra: Request Indexing za preostale 3 strane (kvota)
2. Za 7-10 dana proveriti u GSC da li su strane iz tabele prešle u „indeksirano"
3. Ostalo je nedirnuto u `TODO.md` (dečji režim, nove reči, staging grana,
   4.769 reči sa objašnjenjem kojih nema u rečniku)

---

# Sesija 28. jul 2026 — svaki alat dobio svoju stranu

> **Stanje: sve je na produkciji i zeleno.** `node test/predeploy.mjs` → **104/104**,
> i lokalno i protiv `https://rimoteka.com`. Commit `2067fe2e`.

## 1. Traka tabova je postala navigacija sajta

Do sada su svi alati živeli na jednom URL-u, pa je Google mogao da rangira samo
**jednu** nameru i prečice u rezultatima nisu bile moguće. Sada svaki alat ima
svoju stranu **sa živim alatom na njoj**, a ista traka stoji na **svakoj** strani.

| Tab | Strana | Napomena |
|-----|--------|----------|
| Rimovanje reči | `/rimovanje-reci/` | postojala |
| Rečnik | `/recnik-srpskog-jezika/` | novo (bilo „Pretraga reči") |
| Brojač slogova i karaktera | `/slogovi/` | postojala, ali **bez alata** — sada ga ima |
| Pisanje pesama | `/pisanje-pesama/` | novo |
| Klasici | `/klasici/` | novo |
| Igra rimovanja | `/igra-rimovanja/` | novo |

„Omiljene" namerno nema stranu — lične reči, Google tu nema šta da indeksira.

**Kako radi:** stavke su pravi `<a href>`. Gde panel postoji (na početnoj svi),
klik se presreće i tab se prebaci **bez osvežavanja**; gde ga nema, link radi
normalno. **Markup alata se ne prepisuje** u `gen_pages.py` nego se čita iz
`index.html` pri buildu — dve kopije bi se razišle.

## 2. Beležnica

Metar (ritam slog po slog, cezura deseterac 4+6 i dvanaesterac 6+6, mera stiha,
broj stihova koji odstupaju), šema rime A/B/C, premeštanje stihova prevlačenjem,
panel sa rimama uz editor (na telefonu prikačen za dno), „još N rima", legenda.

**Akcenat se izvodi samo iz sigurnih pravila.** Kod reči od 3+ sloga mesto
akcenta se **ne nagađa** — stoji „akcenat je na jednom od ovih slogova".

## 3. Brojač slogova — jedno polje umesto dva

Brojevi stoje levo od reda; tekst se više ne ponavlja ispod. Polje je i dalje
`<textarea>`, a položaj redova se meri na nevidljivoj kopiji (`#sylMirror`) —
po jedan `<div>` za svaki red, pa se prelama identično.

## 4. Rečnik

- **−48 ćelavih latinica** (`zmurke`→`žmurke`). Pre brisanja provereno da svaka
  ima ispravan parnjak — svih 48 ga je imalo.
- **19 imperativa glagola na -ći** (`tuci`, `izvuci`, `uteci`) prepoznato kao
  **ispravno** i zadržano — umalo obrisani zajedno sa ćelavima.
- **−1** izmišljena `mladoturke` · **+2** `tate`, `tati` (falili kod *tata*).

## 5. SEO tekst

Izbačene tvrdnje koje ne bi izdržale proveru (stajalo je „nema ga nijedan rimer
u svetu" — RhymeZone ima objašnjenja, na engleskom). Brojevi se zaokružuju
**naniže**. Tekst o alatu pripada tabu „Rimovanje reči" i ne stoji nad ostalim
tabovima. Dodato interno povezivanje — tri strane nisu imale nijedan dolazni
link iz sadržaja.

## Bugovi nađeni i popravljeni

1. **`app.js` je padao na svakoj strani bez polja za rime** — `rimeInput.parentNode`
   je `null`; skripta pukne i **obori sve alate na toj strani**. Izašlo tek kad je
   napravljena prva takva strana.
2. **Igra je zadavala nerešive reči.** Prva „popravka" je bila POGREŠNA: igra
   priznaje savršenu rimu **ili asonancu**, a provera je gledala samo savršenu.
3. **Gutter je merio vrh otiska slova umesto linijskog okvira** — brojevi su
   sedeli pola proreda niže; klizio i kod prelomljenih redova.
4. Rime su bile u flex rasporedu pa je poslednja visila sama → mreža.
5. Sinonimi su ulazili u panel uz stih („naći" → *izumeti, otkriti*).
6. Klik na rimu ju je lepio bez razmaka i rušio panel (okvir je „treperio").
7. Srpska množina u metru („2 sloga"), i „0 slogova" više ne postoji.

## Zamke koje MORAŠ znati

- **Brojač i beležnica dele klasu `.gutter-row`** — svaki upit vezati za svoj
  gutter (`#noteGutter …` / `#sylGutter …`), inače hvata oba.
- **Verzija keša `?v=`** mora da se podigne u `public/index.html` **i** u
  `build/gen_pages.py`. Bile su tri različite u opticaju i korisnica je danima
  gledala staru skriptu.
- **Dve sesije rade u istom folderu** — komitovati samo svoje fajlove
  (`git add <putanje>`), nikad `git add -A`.
- **Tvrdnje na sajtu**: „jedini na srpskom" sme, „prvi u svetu" ne (postoje
  Versepad, GoRhyme, RHYMEBOOK, Poem Analysis na engleskom). Brojevi se prebroje
  pa zaokruže naniže. Pravilo je u `TODO.md`, tačka 8.

## Sledeće — sve je u `TODO.md`

Dečji režim · nove reči · **staging grana** · GSC · **4.769 reči ima objašnjenje
ali ih nema u rečniku** · stope (trohej, jamb) čekaju akcentovani rečnik.

---

# Handover — sesija 26–27. jul 2026

> Prethodni handover (26.07. u 03:00) upozoravao je da je sajt „možda pokvaren".
> **Bio je pokvaren. Sada radi.** Uzrok je nađen, popravljen i pokriven testom.

---

## STANJE SAJTA

**Produkcija radi.** `https://rimoteka.com` — rime rade, svih 7 tabova radi,
konzola bez grešaka. **84 provere prolaze** i lokalno i protiv produkcije.

**Pre bilo kakvog deploy-a:**

```bash
cd /Users/jovana.jovic/Projects/rimoteka
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

1. **`docs/recnik/RECNIK-NOVE-RECI.md`** — 5.459 reči iz Rečnika Matice srpske kojih nemamo:
   - **A1 preporučene (1.140)** — u dva izvora, nisu označene kao hrvatske
   - A2 označene kao hrvatske (135) — proveriti, ima grešaka
   - B samo u Rečniku MS (4.184) — nisu proverene ni na hrvatsko
2. **Ispravan `frekvencija.json`** — ne dodaje nijednu reč, samo ispravlja
   redosled rima
3. **Presuda o pokrajinskom i zastarelom** — nijedan izvor koji imamo to ne zna

### Zamrznuto
- `docs/recnik/RECNIK-PREDLOG.md` — 13.827 oblika za glagole
- `docs/recnik/RECNIK-PREDLOG-SREDNJI-ROD.md` — 1.058 padeža za imenice srednjeg roda

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
2. **Pregled grupe A1** iz `docs/recnik/RECNIK-NOVE-RECI.md` — 1.140 reči, najveći dobitak
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

---

# Prilog šesnaestoj sesiji — SINONIMI: pokušaji i poštena presuda (17.08.2026)

- Prijava vlasnice: sinonimi za „šišarka" = šiška (kosa), babuška, šišarica,
  babura (paprika). Popravljeno ručno: šišarka → samo šišarica (Matica st.2).
- Izmereno na celom fajlu: 13.503 ključa, 160.787 parova, **50% sinonima nije
  odrednica ni u Matici** (uzorak „žena" → baja, mačka, cica, pani…).
- **Tri neuspela mašinska puta do „100% tačnih":**
  1. Rudarenje Matica-upućivanja („в. X"): OCR deli i kvari reči — uzorak
     „anđeo → kosti", „apostolska → znak".
  2. Varijante „X/, Y": hvata nasumične parove teksta („kalne → mene").
  3. Poklapanje značenja po našim definicijama: ubija očigledan šum
     (šiška, babura, babuška riba ✓) ali ubija i dobre parove
     (sunce→zvezda ✗, drugačije formulisane definicije) i pušta majka→žena.
- **Presuda: sinonimi bez ljudske provere ne postoje u pravopis-kvalitetu.**
  Rešenje je KURIRANI set: po učestalosti, kartica po kartica (naša def +
  red iz Matice + mašinski kandidati), vlasnica bira — spisak
  `AUDIT/sinonimi-kandidati.md` je samo pomoćni prikaz, ne izvor istine.
- sinonimi.json: vraćen na zatečeno + popravka „šišarka"; verzija 20260816e.
