#!/usr/bin/env bash
# Erzeugt die kurzen Logausschnitte fuer Aufgabe 4 (Speicheradressen) aus
# den Rohabzuegen in logs/raw/. Voraussetzung: Laeufe walk, walk_b, jump,
# jump_b, attack, attack_b, hurt, hurt_b (alle ab Savestate "ingame").
set -euo pipefail
cd "$(dirname "$0")/.."
rt="python3 scripts/ramtools.py"
out=logs

# Timer nur mit Start- und Endwert ausgeben (sonst eine Zeile pro Frame)
only_edges='NR == 1 || !(($2 == "FFAA61" || $2 == "FFAA69") && $3 != 0 && $4 != 0)'

{
	echo "# x (FFA99E/FFA9A0, 16.16), Tiefe (FFA9A6/FFA9A8, 16.16), x Vorframe (FFA9F6)"
	echo "# walk: rechts gedrueckt 261-300 -> x aendert sich 262-301 (+1,75/Frame)"
	$rt track logs/raw/walk --addr FFA99E:2 --addr FFA9A0:2 --addr FFA9A6:2 --addr FFA9A8:2 --addr FFA9F6:2 --from 259 --to 266
	$rt track logs/raw/walk --addr FFA99E:2 --addr FFA9A0:2 --addr FFA9A6:2 --addr FFA9A8:2 --addr FFA9F6:2 --from 298 --to 303 | tail -n +2
	echo "# walk_b: rechts 101-125 (Wirkung 102-126); rechts+runter 241-260 (x +1,25, Tiefe -0,75/Frame)"
	$rt track logs/raw/walk_b --addr FFA99E:2 --addr FFA9A0:2 --addr FFA9A6:2 --addr FFA9A8:2 --addr FFA9F6:2 --from 100 --to 104 | tail -n +2
	$rt track logs/raw/walk_b --addr FFA99E:2 --addr FFA9A0:2 --addr FFA9A6:2 --addr FFA9A8:2 --addr FFA9F6:2 --from 124 --to 128 | tail -n +2
	$rt track logs/raw/walk_b --addr FFA99E:2 --addr FFA9A0:2 --addr FFA9A6:2 --addr FFA9A8:2 --addr FFA9F6:2 --from 240 --to 246 | tail -n +2
} > $out/a4_position.csv

{
	echo "# Hoehe (FFA9A2/FFA9A4, 16.16, vorzeichenbehaftet), Hoehe Vorframe (FFA9F8),"
	echo "# Aktion (FFA99A: 0 Stand/Laufen, 10 Sprung, 16 Schlag), Unterphase (FFA99C)"
	echo "# jump: Sprung gedrueckt 61-62"
	$rt track logs/raw/jump --addr FFA9A2:2:s --addr FFA9A4:2 --addr FFA9F8:2:s --addr FFA99A:2 --addr FFA99C:2 --from 60 --to 110
	echo "# jump_b: Sprung gedrueckt 81-82"
	$rt changes logs/raw/jump_b --addr FFA9A2:2:s --addr FFA99A:2 --addr FFA99C:2 --from 80 --to 130 | tail -n +2
	echo "# attack: Leerschlag gedrueckt 61-62; attack_b: 41-42"
	$rt changes logs/raw/attack --addr FFA99A:2 --addr FFA99C:2 --from 55 --to 90
	$rt changes logs/raw/attack_b --addr FFA99A:2 --addr FFA99C:2 --from 35 --to 70 | tail -n +2
} > $out/a4_hoehe_aktion.csv

{
	echo "# LP Spieler (FFA9D0, Kopie Vorframe FFA9D2), Status (FFA994: 1 normal, 3 Trefferreaktion,"
	echo "# 2 am Boden), Liegen-Timer (FFAA61), Timer nach Aufstehen (FFAA69); Timer nur Start/Ende"
	echo "# hurt (ohne Gegenwehr, Gegner ab 184 aktiv)"
	$rt changes logs/raw/hurt --addr FFA9D0:2:s --addr FFA9D2:2:s --addr FFA994:1 --addr FFAA61:1 --addr FFAA69:1 --from 400 --to 1100 | awk -F, "$only_edges"
	echo "# hurt_b (variierte Eingaben, Gegner ab 154 aktiv)"
	$rt changes logs/raw/hurt_b --addr FFA9D0:2:s --addr FFA9D2:2:s --addr FFA994:1 --addr FFAA61:1 --addr FFAA69:1 --from 400 --to 1100 | awk -F, "$only_edges" | tail -n +2
} > $out/a4_lp_spieler.csv

{
	echo "# Gegner in Slot 18 (Basis FFCA10): LP S+0x40 (FFCA50), Status S+4/S+5 (FFCA14/FFCA15),"
	echo "# Angriffsnummer S+0x89 (FFCA99); Spieler: Aktion (FFA99A), Kombostufe x4 S+0x9D (FFAA2D),"
	echo "# Punkte BCD (FFAA76)"
	echo "# attack (Schlaege alle 8 Frames ab 561)"
	$rt changes logs/raw/attack --addr FFCA50:2:s --addr FFCA14:1 --addr FFCA15:1 --addr FFCA99:1 --addr FFA99A:2 --addr FFAA2D:1 --addr FFAA76:2 --from 540 --to 720
	echo "# attack_b (Schlaege alle 6 Frames ab 386)"
	$rt changes logs/raw/attack_b --addr FFCA50:2:s --addr FFCA14:1 --addr FFCA15:1 --addr FFCA99:1 --addr FFA99A:2 --addr FFAA2D:1 --addr FFAA76:2 --from 360 --to 540 | tail -n +2
} > $out/a4_lp_gegner.csv

{
	echo "# Gegnerzahl aus der Objekttabelle (ramtools.py enemies); Spalten siehe ramtools.py (cmd_enemies)"
	for r in hurt hurt_b attack attack_b; do
		echo "# $r"
		$rt enemies logs/raw/$r
	done
	echo "# attract (Demo, andere Stage), Ausschnitt"
	$rt enemies logs/raw/attract --from 3900 --to 4000
} > $out/a4_gegnerzahl.csv

wc -l $out/a4_*.csv
