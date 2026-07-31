# TODO — tekstovi na sajtu

> Spisak svega što na sajtu piše a ne valja, i šta treba da piše umesto toga.
> Rečnik ima svoj spisak u `TODO-RECNIK.md`, ostalo je u `TODO.md`.
>
> **Rešeno se BRIŠE odavde**, ne štriklira — inače sledeća sesija mora da pročita
> zadatak da bi videla da je gotov. Trag ostaje u `HANDOVER.md`.
>
> Nastalo 31.07.2026, iz prijave vlasnice: „ne sviđa mi se ko je pisao taj tekst…
> to nije normalan tekst za sajt, dajemo uput konkurenciji".

---

## PRAVILA ZA SVAKI TEKST NA SAJTU

1. **Narodski i jednostavno.** Svako mora odmah da razume šta dobija i zašto da
   ostane na sajtu. Kratke rečenice (oko 15 reči), obraćanje sa „ti", konkretne
   situacije (rođendanska čestitka, svadba, rep, pesmica detetu) umesto opštih pohvala.
2. **Prva rečenica strane sme da bude pisana za Google** — nju prikazuje u rezultatu
   pretrage. **Sve ostalo je za čoveka.**
3. **Nijedna tvrdnja koju kod ne izvršava.** Pre pisanja se otvori kod koji to radi.
4. **Ne objavljivati podatke o sopstvenom prometu.** „Reči koje se najviše traže" je
   uputstvo konkurenciji.
5. **Ne pisati brojeve koji rastu** (broj reči, broj objašnjenja). Isti tekst stoji na
   oko 2.000 generisanih strana — jedna zastarela cifra postane 2.000 netačnih tvrdnji.
6. **Koristiti ključne fraze:** „rimovanje reči", „rečnik rima", „reči koje se rimuju",
   „rima za pesmu", „brojanje slogova", „rime za decu".
7. **Izmena teksta je izmena rasporeda strane.** Posle svake veće izmene obavezno
   `node test/meri-cls.mjs` — v. `AUDIT/PROPUSTI.md`, pravilo 14.
8. **Ko piše tekst za sajt:** agent `tekstopisac` (`.claude/agents/tekstopisac.md`).
   Tamo su ton, zabranjene fraze i čeklista od 15 tačaka pre predaje.

---

## OTVORENO

### 1. Naslov i opis početne strane — ČEKA 13.08.2026

U opisu početne (`public/index.html:10`) i dalje stoji **„270.000 reči"** — broj koji
raste, po pravilu 5 zabranjen. **Namerno nije promenjen.**

Razlog: vlasnica je 30.07. promenila `<title>`, `meta description` i `og:description`
početne zbog upita `recnik rima` (204 prikaza, **0 klikova**). Merenje traje do
**13.08.2026**. Nova izmena bi poništila merenje i ne bi se znalo šta je delovalo.

**Uraditi posle 13.08.**, kad agent `analitika` očita rezultat:
- skinuti „270.000 reči" iz opisa početne,
- odlučiti na osnovu podataka da li `rečnik rima` ostaje u naslovu ili ne.

### 2. Prazno stanje alata — nije napisano

Pre prve pretrage polje za rime stoji prazno. To je jedino mesto gde čovek saznaje
da sajt ima beležnicu, sinonime i brojač slogova — a tu ništa ne piše.
Nijedan konkurent nema šta da stavi u to polje, jer nema ništa osim spiska rima.

---

## ZAŠTO BAŠ OVE KLJUČNE REČI — izmereno, nije procena

Iz Search Console-a, 30.07.2026 (`AUDIT/analitika/`):

| Upit | Prikaza | Klikova | Šta znači |
|---|---|---|---|
| `rimovanje` | 428 | 5 | najjači upit bez brenda |
| **`recnik rima`** | **204** | **0** | Google nas već pokazuje, niko ne uđe |
| `rečnik rima` (sa kvačicama) | 45 | — | ljudi češće kucaju **bez** kvačica |

> **Nije problem u kvačicama.** Google „recnik" i „rečnik" tretira kao istu reč.
> Problem je bio što te fraze **nije bilo u naslovu** — to je 31.07. rešeno na
> ~2.000 generisanih strana i na tematskim stranama.

**Meriti ponovo za 2–3 nedelje** posle izmene — pre toga se ne zna da li je pomoglo
(`CLAUDE.md`, odeljak 9c).

---

## POSLE IZMENE — obavezno

1. `python3 build/gen_pages.py` (tekstovi žive u generatoru, ne u HTML-u)
2. `node test/meri-cls.mjs` — izmena teksta pomera raspored strane
3. `node test/predeploy.mjs` mora da prođe
4. Posle deploy-a `BASE=https://rimoteka.com node test/predeploy.mjs`
5. Za izmenjene strane u Search Console-u zatražiti ponovno indeksiranje
6. **Zavesti datum izmene** — bez njega se za 3 nedelje ne zna šta je izazvalo promenu
