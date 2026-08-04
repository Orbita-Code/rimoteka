# Vraćene reči 04.08.2026. — izveštaj

> Vlasničina naredba: vratiti 3.964 reči obrisanе 04.08. (spisak
> `AUDIT/MATICA-fali/07-obrisane-bez-objasnjenja.md`), ali svaku pre toga proveriti
> u Rečniku Matice srpske (2011); šta se ne potvrdi ili ne može se definisati —
> na spisak za odluku. Radna evidencija i odluke: `scripts/vrati-04-08/`
> (`analiza.py`, `glosa.py`, `odluke-01…12.py`, `primeni.py`, `primena.json`).

## Zbiru

| Korpa | Reči | Šta znači |
|---|---|---|
| **A — vraćene, izvedeno objašnjenje** | 150 | „Oblik prideva/imenice/glagola… „lema“ (…)“ — lema ima objašnjenje (postojeće ili sveže napisano za glavu familije) |
| **B — vraćene, pisano objašnjenje** | 3480 | kratko objašnjenje svojim rečima, provereno na glosi u Matici; leme familija |
| **C — NE vraćene, vlasnica odlučuje** | 330 | nisu u Matici (ni fuzzy), ili značenje nejasno/sporno, ili vulgarno |
| već vraćene ranije (main agent, unapred odobrene) | 4 | znanstven, znanstveno, znanstvenik, znanstvenost — bile na spisku obrisanih; objašnjenja odobrena |
| **ukupno na spisku** | **3.964** | 150 A + 3480 B + 330 C + 4 već vraćene |

Dodatno, van spiska obrisanih (unapred odobreno, uneo main agent): **znanstvena**,
**zakupno**, **zakupnom** — sva tri su u `reci.txt` sa odobrenim objašnjenjima.
Provera cele familije: svih 15 reči `znanstven*`/`zakupn*` koje postoje u `reci.txt`
imaju objašnjenje (ništa nije trebalo dodavati).

**Pravilo „nijedna reč bez objašnjenja" važi i posle upisa:** provereno — 0 reči u
`reci.txt` bez objašnjenja u `definicije.json`.

### Primeri iz korpe A (izvedena objašnjenja)

| Reč | Objašnjenje |
|---|---|
| `abrazivna` | Oblik prideva „abrazivan“ (koji je zahvaćen abrazijom (abrazivno tlo)). |
| `božićima` | Oblik reči „Božić“ (hrišćanski praznik rođenja Isusa Hrista). |
| `albanče` | Oblik reči „Albanac“ (stanovnik Albanije; pripadnik albanskog naroda). |
| `belegi` | Oblik reči „beleg“ (poseban znak na telu po kome se neko ili nešto raspoznaje (mladež, pečat, pramen kose)). |
| `poliglotu` | Oblik imenice „poliglot“ (onaj koji govori više jezika (grč.)). |
| `sljedbeništvo` | Oblik imenice „sledbeništvo“ (svojstvo, stanje onoga koji je sledbenik nekoga, nečega; postupak sledbenika). |
| `tajniji` | Oblik prideva „tajan“ (koji predstavlja tajnu, nepoznat, nedokučiv (tajno prostranstvo)). |

### Primeri iz korpe B (pisana objašnjenja, proverena u Matici)

| Reč | Objašnjenje |
|---|---|
| `ablativ` | Gramatički padež koji označava odvajanje ili poreklo (naročito u latinskom jeziku). |
| `abraziv` | Materija velike tvrdoće koja služi kao sredstvo za brušenje. |
| `adekvatnost` | Osobina onoga što je adekvatno. |
| `afektivnost` | Afektivno, emotivno stanje. |
| `tajan` | Koji predstavlja tajnu, nepoznat, nedokučiv (tajno prostranstvo); koji se čuva kao tajnu, skriva od javnosti, koji tajno, krišom deluje (tajan sastanak, veza, organizacija); i tajanstven, zagonetan (tajna noć). |
| `baždar` | Ist. službenik koji kontroliše mere i tegove, kontrolor mera i tegova; i onaj koji naplaćuje baždarinu. |
| `činjeničnost` | Svojstvo onoga što je činjenično, činjenična zasnovanost. |
| `svetosavlje` | Kult svetog Save; i oblik, vid pravoslavnog hrišćanstva zasnovan na učenju svetog Save, čija su osnovna načela izneta u „Žičkoj povelji". |

## Korpa C — kompletan spisak za vlasnicu (330 reči)

| Reč | U Matici? | U srLex-u? (frekvencija) | Zašto je sporna |
|---|---|---|---|
| `alaša` | da (token) | da | glosa fragmentarna („uređaj, mašina za oštrenje" — isečak iz tuđe odrednice); značenje nejasno |
| `apta` | da (token) | da (0.000002) | sumnjiv oblik; Matica na tom mestu ima botaničku glosu koja je OCR-om pomerena — nije potvrđeno |
| `aranđelovcem` | ne | da | Matica ne vodi „Aranđelovac" (grad u Šumadiji); oblik nije potvrđen rečnikom |
| `aranđelovcu` | ne | da | Matica ne vodi „Aranđelovac" (grad u Šumadiji); oblik nije potvrđen rečnikom |
| `aranđelovče` | ne | da | Matica ne vodi „Aranđelovac" (grad u Šumadiji); oblik nije potvrđen rečnikom |
| `arze` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `babinji` | da (token) | da | glosa se odnosi na biljne nazive („babinje/babine"), primer odsečen — značenje nesigurno |
| `baši` | da (token) | da | glosa fragmentarna („jedan drugić"); značenje nejasno |
| `bena` | da (token) | da (0.000962) | glosa fragmentarna (deo tuđe odrednice); značenje nejasno |
| `beni` | da (token) | da (0.000208) | glosa fragmentarna („beni artikli" — verovatno deo tuđe odrednice); značenje nejasno |
| `biljarica` | da (token) | da (0.000011) | glosa upućuje na „biljar", ali naš rečnik vodi „biljar" kao igru kuglama; Matica osnovnu reč nema čitljivo — nesigurno |
| `bistrico` | samo lema | da | nejasna dodela: vokativ imenice ili mesta; Matica vodi „bistrica" (bistra tečnost) — nesigurno |
| `bljuzga` | ne | da (0.000024) | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena |
| `bljuzgama` | ne | da | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena [glava: bljuzga] |
| `bljuzge` | ne | da (0.000012) | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena [glava: bljuzga] |
| `bljuzgi` | ne | da (0.000016) | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena [glava: bljuzga] |
| `bljuzgo` | ne | da | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena [glava: bljuzga] |
| `bljuzgom` | ne | da | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena [glava: bljuzga] |
| `bljuzgu` | ne | da (0.000013) | ni „bljuzga" ni oblici nisu u Matici kao tokeni; familija nepotvrđena [glava: bljuzga] |
| `brence` | da (token) | da | glosa isprekidana OCR-om („zvečak, klašno u zvoncu?, zvonče") — značenje nesigurno |
| `budiši` | da (token) | da (0.000004) | glagolski oblik bez samostalne odrednice; u Matici samo unutar glosa |
| `bula` | da (token) | da (0.000480) | glosa fragmentarna (isečak iz tuđe odrednice); značenje nejasno |
| `bulica` | da (token) | da (0.000002) | umanjenica od „bula" čije značenje nije potvrđeno — nesigurno |
| `burica` | da (token) | da (0.000002) | umanjenica od „bur(a)"; osnovna reč nejasna — nesigurno |
| `bušina` | da (token) | da | botanička glosa nepregledna od OCR-a; sinonimija nejasna |
| `cir` | da (token) | da (0.000052) | glosa fragmentarna („cir, ~ služba"); značenje nejasno |
| `citi` | da (token) | da | glagolski oblik bez samostalne odrednice (deo izraza); značenje nejasno |
| `com` | da (token) | da | glosa fragmentarna (isečak iz odrednice „čvor"); oblik nejasan, verovatno strana reč |
| `Cveta` | da (token) | da (0.000303) | oblik ženskog imena Cveta; Matica ga ne vodi kao ime (samo kao oblik reči „cvet") — vlasnica odlučuje |
| `Cvetama` | ne | ne | oblik imena Cveta; Matica ga ne vodi kao ime — vlasnica odlučuje |
| `Cvete` | ne | da (0.000054) | oblik imena Cveta; Matica ga ne vodi kao ime — vlasnica odlučuje |
| `Cveto` | fuzzy (цвешо) | ne | oblik imena (Cveta/Cveto); Matica ga ne vodi kao ime — vlasnica odlučuje |
| `cveto` | fuzzy (цвешо) | da | verovatno vokativ muškog imena Cveto; Matica ne vodi — vlasnica odlučuje |
| `Cvetom` | da (token) | ne | oblik imena Cveta; Matica ga ne vodi kao ime — vlasnica odlučuje |
| `Cvetu` | da (token) | da (0.000020) | oblik imena Cveta; Matica ga ne vodi kao ime — vlasnica odlučuje |
| `dente` | da (token) | da | glosa fragmentarna („dent, ~ uspeh"); značenje nejasno |
| `deši` | da (token) | da | glosa fragmentarna (isečak iz tuđe odrednice); značenje nejasno |
| `dica` | da (token) | da (0.000011) | glosa fragmentarna (isečak iz odrednice „krupan"); značenje nejasno |
| `dici` | da (token) | da | glosa fragmentarna (isečak iz odrednice „roditi"); značenje nejasno |
| `dili` | da (token) | da (0.000002) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `dilom` | da (token) | da (0.000002) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `dite` | da (token) | da (0.000042) | glosa fragmentarna (isečak); značenje nejasno |
| `diti` | da (token) | da (0.000004) | glosa fragmentarna (deo izraza); značenje nejasno |
| `dotakati` | da (token) | da | glagol; glosa OCR-nečitka, parnački oblik nejasan — nesigurno |
| `draščić` | da (token) | da (0.000002) | glosa pomešana (umanjenica + muškatno drvo); značenje nesigurno |
| `dražica` | da (token) | da (0.000011) | umanjenica; osnovna reč OCR-nečitka („drfla"?) — nesigurno |
| `drkan` | da (token) | da | vulgarno (vulg. masturbirati); rečnik takve reči ne vodi |
| `drkati` | da (token) | da (0.000139) | vulgarno (vulg. masturbirati); rečnik takve reči ne vodi |
| `dumnica` | da (token) | da (0.000004) | umanjenica i nežni oblik od „dumna"; osnovna reč nejasna — nesigurno |
| `eurska` | da (token) | da | verovatno OCR-pokvarena „evrika" (uzvik radosti pri otkriću); oblik „eurska" nije srpska reč |
| `Filipin` | ne | da (0.000016) | u Matici samo „Filipini"; oblik „Filipin" nije potvrđen (verovatno isečak pri uvoženju) |
| `fićure` | da (token) | da | glosa fragmentarna (deo glosa o stilskim figurama); oblik nejasan |
| `fukati` | da (token) | da | vulgarno (vulg. polno opštiti); rečnik takve reči ne vodi |
| `gaka` | da (token) | da (0.000029) | glosa OCR-nečitka (zoološki naziv); značenje nesigurno |
| `gasta` | da (token) | da (0.000002) | glosa fragmentarna; značenje nejasno |
| `govnar` | da (token) | da (0.000036) | pogrdna reč na blok-listi generatora; rečnik takve reči ne vodi |
| `grafizam` | da (token) | da (0.000034) | glosa odsečena („način slikanja koji se primenjuje u…") — nepotpuna |
| `guz` | da (token) | da (0.000198) | vulgarno (na blok-listi generatora); rečnik takve reči ne vodi |
| `hanja` | da (token) | da (0.000020) | glosa fragmentarna (deo glosa o dresuri konja); značenje nejasno |
| `haši` | da (token) | da | glosa fragmentarna (deo glosa o jahanju); značenje nejasno |
| `hovana` | da (token) | da (0.000004) | glosa fragmentarna; značenje nejasno |
| `hruskavac` | da (token) | da | glosa samo uput na „hrskavac" koji nije u našem rečniku; značenje nesigurno |
| `iredentizam` | da (token) | da (0.000058) | glosa odsečena u OCR-u („nacionalni pokret u nekom ze-…") — nepotpuna |
| `izviranju` | da (token) | da (0.000005) | dativ gl. imenice „izviranje"; glosa nije uhvaćena — nesigurno |
| `iže` | da (token) | da | glosa fragmentarna (deo odrednice „prestiž"); značenje nejasno |
| `karska` | da (token) | da (0.000010) | glosa pogrešno uhvaćena (tuđa odrednica „bijenale"); značenje nejasno |
| `karskih` | da (token) | da (0.000007) | glosa pogrešno uhvaćena (tuđa odrednica); značenje nejasno |
| `kavaši` | da (token) | da | glagolski oblik; u Matici samo unutar glosa — značenje nejasno |
| `kice` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `klopcem` | da (token) | da | instrumental oblika „klopac"; glosa nejasna iz isečka |
| `kodili` | da (token) | da | glosa fragmentarna (isečak iz odrednice „puzavac"); značenje nejasno |
| `kolutićavac` | da (token) | da | zoološka glosa OCR-nečitka — nesigurno |
| `kona` | da (token) | da (0.000375) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `kone` | da (token) | da | u Matici samo unutar tuđih glosa; značenje nejasno |
| `konom` | da (token) | da (0.000031) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `kontrirati` | da (token) | da (0.000056) | glosa odsečena u OCR-u — nepotpuna |
| `konšaki` | da (token) | da | glosa fragmentarna (isečak iz odrednice „kidati"); značenje nejasno |
| `koromač` | da (token) | da (0.000007) | botanička glosa OCR-nečitka; čitljivo samo „višegodišnja biljka" — previše tanko |
| `kovrčica` | da (token) | da | umanjenica; osnovna reč OCR-nejasna („kovrča"?) — nesigurno |
| `kozičav` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `kozlac` | da (token) | da (0.000022) | botanička glosa OCR-nečitka (rod nečitljiv) — nesigurno |
| `koške` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `kragulj` | da (token) | da (0.000103) | glosa samo uput na „kraluj" — osnovna reč nejasna |
| `krc` | da (token) | da (0.000052) | glosa OCR-nečitka; nesigurno (moguće onomatopeja) |
| `krivanja` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `krivoverac` | da (token) | da | glosa odsečena u OCR-u („pristalica, sledbenik…") — nepotpuna |
| `kriši` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `križarski` | da (token) | da (0.000043) | glosa odsečena/nepotpuna u OCR-u (samo uput) — nesigurno |
| `kupnja` | da (token) | da (0.000140) | glosa samo uput na „kubovina" — osnovna reč nejasna |
| `kuruz` | da (token) | da (0.000005) | glosa fragmentarna; značenje nejasno |
| `kuruza` | da (token) | da (0.000058) | glosa fragmentarna (deo odrednice „berba"); značenje nejasno |
| `kurvetina` | da (token) | da (0.000082) | vulgarno (familija „kurva", na blok-listi generatora); rečnik takve reči ne vodi |
| `kurvica` | da (token) | da (0.000119) | vulgarno (familija „kurva"); rečnik takve reči ne vodi |
| `kurvinski` | da (token) | da (0.000053) | vulgarno (familija „kurva"); rečnik takve reči ne vodi |
| `kurčiti` | da (token) | da (0.000016) | vulgarno (razg. vulg. po Matici); rečnik takve reči ne vodi |
| `kućiši` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `laca` | da (token) | da | token iz predgovora rečnika; nije odrednica — nepotvrđeno |
| `lamanjem` | da (token) | da | glosa fragmentarna (deo odrednice „lomljenje"); značenje nejasno |
| `lanik` | da (token) | da (0.000002) | botanička glosa OCR-nečitka (rod nečitljiv) — nesigurno |
| `lača` | da (token) | da (0.000004) | glosa fragmentarna; značenje nejasno |
| `lači` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `lekša` | da (token) | da | glosa fragmentarna (deo odrednice „duh"); značenje nejasno |
| `lesnih` | da (token) | da (0.000075) | glosa fragmentarna (deo odrednice „duh"); značenje nejasno |
| `lesnik` | da (token) | da (0.000007) | glosa fragmentarna; značenje nejasno |
| `lesnika` | da (token) | da (0.000002) | glosa fragmentarna; značenje nejasno |
| `ličinama` | da (token) | da | glosa fragmentarna; osnovna reč nejasna |
| `ličinom` | da (token) | da | glosa fragmentarna; osnovna reč nejasna |
| `longituda` | da (token) | da (0.000054) | glosa odsečena u OCR-u (astronomski termin) — nepotpuna |
| `lovaši` | da (token) | da | glosa fragmentarna (deo odrednice „loš"); značenje nejasno |
| `made` | da (token) | da (0.000031) | glosa fragmentarna; značenje nejasno |
| `madi` | da (token) | da (0.000051) | glosa fragmentarna; značenje nejasno |
| `makovski` | da (token) | da (0.000002) | glosa OCR-nečitka; značenje nejasno |
| `Malezi` | ne | da (0.000002) | u Matici samo „Malezija"; oblik „Malezi" nije potvrđen (verovatno isečak pri uvoženju) |
| `manca` | da (token) | da (0.000011) | glosa fragmentarna; značenje nejasno |
| `matematicima` | ne | da (0.000002) | u Matici samo „matematika/matematičar"; oblik nije potvrđen |
| `matematik` | ne | da (0.000005) | u Matici samo „matematika/matematičar"; oblik „matematik" nije potvrđen (verovatno pokvaren uvoz) |
| `matematiče` | ne | da | u Matici samo „matematika/matematičar"; oblik nije potvrđen |
| `mau` | da (token) | da | glosa fragmentarna (deo odrednice „mijau"); značenje nejasno |
| `menjaka` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `meš` | da (token) | da (0.000036) | glosa fragmentarna (deo odrednice „baviti se"); značenje nejasno |
| `meši` | da (token) | da (0.000047) | glosa fragmentarna (deo odrednice „meta"); značenje nejasno |
| `mešima` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `meške` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `mikrotalasan` | ne | da | Matica vodi samo imenicu „mikrotalas"; pridevska familija nije potvrđena kao token — vlasnica odlučuje |
| `mikrotalasnim` | ne | da (0.000106) | oblik prideva „mikrotalasan"; u Matici samo imenica „mikrotalas" — vlasnica odlučuje |
| `mikrotalasnima` | ne | da | oblik prideva „mikrotalasan"; u Matici samo imenica „mikrotalas" — vlasnica odlučuje |
| `mikrotalasnog` | ne | da (0.000106) | oblik prideva „mikrotalasan"; u Matici samo imenica „mikrotalas" — vlasnica odlučuje |
| `mikrotalasnoga` | ne | da | oblik prideva „mikrotalasan"; u Matici samo imenica „mikrotalas" — vlasnica odlučuje |
| `mikrotalasnome` | ne | da | oblik prideva „mikrotalasan"; u Matici samo imenica „mikrotalas" — vlasnica odlučuje |
| `mikrotalasnomu` | ne | da | oblik prideva „mikrotalasan"; u Matici samo imenica „mikrotalas" — vlasnica odlučuje |
| `mirnica` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `mički` | da (token) | da | glosa fragmentarna; osnovna reč nejasna |
| `moškom` | da (token) | da | glosa fragmentarna (deo odrednice „tresti"); značenje nejasno |
| `mudo` | da (token) | da (0.000097) | gruba, razgovorna reč za mušku polnu žlezdu; sajt ima dečji režim — vlasnica odlučuje |
| `muskardina` | da (token) | da | glosa samo uput na „krečavica" — osnovna reč nije u našem rečniku, značenje nesigurno |
| `nadžupnik` | ne | da | nije u Matici (ni fuzzy); značenje nesigurno (nad- + župnik?) |
| `nati` | da (token) | da (0.000023) | bez odluke (sigurnosna mreža) — proveriti |
| `nenaglašeno` | da (token) | da (0.000007) | glosa pogrešno uhvaćena (tuđa odrednica); značenje nejasno |
| `neru` | da (token) | da (0.000072) | glosa fragmentarna; značenje nejasno |
| `neši` | da (token) | da (0.000007) | glosa fragmentarna; značenje nejasno |
| `nice` | da (token) | da (0.000503) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `nici` | da (token) | da (0.000764) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `nicu` | da (token) | da (0.000117) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `nou` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `nuo` | da (token) | da (0.000047) | glagolski oblik; u Matici samo unutar glosa — značenje nejasno |
| `nuši` | da (token) | da (0.000024) | glosa fragmentarna (deo odrednice „promaći"); značenje nejasno |
| `oksidaciono` | da (token) | da (0.000028) | oblik prideva (oksidaciono sredstvo); samostalna odrednica nije potvrđena — nesigurno |
| `ošići` | da (token) | da | glosa fragmentarna (deo odrednice „svratiti"); značenje nejasno |
| `patkova` | da (token) | da (0.000004) | oblik može biti i od „patak" i od prideva „patkov"; dodela nesigurna |
| `pav` | da (token) | da (0.000016) | glosa fragmentarna; značenje nejasno |
| `pavati` | da (token) | da | glosa fragmentarna; značenje nesigurno |
| `pedološkom` | da (token) | da (0.000004) | glosa fragmentarna (deo tuđe odrednice); značenje nejasno |
| `periši` | da (token) | da (0.000009) | glosa fragmentarna; značenje nejasno |
| `peš` | da (token) | da (0.000095) | glosa samo uput (OCR-nečitljiv); značenje nejasno |
| `peševima` | da (token) | da (0.000004) | glosa samo uput (OCR-nečitljiv); značenje nejasno |
| `pina` | da (token) | da (0.000669) | glosa fragmentarna (deo odrednice „vetrić"); značenje nejasno |
| `popizditi` | da (token) | da (0.000011) | vulgarno (razg. vulg. po Matici); rečnik takve reči ne vodi |
| `posranac` | da (token) | da | gruba reč (srati-familija); rečnik takve reči ne vodi |
| `posrati` | da (token) | da (0.000005) | vulgarno (vulg. izvršiti veliku nuždu); rečnik takve reči ne vodi |
| `pova` | da (token) | da (0.000009) | glosa fragmentarna; značenje nejasno |
| `požarstvo` | da (token) | da (0.000011) | glosa OCR-nejasna (vojnička služba?) — nesigurno |
| `preponašica` | da (token) | da (0.000007) | ženski oblik od „preponaš"; osnovna reč nejasna |
| `priređivanje` | da (token) | da (0.000479) | pogođen kolofon rečnika, ne prava odrednica; glosa neuhvaćena — nesigurno |
| `pričepiti` | da (token) | da | glosa OCR-nečitka — nesigurno |
| `prištav` | da (token) | da | glosa OCR-nečitka; osnova („prištev") nejasna |
| `prištičav` | da (token) | da | glosa OCR-nečitka; osnova („prištev") nejasna |
| `prohteti` | da (token) | da | glosa odsečena; nesigurno (bezlični glagol, verovatno „zaželeti se") |
| `Prokuplja` | ne | da (0.000095) | oblik grada Prokuplje; Matica ne vodi toponim — vlasnica odlučuje (u rečniku „Prokuplje": grad u Toplici) |
| `Prokupljama` | ne | ne | oblik grada Prokuplje; Matica ne vodi toponim — vlasnica odlučuje |
| `Prokuplji` | ne | ne | oblik grada Prokuplje; Matica ne vodi toponim — vlasnica odlučuje |
| `Prokupljom` | ne | ne | oblik grada Prokuplje; Matica ne vodi toponim — vlasnica odlučuje |
| `Prokuplju` | ne | ne | oblik grada Prokuplje; Matica ne vodi toponim — vlasnica odlučuje |
| `prokurvati` | da (token) | da (0.000002) | vulgarno (kurva-familija); rečnik takve reči ne vodi |
| `pupaš` | da (token) | da (0.000002) | glagolski oblik; glosa samo uput na nejasnu reč („puditi"?) — nesigurno |
| `puriši` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `ratina` | da (token) | da (0.000004) | glosa nejasna (osnova „rit" višeznačna) — nesigurno |
| `razmazivanje` | da (token) | da (0.000123) | glosa fragmentarna; značenje nejasno |
| `ražina` | da (token) | da | uvećanica; osnovna reč („raž"?) nejasna — nesigurno |
| `ree` | da (token) | da (0.000031) | glosa OCR-nečitka; značenje nejasno |
| `renje` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `renjima` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `reta` | da (token) | da (0.000017) | glosa fragmentarna; osnovna reč nejasna |
| `reša` | da (token) | da (0.000014) | moguće vezanost uz „reš" (hrskavo pečen), ali oblik nije jasan — vlasnica odlučuje |
| `rešu` | da (token) | da (0.000002) | moguće vezanost uz „reš" (hrskavo pečen), ali oblik nije jasan — vlasnica odlučuje |
| `rice` | da (token) | da (0.000196) | glosa fragmentarna; značenje nejasno |
| `ritina` | da (token) | da (0.000005) | glosa nejasna (osnova „rit" višeznačna) — nesigurno |
| `rumenjak` | da (token) | da (0.000002) | botanička glosa OCR-nečitka (latinica nečitljiva) — nesigurno |
| `runka` | da (token) | da | botanička glosa OCR-nečitka — nesigurno |
| `sadan` | da (token) | da (0.000114) | glosa fragmentarna; značenje nejasno |
| `selina` | da (token) | da (0.000091) | glosa pogrešno uhvaćena (tuđa odrednica); značenje nejasno |
| `seline` | da (token) | da (0.000009) | glosa pogrešno uhvaćena (tuđa odrednica); značenje nejasno |
| `Skopja` | ne | da (0.000146) | makedonski oblik; standardno „Skoplje" — Matica toponim ne vodi, vlasnica odlučuje |
| `Skopje` | ne | da (0.000312) | makedonski oblik; standardno „Skoplje" — Matica toponim ne vodi, vlasnica odlučuje |
| `Skopjem` | ne | ne | makedonski oblik; standardno „Skoplje" — Matica toponim ne vodi, vlasnica odlučuje |
| `Skopjima` | ne | ne | makedonski oblik; standardno „Skoplje" — Matica toponim ne vodi, vlasnica odlučuje |
| `Skopju` | ne | da (0.000211) | makedonski oblik; standardno „Skoplje" — Matica toponim ne vodi, vlasnica odlučuje |
| `Skoplja` | ne | da (0.003642) | oblik grada Skoplja; Matica ne vodi toponim (u rečniku „Skoplje": glavni grad Severne Makedonije) — vlasnica odlučuje |
| `Skopljem` | ne | ne | oblik grada Skoplja; Matica ne vodi toponim — vlasnica odlučuje |
| `Skopljima` | ne | ne | oblik grada Skoplja; Matica ne vodi toponim — vlasnica odlučuje |
| `Skoplju` | ne | da (0.006806) | oblik grada Skoplja; Matica ne vodi toponim — vlasnica odlučuje |
| `slanutak` | da (token) | da (0.000013) | glosa samo uput (OCR-nečitljiv) — nesigurno |
| `sranje` | da (token) | da (0.001994) | vulgarno (na blok-listi generatora); rečnik takve reči ne vodi |
| `stališe` | da (token) | da | glosa nejasna iz konteksta; značenje nesigurno |
| `stališi` | da (token) | da | glosa nejasna iz konteksta; značenje nesigurno |
| `stipi` | da (token) | da (0.000024) | glosa fragmentarna; značenje nejasno |
| `stošom` | da (token) | da | glosa fragmentarna (deo odrednice „puritanizam"); značenje nejasno |
| `sud` | da (token) | da (0.123492) | standardna reč (sud, sudnica), ali odrednica u OCR-u nije locirana/čitljiva — vlasnica odlučuje |
| `suda` | da (token) | da (0.097478) | standardna reč (gen. od „sud"); odrednica u OCR-u nije locirana — vlasnica odlučuje |
| `sugradica` | da (token) | da (0.000016) | glosa OCR-nečitka — nesigurno |
| `taca` | da (token) | da (0.000055) | glosa fragmentarna; značenje nejasno |
| `tariši` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `taši` | da (token) | da (0.000054) | glosa fragmentarna; značenje nejasno |
| `ter` | da (token) | da (0.000125) | glosa fragmentarna (deo odrednice „raščistiti"); značenje nejasno |
| `tiri` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `tirić` | da (token) | da (0.000009) | glosa fragmentarna; značenje nejasno |
| `titi` | da (token) | da (0.000054) | glosa fragmentarna (deo odrednice „dok"); značenje nejasno |
| `todama` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `tonja` | da (token) | da (0.000041) | glosa OCR-nečitka (botanička) — nesigurno |
| `tosti` | da (token) | da (0.000004) | glosa fragmentarna; značenje nejasno |
| `tova` | da (token) | da (0.000691) | glosa fragmentarna; osnovna reč nejasna |
| `tovom` | da (token) | da (0.000123) | glosa fragmentarna; osnovna reč nejasna |
| `trak` | da (token) | da (0.000146) | glosa fragmentarna; značenje nejasno |
| `trama` | da (token) | da (0.000002) | glosa samo uput na „vetromer" — značenje nesigurno |
| `tubast` | da (token) | da | glosa OCR-nečitka — nesigurno |
| `turirali` | da (token) | da | glosa fragmentarna (deo odrednice „potom"); značenje nejasno |
| `tučar` | da (token) | da | glosa OCR-nečitka (životinjske vrste nečitljive) — nesigurno |
| `uke` | da (token) | da (0.000045) | glosa fragmentarna; značenje nejasno |
| `uku` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `ura` | da (token) | da (0.001260) | glosa fragmentarna; značenje nejasno |
| `utom` | da (token) | da | glosa pogrešno uhvaćena; značenje nejasno |
| `ušak` | da (token) | da (0.000006) | glosa pogrešno uhvaćena (deo odrednice „megdan"); značenje nejasno |
| `vac` | da (token) | da (0.001466) | glosa fragmentarna; značenje nejasno |
| `vana` | da (token) | da (0.000388) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `vane` | da (token) | da (0.000166) | u Matici samo unutar tuđih glosa; značenje nejasno |
| `vavu` | da (token) | da (0.000002) | glosa fragmentarna (deo odrednice „vaditi"); značenje nejasno |
| `vača` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `vače` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `veda` | da (token) | da (0.000126) | Matica vodi „veda" samo unutar glosa o veri; hinduistički smisao nije potvrđen u ovom OCR-u — vlasnica odlučuje |
| `Vener` | ne | da (0.000040) | oblik planete Venere (u rečniku ima objašnjenje); Matica ga kao oblik ne vodi eksplicitno — vlasnica odlučuje |
| `Venerem` | ne | ne | oblik planete Venere; Matica ga kao oblik ne vodi eksplicitno — vlasnica odlučuje |
| `Venerima` | ne | ne | oblik planete Venere; Matica ga kao oblik ne vodi eksplicitno — vlasnica odlučuje |
| `vešnik` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `vilima` | da (token) | da (0.000033) | glosa fragmentarna (deo odrednice „duel"); značenje nejasno |
| `vodonosnih` | da (token) | da (0.000027) | oblik prideva (vodonosni slojevi); glosa neuhvaćena iz OCR-a — nesigurno |
| `vori` | da (token) | da (0.000054) | glosa fragmentarna (deo odrednice „tribina"); značenje nejasno |
| `voš` | da (token) | da (0.000005) | glosa fragmentarna (deo odrednice „živeti"); značenje nejasno |
| `voša` | da (token) | da (0.000052) | glosa fragmentarna; značenje nejasno |
| `vratan` | da (token) | da (0.000002) | glosa fragmentarna; značenje nejasno |
| `vulja` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `zak` | da (token) | da (0.000381) | glosa fragmentarna; značenje nejasno |
| `zana` | da (token) | da | glosa fragmentarna (deo odrednice „zaneti"); značenje nejasno |
| `zapišati` | da (token) | da (0.000004) | vulgarno (vulg. pomokriti); rečnik takve reči ne vodi |
| `zareve` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `zdeni` | da (token) | da (0.000002) | glosa fragmentarna (deo odrednice „gvozden"); značenje nejasno |
| `zdravcat` | da (token) | da (0.000002) | glosa nejasna (intenzivirajući oblik od „zdrav"?) — nesigurno |
| `Zelanda` | ne | da (0.002337) | deo višečlanog imena „Novi Zeland"; samostalno nepostojeće — vlasnica odlučuje |
| `Zelande` | ne | ne | deo višečlanog imena „Novi Zeland"; samostalno nepostojeće — vlasnica odlučuje |
| `Zelandi` | ne | da (0.000002) | deo višečlanog imena „Novi Zeland"; samostalno nepostojeće — vlasnica odlučuje |
| `Zelandima` | ne | ne | deo višečlanog imena „Novi Zeland"; samostalno nepostojeće — vlasnica odlučuje |
| `Zelandom` | ne | da (0.000150) | deo višečlanog imena „Novi Zeland"; samostalno nepostojeće — vlasnica odlučuje |
| `Zelandu` | da (token) | da (0.002164) | deo višečlanog imena „Novi Zeland"; samostalno nepostojeće — vlasnica odlučuje |
| `zika` | da (token) | da (0.000141) | glosa pogrešno uhvaćena (deo odrednice „azbuka"); značenje nejasno |
| `zike` | da (token) | da (0.000007) | glosa fragmentarna; značenje nejasno |
| `zilu` | da (token) | da | glosa fragmentarna (deo odrednice „kad"); značenje nejasno |
| `ziti` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `znika` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `ćama` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `ćući` | da (token) | da | glosa fragmentarna (deo odrednice „obići"); značenje nejasno |
| `čangrizavac` | da (token) | da | glosa kružna (osnovni glagol „čangrizati" bez tumačenja ovde) — nesigurno |
| `čangrizavost` | da (token) | da (0.000004) | familija „čangrizav" — osnova nejasna — nesigurno |
| `čani` | da (token) | da (0.000014) | glosa fragmentarna; značenje nejasno |
| `čaporast` | da (token) | da | glosa kružna/OCR-nejasna (osnova „čaporak" nejasna) — nesigurno |
| `čati` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `čelju` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `čere` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `čeri` | da (token) | da (0.000188) | glosa fragmentarna (deo odrednice „večer"); značenje nejasno |
| `čeru` | da (token) | da (0.000002) | bez odluke (sigurnosna mreža) — proveriti |
| `čin` | da (token) | da (0.026272) | bez odluke (sigurnosna mreža) — proveriti |
| `čić` | da (token) | da (0.000038) | značenje nejasno (idiom „živeti kao čić"); vlasnica odlučuje |
| `čići` | da (token) | da | značenje nejasno (idiom „živeti kao čić"); vlasnica odlučuje |
| `čiši` | da (token) | da | gen. oblika „čiš"; dodela glosa nesigurna |
| `čunjić` | da (token) | da (0.000002) | nije u Matici (ni fuzzy) — nepotvrđeno |
| `čući` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `đen` | da (token) | da (0.000002) | glosa fragmentarna; značenje nejasno |
| `đene` | da (token) | da (0.000002) | glosa fragmentarna (deo odrednice „godina"); značenje nejasno |
| `đeni` | da (token) | da (0.000008) | glosa fragmentarna (deo odrednice „vilica"); značenje nejasno |
| `đeno` | da (token) | da (0.000050) | glosa fragmentarna (deo odrednice „daljina"); značenje nejasno |
| `đenom` | da (token) | da | glosa fragmentarna (deo odrednice „godina"); značenje nejasno |
| `đenu` | da (token) | da | glosa fragmentarna (deo odrednice „godina"); značenje nejasno |
| `đima` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `đogin` | da (token) | da (0.000002) | nežni oblik; osnovna reč („đotaš"?) nejasna — nesigurno |
| `šaini` | da (token) | da (0.000004) | glosa fragmentarna; značenje nejasno |
| `šainu` | da (token) | da (0.000004) | glosa fragmentarna; značenje nejasno |
| `šanja` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šanje` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šanjom` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šanju` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šati` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šaške` | da (token) | da | bez odluke (sigurnosna mreža) — proveriti |
| `šela` | da (token) | da (0.000060) | glosa fragmentarna (deo odrednice „hotel"); značenje nejasno |
| `šelešu` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šelj` | da (token) | da (0.000002) | glosa fragmentarna; značenje nejasno |
| `šelja` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šelji` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šelo` | da (token) | da | glosa fragmentarna (deo odrednice „valjak"); značenje nejasno |
| `šelu` | da (token) | da (0.000008) | glosa fragmentarna; značenje nejasno |
| `šen` | da (token) | da (0.000210) | glosa fragmentarna; značenje nejasno |
| `šena` | da (token) | da (0.000045) | glosa fragmentarna; značenje nejasno |
| `šeni` | da (token) | da (0.000002) | glosa fragmentarna; značenje nejasno |
| `šeputić` | da (token) | da | umanjenica; osnovna reč („šeput") nejasna — nesigurno |
| `šer` | da (token) | da (0.000458) | glosa fragmentarna (deo odrednice „uopštiti"); značenje nejasno |
| `šera` | da (token) | da (0.000027) | glosa fragmentarna; značenje nejasno |
| `šereš` | da (token) | da (0.000016) | glosa fragmentarna (deo odrednice „doznaka"); značenje nejasno |
| `šereša` | da (token) | da (0.000004) | glosa fragmentarna; značenje nejasno |
| `šeri` | da (token) | da (0.000146) | verovatno „šeri" (vino) — glosa neuhvaćena; vlasnica odlučuje |
| `ševiti` | da (token) | da (0.000023) | gruba, žargonska reč (seksualni odnos); rečnik takve ne vodi |
| `šeška` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `šikom` | da (token) | da | glosa nejasna — nesigurno |
| `škova` | da (token) | da | glosa fragmentarna (deo odrednice „čist"); značenje nejasno |
| `škripina` | da (token) | da | uvećanica; osnovna reč („škrip"?) nejasna — nesigurno |
| `šore` | da (token) | da (0.000009) | glosa fragmentarna (deo odrednice „mehaničar"); značenje nejasno |
| `šupak` | da (token) | da (0.000373) | vulgarno (vulg. po Matici); rečnik takve reči ne vodi |
| `šući` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `švara` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `ženja` | da (token) | da (0.000083) | glosa fragmentarna; značenje nejasno |
| `žicar` | da (token) | da (0.000005) | glosa neuhvaćena (samo zaglavlje strane u OCR-u) — nesigurno |
| `žine` | da (token) | da | glosa fragmentarna (deo odrednice „vaga"); značenje nejasno |
| `žini` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `žinom` | da (token) | da | glosa fragmentarna; značenje nejasno |
| `žinu` | da (token) | da | glosa fragmentarna; značenje nejasno |

## Neobičnosti i napomene

- **OCR-fuzzy pogoci pri vraćenju:** `abrazivni` (Matica: „абразибни", в→б), `belegi`
  („белети"), `najtajniji` („најшајнији", т→ш) — u sva tri slučaja familija je
  potvrđena (abrazivan / beleg / tajan), a fuzzy pogodak je samo na nivou oblika.
- **„predživot" i familija „zatamnenje" (8 oblika)** nisu nađeni kao tokeni zbog
  OCR dijakritika, ali su odrednice locirane direktno u normalizovanim redovima
  (glosa pročitana, objašnjenje iz nje).
- **„mikrotalasan" + 6 oblika** poslati u C: Matica vodi samo imenicu „mikrotalas",
  pridevska familija nije potvrđena kao token.
- **Uvozni artefakti u C:** `Filipin`, `Malezi` (odsečena imena država), familija
  `Zelanda` (delovi višečlanog imena „Novi Zeland"), `matematik`/`matematicima`/
  `matematiče` (verovatno pokvaren uvoz), `eurska` (OCR-pokvarena „evrika"),
  `laca` (token iz predgovora rečnika), `priređivanje` (kolofon rečnika).
- **Vulgarne reči** (`drkati`, `fukati`, `sranje`, `šupak`, `kurvetina`, `popizditi`,
  `posrati`, `prokurvati`…) nisu vraćene: rečnik takve reči uopšte ne vodi
  (npr. „picka" i „govno" nikad nisu bile u `reci.txt`).
- **Toponimi u C:** familije `Skoplje`/`Skopje` (9), `Prokuplje` (5), `Aranđelovac` (3),
  `Venera` (3) — Matica ih ne vodi kao toponime/oblike; oblici su legitimni i
  imena/leme imaju objašnjenja u našem rečniku, pa ih je lako odobriti.
- **„sud" i „suda"** su u C iako je reč očito standardna: odrednica „суд" nije
  čitljivo locirana u OCR-u Matice, pa glosa nije mogla da se proveri.
- **Hrvatski naglasci** među vraćenima (Matica ih vodi): npr. `izniman`, `sustav`,
  `mirovinski`, `sudelovati` — vraćeni su jer ih Matica navodi kao odrednice.
- **Frekvencije:** `frekvencija.json` NIJE diran. `rank` u `build/gen_pages.py`
  (linija 676) se gradi od samog `reci.txt` (`rank = {w: i for i, w in enumerate(words)}`),
  a frekvencija se čita sa `freq.get(w, 0)` (linija 760) — reč bez frekvencije ne
  ruši ni ne poremeti generator; samo se ređa pri dnu. Zato nula-dopune nije bilo.

