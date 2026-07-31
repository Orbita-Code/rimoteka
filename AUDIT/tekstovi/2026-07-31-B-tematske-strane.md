# Tematske strane i šablon generisanih strana — 31.07.2026

> Sve tvrdnje o kodu proverene u `build/gen_pages.py` i `public/app.js`, sa brojem linije.
> Svaka tvrdnja o rimama proverena tako što je reč potražena u **stvarno generisanoj strani**
> `public/rime-za/<reč>/index.html` — ne po sluhu i ne po sećanju.
> Nijedan fajl u `public/` ni `build/` nije menjan. Ovo je predlog teksta, čeka odobrenje.

---

## Ocena po stranama

| Strana | Ocena /10 | Glavni problem |
|---|---|---|
| **šablon `/rime-za/[reč]/`** (1.993 strane) | **3** | naslov bloka **„Još popularnih rima“** stoji iznad osam reči koje se **ne rimuju** sa traženom rečju — na 1.993 strane; opis u pretrazi 205 znakova (odseca se); nijedan link ka alatima iz teksta |
| `/rime-za-prijatelje/` | **2** | odgovor „Koje rime idu sa *prijatelj*?“ nabraja **6 reči, nijedna nije rima**; jedna je i hrvatski oblik (*željeznički*); persiranje; slomljena rečenica „kada vam je bio uz vas“ |
| `/rime-za-roditelje/` | **2** | „Koje rime idu sa *majka*?“ → *reka, čeka, njega, lepa, neba…* — **0 od 8 je rima**; persiranje („Naglasite“) |
| `/rime-za-novu-godinu/` | **3** | „Koje rime idu sa *godina*?“ → *radost, sreća, ljubav…* — **0 od 8 je rima** |
| `/rime-za-decu-o-prirodi/` | **3** | u Čestim pitanjima tri lažna para: *sunce — mesece*, *zvezda — nebesa*, *kiša — bliza*; **reči „bliza“ nema u rečniku** (0 pogodaka u `reci.txt`) |
| `/rime-za-rodjendanske-pesmice/` | **3** | „Koje reči se najčešće rimuju sa *rođendan*?“ → 10 reči, **nijedna nije rima** |
| `/rime-za-ljubavne-pesme/` | **4** | „Koje rime najčešće idu sa *ljubav*?“ → *srce, duša, tuga…* — **0 od 7 je rima**; „Najčešće reči u ljubavnim pesmama“ je ručno otkucan spisak |
| `/rime-za-svadbu/` | **4** | isti lažni odgovor za *ljubav* (10 reči, nijedna nije rima) — i kanibalizuje ljubavnu stranu |
| `/rime-za-decu/` | **5** | „Evo **popularnih** reči… koje deca **lako pamte**“ — dve tvrdnje bez ijednog podatka (već u `TODO-TEKSTOVI.md`); „preporučujemo“ |
| `/rime-za-decu-o-zivotinjama/` | **5** | ceo odeljak je go spisak reči bez rečenice; ponavlja uvod sa strane o prirodi |
| `/rime-za-tugu-i-secanje/` | **5** | rime su tačne, ali *šuga* i *ruga* na strani o smrti; persiranje („Budite“, „Dozvolite si“ — hrvatski sklop) |
| `/rime-za-rep/` | **6** | tačno i korisno, ali nigde ne piše šta reper stvarno dobija (beležnica, slog po slog); naslov 60 znakova bez ijedne koristi |
| `/rime-za-pesmu/` | **6** | najbolje napisana, ali se čeono tuče sa `/rimovanje-reci/` i sa početnom stranom |

**Zbirno: 49 reči je na šest strana predstavljeno kao rima, a nijedna se ne rimuje sa
traženom rečju.** To je za pesnika — našeg prvog čitaoca — dokaz da alat ne razume posao.
Jedan takav odgovor košta više nego deset dobro napisanih pasusa.

---

## ŠABLON `/rime-za/[reč]/` — stoji na ~2.000 strana (NAJVAŽNIJE)

**Prebrojano:** `public/rime-za/` ima **1.994 foldera**; svaka od te **1.993 strane** deli
iste četiri rečenice (`grep -rl`, po rečenici — 1.993 pogotka za svaku).

| # | SADA PIŠE | TREBA DA PIŠE | Zašto | `gen_pages.py` |
|---|---|---|---|---|
| **1** | **„Još popularnih rima“** — a ispod stoje *srce, duša, sreća, tuga, bol, radost, nada, strast*, iste na svih 1.993 strane | **„Rime za druge reči“** — i ispod, sitnijim slogom: „Ove reči nisu rime za *ljubav* — to su strane sa njihovim rimama.“ | **Netačno na 1.993 strane.** `related_targets(t, popular, …)` vraća **prvih 30 meta-reči** (`popular = targets[:30]`, linija 762), a ne rime za `t`. Reči nose istu klasu `.chip`/`.word` kao prave rime, pa se od njih **ne razlikuju** ni okom ni programski. Zbog toga je pet strana u ovom izveštaju „prošlo“ automatsku proveru rima — reči su bile na strani, ali u ovom bloku. | **879** |
| **2** | „…{N} rime za pisanje pesama, tekstova i repa. Primeri: **neljubav, gubav, ubav, glibav, grbav, labav, alav, aljkav, av, bagav**.“ *(opis u pretrazi; medijana **205** znakova, najduži **279**, u opsegu 150–160 ima **5** od 1.993)* | „Sve rime za „ljubav“: 42 reči, uz svaku broj slogova i objašnjenje šta znači. Na vrhu su rime sa najdužim istim završetkom: neljubav, gubav, ubav, glibav.“ **(154 znaka)** | Google odseca posle ~155 znakova, pa čovek u rezultatu vidi pola rečenice. Uz to je **oglas za sajt** trenutno spisak reči *gubav, av, bagav* — najgori mogući prvi utisak. Nova verzija nudi ono što niko drugi nema: **broj slogova i značenje**. | **893–894** |
| **3** | `<title>`: „Rime za reč „ljubav“: 42 reči koje se rimuju \| Rimoteka“ *(medijana **55** znakova; u opsegu 60–70 ima **103** od 1.993)* | „Rime za reč „ljubav“: 42 reči koje se rimuju \| Rimoteka rečnik rima“ **(67 znakova)** | Naslov je oglas i troši se prostor koji je ionako dat. Fraza **`recnik rima` ima 204 prikaza i 0 klikova** (`AUDIT/analitika/2026-07-30.md`) — a na 1.993 strane te fraze nema nigde. Ovo je jedini potez na šablonu koji stoji na izmerenom podatku. | **892** |
| **4** | „42 rime · 2 sloga · **rangirano po kvalitetu**“ | „42 rime · 2 sloga · **prvo one sa najdužim istim završetkom**“ | „Kvalitet“ ne znači ništa i ne može da se proveri. Kod sortira `-common_suffix(t, w)`, pa `rank[w]` — dakle **duži zajednički završetak**, pa učestalost. | **819, 826, 932** |
| **5** | „Pronađeno **42 reči** koje se rimuju sa „ljubav“. **Iskoristi ih za pisanje pesme, teksta ili repa.** Klikni na reč da otvoriš još rima, ili kopiraj celu listu.“ | „Sve što se rimuje sa **„ljubav“** — 42 reči. Uz svaku piše koliko ima slogova i šta znači, pa odmah vidiš koja ti staje u stih. Klikni na reč i dobiješ njene rime, a dugme ispod kopira ceo spisak.“ | Sadašnji uvod ne kaže **ništa što drugi rimeri nemaju**. Slogovi i značenje su naša jedina prava prednost, a u uvodu ih nema. („Iskoristi ih za pisanje pesme, teksta ili repa“ je prazna rečenica — čovek zna zašto je došao.) | **933** |
| **6** | Naslov grupe: **„Najbolje rime“** | **„Rime sa istim završetkom“** | Ista reč, dva različita značenja na istom sajtu: u alatu „Najbolje rime“ = **isti broj slogova** (`app.js:965`), na generisanoj strani = **duži zajednički završetak** (`gen_pages.py:811`). Zato prva „najbolja rima“ za *ljubav* bude trosložno *neljubav*, a za *tata* — *apostata, atentata, deputata*. Pesnik to vidi za tri sekunde. | **857** |
| **7** | „Rime po broju slogova“ — a ispod su **nekliktabilne** oznake `<span class="syl-badge">` | „Koliko slogova ima koja rima“ | Izgleda kao filter, a nije — filter po slogovima postoji **samo u alatu** (`app.js`, `.syl-filter`). Naslov obećava radnju koju strana ne izvršava. | **870** |
| **8** | Česta pitanja → „Kako da nađem još rima?“ → „**U mini-alatu iznad** upiši bilo koju reč — dobićeš proširenu listu rima, šire (asonantne) rime i filter po broju slogova.“ | „Klikni na bilo koju rimu — otvara se njena strana sa njenim rimama. Za bliske (asonantne) rime i filter po broju slogova upiši reč u polje iznad; otvara se alat sa uključenim obema opcijama.“ | Polje `mini_tool_form` šalje na `/?rec=…`, dakle **na drugu stranu** — „u mini-alatu“ nije tačno. Uz to strana **već ima** grupu „Bliske rime (asonanca)“ (linija 855), pa je tekst šalje po nešto što joj je pod nosom. | **948, 654–661** |
| **9** | Poziv na akciju: **„✍️ Otvori Rimoteku i piši →“** | **„✍️ Otvori beležnicu i piši pesmu →“** | Čovek **jeste** na Rimoteci — dugme mu nudi ono na čemu već stoji. Beležnica je stvarna stvar koju dobija i jedina koju konkurencija nema. (`?rec=` radi — `app.js:2999`.) | **936** |
| **10** | *nema ga* | **Nov blok pre Čestih pitanja:** „**Šta dalje.** Ako ti stih ne staje u ritam, prebroj slogove u [brojanju slogova](/slogovi/). Ako ne znaš koju šemu rime da uzmeš, pogledaj [vrste rima](/vrste-rima/). Za pesmicu detetu uključi [rime za decu](/rime-za-decu/).“ | **Provereno:** u `<main>` strane `/rime-za/ljubav/` ima **0 linkova** ka `/slogovi/`, `/vrste-rima/`, `/rime-za-decu/` ili bilo kom alatu — samo `/`, `/rime-za/`, `/?rec=…` i 8 drugih `/rime-za/`. `faq_sa_linkovima()` (linija 566) **se ne poziva** u ovom šablonu. 1.993 strane, ni jedan opisan unutrašnji link iz teksta. | **929–950** |
| **11** | *nema ga* | **Jedno novo pitanje:** „Da li se plaća?“ → „Ne. Nema prijave, nema reklama, ništa se ne naplaćuje. Otvoriš i radiš.“ | Sumnja koja se rađa na svakom besplatnom alatu, a odgovor košta jedan red — na 1.993 strane. | **943–949** |

### Naslov i opis — šablon

| | Sada | Predlog | Znakova |
|---|---|---|---|
| **Naslov** | `Rime za reč „ljubav“: 42 reči koje se rimuju \| Rimoteka` | `Rime za reč „ljubav“: 42 reči koje se rimuju \| Rimoteka rečnik rima` | sada **55** (medijana svih 1.993) → **67** |
| **Opis** | `Pronađi reči koje se rimuju sa „ljubav“. Rimoteka nudi 42 rime za pisanje pesama, tekstova i repa. Primeri: neljubav, gubav, ubav, glibav, grbav, labav, alav, aljkav, av, bagav.` | `Sve rime za „ljubav“: 42 reči, uz svaku broj slogova i objašnjenje šta znači. Na vrhu su rime sa najdužim istim završetkom: neljubav, gubav, ubav, glibav.` | sada **205** (medijana), najduži **279** → **154** |
| **Opis, kratka reč** | — | `Sve rime za „dan“: 118 reči, uz svaku broj slogova i objašnjenje šta znači. Na vrhu su rime sa najdužim istim završetkom: grdan, bedan, vredan.` | **144** |

> Broj primera u opisu **sa 10 na 4** — tako opis ostaje između 140 i 158 znakova za
> praktično svaku reč, umesto sadašnjeg raspona 123–279.

---

## `/rime-za-decu/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| 1 | „Evo **popularnih reči** koje se lepo rimuju i **koje deca lako pamte**: …“ | „Za početak, evo reči od kojih se najlakše kreće: mama, tata, sunce, kiša, lopta, mačka.“ | Dve tvrdnje bez ijednog podatka. Spisak je ručno otkucan; ništa nije mereno. Stoji i u `TODO-TEKSTOVI.md`. |
| 2 | „Rime **koje deca lako pamte** čine pesmicu zabavnom i pevljivom.“ | „Deca brzo zapamte kratak stih koji se ponavlja. Drži se četiri do šest slogova po redu i ponovi isti završetak dva puta.“ | Ista nedokaziva tvrdnja, drugo mesto. Zamena daje **savet koji se izvršava**, a slogove čovek odmah prebroji kod nas. |
| 3 | „Za najmlađe **preporučujemo** da uključiš i dečji režim…“ | „Za najmlađe uključi i dečji režim — kvačica je ispod polja za unos.“ | Persiranje kroz „preporučujemo“ (mi–vi). Ton je „ti“. |
| 4 | Odeljak „**Popularne reči za dečje pesmice**“: go spisak od 19 reči | Naslov: „**Od koje reči da počneš**“, pa: „Uzmi reč koju dete već ume da kaže — mama, tata, lopta, mačka, sunce, kiša. Klikni je, pa iz spiska izaberi rimu koju dete razume.“ | „Popularne“ = tvrdnja o prometu koju nemamo. Go spisak reči nije rečenica i ne uči ničemu. |
| 5 | „Kako napisati dečju pesmicu?“ → „Koristi kratak stih, ponavljanje i jednostavne reči.“ | „Napiši prvi red, pa mu prebroj slogove. Drugi red neka ima isti broj slogova i rimu na kraju. Kad se dva reda slože, ostala četiri idu sama.“ | Sadašnje je opšte mesto koje piše svaki sajt. Novo je **postupak** i vodi u naš brojač slogova. |
| 6 | *nema* | Nova poslednja rečenica uvoda: „Ništa se ne plaća i ne moraš da se prijavljuješ.“ | Roditelj koji traži pesmicu za priredbu prvo pomisli na reklame i prijavu. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za decu — bezbedne i lepe reči za dečje pesmice \| Rimoteka | **Rime za decu — reči za dečje pesmice, bez ružnih reči \| Rimoteka** | 63 → **64** |
| Opis | Rime za decu: bezbedne, lepe i razumljive reči za dečje pesmice, igre i učenje. Filtrirano od neprikladnih reči — besplatan alat. | **Rime za decu: upiši reč i dobiješ rime za dečju pesmicu, uz svaku broj slogova i šta znači. Dečji režim izbacuje ružne reči, pa pišeš mirno sa detetom.** | 129 → **151** |

---

## `/rime-za-decu-o-zivotinjama/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| 1 | „Deca obožavaju životinje. Ovde ćeš pronaći rime za mačku, psa, pticu, konja, lava i druge životinje — idealno za pesmice i učenje.“ | „Upiši ime životinje — mačka, pas, ptica, konj, pčela — i dobiješ rime za pesmicu, uz svaku broj slogova. Dečji režim je uključen, pa se ružne reči ne pojavljuju.“ | „Deca obožavaju životinje“ je rečenica koja ne radi ništa. Uvodni pasus treba da kaže **šta se radi**, a ne šta deca vole. |
| 2 | „Za najmlađe uključi i **dečji režim**; dugme ispod to radi samo.“ (**ista rečenica i na strani o prirodi** — jedina rečenica ponovljena na dve tematske strane, prebrojano) | Na ovoj strani: „Dugme ispod otvara alat sa uključenim dečjim režimom.“ Na strani o prirodi: „Klikni dugme ispod i alat se otvori sa dečjim režimom — ne moraš ništa da čekiraš.“ | Dve identične rečenice na dve strane koje se i inače preklapaju. Tvrdnja je tačna (`app.js:1066` čita `?decji=1`), samo je treba reći različito. |
| 3 | „**Popularne životinje u dečjim pesmicama**“: go spisak od 12 reči | „**Koje životinje najlakše ulaze u stih**“ → „Kratke reči imaju najviše rima: *pas*, *miš*, *rak*, *lav*. Duže su teže, ali daju lepši ritam: *veverica*, *leptirica*.“ | „Popularne“ je opet tvrdnja o prometu. Nova verzija daje **zanatski savet** koji je tačan i koji vlasnica može da proveri u alatu. |
| 4 | „Koje životinje su najbolje za dečje pesmice?“ → „Mačke, psi, ptice, konji, lavovi i pčele su **klasici**…“ | „Ona koju dete prepoznaje. Počni od kućnog ljubimca ili životinje iz slikovnice — dete peva o onome što zna.“ | „Klasici“ ne znači ništa. Odgovor treba da bude upotrebljiv, ne dekorativan. |
| 5 | *nema* | Dodati u Česta pitanja: „**Šta ako reč nema rime?**“ → „Probaj drugi padež ili množinu — *mačka* i *mačke* nemaju iste rime. Ako i to ne pomogne, uključi ‚šire rime‘ pa ulaze i bliske.“ | Prazan rezultat je najčešći ćorsokak, a nigde nije napisano šta tada. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za decu o životinjama — vesele dečje pesmice \| Rimoteka | **Rime za decu o životinjama — mačka, pas, ptica, konj \| Rimoteka** | 60 → **63** |
| Opis | Rime za decu o životinjama: mačka, pas, ptica, konj, lav i druge. Bezbedne i razumljive reči za dečje pesmice i igre. | **Rime za pesmicu o životinjama: mačka, pas, ptica, konj, pčela. Upiši ime životinje i dobiješ rime, broj slogova i značenje, uz uključen dečji režim.** | 117 → **148** |

---

## `/rime-za-decu-o-prirodi/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | Česta pitanja → „Koje reči iz prirode se najčešće rimuju?“ → „**sunce — mesece, zvezda — nebesa, kiša — bliza**, sneg — beg, cvet — svet, reka — čeka.“ | „**sunce — unce, lonce, klince** · **zvezda — gnezda, žlezda** · **kiša — miša, niša, tiša, viša** · **sneg — beg** · **cvet — svet, savet, krevet** · **reka — čeka**.“ | **Tri od šest parova nisu rime.** Provereno u samim našim stranama: `mesece` **nije** među rimama za *sunce*, `nebesa` **nije** među rimama za *zvezda*. Reč **`bliza` uopšte ne postoji u `reci.txt`** (0 pogodaka) — izmišljena je. Zamene su prepisane iz naših generisanih strana. |
| 2 | „Priroda je najlepša inspiracija za dečje pesmice.“ | „Upiši *sunce*, *kiša*, *sneg* ili *cvet* i dobiješ rime za pesmicu, uz svaku broj slogova.“ | Prvu rečenicu Google prikazuje u rezultatu — a ona ne kaže šta strana radi. |
| 3 | „**Teme iz prirode za decu**“: go spisak od 15 reči | „**Reči iz prirode koje imaju najviše rima**“ → „*cvet*, *sneg*, *reka*, *kiša* i *sunce* — svaka od njih ima svoju stranu sa rimama, klikni pa biraš.“ | Go spisak nije sadržaj; ovako postaje i **pet unutrašnjih linkova** ka `/rime-za/cvet/`, `/rime-za/sneg/`, `/rime-za/reka/`, `/rime-za/kisa/`, `/rime-za/sunce/`. |
| 4 | „Da li mogu koristiti ove pesmice u vrtiću?“ → „…rezultati su dodatno filtrirani **za vrtiće i škole**.“ | „Da. U dečjem režimu izbacuju se i nasilne i seksualne reči, pa spisak možeš da pustiš detetu na ekran.“ | Nema nikakvog filtriranja „za vrtiće i škole“ — postoji jedan dečji režim. Tvrdnja koju kod ne izvršava. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za decu o prirodi — sunce, mesec, kiša, sneg \| Rimoteka | **Rime za decu o prirodi — sunce, kiša, sneg i cvet \| Rimoteka** | 60 → **60** |
| Opis | Rime za decu o prirodi: sunce, mesec, zvezda, oblak, kiša, sneg, cvet i druge reči. Bezbedne pesmice za decu i učitelje. | **Rime za pesmicu o prirodi: sunce, kiša, sneg, cvet, more. Upiši reč i dobiješ rime sa brojem slogova i značenjem, a dečji režim izbacuje ružne reči.** | 120 → **148** |

---

## `/rime-za-ljubavne-pesme/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | Česta pitanja → „Koje rime najčešće idu sa „ljubav“?“ → „Najbolje rime sa ljubav su **srce, duša, tuga, radost, čežnja, strast, nežnost** i mnoge druge emotivne reči.“ | „**Ljubav se teško rimuje** — imaš *neljubav*, *gubav*, *ubav*, *grbav*, *labav*, *alav*. Zato je iskusni pesnici retko stavljaju na kraj stiha: stavi je u sredinu, a stih završi rečju koja ima više rima — *sreća*, *tuga*, *san*.“ | **Nijedna od sedam navedenih reči nije rima za *ljubav*.** Provereno: u spisku rima za *ljubav* ne postoji nijedna. (Pojavljuju se na strani, ali u bloku „Još popularnih rima“ — v. nalaz br. 1 u šablonu.) Nova verzija je **tačna i pokazuje zanat** — tačno ono što pesnika zadržava. |
| 2 | „**Najčešće reči u ljubavnim pesmama**“: go spisak od 15 reči | „**Reči kojima se ljubavne pesme najčešće završavaju**“ → „*srce*, *sreća*, *tuga*, *nada*, *duša*. Svaka ima svoju stranu sa rimama — počni od one koja ti je bliža po smislu.“ | „Najčešće“ je tvrdnja o merenju koje nismo napravili. Prepravljeno tako da tvrdi ono što jeste — **gde se reč nalazi u stihu** — i daje pet unutrašnjih linkova. |
| 3 | „Ljubavna poezija je večita tema. Bilo da pišeš pesmu za voljenu osobu, godišnjicu ili samo za sebe, ovde ćeš pronaći reči koje se rimuju i inspiraciju za svaki stih.“ | „**Rime za ljubavnu pesmu**: upiši reč sa kraja stiha i dobiješ sve što se sa njom rimuje, uz broj slogova i značenje. Ako rima zvuči dobro a ne odgovara po smislu, uzmi sinonim pa traži rimu za njega.“ | „Bilo da… bilo da…“ je zabranjena konstrukcija; „inspiracija“ ne postoji kao dugme. Nova verzija odmah nudi **postupak koji rešava najčešći problem u ljubavnoj pesmi** — rima koja ne znači ono što treba. |
| 4 | „Šema rime za ljubavnu pesmu“ → „Parna rima (AABB) je najjednostavnija **za početnike**.“ | „Parna rima (AABB) pevljiva je i topla. Ukrštena (ABAB) zvuči smirenije, jer se rima čeka jedan red duže. Obe možeš da vidiš označene u beležnici dok pišeš.“ | „Za početnike“ je snishodljivo prema pesniku, koji je naš prvi čitalac. Uz to beležnica **stvarno** označava šemu rime uz stih (šema slovima, pre-deploy test, sekcija 31) — to niko drugi nema, a nigde ne piše. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za ljubavne pesme — reči koje se rimuju za ljubav \| Rimoteka | **Rime za ljubavne pesme — rečnik rima za stih o ljubavi \| Rimoteka** | 65 → **65** |
| Opis | Rime za ljubavne pesme: najlepše reči koje se rimuju sa rečima ljubav, srce, duša i sreća. Ideje i alat za pisanje ljubavne poezije. | **Rime za ljubavnu pesmu: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Kad ti rima ne leži po smislu, uzmeš sinonim pa tražiš ponovo.** | 132 → **152** |

---

## `/rime-za-prijatelje/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | „Koje rime idu sa „prijatelj“?“ → „Neka rime za prijatelj su: **smeh, dnevnik, željeznički, najbolji, srećan, vredan.** **Bolje je koristiti Rimoteku za sve opcije.**“ | „*Prijatelj* se rimuje samo sa rečima na **-telj**: *neprijatelj*, *spisatelj*, *staratelj*, *branitelj*, *davatelj*. Ako ti nijedna ne leži, završi stih rečju *drug*, *druže* ili *sreća* — pa traži rimu za nju.“ | **Nijedna od šest navedenih reči nije rima**, provereno u spisku rima za *prijatelj*. Reč **`željeznički` je hrvatski/ijekavski oblik** (ekavski je *železnički*) i stoji vidljivo na sajtu. Rečenica „Bolje je koristiti Rimoteku za sve opcije“ je priznanje da odgovor ne valja — a stoji objavljena. |
| 2 | „Kako napisati pesmu za prijatelja?“ → „**Pomislite** na zajedničke avanture, smešne trenutke i trenutke **kada vam je bio uz vas**.“ | „Seti se jedne konkretne stvari — noći, putovanja, svađe posle koje ste ostali. Jedan pravi detalj vredi više od deset lepih reči.“ | Persiranje (zabranjeno) i **slomljena rečenica** („kada vam je bio uz vas“). Uz to „trenutke… trenutke“ dvaput u istom redu. |
| 3 | „Čak i nekoliko stihova **mogu** pokazati da ceniš prijateljstvo. **Dodaš** lični detalj — pesma postaje nezaboravna.“ | „Dovoljna su četiri stiha. Dodaj jedan detalj koji zna samo on i pesma više nije opšta.“ | Gramatička greška („nekoliko stihova mogu“ → *može*) i nespojena rečenica. |
| 4 | „Ključne reči za prijatelje“: go spisak od 11 reči | „**Reči koje se lako rimuju u ovakvoj pesmi**“ → „*drug*, *put*, *smeh*, *sreća*, *sećanje*. Klikni bilo koju i dobiješ njene rime sa brojem slogova.“ | Go spisak → rečenica + unutrašnji linkovi. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za prijatelje — pesme i čestitke za najbolje društvo \| Rimoteka | **Rime za prijatelje — pesma i čestitka za prijatelja \| Rimoteka** | 68 → **62** |
| Opis | Rime za prijatelje: reči koje se rimuju za prijateljstvo, vernost, podršku i zajednička sećanja. Napiši pesmu ili čestitku za prijatelja. | **Rime za pesmu prijatelju: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. U beležnici pišeš stih i vidiš rime u boji, baš dok pišeš.** | 137 → **150** |

---

## `/rime-za-roditelje/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | „Koje rime idu sa „majka“?“ → „Neka rime za majka su: **reka, čeka, njega, lepa, neba, svega, greha, snega.**“ | „*Majka*: **bajka, hajka, čajka, šajka, snajka, pomajka, staramajka**. Za *mama* rima ima manje, pa se ta reč lepše sluša u sredini stiha nego na kraju.“ | **0 od 8 navedenih reči nije rima za *majka*** — provereno u spisku rima za *majka*. Zamene su prepisane iz naše strane `/rime-za/majka/`. |
| 2 | „Pesma za oca“ → „**Naglasite** snagu, podršku i sigurnost. Čak i kratka pesma može mnogo značiti.“ | „Očevi retko traže pesmu, pa je utoliko jače kad je dobiju. Piši o jednoj stvari koju te naučio, ne o svim njegovim osobinama.“ | Persiranje („Naglasite“) usred strane pisane sa „ti“. Uz to su „snaga, podrška, sigurnost“ tri prideva u nizu bez sadržaja. |
| 3 | „Za roditelje nikad nije dovoljno reći hvala.“ | „**Rime za pesmu roditeljima**: upiši *majka*, *tata*, *baka* ili *deda* i dobiješ rime, uz svaku broj slogova.“ | Prva rečenica ide u rezultat pretrage; sada je fraza sa čestitke, a treba da kaže šta strana radi. |
| 4 | „Ključne reči za roditelje“: go spisak od 13 reči | „**Od koje reči da počneš**“ → „*majka*, *tata*, *baka*, *deda*, *dom*, *detinjstvo* — svaka ima svoju stranu sa rimama.“ | Go spisak → rečenica + šest unutrašnjih linkova. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za roditelje — pesme za majku, oca i porodicu \| Rimoteka | **Rime za roditelje — pesma za majku, oca, baku i dedu \| Rimoteka** | 61 → **63** |
| Opis | Rime za roditelje: reči koje se rimuju za majku, oca, baku, dedu i celu porodicu. Ideje za pesme, čestitke i poklon poruke. | **Rime za pesmu roditeljima: upiši majka, tata, baka ili deda i dobiješ rime, značenje i broj slogova. Sinonim ti daje bližu reč kad rima ne legne u stih.** | 123 → **152** |

---

## `/rime-za-svadbu/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | „Koje rime idu sa „ljubav“ za svadbu?“ → „**srce, sreća, lepota, nežnost, čežnja, radost, sigurnost, večnost, blizina, jedinstvo.**“ | **Zameniti celo pitanje**: „**Koja reč na kraju stiha ima najviše rima?**“ → „*sreća* (treća, vreća, cveća, seća), *zdravlje* (slavlje, bravlje, mravlje) i *dom*. *Ljubav* ima malo rima — nju stavi u sredinu stiha.“ | **Nijedna od deset reči nije rima za *ljubav*.** Uz to je pitanje **isto kao na strani o ljubavnim pesmama** — dve naše strane odgovaraju na isti upit (kanibalizacija). Ovako svaka strana dobija svoje pitanje, a odgovor je proveren: *sreća → treća, vreća, cveća, seća*; *zdravlje → slavlje, bravlje, kravlje, mravlje*. |
| 2 | „Svadba je jedan od najlepših dana u životu. Bilo da pišeš **čestitku, pesmu ili zdravicu**, ovde ćeš pronaći rime koje će dirnuti mladence.“ | „**Rime za svadbenu zdravicu, čestitku ili pesmu mladencima**: upiši reč sa kraja stiha i dobiješ rime, uz svaku broj slogova. Zdravica se čita naglas, pa ritam ovde znači više nego inače.“ | „Bilo da… bilo da…“ je zabranjena konstrukcija; „najlepši dan u životu“ je fraza sa čestitke. Nova verzija stavlja ključnu frazu na početak i odmah daje **razlog zašto baš naš alat** (slogovi = ritam naglas). |
| 3 | „Ključne reči za svadbu“: go spisak od 13 reči | „**Reči kojima se zdravica najčešće završava**“ → „*sreća*, *zdravlje*, *dom*, *put*, *život*. Klikni bilo koju i dobiješ njene rime.“ | Go spisak → rečenica + pet unutrašnjih linkova. |
| 4 | „Koliko treba da traje svadbena zdravica?“ → „Najbolje je da zdravica traje 1–2 minute.“ | „Minut do dva. To je oko dvanaest stihova — prebroj ih u brojanju slogova pre nego što ustaneš.“ | Odgovor je tačan, ali se završava u prazno. Ovako vodi u naš alat i daje meru koju čovek može da proveri. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za svadbu — čestitke, pesme i zdravice \| Rimoteka | **Rime za svadbu — zdravica, čestitka i pesma mladencima \| Rimoteka** | 54 → **65** |
| Opis | Rime za svadbu: lepe reči za mladence, čestitke, pesme i zdravice. Pronađi rime za ljubav, sreća, prsten, dom i zajednička putovanja. | **Rime za svadbenu zdravicu i čestitku: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Napiši u beležnici, pročitaj naglas, pa skrati.** | 133 → **151** |

---

## `/rime-za-novu-godinu/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | „Koje rime idu sa „godina“?“ → „Neka rime za godina su: **radost, sreća, ljubav, prijatelj, početak, trenutak, čarolija, porodica.**“ | „*Godina*: **jedina, ledina, gradina, dedina, gazdina, jagodina, vojvodina**. Ako ti nijedna ne odgovara, završi stih rečju *dan*, *san* ili *sreća* — one imaju mnogo više rima.“ | **0 od 8 nije rima** — provereno u spisku rima za *godina*. Zamene prepisane sa naše strane `/rime-za/godina/`. |
| 2 | „Nova godina donosi novu nadu. Bilo da pišeš čestitku, pesmicu ili poruku, ovde ćeš pronaći rime za srećan, zdravlje, uspeh, ljubav i **nova početka**.“ | „**Rime za novogodišnju čestitku**: upiši reč sa kraja stiha i dobiješ rime, uz svaku broj slogova. Za pesmicu detetu uključi dečji režim.“ | „Bilo da… bilo da…“; **„nova početka“ je gramatički pogrešno** (treba *nov početak*) i stoji na sajtu. Prva rečenica mora da kaže šta strana radi. |
| 3 | „Kratke novogodišnje poruke“ → „Neka ti Nova bude ispunjena smehom, toplinom i trenucima koji se pamte.“ | „**Kako da poruka ne zvuči kao sve ostale**“ → „Izbaci *sreću, zdravlje i uspeh* — to piše svima. Poželi jednu konkretnu stvar koju ta osoba stvarno čeka.“ | Sadašnji odeljak **daje gotovu frazu koju svi već šalju** — to je suprotno od razloga zbog kog čovek dolazi na sajt sa rimama. |
| 4 | „Ključne reči za Novu godinu“: go spisak od 12 reči | „**Reči koje se lako rimuju u čestitki**“ → „*sreća*, *zdravlje*, *dan*, *san*, *dar*. Klikni reč i dobiješ njene rime sa brojem slogova.“ | Go spisak → rečenica + unutrašnji linkovi. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za Novu godinu — čestitke, pesmice i želje \| Rimoteka | **Rime za Novu godinu — čestitka, pesmica i želje u stihu \| Rimoteka** | 58 → **66** |
| Opis | Rime za Novu godinu: čestitke, pesmice i želje za sreću, zdravlje, ljubav i uspeh. Pronađi reči koje se rimuju i napiši jedinstvenu čestitku. | **Rime za novogodišnju čestitku: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Za pesmicu detetu uključi dečji režim pa piši sa njim.** | 141 → **151** |

---

## `/rime-za-rodjendanske-pesmice/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| **1** | „Koje reči se najčešće rimuju sa rođendan?“ → „**Puno, zdravlje, sreća, dar, radost, slavlje, godina, prijatelj, porodica, ljubav.**“ | „*Rođendan*: **imendan, Ilindan, Savindan, pandan** — a otvara ti se i cela grupa na **-dan**: *bezbedan*, *vredan*, *besplodan*. Zato se rođendanska pesmica češće gradi oko reči *dan*, *dar* ili *slavlje*.“ | **0 od 10 nije rima za *rođendan*.** Zamene prepisane sa naše strane `/rime-za/rodjendan/`. |
| 2 | „Ideje za rođendanske pesmice“ → „srećan rođendan, puno zdravlja, želje ti ispunim, dar ti spremim, prijatelj si dragi, još mnogo godina.“ | „**Kako da počneš**“ → „Napiši prvi stih o osobi, ne o rođendanu: *Ti koji nikad ne kasniš na ručak*. Drugi stih neka se rimuje sa poslednjom rečju. Tako pesmica odmah zvuči lično.“ | Sadašnje su **gotove fraze sa kupovne čestitke** — a uvod strane baš obećava da nećeš pisati kupovnu čestitku. Tekst sam sebi protivreči. |
| 3 | „Pesmica za odrasle“ → „Dodaj humor ili dirljivu notu. **Uzmi u obzir** odnos sa osobom i zajednička sećanja.“ | „Odrasli vole da se pesma malo šali sa njima. Uzmi jednu njegovu naviku i rimuj je — to prolazi bolje od najlepše želje.“ | „Uzmi u obzir“ je administrativni stil. Savet je opšti, a treba da bude izvršiv. |
| 4 | „Da li mogu da iskoristim pesmicu za čestitku?“ → „Naravno. Možeš je prepisati na čestitku, poslati porukom ili **objaviti na društvenim mrežama**.“ | „Naravno. Napiši je u beležnici, tamo ostaje sačuvana na tvom uređaju, pa je prepiši na čestitku ili pošalji porukom.“ | Odgovor koji ne vodi nikuda. Beležnica je stvarna i **stvarno čuva tekst** na uređaju. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za rođendanske pesmice — za odrasle i decu \| Rimoteka | **Rime za rođendanske pesmice — rime za čestitku u stihu \| Rimoteka** | 58 → **65** |
| Opis | Rime za rođendanske pesmice: smešne, slatke i emotivne reči za rođendan. Brzo pronađi rime i napiši jedinstvenu čestitku. | **Rime za rođendansku pesmicu: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Za pesmicu detetu uključi dečji režim, pa pišite skupa.** | 121 → **150** |

---

## `/rime-za-tugu-i-secanje/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| 1 | „Koje rime idu sa „tuga“?“ → „Neka rime za tuga su: **druga, luga, šuga, ruga, kruga** — ali izaberi one koje nose pravo značenje za tvoju pesmu.“ | „*Tuga*: **druga, duga, kruga, pruga, sluga, kuga**. Reč *duga* je najlepša u ovoj grupi jer nosi i drugo značenje. Ako ti nijedna ne odgovara, probaj *bol*, *san* ili *sećanje*.“ | Rime **jesu tačne** (jedini odgovor u ovom izveštaju koji je tačan), ali *šuga* i *ruga* na strani o smrti i pomenu su neukusne. Ostatak rečenice („izaberi one koje nose pravo značenje“) priznaje da spisak nije dobar — bolje ga odmah napraviti dobrim. |
| 2 | „Pesma za preminulog“ → „**Budite** iskreni i jednostavni. Najvažnije je da **prenesete** ljubav i sećanje, a ne savršenu formu.“ | „Ne traži lepe reči — traži tačne. Jedna rečenica o tome kako je pio kafu vredi više od cele strofe o večnosti.“ | Persiranje. Uz to je savet apstraktan, a ovoj strani dolaze ljudi kojima je najteže — njima treba **konkretno**, ne uteha. |
| 3 | „Pesma o rastanku“ → „**Dozvolite si** tugu. Rastanci su deo života, a pesma može pomoći da se osećanja **barem malo razbistre**.“ | „Piši dok je sveže, ne kad se smiriš. Rima ti tada pomogne da rečenicu privedeš kraju kad sam ne možeš.“ | Persiranje, a **„dozvolite si“ je hrvatski sklop** (srpski: *dozvoli sebi*). Stoji objavljeno. |
| 4 | „Ključne reči u teškim trenucima“: go spisak od 13 reči | „**Reči kojima se ovakva pesma najčešće završava**“ → „*tuga*, *bol*, *san*, *tišina*, *sećanje*. Klikni bilo koju i dobiješ njene rime.“ | Go spisak → rečenica + unutrašnji linkovi. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za tugu i sećanje — pesme za teške trenutke \| Rimoteka | **Rime za tugu i sećanje — pesma za oproštaj i pomen \| Rimoteka** | 59 → **61** |
| Opis | Rime za tugu, bol, sećanje i oproštaj. Reči koje pomažu da se izrazi tuga, poštovanje prema preminulima ili bol rastanka. | **Rime za pesmu o tuzi, sećanju i oproštaju: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova, pa biraš onu koja nosi pravo osećanje.** | 121 → **147** |

---

## `/rime-za-rep/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| 1 | „U repu je **ritam** sve. Rimoteka daje rime koje se uklapaju u beat, uz filter po broju slogova — da svaka reč „sedi“ tamo gde treba.“ | „**Rime za rep**: upiši reč i dobiješ rime, uz svaku broj slogova. Filtriraj na tačan broj slogova pa ostanu samo one koje ti staju u takt. Za bliske rime uključi kvačicu ‚šire (slabije) rime‘.“ | „Ritam je sve“ je prazna rečenica. Tvrdnja o filteru **jeste tačna** (`app.js`, `.syl-filter`, `.loose-toggle`), ali je bolje reći **kako se koristi** nego da postoji. |
| 2 | „Asonanca u repu“ → „Reperi često koriste **asonantu** — poklapanje samoglasnika…“ | „Reperi retko traže čistu rimu. Dovoljno je da se poklope samoglasnici — *lova* i *soba*. To je asonanca i u Rimoteci je dobiješ kvačicom ‚šire (slabije) rime‘.“ | **„asonantu“ je greška u kucanju** (treba *asonancu*) i stoji na sajtu. Uz to nema primera — a jedan primer ovde vredi više od definicije. |
| 3 | „Interna rima i multi-slog rime“ → „…Dugi, višesložni parovi zvuče **tehnički impresivno**.“ | „Rimuj i unutar stiha, ne samo na kraju. Rimoteka ti pokaže broj slogova za svaku reč, pa lako složiš par od dva ili tri sloga koji pada na isto mesto u taktu.“ | „Tehnički impresivno“ je prevedena fraza. Naša prednost — broj slogova uz svaku reč — nije ni pomenuta. |
| 4 | *nema* | Nov odeljak: „**Piši u beležnici**“ → „Otvori beležnicu, kucaj tekst i uz svaki stih odmah vidiš broj slogova i slovo šeme rime. Ne moraš da prelaziš na drugi tab da bi proverio da li ti se rima ponovila.“ | Beležnica sa oznakama uz stih **postoji i testirana je** (pre-deploy test, sekcija 31). To je jedina stvar koju konkurencija nema, a na strani za repere je nema u tekstu. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za rep — reči koje se rimuju za rap tekstove \| Rimoteka | **Rime za rep — čiste i bliske rime, slog po slog, besplatno \| Rimoteka** | 60 → **69** |
| Opis | Rime za rep i rap tekstove: pronađi čiste i asonantne rime, filtriraj po broju slogova i piši tekstove. Besplatan alat za repera. | **Rime za rep: upiši reč i dobiješ rime sa brojem slogova, a kvačica „šire rime“ dodaje i bliske. Piši u beležnici i broji slogove dok slažeš svaki stih.** | 129 → **151** |

---

## `/rime-za-pesmu/`

| # | SADA PIŠE | TREBA DA PIŠE | Zašto |
|---|---|---|---|
| 1 | „Svaka pesma počinje od ideje, a **rima** joj daje zvuk. Rimoteka pomaže **pesnicima i tekstopiscima** da brzo pronađu reči koje se rimuju i usklade ritam.“ | „**Rime za pesmu**: upiši reč sa kraja stiha i dobiješ sve što se sa njom rimuje, uz broj slogova i objašnjenje šta znači. Ne moraš da otvaraš rečnik u drugom prozoru.“ | Sadašnji uvod govori **o nama** („Rimoteka pomaže…“), a treba da govori o tome šta čovek dobija. Korist „ne moraš da otvaraš rečnik“ je naša prava prednost i nigde je nema. |
| 2 | „Kako koristiti Rimoteku za pisanje pesme?“ → „Upiši ključnu reč na kraju stiha. Rimoteka će odmah izlistati **najbolje rime**, koje možeš filtrirati po broju slogova.“ | „Napiši stih, pa upiši njegovu poslednju reč. Prvo dobiješ rime sa **istim brojem slogova** kao ta reč — one najlepše legnu na kraj stiha. Ispod njih su duže i kraće, za slučaj da ti fali slog.“ | „Najbolje rime“ ovde ništa ne objašnjava. Nova verzija **doslovno opisuje šta kod radi**: `app.js:965` deli rezultat na iste i različite po broju slogova. |
| 3 | „**Priroda i svakodnevica**“: go spisak od 15 reči, bez ijedne rečenice | „**Kad ti zapne — promeni poslednju reč**“ → „Ako reč nema rime koja ti odgovara, otvori sinonime i uzmi bližu reč. *Sunce* nema mnogo rima, *dan* ima. Pesma se ne kvari zbog jedne zamene.“ | Go spisak reči pod nasumičnim naslovom je najslabiji deo strane. Zamena rešava **stvarni problem** i vodi u sinonime — funkciju koju konkurencija nema. |
| 4 | „Gde mogu da sačuvam pesmu?“ → „U Rimoteci postoji **Beležnica** — tekst se čuva na tvom uređaju i ostaje i kad zatvoriš stranicu.“ | Zadržati, dopuniti: „…ostaje i kad zatvoriš stranicu. Uz svaki stih stoji broj slogova i slovo šeme rime, pa vidiš gde ti se ritam raspao.“ | Odgovor je tačan i dobar — samo mu fali ono što ga čini jedinstvenim. |

### Naslov i opis

| | Sada | Predlog | Znakova |
|---|---|---|---|
| Naslov | Rime za pesmu — reči koje se rimuju za pisanje poezije \| Rimoteka | **Rime za pesmu — rečnik rima i brojanje slogova za stih \| Rimoteka** | 65 → **65** |
| Opis | Rime za pesmu: pronađi reči koje se rimuju i piši lirike, ljubavne i druge pesme. Besplatan rečnik rima sa brojačem slogova. | **Rime za pesmu: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Rečnik rima, sinonimi, brojanje slogova i beležnica — sve na jednoj strani.** | 124 → **156** |

---

## Ponovljen tekst — koliko strana deli iste rečenice (prebrojano)

**Metod:** izvučen tekst iz `<main>` svih 21 tematske strane, razbijen na rečenice duže od
45 znakova, pa prebrojan. Za generisane strane — `grep -rl` po rečenici.

| Rečenica | Na koliko strana | Ocena |
|---|---|---|
| „Iskoristi ih za pisanje pesme, teksta ili repa. Klikni na reč da otvoriš još rima, ili kopiraj celu listu.“ | **1.993** | **Rizik.** Uz nju je jedini jedinstven sadržaj strane — spisak reči. Ako se doda dve-tri rečenice koje se **računaju iz podataka te reči** (broj slogova, ima li mnogo ili malo rima, ima li objašnjenje), svaka strana dobija svoj tekst bez ijedne nove tvrdnje. |
| „U mini-alatu iznad upiši bilo koju reč — dobićeš proširenu listu rima, šire (asonantne) rime i filter po broju slogova.“ | **1.993** | isto |
| „Još popularnih rima“ + **istih osam reči** (*srce, duša, sreća, tuga, bol, radost, nada, strast*) | **1.993** | **Najgore.** Isti blok, iste reči, i uz to netačan naslov. |
| „Pronađi rime za bilo koju reč“ (naslov mini-alata) | **1.993** | prihvatljivo — to je sučelje, ne sadržaj |
| „Za najmlađe uključi i dečji režim; dugme ispod to radi samo.“ | **2** (`rime-za-decu-o-prirodi`, `rime-za-decu-o-zivotinjama`) | lako se rešava, v. gore |

**Nalaz koji ide u prilog sajtu:** od **304 rečenice** na 21 tematskoj strani, **ponovljena je
tačno jedna**. Tematske strane **nisu** duplikat jedna druge — problem je u tačnosti i tonu,
ne u kopiranju. Ceo teret ponavljanja nosi šablon generisanih strana.

---

## Kanibalizacija — koje se naše strane tuku

| Upit koji čovek kuca | Naše strane koje se tuku | Šta uraditi |
|---|---|---|
| *rime za pesmu*, *rimovanje reči*, *reči koje se rimuju* | `/` · `/rimovanje-reci/` · `/rime-za-pesmu/` | **Tri strane, jedna namera.** `/` je alat i on pobeđuje. `/rimovanje-reci/` neka nosi **„rimovanje reči / rečnik rima“** (204 prikaza, 0 klikova), a `/rime-za-pesmu/` neka se suzi na **pisanje pesme** — kako se rima bira, ne kako se traži. |
| *koje rime idu sa „ljubav“* | `/rime-za-ljubavne-pesme/` · `/rime-za-svadbu/` · `/rime-za/ljubav/` | Isto pitanje, doslovno, u Čestim pitanjima na dve strane. Svadba dobija svoje pitanje (v. tabelu za svadbu), a **`/rime-za/ljubav/` je jedina koja sme da odgovara na „rime za ljubav“** — ona i ima spisak. |
| *kako napisati pesmu* | `/kako-napisati-pesmu/` · `/pisanje-pesama/` · `/rime-za-pesmu/` | Tri strane o istoj stvari. Ovo je odluka vlasnice — predlog: `/kako-napisati-pesmu/` ostaje uputstvo, `/pisanje-pesama/` postaje strana **beležnice** (alat), `/rime-za-pesmu/` ostaje rime. |
| *rime za decu* | `/rime-za-decu/` · `/rime-za-decu-o-prirodi/` · `/rime-za-decu-o-zivotinjama/` | Preklapanje je malo i podnošljivo — dve podstrane imaju svoje reči. Samo razdvojiti ponovljenu rečenicu i pitanje „Da li su rime bezbedne za decu?“, koje stoji na obe. |
| *rime za rođendan* | `/rime-za-rodjendanske-pesmice/` · `/rime-za-novu-godinu/` (obe o čestitkama) | Podnošljivo, ali obe imaju isti odeljak „ključne reči“ i isti savet o kratkoj čestitki. Razdvojiti tonom: rođendan = lično i šaljivo, Nova godina = kratko i za mnogo ljudi odjednom. |

---

## Unutrašnji linkovi — šta fali

| Gde | Stanje | Šta treba |
|---|---|---|
| **1.993 generisane strane** | u `<main>` **nema nijednog** linka ka `/slogovi/`, `/vrste-rima/`, `/rime-za-decu/`, `/rimovanje-reci/`. Samo `/`, `/rime-za/`, `/?rec=…` i 8 drugih `/rime-za/`. `faq_sa_linkovima()` (`gen_pages.py:566`) na ovom šablonu **se ne poziva**. | Blok „**Šta dalje**“ sa tri opisna linka (v. nalaz 10 u šablonu). Ovo je najveći pojedinačni potez na celom sajtu — **1.993 strane × 3 linka**, sve ka stranama koje traže indeksiranje. |
| **Tematske strane** | imaju blok „**Srodne strane**“ sa 3–5 linkova (`SRODNO`, `gen_pages.py:485–513`). Svaka strana ima bar dva dolazna linka. **Ovo radi dobro.** | Zadržati. Dodati **linkove iz teksta**, ne samo iz bloka na dnu — svaki go spisak reči koji sam gore pretvorio u rečenicu nosi 4–6 linkova ka `/rime-za/<reč>/`. |
| **Tekst linka** | u bloku „Srodne strane“ tekst je naziv strane („Brojanje slogova“) — **opisan je, ne „ovde“.** Dobro. | Zadržati. |
| **Ka tematskim stranama** | jedini put je futer (svih ~2.010 strana) i `SRODNO`. Google futerskim linkovima malo veruje. | Linkovi iz teksta iz predloga gore to popravljaju bez ijedne nove strane. |

---

## Šta radi odlično — ne dirati

| Šta | Zašto ne dirati |
|---|---|
| **Blok „Srodne strane“ i mapa `SRODNO`** (`gen_pages.py:485–513`) | Rešava tačno onaj problem zbog kog Google ostavlja strane na „otkriveno, nije indeksirano“ — svaka tematska strana ima bar dva dolazna linka iz sadržaja. Komentar iznad mape objašnjava zašto. Ovo je najbolji SEO potez na sajtu. |
| **Naslov `/rime-za/[reč]/` u nominativu** („Rime za reč „nada““) | Rešava padež bez nagađanja i tačan je za svih 1.993 strane. Komentar na liniji 886–891 objašnjava zašto se padež ne sme izvoditi iz završetka. Ne dirati. |
| **`FAQ_MAX_LINKOVA = 2`** (`gen_pages.py:563`) | Sprečava spamovanje linkovima u odgovorima. Retko ko se ovako obuzda. |
| **Tematske strane nisu prepisane jedna sa druge** | 304 rečenice, jedna ponovljena. To je bolje nego kod većine sajtova ove veličine. |
| **Odgovor „Gde mogu da sačuvam pesmu?“** (`/rime-za-pesmu/`) | Jedini odgovor na sajtu koji osobinu prevodi u korist i kaže istinu o kodu. Uzeti ga kao uzor za ostale. |
| **Rime za *tuga*** (jedini tačan spisak u Čestim pitanjima na tematskim stranama) | *druga, luga, šuga, ruga, kruga* — stvarno jesu rime. Samo izbaciti *šugu*. |
| **Dečji režim preko adrese** (`?decji=1`, `app.js:1066`) | Radi, i tekst koji to tvrdi je tačan. Retkost — većina tvrdnji na tematskim stranama nije. |

---

## Šta ostaje nerešeno (i čija je odluka)

| Šta | Čija odluka |
|---|---|
| Da li `/rime-za-pesmu/`, `/kako-napisati-pesmu/` i `/pisanje-pesama/` ostaju tri strane ili se dve spajaju | **vlasnica** — spajanje menja strukturu sajta (`CLAUDE.md`, odeljak 8) |
| Da li se u naslov 1.993 strane ubacuje **„rečnik rima“** (fraza sa 204 prikaza / 0 klikova) | **vlasnica** — menja naslove svih generisanih strana odjednom; meri se 13.08. |
| Da li se blok „Još popularnih rima“ **preimenuje** ili **uklanja** | preporuka: preimenovati (linkovi vrede), ali odluka je vlasničina jer menja izgled strane |

## Posle odobrenja — obavezno

1. Izmene u **`build/gen_pages.py`**, nikad u `public/*/index.html` (tekst se generiše).
2. `python3 build/gen_pages.py`
3. `node test/predeploy.mjs` mora da prođe (izlazni kod 0).
4. Posle deploy-a `BASE=https://rimoteka.com node test/predeploy.mjs`.
5. U pre-deploy test dodati proveru: **na strani `/rime-za/<reč>/` nijedna reč iz bloka
   „Rime za druge reči“ ne sme da nosi istu klasu kao prava rima** — da se lažni nalaz
   „reč je na strani, dakle rimuje se“ nikad ne ponovi.
6. Meriti **13.08.2026**: klikovi na `recnik rima`, `rimovanje reci na srpskom`, i CTR
   generisanih strana posle skraćenja opisa.
