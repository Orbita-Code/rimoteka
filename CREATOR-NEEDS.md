# Šta kreatori traže od alata za rime — analiza potreba

> Istraženo: 25. jul 2026.
> Izvori: Reddit (r/Songwriting, r/makinghiphop, r/Poetry, r/OCPoetry, r/serbia), blogovi (thesongwritergospel, rhymeflux, Mary Kole, Institute for Writers), direktna analiza konkurenata.

---

## Rezime — najveće neiskorišćene prilike

| Prioritet | Funkcija | Zašto je važno | Ko je traži |
|-----------|----------|----------------|-------------|
| **1** | Kvalitetne near/slant/family rime bez šuma | Savršene rime su dosadne; near rime su zakopane ili prljave | Tekstopisci, reperi, pesnici |
| **2** | Editor sa rimama na klik (bez tab-switchinga) | Tab-switch ubija creative flow | Tekstopisci, reperi |
| **3** | Brojač slogova + metar + rhyme-scheme po liniji | Konzistentan metar je veći problem od rime | Pesnici, autori dečjih knjiga, reperi |
| **4** | Čuvanje listi po projektu + export/deljenje | Rad na pesmama je projekat, ne pojedinačna pretraga | Svi |
| **5** | Offline + mobilna aplikacija | Inspiracija dolazi van kuće | Svi, posebno srpsko tržište |
| **6** | Multi-word / mosaic rime | Reperi ih vole, WikiRhymer ih ima | Reperi |
| **7** | Pretraga po fonetskim porodicama | "Kad se pevaju zajedno, zvuči dobro" | Songwriters |
| **8** | Sinonimi + srodne reči u istom toku | Pomaže kod pisanja, ne samo rimovanja | Pesnici, pisci |
| **9** | Rime za decu / edukativni filter | Jedini alati na svetu su EN + Rimoteka | Roditelji, učitelji, autori dečjih pesama |
| **10** | Podrška za više jezika | Globalna publika | Svi |

---

## 1. Kvalitetne near/slant/family rime — najveća boljka

### Problem
- **RhymeZone:** near rime su zakopane ispod savršenih i pune neupotrebljivih reči (npr. "fly" → "bnt i", "Sukhothai").
- **AZRhymes:** ima vokalne rime i near rime, ali bez filtera "reči koje se stvarno koriste".
- **Rimovanje.com:** nema near rime uopšte.

### Šta kreatori traže
- "Želim rime koje bih stvarno koristio, ne egzotične reči koje zvuče slično."
- "Family rhymes" — rime organizovane po suglasničkim porodicama (plozivi t/b/d/g/p/k + isti vokal). Crosspostovano na r/Songwriting, r/WeAreTheMusicMakers, r/Poetry.
- Rangiranje po zvučnoj bliskosti, ne samo po leksičkoj bliskosti.

### Što mi već imamo
- ✅ `loose_key` (asonanca) — šire rime
- ✅ Rangiranje po `common_suffix` i frekvenciji
- ⚠️ Ali nema grupisanja po "zvučnoj bliskosti" ni filtera za "korisne reči"

### Preporuka
- **Dodati "Bliske rime" grupu** — reči koje se rimuju po asonanci, ali su česte i korisne.
- **Dodati filter "Samo česte reči"** — koristiti frekvenciju iz `reci.txt` kao rang.

---

## 2. Editor sa rimama na klik — najveći UX gap

### Problem
- Svaka pretraga rime = novi tab/pretraga. Kreator gubi flow.
- RhymeFlux: "svaka rima je tab-switch koji ubija kadencu."

### Šta kreatori traže
- **Obojene rime uživo** dok kucaš (kao Rhymer's Block).
- **Rime na klik** u bočnom panelu bez napuštanja editora.
- **Preslagivanje linija** — drag & drop redosleda stihova.

### Što mi već imamo — ZAVRŠENO (27. jul 2026)
- ✅ **Faza 1 — rime uz belešku:** rime se prikazuju za reč **na kojoj stoji kursor**
  (ne samo za poslednju reč pesme), klik na rimu je ubacuje u stih.
- ✅ **Faza 2 — obojene rime uživo**, sa sonantnosnom tolerancijom (*sat/grad*).
- ✅ **Faza 3 — drag & drop stihova:** hvataljka `⠿` u gutteru, radi mišem i prstom,
  sa linijom koja pokazuje gde stih pada; posle premeštanja se sve preračuna.
- ✅ **Panel rima uz editor:** bočno na desktopu, prikačen za dno ekrana na telefonu.
  (Ranije je panel počinjao ~170 px ispod pregiba na 390×844, pa se u praksi nikad
  nije video — funkcija je postojala, ali je bila nevidljiva.)

---

## 3. Brojač slogova + metar + rhyme-scheme

### Problem
- Autori dečjih knjiga: "najčešće greške su nekonzistentan metar, a ne rima."
- Reperi: "treba mi brojač slogova po liniji i beat grid."
- Pesnici: "treba mi skandiranje i rhyme scheme analiza."

### Što mi već imamo
- ✅ Brojač slogova po reči (`count_syl`)
- ✅ Grupisanje rima po broju slogova
- ✅ **Faza 1 — brojač slogova po stihu** u gutteru beležnice (poravnat i kad se stih prelomi)
- ✅ **Faza 3 — šema rime** (27. jul 2026): slovo A/B/C pored svakog stiha u beležnici,
  bledo za stih koji se ni sa čim ne rimuje; u statistici piše šema prve strofe
  sa nazivom (npr. „ABAB (ukrštena rima)").
- ✅ **Faza 2 — metar** (27. jul 2026): dugme „prikaži metar" u beležnici crta ritam
  svakog stiha — naglašen / nenaglašen / **nepoznat** slog, plus cezura kod
  deseterca (4+6) i dvanaesterca (6+6), naziv stiha (osmerac, deseterac…) i
  koliko stihova odstupa od preovlađujuće dužine.

> **Zašto postoji oznaka „ne znamo":** iz oblika reči sigurno se zna samo da
> poslednji slog nikad nije naglašen, da jednosložna reč (osim klitika) nosi
> akcenat i da je kod dvosložne akcenat na prvom slogu. Kod reči od tri i više
> slogova mesto akcenta se ne može izvesti bez akcentovanog rečnika — pa se ti
> slogovi prikazuju kao nepoznati umesto da se nagađaju.
> Sledeći korak ako se nabavi akcentovani rečnik: zameniti „nepoznato" tačnim akcentom.

---

## 4. Čuvanje listi + export/deljenje

### Problem
- Kreatori rade na projektima (pesme, albumi, knjige). Trebaju liste rima po projektu.
- RhymeZone/AZRhymes/Rimovanje nemaju ni favoriti ni export.

### Što mi već imamo
- ✅ Omiljene reči (♥) u `app.js`
- ⚠️ Ali bez projekata, bez exporta, bez deljenja.

### Preporuka
- **Faza 1:** "Sačuvaj listu" — naziv liste + rime.
- **Faza 2:** Export u TXT/CSV.
- **Faza 3:** Deljenje liste linkom.

---

## 5. Offline + mobilna aplikacija

### Problem
- Inspiracija dolazi van kuće. Web-only alati su ograničeni.
- RhymeZone naplaćuje offline. Rhymer's Block hvaljen zbog offline.
- Na srpskom tržištu: niko nema mobilnu aplikaciju.

### Što mi već imamo
- ✅ Statički sajt — može se keširati kao PWA.
- ⚠️ Ali nema PWA manifesta, nema service worker-a.

### Preporuka
- **Faza 1:** PWA (Progressive Web App) — instalira se na telefon, radi offline.
- **Faza 2:** Native mobilna aplikacija (React Native / Flutter).

---

## 6. Multi-word / mosaic rime

### Problem
- Reperi vole višerečne rime (npr. "crvena jabuka" → "dobrog čoveka").
- WikiRhymer i Rhyme Genie ih imaju, ali kvalitet neujednačen.

### Što mi već imamo
- ⚠️ Nemamo multi-word pretragu.

### Preporuka
- **Faza 1:** Pretraga fraza koje se rimuju (npr. uneseš dve reči, dobiješ parove).
- **Faza 2:** Generator "mosaic rime" — spaja više reči u rimu.

---

## 7. Pretraga po fonetskim porodicama

### Problem
- Songwriters traže "family rhymes" — rime po suglasničkim porodicama.
- AZRhymes ima fonetske filtere, ali ne eksplicitne "family" grupe.

### Što mi već imamo
- ✅ `rhyme_key` baziran na samoglasnicima.
- ⚠️ Ali nema grupisanja po suglasničkim porodicama.

### Preporuka
- **Faza 1:** Grupisanje rime po "porodicama" — npr. "t/d/n + a", "p/b/m + a".
- **Faza 2:** Vizuelni prikaz fonetskih porodica.

---

## 8. Sinonimi + srodne reči

### Problem
- Pesnici i pisci trebaju ne samo rime, već i sinonime i srodne reči.
- RhymeZone ima sve; AZRhymes i Rimovanje nemaju ništa.
- r/serbia potvrđuje potražnju za srpskim sinonimima.

### Što mi već imamo
- ✅ `definicije.json` — definicije reči.
- ⚠️ Ali nema sinonima ni srodnih reči.

### Preporuka
- **Faza 1:** Dodati sinonime iz `definicije.json` (ako postoje u definicijama).
- **Faza 2:** Integrisati srpski tezaurus (ako postoji open-source).

---

## 9. Rime za decu / edukativni filter

### Problem
- Jedini alati na svetu su Rhyme Desk Kids (EN) i Rimoteka (SR).
- Roditelji, učitelji, autori dečjih pesama traže bezbedne rime.

### Što mi već imamo
- ✅ `BLOCKED` filter za neprikladne reči.
- ✅ `RHYME_EXCLUSIONS` za kontekstualna isključenja.
- ✅ `/rime-za-decu/` stranica.

### Preporuka
- **Faza 1:** Istaknuti "Rime za decu" kao glavnu nišu.
- **Faza 2:** Dodati "Dečji režim" toggle koji filtrira sve neprikladne rime.
- **Faza 3:** Edukativni sadržaj — kako pisati dečje pesme, vodiči za roditelje.

---

## 10. Podrška za više jezika

### Problem
- Globalna publika traži alate na maternjem jeziku.
- AZRhymes jedini globalni sa srpskim.

### Što mi već imamo
- ✅ Srpski (ekavica + jekavica).
- ⚠️ Ali samo srpski.

### Preporuka
- **Faza 1:** Hrvatski (jekavica već postoji).
- **Faza 2:** Engleski (ogromno tržište, ali zaseo domen).
- **Faza 3:** Ostali jezici (slovenski, bugarski, makedonski).

---

## Preporučeni redosled implementacije

### Urađeno
- ✅ Bliske rime (asonanca) · ✅ brojač slogova po stihu · ✅ PWA · ✅ dečji režim
- ✅ Editor sa rimama na klik · ✅ obojene rime uživo · ✅ čuvanje listi + export
- ✅ Sinonimi (`sinonimi.json`) · ✅ drag & drop stihova · ✅ šema rime u beležnici

- ✅ Metar (ritam stiha, cezura, vrsta stiha)

### Sledeće
1. **Akcentovani rečnik** — da metar zameni „ne znamo" tačnim akcentom kod reči od 3+ sloga.
2. **Multi-word rime** — fraze koje se rimuju.
3. **Fonetske porodice** — grupisanje po suglasničkim porodicama.
4. **Mobilna aplikacija** — React Native / Flutter.
5. **Engleski jezik** — zaseban domen ili poddomen.

---

*Analiza ažurirana: 27. jul 2026.*
