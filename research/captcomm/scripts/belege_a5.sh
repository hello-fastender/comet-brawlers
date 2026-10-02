#!/usr/bin/env bash
# Erzeugt die Logausschnitte fuer Aufgabe 5 (Messungen) aus logs/raw/.
# Voraussetzung: scripts/laeufe_a5.sh
set -euo pipefail
cd "$(dirname "$0")/.."
m="python3 scripts/messen_a5.py"
out=logs

{
	echo "# Laufgeschwindigkeit je Eingabesegment (x und Tiefe als 16.16, Einheit = Bildschirmpixel)."
	echo "# von/bis = Eingabe gedrueckt; bewegt_von/bis = Frames mit Positionsaenderung"
	for r in walk walk_b; do echo "# $r"; $m laufen logs/raw/$r; done
} > $out/a5_laufen.csv

{
	echo "# LP-Abnahmen in Gegnerslots (stufe aus FFAA2D, max_lp aus S+0x9A, Status S+4 vorher/nachher)."
	echo "# Captain Commando: attack, attack_b (Gegner 16 LP), combo_c (zusaetzlich Gegner 30 LP)"
	for r in attack attack_b combo_c; do echo "# $r"; $m treffer logs/raw/$r; done
	echo "# attract: Demo-Abschnitt 1 (FFAA34 = 1, Captain Commando), Frames 1401-2380"
	$m treffer logs/raw/attract | awk -F, 'NR == 1 || ($1 >= 1401 && $1 <= 2380)'
	echo "# attract: Demo-Abschnitt 3 (FFAA34 = 0, Mack the Knife), Kette gegen Gegner mit 26 und 46 LP"
	$m treffer logs/raw/attract | awk -F, '$1 >= 3600 && $1 <= 3700'
} > $out/a5_schaden.csv

{
	echo "# Einzelschlag ab Savestate kontakt (Gegner 16 LP, 46 px) bzw. kontakt_b (Gegner 30 LP)"
	echo "# und Leerschlag ab ingame. Alle Frames lokal; eingabe = erster Frame mit gedrueckter Taste."
	echo "# aktion_ende = erster Frame mit Aktion 0; x_aendert_ab = erster Frame mit x-Aenderung."
	$m schlag logs/raw/schlag_p{2,3,4,5,6,8,10} \
		logs/raw/schlag_p3_w{4,20,40} logs/raw/schlag_p6_w7 \
		logs/raw/schlag_p3_k{10,16,17,18,20,25,31,32,33} logs/raw/schlag_p6_k{19,20,35,36} \
		logs/raw/schlagb_p{2,3,4} logs/raw/schlagb_p2_w3 logs/raw/schlagb_p4_w5 \
		logs/raw/schlagb_p3_k{16,17,32,33} \
		logs/raw/leer_p61_w62 logs/raw/leer_p81_w82 logs/raw/leer_p61_w75 \
		logs/raw/leer_p61_k{66,68,69,70}
	echo "# Trefferstopp: Animationswechsel von P1, Treffer (schlag_p3, Eingabe 3) gegen Leerschlag (Eingabe 61)"
	$m anim logs/raw/schlag_p3 3 30
	$m anim logs/raw/leer_p61_k66 61 88
	echo "# Kettenschlaege in attack/attack_b/combo_c: Eingabe (P1 Button 1) und Treffer siehe a5_schaden.csv"
} > $out/a5_schlag.csv

{
	echo "# Treffer gegen P1: Abstand zum vorigen Treffer und zum Aufstehen (Status 2 -> 3)"
	for r in hurt hurt_b hurt_c; do echo "# $r"; python3 scripts/messen_a5.py schutz logs/raw/$r; done
	echo "# Dauer der Schutzzustaende (Status S+4 = 3) und des Liegens"
	for r in hurt hurt_b hurt_c; do echo "# $r"; $m reaktion logs/raw/$r; done
	echo "# Aufsteh-Fenster mit Gegner in Reichweite (|dx| <= 60, |dz| <= 8)"
	for r in hurt hurt_b hurt_c; do echo "# $r"; $m fenster logs/raw/$r | awk -F, 'NR == 1 || $3 == "aufstehen"'; done
	echo "# EINGRIFF schutz_eingriff.lua: Timer FFAA69 ab 697 auf 0 (null) bzw. bis 830 auf 35 (halten)."
	echo "# fenster = Frames mit P1-Status 3; frames_mit_gegner_nah = Gegner in |dx| <= 60 und |dz| <= 8"
	for r in schutz_null schutz_halten; do
		echo "# $r: Treffer"; $m schutz logs/raw/$r
		echo "# $r: Schutzfenster"; $m fenster logs/raw/$r
	done
} > $out/a5_schutz.csv

wc -l $out/a5_*.csv
