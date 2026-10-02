#!/usr/bin/env bash
# Rest der Spielfigur (Praefix rest, Auftrag 2, Agent M8): alle MAME-Laeufe von
# vorn, Auswertung mit messen_rest.py (und messen_a5.py), Ergebnis in
# logs/rest.csv; loescht danach die eigenen Rohdaten (logs/raw/rest_*), die
# Savestates rest_* bleiben.
#
#   Teil A  Nachlauf der Kettenstufen 2-4 (rest_kette.lua)
#   Teil B  Sprungangriff hoch und runter (rest_sprung.lua)
#   Teil C  Gegner mit genau 0 LP (rest_kette.lua, rest_frei.lua)
#   Teil D  Tod und Neueinstieg der Figur (rest_frei.lua um hurt*.lua)
#   Teil E  Rang beim Stage-Wechsel (grafik/bot.sh mit durchlauf.lua)
#   Teil F  Nachpruefungen: Mindestabstand, Blick links, Richtung beim
#           Kettendruck, Treffer in der Luft, gleichzeitiger Treffer
#   Teil M3 Dritte Messung (Praefix rest_m3): Ablauf des Todes je Todesart
#           (D1), Fall auf ein Oelfass (D4), Reichweite hinter der Figur je
#           Blickrichtung des Gegners (F1); Ergebnis als eigene Gruppe in
#           logs/rest.csv
#   Teil V  Gegenpruefung V8 (Praefix rest_v): eigene Laeufe zu A bis F mit
#           scenarios/rest_v_frei.lua und scenarios/rest_v_bot.lua, Auswertung
#           mit messen_rest_v.py nach logs/rest_v.csv (Savestate rest_v_e_vor
#           bleibt)
#
# EINGRIFFE stehen je Lauf im Aufruf (CC_LEER, CC_DX, CC_DZ, CC_FERN, CC_ELP,
# CC_PLP, CC_RANG, CC_POKE, CC_SETZE, CC_VOR_DX, CC_WEG) und im Kopf jeder
# Ergebnistabelle in logs/rest.csv.
#
# Voraussetzung: Savestates kontakt, kontakt_b, ingame, stage1 sowie aus Phase 0
# p0_s1_s1_cam02048 und p0_s1_s2_cam00256; fuer Teil V anlauf, anlauf_b,
# anlauf_c, tiefe_b, stage3, held0, p0_s1_s1_cam00768, p0_s1_s1_cam01281 und
# item_v_b1_s1_cam02016 (aus belege_item.sh); fuer Teil M3 reaktion_w3
# (belege_reaktion.sh), stage4, stage5, stage9 (stage_start.lua),
# item_bot1_s1_cam*, item_v_b1_s1_cam* (belege_item.sh) und greichweite_v_*
# (belege_greichweite.sh), siehe Liste M3_STATES.
# PAR = parallele MAME-Laeufe (Standard 3). Dauer etwa 22 min (mit Teil V etwa
# 30 min), Platz bis etwa 3 GB waehrend Teil A.
set -euo pipefail
cd "$(dirname "$0")/.."
PAR=${PAR:-3}
out=logs/rest.csv
raw=logs/raw
jobs=$raw/rest_jobs.txt
fehler=$raw/rest_fehler.txt
tmp=$raw/rest_tmp
for s in kontakt kontakt_b ingame stage1 p0_s1_s1_cam02048 p0_s1_s2_cam00256 \
	anlauf anlauf_b anlauf_c tiefe_b stage3 held0 p0_s1_s1_cam00768 p0_s1_s1_cam01281 item_v_b1_s1_cam02016 \
	reaktion_w3 stage4 stage5 stage9 item_bot1_s1_cam00321 item_bot1_s1_cam00513 item_bot1_s1_cam00768 \
	item_bot1_s1_cam00832 item_bot1_s1_cam00960 item_bot1_s1_cam01153 item_bot1_s1_cam01216 \
	item_bot1_s1_cam01344 item_bot1_s1_cam01408 item_v_b1_s1_cam01345 item_v_b1_s1_cam01440 \
	greichweite_v_wk2_r greichweite_v_wc_r greichweite_v_eb_l greichweite_v_sm_r greichweite_v_sw_r; do
	[ -f "$raw/sta/captcomm/$s.sta" ] || { echo "Savestate $s fehlt" >&2; exit 1; }
done
rm -rf "$raw"/rest_*
mkdir -p "$tmp"
: > "$jobs"; : > "$fehler"

# job NAME SAVESTATE SZENARIO VAR=WERT ... (Werte mit ';' in einfachen Anfuehrungszeichen)
job() { printf '%s\n' "$*" >> "$jobs"; }
laufen() {
	xargs -d '\n' -P "$PAR" -I{} bash -c 'set -- {}; n=$1; s=$2; sc=$3; shift 3
		env "$@" CC_NAME=$n scripts/run.sh scripts/scenarios/$sc $s >/dev/null 2>&1 || echo "$n" >> '"$fehler" < "$jobs"
	: > "$jobs"
	if [ -s "$fehler" ]; then echo "Fehler in Laeufen:" >&2; cat "$fehler" >&2; exit 1; fi
}
laeufe() { ls "$raw"/$1*_ram.bin | sed 's/_ram.bin$//' | sort -V; }
weg() { rm -f "$raw"/$1*; }
M="python3 scripts/messen_rest.py"

# ---------------------------------------------------------------------------
# Teil A: Nachlauf der Kettenstufen 2-4 (Stufe 1 zur Kontrolle gegen die
# bekannten Werte, Druecke nur bis D+20). Gruppe rest_a_<g>_s<k>_<fall>:
#   g w = kontakt (WOOKY 16 LP, Slot 18, Abstand der Druecke 14),
#     e = kontakt_b (EDDY 30 LP, Slot 17, Abstand 18)
#   fall t = Treffer, l = Leerschlag (EINGRIFF CC_LEER: Gegner ab dem Treffer
#     der Vorstufe 200 px entfernt), z = Tritt trifft erst im zweiten Fenster
#     (EINGRIFF CC_DX=60 CC_FERN=16 CC_POKE_BIS=24)
#   Lauf _o ohne Folgeeingabe, _hl/_hu/_hr Richtung ab D+2 gehalten,
#   _aF / _jF ein Angriffs- bzw. Sprungdruck (1 Frame) in D+F.
for g in w e; do
	if [ $g = w ]; then st=kontakt; ex="CC_ABSTAND=14"; else st=kontakt_b; ex="CC_SLOT=17 CC_ABSTAND=18"; fi
	for k in 1 2 3 4; do
		for fall in t l z; do
			[ $fall = z ] && [ $k != 4 ] && continue
			case $fall in
				t) ein="" ; bis=36 ;;
				l) ein="CC_LEER=1" ; bis=36 ;;
				z) ein="CC_DX=60 CC_FERN=16 CC_POKE_BIS=24" ; bis=46 ;;
			esac
			[ $k = 1 ] && bis=20
			n=rest_a_${g}_s${k}_${fall}
			base="$st rest_kette.lua CC_STUFE=$k $ex $ein CC_FRAMES=80"
			job ${n}_o $base
			job ${n}_hl $base CC_NACH=l:2-80
			job ${n}_hu $base CC_NACH=u:2-80
			[ $fall = l ] && job ${n}_hr $base CC_NACH=r:2-80
			for F in $(seq 2 $bis); do
				job ${n}_a$F $base CC_NACH=a:$F
				job ${n}_j$F $base CC_NACH=j:$F
			done
		done
	done
done
laufen
$M nachlauf $(laeufe rest_a_) > $tmp/a_nachlauf.csv
$M nachlauf-zusammenfassung $tmp/a_nachlauf.csv > $tmp/a_zus.csv
weg rest_a_

# ---------------------------------------------------------------------------
# Teil B: Sprungangriff hoch (hoch im Frame des Sprungdrucks, CC_DIR=u) und
# runter (runter mit dem Angriffsdruck, CC_ADIR=d). EINGRIFF: Gegner nur in
# Frame T bei dx/dz (CC_FERN_BIS=T-1, CC_NAH_BIS=T), sonst 200 px entfernt;
# ab kontakt_b steht der WOOKY aus Slot 16 300 px entfernt (CC_WEG=16).
# Gruppen rest_b_<g>_<var>_a<A-J>_f<T-A> (aktive Frames, dx 30 bzw. 25, dz 0),
# rest_b_<g>_<var>_x<T-A>_<dx> (Reichweite x, dz 0), rest_b_<g>_<var>_z<T-A>_<dz>
# (Tiefe, dx 30). g w: kontakt, J=4; g e: kontakt_b, J=3.
probe() { # probe NAME STATE J A VAR T DX DZ [EXTRA]
	local n=$1 st=$2 J=$3 A=$4 var=$5 T=$6 dx=$7 dz=$8; shift 8
	local v="CC_DIR=u"; [ $var = runter ] && v="CC_ADIR=d"
	job $n $st rest_sprung.lua CC_J=$J CC_A=$A $v CC_DX=$dx CC_DZ=$dz CC_FERN_BIS=$((T - 1)) CC_NAH_BIS=$T CC_FRAMES=$((A + 45)) "$@"
}
# aktive Frames und Hoehe
for a in 1 6 11 12 19 20 28 32 33; do
	A=$((4 + a)); for t in $(seq 1 14); do probe rest_b_w_hoch_a${a}_f$t kontakt 4 $A hoch $((A + t)) 30 0; done
done
for a in 1 6 12 20 24 28; do
	A=$((4 + a)); for t in $(seq 1 40); do [ $((A + t)) -le 50 ] && probe rest_b_w_runter_a${a}_f$t kontakt 4 $A runter $((A + t)) 30 0; done
done
for a in 2 11 19 31; do
	A=$((3 + a)); for t in $(seq 5 12); do probe rest_b_e_hoch_a${a}_f$t kontakt_b 3 $A hoch $((A + t)) 25 0 CC_SLOT=17 CC_WEG=16; done
done
for a in 3 16 26; do
	A=$((3 + a)); for t in $(seq 5 36); do [ $((A + t)) -le 49 ] && probe rest_b_e_runter_a${a}_f$t kontakt_b 3 $A runter $((A + t)) 25 0 CC_SLOT=17 CC_WEG=16; done
done
# Reichweite x: hoch in A+7 (Hoehe 40) und A+10 (46) bei A=J+6; runter in A+11
# (41) und A+18 (20) bei A=J+20; grob (8 px) und an den Grenzen (1 px). Der
# Gegner geht im Probeframe vorn etwa 2 px auf die Figur zu (gewertet wird die
# Lage am Frame-Ende), daher reichen die gesetzten Abstaende vorn bis 90.
for g in w e; do
	if [ $g = w ]; then st=kontakt; J=4; ex=""; else st=kontakt_b; J=3; ex="CC_SLOT=17 CC_WEG=16"; fi
	for t in 7 10; do
		A=$((J + 6))
		for dx in $(seq 80 90) $(seq -38 -30); do probe rest_b_${g}_hoch_x${t}_${dx/-/m} $st $J $A hoch $((A + t)) $dx 0 $ex; done
	done
	for t in 11 18; do
		A=$((J + 20))
		for dx in $(seq 37 46) $(seq -46 -37); do probe rest_b_${g}_runter_x${t}_${dx/-/m} $st $J $A runter $((A + t)) $dx 0 $ex; done
	done
	# Tiefe bei dx 30 (vorn) und -20 (hinten)
	for dz in -14 -13 -12 -11 11 12 13 14; do
		A=$((J + 6)); probe rest_b_${g}_hoch_z7_${dz/-/m} $st $J $A hoch $((A + 7)) 30 $dz $ex
		A=$((J + 20)); probe rest_b_${g}_runter_z11_${dz/-/m} $st $J $A runter $((A + 11)) 30 $dz $ex
		if [ $g = w ]; then
			A=$((J + 6)); probe rest_b_w_hoch_zh7_${dz/-/m} $st $J $A hoch $((A + 7)) -20 $dz
			A=$((J + 20)); probe rest_b_w_runter_zh11_${dz/-/m} $st $J $A runter $((A + 11)) -20 $dz
		fi
	done
done
for dx in $(seq -64 8 120); do
	probe rest_b_w_hoch_xg7_${dx/-/m} kontakt 4 10 hoch 17 $dx 0
	probe rest_b_w_runter_xg11_${dx/-/m} kontakt 4 24 runter 35 $dx 0
done
# ohne Eingriff: Schaden und Umwerfen
job rest_b_nat_w_hoch_a6 kontakt rest_sprung.lua CC_J=4 CC_A=10 CC_DIR=u
job rest_b_nat_w_hoch_a9 kontakt rest_sprung.lua CC_J=4 CC_A=13 CC_DIR=u
job rest_b_nat_e_hoch_a5 kontakt_b rest_sprung.lua CC_SLOT=17 CC_J=6 CC_A=11 CC_DIR=u
job rest_b_nat_e_hoch_a8 kontakt_b rest_sprung.lua CC_SLOT=17 CC_J=6 CC_A=14 CC_DIR=u
job rest_b_nat_e_runter_a18 kontakt_b rest_sprung.lua CC_SLOT=17 CC_J=2 CC_A=18 CC_ADIR=d
job rest_b_nat_e_runter_a22 kontakt_b rest_sprung.lua CC_SLOT=17 CC_J=2 CC_A=22 CC_ADIR=d
job rest_b_nat_w_richtungrunter_a20 kontakt rest_sprung.lua CC_J=4 CC_A=24 CC_DIR=r CC_ADIR=d
laufen
$M sprung $(laeufe rest_b_) > $tmp/b_sprung.csv
grep -v "^rest_b_nat" $tmp/b_sprung.csv > $tmp/b_proben.csv
$M sprung-zusammenfassung $tmp/b_proben.csv > $tmp/b_zus.csv
weg rest_b_

# ---------------------------------------------------------------------------
# Teil C: Gegner mit genau 0 LP. EINGRIFF CC_ELP: LP des Gegners vorher so
# gesetzt, dass ein Treffer genau 0 ergibt. Ohne Eingriff: WOOKY 16 LP mit drei
# einzelnen Schlaegen (3) und einem Sprungangriff (7), EDDY 30 LP mit zwei
# Ketten 1-3 (12) und zwei einzelnen Schlaegen (3).
job rest_c_s1_w kontakt rest_kette.lua CC_STUFE=1 CC_ELP=3 CC_FRAMES=250
job rest_c_s1_e kontakt_b rest_kette.lua CC_STUFE=1 CC_SLOT=17 CC_ELP=3 CC_FRAMES=250
job rest_c_s2_w kontakt rest_kette.lua CC_STUFE=2 CC_ELP=7 CC_FRAMES=250
job rest_c_s3_e kontakt_b rest_kette.lua CC_STUFE=3 CC_SLOT=17 CC_ELP=12 CC_FRAMES=250
job rest_c_tritt_w kontakt rest_kette.lua CC_STUFE=4 CC_ELP=10 CC_ELP_AB=41 CC_FRAMES=250
job rest_c_tritt_e kontakt_b rest_kette.lua CC_STUFE=4 CC_SLOT=17 CC_ELP=10 CC_ELP_AB=41 CC_FRAMES=250
job rest_c_danach_w kontakt rest_kette.lua CC_STUFE=1 CC_ELP=3 CC_FRAMES=200 CC_IN=a:40-41
job rest_c_danach_e kontakt_b rest_kette.lua CC_STUFE=1 CC_SLOT=17 CC_ELP=3 CC_FRAMES=200 CC_IN=a:60-61
job rest_c_nat_w kontakt rest_frei.lua CC_FRAMES=300 "'CC_IN=a:3-4;a:33-34;a:63-64;j:80-81;a:84-85'"
job rest_c_nat_e kontakt_b rest_frei.lua CC_FRAMES=400 "'CC_IN=a:3-4;a:19-20;a:36-37;a:68-69;a:84-85;a:101-102;a:133-134;a:163-164'"
laufen
$M nulllp $(laeufe rest_c_) > $tmp/c_nulllp.csv
weg rest_c_

# ---------------------------------------------------------------------------
# Teil D: Tod und Neueinstieg. Ohne Eingriff: hurt, hurt_b, hurt_c verlaengert
# (Figur passiv, stirbt zweimal). EINGRIFF CC_PLP=1 in Frame 2 (die Figur stirbt
# dann beim naechsten Treffer, ohne Eingriff in den Tod selbst): Bossarena und
# Stage-Anfang; dazu Rang per EINGRIFF bis kurz vor dem Neueinstieg gehalten
# (7, 9 und 24). Eingaben nach dem Tod: Richtung gehalten, einzelne Drucke um den
# Stand nach der Landung L (hurt_c: L = 1946, hurt: L = 1681). Schutz: EINGRIFF
# CC_SETZE haelt einen Gegner ab L+110 bei dx 40, dz 0.
job rest_d_hurt ingame rest_frei.lua CC_BASIS=hurt.lua CC_FRAMES=2900
job rest_d_hurt_b ingame rest_frei.lua CC_BASIS=hurt_b.lua CC_FRAMES=3800
job rest_d_hurt_c ingame rest_frei.lua CC_BASIS=hurt_c.lua CC_FRAMES=3300
job rest_d_boss p0_s1_s1_cam02048 rest_frei.lua CC_FRAMES=1200 CC_PLP=1:2-2
job rest_d_anfang ingame rest_frei.lua CC_FRAMES=1300 CC_PLP=1:2-2 CC_IN=r:421-540
job rest_d_rang7 ingame rest_frei.lua CC_FRAMES=1300 CC_PLP=1:2-2 CC_IN=r:421-540 CC_RANG=7:2-870
job rest_d_rang24 ingame rest_frei.lua CC_FRAMES=1300 CC_PLP=1:2-2 CC_IN=r:421-540 CC_RANG=24:2-870
job rest_d_rang9 ingame rest_frei.lua CC_FRAMES=1300 CC_PLP=1:2-2 CC_IN=r:421-540 CC_RANG=9:2-870
for k in c h; do
	if [ $k = c ]; then b=hurt_c.lua; t=1741; L=1946; s=18; else b=hurt.lua; t=1508; L=1681; s=14; fi
	job rest_d_${k}_hr ingame rest_frei.lua CC_BASIS=$b CC_FRAMES=$((L + 100)) CC_DUMP_AB=$((t - 50)) CC_IN=r:$((t + 4))-$((L + 100))
	job rest_d_${k}_hu ingame rest_frei.lua CC_BASIS=$b CC_FRAMES=$((L + 100)) CC_DUMP_AB=$((t - 50)) CC_IN=u:$((t + 4))-$((L + 100))
	for F in $(seq -1 7); do
		job rest_d_${k}_a$F ingame rest_frei.lua CC_BASIS=$b CC_FRAMES=$((L + 40)) CC_DUMP_AB=$((t - 50)) CC_IN=a:$((L + F))
		job rest_d_${k}_j$F ingame rest_frei.lua CC_BASIS=$b CC_FRAMES=$((L + 40)) CC_DUMP_AB=$((t - 50)) CC_IN=j:$((L + F))
	done
	job rest_d_${k}_schutz ingame rest_frei.lua CC_BASIS=$b CC_FRAMES=$((L + 320)) CC_DUMP_AB=$((t - 50)) CC_SETZE=$s:40:0:$((L + 110))-$((L + 320))
done
laufen
$M tod $(laeufe rest_d_) > $tmp/d_tod.csv
weg rest_d_

# ---------------------------------------------------------------------------
# Teil E: Rang beim Stage-Wechsel. Bot (grafik/bot.lua mit durchlauf.lua;
# EINGRIFFE des Bots: LP der Figur aufgefuellt, LP der Gegner nach 300 bzw. 900
# Frames Stillstand auf 1) bis zur naechsten Stage. Dazu EINGRIFF: Rang in der
# Bossarena auf 8 bzw. 24 gesetzt, Rangzaehler FFF82C auf 3000 (kein Anstieg
# bis zum Wechsel), Savestate rest_e_r8 / rest_e_r24, dann Bot.
W="rang:FFF82A:1,rz:FFF82C:2,leben:FFAA7C:1"
bot() { CC_NAME=$1 GFA_CFG=scripts/grafik/durchlauf.lua GFA_WATCH=$W GFA_SNAP_EVERY=0 GFA_FRAMES=20000 \
	GFA_CLEAR=${3:-900} scripts/grafik/bot.sh $2 >/dev/null 2>&1 || echo "$1" >> "$fehler"; }
for r in 8 24; do
	job rest_e_setz$r p0_s1_s1_cam02048 rest_frei.lua CC_FRAMES=10 CC_RANG=$r:2-5 CC_POKE=FFF82C:3000:2:2-5 CC_SAVE=8:rest_e_r$r
done
laufen
bot rest_e_boss p0_s1_s1_cam02048 300 &
bot rest_e_s1 stage1 &
bot rest_e_s2 p0_s1_s2_cam00256 &
wait
bot rest_e_r8 rest_e_r8 300 &
bot rest_e_r24 rest_e_r24 300 &
wait
[ -s "$fehler" ] && { cat "$fehler" >&2; exit 1; }
$M stagewechsel $raw/rest_e_boss_bot.csv $raw/rest_e_s1_bot.csv $raw/rest_e_s2_bot.csv \
	$raw/rest_e_r8_bot.csv $raw/rest_e_r24_bot.csv > $tmp/e_stage.csv
for n in boss s1 s2 r8 r24; do grep -h "EINGRIFF\|stage\|control" $raw/rest_e_${n}_events.txt | sed "s/^/rest_e_$n: /"; done > $tmp/e_events.txt
weg rest_e_

# ---------------------------------------------------------------------------
# Teil F: Nachpruefungen.
# F1 Mindestabstand Stufe 1 (EINGRIFF CC_DX, CC_DZ=0 wie kette.lua), dazu
#    Stufe 2-4 bei dx 0 und -20.
# F2 Blick links: Figur dreht sich in Frame 2 (links, 1 Frame), Gegner per
#    EINGRIFF links vor ihr (Vorstufen bei dx -46, CC_VOR_DX), Stufe 1-4 an der
#    Grenze; Sprungangriff neutral und Richtung (Sprung mit links) in A+5.
# F3 Richtung beim Kettendruck (ohne Eingriff): r zum Gegner, l weg, u, d;
#    Folgedruck nach l und r; aktive Frames des Ausfallschritts (EINGRIFF
#    CC_DX=26, CC_FERN=n).
# F4 Treffer in der Luft (ohne Eingriff): Sprung so, dass der Gegnerschlag die
#    Figur in der Luft trifft; Referenz ohne Sprung.
# F5 Gleichzeitiger Treffer: Schlag so, dass sein Treffer (P+2) in den ersten
#    aktiven Frame des Gegnerschlags faellt (ohne Eingriff), und mit EINGRIFF auf
#    die Lage des Gegners vor seinem Angriff (CC_SETZE).
for g in w e; do
	if [ $g = w ]; then st=kontakt; ex=""; else st=kontakt_b; ex="CC_SLOT=17"; fi
	for dx in $(seq -34 -16) 0 10 20 30 40; do
		job rest_f1_${g}_s1_${dx/-/m} $st rest_kette.lua CC_STUFE=1 CC_DX=$dx CC_DZ=0 CC_FRAMES=20 $ex
	done
	for k in 2 3 4; do for dx in 0 -20; do
		job rest_f1_${g}_s${k}_${dx/-/m} $st rest_kette.lua CC_STUFE=$k CC_DX=$dx CC_DZ=0 CC_FRAMES=20 $ex
	done; done
	for k in 1 2 3 4; do
		case $k in 1) r="80 81 82 83 84 85 86 87";; 2) r="85 86 87 88 89";; 3) r="89 90 91 92 93";; 4) r="98 99 100 101 102";; esac
		for d in $r; do
			job rest_f2_${g}_s${k}_$d $st rest_kette.lua CC_STUFE=$k CC_P1=5 CC_IN=l:2 CC_VOR_DX=-46 CC_DX=-$d CC_DZ=0 CC_FRAMES=20 $ex
		done
	done
	J=4; A=10; w2=""; [ $g = e ] && w2="CC_WEG=16"
	for d in 70 71 72 73 74 75 76 77 78; do
		job rest_f2j_${g}_neutral_x5_m$d $st rest_sprung.lua CC_IN=l:2 CC_J=$J CC_A=$A CC_DX=-$d CC_DZ=0 CC_FERN_BIS=$((A + 4)) CC_NAH_BIS=$((A + 5)) $ex $w2
	done
	for d in 97 98 99 100 101; do
		job rest_f2j_${g}_richtung_x5_m$d $st rest_sprung.lua CC_IN=l:2 CC_J=$J CC_DIR=l CC_A=$A CC_DX=-$d CC_DZ=0 CC_FERN_BIS=$((A + 4)) CC_NAH_BIS=$((A + 5)) $ex $w2
	done
	for k in 2 3 4; do
		for dir in r l u d; do job rest_f3_${g}_s${k}_$dir $st rest_kette.lua CC_STUFE=$k CC_DRUCKDIR=$dir CC_FRAMES=60 $ex; done
		job rest_f3_${g}_s${k}_l_a16 $st rest_kette.lua CC_STUFE=$k CC_DRUCKDIR=l CC_FRAMES=60 CC_NACH=a:16 $ex
		job rest_f3_${g}_s${k}_r_a20 $st rest_kette.lua CC_STUFE=$k CC_DRUCKDIR=r CC_FRAMES=60 CC_NACH=a:20 $ex
	done
done
for k in 2 3 4; do for n in $(seq 0 12); do
	job rest_f3a_w_s${k}_fern$n kontakt rest_kette.lua CC_STUFE=$k CC_DRUCKDIR=r CC_DX=26 CC_DZ=0 CC_FERN=$n CC_POKE_BIS=16 CC_FRAMES=30
done; done
job rest_f4_w_0 kontakt rest_frei.lua CC_FRAMES=150
job rest_f4_e_0 kontakt_b rest_frei.lua CC_FRAMES=170
for J in 18 20 22 24 26 58 62; do job rest_f4_w_j$J kontakt rest_frei.lua CC_FRAMES=150 CC_IN=j:$J-$((J + 1)); done
for J in 34 36 38 40 42; do job rest_f4_e_j$J kontakt_b rest_frei.lua CC_FRAMES=170 CC_IN=j:$J-$((J + 1)); done
for P in 24 25 26 27 28; do job rest_f5_w_p$P kontakt rest_frei.lua CC_FRAMES=60 CC_IN=a:$P-$((P + 1)); done
for P in 40 41 42 43 44; do job rest_f5_e_p$P kontakt_b rest_frei.lua CC_FRAMES=80 CC_IN=a:$P-$((P + 1)); done
for dx in 20 70; do
	job rest_f5_wdx${dx}_ref kontakt rest_frei.lua CC_FRAMES=60 CC_SETZE=18:$dx:0:2-12
	for P in 26 27; do job rest_f5_wdx${dx}_p$P kontakt rest_frei.lua CC_FRAMES=60 CC_SETZE=18:$dx:0:2-12 CC_IN=a:$P-$((P + 1)); done
done
for dx in 20 30; do
	job rest_f5_edx${dx}_ref kontakt_b rest_frei.lua CC_FRAMES=80 CC_SETZE=17:$dx:0:2-20
	for P in 33 34; do job rest_f5_edx${dx}_p$P kontakt_b rest_frei.lua CC_FRAMES=80 CC_SETZE=17:$dx:0:2-20 CC_IN=a:$P-$((P + 1)); done
done
laufen
$M probe $(laeufe rest_f1_) $(laeufe rest_f2_) > $tmp/f12_probe.csv
$M sprung $(laeufe rest_f2j_) > $tmp/f2j_sprung.csv
$M richtung $(laeufe rest_f3_) > $tmp/f3_richtung.csv
$M probe --bis 14 $(laeufe rest_f3a_) > $tmp/f3a_probe.csv
$M gegentreffer $(laeufe rest_f4_) $(laeufe rest_f5_) > $tmp/f45_gegen.csv
weg rest_f


# ---------------------------------------------------------------------------
# Teil M3: dritte Messung zu den drei Abweichungen der Gegenpruefung (D1, D4,
# F1). Andere Savestates, Gegner, Todesursachen, Orte und Frames als in Teil D,
# F und V.
# D1: Tod an 19 Stellen (Savestates aus Stage 1, 4, 5, 9 anderer Belegskripte),
#     EINGRIFF LP der Figur in Frame 2 auf 1, der Tod kommt vom naechsten
#     natuerlichen Treffer (WOOKY, EDDY, SKIP mit Messer, Mech, Gegner aus Stage
#     5 und 9). Dazu kontrolliert an der diagonalen Stage-1-Wand (x um 1016 bei
#     Tiefe >= 330): ab tiefe_b Figur per EINGRIFF auf x 930 bzw. 960 und Tiefe 340
#     (Wand) bzw. 320 (keine Wand), EDDY bis Frame 12 45 px links von ihr.
M3_TOD="item_bot1_s1_cam00321 item_bot1_s1_cam00513 item_bot1_s1_cam00768 item_bot1_s1_cam00832
	item_bot1_s1_cam00960 item_bot1_s1_cam01153 item_bot1_s1_cam01216 item_bot1_s1_cam01344
	item_bot1_s1_cam01408 item_v_b1_s1_cam01345 item_v_b1_s1_cam01440 greichweite_v_wk2_r
	greichweite_v_wc_r greichweite_v_eb_l greichweite_v_sm_r greichweite_v_sw_r stage4 stage5 stage9"
for st in $M3_TOD; do job rest_m3_d1_$st $st rest_frei.lua CC_FRAMES=1400 CC_PLP=1:2-2; done
for x in 930 960; do for z in 320 340; do
	job rest_m3_d1_wand_${x}_$z tiefe_b rest_frei.lua CC_FRAMES=400 CC_PLP=1:2-2 \
		CC_POKE=FFA99E:$x:2:2-3,FFA9A0:0:2:2-3,FFA9A6:$z:2:2-3,FFA9A8:0:2:2-3 CC_SETZE=17:-45:0:2-12
done; done
# D4: Neueinstieg ab hurt_b (Tod 1855, Erscheinen 1976 bei x 914, Tiefe 304); EINGRIFF: Oelfass aus
#     Slot 43 ab dem Erscheinen um dx/dz gegen den Erscheinungsort versetzt (Name: Fass minus Ort).
for v in 0:0 0:1 0:8 0:16 0:17 0:20 -40:8 -39:8 -38:8 -37:8 -36:8 -35:8 -34:8 -33:8 -32:8 32:8 33:8 34:8 35:8 36:8 37:8 38:8 39:8 40:8; do
	dx=${v%:*}; dz=${v#*:}
	job rest_m3_d4_fass_${dx/-/m}_$dz ingame rest_frei.lua CC_BASIS=hurt_b.lua CC_FRAMES=2040 CC_DUMP_AB=1800 \
		CC_POKE=FFDCDE:$((914 + dx)):2:1976-2040,FFDCE6:$((304 + dz)):2:1976-2040
done
# F1: Stufe 1 bis 4 hinter der Figur ab reaktion_w3 (WOOKY, Slot 18) und tiefe_b (EDDY, Slot 17,
#     erster Druck in Frame 20). EINGRIFF: Gegner fuer die Vorstufen bei dx 46, fuer die gepruefte
#     Stufe bei dx (CC_DX, Tiefe 0), Blickrichtung des Gegners per CC_GBLICK gesetzt (r = zur Figur,
#     l = weg) oder natuerlich (x); Kettendruck 14 (Gegner in der Trefferreaktion) bzw. 25 Frames
#     (Gegner frei) nach dem Treffer der Vorstufe.
for g in w e; do
	if [ $g = w ]; then st=reaktion_w3; ex="CC_P1=3"; else st=tiefe_b; ex="CC_SLOT=17 CC_P1=20"; fi
	for k in 1 2 3 4; do
		for dx in -24 -25 -26 -27 -28 -29 -30; do
			job rest_m3_f1_${g}_s${k}_r_${dx/-/m} $st rest_kette.lua CC_STUFE=$k CC_ABSTAND=14 CC_VOR_DX=46 CC_DX=$dx CC_DZ=0 CC_FRAMES=20 CC_GBLICK=r $ex
		done
		for dx in 0 -1 -2 -3 -4 -5 -6; do
			job rest_m3_f1_${g}_s${k}_l_${dx/-/m} $st rest_kette.lua CC_STUFE=$k CC_ABSTAND=14 CC_VOR_DX=46 CC_DX=$dx CC_DZ=0 CC_FRAMES=20 CC_GBLICK=l $ex
		done
		for a in 14 25; do
			[ $k = 1 ] && [ $a = 25 ] && continue
			for b in x r l; do
				bl=""; [ $b != x ] && bl="CC_GBLICK=$b"
				job rest_m3_f1z_${g}_s${k}_a${a}_$b $st rest_kette.lua CC_STUFE=$k CC_ABSTAND=$a CC_VOR_DX=46 CC_DX=-20 CC_DZ=0 CC_FRAMES=20 $ex $bl
			done
		done
	done
done
laufen
$M todesart $(laeufe rest_m3_d1_) > $tmp/m3_todesart.csv
$M tod $(laeufe rest_m3_d1_) $(laeufe rest_m3_d4_) > $tmp/m3_tod.csv
$M probe $(laeufe rest_m3_f1_) > $tmp/m3_f1_probe.csv
$M grenzen $tmp/m3_f1_probe.csv > $tmp/m3_f1_grenzen.csv
$M probe $(laeufe rest_m3_f1z_) > $tmp/m3_f1z_probe.csv
weg rest_m3_

# ---------------------------------------------------------------------------
{
	echo "# Rest der Spielfigur (Captain Commando, Praefix rest), erzeugt von scripts/belege_rest.sh."
	echo "# Frames lokal je Lauf; D = letzter Kettendruck, h = Frame des LP-Verlusts, A/J = Angriffs-/Sprungdruck,"
	echo "# T = Probeframe, t = Frame, in dem die LP der Figur unter 0 fallen, L = Landung nach dem Neueinstieg."
	echo "# Abstaende dx/dz = Gegner minus Figur, ganzzahlig am Frame-Ende; Hoehe = ganzzahliges Hoehenwort."
	echo "#"
	echo "# Teil A: Nachlauf der Kettenstufen 2-4, Stufe 1 zur Kontrolle (rest_kette.lua). Gruppe rest_a_<g>_s<k>_<fall>: g w = kontakt"
	echo "# (WOOKY, Druecke 14 Frames nach dem Treffer), e = kontakt_b (EDDY, 18 Frames); fall t = Treffer,"
	echo "# l = Leerschlag (EINGRIFF CC_LEER: Gegner ab dem Treffer der Vorstufe 200 px entfernt), z = Tritt trifft"
	echo "# erst im zweiten Fenster (EINGRIFF CC_DX=60, CC_FERN=16). angriff_ab/sprung_ab = fruehester Druck"
	echo "# (D+F), der in F+1 wirkt; links/rechts/hoch = erste Bewegung bei ab D+2 gehaltener Richtung."
	cat $tmp/a_zus.csv
	echo "# Teil A, je Lauf (messen_rest.py nachlauf)"
	cat $tmp/a_nachlauf.csv
	echo "#"
	echo "# Teil B: Sprungangriff hoch (CC_DIR=u im Frame des Sprungdrucks) und runter (CC_ADIR=d mit dem Angriff)."
	echo "# EINGRIFF: Gegner nur im Probeframe T bei dx/dz, sonst 200 px entfernt (ab kontakt_b WOOKY Slot 16"
	echo "# 300 px entfernt). Gruppen rest_b_<g>_<var>_a<A-J> (aktive Frames), _x<T-A> (x), _xg (grob),"
	echo "# _z<T-A> (Tiefe vorn bei dx 30), _zh<T-A> (Tiefe hinten bei dx -20). rest_b_nat_*: ohne Eingriff."
	cat $tmp/b_zus.csv
	echo "# Teil B, je Lauf (messen_rest.py sprung)"
	cat $tmp/b_sprung.csv
	echo "#"
	echo "# Teil C: Gegner mit genau 0 LP (messen_rest.py nulllp). rest_c_s1/s2/s3/tritt_*: EINGRIFF CC_ELP (LP vor"
	echo "# dem Treffer so gesetzt, dass er genau 0 ergibt); rest_c_danach_*: dazu ein weiterer Schlag;"
	echo "# rest_c_nat_*: ohne Eingriff. status_folge = Frame relativ zu null_frame: S+4/Aktion S+0x0A."
	cat $tmp/c_nulllp.csv
	echo "#"
	echo "# Teil D: Tod und Neueinstieg der Figur (messen_rest.py tod). rest_d_hurt*: ohne Eingriff. rest_d_boss,"
	echo "# rest_d_anfang: EINGRIFF LP der Figur in Frame 2 auf 1. rest_d_rang7/9/24: dazu EINGRIFF Rang bis Frame 870"
	echo "# gehalten. rest_d_<c|h>_*: Eingaben nach dem Tod (hr/hu Richtung ab t+4 gehalten, aF/jF ein Druck in"
	echo "# L+F); rest_d_*_schutz: EINGRIFF, ein Gegner ab L+110 bei dx 40/dz 0 gehalten."
	cat $tmp/d_tod.csv
	echo "#"
	echo "# Teil E: Rang FFF82A beim Wechsel des Stage-Index FFA8CE (Bot; EINGRIFFE des Bots: LP der Figur"
	echo "# aufgefuellt, LP der Gegner nach Stillstand auf 1). rest_e_r8/r24: EINGRIFF Rang 8 bzw. 24 und"
	echo "# Rangzaehler 3000 in der Bossarena, danach Bot."
	cat $tmp/e_stage.csv
	echo "# Teil E, Ereignisse der Bot-Laeufe"
	sed 's/^/# /' $tmp/e_events.txt
	echo "#"
	echo "# Teil F1/F2: Mindestabstand (rest_f1_*, EINGRIFF CC_DX/CC_DZ) und Blick links (rest_f2_*, EINGRIFF,"
	echo "# Figur in Frame 2 nach links gedreht) je Stufe (messen_rest.py probe)."
	cat $tmp/f12_probe.csv
	echo "# Teil F2: Sprungangriff mit Blick links (rest_f2j_*, Probe in A+5)"
	cat $tmp/f2j_sprung.csv
	echo "# Teil F3: Richtung beim Kettendruck (rest_f3_*, ohne Eingriff; messen_rest.py richtung)"
	cat $tmp/f3_richtung.csv
	echo "# Teil F3: aktive Frames des Ausfallschritts (rest_f3a_*, EINGRIFF CC_DX=26, CC_FERN=n)"
	cat $tmp/f3a_probe.csv
	echo "# Teil F4/F5: Treffer in der Luft (rest_f4_*, ohne Eingriff) und gleichzeitiger Treffer (rest_f5_*;"
	echo "# rest_f5_?dx*: EINGRIFF Lage des Gegners vor seinem Angriff); messen_rest.py gegentreffer"
	cat $tmp/f45_gegen.csv
	echo "#"
	echo "# Teil M3: dritte Messung zu D1, D4, F1 (Praefix rest_m3)."
	echo "# D1 (messen_rest.py todesart): Tod an 19 Stellen (EINGRIFF LP 1 in Frame 2, Tod durch den naechsten"
	echo "# natuerlichen Treffer) und an der Stage-1-Wand (rest_m3_d1_wand_<x>_<z>, EINGRIFF Lage der Figur und"
	echo "# des EDDY). Klasse nach der Regel: Klinge (Attribut-Bit 0x8000) 107, Wand (Flug endet vor t+40 an einer"
	echo "# Begrenzung, die keine Bildkante ist) 108, Rollen (Reaktion 4 in t) 151/152, sonst normal 120/121."
	cat $tmp/m3_todesart.csv
	echo "# D1 und D4 (messen_rest.py tod): rest_m3_d4_fass_<dx>_<dz>: EINGRIFF Oelfass Slot 43 ab dem Erscheinen"
	echo "# um dx/dz gegen den Erscheinungsort (x 914, Tiefe 304) versetzt. Spalten landung_rel_erscheinen, hoehe_L."
	cat $tmp/m3_tod.csv
	echo "# F1 (messen_rest.py grenzen): Treffer der gepruefenten Stufe hinter der Figur, Gegner per EINGRIFF bei dx,"
	echo "# Blickrichtung r (zur Figur) bzw. l (weg) gesetzt; g w = reaktion_w3 (WOOKY), e = tiefe_b (EDDY)."
	cat $tmp/m3_f1_grenzen.csv
	echo "# F1 je Lauf (messen_rest.py probe)"
	cat $tmp/m3_f1_probe.csv
	echo "# F1 bei dx -20: Gegner in der Trefferreaktion (a14) oder frei (a25), Blick natuerlich (x) oder gesetzt"
	cat $tmp/m3_f1z_probe.csv
} > $out

# ---------------------------------------------------------------------------
# Teil V: Gegenpruefung V8 (Praefix rest_v). Eigene Laeufe mit
# scenarios/rest_v_frei.lua (nur Watch-Protokoll) und scenarios/rest_v_bot.lua,
# andere Savestates, Startframes, Abstaende und Eingriffe als oben; Auswertung
# mit messen_rest_v.py nach logs/rest_v.csv. Zeitangaben in CC_IN, CC_SETZE usw.
# relativ zu Ereignissen (lpN#k = k-ter LP-Verlust von Slot N, plp, hoch =
# Erscheinen nach dem Neueinstieg), siehe Kopf von rest_v_frei.lua.
# EINGRIFFE stehen im Laufnamen und im Kopf jedes Abschnitts von logs/rest_v.csv.
outv=logs/rest_v.csv
vjob() { job "$@"; }
# Teil A (Nachlauf): Gruppe g, Savestate, Slot, erster Druck, Folgedruecke o2..o4 nach dem Treffer
# der Vorstufe, Richtung der Tiefenprobe, Tiefe des Gegners fuer den Fall z
v_teil_a() {
	local g=$1 st=$2 sl=$3 p1=$4 o2=$5 o3=$6 o4=$7 hz=$8 z0=$9 k kette ref off aw jw e n vor og leer zw
	for k in 2 3 4; do
		kette="$p1:a"
		[ $k -ge 2 ] && kette="$kette;lp$sl#1+$o2:a"
		[ $k -ge 3 ] && kette="$kette;lp$sl#2+$o3:a"
		[ $k -ge 4 ] && kette="$kette;lp$sl#3+$o4:a"
		if [ $k -lt 4 ]; then ref="lp$sl#$k"; off=0; aw="9 10 11 12"; jw="10 11 12"
		else ref="lp$sl#3"; off=$o4; aw="31 32 33 34"; jw="32 33 34"; fi
		n=rest_v_a_${g}_s${k}_t
		vjob ${n}_o $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette'"
		for e in $aw; do vjob ${n}_a$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$ref+$((off+e))..$ref+$((off+e)):a'"; done
		for e in $jw; do vjob ${n}_j$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$ref+$((off+e))..$ref+$((off+e)):j'"; done
		vjob ${n}_hl $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$ref+$((off+2))..$ref+$((off+50)):l'"
		vjob ${n}_h$hz $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$ref+$((off+2))..$ref+$((off+50)):$hz'"
		# Leerschlag der Stufe k: EINGRIFF Gegner ab h der Vorstufe + 1 um 40 px in die Tiefe versetzt
		vor="lp$sl#$((k-1))"; og=$(eval echo \$o$k); leer="CC_SETZE=$sl::40:$vor+1..400"
		case $k in 2) aw="6 7 8";; 3) aw="7 8 9";; 4) aw="25 26 27";; esac
		n=rest_v_a_${g}_s${k}_l
		vjob ${n}_o $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette'" "'$leer'"
		for e in $aw; do vjob ${n}_a$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$vor+$((og+e))..$vor+$((og+e)):a'" "'$leer'"; done
		for e in $aw; do vjob ${n}_j$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$vor+$((og+e))..$vor+$((og+e)):j'" "'$leer'"; done
		for e in l r u; do vjob ${n}_h$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;$vor+$((og+2))..$vor+$((og+40)):$e'" "'$leer'"; done
	done
	# Tritt trifft erst im zweiten Fenster: EINGRIFF Gegner D+1 bis D+10 um 40 px in der Tiefe versetzt, D+11 bis D+24 bei dz z0
	kette="$p1:a;lp$sl#1+$o2:a;lp$sl#2+$o3:a;lp$sl#3+$o4:a"
	zw="CC_SETZE=$sl::40:lp$sl#3+$((o4+1))..lp$sl#3+$((o4+10));$sl::$z0:lp$sl#3+$((o4+11))..lp$sl#3+$((o4+24))"
	n=rest_v_a_${g}_s4_z
	vjob ${n}_o $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette'" "'$zw'"
	for e in 32 33 34; do vjob ${n}_a$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;lp$sl#3+$((o4+e))..lp$sl#3+$((o4+e)):a'" "'$zw'"; done
	for e in 33 34; do vjob ${n}_j$e $st rest_v_frei.lua CC_FRAMES=320 CC_SLOTS=16-19 "'CC_IN=$kette;lp$sl#3+$((o4+e))..lp$sl#3+$((o4+e)):j'" "'$zw'"; done
}
v_teil_a e anlauf_c 17 40 16 13 20 d 0
v_teil_a w anlauf 18 42 20 12 15 u 10
# Teil B (Sprungangriff hoch/runter): EINGRIFF Gegner bis F-1 und ab F+1 200 px vor (Seite v)
# bzw. hinter (Seite h) der Figur, im Probeframe F = A+m bei dx/dz
v_bprobe() { # g st sl J v a m dx dz seite
	local g=$1 st=$2 sl=$3 J=$4 v=$5 a=$6 m=$7 dx=$8 dz=$9 seite=${10} A F weg=200 in
	A=$((J+a)); F=$((J+a+m)); [ "$seite" = h ] && weg=-200
	if [ $v = h ]; then in="$J..$J:j+u;$A..$A:a"; else in="$J..$J:j;$A..$A:a+d"; fi
	vjob rest_v_b_${g}_${v}${a}_${m}_${dx/-/n}_${dz/-/n}_$seite $st rest_v_frei.lua CC_FRAMES=$((J+80)) CC_SLOTS=16-19 \
		"'CC_IN=$in'" "'CC_SETZE=$sl:$weg:0:2..$((F-1));$sl:$dx:$dz:$F..$F;$sl:$weg:0:$((F+1))..$((J+80))'"
}
v_teil_b() { # g st sl J
	local g=$1 st=$2 sl=$3 J=$4 a m dx dz
	for a in 1 6 24; do for m in 5 6 7 8 9 10 11 12; do v_bprobe $g $st $sl $J h $a $m 40 0 v; done; done
	for m in 7 8; do v_bprobe $g $st $sl $J h 10 $m 40 0 v; done
	for m in 8 9; do v_bprobe $g $st $sl $J h 18 $m 40 0 v; done
	for m in 7 8 9 10; do v_bprobe $g $st $sl $J h 12 $m 40 0 v; done
	for dx in 84 85 86 87 88 89 90; do v_bprobe $g $st $sl $J h 1 8 $dx 0 v; done
	for dx in -31 -32 -33 -34; do v_bprobe $g $st $sl $J h 1 8 $dx 0 v; v_bprobe $g $st $sl $J h 1 8 $dx 0 h; done
	for dx in 85 86 87 88 89; do v_bprobe $g $st $sl $J h 6 9 $dx 0 v; done
	for dx in -32 -33; do v_bprobe $g $st $sl $J h 6 9 $dx 0 h; done
	for dz in 11 12 13 -12 -13; do v_bprobe $g $st $sl $J h 1 8 40 $dz v; done
	for dz in 12 13 -12 -13; do v_bprobe $g $st $sl $J h 1 8 -20 $dz h; done
	for m in 8 9 10 11 28 32 33; do v_bprobe $g $st $sl $J r 3 $m 20 0 v; done
	for m in 10 11 18 22 23; do v_bprobe $g $st $sl $J r 20 $m 20 0 v; done
	for dx in 41 42 43 44; do v_bprobe $g $st $sl $J r 3 9 $dx 0 v; done
	for dx in -40 -41 -42 -43; do v_bprobe $g $st $sl $J r 3 9 $dx 0 h; v_bprobe $g $st $sl $J r 3 9 $dx 0 v; done
	for dx in 42 43; do v_bprobe $g $st $sl $J r 20 18 $dx 0 v; done
	for dx in -41 -42; do v_bprobe $g $st $sl $J r 20 18 $dx 0 h; done
	for dz in 11 12 13 -12 -13; do v_bprobe $g $st $sl $J r 3 9 20 $dz v; done
	for dz in 12 13 -13; do v_bprobe $g $st $sl $J r 3 9 -20 $dz h; done
}
v_teil_b w anlauf_b 18 10
v_teil_b e tiefe_b 17 12
vjob rest_v_b_nat_e_h anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=40..40:j+u;41..41:a'"
vjob rest_v_b_nat_e_hlang anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=37..43:u;40..40:j;44..44:a'"
vjob rest_v_b_nat_e_uA anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=40..40:j;41..41:a+u'"
vjob rest_v_b_nat_e_hdiag anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=40..40:j+u+r;41..41:a'"
vjob rest_v_b_nat_e_n anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=40..40:j;41..41:a'"
vjob rest_v_b_nat_e_r anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=36..39:r;42..42:j;45..45:a+d'"
vjob rest_v_b_nat_e_rri anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=36..39:r;42..42:j+r;45..45:a+d'"
vjob rest_v_b_nat_e_dJ anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=36..39:r;42..42:j+d;45..45:a'"
vjob rest_v_b_nat_e_rlang anlauf_c rest_v_frei.lua CC_FRAMES=130 "'CC_IN=36..39:r;42..42:j;43..47:d;45..45:a'"
vjob rest_v_b_nat_w_h anlauf_b rest_v_frei.lua CC_FRAMES=130 "'CC_IN=42..42:j+u;43..43:a'"
vjob rest_v_b_nat_w_r anlauf_b rest_v_frei.lua CC_FRAMES=130 "'CC_IN=38..41:r;43..43:j;46..46:a+d'"
vjob rest_v_b_nat_w_rri anlauf_b rest_v_frei.lua CC_FRAMES=130 "'CC_IN=38..41:r;43..43:j+r;46..46:a+d'"
# Teil C (Gegner mit genau 0 LP); EINGRIFF CC_GLP nur in *_glp
vjob rest_v_c_w_nat anlauf_b rest_v_frei.lua CC_FRAMES=900 CC_SLOTS=16-19 "'CC_IN=42:a;lp18#1+30:a;lp18#2+30:a;lp18#3+30:a;lp18#4+14:a;plp#3+35:a'"
vjob rest_v_c_w_vgl anlauf_b rest_v_frei.lua CC_FRAMES=900 CC_SLOTS=16-19 "'CC_IN=42:a;lp18#1+30:a;lp18#2+30:a;lp18#3+30:a'"
vjob rest_v_c_e_nat anlauf_c rest_v_frei.lua CC_FRAMES=1500 CC_SLOTS=16-19 "'CC_IN=40:a;lp17#1+16:a;lp17#2+13:a;lp17#3+30:a;lp17#4+30:a;lp17#5+30..lp17#5+30:j+u;lp17#5+31..lp17#5+31:a'"
vjob rest_v_c_e_vgl anlauf_c rest_v_frei.lua CC_FRAMES=1500 CC_SLOTS=16-19 "'CC_IN=40:a;lp17#1+16:a;lp17#2+13:a;lp17#3+30:a;lp17#4+30..lp17#4+30:j+u;lp17#4+31..lp17#4+31:a'"
vjob rest_v_c_e_tod anlauf_c rest_v_frei.lua CC_FRAMES=600 CC_SLOTS=16-19 "'CC_IN=40:a;lp17#1+16:a;lp17#2+13:a;lp17#3+30:a;lp17#4+30:a;lp17#5+30:a;lp17#6+15:a;lp17#7+14:a;lp17#8+30:a'"
vjob rest_v_c_w_glp anlauf_b rest_v_frei.lua CC_FRAMES=600 CC_SLOTS=16-19 "'CC_IN=42:a;lp18#1+14:a;lp18#2+85..lp18#2+85:a'" "'CC_GLP=18:7:2'"
vjob rest_v_c_e_glp anlauf_c rest_v_frei.lua CC_FRAMES=1200 CC_SLOTS=16-19 "'CC_IN=40:a;lp17#1+16:a;lp17#2+13:a;lp17#3+20:a'" "'CC_GLP=17:22:2'"
# Teil D (Tod und Neueinstieg); EINGRIFF CC_PLP (LP der Figur in einem Frame), CC_POKE, CC_RANG, CC_SETZE wie im Namen
vjob rest_v_d_e anlauf_c rest_v_frei.lua CC_FRAMES=900 CC_SLOTS=0-19 "'CC_PLP=4:50..50'"
vjob rest_v_d_768 p0_s1_s1_cam00768 rest_v_frei.lua CC_FRAMES=3000 CC_SLOTS=0-19
vjob rest_v_d_boss item_v_b1_s1_cam02016 rest_v_frei.lua CC_FRAMES=900 CC_SLOTS=0-19 "'CC_IN=2..40:r'" "'CC_PLP=4:100..100'"
vjob rest_v_d_1281 p0_s1_s1_cam01281 rest_v_frei.lua CC_FRAMES=1500 CC_SLOTS=0-19 "'CC_IN=2..200:r'" "'CC_PLP=4:400..400'"
vjob rest_v_d_1281b p0_s1_s1_cam01281 rest_v_frei.lua CC_FRAMES=1500 CC_SLOTS=0-19 "'CC_IN=2..150:r'" "'CC_PLP=4:300..300'"
vjob rest_v_d_1281n p0_s1_s1_cam01281 rest_v_frei.lua CC_FRAMES=4000 CC_SLOTS=0-19 "'CC_IN=2..200:r'"
vjob rest_v_d_tb tiefe_b rest_v_frei.lua CC_FRAMES=900 CC_SLOTS=0-19 "'CC_PLP=4:100..100'"
vjob rest_v_d_e2 anlauf_c rest_v_frei.lua CC_FRAMES=1400 CC_SLOTS=0-19 "'CC_PLP=4:50..50'" "'CC_POKE=FFA9D0:2:2:hoch#1+300..hoch#1+300;FFA9D2:2:2:hoch#1+300..hoch#1+300'"
vjob rest_v_d_e_r8 anlauf_c rest_v_frei.lua CC_FRAMES=500 CC_SLOTS=0-19 "'CC_PLP=4:50..50'" "'CC_RANG=8:60..60'"
vjob rest_v_d_e_r22 anlauf_c rest_v_frei.lua CC_FRAMES=500 CC_SLOTS=0-19 "'CC_PLP=4:50..50'" "'CC_RANG=22:60..60'"
vjob rest_v_d_e_schutz anlauf_c rest_v_frei.lua CC_FRAMES=900 CC_SLOTS=0-19 "'CC_PLP=4:50..50'" "'CC_SETZE=17:45:0:hoch#1+92..hoch#1+312'"
for st in "e anlauf_c 4:50..50" "tb tiefe_b 4:100..100"; do
	set -- $st
	for k in 20 51 52 56 57 58 59; do vjob rest_v_d_${1}_a$k $2 rest_v_frei.lua CC_FRAMES=500 CC_SLOTS=0-19 "'CC_PLP=$3'" "'CC_IN=hoch#1+$k..hoch#1+$k:a'"; done
	for k in 30 51 52 56 57 58 59; do vjob rest_v_d_${1}_j$k $2 rest_v_frei.lua CC_FRAMES=500 CC_SLOTS=0-19 "'CC_PLP=$3'" "'CC_IN=hoch#1+$k..hoch#1+$k:j'"; done
	for r in r l u d; do vjob rest_v_d_${1}_h$r $2 rest_v_frei.lua CC_FRAMES=500 CC_SLOTS=0-19 "'CC_PLP=$3'" "'CC_IN=hoch#1+5..hoch#1+90:$r'"; done
done
# Teil F1 (Mindestabstand): Stufe 1 mit Gegner nur in P+2 bei dx; Stufen 2-4 mit Gegner in seiner
# Trefferreaktion (f1) bzw. frei und zur Figur gedreht (f1b, spaeter Kettendruck)
for g in "e anlauf_c 17 20" "w anlauf_b 18 20"; do
	set -- $g
	for dx in 0 -10 -27 -28 -29 -30 84 85 86 87 88; do
		vjob rest_v_f1_${1}_s1_${dx/-/n} $2 rest_v_frei.lua CC_FRAMES=$(($4+40)) CC_SLOTS=16-19 "'CC_IN=$4:a'" "'CC_SETZE=$3:200:0:2..$(($4+1));$3:$dx:0:$(($4+2))..$(($4+2));$3:200:0:$(($4+3))..$(($4+40))'"
	done
done
v_f1k() { # g st sl kette k ref off dx
	vjob rest_v_f1_${1}_s${5}_${8/-/n} $2 rest_v_frei.lua CC_FRAMES=300 CC_SLOTS=16-19 "'CC_IN=$4'" "'CC_SETZE=$3:$8:0:$6+$(($7+1))..$6+$(($7+21))'"
}
for dx in 0 -20; do
	v_f1k e anlauf_c 17 "40:a;lp17#1+15:a" 2 lp17#1 15 $dx
	v_f1k e anlauf_c 17 "40:a;lp17#1+15:a;lp17#2+16:a" 3 lp17#2 16 $dx
	v_f1k e anlauf_c 17 "40:a;lp17#1+15:a;lp17#2+16:a;lp17#3+14:a" 4 lp17#3 14 $dx
	v_f1k w anlauf_b 18 "42:a;lp18#1+18:a" 2 lp18#1 18 $dx
	v_f1k w anlauf_b 18 "42:a;lp18#1+18:a;lp18#2+13:a" 3 lp18#2 13 $dx
	v_f1k w anlauf_b 18 "42:a;lp18#1+18:a;lp18#2+13:a;lp18#3+17:a" 4 lp18#3 17 $dx
done
for g in "e anlauf_c 17 40" "w anlauf_b 18 42"; do
	set -- $g
	for dx in -20 -22 -24 -25 -26 -27 -28 -29 -35; do
		vjob rest_v_f1b_${1}_s2_${dx/-/n} $2 rest_v_frei.lua CC_FRAMES=300 CC_SLOTS=16-19 "'CC_IN=$4:a;lp$3#1+25:a'" "'CC_SETZE=$3:$dx:0:lp$3#1+26..lp$3#1+34'"
		vjob rest_v_f1b_${1}_s3_${dx/-/n} $2 rest_v_frei.lua CC_FRAMES=300 CC_SLOTS=16-19 "'CC_IN=$4:a;lp$3#1+15:a;lp$3#2+24:a'" "'CC_SETZE=$3:$dx:0:lp$3#2+25..lp$3#2+33'"
		vjob rest_v_f1b_${1}_s4_${dx/-/n} $2 rest_v_frei.lua CC_FRAMES=300 CC_SLOTS=16-19 "'CC_IN=$4:a;lp$3#1+15:a;lp$3#2+16:a;lp$3#3+24:a'" "'CC_SETZE=$3:$dx:0:lp$3#3+25..lp$3#3+46'"
	done
done
# Teil F2 (Blick links, Drehung mit links in Frame 10): EINGRIFF Gegner links der Figur
v_f2k() { # g st sl kette k ref off erst dx
	local g=$1 st=$2 sl=$3 kette=$4 k=$5 ref=$6 off=$7 erst=$8 dx=$9
	vjob rest_v_f2_${g}_s${k}_${dx/-/n} $st rest_v_frei.lua CC_FRAMES=300 CC_SLOTS=16-19 "'CC_IN=10..10:l;$kette'" \
		"'CC_SETZE=$sl:-200:0:2..11;$sl:-40:0:12..$ref+$off;$sl:-200:0:$ref+$((off+1))..$ref+$((off+erst-1));$sl:$dx:0:$ref+$((off+erst))..$ref+$((off+erst));$sl:-200:0:$ref+$((off+erst+1))..$ref+$((off+40))'"
}
v_f2j() { # g st sl v m dx
	local g=$1 st=$2 sl=$3 v=$4 m=$5 dx=$6 J=20 A=23 in F
	if [ $v = ri ]; then in="10..10:l;$J..$J:j+l;$A..$A:a"; else in="10..10:l;$J..$J:j;$A..$A:a"; fi
	F=$((A+m))
	vjob rest_v_f2j_${g}_${v}_${m}_${dx/-/n} $st rest_v_frei.lua CC_FRAMES=$((J+70)) CC_SLOTS=16-19 "'CC_IN=$in'" "'CC_SETZE=$sl:-200:0:2..$((F-1));$sl:$dx:0:$F..$F;$sl:-200:0:$((F+1))..$((J+70))'"
}
for g in "e anlauf_c 17" "w anlauf_b 18"; do
	set -- $g
	for dx in -83 -84 -85 -86; do
		vjob rest_v_f2_${1}_s1_${dx/-/n} $2 rest_v_frei.lua CC_FRAMES=60 CC_SLOTS=16-19 "'CC_IN=10..10:l;20:a'" "'CC_SETZE=$3:-200:0:2..21;$3:$dx:0:22..22;$3:-200:0:23..60'"
	done
	for dx in -85 -86 -87; do v_f2k $1 $2 $3 "20:a;lp$3#1+15:a" 2 lp$3#1 15 3 $dx; done
	for dx in -89 -90 -91; do v_f2k $1 $2 $3 "20:a;lp$3#1+15:a;lp$3#2+16:a" 3 lp$3#2 16 4 $dx; done
	for dx in -98 -99 -100; do v_f2k $1 $2 $3 "20:a;lp$3#1+15:a;lp$3#2+16:a;lp$3#3+14:a" 4 lp$3#3 14 3 $dx; done
	for m in 5 9; do
		for dx in -97 -98 -99 -100 -101 -102 -103 -104 -105; do v_f2j $1 $2 $3 ri $m $dx; done
		for dx in -74 -75 -76 -77; do v_f2j $1 $2 $3 ne $m $dx; done
	done
done
# Teil F3/F4 (Richtung beim Kettendruck, ohne Eingriff)
v_f3() { # g st sl P o2 o3 o4 k r
	local g=$1 st=$2 sl=$3 P=$4 k=$8 r=$9 kette in i Dt
	local -a o=(0 0 $5 $6 $7)
	kette="$P:a"
	for ((i=2; i<k; i++)); do kette="$kette;lp$sl#$((i-1))+${o[$i]}:a"; done
	Dt="lp$sl#$((k-1))+${o[$k]}"
	in="$kette;$Dt..$Dt:a+$r"
	vjob rest_v_f3_${g}_s${k}_${r} $st rest_v_frei.lua CC_FRAMES=400 CC_SLOTS=16-19 "'CC_IN=$in'"
	if [ $k -lt 4 ] && [ $r = r ]; then vjob rest_v_f3_${g}_s${k}_${r}_f $st rest_v_frei.lua CC_FRAMES=400 CC_SLOTS=16-19 "'CC_IN=$in;lp$sl#$k+14:a'"; fi
	if [ $k -lt 4 ] && [ $r = l ]; then vjob rest_v_f3_${g}_s${k}_${r}_f $st rest_v_frei.lua CC_FRAMES=400 CC_SLOTS=16-19 "'CC_IN=$in;lp$sl#$((k-1))+$((${o[$k]}+16)):a'"; fi
}
for k in 2 3 4; do for r in r l u d; do
	v_f3 e anlauf_c 17 40 15 16 14 $k $r
	v_f3 w anlauf_b 18 42 18 13 17 $k $r
done; done
# Teil F3 aktive Frames des Ausfallschritts gegen den EDDY (EINGRIFF Gegner nur im Probeframe bei dx 30)
for k in 2 3 4; do
	case $k in 2) kette="40:a"; ref=lp17#1; off=15;; 3) kette="40:a;lp17#1+15:a"; ref=lp17#2; off=16;; 4) kette="40:a;lp17#1+15:a;lp17#2+16:a"; ref=lp17#3; off=14;; esac
	for m in 7 8 9 12 13; do
		vjob rest_v_f3a_e_s${k}_$m anlauf_c rest_v_frei.lua CC_FRAMES=300 CC_SLOTS=16-19 "'CC_IN=$kette;$ref+$off..$ref+$off:a+r'" \
			"'CC_SETZE=17:200:0:$ref+$((off+1))..$ref+$((off+m-1));17:30:0:$ref+$((off+m))..$ref+$((off+m));17:200:0:$ref+$((off+m+1))..$ref+$((off+40))'"
	done
done
# Teil F5 (Treffer in der Luft) und F6 (gleichzeitiger Treffer), ohne Eingriff
for J in 0 66 63 58 54 52 38 33 29 27; do vjob rest_v_f5_e_j$J anlauf_c rest_v_frei.lua CC_FRAMES=200 CC_SLOTS=16-19 "'CC_IN=$J..$J:j'"; done
for J in 0 68 65 60 56 40 35 31; do vjob rest_v_f5_w_j$J anlauf_b rest_v_frei.lua CC_FRAMES=200 CC_SLOTS=16-19 "'CC_IN=$J..$J:j'"; done
for P in 65 66 67; do vjob rest_v_f6_e_p$P anlauf_c rest_v_frei.lua CC_FRAMES=120 CC_SLOTS=16-19 "'CC_IN=$P:a'"; done
for P in 67 68 69; do vjob rest_v_f6_w_p$P anlauf_b rest_v_frei.lua CC_FRAMES=120 CC_SLOTS=16-19 "'CC_IN=$P:a'"; done
for P in 72 73 74; do vjob rest_v_f6_t_p$P tiefe_b rest_v_frei.lua CC_FRAMES=120 CC_SLOTS=16-19 "'CC_IN=$P:a'"; done
# Teil E (Rang beim Stage-Wechsel): zuerst die Bot-Laeufe (rest_v_e_boss legt in Frame 1950 den
# Savestate rest_v_e_vor an), danach alle Laeufe oben und die Rang-Eingriffe ab rest_v_e_vor
vbot() { CC_NAME=$1 GFA_CFG=scripts/scenarios/rest_v_bot.lua RV_SAVE=${3:-} scripts/grafik/bot.sh $2 >/dev/null 2>&1 || echo "$1" >> "$fehler"; }
vbot rest_v_e_boss item_v_b1_s1_cam02016 1950:rest_v_e_vor &
vbot rest_v_e_s3 stage3 &
vbot rest_v_e_h0 held0 &
wait
[ -s "$fehler" ] && { cat "$fehler" >&2; exit 1; }
vjob rest_v_e_vor_nat rest_v_e_vor rest_v_frei.lua CC_FRAMES=150 CC_SLOTS=16-19
for r in 7 8 10 22; do vjob rest_v_e_vor_r$r rest_v_e_vor rest_v_frei.lua CC_FRAMES=150 CC_SLOTS=16-19 "'CC_RANG=$r:2..2'"; done
laufen
python3 scripts/messen_rest_v.py belege $outv
rm -f "$raw"/rest_v_*
wc -l $outv
rm -rf "$tmp" "$jobs" "$fehler"
rm -f "$raw"/rest_*_fields.txt "$raw"/rest_*_inputs.csv "$raw"/rest_*_watch.csv "$raw"/rest_*_meta.txt
wc -l $out
