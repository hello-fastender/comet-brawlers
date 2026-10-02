#!/usr/bin/env bash
# Spezialangriff (Angriff und Sprung im selben Frame, Aktion P+0x0A = 0x14):
# MAME-Laeufe mit scenarios/spezial_probe.lua, Auswertung mit messen_a5.py
# spezial und messen_spezial.py (Zusammenfassung) nach logs/spezial.csv;
# loescht danach die eigenen Rohabzuege. Voraussetzung: Savestates ingame,
# kontakt, kontakt_b, held0, held2, held3 (laeufe_a5.sh, stage_start.lua).
# Legt selbst an: spezial_h0..h3 (Figur k, WOOKY 46 px vor ihr wie in
# kontakt; h1 ab ingame zum Vergleich) und spezial_drei, spezial_drei_h0/h2/h3
# (drei aktive Gegner in Slot 16, 17, 18). P = Frame des Drucks.
# Laufnamen: spezial_<gruppe>_..., Gruppen: aus (Ausloesung), ab (Ablauf),
# sch (Schutz), sd (Schaden, mehrere Gegner, Flug), rx/rz/rh (Reichweite x,
# Tiefe, Hoehe), fen (aktive Frames), lp (Kosten), h<k> (andere Figuren).
# EINGRIFF in rx, rz, rh, fen, sd (ausser natuerlichen Laeufen), sch_ende*,
# lp (ausser lp_nat), h<k>_x/z/drei/lp: Gegnerposition bzw. eigene LP, siehe
# spezial_probe.lua. Dauer: ~10-15 min (4 parallele Laeufe).
# Danach Block "Gegenpruefung V4": eigene Laeufe spezial_v_* (scenarios/
# spezial_v_frei.lua) nach logs/spezial_v.csv, Savestates spezial_v_*.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/spezial_probe.lua
out=logs/spezial.csv
jobs=$(mktemp)
fehler=$(mktemp)
trap 'rm -f "$jobs" "$fehler"' EXIT
df -h . | tail -1 >&2

# s NAME SAVESTATE VAR=WERT ...: Lauf vormerken; par: vorgemerkte Laeufe ausfuehren
s() {
	local name=$1 state=$2; shift 2
	printf 'env CC_KLEIN=1 CC_NAME=spezial_%s' "$name" >>"$jobs"
	printf ' %q' "$@" >>"$jobs"
	printf ' scripts/run.sh %q %q\n' "$sc" "$state" >>"$jobs"
}
par() {
	local n=0 line
	while IFS= read -r line; do
		{ bash -c "$line" >/dev/null 2>&1 || echo "$line" >>"$fehler"; } &
		n=$((n + 1))
		if [ $n -ge 4 ]; then wait -n || true; n=$((n - 1)); fi
	done <"$jobs"
	wait
	: >"$jobs"
	if [ -s "$fehler" ]; then echo "Fehler in:" >&2; cat "$fehler" >&2; exit 1; fi
}
SA="p1_jump+p1_attack"

# 0) Savestates
for k in 0 2 3; do s mk_h$k held$k CC_IN="421-540:p1_right;541-556:p1_up" CC_FRAMES=612 CC_SAVE=612:spezial_h$k; done
s mk_h1 ingame CC_IN="421-540:p1_right;541-556:p1_up" CC_FRAMES=612 CC_SAVE=612:spezial_h1
s mk_drei kontakt CC_IN="2-280:p1_right" CC_FRAMES=286 CC_SAVE=286:spezial_drei
# dritte Messung: wie anlauf (Frame 570 des Weges zu kontakt, WOOKY laeuft heran), Ginzu und Baby Head
for k in 2 3; do s mk_h${k}_anlauf held$k CC_IN="421-540:p1_right" CC_FRAMES=570 CC_SAVE=570:spezial_h${k}_anlauf; done
par
s mk_drei_h0 spezial_h0 CC_IN="2-280:p1_right" CC_FRAMES=286 CC_SAVE=286:spezial_drei_h0
for k in 2 3; do s mk_drei_h$k spezial_h$k CC_IN="2-360:p1_right" CC_FRAMES=366 CC_SAVE=366:spezial_drei_h$k; done
par

# 1) Ausloesung (Captain Commando, ohne Eingriff)
s aus_gleich_k kontakt CC_IN="3:$SA" CC_FRAMES=110
s aus_gleich_kb kontakt_b CC_IN="5:$SA" CC_FRAMES=110
s aus_1frame_k kontakt CC_IN="4-4:$SA" CC_FRAMES=80
s aus_a_dann_j_k kontakt CC_IN="3:p1_attack;4:p1_jump" CC_FRAMES=40
s aus_j_dann_a_k kontakt CC_IN="3:p1_jump;4:p1_attack" CC_FRAMES=40
s aus_a_dann_j_i ingame CC_IN="6:p1_attack;7:p1_jump" CC_FRAMES=40
s aus_j_dann_a_i ingame CC_IN="6:p1_jump;7:p1_attack" CC_FRAMES=40
s aus_a_gehalten ingame CC_IN="3-40:p1_attack;30:p1_jump" CC_FRAMES=90
s aus_j_gehalten ingame CC_IN="3-70:p1_jump;60:p1_attack" CC_FRAMES=90
s aus_beide_gehalten ingame CC_IN="3-100:$SA" CC_FRAMES=110
s aus_lauf_k kontakt CC_IN="2-20:p1_left;12:$SA" CC_FRAMES=90
s aus_lauf_i ingame CC_IN="2-30:p1_right;15:$SA" CC_FRAMES=80
s aus_schlag5 ingame CC_IN="3:p1_attack;5:$SA" CC_FRAMES=70
s aus_schlag10 ingame CC_IN="3:p1_attack;10:$SA" CC_FRAMES=70
s aus_schlag11 ingame CC_IN="3:p1_attack;11:$SA" CC_FRAMES=70
# Landung: Sprung in J, Aufsetzen J+42, Landung bis J+47, frei ab J+48
for t in 44 45 49 50 51; do s aus_land_a$t ingame CC_IN="3:p1_jump;$t:$SA" CC_FRAMES=$((t + 60)); done
for t in 47 48 52 53 54; do s aus_land_b$t ingame CC_IN="6:p1_jump;$t:$SA" CC_FRAMES=$((t + 60)); done
s aus_land_nurj ingame CC_IN="3:p1_jump;46:p1_jump" CC_FRAMES=100
# eigene Trefferreaktion: WOOKY trifft in 28 und 90 (kontakt), EDDY in 44 (kontakt_b)
for t in 29 35 36 40; do s aus_reakt_a$t kontakt CC_IN="$t:$SA" CC_FRAMES=$((t + 70)); done
for t in 97 98; do s aus_reakt_b$t kontakt CC_IN="$t:$SA" CC_FRAMES=$((t + 70)); done
for t in 51 52; do s aus_reakt_c$t kontakt_b CC_IN="$t:$SA" CC_FRAMES=$((t + 70)); done

# 2) Ablauf und Handlungsfaehigkeit
s ab_leer_r ingame CC_IN="3:$SA;4-80:p1_right" CC_FRAMES=80
s ab_leer_h ingame CC_IN="5:$SA;6-80:p1_up" CC_FRAMES=80
s ab_treffer_l kontakt CC_IN="3:$SA;4-90:p1_left" CC_FRAMES=90
s ab_angriff53 ingame CC_IN="3:$SA;53:p1_attack" CC_FRAMES=80
s ab_angriff54 ingame CC_IN="3:$SA;54:p1_attack" CC_FRAMES=80
s ab_b_angriff55 ingame CC_IN="5:$SA;55:p1_attack" CC_FRAMES=80
s ab_b_angriff56 ingame CC_IN="5:$SA;56:p1_attack" CC_FRAMES=80
s ab_sprung54 ingame CC_IN="3:$SA;54:p1_jump" CC_FRAMES=110
s ab_wieder53 ingame CC_IN="3:$SA;53:$SA" CC_FRAMES=90
s ab_wieder54 ingame CC_IN="3:$SA;54:$SA" CC_FRAMES=140

# 3) Schutz: Gegnerangriff am Anfang (ohne Eingriff) und am Ende (EINGRIFF:
#    Gegner waehrend der aktiven Frames P+7..P+43 in 70 px Hoehe, danach am Boden)
for p in 25 26 27 28; do s sch_anf_a$p kontakt CC_IN="$p:$SA" CC_FRAMES=100; done
for p in 41 42 43 44; do s sch_anf_b$p kontakt_b CC_IN="$p:$SA" CC_FRAMES=110; done
for p in 14 15 16 17; do
	s sch_ende_a$p kontakt CC_IN="$p:$SA" CC_FRAMES=130 CC_SLOTS=18 CC_DH=70 CC_VON=$((p + 7)) CC_BIS=$((p + 43))
done
for p in 52 53 54 55; do
	s sch_ende_b$p kontakt_b CC_IN="$p:$SA" CC_FRAMES=160 CC_SLOTS=17 CC_DH=70 CC_VON=$((p + 7)) CC_BIS=$((p + 43)) CC_WEG=16
done
s sch_kontrolle_a kontakt CC_FRAMES=160
s sch_kontrolle_b kontakt_b CC_FRAMES=200
s sch_kontrolle_hoehe kontakt CC_FRAMES=120 CC_SLOTS=18 CC_DH=70 CC_VON=50 CC_BIS=79

# 4) Schaden, mehrere Gegner, Flug (EINGRIFF: Positionen)
s sd_zwei_gleich spezial_drei CC_IN="3:$SA" CC_FRAMES=90 CC_SLOTS=16,17 CC_DX=20,-20 CC_DZ=0
s sd_zwei_stufen spezial_drei CC_IN="3:$SA" CC_FRAMES=90 CC_SLOTS=16,17 CC_DX=20,-50 CC_DZ=0
s sd_drei_gleich spezial_drei CC_IN="3:$SA" CC_FRAMES=90 CC_SLOTS=16,17,18 CC_DX=10,-20,30 CC_DZ=0
s sd_drei_stufen spezial_drei CC_IN="3:$SA" CC_FRAMES=100 CC_SLOTS=16,17,18 CC_DX=20,-50,65 CC_DZ=0
s sd_einmal kontakt CC_IN="3:$SA" CC_FRAMES=80 CC_SLOTS=18 CC_DX=20 CC_DZ=0
s sd_flug_vorn kontakt CC_IN="3:$SA" CC_FRAMES=110 CC_SLOTS=18 CC_DX=30 CC_DZ=0 CC_BIS=11
s sd_flug_hinten kontakt CC_IN="3:$SA" CC_FRAMES=110 CC_SLOTS=18 CC_DX=-30 CC_DZ=0 CC_BIS=11
# Kosten auch bei Treffern auf Gegenstaende: alle Gegner beiseite, eine Kiste (Slot 46) in der Naehe
s sd_kiste_h2 spezial_drei_h2 CC_IN="3:$SA" CC_FRAMES=80 CC_WEG=16,17,18
s sd_kiste_h3 spezial_drei_h3 CC_IN="5:$SA" CC_FRAMES=80 CC_WEG=16,17,18
s sd_flug_b_hinten kontakt_b CC_IN="6:$SA" CC_FRAMES=110 CC_SLOTS=17 CC_DX=-30 CC_DZ=0 CC_BIS=14 CC_WEG=16

# 5) Reichweite x (EINGRIFF: Gegner ab Frame 2 fest bei dx, Tiefe 0)
# (der WOOKY geht im Frame bis 2 px: vor der Figur ab dx ~78 auf sie zu, hinter ihr weg; daher
# die versetzten Werte)
for d in 42 43 44 45 58 59 60 61 74 75 76 77 78 92 93 94 95 96 108 109 110 111 112 124 125 126 127 128 \
	-39 -40 -41 -42 -43 -55 -56 -57 -58 -59 -71 -72 -73 -74 -75 -87 -88 -89 -90 -91 -103 -104 -105 -106 -107 -119 -120 -121 -122 -123; do
	s rx_a_${d/-/m} kontakt CC_IN="3:$SA" CC_FRAMES=50 CC_SLOTS=18 CC_DX=$d CC_DZ=0
done
for d in 43 44 45 46 47 59 60 61 62 63 75 76 77 78 79 91 92 93 94 95 107 108 109 110 111 123 124 125 126 127 \
	-40 -41 -42 -43 -44 -56 -57 -58 -59 -60 -72 -73 -74 -75 -76 -88 -89 -90 -91 -92 -104 -105 -106 -107 -108 -120 -121 -122 -123 -124; do
	s rx_b_${d/-/m} kontakt_b CC_IN="6:$SA" CC_FRAMES=53 CC_SLOTS=17 CC_DX=$d CC_DZ=0 CC_WEG=16
done
# Tiefe: Figur zuerst 30 Frames nach unten (Platz nach hinten), P = 35
for d in 20:-31 20:-30 20:-29 20:-28 20:28 20:29 20:30 20:31 -60:-30 -60:-28 -60:28 -60:30 100:-30 100:-28 100:28 100:30; do
	x=${d%%:*}; z=${d##*:}
	s rz_a_x${x/-/m}_z${z/-/m} kontakt CC_IN="2-31:p1_down;35:$SA" CC_FRAMES=82 CC_SLOTS=18 CC_DX=$x CC_DZ=$z
done
for z in -30 -29 -28 28 29 30; do
	s rz_b_x20_z${z/-/m} kontakt_b CC_IN="2-31:p1_down;35:$SA" CC_FRAMES=82 CC_SLOTS=17 CC_DX=20 CC_DZ=$z CC_WEG=16
done
# Hoehe des Gegners (Hoehe vor jedem Frame gesetzt, gewertet am Frame-Ende)
for h in 48 50 52 54 56; do s rh_a_x20_h$h kontakt CC_IN="3:$SA" CC_FRAMES=50 CC_SLOTS=18 CC_DX=20 CC_DZ=0 CC_DH=$h; done
for h in 50 54 58 62 66; do s rh_a_x100_h$h kontakt CC_IN="3:$SA" CC_FRAMES=50 CC_SLOTS=18 CC_DX=100 CC_DZ=0 CC_DH=$h; done
for h in 50 52 54; do s rh_b_x20_h$h kontakt_b CC_IN="6:$SA" CC_FRAMES=53 CC_SLOTS=17 CC_DX=20 CC_DZ=0 CC_DH=$h CC_WEG=16; done

# 6) Aktive Frames: Gegner nur im Frame T bei dx 20 (davor und danach 200 px entfernt)
for r in 6 7 8 14 20 26 32 38 43 44 45; do
	t=$((3 + r)); s fen_a_p$r kontakt CC_IN="3:$SA" CC_FRAMES=60 CC_SLOTS=18 CC_DX=20 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
done
for r in 7 8 43 44; do
	t=$((6 + r)); s fen_b_p$r kontakt_b CC_IN="6:$SA" CC_FRAMES=63 CC_SLOTS=17 CC_DX=20 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t CC_WEG=16
done

# 7) Kosten (EINGRIFF: LP der Figur in Frame 2 gesetzt; lp_nat ohne Eingriff)
for lp in 10 9 8 1 0; do s lp_a$lp kontakt CC_IN="5:$SA" CC_FRAMES=100 CC_LP=$lp; done
for lp in 9 4; do s lp_b$lp kontakt_b CC_IN="5:$SA" CC_FRAMES=100 CC_LP=$lp; done
s lp_leer5 ingame CC_IN="5:$SA" CC_FRAMES=70 CC_LP=5
s lp_leer0 ingame CC_IN="5:$SA" CC_FRAMES=70 CC_LP=0
IN=""; for f in $(seq 3 75 1300); do IN="$IN$f:$SA;"; done
s lp_nat spezial_drei CC_IN="$IN" CC_FRAMES=1300

# 8) Andere Figuren (k = 0 Mack, 2 Ginzu, 3 Baby Head; 1 Captain zum Vergleich)
for k in 0 1 2 3; do
	s h${k}_kontakt spezial_h$k CC_IN="3:$SA" CC_FRAMES=100
	[ $k = 1 ] && continue
	s h${k}_leer held$k CC_IN="3:$SA;4-90:p1_right" CC_FRAMES=100
	s h${k}_lp5 spezial_h$k CC_IN="3:$SA" CC_FRAMES=100 CC_LP=5
	s h${k}_anf26 spezial_h$k CC_IN="26:$SA" CC_FRAMES=110
	if [ $k = 0 ]; then
		xs="-40 0 40 80 88 90 92 94 96 98 -84 -86 -88 -90 -92 -94 -96"; drei="20,-50,65"
	else
		xs="-40 0 20 40 60 80 100 120 136 138 140 142 144 -60 -62 -64 -66 -70 -72 -74 -76"; drei="100,40,-40"
	fi
	for d in $xs; do s h${k}_x_${d/-/m} spezial_h$k CC_IN="3:$SA" CC_FRAMES=70 CC_SLOTS=18 CC_DX=$d CC_DZ=0; done
	zx=20; zs="-32 -30 -29 -28 28 29 30 32"
	[ $k != 0 ] && zx=100 && zs="-44 -40 -36 -32 -28 28 32 36 40 44"
	for z in $zs; do
		s h${k}_z_${z/-/m} spezial_h$k CC_IN="2-31:p1_down;35:$SA" CC_FRAMES=100 CC_SLOTS=18 CC_DX=$zx CC_DZ=$z
	done
	s h${k}_drei spezial_drei_h$k CC_IN="3:$SA" CC_FRAMES=110 CC_SLOTS=16,17,18 CC_DX=$drei CC_DZ=0
	# Gegenlauf x: Druck in Frame 10 statt 3, Tiefe +4 statt 0 (in spezial_drei_h<k> fehlen Ginzu und
	# Baby Head Objekt-Slots fuer die Explosionen, weil zerschlagene Kisten sie belegen)
	if [ $k = 0 ]; then xs="92 94 96 98 -90 -92 -94 -96"; else xs="136 138 140 142 144 -70 -72 -74 -76"; fi
	for d in $xs; do s h${k}_xb_${d/-/m} spezial_h$k CC_IN="10:$SA" CC_FRAMES=80 CC_SLOTS=18 CC_DX=$d CC_DZ=4; done
done

# 9) Dritte Messung zu den Abweichungen der Gegenpruefung V4 (Laeufe d3_*), mit Varianten,
#    die weder M4 noch V4 genutzt haben
# a) WOOKY Stufe 3 vorn: anderer WOOKY (spezial_drei, Slot 16, P=8) und kontakt mit P=14
#    (Bild 7 = P+20..P+25 liegt dann nach seinem Ausholen in Frame 28); EINGRIFF Lage
for d in 73 74 75 76 77 78 79 80; do
	s d3_rx_s16_$d spezial_drei CC_IN="8:$SA" CC_FRAMES=55 CC_SLOTS=16 CC_DX=$d CC_DZ=0 CC_WEG=17,18
	s d3_rx_k14_$d kontakt CC_IN="14:$SA" CC_FRAMES=60 CC_SLOTS=18 CC_DX=$d CC_DZ=0
done
# b) Bewegung waehrend des Spezialangriffs (Mack; Ginzu, Baby Head zum Vergleich): ab spezial_h<k>,
#    WOOKY beiseite (EINGRIFF), Druck in Frame 10, Richtungen links, runter, rechts+runter, vorher gehalten
for k in 0 2 3; do
	s d3_lauf_${k}_l spezial_h$k CC_IN="10:$SA;15-90:p1_left" CC_FRAMES=100 CC_WEG=18
	s d3_lauf_${k}_u spezial_h$k CC_IN="10:$SA;11-90:p1_down" CC_FRAMES=100 CC_WEG=18
	s d3_lauf_${k}_ru spezial_h$k CC_IN="10:$SA;30-90:p1_right+p1_down" CC_FRAMES=100 CC_WEG=18
	s d3_lauf_${k}_vor spezial_h$k CC_IN="2-90:p1_left;10:$SA" CC_FRAMES=100 CC_WEG=18
done
# c) Explosionen von Ginzu (P=8) und Baby Head (P=12) ab spezial_h<k>_anlauf (WOOKY geht), 1-px-Schritte,
#    EINGRIFF Lage; dazu Tiefe 16, 29, -16 (Figur vorher 30 Frames nach unten)
for k in 2 3; do
	p=8; [ $k = 3 ] && p=12
	for d in 137 138 139 140 141 60 61 62 63 64 20 21 22 23 24 -2 -1 0 1 2 -46 -47 -48 -49 -50 -51 -52 -53 -54 -55 -72 -73 -74 -75 -76; do
		s d3_zone_h${k}_${d/-/m} spezial_h${k}_anlauf CC_IN="$p:$SA" CC_FRAMES=$((p + 50)) CC_SLOTS=18 CC_DX=$d CC_DZ=0
	done
done
for c in z16:36 z16:38 z16:40 z16:42 z29:-4 z29:0 z29:4 zm16:46 zm16:48 zm16:50; do
	r=${c%%:*}; d=${c##*:}; z=${r#z}; z=${z/m/-}
	s d3_zone_h2_${r}_${d/-/m} spezial_h2_anlauf CC_IN="2-31:p1_down;35:$SA" CC_FRAMES=90 CC_SLOTS=18 CC_DX=$d CC_DZ=$z
done
par

runs=$(ls logs/raw/spezial_*_ram.bin | sed 's/_ram.bin$//' | grep -v '_mk_' | sort -V)
python3 scripts/messen_a5.py spezial $runs >logs/spezial_ev.tmp
python3 scripts/messen_a5.py spezial --frames $(echo "$runs" | grep -E '_(rx|rz|rh|fen|h[0-3]_x|h[0-3]_xb|h[0-3]_z|d3_rx|d3_zone)_') >logs/spezial_fr.tmp
{
	echo "# Spezialangriff (Angriff + Sprung im selben Frame P). Erzeugt von scripts/belege_spezial.sh."
	echo "# dx/dz: Gegner minus Figur, ganzzahlig am Frame-Ende; hoehe: Hoehe des Gegners (bei lp_figur: LP nachher)."
	echo "# EINGRIFF: rx/rz/rh/fen/sd/h<k>_x/xb/z/drei = Gegnerposition, sch_ende* = Gegnerhoehe, lp_* = eigene LP"
	echo "# (ausser lp_nat). Alle anderen Laeufe ohne Eingriff."
	echo "# Zusammenfassung"
	python3 scripts/messen_spezial.py zusammenfassung-spezial logs/spezial_ev.tmp logs/spezial_fr.tmp
	echo "# Bildweise Lage der Gegner in den Reichweite-Laeufen (messen_a5.py spezial --frames, verdichtet)"
	python3 scripts/messen_spezial.py verdichtet logs/spezial_fr.tmp
	echo "# Ereignisse aller Laeufe (messen_a5.py spezial)"
	cat logs/spezial_ev.tmp
} >$out
# ---------------------------------------------------------------------------
# Gegenpruefung V4 (Praefix spezial_v): eigene Laeufe mit anderen Savestates,
# Startframes, Gegnern, Positionen und Reihenfolgen als oben. Szenario
# scenarios/spezial_v_frei.lua (nur Watch-Protokoll, kein RAM-Abzug),
# Auswertung messen_spezial_v.py nach logs/spezial_v.csv (~3 min).
# Legt an: spezial_v_viele (ab ingame, rechts 2-330, Frame 840: fuenf Gegner
# um die Figur, Blick links), spezial_v_h0/h2/h3 (held<k>, rechts 2-121,
# Frame 130: WOOKY laeuft aus 149 px heran) und spezial_v_viele0/2/3.
# EINGRIFF (siehe spezial_v_frei.lua): CC_SETZE (Gegner- bzw. Behaelterlage)
# in rx, fen, voll, rz, rg, flug_*_hinten, beh, sch, f*_anf*, g*, gz*;
# CC_P_LP (eigene LP) in lp0/lp2/lp5/lp9/lp12, f*_lp5; CC_POKE (Timer FFAA69)
# in sch_*_t*. Alle anderen spezial_v-Laeufe ohne Eingriff.
vsc=scripts/scenarios/spezial_v_frei.lua
v() {
	local name=$1 state=$2; shift 2
	printf 'env CC_NAME=spezial_v_%s' "$name" >>"$jobs"
	printf ' %q' "$@" >>"$jobs"
	printf ' scripts/run.sh %q %q\n' "$vsc" "$state" >>"$jobs"
}
AJ=p1_attack+p1_jump
v sv_viele ingame CC_IN=2-330:p1_right CC_FRAMES=840 CC_SAVE=840:spezial_v_viele
for k in 0 2 3; do
	v sv_h$k held$k CC_IN=2-121:p1_right CC_FRAMES=130 CC_SAVE=130:spezial_v_h$k
	v sv_viele$k held$k CC_IN=2-330:p1_right CC_FRAMES=840 CC_SAVE=840:spezial_v_viele$k
done
par
# Ausloesung, zweite Taste, gehaltene Tasten, aus dem Lauf
v aus_s2 stage2 CC_IN=17:$AJ CC_FRAMES=100
v aus_s2_1f stage2 CC_IN=23-23:$AJ CC_FRAMES=100
v aus_c_1f anlauf_c CC_IN=9-9:$AJ CC_FRAMES=100
v aj_s2 stage2 "CC_IN=12-12:p1_attack;13-13:p1_jump" CC_FRAMES=100
v ja_s2 stage2 "CC_IN=12-12:p1_jump;13-13:p1_attack" CC_FRAMES=100
v aj_s3 stage3 "CC_IN=31-33:p1_attack;32-33:p1_jump" CC_FRAMES=110
v ja_s3 stage3 "CC_IN=31-33:p1_jump;32-33:p1_attack" CC_FRAMES=110
v hA_s2 stage2 "CC_IN=10-70:p1_attack;40-41:p1_jump" CC_FRAMES=110
v hJ_s2 stage2 "CC_IN=10-90:p1_jump;75-76:p1_attack" CC_FRAMES=110
v hAJ_s2 stage2 CC_IN=15-160:$AJ CC_FRAMES=180
v lauf_rh stage2 "CC_IN=5-60:p1_right+p1_up;30:$AJ" CC_FRAMES=100
v lauf_d stage3 "CC_IN=5-20:p1_right;21-60:p1_down;44:$AJ" CC_FRAMES=110
v lauf_l anlauf_c "CC_IN=3-50:p1_left;25:$AJ" CC_FRAMES=100
# Landung: Vorwaertssprung J=15 (stage2) bzw. Standsprung J=22 (stage3), Druck in J+41..J+48
for t in 41 42 46 47 48; do
	v land_v$t stage2 "CC_IN=15-16:p1_jump+p1_right;$((15 + t)):$AJ" CC_FRAMES=130
	v land_n$t stage3 "CC_IN=22-24:p1_jump;$((22 + t)):$AJ" CC_FRAMES=140
done
# eigene Trefferreaktion H: EDDY H=68 (anlauf_c), WOOKY H=70 (anlauf), EDDY H=75 (tiefe_b)
for t in 69 72 75 76; do v reakt_c$t anlauf_c CC_IN=$t:$AJ CC_FRAMES=150; done
for t in 77 78; do v reakt_a$t anlauf CC_IN=$t:$AJ CC_FRAMES=150; done
for t in 82 83; do v reakt_t$t tiefe_b CC_IN=$t:$AJ CC_FRAMES=150; done
v htreff_c68 anlauf_c CC_IN=68:$AJ CC_FRAMES=150
v htreff_t75 tiefe_b CC_IN=75:$AJ CC_FRAMES=150
# Schutz am Anfang: Gegnerangriff in P+1..P+3
for t in 65 66 67; do v anf_c$t anlauf_c CC_IN=$t:$AJ CC_FRAMES=150; done
v anf_t74 tiefe_b CC_IN=74:$AJ CC_FRAMES=150
for t in 68 69; do v anf_a$t anlauf CC_IN=$t:$AJ CC_FRAMES=150; done
v anf_b67 anlauf_b CC_IN=67:$AJ CC_FRAMES=150
# Dauer ohne Treffer und Handlungsfaehigkeit (P=20 in stage2, P=33 in stage3)
v ab_leer_s2 stage2 CC_IN=20:$AJ CC_FRAMES=120
v ab_a70 stage2 "CC_IN=20:$AJ;70:p1_attack" CC_FRAMES=120
v ab_a71 stage2 "CC_IN=20:$AJ;71:p1_attack" CC_FRAMES=120
v ab_j70 stage2 "CC_IN=20:$AJ;70:p1_jump" CC_FRAMES=140
v ab_j71 stage2 "CC_IN=20:$AJ;71:p1_jump" CC_FRAMES=140
v ab_aj71 stage2 "CC_IN=20:$AJ;71:$AJ" CC_FRAMES=140
v ab_lauf_s2 stage2 "CC_IN=20:$AJ;40-100:p1_right" CC_FRAMES=120
v ab_s3_a83 stage3 "CC_IN=33:$AJ;83:p1_attack" CC_FRAMES=130
v ab_s3_a84 stage3 "CC_IN=33:$AJ;84:p1_attack" CC_FRAMES=130
v ab_s3_lauf stage3 "CC_IN=33:$AJ;50-120:p1_down" CC_FRAMES=130
v ab_treffer_lauf anlauf_c "CC_IN=11:$AJ;35-130:p1_left" CC_FRAMES=140
# LP: natuerlich ab spezial_v_viele (Spezialangriff alle 85 Frames), sonst EINGRIFF
IN=""; for f in $(seq 5 85 1299); do IN="$IN$f:$AJ;"; done
v lp_nat spezial_v_viele CC_IN="${IN%;}" CC_FRAMES=1300
v lp0_s2 stage2 CC_P_LP=2:0 CC_IN=20:$AJ CC_FRAMES=100
for lp in 9 5 12; do v lp${lp}_c anlauf_c CC_P_LP=2:$lp CC_IN=9:$AJ CC_FRAMES=100; done
v lp2_t tiefe_b CC_P_LP=2:2 "CC_IN=30:$AJ;140:$AJ" CC_FRAMES=400
# Mehrere Gegner, Dauer mit Treffern, Flug (natuerlich)
v mehr_t tiefe_b "CC_IN=2-6:p1_up;50:$AJ" CC_FRAMES=200
for p in 5 14 25; do v viele_p$p spezial_v_viele CC_IN=$p:$AJ CC_FRAMES=150; done
v flug_e_ueber anlauf_c "CC_IN=12-13:p1_jump+p1_right;60:$AJ" CC_FRAMES=200
v flug_w_ueber anlauf "CC_IN=12-13:p1_jump+p1_right;60:$AJ" CC_FRAMES=200
v flug_e_hinten anlauf_c CC_IN=5:$AJ CC_SETZE=17:-30:0:2:12 CC_FRAMES=200
v flug_w_hinten anlauf CC_IN=7:$AJ CC_SETZE=18:-25:8:2:14 CC_FRAMES=200
# Behaelter (Slot 43 der Stage 1) neben die Figur gesetzt
v beh_v60 ingame CC_SLOTS=20-59 CC_IN=5:$AJ CC_SETZE=43:60:0:2:20 CC_FRAMES=90
v beh_h30 ingame CC_SLOTS=20-59 CC_IN=8:$AJ CC_SETZE=43:-30:5:2:20 CC_FRAMES=90
# Schutzende: Gegner bis P+44 in Tiefe -30 (nicht treffbar), dann bei dx 46/47; Timer FFAA69 gehalten bzw. gesetzt
v sch_e_r45 anlauf_c CC_IN=5:$AJ "CC_SETZE=17:47:-30:2:49;17:47:0:50:160" CC_FRAMES=160
v sch_e_r45_t69 anlauf_c CC_IN=5:$AJ "CC_SETZE=17:47:-30:2:49;17:47:0:50:160" CC_POKE=76-85:FFAA69:20 CC_FRAMES=160
v sch_e_t5 anlauf_c CC_IN=5:$AJ "CC_SETZE=17:47:-30:2:49;17:47:0:50:160" CC_POKE=76-80:FFAA69:5 CC_FRAMES=160
v sch_w_r45 anlauf CC_IN=7:$AJ "CC_SETZE=18:46:-30:2:51;18:46:10:52:160" CC_FRAMES=160
v sch_w_r45_t69 anlauf CC_IN=7:$AJ "CC_SETZE=18:46:-30:2:51;18:46:10:52:160" CC_POKE=78-87:FFAA69:20 CC_FRAMES=160
# Reichweite x: Gegner ab Frame 2 fest bei dx (EDDY anlauf_c P=4 Tiefe 0, WOOKY anlauf P=6 Tiefe 5)
for g in e w; do
	if [ $g = e ]; then st=anlauf_c; sl=17; p=4; z=0; else st=anlauf; sl=18; p=6; z=5; fi
	for d in 43 44 $(seq 59 63) $(seq 75 79) $(seq 91 95) $(seq 107 111) $(seq 123 127); do
		v rx_${g}_v$d $st CC_IN=$p:$AJ CC_SETZE=$sl:$d:$z:2:$((p + 50)) CC_FRAMES=$((p + 55))
	done
	for d in 42 43 $(seq 55 59) $(seq 71 75) $(seq 87 91) $(seq 103 107) $(seq 119 123); do
		v rx_${g}_h$d $st CC_IN=$p:$AJ CC_SETZE=$sl:-$d:$z:2:$((p + 50)) CC_FRAMES=$((p + 55))
	done
	if [ $g = e ]; then
		for d in 124 125 126; do v rx_e_h$d $st CC_IN=$p:$AJ CC_SETZE=$sl:-$d:$z:2:$((p + 50)) CC_FRAMES=$((p + 55)); done
	fi
	# aktive Frames: dx -20 nur im Frame P+k, sonst +200
	for k in 7 8 43 44; do
		x=$((p + k))
		v fen_${g}_p$k $st CC_IN=$p:$AJ "CC_SETZE=$sl:200:$z:2:$((x - 1));$sl:-20:$z:$x:$x;$sl:200:$z:$((x + 1)):$((p + 50))" CC_FRAMES=$((p + 55))
	done
	v voll_${g}_v32 $st CC_IN=$p:$AJ "CC_SETZE=$sl:200:$z:2:$((p + 31));$sl:10:$z:$((p + 32)):$((p + 50))" CC_FRAMES=$((p + 55))
	v voll_${g}_h20 $st CC_IN=$p:$AJ "CC_SETZE=$sl:200:$z:2:$((p + 19));$sl:-15:$z:$((p + 20)):$((p + 50))" CC_FRAMES=$((p + 55))
	# Tiefe: minus ab Ausgangslage, plus mit Figur 30 Frames weiter unten (P=34)
	for dx in -30 100; do
		n=$([ $dx = -30 ] && echo h30 || echo v100)
		for zz in -28 -29; do v rz_${g}_${n}_m${zz#-} $st CC_IN=$p:$AJ CC_SETZE=$sl:$dx:$zz:2:$((p + 50)) CC_FRAMES=$((p + 55)); done
		for zz in 28 29; do v rz_${g}_${n}_u$zz $st "CC_IN=2-31:p1_down;34:$AJ" CC_SETZE=$sl:$dx:$zz:2:84 CC_FRAMES=89; done
	done
	# Gegner nach dem Umsetzen aus der Ferne in eigener Aktion 0x02 (WOOKY dann in P+32..P+37 nicht treffbar)
	v rg_${g}_x100_z0 $st "CC_IN=2-31:p1_down;34:$AJ" "CC_SETZE=$sl:200::2:34;$sl:100:0:35:84" CC_FRAMES=89
done
v rg_w_x100_z0_p6fern anlauf CC_IN=6:$AJ "CC_SETZE=18:200::2:6;18:100:0:7:56" CC_FRAMES=61
# Andere Figuren (k = 0 Mack, 2 Ginzu, 3 Baby Head)
for k in 0 2 3; do
	pk=$([ $k = 0 ] && echo 35 || echo 20)
	v f${k}_leer held$k CC_IN=17:$AJ CC_FRAMES=130
	v f${k}_lauf held$k "CC_IN=17:$AJ;42-120:p1_right" CC_FRAMES=130
	v f${k}_kontakt spezial_v_h$k CC_IN=$pk:$AJ CC_FRAMES=160
	v f${k}_kontakt_lauf spezial_v_h$k "CC_IN=$pk:$AJ;$((pk + 25))-$((pk + 110)):p1_left" CC_FRAMES=160
	v f${k}_viele spezial_v_viele$k CC_IN=5:$AJ CC_FRAMES=150
	v f${k}_lp5 spezial_v_h$k CC_P_LP=2:5 CC_IN=$pk:$AJ CC_FRAMES=120
	for p in 28 29; do v f${k}_anf$p spezial_v_h$k CC_IN=$p:$AJ CC_SETZE=18:46:10:5:$p CC_FRAMES=120; done
done
# Mack bewegt sich im Spezialangriff mit gehaltener Richtung (Richtung ab P+1 bzw. P+10)
v f0_lauf1 held0 "CC_IN=17:$AJ;18-120:p1_right" CC_FRAMES=130
v f0_lauf10 held0 "CC_IN=17:$AJ;27-120:p1_right" CC_FRAMES=130
# Reichweite und Trefferzeit der anderen Figuren: WOOKY ab Frame 2 fest bei dx (Tiefe 0), P=6
for d in $(seq -97 -90) -60 -20 0 20 60 $(seq 90 98); do
	v g0_x${d/-/m} spezial_v_h0 CC_IN=6:$AJ CC_SETZE=18:$d:0:2:56 CC_FRAMES=61
done
# Ginzu/Baby Head: Grenzen zwischen den Explosionen (gesetzter Wert; der WOOKY geht im Frame bis 2 px)
for k in 2 3; do
	for d in -74 -73 -72 -66 -64 -50 -48 -4 -2 0 20 22 62 64 140 141 142 143; do
		v g${k}_x${d/-/m} spezial_v_h$k CC_IN=6:$AJ CC_SETZE=18:$d:0:2:56 CC_FRAMES=61
	done
done
for zz in 10 16; do
	for d in 64 72 78 80 24 32 40 42 -40 -42 -46 -50 -54 -60 -64; do
		v g2_x${d/-/m}_z$zz spezial_v_h2 CC_IN=6:$AJ CC_SETZE=18:$d:$zz:2:56 CC_FRAMES=61
	done
done
for dx in -50 50; do
	for zz in -40 -32 -29 -28 28 29 32 40 48; do
		v gz0_x${dx/-/m}_z${zz/-/m} spezial_v_h0 CC_IN=6:$AJ CC_SETZE=18:$dx:$zz:2:56 CC_FRAMES=61
	done
done
for dx in 100 0; do
	for zz in -29 -28 28 29; do
		v gz2_x${dx}_z${zz/-/m} spezial_v_h2 CC_IN=6:$AJ CC_SETZE=18:$dx:$zz:2:56 CC_FRAMES=61
	done
done
par
vruns=$(ls logs/raw/spezial_v_*_watch.csv | sed 's/_watch.csv$//' | grep -v '_v_sv_' | sort -V)
vprobe='_v_(rx|fen|voll|rz|rg|g[023]|gz[02])_'
{
	echo "# Gegenpruefung V4 (spezial_v). Erzeugt von scripts/belege_spezial.sh (Block Gegenpruefung)."
	echo "# Szenario scenarios/spezial_v_frei.lua, Auswertung scripts/messen_spezial_v.py. rel = Frame minus B"
	echo "# (B = erster Frame mit Angriff und Sprung, sonst erster Angriffsdruck). dx/dz: Gegner minus Figur,"
	echo "# ganzzahlig am Frame-Ende. EINGRIFF: rx, fen, voll, rz, rg, flug_*_hinten, beh, sch, f*_anf*, g*, gz*"
	echo "# (Lage), lp0/2/5/9/12, f*_lp5 (eigene LP), sch_*_t* (Timer FFAA69); alle anderen ohne Eingriff."
	echo "# Proben: erster Treffer je Gegner (messen_spezial_v.py probe)"
	python3 scripts/messen_spezial_v.py probe --slot 17 $(echo "$vruns" | grep -E "$vprobe" | grep -E '_(e)_')
	python3 scripts/messen_spezial_v.py probe --slot 18 $(echo "$vruns" | grep -E "$vprobe" | grep -E '_w_|_v_g[023]_|_v_gz[02]_') | tail -n +2
	echo "# Bewegung der Figur (messen_spezial_v.py tempo)"
	python3 scripts/messen_spezial_v.py tempo $(echo "$vruns" | grep -E '_v_(lauf_|ab_lauf|ab_s3_lauf|ab_treffer_lauf|f[023]_lauf|f[023]_kontakt_lauf)')
	echo "# Ereignisse (messen_spezial_v.py ereignisse --ohne-bewegung)"
	python3 scripts/messen_spezial_v.py ereignisse --ohne-bewegung $(echo "$vruns" | grep -v -E "$vprobe")
} >logs/spezial_v.csv
wc -l logs/spezial_v.csv

rm -f logs/spezial_ev.tmp logs/spezial_fr.tmp logs/raw/spezial_*_ram.bin logs/raw/spezial_*_inputs.csv \
	logs/raw/spezial_*_fields.txt logs/raw/spezial_*_watch.csv logs/raw/spezial_*_ram.hdr
wc -l $out
