#!/usr/bin/env bash
# Ablaufstreifen der beiden Gegner vom Anfang von Stage 1 (WOOKY, Slot 18 in
# "kontakt"/"anlauf"; EDDY, Slot 17 in "kontakt_b") nach
# grafik/gegner/<name>_<ablauf>.png, mit Dauer je Animationsstufe.
# Voraussetzung: Savestates anlauf, kontakt, kontakt_b (scripts/laeufe_a5.sh).
set -euo pipefail
cd "$(dirname "$0")/../.."
ziel=grafik/gegner
mkdir -p "$ziel"
echo "datei,stufen,dauern_frames,summe_frames" > "$ziel/ablaeufe.csv"
lauf() { # lauf <name> <savestate> <frames> <eingaben>
	CC_IN="$4" CC_FRAMES=$3 CC_SNAP="2-$3" CC_SLOTS="16,17,18" CC_NAME="$1" \
		scripts/run.sh scripts/scenarios/anim.lua "$2" >/dev/null 2>&1
}
streifen() { # streifen <lauf> <slot> <von> <bis> <ausgabe> [optionen]
	local l=$1 s=$2 v=$3 b=$4 o=$5; shift 5
	python3 scripts/grafik/streifen.py "logs/raw/$l" "s$s" "$v" "$b" "$ziel/$o.png" --max 24 "$@" >>"$ziel/ablaeufe.csv"
}
# WOOKY (16 LP)
lauf ga_w_gehen anlauf 45 ""
streifen ga_w_gehen 18 2 44 wooky_gehen
lauf ga_w_angriff kontakt 100 ""
streifen ga_w_angriff 18 2 99 wooky_angriff --breite 176
lauf ga_w_umfallen kontakt 140 "2:p1_jump;10:p1_attack"
streifen ga_w_umfallen 18 14 139 wooky_umgeworfen --breite 208 --hoehe 176
lauf ga_w_wurf kontakt 100 "2-5:p1_right;16:p1_left+p1_attack"
streifen ga_w_wurf 18 5 99 wooky_gegriffen_geworfen --breite 224 --hoehe 192
lauf ga_w_tod kontakt 180 "3:p1_attack;20:p1_attack;37:p1_attack;54:p1_attack"
streifen ga_w_tod 18 2 179 wooky_kette_tod --breite 224
# EDDY (30 LP)
lauf ga_e_angriff kontakt_b 100 ""
streifen ga_e_angriff 17 2 99 eddy_angriff --breite 176
lauf ga_e_umfallen kontakt_b 140 "2:p1_jump;10:p1_attack"
streifen ga_e_umfallen 17 14 139 eddy_umgeworfen --breite 208 --hoehe 176
lauf ga_e_wurf kontakt_b 110 "2-11:p1_right;16:p1_left+p1_attack"
streifen ga_e_wurf 17 10 109 eddy_gegriffen_geworfen --breite 224 --hoehe 192
lauf ga_e_kette kontakt_b 120 "3:p1_attack;20:p1_attack;37:p1_attack;54:p1_attack"
streifen ga_e_kette 17 2 119 eddy_kette --breite 224
rm -f logs/raw/snap/ga_* logs/raw/ga_*
ls "$ziel" | grep -c -E '^(wooky|eddy)_'
