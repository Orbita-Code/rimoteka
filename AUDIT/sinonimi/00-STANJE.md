# Sinonimi – STANJE I KAKO SE RADI (jedini fajl koji se čita prvo)

> Sređeno 17.09.2026 na zahtev vlasnice: „ne mogu da pohvatam šta treba da se pregleda,
> šta je pregledano, šta je na sajtu". Od sada su u ovom folderu SAMO TRI ŽIVA FAJLA.
> Sve ostalo je u `arhiva/` i ne čita se (mašinski spiskovi i stari oblici istog posla).

| Fajl | Šta je | Ko piše |
|---|---|---|
| `00-STANJE.md` | ovaj fajl – brojevi i postupak | Claude, posle svake grupe |
| `02-ODLUKE.md` | dnevnik odluka vlasnice (odobreno / odbijeno sa razlogom) | Claude, u sesiji, dok ona odlučuje |
| `03-RED-ZA-PREGLED.txt` | sve što ČEKA, numerisano, u grupama od 50 | Claude briše pregledanu grupu |
| `public/sinonimi.json` | ŠTA JE NA SAJTU – jedini izvor istine za sajt | Claude, posle svake grupe |

## Brojevi (17.09.2026, prebrojano u fajlovima)

| | Koliko |
|---|---|
| Na sajtu (`public/sinonimi.json`) | **55 reči** – 54 pregledane 28.08. + „prvi" 22.09. |
| Čeka pregled (`03-RED-ZA-PREGLED.txt`) | **904 reči** (grupa 1: 49 čeka odgovor vlasnice na predlog od 17.09.), 19 grupa |
| Od toga vraćeno u red 17.09. | 125 reči iz predloga od 20.08. (serija 1 i 2: duša, noć, kiša, bol, mir…) koje su pri spajanju 08.09. ispale iz spiska – niko ih nije pregledao |
| Bez ijednog predloga, pa nisu u redu | dan, jezero, oblak, poljubac, pravo (odluka 28.08.: nema pravog), ptica, škola – ako vlasnica zna sinonim, dopiše se ručno |

## Postupak za jednu grupu (u razgovoru, ne kroz fajl)

1. Claude uzme sledeću grupu iz `03-RED-ZA-PREGLED.txt` i za svaku reč predloži **najviše 5** sinonima
   (čiste reči, jedna reč, sve u `reci.txt`; bez vrsta pojma – „voda → more" ne; bez izvedenih lica – „rad → radnik" ne).
2. Vlasnica komentariše. **Reč na koju ne kaže ništa = odobreno onako kako je predloženo.**
3. Claude upiše: odluke u `02-ODLUKE.md`, odobreno u `public/sinonimi.json`, obriše grupu iz reda, osveži brojeve ovde.
4. Posle svake grupe: `node scripts/osvezi-verzije-podataka.mjs` (verzija `sinonimi.json?v=` u `app.js`), pa `bash test/lanac-brzi.sh`;
   pun lanac i deploy kad vlasnica kaže (npr. na svakih nekoliko grupa).

## Pravila (već odlučeno, ne otvarati ponovo)

- Sinonim je ono što pesnik može da **zameni u stihu bez promene smisla**. Mašinski sinonim koji to nije – gori je nego da ga nema.
- Na sajtu SAMO čiste reči, bez oznaka i izvora (20.08.).
- Sinonimi **ne ulaze** u traku uz stih u beležnici (prijava Dragana M.) – samo u karticu rezultata.
- Vlasnica je konačni autoritet; njena reč ulazi i kad je Matica nema (keva, lova…). Matica je provera, ne prepis.
- Redosled iz tuđeg izvora se uvek menja; objašnjenja se ne prepisuju (globalno pravilo o tuđim rečnicima).
- Licenca: Vikirečnik CC BY-SA (smemo, uz navođenje); Ćosić i Matica samo kao provera.

## Kad se pregled završi (ideja zapisana u TODO, ne gubiti)

„Sinonim sa proverom rime": uz svaki sinonim u kartici oznaka da li se i ON rimuje sa ostatkom pesme – ključ rime već imamo.
