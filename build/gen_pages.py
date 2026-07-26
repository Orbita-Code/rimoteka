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
<link rel="stylesheet" href="/style.css?v=20260726h">
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
"""

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
      <a href="/rime-za-decu/" class="footer-link">Rime za decu</a> · <a href="/rime-za-pesmu/" class="footer-link">Rime za pesmu</a> · <a href="/rime-za-rep/" class="footer-link">Rime za rep</a> · <a href="/rime-za-ljubavne-pesme/" class="footer-link">Ljubavne pesme</a> · <a href="/rime-za-rodjendanske-pesmice/" class="footer-link">Rođendan</a> · <a href="/rime-za-svadbu/" class="footer-link">Svadba</a>
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
TOOL_SCRIPT = '<script src="/app.js?v=20260726o"></script>\n'


def content_page(footer, slug, title, desc, h1, lead_html, sections, faqs, cta_href, cta_text,
                 tool=False):
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
                            canonical=canon, base=BASE, schema=schema)
    secs = ''.join(f'<div class="res-group"><h3>{esc(st)}</h3><p class="seo-p">{sb}</p></div>'
                   for st, sb in sections)
    faq_html = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faqs)
    # Kad strana ima živi alat, on ide ODMAH ispod naslova (to je ono zbog čega
    # je korisnik došao), a dugme „idi na početnu" nema smisla — alat je tu.
    alat = TOOL_HTML if tool else ''
    cta = '' if tool else f'  <a class="landing-cta" href="{cta_href}">{esc(cta_text)}</a>\n'
    body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>{esc(h1)}</span></nav>
  <h1 class="landing-h1">{esc(h1)}</h1>
{alat}  <p class="landing-lead">{lead_html}</p>
{cta}  {secs}
  <section class="landing-faq"><h3>Česta pitanja</h3>{faq_html}</section>
</main>
"""
    d = os.path.join(PUB, slug)
    os.makedirs(d, exist_ok=True)
    izlaz = head + body + footer
    if tool:
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

        head = HEAD_TMPL.format(title=esc(title), desc=esc(desc), ogdesc=esc(ogdesc),
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
    slog_title = 'Brojanje slogova — broj slogova u reči i stihu | Rimoteka'
    slog_desc = ('Brojanje slogova onlajn: prebroj slogove u reči, stihu ili celoj pesmi. '
                 'Kako se broje slogovi u srpskom jeziku (sa slogotvornim „r") — pravila, primeri i besplatan alat.')
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
                 "acceptedAnswer": {"@type": "Answer", "text": "Kada stihovi imaju sličan broj slogova, pesma ima ujednačen ritam, lakše se peva i pamti. Zato tekstopisci, pesnici i reperi broje slogove dok pišu."}}]}]
    }, ensure_ascii=False, indent=1)
    slog_head = HEAD_TMPL.format(title=esc(slog_title), desc=esc(slog_desc), ogdesc=esc(slog_desc),
                                 canonical=slog_canon, base=BASE, schema=slog_schema)
    slog_examples = [('vrt', 1), ('prst', 1), ('srce', 2), ('ljubav', 2), ('pesma', 2),
                     ('jabuka', 3), ('rimovanje', 4), ('devojčica', 4)]
    ex_rows = ''.join(
        f'<tr><td>{esc(w)}</td><td>{n} {syl_word(n)}</td></tr>' for w, n in slog_examples)
    slog_body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>Brojanje slogova</span></nav>
  <h1 class="landing-h1">Brojanje slogova online</h1>
  <p class="landing-lead"><strong>Brojanje slogova</strong> ti pomaže da stihovi imaju ujednačen ritam — da se pesma lepo peva i lako pamti. U Rimoteci možeš da prebrojiš slogove u pojedinačnoj reči, u stihu ili u celoj pesmi, red po red.</p>
  <a class="landing-cta" href="/?tab=slogovi">✍️ Otvori Brojač slogova u alatu →</a>
  <div class="res-group"><h3>Kako se broje slogovi</h3>
    <p class="seo-p">Reč ima onoliko slogova koliko ima <strong>samoglasnika</strong> (a, e, i, o, u). Poseban slučaj je <strong>slogotvorno „r"</strong> — kada se nađe između suglasnika, i ono je nosilac sloga (npr. <em>vrt</em>, <em>prst</em>, <em>srce</em>).</p>
  </div>
  <div class="res-group"><h3>Primeri broja slogova</h3>
    <table class="slog-table"><thead><tr><th>Reč</th><th>Broj slogova</th></tr></thead><tbody>{ex_rows}</tbody></table>
  </div>
  <section class="landing-faq">
    <h3>Česta pitanja</h3>
    <details><summary>Kako se broje slogovi u reči?</summary><p>Reč ima onoliko slogova koliko ima samoglasnika (a, e, i, o, u). Izuzetak je slogotvorno „r" koje je i samo nosilac sloga (vrt = 1 slog, srce = 2 sloga).</p></details>
    <details><summary>Zašto je bitno brojati slogove u pesmi?</summary><p>Kada stihovi imaju sličan broj slogova, pesma ima ujednačen ritam, lakše se peva i pamti. Zato tekstopisci, pesnici i reperi broje slogove dok pišu.</p></details>
    <details><summary>Mogu li da prebrojim slogove u celoj pesmi?</summary><p>Da. U tabu „Slogovi i znakovi" nalepi ceo tekst — Rimoteka pored svakog reda ispisuje broj slogova, a na dnu ukupan zbir.</p></details>
  </section>
</main>
"""
    slog_dir = os.path.join(PUB, 'slogovi')
    os.makedirs(slog_dir, exist_ok=True)
    with open(os.path.join(slog_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(slog_head + slog_body + footer)
    sitemap_entries.append(
        f'  <url><loc>{slog_canon}</loc><lastmod>2026-07-24</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>')

    # 2c) tematske strane (autoritet + niše)
    content_defs = [
        dict(slug='vrste-rima',
             title='Vrste rima u poeziji — parna, ukrštena, obgrljena | Rimoteka',
             desc='Vrste rima u poeziji: parna (AABB), ukrštena (ABAB), obgrljena (ABBA) i asonanca. Objašnjenje šema rime sa primerima — za pisanje pesama i tekstova.',
             h1='Vrste rima u poeziji',
             lead='Rima je poklapanje glasova na kraju stihova. Po rasporedu razlikujemo nekoliko <strong>vrsta rima</strong> — evo najčešćih šema sa primerima kod velikih pesnika.',
             cta_href='/?tab=klasici', cta_text='📖 Vidi šeme rime kod klasika →',
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
        dict(slug='rimovanje-reci',
             priority='0.9',
             tool=True,          # živi alat za rime na samoj strani
             title='Rimovanje reči — pronađi rimu za svaku srpsku reč | Rimoteka',
             desc='Rimovanje reči na srpskom: unesi reč i odmah dobij sve rime, sortirane po kvalitetu i broju slogova. Besplatno, bez reklama i registracije.',
             h1='Rimovanje reči',
             lead=('<strong>Rimovanje reči</strong> je traženje reči koje se na kraju zvučno poklapaju — '
                   'osnova svake pesme, rep numere, slogana i rođendanske čestitke. '
                   'Rimoteka pretražuje rečnik od <strong>preko 278.000 srpskih reči</strong> i '
                   'izlista rime u trenutku, poređane od najčešćih ka manje poznatim. '
                   'Evo reči za koje se rime najviše traže: ' + rimovanje_chips),
             cta_href='/', cta_text='🔍 Rimuj svoju reč →',
             sections=[
                 ('Zašto Rimoteka, a ne bilo koji rimer?',
                  'Rimoteka je pravljena <strong>za srpski jezik</strong>, a ne prevedena sa engleskog — '
                  'zato prepoznaje ćirilicu i latinicu, ijekavicu i naše nastavke. '
                  'Uz rime dobijaš i ono što drugi rimeri ne daju: '
                  '<strong>značenje svake reči</strong> (preko 280.000 objašnjenja — nema ga nijedan rimer u svetu), '
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
                  'Rečnik ima preko 278.000 srpskih reči, uz frekvencijske podatke koji najčešće i najkorisnije rime stavljaju na vrh liste.'),
                 ('Mogu li da vidim šta rima znači?',
                  'Da. Rimoteka pored rime pokazuje i objašnjenje reči — ima preko 280.000 definicija na srpskom. To nema nijedan drugi rimer, pa nećeš staviti u pesmu reč čije značenje ne znaš.'),
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
                         tool=cd.get('tool', False))
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
