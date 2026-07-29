# Prompt za sledeću sesiju

> Kopiraj sve ispod crte i nalepi kao prvu poruku u novoj sesiji.

---

Radiš na projektu Rimoteka: `/Users/jovana.jovic/Desktop/Projects/rimoteka`

Ova sesija je SAMO za popravke posle audita. Bez novih funkcija.

Pročitaj odmah, tim redom:
1. `HANDOVER.md` — prvi odeljak („Sesija 29. jul 2026 (druga)"). Tu je sve što je
   prethodna sesija uradila, i tri stvari koje moraš razumeti pre nego što nastaviš.
2. `AUDIT/NALAZI-OTVORENI.md` — 64 otvorena nalaza, izvor istine.
3. `AUDIT/UPUTSTVO-ZA-POPRAVKE.md` — redosled posla po grupama.
4. `AUDIT/PROPUSTI.md` — 12 pravila izvedenih iz stvarnih promašaja. Naročito
   pravila 3, 4, 8, 9, 10, 11.
5. `CLAUDE.md` projekta — pravilo 8a (logo se ne dira) i 9a (obavezan test).

Zatečeno stanje: grana `fix/audit-grupa1`, tri commita, **ništa nije pushovano**.
Test prolazi 167/167 lokalno.

## Zadatak

**Radi dok ne rešiš i poslednju stavku iz `AUDIT/NALAZI-OTVORENI.md`.**
Ne staješ na pola. Ne ostavljaš „za kasnije" i ne proglašavaš nešto niskim
prioritetom. Kad misliš da si gotov, prebroj koliko je nalaza ostalo u fajlu — ako
nije nula, nisi gotov.

Redosled: nastavi od GRUPE 2 iz radnog naloga (GRUPA 1 je gotova, a K2 i S8 su
takođe odrađeni jer sam ih prijavila usput). Idi po grupama, ne preskači.

Izuzetak koji čeka: iz `AUDIT/DECJI-REZIM-ZA-ODLUKU.md` odobravam **samo Odeljak 1** —
uklanjanje sedam pogrešno blokiranih reči (*pisao, pisa, krvavi, krvava, krvavo,
smetlar, kura*). Liste `BLOCKED` stoje na DVA mesta: `public/app.js` i
`build/gen_pages.py`. Posle izmene obavezno `python3 build/gen_pages.py`.
Ostalo iz tog dokumenta ne diraj — čeka moju odluku.

## Pravila, bez izuzetka

1. **NE PUSHUJ I NE MERGUJ NIŠTA dok ja ne pogledam na lokalu i ne kažem „može".**
   Ni granu, ni `main`, ni „samo dokumentaciju". Radi na grani i komituj lokalno.
2. **Svaka popravka dobija proveru u `test/predeploy.mjs`.**
3. **Novu proveru prvo pusti protiv produkcije DOK JE TAMO STARI KOD**
   (`BASE=https://rimoteka.com node test/predeploy.mjs`). Ako ne padne, provera ne
   valja i mora se prepraviti. Ovo je već dva puta uhvatilo bezvredne provere.
4. **Posle svake popravke otvori sajt i proveri rukama**, ne samo testom. Tri baga
   koja je našla vlasnica nije našao nijedan od 39 agenata, jer sva tri traže da se
   sa alatom zaista radi.
5. **Posle svake grupe pokreni ceo test** (`node test/predeploy.mjs`, izlazni kod 0)
   i **javi mi šta je urađeno**. Ne pitaj me za dozvolu da nastaviš — nastavi.
   Pitaj me samo ako naiđeš na nešto što traži moju odluku (ukus, sadržaj, izgled).
6. **`?v=` se podiže u OBA fajla:** `public/index.html` i `build/gen_pages.py`.
   Trenutno je `20260729a`.
7. **Pre `python3 build/gen_pages.py` uradi `pkill -f http.server`.**
8. **Logo se ne dira** (pravilo 8a). Tiče se nalaza S1 — pročitaj upozorenje uz njega.
9. **Ako otkriješ nešto što nije na spisku** — upiši u `AUDIT/NALAZI-OTVORENI.md`.
   Popravi ga ako je u istoj klasi kao ono što ionako radiš; ako menja izgled sajta,
   prvo mi reci.
10. **Ako otkriješ sopstveni propust** — upiši ga u `AUDIT/PROPUSTI.md`, sa uzrokom
    i pravilom koje sprečava celu klasu takvih grešaka.
11. **Svaku izmenu koja menja IZGLED** (boje, veličine, razmaci) izdvoji u poseban
    spisak i pokaži mi ga — čak i kad je popravka ispravna.

## Kad završiš sve

Daj mi izveštaj u tabelama, sa ovim redom:

1. **Koliko nalaza je zatvoreno, koliko je ostalo** — prebrojano u fajlu, ne iz glave.
2. **Tabela: nalaz → šta je bilo → šta je sada → gde je popravljeno** (fajl:linija).
3. **Merenja, ne utisci.** „kontrast 1,23:1 → 12,4:1", ne „sada se bolje vidi".
4. **Spisak vidljivih promena** koje treba da odobrim, sa uputstvom kako se vraćaju.
5. **Koliko provera ima test sada** i koje su nove.
6. **Šta si našao a nisi popravio, i zašto.**
7. **Šta ostaje meni da odlučim.**

Tek posle mog „može" ide push i merge.
