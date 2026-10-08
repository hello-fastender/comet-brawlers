# Comet Brawlers: Fassung in Godot (Programm)

Stand 2026-10-08 (Auftrag 6, Entscheidung E26; Auflösung 1536 × 896 nach E28, Speicher der Clips E27/E28). Dieses Dokument beschreibt
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
  project.godot        Spielbild 1536 × 896 (Viewport), Startfenster 1280 × 747, Stretch viewport (Seitenverhältnis
                       bleibt), Fenster frei skalierbar, Filter nearest, 60 Physiktakte je Sekunde (höchstens 4 je Bild),
                       Renderer gl_compatibility, Hauptszene darstellung/spiel.tscn
  kern/                reiner Logikkern (RefCounted, keine Nodes, Festkomma 16.16),
                       35 Dateien; je Datei eine TypeScript-Datei von spiel/src/kern/
    figur/ gegner/     Unterordner wie in TypeScript
  pruef/               Prüflauf: eingabe, szene, protokoll, pruefung, lauf.gd
  darstellung/         Zeichnen, Anzeige, Debug, Tastatur, Sitzung, spiel.gd/.tscn,
                       Vela-Puppe (vela_puppe.gd, vela_posen.gd), Vela aus Video-Clips (vela_frames.gd mit Laden nach Bedarf
                       und Speicherbudget, vela_frames_tabelle.gd)
  werkzeuge/           foto.gd (Bildschirmfotos), kontakt.gd (Kontaktbögen), umsetzer.gd (Teileblatt → Teile),
                       film.gd (Einzelbilder der Puppe), video_umsetzer.gd und video_bogen.gd (Videos → Clips, Prüfbögen),
                       hd_vorschau.gd, speicher_messung.gd und leistung.gd (Messungen)
  tests/               alle.gd (Testlauf), vergleich.gd (Fehlersuche), Testmodule (darstellung_test, vela_test, vela_qa,
                       video_test, speicher_test, puppe_protokoll_test)
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
| `godot --path godot` | Spiel starten (Fenster 1280 × 747, frei skalierbar, F11 Vollbild); Argumente nach `--`: `--seed N`, `--debug`, `--szene <datei>`, `--eingabe <datei>`, `--schritte N`, `--pause`, `--ende`, `--platzhalter` (Rechtecke statt Vela), `--puppe` (die Pixel-Puppe statt der Clips) |
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/foto.gd -- --szene <datei> --eingabe <datei> --nach 300,600 --aus docs/bilder/name` | Bildschirmfotos nach n Logikschritten (PNG `<aus>_<n:04d>.png`, 1536 × 896 aus `DarstellungZeichner`); lädt alle Clips sofort und ganz; unter `--headless` gibt es kein Rendering, deshalb Xvfb |
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/kontakt.gd -- --aus docs/bilder/godot_kontakt_vela.png` | Kontaktbogen der Vela-Puppe |
| `godot --headless --path godot --script res://werkzeuge/speicher_messung.gd -- --modus clips` | Speicher (RSS, static, Texturen) und Ladezeit je Clip; mit `--modus spiel --bilder 900` unter Xvfb: Nachladen im laufenden Spiel (Bild, ab dem jeder Clip bereit ist, Zeit je Bild) |
| `godot --headless --path godot --script res://werkzeuge/leistung.gd -- --modus logik` | Zeit je Logikschritt und Zeichenbefehle je Bild; `--modus bild` unter Xvfb: Zeit je gerendertem Bild (Software-Rendering, siehe „Auflösung und Leistung“) |
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
F3 = Neustart mit Seed + 1; F11 = Vollbild an und aus (das Spielbild bleibt 1536 × 896, `stretch viewport` hält das Seitenverhältnis, bei anderen
Fenstern entstehen Ränder). Ein Druck zwischen zwei Abfragen zählt noch in der
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

`alle.gd` (Laufzeit etwa 50 s): Festkomma, Zufall, Tasten, Eingabeparser,
Stage-Parser, Protokollformat, Reinheit von `godot/kern/` (sucht die Wörter
`float`, `Vector2`, `Rect2`, `randi`, `randf`, `Time.`, `OS.`, `signal`, auch in
Kommentaren), Darstellung (`darstellung_test.gd`: Zeichnen ändert die Welt
nicht, Vorführung mit Darstellung 600 Schritte gleich der Referenz), Vela-Puppe
(`vela_test.gd`, `vela_qa.gd`), Video-Clips (`video_test.gd`: Umsetzer, Zuordnung, Abspieler, Lage und Rand im Spielbild), Speicher der Clips
(`speicher_test.gd`: Laden nach Bedarf, Häppchen, Budget, Pixelverlust, Zielwert), Darstellung mit Puppe
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

## Auflösung 1536 × 896 (E28)

Entscheidung des Nutzers (2026-10-08, E28): Das Spielbild hat 1536 × 896 Bildpixel, Faktor 4 gegenüber den 384 × 224 Spielpixeln der Logik
(bisher 768 × 448, Faktor 2, E25). Die Logik, die Protokolle und der Kern sind unverändert (74 von 74 Szenen bitgleich).

| Teil | Umsetzung |
|---|---|
| `DarstellungMasse.DARSTELLUNG` | 4; daraus folgen der Zeichner (`BILDPIXEL_BREITE` 1536, `BILDPIXEL_HOEHE` 896), Anzeigeleiste und Schrift (5 × 7 und 3 × 5 als Blöcke zu 4 × 4 Bildpixeln, große Texte ×2 davon), Schatten, Hintergrundbänder, Debug-Anzeige, Kamera und Platzhalter; in Spielpixeln ändert sich nichts |
| `ASSET_BASIS` (2), `ASSET_ZU_BILD` (2) | Puppe, Pixel-Clips und HD-Clips sind in Basispixeln (768 × 448) vermessen; `clip.txt` (Größe, Anker, `skala`, `schritt_px`) und das Gehtempo der Puppe bleiben gültig. Die Puppe (`vela_puppe.gd`) und der Abspieler (`vela_frames.gd`) vergrößern sich selbst um `ASSET_ZU_BILD`, ganzzahlig (die Pixel-Figuren bleiben scharf, Filter NEAREST); Werkzeuge, die in Basispixeln zeichnen (Kontaktbögen, Filme), setzen `asset_zu_bild = 1` |
| `project.godot` | Viewport 1536 × 896, Stretch `viewport`, Seitenverhältnis `keep`, Startfenster 1280 × 747 (`window_width_override`, `window_height_override`, passt auf 1366 × 768), Fenster frei skalierbar |
| F11 | Vollbild an und aus (`DarstellungSitzung.vollbild_anfrage`, `spiel.gd`: `vollbildUmschalten`); bei anderem Seitenverhältnis des Schirms entstehen Ränder |
| `foto.gd` | Bildgröße aus `DarstellungZeichner`; `film.gd`, `kontakt.gd`, `video_bogen.gd`, `hd_vorschau.gd` behalten ihre Bogengrößen (Basispixel, `--zoom`), `hd_vorschau.gd` zeigt die Spielzeile jetzt direkt in der Größe des Spielbilds |

**Größe der Figur, Korrektur zu E28.** Die Figur ist 142 *Basispixel* hoch (die Pixel-Puppe und die Pixel-Clips sind 142 Zeilen hoch bei
768 × 448; der Umriss der Spezifikation für Vela ist 57 × 76 Spielpixel = 71 Spielpixel Figur), im Spiel bei 1536 × 896 also **284
Bildschirmpixel**, nicht 568. Ein Clip mit 360 Zeilen wird mit 284 / 360 = 0,79 gezeigt, also verkleinert, nicht 1,58-fach vergrößert.
Die Höhe von Vela im Bild blieb damit gleich (32 % der Bildhöhe); ein Spielbild mit 568 Pixel großer Vela (63 % der Bildhöhe) war
nicht gemeint.

**Höhe der gemalten Clips: 360 Zeilen bleiben, 480 nicht übernommen.** Weil die Annahme „1,58-fach vergrößert“ nicht zutrifft, wurde
gemessen, was 480 Zeilen (`--hoehe 480`) bringen würden. Alle fünf Clips wurden mit 480 neu umgesetzt (Befehle aus „Gemalte Vela“, nur
`--hoehe 480`, Ergebnis nicht im Repo; `werkzeuge/vela_hd_clips.sh <videoordner> 480` erzeugt sie neu) und im Spiel verglichen:

| | 360 Zeilen (im Repo) | 480 Zeilen |
|---|---|---|
| Maßstab im Spiel (Bildschirmpixel je Dateipixel) | 0,79 | 0,59 |
| Dateien der fünf Clips (stand / kette1 / sprint / sprung / sprungtritt) | 3,69 + 1,95 + 1,26 + 7,05 + 4,37 = 18,3 MB | 5,79 + 3,05 + 1,82 + 10,57 + 6,55 = 27,8 MB |
| Texturspeicher der fünf Clips (zugeschnitten, MiB) | 68,4 | 120,2 |
| Ladezeit je Bild (headless, Mittel) | 2,7 bis 4,6 ms | 4,1 bis 7,4 ms |

Bild `docs/bilder/godot_hd1536_clip_hoehen.png` (Stand mit 288, 360 und 480 Zeilen, Ausschnitt auf Kopf und Handschuhe, ×3) und
`docs/bilder/godot_hd1536_clip_hoehen_kette_sprung.png` (Kette 1 und Sprung mit 360 und 480, ×2): 480 ist bei Kette 1 und Stand sichtbar
knackiger (Haarsträhnen, Schnalle, Nähte der Handschuhe), aber nur im vergrößerten Ausschnitt; beim Sprung, dessen Quellvideo die
Figur nur 433 Pixel hoch zeigt, gibt es keinen erkennbaren Unterschied (die Umsetzung vergrößert dort das Arbeitsbild von 429 auf 480
Zeilen, ohne neue Bildinformation). 288 Zeilen (1 : 1) sind merklich weicher. Das Speicherziel von etwa 100 MB für die fünf Clips (E27)
erfüllt 360 (68 MB), 480 überschreitet es (120 MB, am Renderer-Zähler rund 160 MB). Deshalb gilt 360. Wer 480 will:
`werkzeuge/vela_hd_clips.sh <videoordner> 480`, die Tests prüfen die Skala (`0,3 bis 0,5`) und müssten auf 0,2958 angepasst werden;
für Sprint wählte die Suche bei 480 nur 15 statt 16 Bilder (Bild 63 wird als unscharf abgeschnitten), das wäre mit `--ab 62` zu prüfen.
Die Befehle in „Gemalte Vela“ und das Skript erzeugen die 360-Clips des Repos bitgleich (geprüft am 2026-10-08).

**Pixel-Clips und Puppe.** `gehen`, `kette2` bis `kette4`, `getroffen_vorn`, `umgeworfen`, `liegen`, `aufstehen` und die Puppe sind
2× vergrößert (NEAREST): jedes Pixel der Grafik ist 2 × 2 Bildschirmpixel, die gemalte Vela hat die feine Auflösung eines Bildschirmpixels.
Der Stilbruch Pixel gegen gemalt ist damit deutlicher als bei 768 × 448 (Bild `godot_hd1536_pixel_und_gemalt.png`: Gehen, Kette 2 bis 4 als Pixel, Kette 1 und Stand gemalt). Geprüft: Keiner der Clips berührt den Rand seines Dateibildes (nichts abgeschnitten, `speicher_test.gd`), der
Abspieler sitzt am Fußpunkt der Logik, und im Spiel liegt keine Textur außerhalb des Spielbildes (`video_test.gd`, Vorführung).

**Befund (vorbestehend, nicht geändert): Anker der gemalten Clips.** Der Anker der Clips liegt auf der Mitte der untersten 6 Zeilen des ersten
Bildes, in der Kampfhaltung also auf dem vorderen Stiefel (der hintere steht höher). Gemessen (Mitte der unteren 76 Dateizeilen gegen `fuss_fein`):
bei `stand`, `kette1` und `sprung` liegt der Anker 32 bis 37 Basispixel (16 bis 18 Spielpixel, 65 bis 74 Bildschirmpixel) rechts von der Fußmitte,
bei `sprint` 11 (`--ankerx mittel`), bei den Pixel-Clips `gehen`, `kette2` bis `kette4` höchstens 2,5 Basispixel im ersten Bild. Die gemalte Vela steht
also im Spielbild links vom Schatten (Bilder `vorfuehrung_0300.png`, `kette1_streifen.png`, `sprung_streifen.png`), und beim Wechsel zwischen gemalten
und Pixel-Clips (Stand → Gehen, Kette 1 → Kette 2) springt sie um rund 50 Bildschirmpixel (`pixel_und_gemalt.png`, Tick 166 gegen 184). Die Logik
(Trefferfläche, Schatten) ist um den Fußpunkt zentriert. Das ist kein Fehler der Auflösung (bei 768 × 448 war es genauso, halb so groß). Behebung: die Clips
mit `--ankerx-video` auf die Mitte zwischen den Füßen neu umsetzen (`werkzeuge/vela_hd_clips.sh`) oder `anker` und `fuss_fein` in `clip.txt` um 32 Dateipixel-Äquivalente nach
links verschieben; dann stimmt auch der Test `video_test.gd` für `stand` (`ankerx` = Mitte der untersten 6 Zeilen) nicht mehr und muss angepasst werden. Das ist eine Entscheidung
über die Lage der Figur zur Trefferfläche und wurde deshalb nicht still geändert.

**Leistung (was sich messen lässt).** Die Logik ist unverändert; `werkzeuge/leistung.gd`:

- Zeit je Logikschritt (Kern, Vorführung, 6000 Schritte, Dummy-Renderer): im Mittel 0,59 ms, größter 4,95 ms, bei 16,67 ms je Tick.
- Zeichenbefehle je Bild: im Mittel 408, CPU-Zeit zum Erzeugen 1,5 ms; die Zahl der Befehle hängt nicht vom Faktor ab (die Zeichnung geht in Spielpixeln
  in den Zeichner), nur die zu füllende Fläche wächst auf das Vierfache.
- Zeit je gerendertem Bild unter Xvfb mit Software-Rendering (llvmpipe, vier Kerne, 600 Bilder, ohne Takt): 768 × 448 im Mittel 12,5 bis
  13,0 ms (95 % 17 bis 19 ms), 1536 × 896 im Mittel 26,8 bis 27,1 ms (95 % 33,6 ms). **Das sagt nichts über eine echte GPU**: llvmpipe
  rechnet auf der CPU, die Füllrate ist dort der Engpass; auf einer GPU kostet ein Bild von 1,4 Megapixeln mit einigen hundert Rechtecken und einem
  Sprite wenig. Ob das Spiel auf dem Rechner des Nutzers mit 60 Bildern je Sekunde läuft, muss er selbst bestätigen (Fenster 1280 × 747 und
  Vollbild, F1 zeigt die Debug-Anzeige).

Belege (alle `docs/bilder/godot_hd1536_*`): `vorfuehrung_0300.png` und `vorfuehrung_0900.png` (Spielbild 1536 × 896, Vorführung nach
300 und 900 Schritten), `kette1_streifen.png` und `sprung_streifen.png` (Tick-Streifen im Spiel, Szene `werkzeuge/hd_film/`), `vergleich_vorher_nachher.png` (dieselbe
Szene bei 768 × 448 und 1536 × 896, Ausschnitt: links vorher ×4, rechts nachher ×2), `platzhalter_0600.png` (`--platzhalter`), `clip_hoehen*.png`, `pixel_und_gemalt.png` (Pixel-Clips neben gemalten, 2 × 2-Pixel-Blöcke).

Beurteilung (ehrlich, nach Ansicht der Bilder):

- Schärfe: Die gemalte Vela ist bei 1536 × 896 deutlich schärfer als bei 768 × 448 (Gesicht, Handschuhe, Nähte, Haare im Vergleichsbild); die
  Kanten sind glatt, kein Grünsaum. Gegenüber der Quelle ist sie mit 0,79 leicht verkleinert, die Schärfe ist gut, nicht „knackig“.
- Stilbruch: Der Unterschied zwischen der feinen gemalten Vela und allem anderen ist größer geworden. Hintergrund, Gegner, Behälter und Anzeige sind flache
  Farbflächen (Platzhalter) bzw. Pixelschrift in 4 × 4-Blöcken; die Pixel-Clips (Kette 2 bis 4, Gehen, Getroffen) sind 2 × 2-Pixelkunst. Zwischen
  gemalten und Pixel-Clips in einer Folge (Kette 1 → 2, Stand → Gehen) wechselt die Auflösung sichtbar. Das lässt sich erst mit gemalten
  Clips für die übrigen Aktionen und mit Gegner- und Hintergrundgrafik lösen.
- Lesbarkeit der Anzeige: Die Pixelschrift (Name, Punkte, Leben, Namen der Gegner) ist in 4 × 4-Blöcken gut lesbar und groß; der Debug-Text (3 × 5, 12 × 20 Pixel je
  Zeichen) bedeckt viel Fläche, ist nur für die Fehlersuche gedacht. Nichts wird am Rand abgeschnitten (HUD und Texte liegen in Spielpixeln und wurden nicht verschoben).
- Farbfehler der Quellen (olivgrünes Haar, rosa Streifen) sind bei der Vergrößerung deutlicher sichtbar (Sprungstreifen, Tick 334 und 370); Nachbestellung der betroffenen
  Bilder wäre besser als das Weglassen.

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
| im Spiel | `TEXTURE_FILTER_NEAREST`, Maßstab 1 · `ASSET_ZU_BILD` (2) | `TEXTURE_FILTER_LINEAR`, Sprite-Maßstab `skala` (142 / 360 = 0,394) · `ASSET_ZU_BILD` (2) = 0,789 Bildschirmpixel je Dateipixel |

Befehle (Repo-Wurzel; Beispiel Clip `stand` aus dem Video `stand.mp4`):

```
godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video stand.mp4 --name stand --hd
godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video stand.mp4 --name stand --hd --hoehe 480 --format png
godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- --video kette1.mp4 --name kette1 --hd --massstab-von stand
```

HD-Optionen (alle anderen Optionen gelten unverändert): `--hd`; `--hoehe <n>` Figur in Dateipixeln (16 bis 600, Standard im
HD-Modus 360); `--spielhoehe <n>` Figur im Spiel in Basispixeln (Bildpixeln bei 768 × 448, Standard 142; im Spiel 1536 × 896 sind das 284 Bildschirmpixel, siehe „Auflösung 1536 × 896“); `--arbeit <p>` Arbeitsauflösung in
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
- Arbeitsspeicher im Spiel: RGBA8 = 4 Byte je Pixel, 220 × 379 sind 333 KB je Bild, ein Clip mit 50 Bildern etwa 17 MB, mehr
  als 360 Zeilen kostet quadratisch. Seit E27/E28 hält der Abspieler nur die zugeschnittene Textur (nicht mehr das Image) und
  lädt Clips nach Bedarf, siehe „Speicher der Clips“.
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

- **Basisauflösung des Spiels** (erledigt mit E28): Das Spielbild ist 1536 × 896 (`DARSTELLUNG` = 4), die Figur 284 Bildschirmpixel
  hoch; ein 360-Zeilen-Clip wird mit 0,79 gezeigt (verkleinert, nicht vergrößert), siehe „Auflösung 1536 × 896“.
- Texturfilter: einfaches LINEAR ist bei Maßstab 0,79 (E28) ohne Mipmaps scharf; bei größerer Dateihöhe (480 Zeilen, Maßstab 0,59)
  nimmt das Verkleinern ohne Mipmaps Texel aus, das Bild wirkt etwas „knackiger“, kann an dünnen Haaren aber stärker flimmern.
  Mipmaps (`TEXTURE_FILTER_LINEAR_WITH_MIPMAPS`) machten das Bild bei 0,39 sichtbar unscharf und wurden verworfen (bei 0,79
  nicht neu geprüft).
- Speicher (erledigt mit E27/E28): Textur ohne Image, Zuschnitt, Laden nach Bedarf, Budget mit LRU, siehe „Speicher der Clips“.
- Die Bildunterschriften für Zyklus und Ereignisse benutzen im HD-Modus die ungeminderten Farben statt der Palette; für denselben
  Clip können die Zyklusgrenzen um ein Bild von denen des Pixelmodus abweichen.
- Weiche Quellen mit sehr breitem Übergang (mehr als `--kante` Pixel) verlangen eine größere `--kante`.

## Gemalte Vela (HD-Clips im Spiel, 2026-10-08)

Entscheidung des Nutzers (2026-10-08): Vela gilt im gemalten Stil. Fünf gemalte Grok-Clips ersetzen die Pixel-Clips derselben
Handlung; alle übrigen Clips (`gehen`, `kette2` bis `kette4`, `getroffen_vorn`, `umgeworfen`, `liegen`, `aufstehen`) bleiben
vorerst Pixel. Der gemischte Betrieb (jeder Clip mit seiner Art: LINEAR und Skala bei HD, NEAREST und Maßstab 1 bei Pixel)
ist getestet. Die Quellvideos liegen nicht im Repo.

Befehle (Repo-Wurzel, `U` = `godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd --`, immer
`--aus godot/grafik/vela_video --hd --hoehe 360`):

| Clip | Video | Aufruf (zusätzlich) | Bilder | Dateien |
|---|---|---|---|---|
| `stand` | `v4.mp4` | `--ab 40 --bis 86 --zyklus 47` (das Werkzeug fand n = 47, Start 39, Güte 80 %: ein Atemzyklus) | 47 | 3,69 MB |
| `kette1` | `vela_v_kette1_gemalt.mp4` | `--kuerzen nein --ab 63 --bis 114 --ausser 70-95 --faktor 0.16996 --ankerx-video 666 --setze kontakt=6,rueckzug=7,ruhe=24` | 26 | 1,95 MB |
| `sprint` | `v3.mp4` | `--ab 63 --bis 78 --zyklus 16 --ereignis keine --ankerx mittel --schritt lauf --massstab-von kette1` | 16 | 1,26 MB |
| `sprung` | `w1.mp4` | `--ankery unten --ereignis sprung --kuerzen nein --ab 47 --bis 142 --faktor 0.33023 --ankerx-video 576 --setze ruhe=95` | 96 | 7,05 MB |
| `sprungtritt` | `w2.mp4` | `--ankery unten --ereignis sprung --kuerzen nein --ab 55 --bis 143 --ausser 56-60,62,70-99,114 --faktor 0.33023 --ankerx-video 576 --setze kontakt=8,rueckzug=12,ruhe=50` | 52 | 4,37 MB |

Zusammen 18,3 MB (die Zwischenstände der Testläufe mit allen Bildern waren 46 MB). Was weggelassen wurde und warum:

- `stand`: nur ein Atemzyklus (Start Videobild 40 bis 86), die Tabelle spielt ihn in Echtzeit (47 Bilder bei 24 Bildern/s = 118 Ticks)
  als Schleife. Der Schließfehler liegt bei 142 % eines Bildschritts; im Spiel (Tick 61 bis 155, Naht bei Tick 119 auf 120)
  ist der mittlere Helligkeitsunterschied zwischen aufeinanderfolgenden Ticks überall höchstens 1,4 Stufen, an der Naht
  nicht größer als sonst: kein sichtbarer Sprung.
- `sprint`: ein Doppelschritt aus 16 Bildern (Video 63 bis 78, Schließfehler 83 % eines Bildschritts; mit Video 62 bis 77 wären
  es 24 %, aber Bild 62 ist unscharf und wurde vom Umsetzer als Anfang abgeschnitten). Die automatische Zyklussuche war unsicher
  (Güte 49 %, n = 8); die Wahl n = 16 stammt vom Betrachten der Bilder (Kontaktbogen: Pose in Bild i und i + 16 gleich,
  i + 8 gegenphasig). `schritt_px` = 93 Spielpixel je Doppelschritt: die Tabelle läuft nach der Strecke, die Füße rutschen nicht.
- `kette1`: das Video beginnt erst zwei Bilder vor dem Ausholen-Ende (die Tabelle zeigt vorher nichts), der gestreckte Arm
  ist nur mit je zwei Bildern am Anfang und Ende des Haltens da (`--ausser 70-95`). Weil der Clip nicht in der Kampfhaltung
  beginnt, findet die Suche keine Ruhe und meldet „rueckwaerts“; `--setze ruhe=24` setzt sie von Hand und der Umsetzer macht
  dann `rueckkehr=vorwaerts` (neu im Umsetzer). `--ankerx-video 666` ist die Fußmitte der Kampfhaltung im Video, nicht des
  ersten Bildes, damit der Fuß im Spiel beim Wechsel stand ↔ kette1 nicht springt.
- `sprung`: ohne die Wartezeit vor der Hocke (ab Videobild 47, die Kampfhaltung steht davor), bis zur aufgerichteten
  Kampfhaltung (`ruhe`, Videobild 142). `--faktor 0.33023` und `--ankerx-video 576` halten Größe und Fußmitte der Kampfhaltung:
  das erste Bild ist schon in der Hocke, der Maßstab dürfte nicht aus ihm kommen (sonst 0,449: Vela zu groß).
- `sprungtritt`: die fünf Bilder mit Farbwechsel kurz vor dem Absprung (Videobild 56 bis 60: rötliches Haar, lila Handschuhe,
  dunklere Jacke, ein verschmiertes Bild) sind entfernt, ohne dass die Bewegung ruckelt (Hocke Bild 55, danach gleich Luft,
  24 Bilder/s). Ebenso zwei weitere Einzelbilder mit Farbfehler (62 olivgrünes Haar, 114 Regenbogenstreifen am Ärmel) und die
  30 Haltebilder des gestreckten Beins (70 bis 99). Das Bild 66 mit olivgrünem Anflug an der Hose blieb, weil es das einzige
  Zwischenbild der Streckung ist (ohne es springt das Bein in einem Bild).

Abbildung Logik → Bild (`darstellung/vela_frames_tabelle.gd`):

| Aktion | Clip | Zeitbezug |
|---|---|---|
| STAND | `stand` | Schleife in Echtzeit (118 Ticks) |
| SPRINT | `sprint` | Schleife nach der zurückgelegten Strecke (`schritt_px` 93) |
| SCHLAG, LEERSCHLAG Stufe 1 | `kette1` | uhr 1: Bild zwischen Ausholen-Ende und Kontakt; Trefferfenster `KETTE_AKTIV_VON` 2 bis `KETTE_AKTIV_BIS` 5: das Kontaktbild (steht im ersten aktiven Frame, hält bis zum letzten, damit auch im Trefferstopp); danach Rückzug bis zur Ruhe im letzten Tick (16) |
| SPRUNG | `sprung` | uhr 1 Hocke, uhr 2 bis 21 Absprung bis Scheitel (Bild 29 auf dem Scheitelframe), 22 bis 41 bis zum letzten Luftbild; nach einem Sprungangriff H/T aus der Sprunguhr, die aus `vh` folgt |
| LANDUNG | `sprung` | 6 Ticks vom Aufsetzbild (Bild 52) bis zur aufgerichteten Haltung (Bild 95) |
| SPRUNGANGRIFF N, R | `sprungtritt` | uhr 1 bis 4: Absprungbild bis vor den Kontakt; Trefferfenster uhr 5 bis 28 (`KernWerte.SPRUNGANGRIFF`): das Kontaktbild (Bein voll gestreckt); danach Rückzug bis zum letzten Luftbild im letzten Luftframe (J+41, die Dauer folgt aus der Sprunguhr); bei spätem Angriff steht das Kontaktbild bis zur Landung |
| LANDUNG nach SPRUNGANGRIFF N, R | `sprungtritt` | dieselbe Landung aus dem Tritt-Clip (`sprung_angriff` bleibt bis zum nächsten Sprung gesetzt) |
| SPRUNGANGRIFF H, T | – | kein Clip, Platzhalter (siehe offene Punkte) |

Der Sprung: Die Logik hebt die Figur (`h` aus `KernWerte`, Scheitel 51,25 px), das Bild zeigt nur die Haltung; der Anker
liegt auf der untersten Figurzeile jedes Bildes (`--ankery unten`), der Schatten bleibt am Boden. Der Kern kennt den
Sprungangriff (`SPRUNGANGRIFF`, Varianten N neutral, R Richtung, H hoch, T runter, Kampf 5.2), die Tabelle ruft den Clip
deshalb für N und R. Der Kern wurde nicht angefasst.

Anker und Skala: Der Fußpunkt (`fuss_fein`) liegt auf der Fußmitte der Kampfhaltung, `skala` rund 0,3944 (Figur 142 Spielpixel bei
360 Dateizeilen); bei `sprung` und `sprungtritt` stammt der Maßstab (0,3302 Spielbildpixel je Videopixel) aus dem Startbild mit
der Figur auf 45 % der Bildhöhe, `stand` hat 0,16937 und `kette1`/`sprint` 0,16996 (0,35 % Unterschied: die Figur ist im Stand ein
halber Bildpixel kleiner, nicht sichtbar).

Speicher: Dateien 18,3 MB (oben; dezimal gezählt, 17,5 MiB). Im Arbeitsspeicher
halten die fünf Clips seit E27/E28 nur noch die zugeschnittenen Texturen: 68 MB statt 256 MB (siehe „Speicher der Clips“).

Belege (Spielszene mit Gerüst-Bühne, Vela von der Logik getrieben; Eingabe `werkzeuge/hd_film/`): GIFs je Clip
`docs/bilder/godot_hd_spiel_{stand,kette1,sprint,sprung,sprungtritt}.gif` (jeder zweite Tick, 30 Bilder/s = Echtzeit; Bild für
Bild aus `foto.gd`, ausgeschnittene Streifen mit Tick-Nummern `…_streifen.png`) und der Vergleich Pixel-Puppe gegen
gemalt auf derselben Szene `godot_hd_spiel_vergleich_arena.png` (oben Puppe links, gemalt rechts) und
`godot_hd_spiel_vergleich_vorfuehrung_0300.png` (links Platzhalter, rechts gemalt im Sprung). Aufruf: `foto.gd -- --szene
godot/werkzeuge/hd_film/szene.txt --eingabe godot/werkzeuge/hd_film/eingabe.txt --nach 20,21,… --aus <ordner>/f`, danach ffmpeg
(`foto.gd` hat neu `--puppe`: die Pixel-Puppe statt der Clips).

Beurteilung (ehrlich):

- Größe: Vela ist im Spiel so hoch wie die Pixel-Puppe (142 Spielpixel plus Zopf), neben den Platzhalter-Gegnern (Kästen
  114 × 130) passend. Es gibt noch keine Gegnergrafik; ein Stilbruch zu den Pixel-Gegnern lässt sich daher nicht beurteilen.
  Gegen den Pixel-Hintergrund steht die gemalte Vela mit weichen Kanten und feinen Details deutlich anders (sie wirkt
  „höher aufgelöst“ als alles um sie); das ist im Bild oben sichtbar und die erwartete Folge des gemischten Betriebs.
- Kanten: sauber, kein Grünsaum, auch am Zopf; bei Maßstab 0,39 und LINEAR keine sichtbaren Treppen.
- Zeit (an den Streifen mit 3 bis 4 Ticks Abstand und an Einzelbildern geprüft, die GIFs nicht Bild für Bild): Stand atmet
  ruhig ohne Flimmern (jedes Bild rund 2,5 Ticks); Kette 1: schneller Auszug, Kontaktbild im Trefferfenster, weicher
  Rückzug, der Übergang in den Stand springt nicht (der Fuß bleibt stehen); Sprint: keine Sprünge der Pose erkennbar,
  die Füße gleiten nicht; Sprung: die Hocke ist nur einen Tick lang (Logik: uhr 1), danach folgt gleich das Streckungsbild mit
  hochgerissenen Armen; Sprungtritt: das Bein streckt sich in den ein bis zwei Ticks vor dem Fenster und steht dann voll.
- Posenwechsel: Aus dem Sprung-Clip (vor dem Angriff) in den Sprungtritt-Clip wechselt die Haltung hart (je nach Zeitpunkt
  des Angriffs, Sprunguhr 2 bis 37), weil beide Clips unabhängig gemalt sind; die Logik lässt den Angriff in jedem Frame zu.
- Farbfehler in den Quellen: einzelne Bilder in `sprung` und `sprungtritt` haben abweichende Farben (olivgrünes Haar,
  dunkelgrüne Handschuhe, rosa Streifen an der Jacke), je höchstens drei Ticks sichtbar; Nachbestellung oder Retusche wäre
  sauberer als das Weglassen (Einzelbilder wurden dort entfernt, wo es ohne Ruckeln ging).

Offene Punkte:

- SPRUNGANGRIFF H (hoch) und T (runter) haben keinen gemalten Clip und zeigen den Platzhalter; SPRINTSPRUNG ebenso.
- `kette2` bis `kette4`, `gehen`, `getroffen_vorn`, `umgeworfen`, `liegen`, `aufstehen` sind noch Pixel (Stilbruch in Folgen
  wie Kette 1 → 2: gemalt → Pixel; Stand → Gehen).
- Arbeitsspeicher wächst mit jedem weiteren HD-Clip (68 MB für fünf, rund 104 MB für alle 13 Clips, Pixel-Clips eingerechnet); das
  Budget von 128 MB entlädt den am längsten ungenutzten Clip, wenn mehr zusammenkommt (siehe „Speicher der Clips“).
- Hocke und Absprung: die Hocke des Sprungs ist im Clip lang, in der Logik ein Tick; ein sichtbarer Anlauf bräuchte
  Spielraum in der Logik (nicht Aufgabe der Darstellung).

## Speicher der Clips (E27/E28, Teil A)

Ziel: deutlich weniger Arbeitsspeicher für die gemalten Clips ohne Ruckler. Alle Zahlen in MiB (1048576 Byte); Code `darstellung/vela_frames.gd`,
Tests `tests/speicher_test.gd` (122 Prüfungen), Messung `werkzeuge/speicher_messung.gd`.

Vorher (jedes Bild als Image und als Textur, alle Clips beim ersten Gebrauch ganz geladen): fünf gemalte Clips (360 Zeilen) 122,3 MB Images
(Prozess `MEMORY_STATIC` +122) und 162,5 MB Texturen am Renderer-Zähler (`RENDER_TEXTURE_MEM_USED`), im Prozess (RSS unter Xvfb) +247 MB, unter
`--headless` +122 MB; Laden des Sprungs allein 0,8 s am Stück (8 ms je Bild unter Xvfb), der Rest 2 ms je Bild headless.

Maßnahmen:

1. **Textur statt Image.** Nach `ImageTexture.create_from_image` wird das Image verworfen. Wer Pixel braucht (Tests, Werkzeuge), liest das Bild mit
   `DarstellungVelaFrames.bild_aus_datei` neu aus der Datei (verlustfrei, also pixelgleich zu vorher).
2. **Zuschnitt.** Die Textur ist das sichtbare Rechteck des Bildes (`Image.get_used_rect()`) plus 1 Pixel Rand; der Versatz (`bild_versatz`) geht in
   `Sprite2D.offset` ein. Die Dateien bleiben unverändert (die Umsetzer-Ausgabe ist auf die Vereinigung aller Figuren zugeschnitten, einzelne Bilder
   brauchen weniger). Alles außerhalb ist Alpha 0: geprüft, dass kein sichtbares Pixel verloren geht (Textur = Ausschnitt des Dateibildes Byte für Byte,
   Ausschnitt umschließt alle Pixel mit Alpha > 0, alle Bilder aller 13 Clips). Spart bei den fünf Clips 44 % (122,0 → 68,4 MB).
3. **Laden nach Bedarf, Vorausladen in Häppchen.** `clip_daten` liest nur `clip.txt`. Im Spiel (`DarstellungVelaFrames.nachladen`, von `spiel.gd` gesetzt, nicht in
   Tests, Fotos und mit `--ende`) lädt `abgedeckt` nie: ein noch nicht bereiter Clip gilt als nicht abgedeckt (die Darstellung nimmt Puppe oder Platzhalter, wie bei jedem
   Clip ohne Abdeckung) und wird vorgemerkt; `vorausladen_schritt` lädt je gezeichnetem Bild ein Häppchen (mindestens ein Bild, solange 3 ms nicht verbraucht sind, 6 ms bei vorgemerkten Clips), zuerst die
   vorgemerkten Clips, dann `VORAUS_REIHE` (stand, gehen, kette1, sprint, sprung, sprungtritt, kette2 bis 4, getroffen_vorn, umgeworfen, liegen, aufstehen). Der Wechsel der Quelle (Puppe → gemalt)
   geschieht einmal je Clip, sobald er ganz geladen ist; es gibt kein Flackern, weil ein Clip nie halb gezeigt wird (beim Wechsel springt die Figur allerdings, siehe Befund zum Anker unter „Auflösung 1536 × 896“). Synchrones Laden mitten im Spiel gibt es nicht
   (Ladezeit je Bild 2,7 bis 4,6 ms headless, 2,7 bis 5,6 ms (größtes Bild 10 ms) unter Xvfb mit Textur-Upload; der Sprung am Stück 0,4 s, daher die Häppchen).
   Nach dem Start sind im laufenden Spiel (`speicher_messung.gd --modus spiel`, Vorführung unter Xvfb, Bilder zu rund 26 ms) stand nach 15 Bildern bereit, kette1 nach 52, sprint nach 68, sprung nach
   180, sprungtritt nach 231 und alle 13 Clips nach 300 Bildern (rund 5 s bei 60 Bildern je Sekunde auf einer echten GPU, wo ein Bild kürzer dauert, die Zeit je Häppchen aber gleich bleibt);
   solange zeigt das Spiel für Aktionen, deren Clip fehlt, die Puppe bzw. den Platzhalter (in der Messung 154 bis 157 von 900 Bildern, darin auch die Aktionen, die nie einen Clip haben).
4. **Budget mit LRU.** `SPEICHER_BUDGET_MB` = 128 (`budget_bytes`): Fordert ein Clip mehr Platz an, als das Budget lässt, entlädt `_platz_schaffen` ganze Clips,
   zuerst den am längsten nicht benutzten; der gerade gezeigte Clip, der angeforderte und die `schutz_zuletzt` (2) zuletzt benutzten bleiben. Das Vorausladen entlädt nie,
   es hört beim Budget auf. Alle 13 Clips brauchen 103,7 MB und passen ins Budget; ein Entladen geschieht erst, wenn weitere gemalte Clips dazukommen (die Pixel-Clips werden dann ersetzt).
   Ein entladener Clip lädt bei Bedarf wieder (Puppe/Platzhalter bis dahin).
5. **Abbildung der Zeit unverändert.** Die Tabelle (`vela_frames_tabelle.gd`) liest nur `clip.txt`; die Bildindizes vor dem Laden, nach dem Laden und nach Entladen und Wiederladen
   sind gleich (Test), 74 von 74 Szenen bitgleich, die Vorführung mit Darstellung 600 Schritte gleich der Referenz.

Nachher (fünf gemalte Clips, 360 Zeilen, ganz geladen; `speicher_messung.gd --modus clips`):

| Zähler | vorher | nachher |
|---|---|---|
| eigene Summe der Texturen | 122,0 MB (volle Rechtecke) | **68,4 MB** (stand 13,1, kette1 8,2, sprint 5,6, sprung 24,5, sprungtritt 16,9) |
| Images im Prozess (`MEMORY_STATIC`, Xvfb) | +122 MB | +0,2 MB |
| Texturen am Renderer-Zähler (Xvfb, llvmpipe) | 162,5 MB | 91,0 MB (der Zähler liegt rund ein Drittel über der eigenen Summe, vermutlich wegen einer Mipmap-Kette des Treibers; nicht geprüft) |
| Prozess (RSS, Xvfb) | +247 MB | +73 MB |
| Prozess (RSS, `--headless`) | +122 MB | +69 MB (der Dummy-Renderer hält die Bilder der Texturen) |

Die Zielvorgabe (höchstens etwa 100 MB Texturspeicher für die fünf gemalten Clips) ist mit 68 MB (eigene Summe) bzw. 91 MB (Zähler) erfüllt. Mit
480 Zeilen wären es 120 MB bzw. rund 160 MB (siehe „Auflösung 1536 × 896“). Was sich nicht messen lässt: `RENDER_TEXTURE_MEM_USED` ist unter `--headless` 0 (kein Renderer);
der Verbrauch an Grafikspeicher einer echten GPU und eine eventuelle Kompression der Treiber sind hier nicht beobachtbar (llvmpipe nutzt den Hauptspeicher). Eine GPU-Kompression
(BPTC/S3TC, 4 : 1) wurde nicht eingesetzt, weil sie die weichen Kanten und Farben der gemalten Clips verfälschen würde.

## Stand

Phase 0 bis 2 und 4 von Auftrag 6 erledigt; Spielbild 1536 × 896 (E28), Speicher der Clips begrenzt (E27/E28, Teil A); 74 von 74 Szenen bitgleich zur
TypeScript-Referenz, die Vorführung mit Darstellung 600 Schritte gleich der Referenz; `alle.gd` grün (4065 Prüfungen, etwa 47 s). Offen: Abnahme der
Leistung im Fenster (60 Bilder je Sekunde bei 1536 × 896, vom Nutzer zu bestätigen; hier nur Software-Rendering gemessen), die Entscheidung über die Höhe der gemalten
Clips (360 gewählt, 480 gemessen, siehe „Auflösung 1536 × 896“), der Anker der gemalten Clips (Figur steht links vom Schatten, springt beim Wechsel zu den Pixel-Clips), die Entscheidung über den Weg der Figurenanimation,
gemalte Clips für die übrigen Aktionen, Grafik der übrigen Figuren und des Hintergrunds, Ton, Export. `docs/grafik.md` (Zeile „Anzeigeleiste, Schrift“ und „Effekte“, „bei 2× verdoppelt“) ist noch
auf Faktor 2 geschrieben; im Code folgt alles aus `DARSTELLUNG` = 4 und die Schrift ist 4 × 4 Bildpixel je Schriftpixel.
