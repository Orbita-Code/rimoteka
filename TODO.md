# TODO — Rimoteka (sajt i alati)

> Rečnik ima svoj spisak u `TODO-RECNIK.md`, tekstovi na sajtu u `TODO-TEKSTOVI.md`. Ovde je sve ostalo.
> **Poslednje prepisano: 7. septembar 2026.** (posle punog audita 7,3/10 i prvog kruga popravki).
> Rešeno se **briše**, ne štriklira. Trag rešenog: `AUDIT/NALAZI-OTVORENI.md` i `HANDOVER.md`.
> Cilj vlasnice: **10/10 na svim dimenzijama**, telefon prvi (većina posetilaca).

## STANJE 07.09.2026

| | |
|---|---|
| Ocena audita | **7,3/10** (`AUDIT/2026-09-06-audit.md`); 20.08. bila 6,2 |
| Test | 50 sekcija; lokalno prolazi; produkcija 717/717 pre poslednjeg kruga |
| Na sajtu (objavljeno 06.09.) | slogovi za velika slova, rečnik bez dvojnika (−488), „Prijavi grešku" + kapsule bez ikonica, baner za kolačiće, pravi `lastmod` |
| Čeka objavu (grana `fix/audit-0709-odmah`) | A1 tastatura u traci, A2 tajmer prijave, A3 320 px, S-01, S-02, S-05, S-14, N-07 + `nginx.conf` (HSTS, zaglavlja na `/sw.js`, keš) — **dva pusha: prvo nginx, pa sajt** |

## 1. ODMAH POSLE OBJAVE — visoko iz audita

1. **A5 — rečnik kreće sa HTML-om, ne posle skripte.** `<link rel="preload" as="fetch" href="/reci.txt?v=…" crossorigin>` u `<head>` (index.html + gen_pages), uz natpis „učitavam rečnik…" na dugmetu dok `WORDS` nije spreman. Izmereno: rime na sporoj mreži 7,0 s, strana „gotova" na 1,3 s. Provera: vreme do rezultata na sporoj mreži ≤ 4 s (sekcija u testu sa CDP usporavanjem).
2. **A4 — igra sa `/igra-rimovanja/` gubi partiju pri prelasku taba.** Sačuvati stanje igre u `sessionStorage` pre napuštanja strane i vratiti ga; ili tabove na stranama alata prebacivati bez punog učitavanja. Provera: partija preživi tab → nazad.
3. **S-04 — igra ne staje kad se ekran sakrije** (`visibilitychange`). Pauza kao pri prelasku taba.
4. **S-11 — dodirni ciljevi 44 px:** filteri slogova (40), kvačice (40/18), odgovori prijave (36), „Pošalji" (42), dugmad banera (40), kapsule u beležnici dok se kuca (42), futer linkovi (16–19, **S-10**), link „Kolačići" (16). Jedan CSS prolaz + provera u testu koja meri sve.
5. **S-12 — prijava na telefonu ne zna za tastaturu:** `.prijava.sheet{bottom:var(--kb,0)}` kao beležnica.
6. **S-13 / S-16 — baner kolačića:** jedan red teksta (sad 25 % ekrana, na 320 pokriva 19 od 25 kapsula), `scroll-padding-bottom` da ne zaklanja fokus, ubaciti na početak `<body>` (sad 93. Tab), Escape = zatvori sa isključenim merenjem.
7. **S-15 — oblačić značenja:** Escape zatvara, `role=tooltip`.
8. **S-08 — statičke `/rime-za/` strane bez puta do „značenje"/„prijavi":** ista traka (`otvoriCipTraku`) za `button.chip-btn` na dodir/prelazak. Uvod tamo obećava „uz svaku piše šta znači".
9. **S-09 — ćirilica ne prebacuje futer, „Rime za druge reči" i naslove kapsula** na statičkim stranama: dopuniti `UI_SCRIPT_SELS`.
10. **S-17 — naslov huba „Rime za sve srpske reči"** → „Rime po rečima — azbučni spisak strana" (`gen_pages.py`); **N-09** „1991 reči" izbaciti (broj koji raste).
11. **N-01 / N-02 / N-03 — kontrasti:** beli tekst na plavom kraju gradijenta 2,76:1 (tamniji kraj gradijenta ili tamniji tekst), napomena u prijavi u tamnoj 4,36, okvir kapsule u svetloj na statičkim 1,97.
12. **N-08 / N-10 — tekstovi:** „180 reči" naspram 250 kapsula (brojati sve grupe ili reći „180 pravih rima"); futer „najčešće reči u pesmama" → „reči koje pesnici često traže" (spisak je ručno biran).
13. **N-04 / N-05 — adresa:** prazno polje briše `?rec=`; upit u `title`/`h1`/kanonikalu seče se na 60 znakova.
14. **N-R1 — grupa „Dobre rime (isti završni slog)"** dobija rečenicu da su to slabije rime (prijava iz sanduča „odeljenja ≠ grižnja").

## 2. OVOG MESECA — struktura i brzina

15. **S-20 — `definicije.json` 5,4 MB na prvi dodir „značenje".** Podeliti po prvom slovu (~30 fajlova) ili po ključu rime; `max-age` godina (adresa nosi otisak). Merilo: prvo značenje na telefonu ≤ 1 s na WiFi.
16. **S-18 — 229 strana `/rime-za/` sa ≤1 dolaznim linkom** (109 sa nula): blok „srodne reči" po ključu rime tako da svaka strana ima ≥3 dolazna linka. Direktno vezano za GSC „Discovered – not indexed" (1.123).
17. **S-19 — tanke strane** (6 sa <5 rima, 32 sa 5–9): ne generisati stranu ispod 8 rima; 301 na hub već postoji.
18. **S-26 — nepostojeća `/rime-za/…` vraća 301 na hub** (974 „Page with redirect" u GSC): 404 sa lepom stranom za slugove koji nikad nisu postojali; 301 samo za obrisane (mapa u `nginx.conf` ili u generatoru).
19. **S-06 — Google Fonts pre pristanka:** samo-hostovati Rubik (`public/fonts/`), skloniti `fonts.googleapis.com` iz CSP-a. I brže je.
20. **S-03 — filter slogova u adresi** (`?slog=2`) i posle F5.
21. **S-22 — hub CLS 0,126 na sporoj mreži** (1 merenje): izmeriti 3×, po potrebi `font-display:optional` za hub.
22. **Brzina, ostalo:** brotli prednost nad gzip-om (~45 KB po prvoj poseti); `ga-init.js` sa `defer`; drugi dolazak kroz service worker izmeriti (audit: ISTEKLO VREME).
23. **Sanduče za prijave:** dnevni mejl na `eureka@` sa novim prijavama (cron na Hetzneru + Gmail SMTP iz `server-guard.sh`); atomičan brojač; honeypot bez `proba:true` u odgovoru; ključ pregleda u zaglavlju umesto u URL-u.
24. **Test — rupe iz audita:** ćirilica × telefon, dečji × telefon, širina 320 u svim mobilnim sekcijama; rubni unosi (prazno+klik, razmaci, 200 znakova, `<script>`, mešano pismo) u `#rimeInput`; zameniti `pauza(N)` posle mrežnih koraka čekanjem na stanje (202 : 61); provere za zatvorene nalaze T4, T8–T14, R1, P10; drugi dolazak kroz SW.
25. **Analitika:** agent `analitika` — zakazano 8. 9. (naslovi od 26. 8.; CTR početne 2,5 % → cilj >4 %; upit „rime" 0 klikova → cilj ≥10) + **klikovi sa `?rec=` adresa** (odluka o politici `?rec=` bez tog broja je nagađanje). Od 06.09. GA broji samo one koji prihvate kolačiće — brojeve pre i posle ne porediti.
26. **Search Console:** posle svake objave `osascript scripts/gsc-zatrazi-indeksiranje.applescript <adresa>` za nove/izmenjene strane (kvota ~10 dnevno); pratiti „Discovered – not indexed" (1.123 na 04.09.).

## 3. ČEKA ODLUKU VLASNICE (ne raditi bez „da")

- **A6** logo 298 KB → 24 KB (128 px verzija; izgled isti) — pravilo „logo se ne dira".
- **P11 / S-23** izgled huba `/rime-za/` (16.153 px, lepljiva azbuka, pretraga) — od 29.07.
- **N-18** 38 zareza ispred „pa" (kućno pravilo; Pravopis dozvoljava).
- **Politika `?rec=`** (15.500 indeksiranih dinamičkih adresa guše 1.991 statičkih) — posle brojeva iz GSC.
- **S6** jedan red rima u beležnici na telefonu (nameran; 3 od 16 vidljivo).
- **V2 sinonimi** — pregled kandidata od 19. reči (`AUDIT/sinonimi/redosled-pregleda.json`), grupe od ~18.
- **Login** (Google + mejl preko Supabase-a, organizacija Orbita Code; Apple kad bude Developer nalog na njeno ime) — sinhronizacija beležnice/omiljenih/istorije, politika privatnosti, brisanje naloga, praćenje samo uz kvačicu.

## 4. STARI SREDNJI I NISKI KOJI OSTAJU

S2 („Sve … N reči"), S3 (4.119 reči bez rečnika), S4 (`perje`), S5 (skip link, = S-25), S9 (velika slova u adresi → hub), N1–N11 iz audita 20.08. (v. `AUDIT/2026-08-20-audit.md`).
