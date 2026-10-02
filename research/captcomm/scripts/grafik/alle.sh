#!/usr/bin/env bash
# Erzeugt alle Spielgrafiken unter grafik/ neu (Genehmigung des Nutzers, siehe
# notes.md). Dauer: ~15 min, zwischenzeitlich bis ~400 MB Snapshots in
# logs/raw/snap (werden wieder geloescht). Voraussetzung: ROM unter roms/ und
# die Savestates aus scripts/laeufe_a5.sh (anlauf, kontakt, kontakt_b).
#   1. Savestates stage1..stage9 (Stage-Start, EINGRIFF Stage-Index) und
#      held<k>/held<k>_kontakt fuer die vier Spielfiguren
#   2. Durchlauf je Stage mit dem Bot: Panorama-Streifen (Kamera-Schritte von
#      32 px) und Szenenbilder (alle 300 Frames)
#   3. Animationsstreifen der Spielfiguren, Pose-Galerien und Ablaufstreifen der Gegner
set -euo pipefail
cd "$(dirname "$0")/../.."
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }
mkdir -p grafik/stages grafik/figuren grafik/gegner
for n in 1 2 3 4 5 6 7 8 9; do
	q env CC_STAGE=$n CC_SNAPS=1400 CC_NAME=stage$n scripts/run.sh scripts/scenarios/stage_start.lua
	cp logs/raw/snap/stage${n}_001400.png grafik/stages/stage${n}_start.png
done
for k in 0 1 2 3; do
	q env CC_FIGUR=$k CC_SAVE=2400 CC_SAVE_NAME=held$k CC_NAME=held$k scripts/run.sh scripts/scenarios/stage_start.lua
	q env CC_FIGUR=$k CC_NAME=held${k}_kontakt scripts/run.sh scripts/scenarios/held_kontakt.lua held$k
done
rm -f grafik/stages/stage*_panorama*.png grafik/stages/stage*_szene_*.png
for n in 1 2 3 4 5 6 7 8 9; do
	q env CC_NAME=pan_s$n GFA_CFG=scripts/grafik/durchlauf.lua GFA_CAM_STEP=32 GFA_SNAP_EVERY=300 \
		GFA_FRAMES=25000 scripts/grafik/bot.sh stage$n
	spalte=120; [ $n = 5 ] && spalte=228    # Stage 5: Figur steht links (Hoverboard)
	python3 scripts/grafik/panorama.py logs/raw/pan_s$n $n grafik/stages/stage${n}_panorama.png --spalte $spalte
	python3 scripts/grafik/szenen.py logs/raw/pan_s$n $n grafik/stages/stage${n}_szene
	rm -f logs/raw/snap/pan_s${n}_*.png
done
scripts/grafik/helden.sh
scripts/grafik/gegner.sh
scripts/grafik/gegner_ablauf.sh
