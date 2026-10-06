#!/bin/bash
# PUN LANAC PRE OBJAVE – četiri alata ISTOVREMENO (odluka vlasnice 09.09.2026: „deploy traje 3 sata, skrati").
# U nizu su trajali ~28 min (pun test 15 + motori 4 + ćirilica 6 + tamna 3); paralelno traju koliko najduži.
# Regeneracija strana ide PRE njih samo ako je zatražena (--gen) ili ako su strane starije od izvora.
#   bash test/lanac.sh            # lokalno (podiže sopstveni statični server ako 8765 ne radi)
#   bash test/lanac.sh --gen      # prvo regeneriši strane
#   BASE=https://rimoteka.com bash test/lanac.sh   # protiv produkcije
# Radi i u macOS bash 3.2 (bez declare -A). Izlazni kod 0 = svi prošli. Dnevnici: AUDIT/lanac/<datum-vreme>/*.log
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
# TP-11: pun test (predeploy.mjs) radi na portu 8799; kad ide u više radnika, server se diže OVDE jednom, pa ga radnici zateknu
# (predeploy.mjs ne diže svoj ako port već odgovara). Inače bi svaki radnik pokušao svoj server i tri bi pala na EADDRINUSE.
if [ -z "${BASE:-}" ] && ! curl -s -o /dev/null -m 3 http://localhost:8799/; then
  node test/static-server.mjs public 8799 > "$DIR/server-8799.log" 2>&1 & SRV2=$!; sleep 2
fi
# TP-11 (01.10.2026, odluka vlasnice): pun test ide kao RADNIKA procesa (DEO=1..N), svaki sa svojom četvrtinom sekcija
# (raspored u predeploy.mjs, RASPORED). Jedan proces je trajao ~16 min; četiri paralelno traju koliko najduži radnik.
# RADNIKA=1 vraća stari način (jedan proces, sve sekcije). Zbir provera sva četiri radnika mora biti ≥ 900 (lokalno) / 870 (produkcija).
RADNIKA="${RADNIKA:-6}"   # 07.10.2026: 6 (izmereno: radnici po ~235 s; raspored se računa za zadati broj)
ALATI="predeploy-motori skener-cirilica skener-tamna"
PIDOVI=""
if [ "$RADNIKA" = "1" ]; then
  ( node test/predeploy.mjs > "$DIR/predeploy.log" 2>&1; echo "IZLAZ=$?" >> "$DIR/predeploy.log" ) & PIDOVI="$PIDOVI $!"
  PREDEPLOY="predeploy"
else
  PREDEPLOY=""
  for d in $(seq 1 "$RADNIKA"); do
    ( DEO=$d DELOVA=$RADNIKA node test/predeploy.mjs > "$DIR/predeploy-$d.log" 2>&1; echo "IZLAZ=$?" >> "$DIR/predeploy-$d.log" ) & PIDOVI="$PIDOVI $!"
    PREDEPLOY="$PREDEPLOY predeploy-$d"
  done
fi
for t in $ALATI; do
  ( node "test/$t.mjs" > "$DIR/$t.log" 2>&1; echo "IZLAZ=$?" >> "$DIR/$t.log" ) & PIDOVI="$PIDOVI $!"
done
echo "▶ pun test u $RADNIKA radnika + 3 alata, sve paralelno ($DIR)"
wait $PIDOVI
GRESKA=0
ZBIR=0
for t in $PREDEPLOY $ALATI; do
  K=$(grep -E '^IZLAZ=' "$DIR/$t.log" | tail -1 | cut -d= -f2)
  OK=$(grep -c '  ✅' "$DIR/$t.log"); NE=$(grep -c '❌' "$DIR/$t.log")
  case "$t" in predeploy*) ZBIR=$((ZBIR + OK)); if [ "$OK" -lt 20 ]; then GRESKA=1; echo "❌ $t je imao samo $OK provera – radnik bez posla (raspored ne pokriva ovaj broj radnika?)"; fi;; esac
  if [ "$K" = "0" ]; then echo "✅ $t (✅ $OK)"; else GRESKA=1; echo "❌ $t (❌ $NE) – v. $DIR/$t.log"; grep '❌\|Test je pao' "$DIR/$t.log" | head -5 | cut -c1-160; fi
done
MIN=900; [ -n "${BASE:-}" ] && MIN=870
if [ "$ZBIR" -lt "$MIN" ]; then GRESKA=1; echo "❌ pun test: zbir provera svih radnika $ZBIR < $MIN (provera je tiho nestala – TP-11 čuvar)"; else echo "✅ pun test: ukupno $ZBIR provera (≥ $MIN)"; fi
[ -n "${SRV:-}" ] && kill "$SRV" 2>/dev/null
[ -n "${SRV2:-}" ] && kill "$SRV2" 2>/dev/null
echo "⏱ ukupno $(( ($(date +%s) - POCETAK) / 60 )) min $(( ($(date +%s) - POCETAK) % 60 )) s"
[ $GRESKA = 0 ] && echo "✅ SVE PROŠLO. Sme deploy." || echo "❌ NE DEPLOYUJ."
exit $GRESKA
