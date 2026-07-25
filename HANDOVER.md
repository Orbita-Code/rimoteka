# Handover — Rimoteka (25. jul 2026)

## Šta je urađeno u ovoj sesiji

### 1. Kontekstualna isključenja rima
- Uklonjeno `bidete` iz rima za `dete` (korisnički zahtev)
- Uklonjena neispravna reč `bajunete` iz rečnika i definicija
- `RHYME_EXCLUSIONS` mehanizam u `app.js` i `gen_pages.py`

### 2. SEO i organizacija rima
- 1.988 statičkih stranica `/rime-za/[reč]/`
- Organizacija rima po broju slogova (Najbolje, Rime sa 1 slogom, Rime sa 2 sloga...)
- Bliske rime (asonanca) na svakoj stranici
- Sitemap sa 2.005 URL-ova

### 3. Editor sa obojenim rimama uživo
- `contenteditable` div umesto textarea
- Reči koje se rimuju se boje istom bojom (20 boja u paleti)
- Koristi `rhymeKey` (savršena rima) — precizno, ne previše široko
- Gutter sa brojem slogova, rime na klik, čuvanje u localStorage
- Rime se boje i pri učitavanju stranice (ne samo pri kucanju)

### 4. Tamni režim
- Dugme 🌙/☀️ u header-u
- Automatska primena pri učitavanju (inline script u `<head>`, bez "flash" efekta)
- Svi elementi imaju dark mode kontraste (FAQ, Pro modal, inputi, chipovi, footer)
- Čuva se u localStorage

### 5. PWA
- `manifest.json` — instalacija na telefon
- `sw.js` — offline rad, manje agresivan keš (v2)

### 6. Monetizacija (struktura)
- Pro dugme u header-u
- Pro modal sa feature-ima: bez reklama, napredna analiza, cloud čuvanje, export PDF/DOCX, prioritetna podrška
- Cena: 2,99 €/mesečno
- Dugme "Podrži jednokratno" — placeholder za Buy Me a Coffee
- **Nije povezano:** Stripe/PayPal integracija (sledeći korak)

### 7. UX poboljšanja
- Uklonjeno "Učitavanje rečnika" dugme (delovalo neprofesionalno)
- Rime na klik u beležnici — automatski prikaz rima za poslednju reč
- Čuvanje liste rima u localStorage + export u TXT
- Autocomplete za pretragu rima

### 8. Dokumentacija
- `CLAUDE.md` — sistemske instrukcije za AI asistente
- `COMPETITIVE-ANALYSIS.md` — analiza konkurencije (rimovanje.com, AZRhymes, RhymeZone)
- `CREATOR-NEEDS.md` — šta kreatori traže od alata za rime

---

## Šta je sledeće (po prioritetu)

### Kratkoročno (1-2 nedelje)
1. **Povezati Stripe/PayPal** za Pro nalog — trenutno je samo struktura
2. **Dodati AdSense** — kada Google odobri sajt
3. **Poboljšati editor** — dodati i `looseKey` kao opciju (šire rime) sa drugom bojom
4. **Testirati editor** na mobilnim uređajima — contenteditable može biti problematičan

### Srednjoročno (1-3 meseca)
5. **Cloud čuvanje pesama** — Supabase ili Firebase backend
6. **Export u PDF/DOCX** — jsPDF ili docx.js biblioteka
7. **Napredna analiza** — metar, ritam, rhyme scheme analiza
8. **Dečji režim** — toggle koji filtrira neprikladne rime

### Dugoročno (3+ meseca)
9. **Mobilna aplikacija** — React Native ili Flutter
10. **Engleski jezik** — zaseo domen ili poddomen
11. **Saradnje** — knjižare, pesnici, kursevi kreativnog pisanja
12. **AI funkcije** — predlozi za poboljšanje pesme, generator stihova

---

## Poznati problemi / ograničenja

1. **Editor:** `contenteditable` može biti problematičan na iOS Safari — testirati
2. **Bojenje rima:** koristi `rhymeKey` (savršena rima) — ne pokriva bliske rime. Može se dodati i `looseKey` kao opcija.
3. **Service worker:** v2 je manje agresivan, ali može zahtevati hard refresh (Cmd+Shift+R) da se ažurira
4. **Pro modal:** nije povezan sa payment procesorom — samo struktura
5. **AdSense:** nije implementiran — čeka Google odobrenje

---

## Kako nastaviti rad

### Lokalni razvoj
```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka/public
python3 -m http.server 8765
# Otvori http://localhost:8765
```

### Regeneracija stranica
```bash
cd /Users/jovana.jovic/Desktop/Projects/rimoteka
python3 build/gen_pages.py
```

### Git workflow
```bash
git checkout -b feat/ime-promene
# izmene
git add -A && git commit -m "feat: opis"
git push -u origin feat/ime-promene
# merge u main nakon odobrenja
```

### Deploy
- Push u `main` → Coolify automatski deployuje
- Proveri: https://rimoteka.com

---

## Ključni kontakti
- **GitHub:** https://github.com/Orbita-Code/rimoteka
- **Produkcija:** https://rimoteka.com
- **Coolify:** https://panel.orbitacode.com
