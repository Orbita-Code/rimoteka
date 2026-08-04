#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Objašnjenja za reči dodate 02–03.08.2026. — nijedna reč ne sme da ostane bez njega.

Pravilo vlasnice: **u rečniku nema reči bez objašnjenja.** Provereno 03.08.2026:
pre dodavanja iz Rečnika Matice bilo je pet takvih reči, posle dodavanja 7.166 —
sve nastale tog dana. Ovo to zatvara u tri koraka:

  1. RUČNO — osnovne reči (imena planeta, praznika, država, gradova, biblijski
     pojmovi i reči sa spiska vlasnice). Pisano reč po reč, ne izvedeno.
  2. IZVEDENO — promenjeni oblici dobijaju „Oblik reči X (…)", gde je X osnovna
     reč, a u zagradi njeno objašnjenje. Osnovnu reč daje srLex.
  3. BRISANJE — šta posle ta dva koraka i dalje nema objašnjenje, izlazi iz
     rečnika. Bolje da reč fali nego da stoji bez značenja; spisak ostaje u
     `AUDIT/MATICA-fali/` pa se vraća kad joj se napiše objašnjenje.

Pokretanje:  python3 scripts/objasnjenja-dopuna.py [--upisi]
"""
import gzip, json, os, re, sys
from collections import defaultdict

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECI = os.path.join(KOREN, 'public/reci.txt')
DEFS = os.path.join(KOREN, 'public/definicije.json')
SRLEX = os.path.expanduser('~/Literatura/srLex/srLex_v1.3.gz')
UPISI = '--upisi' in sys.argv

# Delovi višečlanih imena koji sami ne znače ništa („Novi Sad", „Buenos Ajres").
# `Sad` je uz to i obična reč (prilog „sad"), pa veliko slovo tu pravi grešku.
IZBACI = ['Novi', 'Sad', 'Zeland', 'Buenos', 'Ajres', 'Rio', 'acetisan', 'bljuga']

RUCNO = {
 # ── nebo i planete ──────────────────────────────────────────────────────────
 'Merkur': 'Prva planeta od Sunca, najmanja u Sunčevom sistemu.',
 'Venera': 'Druga planeta od Sunca; na nebu se vidi kao Danica i Večernjača.',
 'Zemlja': 'Treća planeta od Sunca — planeta na kojoj živimo.',
 'Mars': 'Četvrta planeta od Sunca, crvenkaste boje.',
 'Jupiter': 'Peta i najveća planeta Sunčevog sistema.',
 'Saturn': 'Šesta planeta od Sunca, poznata po prstenovima.',
 'Uran': 'Sedma planeta od Sunca, ledeni div.',
 'Neptun': 'Osma i najdalja planeta Sunčevog sistema.',
 'Pluton': 'Patuljasta planeta iza Neptuna; do 2006. vođena kao deveta planeta.',
 'Sunce': 'Zvezda oko koje se okreće Zemlja; izvor svetlosti i toplote.',
 'Mesec': 'Zemljin prirodni satelit; i deo godine od oko trideset dana.',
 # ── praznici, slave i običaji ───────────────────────────────────────────────
 'Božić': 'Hrišćanski praznik rođenja Isusa Hrista.',
 'Vaskrs': 'Hrišćanski praznik Hristovog vaskrsenja; Uskrs.',
 'Uskrs': 'Hrišćanski praznik Hristovog vaskrsenja; Vaskrs.',
 'Đurđevdan': 'Praznik svetog Georgija, 6. maja; česta krsna slava.',
 'Nikoljdan': 'Praznik svetog Nikole, 19. decembra; najčešća krsna slava.',
 'Aranđelovdan': 'Praznik svetog arhanđela Mihaila, 21. novembra; česta krsna slava.',
 'Savindan': 'Praznik svetog Save, 27. januara; slava škola.',
 'Jovanjdan': 'Praznik svetog Jovana Krstitelja, 20. januara.',
 'Petrovdan': 'Praznik svetih apostola Petra i Pavla, 12. jula.',
 'Ilindan': 'Praznik svetog proroka Ilije, 2. avgusta.',
 'Mitrovdan': 'Praznik svetog Dimitrija, 8. novembra.',
 'Lučindan': 'Praznik svetog Luke, 31. oktobra.',
 'Vidovdan': 'Praznik svetog Vita, 28. juna; dan Kosovske bitke.',
 'Spasovdan': 'Praznik Hristovog vaznesenja; slava grada Beograda.',
 'Krstovdan': 'Praznik posvećen Časnom krstu.',
 'Trojice': 'Praznik Svete Trojice, pedesetog dana posle Vaskrsa.',
 'Cveti': 'Praznik nedelju dana pre Vaskrsa, kad se nose grančice vrbe.',
 'Zadušnice': 'Dani kad se u crkvi pominju umrli.',
 'Bogojavljanje': 'Praznik krštenja Hristovog, 19. januara.',
 'Gospojina': 'Praznik posvećen Bogorodici.',
 'Materice': 'Običaj tri nedelje pred Božić, kad se „vezuju" majke.',
 'Detinjci': 'Običaj tri nedelje pred Božić, kad se „vezuju" deca.',
 'Oci': 'Običaj nedelju dana pred Božić, kad se „vezuju" očevi.',
 'badnjačić': 'Mala badnjakova grančica.',
 'polaženik': 'Prvi gost koji na Božić uđe u kuću; položajnik.',
 'svinjokolj': 'Zimski običaj klanja svinje i spremanja mesa za godinu.',
 # ── biblijski pojmovi ───────────────────────────────────────────────────────
 'Isus': 'Isus Hrist, središnja ličnost hrišćanstva.',
 'Hristos': 'Hrist, Pomazanik; ime kojim hrišćani zovu Isusa.',
 'Juda': 'Juda Iskariotski, apostol koji je izdao Isusa.',
 'Marija': 'Bogorodica, Isusova majka; i često žensko ime.',
 'Josif': 'Bogorodičin muž, Isusov staratelj; i muško ime.',
 'Mojsije': 'Prorok koji je Jevreje izveo iz Egipta.',
 'Avram': 'Praotac Izrailja iz Starog zaveta.',
 'David': 'Izrailjski car i psalmopevac; i muško ime.',
 'Solomon': 'Izrailjski car poznat po mudrosti.',
 'Noje': 'Starozavetni pravednik koji je sagradio kovčeg pred potop.',
 'Jerusalim': 'Sveti grad triju vera; glavni grad Izraela.',
 'Vitlejem': 'Grad u kome se, po Jevanđelju, rodio Isus.',
 'Nazaret': 'Grad u kome je Isus odrastao.',
 'Golgota': 'Brdo kod Jerusalima na kome je Hristos raspet; i teška muka.',
 'Vavilon': 'Drevni grad u Mesopotamiji; i slika nereda i pometnje.',
}

# ── DRŽAVE ───────────────────────────────────────────────────────────────────
DRZAVE = {
 'Srbija': 'na Balkanu', 'Hrvatska': 'na Balkanu', 'Slovenija': 'na Balkanu',
 'Makedonija': 'na Balkanu', 'Grčka': 'na jugu Balkana', 'Bugarska': 'na Balkanu',
 'Rumunija': 'u jugoistočnoj Evropi', 'Mađarska': 'u srednjoj Evropi',
 'Albanija': 'na Balkanu', 'Turska': 'između Evrope i Azije', 'Italija': 'u južnoj Evropi',
 'Španija': 'u južnoj Evropi', 'Portugalija': 'na zapadu Evrope',
 'Francuska': 'u zapadnoj Evropi', 'Nemačka': 'u srednjoj Evropi',
 'Austrija': 'u srednjoj Evropi', 'Švajcarska': 'u srednjoj Evropi',
 'Belgija': 'u zapadnoj Evropi', 'Holandija': 'u zapadnoj Evropi',
 'Danska': 'u severnoj Evropi', 'Švedska': 'u severnoj Evropi',
 'Norveška': 'u severnoj Evropi', 'Finska': 'u severnoj Evropi',
 'Island': 'na severu Atlantika', 'Irska': 'na zapadu Evrope',
 'Poljska': 'u srednjoj Evropi', 'Češka': 'u srednjoj Evropi',
 'Slovačka': 'u srednjoj Evropi', 'Ukrajina': 'u istočnoj Evropi',
 'Rusija': 'u Evropi i Aziji', 'Belorusija': 'u istočnoj Evropi',
 'Litvanija': 'na Baltiku', 'Letonija': 'na Baltiku', 'Estonija': 'na Baltiku',
 'Kina': 'u istočnoj Aziji', 'Japan': 'u istočnoj Aziji', 'Koreja': 'u istočnoj Aziji',
 'Indija': 'u južnoj Aziji', 'Pakistan': 'u južnoj Aziji', 'Iran': 'u zapadnoj Aziji',
 'Irak': 'u zapadnoj Aziji', 'Izrael': 'na Bliskom istoku', 'Egipat': 'u severnoj Africi',
 'Maroko': 'u severnoj Africi', 'Alžir': 'u severnoj Africi', 'Tunis': 'u severnoj Africi',
 'Libija': 'u severnoj Africi', 'Nigerija': 'u zapadnoj Africi',
 'Kenija': 'u istočnoj Africi', 'Etiopija': 'u istočnoj Africi', 'Sudan': 'u Africi',
 'Angola': 'u južnoj Africi', 'Mozambik': 'u južnoj Africi', 'Zambija': 'u južnoj Africi',
 'Zimbabve': 'u južnoj Africi', 'Namibija': 'u južnoj Africi',
 'Madagaskar': 'ostrvska država kod Afrike', 'Kanada': 'u Severnoj Americi',
 'Meksiko': 'u Severnoj Americi', 'Kuba': 'ostrvska država u Karibima',
 'Jamajka': 'ostrvska država u Karibima', 'Brazil': 'u Južnoj Americi',
 'Argentina': 'u Južnoj Americi', 'Čile': 'u Južnoj Americi', 'Peru': 'u Južnoj Americi',
 'Bolivija': 'u Južnoj Americi', 'Kolumbija': 'u Južnoj Americi',
 'Venecuela': 'u Južnoj Americi', 'Ekvador': 'u Južnoj Americi',
 'Urugvaj': 'u Južnoj Americi', 'Paragvaj': 'u Južnoj Americi',
 'Australija': 'država i kontinent', 'Indonezija': 'u jugoistočnoj Aziji',
 'Tajland': 'u jugoistočnoj Aziji', 'Vijetnam': 'u jugoistočnoj Aziji',
 'Filipini': 'ostrvska država u jugoistočnoj Aziji', 'Malezija': 'u jugoistočnoj Aziji',
 'Singapur': 'gradska država u jugoistočnoj Aziji', 'Mongolija': 'u istočnoj Aziji',
 'Kazahstan': 'u srednjoj Aziji', 'Avganistan': 'u južnoj Aziji',
 'Sirija': 'na Bliskom istoku', 'Liban': 'na Bliskom istoku', 'Jordan': 'na Bliskom istoku',
}

# ── GRADOVI ──────────────────────────────────────────────────────────────────
GRADOVI = {
 'Beograd': 'glavni grad Srbije', 'Niš': 'grad na jugu Srbije',
 'Kragujevac': 'grad u Šumadiji', 'Subotica': 'grad na severu Vojvodine',
 'Zrenjanin': 'grad u Banatu', 'Pančevo': 'grad u južnom Banatu',
 'Čačak': 'grad u zapadnoj Srbiji', 'Kraljevo': 'grad u središnjoj Srbiji',
 'Kruševac': 'grad u središnjoj Srbiji', 'Užice': 'grad u zapadnoj Srbiji',
 'Valjevo': 'grad u zapadnoj Srbiji', 'Šabac': 'grad u Mačvi',
 'Sombor': 'grad u zapadnoj Bačkoj', 'Vranje': 'grad na jugu Srbije',
 'Leskovac': 'grad na jugu Srbije', 'Zaječar': 'grad u istočnoj Srbiji',
 'Smederevo': 'grad na Dunavu', 'Požarevac': 'grad u istočnoj Srbiji',
 'Loznica': 'grad na Drini', 'Prokuplje': 'grad u Toplici',
 'Priština': 'grad na Kosovu i Metohiji', 'Podgorica': 'glavni grad Crne Gore',
 'Sarajevo': 'glavni grad Bosne i Hercegovine', 'Zagreb': 'glavni grad Hrvatske',
 'Ljubljana': 'glavni grad Slovenije', 'Skoplje': 'glavni grad Severne Makedonije',
 'Sofija': 'glavni grad Bugarske', 'Bukurešt': 'glavni grad Rumunije',
 'Atina': 'glavni grad Grčke', 'Istanbul': 'najveći grad Turske',
 'Budimpešta': 'glavni grad Mađarske', 'Beč': 'glavni grad Austrije',
 'Prag': 'glavni grad Češke', 'Varšava': 'glavni grad Poljske',
 'Berlin': 'glavni grad Nemačke', 'Minhen': 'grad u Nemačkoj',
 'Hamburg': 'grad i luka u Nemačkoj', 'Pariz': 'glavni grad Francuske',
 'Marselj': 'luka na jugu Francuske', 'Lion': 'grad u Francuskoj',
 'Rim': 'glavni grad Italije', 'Milano': 'grad na severu Italije',
 'Venecija': 'grad na vodi u Italiji', 'Firenca': 'grad u Toskani',
 'Napulj': 'grad na jugu Italije', 'Madrid': 'glavni grad Španije',
 'Barselona': 'grad u Kataloniji', 'Lisabon': 'glavni grad Portugalije',
 'London': 'glavni grad Velike Britanije', 'Dablin': 'glavni grad Irske',
 'Amsterdam': 'glavni grad Holandije', 'Brisel': 'glavni grad Belgije',
 'Kopenhagen': 'glavni grad Danske', 'Stokholm': 'glavni grad Švedske',
 'Oslo': 'glavni grad Norveške', 'Helsinki': 'glavni grad Finske',
 'Moskva': 'glavni grad Rusije', 'Kijev': 'glavni grad Ukrajine',
 'Petrograd': 'grad u Rusiji na Nevi', 'Njujork': 'najveći grad Sjedinjenih Država',
 'Vašington': 'glavni grad Sjedinjenih Država', 'Čikago': 'grad u Sjedinjenim Državama',
 'Boston': 'grad u Sjedinjenim Državama', 'Toronto': 'najveći grad Kanade',
 'Havana': 'glavni grad Kube', 'Kairo': 'glavni grad Egipta',
 'Kejptaun': 'grad u Južnoafričkoj Republici', 'Najrobi': 'glavni grad Kenije',
 'Tokio': 'glavni grad Japana', 'Peking': 'glavni grad Kine',
 'Šangaj': 'najveći grad Kine', 'Seul': 'glavni grad Južne Koreje',
 'Delhi': 'grad u Indiji', 'Mumbaj': 'najveći grad Indije',
 'Bangkok': 'glavni grad Tajlanda', 'Sidnej': 'najveći grad Australije',
 'Melburn': 'grad u Australiji',
}

OSTALO = {
 'kalorifer': 'Uređaj koji greje prostoriju toplim vazduhom.',
 'kafemat': 'Aparat koji sam pravi i toči kafu.',
 'tostirati': 'Zapeći hleb u tosteru.',
 'kibernetika': 'Nauka o upravljanju i vezama u mašinama i živim bićima.',
 'bioenergetika': 'Učenje o životnoj energiji i njenom uticaju na zdravlje.',
 # ── sa spiska vlasnice ──────────────────────────────────────────────────────
 'aplikativan': 'Koji se može primeniti, upotrebljiv.',
 'aplikator': 'Sprava kojom se nešto nanosi ili primenjuje.',
 'ablendovati': 'Prebaciti duga svetla na kratka.',
 'abrazivno': 'Tako da struže i skida sloj; grubo.',
 'advokatisati': 'Baviti se advokaturom; zastupati nekoga.',
 'aerosnimak': 'Snimak zemljišta iz vazduha.',
 'aerostatika': 'Nauka o mirovanju vazduha i tela u njemu.',
 'aerotransport': 'Prevoz vazdušnim putem.',
 'afirmativnost': 'Osobina onoga što potvrđuje i podržava.',
 'asertivnost': 'Sposobnost da se svoje mišljenje kaže jasno, a bez napada.',
 'afrikanistika': 'Nauka o jezicima i kulturama Afrike.',
 'aforistika': 'Umeće pisanja aforizama.',
 'aforističan': 'Kratak i oštrouman, kao aforizam.',
 'afrokubanac': 'Kubanac afričkog porekla.',
 'after': 'Provod posle provoda, u ranim jutarnjim satima.',
 'afta': 'Bolna ranica u ustima.',
 'afte': 'Bolne ranice u ustima.',
 'agnostičar': 'Onaj ko smatra da se o postojanju Boga ne može znati.',
 'akati': 'Izgovarati „a"; oglašavati se glasom a.',
 'akcelerirati': 'Ubrzati, dati veću brzinu.',
 'aknuti': 'Kratko uzviknuti „a".',
 'akobogda': 'Ako Bog da — izraz nade da će nešto uspeti.',
 'akrobatkinja': 'Žena koja izvodi akrobacije.',
 'akterka': 'Žena koja učestvuje u nekom događaju.',
 'akušerka': 'Babica, sestra koja pomaže pri porođaju.',
 'akumulativnost': 'Osobina onoga što se gomila i sabira.',
 'alarmantnost': 'Osobina onoga što uzbunjuje i traži hitnu pažnju.',
 'arlaukati': 'Otegnuto zavijati; vikati iz sveg glasa.',
 'arlauknuti': 'Jednom zavijati ili viknuti iz sveg glasa.',
 'alergičnost': 'Sklonost ka alergiji; preosetljivost.',
 'alkos': 'Onaj ko preterano pije; pijanica.',
 'alogično': 'Bez logike, protivno razumu.',
 'alpinistkinja': 'Žena koja se penje na planine.',
 'ambarić': 'Mali ambar.',
 'androgeneza': 'Razviće ploda samo iz muške nasledne osnove.',
 'anegdotica': 'Kratka i mila anegdota.',
 'animalnost': 'Životinjska strana u čoveku, nagon.',
 'antialkoholičarka': 'Žena koja se bori protiv pijanstva.',
 'apotekarev': 'Koji pripada apotekaru.',
 'apsolventkinja': 'Studentkinja koja je odslušala sve godine studija.',
 'arabika': 'Vrsta kafe blažeg i finijeg ukusa.',
 'robusta': 'Vrsta kafe jačeg ukusa i sa više kofeina.',
 'aromatičnost': 'Osobina onoga što lepo miriše.',
 'aseksualnost': 'Nepostojanje polne privlačnosti prema drugima.',
 'aseksualna': 'Ona koja ne oseća polnu privlačnost.',
 'atentatorka': 'Žena koja izvrši atentat.',
 'akcionarka': 'Žena koja ima akcije u preduzeću.',
 'autolimar': 'Majstor koji ispravlja i menja limariju na automobilu.',
 'autolimarstvo': 'Zanat ispravljanja limarije na automobilima.',
 'avanturica': 'Mala, bezazlena avantura.',
 'bebasta': 'Ona koja izgledom ili ponašanjem podseća na bebu.',
 'bebasto': 'Na način koji podseća na bebu.',
 'bagrenje': 'Bagremova šuma ili više bagremova zajedno.',
 'bokalčić': 'Mali bokal.',
 'baksuzirati': 'Donositi nesreću; kvariti sreću drugome.',
 'balavander': 'Balavac, derište.',
 'balkončić': 'Mali balkon.',
 'bambadava': 'Sasvim uzalud, badava.',
 'banalizirati': 'Svesti na banalno, obesmisliti.',
 'banjati': 'Kupati, umivati; banjati dete.',
 'bapnuti': 'Iznenada i nesmotreno reći.',
 'barapčina': 'Velika baraba, mangup.',
 'bandažirati': 'Previti zavojem.',
 'batinica': 'Mala batina, štapić.',
 'batinetina': 'Velika i teška batina.',
 'bauljav': 'Koji se kreće nespretno, pipajući.',
 'bauljava': 'Ona koja se kreće nespretno, pipajući.',
 'bazičnost': 'Osobina onoga što je bazno; suprotno od kiselosti.',
 'bepče': 'Sasvim malo dete; beba.',
 'beriberi': 'Bolest koja nastaje od nedostatka vitamina B1.',
 'besavesno': 'Bez savesti, bezobzirno.',
 'beskičmena': 'Ona koja nema kičmu; i ona koja nema čvrst stav.',
 'besplanski': 'Bez plana, nasumice.',
 'besvesnost': 'Stanje bez svesti; nesvestica.',
 'beziznimnost': 'Osobina onoga što nema izuzetka.',
 'beznadnik': 'Onaj ko je izgubio svaku nadu.',
 'bezubost': 'Stanje bez zuba.',
 'bezveznjakuša': 'Žena koja govori i radi bez veze.',
 'bezvoljnik': 'Onaj ko nema volje ni za šta.',
 'bezvučnost': 'Osobina glasa koji se izgovara bez zvuka.',
 'bećarski': 'Koji je kao u bećara — neženja i veseljaka.',
 'bikčić': 'Mali bik, junčić.',
 'bildovati': 'Vežbati sa tegovima radi mišića.',
 'bilder': 'Onaj ko vežba sa tegovima radi mišića.',
 'bilderka': 'Žena koja vežba sa tegovima radi mišića.',
 'bilingvalan': 'Koji govori dva jezika; dvojezičan.',
 'bilingualan': 'Koji govori dva jezika; dvojezičan.',
 'bioenergetičar': 'Onaj ko leči radom sa životnom energijom.',
 'bioenergetičarka': 'Žena koja leči radom sa životnom energijom.',
 'birotehnika': 'Sredstva i mašine za kancelarijski rad.',
 'biserak': 'Mali biser.',
 'bičar': 'Onaj ko pravi bičeve ili ih koristi.',
 'bičarka': 'Žena koja pravi bičeve ili ih koristi.',
 'blagorečivost': 'Osobina onoga ko govori blago i lepo.',
 'blagoveštenski': 'Koji se odnosi na Blagovesti.',
 'blento': 'Priglup, trapav čovek.',
 'blenta': 'Priglupa, trapava osoba.',
 'blentava': 'Priglupa i trapava.',
 'blesa': 'Blesava osoba.',
 'blesonja': 'Blesav čovek.',
 'blindirati': 'Oklopiti, zaštititi debelim limom ili staklom.',
 'brljava': 'Ona koja radi aljkavo i brlja.',
 'venecijaneri': 'Zavese od tankih letvica koje se podižu i okreću.',
 'bljucnuti': 'Naglo izbaciti malo tečnosti iz usta.',
 'bova': 'Plutajući znak na vodi koji označava put ili opasnost.',
 'aranđelovdan': 'Praznik svetog arhanđela Mihaila, 21. novembra; česta krsna slava.',
}

for ime, gde in DRZAVE.items():
    RUCNO[ime] = 'Država %s.' % gde
for ime, sta in GRADOVI.items():
    RUCNO[ime] = '%s%s.' % (sta[0].upper(), sta[1:])
RUCNO.update(OSTALO)

# ── izvođenje objašnjenja za promenjene oblike ───────────────────────────────
SLOVA = set('abcčćdđefghijklmnopqrsštuvwxyzž')
oblik_leme = defaultdict(set)
with gzip.open(SRLEX, 'rt', encoding='utf-8', errors='replace') as f:
    for red in f:
        d = red.split('\t')
        if len(d) < 2:
            continue
        o, l = d[0].strip(), d[1].strip()
        if not o or set(o.lower()) - SLOVA:
            continue
        oblik_leme[o].add(l)

reci = [w.strip() for w in open(RECI, encoding='utf-8') if w.strip()]
defs = json.load(open(DEFS, encoding='utf-8'))
defs.update(RUCNO)

def sazmi(t):
    """Prva rečenica objašnjenja, bez tačke — ide u zagradu."""
    t = re.split(r'(?<=[^0-9])\.\s', t.strip())[0]
    return t.rstrip('.').strip()

izvedeno = 0
for w in reci:
    if w in defs:
        continue
    for lema in sorted(oblik_leme.get(w, ())):
        if lema in defs and lema != w:
            defs[w] = 'Oblik reči %s (%s).' % (lema, sazmi(defs[lema]))
            izvedeno += 1
            break

ostalo = [w for w in reci if w not in defs and w not in IZBACI]
konacne = [w for w in reci if w in defs and w not in IZBACI]

print('ručno napisano:   %d' % len(RUCNO))
print('izvedeno iz osnovne reči: %d' % izvedeno)
print('izbačeno kao deo višečlanog imena ili greška: %d' % len(IZBACI))
print('OSTAJE BEZ OBJAŠNJENJA — briše se: %d' % len(ostalo))
print('rečnik posle: %d reči' % len(konacne))

if UPISI:
    open(RECI, 'w', encoding='utf-8').write('\n'.join(sorted(set(konacne), key=lambda x: (x.lower(), x))) + '\n')
    defs = {k: v for k, v in defs.items()}
    json.dump(defs, open(DEFS, 'w', encoding='utf-8'), ensure_ascii=False)
    izlaz = os.path.join(KOREN, 'AUDIT/MATICA-fali/07-obrisane-bez-objasnjenja.md')
    with open(izlaz, 'w', encoding='utf-8') as f:
        f.write('# Reči obrisane jer nemaju objašnjenje (%d)\n\n' % len(ostalo))
        f.write('> Pravilo vlasnice: u rečniku nema reči bez objašnjenja. Ove su dodate\n')
        f.write('> 02.08.2026. iz Rečnika Matice, a objašnjenje im nije napisano — pa su\n')
        f.write('> vraćene napolje. Spisak stoji da se vrate kad im se napiše značenje.\n\n')
        for w in ostalo:
            f.write('- `%s`\n' % w)
    print('spisak obrisanih:', izlaz)
else:
    print('\n(probni prolaz — ništa nije upisano)')
