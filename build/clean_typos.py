#!/usr/bin/env python3
"""Prepoznaje reči-tipfelere u public/reci.txt: reči kojima je „skinuta" kvačica
(c umesto č/ć, dj umesto đ, s umesto š, z umesto ž, futuri tipa dobiceš->dobićeš).

Reč se smatra tipfelerom i kandidat je za izbacivanje SAMO ako:
  1) sama reč NIJE u definicije.json (nije definisana), i
  2) postoji restauracija kvačica koja JESTE u definicije.json (pravi oblik već postoji), i
  3) dužina >= 5 (kratke reči su rizične), i
  4) reč je čisto ASCII slova a-z (bez stranih w/x/y/q).

Konzervativno: ako pravi oblik ne postoji u rečniku, reč se NE dira.

Upotreba:
  python3 build/clean_typos.py            # DRY-RUN: ispiše koliko i uzorak
  python3 build/clean_typos.py --apply    # zaista prepiše reci.txt (uz backup)
"""
import json, os, sys, itertools

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFS = os.path.join(ROOT, "public", "definicije.json")
RECI = os.path.join(ROOT, "public", "reci.txt")

defs = set(json.load(open(DEFS, encoding="utf-8")).keys())

OPT = {'c': ['c', 'č', 'ć'], 's': ['s', 'š'], 'z': ['z', 'ž']}

def restorations(w):
    """Generiše varijante reči vraćanjem kvačica; vraća one koje su u defs (osim originala)."""
    # prvo dj-jedinice: svako 'dj' može ostati 'dj' ili postati 'đ'
    # predstavljamo reč kao listu jedinica
    units = []
    i = 0
    while i < len(w):
        if w[i] == 'd' and i + 1 < len(w) and w[i+1] == 'j':
            units.append(('dj', ['dj', 'đ'])); i += 2
        elif w[i] in OPT:
            units.append((w[i], OPT[w[i]])); i += 1
        else:
            units.append((w[i], [w[i]])); i += 1
    amb = sum(1 for _, opts in units if len(opts) > 1)
    if amb == 0 or amb > 7:
        return []
    found = []
    for combo in itertools.product(*[opts for _, opts in units]):
        cand = ''.join(combo)
        if cand != w and cand in defs:
            found.append(cand)
    return found

def main():
    apply = '--apply' in sys.argv
    words = [l.rstrip('\n') for l in open(RECI, encoding='utf-8')]
    seen_defs = defs
    todel = {}  # word -> ispravan oblik
    for w in words:
        ws = w.strip()
        if not ws or len(ws) < 5:
            continue
        if not ws.isalpha():
            continue
        if any(c in ws for c in 'wxyq'):
            continue
        if ws in seen_defs:
            continue  # definisane reči se NIKAD ne diraju
        # mora sadržati bar jedan ambiguni znak
        if not (('dj' in ws) or any(c in ws for c in 'csz')):
            continue
        r = restorations(ws)
        if r:
            todel[ws] = r[0]
    print(f"reci.txt: {len(words)} linija | tipfelera-kandidata: {len(todel)}")
    sample = sorted(todel.items())
    print("=== UZORAK (svako 50.) ===")
    for i in range(0, len(sample), max(1, len(sample)//60)):
        w, c = sample[i]
        print(f"  {w}  ->  {c}")
    if apply:
        # backup
        import shutil
        bak = RECI + ".bak"
        shutil.copy(RECI, bak)
        kept = [l for l in words if l.strip() not in todel]
        TMP = RECI + ".tmp"
        with open(TMP, 'w', encoding='utf-8') as f:
            f.write('\n'.join(kept) + '\n')
        os.replace(TMP, RECI)
        print(f"\nPRIMENJENO: izbačeno {len(todel)} | ostalo {len(kept)} | backup: {bak}")

if __name__ == '__main__':
    main()
