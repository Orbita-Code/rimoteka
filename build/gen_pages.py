#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rimoteka — generator statičkih SEO landing strana /rime-za/[rec]/.
Replicira algoritam rime iz public/app.js (rhymeKey, commonSuffix, countSyl),
pravi pun statični HTML (bez JS-a, indeksira se odmah), auto-sitemap i footer linkove.

Pokretanje:  cd build && python3 gen_pages.py
"""
import os, re, json, html
from collections import defaultdict
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, '..', 'public')
BASE = 'https://rimoteka.com'

VOWELS = set('aeiou')

# ---------------- Lingvistika (1:1 sa app.js) ----------------
def vowel_positions(w):
    # 1:1 sa app.js: samoglasnici + slogotvorno „r“ (nosilac sloga: srce, vrt)
    p = []
    for i, ch in enumerate(w):
        if ch in VOWELS:
            p.append(i)
        elif ch == 'r':
            prevV = i > 0 and w[i-1] in VOWELS
            nextV = i < len(w)-1 and w[i+1] in VOWELS
            if not prevV and not nextV:
                p.append(i)
    return p

def rhyme_key(w):
    vp = vowel_positions(w)
    if not vp:
        return w
    last = vp[-1]
    if last < len(w) - 1:
        return w[last:]
    if len(vp) >= 2:
        return w[vp[-2]:]
    return w[last:]

def loose_key(w):
    # Širi ključ (asonanca): od poslednjeg nosioca sloga — 1:1 sa app.js looseKey
    vp = vowel_positions(w)
    if not vp:
        return w
    return w[vp[-1]:]

def final_syl_key(w):
    # 1:1 sa app.js finalSylKey — poslednji slog sa onset suglasnikom (srce -> "ce")
    vp = vowel_positions(w)
    if not vp:
        return w
    last = vp[-1]
    start = last
    if last > 0 and (last - 1) not in vp:
        start = last - 1
    return w[start:]

def common_suffix(a, b):
    n = 0
    while n < len(a) and n < len(b) and a[len(a)-1-n] == b[len(b)-1-n]:
        n += 1
    return n

def count_syl(w):
    c = 0
    for i, ch in enumerate(w):
        if ch in VOWELS:
            c += 1
        elif ch == 'r':
            prevV = i > 0 and w[i-1] in VOWELS
            nextV = i < len(w)-1 and w[i+1] in VOWELS
            if not prevV and not nextV:
                c += 1
    return c

def syllables(w):
    return count_syl(w) or 1

def syl_word(n):
    n = abs(n)
    if n % 10 == 1 and n % 100 != 11:
        return 'slog'
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return 'sloga'
    return 'slogova'

def rec_word(n):
    """„1 reč" / „2 reči" / „51 reč" — u srpskom je oblik vezan za POSLEDNJU cifru."""
    n = abs(n)
    if n % 10 == 1 and n % 100 != 11:
        return 'reč'
    return 'reči'

def koja_se_rimuje(n):
    """Slaganje odnosne rečenice sa brojem: „51 reč KOJA SE RIMUJE",
    „54 reči KOJE SE RIMUJU", „56 reči KOJE SE RIMUJU"."""
    n = abs(n)
    if n % 10 == 1 and n % 100 != 11:
        return 'koja se rimuje'
    return 'koje se rimuju'

def pronadjeno(n):
    """Predikat se slaže sa brojem: „Pronađena je 1 reč", „Pronađene su 3 reči",
    „Pronađeno je 56 reči". Ranije je svuda pisalo „Pronađene su", pa je na
    većini strana stajalo „Pronađene su 56 reči"."""
    n = abs(n)
    if n % 10 == 1 and n % 100 != 11:
        return 'Pronađena je'
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return 'Pronađene su'
    return 'Pronađeno je'

def rima_word(n):
    n = abs(n)
    if n % 10 == 1 and n % 100 != 11:
        return 'rima'
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return 'rime'
    return 'rima'

# ---------------- Slug (transliteracija po pravilu) ----------------
TRANS = {'š': 's', 'š'.upper(): 's', 'č': 'c', 'ć': 'c', 'ž': 'z', 'đ': 'dj'}
def slugify(w):
    out = []
    for ch in w:
        out.append(TRANS.get(ch, ch))
    return ''.join(out)

# ---------------- Kurirana lista tema (ekavica) ----------------
TARGETS = """
ljubav srce duša sreća tuga bol radost nada strast čežnja samoća osećaj
zagrljaj poljubac nežnost želja sanjarenje ljubomora ljubomora
sunce mesec zvezda nebo oblak kiša sneg vetar munja more reka jezero
planina šuma drvo cvet ruža list trava zemlja vatra voda vazduh kamen
pesak talas zora sumrak noć dan jutro veče senka svetlost mrak duga
proleće leto jesen zima vreme godina vek trenutak večnost prošlost
budućnost sadašnjost mladost starost
majka otac sin ćerka brat sestra dete prijatelj dragi draga žena
muškarac devojka momak čovek narod porodica komšija
oči ruka usne kosa lice osmeh suza dlan prst glas dah korak grlo
sloboda istina laž san java misao reč pesma stih priča put cilj
snaga mir rat život smrt sudbina čast ponos vera greh duh um razum
zlato srebro biser dijamant kruna
grad selo kuća dom sokak ulica prozor vrata most zid krov
novac ekipa kralj car borba igra muzika ritam glas droga
anđeo đavo raj pakao molitva krst
vino pesma gitara truba bubanj
strah nada sumnja krivica kajanje oprost
lepota mladost ljubav osmeh
put daljina povratak rastanak susret
# Dečje i porodične reči (nalaz S9): /rime-za/mama/ je vraćalo 404, iako su to
# najtraženije reči za dečje pesmice i za stranu /rime-za-decu/, koja na njih
# upućuje. Sve su provereno u rečniku.
mama tata baka deka maca kuca škola drug drugarica kućica lopta lutka
zeka meda vuk lisica miš patka pile mačka pas ptica riba leptir pčela
igračka slatkiš čokolada sladoled kolač torta rođendan poklon balon
oko uho nos jezik zub
konj pas mačka ptica vuk lav orao golub leptir pčela riba zmija
jabuka kruška šljiva grožđe malina jagoda breskva
hleb so med mleko kafa čaj
kralj kraljica princ princeza vitez
ljubavnik voljena
mir sreća zdravlje
"""
# Redovi koji počinju znakom „#" su objašnjenja za čitaoca, ne meta-reči —
# moraju da otpadnu PRE deljenja na reči, inače bi „Dečje", „porodične" i
# slično ušlo u spisak meta-reči.
TARGETS = ' '.join(r for r in TARGETS.split('\n') if not r.strip().startswith('#')).split()

# ---------------- Učitavanje rečnika ----------------
def load():
    with open(os.path.join(PUB, 'reci.txt'), encoding='utf-8') as f:
        words = [w for w in f.read().split('\n') if w]
    try:
        with open(os.path.join(PUB, 'definicije.json'), encoding='utf-8') as f:
            defs = json.load(f)
    except Exception:
        defs = {}
    return words, defs


def load_izbor():
    """Podaci za IZBOR reči koje dobijaju svoju stranu (nalaz P10).

    Do 30.07.2026. se biralo po ABECEDI — `for w in words` nad `reci.txt`, koji je
    abecedan — pa je 1.577 od 1.988 strana bilo na slovo „a" (`aaa`, `aah`,
    `abadžija`, `abažur`), a `voda`, `hleb` i `sneg` nisu imali stranu. Komentar u
    kodu je tvrdio „frekvencijski rangirane", a `frekvencija.json` se **nije učitavao
    nijednom**.

    Sada se učitavaju tri izvora:
      · frekvencija.json — sabrani brojevi iz srLex-a (popravljeno 30.07., nalaz F1)
      · matica.json      — reči potvrđene kao odrednica u Rečniku Matice srpske
      · GA_RECI          — reči koje su ljudi ZAISTA tražili na sajtu (Google Analytics)
    """
    try:
        with open(os.path.join(PUB, 'frekvencija.json'), encoding='utf-8') as f:
            freq = json.load(f)
    except Exception:
        freq = {}
    # PUN spisak Matičinih odrednica stoji u `build/`, ne u `public/` — u pregledač
    # ide samo mali `public/matica.json` (6.752 reči bez frekvencije, za rangiranje).
    # Pun spisak je 450 KB i nema šta da traži u učitavanju sajta.
    try:
        with open(os.path.join(os.path.dirname(__file__), 'matica-sve.json'), encoding='utf-8') as f:
            matica = set(json.load(f))
    except Exception:
        matica = set()
    # SADRŽAJNE reči (imenica, pridev, glagol, prilog) po oznakama iz srLex-a.
    # Bez ovoga vrh spiska po učestalosti čine `koji`, `što`, `kao`, `ali`, `nije`,
    # `ili` — veznici, zamenice i predlozi. Za njih niko ne traži rimu, a zauzeli bi
    # stotine strana. Istraženo 30.07.2026: strani sajtovi za rime (RHYMEBOOK,
    # Rhyme Buster) vode ODVOJENU statistiku „najtraženije reči“ upravo zato što se
    # ono što pesnik traži ne poklapa sa učestalošću u novinama.
    try:
        with open(os.path.join(os.path.dirname(__file__), 'sadrzajne.json'), encoding='utf-8') as f:
            sadrzajne = set(json.load(f))
    except Exception:
        sadrzajne = set()
    return freq, matica, sadrzajne


# Reči koje su ljudi stvarno tražili na Rimoteci — Google Analytics, očitano 30.07.2026
# (Reports → Engagement → Pages and screens). Ukupno 63 sesije, pa je uzorak mali —
# zato ove reči idu kao OBAVEZNE, a ne kao merilo za rangiranje. Kad se sakupi više
# podataka, spisak se dopunjuje ovde.
# NAPOMENA: GA prikazuje URL (slug), a ne reč — `/rime-za/kisa/` je slug reči
# `kiša`. Ovde idu PRAVE reči, sa kvačicama, jer se traže u `reci.txt`.
GA_RECI = 'kiša anastasija antifona bajka duša kajanje'.split()

# ---------------- HTML delovi (deljeni) ----------------
HEAD_TMPL = """<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-F88VM8CWBQ"></script>
<script src="/ga-init.js?v=1"></script>
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Rimoteka">
<meta property="og:locale" content="sr_RS">
<meta property="og:url" content="{canonical}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{ogdesc}">
<meta property="og:image" content="{base}/og-slika.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Rimoteka — rime, rečnik i slogovi na srpskom jeziku">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{base}/og-slika.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#5a3fd0">
<script src="/dark-mode-init.js?v=3"></script>
<link rel="stylesheet" href="/style.css?v=20260731a">
<script type="application/ld+json">
{schema}
</script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="/" title="Rimoteka — rime, rečnik i slogovi">
    <div class="brand-h"><img src="/logo-icon.png" class="logo-r" alt="R" width="512" height="512"><span class="brand-word">imoteka</span></div>
  </a>
  <div class="script-toggle" id="scriptToggle" title="Prebaci pismo — latinica ili ćirilica">
    <button data-script="lat" class="active">latinica</button>
    <button data-script="cyr">ћирилица</button>
  </div>
  <button class="dark-toggle" id="darkToggle" title="Prebaci tamni režim" aria-label="Tamni režim">🌙</button>
</header>

<!-- Uputstvo se prikazuje SAMO u ćiriličnom režimu (app.js: prikaziUputstvoZaTastaturu).
     Mora da stoji i ovde, na svih 1.988 podstrana — ćirilica se bira jednom i važi
     svuda, pa bi inače uputstvo postojalo samo na početnoj. -->
<div class="kbd-help" id="kbdHelp" hidden>
  <details>
    <summary>Како се куцају српска слова</summary>
    <div class="kbd-help-body">
      <p>Док је изабрана ћирилица, оно што откуцате прелази у ћирилицу само од себе — <code>ljubav</code> постаје <b>љубав</b>, <code>nj</code> постаје <b>њ</b>.</p>
      <p>Слова <b>ч ћ ш ђ ж</b> стоје на истим тастерима као на српском распореду — десно од <kbd>L</kbd> и десно од <kbd>P</kbd>:</p>
      <table class="kbd-map">
        <tr><th scope="row">тастер</th><td><kbd>;</kbd></td><td><kbd>'</kbd></td><td><kbd>[</kbd></td><td><kbd>]</kbd></td><td><kbd>\\</kbd></td></tr>
        <tr><th scope="row">слово</th><td><b>ч</b></td><td><b>ћ</b></td><td><b>ш</b></td><td><b>ђ</b></td><td><b>ж</b></td></tr>
      </table>
      <p>Уз <kbd>Shift</kbd> добијате велика слова: <b>Ч Ћ Ш Ђ Ж</b>.</p>
      <p><b>Апостроф</b> — за „нек’“ и „ил’“: притисните <kbd>'</kbd> <b>двапут заредом</b>. Први пут даје <b>ћ</b>, а други притисак га замени апострофом.</p>
      <p class="kbd-note">Ако сте на рачунару већ пребацили тастатуру на српски распоред, ништа се не мења — тастери и даље дају оно што на њима пише.</p>
    </div>
  </details>
</div>
{tabs_nav}
"""

# Jedna te ista navigacija na svakoj strani sajta. Na početnoj je to traka
# tabova (klik prebacuje bez osvežavanja), ovde su obični linkovi — Google vidi
# istu, doslednu strukturu svuda, a to je uslov za prečice u rezultatima.
TABS = [
    ('rime',      '/rimovanje-reci/', 'Rimovanje reči'),
    ('pretraga',  '/recnik-srpskog-jezika/', 'Rečnik'),
    ('slogovi',   '/slogovi/', 'Brojač slogova i karaktera'),
    ('beleznica', '/pisanje-pesama/', 'Pisanje pesama'),
    ('klasici',   '/klasici/',        'Klasici'),
    ('igra',      '/igra-rimovanja/', 'Igra rimovanja'),
]


def tabs_nav(active=''):
    linkovi = ''.join(
        '<a href="%s" data-tab="%s"%s>%s</a>' % (href, tab, ' class="active"' if tab == active else '', esc(ime))
        for tab, href, ime in TABS)
    return '<nav class="tabs" id="tabs" aria-label="Alati">%s</nav>' % linkovi


FOOTER_TMPL = """<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <img src="/logo-icon.png" class="footer-logo" alt="R" width="512" height="512"><span class="footer-name">imoteka</span>
    </div>
    <p class="footer-desc">Besplatan alat za <strong>rimovanje reči</strong> na srpskom: rečnik rima, rečnik srpskog jezika, brojač slogova i beležnica za pisanje pesama i tekstova.</p>
    <!-- Kontakt stoji U FUTERU, dakle na jednom mestu — a futer je na svakoj strani.
         Do 31.07.2026. ga je imala TAČNO JEDNA strana od 2.016 (`public/index.html`,
         koja se ne generiše odavde), pa ko god je došao sa pretrage na neku od
         1.993 strane sa rimama nije imao gde da vidi adresu. Izmereno, ne
         pretpostavljeno: `grep -rl "info@rimoteka" public/` → 1 strana. -->
    <p class="footer-contact">Za saradnju: <a href="mailto:info@rimoteka.com" class="footer-link">info@rimoteka.com</a></p>
    <nav class="footer-rimes" aria-label="Popularne rime">
      <span class="footer-rimes-label">Popularne rime:</span>
      {poprime}
    </nav>
    <nav class="footer-guides" aria-label="Vodiči">
      <span class="footer-rimes-label">Vodiči:</span>
      <a href="/rimovanje-reci/" class="footer-link">Rimovanje reči</a> · <a href="/slogovi/" class="footer-link">Brojanje slogova</a> · <a href="/vrste-rima/" class="footer-link">Vrste rima</a> · <a href="/kako-napisati-pesmu/" class="footer-link">Kako napisati pesmu</a> · <a href="/rimovanje-za-pocetnike/" class="footer-link">Rimovanje za početnike</a>
    </nav>
    <nav class="footer-guides" aria-label="Namene">
      <span class="footer-rimes-label">Namene:</span>
      <a href="/rime-za-decu/" class="footer-link">Rime za decu</a> · <a href="/rime-za-decu-o-zivotinjama/" class="footer-link">Životinje</a> · <a href="/rime-za-decu-o-prirodi/" class="footer-link">Priroda</a> · <a href="/rime-za-pesmu/" class="footer-link">Rime za pesmu</a> · <a href="/rime-za-rep/" class="footer-link">Rime za rep</a> · <a href="/rime-za-ljubavne-pesme/" class="footer-link">Ljubavne pesme</a> · <a href="/rime-za-rodjendanske-pesmice/" class="footer-link">Rođendan</a> · <a href="/rime-za-svadbu/" class="footer-link">Svadba</a> · <a href="/rime-za-prijatelje/" class="footer-link">Prijatelji</a> · <a href="/rime-za-roditelje/" class="footer-link">Roditelji</a> · <a href="/rime-za-novu-godinu/" class="footer-link">Nova godina</a> · <a href="/rime-za-tugu-i-secanje/" class="footer-link">Tuga i sećanje</a>
    </nav>
    <!-- Isti red kao na početnoj. Ranije je ovde umesto „Sva prava zadržana"
         stajao link „Početna" — dodat radi internog povezivanja, ali je pao u
         red sa autorskim pravima, gde mu nije mesto. Povratak na početnu i
         ovako postoji na dva mesta: logo u zaglavlju i traka alata. -->
    <p class="footer-legal">© 2026 Rimoteka · Sva prava zadržana · Powered by <a href="https://orbitacode.com" target="_blank" rel="noopener" class="footer-link">Orbita Code</a></p>
  </div>
</footer>
<div id="toast" class="toast"></div>
<div id="printArea" aria-hidden="true"></div>
</body>
</html>
"""

def esc(s):
    return html.escape(s, quote=True)

def chip(rword, syl, href):
    return (f'<a class="chip" href="{href}"><span class="word">{esc(rword)}</span>'
            f'<span class="syl" title="{syl} {syl_word(syl)}">{syl}</span></a>')

def rhyme_link(rword, target_slugs):
    sl = slugify(rword)
    if sl in target_slugs:
        return f'/rime-za/{quote(sl)}/'
    return f'/?rec={quote(rword)}'

# Živi alat za rime na tematskoj strani (za sada samo /rimovanje-reci/).
# Koristi ISTI app.js kao početna — namerno, da se dva algoritma za rime nikad
# ne raziđu i da korisnik na obe strane dobije iste rezultate. Bezbedno je jer
# app.js pristupa elementima kroz `el()`, pa elementi koje ova strana nema
# (tabovi, beležnica, igra) samo tiho ne rade.
TOOL_HTML = """  <div class="landing-tool">
    <div class="search-row">
      <input type="text" id="rimeInput" placeholder="upiši reč (npr. ljubav)" autocomplete="off" spellcheck="false">
      <button id="rimeBtn" class="primary">Nađi rime</button>
      <button id="randomBtn" class="ghost" title="Slučajna reč za inspiraciju">🎲</button>
    </div>
    <div class="filters">
      <span class="flabel">Slogova:</span>
      <div class="syl-filter" id="rimeSyl">
        <button data-syl="0" class="active">sve</button>
        <button data-syl="1">1</button>
        <button data-syl="2">2</button>
        <button data-syl="3">3</button>
        <button data-syl="4">4</button>
        <button data-syl="5">5+</button>
      </div>
      <label class="loose-toggle"><input type="checkbox" id="looseToggle"> i šire (slabije) rime</label>
      <label class="loose-toggle"><input type="checkbox" id="jekToggle"> uključi ijekavicu</label>
      <label class="loose-toggle kids-toggle"><input type="checkbox" id="kidsToggle"> dečji režim</label>
    </div>
    <div id="rimeResults" class="results"></div>
  </div>
"""
TOOL_SCRIPT = '<script src="/app.js?v=20260731a"></script>\n'

# Živi brojač slogova i karaktera. Isti ID-jevi kao u tabu „Slogovi i znakovi“,
# pa app.js radi bez ijedne izmene. Rečnik se na ovoj strani i ne skida —
# brojanje slogova je čista funkcija nad tekstom (v. bootstrap u app.js).
# Skriveni deo alata za rime. Beležnica i igra traže rime preko
# #rimeInput/#rimeResults, pa ti elementi moraju postojati i na stranama gde
# sam pretraživač rima nije vidljiv.
HIDDEN_RHYME_HTML = """  <div class="sr-only" aria-hidden="true">
    <input type="text" id="rimeInput" tabindex="-1" autocomplete="off">
    <div id="rimeResults"></div>
  </div>
"""


def panel_html(ime, skriveno_rime=False):
    """Izvuci markup jednog taba iz public/index.html.

    Markup se NE prepisuje ovde — dve kopije istog alata bi se pre ili kasnije
    razišle, pa bi jedna strana tiho izgubila neko dugme. Jedini izvor istine
    je index.html; ovde se samo omotač <section class="tab-panel"> zameni
    običnim blokom, jer izvan početne strane nema tabova.
    """
    with open(os.path.join(PUB, 'index.html'), encoding='utf-8') as f:
        idx = f.read()
    m = re.search(r'<section class="tab-panel" id="panel-%s">(.*?)\n  </section>' % ime, idx, re.S)
    if not m:
        raise SystemExit('gen_pages: ne nalazim panel „%s“ u index.html' % ime)
    blok = '<div class="landing-tool">' + m.group(1) + '\n  </div>'
    return (HIDDEN_RHYME_HTML if skriveno_rime else '') + '  ' + blok + '\n'


def notepad_tool_html():
    return panel_html('beleznica', skriveno_rime=True)


SYL_TOOL_HTML = """  <div class="landing-tool">
    <label class="syl-label" for="sylInput">Upiši ili nalepi tekst — broj slogova stoji levo od svakog reda:</label>
    <div class="syl-box">
      <div id="sylGutter" class="gutter"><div id="sylGutterInner" class="gutter-inner"></div></div>
      <textarea id="sylInput" class="syl-text" placeholder="Upiši reč, stih ili celu pesmu…" spellcheck="false"></textarea>
      <div id="sylMirror" class="syl-mirror" aria-hidden="true"></div>
    </div>
    <div id="sylOutput" class="syl-lines"></div>
  </div>
"""


# Naziv svake tematske strane na jednom mestu — koristi ga blok „Srodne strane“.
NAZIVI = {
    'rimovanje-reci': 'Rimovanje reči',
    'recnik-srpskog-jezika': 'Rečnik srpskog jezika',
    'slogovi': 'Brojač slogova i karaktera',
    'pisanje-pesama': 'Pisanje pesama',
    'klasici': 'Srpske pesme — klasici',
    'igra-rimovanja': 'Igra rimovanja',
    'vrste-rima': 'Vrste rima',
    'kako-napisati-pesmu': 'Kako napisati pesmu',
    'rimovanje-za-pocetnike': 'Rimovanje za početnike',
    'rime-za-decu': 'Rime za decu',
    'rime-za-decu-o-zivotinjama': 'Rime za decu o životinjama',
    'rime-za-decu-o-prirodi': 'Rime za decu o prirodi',
    'rime-za-pesmu': 'Rime za pesmu',
    'rime-za-rep': 'Rime za rep',
    'rime-za-ljubavne-pesme': 'Rime za ljubavne pesme',
    'rime-za-rodjendanske-pesmice': 'Rime za rođendanske pesmice',
    'rime-za-svadbu': 'Rime za svadbu',
    'rime-za-novu-godinu': 'Rime za Novu godinu',
    'rime-za-prijatelje': 'Rime za prijatelje',
    'rime-za-roditelje': 'Rime za roditelje',
    'rime-za-tugu-i-secanje': 'Rime za tugu i sećanje',
}

# Ko koga povezuje. Traka tabova i futer stoje na svakoj strani, pa Google te
# linkove gleda kao šablon i malo im veruje; ovo su linkovi iz sadržaja, birani
# po smislu. Bez ovoga je šest strana (prijatelji, roditelji, Nova godina,
# tuga i sećanje, deca o životinjama, deca o prirodi) bilo u sitemapu, a bez
# ijednog linka sa sajta — takve Google obično ostavi na „otkriveno, nije
# indeksirano". Svaka strana ovde ima bar dva dolazna linka.
SRODNO = {
    'rimovanje-reci': ['recnik-srpskog-jezika', 'slogovi', 'vrste-rima', 'rime-za-decu'],
    'recnik-srpskog-jezika': ['rimovanje-reci', 'slogovi', 'klasici'],
    'pisanje-pesama': ['slogovi', 'vrste-rima', 'kako-napisati-pesmu', 'klasici'],
    'klasici': ['vrste-rima', 'pisanje-pesama', 'slogovi'],
    'igra-rimovanja': ['rime-za-decu', 'rimovanje-reci', 'rimovanje-za-pocetnike'],
    'vrste-rima': ['rimovanje-za-pocetnike', 'kako-napisati-pesmu', 'klasici', 'rime-za-pesmu'],
    'kako-napisati-pesmu': ['pisanje-pesama', 'vrste-rima', 'slogovi', 'rimovanje-za-pocetnike'],
    'rimovanje-za-pocetnike': ['vrste-rima', 'kako-napisati-pesmu', 'igra-rimovanja', 'rimovanje-reci'],
    'rime-za-decu': ['rime-za-decu-o-zivotinjama', 'rime-za-decu-o-prirodi',
                     'rime-za-rodjendanske-pesmice', 'igra-rimovanja'],
    'rime-za-decu-o-zivotinjama': ['rime-za-decu', 'rime-za-decu-o-prirodi', 'igra-rimovanja'],
    'rime-za-decu-o-prirodi': ['rime-za-decu', 'rime-za-decu-o-zivotinjama', 'rime-za-pesmu'],
    'rime-za-pesmu': ['rime-za-ljubavne-pesme', 'rime-za-tugu-i-secanje', 'rime-za-rep',
                      'kako-napisati-pesmu', 'vrste-rima'],
    'rime-za-rep': ['rime-za-pesmu', 'vrste-rima', 'slogovi'],
    'rime-za-ljubavne-pesme': ['rime-za-svadbu', 'rime-za-tugu-i-secanje', 'rime-za-pesmu',
                               'kako-napisati-pesmu'],
    'rime-za-tugu-i-secanje': ['rime-za-ljubavne-pesme', 'rime-za-pesmu', 'kako-napisati-pesmu'],
    'rime-za-svadbu': ['rime-za-ljubavne-pesme', 'rime-za-prijatelje', 'rime-za-roditelje',
                       'rime-za-rodjendanske-pesmice'],
    'rime-za-rodjendanske-pesmice': ['rime-za-prijatelje', 'rime-za-roditelje',
                                     'rime-za-novu-godinu', 'rime-za-decu'],
    'rime-za-prijatelje': ['rime-za-rodjendanske-pesmice', 'rime-za-svadbu', 'rime-za-novu-godinu'],
    'rime-za-roditelje': ['rime-za-rodjendanske-pesmice', 'rime-za-svadbu', 'rime-za-decu'],
    'rime-za-novu-godinu': ['rime-za-rodjendanske-pesmice', 'rime-za-prijatelje', 'rime-za-decu'],
    'slogovi': ['pisanje-pesama', 'rimovanje-reci', 'kako-napisati-pesmu', 'klasici'],
}


def srodno_blok(slug):
    """Blok „Srodne strane“ — interni linkovi iz sadržaja, ne iz šablona."""
    veze = SRODNO.get(slug, [])
    if not veze:
        return ''
    linkovi = ' · '.join(f'<a href="/{s}/">{esc(NAZIVI[s])}</a>' for s in veze)
    return ('<div class="res-group"><h2>Srodne strane</h2>'
            f'<p class="seo-p">{linkovi}</p></div>\n  ')


# Kad odgovor na često pitanje pomene neki drugi alat, to ime treba da bude
# link. Do 28.07.2026. nije moglo: odgovori su se HTML-escapeovali, pa bi svaki
# <a> ispao kao goli tekst. Zato se link dodaje TEK POSLE escapeovanja, i samo
# u vidljivi tekst — u `FAQPage` šemu ide čist tekst, jer HTML tamo ne sme.
# Duže fraze stoje pre kraćih (inače „brojač slogova“ pojede „brojač slogova i
# karaktera"). Veznik u odgovoru ostaje netaknut — linkuje se samo naziv alata.
FAQ_LINKOVI = [
    ('beležnici za pisanje pesama', 'pisanje-pesama'),
    ('beležnica za pisanje pesama', 'pisanje-pesama'),
    ('brojač slogova i karaktera', 'slogovi'),
    ('rečniku srpskog jezika', 'recnik-srpskog-jezika'),
    ('rečnik srpskog jezika', 'recnik-srpskog-jezika'),
    ('rimovanje za početnike', 'rimovanje-za-pocetnike'),
    ('kako napisati pesmu', 'kako-napisati-pesmu'),
    ('brojanje slogova', 'slogovi'),
    ('brojač slogova', 'slogovi'),
    ('pisanje pesama', 'pisanje-pesama'),
    ('igri rimovanja', 'igra-rimovanja'),
    ('igra rimovanja', 'igra-rimovanja'),
    ('rimovanje reči', 'rimovanje-reci'),
    ('rime za decu', 'rime-za-decu'),
    ('vrste rima', 'vrste-rima'),
    ('rimovanju reči', 'rimovanje-reci'),
    ('brojaču slogova', 'slogovi'),
    ('vrstama rima', 'vrste-rima'),
    # padeži — srpski nastavci se ne izvode iz nominativa, pa stoje izbrojani
    ('Beležnici', 'pisanje-pesama'),
    ('Beležnicu', 'pisanje-pesama'),
    ('Beležnica', 'pisanje-pesama'),
    ('beležnici', 'pisanje-pesama'),
    ('beležnicu', 'pisanje-pesama'),
    ('beležnice', 'pisanje-pesama'),
    ('beležnica', 'pisanje-pesama'),
    ('klasicima', 'klasici'),
    ('„Klasici“', 'klasici'),
    ('Klasici', 'klasici'),
    ('klasici', 'klasici'),
]
FAQ_MAX_LINKOVA = 2   # više od dva linka po odgovoru čita se kao spam


def faq_sa_linkovima(odgovor, slug):
    """Escapuj odgovor, pa nazive drugih alata pretvori u linkove.

    Pretraga ide samo po delovima koji JOŠ nisu link — inače bi kasnija fraza
    mogla da se uhvati unutar već ubačenog `href`-a. Link ka strani na kojoj se
    i nalazimo se preskače (nema smisla, a Google ga i ne broji)."""
    delovi = [(esc(odgovor), False)]        # (tekst, već je link?)
    ubaceno = 0
    for fraza, cilj in FAQ_LINKOVI:
        if ubaceno >= FAQ_MAX_LINKOVA:
            break
        if cilj == slug:
            continue
        for i, (tekst, jeste_link) in enumerate(delovi):
            if jeste_link or fraza not in tekst:
                continue
            pre, _, posle = tekst.partition(fraza)
            delovi[i:i + 1] = [(pre, False),
                               (f'<a href="/{cilj}/">{fraza}</a>', True),
                               (posle, False)]
            ubaceno += 1
            break
    return ''.join(t for t, _ in delovi)


def content_page(footer, slug, title, desc, h1, lead_html, sections, faqs, cta_href, cta_text,
                 tool=False, aktivan_tab=''):
    # Statička tematska strana (autoritet). lead_html/sekcije = sirov HTML; faq = plain tekst.
    canon = f'{BASE}/{slug}/'
    schema = json.dumps({
        "@context": "https://schema.org", "@graph": [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Rimoteka", "item": BASE + "/"},
                {"@type": "ListItem", "position": 2, "name": h1, "item": canon}]},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in faqs]}]
    }, ensure_ascii=False, indent=1)
    head = HEAD_TMPL.format(title=esc(title), desc=esc(desc), ogdesc=esc(desc),
                            canonical=canon, base=BASE, schema=schema,
                            tabs_nav=tabs_nav(aktivan_tab))
    secs = ''.join(f'<div class="res-group"><h2>{esc(st)}</h2><p class="seo-p">{sb}</p></div>'
                   for st, sb in sections)
    # šema dobija čist tekst (gore), a vidljivi odgovor dobija linkove
    faq_html = ''.join(f'<details><summary>{esc(q)}</summary><p>{faq_sa_linkovima(a, slug)}</p></details>'
                       for q, a in faqs)
    # Kad strana ima živi alat, on ide ODMAH ispod naslova (to je ono zbog čega
    # je korisnik došao), a dugme „idi na početnu“ nema smisla — alat je tu.
    # tool=True → alat za rime; tool='<...>' → gotov markup nekog drugog alata
    alat = TOOL_HTML if tool is True else (tool if isinstance(tool, str) else '')
    cta = '' if alat else f'  <a class="landing-cta" href="{cta_href}">{esc(cta_text)}</a>\n'
    body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>{esc(h1)}</span></nav>
  <h1 class="landing-h1">{esc(h1)}</h1>
{alat}  <p class="landing-lead">{lead_html}</p>
{cta}  {secs}
  <section class="landing-faq"><h2>Česta pitanja</h2>{faq_html}</section>
  {srodno_blok(slug)}</main>
"""
    d = os.path.join(PUB, slug)
    os.makedirs(d, exist_ok=True)
    # `app.js` ide na SVAKU tematsku stranu, i kad na njoj nema alata — bez
    # njega prekidač za pismo u zaglavlju ne bi radio. Rečnik se pri tom ne
    # skida: `bootstrap` ga traži samo ako na strani postoji neki alat koji
    # pretražuje reči (v. izuzetak u app.js).
    izlaz = (head + body + footer).replace('</body>', TOOL_SCRIPT + '</body>', 1)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(izlaz)
    return canon

def related_targets(t, targets, target_slugs, n=10):
    # Daj n drugih popularnih meta-reči kao interne linkove
    out = []
    for w in targets:
        if w == t:
            continue
        if slugify(w) in target_slugs:
            out.append(w)
        if len(out) >= n:
            break
    return out

def syl_distribution(words):
    dist = defaultdict(int)
    for w in words:
        dist[syllables(w)] += 1
    return sorted(dist.items())

def mini_tool_form(prefill=''):
    return f"""<section class="mini-tool" aria-label="Pronađi rime">
  <h2>Pronađi rime za bilo koju reč</h2>
  <form class="search-row" action="/" method="get">
    <input type="text" name="rec" placeholder="upiši reč (npr. pesma)" value="{esc(prefill)}" autocomplete="off" spellcheck="false">
    <button type="submit" class="primary">Nađi rime</button>
  </form>
</section>"""

def main():
    words, defs = load()
    rank = {w: i for i, w in enumerate(words)}
    keygroup = defaultdict(list)
    finalgroup = defaultdict(list)
    for i, w in enumerate(words):
        keygroup[rhyme_key(w)].append(w)        # već rangirano (index raste)
        finalgroup[final_syl_key(w)].append(w)  # za fallback „isti završni slog“

    wset = set(words)

    # Reči koje se nikad ne prikazuju kao rime (neprikladne, vulgarnosti)
    BLOCKED = {'dupe','guzica','guzice','govno','govna','sranje','srao','serem','sere','picka','picku','pice','kurac','kurca','dupeta','dubre','dubretar','pisaju','guz','guzi','guziti','seronja','seronje','pickica','pickice','kurvetina','kurvetine','jebem','jebi','jebanje','jebeno','jebeni','jebena','jebalo','jebaci','jebac','govnar','govnari','smece','smetlarka'}
    # Kontekstualna isključenja: za određenu reč NE prikazuj određene rime
    RHYME_EXCLUSIONS = {
        'dete': {'bidete','bide','bidi'}
    }
    def is_blocked(w):
        return w in BLOCKED
    def is_excluded(target, w):
        return target in RHYME_EXCLUSIONS and w in RHYME_EXCLUSIONS[target]

    # 1) finalna lista meta-reči: postoje u rečniku, jedinstven slug
    TARGET_COUNT = 2000
    targets, seen_slug, chosen = [], {}, set()

    def add_target(t):
        if t not in wset or t in chosen or is_blocked(t):
            return
        sl = slugify(t)
        if sl in seen_slug:
            return
        seen_slug[sl] = t
        chosen.add(t)
        targets.append(t)

    # a) kurirane teme (prioritet — idu prve, u footer „Popularne rime“)
    for t in TARGETS:
        add_target(t)
    curated_count = len(targets)

    # a2) reči koje su ljudi ZAISTA tražili (Google Analytics) — obavezne
    for t in GA_RECI:
        add_target(t)
    ga_count = len(targets) - curated_count

    # a3) strane koje je Google VEĆ INDEKSIRAO — obavezne, ne brišu se
    #
    #     Očitano iz Search Console 30.07.2026: od 124 indeksirane strane, njih 59 bi
    #     po novom izboru nestalo (`abakus`, `abiturijent`, `abonos`, `abrakadabra`,
    #     `abramović`…). Brisanje strane koju je Google prihvatio je nepotreban
    #     negativan signal, a zadržavanje ne košta ništa — strane su statične i već
    #     postoje. Zato ulaze bez obzira na učestalost.
    #     Spisak se osvežava kad se ponovo očita GSC; postupak u HANDOVER.md.
    try:
        with open(os.path.join(os.path.dirname(__file__), 'gsc-indeksirane.json'), encoding='utf-8') as f:
            for t in json.load(f):
                add_target(t)
    except Exception:
        pass
    gsc_count = len(targets) - curated_count - ga_count

    # b) auto-dopuna do TARGET_COUNT — PO UČESTALOSTI, ne po abecedi (nalaz P10)
    #
    #    Uslovi koje reč mora da ispuni, i svaki ima razlog:
    #      · ima definiciju i nije „Oblik reči…“  — stranica bez sadržaja nema svrhu
    #      · potvrđena je u Rečniku Matice srpske — da ne uđu hrvatske i pokrajinske
    #        reči; srLex je veb-korpus sa `.rs` domena i sadrži `kolodvor`, `tvrtka`,
    #        `tisuća` (vidi IZVORI-RECNIKA.md). Odluka vlasnice 30.07.: strane dobijaju
    #        „isključivo srpske reči, najbolje i najpopularnije“.
    #      · ima stvarnu frekvenciju — reč koju korpus nikad nije video nema publiku
    #
    #    Redosled: veća frekvencija prva. Kod jednakih — abecedno, da build bude
    #    ponovljiv (isti ulaz → isti izlaz, inače se sitemap menja bez razloga).
    freq, matica, sadrzajne = load_izbor()
    kandidati = []
    for w in words:
        if w in chosen or len(w) < 3 or not w.isalpha():
            continue
        d = defs.get(w)
        if not d or d.startswith('Oblik'):
            continue
        if w not in matica:      # samo potvrđene srpske reči (odluka vlasnice 30.07.)
            continue
        if sadrzajne and w not in sadrzajne:   # bez veznika, zamenica i predloga
            continue
        f = freq.get(w, 0)
        if f <= 0:               # reč koju korpus nikad nije video nema publiku
            continue
        kandidati.append((-f, w))
    kandidati.sort()
    for _, w in kandidati:
        if len(targets) >= TARGET_COUNT:
            break
        add_target(w)

    target_slugs = set(seen_slug.keys())

    # popularne (footer) — prvih 30 iz liste koje postoje
    popular = targets[:30]
    poprime_html = ' · '.join(
        f'<a href="/rime-za/{quote(slugify(w))}/" class="footer-link">{esc(w)}</a>' for w in popular
    )
    footer = FOOTER_TMPL.format(poprime=poprime_html)

    # 2) generisanje strana — prvo obriši stare (bez siročića/stale strana)
    #
    # rmtree bez zaštite je pucao sa "Directory not empty" kad neko drugi čita
    # iz foldera (npr. lokalni `python3 -m http.server` u public/), i tada je
    # ostavljao folder POLA obrisan. Zato: nekoliko pokušaja, pa čišćenje
    # sadržaja stavku po stavku kao rezerva.
    import shutil, time
    outdir = os.path.join(PUB, 'rime-za')
    if os.path.isdir(outdir):
        for _ in range(3):
            shutil.rmtree(outdir, ignore_errors=True)
            if not os.path.isdir(outdir):
                break
            time.sleep(0.5)
    if os.path.isdir(outdir):
        for name in os.listdir(outdir):
            p = os.path.join(outdir, name)
            if os.path.isdir(p):
                shutil.rmtree(p, ignore_errors=True)
            else:
                try:
                    os.remove(p)
                except OSError:
                    pass
        if os.listdir(outdir):
            raise SystemExit(f'GRESKA: ne mogu da ispraznim {outdir}. '
                             'Ugasi lokalni server (pkill -f http.server) pa probaj ponovo.')
    os.makedirs(outdir, exist_ok=True)
    sitemap_entries = ['  <url><loc>%s/</loc><lastmod>2026-07-24</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>' % BASE]

    # Grupe po rhyme_key, final_syl_key i loose_key (asonanca)
    loosegroup = defaultdict(list)
    for w in words:
        loosegroup[loose_key(w)].append(w)

    generated = 0
    napravljene = []          # meta-reči koje su ZAISTA dobile stranu (za hub i brojke)
    for t in targets:
        key = rhyme_key(t)
        klen = len(key)
        cands = [w for w in keygroup[key] if w != t and not is_blocked(w) and not is_excluded(t, w)]
        cands.sort(key=lambda w: (-common_suffix(t, w), rank[w]))
        best = [w for w in cands if common_suffix(t, w) > klen][:50]
        good = [w for w in cands if common_suffix(t, w) == klen][:36]

        # Fallback (kao doRhymes): reči sa malo savršenih rima -> „isti završni slog“
        final_extra = []
        if len(best) + len(good) < 6:
            fk = final_syl_key(t)
            strong_set = set(keygroup[key]); strong_set.add(t)
            fin = [w for w in finalgroup[fk] if w not in strong_set and not is_blocked(w) and not is_excluded(t, w)]
            fin.sort(key=lambda w: (-common_suffix(t, w), rank[w]))
            final_extra = fin[:40]

        # Bliske rime (asonanca) — reči sa istim završnim samoglasnikom
        lk = loose_key(t)
        seen_loose = set(best + good + final_extra)
        loose_cands = [w for w in loosegroup[lk] if w != t and w not in seen_loose and not is_blocked(w) and not is_excluded(t, w)]
        loose_cands.sort(key=lambda w: (-common_suffix(t, w), rank[w]))
        loose = loose_cands[:30]

        all_r = best + good + final_extra
        if len(all_r) < 3:
            continue  # premalo rima — preskoči (da ne pravimo prazne strane)

        sl = slugify(t)
        tsyl = syllables(t)
        first_list = ', '.join(all_r[:10])

        # groups HTML
        def group_html(title, arr, strong):
            if not arr:
                return ''
            chips = ''.join(chip(w, syllables(w), rhyme_link(w, target_slugs)) for w in arr)
            cls = 'res-group strong-tier' if strong else 'res-group'
            return f'<div class="{cls}"><h2>{title}</h2><div class="results">{chips}</div></div>'

        # grupe po broju slogova (sve rime, sortirane po kvalitetu)
        by_syl = defaultdict(list)
        for w in all_r:
            by_syl[syllables(w)].append(w)

        syl_groups_html = ''
        for n in sorted(by_syl.keys()):
            arr = by_syl[n]
            syl_groups_html += group_html(f'Rime sa {n} {syl_word(n)}', arr, False)

        loose_html = group_html('Bliske rime (asonanca)', loose, False)

        # „Najbolje rime“ je ovde ZNAČILO nešto drugo nego u alatu: na strani se bira po
        # dužem zajedničkom završetku (`best`), a u alatu po istom broju slogova
        # (`app.js:965`). Ista reč, dva značenja — zato naslov sada kaže šta zaista radi.
        groups = (group_html('Rime sa istim završetkom', best[:20], True)
                  + syl_groups_html
                  + loose_html)

        # copy-all reči (za lakše korišćenje)
        copy_words = ', '.join(all_r[:60])

        # raspodela po broju slogova
        syl_dist = syl_distribution(all_r)
        syl_badges = ''.join(
            f'<span class="syl-badge"><b>{n}</b> {syl_word(n)} · {cnt} {rima_word(cnt)}</span>'
            for n, cnt in syl_dist[:6]
        )
        syl_html = f'<div class="syl-groups"><h2>Rime po broju slogova</h2><div class="related-list">{syl_badges}</div></div>' if syl_badges else ''

        # srodne popularne reči (interni linkovi)
        rel = related_targets(t, popular, target_slugs, n=8)
        rel_html = ''
        if rel:
            rel_chips = ''.join(
                chip(w, syllables(w), f'/rime-za/{quote(slugify(w))}/') for w in rel
            )
            # NIJE spisak rima: `related_targets` vraća druge česte reči (meta-reči), ne rime
            # za `t`. Ranije je stajalo „Još popularnih rima“ — netačno na ~2.000 strana.
            rel_html = (f'<div class="related-rimes"><h2>Rime za druge reči</h2>'
                        f'<p class="related-note">Ovo nisu rime za „{t}“ — to su strane sa rimama za druge reči.</p>'
                        f'<div class="related-list">{rel_chips}</div></div>')

        # meaning
        mean = ''
        if t in defs:
            mean = f'<p class="landing-def"><strong>{esc(t)}</strong> — {esc(defs[t])}</p>'

        # bolji title/description koji ciljaju više varijanti pretrage
        # „Rime za nada" je padežno pogrešno (treba „za nadu"), a padež se NE SME
        # izvoditi iz završetka — „-a" ima i imenice, i pridevi, i glagoli
        # (v. GRAMATIKA-I-PRAVOPIS-SRPSKOG-JEZIKA.md, pravilo 1). Umetanjem reči
        # „reč" imenica ostaje u nominativu i naslov je tačan za svih 1.988 strana,
        # baš kao što je oduvek bio u `h1`.
        title = (f'Rime za reč „{t}“: {len(all_r)} {rec_word(len(all_r))} '
                 f'{koja_se_rimuje(len(all_r))} | Rimoteka rečnik rima')
        # Opis je bio dug (medijana 205 znakova, najduži 279), pa ga je Google sekao usred
        # spiska reči. Sada staje u ~155 i kaže ono što drugi rimeri nemaju: slog i značenje.
        # Opis se PUNI DO GRANICE, ne na „četiri primera pa kako ispadne“ — reči su različite
        # dužine, pa je fiksan broj primera ranije davao raspon 123–279 znakova. Google
        # prikazuje oko 155; sve preko toga preseca usred spiska. Zato se primeri dodaju
        # jedan po jedan dok opis staje u 158, pa se stane.
        _osnova = (f'Sve rime za „{t}“: {len(all_r)} {rec_word(len(all_r))}. Uz svaku piše broj slogova '
                   f'i šta znači.')
        _primeri = []
        for _w in all_r[:6]:
            _kandidat = _primeri + [_w]
            if len(_osnova) + len(' Na vrhu su: ') + len(', '.join(_kandidat)) + 1 > 158:
                break
            _primeri = _kandidat
        desc = _osnova + (f' Na vrhu su: {", ".join(_primeri)}.' if _primeri else '')
        ogdesc = f'Reči koje se rimuju sa „{t}“: {first_list}…'
        canonical = f'{BASE}/rime-za/{quote(sl)}/'

        schema = json.dumps({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": 1, "name": "Rimoteka", "item": BASE + "/"},
                        {"@type": "ListItem", "position": 2, "name": "Rime za reč", "item": BASE + "/rime-za/"},
                        {"@type": "ListItem", "position": 3, "name": f"Rime za reč „{t}“", "item": canonical}
                    ]
                },
                {
                    "@type": "FAQPage",
                    "mainEntity": [
                        {"@type": "Question", "name": f'Šta se rimuje sa „{t}“?',
                         "acceptedAnswer": {"@type": "Answer",
                            "text": f"Sa rečju {t} rimuju se, između ostalog: {', '.join(all_r[:14])}."}},
                        {"@type": "Question", "name": f'Koje se reči rimuju sa „{t}“?',
                         "acceptedAnswer": {"@type": "Answer",
                            "text": f"Najbolje rime za reč {t} su: {', '.join(all_r[:10])}."}},
                        {"@type": "Question", "name": f'Koliko slogova ima reč „{t}“?',
                         "acceptedAnswer": {"@type": "Answer",
                            "text": f"Reč {t} ima {tsyl} {syl_word(tsyl)}."}}
                    ]
                }
            ]
        }, ensure_ascii=False, indent=1)

        head = HEAD_TMPL.format(tabs_nav=tabs_nav('rime'), title=esc(title), desc=esc(desc), ogdesc=esc(ogdesc),
                                canonical=canonical, base=BASE, schema=schema)

        body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <a href="/rime-za/">Rime za reč</a> › <span>„{esc(t)}“</span></nav>
  <h1 class="landing-h1">Rime za reč „{esc(t)}“</h1>
  <p class="landing-meta">{len(all_r)} {rima_word(len(all_r))} · {tsyl} {syl_word(tsyl)} · prvo one sa najdužim istim završetkom</p>
  <p class="landing-lead">Sve što se rimuje sa <strong>„{esc(t)}“</strong> — {len(all_r)} {rec_word(len(all_r))}. Uz svaku piše koliko ima slogova i šta znači, pa odmah vidiš koja ti staje u stih. Klikni na reč i dobiješ njene rime, a dugme ispod kopira ceo spisak.</p>
  {mean}
  <div class="copy-bar">
    <a class="landing-cta" rel="nofollow" href="/?rec={quote(t)}">✍️ Otvori Rimoteku i piši →</a>
    <button class="copy-all-btn" data-words="{esc(copy_words)}">Kopiraj sve rime</button>
  </div>
  {groups}
  {syl_html}
  {rel_html}
  {mini_tool_form(t)}
  <!-- „Šta dalje“ — do 31.07.2026. ~2.000 ovih strana nije imalo NIJEDAN link ka drugim
       alatima iz teksta (`faq_sa_linkovima` se ovde ne poziva). Čovek koji nađe rimu
       nije imao kuda dalje, a to je i jedini razlog zašto bi ostao na sajtu. -->
  <section class="landing-next">
    <h2>Šta dalje</h2>
    <p>Ako ti stih ne staje u ritam, prebroj slogove u <a href="/slogovi/">brojaču slogova</a>.
       Ako ne znaš koju šemu rime da uzmeš, pogledaj <a href="/vrste-rima/">vrste rima</a>.
       Za pesmicu detetu uključi <a href="/rime-za-decu/">rime za decu</a>, a kad počneš da
       pišeš, <a href="/pisanje-pesama/">beležnica</a> ti pokazuje rime dok kucaš.</p>
  </section>
  <section class="landing-faq">
    <h2>Česta pitanja</h2>
    <details><summary>Šta se rimuje sa „{esc(t)}“?</summary><p>Sa rečju {esc(t)} rimuju se, između ostalog: {esc(', '.join(all_r[:14]))}.</p></details>
    <details><summary>Koje se reči rimuju sa „{esc(t)}“?</summary><p>Rime sa najdužim istim završetkom za reč {esc(t)} su: {esc(', '.join(all_r[:10]))}.</p></details>
    <details><summary>Koliko slogova ima reč „{esc(t)}“?</summary><p>Reč {esc(t)} ima {tsyl} {syl_word(tsyl)}.</p></details>
    <details><summary>Kako da nađem još rima?</summary><p>U mini-alatu iznad upiši bilo koju reč — dobićeš proširenu listu rima, šire (asonantne) rime i filter po broju slogova.</p></details>
  </section>
</main>
"""
        # `app.js` ide i na strane reči — bez njega su prekidač za pismo, tamni
        # režim i „Kopiraj sve rime“ mrtva dugmad (nalazi V1, V2, K6). Rečnik se
        # pri tom ne skida: ova strana nema nijedan alat koji pretražuje reči,
        # pa `bootstrap` preskoči `loadDict` (v. izuzetak u app.js).
        page = (head + body + footer).replace('</body>', TOOL_SCRIPT + '</body>', 1)
        pdir = os.path.join(outdir, sl)
        os.makedirs(pdir, exist_ok=True)
        with open(os.path.join(pdir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page)
        sitemap_entries.append(
            f'  <url><loc>{canonical}</loc><lastmod>2026-07-24</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>')
        napravljene.append(t)
        generated += 1

    # 2b) statička strana /slogovi/ — keyword „brojanje slogova“
    slog_canon = f'{BASE}/slogovi/'
    slog_title = 'Brojanje slogova i karaktera — brojač za reč, stih i pesmu | Rimoteka'
    slog_desc = ('Besplatan brojač slogova, karaktera i reči: nalepi tekst i odmah vidiš broj slogova, '
                 'reči i znakova za svaki red. Podela reči na slogove u srpskom (sa slogotvornim „r“) — pravila i primeri.')
    slog_schema = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Rimoteka", "item": BASE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Brojanje slogova", "item": slog_canon}]},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": "Kako se broje slogovi u reči?",
                 "acceptedAnswer": {"@type": "Answer", "text": "Reč ima onoliko slogova koliko ima samoglasnika (a, e, i, o, u). Izuzetak je slogotvorno „r“ koje je i samo nosilac sloga (npr. vrt = 1 slog, srce = 2 sloga)."}},
                {"@type": "Question", "name": "Zašto je bitno brojati slogove u pesmi?",
                 "acceptedAnswer": {"@type": "Answer", "text": "Kada stihovi imaju sličan broj slogova, pesma ima ujednačen ritam, lakše se peva i pamti. Zato tekstopisci, pesnici i reperi broje slogove dok pišu."}},
                {"@type": "Question", "name": "Broji li alat i karaktere?",
                 "acceptedAnswer": {"@type": "Answer", "text": "Da. Uz broj slogova, za svaki red pokazuje se i broj znakova, a u zbiru broj karaktera sa razmacima i bez razmaka, kao i broj reči."}},
                {"@type": "Question", "name": "Kako se reč deli na slogove?",
                 "acceptedAnswer": {"@type": "Answer", "text": "Reč ima onoliko slogova koliko ima samoglasnika, a granica sloga ide ispred suglasnika koji pripada sledećem slogu: ja-bu-ka, de-voj-či-ca. Kod slogotvornog „r“ slog nosi samo „r“: sr-ce, pr-vi."}},
                {"@type": "Question", "name": "Koliko slogova ima jedna reč?",
                 "acceptedAnswer": {"@type": "Answer", "text": "Prebroj samoglasnike u njoj — toliko ima slogova. Vrt i prst imaju jedan slog (slogotvorno „r“), srce i pesma dva, jabuka tri, devojčica četiri."}}]}]
    }, ensure_ascii=False, indent=1)
    slog_head = HEAD_TMPL.format(tabs_nav=tabs_nav('slogovi'), title=esc(slog_title), desc=esc(slog_desc), ogdesc=esc(slog_desc),
                                 canonical=slog_canon, base=BASE, schema=slog_schema)
    slog_examples = [('vrt', 1), ('prst', 1), ('srce', 2), ('ljubav', 2), ('pesma', 2),
                     ('jabuka', 3), ('rimovanje', 4), ('devojčica', 4)]
    ex_rows = ''.join(
        f'<tr><td>{esc(w)}</td><td>{n} {syl_word(n)}</td></tr>' for w, n in slog_examples)
    syl_tool = SYL_TOOL_HTML
    slog_body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>Brojanje slogova</span></nav>
  <h1 class="landing-h1">Brojanje slogova i karaktera</h1>
{syl_tool}  <p class="landing-lead"><strong>Brojanje slogova</strong> ti pomaže da stihovi imaju ujednačen ritam — da se pesma lepo peva i lako pamti. Nalepi tekst iznad: broj slogova stoji levo od svakog reda, a na dnu ukupan zbir za celu pesmu. Radi i za jednu reč i za ceo tekst.</p>
  <p class="landing-lead">Brojač je deo celine: kad ti stih ne štima, u <a href="/pisanje-pesama/">beležnici</a> ga pišeš uz rime i šemu rime, a u <a href="/rimovanje-reci/">rimovanju reči</a> tražiš reč koja se uklapa u meru.</p>
  <div class="res-group"><h2>Kako se broje slogovi</h2>
    <p class="seo-p">Reč ima onoliko slogova koliko ima <strong>samoglasnika</strong> (a, e, i, o, u). Poseban slučaj je <strong>slogotvorno „r“</strong> — kada se nađe između suglasnika, ono je nosilac sloga (npr. <em>vrt</em>, <em>prst</em>, <em>srce</em>).</p>
  </div>
  <div class="res-group"><h2>Podela reči na slogove</h2>
    <p class="seo-p">Svaki slog ima jedan samoglasnik kao nosioca, pa se reč deli na onoliko slogova koliko ima samoglasnika: <em>ja-bu-ka</em> (3), <em>de-voj-či-ca</em> (4), <em>ri-mo-va-nje</em> (4). Granica sloga ide ispred suglasnika koji pripada sledećem slogu. Kod slogotvornog „r“ slog nosi samo „r“: <em>sr-ce</em>, <em>pr-vi</em>. <strong>Rastavljanje reči na slogove</strong> je isto što i njihovo brojanje — alat iznad to radi za ceo tekst odjednom.</p>
  </div>
  <div class="res-group"><h2>Brojač karaktera i reči</h2>
    <p class="seo-p">Pored slogova, ovo je i <strong>brojač karaktera</strong> i <strong>brojač reči</strong>: za svaki red pokazuje broj znakova, a u zbiru broj karaktera sa razmacima i bez razmaka, broj reči i broj redova. Korisno kad tekst mora da stane u zadatu dužinu — čestitka, slogan, opis proizvoda, poruka ili meta opis strane.</p>
  </div>
  <div class="res-group"><h2>Primeri broja slogova</h2>
    <table class="slog-table"><thead><tr><th>Reč</th><th>Broj slogova</th></tr></thead><tbody>{ex_rows}</tbody></table>
  </div>
  <section class="landing-faq">
    <h2>Česta pitanja</h2>
    <details><summary>Kako se broje slogovi u reči?</summary><p>Reč ima onoliko slogova koliko ima samoglasnika (a, e, i, o, u). Izuzetak je slogotvorno „r“ koje je i samo nosilac sloga (vrt = 1 slog, srce = 2 sloga).</p></details>
    <details><summary>Zašto je bitno brojati slogove u pesmi?</summary><p>Kada stihovi imaju sličan broj slogova, pesma ima ujednačen ritam, lakše se peva i pamti. Zato tekstopisci, pesnici i reperi broje slogove dok pišu.</p></details>
    <details><summary>Mogu li da prebrojim slogove u celoj pesmi?</summary><p>Da. Nalepi ceo tekst u polje na vrhu strane — pored svakog reda stoji broj slogova, a na dnu ukupan zbir za celu pesmu.</p></details>
    <details><summary>Broji li alat i karaktere?</summary><p>Da. Uz broj slogova, za svaki red pokazuje se i broj znakova, a u zbiru broj karaktera sa razmacima i bez razmaka, kao i broj reči.</p></details>
    <details><summary>Kako se reč deli na slogove?</summary><p>Reč ima onoliko slogova koliko ima samoglasnika, a granica sloga ide ispred suglasnika koji pripada sledećem slogu: ja-bu-ka, de-voj-či-ca. Kod slogotvornog „r“ slog nosi samo „r“: sr-ce, pr-vi.</p></details>
    <details><summary>Koliko slogova ima jedna reč?</summary><p>Prebroj samoglasnike u njoj — toliko ima slogova. Vrt i prst imaju jedan slog (slogotvorno „r“), srce i pesma dva, jabuka tri, devojčica četiri.</p></details>
  </section>
  {srodno_blok('slogovi')}</main>
"""
    slog_dir = os.path.join(PUB, 'slogovi')
    os.makedirs(slog_dir, exist_ok=True)
    with open(os.path.join(slog_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write((slog_head + slog_body + footer).replace('</body>', TOOL_SCRIPT + '</body>', 1))
    sitemap_entries.append(
        f'  <url><loc>{slog_canon}</loc><lastmod>2026-07-24</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>')

    # 2c) tematske strane (autoritet + niše)
    content_defs = [
        dict(slug='recnik-srpskog-jezika', aktivan_tab='pretraga',
             title='Rečnik srpskog jezika — pretraga reči i značenja | Rimoteka',
             desc='Rečnik srpskog jezika — uz svaku reč ide objašnjenje šta znači. Traži reč po značenju ili po '
                  'slovima — koje se završavaju, počinju ili sadrže zadata slova. Uz svaku piše broj slogova.',
             h1='Rečnik srpskog jezika',
             lead='<strong>Rečnik srpskog jezika</strong> koji pokriva ceo jezik — i uz svaku reč objašnjenje. '
                  'Reč možeš tražiti i po slovima — onu koja se završava na „-ost“, počinje na „cvet“ ili '
                  'negde u sebi ima „zvezd“ — a uz svaku stoji broj slogova i značenje.',
             cta_href='/rimovanje-reci/', cta_text='🔎 Traži rime umesto reči →',
             priority='0.7',
             tool=panel_html('pretraga'),
             sections=[
                 ('Značenje reči',
                  'Uz svaku reč u rezultatima stoji dugme za objašnjenje — kratka definicija iz rečnika. '
                  'Objašnjenje ima svaka reč u rečniku.'),
                 ('Reči koje se završavaju na zadata slova',
                  'Najčešća pretraga kod pisanja: uneseš završetak i dobiješ sve reči koje se tako završavaju. '
                  'Korisno kad tražiš određen nastavak, a ne poklapanje po zvuku — za rimu je bolji '
                  '<a href="/rimovanje-reci/">pretraživač rima</a>.'),
                 ('Reči koje počinju na zadata slova',
                  'Za akrostih, aliteraciju ili kad ti je reč „na vrh jezika“ pa se sećaš samo početka.'),
                 ('Reči koje sadrže zadata slova',
                  'Najšira pretraga — traži niz slova bilo gde u reči. Dobra za rebuse, ukrštenice i igre rečima.'),
                 ('Od reči do pesme',
                  'Kad nađeš reč koja ti treba, rime za nju su u <a href="/rimovanje-reci/">rimovanju reči</a>, '
                  'a pesmu pišeš u <a href="/pisanje-pesama/">beležnici</a>, koja ti uz svaki stih broji slogove. '
                  'Ako vežbaš, tu je i <a href="/igra-rimovanja/">igra rimovanja</a>.'),
                 ('Filtriranje po broju slogova',
                  'Svaki rezultat pokazuje broj slogova, a lista se može suziti na reči tačno određene dužine — '
                  'da se reč uklopi u ritam stiha. Za ceo tekst tu je '
                  '<a href="/slogovi/">brojanje slogova i karaktera</a>.'),
             ],
             faqs=[
                 ('Koliko reči ima rečnik?',
                  'Rečnik pokriva ceo srpski jezik, a uz svaku reč ide objašnjenje značenja. Za mnoge reči tu su i sinonimi.'),
                 ('Kako da vidim značenje reči?',
                  'Klikni na dugme za objašnjenje pored reči u rezultatima — otvara se kratka definicija.'),
                 ('Kako da nađem reči koje se završavaju na određena slova?',
                  'Izaberi „završava se na…“, upiši završetak (na primer „ost“) i dobićeš sve reči iz rečnika '
                  'koje se tako završavaju, sa brojem slogova za svaku.'),
                 ('Da li pretraga razlikuje latinicu i ćirilicu?',
                  'Ne moraš da brineš — možeš da kucaš kako ti je lakše, a prikaz rezultata prebacuješ '
                  'dugmetom za pismo u vrhu strane.'),
                 ('Je li isto što i pretraga rima?',
                  'Nije. Ovde se traže slova, a kod rima se traži poklapanje po zvuku od poslednjeg naglašenog '
                  'samoglasnika. Za rime koristi pretraživač rima.'),
             ]),

        dict(slug='klasici', aktivan_tab='klasici',
             title='Srpske pesme — klasici sa šemom rime i brojem slogova | Rimoteka',
             desc='Poznate pesme srpskih pesnika sa označenom šemom rime (ABAB, AABB) i brojem slogova u svakom '
                  'stihu. Vidi kako su veliki pesnici gradili ritam i rimu — i klikni na reč da joj nađeš rime.',
             h1='Srpske pesme — klasici',
             lead='Najbolji način da naučiš rimu jeste da vidiš kako su je pravili oni koji su je umeli. Uz svaki '
                  'stih ovde stoji <strong>broj slogova</strong> i <strong>slovo šeme rime</strong>, pa se odmah '
                  'vidi zašto pesma zvuči kako zvuči. Klik na završnu reč stiha otvara rime za nju.',
             cta_href='/vrste-rima/', cta_text='📖 Vrste rima objašnjene →',
             priority='0.7',
             tool=panel_html('klasici'),
             sections=[
                 ('Šema rime u pravim pesmama',
                  'Slova A, B, C pored stihova pokazuju koji se stihovi rimuju. Tako se golim okom vidi razlika '
                  'između ukrštene (ABAB), parne (AABB) i obgrljene (ABBA) rime — više o svakoj u tekstu '
                  '<a href="/vrste-rima/">vrste rima u poeziji</a>.'),
                 ('Broj slogova i ritam stiha',
                  'Pored svakog stiha piše koliko ima slogova. Kod klasika je taj broj obično ujednačen — zato se '
                  'te pesme lako pamte i pevaju. Isti brojač za svoj tekst imaš na strani '
                  '<a href="/slogovi/">brojanje slogova i karaktera</a>.'),
                 ('Od čitanja do pisanja',
                  'Kad ti se dopadne neka rima, klikni na završnu reč stiha i dobićeš sve reči koje se sa njom '
                  'rimuju, a značenje svake potraži u <a href="/recnik-srpskog-jezika/">rečniku srpskog jezika</a>. Kad kreneš da pišeš svoje, tu je <a href="/pisanje-pesama/">beležnica za pisanje '
                  'pesama</a> koja ti sama broji slogove i crta šemu rime.'),
             ],
             faqs=[
                 ('Čije su pesme ovde?',
                  'Pesme velikih srpskih pesnika čija su dela u javnom vlasništvu.'),
                 ('Šta znače slova pored stihova?',
                  'To je šema rime. Stihovi obeleženi istim slovom se rimuju: ABAB je ukrštena rima, AABB parna, '
                  'ABBA obgrljena.'),
                 ('Mogu li da vidim šemu rime za svoju pesmu?',
                  'Možeš. U beležnici za pisanje pesama pored svakog tvog stiha stoji isto takvo slovo, '
                  'broj slogova i prikaz ritma.'),
             ]),

        dict(slug='igra-rimovanja', aktivan_tab='igra',
             title='Igra rimovanja — vežbaj rime na vreme, sam ili sa društvom | Rimoteka',
             desc='Besplatna igra rimovanja: dobiješ reč, nađeš rimu pre isteka vremena. Za jednog ili više '
                  'igrača, sa poenima i nizovima. Zabavan način da deca i odrasli vežbaju rimu i bogate rečnik.',
             h1='Igra rimovanja',
             lead='Alat postaje igra: dobiješ reč, a ti nađeš rimu pre nego što istekne vreme. Igra se '
                  '<strong>sam ili u društvu</strong>, sa poenima i nizovima — a usput se rečnik širi bez '
                  'ijedne vežbe koja liči na zadatak.',
             cta_href='/rimovanje-reci/', cta_text='🔎 Otvori pretraživač rima →',
             priority='0.7',
             tool=panel_html('igra', skriveno_rime=True),
             sections=[
                 ('Kako se igra',
                  'Izabereš broj igrača i koliko reči svako dobija, pa kreće. Za svaku zadatu reč upisuješ reč '
                  'koja se sa njom rimuje. Tačan odgovor nosi poene, a niz tačnih odgovora ih umnožava.'),
                 ('Sam ili sa društvom',
                  'U igri za više igrača uređaj se predaje iz ruke u ruku — između igrača stoji ekran za predaju '
                  'da niko ne vidi tuđu reč. Na kraju ide tabela sa rezultatima.'),
                 ('Za decu i učionicu',
                  'Igra je dobra vežba za bogaćenje rečnika i osećaj za rimu. Uz nju idu i gotove '
                  '<a href="/rime-za-decu/">rime za decu</a>, biranе tako da budu primerene.'),
                 ('Kad zapne',
                  'Ako ti reč nikako ne dolazi, tu je <a href="/rimovanje-reci/">pretraživač rima</a> i '
                  '<a href="/recnik-srpskog-jezika/">rečnik srpskog jezika</a> sa svim '
                  'rimama za bilo koju srpsku reč — a kad poželiš da od rima napraviš pesmu, čeka te '
                  '<a href="/pisanje-pesama/">beležnica za pisanje pesama</a>.'),
             ],
             faqs=[
                 ('Da li je igra besplatna?',
                  'Jeste, u potpunosti i bez registracije.'),
                 ('Koliko igrača može da igra?',
                  'Od jednog do više igrača na istom uređaju — uređaj se predaje iz ruke u ruku, uz poseban '
                  'ekran za predaju da niko ne vidi tuđu reč.'),
                 ('Prihvata li igra bilo koju reč?',
                  'Ne. Odgovor mora biti prava srpska reč iz rečnika i mora se stvarno rimovati sa zadatom rečju.'),
                 ('Je li igra primerena deci?',
                  'Jeste. Reči koje se zadaju biraju se iz poznatog dela rečnika, a neprimerene reči su '
                  'isključene.'),
             ]),

        dict(slug='pisanje-pesama', aktivan_tab='beleznica',
             title='Pisanje pesama — beležnica sa rimama, slogovima i metrom | Rimoteka',
             desc='Piši pesmu i odmah vidi rime za reč na kojoj si, broj slogova po stihu, šemu rime i ritam. '
                  'Besplatna beležnica za pesnike, tekstopisce i repere — tekst ostaje sačuvan na tvom uređaju.',
             h1='Pisanje pesama',
             lead='Ovde se <strong>pesma i piše</strong>, ne samo rimuje. Dok kucaš, pored svakog '
                  'stiha stoji broj slogova i slovo šeme rime, reči koje se rimuju obojene su istom bojom, a '
                  'rime za reč na kojoj ti je kursor stoje sa strane i klikom ulaze u stih. Ništa se ne šalje '
                  'nigde — tekst se čuva na tvom uređaju i čeka te kad se vratiš. Ako tek počinješ, uz alat ide '
                  'i vodič <a href="/kako-napisati-pesmu/">kako napisati pesmu</a>.',
             cta_href='/kako-napisati-pesmu/', cta_text='📖 Vodič: kako napisati pesmu →',
             priority='0.9',
             tool=notepad_tool_html(),
             sections=[
                 ('Rime dok pišeš, bez napuštanja teksta',
                  'Klikni na bilo koju reč u pesmi i sa strane dobiješ rime baš za nju. Klik na rimu je ubacuje '
                  'u stih, na mesto kursora. Ne moraš da otvaraš drugu stranu ni da prekidaš misao — iza toga '
                  'stoji rečnik celog srpskog jezika.'),
                 ('Broj slogova po stihu',
                  'Levo od svakog stiha stoji broj slogova. Kada su stihovi ujednačeni, pesma se lakše peva i '
                  'pamti — zato je to prva stvar koju proveravaju i tekstopisci i autori dečjih pesama. '
                  'Za poseban brojač celog teksta tu je <a href="/slogovi/">brojanje slogova i karaktera</a>.'),
                 ('Šema rime (A, B, C…)',
                  'Pored svakog stiha stoji slovo — isto slovo znači da se ti stihovi rimuju. Odmah vidiš da li '
                  'pišeš ukrštenu (ABAB), parnu (AABB) ili obgrljenu (ABBA) rimu. Više o tome: '
                  '<a href="/vrste-rima/">vrste rima u poeziji</a>.'),
                 ('Metar srpskog stiha',
                  'Uključi metar i vidiš ritam svakog stiha slog po slog. Alat prepoznaje meru pesme — '
                  'šesterac, sedmerac, osmerac, deseterac, jedanaesterac i dvanaesterac — pokazuje gde pada '
                  'cezura (deseterac 4+6, dvanaesterac 6+6) i koji stih odstupa od te mere. Nekonzistentan '
                  'ritam je češća greška od loše rime.'),
                 ('Kad ti treba druga reč, ne rima',
                  'Ponekad stih ne trpi nijednu rimu koja ti pada na pamet. Tada otvori '
                  '<a href="/recnik-srpskog-jezika/">rečnik srpskog jezika</a> i potraži reč po značenju ili po '
                  'slovima, pa njoj nađi rimu. A kad hoćeš da uvežbaš oko za rimu, tu je '
                  '<a href="/igra-rimovanja/">igra rimovanja</a>.'),
                 ('Premeštanje stihova',
                  'Stih se prevlači na drugo mesto hvataljkom levo od njega — mišem ili prstom. Slogovi, boje i '
                  'šema rime se preračunaju odmah, pa možeš da probaš drugačiji raspored bez prepisivanja.'),
                 ('Naslov, štampa i deljenje',
                  'Pesma može da dobije naslov, da se odštampa ili sačuva kao PDF, preuzme kao tekstualni fajl '
                  'ili podeli linkom — onaj ko ga otvori vidi tvoju pesmu, a njegova beleška ostaje netaknuta.'),
             ],
             faqs=[
                 ('Da li se moja pesma negde šalje?',
                  'Ne. Tekst se čuva isključivo u tvom pregledaču, na tvom uređaju. Ostaje tu i kad zatvoriš '
                  'stranicu. Ako pesmu podeliš linkom, tek tada je sadržaj upisan u sam link.'),
                 ('Kako da dobijem rime za određenu reč u pesmi?',
                  'Klikni na tu reč u tekstu. Sa strane se odmah pojave rime baš za nju, a klik na rimu je '
                  'ubacuje u stih na mesto kursora.'),
                 ('Šta znače slova A, B, C pored stihova?',
                  'To je šema rime. Stihovi sa istim slovom se rimuju: ABAB je ukrštena rima, AABB parna, '
                  'ABBA obgrljena. Bledo slovo znači da se taj stih ni sa čim ne rimuje.'),
                 ('Šta pokazuje metar?',
                  'Ritam stiha slog po slog — koji su slogovi naglašeni, gde je cezura i koliko stihova odstupa '
                  'od preovlađujuće dužine. Pomaže da pesma ima ujednačen ritam.'),
                 ('Da li je alat besplatan?',
                  'Jeste, u potpunosti i bez registracije.'),
             ]),
        dict(slug='vrste-rima',
             title='Vrste rima u poeziji — parna, ukrštena, obgrljena | Rimoteka',
             desc='Vrste rima u poeziji: parna (AABB), ukrštena (ABAB), obgrljena (ABBA) i asonanca. Objašnjenje šema rime sa primerima — za pisanje pesama i tekstova.',
             h1='Vrste rima u poeziji',
             lead='Rima je poklapanje glasova na kraju stihova. Po rasporedu razlikujemo nekoliko <strong>vrsta rima</strong> — evo najčešćih šema sa primerima kod velikih pesnika.',
             cta_href='/klasici/', cta_text='📖 Vidi šeme rime kod klasika →',
             sections=[
                 ('Parna rima (AABB)', 'Rimuju se susedni stihovi: prvi sa drugim, treći sa četvrtim. Najjednostavnija i najčešća u pesmama i repu.'),
                 ('Ukrštena rima (ABAB)', 'Rimuju se naizmenični stihovi: prvi sa trećim, drugi sa četvrtim. Daje pesmi laganu, pevljivu dinamiku.'),
                 ('Obgrljena rima (ABBA)', 'Prvi stih se rimuje sa četvrtim, a drugi sa trećim — spoljašnji par „obgrljuje“ unutrašnji. Zvuči svečano i zaokruženo.'),
                 ('Čista rima i asonanca', 'Čista (savršena) rima poklapa sve glasove od naglašenog samoglasnika (ruka — luka). Asonanca poklapa samo samoglasnike (more — kose) i daje slobodniji, moderniji zvuk čest u repu.'),
             ],
             faqs=[
                 ('Koje su glavne vrste rima?', 'Po rasporedu: parna (AABB), ukrštena (ABAB), obgrljena (ABBA) i nagomilana (AAAA). Po kvalitetu: čista rima i asonanca.'),
                 ('Šta je asonanca?', 'Asonanca je nesavršena rima u kojoj se poklapaju samo samoglasnici, a ne i svi suglasnici (npr. more — kose). Česta je u modernoj poeziji i repu.'),
                 ('Kako da vidim šemu rime u pesmi?', 'U Rimoteci, u tabu „Klasici“, pored svakog stiha stoji slovo (A, B, C…) koje pokazuje koje se rime poklapaju — tako vidiš šemu rime velikih pesnika.'),
             ]),
        dict(slug='kako-napisati-pesmu',
             title='Kako napisati pesmu — koraci, rima i ritam | Rimoteka',
             desc='Kako napisati pesmu ili tekst: izbor teme, rima, ritam i broj slogova, refren. Praktični koraci i besplatan alat za rime i brojanje slogova.',
             h1='Kako napisati pesmu',
             lead='Pisanje pesme je veština koja se uči. Evo jednostavnih koraka — od ideje do gotovog stiha — uz alat koji ti pomaže oko <strong>rime</strong> i <strong>ritma</strong>.',
             cta_href='/', cta_text='✍️ Otvori Rimoteku i počni da pišeš →',
             sections=[
                 ('1. Izaberi temu i osećaj', 'Odluči o čemu pišeš i koje osećanje želiš da preneseš — ljubav, tuga, radost, sećanje. Jasna tema drži pesmu na okupu.'),
                 ('2. Pronađi rime', 'Za ključne reči na kraju stihova potraži rime. U Rimoteci upišeš reč i prvo dobiješ rime sa istim brojem slogova — one najlakše legnu u stih.'),
                 ('3. Uskladi ritam i slogove', 'Da se pesma lepo peva, stihovi treba da imaju sličan broj slogova. Brojač slogova ti pomaže da uskladiš ritam red po red.'),
                 ('4. Dodaj refren', 'Refren je deo koji se ponavlja i najlakše se pamti. Neka bude kratak, melodičan i emotivno jak.'),
             ],
             faqs=[
                 ('Kako da počnem da pišem pesmu?', 'Počni od teme i jednog osećaja, pa napiši prvi stih. Zatim za završnu reč potraži rimu i nastavi red po red, pazeći na ritam i broj slogova.'),
                 ('Da li pesma mora da se rimuje?', 'Ne mora — postoji i slobodni stih. Ali rima i ujednačen ritam čine pesmu pevljivijom i lakšom za pamćenje, što je posebno važno za pesme i rep.'),
                 ('Koji alat pomaže kod pisanja pesme?', 'Rimoteka: nalazi rime za svaku reč, broji slogove u stihovima i ima beležnicu u kojoj pišeš i čuvaš pesmu.'),
             ]),
    ]
    # primer reči kao čipovi za stranu /rime-za-decu/
    decije_reci = ['mama','tata','dete','igra','sreća','radost','prijatelj','škola','knjiga','lopta','mačka','pas','ptica','cvet','sunce','mesec','zvezda','kiša','sneg']
    deciji_chips = ''.join(
        f'<a class="chip" href="/rime-za/{quote(slugify(w))}/"><span class="word">{esc(w)}</span><span class="syl" title="{syllables(w)} {syl_word(syllables(w))}">{syllables(w)}</span></a>'
        for w in decije_reci
    )

    # čipovi najtraženijih reči — interni linkovi za /rimovanje-reci/
    rimovanje_reci_primeri = ['ljubav','srce','duša','sreća','tuga','nada','more','nebo','sunce',
                              'mesec','zvezda','kiša','cvet','oči','ruka','put','noć','dan',
                              'vetar','reka','pesma','život','san','svet']
    rimovanje_chips = ''.join(
        f'<a class="chip" href="/rime-za/{quote(slugify(w))}/"><span class="word">{esc(w)}</span><span class="syl" title="{syllables(w)} {syl_word(syllables(w))}">{syllables(w)}</span></a>'
        for w in rimovanje_reci_primeri
    )

    # 2d) nišne autoritet strane — deca, pesme, rep
    niche_defs = [
        # Glavna strana za ciljanu frazu „rimovanje reči“ (exact-match slug).
        # Konkurencija (igrarecima.com/rimovanje-reci, rimovanje.com) rangira upravo
        # na exact-match putanji — homepage sam nije dovoljan.
        dict(slug='rimovanje-reci', aktivan_tab='rime',
             priority='0.9',
             tool=True,          # živi alat za rime na samoj strani
             title='Rimovanje reči — pronađi rimu za svaku srpsku reč | Rimoteka',
             desc='Rimovanje reči na srpskom, za sekundu: upišeš reč i Rimoteka izlista sve rime — sa brojem slogova, značenjem i sinonimima, besplatno i bez reklama.',
             h1='Rimovanje reči',
             # PRVA REČENICA SE PIŠE ZA GOOGLE, ne za stranu.
             # Provereno 29.07.2026: Google je ignorisao `desc` i u rezultatima
             # prikazao baš prvu rečenicu ovog teksta — a ona je tada definisala
             # POJAM („rimovanje reči je traženje reči koje se zvučno poklapaju“),
             # pa je strana izgledala kao rečnička odrednica, ne kao alat.
             # Zato prva rečenica sada: (1) počinje ključnom rečju, jer Google
             # podebljava reči iz upita i tako se vizuelno poklapa sa pretragom;
             # (2) kaže šta korisnik DOBIJA, ne šta pojam znači; (3) staje u
             # 147 znakova, jer Google seče oko 155. Ako se menja — prvo izmeriti.
             lead=('<strong>Rimovanje reči</strong> na srpskom, za sekundu: upišeš reč i Rimoteka '
                   'izlista sve rime — sa brojem slogova, značenjem i sinonimima, '
                   'besplatno i bez reklama. '
                   'Rečnik pokriva ceo srpski jezik, a na vrhu su rime sa istim brojem slogova '
                   'kao tvoja reč — one najlakše legnu u stih. '
                   'Probaj sa nekom od ovih reči: ' + rimovanje_chips),
             cta_href='/', cta_text='🔍 Rimuj svoju reč →',
             sections=[
                 ('Zašto Rimoteka, a ne bilo koji rimer?',
                  'Rimoteka je pravljena <strong>za srpski jezik</strong> — prepoznaje ćirilicu i latinicu, '
                  'ekavicu i ijekavicu i naše nastavke. Uz rime dobijaš i '
                  '<strong>značenje svake reči</strong> — objašnjenje ima svaka reč u rečniku, '
                  '<strong>sinonime</strong> kad ti rima ne odgovara po smislu, '
                  '<strong>bliske rime</strong> za slobodniji zvuk, '
                  '<strong>brojač slogova i karaktera</strong>, '
                  '<strong>beležnicu</strong> u kojoj pišeš pesmu i vidiš rime u boji, '
                  'i <strong>igru rima</strong> za uvežbavanje. '
                  'Sve besplatno, bez registracije i bez reklama.'),
                 ('Šta znači rimovanje reči?',
                  'Dve reči se rimuju kada im se poklapaju glasovi počevši od poslednjeg naglašenog samoglasnika — '
                  'na primer <em>nada</em> i <em>livada</em>, ili <em>srce</em> i <em>lice</em>. '
                  'Što je poklapanje duže, rima je čistija i jače zvuči u stihu.'),
                 ('Kako rimovati reč u tri koraka',
                  '<strong>1.</strong> Upiši reč u polje iznad — može latinicom ili ćirilicom. '
                  '<strong>2.</strong> Klikni „Nađi rime“ i dobićeš sve rime iz rečnika. '
                  '<strong>3.</strong> Filtriraj po broju slogova da rima stane u ritam tvog stiha.'),
                 ('Čiste rime i bliske rime',
                  'Čista rima poklapa se od poslednjeg naglašenog samoglasnika do kraja reči — '
                  '<em>ljubav — grbav</em>, <em>nada — livada</em>. '
                  'Bliska rima, ili asonanca, poklapa se samo u samoglasnicima — <em>lova — soba</em> — i zvuči slobodnije; '
                  'često se koristi u repu. Rimoteka prikazuje i jedne i druge, pa biraš šta ti treba. '
                  'Više o šemama rima ima na strani <a href="/vrste-rima/">vrste rima</a>.'),
                 ('Rimovanje reči i broj slogova',
                  'Rima sama nije dovoljna — stihovi zvuče dobro kad imaju sličan broj slogova. '
                  'Zato svaka rima u Rimoteci pored sebe ima broj slogova, a postoji i poseban '
                  '<a href="/slogovi/">brojač slogova</a> za cele stihove.'),
                 ('Rimovanje reči za decu',
                  'Za dečje pesmice rečnik se može uključiti u <strong>dečji režim</strong>, koji izbacuje '
                  'neprikladne reči. Detaljnije na strani <a href="/rime-za-decu/">rime za decu</a>.'),
                 ('Ćirilica i ijekavica',
                  'Reč možeš upisati ćirilicom ili latinicom — Rimoteka sama prepoznaje pismo. '
                  'Postoji i opcija da se u rime uključi ijekavica (<em>mlijeko</em>, <em>lijep</em>), '
                  'ako pišeš na tom izgovoru.'),
             ],
             faqs=[
                 ('Šta je rimovanje reči?',
                  'Rimovanje reči je traženje reči kojima se poklapaju glasovi na kraju, počevši od poslednjeg naglašenog samoglasnika. Koristi se u poeziji, repu, sloganima i čestitkama.'),
                 ('Kako da rimujem reč koja nema rimu?',
                  'Ako nema čiste rime, uključi opciju za bliske (slabije) rime — dobićeš asonance koje se poklapaju u samoglasnicima. Druga opcija je da preformulišeš stih tako da se rima traži za neku drugu reč na kraju.'),
                 ('Koliko slogova treba da se poklapa?',
                  'Za čistu rimu dovoljno je da se poklapa poslednji naglašeni slog i sve posle njega. Za jaču, bogatiju rimu poklapaju se dva ili više slogova.'),
                 ('Da li rimovanje reči radi za ćirilicu?',
                  'Da. Reč možeš upisati i ćirilicom i latinicom, a rezultate možeš prikazati u pismu koje izabereš gore na strani.'),
                 ('Da li je alat za rimovanje reči besplatan?',
                  'Da. Rimovanje reči na Rimoteci je potpuno besplatno, bez registracije i bez ograničenja broja pretraga.'),
                 ('Koliko reči ima u rečniku?',
                  'Rečnik pokriva ceo srpski jezik, a uz svaku reč ide objašnjenje šta znači.'),
                 ('Mogu li da vidim šta rima znači?',
                  'Da. Uz svaku rimu ide i objašnjenje reči, pa nećeš staviti u pesmu reč čije značenje ne znaš.'),
                 ('Šta ako se reč rimuje, ali mi ne odgovara po smislu?',
                  'Za takve slučajeve postoje sinonimi — Rimoteka predlaže reči istog značenja, pa možeš da zameniš reč na kraju stiha i potražiš rime za nju.'),
                 ('Postoji li brojač slogova i karaktera?',
                  'Da, u posebnom tabu. Slogovi su važni za ritam stiha, a broj karaktera za tekstove gde postoji ograničenje — na primer slogane i čestitke.'),
             ]),
        dict(slug='rime-za-decu',
             title='Rime za decu — reči za dečje pesmice, bez ružnih reči | Rimoteka',
             desc='Rime za decu: upiši reč i dobiješ rime za dečju pesmicu, a uz svaku piše broj slogova i šta reč znači. Dečji režim izbacuje ružne reči, pa pišeš mirno sa detetom.',
             h1='Rime za decu',
             lead=f'Rimoteka <strong>uvek</strong> izostavlja psovke i vulgarnosti, a za decu ima i <strong>dečji režim</strong> — dodatni filter koji uklanja i nasilne i seksualne pojmove. Uključuje se kvačicom „dečji režim“ ispod polja za unos, a dugme ispod ga uključi samo. Za početak, evo reči od kojih se najlakše kreće: {deciji_chips}',
             cta_href='/?rec=dete&decji=1', cta_text='🧸 Otvori alat sa uključenim dečjim režimom →',
             sections=[
                 ('Zašto Rimoteka za decu?', 'Rečnik je uvek pročišćen od psovki i vulgarnosti. Uz to postoji i dečji režim, koji dodatno uklanja nasilne i seksualne pojmove — roditelji i učitelji ga uključe jednom i ostaje upamćen na tom uređaju.'),
                 ('Od koje reči da počneš', 'Uzmi reč koju dete već ume da kaže — mama, tata, lopta, mačka, sunce, kiša. Klikni je, pa iz spiska izaberi rimu koju dete razume.'),
                 ('Kako napisati dečju pesmicu?', 'Napiši prvi red, pa mu prebroj slogove. Drugi red neka ima isti broj slogova i rimu na kraju. Kad se ta dva slože, ostatak ide lakše — deca pamte ono što se ponavlja.'),
             ],
             faqs=[
                 ('Da li su rime na Rimoteci bezbedne za decu?', 'Psovke i vulgarnosti su izostavljene uvek. Za najmlađe uključi i dečji režim (kvačica ispod polja za unos) — on dodatno uklanja nasilne i seksualne pojmove.'),
                 ('Koje reči su dobre za dečje pesmice?', 'Jednostavne, slikovite reči kao što su dete, igra, sreća, sunce, mesec, zvezda, cvet, mama, tata, prijatelj.'),
                 ('Kako da pronađem rime za određenu reč?', 'Upiši reč u polje za pretragu na Rimoteci i klikni „Nađi rime“. Ako je uključen dečji režim, rezultati su dodatno filtrirani za decu.'),
             ]),
        dict(slug='rime-za-pesmu',
             title='Rime za pesmu — rečnik rima i brojanje slogova za stih | Rimoteka',
             desc='Rime za pesmu: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Rečnik rima, sinonimi, brojanje slogova i beležnica — sve na jednoj strani.',
             h1='Rime za pesmu',
             lead='<strong>Rime za pesmu</strong>: upiši reč sa kraja stiha i dobiješ sve što se sa njom rimuje. Uz svaku reč piše broj slogova i šta znači. Ne moraš da otvaraš rečnik u drugom prozoru.',
             cta_href='/?rec=pesma', cta_text='✍️ Nađi rime za „pesma“ →',
             sections=[
                 ('Kako koristiti Rimoteku za pisanje pesme?', 'Napiši stih, pa upiši njegovu poslednju reč. Prvo dobiješ rime sa istim brojem slogova kao ta reč — one najlepše legnu na kraj stiha. Ispod njih su duže i kraće, za slučaj da ti fali slog.'),
                 ('Ljubavne i emotivne rime', 'Za ljubavnu pesmu najčešće se traže rime za reči ljubav, srce, duša, sreća, tuga i nada. Klikni bilo koju i dobiješ njene rime sa brojem slogova.'),
                 ('Kad ti zapne — promeni poslednju reč', 'Ako reč nema rimu koja ti odgovara, otvori sinonime i uzmi bližu reč. Sunce nema mnogo rima, dan ima. Pesma se ne kvari zbog jedne zamene.'),
             ],
             faqs=[
                 ('Kako da brzo napišem pesmu?', 'Izaberi temu, napiši prvi stih, pa za poslednju reč potraži rimu u Rimoteci. Nastavi red po red i proveri broj slogova.'),
                 ('Da li moram da znam pravila poezije?', 'Ne moraš. Rima i sličan broj slogova su dovoljni da pesma lepo zvuči. Rimoteka ti pomaže sa oba.'),
                 ('Gde mogu da sačuvam pesmu?', 'U Rimoteci postoji Beležnica — tekst se čuva na tvom uređaju i ostaje i kad zatvoriš stranicu.'),
             ]),
        dict(slug='rime-za-rep',
             title='Rime za rep — čiste i bliske rime, slog po slog | Rimoteka',
             desc='Rime za rep: upiši reč i dobiješ rime sa brojem slogova, a kvačica „šire rime“ dodaje i bliske. Piši u beležnici i broji slogove dok slažeš svaki stih.',
             h1='Rime za rep',
             lead='<strong>Rime za rep</strong>: upiši reč i dobiješ rime. Uz svaku piše broj slogova. Filtriraj na tačan broj slogova pa ostanu samo one koje ti staju u takt. Za bliske rime uključi kvačicu „i šire (slabije) rime“.',
             cta_href='/?rec=rep', cta_text='🎤 Nađi rime za „rep“ →',
             sections=[
                 ('Kako odabrati rimu za rep?', 'Poslušaj beat i odredi gde pada naglasak. Zatim potraži rimu sa odgovarajućim brojem slogova da stih bude ritmički ispravan.'),
                 ('Asonanca u repu', 'Reperi retko traže čistu rimu. Dovoljno je da se poklope samoglasnici — lova i soba. To je asonanca, a u Rimoteci je dobiješ kvačicom „i šire (slabije) rime“.'),
                 ('Interna rima i multi-slog rime', 'Rimuj i unutar stiha, ne samo na kraju. Uz svaku reč stoji broj slogova, pa lako složiš par od dva ili tri sloga koji pada na isto mesto u taktu.'),
             ],
             faqs=[
                 ('Šta su dobre rime za rep?', 'Rime koje imaju jasan ritam, odgovaraju beatu i nose značenje. Često se koriste asonantne rime i višesložni parovi.'),
                 ('Kako da uklopim rimu u beat?', 'Prebroj slogove u stihu i podesi rimu tako da naglasak pada na pravo mesto. Rimoteka prikazuje broj slogova za svaku reč.'),
                 ('Da li Rimoteka nudi asonantne rime?', 'Da. Uključi opciju „šire rime“ da vidiš asonantne rime koje se poklapaju po samoglasnicima.'),
             ]),
    ]
    # 2e) tematske autoritet stranice — prilike, emocije, teme
    topic_defs = [
        dict(slug='rime-za-ljubavne-pesme',
             title='Rime za ljubavne pesme — rečnik rima za stih o ljubavi | Rimoteka',
             desc='Rime za ljubavnu pesmu: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Kad ti rima ne leži po smislu, uzmeš sinonim pa tražiš ponovo.',
             h1='Rime za ljubavne pesme',
             lead='Rime za ljubavnu pesmu: upiši reč sa kraja stiha i dobiješ sve što se sa njom rimuje. Uz svaku reč piše broj slogova i šta znači. Ako rima zvuči dobro a ne odgovara po smislu, uzmi sinonim pa traži rimu za njega.',
             cta_href='/?rec=ljubav', cta_text='❤️ Nađi rime za „ljubav“ →',
             sections=[
                 ('Reči kojima se ljubavne pesme najčešće završavaju', 'Srce, sreća, tuga, nada, duša. Svaka ima svoju stranu sa rimama — počni od one koja ti je bliža po smislu.'),
                 ('Kako napisati ljubavnu pesmu?', 'Počni od jedne slike ili trenutka. Nemoj se bojati jednostavnosti — najlepše ljubavne pesme su iskrene i direktne.'),
                 ('Šema rime za ljubavnu pesmu', 'Parna rima (AABB) pevljiva je i topla. Ukrštena (ABAB) zvuči smirenije, jer se rima čeka jedan red duže. Obe možeš da vidiš označene u beležnici dok pišeš.'),
             ],
             faqs=[
                 ('Koje rime najčešće idu sa „ljubav“?', 'Ljubav se teško rimuje — imaš neljubav, gubav, ubav, grbav, labav, alav. Zato je iskusni pesnici retko stavljaju na kraj stiha: stavi je u sredinu, a stih završi rečju koja ima više rima — sreća, tuga, san.'),
                 ('Kako da pesma zvuči iskreno?', 'Piši o konkretnim detaljima — osećajima, mirisima, trenucima. Izbegavaj klišee koji ne zvuče kao tvoji.'),
                 ('Da li ljubavna pesma mora da se rimuje?', 'Ne mora, ali rima pomaže da pesma bude pevljiva i da se bolje pamti. Slobodni stih je takođe validan izbor.'),
             ]),
        dict(slug='rime-za-rodjendanske-pesmice',
             title='Rime za rođendanske pesmice — rime za čestitku u stihu | Rimoteka',
             desc='Rime za rođendansku pesmicu: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Za pesmicu detetu uključi dečji režim, pa pišite skupa.',
             h1='Rime za rođendanske pesmice',
             lead='Umesto kupovne čestitke, napiši <strong>svoju rođendansku pesmicu</strong>. Upiši reč sa kraja stiha i dobiješ rime, a uz svaku piše broj slogova — pa biraš onu koja ti staje u ritam.',
             cta_href='/?rec=rodjendan', cta_text='🎂 Nađi rime za „rođendan“ →',
             sections=[
                 ('Kako da počneš', 'Napiši prvi stih o osobi, ne o rođendanu: Ti koji nikad ne kasniš na ručak. Drugi stih neka se rimuje sa poslednjom rečju. Tako pesmica odmah zvuči lično.'),
                 ('Pesmica za decu', 'Koristi kratke stihove, brojanje slogova i jednostavne rime. Deca vole ponavljanje i vesele reči kao što su lopta, torta, sveća, poklon.'),
                 ('Pesmica za odrasle', 'Odrasli vole da se pesma malo šali sa njima. Uzmi jednu njegovu naviku i rimuj je — to prolazi bolje od najlepše želje.'),
             ],
             faqs=[
                 ('Kako napisati kratku rođendansku pesmicu?', 'Drži se 4–8 stihova. Počni sa čestitkom, dodaj ličnu poruku i završi sa željom.'),
                 ('Koje reči se najčešće rimuju sa rođendan?', 'Rođendan: imendan, Ilindan, Savindan, Tucindan, pandan. Rima ima malo, pa se rođendanska pesmica češće gradi oko reči dan, dar ili slavlje — one otvaraju ceo stih.'),
                 ('Da li mogu da iskoristim pesmicu za čestitku?', 'Naravno. Možeš je prepisati na čestitku, poslati porukom ili objaviti na društvenim mrežama.'),
             ]),
        dict(slug='rime-za-svadbu',
             # „toast“ → „zdravica“: srpska reč postoji i uobičajena je, pa
             #   anglicizam nema opravdanja (odluka vlasnice 29.07.2026).
             # „Budan kratak“ → „Budi kratak“: obična greška u kucanju, stajala
             #   je vidljiva na strani.
             # „zaverno“ → „zavet“: „zaverno“ NIJE srpska reč — provereno,
             #   nema je u `reci.txt` (0 pogodaka od 270.000 reči).
             title='Rime za svadbu — zdravica, čestitka i pesma mladencima | Rimoteka',
             desc='Rime za svadbenu zdravicu i čestitku: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Napiši u beležnici, pročitaj naglas, pa skrati.',
             h1='Rime za svadbu',
             lead='<strong>Rime za svadbenu zdravicu, čestitku ili pesmu mladencima</strong>: upiši reč sa kraja stiha i dobiješ rime. Uz svaku piše broj slogova. Zdravica se čita naglas, pa ritam ovde znači više nego inače.',
             cta_href='/?rec=svadba', cta_text='💍 Nađi rime za „svadba“ →',
             sections=[
                 ('Reči kojima se zdravica najčešće završava', 'Sreća, zdravlje, dom, put, život. Klikni bilo koju i dobiješ njene rime sa brojem slogova.'),
                 ('Kako napisati svadbenu zdravicu?', 'Budi kratak, iskren i malo duhovit. Završi podizanjem čaše i željom za sreću mladenaca.'),
                 ('Pesma za mladence', 'Koristi rime koje govore o zajedničkom putu, podršci i ljubavi. Izbegavaj previše slatko — iskrenost je važnija.'),
             ],
             faqs=[
                 ('Šta napisati u svadbenoj čestitci?', 'Čestitka treba da bude kratka, topla i lična. Poželi im sreću, ljubav i lep zajednički život.'),
                 ('Koje rime idu sa „ljubav“ za svadbu?', 'Za ljubav rima ima malo — neljubav, gubav, ubav. Zato svadbenu pesmu gradi oko reči sreća, mladenci, venac ili dan; svaka od njih ima svoju stranu sa rimama.'),
                 ('Koliko treba da traje svadbena zdravica?', 'Minut do dva. To je oko dvanaest stihova — prebroj ih u brojanju slogova pre nego što ustaneš.'),
             ]),
        dict(slug='rime-za-decu-o-zivotinjama',
             title='Rime za decu o životinjama — mačka, pas, ptica, konj | Rimoteka',
             desc='Rime za pesmicu o životinjama: mačka, pas, ptica, konj, pčela. Upiši ime životinje i dobiješ rime, broj slogova i značenje. Dečji režim je već uključen.',
             h1='Rime za decu o životinjama',
             lead='Upiši ime životinje — <em>mačka</em>, <em>pas</em>, <em>ptica</em>, <em>konj</em>, <em>pčela</em> — i dobiješ rime za pesmicu, a uz svaku piše broj slogova. Dugme ispod otvara alat sa uključenim <strong>dečjim režimom</strong>, pa se ružne reči ne pojavljuju.',
             cta_href='/?rec=macka&decji=1', cta_text='🐱 Nađi rime za „mačka“ (dečji režim) →',
             sections=[
                 ('Koje životinje najlakše ulaze u stih', 'Kratke reči imaju najviše rima: pas, miš, rak, lav. Duže su teže, ali daju lepši ritam: veverica, leptirica.'),
                 ('Kako napisati pesmicu o životinji?', 'Opiši kako izgleda, šta voli da radi i kakav zvuk proizvodi. Koristi ponavljanje i jednostavne rime.'),
                 ('Učenje kroz pesmu', 'Pesmice o životinjama pomažu deci da zapamte nazive, zvukove i karakteristike životinja na zabavan način.'),
             ],
             faqs=[
                 ('Koje životinje su najbolje za dečje pesmice?', 'Mačke, psi, ptice, konji, lavovi i pčele su klasici jer su deci bliski i lako se opisuju.'),
                 ('Da li su rime bezbedne za najmlađu decu?', 'Psovke i vulgarnosti su izostavljene uvek. Za vrtićku decu uključi i dečji režim — kvačica „dečji režim“ ispod polja za unos.'),
                 ('Kako deca najbolje uče pesmice napamet?', 'Kroz ponavljanje, pokrete i igru. Što je pesma kraća i melodičnija, brže će je zapamtiti.'),
             ]),
        dict(slug='rime-za-decu-o-prirodi',
             title='Rime za decu o prirodi — sunce, kiša, sneg i cvet | Rimoteka',
             desc='Rime za pesmicu o prirodi: sunce, kiša, sneg, cvet, more. Upiši reč i dobiješ rime sa brojem slogova i značenjem, a dečji režim izbacuje ružne reči.',
             h1='Rime za decu o prirodi',
             lead='Upiši <em>sunce</em>, <em>kiša</em>, <em>sneg</em> ili <em>cvet</em> i dobiješ rime za pesmicu, a uz svaku piše broj slogova. Klikni dugme ispod i alat se otvori sa <strong>dečjim režimom</strong> — ne moraš ništa da čekiraš.',
             cta_href='/?rec=sunce&decji=1', cta_text='☀️ Nađi rime za „sunce“ (dečji režim) →',
             sections=[
                 ('Reči iz prirode koje imaju najviše rima', 'Cvet, sneg, reka, kiša i sunce — svaka od njih ima svoju stranu sa rimama, klikni pa biraj.'),
                 ('Sezonske pesmice', 'Proleće — cvetovi i povratak toplote. Leto — sunce i more. Jesen — kiša i opalo lišće. Zima — sneg i novogodišnja čarolija.'),
                 ('Kako povezati prirodu i osećanja?', 'Sunce može da bude srećno, kiša tužna, a vetar slobodan. Priroda uči decu da prepoznaju emocije.'),
             ],
             faqs=[
                 ('Koje reči iz prirode se najčešće rimuju?', 'sunce — unce, lonce, klince; zvezda — gnezda, žlezda; kiša — miša, niša, tiša, viša; sneg — beg; cvet — svet, savet, krevet; reka — dreka, izreka.'),
                 ('Kako deca uče o prirodi kroz pesme?', 'Pesmice pomažu deci da zapamte nazive pojava, boje, zvukove i sezone na zabavan način.'),
                 ('Da li mogu koristiti ove pesmice u vrtiću?', 'Da. Uz uključen dečji režim rezultati su dodatno filtrirani za vrtiće i škole.'),
             ]),
        dict(slug='rime-za-novu-godinu',
             title='Rime za Novu godinu — čestitka, pesmica i želje u stihu | Rimoteka',
             desc='Rime za novogodišnju čestitku: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. Za pesmicu detetu uključi dečji režim pa piši sa njim.',
             h1='Rime za Novu godinu',
             lead='<strong>Rime za novogodišnju čestitku</strong>: upiši reč sa kraja stiha i dobiješ rime. Uz svaku piše broj slogova. Za pesmicu detetu uključi dečji režim, pa pišite zajedno.',
             cta_href='/?rec=novagodina', cta_text='🎆 Nađi rime za „nova godina“ →',
             sections=[
                 ('Reči koje se lako rimuju u čestitki', 'Sreća, zdravlje, dan, san, dar. Klikni reč i dobiješ njene rime sa brojem slogova.'),
                 ('Kako da poruka ne zvuči kao sve ostale', 'Izbaci sreću, zdravlje i uspeh — to piše svima. Poželi jednu konkretnu stvar koju ta osoba stvarno čeka.'),
                 ('Novogodišnja pesmica za decu', 'Koristi reči kao što su sneg, dar, svetlo, kalendar, petarda, žurka. Deca vole ritam i ponavljanje.'),
             ],
             faqs=[
                 ('Kako napisati novogodišnju čestitku?', 'Budi kratak, topao i iskren. Poželi zdravlje, sreću i nekoliko ličnih želja koje odgovaraju osobi.'),
                 ('Koje rime idu sa „godina“?', 'Godina: jedina, ledina, gradina, dedina, gazdina, jagodina, vojvodina. Ako ti nijedna ne odgovara, završi stih rečju dan, san ili sreća — one imaju mnogo više rima.'),
                 ('Da li mogu poslati pesmicu umesto čestitke?', 'Naravno. Personalizovana pesma često ostavlja jači utisak od univerzalne čestitke.'),
             ]),
        dict(slug='rime-za-roditelje',
             title='Rime za roditelje — pesme za majku, oca i porodicu | Rimoteka',
             desc='Rime za pesmu roditeljima: upiši majka, tata, baka ili deda i dobiješ rime, značenje i broj slogova. Sinonim ti daje bližu reč kad rima ne legne u stih.',
             h1='Rime za roditelje',
             lead='<strong>Rime za pesmu roditeljima</strong>: upiši <em>majka</em>, <em>tata</em>, <em>baka</em> ili <em>deda</em> i dobiješ rime. Uz svaku piše broj slogova i šta reč znači. Za ovakvu pesmu najbolje radi jedan konkretan detalj — ne „hvala ti na svemu“, nego ono čega se stvarno sećaš.',
             cta_href='/?rec=majka', cta_text='👩 Nađi rime za „majka“ →',
             sections=[
                 ('Od koje reči da počneš', 'Majka, tata, baka, deda, dom, detinjstvo — svaka ima svoju stranu sa rimama.'),
                 ('Pesma za majku', 'Fokusiraj se na njenu brigu, toplinu i žrtvu. Najlepše pesme su one koje govore o konkretnim trenucima.'),
                 ('Pesma za oca', 'Piši o snazi i sigurnosti — o tome kako je bilo kad si znao da neko stoji iza tebe. I četiri stiha su dovoljna.'),
             ],
             faqs=[
                 ('Kako napisati dirljivu pesmu za roditelje?', 'Počni od jednog sećanja ili osobine. Piši iskreno i ne boj se emocija.'),
                 ('Koje rime idu sa „majka“?', 'Majka: bajka, hajka, čajka, šajka, snajka, pomajka, staramajka. Za reč mama rima ima manje, pa se ona lepše sluša u sredini stiha nego na kraju.'),
                 ('Da li kratak stih može biti dovoljan?', 'Da. Ponekad je najjača poruka ona najkraća — samo nekoliko stihova punih značenja.'),
             ]),
        dict(slug='rime-za-prijatelje',
             title='Rime za prijatelje — pesma i čestitka za prijatelja | Rimoteka',
             desc='Rime za pesmu prijatelju: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova. U beležnici pišeš stih i vidiš rime u boji, baš dok pišeš.',
             h1='Rime za prijatelje',
             lead='<strong>Rime za pesmu prijatelju</strong>: upiši reč sa kraja stiha i dobiješ rime. Uz svaku piše broj slogova. U beležnici pišeš stih i odmah vidiš rime u boji, dok pišeš.',
             cta_href='/?rec=prijatelj', cta_text='🤝 Nađi rime za „prijatelj“ →',
             sections=[
                 ('Reči koje se lako rimuju u ovakvoj pesmi', 'Drug, put, smeh, sreća, sećanje. Klikni bilo koju i dobiješ njene rime sa brojem slogova.'),
                 ('Kako napisati pesmu za prijatelja?', 'Seti se jedne konkretne stvari — noći, putovanja, svađe posle koje ste ostali. Jedan pravi detalj vredi više od deset lepih reči.'),
                 ('Čestitka umesto pesme', 'Dovoljna su četiri stiha. Dodaj jedan detalj koji zna samo on i pesma više nije opšta.'),
             ],
             faqs=[
                 ('Koje rime idu sa „prijatelj“?', 'Prijatelj se rimuje samo sa rečima na -telj: neprijatelj, spisatelj, staratelj, branitelj, davatelj. Ako ti nijedna ne leži, završi stih rečju drug, druže ili sreća — pa traži rimu za nju.'),
                 ('Da li pesma mora biti ozbiljna?', 'Ne mora. Prijatelji često vole humor i zezanje u pesmama.'),
                 ('Kako završiti pesmu za prijatelja?', 'Završi sa željom, zahvalnošću ili unutrašnjom šalom koja je samo vaša.'),
             ]),
        dict(slug='rime-za-tugu-i-secanje',
             title='Rime za tugu i sećanje — pesma za oproštaj i pomen | Rimoteka',
             desc='Rime za pesmu o tuzi, sećanju i oproštaju: upiši reč sa kraja stiha i dobiješ rime, značenje i broj slogova, pa biraš onu koja nosi pravo osećanje.',
             h1='Rime za tugu i sećanje',
             lead='<strong>Rime za pesmu o tuzi, sećanju i oproštaju</strong>: upiši reč sa kraja stiha i dobiješ rime. Uz svaku piše broj slogova i šta reč znači. Kad reči teško dolaze, rima pomogne da rečenicu privedeš kraju.',
             cta_href='/?rec=tuga', cta_text='🕯️ Nađi rime za „tuga“ →',
             sections=[
                 ('Reči kojima se ovakva pesma najčešće završava', 'Tuga, bol, san, tišina, sećanje. Klikni bilo koju i dobiješ njene rime sa brojem slogova.'),
                 ('Pesma za preminulog', 'Ne traži lepe reči — traži tačne. Jedna rečenica o tome kako je pio kafu vredi više od cele strofe o večnosti.'),
                 ('Pesma o rastanku', 'Piši dok je sveže, ne kad se smiriš. Rima ti tada pomogne da rečenicu privedeš kraju kad sam ne možeš.'),
             ],
             faqs=[
                 ('Kako napisati pesmu za nekog ko je preminuo?', 'Počni od jednog sećanja ili osobine. Reci šta ti nedostaje i zahvali se na onom što ste imali.'),
                 ('Koje rime idu sa „tuga“?', 'Neka rime za tuga su: druga, luga, šuga, ruga, kruga — ali izaberi one koje nose pravo značenje za tvoju pesmu.'),
                 ('Da li je u redu napisati pesmu o tuzi?', 'Apsolutno. Poezija je jedan od najstarijih načina da se izraze emocije i pronađe olakšanje.'),
             ]),
        dict(slug='rimovanje-za-pocetnike',
             title='Rimovanje za početnike — kako pronaći i koristiti rime | Rimoteka',
             desc='Rimovanje za početnike: osnovni pojmovi, vrste rima, kako pronaći rime i pisati stihove. Besplatan vodič za sve koji žele da počnu.',
             h1='Rimovanje za početnike',
             lead='Rimovanje nije magija — to je veština koju svako može da nauči. Ovaj vodič objašnjava <strong>osnove rimovanja</strong> i pokazuje kako Rimoteka može da ti bude prvi saveznik.',
             cta_href='/?rec=rima', cta_text='🚀 Pronađi rime u alatu →',
             sections=[
                 ('Šta je rima?', 'Rima je poklapanje glasova na kraju stihova. Najčešće se rimuju poslednji naglašeni slogovi dve ili više reči.'),
                 ('Osnovne vrste rima', 'Parna rima (AABB), ukrštena rima (ABAB) i obgrljena rima (ABBA) su najčešće šeme za početnike.'),
                 ('Kako koristiti Rimoteku?', 'Unesi reč u polje za pretragu, klikni „Nađi rime“ i biraj najbolju rimu po kvalitetu i broju slogova.'),
             ],
             faqs=[
                 ('Da li moram da znam metriku da bih pisao pesme?', 'Ne moraš. Dovoljno je da stihovi imaju sličan broj slogova i da se rime poklapaju.'),
                 ('Kako da znam koja rima je bolja?', 'Čista rima je jača od asonance. Rimoteka prvo prikazuje rime sa istim brojem slogova kao tvoja reč, a bliske rime dobiješ tek kad uključiš kvačicu „i šire (slabije) rime“.'),
                 ('Odakle da počnem da pišem?', 'Počni od jedne ideje ili osećanja. Napiši prvi stih, pa potraži rimu za poslednju reč i nastavi.'),
             ]),
    ]
    niche_defs.extend(topic_defs)
    content_defs.extend(niche_defs)

    for cd in content_defs:
        c = content_page(footer, cd['slug'], cd['title'], cd['desc'], cd['h1'],
                         cd['lead'], cd['sections'], cd['faqs'], cd['cta_href'], cd['cta_text'],
                         tool=cd.get('tool', False), aktivan_tab=cd.get('aktivan_tab', ''))
        sitemap_entries.append(
            f'  <url><loc>{c}</loc><lastmod>2026-07-26</lastmod><changefreq>monthly</changefreq>'
            f'<priority>{cd.get("priority", "0.6")}</priority></url>')

    # 2z) HUB STRANA /rime-za/ — spisak svih strana reči
    #
    # Ranije je `/rime-za/` vraćao 403 (folder bez `index.html`), pa je čitav
    # srednji nivo strukture bio mrtav: breadcrumb ga je preskakao, a 222 strane
    # reči nisu imale nijedan interni link ka sebi — do njih se stizalo samo iz
    # sitemapa. Ova strana ih sve povezuje i ujedno gasi 403.
    hub_canon = f'{BASE}/rime-za/'
    po_slovu = {}
    for t in napravljene:
        prvo = slugify(t)[:1].upper() or '#'
        po_slovu.setdefault(prvo, []).append(t)
    hub_sekcije = []
    for slovo in sorted(po_slovu):
        veze = ' · '.join(
            f'<a href="/rime-za/{quote(slugify(w))}/">{esc(w)}</a>'
            for w in sorted(po_slovu[slovo])
        )
        hub_sekcije.append(
            f'<div class="res-group"><h2 id="slovo-{slovo}">{slovo}</h2>'
            f'<p class="hub-lista">{veze}</p></div>'
        )
    hub_azbuka = ' · '.join(f'<a href="#slovo-{sl}">{sl}</a>' for sl in sorted(po_slovu))
    hub_schema = json.dumps({
        "@context": "https://schema.org", "@graph": [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Rimoteka", "item": BASE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Rime za reč", "item": hub_canon}]},
            {"@type": "CollectionPage", "name": "Rime za reč — spisak svih strana",
             "url": hub_canon, "numberOfItems": len(napravljene)}]
    }, ensure_ascii=False, indent=1)
    hub_head = HEAD_TMPL.format(
        tabs_nav=tabs_nav('rime'),
        title=f'Rime za reč — spisak svih {len(napravljene)} strana | Rimoteka',
        desc=f'Spisak svih {len(napravljene)} strana sa rimama, po abecedi. Izaberi reč i vidi sve reči koje se sa njom rimuju.',
        ogdesc=f'Spisak svih {len(napravljene)} strana sa rimama, po abecedi.',
        canonical=hub_canon, base=BASE, schema=hub_schema)
    hub_body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>Rime za reč</span></nav>
  <h1 class="landing-h1">Rime za reč — spisak svih strana</h1>
  <p class="landing-lead">Za svaku od ovih <strong>{len(napravljene)}</strong> reči postoji zasebna strana sa rimama, brojem slogova i objašnjenjem. Izaberi reč ili je upiši u alat na početnoj.</p>
  <p class="hub-azbuka">{hub_azbuka}</p>
  {''.join(hub_sekcije)}
</main>
"""
    with open(os.path.join(outdir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write((hub_head + hub_body + footer).replace('</body>', TOOL_SCRIPT + '</body>', 1))
    sitemap_entries.append(
        f'  <url><loc>{hub_canon}</loc><lastmod>2026-07-29</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>')

    # 3) sitemap
    sm = ('<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + '\n'.join(sitemap_entries) + '\n</urlset>\n')
    with open(os.path.join(PUB, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write(sm)

    # 4) footer linkovi u index.html
    idx_path = os.path.join(PUB, 'index.html')
    with open(idx_path, encoding='utf-8') as f:
        idx = f.read()
    new_idx = re.sub(r'<!--POPRIME_START-->.*?<!--POPRIME_END-->',
                     '<!--POPRIME_START-->' + poprime_html + '<!--POPRIME_END-->',
                     idx, flags=re.S)
    if new_idx != idx:
        with open(idx_path, 'w', encoding='utf-8') as f:
            f.write(new_idx)

    print(f"Generisano strana: {generated}")
    print(f"Sitemap URL-ova: {len(sitemap_entries)}")
    print(f"Footer popularnih linkova: {len(popular)}")

if __name__ == '__main__':
    main()
