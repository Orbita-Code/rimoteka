#!/bin/bash
# PUN LANAC PRE OBJAVE – četiri alata ISTOVREMENO (odluka vlasnice 09.09.2026: „deploy traje 3 sata, skrati").
# U nizu su trajali ~28 min (pun test 15 + motori 4 + ćirilica 6 + tamna 3); paralelno traju koliko najduži.
# Regeneracija strana ide PRE njih samo ako je zatražena (--gen) ili ako su strane starije od izvora.
#   bash test/lanac.sh            # lokalno (podiže sopstveni statični server ako 8765 ne radi)
#   bash test/lanac.sh --gen      # prvo regeneriši strane
#   BASE=https://rimoteka.com bash test/lanac.sh   # protiv produkcije
# Izlazni kod 0 = svi prošli. Dnevnici: AUDIT/lanac/<datum-vreme>/*.log
set -u
cd "$(dirname "$0")/.."
DIR="AUDIT/lanac/$(date +%Y%m%d-%H%M%S)"; mkdir -p "$DIR"
POCETAK=$(date +%s)
if [[ "${1:-}" == "--gen" ]] || { [ -z "${BASE:-}" ] && [ -n "$(find build/gen_pages.py public/index.html public/app.js public/style.css -newer public/sitemap.xml 2>/dev/null)" ]; }; then
  echo "▶ regeneracija strana…"; python3 build/gen_pages.py > "$DIR/gen.log" 2>&1 || { echo "❌ gen_pages pao – v. $DIR/gen.log"; exit 1; }
  grep -E "Generisano|Sitemap" "$DIR/gen.log"
fi
if [ -z "${BASE:-}" ] && ! curl -s -o /dev/null -m 3 http://localhost:8765/; then
  node test/static-server.mjs public 8765 > "$DIR/server.log" 2>&1 & SRV=$!; sleep 2
fi
ALATI="predeploy predeploy-motori skener-cirilica skener-tamna"
declare -A PID
for t in $ALATI; do
  ( node "test/$t.mjs" > "$DIR/$t.log" 2>&1; echo "IZLAZ=$?" >> "$DIR/$t.log" ) & PID[$t]=$!
done
echo "▶ 4 alata pokrenuta paralelno ($DIR)"
GRESKA=0
for t in $ALATI; do
  wait "${PID[$t]}"
  K=$(grep -E '^IZLAZ=' "$DIR/$t.log" | tail -1 | cut -d= -f2)
  OK=$(grep -c '✅' "$DIR/$t.log"); NE=$(grep -c '❌' "$DIR/$t.log")
  if [ "$K" = "0" ]; then echo "✅ $t (✅ $OK)"; else GRESKA=1; echo "❌ $t (❌ $NE) – v. $DIR/$t.log"; grep '❌\|Test je pao' "$DIR/$t.log" | head -5 | cut -c1-160; fi
done
[ -n "${SRV:-}" ] && kill "$SRV" 2>/dev/null
echo "⏱ ukupno $(( ($(date +%s) - POCETAK) / 60 )) min $(( ($(date +%s) - POCETAK) % 60 )) s"
[ $GRESKA = 0 ] && echo "✅ SVE PROŠLO. Sme deploy." || echo "❌ NE DEPLOYUJ."
exit $GRESKA
