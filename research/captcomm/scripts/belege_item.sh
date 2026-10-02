#!/usr/bin/env bash
# Gegenstaende, Waffen und Punkte (Praefix item): alle MAME-Laeufe von vorn,
# Auswertung mit messen_item.py nach logs/item.csv, danach werden die eigenen
# Rohdaten (logs/raw/item_*) geloescht; die Savestates item_* bleiben.
# Voraussetzung: Savestates stage1..stage9 (scenarios/stage_start.lua).
# Dauer: etwa 15 bis 20 Minuten mit Teil V und W (ITEM_PARALLEL Laeufe gleichzeitig, Standard 3).
#
# Ablauf:
#  A  Durchlauf-Bot (grafik/bot.lua mit scenarios/item_bot.lua) je Stage:
#     Katalog der Gegenstaende und Punkte; Savestates als Ausgangslage
#     (item_bot1_s1_cam01281: Oelfaesser, item_bot1_s1_cam02048: Bossarena,
#     item_s<N>_<art>: ein Gegenstand der Art liegt). EINGRIFFE des Bots:
#     LP der Figur aufgefuellt, nach 900 Frames Stillstand Gegner-LP auf 1.
#  B  Bossarena: Hammer, Laser bzw. Raketenwerfer aufnehmen (Savestates
#     item_hammer, item_laser, item_missile). EINGRIFF: DOLG (Slot 19) auf
#     x 2700 gehalten (ausserhalb des Bildes).
#  C  Einzellaeufe mit scenarios/item_frei.lua (Eingaben und Eingriffe stehen
#     unten je Lauf; EINGRIFF ist immer CC_POKES, CC_REL oder CC_ZU).
#  D  Auswertung.
#  W  Dritte Messung des Messagenten zu den Zeilen, in denen V abweicht
#     (Praefix item_d, scenarios/item_frei.lua), angehaengt an logs/item.csv.
#  V  Gegenpruefung (Praefix item_v, eigene Szenarien item_v_frei.lua und
#     item_v_bot.lua, Auswertung messen_item_v.py nach logs/item_v.csv);
#     verlaengert die Laufzeit um etwa 6 Minuten.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/item_frei.lua
cfg=scripts/scenarios/item_bot.lua
out=logs/item.csv
par=${ITEM_PARALLEL:-3}
M="python3 scripts/messen_item.py"

# Zeilen "name savestate VAR=wert ..." parallel mit item_frei.lua ausfuehren
laeufe() {
	xargs -P "$par" -L 1 bash -c 'nm=$0; st=$1; shift; env "$@" CC_NAME=$nm scripts/run.sh '"$sc"' $st >/dev/null 2>&1 || echo "Fehler: $nm" >&2'
}
bot() {
	local name=$1 stage=$2; shift 2
	env "$@" CC_NAME="$name" GFA_CFG=$cfg scripts/grafik/bot.sh "$stage" >/dev/null 2>&1 || echo "Fehler: $name" >&2
}

rm -f logs/raw/item_* logs/raw/sta/captcomm/item_*.sta

# --- A: Bot je Stage -------------------------------------------------------
bot item_bot1 stage1 GFA_FRAMES=9000 GFA_SAVE_CAM=64 &
bot item_bot2 stage2 GFA_FRAMES=20000 GFA_SAVE_CAM=0 &
bot item_bot3 stage3 GFA_FRAMES=20000 GFA_SAVE_CAM=0 GFA_SAVE_AT=1200:item_s3_mardia,5560:item_s3_0e &
wait
bot item_bot4 stage4 GFA_FRAMES=20000 GFA_SAVE_CAM=0 &
bot item_bot5 stage5 GFA_FRAMES=20000 GFA_SAVE_CAM=0 &
bot item_bot6 stage6 GFA_FRAMES=20000 GFA_SAVE_CAM=0 GFA_SAVE_AT=4770:item_s6_22 &
wait
bot item_bot7 stage7 GFA_FRAMES=20000 GFA_SAVE_CAM=0 GFA_SAVE_AT=210:item_s7_04,1800:item_s7_0e,7370:item_s7_00,10840:item_s7_2c &
bot item_bot8 stage8 GFA_FRAMES=20000 GFA_SAVE_CAM=0 GFA_SAVE_AT=2590:item_s8_2c,3650:item_s8_2a,3800:item_s8_24 &
bot item_bot9 stage9 GFA_FRAMES=20000 GFA_SAVE_CAM=0 &
wait

# --- B: Waffen in der Bossarena aufnehmen ----------------------------------
A=item_bot1_s1_cam02048
D="s19+e=2700:2"   # EINGRIFF DOLG fern
laeufe <<EOF
item_save_hammer $A CC_FRAMES=130 CC_SAVE=130:item_hammer CC_POKES=2-130:$D CC_IN=2-76:right;77-117:up;120-121:attack
item_save_laser $A CC_FRAMES=105 CC_SAVE=105:item_laser CC_POKES=2-105:$D CC_IN=2-39:right;40-88:up;95-96:attack
item_save_missile $A CC_FRAMES=145 CC_SAVE=145:item_missile CC_POKES=2-145:$D CC_IN=2-58:right;59-128:up;135-136:attack
EOF

# --- C: Einzellaeufe -------------------------------------------------------
F=item_bot1_s1_cam01281
# kalibriert: Fass 43 zerbricht in 192, Raketenwerfer landet in 241 (x 1520, Tiefe 172)
B="2-60:right;61-185:down;186-186:left;190-191:attack"
# danach Fass 44 von rechts schlagen: Brathaehnchen erscheint 273, landet 322 (x 1480, Tiefe 184)
B2="$B;225-235:up;236-265:left;270-271:attack"
W="2-50:$D"
{
	# Stage 1, Oelfaesser (natuerlich, ausser wo EINGRIFF angegeben)
	echo "item_f_fass $F CC_FRAMES=1250 CC_POKES=2-1250:p+40=72:2 CC_IN=$B2;300-340:right"   # EINGRIFF LP 72
	echo "item_f_scroll $F CC_FRAMES=700 CC_POKES=2-700:p+40=72:2 CC_IN=$B;220-245:down;250-600:right"  # EINGRIFF LP 72
	echo "item_f_nah_x $F CC_FRAMES=340 CC_IN=$B;250-330:left"
	echo "item_f_nah_z $F CC_FRAMES=400 CC_IN=$B;225-260:left;265-300:up;305-380:down"
	echo "item_f_sprung $F CC_FRAMES=340 CC_IN=$B;248-290:left;250-250:jump;270-270:attack;274-274:attack;310-311:attack"
	for lp in 10 40 70 71; do echo "item_f_essen$lp $F CC_FRAMES=360 CC_POKES=300-300:p+40=$lp:2 CC_IN=$B2;300-328:left;335-336:attack"; done
	echo "item_f_essen72 $F CC_FRAMES=360 CC_IN=$B2;300-328:left;335-336:attack"
	echo "item_f_waffe $F CC_FRAMES=700 CC_IN=$B;245-280:left;300-301:attack;320-320:right;330-331:attack;370-371:attack;410-411:attack"
	echo "item_f_verlust $F CC_FRAMES=800 CC_IN=$B;245-280:left;300-301:attack"
	echo "item_f_essen_waffe $F CC_FRAMES=470 CC_POKES=2-2:p+40=10:2 CC_IN=$B;210-218:up;220-249:left;255-256:attack;300-329:left;340-341:attack;400-420:left;421-429:up;440-441:attack"
	# Bossarena
	echo "item_a_liegen $A CC_FRAMES=900"
	echo "item_a_hammer $A CC_FRAMES=600 CC_POKES=2-600:$D CC_IN=2-76:right;77-117:up;120-121:attack;135-135:left;150-151:attack;190-191:attack;230-231:attack;270-271:attack;310-311:attack;350-351:attack;390-391:attack;430-431:attack"
	echo "item_a_laser item_laser CC_FRAMES=250 CC_POKES=2-250:$D CC_IN=2-2:left;5-6:attack;45-46:attack;85-86:attack;125-126:attack"
	echo "item_a_tausch item_hammer CC_FRAMES=120 CC_POKES=2-120:$D CC_REL=2-120:16:-300:0;2-120:17:-300:40 CC_IN=5-20:left;21-52:up;60-61:attack;90-91:attack"
	echo "item_w_sprung item_missile CC_FRAMES=160 CC_POKES=2-160:$D CC_REL=2-160:16:-300:0;2-160:17:-300:40 CC_IN=3-3:jump;60-60:jump;75-76:attack;120-121:attack"
	echo "item_w_sprung_h item_hammer CC_FRAMES=160 CC_POKES=2-160:$D CC_REL=2-160:16:-300:0;2-160:17:-300:40 CC_IN=3-3:jump;60-60:jump;75-76:attack;120-121:attack"
	echo "item_w_griff item_hammer CC_FRAMES=60 CC_POKES=2-60:$D;2-2:s16+40=100:2 CC_REL=2-6:16:30:0;2-60:17:-300:40 CC_IN=3-8:right;20-21:attack"
	echo "item_w_multi_h item_hammer CC_FRAMES=50 CC_POKES=$W;2-2:s16+40=100:2;2-2:s17+40=100:2 CC_REL=2-50:16:40:0;2-50:17:110:0 CC_IN=3-4:attack"
	echo "item_w_multi_l item_laser CC_FRAMES=50 CC_POKES=$W;2-2:s16+40=100:2;2-2:s17+40=100:2 CC_REL=2-50:16:80:0;2-50:17:150:0 CC_IN=3-4:attack"
	echo "item_w_multi_m item_missile CC_FRAMES=60 CC_POKES=2-60:$D;2-2:s16+40=100:2;2-2:s17+40=100:2 CC_REL=2-60:16:100:0;2-60:17:170:10 CC_IN=3-4:attack"
	# Reichweite, EINGRIFF: WOOKY mit 100 LP relativ zur Figur gesetzt (dx, dz).
	# Reihe A: Blick rechts, Druck in Frame 3. Reihe B: erst Blick links (links in
	# Frame 2, Gegner bis Frame 3 geparkt, sonst greift die Figur ihn), Druck in 8.
	# Reihe C (Laser): Figur erst 60 Frames nach links, dann Blick rechts, Druck in 68.
	# Gegner mehr als 64 px rechts ausserhalb des Bildes (x >= Kamera-x + 448)
	# werden nicht getroffen; die Reihen sind so gelegt, dass das nur fuer die
	# markierten Grenzproben gilt.
	ra() { echo "item_${1}_a$2_$3 $4 CC_FRAMES=$5 CC_POKES=2-$5:$D;2-2:s$2+40=100:2 CC_REL=2-$5:$2:$6:$7;2-$5:$((33 - $2)):-300:0 CC_IN=3-4:attack"; }
	rb() { echo "item_${1}_b$2_$3 $4 CC_FRAMES=$5 CC_POKES=2-$5:$D;2-2:s$2+40=100:2 CC_REL=2-3:$2:300:0;4-$5:$2:$6:$7;2-$5:$((33 - $2)):300:0 CC_IN=2-2:left;8-9:attack"; }
	for x in 26 27 124 125; do ra ham 16 x$x item_hammer 45 $x 0; ra ham 17 x$x item_hammer 45 $x 0; done
	for z in -13 -12 12 13; do ra ham 16 z$z item_hammer 45 60 $z; done
	for x in -25 -26 -147 -148; do rb ham 16 x$x item_hammer 50 $x 0; rb ham 17 x$x item_hammer 50 $x 0; done
	for z in -13 -12 12 13; do rb ham 17 z$z item_hammer 50 -80 $z; done
	for x in 51 52; do ra las 16 x$x item_laser 45 $x 0; done
	for z in -13 -12 12 13; do ra las 16 z$z item_laser 45 130 $z; done
	for x in 191 192; do ra las 16 x$x item_laser 45 $x 0; done   # Grenze = Bildrand + 64
	for x in 150 200 250 290; do echo "item_las_c16_x$x item_laser CC_FRAMES=110 CC_POKES=2-110:$D;2-2:s16+40=100:2 CC_REL=2-60:16:-300:40;61-110:16:$x:0;2-110:17:-300:0;2-110:44:300:0;2-110:58:300:0 CC_IN=2-61:left;63-63:right;68-69:attack"; done
	for x in -50 -51 -52 -150 -250 -310; do rb las 17 x$x item_laser 50 $x 0; done
	for z in -13 -12 12 13; do rb las 17 z$z item_laser 50 -100 $z; done
	for x in 59 60 100 150 191 192; do ra mis 16 x$x item_missile 60 $x 0; done   # 191/192 = Bildrand + 64
	for z in -29 -28; do ra mis 16 z$z item_missile 60 150 $z; done
	for x in -90 -92 -94 -96 -98 -150 -252 -258; do rb mis 17 x$x item_missile 65 $x 0; done   # -258 = linker Bildrand
	for z in -29 -28; do rb mis 17 z$z item_missile 65 -150 $z; done
	# positive Tiefe: Figur erst 30 Frames nach unten (Obergrenze der Arena 229),
	# die anderen Gegenstaende per EINGRIFF weg (sonst wird der Hammer aufgenommen)
	for z in 28 29; do
		echo "item_mis_a16_z$z item_missile CC_FRAMES=100 CC_POKES=2-100:$D;2-2:s16+40=100:2 CC_REL=2-100:16:150:$z;2-100:17:-300:0;2-100:53:300:0;2-100:58:300:-40 CC_IN=2-31:down;40-41:attack"
		echo "item_mis_b17_z$z item_missile CC_FRAMES=100 CC_POKES=2-100:$D;2-2:s17+40=100:2 CC_REL=2-100:17:-150:$z;2-100:16:300:0;2-100:53:300:0;2-100:58:300:-40 CC_IN=2-2:left;3-32:down;40-41:attack"
	done
	# Aufnahmebereich, EINGRIFF: Gegenstand alle 2 Frames um 1 px relativ zur Figur
	# verschoben (dx bzw. dz), die anderen beiden Gegenstaende 300 px entfernt
	python3 - <<'PY'
def sweep(name, slot, others, vals, axis, facing):
    rel, f = [], 70
    for v in vals:
        rel.append(f"{f}-{f+1}:{slot}:{v if axis == 'x' else 0}:{v if axis == 'z' else 0}")
        f += 2
    for o in others:
        rel.append(f"70-{f+2}:{o}:300:{40 if o == 44 else 0}")
    print(f"{name} item_bot1_s1_cam02048 CC_FRAMES={f+2} CC_POKES=2-{f+2}:s19+e=2700:2 CC_REL={';'.join(rel)} CC_IN={facing}")
for kind, slot, others in (("h", 58, (44, 53)), ("m", 44, (53, 58)), ("l", 53, (44, 58))):
    sweep(f"item_nah_{kind}xr", slot, others, range(-48, 49), "x", "1-1:up")
    sweep(f"item_nah_{kind}xl", slot, others, range(-48, 49), "x", "60-60:left")
sweep("item_nah_hzr", 58, (44, 53), range(-20, 21), "z", "1-1:up")
sweep("item_nah_hzl", 58, (44, 53), range(-20, 21), "z", "60-60:left")
PY
	# Weitere Stages: EINGRIFF Figur auf den Gegenstand gesetzt (CC_ZU), LP gesetzt
	for k in s6_22:58:2 s7_2c:52:2 s8_2c:45:150 s8_24:44:150 s8_2a:45:150; do
		IFS=: read -r s n t <<<"$k"
		for lp in 10 40 70 72; do
			pk="$t-$t:p+40=$lp:2"; [ "$lp" = 72 ] && pk=""
			echo "item_k_${s}_lp$lp item_$s CC_FRAMES=$((t + 60)) CC_POKES=$pk CC_ZU=$t-$((t + 50)):$n CC_IN=$((t + 10))-$((t + 11)):attack;$((t + 18))-$((t + 19)):attack;$((t + 26))-$((t + 27)):attack;$((t + 34))-$((t + 35)):attack"
		done
	done
	for k in s3_0e:58 s7_00:55 s7_04:58 s7_0e:50; do
		IFS=: read -r s n <<<"$k"
		echo "item_k_${s}_w item_$s CC_FRAMES=240 CC_POKES=2-2:p+40=40:2 CC_ZU=2-30:$n CC_IN=5-6:attack;12-13:attack;20-21:attack;28-29:attack;60-61:attack;100-101:attack;140-141:attack;180-181:attack"
	done
} | laeufe

# --- D: Auswertung ----------------------------------------------------------
R=logs/raw
{
	echo "# Gegenstaende, Waffen und Punkte (Captain Commando). Erzeugt von scripts/belege_item.sh,"
	echo "# Auswertung scripts/messen_item.py. Frames = lokale Frames des Runners (Druck f = Taste in f gedrueckt)."
	echo "# Gegenstand: Slot 20..59, Typ S+0x38 = 0x95F9C, Art S+0x3D, Munition S+0xB1, Liegezeit S+0x60."
	echo "# EINGRIFFE: item_f_fass, item_f_scroll LP der Figur auf 72; item_f_essen10/40/70/71 LP einmal gesetzt;"
	echo "# item_a_* ausser item_a_liegen, item_w_*, item_ham_*, item_las_*, item_mis_*, item_nah_*: DOLG auf x 2700;"
	echo "# item_ham/las/mis_*, item_w_multi_*: WOOKY (LP 100) relativ zur Figur gesetzt; item_nah_*: Gegenstand"
	echo "# relativ zur Figur verschoben; item_k_*: Figur auf den Gegenstand gesetzt, LP gesetzt (lp72: ohne LP-Eingriff)."
	echo "# Bot-Laeufe item_bot*: LP der Figur aufgefuellt, nach 900 Frames Stillstand Gegner-LP auf 1."
	echo "## objekte (Einzellaeufe)"
	$M objekte $R/item_f_* $R/item_a_* $R/item_k_*_w_ram.hdr
	echo "## bot (Katalog je Stage, nur Gegenstaende; Behaelter/Truemmer ausgelassen)"
	$M bot $R/item_bot[1-9]_bot.csv | grep -v "Behaelter/Truemmer"
	echo "## aufnahme"
	$M aufnahme $R/item_f_* $R/item_a_* $R/item_k_* $R/item_save_*
	echo "## nah (natuerlich, Fassbereich)"
	$M nah $R/item_f_nah_x $R/item_f_nah_z $R/item_f_sprung
	echo "## nahsweep (EINGRIFF)"
	$M nahsweep $R/item_nah_*
	echo "## waffe (natuerliche Einsaetze und Sonderfaelle)"
	$M waffe $R/item_f_waffe $R/item_f_verlust $R/item_f_essen_waffe $R/item_a_hammer $R/item_a_laser $R/item_a_tausch $R/item_w_* $R/item_k_*_w_ram.hdr
	echo "## reichweite (EINGRIFF)"
	$M reichweite $R/item_ham_* $R/item_las_* $R/item_mis_* $R/item_w_multi_*
	echo "## punkte (Einzellaeufe)"
	$M punkte $R/item_f_* $R/item_a_* $R/item_w_multi_* $R/item_k_*
	echo "## botpunkte Stage 1 (alle Aenderungen)"
	$M botpunkte $R/item_bot1_bot.csv
	echo "## botpunkte Stage 2-9 (nur Aenderungen ab 200 Punkten)"
	$M botpunkte $R/item_bot[2-9]_bot.csv | awk -F, 'NR > 1 && $6 >= 200'
} > $out
# === V: Gegenpruefung (Praefix item_v) =====================================
# Eigene Laeufe des Gegenpruefers mit scenarios/item_v_frei.lua und
# scenarios/item_v_bot.lua (andere Savestates, Gegner, Positionen und
# Reihenfolgen als oben), Auswertung mit scripts/messen_item_v.py nach
# logs/item_v.csv. logs/item.csv bleibt unveraendert. Die Rohdaten loescht der
# Schluss dieses Skripts zusammen mit den uebrigen item_*-Dateien.
#  V0  Bot (item_v_bot.lua) je Stage: Katalog, Punkte, Savestates item_v_*.
#      Stage 1 ab "ingame" (nicht "stage1"). EINGRIFFE des Bots: LP der Figur
#      aufgefuellt, nach 600 Frames Stillstand Gegner-LP auf 1.
#  V1  Savestates mit Gegenstand in der Hand (Aufnahme ohne Eingriff, ausser
#      item_v_s5_las: zwei Gegner waehrend der Aufnahme weggesetzt).
#  V2  Einzellaeufe. EINGRIFFE stehen je Lauf (CC_LP, CC_ELP, CC_SETZE, CC_RANG).
#  V3  Erklaerungslaeufe mit item_frei.lua und Savestates des Messagenten
#      (neue Positionen bzw. Reihenfolge), nur zur Deutung von Abweichungen.
scv=scripts/scenarios/item_v_frei.lua
cfgv=scripts/scenarios/item_v_bot.lua
outv=logs/item_v.csv
MV="python3 scripts/messen_item_v.py"
laeufe_v() {
	xargs -P "$par" -L 1 bash -c 'nm=$0; st=$1; shift; env "$@" CC_NAME=$nm scripts/run.sh '"$scv"' $st >/dev/null 2>&1 || echo "Fehler: $nm" >&2'
}
botv() {
	local name=$1 state=$2; shift 2
	env "$@" CC_NAME="$name" GFA_CFG=$cfgv scripts/grafik/bot.sh "$state" >/dev/null 2>&1 || echo "Fehler: $name" >&2
}

# --- V0: Bot je Stage ---------------------------------------------------------
botv item_v_b1 ingame IV_FRAMES=9000 IV_SAVE_CAM=96 IV_SAVES=2880:item_v_b1_f2880 &
botv item_v_b2 stage2 IV_FRAMES=16000 IV_SAVES=8640:item_v_s2_huhn &
botv item_v_b3 stage3 IV_FRAMES=16000 IV_SAVES=3220:item_v_s3_shuriken &
wait
botv item_v_b4 stage4 IV_FRAMES=16000 &
botv item_v_b5 stage5 IV_FRAMES=16000 IV_SAVES=3590:item_v_s5_laser2 &
botv item_v_b6 stage6 IV_FRAMES=16000 IV_SAVES=4565:item_v_s6_tendon,7442:item_v_s6_mis_b,9205:item_v_s6_24 &
wait
botv item_v_b7 stage7 IV_FRAMES=16000 IV_SAVES=3490:item_v_s7_gun,3875:item_v_s7_mgun,8135:item_v_s7_hammer,10875:item_v_s7_cherry &
botv item_v_b8 stage8 IV_FRAMES=16000 IV_SAVES=2750:item_v_s8_cherry,4585:item_v_s8_2a &
botv item_v_b9 stage9 IV_FRAMES=16000 &
wait

# --- V1: Waffen aufnehmen, Savestates -----------------------------------------
echo "item_v_fass43 item_v_b1_f2880 CC_FRAMES=215 CC_IN=37-85:p1_left;86-148:p1_down;155:p1_attack CC_SAVE=210:item_v_mis_liegt" | laeufe_v
laeufe_v <<'EOF'
item_v_mis_auf2 item_v_mis_liegt CC_FRAMES=30 CC_IN=5:p1_attack CC_SAVE=25:item_v_mis
item_v_s5_las_auf item_v_s5_laser2 CC_FRAMES=130 CC_IN=2-32:p1_up;93:p1_attack CC_SETZE=16:-300:0:2:300,19:-320:0:2:300 CC_SAVE=115:item_v_s5_las
item_v_s7h_auf item_v_s7_hammer CC_FRAMES=150 CC_IN=2-35:p1_down;36-69:p1_right;72:p1_attack CC_SAVE=85:item_v_s7_ham
item_v_s7g_auf item_v_s7_gun CC_FRAMES=25 CC_IN=3:p1_attack CC_SAVE=20:item_v_s7_g
item_v_s7mg_auf item_v_s7_mgun CC_FRAMES=110 CC_IN=2-32:p1_down;33-86:p1_right;90:p1_attack CC_SAVE=105:item_v_s7_mg
EOF

# --- V2: Einzellaeufe -----------------------------------------------------------
{
	# Stage 1, Oelfass 44 (Brathaehnchen) ab item_v_b1_s1_cam01248; EINGRIFF CC_LP
	B="2-67:p1_down;70:p1_attack"
	S1=item_v_b1_s1_cam01248
	echo "item_v_fass44 $S1 CC_FRAMES=200 CC_IN=$B"
	for lp in 2 35 66 71; do echo "item_v_huhn_lp$lp $S1 CC_FRAMES=170 CC_LP=$lp CC_IN=$B;124-131:p1_right;135:p1_attack"; done
	echo "item_v_huhn_lp72 $S1 CC_FRAMES=170 CC_IN=$B;124-131:p1_right;135:p1_attack"
	echo "item_v_huhn_dx20 $S1 CC_FRAMES=170 CC_IN=$B;124-130:p1_right;135:p1_attack"
	echo "item_v_huhn_dx19 $S1 CC_FRAMES=170 CC_IN=$B;124-130:p1_right;131:p1_right+p1_down;135:p1_attack"
	for k in 3 4 5 6; do
		echo "item_v_hx_r$k $S1 CC_FRAMES=150 CC_IN=$B;124-$((123 + k)):p1_right;135:p1_attack"
		echo "item_v_hx_d$k $S1 CC_FRAMES=150 CC_IN=$B;124-$((123 + k)):p1_right;$((124 + k)):p1_right+p1_down;135:p1_attack"
	done
	echo "item_v_hx_k1 $S1 CC_FRAMES=140 CC_IN=$B;124:p1_right;135:p1_attack"
	echo "item_v_hx_k2 $S1 CC_FRAMES=140 CC_IN=$B;124-125:p1_right;135:p1_attack"
	echo "item_v_hx_j2 $S1 CC_FRAMES=140 CC_IN=$B;124-125:p1_right+p1_down;135:p1_attack"
	echo "item_v_hx_k2j1 $S1 CC_FRAMES=140 CC_IN=$B;124-125:p1_right;126:p1_right+p1_down;135:p1_attack"
	echo "item_v_hx_l1 $S1 CC_FRAMES=140 CC_IN=$B;124:p1_left;135:p1_attack"
	echo "item_v_hx_u1 $S1 CC_FRAMES=140 CC_IN=$B;124:p1_up;135:p1_attack"
	echo "item_v_hx_a1 $S1 CC_FRAMES=140 CC_IN=$B;124-124:p1_right;135:p1_attack"
	echo "item_v_hx_b1 $S1 CC_FRAMES=140 CC_IN=$B;124-124:p1_right+p1_down;135:p1_attack"
	echo "item_v_fass_tritt $S1 CC_FRAMES=140 CC_IN=2-67:p1_down;70:p1_jump;75:p1_attack"
	echo "item_v_mech $S1 CC_FRAMES=600 CC_LP=72:2:600 CC_IN=2-67:p1_down;70-85:p1_right"
	echo "item_v_mis_auf $S1 CC_FRAMES=300 CC_IN=2-60:p1_right;61-138:p1_down;141-141:p1_left;145:p1_attack;205:p1_attack"
	# Stage 1, Fass 43 (Raketenwerfer), Liegezeit, Rakete gegen Fass 44 (ab item_v_b1_f2880)
	echo "item_v_liegen item_v_b1_f2880 CC_FRAMES=1100 CC_IN=37-85:p1_left;86-148:p1_down;155:p1_attack"
	echo "item_v_fass_rakete item_v_b1_f2880 CC_FRAMES=380 CC_IN=37-74:p1_left;75-140:p1_down;142-142:p1_left;150:p1_attack;205-214:p1_left;220:p1_attack;235-274:p1_right;276-276:p1_left;285:p1_attack"
	# Stage 1, Bossarena: Inhalt der Geldkassetten (EINGRIFF CC_RANG nur in kiste_r*)
	echo "item_v_kiste_w2 item_v_b1_s1_cam02016 CC_FRAMES=150 CC_IN=2-150:p1_right"
	echo "item_v_kiste_w9 item_v_b1_s1_cam02016 CC_FRAMES=150 CC_IN=9-150:p1_right"
	echo "item_v_kiste_r7 item_v_b1_s1_cam02016 CC_FRAMES=60 CC_IN=2-60:p1_right CC_RANG=7"
	echo "item_v_kiste_r24 item_v_b1_s1_cam02016 CC_FRAMES=60 CC_IN=2-60:p1_right CC_RANG=24"
	# Aufnahmebereich Raketenwerfer (liegt bei dx -31, Blick links), natuerlich
	ML=item_v_mis_liegt
	for k in 3 4 5; do echo "item_v_mn_l$k $ML CC_FRAMES=40 CC_IN=2-$((1 + k)):p1_right;$((2 + k))-$((2 + k)):p1_left;30:p1_attack"; done
	echo "item_v_mn_l37 $ML CC_FRAMES=40 CC_IN=2-3:p1_right+p1_up;4-6:p1_right;7-7:p1_left;30:p1_attack"
	for k in 2 3 4; do echo "item_v_mn_r$k $ML CC_FRAMES=40 CC_IN=2-$((1 + k)):p1_left;$((2 + k))-$((2 + k)):p1_right;30:p1_attack"; done
	echo "item_v_mn_r27 $ML CC_FRAMES=40 CC_IN=2-3:p1_left+p1_up;4-5:p1_left;6-6:p1_right;30:p1_attack"
	for z in 11 12 13; do echo "item_v_mn_z$z $ML CC_FRAMES=40 CC_IN=2-$((1 + z)):p1_up;30:p1_attack"; done
	for k in 10 11 12 13; do echo "item_v_mn_g$k $ML CC_FRAMES=80 CC_IN=2-41:p1_left;42-$((41 + k)):p1_right;70:p1_attack"; done
	Bm="2-41:p1_left;43:p1_attack"
	for k in 1 2 3 4 5 6 7 8 9; do
		nm=h; [ "$k" -le 4 ] && nm=i
		echo "item_v_mn_$nm$k $ML CC_FRAMES=95 CC_IN=$Bm;55-$((54 + k)):p1_right;80:p1_attack"
	done
	for k in 1 2 3 4 5 8 9; do
		nm=h; [ "$k" -le 4 ] && nm=i
		echo "item_v_mn_$nm${k}d $ML CC_FRAMES=95 CC_IN=$Bm;55-$((54 + k)):p1_right;$((55 + k))-$((55 + k)):p1_right+p1_up;80:p1_attack"
	done
	echo "item_v_mn_v38 $ML CC_FRAMES=95 CC_IN=$Bm;55-55:p1_right+p1_up;80:p1_attack"
	for m in 1 2 3 4; do echo "item_v_mn_v$m $ML CC_FRAMES=95 CC_IN=$Bm;55-$((54 + m)):p1_left;$((55 + m))-$((55 + m)):p1_right;80:p1_attack"; done
	for k in 1 5 6 7 9 11 12 13 14; do echo "item_v_mn_b$k $ML CC_FRAMES=95 CC_IN=$Bm;55-$((54 + k)):p1_right;$((55 + k))-$((55 + k)):p1_left;80:p1_attack"; done
	echo "item_v_mn_b5d $ML CC_FRAMES=95 CC_IN=$Bm;55-59:p1_right;60-60:p1_right+p1_up;61-61:p1_left;80:p1_attack"
	echo "item_v_mn_b6d $ML CC_FRAMES=95 CC_IN=$Bm;55-60:p1_right;61-61:p1_right+p1_up;62-62:p1_left;80:p1_attack"
	# EINGRIFF: Raketenwerfer (Slot 50) fest relativ zur Figur, Brathaehnchen weg
	for dx in 10 18 19 20 25 28 30 -30 -36 -37; do echo "item_v_sw_${dx/-/m} $ML CC_FRAMES=30 CC_SETZE=50:$dx:-1:2:30,34:-200:0:2:30"; done
	echo "item_v_sprung $ML CC_FRAMES=80 CC_IN=3:p1_jump;12:p1_attack;60:p1_attack"
	echo "item_v_waffe_essen $ML CC_FRAMES=90 CC_LP=30 CC_IN=5:p1_attack;15-25:p1_up;26-60:p1_left;70:p1_attack"
	echo "item_v_huhn_links $ML CC_FRAMES=90 CC_LP=30 CC_IN=15-25:p1_up;26-51:p1_left;60:p1_attack"
	echo "item_v_huhn_links2 $ML CC_FRAMES=90 CC_LP=30 CC_IN=15-25:p1_up;26-60:p1_left;70:p1_attack"
	echo "item_v_scroll $ML CC_FRAMES=420 CC_IN=2-420:p1_right"
	# Raketenwerfer in der Hand, Stage 1 ohne Gegner
	echo "item_v_mis_l item_v_mis CC_FRAMES=200 CC_IN=20:p1_attack"
	echo "item_v_mis_r item_v_mis CC_FRAMES=330 CC_IN=10-10:p1_right;20:p1_attack;160:p1_attack;300:p1_attack"
	echo "item_v_mis_leer item_v_mis CC_FRAMES=200 CC_IN=10-10:p1_right;15:p1_attack;45:p1_attack;75:p1_attack;100:p1_attack;105:p1_attack"
	echo "item_v_waffe_sprung item_v_mis CC_FRAMES=80 CC_IN=5:p1_jump;15:p1_attack"
	# Raketenwerfer gegen WOOKY, Stage 6 (item_v_s6_mis_b); EINGRIFF: WOOKY Slot 15
	# mit 100 LP relativ zur Figur, die anderen Gegner 300 px links
	weg="12:-300:0:2:200,16:-310:0:2:200,17:-320:0:2:200"
	for dx in 55 59 60 61 70 80 85 90 93 95 96 97 98 100 163 191 192 200 211 212 213 214 215 218 220 222 225 230; do
		echo "item_v_mz_r$dx item_v_s6_mis_b CC_FRAMES=80 CC_IN=30:p1_attack;50:p1_attack CC_ELP=15:100 CC_SETZE=15:$dx:0:2:110,$weg"
	done
	for dz in 28 29 30 32 35 -20 -24 -26 -27 -28 -29; do
		echo "item_v_mz_z$dz item_v_s6_mis_b CC_FRAMES=80 CC_IN=30:p1_attack;50:p1_attack CC_ELP=15:100 CC_SETZE=15:163:$dz:2:110,$weg"
	done
	for dx in 60 95 96 97 150 200 220 234 235 236 237 239; do
		echo "item_v_mz_l$dx item_v_s6_mis_b CC_FRAMES=80 CC_IN=30:p1_attack;42-42:p1_left;50:p1_attack CC_ELP=15:100 CC_SETZE=15:-$dx:0:2:110,$weg"
	done
	echo "item_v_mz_multi item_v_s6_mis_b CC_FRAMES=80 CC_IN=30:p1_attack;50:p1_attack CC_ELP=15:100,16:100 CC_SETZE=15:130:0:2:110,16:180:5:2:110,12:-300:0:2:200,17:-320:0:2:200"
	echo "item_v_mz_multi3 item_v_s6_mis_b CC_FRAMES=80 CC_IN=30:p1_attack;50:p1_attack CC_ELP=15:100,16:100,17:100 CC_SETZE=15:110:0:2:110,16:163:-20:2:110,17:200:20:2:110,12:-300:0:2:200"
	# Laser, Stage 5 (item_v_s5_las); EINGRIFF: SASUKE Slot 17 (bzw. KOJIRO 18) LP 100, relativ gesetzt
	echo "item_v_las_leer item_v_s5_las CC_FRAMES=150 CC_IN=10:p1_attack;60:p1_attack CC_SETZE=17:-300:0:2:300"
	for dx in 130 160 191 220 250 280 300 330; do echo "item_v_lz_r$dx item_v_s5_las CC_FRAMES=50 CC_IN=10:p1_attack CC_ELP=17:100 CC_SETZE=17:$dx:0:2:50"; done
	for dz in 11 12 13 14 -11 -12 -13 -14; do echo "item_v_lz_z$dz item_v_s5_las CC_FRAMES=50 CC_IN=10:p1_attack CC_ELP=17:100 CC_SETZE=17:130:$dz:2:50"; done
	for dx in 340 355 362 370; do echo "item_v_lz_o$dx item_v_s5_las CC_FRAMES=45 CC_IN=10:p1_attack CC_ELP=17:100 CC_SETZE=17:$dx:0:2:45"; done
	echo "item_v_lz_zwei3 item_v_s5_las CC_FRAMES=75 CC_IN=42:p1_attack CC_ELP=17:100,18:100 CC_SETZE=17:120:5:41:80,18:220:-5:41:80"
	echo "item_v_lz_zwei4 item_v_s5_las CC_FRAMES=75 CC_IN=42:p1_attack CC_ELP=17:100,18:100 CC_SETZE=17:230:0:41:80,18:140:0:41:80"
	echo "item_v_lz_zwei5 item_v_s5_las CC_FRAMES=75 CC_IN=42:p1_attack CC_ELP=17:100,18:100 CC_SETZE=17:160:0:41:80,18:170:0:41:80"
	# Hammer, Stage 7 (item_v_s7_ham); EINGRIFF: MUSASHI Slot 12 (und 11) LP 100, relativ gesetzt
	echo "item_v_hz_leer item_v_s7_ham CC_FRAMES=80 CC_IN=10:p1_attack;45:p1_attack"
	for dx in 0 5 10 15 20 25 26 27 28 60 100 120 123 124 125 126 130 135 140 145 150 155 160; do
		echo "item_v_hz_r$dx item_v_s7_ham CC_FRAMES=45 CC_IN=10:p1_attack CC_ELP=12:100 CC_SETZE=12:$dx:0:8:45"
	done
	for dz in 11 12 13 14 -11 -12 -13 -14; do echo "item_v_hz_z$dz item_v_s7_ham CC_FRAMES=45 CC_IN=10:p1_attack CC_ELP=12:100 CC_SETZE=12:80:$dz:8:45"; done
	for dx in 0 5 10 15 20 24 25 26 27 28 100 140 141 142 143 144 146 147 148 149 150; do
		echo "item_v_hz_l$dx item_v_s7_ham CC_FRAMES=45 CC_IN=4-4:p1_left;10:p1_attack CC_ELP=12:100 CC_SETZE=12:-$dx:0:8:45"
	done
	echo "item_v_hz_zwei item_v_s7_ham CC_FRAMES=45 CC_IN=10:p1_attack CC_ELP=11:100,12:100 CC_SETZE=11:60:5:8:45,12:100:-5:8:45"
	# GUN, Stage 7 (item_v_s7_g); EINGRIFF: WOOKY Slot 18 LP 100, relativ gesetzt, DICKs beiseite
	echo "item_v_gun_leer item_v_s7_g CC_FRAMES=260 CC_IN=5:p1_attack;40:p1_attack;75:p1_attack;110:p1_attack;145:p1_attack CC_SETZE=11:-250:0:2:260,15:-260:0:2:260,18:-270:40:2:260"
	for dx in 40 60 100; do echo "item_v_gz_l$dx item_v_s7_g CC_FRAMES=50 CC_IN=5:p1_attack CC_ELP=18:100 CC_SETZE=18:-$dx:0:2:50,11:-250:40:2:50,15:-260:40:2:50"; done
	wg="11:-140:60:2:80,15:-145:-60:2:80"
	echo "item_v_gun_rleer item_v_s7_g CC_FRAMES=60 CC_IN=3-3:p1_right;8:p1_attack CC_SETZE=$wg,18:-150:70:2:80"
	for dx in 40 60 100 150; do echo "item_v_gz_r$dx item_v_s7_g CC_FRAMES=50 CC_IN=3-3:p1_right;8:p1_attack CC_ELP=18:100 CC_SETZE=18:$dx:0:2:50,$wg"; done
	wg2="11:-140:60:2:120,15:-145:-60:2:120,18:-150:70:2:120"
	echo "item_v_gun_x1541 item_v_s7_g CC_FRAMES=90 CC_IN=3-42:p1_left;44-44:p1_right;50:p1_attack CC_SETZE=$wg2"
	echo "item_v_gun_z1515 item_v_s7_g CC_FRAMES=90 CC_IN=3-32:p1_up;44-44:p1_right;50:p1_attack CC_SETZE=$wg2"
	echo "item_v_gun_x1680 item_v_s7_g CC_FRAMES=90 CC_IN=3-42:p1_right;50:p1_attack CC_SETZE=$wg2"
	echo "item_v_gun_x1500 item_v_s7_g CC_FRAMES=110 CC_IN=3-66:p1_left;68-68:p1_right;72:p1_attack CC_SETZE=11:-100:60:2:120,15:-105:-60:2:120,18:-110:70:2:120"
	echo "item_v_griff_gun item_v_s7_g CC_FRAMES=150 CC_IN=3-43:p1_up;44-110:p1_left;115:p1_attack;135:p1_attack"
	echo "item_v_griff_wurf item_v_s7_g CC_FRAMES=200 CC_IN=3-43:p1_up;44-110:p1_left;115:p1_left+p1_attack"
	# M-GUN, Stage 7 (item_v_s7_mg); EINGRIFF: EDDY Slot 17 LP 100, relativ gesetzt, andere beiseite
	wm="12:128:-70:2:80,15:111:70:2:80,19:127:75:2:80,18:-60:60:2:80"
	echo "item_v_mg_leer item_v_s7_mg CC_FRAMES=60 CC_IN=5:p1_attack CC_SETZE=$wm,17:140:-75:2:80"
	for dx in 90 130; do echo "item_v_mg_r$dx item_v_s7_mg CC_FRAMES=60 CC_IN=5:p1_attack CC_ELP=17:100 CC_SETZE=$wm,17:$dx:0:2:80"; done
	# Essen und SHURIKEN aus den Bot-Savestates; EINGRIFF CC_LP (ohne: volle LP)
	lpv() { [ "$1" = 72 ] || echo "CC_LP=$1"; }
	for lp in 50 72; do echo "item_v_e_s2_lp$lp item_v_s2_huhn CC_FRAMES=160 $(lpv $lp) CC_IN=85-111:p1_up;112-137:p1_left;145:p1_attack"; done
	for lp in 16 17 72; do echo "item_v_e_s6t_lp$lp item_v_s6_tendon CC_FRAMES=80 $(lpv $lp) CC_IN=30-49:p1_left;55:p1_attack"; done
	for lp in 31 33 72; do echo "item_v_e_s624_lp$lp item_v_s6_24 CC_FRAMES=110 $(lpv $lp) CC_IN=30-87:p1_left;89:p1_attack"; done
	for k in 4 6 8 9 10 12; do echo "item_v_e_s7c_r$k item_v_s7_cherry CC_FRAMES=40 CC_IN=2-$((1 + k)):p1_right;15:p1_attack"; done
	for k in 7 8 9; do echo "item_v_e_s7c_r${k}d item_v_s7_cherry CC_FRAMES=40 CC_IN=2-$((1 + k)):p1_right;$((2 + k))-$((2 + k)):p1_right+p1_up;15:p1_attack"; done
	for lp in 55 57; do echo "item_v_e_s7c_lp$lp item_v_s7_cherry CC_FRAMES=40 CC_LP=$lp CC_IN=2-11:p1_right;15:p1_attack"; done
	for lp in 30 72; do echo "item_v_e_s8c_lp$lp item_v_s8_cherry CC_FRAMES=40 $(lpv $lp) CC_IN=2-16:p1_down;17-20:p1_right;25:p1_attack"; done
	for lp in 59 61 72; do echo "item_v_e_s82a_lp$lp item_v_s8_2a CC_FRAMES=20 $(lpv $lp) CC_IN=3:p1_attack"; done
	for lp in 40 72; do echo "item_v_e_s3s_lp$lp item_v_s3_shuriken CC_FRAMES=40 $(lpv $lp) CC_IN=25:p1_attack"; done
	# Punkte der Schlagkette gegen EDDY (Savestate anlauf_c, ohne Eingriff)
	echo "item_v_kette anlauf_c CC_FRAMES=120 CC_IN=40:p1_attack;56:p1_attack;73:p1_attack;91:p1_attack"
} | laeufe_v

# --- V3: Erklaerungslaeufe mit item_frei.lua und Savestates des Messagenten ----
python3 - <<'PY' | laeufe
rel, f = [], 70
for v in range(-48, 49):
    rel.append(f"{f}-{f+1}:44:{v}:0")
    f += 2
for o in (53, 58):
    rel.append(f"70-{f+2}:{o}:300:0")
print(f"item_v_m5_nah_mxr item_bot1_s1_cam02048 CC_FRAMES={f+2} CC_POKES=2-{f+2}:s19+e=2700:2 CC_REL={';'.join(rel)} CC_IN=1-1:up")
PY
{
	for x in 60 100; do echo "item_v_m5_mis_x$x item_missile CC_FRAMES=60 CC_POKES=2-60:$D;2-2:s16+40=100:2 CC_REL=2-60:16:$x:0;2-60:17:-300:0 CC_IN=3-4:attack"; done
	for x in 20 26 27 124 125 130 140 145; do echo "item_v_m5_ham_x$x item_hammer CC_FRAMES=45 CC_POKES=2-45:$D;2-2:s16+40=100:2 CC_REL=2-45:16:$x:0;2-45:17:-300:0 CC_IN=3-4:attack"; done
	echo "item_v_m5_las_zwei item_laser CC_FRAMES=45 CC_POKES=2-45:$D;2-2:s16+40=100:2;2-2:s17+40=100:2 CC_REL=2-45:16:100:0;2-45:17:200:4 CC_IN=3-4:attack"
	echo "item_v_m5_las_zwei2 item_laser CC_FRAMES=45 CC_POKES=2-45:$D;2-2:s16+40=100:2;2-2:s17+40=100:2 CC_REL=2-45:16:220:-3;2-45:17:120:0 CC_IN=3-4:attack"
	echo "item_v_m5_griff item_hammer CC_FRAMES=60 CC_POKES=2-60:$D;2-2:s16+40=100:2 CC_REL=2-6:16:30:0;2-60:17:-300:40 CC_IN=3-8:right;20-21:attack"
	echo "item_v_m5_griff_max item_hammer CC_FRAMES=40 CC_POKES=2-40:$D;2-2:s16+40=100:2;2-2:s16+9a=100:2;2-2:s16+42=100:2 CC_REL=2-6:16:30:0;2-40:17:-300:40 CC_IN=3-8:right;20-21:attack"
} | laeufe

# --- V4: Auswertung nach logs/item_v.csv -------------------------------------
# pv MUSTER: Laufnamen (Praefixe) der Abzuege logs/raw/MUSTER_ram.bin
pv() { ls $R/$1_ram.bin 2>/dev/null | sed 's/_ram.bin$//'; }
{
	echo "# Gegenpruefung Gegenstaende und Waffen (Praefix item_v). Erzeugt von scripts/belege_item.sh (Teil V),"
	echo "# Auswertung scripts/messen_item_v.py. Frames = lokale Frames des Runners (Druck P = Taste in P gedrueckt)."
	echo "# dx = x(Objekt) - x(Figur), dz = Tiefe(Objekt) - Tiefe(Figur); bei Treffern Position am Ende des Trefferframes."
	echo "# EINGRIFFE: Bot (item_v_b*): LP der Figur aufgefuellt, Gegner-LP nach 600 Frames Stillstand auf 1."
	echo "# CC_LP: LP der Figur gesetzt (item_v_huhn_lp*, item_v_e_*_lp* ausser lp72, item_v_waffe_essen, item_v_huhn_links*, item_v_mech)."
	echo "# CC_ELP/CC_SETZE: Ziel-LP 100 (mit Max-LP) und Position relativ zur Figur (item_v_mz_*, item_v_lz_*, item_v_hz_*, item_v_gz_*,"
	echo "# item_v_mg_*), andere Gegner beiseite; item_v_sw_*: Gegenstand relativ gesetzt; item_v_kiste_r*: Rang gehalten."
	echo "# item_v_m5_*: Erklaerungslaeufe mit scenarios/item_frei.lua und Savestates des Messagenten (dessen Eingriffe)."
	echo "## katalog (Bot)"
	$MV katalog $R/item_v_b[1-9]_bot.csv
	echo "## botpunkte (Stage 1 alle, Stage 2-9 ab 50 Punkten)"
	$MV botpunkte $R/item_v_b1_bot.csv
	$MV botpunkte $R/item_v_b[2-9]_bot.csv | awk -F, 'NR > 1 && $6 >= 50'
	echo "## aufnahme"
	$MV aufnahme $(pv "item_v_*" | grep -v _m5_)
	echo "## behaelter"
	$MV behaelter $R/item_v_fass44 $R/item_v_fass43 $R/item_v_fass_tritt $R/item_v_fass_rakete $R/item_v_mech $R/item_v_liegen
	echo "## liegen (Liegezeit, Scrollen, verlorene und getauschte Waffen, Geldkassetten)"
	$MV liegen $R/item_v_liegen $R/item_v_scroll $R/item_v_mis_auf $R/item_v_s7h_auf $R/item_v_s7mg_auf $R/item_v_mis_leer $(pv "item_v_kiste_*")
	echo "## schuss (Waffeneinsatz ohne bzw. mit Ziel)"
	$MV schuss $R/item_v_mis_l $R/item_v_mis_r $R/item_v_mis_leer $R/item_v_las_leer $R/item_v_hz_leer $R/item_v_gun_leer \
		$R/item_v_gun_rleer $R/item_v_gun_x1541 $R/item_v_gun_x1680 $R/item_v_gun_z1515 $R/item_v_gun_x1500 \
		$R/item_v_mg_leer $R/item_v_mg_r90 $R/item_v_mg_r130 $R/item_v_mz_multi $R/item_v_mz_multi3 $(pv "item_v_lz_zwei[345]") \
		$R/item_v_hz_zwei $R/item_v_waffe_sprung
	echo "## ziel Raketenwerfer gegen WOOKY (Slot 15)"
	$MV ziel $(pv "item_v_mz_*") --slots 15 --probe 28
	echo "## ziel Laser gegen SASUKE/KOJIRO (Slot 17, 18)"
	$MV ziel $(pv "item_v_lz_*") --slots 17,18 --probe 11
	echo "## ziel Hammer gegen MUSASHI (Slot 11, 12)"
	$MV ziel $(pv "item_v_hz_*") --slots 11,12 --probe 13
	echo "## ziel GUN gegen WOOKY (Slot 18), M-GUN gegen EDDY (Slot 17)"
	$MV ziel $(pv "item_v_gz_*") --slots 18 --probe 10
	$MV ziel $(pv "item_v_mg_r*") --slots 17 --probe 10
	echo "## ziel Erklaerungslaeufe (Savestates des Messagenten, WOOKY Slot 16/17)"
	$MV ziel $(pv "item_v_m5_mis_*") $(pv "item_v_m5_ham_*") --slots 16 --probe 13
	$MV ziel $(pv "item_v_m5_las_*") --slots 16,17 --probe 13
	echo "## griff (Angriff und Wurf im Griff mit Waffe)"
	$MV griff $R/item_v_griff_gun $R/item_v_griff_wurf $R/item_v_gz_r40 $R/item_v_m5_griff $R/item_v_m5_griff_max
	echo "## punkte (Schlagkette, Raketen gegen zwei Gegner)"
	$MV punkte $R/item_v_kette $R/item_v_mz_multi $R/item_v_mz_multi3
	echo "## Erklaerung Aufnahmebereich +18: Sweep des Messagenten, Frames 200-206 (Figur wird in 204 umgeworfen)"
	$MV zeit $R/item_v_m5_nah_mxr --slots 44 --frames 200:206
} > $outv
wc -l $outv

# === W: Dritte Messung (Praefix item_d) ======================================
# Zeilen, in denen die Gegenpruefung (V) abweicht, mit einer dritten Variante:
# andere Reihenfolge, andere Startframes, anderer Gegner-Slot, andere Position
# der Figur. EINGRIFFE wie in C (DOLG fern, Gegner relativ gesetzt mit LP,
# Vorframe-LP und Max-LP 100, Gegenstand relativ verschoben, LP der Figur).
{
	# Nr. 17 Aufnahmebereich: Sweep rueckwaerts (+48 -> -48) ab Frame 40,
	# beide WOOKY 300 px weg (im Sweep von C wurde die Figur in 204 umgeworfen)
	python3 - <<'PY'
def sweep(name, slot, others, facing, t=40):
    rel, f = [], t
    for v in range(48, -49, -1):
        rel.append(f"{f}-{f+1}:{slot}:{v}:0")
        f += 2
    for o in others:
        rel.append(f"{t}-{f+2}:{o}:300:{40 if o == 44 else 0}")
    rel.append(f"2-{f+2}:16:-300:0;2-{f+2}:17:-300:40")
    print(f"{name} item_bot1_s1_cam02048 CC_FRAMES={f+2} CC_POKES=2-{f+2}:s19+e=2700:2 CC_REL={';'.join(rel)} CC_IN=30-30:{'left' if facing == 'l' else 'right'}")
for kind, slot, others in (("h", 58, (44, 53)), ("m", 44, (53, 58)), ("l", 53, (44, 58))):
    for fa in ("r", "l"):
        sweep(f"item_d_nah_{kind}{fa}", slot, others, fa)
PY
	# natuerlich: Laser von links anlaufen (Tiefe 208, Blick rechts)
	echo "item_d_nah_lnat $A CC_FRAMES=150 CC_POKES=2-150:$D CC_REL=2-150:16:-300:0;2-150:17:-300:40 CC_IN=2-50:up;70-140:right"
	# Nr. 7 Rakete frei fliegend: Figur 60 Frames nach links, Blick rechts, Druck 68;
	# WOOKY Slot 17 ab Frame 63 gesetzt (er laeuft noch 3 px, gemessener dx = Wert - 3)
	echo "item_d_misfrei item_missile CC_FRAMES=110 CC_POKES=2-110:$D CC_REL=2-110:16:-300:40;2-110:17:-300:0 CC_IN=2-61:left;63-63:right;68-69:attack"
	W17="2-2:s17+40=100:2;2-2:s17+42=100:2;2-2:s17+9a=100:2"
	for x in 98 99 100 103 200 230 250 290; do
		echo "item_d_mis_x$x item_missile CC_FRAMES=110 CC_POKES=2-110:$D;$W17 CC_REL=2-62:17:300:0;63-110:17:$x:0;2-110:16:-300:40 CC_IN=2-61:left;63-63:right;68-69:attack"
	done
	# Nr. 9 Hammer gegen WOOKY Slot 17: Figur erst 10 Frames runter, Gegner ab 18 gesetzt, Druck 19
	for x in 25 26 27 124 125; do
		echo "item_d_ham_x$x item_hammer CC_FRAMES=60 CC_POKES=2-60:$D;$W17 CC_REL=2-17:17:300:0;18-60:17:$x:0;2-60:16:-300:40 CC_IN=2-11:down;19-20:attack"
	done
	for x in -25 -26 -147 -148; do
		echo "item_d_ham_x$x item_hammer CC_FRAMES=60 CC_POKES=2-60:$D;$W17 CC_REL=2-17:17:300:0;18-60:17:$x:0;2-60:16:-300:40 CC_IN=2-11:down;12-12:left;19-20:attack"
	done
	# Nr. 8 Laser: Trefferframe (Figur links, Blick rechts, Slot 17) und zwei Gegner
	for x in 155 186 215 245 275; do
		echo "item_d_las_x$x item_laser CC_FRAMES=110 CC_POKES=2-110:$D;$W17 CC_REL=2-62:17:-300:0;63-110:17:$x:0;2-110:16:-300:40;2-110:44:300:0;2-110:58:300:0 CC_IN=2-61:left;63-63:right;68-69:attack"
	done
	echo "item_d_las_zwei_tot item_laser CC_FRAMES=60 CC_POKES=2-60:$D;2-2:s16+40=4:2;2-2:s16+42=4:2;$W17 CC_REL=2-60:16:90:0;2-60:17:170:0 CC_IN=10-11:attack"
	echo "item_d_las_zwei_lebt item_laser CC_FRAMES=60 CC_POKES=2-60:$D;2-2:s16+40=100:2;2-2:s16+42=100:2;2-2:s16+9a=100:2;$W17 CC_REL=2-60:16:120:0;2-60:17:220:0 CC_IN=10-11:attack"
	# Nr. 31/32 Griff mit Hammer ohne Eingriff am Gegner: Figur laeuft in den WOOKY
	echo "item_d_griffknie item_hammer CC_FRAMES=130 CC_POKES=2-130:$D CC_IN=2-25:down;26-82:left;88-89:attack;110-111:attack"
	echo "item_d_griffwurf item_hammer CC_FRAMES=150 CC_POKES=2-150:$D CC_IN=2-25:down;26-82:left;88-89:attack|left"
	# Nr. 35/36 Abschuesse in Kettenstufe k: Ziel 40 px vor die Figur, LP so gesetzt,
	# dass Stufe k toetet (2, 6, 11, 21); Druecke im Kettenrhythmus
	python3 - <<'PY'
LP = {1: 2, 2: 6, 3: 11, 4: 21}
def kill(name, state, slot, k, t0, extra=""):
    p = [t0 + 2, t0 + 18, t0 + 35, t0 + 53][:k]
    end = p[-1] + 30
    pokes = (extra.replace("END", str(end)) + ";" if extra else "") + \
        f"{t0}-{t0+2}:s{slot}+40={LP[k]}:2;{t0}-{t0+2}:s{slot}+42={LP[k]}:2"
    rel = f"{t0}-{t0}:{slot}:300:0;{t0+1}-{end}:{slot}:40:0"
    inp = f"{t0}-{t0}:right;" + ";".join(f"{q}-{q+1}:attack" for q in p)
    print(f"{name} {state} CC_FRAMES={end} CC_POKES={pokes} CC_REL={rel} CC_IN={inp}")
for k in (1, 2, 3, 4):
    kill(f"item_d_kill_skip{k}", "item_bot1_s1_cam00768", 18, k, 2)
    kill(f"item_d_kill_mardia{k}", "item_s3_mardia", 14, k, 150, "2-END:p+40=72:2")
for k in (1, 2):
    kill(f"item_d_kill_dolg{k}", "item_bot1_s1_cam02048", 19, k, 70, "2-END:p+40=72:2;2-END:s16+e=1900:2;2-END:s17+e=1900:2")
PY
	# Nr. 42 M-GUN gegen SASUKE (Slot 15) bzw. Typ 0x6C660 (Slot 17), LP 100
	for k in 15:sasuke 17:z; do
		n=${k%%:*}; nm=${k##*:}; o=""
		for s in 13 14 15 17; do [ $s = $n ] || o="$o;2-260:$s:-300:0"; done
		echo "item_d_mgun_$nm item_s7_04 CC_FRAMES=260 CC_POKES=2-2:p+40=40:2;2-260:p+40=72:2;2-2:s$n+40=100:2;2-2:s$n+42=100:2;2-2:s$n+9a=100:2 CC_ZU=2-30:58 CC_REL=2-129:$n:300:0;130-260:$n:110:0$o CC_IN=5-6:attack;12-13:attack;20-21:attack;28-29:attack;60-61:attack;100-101:attack;125-125:right;140-141:attack"
	done
} | laeufe
{
	echo "## dritte Messung (Praefix item_d, Teil W): nahsweep und natuerlicher Anlauf"
	$M nahsweep $R/item_d_nah_[hml][rl]_ram.hdr
	$M nah $R/item_d_nah_lnat
	echo "## dritte Messung: reichweite (Rakete frei fliegend, Hammer, Laser)"
	$M reichweite $R/item_d_mis_* $R/item_d_ham_* $R/item_d_las_* | awk -F, 'NR == 1 || $4 == 17 || $1 ~ /zwei/'
	echo "## dritte Messung: waffe (freier Raketenflug, Laser gegen zwei Gegner, M-GUN)"
	$M waffe $R/item_d_misfrei $R/item_d_las_zwei_tot $R/item_d_las_zwei_lebt $R/item_d_mgun_sasuke $R/item_d_mgun_z
	echo "## dritte Messung: griff mit Hammer"
	$M griff $R/item_d_griffknie $R/item_d_griffwurf
	echo "## dritte Messung: punkte (Abschuesse je Kettenstufe, M-GUN, Griff)"
	$M punkte $R/item_d_kill_* $R/item_d_mgun_* $R/item_d_griffknie $R/item_d_griffwurf
} >> $out

rm -f logs/raw/item_*_ram.bin logs/raw/item_*_ram.hdr logs/raw/item_*_inputs.csv logs/raw/item_*_watch.csv \
	logs/raw/item_*_fields.txt logs/raw/item_*_bot.csv logs/raw/item_*_events.txt logs/raw/snap/item_*
wc -l $out
