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
<link rel="stylesheet" href="/style.css?v=20260724b">
<script type="application/ld+json">
{schema}
</script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="/" title="Rimoteka — rime, rečnik i slogovi">
    <h1 class="brand-h"><img src="/logo-icon.png" class="logo-r" alt="Rimoteka" width="512" height="512"><span class="brand-word">imoteka</span></h1>
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
      <a href="/slogovi/" class="footer-link">Brojanje slogova</a> · <a href="/vrste-rima/" class="footer-link">Vrste rima</a> · <a href="/kako-napisati-pesmu/" class="footer-link">Kako napisati pesmu</a> · <a href="/rime-za-decu/" class="footer-link">Rime za decu</a> · <a href="/rime-za-pesmu/" class="footer-link">Rime za pesmu</a> · <a href="/rime-za-rep/" class="footer-link">Rime za rep</a>
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

def content_page(footer, slug, title, desc, h1, lead_html, sections, faqs, cta_href, cta_text):
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
    body = f"""<main class="landing">
  <nav class="crumbs" aria-label="Putanja"><a href="/">Rimoteka</a> › <span>{esc(h1)}</span></nav>
  <h1 class="landing-h1">{esc(h1)}</h1>
  <p class="landing-lead">{lead_html}</p>
  <a class="landing-cta" href="{cta_href}">{esc(cta_text)}</a>
  {secs}
  <section class="landing-faq"><h3>Česta pitanja</h3>{faq_html}</section>
</main>
"""
    d = os.path.join(PUB, slug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(head + body + footer)
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

    # 1) finalna lista meta-reči: postoje u rečniku, jedinstven slug
    TARGET_COUNT = 500
    targets, seen_slug, chosen = [], {}, set()

    def add_target(t):
        if t not in wset or t in chosen:
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
    import shutil
    outdir = os.path.join(PUB, 'rime-za')
    if os.path.isdir(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir, exist_ok=True)
    sitemap_entries = ['  <url><loc>%s/</loc><lastmod>2026-07-24</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>' % BASE]

    generated = 0
    for t in targets:
        key = rhyme_key(t)
        klen = len(key)
        cands = [w for w in keygroup[key] if w != t]
        cands.sort(key=lambda w: (-common_suffix(t, w), rank[w]))
        best = [w for w in cands if common_suffix(t, w) > klen][:50]
        good = [w for w in cands if common_suffix(t, w) == klen][:36]

        # Fallback (kao doRhymes): reči sa malo savršenih rima -> „isti završni slog"
        final_extra = []
        if len(best) + len(good) < 6:
            fk = final_syl_key(t)
            strong_set = set(keygroup[key]); strong_set.add(t)
            fin = [w for w in finalgroup[fk] if w not in strong_set]
            fin.sort(key=lambda w: (-common_suffix(t, w), rank[w]))
            final_extra = fin[:40]

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

        groups = (group_html('Najbolje rime', best, True)
                  + group_html('Dobre rime', good, False)
                  + group_html('Dobre rime (isti završni slog)', final_extra, False))

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
    # 2d) nišne autoritet strane — deca, pesme, rep
    niche_defs = [
        dict(slug='rime-za-decu',
             title='Rime za decu — bezbedne i lepe reči za dečje pesmice | Rimoteka',
             desc='Rime za decu: bezbedne, lepe i razumljive reči za dečje pesmice, igre i učenje. Filtrirano od neprikladnih reči — besplatan alat.',
             h1='Rime za decu',
             lead='Rimoteka je <strong>filtrirana od neprikladnih reči</strong>, pa je idealna za pravljenje dečjih pesmica. Evo popularnih, bezbednih reči koje se lepo rimuju i koje deca lako pamte.',
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
    content_defs.extend(niche_defs)

    for cd in content_defs:
        c = content_page(footer, cd['slug'], cd['title'], cd['desc'], cd['h1'],
                         cd['lead'], cd['sections'], cd['faqs'], cd['cta_href'], cd['cta_text'])
        sitemap_entries.append(
            f'  <url><loc>{c}</loc><lastmod>2026-07-24</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>')

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
