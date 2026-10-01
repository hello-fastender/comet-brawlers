#!/usr/bin/env bash
# Alle MAME-Laeufe fuer Aufgabe 5 (Messungen). Voraussetzung: ROM in roms/.
# Danach scripts/belege_a5.sh fuer die Logausschnitte. Dauer: wenige Minuten.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; exit 1; }; }

# Grundlagen (Aufgabe 3/4): Savestate "ingame" und die Basislaeufe
q scripts/run.sh $sc/attract.lua
q scripts/run.sh $sc/coin_start.lua
for s in walk walk_b jump jump_b attack attack_b combo_c hurt hurt_b hurt_c; do
	q scripts/run.sh $sc/$s.lua ingame
done

# Startup/Recovery: zwei Ausgangslagen (Gegner in Reichweite)
q scripts/run.sh $sc/kontakt.lua ingame
q scripts/run.sh $sc/kontakt_b.lua ingame
schlag() { # name savestate [VAR=wert ...]
	local name=$1 state=$2; shift 2
	q env "$@" CC_NAME="$name" scripts/run.sh $sc/schlag.lua "$state"
}
schlag schlag_ref kontakt
for p in 2 3 4 5 6 8 10; do schlag schlag_p$p kontakt CC_PRESS=$p; done
schlag schlag_p3_w4 kontakt CC_PRESS=3 CC_WALK=4
schlag schlag_p6_w7 kontakt CC_PRESS=6 CC_WALK=7
schlag schlag_p3_w20 kontakt CC_PRESS=3 CC_WALK=20
schlag schlag_p3_w40 kontakt CC_PRESS=3 CC_WALK=40
for k in 10 16 17 18 20 25 31 32 33; do schlag schlag_p3_k$k kontakt CC_PRESS=3 CC_PRESS2=$k; done
for k in 19 20 35 36; do schlag schlag_p6_k$k kontakt CC_PRESS=6 CC_PRESS2=$k; done
schlag schlagb_ref kontakt_b
for p in 2 3 4; do schlag schlagb_p$p kontakt_b CC_PRESS=$p; done
schlag schlagb_p2_w3 kontakt_b CC_PRESS=2 CC_WALK=3
schlag schlagb_p4_w5 kontakt_b CC_PRESS=4 CC_WALK=5
for k in 16 17 32 33; do schlag schlagb_p3_k$k kontakt_b CC_PRESS=3 CC_PRESS2=$k; done

# Leerschlag ohne Gegner
leer() { local name=$1; shift; q env "$@" CC_NAME="$name" scripts/run.sh $sc/leerschlag.lua ingame; }
leer leer_p61_w62 CC_PRESS=61 CC_WALK=62
leer leer_p81_w82 CC_PRESS=81 CC_WALK=82
leer leer_p61_w75 CC_PRESS=61 CC_WALK=75
for k in 66 68 69 70; do leer leer_p61_k$k CC_PRESS=61 CC_PRESS2=$k; done

# Eingriff: Timer nach dem Aufstehen manipuliert
for m in null halten; do
	q env CC_MODE=$m CC_NAME=schutz_$m scripts/run.sh $sc/schutz_eingriff.lua ingame
done
echo "Laeufe fertig"
