#!/usr/bin/env bash
# Fernangriffe der Gegner in Stage 1 (Praefix fern): Pistole und Raketenwerfer
# des DICK, Messerwurf und Messerhagel (Stichserie) des SKIP. Alle MAME-Laeufe
# von vorn mit scenarios/fern_frei.lua, Auswertung mit messen_fern.py nach
# logs/fern.csv, danach werden die eigenen Rohdaten geloescht (logs/raw/fern_*
# ausser fern_v_*, dem Praefix der Gegenpruefung). Die Savestates fern_* bleiben
# in logs/raw/sta/captcomm (fern_v_* werden nicht angefasst).
#
# Voraussetzung: Savestates p0_s1_s1_cam00768 und p0_s1_s1_cam02048 aus dem
# Bot-Lauf der Phase 0 (EINGRIFF dort: LP der Figur aufgefuellt, bei Stillstand
# LP der Gegner auf 1) und greichweite_dick (belege_greichweite.sh bzw.
# scenarios/greichweite_bot.lua; fehlt er, entfaellt nur der Lauf fern_a_gd).
# Dauer: etwa 12 bis 15 Minuten (FERN_PARALLEL Laeufe gleichzeitig, Standard 3),
# waehrend des Laufs bis etwa 2,5 GB in logs/raw.
#
# EINGRIFFE (in jedem Lauf genannt, Abkuerzungen siehe unten):
#   LP    CC_LP=1: LP der Figur vor jedem Frame auf 72 (alle Laeufe)
#   RANG  CC_RANG: Rang FFF82A festgehalten (9 oder 20, Teil D 7..24)
#   DOLG  Boss DOLG (Slot 19) vor jedem Frame auf x 2900, also rechts ausserhalb
#         des Bildes und deaktiviert (alle DICK-Laeufe ausser fern_a_k*, fern_a_gd)
#   ENTF  WOOKY und EDDY (Typ 0x5A97E, 0x60CA0) in der Bossarena ab Frame 4
#         entfernt (S+4 = 0, ohne Tod). Folge: Der Pistolen-DICK (Slot 18)
#         erscheint in Frame 11 (bei Rang 7-15 und 20-24, nicht bei 16-19)
#   LP27  LP des DOLG in Frame 100-101 auf 27: loest die letzte Welle aus
#         (2 EDDY, sofort entfernt, und der DICK mit Raketenwerfer, Slot 13;
#         bei Rang 20 ein zweiter in Slot 10 40 Frames spaeter)
#   PISTWEG  Pistolen-DICK samt Waffe (Slot 18 und 58) in Frame 12 entfernt
#   FEST  Figur auf feste Welt-x bzw. Tiefe gesetzt (CC_FEST)
#   GESCH Figur bzw. ein anderes Objekt ab dem Erscheinen eines Geschosses
#         relativ zu diesem gesetzt (CC_GESCH, CC_GESCH_GEGNER; Teil B, C)
#   TOET  Gegner-LP auf 1 und Figur neben ihn gesetzt, dann ein Schlag (Teil E,
#         fern_a_k*: Arena-WOOKY)
#
# Teile:
#  0  Savestates fuer die Proben (fern_sw9, fern_sw20, fern_sg9, fern_pw9,
#     fern_pw20, fern_rw9, fern_rw20, fern_pz9), siehe Kopf von fern_frei.lua
#  A  natuerliche Laeufe (Figur passiv, 6000 bzw. 4000 Frames)
#  B  Trefferflaeche der Geschosse (GESCH): x, Tiefe, Hoehe, aktive Frames
#  C  Abwehr: Schlag, Sprung, Gegner und zerbrechliche Objekte auf der Bahn
#  D  Schaden je Rang (7..24)
#  E  Waffe des DICK beim Tod (TOET)
#  F  Erscheinen des Pistolen-DICK je Rang (ENTF bzw. TOET der Arena-WOOKY)
#  T  Dritte Messung (Block am Ende nach dem Block V7, Praefix fern_t, haengt Abschnitte
#     "## T ..." an logs/fern.csv an; mit FERN_NUR_V=1 ausgelassen)
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/fern_frei.lua
out=logs/fern.csv
par=${FERN_PARALLEL:-3}
M="python3 scripts/messen_fern.py"
tmp=logs/raw/fern_auswertung
S768=p0_s1_s1_cam00768
A2048=p0_s1_s1_cam02048
DOLG="s19+0E=2900:2"
WE="5a97e,60ca0"
LP27="100-101:s19+40=27:2;100-101:s19+42=27:2"

aufraeumen() {
	find logs/raw -maxdepth 1 -name 'fern_*' ! -name 'fern_v_*' -exec rm -rf {} +
}
# Zeilen "name savestate VAR=wert ..." parallel mit fern_frei.lua ausfuehren
laeufe() {
	xargs -P "$par" -L 1 bash -c 'nm=$0; st=$1; shift; env "$@" CC_NAME=$nm scripts/run.sh '"$sc"' $st >/dev/null 2>&1 || echo "Fehler: $nm" >&2'
}

# FERN_NUR_V=1: nur den Block der Gegenpruefung V7 (fern_v) am Ende ausfuehren
if [ "${FERN_NUR_V:-0}" != "1" ]; then
for st in $S768 $A2048; do
	[ -f logs/raw/sta/captcomm/$st.sta ] || { echo "Savestate $st fehlt (Phase 0)" >&2; exit 1; }
done
aufraeumen
find logs/raw/sta/captcomm -maxdepth 1 -name 'fern_*.sta' ! -name 'fern_v_*' -delete
mkdir -p $tmp

# --- 0: Savestates ---------------------------------------------------------
# kalibriert 2026-10-02 (Frames relativ zum jeweiligen Savestate):
#  fern_sw9   SKIP wirft in A 36, Messer G 44 (x 961, fliegt -x), Figur x 900 (FEST bis zum Speichern)
#  fern_sw20  SKIP wirft in A 46, Messer G 54
#  fern_sg9   Gruppe (2 WOOKY, 2 EDDY, SKIP), Messer G 45 (x 1235, -x)
#  fern_pw9   Pistolen-DICK Slot 18, Salve ab A 14, Kugeln G 20, 37, 54, 71 (+x)
#  fern_pw20  Salve ab A 22, Kugeln G 28, 45, 62, 79 (+x)
#  fern_rw9   Raketen-DICK Slot 13, Rakete G 19 (+x), landet G+21
#  fern_rw20  Raketen-DICK Slot 10 (zweiter in Slot 13), Rakete G 17 (+x)
#  fern_pz9   Pistolen-DICK 18 und Raketen-DICK 13, Kugeln G 30, 47, 64, 81
laeufe <<EOF
fern_0_sw9 $S768 CC_FRAMES=2080 CC_DUMP=0 CC_LP=1 CC_RANG=9 CC_FEST=2-2080:900:_ CC_SAVE=2080:fern_sw9
fern_0_sw20 $S768 CC_FRAMES=1100 CC_DUMP=0 CC_LP=1 CC_RANG=20 CC_FEST=2-1100:900:_ CC_SAVE=1100:fern_sw20
fern_0_sg9 $S768 CC_FRAMES=1420 CC_DUMP=0 CC_LP=1 CC_RANG=9 CC_IN=2-40:right CC_SAVE=1420:fern_sg9
fern_0_pw9 $A2048 CC_FRAMES=3780 CC_DUMP=0 CC_LP=1 CC_RANG=9 CC_ENTF=4-3780:$WE CC_POKES=2-3780:$DOLG CC_SAVE=3780:fern_pw9
fern_0_pw20 $A2048 CC_FRAMES=200 CC_DUMP=0 CC_LP=1 CC_RANG=20 CC_ENTF=4-200:$WE CC_POKES=2-200:$DOLG CC_SAVE=200:fern_pw20
fern_0_rw9 $A2048 CC_FRAMES=460 CC_DUMP=0 CC_LP=1 CC_RANG=9 CC_ENTF=4-460:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-460:$DOLG;$LP27 CC_SAVE=460:fern_rw9
fern_0_rw20 $A2048 CC_FRAMES=380 CC_DUMP=0 CC_LP=1 CC_RANG=20 CC_ENTF=4-380:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-380:$DOLG;$LP27 CC_SAVE=380:fern_rw20
fern_0_pz9 $A2048 CC_FRAMES=520 CC_DUMP=0 CC_LP=1 CC_RANG=9 CC_ENTF=4-520:$WE CC_POKES=2-520:$DOLG;$LP27 CC_SAVE=520:fern_pz9
EOF
for s in sw9 sw20 sg9 pw9 pw20 rw9 rw20 pz9; do
	[ -f logs/raw/sta/captcomm/fern_$s.sta ] || { echo "Savestate fern_$s fehlt" >&2; exit 1; }
done

# Eingriffe, die in den Laeufen ab den DICK-Savestates weiterlaufen
P9="CC_LP=1 CC_RANG=9 CC_ENTF=1-2000:$WE CC_POKES=1-2000:$DOLG"
P20="CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE CC_POKES=1-2000:$DOLG"

# --- A: natuerliche Laeufe -------------------------------------------------
tiefe=""; f=200; i=0
while [ $f -lt 5900 ]; do
	case $((i % 4)) in 0|3) k=up ;; *) k=down ;; esac
	tiefe="$tiefe$f-$((f + 19)):$k;"; f=$((f + 200)); i=$((i + 1))
done
gehen=""; f=300; i=0
while [ $f -lt 5900 ]; do
	case $((i % 2)) in 0) k=left ;; *) k=right ;; esac
	gehen="$gehen$f-$((f + 39)):$k;"; f=$((f + 150)); i=$((i + 1))
done
# Arena-WOOKY (Slot 16, 17) mit zwei Schlaegen besiegt (TOET: LP 1, vor die Figur gesetzt)
KILLW="CC_POKES=40-52:s16+40=1:2;40-52:s16+42=1:2;80-92:s17+40=1:2;80-92:s17+42=1:2 CC_REL=40-52:16:30:0;80-92:17:30:0 CC_IN=55-55:attack;65-65:attack;95-95:attack;105-105:attack"
laeufe <<EOF
fern_a_s9 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=9
fern_a_s20 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=20
fern_a_snat $S768 CC_FRAMES=6000 CC_LP=1
fern_a_sf9 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_FEST=2-6000:900:_
fern_a_sf20 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=20 CC_FEST=2-6000:900:_
fern_a_sg9 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_IN=2-40:right
fern_a_st9 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_IN=${tiefe%;}
fern_a_p9 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG
fern_a_p20 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=20 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG
fern_a_pf9 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG CC_FEST=2-6000:2248:156
fern_a_pg9 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG CC_IN=${gehen%;}
fern_a_r9 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP27
fern_a_r20 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=20 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP27
fern_a_rf20 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=20 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP27 CC_FEST=2-6000:2248:156
fern_a_z9 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=9 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG;$LP27
fern_a_z20 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=20 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG;$LP27
fern_a_k9 $A2048 CC_FRAMES=4000 CC_LP=1 CC_RANG=9 $KILLW
fern_a_k20 $A2048 CC_FRAMES=4000 CC_LP=1 CC_RANG=20 $KILLW
EOF
if [ -f logs/raw/sta/captcomm/greichweite_dick.sta ]; then
	echo "fern_a_gd greichweite_dick CC_FRAMES=4000 CC_LP=1" | laeufe
fi

# --- B: Trefferflaeche (GESCH) ---------------------------------------------
# Messer (fern_sw9, G 44, fliegt -x mit 4 px/Frame): Figur ab G+1 bei x = Messer + D.
# blick r: Figur schaut zum SKIP (natuerlich), blick l: in Frame 30 links gedrueckt.
{
	for D in $(seq -42 1 28); do
		echo "fern_b_mx_r$D fern_sw9 CC_FRAMES=110 CC_LP=1 CC_RANG=9 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:60:$D:0"
		echo "fern_b_mx_l$D fern_sw9 CC_FRAMES=110 CC_LP=1 CC_RANG=9 CC_IN=30-30:left CC_GESCH_SLOT=18 CC_GESCH=85b42:1:60:$D:0"
	done
	for D in $(seq -42 2 28); do
		echo "fern_b_mx20_r$D fern_sw20 CC_FRAMES=120 CC_LP=1 CC_RANG=20 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:60:$D:0"
	done
	for Z in $(seq -16 1 16); do
		echo "fern_b_mz_$Z fern_sw9 CC_FRAMES=110 CC_LP=1 CC_RANG=9 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:60:-4:$Z"
	done
	for Z in -14 -13 -12 -11 11 12 13 14; do
		echo "fern_b_mz20_$Z fern_sw20 CC_FRAMES=120 CC_LP=1 CC_RANG=20 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:60:-4:$Z"
	done
	# Hoehe: nur in G+1 gesetzt (danach faellt die Figur)
	for H in $(seq 48 1 68) 72 80 100; do
		echo "fern_b_mh_$H fern_sw9 CC_FRAMES=110 CC_LP=1 CC_RANG=9 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:1:-4:0:$H"
	done
	# Kugel (fern_pw20, G 28, fliegt +x mit 8 px/Frame). blick r: Figur schaut vom DICK weg
	# (natuerlich), blick l: in Frame 10 links gedrueckt (schaut zum DICK)
	for D in $(seq -24 1 26); do
		echo "fern_b_kx_r$D fern_pw20 CC_FRAMES=120 $P20 CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:$D:0"
	done
	for D in $(seq -16 1 36); do
		echo "fern_b_kx_l$D fern_pw20 CC_FRAMES=120 $P20 CC_IN=10-10:left CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:$D:0"
	done
	for D in $(seq -24 2 26); do
		echo "fern_b_kx9_r$D fern_pw9 CC_FRAMES=120 $P9 CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:$D:0"
	done
	# zweite Kugel der Salve (umwerfend): Figur bis G2 = 45 in Tiefe 210 (ausser Reichweite der ersten)
	for D in -21 -20 -19 -18 0 4 8 15 16 17 18; do
		echo "fern_b_kux_r$D fern_pw20 CC_FRAMES=130 $P20 CC_FEST=1-45:_:210 CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:$D:0:_:2"
	done
	for Z in $(seq -16 1 16); do
		echo "fern_b_kz_$Z fern_pw20 CC_FRAMES=120 $P20 CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:4:$Z"
	done
	for H in $(seq 48 1 72) 80 100; do
		echo "fern_b_kh_$H fern_pw20 CC_FRAMES=120 $P20 CC_GESCH_SLOT=18 CC_GESCH=86022:1:1:4:0:$H"
	done
	# Gegenlaeufe mit dem anderen Savestate (anderer Rang, andere Lage)
	for D in $(seq -42 2 28); do
		echo "fern_b_mx20_l$D fern_sw20 CC_FRAMES=120 CC_LP=1 CC_RANG=20 CC_IN=40-40:left CC_GESCH_SLOT=18 CC_GESCH=85b42:1:60:$D:0"
	done
	for D in $(seq -16 2 36); do
		echo "fern_b_kx9_l$D fern_pw9 CC_FRAMES=120 $P9 CC_IN=5-5:left CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:$D:0"
	done
	for Z in -14 -13 -12 -11 11 12 13 14; do
		echo "fern_b_kz9_$Z fern_pw9 CC_FRAMES=120 $P9 CC_GESCH_SLOT=18 CC_GESCH=86022:1:40:4:$Z"
		echo "fern_b_rz9_$Z fern_rw9 CC_FRAMES=160 $P9 CC_FEST=20-39:2420:_ CC_GESCH_SLOT=13 CC_GESCH=86022:21:80:0:$Z"
	done
	for H in 57 58 59 60 61 62; do
		echo "fern_b_mh20_$H fern_sw20 CC_FRAMES=120 CC_LP=1 CC_RANG=20 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:1:-4:0:$H"
		echo "fern_b_kh9_$H fern_pw9 CC_FRAMES=120 $P9 CC_GESCH_SLOT=18 CC_GESCH=86022:1:1:4:0:$H"
	done
	for H in 23 24 25 26 27 28 29; do
		echo "fern_b_rh9_$H fern_rw9 CC_FRAMES=160 $P9 CC_FEST=20-39:2420:_ CC_GESCH_SLOT=13 CC_GESCH=86022:21:21:0:0:$H"
	done
	for k in 20 21 29 30; do
		echo "fern_b_ra9_$k fern_rw9 CC_FRAMES=160 $P9 CC_FEST=20-$((18 + k)):2420:_ CC_GESCH_SLOT=13 CC_GESCH=86022:$k:80:0:0"
	done
	# Rakete (fern_rw20, G 17, Slot-10-DICK, +x, landet G+21 = 38): Figur in G+1..G+20 auf x 2420
	# (ausser Reichweite), ab G+21 relativ zur Explosion
	for D in $(seq -120 10 120) $(seq -64 1 -46) $(seq 36 1 54); do
		echo "fern_b_rx_$D fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-37:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:80:$D:0"
	done
	for D in $(seq -60 10 50) -58 -56 -54 -52 42 44 46 48; do
		echo "fern_b_rx9_$D fern_rw9 CC_FRAMES=160 $P9 CC_FEST=20-39:2420:_ CC_GESCH_SLOT=13 CC_GESCH=86022:21:80:$D:0"
	done
	for Z in $(seq -40 4 40) -15 -14 -13 -11 -9 9 11 13 14 15; do
		echo "fern_b_rz_$Z fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-37:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:80:0:$Z"
	done
	for H in 0 10 $(seq 20 1 34) 36 40 50 60 80 100 120; do
		echo "fern_b_rh_$H fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-37:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:21:0:0:$H"
	done
	# aktive Frames der Explosion: Figur erst ab G+k in die Explosion
	for k in $(seq 19 1 34); do
		echo "fern_b_ra_$k fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-$((16 + k)):2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:$k:80:0:0"
	done
	# Rakete im Flug: Figur in G+1..G+19 genau an der Rakete (Hoehe 44)
	echo "fern_b_rflug fern_rw20 CC_FRAMES=160 $P20 CC_GESCH_SLOT=10 CC_GESCH=86022:1:19:0:0:44"
	echo "fern_b_rflug0 fern_rw20 CC_FRAMES=160 $P20 CC_GESCH_SLOT=10 CC_GESCH=86022:1:19:0:0:0"
} | laeufe

# --- C: Abwehr --------------------------------------------------------------
{
	# Messer: Schlag in Frame P (Figur schaut zum SKIP), Sprung in Frame P
	for p in $(seq 34 1 53); do
		echo "fern_c_ms_$p fern_sw9 CC_FRAMES=130 CC_LP=1 CC_RANG=9 CC_IN=$p-$p:attack"
	done
	for p in $(seq 28 2 52); do
		echo "fern_c_mj_$p fern_sw9 CC_FRAMES=130 CC_LP=1 CC_RANG=9 CC_IN=$p-$p:jump"
	done
	# Kugel: Figur dreht sich in Frame 10 zum DICK, Schlag bzw. Sprung in Frame P
	for p in $(seq 16 1 40); do
		echo "fern_c_ks_$p fern_pw20 CC_FRAMES=130 $P20 CC_IN=10-10:left;$p-$p:attack"
	done
	for p in $(seq 14 2 40); do
		echo "fern_c_kj_$p fern_pw20 CC_FRAMES=130 $P20 CC_IN=10-10:left;$p-$p:jump"
	done
	# Rakete: Schlag im Flug, Sprung vor der Explosion
	for p in $(seq 12 1 40); do
		echo "fern_c_rs_$p fern_rw20 CC_FRAMES=160 $P20 CC_IN=8-8:left;$p-$p:attack"
	done
	for p in $(seq 14 2 40); do
		echo "fern_c_rj_$p fern_rw20 CC_FRAMES=160 $P20 CC_IN=$p-$p:jump"
	done
	# Gegenlaeufe: Messer (fern_sw20, G 54), Kugel (fern_pw9, G 20, Drehung in Frame 5),
	# Rakete (fern_rw9, G 19, Drehung in Frame 8)
	for p in $(seq 46 2 62); do
		echo "fern_c_ms20_$p fern_sw20 CC_FRAMES=140 CC_LP=1 CC_RANG=20 CC_IN=$p-$p:attack"
	done
	for p in $(seq 40 4 64); do
		echo "fern_c_mj20_$p fern_sw20 CC_FRAMES=140 CC_LP=1 CC_RANG=20 CC_IN=$p-$p:jump"
	done
	for p in $(seq 10 2 30); do
		echo "fern_c_ks9_$p fern_pw9 CC_FRAMES=130 $P9 CC_IN=5-5:left;$p-$p:attack"
	done
	for p in $(seq 6 4 30); do
		echo "fern_c_kj9_$p fern_pw9 CC_FRAMES=130 $P9 CC_IN=5-5:left;$p-$p:jump"
	done
	for p in $(seq 14 2 36); do
		echo "fern_c_rs9_$p fern_rw9 CC_FRAMES=160 $P9 CC_IN=8-8:left;$p-$p:attack"
	done
	for p in $(seq 14 2 40); do
		echo "fern_c_rj9_$p fern_rw9 CC_FRAMES=160 $P9 CC_IN=$p-$p:jump"
	done
	# Gegner auf der Bahn, ab G+1 in jedem Frame D px in Flugrichtung vor dem Geschoss
	# (Frame-Ende: D minus Geschwindigkeit), also im Bereich, in dem die Figur getroffen wuerde
	for D in -20 -12 -4; do
		echo "fern_c_mg_$D fern_sg9 CC_FRAMES=130 CC_LP=1 CC_RANG=9 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:30:_:_ CC_GESCH_GEGNER=16:$D:0"
	done
	for D in 0 8 16; do
		echo "fern_c_kg_$D fern_pz9 CC_FRAMES=130 $P9 CC_GESCH_SLOT=18 CC_GESCH=86022:1:30:_:_ CC_GESCH_GEGNER=13:$D:0"
	done
	echo "fern_c_rg_0 fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-80:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:60:_:_ CC_GESCH_GEGNER=13:0:0"
	echo "fern_c_rg_30 fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-80:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:60:_:_ CC_GESCH_GEGNER=13:30:10"
	# zwei Ziele: Figur und zweiter DICK zugleich in der Explosion
	echo "fern_c_rg_beide fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-37:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:60:-20:0 CC_GESCH_GEGNER=13:20:0"
	# zerbrechliche Objekte auf der Bahn: Oelfass (Slot 43) bzw. Glasscheibe (Slot 46)
	for D in -30 -50; do
		echo "fern_c_mo_$D fern_sw9 CC_FRAMES=130 CC_LP=1 CC_RANG=9 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:30:_:_ CC_GESCH_GEGNER=43:$D:0"
		echo "fern_c_mglas_$D fern_sw9 CC_FRAMES=130 CC_LP=1 CC_RANG=9 CC_GESCH_SLOT=18 CC_GESCH=85b42:1:30:_:_ CC_GESCH_GEGNER=46:$D:0"
	done
	for D in 30 60; do
		echo "fern_c_kglas_$D fern_pw20 CC_FRAMES=130 $P20 CC_GESCH_SLOT=18 CC_GESCH=86022:1:30:_:_ CC_GESCH_GEGNER=46:$D:0"
	done
	# EDDY auf der Bahn (Arena mit Pistolen-DICK 18, Raketen-DICK 13, EDDY 14 und 15;
	# Rang 20, nur WOOKY entfernt): Kugel erste Salve G 228, Rakete G 1154
	MIX="CC_LP=1 CC_RANG=20 CC_ENTF=4-2500:5a97e CC_POKES=2-2500:$DOLG;$LP27"
	for D in 0 8 16; do
		echo "fern_c_ke_$D $A2048 CC_FRAMES=330 CC_DUMP_AB=200 $MIX CC_GESCH_SLOT=18 CC_GESCH=86022:1:30:_:_ CC_GESCH_GEGNER=14:$D:0"
	done
	echo "fern_c_re_0 $A2048 CC_FRAMES=1260 CC_DUMP_AB=1100 $MIX CC_GESCH_SLOT=13 CC_GESCH=86022:1:60:_:_ CC_GESCH_GEGNER=14:0:0"
	echo "fern_c_re_20 $A2048 CC_FRAMES=1260 CC_DUMP_AB=1100 $MIX CC_GESCH_SLOT=13 CC_GESCH=86022:1:60:_:_ CC_GESCH_GEGNER=15:-20:5"
	echo "fern_c_rglas_0 fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-80:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:21:60:_:_ CC_GESCH_GEGNER=46:0:0"
	echo "fern_c_rglas_flug fern_rw20 CC_FRAMES=160 $P20 CC_FEST=18-80:2420:_ CC_GESCH_SLOT=10 CC_GESCH=86022:1:20:_:_ CC_GESCH_GEGNER=46:10:0"
} | laeufe

# --- D: Schaden je Rang -----------------------------------------------------
{
	for r in $(seq 7 24); do
		echo "fern_d_m_$r fern_sw9 CC_FRAMES=400 CC_LP=1 CC_RANG=$r"
		if [ $r -le 16 ]; then
			echo "fern_d_k_$r fern_pw9 CC_FRAMES=700 CC_LP=1 CC_RANG=$r CC_ENTF=1-400:$WE CC_POKES=1-400:$DOLG"
		else
			echo "fern_d_k_$r fern_pw20 CC_FRAMES=200 CC_LP=1 CC_RANG=$r CC_ENTF=1-400:$WE CC_POKES=1-400:$DOLG"
		fi
		echo "fern_d_r_$r fern_rw20 CC_FRAMES=200 CC_LP=1 CC_RANG=$r CC_ENTF=1-400:$WE CC_POKES=1-400:$DOLG"
	done
} | laeufe

# --- E: Waffe des DICK beim Tod (TOET in Frame T: LP 1, Figur 50 px rechts von ihm, Schlag) ---
toet() { # name savestate slot T eingriffe
	local nm=$1 st=$2 n=$3 T=$4; shift 4
	echo "$nm $st CC_FRAMES=$((T + 300)) $* CC_POKES=1-2000:$DOLG;$T-$((T + 2)):s$n+40=1:2;$T-$((T + 2)):s$n+42=1:2 CC_ZU=$T-$((T + 2)):$n:50:0 CC_IN=$((T + 1))-$((T + 1)):left;$((T + 3))-$((T + 3)):attack"
}
{
	toet fern_e_p20_0 fern_pw20 18 2 CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE
	toet fern_e_p20_8 fern_pw20 18 400 CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE
	toet fern_e_p20_11 fern_pw20 18 783 CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE
	toet fern_e_p9_0 fern_pw9 18 2 CC_LP=1 CC_RANG=9 CC_ENTF=1-2000:$WE
	toet fern_e_p9_4 fern_pw9 18 204 CC_LP=1 CC_RANG=9 CC_ENTF=1-2000:$WE
	toet fern_e_r20_0 fern_rw20 10 2 CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE
	toet fern_e_r20_1 fern_rw20 10 238 CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE
	toet fern_e_r20_2 fern_rw20 10 495 CC_LP=1 CC_RANG=20 CC_ENTF=1-2000:$WE
	toet fern_e_r9_0 fern_rw9 13 2 CC_LP=1 CC_RANG=9 CC_ENTF=1-2000:$WE
	toet fern_e_r9_1 fern_rw9 13 240 CC_LP=1 CC_RANG=9 CC_ENTF=1-2000:$WE
} | laeufe

# --- F: Erscheinen des Pistolen-DICK je Rang (ENTF der Arena-WOOKY in Frame 4) ---
{
	for r in $(seq 7 24); do
		echo "fern_f_r$r $A2048 CC_FRAMES=200 CC_LP=1 CC_RANG=$r CC_ENTF=4-4:5a97e CC_POKES=2-200:$DOLG"
	done
	# Arena-WOOKY besiegt (TOET) bei Rang 12 und 16, DOLG aktiv
	echo "fern_f_k12 $A2048 CC_FRAMES=1500 CC_LP=1 CC_RANG=12 $KILLW"
	echo "fern_f_k16 $A2048 CC_FRAMES=1500 CC_LP=1 CC_RANG=16 $KILLW"
} | laeufe

# --- Auswertung ---------------------------------------------------------------
R=logs/raw
A_S="$R/fern_a_s9 $R/fern_a_s20 $R/fern_a_snat $R/fern_a_sf9 $R/fern_a_sf20 $R/fern_a_sg9 $R/fern_a_st9"
A_D="$R/fern_a_p9 $R/fern_a_p20 $R/fern_a_pf9 $R/fern_a_pg9 $R/fern_a_r9 $R/fern_a_r20 $R/fern_a_rf20 $R/fern_a_z9 $R/fern_a_z20 $R/fern_a_k9 $R/fern_a_k20"
[ -f $R/fern_a_gd_ram.hdr ] && A_D="$A_D $R/fern_a_gd"
$M geschosse $A_S $A_D > $tmp/geschosse.csv
$M angriffe $A_S $A_D > $tmp/angriffe.csv
$M abstand $A_S $A_D > $tmp/abstand.csv
$M rhythmus $A_S $A_D > $tmp/rhythmus.csv
$M probe $R/fern_b_m* > $tmp/b_messer.csv
$M probe $R/fern_b_k[xzh]* > $tmp/b_kugel.csv
$M probe --k 2 $R/fern_b_kux_* > $tmp/b_kugel2.csv
$M probe $R/fern_b_r* > $tmp/b_rakete.csv
$M probe $R/fern_c_* > $tmp/c_abwehr.csv
$M probe --k 2 $R/fern_c_ks_* $R/fern_c_kj_* $R/fern_c_ks9_* $R/fern_c_kj9_* > $tmp/c_abwehr_k2.csv
$M probe $R/fern_d_* > $tmp/d_rang.csv
$M waffe $R/fern_e_* $A_D > $tmp/e_waffe.csv
$M bogen $R/fern_e_* > $tmp/e_bogen.csv
$M erscheinen $R/fern_f_* $R/fern_a_k9 $R/fern_a_k20 $R/fern_a_p9 $R/fern_a_p20 $R/fern_a_r9 $R/fern_a_r20 $R/fern_a_z9 $R/fern_a_z20 > $tmp/f_erscheinen.csv
$M zusammenfassung $tmp > $tmp/zusammenfassung.csv

{
	cat <<'EOF'
# Fernangriffe der Gegner in Stage 1 (Captain Commando, Figur Captain): Pistole und Raketenwerfer
# des DICK (Typ 0x64E7A), Messerwurf und Messerhagel (Stichserie) des SKIP (Typ 0x25086).
# Erzeugt von scripts/belege_fern.sh (Szenario scenarios/fern_frei.lua), Auswertung
# scripts/messen_fern.py. Frames = lokale Frames des Runners; Positionen ganzzahlig am Frame-Ende.
# Geschoss = Objekt in Slot 20..59, dessen Zeigerwort S+0x6C auf den Werfer zeigt (Messer Typ
# 0x85B42, Kugel und Rakete Typ 0x86022). A = Angriffsbeginn (Animationszeiger S+0x1C des
# Werfers), G = Erscheinen des Geschosses. d = Abstand der Figur vor dem Werfer, dz = z(Werfer) - z(Figur).
# EINGRIFFE: alle Laeufe LP der Figur 72 (LP); Rang festgehalten (RANG) ausser fern_a_snat und
# fern_a_gd; DICK-Laeufe: DOLG auf x 2900 (DOLG), WOOKY und EDDY entfernt (ENTF), letzte Welle
# per DOLG-LP 27 (LP27), Pistolen-DICK entfernt (PISTWEG) in fern_a_r*, fern_rw*; fern_a_k*: Arena-
# WOOKY besiegt (TOET), DOLG aktiv; fern_a_sf*, fern_a_pf9, fern_a_rf20: Figur fest (FEST);
# Teil B, C: Figur bzw. Gegner/Objekt relativ zum Geschoss gesetzt (GESCH); Teil E: TOET;
# Teil F: Arena-WOOKY in Frame 4 entfernt (f_r*) bzw. besiegt (f_k*, TOET), Rang 7..24.
# Savestates p0_s1_s1_cam00768/02048 stammen aus dem Bot-Lauf der Phase 0 (LP-Auffuellung).
EOF
	echo "## zusammenfassung (je Angriffsart; Belege in den Abschnitten darunter)"
	cat $tmp/zusammenfassung.csv
	echo "## A geschosse (natuerliche Laeufe fern_a_*)"
	cat $tmp/geschosse.csv
	echo "## A angriffe (Haltung = Pose mit Aktion 2, kein Angriff)"
	cat $tmp/angriffe.csv
	echo "## A abstand (Zielpunkt, Vorbereitung, Geschwindigkeit, Rueckzug)"
	cat $tmp/abstand.csv
	echo "## A rhythmus (Abstaende zwischen Angriffsbeginnen in Frames)"
	cat $tmp/rhythmus.csv
	echo "## B Messer: Probe je Lage (rel_dx = x(Figur) - x(Messer), vorn = Figur in Flugrichtung vor dem Messer)"
	cat $tmp/b_messer.csv
	echo "## B Kugel (erste Kugel der Salve)"
	cat $tmp/b_kugel.csv
	echo "## B Kugel (zweite Kugel der Salve, umwerfend)"
	cat $tmp/b_kugel2.csv
	echo "## B Rakete (Explosion, Flug, aktive Frames)"
	cat $tmp/b_rakete.csv
	echo "## C Abwehr (erstes Geschoss)"
	cat $tmp/c_abwehr.csv
	echo "## C Abwehr Kugel (zweites Geschoss der Salve)"
	cat $tmp/c_abwehr_k2.csv
	echo "## D Schaden je Rang (erstes Geschoss)"
	cat $tmp/d_rang.csv
	echo "## E Waffe des DICK beim Tod"
	cat $tmp/e_waffe.csv
	echo "## E Bogen der Waffe (Hoehe des DICK beim Tod, hoechster Punkt, Landung und Gegenstand relativ zum Tod t)"
	cat $tmp/e_bogen.csv
	echo "## F erscheinen (DICK und SKIP; f_r*: Arena-WOOKY in Frame 4 entfernt, f_k*/a_k*: besiegt)"
	cat $tmp/f_erscheinen.csv
} > $out

if [ "${FERN_BEHALTEN:-0}" != "1" ]; then
	aufraeumen
fi
echo "fertig: $out ($(wc -l < $out) Zeilen)"
fi


# =============================================================================
# Gegenpruefung V7 (Praefix fern_v): eigene Laeufe mit scenarios/fern_v_frei.lua
# (Bot: scenarios/fern_v_bot.lua), Auswertung scripts/messen_fern_v.py belege nach
# logs/fern_v.csv. Andere Ausgangslagen als oben: eigener Bot-Savestate
# fern_v_skip8, andere Raenge (12, 17, 22 statt 9, 20), DOLG auf x 2600/Tiefe 300
# gehalten (oben 2900), Arena-WOOKY 17 mit LP 1 und Schlaegen besiegt bzw. per
# entf entfernt, Proben mit dem Geschoss relativ zur Figur (obj:g) statt der Figur
# relativ zum Geschoss, Tiefe und Sprung ohne Eingriff (Figur geht bzw. springt).
# EINGRIFFE (Kurzform je Lauf in CC_E, Bedeutung im Kopf von fern_v_frei.lua):
#   LP 72 immer (CC_LP); CC_RANG; DOLG (Slot 19) auf x 2600, Tiefe 300 (spos);
#   glp (LP eines Slots setzen), entf (Slot entfernen), pos (Figur fest),
#   obj:g (Geschoss relativ zur Figur), fig:g (Figur relativ zum Geschoss),
#   hoch (Hoehe der Figur), frac0 (Nachkommaworte der Figur 0), spos (Glas/Fass).
# Braucht die Savestates stage1, p0_s1_s1_cam00768 und p0_s1_s1_cam02048.
# Dauer etwa 8 Minuten, bis etwa 3 GB in logs/raw. Loescht am Anfang und am Ende
# logs/raw/fern_v_* und die Savestates fern_v_* (legt sie neu an).
# =============================================================================
for st in stage1 $S768 $A2048; do
	[ -f logs/raw/sta/captcomm/$st.sta ] || { echo "Savestate $st fehlt" >&2; exit 1; }
done
SV=scripts/scenarios/fern_v_frei.lua
find logs/raw -maxdepth 1 -name 'fern_v_*' -exec rm -rf {} +
find logs/raw/sta/captcomm -maxdepth 1 -name 'fern_v_*.sta' -delete
laeufe_v() {
	xargs -P "$par" -L 1 bash -c 'nm=$0; st=$1; shift; env "$@" CC_NAME=$nm scripts/run.sh '"$SV"' $st >/dev/null 2>&1 || echo "Fehler: $nm" >&2'
}
DV="2-9000:spos:19:2600:300"
# V0: Bot durch Stage 1 bis zum SKIP (Savestate fern_v_skip8 in Frame 700)
CC_NAME=fern_v_bot1 GFA_CFG=scripts/scenarios/fern_v_bot.lua FV_FRAMES=720 FV_SAVES=700:fern_v_skip8 \
	scripts/grafik/bot.sh stage1
MOV="u:300-319,d:700-719,r:1100-1129,l:1500-1529,u:1900-1914,l:2300-2340,d:2700-2724,r:3100-3160,u:3500-3530,l:3900-3920,d:4300-4330,r:4700-4720,u:5100-5110,l:5500-5560,d:5900-5915,r:6300-6340,u:6700-6720,l:7100-7130,d:7500-7510"
VIN="l:2-3,a:20-21,a:30-31,a:40-41,a:50-51,a:60-61"
VMV="$VIN"
for k in $(seq 400 400 7600); do
	if [ $(( (k / 400) % 2 )) -eq 1 ]; then VMV="$VMV,r:$k-$((k + 60))"; else VMV="$VMV,l:$k-$((k + 60))"; fi
done
EP="$DV;10-10:glp:16:1;10-10:glp:17:1;70-70:entf:16"
EZ="$DV;10-10:entf:16+17;200-200:glp:19:26;202-202:entf:14+15"
ER="$DV;10-10:entf:16+17;200-200:glp:19:26;202-202:entf:15+18"
# V1: natuerliche Laeufe (Figur passiv, LP 72); legen die Savestates der Proben an
#  fern_v_m1a/m1 (s_nat 1370/1388: Messer G = Frame 20 bzw. 2, fliegt -x, Figur x 792 schaut zum SKIP)
#  fern_v_m2 (s_mov 7412: Messer G 2, -x, Figur schaut weg), fern_v_m3a/m3 (s_r12 2000/2018: +x)
#  fern_v_k1 (p_r12 4799: Salve A 10, Kugeln G 16/33/50/67, -x, Figur schaut zum DICK),
#  fern_v_k3 (p_r12 709: -x, Figur schaut weg), fern_v_k2 (p_r22 915: +x, zum DICK)
#  fern_v_r1a/r1/r2 (z_r12 607/621/880: Rakete G 16 bzw. 2, -x bzw. +x)
{
	echo "fern_v_s_nat $S768 CC_FRAMES=8000 CC_SAVE=1370:fern_v_m1a,1388:fern_v_m1"
	echo "fern_v_s_r12 $S768 CC_FRAMES=8000 CC_RANG=12 CC_IN=r:2-60 CC_SAVE=2000:fern_v_m3a,2018:fern_v_m3"
	echo "fern_v_s_r22 fern_v_skip8 CC_FRAMES=8000 CC_RANG=22"
	echo "fern_v_s_mov fern_v_skip8 CC_FRAMES=8000 CC_IN=$MOV CC_SAVE=7412:fern_v_m2"
	echo "fern_v_s_rand9 $S768 CC_FRAMES=6000 CC_RANG=9 CC_IN=l:2-40"
	echo "fern_v_s_rand14 $S768 CC_FRAMES=6000 CC_RANG=14 CC_IN=l:2-40,u:41-50"
	echo "fern_v_s_rand20 $S768 CC_FRAMES=6000 CC_RANG=20 CC_IN=l:2-50"
	echo "fern_v_s_fest12 $S768 CC_FRAMES=8000 CC_RANG=12 CC_E=2-8000:pos:910:"
	echo "fern_v_s_fest895 $S768 CC_FRAMES=8000 CC_RANG=17 CC_E=2-8000:pos:895:"
	echo "fern_v_s_fest900 $S768 CC_FRAMES=8000 CC_RANG=14 CC_E=2-8000:pos:900:"
	echo "fern_v_p_r12 $A2048 CC_FRAMES=8000 CC_RANG=12 CC_IN=$VIN CC_E=$EP CC_SAVE=709:fern_v_k3,4799:fern_v_k1"
	echo "fern_v_p_r22 $A2048 CC_FRAMES=8000 CC_RANG=22 CC_IN=$VIN CC_E=$EP CC_SAVE=915:fern_v_k2"
	echo "fern_v_p_mov $A2048 CC_FRAMES=8000 CC_RANG=20 CC_IN=$VMV CC_E=$EP"
	echo "fern_v_r_r17 $A2048 CC_FRAMES=8000 CC_RANG=17 CC_E=$ER"
	echo "fern_v_z_r22 $A2048 CC_FRAMES=8000 CC_RANG=22 CC_E=$EZ"
	echo "fern_v_z_r12 $A2048 CC_FRAMES=8000 CC_RANG=12 CC_E=$EZ CC_SAVE=607:fern_v_r1a,621:fern_v_r1,880:fern_v_r2"
	echo "fern_v_g_r12 $A2048 CC_FRAMES=6000 CC_RANG=12 CC_E=$DV;10-10:entf:16+17;200-200:glp:19:26"
	echo "fern_v_g_r20 $A2048 CC_FRAMES=6000 CC_RANG=20 CC_E=$DV;10-10:entf:16+17;200-200:glp:19:26"
} | laeufe_v
# V2: Proben Messer (EINGRIFF obj:g = Messer relativ zur Figur im Probeframe, davor 40 px in der Tiefe versetzt)
{
	for o in -18 -17 -16 -15 -14 -13 32 33 34 35 36 37; do echo "fern_v_bmx1_$o fern_v_m1 CC_FRAMES=12 CC_E=3-4:obj:g::-40:;5-5:obj:g:$o:0:"; done
	for o in -26 -25 -24 -23 -22 -21 24 25 26 27 28 29; do echo "fern_v_bmx2_$o fern_v_m2 CC_FRAMES=12 CC_E=3-3:frac0;3-5:obj:g::-40:;6-6:obj:g:$o:0:"; done
	for o in 18 17 16 15 14 -32 -33 -34 -35 -36; do echo "fern_v_bmx3_$o fern_v_m3 CC_FRAMES=12 CC_E=2-2:entf:14+15+16+17;3-3:frac0;3-7:obj:g::-40:;8-8:obj:g:$o:0:"; done
	for o in 27 26 25 24 23 22 -24 -25 -26 -27 -28; do echo "fern_v_bmx3w_$o fern_v_m3 CC_FRAMES=12 CC_IN=r:2-2 CC_E=2-2:entf:14+15+16+17;4-4:frac0;3-7:obj:g::-40:;8-8:obj:g:$o:0:"; done
	for k in 5 6 7 8; do echo "fern_v_bmz1d_$k fern_v_m1a CC_FRAMES=70 CC_IN=d:2-$((1 + k))"; done
	for k in 17 18 19 20; do echo "fern_v_bmz1u_$k fern_v_m1a CC_FRAMES=70 CC_IN=u:2-$((1 + k))"; done
	for h in 57 58 59 60 61 62 63 64 65 66; do echo "fern_v_bmh3_$h fern_v_m3 CC_FRAMES=30 CC_E=2-2:entf:14+15+16+17;2-24:hoch:$h"; done
	for h in 57 58 59 60 61 62; do echo "fern_v_bmh2_$h fern_v_m2 CC_FRAMES=30 CC_E=2-24:hoch:$h"; done
	for p in 2 4 7 9 12 16 20 24; do echo "fern_v_cmj1_$p fern_v_m1a CC_FRAMES=60 CC_IN=j:$p-$((p + 1))"; done
	for k in $(seq -8 9); do echo "fern_v_cms1_$k fern_v_m1a CC_FRAMES=70 CC_IN=a:$((20 + k))-$((21 + k))"; done
	for k in $(seq -7 13); do echo "fern_v_cms3_$k fern_v_m3a CC_FRAMES=70 CC_IN=a:$((20 + k))-$((21 + k)) CC_E=2-2:entf:14+15+16+17"; done
	for r in 7 8 11 12 16 17 21 22 24; do echo "fern_v_dm_$r fern_v_m1a CC_FRAMES=40 CC_RANG=$r"; done
	echo "fern_v_cmglas fern_v_m1 CC_FRAMES=40 CC_E=2-2:spos:47:820:325"
	echo "fern_v_cmfass fern_v_m1 CC_FRAMES=40 CC_E=2-2:spos:44:830:325"
	echo "fern_v_bmrand3 fern_v_m3 CC_FRAMES=110 CC_E=2-2:entf:14+15+16+17;2-100:hoch:75"
} | laeufe_v
# V3: Proben Kugel (k1/k3 Rang 12, k2 Rang 22)
{
	B="$DV;12-12:frac0;17-17:obj:g::-40:"
	for o in -7 -6 -5 -4 27 28 29 30; do echo "fern_v_bkx1_$o fern_v_k1 CC_FRAMES=22 CC_RANG=12 CC_E=$B;18-18:obj:g:$o:0:"; done
	for o in -15 -14 -13 -12 19 20 21 22; do echo "fern_v_bkx3_$o fern_v_k3 CC_FRAMES=22 CC_RANG=12 CC_E=$B;18-18:obj:g:$o:0:"; done
	for o in 7 6 5 4 -27 -28 -29 -30; do echo "fern_v_bkx2_$o fern_v_k2 CC_FRAMES=22 CC_RANG=22 CC_E=$B;18-18:obj:g:$o:0:"; done
	for o in 15 14 13 12 -19 -20 -21 -22; do echo "fern_v_bkx2w_$o fern_v_k2 CC_FRAMES=22 CC_RANG=22 CC_IN=r:11-11 CC_E=$B;18-18:obj:g:$o:0:"; done
	for o in -14 -13 -12 -11 20 21 22 23; do echo "fern_v_bkux3_$o fern_v_k3 CC_FRAMES=40 CC_RANG=12 CC_E=$DV;12-12:frac0;17-17:entf:29;34-34:obj:g::-40:;35-35:obj:g:$o:0:"; done
	for o in 7 6 5 4 -27 -28 -29 -30; do echo "fern_v_bkux2_$o fern_v_k2 CC_FRAMES=56 CC_RANG=22 CC_E=$DV;12-12:frac0;17-17:entf:29;34-34:entf:28;51-51:obj:g::-40:;52-52:obj:g:$o:0:"; done
	for k in 5 6 7 8; do echo "fern_v_bkz1u_$k fern_v_k1 CC_FRAMES=40 CC_RANG=12 CC_IN=u:11-$((10 + k)) CC_E=$DV"; done
	for k in 6 7 8 9; do echo "fern_v_bkz3d_$k fern_v_k3 CC_FRAMES=40 CC_RANG=12 CC_IN=d:11-$((10 + k)) CC_E=$DV"; done
	for h in 61 62 63 64 65; do echo "fern_v_bkh1_$h fern_v_k1 CC_FRAMES=60 CC_RANG=12 CC_E=$DV;17-17:entf:28;30-60:hoch:$h"; done
	for p in 4 8 12 16 20; do echo "fern_v_ckj1_$p fern_v_k1 CC_FRAMES=40 CC_RANG=12 CC_IN=j:$p-$((p + 1)) CC_E=$DV"; done
	for k in -6 -4 -2 0 2 4 6 8; do echo "fern_v_cks1_$k fern_v_k1 CC_FRAMES=40 CC_RANG=12 CC_IN=a:$((16 + k))-$((17 + k)) CC_E=$DV"; done
	for r in 7 8 14 15 21 22 24; do echo "fern_v_dk_$r fern_v_k1 CC_FRAMES=40 CC_RANG=$r CC_E=$DV"; done
	echo "fern_v_ckglas fern_v_k1 CC_FRAMES=40 CC_RANG=12 CC_E=$DV;2-2:spos:47:2160:150"
} | laeufe_v
# V4: Proben Rakete (r1/r2/r1a, Rang 12)
{
	B="$DV;5-5:frac0;23-23:obj:g::40:"
	for v in -58 -57 -56 -55 46 47 48 49; do
		echo "fern_v_brx1_$v fern_v_r1 CC_FRAMES=28 CC_RANG=12 CC_E=$B;24-24:obj:g:$v:0:"
		echo "fern_v_brx2t_$v fern_v_r2 CC_FRAMES=28 CC_RANG=12 CC_IN=r:3-3 CC_E=$B;24-24:obj:g:$((-v)):0:"
	done
	for v in -58 -57 -56 -55 -50 -49 -48 -47 -46 -45 46 47 48 49 53 54 55 56 57 58; do
		echo "fern_v_brx1t_$v fern_v_r1 CC_FRAMES=28 CC_RANG=12 CC_IN=r:3-3 CC_E=$B;24-24:obj:g:$v:0:"
		echo "fern_v_brx2_$v fern_v_r2 CC_FRAMES=28 CC_RANG=12 CC_E=$B;24-24:obj:g:$((-v)):0:"
	done
	for K in 22 23 24 30 31 32 33; do echo "fern_v_brt1_$K fern_v_r1 CC_FRAMES=40 CC_RANG=12 CC_E=$DV;2-$((K - 1)):fig:g::40:;$K-$K:fig:g:0:0:"; done
	for k in 6 7 8 9; do echo "fern_v_brz1u_$k fern_v_r1a CC_FRAMES=50 CC_RANG=12 CC_IN=u:11-$((10 + k)) CC_E=$DV"; done
	for k in 16 17 18 19; do echo "fern_v_brz1d_$k fern_v_r1a CC_FRAMES=50 CC_RANG=12 CC_IN=d:11-$((10 + k)) CC_E=$DV"; done
	for h in 24 25 26 27 28; do echo "fern_v_brh1_$h fern_v_r1 CC_FRAMES=40 CC_RANG=12 CC_E=$DV;20-34:hoch:$h"; done
	for k in 4 6 8 10 14 18 22 26 28 30; do echo "fern_v_crj1_$k fern_v_r1a CC_FRAMES=50 CC_RANG=12 CC_IN=j:$((37 - k))-$((38 - k)) CC_E=$DV"; done
	for p in 16 19 22 25 28 31 34; do echo "fern_v_crs1_$p fern_v_r1a CC_FRAMES=50 CC_RANG=12 CC_IN=a:$p-$((p + 1)) CC_E=$DV"; done
	for r in 7 8 14 15 21 22 24; do echo "fern_v_dr_$r fern_v_r1a CC_FRAMES=50 CC_RANG=$r CC_E=$DV"; done
	echo "fern_v_crglas_flug fern_v_r1 CC_FRAMES=60 CC_RANG=12 CC_E=$DV;2-2:spos:47:2420:151"
	echo "fern_v_crglas_ex fern_v_r1 CC_FRAMES=60 CC_RANG=12 CC_E=$DV;2-2:spos:47:2353:151"
} | laeufe_v
# V5: Erscheinen (Pistolen-DICK je Rang; zweiter Raketen-DICK) und Tod des DICK (TOET: glp 1, Schlag)
{
	for r in 7 8 14 15 16 17 18 19 20 21 24; do echo "fern_v_fe_$r $A2048 CC_FRAMES=400 CC_RANG=$r CC_IN=$VIN CC_E=$EP"; done
	for r in 9 12 17 18 20 22; do echo "fern_v_zweit_e$r $A2048 CC_FRAMES=400 CC_RANG=$r CC_E=$DV;10-10:entf:16+17;200-200:glp:19:26"; done
	for r in 17 18 20; do echo "fern_v_zweit_a$r $A2048 CC_FRAMES=400 CC_RANG=$r CC_E=$DV;200-200:glp:19:26"; done
	echo "fern_v_e_p0 $A2048 CC_FRAMES=496 CC_RANG=12 CC_IN=$VIN,r:337-337,a:339-340 CC_E=$EP;337-337:glp:18:1"
	echo "fern_v_e_p0b $A2048 CC_FRAMES=350 CC_RANG=22 CC_IN=$VIN,l:191-191,a:193-194 CC_E=$EP;191-191:glp:18:1"
	echo "fern_v_e_p4 $A2048 CC_FRAMES=1157 CC_RANG=12 CC_IN=$VIN,r:998-998,a:1000-1001 CC_E=$EP;998-998:glp:18:1"
	echo "fern_v_e_p13 $A2048 CC_FRAMES=6140 CC_RANG=12 CC_IN=$VIN,r:5981-5981,a:5983-5984 CC_E=$EP;5981-5981:glp:18:1"
	echo "fern_v_e_p15 $A2048 CC_FRAMES=2762 CC_RANG=20 CC_IN=$VMV,l:2603-2603,a:2605-2606 CC_E=$EP;2603-2603:glp:18:1"
	echo "fern_v_e_r0 $A2048 CC_FRAMES=515 CC_RANG=12 CC_IN=r:356-356,a:358-359 CC_E=$EZ;356-356:glp:13:1"
	echo "fern_v_e_r1b $A2048 CC_FRAMES=1268 CC_RANG=22 CC_IN=l:1109-1109,a:1111-1112 CC_E=$EZ;1109-1109:glp:12:1"
	echo "fern_v_e_r6 $A2048 CC_FRAMES=3434 CC_RANG=17 CC_IN=r:3275-3275,a:3277-3278 CC_E=$ER;3275-3275:glp:14:1"
} | laeufe_v
# V6: Auswertung nach logs/fern_v.csv; Rohdaten je Lauf danach geloescht
python3 scripts/messen_fern_v.py belege --raw logs/raw --aus logs/fern_v.csv $([ "${FERN_BEHALTEN:-0}" = "1" ] || echo --loeschen)
find logs/raw -maxdepth 1 -name 'fern_v_bot1_*' -delete
echo "fertig: logs/fern_v.csv ($(wc -l < logs/fern_v.csv) Zeilen)"

# =============================================================================
# Dritte Messung M7 (Praefix fern_t): Zeilen, in denen die Gegenpruefung V7
# abwich, mit einer dritten Variante (andere Raenge 7, 12, 14, 17, 22, 24, andere
# Lagen und Savestates, Geschosse in beiden Flugrichtungen, Figur geht per
# Eingabe-Bot CC_HIN auf den Gegner zu). Szenario scenarios/fern_frei.lua (drei
# Nachlaeufe von V7-Laeufen mit scenarios/fern_v_frei.lua), Auswertung
# messen_fern.py (Unterbefehle ausloesung, salve, nachschuss, slots, bahnende,
# welle, bogen, fenster, rhythmus, abstand), Abschnitte "## T ..." am Ende von
# logs/fern.csv. Rohdaten fern_t_* danach geloescht, Savestates fern_t_* bleiben.
# Dauer etwa 6 Minuten, bis etwa 3 GB in logs/raw.
# EINGRIFFE (Abkuerzungen wie oben): LP immer; RANG; DOLG und ENTF in den
#   DICK-Laeufen (ENTF teils nur WOOKY: EDDY der letzten Welle leben);
#   LP25 = DOLG-LP in Frame 150 auf 25 (loest die letzte Welle aus);
#   PISTWEG; FEST (Figur fest auf x 880, 1000, 1560, 2110, 2180 bzw. 2330);
#   GESCH (Proben T2); TIEFE = Figur nach dem k-ten Schuss auf Tiefe 200 (T3);
#   HOEHE = Hoehe des DICK beim Tod gesetzt (T5); RANGWECHSEL (T4: Rang in
#   Frame 160 umgestellt); Nachlaeufe V7: Eingriffe wie im Block V7.
# =============================================================================
if [ "${FERN_NUR_V:-0}" != "1" ]; then
find logs/raw -maxdepth 1 -name 'fern_t_*' -exec rm -rf {} +
find logs/raw/sta/captcomm -maxdepth 1 -name 'fern_t_*.sta' -delete
T=logs/raw/fern_t_auswertung
mkdir -p $T
LP25="150-151:s19+40=25:2;150-151:s19+42=25:2"
# T1: natuerliche Laeufe (6000 Frames, Figur passiv bzw. fest oder per CC_HIN);
# legen die Savestates der Proben an (Frames: A = Angriffsbeginn ab Savestate):
#  fern_t_sw   SKIP links, Messer +x (A 10, G 18), Figur x 1000, Rang 14
#  fern_t_sw2  SKIP rechts, Messer -x (A 10, G 18), Figur x 880, Rang 17
#  fern_t_pw   Pistolen-DICK rechts, Kugel -x (A 18, G 24), Figur x 2110, Rang 22
#  fern_t_pw2  Pistolen-DICK links, Kugel +x (A 16, G 22), Rang 14
#  fern_t_pw3  Salve mit Budget 120 (A 13, 8 Schuesse +x), Rang 22, EDDY leben
#  fern_t_rw   Raketen-DICK rechts, Rakete -x (A 13, G 19), Figur x 2330, Rang 14
#  fern_t_rw2  Raketen-DICK links, Rakete +x (A 14, G 20), Rang 24
laeufe <<EOF2
fern_t_s14r $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_IN=2-100:right
fern_t_s14l $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_IN=2-60:left
fern_t_s17g fern_sg9 CC_FRAMES=6000 CC_LP=1 CC_RANG=17
fern_t_s22h $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=22 CC_HIN=18:240:60
fern_t_sf880 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=17 CC_FEST=2-6000:880:_ CC_SAVE=318:fern_t_sw2
fern_t_sf1000 $S768 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_FEST=2-6000:1000:_ CC_SAVE=4655:fern_t_sw
fern_t_sr1560 $S768 CC_FRAMES=4000 CC_LP=1 CC_RANG=20 CC_FEST=2-4000:1560:_
fern_t_p7 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=7 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG
fern_t_pf12 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=12 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG CC_FEST=2-6000:2180:_
fern_t_p14 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG CC_SAVE=2555:fern_t_pw2
fern_t_p24 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=24 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG
fern_t_pl22 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=22 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG CC_FEST=2-6000:2110:_ CC_SAVE=340:fern_t_pw
fern_t_ph14 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG CC_HIN=18:200:50
fern_t_m22 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=22 CC_ENTF=4-6000:5a97e CC_POKES=2-6000:$DOLG;$LP25 CC_SAVE=4985:fern_t_pw3
fern_t_r14 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP25
fern_t_r24 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=24 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP25 CC_SAVE=260:fern_t_rw2
fern_t_rr14 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=14 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP25 CC_FEST=2-6000:2330:_ CC_SAVE=3096:fern_t_rw
fern_t_rr17 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=17 CC_ENTF=4-6000:$WE CC_POKES=2-6000:$DOLG;$LP25 CC_FEST=2-6000:2330:_
fern_t_r17 $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=17 CC_ENTF=4-6000:5a97e CC_POKES=2-6000:$DOLG;$LP25
fern_t_r22h $A2048 CC_FRAMES=6000 CC_LP=1 CC_RANG=22 CC_ENTF=4-6000:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-6000:$DOLG;$LP25 CC_HIN=13:300:40
EOF2
for s in sw sw2 pw pw2 pw3 rw rw2; do
	[ -f logs/raw/sta/captcomm/fern_t_$s.sta ] || { echo "Savestate fern_t_$s fehlt" >&2; exit 1; }
done
# T2: Trefferflaeche je Flugrichtung und Blick (GESCH ab G+1 bzw. bei der Rakete ab G+21,
# davor FEST; Blick per Taste in Frame 5). Laufname GRUPPE_<l|r><e>: e = vorhergesagte
# Welt-Lage x(Figur) - x(Geschoss) am Frame-Ende, D = e + Tempo; je Grenze der Regel
# -5..+5 und ein Punkt innen
PD="CC_ENTF=1-2000:$WE CC_POKES=1-2000:$DOLG"
proben() { # gruppe savestate art slot G tempo "eingriffe" lo_l hi_l lo_r hi_r [von]
	local nm=$1 st=$2 art=$3 sl=$4 G=$5 v=$6 eg=$7 lol=$8 hil=$9 lor=${10} hir=${11} von=${12:-1}
	local b lo hi k e
	for b in l r; do
		if [ $b = l ]; then lo=$lol; hi=$hil; k=left; else lo=$lor; hi=$hir; k=right; fi
		for e in $( { seq $((lo - 5)) $((lo + 5)); seq $((hi - 5)) $((hi + 5)); echo $(((lo + hi) / 2)); } | sort -n | uniq); do
			echo "${nm}_${b}${e} $st CC_FRAMES=$((G + 45)) $eg CC_IN=5-5:$k CC_GESCH_SLOT=$sl CC_GESCH=$art:$von:60:$((e + v)):0"
		done
	done
}
{
	proben fern_t_bm1 fern_t_sw 85b42 18 18 4 "CC_LP=1 CC_RANG=14 CC_FEST=1-18:1000:_" -20 29 -28 21
	proben fern_t_bm2 fern_t_sw2 85b42 18 18 -4 "CC_LP=1 CC_RANG=17 CC_FEST=1-18:880:_" -22 27 -30 19
	proben fern_t_bk1 fern_t_pw 86022 18 24 -8 "CC_LP=1 CC_RANG=22 $PD CC_FEST=1-24:2110:_" -13 20 -21 12
	proben fern_t_bk2 fern_t_pw2 86022 18 22 8 "CC_LP=1 CC_RANG=14 $PD" -13 20 -21 12
	proben fern_t_br1 fern_t_rw 86022 13 19 0 "CC_LP=1 CC_RANG=14 $PD CC_FEST=1-19:2330:_;20-39:2330:200" -48 55 -56 47 21
	proben fern_t_br2 fern_t_rw2 86022 13 20 0 "CC_LP=1 CC_RANG=24 $PD CC_FEST=21-40:_:200" -48 55 -56 47 21
} | laeufe
# T3: Salve mit Budget 120 (fern_t_pw3, A 13): Figur ab A+17k-4 auf Tiefe 200 (TIEFE)
{
	echo "fern_t_kt_0 fern_t_pw3 CC_FRAMES=200 CC_LP=1 CC_RANG=22 CC_ENTF=1-2000:5a97e CC_POKES=1-2000:$DOLG"
	for k in 1 2 3 4 5 6 7; do
		echo "fern_t_kt_$k fern_t_pw3 CC_FRAMES=200 CC_LP=1 CC_RANG=22 CC_ENTF=1-2000:5a97e CC_POKES=1-2000:$DOLG CC_FEST=$((9 + 17 * k))-200:_:200"
	done
} | laeufe
# T4: letzte Welle (LP25 in Frame 150) je Rang; a: EDDY und Pistolen-DICK leben, b: PISTWEG,
# c: EDDY entfernt, d: beides; e/f: in a ein EDDY (Frame 260) bzw. der Pistolen-DICK
# (Frame 185) entfernt; RANGWECHSEL in Frame 160: z15_f Rang 15 -> 20, z20_f 20 -> 9
{
	for r in 9 12 14 15 16 17 18 19 20 21 22 23 24; do
		echo "fern_t_z${r}_a $A2048 CC_FRAMES=400 CC_LP=1 CC_RANG=$r CC_ENTF=4-400:5a97e CC_POKES=2-400:$DOLG;$LP25"
		echo "fern_t_z${r}_b $A2048 CC_FRAMES=400 CC_LP=1 CC_RANG=$r CC_ENTF=4-400:5a97e CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-400:$DOLG;$LP25"
		echo "fern_t_z${r}_c $A2048 CC_FRAMES=400 CC_LP=1 CC_RANG=$r CC_ENTF=4-400:$WE CC_POKES=2-400:$DOLG;$LP25"
		echo "fern_t_z${r}_d $A2048 CC_FRAMES=400 CC_LP=1 CC_RANG=$r CC_ENTF=4-400:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-400:$DOLG;$LP25"
	done
	echo "fern_t_z22_e $A2048 CC_FRAMES=700 CC_LP=1 CC_RANG=22 CC_ENTF=4-700:5a97e CC_ENTF_SLOT=260-260:14 CC_POKES=2-700:$DOLG;$LP25"
	echo "fern_t_z22_f $A2048 CC_FRAMES=700 CC_LP=1 CC_RANG=22 CC_ENTF=4-700:5a97e CC_ENTF_SLOT=185-185:18,58 CC_POKES=2-700:$DOLG;$LP25"
	echo "fern_t_z15_f $A2048 CC_FRAMES=500 CC_LP=1 CC_RANG=15 CC_ENTF=4-500:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-500:$DOLG;$LP25;160-500:fff82a=20"
	echo "fern_t_z20_f $A2048 CC_FRAMES=500 CC_LP=1 CC_RANG=20 CC_ENTF=4-500:$WE CC_ENTF_SLOT=12-12:18,58 CC_POKES=2-500:$DOLG;$LP25;160-500:fff82a=9"
} | laeufe
# T5: Waffe beim Tod in Hoehe 0, 12, 24 (Pistolen-DICK, fern_pw9) bzw. 20 (Raketen-DICK,
# fern_rw9), Rang 14: TOET in Frame 2 (LP 1, Figur 50 px daneben, Schlag in 5), HOEHE 2-7
{
	for h in 0 12 24; do
		echo "fern_t_e_h$h fern_pw9 CC_FRAMES=302 CC_LP=1 CC_RANG=14 CC_ENTF=1-2000:$WE CC_POKES=1-2000:$DOLG;2-4:s18+40=1:2;2-4:s18+42=1:2;2-7:s18+12=$h:2 CC_ZU=2-4:18:50:0 CC_IN=3-3:left;5-5:attack"
	done
	echo "fern_t_e_r0h fern_rw9 CC_FRAMES=302 CC_LP=1 CC_RANG=14 CC_ENTF=1-2000:$WE CC_POKES=1-2000:$DOLG;2-4:s13+40=1:2;2-4:s13+42=1:2;2-7:s13+12=20:2 CC_ZU=2-4:13:50:0 CC_IN=3-3:left;5-5:attack"
} | laeufe
# T6: Nachlaeufe dreier V7-Laeufe mit Abzug (Szenario und Eingriffe wie im Block V7):
# g_r20 und z_r22 (Salven mit 8 Schuessen), e_p0 (Waffenbogen 78 px)
DV7="2-9000:spos:19:2600:300"
VIN7="l:2-3,a:20-21,a:30-31,a:40-41,a:50-51,a:60-61"
{
	echo "fern_t_v7_g_r20 $A2048 CC_FRAMES=5100 CC_DUMP=4800-5100 CC_RANG=20 CC_E=$DV7;10-10:entf:16+17;200-200:glp:19:26"
	echo "fern_t_v7_z_r22 $A2048 CC_FRAMES=7300 CC_DUMP=7000-7300 CC_RANG=22 CC_E=$DV7;10-10:entf:16+17;200-200:glp:19:26;202-202:entf:14+15"
	echo "fern_t_v7e_p0 $A2048 CC_FRAMES=496 CC_RANG=12 CC_IN=$VIN7,r:337-337,a:339-340 CC_E=$DV7;10-10:glp:16:1;10-10:glp:17:1;70-70:entf:16;337-337:glp:18:1"
} | xargs -P "$par" -L 1 bash -c 'nm=$0; st=$1; shift; env "$@" CC_NAME=$nm scripts/run.sh scripts/scenarios/fern_v_frei.lua $st >/dev/null 2>&1 || echo "Fehler: $nm" >&2'
# Auswertung T
R=logs/raw
T_S="$R/fern_t_s14r $R/fern_t_s14l $R/fern_t_s17g $R/fern_t_s22h $R/fern_t_sf880 $R/fern_t_sf1000 $R/fern_t_sr1560"
T_P="$R/fern_t_p7 $R/fern_t_pf12 $R/fern_t_p14 $R/fern_t_p24 $R/fern_t_pl22 $R/fern_t_ph14 $R/fern_t_m22"
T_R="$R/fern_t_r14 $R/fern_t_r24 $R/fern_t_rr14 $R/fern_t_rr17 $R/fern_t_r17 $R/fern_t_r22h"
$M ausloesung $T_S $T_P $T_R > $T/ausloesung.csv
$M salve $T_P $R/fern_t_kt_* $R/fern_t_v7_g_r20 $R/fern_t_v7_z_r22 > $T/salve.csv
$M nachschuss $T_P $T_R > $T/nachschuss.csv
$M slots $T_S $T_P $T_R > $T/slots.csv
$M bahnende $T_P $T_R > $T/bahnende.csv
$M welle $R/fern_t_z* > $T/welle.csv
$M bogen $R/fern_t_e_* $R/fern_t_v7e_p0 > $T/bogen.csv
$M fenster $R/fern_t_b[mkr][12]_* > $T/fenster.csv
$M rhythmus $T_S $T_P $T_R > $T/rhythmus.csv
$M abstand $T_P $T_R > $T/abstand.csv
{
	cat <<'EOF2'
# ---------------------------------------------------------------------------------------------
# Dritte Messung (Laeufe fern_t_*, Block "Dritte Messung M7" in belege_fern.sh): Zeilen, in denen
# V7 abwich, mit Raengen 7/14/17/22/24, anderen Lagen und Savestates, beiden Flugrichtungen.
# EINGRIFFE: LP; RANG; DOLG, ENTF (teils nur WOOKY), LP25 (DOLG-LP 25 in Frame 150), PISTWEG,
# FEST in fern_t_sf*, sr1560, pf12, pl22, rr* (Figur fest auf x im Laufnamen bzw. 2180/2110/2330); T2 GESCH; T3 TIEFE (Figur nach
# dem k-ten Schuss auf Tiefe 200, fern_t_kt_k); T4 ENTF/PISTWEG je Variante, RANGWECHSEL in
# fern_t_z15_f/z20_f; T5 TOET mit HOEHE des DICK; fern_t_v7_*: Nachlaeufe von V7-Laeufen mit
# dessen Szenario und Eingriffen. CC_HIN (fern_t_s22h, ph14, r22h) ist Eingabe, kein Eingriff.
EOF2
	echo "## T ausloesung (Zielpunkt S+0x96/0x98 vor A: Messerwurf Welt-x/Tiefe, sonst relativ zur Figur; abw = Lage - Ziel)"
	cat $T/ausloesung.csv
	echo "## T salve (Budget S+0xAB in A; Schuesse nach Budget = 1 + Anzahl k mit 17k+16 < Budget; fern_t_kt_k: TIEFE nach Schuss k)"
	cat $T/salve.csv
	echo "## T nachschuss (erster Frame nach dem letzten Zyklus; erfuellt = |abw_x| <= 8 und |abw_z| <= 6)"
	cat $T/nachschuss.csv
	echo "## T slots (Belegung der Slots 27, 28, 29 im Frame vor G)"
	cat $T/slots.csv
	echo "## T bahnende (Geschosse ohne Treffer an der Figur)"
	cat $T/bahnende.csv
	echo "## T welle (letzte Welle per LP25; zweiter Raketen-DICK)"
	cat $T/welle.csv
	echo "## T bogen (Waffe beim Tod; fern_t_e_h*: HOEHE des DICK, fern_t_v7e_p0: Nachlauf V7)"
	cat $T/bogen.csv
	echo "## T fenster (Trefferflaeche; Regel: Treffer, wenn (x Figur + 4*Blick) - (x Geschoss + Flugrichtung*o) in [-H, H-1], Messer H 25 o 1, Kugel H 17 o 0, Explosion H 52 o 0)"
	cat $T/fenster.csv
	echo "## T rhythmus"
	cat $T/rhythmus.csv
	echo "## T abstand"
	cat $T/abstand.csv
} >> $out
if [ "${FERN_BEHALTEN:-0}" != "1" ]; then
	aufraeumen
fi
echo "fertig: Dritte Messung in $out ($(wc -l < $out) Zeilen)"
fi
