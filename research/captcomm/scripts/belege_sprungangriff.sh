#!/usr/bin/env bash
# Sprungangriff (Nachtrag): MAME-Laeufe mit sprungangriff.lua, Auswertung mit
# messen_a5.py sprungangriff und treffer nach logs/sprungangriff.csv; loescht
# danach die eigenen Rohabzuege. Voraussetzung: Savestates kontakt, kontakt_b
# (scripts/laeufe_a5.sh). Dauer: ~2 min.
# J = Frame des Sprungdrucks, A = Frame des Angriffsdrucks. "neutral" =
# Sprung ohne Richtung, "richtung" = Sprung mit Richtung (andere Trittanimation),
# "hoch" = hoch im Frame des Sprungdrucks, "unten" = runter mit dem Angriffsdruck.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/sprungangriff.lua
out=logs/sprungangriff.csv
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }
s() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="sa_$name" scripts/run.sh $sc "$state"; }

# 1) ohne Eingriff
s nat_k_neutral kontakt CC_J=2 CC_A=10
s nat_kb_neutral kontakt_b CC_SLOT=17 CC_J=2 CC_A=10
s nat_kb_richtung kontakt_b CC_SLOT=17 CC_J=2 CC_A=5 CC_DIR=p1_right
for a in 20 24; do s nat_kb_unten_a$a kontakt_b CC_SLOT=17 CC_J=2 CC_A=$a CC_ADIR=p1_down; done
# hoch genau im Frame des Sprungdrucks: dritte Variante
for a in 6 9; do
	s nat_k_hoch_a$a kontakt CC_J=4 CC_A=$((4 + a)) CC_DIR=p1_up
	s nat_kb_hoch_a$a kontakt_b CC_SLOT=17 CC_J=4 CC_A=$((4 + a)) CC_DIR=p1_up
done
# 2) EINGRIFF, Einzelframe-Proben: Gegner nur im Frame T bei dx 35 / dz 0
#    (davor und danach 200 px entfernt) -> aktive Frames und Hoehengrenze
for t in $(seq 9 37); do
	s fen_neutral_t$t kontakt CC_J=2 CC_A=6 CC_DX=35 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
	s fen_richtung_t$t kontakt CC_J=2 CC_A=6 CC_DIR=p1_right CC_DX=35 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
done
# 3) EINGRIFF, x-Reichweite: Gegner ab Frame 2 fest bei dx (dz 0), er dreht sich
#    zur Figur; ausgewertet wird der erste aktive Frame A+5 (Hoehe 18)
for st in kontakt kontakt_b; do
	sl=18; [ $st = kontakt_b ] && sl=17
	for d in 75 76 77 78 79 -25 -26 -27 -28 -29 -30; do
		s "x_${st}_neutral_dx${d/-/m}" $st CC_SLOT=$sl CC_J=2 CC_A=6 CC_DX=$d CC_DZ=0 CC_BIS=12
	done
	# (Sprung mit Richtung: die Figur bewegt sich im Frame 2,25 px weiter, Ende ~4 px unter CC_DX)
	for d in 101 102 103 104 105 106 -22 -23 -24 -25 -26 -27; do
		s "x_${st}_richtung_dx${d/-/m}" $st CC_SLOT=$sl CC_J=2 CC_A=6 CC_DIR=p1_right CC_DX=$d CC_DZ=0 CC_BIS=12
	done
	# 4) EINGRIFF, Tiefe
	for z in -13 -12 12 13; do
		s "z_${st}_neutral_dz${z/-/m}" $st CC_SLOT=$sl CC_J=2 CC_A=6 CC_DX=35 CC_DZ=$z CC_BIS=12
		s "z_${st}_richtung_dz${z/-/m}" $st CC_SLOT=$sl CC_J=2 CC_A=6 CC_DIR=p1_right CC_DX=35 CC_DZ=$z CC_BIS=12
	done
done

runs=$(ls logs/raw/sa_*_ram.bin | sed 's/_ram.bin$//' | sort -V)
python3 scripts/messen_a5.py sprungangriff $runs > logs/sa.tmp1
for r in $(ls logs/raw/sa_nat_*_ram.bin | sed 's/_ram.bin$//' | sort); do
	python3 scripts/messen_a5.py treffer "$r" | sed "1d;s|^|$(basename "$r"),|"
done > logs/sa.tmp2
{
	echo "# Sprungangriff (Captain Commando). sa_nat_*: ohne Eingriff. sa_fen_*: EINGRIFF, Gegner nur im"
	echo "# Frame T bei dx 35/dz 0 (J=2, A=6). sa_x_*/sa_z_*: EINGRIFF, Gegner ab Frame 2 fest bei dx/dz, Wertung"
	echo "# im ersten aktiven Frame A+5. dx/dz: Gegner minus Figur, ganzzahlig am Frame-Ende."
	echo "# Zusammenfassung"
	python3 - logs/sa.tmp1 <<'PY'
import csv, re, sys
from collections import defaultdict
rows = defaultdict(list)
for r in csv.DictReader(open(sys.argv[1])):
    rows[r["lauf"]].append(r)
# Fenster und Hoehe
for var in ("neutral", "richtung"):
    hit, miss = [], []
    for lauf, rs in rows.items():
        m = re.match(rf"sa_fen_{var}_t(\d+)$", lauf)
        if not m:
            continue
        t = int(m.group(1))
        r = next((x for x in rs if int(x["frame"]) == t), None)
        if r is None:
            continue
        (hit if r["treffer"] == "ja" else miss).append((r["rel"], int(r["p1_hoehe"])))
    key = lambda x: int(x[0][2:])
    print(f"Fenster {var}: Treffer in " + ", ".join(f"{a}(h{h})" for a, h in sorted(hit, key=key)))
    print(f"Fenster {var}: kein Treffer in " + ", ".join(f"{a}(h{h})" for a, h in sorted(miss, key=key)))
# x und Tiefe im Frame A+5
for art in ("x", "z"):
    for var in ("neutral", "richtung"):
        res = []
        for lauf, rs in sorted(rows.items()):
            if not re.match(rf"sa_{art}_\w+_{var}_d", lauf):
                continue
            r = next((x for x in rs if x["rel"] == "A+5"), None)
            if r:
                res.append((int(r["dx"]) if art == "x" else int(r["dz"]), r["treffer"] == "ja", lauf.split("_")[2]))
        if art == "x":
            for vorn in (True, False):
                sel = [x for x in res if (x[0] > 0) == vorn]
                h = [d for d, t, _ in sel if t]
                m = [d for d, t, _ in sel if not t]
                if vorn:
                    print(f"x {var} vorn: Treffer bis dx {max(h)}, kein Treffer ab dx {min(m)}")
                else:
                    print(f"x {var} hinten: Treffer bis dx {min(h)}, kein Treffer ab dx {max(m)}")
        else:
            h = sorted({abs(d) for d, t, _ in res if t})
            m = sorted({abs(d) for d, t, _ in res if not t})
            print(f"Tiefe {var}: Treffer bei |dz| {h}, kein Treffer bei |dz| {m}")
PY
	echo "# Treffer der Laeufe ohne Eingriff (messen_a5.py treffer; stufe hier ohne Bedeutung)"
	echo "lauf,frame,slot,max_lp,lp_vorher,lp_nachher,schaden,stufe,p1_aktion,status_vorher,status_nachher,umgefallen"
	cat logs/sa.tmp2
	echo "# messen_a5.py sprungangriff (je Frame ab dem Angriffsdruck bis zum ersten Treffer)"
	cat logs/sa.tmp1
} > $out
rm -f logs/sa.tmp1 logs/sa.tmp2 logs/raw/sa_*_ram.bin
wc -l $out
