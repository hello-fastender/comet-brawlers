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

## Stand

Phase 0 bis 2 und 4 von Auftrag 6 erledigt; 74 von 74 Szenen bitgleich zur
TypeScript-Referenz; `alle.gd` grün. Offen: Abnahme der Leistung im Fenster
(60 Bilder je Sekunde, vom Nutzer zu bestätigen), die Entscheidung über den Weg
der Figurenanimation, Grafik der übrigen Figuren, Ton, Export.
