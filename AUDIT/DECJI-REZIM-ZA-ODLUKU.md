# Dečji režim — lista za odluku vlasnice

> Pripremljeno 29.07.2026. **Claude ništa ne briše i ne dodaje sam** (`TODO.md`, tačka 1).
> Ti prolaziš kroz odeljke i kažeš da/ne. Tek posle toga se dira kod.
>
> Merено nad `public/reci.txt` + `reci_jekavica.txt` (278.083 reči) i listama
> `BLOCKED` (47 unosa) i `KIDS_BLOCKED` (137 unosa) iz `public/app.js:93–110`.

---

## Šta je nađeno — u tri rečenice

1. **Lista blokira reči koje ne treba da blokira.** Na sajtu za poeziju se **uvek**
   filtrira reč **„pisao"** — i to nije jedini takav slučaj.
2. **Lista propušta reči koje treba da blokira** — kroz padeže. „krevetu" → *dupetu*,
   i to i u dečjem režimu.
3. **Dve trećine liste ne radi ništa** — 62 od 184 unosa su reči kojih uopšte nema u rečniku.

---

# ODELJAK 1 — HITNO: reči koje se sada pogrešno filtriraju

> Ovo su jedini unosi iz `BLOCKED` koji **zaista postoje u rečniku**, dakle jedini koji
> stvarno nešto rade. Od deset njih, **sedam su obične reči.**
> `BLOCKED` važi **uvek**, i kad je dečji režim isključen.

**Provereno uživo na produkciji:**

| Tražiš rimu za | Očekuješ | Stvarno |
|---|---|---|
| „disao" | **pisao** | ❌ filtrirano |
| „smejao" | **pisao** | ❌ filtrirano |
| „zdrava" | **krvava** | ❌ filtrirano |
| „stolar" | **smetlar** | ❌ filtrirano |
| „bura" / „gura" | **kura** | ❌ filtrirano |

| # | Reč | Šta zapravo znači | Predlog |
|---|---|---|---|
| 1 | **`pisao`** | prošlo vreme od *pisati* — „on je **pisao** pesmu" | ⬜ **UKLONITI** |
| 2 | **`pisa`** | oblik od *pisati* | ⬜ **UKLONITI** |
| 3 | **`krvavi`** | krvav — sasvim obična reč, česta u poeziji | ⬜ **UKLONITI** |
| 4 | **`krvava`** | isto | ⬜ **UKLONITI** |
| 5 | **`krvavo`** | isto | ⬜ **UKLONITI** |
| 6 | **`smetlar`** | čovek koji odnosi smeće — **zanimanje** | ⬜ **UKLONITI** |
| 7 | **`kura`** | lečenje, „kura mršavljenja" | ⬜ **UKLONITI** |
| 8 | `guzi` | oblik glagola *guziti* | ⬜ zadržati / ukloniti |
| 9 | `dupe` | vulgarno | ⬜ **ZADRŽATI** |
| 10 | `dupeta` | vulgarno | ⬜ **ZADRŽATI** |

### Dokaz iz NAŠEG rečnika (`definicije.json`)

| Reč | Naše sopstveno objašnjenje |
|---|---|
| `pisa` | *„**Piza — grad u Italiji** (Krivi toranj u Pizi); oblik glagola pisati."* |
| `pisao` | *„Oblik reči pisati (beležiti slova, sastavljati tekst)."* |
| `kura` | *„**Lekoviti postupak ili tretman** koji traje neko vreme (kura mršavljenja)."* |
| `smetlar` | *„Onaj koji odnosi smeće; đubretar."* — **zanimanje** |
| `krvavi` | *„Oblik prideva krvav, muški rod ili množina (krvavi tragovi)."* |
| `dupe` | *„Zadnjica, stražnjica (kolokvijalno)."* — ovo s pravom ostaje |
| `guzi` | *„Oblik reči guza (zadnjica; grubo/dečje)."* — granično |

### Zašto se ovo desilo — filter je pogodio TAČNO POGREŠNU reč

Vulgarni glagol je *pišati* — **sa kvačicom**. Lista je pisana bez kvačica, pa je umesto
*pišati* uhvatila *pisati*:

| Reč | Značenje | Stanje |
|---|---|---|
| `pisao` | *pisati* — beležiti slova | 🚫 **blokirana** |
| `pišao` | *pišati* — mokriti | ⚠️ **NIJE blokirana** |
| `pisa` | Piza / oblik od *pisati* | 🚫 **blokirana** |
| `piša` | mokrenje | ⚠️ **NIJE blokirana** |

**Sve četiri postoje u rečniku.** Blokirane su nevine, a prolaze vulgarne — potpuna inverzija.
Isto i sa `kura`: vulgarna reč bi bila *kurac*, a **nje uopšte nema u rečniku**, dok je
`kura` (lečenje) ostala blokirana bez razloga.

> **Pažnja pri popravci:** naš rečnik za `piša` daje **oba** značenja — *„Oblik glagola
> pisati (razgovorno); dečje: mokrenje."* Dakle i pravo blokiranje traži pažnju, jer je
> ta reč dvosmislena. Predlog: blokirati `pišao`, `pišaju`, `pišala`, `pišaš`, `pišati`,
> a `piša` ostaviti ili blokirati samo u dečjem režimu — tvoja odluka.

Isto važi i za `krvav` — verovatno je mišljeno „nasilno", a to je obična reč.

> **Nedoslednost koju vredi videti:** „ljubav" i dalje daje rimu **krvav**, jer je
> blokirano samo *krvavi/krvava/krvavo*. Dakle pesnik dobije „krvav" ali ne i „krvava".

---

# ODELJAK 2 — mrtvi unosi (nemaju nikakvog dejstva)

**62 od 184 unosa su reči kojih nema u rečniku** — filtriraju prazno.

| Lista | Mrtvih | Živih |
|---|---|---|
| `BLOCKED` | **37 od 47** | 10 |
| `KIDS_BLOCKED` | **25 od 137** | 112 |

Primeri mrtvih: `govno`, `sranje`, `picka`, `kurac`, `jebem`, `seronja`, `kurvetina`…
Te reči **nikad nisu bile u rečniku**, pa ih nije ni trebalo blokirati.

**Dobra vest:** rečnik je u osnovi čist od teških psovki. Problem nije ono što je unutra,
nego ono što je **oko** blokiranih reči (padeži) i ono što je **pogrešno** blokirano.

⬜ **Predlog: očistiti mrtve unose** — ne menja ponašanje, samo čini listu čitljivom.

---

# ODELJAK 3 — curenje kroz padeže (pravi problem)

Liste blokiraju **tačne oblike**, a srpski ima sedam padeža u dva broja.
**Izmereno: 1.148 neblokiranih oblika oko blokiranih reči.**

**Reprodukovano uživo, u UKLJUČENOM dečjem režimu:**

| Traži se rima za | Dobija se | Mesto |
|---|---|---|
| krevetu | **dupetu** | 48. od 180 |
| detetom | **dupetom** | 38. od 180 |
| srcence | **dupence** | 19. od 38 |
| protestu | **incestu** | **2. od 20** |

### Osnove koje su BEZBEDNE za blokiranje
Provereno da ne hvataju nijednu nevinu reč:

| Osnova | Hvata | Broj |
|---|---|---|
| `anus` | anusa, anuse, anusić, anusom, anusu | 6 |
| `penis` | penisa, penise, penisi… | 7 |
| `vagin` | vagina, vaginalna… | 16 |
| `klitoris` · `testis` · `skrotum` | svi oblici | 10 |
| `masturb` | masturbacija, masturbirati… | 13 |
| `pornograf` | pornografija, pornografski… | 15 |
| `prostitu` | prostitucija, prostitutka… | 19 |
| `bordel` | bordela, bordelu… | 6 |
| `incest` | incesta, incestu… | 6 |
| `pedofil` | pedofilija, pedofilu… | 10 |
| `abortu` | abortusa, abortusu… | 7 |
| `erot` | erotika, erotičan… | 30 |
| `sperm` | sperma, spermatozoid… | 13 |
| `dupe` | dupetu, dupetom, dupence… | 7 |

⬜ **Predlog: preći na blokiranje po ovim osnovama** umesto po tačnim oblicima.

### ⚠️ Osnove koje NE SMEJU da se koriste — hvataju nevine reči

Ovo je najvažniji deo. Da je neko blokirao „po osnovi" bez provere, ispalo bi ovo:

| Osnova | Htelo se blokirati | A pokupilo bi i |
|---|---|---|
| **`silov`** | silovanje | **silovit, silovita, silovitost** — „silovita reka", lepa pesnička reč |
| **`seks`** | seks | **sekstet, sekstant** — muzički sastav i pomorski instrument |
| **`kond`** | kondom | **kondenzacija, kondenzator, kondak** |
| **`pisa`** | pišati | **pisac, pisati, pisaljka, pisala** ← ovo se već desilo |
| **`kura`** | kurac | **kuran, kurator, kurativno** |
| **`pice`** | picka | **picerija** |
| **`sere`** | serem | **serenada** |
| **`dubr`** | đubre | **Dubrava, Dubravka, Dubravko** |
| **`granat`** | granata | **granat** (dragi kamen) |
| **`krvav`** | krvavo | **krvavica** (kobasica) |
| **`mrš`** | mrš | **mršav, mršavica** |
| **`gad`** | gad | **Gadafi, Gadamer** (imena) |
| **`materin`** | psovka | **materinji jezik** |

> **Pravilo koje iz ovoga sledi:** svaka osnova mora da se **proveri nad rečnikom pre
> uvođenja**, i uz nju ide spisak izuzetaka. Nikad „po analogiji".

---

# ODELJAK 4 — tvoja odluka: pogrde i psovke koje NISU blokirane

Postoje u rečniku, prolaze i u dečjem režimu. **Nisu vulgarne u smislu psovke, ali jesu
pogrde.** Za dečje pesmice je pitanje ukusa, ne pravopisa.

| Grupa | Primeri | Koliko oblika | Odluka |
|---|---|---|---|
| Pogrde za pamet | **kreten, idiot, debil, glupak, budala, mamlaz** | ~190 | ⬜ blokirati / ostaviti |
| Pogrde za žene | **drolja, kučka, fukara, bludnica** | ~53 | ⬜ blokirati / ostaviti |
| Pogrde uopšte | **gad, smrad, magarčina** | ~89 | ⬜ blokirati / ostaviti |

> **Moje mišljenje:** prve dve grupe blokirati u dečjem režimu, treću ostaviti —
> *gad* i *smrad* se javljaju u narodnim pesmama i basnama, a *magarčina* je više
> šaljivo nego uvredljivo. Ali ovo je tvoj poziv.
>
> **Pažnja:** i ovde osnove nisu bezbedne — `glup` hvata i *glupost* (normalno),
> `mrš` hvata *mršav*, `gad` hvata *Gadafi*. Ako kažeš da, spremiću proverenu listu
> oblika, ne osnova.

---

# ODELJAK 5 — tvoja odluka: teške teme (nisu psovke)

`KIDS_BLOCKED` sada blokira i ovo. Nijedna nije vulgarna — sve su obične srpske reči
o teškim temama:

| Grupa | Reči |
|---|---|
| Rat | rat, ratovi, ratni, **ratnik**, ratovanje, granata, snajper, bombardovanje |
| Smrt | mrtav, **mrtvac**, groblje, mrtvačnica, ubistvo, ubica |
| Verske | **đavo**, demon, sotona, **pakao**, prokletstvo, kletva |

**Pitanja za tebe:**

1. **Da li dete koje piše pesmu sme da dobije rimu „ratnik" ili „đavo"?**
   U srpskoj narodnoj poeziji i bajkama su sve te reči obične — *„Marko Kraljeviću"*,
   *„đavo odnese šalu"*, *„mrtva straža"*. Deca ih uče u školi.

2. **„rat" je i vrlo česta rima** (sat, brat, zlat, vrat, jat…). Blokiranjem se gubi
   jedna od najkorisnijih jednosložnih reči.

3. Ako ostanu blokirane — **cure kroz padeže** isto kao i vulgarne
   (*ratnika, ratnice, mrtvaca, đavola, pakleni*…), pa ionako ne rade dosledno.

⬜ **Opcija A:** ostaviti kako jeste (blokirano), ali popraviti curenje
⬜ **Opcija B:** izbaciti teške teme iz dečjeg režima — filtrira se samo vulgarno
⬜ **Opcija C:** srednje — ostaviti nasilje (ubistvo, silovanje, teror), pustiti
   *rat, ratnik, mrtav, groblje, đavo, pakao* jer su deo narodne književnosti

> **Moje mišljenje: opcija C.** Dečji režim treba da štiti od **vulgarnog i
> uznemirujućeg**, ne od srpske književne tradicije. Ali ti si roditelj i ti odlučuješ.

---

# ODELJAK 6 — zasebno: `/rime-za-decu/` obećava više nego što daje

Strana tvrdi da su rezultati **uvek** filtrirani i bezbedni, a **dečji režim je
podrazumevano isključen** — i na toj strani.

⬜ **Opcija A:** uključiti dečji režim automatski na toj strani
⬜ **Opcija B:** promeniti tekst da ne obećava ono što ne radi

> Moje mišljenje: **A** — strana se zove „rime za decu", režim treba da bude uključen.

---

# Šta sledi kad odlučiš

1. Claude sprovodi **samo** ono što si označila.
2. Prelazak sa „tačnih oblika" na **proverene osnove + spisak izuzetaka**.
3. **Provera u `test/predeploy.mjs`:** da „disao" daje **pisao**, da „krevetu" u dečjem
   režimu **ne daje** *dupetu*, i da „brata" ne daje *rata*.
4. Provera se pušta protiv produkcije **dok je tamo stari kod** — mora da padne.

---

## Kratak odgovor ako nemaš vremena za ceo dokument

**Odeljak 1 je jedini hitan** — sedam običnih reči se sada pogrešno filtrira, među njima
**„pisao"** na sajtu za pisanje pesama. To bih popravio odmah, ostalo može da čeka tvoju
odluku.
