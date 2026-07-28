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
    # 1:1 sa app.js: samoglasnici + slogotvorno „r" (nosilac sloga: srce, vrt)
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
oko uho nos jezik zub
konj pas mačka ptica vuk lav orao golub leptir pčela riba zmija
jabuka kruška šljiva grožđe malina jagoda breskva
hleb so med mleko kafa čaj
kralj kraljica princ princeza vitez
ljubavnik voljena
mir sreća zdravlje
""".split()

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
<meta property="og:image" content="{base}/logo-icon.png">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#5a3fd0">
<link rel="stylesheet" href="/style.css?v=20260728g">
<script type="application/ld+json">
{schema}
</script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="/" title="Rimoteka — rime, rečnik i slogovi">
    <div class="brand-h"><img src="/logo-icon.png" class="logo-r" alt="R" width="512" height="512"><span class="brand-word">imoteka</span></div>
  </a>
</header>
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
    <p class="footer-desc">Besplatan alat za pronalaženje rime, brojanje slogova i pisanje pesama i tekstova na srpskom jeziku.</p>
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
    <p class="footer-legal">© 2026 Rimoteka · <a href="/" class="footer-link">Početna</a> · Powered by <a href="https://orbitacode.com" target="_blank" rel="noopener" class="footer-link">Orbita Code</a></p>
  </div>
</footer>
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
TOOL_SCRIPT = '<script src="/app.js?v=20260728g"></script>\n'

# Živi brojač slogova i karaktera. Isti ID-jevi kao u tabu „Slogovi i znakovi",
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
        raise SystemExit('gen_pages: ne nalazim panel „%s" u index.html' % ime)
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


# Naziv svake tematske strane na jednom mestu — koristi ga blok „Srodne strane".
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
    """Blok „Srodne strane" — interni linkovi iz sadržaja, ne iz šablona."""
    veze = SRODNO.get(slug, [])
    if not veze:
        return ''
    linkovi = ' · '.join(f'<a href="/{s}/">{esc(NAZIVI[s])}</a>' for s in veze)
    return ('<div class="res-group"><h3>Srodne strane</h3>'
            f'<p class="seo-p">{linkovi}</p></div>\n  ')


# Kad odgovor na često pitanje pomene neki drugi alat, to ime treba da bude
# link. Do 28.07.2026. nije moglo: odgovori su se HTML-escapeovali, pa bi svaki
# <a> ispao kao goli tekst. Zato se link dodaje TEK POSLE escapeovanja, i samo
# u vidljivi tekst — u `FAQPage` šemu ide čist tekst, jer HTML tamo ne sme.
# Duže fraze stoje pre kraćih (inače „brojač slogova" pojede „brojač slogova i
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
    ('„Klasici"', 'klasici'),
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
    secs = ''.join(f'<div class="res-group"><h3>{esc(st)}</h3><p class="seo-p">{sb}</p></div>'
                   for st, sb in sections)
    # šema dobija čist tekst (gore), a vidljivi odgovor dobija linkove
    faq_html = ''.join(f'<details><summary>{esc(q)}</summary><p>{faq_sa_linkovima(a, slug)}</p></details>'
                       for q, a in faqs)
    # Kad strana ima živi alat, on ide ODMAH ispod naslova (to je ono zbog čega
    # je korisnik došao), a dugme „idi na početnu" nema smisla — alat je tu.
    # tool=True → alat za rime; tool='<...>' → gotov markup nekog drugog alata
    alat = TOOL_HTML if tool is True else (tool if isinstance(tool, str) else '')
    cta = '' if alat else f'  <a class="landing-cta" href="{cta_href}">{esc(cta_text)}</a>\n'
    body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>{esc(h1)}</span></nav>
  <h1 class="landing-h1">{esc(h1)}</h1>
{alat}  <p class="landing-lead">{lead_html}</p>
{cta}  {secs}
  <section class="landing-faq"><h3>Česta pitanja</h3>{faq_html}</section>
  {srodno_blok(slug)}</main>
"""
    d = os.path.join(PUB, slug)
    os.makedirs(d, exist_ok=True)
    izlaz = head + body + footer
    if alat:
        izlaz = izlaz.replace('</body>', TOOL_SCRIPT + '</body>', 1)
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
  <h3>Pronađi rime za bilo koju reč</h3>
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
        finalgroup[final_syl_key(w)].append(w)  # za fallback „isti završni slog"

    wset = set(words)

    # Reči koje se nikad ne prikazuju kao rime (neprikladne, vulgarnosti)
    BLOCKED = {'dupe','guzica','guzice','govno','govna','sranje','srao','serem','sere','picka','picku','pice','kurac','kurca','kura','dupeta','dubre','dubretar','pisaju','pisao','pisa','guz','guzi','guziti','seronja','seronje','pickica','pickice','kurvetina','kurvetine','jebem','jebi','jebanje','jebeno','jebeni','jebena','jebalo','jebaci','jebac','krvavo','krvavi','krvava','govnar','govnari','smece','smetlar','smetlarka'}
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

    # a) kurirane teme (prioritet — idu prve, u footer „Popularne rime")
    for t in TARGETS:
        add_target(t)
    curated_count = len(targets)

    # b) auto-dopuna do TARGET_COUNT: frekvencijski rangirane sadržajne reči
    #    (imaju definiciju = realna leksika; preskačemo promenjene oblike „Oblik reči…")
    for w in words:  # rank redosled
        if len(targets) >= TARGET_COUNT:
            break
        if w in chosen or len(w) < 3 or not w.isalpha():
            continue
        d = defs.get(w)
        if not d or d.startswith('Oblik'):
            continue
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
    for t in targets:
        key = rhyme_key(t)
        klen = len(key)
        cands = [w for w in keygroup[key] if w != t and not is_blocked(w) and not is_excluded(t, w)]
        cands.sort(key=lambda w: (-common_suffix(t, w), rank[w]))
        best = [w for w in cands if common_suffix(t, w) > klen][:50]
        good = [w for w in cands if common_suffix(t, w) == klen][:36]

        # Fallback (kao doRhymes): reči sa malo savršenih rima -> „isti završni slog"
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
            return f'<div class="{cls}"><h3>{title}</h3><div class="results">{chips}</div></div>'

        # grupe po broju slogova (sve rime, sortirane po kvalitetu)
        by_syl = defaultdict(list)
        for w in all_r:
            by_syl[syllables(w)].append(w)

        syl_groups_html = ''
        for n in sorted(by_syl.keys()):
            arr = by_syl[n]
            syl_groups_html += group_html(f'Rime sa {n} {syl_word(n)}', arr, False)

        loose_html = group_html('Bliske rime (asonanca)', loose, False)

        groups = (group_html('Najbolje rime', best[:20], True)
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
        syl_html = f'<div class="syl-groups"><h3>Rime po broju slogova</h3><div class="related-list">{syl_badges}</div></div>' if syl_badges else ''

        # srodne popularne reči (interni linkovi)
        rel = related_targets(t, popular, target_slugs, n=8)
        rel_html = ''
        if rel:
            rel_chips = ''.join(
                chip(w, syllables(w), f'/rime-za/{quote(slugify(w))}/') for w in rel
            )
            rel_html = f'<div class="related-rimes"><h3>Još popularnih rima</h3><div class="related-list">{rel_chips}</div></div>'

        # meaning
        mean = ''
        if t in defs:
            mean = f'<p class="landing-def"><strong>{esc(t)}</strong> — {esc(defs[t])}</p>'

        # bolji title/description koji ciljaju više varijanti pretrage
        title = f'Rime za {t}: {len(all_r)} reči koje se rimuju | Rimoteka'
        desc = (f'Pronađi reči koje se rimuju sa „{t}". Rimoteka nudi {len(all_r)} {rima_word(len(all_r))} '
                f'za pisanje pesama, tekstova i repa. Primeri: {first_list}.')
        ogdesc = f'Reči koje se rimuju sa „{t}": {first_list}…'
        canonical = f'{BASE}/rime-za/{quote(sl)}/'

        schema = json.dumps({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": 1, "name": "Rimoteka", "item": BASE + "/"},
                        {"@type": "ListItem", "position": 2, "name": f"Rime za {t}", "item": canonical}
                    ]
                },
                {
                    "@type": "FAQPage",
                    "mainEntity": [
                        {"@type": "Question", "name": f'Šta se rimuje sa „{t}"?',
                         "acceptedAnswer": {"@type": "Answer",
                            "text": f"Sa rečju {t} rimuju se, između ostalog: {', '.join(all_r[:14])}."}},
                        {"@type": "Question", "name": f'Koje se reči rimuju sa „{t}"?',
                         "acceptedAnswer": {"@type": "Answer",
                            "text": f"Najbolje rime za reč {t} su: {', '.join(all_r[:10])}."}},
                        {"@type": "Question", "name": f'Koliko slogova ima reč „{t}"?',
                         "acceptedAnswer": {"@type": "Answer",
                            "text": f"Reč {t} ima {tsyl} {syl_word(tsyl)}."}}
                    ]
                }
            ]
        }, ensure_ascii=False, indent=1)

        head = HEAD_TMPL.format(tabs_nav=tabs_nav('rime'), title=esc(title), desc=esc(desc), ogdesc=esc(ogdesc),
                                canonical=canonical, base=BASE, schema=schema)

        body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>Rime za „{esc(t)}"</span></nav>
  <h1 class="landing-h1">Rime za reč „{esc(t)}"</h1>
  <p class="landing-meta">{len(all_r)} {rima_word(len(all_r))} · {tsyl} {syl_word(tsyl)} · rangirano po kvalitetu</p>
  <p class="landing-lead">Pronađene su <strong>{len(all_r)}</strong> reči koje se rimuju sa <strong>„{esc(t)}"</strong>. Iskoristi ih za pisanje pesme, teksta ili repa. Klikni na reč da otvoriš još rima, ili kopiraj celu listu.</p>
  {mean}
  <div class="copy-bar">
    <a class="landing-cta" href="/?rec={quote(t)}">✍️ Otvori Rimoteku i piši →</a>
    <button class="copy-all-btn" data-words="{esc(copy_words)}" onclick="navigator.clipboard.writeText(this.dataset.words).then(()=>{{this.textContent='Kopirano!';this.classList.add('copied');setTimeout(()=>{{this.textContent='Kopiraj sve rime';this.classList.remove('copied')}},1600)}}).catch(()=>{{this.textContent='Greška'}})">Kopiraj sve rime</button>
  </div>
  {groups}
  {syl_html}
  {rel_html}
  {mini_tool_form(t)}
  <section class="landing-faq">
    <h3>Česta pitanja</h3>
    <details><summary>Šta se rimuje sa „{esc(t)}"?</summary><p>Sa rečju {esc(t)} rimuju se, između ostalog: {esc(', '.join(all_r[:14]))}.</p></details>
    <details><summary>Koje se reči rimuju sa „{esc(t)}"?</summary><p>Najbolje rime za reč {esc(t)} su: {esc(', '.join(all_r[:10]))}.</p></details>
    <details><summary>Koliko slogova ima reč „{esc(t)}"?</summary><p>Reč {esc(t)} ima {tsyl} {syl_word(tsyl)}.</p></details>
    <details><summary>Kako da nađem još rima?</summary><p>U mini-alatu iznad upiši bilo koju reč — dobićeš proširenu listu rima, šire (asonantne) rime i filter po broju slogova.</p></details>
  </section>
</main>
"""
        page = head + body + footer
        pdir = os.path.join(outdir, sl)
        os.makedirs(pdir, exist_ok=True)
        with open(os.path.join(pdir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page)
        sitemap_entries.append(
            f'  <url><loc>{canonical}</loc><lastmod>2026-07-24</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>')
        generated += 1

    # 2b) statička strana /slogovi/ — keyword „brojanje slogova"
    slog_canon = f'{BASE}/slogovi/'
    slog_title = 'Brojanje slogova i karaktera — brojač za reč, stih i pesmu | Rimoteka'
    slog_desc = ('Besplatan brojač slogova, karaktera i reči: nalepi tekst i odmah vidiš broj slogova, '
                 'reči i znakova za svaki red. Podela reči na slogove u srpskom (sa slogotvornim „r") — pravila i primeri.')
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
  <div class="res-group"><h3>Kako se broje slogovi</h3>
    <p class="seo-p">Reč ima onoliko slogova koliko ima <strong>samoglasnika</strong> (a, e, i, o, u). Poseban slučaj je <strong>slogotvorno „r"</strong> — kada se nađe između suglasnika, i ono je nosilac sloga (npr. <em>vrt</em>, <em>prst</em>, <em>srce</em>).</p>
  </div>
  <div class="res-group"><h3>Podela reči na slogove</h3>
    <p class="seo-p">Svaki slog ima jedan samoglasnik kao nosioca, pa se reč deli na onoliko slogova koliko ima samoglasnika: <em>ja-bu-ka</em> (3), <em>de-voj-či-ca</em> (4), <em>ri-mo-va-nje</em> (4). Granica sloga ide ispred suglasnika koji pripada sledećem slogu. Kod slogotvornog „r" slog nosi samo „r": <em>sr-ce</em>, <em>pr-vi</em>. <strong>Rastavljanje reči na slogove</strong> je isto što i njihovo brojanje — alat iznad to radi za ceo tekst odjednom.</p>
  </div>
  <div class="res-group"><h3>Brojač karaktera i reči</h3>
    <p class="seo-p">Pored slogova, ovo je i <strong>brojač karaktera</strong> i <strong>brojač reči</strong>: za svaki red pokazuje broj znakova, a u zbiru broj karaktera sa razmacima i bez razmaka, broj reči i broj redova. Korisno kad tekst mora da stane u zadatu dužinu — čestitka, slogan, opis proizvoda, poruka ili meta opis strane.</p>
  </div>
  <div class="res-group"><h3>Primeri broja slogova</h3>
    <table class="slog-table"><thead><tr><th>Reč</th><th>Broj slogova</th></tr></thead><tbody>{ex_rows}</tbody></table>
  </div>
  <section class="landing-faq">
    <h3>Česta pitanja</h3>
    <details><summary>Kako se broje slogovi u reči?</summary><p>Reč ima onoliko slogova koliko ima samoglasnika (a, e, i, o, u). Izuzetak je slogotvorno „r" koje je i samo nosilac sloga (vrt = 1 slog, srce = 2 sloga).</p></details>
    <details><summary>Zašto je bitno brojati slogove u pesmi?</summary><p>Kada stihovi imaju sličan broj slogova, pesma ima ujednačen ritam, lakše se peva i pamti. Zato tekstopisci, pesnici i reperi broje slogove dok pišu.</p></details>
    <details><summary>Mogu li da prebrojim slogove u celoj pesmi?</summary><p>Da. Nalepi ceo tekst u polje na vrhu strane — pored svakog reda stoji broj slogova, a na dnu ukupan zbir za celu pesmu.</p></details>
    <details><summary>Broji li alat i karaktere?</summary><p>Da. Uz broj slogova, za svaki red pokazuje se i broj znakova, a u zbiru broj karaktera sa razmacima i bez razmaka, kao i broj reči.</p></details>
    <details><summary>Kako se reč deli na slogove?</summary><p>Reč ima onoliko slogova koliko ima samoglasnika, a granica sloga ide ispred suglasnika koji pripada sledećem slogu: ja-bu-ka, de-voj-či-ca. Kod slogotvornog „r" slog nosi samo „r": sr-ce, pr-vi.</p></details>
    <details><summary>Koliko slogova ima jedna reč?</summary><p>Prebroj samoglasnike u njoj — toliko ima slogova. Vrt i prst imaju jedan slog (slogotvorno „r"), srce i pesma dva, jabuka tri, devojčica četiri.</p></details>
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
             desc='Rečnik srpskog jezika sa preko 270.000 reči i objašnjenja. Traži reč po značenju ili po '
                  'slovima — koje se završavaju, počinju ili sadrže zadata slova, uz broj slogova za svaku.',
             h1='Rečnik srpskog jezika',
             lead='<strong>Rečnik srpskog jezika</strong> sa preko 270.000 reči — i uz svaku objašnjenje. '
                  'Reč možeš tražiti i po slovima — onu koja se završava na „-ost", počinje na „cvet" ili '
                  'negde u sebi ima „zvezd" — a uz svaku stoji broj slogova i značenje.',
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
                  'Za akrostih, aliteraciju ili kad ti je reč „na vrh jezika" pa se sećaš samo početka.'),
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
                  'Preko 270.000 reči, i uz svaku objašnjenje značenja. Za više od 13.000 reči tu su i sinonimi.'),
                 ('Kako da vidim značenje reči?',
                  'Klikni na dugme za objašnjenje pored reči u rezultatima — otvara se kratka definicija.'),
                 ('Kako da nađem reči koje se završavaju na određena slova?',
                  'Izaberi „završava se na…", upiši završetak (na primer „ost") i dobićeš sve reči iz rečnika '
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
                  'Možeš. U beležnici za pisanje pesama pored svakog tvog stiha stoji isto takvo slovo, uz broj '
                  'slogova i prikaz ritma.'),
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
                  'u stih, na mesto kursora. Ne moraš da otvaraš drugu stranu ni da prekidaš misao — a rečnik '
                  'iza toga ima preko 270.000 reči.'),
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
                  'Ne. Tekst se čuva isključivo u tvom pregledaču, na tvom uređaju, i ostaje tu i kad zatvoriš '
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
                 ('Obgrljena rima (ABBA)', 'Prvi stih se rimuje sa četvrtim, a drugi sa trećim — spoljašnji par „obgrljuje" unutrašnji. Zvuči svečano i zaokruženo.'),
                 ('Čista rima i asonanca', 'Čista (savršena) rima poklapa sve glasove od naglašenog samoglasnika (ruka — luka). Asonanca poklapa samo samoglasnike (more — kose) i daje slobodniji, moderniji zvuk čest u repu.'),
             ],
             faqs=[
                 ('Koje su glavne vrste rima?', 'Po rasporedu: parna (AABB), ukrštena (ABAB), obgrljena (ABBA) i nagomilana (AAAA). Po kvalitetu: čista rima i asonanca.'),
                 ('Šta je asonanca?', 'Asonanca je nesavršena rima u kojoj se poklapaju samo samoglasnici, a ne i svi suglasnici (npr. more — kose). Česta je u modernoj poeziji i repu.'),
                 ('Kako da vidim šemu rime u pesmi?', 'U Rimoteci, u tabu „Klasici", pored svakog stiha stoji slovo (A, B, C…) koje pokazuje koje se rime poklapaju — tako vidiš šemu rime velikih pesnika.'),
             ]),
        dict(slug='kako-napisati-pesmu',
             title='Kako napisati pesmu — koraci, rima i ritam | Rimoteka',
             desc='Kako napisati pesmu ili tekst: izbor teme, rima, ritam i broj slogova, refren. Praktični koraci i besplatan alat za rime i brojanje slogova.',
             h1='Kako napisati pesmu',
             lead='Pisanje pesme je veština koja se uči. Evo jednostavnih koraka — od ideje do gotovog stiha — uz alat koji ti pomaže oko <strong>rime</strong> i <strong>ritma</strong>.',
             cta_href='/', cta_text='✍️ Otvori Rimoteku i počni da pišeš →',
             sections=[
                 ('1. Izaberi temu i osećaj', 'Odluči o čemu pišeš i koje osećanje želiš da preneseš — ljubav, tuga, radost, sećanje. Jasna tema drži pesmu na okupu.'),
                 ('2. Pronađi rime', 'Za ključne reči na kraju stihova potraži rime. U Rimoteci upišeš reč i odmah dobiješ najbolje rime, rangirane po kvalitetu.'),
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
        # Glavna strana za ciljanu frazu „rimovanje reči" (exact-match slug).
        # Konkurencija (igrarecima.com/rimovanje-reci, rimovanje.com) rangira upravo
        # na exact-match putanji — homepage sam nije dovoljan.
        dict(slug='rimovanje-reci', aktivan_tab='rime',
             priority='0.9',
             tool=True,          # živi alat za rime na samoj strani
             title='Rimovanje reči — pronađi rimu za svaku srpsku reč | Rimoteka',
             desc='Rimovanje reči na srpskom: unesi reč i odmah dobij sve rime, sortirane po kvalitetu i broju slogova. Besplatno, bez reklama i registracije.',
             h1='Rimovanje reči',
             lead=('<strong>Rimovanje reči</strong> je traženje reči koje se na kraju zvučno poklapaju — '
                   'osnova svake pesme, rep numere, slogana i rođendanske čestitke. '
                   'Rimoteka pretražuje rečnik od <strong>preko 270.000 srpskih reči</strong> i '
                   'izlista rime u trenutku, poređane od najčešćih ka manje poznatim. '
                   'Evo reči za koje se rime najviše traže: ' + rimovanje_chips),
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
                  '<strong>1.</strong> Upiši reč u polje na <a href="/">početnoj strani</a> — može latinicom ili ćirilicom. '
                  '<strong>2.</strong> Klikni „Nađi rime" i dobićeš sve rime iz rečnika. '
                  '<strong>3.</strong> Filtriraj po broju slogova da rima stane u ritam tvog stiha.'),
                 ('Čiste rime i bliske rime',
                  'Čista rima se poklapa u potpunosti (<em>ljubav — nesloga</em> nije, <em>ljubav — grbav</em> jeste). '
                  'Bliska rima, ili asonanca, poklapa se samo u samoglasnicima i zvuči slobodnije — '
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
                  'Rečnik ima preko 270.000 srpskih reči, uz frekvencijske podatke koji najčešće i najkorisnije rime stavljaju na vrh liste.'),
                 ('Mogu li da vidim šta rima znači?',
                  'Da. Uz svaku rimu ide i objašnjenje reči, pa nećeš staviti u pesmu reč čije značenje ne znaš.'),
                 ('Šta ako se reč rimuje, ali mi ne odgovara po smislu?',
                  'Za takve slučajeve postoje sinonimi — Rimoteka predlaže reči istog značenja, pa možeš da zameniš reč na kraju stiha i potražiš rime za nju.'),
                 ('Postoji li brojač slogova i karaktera?',
                  'Da, u posebnom tabu. Slogovi su važni za ritam stiha, a broj karaktera za tekstove gde postoji ograničenje — na primer slogane i čestitke.'),
             ]),
        dict(slug='rime-za-decu',
             title='Rime za decu — bezbedne i lepe reči za dečje pesmice | Rimoteka',
             desc='Rime za decu: bezbedne, lepe i razumljive reči za dečje pesmice, igre i učenje. Filtrirano od neprikladnih reči — besplatan alat.',
             h1='Rime za decu',
             lead=f'Rimoteka je <strong>filtrirana od neprikladnih reči</strong>, pa je idealna za pravljenje dečjih pesmica. Evo popularnih, bezbednih reči koje se lepo rimuju i koje deca lako pamte: {deciji_chips}',
             cta_href='/?rec=dete', cta_text='🧸 Pronađi još rima za decu →',
             sections=[
                 ('Zašto Rimoteka za decu?', 'Rečnik je pročišćen od psovki, vulgarnosti i reči koje nisu primerene za decu. Roditelji i učitelji mogu slobodno da traže rime za pesmice i igre.'),
                 ('Popularne reči za dečje pesmice', 'mama, tata, dete, igra, sreća, radost, prijatelj, škola, knjiga, lopta, mačka, pas, ptica, cvet, sunce, mesec, zvezda, kiša, sneg.'),
                 ('Kako napisati dečju pesmicu?', 'Koristi kratak stih, ponavljanje i jednostavne reči. Rime koje deca lako pamte čine pesmicu zabavnom i pevljivom.'),
             ],
             faqs=[
                 ('Da li su rime na Rimoteci bezbedne za decu?', 'Da. Rimoteka je filtrirana od neprikladnih reči i pogrdnih izraza, pa je pogodna za decu, roditelje i učitelje.'),
                 ('Koje reči su dobre za dečje pesmice?', 'Jednostavne, slikovite reči kao što su dete, igra, sreća, sunce, mesec, zvezda, cvet, mama, tata, prijatelj.'),
                 ('Kako da pronađem rime za određenu reč?', 'Upiši reč u polje za pretragu na Rimoteci i klikni „Nađi rime". Rezultati su filtrirani i bezbedni.'),
             ]),
        dict(slug='rime-za-pesmu',
             title='Rime za pesmu — reči koje se rimuju za pisanje poezije | Rimoteka',
             desc='Rime za pesmu: pronađi reči koje se rimuju i piši lirike, ljubavne i druge pesme. Besplatan rečnik rima sa brojačem slogova.',
             h1='Rime za pesmu',
             lead='Svaka pesma počinje od ideje, a <strong>rima</strong> joj daje zvuk. Rimoteka pomaže pesnicima i tekstopiscima da brzo pronađu reči koje se rimuju i usklade ritam.',
             cta_href='/?rec=pesma', cta_text='✍️ Nađi rime za „pesma" →',
             sections=[
                 ('Kako koristiti Rimoteku za pisanje pesme?', 'Upiši ključnu reč na kraju stiha. Rimoteka će odmah izlistati najbolje rime, koje možeš filtrirati po broju slogova.'),
                 ('Ljubavne i emotivne rime', 'Za pesme o ljubavi često traže se rime za ljubav, srce, duša, sreća, tuga, bol, radost, nada, sanjarenje.'),
                 ('Priroda i svakodnevica', 'sunce, mesec, zvezda, nebo, oblak, kiša, sneg, vetar, more, reka, planina, šuma, cvet, dan, noć.'),
             ],
             faqs=[
                 ('Kako da brzo napišem pesmu?', 'Izaberi temu, napiši prvi stih, pa za poslednju reč potraži rimu u Rimoteci. Nastavi red po red i proveri broj slogova.'),
                 ('Da li moram da znam pravila poezije?', 'Ne moraš. Rima i sličan broj slogova su dovoljni da pesma lepo zvuči. Rimoteka ti pomaže sa oba.'),
                 ('Gde mogu da sačuvam pesmu?', 'U Rimoteci postoji Beležnica — tekst se čuva na tvom uređaju i ostaje i kad zatvoriš stranicu.'),
             ]),
        dict(slug='rime-za-rep',
             title='Rime za rep — reči koje se rimuju za rap tekstove | Rimoteka',
             desc='Rime za rep i rap tekstove: pronađi čiste i asonantne rime, filtriraj po broju slogova i piši tekstove. Besplatan alat za repera.',
             h1='Rime za rep',
             lead='U repu je <strong>ritam</strong> sve. Rimoteka daje rime koje se uklapaju u beat, uz filter po broju slogova — da svaka reč „sedi" tamo gde treba.',
             cta_href='/?rec=rep', cta_text='🎤 Nađi rime za „rep" →',
             sections=[
                 ('Kako odabrati rimu za rep?', 'Poslušaj beat i odredi gde pada naglasak. Zatim potraži rimu sa odgovarajućim brojem slogova da stih bude ritmički ispravan.'),
                 ('Asonanca u repu', 'Reperi često koriste asonantu — poklapanje samoglasnika — jer daje slobodniji i moderniji zvuk. U Rimoteci uključi „šire rime" da je pronađeš.'),
                 ('Interna rima i multi-slog rime', 'Pored krajnje rime, pokušaj da rimuješ i reči unutar stiha. Dugi, višesložni parovi zvuče tehnički impresivno.'),
             ],
             faqs=[
                 ('Šta su dobre rime za rep?', 'Rime koje imaju jasan ritam, odgovaraju beatu i nose značenje. Često se koriste asonantne rime i višesložni parovi.'),
                 ('Kako da uklopim rimu u beat?', 'Prebroj slogove u stihu i podesi rimu tako da naglasak pada na pravo mesto. Rimoteka prikazuje broj slogova za svaku reč.'),
                 ('Da li Rimoteka nudi asonantne rime?', 'Da. Uključi opciju „šire rime" da vidiš asonantne rime koje se poklapaju po samoglasnicima.'),
             ]),
    ]
    # 2e) tematske autoritet stranice — prilike, emocije, teme
    topic_defs = [
        dict(slug='rime-za-ljubavne-pesme',
             title='Rime za ljubavne pesme — reči koje se rimuju za ljubav | Rimoteka',
             desc='Rime za ljubavne pesme: najlepše reči koje se rimuju sa ljubav, srce, duša, sreća i druge. Ideje i alat za pisanje ljubavne poezije.',
             h1='Rime za ljubavne pesme',
             lead='Ljubavna poezija je večita tema. Bilo da pišeš pesmu za voljenu osobu, godišnjicu ili samo za sebe, ovde ćeš pronaći <strong>reči koje se rimuju</strong> i inspiraciju za svaki stih.',
             cta_href='/?rec=ljubav', cta_text='❤️ Nađi rime za „ljubav" →',
             sections=[
                 ('Najčešće reči u ljubavnim pesmama', 'ljubav, srce, duša, sreća, tuga, bol, radost, nada, strast, čežnja, samoća, osećaj, poljubac, zagrljaj, nežnost.'),
                 ('Kako napisati ljubavnu pesmu?', 'Počni od jedne slike ili trenutka. Nemoj se bojati jednostavnosti — najlepše ljubavne pesme su iskrene i direktne.'),
                 ('Šema rime za ljubavnu pesmu', 'Parna rima (AABB) je najjednostavnija za početnike. Ukrštena rima (ABAB) daje lepšu, melodičniju dinamiku.'),
             ],
             faqs=[
                 ('Koje rime najčešće idu sa „ljubav"?', 'Najbolje rime sa ljubav su srce, duša, tuga, radost, čežnja, strast, nežnost i mnoge druge emotivne reči.'),
                 ('Kako da pesma zvuči iskreno?', 'Piši o konkretnim detaljima — osećajima, mirisima, trenucima. Izbegavaj klisheeve koji ne zvuče kao tvoji.'),
                 ('Da li ljubavna pesma mora da se rimuje?', 'Ne mora, ali rima pomaže da pesma bude pevljiva i da se bolje pamti. Slobodni stih je takođe validan izbor.'),
             ]),
        dict(slug='rime-za-rodjendanske-pesmice',
             title='Rime za rođendanske pesmice — za odrasle i decu | Rimoteka',
             desc='Rime za rođendanske pesmice: smešne, slatke i emotivne reči za rođendan. Brzo pronađi rime i napiši jedinstvenu čestitku.',
             h1='Rime za rođendanske pesmice',
             lead='Umesto kupovne čestitke, napiši <strong>svoju rođendansku pesmicu</strong>. Rimoteka ti pomaže da pronađeš rime za srećan, dar, radost, prijatelj i druge ključne reči.',
             cta_href='/?rec=rodjendan', cta_text='🎂 Nađi rime za „rođendan" →',
             sections=[
                 ('Ideje za rođendanske pesmice', 'srećan rođendan, puno zdravlja, želje ti ispunim, dar ti spremim, prijatelj si dragi, još mnogo godina.'),
                 ('Pesmica za decu', 'Koristi kratke stihove, brojanje slogova i jednostavne rime. Deca vole ponavljanje i vesele reči kao što su lopta, torta, sveća, poklon.'),
                 ('Pesmica za odrasle', 'Dodaj humor ili dirljivu notu. Uzmi u obzir odnos sa osobom i zajednička sećanja.'),
             ],
             faqs=[
                 ('Kako napisati kratku rođendansku pesmicu?', 'Drži se 4–8 stihova. Počni sa čestitkom, dodaj ličnu poruku i završi sa željom.'),
                 ('Koje reči se najčešće rimuju sa rođendan?', 'Puno, zdravlje, sreća, dar, radost, slavlje, godina, prijatelj, porodica, ljubav.'),
                 ('Da li mogu da iskoristim pesmicu za čestitku?', 'Naravno. Možeš je prepisati na čestitku, poslati porukom ili objaviti na društvenim mrežama.'),
             ]),
        dict(slug='rime-za-svadbu',
             title='Rime za svadbu — čestitke, pesme i toastovi | Rimoteka',
             desc='Rime za svadbu: lepe reči za mladence, čestitke, pesme i toastove. Pronađi rime za ljubav, sreća, prsten, dom i zajednička putovanja.',
             h1='Rime za svadbu',
             lead='Svadba je jedan od najlepših dana u životu. Bilo da pišeš <strong>čestitku, pesmu ili toast</strong>, ovde ćeš pronaći rime koje će dirnuti mladence.',
             cta_href='/?rec=svadba', cta_text='💍 Nađi rime za „svadba" →',
             sections=[
                 ('Ključne reči za svadbu', 'ljubav, sreća, prsten, dom, porodica, prijatelj, put, život, radost, vernost, zaverno, sadašnjost, budućnost.'),
                 ('Kako napisati svadbeni toast?', 'Budan kratak, iskren i malo duhovit. Završi podizanjem čaše i željom za sreću mladenaca.'),
                 ('Pesma za mladence', 'Koristi rime koje govore o zajedničkom putu, podršci i ljubavi. Izbegavaj previše slatko — iskrenost je važnija.'),
             ],
             faqs=[
                 ('Šta napisati u svadbenoj čestitci?', 'Čestitka treba da bude kratka, topla i lična. Poželi im sreću, ljubav i lep zajednički život.'),
                 ('Koje rime idu sa „ljubav" za svadbu?', 'srce, sreća, lepota, nežnost, čežnja, radost, sigurnost, večnost, blizina, jedinstvo.'),
                 ('Koliko treba da traje svadbeni toast?', 'Najbolje je da toast traje 1–2 minute. Dovoljno da kažeš nekoliko lepih reči, ne predugo.'),
             ]),
        dict(slug='rime-za-decu-o-zivotinjama',
             title='Rime za decu o životinjama — vesele dečje pesmice | Rimoteka',
             desc='Rime za decu o životinjama: mačka, pas, ptica, konj, lav i druge. Bezbedne i razumljive reči za dečje pesmice i igre.',
             h1='Rime za decu o životinjama',
             lead='Deca obožavaju životinje. Ovde ćeš pronaći <strong>bezbedne rime</strong> za mačku, psa, pticu, konja, lava i druge životinje — idealno za pesmice i učenje.',
             cta_href='/?rec=macka', cta_text='🐱 Nađi rime za „mačka" →',
             sections=[
                 ('Popularne životinje u dečjim pesmicama', 'mačka, pas, ptica, konj, lav, golub, leptir, pčela, riba, zmija, vuk, orao.'),
                 ('Kako napisati pesmicu o životinji?', 'Opiši kako izgleda, šta voli da radi i kakav zvuk proizvodi. Koristi ponavljanje i jednostavne rime.'),
                 ('Učenje kroz pesmu', 'Pesmice o životinjama pomažu deci da zapamte nazive, zvukove i karakteristike životinja na zabavan način.'),
             ],
             faqs=[
                 ('Koje životinje su najbolje za dečje pesmice?', 'Mačke, psi, ptice, konji, lavovi i pčele su klasici jer su deci bliski i lako se opisuju.'),
                 ('Da li su rime bezbedne za najmlađu decu?', 'Da. Rimoteka je filtrirana od neprikladnih reči, pa je pogodna i za vrtićku decu.'),
                 ('Kako deca najbolje uče pesmice napamet?', 'Kroz ponavljanje, pokrete i igru. Što je pesma kraća i melodičnija, brže će je zapamtiti.'),
             ]),
        dict(slug='rime-za-decu-o-prirodi',
             title='Rime za decu o prirodi — sunce, mesec, kiša, sneg | Rimoteka',
             desc='Rime za decu o prirodi: sunce, mesec, zvezda, oblak, kiša, sneg, cvet i druge reči. Bezbedne pesmice za decu i učitelje.',
             h1='Rime za decu o prirodi',
             lead='Priroda je najlepša inspiracija za dečje pesmice. Pronađi bezbedne rime za <strong>sunce, mesec, zvezde, kišu, sneg, cvetove</strong> i piši pesmice koje deca vole.',
             cta_href='/?rec=sunce', cta_text='☀️ Nađi rime za „sunce" →',
             sections=[
                 ('Teme iz prirode za decu', 'sunce, mesec, zvezda, nebo, oblak, kiša, sneg, vetar, more, reka, planina, šuma, drvo, cvet, trava.'),
                 ('Sezonske pesmice', 'Proleće — cvetovi i povratak toplote. Leto — sunce i more. Jesen — kiša i opalo lišće. Zima — sneg i novogodišnja čarolija.'),
                 ('Kako povezati prirodu i osećanja?', 'Sunce može da bude srećno, kiša tužna, a vetar slobodan. Priroda uči decu da prepoznaju emocije.'),
             ],
             faqs=[
                 ('Koje reči iz prirode se najčešće rimuju?', 'sunce — mesece, zvezda — nebesa, kiša — bliza, sneg — beg, cvet — svet, reka — čeka.'),
                 ('Kako deca uče o prirodi kroz pesme?', 'Pesmice pomažu deci da zapamte nazive pojava, boje, zvukove i sezone na zabavan način.'),
                 ('Da li mogu koristiti ove pesmice u vrtiću?', 'Da, sve reči su bezbedne i primerene za decu, vrtiće i škole.'),
             ]),
        dict(slug='rime-za-novu-godinu',
             title='Rime za Novu godinu — čestitke, pesmice i želje | Rimoteka',
             desc='Rime za Novu godinu: čestitke, pesmice i želje za sreću, zdravlje, ljubav i uspeh. Pronađi reči koje se rimuju i napiši jedinstvenu čestitku.',
             h1='Rime za Novu godinu',
             lead='Nova godina donosi novu nadu. Bilo da pišeš <strong>čestitku, pesmicu ili poruku</strong>, ovde ćeš pronaći rime za srećan, zdravlje, uspeh, ljubav i nova početka.',
             cta_href='/?rec=novagodina', cta_text='🎆 Nađi rime za „nova godina" →',
             sections=[
                 ('Ključne reči za Novu godinu', 'srećna Nova godina, zdravlje, radost, uspeh, ljubav, sreća, mir, želje, početak, budućnost, porodica, prijatelj.'),
                 ('Kratke novogodišnje poruke', 'Neka ti Nova bude ispunjena smehom, toplinom i trenucima koji se pamte.'),
                 ('Novogodišnja pesmica za decu', 'Koristi reči kao što su sneg, dar, svetlo, kalendar, petarda, žurka. Deca vole ritam i ponavljanje.'),
             ],
             faqs=[
                 ('Kako napisati novogodišnju čestitku?', 'Budi kratak, topao i iskren. Poželi zdravlje, sreću i nekoliko ličnih želja koje odgovaraju osobi.'),
                 ('Koje rime idu sa „godina"?', 'Neka rime za godina su: radost, sreća, ljubav, prijatelj, početak, trenutak, čarolija, porodica.'),
                 ('Da li mogu poslati pesmicu umesto čestitke?', 'Naravno. Personalizovana pesma često ostavlja jači utisak od univerzalne čestitke.'),
             ]),
        dict(slug='rime-za-roditelje',
             title='Rime za roditelje — pesme za majku, oca i porodicu | Rimoteka',
             desc='Rime za roditelje: reči koje se rimuju za majku, oca, baku, dedu i celu porodicu. Ideje za pesme, čestitke i poklon poruke.',
             h1='Rime za roditelje',
             lead='Za roditelje nikad nije dovoljno reći hvala. Bilo da pišeš <strong>pesmu za majku, oca, baku ili dedu</strong>, ovde ćeš pronaći rime koje izražavaju ljubav i zahvalnost.',
             cta_href='/?rec=majka', cta_text='👩 Nađi rime za „majka" →',
             sections=[
                 ('Ključne reči za roditelje', 'majka, otac, mama, tata, baka, deda, porodica, dom, ljubav, briga, zahvalnost, sećanje, detinjstvo.'),
                 ('Pesma za majku', 'Fokusiraj se na njezinu brigu, toplinu i žrtvu. Najlepše pesme su one koje govore o konkretnim trenucima.'),
                 ('Pesma za oca', 'Naglasite snagu, podršku i sigurnost. Čak i kratka pesma može mnogo značiti.'),
             ],
             faqs=[
                 ('Kako napisati dirljivu pesmu za roditelje?', 'Počni od jednog secanja ili osobine. Piši iskreno i ne boj se emocija.'),
                 ('Koje rime idu sa „majka"?', 'Neka rime za majka su: reka, čeka, njega, lepa, neba, svega, greha, snega.'),
                 ('Da li kratak stih može biti dovoljan?', 'Da. Ponekad je najjača poruka ona najkraća — samo nekoliko stihova punih značenja.'),
             ]),
        dict(slug='rime-za-prijatelje',
             title='Rime za prijatelje — pesme i čestitke za najbolje društvo | Rimoteka',
             desc='Rime za prijatelje: reči koje se rimuju za prijateljstvo, vernost, podršku i zajednička sećanja. Napiši pesmu ili čestitku za prijatelja.',
             h1='Rime za prijatelje',
             lead='Pravo prijateljstvo je retko i dragoceno. Bilo da pišeš <strong>pesmu za rođendan prijatelja</strong> ili samo želiš da mu se zahvališ, ovde ćeš pronaći inspiraciju.',
             cta_href='/?rec=prijatelj', cta_text='🤝 Nađi rime za „prijatelj" →',
             sections=[
                 ('Ključne reči za prijatelje', 'prijatelj, prijateljstvo, vernost, podrška, razumevanje, smeh, tuga, radost, put, sećanje, poverenje.'),
                 ('Kako napisati pesmu za prijatelja?', 'Pomislite na zajedničke avanture, smešne trenutke i trenutke kada vam je bio uz vas.'),
                 ('Čestitka umesto pesme', 'Čak i nekoliko stihova mogu pokazati da ceniš prijateljstvo. Dodaš lični detalj — pesma postaje nezaboravna.'),
             ],
             faqs=[
                 ('Koje rime idu sa „prijatelj"?', 'Neka rime za prijatelj su: smeh, dnevnik, željeznički, najbolji, srećan, vredan. Bolje je koristiti Rimoteku za sve opcije.'),
                 ('Da li pesma mora biti ozbiljna?', 'Ne mora. Prijatelji često vole humor i zajebanciju u pesmama.'),
                 ('Kako završiti pesmu za prijatelja?', 'Završi sa željom, zahvalnošću ili unutrašnjom šalom koja je samo vaša.'),
             ]),
        dict(slug='rime-za-tugu-i-secanje',
             title='Rime za tugu i sećanje — pesme za teške trenutke | Rimoteka',
             desc='Rime za tugu, bol, sećanje i oproštaj. Reči koje pomažu da se izrazi tuga, poštovanje prema preminulima ili bol rastanka.',
             h1='Rime za tugu i sećanje',
             lead='U teškim trenucima reči ponekad najteže dolaze. Ovde ćeš pronaći <strong>rime za tugu, bol, sećanje, oproštaj i smrt</strong> — da napišeš ono što nosiš u sebi.',
             cta_href='/?rec=tuga', cta_text='🕯️ Nađi rime za „tuga" →',
             sections=[
                 ('Ključne reči u teškim trenucima', 'tuga, bol, sećanje, oproštaj, suza, tišina, noć, san, daljina, rastanak, nedostaješ, mir, večnost.'),
                 ('Pesma za preminulog', 'Budite iskreni i jednostavni. Najvažnije je da prenesete ljubav i secanje, a ne savršenu formu.'),
                 ('Pesma o rastanku', 'Dozvolite si tugu. Rastanci su deo života, a pesma može pomoći da se osećanja barem malo razbistre.'),
             ],
             faqs=[
                 ('Kako napisati pesmu za nekog ko je preminuo?', 'Počni od jednog secanja ili osobine. Reci šta ti nedostaje i zahvali se na onom što ste imali.'),
                 ('Koje rime idu sa „tuga"?', 'Neka rime za tuga su: druga, luga, šuga, ruga, kruga — ali izaberi one koje nose pravo značenje za tvoju pesmu.'),
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
                 ('Kako koristiti Rimoteku?', 'Unesi reč u polje za pretragu, klikni „Nađi rime" i biraj najbolju rimu po kvalitetu i broju slogova.'),
             ],
             faqs=[
                 ('Da li moram da znam metriku da bih pisao pesme?', 'Ne moraš. Dovoljno je da stihovi imaju sličan broj slogova i da se rime poklapaju.'),
                 ('Kako da znam koja rima je bolja?', 'Čista rima je jača od asonance. Rimoteka ti pokazuje kvalitet svake rime — odaberim one koje najbolje zvuče.'),
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
