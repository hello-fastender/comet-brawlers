#!/bin/bash
# Setzt die Clips der neuen Vela (realistischer Comic, blond, Grok-Videos auf weißem Grund) im HD-Modus um.
# Die Befehle je Clip sind hier die einzige Quelle; Begründungen und Messungen stehen in docs/grok-prompts-vela-neu.md.
#
#   godot/werkzeuge/vela_neu_clips.sh <videoordner> [<ausordner>] [<clip> ...]
#
#   <videoordner>  Ordner mit den Quellvideos (liegen nicht im Repo): sprint laufen_v2.mp4
#   <ausordner>    Standard godot/grafik/vela_video_neu (noch nicht im Spiel eingehängt: die alten Clips bleiben, bis alle da sind)
#
# Maßstab: `--faktor 0.1533` = 142 Spielpixel / 926 Zeilen der aufrechten A-Pose im 944-Pixel-Video, für alle Clips gleich.
# Weißer Grund: `--schluessel ecke`. Bildnummern (`--ab`, `--bis`) sind Nummern der Videobilder, 1-basiert.
set -e
V="${1:?Aufruf: vela_neu_clips.sh <videoordner> [<ausordner>] [<clip> ...]}"
AUS="${2:-godot/grafik/vela_video_neu}"
shift 2 2>/dev/null || shift $# || true
WAHL=("$@")
G="${GODOT:-/tmp/Godot_v4.7.2-stable_linux.x86_64}"
U=("$G" --headless --path godot --script res://werkzeuge/video_umsetzer.gd --)
C=(--aus "$AUS" --hd --hoehe 360 --schluessel ecke)
M=0.1533

gewaehlt() { [ ${#WAHL[@]} -eq 0 ] && return 0; local c; for c in "${WAHL[@]}"; do [ "$c" = "$1" ] && return 0; done; return 1; }
umsetzen() { local clip="$1" video="$2"; shift 2; gewaehlt "$clip" || return 0; "${U[@]}" --video "$V/$video" --name "$clip" "${C[@]}" "$@"; }

# Video 2 von zwei: ab Bild 61 gleichmäßiger Sprint (Doppelschritt 15,6 Bilder); Bild 1 bis 60 sind A-Pose, Drehung und Anlauf
umsetzen sprint laufen_v2.mp4 --ab 61 --bis 145 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --faktor $M
