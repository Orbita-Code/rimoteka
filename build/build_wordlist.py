#!/usr/bin/env python3
"""
Gradi cist EKAVSKI srpski recnik za Rimoteku (bez jekavice i bez psovki).
Izvori:
  /tmp/sr_full.txt    - OpenSubtitles (oblik freq), latinica
  /tmp/sr_index.dic   - Hunspell osnovni oblici, cirilica
Izlaz:
  ../public/reci.txt  - jedna rec po liniji, latinica, sortirano po frekvenciji
"""
import os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "reci.txt")
OUT_JEK = os.path.join(HERE, "..", "public", "reci_jekavica.txt")

ALLOWED = set("abcčćdđefghijklmnoprsštuvzž")

CYR2LAT = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z',
    'и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o',
    'п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c',
    'ч':'č','џ':'dž','ш':'š'
}
def cyr_to_lat(w):
    return ''.join(CYR2LAT.get(ch, ch) for ch in w)

# ------- Smece / OCR / strane reci -------
JUNK = {
    "ijubav","jubav","poijubac","lljubav","ljbav","ljibav",
    "devijčica","obleka","meleka","aleka","afleka","rifleka",
    "kumleka","jeljubav","alcatraz","shiraz","bounce","džordžina",
    "judžina","redžina","storibruka","faruka","haruka","sarfaraz",
    "liraz","štambuka","america","erica","prica","africa",
    "creme","clark","clarka","clarkov",
}

# ------- Psovke / vulgarno (deciji sajt!) -------
PROFANITY_STEMS = [
    "pičk","pičic","pizd","kurac","kurc","kurč","kurv","jeb",
    "drka","drko","drki","drkn","drkadž","izdrk","nadrk","podrk","drkat",
    "govn","sranj","srat","srati","srate","usra","usro","posra","posro",
    "zasra","nasra","guzic","šupak","šupč","peder","kenj",
]
PROFANITY_PROTECT = ["ljeb","drije","posram","tandrk"]   # hljeb, ždrijeb, posramljen, tandrkati
PIC_EXACT = {"picka","picke","picku","picko","picki","pickom","pickama",
             "pickica","pickice","pickicu","pickin"}

def is_profane(w):
    if w in PIC_EXACT:
        return True
    for p in PROFANITY_PROTECT:
        if p in w:
            return False
    for s in PROFANITY_STEMS:
        if s in w:
            return True
    return False

def is_valid(w):
    if w in JUNK or is_profane(w):
        return False
    return 2 <= len(w) <= 25 and all(ch in ALLOWED for ch in w)

# ------------------- Sklapanje recnika -------------------
freq = {}
MIN_FREQ = 20
with open("/tmp/sr_full.txt", encoding="utf-8", errors="replace") as f:
    for line in f:
        parts = line.split()
        if len(parts) != 2:
            continue
        w, c = parts[0].lower(), parts[1]
        try:
            c = int(c)
        except ValueError:
            continue
        if c < MIN_FREQ or not is_valid(w):
            continue
        if c > freq.get(w, 0):
            freq[w] = c
print(f"OpenSubtitles: {len(freq)} reci (freq>={MIN_FREQ})")

n_added = 0
with open("/tmp/sr_index.dic", encoding="utf-8", errors="replace") as f:
    first = True
    for line in f:
        line = line.strip()
        if first:
            first = False
            if line.isdigit():
                continue
        if not line:
            continue
        lat = cyr_to_lat(line.split('/')[0].strip().lower())
        if not is_valid(lat):
            continue
        if lat not in freq:
            freq[lat] = 4
            n_added += 1
print(f"Hunspell dopuna: +{n_added} reci")

# Prave reci koje su ispod frekvencijskog praga (freq<20) ali ih korisnica zeli
WHITELIST = {
    "isfleka","isflekam","isflekaš","isflekamo","isflekate","isflekaju",
    "isflekati","isflekao","isflekala","isflekalo","isflekali","isflekale",
    "isflekan","isflekana","isflekano","isflekani","isflekane",
}
for w in WHITELIST:
    if is_valid(w) and w not in freq:
        freq[w] = 10
        n_added += 1

words = sorted(freq.keys(), key=lambda w: (-freq[w], w))
S = set(words)
RANK = {w: i for i, w in enumerate(words)}

# ------------------- Jekavica filter -------------------
SHORT_C = "dmvpstcbr"   # bez l i n unutar reci (bolje/bole, njega/nega)
MANUAL_JEK = {"prije","poslije","dvije","tisuća","tisuću","tisuće","kruh","kruha",
              "mrkva","tjedan","tjedna","tjedni","tjednu","gdje","ovdje","ondje","nigdje"}

def dejek_candidates(w):
    c = set()
    i = w.find("ije")          # dugi jat: ije -> e (samo ako NIJE na kraju)
    while i != -1:
        if i + 3 < len(w):
            c.add(w.replace("ije", "e")); break
        i = w.find("ije", i + 1)
    for ch in SHORT_C:          # kratki jat: Cje -> Ce
        if ch + "je" in w:
            c.add(w.replace(ch + "je", ch + "e"))
    if w.startswith("lje"):     # ljeto->leto, ljepota->lepota (samo na pocetku)
        c.add("le" + w[3:])
    return c

def is_jekavica(w):
    if w in MANUAL_JEK:
        return True
    for cand in dejek_candidates(w):
        if cand != w and cand in S and RANK[cand] < RANK[w]:
            return True
    return False

ekavski = [w for w in words if not is_jekavica(w)]
ijekavski = [w for w in words if is_jekavica(w)]
print(f"Ekavski: {len(ekavski)} reci · Ijekavski (poseban fajl): {len(ijekavski)} reci")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(ekavski))
with open(OUT_JEK, "w", encoding="utf-8") as f:
    f.write("\n".join(ijekavski))
print(f"Zapisano: reci.txt ({os.path.getsize(OUT)/1024/1024:.2f} MB) + "
      f"reci_jekavica.txt ({os.path.getsize(OUT_JEK)/1024/1024:.2f} MB)")
