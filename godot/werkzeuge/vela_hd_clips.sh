#!/bin/bash
# Setzt die gemalten Vela-Clips aus ihren Quellvideos (Grok, grüner Grund) im HD-Modus neu um.
# Die Befehle je Clip sind hier die einzige Quelle; die Begründungen stehen in docs/godot.md („Gemalte Vela“).
#
#   godot/werkzeuge/vela_hd_clips.sh <videoordner> [<hoehe>] [<ausordner>] [<clip> ...]
#
#   <videoordner>  Ordner mit den Quellvideos (liegen nicht im Repo):
#                    stand v4.mp4, kette1 vela_v_kette1_gemalt.mp4, sprint v3.mp4, sprung w1.mp4, sprungtritt w2.mp4,
#                    gehen v6.mp4, kette2 v7.mp4, kette3 v8.mp4, kette4 v9.mp4, umgeworfen/liegen/aufstehen v10.mp4,
#                    getroffen_vorn v12.mp4, griff v13.mp4, wurf v14.mp4
#   <hoehe>        Figur in Clipbildpixeln (Standard 360; 480 gemessen, siehe docs/godot.md „Höhe der gemalten Clips“). Die Figur
#                  ist im Spiel immer 284 Bildschirmpixel hoch (142 Basispixel · 2).
#   <ausordner>    Standard godot/grafik/vela_video; die Werte in clip.txt (Ereignisse, Ticks, schritt_px) bleiben bei jeder Höhe
#                  gleich, nur groesse, anker, fuss_fein, skala und hoehe ändern sich
#   <clip> ...     nur diese Clips umsetzen (Standard: alle, in der Reihenfolge unten); verschiedene Clips dürfen in
#                  verschiedenen Aufrufen zugleich laufen, derselbe Clip nicht zweimal
#
# Fußpunkt: Alle Clips außer sprint und gehen (`--ankerx mittel`: Mittelwert der Silhouette) und aufstehen (`--ankerx uebergang`: von der
# Lage im Liegen zur Fußmitte am Ende) sitzen auf der Mitte zwischen den Stiefeln der Kampfhaltung,
# `--ankerx-video` in Pixeln des Videos: 488.2 bei den 944-Pixel-Videos (vorderer Stiefel 666, hinterer 316), 479 bei den
# 960-Pixel-Videos von Sprung und Sprungtritt (Startbild mit 45 %; Stiefel 574,5 und 383). Mit dem vorderen Stiefel als Anker
# (Voreinstellung des Umsetzers bei der Kampfhaltung) stand Vela im Spielbild etwa 16 Spielpixel links vom Schatten.
# Maßstab: `--faktor 0.16996` für alle 944-Pixel-Videos (Kampfhaltung 142 Zeilen), `0.33023` für die 960-Pixel-Videos.
# Bildnummern (`--ab`, `--bis`, `--ausser`) sind Nummern der Videobilder (1-basiert), `--setze` zählt die behaltenen Bilder.
#
# Braucht Godot (Pfad in $GODOT, Standard /tmp/Godot_v4.7.2-stable_linux.x86_64) und ffmpeg; Laufzeit etwa 1,5 bis 3 Minuten je Clip.
set -e
V="${1:?Aufruf: vela_hd_clips.sh <videoordner> [<hoehe>] [<ausordner>] [<clip> ...]}"
H="${2:-360}"
AUS="${3:-godot/grafik/vela_video}"
shift 3 2>/dev/null || shift $# || true
WAHL=("$@")
G="${GODOT:-/tmp/Godot_v4.7.2-stable_linux.x86_64}"
U=("$G" --headless --path godot --script res://werkzeuge/video_umsetzer.gd --)
C=(--aus "$AUS" --hd --hoehe "$H")
M=0.16996
X=488.2

gewaehlt() { [ ${#WAHL[@]} -eq 0 ] && return 0; local c; for c in "${WAHL[@]}"; do [ "$c" = "$1" ] && return 0; done; return 1; }
umsetzen() { local clip="$1" video="$2"; shift 2; gewaehlt "$clip" || return 0; "${U[@]}" --video "$V/$video" --name "$clip" "${C[@]}" "$@"; }

umsetzen stand v4.mp4 --ab 40 --bis 86 --zyklus 47 --ankerx-video $X
umsetzen kette1 vela_v_kette1_gemalt.mp4 --kuerzen nein --ab 63 --bis 114 --ausser 70-95 --faktor $M --ankerx-video $X --setze kontakt=6,rueckzug=7,ruhe=24
umsetzen sprint v3.mp4 --ab 63 --bis 78 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --faktor $M
umsetzen sprung w1.mp4 --ankery unten --ereignis sprung --kuerzen nein --ab 47 --bis 142 --faktor 0.33023 --ankerx-video 479 --setze ruhe=95
umsetzen sprungtritt w2.mp4 --ankery unten --ereignis sprung --kuerzen nein --ab 55 --bis 143 --ausser 56-60,62,70-99,114 --faktor 0.33023 --ankerx-video 479 --setze kontakt=8,rueckzug=12,ruhe=50
# Ab 2026-10-08, zweite Lieferung (Grok-Videos 6 bis 11)
umsetzen gehen v6.mp4 --kuerzen nein --ab 93 --bis 117 --zyklus 25 --ereignis keine --ankerx mittel --faktor $M
umsetzen kette2 v7.mp4 --kuerzen nein --ab 46 --bis 126 --ausser 61-103 --faktor $M --ankerx-video $X --setze kontakt=14,rueckzug=15,ruhe=36
umsetzen kette3 v8.mp4 --kuerzen nein --ab 62 --bis 107 --ausser 75-94 --faktor $M --ankerx-video $X --setze kontakt=12,rueckzug=13,ruhe=24
umsetzen kette4 v9.mp4 --kuerzen nein --ab 34 --bis 123 --ausser 74-94 --faktor $M --ankerx-video $X --setze kontakt1=6,kontakt=39,rueckzug=40,ruhe=67
umsetzen getroffen_vorn v12.mp4 --kuerzen nein --ab 28 --bis 118 --ausser 48-88 --ereignis treffer --faktor $M --ankerx-video $X --setze start=1,kontakt=13,rueckzug=21,ruhe=48
umsetzen umgeworfen v10.mp4 --kuerzen ja --bis 90 --ankery unten --ereignis flug --faktor $M --ankerx-video $X
umsetzen liegen v10.mp4 --kuerzen nein --ab 120 --bis 120 --ereignis keine --ankery unten --faktor $M --ankerx-video $X
umsetzen aufstehen v10.mp4 --kuerzen nein --ab 172 --bis 252 --ereignis aufstehen --ankery unten --ankerx uebergang --faktor $M --ankerx-video $X
# Dritte Lieferung (Grok-Videos 13 und 14): Griff (Zugreifen, dann Haltepose) und Wurf (Heben, Wurf, Ausschwingen)
umsetzen griff v13.mp4 --kuerzen nein --ab 24 --bis 80 --ausser 36-58 --faktor $M --ankerx-video $X --setze kontakt=11,rueckzug=13,ruhe=32
umsetzen wurf v14.mp4 --kuerzen nein --ab 18 --bis 132 --ausser 60-66,86-104 --faktor $M --ankerx-video $X --setze kontakt=55,heben=42,rueckzug=62,ruhe=87
