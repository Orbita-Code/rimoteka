# Otvoreni nalazi — Rimoteka

> Živi spisak. Popravljeno se **briše**, novo se **dodaje**.
> Kolona „viđen" je datum kad je nalaz PRVI put zabeležen — po njoj se vidi šta se odlaže.
>
> Pun opis svakog nalaza: `AUDIT/2026-08-20-audit.md` (najnoviji), pa `2026-08-10-audit.md`,
> `2026-07-28-audit.md`, `2026-07-29-dopuna.md`. Metod rada: `~/.claude/AUDIT-PROTOKOL.md`

## ZATVORENO 06.09.2026 — SLOGOVI ZA REČI VELIKIM SLOVOM (prijava korisnika)

Prijava korisnika: „nepostojan" → filter „1 slog" nudi „Iran". Reprodukovano na sajtu.

| Šta | Bilo | Sada |
|---|---|---|
| `countSyl` u `app.js` | ne prebacuje u mala slova → „Iran" = 1 slog | `toLowerCase()`, kao `vowelPositions` → 2 |
| `count_syl` / `rhyme_key` / `loose_key` / `final_syl_key` u `gen_pages.py` | isto | isto popravljeno, 1:1 sa app.js |
| samoisključenje cilja na statičkoj strani | `w != t` → „Albanija" nudi „albanija" | `w.lower() != t.lower()` |
| pogrešnih pilula na statičkim stranama | 146 na 133 strane | 0 |
| test | nijedna reč velikim slovom | sekcija **45**: ceo rečnik + tok korisnika + statička strana |

Tri strane ispale iz sitemapa (2.017 → 2.014): Melburn, Njujork, Stokholm — jedina
„rima" im je bio sopstveni mali oblik. Nepostojeće `/rime-za/…` već idu 301 na hub.

**ZATVORENO ISTOG DANA — mali dvojnici imena (odluka vlasnice 06.09.):** obrisano **488**
malih oblika (`iran`, `albanija`, `beograd`…), ostalo 120 pravih reči koje se pišu isto
(`danska`, `rimi`, `prag`, `mesec`…). Spisak: `AUDIT/obrisani-mali-oblici-06-09-2026.md`.
Uz to: učestalost i Matica se sada traže i po malom obliku, pa imena više ne padaju na dno.
Test: sekcija 45 (nema dvojnika; „Srbija“ ima učestalost). Rečnik: 280.476 → 279.988 reči.

**NOV NALAZ ZA ODLUKU (06.09.):** rečnik ima **48 skraćenica bez samoglasnika** (`dnk`, `gps`,
`html`, `jpg`, `pdf`, `kgb`, `cd`, `dvd`, `hm`, `pst`…) koje alat prikazuje kao „1 slog“ i nudi
kao rime. Predlog: izbaciti ih iz `reci.txt` (nisu reči nego skraćenice; uzvici `hm`, `pst`,
`psst` mogu ostati). Čeka odluku vlasnice.

---

## URAĐENO 26.08.2026 — naslovi, preimenovana strana, sopstveni promet

Test **604 → 650 provera**, prolazi 650/650. `nginx.conf` proveren zasebno.

| Šta | Bilo | Sada |
|---|---|---|
| **Naslov početne** | „Rimovanje reči na srpskom — rime, slogovi, pesme" | „Rečnik rima — rime, slogovi i značenje svake reči". Početna sada „drži" upit `rečnik rima` (489 prikaza, padao baš na nju) |
| **`/rimovanje-reci/`** | „Rimovanje reči — pronađi rimu…" | „**Rime** i rimovanje reči — pronađi rimu za svaku reč". Drži upit `rime` (522 prikaza, **0 klikova**). Opis nije diran — ta strana ima najbolji CTR na sajtu (6,1 %) |
| **`/recnik-srpskog-jezika/`** | obećavala rečnik srpskog jezika, a alat traži reči po slovima; 402 prikaza, 5 klikova, zadržavanje 31 s | **preimenovana u `/rime-po-zavrsetku/`** — „Rime po završetku". Opis napisala vlasnica. 301 sa stare adrese |
| **`/klasici/`** | opis obećavao „klikni na reč da joj nađeš rime" | obećanje **izbačeno** — klikće se slovo šeme rime, ne reč (nalaz E, i dalje otvoren) |
| **Pet strana sa predugim naslovima** | 67–69 znakova, opisi 181–189 | svi u opsegu 40–65 i 110–165 (nalaz V1, delimično zatvoren) |
| **Sopstveni promet u analitici** | test je pravio 34 „nova korisnika" po prolazu | test presreće zahteve ka Google-u; `?interno=1` gasi merenje na uređaju |

**Zašto je preimenovanje bilo nužno** (odluka vlasnice): strana se zvala „rečnik srpskog
jezika", a nije rečnik — ukucaš `apsurdno` i dobiješ samo tu reč kao pilulu, značenje je
iza ⓘ. Ljudi koji traže značenje dolazili su i odlazili za 31 sekundu.

**Sopstveni promet — izmereno pre popravke:**

| Grad | Korisnika | Novih | Zadržavanje |
|---|---|---|---|
| Beograd (prava publika) | 496 | 464 | 2 min 56 s |
| Barselona (test) | 206 | **203** | **12 s** |
| Malaga | 42 | 40 | 39 s |

To je bilo **20 % svih korisnika**. Prava publika za 28 dana je oko **950 novih ljudi**,
ne 1.194. **Čisto je tek od 26.08.2026** — GA4 ne briše unazad.
Pouka: `PROPUSTI.md`, odeljak od 26.08.

**Nove provere:** sekcija **42** (dužina naslova i opisa, ključne reči, brojevi koji
zastarevaju), sekcija **43** (prekidač za sopstveni promet, i da iz testa nijedan zahtev
ne stigne do Google-a), plus provera 301 preusmerenja u `test/nginx-provera.sh`.

**Dva lažna nalaza usput, oba potvrđena kao trka pod opterećenjem, ne kvar:** provera
kursora u beležnici (12h) i `?tab=igra` (N3). Obe prolaze u izolaciji — 12h tri od tri
na produkciji, N3 šest od šest lokalno.

---

## ZATVORENO 24.08.2026 — V5 (verzije podataka)

Bilo: `?v=` uz svaki fajl sa podacima kucao je čovek, pa je `reci.txt` izmenjen
20.08. (izbačen `kapučino`) ostao na verziji od 17.08. Keš i service worker gledaju
**adresu**, ne datum — pa je povratnik dobijao stari rečnik.

Sada: `?v=` je **prvih osam znakova otiska (sha256) samog fajla**. Promeni se sadržaj,
promeni se adresa; nema šta da se zaboravi. Obuhvaćeno je svih **sedam** fajlova sa
podacima, ne samo dva iz nalaza:

| Fajl | Bilo | Sada |
|---|---|---|
| `reci.txt` | `20260816d` | `8a9899b2` |
| `reci_jekavica.txt` | `20260802a` | `1e9eef37` |
| `definicije.json` | `238` | `cb62a039` |
| `frekvencija.json` | `2` | `1bfe729c` |
| `sinonimi.json` | `20260820a` | `a6c3cea3` |
| `matica.json` | `1` | `fb9dfdde` |
| `jekavski.json` | `20260803a` | `40070794` |

Alat: `node scripts/osvezi-verzije-podataka.mjs` — pušta se posle svake izmene rečnika.
Provera: **sekcija 41** pada ako se sadržaj promenio a verzija nije, i kaže koju komandu
treba pustiti. Provereno tako što je stara verzija vraćena ručno — provera je pala.

> **Ostaje pola posla:** `app.js` i `style.css` i dalje nose ručno kucanu verziju
> (`20260824a`). Ista klasa greške, samo na drugom mestu — upisano u `TODO.md`.

---

## ZATVORENO 24.08.2026 — K1 i K2 (dva kritična nalaza iz audita 20.08.)

> Provere su napisane PRE popravke i puštene protiv produkcije **dok je tamo bio
> stari kod** — pale su 24 puta. Tek onda je dirán kod. Posle popravke prolaze.

| Nalaz | Šta je bilo | Šta je sada | Provera koja to čuva |
|---|---|---|---|
| **K1** — redosled rima azbučni umesto po učestalosti | `gen_pages.py:689` je `rank` računao kao redni broj reči u azbučnom `reci.txt`; u alatu je pretraga iz `?rec=` kretala pre nego što `loadExtras()` prepiše `RANK` frekvencijskim. 96,4% strana imalo drugačiji redosled od alata, 51% nije prikazivalo rime koje alat daje, 11.369 izgubljenih reči | nova `load_rank()` u `gen_pages.py` računa isto kao `app.js:455`, iz **istih fajlova koje učitava pregledač** (`public/frekvencija.json`, `public/matica.json` — ne `build/matica-sve.json`); `loadExtras()` tiho ponovo iscrta rezultate kad frekvencija stigne | **sekcija 39** — 20 strana, prvih 10 rima mora biti identično alatu; `?rec=` mora dati isto kao ručno kucanje; „čeka" mora biti u spisku „top 10" |
| **K2** — 98.115 adresa otvoreno za Gugla | svaka rima je bila `<a href="/?rec=…">`; `noindex` nije postojao nigde u projektu; `og:` oznake i `h1` nisu pratili reč | reč bez svoje strane je sada `<button class="chip chip-btn" data-rec="…">` — za čoveka isto, robot nema šta da prati; `noindex,follow` za sve što nije reč iz rečnika; `og:title`/`og:description`/`og:url` i `h1` prate reč i vraćaju se kad se polje isprazni | **sekcija 40** — nula `?rec=` linkova na strani reči, klik na dugme i dalje vodi na `/?rec=`, `noindex` za niz slova i za prazan pogodak, `og:url` jednak kanonikalu |

**Izmereno posle popravke:**

| Mera | Pre | Posle |
|---|---|---|
| jedinstvenih `?rec=` adresa u HTML-u | 98.115 | **13** (namerni CTA linkovi na tematskim stranama) |
| `?rec=` linkova ukupno | 361.770 | 13 |
| strana reči | 1.994 | 1.994 (nepromenjeno) |
| adresa u sitemapu | 2.017 | 2.017 (nepromenjeno) |
| linkova sa huba ka stranama reči | 1.994 | 1.994 (nepromenjeno) |

**Uz to zatvoreno:** bag „čeka" iz `TODO.md` od 31.07.2026. Reč nije bila nigde
filtrirana — azbučni redosled ju je gurao na 24. mesto od 26. Sada je 8.

**Verzije podignute** na `20260824a` (`app.js`, `style.css`) — bez toga popravka ne bi
stigla do onih koji su već bili na sajtu, jer service worker gleda adresu, ne datum.

> **Dve sopstvene greške uhvaćene testom pri ovoj popravci** (`PROPUSTI.md`, 21 i 22):
> prvo pravilo za `noindex` bilo je vezano za broj rima, a `xqzwptrv` ima pet rima;
> i `h1` se nije vraćao kad se polje isprazni.

---

## STANJE NA DAN 20.08.2026 — pun audit, ocena 6,2/10 (bilo 8,4 na dan 10.08.)

**Kritični K1 i K2 su ZATVORENI 24.08.2026** (v. odeljak iznad). Ostaje: 4 visoka, 9 srednjih, 11 niskih (V5 zatvoren 24.08.). Dokaz i merenje za svaki:
`AUDIT/2026-08-20-audit.md`. Ovde je samo spisak za praćenje.

> **Ocena je pala zato što je audit prvi put merio nešto novo** — da li strane daju
> **isto što i alat**. Ne daju. Test od 572 provere to nikad nije pitao.

| # | Nalaz | Ozbiljnost | Viđen | Test | Status |
|---|---|---|---|---|---|
| ~~K1~~ | Redosled rima je AZBUČNI umesto po učestalosti — i na 1.994 statičke strane (`gen_pages.py:689`) i u alatu kad se dođe preko `?rec=` (`app.js:4767` pretražuje pre nego što `loadExtras()` prepiše `RANK`). Izmereno: 96,4% strana ima drugačiji redosled od alata, 51% ne prikazuje rime koje alat daje, 11.369 izgubljenih reči. **Ovo je i uzrok baga „čeka" iz TODO-a od 31.07.** | **KRITIČNO** | 20.08. | — | **ZATVOREN 24.08.** ✔ sekcija 39 |
| ~~K2~~ | 98.115 `?rec=` adresa otvoreno za obilazak (sitemap ima 2.017), a server svima vraća bajt-identičan HTML. Uz to `og:title`/`og:url`/`h1` ne prate reč. Nema ni `noindex` kad nema rima | **KRITIČNO** | 20.08. | — | **ZATVOREN 24.08.** ✔ sekcija 40 |
| **V1** | 1.739 od 1.994 naslova duže od 65 znakova (87%), najduži 76 | VISOKO | 20.08. | — | otvoren |
| **V2** | Sajt na 5 strana obećava sinonime, a `sinonimi.json` ima **2 reči** od 280.476 | VISOKO | 20.08. | — | otvoren — 140 kuriranih čeka odobrenje vlasnice |
| **V3** | Nema HSTS zaglavlja | VISOKO | 10.08. | — | otvoren — drugi audit |
| **V4 (M12)** | Beo okvir 2 px na „dobrim rimama" u tamnoj temi (15,1:1 prema podlozi); popravka je zaključana u `@media(max-width:560px)`, `style.css:2814` | VISOKO | 31.07. | — | **treći audit zaredom** — čeka odobrenje vlasnice |
| ~~V5~~ | `?v=` nije podignut uz izmenu rečnika 20.08. — povratnik dobija stari rečnik, sa `kapučino` | VISOKO | 20.08. | — | **ZATVOREN 24.08.** ✔ sekcija 41 |
| **S1** | Sigurnosna zaglavlja otpadaju sa `/sw.js` i `/sw-register.js` (`nginx.conf:49–52`) | SREDNJE | 20.08. | — | otvoren |
| **S2** | „**Sve** što se rimuje sa X — N reči", a N ne broji bliske rime na istoj strani | SREDNJE | 20.08. | — | otvoren |
| **S3** | 4.119 reči ima definiciju, a nema ih ni u jednom rečniku — alat ih nikad ne ponudi | SREDNJE | 20.08. | — | otvoren |
| **S4** | `perje` samo u `reci_jekavica.txt` iako je oblik isti u ekavici | SREDNJE | 20.08. | — | otvoren |
| **S5** | Nema „preskoči na sadržaj" — glavno polje je 13. zaustavljanje Tab-a | SREDNJE | 20.08. | — | otvoren |
| **S6** | Traka rima u beležnici na telefonu: od 16 rima vide se 4, tastaturom nedostupne | SREDNJE | 20.08. | — | otvoren |
| **S7** | Dodirni ciljevi 40 px umesto 44 (filteri slogova, pismo, potvrdna polja) | SREDNJE | 20.08. | — | otvoren |
| **S8** | `lastmod` svih 2.017 adresa je datum gradnje | SREDNJE | 10.08. | — | otvoren |
| **S9** | Velika slova u adresi vode na hub umesto na svoju stranu (smer se obrnuo od 10.08.) | SREDNJE | 10.08. | — | otvoren |
| **N1–N11** | Vidi `AUDIT/2026-08-20-audit.md`, odeljak NISKO | NISKO | 20.08. | — | otvoreno |
| **P11** | Hub `/rime-za/` je zid od 1.994 linka (sada sa sidrima po slovima) | SREDNJE | 29.07. | — | **čeka odluku vlasnice o izgledu** |
| **M8** | Oznake uz stih popravljene i na računaru | — | 31.07. | ✔ sekcija 31 | **čeka odluku vlasnice** |

### Šta je test rekao istog dana

`node test/predeploy.mjs` → **564/564 ✅** · `BASE=https://rimoteka.com` → **572/572 ✅**

Oba prolaze, a K1 je kritičan. Rupe koje su ga propustile popisane su u auditu 20.08.,
odeljak „RUPE U TESTU". Najvažnija: **test nikad ne poredi stranu sa alatom.**

---


**Stanje na dan 16.08.2026: 2 otvorena nalaza + 16 prijava vlasnice LOKALNO
popravljeno (čeka se njen pregled, pa deploy) + 1 rečnički nalaz ZATVOREN
istog dana** (izbačeni „većera" i „većeras" — Matica ima samo „večera/večeras";
pravilo vlasnice: rečnik prati pravopis, ne govor; detalji u `HANDOVER.md`,
šesnaesta sesija). Prijave su stigle sa njenog
iPhone-a u dve ture istog dana — 7 sa produkcije (skrol-tastatura, sečene
pilule, stihovi, ijekavica u igri, „znanstveni", placeholder) i 9 sa lokalnog
preview-a (lomljenje teksta u tabovima, široke pilule, razbacane akcije, futer
u dva reda, praznina, Omiljene duplo, traka rima iza Safari trake, skok pri
kucanju slogova). Sve popravljeno, test **555/555** sa novom sekcijom 30G.
Pun opis: `HANDOVER.md`, petnaesta i šesnaesta sesija. **Zatvoriće se deploy-jem
i njenim pregledom na telefonu.** Nalazi koji čekaju njenu odluku i dalje
stoje: `P11` (izgled huba `/rime-za/`).

**Stanje na dan 02.08.2026 (kraj): 2 otvorena nalaza** — `R1-ostatak` (6 reči) i `P11`
(izgled huba) čekaju odluku vlasnice. **Zatvoreno u ovoj sesiji: J1-ostatak** — svih 277
spornih oblika provučeno kroz Rečnik Matice srpske; 99 hrvatskih obrisano, 141 ijekavski
sakriven.

**Stanje na dan 31.07.2026 (osma sesija, kraj): 3 otvorena nalaza** — mobilna verzija je odrađena u celini (M5–M15), test 372 → **422 provere**.

**Stanje na dan 30.07.2026 (sedma sesija, kraj): 3 otvorena nalaza** — `R1-ostatak` (6 reči) i `J1-ostatak` (277 oblika) čekaju odluku vlasnice, `P11` (izgled huba) čeka odluku o izgledu. **Zatvoreno u ovoj sesiji: F1, J1, R1, T1, P16, P10.** Test 354 → **367 provera** + 5 novih u `nginx-provera.sh`.

> ### Usklađivanje evidencije 30.07.2026 — pročitati pre audita
> Spisak je rekao „2 otvorena", `CLAUDE.md` projekta je rekao „33 otvorena, 6 kritičnih,
> 7,2/10". Oba su bila netačna. Provereno prebrojavanjem po fajlovima:
>
> | Tvrdnja | Gde je stajala | Presuda |
> |---|---|---|
> | 33 otvorena, 6 kritičnih, ocena 7,2/10 | `CLAUDE.md` odeljak 9b | **zastarelo** — to je stanje 28.07. **pre** nego što je sesija 29.07. zatvorila 60 nalaza. Ispravljeno 30.07. |
> | 2 otvorena (P10, P11) | ovaj fajl | **tačno za praćene nalaze**, ali spisak je bio nepotpun (vidi dva reda ispod) |
> | **F1 — `frekvencija.json` pogrešno izvučen** | samo `TODO-RECNIK.md` „HITNO" i prompt za sledeću sesiju | **nepraćen otvoren nalaz** — izmeren, utiče na rangiranje na produkciji. Sada upisan kao F1. |
> | **P16 — strana skače 50 px** | `HANDOVER.md:185` tvrdi da je „u `NALAZI-OTVORENI.md` upisan sa punom istinom" | **nije bio upisan** — pominjao se u jednoj rečenici. Popravljen je; sada stoji u tabeli zatvorenih, uz obavezu ponovnog merenja 31.07. |
> | ocena **6,9/10** | `HANDOVER.md:880`, `UPUTSTVO-ZA-POPRAVKE.md:25` | **tačna, ali nije bila u audit fajlu** — `2026-07-28-audit.md` još kaže 7,2/10. 6,9 je ocena posle dopune 29.07. (37 novih potvrđenih nalaza). Audit 31.07. računa novu. |
>
> **Pouka za `PROPUSTI.md`:** nalaz koji živi samo u `TODO`-u ili u handoveru **nije praćen
> nalaz**. Svaki nalaz ulazi u OVAJ fajl istog dana kad se otkrije, pa onda po potrebi i u TODO.
> **N12 — ZATVOREN 29.07. kasno uveče.** Uzrok: Traefik-ov `redirect-to-https`
> middleware nije imao `permanent` flag (302 za GET, 307 za HEAD), a oznake se
> regenerišu pri svakom deploy-u. Rešenje: `rimoteka-301.yaml` u Traefik dynamic
> config-u na serveru (host-ograničen, `priority: 9999`, `redirectScheme
> permanent: true`). Izmereno: GET → **301** (koren, putanja sa upitom, www),
> HEAD → 308, https 200. Provere dodate u sekciju 25 testa.
> **M1–M4 (mobilni) i A4 — NA PRODUKCIJI.** Deployovano 29.07. kasno uveče
> (`e233a165d`); test protiv produkcije **358/358**, sekcija 26 prolazi uživo.
> Detalji: `HANDOVER.md`, sesija 29.07. (šesta) — uključujući iCloud incident
> (1.047 duplikata uhvaćeno pre push-a) i premeštaj repoa u `~/Projects`.
> **Odloženo odlukom vlasnice (2):** P10 (strane reči birane po abecedi, 1.577 od
> 1.988 na slovo „a") i P11 (hub `/rime-za/` je zid od 1.988 linkova) — **isti
> uzrok**, plan u `TODO.md`, odeljak 0.0.
>
> **Zatvoreno merenjem:** **P2** (CLS na `/rime-za/`) — popravka preload-a fonta iz
> prethodne sesije **jeste radila**, samo nikad nije bila izmerena: `/rime-za/ljubav/`
> daje **CLS 0,0003** (bilo 0,045). Merenje je usput otkrilo **P16**, gori od njega.
>
> **Sve prijave vlasnice odnose se na stvari koje je test propuštao.** Videti
> `PROPUSTI.md`, pravila 25–28.
> Zatvoreno 29.07. uveče, po odlukama vlasnice:
> · **S10** — sinonimi za „sunce" bili 13 od 19 sinonimi reči „snop"; odrednica
>   prepisana po **Rečniku srpskoga jezika** (Matica srpska, 2011): *zvezda,
>   svetlost, toplota*. Rečnik sada stoji lokalno u `~/Literatura/`.
> · **K3 (ostatak)** — dečji režim blokira po **osnovi**, ne po tačnom obliku, pa
>   „krevetu" više ne daje „dupetu" ni „protestu" → „incestu". Reči **ostaju u
>   rečniku**, samo se ne prikazuju u dečjem režimu. Uz to je **„rat" i porodica
>   odblokirana** — odluka vlasnice: deca se igraju rata, reč im nije strana.
> · **P1** — logo se ne dira; umesto toga je u `TODO.md` (0.2) upisan zahtev za
>   prave verzije logotipa, čime se P1 zatvara sam kad stignu.
Ocena poslednjeg audita: **6,9 / 10** — nova ocena se računa u auditu 31.07.2026.

**Zatvoreno u ovoj sesiji: 60 nalaza.** Test podignut sa **167 na 265+ provera**.
Svaka nova provera je prvo puštena **protiv produkcije dok je tamo stari kod** i
tek kad je pala uzeta je kao valjana — ukupno **74 provere pale na produkciji**.

---

## ZATVORENO 02.08.2026 — R1-ostatak (šest reči)

Reči su ponovo provučene kroz Rečnik Matice srpske, sa dokazom za svaku:

| Reč | Šta kaže Rečnik Matice | Odluka vlasnice |
|---|---|---|
| `grne` | odrednica `грнути, грнем` (red 45112) | **ostaje** |
| `klube` | nije zasebna odrednica, ali stoji u odrednici `клупче`: „дем. од **клубе** и клупко" (red 114142) — znači *klupko*, ne „oblik reči klub" | obrisano |
| `grnce` | `грнути` i `грнчар` postoje, `грне` kao imenica (lonac) nije odrednica | obrisano |
| `krol` | rečnik ima `краул` (red 264873); `крол` se ne javlja nigde | obrisano |
| `gojenac`, `gojence` | nema ih nigde; za taj pojam rečnik daje `штићеник` | obrisano |

Obrisano iz `public/reci.txt` (272.638 → **272.633**) i iz `public/definicije.json`
(282.852 → **282.847**). Povratna kopija: `reci.txt.pre-r1`.

> Prvi prolaz (30.07.) je za svih šest rekao „nema ih u Matici" i predložio brisanje.
> Dve od njih rečnik **ima** — `grne` kao odrednicu, `klube` unutar tuđe odrednice.
> Pouka je u `PROPUSTI.md`, pravilo 68.

---

## ZATVORENO 02.08.2026 — J1-ostatak (277 spornih oblika)

> Povod: prijava vlasnice — „zašto imam reč `hljeba`, a nisam uključila ijekavicu?"
> Reč je stajala u ekavskom `reci.txt`, a spisak za skrivanje (`jekavski.json`)
> imao je šest od devet oblika te reči. Odatle je otvoren ceo J1-ostatak.

**Kako je presuđeno:** `scripts/j1-provera-matica.py` provlači svih 277 oblika kroz
Rečnik srpskoga jezika (Matica srpska, 2011) i uz svaku presudu ispisuje red iz
rečnika u kome je nađena — `AUDIT/J1-presuda-matica.md`. Redosled merila: izričita
oznaka „јек." → sama je odrednica → ekavski parnjak postoji → ista osnova sa
odrednicom. Primena: `scripts/j1-primeni.py`.

| Presuda | Koliko | Šta je urađeno |
|---|---|---|
| ijekavski / dijalekatski | 141 | dodato u `public/jekavski.json` (850 → **991**) — krije se, ne briše |
| hrvatski oblici | **99** | obrisano iz `public/reci.txt` (272.737 → 272.638), kopija u `reci.txt.pre-j1` |
| ostaju u ekavici | 4 | `toplinom`, `ekavice`, `nalećete`, `sol` — obične srpske reči |
| standardne | 31 | `ded`, `dobivati`, `znanost`, `sućut`… ostaju netaknute |

Usput obrisano i devet oblika reči `hljeb` iz ekavskog rečnika, a prebačeni su u
`public/reci_jekavica.txt` da ih ijekavica i dalje daje.

**Dve sopstvene greške u proveri, uhvaćene i ispravljene** (v. `PROPUSTI.md`):
`ded` je prvo proglašen ijekavskim jer je traženo poklapanje **dela** reči, pa se
iza oznake „јек." našlo `deda`; `toplinom` je prvo završilo među „nema ih u Matici"
jer se osnova `toplin-` poredila sa odrednicom `toplina` kao „početak reči", a
nijedna nije početak druge — sada se porede prva šest slova.

---

## ZATVORENO 31.07.2026 (deseta sesija) — TEKST NA CELOM SAJTU

> Zahtev vlasnice: napravljen agent `tekstopisac` (`.claude/agents/tekstopisac.md`), pa
> pušten na ceo sajt. Četiri nezavisna pregleda: glavne strane, tematske strane i šablon,
> ključne reči, linkovi sa drugih sajtova. Izveštaji: `AUDIT/tekstovi/2026-07-31-*.md`.
> **Ocena teksta pre popravke: 3,6/10.** Vlasnica odobrila sve nalaze.

| # | Šta je bilo | Šta je sada | Šta to čuva |
|---|---|---|---|
| **T2** | **Šest odgovora u „Čestim pitanjima" nabrajalo 49 reči kao rime — nijedna se ne rimuje.** `majka → reka, čeka, njega` (0/8), `prijatelj → smeh, dnevnik, željeznički` (0/6, uz hrvatski oblik), `godina` (0/8), `rođendan` (0/10), `ljubav` na dve strane (0/17). Reč `bliza` navedena kao rima — **nema je u `reci.txt`** | Sve zamene **prepisane iz naših generisanih strana i proverene programski: 46/46 potvrđeno** protiv spiska pravih rima | **Test, sekcija 32** (8 provera). Čita spisak **iz teksta same strane** — ne iz upisane tabele — i traži svaku reč među pravim rimama, **isključujući blok „Rime za druge reči"**. Prva verzija je uzimala upisanu tabelu tačnih rima i zato **prolazila i na produkciji sa pogrešnim tekstom**; otkriveno puštanjem protiv produkcije (pravilo H4) |
| **T3** | Blok „**Još popularnih rima**" na **1.993 strane** — a `related_targets` vraća meta-reči, ne rime (`gen_pages.py:879`). Nose istu klasu `.word` kao prave rime, pa se **ni programski ne razlikuju** — zbog toga je pet lažnih FAQ odgovora „prošlo" automatsku proveru | Naslov „**Rime za druge reči**" + rečenica ispod: „Ovo nisu rime za „X" — to su strane sa rimama za druge reči." | — |
| **T4** | „**rangirano po kvalitetu**" / „poređane od najčešćih ka manje poznatim" / „pokazuje kvalitet svake rime" — **na 5 strana + ~2.000 generisanih**. Kod sortira po **blizini broja slogova** (`app.js:942–948`) | Svuda: „na vrhu su rime sa istim brojem slogova kao tvoja reč — one najlakše legnu u stih" | — |
| **T5** | Naslov grupe „**Najbolje rime**" značio je **dve različite stvari**: u alatu isti broj slogova (`app.js:965`), na generisanoj strani duži zajednički završetak (`gen_pages.py:811`) | Na generisanoj strani: „**Rime sa istim završetkom**" | — |
| **T6** | Opis u pretrazi na 1.993 strane: **medijana 205 znakova, najduži 279** — Google ga seče, pa je oglas za sajt glasio „gubav, av, bagav" | Opis se **puni do granice**, ne na fiksan broj primera: medijana **147**, najduži **158**, **0 preko 160** | — |
| **T7** | Naslovi: medijana 55, u opsegu 60–70 samo **103 od 1.993**; fraze `rečnik rima` (204 prikaza, 0 klikova) nije bilo nigde | Medijana **67**, u opsegu **1.803 od 1.993**, fraza u naslovu | — |
| **T8** | **1.993 strane bez ijednog linka ka drugim alatima iz teksta** (`faq_sa_linkovima` se u tom šablonu ne poziva) | Nov odeljak „**Šta dalje**" — 4 opisna linka: slogovi, vrste rima, rime za decu, beležnica | — |
| **T9** | „**preko 270.000 reči**" na 5 mesta + ~2.000 strana — broj koji raste | „rečnik pokriva ceo srpski jezik" | — |
| **T10** | Persiranje: `404`, „Naglasite snagu", „Pomislite na", „Budite iskreni", „Dozvolite si" (**hrvatski sklop**) | Sve na „ti" | — |
| **T11** | Gramatičke greške objavljene na sajtu: „**nova početka**", „nekoliko stihova **mogu**", „**asonantu**", „kada vam je bio uz vas" | Ispravljeno | — |
| **T12** | 10 golih spiskova reči predstavljenih kao podatak („Popularne reči", „Najčešće reči") — **ručno otkucani, ništa mereno** | Rečenice sa zanatskim savetom + unutrašnji linkovi | — |
| **T13** | Tekst u alatu: 3 engleske poruke („Combo master", „Combo legend", „Perfect score"), **dva različita dugmeta pisala „obriši sve"**, 6 poruka bez izlaza („Nema rima za čuvanje") | Sve na srpskom, dugmad razdvojena („obriši pesmu" / „obriši sve reči"), poruke kažu **šta sada** | — |
| **T14** | Pro modal nudio „metar, ritam, šema rime — uskoro" i „izvoz u PDF — uskoro", a **oboje već radi besplatno** u beležnici | Uklonjeno (dugme je i inače zakomentarisano, `index.html:110`) | — |

**Ukupno 66 izmena teksta. Test 422/422, „Sme deploy".**

> **Nađeno usput, NIJE popravljeno — zaseban bag u alatu (ne u tekstu):**
> reč **`čeka` se savršeno rimuje sa `reka`**, ima definiciju i frekvenciju **34.809**,
> ali **nije među 115 rima** koje strana prikazuje — iako `dočeka` i `počeka` jesu.
> Nije u `RHYME_EXCLUSIONS`. Traži pregled logike izbora rima.

> **Sopstveni propust iz ovog prolaza** (`PROPUSTI.md`, pravilo 14, i pravila 51–56):
> prepisan uvod strane `/rimovanje-reci/` **pomerio je raspored strane** — CLS sa 0,0026
> skočio na **0,105** (svih 10 merenja preko granice). Uhvatio pre-deploy test.
> Posle popravke **0,0021–0,0026**, bolje i od produkcije.

---

## ZATVORENO 31.07.2026 (osma sesija) — MOBILNA VERZIJA

> Zahtev vlasnice: „uradi mobilnu verziju tako da bude najprofesionalnija i
> najlakša za korišćenje… ne smeš da menjaš ništa na desktopu i tabletu."
> Sve izmerено na 320/390/430 px, u obe teme. Sve popravke su u
> `@media(max-width:560px)` ili se pale tek kad se otvori tastatura —
> **osim M8**, koji je zajednički kod i menja i računar (v. napomenu).

| # | Bilo | Sada | Provera u testu |
|---|---|---|---|
| **M5** | **Tastatura zaklanjala ponuđene rime u beležnici** (prijava vlasnice). Panel je `position:fixed; bottom:0`, a to se meri prema layout viewport-u koji se pri otvaranju tastature ne smanjuje. Izmereno na 390×844: panel 557–844 px, tastatura pokriva od 508 naniže — **nijedna rima se nije videla**. | `--kb` se računa iz `visualViewport` (jedini put koji radi i na iOS-u i na Androidu — VirtualKeyboard API postoji samo u Chrome-u), panel stoji na `bottom:var(--kb)`. Izmereno: panel završava **tačno na 508**, prva rima 454–498. Uz to je sveden na **traku od 96 px** umesto lista od 287, pa se vidi i pesma koja se piše; strelica ga razvija u pun list. | **sekcija 30**, 14 provera na `/` i `/pisanje-pesama/` |
| **M6** | **Rime jedna ispod druge.** Pilula je nosila i ⓘ ♡ 🔁 pa je bila široka **228 px od 390** — u red je stajala jedna reč. 195 rima = spisak visok **12.524 px**, strana 16.113 px. | Mreža od **2–3 kolone** (`auto-fill minmax(104px,1fr)`: na 320 px dve, na 390 i 430 tri). Duga reč uzima dve ili tri kolone umesto da se prelama. Spisak **3.997 px**, strana 7.574 px. | sekcija 30, 5 provera |
| **M7** | Ikonice sklonjene iz pilule — moraju negde da postoje. | Dodir na reč otvara **traku iznad reči**: značenje · omiljene · rime · kopiraj, sve nacrtano kao SVG (jedan izgled na svakom telefonu). Sačuvana reč zadrži **puno srce** u pilули, da se vidi i bez otvaranja trake. | sekcija 30, 7 provera |
| **M8** | **Oznake uz stih (slogovi, šema rime) razminute sa stihom.** `getEditorText()` je 29.07. naučen da `<div>` računa kao novi red (mobilni Enter), a `editorTextIndex()` nije — nedostajao mu je po jedan znak posle svakog bloka. Izmereno: pesma kucana na telefonu ima poslednja dva stiha pomerena za **ceo red**, pesma sa praznim redom između strofa za **dva reda** (−59 px na 390, −68 na 1440). | Spisak pozicija broji identično kao `getEditorText()`. Šest oblika unosa × dve širine — sve poravnato (odstupanje 1 px, zaokruživanje). | **sekcija 31**, 12 provera; na starom kodu pada 6/12 |
| **M9** | Na `/pisanje-pesama/` i u tabu „Omiljene" dugmad beležnice visoka **23 px**. Popravka od 29.07. bila je vezana za `#panel-beleznica`, a ta strana ima `.landing-tool` i nema taj `id`. | Selektor ide na klasu (`.hint .link-btn`), pa važi na sve tri strane. Izmereno **44 px**. Uz to su od podvučenih linkova postale pilule, a „obriši sve" i „obriši omiljene" su crveni. | sekcija 30, 2 provere |
| **M10** | U igri su polje za unos, dugme „Proveri" i poruka o tačnosti padali **pod tastaturu**. | `drziPoljeUVidokrugu()` — uslovno pomeranje: ako je red već vidljiv, ne radi ništa, pa se nikad ne otima pregledaču. Izmereno: reč, tajmer, polje, dugme i poruka svi iznad tastature. | sekcija 30, 4 provere |
| **M11** | Dodirni ciljevi ispod praga: prebacivač pisma **34 px**, filter slogova **31**, kvačice **17**, tabovi ispod 44. | Sve na **40–48 px** (prag Apple HIG-a i Material-a je 44). | sekcija 30 |
| **M12** | U tamnom režimu „dobre rime" i rime u beležnici imale **beo okvir** 2 px (`rgb(255,255,255)`) na podlozi #1e1a2e — dva različita izgleda u istom spisku. | Okvir ide kroz `var(--line)`; „najbolje rime" zadržavaju svoju boju. **Popravljeno samo na telefonu** — v. napomenu ispod. | — |
| **M14** | **Mrtvo dugme na `/klasici/`.** Slovo šeme rime uz svaki stih zove `switchTab('rime')` — a ta strana nema tab sa rimama, pa klik NE URADI NIŠTA, dok uputstvo na strani obećava „klikni da nađeš rime". 138 stihova. Na početnoj radi, zato se nije primetilo. | Na strani bez tog taba ide se na `/?rec=…` — isti oblik linka koji već koriste pilule na stranama `/rime-za/…`. **Ovo radi i na računaru** (dugme je i tamo bilo mrtvo). | sekcija 30, 1 provera |
| **M15** | U Klasicima: dugme „prebaci u brojač slogova" **164×21 px**, slovo šeme rime **24×18 px**. | Dugme **192×44**, slovo **36×28**. Pun prag od 44 px kod slova nije moguć — razmak između stihova je 26 px — pa je cilj proširen koliko staje a da red ostane red pesme. | sekcija 30, 2 provere |
| **M13** | Posle „Nađi rime" korisnik ostaje na istom ekranu: iznad rezultata stoji **1.070 px** sadržaja. | Tastatura se zatvara i lista se dovodi pod prst (samo na svesnu pretragu — dugme ili Enter, ne na promenu filtera). | — |

> **⚠️ DVE STVARI KOJE DODIRUJU I RAČUNAR — za odluku vlasnice:**
> · **M8 je popravljen svuda** jer je u zajedničkom kodu (`app.js`) i jer je reč o
>   pogrešnom broju uz pogrešan stih, ne o izgledu. Vidljiva promena na računaru:
>   oznake sada stoje uz svoj stih i kod pesama sa praznim redom. Ako to ipak ne
>   treba dirati na računaru — reci, vraća se u jednu liniju.
> · **M12 stoji i na računaru i na tabletu** (beo okvir u tamnom režimu), ali tamo
>   **nije diran**, po dogovoru. Popravka je jedna linija kad je odobriš.

---

## OTVORENO (1)

| # | Nalaz | Zašto nije zatvoreno | Fajl | Viđen |
|---|---|---|---|---|
| **P11** | **Hub `/rime-za/` je zid od 2.000 linkova** (bilo 1.988). Prijava vlasnice 29.07: „katastrofa izlistanih reči". Strana je nastala kao popravka za 222 strane bez internih linkova — rešila je SEO, ali je UX loš. Sada je i **odredište 1.672 preusmerenja**, pa je važnija nego pre. | Traži odluku vlasnice o izgledu (podela po slovima / po temama). | `build/gen_pages.py:1460–1505` | 29.07. |

---

## ZATVORENO 30.07.2026 (sedma sesija)

| # | Bilo | Sada | Provera u testu |
|---|---|---|---|
| **F1** | `frekvencija.json` uzimao ZADNJE čitanje oblika umesto sume: `voda`=876, `dva`=9, `veliki`=34 | sabrano iz srLex-a: `voda`=**47.298**, `dva`=**344.730**, `veliki`=**198.997**. Uz to prag šuma **10** — reč viđena jednom više ne pretiče `hiljada`. Novi `matica.json` (6.752 reči) potvrđuje standardne reči koje srLex ne zna. | **sekcija 27**, 8 provera — puštene protiv starog fajla, **pale 5** |
| **J1** | `naizmjence` i još 849 jekavskih oblika izlazili i kad ijekavica NIJE čekirana | filtriraju se preko `public/jekavski.json`; rečnik **nije diran**, pa je povratno | **sekcija 28**, 5 provera — pale na starom kodu |
| **R1** | `pruga` = „Duga uska traka druge boje" — glavno značenje (železnica) nije postojalo | „Put od dve šine po kojem ide voz ili tramvaj; takođe uzana linija drugačije boje na nekoj površini." — **svojim rečima**, ne prepisano iz Matice | — |
| **R1** | sinonim `brada` ↔ `klube` (vokativ reči „klub") | par obrisan iz `sinonimi.json` | — |
| **P10** | strane birane po ABECEDI — 1.577 od 1.988 na „a"; `gen_pages.py` nikad nije učitao `frekvencija.json` | bira se po **učestalosti**, kroz **Rečnik Matice srpske** (samo srpske reči) i samo **sadržajne** vrste reči (bez `koji`, `što`, `ali`). Obavezne su i reči iz Google Analytics-a i **svih 120 strana koje je Google već indeksirao**. Na „a" sada **86** umesto 1.577. 1.672 stare adrese dobile **301 na hub** — jednim pravilom u `nginx.conf`, ne spiskom. | **`test/nginx-provera.sh`**, 5 novih provera — pale 2 na staroj konfiguraciji |
| **T1** | font **Quicksand nema ćirilicu** — u ćiriličnom režimu sav tekst padao na sistemski font, na svih 1.988 strana | **Fira Sans**: `cyrillic` + `cyrillic-ext`, i ima tačno debljine 400/500/600/700 koje sajt koristi (PT Sans ima samo 400/700, pa bi 99 mesta promenilo izgled). Logo ostaje Fredoka. | `test/meri-font.mjs` — pada ako font nije učitan |
| **P16** | strana skakala 50 px kad stigne font; bila „popravljena ali nepotvrđena" | **30 merenja** (10× po strani): `/` 0,0007–0,0012 · `/rimovanje-reci/` **0** · `/rime-za/ljubav/` 0,0001. Granica je 0,1. | `test/meri-cls.mjs` |

> **Lažni tragovi ove sesije — provereno pa odbačeno:**
> · „U `frekvencija.json` nema reči `i`, `a`, `u`" — te reči **nisu u `reci.txt`**, nikad nisu bile rime; srLex ih ima. **Nije nalaz.**
> · „Reči iz Matice treba dodati u bazen kockice" — probano, **ne radi**: od 6.323 takve reči većina su `adađo`, `abonos`, `admiralitetski`. Odrednica u Matici znači *standardna*, ne *poznata*.
> · „PT Sans je pravi izbor" — ima samo dve debljine, a sajt koristi četiri; izgled bi se vidno promenio.
> · „size-adjust 90,4%" — **merenje nije vredelo**, font se u mernoj skripti nikad nije učitao pa je merila Arial protiv Ariala. Tačna vrednost je **100,9%**.

---


### F1 — puna razrada (dokazano 30.07.2026)

srLex je skinut u `~/Literatura/srLex/srLex_v1.3.gz` — **6.905.941 red**, poklapa se sa
brojem u `IZVORI-RECNIKA.md`. Oblik `voda` ima u njemu **četiri** reda:

| Od koje reči | Oznaka | Broj |
|---|---|---|
| `vod` (vojna jedinica), 2. padež jednine | Ncmsg | 1.346 |
| `voda`, 2. padež množine | Ncfpg | 12.793 |
| `voda`, 1. padež jednine | Ncfsn | **32.283** |
| **`vodati`** (glagol, 3. lice) | Vmr3s | **876** ← zadnji red |
| **suma** | | **47.298** |

U `frekvencija.json` stoji **876** — tačno zadnji red. Uzrok je time **dokazan**, ne
pretpostavljen. Vidi i `CLAUDE.md` 6.2c: kod nedostatak broja tretira kao „najređa reč",
pa reč sa brojem **1** (`abakuse`) pretiče `hiljada`.

**Šta je izgrađeno 30.07.** (u scratchpadu, NIJE ubačeno u `public/`):

| Fajl | Sadržaj |
|---|---|
| `frekvencija.json` | **210.615** naših reči, brojevi **sabrani** po obliku. Samo istiniti brojevi iz srLex-a — nijedan izmišljen. |
| `matica.json` | **41.243** naše reči potvrđene kao **odrednica u Rečniku Matice srpske**. Odvojen signal „standardna srpska reč", da se ne kvari fajl sa brojevima. |

Kontrola: `voda` 876 → **47.298** · `dva` 9 → **344.730** · `veliki` 34 → **198.997** ·
`dete` 37.703 → **79.631** · `kuća` 31.251 → **53.230**.

`hiljada` i `hiljadu` su **potvrđene u Matici** i ulaze u `matica.json`, pa mogu da uđu u
bazen „poznatih reči" bez izmišljenog broja. **Zašto ne „srednja vrednost":** srednja
vrednost svih oblika je **91**, a za ulazak u bazen od 8.000 treba **5.074** — srednja
vrednost ne bi rešila ništa, a veći broj bi bio izmišljen podatak.

> **LAŽAN TRAG, ispravljeno 30.07.:** ranije je u ovom nalazu stajalo da „u fajlu nema reči
> `i`, `a`, `u`" i da je izvlačenje filtriralo jednoslovne oblike. **Netačno.** Te reči
> **nisu u `reci.txt`** (0 pogodaka), pa nikad nisu bile kandidati za rimu — a srLex ih ima
> (`i` = 16.418.409). Nije nalaz.

---

## ZATVORENO U SESIJI 29.07.2026 (60 nalaza)

### Kritično i visoko

| # | Bilo | Sada | Gde |
|---|---|---|---|
| K4 | Zabranjen `localStorage` (privatni režim, blokirani kolačići) obori sajt na **0 rima**; sigurnosna mreža pukne s njim na TDZ grešci | sva čitanja/pisanja idu kroz `lsGet`/`lsSet`/`lsRemove` koji nikad ne bacaju | `app.js:88–104` |
| K5 | Pokvaren `rimoteka_favorites` (`{nije-json`, `null`, pogrešan tip) obori sajt na 0 rima | `lsJSON` vraća podrazumevanu vrednost umesto da pukne | `app.js:96` |
| V3 | Klik na glavno dugme radio u **tihom režimu** — `onclick = doRhymes` prosleđivao `MouseEvent` kao zastavicu `silent`; nema `?rec=` u URL-u ni GA4 događaja | `onclick = () => doRhymes()` + `silent = silent === true` | `app.js:436`, `:591` |
| V4 | Na `a`, `123`, `😀` panel ostane **prazan** — alat deluje pokvareno | dve različite poruke: prekratka reč / unos bez ijednog slova | `app.js:448` |
| V5 | Na 4G rime prorade tek posle **10,3 s**, i to tek posle **drugog** klika | reč se zapamti i pretraga krene **sama** čim rečnik stigne; dugme pokazuje stanje | `app.js:449`, `:432` |
| V6 | Kursor **usred** reči + klik na rimu → „gde je **na kadada**" umesto „gde je **kada**" | klik **zamenjuje** reč pod kursorom; u praznini i dalje ubacuje | `app.js:1934` |
| V7 | Adresa ostaje `/?rec=ljubav` na **svih 7 tabova** — nema deljivog linka, „Nazad" ne radi | `pushState` po tabu + `popstate`; `?rec=` nestaje van tabа sa rimama | `app.js:2169–2240` |
| — | `/rime-za-decu/` tvrdi da su rezultati **uvek** filtrirani, a dečji režim je podrazumevano isključen | tekst kaže šta je uvek isključeno a šta radi dečji režim; dugme vodi na `?decji=1` | `gen_pages.py:1215` |
| — | Dva otvorena taba gaze jedan drugom beležnicu — **pesma nestane bez upozorenja** | `storage` događaj: bezbedno preuzimanje ili jasno upozorenje | `app.js:106–133`, `:2010` |

### Srednje

| # | Bilo | Sada |
|---|---|---|
| S1 | Klik na logo ne resetuje stranu (polje, 180 rima i `?rec=` ostaju) | prazni polje, rezultate i adresu — **logo nije diran** (pravilo 8a) |
| S2 | „1 reči", „2 slogova", „4 redova" | `recRec`, `znakRec`, `redRec`, `poenRec` — pravilo 1 / 2–4 / 5+ |
| S3 | Ćirilica ne prebacuje naslove grupa, legendu ni karticu sinonima | sve tri prolaze kroz `uiTxt` |
| S4 | Bojenje rima ne radi za **ćirilične** pesme (`lastIndexOf` traži latinicu u ćiriličnom redu) | opseg reči se računa nad **izvornim** redom |
| S7 | Igra radi u pozadini posle prelaska na drugi tab (zvuk, promašaji, troše se reči) | pauzira se pri odlasku, nastavlja po povratku |
| S9 | `/rime-za/mama/` je **404** (i tata, deka, maca, škola, drug, kućica) | dodate 34 dečje i porodične reči, sve proverene u rečniku |
| — | Ćirilična tastatura: „надживети" → **„наџивети"**, „инјекција" → „ињекција" | čuvar između `д+ж`, `н+ј`, `л+ј` u povratnom prolazu |
| — | Ekran igre ostaje **pola latinica** | uputstvo, „Провери" i sve povratne poruke prate pismo |
| — | Premeštanje stiha (drag) baca kursor na **početak pesme** | kursor ostaje na kraju premeštenog stiha |
| — | Ćirilica: kolona kursora se ne poklapa zbog `љ/њ/џ`, panel nudi rime za pogrešnu reč | traži se nad izvornim redom |
| — | „sačuvaj rime" i „preuzmi listu" čuvaju rime za **drugu** reč nego što panel pokazuje | prate reč koju panel prikazuje |
| — | `loadDict` ne proverava `r.ok` — HTML strana greške postane „rečnik", sajt kaže „nema rime" | status + provera da odgovor nije HTML + provera dužine |
| — | Pretraga laže „Nema reči koje odgovaraju" dok se rečnik učitava | jasno kaže „Učitavam rečnik…" |
| — | Jedan neuspeh `definicije.json` **trajno** ubija sve definicije | pamćenje se briše, sledeći pokušaj prolazi |
| — | `definicije.json` (**19,3 MB**) kreće na svakom učitavanju i gura spremnost rečnika sa 7,3 s na 10,6 s | skida se tek kad zatreba (prvi prelazak preko ⓘ) |
| — | Obrada `reci.txt` zamrzava glavnu nit **824 ms u jednom komadu** | komadi po 20.000 reči uz predah |
| — | `<title>` padežno pogrešan: „Rime za **nada**" na 557 od 1.988 strana | „Rime za reč „nada“" — imenica ostaje u nominativu |
| — | **~50.000** parametarskih URL-ova `/?rec=` — duplikat početne, bez `nofollow` i bez blokade | `robots.txt` + `rel="nofollow"` |
| — | **222 strane bez ijednog internog linka**; `/rime-za/` vraća **403**; breadcrumb preskače srednji nivo | nova hub strana `/rime-za/` sa svih **1.988** linkova + trostepeni breadcrumb |
| — | Aktivni tab do **309 px desno** od vidljivog dela trake na podstranama | traka se sama pomera da se aktivan tab vidi |
| **P16** | **Strana skače 50 px dok se učitava** — zamena Google fonta menja širinu teksta, red filtera gubi liniju. Nađen usput pri merenju P2, gori od njega. | CLS `/rimovanje-reci/` **0,2819 → 0,0053** (`style.css:319`). ⚠️ **Audit 31.07. mora ponovo izmeriti — desetak puta, i NE odmah posle deploy-a.** Do tada nalaz stoji kao „popravljen, nepotvrđen". |

### Nisko

| # | Bilo | Sada |
|---|---|---|
| N1 | Nema `aria-live` — čitač ekrana ne najavi 195 rima | najavljuje se **broj** (ne svih 195 reči) |
| N2 | Unos `constructor` ruši prikaz (`excluded.has is not a function`) | provera vlasništva ključa; isto i za `SYNONYMS` |
| N3 | `?tab=igra` se ignoriše | poštuje se |
| N4 | Tačkice napretka u igri pokazuju **pogrešan redosled** (prve su uvek zelene) | pamti se stvaran ishod po reči |
| N5 | Reč u rezultatu je `<span onclick>` — nedostupna tastaturi | `tabindex` + `role` + Enter/Space |
| N6 | Dugmad imenovana samo emodžijem („white heart suit") | `aria-label` sa imenom reči |
| N7 | `#searchMode` bez imena; nijedno polje nema `<label>` | labele za sva polja + imena za grupe dugmadi |
| N8 | Aktivno stanje tabova samo kao CSS klasa | `aria-current="page"` |
| N10 | 404: zastareo CSS `?v=20260715b`, nema polja za pretragu | polje za pretragu, linkovi ka hubu i alatima, aktuelan CSS |
| N11 | Mrtav `loadDefs()` — da se pozove, pokvario bi rangiranje | obrisan |
| N13 | `escapeHtml` ne štiti navodnike | štiti i `"` i `'` |
| N14 | Živi rezultati preskaču nivo naslova (`h1 → h3`) | `h2` |
| — | Ćirilica × brojač slogova: „Ukupno:" ostaje latinica | prati pismo |
| — | Ćirilica × prazan tab „Omiljene": poruka ostaje latinica | prati pismo |
| — | Tamni režim × ekran igre: `.game-value` **4,13:1** | **7,25:1** |
| — | **108 SERP naslova** sa pogrešnom množinom („51 reči koje se rimuju") | „51 reč koja se rimuje" |
| — | `og:image` kvadratni logo uz `twitter:card=summary` | nova slika **1200×630 (58 KB)** + `summary_large_image` |
| — | „Pronađene su 56 reči" — pogrešno slaganje predikata | „Pronađeno je 56 reči" / „Pronađene su 3 reči" / „Pronađena je 1 reč" |
| — | „shema rime" (hrvatski oblik) u Pro modalu | „šema rime" |
| — | Mešani navodnici (`„` pa ASCII `"`) | `„…“` — **67** mesta u `gen_pages.py`, **4** u `index.html` |
| — | Meta opis `/rime-za-ljubavne-pesme/` nabraja nominative iza „sa" | „sa rečima ljubav, srce, duša i sreća" |
| — | Padajuća lista predloga: vidljiv **1 od 8** predloga kad je tastatura otvorena | visina vezana za vidljivi deo ekrana (`dvh`) |
| — | Fiksni panel rima guta trećinu ekrana; u pejzažu **2 od 16** predloga | `max-height` po `dvh`, sa skrolom |
| — | Sedam dugmadi u beležnici visine **23,3 px**, među njima „obriši sve" | **44 px** na dodirnim ekranima |
| — | Oblačić sa objašnjenjem **zauvek** stoji na „učitavanje…" | rok 4 s + 3,5 s |

### Rupe u testu (dimenzija `test-pokrivenost`)

| # | Bilo | Sada |
|---|---|---|
| — | Test obilazi **7 od 2.010** strana, HTTP status na **3** URL-a | 35 ruta se proverava na status + hub strana sa 1.988 linkova |
| — | Sekcije 12, 12e–12i nemaju osluškivač grešaka, a sekcija 13 tvrdi da pokriva „ceo test" | osluškivač je na **svakoj** strani koju test otvori, sa oznakom gde je greška nastala |
| — | Tab „Omiljene" nema nijednu funkcionalnu proveru — merila se samo visina panela | ♥ → brojač → tab → osvežavanje → „obriši sve" |
| — | „i šire rime", „ijekavica", „dečji režim" imaju **0 provera** | sve tri se biraju i meri se promena rezultata |
| — | Ceo test rima počiva na **jednoj** reči — „ljubav" | šest reči različitog oblika, svaka sa očekivanom rimom |
| — | Tab „Rečnik": tri režima pretrage i filter po slogovima nikad se ne biraju | sva tri režima + filter, sa proverom **sadržaja** rezultata |

---

## SLEDEĆI AUDIT

**Zakazan za: 31.07.2026.** Pokrenuti po `~/.claude/AUDIT-PROTOKOL.md`,
upisati u `AUDIT/2026-07-31-audit.md`.

**Prvo izmeriti:** CLS na `/rime-za/` (nalaz P2) — popravka je primenjena ali nije potvrđena merenjem.
