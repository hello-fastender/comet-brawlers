#!/usr/bin/env bash
# Trefferreaktion der Gegner (Praefix reaktion): alle MAME-Laeufe mit
# scenarios/reaktion.lua, Auswertung mit messen_reaktion.py nach
# logs/reaktion.csv; loescht danach die eigenen Rohdaten (logs/raw/reaktion_m_*).
# Voraussetzung: Savestates kontakt (WOOKY, 16 LP, Slot 18) und kontakt_b
# (EDDY, 30 LP, Slot 17) aus scripts/laeufe_a5.sh, dazu ingame und tiefe_b. Dauer:
# etwa 3,5 min.
# Am Ende folgen die Gegenlaeufe der Gegenpruefung (Praefix reaktion_v, Savestates
# anlauf, anlauf_b, anlauf_c) mit eigener Ausgabe logs/reaktion_v.csv (etwa 1 min).
#
# Laufnamen reaktion_m_<teil>_<...>: Teil a (Trefferreaktion Stufe 1-3),
# a3 (zweiter Treffer frueh/spaet), a4 (ganze Kette mit fruehesten/spaetesten
# Druecken), b (Umwerfen: Referenzlaeufe), bp (Einzelframe-Proben), bg
# (Griffproben), c (mehrere Gegner), d (Tod), dr (dritte Messung der Zeilen A4,
# B5, B7, B8, D1 nach der Gegenpruefung; Savestates reaktion_w3 und tiefe_b).
# _w = WOOKY (kontakt), _e = EDDY (kontakt_b). EINGRIFFE: CC_LP (LP setzen),
# CC_DX/CC_DZ (Gegner relativ zur Figur setzen), CC_SLOT2/CC_DX2/CC_DZ2 (zweiten
# Gegner setzen); siehe Kopf von scenarios/reaktion.lua. Der Rang (FFF82A) wird
# nie veraendert.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/reaktion.lua
out=logs/reaktion.csv
M="python3 scripts/messen_reaktion.py"
raw=logs/raw
jobs=$(mktemp)
tmp=$(mktemp -d)
trap 'rm -rf "$jobs" "$tmp"' EXIT

# Lauf vormerken: k NAME SAVESTATE VAR=WERT ...
k() {
	local name=$1 state=$2
	shift 2
	printf '%q ' env "$@" CC_NAME="reaktion_m_$name" scripts/run.sh "$sc" "$state" >>"$jobs"
	echo >>"$jobs"
}
# vorgemerkte Laeufe ausfuehren (4 parallel)
laufen() {
	xargs -d '\n' -P 4 -I{} bash -c '{} >/dev/null 2>&1' <"$jobs" || { echo "Fehler in den MAME-Laeufen" >&2; exit 1; }
	: >"$jobs"
}
runs() { ls $raw/reaktion_m_"$1"*_ram.bin 2>/dev/null | sed 's/_ram.bin$//' | sort -V; }

W=(kontakt)
E=(kontakt_b CC_SLOT=17)
# --nur-auswertung: vorhandene Rohdaten auswerten, keine MAME-Laeufe
nur=0
[ "${1:-}" = --nur-auswertung ] && nur=1
if [ $nur = 1 ]; then laufen() { : >"$jobs"; }; fi

# Dritte Messung (Abweichungen zur Gegenpruefung V1): eigene Ausgangslage fuer den
# WOOKY, Savestate reaktion_w3 = ingame mit laengerem Rechtslauf (bis 548) und
# Tiefenabgleich 549-564, gespeichert in Frame 590 (WOOKY Slot 18 geht heran,
# Standpose ab Frame 11 bei dx 47/dz 7, holt ohne Eingabe in 32 aus, aktiv 41).
# Der EDDY kommt aus tiefe_b mit 8 Frames hoch (Standpose ab 28 bei dx 46/dz 8).
k dr_setup ingame "CC_IN=421-548:p1_right;549-564:p1_up" CC_FRAMES=590 CC_DUMP_VON=589 \
	CC_SAVE=590 CC_SAVE_NAME=reaktion_w3
laufen

# --- A: Trefferreaktion je Stufe (ohne Eingriff, ausser a_links_*) --------------
for p in 3 10 18 26; do k a_s1_w_p$p "${W[@]}" CC_DRUECKE=$p CC_FRAMES=$((p + 90)); done
for p in 3 14 20 35; do k a_s1_e_p$p "${E[@]}" CC_DRUECKE=$p CC_FRAMES=$((p + 90)); done
k a_s2_w "${W[@]}" CC_DRUECKE=3,19 CC_FRAMES=110
k a_s2_w_b "${W[@]}" CC_DRUECKE=10,26 CC_FRAMES=120
k a_s2_e "${E[@]}" CC_DRUECKE=3,19 CC_FRAMES=110
k a_s2_e_b "${E[@]}" CC_DRUECKE=20,36 CC_FRAMES=130
k a_s3_w "${W[@]}" CC_DRUECKE=3,19,36 CC_FRAMES=130
k a_s3_w_b "${W[@]}" CC_DRUECKE=10,24,40 CC_FRAMES=130
k a_s3_e "${E[@]}" CC_DRUECKE=3,19,36 CC_FRAMES=130
k a_s3_e_b "${E[@]}" CC_DRUECKE=20,36,53 CC_FRAMES=145
# Figur blickt nach links: EINGRIFF bis zum Frame vor dem Treffer (Gegner 50 px links)
k a_links_w "${W[@]}" CC_IN=2-3:p1_left CC_DRUECKE=6 CC_DX=-50 CC_DZ=0 CC_POKE_BIS=7 CC_FRAMES=90
k a_links_e "${E[@]}" CC_IN=2-3:p1_left CC_DRUECKE=6 CC_DX=-50 CC_DZ=0 CC_POKE_BIS=7 CC_FRAMES=90
# A3: zweiter Treffer frueh (h+12) und spaet (h+27 bzw. h+26) im Fenster
for g in w e; do
	[ $g = w ] && S=("${W[@]}") || S=("${E[@]}")
	[ $g = w ] && LP=(CC_LP=40) || LP=()
	k a3_s2_12_$g "${S[@]}" CC_DRUECKE=3,17 CC_FRAMES=110
	k a3_s2_27_$g "${S[@]}" CC_DRUECKE=3,32 CC_FRAMES=120
	k a3_s3_12_$g "${S[@]}" CC_DRUECKE=3,19,34 CC_FRAMES=125
	k a3_s3_26_$g "${S[@]}" CC_DRUECKE=3,19,48 CC_FRAMES=140
	k a3_s4_12_$g "${S[@]}" "${LP[@]}" CC_DRUECKE=3,19,36,52 CC_FRAMES=140
	k a3_s4_26_$g "${S[@]}" "${LP[@]}" CC_DRUECKE=3,19,36,66 CC_FRAMES=150
	# A4: ganze Kette mit den spaetesten bzw. fruehesten erlaubten Druecken
	k a4_spaet_$g "${S[@]}" "${LP[@]}" CC_DRUECKE=3,32,61,91 CC_FRAMES=170
	k a4_frueh_$g "${S[@]}" "${LP[@]}" CC_DRUECKE=3,17,31,46 CC_FRAMES=130
	# Grenze: letzter Druck der Stufe 2, bei dem der Gegner im ersten aktiven
	# Frame noch in der Reaktion steht (h+19 -> aktiv h+22; h+20 -> aktiv h+23)
	k a4_grenze19_$g "${S[@]}" CC_DRUECKE=3,24 CC_FRAMES=100
	k a4_grenze20_$g "${S[@]}" CC_DRUECKE=3,25 CC_FRAMES=100
done
k a4_spaet_w2 "${W[@]}" CC_LP=40 CC_DRUECKE=6,35,64,94 CC_FRAMES=170
k a4_spaet_e2 "${E[@]}" CC_DRUECKE=2,31,60,90 CC_FRAMES=170

# --- B: Umwerfen, Referenzlaeufe ----------------------------------------------
declare -A REF
REF[tritt_w]="kontakt CC_LP=40 CC_DRUECKE=3,19,36,54"
REF[tritt_e]="kontakt_b CC_SLOT=17 CC_DRUECKE=3,19,36,54"
REF[sprung_w]="kontakt CC_IN=2:p1_jump;10:p1_attack"
REF[sprung_e]="kontakt_b CC_SLOT=17 CC_IN=2:p1_jump;10:p1_attack"
REF[wurf_w]="kontakt CC_IN=2-7:p1_right;15:p1_right+p1_attack"
REF[wurf_e]="kontakt_b CC_SLOT=17 CC_IN=2-11:p1_right;14:p1_right+p1_attack"
REF[knie_w]="kontakt CC_IN=2-7:p1_right;15:p1_attack;33:p1_attack;51:p1_attack"
REF[knie_e]="kontakt_b CC_SLOT=17 CC_IN=2-11:p1_right;14:p1_attack;32:p1_attack;50:p1_attack"
# Varianten (anderer Zeitpunkt bzw. Wurf rueckwaerts)
REF[tritt_w2]="kontakt CC_LP=40 CC_DRUECKE=10,26,43,61"
REF[tritt_e2]="kontakt_b CC_SLOT=17 CC_DRUECKE=20,36,53,71"
REF[sprung_w2]="kontakt CC_IN=5:p1_jump;14:p1_attack"
REF[sprung_e2]="kontakt_b CC_SLOT=17 CC_IN=20:p1_jump;27:p1_attack"
REF[wurf_w2]="kontakt CC_IN=2-7:p1_right;25:p1_left+p1_attack"
# Proben: Gegner vor der Figur (dx 50); nach dem Rueckwaertswurf blickt die
# Figur nach links, die Probe steht dort links (dx -50)
declare -A PDX
PDX[wurf_w2]=-50
HAUPT="tritt_w tritt_e sprung_w sprung_e wurf_w wurf_e knie_w knie_e"
VARIANTEN="tritt_w2 tritt_e2 sprung_w2 sprung_e2 wurf_w2"
for r in $HAUPT $VARIANTEN; do
	# shellcheck disable=SC2086
	k b_$r ${REF[$r]} CC_FRAMES=300
done

# --- C: mehrere Gegner (EINGRIFF: WOOKY aus Slot 16 neben EDDY gesetzt) --------
k c_zwei_a "${E[@]}" CC_DRUECKE=20 CC_SLOT2=16 CC_DX2=50 CC_DZ2=0 CC_POKE2_VON=14 CC_POKE2_BIS=30 CC_FRAMES=80
k c_zwei_b "${E[@]}" CC_DRUECKE=30 CC_SLOT2=16 CC_DX2=70 CC_DZ2=-6 CC_POKE2_VON=14 CC_POKE2_BIS=40 CC_FRAMES=90
k c_kette_a "${E[@]}" CC_DRUECKE=20,36,53 CC_SLOT2=16 CC_DX2=50 CC_DZ2=0 CC_POKE2_VON=14 CC_POKE2_BIS=80 CC_FRAMES=100
k c_kette_b "${E[@]}" CC_DRUECKE=30,46,63 CC_SLOT2=16 CC_DX2=70 CC_DZ2=-6 CC_POKE2_VON=14 CC_POKE2_BIS=90 CC_FRAMES=110
k c_einzel_b "${E[@]}" CC_DRUECKE=30,46,63 CC_FRAMES=110
k c_fenster27 "${E[@]}" CC_DRUECKE=20,49 CC_SLOT2=16 CC_DX2=50 CC_DZ2=0 CC_POKE2_VON=14 CC_POKE2_BIS=70 CC_FRAMES=90
k c_fenster28 "${E[@]}" CC_DRUECKE=20,50 CC_SLOT2=16 CC_DX2=50 CC_DZ2=0 CC_POKE2_VON=14 CC_POKE2_BIS=70 CC_FRAMES=90

# --- D: Tod --------------------------------------------------------------------
k d_tritt_w "${W[@]}" CC_DRUECKE=3,19,36,54 CC_FRAMES=170
k d_s1_w "${W[@]}" CC_LP=2 CC_DRUECKE=3 CC_FRAMES=110
k d_s1_e "${E[@]}" CC_LP=2 CC_DRUECKE=20 CC_FRAMES=130
k d_s3_e "${E[@]}" CC_LP=10 CC_DRUECKE=3,19,36 CC_FRAMES=150
k d_sprung_w "${W[@]}" CC_LP=5 "CC_IN=2:p1_jump;10:p1_attack" CC_FRAMES=130
# Tod im ersten aktiven Frame des WOOKY-Schlags (Frame 28 ohne Eingabe)
k d_gleich_w "${W[@]}" CC_LP=2 CC_DRUECKE=26 CC_FRAMES=120
# Einzelframe-Proben auf den sterbenden Gegner (EINGRIFF: in Frame T bei dx 50)
for T in 20 30 45 60 75; do
	k d_probe_w_t$T "${W[@]}" CC_LP=2 CC_DRUECKE=3,$((T - 2)) CC_DX=50 CC_DZ=0 \
		CC_POKE_VON=$((T - 1)) CC_FERN_BIS=$((T - 1)) CC_NAH_BIS=$T CC_POKE_BIS=$((T + 6)) CC_FRAMES=$((T + 10))
done
for T in 40 55 70 90; do
	k d_probe_e_t$T "${E[@]}" CC_LP=2 CC_DRUECKE=20,$((T - 2)) CC_DX=50 CC_DZ=0 \
		CC_POKE_VON=$((T - 1)) CC_FERN_BIS=$((T - 1)) CC_NAH_BIS=$T CC_POKE_BIS=$((T + 6)) CC_FRAMES=$((T + 10))
done

# --- Dritte Messung (dr_*): A4, B5, B7, B8, D1 aus reaktion_w3 und tiefe_b ---------
W3=(reaktion_w3)
T3=(tiefe_b CC_SLOT=17)
HOCH="2-9:p1_up"
# A4: erster Angriff nach der Reaktion (ohne Eingriff)
for p in 12 25 33 38; do k dr_a4_w_p$p "${W3[@]}" CC_DRUECKE=$p CC_FRAMES=$((p + 80)); done
k dr_a4_w_k "${W3[@]}" CC_DRUECKE=12,28,45 CC_FRAMES=130
# Ketten mit Pausen (Folgetreffer erst in h+24, der Gegner steht dazwischen frei)
k dr_a4_w_p2 "${W3[@]}" CC_DRUECKE=12,35 CC_FRAMES=130
k dr_a4_w_p3a "${W3[@]}" CC_DRUECKE=12,35,59 CC_FRAMES=150
k dr_a4_w_p3b "${W3[@]}" CC_DRUECKE=15,38,62 CC_FRAMES=150
k dr_a4_w_p3c "${W3[@]}" CC_DRUECKE=12,40,68 CC_FRAMES=160
for p in 30 40 47 52; do k dr_a4_e_p$p "${T3[@]}" CC_IN=$HOCH CC_DRUECKE=$p CC_FRAMES=$((p + 90)); done
k dr_a4_e_k "${T3[@]}" CC_IN=$HOCH CC_DRUECKE=30,46,63 CC_FRAMES=150
# B5/B7/B8: Umwerfen, Liegen, Aufstehen, Aktion danach (ohne Eingriff)
k dr_b_e_t30 "${T3[@]}" CC_IN=$HOCH CC_DRUECKE=30,46,63,81 CC_FRAMES=330
k dr_b_e_t35 "${T3[@]}" CC_IN=$HOCH CC_DRUECKE=35,51,68,86 CC_FRAMES=330
k dr_b_e_t40 "${T3[@]}" CC_IN=$HOCH CC_DRUECKE=40,56,73,91 CC_FRAMES=340
k dr_b_e_s20 "${T3[@]}" "CC_IN=$HOCH;20:p1_jump;27:p1_attack" CC_FRAMES=300
k dr_b_e_s25 "${T3[@]}" "CC_IN=$HOCH;25:p1_jump;32:p1_attack" CC_FRAMES=300
k dr_b_e_s31 "${T3[@]}" "CC_IN=$HOCH;31:p1_jump;38:p1_attack" CC_FRAMES=300
k dr_b_e_w "${T3[@]}" "CC_IN=$HOCH;28-34:p1_right;45:p1_right+p1_attack" CC_FRAMES=320
k dr_b_e_k "${T3[@]}" "CC_IN=$HOCH;28-34:p1_right;45:p1_attack;63:p1_attack;81:p1_attack" CC_FRAMES=340
k dr_b_w_w "${W3[@]}" "CC_IN=2-12:p1_right;20:p1_right+p1_attack" CC_FRAMES=300
k dr_b_w_k "${W3[@]}" "CC_IN=2-12:p1_right;20:p1_attack;38:p1_attack;56:p1_attack" CC_FRAMES=300
k dr_b_w_s "${W3[@]}" "CC_IN=20:p1_jump;27:p1_attack" CC_FRAMES=300
# D1: Tod durch Stufe 1, 2, Tritt, Sprungangriff, Wurf (EINGRIFF CC_LP ausser dr_d_w_tritt)
k dr_d_w_s1 "${W3[@]}" CC_LP=2 CC_DRUECKE=12 CC_FRAMES=120
k dr_d_w_s2 "${W3[@]}" CC_LP=6 CC_DRUECKE=12,28 CC_FRAMES=170
k dr_d_w_tritt "${W3[@]}" CC_DRUECKE=12,28,45,63 CC_FRAMES=170
k dr_d_w_wurf "${W3[@]}" CC_LP=10 "CC_IN=2-12:p1_right;20:p1_right+p1_attack" CC_FRAMES=170
k dr_d_e_s2 "${T3[@]}" CC_LP=6 CC_IN=$HOCH CC_DRUECKE=30,46 CC_FRAMES=190
k dr_d_e_sprung "${T3[@]}" CC_LP=5 "CC_IN=$HOCH;20:p1_jump;27:p1_attack" CC_FRAMES=150
k dr_d_e_wurf "${T3[@]}" CC_LP=10 "CC_IN=$HOCH;28-34:p1_right;45:p1_right+p1_attack" CC_FRAMES=190
k dr_d_e_wurfr "${T3[@]}" CC_LP=10 "CC_IN=$HOCH;28-34:p1_right;48:p1_left+p1_attack" CC_FRAMES=190
laufen

# --- B: Einzelframe-Proben und Griffproben relativ zu K und G des Referenzlaufs --
probe() { # probe REF NAME T
	local r=$1 name=$2 T=$3
	# shellcheck disable=SC2206
	local a=(${REF[$r]}) extra=() i
	for i in "${!a[@]}"; do
		case ${a[$i]} in
		CC_DRUECKE=*) a[$i]="${a[$i]},$((T - 2))" ;;
		esac
	done
	[[ " ${a[*]} " == *" CC_DRUECKE="* ]] || extra=(CC_DRUECKE=$((T - 2)))
	k "$name" "${a[@]}" "${extra[@]}" CC_DX="${PDX[$r]:-50}" CC_DZ=0 CC_POKE_VON=$((T - 1)) CC_FERN_BIS=$((T - 1)) \
		CC_NAH_BIS=$T CC_POKE_BIS=$((T + 6)) CC_FRAMES=$((T + 8)) CC_DUMP_VON=$((T - 4)) CC_DUMP_BIS=$((T + 8))
}
griff() { # griff REF NAME T DX: ab Frame T rechts gehalten, Gegner bei DX (EINGRIFF)
	local r=$1 name=$2 T=$3 dx=$4
	# shellcheck disable=SC2206
	local a=(${REF[$r]}) i found=0
	for i in "${!a[@]}"; do
		case ${a[$i]} in
		CC_IN=*) a[$i]="${a[$i]};$T-$((T + 30)):p1_right"; found=1 ;;
		esac
	done
	[ $found = 1 ] || a+=("CC_IN=$T-$((T + 30)):p1_right")
	k "$name" "${a[@]}" CC_DX="$dx" CC_DZ=0 CC_POKE_VON=$((T - 1)) CC_POKE_BIS=$((T + 30)) \
		CC_FRAMES=$((T + 32)) CC_DUMP_VON=$((T - 4)) CC_DUMP_BIS=$((T + 32))
}
# natuerliche Gegenprobe ohne Eingriff: Figur geht nach dem Sprungangriff an den
# liegenden Gegner heran (dx 82 bzw. 67) und schlaegt mit erstem aktivem Frame
# G-1 bzw. G
natprobe() { # natprobe REF NAME LAUFEN T
	# shellcheck disable=SC2206
	local a=(${REF[$1]}) i
	for i in "${!a[@]}"; do
		case ${a[$i]} in CC_IN=*) a[$i]="${a[$i]};$3:p1_right" ;; esac
	done
	k "$2" "${a[@]}" CC_DRUECKE=$(($4 - 2)) CC_FRAMES=$(($4 + 20))
}
for r in $HAUPT $VARIANTEN; do
	slot=18
	[[ $r == *_e* ]] && slot=17
	read -r K G < <($M eckdaten $raw/reaktion_m_b_$r --slot $slot)
	echo "$r $slot $K $G" >>"$tmp/kg"
	if [[ " $HAUPT " == *" $r "* ]]; then
		for kk in -18 -10 -4 -2 -1 0 1 2 4 6 8 12 16 20 24 28 32 36 40; do
			probe "$r" "bp_${r}_g${kk/-/m}" $((G + kk))
		done
		for j in 40 60 80; do
			[ $((K + j)) -lt $((G - 18)) ] && probe "$r" "bp_${r}_k$j" $((K + j))
		done
		griff "$r" "bg_${r}_gm10" $((G - 10)) 30
		griff "$r" "bg_${r}_gm3" $((G - 3)) 20
		[ $r = sprung_w ] && { natprobe $r bn_${r}_gm1 40-114 $((G - 1)); natprobe $r bn_${r}_g0 40-114 $G; }
		[ $r = sprung_e ] && { natprobe $r bn_${r}_gm1 40-122 $((G - 1)); natprobe $r bn_${r}_g0 40-122 $G; }
	else
		for kk in -1 0 2; do probe "$r" "bp_${r}_g${kk/-/m}" $((G + kk)); done
	fi
done
laufen

# --- Auswertung ----------------------------------------------------------------
A=$(runs a_; runs a3_; runs a4_)
$M treffer $A >$tmp/treffer.csv
$M kette $(runs a3_; runs a4_) >$tmp/kette.csv
{
	$M umwerfen $raw/reaktion_m_b_tritt_w --slot 18 | sed -n 1p
	for r in $HAUPT $VARIANTEN; do
		s=18
		[[ $r == *_e* ]] && s=17
		$M umwerfen $raw/reaktion_m_b_$r --slot $s | sed 1d
	done
} >$tmp/umwerfen.csv
: >$tmp/probe.csv
: >$tmp/griff.csv
while read -r r s K G; do
	$M probe --ref $raw/reaktion_m_b_$r --slot $s $(runs bp_${r}_) | sed "s/^/$r,/" >>$tmp/probe.csv
	if [ -n "$(runs bn_${r}_)" ]; then
		$M probe --ref $raw/reaktion_m_b_$r --slot $s $(runs bn_${r}_) | sed "s/^/nat_$r,/" >>$tmp/probe.csv
	fi
	if [[ " $HAUPT " == *" $r "* ]]; then
		$M griffprobe --ref $raw/reaktion_m_b_$r --slot $s $(runs bg_${r}_) | sed "s/^/$r,/" >>$tmp/griff.csv
	fi
done <$tmp/kg
$M mehrere $(runs c_) $raw/reaktion_m_a_s1_e_p20 $raw/reaktion_m_a_s3_e_b >$tmp/mehrere.csv
{
	$M tod $raw/reaktion_m_d_tritt_w | sed -n 1p
	$M tod $(runs d_tritt; runs d_s1_w) --slot 18 | sed 1d
	$M tod $(runs d_s1_e; runs d_s3_e) --slot 17 | sed 1d
	$M tod $(runs d_sprung; runs d_gleich) --slot 18 | sed 1d
	$M tod $(runs d_probe_w) --slot 18 | sed 1d
	$M tod $(runs d_probe_e) --slot 17 | sed 1d
} >$tmp/tod.csv
# Dritte Messung
$M treffer $(runs dr_a4_) >$tmp/dr_treffer.csv
{
	$M umwerfen $(runs dr_b_e_) --slot 17
	$M umwerfen $(runs dr_b_w_) --slot 18 | sed 1d
} >$tmp/dr_umwerfen.csv
{
	$M tod $(runs dr_d_w_) --slot 18
	$M tod $(runs dr_d_e_) --slot 17 | sed 1d
} >$tmp/dr_tod.csv
# Figur im Gleichzeitig-Fall: LP-Verluste der Figur
$M gegnerreaktion $raw/reaktion_m_d_gleich_w --slot 18 --von 26 --bis 32 >$tmp/gleich.csv
# Rang je Lauf (Watch-CSV, nie veraendert)
for f in $raw/reaktion_m_*_watch.csv; do
	n=$(basename "$f" _watch.csv)
	echo "$n,$(tail -n +2 "$f" | cut -d, -f3 | sort -un | tr '\n' '/' | sed 's#/$##')"
done | sort -V >$tmp/rang.csv

{
	echo "# Trefferreaktion der Gegner (Praefix reaktion), erzeugt von scripts/belege_reaktion.sh."
	echo "# Laeufe reaktion_m_*: _w = WOOKY (kontakt, 16 LP, Slot 18), _e = EDDY (kontakt_b, 30 LP, Slot 17)."
	echo "# h = Frame des LP-Verlusts, K = Umwerfen, G = erster Frame mit S+4 = 1 nach dem Aufstehen."
	echo "# EINGRIFFE: CC_LP=40 bei WOOKY in a3_s4_w, a4_*_w, b_tritt_w* und den Proben dazu (LP und Max-LP"
	echo "# auf 40); CC_LP=2/5/10 in d_* (Tod); a_links_*: Gegner bis h-1 links der Figur gesetzt; bp_*: Gegner"
	echo "# nur im Frame T bei dx 50/dz 0 (wurf_w2: dx -50), davor und danach 200 px entfernt; bg_*: Gegner ab T-1 bei dx 30 bzw."
	echo "# 20; c_*: WOOKY aus Slot 16 neben EDDY gesetzt; d_probe_*: sterbender Gegner nur in T bei dx 50."
	echo "# Ohne Eingriff: a_* (ausser a_links_*), a3_*/a4_* beim EDDY, b_*_e*, b_sprung_*, b_wurf_*, b_knie_*,"
	echo "# c_einzel_b, d_tritt_w, bn_* (natuerliche Gegenprobe zu bp_*)."
	echo "# Zusammenfassung"
	python3 - "$tmp" <<'PY'
import csv, os, re, sys
from collections import defaultdict
t = sys.argv[1]
def rows(n):
    return [r for r in csv.DictReader(l for l in open(os.path.join(t, n)) if not l.startswith("#"))]
tr = rows("treffer.csv")
# A1: ungestoerte Reaktionen (kein Abbruch durch einen Treffer)
full = [r for r in tr if r["art"] == "reaktion" and r["abbruch_durch_treffer"] == "-"]
by = defaultdict(set)
for r in full:
    by[(r["gegner"], r["stufe"])].add((r["reaktion_bis"], r["s4_1_ab"]))
for (geg, st), v in sorted(by.items()):
    n = sum(1 for r in full if r["gegner"] == geg and r["stufe"] == st)
    print(f"A1 {geg} Stufe {st}: S+4=3 von h bis {'/'.join(sorted(a for a, _ in v))}, S+4=1 ab {'/'.join(sorted(b for _, b in v))} ({n} Treffer)")
an = defaultdict(set)
for r in full:
    m = dict(x.split(":", 1) for x in r["anim_wechsel"].split())
    an[r["gegner"]].add(" ".join(f"{k}:{v.split('/')[-1]}" for k, v in m.items() if k in ("h+1", "h+10", "h+22", "h+23")))
for geg, v in sorted(an.items()):
    print(f"A1 {geg} Animation: {' | '.join(sorted(v))}")
mv = defaultdict(set); au = defaultdict(set); at = defaultdict(set)
for r in full:
    mv[r["gegner"]].add(r["erste_bewegung"]); au[r["gegner"]].add(r["ausholen_ab"]); at[r["gegner"]].add(r["angriff_aktiv_ab"])
for geg in sorted(mv):
    print(f"A1 {geg}: erste Bewegung {'/'.join(sorted(mv[geg]))}; Ausholen ab {'/'.join(sorted(au[geg]))}; Angriff aktiv ab {'/'.join(sorted(at[geg]))}")
sh = defaultdict(set)
for r in tr:
    if r["art"] == "reaktion":
        sh[(r["x_je_frame"], r["x_summe"], r["tiefe_summe"])].add(r["lauf"].replace("reaktion_m_", ""))
for (s, xs, zs), v in sorted(sh.items()):
    print(f"A2 Zittern {s or 'keins'}; x gesamt {xs}; Tiefe gesamt {zs} ({len(v)} Treffer, z. B. {', '.join(sorted(v)[:3])})")
# A3: Treffer in der laufenden Reaktion
for r in tr:
    if r["art"] == "reaktion" and r["abbruch_durch_treffer"] != "-":
        nxt = next((x for x in tr if x["lauf"] == r["lauf"] and int(x["h"]) == int(r["h"]) + int(r["abbruch_durch_treffer"][2:])), None)
        if nxt and re.search(r"a3_|a4_frueh", r["lauf"]):
            print(f"A3 {r['lauf'].replace('reaktion_m_', '')}: Stufe {r['stufe']} h={r['h']}, Folgetreffer {r['abbruch_durch_treffer']} "
                  f"(Stufe {nxt['stufe']}) -> neue Reaktion bis {nxt['reaktion_bis'] or nxt['art']} ab dem Folgetreffer")
for r in rows("kette.csv"):
    print(f"A4 {r['lauf'].replace('reaktion_m_', '')} Stufe {r['stufe']}: Druck {r['druck_rel']}, Reaktion bis {r['reaktion_bis']}, "
          f"aktiv ab {r['aktiv_ab']}, Luecke {r['luecke_frames']} Frames (S+4 im aktiven Frame {r['s4_im_aktiven_frame']}), "
          f"Treffer {r['treffer_rel']}; Gegner in der Luecke: {r['gegner_in_luecke'] or '-'}")
for r in rows("umwerfen.csv"):
    print(f"B1 {r['lauf'].replace('reaktion_m_', '')}: K={r['K']}, Flug ab {r['flug_ab']} vx {r['vx0']} vh {r['vh0']} g {r['schwerkraft']} "
          f"(vx-Aenderung {r['vx_aenderung']}), Scheitel {r['scheitel']} {r['scheitel_hoehe']}, Boden {r['boden']} ({r['boden_dx']}), "
          f"Ruhe {r['ruhe']} ({r['ruhe_dx']}); B2 Aufstehen ab {r['aufstehen_ab']}, S+4=1 {r['s4_1_ab']}, "
          f"liegt {r['liegen_ruhe_bis_aufstehen']}, steht auf {r['aufstehen_frames']} Frames, S+4 {r['s4_waehrend']}, danach Aktion {r['aktion_ab_G']}")
pr = defaultdict(list)
for line in open(os.path.join(t, "probe.csv")):
    p = line.rstrip("\n").split(",")
    if line.startswith(("#",)) or len(p) < 10 or p[1] == "lauf" or "#" in p[1]:
        continue
    pr[p[0]].append(p)
for r, ps in pr.items():
    if r.startswith("nat_"):
        for p in ps:
            print(f"B3 {r[4:]} ohne Eingriff ({p[1].replace('reaktion_m_', '')}): erster aktiver Frame {p[5]}, "
                  f"Treffer {p[-1]}, dx {p[13]}, dz {p[14]}")
        continue
    yes = sorted((int(p[5][1:]), p) for p in ps if p[9] == "ja")
    no = sorted((int(p[5][1:]), p) for p in ps if p[9] == "nein")
    noschl = [p[5] for p in ps if p[6] != "ja"]
    first = min((k for k, _ in yes), default=None)
    late_no = [k for k, _ in no if first is not None and k >= first]
    print(f"B3 {r}: Treffer bei G{'/'.join(f'{k:+d}' for k, _ in yes)}; kein Treffer bei "
          f"{'/'.join(f'{p[5]} ({p[4]})' for _, p in no)}"
          f"{'; Figur schlug nicht: ' + '/'.join(noschl) if noschl else ''}"
          f"{'; ACHTUNG kein Treffer nach dem ersten: ' + str(late_no) if late_no else ''}")
for line in open(os.path.join(t, "griff.csv")):
    p = line.rstrip("\n").split(",")
    if len(p) > 3 and p[1].startswith("reaktion_m_"):
        print(f"B3 Griff {p[1].replace('reaktion_m_', '')}: Laufen ab {p[2]}, Griff in {p[3]} ({p[4]})")
for r in rows("mehrere.csv"):
    print(f"C {r['lauf'].replace('reaktion_m_', '')}: Druck {r['druck']}, Treffer {r['trefferframe']} an {r['getroffen']} "
          f"(Schaden {r['schaden']}, Stufe {r['kombostufe']}), Animationswechsel der Figur {r['p1_anim_wechsel_nach_h']}, "
          f"Phase 4 ab {r['p1_phase4_ab']}")
for r in rows("tod.csv"):
    print(f"D {r['lauf'].replace('reaktion_m_', '')} ({r['gegner']}): Tod t={r['tod_frame']} (LP {r['lp']}), {r['zustaende']}; Flug {r['flug_ab']}, "
          f"vx {r['vx0']} vh {r['vh0']}, Boden {r['boden']}, Ruhe {r['ruhe']}, frei {r['frei_ab']} ({r['frames_bis_frei']} Frames); Treffer danach: {r['treffer_nach_tod']}; "
          f"Angriffsframes {r['angriff_aktiv_nach_tod']}; Figur verliert LP: {r['figur_lp_verlust_nach_tod']}; Frames im Bereich eines Schlags: {r['proben_im_bereich']}")
g = rows("gleich.csv")
lp = [int(r["p1_lp"]) for r in g]
print(f"D d_gleich_w: LP der Figur in Frame {g[0]['frame']}-{g[-1]['frame']}: {'/'.join(map(str, sorted(set(lp))))}")
# Dritte Messung: A4 (Ausholen und aktiver Frame nach der letzten ungestoerten
# Reaktion je Lauf), B5/B7/B8 (Umwerfen), D1 (Tod)
for r in rows("dr_treffer.csv"):
    if r["art"] != "reaktion" or r["abbruch_durch_treffer"] != "-" or r["angriff_aktiv_ab"] == "-":
        continue
    an = r["anim_wechsel"]
    art = "langsam 05FA54" if "05fa54" in an else "schnell 05FC18" if "05fc18" in an else "EDDY"
    print(f"DR A4 {r['lauf'].replace('reaktion_m_', '')} ({r['gegner']}): Treffer h={r['h']} Stufe {r['stufe']}, "
          f"Ausholen {r['ausholen_ab']}, aktiv {r['angriff_aktiv_ab']} ({art})")
for r in rows("dr_umwerfen.csv"):
    print(f"DR B {r['lauf'].replace('reaktion_m_', '')} ({r['gegner']}): K={r['K']}, Ruhe {r['ruhe']}, liegt "
          f"{r['liegen_ruhe_bis_aufstehen']}, Aufstehen {r['aufstehen_frames']} Frames, G = {r['s4_1_ab']}, "
          f"danach Aktion {r['aktion_ab_G']}, Bewegung ab {r['erste_bewegung_ab_G']}")
for r in rows("dr_tod.csv"):
    print(f"DR D1 {r['lauf'].replace('reaktion_m_', '')} ({r['gegner']}): Tod t={r['tod_frame']}, {r['zustaende']}; "
          f"Flug {r['flug_ab']} (vx {r['vx0']}, vh {r['vh0']}), Boden {r['boden']}, Ruhe {r['ruhe']}, frei {r['frei_ab']}")
rg = defaultdict(list)
for line in open(os.path.join(t, "rang.csv")):
    n, v = line.strip().split(",", 1)
    rg[v].append(n)
print("Rang (FFF82A) in allen Laeufen: " + "; ".join(f"{v}: {len(n)} Laeufe" for v, n in rg.items()))
PY
	echo "# Einzelwerte: treffer (je Treffer ohne Umwerfen)"
	cat $tmp/treffer.csv
	echo "# Einzelwerte: kette (je Kettendruck)"
	cat $tmp/kette.csv
	echo "# Einzelwerte: umwerfen (Referenzlaeufe b_*)"
	cat $tmp/umwerfen.csv
	echo "# Einzelwerte: probe (erste Spalte = Referenz; T_rel_G < 0 vor dem Aufstehen)"
	cat $tmp/probe.csv
	echo "# Einzelwerte: griffprobe"
	cat $tmp/griff.csv
	echo "# Einzelwerte: mehrere (c_*, dazu a_s1_e_p20 und a_s3_e_b als Einzelgegner zum Vergleich)"
	cat $tmp/mehrere.csv
	echo "# Einzelwerte: tod"
	cat $tmp/tod.csv
	echo "# Einzelwerte dritte Messung (dr_*): treffer"
	cat $tmp/dr_treffer.csv
	echo "# Einzelwerte dritte Messung: umwerfen"
	cat $tmp/dr_umwerfen.csv
	echo "# Einzelwerte dritte Messung: tod"
	cat $tmp/dr_tod.csv
	echo "# Einzelwerte: Figur im Gleichzeitig-Fall (d_gleich_w, gegnerreaktion Frame 26-32)"
	cat $tmp/gleich.csv
	echo "# Rang je Lauf (Watch FFF82A)"
	cat $tmp/rang.csv
} >$out

[ $nur = 1 ] || rm -f $raw/reaktion_m_*
wc -l $out

# === Gegenpruefung V1 (Praefix reaktion_v) ======================================
# Eigene Laeufe mit scenarios/reaktion_v_frei.lua (nur Watch-CSV, kein Abzug) aus
# anderen Ausgangslagen als oben: WOOKY ab anlauf/anlauf_b (laeuft aus ~110 px
# heran, Slot 18), EDDY ab anlauf_c (laeuft aus 105 px heran, Slot 17; WOOKY in
# Slot 16 kommt spaeter dazu). Auswertung mit messen_reaktion_v.py belege nach
# logs/reaktion_v.csv; logs/reaktion.csv bleibt unveraendert. Einziger EINGRIFF:
# b_tritt_w (CC_LP=18:35). Voraussetzung: Savestates anlauf, anlauf_b, anlauf_c.
scv=scripts/scenarios/reaktion_v_frei.lua
outv=logs/reaktion_v.csv
kv() {
	local name=$1 state=$2
	shift 2
	printf '%q ' env "$@" CC_NAME="reaktion_v_$name" scripts/run.sh "$scv" "$state" >>"$jobs"
	echo >>"$jobs"
}
# A: Trefferreaktion, Folgeverhalten, Zittern, Neustart (Stufe 1 trifft P+2, 2/3/4 D+3/D+4/D+3)
kv a_w_geh anlauf CC_FRAMES=160 CC_IN="17:p1_attack"
kv a_w_stand anlauf CC_FRAMES=160 CC_IN="52:p1_attack"
kv a_w_aus anlauf CC_FRAMES=160 CC_IN="64:p1_attack"
kv a_w_kette anlauf CC_FRAMES=200 CC_IN="44:p1_attack;67:p1_attack;90:p1_attack"
kv a_w_neu anlauf CC_FRAMES=160 CC_IN="48:p1_attack;65:p1_attack"
kv a_w_frueh anlauf CC_FRAMES=220 CC_IN="50:p1_attack;65:p1_attack;80:p1_attack;99:p1_attack"
kv a_w_spaet anlauf CC_FRAMES=260 CC_IN="47:p1_attack;76:p1_attack;105:p1_attack;135:p1_attack"
kv a_w_links anlauf_b CC_FRAMES=200 CC_IN="2:p1_jump+p1_right;50-74:p1_right;76:p1_left;77:p1_attack"
kv a_e_geh anlauf_c CC_FRAMES=160 CC_IN="15:p1_attack"
kv a_e_stand anlauf_c CC_FRAMES=160 CC_IN="45:p1_attack"
kv a_e_aus anlauf_c CC_FRAMES=160 CC_IN="62:p1_attack"
kv a_e_kette anlauf_c CC_FRAMES=320 CC_IN="42:p1_attack;66:p1_attack;90:p1_attack;114:p1_attack"
kv a_e_neu anlauf_c CC_FRAMES=180 CC_IN="44:p1_attack;58:p1_attack;72:p1_attack"
kv a_e_frueh anlauf_c CC_FRAMES=300 CC_IN="48:p1_attack;62:p1_attack;76:p1_attack;91:p1_attack"
kv a_e_spaet anlauf_c CC_FRAMES=330 CC_IN="40:p1_attack;69:p1_attack;98:p1_attack;128:p1_attack"
kv a_e_links anlauf_c CC_FRAMES=340 CC_IN="41-46:p1_right;58:p1_left+p1_attack;100-158:p1_left;245:p1_attack"
# Kettengrenze ohne Luecke: Druck h+19/h+20 (Stufe 2), h+19 (Stufe 3)
kv k_w_19 anlauf_b CC_FRAMES=120 CC_IN="44:p1_attack;65:p1_attack"
kv k_w_20 anlauf_b CC_FRAMES=120 CC_IN="44:p1_attack;66:p1_attack"
kv k_e_20 anlauf_c CC_FRAMES=120 CC_IN="43:p1_attack;65:p1_attack"
kv k_e_s3_19 anlauf_c CC_FRAMES=140 CC_IN="43:p1_attack;59:p1_attack;81:p1_attack"
# C: zwei Gegner (WOOKY Slot 16 bei dx 55, EDDY Slot 17 bei dx 47, ohne Eingriff)
kv c_zwei_a anlauf_c CC_FRAMES=260 CC_IN="2-15:p1_right;187:p1_attack"
kv c_zwei_b anlauf_c CC_FRAMES=300 CC_IN="2-15:p1_right;240:p1_attack"
kv c_kette_a anlauf_c CC_FRAMES=260 CC_IN="2-15:p1_right;187:p1_attack;204:p1_attack;219:p1_attack"
kv c_kette_b anlauf_c CC_FRAMES=320 CC_IN="2-15:p1_right;240:p1_attack;259:p1_attack;281:p1_attack"
kv c_fenster27 anlauf_c CC_FRAMES=260 CC_IN="2-15:p1_right;187:p1_attack;216:p1_attack"
kv c_fenster28 anlauf_c CC_FRAMES=300 CC_IN="2-15:p1_right;240:p1_attack;270:p1_attack"
# B: Umwerfen (Tritt des EDDY in a_e_kette/a_e_spaet/a_e_frueh)
kv b_tritt_w anlauf_b CC_FRAMES=330 CC_LP=18:35 CC_IN="43:p1_attack;61:p1_attack;81:p1_attack;100:p1_attack"
kv b_sprung_w anlauf CC_FRAMES=260 CC_IN="45:p1_jump;49:p1_attack"
kv b_sprungr_w anlauf_b CC_FRAMES=260 CC_IN="41:p1_jump+p1_right;47:p1_attack"
kv b_sprung_e anlauf_c CC_FRAMES=260 CC_IN="50:p1_jump;53:p1_attack"
kv b_sprungr_e anlauf_c CC_FRAMES=260 CC_IN="44:p1_jump+p1_right;47:p1_attack"
kv b_knie_w anlauf CC_FRAMES=300 CC_IN="44-48:p1_right;52:p1_attack;72:p1_attack;92:p1_attack"
kv b_knie_wb anlauf_b CC_FRAMES=300 CC_IN="47-51:p1_right;55:p1_attack;73:p1_attack;95:p1_attack"
kv b_knie_e anlauf_c CC_FRAMES=300 CC_IN="41-46:p1_right;49:p1_attack;68:p1_attack;88:p1_attack"
kv b_wurf_w anlauf CC_FRAMES=260 CC_IN="44-48:p1_right;60:p1_right+p1_attack"
kv b_wurf_wr anlauf_b CC_FRAMES=260 CC_IN="47-51:p1_right;65:p1_left+p1_attack"
kv b_wurf_e anlauf_c CC_FRAMES=300 CC_IN="41-46:p1_right;55:p1_right+p1_attack"
kv b_wurf_er anlauf_c CC_FRAMES=300 CC_IN="41-46:p1_right;58:p1_left+p1_attack"
# B: Schlaege um G ohne Eingriff (Figur geht bzw. springt zum liegenden Gegner)
SPR="41:p1_jump+p1_right;47:p1_attack;104-106:p1_right"
kv bp_w1 anlauf_b CC_FRAMES=200 CC_IN="$SPR;107:p1_attack;115:p1_attack;123:p1_attack;131:p1_attack;139:p1_attack;147:p1_attack;155:p1_attack"
kv bp_w2 anlauf_b CC_FRAMES=200 CC_IN="$SPR;111:p1_attack;119:p1_attack;127:p1_attack;135:p1_attack;143:p1_attack;151:p1_attack;159:p1_attack"
TRE="42:p1_attack;66:p1_attack;90:p1_attack;114:p1_attack;148:p1_jump+p1_right"
kv bp_tritt_e1 anlauf_c CC_FRAMES=240 CC_IN="$TRE;196-203:p1_right;205:p1_attack"
kv bp_tritt_e2 anlauf_c CC_FRAMES=240 CC_IN="$TRE;196-202:p1_right;204:p1_attack"
kv bp_wurf_e3 anlauf_c CC_FRAMES=220 CC_IN="41-46:p1_right;55:p1_right+p1_attack;93-165:p1_right;182:p1_attack"
kv bp_wurf_e4 anlauf_c CC_FRAMES=220 CC_IN="41-46:p1_right;55:p1_right+p1_attack;93-165:p1_right;181:p1_attack"
kv bp_wurf_e6 anlauf_c CC_FRAMES=220 CC_IN="41-46:p1_right;58:p1_left+p1_attack;100-178:p1_left;184:p1_attack"
kv bp_wurf_e1 anlauf_c CC_FRAMES=220 CC_IN="41-46:p1_right;58:p1_left+p1_attack;100-170:p1_left;184:p1_attack"
kv bp_wurf_w1 anlauf_b CC_FRAMES=200 CC_IN="47-51:p1_right;65:p1_left+p1_attack;103-165:p1_left;167:p1_attack"
# B: Griff am liegenden Gegner
kv bg_w1 anlauf_b CC_FRAMES=200 CC_IN="41:p1_jump+p1_right;47:p1_attack;120-175:p1_right"
kv bg_w2 anlauf_b CC_FRAMES=200 CC_IN="41:p1_jump+p1_right;47:p1_attack;128-175:p1_right"
kv bg_wknie anlauf CC_FRAMES=240 CC_IN="44-48:p1_right;52:p1_attack;72:p1_attack;92:p1_attack;120-215:p1_right"
kv bg_ewurf1 anlauf_c CC_FRAMES=230 CC_IN="41-46:p1_right;55:p1_right+p1_attack;93-200:p1_right"
kv bg_ewurf2 anlauf_c CC_FRAMES=230 CC_IN="41-46:p1_right;55:p1_right+p1_attack;97-200:p1_right"
# D: Tod ohne Eingriff (LP durch Vorschaeden gesenkt)
DW="44:p1_attack;60:p1_attack;76:p1_attack;120:p1_attack"
kv d_s1_w anlauf CC_FRAMES=260 CC_IN="$DW;152:p1_attack"
kv d_s1_w_pa anlauf CC_FRAMES=260 CC_IN="$DW;152:p1_attack;166:p1_attack"
kv d_gleich_ref anlauf CC_FRAMES=220 CC_IN="$DW"
kv d_gleich_w anlauf CC_FRAMES=280 CC_IN="$DW;169:p1_attack"
kv d_s2_w anlauf CC_FRAMES=260 CC_IN="$DW;136:p1_attack"
kv d_s2_wb anlauf_b CC_FRAMES=260 CC_IN="43:p1_attack;59:p1_attack;75:p1_attack;115:p1_attack;133:p1_attack"
kv d_sprung_w anlauf_b CC_FRAMES=300 CC_IN="43:p1_attack;59:p1_attack;75:p1_attack;93:p1_jump;97:p1_attack"
DS="43:p1_attack;59:p1_attack;75:p1_attack;93:p1_jump+p1_right;97:p1_attack;150-152:p1_right"
kv d_probe_w1 anlauf_b CC_FRAMES=200 CC_IN="$DS;154:p1_attack;162:p1_attack;170:p1_attack;178:p1_attack"
kv d_probe_w2 anlauf_b CC_FRAMES=200 CC_IN="$DS;158:p1_attack;166:p1_attack;174:p1_attack"
kv d_wurf_w anlauf CC_FRAMES=260 CC_IN="44-48:p1_right;52:p1_attack;72:p1_right+p1_attack"
DE="42:p1_attack;58:p1_attack;74:p1_attack;110:p1_attack"
kv d_s1_e anlauf_c CC_FRAMES=400 CC_IN="$DE;126:p1_attack;142:p1_attack;178:p1_attack;212:p1_attack;246:p1_attack"
kv d_s2_e anlauf_c CC_FRAMES=360 CC_IN="$DE;126:p1_attack;142:p1_attack;178:p1_attack;195:p1_attack"
kv d_s3_e anlauf_c CC_FRAMES=400 CC_IN="$DE;144:p1_attack;178:p1_attack;212:p1_attack;228:p1_attack;244:p1_attack"
kv d_tritt_e anlauf_c CC_FRAMES=360 CC_IN="42:p1_attack;76:p1_attack;110:p1_attack;144:p1_attack;160:p1_attack;176:p1_attack;193:p1_attack"
laufen
python3 scripts/messen_reaktion_v.py belege --raw $raw >$outv
[ $nur = 1 ] || rm -f $raw/reaktion_v_*
wc -l $outv
