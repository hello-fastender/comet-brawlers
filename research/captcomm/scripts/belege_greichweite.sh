#!/usr/bin/env bash
# Reichweite der Gegnerangriffe (Praefix greichweite): Startup, aktive Frames,
# Reichweite x (beide Blickrichtungen), Tiefe, Hoehe, Umwerfen, Nachlauf und
# Schaden der Angriffe von WOOKY, EDDY und SKIP (Messerstich, Ausfallstich;
# Stage 1) gegen die passive Figur.
# Alle Laeufe mit scenarios/rang.lua um scenarios/greichweite_angriff.lua:
#   EINGRIFF Rang FFF82A ab Frame 2 auf 12 (CC_RANG), EINGRIFF LP der Figur
#   vor jedem Frame auf 72 (CC_LP=1), dazu je Probe die Eingriffe unten.
# Auswertung mit messen_greichweite.py gegnerangriff und
# gegnerzusammenfassung nach logs/greichweite.csv; loescht danach die
# eigenen Rohabzuege. Voraussetzung: Savestates kontakt, kontakt_b, ingame
# (scripts/laeufe_a5.sh), fuer die dritte Messung zusaetzlich anlauf,
# anlauf_b, anlauf_c, tiefe_b. Dauer: ~20 min bei 4 Kernen (PAR parallele
# Laeufe, Standard 8; etwa 570 Laeufe, Platzbedarf zwischendurch bis ~1,5 GB).
# Teil V am Ende: Gegenpruefung V3 (Praefix greichweite_v) nach
# logs/greichweite_v.csv, weitere ~7 min, zwischendurch bis ~1 GB.
set -euo pipefail
cd "$(dirname "$0")/.."
out=logs/greichweite.csv
tmp=logs/raw/greichweite_tmp
mkdir -p logs/raw "$tmp"
rm -f logs/raw/greichweite_*_ram.bin "$tmp"/*
jobs="$tmp/jobs.txt"
: > "$jobs"
PAR=${PAR:-8}

# job NAME SAVESTATE VAR=WERT... : ein Lauf (Name greichweite_NAME)
job() {
	local n=$1 st=$2; shift 2
	echo "env CC_BASIS=greichweite_angriff.lua CC_RANG=12 CC_LP=1 $* CC_NAME=greichweite_$n scripts/run.sh scripts/scenarios/rang.lua $st" >> "$jobs"
}
v() { echo "${1/-/m}"; }  # Wert im Laufnamen: m fuer minus

# Quellen: je Angriffsart und Blickrichtung ein natuerlich auftretender
# Angriff. CC_AB = k-ter Wechsel auf die erste Animation des Angriffs, A =
# kalibrierter Frame dieses Wechsels (nur fuer Laufzeit und Abzugsfenster),
# s = Startup (erster aktiver Frame A+s), e = letzter aktiver Frame (A+e) ohne
# Treffer. CC_VOR: EINGRIFF vor dem Angriff (Figur relativ zum Gegner gesetzt,
# damit er sich umdreht bzw. in Bildmitte bleibt), danach natuerlich.
# quelle Q STATE SLOT AB A s e "NEAR FAR" "ZWERTE" XNAT [VOR-Variablen...]
#   NEAR/FAR: x-Grenzen aus der Erkundung (Probe bei Grenze-1 bzw. Grenze+1
#   und an der Grenze, bei dz 0 und dz 5); ZWERTE: Tiefenproben; XNAT: dx
#   der Figur fuer Tiefen- und Hoehenproben (natuerlicher Abstand).
quelle() {
	local Q=$1 st=$2 slot=$3 ab=$4 A=$5 s=$6 e=$7 xg=$8 zw=$9 xnat=${10}; shift 10
	local vor="$*" sg=1 near far
	read -r near far <<< "$xg"
	[ "${xnat:0:1}" = "-" ] && sg=-1
	local base="CC_SLOT=$slot CC_AB=$ab CC_FRAMES=$((A + e + 60)) CC_DUMP_AB=$((A - 5)) $vor"
	job "${Q}_nat" "$st" "$base"
	job "${Q}_whiff" "$st" "$base CC_VON=$s CC_BIS=$((e + 1)) CC_H=60"
	# aktive Frames: Figur bis A+k 60 px hoch (kein Treffer, kein Abbruch)
	for k in $((s - 1)) $s $((e - 1)) $e; do
		job "${Q}_f$k" "$st" "$base CC_VON=$s CC_BIS=$((e + 1)) CC_FERN=$k CC_FERN_H=60"
	done
	# x: Figur ab A+s bei dx (Tiefe gleich bzw. 5 px versetzt)
	for d in $((near - 1)) $near $far $((far + 1)); do
		job "${Q}_x$(v $((sg * d)))" "$st" "$base CC_VON=$s CC_DX=$((sg * d)) CC_DZ=0"
		job "${Q}d5_x$(v $((sg * d)))" "$st" "$base CC_VON=$s CC_DX=$((sg * d)) CC_DZ=5"
	done
	# Tiefe: beim natuerlichen Abstand und bei 30 px
	for z in $zw; do
		job "${Q}_z$(v $z)" "$st" "$base CC_VON=$s CC_DX=$xnat CC_DZ=$z"
		job "${Q}x30_z$(v $z)" "$st" "$base CC_VON=$s CC_DX=$((sg * 30)) CC_DZ=$z"
	done
	# Hoehe (Figur steht, Hoehe gesetzt)
	for h in 48 49; do job "${Q}_h$h" "$st" "$base CC_VON=$s CC_H=$h"; done
}

ZP="-11 -10 11 12"
# WOOKY (Slot 18 in kontakt; Slot 16 = WOOKY in kontakt_b)
quelle WS1L kontakt 18 1:5fa54 19 9 13 "15 78" "$ZP" 46
quelle WS1R kontakt 18 1:5fa54 20 9 13 "14 77" "$ZP" -46 CC_VOR=2-3 CC_VOR_DX=-46
quelle WK1L kontakt 18 1:5fb50 137 9 13 "15 78" "$ZP" 46
quelle WK1R kontakt 18 1:5fb50 136 9 13 "14 77" "$ZP" -46 CC_VOR=2-3 CC_VOR_DX=-46
quelle WS2L kontakt_b 16 1:5fc18 203 4 13 "17 80" "$ZP" 55 CC_VOR=2-202 CC_VOR_DX=46 CC_VOR_DZ=0 CC_VOR_SLOT=17
quelle WS2Lb kontakt_b 16 1:5fc18 129 4 13 "15 78" "$ZP" 46 CC_VOR=2-3 CC_VOR_DX=-46 CC_VOR_SLOT=17
quelle WS2R kontakt 18 1:5fc18 386 4 13 "15 78" "$ZP" -47 CC_VOR=2-3 CC_VOR_DX=-46
quelle WK2L kontakt 18 1:5fc8c 534 8 17 "15 78" "$ZP" 46 CC_VOR=2-533 CC_VOR_DX=46 CC_VOR_DZ=0
quelle WK2R kontakt 18 1:5fc8c 553 8 17 "15 78" "$ZP" -47 CC_VOR=2-3 CC_VOR_DX=-46
quelle WS3L kontakt_b 16 1:5fd24 151 10 17 "17 80" "$ZP" 55
# WS3R: zweiter WOOKY steht nahe bei der Figur (Abbruch dort frueher), siehe Entwurf
quelle WS3R kontakt 16 1:5fd24 711 10 17 "-3 43" "$ZP" -12 CC_VOR=2-3 CC_VOR_DX=-46 CC_VOR_SLOT=18
# EDDY (Slot 17 in kontakt_b)
quelle ES1L kontakt_b 17 1:643f8 31 9 13 "15 78" "$ZP" 46
quelle ES1R kontakt_b 17 1:643f8 22 9 13 "14 77" "$ZP" -46 CC_VOR=2-3 CC_VOR_DX=-46
quelle ES2L kontakt_b 17 1:645bc 95 10 17 "15 78" "$ZP" 46 CC_VOR=2-94 CC_VOR_DX=46 CC_VOR_DZ=0
quelle ES2R kontakt_b 17 1:645bc 161 10 17 "14 77" "$ZP" -46 CC_VOR=2-3 CC_VOR_DX=-46
quelle EK2L kontakt_b 17 1:644f4 289 9 13 "15 78" "$ZP" 46
quelle EK2R kontakt_b 17 1:644f4 360 9 13 "16 79" "$ZP" -56 CC_VOR=2-3 CC_VOR_DX=-60 CC_VOR_DZ=0

# Abbruch: Figur schon ab A+1 auf dx 200 (Abbruch in A+1) bzw. in A+9 60 px
# hoch und ab A+10 bei dx 90 (Abbruch in A+10)
wa="CC_SLOT=18 CC_AB=1:5fa54 CC_FRAMES=80 CC_DUMP_AB=14"
job WS1La1_x200 kontakt "$wa CC_VON=1 CC_DX=200 CC_DZ=0"
job WS1La10_x90 kontakt "$wa CC_VON=9 CC_FERN=9 CC_FERN_H=60 CC_FERN_DX=46 CC_DX=90 CC_DZ=0"

# EDDY-Sprungtritt: bricht nicht ab, bewegt sich 3 px/Frame. Ohne Treffer:
# Figur 20 px versetzt in der Tiefe. Aktive Frames: Figur bis A+k 200 px weg,
# danach bei dx 30. x: gesetzter Abstand vor dem Frame (am Frame-Ende 3 px
# naeher). Tiefe +-12/13.
sprungtritt() {
	local Q=$1 st=$2 ab=$3 A=$4 sg=$5 xnat=$6; shift 6
	local vor="$*"
	local base="CC_SLOT=17 CC_AB=$ab CC_FRAMES=$((A + 110)) CC_DUMP_AB=$((A - 5)) $vor"
	job "${Q}_nat" "$st" "$base"
	job "${Q}_whiff" "$st" "$base CC_VON=9 CC_BIS=80 CC_DX=$xnat CC_DZ=20"
	for k in 8 9 30 44 45 50 52; do
		job "${Q}_f$k" "$st" "$base CC_VON=9 CC_BIS=80 CC_FERN=$k CC_DX=$((sg * 30)) CC_DZ=0"
	done
	for z in -13 -12 12 13; do
		job "${Q}_z$(v $z)" "$st" "$base CC_VON=9 CC_DX=$xnat CC_DZ=$z"
	done
}
sprungtritt EK1L kontakt_b 1:64688 183 1 31 CC_VOR=2-3 CC_VOR_DX=80 CC_VOR_DZ=0
for d in 1 3 62 63; do job "EK1L_x$d" kontakt_b "CC_SLOT=17 CC_AB=1:64688 CC_FRAMES=293 CC_DUMP_AB=178 CC_VOR=2-3 CC_VOR_DX=80 CC_VOR_DZ=0 CC_VON=9 CC_DX=$d CC_DZ=0"; done
sprungtritt EK1R kontakt_b 3:64688 1424 -1 -40 CC_VOR=2-3 CC_VOR_DX=100 CC_VOR_DZ=0
for d in -1 -2 -61 -62; do job "EK1R_x$(v $d)" kontakt_b "CC_SLOT=17 CC_AB=3:64688 CC_FRAMES=1534 CC_DUMP_AB=1419 CC_VOR=2-3 CC_VOR_DX=100 CC_VOR_DZ=0 CC_VON=9 CC_DX=$d CC_DZ=0"; done

# SKIP (Slot 18): bricht seine Angriffe nicht ab. Ohne Treffer: Figur 20 px
# versetzt in der Tiefe (auch in 60 px Hoehe trifft der Messerstich noch).
# Aktive Frames: Figur bis A+k 20 px versetzt, danach dz 0.
HC="CC_IN=421-540:p1_right/541-556:p1_up/721-900:p1_right$(for f in $(seq 561 8 680); do printf "/%d:p1_attack" $f; done)"
sb="CC_SLOT=18 CC_AB=1:287e0 CC_FRAMES=765 CC_DUMP_AB=700 CC_VOR=2-3 CC_VOR_DX=-60 CC_VOR_DZ=0 CC_VOR_SLOT=17"
job SMSL_nat kontakt_b "$sb"
job SMSL_whiff kontakt_b "$sb CC_VON=13 CC_BIS=17 CC_DZ=20"
for k in 12 13 15 16; do job "SMSL_f$k" kontakt_b "$sb CC_VON=13 CC_BIS=17 CC_FERN=$k CC_FERN_DZ=20 CC_DZ=0"; done
for d in -16 -15 108 109; do
	job "SMSL_x$(v $d)" kontakt_b "$sb CC_VON=13 CC_DX=$d CC_DZ=0"
	job "SMSLd5_x$(v $d)" kontakt_b "$sb CC_VON=13 CC_DX=$d CC_DZ=5"
done
for z in -13 -12 12 13; do
	job "SMSL_z$(v $z)" kontakt_b "$sb CC_VON=13 CC_DX=66 CC_DZ=$z"
	job "SMSLx30_z$(v $z)" kontakt_b "$sb CC_VON=13 CC_DX=30 CC_DZ=$z"
done
for h in 71 72 73; do job "SMSL_h$h" kontakt_b "$sb CC_VON=13 CC_H=$h"; done
# Wirbel-Variante (vierter Stich, S+0x24 fast durchgehend 0x8C00): Figur ab
# A+1 bei dx 10 bzw. 40, dz 0 - trifft sie schon vor dem Stich?
sw="CC_SLOT=18 CC_AB=4:287e0 CC_FRAMES=890 CC_DUMP_AB=826 CC_VOR=2-3 CC_VOR_DX=-60 CC_VOR_DZ=0 CC_VOR_SLOT=17"
job SMWL_nat kontakt_b "$sw"
for d in 10 40; do job "SMWL_x$d" kontakt_b "$sw CC_VON=1 CC_DX=$d CC_DZ=0"; done
# Blick rechts: Figur steht am rechten Bildrand (vorn nur bis dx -56 pruefbar)
sr="CC_SLOT=18 CC_AB=3:287e0 CC_FRAMES=3520 CC_DUMP_AB=3483 $HC"
job SMSR_nat ingame "$sr"
for d in 8 9; do job "SMSR_x$d" ingame "$sr CC_VON=13 CC_DX=$d CC_DZ=0"; done
sa="CC_SLOT=18 CC_AB=1:28642 CC_FRAMES=2460 CC_DUMP_AB=2409 $HC"
job SASR_nat ingame "$sa"
for d in 0 10; do job "SASR_x$d" ingame "$sa CC_VON=14 CC_DX=$d CC_DZ=0"; done
for z in 12 13; do job "SASR_z$z" ingame "$sa CC_VON=14 CC_DX=-56 CC_DZ=$z"; done

# Dritte Messung zum Abbruchfenster (Gegenpruefung V3: Abbruch, sobald dx das
# Fenster [Ziel-31, Ziel+32] verlaesst, Ziel = S+0x96): Figur vor dem Angriff
# per EINGRIFF bis A-1 auf dx 25 bzw. -30 gehalten (CC_VOR), damit der Gegner
# sich andere Zielabstaende merkt (25, -30, bei W3S2L 3); Proben je an beiden
# Fenstergrenzen (innen und 1 px aussen).
dritte() { # dritte Q STATE SLOT AB A s VORDX ZIEL [Grenzen]
	local Q=$1 st=$2 slot=$3 ab=$4 A=$5 s=$6 vd=$7 zl=$8; shift 8
	local base="CC_SLOT=$slot CC_AB=$ab CC_FRAMES=$((A + 70)) CC_DUMP_AB=$((A - 5)) CC_VOR=2-$((A - 1)) CC_VOR_DX=$vd CC_VOR_DZ=0"
	local d werte="${*:-$((zl - 32)) $((zl - 31)) $((zl + 32)) $((zl + 33))}"
	job "${Q}_nat" "$st" "$base"
	for d in $werte; do job "${Q}_x$(v $d)" "$st" "$base CC_VON=$s CC_DX=$d CC_DZ=0"; done
}
dritte W3S1L kontakt 18 4:5fa54 348 9 25 25
dritte W3S1R kontakt 18 1:5fa54 20 9 -30 -30
dritte W3S2L kontakt 18 2:5fc18 729 4 25 3 -29 -28
dritte W3S2R kontakt 18 1:5fc18 431 4 -30 -30
dritte W3S3R kontakt 18 1:5fd24 748 10 -30 -30
dritte W3K1R kontakt 18 1:5fb50 136 9 -30 -30
dritte W3K2L kontakt 18 1:5fc8c 534 8 25 25
dritte W3K2R kontakt 18 1:5fc8c 600 8 -30 -30
dritte E3S1L kontakt_b 17 1:643f8 22 9 25 25
dritte E3S1R kontakt_b 17 1:643f8 22 9 -30 -30
dritte E3S2L kontakt_b 17 1:645bc 95 10 25 25
dritte E3S2R kontakt_b 17 1:645bc 95 10 -30 -30
dritte E3K2L kontakt_b 17 1:644f4 1370 9 25 25

# Hoehe ohne Eingriff: Figur springt zu verschiedenen Zeiten (WOOKY-Schlag A
# ab Frame 19, EDDY-Schlag A ab Frame 31)
for J in 5 7 11 12; do job "WS1L_j$J" kontakt "CC_SLOT=18 CC_AB=1:5fa54 CC_FRAMES=90 CC_DUMP_AB=14 CC_IN=$J:p1_jump"; done
for J in 17 19 23 24; do job "ES1L_j$J" kontakt_b "CC_SLOT=17 CC_AB=1:643f8 CC_FRAMES=100 CC_DUMP_AB=26 CC_IN=$J:p1_jump"; done

# natuerliche Laeufe ohne Positionseingriff (Figur passiv): Statistik je
# Angriffsart (Startup, aktive Frames, Schaden, Umwerfen, Nachlauf)
job lang_w kontakt "CC_SLOT=18 CC_FRAMES=1500"
job lang_e kontakt_b "CC_SLOT=17 CC_FRAMES=1500"
job lang_wv kontakt "CC_SLOT=18 CC_FRAMES=900 CC_VOR=2-3 CC_VOR_DX=-46"
job lang_ev kontakt_b "CC_SLOT=17 CC_FRAMES=900 CC_VOR=2-3 CC_VOR_DX=-46"
job lang_hurtc ingame "CC_SLOT=17 CC_FRAMES=3600 $HC"
job lang_evm60 kontakt_b "CC_SLOT=17 CC_FRAMES=1500 CC_VOR=2-3 CC_VOR_DX=-60 CC_VOR_DZ=0"
# dritte Messung (Nachlauf, Serien, SKIP): andere Ausgangslagen, laengere Laeufe,
# ohne Positionseingriff
for st in anlauf anlauf_b anlauf_c tiefe_b kontakt_b; do job "lang3_$st" "$st" "CC_SLOT=17 CC_FRAMES=3600"; done
job lang3_s1 ingame "CC_SLOT=18 CC_FRAMES=4200 CC_IN=61-500:p1_right/501-520:p1_up/900-1300:p1_right"
job lang3_s2 kontakt_b "CC_SLOT=17 CC_FRAMES=4200 CC_IN=100-400:p1_right"
job lang3_s3 tiefe_b "CC_SLOT=17 CC_FRAMES=4200 CC_IN=200-500:p1_right/501-510:p1_down"

echo "$(wc -l < "$jobs") Laeufe" >&2
xargs -P "$PAR" -I{} sh -c '{} >/dev/null 2>&1 || echo "Fehler: {}" >&2' < "$jobs"

# Auswertung: je Quelle gegnerangriff mit Slot und erster Animation (der
# Abzug beginnt 5 Frames vor A, der erste Wechsel darin ist der Angriff)
ga() { python3 scripts/messen_greichweite.py gegnerangriff "$@"; }
shopt -s nullglob
eval_q() { # eval_q Q SLOT ANIM
	local f runs=()
	for f in logs/raw/greichweite_"$1"_*_ram.bin logs/raw/greichweite_"$1"d5_*_ram.bin \
		logs/raw/greichweite_"$1"x30_*_ram.bin logs/raw/greichweite_"$1"a[0-9]*_*_ram.bin; do
		runs+=("${f%_ram.bin}")
	done
	ga "${runs[@]}" --slot "$2" --start "1:$3" | tail -n +2
}
{
	ga logs/raw/greichweite_lang_w --slot 18 | sed -n 1p
	for qs in WS1L:18:5fa54 WS1R:18:5fa54 WK1L:18:5fb50 WK1R:18:5fb50 WS2L:16:5fc18 WS2Lb:16:5fc18 \
		WS2R:18:5fc18 WK2L:18:5fc8c WK2R:18:5fc8c WS3L:16:5fd24 WS3R:16:5fd24 ES1L:17:643f8 \
		ES1R:17:643f8 ES2L:17:645bc ES2R:17:645bc EK2L:17:644f4 EK2R:17:644f4 EK1L:17:64688 EK1R:17:64688 \
		SMSL:18:287e0 SMSR:18:287e0 SASR:18:28642 SMWL:18:287e0 \
		W3S1L:18:5fa54 W3S1R:18:5fa54 W3S2L:18:5fc18 W3S2R:18:5fc18 W3S3R:18:5fd24 W3K1R:18:5fb50 \
		W3K2L:18:5fc8c W3K2R:18:5fc8c E3S1L:17:643f8 E3S1R:17:643f8 E3S2L:17:645bc E3S2R:17:645bc \
		E3K2L:17:644f4; do
		IFS=: read -r q s a <<< "$qs"
		eval_q "$q" "$s" "$a"
	done
} > "$tmp/proben.csv"
lang=()
for f in logs/raw/greichweite_lang_*_ram.bin logs/raw/greichweite_lang3_*_ram.bin; do lang+=("${f%_ram.bin}"); done
ga "${lang[@]}" > "$tmp/natur.csv"
python3 scripts/messen_greichweite.py gegnerangriff logs/raw/greichweite_WS1L_nat logs/raw/greichweite_ES1L_whiff \
	logs/raw/greichweite_EK1L_nat --slot 18 --slot 17 --zeitachse > "$tmp/zeitachse.csv"
{
	echo "# Reichweite der Gegnerangriffe (Captain Commando, Stage 1, Figur Captain, passiv)."
	echo "# Alle Laeufe: EINGRIFF Rang FFF82A = 12 ab Frame 2, EINGRIFF LP der Figur vor jedem Frame 72."
	echo "# Proben (Teil 2): EINGRIFF Figur ab dem ersten aktiven Frame A+s relativ zum Gegner gesetzt"
	echo "# (x: dx = x(Gegner) - x(Figur), Tiefe dz = z(Gegner) - z(Figur), Hoehe; f<k>: Figur bis A+k"
	echo "# 60 px hoch). Quellen und Proben: scripts/belege_greichweite.sh. Werte ganzzahlig am Frame-Ende."
	echo "# Erzeugt von scripts/belege_greichweite.sh mit messen_greichweite.py."
	python3 scripts/messen_greichweite.py gegnerzusammenfassung "$tmp/natur.csv" "$tmp/proben.csv"
	echo "# Teil 3: messen_greichweite.py gegnerangriff, natuerliche Laeufe (lang_*: erste Messung,"
	echo "# lang3_*: dritte Messung)"
	cat "$tmp/natur.csv"
	echo "# Teil 4: messen_greichweite.py gegnerangriff, Proben je Quelle (--start 1:ANIM)"
	cat "$tmp/proben.csv"
	echo "# Teil 5: Zeitachse (gegnerangriff --zeitachse): WOOKY-Schlag A mit Treffer (WS1L_nat),"
	echo "# EDDY-Schlag A ohne Treffer (ES1L_whiff, Figur ab A+9 60 px hoch), EDDY-Sprungtritt (EK1L_nat)"
	cat "$tmp/zeitachse.csv"
} > "$out"
rm -rf logs/raw/greichweite_* "$tmp"
wc -l "$out"

# ===========================================================================
# Gegenpruefung V3 (Praefix greichweite_v): eigene Laeufe, unabhaengig von den
# Quellen oben (andere Savestates, andere Gegnerinstanzen, andere Eingaben,
# Figur statt Gegner versetzt). Ergebnis: logs/greichweite_v.csv.
# Szenario scenarios/greichweite_v_frei.lua, Auswertung
# scripts/messen_greichweite_v.py. Voraussetzung: Savestate ingame.
#   EINGRIFF in allen Laeufen: LP der Figur vor jedem Frame auf 72 (CC_LP=1).
#   EINGRIFF in den Proben: Figur ab A+1 relativ zum Gegner gesetzt (x, Tiefe,
#   Hoehe; CC_POKE/CC_DX/CC_DZ/CC_PH), bei "gegner" der Gegner relativ zur
#   Figur, bei "rang12" Rang FFF82A ab Frame 2 auf 12.
# Teil V1: sechs natuerliche Laeufe ab ingame (Figur passiv bzw. mit wenigen
# Bewegungen), die zugleich die Savestates greichweite_v_* fuer die Proben
# anlegen (je 3 Frames vor einem natuerlich gewaehlten Angriff: A = Frame 3
# ab Savestate; *_20: 20 Frames davor, A = Frame 20).
# Teil V2: Proben ab diesen Savestates (etwa 280 Laeufe, ~5 min bei 4 Kernen).
# ===========================================================================
vt=logs/raw/greichweite_vtmp
mkdir -p "$vt"
rm -f "$vt"/*
vjobs="$vt/jobs.txt"
: > "$vjobs"

# Eingaben der natuerlichen Laeufe (Kurzformen l r u d a j, siehe Szenario)
schlaege() { local f s=""; for f in $(seq 521 8 640); do s="$s,a:$f-$((f + 1))"; done; echo "$s"; }
IN1="r:401-520"
IN4="r:381-500,u:501-516$(schlaege),r:681-880"
IN5="r:401-520"; f=700; k=0
while [ $f -lt 5800 ]; do
	case $((k % 4)) in 0) IN5="$IN5,l:$f-$((f + 30))" ;; 1) IN5="$IN5,r:$f-$((f + 45))" ;;
		2) IN5="$IN5,j:$f-$((f + 1))" ;; 3) IN5="$IN5,u:$f-$((f + 12))" ;; esac
	f=$((f + 173)); k=$((k + 1))
done
IN6="$IN4"; f=1500; k=0
while [ $f -lt 8800 ]; do
	case $((k % 3)) in 0) IN6="$IN6,j:$f-$((f + 1))" ;; 1) IN6="$IN6,l:$f-$((f + 20))" ;;
		2) IN6="$IN6,r:$f-$((f + 20))" ;; esac
	f=$((f + 211)); k=$((k + 1))
done
IN7="r:381-500,u:501-516$(schlaege),r:681-800"; f=1900; k=0
while [ $f -lt 8800 ]; do
	case $((k % 2)) in 0) IN7="$IN7,l:$f-$((f + 8))" ;; 1) IN7="$IN7,r:$f-$((f + 8))" ;; esac
	f=$((f + 397)); k=$((k + 1))
done
IN8="r:401-600,d:601-620"; f=1300; k=0
while [ $f -lt 8800 ]; do
	case $((k % 2)) in 0) IN8="$IN8,j:$f-$((f + 1))" ;; 1) IN8="$IN8,u:$f-$((f + 6))" ;; esac
	f=$((f + 157)); k=$((k + 1))
done

# natur NAME FRAMES EINGABEN SAVES: Savestate-Namen ohne Praefix, Frame = A-3
# (bzw. A-20). Kommentar je Savestate: Gegner, Angriff, Blick des Gegners, dx bei A.
natur() { echo "env CC_NAME=greichweite_v_$1 CC_FRAMES=$2 CC_IN=$3 CC_SAVE=$4 scripts/run.sh scripts/scenarios/greichweite_v_frei.lua ingame" >> "$vjobs"; }
sv() { local s="" x; for x in "$@"; do s="$s,${x%%:*}:greichweite_v_${x#*:}"; done; echo "${s#,}"; }
# n1: WOOKY 16 LP Slot 18 Schlag A rechts dx -1 (w1r) / links dx 14 (w1l) / rechts
#     -48 (wa_r, wa_r20); Slot 16 Schlag B links 56 (wb_l); Slot 18 Umwerfschlag B rechts -45
natur n1 3000 "$IN1" "$(sv 1823:w1r 2413:w1l 778:wa_r 761:wa_r20 1464:wb_l 1253:wk2_r)"
# n4: WOOKY Slot 14/16 (Schlag A/C/Umwerf B links, Schlag B rechts), EDDY Slot 17
#     (Umwerfschlag rechts, Schlag B links, Sprungtritt links), SKIP Slot 18 (Messerstich
#     links, Wirbel-Variante links)
natur n4 5000 "$IN4" "$(sv 2181:wa_l 1035:wc_l 1920:wk2_l 4338:wb_r 1176:ek2_r 2133:eb_l 3062:ek1_l 3385:sm_l 3496:smw_l)"
# n5: EDDY Schlag B rechts (eb_r, eb_r20), WOOKY Slot 14 Schlag C rechts dx -17 (wc_r2)
natur n5 6000 "$IN5" "$(sv 2040:eb_r 2023:eb_r20 3632:wc_r2)"
# n6: WOOKY Umwerfschlag A links/rechts, EDDY Sprungtritt rechts, SKIP Messerstich
#     rechts/links, Ausfallstich rechts, Ausfallstich-Wirbel rechts
natur n6 9000 "$IN6" "$(sv 5643:wk1_l 7739:wk1_r 4765:ek1_r 7518:sm_r 7644:sa_r 8382:sw_r 2733:sm_l2)"
# n7: WOOKY Slot 15 Schlag C rechts, EDDY Schlag A links/rechts, Umwerfschlag links, Sprungtritt links
natur n7 9000 "$IN7" "$(sv 7420:wc_r 5258:ea_l 4330:ek2_l 3040:ea_r 4991:ek1_l2)"
# n8: EDDY Schlag A rechts dx -17 (ea_r2), Sprungtritt rechts (ek1_r2)
natur n8 9000 "$IN8" "$(sv 2801:ea_r2 6333:ek1_r2)"
echo "V1: $(wc -l < "$vjobs") natuerliche Laeufe" >&2
xargs -P "$PAR" -I{} sh -c '{} >/dev/null 2>&1 || echo "Fehler: {}" >&2' < "$vjobs"
python3 scripts/messen_greichweite_v.py angriffe logs/raw/greichweite_v_n1 logs/raw/greichweite_v_n4 \
	logs/raw/greichweite_v_n5 logs/raw/greichweite_v_n6 logs/raw/greichweite_v_n7 \
	logs/raw/greichweite_v_n8 > "$vt/natur.csv"
rm -f logs/raw/greichweite_v_n*_ram.bin

# Teil V2: Proben. pj ZUSTAND SLOT DX DZ [H] [ZUSATZ] [VAR=WERT...]: Lauf
# greichweite_v_p_<ZUSTAND>_x<DX>_z<DZ>[_h<H>][_<ZUSATZ>] ab Savestate, A = Frame 3
# (A20=1: Frame 20), Eingriff Figur ab A+1 bis A+37 (PV/PB), Auswertung mit
# messen_greichweite_v.py probe. DX "nat" = ohne Eingriff (Kontrolle).
: > "$vjobs"
pj() {
	local st=$1 sl=$2 dx=$3 dz=$4 h=$5 zus=$6; shift 6
	local nm="greichweite_v_p_${st}_x${dx}_z${dz}${h:+_h$h}${zus:+_$zus}" A=3 extra="$*" e="" fl=""
	case " $extra " in *" A20=1 "*) A=20 ;; esac
	case " $extra " in *" BEWEGT=1 "*) fl="--bewegt" ;; esac
	case " $extra " in *" SPAET=1 "*) fl="--ab 5" ;; esac
	extra="${extra//A20=1/}"; extra="${extra//BEWEGT=1/}"; extra="${extra//SPAET=1/}"
	if [ "$dx" != nat ]; then
		e="CC_POKE=${PV:-4}-${PB:-40} CC_SLOT=$sl CC_DX=$dx CC_DZ=$dz${h:+ CC_PH=$h}"
	fi
	echo "env CC_NAME=$nm CC_FRAMES=$((A + 67)) $e $extra scripts/run.sh scripts/scenarios/greichweite_v_frei.lua greichweite_v_$st >/dev/null 2>&1; python3 scripts/messen_greichweite_v.py probe logs/raw/$nm --slot $sl --a $A $fl > $vt/$nm.row; rm -f logs/raw/${nm}_*" >> "$vjobs"
}
# Kontrollen ohne Eingriff (natuerlicher Angriff ab Savestate wie im Lauf)
for q in w1r:18 w1l:18 wa_r:18 wb_l:16 wk2_r:18 wa_l:14 wc_l:16 wk2_l:14 wb_r:14 ek2_r:17 eb_l:17 \
	ek1_l:17 sm_l:18 smw_l:18 eb_r:17 wc_r2:14 wk1_l:14 wk1_r:15 ek1_r:17 sm_r:18 sa_r:18 sw_r:18 \
	sm_l2:18 wc_r:15 ea_l:17 ek2_l:17 ea_r:17 ek1_l2:17 ea_r2:17 ek1_r2:17; do
	pj "${q%%:*}" "${q#*:}" nat 0 "" ""
done
pj wa_r20 18 nat 0 "" "" A20=1
pj eb_r20 17 nat 0 "" "" A20=1
# x: Abbruchfenster relativ zum Zielabstand ziel = S+0x96 (Wert aus der Kontrolle):
# Probe bei ziel-32, ziel-31, ziel+32, ziel+33
for q in w1r:18:-1 w1l:18:14 wa_r:18:-48 wb_l:16:48 wk2_r:18:-45 wc_l:16:48 wk2_l:14:48 wb_r:14:-48 \
	ek2_r:17:-42 eb_l:17:48 eb_r:17:-48 wk1_l:14:48 wk1_r:15:-48 wc_r:15:-48 ea_l:17:48 ek2_l:17:32 \
	ea_r:17:-48 ea_r2:17:-17 wc_r2:14:-17; do
	IFS=: read -r st sl z <<< "$q"
	for d in -32 -31 32 33; do pj "$st" "$sl" $((z + d)) 0 "" ""; done
done
# x: Hinterkante (Figur hinter dem Gegner)
for d in -3 -4; do pj w1l 18 $d 0 "" ""; done
for q in w1r:18 ea_r2:17 wc_r2:14; do for d in 4 5; do pj "${q%%:*}" "${q#*:}" $d 0 "" ""; done; done
# x: Gegner statt Figur versetzt (gleiches Fenster) und Eingriff erst ab A+5
for d in -33 -32 31 32; do pj w1r 18 $d 0 "" gegner CC_WER=gegner; done
for d in -33 -32; do PV=8 pj w1r 18 $d 0 "" spaet SPAET=1; done
# Tiefe: dz -11/-10/11/12 beim natuerlichen dx (dx bei A), je Angriff und Blickrichtung
for q in wa_r:18:-48 w1l:18:14 wb_l:16:56 wb_r:14:-56 wc_l:16:56 wc_r2:14:-17 wk1_r:15:-56 wk1_l:14:56 \
	wk2_l:14:55 wk2_r:18:-45 ea_r:17:-55 ea_l:17:56 eb_r:17:-55 eb_l:17:55 ek2_r:17:-42 ek2_l:17:44; do
	IFS=: read -r st sl z <<< "$q"
	for dz in -11 -10 11 12; do pj "$st" "$sl" "$z" $dz "" ""; done
done
# Hoehe (EINGRIFF Hoehe vor jedem Frame gesetzt; die Figur sinkt im Frame)
for q in wa_r:18:-48 wb_l:16:48 wc_l:16:48 wk1_r:15:-48 wk2_l:14:48 ea_r:17:-48 eb_r:17:-48 ek2_r:17:-42; do
	IFS=: read -r st sl z <<< "$q"
	for h in 50 53; do pj "$st" "$sl" "$z" 0 $h ""; done
done
# Hoehe ohne Eingriff: Sprung J Frames nach dem Savestate (A = Frame 20)
for j in 7 8 12 13; do pj wa_r20 18 nat 0 "" "j$j" A20=1 CC_IN=j:$j-$((j + 1)); done
for j in 11 12 13 14; do pj eb_r20 17 nat 0 "" "j$j" A20=1 CC_IN=j:$j-$((j + 1)); done
# EDDY-Sprungtritt: Figur bis A+9 relativ gesetzt (vor dem Frame; EDDY fliegt im Frame
# noch 3 px naeher), danach frei; Tiefe +-12/13
for d in 2 3 62 63; do PB=12 pj ek1_l2 17 $d 0 "" "" BEWEGT=1; done
for d in -1 -2 -61 -62; do PB=12 pj ek1_r 17 $d 0 "" "" BEWEGT=1; done
for dz in -13 -12 12 13; do PB=12 pj ek1_l2 17 33 $dz "" "" BEWEGT=1; done
for dz in 12 13; do PB=12 pj ek1_r 17 -33 $dz "" "" BEWEGT=1; done
# Sprungtritt spaet: Figur bis A+k-1 40 px in der Tiefe versetzt, ab A+k bei dx -5
for k in 40 42 43; do
	pj ek1_r2 17 nat 0 "" "spaet$k" CC_SLOT=17 CC_POKE=4-$((k + 2)) CC_DZ=40 CC_POKE2=$((k + 3))-60 CC_DX2=-5 CC_DZ2=0
done
# SKIP Messerstich: Figur mit Blick weg (sm_l2) bzw. zum SKIP (sm_l, sm_l2 gedreht,
# sm_r); gedreht = ein Frame Richtung in A+1 (CC_IN)
for d in -15 -16 108 109; do pj sm_l2 18 $d 0 "" ""; done
for d in -7 -8 115 116; do pj sm_l2 18 $d 0 "" dreh CC_IN=r:4-4; done
for d in -7 -8; do pj sm_l 18 $d 0 "" ""; done
for d in 8 9 -115 -116; do pj sm_r 18 $d 0 "" ""; done
for d in -110 -112; do pj sm_r 18 $d 0 "" dreh CC_IN=r:4-4; done
for dz in 12 13; do pj sm_l2 18 30 $dz "" ""; done
for dz in -13 -12 12 13; do pj sm_r 18 -30 $dz "" ""; done
for h in 75 76; do pj sm_l2 18 30 0 $h ""; pj sm_r 18 -30 0 $h ""; done
# SKIP Ausfallstich (sa_r: Figur mit Blick weg; gedreht: Blick zum SKIP)
for d in 0 16 18 -100 -110; do pj sa_r 18 $d 0 "" ""; done
for d in 8 9; do pj sa_r 18 $d 0 "" dreh CC_IN=l:4-4; done
for dz in -13 -12 12 13; do pj sa_r 18 -30 $dz "" ""; done
# Schaden bei Rang 12 (EINGRIFF Rang), Wirbel-Varianten (Figur ab A+1 nah/fern)
for q in sa_r sw_r sm_r; do pj $q 18 -30 0 "" rang12 CC_RANG=12; done
for d in 0 10 40; do pj smw_l 18 $d 0 "" ""; done
for d in 10 -40; do pj sw_r 18 $d 0 "" ""; done
echo "V2: $(wc -l < "$vjobs") Proben" >&2
xargs -P "$PAR" -I{} sh -c '{} || echo "Fehler: {}" >&2' < "$vjobs"

vout=logs/greichweite_v.csv
mv="python3 scripts/messen_greichweite_v.py"
{
	echo "# Gegenpruefung Reichweite der Gegnerangriffe (V3, Praefix greichweite_v). Captain Commando,"
	echo "# Stage 1, Figur Captain. EINGRIFF in allen Laeufen: LP der Figur vor jedem Frame 72."
	echo "# Erzeugt von scripts/belege_greichweite.sh (Teil V) mit messen_greichweite_v.py."
	echo "# Teil 1: uebersicht der natuerlichen Laeufe greichweite_v_n1/n4/n5/n6/n7/n8 (ohne Positionseingriff)"
	$mv uebersicht "$vt/natur.csv"
	echo "# Teil 2: nachlauf (natuerliche Laeufe)"
	$mv nachlauf "$vt/natur.csv"
	echo "# Teil 3: serien (natuerliche Laeufe)"
	$mv serien "$vt/natur.csv"
	echo "# Teil 4: Proben ab den Savestates (EINGRIFF Figur ab A+1 relativ zum Gegner, siehe Laufname;"
	echo "# ergebnis T Treffer, L aktiv ohne Treffer, X Abbruch; gueltig = Eingriff hat gegriffen)"
	$mv probe --kopf --slot 0 --a 0
	cat "$vt"/*.row | sort
	echo "# Teil 5: fenster (Abbruchfenster relativ zum Zielabstand S+0x96)"
	{ $mv probe --kopf --slot 0 --a 0; cat "$vt"/*.row; } > "$vt/proben.csv"
	$mv fenster "$vt/proben.csv"
	echo "# Teil 6: angriffe der natuerlichen Laeufe"
	cat "$vt/natur.csv"
} > "$vout"
rm -rf logs/raw/greichweite_v_* "$vt"
wc -l "$vout"
