# Akcenti iz Wiktionary-ja – pokrivenost (04.10.2026)

| Šta | Koliko |
|---|---|
| zapisa u izvodu (sve vrste) | 70309 |
| osnova sa akcentom | 28934 |
| zapisa bez upotrebljivog akcenta | 10824 |
| naših oblika u `reci.txt` | 282180 |
| naših oblika koje srLex zna da svede na osnovu | 224491 (80%) |
| različitih osnova naših oblika | 42569 |
| od toga osnova sa akcentom u Wiktionary-ju | 17590 (41%) |
| **naših oblika koji dobijaju akcenat** (preko osnove ili direktno) | **132877 (47%)** |
| naših oblika koji su sami odrednica sa akcentom | 22219 |

Mesto akcenta od kraja reči (1 = poslednji slog): {1: 1258, 2: 10673, 3: 13456, 4: 3078, 5: 385, 6: 56, 7: 9, 8: 1, 9: 3, 10: 10, 11: 5}

## Pravilo „akcenatska jedinica" (predlog 04.10.2026, simulacija `scripts/akcenti-simulacija.py`)

Rima počinje od naglašenog sloga. Kod UZLAZNOG akcenta ton prelazi na sledeći slog, pa kad iza naglašenog ima bar dva sloga,
rima počinje od sloga iza njega: telèvīzor → „-izor", dìrektor → „-ektor", ambàsādor → „-ador" (nije rima sa televizor).
Silazni akcenat ne prelazi: stvȃrima → „-arima" (nije prava rima sa ríma → „-ima"); ȉznenāda → nema prave rime na „-ada".

Odakle ključ za svih 282.180 oblika: Wiktionary direktno 22.219 · preko osnove (srLex) 110.656 · pravilo za 1–2 sloga 15.659 ·
predviđeno po završetku 33.354 · podrazumevano (ženska rima od pretposlednjeg sloga) 100.244.
Izvor podataka: kaikki.org izvod engleskog Wiktionary-ja (CC BY-SA), `~/Literatura/wiktionary/kaikki-sh.jsonl` (384 MB, 04.10.2026).
