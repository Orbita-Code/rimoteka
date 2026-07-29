# Dnevnik propusta — šta je audit prevideo i zašto

> **Pravilo: svaka sesija koja otkrije sopstveni propust MORA ga upisati ovde,**
> sa uzrokom i sa pravilom koje sprečava klasu grešaka, ne samo tu jednu.
> Ovaj dokument je vredniji od spiska nalaza — spisak kaže šta je pokvareno,
> ovaj kaže **zašto to nismo videli**.

---

## 29.07.2026 — audit od 39 agenata propustio 3 baga koja je vlasnica našla ručno

### Šta je propušteno

| Bag | Ozbiljnost | Ko ga je našao |
|---|---|---|
| U tamnom režimu se ne vidi šta se kuca (kontrast 1,23:1) | kritično | **vlasnica** |
| Klik na rimu u beležnici ne zamenjuje reč nego ubacuje na mesto kursora | visoko | **vlasnica** |
| URL se nikad ne menja pri prebacivanju tabova | visoko | **vlasnica** |
| Tamni režim „se nikad ne vrati" — **netačno prijavljeno**, opseg pogrešan | — | **vlasnica ispravila** |

---

### UZROK 1 (najveći) — 70% audita nikad nije ni odrađeno

**Izmereno:** od 10 revizorskih dimenzija, **završile su 3**. Sedam se zaglavilo
(„agent stalled on all 6 attempts").

| Dimenzija | Ishod |
|---|---|
| kod-ui | ✅ završio — 11 nalaza |
| pristupacnost | ✅ završio — 11 nalaza |
| bezbednost | ✅ završio — 5 nalaza |
| kod-rime, kod-greske, seo, performanse, sadrzaj, mobilni, **test-pokrivenost** | ❌ **zaglavili — posao nije urađen** |

Svih 27 nalaza došlo je iz tri preživele dimenzije.

**Najgore:** zaglavio se i revizor **`test-pokrivenost`**, čiji je jedini zadatak bio
da odgovori „šta postojeći test uopšte ne dodiruje". Baš ta pitanja su vodila do sva
tri baga koja je vlasnica našla.

**Moja druga greška — u prijavljivanju.** Napisao sam „7 revizora se zaglavilo i te
dimenzije su pokrivene ručno" kao **fusnotu**, a ručno pokrivanje je bilo delimično.
Izveštaj je delovao potpuno, a bio je trećina posla.

> **PRAVILO 1:** Zaglavljen agent **nije** obavljen posao. Njegova dimenzija se
> **ponavlja** — bilo novim agentom sa užim opsegom, bilo ručno, u celini.
> **PRAVILO 2:** Pokrivenost ide u **naslov izveštaja**, ne u fusnotu.
> Ako nije odrađeno 100% dimenzija, to piše odmah ispod ocene.

---

### UZROK 2 — bagovi žive na PRESEKU dva stanja, a audit je testirao ose odvojeno

Sva tri propuštena baga traže **dva uslova istovremeno**:

| Bag | Uslov A | Uslov B |
|---|---|---|
| nevidljiv tekst | tamni režim | **upisana vrednost u polju** |
| zamena reči | klik na rimu u beležnici | **kursor USRED reči** |
| URL | obavljena pretraga | **prebacivanje tabova posle nje** |

Audit je merio kontrast u tamnom režimu (ali sa praznim poljima) i testirao unose
(ali u svetlom režimu). Nijednom oba zajedno.

> **PRAVILO 3:** Obavezno proći **matricu stanja**, ne pojedinačne ose:
> tema (svetla/tamna) × pismo (latinica/ćirilica) × sadržaj (prazno/upisano) ×
> tip strane × širina ekrana. Kvar koji se javlja samo u kombinaciji je najčešći
> propust automatskog testiranja.

---

### UZROK 3 — merač kontrasta je bio strukturno slep za polja za unos

Skripta kojom sam merio kontrast:

```js
document.querySelectorAll('p, a, span, li, h1, h2, h3, h4, button, label, .hint, …')
  .filter(e => e.textContent.trim().length > 2 && e.children.length === 0)
```

**Dva nezavisna razloga zašto polja nikad nisu proverena:**
1. `input` i `textarea` **nisu bili u selektoru** — nijedno polje nije ni ušlo u skup.
2. Čak i da jesu, filter traži `textContent`, a vrednost polja živi u **`.value`**,
   ne u `textContent`. Filter bi ih ionako izbacio.

Zato je merenje pokazalo 6 problema u svetlom i 13 u tamnom režimu — a najgori,
1,23:1 na polju u koje se kuca, nije bio među njima.

> **PRAVILO 4:** Kontrast se meri i na `input`, `textarea` i `[contenteditable]`,
> i to **sa upisanom vrednošću**, poredeći `color` sa `background-color`
> **samog polja** (ne roditelja). Obavezno u obe teme.

---

### UZROK 4 — proveravao sam da radnja ne baci grešku, ne da uradi ono što obećava

U beležnici sam proverio brojanje slogova, šemu rime i metar — dakle **ispis**.
Nikad nisam **kliknuo rimu u panelu beležnice**. A i da jesam, kliknuo bih sa
kursorom na kraju reči (prirodno), gde bag ne izlazi.

> **PRAVILO 5:** Svako obećanje u sučelju („klikni da ubaciš reč u stih") mora da se
> **izvrši i proveri po sadržaju**: tabela dugme → šta piše da radi → šta se stvarno
> desilo sa tekstom/stanjem.
> **PRAVILO 6:** Radnje koje zavise od kursora testirati na **četiri položaja**:
> početak reči, **sredina reči**, kraj reči, praznina.

---

### UZROK 5 — URL sam gledao, ali nikad nisam proverio

U ispisima alata URL je bio vidljiv (`?rec=nada`, `?rec=protestu`) i ja sam ga
**video više puta**, ali nijednom nisam postavio tvrdnju o njemu. Agent je našao
srodan problem iz koda (`onclick = doRhymes` gubi `?rec=`), ali niko nije pitao
ono najprostije: **menja li se adresa kad se menja tab?**

> **PRAVILO 7:** URL je stanje kao i svako drugo. Posle svake radnje koja liči na
> navigaciju (tab, filter, pretraga, otvaranje panela) **proveriti adresu** — i da
> „Nazad" radi. Ako projekat tvrdi „svaki alat ima svoju stranu", to je **tvrdnja
> koja se testira**, ne pretpostavka.

---

### UZROK 6 — jedno merenje uopšteno u tvrdnju

Prijavio sam „tamni režim se **nikad** ne vrati" na osnovu jednog scenarija (F5).
Vlasnica je rekla da njoj radi — i bila je u pravu: opstaje kroz prebacivanje tabova
(strana se ne učitava ponovo), gubi se samo pri osvežavanju i na stranama reči.
Isti uzrok, sasvim drugačiji opseg i prioritet.

> **PRAVILO 8:** Nalaz navodi **u kojoj tačno situaciji** se kvar dešava — tabelom
> „radnja → ishod", ne rečenicom „ne radi".
> **PRAVILO 9:** Kad vlasnica kaže suprotno od izmerenog, **prvo se pretpostavi da je
> ona u pravu** pa se meri ponovo. Ona koristi sajt onako kako ga ljudi stvarno koriste;
> test ga koristi onako kako ga je neko zamislio.

---

### Zaključak koji vredi zapamtiti

**Trideset devet agenata nije nadoknadilo jedno pravo korišćenje sajta.**

Agenti su odlični u onome što je *nabrojivo* — proći 1.988 strana, izmeriti 25 kontrasta,
pročitati 3.000 linija koda. Slabi su u onome što je *proživljeno*: uključiti tamni režim
pa nastaviti da radiš, kliknuti usred reči jer ti se tako desilo, pogledati adresu jer
hoćeš da pošalješ link drugarici.

Zato: automatika pokriva **širinu**, vlasnica pokriva **dubinu**, i nijedno ne zamenjuje
drugo. Prijava od vlasnice ima **prednost nad svim nalazima alata**.

---

## 29.07.2026 (druga sesija) — moja popravka je bila pola popravke, i to je uhvatila tek nova provera

### Šta se desilo

Popravio sam K1 (tamni režim se gubi pri osvežavanju) tako što `dark-mode-init.js`
sada stavlja klasu na `<html>` u `<head>`, a na `<body>` je prenosi na
`DOMContentLoaded`. Tema je posle `F5` zaista bila tamna — **ali je ikonica pokazivala
🌙, dakle suprotno od stanja.**

Uzrok: `app.js` stoji na kraju `<body>` i izvršava se **pre** `DOMContentLoaded`.
`applyDarkIcon()` je u tom trenutku gledao `body`, koji klasu još nije imao.

**Popravku sam smatrao gotovom.** Da nisam napisao proveru koja gleda i ikonicu,
a ne samo klasu, ovo bi otišlo na produkciju kao „popravljeno".

> **PRAVILO 10:** Popravka se proverava po **svemu što je korisnik vidi**, ne po
> internom stanju. Tema koja je tamna, a ikonica koja kaže „upali tamnu" — to je za
> korisnicu i dalje bag. Provera mora da pokrije i podatak i njegov prikaz.

### Drugi propust — upalio sam mogućnost, a nisam odmah izmerio šta ona povlači

Kad je tamni režim stigao na 2.009 strana koje ga nikad nisu imale, sa njim je stigao i
kontrast koji tamo nikad nije bio meren. Definicija reči je ispala **1,15:1** —
praktično nevidljiva. To nije bio zatečen bag, nego **bag koji sam ja uveo**.

Nisam ga video na ekranu (izgledalo je „nekako bledo"), video ga je merač.

> **PRAVILO 11:** Kad se neka mogućnost prvi put uključi na skupu strana, na tom
> skupu se **odmah pokreću sve provere koje za tu mogućnost važe** — kontrast pre
> svega. Nova mogućnost bez svojih provera je nova klasa bagova, ne poboljšanje.
> **PRAVILO 12:** „Bledo" i „nekako slabo" nisu nalazi. Meri se, pa se piše broj.

### Šta je od ovoga išlo dobro

Postupak iz radnog naloga — **pusti novu proveru protiv produkcije dok je tamo stari
kod** — uradio je tačno ono zbog čega postoji: svih 13 novih provera je palo na
produkciji, uključujući i onu koja je u konzoli pokazala tačan razlog za V2
(„Executing inline event handler violates the following Content Security Policy…").
Bez tog koraka ne bi se znalo da li provere uopšte nešto hvataju.

---

## 29.07.2026 (treća sesija, popravke) — moji sopstveni propusti

### 1. Pola dana sam tražio bag u sajtu, a kriva je bila MAŠINA

**Šta se dešavalo:** pre-deploy test je počeo da pada nasumično — otprilike svako
drugo pokretanje, uvek na `page.goto` sa istekom od 120 s, i uvek na drugom
mestu (12b, 12c, 12g, 14c, 16, `/klasici/`, `/vrste-rima/`). Sajt je bio ispravan.

**Šta sam radio, redom, i koliko me je koštalo:**

| Pokušaj | Obrazloženje koje sam sebi dao | Ishod |
|---|---|---|
| `python3 -m http.server` → `ThreadingHTTPServer` | „server je jednonitan" | nije pomoglo |
| server u zaseban proces | „test i server dele Node petlju" | nije pomoglo |
| keš zaglavlja (`Cache-Control`, `ETag`) | „skida se 600 MB po pokretanju" | pomoglo, ali nije rešilo |
| `detached: true` pri pokretanju servera | „macOS guši dete-proces" | nije pomoglo |
| gašenje toka pri prekidu veze | „cure fajl-deskriptori" | ispravno, ali nije uzrok |
| ponavljanje navigacije do 3 puta | „zaobići zastoj" | **sakrilo je uzrok** |
| `Connection: close`, `keepAliveTimeout = 0` | „Chromium drži previše veza" | **pogoršalo** — `0` u Node-u znači „bez ograničenja" |

**Pravi uzrok, kad sam konačno izmerio:**

```
$ netstat -an -p tcp | awk '{print $6}' | sort | uniq -c | sort -rn | head -3
41718 TIME_WAIT
 2035 FIN_WAIT_1
  688 LAST_ACK
$ sysctl net.inet.ip.portrange.first net.inet.ip.portrange.last
net.inet.ip.portrange.first: 49152      ← ukupno 16.384 porta
net.inet.ip.portrange.last: 65535
```

Mašina je ostala bez **efemernih portova**. `curl` na `127.0.0.1` javljao je
`Can't assign requested address`, Node `EAGAIN` — i to ne samo ka test serveru
nego i **ka google.com**. Chromium u tom stanju ne javi grešku nego tiho visi na
`page.goto`, pa izgleda kao da je sajt pokvaren.

Od tih 41.718 utičnica, samo **3.644** su išle ka test serveru (:8799). Ostalo su
bili drugi procesi na mašini: 17.677 ka :443, 3.930 ka :3000, 2.227 ka :7000.
Dakle **moj test je bio žrtva, ne uzrok** — ali ga je pogoršavao.

> **PRAVILO 13:** Kad alat pada nasumično i uvek na drugom mestu, **prvo izmeri
> okruženje**, pa tek onda menjaj kod. Konkretno: broj utičnica po stanju
> (`netstat -an -p tcp | awk '{print $6}' | sort | uniq -c`), slobodne portove,
> otvorene deskriptore, slobodnu memoriju. „Nasumično i svaki put drugde" je
> potpis iscrpljenog resursa, ne baga u kodu.
>
> **PRAVILO 14:** Ne uvoditi „ponavljanje dok ne prođe" pre nego što se zna zašto
> pada. Ponavljanje navigacije jeste ostalo u testu — ali kao **zaštita**, ne kao
> objašnjenje. Da sam se na njemu zaustavio, uzrok ne bi bio nađen, a test bi
> povremeno i dalje padao.
>
> **PRAVILO 15:** Kod podešavanja tuđih biblioteka pročitati šta znači granična
> vrednost. `server.keepAliveTimeout = 0` u Node-u **ne znači „bez keep-alive"**
> nego „bez ograničenja" — postavio sam tačno suprotno od nameravanog i oborio
> server, pa je test pao već na prvoj navigaciji.

### 2. Omotač za ponavljanje primenjen dvaput — 9 pokušaja umesto 3

Omotao sam i `browser.newPage` i `browser.newContext`. `browser.newPage()` interno
pravi kontekst, pa je strana prošla kroz oba omotača: 3 × 3 = **9 pokušaja**, sa
isprepletanim porukama koje su izgledale kao da test radi paralelno. Baš to
preplitanje me je i navelo da posumnjam u pogrešnu stvar.

> **PRAVILO 16:** Svaki omotač nad tuđim API-jem mora da bude **idempotentan** —
> obeleži objekat (`p.__ojacana = true`) i preskoči drugo omotavanje. Isprepletane
> poruke u ispisu su prvi znak da se omotač primenio više puta.

### 3. Provera koja prolazi i na starom kodu nije provera

Prva verzija provere „dva otvorena taba ne gaze beležnicu" **prošla je na
produkciji**, gde bag postoji. Scenario je bio pogrešan: drugi tab sam otvarao
posle prvog upisa, pa je učitao već ispravan tekst. Kad sam scenario ispravio
(prvi tab dopiše dok drugi drži stariju verziju, pa drugi otkuca jedan znak),
provera je na produkciji pala i pokazala tačan gubitak podataka.

> **PRAVILO 17:** Provera koja **prođe** protiv starog koda se ne prepravlja u
> „valjda je ipak dobra" — nego se prepravlja **scenario**, dok ne padne. Postupak
> „pusti protiv produkcije dok je tamo stari kod" vredi samo ako se rezultat
> „prošlo" tretira kao **pad provere**, a ne kao dobra vest.

### 4. Merio sam pogrešnu stvar pa umalo prijavio ispravan kod kao bag

Za sedam odblokiranih reči napisao sam proveru „rime za *zdrava* moraju da sadrže
*krvava*". Pala je i lokalno, posle ispravne popravke. Uzrok: obe reči jesu u istoj
rimskoj grupi (`ava`), ali „krvava" ima tri sloga, „zdrava" dva — pa ide u grupu
„dobre rime", koja je odsečena na 90 reči, a „krvava" je po učestalosti iza toga.
Kod je bio ispravan, provera nije.

> **PRAVILO 18:** Kad se proverava da li je reč **dozvoljena**, ne meri se preko
> rangiranja i odsecanja. Mora se meriti na najkraćem putu — ovde je to pretraga
> rečnika, koja vraća sve pogotke bez rangiranja.

### 5. Šta je ovog puta išlo dobro

- **74 nove provere puštene su protiv produkcije dok je tamo stari kod i sve su
  pale.** Time je dokazano da hvataju baš to zbog čega su napisane — uključujući
  i tačnu reprodukciju „gde je **na kadada**" i „надживети" → „наџивети".
- Merenja su svuda upisana kao brojevi (`4,13:1 → 7,25:1`, `824 ms`, `19,3 MB`),
  ne kao utisci.
- Kad je pravilo 8a (logo se ne dira) bilo u sukobu sa nalazom o veličini slike,
  nalaz **nije popravljen** nego je prijavljen vlasnici kao odluka. Isto i sa
  ostatkom dečjeg režima, za koji je odobren samo Odeljak 1.

---

## Sesija 29.07.2026 (treća) — provera zatečenog stanja posle pada mreže

### 1. Napisao sam četiri provere sa IZMIŠLJENIM očekivanjima i ostavio ih da padaju

Pre-deploy test je stajao na **4 pala od 295**, i sve četiri su bile greška u
testu, ne u sajtu:

| Provera | Šta je očekivala | Šta je istina |
|---|---|---|
| `srce → sunce` i `sunce → srce` | prava rima u strogom režimu | poklapa se samo „-ce"; alat ih spaja tek uz „i šire rime" — **kod je ispravan** |
| `nebo → rebro` | prava rima | „-ebo" prema „-ebro" — nije rima ni u širem režimu |
| dečji režim na reči **„mrak"** | režim izbacuje bar jednu reč | nijedna od 125 rima za „mrak" nije u `KIDS_BLOCKED` — nije imao šta da izbaci |

Sva tri para sam **pretpostavio iz glave** umesto da ih izmerim u alatu.
Isti obrazac kao `njakam`, `bankomam`, `akrobaša` iz prethodne sesije — samo
prebačen sa rečnika na test. Poenta pravila o zvaničnim izvorima nije bila
„rečnik je poseban slučaj" nego „ne nagađaj ništa što možeš da izmeriš".

> **PRAVILO 19:** Očekivana vrednost u proveri se **izmeri u samom alatu pre
> nego što se upiše u test**. Nijedan par „reč → očekivani rezultat" ne sme u
> `predeploy.mjs` iz glave. Ako je provera pala, prvo pitanje je **„da li je
> očekivanje tačno"**, tek drugo „da li je kod pokvaren" — inače se ispravan kod
> „popravlja" dok se ne pokvari.
>
> Dopuna PRAVILU 18: ono je govorilo da se dozvoljenost reči ne meri preko
> rangiranja. Ovde je promašaj bio korak ranije — **izabrana je reč koja uopšte
> ne dodiruje ono što se proverava.** Uz svaku proveru filtriranja mora da stoji
> izmereni broj („brat: 119 → 118, nestaje „rat""), da se vidi da provera stvarno
> ima šta da uhvati.

### 2. Provera „nula grešaka u konzoli" padala je na greškama koje test sam pravi

Sekcija 13 je brojala i 502 na `reci.txt`, 503 na `definicije.json`, namerni 404
i prekinuti `fetch` pri brzoj navigaciji kroz 35 ruta — sve četiri **izaziva sam
test**, u proverama otpornosti. Provera koja pada uvek prestaje da išta znači, a
prava greška u konzoli bi se izgubila u tom šumu.

Popravljeno pomoćnikom `ocekujGreske(strana, ...obrasci)`, koji obrasce vezuje za
**tačnu stranu** koja kvar izaziva — ista greška na bilo kojoj drugoj strani se i
dalje prijavljuje.

> **PRAVILO 20:** Kad provera namerno kvari mrežu, izuzetak se piše **usko** — za
> tu stranu i taj obrazac. Globalni izuzetak („ignoriši sve 5xx") ućutkao bi i
> pravi kvar na produkciji.

### 3. Šta je ovog puta išlo dobro

- Nijedan nalaz nije prijavljen bez reprodukcije: pre nego što sam dečji režim
  proglasio pokvarenim, izmerio sam ga na 10 reči i našao da radi (`brat`
  119 → 118, `sat` 113 → 112, `vrat` 112 → 111).
- Nalaz **S10** (sinonimi za „sunce") je izmeren, a ne procenjen: 13 pogrešnih od
  19, i provereno da je greška usamljena među 13.505 odrednica.

### 4. Namerna odluka nije bila proverena kod korisnice

U beležnicu je bilo upisano pravilo „alat ne sme sam da prekucava tekst
korisnika", pa se pesma nije prebacivala u ćirilicu. Postojala je i provera koja
je to ČUVALA („beležnica se NE prekucava u ćirilicu"). U praksi je to značilo da
je pola strane ćirilica a pesma latinica — i vlasnica je to prijavila kao bag.

Odluka nije bila pogrešna sama po sebi; pogrešno je bilo to što je doneta u kodu
i zaključana testom, a nikad izneta vlasnici kao izbor.

> **PRAVILO 21:** Kad se svesno odluči da nešto NE radi, to se upisuje u
> `HANDOVER.md` kao **otvorena odluka**, ne samo u komentar u kodu. Provera koja
> takvu odluku zaključava mora u opisu da nosi reč „namerno" i razlog — inače
> sledeća sesija brani odluku koju niko nije doneo.

### 5. Bag koji sam našao usput bio je teži od tri koja su tražena

Pri proveri prebacivanja pisma ispalo je da lepljenje pesme **guta prelome
redova** — pesma od četiri stiha postajala je jedan red, pa su nestali i slogovi
po stihu i šema rime i bojenje. Uzrok: `execCommand('insertText', …)` u ovom
editoru ne pravi `<br>`. Bag je star, u glavnoj nameni alata za pisanje pesama,
i nijedan od 39 agenata iz prošlog audita ga nije našao.

Razlog zašto ga automatika nije našla: test je tekst u beležnicu uvek **kucao**,
nikad **lepio**. A ljudi pesmu gotovo uvek nalepe.

> **PRAVILO 22:** Svako polje za tekst se proverava sa **oba načina unosa** —
> kucanjem i lepljenjem — i to lepljenjem **višerednog** teksta. Kucanje i
> lepljenje idu kroz različit kod, pa jedno ne dokazuje ništa o drugom. Isto
> važi za parove: klik / `Enter`, miš / tastatura, prvi dolazak / povratnik.
