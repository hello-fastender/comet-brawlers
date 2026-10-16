#!/bin/bash
# Setzt die Clips der neuen Vela (realistischer Comic, blond, Grok-Videos auf weißem Grund) im HD-Modus um.
# Die Befehle je Clip sind hier die einzige Quelle; Prompts, Befunde und Auswahl stehen in docs/grok-prompts-vela-neu.md und
# docs/grok-prompts-vela-neu-angriffe.md, die Einordnung in docs/godot.md («Gemalte Vela», «Stand der Clips»).
#
#   godot/werkzeuge/vela_neu_clips.sh <videoordner> [<ausordner>] [<clip> ...]
#
#   <videoordner>  Ordner mit den Quellvideos (liegen nicht im Repo, sondern in der geteilten Drive-Ablage «Comet Brawlers»,
#                  Ordner vela/<ordner>/grok-video-d9db4961-8774-4dfa-aa5f-292ac6fa3ed6-<n>.mp4). Erwartet umbenannt als
#                  <ordner>/<ordner>_<n>.mp4, z. B. stand/stand_9.mp4. Ausnahmen: sprint aus der ersten Lieferung (2026-10-15,
#                  zweites von zwei Laufen-Videos) als laufen_v2.mp4, kette2 aus der zweiten Fassung des Prompts (Chat-Upload
#                  2026-10-16) als kette2_2/kette2_2_8.mp4.
#   <ausordner>    Standard godot/grafik/vela_video (die Clips des Spiels)
#   <clip> ...     nur diese Clips umsetzen (Standard: alle)
#
# Maßstab: `--faktor` = 142 / Zeilen der A-Pose in Bild 1 des Videos: 0.1529 bei den quadratischen 944-Pixel-Videos (A-Pose 929 Zeilen),
# 0.1791 bei den Hochformat-Videos 768 × 1168 (sprung, sprungtritt, wurf; A-Pose 793 Zeilen). Die Figur ist so in allen Clips gleich groß.
# Weißer Grund: `--schluessel ecke`; `--loch 8` (statt 24), sonst werden die hellen Lichter der Stahl-Armschienen durchsichtig.
# Fußpunkt: `--ankerx-video` = Stiefelmitte der ruhigen Kampfhaltung im jeweiligen Video (gemessen); gehen und sprint `--ankerx mittel`.
# Bildnummern (`--ab`, `--bis`, `--ausser`) sind Videobilder (1-basiert), `--setze` zählt die behaltenen Bilder.
#
# Braucht Godot (Pfad in $GODOT, Standard /tmp/Godot_v4.7.2-stable_linux.x86_64) und ffmpeg; 15 bis 70 s je Clip.
set -e
V="${1:?Aufruf: vela_neu_clips.sh <videoordner> [<ausordner>] [<clip> ...]}"
AUS="${2:-godot/grafik/vela_video}"
shift 2 2>/dev/null || shift $# || true
WAHL=("$@")
G="${GODOT:-/tmp/Godot_v4.7.2-stable_linux.x86_64}"
U=("$G" --headless --path godot --script res://werkzeuge/video_umsetzer.gd --)
C=(--aus "$AUS" --hd --hoehe 360 --schluessel ecke)
Q=0.1529
H=0.1791

gewaehlt() { [ ${#WAHL[@]} -eq 0 ] && return 0; local c; for c in "${WAHL[@]}"; do [ "$c" = "$1" ] && return 0; done; return 1; }
umsetzen() { local clip="$1" video="$2"; shift 2; gewaehlt "$clip" || return 0; "${U[@]}" --video "$V/$video" --name "$clip" "${C[@]}" "$@"; }

# Stand: ruhige Kampfhaltung ab Video 73; das Atmen schließt keinen Zyklus, darum ein Atemzug hin und her
umsetzen stand stand/stand_9.mp4 --loch 8 --ab 97 --bis 129 --zyklus 33 --schleife pingpong --ereignis keine --faktor $Q --ankerx-video 445.75
# Gehen: gehen_8 hat den gleichmäßigsten Takt (Doppelschritt 33 Bilder); --tol 70 gegen Grok-Wischspuren unter den Stiefeln.
# Mangel: Schritte zu kurz (schritt_px 50 statt etwa 68), neues Video mit der zweiten Fassung des Prompts steht aus
umsetzen gehen gehen/gehen_8.mp4 --tol 70 --kuerzen nein --ab 102 --bis 134 --zyklus 33 --ereignis keine --ankerx mittel --faktor $Q
# Sprint: einziges Video im verlangten Tempo (Doppelschritt 15,6 Bilder); Fenster beginnt mit voll aufgesetztem Fuß (Bodenlinie)
umsetzen sprint laufen_v2.mp4 --loch 8 --ab 118 --bis 133 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --faktor $Q
# Kette 1: kette1_6 verworfen (zwei Schläge); Kontakt 97, gehalten bis 106, Ruhe 118 (profilnah wie stand)
umsetzen kette1 kette1/kette1_7.mp4 --loch 8 --kuerzen nein --ab 88 --bis 118 --ausser 99-106 --faktor $Q --ankerx-video 436.25 --setze kontakt=10,rueckzug=12,ruhe=23
# Kette 2: zweite Fassung (vordere Faust, Schritt des vorderen Beins, kein Schatten), Reichweite 69 statt 60 bei kette2_7
umsetzen kette2 kette2_2/kette2_2_8.mp4 --loch 8 --kuerzen nein --ab 59 --bis 133 --ausser 72-114 --faktor $Q --ankerx-video 397 --setze kontakt=11,rueckzug=14,ruhe=32
# Kette 3: Haken von unten
umsetzen kette3 kette3/kette3_7.mp4 --loch 8 --kuerzen nein --ab 89 --bis 130 --ausser 101-119 --faktor $Q --ankerx-video 426.25 --setze ausholen=2,kontakt=11,rueckzug=13,ruhe=23
# Kette 4: Schlag und Tritt; Mangel: halbe Rückenansicht im Schlag, Beinseiten wechseln in der Drehung
umsetzen kette4 kette4/kette4_7.mp4 --loch 8 --kuerzen nein --ab 37 --bis 143 --ausser 45-74,106-116,119-121 --faktor $Q --ankerx-video 415 --ankery unten --setze kontakt1=7,kontakt=39,rueckzug=40,ruhe=61
# Treffer von vorn: Kontakt = Oberkörper am weitesten zurück
umsetzen getroffen_vorn getroffen_vorn/getroffen_vorn_6.mp4 --loch 8 --kuerzen nein --ab 64 --bis 130 --ausser 65-70,87-97 --ereignis treffer --faktor $Q --ankerx-video 468 --setze start=1,kontakt=16,rueckzug=18,ruhe=48
# Griff: keine stille Haltepose im Video, Ruhe = Ende des Zugs (Video 89)
umsetzen griff griff/griff_6.mp4 --loch 8 --kuerzen nein --ab 50 --bis 89 --ausser 70-78 --faktor $Q --ankerx-video 430.0 --setze kontakt=19,rueckzug=21,ruhe=31
# Wurf (Hochformat): Mangel: kein Wurf im Profil (3/4- bis Frontalansicht), erstes Bild passt nicht genau zur Haltepose des Griffs
umsetzen wurf wurf/wurf_7.mp4 --loch 8 --kuerzen nein --ab 78 --bis 130 --faktor $H --ankerx-video 373.75 --setze heben=17,kontakt=29,rueckzug=39,ruhe=53
# Sprung und Sprungtritt (Hochformat)
umsetzen sprung sprung/sprung_7.mp4 --loch 8 --ankery unten --ereignis sprung --kuerzen nein --ab 78 --bis 135 --faktor $H --ankerx-video 379.0 --setze ruhe=58
umsetzen sprungtritt sprungtritt/sprungtritt_7.mp4 --loch 16 --ankery unten --ereignis sprung --kuerzen nein --ab 73 --bis 141 --ausser 91-102 --faktor $H --ankerx-video 358 --setze kontakt=17,rueckzug=21,ruhe=57
# Umgeworfen, Liegen, Aufstehen aus einem 10-s-Video (241 Bilder); --tol 70 gegen Grok-Schatten unter dem Körper
umsetzen umgeworfen umgeworfen_aufstehen/umgeworfen_aufstehen_7.mp4 --tol 70 --loch 14 --kuerzen nein --ab 106 --bis 150 --ankery unten --ereignis flug --faktor $Q --ankerx-video 435.25 --setze liegt=45
umsetzen liegen umgeworfen_aufstehen/umgeworfen_aufstehen_7.mp4 --tol 70 --loch 14 --kuerzen nein --ab 168 --bis 168 --ereignis keine --ankery unten --faktor $Q --ankerx-video 435.25
umsetzen aufstehen umgeworfen_aufstehen/umgeworfen_aufstehen_7.mp4 --tol 70 --loch 14 --kuerzen nein --ab 168 --bis 221 --ereignis aufstehen --ankery unten --ankerx uebergang --faktor $Q --ankerx-video 435.25 --setze ruhe=54
