#!/usr/bin/env bash
# Griff der Figur (Nachtrag): MAME-Laeufe mit griff.lua, Auswertung mit
# messen_a5.py griff und treffer nach logs/griff.csv; loescht danach die
# eigenen Rohabzuege. Voraussetzung: Savestates kontakt, kontakt_b, anlauf,
# anlauf_c (scripts/laeufe_a5.sh, scenarios/anlauf_c.lua). Dauer: ~1 min.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/griff.lua
out=logs/griff.csv
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }
g() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="gr_$name" scripts/run.sh $sc "$state"; }

# 1) ohne Eingriff: Figur laeuft auf den stehenden Gegner zu
g nat_k kontakt CC_DAUER=20 CC_FRAMES=40
g nat_kb kontakt_b CC_SLOT=17 CC_DAUER=20 CC_FRAMES=40
g nat_an anlauf CC_DAUER=40 CC_FRAMES=60
g nat_ac anlauf_c CC_SLOT=17 CC_DAUER=40 CC_FRAMES=60
# 2) EINGRIFF nur bis Frame 4: Gegner bei dx/dz 11 abgesetzt, dann ein Schritt
#    nach oben (dz 11 -> 10, ab Frame 5) ohne x-Bewegung; Gegner in Ruhepose
for st in kontakt kontakt_b; do
	sl=18; [ $st = kontakt_b ] && sl=17
	for d in 38 39 40 41; do
		g "x_${st}_rechts_dx$d" $st CC_SLOT=$sl CC_DAUER=0 CC_DX=$d CC_DZ=11 CC_POKE_BIS=4 CC_IN="4-8:p1_up" CC_FRAMES=30
	done
	# Blick nach links: ein Frame nach links laufen, dann wie oben
	for d in -37 -38 -39 -40; do
		g "x_${st}_links_dx${d/-/m}" $st CC_SLOT=$sl CC_DIR=p1_left CC_START=2 CC_DAUER=1 CC_DX=$d CC_DZ=11 \
			CC_POKE_BIS=4 CC_IN="4-8:p1_up" CC_FRAMES=30
	done
	# 3) EINGRIFF: Tiefe des Gegners bis Frame 40 relativ zur Figur gehalten, Figur
	#    laeuft von dx ~46 aus durch ihn hindurch
	for z in -11 -10 10 11; do
		g "z_${st}_dz${z/-/m}" $st CC_SLOT=$sl CC_DAUER=40 CC_DZ=$z CC_POKE_BIS=40 CC_FRAMES=45
	done
	# 4) ohne Eingabe: Gegner bei dx 30 / dz 0 abgesetzt (EINGRIFF bis Frame 4)
	g "still_${st}" $st CC_SLOT=$sl CC_DAUER=0 CC_DX=30 CC_DZ=0 CC_POKE_BIS=4 CC_FRAMES=30
done
# 5) Sprung in den Gegner (ohne Eingriff): kein Griff in der Luft
g sprung_k kontakt CC_DAUER=60 CC_IN="2:p1_jump" CC_FRAMES=70
# 6) Angriffsdruck um den Griff-Frame (Griff in Frame 6, ohne Eingriff)
g angriff_k_g-1 kontakt CC_DAUER=6 CC_ANGRIFFE=5 CC_FRAMES=80
g angriff_k_g0 kontakt CC_DAUER=6 CC_ANGRIFFE=6 CC_FRAMES=80
g angriff_k_g+1 kontakt CC_DAUER=5 CC_ANGRIFFE=7 CC_FRAMES=80
g angriff_k_g+60 kontakt CC_DAUER=5 CC_ANGRIFFE=66 CC_FRAMES=90
g angriff_k_g+61 kontakt CC_DAUER=5 CC_ANGRIFFE=67 CC_FRAMES=90

runs=$(ls logs/raw/gr_*_ram.bin | sed 's/_ram.bin$//' | sort -V)
python3 scripts/messen_a5.py griff $runs > logs/gr.tmp1
for r in $(ls logs/raw/gr_angriff_*_ram.bin | sed 's/_ram.bin$//' | sort -V); do
	python3 scripts/messen_a5.py treffer "$r" | sed "1d;s|^|$(basename "$r"),|"
done > logs/gr.tmp2
{
	echo "# Griff der Figur (Captain Commando), griff.lua. gr_nat_*, gr_sprung_*, gr_angriff_*: ohne Eingriff."
	echo "# gr_x_*: EINGRIFF bis Frame 4 (Gegner bei dx/dz 11 abgesetzt), dann Schritt nach oben (dz 11 -> 10)."
	echo "# gr_z_*: EINGRIFF, Tiefe des Gegners bis Frame 40 gehalten. gr_still_*: Gegner bei dx 30 abgesetzt,"
	echo "# keine Eingabe. dx/dz: Gegner minus Figur, ganzzahlig am Frame-Ende."
	echo "# Zusammenfassung"
	python3 - logs/gr.tmp1 <<'PY'
import csv, sys
from collections import defaultdict
rows = defaultdict(list)
for r in csv.DictReader(open(sys.argv[1])):
    rows[r["lauf"]].append(r)
def griff(lauf):
    return next((r for r in rows[lauf] if r["ereignis"] == "GRIFF"), None)
for lauf in sorted(rows):
    if lauf.startswith(("gr_nat", "gr_sprung", "gr_still", "gr_angriff")):
        g = griff(lauf)
        print(f"{lauf}: " + (f"Griff in Frame {g['frame']} bei dx {g['dx']}, dz {g['dz']}" if g else "kein Griff"))
for art in ("x", "z"):
    res = defaultdict(list)
    for lauf in rows:
        if lauf.startswith(f"gr_{art}_"):
            teil = lauf.split("_")
            key = "_".join(teil[2:-1]) if art == "x" else teil[2] + ("_b" if teil[3] == "b" else "")
            g = griff(lauf)
            res[key].append((teil[-1], f"Griff bei dx {g['dx']}/dz {g['dz']}" if g else "kein Griff"))
    for k in sorted(res):
        print(f"{art} {k}: " + "; ".join(f"{a}: {b}" for a, b in sorted(res[k])))
PY
	echo "# Treffer der gr_angriff_*-Laeufe (messen_a5.py treffer)"
	echo "lauf,frame,slot,max_lp,lp_vorher,lp_nachher,schaden,stufe,p1_aktion,status_vorher,status_nachher,umgefallen"
	cat logs/gr.tmp2
	echo "# messen_a5.py griff"
	cat logs/gr.tmp1
} > $out
rm -f logs/gr.tmp1 logs/gr.tmp2 logs/raw/gr_*_ram.bin
wc -l $out
