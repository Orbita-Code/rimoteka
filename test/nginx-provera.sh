#!/bin/bash
# Provera `nginx.conf` PRE deploy-a — ponašanje, ne samo sintaksa.
#
# Zašto postoji: 29.07.2026. je sajt bio oboren ~3 minuta. U `nginx.conf` je
# dodat blok za `www`, sintaksa je bila savršeno ispravna (`crossplane` javio
# „ok"), ali je blok postao PODRAZUMEVANI server i preusmeravao je i
# `rimoteka.com` na samog sebe — beskonačna petlja.
#
# `server_name _` NIJE hvatalica za sve domene. `_` je namerno nevažeće ime
# koje se nikad ne poklopi sa `Host` zaglavljem; blok hvata sve samo ako je
# podrazumevani. Zato glavni blok MORA imati `listen 80 default_server;`.
#
# Provera sintakse je nužna a NE i dovoljna. Ova skripta pušta pravi nginx i
# gleda šta se stvarno dešava po `Host` zaglavlju.
#
# Pokretanje:  bash test/nginx-provera.sh
# Izlazni kod: 0 = sme deploy, 1 = NE deployuj

set -uo pipefail
PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8791
RAD="$(mktemp -d)"
trap 'nginx -s stop -c "$RAD/nginx.conf" 2>/dev/null; rm -rf "$RAD"' EXIT

if ! command -v nginx >/dev/null 2>&1; then
  echo "❌ nema lokalnog nginx-a. Instaliraj: brew install nginx"
  echo "   Bez njega se nginx.conf NE deployuje — jednom je već oborio sajt."
  exit 1
fi

mkdir -p "$RAD/conf.d" "$RAD/logs" "$RAD/html/rime-za/ljubav" "$RAD/html/rime-za/voda" "$RAD/html/rime-po-zavrsetku"
cp "$PROJ/public/index.html" "$RAD/html/" 2>/dev/null
cp "$PROJ/public/rime-za/ljubav/index.html" "$RAD/html/rime-za/ljubav/" 2>/dev/null
# Hub i još jedna postojeća strana — bez njih se ne može proveriti da pravilo
# „nepostojeća strana → hub" NE hvata i postojeće strane, ni da hub ne vodi sam
# na sebe (beskonačna petlja na 1.672 adrese). Dodato 30.07.2026, nalaz P10.
cp "$PROJ/public/rime-za/index.html" "$RAD/html/rime-za/" 2>/dev/null
cp "$PROJ/public/rime-za/voda/index.html" "$RAD/html/rime-za/voda/" 2>/dev/null
# Odredište preusmerenja sa `/recnik-srpskog-jezika/` (26.08.2026). Bez ove strane
# provera „301 ne vodi u prazno" ne bi mogla da se napravi — lažni sajt ima samo
# nekoliko strana, pa svaka koju provera dodirne mora ovde da se prekopira.
cp "$PROJ/public/rime-po-zavrsetku/index.html" "$RAD/html/rime-po-zavrsetku/" 2>/dev/null

sed -e "s|listen 80 default_server;|listen $PORT default_server;|" \
    -e "s|listen 80;|listen $PORT;|" \
    -e "s|/usr/share/nginx/html|$RAD/html|" \
    "$PROJ/nginx.conf" > "$RAD/conf.d/rimoteka.conf"

MIME=/opt/homebrew/etc/nginx/mime.types
[ -f "$MIME" ] || MIME=/etc/nginx/mime.types
cat > "$RAD/nginx.conf" <<EOF
worker_processes 1;
error_log $RAD/logs/error.log;
pid $RAD/nginx.pid;
events { worker_connections 64; }
http {
  include $MIME;
  access_log $RAD/logs/access.log;
  client_body_temp_path $RAD/logs/body;
  proxy_temp_path $RAD/logs/proxy;
  fastcgi_temp_path $RAD/logs/fastcgi;
  uwsgi_temp_path $RAD/logs/uwsgi;
  scgi_temp_path $RAD/logs/scgi;
  include $RAD/conf.d/*.conf;
}
EOF

echo "1) Sintaksa"
if ! nginx -t -c "$RAD/nginx.conf" 2>&1 | tail -1; then
  echo "❌ sintaksa nije ispravna"; exit 1
fi

nginx -c "$RAD/nginx.conf" 2>/dev/null
sleep 1

PALO=0
proveri() { # $1 Host  $2 putanja  $3 očekivani status  $4 očekivano odredište ('-' = nebitno)
  local odg status gde
  odg=$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -H "Host: $1" "http://127.0.0.1:$PORT$2")
  status="${odg%%|*}"; gde="${odg#*|}"
  if [ "$status" != "$3" ] || { [ "$4" != "-" ] && [ "$gde" != "$4" ]; }; then
    printf '  ✗ Host %-22s %-22s → %s %s   (očekivano %s %s)\n' "$1" "$2" "$status" "$gde" "$3" "$4"
    PALO=$((PALO+1))
  else
    printf '  ✓ Host %-22s %-22s → %s %s\n' "$1" "$2" "$status" "$gde"
  fi
}

echo
# kao `proveri`, ali odredište se poredi po ZAVRŠETKU — `return 301 /putanja/`
# nginx pretvara u apsolutnu adresu sa shemom i hostom, koji se u testu razlikuju
# od produkcije (127.0.0.1:PORT umesto rimoteka.com).
proveri_kraj() {
    local izlaz status gde
    izlaz=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Host: $1" "http://127.0.0.1:$PORT$2")
    status=${izlaz%% *}; gde=${izlaz#* }
    if [ "$status" != "$3" ] || [ "${gde%$4}" = "$gde" ]; then
        printf '  ✗ Host %-22s %-22s → %s %s   (očekivano %s …%s)\n' "$1" "$2" "$status" "$gde" "$3" "$4"
        PALO=$((PALO+1))
    else
        printf '  ✓ Host %-22s %-22s → %s %s\n' "$1" "$2" "$status" "$gde"
    fi
}

echo "2) Ponašanje po Host zaglavlju"
proveri "rimoteka.com"     "/"                 200 -
proveri "rimoteka.com"     "/rime-za/ljubav/"  200 -
proveri "www.rimoteka.com" "/"                 301 "https://rimoteka.com/"
proveri "www.rimoteka.com" "/rime-za/ljubav/"  301 "https://rimoteka.com/rime-za/ljubav/"
# NAJVAŽNIJI RED: nepoznat domen mora da dobije sajt, ne preusmerenje.
# Baš ovaj red hvata grešku podrazumevanog bloka koja je 29.07. oborila sajt.
proveri "nepoznato.test"   "/"                 200 -
proveri "localhost"        "/"                 200 -

# --- STARE STRANE REČI → HUB (30.07.2026, nalaz P10) ---
# Izbor reči je prebačen sa abecede na učestalost, pa je 1.672 starih adresa
# nestalo. Bez pravila u nginx.conf svaka bi vraćala 404 mesecima.
# Ove provere su puštene protiv STARE konfiguracije i pale su.
echo ""
echo "3) Stare strane reči vode na hub, a hub NE vodi sam na sebe"
proveri_kraj "rimoteka.com" "/rime-za/abadzija/" 301 "/rime-za/"
proveri_kraj "rimoteka.com" "/rime-za/aaa/"      301 "/rime-za/"
# hub mora da radi — inače je beskonačna petlja na 1.672 adrese
proveri "rimoteka.com"     "/rime-za/"          200 -
# postojeće strane se NE preusmeravaju
proveri "rimoteka.com"     "/rime-za/voda/"     200 -
proveri "rimoteka.com"     "/rime-za/voda/"      200 -

echo
echo "4) Preimenovana strana: /recnik-srpskog-jezika/ → /rime-po-zavrsetku/ (26.08.2026)"
# Stara adresa je obećavala rečnik srpskog jezika, a alat traži reči po slovima.
# 301 mora da radi i SA kosom crtom na kraju i BEZ nje — Gugl zna obe.
proveri_kraj "rimoteka.com" "/recnik-srpskog-jezika/" 301 "/rime-po-zavrsetku/"
proveri_kraj "rimoteka.com" "/recnik-srpskog-jezika"  301 "/rime-po-zavrsetku/"
# nova adresa mora da postoji, inače smo preusmerili u prazno
proveri "rimoteka.com"     "/rime-po-zavrsetku/"      200 -

echo
if [ "$PALO" -gt 0 ]; then
  echo "❌ PALO $PALO provera. NE DEPLOYUJ nginx.conf."
  exit 1
fi
echo "✅ nginx.conf se ponaša kako treba. Sme deploy."
