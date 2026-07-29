# Memory — Rimoteka

> Najnovije je na vrhu.

---

# 28. jul 2026 — strane po alatu, metar, brojač, čišćenje rečnika

**Sve je na produkciji, 104/104 provere prolaze i protiv `rimoteka.com`.** Commit `2067fe2e`.

## Naučeno (ovo je vredniji deo od spiska funkcija)

**1. `el()` vraća NOOP element, ali NOOP nema roditelja.**
`rimeInput.parentNode.style` je radilo godinu dana jer je svaka strana sa
`app.js` imala polje za rime. Prva strana bez njega (`/slogovi/`) oborila je
CELU skriptu — dakle i brojač na toj strani. Kad praviš stranu sa samo jednim
alatom, proveri šta skripta dira na nivou modula.

**2. Testiraj pravilom koje alat stvarno primenjuje, ne svojim.**
Test igre je tražio savršenu rimu, a igra priznaje savršenu **ili asonancu**.
Test je pao, ja sam „popravio" igru i time joj bez razloga suzio bazen reči.
Pao je bio TEST. Kad test padne, prvo proveri da li je test u pravu.

**3. Heuristika po nastavku laže.** Merenje „koliko padeža fali" dalo je 2.344 —
ali je pokupilo množinu muških imenica (`acetoni`, `adolfi`, `alahi`) i
proglasilo ih dativima. Isto i kod ćelave latinice: od 67 kandidata, 19 su bili
**ispravni imperativi** glagola na -ći (`tuci`, `izvuci`). Uvek proveri uzorak
pre nego što objaviš broj — i pre nego što nešto obrišeš.

**4. Range meri otisak slova, ne linijski okvir.** Između njih je polovina
proreda. Zato su brojevi u gutteru sedeli niže od stiha. Za poravnanje uz tekst
oduzmi half-leading, ili meri na kopiji sa `<div>`-om po redu.

**5. Contenteditable nije uvek odgovor.** Beležnica ga koristi (treba joj
bojenje), ali brojač je ostao `<textarea>` + nevidljiva merna kopija — otporniji
na nalepljivanje i mobilnu tastaturu, a poravnanje jednako tačno.

**6. Verzija keša na JEDNOM mestu.** Bile su tri različite (`index.html`,
`TOOL_SCRIPT`, `HEAD_TMPL`) i korisnica je danima gledala staru skriptu i
mislila da funkcije ne rade.

**7. Tvrdnje na sajtu moraju da izdrže pretragu.** Stajalo je „nema ga nijedan
rimer u svetu" — RhymeZone ima objašnjenja. Za pisanje pesama postoje Versepad,
GoRhyme, RHYMEBOOK, Poem Analysis (engleski). Sme „jedini **na srpskom**".
Brojevi se prebroje u fajlu pa zaokruže **naniže** (278.083 → „preko 270.000").

## Zamke u kodu

- **`.gutter-row` dele brojač i beležnica** — svaki upit vezati za svoj gutter.
- **Traka tabova su linkovi**, ne dugmad. Selektor je `#tabs [data-tab]`.
- **Markup alata se čita iz `index.html`** pri buildu (`panel_html()`), ne
  prepisuje u `gen_pages.py`.
- **Dve sesije u istom folderu** — `git add <putanje>`, nikad `git add -A`.

## Otvoreno

`TODO.md`: dečji režim · nove reči · staging grana · GSC · **4.769 reči ima
objašnjenje ali ih nema u `reci.txt`** · stope (trohej/jamb) čekaju akcentovani
rečnik (kandidati u tački 9a: Vikirečnik prvi).

---

# Memory — 26. jul 2026, 03:00

> **UPOZORENJE:** Ova sesija je imala kritične probleme. Sajt je možda pokvaren. Pročitaj pažljivo pre nastavka.

---

## Šta je urađeno u ovoj sesiji (hronološki)

### 1. Uklonjeno bidete iz rime za dete
- `RHYME_EXCLUSIONS` za reč `dete`: `bidete`, `bide`, `bidi`
- **Status:** ✅ Radi

### 2. Uklonjena neispravna reč bajunete
- Uklonjena iz `reci.txt` i `definicije.json`
- **Status:** ✅ Radi

### 3. SEO i organizacija rima
- 1.988 statičkih stranica `/rime-za/[reč]/`
- Organizacija po broju slogova
- Bliske rime (asonanca)
- **Status:** ✅ Radi

### 4. Tamni režim
- Dugme 🌙/☀️ u header-u
- Inline script u `<head>` (anti-flash)
- **Status:** ⚠️ Možda ne radi zbog CSP

### 5. Editor sa obojenim rimama
- `contenteditable` div umesto textarea
- Boje rima uživo
- **Status:** ⚠️ Možda ima bugova na mobilnom

### 6. PWA
- `manifest.json` + `sw.js`
- **Status:** ⚠️ Service worker možda ne radi zbog CSP

### 7. Pro struktura
- Pro modal sa feature-ima
- **Status:** ❌ Backend nije deployovan — Pro ne radi

### 8. Bliske rime
- `loose_key` grupa na svakoj stranici
- **Status:** ✅ Radi

### 9. Rime na klik u beležnici
- Automatski prikaz rima za poslednju reč
- **Status:** ⚠️ Možda menja URL

### 10. Čuvanje liste + export
- Čuvanje rima u localStorage
- Export u TXT
- **Status:** ✅ Radi

### 11. Mobilne optimizacije
- Tabovi, autocomplete, beležnica, footer, touch targeti
- **Status:** ⚠️ Možda ima bugova

### 12. CSP fix
- Inline scriptovi izmešteni u eksterne fajlove (`dark-mode-init.js`, `sw-register.js`)
- **Status:** ⚠️ Možda ne radi

### 13. Dečji režim
- `KIDS_BLOCKED` lista
- Toggle u UI
- **Status:** ⚠️ Možda ne radi

### 14. Frekvencijski rečnik
- `frekvencija.json` — srLex 1.3, 435.169 reči
- **Status:** ⚠️ Možda blokira učitavanje

### 15. Sinonimi
- `sinonimi.json` — Vikirečnik, 13.505 reči
- **Status:** ⚠️ Možda ne radi

### 16. Igra rima
- Start ekran, tajmer, combo, zvuk, animacije, dostignuća
- **Status:** ❌ Ne radi — dugmad nisu klikabilna

### 17. Cache-busting
- `?v=20260726a/b/c` za `app.js`
- **Status:** ⚠️ Možda ne radi

---

## Kritični problemi (šta je pokvareno)

1. **Rime ne rade na produkciji** — `loadDict()` možda ne završava uspešno, `WORDS` ostaje prazan
2. **Igra ne radi** — dugmad nisu klikabilna, `initGame()` možda uništava start ekran
3. **Dark mode možda ne radi** — CSP blokira inline scriptove
4. **Service worker možda ne radi** — CSP blokira registraciju
5. **Beležnica možda menja URL** — `doRhymes()` bez `silent` parametra
6. **Logo možda pokvaren** — promenjen h1 u div pa vraćen, možda nije ispravno

---

## Šta treba da se uradi (hitno)

### P0 — Sajt ne radi
1. **Vratiti `app.js` na stabilnu verziju** — poslednja poznata stabilna: `ac59c3dc` (SEO i UX poboljšanja)
2. **Proveriti `loadDict()`** — da li završava uspešno, da li `WORDS` ima elemente
3. **Proveriti `doRhymes()`** — da li prikazuje rezultate
4. **Proveriti `index.html`** — da li je ispravan, da li ima grešaka

### P1 — Funkcionalnosti
5. **Igra rima** — testirati svako dugme, svaku funkciju
6. **Dečji režim** — testirati toggle, filtriranje
7. **Sinonimi** — testirati prikaz u rezultatima
8. **Dark mode** — testirati toggle, kontraste

### P2 — Poboljšanja
9. **Eksport teksta pesme** — dodati dugme
10. **Manifest ikona** — popraviti maskable, id, shortcuts
11. **Ćirilica** — prevesti ceo sajt (kasnije)

---

## Kako vratiti stabilnu verziju

Ako sajt ne radi, vrati na poslednju poznatu stabilnu verziju:

```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
git log --oneline -20
# nađi poslednju stabilnu verziju (pre ove sesije)
git checkout ac59c3dc
git checkout -b fix/restore-stable
# testiraj lokalno
# ako radi, merge u main
```

---

## Kontakti
- **GitHub:** https://github.com/Orbita-Code/rimoteka
- **Produkcija:** https://rimoteka.com
- **Coolify:** https://panel.orbitacode.com

---

*Poslednje ažuriranje: 26. jul 2026, 03:00.*

---

# Runde popravki #2 — 26. jul 2026 (beležnica + UI, sesija "rečnik hrane")

> Lokalno završeno i E2E testirano (headless Chromium, `/tmp/rimoteka-debug/test_fixes.js` — sve PASS, 0 pageerrora).
> **NIJE pushovano — čeka testiranje korisnice.**

## Šta je popravljeno (public/app.js, public/index.html, public/style.css)

### 1. P0: Beležnica je guta Entere — REŠENO
- **Pravi uzrok:** kursor ne ume da stoji posle završnog `<br>`-a u contenteditable (Chrome ga klampuje ISPREd preloma). Stari "iOS fix" je proveravao `range.startContainer === noteEditor` što je gotovo nikad tačno (insertNode podeli text node), pa pomoćni `<br>` nikad nije dodat → tekst se kucao PRE preloma → redovi se spajaju.
- **Fix:** (a) pomoćni `<br class="cursor-br">` se dodaje kad god posle novog preloma nema sadržaja; (b) `getEditorText()` je sada deterministički DOM serializer (innerText gubi `<br>` na kraju — Chrome quirk) i preskače `cursor-br`; (c) bojenje rima ide na poseban, sporiji debounce (500ms) od ostatka UI-ja (150ms) — re-render samo kad korisnik zastane; (d) `restoreCursorPosition` za poziciju na kraju teksta obezbeđuje `cursor-br` i stavlja kursor između dva `<br>`-a, a pozicija tačno na kraju text node-a ide u sledeći (posle preloma).

### 2. Rime u beležnici prate kursor — NOVO
- `getCaretTextPos()` + `getWordAtLineCol()` — rime se prikazuju za reč na kojoj je kursor (ili poslednju pre njega u tom redu), ne uvek za poslednju reč pesme. `selectionchange` listener sa 120ms debounce-om.

### 3. Toggle-i sa vizuelnim stanjem
- CSS `:has(input:checked)` na `.loose-toggle` — pill sa gradijentom kad je uključen (šire rime, ijekavica, dečji režim). Bez JS-a.

### 4. Ćirilica za CEO UI
- `toCyr` proširen na velika slova i digrafe Dž/Lj/Nj (ranije: "Rime"→"Rиме"). `applyScriptToUI()` konvertuje tabove, dugmad, labele, option-e, placeholdere, hint tekstove — dvosmerno, bez čuvanja originala. Poziva se na toggle i na load ako je sačuvana ćirilica.

### 5. Sonantnosna tolerancija u bojenju (sat/grad)
- `lenientRhymeKey()` — rhymeKey sa mapiranjem završnog suglasnika (d→t, b→p, g→k, z→s, ž→š). Koristi se SAMO u analyzeRhymes (bojenje u beležnici), ne u pretrazi/gen_pages. Nije looseKey — i dalje savršena rima po izgovoru.
- **PAŽNJA:** mora biti deklarisano IZNAD init bloka beležnice (TDZ — init poziva analyzeRhymes pri loadu; prva verzija je zbog toga oborila ceo script kad localStorage ima pesmu).

### 6. Definicije bez čekanja
- `loadLocalDefs()` se poziva iz `bootstrap()` preko `requestIdleCallback` (preskače se na Save-Data/2g). Prvi hover na ⓘ je trenutan.

### 7. Štampaj / PDF
- Dugme "štampaj / PDF" u beležnici: popuni `#printArea` (naslov = prvi red) i pozove `window.print()`; `@media print` CSS prikazuje samo pesmu.

### 8. Podeli pesmu linkom
- Dugme "podeli link": tekst → base64url u `?pesma=` parametar, kopira u clipboard. `initFromURL` otvara podeljenu pesmu u beležnicu **bez upisivanja u localStorage** (tuđa pesma ne briše tvoju dok ne počneš da kucaš) i sklanja parametar iz URL-a. Limit ~1800 znakova.

## Lekcije
- Contenteditable + ručni `<br>` + re-render = minsko polje. Pravila: serializer umesto innerText; marker klasa za pomoćne elemente; re-render samo na pauzu; kursor posle preloma uvek "sidriti" pomoćnim `<br>`.
- `const` u top-level scope-u koji koriste funkcije pozvane iz init koda = TDZ zamka. Funkcije hoist-uju, const ne.
- Testiraj share-linkove u ZASEBNOM browser kontekstu — isti kontekst deli localStorage i test laže.

## Naslov pesme — posebno polje (26. jul 2026, nastavak)
- Novo opciono polje `#noteTitle` iznad beležnice (`localStorage: rimoteka_notes_title`).
- PDF: naslov dolazi ISKLJUČIVO iz polja — prazno polje = PDF bez naslova (više se ne nagađa prvi red).
- Share link: `&naslov=` parametar pored `?pesma=`. TXT export: naslov + prazan red + pesma.
- "obriši sve" briše i naslov. Placeholder se prevodi ćirilicom (u UI_SCRIPT_INPUTS).
- Gutter poravnanje: `.gutter` mora imati ISTI font-size i line-height kao `.notepad-text` (line-height je relativan na font-size — različiti font-size uz isti line-height = drift koji raste niz stranu). Popravljeno i u mobilnom CSS-u.
