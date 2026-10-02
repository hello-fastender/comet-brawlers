#!/usr/bin/env bash
# Logausschnitte fuer den Nachtrag "Sprung und Schlagreichweite" aus
# logs/raw/. Voraussetzung: scripts/laeufe_a7.sh
set -euo pipefail
cd "$(dirname "$0")/.."
m="python3 scripts/messen_a5.py"
out=logs

{
	echo "# Spruenge (Hoehe, x, Tiefe als 16.16). taste_ab = P; Weite = x(Landung) - x(Aktionsbeginn)."
	echo "# dx/dz_je_frame ueber die Luftframes und den Landeframe; eingaben_in_luft = gehaltene Eingaben"
	for r in jump jump_b sprung_c sprung_d; do echo "# $r"; $m sprung logs/raw/$r; done
	echo "# Landung nicht abbrechbar: Richtung durchgehend gehalten (sprung_c ab 421 hoch, sprung_d ab 411 runter)"
	python3 scripts/ramtools.py track logs/raw/sprung_c --addr FFA99A:2 --addr FFA99C:2 --addr FFA9A6:2 --addr FFA9A2:2 --from 461 --to 472
	python3 scripts/ramtools.py track logs/raw/sprung_d --addr FFA99A:2 --addr FFA99C:2 --addr FFA9A6:2 --addr FFA9A2:2 --from 451 --to 462 | tail -n +2
} > $out/a7_sprung.csv

{
	echo "# Einzelschlag: je aktivem Frame (P+2..P+5) Abstand zum naechsten Gegner (ganzzahlige"
	echo "# Positionen am Frame-Ende, dx = Gegner - Figur, dz = Tiefe Gegner - Figur) und Treffer."
	echo "# anlauf/anlauf_b: Gegner 16 LP laeuft heran; anlauf_c: Gegner 30 LP laeuft heran;"
	echo "# tiefe_v*: ab kontakt (16 LP) hoch/runter; tiefeA_v*: ab anlauf hoch; tiefeB_v*: ab tiefe_b (30 LP)"
	runs=$(ls logs/raw/{anlauf_p,anlaufb_p,anlaufc_p,tiefe_v,tiefeA_v,tiefeB_v}*_ram.bin | sed 's/_ram.bin$//' | sort -V)
	$m aktiv $runs > $out/a7_aktiv.tmp
	echo "# Zusammenfassung"
	python3 - $out/a7_aktiv.tmp <<'PY'
import csv, sys
from collections import defaultdict
rows = list(csv.DictReader(open(sys.argv[1])))
for r in rows:
    r["dx"], r["dz"] = int(r["dx"]), int(r["dz"])
near = [r for r in rows if abs(r["dz"]) <= 11 and r["dx"] > 0]
hx = max(r["dx"] for r in near if r["treffer"] == "ja")
mx = min(r["dx"] for r in near if r["treffer"] == "nein")
print(f"x: |dz| <= 11: groesstes dx mit Treffer {hx}, kleinstes dx ohne Treffer {mx}")
byz = defaultdict(lambda: [0, 0])
for r in rows:
    if 0 < r["dx"] <= 85:
        byz[abs(r["dz"])][0 if r["treffer"] == "ja" else 1] += 1
for z in sorted(byz):
    print(f"|dz| = {z:2d} (dx <= 85): {byz[z][0]} aktive Frames mit Treffer, {byz[z][1]} ohne")
rel = defaultdict(int)
for r in rows:
    if r["treffer"] == "ja":
        rel[r["frame_rel"]] += 1
print("Treffer nach Frame relativ zur Eingabe:", dict(sorted(rel.items())))
PY
	echo "# Einzelwerte"
	cat $out/a7_aktiv.tmp
	rm -f $out/a7_aktiv.tmp
} > $out/a7_reichweite.csv

wc -l $out/a7_*.csv
