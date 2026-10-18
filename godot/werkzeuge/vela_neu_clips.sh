#!/bin/bash
# Setzt die Clips der neuen Vela (realistischer Comic, blond, Grok-Videos) im HD-Modus um.
# Die Befehle je Clip sind hier die einzige Quelle; Prompts, Befunde und Auswahl stehen in docs/grok-prompts-vela-neu.md,
# docs/grok-prompts-vela-neu-angriffe.md und docs/grok-prompts-vela-gruen.md, die Einordnung in docs/godot.md («Gemalte Vela»,
# «Stand der Clips»).
#
#   godot/werkzeuge/vela_neu_clips.sh <videoordner> [<ausordner>] [<clip> ...]
#
#   <videoordner>  Ordner «vela» der geteilten Drive-Ablage «Comet Brawlers» (Videos liegen nicht im Repo). Zwei Lieferungen:
#                  - grün (seit 2026-10-18, Prompts docs/grok-prompts-vela-gruen.md): Unterordner Neu2/ mit den Dateinamen wie in
#                    Drive (kampfhaltung.mp4, gehen.mp4, laufen.mp4, schlag1.mp4, griff.mp4, sprung.mp4, sprungtritt.mp4 und
#                    «Umfallen, Liegen, Aufstehen/grok-video-141adc7b-fe4f-4b23-ad8a-c7579a2babba.mp4»);
#                  - weiß (2026-10-15 bis 10-17): Drive-Ordner vela/<ordner>/grok-video-d9db4961-8774-4dfa-aa5f-292ac6fa3ed6-<n>.mp4,
#                    erwartet umbenannt als <ordner>/<ordner>_<n>.mp4, z. B. kette3/kette3_7.mp4; kette2 und kette4 aus der zweiten
#                    Fassung des Prompts (Drive-Ordner kette2_2, kette4_2), wurf aus der dritten (wurf_3).
#   <ausordner>    Standard godot/grafik/vela_video (die Clips des Spiels)
#   <clip> ...     nur diese Clips umsetzen (Standard: alle)
#
# Grüne Videos (Modus gruen, Standard des Umsetzers): `--loch 255`, sonst werden eingeschlossene, beschattete Grünlücken (zwischen
# Pferdeschwanz und Nacken) wieder Figur und dunkel-türkis; alle Löcher im Modus gruen sind echter Grund (die Figur hat kein Grün).
# Maßstab `--faktor` = 142 / Zeilen der A-Pose in Bild 1: 0.1530 bei den quadratischen 944er-Videos (A-Pose Zeilen 0 bis 927, Startbild
# vela_gruen_start_voll.png), 0.1757 bei den Hochformat-Videos 832 × 1088 (sprung, sprungtritt, Umfallen; A-Pose 808 Zeilen).
# Weiße Videos: `--schluessel ecke --haarloch 60 --schatten 8` (weiße Haarlücken und grauer Bodenschatten), `--loch 8` (statt 24, sonst
# werden die hellen Lichter der Stahl-Armschienen durchsichtig); Maßstab 0.1529 (quadratisch, A-Pose 929 Zeilen).
# Welche Lieferung je Clip: grün, wo Bewegung und Anschluss an stand mindestens so gut sind wie weiß; weiß bei kette2 (grün ohne
# Rückzug, 3/4 frontal), kette3 (grün Schlag mit der hinteren Faust, schlechter Anschluss), kette4 (grün Tritt mit dem hinteren Bein,
# zusätzlicher Cross, Standfuß gleitet), getroffen_vorn (grün zuckt nach vorn statt zurück) und wurf (grün Armschienen in 12 Bildern
# dunkel gemalt, Start passt nicht an die Haltepose von griff). Befunde in docs/godot.md («Stand der Clips»).
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
CG=(--aus "$AUS" --hd --hoehe 360 --loch 255)
CW=(--aus "$AUS" --hd --hoehe 360 --schluessel ecke --haarloch 60 --schatten 8)
QG=0.1530
HG=0.1757
QW=0.1529
N="Neu2"
UM="$N/Umfallen, Liegen, Aufstehen/grok-video-141adc7b-fe4f-4b23-ad8a-c7579a2babba.mp4"

gewaehlt() { [ ${#WAHL[@]} -eq 0 ] && return 0; local c; for c in "${WAHL[@]}"; do [ "$c" = "$1" ] && return 0; done; return 1; }
gruen() { local clip="$1" video="$2"; shift 2; gewaehlt "$clip" || return 0; "${U[@]}" --video "$V/$video" --name "$clip" "${CG[@]}" "$@"; }
weiss() { local clip="$1" video="$2"; shift 2; gewaehlt "$clip" || return 0; "${U[@]}" --video "$V/$video" --name "$clip" "${CW[@]}" "$@"; }

# Stand: ruhige Kampfhaltung (Kinn eingezogen) Video 55 bis 84; das Atmen schließt keinen Zyklus, darum hin und her (30 Bilder,
# so viele verlangt der Video-Test; die Phase mit aufrechtem Kopf 114 bis 130 ist zu kurz)
gruen stand "$N/kampfhaltung.mp4" --ab 55 --bis 84 --zyklus 30 --schleife pingpong --ereignis keine --faktor $QG --ankerx-video 446.0
# Gehen: Doppelschritt 27 Bilder ab dem Aufsetzen der linken Ferse (Video 83); in 11 Bildern ist die Haarschlaufe über dem Haargummi
# am oberen Videorand abgeschnitten (Startbild füllt 97 % der Höhe)
gruen gehen "$N/gehen.mp4" --kuerzen nein --ab 83 --bis 109 --zyklus 27 --ereignis keine --ankerx mittel --faktor $QG
# Sprint: gleichmäßiger Lauf 99 bis 130 (ein Schritt 8 Bilder); Fenster mit dem besten Schluss
gruen sprint "$N/laufen.mp4" --ab 118 --bis 133 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --faktor $QG
# Kette 1: Jab mit der vorderen linken Faust, Kontakt Video 96 (Reichweite 68 Spielbildpixel), gestreckt gehalten bis 119 (weggelassen),
# Ruhe 135 (Vela richtet sich noch auf, 3/4 zur Kamera: kleiner Sprung beim Wechsel zu stand); die Finte 85 bis 91 liegt vor dem Fenster
gruen kette1 "$N/schlag1.mp4" --kuerzen nein --ab 91 --bis 135 --ausser 98-118 --faktor $QG --ankerx-video 436.5 --setze kontakt=6,rueckzug=8,ruhe=24
# Kette 2: zweite Fassung, Drive-Ordner kette2_2, Video 7 (Video 9 ist dieselbe Datei, Video 6 hält den Arm bis zum Schluss gestreckt):
# ruhige Kampfhaltung 60 bis 85, Kontakt 101 (Reichweite 75 Spielbildpixel), kurz gehalten, Ruhe 121 profilnah
weiss kette2 kette2_2/kette2_2_7.mp4 --loch 8 --kuerzen nein --ab 91 --bis 121 --ausser 103-106 --faktor $QW --ankerx-video 411.75 --setze kontakt=11,rueckzug=13,ruhe=27
# Kette 3: Haken von unten
weiss kette3 kette3/kette3_7.mp4 --loch 8 --kuerzen nein --ab 89 --bis 130 --ausser 101-119 --faktor $QW --ankerx-video 426.25 --setze ausholen=2,kontakt=11,rueckzug=13,ruhe=23
# Kette 4: zweite Fassung, kette4_2_8 (vordere Faust, Tritt mit dem vorderen Bein, Ruhe in Deckung wie stand); der erste Schlag (Video 28
# bis 46, noch in der Drehung) ist abgeschnitten, der Clip beginnt am Wendepunkt davor (Video 55). Keine Rückenansicht, kein Beinwechsel mehr;
# Reichweite Schlag 61, Tritt 64 Spielbildpixel; der Standstiefel gleitet noch 6,7 Spielbildpixel (bisher 15,6).
# Verworfen: kette4_2_6 (Rücken zur Kamera beim Tritt), kette4_2_7 (Arme hängen am Anfang und in der Ruhe, Ruhe 143 statt 137 hoch)
weiss kette4 kette4_2/kette4_2_8.mp4 --loch 8 --kuerzen nein --ab 55 --bis 145 --ausser 67-91 --faktor $QW --ankerx-video 425 --setze kontakt1=11,kontakt=41,rueckzug=42,ruhe=66
# Treffer von vorn: Kontakt = Oberkörper am weitesten zurück
weiss getroffen_vorn getroffen_vorn/getroffen_vorn_6.mp4 --loch 8 --kuerzen nein --ab 64 --bis 130 --ausser 65-70,87-97 --ereignis treffer --faktor $QW --ankerx-video 468 --setze start=1,kontakt=16,rueckzug=18,ruhe=48
# Griff: ruhige Kampfhaltung 54 bis 66, weiteste Streckung (Hände offen) Video 85 = Kontakt, Zupacken bis 93, gestreckt gehalten 94 bis 97
# (weggelassen), Zug 98 bis 108, stille Haltepose im Profil ab 121 (Fäuste dicht vor dem Kinn)
gruen griff "$N/griff.mp4" --kuerzen nein --ab 64 --bis 125 --ausser 94-97 --faktor $QG --ankerx-video 426.25 --setze kontakt=22,rueckzug=23,ruhe=54
# Wurf: dritte Fassung (Stoßwurf, Drive-Ordner wurf_3), wurf_3_6; Video 7 bis 9 breiten die Arme seitlich aus (T-Form). Beginnt in frontaler
# Deckung (Video 100; keines der Videos hat vor dem Stoß eine Haltepose im Profil), Zurücknehmen bis 112 (Ellbogen außen), Stoß mit beiden
# Händen im Profil, Kontakt 123 (Hände offen), Rückzug 128 (mindestens 5 Bilder nach dem Kontakt, sonst steht das Kontaktbild auch in uhr 23),
# Ruhe 140 (Kampfhaltung, 3/4); Fußpunkt = Stiefelmitte dieser Kampfhaltung
weiss wurf wurf_3/wurf_3_6.mp4 --loch 8 --kuerzen nein --ab 100 --bis 140 --faktor $QW --ankerx-video 418.25 --setze heben=13,kontakt=24,rueckzug=29,ruhe=41
# Sprung (Hochformat): tiefste Hocke 100, Absprung 107, Scheitel 116, Aufsetzen 127, Ruhe 144 (Vela richtet sich noch auf; die Füße stehen
# enger als in stand, beim Wechsel springen die Stiefel etwa 19 und 13 Spielbildpixel). Ohne 106 und 126: in 126 bleibt die Spitze der
# Grünlücke zwischen den Oberschenkeln als türkiser Fleck (Grün, das zur Jeans hin blau verläuft)
gruen sprung "$N/sprung.mp4" --ankery unten --ereignis sprung --kuerzen nein --ab 98 --bis 144 --ausser 106,126 --faktor $HG --ankerx-video 395 --setze ruhe=45
# Sprungtritt (Hochformat): Tritt mit dem vorderen linken Bein; tiefste Hocke 80, Absprung 87, Bein voll gestreckt 97 (Kontakt), schräg
# erhoben gehalten 98 bis 110 (zum Teil weggelassen), Aufsetzen 119, Ruhe 141
gruen sprungtritt "$N/sprungtritt.mp4" --kuerzen nein --ankery unten --ereignis sprung --ab 80 --bis 141 --ausser 98-107,110,114 --faktor $HG --ankerx-video 392.5 --setze kontakt=18,rueckzug=20,ruhe=50
# Umgeworfen, Liegen, Aufstehen aus einem 10-s-Video (241 Bilder; das zweite Video der Lieferung dreht den Rücken zur Kamera und springt
# hoch). Kampfhaltung ab 80, Treffer 86 (start; 81 ist ein Ausfallschritt nach vorn), Abheben 92, Landung 113 bis 115, ruhiges Liegen 127 bis
# 161, Aufstehen über das rechte Knie, Ruhe 215 (danach richtet sie sich gerade auf und dreht zur Kamera). Im Flug (Video 96 bis 113) sind
# Zopf und linke Hand am linken Videorand abgeschnitten (Hochformat statt 1:1)
gruen umgeworfen "$UM" --kuerzen nein --ab 80 --bis 127 --ankery unten --ereignis flug --faktor $HG --ankerx-video 365.5 --setze start=7,liegt=48
gruen liegen "$UM" --kuerzen nein --ab 161 --bis 161 --ereignis keine --ankery unten --faktor $HG --ankerx-video 365.5
gruen aufstehen "$UM" --kuerzen nein --ab 161 --bis 215 --ereignis aufstehen --ankery unten --ankerx uebergang --faktor $HG --ankerx-video 365.5 --setze ruhe=55
