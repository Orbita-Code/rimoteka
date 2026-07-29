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
