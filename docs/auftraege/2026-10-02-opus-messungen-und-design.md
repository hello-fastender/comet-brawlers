# Auftrag: Messungen und Designdokument (Opus-Sitzung mit mehreren Agenten)

Stand 2026-10-02. Orchestrator ist die Fable-Sitzung des Nutzers. Dieses
Dokument enthält den Startprompt für eine zweite Sitzung mit Opus 5.5 und
die Prompts, die Opus an seine Agenten gibt. Opus arbeitet die Phasen in
der angegebenen Reihenfolge ab und meldet am Ende in dem Format unter
„Rückmeldung an den Orchestrator“.

Ziel des Auftrags: Die vier offenen Punkte aus `docs/erkenntnisse.md`
messen (Trefferreaktion der Gegner, Gegnerverhalten, Spezialangriff und
Sprint, Gegenstände), dazu die Reichweite der Gegnerangriffe, und parallel
ein Designdokument für Comet Brawlers schreiben. **Kein Spielcode.** Es
entstehen nur Messskripte, Belege, Notizen und Designtexte.

---

## 0. Startprompt für die Opus-Sitzung

Diesen Text in den neuen Chat einfügen (Repo `hello-fastender/comet-brawlers`,
Modell Opus 5.5, Google-Drive-Connector aktiv):

```text
Du bist die Arbeitssitzung für das Projekt Comet Brawlers. Der Orchestrator
(eine andere Sitzung) hat den Auftrag in docs/auftraege/2026-10-02-opus-messungen-und-design.md
abgelegt. Lies zuerst CLAUDE.md, dann diese Auftragsdatei vollständig, dann
docs/erkenntnisse.md und docs/mechanik.md. Arbeite die Phasen 0 bis 4 der
Auftragsdatei der Reihe nach ab. Starte die Agenten der Phase 1 und 3
parallel, jeweils mit dem vollständigen Prompt aus der Auftragsdatei.
Halte dich an alle Regeln in Abschnitt 1 der Auftragsdatei. Arbeite nur
auf main, keine Branches, keine Pull Requests. Antworte auf Deutsch.
Melde dich bei mir nur, wenn Phase 0 scheitert (ROM, MAME, Savestates)
oder wenn ein Agent eine Entscheidung braucht, die das Design betrifft.
Am Ende lieferst du die Rückmeldung im Format aus Abschnitt 7.
```

---

## 1. Regeln für die ganze Sitzung (gelten für Opus und jeden Agenten)

### Repo und Sprache

- Nur `main`: `git fetch origin main && git checkout -B main origin/main`,
  committen und `git push origin HEAD:main`. Keine Branches, keine PRs.
- Deutsch in Texten, Tabellen, Kommentaren und Commit-Nachrichten.
- Nie ins Repo: `roms/`, `*.zip`, ROM-Daten, Sounds, disassemblierter Code,
  `research/captcomm/logs/raw/`. Bildschirmaufnahmen sind erlaubt
  (`research/captcomm/grafik/`), werden in diesem Auftrag aber nicht
  gebraucht.
- Nur Opus committet, und zwar nach jeder Phase. Agenten committen nicht
  und fassen `notes.md`, `mechanik.md`, `erkenntnisse.md` nicht an. Jeder
  Agent schreibt seinen Notizentwurf in eine eigene Datei
  `research/captcomm/entwuerfe/<kuerzel>.md` (Kürzel siehe unten). Opus
  arbeitet diese Entwürfe in Phase 4 in die Hauptdokumente ein und löscht
  den Ordner `entwuerfe/` vor dem Commit.
- Kein Spielcode, keine Engine, kein Prototyp. Python nur mit der
  Standardbibliothek (kein numpy).

### Messmethode (wie bisher, siehe `research/captcomm/notes.md`)

- MAME 0.264 headless mit `research/captcomm/scripts/run.sh <szenario> [savestate]`.
  Ausgaben unter `research/captcomm/logs/raw/<CC_NAME>_*`. Jeder Agent
  verwendet ausschließlich seinen eigenen Präfix für `CC_NAME` und für
  neue Szenariodateien (siehe Tabelle unten). Parallele MAME-Läufe sind
  erlaubt, solange die Namen verschieden sind. Die Skripte
  `laeufe_a5.sh` und `laeufe_a7.sh` laufen nur in Phase 0, nie parallel.
- Zeit zählt in lokalen Frames des Runners (Frame 1 = erster Callback).
  Eingaben, die im Szenario als {von, bis} stehen, sind in diesen Frames
  gedrückt. Das Spiel reagiert einen Frame später.
- Speicherplatz: Ein Vollabzug kostet 65.544 Bytes je Frame. Für lange
  Läufe den Abzug auf den Bereich `0xFFA900` bis `0xFFEA00` beschränken
  (`dump = { start = 0xFFA900, stop = 0xFFEA00, ... }`; die Werkzeuge
  rechnen über den Header `_ram.hdr` zurück) und Werte außerhalb (Rang
  `FFF82A`, Zähler `FFF82C`) über das Szenario-Feld `watch` aufnehmen.
  Rohabzüge nach der Auswertung löschen. Vor jedem großen Lauf `df -h .`
  prüfen.
- Determinismus: Ein zweiter Lauf mit denselben Eingaben belegt nichts.
  Gegenläufe müssen die Eingaben variieren (andere Frames, Dauer,
  Position, Savestate, Gegner).
- Eingriffe (Feld `pokes` im Szenario: Position eines Objekts setzen, LP
  auffüllen, Rang festhalten) sind erlaubt, müssen aber im Szenario-Kopf
  mit `EINGRIFF` beschrieben und in jeder Ergebnistabelle genannt sein.
  Nach Möglichkeit jeden Eingriffswert mit einem natürlichen Lauf
  stichprobenartig bestätigen.
- Status jeder Zahl: **gesichert** (zwei unabhängige Läufe mit variierten
  Eingaben, Skript im Repo, vom Gegenprüfer bestätigt), **unsicher**
  (einzelner Lauf, Abweichung zwischen Mess- und Gegenprüfagent, oder
  Messverzerrung möglich), **offen** (nicht gemessen). Die Kennzeichnung
  „Workflow“ gibt es in diesem Auftrag nicht mehr: Alles, was zählt, muss
  per Skript im Repo reproduzierbar sein.

### Ablieferung jedes Messagenten

1. Szenarien `research/captcomm/scripts/scenarios/<praefix>_*.lua`, mit
   Kopfkommentar (Zweck, Variablen, Eingriffe, kalibrierte Frames).
2. Auswertung: neuer Unterbefehl in `research/captcomm/scripts/messen_a5.py`
   oder eigene Datei `messen_<praefix>.py` daneben (Standardbibliothek,
   `--help` mit einem Satz je Unterbefehl).
3. `research/captcomm/scripts/belege_<praefix>.sh`: führt alle Läufe aus,
   wertet aus, schreibt `research/captcomm/logs/<praefix>.csv`, löscht die
   eigenen Rohabzüge. Muss von vorn durchlaufen (einmal am Ende testen).
4. Entwurf `research/captcomm/entwuerfe/<praefix>.md` mit: Methode in fünf
   Sätzen, Ergebnistabelle (Größe, Wert, Status, Beleg mit Laufname und
   Frames), Eingriffe, Unsicheres, offene Fragen. Dazu ein Vorschlag, welche
   Zeilen in `docs/mechanik.md` übernommen werden sollen (Abschnittstitel
   und Tabellenzeilen fertig formuliert).
5. Abschlussbericht an Opus: zehn Zeilen, nur Ergebnisse und Status.

### Präfixe

| Agent | Thema | Präfix |
|---|---|---|
| M1 | Trefferreaktion der Gegner | `reaktion` |
| M2 | Verhalten von WOOKY und EDDY | `verhalten` |
| M3 | Reichweite der Gegnerangriffe | `greichweite` |
| M4 | Spezialangriff und Sprint | `spezial`, `sprint` |
| M5 | Gegenstände und Waffen | `item` |
| V1 bis V5 | Gegenprüfer zu M1 bis M5 | wie oben plus `_v`, z. B. `reaktion_v` |
| D1 | Designdokument Kern | kein MAME |
| D2 | Designdokument Gegner und Stages | kein MAME |

### Kurzreferenz der bekannten Adressen (Einzelheiten in `notes.md`, „Gefundene Adressen“)

Big Endian. Spielerblock P = `FFA990`. Gegnerslots S = `FFBC90 + n·0xC0`,
Gegner in n = 0 bis 19, Geschosse und Gegenstände vermutlich in 20 bis 59.
„16.16“ = Ganzzahlwort plus Nachkommawort.

| Was | Adresse oder Offset |
|---|---|
| x (Welt), Höhe, Tiefe | +0x0E, +0x12, +0x16 (16.16), Vorframe ganzzahlig +0x66, +0x68, +0x6A |
| Lebenspunkte, Vorframe | +0x40, +0x42 (vorzeichenbehaftet) |
| Max-LP des Gegners | S+0x9A |
| Typkennung des Gegners | S+0x38 (Langwort; WOOKY `0x5A97E`, EDDY `0x60CA0`, SKIP `0x25086`, DICK `0x64E7A`, DOLG `0x46DA4`) |
| Grundzustand | +0x04: 1 normal, 3 Trefferreaktion bzw. geschützt, 2 am Boden oder wartend, 0 frei; +0x05 beim Gegner: 1 aktiviert |
| Aktion des Spielers | P+0x0A: 0 Stand, 0x0A Sprung, 0x10 Schlag, 0x14 Spezialangriff; Unterphase P+0x0C |
| Kombostufe | `FFAA2D` (0/4/8/12) |
| Animationszeiger | +0x1C (beim Spieler gesichert, beim Gegner laut Grafik-Skripten; Offset in `scripts/grafik/bot.lua` und `gegner.py` nachsehen) |
| Trefferattribut, Schadenswert | S+0x24 aktiv während der aktiven Frames eines Gegnerangriffs, S+0x8B Schaden (gesetzt beim Angriffsbeginn) |
| Angreiferzeiger | P+0x82 (`FFAA12`) zeigt im Frame des LP-Verlusts auf den Slot des Angreifers (S = `0xFF0000` + Wort − 4); Halter beim Griff P+0x70; Geschoss: S+0x6C Zeigerwort auf den Werfer |
| Timer Liegen, Timer nach dem Aufstehen | `FFAA61`, `FFAA69` |
| Rang, Zähler | `FFF82A` (7 bis 24), `FFF82C` |
| Stage-Index, Kamera x, Kamera y | `FFA8CE`, `FFA82E`, `FFA830` |
| Gewählte Figur | `FFAA34` (0 Mack, 1 Captain, 2 Ginzu, 3 Baby Head) |
| Punkte | `FFAA76` (BCD) |

### Savestates (entstehen in Phase 0)

| Name | Inhalt |
|---|---|
| `ingame` | Stage 1, Captain Commando, Figur steht allein am linken Rand |
| `kontakt` | WOOKY (16 LP, Slot 18) steht 46 px vor der Figur, schlägt ohne Eingabe bei Frame 28 |
| `kontakt_b` | EDDY (30 LP, Slot 17) läuft heran |
| `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b` | Gegner läuft aus 100 px heran bzw. steht versetzt (siehe `notes.md`, „Szenarien“) |
| `stage1` bis `stage9` | Stage-Start mit Captain, aus `scenarios/stage_start.lua` mit `CC_STAGE` |
| `held0`, `held2`, `held3` | wie `ingame`, aber Mack, Ginzu, Baby Head (`stage_start.lua` mit `CC_FIGUR`, `CC_SAVE=2400`, `CC_SAVE_NAME`) |

Vorlage für Eingriffe mit Positionen: `scenarios/kette.lua` (setzt den
Gegner relativ zur Figur). Vorlage für den Rang: `scenarios/rang.lua`.
Vorlage für lange Läufe mit Bot: `scripts/grafik/bot.lua`, `durchlauf.lua`.

---

## 2. Phase 0: Einrichtung (Opus selbst, vor allen Agenten)

1. Auf `main` wechseln (siehe Regeln). `git log --oneline -3` muss mit
   „CLAUDE.md: Regel „nur auf main arbeiten““ oder neuer beginnen.
2. ROM beschaffen: Die Datei `captcomm.zip` (2.577.865 Bytes) liegt im
   Google Drive des Nutzers, Datei-ID `1ZV2OFhsMdk7Z8DOPNms-3xjPL6CWleBt`.
   Mit dem Drive-Connector herunterladen und als `roms/captcomm.zip`
   ablegen. Größe prüfen. Steht kein Drive-Connector zur Verfügung, den
   Nutzer bitten, die Datei hochzuladen, und bis dahin nur Phase 3
   (Designagenten) starten.
3. MAME prüfen: `/usr/games/mame -version` muss 0.264 melden. Fehlt MAME,
   dem Nutzer melden (Setup der Umgebung) und wie bei Schritt 2 verfahren.
4. `cd research/captcomm && /usr/games/mame -verifyroms captcomm -rompath ../../roms`:
   Erwartet ist „bad“ nur wegen `ioc1.ic7` (PAL), alles andere korrekt.
5. Savestates erzeugen: `scripts/laeufe_a5.sh`, dann `scripts/laeufe_a7.sh`
   (zusammen etwa 6 Minuten). Danach müssen unter `logs/raw/sta/captcomm/`
   mindestens `ingame`, `kontakt`, `kontakt_b`, `anlauf`, `anlauf_b`,
   `anlauf_c`, `tiefe_b` liegen.
6. Stage- und Helden-Savestates: für `CC_STAGE` 1 bis 9
   `scripts/run.sh scenarios/stage_start.lua` mit `CC_NAME=stage_start_$n`,
   dazu `CC_FIGUR=0/2/3 CC_SAVE=2400 CC_SAVE_NAME=held$figur`.
7. Funktionsprüfung: `python3 scripts/messen_a5.py treffer logs/raw/attack`
   muss die Kette 3, 4, 5, 10 gegen den WOOKY zeigen. Stimmt das nicht,
   abbrechen und dem Nutzer melden.
8. Rohabzüge der Phase 0 löschen (`logs/raw/*_ram.bin`), Savestates
   behalten. `df -h .` notieren.
9. Ordner `research/captcomm/entwuerfe/` anlegen (leer, nicht committen).
10. Dem Nutzer in drei Zeilen melden: ROM ok, MAME ok, Savestates ok,
    freier Speicher. Dann Phase 1 und 3 starten.

---

## 3. Phase 1: Messagenten (M1 bis M5, parallel)

Jeder Prompt ist vollständig. Opus ergänzt oben nur die Zeile
„Arbeitsverzeichnis: /home/user/comet-brawlers“ und hängt Abschnitt 1
dieser Datei (Regeln) wörtlich an.

### M1: Trefferreaktion der Gegner (Präfix `reaktion`)

```text
Aufgabe: Miss in Captain Commando (MAME-Set captcomm), wie die normalen
Gegner auf Treffer der Spielfigur reagieren. Die Ergebnisse bestimmen,
ob die Schlagkette des Spiels (vier Stufen mit 16-Frame-Kombofenster)
in unserem eigenen Spiel zusammenhält. Lies zuerst docs/mechanik.md
(Abschnitte Angriff, Sprungangriff, Griff und Wurf) und in
research/captcomm/notes.md die Abschnitte „Szenarien“, „Nachtrag:
Reichweite der Kettenstufen 2–4“ und „Gefundene Adressen“. Vorlage für
deine Szenarien ist scripts/scenarios/kette.lua (Kette mit Eingriff auf
die Gegnerposition) und scripts/messen_a5.py (Unterbefehle treffer,
kette, reaktion).

Referenzgegner: WOOKY (16 LP, Slot 18, Savestate kontakt) und EDDY
(30 LP, Slot 17, Savestate kontakt_b). Für Teil A den Rang nicht
verändern. Wo ein Gegner mit 16 LP die Kette nicht überlebt, EDDY oder
einen Eingriff auf die LP (S+0x40 hochsetzen, als EINGRIFF
kennzeichnen) verwenden.

Zu messen, je Gegnertyp:

A. Je Kettenstufe 1 bis 3 (Treffer ohne Umwerfen):
   1. Dauer der Trefferreaktion: Frames mit S+4 = 3 ab dem Trefferframe
      h, und der Frame, ab dem der Gegner wieder handeln kann (S+4 = 1
      und erster Wechsel des Animationszeigers in eine Geh- oder
      Angriffsanimation).
   2. Rückstoß: x-Verschiebung je Frame und gesamt, in Blickrichtung der
      Figur; ob die Tiefe sich ändert.
   3. Ob ein weiterer Treffer in der laufenden Trefferreaktion die
      Reaktion neu startet oder verlängert (zwei Stufen, zweiter Druck
      früh im Fenster bei h+12 und spät bei h+27 bzw. h+26).
   4. Kettenkonsistenz: Beim spätesten erlaubten Druck jeder Stufe, steht
      der Gegner im aktiven Frame der Folgestufe noch in der
      Trefferreaktion, oder gibt es eine Lücke, in der er handeln könnte?
      Gib je Stufe die Frames von Ende der Reaktion und Beginn der
      aktiven Frames an.
B. Umwerfende Treffer: Abschlusstritt (Stufe 4), Sprungangriff neutral,
   Wurf, dritter Kniestoß:
   1. Flug: Startgeschwindigkeit x und Höhe, Schwerkraft, erster
      Bodenkontakt, Ruhelage (für Wurf schon bekannt, nur bestätigen).
   2. Liegedauer bis zum Beginn des Aufstehens und Dauer des Aufstehens
      (Animationszeiger und S+4).
   3. Verwundbarkeit: In welchen Frames nach dem Umwerfen und nach dem
      Aufstehen nimmt der Gegner Schaden an (Treffer per Eingriff auf
      die Position so platzieren, dass der aktive Frame des Schlags in
      Frame k nach dem Aufstehen liegt, k von 0 bis 40 in Schritten
      von 2 bis 4)? Gibt es ein Schutzfenster wie bei der Figur (35
      Frames)? Ab welchem Frame ist er wieder greifbar?
C. Mehrere Gegner: Ein Schlag trifft zwei Gegner (zweiten Gegner per
   Eingriff in Reichweite setzen). Werden beide getroffen, wie lang ist
   der Trefferstopp der Figur (7 Frames je Gegner oder einmal 7), und
   zählt die Kombostufe weiter?
D. Tod: Frames vom LP-Wert unter 0 bis zum Freiwerden des Slots
   (S+4 = 0); ob ein sterbender Gegner noch Treffer annimmt oder die
   Figur noch treffen kann.

Vorgehen: Für jede Größe zwei Läufe mit variierten Eingaben (anderer
Startframe, anderer Gegner, andere Position). Ergebnistabelle mit
Status je Zeile. Eingriffe kennzeichnen. Rohabzüge nach der Auswertung
löschen, dump-Bereich einschränken (Regeln). Ablieferung nach den
Regeln mit Präfix reaktion: Szenarien, Auswertung (Unterbefehl
gegnerreaktion in messen_a5.py: je Frame Slot-Zustand, x 16.16, Höhe,
Tiefe, LP, Animationszeiger), belege_reaktion.sh, logs/reaktion.csv,
Entwurf research/captcomm/entwuerfe/reaktion.md. Schreibe nicht in
notes.md, mechanik.md oder erkenntnisse.md, committe nicht.
```

### M2: Verhalten von WOOKY und EDDY (Präfix `verhalten`)

```text
Aufgabe: Beschreibe das Verhalten der beiden Nahkämpfer aus Stage 1 von
Captain Commando (WOOKY, EDDY) als messbares Modell. Wir entwerfen
unsere Gegnerlogik selbst und brauchen Richtwerte, keine Nachbildung.
Lies zuerst docs/erkenntnisse.md (Abschnitt „Gegner als Vorbild“),
research/captcomm/notes.md („Szenarien“, „Gefundene Adressen“,
„Nachtrag: Schaden der Gegner“) und research/captcomm/grafik/README.md
(Stage 1, Abschnitte Gegner und „Abläufe von WOOKY und EDDY“). Vorlagen:
scripts/scenarios/hurt.lua, hurt_c.lua, rang.lua; für lange Läufe mit
Bot scripts/grafik/bot.lua und durchlauf.lua (Kamera-Adressen, Zählung
der Gegner im Bild).

Ausgangslagen: Savestates anlauf, anlauf_b, anlauf_c, kontakt,
kontakt_b, ingame, stage1. Läufe von 1500 bis 6000 Frames mit
eingeschränktem dump-Bereich (Regeln). Die Figur muss überleben: LP
per Eingriff auffüllen (P+0x40 := 72, wenn 0 < LP < 72, wie in
bot.lua), als EINGRIFF kennzeichnen.

Zu messen:

A. Einzelner Gegner gegen eine passive Figur (keine Eingabe), je
   Gegnertyp, mindestens drei Ausgangslagen:
   1. Aktivierung: ab welchem x-Abstand zur Figur oder zur Kamera
      wechselt S+5 auf 1 und S+4 von 2 auf 1.
   2. Annäherung: Geschwindigkeit, ob er in der Tiefe auf die Linie der
      Figur geht, mit welcher Toleranz er stoppt (x-Abstand und
      Tiefenabstand im Frame des Stillstands, Verteilung über alle
      Läufe).
   3. Erster Angriff: Frames zwischen Stillstand und Beginn der
      Angriffsanimation; welche Animation (Kennung des
      Animationszeigers).
   4. Rhythmus: Abstände zwischen den Angriffsbeginnen über mindestens
      1500 Frames, Reihenfolge der Angriffsarten (Schlagserie, Griff mit
      Knie beim WOOKY, Sprungknie beim EDDY), ob er zwischen Angriffen
      zurückweicht oder die Seite wechselt (hinter die Figur läuft).
B. Reaktion auf die Figur:
   1. Figur läuft mit 1,75 px/Frame weg: holt er auf, bleibt der Abstand,
      bricht er ab?
   2. Figur wechselt die Tiefe (hoch/runter in Schritten von 20 px):
      folgt er, mit welcher Verzögerung?
   3. Figur springt wiederholt: greift er in der Luft an, wartet er?
   4. Figur liegt und steht auf (nach Wurf): Greift er in den
      Schutzfenstern an (S+0x24 aktiv während P+4 = 3) oder wartet er?
      Das beantwortet die offene Frage aus mechanik.md
      („Unverwundbarkeit“): Treffer ignoriert oder Gegner greift nicht an.
      Zähle Angriffsbeginne in Schutzfenstern über alle Läufe.
C. Gruppen (Läufe hurt ab Frame 1000, hurt_c, eigene Läufe ab stage1
   mit Bot ohne Angriff): Bei drei oder mehr aktiven Gegnern je Frame:
   wie viele sind gleichzeitig in einer Angriffsanimation (Maximum,
   Häufigkeit), wo stehen die übrigen (x-Abstand und Seite relativ zur
   Figur, Verteilung), ob Gegner von beiden Seiten angreifen und wie
   schnell ein zweiter Angreifer nach dem ersten beginnt.
D. Wellen in Stage 1 (Savestate stage1, Bot aus bot.lua ohne Angriffe
   oder Figur per Eingriff vorwärtsgesetzt): für jeden der 7 WOOKY und
   5 EDDY aus grafik/README.md den Auslöser bestimmen: Kamera-x beim
   Erscheinen (S+5 → 1) und ob zusätzlich ein Tod eines vorherigen
   Gegners nötig ist (zwei Läufe: einer mit Toten, einer mit LP der
   Gegner per Eingriff auf 1 gesetzt und sofort besiegt, einer ohne
   Kampf, soweit möglich).

Ergebnis: Tabelle „Verhaltensmodell“ mit Zuständen (warten, aktivieren,
annähern, Tiefe angleichen, angreifen, Pause, Seitenwechsel) und je
Übergang Bedingung in px bzw. Frames mit Spanne und Anzahl der
Beobachtungen, Status je Zeile. Ablieferung nach den Regeln mit Präfix
verhalten: Szenarien, messen_verhalten.py (Zeitachsen je Slot:
Zustand, Abstand x und Tiefe zur Figur, Animationskennung, Angriffe mit
S+0x24; Zusammenfassung mit Min/Median/Max), belege_verhalten.sh,
logs/verhalten.csv, Entwurf research/captcomm/entwuerfe/verhalten.md.
Nicht in notes.md, mechanik.md, erkenntnisse.md schreiben, nicht
committen.
```

### M3: Reichweite der Gegnerangriffe (Präfix `greichweite`)

```text
Aufgabe: Miss Startup, aktive Frames, Reichweite und Nachlauf der
Angriffe der Gegner aus Stage 1 von Captain Commando gegen die
Spielfigur. Unser Spiel braucht diese Werte, damit Gegnerangriffe
lesbar und fair sind. Lies zuerst docs/mechanik.md (Abschnitte
„Schaden der Gegner“ und „Umgeworfen werden“), research/captcomm/notes.md
(„Nachtrag: Schaden der Gegner“, „Nachtrag: Reichweite der Kettenstufen
2–4“, „Gefundene Adressen“) und research/captcomm/grafik/README.md
(Stage 1, Tabelle Gegner). Vorlagen: scripts/scenarios/kette.lua
(Eingriff auf Positionen), rang.lua, griff.lua; Auswertung
scripts/messen_a5.py angreifer (ordnet jeden LP-Verlust dem Angreifer,
dem Trefferattribut S+0x24 und dem Schaden S+0x8B zu).

Reihenfolge: WOOKY und EDDY vollständig, dann SKIP (Ausfallstich,
Messerwurf, Messerhagel), dann DICK (Pistole, Rakete), soweit die Zeit
reicht. Je Angriffsart:

1. Startup: Frames vom ersten Frame der Angriffsanimation
   (Animationszeiger) bis zum ersten Frame mit aktivem Trefferattribut
   S+0x24. Das ist die Zeit, die die Figur zum Reagieren hat.
2. Aktive Frames: Frames mit aktivem S+0x24 je Schlag einer Serie.
3. Reichweite x: Figur passiv, per Eingriff vor jedem Frame auf einen
   festen x-Abstand zum Gegner gesetzt (P+0x0E, wie kette.lua für den
   Gegner, nur umgekehrt). Treffer ja/nein über LP-Verlust. Grenze: hit
   bei ≤ N px, kein Treffer bei N+1 px. Beide Blickrichtungen des
   Gegners.
4. Tiefentoleranz: wie 3 mit festem x und variierter Tiefe (P+0x16),
   Schrittweite 1 px um die Grenze.
5. Ob der Angriff die Figur umwirft (P+4 = 2 danach) und welcher Schlag
   einer Serie es tut.
6. Nachlauf: Frames vom letzten aktiven Frame bis zum nächsten
   Animationswechsel in Gehen oder Stand (Fenster für den Gegenangriff).
7. Höhe: trifft der Angriff eine springende Figur, bis zu welcher Höhe
   (P+0x12 per Eingriff setzen oder natürlich springen; WOOKY laut
   notes.md bis 48 px).

Hinweis: Nach einem Treffer ist die Figur 27 Frames geschützt, also je
Lauf höchstens einen Treffer je Angriff werten, oder die LP auffüllen
und nur Treffer außerhalb des Schutzfensters zählen. Für Angriffe, die
der Gegner nur aus bestimmten Abständen auslöst, den Angriffsbeginn
natürlich abwarten und erst ab dann die Position setzen. Rang per
rang.lua festhalten, damit der Schaden konstant bleibt (EINGRIFF).

Ergebnis: Tabelle je Gegner und Angriff mit Startup, aktiven Frames,
Reichweite x (je Blickrichtung), Tiefe, Umwerfen, Nachlauf, Höhe,
Schaden (zum Abgleich mit mechanik.md), Status je Zeile. Ablieferung
nach den Regeln mit Präfix greichweite: Szenarien, Unterbefehl
gegnerangriff in messen_a5.py (je Angriff Zeitachse von Animation,
S+0x24, Abstand, Treffer), belege_greichweite.sh,
logs/greichweite.csv, Entwurf research/captcomm/entwuerfe/greichweite.md.
Nicht in notes.md, mechanik.md, erkenntnisse.md schreiben, nicht
committen. Stimme dich nicht mit anderen Agenten ab; Überschneidungen
mit dem Verhaltensmodell (M2) löst der Auftraggeber.
```

### M4: Spezialangriff und Sprint (Präfixe `spezial`, `sprint`)

```text
Aufgabe: Miss den Spezialangriff und den Sprint der Spielfigur in
Captain Commando. Bisher gibt es dazu nur Werte ohne Skript im Repo
(research/captcomm/grafik/README.md, „Gemeinsame Bewegungen“). Lies
zuerst docs/mechanik.md (Sprung, Sprungangriff, Griff und Wurf,
Abschnitt „Nicht übernommen“), research/captcomm/notes.md („Nachtrag:
Sprungangriff“, „Nachtrag: Griff und Würfe“, „Gefundene Adressen“) und
grafik/README.md („Gemeinsame Bewegungen“, „Spielfiguren“). Vorlagen:
scripts/scenarios/sprungangriff.lua, kette.lua (Eingriff auf
Gegnerposition), jump.lua; Auswertung messen_a5.py (sprungangriff,
sprung, laufen, treffer).

Teil 1, Spezialangriff (Angriff und Sprung im selben Frame, Aktion
P+0x0A = 0x14), zuerst mit Captain Commando (Savestates kontakt,
kontakt_b, ingame), dann mit Mack, Ginzu und Baby Head (Savestates
held0, held2, held3, Gegner per Eingriff heranholen):
1. Auslösung: nur im selben Frame? Was passiert bei Druck in P+1?
   Geht er auch aus dem Lauf, in der Landung, in der Trefferreaktion?
2. Ablauf: Gesamtdauer bis zur Handlungsfähigkeit, Frames mit P+4 = 3
   oder anderem Schutz (Gegner per Eingriff angreifen lassen und
   prüfen, in welchen Frames die LP fallen).
3. Schaden je Gegner, Anzahl getroffener Gegner (zwei und drei Gegner
   per Eingriff platzieren), ob jeder Gegner nur einmal trifft, ob die
   Gegner umgeworfen werden und wie weit sie fliegen.
4. Reichweite: x nach vorn und nach hinten, Tiefe, Höhe (Gegner in der
   Luft?), aktive Frames (Gegner per CC_FERN-Technik erst ab Frame k in
   Reichweite setzen).
5. Kosten: 9 LP nur bei Treffer? Je Treffer oder einmal? Bei weniger
   als 9 LP: stirbt die Figur, bleibt sie bei 0, geht sie unter 0?
   Verhalten bei genau 9 LP.
6. Unterschiede der vier Helden in Dauer, Schaden, Reichweite.

Teil 2, Sprint (Doppeltipp), Captain Commando ab ingame, Gegner per
Eingriff für die Angriffe:
1. Eingabefenster: längste erste Tastendauer, längste Pause, ob der
   zweite Druck gehalten werden muss. Alle acht Richtungen, auch
   diagonal und in der Tiefe (Geschwindigkeit je Achse).
2. Geschwindigkeitsverlauf: x je Frame über die 90 Frames; Verhalten
   beim Loslassen und bei Richtungswechsel; erneuter Sprint direkt nach
   dem Ende.
3. Sprintangriff: Startup, aktive Frames, Reichweite x und Tiefe,
   Schaden, Umwerfen, Weg und Dauer, Nachlauf; wird ein Gegner auf dem
   Weg mitgenommen?
4. Sprintsprung und Sprint-Sprungangriff: Flugbahn gegenüber dem
   normalen Sprung, Schaden, Umwerfen, aktive Frames.
5. Griff aus dem Sprint: gibt es ihn oder nicht (notes.md sagt nein).

Ergebnis: zwei Tabellen (Spezialangriff, Sprint) mit Status je Zeile.
Ablieferung nach den Regeln: Szenarien spezial_*.lua und sprint_*.lua,
Unterbefehle spezial und sprint in messen_a5.py, belege_spezial.sh und
belege_sprint.sh, logs/spezial.csv und logs/sprint.csv, Entwürfe
research/captcomm/entwuerfe/spezial.md und sprint.md. Nicht in
notes.md, mechanik.md, erkenntnisse.md schreiben, nicht committen.
```

### M5: Gegenstände und Waffen (Präfix `item`)

```text
Aufgabe: Miss die Wirkung der Gegenstände in Captain Commando, zuerst
in Stage 1, dann in weiteren Stages, soweit die Zeit reicht. Lies
zuerst docs/erkenntnisse.md („Stages als Vorbild“, Gegenstände),
research/captcomm/grafik/README.md (Stage 1 Kennwerte, Objekte; die
Stage-Abschnitte 2 bis 9 für weitere Gegenstände) und
research/captcomm/notes.md („Objekt-Slots“, „Gefundene Adressen“,
„Nachtrag: Schaden der Gegner“ wegen der Geschosse). Vorlagen:
scripts/grafik/bot.lua und durchlauf.lua (Stage durchlaufen, Kamera,
Gegner im Bild), scenarios/stage_start.lua (Savestates stage1 bis
stage9), kette.lua (Eingriffe), messen_a5.py angreifer.

Zuerst die Objekt-Slots der Gegenstände finden: Beim Zerstören der
Ölfässer in Stage 1 (Welt-x nach grafik/README.md) erscheinen das
Brathähnchen und der Raketenwerfer. Suche in den Slots 20 bis 59 die
Blöcke, die in diesem Frame belegt werden, und bestimme Typkennung
(S+0x38), Position, Lebensdauer. Dokumentiere die Adressen wie in
„Gefundene Adressen“.

Zu messen:
1. Aufnehmen: Wie wird ein Gegenstand aufgenommen (Darüberlaufen,
   Angriffstaste, Bedingung an Abstand und Tiefe)? Geht es im Sprung, im
   Griff, in der Trefferreaktion?
2. Essen: Heilwert je Essen (Brathähnchen in Stage 1; weitere Speisen in
   anderen Stages, LP vorher per Eingriff auf 10, 40, 70 gesetzt, damit
   Voll- und Teilheilung unterscheidbar sind). Punkte je Essen.
3. Lebensdauer: Liegen und Blinken (Stage 1 laut README etwa 700 und
   91 Frames), ob das für alle Gegenstände gilt, ob Gegenstände beim
   Scrollen aus dem Bild verschwinden.
4. Waffen (Raketenwerfer, Laser, Pistole des DICK, weitere): Munition
   oder Dauer, Schaden je Schuss (gegen WOOKY mit LP per Eingriff hoch
   gesetzt), Geschossgeschwindigkeit, Reichweite, Tiefentoleranz, ob
   das Geschoss mehrere Gegner trifft, ob es umwirft, Startup und
   Nachlauf des Schusses, ob die Waffe beim Treffer gegen die Figur
   verloren geht, ob sie beim Wurf oder Sprung bleibt, ob die normale
   Kette mit Waffe anders ist.
5. Punkte: Punkte je Treffer der Kette (aus logs: 10, 20, 30, 80
   vermutet), je besiegtem Gegner, je Gegenstand, je Fass, Bonus am
   Stage-Ende („EARNED 2000 PTS“).
6. Geldkassetten und Fässer: Trefferzahl bis zum Zerbrechen, ob
   Gegnerangriffe sie zerstören.

Ergebnis: Tabelle je Gegenstand mit Wirkung, Werten, Status je Zeile,
dazu die neuen Adressen. Ablieferung nach den Regeln mit Präfix item:
Szenarien item_*.lua, messen_item.py (Slots 20 bis 59 beobachten:
Belegung, Typ, Position, Lebensdauer; LP-Änderungen der Figur nach oben;
Punkte), belege_item.sh, logs/item.csv, Entwurf
research/captcomm/entwuerfe/item.md. Nicht in notes.md, mechanik.md,
erkenntnisse.md schreiben, nicht committen.
```

---

## 4. Phase 2: Gegenprüfer (V1 bis V5, je einer nach Abschluss des zugehörigen Messagenten)

Opus startet jeden Gegenprüfer, sobald der zugehörige Messagent
abgeliefert hat. Der Prompt ist eine Schablone; Opus setzt Thema,
Präfix und Entwurfsdatei ein und hängt die Regeln an.

```text
Aufgabe: Gegenprüfung der Messung „<Thema>“ in Captain Commando
(MAME-Set captcomm). Ein anderer Agent hat gemessen und seinen Entwurf
in research/captcomm/entwuerfe/<praefix>.md abgelegt. Lies zuerst nur
die Ergebnistabelle dieses Entwurfs, nicht seine Szenarien und nicht
seine Auswertung. Lies dann docs/mechanik.md, research/captcomm/notes.md
(„Szenarien“, „Gefundene Adressen“) und die in den Regeln genannten
Vorlagen.

Prüfe jede Zeile der Ergebnistabelle mit eigenen Szenarien
(scripts/scenarios/<praefix>_v_*.lua, CC_NAME mit Präfix <praefix>_v),
die sich von denen des Messagenten unterscheiden müssen: andere
Startframes, andere Ausgangslage (anderer Savestate oder anderer
Gegner), andere Position, andere Reihenfolge. Lies seine Szenarien
erst, nachdem du deine eigenen Werte hast, und nur, um Abweichungen zu
erklären. Für jede Zeile: bestätigt (dein Wert gleich, mit Laufname und
Frames), abweichend (dein Wert, Erklärung, falls du eine hast), nicht
prüfbar (Grund). Prüfe auch, ob belege_<praefix>.sh von vorn
durchläuft und dieselbe logs/<praefix>.csv erzeugt (MD5 vorher und
nachher).

Ablieferung: research/captcomm/entwuerfe/<praefix>_v.md mit der
Prüftabelle und einer Liste der Szenarien, die bleiben sollen (die
übrigen löschst du). Ergänze belege_<praefix>.sh um deine bleibenden
Läufe, damit die Gegenläufe im Repo reproduzierbar sind, und lass das
Skript einmal ganz durchlaufen. Nicht in notes.md, mechanik.md,
erkenntnisse.md schreiben, nicht committen. Zehn Zeilen Bericht:
Anzahl bestätigt, abweichend, nicht prüfbar, und die abweichenden
Zeilen mit beiden Werten.
```

Statusregel für Opus nach der Gegenprüfung: bestätigt und per Skript im
Repo → **gesichert**; abweichend → **unsicher** mit beiden Werten im
Entwurf, Opus entscheidet nicht selbst, welcher stimmt, sondern lässt den
Messagenten (per SendMessage, mit dem Befund) ein drittes Mal mit einer
dritten Variante messen; bleibt es abweichend, bleibt es unsicher.

---

## 5. Phase 3: Designagenten (D1 und D2, parallel zu Phase 1)

Beide schreiben eigene Figuren, Namen und Schauplätze. Nichts aus
Captain Commando übernehmen außer Zahlenwerten und Rollen. Keine Namen
von Capcom-Figuren oder -Stages im Design (im Quellenverweis sind sie
erlaubt). Kein Code.

### D1: Designdokument Kern (`docs/design.md`)

```text
Aufgabe: Schreibe das Designdokument für Comet Brawlers, ein
Beat-'em-up im Stil der Arcade-Spiele um 1991, inspiriert von Captain
Commando, aber kein Nachbau. Lies zuerst CLAUDE.md, docs/erkenntnisse.md
vollständig, docs/mechanik.md vollständig und in
research/captcomm/grafik/README.md die Abschnitte „Spielfiguren“ und
„Gemeinsame Bewegungen“. Schreibe docs/design.md auf Deutsch, in
Markdown, mit Tabellen, ohne Code. Zahlenwerte kommen aus mechanik.md
und werden dort zitiert (Abschnittsname), nicht neu erfunden. Wo
mechanik.md einen Wert nicht hat, schreibe „offen (M1)“ bis „offen (M5)“
nach den laufenden Messungen: M1 Trefferreaktion der Gegner, M2
Gegnerverhalten, M3 Reichweite der Gegnerangriffe, M4 Spezialangriff
und Sprint, M5 Gegenstände. Diese Stellen werden später gefüllt.

Gliederung (Überschriften genau so):
1. Vision in zehn Sätzen: Was das Spiel ist, für wen, was es vom
   Vorbild übernimmt (Kampfgefühl nach Zahlen) und was eigen ist
   (Figuren, Welt, Gegner, Stages, Grafik, Sound).
2. Welt und Ton: drei Vorschläge für Schauplatz und Ton (zum Beispiel
   Weltraumhafen auf einem Kometen, Küstenstadt nach einem
   Kometeneinschlag, Zirkusschiff zwischen Planeten), je fünf Sätze,
   dann eine Arbeitsannahme (einen Vorschlag wählen und als „Vorschlag,
   Entscheidung des Nutzers offen“ markieren).
3. Technische Grundlage: logische Auflösung 384 × 224, fester
   Spielschritt 60 Hz, Einheiten (1 Positionseinheit = 1 Pixel, Tiefe
   als eigene Achse), Eingabelatenz 1 Frame, Trefferstopp, Rendering
   skaliert nur die Ausgabe. Begründe in drei Sätzen, warum die Werte
   nur so direkt übertragbar sind.
4. Spielfigur, Grundkit: eine Frame-Tabelle je Aktion (Laufen, Sprung,
   Kette Stufe 1 bis 4, Sprungangriff vier Varianten, Griff, Wurf,
   Kniestoß, Spezialangriff, Sprint, Sprintangriff, Umgeworfen werden,
   Aufstehen) mit Spalten: Startup, aktive Frames, Nachlauf,
   Reichweite x, Tiefe, Schaden, Umwerfen, Besonderheit, Quelle. Dazu
   die Regeln: Kombofenster ohne Puffer, Schutzfenster, Treffer im
   selben Frame gewinnt die Figur, Tod erst unter 0 LP.
5. Helden: vier eigene Helden mit Arbeitsnamen, je ein Satz
   Charakter, Umriss in Pixeln (im Rahmen 36 bis 73 × 71 bis 83),
   Unterschiede nur in Kette (Schaden je Stufe), Wurf (Schaden, Weite,
   Sonderwurf) und Spezialangriff (Dauer, Form). Bewegung für alle
   gleich. Tabelle wie in erkenntnisse.md, aber mit eigenen Werten, die
   sich an die Spannen des Vorbilds halten.
6. Lebenspunkte, Schaden, Schwierigkeit: 72 LP, Gegnerschaden 5 bis 13,
   Rang 7 bis 24 mit Start 9, +1 nach 409 Frames und dann alle 600
   Frames, −3 je Tod, Wirkung auf Schaden und LP der Gegner. Eine
   Rechnung: wie viele Treffer die Figur zu Beginn und am Ende einer
   Stage aushält, wie viele Ketten ein Gegner jeder Rolle braucht.
7. Rahmen: Titel, Figurenwahl, Anzeigeleiste (LP-Balken Figur und
   zuletzt getroffener Gegner, Punkte, Leben, Zeit?), Leben und
   Continue, Punkte (Vorschlag je Treffer, Gegner, Gegenstand), zwei
   Spieler gleichzeitig (Regeln für Freundbeschuss, Griff auf Mitspieler,
   Kamera bei zwei Spielern). Alles als Vorschlag mit Begründung.
8. Vertikale Scheibe: Umfang des ersten spielbaren Stands: ein Held,
   zwei Nahkämpfer, ein Fernkämpfer, ein Stage-Abschnitt mit einer
   Kamerasperre und einer Bossarena, ein Boss mit Super-Armor, zwei
   Gegenstände. Liste der nötigen Animationen mit Bildzahl und Dauer je
   Bild (aus research/captcomm/grafik/figuren/ablaeufe.csv als
   Richtwert), Liste der Messwerte, die vorher gesichert sein müssen,
   Abnahmekriterien (zehn prüfbare Sätze).
9. Offene Entscheidungen des Nutzers: nummerierte Liste.
10. Quellen: welche Abschnitte aus mechanik.md, erkenntnisse.md und
    grafik/README.md verwendet wurden.

Umfang: 1500 bis 2500 Wörter plus Tabellen. Keine Capcom-Namen im
Designtext (Captain Commando, Mack, Ginzu, Baby Head, WOOKY usw. nur in
Abschnitt 10). Kein Code, keine Engine-Empfehlung. Ablieferung:
docs/design.md. Zehn Zeilen Bericht mit den offenen Entscheidungen.
Nicht committen.
```

### D2: Designdokument Gegner, Boss und Stages (`docs/design-gegner-stages.md`)

```text
Aufgabe: Schreibe den Gegner- und Stage-Teil des Designdokuments für
Comet Brawlers, ein Beat-'em-up inspiriert von Captain Commando, kein
Nachbau. Lies zuerst CLAUDE.md, docs/erkenntnisse.md (Abschnitte
„Gegner als Vorbild“, „Stages als Vorbild“, „Hinweise für die eigene
Grafik“), docs/mechanik.md („Schaden der Gegner“, „Lebenspunkte“) und
research/captcomm/grafik/README.md vollständig (alle neun Stages, die
Gegnertabelle, „Abläufe von WOOKY und EDDY“) sowie
research/captcomm/grafik/gegner/ablaeufe.csv. Schreibe
docs/design-gegner-stages.md auf Deutsch, Markdown, Tabellen, kein
Code. Zahlen aus den Quellen zitieren; wo ein Wert fehlt, „offen (M1)“
bis „offen (M5)“ schreiben: M1 Trefferreaktion der Gegner, M2
Gegnerverhalten, M3 Reichweite der Gegnerangriffe, M4 Spezialangriff
und Sprint, M5 Gegenstände.

Gliederung (Überschriften genau so):
1. Gegnerrollen: sechs Rollen (Nahkämpfer leicht, Nahkämpfer schwer,
   schneller Messerkämpfer, Fernkämpfer, Flächenangreifer, schwerer
   Gegner) mit je: Aufgabe im Kampf, LP-Spanne nach Rang, Schaden nach
   Rang, Geschwindigkeit, Angriffe (Startup, Reichweite, Umwerfen,
   soweit bekannt, sonst offen), Umriss in Pixeln (66 bis 100 px hoch),
   Verhalten in drei Sätzen. Eigene Arbeitsnamen.
2. Gegnerverhalten, Grundmodell: Zustandsmodell (warten, aktivieren,
   annähern, Tiefe angleichen, angreifen, Pause, Seitenwechsel) mit
   Richtwerten, soweit bekannt (Aktivierung, Abstand, Rhythmus:
   offen (M2)), und die Regel, wie viele Gegner gleichzeitig angreifen
   dürfen (Vorschlag, offen (M2)). Trefferreaktion der Gegner:
   Hitstun, Rückstoß, Liegen, Aufstehen, Schutz: offen (M1), mit
   Platzhaltertabelle.
3. Wiederverwendung: Plan, wie zwölf Gegnertypen über acht Stages mit
   Farbvarianten und LP-Stufen reichen (Tabelle Typ × Stage).
4. Bosse: Prinzipien (Super-Armor: Ketten ohne Umwerfen werden mit
   einem Stoß abgebrochen und die LP springen zurück; Angriff alle 170
   bis 200 Frames gegen eine passive Figur; Fall des Bosses besiegt die
   übrigen Gegner), dann acht Boss-Skizzen mit je fünf Sätzen, LP um
   100, drei bis vier Angriffen mit Schaden 9 bis 22 und Reichweiten.
5. Stage-Schablone: Kamera nur nach rechts, linker Rand als Wand,
   Figur bei Bildschirm-x 200 gehalten, Sperren mit Wellen, Bossarena
   am Ende, Tiefenband 75 bis 187 px, Länge 1500 bis 2500 px Scroll,
   reines Gehen 17 bis 56 s, Skriptszenen als Abwechslung, vertikales
   Scrollen, Vordergrundobjekte, Parallaxe sparsam. Als Prüfliste für
   jede Stage.
6. Acht Stages: je Stage ein Absatz mit Schauplatz (eigene Welt aus
   docs/design.md, Abschnitt 2; falls die Datei noch fehlt, Weltraumhafen
   auf einem Kometen als Arbeitsannahme), Länge, Anzahl Sperren,
   Skriptszene, Gegnermischung, Boss, Besonderheit (eine Stage als
   Sonderstage mit automatischem Scrollen wie das Hoverboard des
   Vorbilds).
7. Erste Stage im Detail: Abschnitte mit Welt-x, Tiefenband je
   Abschnitt, Objekte, Wellen (welche Gegner, wie viele, Auslöser:
   Kamera-x oder Tod eines Gegners, offen (M2)), Boss. Orientierung an
   Stage 1 des Vorbilds (1920 px Scroll, 7 plus 5 Nahkämpfer, ein
   Messerkämpfer, zwei Fernkämpfer, ein Mech, ein Boss), aber eigener
   Schauplatz.
8. Gegenstände und Waffen: Essen (heilt, Werte offen (M5)), Waffen
   (Raketenwerfer, Laser, Maschinengewehr, Wurfsterne als Rollen: Werte
   offen (M5)), Lebensdauer 700 plus 91 Frames Blinken, Behälter.
   Fahrzeug optional mit Begründung.
9. Animationsplan Gegner: je Rolle Liste der Animationen mit Bildzahl
   und Dauer je Bild aus gegner/ablaeufe.csv und der Gegnertabelle in
   grafik/README.md (Gehen 8 × 4, Haltung 3 × 5, Schlag etwa 60 Frames
   je Schlag, Tod 86 bis 90 Frames usw.).
10. Offene Entscheidungen des Nutzers und Quellen.

Umfang: 2000 bis 3000 Wörter plus Tabellen. Keine Capcom-Namen im
Designtext, nur im Quellenabschnitt. Kein Code. Ablieferung:
docs/design-gegner-stages.md. Zehn Zeilen Bericht. Nicht committen.
```

### Nach Phase 1 und 2: Nachtrag in beide Designdokumente

Wenn die Entwürfe der Messagenten vorliegen, startet Opus D1 und D2
erneut (SendMessage an denselben Agenten, damit der Kontext bleibt) mit:

```text
Die Messungen sind abgeschlossen. Lies research/captcomm/entwuerfe/*.md
(nur die Ergebnistabellen mit Status). Ersetze in deinem Dokument jede
Stelle „offen (M1)“ bis „offen (M5)“ durch den gesicherten Wert mit
Quelle „notes.md, Nachtrag <Thema>“. Unsichere Werte übernimmst du mit
dem Zusatz „unsicher“ und beiden Werten. Was weiter offen bleibt,
bleibt „offen“ mit einem Satz, warum. Ändere sonst nichts. Bericht:
Liste der ersetzten Stellen.
```

---

## 6. Phase 4: Einarbeitung durch Opus

Nach Phase 1 bis 3, in dieser Reihenfolge, mit je einem Commit:

1. **Commit „Messungen“**: Entwürfe aus `research/captcomm/entwuerfe/`
   in `research/captcomm/notes.md` einarbeiten: je Thema ein Abschnitt
   „Nachtrag: <Thema>“ nach dem Muster der bestehenden Nachträge (Belege,
   Eingriffe, Tabelle mit Status), Zeilen 14 bis 18 in der Stand-Tabelle,
   Eintrag im Laufprotokoll mit Datum, neue Adressen in „Gefundene
   Adressen“, neue Skripte in „Werkzeuge“ und „Szenarien“. Dann
   `docs/mechanik.md`: neue Abschnitte „Trefferreaktion der Gegner“,
   „Reichweite der Gegnerangriffe“, „Spezialangriff“, „Sprint“,
   „Gegenstände und Waffen“ nur mit gesicherten Werten; unsichere unter
   „Nicht übernommen“. Den Abschnitt „Unverwundbarkeit“ um den Befund aus
   M2 (Treffer ignoriert oder Gegner wartet) ergänzen. Ordner `entwuerfe/`
   löschen. Prüfen, dass `logs/raw/` leer bis auf Savestates ist und
   nichts aus `roms/` im Index liegt (`git status`, `.gitignore`).
2. **Commit „Erkenntnisse“**: `docs/erkenntnisse.md`: Stand-Tabelle
   aktualisieren, Abschnitt „Gegner als Vorbild“ um das Verhaltensmodell
   (Kurzfassung) und die Reichweiten erweitern, „Offene Punkte“ neu
   schreiben, zwei Unstimmigkeiten beheben: Rang steigt erstmals nach 409
   Frames und dann alle 600 (nicht „alle 600 ab Start“); WOOKY-LP
   einheitlich als 16 (Start) bzw. 22 bis 34 (später, nach Rang) wie in
   `mechanik.md`, in der Rollentabelle entsprechend. Datum „Stand“ auf das
   Tagesdatum.
3. **Commit „Design“**: `docs/design.md` und `docs/design-gegner-stages.md`
   nach dem Nachtrag der Designagenten, gegenseitig verlinkt. Opus prüft
   vor dem Commit: keine Capcom-Namen außerhalb der Quellenabschnitte
   (`grep -n -i 'captain commando\|wooky\|eddy\|ginzu\|mack the\|baby head\|dolg' docs/design*.md`),
   alle Zahlen stimmen mit `mechanik.md` überein (Stichprobe von zwanzig
   Werten), beide Dokumente verwenden dieselbe Welt (Abschnitt 2 von D1).
   In `docs/erkenntnisse.md` unter „Wo was steht“ beide Dateien
   eintragen.
4. Jeder Commit: deutsche Nachricht in der Form der bisherigen
   (`git log --oneline -15`), Push mit `git push origin HEAD:main`.
   Scheitert der Push wegen Netz, bis zu viermal mit 2, 4, 8, 16 Sekunden
   Wartezeit wiederholen.

---

## 7. Rückmeldung an den Orchestrator

Opus beendet die Sitzung mit genau dieser Gliederung, damit die
Fable-Sitzung weiterarbeiten kann:

```text
## Rückmeldung Opus, <Datum>

### Commits auf main
<hash> <Nachricht> (je Zeile)

### Messungen (je Thema eine Zeile)
M1 Trefferreaktion: <n> Werte gesichert, <n> unsicher, <n> offen. Wichtigster Befund: <ein Satz>.
M2 Verhalten: ...
M3 Reichweite: ...
M4 Spezial und Sprint: ...
M5 Gegenstände: ...

### Unsichere Werte mit beiden Messungen
<Größe>: Messagent <Wert>, Gegenprüfer <Wert>, dritte Messung <Wert oder entfällt>

### Design
docs/design.md: <Wortzahl>, offene Entscheidungen: <Anzahl>, Arbeitsannahme Welt: <ein Satz>
docs/design-gegner-stages.md: <Wortzahl>, offene Entscheidungen: <Anzahl>

### Offene Entscheidungen des Nutzers (nummeriert, je ein Satz)

### Was nicht erledigt wurde und warum

### Speicher, Laufzeit, Probleme mit MAME oder dem Container
```

Diese Rückmeldung kopiert der Nutzer in die Fable-Sitzung. Fable prüft
dann die Commits, entscheidet mit dem Nutzer die offenen Punkte und
plant den nächsten Auftrag.
