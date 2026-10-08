# Comet Brawlers: Fassung in Godot (Programm)

Stand 2026-10-08 (Auftrag 6, Entscheidung E26; Auflösung 1536 × 896 nach E28, Speicher der Clips E27/E28, Vela gemalt mit fünfzehn Clips E27). Dieses Dokument beschreibt
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
                       Vela-Puppe (vela_puppe.gd, vela_posen.gd; Rückfall), Vela aus Video-Clips (vela_frames.gd mit Laden nach
                       Bedarf und Speicherbudget, vela_frames_tabelle.gd: Aktion und Uhr → Clip und Bild)
  werkzeuge/           foto.gd (Bildschirmfotos), kontakt.gd (Kontaktbögen), umsetzer.gd (Teileblatt → Teile),
                       film.gd (Einzelbilder der Puppe), video_umsetzer.gd und video_bogen.gd (Videos → Clips, Prüfbögen),
                       vela_hd_clips.sh (alle fünfzehn Clips aus den Videos umsetzen), vela_belege.sh (Bildstreifen und GIFs im Spiel,
                       mit den Szenen unter hd_film/), hd_vorschau.gd, speicher_messung.gd und leistung.gd (Messungen)
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
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/foto.gd -- --szene <datei> --eingabe <datei> --nach 300,600 --aus docs/bilder/name [--info <csv>]` | Bildschirmfotos nach n Logikschritten (PNG `<aus>_<n:04d>.png`, 1536 × 896 aus `DarstellungZeichner`); lädt alle Clips sofort und ganz; unter `--headless` gibt es kein Rendering, deshalb Xvfb; `--info` schreibt je Bild Fußpunkt der Figur, Aktion, Aktionsuhr, Quelle (Clip, `puppe`, `platzhalter`) und Clipbild |
| `godot/werkzeuge/vela_belege.sh [<beleg> …]` | Bildstreifen und GIFs der gemalten Vela im Spiel nach `docs/bilder/godot_hd_spiel_*` (aus `foto.gd`, ImageMagick und ffmpeg, etwa 6 Minuten), siehe „Gemalte Vela“, Belege |
| `godot/werkzeuge/vela_hd_clips.sh <videoordner> [<hoehe>] [<ausordner>] [<clip> …]` | alle fünfzehn gemalten Clips (oder die genannten) aus den Quellvideos umsetzen; die einzige Quelle der Umsetzerbefehle, siehe „Gemalte Vela“ |
| `xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/kontakt.gd -- --aus docs/bilder/godot_kontakt_vela.png` | Kontaktbogen der Vela-Puppe |
| `godot --headless --path godot --script res://werkzeuge/speicher_messung.gd -- --modus clips` | Dateien, Texturspeicher (RSS, static, Texturen) und Ladezeit je Clip für alle fünfzehn Clips, die Summe und der Teilwert der ersten fünf; mit `--modus spiel --bilder 900` unter Xvfb: Nachladen im laufenden Spiel (Bild, ab dem jeder Clip bereit ist, Zeit je Bild) |
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

`alle.gd` (Laufzeit etwa 70 s, 4339 Prüfungen): Festkomma, Zufall, Tasten, Eingabeparser,
Stage-Parser, Protokollformat, Reinheit von `godot/kern/` (sucht die Wörter
`float`, `Vector2`, `Rect2`, `randi`, `randf`, `Time.`, `OS.`, `signal`, auch in
Kommentaren), Darstellung (`darstellung_test.gd`: Zeichnen ändert die Welt
nicht, Vorführung mit Darstellung 600 Schritte gleich der Referenz), Vela-Puppe
(`vela_test.gd`, `vela_qa.gd`), Video-Clips (`video_test.gd`: Umsetzer, Zuordnung Aktion und Uhr → Bild für alle Clips, bei Griff und Wurf mit
Stichproben an den Zeitpunkten des Kerns (Griff in uhr 1, Loslassen in E+22, Kampfhaltung in E+37) auch an der laufenden Logik in den Szenen T6, T16
und `werkzeuge/hd_film/griff_*`, Abdeckung und Rückfall auf Puppe oder Platzhalter, Abspieler, Lage und Rand im Spielbild; die Vorführung mit
Darstellung wird dort über 800 Schritte gegen die Referenz geprüft), Speicher der Clips
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
erfüllt 360 (68 MB), 480 überschreitet es (120 MB, am Renderer-Zähler rund 160 MB); für alle fünfzehn Clips wären es hochgerechnet (1,76-fach, nicht gemessen) rund 370 MiB gegen
209 MiB bei 360 und das Budget von 256 MiB. Deshalb gilt 360. Wer 480 will:
`werkzeuge/vela_hd_clips.sh <videoordner> 480`, die Tests prüfen die Skala (`0,3 bis 0,5`) und müssten auf 0,2958 angepasst werden;
für Sprint wählte die Suche bei 480 nur 15 statt 16 Bilder (Bild 63 wird als unscharf abgeschnitten), das wäre mit `--ab 62` zu prüfen.
`werkzeuge/vela_hd_clips.sh` ist die einzige Quelle der Umsetzerbefehle (die Messung oben stammt von den fünf Clips der ersten Lieferung mit deren damaligen Befehlen).

**Puppe und Clips.** Alle fünfzehn Clips der echten Vela sind gemalt (feine Auflösung, ein Dateipixel ist 0,79 Bildschirmpixel); Pixel-Clips gibt es nur noch als
Testclips der Puppe. Die Pixel-Puppe ist 2× vergrößert (NEAREST): jedes Pixel der Grafik ist 2 × 2 Bildschirmpixel; sie ist nur noch Rückfall (Stand, Gehen,
Kette 1 bis 4, solange ein Clip noch nicht geladen ist, und mit `--puppe`). Geprüft: Keiner der Clips berührt den Rand seines Dateibildes (nichts abgeschnitten,
`speicher_test.gd`), der Abspieler sitzt am Fußpunkt der Logik, und im Spiel liegt keine Textur außerhalb des Spielbildes (`video_test.gd`, Vorführung).

**Anker der gemalten Clips (erledigt, 2026-10-08).** Der Anker lag in den ersten fünf Clips auf dem vorderen Stiefel statt auf der Fußmitte: die gemalte Vela
stand 16 bis 18 Spielpixel (65 bis 74 Bildschirmpixel) links vom Schatten und sprang beim Wechsel zu den Pixel-Clips um rund 50 Bildschirmpixel. Mit der Umsetzung vom 2026-10-08 (zweite und dritte Lieferung) sind
alle Clips auf die Mitte zwischen den Stiefeln verankert (`--ankerx-video`, `vela_hd_clips.sh`); der Fußpunkt liegt im Kampfhaltungsbild höchstens 1,8 Spielpixel
neben der Stiefelmitte. Messung, Bild und Ausnahmen (`sprint`, Haltepose des Griffs) in „Gemalte Vela“, „Anker und Skala“.

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
Szene bei 768 × 448 und 1536 × 896, Ausschnitt: links vorher ×4, rechts nachher ×2), `platzhalter_0600.png` (`--platzhalter`), `clip_hoehen*.png`, `pixel_und_gemalt.png` (Pixel-Clips neben gemalten, 2 × 2-Pixel-Blöcke; Stand vor der dritten Lieferung).

Beurteilung (ehrlich, nach Ansicht der Bilder):

- Schärfe: Die gemalte Vela ist bei 1536 × 896 deutlich schärfer als bei 768 × 448 (Gesicht, Handschuhe, Nähte, Haare im Vergleichsbild); die
  Kanten sind glatt, kein Grünsaum. Gegenüber der Quelle ist sie mit 0,79 leicht verkleinert, die Schärfe ist gut, nicht „knackig“.
- Stilbruch: Der Unterschied zwischen der feinen gemalten Vela und allem anderen ist größer geworden. Hintergrund, Gegner, Behälter und Anzeige sind flache
  Farbflächen (Platzhalter) bzw. Pixelschrift in 4 × 4-Blöcken. Der Wechsel zwischen gemalten und Pixel-Clips in einer Folge (Kette 1 → 2, Stand → Gehen)
  ist seit 2026-10-08 erledigt: alle Clips der Vela sind gemalt. Bleibt der Bruch zu Gegner- und Hintergrundgrafik und zu den Aktionen ohne Clip (Platzhalter).
- Lesbarkeit der Anzeige: Die Pixelschrift (Name, Punkte, Leben, Namen der Gegner) ist in 4 × 4-Blöcken gut lesbar und groß; der Debug-Text (3 × 5, 12 × 20 Pixel je
  Zeichen) bedeckt viel Fläche, ist nur für die Fehlersuche gedacht. Nichts wird am Rand abgeschnitten (HUD und Texte liegen in Spielpixeln und wurden nicht verschoben).
- Farbfehler der Quellen (olivgrünes Haar, rosa Streifen) sind bei der Vergrößerung deutlicher sichtbar (Sprungstreifen, Tick 334 und 370); Nachbestellung der betroffenen
  Bilder wäre besser als das Weglassen. Die Farbfehler der neun neuen Clips stehen in „Gemalte Vela“, Beurteilung.

## Grafik: Vela

Vela ist eine Cutout-Puppe aus echten Teilen des Grok-Teileblatts
(`spiel/grafik/quelle/fremd/vela/vela_t_teile.png`), geschnitten von
`werkzeuge/umsetzer.gd` (13 Teile, 64 Farben, Gesamthöhe 142 Bildpixel),
aufgebaut als `Skeleton2D` mit 16 Bones. Seit den gemalten Clips vom 2026-10-08 ist die Puppe nur noch Rückfall hinter den Clips. Abgedeckt sind Stand, Gehen und die
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
  4 KB je Bild. Ein Clip mit 50 Bildern sind also rund 3,3 bis 3,8 MB; die fünfzehn gemalten Clips (709 Bilder) sind tatsächlich
  52,6 MB (rund 74 KB je Bild, „Gemalte Vela“). Breite Bilder (ausgestreckter Arm, 471 × 434 bei Höhe 420) bis zu 140 KB (PNG).
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
Handschuhen kommt aus dem Quellbild (Umrisslinie), nicht aus dem Freistellen. (Zum Zeitpunkt dieser Prüfung war noch kein echtes Grok-Material
umgesetzt; die fünfzehn echten Clips sind es seit 2026-10-08, ihre Kanten stehen in „Gemalte Vela“, Beurteilung; ungleichmäßiger Grund und Bewegungsunschärfe
an Armen sind weiter ungeprüft.)

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

Entscheidung des Nutzers (2026-10-08): Vela gilt im gemalten Stil. Alle fünfzehn Clips sind gemalte HD-Clips (WebP, 360 Zeilen, `weich=1`):
`stand`, `gehen`, `kette1` bis `kette4`, `sprint`, `sprung`, `sprungtritt`, `getroffen_vorn`, `umgeworfen`, `liegen`, `aufstehen`, `griff` und
`wurf`. Pixel-Clips der echten Vela gibt es nicht mehr (unter `grafik/vela_video/` liegen nur noch `_test_gehen` und `_test_kette1` aus der
Puppe für die Tests des Umsetzers). Die Quellvideos liegen nicht im Repo. Die Pixel-Puppe bleibt Rückfall (Stand, Gehen, Kette 1 bis 4, solange
ein Clip noch nicht geladen ist, und mit `--puppe`), für alle anderen Aktionen ohne Clip zeichnet die Darstellung den Platzhalter (Rechteck).

### Die fünfzehn Clips

`werkzeuge/vela_hd_clips.sh <videoordner>` ist die einzige Quelle der Befehle (je Clip Quellvideo, Bildbereich `--ab`/`--bis`, weggelassene
Bilder `--ausser`, Ereignisse `--setze`, Maßstab `--faktor`, Fußpunkt `--ankerx-video`; immer `--aus godot/grafik/vela_video --hd --hoehe 360`;
einzelne Clips: `vela_hd_clips.sh <videoordner> 360 godot/grafik/vela_video <clip> …`). Bilder und Dateigröße (dezimale MB, nur die Bilder) und
Texturspeicher nach dem Zuschnitt (MiB) sind mit `werkzeuge/speicher_messung.gd -- --modus clips` gemessen (Ende 2026-10-08):

| Clip | Bilder | Dateien (MB) | Texturen (MiB) | Video im Skript | Inhalt |
|---|---|---|---|---|---|
| `stand` | 47 | 3,69 | 13,1 | `v4.mp4` | ein Atemzyklus (Video 40 bis 86), Schleife in Echtzeit |
| `gehen` | 25 | 1,96 | 7,5 | `v6.mp4` | ein Doppelschritt (Video 93 bis 117), `schritt_px` 68, 39 Ticks je Zyklus |
| `kette1` | 26 | 1,95 | 8,2 | `vela_v_kette1_gemalt.mp4` | Schlag, Haltebilder 70 bis 95 weggelassen |
| `kette2` | 38 | 2,92 | 12,3 | `v7.mp4` | Schlag mit Ausfallschritt, Haltebilder 61 bis 103 weggelassen |
| `kette3` | 26 | 2,04 | 9,0 | `v8.mp4` | Schlag mit Ausfallschritt, Haltebilder 75 bis 94 weggelassen |
| `kette4` | 69 | 4,83 | 20,8 | `v9.mp4` | Schlag, Drehung, Tritt (zwei Kontakte: `kontakt1` 6, `kontakt` 39), Haltebilder 74 bis 94 weggelassen |
| `sprint` | 16 | 1,26 | 5,6 | `v3.mp4` | ein Doppelschritt (Video 63 bis 78), `schritt_px` 93 |
| `sprung` | 96 | 7,05 | 24,5 | `w1.mp4` | Hocke bis Aufrichten (Video 47 bis 142), Maßstab 0,330 |
| `sprungtritt` | 52 | 4,36 | 16,9 | `w2.mp4` | Absprung, Tritt, Landung, fünf Farbwechselbilder und 30 Haltebilder weggelassen |
| `getroffen_vorn` | 50 | 4,14 | 16,1 | `v12.mp4` | Auslenkung nach einem Treffer von vorn, Haltebilder 48 bis 88 weggelassen |
| `umgeworfen` | 59 | 4,20 | 17,5 | `v10.mp4` | Treffer, Flug, Aufprall (Video 1 bis 90, automatisch gekürzt: 31 Bilder weg) |
| `liegen` | 1 | 0,06 | 0,2 | `v10.mp4` | ein Standbild (Video 120) |
| `aufstehen` | 81 | 4,65 | 17,4 | `v10.mp4` | vom Liegen bis zur Kampfhaltung (Video 172 bis 252) |
| `griff` | 34 | 2,73 | 11,4 | `v13.mp4` | Zugreifen (Hände ausgestreckt, `kontakt` 11), Zug an die Brust, Haltepose (`ruhe` 32); 23 Haltebilder des gestreckten Arms (36 bis 58) weggelassen |
| `wurf` | 89 | 6,79 | 28,6 | `v14.mp4` | Ducken, Arme über den Kopf (`heben` 42), Schwung, Loslassen (`kontakt` 55), Ausschwingen (`rueckzug` 62), Kampfhaltung (`ruhe` 87); 7 Bilder oben und 19 Bilder mit tiefen Händen weggelassen |
| zusammen | 709 | 52,6 | 209,2 | | |

Die ersten fünf Clips (Stand, Kette 1, Sprint, Sprung, Sprungtritt; erste Lieferung) sind als Teilwert 18,3 MB Dateien und 68,4 MiB Texturen,
die Zahlen in „Speicher der Clips“ und „Auflösung 1536 × 896“ beziehen sich darauf. Warum Bilder weggelassen sind: Wo ein Clip einen Arm lange
gestreckt hält (Haltebilder), steht in der Tabelle dort ohnehin ein Bild (`_ablauf`); die Haltebilder wären nur Speicher. `rueckzug` ist das erste
Bild nach den weggelassenen Haltebildern, die Ereignisse (`kontakt`, `rueckzug`, `ruhe`, `heben`, `kontakt1`) stehen mit der Nummer der
behaltenen Bilder in `clip.txt` (1-basiert wie die Dateinamen; `clip_lesen` macht 0-basierte Indizes daraus). Aus der ersten Lieferung:

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
  dann `rueckkehr=vorwaerts`.
- `sprung`: ohne die Wartezeit vor der Hocke (ab Videobild 47, die Kampfhaltung steht davor), bis zur aufgerichteten
  Kampfhaltung (`ruhe`, Videobild 142). `--faktor 0.33023` hält Größe und Fußmitte der Kampfhaltung: das erste Bild ist schon in der Hocke,
  der Maßstab dürfte nicht aus ihm kommen (sonst 0,449: Vela zu groß).
- `sprungtritt`: die fünf Bilder mit Farbwechsel kurz vor dem Absprung (Videobild 56 bis 60: rötliches Haar, lila Handschuhe,
  dunklere Jacke, ein verschmiertes Bild) sind entfernt, ohne dass die Bewegung ruckelt (Hocke Bild 55, danach gleich Luft,
  24 Bilder/s). Ebenso zwei weitere Einzelbilder mit Farbfehler (62 olivgrünes Haar, 114 Regenbogenstreifen am Ärmel) und die
  30 Haltebilder des gestreckten Beins (70 bis 99). Das Bild 66 mit olivgrünem Anflug an der Hose blieb, weil es das einzige
  Zwischenbild der Streckung ist (ohne es springt das Bein in einem Bild).

Zweite und dritte Lieferung (2026-10-08, Grok-Videos 6 bis 12 und 13, 14): `gehen`, `kette2` bis `kette4`, `getroffen_vorn`, `umgeworfen`, `liegen`, `aufstehen`
(zweite) sowie `griff` und `wurf` (dritte) kamen neu dazu; `stand`, `kette1`, `sprung` und `sprungtritt` wurden mit der Fußmitte zwischen den Stiefeln als Anker neu
umgesetzt (siehe „Anker und Skala“). Befehle je Clip: `werkzeuge/vela_hd_clips.sh`.

### Abbildung Aktion → Clip (`darstellung/vela_frames_tabelle.gd`)

Die Logik bleibt Taktgeber: `wahl` liest `f.aktion`, `f.uhr` (Frames seit Aktionsbeginn ohne Stoppframes, Beginn 1) und die Phase und liefert Clip,
Art und Blick; `bildindex_wahl` macht daraus den Bildindex. Alle Zeiten kommen aus `KernWerte`. Jeder Tick zeigt genau ein Bild (kein Überblenden).

| Aktion des Kerns | Clip | Zeitbezug |
|---|---|---|
| STAND | `stand` | Schleife in Echtzeit (118 Ticks) |
| LAUF | `gehen` | Schleife, 39 Ticks je Doppelschritt (`zyklus_ticks`, aus `schritt_px` 68: die Füße rutschen nicht) |
| SPRINT | `sprint` | Schleife nach der zurückgelegten Strecke (`schritt_px` 93) |
| SCHLAG, LEERSCHLAG Stufe 1 bis 4 | `kette1` bis `kette4` | uhr 1 bis `KETTE_AKTIV_VON` − 1 (Stufe 1 bis 4: 2, 3, 4, 3) die Bilder von Ausholen-Ende bis vor den Kontakt; Trefferfenster `KETTE_AKTIV_VON` bis `KETTE_AKTIV_BIS` (2–5, 3–6, 4–7, 3–6): das Kontaktbild (steht im ersten aktiven Frame, hält bis zum letzten, auch im Trefferstopp); danach Rückzug bis zur Ruhe im letzten Tick der Dauer (16, 16, 17, 25); Stufe 4 mit zweitem Fenster uhr 17 bis 20 (`kontakt1` und `kontakt`) |
| SPRUNG | `sprung` | uhr 1 Hocke, uhr 2 bis 21 Absprung bis Scheitel (Bild 29 auf dem Scheitelframe), 22 bis 41 bis zum letzten Luftbild; nach einem Sprungangriff H/T aus der Sprunguhr, die aus `vh` folgt |
| LANDUNG | `sprung` | 6 Ticks vom Aufsetzbild (Bild 52) bis zur aufgerichteten Haltung (Bild 95) |
| SPRUNGANGRIFF N, R | `sprungtritt` | uhr 1 bis 4: Absprungbild bis vor den Kontakt; Trefferfenster uhr 5 bis 28 (`KernWerte.SPRUNGANGRIFF`): das Kontaktbild (Bein voll gestreckt); danach Rückzug bis zum letzten Luftbild im letzten Luftframe (J+41, die Dauer folgt aus der Sprunguhr); bei spätem Angriff steht das Kontaktbild bis zur Landung |
| LANDUNG nach SPRUNGANGRIFF N, R | `sprungtritt` | dieselbe Landung aus dem Tritt-Clip (`sprung_angriff` bleibt bis zum nächsten Sprung gesetzt) |
| GETROFFEN (Angreifer vorn) | `getroffen_vorn` | uhr 1 bis 27 (`GETROFFEN_DAUER`): Auslenkung früh (uhr 3 bis 6), Rückkehr bis uhr 27 |
| UMGEWORFEN, TOT | `umgeworfen` | Stillstand uhr 1 bis `F1_STILLSTAND` + 1 (TOT: `F4_STILLSTAND`), Flug nach `bahn_frame`, Aufprall im Bodenkontaktframe (`bahn_boden`, H+46 bzw. H+40), danach 7 Ticks bis zum Liegen; gespiegelt so, dass der Flug in `bahn_richtung` geht |
| LIEGEN, TOT ab der Ruhe | `liegen` | ein Standbild |
| AUFSTEHEN | `aufstehen` | uhr 1 bis 26 (`FIGUR_AUFSTEHEN_DAUER`) gleichmäßig vom Liegen bis zur Kampfhaltung |
| GRIFF (Zugreifen) | `griff` | der Kern schließt den Griff am Ende eines LAUF-Frames und beginnt dort GRIFF mit uhr 1, der Gegner steht schon in der Haltelage (19 px vor der Figur); das Kontaktbild (Hände ausgestreckt, Bild 11) steht in uhr 1 und 2 (`GRIFF_KONTAKT_BIS`), dann ziehen die Arme den Gegner an die Brust (Rückzug, Bilder 13 bis 32) bis zur Haltepose in uhr 12 (`GRIFF_DAUER`) |
| GRIFF (Halten) | `griff` | die Haltepose (Fäuste vor der Brust, leicht vorgebeugt, breiter Stand, Bild 32) hält bis zum Losreißen in g+61 (`HALTEFRIST` 60) und nach dem Kniestoß (der Kern beginnt GRIFF dann mit uhr 1 neu: `knie_zahl` > 0, die Haltepose steht sofort, es wird nicht noch einmal zugegriffen) |
| WURF V und R | `wurf` | uhr 1 bis 21 (Tragen, `WURF_TRAGEN_BIS`, der Gegner bleibt in der Haltelage): Ducken aus der Haltepose (Bild 1 = Pose der Haltepose), Arme über dem Kopf in uhr 12 (`WURF_HEBEN_UHR`, Bild 42), Schwung; uhr 22 (`WURF_LOSLASSEN`, E+22, der Gegner steigt auf 59 px und fliegt): das Bild `kontakt` (55), nur in diesem Frame; danach das Ausschwingen mit tiefen offenen Händen (Bild 62 in uhr 27) und die Rückkehr in die Kampfhaltung (Bild 87) im letzten gebundenen Frame (uhr 37 = `WURF_GEBUNDEN_BIS`); ab uhr 38 STAND |
| KNIESTOSS | – | **kein Clip**: Platzhalter. Der Kern beginnt für jeden Kniestoß eine eigene Aktion (22 Ticks, Treffer in K+5), danach wieder GRIFF; die Figur ist für diese Ticks der Platzhalter-Kasten (siehe „Beurteilung“) |
| SPRUNGANGRIFF H, T | – | kein Clip: Platzhalter |
| SPRINTSPRUNG, SPRINTANGRIFF | – | kein Clip: Platzhalter |
| SPEZIAL | – | kein Clip: Platzhalter (auch aus dem Griff) |
| GETROFFEN (Angreifer hinten) | – | kein Clip (G1-11: nur von vorn): Platzhalter |
| WAFFE, AUFNEHMEN, NEUEINSTIEG | – | kein Clip: Platzhalter |

Zum Zugreifen: Der Kern hat keinen Anlauf vor dem Griff (Kampf 8.1: Griff am Ende des LAUF-Frames, Drücke ab g+1). Das Ausholen des Clips (Bilder 3 bis
10, eine Hand streckt sich zuerst) entfällt deshalb; das Kontaktbild steht in dem Frame, in dem der Kern greift (Test: Szenen T6_a, T6_b, T16_a, T16_b und
`werkzeuge/hd_film/griff_*`). Zum Wurf: Der Gegner steht in uhr 1 bis 21 am Boden in der Haltelage (die Logik hebt ihn erst in E+22 auf 59 px), die
Arme sind in der Darstellung schon früher über dem Kopf; beim Wurf rückwärts (R) zeigt der Clip denselben Schwung nach vorn, der Gegner fliegt hinter die
Figur (der Clip kennt nur den Vorwärtswurf). Der Sprung: Die Logik hebt die Figur (`h` aus `KernWerte`, Scheitel 51,25 px), das Bild zeigt nur die
Haltung; der Anker liegt auf der untersten Figurzeile jedes Bildes (`--ankery unten`), der Schatten bleibt am Boden. Der Kern kennt den Sprungangriff
(`SPRUNGANGRIFF`, Varianten N neutral, R Richtung, H hoch, T runter, Kampf 5.2), die Tabelle ruft den Clip deshalb für N und R. Der Kern wurde nicht angefasst.

### Anker und Skala

**Anker (erledigt, 2026-10-08).** Der Fußpunkt (`fuss_fein`, Dateipixel) liegt auf der Mitte zwischen den Stiefeln der Kampfhaltung
(`--ankerx-video 488.2` bei den 944-Pixel-Videos, 479 bei Sprung und Sprungtritt; bei `gehen` und `sprint` der Mittelwert der Silhouette), nicht mehr auf dem
vorderen Stiefel. Vorher stand die gemalte Vela im Spielbild 16 bis 18 Spielpixel (65 bis 74 Bildschirmpixel) links vom Schatten und sprang beim
Wechsel zwischen den Clips um 50 Bildschirmpixel. Gemessen im Kampfhaltungsbild (Mitte des Stiefelrahmens in den untersten 60 Dateizeilen gegen den Fußpunkt):
der Fußpunkt liegt zwischen 0,2 Spielpixel links und 1,7 Spielpixel rechts der Stiefelmitte (1 bis 7 Bildschirmpixel; die Stiefelspitzen zeigen nach rechts,
der Rahmen reicht links weiter), bei `stand` 1,1, `gehen` 1,7, `kette1` bis `kette4` 0,8 bis 1,2, `sprung` 0,3, `sprungtritt` −0,2, `getroffen_vorn` und
`umgeworfen` 1,2, `griff` 1,2, `wurf` 1,3. Mit Absicht weiter weg sind `sprint` (Mittelwert der Silhouette: 5,4 Spielpixel) und die Haltepose von `griff`
(breiter Stand, der Hinterfuß steht weit hinten: 4,0). Die Unterkante der Figur liegt 1 Dateipixel unter dem Fußpunkt (die Stiefelsohlen stehen auf der
Bodenlinie, der Schatten ist um sie zentriert). Bild `docs/bilder/godot_hd_spiel_anker_schatten.png` (1:1, rote Linie = Fußpunkt der Logik, gelb = Bodenlinie):
Stand, Gehen, Kette 2 und 3, Griff, Wurf und Liegen stehen mittig im Schatten; in tiefen Ausfallschritten (Kette 3, Wurf) wandert die Stiefelmitte
bis 9 Spielpixel von der Linie, weil der Clip die Füße so malt; die Schattenmitte bleibt am Fußpunkt der Logik.

Skala: `skala` rund 0,3944 (Figur 142 Basispixel bei 360 Dateizeilen, im Spiel 284 Bildschirmpixel); bei `sprung` und `sprungtritt` stammt der Maßstab
(0,3302 Spielbildpixel je Videopixel) aus dem Startbild mit der Figur auf 45 % der Bildhöhe, `stand` hat 0,16937 und alle übrigen 0,16996 (0,35 %
Unterschied: im Stand ein halber Bildpixel kleiner, nicht sichtbar). Der Bolzer-Platzhalter ist 72 Spielpixel hoch, die Figur 71.

### Speicher

Alle fünfzehn Clips zusammen: 52,6 MB Dateien, 209,2 MiB Texturspeicher nach dem Zuschnitt (eigene Summe, `DarstellungVelaFrames.speicher_bytes`), alle im
Speicher zugleich; das Budget `SPEICHER_BUDGET_MB` ist 256 (`vela_frames.gd`), es entlädt erst bei weiteren Clips. Teilwert der ersten fünf Clips: 68,4 MiB.
Messung (Xvfb, llvmpipe, `speicher_messung.gd`): Texturen am Renderer-Zähler 289 MB (ein Drittel über der eigenen Summe, siehe „Speicher der Clips“),
Prozess (RSS) +218 MB; unter `--headless` +210 MB. Im laufenden Spiel (Vorführung, Nachladen in Häppchen) ist der erste Clip (`stand`) nach 16 Bildern
bereit, alle fünfzehn nach 520 Bildern (Xvfb, Bilder zu rund 28 ms; auf einer GPU mit 16,7 ms je Bild rund 9 s); bis ein Clip bereit ist, zeigt das Spiel die
Puppe oder den Platzhalter.

**Weitere Figuren.** Eine zweite Figur mit ähnlich vielen Clips verdoppelte den Speicher (rund 420 MiB) und sprengte das Budget. Zwei Wege: (1) nur die Clips laden,
die die Bühne braucht (Figur, die Gegner der Bühne, ihre Waffe) und die Clips der übrigen Bühnen mit `clip_entladen` freigeben (`vorausladen_schritt` und
`VORAUS_REIHE` sind schon nach Clips geordnet, `schutz_zuletzt` hält die zuletzt benutzten), (2) GPU-Texturkompression (BPTC/S3TC, höchstens 4 : 1; ASTC
auf Mobilgeräten), die die weichen Kanten und Farben der gemalten Clips aber verfälschen kann (Prüfung an den Kanten nötig). Kleinere Dateihöhen (288
Zeilen: 64 %) und kürzere Clips (weniger Haltebilder) sparen ebenfalls; mehr Zeilen (480: 1,76-fach) kosten quadratisch.

### Belege

Alle Bilder: Spielszene mit Gerüst-Bühne, Vela von der Logik getrieben (Bild für Bild aus `foto.gd`, 1536 × 896, ausgeschnitten und beschriftet:
Tick, Aktion, Aktionsuhr, Clip und Nummer des Bildes), GIFs mit jedem zweiten Tick bei 30 Bildern/s (Echtzeit). Alles erzeugt
`werkzeuge/vela_belege.sh` (Szenen: Vorführung der Scheibe, `werkzeuge/hd_film/treffer_*` und `griff_*`); die Gegner sind Platzhalter-Kästen
(grün: Bolzer in Ruhe, gelb: kündigt an, beige: Puppe, weiß: getroffen, hell lila: gehalten, flach grau: liegt oder wird geworfen, rot: Angriff aktiv; die Figur selbst ist als
Platzhalter orange, wenn sie angreift). Beschriftung: oben links Tick,
Aktion (mit Phase) und Aktionsuhr, unten links Clip und Nummer des Bildes (Datei `f_XXXX.webp`); `platzhalter` heißt: kein Clip, der Kasten zeichnet die Figur.

| Beleg | Streifen / GIF (`docs/bilder/godot_hd_spiel_…`) |
|---|---|
| Stand, Kette 1, Sprint, Sprung, Sprungtritt (erste Lieferung) | `stand`, `kette1`, `sprint`, `sprung`, `sprungtritt` (je `.gif` und `_streifen.png`), `vergleich_arena.png`, `vergleich_vorfuehrung_0300.png` |
| Gehen | `gehen.gif`, `gehen_streifen.png` |
| Kette 2, 3, 4 und die Folge Kette 1 bis 4 | `kette2`, `kette3`, `kette4`, `kette_folge` (je `.gif` und `_streifen.png`) |
| Getroffen von vorn | `getroffen_vorn.gif`, `getroffen_vorn_streifen.png` |
| Umgeworfen, Liegen, Aufstehen | `umgeworfen_aufstehen.gif` (Treffer bis Stand), `umgeworfen_streifen.png`, `aufstehen_streifen.png` |
| Griff und Wurf | `griff`, `wurf`, `griff_wurf` (die Folge Griff → Wurf vorwärts, Vorführung Tick 517 bis 600; je `.gif` und `_streifen.png`) |
| Griff, zwei Kniestöße (Platzhalter), Griff gehalten, Wurf rückwärts | `griff_knie_wurf.gif`, `griff_knie_wurf_streifen.png` |
| Posesprünge bei jedem Wechsel zwischen Clips | `uebergaenge.png` (links letztes Bild des alten, rechts erstes Bild des neuen Clips, 1:1 auf 60 %) |
| Anker | `anker_schatten.png` |

Neu erzeugen: `godot/werkzeuge/vela_belege.sh [<beleg> …]` (Repo-Wurzel, Godot, Xvfb, ImageMagick und ffmpeg nötig, etwa 6 Minuten; `foto.gd` hat dafür
die Option `--info`, eine CSV mit Fußpunkt, Aktion, Uhr, Quelle und Clipbild je Bild).

### Beurteilung (ehrlich, nach Ansicht der Bilder)

- **Größe:** alle Clips zeigen die Kampfhaltung 142 Spielbildpixel (284 Bildschirmpixel) hoch (Test: gleicher Maßstab in allen fünfzehn Clips), so groß wie die
  Platzhalter-Gegner (Bolzer 57 × 72). Kein Clip springt in der Größe; in den tiefen Ausfallschritten (Kette 3, Wurf, Aufstehen) wirkt sie wegen der Pose kleiner.
- **Anker und Schatten:** die Figur steht in allen Clips mittig im Schatten (`anker_schatten.png`); der Sprung von 50 Bildschirmpixeln beim Wechsel zwischen
  gemalten und Pixel-Clips ist erledigt (es gibt keine Pixel-Clips mehr). Der Schatten bleibt im Flug am Boden, beim Liegen steht er unter dem Körper.
- **Posesprünge** (`uebergaenge.png`, je einen Tick): bruchlos sind Kette 1 → 2, Kette 4 → Stand, Getroffen → Stand, Wurf → Stand, Umgeworfen → Liegen, Liegen → Aufstehen
  (gleiche Pose). Sichtbar, aber in einem Tick: Stand → Gehen und Gehen → Stand (Fäuste oben gegen nach vorn gelehnte Gehhaltung; jede Aktion beginnt mit ihrem
  ersten Bild, einen Übergangsclip gibt es nicht), Kette 2 → 3 und Kette 3 → 4 (der tiefe Ausfallschritt mit gestrecktem Arm gegen die aufrechte Haltung des
  nächsten Clips), Aufstehen → Stand (Ausfallschritt gegen Stand), Griff → Wurf (Höhe und Vorderkante der Pose gleich, der Hinterfuß springt etwa 7 Spielpixel
  nach vorn, der Stand ist im Wurf schmaler), Gehen → Griff und Stand → Kette 1 (Aktionsbeginn: die Pose ändert sich in einem Tick, es gibt keinen Anlauf).
- **Rückkehr in die Kampfhaltung:** nach Kette 4, Getroffen, Wurf und Aufstehen steht der Clip `stand` ohne erkennbaren Bruch (Aufstehen: kleiner Sprung); aus der Haltepose des
  Griffs (nach dem Losreißen in g+61) in die Kampfhaltung springt die Pose (Vorbeuge und breiter Stand gegen aufrecht, der Hinterfuß springt nach vorn), ebenso aus dem Gehen.
- **Flackern:** in den neun neuen Clips gibt es kein Ausreißerbild (Prüfung aller Bilder: ein Bild, dessen Abstand zu beiden Nachbarn mehr als das 1,6-fache des
  Abstands der Nachbarn untereinander ist, kommt nicht vor); in `sprung` weicht Bild 35 geringfügig ab. In den Streifen und GIFs (jeder zweite Tick) ist kein Flackern zu sehen; `stand` und
  `gehen` laufen als Schleife ohne sichtbare Naht.
- **Farbfehler der Quellen:** kein Grünsaum und keine grünen Flächen mehr (Zählung grünlicher Pixel: Median 0 bis 2 je Bild, höchstens 16 in `sprungtritt`). Wohl aber
  einzelne Bilder, in denen die KI-Videos die Farbe von Handschuhen, Stiefeln und Haarspitzen driften lassen (grünlich-olivfarbener Schimmer, gefunden mit einer Zählung
  gelbgrüner Pixel und am Bild geprüft): `gehen` 10 und 22 (Haarspitzen, Stiefelkanten, Handschuh; je 1 bis 2 Ticks in 39, im Spiel kaum zu sehen), `getroffen_vorn` 11 (gelbe
  Fingerspitzen), `umgeworfen` 11 und 12 (violetter Handschuh), `sprungtritt` 6 (kräftig: olivgrüne Handschuhe und Stiefel, bekannt aus der ersten Lieferung) und `wurf` 50 bis 56:
  die Handschuhe wechseln im Schwung die Farbe (grau-blau, lila, türkis mit gelben Fingerspitzen in Bild 54, dunkelviolett mit orangen Spitzen in Bild 55 = dem Loslassen,
  schwarz-gold in 56); im Spiel sind das etwa sechs Ticks (0,1 s) bis nach dem Loslassen, die auffälligste Stelle der neuen Clips. Der orange Streifen der Jacke (Brust,
  Schulter, Oberarm) liegt je Clip woanders (Kette 3: am Oberarm, Stand: Brust), im Gehen ist er in der einen Hälfte des Zyklus sichtbar, in der anderen nicht; das fällt im
  Spiel kaum auf, bleibt aber ein Unterschied zwischen den Clips. Nachbestellung oder Retusche der Wurf-Bilder 50 bis 56 wäre sauberer.
- **Zeit:** Griff, Wurf, Kette und Treffer laufen im Takt der Logik (Tests an den Zeitpunkten des Kerns). Der Schwung des Wurfs läuft mit 1 bis 2 Quellbildern je
  Tick, das Tragen in 21 Ticks (0,35 s) statt der 2,25 s des Videos, die erste Hälfte der Wartezeit (Ducken) mit 3 bis 4 Bildern je Tick; das Ausschwingen mit
  tiefen Händen (Bilder 56 bis 62) läuft über 5 Ticks.
- **Kniestoß:** für jeden Kniestoß (22 Ticks, bis zu drei) ersetzt ein orangefarbener Kasten (Platzhalter, 57 × 71 Spielpixel) die gemalte Vela
  (`godot_hd_spiel_griff_knie_wurf_streifen.png`); der Gegner steht dahinter. Das ist der auffälligste Bruch im Spiel. Ohne neuen Clip wäre das Halten der Haltepose
  während des Kniestoßes die einfachste Linderung (wenige Zeilen in `wahl`: für KNIESTOSS den Clip `griff` mit `halten` wählen); sie ist nicht eingebaut, weil der Kniestoß laut
  Vorgabe ohne Clip bleibt (Entscheidung der Hauptsitzung).
- **Stilbruch:** Vela ist durchgehend gemalt. Hintergrund, Gegner, Behälter und Anzeige sind weiter flache Platzhalter; neben den Kästen wirkt die gemalte Vela
  „höher aufgelöst“ als alles um sie.

### Aktionen ohne gemalten Clip

Sprungangriff H (hoch) und T (runter), Sprintsprung, Sprintangriff, Kniestoß, Spezialangriff, Getroffen von hinten, Waffe (Raketenwerfer), Aufnehmen und Neueinstieg
(Auftritt, Fall, Landung). Für sie zeigt die Darstellung den Platzhalter (die Puppe deckt davon nichts ab). Tests: `video_test.gd` (`wahl` leer, nicht abgedeckt,
Szenen mit Kniestoß und Spezial zeigen den Platzhalter, fehlende Clips fallen auf Puppe oder Platzhalter zurück).

### Offene Punkte

- Gemalte Clips (Nachbestellung) für die Aktionen oben, vor allem Kniestoß (jeder Griff mit Kniestoß zeigt den Kasten), Spezial und Sprintangriff; ein Wurf
  rückwärts (Gegner über die Schulter) und ein Anlauf für das Zugreifen (der Kern hat keinen).
- Wurf: Farbwechsel der Handschuhe in den Bildern 50 bis 56, außerdem `sprungtritt` 6 und kleinere Stiche in `gehen` 10 und 22 (Retusche oder Nachbestellung).
- Gehen und Stand: ein Übergangsclip (Gehen anfangen und aufhören) nähme die Posesprünge; die Logik hat dafür keine Frames, die Darstellung müsste Ticks über die Aktion hinaus
  zeigen (Entscheidung offen).
- Arbeitsspeicher wächst mit jedem Clip (209 MiB für Vela allein): bei weiteren Figuren siehe „Speicher“ oben.
- Hocke und Absprung: die Hocke des Sprungs ist im Clip lang, in der Logik ein Tick; ein sichtbarer Anlauf bräuchte Spielraum in der Logik (nicht Aufgabe der
  Darstellung).

## Speicher der Clips (E27/E28, Teil A)

Ziel: deutlich weniger Arbeitsspeicher für die gemalten Clips ohne Ruckler. Alle Zahlen in MiB (1048576 Byte); Code `darstellung/vela_frames.gd`,
Tests `tests/speicher_test.gd` (144 Prüfungen), Messung `werkzeuge/speicher_messung.gd`. Die Zahlen der Maßnahmen stammen von den fünf Clips der ersten Lieferung (Teilwert);
den Stand mit allen fünfzehn Clips gibt die Tabelle am Ende des Abschnitts.

Vorher (jedes Bild als Image und als Textur, alle Clips beim ersten Gebrauch ganz geladen): fünf gemalte Clips (360 Zeilen) 122,3 MB Images
(Prozess `MEMORY_STATIC` +122) und 162,5 MB Texturen am Renderer-Zähler (`RENDER_TEXTURE_MEM_USED`), im Prozess (RSS unter Xvfb) +247 MB, unter
`--headless` +122 MB; Laden des Sprungs allein 0,8 s am Stück (8 ms je Bild unter Xvfb), der Rest 2 ms je Bild headless.

Maßnahmen:

1. **Textur statt Image.** Nach `ImageTexture.create_from_image` wird das Image verworfen. Wer Pixel braucht (Tests, Werkzeuge), liest das Bild mit
   `DarstellungVelaFrames.bild_aus_datei` neu aus der Datei (verlustfrei, also pixelgleich zu vorher).
2. **Zuschnitt.** Die Textur ist das sichtbare Rechteck des Bildes (`Image.get_used_rect()`) plus 1 Pixel Rand; der Versatz (`bild_versatz`) geht in
   `Sprite2D.offset` ein. Die Dateien bleiben unverändert (die Umsetzer-Ausgabe ist auf die Vereinigung aller Figuren zugeschnitten, einzelne Bilder
   brauchen weniger). Alles außerhalb ist Alpha 0: geprüft, dass kein sichtbares Pixel verloren geht (Textur = Ausschnitt des Dateibildes Byte für Byte,
   Ausschnitt umschließt alle Pixel mit Alpha > 0, alle Bilder aller fünfzehn Clips). Spart bei den fünf Clips 44 % (122,0 → 68,4 MB).
3. **Laden nach Bedarf, Vorausladen in Häppchen.** `clip_daten` liest nur `clip.txt`. Im Spiel (`DarstellungVelaFrames.nachladen`, von `spiel.gd` gesetzt, nicht in
   Tests, Fotos und mit `--ende`) lädt `abgedeckt` nie: ein noch nicht bereiter Clip gilt als nicht abgedeckt (die Darstellung nimmt Puppe oder Platzhalter, wie bei jedem
   Clip ohne Abdeckung) und wird vorgemerkt; `vorausladen_schritt` lädt je gezeichnetem Bild ein Häppchen (mindestens ein Bild, solange 3 ms nicht verbraucht sind, 6 ms bei vorgemerkten Clips), zuerst die
   vorgemerkten Clips, dann `VORAUS_REIHE` (stand, gehen, kette1, sprint, sprung, sprungtritt, kette2 bis 4, getroffen_vorn, umgeworfen, liegen, aufstehen, griff, wurf). Der Wechsel der Quelle (Puppe → gemalt)
   geschieht einmal je Clip, sobald er ganz geladen ist; es gibt kein Flackern, weil ein Clip nie halb gezeigt wird (beim Wechsel ändert sich die Pose von der Puppe zur gemalten Vela, die Fußmitte bleibt). Synchrones Laden mitten im Spiel gibt es nicht
   (Ladezeit je Bild 2,7 bis 4,6 ms headless, 2,7 bis 5,6 ms (größtes Bild 10 ms) unter Xvfb mit Textur-Upload; der Sprung am Stück 0,4 s, daher die Häppchen).
   Nach dem Start sind im laufenden Spiel (`speicher_messung.gd --modus spiel`, Vorführung unter Xvfb, Bilder zu rund 28 ms, gemessen am 2026-10-08 mit allen fünfzehn Clips) stand nach 16 Bildern bereit, gehen nach 27, kette1 nach 53,
   sprint nach 69, kette2 nach 122, kette3 nach 135, kette4 nach 169, sprung nach 201, sprungtritt nach 252, griff nach 297, wurf nach 355, getroffen_vorn nach 380, umgeworfen nach 439, liegen nach 440 und aufstehen,
   der letzte, nach 520 Bildern (rund 9 s bei 60 Bildern je Sekunde auf einer echten GPU, wo ein Bild kürzer dauert, die Zeit je Häppchen aber gleich bleibt; die Reihenfolge weicht von `VORAUS_REIHE` ab, weil
   die Vorführung Clips früher braucht und sie dann vorgemerkt werden); solange zeigt das Spiel für Aktionen, deren Clip fehlt, die Puppe bzw. den Platzhalter (in der Messung 154 von 900 Bildern, darin auch die Aktionen, die nie einen Clip haben).
4. **Budget mit LRU.** `SPEICHER_BUDGET_MB` = 256 (`budget_bytes`; bis zum 2026-10-08 128): Fordert ein Clip mehr Platz an, als das Budget lässt, entlädt `_platz_schaffen` ganze Clips,
   zuerst den am längsten nicht benutzten; der gerade gezeigte Clip, der angeforderte und die `schutz_zuletzt` (2) zuletzt benutzten bleiben. Das Vorausladen entlädt nie,
   es hört beim Budget auf. Alle fünfzehn Clips brauchen 209,2 MiB und passen ins Budget (46,8 MiB bleiben frei); ein Entladen geschieht erst, wenn weitere Clips dazukommen (bei weiteren Figuren siehe „Gemalte Vela“, „Speicher“).
   Ein entladener Clip lädt bei Bedarf wieder (Puppe/Platzhalter bis dahin).
5. **Abbildung der Zeit unverändert.** Die Tabelle (`vela_frames_tabelle.gd`) liest nur `clip.txt`; die Bildindizes vor dem Laden, nach dem Laden und nach Entladen und Wiederladen
   sind gleich (Test), 74 von 74 Szenen bitgleich, die Vorführung mit Darstellung gleich der Referenz (600 Schritte in `darstellung_test.gd`, 800 in `video_test.gd`).

Nachher (fünf gemalte Clips, 360 Zeilen, ganz geladen; `speicher_messung.gd --modus clips`):

| Zähler | vorher | nachher |
|---|---|---|
| eigene Summe der Texturen | 122,0 MB (volle Rechtecke) | **68,4 MB** (stand 13,1, kette1 8,2, sprint 5,6, sprung 24,5, sprungtritt 16,9) |
| Images im Prozess (`MEMORY_STATIC`, Xvfb) | +122 MB | +0,2 MB |
| Texturen am Renderer-Zähler (Xvfb, llvmpipe) | 162,5 MB | 91,0 MB (der Zähler liegt rund ein Drittel über der eigenen Summe, vermutlich wegen einer Mipmap-Kette des Treibers; nicht geprüft) |
| Prozess (RSS, Xvfb) | +247 MB | +73 MB |
| Prozess (RSS, `--headless`) | +122 MB | +69 MB (der Dummy-Renderer hält die Bilder der Texturen) |

Mit allen fünfzehn Clips (2026-10-08, `speicher_messung.gd --modus clips`, 709 Bilder):

| Zähler | Wert |
|---|---|
| eigene Summe der Texturen | **209,2 MiB** (Teilwert der ersten fünf Clips 68,4 MiB; je Clip in „Gemalte Vela“) |
| Dateien (WebP, dezimal) | 52,6 MB (erste fünf: 18,3 MB) |
| Images im Prozess (`MEMORY_STATIC`, Xvfb) | +0,7 MB (43,3 → 44,0 MB; die Bilder werden nach dem Zuschnitt verworfen) |
| Texturen am Renderer-Zähler (Xvfb, llvmpipe) | 289,0 MB (Start 10,5 MB, +278,5; ein Drittel über der eigenen Summe) |
| Prozess (RSS, Xvfb) | +217,5 MB (265,3 → 482,8 MB) |
| Prozess (RSS, `--headless`) | +209,8 MB (130,3 → 340,1 MB) |
| Laden aller Bilder am Stück | 2,7 s (headless, 3,8 ms je Bild im Mittel, größtes Bild 9,3 ms); im Spiel in Häppchen |

Die Zielvorgabe (höchstens etwa 100 MB Texturspeicher für die fünf gemalten Clips) ist mit 68 MB (eigene Summe) bzw. 91 MB (Zähler) erfüllt; für alle fünfzehn Clips gilt der Zielwert
230 MiB (`speicher_test.gd`, `ALLE_MB`) und das Budget von 256 MiB. Mit
480 Zeilen wären es 120 MB bzw. rund 160 MB (siehe „Auflösung 1536 × 896“). Was sich nicht messen lässt: `RENDER_TEXTURE_MEM_USED` ist unter `--headless` 0 (kein Renderer);
der Verbrauch an Grafikspeicher einer echten GPU und eine eventuelle Kompression der Treiber sind hier nicht beobachtbar (llvmpipe nutzt den Hauptspeicher). Eine GPU-Kompression
(BPTC/S3TC, 4 : 1) wurde nicht eingesetzt, weil sie die weichen Kanten und Farben der gemalten Clips verfälschen würde.

## Stand

Phase 0 bis 2 und 4 von Auftrag 6 erledigt; Spielbild 1536 × 896 (E28), Speicher der Clips begrenzt (E27/E28, Teil A); alle fünfzehn Vela-Clips gemalt (E27), Griff und Wurf
auf `griff` und `wurf` abgebildet; 74 von 74 Szenen bitgleich zur TypeScript-Referenz, die Vorführung mit Darstellung 600 (`darstellung_test.gd`) bzw. 800 Schritte (`video_test.gd`) gleich
der Referenz; `alle.gd` grün (4339 Prüfungen, etwa 70 s). Offen: Abnahme der
Leistung im Fenster (60 Bilder je Sekunde bei 1536 × 896, vom Nutzer zu bestätigen; hier nur Software-Rendering gemessen), die Entscheidung über die Höhe der gemalten
Clips (360 gewählt, 480 gemessen, siehe „Auflösung 1536 × 896“), die Entscheidung über den Weg der Figurenanimation, gemalte Clips für die Aktionen ohne Clip (Kniestoß, Spezial, Sprintangriff, Sprungangriff H und T,
Sprintsprung, Getroffen von hinten, Waffe, Aufnehmen, Neueinstieg; siehe „Gemalte Vela“, „Aktionen ohne gemalten Clip“), Speicher bei weiteren Figuren (Clips der Bühne laden oder Texturen komprimieren), Grafik der übrigen Figuren und des Hintergrunds, Ton, Export.
`docs/grafik.md` (Zeile „Anzeigeleiste, Schrift“ und „Effekte“, „bei 2× verdoppelt“) ist noch
auf Faktor 2 geschrieben; im Code folgt alles aus `DARSTELLUNG` = 4 und die Schrift ist 4 × 4 Bildpixel je Schriftpixel.
