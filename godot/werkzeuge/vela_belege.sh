#!/bin/bash
# Belege der gemalten Vela im Spiel (docs/godot.md, „Gemalte Vela“, „Belege“): Bildstreifen und GIFs von Szenen, die die Logik treibt.
# Die Befehle je Beleg sind hier die einzige Quelle.
#
#   godot/werkzeuge/vela_belege.sh [<beleg> ...]      (Repo-Wurzel; ohne Namen: alle, etwa 5 Minuten)
#
# Je Beleg nimmt werkzeuge/foto.gd jeden Tick eines Bereichs der Szene auf (1536 × 896 aus dem Spielbild, mit `--info`: Fußpunkt der
# Figur, Aktion, Aktionsuhr, Quelle, Clipbild), ImageMagick schneidet das Fenster um die Figur und beschriftet (Tick, Aktion, Uhr, Clip und
# Nummer des Bildes der Datei f_XXXX.webp; Platzhalter, wo die Figur kein Clip zeigt), ffmpeg macht das GIF (jeder zweite Tick, 30 Bilder/s
# ≈ Echtzeit). Ergebnis in docs/bilder:
#   godot_hd_spiel_<beleg>_streifen.png   Bildstreifen (jeder <schritt>-te Tick; ohne bei Schritt 0)
#   godot_hd_spiel_<beleg>.gif            GIF (gleiches Fenster, jeder zweite Tick)
#   godot_hd_spiel_uebergaenge.png        letztes Bild des alten und erstes Bild des neuen Clips bei jedem Wechsel (Posesprünge)
#   godot_hd_spiel_anker_schatten.png     Figur und Schatten im Maßstab 1:1 mit dem Fußpunkt der Logik (rote Linie)
# Braucht Godot (Pfad in $GODOT, Standard /tmp/Godot_v4.7.2-stable_linux.x86_64), xvfb-run, ImageMagick (convert, montage) und ffmpeg.
# Zwischenbilder liegen in $BELEGE_TMP (Standard /tmp/vela_belege) und werden nicht ins Repo gelegt; $BELEGE_AUS ersetzt docs/bilder.
#
# Szenen: die Vorführung der Scheibe (spiel/tests/szenen/vorfuehrung.txt) und werkzeuge/hd_film/ (Szenen und Eingaben
# `treffer` für Treffer, Umwerfen, Liegen und Aufstehen, `griff` für Griff, Kniestoß und Wurf). Die Gegner sind Platzhalter
# (Kästen), die gemalte Vela steht auf der Gerüst-Bühne.
set -e
G="${GODOT:-/tmp/Godot_v4.7.2-stable_linux.x86_64}"
T="${BELEGE_TMP:-/tmp/vela_belege}"
AUS="${BELEGE_AUS:-docs/bilder}"
mkdir -p "$T" "$AUS"

VOR_S=spiel/tests/szenen/vorfuehrung.txt
VOR_E=spiel/tests/eingaben/vorfuehrung.txt
FILM=godot/werkzeuge/hd_film
RAND=600   # Rand in Bildpixeln um das Spielbild, damit Fenster über den Bildrand hinaus schwarz aufgefüllt werden

# Ausschnitt aus einem Bild: ausschneiden <bild> <x0> <y0> <breite> <hoehe> <ziel> (über den Rand hinaus mit Schwarz aufgefüllt)
ausschneiden() {
	convert "$1" -bordercolor '#000000' -border "${RAND}x${RAND}" -gravity NorthWest -crop "${4}x${5}+$(($2 + RAND))+$(($3 + RAND))" +repage "$6"
}

# beleg <name> <szene> <eingabe> <von> <bis> <schritt> <spalten> <fenster> <skala %> [<gif-skala %>; 0: kein GIF]
#   fenster: "folgen:<links>,<oben>,<breite>,<hoehe>" (Fenster um den Fußpunkt der Figur: <links> Bildpixel links davon, <oben> darüber)
#            oder "fest:<x>,<y>,<breite>,<hoehe>" (festes Fenster im Spielbild, für Flüge)
beleg() {
	local name="$1" szene="$2" eingabe="$3" von="$4" bis="$5" schritt="$6" spalten="$7" fenster="$8" skala="$9" gskala="${10:-$9}"
	local d="$T/$name"
	rm -rf "$d"; mkdir -p "$d"
	local nach; nach=$(seq -s, "$von" "$bis")
	echo "== $name: Ticks $von bis $bis"
	xvfb-run -a "$G" --path godot --rendering-driver opengl3 --script res://werkzeuge/foto.gd -- --szene "$szene" --eingabe "$eingabe" \
		--nach "$nach" --aus "$d/f" --info "$d/info.csv" > "$d/foto.log" 2>&1 || { tail -5 "$d/foto.log"; return 1; }
	local modus="${fenster%%:*}" w="${fenster#*:}"
	IFS=, read -r a b c e <<< "$w"
	while IFS=, read -r frame fx fy aktion phase uhr blick quelle bild; do
		[ "$frame" = "frame" ] && continue
		local x0 y0
		if [ "$modus" = "folgen" ]; then
			x0=$(awk -v f="$fx" -v a="$a" 'BEGIN{printf "%d", f - a}')
			y0=$(awk -v f="$fy" -v b="$b" 'BEGIN{printf "%d", f - b}')
		else
			x0=$a; y0=$b
		fi
		local f4; f4=$(printf "%04d" "$frame")
		local ph=""; [ -n "$phase" ] && ph="/$phase"
		local etikett="$frame  $aktion$ph $uhr"
		local quell="$quelle"; [ "$bild" != "0" ] && quell="$quelle $bild"
		[ "$schritt" -gt 0 ] || [ "$gskala" != "0" ] || continue
		ausschneiden "$d/f_$f4.png" "$x0" "$y0" "$c" "$e" "$d/w_$f4.png"
		if [ "$schritt" -gt 0 ]; then
			convert "$d/w_$f4.png" -resize "${skala}%" -font DejaVu-Sans-Mono -pointsize 12 -fill white -undercolor '#000000a0' -gravity NorthWest -annotate +2+2 " $etikett " \
				-gravity SouthWest -annotate +2+2 " $quell " "$d/t_$f4.png"
		fi
		if [ "$gskala" != "0" ]; then
			convert "$d/w_$f4.png" -resize "${gskala}%" -font DejaVu-Sans-Mono -pointsize 12 -fill white -undercolor '#000000a0' -gravity SouthWest -annotate +2+2 " $etikett  $quell " "$d/g_$f4.png"
		fi
	done < "$d/info.csv"
	local i
	if [ "$schritt" -gt 0 ]; then
		# Streifen: jeder <schritt>-te Tick
		local liste=(); i=0
		for f in "$d"/t_*.png; do
			if [ $((i % schritt)) -eq 0 ]; then liste+=("$f"); fi
			i=$((i + 1))
		done
		montage "${liste[@]}" -tile "${spalten}x" -geometry +1+1 -background '#101010' "$AUS/godot_hd_spiel_${name}_streifen.png"
		ls -la "$AUS/godot_hd_spiel_${name}_streifen.png" | awk '{print "   " $5 " Byte  " $9}'
	fi
	# GIF: jeder zweite Tick, gemeinsame Palette (ohne bei gif-skala 0)
	[ "$gskala" = "0" ] && return 0
	i=0; local k=0
	for f in "$d"/g_*.png; do
		if [ $((i % 2)) -eq 0 ]; then k=$((k + 1)); cp "$f" "$d/gif_$(printf "%04d" $k).png"; fi
		i=$((i + 1))
	done
	ffmpeg -v error -y -framerate 30 -i "$d/gif_%04d.png" -vf "split[a][b];[a]palettegen=max_colors=200:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" \
		-loop 0 "$AUS/godot_hd_spiel_${name}.gif"
	ls -la "$AUS/godot_hd_spiel_${name}.gif" | awk '{print "   " $5 " Byte  " $9}'
}

gewaehlt() { local c; for c in "${WAHL[@]}"; do [ "$c" = "$1" ] && return 0; done; return 1; }
WAHL=("$@")
mach() { local n="$1"; shift; if [ ${#WAHL[@]} -eq 0 ] || gewaehlt "$n"; then beleg "$n" "$@"; fi; }

# --- Belege ---
# Parameter: <name> <szene> <eingabe> <von> <bis> <schritt> <spalten> <fenster> <skala %> [<gif-skala %>]
# (das GIF von umgeworfen_aufstehen deckt Umgeworfen, Liegen und Aufstehen ab; umgeworfen und aufstehen haben nur den Streifen)
# Vorführung der Scheibe ab Spielstart (Tick 1: Stand; 2 bis 101: Gehen; 161 bis 241: Kette 1 bis 4 gegen den Bolzer der Welle 1)
mach gehen "$VOR_S" "$VOR_E" 1 96 4 8 "folgen:260,330,520,380" 45 60
mach kette2 "$VOR_S" "$VOR_E" 172 196 2 7 "folgen:300,330,620,380" 50 65
mach kette3 "$VOR_S" "$VOR_E" 188 214 2 7 "folgen:300,330,620,380" 50 65
mach kette4 "$VOR_S" "$VOR_E" 204 250 3 8 "folgen:300,330,620,380" 45 65
mach kette_folge "$VOR_S" "$VOR_E" 158 250 4 8 "folgen:300,330,620,380" 45 60
# Treffer, Umwerfen, Liegen und Aufstehen (Szene hd_film/treffer: Treffer in 19, Treffer mit Umwerfen in 100)
mach getroffen_vorn "$FILM/treffer_szene.txt" "$FILM/treffer_eingabe.txt" 14 52 2 7 "folgen:300,330,560,380" 55 70
mach umgeworfen "$FILM/treffer_szene.txt" "$FILM/treffer_eingabe.txt" 96 160 4 6 "fest:120,330,1000,470" 40 0
mach aufstehen "$FILM/treffer_szene.txt" "$FILM/treffer_eingabe.txt" 190 226 2 7 "folgen:300,330,560,380" 50 0
mach umgeworfen_aufstehen "$FILM/treffer_szene.txt" "$FILM/treffer_eingabe.txt" 14 232 0 0 "fest:120,330,1000,470" 35 55
# Griff und Wurf aus der Vorführung (Griff in 523, Wurf vorwärts ab 546; Bolzer der Welle 2)
mach griff "$VOR_S" "$VOR_E" 517 562 2 8 "folgen:260,330,560,380" 50 70
mach wurf "$VOR_S" "$VOR_E" 543 592 2 8 "folgen:260,330,560,380" 50 70
mach griff_wurf "$VOR_S" "$VOR_E" 517 600 3 8 "folgen:260,330,560,380" 45 65
# Griff, zwei Kniestöße (kein Clip: Platzhalter), Griff gehalten, Wurf rückwärts (Szene hd_film/griff)
mach griff_knie_wurf "$FILM/griff_szene.txt" "$FILM/griff_eingabe.txt" 18 112 4 8 "folgen:300,330,560,380" 45 60

# Nur für die Übergänge (kein Streifen, kein GIF): Gehen → Stand (Vorführung, Tick 101 → 102) und Losreißen aus dem Griff (T16_b, Tick 82 → 83)
mach gehen_stopp "$VOR_S" "$VOR_E" 96 108 0 0 "folgen:260,330,520,380" 50 0
mach griff_losreissen spiel/tests/szenen/T16_b.txt spiel/tests/eingaben/T16_b.txt 76 90 0 0 "folgen:260,330,520,380" 50 0

# --- Übergänge zwischen Clips (Posesprünge) ---
# Je Wechsel der Quelle das letzte Bild des alten und das erste Bild des neuen Clips, 1:1 im Fenster um den Fußpunkt (Skala 60 %), aus den
# Belegläufen oben (gehen, gehen_stopp, kette_folge, getroffen_vorn, umgeworfen_aufstehen, griff_wurf, griff_knie_wurf, griff_losreissen).
kachel() {
	local d="$1" tick="$2" ziel="$3" zeile
	zeile=$(awk -F, -v t="$tick" '$1==t' "$d/info.csv")
	local frame fx fy aktion phase uhr blick quelle bild
	IFS=, read -r frame fx fy aktion phase uhr blick quelle bild <<< "$zeile"
	local x0 y0 q="$quelle"
	x0=$(awk -v f="$fx" 'BEGIN{printf "%d", f - 240}')
	y0=$(awk -v f="$fy" 'BEGIN{printf "%d", f - 340}')
	[ "$bild" != "0" ] && q="$quelle $bild"
	ausschneiden "$d/f_$(printf "%04d" "$tick").png" "$x0" "$y0" 440 400 "$ziel.roh.png"
	convert "$ziel.roh.png" -resize 60% -font DejaVu-Sans-Mono -pointsize 12 -fill white -undercolor '#000000a0' -gravity SouthWest -annotate +2+2 " $q " \
		-gravity NorthWest -annotate +2+2 " $tick " "$ziel"
	rm -f "$ziel.roh.png"
}

uebergaenge() {
	local ziel="$AUS/godot_hd_spiel_uebergaenge.png" u="$T/uebergaenge" k=0
	rm -rf "$u"; mkdir -p "$u"
	local spez b von nach paar a z
	for spez in gehen:stand:gehen gehen_stopp:gehen:stand kette_folge:stand:kette1 kette_folge:kette1:kette2 kette_folge:kette2:kette3 kette_folge:kette3:kette4 \
		kette_folge:kette4:stand getroffen_vorn:stand:getroffen_vorn getroffen_vorn:getroffen_vorn:stand umgeworfen_aufstehen:stand:umgeworfen \
		umgeworfen_aufstehen:umgeworfen:liegen umgeworfen_aufstehen:liegen:aufstehen umgeworfen_aufstehen:aufstehen:stand griff_wurf:gehen:griff \
		griff_wurf:griff:wurf griff_wurf:wurf:stand griff_losreissen:griff:stand griff_knie_wurf:griff:platzhalter griff_knie_wurf:platzhalter:griff; do
		IFS=: read -r b von nach <<< "$spez"
		[ -f "$T/$b/info.csv" ] || { echo "   $b fehlt (zuerst den Beleg erzeugen)"; continue; }
		paar=$(awk -F, -v v="$von" -v n="$nach" 'NR>2 && pq==v && $8==n {print pf, $1; exit} NR>1 {pq=$8; pf=$1}' "$T/$b/info.csv")
		[ -z "$paar" ] && { echo "   kein Wechsel $von -> $nach in $b"; continue; }
		read -r a z <<< "$paar"
		k=$((k + 1))
		kachel "$T/$b" "$a" "$u/a_$k.png"
		kachel "$T/$b" "$z" "$u/b_$k.png"
		convert "$u/a_$k.png" \( -size 22x240 xc:'#101010' -font DejaVu-Sans-Bold -pointsize 18 -fill white -gravity Center -annotate +0+0 '>' \) "$u/b_$k.png" +append "$u/p_$(printf "%02d" $k).png"
	done
	montage "$u"/p_*.png -tile 3x -geometry +4+4 -background '#101010' "$ziel"
	ls -la "$ziel" | awk '{print "   " $5 " Byte  " $9}'
}
if [ ${#WAHL[@]} -eq 0 ] || gewaehlt uebergaenge; then uebergaenge; fi

# --- Anker und Schatten ---
# Die Figur steht mittig im Schatten: Bilder verschiedener Clips im Maßstab 1:1 mit der Linie des Fußpunkts der Logik (rot, ein halbes
# Spielpixel rechts vom Fußpunkt, dort liegt die Spiegelachse und der Mittelpunkt des Sprites) aus den Belegläufen oben.
anker_schatten() {
	local ziel="$AUS/godot_hd_spiel_anker_schatten.png" u="$T/anker" spez b tick k=0
	rm -rf "$u"; mkdir -p "$u"
	for spez in gehen:1 gehen:41 kette_folge:158 kette_folge:186 kette_folge:200 griff_wurf:535 griff_wurf:567 umgeworfen_aufstehen:195; do
		IFS=: read -r b tick <<< "$spez"
		[ -f "$T/$b/info.csv" ] || { echo "   $b fehlt (zuerst den Beleg erzeugen)"; continue; }
		k=$((k + 1))
		local zeile frame fx fy aktion phase uhr blick quelle bild
		zeile=$(awk -F, -v t="$tick" '$1==t' "$T/$b/info.csv")
		IFS=, read -r frame fx fy aktion phase uhr blick quelle bild <<< "$zeile"
		local x0 y0
		x0=$(awk -v f="$fx" 'BEGIN{printf "%d", f - 190}')
		y0=$(awk -v f="$fy" 'BEGIN{printf "%d", f - 320}')
		ausschneiden "$T/$b/f_$(printf "%04d" "$tick").png" "$x0" "$y0" 380 350 "$u/r_$k.png"
		convert "$u/r_$k.png" -stroke '#ff2020' -strokewidth 1 -draw "line 192,0 192,349" -stroke '#ffe040' -draw "line 0,320 379,320" \
			-stroke none -font DejaVu-Sans-Mono -pointsize 13 -fill white -undercolor '#000000a0' -gravity NorthWest -annotate +3+3 " $tick $aktion " \
			-gravity SouthWest -annotate +3+3 " $quelle $bild " "$u/k_$(printf "%02d" $k).png"
	done
	montage "$u"/k_*.png -tile 4x -geometry +2+2 -background '#101010' "$ziel"
	ls -la "$ziel" | awk '{print "   " $5 " Byte  " $9}'
}
if [ ${#WAHL[@]} -eq 0 ] || gewaehlt anker_schatten; then anker_schatten; fi
