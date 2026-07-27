# Gramatika i pravopis srpskog jezika — referenca za rad na Rimoteci

> **Za buduće sesije: OBAVEZNO pročitati pre bilo kakvog dodavanja reči u `reci.txt`
> ili `definicije.json`, i pre pisanja bilo kog koda koji generiše oblike reči.**
>
> Ovaj dokument je nastao 27.07.2026, posle niza grešaka u kojima je automatski
> generator ubacio u predlog rečnika oblike kojih u srpskom nema: `bankomam`,
> `akrobaša`, `njakam`, `prošaptam`, `dreždam`. Svaka od tih grešaka ima svoj
> gramatički uzrok i svoje pravilo, zapisano niže.
>
> **Vlasnica projekta je izvorni govornik i konačni autoritet.** Kad ona ispravi
> neki oblik, ispravka se ovde zapisuje kao pravilo — ne raspravlja se.

---

## 0. Zašto ovo uopšte piše u ovom projektu

Rimoteka nije običan sajt — ona je **rečnik**. Reč koja uđe u `reci.txt` izlazi
korisniku kao rima i ulazi u nečiju pesmu. Zato važi:

> **Pogrešna reč u rečniku je gora od reči koja fali.**
> Reč koja fali je propuštena prilika. Pogrešna reč je greška koju je Rimoteka
> nekome preporučila.

Iz toga slede tri operativna pravila, detaljnije razrađena u poglavlju 9:

1. Ne generisati oblike „po analogiji" ako obrazac nije dokazan.
2. Ne zaključivati vrstu reči iz njenog završetka.
3. Kad nisi siguran — ponudi na pregled, ne upisuj.

---

## 1. Vrste reči

**Promenljive** (menjaju oblik): imenice, zamenice, pridevi, brojevi (delimično), glagoli.
**Nepromenljive**: prilozi, predlozi, veznici, uzvici, rečce (partikule).

Za rečnik je važno: **isti niz slova može biti više vrsta reči.** Primeri iz
ovog projekta:

| Oblik | Može biti | Zamka |
|---|---|---|
| `plesa` | genitiv imenice *ples* | nije oblik glagola *plesati* |
| `plesi` | množina imenice *ples* | nije imperativ |
| `sezam` | imenica (susam) | izgleda kao 1. lice od *sezati* |
| `bankomati` | množina imenice *bankomat* | izgleda kao infinitiv na `-ati` |
| `vati` | oblik imenice *vata* | izgleda kao imperativ |

---

## 2. Imenice — rod, broj, padež

### 2.1 Rod
- **muški**: zid, konj, otac, gost
- **ženski**: žena, noć, stvar, mati
- **srednji**: selo, more, ime, tele

Rod se **ne vidi uvek iz nastavka**: `tata`, `sudija`, `vođa` završavaju na `-a`
ali su muškog roda; `noć`, `stvar`, `ljubav` završavaju na suglasnik ali su ženskog.

### 2.2 Broj
Jednina i množina. (Ostaci dvojine postoje uz brojeve 2–4: *dva zida*, *tri žene*.)

### 2.3 Padeži — sedam
| Padež | Pitanje | Primer (*zid*) |
|---|---|---|
| Nominativ | ko, šta | zid |
| Genitiv | koga, čega | zida |
| Dativ | kome, čemu | zidu |
| Akuzativ | koga, šta | zid |
| Vokativ | (oslovljavanje) | zide |
| Instrumental | s kim, čim | zidom |
| Lokativ | o kome, o čemu | (o) zidu |

### 2.4 Vrste promene (deklinacije)

**Prva vrsta** — muški rod na suglasnik i srednji rod na `-o`/`-e`:

| | jednina | množina |
|---|---|---|
| N | zid | zidovi |
| G | zida | zidova |
| D | zidu | zidovima |
| A | zid | zidove |
| V | zide | zidovi |
| I | zidom | zidovima |
| L | zidu | zidovima |

- Jednosložne i neke dvosložne muške imenice dobijaju **umetak `-ov-`/`-ev-`** u
  množini: *grad → gradovi*, *nož → noževi* (posle „mekog" suglasnika ide `-ev-`).
- Srednji rod: *selo, sela, selu, selo, selo, selom, selu*; množina *sela, sela, selima…*
- Srednji rod sa **proširenjem osnove**: *ime → imena, imenu*; *tele → teleta, teletu*.

**Druga vrsta** — ženski rod na `-a` (i muški na `-a`: *tata, sudija*):

| | jednina | množina |
|---|---|---|
| N | žena | žene |
| G | žene | žena |
| D | ženi | ženama |
| A | ženu | žene |
| V | ženo | žene |
| I | ženom | ženama |
| L | ženi | ženama |

**Treća vrsta** — ženski rod na suglasnik:

*stvar, stvari, stvari, stvar, stvari, stvarju (stvari), stvari*; množina
*stvari, stvari, stvarima, stvari, stvari, stvarima, stvarima*.

### 2.5 Šta se dešava sa glasovima pri promeni

Ovo su najčešći uzroci pogrešno generisanih oblika:

- **Nepostojano A** — samoglasnik iz osnove nestaje: *pas → psa*, *borac → borca*,
  *otac → oca*, *dobar → dobra*.
- **Sibilarizacija** (`k, g, h → c, z, s` pred `-i`): *vojnik → vojnici*,
  *noga → nozi*, *duh → dusi*.
- **Palatalizacija** (`k, g, h → č, ž, š`): vokativ *vojniče*, *bože*, *duše*.
- **Jednačenje po zvučnosti**: *težak → teška* (ž→š pred k).
- **Gubljenje suglasnika**: *radostan → radosna*.

> **Praktično:** oblici imenice se **ne mogu** pouzdano izvesti dodavanjem
> nastavaka na osnovu. Osnova se sama menja.

---

## 3. Pridevi

Menjaju se po **rodu, broju, padežu** i imaju **vid** (određeni / neodređeni)
i **poređenje**.

- **Neodređeni vid** (šta je neko/nešto): *dobar čovek*, *nov auto*
- **Određeni vid** (koji, poznat): *dobri čovek*, *novi auto*
  Razlika se vidi i u genitivu: *dobra čoveka* (neodr.) / *dobrog čoveka* (odr.)

**Poređenje:**
- komparativ: `-iji` (*nov → noviji*), `-ji` (*jak → jači*), `-ši` (*lep → lepši*)
- superlativ: `naj-` + komparativ (*najnoviji*, *najjači*)
- nepravilno: *dobar → bolji → najbolji*; *zao → gori*; *velik → veći*; *mali → manji*

---

## 4. Glagoli — ovo je mesto gde su nastale sve moje greške

### 4.1 Podela oblika

**Lični (finitni)** — imaju lice i broj:
prezent, aorist, imperfekat, perfekat, pluskvamperfekat, futur I, futur II,
imperativ, potencijal.

**Nelični (infinitni)** — nemaju lice:
- **infinitiv**: *pevati*, *nositi*, *peći*
- **glagolski pridev radni**: *pevao, pevala, pevalo, pevali, pevale, pevala*
  (menja se po rodu i broju — od njega se gradi perfekat: *pevao sam*)
- **glagolski pridev trpni**: *pevan, nošen, otvoren* (menja se kao pridev)
- **glagolski prilog sadašnji**: `-ći` — *pevajući*, *noseći*
- **glagolski prilog prošli**: `-vši` — *otpevavši*

### 4.2 Vid (aspekt)
- **nesvršeni**: *pevati, nositi, pisati* — radnja traje
- **svršeni**: *otpevati, doneti, napisati* — radnja je završena
- **dvovidski**: *ručati, telefonirati, videti*

Svršeni glagoli **nemaju pravi prezent** u samostalnoj upotrebi i **nemaju
glagolski prilog sadašnji** (*napisavši* da, *napisujući* ne).

### 4.3 DVE OSNOVE — najvažnije pravilo u celom dokumentu

Svaki glagol ima **dve osnove** i **jedna se ne može izvesti iz druge**:

| Osnova | Kako se dobija | Od nje se grade |
|---|---|---|
| **infinitivna** | infinitiv bez `-ti` / `-ći` | radni pridev, aorist, prilog prošli, (često) trpni pridev |
| **prezentska** | 1. lice množine prezenta bez `-mo` | prezent, imperativ, prilog sadašnji |

Primeri gde se osnove razlikuju:

| Infinitiv | Inf. osnova | Prez. osnova | Prezent |
|---|---|---|---|
| pisati | pisa- | piš- | pišem |
| kazati | kaza- | kaž- | kažem |
| plesati | plesa- | pleš- | plešem |
| šaptati | šapta- | šapć- | šapćem |
| brati | bra- | ber- | berem |
| zvati | zva- | zov- | zovem |
| ići | i- | id- | idem |
| peći | pek- | peč- | pečem |

> **ZATO SE PREZENT NE SME IZVODITI IZ INFINITIVA.**
> Iz *šaptati* se ne dobija *šaptam* nego *šapćem*. Iz *dreždati* se ne dobija
> *dreždam* nego *dreždim*. Iz *njakati* se ne dobija *njakam* nego *njačem*.

### 4.4 Obrasci prezenta prema infinitivu

Isti završetak infinitiva vodi u **više različitih prezenata**:

| Infinitiv | Prezent | Primeri |
|---|---|---|
| `-ati` | `-am` | gledati → gledam, čitati → čitam |
| `-ati` | `-em` (uz palatalizaciju) | pisati → pišem, kazati → kažem, plesati → plešem, šaptati → šapćem |
| `-ati` | `-em` (bez palatalizacije) | brati → berem, zvati → zovem |
| `-ati` | `-jem` | davati → dajem, poznavati → poznajem |
| `-ati` | **`-im`** | držati → držim, bežati → bežim, ležati → ležim, dreždati → dreždim |
| `-eti` | `-im` | videti → vidim, želeti → želim, voleti → volim |
| `-eti` | `-em` | umeti → umem, smeti → smem |
| `-iti` | `-im` | nositi → nosim, raditi → radim — **jedini pouzdano pravilan tip** |
| `-nuti` | `-nem` | viknuti → viknem, banuti → banem |
| `-ovati`, `-evati` | `-ujem` | kupovati → kupujem, putovati → putujem |
| `-ivati` | `-ujem` | kazivati → kazujem, pokazivati → pokazujem |
| `-irati` | `-iram` | telefonirati → telefoniram |
| `-ći` | razno | peći → pečem, moći → mogu, reći → reknem/rečem, ići → idem |
| `-sti`, `-zti` | `-em` | tresti → tresem, plesti → pletem, gristi → grizem |

Gramatike ovo grupišu u **sedam vrsta** (Belićeva podela), ali za praktičan rad
važi jednostavnije: **iz nastavka infinitiva NE MOŽEŠ zaključiti prezent, osim
kod `-iti`, `-nuti`, `-ovati` i `-irati`.**

### 4.5 Nepravilni glagoli
*biti* (jesam / budem / bejah), *hteti* (hoću / ću), *moći* (mogu, možeš),
*ići* (idem, išao), *jesti* (jedem, jeo), *dati* (dam, dao), *znati* (znam, znao).

### 4.6 Prezent — nastavci

| Lice | `-am` tip | `-em` tip | `-im` tip |
|---|---|---|---|
| ja | gled**am** | piš**em** | nos**im** |
| ti | gled**aš** | piš**eš** | nos**iš** |
| on/ona/ono | gled**a** | piš**e** | nos**i** |
| mi | gled**amo** | piš**emo** | nos**imo** |
| vi | gled**ate** | piš**ete** | nos**ite** |
| oni/one/ona | gled**aju** | piš**u** | nos**e** |

**Imperativ** se gradi od **prezentske** osnove: *gledaj / gledajte*,
*piši / pišite*, *nosi / nosite*, *njači / njačite*.

---

## 5. Glasovne promene (glasovne alternacije)

Ovo su „pravila" koja kvare naivno lepljenje nastavaka.

- **Palatalizacija**: `k, g, h → č, ž, š` — *ruka → ručica*, *bog → bože*, *duh → duše*
- **Sibilarizacija**: `k, g, h → c, z, s` pred `-i` — *vojnik → vojnici*, *noga → nozi*
- **Jotovanje** (suglasnik + `j`):
  `t+j → ć`, `d+j → đ`, `s+j → š`, `z+j → ž`, `l+j → lj`, `n+j → nj`,
  `p+j → plj`, `b+j → blj`, `m+j → mlj`, `v+j → vlj`, `k+j → č`, `g+j → ž`, `h+j → š`,
  `st+j → šć`, `zd+j → žđ`
  Primeri: *cvet + je → cveće*, *list + je → lišće*, *grozd + je → grožđe*,
  *čistiti → čišćen → čišćenje*
- **Nepostojano A**: *pas → psa*, *borac → borca*, *dobar → dobra*
- **Prelazak L u O**: *pisao* (a ne *pisal*), *sto* (od *stol*), *beo / bela*
- **Jednačenje suglasnika po zvučnosti**: *težak → teška*, *vrabac → vrapca*
- **Jednačenje po mestu tvorbe**: *stan + beni → stambeni*, *odšetati → otšetati*
- **Gubljenje suglasnika**: *radostan → radosna*, *otac + ski → očinski*

> **Zamka koju sam napravio:** pretpostavio sam da jotovanje uvek radi, pa sam
> od *brstiti* napravio *brštenje*. Ispravno je **`brstenje`**. Jotovanje se
> primenjuje kod *čistiti → čišćenje*, ali ne kod svakog glagola na `-stiti`.
> **Glagolske imenice i trpni pridev se NE SMEJU generisati automatski.**

---

## 6. Slogovi (za brojač slogova na sajtu)

- Broj slogova = broj **samoglasnika** (`a, e, i, o, u`) + **slogotvorno `r`**.
- Slogotvorno `r` je `r` između suglasnika ili na početku reči pred suglasnikom:
  *prst* (1), *vrt* (1), *crn* (1), *rt* (1), *rđa* (2), *krv* (1), *smrt* (1).
- `r` nije slogotvorno kad je uz samoglasnik: *ruka* (2), *more* (2), *rana* (2).
- `j` nikad nije nosilac sloga: *moj* (1), *kraj* (1).

---

## 7. Akcenat (važno za kvalitet rime)

Četiri akcenta: kratkosilazni (ȍ), dugosilazni (ȏ), kratkouzlazni (ò), dugouzlazni (ó),
plus **poslenaglasne dužine**.

Pravila mesta akcenta:
- Silazni akcenti stoje **samo na prvom slogu** (izuzeci: strane reči, složenice).
- Jednosložne reči imaju samo silazni akcenat.
- Poslednji slog **nikad** nije naglašen.

**Za rimu:** prava rima počinje **od poslednjeg naglašenog samoglasnika**. Zato
`rhymeKey` u `app.js` gleda od pretposlednjeg samoglasnika — to je aproksimacija
koja radi za većinu srpskih reči jer akcenat retko pada na poslednji slog.

---

## 8. Pravopis — najvažnije za sadržaj sajta

### 8.1 Ijekavica i ekavica (refleks jata)
- dugo jat → `ije`: *mlijeko, dijete, lijep, snijeg* (ekavski: *mleko, dete, lep, sneg*)
- kratko jat → `je`: *djeca, mjesto, vjera* (ekavski: *deca, mesto, vera*)
- ispred `o`: `-io`: *vidio* (ek. *video*)
- posle `r` + suglasnik ostaje `e`: *vremena*, *bregovi*

> Za Rimoteku: **ijekavica ULAZI u rečnik** (postoji i `reci_jekavica.txt` i
> opcija „uključi ijekavicu"). Hrvatske **lekseme** (npr. *tisuća*, *tjedan*,
> *kolodvor*) ne ulaze — to nije isto što i ijekavica.

### 8.2 `č` / `ć`, `dž` / `đ`
- `č`, `dž` su tvrdi; `ć`, `đ` meki.
- `ć` u nastavcima: `-ić` (*Petrović*), `-ući` (*pevajući*), *noć, moć, kuća*
- `č` u nastavcima: `-čki` (*junački*), `-ač` (*pevač*), `-ič` (*ključić* → izuzetak `ć`)
- `đ` u: *đak, anđeo, međa, rođak*; `dž` u: *džep, narandža, pidžama*

### 8.3 Sastavljeno i rastavljeno pisanje
- **Odrična rečca `ne`** se piše **odvojeno** uz glagole: *ne znam, ne radi, ne mogu*.
  Izuzeci koji se pišu **spojeno**: *nisam, nemam, neću, nemoj, nedostajati*.
- Uz imenice i prideve `ne` je spojeno: *nepravda, nesrećan, neznanje*.
- **Rečca `li`** se piše odvojeno: *da li, je li*.
- **Futur I**: *pevaću* (spojeno kad je infinitiv na `-ti`), ali *peći ću* (odvojeno kod `-ći`).

### 8.4 Veliko slovo
- Lična imena, prezimena, nadimci: *Marko, Petrović, Ćira*
- Geografski nazivi: *Beograd, Dunav, Stara planina* (drugi član malim slovom
  ako nije vlastito ime)
- **Nazivi praznika**: *Nova godina, Božić, Vaskrs*
- **Prisvojni pridevi na `-ov/-ev/-in`** od vlastitih imena: *Markov, Anin*
- Nazivi jezika i naroda: *Srbin* (narod, veliko), *srpski* (jezik, malo)
- Meseci i dani malim slovom: *januar, ponedeljak*

### 8.5 Interpunkcija — najčešće greške
- Zarez ispred *a, ali, već, nego*: *Došao je, ali nije ostao.*
- Zarez se **ne piše** ispred *i, pa, te, ni* kad povezuju istorodne delove.
- Zavisna rečenica ispred glavne se odvaja zarezom: *Kad je došao, svi su ćutali.*
- Navodnici u srpskom: **„…"** (dole-gore), ne "…".
- Crta (—) sa razmacima, crtica (-) bez razmaka: *srpsko-hrvatski*.

### 8.6 Transkripcija stranih imena
Piše se prema izgovoru: *Šekspir, Njujork, Minhen, Bordo*. U latinici je
dozvoljeno i izvorno pisanje uz transkripciju u zagradi.

---

## 9. Operativna pravila za rad na Rimoteci

Ovo je deo koji sprečava ponavljanje mojih grešaka.

### Pravilo 1 — Završetak reči NIJE dokaz vrste reči
`bankomati`, `akrobati`, `aparati` završavaju se na `-ati` ali su **imenice u
množini**. Reč se sme tretirati kao glagol **samo ako rečnik već sadrži njen
nesumnjiv glagolski oblik**: radni pridev (`-ao`, `-io`, `-eo`) ili prvo lice
prezenta (`-im`, `-am`, `-em`, `-ujem`).

Provera je namenjena PROGRAMU, ne čoveku — reč *bankomat* naravno postoji i
svakodnevna je. Pitanje je samo kako kod da razlikuje imenicu od glagola kad
oboje mogu da se završe na `-ati`. Kriterijum: ako postoji jednina (*bankomat*)
a nema nijednog glagolskog oblika (*bankomao*, *bankomam*) — reč je imenica.

**I imenice se moraju menjati** — po rodu, broju i padežu. To što je *bankomati*
imenica ne znači da za nju nema posla, nego da joj trebaju **padeži**
(*bankomata, bankomatu, bankomatom, bankomate, bankomatima*), a ne konjugacija.
Stanje imenica u rečniku izmereno je u poglavlju 9a.

### Pravilo 2 — Prezent se ČITA, ne izvodi
Obrazac prezenta se utvrđuje iz oblika koji **već postoje u rečniku**, i to
**samo iz prvog i drugog lica** (`-am/-aš`, `-em/-eš`, `-im/-iš`). Treće lice
(`-a`, `-e`, `-i`) je nepouzdano jer se poklapa sa imenicama:
*plesa/plesi* je od **ples**, *sezam* je **susam**, *vati* je od **vata**.

Ako pouzdanog oblika nema ili se oblici protivreče — **ne izmišljaj prezent**.
Ponudi samo prošlo vreme (radni pridev), koje je uvek pravilno, i označi glagol
za odluku vlasnice.

### Pravilo 3 — Šta se sme generisati automatski

| Sme se | Ne sme se |
|---|---|
| radni pridev (`-ao/-la/-lo/-li/-le`) | glagolska imenica (`-anje/-enje`) |
| prezent kod `-iti`, `-nuti`, `-ovati`, `-irati` | prezent kod `-ati`, `-eti` bez dokaza |
| imperativ iz **potvrđene** prezentske osnove | trpni pridev (jotovanje varira) |
| padeži imenice **samo** uz proveru osnove | bilo šta kod `-ći` glagola |

### Pravilo 3a — Osnova imenice se ČITA iz potvrđenog padeža, ne iz nominativa

Isti princip kao kod glagola. Nominativ ne otkriva osnovu jer se osnova menja:

- **nepostojano A**: *žižak → žiška* (ne *žižaka*), *borac → borca*, *pas → psa*
- **sibilarizacija** u D/L ženskih: *knjiga → knjizi* (ne *knjigi*), *ruka → ruci*
- **palatalizacija** u vokativu muških: *junak → junače*
- **umetak `-ov-`/`-ev-`** samo kod **jednosložnih** muških: *zid → zidovi*, ali
  *bankomat → bankomati*, *prozor → prozori* (ne *bankomatovi*)
- **`-ev-`** posle mekih suglasnika: *nož → noževi*, *muž → mužem*

Zato: ako u rečniku već postoji genitiv, iz njega se čita prava osnova i tek
onda grade ostali padeži. Ako genitiva nema — ne izmišljati osnovu.

### Pravilo 3b — IZVOR ISTINE JE ZVANIČNA LITERATURA, NE NAŠ REČNIK (obavezno)

> Uvedeno 27.07.2026. na izričit zahtev vlasnice.

**`reci.txt` i `definicije.json` NISU merilo ispravnosti.** Oni su predmet
provere. Sve dosadašnje greške nastale su zato što sam njih uzimao kao dokaz:
u rečniku stoji pogrešan oblik `đubra`, moj kod ga pročitao kao potvrdu i
predložio `đubru`. To je kružno rezonovanje.

**Jedini dozvoljeni izvor su zvanična gramatika i pravopis srpskog jezika** —
literatura koja se koristi u školama i na fakultetima u Republici Srbiji:

- **Pravopis srpskoga jezika**, Matica srpska (važeće izdanje)
- **Normativna gramatika srpskog jezika**, Piper–Klajn, Matica srpska
- **Gramatika srpskog jezika**, Ivan Klajn (Zavod za udžbenike)
- **Rečnik srpskoga jezika**, Matica srpska (jednotomnik)
- Stanojčić–Popović, *Gramatika srpskoga jezika* (srednjoškolski udžbenik)

**ZABRANJENO:** nagađanje, pretpostavljanje, „po analogiji", „verovatno je
ovako", oslanjanje na frekvenciju kao dokaz ispravnosti, i uzimanje postojećeg
unosa u rečniku kao potvrde da je oblik tačan.

**Razlika koju treba držati na umu:**

| Pitanje | Ko odgovara | Šta smem |
|---|---|---|
| Da li je oblik ispravno izveden? *(licu od lice)* | gramatička pravila | mogu da odlučim po pravilima |
| Da li reč uopšte postoji u srpskom? *(steža, bajbok)* | **rečnik Matice srpske** | **ne smem da odlučim** — pitati vlasnicu ili nabaviti rečnik |

Frekvencija u korpusu (`frekvencija.json`) sme da se koristi **samo za
redosled pregleda**, nikada kao dokaz da je reč ispravna ili neispravna.
Retka reč nije pogrešna, a česta nije automatski tačna.

### Pravilo 4 — Svaka nova reč dobija objašnjenje
Nijedna reč ne ulazi u `reci.txt` bez unosa u `definicije.json`. Stil postojećih
objašnjenja: *„Oblik reči brstiti (gristi lišće i mlade grane — o stoci)."*

### Pravilo 5 — `reci.txt` je sortiran
Nove reči se ubacuju na **sortiranu poziciju** (`bisect.insort`), ne dodaju na
kraj. Posle upisa proveriti `reci == sorted(reci)`.

### Pravilo 6 — Vlasnica odlučuje
Kod svake sumnje: napravi listu i pitaj. **Ne upisuj u rečnik da bi „pokrio"
slučaj.** Bolje 100 reči koje fale nego 1 koja ne postoji.

---

## 9a. Izmereno stanje rečnika (27.07.2026)

Mereno na osnovu `definicije.json`, gde 63% unosa kaže „Oblik reči X" — odatle
se dobija veza oblik → osnovna reč, pa se **broje postojeći oblici** umesto da
se grade novi (brojanje ne može da pogreši).

**Glagoli:** od 6.120 potvrđenih glagola, **1.827 ima krnju paradigmu**
(nedostaje im 60% i više oblika). Predlog dopune: 13.827 oblika.

**Imenice:** prepoznato **23.907** imenica (12.946 muških, 6.948 ženskih,
4.013 srednjeg roda). Prosečna pokrivenost paradigme:

| Rod | Prosečno oblika | Puna paradigma |
|---|---|---|
| muški | 4,8 | 9 |
| ženski | 3,9 | 9 |
| srednji | 3,3 | 7 |

**Imenicama u proseku nedostaje oko polovine padeža.** To je veći posao od
glagola.

**Ograničenja ovog merenja — obavezno pročitati pre nego što se brojevi
citiraju:**
- Pokriva samo reči čije objašnjenje ima šablon „Oblik reči X". Reči sa
  opisnim objašnjenjem (35%) nisu obuhvaćene.
- Razvrstavanje nije savršeno: trpni pridevi (*adoptiran*, *adresiran*) mogu
  biti svrstani među imenice.
- Imenice koje postoje samo u množini (*akne*, *Alpe*) nemaju punu paradigmu,
  pa izgledaju krnje iako nisu.

## 9b. Imenice srednjeg roda — greške uhvaćene u izradi predloga (27.07.2026)

Pet grešaka koje je moj kod napravio dok je pravio predlog padeža za srednji
rod. Sve su iste porodice: **pogađanje umesto čitanja.**

1. **Osnova uzeta iz nominativa** → od *ime* ispalo *ima, imu, imom*.
   Ispravno: osnova se čita iz **genitiva** (*imena* → osnova *imen-*).
2. **Homograf pri konstruisanju genitiva** → *tele* se zakačilo za *tela*
   (genitiv od **telo**), *prezime* za *prezima* (od glagola **prezimiti**).
3. **Homograf i u obrnutom redosledu** → kad je proširena osnova tražena prva,
   *more* se zakačilo za *morena* (nanos lednika).
4. **Dativ množine primljen kao genitiv** → uslov „završava se na *a*" hvata i
   nastavak *-ima*, pa je od *morima* ispalo *morimu, morimom*.
5. **Proširena množina** → od *nebo* ispalo *nebima* umesto *nebesima*
   (*nebo → nebesa*, *čudo → čudesa*, *telo → telesa*).

6. **Množina predlagana i imenicama koje je nemaju** → *zdravljima*, *povrćima*,
   *mlekima*, *stanovništvima*, *osobljima*. Apstraktne i zbirne imenice
   srednjeg roda nemaju množinu. Ispravka: množina se predlaže samo ako je
   **već potvrđena** u rečniku.
7. **Predlog nasleđuje kvalitet osnovnog rečnika.** Ako je osnovna reč sumnjiva,
   njeni padeži su takođe sumnjivi. `frekvencija.json` (srLex, 435.000 reči) je
   jedini objektivan pokazatelj: *shvaćanje* 52 naspram *shvatanje* 3.022
   (hrvatska varijanta), *podanstvo* 14 naspram *podaništvo* 74, *podosoje* i
   *osoje* **0 pojava**. Svaki predlog mora biti sortiran po frekvenciji, a reči
   sa nulom izdvojene na proveru. **Oprez:** nula ne znači automatski da reč ne
   postoji — vlastita imena (*Arilje*, *Barajevo*) legitimno nemaju pojava u
   korpusu malih slova.

8. **„Potvrda množine" iz objašnjenja je bila lažna.** Kod srednjeg roda su
   **genitiv jednine i nominativ množine isti oblik** (*selo → sela*,
   *mleko → mleka*). Zato zapis „(množina od mleko)" ne dokazuje da množina
   postoji — to je izbor pisca objašnjenja. Množina se za srednji rod **ne
   predlaže uopšte**; predlažu se samo D/L i I jednine.
   **Šire:** `definicije.json` je pouzdan za „kojoj reči oblik pripada", ali
   **nije** pouzdan za „koji je to padež".
9. **Završetak na `-o`/`-e` ne znači srednji rod.** U predlog su ušli:
   ženske *pluralia tantum* (*finansije, naočare, pantalone, makaze* —
   prepoznaju se po obliku na `-ama`), zbirni brojevi (*petoro, dvoje*) i
   muške pozajmljenice (*portfolio, radio, studio, auto*).

10. **Instrumental srednjeg roda se NE MOŽE odrediti iz oblika reči.**
    *more → **morem***, ali *finale → **finalom***; oba korena se završavaju
    tvrdim suglasnikom. Odatle pogrešni *finalem, polufinalem, đubrem,
    komunalijem*. Instrumental se za srednji rod **ne predlaže**.
11. **Proširena osnova važi samo za imenice na `-e`.** Kod imenica na `-o` je
    proširen oblik **množina**, a ne genitiv jednine: *telo → telesa* (mn),
    genitiv je *tela*; *čudo → čudesa* (mn), genitiv *čuda*; *nebo → nebesa*
    (mn), genitiv *neba*. Bez tog razdvajanja ispadalo je *telesu* i *čudesu*
    umesto *telu* i *čudu*.
12. **Reči na `-ije` su ženski rod u množini** (*komunalije, beneficije,
    relikvije*), ne srednji rod. Test na `-ama` ih ne hvata ako taj oblik nije
    u rečniku, pa se isključuju po završetku.
13. **Format izveštaja mora biti TABELA, ne rečenice.** Vlasnica je odustala od
    pregleda usred grupe B jer je lista bila pisana u rečenicama. U tabeli
    (reč | frekvencija | predlog) greške se vide na prvi pogled — čim je
    napravljena, odmah su uočeni *telesu* i *čudesu*.

**Pravilo koje iz svega sledi:** ni oblik ni objašnjenje sami nisu dovoljni.
Kandidat mora **istovremeno** da ima dozvoljen oblik traženog padeža **i** da
ga objašnjenje u `definicije.json` veže baš za tu reč.

## 10. Dnevnik ispravki od vlasnice

Zapisivati svaku ispravku — to je najpouzdaniji izvor u ovom dokumentu.

| Datum | Ispravka | Pravilo koje iz nje sledi |
|---|---|---|
| 26.07.2026 | `njakam`, `njakaš` **ne postoje**. Glagol *njakati* ima samo `njačem, njačeš, njače, njačemo, njačete, njaču`. | Kod korena na `k/g/h/s/z` prezent ide **samo** palatalizovano. Ne nuditi „oba obrasca za svaki slučaj". |
| 26.07.2026 | Glagolska imenica od *brstiti* je **`brstenje`**, ne *brštenje*. | Jotovanje se ne primenjuje mehanički. Glagolske imenice se ne generišu. |
| 27.07.2026 | *bankomat*, *akrobata*, *aparat* su **imenice** — `bankomam`, `akrobaša`, `aparate` ne postoje. | Završetak `-ati` ne znači infinitiv. Traži glagolsku potvrdu u rečniku. |
| 27.07.2026 | **Ispravka moje tvrdnje:** *aminati* **postoji** — znači „izgovarati reč amin". *aminovati* je nešto drugo — „složiti se s tuđim mišljenjem". *amin* takođe ostaje. | Ne proglašavati reč izmišljenom zato što mi je nepoznata ili što joj je paradigma krnja. Prvo proveriti značenje; dve slične reči mogu biti dva različita glagola. |
| 27.07.2026 | *njaka* **ne postoji** — sklonjeno iz rečnika (zatečen unos). *njači* / *njačite* **ostaju** (imperativ). *obrstenje* **ne postoji**. | Potvrda pravila iz 26.07: glagol *njakati* ima samo palatalizovani prezent. |
| 27.07.2026 | Imenice se menjaju po **rodu, broju i padežu**; glagoli imaju **lične i nelične oblike, vid, rod i osnove**. | Odatle poglavlja 2 i 4 ovog dokumenta, posebno pravilo o **dve osnove**. |

---

## 11. Rešeno i šta ostaje

**Rešeno 27.07.2026:**
- `njaka` — sklonjeno iz rečnika (ne postoji).
- `njači` / `njačite` — ostaju (imperativ od *njakati*).
- `obrstenje` — ne postoji, nije dodato.
- `aminati` — **postoji**, ostaje. Značenja razdvojena u `definicije.json`:
  *aminati* = izgovarati reč amin; *aminovati* = složiti se s tuđim mišljenjem;
  *amin* = reč kojom se završava molitva.

**Ostaje:**
- Sistematska provera rečnika na izmišljene unose. **Oprez:** kriterijum „reč
  stoji sama, bez srodnih oblika" NIJE dokaz da je izmišljena — *aminati* je
  upravo takav slučaj, a postoji. Takva lista ide vlasnici na pregled, ništa se
  ne briše automatski.
- `RECNIK-PREDLOG.md` — 13.827 predloženih oblika čeka pregled po grupama.

## 12. Izvori i dalje čitanje

- Pravopis srpskoga jezika, Matica srpska
- Normativna gramatika srpskog jezika (Piper, Klajn)
- Rečnik srpskoga jezika, Matica srpska
- Ivan Klajn, *Gramatika srpskog jezika*

> **Najpouzdaniji izvor u ovom projektu je ipak vlasnica.** Kad se ovaj dokument
> i njena ispravka razilaze — ona je u pravu, a dokument se ispravlja.

---

*Poslednje ažuriranje: 27. jul 2026.*
