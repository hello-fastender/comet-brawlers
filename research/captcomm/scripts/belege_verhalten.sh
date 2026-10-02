#!/usr/bin/env bash
# Verhalten von WOOKY und EDDY (Auftrag M2, Praefix "verhalten"): alle
# MAME-Laeufe von vorn, Auswertung mit messen_verhalten.py nach
# logs/verhalten.csv; loescht danach die eigenen Rohdaten (logs/raw/verhalten_*).
# Voraussetzung: Savestates ingame, anlauf, anlauf_b, anlauf_c, kontakt,
# kontakt_b, tiefe_b, stage1 (scripts/laeufe_a5.sh, scenarios/stage_start.lua).
# Gegenprüfung V2 (Präfix verhalten_v, Block unten): zusätzlich held0, held2, held3
# (stage_start.lua mit CC_FIGUR, CC_SAVE=2400, CC_SAVE_NAME); schreibt
# logs/verhalten_v.csv und lässt logs/verhalten.csv unverändert.
# EINGRIFFE (alle im Kopf der Szenarien beschrieben):
#   - in jedem Lauf LP der Figur P+0x40 := 72, wenn 0 < LP < 72 (Figur ueberlebt)
#   - akt_eingriff_*: Gegner in Frame 2 an eine andere x-Position gesetzt
#   - b_weg_r_*: Gegner in Frame 2 60 px links der Figur gesetzt
#   - r_*: Rang FFF82A festgehalten
#   - bot_*: Bot-Eingriffe (LP der Gegner := 1 bzw. Gegner entfernt), siehe
#     logs/raw/verhalten_bot_*_events.txt waehrend des Laufs
# CC_JOBS: parallele MAME-Laeufe (Standard 6). CC_BEHALTEN=1: Rohdaten behalten.
# CC_NUR_AUSWERTUNG=1: keine MAME-Laeufe, nur vorhandene Rohdaten auswerten.
# Dauer: etwa 10 min (88 Laeufe, Auswertung etwa 3 min), Platz: etwa 3 GB waehrend des Laufs.
# Mit der Gegenprüfung V2: 164 Läufe, etwa 15 min, Platz etwa 6 GB.
# Mit der dritten Messung M2 (verhalten_m3_*): 220 Läufe, etwa 25 min, Platz etwa 9 GB.
set -euo pipefail
cd "$(dirname "$0")/.."
sc=scripts/scenarios/verhalten.lua
hu=scripts/scenarios/verhalten_huelle.lua
bc=scripts/scenarios/verhalten_bot.lua
out=logs/verhalten.csv
N=${CC_JOBS:-6}
df -h . | tail -n 1
[ "${CC_NUR_AUSWERTUNG:-0}" = 1 ] || rm -f logs/raw/verhalten_*
q() { "$@" >/dev/null 2>&1 || { echo "Fehler: $*" >&2; touch logs/raw/verhalten_FEHLER; exit 1; }; }
r() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="verhalten_$name" scripts/run.sh $sc "$state"; }
h() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="verhalten_$name" scripts/run.sh $hu "$state"; }
b() { local name=$1; shift; q env "$@" CC_NAME="verhalten_$name" GFA_CFG=$bc scripts/grafik/bot.sh stage1; }
par() {
	[ "${CC_NUR_AUSWERTUNG:-0}" = 1 ] && return 0
	"$@" &
	while [ "$(jobs -rp | wc -l)" -ge "$N" ]; do wait -n; done
}

# A: ein Gegner, Figur passiv (3000 Frames); w = WOOKY (16 LP, Slot 18),
# e = EDDY (30 LP, Slot 17; der hockende WOOKY in Slot 16 kann dazukommen)
par r a_w1 anlauf CC_FRAMES=3000
par r a_w2 anlauf_b CC_FRAMES=3000
# a_w3: kontakt liegt auf demselben Weg wie anlauf (42 Frames spaeter); ein kurzer
# Schritt nach links macht den Lauf unabhaengig von a_w1
par r a_w3 kontakt CC_FRAMES=3000 CC_IN="2-5:p1_left"
par r a_w4 anlauf CC_FRAMES=3000 CC_IN="2-21:p1_up"
par r a_w5 anlauf_b CC_FRAMES=3000 CC_IN="2-31:p1_down"
par r a_e1 anlauf_c CC_FRAMES=3000
par r a_e2 kontakt_b CC_FRAMES=3000
par r a_e3 tiefe_b CC_FRAMES=3000
par r a_e4 anlauf_c CC_FRAMES=3000 CC_IN="2-21:p1_up"
par r a_e5 anlauf_c CC_FRAMES=3000 CC_IN="2-41:p1_left"
# Gegenprobe zum EINGRIFF "LP auffuellen": dieselben Laeufe ohne Auffuellen
# (die Figur stirbt dann); verglichen mit messen_verhalten.py vergleich
par r lp0_w1 anlauf CC_FRAMES=3000 CC_LP=0
par r lp0_e1 anlauf_c CC_FRAMES=3000 CC_LP=0
# A1: Aktivierung ab ingame/stage1 mit verschiedenen Wegen der Figur
par r akt_gerade ingame CC_FRAMES=1500 CC_IN="61-460:p1_right"
par r akt_diag ingame CC_FRAMES=1500 CC_IN="61-560:p1_right+p1_up"
par r akt_stufen ingame CC_FRAMES=1500 CC_IN="61-100:p1_right;161-200:p1_right;261-300:p1_right;361-400:p1_right;461-500:p1_right;561-600:p1_right;661-700:p1_right"
par r akt_stage1 stage1 CC_FRAMES=1500 CC_IN="2-401:p1_right"
par r akt_spaet ingame CC_FRAMES=2000 CC_IN="601-1000:p1_right"
# EINGRIFF: Gegner in Frame 2 naeher an den linken Bildrand gesetzt
# (x - Kamera 344 bzw. 300, Abstand zur Figur 280 bzw. 236 px), danach
# steht die Figur 300 Frames und geht dann nach rechts
par r akt_eingriff_w ingame CC_FRAMES=1000 CC_GSLOT=18 CC_GDX=280 CC_GBIS=2 CC_IN="301-500:p1_right"
par r akt_eingriff_e ingame CC_FRAMES=1000 CC_GSLOT=17 CC_GDX=236 CC_GBIS=2 CC_IN="301-500:p1_right"
# B1: Figur laeuft weg (1,75 px/Frame); b_weg_r_*: EINGRIFF Gegner 60 px links
par r b_weg_w kontakt CC_FRAMES=1500 CC_MUSTER=weg_l CC_AB=30 CC_DAUER=300
par r b_weg_w2 anlauf CC_FRAMES=1500 CC_MUSTER=weg_l CC_AB=2 CC_DAUER=300
par r b_weg_e kontakt_b CC_FRAMES=1500 CC_MUSTER=weg_l CC_AB=30 CC_DAUER=300
par r b_weg_e2 anlauf_c CC_FRAMES=1500 CC_MUSTER=weg_l CC_AB=2 CC_DAUER=300
par r b_weg_r_w kontakt CC_FRAMES=1500 CC_MUSTER=weg_r CC_AB=30 CC_DAUER=400 CC_GSLOT=18 CC_GDX=-60 CC_GBIS=2
par r b_weg_r_e kontakt_b CC_FRAMES=1500 CC_MUSTER=weg_r CC_AB=30 CC_DAUER=400 CC_GSLOT=17 CC_GDX=-60 CC_GBIS=2
# B1 (Sweep): Weglaufen nach links zu verschiedenen Zeitpunkten im Angriffszyklus
for t in 10 40 70 100; do
	par r b_weg_t${t}_w kontakt CC_FRAMES=800 CC_MUSTER=weg_l CC_AB=$t CC_DAUER=200
	par r b_weg_t${t}_e kontakt_b CC_FRAMES=800 CC_MUSTER=weg_l CC_AB=$t CC_DAUER=200
done
# B1 (EINGRIFF, Gegner 60 px links): Weglaufen nach rechts, andere Startzeit
par r b_weg_r90_w kontakt CC_FRAMES=1000 CC_MUSTER=weg_r CC_AB=90 CC_DAUER=400 CC_GSLOT=18 CC_GDX=-60 CC_GBIS=2
par r b_weg_r90_e kontakt_b CC_FRAMES=1000 CC_MUSTER=weg_r CC_AB=90 CC_DAUER=400 CC_GSLOT=17 CC_GDX=-60 CC_GBIS=2
# B2 (Sweep): ein Tiefenschritt von 20 px, nachdem der Gegner steht (EDDY in
# anlauf_c ab Frame 38 bei dz 0: hoch -> dz -20; WOOKY in anlauf ab Frame 40 bei
# dz +10: runter -> dz +30), zu verschiedenen Zeitpunkten im Angriffszyklus
for t in 40 48 56 64 72 80 100 120; do
	par r b_tiefe_t${t}_e anlauf_c CC_FRAMES=500 CC_IN="$t-$((t + 19)):p1_up"
	par r b_tiefe_t${t}_w anlauf CC_FRAMES=500 CC_IN="$t-$((t + 19)):p1_down"
done
# B2: Tiefenschritte zu 20 px
par r b_tiefe_w kontakt CC_FRAMES=1500 CC_MUSTER=tiefe CC_AB=30 CC_PAUSE=150
par r b_tiefe_w2 anlauf CC_FRAMES=1500 CC_MUSTER=tiefe CC_AB=60 CC_PAUSE=120
par r b_tiefe_e kontakt_b CC_FRAMES=1500 CC_MUSTER=tiefe CC_AB=30 CC_PAUSE=100
par r b_tiefe_e2 anlauf_c CC_FRAMES=1500 CC_MUSTER=tiefe CC_AB=60 CC_PAUSE=150
# B3: wiederholte Spruenge im Stand
par r b_sprung_w kontakt CC_FRAMES=1500 CC_MUSTER=sprung CC_AB=30 CC_TAKT=60
par r b_sprung_w2 anlauf CC_FRAMES=1500 CC_MUSTER=sprung CC_AB=40 CC_TAKT=80
par r b_sprung_e kontakt_b CC_FRAMES=1500 CC_MUSTER=sprung CC_AB=30 CC_TAKT=50
par r b_sprung_e2 anlauf_c CC_FRAMES=1500 CC_MUSTER=sprung CC_AB=40 CC_TAKT=60
par r b_sprung_w3 kontakt CC_FRAMES=1500 CC_MUSTER=sprung CC_AB=20 CC_TAKT=70
par r b_sprung_e3 anlauf_c CC_FRAMES=1500 CC_MUSTER=sprung CC_AB=20 CC_TAKT=45
# Rang (EINGRIFF): Pause vor dem Angriff und Gehgeschwindigkeit je Rang
for g in 7 9 12 16 19 20 23 24; do
	par r r_w_$g anlauf CC_FRAMES=1500 CC_RANG=$g
	par r r_e_$g anlauf_c CC_FRAMES=1500 CC_RANG=$g
done
# C: Gruppen (Eingaben wie hurt, hurt_b, hurt_c, laenger und mit LP-Auffuellen)
par h c_hurt ingame CC_BASIS=hurt.lua CC_FRAMES=4000
par h c_hurt_b ingame CC_BASIS=hurt_b.lua CC_FRAMES=4000
par h c_hurt_c ingame CC_BASIS=hurt_c.lua CC_FRAMES=4000
# D: ohne Kampf, Figur haelt rechts (Runner statt Bot); EINGRIFF in d_entf*:
# Gegnerslots in Frame 150 per S+4 := 0 entfernt (ohne Tod), bevor sie aufwachen
par r d_rechts stage1 CC_FRAMES=3000 CC_IN="2-3000:p1_right"
par r d_entf18 stage1 CC_FRAMES=3000 CC_IN="2-3000:p1_right" CC_ENTF=18
par r d_entf1817 stage1 CC_FRAMES=3000 CC_IN="2-3000:p1_right" CC_ENTF=18,17
par r d_entf3 stage1 CC_FRAMES=3000 CC_IN="2-3000:p1_right" CC_ENTF=18,17,16
# D (und C): Stage 1 mit dem Bot ab stage1
par b bot_kampf CC_FRAMES=7000
par b bot_schnell CC_FRAMES=7000 CC_CLEAR=1
par b bot_ohne CC_FRAMES=8000 CC_ANGRIFF=0 CC_CLEAR=0
par b bot_entfernt CC_FRAMES=8000 CC_ANGRIFF=0 CC_CLEAR=0 CC_KILL=1

# --- Dritte Messung M2 (Präfix verhalten_m3): andere Savestates (held0 Mack,
# held2 Ginzu, held3 Baby Head, stage1), Startframes und Positionen als in den
# ersten Läufen und bei V2. EINGRIFFE: LP der Figur aufgefüllt (alle);
# m3_schwelle_*: Gegner-x := Kamera + k in 1-px-Stufen (CC_KSTUFEN);
# m3_d_*: Gegner entfernt (CC_ENTF, CC_ENTF2); m3_bot_*: nur LP der Figur.
bh() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="verhalten_$name" GFA_CFG=$bc scripts/grafik/bot.sh "$state"; }
# A1 Schwellen (EINGRIFF): Stufen zu 3 bzw. 4, beim Weckreiz 6 bzw. 8 Frames
par r m3_schwelle_s1 stage1 CC_FRAMES=420 CC_KSTUFEN="17:452:440:3:5,18:388:378:6:50,17:388:378:6:120,16:452:440:3:190,16:388:378:6:235,18:-58:-70:3:330,18:-69:-58:3:369"
par r m3_schwelle_h3 held3 CC_FRAMES=380 CC_KSTUFEN="16:440:452:4:5,16:384:380:8:60,17:384:380:8:105,18:384:380:8:150,17:-58:-70:4:260,18:-70:-58:4:320"
# A1 natürlich: Figur geht schräg rechts-runter (Kamera 1,25 px/F), Mack
par r m3_natur_h0 held0 CC_FRAMES=1500 CC_IN="61-560:p1_right+p1_down"
# A2/A4: Figur passiv, andere Ausgangslagen
par r m3_p_h0 held0 CC_FRAMES=5000 CC_IN="61-200:p1_right"
par r m3_p_h3 held3 CC_FRAMES=5000 CC_IN="61-330:p1_right"
par r m3_w_lang anlauf_b CC_FRAMES=5000 CC_IN="2-11:p1_up"
par r m3_e_lang anlauf_c CC_FRAMES=6000 CC_IN="2-60:p1_left"
par r m3_e_lang2 anlauf_c CC_FRAMES=6000 CC_IN="2-15:p1_down"
# C: Gruppen
par r m3_c_h0 held0 CC_FRAMES=6000 CC_IN="61-520:p1_right"
par r m3_c_s1 stage1 CC_FRAMES=6000 CC_IN="2-300:p1_right;301-330:p1_down;331-480:p1_right"
# B1: Flucht nach links in verschiedenen Phasen (WOOKY anlauf_b: Halt 40, Angriff
# 61, Treffer 70, Erholung 87-101, Figur frei ab 97; EDDY kontakt_b: Halt 14,
# Angriff 35, Treffer 44, Erholung 61-89, Figur frei ab 71)
for t in 44 52 58 64 97 100 106 114; do
	par r m3_b1_w_t$t anlauf_b CC_FRAMES=800 CC_MUSTER=weg_l CC_AB=$t CC_DAUER=200
done
for t in 16 22 28 37 71 76 84 95 103; do
	par r m3_b1_e_t$t kontakt_b CC_FRAMES=800 CC_MUSTER=weg_l CC_AB=$t CC_DAUER=200
done
# B2: ein Tiefenschritt von 20 px in Kampfhaltung, Ausholen und Erholung
for t in 44 52 59 61 63 66 97 98; do
	par r m3_b2_w_t$t anlauf_b CC_FRAMES=500 CC_IN="$t-$((t + 19)):p1_down"
done
for t in 20 25 28 31 33 71 75; do
	par r m3_b2_e_t$t kontakt_b CC_FRAMES=500 CC_IN="$t-$((t + 19)):p1_down"
done
for t in 50 53 55 95 98; do
	par r m3_b2_e2_t$t anlauf_c CC_FRAMES=500 CC_IN="$t-$((t + 19)):p1_up"
done
# B3: EDDY, Figur springt im Takt
par r m3_b3_e1 kontakt_b CC_FRAMES=2000 CC_MUSTER=sprung CC_AB=15 CC_TAKT=75
par r m3_b3_e2 tiefe_b CC_FRAMES=2000 CC_MUSTER=sprung CC_AB=50 CC_TAKT=40
par r m3_b3_e3 anlauf_c CC_FRAMES=2000 CC_MUSTER=sprung CC_AB=10 CC_TAKT=100
# D: Mech-WOOKY und Lebende (wie d_entf3, in Frame 1150 weitere Gegner entfernt:
# Slot 11/12 Gully-EDDY, 13/14 Gully-WOOKY, 15 SKIP)
for v in m5: m4:12 m3:11,12 m0:11,12,13,14,15; do
	nm=${v%%:*}; sl=${v#*:}
	par r m3_d_$nm stage1 CC_FRAMES=4500 CC_IN="2-4500:p1_right" CC_ENTF=18,17,16 ${sl:+CC_ENTF2=$sl CC_ENTF2_AB=1150}
done
# D: Bot mit Angriff, ohne Eingriff an Gegnern (Ginzu, Baby Head)
par bh m3_bot_h2 held2 CC_FRAMES=10000 CC_CLEAR=0
par bh m3_bot_h3 held3 CC_FRAMES=10000 CC_CLEAR=0

# --- Gegenprüfung V2 (Präfix verhalten_v): eigene Läufe mit anderen Startframes,
# Savestates, Positionen und Reihenfolgen; Szenarien scenarios/verhalten_v_frei.lua
# (Runner) und scenarios/verhalten_v_bot.lua (Bot); Auswertung mit
# messen_verhalten_v.py nach logs/verhalten_v.csv. EINGRIFFE (Kopf der Szenarien):
#   - CC_LP=1: LP der Figur := 72, wenn 0 < LP < 72 (fast alle Läufe, nicht e_wooky, e_eddy)
#   - v_sicht*, v_weck*: Gegner-x relativ zur Kamera gesetzt (CC_KAM)
#   - v_b1r_kontakt_e, v_b1r_kontaktb_e: Gegner einmal links der Figur gesetzt (CC_SETZ)
#   - v_r_*: Rang festgehalten; v_d_e*: Gegner per S+4 := 0 entfernt (CC_ENTF)
#   - v_d_bot_*: LP der Figur aufgefüllt (bot.lua), sonst kein Bot-Eingriff
vf=scripts/scenarios/verhalten_v_frei.lua
vb=scripts/scenarios/verhalten_v_bot.lua
v() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="verhalten_v_$name" scripts/run.sh $vf "$state"; }
vbot() { local name=$1 state=$2; shift 2; q env "$@" CC_NAME="verhalten_v_$name" GFA_CFG=$vb scripts/grafik/bot.sh "$state"; }
# A1 Sichtbarkeit (EINGRIFF): Gegner-x = Kamera + k in 1-px-Stufen zu je 4 Frames
kam=""; f=2
for k in $(seq 452 -1 440) $(seq 441 452); do kam="$kam,17:$k:$f:$((f + 3))"; f=$((f + 4)); done
for k in $(seq -74 -58) $(seq -59 -74); do kam="$kam,16:$k:$f:$((f + 3))"; f=$((f + 4)); done
par v sicht ingame CC_FRAMES=$((f + 5)) CC_KAM="${kam#,}"
for g in 18:kontakt 17:kontakt_b; do
	kam=""; f=2; sl=${g%%:*}
	for k in $(seq 440 452) $(seq 451 -1 440); do kam="$kam,$sl:$k:$f:$((f + 3))"; f=$((f + 4)); done
	for k in $(seq -58 -1 -72) $(seq -71 -58); do kam="$kam,$sl:$k:$f:$((f + 3))"; f=$((f + 4)); done
	par v sicht_s$sl ${g#*:} CC_FRAMES=$((f + 5)) CC_KAM="${kam#,}"
done
# A1 Weckreiz (EINGRIFF): Gegner bei stehender Kamera auf x - Kamera = 383 bzw. 384,
# Figur am linken Rand (weck) bzw. 105 px weiter rechts (weckr)
for s in 16 17 18; do for k in 383 384; do
	par v weck_s${s}_k$k ingame CC_FRAMES=150 CC_KAM="$s:$k:40:41"
	par v weckr_s${s}_k$k ingame CC_FRAMES=170 CC_IN="r:2-61" CC_KAM="$s:$k:80:81"
done; done
# A: Figur passiv (p_* mehrere Gegner, e_* ein Gegner; e_wooky/e_eddy ohne LP-Auffüllen)
par v p_stage1 stage1 CC_FRAMES=6000 CC_LP=1 CC_IN="r:150-300"
par v p_held2 held2 CC_FRAMES=6000 CC_LP=1 CC_IN="r+d:61-200;r:201-330"
par v p_eddy kontakt_b CC_FRAMES=5000 CC_LP=1
par v p_natur anlauf_b CC_FRAMES=3000
par v p_tiefe tiefe_b CC_FRAMES=4000 CC_LP=1 CC_IN="u:30-45"
par v e_wooky_lp kontakt CC_FRAMES=5000 CC_LP=1
par v e_wooky kontakt CC_FRAMES=4000 CC_IN="d:20-27"
par v e_eddy_lp anlauf_c CC_FRAMES=5000 CC_LP=1
par v e_eddy anlauf_c CC_FRAMES=4000 CC_IN="u:5-9"
# A3 Rang (EINGRIFF)
par v r_kontakt_r7 kontakt CC_FRAMES=2500 CC_LP=1 CC_RANG=7
par v r_tiefeb_r9 tiefe_b CC_FRAMES=2500 CC_LP=1 CC_RANG=9
par v r_anlaufb_r20 anlauf_b CC_FRAMES=2500 CC_LP=1 CC_RANG=20
par v r_anlaufc_r23 anlauf_c CC_FRAMES=2500 CC_LP=1 CC_RANG=23
# B1 Weglaufen nach links (Auslöser: Gegner steht rechts nah; k = Frames Stillstand,
# n = 0-80 F nach seinen letzten aktiven Angriffsframes und Figur frei)
par v b1l_anlauf_k3 anlauf CC_FRAMES=1200 CC_LP=1 CC_REAKT="3:l:0-109" CC_REAKT_SEITE=r
par v b1l_anlaufb_k3 anlauf_b CC_FRAMES=1200 CC_LP=1 CC_REAKT="3:l:0-99" CC_REAKT_SEITE=r
par v b1l_anlaufb_n anlauf_b CC_FRAMES=1200 CC_LP=1 CC_REAKT="0:l:0-89" CC_REAKT_SEITE=r CC_REAKT_NACH=0-80
par v b1l_kontakt_k8 kontakt CC_FRAMES=1200 CC_LP=1 CC_REAKT="8:l:0-109" CC_REAKT_SEITE=r CC_REAKT_AB=120
par v b1l_kontakt_n kontakt CC_FRAMES=1200 CC_LP=1 CC_REAKT="0:l:0-99" CC_REAKT_SEITE=r CC_REAKT_NACH=0-80
par v b1l_anlaufc_k3 anlauf_c CC_FRAMES=1200 CC_LP=1 CC_REAKT="3:l:0-109" CC_REAKT_SEITE=r
par v b1l_anlaufc_n anlauf_c CC_FRAMES=1200 CC_LP=1 CC_REAKT="0:l:0-99" CC_REAKT_SEITE=r CC_REAKT_NACH=0-80
par v b1l_anlaufc_n40 anlauf_c CC_FRAMES=1200 CC_LP=1 CC_REAKT="0:l:0-109" CC_REAKT_SEITE=r CC_REAKT_NACH=40-80
par v b1l_kontaktb_k3 kontakt_b CC_FRAMES=1200 CC_LP=1 CC_REAKT="3:l:0-99" CC_REAKT_SEITE=r
par v b1l_kontaktb_n kontakt_b CC_FRAMES=1200 CC_LP=1 CC_REAKT="0:l:0-89" CC_REAKT_SEITE=r CC_REAKT_NACH=0-80
par v b1l_tiefeb_k3 tiefe_b CC_FRAMES=1200 CC_LP=1 CC_REAKT="3:l:0-99" CC_REAKT_SEITE=r
par v b1l_tiefeb_n tiefe_b CC_FRAMES=1200 CC_LP=1 CC_REAKT="0:l:0-99" CC_REAKT_SEITE=r CC_REAKT_NACH=0-80
par v b1l_held2_n held2 CC_FRAMES=2500 CC_LP=1 CC_IN="r+d:61-200;r:201-330" CC_REAKT="0:l:0-99" CC_REAKT_SEITE=r CC_REAKT_NACH=0-80
# B1 Weglaufen nach rechts (Gegner links: natürlich in stage1, EINGRIFF in *_e)
par v b1r_stage1_k3 stage1 CC_FRAMES=1800 CC_LP=1 CC_IN="r:150-300" CC_REAKT="3:r:0-99" CC_REAKT_SEITE=l
par v b1r_stage1_n stage1 CC_FRAMES=1800 CC_LP=1 CC_IN="r:150-300" CC_REAKT="0:r:0-99" CC_REAKT_SEITE=l CC_REAKT_NACH=0-80
par v b1r_kontakt_e kontakt CC_FRAMES=1500 CC_LP=1 CC_SETZ="18:-70:-:2:3" CC_REAKT="3:r:0-99" CC_REAKT_SEITE=l CC_REAKT_AB=10
par v b1r_kontaktb_e kontakt_b CC_FRAMES=1500 CC_LP=1 CC_SETZ="17:-80:-:2:3" CC_REAKT="0:r:0-89" CC_REAKT_SEITE=l CC_REAKT_NACH=0-80 CC_REAKT_AB=10
# B2 Tiefenschritt (Auslöser wie B1; *_aus*/_erh*: nur in Ausholen bzw. Erholung)
par v b2_anlauf_d5_k3 anlauf CC_FRAMES=1000 CC_LP=1 CC_REAKT="3:d:0-4"
par v b2_anlaufb_u26_k5 anlauf_b CC_FRAMES=1000 CC_LP=1 CC_REAKT="5:u:0-25"
par v b2_anlaufc_d14_n anlauf_c CC_FRAMES=1000 CC_LP=1 CC_REAKT="0:d:0-13" CC_REAKT_NACH=10-80
par v b2_kontakt_d6_n kontakt CC_FRAMES=1000 CC_LP=1 CC_REAKT="0:d:0-5" CC_REAKT_NACH=10-80
par v b2_kontaktb_u18_k3 kontakt_b CC_FRAMES=1000 CC_LP=1 CC_REAKT="3:u:0-17"
par v b2_tiefeb_d20_k4 tiefe_b CC_FRAMES=1000 CC_LP=1 CC_REAKT="4:d:0-19"
par v b2_stage1_u18_n stage1 CC_FRAMES=3000 CC_LP=1 CC_IN="r:150-300" CC_REAKT="0:u:0-17" CC_REAKT_NACH=10-80 CC_REAKT_AB=1500
par v b2_held2_d16_k5 held2 CC_FRAMES=3000 CC_LP=1 CC_IN="r+d:61-200;r:201-330" CC_REAKT="5:d:0-15" CC_REAKT_AB=2000
par v b2_aus_kontakt_d8 kontakt CC_FRAMES=1000 CC_LP=1 CC_REAKT="0:d:0-7" CC_REAKT_ANIM=5FA54,5FC18,5FD24 CC_REAKT_AB=60
par v b2_aus_tiefeb_d9 tiefe_b CC_FRAMES=1000 CC_LP=1 CC_REAKT="0:d:0-8" CC_REAKT_ANIM=643F8,645BC,64688
par v b2_aus2_kontakt_d8 kontakt CC_FRAMES=900 CC_LP=1 CC_REAKT="0:d:0-7" CC_REAKT_ANIM=5FA8C,5FB88,5FCB8,5FD5C
par v b2_aus2_tiefeb_d9 tiefe_b CC_FRAMES=900 CC_LP=1 CC_REAKT="0:d:0-8" CC_REAKT_ANIM=64430,6452C,645F4,646C0
par v b2_erh_anlaufb_d6 anlauf_b CC_FRAMES=900 CC_LP=1 CC_REAKT="0:d:0-5" CC_REAKT_ANIM=5FB18,5FAEC
par v b2_erh_eddy_u16 anlauf_c CC_FRAMES=900 CC_LP=1 CC_REAKT="0:u:0-15" CC_REAKT_ANIM=644BC,64490,64654
# B3 Springen (nach Auslöser 5 bzw. 6 Sprünge; *_dauer: Sprünge im festen Takt)
par v b3_kontakt_spr kontakt CC_FRAMES=1500 CC_LP=1 CC_REAKT="5:j:0-1;j:55-56;j:110-111;j:165-166;j:220-221" CC_REAKT_N=2 CC_REAKT_PAUSE=600
par v b3_anlaufc_spr anlauf_c CC_FRAMES=1500 CC_LP=1 CC_REAKT="5:j:0-1;j:70-71;j:140-141;j:210-211;j:280-281;j:350-351" CC_REAKT_N=2 CC_REAKT_PAUSE=700
jin() { local s="" f; for f in $(seq $1 $2 $3); do s="$s;j:$f-$((f + 1))"; done; echo "${s#;}"; }
par v b3_anlaufb_dauer anlauf_b CC_FRAMES=2000 CC_LP=1 CC_IN="$(jin 40 60 1960)"
par v b3_kontaktb_dauer kontakt_b CC_FRAMES=2000 CC_LP=1 CC_IN="$(jin 30 50 1980)"
par v b3_tiefeb_dauer tiefe_b CC_FRAMES=2500 CC_LP=1 CC_IN="$(jin 35 65 2480)"
par v b3_anlaufc_dauer anlauf_c CC_FRAMES=2500 CC_LP=1 CC_IN="$(jin 50 55 2480)"
# C Gruppen (dazu p_stage1, p_held2)
par v c_gully stage1 CC_FRAMES=6000 CC_LP=1 CC_IN="r:2-480"
par v c_tief held3 CC_FRAMES=6000 CC_LP=1 CC_IN="r+u:61-100;r:101-420"
# D Stage 1: rechts mit Vorwärtssprüngen alle 70 F; EINGRIFF Gegner entfernt
jr=""; for f in $(seq 100 70 9000); do jr="$jr;r+j:$f-$((f + 1))"; done
par v d_sprung stage1 CC_FRAMES=9000 CC_LP=1 CC_IN="r:2-9000$jr"
par v d_e16 stage1 CC_FRAMES=7000 CC_LP=1 CC_IN="r:2-7000$jr" CC_ENTF="16:330"
par v d_e16_17 stage1 CC_FRAMES=7000 CC_LP=1 CC_IN="r:2-7000$jr" CC_ENTF="16:330,17:330"
par v d_e_alle stage1 CC_FRAMES=7000 CC_LP=1 CC_IN="r:2-7000$jr" CC_ENTF="16:330,17:330,18:330"
par v d_e_mech3 stage1 CC_FRAMES=3000 CC_LP=1 CC_IN="r:2-3000$jr" CC_ENTF="16:330,17:330,18:330,13:620"
par v d_e_mech4 stage1 CC_FRAMES=3000 CC_LP=1 CC_IN="r:2-3000$jr" CC_ENTF="16:330,17:330,18:330,13:620,14:620"
par v d_e_mech2 stage1 CC_FRAMES=3000 CC_LP=1 CC_IN="r:2-3000$jr" CC_ENTF="16:330,17:330,18:330,13:620,14:620,11:620,12:620"
# D Stage 1 mit dem Bot (greift an, kein Gegner-Eingriff), ab held0 (Mack) und stage1
par vbot d_bot_mack held0
par vbot d_bot_s1 stage1
wait
[ ! -e logs/raw/verhalten_FEHLER ] || { echo "Abbruch: ein Lauf ist fehlgeschlagen" >&2; exit 1; }
df -h . | tail -n 1

m() { python3 scripts/messen_verhalten.py "$@"; }
pre() {
	local f
	for f in logs/raw/verhalten_$1*_ram.bin logs/raw/verhalten_$1*_bot.csv; do
		[ -e "$f" ] || continue
		f=${f%_ram.bin}
		echo "${f%_bot.csv}"
	done | sort
}
A=$(pre a_); AKT=$(pre akt_); R=$(pre r_); C=$(pre c_); BOT=$(pre bot_); D=$(pre d_)
BW=$(pre b_weg); BT=$(pre b_tiefe); BS=$(pre b_sprung)
{
	echo "# Verhalten von WOOKY und EDDY (Stage 1), erzeugt von scripts/belege_verhalten.sh."
	echo "# Laeufe: a_* Figur passiv, ein Gegner (w WOOKY, e EDDY); akt_* Aktivierung; b_weg*,"
	echo "# b_tiefe*, b_sprung* Reaktion auf die Figur; r_* Rang festgehalten; c_* Gruppen (Eingaben"
	echo "# wie hurt, hurt_b, hurt_c); d_* Stage 1, Figur haelt rechts; bot_* Stage 1 mit Bot (kampf:"
	echo "# Angriffe, schnell: LP der Gegner := 1 bei Kamerastillstand, ohne: kein Angriff, entfernt:"
	echo "# kein Angriff, Gegner bei Kamerastillstand per S+4 := 0 entfernt)."
	echo "# EINGRIFF in allen Laeufen: LP der Figur := 72, wenn 0 < LP < 72. Weitere Eingriffe:"
	echo "# akt_eingriff_* (Gegner versetzt), b_weg_r* (Gegner 60 px links), r_* (Rang), d_entf*"
	echo "# (Gegner entfernt), bot_*. dx = x(Gegner) - x(Figur), dz = Tiefe(Gegner) - Tiefe(Figur)."
	echo "# Zusammenfassung Figur passiv (a_*, akt_*, r_*, c_*)"
	m zusammenfassung $A $AKT $R $C
	echo "# Zusammenfassung Reaktion (b_*)"
	m zusammenfassung $BW $BT $BS
	echo "# Zusammenfassung Stage 1 (d_*, bot_*)"
	m zusammenfassung $D $BOT
	echo "# messen_verhalten.py uebergaenge (a_*, r_*: ein Gegner, Figur passiv)"
	m uebergaenge --min 2 $A $R
	echo "# messen_verhalten.py uebergaenge (c_*: Gruppen)"
	m uebergaenge --min 2 $C
	echo "# messen_verhalten.py dauern (a_*, r_*, c_*)"
	m dauern $A $R $C
	echo "# messen_verhalten.py aktivitaet"
	m aktivitaet $A $R $C $BW $BT $BS
	echo "# messen_verhalten.py weglauf (b_weg*, akt_* mit langem Rechtslauf)"
	m weglauf $BW $AKT
	echo "# messen_verhalten.py tiefe (b_tiefe*)"
	m tiefe $BT
	echo "# messen_verhalten.py sprung (b_sprung*)"
	m sprung $BS
	echo "# messen_verhalten.py schutz (a_*, r_*, c_*, b_*)"
	m schutz $A $R $C $BW $BT $BS
	echo "# messen_verhalten.py gruppe (c_* ab Frame 1000; d_rechts, bot_ohne ab Frame 1)"
	m gruppe --ab 1000 $C
	m gruppe logs/raw/verhalten_d_rechts logs/raw/verhalten_bot_ohne
	echo "# messen_verhalten.py wellen (d_*, bot_*)"
	m wellen $D $BOT
	echo "# messen_verhalten.py aktivierung (ohne Zeilen 'belegt')"
	m aktivierung $AKT $A $D $BOT | grep -v ',belegt'
	echo "# messen_verhalten.py annaeherung"
	m annaeherung $A $AKT $R $C $BT
	echo "# messen_verhalten.py angriffe"
	m angriffe $A $AKT $R $C $BW $BT $BS $D $BOT
	echo "# messen_verhalten.py vergleich (EINGRIFF LP auffuellen gegen ohne Auffuellen)"
	m vergleich logs/raw/verhalten_a_w1 logs/raw/verhalten_lp0_w1
	m vergleich logs/raw/verhalten_a_e1 logs/raw/verhalten_lp0_e1 | tail -n 1
	echo "# messen_verhalten.py katalog"
	m katalog $A $AKT $R $C $BW $BT $BS $D $BOT
	echo "# messen_verhalten.py zeitachse (a_w1, a_e1)"
	m zeitachse logs/raw/verhalten_a_w1 logs/raw/verhalten_a_e1
} > $out

# --- Auswertung der dritten Messung M2 (an logs/verhalten.csv angehängt)
M3P=$(pre m3_p_); M3E="$(pre m3_e_) $(pre m3_w_)"; M3C=$(pre m3_c_); M3D=$(pre m3_d_); M3BOT=$(pre m3_bot_)
{
	echo "# Dritte Messung M2 (Läufe verhalten_m3_*): andere Savestates, Startframes, Positionen"
	echo "# messen_verhalten.py schwelle (m3_schwelle_*: EINGRIFF Gegner-x = Kamera + k)"
	m schwelle $(pre m3_schwelle)
	echo "# messen_verhalten.py aktivierung (m3_natur_h0, m3_p_*, m3_c_*; ohne 'belegt')"
	m aktivierung $(pre m3_natur) $M3P $M3C | grep -v ',belegt'
	echo "# Zusammenfassung dritte Messung, Figur passiv (m3_p_*, m3_e_*, m3_w_*, m3_c_*)"
	m zusammenfassung $M3P $M3E $M3C
	echo "# messen_verhalten.py annaeherung (m3_p_*, m3_e_*, m3_w_*)"
	m annaeherung $M3P $M3E
	echo "# messen_verhalten.py aktivitaet (m3_e_*, m3_w_*, m3_p_*, m3_b3_*)"
	m aktivitaet $M3E $M3P $(pre m3_b3)
	echo "# messen_verhalten.py weglauf (m3_b1_*)"
	m weglauf $(pre m3_b1)
	echo "# messen_verhalten.py tiefe (m3_b2_*)"
	m tiefe $(pre m3_b2)
	echo "# messen_verhalten.py sprung (m3_b3_*)"
	m sprung $(pre m3_b3)
	echo "# messen_verhalten.py gruppe (m3_c_*, m3_p_h3 ab Frame 1000)"
	m gruppe --ab 1000 $M3C logs/raw/verhalten_m3_p_h3
	echo "# messen_verhalten.py wellen (m3_d_*, m3_bot_*)"
	m wellen $M3D $M3BOT
} >> $out

# --- Auswertung der Gegenprüfung V2 nach logs/verhalten_v.csv
mv2() { python3 scripts/messen_verhalten_v.py "$@"; }
vp() {
	local f
	for f in logs/raw/verhalten_v_$1*_ram.bin; do
		[ -e "$f" ] && echo "${f%_ram.bin}"
	done | sort
}
VSICHT=$(vp sicht); VWECK=$(vp weck); VP=$(vp p_); VE=$(vp e_); VR=$(vp r_)
VB1=$(vp b1); VB2=$(vp b2_); VB3=$(vp b3_); VC=$(vp c_); VD=$(vp d_)
VBOT="logs/raw/verhalten_v_d_bot_mack_bot logs/raw/verhalten_v_d_bot_s1_bot"
{
	echo "# Gegenprüfung V2 zu „Verhalten von WOOKY und EDDY“, erzeugt von scripts/belege_verhalten.sh"
	echo "# (Läufe verhalten_v_*, Szenarien verhalten_v_frei.lua und verhalten_v_bot.lua, Auswertung"
	echo "# messen_verhalten_v.py). Eingriffe siehe Kopf der Szenarien und Kommentar im Skript."
	echo "# dx = x(Gegner) - x(Figur), dz = Tiefe(Gegner) - Tiefe(Figur), Frames lokal je Lauf."
	echo "# zusammenfassung (A1-A4): sicht*, weck*, p_*, e_*, r_*"
	mv2 zusammenfassung $VSICHT $VWECK $VP $VE $VR
	echo "# sichtbar (EINGRIFF sicht*, natürlich p_*, d_sprung, Bot)"
	mv2 sichtbar $VSICHT $VP logs/raw/verhalten_v_d_sprung $VBOT
	echo "# wecken (EINGRIFF weck*, natürlich p_*, d_sprung)"
	mv2 wecken $VWECK $VP logs/raw/verhalten_v_d_sprung
	echo "# gehen (p_*, e_*, r_*)"
	mv2 gehen $VP $VE $VR
	echo "# angriffe (e_*: ein Gegner, Figur passiv; Raten auch in 3000-F-Fenstern)"
	mv2 angriffe --fenster 3000 $VE
	echo "# angriffe, nur Raten (p_*: mehrere Gegner; b3_*dauer: Figur springt im Takt)"
	mv2 angriffe $VP $(vp b3_) | sed -n '/^lauf,slot,typ,von/,$p'
	echo "# reakt (b1l_*: Figur läuft nach links weg, b1r_*: nach rechts)"
	mv2 reakt $VB1
	echo "# tiefe (b2_*)"
	mv2 tiefe $VB2
	echo "# sprung (b3_*)"
	mv2 sprung $VB3
	echo "# schutz (p_*, e_*)"
	mv2 schutz $VP $VE
	echo "# gruppe (p_stage1, p_held2, c_* ab Frame 1000)"
	mv2 gruppe --ab 1000 logs/raw/verhalten_v_p_stage1 logs/raw/verhalten_v_p_held2 $VC
	echo "# wellen (d_*, Bot)"
	mv2 wellen $VD $VBOT
	echo "# kamera (Halte ab 200 F; d_*, Bot)"
	mv2 kamera --min 200 $VD $VBOT
} > logs/verhalten_v.csv
wc -l logs/verhalten_v.csv
[ "${CC_BEHALTEN:-0}" = 1 ] || rm -f logs/raw/verhalten_*
wc -l $out
