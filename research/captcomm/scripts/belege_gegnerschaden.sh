#!/usr/bin/env bash
# Schaden der Gegner gegen die Figur (Nachtrag): MAME-Laeufe ab ingame,
# kontakt, kontakt_b; Auswertung mit messen_a5.py angreifer und rang nach
# logs/gegnerschaden.csv; loescht danach die eigenen Rohabzuege.
# Voraussetzung: Savestates ingame, kontakt, kontakt_b (scripts/laeufe_a5.sh).
# Dauer: ~3 min.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/rang.lua
out=logs/gegnerschaden.csv
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }
r() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="gs_$name" scripts/run.sh $sc "$state"; }

# ohne Eingriff: die drei Trefferlaeufe aus Aufgabe 5, hurt_c verlaengert
# (Tod der Figur in 1741, danach weiter ohne Eingabe)
r hurt ingame CC_BASIS=hurt.lua
r hurt_b ingame CC_BASIS=hurt_b.lua
r hurt_c_lang ingame CC_BASIS=hurt_c.lua CC_FRAMES=3000
# EINGRIFF: Rang FFF82A ab Frame 2 festgehalten (hurt_c; Gegner, die erst
# spaeter erscheinen, bekommen dann auch andere Max-LP)
for g in 7 16 24; do r hurt_c_rang$g ingame CC_BASIS=hurt_c.lua CC_RANG=$g; done
# EINGRIFF: Rang bei den Gegnern, die von Anfang an da sind (WOOKY 16 LP,
# 30-LP-Gegner), Figur passiv
for g in 7 24; do
	r kontakt_rang$g kontakt CC_BASIS=griff.lua CC_DAUER=0 CC_FRAMES=700 CC_RANG=$g
	r kontakt_b_rang$g kontakt_b CC_BASIS=griff.lua CC_SLOT=17 CC_DAUER=0 CC_FRAMES=700 CC_RANG=$g
done

runs=$(ls logs/raw/gs_*_ram.bin | sed 's/_ram.bin$//' | sort)
python3 scripts/messen_a5.py angreifer $runs > logs/gs.tmp1
python3 scripts/messen_a5.py rang $runs > logs/gs.tmp2
{
	echo "# Schaden der Gegner gegen die Figur (Captain Commando). gs_hurt*, gs_hurt_c_lang: ohne Eingriff."
	echo "# gs_*_rangN: EINGRIFF, Rang (Byte FFF82A) ab Frame 2 auf N gehalten. typ = S+0x38,"
	echo "# max_lp = S+0x9A, attr = Trefferattribut S+0x24 (0x4000 Schlag, 0x8000 Messer, 0x0800 wirft um),"
	echo "# schadenswert = S+0x8B des Verursachers (beim Angriffsbeginn gesetzt)."
	echo "# Zusammenfassung: Schaden je Gegner (Typ/Max-LP) und Rang"
	python3 - logs/gs.tmp1 <<'PY'
import csv, sys
from collections import defaultdict
NAME = {"0x5a97e": "WOOKY", "0x60ca0": "EDDY", "0x25086": "SKIP"}
t = defaultdict(lambda: defaultdict(set))
for r in csv.DictReader(open(sys.argv[1])):
    if r["art"] == "anders":
        continue
    key = f"{NAME.get(r['typ'], r['typ'])} {r['max_lp']} LP ({r['art']}, attr {r['attr']})"
    t[key][int(r["rang"])].add(int(r["schaden"]))
for k in sorted(t):
    print(k + ": " + ", ".join(f"Rang {g}: {'/'.join(map(str, sorted(v)))}" for g, v in sorted(t[k].items())))
PY
	echo "# messen_a5.py rang"
	cat logs/gs.tmp2
	echo "# messen_a5.py angreifer"
	cat logs/gs.tmp1
} > $out
rm -f logs/gs.tmp1 logs/gs.tmp2 logs/raw/gs_*_ram.bin
wc -l $out
