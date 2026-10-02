#!/usr/bin/env bash
# belege_boss.sh – Belege zum Boss DOLG der Stage 1 (Auftrag M6, Praefix boss).
#
#   cd research/captcomm && scripts/belege_boss.sh
#
# Fuehrt alle MAME-Laeufe mit scenarios/boss_frei.lua aus (Namen boss_<teil>_*,
# nie boss_v_*: das ist der Praefix des Gegenpruefers), schreibt dabei eine
# Laufliste logs/raw/boss_manifest.tsv (Teil, Lauf, Savestate, Frames, Info,
# Variablen), wertet mit scripts/messen_boss.py belege aus und schreibt
# logs/boss.csv. Danach werden die eigenen Rohdaten (logs/raw/boss_[a-gmq]_*,
# boss_a2_*, Aufnahmen logs/raw/snap/boss_[gm]_*) geloescht; die eigenen
# Savestates boss_q_p, boss_q_r, boss_q_b, boss_q_m bleiben in
# logs/raw/sta/captcomm. Teil M ist die dritte Messung (Abschnitte "# M").
# Teil V am Ende (Gegenpruefer V6, Praefix boss_v): eigene Laeufe mit
# scenarios/boss_v_frei.lua und scenarios/boss_v_bot.lua, Auswertung
# scripts/messen_boss_v.py belege nach logs/boss_v.csv (etwa 8 min zusaetzlich;
# braucht die Savestates ingame und item_bot1_s1_cam02048).
#
# Voraussetzung: Savestates aus Phase 0 (p0_s1_s1_cam01536, p0_s1_s1_cam01793,
# p0_s1_s1_cam02048) und item_missile, item_laser (belege_item.sh).
# Parallel laufen BOSS_JOBS MAME-Prozesse (Standard 8). Laufzeit etwa 10 min auf
# freier Maschine (rund 580 Laeufe). BOSS_BEHALTEN=1 behaelt die Rohdaten.
#
# EINGRIFFE (Einzelheiten im Kopf von boss_frei.lua und im Entwurf):
#  - alle Laeufe: LP der Figur vor jedem Frame auf 72 (CC_LP, Standard)
#  - fast alle: die beiden Arena-WOOKY und spaeter erscheinende Gegner ausserhalb
#    des Bildes festgehalten (CC_WEG=16,17,neu); Ausnahmen: Teil A, b_e*, g_tod_*,
#    Teil F (dort nur die Arena-WOOKY, CC_WEG=16,17, bzw. gar nicht)
#  - Rang festgehalten (CC_RANG) in Teil A, E, der Treffart-Stichprobe B6
#    (Rang 24) und den Bot-Laeufen
#  - Boss bzw. Figur relativ zueinander gesetzt (CC_BSET, CC_FIG, CC_SSET) in
#    Teil B, C, D
#  - LP des Bosses gesetzt (CC_BLP) in Teil F und G
#  - Gegner entfernt (CC_ENTF, CC_ENTF2) in Teil B (Lauf e*) und F
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=logs/raw
SZ=scripts/scenarios/boss_frei.lua
MAN=$RAW/boss_manifest.tsv
JOBS=${BOSS_JOBS:-8}
P0=p0_s1_s1_cam02048
W="CC_WEG=16,17,neu"

for st in p0_s1_s1_cam01536 p0_s1_s1_cam01793 p0_s1_s1_cam02048 item_missile item_laser; do
	[ -f "$RAW/sta/captcomm/$st.sta" ] || { echo "Savestate fehlt: $st" >&2; exit 1; }
done
aufraeumen() {
	# eigene Rohdaten aller Teile (auch boss_a2_*), nie boss_v_* (Teil V)
	rm -f "$RAW"/boss_[abcdefgmq]_* "$RAW"/boss_a2_* "$RAW"/snap/boss_[gm]_*.png
}
aufraeumen
mkdir -p "$RAW"
: > "$MAN"
start=$(date +%s)

# lauf TEIL NAME SAVESTATE FRAMES INFO [VAR=WERT ...]
lauf() {
	local teil=$1 name=$2 st=$3 fr=$4 info=$5
	shift 5
	printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$teil" "boss_$name" "$st" "$fr" "$info" "$*" >> "$MAN"
	( env "$@" CC_FRAMES="$fr" CC_NAME="boss_$name" scripts/run.sh "$SZ" "$st" > /dev/null 2>&1 \
		|| echo "FEHLER boss_$name" >&2 ) &
	while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do wait -n || true; done
}

# ---------------------------------------------------------------- Quellen
# Savestates vor Koerperpresse (boss_q_p, A = Frame 8) und Ansturm (boss_q_r,
# Ausholen in 10, Lauf ab 30) aus dem passiven Lauf; boss_q_b: zweite, eigene
# Ausgangslage in der Arena (von cam01793 erst 40 Frames hoch, 210 warten,
# dann nach rechts; der Boss erwacht dort in Frame 397, Rang 16, 110 LP).
lauf Q q_quelle $P0 1300 "passiv, Quelle" $W CC_SAVE="800:boss_q_p,1240:boss_q_r"
lauf Q q_b p0_s1_s1_cam01793 620 "zweite Arena-Ausgangslage" CC_IN="2-41:u;250-600:r" CC_SAVE="620:boss_q_b"
# boss_q_m: dritte Ausgangslage fuer Teil M (ab cam01536 mit Rang 20, erst 23
# Frames unten, dann nach rechts; Boss erwacht in Frame 311, 110 LP, geht ab 372)
lauf Q q_m p0_s1_s1_cam01536 372 "dritte Arena-Ausgangslage" CC_RANG=20 CC_IN="2-24:d;25-330:r" CC_SAVE="371:boss_q_m"
wait

# ---------------------------------------------------------------- Teil A
# Start-LP beim Erwachen (Kamera 2048) mit festgehaltenem Rang (EINGRIFF).
for R in 7 8 9 15 16 23 24; do
	lauf A a_r$R p0_s1_s1_cam01793 200 "rang=$R" CC_IN="2-190:r" CC_RANG=$R
	lauf A a2_r$R p0_s1_s1_cam01536 450 "rang=$R" CC_IN="2-440:r" CC_RANG=$R
done
lauf A a_nat p0_s1_s1_cam01793 200 "rang=natuerlich" CC_IN="2-190:r"
lauf A a2_nat p0_s1_s1_cam01536 450 "rang=natuerlich" CC_IN="2-440:r"
lauf A a_wechsel_9_24 p0_s1_s1_cam01793 200 "rang=9 bis 139, 24 ab 140" CC_IN="2-190:r" CC_RANG=9 CC_RANG2=24 CC_RANG2_AB=140
lauf A a_wechsel_24_9 p0_s1_s1_cam01793 200 "rang=24 bis 149, 9 ab 150" CC_IN="2-190:r" CC_RANG=24 CC_RANG2=9 CC_RANG2_AB=150

# ---------------------------------------------------------------- Teil B
# B1 Ketten: Boss in Frame 62-63 50 px vor die Figur (EINGRIFF), Stufe 1
# trifft in 66, Folgestufen jeweils 14 Frames nach dem Treffer gedrueckt.
lauf B b_k1 $P0 300 "kette=1" $W CC_BSET="62-63:50:0" CC_IN="64:a"
lauf B b_k12 $P0 300 "kette=1-2" $W CC_BSET="62-63:50:0" CC_IN="64:a;80:a"
lauf B b_k123 $P0 300 "kette=1-3" $W CC_BSET="62-63:50:0" CC_IN="64:a;80:a;97:a"
lauf B b_k1234 $P0 300 "kette=1-4" $W CC_BSET="62-63:50:0" CC_IN="64:a;80:a;97:a;115:a"
lauf B b_k12w $P0 300 "kette=1-2 dx=70" $W CC_BSET="62-63:70:0" CC_IN="64:a;80:a"
# B2 Einzelfaelle als erster Treffer
lauf B b_tritt $P0 260 "tritt allein: Stufen 1-3 am WOOKY (Slot 16 per EINGRIFF davor), Tritt am Boss" $W CC_SSET="16:2-70:50:0" CC_BSET="69-71:50:0" CC_IN="20:a;36:a;53:a;71:a"
lauf B b_sprn $P0 260 "sprungangriff neutral" $W CC_BSET="62-63:60:0" CC_IN="62:j;64:a"
lauf B b_sprh $P0 260 "sprungangriff hoch" $W CC_BSET="62-63:60:0" CC_IN="62:j+u;64:a"
lauf B b_spez $P0 260 "spezialangriff" $W CC_BSET="62-63:50:0" CC_IN="64:a+j"
lauf B b_sprint $P0 260 "sprintangriff" $W CC_BSET="62-63:90:0" CC_IN="58-59:r;62-75:r;72:a"
lauf B b_griff_vorn $P0 200 "figur geht von vorn in den Boss (36 px)" $W CC_BSET="62-63:36:0" CC_IN="62-70:r"
lauf B b_griff_hinten $P0 200 "figur geht von hinten in den Boss (40 px)" $W CC_BSET="62-63:-40:0" CC_IN="62-70:l"
lauf B b_wurf_v $P0 260 "griff von hinten, wurf nach vorn" $W CC_BSET="62-63:-40:0" CC_IN="62-66:l;72:a+l"
lauf B b_wurf_r $P0 260 "griff von hinten, wurf rueckwaerts" $W CC_BSET="62-63:-40:0" CC_IN="62-66:l;72:a+r"
lauf B b_knie $P0 260 "griff, drei kniestoesse" $W CC_BSET="62-63:-40:0" CC_IN="62-66:l;72:a;92:a;112:a"
lauf B b_knie1 $P0 260 "griff, ein kniestoss" $W CC_BSET="62-63:-40:0" CC_IN="62-66:l;72:a"
lauf B b_mis item_missile 220 "raketenwerfer, ein schuss" $W CC_BSET="2-3:150:0" CC_IN="5:a"
lauf B b_mis3 item_missile 220 "raketenwerfer, drei schuss" $W CC_BSET="2-3:150:0" CC_IN="5:a;25:a;45:a"
lauf B b_las item_laser 220 "laser, ein schuss" $W CC_BSET="2-3:150:0" CC_IN="5:a"
lauf B b_las3 item_laser 220 "laser, drei schuss" $W CC_BSET="2-3:150:0" CC_IN="5:a;25:a;45:a"
# B3 umwerfende Angriffe als zweiter Treffer kurz nach Stufe 1 (Treffer 66)
lauf B b_2_sprung $P0 220 "stufe 1, dann sprungangriff" $W CC_BSET="62-63:60:0" CC_IN="64:a;79:j;81:a"
lauf B b_2_sprint $P0 220 "stufe 1, dann sprintangriff" $W CC_BSET="62-63:80:0" CC_IN="64:a;94-95:r;98-110:r;100:a"
lauf B b_2_spez $P0 220 "stufe 1, dann spezial (dx 60)" $W CC_BSET="62-63:60:0" CC_IN="64:a;79:a+j"
lauf B b_2_spez_b $P0 220 "stufe 1, dann spezial (Boss bis 92 bei 40 px)" $W CC_BSET="62-63:50:0;67-92:40:0" CC_IN="64:a;79:a+j"
lauf B b_2_spez_c $P0 220 "stufe 1, dann spezial (dx 80)" $W CC_BSET="62-63:80:0" CC_IN="64:a;79:a+j"
lauf B b_rz_spez $P0 220 "stufe 1-2, spezial im Rueckzug" $W CC_BSET="62-63:50:0" CC_IN="64:a;80:a;97:a+j"
lauf B b_rz_spez2 $P0 220 "stufe 1-2, spezial gegen Ende des Rueckzugs" $W CC_BSET="62-63:50:0" CC_IN="64:a;80:a;110:a+j"
lauf B b_rz_sprung $P0 220 "stufe 1-2, sprungangriff im Rueckzug" $W CC_BSET="62-63:50:0" CC_IN="64:a;80:a;96:j+r;98:a"
# B4 Zeitpunkt des zweiten Treffers (Druck h+k, h = 66)
for k in 12 16 20 24; do
	lauf B b_z$k $P0 200 "zweit=h+$k dx=50" $W CC_BSET="62-63:50:0" CC_IN="64:a;$((66 + k)):a"
done
for k in 20 26 27 28 30 34 40; do
	lauf B b_w$k $P0 220 "zweit=h+$k dx=70" $W CC_BSET="62-63:70:0" CC_IN="64:a;$((66 + k)):a"
done
for k in 36 37 38 39 40 41; do
	lauf B b_v$k $P0 140 "treffer2=h+$k dx=70" $W CC_BSET="62-63:70:0" CC_IN="64:a;$((64 + k)):a"
	lauf B b_u$k $P0 140 "treffer2=h+$k Boss 93-120 bei 75 px" $W CC_BSET="62-63:70:0;93-120:75:0" CC_IN="64:a;$((64 + k)):a"
done
# derselbe Abstand h+32, Beginn um k Frames verschoben
for k in 0 1 2 3 4 5 6 7 8 9 10 11 12 13; do
	b=$((62 + k))
	lauf B b_d$k $P0 200 "versatz=$k" $W CC_BSET="$b-$((b + 1)):70:0" CC_IN="$((64 + k)):a;$((96 + k)):a"
done
for k in 0 4 7 8 12; do
	b=$((62 + k))
	lauf B b_e$k $P0 200 "versatz=$k WOOKY entfernt" CC_ENTF=16,17 CC_ENTF_AB=5 CC_WEG=neu CC_BSET="$b-$((b + 1)):70:0" CC_IN="$((64 + k)):a;$((96 + k)):a"
done
# Einzeltreffer zu vielen Zeitpunkten F (Boss in F-4..F-3 70 px vor der Figur)
for F in $(seq 66 3 330); do
	lauf B b_f$F $P0 $((F + 5)) "einzel=$F" $W CC_BSET="$((F - 4))-$((F - 3)):70:0" CC_IN="$((F - 2)):a"
done
lauf B b_n1 $P0 260 "natuerlich: schlag 155, kette 171" $W CC_IN="155:a;171:a"
lauf B b_n2 $P0 260 "natuerlich: schlag 155, neuer schlag 187" $W CC_IN="155:a;187:a"
# B5 Statistik: einfacher Angreifer (CC_BOT), Rang festgehalten, zwei Ausgangslagen
for R in 7 9 12 16 20 24; do
	lauf B b_bot_p$R $P0 8000 "bot rang=$R" $W CC_BOT=angriff CC_RANG=$R
	lauf B b_bot_q$R boss_q_b 8000 "bot rang=$R" $W CC_BOT=angriff CC_RANG=$R
done
lauf B b_bot_kette $P0 8000 "bot mit kettendruck nach 16 F, rang=16" $W CC_BOT=angriff CC_BOT_KETTE=16 CC_RANG=16

# B6 Stichprobe je Treffart bei Rang 24 (EINGRIFF), Beginn in 16 Laeufen um
# je 6 Frames verschoben (Boss jeweils in b..b+1 vor die Figur gesetzt)
for i in $(seq 0 15); do
	k=$((i * 6)); b=$((62 + k))
	R="CC_RANG=24"
	lauf B b_t_schlag_$i $P0 $((140 + k)) "art=schlag versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 3)):60:0" CC_IN="$((b + 2)):a"
	lauf B b_t_kette2_$i $P0 $((200 + k)) "art=kette2 versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):50:0" CC_IN="$((b + 2)):a;$((b + 18)):a"
	lauf B b_t_kette4_$i $P0 $((220 + k)) "art=kette4 versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):50:0" CC_IN="$((b + 2)):a;$((b + 18)):a;$((b + 35)):a;$((b + 53)):a"
	lauf B b_t_sprn_$i $P0 $((160 + k)) "art=sprn versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):60:0" CC_IN="$b:j;$((b + 2)):a"
	lauf B b_t_sprh_$i $P0 $((160 + k)) "art=sprh versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):60:0" CC_IN="$b:j+u;$((b + 2)):a"
	lauf B b_t_spez_$i $P0 $((160 + k)) "art=spez versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):50:0" CC_IN="$((b + 2)):a+j"
	lauf B b_t_sprint_$i $P0 $((160 + k)) "art=sprint versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):90:0" CC_IN="$((b - 4))-$((b - 3)):r;$b-$((b + 13)):r;$((b + 10)):a"
	lauf B b_t_wurf_$i $P0 $((200 + k)) "art=wurf versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):-40:0" CC_IN="$b-$((b + 4)):l;$((b + 10)):a+l"
	lauf B b_t_knie_$i $P0 $((200 + k)) "art=knie versatz=$k rang=24" $W $R CC_BSET="$b-$((b + 1)):-40:0" CC_IN="$b-$((b + 4)):l;$((b + 10)):a"
	lauf B b_t_mis_$i item_missile $((120 + k)) "art=mis versatz=$k rang=24" $W $R CC_BSET="$((2 + k))-$((3 + k)):150:0" CC_IN="$((5 + k)):a"
	lauf B b_t_las_$i item_laser $((120 + k)) "art=las versatz=$k rang=24" $W $R CC_BSET="$((2 + k))-$((3 + k)):150:0" CC_IN="$((5 + k)):a"
	lauf B b_t_tritt_$i $P0 $((200 + k)) "art=tritt versatz=$k rang=24" $W $R CC_SSET="16:$((2 + k))-$((70 + k)):50:0" CC_BSET="$((69 + k))-$((71 + k)):50:0" CC_IN="$((20 + k)):a;$((36 + k)):a;$((53 + k)):a;$((71 + k)):a"
done

# ---------------------------------------------------------------- Teil C
# C1 Verwundbarkeit beim Liegen und nach dem Aufstehen (G = erster Frame mit
# S+4 = 1): umgeworfen durch den Sprintangriff (Treffer 77, G = 182) bzw. den
# Sprungangriff (Treffer 69, G = 174). Probeschlag gedrueckt in X-2, aktiv ab
# X; die Figur steht bis X-1 weit weg (der Boss geht nur) und wird in X..X+1
# 55 px vor den Boss gesetzt (EINGRIFF; bei 49 px und weniger packt er sofort).
for X in 160 178 182 184 186 190 192 193 194 195 196 197 198 200; do
	lauf C c_aufs$X $P0 $((X + 30)) "probe=$X umgeworfen=sprint" $W CC_BSET="62-63:90:0" CC_IN="58-59:r;62-75:r;72:a;$((X - 2)):a" CC_FIG="$X-$((X + 1)):55:0"
done
for X in 150 172 174 176 180 185 186 187 188 189 190 192; do
	lauf C c_aufj$X $P0 $((X + 30)) "probe=$X umgeworfen=sprung" $W CC_BSET="62-63:60:0" CC_IN="62:j;64:a;$((X - 2)):a" CC_FIG="$X-$((X + 1)):55:0"
done
# Spezialangriff (Druck X-8, aktiv ab X) nach dem Sprintangriff; Figur ab X
# 55 px vor dem Boss (er geht weiter) bzw. 45 px (er beginnt den kurzen Schlag)
for X in 184 188 192; do
	for D in 45 55; do
		lauf C c_sp${D}_$X $P0 $((X + 40)) "probe=$X umgeworfen=sprint spezial d=$D" $W CC_BSET="62-63:90:0" CC_IN="58-59:r;62-75:r;72:a;$((X - 8)):a+j" CC_FIG="$X-$((X + 20)):$D:0"
	done
done
# Schlag gegen den anstuermenden Boss (Lauf ab Frame 30 aus boss_q_r)
for p in 50 56 58 60 62; do
	lauf C c_r$p boss_q_r 160 "schlag=$p" $W CC_IN="$p:a"
done

# ---------------------------------------------------------------- Teil D
# Reichweite: Figur ab A+1 relativ zum Boss (EINGRIFF), A natuerlich gewaehlt.
for d in -30 -20 -15 -12 -11 -10 0 40 80 100 104 105 106 107 108 110 120; do
	lauf D d_k_x$d $P0 120 "art=K d=$d dz=0 h=0" $W CC_BSET="62-69:50:0" CC_AB="1:04a97e" CC_FIG="1-20:$d:0"
done
for z in -14 -13 -12 12 13 14; do
	lauf D d_k_z$z $P0 120 "art=K d=40 dz=$z h=0" $W CC_BSET="62-69:50:0" CC_AB="1:04a97e" CC_FIG="1-20:40:$z"
done
for h in 40 60 64 68 72 76 80; do
	lauf D d_k_h$h $P0 120 "art=K d=40 dz=0 h=$h" $W CC_BSET="62-69:50:0" CC_AB="1:04a97e" CC_FIG="1-20:40:0:$h"
done
for d in -30 -20 -15 -12 -11 -10 0 40 80 96 98 100 101 102 104 106 110; do
	lauf D d_s_x$d $P0 220 "art=S d=$d dz=0 h=0" $W CC_AB="1:04a67c" CC_AB_MIN=62 CC_FIG="1-30:$d:0"
done
for z in -14 -13 -12 12 13 14; do
	lauf D d_s_z$z $P0 220 "art=S d=40 dz=$z h=0" $W CC_AB="1:04a67c" CC_AB_MIN=62 CC_FIG="1-30:40:$z"
done
for h in 40 60 70 80 90 100; do
	lauf D d_s_h$h $P0 220 "art=S d=40 dz=0 h=$h" $W CC_AB="1:04a67c" CC_AB_MIN=62 CC_FIG="1-30:40:0:$h"
done
for z in -14 -13 -12 0 12 13 14; do
	lauf D d_r_z$z boss_q_r 120 "art=R d=frei dz=$z h=0" $W CC_AB="1:04a26a" CC_FIG="1-45:_:$z"
done
for h in 20 60 80 100 120; do
	lauf D d_r_h$h boss_q_r 120 "art=R d=frei dz=0 h=$h" $W CC_AB="1:04a26a" CC_FIG="1-45:_:0:$h"
done
for d in -30 -10 40 44 48 52 56; do
	lauf D d_r_x$d boss_q_r 120 "art=R d=$d dz=0 h=0 (mitgefuehrt)" $W CC_AB="1:04a26a" CC_FIG="1-45:$d:0"
done
for k in 32 45 48 50 51 52 55 60; do
	lauf D d_p_k$k boss_q_p 100 "art=P d=0 dz=0 h=0 ab=A+$k" $W CC_AB="1:04b842" CC_FIG="$k-70:0:0"
done
for h in 20 30 40 60; do
	lauf D d_p_h$h boss_q_p 100 "art=P d=0 dz=0 h=$h ab=A+32" $W CC_AB="1:04b842" CC_FIG="32-50:0:0:$h"
done
for d in -40 -30 -25 -22 -20 -10 0 10 20 25; do
	lauf D d_p_x$d boss_q_p 100 "art=P d=$d dz=0 h=0 ab=A+45" $W CC_AB="1:04b842" CC_FIG="45-70:$d:0"
done
for z in -14 -13 -12 12 13 14; do
	lauf D d_p_z$z boss_q_p 100 "art=P d=0 dz=$z h=0 ab=A+45" $W CC_AB="1:04b842" CC_FIG="45-70:0:$z"
done
for d in -20 -10 0 30 45 48 49 50 52; do
	lauf D d_g_x$d $P0 100 "art=G d=$d dz=0" $W CC_BSET="62-63:$d:0"
done
for z in -8 -7 -6 6 7 8; do
	lauf D d_g_z$z $P0 100 "art=G d=40 dz=$z" $W CC_BSET="62-63:40:$z"
done

# ---------------------------------------------------------------- Teil E
# Lange Laeufe mit passiver Figur, Rang festgehalten (EINGRIFF) bzw. natuerlich
lauf E e_p9 $P0 8000 "passiv rang=9" $W CC_RANG=9
lauf E e_p9b $P0 8000 "passiv rang=9, zuerst 30 F hoch" $W CC_RANG=9 CC_IN="2-31:u"
lauf E e_q9 boss_q_b 8000 "passiv rang=9" $W CC_RANG=9
lauf E e_p20 $P0 8000 "passiv rang=20" $W CC_RANG=20
lauf E e_p20b $P0 8000 "passiv rang=20, zuerst 30 F hoch" $W CC_RANG=20 CC_IN="2-31:u"
lauf E e_q20 boss_q_b 8000 "passiv rang=20" $W CC_RANG=20
lauf E e_pnat $P0 8000 "passiv, rang natuerlich" $W
lauf E e_qnat boss_q_b 8000 "passiv, rang natuerlich" $W

# ---------------------------------------------------------------- Teil F
# Wellen: LP des Bosses gesetzt (EINGRIFF), Arena-WOOKY ausserhalb gehalten
for v in 57 56 55 54; do
	lauf F f_e$v $P0 200 "blp=$v" CC_WEG=16,17 CC_BLP="70:$v"
done
for v in 29 28 27 26; do
	lauf F f_d$v $P0 300 "blp=30 dann $v, EDDY in 100 entfernt" CC_WEG=16,17 CC_BLP="60:30,120:$v" CC_ENTF2=typ:60CA0 CC_ENTF2_AB=100
done
for v in 51 50; do
	lauf F f_r9_e$v p0_s1_s1_cam01793 300 "rang=9 blp=$v" CC_RANG=9 CC_IN="2-150:r" CC_WEG=16,17 CC_BLP="200:$v"
done
for v in 26 25; do
	lauf F f_r9_d$v p0_s1_s1_cam01793 320 "rang=9 blp=30 dann $v, EDDY in 210 entfernt" CC_RANG=9 CC_IN="2-150:r" CC_WEG=16,17 CC_BLP="200:30,220:$v" CC_ENTF2=typ:60CA0 CC_ENTF2_AB=210
done
lauf F f_rueck1 $P0 300 "blp=59, stufe 1 (dauerhaft 56), stufe 2 zurueck (52)" CC_WEG=16,17 CC_BLP="60:59" CC_BSET="62-63:50:0" CC_IN="64:a;80:a"
lauf F f_rueck2 $P0 300 "blp=57, erster treffer zurueck (54)" CC_WEG=16,17 CC_BLP="150:57" CC_IN="155:a;171:a"
lauf F f_dick_alle $P0 300 "blp 30 dann 27, alle leben (WOOKY, EDDY ausserhalb)" CC_WEG=16,17,neu CC_BLP="60:30,120:27"
lauf F f_dick_ohne_eddy $P0 300 "blp 30 dann 27, beide EDDY in 100 entfernt" CC_WEG=16,17 CC_BLP="60:30,120:27" CC_ENTF2=typ:60CA0 CC_ENTF2_AB=100
lauf F f_dick_ein_eddy $P0 300 "blp 30 dann 27, ein EDDY (Slot 15) in 100 entfernt" CC_WEG=16,17 CC_BLP="60:30,120:27" CC_ENTF2=15 CC_ENTF2_AB=100
lauf F f_wooky_weg $P0 300 "WOOKY Slot 16 in Frame 5 entfernt" CC_ENTF=16 CC_ENTF_AB=5 CC_WEG=17

# ---------------------------------------------------------------- Teil G
lauf G g_lp0 $P0 300 "blp=3, stufe 1 trifft (3)" CC_WEG=16,17,neu CC_BLP="60:3" CC_BSET="62-63:50:0" CC_IN="64:a"
lauf G g_lp0b $P0 1200 "blp=0 ohne Treffer" CC_WEG=16,17,neu CC_BLP="60:0"
lauf G g_tod_s $P0 700 "blp=2, stufe 1 (-1), uebrige Gegner frei" CC_BLP="60:2" CC_BSET="62-63:50:0" CC_IN="64:a" CC_SNAPS="230-420:2"
lauf G g_tod_sp $P0 700 "blp=2, spezial (-4), uebrige Gegner frei" CC_BLP="60:2" CC_BSET="62-63:50:0" CC_IN="64:a+j" CC_SNAPS="230-420:2"
lauf G g_k5 $P0 260 "blp=1 in A des kurzen Schlags, Tod in A+5" $W CC_BSET="62-69:50:0" CC_BLP="70:1" CC_IN="73:a"
lauf G g_k7 $P0 260 "blp=1, Tod im ersten aktiven Frame A+7" $W CC_BSET="62-69:50:0" CC_BLP="70:1" CC_IN="75:a"
lauf G g_s15 $P0 260 "blp=1, Tod im Armschwung A+15" $W CC_BLP="160:1" CC_IN="170:a"
lauf G g_s17 $P0 260 "blp=1, Tod im ersten aktiven Frame A+17" $W CC_BLP="160:1" CC_IN="172:a"

# ---------------------------------------------------------------- Teil M
# Dritte Messung zu den Zeilen, in denen Messagent und Gegenpruefer V6
# abweichen. Dritte Ausgangslage boss_q_m (Teil Q: ab cam01536 mit Rang 20
# erreicht, Boss in Tiefe 208 statt 156), Rang meist 20 (EINGRIFF CC_RANG),
# andere Startframes und beide Seiten; ausserdem boss_q_b, p0_s1_s1_cam02048,
# item_missile und item_laser. EINGRIFFE wie in Teil B bis G (CC_WEG, CC_RANG,
# CC_BSET, CC_FIG, CC_BLP, CC_ENTF*). Auswertung: messen_boss.py, Abschnitte "M".
QM=boss_q_m
R20="CC_RANG=20"
# M1 Ketten (Rang 20 und 16), Sprung- und Sprintangriffe (Rang 20), Start verschoben
for i in $(seq 0 23); do
	b=$((10 + 5 * i))
	lauf M m_k20_$i $QM $((b + 200)) "art=kette4 rang=20 versatz=$i" $W $R20 CC_BSET="$b-$((b + 1)):50:0" CC_IN="$((b + 2)):a;$((b + 18)):a;$((b + 35)):a;$((b + 53)):a"
	lauf M m_sprn20_$i $QM $((b + 160)) "art=sprn rang=20 versatz=$i" $W $R20 CC_BSET="$b-$((b + 1)):60:0" CC_IN="$b:j;$((b + 2)):a"
	lauf M m_sprint20_$i $QM $((b + 160)) "art=sprint rang=20 versatz=$i" $W $R20 CC_BSET="$b-$((b + 1)):90:0" CC_IN="$((b - 4))-$((b - 3)):r;$b-$((b + 13)):r;$((b + 10)):a"
done
for i in $(seq 0 15); do
	b=$((12 + 7 * i))
	lauf M m_k16_$i $QM $((b + 200)) "art=kette4 rang=16 versatz=$i" $W CC_RANG=16 CC_BSET="$b-$((b + 1)):50:0" CC_IN="$((b + 2)):a;$((b + 18)):a;$((b + 35)):a;$((b + 53)):a"
done
# M2 Zucken: einzelner Schlag von vorn und von hinten, Boss geht, wartet, holt aus
for F in $(seq 20 4 96); do
	lauf M m_z_f$F $QM $((F + 120)) "zucken einzel F=$F" $W $R20 CC_BSET="$((F - 4))-$((F - 3)):70:0" CC_IN="$((F - 2)):a"
done
for p in $(seq 41 56); do
	lauf M m_z_k$p $QM 220 "zucken kurzer schlag druck=$p" $W $R20 CC_BSET="40-41:50:0" CC_IN="$p:a"
done
for X in 24 32 40 48 56; do
	lauf M m_z_h$X $QM $((X + 120)) "zucken gehen von hinten X=$X" $W $R20 CC_IN="$((X - 3)):l;$((X - 2)):a" CC_FIG="$X-$((X + 1)):-50:0"
done
for X in 44 46 49 50 51 52 53; do
	lauf M m_z_kh$X $QM $((X + 120)) "kurzer schlag (A 42, aktiv 49-52) von hinten X=$X" $W $R20 CC_BSET="40-41:50:0" CC_IN="43:l;$((X - 2)):a" CC_FIG="44-$((X + 1)):-45:0"
done
for X in 110 115 120 124; do
	lauf M m_z_sh$X $QM $((X + 120)) "armschwung (A 107) von hinten X=$X" $W $R20 CC_IN="$((X - 3)):l;$((X - 2)):a" CC_FIG="$((X - 1))-$((X + 1)):-45:0"
done
for X in 110 115 120; do
	lauf M m_z_sv$X $QM $((X + 120)) "armschwung (A 107) von vorn X=$X" $W $R20 CC_IN="$((X - 2)):a" CC_FIG="$((X - 1))-$((X + 1)):55:0"
done
for X in 1188 1192 1196; do
	lauf M m_z_wbv$X boss_q_b $((X + 80)) "warten von vorn X=$X" $W $R20 CC_IN="$((X - 3)):l;$((X - 2)):a" CC_FIG="$X-$((X + 1)):-55:0"
	lauf M m_z_wbh$X boss_q_b $((X + 80)) "warten von hinten X=$X" $W $R20 CC_IN="$((X - 3)):r;$((X - 2)):a" CC_FIG="$X-$((X + 1)):55:0"
done
for X in 751 755 759; do
	lauf M m_z_wpv$X $P0 $((X + 80)) "warten von vorn X=$X" $W $R20 CC_IN="$((X - 3)):r;$((X - 2)):a" CC_FIG="$X-$((X + 1)):55:0"
	lauf M m_z_wph$X $P0 $((X + 80)) "warten von hinten X=$X" $W $R20 CC_IN="$((X - 3)):l;$((X - 2)):a" CC_FIG="$X-$((X + 1)):-55:0"
done
# M3 Griff: Figur geht von vorn in den Boss (gf) bzw. steht passiv nahe vor ihm (bg)
for X in 43 45 47; do
	lauf M m_gf_k$X $QM $((X + 150)) "griff von vorn im ausholen kurzer schlag X=$X" $W $R20 CC_BSET="40-41:50:0" CC_IN="$X-$((X + 4)):r" CC_FIG="$X-$X:34:0"
done
for X in 110 115 120; do
	lauf M m_gf_s$X $QM $((X + 150)) "griff von vorn im ausholen armschwung X=$X" $W $R20 CC_IN="$X-$((X + 4)):r" CC_FIG="$X-$X:34:0"
done
for X in 20 30; do
	lauf M m_gf_g$X $QM $((X + 150)) "griff von vorn, boss geht X=$X" $W $R20 CC_IN="$X-$((X + 4)):r" CC_FIG="$X-$X:34:0"
done
for X in 1190 1196; do
	lauf M m_gf_w$X boss_q_b $((X + 150)) "griff von vorn, boss wartet X=$X" $W $R20 CC_IN="$X-$((X + 4)):l" CC_FIG="$X-$X:-34:0"
done
for D in 20 34 40 45 47 49 51; do
	lauf M m_bg_g$D $QM 120 "boss geht, figur in X=20 bei d=$D" $W $R20 CC_FIG="20-21:$D:0"
	lauf M m_bg_h$D $QM 120 "boss geht, figur in X=26 bei d=$D" $W $R20 CC_FIG="26-27:$D:0"
	lauf M m_bg_w$D boss_q_b 1290 "boss wartet, figur in X=1190 bei d=$D" $W $R20 CC_FIG="1190-1191:-$D:0"
done
for X in 2 4 6 8 10 13 16 49 51 54; do
	lauf M m_bg_c$X $QM $((X + 60)) "boss geht, figur in X=$X bei d=40" $W $R20 CC_FIG="$X-$((X + 1)):40:0"
done
# M4 Reichweiten: kurzer Schlag beide Blickrichtungen, Ausloeser in der Tiefe,
# Armschwung, Ansturm (Hoehe, Tiefe), Koerperpresse (nur ein Frame A+F)
for d in -18 -17 -16 -15 -14 102 103 104 105 106 107; do
	lauf M m_dk_l$d $QM 110 "art=K blick=l d=$d" $W $R20 CC_BSET="40-41:50:0" CC_AB="1:04a97e" CC_AB_MIN=30 CC_FIG="1-20:$d:0"
done
for d in -40 -30 -25 -22 -20 -19 -18 -17 -16 -15 -14 40 60 80 90 95 97 99 101 102 103 104 105 106 107; do
	lauf M m_dk_r$d $QM 110 "art=K blick=r d=$d" $W $R20 CC_BSET="36-36:-50:0" CC_AB="1:04a97e" CC_AB_MIN=30 CC_FIG="1-20:$((-d)):0"
done
for z in -9 -8 -7 -6 6 7 8 9; do
	lauf M m_dkz_$z $QM 80 "K-Ausloeser dz=$z (Boss 45 px vor der Figur)" $W $R20 CC_BSET="40-41:45:$z"
done
for d in -18 -17 -16 -15 103 104 105 106; do
	lauf M m_ds_l$d $QM 160 "art=S blick=l d=$d" $W $R20 CC_AB="1:04a67c" CC_AB_MIN=100 CC_FIG="1-30:$d:0"
done
for d in -28 -25 -23 -21 -19 -17 -16; do
	lauf M m_ds_r$d boss_q_b 300 "art=S blick=r d=$d" $W $R20 CC_AB="1:04a67c" CC_AB_MIN=250 CC_FIG="1-30:$((-d)):0"
done
for h in 90 95 100 105 110 115; do
	lauf M m_dr_h$h $QM 700 "art=R h=$h" $W $R20 CC_AB="1:04a26a" CC_AB_MIN=600 CC_FIG="1-45:_:0:$h"
done
for z in -13 -12 12 13; do
	lauf M m_dr_z$z $QM 700 "art=R dz=$z" $W $R20 CC_AB="1:04a26a" CC_AB_MIN=600 CC_FIG="1-45:_:$z"
done
for F in 48 51 55 60 66; do
	for d in 0 15 23 27 35; do
		lauf M m_dp_f${F}_d$d boss_q_b 1310 "art=P F=$F d=$d (nur Frame A+F)" $W $R20 CC_AB="1:04b842" CC_AB_MIN=1200 CC_FIG="1-$((F - 1)):_:40;$F-$F:$d:0;$((F + 1))-80:_:40"
	done
done
for F in 48 51 55 58 62 66 70; do
	lauf M m_dp_l$F boss_q_b 1310 "art=P Landepunkt F=$F" $W $R20 CC_AB="1:04b842" CC_AB_MIN=1200 CC_FIG="1-$((F - 1)):_:40;$F-$F:_:0;$((F + 1))-80:_:40"
done
# M5 lange Laeufe: passiv (Rang 9, 16, 24) und Bot (Rang 20 mit Takt 20 und 32, Rang 16)
for RR in 9 16 24; do
	lauf M m_e_r$RR $QM 8000 "passiv rang=$RR" $W CC_RANG=$RR
done
lauf M m_bot_t20 $QM 8000 "bot rang=20 takt=20" $W CC_BOT=angriff CC_BOT_AB=2 $R20
lauf M m_bot_t32 $QM 8000 "bot rang=20 takt=32" $W CC_BOT=angriff CC_BOT_AB=2 CC_BOT_TAKT=32 $R20
lauf M m_bot_r16 $QM 8000 "bot rang=16 takt=26" $W CC_BOT=angriff CC_BOT_AB=2 CC_BOT_TAKT=26 CC_RANG=16
# M6 Wellen ohne festgehaltene Gegner
lauf M m_f_alle20 $QM 260 "rang=20 blp 30 in 5, 27 in 80, alle Gegner leben im Bild" $R20 CC_BLP="5:30,80:27"
for RR in 12 16 20; do
	lauf M m_f_ow$RR $QM 260 "rang=$RR WOOKY in 5 entfernt, blp 30 in 30, 27 in 80" CC_RANG=$RR CC_ENTF=16,17 CC_ENTF_AB=5 CC_BLP="30:30,80:27"
	lauf M m_f_owe$RR $QM 260 "rang=$RR WOOKY in 5, EDDY in 60 entfernt, blp 30 in 30, 27 in 80" CC_RANG=$RR CC_ENTF=16,17 CC_ENTF_AB=5 CC_ENTF2=typ:60CA0 CC_ENTF2_AB=60 CC_BLP="30:30,80:27"
done
for RR in 12 15 16 20; do
	lauf M m_f_leer$RR $QM 260 "rang=$RR WOOKY in 5, Pistolen-DICK in 10 entfernt, blp 30 in 30, 27 in 80" CC_RANG=$RR CC_ENTF=16,17 CC_ENTF_AB=5 CC_ENTF2=typ:64E7A CC_ENTF2_AB=10 CC_BLP="30:30,80:27"
done
lauf M m_f_e20 $QM 260 "rang=20 EDDY in 60 entfernt (WOOKY leben), blp 30 in 30, 27 in 80" $R20 CC_ENTF2=typ:60CA0 CC_ENTF2_AB=60 CC_BLP="30:30,80:27"
lauf M m_f_h56 $QM 120 "rang=20 blp 57 in 5, Schlag trifft (54)" $R20 $W CC_BLP="5:57" CC_BSET="40-41:50:0" CC_IN="41:a"
lauf M m_f_h28 $QM 160 "rang=20 blp 30 in 5, 28 in 30, Schlag trifft (25)" $R20 $W CC_BLP="5:30,30:28" CC_BSET="40-41:50:0" CC_IN="41:a"
# M7 Fall mit Aufnahmen in jedem Frame
lauf M m_t_tod $QM 700 "rang=20 blp 2 in 30, Schlag (-1)" $R20 CC_BLP="30:2" CC_BSET="40-41:50:0" CC_IN="41:a" CC_SNAPS="150-300:1"
lauf M m_t_todw $QM 700 "rang=20 blp 2 in 30, Schlag (-1), Gegner festgehalten" $R20 $W CC_BLP="30:2" CC_BSET="40-41:50:0" CC_IN="41:a" CC_SNAPS="150-300:1"
lauf M m_t_todsp $QM 700 "rang=20 blp 2 in 30, Spezial" $R20 CC_BLP="30:2" CC_BSET="40-41:50:0" CC_IN="41:a+j" CC_SNAPS="120-300:1"
# M8 Rakete und Laser, Wurf und dritter Kniestoss der Figur (Umwerfen, Liegezeit)
lauf M m_mis_r item_missile 240 "rang=20 Rakete, Boss 150 px rechts" $W $R20 CC_BSET="2-3:150:0" CC_IN="5:a"
lauf M m_mis_r120 item_missile 240 "rang=20 Rakete, Boss 120 px rechts" $W $R20 CC_BSET="2-3:120:0" CC_IN="5:a"
lauf M m_mis_l item_missile 240 "rang=20 Rakete, Boss 150 px links" $W $R20 CC_BSET="2-3:-150:0" CC_IN="3:l;5:a"
lauf M m_mis_l100 item_missile 240 "rang=20 Rakete, Boss 100 px links" $W $R20 CC_BSET="2-3:-100:0" CC_IN="3:l;5:a"
for i in 0 1 2 3; do
	b=$((20 + 9 * i))
	lauf M m_uw_wurf_$i $QM $((b + 220)) "wurf der figur (von hinten gepackt) versatz=$i" $W $R20 CC_BSET="$b-$((b + 1)):-40:0" CC_IN="$b-$((b + 4)):l;$((b + 10)):a+l"
	lauf M m_uw_knie_$i $QM $((b + 240)) "drei kniestoesse versatz=$i" $W $R20 CC_BSET="$b-$((b + 1)):-40:0" CC_IN="$b-$((b + 4)):l;$((b + 10)):a;$((b + 30)):a;$((b + 50)):a"
	lauf M m_uw_laser_$i item_laser $((280 + 7 * i)) "laser versatz=$i" $W $R20 CC_BSET="$((2 + 7 * i))-$((3 + 7 * i)):150:0" CC_IN="$((5 + 7 * i)):a"
done
# M9 Wuerfe des Bosses (Griff im Entscheidungsframe) und erste Aktion nach dem Aufstehen
lauf M m_wurf_2 $QM 220 "boss packt in X=2 (Figur d=40), Wurf" $W $R20 CC_FIG="2-3:40:0"
lauf M m_wurf_51 $QM 260 "boss packt in X=51 (Figur d=40), Wurf" $W $R20 CC_FIG="51-52:40:0"
for D in 45 55 65; do
	lauf M m_au_v$D $QM 230 "aufstehen, Figur ab G-5 bei d=$D" $W $R20 CC_BSET="45-46:90:0" CC_IN="41-42:r;45-58:r;55:a" CC_FIG="152-153:$D:0"
	lauf M m_au_g$D $QM 230 "aufstehen, Figur in G bei d=$D" $W $R20 CC_BSET="45-46:90:0" CC_IN="41-42:r;45-58:r;55:a" CC_FIG="157-158:$D:0"
done


wait
echo "Laeufe fertig nach $(( $(date +%s) - start )) s" >&2
python3 scripts/messen_boss.py belege --manifest "$MAN" --aus logs/boss.csv
echo "logs/boss.csv: $(wc -l < logs/boss.csv) Zeilen, $(( $(date +%s) - start )) s" >&2
if [ "${BOSS_BEHALTEN:-0}" = "1" ]; then
	echo "Rohdaten behalten (BOSS_BEHALTEN=1)" >&2
else
	aufraeumen
	rm -f "$MAN"
fi

# ================================================================ Teil V
# Gegenpruefung V6 (Praefix boss_v): eigene Szenarien scenarios/boss_v_frei.lua
# (Runner) und scenarios/boss_v_bot.lua (Bot), Auswertung scripts/messen_boss_v.py
# belege nach logs/boss_v.csv. Eigene Ausgangslagen (keine Savestates des
# Messagenten): Bot-Lauf ab "ingame" (boss_v_b1_s1_cam*, boss_v_allein in Frame
# 5600: beide Arena-WOOKY besiegt, Boss 97 LP), daraus boss_v_rakete (Raketen-
# werfer aufgenommen), boss_v_r9 (Rang 9, Boss 100 LP); boss_v_laser aus
# item_bot1_s1_cam02048 (belege_item.sh) mit eigener Aufnahme des Lasers.
# EINGRIFFE (Einzelheiten im Kopf beider Szenarien und im „Nachtrag: Boss“ in notes.md):
# LP der Figur 72 (immer); Rang festgehalten (CC_RANG, BV_RANG); Lagen von Figur
# und Boss (CC_SETZ, CC_FIG, CC_FIGV, CC_FIGA, CC_FIGH, CC_BOSS); LP des Bosses
# (CC_BLP, Bot: BV_BLP_MIN); Gegner entfernt (CC_ENTF); Bot: LP der Gegner nach
# 900 Frames Stillstand auf 1 (nur beim Anlegen der Savestates, BV_CLEAR).
# Laufzeit etwa 6 min (BOSS_V_JOBS parallel, Standard 4); BOSS_BEHALTEN=1
# behaelt auch hier die Rohdaten.
VSZ=scripts/scenarios/boss_v_frei.lua
VMAN=$RAW/boss_v_manifest.tsv
VJOBS=${BOSS_V_JOBS:-4}
vstart=$(date +%s)
for st in ingame item_bot1_s1_cam02048; do
	[ -f "$RAW/sta/captcomm/$st.sta" ] || { echo "Savestate fehlt: $st" >&2; exit 1; }
done
rm -f "$RAW"/boss_v_* "$RAW"/snap/boss_v_*.png
: > "$VMAN"
# vlauf TEIL NAME SAVESTATE INFO [VAR=WERT ...]
vlauf() {
	local teil=$1 name=$2 st=$3 info=$4
	shift 4
	printf '%s\t%s\t%s\t%s\n' "$teil" "$name" "$st" "$info" >> "$VMAN"
	( env "$@" CC_NAME="$name" scripts/run.sh "$VSZ" "$st" > /dev/null 2>&1 || echo "FEHLER $name" >&2 ) &
	while [ "$(jobs -rp | wc -l)" -ge "$VJOBS" ]; do wait -n || true; done
}
# vbot TEIL NAME SAVESTATE INFO [VAR=WERT ...]
vbot() {
	local teil=$1 name=$2 st=$3 info=$4
	shift 4
	printf '%s\t%s\t%s\t%s\n' "$teil" "$name" "$st" "$info" >> "$VMAN"
	( env "$@" CC_NAME="$name" GFA_CFG=scripts/scenarios/boss_v_bot.lua scripts/grafik/bot.sh "$st" > /dev/null 2>&1 \
		|| echo "FEHLER $name" >&2 ) &
	while [ "$(jobs -rp | wc -l)" -ge "$VJOBS" ]; do wait -n || true; done
}

# ---- V0: eigene Savestates
# zwei getrennte Bot-Laeufe: zwei Savestates im selben Frame (5600: cam02112 und
# boss_v_allein) wuerden sich gegenseitig verdraengen (MAME fuehrt nur einen aus)
vbot S boss_v_b1 ingame "Bot ab ingame bis Frame 5605, Savestates je 64 px" BV_SAVE_CAM=64 BV_CLEAR=900 BV_FRAMES=5605
vbot S boss_v_b1a ingame "derselbe Bot-Lauf, Savestate boss_v_allein in Frame 5600" BV_SAVE_AT=5600:boss_v_allein BV_CLEAR=900 BV_FRAMES=5601
wait
vlauf S boss_v_sv_rakete boss_v_b1_s1_cam01984 "Raketenwerfer aufnehmen" CC_IN="2-60:r;61-94:u;95-110:r;140-141:a" CC_FRAMES=148 CC_SAVE=148:boss_v_rakete
vlauf S boss_v_sv_laser item_bot1_s1_cam02048 "Laser aufnehmen, Arena-WOOKY entfernt" CC_ENTF=16,17:2-400 CC_IN="2-53:u;54-94:r;100-101:a" CC_FRAMES=108 CC_SAVE=108:boss_v_laser
vlauf S boss_v_sv_r9 boss_v_b1_s1_cam01984 "Rang 9, Arena-WOOKY entfernt" CC_RANG=9 CC_ENTF=16,17,18:40-8000 CC_IN=2-60:r CC_FRAMES=300 CC_SAVE=300:boss_v_r9
wait

# ---- A: Start-LP nach Rang (Rang festgehalten), zwei Savestates, Rangwechsel um den Entstehungsframe
for r in 7 8 9 12 15 16 20 23 24; do
	vlauf A boss_v_a_r$r boss_v_b1_s1_cam01984 "rang=$r rechts 2-60" CC_IN=2-60:r CC_FRAMES=120 CC_RANG=$r
done
for r in 7 8 9 11 15 16 19 23 24; do
	vlauf A boss_v_a2_r$r boss_v_b1_s1_cam01920 "rang=$r hoch 2-20 rechts 21-160" CC_IN="2-20:u;21-160:r" CC_FRAMES=220 CC_RANG=$r
done
vlauf A boss_v_a_w8_24_40 boss_v_b1_s1_cam01984 "rang 8 bis 40, 24 ab 41" CC_IN=2-60:r CC_FRAMES=120 CC_RANG="8:2-40;24:41-120"
vlauf A boss_v_a_w8_24_39 boss_v_b1_s1_cam01984 "rang 8 bis 39, 24 ab 40" CC_IN=2-60:r CC_FRAMES=120 CC_RANG="8:2-39;24:40-120"
vlauf A boss_v_a_w24_9_40 boss_v_b1_s1_cam01984 "rang 24 bis 40, 9 ab 41" CC_IN=2-60:r CC_FRAMES=120 CC_RANG="24:2-40;9:41-120"
vlauf A boss_v_a_w24_9_39 boss_v_b1_s1_cam01984 "rang 24 bis 39, 9 ab 40" CC_IN=2-60:r CC_FRAMES=120 CC_RANG="24:2-39;9:40-120"
vlauf A boss_v_a_nat boss_v_b1_s1_cam01984 "natuerlicher Rang" CC_IN=2-60:r CC_FRAMES=120
vlauf A boss_v_a2_nat boss_v_b1_s1_cam01920 "natuerlicher Rang" CC_IN="2-20:u;21-160:r" CC_FRAMES=220

# ---- B: Treffer je Angriffsart. Figur bis Q-1 bei x 2470 geparkt, in Q Boss bei
# x 2380, Figur d px rechts davon (Tiefe 200), Figur schlaegt nach links
A0=boss_v_allein
vsetz() { echo "CC_SETZ=p:2470:200:2-$(($1-1));b:2380:200:$1-$1;p:$((2380+$2)):200:$1-$1"; }
for i in $(seq 0 15); do
	Q=$((10 + 7 * i))
	vlauf B boss_v_k_$Q $A0 "Kette aus d 60, rang 12" CC_RANG=12 $(vsetz $Q 60) CC_IN="$Q:l;$((Q+1))-$((Q+2)):a;$((Q+17))-$((Q+18)):a;$((Q+34))-$((Q+35)):a;$((Q+52))-$((Q+53)):a" CC_FRAMES=$((Q+260))
	vlauf B boss_v_e_$Q $A0 "Einzelschlag aus d 60, rang 12" CC_RANG=12 $(vsetz $Q 60) CC_IN="$Q:l;$((Q+1))-$((Q+2)):a" CC_FRAMES=$((Q+160))
done
for i in $(seq 0 11); do
	Q=$((10 + 9 * i))
	vlauf B boss_v_sp_$Q $A0 "Spezialangriff aus d 60, rang 12" CC_RANG=12 $(vsetz $Q 60) CC_IN="$Q:l;$((Q+1)):a+j" CC_FRAMES=$((Q+260))
done
for i in $(seq 0 9); do
	Q=$((10 + 11 * i))
	vlauf B boss_v_sa_$Q $A0 "Sprintangriff aus 140 px, rang 12" CC_RANG=12 CC_SETZ="p:2470:200:2-$((Q-1));b:2340:200:$Q-$Q;p:2480:200:$Q-$Q" CC_IN="$Q-$((Q+1)):l;$((Q+4))-$((Q+16)):l;$((Q+12))-$((Q+13)):a" CC_FRAMES=$((Q+260))
	vlauf B boss_v_gk_$Q $A0 "Figur geht aus d 44 in den Boss, Knie x3, rang 12" CC_RANG=12 $(vsetz $Q 44) CC_IN="$Q-$((Q+12)):l;$((Q+20))-$((Q+21)):a;$((Q+40))-$((Q+41)):a;$((Q+60))-$((Q+61)):a" CC_FRAMES=$((Q+300))
	vlauf B boss_v_gw_$Q $A0 "wie gk, Wurf nach vorn" CC_RANG=12 $(vsetz $Q 44) CC_IN="$Q-$((Q+12)):l;$((Q+20))-$((Q+21)):a+l" CC_FRAMES=$((Q+300))
	vlauf B boss_v_gr_$Q $A0 "wie gk, Wurf rueckwaerts" CC_RANG=12 $(vsetz $Q 44) CC_IN="$Q-$((Q+12)):l;$((Q+20))-$((Q+21)):a+r" CC_FRAMES=$((Q+300))
done
for DX in 70 90 110 130 150 170; do
	vlauf B boss_v_m_$DX boss_v_rakete "Rakete, Boss $DX px links gesetzt" CC_BOSS=-$DX:0:2-2 CC_IN="2:l;5-6:a" CC_FRAMES=400
done
vlauf B boss_v_m_b100 boss_v_rakete "Rakete, Boss bis 9 bei 100 px" CC_BOSS=-100:0:2-9 CC_IN="2:l;10-11:a" CC_FRAMES=400
vlauf B boss_v_m_c130 boss_v_rakete "Rakete, Boss bis 15 bei 130 px, Tiefe -4" CC_BOSS=-130:-4:2-15 CC_IN="2:l;16-17:a" CC_FRAMES=400
for DX in 80 100 120 140 160; do
	vlauf B boss_v_l_$DX boss_v_laser "Laser, Boss $DX px links gesetzt" CC_BOSS=-$DX:0:2-2 CC_IN="2:l;5-6:a" CC_FRAMES=400
done
for i in $(seq 0 11); do
	P0=$((130 + 6 * i))
	vlauf B boss_v_k20_$P0 boss_v_b1_s1_cam01984 "Arena betreten, WOOKY entfernt, rang 20, Kette ab $P0" CC_RANG=20 CC_ENTF=16,17,18:40-$((P0+300)) CC_IN="2-60:r;$((P0+1)):l;$((P0+2))-$((P0+3)):a;$((P0+18))-$((P0+19)):a;$((P0+35))-$((P0+36)):a;$((P0+53))-$((P0+54)):a" CC_SETZ="b:2380:200:$P0-$P0;p:2440:200:$P0-$P0" CC_FRAMES=$((P0+300))
done
for i in $(seq 0 15); do
	Q=$((10 + 5 * i))
	vlauf B boss_v_r24jn_$Q $A0 "Sprungangriff neutral aus d 66, rang 24" CC_RANG=24 $(vsetz $Q 66) CC_IN="$Q:l;$((Q+1)):j;$((Q+5))-$((Q+6)):a" CC_FRAMES=$((Q+200))
	vlauf B boss_v_r24jh_$Q $A0 "Sprungangriff hoch aus d 66, rang 24" CC_RANG=24 $(vsetz $Q 66) CC_IN="$Q:l;$((Q+1)):u+j;$((Q+5))-$((Q+6)):a" CC_FRAMES=$((Q+200))
	vlauf B boss_v_r24sa_$Q $A0 "Sprintangriff, rang 24" CC_RANG=24 CC_SETZ="p:2470:200:2-$((Q-1));b:2340:200:$Q-$Q;p:2480:200:$Q-$Q" CC_IN="$Q-$((Q+1)):l;$((Q+4))-$((Q+16)):l;$((Q+12))-$((Q+13)):a" CC_FRAMES=$((Q+200))
	vlauf B boss_v_r24sp_$Q $A0 "Spezialangriff aus d 60, rang 24" CC_RANG=24 $(vsetz $Q 60) CC_IN="$Q:l;$((Q+1)):a+j" CC_FRAMES=$((Q+200))
	vlauf B boss_v_r24g_$Q $A0 "Griff aus d 44, Knie, Wurf, rang 24" CC_RANG=24 $(vsetz $Q 44) CC_IN="$Q-$((Q+12)):l;$((Q+20))-$((Q+21)):a;$((Q+40))-$((Q+41)):a+l" CC_FRAMES=$((Q+200))
	vlauf B boss_v_r24k_$Q $A0 "Kette aus d 60, rang 24" CC_RANG=24 $(vsetz $Q 60) CC_IN="$Q:l;$((Q+1))-$((Q+2)):a;$((Q+17))-$((Q+18)):a;$((Q+34))-$((Q+35)):a;$((Q+52))-$((Q+53)):a" CC_FRAMES=$((Q+200))
done
for DX in 70 80 90 100 110 120 130 140; do
	vlauf B boss_v_r24m_$DX boss_v_rakete "Rakete, rang 24, Boss $DX px links" CC_RANG=24 CC_BOSS=-$DX:0:2-2 CC_IN="2:l;5-6:a" CC_FRAMES=200
	vlauf B boss_v_r24l_$DX boss_v_laser "Laser, rang 24, Boss $DX px links" CC_RANG=24 CC_BOSS=-$DX:0:2-2 CC_IN="2:l;5-6:a" CC_FRAMES=200
done

# ---- P: Figur passiv (Rhythmus, Wahl, Schaden je Rang)
for R in 7 9 12 16 20 24; do
	vlauf P boss_v_p_r$R $A0 "passiv bei x 2250, rang $R" CC_RANG=$R CC_SETZ=p:2250:200:2-2 CC_FRAMES=8000
done
for R in 9 20; do
	vlauf P boss_v_q_r$R boss_v_b1_s1_cam01984 "Arena betreten, WOOKY entfernt, passiv, rang $R" CC_RANG=$R CC_ENTF=16,17,18:40-8000 CC_IN=2-60:r CC_FRAMES=8000
done

# ---- D: Reichweite. Lauf wie boss_v_p_r12 bzw. boss_v_q_r9 bis A, ab A+1 Figur gesetzt
BP="CC_RANG=12 CC_SETZ=p:2250:200:2-2"
BQ="CC_RANG=9 CC_ENTF=16,17,18:40-8000 CC_IN=2-60:r"
BE="CC_RANG=12 CC_SETZ=p:2470:200:2-23;b:2380:200:24-24;p:2440:200:24-24"
for d in -20 -19 -18 -17 -16 -15 -14 -10 40 80 100 103 104 105 106 110; do
	vlauf D boss_v_ds_x$d $A0 "S (A=381) d=$d" $BP CC_A=1C:4:0x4A67C CC_FIGV=$d:0:A+1-A+20 CC_FRAMES=420
done
for dz in -14 -13 -12 12 13 14; do
	vlauf D boss_v_ds_z$dz $A0 "S d=70 dz=$dz" $BP CC_A=1C:4:0x4A67C CC_FIGV=70:$dz:A+1-A+20 CC_FRAMES=420
done
for h in 60 66 67 70 72 74 76 78; do
	vlauf D boss_v_ds_h$h $A0 "S d=70 Hoehe $h" $BP CC_A=1C:4:0x4A67C CC_FIGV=70:0:A+1-A+20 CC_FIGH=$h:A+1-A+20 CC_FRAMES=420
done
for d in -20 -16 -15 -14 -10 40 80 84 88 90 92 95 96 97 98 100 104 105 106 110; do
	vlauf D boss_v_dk_x$d boss_v_b1_s1_cam01984 "K (q_r9, A=5799, Boss am linken Rand) d=$d" $BQ CC_A=1C:4:0x4A97E CC_FIGV=$d:0:A+1-A+12 CC_FRAMES=5830
done
for dz in -14 -13 -12 12 13 14; do
	vlauf D boss_v_dk_z$dz boss_v_b1_s1_cam01984 "K d=40 dz=$dz" $BQ CC_A=1C:4:0x4A97E CC_FIGV=40:$dz:A+1-A+12 CC_FRAMES=5830
done
for h in 60 66 67 68 69 70 71 72; do
	vlauf D boss_v_dk_h$h boss_v_b1_s1_cam01984 "K d=40 Hoehe $h" $BQ CC_A=1C:4:0x4A97E CC_FIGV=40:0:A+1-A+12 CC_FIGH=$h:A+1-A+12 CC_FRAMES=5830
done
for d in -20 -19 -18 -17 -16 -15 -14 -10; do
	vlauf D boss_v_dk2_x$d $A0 "K (wie boss_v_e_24, A=48) d=$d" $BE CC_IN="24:l;25-26:a" CC_A=1C:4:0x4A97E CC_FIGV=$d:0:A+1-A+12 CC_FRAMES=100
done
for d in -18 -17 -16 94 96 97 100 105 106; do
	vlauf D boss_v_dk3_x$d $A0 "K (wie boss_v_dg_31_x46, A=36) d=$d" CC_RANG=12 CC_SETZ=b:2380:200:31-31 CC_FIGV="46:0:31-31;$d:0:A+1-A+12" CC_A=1C:4:0x4A97E CC_FRAMES=80
done
for dx in -40 -35 -30 -27 -26 -25 -20 0 5 10 15 20 25 26 27; do
	vlauf D boss_v_dp_x$dx $A0 "P (A=1474) Figur ab A+40 bei dx=$dx zu ihrer Lage in A" $BP CC_A=1C:4:0x4B842 CC_FIGA=$dx:0:A+40-A+75 CC_FRAMES=1560
done
for dz in -14 -13 -12 12 13 14; do
	vlauf D boss_v_dp_z$dz $A0 "P Figur ab A+40 dz=$dz" $BP CC_A=1C:4:0x4B842 CC_FIGA=0:$dz:A+40-A+75 CC_FRAMES=1560
done
for J in 1500 1512; do
	vlauf D boss_v_dp_j$J $A0 "P Figur springt in $J" $BP CC_A=1C:4:0x4B842 CC_FIGA=0:0:A+20-A+75 CC_IN=$J:j CC_FRAMES=1560
done
for Q in 2 31 60; do
	for d in 46 47 48 49 50 51; do
		vlauf DG boss_v_dg_${Q}_x$d $A0 "Boss in $Q bei x 2380, Figur d=$d" CC_RANG=12 CC_SETZ=b:2380:200:$Q-$Q CC_FIGV=$d:0:$Q-$Q CC_FRAMES=$((Q+40))
	done
	for dz in -9 -8 -7 6 7 8; do
		vlauf DG boss_v_dg_${Q}_z$dz $A0 "Boss in $Q bei x 2380, Figur d=44 dz=$dz" CC_RANG=12 CC_SETZ=b:2380:200:$Q-$Q CC_FIGV=44:$dz:$Q-$Q CC_FRAMES=$((Q+40))
	done
done
for dz in -6 -5; do
	vlauf DG boss_v_dg_2_z$dz $A0 "Boss in 2, Figur d=44 dz=$dz" CC_RANG=12 CC_SETZ=b:2380:200:2-2 CC_FIGV=44:$dz:2-2 CC_FRAMES=42
done

# ---- W: Wellen (LP des Bosses gesetzt)
SW() { echo "CC_SETZ=b:2380:200:$1-$1;p:2440:200:$1-$1 CC_IN=$1:l;$(($1+1))-$(($1+2)):a"; }
for L in 56 57 58 59; do vlauf W boss_v_w_h$L $A0 "blp $L, Schlag in 13" CC_RANG=12 CC_BLP=$L:2-2 $(SW 12) CC_FRAMES=200; done
for Q in 20 34 48 62 76 90; do vlauf W boss_v_w_r58_$Q $A0 "blp 58, Schlag ab $Q" CC_RANG=12 CC_BLP=58:2-2 $(SW $Q) CC_FRAMES=$((Q+150)); done
for L in 28 29 30 31; do
	vlauf W boss_v_w_v$L $A0 "blp $L, Schlag in 61, EDDY leben" CC_RANG=12 CC_BLP=$L:2-2 $(SW 60) CC_FRAMES=400
	vlauf W boss_v_w_v${L}_e1 $A0 "blp $L, EDDY Slot 16 in 20 entfernt" CC_RANG=12 CC_BLP=$L:2-2 CC_ENTF=16:20-20 $(SW 60) CC_FRAMES=400
	vlauf W boss_v_w_v${L}_e2 $A0 "blp $L, EDDY Slot 16 und 18 in 20 entfernt" CC_RANG=12 CC_BLP=$L:2-2 CC_ENTF=16,18:20-20 $(SW 60) CC_FRAMES=400
done
for L in 50 51 25 26; do vlauf W boss_v_w9s_$L boss_v_r9 "rang 9, blp $L ohne Treffer" CC_RANG=9 CC_BLP=$L:2-2 CC_FRAMES=150; done
for L in 55 56 27 28; do vlauf W boss_v_ws_$L $A0 "blp $L ohne Treffer" CC_RANG=12 CC_BLP=$L:2-2 CC_FRAMES=150; done

# ---- T: Fall
vlauf T boss_v_t_lp3 $A0 "blp 3, Schlag in 13" CC_RANG=12 CC_BLP=3:2-2 $(SW 12) CC_FRAMES=1400
vlauf T boss_v_t_lp0 $A0 "blp 0, Figur passiv" CC_RANG=12 CC_BLP=0:2-2 CC_SETZ=p:2250:200:2-2 CC_FRAMES=1300
vlauf T boss_v_t_todk $A0 "blp 0, Kette ab 901" CC_RANG=12 CC_BLP="0:2-2;0:900-900" CC_SETZ="b:2380:200:900-900;p:2440:200:900-900" CC_IN="900:l;901-902:a;918-919:a;935-936:a;953-954:a" CC_FRAMES=1560
vlauf T boss_v_t_k1100r $A0 "blp 0, Kette ab 1101" CC_RANG=12 CC_BLP=0:2-2 CC_FIGV=60:0:1100-1100 CC_IN="1100:r;1101-1102:a;1117-1118:a;1134-1135:a;1152-1153:a" CC_FRAMES=1760
vlauf T boss_v_t_todsp $A0 "blp 0, Spezialangriff in 901" CC_RANG=12 CC_BLP=0:2-2 CC_FIGV=60:0:900-900 CC_IN="901:a+j" CC_FRAMES=1560
for H in 397 398 399; do
	vlauf TS boss_v_t_s$H $A0 "blp 0 in 370, Treffer in $H (Armschwung A=381, aktiv ab 398)" $BP CC_BLP=0:370-370 CC_FIGV=60:0:382-$((H-3)) CC_IN="$((H-2))-$((H-1)):a" CC_FRAMES=460
done
SN1=$(for f in $(seq 1336 1360); do printf '%d:boss_v_t_k1100r_s,' $f; done)
SN2=$(for f in $(seq 1130 1180); do printf '%d:boss_v_t_todsp_s,' $f; done)
vlauf TB boss_v_t_k1100r_s $A0 "wie boss_v_t_k1100r, Aufnahmen 1336-1360" CC_RANG=12 CC_BLP=0:2-2 CC_FIGV=60:0:1100-1100 CC_IN="1100:r;1101-1102:a;1117-1118:a;1134-1135:a;1152-1153:a" CC_FRAMES=1362 CC_SNAP="$SN1"
vlauf TB boss_v_t_todsp_s $A0 "wie boss_v_t_todsp, Aufnahmen 1130-1180" CC_RANG=12 CC_BLP=0:2-2 CC_FIGV=60:0:900-900 CC_IN="901:a+j" CC_FRAMES=1185 CC_SNAP="$SN2"

# ---- LI: Trefferbarkeit beim Liegen, nach Spezialangriff und Rueckzug (Schlag alle 8 Frames, Phase o)
for o in 0 2 4 6; do
	vlauf LI boss_v_li_s$o $A0 "Sprintangriff (K=27), danach Figur 60 px rechts, Schlag ab $((36+o))" CC_RANG=12 CC_SETZ="p:2470:200:2-9;b:2340:200:10-10;p:2480:200:10-10" CC_FIG=60:0:34-250 CC_IN="10-11:l;14-26:l;22-23:a;$(for f in $(seq $((36+o)) 8 250); do printf '%d-%d:a;' $f $((f+1)); done)" CC_FRAMES=260
	vlauf LI boss_v_li_p$o $A0 "Spezialangriff (h=25), danach Schlag ab $((62+o))" CC_RANG=12 CC_SETZ="p:2470:200:2-9;b:2380:200:10-10;p:2440:200:10-10" CC_FIG=60:0:30-200 CC_IN="10:l;11:a+j;$(for f in $(seq $((62+o)) 8 200); do printf '%d-%d:a;' $f $((f+1)); done)" CC_FRAMES=210
	vlauf LI boss_v_li_r$o $A0 "Schlag zurueckgewiesen (h=13), danach Schlag ab $((16+o))" CC_RANG=12 CC_SETZ="p:2470:200:2-9;b:2380:200:10-10;p:2440:200:10-10" CC_FIG=60:0:16-120 CC_IN="10:l;11-12:a;$(for f in $(seq $((16+o)) 8 120); do printf '%d-%d:a;' $f $((f+1)); done)" CC_FRAMES=130
done

# ---- U: unterbrochene Kette (zweiter Schlag nach Pause, Druck h+g-2)
for Q in 31 45; do
	for g in 20 24 28 30 32 34 36 38 40 42 44 48; do
		h=$((Q+3))
		vlauf U boss_v_u${Q}_$g $A0 "Stufe 1 in h=$h, zweiter Druck h+$((g-2))" CC_RANG=12 CC_SETZ="p:2470:200:2-$((Q-1));b:2380:200:$Q-$Q;p:2440:200:$Q-$Q" CC_IN="$Q:l;$((Q+1))-$((Q+2)):a;$((h+g-2))-$((h+g-1)):a" CC_FRAMES=$((Q+180))
	done
done

# ---- AU: nach dem Aufstehen (Sprintangriff wie boss_v_sa_10: K = 27, G = 132)
for d in 45 55 65; do
	vlauf AU boss_v_au_$d $A0 "Figur in 127 (G-5) d=$d vor dem Boss, passiv" CC_RANG=12 CC_SETZ="p:2470:200:2-9;b:2340:200:10-10;p:2480:200:10-10" CC_IN="10-11:l;14-26:l;22-23:a" CC_FIGV=$d:0:127-127 CC_FRAMES=260
done
for P in 120 124; do
	vlauf AU boss_v_au_sp$P $A0 "Figur in $((P-1)) d=60, Spezialangriff in $P" CC_RANG=12 CC_SETZ="p:2470:200:2-9;b:2340:200:10-10;p:2480:200:10-10" CC_IN="10-11:l;14-26:l;22-23:a;$P:a+j" CC_FIGV=60:0:$((P-1))-$((P-1)) CC_FRAMES=260
done

# ---- BOT: Bot kaempft gegen den Boss (LP des Bosses unter 30 bzw. 60 zurueckgesetzt)
vbot BOT boss_v_bot_r7 boss_v_allein "Bot, rang 7" BV_RANG=7 BV_BLP_MIN=30 BV_BLP=97 BV_FRAMES=8000
vbot BOT boss_v_bot_r24 boss_v_allein "Bot, rang 24" BV_RANG=24 BV_BLP_MIN=30 BV_BLP=97 BV_FRAMES=8000
vbot BOT boss_v_bot_nat boss_v_allein "Bot, natuerlicher Rang 18-24" BV_BLP_MIN=60 BV_BLP=100 BV_FRAMES=6000

wait
echo "Teil V: Laeufe fertig nach $(( $(date +%s) - vstart )) s" >&2
python3 scripts/messen_boss_v.py belege --manifest "$VMAN" --aus logs/boss_v.csv
echo "logs/boss_v.csv: $(wc -l < logs/boss_v.csv) Zeilen, $(( $(date +%s) - vstart )) s" >&2
if [ "${BOSS_BEHALTEN:-0}" = "1" ]; then
	echo "Rohdaten Teil V behalten (BOSS_BEHALTEN=1)" >&2
else
	rm -f "$RAW"/boss_v_* "$RAW"/snap/boss_v_*.png
fi
