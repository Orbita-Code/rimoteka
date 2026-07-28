# TODO — Rimoteka (sajt i alati)

> Rečnik ima svoj spisak u `TODO-RECNIK.md`. Ovde je sve ostalo.
> Poslednje ažuriranje: 28. jul 2026.

---

## 1. Pregledati reči koje dečji režim isključuje

**Zašto:** „Dečji režim" je naša najveća prednost — niko drugi na srpskom nema
filtrirane rime za decu. Ako lista propusti neprikladnu reč, gubimo poverenje
roditelja i učitelja; ako izbaci previše, deca ostaju bez sasvim običnih reči.

**Šta treba:**
- Ispisati celu `KIDS_BLOCKED` listu iz `public/app.js` i pročitati je red po red
- Odvojiti: (a) opravdano isključene, (b) nepotrebno isključene, (c) fali a treba isključiti
- Proveriti i `BLOCKED` (globalna lista, važi i van dečjeg režima)
- Posle izmena: proveriti rime za par tipičnih dečjih reči (mama, tata, kuca, maca, sunce)

**Ko odlučuje:** vlasnica. Claude priprema listu, ne briše i ne dodaje sam.

---

## 2. Pregledati nove reči iz rečnika

**Zašto:** Pogrešna reč u rečniku je gora od reči koja fali — izlazi kao „rima"
i kvari poverenje u alat. Vidi `GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`.

**Šta treba:**
- Proći `RECNIK-NOVE-RECI.md` i `RECNIK-PREDLOG*.md` (rad druge sesije)
- Za svaku novu reč: postoji li stvarno u srpskom, i ima li definiciju
- Posebno paziti na oblike koje je generator izveo iz nastavka (obrazac
  „bankomam / njakam / mladoturke")

**Već urađeno 27–28.07.:** obrisano 48 ćelavih latinica (`zmurke` → `žmurke`),
obrisana `mladoturke`, dodati `tate` i `tati`. Rezervne kopije u scratchpad-u.

---

## 3. Staging grana na GitHubu

**Zašto:** Sada sve ide pravo u `main`, a `main` se automatski deployuje na
produkciju. Nema mesta gde se promena vidi uživo pre nego što je vide korisnici.
Uz to, dve sesije rade paralelno u istom radnom folderu — staging razdvaja rad.

**Šta treba:**
- Napraviti granu `staging` na `Orbita-Code/rimoteka`
- U Coolify dodati drugi resurs: `staging.rimoteka.com` → grana `staging`
- Podesiti da staging ima `noindex` (da Google ne indeksira dvojnik sajta!)
- Tok rada: `feat/…` → `staging` → provera na `staging.rimoteka.com` → `main`
- Dopuniti `CLAUDE.md` sekciju 4.2 novim tokom

**Pažnja:** memorijski limit servera. Produkcijski sajtovi imaju 512 MB,
staging poddomeni 256 MB — vidi tabelu u globalnom `CLAUDE.md`.

---

## 4. Brojač slogova — spojiti unos i rezultat u jedno polje

**Zašto:** Sada se tekst pojavljuje **dvaput** — jednom u polju za unos, drugi put
u listi ispod, gde stoje brojevi. Korisnik čita isti stih dva puta i mora da
premešta pogled gore-dole. Beležnica je taj problem već rešila: brojevi stoje
levo od stiha, u istom okviru.

**Šta treba:**
- Preneti mehanizam gutter-a iz beležnice na `/slogovi/` i tab „Slogovi i znakovi"
- Brojevi slogova levo od svakog reda, u istom okviru gde se kuca
- Na dnu ostaje samo zbir: slogova, reči, karaktera (sa i bez razmaka), redova
- Rešiti gde ide broj znakova po redu (sada je desno u listi) — predlog: na hover
- Zadržati poravnanje i kad se dug red prelomi (već rešeno u beležnici)

**Nije samo lepše:** uklanja duplirani tekst sa strane, što je i SEO plus.

---

## 5. Odluka: `/` ili `/rimovanje-reci/` kao glavna za „rimovanje reči"

Obe strane imaju alat i ciljaju istu frazu — Google bira jednu i razvodnjava
rangiranje. Odluku doneti **tek kad Search Console pokaže** koja od te dve već
dobija prikaze; do tada ne nagađati.

---

## 6. Google Search Console

Tek kad sve gore bude gotovo (izričit dogovor sa vlasnicom):
- submitovati `sitemap.xml` (2.010 URL-ova)
- Request Indexing za nove strane: `/pisanje-pesama/`, `/recnik-srpskog-jezika/`,
  `/klasici/`, `/igra-rimovanja/`, `/slogovi/`
- IndexNow ping (`build/indexnow_ping.py`)

---

## 7. 4.769 reči ima objašnjenje, ali ih nema u rečniku

**Otkriveno 28.07.2026.** `definicije.json` ima 282.852 unosa, a `reci.txt` +
`reci_jekavica.txt` zajedno 278.083 reči. Razlika nisu smeće — to su **prave
srpske reči kojima alat ne može da nađe rimu**, iako im imamo značenje:

`jaglac, plišanac, gurabija, vijača, strižibuba, romobil, sunčić, kovrdžav,
ljutkast, slankast, glancati, stabaoce` …

**Šta treba:** proći listu, potvrditi da je svaka reč ispravna, pa je dodati u
`reci.txt` (definicija već postoji). Time rečnik prelazi 282.000 reči.

**Kako izvući listu:**
```python
import json
reci = set(w.strip() for w in open('public/reci.txt', encoding='utf-8') if w.strip())
jek  = set(w.strip() for w in open('public/reci_jekavica.txt', encoding='utf-8') if w.strip())
defs = json.load(open('public/definicije.json', encoding='utf-8'))
fale = [k for k in defs if k not in reci | jek]
```

---

## 8. Pravilo za tvrdnje u tekstu na sajtu (SEO copy)

Na sajtu su nađene tvrdnje koje ne bi izdržale proveru („nema ga nijedan rimer
u svetu" — RhymeZone ima objašnjenja, na engleskom). Ispravljeno 28.07.2026.

**Pravilo:**
- „jedini/prvi **na srpskom**" — sme, dokazano konkurentskom analizom
- „jedini/prvi **u svetu**" — NE, osim ako imamo dokaz; za pisanje pesama
  postoje Versepad, GoRhyme Lyric Meter, RHYMEBOOK, Poem Analysis (engleski)
- brojevi se **prebroje u fajlu** pa zaokruže NANIŽE (imamo 278.083 → „preko
  270.000"). Nikad naviše — „preko 300.000" bi bilo netačno.

---

## 9. Stopa (trohej, jamb) — čeka akcentovani rečnik

Metar sada meri **broj slogova i cezuru** (deseterac 4+6, dvanaesterac 6+6) —
to je mera srpskog narodnog i klasičnog stiha i ne traži akcenat svake reči.

**Imenovanje stope** (trohej, jamb, daktil, amfibrah, anapest) traži da se za
SVAKI slog zna da li je naglašen. Kod reči od tri i više slogova to se ne može
izvesti iz oblika reči (v. tačku o akcentovanom rečniku i odeljak 7 u
`GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md`) — zato u metru stoji oznaka
„akcenat je na jednom od ovih slogova".

**Kad nabavimo akcentovani rečnik, jednim potezom dobijamo dvoje:**
1. oznaka „ne znamo" nestaje — svaki slog dobija tačan akcenat
2. postaje moguće imenovati stopu i meru (npr. „trohejski osmerac = 4 troheja")

### 9a. Gde tražiti akcentovani rečnik (istražiti)

Bez ovoga stopa ne može, pa je ovo uslov za tačku 9.

- **`akcenat.com`** — postoji kao sajt sa akcentovanim rečima; proveriti da li
  postoji izvoz podataka ili dozvola za korišćenje. Nije mašinski čitljiv izvor
  „iz kutije".
- **Vikirečnik (sr.wiktionary)** — srpskohrvatske odrednice često nose
  akcentovane oblike (нȃћи). Već ga koristimo za `sinonimi.json`, pa postoji i
  postupak za izvlačenje. **Prvi kandidat.**
- **Rečnik Matice srpske** — autoritet, ali nije mašinski čitljiv i nije slobodan.
- **srLex 1.3** — koristimo ga za `frekvencija.json`; proveriti ima li akcenat
  (verovatno nema, ali proveriti pre nego što se odbaci).
- **Univerzitetski/akademski korpusi** — pitati da li postoji otvoren skup sa
  akcentima (npr. korpus savremenog srpskog jezika).

**Pravno:** pre preuzimanja proveriti licencu svakog izvora. Ne preuzimati
sadržaj rečnika koji nije slobodan.

**Redosled posla kad se izvor nađe:**
1. izvući parove `reč → akcentovani oblik` i izmeriti pokrivenost
2. zameniti oznaku „ne znamo" tačnim akcentom u metru
3. tek onda imenovanje stope (trohej, jamb, daktil, amfibrah, anapest)
4. dodati proveru u `test/predeploy.mjs` za svaku novu tvrdnju alata
