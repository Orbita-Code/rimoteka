#!/usr/bin/env python3
"""Inkrementalno brisanje stranih reči iz reci.txt na osnovu MOJE klasifikacije.
ambig.json = lista ~44k 'nepoznatih' (ni u mom ni u srpskom rečniku).
Poziv: python3 build/del_ambig.py START END KEEP1,KEEP2,...
  - briše ambig[START:END] OSIM keepera iz reci.txt
  - keepere upisuje u /tmp/ambig_keep.txt (srpske reči za kasnije definisanje)
  - ispiše sledećih 300 za klasifikaciju
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECI = os.path.join(ROOT, "public", "reci.txt")
ambig = json.load(open("/tmp/ambig.json", encoding="utf-8"))
start, end = int(sys.argv[1]), int(sys.argv[2])
keep = set(w.strip() for w in (sys.argv[3].split(",") if len(sys.argv) > 3 and sys.argv[3] else []) if w.strip())
batch = ambig[start:end]
todel = set(w for w in batch if w not in keep)
# briši iz reci.txt
reci = [l.rstrip("\n") for l in open(RECI, encoding="utf-8")]
kept = [l for l in reci if l.strip() not in todel]
open(RECI + ".tmp", "w", encoding="utf-8").write("\n".join(kept) + "\n")
os.replace(RECI + ".tmp", RECI)
# loguj keepere
with open("/tmp/ambig_keep.txt", "a", encoding="utf-8") as f:
    for w in sorted(keep):
        f.write(w + "\n")
print(f"batch [{start}:{end}] | obrisano {len(todel)} | zadržano (srpski) {len(keep)} | reci.txt sada {len(kept)}")
print(f"KEEPERI: {sorted(keep)}")
print(f"\n=== SLEDEĆIH 300 [{end}:{end+1200}] za klasifikaciju ===")
print("  ".join(ambig[end:end+1200]))
