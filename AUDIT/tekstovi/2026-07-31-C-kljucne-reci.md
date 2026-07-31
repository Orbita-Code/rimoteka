# Ključne reči i fraze — istraživanje 31.07.2026

> **Dva sloja podataka, ne mešaju se.**
> **IZMERENO** = naš Google Search Console i Analytics, period 28.05.–28.07.2026
> (`AUDIT/analitika/2026-07-30.md`). Uzorak: **63 sesije, ~39 klikova, 82 upita**.
> Ispod 100 klikova — opisuje **stanje**, ne trend.
> **ISTRAŽENO** = pretraga veba 31.07.2026: ko rangira, kojim rečima piše, šta nudi.
> **PROCENA** = moja ocena vrednosti. **Nemamo alat za obim pretrage.** Nijedan broj
> obima u ovom izveštaju nije izmišljen — gde piše „procena", u odeljku 9 stoji na
> osnovu čega je doneta.

---

## 1. ŠTA VEĆ ZNAMO IZ SVOJIH PODATAKA (izmereno)

Prvih 10 od 82 upita, GSC, 90 dana:

| Upit | Prikazi | Klikovi | Šta iz toga sledi |
|---|---|---|---|
| rimoteka | 314 | 22 | **brendirano** — ko nas nađe po imenu, već nas zna. Ostaje ~17 klikova iz prave pretrage. |
| **rimovanje** | **428** | 5 | Najjači upit bez brenda. Jedna reč, široka namera. Nosi ga početna. |
| rimovanje reči | 164 | 4 | Radi. Naslov `/rimovanje-reci/` ga doslovno sadrži. |
| rimovanje reci | 100 | 3 | Bez kvačica — **rangiramo i bez posebnog teksta bez kvačica.** |
| rečnik rima | 45 | 3 | |
| reci koje se rimuju | 22 | 1 | Bez kvačica, dug oblik. Poklapa se sa `h2`/opisom na `/rime-za/…`. |
| brojač karaktera | 2 | 1 | Jedini upit koji donosi `/slogovi/`. Skoro nevidljivi. |
| **recnik rima** | **204** | **0** | ⚠️ **Najveći izmereni propust na celom sajtu.** |
| rimovanje reči na srpskom | 65 | 0 | ⚠️ |
| rimovanje reci na srpskom | 40 | 0 | ⚠️ |

**Strane (GA4, 90 dana, 3.847 pregleda):** `/` 2.018 · `/rimovanje-reci/` 646 ·
`/slogovi/` 99 · `/rime-za-decu/` 34 · `/rime-za/dusa/` 20 · `/rime-za/kisa/` 17 ·
ostale `/rime-za/` po 1–4. **Samo 6 od ~1.990 `/rime-za/` strana ima ijedan pregled.**

**Indeksiranost: 124 primljeno, 1.014 odbijeno — ~11%.** Ovo određuje sve u odeljku 8.

### Uzrok za `recnik rima` 204 : 0 — nađen u kodu, ne pretpostavljen

| Gde | Šta piše sada |
|---|---|
| `public/index.html` `<title>` | „Rimovanje reči na srpskom — rime, slogovi, pesme \| Rimoteka" |
| `public/index.html` `<h1>` | „Rimovanje reči, **rečnik rima** i brojač slogova na srpskom jeziku" |
| `public/index.html` opis | „Rimovanje reči na srpskom jeziku, objašnjenje svake reči…" |

Fraza **`rečnik rima` postoji u `h1`, ali je nema ni u naslovu ni u opisu.** Zato
rangiramo (Google je čita iz `h1` i teksta), a u rezultatu pretrage čovek ne vidi ono
što je ukucao — pa ne klikne. **To nije problem pozicije nego naslova.** Isto važi za
`rimovanje reči na srpskom` (105 prikaza zbirno, 0 klikova): naslov ima „na srpskom",
ali celu tu frazu razblažuje sa još tri pojma.

---

## 2. Sa kvačicama i bez — kako ljudi zaista kucaju

**Izmereno, tri para iz naših podataka:**

| Par | Sa kvačicama | Bez kvačica | Odnos |
|---|---|---|---|
| rečnik rima | 45 | **204** | 1 : 4,5 |
| rimovanje reči | **164** | 100 | 1,6 : 1 |
| rimovanje reči na srpskom | 65 | 40 | 1,6 : 1 |
| reči koje se rimuju | 0 zabeleženo | 22 | — |
| **zbir ta tri para** | **274** | **366** | **oblik bez kvačica nosi 57%** |

**Tri zaključka, i jedan je suprotan očekivanju:**

1. **Oblik bez kvačica nosi većinu prikaza** — ali ne uvek i ne u istom odnosu. Kod
   `rečnik` odnos je 4,5:1 u korist golog oblika, kod `reči` je obrnut. Odnos zavisi od
   reči, ne od pravila. Zato se **ne planira po osećaju** nego po ovoj tabeli.
2. **Ne treba pisati tekst bez kvačica.** Ovo je najvažniji nalaz odeljka i suprotan je
   onome što se obično radi. Dokaz je naš: naš sajt **nigde ne piše `recnik rima`**, a
   ipak ima **204 prikaza** na tu frazu. Google srpske kvačice tretira kao isto slovo.
   Pisanje „recnik rima" u tekst ne bi donelo prikaze koje već imamo — samo bi nam
   pokvarilo jezik.
3. **Ono što kvačice ipak menjaju je izgled rezultata.** Google podebljava poklopljene
   reči; kad se u naslovu ne pojavi ni jedan oblik fraze, čovek ne prepoznaje svoj upit.
   **Rešenje je da fraza uđe u naslov u pravilnom srpskom obliku, a ne da se osakati.**

**Praktično pravilo za sve buduće naslove:** ključna fraza ide u `<title>` **sa
kvačicama, pravilno**, i to na **početak**. Nikad se ne pravi druga verzija strane bez
kvačica — to je duplikat, a sa 11% indeksiranosti duplikat je čista šteta.

---

## 2b. Ćirilica i latinica u pretrazi

**Izmereno:** među 82 upita u GSC-u **nema nijednog ćiriličnog** koji je ušao u prvih
deset; brendirani i svi merljivi upiti su latinični.

**Istraženo:** ćirilica u ovoj niši postoji, ali skoro isključivo u **školskom sadržaju**
— „Рима" na Википедији, „Стих, строфа, рима" na blogovima za srpski jezik. Alati (mi,
AZRhymes, rimovanje.com) svi rade latinicom. Jedan konkurent, `igrarecima.com`, drži
**dva odvojena skupa URL-ova** — `/latinica/…` i `/cirilica/…`.

**Presuda: ne kopiramo to, i to izričito.** Njihov način udvostručuje broj tankih strana.
Kod nas je indeksiranost 11% — udvostručiti strane znači udvostručiti odbijeno.
Naš način (jedan kanonski latinični URL + prekidač pisma u alatu) ostaje.

**Ono što jeste vredno, i ne košta novu stranu:** u `/vrste-rima/` i `/klasici/` sme da
stoji ćirilični primer stiha, jer tamo prirodno pripada. To hvata školsku nameru bez
ijednog novog URL-a.

---

## 3. Fraze zanata — pesnici i tekstopisci (naša prva tri čitaoca)

**Istraženo.** Ovo je najzanimljiviji nalaz celog istraživanja: **za stručne pojmove
srpskog stiha rangiraju hrvatski i školski sajtovi.** Redom, ko je izašao:

| Pojam | Ko rangira | Šta to znači za nas |
|---|---|---|
| vrste rima | `liber-media.hr`, `net.hr`, `hr.wikipedia`, `lektire.rs` | prostor za **.rs i ekavicu** je poluprazan |
| asonanca | `lektire.rs`, `opsteobrazovanje.in.rs`, `beleske.com` | školski sadržaj, bez alata |
| aliteracija | isto | isto |
| unutrašnja rima | hrvatske definicije | niko ne pokazuje **primer koji možeš da napraviš** |
| slobodan stih | `liber-media.hr`, `lektirko.hr`, wordpress radionica | čista hrvatska prevlast |
| prazan stih | hrvatski izvori | |
| metar, ritam, stopa | `zagrebacka-slavisticka-skola.com`, `ehors.weebly.com` | akademski, težak tekst |
| podela reči na slogove | `srpskijezik.rs`, `edukacija.rs`, `tabanovic.com` | **mi ovde imamo alat, oni nemaju** |
| kako napisati rep pesmu | `kakopedija.com` | tekst iz 2010-ih, bez alata |
| rečnik rima za tekstopisce | **`sr.azrhymes.com`** — to im je doslovan naslov | jedini pravi takmac za našu publiku |

**Šta iz ovoga sledi, konkretno:**

- **Naša prednost nije definicija nego dokaz.** Svi ti sajtovi kažu *šta je* obgrljena
  rima. Niko ne da čoveku da tu rimu **napravi u istom prozoru**. Kod nas alat stoji na
  istoj strani. Tu rečenicu treba da nosi `/vrste-rima/`.
- **AZRhymes je jedini koji publiku zove imenom** — „za tekstopisce, reperiste i
  pesnike". Mi publiku imenujemo samo u `/rime-za-rep/`. To je propuštena prilika u
  naslovima `/rimovanje-reci/` i `/pisanje-pesama/`.
- **Pojmovi koje nigde ne pominjemo, a naša su publika:** *asonanca, aliteracija,
  konsonanca, unutrašnja rima, čista rima, bliska rima, muška i ženska rima, slobodan
  stih, prazan stih, katren, strofa, refren, deseterac, flow, punchline, višestruka
  rima*. **Nijedan ne dobija svoju stranu** (v. odeljak 8) — svi idu kao `h2` i pitanja
  u `/vrste-rima/`, `/kako-napisati-pesmu/`, `/rime-za-rep/`.
- **`rime.com.hr` i `rimovanje.com` pišu ijekavicu** („Rimovanje **riječi**"). Njihova
  fraza je vlasništvo hrvatskog i bosanskog tržišta. **Ne otimamo je i ne pišemo
  ijekavicu** — to bi prekršilo pravilo projekta i zbunilo našeg čitaoca. Alat ionako
  već razume ijekavicu (`reci_jekavica.txt`); **jedna poštena rečenica o tome** na
  `/rimovanje-reci/` vredi više od svakog ijekavskog naslova, i ne košta novu stranu.

---

## 4. Duga pitanja (hvata Google-ov isečak i AI pregled)

**Već pokriveno — provereno u kodu, `build/gen_pages.py:912–945`:**

| Pitanje | Gde stoji | Oblik |
|---|---|---|
| „Šta se rimuje sa „X“?" | ~1.990 `/rime-za/` strana | FAQPage schema + vidljiv `<details>` |
| „Koje se reči rimuju sa „X“?" | isto | FAQPage schema |
| „Koliko slogova ima reč „X“?" | isto + `/slogovi/` | FAQPage schema |
| „Kako se broje slogovi" | `/slogovi/` `h2` | vidljiv naslov |
| „Podela reči na slogove" | `/slogovi/` `h2` | vidljiv naslov |

To je urađeno dobro i **ne dira se.** Fraze `šta se rimuje sa…` i `reči koje se rimuju
sa…` su već na pravom mestu, u pravom obliku.

**Pitanja koja ljudi kucaju, a mi ih nemamo — i sva staju u postojeće strane:**

| Pitanje | Ide u | Kao |
|---|---|---|
| kako napisati pesmu koja se rimuje | `/kako-napisati-pesmu/` | `h2` + odgovor u 2 rečenice |
| koje su vrste rima i primeri | `/vrste-rima/` | već je tema — treba mu **primer po vrsti** |
| šta je asonanca, šta aliteracija, koja je razlika | `/vrste-rima/` | jedan `h2` za oba, jer se traže zajedno |
| šta je unutrašnja rima | `/vrste-rima/` | `h2` |
| šta je slobodan stih | `/kako-napisati-pesmu/` | `h2` |
| kako napisati rep tekst | `/rime-za-rep/` | `h2` + koraci |
| koliko strofa ima pesma / šta je katren | `/klasici/` | tamo već stoji šema rime |
| kako se piše zdravica u stihu | `/rime-za-svadbu/` | `h2` |
| koliko slogova ima [ime] | `/slogovi/` | primeri sa imenima |

**Pravilo oblika, isto za sve:** naslov je **pitanje**, odgovor stoji **odmah ispod, u
jednoj do dve rečenice**, pa tek onda razrada. Tako ga uzima i isečak i AI pregled. Ako
odgovor počinje sa „U ovom tekstu ćemo objasniti…" — ne uzima ga niko.

---

## 5. Sezonske fraze i kalendar — šta spremiti i kada

> **Ovo je PROCENA, ne merenje.** Naših 63 sesije za 90 dana ne mogu da pokažu sezonu.
> Osnov procene je u odeljku 9. Datum „spremi do" računa se **osam nedelja pre vrha** —
> ne četiri — zato što je naša indeksiranost 11% i strani treba više vremena da uđe.

| Prilika | Vrh traženja (procena) | Spremi do | Naša strana | Snaga (procena) |
|---|---|---|---|---|
| **Nova godina i Božić** | 15.12. – 07.01. | **20.10.** | `/rime-za-novu-godinu/` | **najjača sezona u godini** |
| **Rođendan** | bez sezone, ravnomerno | stalno | `/rime-za-rodjendanske-pesmice/` | **najveći zbir kroz godinu** |
| **8. mart** | 20.02. – 08.03. | **01.01.** | `/rime-za-roditelje/` + `/rime-za-decu/` | jaka, kratka, oštra |
| **Svadbe** | maj–septembar, vrh jun i početak septembra | **01.03.** | `/rime-za-svadbu/` | srednja, duga |
| **Školske priredbe, kraj godine, Dan škole** | maj–jun | **01.04.** | `/rime-za-decu/` | srednja |
| **Prvi školski dan, 1. septembar** | 20.08. – 05.09. | **01.07.** | `/rime-za-decu/` | slaba–srednja |
| **Valentinovo, 14.02.** | 05.–14.02. | **15.12.** | `/rime-za-ljubavne-pesme/` | srednja, vrlo kratka |
| **Krsna slava** (Nikoljdan 19.12., Jovanjdan 20.01., Đurđevdan 06.05., Aranđelovdan 21.11.) | četiri oštra šiljka | **ne pravi se strana** | — | slaba, rascepkana |
| **Ispraćaj u vojsku** | — | **preskočiti** | — | nema vojnog roka, potražnja mala |
| **Sahrane, pomeni, godišnjice** | bez sezone | stalno | `/rime-za-tugu-i-secanje/` | tiha, stalna, mali promet |

**Šta se u tim terminima radi — a nije nova strana:** postojećoj strani se osveži prva
rečenica i doda blok gotovih rima za tu priliku (`mladenci`, `zdravica`, `mama`,
`godina`, `sneg`, `sveća`). Datum izmene se upiše, pa se za 14 dana meri.

**Šta se NE radi:** ne pravi se `/cestitke-za-novu-godinu/`. Tu frazu drži dvadesetak
sajtova sa gotovim čestitkama i našoj strani tu nema mesta. **Naša namera je drugačija —
čovek koji hoće da sam napiše, ne da prepiše.** Zato ciljamo `rime za novu godinu`, ne
`čestitke za novu godinu`.

---

## 6. Šta konkurencija cilja a mi ne

**Istraženo 31.07.2026.** (`sr.azrhymes.com` vraća 403 na alat — podaci iz naslova u
rezultatima pretrage i iz `COMPETITIVE-ANALYSIS.md`; `igrarecima.com` odbio vezu.)

| Konkurent | Šta cilja, a mi ne | Vredi li nam | Šta uraditi |
|---|---|---|---|
| **AZRhymes** | **pretraga po završetku** („rime na *-ka*") | **da, mnogo** | **već imamo** u `/recnik-srpskog-jezika/` — „koje se završavaju, počinju ili sadrže zadata slova". **Ne piše u naslovu.** Prepisati naslov i opis. |
| **AZRhymes** | **rima za frazu**, ne samo za reč („crvena jabuka") | možda | funkcija, ne tekst — pitanje za vlasnicu, ne za ovaj izveštaj |
| **AZRhymes** | publika u naslovu: „za tekstopisce, reperiste i pesnike" | **da** | ubaciti publiku u naslov/opis `/rimovanje-reci/` i `/pisanje-pesama/` |
| **AZRhymes** | tabovi Aliteracije, Konteksti, Primeri | delimično | „aliteracija" kao pojam ide u `/vrste-rima/`; tab ne pravimo |
| **rimovanje.com** | `rimovanje riječi` (ijekavica), exact-match domen | **ne** | ekavica je pravilo; ne otimamo ijekavski head-termin |
| **rimovanje.com** | blok „zadnje pretrage" na svakoj strani | **ne** | to je objava sopstvenog prometa — zabranjeno pravilom |
| **igrarecima.com** | odvojene `/latinica/` i `/cirilica/` grane | **ne** | duplira tanke strane pri 11% indeksiranosti |
| **rime.com.hr** | hrvatsko tržište | ne | drugo tržište, ista platforma kao AZRhymes |

**Šta imamo, a nijedan konkurent nema** — i to mora da stoji u naslovima i opisima, jer
je to jedini razlog da čovek klikne na nas umesto na sajt sa jačim domenom:

| Naše | Nema ga: | Gde to danas piše |
|---|---|---|
| **značenje reči uz svaku rimu** | rimovanje.com, AZRhymes, rime.com.hr | opis `/rimovanje-reci/` — dobro |
| **sinonimi uz rime** | svi | nigde u naslovu |
| **broj slogova uz svaku rimu** | AZRhymes grupiše, ali ne broji uz reč | delimično |
| **beležnica sa bojenjem rima dok pišeš** | svi | `/pisanje-pesama/` — dobro |
| **dečji filter** | svi | `/rime-za-decu/` — dobro |
| **igra rimovanja** | AZRhymes ima kviz | `/igra-rimovanja/` |
| **klasici sa šemom rime i brojem slogova** | **svi** | `/klasici/` — **najneiskorišćenija strana na sajtu** |
| **bez reklama i bez registracije** | AZRhymes naplaćuje 2,92 €/mes za bez reklama | opis `/rimovanje-reci/` — dobro |

---

## 7. RASPORED: koja fraza ide na koju našu stranu

„Vrednost" je **procena** (odeljak 9), osim gde piše **IZMERENO**.

| Fraza | Procena vrednosti | Naša strana | Šta uraditi |
|---|---|---|---|
| **recnik rima / rečnik rima** | **IZMERENO: 249 prikaza, 3 klika** | `/` (početna) | **Ubaciti „rečnik rima" u `<title>` i opis.** Sada je samo u `h1`. Najveća pojedinačna dobit na sajtu. |
| **rimovanje** | **IZMERENO: 428 prikaza, 5 klikova** | `/` | Fraza je u naslovu. Problem je što je naslov razbijen na četiri pojma. Suziti obećanje. |
| **rimovanje reči na srpskom (jeziku)** | **IZMERENO: 105 prikaza, 0 klikova** | `/` ili `/rimovanje-reci/` | Dve naše strane se tuku za isti upit. **Odrediti jednu** i staviti tačnu frazu na početak njenog naslova. |
| rimovanje reči / rimovanje reci | **IZMERENO: 264 prikaza, 7 klikova** | `/rimovanje-reci/` | Radi. **Ne dirati.** |
| reči koje se rimuju sa [reč] | **IZMERENO: 22 prikaza** + long-tail | `/rime-za/[reč]/` | Već u opisu i FAQ-u. Ne dirati. |
| šta se rimuje sa [reč] | visoka, rascepkana | `/rime-za/[reč]/` | Već u FAQ schemi. Ne dirati. |
| rime za [reč] | visoka, rascepkana na ~1.990 strana | `/rime-za/[reč]/` | Naslov tačan. Problem je **indeksiranost, ne tekst.** |
| **reči koje se završavaju na… / rime na -ica** | **srednja–visoka, mi je već rešili a ne govorimo** | `/recnik-srpskog-jezika/` | **Prepisati naslov i opis** da to obećaju. Funkcija postoji, niko ne zna. |
| brojanje slogova / koliko slogova ima reč | srednja, stalna, školska | `/slogovi/` | Naslov dobar. Dodati primere sa čestim rečima i imenima. |
| podela reči na slogove | srednja, školska (sept.–jun) | `/slogovi/` | `h2` postoji. Odgovor podići odmah ispod naslova. |
| brojač karaktera | **IZMERENO: 2 prikaza, 1 klik** | `/slogovi/` | Stoji u naslovu, ali je zbrisan drugim pojmovima. |
| vrste rima (parna, ukrštena, obgrljena) | srednja, školska | `/vrste-rima/` | Dodati **primer stiha za svaku vrstu** — to niko nema uz alat. |
| **asonanca / aliteracija** | srednja, školska, jaka konkurencija | `/vrste-rima/` | Novi `h2` sa oba pojma i razlikom. **Ne prava strana.** |
| unutrašnja rima, čista i bliska rima | niska, ali **naša publika** | `/vrste-rima/` | `h2` |
| **slobodan stih, prazan stih** | niska–srednja, hrvatska prevlast | `/kako-napisati-pesmu/` | `h2`; ekavica nam je prednost |
| metar, ritam, stopa, deseterac | niska, akademska | `/kako-napisati-pesmu/` + `/klasici/` | pomenuti, ne graditi |
| kako napisati pesmu | srednja | `/kako-napisati-pesmu/` | Naslov dobar. |
| **kako napisati rep tekst / pisanje rep teksta** | srednja, publika br. 2 | `/rime-za-rep/` | `h2` sa koracima; naslov proširiti publikom |
| tekstopisac, pisanje tekstova za pesme | niska po obimu, **visoka po publici** | `/pisanje-pesama/` | Ubaciti publiku u naslov, po ugledu na AZRhymes |
| rime za ljubavne pesme | srednja | `/rime-za-ljubavne-pesme/` | Ne dirati. |
| rime za decu / dečje pesmice | srednja, **niša u kojoj smo sami** | `/rime-za-decu/` | Naslov dobar. Dodati „recitacija" i „priredba" u tekst. |
| pesmica za mamu / 8. mart | sezonska, oštra | `/rime-za-roditelje/` | Spremiti do 01.01. |
| zdravica u stihu / rime za mladence | sezonska maj–sept. | `/rime-za-svadbu/` | Spremiti do 01.03. |
| čestitke u stihu za Novu godinu | sezonska, **jaka konkurencija čestitkaških sajtova** | `/rime-za-novu-godinu/` | Ciljati „rime za", ne „čestitke za". Spremiti do 20.10. |
| rime za rođendan | stalna | `/rime-za-rodjendanske-pesmice/` | Ne dirati. |
| stihovi za sahranu, pomen, godišnjicu | tiha, stalna | `/rime-za-tugu-i-secanje/` | Ne dirati; ton je tu važniji od SEO-a. |

---

## 8. Fraze bez strane — i zašto se strana ipak NE pravi sada

**Ovo je najvažniji odeljak izveštaja.**

**IZMERENO 30.07.2026: Google je primio 124 naše strane, odbio 1.014. To je ~11% od
poznatih, i ~6% od ~2.010 strana koliko ih sajt ima.**

**Pravilo projekta je izričito: dok je udeo prihvaćenih ispod 40%, NE dodaju se nove
strane.** (`CLAUDE.md` odeljak 9c; `.claude/agents/tekstopisac.md` odeljak 5.)
Zato **ovaj izveštaj ne predlaže nijednu novu stranu.** Ne jednu, ne „malu", ne „samo za
asonancu". Svaka nova tanka strana ide na gomilu odbijenih i vuče ceo sajt naniže.

Fraze koje bi u zdravom stanju sajta zaslužile svoju stranu, i **gde umesto toga idu danas**:

| Fraza bez strane | Gde ide danas | Kada bi zaslužila stranu |
|---|---|---|
| asonanca i aliteracija — razlika | `h2` u `/vrste-rima/` | tek preko 40% indeksiranosti |
| šta je slobodan stih | `h2` u `/kako-napisati-pesmu/` | isto |
| kako napisati rep tekst, korak po korak | `h2` u `/rime-za-rep/` | isto |
| zdravica u stihu | `h2` u `/rime-za-svadbu/` | isto |
| reči koje se završavaju na… | **prepisan naslov `/recnik-srpskog-jezika/`** | funkcija već postoji — strana nije ni potrebna |
| čestitke u stihu za slavu | **nigde** | verovatno nikad — tuđa namera |
| rime na engleskom | **nigde** | odluka vlasnice o opsegu, ne SEO pitanje |

**Šta se radi umesto pravljenja strana — tim redom:**

1. **Prepisati naslov i opis početne** da sadrže `rečnik rima`. 249 prikaza čeka. Nula
   novih strana, nula rizika.
2. **Rešiti sudar `/` i `/rimovanje-reci/`** za `rimovanje reči na srpskom`. Dve naše
   strane se tuku za isti upit; jedna mora da odustane.
3. **Prepisati naslov `/recnik-srpskog-jezika/`** da obeća pretragu po završetku reči.
   Funkcija postoji od ranije, a nijedan naslov je ne pominje.
4. **Dopuniti postojeće strane** pojmovima zanata kao `h2` sa odgovorom odmah ispod.
5. **Tek kad indeksiranost pređe 40%** — ponovo otvoriti pitanje novih strana.

**Merenje: 13.08.2026** (agent `analitika`). Gledaju se tačno tri broja: klikovi na
`recnik rima` (sada **0**), klikovi na `rimovanje reči/reci na srpskom` (sada **0**), i
udeo indeksiranih (sada **11%**).

---

## 8b. Usput nađeno — ne spada u ključne reči, ali se ne prećutkuje

**„270.000 reči" stoji na oko 2.000 strana.** Prebrojano: `public/reci.txt` ima **272.746**
redova, pa je broj **tačan i zaokružen naniže**, kako pravilo traži. Ali pravilo traži i
da se **broj koji raste uopšte ne piše**, baš zato što isti tekst stoji na dve hiljade
strana. Pojavljuje se u `build/gen_pages.py` (5 mesta), `public/index.html` (2) i
`public/recnik-srpskog-jezika/index.html` (5). **Predlog: zameniti sa „ceo srpski rečnik".**
Upisati u `TODO-TEKSTOVI.md`. Nije hitno — danas je tačno — ali je mina sa odloženim
dejstvom.

---

## 9. Izvori i koliko im verujem

| Izvor | Šta daje | Koliko verujem | Zašto |
|---|---|---|---|
| **Naš GSC, 90 dana** | prikazi, klikovi, pozicija po upitu | **najviše** | to je naš stvarni promet, ne procena |
| — ali: | uzorak **39 klikova, 63 sesije** | **oprez** | ispod 100 klikova opisuje **stanje**, ne trend. Razlika od 2 klika je šum. |
| **Naš GA4** | pregledi po strani | visoko | pokazao da 6 od ~1.990 `/rime-za/` strana ima ijedan pregled |
| **Naš kod** (`gen_pages.py`, `index.html`) | šta stvarno piše u naslovima | **potpuno** | jedini način da se dokaže uzrok za `recnik rima` 204:0 |
| **Pretraga veba 31.07.** | **ko** rangira i **kojim rečima** piše | visoko za pejzaž | pokazala hrvatsku prevlast na pojmovima zanata |
| — ali: | **ne daje obim pretrage** | **nikako** | zato u ovom izveštaju **nema nijednog broja obima** |
| `sr.azrhymes.com` | — | — | **403 Forbidden** 31.07.; podaci iz naslova u rezultatima i iz `COMPETITIVE-ANALYSIS.md` (25.07.) |
| `igrarecima.com` | — | — | **veza odbijena** 31.07.; struktura URL-ova iz rezultata pretrage |
| `rimovanje.com/generatori` | naslov i jezik | srednje | potvrđeno: ijekavica, jedan naslov na celom sajtu |

**Na čemu počiva svaka „procena vrednosti" u odeljku 7** — pošto nemamo alat za obim:

1. **Koliko sajtova se tuče za frazu i kakvi su.** Deset sajtova sa gotovim čestitkama
   znači veliku potražnju i tešku borbu. Jedan školski blog iz 2017. znači malu potražnju
   i laku borbu.
2. **Da li fraza ima kalendar.** „8. mart" i „Nova godina" imaju datum — potražnja
   postoji, samo je stisnuta u dve nedelje.
3. **Da li je fraza u školskom programu.** „Vrste rima", „podela reči na slogove",
   „asonanca" traže se od septembra do juna, u talasima oko kontrolnih.
4. **Da li je naša publika.** „Tekstopisac" ima mali obim, a **veliku vrednost**, jer je
   to čitalac broj 2 i on ostaje na sajtu.
5. **Šta o srodnoj frazi kaže naš GSC.** Ako `rimovanje` ima 428 prikaza, onda i njegove
   varijante imaju sličan red veličine — to je jedino sidro u stvarnim brojevima koje imamo.

**Šta bi ovaj izveštaj učinilo mnogo tačnijim:** puna lista svih 82 upita iz GSC-a (ovde
je bilo dostupno prvih 10) i GA4 događaj o rečima koje ljudi kucaju **u sam alat**. To
drugo je najvredniji podatak koji uopšte možemo da dobijemo — pokazuje nameru pre nego
što se pretvori u pretragu. Oboje ume agent `analitika`.
