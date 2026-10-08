#!/bin/bash
# Setzt die fünf gemalten Vela-Clips (stand, kette1, sprint, sprung, sprungtritt) aus ihren Quellvideos neu um.
# Die Befehle stammen aus docs/godot.md („Gemalte Vela“); neu ist nur die Höhe als Parameter.
#
#   godot/werkzeuge/vela_hd_clips.sh <videoordner> [<hoehe>] [<ausordner>]
#
#   <videoordner>  Ordner mit v4.mp4 (stand), vela_v_kette1_gemalt.mp4 (kette1), v3.mp4 (sprint), w1.mp4 (sprung),
#                  w2.mp4 (sprungtritt); die Videos liegen nicht im Repo
#   <hoehe>        Figur in Clipbildpixeln (Standard 360; E28 hatte 480 vorgesehen, Messung in docs/godot.md,
#                  „Höhe der gemalten Clips“). Die Figur ist im Spiel immer 284 Bildschirmpixel hoch (142 Basispixel · 2).
#   <ausordner>    Standard godot/grafik/vela_video; die Werte in clip.txt (Ereignisse, Ticks, schritt_px) bleiben bei jeder Höhe
#                  gleich, nur groesse, anker, fuss_fein, skala und hoehe ändern sich
#
# Braucht Godot (Pfad in $GODOT, Standard /tmp/Godot_v4.7.2-stable_linux.x86_64) und ffmpeg; Laufzeit etwa 8 Minuten bei 480
# (die Clips laufen nacheinander im selben Temp-Ordner; nicht zwei Aufrufe zugleich mit demselben Clipnamen).
set -e
V="${1:?Aufruf: vela_hd_clips.sh <videoordner> [<hoehe>] [<ausordner>]}"
H="${2:-360}"
AUS="${3:-godot/grafik/vela_video}"
G="${GODOT:-/tmp/Godot_v4.7.2-stable_linux.x86_64}"
U=("$G" --headless --path godot --script res://werkzeuge/video_umsetzer.gd --)
C=(--aus "$AUS" --hd --hoehe "$H")
"${U[@]}" --video "$V/v4.mp4" --name stand "${C[@]}" --ab 40 --bis 86 --zyklus 47
"${U[@]}" --video "$V/vela_v_kette1_gemalt.mp4" --name kette1 "${C[@]}" --kuerzen nein --ab 63 --bis 114 --ausser 70-95 --faktor 0.16996 --ankerx-video 666 --setze kontakt=6,rueckzug=7,ruhe=24
"${U[@]}" --video "$V/v3.mp4" --name sprint "${C[@]}" --ab 63 --bis 78 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --massstab-von kette1
"${U[@]}" --video "$V/w1.mp4" --name sprung "${C[@]}" --ankery unten --ereignis sprung --kuerzen nein --ab 47 --bis 142 --faktor 0.33023 --ankerx-video 576 --setze ruhe=95
"${U[@]}" --video "$V/w2.mp4" --name sprungtritt "${C[@]}" --ankery unten --ereignis sprung --kuerzen nein --ab 55 --bis 143 --ausser 56-60,62,70-99,114 --faktor 0.33023 --ankerx-video 576 --setze kontakt=8,rueckzug=12,ruhe=50
