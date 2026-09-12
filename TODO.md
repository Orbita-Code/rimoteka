# TODO — Rimoteka (sajt i alati)

> Rečnik ima svoj spisak u `TODO-RECNIK.md`, tekstovi na sajtu u `TODO-TEKSTOVI.md`. Ovde je sve ostalo.
> **Poslednje prepisano: 9. septembar 2026, 02:00** (posle push 6). Handoff: `HANDOVER.md`, vrh.
> Rešeno se **briše**, ne štriklira. Trag rešenog: `AUDIT/NALAZI-OTVORENI.md` i `HANDOVER.md`.
> Cilj vlasnice: **10/10 na svim dimenzijama**, telefon prvi (većina posetilaca).



## PRVA STVAR: sinonimi (prioritet vlasnice, 12.09.2026)

Prva stvar koja se rešava. Nalaz **V2** (otvoren od audita): sinonimi su sada kurirani
(54 odobrenih već na sajtu), ali **787 parova čeka pregled** u
`AUDIT/sinonimi/SINONIMI-ZA-PREGLED.txt`. Vlasnica pregleda sama — pravilo: sinonim
smije samo ono što pesnik STVARNO može da zameni u stihu bez da promeni smisao;
mašinski sinonimi koji se ne rimuju sa ostatkom pesme su gori nego da ih nema
(prijava Dragana M. ranije: sinonimi NE smeju u panel uz stih ako se ne rimuju).
Kad pregled bude gotov: upis, lanac podataka, pun test, deploy.

**Predlog za isti zadatak (zapisati, ne zaboraviti): „sinonim sa proverom rime".**
Uz svaki odobreni sinonim, u panelu uz stih, odmah stoji i oznaka da li se i ON
rimuje sa ostatkom pesme (ključ rime već imamo — provera je jeftina). Tako pesnik
zameni reč po smislu, a NE IZGUBI rimu. Niko to na tržištu nema; za pesnike je to
tačno ono „razume se njihov proces" iskustvo. Implementirati zajedno sa upisom
odobrenih sinonima, kao posebna izmena sa svojim testovima.

## Pun test brže: rečnik jednom, ne 100 puta (tačka 2 iz „deploy traje 3 sata", 09.09.2026)

Izmereno 09.09. protiv produkcije (`AUDIT/lanac/20260909-013535/predeploy.log`, vreme uz svaku sekciju): pun test
**709 s = 11,8 min u 94 sekcije**, prosečno 7,5 s po sekciji, nijedna ne dominira (najsporije: 10c kontrast 48 s,
51 rečnik/HTML 32 s, 39 redosled rima 32 s, 56 Dragan+Reč dana 25 s, 46 prijava 25 s). Vreme odlazi na to što
svaka sekcija otvara SVOJ kontekst i pregledač iznova skida i parsira rečnik (5 MB + učestalost 2 MB, ~1,5–2 s po
kontekstu, ~100 konteksta ≈ 3 min) i na fiksne `pauza(…)` (zbir ~2 min). Plan: (1) jedan `browser.newContext()` po
GRUPI sekcija koje ne menjaju localStorage, sa jednom stranom koja se ponovo koristi (`p.goto` samo kad treba);
(2) `pauza(N)` zameniti čekanjem na uslov (`waitForFunction`); (3) sekciju 50 (fajlovi) i 54 (sve reči) ostaviti
kakve jesu – one su sekunde. Cilj: ispod 6 min. Paralelni lanac je već 11 min 51 s ukupno (bilo ~28 u nizu).

## „Oblik reči X“ – glavna reč pod navodnicima + značenje u zagradi (zahtev vlasnice 08.09.2026 uveče)

Vlasnica: „ako navodimo glavnu reč, npr. „čad“, onda da u zagradi i napišemo šta ta reč znači – sjajno iskustvo korisnika“.
**Skripta je gotova i probana (samo probni prolaz):** `python3 build/oblik_reci_navodnici.py` → sa `--primeni` upisuje.
Izmereno u `definicije.json`: 129.470 objašnjenja „Oblik reči X“; 125.946 dobija navodnike („X“); 2.691 dobija
značenje glavne reči iz njenog objašnjenja (prva rečenica, malo slovo); 61 ostaje bez zagrade (glavne reči nema u
rečniku); 3.524 već bila u novom obliku. Primer: `Oblik reči van.` → `Oblik reči „van“ (prilog i predlog: izvan, napolju).`
Posle primene OBAVEZNO: `python3 build/podeli_definicije.py && node scripts/osvezi-verzije-podataka.mjs && python3 build/gen_pages.py`,
pa pun test (53 proverava deljene fajlove). Ostalih ~88.000 objašnjenja „Oblik prisvojnog prideva od prezimena…“ i
sl. NE menjaju (nisu „Oblik reči X“). Uraditi u sledećoj sesiji, kad Mac nije preopterećen (08.09. uveče: opterećenje 138
zbog iOS simulatora druge sesije).

## STANJE 09.09.2026 (02:00, posle push 6)

| | |
|---|---|
| Ocena audita | **7,3/10** na dan 07.09. (`AUDIT/2026-09-06-audit.md`); od tada zatvoreno 27 + mobilni audit + igra + Dragan – ocena se meri u sledećem auditu (10.09.), ne prepisuje |
| Test | pun test 94 sekcije, ~850 provera lokalno (831 protiv produkcije); + motori 60 + skener ćirilice + skener tamne; sve u `bash test/lanac.sh` (≈ 12 min paralelno) |
| Na sajtu | sve iz push 4–6 (v. HANDOVER §1); poslednji lanac protiv produkcije: sve prošlo |

## 1. ODMAH NA POČETKU SLEDEĆE SESIJE

1. **GSC Request Indexing za 19 novih strana** (`čeka radi mira jada sprema brata oka meni vila jeka vuče čedo sjaj nosi baba drugo iznenada zraka dar`) – `osascript scripts/gsc-zatrazi-indeksiranje.applescript`, kvota ~10/dan; i pregled da 15 ukinutih daje 301.
2. **Nove prijave u sanduču** (`curl -H "X-Kljuc: …" <worker>/prijave?format=json`) – od 09.09. stižu i mejlom.
3. **Roboti na `?rec=`**: `ssh root@88.198.218.69`, `docker stats` za kontejner rimoteke (RAM limit 512 MB) – ako je pri vrhu, `limit_req` u nginx-u.
4. **Brzina, ostalo:** brotli NIJE moguć u `nginx:alpine`; drugi dolazak kroz service worker izmeriti (ISTEKLO VREME u auditu); deploy bez 502 (health check / rolling u Coolify-ju).

## 2. OVOG MESECA — struktura i brzina

24. **Test — rupe iz audita:** ćirilica × telefon, dečji × telefon, širina 320 u svim mobilnim sekcijama; rubni unosi (prazno+klik, razmaci, 200 znakova, `<script>`, mešano pismo) u `#rimeInput`; zameniti `pauza(N)` posle mrežnih koraka čekanjem na stanje (202 : 61); provere za zatvorene nalaze T4, T8–T14, R1, P10; drugi dolazak kroz SW.
25. **Analitika:** agent `analitika` — zakazano 8. 9. (naslovi od 26. 8.; CTR početne 2,5 % → cilj >4 %; upit „rime" 0 klikova → cilj ≥10) + **klikovi sa `?rec=` adresa** (odluka o politici `?rec=` bez tog broja je nagađanje). Od 06.09. GA broji samo one koji prihvate kolačiće — brojeve pre i posle ne porediti.
26. **Search Console:** posle svake objave `osascript scripts/gsc-zatrazi-indeksiranje.applescript <adresa>` za nove/izmenjene strane (kvota ~10 dnevno); pratiti „Discovered – not indexed" (1.123 na 04.09.).

## 2a. INOVACIJA — RIME PO NAGLASKU (zapisano 08.09.2026, predlog prihvaćen za spisak)

**Šta:** prava rima počinje od poslednjeg **naglašenog** samoglasnika, a Rimoteka to danas ne zna
(nema podatke o akcentu), pa umesto toga koristi „isti broj slogova" kao zamenu (CLAUDE.md 6.2a).
Sa akcentima bi „Najbolje rime" bile one koje se poklapaju od naglaska — kako pesnik i čuje rimu.
Niko na srpskom to nema (rimovanje.com, azrhymes, igrarecima — provereno u `COMPETITIVE-ANALYSIS.md`).

**Odakle podaci:** Rečnik Matice srpske (`~/Literatura/recnik-matice-srpske-2011.txt`) nosi
akcentovane odrednice. **Prvi korak je provera, ne kod:** uzeti 200 nasumičnih odrednica i prebrojati
kod koliko je akcenat sačuvan posle skeniranja (znak nad samoglasnikom prisutan i na pravom mestu).
Ako je ispod ~80 %, izvor ne valja i traži se drugi (srLex nema akcente; `hjp`/`Vukajlija` ne;
kandidat: Pravopisni rečnik ili ručno za najčešćih 5.000 reči).

**Kako bi radilo:** za reč sa poznatim naglaskom ključ rime = od naglašenog samoglasnika do kraja;
za reč bez podatka ostaje današnje pravilo. Grupa „Najbolje rime" = poklapanje od naglaska; „Dobre" =
poklapanje od pretposlednjeg samoglasnika (današnji ključ). Statičke strane se regenerišu istim kodom
(K1 pouka: alat i generator računaju isto).

**Redosled:** posle objave S-19 (indeksiranje je veći problem od kvaliteta rime — vidi GSC 1.123
„otkriveno, nije indeksirano"). Pre pisanja koda: proba na 200 odrednica + spisak 50 reči gde bi se
redosled promenio, na pregled vlasnici.

## 3. ČEKA ODLUKU VLASNICE (ne raditi bez „da")

- **N-18** 38 zareza ispred „pa" (kućno pravilo; Pravopis dozvoljava).
- **Politika `?rec=`** (15.500 indeksiranih dinamičkih adresa guše 1.991 statičkih) — posle brojeva iz GSC.
- **S6** jedan red rima u beležnici na telefonu (nameran; 3 od 16 vidljivo).
- **V2 sinonimi** — vlasnica SAMA pregleda `AUDIT/sinonimi/SINONIMI-ZA-PREGLED.txt` (deo A = 54 na sajtu, deo B = 787); kad kaže „pregledano“ → skripta koja čita fajl.
- **Ostatak zamene strana** (60 + 60) posle probe 15→19 i GSC 22.09.
- **Futer na telefonu kraći** samo ako se prikazuje manje reči (odluka o sadržaju).
- **Reč dana** – njen utisak; sledeći korak broj igrača dana (worker).
- **Prijava „pitanja/mržnja“ 06.09.** u sanduču (sesijska proba) – obrisati uz „da“.
- **Login** (Google + mejl preko Supabase-a, organizacija Orbita Code; Apple kad bude Developer nalog na njeno ime) — sinhronizacija beležnice/omiljenih/istorije, politika privatnosti, brisanje naloga, praćenje samo uz kvačicu.

## 4. STARI SREDNJI I NISKI KOJI OSTAJU

S2 („Sve … N reči"), S3 (4.119 reči bez rečnika), S4 (`perje`), S5 (skip link, = S-25), S9 (velika slova u adresi → hub), N1–N11 iz audita 20.08. (v. `AUDIT/2026-08-20-audit.md`).
