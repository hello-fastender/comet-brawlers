#!/usr/bin/env bash
# Pose-Galerien der Gegner je Stage nach grafik/gegner/stage<N>_<typ>.png.
# Der Bot spielt die Stage ab Savestate stage<N> (scenarios/stage_start.lua)
# durch und nimmt jeden Frame auf (EINGRIFFE des Bots: LP der Figur aufgefuellt,
# bei Stillstand LP der Gegner auf 1; siehe bot.lua). Danach werden die
# Snapshots wieder geloescht (etwa 25 kB je Frame).
# Aufruf: scripts/grafik/gegner.sh [N ...]   (Standard: 1 bis 9)
set -euo pipefail
cd "$(dirname "$0")/../.."
ziel=grafik/gegner
mkdir -p "$ziel"
w=""
for n in $(seq 0 19); do
	s=$(printf '%X' $((0xFFBC90 + n * 0xC0)))
	a() { printf '%X' $((0x$s + $1)); }
	w="$w,s${n}_x:$(a 0x0E):2,s${n}_z:$(a 0x16):2,s${n}_h:$(a 0x12):2:s,s${n}_anim:$(a 0x1C):4,s${n}_st:$(a 0x04):1,s${n}_typ:$(a 0x38):4,s${n}_maxlp:$(a 0x9A):2"
done
for st in ${@:-1 2 3 4 5 6 7 8 9}; do
	CC_NAME=geg_s$st GFA_CFG=scripts/grafik/durchlauf.lua GFA_SNAP_EVERY=1 GFA_FRAMES=25000 \
		GFA_WATCH="${w#,}" scripts/grafik/bot.sh stage$st
	python3 scripts/grafik/gegner.py logs/raw/geg_s$st "$ziel/stage$st"
	rm -f logs/raw/snap/geg_s${st}_*.png
done
