# Prompt za sledeću sesiju — Rimoteka

> Napisano 29.07.2026. kasno uveče, na kraju šeste sesije.
> Kopiraj sve ispod crte i nalepi kao prvu poruku u novoj sesiji.

---

Radiš na projektu Rimoteka: `/Users/jovana.jovic/Projects/rimoteka`

## Pročitaj odmah, tim redom

1. `HANDOVER.md` — **samo prvi odeljak** („Sesija 29. jul 2026 (šesta)"). Tu su
   mobilne popravke (M1–M4), lekcija o `contain:inline-size`, spisak vidljivih
   promena za odobrenje i šta je svesno nedirano.
2. `AUDIT/NALAZI-OTVORENI.md` — **3 otvorena nalaza** (F1, P10, P11), izvor istine.
   Usklađeno 30.07.: **F1** (`frekvencija.json`) je bio nalaz koji je stajao samo u
   `TODO-RECNIK.md`, pa se nije brojao — sada je u spisku i **prvi je po redu** jer
   blokira P10. **P16** je popravljen ali nepotvrđen — audit ga meri desetak puta.
3. `AUDIT/PROPUSTI.md` — pravila **35–36** su najsvežija (skrolujući red i
   `contain:inline-size`; `contenteditable` se testira sa `<br>` I `<div>` redovima).
4. `CLAUDE.md` projekta — odeljak **8a** (logo se ne dira), **9a** (obavezan test),
   **9a-1** (nginx se ne dira bez `test/nginx-provera.sh`).
5. `TODO.md` odeljak 0 i `TODO-RECNIK.md` odeljak „HITNO".

## Zatečeno stanje — PAŽNJA, NEPUSHOVANO

Šesta sesija je završila rad **lokalno**: mobilna verzija (M1–M4), A4 (istorija
pesme), čišćenje viškova (mrtav CSS, mrtvi fajlovi, pokvareni git refovi),
`docs/` reorganizacija. Test lokalno **353/353**; protiv produkcije sekcija 26
pada dok je tamo stari kod (dokaz da provere hvataju kvar).
**Prvi posao: pokazati vlasnici vidljive promene (spisak u HANDOVER-u, odeljak 6),
dobiti odobrenje, pa feature grana + push + test protiv produkcije.**

## Odobrenje koje već imaš (vlasnica, 29.07.2026)

> „Odobreno sve što uklanja bag, uključujući šminkanje i peglanje.
> **Zabranjeno:** brisanje rečnika, menjanje strukture sajta, i svaki nepovratan potez."
> Dopunjeno istog dana: odobreno i brisanje viškova/duplikata u projektu.

Ne pitaj za dozvolu za popravke. Pitaj samo za ukus, sadržaj i izgled, i za sve što
menja URL-ove. **Push/merge i brisanje grana — uvek uz odobrenje.**

## ZADATAK — idi redom, ne preskači

### 0. ZATVORENO u šestoj sesiji

Mobilna verzija (M1–M4) + A4 + čišćenje + `docs/`. Ne raditi ponovo; provere su
sekcija 26 u `test/predeploy.mjs`.

### 1. ZATVORENO — push šeste sesije je na produkciji (test 358/358) i N12 je rešen

N12 rešenje: `rimoteka-301.yaml` u `/data/coolify/proxy/dynamic/` na serveru
(SSH, host-ograničen, `redirectScheme permanent: true`) — Coolify panel nije
dostupan bez prijave, a oznake se svakako regenerišu pri deploy-u. Detalji u
`HANDOVER.md`, sesija 29.07. (šesta), odeljak 9.

### 2. `frekvencija.json` je pogrešan — POPRAVITI PRE P10  *(pola dana)*

Opisano u `TODO-RECNIK.md`, odeljak „HITNO". Ko je pravio fajl **prepisivao je
umesto da sabira** frekvencije po obliku: `voda` = 876, `veliki` = 34, `dva` = 9,
`hiljada` nema uopšte. Ponovo izvući iz srLex-a **uz sabiranje po obliku** →
uporediti stare i nove brojeve za 20 čestih reči → proveriti rangiranje za
„ljubav", „srce", „nada" → provera u testu.

### 3. P10 + P11 — strane reči i hub  *(veći poduhvat, traži odobrenje za URL-ove)*

Pun opis: `TODO.md`, odeljak **0.0**. `gen_pages.py` bira 2.000 reči **abecedno**
(1.577 od 1.988 na slovo „a") i nikad ne učita `frekvencija.json`. Redosled:
frekvencija (zadatak 2) → spisak postojećih slugova → 301 u `nginx.conf`
(obavezno `bash test/nginx-provera.sh`) → hub po slovima → sitemap → GSC.
**Pre koraka 2 pokaži vlasnici koliko URL-ova nestaje i predlog preusmerenja.**

### 4. `/omiljene/` kao prava strana — **već odobreno**  *(jedno popodne)*

Koraci: `TODO.md`, odeljak **0.1**. `noindex,follow`, van sitemapa.

### 5. Audit — zakazan za 31.07.2026

Po `~/.claude/AUDIT-PROTOKOL.md`, upiši u `AUDIT/2026-07-31-audit.md`.
Prvo izmeriti P16 desetak puta, ne odmah posle deploy-a. Uz to: mobilni prolaz
kroz svih 7 tabova na telefonu (sekcija 26 pokriva beležnicu; ostalih 6 tabova
na telefonu provereni su sweep-om u šestoj sesiji, ali audit treba svoje merenje).

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
| 0.2 | verzije logotipa | **ne možeš ti** — vlasnica naručuje |
| — | brisanje 16 mergovanih grana | spisak je u HANDOVER-u sesije 6; traži odobrenje |
| — | CI (GitHub Actions za predeploy test) + `package.json` sa pinovanim Playwrightom | predlog u HANDOVER-u sesije 6 |

Inovativne predloge (odeljak A u TODO.md) **ne počinji** dok gornje nije gotovo.

---

## PRAVILA KOJA SU PLAĆENA SKUPO — ne krši ih

1. **`nginx.conf` se ne deployuje bez `bash test/nginx-provera.sh`** (izlazni kod 0).
   `server_name _` **nije** hvatalica; glavni blok mora `listen 80 default_server;`.
2. **Izmene koje mogu da obore sajt idu SAME**, u zasebnom deploy-u. Posle deploy-a
   prvo proveri **glavnu adresu**, pa tek ono što si menjao.
3. **Merenja koja variraju** (CLS, LCP, vreme odziva) uzimaj kao **najbolje od tri**,
   a u izveštaj piši **raspon**.
4. **Ne meri u minutu posle deploy-a** — kontejner se tada diže.
5. **Svaka nova provera se pušta protiv produkcije DOK JE TAMO STARI KOD.** Ako ne
   padne, provera ne valja.
6. **Pre `python3 build/gen_pages.py`:** `pkill -f "static-server.mjs"; pkill -f
   "http.server"; sleep 2`. Posle: `ls public/rime-za/ | grep -c " 2$"` — mora 0.
7. **`?v=` se podiže u TRI fajla:** `public/index.html`, `build/gen_pages.py`,
   `public/404.html`. Trenutno `20260729h`.
8. **Logo se ne dira** (pravilo 8a).
9. **Svaka `git` komanda ide sa `--no-pager`** ili `| cat`.
10. **Skrolujući red na telefonu** (`overflow-x:auto` + `nowrap`) mora imati
    **`contain:inline-size`** — bez njega mobilni Chrome raširi celu stranicu
    (izmereno: 822 px). Provera: `scrollWidth dokumenta === innerWidth` na 390 px.
11. **Ne brisati korisničke fajlove** — premeštati van projekta u imenovan folder
    (za ovu sesiju: `~/Desktop/rimoteka-ciscenje-29.07.2026/`).

## Kad završiš

Izveštaj u tabelama: koliko nalaza zatvoreno i koliko ostalo (**prebrojano u
fajlu**), tabela nalaz → bilo → sada → fajl:linija, **merenja a ne utisci**, spisak
vidljivih promena za odobrenje, koliko provera ima test sada, šta si našao a nisi
popravio i zašto, i šta ostaje vlasnici da odluči.

Ažuriraj `HANDOVER.md`, `AUDIT/NALAZI-OTVORENI.md`, `AUDIT/PROPUSTI.md` i `TODO.md`.
