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

### 6. Generator strana pokrenut dok je server držao folder — 524 foldera-duplikata

`gen_pages.py` briše `public/rime-za/` pre pisanja. Pokrenuo sam ga dok je
`test/static-server.mjs` još držao taj folder. Brisanje je puklo na pola, macOS
je napravio **524 foldera-duplikata** (`acamovic 2`, `aceci 2`…) i pojeo prave.

Ništa nije izgubljeno jer je sve bilo u gitu, ali je otišlo petnaest minuta — i
to najviše na pokušaju da se duplikati premeste u **Kantu preko Findera**, kako
nalaže globalno pravilo o trajnom brisanju. `osascript` je istekao **pet puta
zaredom**, i sa svih 524 odjednom i u grupama po 25. Prošlo je tek običnim
premeštanjem u folder van projekta.

> **PRAVILO 23:** Pre `gen_pages.py` uvek
> `pkill -f "static-server.mjs"; pkill -f "http.server"; sleep 2`, pa POSLE
> generisanja `ls public/rime-za/ | grep -c " 2$"` — mora biti 0. Zaštita u
> generatoru sprečava pola posla, ali ne sprečava duplikate koje napravi sistem.
>
> **PRAVILO 24:** Kanta preko Findera je nepouzdana za mnogo stavki. Pravilo
> „nikad trajni `rm` na korisničkim fajlovima" se poštuje **premeštanjem** u
> imenovani folder van projekta (`shutil.move`) — to je jednako povratno, a ne
> zavisi od toga da li Finder odgovara. Vlasnici se kaže gde su premešteni.

### 7. Provera je opet merila BROJ rezultata umesto same reči

Provera dečjeg režima po osnovi pala je na **ispravnom** kodu: „dupetu" jeste
nestalo (`pre=true, posle=false`), ali je zbir ostao `180 → 180` jer je lista
odsečena na 90 po grupi, pa sledeća reč popuni upražnjeno mesto.

Ovo je **drugi put** da isti obrazac obori proveru — prvi put 29.07. ujutru, kod
odblokiranih reči („krvava" za „zdrava"). Pravilo 18 je već postojalo i nije
pomoglo, jer je bilo zapisano kao savet a ne kao zabrana.

> **PRAVILO 18 (prepisano, jače):** U proveri filtriranja se **ne sme pojaviti
> poređenje brojeva rezultata** — ni `<`, ni `!==`, ni „bar jedna manje". Meri se
> isključivo prisustvo TE reči na spisku, pre i posle. Svaka lista u alatu je
> negde odsečena, pa broj ne govori ništa o tome da li je reč propuštena.

---

## Sesija 29.07.2026 (peta) — pet prijava vlasnice, sve u istoj slepoj tački

Vlasnica je u jednoj sesiji prijavila pet stvari. Test je u tom trenutku
prolazio **332/332**. Nijednu od pet nije uhvatio. To nije slučajnost nego
jedna te ista rupa, viđena iz tri ugla.

### 1. Test je gledao samo mesta gde je alat, a ne stranu na kojoj alat stoji

`.chip` je 28.07. u `b3bd730b2` prebačen sa `inline-flex` na `flex` — uz
ispravnu popravku ikonica. Unutar `.results` razlike nema (flex kontejner
blokira svoje stavke), pa je test bio zelen. Ali čipovi stoje i **usred pasusa**
na `/rimovanje-reci/` i `/rime-za-decu/`, a tamo je `flex` blok: 24 reči su se
izlistale jedna ispod druge, svaka preko cele širine. Tako je stajalo na
produkciji **ceo dan**, a dve sesije su u međuvremenu radile na tim istim
fajlovima.

Test je proveravao `.results .chip` — nikad `.landing-lead .chip`.

> **PRAVILO 25:** Kad se menja CSS pravilo za komponentu, prvo `grep` gde sve ta
> komponenta stoji (`grep -rl 'class="chip"' public --include=*.html`), pa se
> provera piše za **svaki** kontekst, ne samo za onaj u kome je bag popravljan.
> Komponenta se ne testira tamo gde si je gledao, nego tamo gde živi.

### 2. Osvežavanje nije bilo ni jedna provera u testu

Test je otvarao strane, klikao i kucao, ali **nijednom nije pritisnuo F5 pa
pogledao gde je ostao ekran**. Zbog toga je bag „osvežavanje ostavlja korisnika
na futeru prazne strane" preživeo sve audite. Protokol (odeljak D, tačka 6)
traži osvežavanje — ali kao proveru *postavki* (tema, pismo), ne kao proveru
*položaja na strani*.

> **PRAVILO 26:** Posle osvežavanja se proverava **i gde je ekran**, ne samo da
> li su postavke preživele. Merenje je `window.scrollY`, pre i posle, sa
> čekanjem — jer strana posle učitavanja poraste i tek tada pregledač vraća
> stari položaj.

### 3. Nijedna sesija nije pročitala šta Google zaista prikazuje

Meta opis `/rimovanje-reci/` bio je ispravan i pisao je da je Rimoteka alat.
Google ga je ignorisao i uzeo **prvu rečenicu vidljivog teksta**, koja je
definisala pojam („rimovanje reči je traženje reči koje se zvučno poklapaju").
U rezultatu pretrage strana je izgledala kao rečnička odrednica.

Auditi su proveravali da meta opis **postoji** i da je jedinstven — nikad šta
je stvarno u SERP-u.

> **PRAVILO 27:** Prva rečenica vidljivog teksta je deo SEO-a jednako kao meta
> opis, jer je Google često pretpostavi meta opisu. Piše se tako da sama, van
> konteksta, kaže **šta strana radi**, a ne šta pojam znači.

### 4. Šta je ovog puta išlo dobro

- Obe nove provere (sekcije 22 i 23) puštene su protiv produkcije **dok je tamo
  bio stari kod** i tamo su pale — 2/7 i 4/6. Provere valjaju.
- Nalaz „nema legende ikonica" je **odbačen pre prijave**: legenda postoji,
  klasa je `.res-legend`, a moj prvi upit ju je promašio jer je tražio `.legend`.
  Da sam ga prijavio, vlasnica bi tražila popravku nečega što radi.
- Regeneracija 1.988 strana prošla je bez ijednog duplikata (pravilo 23 radi).

### 5. Sporost sesija — izmereno, pa je pola sumnji otpalo

Vlasnica je prijavila da su sesije spore i pretpostavila da svaka skida rečnik
od 19 MB. Merenje: upis 50 MB u projekat traje **0,019 s**, isto kao van
iCloud-a; `git status` **0,108 s**. Rečnik i disk nisu krivi.

Krivo je bilo: (1) `git` bez podešenog pagera — prva komanda ove sesije
**istekla je posle 2 minuta** jer je `git log` čekao na `less`; (2) spisak
odobrenih komandi ima 15 stavki, pa sesija stalno staje i čeka odobrenje.

> **PRAVILO 28:** Svaka `git` komanda ide sa `--no-pager` (ili `| cat`). Bez
> toga `log`, `diff`, `branch` i `show` čekaju na pager kojeg u ovom okruženju
> nema, i troše ceo dozvoljeni rok — dva minuta po pozivu, za ništa.

---

## Sesija 29.07.2026 (peta), nastavak — OBORIO SAM SAJT NA ~3 MINUTA

> Najozbiljniji propust ove sesije. Zapisujem ga u celini, bez ulepšavanja.

### 1. Šta se desilo

Popravljao sam nalaz N17 (`https://www.rimoteka.com` vraćao 200 umesto 301) i
dodao u `nginx.conf` zaseban blok:

```nginx
server { listen 80; server_name www.rimoteka.com; return 301 https://rimoteka.com$request_uri; }
server { listen 80; server_name _; ...ceo sajt... }
```

Posle deploy-a **`https://rimoteka.com/` je vraćao 301 na samog sebe** — 50
koraka, prazna strana, sajt nedostupan. Vraćeno za ~3 minuta.

### 2. Uzrok — i zašto je moje objašnjenje bilo pogrešno

U nginx-u **`server_name _` NIJE hvatalica za sve domene.** `_` je namerno
nevažeće ime domena koje se nikad ne poklopi ni sa jednim `Host` zaglavljem.
Taj blok je hvatao sve zahteve isključivo zato što je bio **PRVI blok na tom
portu**, a nginx prvi blok uzima za **podrazumevani** kad nijedan nema
`default_server`.

Kad sam www blok stavio **ispred** njega, **www blok je postao podrazumevani** i
pokupio svaki domen koji se ne poklopi — uključujući `rimoteka.com` — pa ga je
preusmeravao na `https://rimoteka.com/`, dakle na samog sebe.

Ispravno bi bilo: glavni blok označiti sa `listen 80 default_server;` i www blok
staviti **iza** njega.

### 3. Zašto provera nije pomogla

Proverio sam konfiguraciju kroz `crossplane` i dobio `status: ok`, pa sam
deployovao. **`crossplane` proverava SINTAKSU, ne SEMANTIKU.** Konfiguracija je
bila savršeno ispravna kao tekst i potpuno pogrešna kao ponašanje. Uzeo sam
zeleno svetlo jedne vrste provere kao dokaz za sasvim drugu vrstu tvrdnje.

To je isti obrazac kao „test prolazi 140/140, a sajt ima 35 nalaza" — samo na
konfiguraciji umesto na kodu.

> **PRAVILO 29:** `nginx.conf` se **ne deployuje** dok se ne pokrene **pravi
> nginx** sa tom konfiguracijom i ne proveri **ponašanje po `Host` zaglavlju**:
> ```
> curl -H "Host: rimoteka.com"     http://127.0.0.1:PORT/   # mora 200
> curl -H "Host: www.rimoteka.com" http://127.0.0.1:PORT/   # mora 301
> curl -H "Host: nepoznato.test"   http://127.0.0.1:PORT/   # mora 200, ne 301
> ```
> Provera sintakse (`nginx -t`, `crossplane`) je **nužna a ne dovoljna**.
> Treći red je najvažniji — on hvata baš grešku podrazumevanog bloka.

> **PRAVILO 30:** Kad zeleno svetlo dolazi od alata, pre nego što se na njega
> osloniš odgovori u jednoj rečenici: **šta tačno taj alat NE proverava?** Ako
> odgovor dodiruje ono što upravo menjaš, alat nije dokaz.

> **PRAVILO 31:** Izmene koje mogu da obore ceo sajt (`nginx.conf`, `Dockerfile`,
> CSP, preusmerenja) **ne idu u isti nalet sa ostalim popravkama.** Idu same,
> sa spremnim vraćanjem i sa proverom odmah posle deploy-a — i to proverom
> **glavne adrese**, ne samo one koju si menjao. Ja sam proverio `www` (radilo)
> i tek onda glavnu (pala).

### 4. Šta je ipak bilo dobro

Provera posle deploy-a **jeste** pokrenuta i **jeste** uhvatila kvar u prvom
minutu, pa je vraćanje bilo brzo. Da sam se zaustavio na „www sada vraća 301,
gotovo", sajt bi stajao oboren dok ga vlasnica ne primeti.

### 5. Proglasio sam CLS popravljenim na osnovu dva srećna merenja

Posle popravke izmerio sam `/` dva puta, dobio 0,0065 oba puta i u izveštaju
napisao da je nalaz zatvoren. Pun test protiv produkcije zatim je vratio
**0,3207** i pao.

Ponovljeno merenje, 13 pokretanja: **11 puta 0,0065, dva puta ~0,30.** Oba loša
pala su u minut kad se Coolify kontejner restartovao posle deploy-a — tada CSS
nakratko stigne sporo pa se strana iscrta neuređena. Pod usporenim procesorom
(4×) i sporom mrežom nije se ponovilo nijednom u 11 pokušaja.

Dve pouke, i druga je važnija:

1. **Merenje nije provera dok se ne ponovi.** Dva ista broja nisu dokaz
   stabilnosti; treći pokušaj je bio taj koji je rekao istinu.
2. **Ne meri se u minutu posle deploy-a.** Kontejner se tada diže, a merenje
   hvata prelazno stanje i prijavljuje ga kao osobinu sajta.

> **PRAVILO 32:** Merenja koja variraju (CLS, LCP, INP, vreme odziva) idu u test
> kao **najbolje od tri pokušaja**, a u izveštaj sa **rasponom**, ne sa jednim
> brojem. Jedan loš pokušaj ne obara deploy; tri loša znače da je kvar stvaran.

> **PRAVILO 33:** Posle deploy-a se sačeka da se kontejner smiri pa se onda
> meri. Provera ISPRAVNOSTI (radi li sajt) ide odmah; provera BRZINE tek posle.

### 6. Ista greška u mom testu koju bih prijavio kao bag

`addInitScript` je stajao **unutar petlje** nad istom stranom. Skripte se
gomilaju, pa bi druga strana dobila dva posmatrača i CLS brojala **dvostruko** —
provera bi padala na ispravnom kodu. Nije stiglo da napravi štetu jer je prva
strana pala pre nje, ali je bilo tu.

> **PRAVILO 34:** Svako merenje u testu dobija **svoj kontekst pregledača**.
> Deljena strana nosi zaostalo stanje — nakupljene init skripte, keš fontova,
> `localStorage` — i to se vidi tek kad rezultat počne da laže.

## Iz šeste sesije (29.07.2026, kasno uveče) — mobilna verzija

### 7. Skrolujući red je odzumirao ceo sajt

Za M3 je sedam akcija beležnice trebalo da stane u jedan red koji se pomera
(`display:flex; overflow-x:auto; white-space:nowrap`). Na telefonu je takav red
**raširio celu stranicu na 822 px** — mobilni Chrome je „odzumirao" da stane
sadržaj, iako red ima `overflow-x:auto` i trebalo bi da sečе. Ni `max-width:100%`
ne pomaže: roditelj već ima širinu sadržaja, pa je i „100%" pogrešna mera.
Bisekcija četiri varijante (bez pravila / overflow hidden / contain) je pokazala
da jedino **`contain:inline-size`** zaustavlja širenje.

> **PRAVILO 35:** Svaki kontejner koji se pomera vodoravno i čiji je sadržaj
> širi od ekrana (`overflow-x:auto` + `nowrap`) na telefonu dobija i
> **`contain:inline-size`**. Bez toga mobilni Chrome računa širinu STRANICE od
> sadržaja kontejnera — i sajt odzumira. Merenje koje ovo hvata je jednostavno:
> `document.documentElement.scrollWidth === window.innerWidth`, na 390 px, sa
> sadržajem (prazna strana sve sakrije).

### 8. Kvar koji se nije video na desktopu: drugi oblik reda u editoru

M1 (beležnica ne boji rime) na desktopu nije mogao da se reprodukuje kucanjem —
desktop Chrome na Enter pravi `<br>`, mobilni pravi **`<div>` po redu**. Ceo
lanac beležnice (`getEditorText`) je poznavao samo `<br>`, pa je na telefonu
pesma bila jedan red: bez bojenja, bez broja slogova po stihu, i **pokvarena
u skladištu**. Ista pojava, dva različita DOM-a.

> **PRAVILO 36:** Šta god da čita `contenteditable`, testira se sa OBE strukture
> redova (`<br>` i `<div>`). Kucanje u testu ne pokriva mobilni oblik — editor
> se u testu puni i direktno `innerHTML`-om sa `<div>` redovima.

---

## Iz sedme sesije (30.07.2026) — usklađivanje evidencije

### 9. Nalaz koji nije u spisku nije praćen nalaz — dva su ispala, treći je zastareo

Pred audit 31.07. tri izvora su tvrdila tri različita stanja:

| Izvor | Tvrdio | Istina |
|---|---|---|
| `AUDIT/NALAZI-OTVORENI.md` | 2 otvorena (P10, P11) | tačno **za praćene**, ali spisak je bio nepotpun |
| `CLAUDE.md` odeljak 9b | 33 otvorena, 6 kritičnih, 7,2/10 | stanje **28.07.**, pre nego što je 29.07. zatvorila 60 nalaza |
| `TODO-RECNIK.md` „HITNO" | `frekvencija.json` pogrešan | **stvaran nalaz koji nikad nije ušao u spisak** (F1) |

Uz to je `HANDOVER.md:185` **tvrdio** da je P16 „u `NALAZI-OTVORENI.md` upisan sa punom
istinom i oznakom da se prati" — a tamo je P16 postojao samo u jednoj usputnoj rečenici
(„merenje je usput otkrilo P16"), bez reda u ijednoj tabeli. I ocena 6,9/10 živela je u
handoveru i uputstvu, a audit fajl je još govorio 7,2/10.

**Zašto se to desilo:** nalaz se upisivao tamo gde je bio **koristan za rad** (TODO za
posao, handover za predaju), a ne tamo gde se **broji**. Nijedan od tih fajlova nije
spisak nalaza, pa je brojanje davalo pogrešan rezultat u obe smera — jedno je pokazivalo
premalo, drugo previše.

> **PRAVILO 37:** Nalaz postoji tek kad je red u `AUDIT/NALAZI-OTVORENI.md`. Upisuje se
> **istog dana kad se otkrije**, pre nego što se o njemu bilo gde drugde piše. TODO,
> handover i uputstva samo **pokazuju na** taj red — nikad ga ne zamenjuju.
>
> **PRAVILO 38:** Nijedan sažetak stanja ne sme živeti u `CLAUDE.md` bez datuma i bez
> rečenice „izvor istine je `AUDIT/NALAZI-OTVORENI.md`". Sažetak koji se ne ažurira
> zajedno sa spiskom postaje zamka, jer se `CLAUDE.md` čita na početku SVAKE sesije, a
> spisak ne mora.
>
> **PRAVILO 39:** Kad handover tvrdi da je nešto negde upisano — **proveriti da jeste**.
> Tvrdnja o evidenciji nije evidencija. „P16 je upisan sa punom istinom" bilo je
> netačno, a stajalo je u dokumentu koji sledeća sesija čita kao istinu.

### 10. Tvrdio sam vlasnici kako radi rangiranje rima — a nisam otvorio kod koji ga radi

30.07.2026. Vlasnica je pitala da joj se objasni nalaz F1 (`frekvencija.json`).
Napravio sam „demonstraciju" u kojoj sam rime sortirao **samo po učestalosti** i
prijavio: *„`voda` pada na 31. mesto od 99 rima za `sloboda` — sajt te loše savetuje."*

**To je bilo netačno.** `app.js:593` sortira po **tri** merila, i učestalost je **treće**:
prvo blizina broja slogova, pa duži zajednički završetak, pa učestalost. Uz to se deli
na „Najbolje" i „Dobre rime" po broju slogova (`:616–617`). `sloboda` ima 3 sloga,
`voda` 2 — nisu ni u istoj grupi, pa je „31. od 99" broj koji na sajtu ne postoji.

Vlasnica je to uhvatila i rekla: *„Mislim da nisi to najbolje pročitao. To je nešto što
smo ispravili."* Bila je u pravu — pravilo je stajalo zapisano na **dva** mesta
(`CLAUDE.md` 6.2a i `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md` pogl. 7a), plus **13 redova
komentara u samom kodu** iznad sortiranja. Pročitao sam nalaz, a nisam pročitao kod.

Iste sesije, još tri greške u istom razgovoru:
- **Pisao sam ijekavicom** („unaprijed", „provjeriš") na projektu koji ima pravilo da je
  jekavica greška za `.rs` sajtove.
- **Upotrebio sam „kolodvor" dva puta kao primer retke srpske reči** — a tu reč sam uzeo
  iz tabele u `IZVORI-RECNIKA.md` gde je navedena kao **dokaz da srLex sadrži hrvatske
  reči**. Pročitao sam tabelu i upotrebio je naopako.
- **Dva puta sam pogrešno procenio težinu F1** — prvo „hitno, kvari rangiranje", pa
  „nevažno, treći razdvajač". Tačno je treće: malo kvari rime, ali **puno** kvari kockicu,
  igru i izbor strana (P10), jer isti podatak koriste četiri različita mesta.

> **PRAVILO 40:** Tvrdnja o tome ŠTA KOD RADI dokazuje se **pokretanjem tog koda ili
> vernim prepisom njegove logike** — nikad približnom rekonstrukcijom „u glavi". Ako
> simulacija preskoči i jedno merilo iz sortiranja, rezultat nije približan nego lažan.
>
> **PRAVILO 41:** Pre nego što se oceni koliko je nalaz važan, **nabroji SVE potrošače
> tog podatka** (`grep` za ime fajla/promenljive kroz ceo projekat). F1 je izgledao
> nevažan dok se gledalo samo sortiranje rima; četvrti potrošač (bazen „poznatih reči"
> za kockicu, `app.js:737`) je onaj koji je zaista pokvaren. **Ocena važnosti bez
> spiska potrošača je nagađanje.**
>
> **PRAVILO 42:** Primeri u razgovoru s vlasnicom moraju biti **srpske reči**, i piše se
> **ekavicom**. Reč iz tabele „šta je pogrešno u ovom izvoru" nikad se ne koristi kao
> neutralan primer — to je ta ista greška, samo prepisana.
>
> **PRAVILO 43:** Kad vlasnica kaže „mislim da nisi ovo pročitao" — **prvo se pretpostavi
> da je u pravu**, pa se otvori fajl i kod. Ovde je bila u pravu, a pravilo je bilo
> zapisano na tri mesta.

### 11. Merio sam font koji se nikad nije učitao — i brojevi su izgledali uredno

30.07.2026. Pri zameni fonta (nalaz T1) trebalo je izmeriti odnos širina novog fonta
prema Arialu, da rezervni font zauzme istu širinu i strana ne skače (nalaz P16).
Merna skripta je ispisala uredne brojeve: `0,9131 / 0,9214 / 0,8992 / 0,8837`, prosek
`0,9043`, i ja sam u `style.css` upisao **`size-adjust: 90,4%`**.

**Font se nikad nije učitao.** Skripta je merila Arial protiv Ariala.
`document.fonts.check` je vraćao `false`, ali skripta to nije proveravala — samo je
postavila `style.fontFamily` i izmerila širinu, a pregledač je tiho koristio rezervni
font. Tačna vrednost je **100,9%**, dakle promašaj od deset procenata u broju koji
postoji isključivo da bi strana prestala da skače.

**Kako je uhvaćeno:** merio sam dva različita fonta i dobio **identične brojeve do
četvrte decimale**. To je bio jedini znak. Da sam merio samo jedan font, pogrešna
vrednost bi otišla na produkciju kao „izmereno, ne procenjeno".

> **PRAVILO 44:** Merenje mora da proveri da je **predmet merenja stvarno prisutan**, i
> da **padne** ako nije. Za fontove: `document.fonts.check(...)` za svaki podskup
> posebno (kod Google-a je ćirilica odvojen fajl preko `unicode-range`, pa se mora
> tražiti ćiriličnim tekstom — inače se učita samo latinica i ćirilica se meri
> rezervnim fontom).
>
> **PRAVILO 45:** Kad merenje dva različita predmeta da **isti rezultat**, to nije
> potvrda nego **sumnja**. Prvo proveri da meriš ono što misliš da meriš.
>
> **PRAVILO 46:** Broj koji ide u kod kao „izmereno" mora da nosi ime skripte kojom je
> izmeren, da sledeća sesija može da ga **ponovi**, a ne da mu veruje. Zato su
> `test/meri-font.mjs` i `test/meri-cls.mjs` sada u projektu, ne u privremenom folderu.

### 12. Podesio sam rezervni font po prozi, a pomera se traka tabova

30.07.2026, pri prelasku celog sajta na Rubik. `size-adjust` sam izračunao kao prosek
odnosa širina na **dve rečenice teksta** — dobio 102,0%. CLS je posle toga skočio na
**0,37** na `/rimovanje-reci/` (granica je 0,1), a pre promene fonta je bio 0.

Uzrok: `layout-shift.sources` pokazuje da se pomera **traka tabova** (`DIV.script-toggle`,
`A.active`), ne pasus. Njen tekst ima sasvim drugi odnos širina — Rubik/Arial = **1,0662**,
a ne 1,0196 koliko daje proza. Sa `size-adjust: 106,6%` CLS je pao na **0,0028**.

> **PRAVILO 47:** `size-adjust` se podešava po **elementu koji se stvarno pomera**, ne po
> prosečnoj rečenici. Prvo `layout-shift.sources` → koji je element → onda meri ŠIRINU TOG
> ELEMENTA u web-fontu i u rezervi. Prosek preko celog teksta krije baš onaj deo koji lomi
> stranu.
>
> **PRAVILO 48:** Posle svake promene fonta CLS se meri **pre nego što se poveruje** da je
> gotovo. Ovde je font bio ispravan (ima sva slova), tipografija lepa, test 367/367 —
> a strana je skakala četiri puta više nego pre.

### 13. Provera koja bi ovo uhvatila mesecima ranije — sekcija 29

Kvar sa fontom (nalaz T1) postojao je otkad je Fredoka uvedena, a otkrila ga je **vlasnica
okom**, ne test. Test od 368 provera ga nije doticao, jer je gledao da font POSTOJI
(`/Fredoka/i.test(...)`), a ne da **ima slova koja mu trebaju**.

Sekcija 29 to meri: za svako od 30 srpskih slova poredi širinu u našem fontu sa širinom u
sistemskom serifu. Ako su jednake, a obično „a" nije — glifa nema i pregledač tiho uzima
drugi font. Provera je puštena sa Fredokom i **nabrojala tačno 26 slova koja fale**.

> **PRAVILO 49:** `document.fonts.check()` i `unicode-range` **nisu dokaz da glyph postoji** —
> oni najavljuju opseg. Fredoka je za „č" vraćala `true`, a slova nije imala. Jedini pouzdan
> dokaz je **poređenje širine** sa sistemskim fontom.
>
> **PRAVILO 50:** Provera da nešto POSTOJI nije provera da RADI. Ovo je isti obrazac kao
> nalaz iz 28.07. („test obilazi 6 od 2.010 strana i gleda da element postoji"). Kad se
> piše provera, pitanje je: *šta bi se pokvarilo a da ova provera i dalje prođe?*
