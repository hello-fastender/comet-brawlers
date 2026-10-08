# Comet Brawlers: Fassung in Godot (Programm)

Stand 2026-10-07 (Auftrag 6, Entscheidung E26). Dieses Dokument beschreibt
den Port der vertikalen Scheibe nach Godot 4.7.2 mit GDScript: Aufbau,
Befehle, Tastenbelegung, Tests, Abweichungen und Lücken. Die
TypeScript-Fassung unter `spiel/` ist die Referenzimplementierung (nicht
löschen, nicht ändern); ihre Protokolle unter `spiel/tests/referenz/alle/`
sind der Prüfstein. Regeln für Arbeitssitzungen: `AGENTS.md`. Regeln für
die Übersetzung: `godot/PORTREGELN.md`. Bedienung, Bildtabelle und
Festlegungen der Scheibe stehen weiter in `docs/scheibe.md`; sie gelten
unverändert.

## Aufbau

```
godot/
  project.godot        Fenster 768 × 448, Stretch viewport, Filter nearest,
                       60 Physiktakte je Sekunde (höchstens 4 je Bild),
                       Renderer gl_compatibility, Hauptszene darstellung/spiel.tscn
  kern/                reiner Logikkern (RefCounted, keine Nodes, Festkomma 16.16),
                       35 Dateien; je Datei eine TypeScript-Datei von spiel/src/kern/
    figur/ gegner/     Unterordner wie in TypeScript
  pruef/               Prüflauf: eingabe, szene, protokoll, pruefung, lauf.gd
  darstellung/         Zeichnen, Anzeige, Debug, Tastatur, Sitzung, spiel.gd/.tscn,
                       Vela-Puppe (vela_puppe.gd, vela_posen.gd)
  werkzeuge/           foto.gd (Bildschirmfotos), kontakt.gd (Kontaktbögen),
                       umsetzer.gd (Teileblatt → Teile), ggf. film.gd (GIFs)
  tests/               alle.gd (Testlauf), vergleich.gd (Fehlersuche), Testmodule
  grafik/vela/         erzeugte Teile der Vela-Puppe und teile.txt
```

Der Kern liest keine Dateien und kennt keine Engine. Aller Zustand steht in
`KernWelt`; ein Logikschritt ist `KernWelt.logikSchritt(welt, tasten)`. Die
Darstellung liest den Kern nur. Klassennamen: `Kern<Pfad><Name>` im Kern,
`Pruef…` für den Prüflauf, `Darstellung…` für die Darstellung.

## Befehle

Godot laden (Cloud-Sitzung; Befehl und Version stehen in `AGENTS.md`), dann:

| Befehl | Wirkung |
|---|---|
| `godot --headless --path godot --import` | Klassenliste und Importe erzeugen (nötig nach neuen `class_name`-Dateien und im frischen Klon) |
| `godot --headless --path godot --script res://tests/alle.gd` | alle Tests: Grundlagen, Reinheit des Kerns, Darstellung, Vela-Puppe, alle 74 Szenen bitgleich, Determinismus; Exit 1 bei einer Abweichung. Argumente nach `--`: `--nur <Teil>` (Szenen), `--ohne-szenen` |
| `godot --headless --path godot --script res://pruef/lauf.gd -- --szene <datei> --eingabe <datei> --aus <ordner>` | Prüflauf, schreibt `protokoll.csv` und `objekte.csv` und gibt beide MD5 aus; Pfade ab der Repo-Wurzel (zum Beispiel `spiel/tests/szenen/T1.txt`) |
| `godot --headless --path godot --script res://tests/vergleich.gd -- --ist <datei> --soll <datei>` | erste abweichende Zeile mit Frame, Spaltenname und beiden Werten |
| `godot --path godot` | Spiel starten (Fenster); Argumente nach `--`: `--seed N`, `--debug`, `--szene <datei>`, `--eingabe <datei>`, `--schritte N`, `--pause`, `--ende`, `--platzhalter` (Rechtecke statt Vela-Puppe) |
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/foto.gd -- --szene <datei> --eingabe <datei> --nach 300,600 --aus docs/bilder/name` | Bildschirmfotos nach n Logikschritten (PNG `<aus>_<n:04d>.png`); unter `--headless` gibt es kein Rendering, deshalb Xvfb |
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/kontakt.gd -- --aus docs/bilder/godot_kontakt_vela.png` | Kontaktbogen der Vela-Puppe |
| `godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video <datei> --name <clip> [--hd]` | Video von Vela in eine Bildfolge umsetzen (Pixelmodus oder HD-Modus), siehe „Video-Umsetzer“ |
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/hd_vorschau.gd -- --ordner <clip> --aus docs/bilder/godot_hd_test.png` | Vorschau eines HD-Clips auf Grau und Weiß |

Das GitHub-Workflow `.github/workflows/godot-tests.yml` lädt Godot 4.7.2,
importiert das Projekt und führt `alle.gd` bei jedem Push auf `main` und
`grok/**` und bei jedem Pull Request aus.

## Tasten

Wie `docs/scheibe.md`: Pfeile = L R O U; Y oder Z = Angriff A (nach der Lage
der Taste); X = Sprung S; P = Pause (außerhalb der Logik); N = Einzelschritt
in der Pause; F1 = Debug-Anzeige; F2 = Eingabeaufzeichnung (Datei im Format
der Eingabedatei mit `# seed=N` im Kopf nach `user://aufzeichnung_<seed>.txt`);
F3 = Neustart mit Seed + 1. Ein Druck zwischen zwei Abfragen zählt noch in der
nächsten Abfrage (Festlegung K6). Nach GAME OVER und nach dem Ende der Scheibe
beginnt das Spiel neu mit Seed + 1.

## Spielschleife

`spiel.gd` führt in `_physics_process` einen Logikschritt je Tick aus (60 Hz,
höchstens 4 je Bild, E13); die Darstellung läuft in `_process` und liest nur.
Die Sitzungsklasse `DarstellungSitzung` (ohne Nodes) hält Welt, Quelle (Tastatur
oder Eingabedatei), Aufzeichnung und Pause; `spiel.gd` ist nur eine dünne
Hülle, damit Tests die Sitzung ohne Fenster treiben können. Zwei Zeichenebenen
(`Hinten`, `Vorn`) liegen um die Puppe der Figur herum, sortiert über
`z_index` (Hinten 0, Puppe 1 bis 24, Vorn 30).

## Tests

`alle.gd` (Laufzeit etwa 10 s): Festkomma, Zufall, Tasten, Eingabeparser,
Stage-Parser, Protokollformat, Reinheit von `godot/kern/` (sucht die Wörter
`float`, `Vector2`, `Rect2`, `randi`, `randf`, `Time.`, `OS.`, `signal`, auch in
Kommentaren), Darstellung (`darstellung_test.gd`: Zeichnen ändert die Welt
nicht, Vorführung mit Darstellung 600 Schritte gleich der Referenz), Vela-Puppe
(`vela_test.gd`, `vela_qa.gd`), Darstellung mit Puppe
(`puppe_protokoll_test.gd`), alle 74 Szenen byteweise gegen die Referenz,
Determinismus (zwei Läufe, gleiche MD5).

## Abweichungen und Lücken (nur Godot)

- `throw` der TypeScript-Fassung ist `push_error` mit demselben Text und einem
  unauffälligen Rückgabewert (GDScript kann Fehler nicht abfangen). Die
  `throws`-Tests der TypeScript-Fassung entfallen.
- Objektkonstanten (`BAHNEN`, `BOSS_BAHNEN`, `FLAECHE_AS/AN/KP`, Gehtempo) sind
  Funktionen, die frische Objekte liefern; Dictionary-Konstanten stehen in
  `werte.gd` (aus `werte.ts` erzeugt, Festkommawerte ausgerechnet).
- `fest.*`-Werte sind nur ganze Zahlen (das Wort `float` ist im Kern verboten).
- Reguläre Ausdrücke, `trim` und Leerraum von JavaScript sind in `KernStage`
  nachgebildet.
- `Array.sort` ist in GDScript nicht stabil; wo TypeScript sortiert, steht ein
  eigener Einfügesort.
- Die Stage-Dateien liegen unter `spiel/daten/stages/` außerhalb des
  Godot-Projekts (`spiel.gd`, Konstante `STAGE_ORDNER`); für einen Export
  müssen sie kopiert und die Konstante angepasst werden.
- Die Platzhalterbilder sind nicht pixelgleich zur Canvas-Fassung (Dreiecke und
  Ellipsen ohne Glättung als Fächer, Strichmuster 4/4 in Bildpixeln).
- Bildschirmfotos brauchen Xvfb und `gl_compatibility`.

## Grafik: Vela

Vela ist eine Cutout-Puppe aus echten Teilen des Grok-Teileblatts
(`spiel/grafik/quelle/fremd/vela/vela_t_teile.png`), geschnitten von
`werkzeuge/umsetzer.gd` (13 Teile, 64 Farben, Gesamthöhe 142 Bildpixel),
aufgebaut als `Skeleton2D` mit 16 Bones. Abgedeckt sind Stand, Gehen und die
Kette 1 bis 4; alle anderen Aktionen zeichnet der Platzhalter
(`DarstellungVelaPosen.abgedeckt`). Der Nutzer fand die erste Fassung der Puppe
zu starr (Vorbild Streets of Rage 4); der Stand der Überarbeitung (IK,
stufenlose Winkel, Federn, Prüfskript `vela_qa.gd`) und die offene
Entscheidung über den Weg für die Figuren (Puppe, PixelLab oder Videos) stehen
in `docs/rueckmeldungen/auftrag-6.md`.

## Video-Umsetzer (`werkzeuge/video_umsetzer.gd`)

Setzt ein Grok-Video von Vela (grüner Grund RGB 0, 177, 64, quadratisch, 24 Bilder/s) in eine Bildfolge
`godot/grafik/vela_video/<clip>/f_XXXX.(png|webp)` samt `clip.txt` (Zyklus, Ereignisse, Anker, Maßstab) um; geladen
von `darstellung/vela_frames.gd`, Zuordnung zur Aktionsuhr in `vela_frames_tabelle.gd`. Alle Optionen und der Ablauf
stehen im Kopfkommentar der Datei. Es gibt zwei Modi, die im Spiel gemischt vorkommen dürfen (jeder Clip wird mit seiner
Art gezeigt):

| | Pixelmodus (Standard) | HD-Modus (`--hd`) |
|---|---|---|
| Look | Pixelkunst, harte Kante | gemalt (Vorbild Streets of Rage 4), weiche Kante |
| Figur in den Dateien | 142 Zeilen (`--hoehe`) | 360 Zeilen (`--hoehe`, bis 600) |
| Farben | höchstens 63 + durchsichtig, PNG mit Palette | volle Farben, RGBA 8 Bit |
| Alpha | 0 oder 255 | 0 bis 255 (weicher Übergang, Standard 4 Arbeitspixel) |
| Dateien | `f_0001.png` (indiziert) | `f_0001.webp` (verlustfrei) oder `.png` (`--format png`) |
| clip.txt | wie bisher | zusätzlich `weich=1`, `format`, `skala`, `spielhoehe`, `fuss_fein`; `groesse` und `anker` in Dateipixeln |
| im Spiel | `TEXTURE_FILTER_NEAREST`, Maßstab 1 | `TEXTURE_FILTER_LINEAR`, Sprite-Maßstab `skala` (142 / 360 = 0,394) |

Befehle (Repo-Wurzel; Beispiel Clip `stand` aus dem Video `stand.mp4`):

```
godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video stand.mp4 --name stand --hd
godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video stand.mp4 --name stand --hd --hoehe 480 --format png
godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video kette1.mp4 --name kette1 --hd --massstab-von stand
```

HD-Optionen (alle anderen Optionen gelten unverändert): `--hd`; `--hoehe <n>` Figur in Dateipixeln (16 bis 600, Standard im
HD-Modus 360); `--spielhoehe <n>` Figur im Spiel in Bildpixeln der Logik (Standard 142); `--arbeit <p>` Arbeitsauflösung in
Prozent der `--hoehe` (Standard 150); `--kante <n>` Breite des weichen Übergangs in Arbeitspixeln; `--format webp|png`.
`--massstab-von <clip>` und `--faktor` liefern denselben Maßstab (Spielbildpixel je Videopixel) wie bei einem Pixel-Clip,
damit alle Clips die Figur gleich groß zeigen.

Wie der HD-Modus arbeitet:

1. Die Analyse (harte Maske, Rahmen, Anker, Kennzahlen, Zyklus, Ereignisse, Schrittlänge) läuft unverändert im
   Spielmaßstab (`--spielhoehe`). Die Zahlen in `clip.txt` (`schritt_px`, `ereignis_*`, `vorn`, `luft` …) sind daher in
   Spielbildpixeln und gleich denen des Pixelmodus; die Tabelle und die Logik merken keinen Unterschied. Eine Palette gibt
   es im HD-Modus nicht (`farben=0`).
2. Freistellen: Die harte Maske (nach Löchern füllen, Insel- und Staubentfernung, beides mit der Figurgröße im
   Arbeitsbild skaliert) legt fest, wo die Kante liegt. Nur beiderseits dieser Kante, im Band von `--kante` Pixeln, wird der
   Alpha weich berechnet: aus der Grün-Dominanz (g − max(r, b)) der Schlüsselfarbe; liegt das Pixel auf der Strecke
   Schlüsselfarbe–Figurfarbe der Nachbarn, zählt der Entmischungsanteil (blaue und rote Kleidung wird so am Rand nicht zu
   dick). Die Farbe wird entmischt (C = α · F + (1 − α) · K nach F aufgelöst; bei kleinem Alpha zählt die Figurfarbe der
   Nachbarn), Grün auf höchstens 92 % von max(r, b) begrenzt (Despill). Entfernter Staub und Inseln kommen nicht zurück.
3. Verkleinern mit vormultiplizierten Farben (Box-Filter, bei Vergrößerung bilinear): an der Kante blutet weder Grün noch
   Schwarz hinein. Jedes Bild nutzt dasselbe Gitter und dieselbe Verschiebung wie im Spielmaßstab, so sitzt der Anker genau.
   Danach Zuschnitt auf die Vereinigung aller Figuren plus 2 Pixel und ein Farbrand (die Farbe der Nachbarn unter Alpha 0),
   damit lineare Texturfilterung keinen dunklen Saum zeichnet.
4. Schreiben: `Image.save_webp_to_buffer(false)` (verlustfrei) oder `save_png_to_buffer()`; beides sind Bordmittel von
   Godot, ohne Zusatzwerkzeuge. WebP verlustfrei wird von Godot gelesen und importiert (`Image.load_webp_from_buffer`, im
   Spiel ohne Editor-Import) und ist pixelgenau gleich; die Farbe unter Alpha 0 (Farbrand) bleibt erhalten. Rund ein Viertel
   kleiner als PNG, deshalb Standard.

Speicher und Laufzeit (Messung am Testvideo, Figur 360 Zeilen, Bild 220 × 379):

- Dateigröße je Bild: etwa 66 bis 76 KB (WebP verlustfrei) gegenüber 87 KB (PNG); die Pixel-Clips haben im Mittel etwa
  4 KB je Bild. Ein Clip mit 50 Bildern sind also rund 3,3 bis 3,8 MB; die 14 vorhandenen Clips (rund 1030 Bilder) wären
  als HD rund 70 MB statt 8 MB. Breite Bilder (ausgestreckter Arm, 471 × 434 bei Höhe 420) bis zu 140 KB (PNG).
- Arbeitsspeicher im Spiel: RGBA8 = 4 Byte je Pixel, 220 × 379 sind 333 KB je Bild; der Abspieler hält das Bild und die
  Textur (Faktor 2), ein Clip mit 50 Bildern etwa 33 MB, alle vorhandenen Clips bei dieser Größe grob 700 MB. Die Clips
  werden erst beim ersten Gebrauch geladen; `clips_vergessen()` gibt sie frei. Mehr als 360 Zeilen kostet quadratisch.
- Laufzeit des Umsetzers: etwa 0,75 s je Bild bei einem Quellvideo mit 1024 × 1024 (Pixelmodus 0,2 s), 1,1 s je Bild bei
  1280 × 720 und Höhe 420; ein 6-Sekunden-Clip (144 Bilder) braucht also rund 2 bis 3 Minuten. Spitzenverbrauch an
  Arbeitsspeicher des Umsetzers bei 48 Bildern: 232 MB (Godot selbst eingerechnet).

Prüfungen: `tests/video_test.gd` prüft die Funktionen des HD-Modus an künstlichen Daten und setzt ein synthetisches Testvideo
um (aus `spiel/grafik/quelle/fremd/vela/vela_k_kampfhaltung_gruen_quadrat.png` mit Hüpfen, Skalierung und H.264, im
Scratch-Ordner `user://hd_test`, nicht im Repo; ohne ffmpeg wird der Teil übersprungen): Alpha hat Zwischenwerte, im Mittel
der Randpixel ist Grün nicht größer als max(Rot, Blau) + 4, höchstens 3 % der Randpixel mit deutlichem Grünanteil, mehr als
64 Farben, Höhe der Figur gleich der gewünschten ±2, im Spiel gleich hoch wie der Pixel-Clip desselben Videos, Fußpunkt zur
Figur wie im Pixelclip, im Spiel beide Arten mit dem jeweils richtigen Filter und Maßstab. Der Pixelmodus wurde vor und nach
der Änderung an drei Clips (Gehen und Kette 1 aus den Testvideos, Modus ecke mit Schwerpunktanker) neu umgesetzt: alle
Dateien (Bilder und `clip.txt`) bitgleich.

Vorschau (Bilder auf Grau und Weiß in Dateiauflösung, im Spielmaßstab ×2 und der Pixel-Clip daneben; `--rand` zusätzlich
ein 8-fach vergrößerter Kantenausschnitt):

```
xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/hd_vorschau.gd -- --ordner <clip-ordner> [--vergleich <pixel-clip-ordner>] [--bilder 1,4,7] --aus docs/bilder/godot_hd_test.png
```

`docs/bilder/godot_hd_test.png` zeigt das Ergebnis für ein Testvideo mit absichtlich weicher Quelle (gblur, H.264 CRF 24,
wie die weichen Kanten echter KI-Videos): oben HD in Dateiauflösung, Mitte HD im Spielmaßstab (×2 vergrößert), unten
der Pixelmodus desselben Videos. Kontaktbögen mit `video_bogen.gd` funktionieren auch für HD-Clips (Größe und Anker rechnet
`clip_lesen` in Spielbildpixel um), solange der Clip unter `godot/grafik/vela_video/` liegt.

Befund zur Kantenqualität (ehrlich): In Dateiauflösung sind die Kanten glatt, ohne Treppen und ohne Grünsaum, auch an
dünnen Haarsträhnen; an der Haarkante bleibt bei stark weicher Quelle bei 8-facher Vergrößerung ein dunkler, leicht
olivfarbener Saum aus der Mischung von dunklem Haar und Grün, im Spielmaßstab nicht sichtbar. Der dunkle Rand an Hose und
Handschuhen kommt aus dem Quellbild (Umrisslinie), nicht aus dem Freistellen. Echtes Grok-Material wurde noch nicht
umgesetzt; ungleichmäßiger Grund (Verlauf, Schatten auf dem Boden) und Bewegungsunschärfe an Armen sind ungeprüft.

Offene Punkte:

- **Basisauflösung des Spiels.** Das Fenster ist 768 × 448 (`DARSTELLUNG` = 2, Stretch `viewport`); die Figur ist 142 Bildpixel
  hoch. Ein HD-Clip wird deshalb auf 0,39 verkleinert und gewinnt gegenüber dem Pixelmodus nur weiche Kanten und volle
  Farben, nicht Schärfe (Bild: Mitte gegenüber oben). Für echtes HD muss die Basisauflösung angehoben werden (Viewport
  z. B. 1536 × 896 und `DARSTELLUNG` 4, dann der Sprite-Maßstab nahe 1: `--spielhoehe 284`), samt der übrigen Grafik der Szene
  (Hintergrund, Gegner), die noch Pixelkunst ist.
- Texturfilter: einfaches LINEAR bei Maßstab 0,39 ist scharf, kann aber bei Bewegung an dünnen Strukturen flimmern; Mipmaps
  (`TEXTURE_FILTER_LINEAR_WITH_MIPMAPS`) machten das Bild sichtbar unscharf und wurden verworfen. Bei Maßstab nahe 1 (nach
  der Anhebung der Basisauflösung) entfällt das Problem.
- Speicher: alle HD-Clips zugleich im Speicher sind zu viel (siehe oben); Entladen nach Gebrauch, kleinere Höhe oder nur ein
  Bild und die Textur halten (das Bild wird nur für Tests gebraucht) wären die Mittel.
- Die Bildunterschriften für Zyklus und Ereignisse benutzen im HD-Modus die ungeminderten Farben statt der Palette; für denselben
  Clip können die Zyklusgrenzen um ein Bild von denen des Pixelmodus abweichen.
- Weiche Quellen mit sehr breitem Übergang (mehr als `--kante` Pixel) verlangen eine größere `--kante`.

## Stand

Phase 0 bis 2 und 4 von Auftrag 6 erledigt; 74 von 74 Szenen bitgleich zur
TypeScript-Referenz; `alle.gd` grün. Offen: Abnahme der Leistung im Fenster
(60 Bilder je Sekunde, vom Nutzer zu bestätigen), die Entscheidung über den Weg
der Figurenanimation, Grafik der übrigen Figuren, Ton, Export.
