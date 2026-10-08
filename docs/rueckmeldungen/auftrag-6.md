# Rückmeldung Arbeitssitzung (Claude Sonnet 5.5), Auftrag 6, 2026-10-08

Stand: **fertig**. Phase 0 bis 4 erledigt. Vela, die Heldin, wird nicht mehr als Gliederpuppe gezeichnet, sondern aus
fünfzehn gemalten Videoclips (Grok, mit eigenem Werkzeug in Bildfolgen umgesetzt); die Spielauflösung ist 1536 × 896
(E27, E28). Offen bleibt die Abnahme der 60 Bilder je Sekunde im Fenster (Abschnitt „Abnahme“).

## Commits
Erster Commit auf `main`: `3526453` (Godot-Projekt, Festkomma, Zufall, Werte, Tasten, Entitäten, Ereignisse). Letzter Commit vor
dieser Rückmeldung: `288f0b2`; danach nur noch der Commit dieser Datei. Alle Commits direkt auf `main` (108 im Repository), keine
Branches, kein Pull Request. Workflow `Godot-Tests`: grün (Läufe 56 bis 59 auf den Commits `663eeac` bis `bb4599a`, Ergebnis
`success`; alle Läufe seit Phase 1 sind grün).

## Godot-Version und Umgebung
Godot 4.7.2.stable.official (`4.7.2.stable.official.ed1daf0bf`), Linux x86_64 im Claude-Container (4 Kerne), `GODOT_VERSION` im
Workflow ebenfalls 4.7.2. Testlauf `alle.gd`: 4339 Prüfungen in etwa 70 s lokal (davon die 74 Szenen etwa 12 s); frischer Klon
von GitHub mit `--import` und `alle.gd`: grün. Zusätzlich gebraucht: ffmpeg 6.1.1 (nur für das Video-Werkzeug und seinen Test; ohne
ffmpeg wird dieser Teil übersprungen), Xvfb für Bildschirmfotos, ImageMagick für die Belegbilder (`werkzeuge/vela_belege.sh`).

## Port
| Ordner | Dateien | Zeilen |
|---|---|---|
| `godot/kern/` | 35 | 11 472 |
| `godot/pruef/` | 5 | 917 |
| `godot/tests/` | 9 | 4 724 |
| `godot/darstellung/` | 12 | 5 221 |
| `godot/werkzeuge/` | 11 `.gd` und 2 `.sh` | 4 730 |

Zum Vergleich: der TypeScript-Kern hat 12 272 Zeilen. Konstanten in `werte.gd`: 495 (alle Namen aus `werte.ts`, mechanisch erzeugt).
Die Portregeln stehen in `godot/PORTREGELN.md`. Grafik: `godot/grafik/vela/` (Teile der Puppe, 120 KB) und
`godot/grafik/vela_video/` (fünfzehn Clips, 709 Bilder, 53 MB; dazu die kleinen Reste `_test_gehen` und `_test_kette1`).

Vorgehen Phase 1: Fundament (Festkomma, Zufall, Werte, Tasten, Entitäten, Ereignisse, Welt) von der Hauptsitzung, die übrigen
Module von zehn Unteragenten parallel (je Datei genau ein Schreiber), Abnahme durch die Hauptsitzung. Danach Darstellung, Puppe
und Video-Werkzeuge mit je einem Schreiber je Datei.

## Abnahme
Szenen bitgleich: **74 von 74**; keine abweichende Szene.
Grundlagentests: grün (Festkomma, Zufall, Tasten, Eingabeparser, Stage-Parser, Protokollformat, Reinheit des Kerns, Darstellung,
Vela-Puppe, Video-Werkzeug und alle fünfzehn Clips, Speicher der Clips: insgesamt 4339 Prüfungen mit den Szenen und dem
Determinismustest). Die Vorführung wird mit Darstellung über 800 Schritte gegen die Referenz geprüft.
Determinismus: ja (T1 zweimal, gleiche MD5).
Leistung: Vorführung (1500 Ticks, mit Protokollschreiben) headless **1,7 bis 1,9 s** bei warmem Zwischenspeicher (der erste Lauf
in einem frisch gestarteten Container brauchte 12,4 s, der kalte Start); die Protokolle sind gleich der Referenz. Ein Logikschritt
des Kerns kostet im Mittel 0,59 ms (größter 4,95 ms) bei 16,67 ms je Tick. Zeit je gerendertem Bild unter Xvfb mit
Software-Rendering: etwa 27 ms bei 1536 × 896, das sagt nichts über eine echte GPU. Fenster 60 Bilder je Sekunde: **vom Nutzer
nicht bestätigt**. Der Nutzer hat die Szene bisher nur in Bildern und GIFs gesehen, nicht in einem Fenster.

## Darstellung
Platzhalter: **fertig** (Rechtecke, Schatten, Hintergrundbänder, Anzeigeleiste, Debug F1, Pause P, Einzelschritt N, Aufzeichnung F2,
Neustart F3, Vollbild F11, Tasten wie `docs/scheibe.md`). **Auflösung 1536 × 896** Bildpixel (Faktor 4 gegenüber den 384 × 224
Spielpixeln der Logik, E28; bisher 768 × 448), Startfenster 1280 × 747, frei skalierbar. Die Logik, die Protokolle und der Kern sind
dabei unverändert geblieben.

Vela (der Weg hat sich dreimal geändert, jeweils auf Wunsch des Nutzers):
1. **Gliederpuppe** aus den Teilen von `vela_t_teile.png` (Skeleton2D, 16 Bones, Stand, Gehen, Kette 1 bis 4): vom Nutzer als nicht
   flüssig und nicht natürlich abgelehnt (Ziel: Streets of Rage 4). Sie bleibt als zweite Quelle hinter den Clips (`--puppe`), wird
   aber nicht weiterentwickelt.
2. **Pixelvideos:** Grok erzeugt je Handlung ein Video, `video_umsetzer.gd` macht daraus freigestellte Bildfolgen (Hintergrund
   entfernen, Größe normieren, höchstens 64 Farben, Zyklus und Ereignisse erkennen), `vela_frames.gd` spielt sie nach der Logikuhr
   ab (`vela_frames_tabelle.gd` bildet Aktion und Uhr auf das Bild ab; es wird nie gemischt oder überblendet).
3. **Gemalt (HD), gilt seit 2026-10-08 (E27):** gleiches Verfahren mit Modus `--hd` (weiche Kante, Entmischen gegen den grünen
   Grund, RGBA 8 Bit, verlustfreies WebP, 360 Zeilen hoch, im Spiel mit linearem Filter auf 142 Basispixel Figurhöhe = 284
   Bildschirmpixel). Fünfzehn Clips: stand, gehen, kette1 bis kette4, sprint, sprung, sprungtritt (Sprungangriff N und R),
   getroffen_vorn, umgeworfen, liegen, aufstehen, griff (Zugreifen und Halten) und wurf (V und R). Alle Fußpunkte liegen auf der
   Mitte zwischen den Stiefeln (gemessen −0,2 bis +1,7 Spielpixel neben der Stiefelmitte; vorher 16 bis 18 daneben, die Figur stand
   links vom Schatten). Die Quellvideos liegen nicht im Repo; die Befehle je Clip stehen in `godot/werkzeuge/vela_hd_clips.sh`
   (einzige Quelle), die Beschreibung in `docs/godot.md` („Gemalte Vela“).

Arbeitsspeicher: je Bild nur die Textur (nicht das Image), auf das sichtbare Rechteck zugeschnitten, Clips werden nach Bedarf
geladen und im Leerlauf in Häppchen vorausgeladen (nie ein Clip mitten im Spiel, der gerade fehlt: bis er bereit ist, zeigt die
Darstellung Puppe oder Platzhalter ohne Flackern). Fünfzehn Clips zusammen **209 MB** Texturen, Budget 256 MB mit LRU-Entladen (bei den ersten fünf Clips sank der
Prozessspeicher dadurch von +247 auf +73 MB). Alle Clips sind etwa 9 s nach dem Start bereit.

Bilder (`docs/bilder/`): `godot_szene_*` (Platzhalter), `godot_vela_szene_*` und `godot_kontakt_vela*` (Puppe),
`godot_vergleich_puppe_pixel_gemalt.png` (die drei Stufen nebeneinander), `godot_hd_*_gemalt.png` und
`godot_hd_neue_clips_gemalt.png` (Clips auf Grau und Weiß), `godot_hd1536_*` (Auflösung und Speicher), `godot_hd_spiel_*`
(alle Clips im Spiel von der Logik getrieben: Streifen, GIFs, `anker_schatten.png`, `uebergaenge.png`, Vergleich Puppe gegen
gemalt); erzeugt von `werkzeuge/vela_belege.sh`.

Beurteilung (Streifen und Einzelbilder angesehen, die GIFs nicht Bild für Bild):
- Kanten glatt, kein Grünsaum, Größe passt zu den Gegner-Kästen, Vela steht mittig im Schatten, die Rückkehr in die Kampfhaltung
  nach Kette 4, Getroffen, Wurf und Aufstehen ist ohne erkennbaren Bruch.
- Sichtbare Posesprünge von einem Tick bei Wechseln zwischen getrennt gemalten Clips: Stand ↔ Gehen, Kette 2 → 3, Kette 3 → 4
  (tiefer Ausfallschritt gegen aufrecht), Aufstehen → Stand (klein), Griff → Wurf (der Hinterfuß springt etwa 7 Spielpixel),
  Haltepose → Stand nach dem Losreißen und alle Aktionsbeginne. Bruchlos: Kette 1 → 2, Kette 4 → Stand, Getroffen → Stand,
  Wurf → Stand, Umgeworfen → Liegen → Aufstehen.
- **Farbfehler der Quellen:** einzelne Bilder mit grünlich-olivfarbenem Schimmer an Haarspitzen, Stiefelkanten und Handschuhen
  (gehen 10 und 22, getroffen_vorn 11, umgeworfen 11 und 12, sprungtritt 6, sprung 35) und der Farbwechsel der Handschuhe im Wurf
  (Bilder 50 bis 56: grau-blau → lila → türkis → dunkelviolett, etwa 6 Ticks). Der orange Jackenstreifen wandert je Clip. Nachbestellen
  oder Retusche wäre besser als Weglassen.
- **Der Kniestoß ist der größte Bruch:** für jeden Kniestoß (22 Ticks, bis zu drei je Griff) ersetzt ein großer orangefarbener
  Platzhalter-Kasten die gemalte Vela, weil der Kern den Kniestoß als eigene Aktion führt und es keinen Clip gibt. Die einfachste
  Linderung wäre, für KNIESTOSS die Haltepose des Griffs zu zeigen (wenige Zeilen in `wahl`, Tests mit anpassen); sie ist nicht
  umgesetzt, bis der Nutzer die Wahl getroffen hat. Die richtige Lösung ist der Clip (Prompt steht bereit).
- Wurf rückwärts (R): der Clip schwingt nach vorn, der Gegner fliegt hinter die Figur; Spiegeln würde Pop-Flips am Anfang und Ende
  erzeugen und wurde nicht gemacht.

Abweichungen der Darstellung (nur Godot): Bildschirmfotos brauchen `xvfb-run -a godot --path godot --rendering-driver opengl3
--script res://werkzeuge/foto.gd` (unter `--headless` gibt es kein Rendering; das Projekt nutzt `gl_compatibility`). Die
Platzhalterbilder sind nicht pixelgleich zur Canvas-Fassung, optisch gleich.

## Befunde zur TypeScript-Fassung (Verhalten ohne Spezifikation, mögliche Fehler)
Der Port blieb überall bitgleich zur Referenz. Beobachtungen der Port-Agenten, zur Nachpflege durch den Orchestrator (keine davon
ändert ein Protokoll):

1. `fern.ts`: `fernHatGetroffen` setzt `angriff_treffer = welt.frame`; `fernBewegung` und `fernAbbruch` prüfen `> 0` bzw. `== 0`.
   Das hängt davon ab, dass `welt.frame` im Kampfschritt nie 0 ist.
2. `treffer.ts` (um Zeile 358): `meine` hängt nur von `g.pruefangriff === i + 1` ab; der Zweig `inst !== null && inst.code !== 'PA'`
   ist nur über `!meine` erreichbar.
3. `schaden.ts` und `figur/intern.ts` lesen `steuerung` unterschiedlich: `eingang()` liefert bei `steuerung == 0` leere Eingaben,
   `schaden.ts` liest roh (Ausnahme Neueinstieg, laut Kommentar gewollt).
4. `figur/angriffe.ts`: `ketteFenster` und `ketteAktiv` lesen die Fenster mit `tab(AUSFALL_AKTIV_VON, i)`; bei Stufe 1 mit
   Ausfallschritt steht dort der Platzhalter 0, das Fenster wäre 0 bis 0.
5. `eingriffe.ts`: `eingriffPruefen` prüft nicht, ob `wert` zum Feld passt (Zahl bei `x`); der Fehler tritt erst in
   `eingriffAnwenden` auf, das `eingriffPruefen` noch einmal aufruft (doppelte Arbeit ohne Folgen).
6. `pruef/szene.ts`: `kamera.modus` speichert den gefundenen Text, nicht den Index; Fehlermeldungen von `satzZeilen` tragen nur
   die Zeilennummer.
7. `kamera.ts`: `offenerSchnitt` und die Blende benutzen nur `schnitte[0]` (im Kopf als Festlegung dokumentiert, in der
   Spezifikation nicht).
8. `gegner/boss_bahn.ts`: `BAHNEN.F1` hat `boden_vx` null, die Bossbahn `explosion` setzt 0. `festZahl` in `boss_zustand.ts` und in
   `nah.ts` sind zwei verschiedene Funktionen gleichen Namens.
9. `werte.ts` Kommentar zu `rang.ts`: „Q1“-Division als Lücke von Kampf 2.4, umgesetzt mit `divGanz`.

Neu aus der Darstellung (Logik, keine Protokolländerung): Die Hocke des Sprungs dauert in der Logik einen Tick (Sprunguhr 1); ein
sichtbarer Anlauf bräuchte Spielraum in der Logik (Frage des Spielgefühls). Der Griff hat in der Logik keinen Anlauf: der Kern
schließt ihn am Ende eines Laufframes und beginnt dort GRIFF mit Uhr 1, der Gegner steht sofort in der Haltelage; die Darstellung
zeigt deshalb vom Clip nur das Kontaktbild und den Zug an die Brust. In `docs/grafik.md` stehen „bei 2× …“-Zeilen, die für
Faktor 4 gelten müssten; im Code folgt alles aus `DarstellungMasse.DARSTELLUNG`.

## Abweichungen und Lücken (nur Godot)
- **Fehlerbehandlung**: `throw` der TypeScript-Fassung wird zu `push_error` mit demselben Text und einem unauffälligen
  Rückgabewert; GDScript kann Fehler nicht abfangen. Die Szenen lösen keinen dieser Fälle aus. Die `throws`-Tests der
  TypeScript-Fassung (Festkomma, Zufall, Eingabe) gibt es deshalb in Godot nicht.
- **Konstanten mit Objekten** (`BAHNEN`, `BOSS_BAHNEN`, `FLAECHE_AS/AN/KP`, `GEH_SCHRITT_*` als Tempo): GDScript hat keine
  Objektkonstanten; es sind Funktionen, die bei jedem Aufruf frische Objekte liefern. Dictionary-Konstanten stehen in `werte.gd`.
- **`Number(...)`/Dezimaltext** in `fest.*`-Werten: nur ganze Zahlen werden erkannt (das Wort `float` ist im Kern verboten). Die
  Szenen setzen nur Ganzzahlen.
- **Regulärer Ausdruck, Leerraum und `trim`** von JavaScript sind in `KernStage` nachgebildet.
- **`produktGroesser`** nutzt 64 Bit statt BigInt; die Faktoren der Aufrufer liegen unter 2^31. **`Infinity`** in `nah_gehen`
  ist `1 << 60`.
- **Stabiles Sortieren**: eigener Einfügesort, weil `Array.sort` in GDScript nicht stabil ist.
- **Zyklische Klassenverweise** übersetzen in 4.7.2 ohne Probleme.
- **`.uid`-Dateien** liegen im Repo; `.godot/` ist ignoriert.
- Die Kommandozeile des Prüflaufs löst relative Pfade ab der Repo-Wurzel auf.
- **Testverzeichnisse im Repo:** `godot/grafik/vela_video/_test_gehen` und `_test_kette1` (je etwa 0,6 MB) sind Reste früher
  Versuche; die Tests benutzen sie als Beispiel für den Pixelmodus des Werkzeugs aus der Puppe. Sie können nur zusammen mit den
  Tests `_gehen_clip` und `_kette_clip` in `video_test.gd` gelöscht werden.
- **Quellvideos** von Grok liegen nicht im Repo (Größe, Rechte unklar). Für ein Neuerzeugen eines Clips braucht man das Video und
  den Befehl aus `godot/werkzeuge/vela_hd_clips.sh`.

## Was nicht erledigt wurde und warum
- **Fenster mit 60 Bildern je Sekunde** vom Nutzer bestätigen (Phase 3): noch nicht geschehen, der Nutzer arbeitet in der Vorschau,
  nicht im Fenster.
- **Gemalte Clips für die übrigen Aktionen:** Kniestoß, Spezial, Sprungangriff H und T (hoch, runter), Sprintangriff, Sprintsprung,
  getroffen von hinten, Waffe, Aufnehmen, Neueinstieg. Sie stehen als Prompts bereit (`docs/grok-prompts-vela-gemalt.md`), der
  Nutzer erzeugt die Videos in Grok; bis dahin zeigt die Darstellung Platzhalter (die Puppe deckt keine dieser Aktionen ab).
- **Gegner und Hintergründe** sind Platzhalter (Kästen, Bänder); sie müssten im gemalten Stil entstehen (Bestellung nach dem Muster
  von Vela). Der Stilbruch Vela gegen Platzhalter ist bei 1536 × 896 deutlich.
- **Arbeitsspeicher bei weiteren Figuren:** Vela allein braucht 209 MB Texturen; jede weitere Figur mit ähnlich vielen Clips braucht
  etwa dasselbe. Nötig wären komprimierte Texturen (zum Beispiel Atlanten mit VRAM-Kompression über den Godot-Import) oder das Laden
  nur der Clips der aktuellen Bühne.
- **Farbfehler in den Quellen** (siehe oben): nur teilweise entfernt (Sprungtritt); Retusche oder Nachbestellung wäre besser.
- **PixelLab** (Dienst für Pixelfiguren mit Animation) und **Blender/Spine** wurden geprüft und zurückgestellt: `api.pixellab.ai`
  und `download.blender.org` sind aus dem Container nicht erreichbar, und der Nutzer wollte ohne Handarbeit arbeiten.
- Ton, Export, Grafik der übrigen Figuren: wie im Auftrag nicht vorgesehen.

## Fragen an den Nutzer
1. Läuft das Spiel bei dir im Fenster mit 60 Bildern je Sekunde (`godot --path godot`, Godot 4.7.2 nötig, Fenster 1280 × 747 und
   Vollbild mit F11)? Bitte kurz bestätigen oder die Zahl der Bilder (F1 zeigt die Debug-Anzeige) melden.
2. Die übrigen Vela-Clips: bitte nach den Prompts in `docs/grok-prompts-vela-gemalt.md` erzeugen. Reihenfolge nach Wirkung im Spiel:
   Kniestoß (ersetzt den Platzhalter-Kasten), Spezial, getroffen von hinten, Sprungangriff hoch und runter, Sprintangriff.
3. Sollen Gegner und Hintergründe ebenfalls im gemalten Stil entstehen? Wenn ja, bestelle ich sie nach dem Muster von Vela
   (Startbild gemalt, Videos je Handlung).
4. Soll bis zum Kniestoß-Clip die Haltepose des Griffs den Platzhalter-Kasten ersetzen?
5. Sollen die Reste `_test_gehen` und `_test_kette1` samt ihren Tests gelöscht werden?
