# Auftrag 6: Port der vertikalen Scheibe nach Godot 4 (Arbeitssitzung: Claude Sonnet 5.5)

Stand 2026-10-03. Orchestrator ist die Fable-Sitzung des Nutzers. Die
Arbeitssitzung ist eine Claude-Cloud-Sitzung mit Sonnet 5.5 (Grok Code
war geplant, ist bis zum 6. Oktober gesperrt; der Auftrag ist für beide
geschrieben). Es gelten `CLAUDE.md`, `AGENTS.md` und die Entscheidungen
in `docs/erkenntnisse.md`, zuletzt E26.

**Entscheidung E26 (Nutzer, 2026-10-03)**: Die Engine ist Godot 4.7.2
mit GDScript. Die Arbeitssitzung ist Claude Sonnet 5.5 (später
gegebenenfalls Grok Code), der Orchestrator bleibt die Fable-Sitzung. Die TypeScript-Fassung unter `spiel/` bleibt als
Referenzimplementierung und Prüfstein erhalten; sie wird nicht mehr
weiterentwickelt.

Ziel dieses Auftrags: Die vertikale Scheibe läuft in Godot mit derselben
Logik wie die TypeScript-Fassung, nachweisbar durch bitgleiche Protokolle
für alle 74 Testszenen, mit Platzhalterdarstellung und einer ersten Figur
(Vela) aus den Grok-Teilen. Grafik, Sound und Export folgen in späteren
Aufträgen.

---

## 0. Startprompt für die Arbeitssitzung

Für eine Claude-Sitzung (Sonnet 5.5) im Repo:

```text
Du bist die Arbeitssitzung für das Spielprojekt Comet Brawlers. Lies
zuerst CLAUDE.md und AGENTS.md, dann
docs/auftraege/2026-10-03-grok-auftrag-6-godot-port.md vollständig, dann
die dort in Abschnitt 2 genannten Dokumente in der genannten Reihenfolge.
Lade Godot 4.7.2 wie in AGENTS.md beschrieben und prüfe mit
--headless --version, dass es läuft. Arbeite die Phasen 0 bis 4 des
Auftrags der Reihe nach ab, direkt auf main mit kleinen Commits und
Pushes nach jeder fertigen Datei oder Szene. Nutze Unteragenten für
unabhängige Module des Kerns, aber nur ein Agent schreibt je Datei.
Halte an den Haltepunkten an und warte auf meine Freigabe. Antworte auf
Deutsch. Am Ende schreibst du die Rückmeldung als Datei
docs/rueckmeldungen/auftrag-6.md im Format aus Abschnitt 8 des Auftrags
und committest sie mit.
```

Für Grok Code gilt derselbe Text mit „auf dem Branch grok/auftrag-6 mit
Pull Request gegen main“ statt „direkt auf main“.

---

## 1. Was übernommen wird und was neu entsteht

| Bereich | Quelle | In Godot |
|---|---|---|
| Spiellogik (Figur, Treffer, Gegner, Boss, Kamera, Wellen, Rang, Gegenstände, Rahmen) | `spiel/src/kern/*.ts`, Spezifikationen | `godot/kern/*.gd`, Zeile für Zeile portiert, gleiche Modulnamen, gleiche Reihenfolge im Logikschritt |
| Zahlen | `spiel/src/kern/werte.ts` | `godot/kern/werte.gd`, alle Konstanten mit demselben Namen und Quellkommentar |
| Festkomma 16.16, Zufall | `festkomma.ts`, `zufall.ts` | `festkomma.gd`, `zufall.gd` mit `int` (64 Bit), gleiche Rundung nach −∞, gleicher Xorshift32 |
| Stage-Daten | `spiel/daten/stages/*.txt` | unverändert, geladen von `godot/kern/stage.gd` (gleicher Parser) |
| Prüfszenen, Eingabedateien | `spiel/tests/szenen/`, `spiel/tests/eingaben/` | unverändert, gelesen von `godot/pruef/` |
| Protokollformat | `docs/spezifikation-kampf.md` 11.1 bis 11.6, `spiel/src/pruef/protokoll.ts` | `godot/pruef/protokoll.gd`, Spalte für Spalte gleich, gleiche Zahlenformatierung |
| Referenz | `spiel/tests/referenz/alle/` (74 Szenen, 148 Dateien, `PRUEFSUMMEN.md5`) | Prüfstein: bitgleich |
| Darstellung | `spiel/src/darstellung/` (Rechtecke, Sprites, Debug, Anzeige) | `godot/darstellung/` neu mit Godot-Nodes, zuerst Platzhalterrechtecke, dann Sprites |
| Grafik | `spiel/grafik/quelle/fremd/` (Grok-Blätter, Teileblatt Vela), `docs/grafik.md`, Auftrag 5 Abschnitt 2c | Umsetzer als Godot-Werkzeugskript mit der `Image`-Klasse; Vela als Cutout-Puppe mit `Skeleton2D` |
| Tests | 275 Tests in `spiel/tests/` | Eigener Testlauf `godot/tests/alle.gd` ohne Fremdbibliothek: Protokollvergleich aller Szenen plus Einheitstests der Grundlagen |

---

## 2. Lesereihenfolge

1. `AGENTS.md`
2. dieser Auftrag
3. `docs/erkenntnisse.md` (Abschnitte „Haltung“, „Entscheidungen“, „Wo was steht“)
4. `docs/spezifikation-kampf.md` vollständig
5. `docs/spezifikation-welt.md` vollständig
6. `docs/scheibe.md` (Formate, Abnahme, Abweichungen und Lücken)
7. `spiel/src/kern/werte.ts`, `festkomma.ts`, `zufall.ts`, `entitaeten.ts`, `welt.ts` (Reihenfolge des Logikschritts), dann die übrigen Kern-Module
8. `spiel/src/pruef/*.ts`
9. `docs/mechanik.md` nur zum Nachschlagen, wenn ein Wert unklar ist
10. `docs/grafik.md` Abschnitte 2c-Bezug aus Auftrag 5 und Abschnitt 5 (Umsetzer), `docs/auftraege/2026-10-03-opus-auftrag-5-grafik-grok-2x.md` Abschnitte 1, 2c

---

## 3. Architektur in Godot

### 3.1 Projekt

```
godot/
  project.godot            Godot 4.x, Hauptszene darstellung/spiel.tscn, Fenster 768 × 448, Stretch "viewport", Textur-Filter "nearest"
  kern/                    reine Logik, RefCounted, keine Nodes
    festkomma.gd zufall.gd werte.gd entitaeten.gd anlegen.gd bahn.gd eingriffe.gd ereignisse.gd
    tasten.gd stage.gd start.gd welt.gd treffer.gd schaden.gd
    figur/ (basis, zustaende, angriffe, griff, waffen, intern)
    gegner/ (reaktion, nah, nah_gehen, fern, rechte, boss, boss_angriffe, boss_bahn, boss_zustand)
    kamera.gd wellen.gd rang.gd gegenstaende.gd rahmen.gd
  pruef/                   Eingabedatei, Prüfszene, Protokoll, Objektprotokoll, lauf.gd (SceneTree-Skript)
  darstellung/             spiel.tscn, spiel.gd (Spielschleife), zeichnen (Platzhalter), sprites, puppe (Skeleton2D), anzeige, debug, tastatur
  werkzeuge/               umsetzer.gd (Image-Klasse), kontakt.gd (Kontaktbögen), foto.gd (Bildschirmfotos im Headless-Modus mit Viewport-Textur)
  tests/                   alle.gd (Testlauf), grundlagen_*.gd, vergleich.gd (erste abweichende Zeile und Spalte je Szene)
  grafik/                  erzeugte Blätter und Atlanten (committet)
```

Die TypeScript-Fassung bleibt unter `spiel/` unverändert.

### 3.2 Logikkern

- Jede TypeScript-Datei wird eine GDScript-Datei gleichen Namens mit
  `class_name` (zum Beispiel `KernFestkomma`, `KernWelt`). Funktionen
  behalten Namen und Reihenfolge, damit der Orchestrator Zeile für Zeile
  vergleichen kann.
- Zahlen: `int` ist in GDScript 64 Bit. Festkomma 16.16 bleibt im Bereich
  der 32-Bit-Fassung: Nach jeder Operation, die in TypeScript mit `| 0`
  auf 32 Bit begrenzt, dasselbe in GDScript nachbilden (Hilfsfunktion
  `zu32(x)`), damit Überläufe identisch sind. Multiplikation nach
  `festkomma.ts` (BigInt-Zwischenwert dort, in GDScript direkt 64 Bit mit
  arithmetischer Verschiebung). Division nur, wo `festkomma.ts` sie hat,
  Rundung nach −∞ nachbilden (`floori` oder eigene Funktion; GDScript
  `/` auf `int` rundet zur 0, das ist falsch für negative Zahlen).
- Keine `float`, keine `Vector2`, keine `Rect2` im Kern. Keine Signale,
  keine Nodes, kein `randi`, kein `Time`, kein `OS`.
- Datenstrukturen: `Array` mit festem Index statt `Dictionary`, wo die
  TypeScript-Fassung Slots benutzt. Iteration nur über Arrays in
  Indexreihenfolge.
- Zeichenketten im Protokoll: gleiche Formatierung wie
  `spiel/src/pruef/protokoll.ts` (Dezimaldarstellung der Festkommawerte,
  leere Felder, Ereignisliste). Bei Zweifel die TypeScript-Fassung
  nachlesen, nicht die Spezifikation deuten.

### 3.3 Prüflauf und Tests

- `godot --headless --path godot --script res://pruef/lauf.gd -- --szene
  <datei> --eingabe <datei> --aus <ordner>` schreibt `protokoll.csv` und
  `objekte.csv` und gibt beide MD5 aus (`FileAccess.get_md5`). Pfade
  relativ zum Repo-Wurzelverzeichnis (`res://../spiel/tests/szenen/…`
  funktioniert nicht in allen Fällen; deshalb absolute Pfade über
  `ProjectSettings.globalize_path("res://")` plus `../`).
- `godot/tests/alle.gd`: führt die Grundlagentests aus (Festkomma mit den
  Beispielwerten aus Kampf 2.4, Zufall mit der festen Folge für Seed 1
  aus `spiel/tests/zufall.test.ts`, Stage-Parser, Protokollformat) und
  dann alle 74 Szenen; vergleicht die Dateien byteweise mit
  `spiel/tests/referenz/alle/`; gibt je Szene `ok` oder die erste
  abweichende Zeile und Spalte aus; Exit-Code 1 bei einer Abweichung.
  Laufzeit unter 5 Minuten.
- `godot/tests/vergleich.gd`: Werkzeug für die Fehlersuche: zwei
  Protokolle, erste Abweichung mit Frame, Spalte, beiden Werten und den
  fünf Zeilen davor.
- Das Workflow `.github/workflows/godot-tests.yml` läuft bei jedem Push
  auf `main` und `grok/**` und bei jedem Pull Request. Die Godot-Version
  darin (`GODOT_VERSION`, 4.7.2) und die genutzte Version müssen gleich
  sein.

### 3.4 Darstellung (Phase 2)

- Fenster 768 × 448, Logik in Spielpixeln (384 × 224), Zeichnen mit
  Faktor 2 wie in Auftrag 5, Abschnitt 1 (E25). Kamera über
  `Camera2D` oder eigenen Versatz; Tiefensortierung nach ⌊z⌋, Rang und
  Slot wie in `zeichnen.ts` (`stuecke`), über `z_index` oder manuelle
  Zeichenreihenfolge in einem `Node2D` mit `_draw`.
- Erst Platzhalterrechtecke (Farben und Formen wie `zeichnen.ts`, damit
  die Szenen vergleichbar bleiben), Anzeigeleiste, Debug-Anzeige (F1),
  Pause (P), Einzelschritt (N), Aufzeichnung (F2), Neustart (F3), die
  Tastenbelegung aus `docs/scheibe.md`.
- Spielschleife: `_physics_process` mit 60 Hz (Projekteinstellung
  `physics/common/physics_ticks_per_second = 60`, `max_physics_steps_per_frame = 4`
  für E13), ein Logikschritt je Tick; Tastenstand aus `Input` zu Beginn
  des Ticks. Die Darstellung in `_process` liest nur.
- Dann Vela als Cutout-Puppe: Teile aus
  `spiel/grafik/quelle/fremd/vela/` (Teileblatt) mit `werkzeuge/umsetzer.gd`
  ausschneiden (Hintergrund freistellen, Maßstab aus der ganzen Figur auf
  142 px Höhe bei 2×, keine Palettenabbildung, bis 64 Farben), je Teil
  ein `Sprite2D` unter einem `Bone2D` eines `Skeleton2D`; Posen je
  Animation als Schlüsselbilder in einer `AnimationPlayer`-Animation mit
  Schritt 1/60 s, aber gesteuert von der Logik: Die Darstellung setzt je
  Frame Animation und Zeitpunkt aus Aktion und Aktionsuhr (Zuordnung aus
  `docs/grafik.md`, Abschnitt 3 und 9.3), die Logik bleibt der Taktgeber.
  Trefferbild im ersten aktiven Frame.

---

## 4. Phasen

### Phase 0: Einrichtung

1. Godot 4.7.2 laden (Befehl in `AGENTS.md`), `--headless --version`
   muss `4.7.2.stable` ausgeben. Workflow und `AGENTS.md` nennen dieselbe
   Version; weicht sie ab, beides anpassen.
2. `godot/project.godot` mit den Einstellungen aus 3.1 und 3.4; leere
   Hauptszene; `godot/tests/alle.gd` mit einem Rauchtest; Push; das
   Workflow auf GitHub muss grün sein, bevor Phase 1 beginnt.
3. `docs/rueckmeldungen/auftrag-6.md` anlegen (Gerüst, wird fortgeschrieben).

### Phase 1: Port des Logikkerns und des Prüflaufs, dann Haltepunkt 1

Reihenfolge: `festkomma`, `zufall`, `werte`, `entitaeten`, `anlegen`,
`stage`, `tasten`, `ereignisse`, `eingriffe`, `bahn`, `figur/*`,
`treffer`, `schaden`, `gegner/reaktion`, `gegner/nah*`, `gegner/fern`,
`gegner/rechte`, `kamera`, `wellen`, `rang`, `gegenstaende`, `rahmen`,
`gegner/boss*`, `welt`, `start`, dann `pruef/*`.

Nach `festkomma` und `zufall`: Grundlagentests grün. Nach `pruef`: erster
Protokolllauf der Szene `T1` (nur Bewegung); `vergleich.gd` zeigt die
erste Abweichung. Dann Szene für Szene in der Reihenfolge der Kampf-Tests
T1 bis T20, D1, dann W-T1 bis W-T10, dann die übrigen (boss_*, treffer_*,
beispiel_*, vorfuehrung). Jede Szene ist fertig, wenn `protokoll.csv` und
`objekte.csv` bitgleich sind.

**Haltepunkt 1**: Alle 74 Szenen bitgleich, Workflow auf GitHub grün,
Zwischenstand der Rückmeldung committet mit der Zahl der portierten
Zeilen, der Laufzeit des Testlaufs und der Liste der Stellen, an denen
die TypeScript-Fassung Verhalten hat, das die Spezifikation nicht
beschreibt (zur Nachpflege durch den Orchestrator). Der Nutzer gibt frei.

### Phase 2: Darstellung, dann Haltepunkt 2

1. Platzhalterdarstellung nach 3.4 mit Anzeige, Debug, Tasten; Bilder
   `docs/bilder/godot_szene_0300.png` bis `godot_szene_1500.png` aus der
   Vorführung (`spiel/tests/eingaben/vorfuehrung.txt`), erzeugt headless
   über `werkzeuge/foto.gd` (Viewport-Textur nach n Ticks speichern).
2. Vela als Cutout-Puppe nach 3.4 mit Stand, Gehen und Kette 1 bis 4;
   Kontaktbogen `docs/bilder/godot_kontakt_vela.png`; Szenenbild mit Vela
   im Abschnitt A.
3. Tests: ein Test, dass die Darstellung das Protokoll nicht ändert
   (Vorführung 600 Ticks mit Darstellung aktiv, Protokoll bitgleich zur
   Referenz).

**Haltepunkt 2**: Bilder committet unter `docs/bilder/`, Freigabe des Nutzers.

### Phase 3: Abnahme

- `alle.gd` grün, Workflow grün, Determinismus (zweimal laufen, gleiche
  MD5), Leistung (Vorführung 1500 Ticks unter 10 s headless; mit
  Darstellung 60 Bilder je Sekunde im Fenster, vom Nutzer bestätigt).
- `docs/godot.md` neu: Aufbau, Befehle, Tastenbelegung, Testlauf,
  Abweichungen und Lücken, Stand.

### Phase 4: Nacharbeit

- `docs/erkenntnisse.md`: Stand-Zeile „Vertikale Scheibe (Godot)“, „Wo
  was steht“ um `docs/godot.md` und `godot/`.
- `docs/scheibe.md`: Hinweis oben, dass `spiel/` Referenzfassung ist.
- Rückmeldung fertigstellen und pushen; der Orchestrator prüft `main`.

---

## 5. Qualitätsregeln

- Keine Zahl außerhalb von `werte.gd`, außer 0, 1, 2 und Zweierpotenzen
  der Festkommarechnung. Jede Konstante mit Quellkommentar wie in
  `werte.ts`.
- Typisiertes GDScript überall im Kern; `@warning_ignore` nur mit
  Begründung im Kommentar.
- Kein `float` im Kern; Prüfung durch einen Test, der `godot/kern/`
  nach `float`, `Vector2`, `randi`, `randf`, `Time.`, `OS.`, `signal`
  durchsucht und bei Fund fehlschlägt (wie `spiel/tests/reinheit.test.ts`).
- Determinismus nach Kampf 11.6: gleicher Code, gleiche Szene, gleiche
  Eingabe, gleiche MD5, auf jedem Rechner.
- Die TypeScript-Fassung wird nicht geändert. Findet sich dort ein
  Fehler gegenüber der Spezifikation, bleibt der Port trotzdem bitgleich
  zur Referenz, und der Fehler kommt als Befund in die Rückmeldung; der
  Orchestrator entscheidet, ob die Referenz neu erzeugt wird.

---

## 6. Umgang mit Lücken

Wie `AGENTS.md`: Bei Fragen, die das Verhalten betreffen, gilt die
TypeScript-Fassung; bei Fragen, die nur Godot betreffen (Szenenaufbau,
Node-Typen, Dateiformate), die einfachste Lösung mit Eintrag in der
Rückmeldung.

---

## 7. Haltepunkte

Zwei, nach Phase 1 und Phase 2. An beiden ist alles gepusht und der
Workflow auf GitHub grün.

---

## 8. Rückmeldung (`docs/rueckmeldungen/auftrag-6.md`)

```text
# Rückmeldung Arbeitssitzung (<Modell>), Auftrag 6, <Datum>

## Commits
Erster und letzter Commit auf main (oder Branch und Pull Request), Stand des Workflows

## Godot-Version und Umgebung
Version, Betriebssystem der Sitzung, Laufzeit des Testlaufs

## Port
Dateien und Zeilen je Ordner (kern, pruef, darstellung, werkzeuge, tests); Konstanten in werte.gd: <Anzahl>

## Abnahme
Szenen bitgleich: <n> von 74; abweichende Szenen mit erster Abweichung (Frame, Spalte)
Grundlagentests: <n> grün
Determinismus: ja/nein
Leistung: Vorführung headless <s>; Fenster 60 Bilder je Sekunde: vom Nutzer bestätigt ja/nein

## Darstellung
Platzhalter: fertig/offen; Vela-Puppe: Animationen <Liste>; Bilder: <Liste>

## Befunde zur TypeScript-Fassung (Verhalten ohne Spezifikation, mögliche Fehler)

## Abweichungen und Lücken (nur Godot)

## Was nicht erledigt wurde und warum

## Fragen an den Nutzer
```
