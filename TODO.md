# TODO — Rimoteka (sajt i alati)

> Rečnik ima svoj spisak u `TODO-RECNIK.md`, tekstovi na sajtu u `TODO-TEKSTOVI.md`.
> Ovde je sve ostalo.
> Poslednje ažuriranje: 31. jul 2026.

---

## ⚠️ PROČITATI PRVO — STANJE NA DAN 31.07.2026 (deseta sesija)

| | |
|---|---|
| **Otvorenih nalaza** | **3** → `AUDIT/NALAZI-OTVORENI.md` (R1-ostatak, J1-ostatak, P11 — sva tri čekaju odluku vlasnice) |
| **⛔ NAJVAŽNIJE** | **`info@rimoteka.com` ne radi** — odeljak 0.06 A. Adresa stoji na sajtu, ne zna se koliko je poruka propalo. |
| **Tekst na sajtu** | prepisan u celini (agent `tekstopisac`). Ocena pre popravke **3,6/10**. Izveštaji: `AUDIT/tekstovi/` |
| **Čeka push** | tekst + mobilna verzija (M5–M15) + kontakt u futeru. Grana `feat/tekstovi-31-07`. Test **430/430** |
| **Posle objave, ODMAH** | `BASE=https://rimoteka.com node test/predeploy.mjs` pa sitemap i ponovno indeksiranje u GSC |
| **13.08.2026** | agent `analitika` — meri se izmena naslova početne od 30.07. **Do tada se naslov i opis početne NE DIRAJU** (v. `TODO-TEKSTOVI.md`) |
| **Čeka odluku vlasnice** | M8 i M12 (0.06 C) |
| Ocena poslednjeg audita | **6,9 / 10** |
| Sledeći pun audit | prvi sledeći po ritmu od 3 dana |
| Zašto propusti | `AUDIT/PROPUSTI.md` — pravila **51–62** su iz desete sesije |
| **Plan monetizacije** | `MONETIZACIJA.md` — **ne radi se sada**, sajt je još mali |

> **Nađeno 31.07, nije popravljeno — bag u ALATU, ne u tekstu:** reč `čeka` savršeno se
> rimuje sa `reka`, ima objašnjenje i frekvenciju **34.809**, ali **nije među 115 rima**
> koje strana prikazuje — iako `dočeka` i `počeka` jesu. Nije u `RHYME_EXCLUSIONS`.
> Traži pregled logike izbora rima; verovatno pogađa i druge česte reči.

> **Linkovi sa drugih sajtova — ocena 2/10** (`AUDIT/tekstovi/2026-07-31-D-linkovi.md`).
> Izmereno `curl`-om: `orbitacode.com`, `babylovebox.rs` i `spomenicibeograd.rs`
> **nijednom ne pominju Rimoteku**, a `SEO_PLAN.md` ih navodi kao „najbržu polugu".
> `/kontakt/` i `/o-nama/` vraćaju **404**. Indeksiranost **11%** — spoljni link je
> popravlja, nove strane je pogoršavaju, pa linkovi idu **pre** novog sadržaja.

> **PRAVILO: rešeno se BRIŠE odavde, ne štriklira.** Zadatak sa ✅ i dalje mora da se
> pročita da bi se videlo da je gotov, pa sledeća sesija radi dupli posao. Kad je nešto
> gotovo — briše se iz TODO-a, a trag ostaje u `AUDIT/NALAZI-OTVORENI.md` i `HANDOVER.md`.
> (Zahtev vlasnice, 31.07.2026. Isto pravilo stoji i u globalnom `~/.claude/CLAUDE.md`.)


## 0. SLEDEĆE PO REDU — dogovoreno sa vlasnicom 29.07.2026

### 0.06 NOVO 31.07.2026 — iz osme sesije (mobilna verzija)

#### A) ⛔ MEJL `info@rimoteka.com` NE RADI — NAJVAŽNIJE, NIŠTA NIJE PRE OVOGA

**Kako je otkriveno:** Aniko je pisala na tu adresu i **nije dobila nikakav odgovor
niti povratnu grešku**. Vlasnica javila 31.07. Ne zna se koliko je poruka propalo
ni od kada — adresa stoji na sajtu.

**Šta je već provereno (bez prijave na Porkbun):**

| Provera | Nalaz | Znači |
|---|---|---|
| MX zapisi | `10 fwd1.porkbun.com`, `20 fwd2.porkbun.com` | prosleđivanje **jeste** upisano u DNS |
| SPF | `v=spf1 include:_spf.porkbun.com ~all` | postoji |
| **DMARC** | **ne postoji** | treba dodati |
| Prima li server za `info@` | **NIJE IZMERENO** — port 25 blokiran sa lokalne mreže | ostaje da se vidi u panelu |

**Šta uraditi, ovim redom:**
1. Prijaviti se na **porkbun.com** (Chrome, vlasnica se prijavljuje — Claude dalje sam)
   → **Email Forwarding** za `rimoteka.com`.
2. Videti **postoji li pravilo `info@` → njen Gmail**. MX zapis samo kaže „šalji na
   Porkbun"; ako tamo nema pravila za `info@`, pošta se odbija i pošiljalac dobija
   grešku — što se poklapa sa tim da Aniko ništa nije dobila.
3. Ako pravila nema — napraviti ga. Ako ga ima — proveriti da adresa Gmail-a nije
   pogrešna i da poruke ne padaju u SPAM (Gmail često baca prosleđenu poštu tamo,
   jer SPF proverava Porkbun a ne pravog pošiljaoca).
4. **Testirati stvarnim slanjem** sa spoljne adrese i potvrditi da je stiglo. Bez toga
   se ne sme reći da radi (pravilo: feature nije gotov dok se ne vidi da radi).
5. Dodati **DMARC** zapis (`v=DMARC1; p=none; rua=mailto:...`) — bar u režimu praćenja.

**Odvojena odluka: da li uopšte hoćemo SAMO prosleđivanje.**
Prosleđivanje je jednosmerno — može da PRIMA, ne može da ŠALJE. Kad Aniko dobije
odgovor, on stiže sa `@gmail.com`, ne sa `@rimoteka.com`, što za saradnju izgleda
neozbiljno. **`orbitacode.com` već koristi Zoho** (`mx.zoho.eu`), pa se `rimoteka.com`
može dodati kao domen u isti Zoho nalog i dobiti pravo sanduče koje i prima i šalje.
Odluka vlasnice; besplatan Zoho plan pokriva ovu potrebu.

#### B) TEKST NA SAJTU — REŠENO 31.07.2026, brisano odavde

Sve iz ovog odeljka je urađeno u desetoj sesiji: 11 rečenica iz `TODO-TEKSTOVI.md`,
plus 8 mesta koje spisak nije imao, plus 49 lažnih rima u „Čestim pitanjima".
Trag: `AUDIT/NALAZI-OTVORENI.md`, odeljak „ZATVORENO 31.07.2026 (deseta sesija)".
Ostatak koji čeka stoji u `TODO-TEKSTOVI.md` — naslov početne (do 13.08.).

#### C) ODLUKE KOJE ČEKAJU VLASNICU (mobilna sesija)

| # | Šta | Zašto čeka |
|---|---|---|
| **M8** | Oznake uz stih (slogovi, šema rime) bile su razminute sa stihom — pesma kucana na telefonu imala je poslednja dva stiha pomerena za ceo red, sa praznim redom između strofa za dva reda. **Popravljeno svuda, dakle i na računaru.** | Vlasnica je tražila da se računar ne dira. Ovo je popravka rada, ne izgleda — ali menja ono što se vidi na računaru. Vraća se u jednu liniju ako kaže. |
| **M12** | U tamnom režimu „dobre rime" imaju **beo okvir 2 px** (`rgb(255,255,255)`) na podlozi #1e1a2e. Stoji i na računaru i na tabletu. | **Popravljeno samo na telefonu.** Popravka za ostalo je jedna linija, čeka odobrenje. |

#### D) MOBILNA VERZIJA — ostalo posle deploy-a

- **Nije pushovano** — čeka pregled vlasnice. Test lokalno **422/422**.
- **Nije provereno na pravom telefonu.** Sve je mereno u Chromiumu sa lažiranom
  tastaturom (`visualViewport.height` se smanji pa se pošalje `resize`). Prvi zadatak
  posle deploy-a: vlasnica otvori sajt na telefonu i proba **baš beležnicu**.
- Posle deploy-a obavezno `BASE=https://rimoteka.com node test/predeploy.mjs`.

#### E) KLASICI — tekst obećava jedno, radi drugo

Uputstvo kaže „**Klikni na završnu reč stiha** da joj nađeš rime", a klikće se
**slovo šeme rime** sa strane, ne reč. Slovo je izmereno na 24×18 px (sada 36×28 na
telefonu). Odluka: ili ispraviti tekst, ili napraviti da se klikće sama reč.
> Usput popravljeno 31.07.: na `/klasici/` je to slovo bilo **mrtvo dugme** — klik nije
> radio ništa jer ta strana nema tab sa rimama. Sada vodi na `/?rec=…`. Bilo je mrtvo i
> na računaru, 138 stihova.

#### F) `/klasici/` ne učitava rečnik

`WORDS.length === 0` na toj strani. Za sada ne smeta (klik sada vodi na početnu), ali
znači da bilo koja buduća funkcija na toj strani koja traži rečnik neće raditi.

---

### 0.05 NOVO 30.07.2026 — zahtevi vlasnice iz sedme sesije

**A) FONT SAJTA — vlasnici se trenutni font NE SVIĐA.**
Traži savet profesionalca koji je font najprikladniji za ovakav alat da izgleda
maksimalno profesionalno i lepo. Postupak: predlog sa obrazloženjem → skidanje →
ubacivanje u kod → **pokazati na lokalu** → ona odobrava.
⚠️ Zamke: (1) **logo se ne dira** (pravilo 8a) — Fredoka ostaje dok ona izričito ne
kaže drugačije; (2) svaka promena fonta **poništava izmerene brojeve** iz nalaza P16
(`style.css:319`, `size-adjust` 103,6% i 98,2%) — moraju se **ponovo izmeriti**, ne
prepisati; (3) posle promene fonta obavezno ponovo meriti CLS, deset puta, na brzoj vezi.

**C) REČNIK — reči i objašnjenja koja je vlasnica prijavila 30.07.**
Provereno u Rečniku Matice srpske (`~/Literatura/recnik-matice-srpske-2011.txt`):

| Reč | Šta je prijavljeno | Provera u Matici | Šta uraditi |
|---|---|---|---|
| **pruga** | objašnjenje kaže samo „duga uska traka druge boje", ne pominje železnicu | **Matica, značenje 1: „dve paralelno postavljene [železne] šine po kojima se kreće voz, tramvaji…"** — železnica je PRVO značenje; traka je značenje 3.a | prepisati objašnjenje: prvo železnica, pa traka |
| **gojence** | nejasna reč | odrednica `гојенац` **nije nađena** | pitati vlasnicu; kandidat za izbacivanje |
| **grnce** | nejasno objašnjenje („oblik imenice grne") | `грне`/`грнац` **nisu nađeni** (postoji samo glagol `грнути`) | pitati vlasnicu; kandidat za izbacivanje |
| **krol** | nejasna reč | `крол` **nije nađen** | pitati vlasnicu (moguće da je sportski termin van rečnika) |
| **klube kao sinonim za „brada"** | besmisleno — `klube` je oblik reči `klub` | `клубе` **nije nađeno** kao odrednica; `клупко` postoji | ispraviti `sinonimi.json`: obrisati par `brada ↔ klube` |
| **naizmjence** | izašla iako ijekavica NIJE bila čekirana | vidi nalaz ispod — **stvaran bag** | vidi J1 |

⚠️ **Odsustvo iz Matice NIJE dokaz da reč ne postoji** — izvlačenje odrednica je iz
skeniranog teksta (OCR) i promaši neke (npr. `more` nije nađeno, a sigurno postoji).
Prisustvo je pouzdano, odsustvo nije. Zato: pitati vlasnicu, ne brisati sam.


**E) UNETI CEO REČNIK MATICE SRPSKE U NAŠ REČNIK** (zahtev vlasnice 30.07.2026)

Izvor: `~/Literatura/recnik-matice-srpske-2011.txt` (Rečnik srpskoga jezika, Matica
srpska 2011; skenirano, 333.413 linija, izvučeno **90.796** odrednica).

Dva posla:
1. **Reči** — svaka odrednica iz Matice koje nema u `reci.txt` treba da uđe. Time se
   rečnik popunjava iz izvora koji je **vrhovni autoritet** (pravilo 0 u odeljku 5a),
   a ne iz veb-korpusa.
2. **Objašnjenja** — za svaku reč uporediti naše objašnjenje sa Maticinim:
   - ako **imamo** objašnjenje a ne poklapa se → ispraviti po Matici (primer: `pruga`,
     kojoj je železnica značenje **1** a mi imamo samo značenje 3.a);
   - ako **nemamo** objašnjenje → napisati ga **svojim rečima**. ⚠️ **NE prepisivati
     Maticu**: ne iste reči, ne isti redosled, ne ista struktura rečenice. Prenosi se
     ZNAČENJE, ne tekst — inače je to preuzimanje njihovog autorskog dela.

⚠️ **Zamke, obavezno:**
- Fajl je **skeniran (OCR)** i ima greške u slovima („1воздене" umesto „железне",
  „шрамваји" umesto „трамваји"). Ne prepisivati mehanički — svaka odrednica se čita.
- Izvlačenje odrednica **promaši neke** (`море` nije nađeno, a sigurno postoji). Zato
  **odsustvo iz našeg izvlačenja NIJE dokaz da reč ne postoji u Matici.**
- Rečnik je na **ćirilici** — preslikavanje u latinicu mora poštovati digrafe
  (њ→nj, љ→lj, џ→dž), inače se dobija smeće.
- `reci.txt` i `definicije.json` se **ne menjaju bez odobrenja vlasnice** (odeljak 9).
  Zato: prvo napraviti spisak predloga, pokazati, pa upisivati.
- Svaka nova reč mora dobiti **i objašnjenje** (pravilo iz globalnih instrukcija).

**F) IZBOR 2.000 REČI ZA STRANE — učestalost NIJE isto što i „šta ljudi rimuju"**

Istraženo 30.07.2026. Strani sajtovi za rime (RHYMEBOOK, Rhyme Buster) vode **odvojenu**
statistiku „najtraženije reči", jer se ono što pesnik traži ne poklapa sa onim što je
najčešće u novinama. Za srpski postoji i **Frekvencijski rečnik savremenog srpskog
jezika** (7 tomova, 1.985.575 reči, 64.100 odrednica) — i on je važan zato što je
zasnovan na dnevnoj štampi **i poeziji**, dakle bliži nameni Rimoteke od veb-korpusa.

Redosled izvora za izbor 2.000 reči, od najboljeg:
1. **Google Analytics — reči koje su ljudi ZAISTA kucali na Rimoteci** (vlasnica ih
   već ima). Ovo je jedini izvor koji dokazuje stvarnu potrebu, i ide prvi.
2. srLex sabrane frekvencije (`frekvencija.json`, popravljen 30.07.), **filtrirano
   kroz Maticu** da ne uđu hrvatske i pokrajinske reči.
3. Frekvencijski rečnik Matice/Kostićev korpus — ako se nađe u mašinski čitljivom obliku.

**D) J1 — JEKAVSKI OBLICI U EKAVSKOM REČNIKU (nov nalaz, iz prijave vlasnice)**
`naizmjence` je u `public/reci.txt`, **ne** u `reci_jekavica.txt`. Kod uključuje jekavicu
tako što proširi granicu (`limit = includeJek ? WORDS.length : jekStart`, `app.js:572`),
a sve iz `reci.txt` je **pre** te granice — dakle **uvek se prikazuje**, bez obzira na
kvačicu. Izmereno: **1.127 reči** u `reci.txt` ima u svom objašnjenju reč „ijekavski".
Popravka: preseliti te oblike u `reci_jekavica.txt` (traži odobrenje jer dira rečnik) +
provera u testu da bez kvačice nijedna reč sa „(ijekavski)" ne izlazi.



### 0.0 Hub `/rime-za/` i izbor reči za strane — **ODLOŽENO NA ZAHTEV VLASNICE (29.07. uveče)**

> Dva nalaza, **isti uzrok**: `AUDIT/NALAZI-OTVORENI.md` → **P10** i **P11**.

**Šta je zatečeno, prebrojano u fajlovima:**

| Merenje | Vrednost |
|---|---|
| strana reči ukupno | 1.988 |
| od toga na slovo „a" | **1.577** (`aaa`, `aah`, `abadzija`, `abakusi`, `abazur`…) |
| visina hub strane `/rime-za/` | 8.027 px, 1.988 linkova na jednoj strani |
| slovo „C" | 9 strana · „E" 1 · „H" 1 |

**Uzrok (`build/gen_pages.py`):** auto-dopuna do 2.000 meta-reči ide `for w in words`,
a `words` je `reci.txt` **redom kako stoji u fajlu — abecedno**. Generator je zato
stao na slovu „b". Uz to `rank = {w: i for i, w in enumerate(words)}` (linija 605)
je **redni broj po abecedi**, a ne učestalost — `gen_pages.py` **nikad ne učita
`frekvencija.json`**, iako komentar na liniji 646 tvrdi „frekvencijski rangirane".
Živi alat (`app.js:346`) učestalost **koristi**, pa se dva rangiranja razilaze:
`/rime-za/ljubav/` daje `neljubav, gubav, ubav…`, alat za istu reč `gubav, ubav, glibav…`.

**Zašto nije urađeno odmah:** popravka izbora reči briše **1.577 postojećih adresa**.
Ako ih je Google indeksirao, to je 1.577 novih 404-ki. Traži plan preusmerenja
(301 ka hubu ili ka najbližoj reči), pa se ne gura u isti deploy sa popravkama bagova.

**Predložen redosled kad se uzme:**
1. `gen_pages.py` učita `frekvencija.json` i `rank` računa po učestalosti (isto kao `app.js`).
2. Izvući spisak **postojećih** 1.988 slugova pre regeneracije → uporediti sa novim →
   za svaki koji nestaje napisati 301 u `nginx.conf`.
3. Hub podeliti po slovima: `/rime-za/` = 30 kartica sa slovima i brojevima,
   spisak se seli na `/rime-za/a/`, `/rime-za/b/`… Nijedan URL strane reči se ne dira.
4. Sitemap, GSC, pa merenje.

### 0.1 Strana `/omiljene/` umesto `/?tab=omiljene` — **ODOBRENO**

Omiljene reči žive **samo na uređaju korisnika**, pa strana mora da nosi
`<meta name="robots" content="noindex,follow">` i **ne sme u sitemap** — inače bi
Google indeksirao stranu koja je za svakog posetioca prazna.

**Zašto nije urađeno odmah:** podstrane (`/klasici/`, `/slogovi/`…) **nemaju
panele uopšte** — svaka je zasebna strana sa jednim ugrađenim alatom, a ne kopija
početne. Znači ovo nije preimenovanje nego **nov tip strane**, i nije se smelo
gurati u isti deploy sa svim ostalim.

Koraci:
1. U `build/gen_pages.py`, po uzoru na hub stranu (`/rime-za/`), napraviti
   `/omiljene/` sa `noindex` i **bez** upisa u `sitemap_entries`.
2. Telo strane: prazan okvir u koji `renderFavorites()` upiše spisak iz
   `localStorage`, plus poruka kad je prazno („Još nemaš omiljenih reči…").
3. U `public/app.js` promeniti `TAB_URL_FALLBACK.omiljene` sa `/?tab=omiljene`
   na `/omiljene/`, a dugme u `index.html` u `<a href="/omiljene/">` (ostaje
   `data-tab="omiljene"`, `tabHref()` sam pokupi `href`).
4. `Disallow: /*?tab=` u `robots.txt` može da ostane.
5. Provera u `test/predeploy.mjs`: `/omiljene/` vraća 200, ima `noindex`, **nije**
   u sitemapu, i „Nazad" iz omiljenih vraća na prethodni tab.

### 0.2 Verzije logotipa — **TRAŽI ALAT ZA CRTANJE, ne mogu ja**

Vlasnica: logo je pravljen u alatu tipa *nano banana*; treba više verzija, jer
kad neko stavlja link ka Rimoteci na svoj sajt, mora da ima šta da uzme.

**Šta tačno treba naručiti:**

| Verzija | Za šta služi | Format |
|---|---|---|
| **A — samo „R" sa lupom** | favicon, avatar, aplikacija, mali prostori | SVG + PNG 512, 192, 48 |
| **B — „R" + „imoteka"** | zaglavlje sajta, potpis, tuđi sajtovi | SVG + PNG 1200×630 (OG), 600, 300 |
| **C — jednobojna** (crna i bela) | štampa, tamne podloge, sponzorske trake | SVG |

Uz to: **prozirna pozadina**, isti font (**Fredoka**), i strana `/logo/` ili
`/za-medije/` odakle se sve skida (dobra i za link building).

> **Vezano za nalaz P1:** `logo-icon.png` je sada **292 KB, 512×512**, a prikazuje se
> na **46×46 px** — na 4G zauzme vezu ~5 s i gura rečnik na kraj reda. To NIJE
> greška u dizajnu logotipa nego samo u veličini fajla. Kad stigne verzija A u
> pravim veličinama, P1 se zatvara sam. Do tada logo ostaje netaknut (pravilo 8a).

### 0.3 `/slogovi/` se NE preimenuje — **odlučeno**

Razmatrano `/brojac-slogova-i-karaktera/`. Odbačeno: ključna reč je već u adresi,
`<title>` i `<h1>` nose pun izraz („Brojanje slogova i karaktera"), a promena URL-a
košta 301 i ponovno indeksiranje. Rast na tom upitu traži **sadržaj na strani**
(pitanja i odgovori „koliko slogova ima reč…", tabela primera), ne dužu adresu.

**PRAVILO REDOSLEDA: prvo se popravljaju bagovi, pa se onda gradi novo.**
Inovacije iz odeljka A ispod **ne počinju** dok kritični nalazi nisu zatvoreni.
Cilj nije više funkcija nego **najbolji alat bez bagova**.

**Claude na početku SVAKE sesije podseća na ovaj spisak** — koliko je otvorenih
nalaza, šta je sledeće po redu, i koliko je prošlo od poslednjeg audita.

---

## A. INOVATIVNI PREDLOZI — istraženi, ne izmišljeni

> Svaki je proveren naspram onoga što rade najbolji svetski alati (RhymeZone,
> RapPad, RhymeFlux, MasterWriter, RHYMEBOOK, Rhymer's Block).
> Poređano po odnosu vrednosti i truda.

### A1. „Zameni i vrati u meru" — spoj zamene rime sa metrom
**Šta:** kad zameniš reč na kraju stiha, alat odmah proveri da li stih i dalje ima isti
broj slogova kao ostali — i ako ne, ponudi rime koje ga vraćaju u meru.

**Zašto:** metar, šemu rime i slogove **već računamo** — ovo ih samo spaja sa zamenom
reči. **Nijedan istraženi alat ne povezuje zamenu rime sa proverom metra**; svi daju
listu pa se snađi. Autori dečjih knjiga izričito kažu da im je nekonzistentan metar
veći problem od rime.

**Trud:** nekoliko dana. **Uslov:** prvo popraviti V6 (zamena reči uopšte ne radi kako treba).

### A2. MCP server za Rimoteku
**Šta:** alati `rime(reč)`, `slogovi(tekst)`, `značenje(reč)` — alat postaje pozivljiv
direktno iz Claude-a i ChatGPT-a.

**Zašto:** **ne postoji nijedan MCP server za srpske rime.** Najveća asimetrija truda i
konkurencije koju je istraživanje našlo. Uz to su nam strane reči već potpuno
server-renderovane (86–129 reči u statičkom HTML-u), što je preduslov koji većina
sajtova ne ispunjava — GPTBot i ClaudeBot ne izvršavaju JavaScript.

**Trud:** nekoliko dana.

### A3. Javni JSON API
**Šta:** `GET /api/rime/{reč}` → `{reč, slogovi, rime[], definicija}` + OpenAPI opis.

**Zašto:** Datamuse je tako postao standard za engleske rime — ljudi ga ugrade, pa
nastanu linkovi i pominjanja, a dokumentacija uđe u trening budućih modela.

**Trud:** dan-dva (podaci već postoje).

### A4. „Nikad ne izgubi pesmu"
**Šta:** dva ključa naizmenično u `localStorage`, čuvanje poslednje tri verzije,
vidljivo dugme „Preuzmi pesmu", i upozorenje ako je čuvanje onemogućeno.

**Zašto:** **izgubljen tekst je ubedljivo najbolnija pritužba celog tržišta**
(„4 hours worth of feelings, gone"), a naša beležnica živi u `localStorage` koji smo
u auditu **dokazano uspeli da pokvarimo** — i time oborimo ceo sajt. Najveća bolna
tačka tržišta i naš najveći tehnički rizik su na istom mestu.

**Trud:** dan. **Ovo je zapravo popravka koliko i funkcija — zato ide pre ostalih.**

### A5. Kulturne reference u rečniku
**Šta:** imena pevača, brendovi, gradovi, sleng — reči koje se stvarno koriste u repu
i savremenoj poeziji, a nema ih u rečniku Matice srpske.

**Zašto:** RhymePlug se time izdvaja (5.600+ referenci). Za srpski to niko nema.

**Trud:** srednji, i traži odluku vlasnice šta ulazi (vidi pravilo o izvoru istine).

### A6. Akcentovani rečnik → imenovanje stope
Vidi tačku 9 i 9a ispod. **Jedina funkcija koja nam stvarno fali** u odnosu na
akademske alate. Otključava „trohejski osmerac" umesto „akcenat je na jednom od ovih slogova".

---

## B. ŠTA NE RADITI (istraženo, da se ne troši vreme)

- **`llms.txt`** — Google izričito ne koristi; 97% takvih fajlova nikad nije preuzeto
- **nove `FAQPage` šeme** — bogati rezultati ugašeni 7.5.2026 (postojeće ne dirati)
- **zajednica / društvena mreža za pesnike** — protivi se viziji „alat, ne portal",
  a kod konkurenata se pune spamom
- **reklame** — čisto sučelje je adut kojim se svetski konkurenti hvale, a mi ga imamo
- **mobilna aplikacija koja je samo sajt u omotu** — najveća zamerka RhymeZone-ovoj
  aplikaciji („it's literally just the website in a app"); PWA je bolji put
- **naplata rima ili pristupa korisnikovom tekstu** — jedini obrazac koji garantovano
  proizvodi jednu zvezdicu

---

## 1. Pregledati reči koje dečji režim isključuje

**Zašto:** „Dečji režim" je naša najveća prednost — niko drugi na srpskom nema
filtrirane rime za decu. Ako lista propusti neprikladnu reč, gubimo poverenje
roditelja i učitelja; ako izbaci previše, deca ostaju bez sasvim običnih reči.

**Šta treba:**
- Ispisati celu `KIDS_BLOCKED` listu iz `public/app.js` i pročitati je red po red
- Odvojiti: (a) opravdano isključene, (b) nepotrebno isključene, (c) fali a treba isključiti
- Proveriti i `BLOCKED` (globalna lista, važi i van dečjeg režima)
- Posle izmena: proveriti rime za par tipičnih dečjih reči (mama, tata, kuca, maca, sunce)

**Ko odlučuje:** vlasnica. Claude priprema listu, ne briše i ne dodaje sam.

---

## 2. Pregledati nove reči iz rečnika

**Zašto:** Pogrešna reč u rečniku je gora od reči koja fali — izlazi kao „rima"
i kvari poverenje u alat. Vidi `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`.

**Šta treba:**
- Proći `docs/recnik/RECNIK-NOVE-RECI.md` i `RECNIK-PREDLOG*.md` (rad druge sesije)
- Za svaku novu reč: postoji li stvarno u srpskom, i ima li definiciju
- Posebno paziti na oblike koje je generator izveo iz nastavka (obrazac
  „bankomam / njakam / mladoturke")

**Već urađeno 27–28.07.:** obrisano 48 ćelavih latinica (`zmurke` → `žmurke`),
obrisana `mladoturke`, dodati `tate` i `tati`. Rezervne kopije u scratchpad-u.

---

## 3. Staging grana na GitHubu

**Zašto:** Sada sve ide pravo u `main`, a `main` se automatski deployuje na
produkciju. Nema mesta gde se promena vidi uživo pre nego što je vide korisnici.
Uz to, dve sesije rade paralelno u istom radnom folderu — staging razdvaja rad.

**Šta treba:**
- Napraviti granu `staging` na `Orbita-Code/rimoteka`
- U Coolify dodati drugi resurs: `staging.rimoteka.com` → grana `staging`
- Podesiti da staging ima `noindex` (da Google ne indeksira dvojnik sajta!)
- Tok rada: `feat/…` → `staging` → provera na `staging.rimoteka.com` → `main`
- Dopuniti `CLAUDE.md` sekciju 4.2 novim tokom

**Pažnja:** memorijski limit servera. Produkcijski sajtovi imaju 512 MB,
staging poddomeni 256 MB — vidi tabelu u globalnom `CLAUDE.md`.

---

## 4. Brojač slogova — spojiti unos i rezultat u jedno polje

**Zašto:** Sada se tekst pojavljuje **dvaput** — jednom u polju za unos, drugi put
u listi ispod, gde stoje brojevi. Korisnik čita isti stih dva puta i mora da
premešta pogled gore-dole. Beležnica je taj problem već rešila: brojevi stoje
levo od stiha, u istom okviru.

**Šta treba:**
- Preneti mehanizam gutter-a iz beležnice na `/slogovi/` i tab „Slogovi i znakovi"
- Brojevi slogova levo od svakog reda, u istom okviru gde se kuca
- Na dnu ostaje samo zbir: slogova, reči, karaktera (sa i bez razmaka), redova
- Rešiti gde ide broj znakova po redu (sada je desno u listi) — predlog: na hover
- Zadržati poravnanje i kad se dug red prelomi (već rešeno u beležnici)

**Nije samo lepše:** uklanja duplirani tekst sa strane, što je i SEO plus.

---

## 5. Odluka: `/` ili `/rimovanje-reci/` kao glavna za „rimovanje reči"

Obe strane imaju alat i ciljaju istu frazu — Google bira jednu i razvodnjava
rangiranje. Odluku doneti **tek kad Search Console pokaže** koja od te dve već
dobija prikaze; do tada ne nagađati.

---

## 6. Google Search Console

Tek kad sve gore bude gotovo (izričit dogovor sa vlasnicom):
- submitovati `sitemap.xml` (2.010 URL-ova)
- Request Indexing za nove strane: `/pisanje-pesama/`, `/recnik-srpskog-jezika/`,
  `/klasici/`, `/igra-rimovanja/`, `/slogovi/`
- IndexNow ping (`build/indexnow_ping.py`)

---

## 7. 4.769 reči ima objašnjenje, ali ih nema u rečniku

**Otkriveno 28.07.2026.** `definicije.json` ima 282.852 unosa, a `reci.txt` +
`reci_jekavica.txt` zajedno 278.083 reči. Razlika nisu smeće — to su **prave
srpske reči kojima alat ne može da nađe rimu**, iako im imamo značenje:

`jaglac, plišanac, gurabija, vijača, strižibuba, romobil, sunčić, kovrdžav,
ljutkast, slankast, glancati, stabaoce` …

**Šta treba:** proći listu, potvrditi da je svaka reč ispravna, pa je dodati u
`reci.txt` (definicija već postoji). Time rečnik prelazi 282.000 reči.

**Kako izvući listu:**
```python
import json
reci = set(w.strip() for w in open('public/reci.txt', encoding='utf-8') if w.strip())
jek  = set(w.strip() for w in open('public/reci_jekavica.txt', encoding='utf-8') if w.strip())
defs = json.load(open('public/definicije.json', encoding='utf-8'))
fale = [k for k in defs if k not in reci | jek]
```

---

## 8. Pravilo za tvrdnje u tekstu na sajtu (SEO copy)

Na sajtu su nađene tvrdnje koje ne bi izdržale proveru („nema ga nijedan rimer
u svetu" — RhymeZone ima objašnjenja, na engleskom). Ispravljeno 28.07.2026.

**Pravilo:**
- „jedini/prvi **na srpskom**" — sme, dokazano konkurentskom analizom
- „jedini/prvi **u svetu**" — NE, osim ako imamo dokaz; za pisanje pesama
  postoje Versepad, GoRhyme Lyric Meter, RHYMEBOOK, Poem Analysis (engleski)
- **BROJ REČI SE NE PIŠE NA SAJT — odluka vlasnice 31.07.2026.**
  Rečnik raste svakodnevno, a predstoji i sesija koja prolazi ceo Rečnik Matice
  srpske i unosi reči. Svaki broj upisan u tekst zastari, a stoji na 2.000 strana
  odjednom, pa jedna zastarela cifra postane dve hiljade netačnih tvrdnji.
  Umesto broja se piše šta korisnik dobija.
- Ako neki broj ipak MORA da se napiše (npr. za merenje u izveštaju, ne za sajt),
  prebroji se **u fajlu** pa zaokruži NANIŽE. Nikad naviše.

---

## 9. Stopa (trohej, jamb) — čeka akcentovani rečnik

Metar sada meri **broj slogova i cezuru** (deseterac 4+6, dvanaesterac 6+6) —
to je mera srpskog narodnog i klasičnog stiha i ne traži akcenat svake reči.

**Imenovanje stope** (trohej, jamb, daktil, amfibrah, anapest) traži da se za
SVAKI slog zna da li je naglašen. Kod reči od tri i više slogova to se ne može
izvesti iz oblika reči (v. tačku o akcentovanom rečniku i odeljak 7 u
`GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`) — zato u metru stoji oznaka
„akcenat je na jednom od ovih slogova".

**Kad nabavimo akcentovani rečnik, jednim potezom dobijamo dvoje:**
1. oznaka „ne znamo" nestaje — svaki slog dobija tačan akcenat
2. postaje moguće imenovati stopu i meru (npr. „trohejski osmerac = 4 troheja")

### 9a. Gde tražiti akcentovani rečnik (istražiti)

Bez ovoga stopa ne može, pa je ovo uslov za tačku 9.

- **`akcenat.com`** — postoji kao sajt sa akcentovanim rečima; proveriti da li
  postoji izvoz podataka ili dozvola za korišćenje. Nije mašinski čitljiv izvor
  „iz kutije".
- **Vikirečnik (sr.wiktionary)** — srpskohrvatske odrednice često nose
  akcentovane oblike (нȃћи). Već ga koristimo za `sinonimi.json`, pa postoji i
  postupak za izvlačenje. **Prvi kandidat.**
- **Rečnik Matice srpske** — autoritet, ali nije mašinski čitljiv i nije slobodan.
- **srLex 1.3** — koristimo ga za `frekvencija.json`; proveriti ima li akcenat
  (verovatno nema, ali proveriti pre nego što se odbaci).
- **Univerzitetski/akademski korpusi** — pitati da li postoji otvoren skup sa
  akcentima (npr. korpus savremenog srpskog jezika).

**Pravno:** pre preuzimanja proveriti licencu svakog izvora. Ne preuzimati
sadržaj rečnika koji nije slobodan.

**Redosled posla kad se izvor nađe:**
1. izvući parove `reč → akcentovani oblik` i izmeriti pokrivenost
2. zameniti oznaku „ne znamo" tačnim akcentom u metru
3. tek onda imenovanje stope (trohej, jamb, daktil, amfibrah, anapest)
4. dodati proveru u `test/predeploy.mjs` za svaku novu tvrdnju alata
