# Memory — Rimoteka (25. jul 2026)

> Beleške za buduće AI sesije. Pročitaj pre rada na projektu.

---

## Ključne odluke i razlozi

### 1. Editor sa obojenim rimama — `contenteditable` umesto `textarea`
- **Zašto:** `textarea` ne podržava bojenje delova teksta. `contenteditable` div omogućava HTML sa span-ovima.
- **Kako:** `noteEditor` (contenteditable) za prikaz, `noteInput` (sakriven textarea) za čuvanje u localStorage.
- **Problem:** pozicija kursora se gubi pri renderovanju → rešeno sa `saveCursorPosition`/`restoreCursorPosition`.
- **Performanse:** debounce 150ms na input event da ne renderuje na svaki keystroke.

### 2. Bojenje rima — `rhymeKey` (savršena rima), ne `looseKey` (asonanca)
- **Zašto:** `looseKey` je previše široko — sve reči na isti samoglasnik se boje, što je neupotrebljivo.
- **Korisnička odluka:** eksplicitno odobreno da koristimo `rhymeKey`.
- **Moguća budućnost:** dodati i `looseKey` kao opciju sa drugom bojom ili opacity.

### 3. Dark mode — inline script u `<head>`
- **Zašto:** bez inline script-a, stranica se učita u svetlom modu pa "skoči" u tamni (flash effect).
- **Kako:** `(function(){ if(localStorage.getItem('rimoteka_dark')==='1') document.body.classList.add('dark-mode'); })();`

### 4. Service worker — v2, manje agresivan
- **Problem:** v1 je keširao sve stranice, uključujući i `/blebecete` — korisnik je dobijao pogrešnu stranicu.
- **Rešenje:** v2 kešira samo osnovne fajlove, ne stranice sa query parametrima ni `/rime-za/` stranice.
- **Napomena:** može zahtevati hard refresh (Cmd+Shift+R) da se ažurira.

### 5. "Učitavanje rečnika" dugme — uklonjeno
- **Zašto:** delovalo neprofesionalno, a rečnik se učitava dovoljno brzo.

### 6. Rečnik — uklonjene neispravne reči
- `bajunete` — neispravna reč (korisnička odluka), uklonjena iz `reci.txt` i `definicije.json`.
- `bidete` — uklonjena samo iz rima za `dete` (kontekstualno isključenje, ne globalno brisanje).

---

## Tehnički detalji koji se lako zaborave

### Struktura beležnice
```html
<div class="notepad">
  <div id="noteGutter" class="gutter"></div>
  <div id="noteEditor" class="notepad-text" contenteditable="true"></div>
  <textarea id="noteInput" style="display:none"></textarea>
</div>
```

### Bojenje rima — algoritam
1. Na `input` event → debounce 150ms
2. `analyzeRhymes(text)` → grupiše poslednje reči po `rhymeKey`
3. Samo grupe sa 2+ reči se boje
4. `renderColoredText(text)` → generiše HTML sa `<span class="rhyme-word" style="color:...">`
5. `saveCursorPosition` pre renderovanja, `restoreCursorPosition` posle

### Paleta boja
```javascript
const RHYME_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#d35400', '#c0392b', '#16a085',
  '#8e44ad', '#2980b9', '#27ae60', '#f1c40f', '#e91e63',
  '#00bcd4', '#4caf50', '#ff9800', '#673ab7', '#009688'
];
```

### Dark mode varijable
```css
body.dark-mode {
  --lavender:#b8a5f5; --lavender-deep:#8a6de8;
  --ink:#e8e6f5; --ink-soft:#b8b0d8;
  --paper:#1a1628; --line:#3a3450;
  --shadow:0 8px 24px rgba(0,0,0,.4);
}
body.dark-mode { background:#121018; }
```

---

## Šta korisnica očekuje (komunikacija)

- **Brzo odgovaranje** — ne čekati previše, biti direktan
- **Prava rešenja, ne precice** — ako treba da menjamo arhitekturu, menjamo
- **Profesionalan UX** — svaki detalj mora biti doteran
- **Ne čekati odobrenje za svaku sitnicu** — ali za produkciju (push/merge) uvek pitati
- **Lokalni preview pre push-a** — uvek pokazati šta je urađeno pre deploy-a

---

## Šta još nije urađeno (bitno)

1. **Stripe/PayPal integracija** — Pro modal je samo struktura
2. **AdSense** — čeka Google odobrenje
3. **Cloud čuvanje** — pesme se čuvaju samo lokalno (localStorage)
4. **Export u PDF/DOCX** — samo TXT za sada
5. **Dečji režim** — toggle koji filtrira neprikladne rime
6. **Mobilna aplikacija** — PWA je prvi korak

---

## Korisni linkovi
- **GitHub:** https://github.com/Orbita-Code/rimoteka
- **Produkcija:** https://rimoteka.com
- **Coolify:** https://panel.orbitacode.com
- **GA4:** G-F88VM8CWBQ

---

*Poslednje ažuriranje: 25. jul 2026.*
