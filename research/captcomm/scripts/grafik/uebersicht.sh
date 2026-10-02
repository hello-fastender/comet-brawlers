#!/usr/bin/env bash
# Uebersichtsbild aller 9 Stages (je die mittlere Szene stage<N>_szene_3.png)
# nach grafik/stages/uebersicht.png.
set -euo pipefail
cd "$(dirname "$0")/../.."
namen=(CITY MUSEUM "NINJA HOUSE" "CIRCUS CAMP" "SEA PORT" AQUARIUM "UNDERGROUND BASE" "ENEMY'S SPACESHIP" CALLISTO)
args=()
for n in 1 2 3 4 5 6 7 8 9; do
	args+=(-label "Stage $n: ${namen[$((n - 1))]}" "grafik/stages/stage${n}_szene_3.png")
done
montage "${args[@]}" -tile 3x3 -geometry 384x224+4+4 -background '#202020' -fill white \
	-pointsize 14 -depth 8 grafik/stages/uebersicht.png
