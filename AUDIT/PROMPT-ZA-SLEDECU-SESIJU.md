# Prompt za sledeću sesiju — Rimoteka

> Napisano 29.07.2026. uveče, na kraju pete sesije.
> Kopiraj sve ispod crte i nalepi kao prvu poruku u novoj sesiji.

---

Radiš na projektu Rimoteka: `/Users/jovana.jovic/Desktop/Projects/rimoteka`

## Pročitaj odmah, tim redom

1. `HANDOVER.md` — **samo prvi odeljak** („Sesija 29. jul 2026 (peta)"). Ima devet
   delova; deo 3 su greške prethodne sesije, deo 6 je zašto su sesije bile spore.
2. `AUDIT/NALAZI-OTVORENI.md` — **7 otvorenih nalaza** (M1–M4 mobilni, P10, P11, N12), izvor istine.
3. `AUDIT/PROPUSTI.md` — pravila **25–34** su iz prethodne sesije i najsvežija su.
4. `CLAUDE.md` projekta — odeljak **8a** (logo se ne dira), **9a** (obavezan test),
   **9a-1** (nginx se ne dira bez `test/nginx-provera.sh`).
5. `TODO.md` odeljak 0 i `TODO-RECNIK.md` odeljak „HITNO".

Zatečeno stanje: sve pushovano, radno stablo čisto,
test **344/344** i lokalno i protiv produkcije.

## Odobrenje koje već imaš (vlasnica, 29.07.2026)

> „Odobreno sve što uklanja bag, uključujući šminkanje i peglanje.
> **Zabranjeno:** brisanje rečnika, menjanje strukture sajta, i svaki nepovratan potez."

Ne pitaj za dozvolu za popravke. Pitaj samo za ukus, sadržaj i izgled, i za sve što
menja URL-ove.

---

## ZADATAK — idi redom, ne preskači

> Zadatak **0** je najviši prioritet. Zadatak **1** je kratak i može se odraditi
> usput dok se čeka odgovor vlasnice. Zadaci 2–3 su vezani i idu tim redom.


### 0. MOBILNA VERZIJA I BELEŽNICA — **NAJVIŠI PRIORITET**

> Prijava vlasnice 29.07.2026: *„otvorila sam sajt na svom telefonu i jeziv je…
> beležnica posebno nikakve veze sa vezom nema."*
> Sve dole je **izmereno na produkciji** u iPhone 13 kontekstu, sa dodirom —
> nije prepisano iz opisa. Nalazi **M1–M4** u `AUDIT/NALAZI-OTVORENI.md`.

**M1 — beležnica NE BOJI RIME, i to ni na jednoj širini. Ovo je prvo što se radi.**

Izmereno: **0 obojenih elemenata i 0 klasa** u editoru na **1440, 768 i 390 px**.
Kod postoji: `analyzeRhymes` (`app.js:1218`) boji grupe od 2+ rime, poziva se iz
`scheduleEditorUpdate` (`app.js:1288`) sa zadrškom od 500 ms.

Reprodukcija — tab „Pisanje pesama", upisati:
```
Voli me kao nekad
u tvom srcu je lek
dolazi tiho vek
ostani jos malo tu
```
„lek" i „vek" se rimuju, grupa od dva postoji, boje se **ne pojave**.

**Prva sumnja koju treba proveriti:** da li `getEditorText()` vraća prelome redova
onako kako ih `contenteditable` stvarno pravi (`<div>`, `<br>`). Ako ne, ceo tekst
je **jedan red**, poslednja reč je samo jedna, i grupa rime ne može ni da nastane.
To bi objasnilo zašto se ništa ne boji iako kod radi.

> **Ovo je funkcija koja se OBEĆAVA a ne isporučuje** — po pravilu projekta to je
> teže od kvara koji se vidi. Zato ide pre svega ostalog.

**M2 — editor počinje na `x = 80` od 390 px.** Kolona sa brojem slogova
(`.gutter`, `flex: 0 0 4.4rem`) pojede **20% ekrana**; za pisanje ostane **292 px**.
Na telefonu je to jedva pola stiha. Na uskim ekranima kolona ne sme da bude fiksna.

**M3 — editor je ISPOD PREGIBA.** `y = 713 px` na ekranu visine **664 px**. Ko na
telefonu otvori „Pisanje pesama" **ne vidi gde se piše** dok ne skroluje.

**M4 — tri elementa izlaze van ekrana na 390 px:** link do 502 px, dugme do 638 px,
`#favCount` do 620 px — traka beži i do **248 px** desno od vidljivog dela.

**Šta RADI i ne treba dirati:** panel rima na dodir reči u pesmi — dodir na „srcu"
daje **33 rime**, panel 390×226 px. To je jedino u beležnici što je na telefonu
kako treba.

**Kako raditi ovaj zadatak:**
1. Prvo **M1** — to je funkcionalni kvar, ne izgled. Popraviti, pa dodati proveru u
   `test/predeploy.mjs` koja meri **broj obojenih reči**, ne postojanje elementa.
2. Tek onda **M2–M4** — raspored. Meriti na **390, 360 i 320 px**, u obe teme, sa
   upisanom pesmom (ne praznom beležnicom — prazna sve sakrije).
3. Svaka izmena rasporeda je **vidljiva promena** → pokazati vlasnici pre push-a.
4. Ne pretvarati ovo u redizajn celog sajta. Beležnica na telefonu, pa ostali tabovi.

### 1. N12 — `http://` vraća 307/302 umesto 301  *(15 minuta, traži vlasnicu)*

Preusmerenje radi **Traefik u Coolify-ju**, ne naš nginx — Traefik odgovara pre
njega, pa se iz repozitorijuma NE MOŽE. Otvori `https://panel.orbitacode.com` kroz
pregledač, traži od vlasnice da se prijavi, pa nastavi sam:
Coolify → Rimoteka → Domains, ili oznaka
`traefik.http.middlewares.<ime>.redirectscheme.permanent=true`.

Posle: `curl -s -o /dev/null -w "%{http_code} → %{redirect_url}" http://rimoteka.com/`
mora dati **301**. Dodaj proveru u sekciju 25 `test/predeploy.mjs` (ona već pokriva
`www`, dodaj i `http://`), pa je pusti protiv produkcije **pre** popravke — mora pasti.

### 2. `frekvencija.json` je pogrešan — POPRAVITI PRE P10  *(pola dana)*

> **Ovo je preduslov za zadatak 3. Ne kreći na P10 dok ovo nije gotovo.**

Opisano u `TODO-RECNIK.md`, odeljak „HITNO". Ko je pravio fajl **prepisivao je
umesto da sabira** frekvencije po obliku, pa je za svaki oblik ostalo poslednje
pročitano čitanje — često najređe:

| reč | sada | koliko bi trebalo |
|---|---|---|
| `voda` | 876 | desetine hiljada |
| `veliki` | 34 | — |
| `dva` | 9 | — |
| `hiljada`, `hiljadu` | **nema ih uopšte** | — |

Fajl ima 208.687 unosa, srLex 6.905.941 oblik.

**Posledica:** rangiranje rima u živom alatu (`app.js:346` učitava ovaj fajl) je
delimično pogrešno, a P10 bi po ovim brojevima izabrao pogrešnih 2.000 reči.

Koraci: ponovo izvući iz srLex-a **uz sabiranje po obliku** → uporediti stare i nove
brojeve za 20 čestih reči → proveriti da se rangiranje rima za „ljubav", „srce",
„nada" popravilo, ne pokvarilo → provera u `test/predeploy.mjs`.

### 3. P10 + P11 — strane reči i hub  *(veći poduhvat, traži odobrenje za URL-ove)*

Pun opis i plan: `TODO.md`, odeljak **0.0**. Ukratko:

`gen_pages.py` bira 2.000 meta-reči `for w in words`, a `words` je `reci.txt`
**redom kako stoji u fajlu — abecedno**. Zato je **1.577 od 1.988** strana na slovo
„a" (`aaa`, `aah`, `abadzija`, `abakusi`, `abazur`), a nema strana za većinu običnih
reči. Uz to `rank = {w: i for i, w in enumerate(words)}` (linija 605) je redni broj
**po abecedi** — `gen_pages.py` **nikad ne učita `frekvencija.json`**, iako komentar
na liniji 646 tvrdi „frekvencijski rangirane".

**Redosled:**
1. `gen_pages.py` učita `frekvencija.json` (već popravljen u zadatku 2) i `rank`
   računa po učestalosti — isto kao `app.js`, da se dva rangiranja ne razilaze.
2. **Pre regeneracije** izvući spisak postojećih 1.988 slugova → uporediti sa novim →
   za svaki koji nestaje napisati **301** u `nginx.conf`.
   **`nginx.conf` se ne deployuje bez `bash test/nginx-provera.sh`** (izlazni kod 0).
3. Hub podeliti po slovima: `/rime-za/` = kartice sa slovima i brojevima, spisak se
   seli na `/rime-za/a/`, `/rime-za/b/`… Nijedan URL strane reči se time ne dira.
4. Sitemap → Google Search Console → merenje.

**Pre koraka 2 pokaži vlasnici koliko URL-ova nestaje i predlog preusmerenja.**

### 4. `/omiljene/` kao prava strana — **već odobreno**  *(jedno popodne)*

Koraci su napisani u `TODO.md`, odeljak **0.1**. Nije obično preimenovanje: podstrane
nemaju panele, pa je ovo **nov tip strane**. Mora `noindex,follow` i **ne sme u
sitemap** — omiljene žive samo na uređaju, pa bi indeksirana strana za svakog bila
prazna.

### 5. Audit — zakazan za 31.07.2026

Radi po `/Users/jovana.jovic/AUDIT-PROTOKOL.md`, upiši u `AUDIT/2026-07-31-audit.md`.

**Prvo izmeri P16** (CLS na `/`): prethodna sesija ga je zatvorila sa **rasponom**, ne
sa jednim brojem — 11× 0,0065, 2× ~0,30, pri čemu su oba loša pala u minutu dok se
kontejner dizao posle deploy-a. Izmeri **najmanje 10 puta, ne odmah posle deploy-a.**

### 6. Ostalo iz `TODO.md` — proći redom kad gornje bude gotovo

| # | Šta | Napomena |
|---|---|---|
| 1 | pregledati reči koje dečji režim isključuje | odeljak 1 |
| 2 | pregledati nove reči iz rečnika | odeljak 2, traži vlasnicu |
| 3 | staging grana na GitHubu | odeljak 3 |
| 4 | brojač slogova — spojiti unos i rezultat u jedno polje | odeljak 4 |
| 5 | odluka `/` ili `/rimovanje-reci/` za „rimovanje reči" | odeljak 5, traži vlasnicu |
| 6 | Google Search Console | odeljak 6 |
| 7 | 4.769 reči ima objašnjenje a nema ih u rečniku | odeljak 7 |
| 8 | pravilo za tvrdnje u tekstu na sajtu | odeljak 8 |
| 0.2 | verzije logotipa | **ne možeš ti** — vlasnica naručuje; do tada logo se ne dira |

Inovativne predloge (odeljak A) **ne počinji** dok gornje nije gotovo — pravilo
projekta: prvo bagovi, pa novo.

---

## PRAVILA KOJA SU PLAĆENA SKUPO — ne krši ih

1. **`nginx.conf` se ne deployuje bez `bash test/nginx-provera.sh`** (izlazni kod 0).
   29.07. je jedna izmena oborila sajt na ~3 minuta: blok za `www` je postao
   *podrazumevani server*, pa je `rimoteka.com` preusmeravao na samog sebe.
   `server_name _` **nije** hvatalica za sve domene — glavni blok mora imati
   `listen 80 default_server;`. Provera sintakse je **nužna a ne dovoljna**.
2. **Izmene koje mogu da obore sajt idu SAME**, u zasebnom deploy-u. Posle deploy-a
   prvo proveri **glavnu adresu**, pa tek ono što si menjao.
3. **Merenja koja variraju** (CLS, LCP, vreme odziva) uzimaj kao **najbolje od tri**,
   a u izveštaj piši **raspon**. Dva ista broja nisu dokaz stabilnosti.
4. **Ne meri u minutu posle deploy-a** — kontejner se tada diže.
5. **Svaka nova provera se pušta protiv produkcije DOK JE TAMO STARI KOD.** Ako ne
   padne, provera ne valja. To je uhvatilo bezvredne provere već četiri puta.
6. **Pre `python3 build/gen_pages.py`:** `pkill -f "static-server.mjs"; pkill -f
   "http.server"; sleep 2`. Posle: `ls public/rime-za/ | grep -c " 2$"` — mora 0.
7. **`?v=` se podiže u TRI fajla:** `public/index.html`, `build/gen_pages.py`,
   `public/404.html`. Trenutno `20260729g`.
8. **Logo se ne dira** (pravilo 8a).
9. **Svaka `git` komanda ide sa `--no-pager`** ili `| cat`.
10. **Ako se `git` čudno ponaša** (`bad object`, `stash failed`, `failed to run
    repack`) — to su iCloud konflikt-kopije: `find .git -name "* [0-9]*"`, pa
    premesti nađeno (ne briši).
11. **Ne brisati korisničke fajlove** — premeštati van projekta u imenovan folder.

## Kad završiš

Izveštaj u tabelama: koliko nalaza zatvoreno i koliko ostalo (**prebrojano u
fajlu**), tabela nalaz → bilo → sada → fajl:linija, **merenja a ne utisci**, spisak
vidljivih promena za odobrenje, koliko provera ima test sada, šta si našao a nisi
popravio i zašto, i šta ostaje vlasnici da odluči.

Ažuriraj `HANDOVER.md`, `AUDIT/NALAZI-OTVORENI.md`, `AUDIT/PROPUSTI.md` i `TODO.md`.
