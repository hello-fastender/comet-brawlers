#!/usr/bin/env bash
# Gegenpruefung der Adressen aus Aufgabe 4: blinde Suchen ueber den ganzen
# Arbeitsspeicher in den Variantenlaeufen (*_b), Filter nur aus deren
# eigenen Eingabezeiten bzw. Snapshots abgeleitet. Erwartete Treffer stehen
# jeweils im Kommentar; Ergebnis und Bewertung in notes.md.
#
#   scripts/run.sh scripts/scenarios/<name>_b.lua ingame   # fuer alle vier
#   scripts/verify_b.sh
set -euo pipefail
cd "$(dirname "$0")/.."
rt="python3 scripts/ramtools.py search"

echo "== x (walk_b; erwartet FFA99E)"
# rechts 101-125, links 201-215, rechts+runter 241-260, links+hoch 291-300;
# Eingabelatenz 1 Frame: Wirkung in 102-126 usw.
$rt logs/raw/walk_b --width 2 same:1:101 inc:101:126 same:126:201 dec:201:216 \
	same:216:241 inc:241:261 same:261:291 dec:291:301 same:301:330 \
	--show 1,126,216,261,301

echo "== x als 16.16-Festkomma (walk_b; erwartet FFA99E, Nachkomma FFA9A0)"
$rt logs/raw/walk_b --width 4 same:1:101 inc:101:126 same:126:201 dec:201:216 \
	same:216:241 inc:241:261 same:261:291 dec:291:301 same:301:330

echo "== Tiefe als 16.16-Festkomma (walk_b; erwartet FFA9A6, Nachkomma FFA9A8)"
# runter 41-70, hoch 151-170, rechts+runter 241-260, links+hoch 291-300.
# Diagonal nur 0,75 px/Frame: Das ganzzahlige Wort bleibt dann in manchen
# Frames stehen, deshalb Breite 4 (Ganzzahl + Nachkomma).
$rt logs/raw/walk_b --width 4 same:1:41 dec:41:71 same:71:151 inc:151:171 \
	same:171:241 dec:241:261 same:261:291 inc:291:301 same:301:330 \
	--show 1,71,171,261,301

echo "== Hoehe (jump_b; erwartet FFA9A2)"
# Spruenge bei 81, 161 (nach hinten), 251 (mit Angriff bei 270)
$rt logs/raw/jump_b --width 2 --signed same:1:82 val:84:gt:0 val:100:gt:20 \
	val:130:eq:0 same:130:162 val:180:gt:20 val:215:eq:0 same:215:252 \
	val:265:gt:20 val:300:eq:0 same:300:360 --show 1,84,100,130,180,265,300

echo "== Aktion (jump_b + attack_b; erwartet FFA99A)"
$rt logs/raw/jump_b --width 2 val:1:eq:0 val:70:eq:0 val:90:eq:10 val:140:eq:0 \
	val:190:eq:10 val:240:eq:0 --show 1,90,190,240
$rt logs/raw/attack_b --width 2 val:30:eq:0 val:50:eq:16 val:100:eq:0 \
	val:130:eq:16 val:200:eq:0 --show 30,50,100,130,200

echo "== LP Spieler (hurt_b; erwartet FFA9D0, Kopie FFA9D2)"
# Griff des Gegners laut Snapshots ab ~240, Wurf ~570, weitere Gegner ab ~1000
$rt logs/raw/hurt_b --width 2 --signed same:1:200 noinc:1:1300 600:200:lt \
	1000:600:lt 1300:1000:lt --show 1,600,1000,1300

echo "== LP Gegner (attack_b; erwartet FFCA50 = Slot 18 + 0x40, Kopie FFCA52)"
# Gegner erscheint ~360, Treffer laut Snapshots zwischen ~400 und ~480,
# besiegt ~510
$rt logs/raw/attack_b --width 2 --signed same:1:360 noinc:360:500 \
	450:400:lt 500:450:lt val:360:gt:0 --show 1,400,450,500
