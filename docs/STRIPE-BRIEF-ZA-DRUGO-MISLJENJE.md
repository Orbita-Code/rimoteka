# Rimoteka Pro — Stripe integracija: stanje i otvorena pitanja

Tražim drugo mišljenje o arhitekturi i o otvorenim odlukama navedenim na kraju.
Tekst je opis zatečenog stanja, bez preporuka.

---

## 1. Kontekst

**Prodavac:** autónoma (samostalna preduzetnica) registrovana u Španiji, poreski
rezident Španije. Posluje pod imenom OrbitaCode. Prihod: pretplate na sopstvene
web alate + izrada sajtova po narudžbini za klijente.

**Proizvod:** rimoteka.com — web alat za pronalaženje rima i brojanje slogova na
srpskom jeziku. Namenjen pesnicima, tekstopiscima i reperima.

**Cilj:** uvesti plaćeni „Pro" nivo.
- 3 EUR mesečno i 30 EUR godišnje
- Kupci: pretežno fizička lica (B2C) u Srbiji i EU, moguće i van EU
- Pro pogodnosti na startu: bez reklama, Pro oznaka, prioritetna podrška
- Tri dodatne funkcije su najavljene ali NISU napravljene: napredna analiza
  stiha, čuvanje pesama u oblaku, izvoz u PDF/DOCX

**Poslovni kontekst:** isti Stripe nalog treba kasnije da opslužuje i druge
sajtove istog vlasnika.

---

## 2. Zatečeno tehničko stanje

**Sajt rimoteka.com:**
- Potpuno statički: vanilla HTML/CSS/JS, bez ijednog frameworka
- Statične stranice se generišu Python skriptom
- Servira se nginx-om iz Docker kontejnera na Coolify (self-hosted, Hetzner)
- **Nema backend uopšte**
- **Nema prijavu korisnika ni bilo kakav identitet** — sve stanje (omiljene reči,
  beleške, podešavanja) je u localStorage
- **Ne koristi Supabase ni bilo kakvu bazu**
- nginx ima strog Content-Security-Policy: `connect-src 'self'` plus Google
  Analytics domeni; `script-src 'self'` plus googletagmanager
- AdSense je dodat u kod ali čeka odobrenje Google-a. Napomena: AdSense skripta
  je sa domena koji trenutni CSP ne dozvoljava, pa bi bila blokirana
- Deploy: GitHub push u `main` → Coolify automatski deployuje
- Statički fajlovi se keširaju 7 dana, pa se verzija menja preko `?v=` parametra

**Stripe nalog:**
- Novootvoren, naziv „Orbita Code"
- Povezan je u LIVE režimu
- **Nula poreskih registracija** (`/v1/tax/registrations` je prazan)
- Nema nijedan Product ni Price
- API ključevi postoje ali nisu nigde konfigurisani

---

## 3. Šta je već napravljeno (kod je napisan i testiran, nije deployovan)

### 3.1 Backend — Node.js + Express, zaseban servis

Rute:
- `POST /api/auth/request` — prima email, šalje link za prijavu
- `POST /api/auth/session` — proverava token iz linka, postavlja sesijski kolačić
- `POST /api/auth/logout`
- `GET  /api/status` — vraća da li je korisnik Pro
- `POST /api/checkout` — pravi Stripe Checkout sesiju (traži prijavu)
- `POST /api/portal` — pravi Stripe Customer Portal sesiju (traži prijavu)
- `POST /api/webhook` — prima Stripe evente
- `GET  /api/health`

Implementirano:
- Verifikacija Stripe webhook potpisa nad sirovim (raw) telom zahteva;
  `express.raw()` je registrovan pre `express.json()`
- Idempotencija webhook-a: svaki `event.id` se upisuje u tabelu, duplikati se
  preskaču
- Pro status se čita isključivo sa servera. localStorage se koristi samo kao keš
  za brzo iscrtavanje i ne utiče na pristup
- Sesija: sopstveni potpisan JWT u httpOnly kolačiću (30 dana)
- Ograničenje broja zahteva za slanje mejla (5 na 15 minuta, po mejlu i po IP)
- `automatic_tax` je iza environment flag-a i **podrazumevano je isključen**;
  servis pri pokretanju upisuje upozorenje u log dok je isključen
- `current_period_end` se čita i sa Subscription objekta i sa stavki pretplate,
  jer je od API verzije `basil` premešten na stavke
- Obrađeni eventi: `checkout.session.completed`,
  `customer.subscription.created/updated/deleted`, `invoice.payment_failed`

Testirano lokalno (svih 6 provera prošlo): health vraća 200; `/api/status` bez
prijave ne otkriva podatke; `/api/checkout` i `/api/portal` bez prijave vraćaju
401; webhook sa lažnim potpisom vraća 400; neispravan email vraća 400.

### 3.2 Frontend

- Pro modal u tri koraka: prijava mejlom → izbor plana → prikaz aktivne pretplate
- Obrada povratka sa linka iz mejla (token u URL fragmentu)
- Obrada povratka sa Stripe Checkout-a (`?pro=success` / `?pro=cancel`)
- Posle uspešnog plaćanja status se proverava 6 puta na po 1,5 s, jer webhook
  ponekad stigne posle korisnika
- Pro korisniku se sakrivaju reklame; keširani status se primenjuje pre prvog
  iscrtavanja da ne bi bilo treperenja
- Dugme za Stripe Customer Portal (otkazivanje, promena kartice, fakture)
- Cena promenjena sa 2,99 EUR na 3 EUR, dodat godišnji plan 30 EUR, dodata
  napomena da cena uključuje PDV
- Tri nenapravljene funkcije su u modalu označene oznakom „uskoro"

Testirano u Chromium-u: modal se iscrtava ispravno, nema JavaScript grešaka;
jedina konzolna greška je očekivani 404 na `/api/status` jer backend nije
pokrenut lokalno, i kod je obrađuje bez pucanja.

### 3.3 Odabrana Stripe arhitektura

- Stripe-hosted Checkout (redirect), bez Stripe.js na frontendu
- Flat-rate cenovni model: jedan Product, dva Price-a
- Naplata odmah pri prijavi, bez probnog perioda
- Stripe Customer Portal za samostalno otkazivanje
- Stripe Smart Retries za neuspele naplate
- Fakture za pretplate se generišu automatski; ručno fakturisanje kroz Dashboard
  predviđeno za klijente kojima se radi izrada sajtova

---

## 4. Utvrđene činjenice koje utiču na odluke

1. **Stripe Tax ne javlja grešku kad nema registracije.** Ako se
   `automatic_tax` uključi bez aktivne poreske registracije, Stripe ne vraća
   grešku nego naplati 0 EUR poreza. Trenutno na nalogu nema nijedne
   registracije.

2. **Union OSS ne pokriva sve.** Prema Stripe dokumentaciji, OSS pokriva
   prekograničnu B2C prodaju unutar EU kroz jednu prijavu, ali ne pokriva
   domaću prodaju ni B2B; domaća registracija u matičnoj zemlji je i dalje
   potrebna.

3. **rimoteka.com ne može da šalje mejlove.** DNS pokazuje Porkbun email
   forwarding (MX `fwd1.porkbun.com`, SPF `include:_spf.porkbun.com`). To
   prosleđuje dolaznu poštu ali ne omogućava slanje.

4. **Podaci o pretplati već postoje u Stripe-u.** Stripe Customer nosi email, a
   Subscription nosi status i datum isteka perioda.

5. **Statement descriptor.** Statični deo descriptora je 2–10 znakova, ukupno sa
   dinamičkim sufiksom najviše 22 znaka, u formatu `PREFIKS* SUFIKS`.

6. **Jedan Stripe nalog i više poslovnih linija.** Prema Stripe dokumentaciji,
   pod jednim pravnim licem moguće je voditi više poslovnih linija; posebni
   nalozi se traže kada su u pitanju različita pravna lica sa različitim
   poreskim brojevima.

---

## 5. Otvorene odluke — tražim mišljenje o svakoj

### Odluka A: da li je potrebna baza podataka

Trenutna implementacija koristi Supabase (PostgreSQL) za dve stvari: čuvanje Pro
statusa i slanje mejla za prijavu preko Supabase Auth.

- **Opcija A1 — zadržati bazu.** Pro status se čuva lokalno u tabeli, webhook je
  sinhronizuje sa Stripe-om. Brz odgovor na proveru statusa. Zahteva
  sinhronizaciju, idempotenciju, podešavanje RLS-a i održavanje još jednog
  servisa.
- **Opcija A2 — bez baze.** `GET /api/status` pita Stripe API direktno (nađi
  kupca po mejlu, proveri ima li aktivnu pretplatu). Nema kopije podataka i nema
  sinhronizacije. Svaka provera statusa je poziv ka Stripe API-ju (~200 ms),
  moguće ublažiti kešom u memoriji. Zavisi od dostupnosti Stripe API-ja.

Napomena za razmatranje: jedna od najavljenih funkcija je čuvanje pesama u
oblaku, koja bi zahtevala bazu, ali nije napravljena i nema rok.

### Odluka B: čime slati mejl za prijavu

Slanje mejla je neophodno za prijavu magic linkom, a domen trenutno ne može da
šalje.

- **Opcija B1 — Resend.** Besplatno do 3.000 mejlova mesečno, šalje sa sopstvenog
  domena, zahteva dodavanje DNS zapisa.
- **Opcija B2 — Zoho.** Već se koristi za drugi domen istog vlasnika, zahteva
  dodavanje rimoteka.com kao domena.
- **Opcija B3 — Supabase Auth.** Ugrađeno slanje, ali na besplatnom nivou
  ograničeno na nekoliko mejlova na sat i šalje sa Supabase domena.
- **Opcija B4 — neki drugi provajder.**

### Odluka C: način identifikacije korisnika

Sajt trenutno nema prijavu. Odabran je magic link, ali tražim proveru te odluke.

- **Opcija C1 — magic link na email.** Korisnik upiše mejl, dobije link, klikne.
  Radi na svim uređajima. Zahteva servis za slanje mejla.
- **Opcija C2 — licencni kod na email.** Posle plaćanja stiže kod koji korisnik
  unese na sajtu. Ne zahteva sesiju, ali se kod može deliti i korisnici ga gube.
- **Opcija C3 — nešto treće.**

### Odluka D: kada uključiti `automatic_tax`

- **Opcija D1** — lansirati bez naplate PDV-a i uključiti porez kasnije, kad
  registracije budu aktivne.
- **Opcija D2** — ne lansirati dok španska IVA registracija i Union OSS ne budu
  aktivni i upisani u Stripe.

Ovo je poresko pitanje i konačnu reč ima poreski savetnik; zanima me tehnički i
rizični aspekt redosleda.

### Odluka E: standardni Checkout ili Managed Payments

Stripe nudi „Managed Payments" za prodavce isključivo digitalnih pretplata, gde
Stripe preuzima porez, prevare i usklađenost. Zanima me da li se za prodavca iz
Španije sa niskom cenom (3 EUR) to isplati u odnosu na standardni Checkout, i
kako se razlikuju provizije i poreske obaveze.

### Odluka F: prikaz nenapravljenih funkcija

Modal je prvobitno reklamirao pet funkcija, od kojih tri ne postoje. Trenutno su
te tri označene sa „uskoro".

- **Opcija F1** — ostaviti ih sa oznakom „uskoro"
- **Opcija F2** — ukloniti ih dok ne budu napravljene
- **Opcija F3** — odložiti lansiranje dok se ne naprave

### Odluka G: gde se izvršava backend

- **Opcija G1** — zaseban Coolify servis, nginx proksira `/api/` ka njemu
- **Opcija G2** — jedan kontejner sa nginx-om i Node-om zajedno
- **Opcija G3** — serverless funkcija kod nekog provajdera

Napomena o okruženju: server ima ukupno 3,7 GB RAM-a i na njemu već radi više
sajtova, svaki sa postavljenim memorijskim limitom.

### Odluka H: statement descriptor za više brendova

Isti Stripe nalog treba da opslužuje više sajtova. Pitanje je kako podesiti
descriptor tako da kupac na izvodu kartice prepozna baš onaj sajt na kom je
platio, uz ograničenje od 22 znaka ukupno.

---

## 6. Šta konkretno tražim

1. Ocenu arhitekture opisane u odeljku 3 — šta bi bilo pogrešno ili krhko.
2. Mišljenje o svakoj odluci od A do H, sa obrazloženjem.
3. Sve što je propušteno: bezbednosni, poreski, pravni ili UX rizik koji ovde
   nije naveden.
4. Konkretno za EU: obaveze oko prava na odustanak od digitalne pretplate,
   obaveznih podataka na fakturi i zahteva za lako otkazivanje.
