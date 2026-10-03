# Comet Brawlers: vertikale Scheibe (Programm)

Stand 2026-10-03, im Aufbau (Auftrag 3). Das Programm setzt
`docs/spezifikation-kampf.md` und `docs/spezifikation-welt.md` um. Es liegt
in `spiel/`, ist in TypeScript geschrieben und hat keine Abhängigkeiten
(E22). Dieses Dokument beschreibt Bedienung, Bau, Tests, den Stand der
Abnahme und die Festlegungen, die beim Codieren nötig waren.

## Bedienung

### Start

Im Ordner `spiel/`, mit `PATH=/opt/node22/bin:$PATH`:

```
npm run bauen     # tsc -p tsconfig.browser.json: Kern, src/pruef (eingabe, protokoll, szene) und Darstellung nach dist/
npm start         # http-server im Ordner spiel/ auf Port 8080
```

Dann `http://localhost:8080/` öffnen (ES-Module laufen nicht über
`file://`). `index.html` lädt `dist/darstellung/main.js`, das die Stage
`daten/stages/scheibe.txt` per `fetch` holt; fehlt der Bau, nennt die Seite
den Befehl. Adresszusätze: `?seed=N` wählt den Seed (Standard 1),
`?debug=1` schaltet die Debug-Anzeige gleich ein. Das Spiel beginnt sofort
ab Spielstart (Bühne `scheibe`, Rang 9, ohne Prüfstart); nach GAME OVER und
nach dem Ende der Scheibe beginnt es neu mit Seed + 1 (Welt 10.3, 10.5).

### Tasten

| Taste | Wirkung |
|---|---|
| Pfeile | L, R, O (in der Tiefe nach hinten), U (nach vorn) |
| Y oder Z | Angriff A (erkannt nach der Lage der Taste, also auf QWERTZ und QWERTY gleich) |
| X | Sprung S |
| P | Pause an/aus, außerhalb der Logik (Welt 10.4): kein Logikschritt, Anzeige „PAUSE“ |
| N | in der Pause ein Einzelschritt mit dem aktuellen Tastenstand als T(f) (Welt 10.6) |
| F1 | Debug-Anzeige an/aus (ändert weder Logik noch Protokoll) |
| F2 | Eingabeaufzeichnung starten; erneut F2 beendet sie und bietet die Datei zum Herunterladen an |
| F3 | Neustart mit Seed + 1 (auch aus einer geladenen Eingabedatei zurück zur Tastatur) |

Spielzüge nach Kampf 4 bis 9: A und S zugleich = Spezialangriff;
Doppeltipp L oder R = Sprint; in einen Gegner hineinlaufen = Griff, im
Griff A = Kniestoß, Richtung und A = Wurf; im Sprung A = Sprungangriff.
T(f) ist der Tastenstand zu Beginn jedes Logikschritts; ein Druck, der
zwischen zwei Abfragen beginnt und endet, zählt in der nächsten Abfrage
noch als gedrückt (Festlegung K6). P, N und F1 bis F3 gehören nicht zu T
und werden nicht aufgezeichnet.

### Spielschleife

Nach E13 (Kampf 2.1): `requestAnimationFrame` mit Akkumulator, 60
Logikschritte je Sekunde in Echtzeit, Bilder werden ausgelassen, je
dargestelltem Bild höchstens 4 Logikschritte; was darüber liegt, verfällt
(kein Aufholen, etwa nach einem verborgenen Fenster). Ein Bild, das bis zu
1/8 Schritt zu früh kommt, zählt schon als Schritt; der Akkumulator trägt
den Rest weiter, damit ein 60-Hz-Bildschirm mit Zeitstempel-Zittern nicht
abwechselnd 0 und 2 Schritte läuft (Festlegung K6, nur Darstellung). Pause
und eine geladene Eingabedatei halten die Schleife an.

### Bild

Logisches Raster 384 × 224, ganzzahlig auf die Fenstergröße skaliert
(Gerätepixel), `image-rendering: pixelated`, schwarzer Rand. Lage und
Reihenfolge nach Kampf 2.5; Bildschütteln (KA10) verschiebt nur die Szene,
die Blende (KA13, Welt 10.5) dunkelt die Szene ab, die Anzeigeleiste bleibt.

| Element | Darstellung |
|---|---|
| Figuren | gefüllte Rechtecke in den Umrissen mit Schatten: Vela 57 × 76, Bolzer 57 × 72, Rammbock 60 × 76, Zünder 64 × 72, Ballast 70 × 100, Puppe wie Bolzer; Schatten als flache Ellipse am Fußpunkt; Höhe als Versatz nach oben; weißes Dreieck = Blickrichtung |
| Farben im Stand | Vela blau, Bolzer grün, Rammbock braun, Zünder türkis, Ballast violett, Puppe beige |
| Zustand als Farbe | rot = Angriff in aktiven Frames; orange = Angriff außerhalb der aktiven Frames (Ausholen, Nachlauf); gelb = Ankündigung (Kampfhaltung, Zielen, Ankündigung des Bosses); weiß = getroffen; grau = umgeworfen, liegend, tot (flach) und aufstehend (hockend); hellviolett = gehalten; hellblau = Figur in Griff, Kniestoß, Wurf; nur Umriss im Wechsel von 2 Frames = Schutz blinkend; Striche hinter der Figur = Sprint |
| Gegner | nur im aktiven Fenster (Welt 4.1); wartende Hockende grau und hockend, versteckte Gegner und der wartende Boss unsichtbar (Welt 4.2) |
| Objekte | Fass braun, Bosskiste grau, zerbrochen als Trümmer; Kometenbraten orange, Eisnudelschale hellblau, Sternbeeren magenta, Raketenwerfer und leere Waffe grün (blinken nach Welt 9.3); Rakete gelb mit Spitze, Explosion als orange Ellipse |
| Hintergrund | Farbflächen je Tiefenband (Wand darüber, Boden im Band); Tiefenband als Linien (Grenzen hell, Tiefenlinien alle 16 px, Bodenmarken alle 64 px); Hintergrundbilder der Stage als beschriftete Flächen; Vordergrund als halbtransparente Streifen am unteren Rand |
| Anzeige (Welt 10.1) | VELA, Punkte (8 Ziffern), Leben, LP-Balken der Figur, Name und Balken des zuletzt getroffenen Gegners, Balken in Lagen grün, gelb, orange, Pfeil „weiter“; große Texte PAUSE, STAGE CLEAR, BALLAST BESIEGT 5000, GAME OVER; „AUFZ“ oben rechts während der Aufzeichnung |

### Debug-Anzeige (F1)

Nach Welt 10.6. Text oben links: Frame, T(f), gehaltene Tasten, Quelle
(Tastatur oder Eingabedatei), Rang und Rang-Uhr, Seed und Ziehungen des
Hauptgenerators, K, Ky, Kameramodus, Bildschütteln, aktives Fenster,
Halter der Rechte, Lebende, Wellen, Phase, Steuerung, Leben, Punkte, Lage
und Zustand der Figur, Ereignisse des Frames. In der Szene:

| Zeichen | Bedeutung |
|---|---|
| Kasten cyan | Trefferfläche eines Angriffs gegen Gegner (Figur, Raketen, geworfener Gegner), in aktiven Frames |
| Kasten rot | Trefferfläche eines Angriffs gegen die Figur (Gegner, Geschosse, Prüfangriff), in aktiven Frames |
| Kasten grau gestrichelt | Angriffsinstanz außerhalb ihrer aktiven Frames |
| Kasten gestrichelt darüber | Höhengrenze des Ziels |
| Kasten weiß | Ziel eines Treffers in diesem Frame |
| gelbes Kreuz, gestrichelte Linie | Zielpunkt x_Z eines Nahkämpfers und sein Abbruchfenster (Welt 5.4); Zielpunkt des Zünders; Zielpunkt des Bosses |
| Marken über den Gegnern | Slot, Zustand, Frames im Zustand, Aktion, LP, Seite, Recht, Angriffscode, Zielabstand, Schaden |
| Marke unter der Figur | Aktion, Unterphase, Aktionsuhr |
| grün gestrichelt | Aufnahmebereich eines Gegenstands (Fußpunkte, von denen die Figur ihn aufnimmt) |
| orange gestrichelt | Grundfläche eines Behälters (Hindernis bis zum Zerbrechen) |
| senkrechte Linien | Folgepunkt der Kamera (x 200); in der Arena die Totzone (128 und 256) |

Die Trefferflächen sind die Bereiche der Fußpunkte möglicher Ziele, wie
`inFlaeche` in `src/kern/treffer.ts` sie prüft.

### Eingabeaufzeichnung (F2)

Die Datei hat das Format der Eingabedatei (Kampf 11.1) und enthält immer
alle Frames ab Frame 1 des laufenden Spiels bis zum Stopp, damit sie sich ab
Spielstart abspielen lässt; der Kopf nennt Seed (`# seed=N`), Bühne und den
Bereich zwischen Start und Stopp. Ein Neustart (F3, Game Over) beendet eine
laufende Aufzeichnung und speichert sie. Abspielen im Browser:
`comet.ladeEingabe(text)` in der Konsole, dann `comet.schritt(n)`. Prüflauf
derselben Eingabe in Node: eine Szene `szene name=… endframe=<Frames>
seed=<Seed> buehne=scheibe` ohne weitere Sätze ist der Spielstart, also
`npm run lauf -- --szene <szene> --eingabe <datei> --aus aus/<name>`.

### Debug-Schnittstelle `window.comet`

Für Playwright und die Konsole. Sie läuft unabhängig von der Spielschleife;
solange eine Eingabedatei geladen ist, steht die Schleife.

| Aufruf | Wirkung |
|---|---|
| `ladeEingabe(text, seed?)` | ersetzt die Tastatur durch eine Eingabedatei und beginnt ab Spielstart neu; Seed: Argument, sonst `# seed=N` der Datei, sonst der bisherige |
| `ladeSzene(szene, eingabe?)` | lädt eine Prüfszene (Format „Formate“, auch Prüfbühne) mit Eingabedatei; der Lauf endet nach `endframe` wie der Prüflauf (Promise) |
| `schritt(n = 1)` | führt n Logikschritte aus, zeichnet und gibt `zustand()` zurück; nach dem Ende der Scheibe läuft kein Schritt mehr |
| `zustand()` | serialisierbare Sicht: frame, seed, szene, Quelle, Pause, Debug, Figur, belegte Gegner und Objekte, Kamera, Rang, Rahmen, Anzeige-Daten und `protokoll`, die Zeile von `protokoll.csv` für den letzten Schritt (gleiche Spalten) |
| `spalten()` | Spalten von `protokoll.csv` |
| `debug(an?)`, `pause(an?)` | Debug-Anzeige bzw. Pause schalten (ohne Argument umschalten) |
| `spielen()` | zurück zur Tastatur, die Schleife läuft vom aktuellen Frame weiter |
| `neustart(seed?)` | neuer Lauf mit Tastatur (Standard Seed + 1) |
| `aufzeichnung()` | Eingabedatei des laufenden Spiels wie bei F2 |

### Bildschirmfotos und Vorführung

`npm run foto` (`werkzeuge/foto.mjs`) baut die Browserfassung, startet
einen eigenen Webserver (`node:http`, freier Port), öffnet die Seite in
Chromium (Playwright global, Browser unter `/opt/pw-browsers`), spielt
`tests/eingaben/vorfuehrung.txt` über `window.comet` ab, speichert alle 300
Frames ein Bild (768 × 448, zweifach skaliert) und eines mit
Debug-Anzeige und beendet Browser und Server. Optionen: `--eingabe`,
`--abstand`, `--debug-frame` (Standard 718), `--ohne-bau`, `--szene` (eine
Prüfszene statt des Spielstarts), `--aus` und `--praefix` (Ordner und
Namensanfang der Bilder).

Die Vorführung (Seed 1, 1500 Frames, ab Spielstart) ist am Protokoll
geprüft: Laufen, Welle 1 löst aus, Kette KT1 bis KT4 besiegt den Bolzer der
Welle 1 (Frame 212), Sprung nach vorn, Weckreiz der Welle 2, Griff (523)
und Wurf vorwärts (Druck 545, Treffer 546), der Geworfene zerbricht das
Fass, Spezialangriff (Druck 705) besiegt den Bolzer (719) und wirft den
Rammbock um (738), Kette gegen den
Rammbock, ein Schlag besiegt ihn (1176), Kometenbraten aufnehmen (1251),
Sprungangriff, Sprint ab 1449. Nachprüfen: Szene `szene name=vorfuehrung
endframe=1500 seed=1 buehne=scheibe` (steht im Kopf der Eingabedatei) mit
`npm run lauf`.

| Bild | Inhalt |
|---|---|
| `docs/bilder/scheibe_0300.png` | Frame 300: Sprung nach der Kette, Welle 1 besiegt |
| `docs/bilder/scheibe_0600.png` | Frame 600: geworfener Bolzer im Flug, Kometenbraten aus dem Fass, der Rammbock hockt noch |
| `docs/bilder/scheibe_0900.png` | Frame 900: der Rammbock kommt nach dem Spezialangriff wieder heran |
| `docs/bilder/scheibe_1200.png` | Frame 1200: Rammbock besiegt, die Figur im Nachlauf des Schlags |
| `docs/bilder/scheibe_1500.png` | Frame 1500: Sprint nach rechts |
| `docs/bilder/scheibe_debug.png` | Frame 718 mit Debug-Anzeige: Spezialangriff Stufe 1 aktiv, Bolzer s2 beginnt Schlag BA (Instanz noch nicht aktiv, Zielpunkt und Abbruchfenster), Rammbock s3 im Anmarsch, Aufnahmebereich des Kometenbratens |

### Prüfung der Darstellung

`tests/darstellung_typen.test.ts`: `main.ts` gehört zu
`tsconfig.browser.json` und typprüft dort gegen den unveränderten Kern
(`tsc --noEmit`, Exit 0). `tests/darstellung_browser.test.ts`: baut die
Browserfassung, lädt die Seite in Chromium, spielt die Vorführung über
`window.comet` 600 Schritte mit Debug-Anzeige (sie darf das Protokoll nach
Welt 10.6 nicht ändern) und vergleicht jede Protokollzeile Spalte für
Spalte mit dem Prüflauf in Node für dieselbe Szene und Eingabe (etwa 4 s;
ohne Playwright wird der Test übersprungen). Hilfen:
`tests/darstellung_hilfe.ts`.

## Bau und Befehle

Alle Befehle im Ordner `spiel/`, mit Node 22 aus `/opt/node22/bin`:

| Befehl | Wirkung |
|---|---|
| `npm run pruefen` | Typprüfung: Kern, Prüfläufe und Tests (`tsconfig.json`), Kern allein ohne Node- und DOM-Typen (`tsconfig.kern.json`), Kern und Darstellung für den Browser (`tsconfig.browser.json`) |
| `npm test` | alle Tests unter `tests/` mit `node:test` |
| `npm run lauf -- --szene <datei> --eingabe <datei> --aus <ordner> [--stages <ordner>]` | Prüflauf ohne Fenster; schreibt `protokoll.csv` und `objekte.csv` und gibt beide MD5 aus; ohne `--eingabe` ohne Tasten |
| `npm run bauen` | Browserfassung nach `spiel/dist/` |
| `npm start` | lokaler Webserver auf Port 8080 |
| `npm run foto` | Bildschirmfotos der laufenden Scheibe nach `docs/bilder/` |

## Werkzeuge und Umgebung

Geprüft in Phase 0 (2026-10-03):

| Werkzeug | Stand | Hinweis |
|---|---|---|
| Node | 22.22.0 | TypeScript direkt mit `--experimental-strip-types` |
| tsc | 6.0.2 | Typprüfung und Bau |
| Node-Typen | `@types/node` 26.1.1 unter `/opt/node-tools/node_modules/@types` | in `tsconfig.json` über `typeRoots` eingebunden; fehlen sie, scheitert nur die Typprüfung von Prüfläufen und Tests, nicht der Kern |
| `node --test` | ok | Node 22 nimmt keinen Ordner als Argument; das Skript `test` übergibt das Muster `"tests/**/*.test.ts"` |
| Playwright | ok, Chromium unter `/opt/pw-browsers` | aus ES-Modulen nur über `createRequire` ladbar, weil `NODE_PATH` dort nicht greift |
| Webserver | `http-server` global | Ersatz: `python3 -m http.server 8080 --directory spiel` |

## Tests

`npm test` führt alle Dateien `tests/*.test.ts` mit `node:test` aus (Stand
2026-10-03: 214 Tests, etwa 25 s). Gruppen:

| Dateien in `spiel/tests/` | Inhalt |
|---|---|
| `festkomma`, `zufall`, `stage`, `szene`, `eingabe`, `protokoll`, `welt`, `reinheit`, `determinismus` | Grundlagen aus K0: Festkomma, Xorshift, Formate, Protokoll, Logikschritt; `reinheit` prüft, dass `src/kern` weder Browser noch Node, Uhrzeit oder `Math.random` nutzt |
| `figur_*` | Spielfigur (K1): Zustandsautomat, Angriffe, Griff und Würfe, Schaden und Neueinstieg |
| `treffer_*` | Treffer (K2): Flächen, Reihenfolge, Reaktionsbahnen, Prüfangriffe |
| `welt_*` | Welt (K3): Nah- und Fernkämpfer, Kamera und Wellen, Rang und Rahmen, Gegenstände |
| `boss_*` | Boss (K4): Angriffe, Super-Armor SA1 bis SA6 |
| `abnahme_*` | Abnahmetests der Spezifikationen (K5), siehe „Abnahme“ |
| `darstellung_*` | Browserfassung (K6), siehe „Prüfung der Darstellung“ |

Szenen liegen unter `tests/szenen/`, Eingabedateien unter `tests/eingaben/`,
Referenzprotokolle unter `tests/referenz/`. `tests/szenen/vorfuehrung.txt`
ist die Szene zur Vorführung:

```
npm run lauf -- --szene tests/szenen/vorfuehrung.txt --eingabe tests/eingaben/vorfuehrung.txt --aus aus/vorfuehrung
```

## Abnahme

Stand 2026-10-03 (Stufe 3): alle 31 Abnahmetests der Spezifikationen grün,
dazu der Determinismus- und der Referenztest (`npm test`: 214 Tests grün,
mit den zwei Darstellungstests; Stand nach den Befunden der
Qualitätsprüfung). Das Referenzprotokoll `tests/referenz/W-T8_a.objekte.csv`
ist danach neu geschrieben, weil die Höhe der Zünderrakete jetzt ohne
Division sinkt (L116); das Protokoll von W-T8 a ist unverändert.

| Datei in `spiel/tests/` | Inhalt |
|---|---|
| `abnahme_kampf.test.ts` | Kampf 12: T1 bis T20 und D1, je ein `test()` mit dem Namen der Spezifikation |
| `abnahme_welt.test.ts` | Welt 12: dort T1 bis T10, hier W-T1 bis W-T10 |
| `abnahme_determinismus.test.ts` | jede Abnahmeszene (50 Kampf-, 15 Weltszenen) zweimal, gleiche MD5 von `protokoll.csv` und `objekte.csv` (Kampf 11.6) |
| `abnahme_referenz.test.ts` | `protokoll.csv` und `objekte.csv` der Szene W-T8_a bitgleich zu `tests/referenz/W-T8_a.protokoll.csv` und `W-T8_a.objekte.csv` |
| `abnahme_hilfe.ts` | Prüflauf über `src/pruef/` (`pruefLauf`), Zugriff auf die Protokollzellen, Sammeln aller Abweichungen eines Tests |

Je Lauf gibt es genau eine Prüfszene `tests/szenen/<Test>.txt` und eine
Eingabedatei `tests/eingaben/<Test>.txt`, bei Läufen mit Buchstaben
(`T5_e.txt`, `W-T8_a.txt`); ein Test ohne Tasten hat eine Eingabedatei nur
mit Kommentar. Die Läufe a, b, c … sind Teilprüfungen in dem einen `test()`.
Verglichen wird der Text der genannten Protokollzellen, Toleranz keine; ein
Test meldet alle Abweichungen auf einmal (Lauf, Frame, Spalte, erwartet,
ist). Nennt die Spezifikation eine Größe, die keine Spalte ist, rechnet der
Test sie aus den Zellen: dz in W-T5 als ⌊s1_z⌋ − ⌊f_z⌋ (Welt 1), die Fläche
des Prüfangriffs in T7 nach Kampf 11.2 (Ereignis genau in den Frames, in
denen die Figur darin steht), Sichtbarkeit in W-T10 b über `liegezeit`
(L108). Erwartungen, die nach Auftrag 3, Abschnitt 2.6 festgelegt sind,
nennen im Kommentar ihre Nummer (L69, L100 bis L108).

Einen Lauf ansehen: `npm run lauf -- --szene tests/szenen/T7_a.txt
--eingabe tests/eingaben/T7_a.txt --aus aus/T7_a`. Die Referenz entstand
beim ersten grünen Lauf am 2026-10-03 (MD5 `protokoll.csv`
c6fcf2d154fcd5b8038989979e1ce3ef, `objekte.csv`
a8d88cc60583061f6deaaacb4a21f1fc). Nur bei einer gewollten Änderung des
Verhaltens neu schreiben, mit `ABNAHME_REFERENZ_SCHREIBEN=1 npm test`, und
den Unterschied hier begründen.

| Test | prüft | Läufe | Stand |
|---|---|---|---|
| T1 | Kriterium 1, Bewegung | – | grün |
| T2 | Kriterium 2, Sprung | – | grün |
| T3 | Kriterium 3, volle Kette | – | grün; Frame 135 „Slot frei“ als leere Felder (L100) |
| T4 | Kriterium 4, Kombofenster | a bis d | grün |
| T5 | Kriterium 5, Reichweite | a bis h | grün |
| T6 | Kriterium 6, Griff und Wurf | a, b | grün |
| T7 | Kriterium 7, Schutzfenster | a, b | grün |
| T8 | Kriterium 8, 0 LP und gleichzeitiger Treffer | a bis d | grün |
| T9 | Kriterium 9, Rang | a bis c | grün; Lauf c mit dem Nahkämpfer in s1 (L101) |
| T10 | Kriterium 10, Sperre und Boss | a bis c | grün; Läufe und Prüfungen nach L102 |
| T11 | Sprint | a bis c | grün |
| T12 | Sprintangriff | a, b | grün; Puppe in Lauf b mit 16 LP (L103) |
| T13 | Spezialangriff ohne Treffer | a bis c | grün; Frame 81 nach L104 |
| T14 | Spezialangriff mit Treffern | – | grün; Puppen mit 16 LP (L103) |
| T15 | Sprungangriff | a, b | grün |
| T16 | Kniestoß, Haltedauer | a, b | grün; Lauf a mit der Eingabe nach L69 |
| T17 | Neustart der Reaktion | – | grün |
| T18 | Umwerfen, Aufstehen | – | grün; Frame 161 nach L105 |
| T19 | Raketenwerfer | a bis d | grün |
| T20 | Verlieren, Aufnehmen, Essen | a, b | grün; Kometenbraten in z 100 (L106) |
| D1 | Determinismus | alle Szenen von T1 bis T20 | grün; zweiter Rechner nicht prüfbar, Ersatz Referenztest (L107) |
| W-T1 | Kamera folgt, linker Rand | – | grün |
| W-T2 | Weckreiz, Aufwachen, Sperre | – | grün |
| W-T3 | Halt, Schnitt, Arena | – | grün |
| W-T4 | Versteck, Annähern, Pause, Treffer | – | grün |
| W-T5 | Zielpunkt und Abbruch | a, b | grün |
| W-T6 | Angriffserlaubnis und Schutz | – | grün |
| W-T7 | Super-Armor | a, b | grün |
| W-T8 | Schwelle, Zünder und Fall | a, b | grün |
| W-T9 | Rang, Tod und Neueinstieg | – | grün; Puppe mit 16 LP (L103) |
| W-T10 | Gegenstände | a bis c | grün; Lauf b „sichtbar“ und „blinkt“ über `liegezeit` (L108) |
| Determinismus | Kampf 11.6 für alle Abnahmeszenen | 65 Szenen | grün (zusätzlich zur Spezifikation) |
| Referenz | Protokolle von W-T8_a gegen `tests/referenz/` | – | grün (zusätzlich zur Spezifikation) |

## Formate

Alle Textdateien sind UTF-8 mit Zeilenende LF. Leser: `src/kern/stage.ts`
(Stage-Daten), `src/pruef/szene.ts` (Prüfszene), `src/pruef/eingabe.ts`
(Eingabedatei); Schreiber: `src/pruef/protokoll.ts` (beide Protokolle).
Unbekannte Satzarten, Felder und Schlüssel sind Fehler mit Zeilennummer.

### Prüfszene

Prüfszene nach Kampf 11.2 mit dem Prüfstart nach Welt 11.3, im Satzformat
der Stage-Daten (Welt 2.1): je Zeile ein Satz, zuerst die Satzart, dann
Felder `name=wert`, getrennt durch Leerzeichen; `#` beginnt einen
Kommentar. Ein Feld ohne `=` hat den Wert `ja` (`rang.fest`). Ganze Zahlen
für Koordinaten (Pixel, Nachkommaanteil 0), Blick als `R`/`L` oder
`rechts`/`links`, Schalter als `ja`/`nein` oder `an`/`aus`. Beispiele:
`spiel/tests/szenen/beispiel_puppe.txt` (Prüfbühne mit Puppe) und
`spiel/tests/szenen/beispiel_scheibe.txt` (Bühne `scheibe` mit Prüfstart).

| Satz | Felder (Standard) | Bedeutung |
|---|---|---|
| `szene` | `name`, `endframe`, `seed` (1), `buehne` (`pruefbuehne`) | genau einmal; Kennung, letzter Frame, Startwert (nicht 0), Stage-Datei `daten/stages/<buehne>.txt` |
| `pruefstart` | Schlüssel aus Welt 11.3 in deren Schreibweise, siehe unten | beliebig viele Sätze; spätere Angaben gelten |
| `figur` | `x`, `z`, `blick`, `lp`, `waffe` (`RW` oder `leer`), `munition` | höchstens einmal; fehlende Felder vom Start der Stage, 72 LP, ohne Waffe; `waffe=RW` ohne `munition` hat 3 Schuss |
| `gegner` | `slot` (0 bis 19), `typ` (`Bolzer`, `Rammbock`, `Zünder` oder `Zuender`, `Ballast`, `Puppe`), `x`, `z`, `rolle` (nach Typ: leicht, schwer, fern, boss; Puppe leicht), `blick` (zur Figur, bei gleichem x rechts), `lp`, `lp_max` (= lp), `vorplatziert` (`nein`), `logik` (Puppe `aus`, sonst `an`), `erlaubnis` (`an`), `erscheint` (0) | ein Gegner in seinem Slot; ersetzt einen Gegner der Stage im selben Slot. `vorplatziert=ja` heißt Startwerte (Welt 4.5: leicht 16 LP / 5 Schaden, schwer 30 / 6); ohne `lp` und nicht vorplatziert setzt `gegnerAngelegt` die LP nach Rang. Logik aus = Puppe (Kampf 11.2); Logik an = wach und kampffähig (Welt 11.3). `erscheint=f` mit f > 1: erscheint in W1 von Frame f, vor den übrigen Eingriffen |
| `objekt` | `slot` (20 bis 59), `typ` (`Gegenstand`, `Behälter`, `Rakete`, `Waffe`, `Effekt`), `art`, `x`, `z`, `munition` (0; Raketenwerfer 3), `inhalt` (Behälter `leer`), `id` (`o<slot>`) | ein Objekt in seinem Slot; ein Gegenstand liegt von Beginn an (gelandet, aufnehmbar, Liegezeit 0) |
| `eingriff` | `frame`, `ziel`, `feld`, `wert` | setzt in W1 des Frames einen Wert (Nachkommaanteil 0) und schreibt `EI:<ziel>.<feld>=<wert>` |
| `pruefangriff` | `slot`, `von`, `bis`, `schaden`, `umwerfen` (`nein`) | Angriffsinstanz PA des Gegners in den Frames von bis (Kampf 11.2) |

Schlüssel des Satzes `pruefstart` (Welt 11.3):

| Schlüssel | Wirkung |
|---|---|
| `rang=n`, `rang.fest` | Startrang (Prüfszene: 9); `rang.fest` hält ihn (Rang-Uhr steht) |
| `kamera.x=n`, `kamera.modus=M` | Startkamera (Ky nach `kamera_y`); M aus FREI, SPERRE, HALT, BLENDE, ARENA, ENDE; ARENA: Totzone ab Frame 1 |
| `welle.n=aus`, `welle.n=an`, `welle.7=nur_boss` | Welle ohne vorplatzierte und neue Gegner (ihr Slot bleibt leer); wieder an; Welle 7 ohne die Bolzer, Boss wach und kampffähig, Bosskisten zerbrochen |
| `sperre.ID=aus`, `halt.ID=aus`, `behaelter.ID=aus` | Satz der Stage entfällt (`=an` nimmt das zurück) |
| `behaelter.ID=art,x,z,inhalt` | zusätzlicher Behälter, nach denen der Stage im nächsten Objektslot |
| `gegner.sN.erlaubnis=aus` | Gegner in Slot N fordert kein Recht an |
| `boss.angriffe=aus`, `boss.bewegung=aus`, `boss.lp=n` | Boss greift nicht an, bewegt sich nicht, Start-LP |
| `fest.NAME=WERT` | ersetzt das Ergebnis der Ziehung NAME (z. B. `fest.gehstufe=normal`, `fest.angriff=BA`, `fest.zielpunkt=128`); die Ziehung findet trotzdem statt; der Kern reicht die Werte als `welt.fest` an die Module |
| `figur.x=`, `figur.z=`, `figur.blick=`, `figur.lp=`, `figur.waffe=`, `figur.munition=` | wie der Satz `figur` (Schreibweise der Prüfstarts PS1 bis PS10) |

Ziele und Felder der Eingriffe:

| Ziel | Felder |
|---|---|
| `f` | `x`, `z`, `h` (px), `lp`, `lp_max`, `blick`, `schutz`, `waffe`, `munition` |
| `sN` | `x`, `z`, `h`, `lp`, `lp_max`, `blick` |
| `oN`, `gN` | `x`, `z`, `h`, `lp`, `munition`, `liegezeit` |
| `rang` | `wert`, `zaehler`, `fest` |
| `kamera` | `x`, `modus` |
| `welle.N` | `jetzt` (löst Welle N aus) |

Ein Eingriff setzt nur das Feld; Folgen wie der Tod bei LP unter 0 erkennt
das zuständige Modul im selben Frame (LP < 0 ≤ lp_vor).

### Stage-Daten (Ergänzung)

Format nach Welt 2.1. Für die Prüfbühne (Kampf 11.2) hat der Satz `stage`
zwei zusätzliche Felder: `kamera=fest` (Kamera bleibt bei Kamera-x und
Kamera-y des Starts; Standard `folgt`) und `raender=aus` (Welt 2.2 Punkt 4,
Bild- und Stage-Ränder der Figur, gilt nicht; Standard `ja`). Weitere
Standardwerte: `gegner blick=links`, `gegner werte=rang`, `behaelter
inhalt=leer`, `welle wert=0 bonus=0`, `eintrag verzoegerung=0`. Die
Zusatzbedingung schreibt sich `bedingung=lebende≤n` oder `bedingung=lebende<=n`.

### Eingabedatei

Nach Kampf 11.1: Zeilen mit `#` sind Kommentare, jede Datenzeile
`von,bis,tasten` mit Buchstaben aus `L R O U A S` in beliebiger
Reihenfolge, gedrückt in allen Frames von bis bis einschließlich;
überlappende Zeilen werden vereinigt, nicht genannte Frames haben keine
Taste. Die Aufzeichnung (`eingabeText`) schreibt je Lauf gleicher, nicht
leerer Tastenmengen eine Zeile in der Reihenfolge L R O U A S, aufsteigend
nach von. Beispiel: `spiel/tests/eingaben/beispiel.txt`.

### Protokoll

Datei `protokoll.csv` nach Kampf 11.3 und Welt 11.4. Kopf aus
Kommentarzeilen in dieser Reihenfolge:

```
# version=comet-brawlers-scheibe-0.1
# szene=<name>
# seed=<seed>
# eingabe_md5=<MD5 der Eingabedatei>
# EINGRIFF erscheint frame=<f> slot=<n> typ=<Typ> x=<x> z=<z>      je Gegner mit erscheint
# EINGRIFF frame=<f> ziel=<ziel> feld=<feld> wert=<wert>            je Eingriff in Szenenfolge
# EINGRIFF pruefangriff slot=<n> von=<f> bis=<f> schaden=<n> umwerfen=ja|nein
```

Dann die Kopfzeile mit den Spaltennamen, dann eine Zeile je Frame
(Frame 1 bis endframe; endet früher, wenn die Scheibe endet, Welt 10.5).
Trennzeichen Komma, Dezimalpunkt Punkt, 358 Spalten in fester Reihenfolge:

| Gruppe | Spalten |
|---|---|
| Figur, Rang, Kamera (Kampf 11.3) | `frame`, `tasten`, `f_x`, `f_z`, `f_h`, `f_lp`, `f_zst`, `f_akt`, `f_ph`, `f_uhr`, `f_stopp`, `f_schutz`, `f_blick`, `kombo`, `f_waffe`, `f_mun`, `f_sprint`, `rang`, `rang_zaehler`, `kamera_x`, `kamera_y`, `zufall_haupt` |
| je Gegnerslot s0 bis s19 (Kampf 11.3) | `sn_typ`, `sn_x`, `sn_z`, `sn_h`, `sn_lp`, `sn_zst`, `sn_akt`, `sn_modus`, `sn_ph`, `sn_blick` (erst alle Spalten von s0, dann s1 …) |
| Welt (Welt 11.4) | `kamera_modus`, `schuetteln`, `lebende`, `wellen`, `pfeil`, `recht_l`, `recht_r`, `zielrecht`, `leben`, `punkte`, `anzeige`, `phase`, `steuerung` |
| je Gegnerslot s0 bis s19 (Welt 11.4) | `sn_recht`, `sn_angriff`, `sn_ziel`, `sn_schaden`, `sn_timer`, `sn_zufall` |
| Super-Armor (Welt 11.4) | `s0_lpfolge`, `s0_folge` |
| Ereignisse (Kampf 11.4, Welt 11.4) | `ereignis` |

Formate: Positionen (`f_x`, `f_z`, `f_h`, `sn_x`, `sn_z`, `sn_h`) als
exakte Dezimalzahl des 16.16-Werts ohne überflüssige Nullen und ohne „-0“
(135.125, 51.25, 100); übrige Zahlen als ganze Zahl. `tasten` in der
Reihenfolge L R O U A S, leer ohne Taste. Blick `R` oder `L`. `f_waffe`
leer oder `RW`, `f_mun` die Munition (0 ohne Waffe). `recht_l`, `recht_r`,
`zielrecht`, `anzeige` als Slotnummer ohne „s“ oder leer. `schuetteln` als
`x/y`. `wellen` als ausgelöste Wellen in Reihenfolge der Auslösung, durch
`-` getrennt. `sn_akt` ist in Reaktionen der Reaktionsname, sonst die
Körperaktion (STAND, GEHEN, ANGRIFF …); `sn_modus` der Logikzustand nach
Welt 5.2, 6, 7.1, in Reaktionen deren Name, dazu FREI (Reaktion beendet,
die Logik wählt im nächsten Frame) und PUPPE (Logik aus). `sn_timer` zählt
die Frames im aktuellen Modus einschließlich des laufenden (1 im ersten).
Alle Spalten eines freien Gegnerslots sind leer, ebenso `s0_lpfolge` und
`s0_folge` bei freiem s0. `ereignis`: Einträge durch `;`, Felder durch `:`
getrennt, in der Reihenfolge ihres Eintretens; Kennungen nach Kampf 11.4
und Welt 11.4, dazu `OV:Art` (kein Objektslot frei, Welt 9.1) und der
Angriffscode `LN` für die Landung beim Neueinstieg (Kampf 6.5). Kein Feld
enthält ein Komma.

### Objektprotokoll

Datei `objekte.csv` nach Kampf 11.5. Kopf wie `protokoll.csv` ohne die
Zeilen `EINGRIFF` (version, szene, seed, eingabe_md5), dann die Kopfzeile
`frame,slot,typ,art,x,z,h,zst,lp,munition,liegezeit,inhalt,flugphase`,
dann je Frame eine Zeile je belegtem Slot, erst o20 bis o59, dann g0 bis
g4. `slot` als `o20` bzw. `g0`; Positionen wie im Protokoll; `typ` aus
Gegenstand, Behälter, Rakete, Waffe, Effekt; `art` die Gegenstands- oder
Behälterart; `inhalt` der Inhalt eines Behälters (`leer`, wenn ohne);
`flugphase` leer, `FLUG` oder `EXPLOSION`.

## Abweichungen und Lücken

Stellen, die die Spezifikation nicht oder widersprüchlich regelt, und ihre
Festlegung beim Codieren (Auftrag 3, Abschnitt 2.6). Je Eintrag: Stelle,
Festlegung, Grund, ob die Spezifikation anzupassen ist.

| Nr. | Stelle | Festlegung | Grund | Spezifikation anpassen |
|---|---|---|---|---|
| L1 | Kampf 11.2 | Prüfszene im Satzformat wie Welt 2.1 (Abschnitt „Formate“) | kein Dateiformat angegeben | ja |
| L2 | Kampf 11.2, Prüfbühne | Satz `stage` mit `kamera=fest` und `raender=aus` (Welt 2.2 Punkt 4 gilt dort nicht); Band x 0 bis 4000 | das Stage-Format kennt beides nicht | ja |
| L3 | Welt 2.3, 4.7, Welle 2 | zusätzlicher Satz `welle nr=2 ausloeser=kamera wert=250`; die Hockenden wachen weiter einzeln nach 4.2 | ohne Satz gäbe es kein `WL:2` und keinen Eintrag in der Spalte `wellen` | ja |
| L4 | Welt 2.3 | vorplatzierte Gegner `blick=links` | die Daten nennen keinen Blick | ja |
| L5 | Kampf 11.3, `sn_akt` | in Reaktionen der Reaktionsname, sonst die Körperaktion (STAND, GEHEN, ANGRIFF, NACHLAUF, WARTEN, AUFTRITT, SPOTT, ZIELEN, SCHUSS, SPRUNG, TAUMELN, STOSS, ANKUENDIGUNG) | außerhalb von Reaktionen nicht geregelt | ja |
| L6 | Welt 5.2, 11.4, `sn_modus` | zusätzliche Werte FREI (Reaktion vorbei, Entscheidung im nächsten W4) und PUPPE (Logik aus) | Übergang und Puppe nicht geregelt | ja |
| L7 | Kampf 6.5, 11.4 | Angriffscode `LN` für die Landung beim Neueinstieg | der Treffereintrag braucht einen Code | ja |
| L8 | Welt 9.1 („Protokoll vermerkt es“) | Ereignis `OV:Art`, wenn kein Objektslot frei ist | keine Kennung angegeben | ja |
| L9 | Kampf T9 Lauf c, Welt T9 („in f erscheint ein Gegner“) | Satz `gegner … erscheint=f`; angelegt in W1 vor den übrigen Eingriffen, mit Ziehung des Hauptgenerators; Kopf `# EINGRIFF erscheint …`; Ereignis `EI:sN.erscheint=Typ` | Form nicht angegeben | ja |
| L10 | Kampf 11.2, 11.3 | Prüfangriffe stehen im Kopf als `# EINGRIFF pruefangriff …` | 11.2 zählt sie zu den Eingriffen | nein, Klarstellung |
| L11 | Kampf 11.5 | `objekte.csv` bekommt den Kopf von `protokoll.csv` ohne EINGRIFF-Zeilen | Kopf nicht geregelt | ja |
| L12 | Kampf 11.3, Welt 11.4, Spaltenfolge | nach `s0_typ` bis `s19_blick` die Weltspalten, dann je Gegner `sn_recht` bis `sn_zufall`, dann `s0_lpfolge`, `s0_folge`, `ereignis` | Reihenfolge offen | ja |
| L13 | Kampf 11.3, Formate | Rechte und Anzeige als Slotnummer ohne „s“ (wie Welt-T4 `recht_r 1`); `f_mun` 0 ohne Waffe; `s0_lpfolge` und `s0_folge` auch ohne Boss in s0; `sn_timer` zählt einschließlich des laufenden Frames (1 im ersten) | nicht festgelegt | Klarstellung |
| L14 | Welt 2.2 Punkt 2 („endet an ihrer Kante“) | letzte ganzzahlige begehbare Lage des Weges, Nachkommaanteil 0; gibt es keine, steht die Achse; Ränder der Figur auf den genauen Festkommawert (passt zu Welt-T1: Wand bei 98) | mehrdeutig | ja |
| L15 | Welt 2.2 | der Rand eines Hindernisses zählt als innen | nicht geregelt | Klarstellung |
| L16 | Welt 2.1, `kamera_y` | vor dem ersten Satz gilt dessen y0 | nicht geregelt | Klarstellung |
| L17 | Welt 11.3, `welle.7=nur_boss` | die Bosskisten gelten als zerbrochen; ob ihr Inhalt liegt, entscheidet die Welt (K3) | offen | ja |
| L18 | Kampf 11.2, Gegner ohne `lp` | mit `vorplatziert=ja` Startwerte (leicht 16/5, schwer 30/6, Boss 100), sonst LP nach Rang; Standard `vorplatziert=nein`, Blick zur Figur | Standardwerte offen | Klarstellung |
| L19 | Kampf 11.2, Gegenstand aus der Szene | liegt von Beginn an: gelandet, aufnehmbar, Liegezeit 0 | nötig für T20 Lauf b | Klarstellung |
| L20 | Welt 11.3, KA7, `kamera.modus=ARENA` im Prüfstart | die Totzone gilt ab Frame 1 | KA7 sagt „ab dem nächsten Frame“ nach Erreichen von k0 | Klarstellung |
| L21 | Kampf 7, Zustand im Trefferframe | im Frame W bzw. t gilt noch Zustand 3, ab W+1 bzw. t+1 Zustand 2 (ein gehaltener Gegner bleibt 2) | Wortlaut „2 von W+1“ und T3 (Zustand 2 erst in 57) | ja |
| L22 | Kampf 5.7, 7: Gegner in der Luft getroffen | die Bahn beginnt in der aktuellen Höhe, Ruhe 9 Frames nach dem Bodenkontakt (wie P15) | nicht geregelt | ja |
| L23 | Kampf 7: Liegedauer des Zünders | wie der leichte Nahkämpfer: 32 Frames, nach einem Wurf 16 | nicht gemessen; einfachste Festlegung | ja |
| L24 | Kampf 5.4, 5.5: mehrere Instanzen, dasselbe Ziel, derselbe Frame | ein umgeworfener oder getöteter Gegner und ein zerbrochener Behälter sind für spätere Instanzen desselben Frames nicht mehr treffbar; für spätere Frames bleibt das Ziel offen | bildet die sofortige Anwendung im Vorbild nach | ja |
| L25 | Kampf 5.5, Welt 9.2: Behälter als Ziel | Gegnerinstanzen prüfen in Punkt 3 nach der Figur auch Behälter; Prüfangriff und Landung beim Neueinstieg zerbrechen keine | 11.2 und 6.5 nennen nur Figur bzw. Gegner | ja |
| L26 | Welt 4.1: aktives Fenster auf der Prüfbühne | gilt auch dort für die Treffbarkeit (alle Abnahmetests liegen darin) | nicht geregelt | Klarstellung |
| L27 | Kampf 11.2: Prüfangriff | beginnt nicht, wenn der Gegner im ersten Frame nicht in Zustand 1 ist, und beginnt danach nicht neu; ein eigener Angriff eines Gegners mit Logik geht vor | einfachste Festlegung | ja |
| L28 | Welt 5.9: „fordert in G das Recht an“ | die Reaktion endet in KS3 von G bzw. h+23; die Logik entscheidet ab W4 des nächsten Frames, das Recht kommt in G+1 (Bewegung ab G+1 und Kampfhaltung ab h+24 stimmen) | W4 liegt vor KS3 | ja |
| L29 | Kampf 3: letzter_angreifer | enthält den Urheber (beim geworfenen Gegner die Figur); Anzeige und Punkte zählen den Urheber | nicht geregelt | ja |
| L30 | Kampf 11.3: sn_ph | in UMGEWORFEN und TOT die Bahn (F1, F2, F3, F4, F4b), sonst leer | nicht geregelt | ja |
| L31 | Kampf 7: Treffer auf einen schon sterbenden Gegner | Wirkung W ohne Folgen (nur durch fremde Treffer im selben Frame möglich) | Schutzregel | nein |
| L32 | Welt 7.2, 7.3: Angriffsbeginn des Bosses | Ereignis AS, Schaden und nächster Abstand ab dem ersten Frame der Ankündigung; bei der Körperpresse ab dem Beginn der Hocke (A−15) | „15 Frames Hocke, dann A“ | ja |
| L33 | Welt 7.3: Armschwung im Protokoll | Ereignis AS:s0:ASk je Schwung, Instanzcode AS, sn_angriff AS1 bis AS3; der Schaden des ersten Schwungs gilt für alle | offen | ja |
| L34 | Welt 7.1: Gehen des Bosses | x und z getrennt: x mit 1,25 px/Frame bis 70 px Abstand, z mit 0,625 bis zur Tiefe der Figur; kein Zurückweichen | nur Tempo und Abstand genannt | ja |
| L35 | Welt 7.3: Auslauf des Ansturms | 4 px/Frame, je Frame 0,25 weniger: 30 px in 15 Frames | Spanne ohne Ziehung | ja |
| L36 | Welt 7.3: Lauf des Ansturms | 3,92 px/Frame nur in Frames mit Tiefenschritt; im Schutz der Figur läuft er weiter; der letzte Frame ist noch aktiv | offen | ja |
| L37 | Welt 7: Arenarand | alle Schritte des Bosses zwischen x 1792 und 2304 | nicht definiert | ja |
| L38 | Welt 7.3, Kampf 2.4: Flug der Körperpresse | z wie x mit ⌊dz·k/64⌋ (Kampf 2.4 nennt die Division nur für x); Höhe über Konstanten ohne Division | Verlauf offen | ja |
| L39 | Welt 7.3: Körperpresse | Nachlauf zählt ab dem letzten aktiven Frame, Modus NACHLAUF erst nach der Landung; in der Luft unterbricht kein Treffer ohne Umwerfen; ein umwerfender wirft aus der aktuellen Höhe um (wie P15) | nicht geregelt | ja |
| L40 | Welt 7.4, SA3/SA5: „eigener Angriff“ | nur ANKUENDIGUNG und ANGRIFF; im Nachlauf unterbricht ein Treffer; ein aufgeschobener Stoß beginnt nach den aktiven Frames | offen | ja |
| L41 | Welt 7.4, SA5: Stoß | Beginn S in W5; 3 px/Frame in S+1 bis S+16; BEREIT ab S+54; Zustand 2 bis S+61; kein Angriff bei Zustand ≠ 1; kein AS-Ereignis für RZ, sn_schaden 0; ein laufender Stoß startet nicht neu | offen | ja |
| L42 | Welt 11.3: boss.bewegung=aus | hält nur das Gehen an; Reaktionen, Stoß und Angriffsbewegungen laufen weiter | mehrdeutig | Klarstellung |
| L43 | Welt 7.1: Bahnen des Bosses | nach dem Bodenkontakt 2 px/Frame Auslauf (Ruhe bei 127,25 px), F2 mit demselben Auslauf, Explosion ohne Auslauf, Wurf F3 nach Kampf 5.7 | offen | ja |
| L44 | Welt 7.1: Taumeln | x-Verlauf wie F1, ab h+1 nicht treffbar, frei in h+78, Wirkung R | offen | ja |
| L45 | Welt 7.6: Slot des Bosses | bleibt nach dem Tod belegt (kein FR:s0) | wie im Vorbild | ja |
| L46 | Welt 11.4: s0_lpfolge | außerhalb einer Folge 0 | Gerüst | Klarstellung |
| L47 | Welt 7.6: Fall des Bosses | übrige LP werden auf −1 gesetzt (nicht um 1 gesenkt); auch vorgemerkte Wellen entfallen; Geschosse verschwinden ohne Ereignis | offen | ja |
| L48 | Welt 7.4: Griff und Super-Armor | Losreißen in W5 erkannt, SA5 im Frame danach; Kniestoß 1 und 2 im Griff ohne Reaktion | – | nein |
| L49 | Welt 11.3: fest-Schlüssel des Bosses | boss_angriff (AS, AN, KP), boss_abstand (170 bis 200), boss_liegen (42 bis 70), boss_frei_wurf (116 bis 144), boss_frei_explosion (132 bis 152) | Namen offen | ja |
| L50 | Welt 7.4, SA2: „anderer Treffer“ | jeder Treffer ohne Umwerfen außer SP, KN, WU, RX, LN, ST zählt vorläufig | Klarstellung | Klarstellung |
| L51 | Welt 7.2: Start des Bosses | ein schon wacher Boss ist ab Frame 1 bzw. ab seinem Erscheinen kampffähig; in PS7 erster Angriff in Frame 61 | nicht geregelt | Klarstellung |
| L52 | Welt 3, KA3/KA4/KA6 | Sperren und Halte links von K begrenzen nicht | sonst hielte H1 die Kamera in der Arena (PS7) | ja |
| L53 | Welt 3, KA4/KA5/KA6 | SR, HR und der Pfeil nur, wenn die Sperre bzw. der Halt die Kamera im Vorframe hielt (keine Meldung beim Durchfahren) | nicht geregelt | ja |
| L54 | Welt 3 KA4, 4.4, 11.3: abgeschaltete Welle | gilt als besiegt und löst in W7 nie aus; der Eingriff `welle.n jetzt` löst sie trotzdem samt neuen Gegnern aus | nicht geregelt | ja |
| L55 | Welt 3, KA13: Blende | BL:e in c+135; Phase und Modus BLENDE von c+1 bis c+134; nur ein Schnitt je Stage | nicht geregelt | ja |
| L56 | Welt 3, KA10: Bildschütteln | beginnt im Frame des Anlasses (Einschlag, Landung der Körperpresse) | nicht geregelt | ja |
| L57 | Welt 4.4: Auslöser | `figur_abstand` misst zu den wartenden Gegnern der Welle; nach dem Fall des Bosses löst keine Welle aus | nicht geregelt | ja |
| L58 | Welt 4.1, 4.5: Slots und LP | ist kein Slot frei, entsteht kein Gegner (ohne Ereignis); vorplatzierte mit werte=rang bekommen ihre LP beim Weckreiz | nicht geregelt | ja |
| L59 | Welt 5.5: Nachlauf und Sprungtritt | der feste Rückzug im Nachlauf bewegt nicht (Strecke fehlt); die aktive Pose verlängert sich nach einem Treffer auch beim Sprungtritt um 7 Frames (bis A+52) | Strecke nicht angegeben | ja |
| L60 | Welt 5.6, 5.8: Serie und Abwarten | die Abwartezeit zählt in jedem Zustand ab dem Serienende, das Recht wird erst danach angefordert; nach verbrauchtem Verfolgungsbudget keine neue Abwartezeit; die Wahl BUB oder BUA fällt am Ende des Nachlaufs von BA; Entscheidungen mit nur einer Möglichkeit ziehen nicht | nicht geregelt | ja |
| L61 | Welt 5.3, 5.8: Haltepunkt und Kanten | Haltepunkt erreicht, Tiefe außerhalb: nur in z weiter; „weniger als 1,75 px“ gilt je Achse; die nähere freie Kante ist der z-Rand des umschließenden Rechtecks, bei Gleichstand nach vorn | nicht geregelt | ja |
| L62 | Welt 5.2, 5.9: „Figur hinter ihm“, Recht nach dem Aufstehen | Blick des Vorframes; das Recht nach dem Aufstehen wird in G+1 angefordert (Gehen ab G+1 wie verlangt) | nicht geregelt | ja |
| L63 | Welt 5.7, E-10 | Halter gehen in ABWARTEN, laufende Angriffe enden ohne AA, ein Sprungtritt landet erst | nicht geregelt | ja |
| L64 | Welt 5.1: schnelles Gehen | kann wegen ⌊x⌋ schon bei 54 px anhalten (Vorbild 55 bis 56) | Rundung | nein, Hinweis |
| L65 | Welt 6: Zünder | „geht vom Zielpunkt weg“ heißt: zu seinem Zielpunkt, von der Figur weg (ZURUECK bei |dx| < 100); im Zielen bleibt der Blick vom Zielbeginn; Abbruch ohne AA; Zielrecht ohne Ereignis abgegeben; Kolbenhieb mit Nachlauf wie BA, Bildrand hinter ihm K bzw. K+383; der Bildrand hält die Rakete nicht auf, Einschlag als EX:on; Waffe beim Tod erscheint in t, landet in t+34, aufnehmbar und LA ab t+44; `fest.zielpunkt` = 128, 120h oder 120v | nicht geregelt | ja |
| L66 | Welt 8: rang.fest | hält den Rang auch beim Tod | nicht geregelt | ja |
| L67 | Welt 9.2, 9.3, 11.3: Behälter und Gegenstände | ein zerbrochener Behälter verschwindet in W8 von h+1, sein Inhalt kommt in den kleinsten freien Slot; bei `nur_boss` erscheint der Kisteninhalt in Frame 1 (zu L17); Treffer auf Bosskiste oder zerbrochenen Behälter: Wirkung W; Behälter melden beim Scrollen EN:on:S; Gegenstände aus der Prüfszene zählen ihre Liegezeit ab L = 1 | nicht geregelt | ja |
| L68 | Welt 10.2, 10.3: Steuerung, Game Over, Punkte | steuerung 0 von t+1 bis LN+5; GAME OVER beginnt in N des letzten Todes (GO statt NE:F), die Scheibe endet in N+239, den Neustart mit Seed + 1 macht die Darstellung; Punkte für besiegte Gegner bei LP < 0 ≤ lp_vor, auch durch einen Eingriff, eine Puppe nach ihrer Rolle | nicht geregelt | ja |
| L69 | Kampf 12, T16 Lauf a | Eingabe A 23, 39, 41, 59 statt A 23, 40, 41, 59: In einer Eingabedatei sind 40 und 41 ein gehaltener Druck, 41 wäre nach 2.1 kein neuer Druck | Widerspruch zu Kampf 2.1 | ja |
| L70 | Kampf 4.3: LEERSCHLAG | Wechsel in P+6 (erster Frame nach den aktiven Frames ohne Treffer); uhr läuft weiter, f_ph 1 und kombo 1 bis zum Ende | nicht geregelt | Klarstellung |
| L71 | Kampf P29: Ausfallschritt ohne Treffer | Nachlauf wie Leerschlag der Stufe ab D, Drücke frühestens nach dem letzten aktiven Frame; Stufe 4 behält das zweite Fenster D+17 bis D+20 | P29 regelt nur den Fall mit Treffer | ja |
| L72 | Kampf 5.6: Schritt weg | KE:F:k wird geschrieben, f_ph und kombo zeigen Stufe k, es gibt kein Kombofenster | offen | Klarstellung |
| L73 | Kampf 5.3: Treffer einer Instanz in verschiedenen Frames | je Frame mit Treffern 7 Stoppframes; Pose und Kombofenster zählen ab dem letzten Treffer | nur „im selben Frame“ geregelt | Klarstellung |
| L74 | Kampf 4.2 im Nachlauf (Kettenpose, Leerschlag, Kniestoß nach dem dritten) | kein Spezialangriff, kein Aufnehmen, kein Sprint; A und S geben den Schlag bzw. die nächste Stufe; im Griff geben A und S bei 0 LP Kniestoß bzw. Wurf | 9.1, 9.4, 10.1 regeln den Nachlauf nicht | Klarstellung |
| L75 | Kampf 5.3: Stoppframes | keine Eingabe; Schutz, Griffsperre und Kosten zählen weiter | offen | Klarstellung |
| L76 | Kampf P28: Fall nach dem Neueinstieg | 5 px je Frame (256, …, 1 in N+52, 0 in LN) | frei für die Darstellung | nein |
| L77 | Kampf 6.5: Tod durch Eingriff | Flug F4 entgegen dem Blick | kein Angreifer | Klarstellung |
| L78 | Kampf 11.4: K:F:Betrag | der tatsächlich abgezogene Betrag (unter 9 LP weniger als 9) | offen | Klarstellung |
| L79 | Kampf 11.4: SP:F:n | n = Sprintframe beim Beginn, also immer 1 | n nicht definiert | ja |
| L80 | Kampf 11.4, 8.3: L:sn und Griffsperre | L:sn auch beim Loslassen durch Sprung und beim Ende durch Treffer (P16); Griffsperre nur nach Losreißen und P16, nicht nach dem Sprung | offen | ja |
| L81 | Kampf 8.1: Griffsperre | zählt wie der Schutz: 30 im Frame des Losreißens r, neuer Griff ab r+30 | „30 Frames nach“ mehrdeutig | Klarstellung |
| L82 | Kampf P19: Haltelage | mit dem genauen Festkommawert x + 19·Blick, nicht ⌊x⌋ + 19 | offen | Klarstellung |
| L83 | Kampf 10.3: Rakete der Figur | steht im Abschussframe; schlägt an der letzten freien Lage ein, wenn der nächste Schritt das Band verlässt, in einen unzerbrochenen Behälter führt (unabhängig von der Flughöhe) oder, wo Bildränder gelten, außerhalb 0 ≤ x − K ≤ 383 läge; die Höhe sinkt höchstens bis 0 | „früher an Wänden …“ offen | ja |
| L84 | Kampf 10.3, 10.4: leere Waffe und Tausch | leere Waffe als Objekt `Waffe` mit Lebensdauer 61, Ereignis WA:F:Raketenwerfer:0; beim Tausch wird erst der aufgenommene Slot frei, dann fällt die alte Waffe; AU vor WA | offen | Klarstellung |
| L85 | Kampf 10.2: Heilwerte mit „oder“ | Eisnudelschale +55, Sternbeeren +16 (jeweils der erste Wert; beide nicht in der Scheibe) | „oder“ | ja |
| L86 | Kampf 11.3: f_ph | SCHLAG und LEERSCHLAG die Stufe; KNIESTOSS die Nummer 1 bis 3; UMGEWORFEN F im Flug, B ab dem Bodenkontakt; TOT F, B, ab der Ruhe R; sonst leer | Zeitpunkte nicht genannt | ja |
| L87 | Kampf 9.1: Doppeltipp | eine Richtung nur in der Tiefe unterbricht die Pause und macht den vorigen Tipp ungültig; ein direkter Wechsel der Richtungsmenge gilt als Pause 0 | offen | Klarstellung |
| L88 | Kampf 9.3: Rutschtempo | das tatsächliche x-Tempo des Sprintframes A (diagonal 0,75·v) | offen | Klarstellung |
| L89 | Kampf 9.2: Sprint nur in der Tiefe | gibt es nach P22 nicht; die Spalte „Tiefe gerade“ bleibt ungenutzt | Tabelle nennt sie | ja |
| L90 | Kampf 6.5: letztes Leben | LP 72 in N nur, wenn noch ein Leben bleibt; Erscheinen in N+1 nur dann und nicht bei GAMEOVER | offen | Klarstellung |
| L91 | Kampf 8.3: Kniestoß, der den Gehaltenen tötet | endet wie der dritte: STAND ab K+23, Drücke ab K+18 | notes.md „offen“ | ja |
| L92 | Kampf 4.3: Sprungangriff hoch nach A+29 | SPRUNG (Fallpose), uhr beginnt neu, kein weiterer Angriff bis zur Landung | offen | Klarstellung |
| L100 | Kampf 12, T3 Frame 135 („s0_zst 0 (Slot frei)“) | geprüft: s0_typ und s0_zst leer, Ereignis FR:s0 | Kampf 11.3 schreibt bei freien Slots leere Felder; Zustand 0 erscheint nie als Zahl | ja: „Spalten von s0 leer (Slot frei), Ereignis FR:s0“ |
| L101 | Kampf 12, T9 Lauf c | der erscheinende Nahkämpfer liegt in s1, z 100 | Slot und Tiefe nicht genannt; Welt 4.1 hält s0 für den Boss frei, z wie die Puppen | Klarstellung |
| L102 | Kampf 12, T10 („Eingabedatei nach Welt 12“) | drei Läufe mit Prüfstart und Eingabe aus Welt 12: a = T2 (Sperre), b = T7 a (Kette gegen den Boss), c = T8 b (Fall). Geprüft: a kamera_x 400 von der Ankunft an der Sperre bis zum Frame, in dem der letzte Gegner der Welle 2 stirbt, im Frame danach größer; b drei Kettentreffer KT1 bis KT3 ohne Umwerfen, danach STOSS mit s0_lp 100 (lp_folge) und SA:s0:100, s0_lp 100 bis zum Endframe; c im Frame, in dem s0_lp unter 0 fällt, alle übrigen belegten Slots mit sn_akt TOT | T10 nennt weder Läufe noch Frames; Welt 12 verweist auf ihre Tests T2, T7, T8 | ja: Läufe und Frames nennen |
| L103 | Kampf 12, T12 Lauf b und T14; Welt 12, PS9: Puppen ohne LP-Angabe | die Szenen geben ihnen 16 LP (T12 b, T14 `lp=16`; PS9 `vorplatziert=ja`, Startwerte) | die Erwartungen brauchen 16 LP (T12 b s0_lp 7 nach 9 Schaden, T14 10 nach 6, Welt-T9 s1_lp 11 nach 5); 16 LP hat der Startgegner im Vorbild (mechanik.md, „Lebenspunkte“; 2.6 Regel 1); nach L18 hätte eine nicht vorplatzierte Puppe die LP nach Rang (23). In T7, T9 b, T13 a und T20 a spielen die LP der Puppen keine Rolle | ja: „16 LP“ in T12 b, T14 und PS9 |
| L104 | Kampf 12, T13 Frame 81 („f_schutz 0, f_zst 1, f_lp 67“) | f_schutz 27, f_zst 3, f_lp 67, Ereignis T:s0>F:PA:5:R | schutz zählt in KS2 auf 0, der Treffer in 81 ist wirksam und setzt in KS7 schutz = 27 (Kampf 6.3: „schutz = 27 in H“; 4.1: Zustand 3, solange schutz > 0); die Zeile beschreibt den Stand vor dem Treffer | ja: „f_schutz 27, f_zst 3, f_lp 67 (Treffer in H = 81 wirksam)“ |
| L105 | Kampf 12, T18 Frame 161 („s0_zst 1, s0_lp 5“) | s0_zst 3, s0_lp 5, Ereignis T:F>s0:KT1:3:R | der Treffer in G = 161 ist wirksam; im Trefferframe gilt Zustand 3 (Kampf 7, GETROFFEN: 3 von h bis h+22; wie T3 Frame 12 „s0_zst 3“); „sofort verwundbar“ zeigt der LP-Verlust in G | ja: „s0_zst 3, s0_lp 5“ |
| L106 | Kampf 12, T20 Lauf b | Kometenbraten in z 100 | Tiefe nicht genannt; Standard der Puppen (Kampf 12) | Klarstellung |
| L107 | Kampf 12, D1 („und auf einem zweiten Rechner“) | im Test zweimal auf demselben Rechner; dazu der Vergleich mit dem Referenzprotokoll von W-T8_a in `spiel/tests/referenz/` (`abnahme_referenz.test.ts`) | ein zweiter Rechner steht im Testlauf nicht zur Verfügung | nein, Hinweis |
| L108 | Welt 12, T10 b („sichtbar“, „blinkt“) | geprüft über `liegezeit` im Objektprotokoll: 699 in 760 (sichtbar), 700 in 761 und 791 in 852 (Blinken nach Welt 9.3) | die Sichtbarkeit ist keine Spalte (Kampf 11.5) | Klarstellung |
| L109 | Auftrag 3, 2.5 (Umrisse) | Bolzer 57 × 72, Rammbock 60 × 76, Zünder 64 × 72 nach `design-gegner-stages.md` 1 (E9); Ballast 70 × 100 nach dem Auftrag; Konstanten in `src/darstellung/masse.ts` | der Auftrag nennt die Boxen des Vorbilds (57 × 73, 49 × 71, 65 × 74), das Design will den Rammbock größer als den Bolzer | ja (Auftrag und Design angleichen) |
| L110 | Welt 10.6, Tastenabfrage | ein Druck, der zwischen zwei Abfragen beginnt und endet, zählt in der nächsten Abfrage als gedrückt | sonst gingen kurze Drücke bei übersprungenen Bildern verloren | Klarstellung |
| L111 | E13, Takt | ein Bild, das bis zu 1/8 Schritt zu früh kommt, zählt schon als Schritt | E13 regelt das Zittern der Bildwiederholung nicht | Klarstellung |
| L112 | Kampf 11.1, Aufzeichnung (F2) | die Datei enthält immer alle Frames ab 1 und den Seed als Kommentar `# seed=N`, den das Laden liest | nur so ist sie abspielbar; Kampf 11.1 kennt keinen Seed in der Eingabedatei | ja |
| L113 | Welt 10.6, Bedienung | Einzelschritt auf Taste N; nach dem Ende der Scheibe Neustart wie nach Game Over mit Seed + 1; F3 kehrt aus einer geladenen Eingabedatei zur Tastatur zurück | Welt 10.6 nennt keine Taste für den Einzelschritt und kein Verhalten nach dem Ende | Klarstellung |
| L114 | Welt 3 (KA13), Darstellung | die Blende deckt nur die Szene, nicht die Anzeigeleiste; eine weggeworfene leere Waffe steht in der Zeichenreihenfolge wie die Gegenstände | nicht geregelt | Klarstellung |
| L115 | Kampf 2.4, Welt 8 (Rang-Uhr) | Anstieg über k = ⌊(r − 409)/600⌋; die Division bleibt und steht jetzt in der Liste von Kampf 2.4 | der Eingriff `rang.zaehler` setzt r beliebig; ein mitgeführter Zähler für den nächsten Anstieg wäre doppelter Zustand | ja |
| L116 | Welt 6, Rakete des Zünders | Höhe sinkt je Frame um 43/20 px (`ZR_RAKETE_SINKEN`, einmal nach −∞ gerundet) bis höchstens 1 px; die Wandprüfung rechnet mit Höhe 0, Wand ist das Bandende oder ein Hindernis, Behälter halten sie nicht auf | „nur Darstellung“, keine Division; wie die Rakete der Figur (L83). Ändert nur die Spalte h der Rakete im Objektprotokoll (W-T8 a, Frames 188 bis 216; Referenz neu geschrieben) | ja |
| L117 | Welt 10.1, Gegneranzeige | Name und LP werden in W5 gemerkt; die LP folgen dem Gegner bis zu seinem Tod oder bis sein Slot frei wird; ein neuer Gegner im selben Slot ändert die Anzeige nicht | „bleibt, bis ein anderer getroffen wird“; vorher las die Anzeige den aktuellen Slotinhalt (Fehler aus Stufe 3) | Klarstellung |
| L118 | Kampf 11.2, Prüfangriff (zu L27) | „beendet“ gehört zum Prüfangriff, nicht zum Gegner; er beginnt auch für einen neuen Gegner im selben Slot nicht neu | „beginnt danach nicht neu“ | Klarstellung |
| L119 | Kampf 4.3, „Drücke ab nie“ | ganze Zahl `FRAME_NIE` = 2147483647 statt Infinity | die Welt bleibt ganzzahlig und kopierbar | nein |
| L120 | Kampf 2.4, Welt 7.3 (Körperpresse, z) | z(A) + ⌊dz·k/64⌋ als Festkommaprodukt mit `KP_Z_ANTEIL` = 1/64 (bitgleich, ohne Laufzeitdivision); dz ohne Grenze | Kampf 2.4 nennt die 200 px nur für x | Klarstellung |
| L121 | Welt 7.1, Frontschutz im Armschwung | von vorn geschützt vom zweiten bis zum letzten aktiven Frame, auch in den 7 Frames Trefferstopp; im Ausholen nicht (Feld `vorn_geschuetzt`) | Welt 7.1 und mechanik.md sprechen nur von aktiven Frames; vorher setzte der Boss den Schutz nie (Fehler aus Stufe 2) | Klarstellung |
| L122 | Kampf 8.4, P19 (Wurf, auch des Bosses) | beim Loslassen ändern sich x und h, die Tiefe bleibt die der Haltelage, für alle Gegner einschließlich des Bosses | eine gemeinsame Bahn für alle Gegner | Klarstellung |
