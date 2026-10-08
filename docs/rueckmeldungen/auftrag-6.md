# Rückmeldung Arbeitssitzung (Claude Sonnet 5.5), Auftrag 6, 2026-10-08

Stand: **fertig**. Phase 0 bis 4 erledigt. Die Vela-Puppe aus Phase 2 wurde auf
Wunsch des Nutzers durch gemalte Videoclips (Grok, Umsetzung mit eigenem
Werkzeug) ersetzt, soweit Clips vorliegen. Die Abnahme der 60 Bilder je Sekunde
im Fenster steht noch aus (Abschnitt „Abnahme“).

## Commits
Erster Commit auf `main`: `3526453` (Godot-Projekt, Festkomma, Zufall, Werte,
Tasten, Entitäten, Ereignisse). Letzter Commit vor dieser Rückmeldung:
`708cff3` („Belege und Dokumentation der gemalten Vela (HD) im Spiel“); danach
nur noch der Commit dieser Datei. Alle Commits direkt auf `main` (91 im
Repository), keine Branches, kein Pull Request. Workflow `Godot-Tests`: grün
(Lauf 43 auf `708cff3`, Ergebnis `success`; die Läufe seit Phase 1 sind alle
grün).

## Godot-Version und Umgebung
Godot 4.7.2.stable.official (`4.7.2.stable.official.ed1daf0bf`), Linux x86_64
im Claude-Container (4 Kerne), `GODOT_VERSION` im Workflow ebenfalls 4.7.2.
Testlauf `alle.gd`: 3925 Prüfungen in etwa 38 s lokal (davon die 74 Szenen etwa
12 s); frischer Klon von GitHub mit `--import` und `alle.gd`: grün. Zusätzlich
gebraucht: ffmpeg 6.1.1 (nur für das Video-Werkzeug und seinen Test, ohne
ffmpeg wird dieser Teil übersprungen) und Xvfb für Bildschirmfotos.

## Port
| Ordner | Dateien | Zeilen |
|---|---|---|
| `godot/kern/` | 35 | 11 472 |
| `godot/pruef/` | 5 | 917 |
| `godot/tests/` | 8 | 3 981 |
| `godot/darstellung/` | 12 | 4 788 |
| `godot/werkzeuge/` | 9 | 4 417 |

Zum Vergleich: der TypeScript-Kern hat 12 272 Zeilen. Konstanten in
`werte.gd`: 495 (alle Namen aus `werte.ts`, mechanisch erzeugt). Die Portregeln
stehen in `godot/PORTREGELN.md`. Grafik: `godot/grafik/vela/` (Teile der
Puppe, 120 KB) und `godot/grafik/vela_video/` (Clips, 25 MB, darunter die fünf
gemalten Clips mit 18,3 MB).

Vorgehen Phase 1: Fundament von der Hauptsitzung, die übrigen Module von zehn
Unteragenten parallel (je Datei genau ein Schreiber), Abnahme durch die
Hauptsitzung. Danach Darstellung, Puppe und Video-Werkzeuge je mit einem
Schreiber je Datei.

## Abnahme
Szenen bitgleich: **74 von 74**; keine abweichende Szene.
Grundlagentests: grün (Festkomma, Zufall, Tasten, Eingabeparser, Stage-Parser,
Protokollformat, Reinheit des Kerns, Darstellung, Vela-Puppe, Video-Werkzeuge
und Clips: insgesamt 3925 Prüfungen mit den Szenen und dem Determinismustest).
Determinismus: ja (T1 zweimal, gleiche MD5).
Leistung: Vorführung (1500 Ticks, mit Protokollschreiben) headless **1,7 bis
1,9 s** bei warmem Zwischenspeicher (der allererste Lauf in einem frisch
gestarteten Container brauchte 12,4 s, das ist der kalte Start); die Protokolle
sind gleich der Referenz (MD5 `9a4742d5…`/`54015535…`). Fenster 60 Bilder je
Sekunde: **vom Nutzer nicht bestätigt**. Der Nutzer hat die Szene bisher nur in
Bildern und GIFs gesehen, nicht in einem Fenster. Die Darstellung liest die Welt
nur, die Logik ist die Uhr (60 Hz, höchstens 4 Schritte je Bild).

## Darstellung
Platzhalter: **fertig** (Rechtecke, Schatten, Hintergrundbänder, Anzeigeleiste,
Debug F1, Pause P, Einzelschritt N, Aufzeichnung F2, Neustart F3, Tasten wie
`docs/scheibe.md`).

Vela (der Weg hat sich dreimal geändert, Entscheidungen des Nutzers):
1. **Puppe** aus den Teilen von `vela_t_teile.png` (Skeleton2D, 16 Bones, Stand,
   Gehen, Kette 1 bis 4): vom Nutzer als nicht flüssig und nicht natürlich
   abgelehnt (Ziel: Streets of Rage 4). Der Code bleibt als zweite Quelle
   hinter den Videos (Option `--puppe`), die Puppe wird vorerst nicht
   weiterentwickelt.
2. **Pixelvideos:** Grok erzeugt je Handlung ein Video, `video_umsetzer.gd`
   macht daraus freigestellte Bildfolgen (Hintergrund entfernen, Größe
   normieren, Palette ≤ 64 Farben, Zyklus und Ereignisse erkennen), `vela_frames.gd`
   spielt sie nach der Logikuhr ab. Zehn Clips (stand, gehen, kette1 bis 4,
   sprint, sprung, getroffen_vorn, umgeworfen mit liegen, aufstehen).
3. **Gemalt (HD), gilt seit 2026-10-08:** gleiches Verfahren mit Modus `--hd`
   (weiche Kante, Entmischen gegen den grünen Grund, RGBA 8 Bit, WebP
   verlustfrei, 360 Zeilen hoch, im Spiel mit linearem Filter auf Spielgröße
   142 skaliert). Gemalt sind jetzt **stand, kette1, sprint, sprung und
   sprungtritt** (Sprungangriff N und R); die anderen Clips bleiben Pixel, der
   gemischte Betrieb ist getestet. Die Quellvideos liegen nicht im Repo; die
   Befehle je Clip stehen in `docs/godot.md` („Gemalte Vela“) und `docs/grafik-bestellung.md`.

Bilder (`docs/bilder/`): `godot_szene_*` (Platzhalter), `godot_vela_szene_*`
und `godot_kontakt_vela*` (Puppe), `godot_video_*` (Pixelclips),
`godot_hd_test.png`, `godot_hd_{kette1,stand,sprint,sprung,sprungtritt}_gemalt.png`
(Clips auf Grau und Weiß) und `godot_hd_spiel_*` (die fünf gemalten Clips im
Spiel, GIFs, Streifen, Vergleich Puppe gegen gemalt).

Werkzeuge: `video_umsetzer.gd` (Befehl und Optionen im Kopfkommentar, Abschnitt
„Video-Umsetzer“ in `docs/godot.md`), `hd_vorschau.gd`, `video_bogen.gd`,
`film.gd` (GIFs), `kontakt.gd`, `foto.gd`, `umsetzer.gd` (Puppenteile).
Die Prompts für Grok (Vorspann, Handlung je Clip, grünes Startbild, gemalter
Stil) stehen in `docs/grafik-bestellung.md` und als einfügbare Texte in
`docs/grok-prompts-vela-gemalt.md` (Pixelfassung: `docs/grok-prompts-vela.md`).

Beurteilung der gemalten Clips im Spiel (Streifen und Einzelbilder angesehen,
GIFs nicht Bild für Bild):
- Größe gleich der Puppe (142 Pixel), Kanten sauber, kein Grünsaum.
- Stand atmet ohne Flimmern, Schleifennaht ohne sichtbaren Sprung; Übergang
  kette1 → stand und Sprint ohne Sprünge der Pose.
- Sprungtritt: Kontaktbild liegt im Trefferfenster der Logik (Uhr 5 bis 28).
- **Mängel:** einzelne Bilder in sprung und sprungtritt mit Farbfehlern der
  Quelle (olivgrünes Haar, lila Handschuhe, rosa Streifen), je höchstens etwa
  drei Ticks; Wechsel von Sprung in Sprungtritt mitten in der Luft ist ein
  harter Posenwechsel (zwei getrennt gemalte Clips); die Hocke vor dem Sprung
  dauert in der Logik einen Tick, im Clip ist sie lang.

Abweichungen der Darstellung (nur Godot): Bildschirmfotos brauchen
`xvfb-run -a godot --path godot --rendering-driver opengl3 --script
res://werkzeuge/foto.gd` (unter `--headless` gibt es kein Rendering; das
Projekt nutzt `gl_compatibility`). Die Platzhalterbilder sind nicht
pixelgleich zur Canvas-Fassung, optisch gleich.

## Befunde zur TypeScript-Fassung (Verhalten ohne Spezifikation, mögliche Fehler)
Der Port blieb überall bitgleich zur Referenz. Beobachtungen der Port-Agenten,
zur Nachpflege durch den Orchestrator (keine davon ändert ein Protokoll):

1. `fern.ts`: `fernHatGetroffen` setzt `angriff_treffer = welt.frame`;
   `fernBewegung` und `fernAbbruch` prüfen `> 0` bzw. `== 0`. Das hängt davon
   ab, dass `welt.frame` im Kampfschritt nie 0 ist.
2. `treffer.ts` (um Zeile 358): `meine` hängt nur von `g.pruefangriff === i + 1`
   ab; der Zweig `inst !== null && inst.code !== 'PA'` ist nur über `!meine`
   erreichbar.
3. `schaden.ts` und `figur/intern.ts` lesen `steuerung` unterschiedlich:
   `eingang()` liefert bei `steuerung == 0` leere Eingaben, `schaden.ts` liest
   roh (Ausnahme Neueinstieg, laut Kommentar gewollt).
4. `figur/angriffe.ts`: `ketteFenster` und `ketteAktiv` lesen die Fenster mit
   `tab(AUSFALL_AKTIV_VON, i)`; bei Stufe 1 mit Ausfallschritt steht dort der
   Platzhalter 0, das Fenster wäre 0 bis 0.
5. `eingriffe.ts`: `eingriffPruefen` prüft nicht, ob `wert` zum Feld passt
   (Zahl bei `x`); der Fehler tritt erst in `eingriffAnwenden` auf, das
   `eingriffPruefen` noch einmal aufruft (doppelte Arbeit ohne Folgen).
6. `pruef/szene.ts`: `kamera.modus` speichert den gefundenen Text, nicht den
   Index; Fehlermeldungen von `satzZeilen` tragen nur die Zeilennummer.
7. `kamera.ts`: `offenerSchnitt` und die Blende benutzen nur `schnitte[0]`
   (im Kopf als Festlegung dokumentiert, in der Spezifikation nicht).
8. `gegner/boss_bahn.ts`: `BAHNEN.F1` hat `boden_vx` null, die Bossbahn
   `explosion` setzt 0. `festZahl` in `boss_zustand.ts` und in `nah.ts` sind
   zwei verschiedene Funktionen gleichen Namens.
9. `werte.ts` Kommentar zu `rang.ts`: „Q1“-Division als Lücke von Kampf 2.4,
   umgesetzt mit `divGanz`.

Neu aus der Darstellung (Logik, keine Protokolländerung): die Hocke des Sprungs
dauert in der Logik einen Tick (Sprunguhr 1). Ein sichtbarer Anlauf bräuchte
Spielraum in der Logik; das ist eine Frage des Spielgefühls, nicht des Ports.

## Abweichungen und Lücken (nur Godot)
- **Fehlerbehandlung**: `throw` der TypeScript-Fassung wird zu `push_error`
  mit demselben Text und einem unauffälligen Rückgabewert; GDScript kann
  Fehler nicht abfangen. Die Szenen lösen keinen dieser Fälle aus. Die
  `throws`-Tests der TypeScript-Fassung (Festkomma, Zufall, Eingabe) gibt es
  deshalb in Godot nicht.
- **Konstanten mit Objekten** (`BAHNEN`, `BOSS_BAHNEN`, `FLAECHE_AS/AN/KP`,
  `GEH_SCHRITT_*` als Tempo): GDScript hat keine Objektkonstanten; es sind
  Funktionen, die bei jedem Aufruf frische Objekte liefern. Dictionary-
  Konstanten stehen in `werte.gd`.
- **`Number(...)`/Dezimaltext** in `fest.*`-Werten: nur ganze Zahlen werden
  erkannt (das Wort `float` ist im Kern verboten). Die Szenen setzen nur
  Ganzzahlen.
- **Regulärer Ausdruck, Leerraum und `trim`** von JavaScript sind in
  `KernStage` nachgebildet.
- **`produktGroesser`** nutzt 64 Bit statt BigInt; die Faktoren der Aufrufer
  liegen unter 2^31. **`Infinity`** in `nah_gehen` ist `1 << 60`.
- **Stabiles Sortieren**: eigener Einfügesort, weil `Array.sort` in GDScript
  nicht stabil ist.
- **Zyklische Klassenverweise** übersetzen in 4.7.2 ohne Probleme.
- **`.uid`-Dateien** liegen im Repo; `.godot/` ist ignoriert.
- Die Kommandozeile des Prüflaufs löst relative Pfade ab der Repo-Wurzel auf.
- **Testverzeichnisse im Repo:** `godot/grafik/vela_video/_test_gehen` und
  `_test_kette1` (je etwa 0,6 MB) sind Reste früher Versuche und werden vom
  Spiel nicht benutzt; sie können gelöscht werden.
- **Quellvideos** von Grok liegen nicht im Repo (Größe, Rechte unklar). Für ein
  Neuerzeugen eines Clips braucht man das Video und den Befehl aus
  `docs/godot.md`.

## Was nicht erledigt wurde und warum
- **Fenster mit 60 Bildern je Sekunde** vom Nutzer bestätigen (Phase 3): noch
  nicht geschehen, der Nutzer arbeitet in der Vorschau, nicht im Fenster.
- **Gemalte Clips für die übrigen Handlungen:** gehen, kette2 bis kette4,
  getroffen_vorn, getroffen_hinten, umgeworfen, liegen, aufstehen, Griff,
  Kniestoß, Wurf, Spezial, Waffe, Aufnehmen, Sprungangriff H und T, Sprintsprung.
  Sie stehen als Prompts bereit (`docs/grok-prompts-vela-gemalt.md`), der Nutzer
  erzeugt die Videos in Grok. Bis dahin Pixelclips oder Platzhalter, mit
  sichtbaren Stilbrüchen (zum Beispiel Kette 1 → 2, Stand → Gehen).
- **Spielauflösung:** Fenster 768 × 448. Ein HD-Clip wird dort auf etwa 0,39
  verkleinert und gewinnt weiche Kanten und volle Farben, aber keine Schärfe.
  Für echtes HD müsste die Basisauflösung angehoben werden (Vorschlag:
  Viewport 1536 × 896, Faktor 4, `--spielhoehe 284` im Umsetzer). Hintergründe
  und Gegner sind noch Platzhalter und müssten im gemalten Stil entstehen.
- **Arbeitsspeicher:** der Abspieler hält je Bild das Bild und die Textur; die
  fünf gemalten Clips brauchen zusammen etwa 256 MB (sprung allein 106 MB). Mit
  allen Clips wird das zu viel; Abhilfe: nur die Textur halten, Clips bei
  Bedarf laden und entladen, kleinere Höhe (`--hoehe 300`).
- **Farbfehler in den Quellen** (sprung, sprungtritt): nur teilweise entfernt;
  Retusche oder Nachbestellung wäre besser.
- **PixelLab** (Dienst für Pixelfiguren mit Animation per Skelett) und
  **Blender/Spine** wurden geprüft und zurückgestellt: `api.pixellab.ai` und
  `download.blender.org` sind aus dem Container nicht erreichbar, und der
  Nutzer wollte ohne Handarbeit arbeiten.
- Ton, Export, Grafik der übrigen Figuren (Gegner, Hintergründe): wie im Auftrag
  nicht vorgesehen.

## Fragen an den Nutzer
1. Soll die Spielauflösung auf 1536 × 896 angehoben werden, und sollen
   Gegner und Hintergründe ebenfalls im gemalten Stil entstehen (Auftrag für
   Grok oder eine eigene Bestellung)?
2. Läuft das Spiel bei dir im Fenster mit 60 Bildern je Sekunde
   (`godot --path godot`, Godot 4.7.2 nötig)? Bitte kurz bestätigen oder die
   Anzahl der Bilder melden.
3. Die übrigen Clips: bitte nach den Prompts in `docs/grok-prompts-vela-gemalt.md`
   erzeugen; Reihenfolge nach Häufigkeit: gehen, kette2 bis kette4,
   getroffen_vorn, umgeworfen, aufstehen, dann Griff, Wurf, Spezial.
4. Sollen die Reste `_test_gehen` und `_test_kette1` gelöscht werden?
