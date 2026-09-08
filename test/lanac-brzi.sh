#!/bin/bash
# BRZI LANAC ZA TOKOM RADA (odluka vlasnice 09.09.2026) – ne zamenjuje pun lanac pre objave.
# Tri motora (rime, kartica, beležnica sa tastaturom, brojač, igra na telefonu) + dimna proba glavnih namena.
#   bash test/lanac-brzi.sh
set -u
cd "$(dirname "$0")/.."
POCETAK=$(date +%s)
if ! curl -s -o /dev/null -m 3 http://localhost:8765/; then node test/static-server.mjs public 8765 > /dev/null 2>&1 & SRV=$!; sleep 2; fi
node test/predeploy-motori.mjs 2>&1 | tail -3 & M=$!
node test/dimna-proba.mjs 2>&1 | tail -6 & D=$!
wait $M; KM=$?; wait $D; KD=$?
[ -n "${SRV:-}" ] && kill "$SRV" 2>/dev/null
echo "⏱ $(( ($(date +%s) - POCETAK) / 60 )) min $(( ($(date +%s) - POCETAK) % 60 )) s"
[ $KM = 0 ] && [ $KD = 0 ] && { echo "✅ brzi lanac prošao (pre objave ide pun: bash test/lanac.sh)"; exit 0; } || { echo "❌ brzi lanac pao"; exit 1; }
