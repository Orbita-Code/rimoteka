# Konkurentska analiza — Rimoteka

> Istraženo: 25. jul 2026.
> Cilj: razumeti kako konkurencija radi, kako zarađuje, gde su im rupe i kako Rimoteka može da bude inovativna.

---

## Rezime na prvi pogled

| Sajt | Jezik | Stranica po reči | Statičke stranice | Definicije | Deca / filter | Monetizacija |
|------|-------|------------------|-------------------|------------|---------------|--------------|
| [rimovanje.com](https://rimovanje.com) | srpski/hrvatski | `/{reč}` | ✅ | ❌ | ❌ | Baner, oglasni prostor |
| [sr.azrhymes.com](https://sr.azrhymes.com) | srpski | `/?rime={reč}` | ✅ | ❌ | ❌ | Reklame + Pro nalog 2,92 €/mes |
| [rime.com.hr](https://rime.com.hr) | hrvatski | `/?rime={reč}` | ✅ | ❌ | ❌ | Reklame + Pro nalog 2,92 €/mes |
| [rhymezone.com](https://www.rhymezone.com) | engleski | `/r/rhyme.cgi?Word={reč}` | ✅ | ✅ | ❌ | Reklame |
| [igrarecima.com](https://igrarecima.com) | — | — | ❌ (nedostupan) | — | — | — |

---

## 1. Rimovanje.com

### URL struktura
- Početna: `https://rimovanje.com`
- Stranica za reč: `https://rimovanje.com/{reč}` (npr. `/ljubav`)

### Dizajn i UX
- Zastarela Bootstrap 2/3 aplikacija, Tahoma font.
- Početna je jednostavna: logo, polje za pretragu, dugme, tabela poslednjih pretraga.
- **Nema nav menija** — što je dobro.
- Footer sa banerom za "Radio Uživo" i `eXTReMe Tracker`.
- Osnovno responzivno, ali nije moderno.

### Funkcije
- Pretraga rima po reči.
- Prikazuje broj rezultata (npr. "Riječ ljubav se rimuje sa 150 reči!").
- Lista rima u tabeli; svaka reč je link ka svojoj stranici.
- Nema filtera, sortiranja, definicija, čuvanja.

### Monetizacija
- Baner u footeru ka `uzivoradio.com`.
- Placeholder `<!-- mjesto za 728x90 reklame -->`.
- Nema premium modela.

### SEO
- Title: `Rimovanje riječi! Rimovanje.com`
- Meta description: isti na svim stranicama, samo dopunjen rečju.
- Meta keywords prisutni (zastarela praksa).

### Snage
- Exact-match domen (`rimovanje.com`) = najjači SEO signal.
- Čisti URL-ovi po reči (`/ljubav`).
- Jednostavnost — nema ometajućih elemenata.

### Slabosti
- Zastareli dizajn i UX.
- Nema organizacije po slogovima.
- Nema definicija.
- Meta opisi su identični na svim stranicama.
- Slaba mobilna optimizacija.

---

## 2. sr.azrhymes.com (AZRhymes)

### URL struktura
- Početna: `https://sr.azrhymes.com`
- Stranica za reč: `https://sr.azrhymes.com/?rime={reč}`

### Dizajn i UX
- Moderna, responzivna aplikacija.
- Hamburger meni: Prijava, Registracija, O nama, Povratne informacije, tamni režim.
- Desni sidebar sa Pro ponudom i reklamama.
- Postoji "igra rima" (kviz/mini-igra).

### Funkcije
- Pretraga rima.
- Organizacija rezultata **po broju slogova** (2 sloga, 3 sloga...).
- "Vokal rima" / bliske rime.
- Filter "Prikaži strane reči".
- Tabovi: Rime, Primeri, Aliteracije, Konteksti, Lirics (delimično zaključeno za registrovane).
- Tamni režim.
- Nema definicija reči.

### Monetizacija
- **Setupad** / AdSense reklame.
- **Pro nalog**: 2,92 € + PDV/mesec, uklanja reklame.
- AdBlock detekcija sa porukom o registraciji.
- Google Analytics.

### SEO
- Title: `Rečnik rima za tekstopisce, reperiste i pesnike - AZRhymes`
- Description: opisuje pretragu rime, završnice, izraze.
- Stranica reči: `Rime za: ljubav - AZRhymes`
- Schema.org `WebSite` + `SearchAction` markup.

### Snage
- Modern UI, tamni režim, responzivno.
- Organizacija po slogovima.
- Veliki broj rezultata (134 za "ljubav").
- Serverski renderovan sadržaj — dobar za SEO.
- Proven monetizacioni model.

### Slabosti
- URL sa query parametrom (`?rime=`) manje je SEO-prijateljski od čistih path-ova.
- Nema definicija.
- Nema filtera za decu / neprikladne reči.
- "Lirics" loš prevod.

---

## 3. rime.com.hr

### URL struktura
- Početna: `https://rime.com.hr`
- Stranica za reč: `https://rime.com.hr/?rime={reč}`

### Dizajn i UX
- Ista platforma kao AZRhymes, lokalizovana za hrvatski.
- Isti meni, sidebar, Pro ponuda.

### Funkcije
- Identično AZRhymes: rime, slogovi, bliske rime, filter stranih reči, tabovi, tamni režim, igra rima.

### Monetizacija
- Isto: reklame + Pro nalog 2,92 € + PDV/mesec.

### SEO
- Title: `Rječnik rima za tekstopisca, repera i pjesnike - Rime.com.hr`
- Description: sličan kao AZRhymes, hrvatski jezik.
- Stranica reči: `Rime za: ljubav - Rime.com.hr` (190 rezultata).

### Snage
- Najviše rezultata u primeru (190 za "ljubav").
- Hrvatski fokus.
- Isti moderni UI kao AZRhymes.

### Slabosti
- Identična platforma — nema diferencijaciju osim jezika.
- Query-param URL struktura.
- Nema definicija ni dečji filter.

---

## 4. RhymeZone.com

### URL struktura
- Početna: `https://www.rhymezone.com`
- Stranica za reč: `/r/rhyme.cgi?Word={reč}&typeofrhyme=...`

### Dizajn i UX
- Čista, moderna početna sa centralnim pretraživačem.
- **Nema glavni nav meni** — samo footer linkovi.
- Header/footer/right rail reklame.
- Tamni režim.

### Funkcije
- Savršene rime, bliske rime, sinonimi, srodne reči, fraze.
- Definicije sa primerima upotrebe.
- Homophones, similarly spelled words, anagrams.
- Organizacija po slogovima.
- Filteri: "Show rare words", "Show phrases".
- Semantički predlozi: "Nouns for love", "People also search for".

### Monetizacija
- Reklame (header, footer, right rail).
- Google Tag Manager.
- Nema vidljiv Pro nalog.

### SEO
- Title: `RhymeZone rhyming dictionary and thesaurus`
- Svaka reč ima svoju indeksabilnu stranicu.

### Snake
- Najkompletniji alat — rime, definicije, sinonimi, fraze, anagrami.
- Odličan SEO.
- Brz, moderan UI.

### Slabosti
- Samo engleski.
- Kompleksan URL query string.

---

## 5. igrarecima.com

### Status
- **Sajt je nedostupan** (timeout).
- Verovatno napušten konkurent.
- Ako je bio popularan, korisnici su prešli na AZRhymes ili Rimovanje.

---

## Matrica funkcija

| Funkcija | Rimovanje | AZRhymes | Rime.com.hr | RhymeZone |
|----------|-----------|----------|-------------|-----------|
| Statičke stranice po reči | ✅ `/reč` | ✅ `/?rime=reč` | ✅ `/?rime=reč` | ✅ |
| Organizacija po slogovima | ❌ | ✅ | ✅ | ✅ |
| Definicije reči | ❌ | ❌ | ❌ | ✅ (eng) |
| Bliske / vokal rime | ❌ | ✅ | ✅ | ✅ |
| Filter stranih reči | ❌ | ✅ | ✅ | ✅ |
| Sinonimi / srodne reči | ❌ | ❌ | ❌ | ✅ |
| Fraze / konteksti | ❌ | ✅ | ✅ | ✅ |
| Tamni režim | ❌ | ✅ | ✅ | ✅ |
| Registracija / nalog | ❌ | ✅ | ✅ | ❌ |
| Igra / interaktivnost | ❌ | ✅ | ✅ | ❌ |
| Deca / bezbedan filter | ❌ | ❌ | ❌ | ❌ |
| Čuvanje / deljenje listi | ❌ | ❌ | ❌ | ❌ |
| Brojač slogova (zaseban alat) | ❌ | ❌ | ❌ | ❌ |

---

## Prazne niše — šta niko nema

Ovo su glavne prilike za Rimoteku:

### 1. "Rime za decu" / bezbedan režim
Nijedan sajt nema filter koji uklanja nepristojne, vulgarne ili neprikladne reči. Ovo je idealno za:
- roditelje
- učitelje i vaspitače
- decu koja pišu domaći / pesmice

### 2. Definicije reči na srpskom
Samo RhymeZone ima definicije, ali na engleskom. Srpskohrvatski rečnik rima sa značenjima ne postoji.

### 3. Čisti SEO URL-ovi + definicije
AZRhymes koristi `?rime=`, Rimovanje je zastareo. Čist `/{reč}` ili `/rime-za/{reč}` sa definicijom je jaka prednost.

### 4. Čuvanje omiljenih rima / pesničke liste
Nema funkciju "sačuvaj u omiljene" ili pravljenje personalizovanih lista.

### 5. Deljenje i embed
Nema dugmadi za deljenje na društvenim mrežama ili embed u blogove.

### 6. Brojač slogova kao poseban alat
AZRhymes organizuje po slogovima, ali nema zasebni alat "koliko slogova ima ova rečenica/stih".

### 7. Potpuna ćirilična podrška
AZRhymes ima delimičnu podršku, ali glavna pretraga je latinica. Potpuna ćirilica može biti prednost.

---

## Kako konkurencija zarađuje

1. **Reklame (AdSense / Setupad)** — najčešći model. Zahteva veliki saobraćaj.
2. **Pro nalog bez reklama** — AZRhymes/Rime.com.hr naplaćuju ~2,92 €/mesec. Provereni model.
3. **Baneri / direktna prodaja oglasnog prostora** — Rimovanje.
4. **Affiliate** — niko od analiziranih ne koristi očigledno (npr. linkovi ka knjigama, kursevima pisanja).

---

## Preporuke za Rimoteku

### Kratkoročno (do 3 meseca)
1. **Zadržati ultra-jednostavnu početnu stranu** — to je prednost.
2. **Nastaviti sa `/rime-za/{reč}/` statičkim stranicama** — bolje od `?rime=` URL-a.
3. **Istaknuti "rime za decu"** kao glavnu nišu — niko drugi to nema.
4. **Dodati definicije reči** na stranicama rima — jedinstveniji sadržaj.
5. **Napraviti `/slogovi/`** kao zaseban alat — slabija konkurencija.

### Srednjoročno (3-12 meseci)
6. **Organizacija rima po broju slogova** — standard kod konkurencije.
7. **Bliske rime / rime po završnici** — proširiti alat.
8. **Tamni režim** — moderno očekivanje korisnika.
9. **Omiljene rime / čuvanje liste** — korisno za pesnike.
10. **Deljenje rezultata** — organski rast.

### Dugoročno (1+ godina)
11. **Pro nalog bez reklama** — kada saobraćaj dovoljno poraste.
12. **Engleski jezik** — ogromno tržište, ali zaseo domen ili poddomen.
13. **Saradnje:**
    - sa knjižarama (affiliate ka pesničkim zbirima)
    - sa kursevima kreativnog pisanja
    - sa edukativnim sajtovima / udžbenicima
    - sa piscima / pesnicima (gostujući saveti, featured reči)
14. **Dodatni alati:** generator stihova, analiza metra, rima po završnici, fraze koje se rimuju.

---

## Naša diferencijacija (jedna rečenica)

> **Rimoteka je najbrži, najčišći srpski alat za rime — jedini sa bezbednim režimom za decu, definicijama reči i SEO-stranicama za svaku reč.**

---

*Analiza ažurirana: 25. jul 2026.*
