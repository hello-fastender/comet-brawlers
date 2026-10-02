#!/usr/bin/env bash
# Sprint (Doppeltipp einer Richtung, Aktion P+0x0A = 0x02), Sprintangriff
# (0x06), Sprintsprung (0x04) und Sprint-Sprungangriff (0x08), Captain
# Commando: MAME-Laeufe mit scenarios/sprint_probe.lua, Auswertung mit
# messen_a5.py sprint und messen_spezial.py (Zusammenfassung) nach
# logs/sprint.csv; loescht danach die eigenen Rohabzuege.
# Voraussetzung: Savestates ingame, kontakt, kontakt_b, anlauf, anlauf_c (laeufe_a5.sh)
# und spezial_drei (belege_spezial.sh). A = Frame des Angriffsdrucks, J = des
# Sprungdrucks im Sprint.
# Laufnamen: sprint_<gruppe>_..., Gruppen: ew (Eingabefenster), ri
# (Richtungen), rw (Loslassen, Wechsel, neuer Sprint), sa (Sprintangriff), sj
# (Sprintsprung), sja (Sprint-Sprungangriff), sg (Griff), sp (Spezialangriff
# aus dem Sprint). EINGRIFF (Gegnerposition, siehe spezial_probe.lua) in
# sa_x/z/fen/zwei, sja_* (ausser sja_leer) und sg_dz0. Dauer: ~5-10 min.
# Danach Block "Gegenpruefung V4": eigene Laeufe sprint_v_* (scenarios/
# sprint_v_frei.lua) nach logs/sprint_v.csv; braucht spezial_v_viele.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/sprint_probe.lua
out=logs/sprint.csv
jobs=$(mktemp)
fehler=$(mktemp)
trap 'rm -f "$jobs" "$fehler"' EXIT
df -h . | tail -1 >&2
[ -f logs/raw/sta/captcomm/spezial_drei.sta ] || { echo "Savestate spezial_drei fehlt (belege_spezial.sh)" >&2; exit 1; }

s() {
	local name=$1 state=$2; shift 2
	printf 'env CC_KLEIN=1 CC_NAME=sprint_%s' "$name" >>"$jobs"
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
R=p1_right
L=p1_left

# 1) Eingabefenster (ab ingame): erster Druck d Frames, Pause g Frames, zweiter Druck gehalten
for c in 1:2 10:2 11:2 2:1 2:10 2:11 10:10 1:11 11:1 8:5; do
	d=${c%%:*}; g=${c##*:}
	s ew_d${d}_g$g ingame CC_IN="2-$((1 + d)):$R;$((2 + d + g))-$((40 + d + g)):$R" CC_FRAMES=$((40 + d + g))
done
# Gegenlauf nach links ab anlauf (der Gegner kommt von rechts), Beginn in Frame 10
for c in 10:2 11:2 2:10 2:11; do
	d=${c%%:*}; g=${c##*:}
	s ew_l_d${d}_g$g anlauf CC_IN="10-$((9 + d)):$L;$((10 + d + g))-$((50 + d + g)):$L" CC_FRAMES=$((50 + d + g))
done
# zweiter Druck nur h Frames lang
for h in 1 2 5 20; do s ew_h$h ingame CC_IN="2-3:$R;6-$((5 + h)):$R" CC_FRAMES=40; done
s ew_misch ingame CC_IN="2-3:$R;6-60:$R+p1_up" CC_FRAMES=60

# 2) Richtungen und Geschwindigkeit
s ri_r ingame CC_IN="2-3:$R;6-110:$R" CC_FRAMES=110
s ri_r_b ingame CC_IN="10-12:$R;17-120:$R" CC_FRAMES=120
s ri_l anlauf CC_IN="2-3:$L;6-70:$L" CC_FRAMES=70
s ri_h ingame CC_IN="2-40:p1_down;45-46:p1_up;49-110:p1_up" CC_FRAMES=110
s ri_u ingame CC_IN="2-40:p1_up;45-46:p1_down;49-110:p1_down" CC_FRAMES=110
s ri_rh ingame CC_IN="2-40:p1_down;45-46:$R+p1_up;49-110:$R+p1_up" CC_FRAMES=110
s ri_ru ingame CC_IN="2-40:p1_up;45-46:$R+p1_down;49-110:$R+p1_down" CC_FRAMES=110
s ri_lh anlauf CC_IN="2-30:p1_down;35-36:$L+p1_up;39-90:$L+p1_up" CC_FRAMES=90
s ri_lu anlauf CC_IN="2-20:p1_up;25-26:$L+p1_down;29-90:$L+p1_down" CC_FRAMES=90

# 3) Loslassen, Richtungswechsel, Steuern, neuer Sprint
s rw_links ingame CC_IN="2-3:$R;6-30:$R;31-50:$L" CC_FRAMES=55
s rw_hoch ingame CC_IN="2-3:$R;6-60:$R;20-30:p1_up" CC_FRAMES=60
s rw_nur_hoch ingame CC_IN="2-3:$R;6-19:$R;20-40:p1_up" CC_FRAMES=45
s rw_neu ingame CC_IN="2-3:$R;6-96:$R;99-100:$R;103-150:$R" CC_FRAMES=150
s rw_neu_sofort ingame CC_IN="2-3:$R;6-95:$R;97-97:$R;99-150:$R" CC_FRAMES=150
s rw_neu_gehalten ingame CC_IN="2-3:$R;6-110:$R;113-150:$R" CC_FRAMES=150

# 4) Sprintangriff
s sa_leer20 ingame CC_IN="2-3:$R;6-80:$R;20:p1_attack" CC_FRAMES=80
s sa_leer40 ingame CC_IN="2-3:$R;6-80:$R;40:p1_attack" CC_FRAMES=100
s sa_leer20_los ingame CC_IN="2-3:$R;6-21:$R;20:p1_attack" CC_FRAMES=80
s sa_nat_k kontakt CC_IN="2-3:$R;6-60:$R;8:p1_attack" CC_FRAMES=120
s sa_nat_kb kontakt_b CC_IN="2-3:$R;6-60:$R;8:p1_attack" CC_FRAMES=120
s sa_nat_ac anlauf_c CC_IN="2-3:$R;6-60:$R;8:p1_attack" CC_FRAMES=120
# EINGRIFF: Gegner ab A+1 bei dx (vorher 200 px entfernt), A = 14
for d in -8 -4 0 4 8 12 16 50 100 104 106 108 110 112 114 116 118 -20 -22 -24 -26 -28 -30 -32 -34; do
	s sa_x_k_${d/-/m} kontakt CC_IN="2-3:$R;6-40:$R;14:p1_attack" CC_FRAMES=40 CC_SLOTS=18 CC_DX=$d CC_DZ=0 CC_FERN_BIS=14
done
for d in 106 108 110 112 114 116 118 120 -20 -22 -24 -26 -28 -30 -32 -34; do
	s sa_x_kb_${d/-/m} kontakt_b CC_IN="2-3:$R;6-40:$R;14:p1_attack" CC_FRAMES=40 CC_SLOTS=17 CC_DX=$d CC_DZ=0 CC_FERN_BIS=14 CC_WEG=16
done
for z in -14 -13 -12 -11 -10 10 11 12 13 14; do
	s sa_z_k_${z/-/m} kontakt CC_IN="2-3:$R;6-40:$R;14:p1_attack" CC_FRAMES=40 CC_SLOTS=18 CC_DX=40 CC_DZ=$z CC_FERN_BIS=14
done
for z in -13 -12 -11 11 12 13; do
	s sa_z_kb_${z/-/m} kontakt_b CC_IN="2-3:$R;6-40:$R;14:p1_attack" CC_FRAMES=40 CC_SLOTS=17 CC_DX=40 CC_DZ=$z CC_FERN_BIS=14 CC_WEG=16
done
# aktive Frames: Gegner nur im Frame T bei dx 40
for t in $(seq 17 30); do
	s sa_fen_k_t$t kontakt CC_IN="2-3:$R;6-40:$R;14:p1_attack" CC_FRAMES=50 CC_SLOTS=18 CC_DX=40 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
done
for r in 4 5 14 15 16; do
	t=$((20 + r)); s sa_fen_kb_t$t kontakt_b CC_IN="2-3:$R;6-50:$R;20:p1_attack" CC_FRAMES=60 CC_SLOTS=17 CC_DX=40 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t CC_WEG=16
done
# zwei Gegner auf dem Weg: nur in A+1 gesetzt, danach frei
s sa_zwei_a spezial_drei CC_IN="2-3:$L;6-40:$L;14:p1_attack" CC_FRAMES=90 CC_SLOTS=16,17 CC_DX=-20,-125 CC_DZ=0 CC_VON=15 CC_BIS=15 CC_WEG=18
s sa_zwei_b spezial_drei CC_IN="2-3:$L;6-40:$L;14:p1_attack" CC_FRAMES=90 CC_SLOTS=16,17 CC_DX=-30,-90 CC_DZ=0 CC_VON=15 CC_BIS=15 CC_WEG=18

# 5) Sprintsprung und Sprint-Sprungangriff
s sj_20 ingame CC_IN="2-3:$R;6-80:$R;20:p1_jump" CC_FRAMES=80
s sj_60 ingame CC_IN="2-3:$R;6-120:$R;60:p1_jump" CC_FRAMES=120
s sj_norm ingame CC_IN="20:p1_jump+$R" CC_FRAMES=80
s sja_leer ingame CC_IN="2-3:$R;6-80:$R;20:p1_jump;28:p1_attack" CC_FRAMES=90
# EINGRIFF, Einzelframe-Proben bei dx 80 (J = 8): Angriff in A = 14, 30, 34
SJ="2-3:$R;6-60:$R;8:p1_jump"
for t in 27 45 46 50 53 54; do
	s sja_fen_a14_t$t kontakt CC_IN="$SJ;14:p1_attack" CC_FRAMES=70 CC_SLOTS=18 CC_DX=80 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
done
for r in 12 13 14 19 20 21 39 40; do
	t=$((30 + r)); s sja_fen_a30_t$t kontakt CC_IN="$SJ;30:p1_attack" CC_FRAMES=80 CC_SLOTS=18 CC_DX=80 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
done
for r in 12 13 14 19 20 38 39 40; do
	t=$((34 + r)); s sja_fen_a34_t$t kontakt CC_IN="$SJ;34:p1_attack" CC_FRAMES=85 CC_SLOTS=18 CC_DX=80 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t
done
for r in 19 20 39 40; do
	t=$((30 + r)); s sja_fen_kb_t$t kontakt_b CC_IN="$SJ;30:p1_attack" CC_FRAMES=80 CC_SLOTS=17 CC_DX=80 CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t CC_WEG=16
done
# Reichweite im Frame A+21 (A = 30, Figur am Boden)
for d in 36 38 40 42 44 46 146 148 150 152 154 156 -10 -30; do
	s sja_x_k_${d/-/m} kontakt CC_IN="$SJ;30:p1_attack" CC_FRAMES=60 CC_SLOTS=18 CC_DX=$d CC_DZ=0 CC_FERN_BIS=50 CC_NAH_BIS=51
done
for d in 38 40 42 44 146 148 150 152 154; do
	s sja_x_kb_${d/-/m} kontakt_b CC_IN="$SJ;30:p1_attack" CC_FRAMES=60 CC_SLOTS=17 CC_DX=$d CC_DZ=0 CC_FERN_BIS=50 CC_NAH_BIS=51 CC_WEG=16
done
for z in -16 -14 -13 -12 -11 11 12 13 14 16; do
	s sja_z_k_${z/-/m} kontakt CC_IN="$SJ;30:p1_attack" CC_FRAMES=60 CC_SLOTS=18 CC_DX=80 CC_DZ=$z CC_FERN_BIS=50 CC_NAH_BIS=51
done

# 6) Griff aus dem Sprint und Spezialangriff aus dem Sprint
s sg_k kontakt CC_IN="2-3:$R;6-40:$R" CC_FRAMES=60
s sg_kb kontakt_b CC_IN="2-3:$R;6-40:$R" CC_FRAMES=60
s sg_dz0 kontakt CC_IN="2-3:$R;6-40:$R" CC_FRAMES=60 CC_SLOTS=18 CC_DX=60 CC_DZ=0 CC_VON=2 CC_BIS=6
s sg_lauf kontakt CC_IN="2-40:$R" CC_FRAMES=60
s sg_lauf_nach kontakt CC_IN="2-3:$R;6-8:$R;10-40:$R" CC_FRAMES=60
s sp_spezial ingame CC_IN="2-3:$R;6-60:$R;20:p1_jump+p1_attack" CC_FRAMES=90

# 7) Dritte Messung zu den Abweichungen der Gegenpruefung V4 (Laeufe d3_*), mit Varianten,
#    die weder M4 noch V4 genutzt haben (Savestates stage1, tiefe_b, anlauf_b)
# a) Sprint in der Tiefe bis an den Rand: hoch ab stage1 (37 px frei), runter ab tiefe_b (54 px frei;
#    Gegner mit EINGRIFF beiseite)
s d3_tief_a stage1 CC_IN="2-3:p1_up;6-120:p1_up" CC_FRAMES=120
s d3_tief_b tiefe_b CC_IN="2-3:p1_down;6-120:p1_down" CC_FRAMES=120 CC_WEG=16,17
# b) Rutschen des Sprintangriffs: Richtung zuletzt in A-2, A-1, A oder A+1 gedrueckt (A = 20, stage1)
for l in 18 19 20 21; do s d3_rut_l$l stage1 CC_IN="2-3:$R;6-$l:$R;20:p1_attack" CC_FRAMES=80; done
# c) Scheitel des Sprintsprungs und des normalen Sprungs ab stage1
s d3_sj_s1 stage1 CC_IN="2-3:$R;6-80:$R;30:p1_jump" CC_FRAMES=90
s d3_sj_norm_s1 stage1 CC_IN="30:p1_jump+$R" CC_FRAMES=90
# d) Sprint-Sprungangriff in A+13 bei Figurhoehe 24, 20 und 16 px (J = 9, A = 33/34/35, Gegner nur in
#    Frame A+13); EDDY ab tiefe_b, WOOKY ab anlauf_b; EINGRIFF Lage. Die Kisten (Slot 46, 47) werden
#    ebenfalls beiseite gehalten: Der Angriff trifft sie sonst (ab tiefe_b in A+20), das kostet
#    Trefferstopp und verschiebt die spaeteren Frames
SJ9="2-3:$R;6-60:$R;9:p1_jump"
for g in e w; do
	if [ $g = e ]; then st=tiefe_b; sl=17; weg=16,46,47; else st=anlauf_b; sl=18; weg=46,47; fi
	for a in 33 34 35; do for d in 60 100; do
		t=$((a + 13))
		s d3_sja13_${g}_v${d}_a${a}_t$t $st CC_IN="$SJ9;$a:p1_attack" CC_FRAMES=$((a + 20)) CC_SLOTS=$sl CC_DX=$d CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t CC_WEG=$weg
	done; done
	# e) Reichweite am Boden je Probe-Frame A+k, Angriff 21 bzw. 25 Frames nach dem Sprung (A = 30, 34)
	for a in 30 34; do
		for kd in 20:34,38,143,147,151 25:159,163,167,171 30:34,38,42,160,164,168,172,176 35:157,161,165,169 \
			39:130,140,150,160; do
			k=${kd%%:*}; ds=${kd#*:}
			for d in ${ds//,/ }; do
				t=$((a + k))
				s d3_sjax_${g}_a${a}_k${k}_v$d $st CC_IN="$SJ9;$a:p1_attack" CC_FRAMES=$((t + 5)) CC_SLOTS=$sl CC_DX=$d CC_DZ=0 CC_FERN_BIS=$((t - 1)) CC_NAH_BIS=$t CC_WEG=$weg
			done
		done
	done
done
par

runs=$(ls logs/raw/sprint_*_ram.bin | sed 's/_ram.bin$//' | sort -V)
python3 scripts/messen_a5.py sprint $runs >logs/sprint_ev.tmp
python3 scripts/messen_a5.py sprint --frames --nach 20 $(echo "$runs" | grep -E '_(sa|sja|d3_sja13|d3_sjax)_') >logs/sprint_fr.tmp
python3 scripts/messen_a5.py sprint --tempo $(echo "$runs" | grep -E 'sprint_(ew_|ri_|rw_|sa_leer|sa_nat|sj_|sja_leer|sp_|d3_tief|d3_rut|d3_sj_)') >logs/sprint_tp.tmp
{
	echo "# Sprint (Captain Commando). Erzeugt von scripts/belege_sprint.sh. P = Bezugsdruck (Angriff, sonst"
	echo "# Sprung, sonst zweiter Druck der Richtung). dx/dz: Gegner minus Figur, ganzzahlig am Frame-Ende."
	echo "# Geschwindigkeiten in px/Frame (16.16). EINGRIFF: sa_x/z/fen/zwei, sja_x/z/fen, sg_dz0 (Gegnerposition)."
	echo "# Zusammenfassung"
	python3 scripts/messen_spezial.py zusammenfassung-sprint logs/sprint_ev.tmp logs/sprint_fr.tmp logs/sprint_tp.tmp
	echo "# Geschwindigkeit je Abschnitt (messen_a5.py sprint --tempo)"
	cat logs/sprint_tp.tmp
	echo "# Ereignisse aller Laeufe (messen_a5.py sprint)"
	cat logs/sprint_ev.tmp
} >$out
# ---------------------------------------------------------------------------
# Gegenpruefung V4 (Praefix sprint_v): eigene Laeufe mit anderen Savestates
# (stage2, stage3, anlauf, anlauf_c, tiefe_b, spezial_v_viele), Startframes,
# Richtungen und Positionen als oben. Szenario scenarios/sprint_v_frei.lua
# (= spezial_v_frei.lua, nur Watch-Protokoll), Auswertung messen_spezial_v.py
# nach logs/sprint_v.csv (~2 min). Braucht spezial_v_viele aus
# belege_spezial.sh. EINGRIFF (CC_SETZE, Gegnerlage) nur in sa_fen, sa_x,
# sa_z, sja_fen, sja_x*, sja_z, sja_hoehe, sja_t1*; alle anderen ohne Eingriff.
[ -f logs/raw/sta/captcomm/spezial_v_viele.sta ] || { echo "Savestate spezial_v_viele fehlt (belege_spezial.sh)" >&2; exit 1; }
vsc=scripts/scenarios/sprint_v_frei.lua
v() {
	local name=$1 state=$2; shift 2
	printf 'env CC_NAME=sprint_v_%s' "$name" >>"$jobs"
	printf ' %q' "$@" >>"$jobs"
	printf ' scripts/run.sh %q %q\n' "$vsc" "$state" >>"$jobs"
}
# Tempo gerade, Tiefe, Ende nach 90 Frames, Tiefenband der Stage 1
v ri_r_s2 stage2 "CC_IN=13-15:p1_right;18-140:p1_right" CC_FRAMES=150
v ri_l_c anlauf_c "CC_IN=7-9:p1_left;12-120:p1_left" CC_FRAMES=125
v ri_u_s2 stage2 "CC_IN=13-14:p1_up;17-140:p1_up" CC_FRAMES=150
v ri_d_s2 stage2 "CC_IN=3-90:p1_up;100-101:p1_down;104-200:p1_down" CC_FRAMES=210
v ri_u_ing ingame "CC_IN=13-14:p1_up;17-140:p1_up" CC_FRAMES=150
v ri_band ingame "CC_IN=2-60:p1_down;70-71:p1_up;74-170:p1_up" CC_FRAMES=175
# Eingabe: erster Druck d, Pause g (rechts ab Frame 9 in stage2, links ab Frame 5 in anlauf_c)
v ew_d1_g1 stage2 "CC_IN=9-9:p1_right;11-50:p1_right" CC_FRAMES=60
v ew_d10_g10 stage2 "CC_IN=9-18:p1_right;29-70:p1_right" CC_FRAMES=80
v ew_d11_g1 stage2 "CC_IN=9-19:p1_right;21-60:p1_right" CC_FRAMES=70
v ew_d1_g11 stage2 "CC_IN=9-9:p1_right;21-60:p1_right" CC_FRAMES=70
v ew_d10_g1 stage2 "CC_IN=9-18:p1_right;20-60:p1_right" CC_FRAMES=70
v ew_d1_g10 stage2 "CC_IN=9-9:p1_right;20-60:p1_right" CC_FRAMES=70
v ew_d11_g11 stage2 "CC_IN=9-19:p1_right;31-70:p1_right" CC_FRAMES=80
v ew_d6_g4 stage2 "CC_IN=9-14:p1_right;19-60:p1_right" CC_FRAMES=70
v ew_l_d10_g10 anlauf_c "CC_IN=5-14:p1_left;25-60:p1_left" CC_FRAMES=65
v ew_l_d11_g1 anlauf_c "CC_IN=5-15:p1_left;17-60:p1_left" CC_FRAMES=65
v ew_l_d1_g11 anlauf_c "CC_IN=5-5:p1_left;17-60:p1_left" CC_FRAMES=65
v ew_l_d3_g3 anlauf_c "CC_IN=5-7:p1_left;11-60:p1_left" CC_FRAMES=65
# zweiter Druck 1, 3, 30, 139 Frames (stage3), Mischrichtung
v ew_h1 stage3 "CC_IN=7-8:p1_right;12-12:p1_right" CC_FRAMES=40
v ew_h3 stage3 "CC_IN=7-8:p1_right;12-14:p1_right" CC_FRAMES=40
v ew_h30 stage3 "CC_IN=7-8:p1_right;12-41:p1_right" CC_FRAMES=70
v ew_hmax stage3 "CC_IN=7-8:p1_right;12-150:p1_right" CC_FRAMES=155
v ew_misch anlauf_c "CC_IN=5-6:p1_left;9-50:p1_left+p1_down" CC_FRAMES=60
v ew_misch2 stage2 "CC_IN=5-6:p1_right;9-50:p1_right+p1_up" CC_FRAMES=60
# Diagonale (Doppeltipp diagonal)
v di_rh stage2 "CC_IN=9-10:p1_right+p1_up;13-80:p1_right+p1_up" CC_FRAMES=90
v di_rd stage2 "CC_IN=3-50:p1_up;60-61:p1_right+p1_down;64-140:p1_right+p1_down" CC_FRAMES=150
v di_lu tiefe_b "CC_IN=5-6:p1_left+p1_up;9-50:p1_left+p1_up" CC_FRAMES=60
v di_ld anlauf_c "CC_IN=5-6:p1_left+p1_down;9-50:p1_left+p1_down" CC_FRAMES=60
# Richtungswechsel und neuer Sprint
v rw_links stage2 "CC_IN=7-8:p1_right;12-39:p1_right;40-80:p1_left" CC_FRAMES=90
v rw_dazu stage2 "CC_IN=7-8:p1_right;12-80:p1_right;30-45:p1_up" CC_FRAMES=90
v rw_nur_hoch stage2 "CC_IN=7-8:p1_right;12-39:p1_right;40-80:p1_up" CC_FRAMES=90
v rw_neu stage3 "CC_IN=7-8:p1_right;12-41:p1_right;43-43:p1_right;46-90:p1_right" CC_FRAMES=100
# Sprintangriff ohne Gegner, Rutschen mit und ohne Richtung im Frame A
v sa_leer9 stage2 "CC_IN=7-8:p1_right;12-100:p1_right;21:p1_attack" CC_FRAMES=110
v sa_leer40 stage2 "CC_IN=7-8:p1_right;12-120:p1_right;52:p1_attack" CC_FRAMES=130
v sa_leer2_los stage2 "CC_IN=7-8:p1_right;12-13:p1_right;14:p1_attack" CC_FRAMES=80
v sa_los_a stage2 "CC_IN=7-8:p1_right;12-21:p1_right;21:p1_attack" CC_FRAMES=80
v sa_los_a1 stage2 "CC_IN=7-8:p1_right;12-22:p1_right;21:p1_attack" CC_FRAMES=80
v sa_los_vor stage2 "CC_IN=7-8:p1_right;12-20:p1_right;21:p1_attack" CC_FRAMES=80
# Sprintangriff natuerlich (EDDY, WOOKY, zwei Gegner)
v sa_nat_c anlauf_c "CC_IN=3-4:p1_right;7-40:p1_right;12:p1_attack" CC_FRAMES=110
v sa_nat_a anlauf "CC_IN=3-4:p1_right;8-40:p1_right;15:p1_attack" CC_FRAMES=110
v sa_nat_c_lauf anlauf_c "CC_IN=3-4:p1_right;7-90:p1_right;12:p1_attack" CC_FRAMES=100
v sa_viele spezial_v_viele "CC_IN=3-4:p1_left;7-40:p1_left;14:p1_attack" CC_FRAMES=100
v sa_viele2 spezial_v_viele "CC_IN=3-4:p1_left;7-40:p1_left;20:p1_attack" CC_FRAMES=100
# Sprintangriff mit EINGRIFF: Gegner nur im Frame X (sonst +200); EDDY A=12, WOOKY A=15
for g in e w; do
	if [ $g = e ]; then st=anlauf_c; sl=17; a=12; z=0; else st=anlauf; sl=18; a=15; z=5; fi
	b="3-4:p1_right;$((a - 5))-$((a + 30)):p1_right;$a:p1_attack"; e=$((a + 30)); x=$((a + 5))
	for k in 4 5 14 15; do
		t=$((a + k))
		v sa_fen_${g}_t$k $st "CC_IN=$b" "CC_SETZE=$sl:200:$z:2:$((t - 1));$sl:50:$z:$t:$t;$sl:200:$z:$((t + 1)):$e" CC_FRAMES=$((e + 5))
	done
	for d in 108 109 110 111 112 113 -20 -21 -22 -23 -24; do
		n=$([ $d -gt 0 ] && echo v$d || echo h${d#-})
		v sa_x_${g}_$n $st "CC_IN=$b" "CC_SETZE=$sl:200:$z:2:$((x - 1));$sl:$d:$z:$x:$x;$sl:200:$z:$((x + 1)):$e" CC_FRAMES=$((e + 5))
	done
	for zz in 12 13 -12 -13; do
		n=$([ $zz -gt 0 ] && echo p$zz || echo m${zz#-})
		v sa_z_${g}_$n $st "CC_IN=$b" "CC_SETZE=$sl:200::2:$((x - 1));$sl:50:$zz:$x:$x;$sl:200::$((x + 1)):$e" CC_FRAMES=$((e + 5))
	done
done
# Sprintsprung (J im Sprint bei 3,75 bzw. 3,0 px/Frame) und normaler Vorwaertssprung
v sj_10 stage2 "CC_IN=7-8:p1_right;12-100:p1_right;22:p1_jump" CC_FRAMES=110
v sj_50 stage2 "CC_IN=7-8:p1_right;12-120:p1_right;62:p1_jump" CC_FRAMES=130
v sj_norm stage2 CC_IN=30-31:p1_jump+p1_right CC_FRAMES=90
# Sprint-Sprungangriff natuerlich (erst nach links absetzen, dann Sprint nach rechts, J=49, A=69)
v sja_nat_a3 anlauf "CC_IN=2-3:p1_left;6-40:p1_left;43-44:p1_right;47-49:p1_right;49:p1_jump;69:p1_attack" CC_FRAMES=130
# Sprint-Sprungangriff mit EINGRIFF (J=10): Gegner nur im Frame X bei dx (sonst +200)
J=10
for g in e w; do
	if [ $g = e ]; then st=anlauf_c; sl=17; z=0; else st=anlauf; sl=18; z=5; fi
	# one NAME A X DX [DZ]
	one() {
		local name=$1 a=$2 x=$3 d=$4 zz=${5:-$z}
		v sja_$name $st "CC_IN=3-4:p1_right;7-10:p1_right;$J:p1_jump;$a:p1_attack" \
			"CC_SETZE=$sl:200:$zz:2:$((x - 1));$sl:$d:$zz:$x:$x;$sl:200:$zz:$((x + 1)):$((a + 50))" CC_FRAMES=$((a + 55))
	}
	a=$((J + 25))
	for k in 12 13 14 19 20 39 40; do one fen_${g}_t$k $a $((a + k)) 80; done
	for d in 37 38 146 147 148; do one x20_${g}_v$d $a $((a + 20)) $d; done
	for d in 37 38 155; do one x25_${g}_v$d $a $((a + 25)) $d; done
	for d in 37 38 147 148 155 160 175; do one x_${g}_v$d $a $((a + 30)) $d; done
	for d in 162 164 170 180; do one x30_${g}_v$d $a $((a + 30)) $d; done
	for d in 160 162 164; do one x39_${g}_v$d $a $((a + 39)) $d; done
	one x_${g}_h10 $a $((a + 30)) -10
	one x_${g}_h40 $a $((a + 30)) -40
	for zz in 12 13 -12 -13; do one z_${g}_$([ $zz -gt 0 ] && echo p$zz || echo m${zz#-}) $a $((a + 30)) 80 $zz; done
	one t13_${g}_a25_v60 $((J + 25)) $((J + 38)) 60
	one t13_${g}_a26_v40 $((J + 26)) $((J + 39)) 40
	one t13_${g}_a26_v60 $((J + 26)) $((J + 39)) 60
	one t13_${g}_a27_v40 $((J + 27)) $((J + 40)) 40
	one t13_${g}_a27_v100 $((J + 27)) $((J + 40)) 100
	one t13_${g}_a3_v60 $((J + 3)) $((J + 16)) 60
	one t12_${g}_a27_v40 $((J + 27)) $((J + 39)) 40
	one t14_${g}_a27_v40 $((J + 27)) $((J + 41)) 40
	# Hoehe: Gegner ab A+1 dauerhaft am Boden vor der Figur
	for c in 5:60 8:100; do
		a2=$((J + ${c%%:*})); d=${c##*:}
		v sja_hoehe_${g}_a${c%%:*} $st "CC_IN=3-4:p1_right;7-10:p1_right;$J:p1_jump;$a2:p1_attack" \
			"CC_SETZE=$sl:200:$z:2:$a2;$sl:$d:$z:$((a2 + 1)):$((a2 + 45))" CC_FRAMES=$((a2 + 50))
	done
done
# Griff und Spezialangriff aus dem Sprint
v sg_c anlauf_c "CC_IN=3-4:p1_right;7-28:p1_right" CC_FRAMES=90
v sg_a anlauf "CC_IN=3-4:p1_right;8-30:p1_right" CC_FRAMES=90
v sg_c_nach anlauf_c "CC_IN=3-4:p1_right;7-12:p1_right;14-40:p1_right" CC_FRAMES=90
v sp_spezial stage2 "CC_IN=7-8:p1_right;12-80:p1_right;30:p1_attack+p1_jump" CC_FRAMES=100
v sp_spezial_c anlauf_c "CC_IN=3-4:p1_left;7-60:p1_left;20:p1_attack+p1_jump" CC_FRAMES=90
par
vruns=$(ls logs/raw/sprint_v_*_watch.csv | sed 's/_watch.csv$//' | sort -V)
vprobe='_v_(sa_fen|sa_x|sa_z|sja_fen|sja_x|sja_z|sja_hoehe|sja_t1)'
{
	echo "# Gegenpruefung V4 (sprint_v). Erzeugt von scripts/belege_sprint.sh (Block Gegenpruefung)."
	echo "# Szenario scenarios/sprint_v_frei.lua, Auswertung scripts/messen_spezial_v.py. rel = Frame minus B"
	echo "# (B = erster Frame mit Angriff und Sprung, sonst erster Angriffsdruck; bei tempo 0). dx/dz: Gegner"
	echo "# minus Figur, ganzzahlig am Frame-Ende. EINGRIFF (Gegnerlage): sa_fen, sa_x, sa_z, sja_fen, sja_x*,"
	echo "# sja_z, sja_hoehe, sja_t1*; alle anderen ohne Eingriff."
	echo "# Proben: erster Treffer je Gegner, nah = Frames mit Gegner unter 190 px (rel:dx/dz/Hoehe der Figur)"
	python3 scripts/messen_spezial_v.py probe --slot 17 $(echo "$vruns" | grep -E "$vprobe" | grep -E '_e_')
	python3 scripts/messen_spezial_v.py probe --slot 18 $(echo "$vruns" | grep -E "$vprobe" | grep -E '_w_') | tail -n +2
	echo "# Bewegung der Figur je Abschnitt gleicher Geschwindigkeit (messen_spezial_v.py tempo --bezug 0)"
	python3 scripts/messen_spezial_v.py tempo --bezug 0 $(echo "$vruns" | grep -v -E "$vprobe")
	echo "# Ereignisse (messen_spezial_v.py ereignisse --ohne-bewegung)"
	python3 scripts/messen_spezial_v.py ereignisse --ohne-bewegung $(echo "$vruns" | grep -v -E "$vprobe")
} >logs/sprint_v.csv
wc -l logs/sprint_v.csv

rm -f logs/sprint_ev.tmp logs/sprint_fr.tmp logs/sprint_tp.tmp logs/raw/sprint_*_ram.bin logs/raw/sprint_*_inputs.csv \
	logs/raw/sprint_*_fields.txt logs/raw/sprint_*_watch.csv logs/raw/sprint_*_ram.hdr
wc -l $out
