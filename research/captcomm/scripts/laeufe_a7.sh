#!/usr/bin/env bash
# Alle MAME-Laeufe fuer den Nachtrag "Sprung und Schlagreichweite".
# Voraussetzung: ROM in roms/. Danach scripts/belege_a7.sh. Dauer: ~3 min.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }

q scripts/run.sh $sc/coin_start.lua                 # Savestate "ingame"

# Sprung
for s in jump jump_b sprung_c sprung_d; do q scripts/run.sh $sc/$s.lua ingame; done

# Ausgangslagen fuer die Reichweite (Savestates anlauf, kontakt, tiefe_b,
# kontakt_b, anlauf_b, anlauf_c)
for s in kontakt kontakt_b anlauf_b anlauf_c; do q scripts/run.sh $sc/$s.lua ingame; done

schlag() { # name savestate [VAR=wert ...]
	local name=$1 state=$2; shift 2
	q env "$@" CC_NAME="$name" scripts/run.sh $sc/schlag.lua "$state"
}
# x-Reichweite und aktive Frames: Einzelschlag zu verschiedenen Zeiten,
# waehrend der Gegner heranlaeuft
for p in $(seq 2 2 40) 9 11 13; do schlag anlauf_p$p anlauf CC_PRESS=$p; done
for p in $(seq 2 24); do schlag anlaufb_p$p anlauf_b CC_PRESS=$p; done
for p in $(seq 2 26); do schlag anlaufc_p$p anlauf_c CC_PRESS=$p; done
# Tiefentoleranz: vor dem Schlag m Frames hoch (m > 0) bzw. runter (m < 0)
for m in $(seq -16 2 20) -5 -3 -1 1 3 5 21 22 23 24 26 28; do
	n=${m/-/m}; schlag tiefe_v$n kontakt CC_VERT=$m CC_PRESS=$(( ${m#-} + 2 ))
done
for m in $(seq 16 2 32) 21 23; do schlag tiefeA_v$m anlauf CC_VERT=$m CC_PRESS=$(( m + 2 )); done
for m in 0 1 2 3 4 5 6 8; do schlag tiefeB_v$m tiefe_b CC_VERT=$m CC_PRESS=$(( m + 2 )); done
echo "Laeufe fertig"
