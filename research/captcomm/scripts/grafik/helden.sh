#!/usr/bin/env bash
# Animationsstreifen der vier Spielfiguren nach grafik/figuren/<figur>_<animation>.png.
# Voraussetzung: Savestates held<k> und held<k>_kontakt (k = 0 Mack, 1 Captain,
# 2 Ginzu, 3 Baby Head), erzeugt mit
#   CC_FIGUR=k CC_SAVE=2400 CC_SAVE_NAME=held<k> scripts/run.sh scripts/scenarios/stage_start.lua
#   CC_FIGUR=k scripts/run.sh scripts/scenarios/held_kontakt.lua held<k>
# Fuer die Einzelbewegungen laeuft die Figur vorher zur Bildmitte und nach
# vorn (Savestate held<k>_mitte), damit die Anzeigeleiste nicht im Ausschnitt liegt.
# Aufruf: scripts/grafik/helden.sh [k ...]   (Standard: alle vier)
set -euo pipefail
cd "$(dirname "$0")/../.."
ziel=grafik/figuren
mkdir -p "$ziel"
[ -f "$ziel/ablaeufe.csv" ] || echo "datei,stufen,dauern_frames,summe_frames" > "$ziel/ablaeufe.csv"
name_of() { case $1 in 0) echo mack ;; 1) echo captain ;; 2) echo ginzu ;; 3) echo baby ;; esac; }
lauf() { # lauf <name> <savestate> <frames> <eingaben>
	CC_IN="$4" CC_FRAMES=$3 CC_SNAP="2-$3" CC_SLOTS="16,17,18" CC_NAME="$1" \
		scripts/run.sh scripts/scenarios/anim.lua "$2" >/dev/null 2>&1
}
streifen() { # streifen <lauf> <von> <bis> <ausgabe> [optionen]
	local l=$1 v=$2 b=$3 o=$4; shift 4
	python3 scripts/grafik/streifen.py "logs/raw/$l" p "$v" "$b" "$ziel/$o.png" "$@" >>"$ziel/ablaeufe.csv"
}
for k in "${@:-0 1 2 3}"; do
	for k1 in $k; do
		n=$(name_of "$k1"); s=held${k1}_mitte; sk=held${k1}_kontakt; p=fig_$n
		CC_IN="2-61:p1_right;62-81:p1_down" CC_FRAMES=90 CC_SNAP=1-0 CC_SAVE="90:$s" CC_NAME=${p}_mitte \
			scripts/run.sh scripts/scenarios/anim.lua held$k1 >/dev/null 2>&1
		lauf ${p}_stand $s 70 ""
		streifen ${p}_stand 2 69 ${n}_stand
		lauf ${p}_gehen $s 60 "2-60:p1_right"
		streifen ${p}_gehen 4 59 ${n}_gehen
		lauf ${p}_sprint $s 70 "2-3:p1_right;6-70:p1_right"
		streifen ${p}_sprint 6 69 ${n}_sprint
		lauf ${p}_sprung $s 56 "2:p1_jump"
		streifen ${p}_sprung 2 55 ${n}_sprung --hoehe 200
		lauf ${p}_sprungtritt $s 60 "2:p1_jump;10:p1_attack"
		streifen ${p}_sprungtritt 2 59 ${n}_sprungtritt --hoehe 200
		lauf ${p}_sprungtritt_richtung $s 60 "2:p1_jump+p1_right;10:p1_attack"
		streifen ${p}_sprungtritt_richtung 2 59 ${n}_sprungtritt_richtung --hoehe 200 --breite 176
		lauf ${p}_sprungtritt_hoch $s 60 "2:p1_jump+p1_up;8:p1_attack"
		streifen ${p}_sprungtritt_hoch 2 59 ${n}_sprungtritt_hoch --hoehe 200
		lauf ${p}_sprungtritt_unten $s 60 "2:p1_jump;10:p1_attack+p1_down"
		streifen ${p}_sprungtritt_unten 2 59 ${n}_sprungtritt_unten --hoehe 200
		lauf ${p}_spezial $s 70 "2:p1_jump+p1_attack"
		streifen ${p}_spezial 2 69 ${n}_spezial --breite 192 --hoehe 192
		lauf ${p}_sprintangriff $s 60 "2-3:p1_right;6-20:p1_right;14:p1_attack"
		streifen ${p}_sprintangriff 12 59 ${n}_sprintangriff --breite 176
		lauf ${p}_kette $sk 90 "3:p1_attack;20:p1_attack;37:p1_attack;54:p1_attack"
		streifen ${p}_kette 2 89 ${n}_kette --max 24
		lauf ${p}_griff $sk 140 "2-5:p1_right;16:p1_attack;34:p1_attack;52:p1_attack"
		streifen ${p}_griff 2 139 ${n}_griff_knie --max 24
		lauf ${p}_wurf $sk 100 "2-5:p1_right;16:p1_left+p1_attack"
		streifen ${p}_wurf 14 99 ${n}_wurf --breite 192 --hoehe 192 --max 24
		lauf ${p}_getroffen $sk 300 ""
		streifen ${p}_getroffen 20 299 ${n}_getroffen --breite 192 --max 24
		rm -f logs/raw/snap/${p}_* logs/raw/${p}_*
	done
done
ls "$ziel" | wc -l
