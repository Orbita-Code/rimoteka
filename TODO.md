# TODO — Rimoteka (sajt i alati)

> Rečnik ima svoj spisak u `TODO-RECNIK.md`, tekstovi na sajtu u `TODO-TEKSTOVI.md`. Ovde je sve ostalo.
> **Poslednje prepisano: 8. septembar 2026.** (posle tri kruga popravki iz audita 07.09.).
> Rešeno se **briše**, ne štriklira. Trag rešenog: `AUDIT/NALAZI-OTVORENI.md` i `HANDOVER.md`.
> Cilj vlasnice: **10/10 na svim dimenzijama**, telefon prvi (većina posetilaca).

## STANJE 08.09.2026

| | |
|---|---|
| Ocena audita | **7,3/10** na dan 07.09. (`AUDIT/2026-09-06-audit.md`); posle 27 zatvorenih nalaza ocena se meri u sledećem auditu, ne prepisuje |
| Test | 53 sekcije, lokalno 804 provera |
| Čeka objavu (grana `fix/audit-0709-drugi-krug`) | baner (tekst vlasnice), A4, A5, S-03, S-04, S-06, S-08–S-13, S-15–S-17, S-20, S-24–S-26, N-01–N-05, N-08–N-10, N-R1 + `nginx.conf` (404 za nepostojeće, keš fontova, CSP bez Google Fonts) + `Dockerfile` (mapa starih adresa) — **push 1 (nginx) OBJAVLJEN 08.09.** (`fix/nginx-404-fontovi` → main, CSP još sa Google Fonts); **push 2 (sajt + sužen CSP) čeka „da"**; posle njega `BASE=https://rimoteka.com node test/predeploy.mjs` |

## 1. ODMAH POSLE OBJAVE

1. **Test protiv produkcije** posle oba pusha (sekcije 51–53 moraju da prođu i tamo; S-06 proverava da nema zahteva ka Google-u — na produkciji to hvata i CSP).
2. **V3 — HSTS na godinu** (`max-age=31536000`) kad prođe par dana bez problema sa 300 s. Zaseban nginx deploy.
3. **S-18 — 229 strana `/rime-za/` sa ≤1 dolaznim linkom** (109 sa nula): blok „srodne reči" po ključu rime tako da svaka strana ima ≥3 dolazna linka. Direktno vezano za GSC „Discovered – not indexed" (1.123).
4. **S-19 — tanke strane** (6 sa <5 rima, 32 sa 5–9): ne generisati stranu ispod 8 rima; stare adrese dodati u `nginx-stare-strane.map` (301 na hub).
5. **S-22 — hub CLS 0,126 na sporoj mreži** (1 merenje): izmeriti 3× (`node test/meri-cls.mjs`) sad kad je font na našem serveru; po potrebi `font-display:optional` za hub.
6. **N-06** upozorenje kad `strane-otisci.json` fali · **N-11** 30 opisa ispod 110 znakova, 2 para duplih · **N-16** filter „5+" u drugi red na 320 · **N-17** `aria-describedby` u prijavi · **N-19** 53 % unosa su uputnice „Oblik reči X".
7. **Sanduče za prijave:** dnevni mejl na `eureka@` sa novim prijavama (cron na Hetzneru + Gmail SMTP iz `server-guard.sh`); atomičan brojač; honeypot bez `proba:true` u odgovoru; ključ pregleda u zaglavlju umesto u URL-u (N-13).
8. **Brzina, ostalo:** brotli prednost nad gzip-om (~45 KB po prvoj poseti, N-14); `ga-init.js` sa `defer`; drugi dolazak kroz service worker izmeriti (audit: ISTEKLO VREME); rime na sporoj mreži izmeriti PRE i POSLE preload-a (`emulateNetworkConditions`, cilj ≤4 s).

## 2. OVOG MESECA — struktura i brzina

16. **S-18 — 229 strana `/rime-za/` sa ≤1 dolaznim linkom** (109 sa nula): blok „srodne reči" po ključu rime tako da svaka strana ima ≥3 dolazna linka. Direktno vezano za GSC „Discovered – not indexed" (1.123).
17. **S-19 — tanke strane** (6 sa <5 rima, 32 sa 5–9): ne generisati stranu ispod 8 rima; 301 na hub već postoji.
21. **S-22 — hub CLS 0,126 na sporoj mreži** (1 merenje): izmeriti 3×, po potrebi `font-display:optional` za hub.
22. **Brzina, ostalo:** brotli prednost nad gzip-om (~45 KB po prvoj poseti); `ga-init.js` sa `defer`; drugi dolazak kroz service worker izmeriti (audit: ISTEKLO VREME).
23. **Sanduče za prijave:** dnevni mejl na `eureka@` sa novim prijavama (cron na Hetzneru + Gmail SMTP iz `server-guard.sh`); atomičan brojač; honeypot bez `proba:true` u odgovoru; ključ pregleda u zaglavlju umesto u URL-u.
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

**Redosled:** posle S-18/S-19 (indeksiranje je veći problem od kvaliteta rime — vidi GSC 1.123
„otkriveno, nije indeksirano"). Pre pisanja koda: proba na 200 odrednica + spisak 50 reči gde bi se
redosled promenio, na pregled vlasnici.

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
