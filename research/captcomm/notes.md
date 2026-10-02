# Captain Commando (MAME-Set `captcomm`): Mechanik-Analyse

Wir analysieren das Spiel, indem wir ihm beim Laufen zusehen. MAME läuft
headless, ein Lua-Skript gibt Eingaben ein und protokolliert den
Arbeitsspeicher Frame für Frame. Ins Repo kommen eigene Skripte, Messwerte
und Beschreibungen sowie Grafiken aus dem Spiel (Bildschirmaufnahmen und
daraus geschnittene Ausschnitte) unter `research/captcomm/grafik/`. Für die
Grafiken liegt laut Nutzer eine Lizenz bzw. Sondergenehmigung vor, die auch
die öffentliche Verbreitung in diesem Repo abdeckt (Freigabe 2026-10-01).
Weiterhin nicht ins Repo: ROM-Dateien und ROM-Daten, Sounds und
disassemblierter Code.

Kennzeichnung in diesem Dokument:

- **gesichert**: in mindestens zwei unabhängigen Läufen reproduziert (mit variierten Eingaben, weil MAME deterministisch ist, siehe „Szenarien“), Beleg mit Frame-Nummern und Logausschnitt angegeben
- **unsicher**: einzelner Lauf, Vermutung oder Wert mit möglicher Messverzerrung (Begründung dabei)
- **gesichert (3. Messung)**: Messagent und Gegenprüfer wichen ab; eine dritte Messung mit einer dritten Variante hat eine gemeinsame Regel ergeben, die die Werte aller drei Messungen erklärt (Nachträge ab 2026-10-02). In diesen Nachträgen heißt **gesichert** außerdem: vom unabhängigen Gegenprüfer bestätigt, Skript im Repo
- **gesichert (Workflow)**: von mindestens zwei Agenten eines Workflows unabhängig gemessen und gegengeprüft, Läufe aber nur im Scratchpad der Sitzung (nicht mit einem Skript im Repo nachvollziehbar)
- **offen**: noch nicht gemessen

## Stand (2026-10-02)

| Aufgabe | Status |
|---|---|
| 1. Ordnerstruktur, `.gitignore` | erledigt |
| 2. `mame -verifyroms captcomm -rompath roms` | erledigt: alle Programm-, Grafik- und Sound-ROMs korrekt, nur ein PAL-Dump weicht ab (für die Emulation unerheblich, siehe unten) |
| 3. Headless-Lauf mit Lua (Demo, Münze/Start/Laufen/Schlagen) | erledigt: alle vier Szenarien laufen, kalibriert, bitgleich reproduzierbar |
| 4. Speicheradressen | erledigt: x, Tiefe, Höhe, LP Spieler und Gegner, Aktion, Kombostufe, Timer gesichert (blind in variierten Gegenläufen wiedergefunden). Gegnerzahl aus der Objekttabelle gezählt (kein eigener Zähler im RAM). Bedeutung einzelner Statuswerte unsicher, siehe „Gefundene Adressen“ |
| 5. Messungen | erledigt: alle sieben Messgrößen gesichert (Captain Commando), dazu Kombo-Fenster und Trefferstopp. Offen blieb nur, *wie* der Schutz wirkt (Treffer ignoriert oder Gegner greift nicht an), siehe „Messungen“; beantwortet im „Nachtrag: Verhalten der Nahkämpfer“: Die Gegner greifen an, die Treffer werden ignoriert |
| 6. Übernahme gesicherter Werte nach `docs/mechanik.md` | erledigt: alle gesicherten Messwerte aus Aufgabe 5 sowie Eingabelatenz, Trefferstopp, Kombo-Fenster, Liegedauer und Lebenspunkte; nach dem Nachtrag auch Sprung und Schlagreichweite. Unsichere Punkte stehen dort unter „Nicht übernommen“ |
| 7. Nachtrag: Sprung und Schlagreichweite | erledigt: Sprungablauf, Höhe, Schwerkraft, Weite und Steuerung sowie x-Reichweite, Tiefentoleranz und aktive Frames des Standardschlags gesichert, siehe „Nachtrag“ |
| 8. Nachtrag: Reichweite der Kettenstufen 2–4 | erledigt: x-Reichweite, Tiefentoleranz und aktive Frames je Stufe gesichert (per gekennzeichnetem Eingriff, natürlich gegengeprüft), siehe „Nachtrag: Reichweite der Kettenstufen 2–4“ |
| 9. Nachtrag: Würfe | erledigt: Eingabe, Schaden, Ablauf, Flugbahn und Weite des Wurfs, Kniestoß, Spezialangriff im Griff, geworfener Gegner als Geschoss; Umwerfen der Figur durch Gegner und Verkürzen des Liegens gesichert; dazu Reichweite und Bedingungen des Griffs, siehe „Nachtrag: Griff und Würfe“ |
| 10. Nachtrag: Schaden der Gegner | erledigt: Zuordnung jedes Treffers zum Angreifer, Schaden je Gegner und Angriff, Abhängigkeit vom Rang (Schwierigkeitswert FFF82A), Regeln für Umwerfen und Tod gesichert, siehe „Nachtrag: Schaden der Gegner“ |
| 11. Nachtrag: Sprungangriff | erledigt: vier Varianten, Schaden, Umwerfen, aktive Frames, Höhen-, x- und Tiefenreichweite gesichert, siehe „Nachtrag: Sprungangriff“ |
| 12. Grafik und Animationen | erledigt: Stage-Starts, Szenen und Panoramen aller 9 Stages, Animationsstreifen der 4 Spielfiguren, Pose-Galerien der Gegner je Stage, Beschreibung aller Stages, Helden und Gegner (Grafik-Workflow, Stichproben gegengeprüft: 115 von 129 bestätigt, Korrekturen eingearbeitet), siehe `grafik/README.md`. Offen: Titel, Figurenwahl, Abspann, Anzeigeleiste, Gegenstände |
| 13. Zusammenfassung für das Spiel | erledigt (2026-10-02): `docs/erkenntnisse.md` fasst Stand, Erkenntnisse und Richtwerte zusammen. Entscheidung des Nutzers: Comet Brawlers ist inspiriert, kein Nachbau; weiteres Messen nur noch, wo es beim Gestalten hilft |
| 14. Nachtrag: Trefferreaktion der Gegner | erledigt: Dauer der Trefferreaktion (23 Frames, h bis h+22), Zittern ohne Rückstoß, Neustart bei erneutem Treffer, Lücke in der Kette und erster Angriff danach (Ausholen frühestens h+45), Flug, Liegen, Aufstehen und Verwundbarkeit nach dem Umwerfen (verwundbar ab G, kein Schutzfenster), mehrere Gegner in einem Schlag und Tod gesichert (Messung, Gegenprüfung und dritte Messung, Skript im Repo). Unsicher bleiben die Wahl des WOOKY-Schlags, die Liegedauer des EDDY im Einzelfall, Aktion 0x1C, der Tod an einer Wand und die Reichweite nach dem Rückwärtswurf. Offen sind Treffer von hinten, andere Gegnertypen und der Tod durch den Kniestoß, siehe „Nachtrag: Trefferreaktion der Gegner“ |
| 15. Nachtrag: Verhalten der Nahkämpfer | erledigt: Verhalten von WOOKY und EDDY gemessen und gegengeprüft (220 Läufe). Die Gegenprüfung hat 21 von 33 Zeilen bestätigt. Von den 12 Abweichungen hat eine dritte Messung 8 durch gemeinsame Regeln geklärt, 2 teilweise. Gesichert sind Sichtbarkeit und Aufwachen über die Kamera, Annähern und Anhalten, die Angriffspause 29 − 4·⌊Rang/4⌋ (Rang 7–23), der Ablauf der Serien, die Reaktion auf Weglaufen, Tiefenschritt und Springen, Gruppen sowie Wellen und Kamerahalte von Stage 1. Die Gegner greifen in den natürlichen Schutzfenstern an, die Treffer werden ignoriert; offen bleibt der Widerspruch zum Eingriff `schutz_eingriff`. Unsicher bleiben Angriffsraten, Länge der Serien, der Median der EDDY-Pause, die Zeit bis zum nächsten Angriff nach einem Tiefenschritt und die Einzelheiten der Angriffsabläufe (nur eine Messung), siehe „Nachtrag: Verhalten der Nahkämpfer“ |
| 16. Nachtrag: Reichweite der Gegnerangriffe | erledigt: Startup, aktive Frames, Trefferstopp, Abbruchfenster um den Zielabstand S+0x96 ([Ziel − 31, Ziel + 32]), Tiefe, Höhe, Umwerfen, Nachlauf und Serien der Angriffe von WOOKY, EDDY und SKIP sind gesichert (Messagent und Gegenprüfer; die 21 Abweichungen hat eine dritte Messung als Regel bzw. Spanne geklärt). Unsicher: Sprungtritt in A+45 und knapp außerhalb seiner Reichweite (d 60 bzw. 59), SKIP-Grenzen je Blickrichtung der Figur, Hinterkante bei einer Figur, die zum Gegner schaut, Wahl des Ziels. Offen: wann S+0x96 gesetzt wird, SKIP-Messerwurf, DICK. Siehe „Nachtrag: Reichweite der Gegnerangriffe“ |
| 17. Nachtrag: Spezialangriff und Sprint | erledigt, in zwei Nachträgen. Spezialangriff: Auslösung, Ablauf, Schutz (70 Frames: Aktion und danach 20 Frames Timer `FFAA69`), Schaden 6 mit Umwerfen, wachsende Fläche und aktive Frames, Kosten 9 LP nur bei Treffer mit LP-Untergrenze 0 sowie die Unterschiede der vier Helden gesichert (Gegenprüfung V4; drei Abweichungen durch eine dritte Messung als Regeln geklärt). Unsicher bleiben Gegnerpose, Höhe des Gegners, Tiefe der Explosionen von Ginzu und Baby Head, Macks Tiefenbewegung und der Leerschlag, siehe „Nachtrag: Spezialangriff“. Sprint: (Messagent, Gegenprüfer und dritte Messung, `belege_sprint.sh`): Eingabefenster und Dauer, Tempo je Frame (gerade und diagonal, dazu ein Fehler des Spiels diagonal nach rechts; in der Tiefe bis Sprintframe 41), Rand der Tiefe, Lenken und Abbrechen, Sprintangriff (Ablauf, aktive Frames, Schaden, Reichweite, Rutschen), Sprintsprung, Sprint-Sprungangriff (Schaden, aktive Frames, Höhe, Reichweite in A+20) und kein Griff aus dem Sprint. Unsicher bleiben die Reichweite des Sprint-Sprungangriffs nach A+20, der Sprintangriff gegen einen Gegner genau über der Figur und der Flug nach dem Sprint-Sprungangriff. Offen sind das Tiefentempo nach Sprintframe 41, die Reichweite in A+13, die genaue Höhengrenze, Gegner in der Luft und die anderen Figuren, siehe „Nachtrag: Sprint“ |
| 18. Nachtrag: Gegenstände und Waffen | erledigt: Aufnehmen, Heilwerte der fünf Essen, Liegezeit, Raketenwerfer, Laser, Hammer, GUN, M-GUN, Behälter und Punkte sind gesichert (Messagent, Gegenprüfer und dritte Messung zu den acht Abweichungen, Skript im Repo). Unsicher bleiben u. a. der Aufnahmebereich des Raketenwerfers rechts (35 bzw. 37 px), die größte Laserreichweite (gesichert sind nur mindestens 245 px), der Laser beim Tod des ersten Gegners und der Grundwert der SKIP-Punkte (250 oder 300). Siehe „Nachtrag: Gegenstände und Waffen“ |
| 19. Nachtrag: Boss | erledigt: Lebenspunkte nach Rang (90 / 100 / 110 / 120, beim Erreichen der Arena festgelegt; S+0x9A ist beim Boss nur die Balkenskala 72, die Max-LP stehen in S+0xB7), Super-Armor (Kettenstufe 1 bis 3, Tritt, Sprung- und Sprintangriff zurückweisbar, LP in h+1 auf den Wert vor dem Treffer, danach harmloser Rückzug oder bei umwerfenden Treffern Abfangen; Spezialangriff, Kniestoß, Wurf, Rakete und Laser zählen immer), Trefferreaktion und Umwerfen, Schutz nach dem Aufstehen und bei der Körperpresse ohne Vorphase, alle fünf Angriffe mit Auslösung, Zeiten, Reichweite und Schaden, Rhythmus, Verstärkung (zwei EDDY bei halben LP, ein DICK bei einem Viertel, ein zweiter nur ab Rang 16, höchstens vier Gegner neben dem Boss) und Fall sind gesichert (Messagent, Gegenprüfer und dritte Messung, Skript im Repo; 30 Zeilen gesichert, 20 gesichert (3. Messung), 8 unsicher). Unsicher bleiben Anteil und Regel der Zurückweisung (auch wann er sich abfängt), die unterbrochene Kette, seine erste Aktion nach dem Aufstehen ab 50 px, das Halten der Figur, die Wurfweite, der Rhythmus gegen eine angreifende Figur und die Zeiten bis „STAGE 1 CLEAR“. Offen sind die LP bei einzelnen Rängen, der zweite DICK bei Rang 13 (bei Rang 14 und 15 keiner, siehe „Nachtrag: Fernangriffe der Gegner“) und die Reichweite des Armschwungs nach vorn bei Blick rechts, siehe „Nachtrag: Boss“ |
| 20. Nachtrag: Fernangriffe der Gegner | erledigt: Messerwurf und Stichserie des SKIP sowie Pistole und Raketenwerfer des DICK gemessen (Messagent, Gegenprüfer und dritte Messung, `belege_fern.sh`). Gesichert sind die Auslösung über einen Zielpunkt relativ zur Figur (SKIP 150 bzw. 64 px, DICK 128 oder 120 px), Ablauf und Geschosse (Slot, Tempo, gerade Bahn, Ende an Bildrand und Arenawand), die Trefferflächen als Regel in Weltkoordinaten, Tiefe, Höhe, Schaden je Rang, Umwerfen und Abwehr (nur das Messer lässt sich zerschlagen, nur die Explosion überspringen), Treffer auch in der Trefferreaktion der Figur, die Salvenlänge aus dem Budget S+0xAB, Erscheinen, LP und Bewegung des DICK (zweiter Raketen-DICK nur ab Rang 16 bei höchstens 4 belegten Gegnerslots) und seine Waffe beim Tod. Die Gegenprüfung bestätigte 37 von 55 Zeilen; von den 18 Abweichungen hat die dritte Messung 13 durch gemeinsame Regeln geklärt. Unsicher bleiben die Raten der drei Fernangriffe, Abstandsanteile und Rückzug des DICK, der Anteil der Doppelschüsse, die Explosion bei 26 px Höhe, das Messer am rechten Bildrand und die Stichabstände zwischen Serien und an einer Begrenzung (gekennzeichnet als Widerspruch zur gesicherten Spanne „37 bis 49 Frames“ für aufeinanderfolgende Stiche; mechanik.md bleibt dort unverändert). Offen sind u. a. die Regel für zwei normale Kugeln nacheinander, wovon das Salvenbudget abhängt, und die Fernkämpfer anderer Stages, siehe „Nachtrag: Fernangriffe der Gegner“ |
| 21. Nachtrag: Rest der Spielfigur | erledigt: Gesichert sind der Nachlauf der Kettenstufen 2–4 (Treffer und Leerschlag, Tritt nicht abbrechbar, kein Puffer; nach einem Treffer bricht nur Laufen zur Seite die Pose ab), Sprungangriff hoch und runter (aktive Frames, Höhengrenze, Reichweite, Schaden), Gegner mit genau 0 LP (Tod erst unter 0) und Tod und Neueinstieg der Figur: Ablauf je Todesart, Fall bis auf den Untergrund, Steuerung, Schutz 252 Frames ab dem Erscheinen (Stage 1), die Landung wirft alle Gegner im Bild um, Rang −3, Leben. Gesichert ist auch Rang −3 beim Stage-Wechsel. Ebenso gesichert sind die Reichweite hinter der Figur je Blickrichtung des Gegners, Blick links 1 px kürzer, Richtung beim Kettendruck, Treffer in der Luft und gleichzeitiger Treffer. Gemessen hat Messagent M8, Gegenprüfer V8 bestätigte 37 von 40 Zeilen, die drei Abweichungen D1, D4 und F1 hat eine dritte Messung als Regeln geklärt, Skript im Repo. Unsicher bleiben Laufen in die Tiefe nach Stufe 1, der Sprungangriff runter gegen einen schlagenden Gegner und drei nur vom Gegenprüfer gemessene Eingabevarianten des Sprungangriffs. Ebenso unsicher sind der Timer vor der Landung, die Landung auf dem Mech, die Abschnittsgrenze vor dem Mech für die gehende Figur, die Flugweite beim Klingentod, zwei Gegnerangriffe vor dem Erscheinen in Läufen der dritten Messung und der Schutz außerhalb von Stage 1. Offen sind überlagerte Todesarten, weitere tragende Untergründe, die Landung gegen schwache und ferne Gegner und der Schutz nach dem Neueinstieg bei anderen Figuren, siehe „Nachtrag: Rest der Spielfigur“ |

### Umgebung

- **ROM**: `roms/captcomm.zip` (2.577.865 Bytes, `testzip` fehlerfrei) wird
  aus dem Google Drive des Nutzers geladen. Jeder neue Cloud-Container
  braucht einen neuen Download, weil `roms/` und `*.zip` in der `.gitignore`
  stehen. Das Archiv wurde auf einem Mac gepackt. Die ROM-Dateien liegen im
  Unterordner `captcomm/`, dazu kommen `__MACOSX/._*`-Metadateien. MAME 0.264
  akzeptiert das Archiv trotzdem, weil es Dateien im ZIP auch per CRC findet.
  Entpacken ist deshalb nicht nötig.
- **`-verifyroms`** (2026-10-01, MAME 0.264): Alle 15 Programm-, Grafik- und
  Sound-ROMs stimmen mit CRC überein (68000 `maincpu`, `gfx`, Z80
  `audiocpu`, `oki`). Nur `ioc1.ic7` weicht ab: Das ist ein PAL vom C-Board,
  das Archiv enthält ihn mit 279 statt 260 Bytes und CRC `0d182081` statt
  `a399772d`, vermutlich ein älterer Dump. MAME meldet das Set deshalb als
  „bad“ und startet mit „WARNING: the machine might not run correctly“. Die
  PLD-Bereiche (`aboardplds`, `bboardplds`, `cboardplds`) sind Dumps der
  Platinenlogik. Dass der Treiber sie nicht liest, ist am Quellcode nicht
  geprüft, aber die Emulation läuft trotz der Abweichung normal (siehe
  Aufgabe 3). Lokales Entpacken behebt die Abweichung nicht.
  Fassung laut `-listfull`: „Captain Commando (World 911202)“. Der
  Warnbildschirm schließt die USA, Kanada, Mexiko und Japan aus.
- **MAME**: 0.264 aus dem Debian-Paket `mame 0.264+dfsg.1-1`, installiert
  über das Setup der Umgebung. Die Binärdatei liegt in `/usr/games/mame`,
  das nicht im `PATH` liegt. `run.sh` findet sie trotzdem (alternativ
  `MAME=/pfad/zu/mame`). Bildrate laut `-listxml`: 59,637405 Hz (8 MHz
  Pixeltakt ÷ (512 × 262)), Bildschirm 384 × 224.
  Harmlose Meldungen bei jedem Start: `XDG_RUNTIME_DIR`, ALSA ohne
  `/dev/snd`, „-video none doesn't make much sense without -seconds_to_run“.
- Geschwindigkeit: etwa 12- bis 20-fache Echtzeit inklusive
  RAM-Vollabzug pro Frame (90 s Demo in 7,5 s).
- Python 3.11 ohne numpy. Die Auswertewerkzeuge nutzen deshalb nur die
  Standardbibliothek.

## Werkzeuge (`scripts/`)

| Datei | Zweck | Getestet |
|---|---|---|
| `run.sh` | startet `mame captcomm -video none -sound none -nothrottle` mit `runner.lua`; optional ab Savestate; `CC_NAME` setzt einen anderen Ausgabenamen (für parametrisierte Szenarien) | ja (MAME 0.264) |
| `runner.lua` | spielt Szenario-Eingaben framegenau ein; schreibt Eingabe-CSV, Watch-CSV, RAM-Vollabzug (`0xFF0000–0xFFFFFF`), Liste der Eingabefelder; Snapshots/Savestates auf Wunsch | ja: Eingaben, Watch-CSV, Abzug (Größe = Frames × 65.544 Bytes), Snapshots auch mit `-video none`, Savestate. Ein Fehler behoben: `machine:save()` erwartet nur den Namen (MAME ergänzt `captcomm/` und `.sta`). Optionales Feld `pokes` schreibt Werte in den RAM; nur für ausdrücklich gekennzeichnete Eingriffe (`schutz_eingriff.lua`) |
| `scenarios/*.lua` | `attract` (Demo, 90 s), `coin_start` (Münze, Start, Figurenwahl, Savestate `ingame`), `walk`, `attack`, `jump`, `hurt`; Gegenläufe mit variierten Eingaben: `walk_b`, `jump_b`, `attack_b`, `hurt_b` | ja; Zeitpunkte am 2026-10-01 anhand von Snapshots kalibriert (siehe „Szenarien“) |
| `ramtools.py` | `info`, `search` (verkettete Filter, u. a. `noinc`/`nodec`), `track`, `changes`, `enemies` (Gegnerzahl aus der Objekttabelle) auf den RAM-Abzügen | ja, mit synthetischem Abzug und mit echten Abzügen (`search` über 64 KiB × 40 Frames < 1 s). Fehler behoben: `search --width 4` prüfte nur durch 4 teilbare Adressen, der 68000 liest Langwörter an jeder geraden Adresse |
| `verify_b.sh` | blinde Suchen für Aufgabe 4 in den Gegenläufen; Ausgabe in `logs/a4_gegenpruefung.txt` | ja |
| `belege_a4.sh` | erzeugt die Logausschnitte `logs/a4_*.csv` aus den Rohabzügen | ja |
| `messen_a5.py` | Auswertungen für Aufgabe 5: `laufen`, `treffer` (LP-Abnahmen der Gegner mit Kombostufe), `schlag` (Zeitachse eines Einzelschlags), `anim`, `schutz`, `fenster`, `reaktion`; dazu die Unterbefehle der Nachträge (eigene Zeilen unten). Seit 2026-10-02 auch `gegnerreaktion`, `gegnerangriff`, `gegnerzusammenfassung`, `spezial`, `sprint`; deren Umsetzung steht in `messen_reaktion.py`, `messen_greichweite.py` und `messen_spezial.py` | ja |
| `laeufe_a5.sh` | alle MAME-Läufe für Aufgabe 5 (und die Grundläufe aus 3/4) von vorn, ~1 min | ja: zweimal ausgeführt, Ergebnisse identisch |
| `belege_a5.sh` | erzeugt `logs/a5_*.csv` | ja |
| `laeufe_a7.sh`, `belege_a7.sh` | Läufe (~1 min) und Logausschnitte `logs/a7_*.csv` für den Nachtrag Sprung und Schlagreichweite; dazu `messen_a5.py sprung` und `aktiv` | ja |
| `grafik/alle.sh` | erzeugt alle Spielgrafiken unter `grafik/` neu (~15 min): Stage-Starts (`scenarios/stage_start.lua`), Durchlauf-Bot (`grafik/bot.lua`, `bot.sh`, `durchlauf.lua`) mit Panoramen (`panorama.py`) und Szenenbildern (`szenen.py`), Animationsstreifen der Figuren (`helden.sh`, `scenarios/anim.lua`, `streifen.py`), Pose-Galerien (`gegner.sh`, `gegner.py`) und Ablaufstreifen der Gegner (`gegner_ablauf.sh`). Beschreibung in `grafik/README.md` | ja |
| `belege_sprungangriff.sh` | 129 Läufe mit `scenarios/sprungangriff.lua` (Einzelframe-Proben `CC_FERN_BIS`/`CC_NAH_BIS`, Richtung zum Angriff `CC_ADIR`) und Auswertung mit `messen_a5.py sprungangriff` und `treffer` nach `logs/sprungangriff.csv` (~1 min) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_griff.sh` | 36 Läufe mit `scenarios/griff.lua` und Auswertung mit `messen_a5.py griff` und `treffer` nach `logs/griff.csv` (~20 s) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_wurf.sh` | 42 Läufe mit `scenarios/griff.lua` (freie Eingaben `CC_IN`, Länge `CC_FRAMES`; Eingriff nur zum Absetzen des Gegners) und Auswertung mit `messen_a5.py wurf`, `wurfablauf`, `umfallen` nach `logs/wurf.csv` (~1 min) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_gegnerschaden.sh` | 13 Läufe mit `scenarios/rang.lua` (Hülle um `hurt*.lua`/`griff.lua`: Laufzeit `CC_FRAMES`, Rang-Eingriff `CC_RANG`) und Auswertung mit `messen_a5.py angreifer` und `rang` nach `logs/gegnerschaden.csv` (~30 s) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_kette.sh` | 159 Läufe mit `scenarios/kette.lua` (Kette bis Stufe `CC_STUFE`, Eingriffe `CC_DX`, `CC_DZ`, `CC_FERN`, `CC_POKE_BIS`; ohne Eingriff `CC_VERT`, `CC_ABSTAND_LETZT`) und Auswertung mit `messen_a5.py kette` nach `logs/kette_reichweite.csv`; löscht danach die eigenen Rohabzüge (~2 min) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_reaktion.sh` | Trefferreaktion der Gegner: 319 Läufe mit `scenarios/reaktion.lua`, zuerst `dr_setup` (legt den Savestate `reaktion_w3` aus `ingame` an), dann die Teile `a`, `a3`, `a4`, `b`, `bp`, `bg`, `bn`, `c`, `d` (285 Läufe) und `dr` (33 Läufe der dritten Messung); Auswertung mit `messen_reaktion.py` nach `logs/reaktion.csv`; danach der Teil der Gegenprüfung, 66 Läufe mit `scenarios/reaktion_v_frei.lua` und `messen_reaktion_v.py belege` nach `logs/reaktion_v.csv`. Löscht danach die eigenen Rohdaten (`reaktion_m_*`, `reaktion_v_*`); `--nur-auswertung` wertet vorhandene Rohdaten aus. Braucht die Savestates `kontakt`, `kontakt_b`, `ingame`, `tiefe_b`, `anlauf`, `anlauf_b`, `anlauf_c` (~4,5 min) | ja: vor der dritten Messung beim Gegenprüfer dreimal von vorn (einmal ohne, zweimal mit seinem Teil), Exit 0; `reaktion.csv` jedes Mal bitgleich mit der Datei des Messagenten (MD5 `693f2f56ee6ec319a60daad64e64abac`), `reaktion_v.csv` in beiden Läufen mit seinem Teil gleich; mit der dritten Messung von vorn in 4 min 21 s, Exit 0 (`reaktion.csv` MD5 `3b606a30ce3e5516fac6731f64f1daf3`, `reaktion_v.csv` unverändert) |
| `messen_reaktion.py` | Auswertung der Abzüge von `reaktion.lua` (nur Standardbibliothek): `gegnerreaktion` (je Frame Zustand, Aktion/Phase, x/Höhe/Tiefe 16.16, LP, Animationszeiger und Attribut des Gegners, dazu Aktion, Animationszeiger, Kombostufe und LP der Figur), `treffer` (Dauer der Reaktion, Zittern, erste Bewegung, Ausholen, erster Angriff), `kette` (Lücke zwischen Reaktionsende und Folgestufe), `umwerfen` (Flug, Liegen, Aufstehen), `probe` und `griffprobe` (Einzelframe- und Griffproben relativ zu K und G eines Referenzlaufs), `mehrere` (mehrere getroffene Gegner, Trefferstopp), `tod`, `eckdaten` (K und G für das Belegskript) | ja: über `belege_reaktion.sh`; Ergebnisse vom Gegenprüfer mit eigener Auswertung nachgemessen |
| `messen_reaktion_v.py` | Auswertung der Gegenprüfung nur aus der Watch-CSV von `reaktion_v_frei.lua` (ohne RAM-Abzug): `treffer`, `zeitachse`, `reaktion`, `umwerfen`, `wurf`, `tod`, `probe`, `schlaege`, `griff`, `stopp`; `belege` wertet alle Läufe des Teils `reaktion_v` aus und schreibt `logs/reaktion_v.csv` | ja: über `belege_reaktion.sh`, zweimal mit gleichem Ergebnis, nach der dritten Messung unverändert |
| `messen_a5.py gegnerreaktion` | neuer Unterbefehl: je Frame Zustand, Aktion/Phase, x/Höhe/Tiefe, LP, Animationszeiger und Attribut eines Gegners (`--slot`, `--von`, `--bis`); delegiert an `messen_reaktion.py`, dort auch die weiteren Auswertungen | ja: Aufruf geprüft; dieselbe Funktion nutzt `belege_reaktion.sh` über `messen_reaktion.py gegnerreaktion` (`d_gleich_w`) |
| `belege_verhalten.sh` | 220 MAME-Läufe zum Verhalten von WOOKY und EDDY: 88 des Messagenten (`scenarios/verhalten.lua`, `verhalten_huelle.lua`, Bot mit `verhalten_bot.lua`), 76 der Gegenprüfung (Präfix `verhalten_v`, `verhalten_v_frei.lua`, `verhalten_v_bot.lua`) und 56 der dritten Messung (`verhalten_m3_*`). Auswertung mit `messen_verhalten.py` nach `logs/verhalten.csv` und mit `messen_verhalten_v.py` nach `logs/verhalten_v.csv`. Braucht die Savestates `ingame`, `anlauf`, `anlauf_b`, `anlauf_c`, `kontakt`, `kontakt_b`, `tiefe_b`, `stage1`, `held0`, `held2`, `held3`. Löscht am Anfang und am Ende `logs/raw/verhalten_*` (auch `verhalten_v_*`). `CC_JOBS` (parallele Läufe, Standard 6), `CC_BEHALTEN=1` (Rohdaten behalten), `CC_NUR_AUSWERTUNG=1` (nur auswerten). Etwa 15 min (Skriptkopf: 25 min), bis etwa 9 GB während des Laufs | ja: Teil des Messagenten (88 Läufe) vom Gegenprüfer von vorn wiederholt, `verhalten.csv` MD5-gleich; mit Gegenprüfung (164 Läufe) unverändert; Gesamtlauf (220 Läufe) Exit 0, `verhalten_v.csv` danach mit gleicher Zeilenzahl (1017; ein MD5 des Gegenprüfer-Stands fehlt). Die Endfassung von `verhalten.csv` ist erst einmal erzeugt |
| `messen_verhalten.py` | Auswertung des Messagenten, 17 Unterbefehle (`--help`): `zeitachse`, `aktivierung`, `annaeherung`, `angriffe`, `weglauf`, `tiefe`, `sprung`, `schutz`, `gruppe`, `wellen`, `dauern`, `uebergaenge`, `aktivitaet`, `katalog`, `schwelle`, `vergleich`, `zusammenfassung`. Liest RAM-Abzüge (`0xFFA900`–`0xFFEA00`, Kamera und Rang im Watch-CSV) und Bot-CSVs gleich; Zustand je Gegnerslot aus S+4/S+5, Modus S+0x0A und Animationskennung S+0x1C (Tabellen `ANIM`, `ANGRIFFE`) | ja (über `belege_verhalten.sh`) |
| `messen_verhalten_v.py` | Auswertung der Gegenprüfung, 14 Unterbefehle (`--help`): `anims`, `sichtbar`, `wecken`, `gehen`, `ankunft`, `angriffe`, `schutz`, `gruppe`, `wellen`, `kamera`, `reakt`, `sprung`, `tiefe`, `zusammenfassung`; eigene Tabelle der Angriffskennungen (`KENNUNG`) | ja (über `belege_verhalten.sh`) |
| `grafik/bot.lua` (Option `angriff`) | neue Option `angriff = false`: Der Bot ignoriert die Gegner (kein Ziel, kein Angriff), läuft nur nach rechts, wechselt bei Stillstand die Tiefe und springt. Standard `true`, das bisherige Verhalten bleibt. Gesetzt von `verhalten_bot.lua` (`CC_ANGRIFF=0`) | ja (`bot_ohne`, `bot_entfernt`) |
| `belege_greichweite.sh` | Reichweite der Gegnerangriffe: 565 Läufe des Messagenten mit `scenarios/rang.lua` um `scenarios/greichweite_angriff.lua` (Quellen je Angriff über `CC_AB`, Proben `CC_DX`, `CC_DZ`, `CC_H`, `CC_FERN*`, Vor-Eingriff `CC_VOR`; EINGRIFF Rang 12 und LP der Figur), dritte Messung (`W3*`, `E3*`, `lang3_*`), Auswertung mit `messen_greichweite.py gegnerangriff` und `gegnerzusammenfassung` nach `logs/greichweite.csv`. Am Ende Teil V (Gegenprüfung): 6 natürliche Läufe mit `scenarios/greichweite_v_frei.lua`, die 32 Savestates `greichweite_v_*` anlegen, und 272 Proben, Auswertung mit `messen_greichweite_v.py` nach `logs/greichweite_v.csv`. Braucht die Savestates `ingame`, `kontakt`, `kontakt_b`, `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`. Löscht am Anfang und am Ende `logs/raw/greichweite_*` (auch `greichweite_v_*`), deshalb muss Teil V am Ende stehen und darf kein anderer Lauf mit diesem Präfix parallel laufen. `PAR` parallele Läufe (Standard 8). Gesamtlauf 18:46 min | ja: Stand der ersten Messung (494 Läufe) vom Gegenprüfer zweimal wiederholt, `greichweite.csv` MD5-gleich; `greichweite_v.csv` im zweiten Lauf des Gegenprüfers und im Gesamtlauf der dritten Messung (Exit 0) MD5-gleich. Die Endfassung von `greichweite.csv` ist erst einmal erzeugt |
| `messen_greichweite.py` | Auswertung des Messagenten. `gegnerangriff PREFIX..`: je Angriff eines Gegners Beginn A (Animationszeiger S+0x1C), aktive Frames (S+0x24), Treffer (P+0x40 < P+0x42, Zeiger P+0x82), Abstand, Umwerfen, Nachlauf bis Stand oder Gehen und Ziel S+0x96; `--zeitachse` je Frame, `--start k:ANIM` nur der Angriff ab dem k-ten Wechsel auf ANIM (auch abgebrochene). `gegnerzusammenfassung CSV..`: je Angriffsart (natürliche Läufe) und je Quelle (Proben) Grenzen in x, Tiefe und Höhe, treffende Frames und das Abbruchfenster um S+0x96 | ja (über `belege_greichweite.sh`) |
| `messen_greichweite_v.py` | Auswertung der Gegenprüfung, Unterbefehle `zeitreihe`, `angriffe`, `uebersicht`, `nachlauf`, `serien`, `probe` (Treffer, leer oder Abbruch mit Prüfung, ob der Eingriff gegriffen hat, Spalte `gueltig`) und `fenster` (Abbruchfenster je Quelle relativ zu S+0x96) | ja (über Teil V von `belege_greichweite.sh`, zweimal mit gleichem Ergebnis) |
| `messen_a5.py` (Ergänzung) | Unterbefehle `gegnerangriff` und `gegnerzusammenfassung`: nur Registrierung, die Umsetzung steht in `messen_greichweite.py` | ja (Aufruf über `messen_a5.py` geprüft; `belege_greichweite.sh` ruft `messen_greichweite.py` direkt auf) |
| `belege_spezial.sh` | Spezialangriff: 498 Läufe mit `scenarios/spezial_probe.lua` (Abschnitt 0 Savestates, 1 Auslösung, 2 Ablauf, 3 Schutz, 4 Schaden und Flug, 5 Reichweite x/Tiefe/Höhe, 6 aktive Frames, 7 Kosten, 8 andere Figuren, 9 dritte Messung `d3_*`; Eingriffe `CC_SLOTS`, `CC_DX`, `CC_DZ`, `CC_DH`, `CC_FERN_BIS`/`CC_NAH_BIS`, `CC_WEG`, `CC_LP`) und Auswertung mit `messen_a5.py spezial` und `messen_spezial.py` nach `logs/spezial.csv`; danach Block „Gegenprüfung V4“: 361 Läufe mit `scenarios/spezial_v_frei.lua` und `messen_spezial_v.py` nach `logs/spezial_v.csv`. Legt die Savestates `spezial_*` an (siehe „Szenarien“), braucht `ingame`, `kontakt`, `kontakt_b`, `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`, `stage2`, `stage3`, `held0`, `held2`, `held3`; löscht danach die eigenen Rohabzüge (V4 maß vor Abschnitt 9: 493 s ohne, 724 s mit V4-Block; mit Abschnitt 9 laut Dateizeiten etwa 8 min ohne und 15 min mit V4-Block) | ja: mehrfach von vorn mit Exit 0, alle Savestates bitgleich neu (V4: 493 s bzw. 724 s mit V4-Block). `spezial.csv` vor der dritten Messung in drei Durchläufen bitgleich (MD5 `11b116a5…`); nach Ergänzung von Abschnitt 9 ein Durchlauf von vorn mit Exit 0 (MD5 jetzt `93c5a756…`, kein zweiter Durchlauf zum Vergleich dokumentiert). `spezial_v.csv` in zwei Durchläufen bitgleich bis auf die drei zuletzt ergänzten Läufe; der Durchlauf mit Abschnitt 9 schrieb sie mit derselben MD5 `c1abf3d2…` neu. Die Laufzeit im Kopfkommentar (~10–15 min) gilt für den M4-Teil nicht mehr genau (etwa 8 min) und nennt den V4-Block nicht |
| `messen_spezial.py` | Umsetzung der Unterbefehle `spezial` und `sprint` von `messen_a5.py`: Ereignisse je Lauf (Eingaben, Aktion und Status der Figur, Timer `FFAA69`, LP der Figur, Treffer auf Gegner und Gegenstände in Slot 20–59, Umwerfen, Ruhelage, Griff, Gegnerangriffe, Bewegung in und nach der Aktion); `--frames`: Bild der Animation und Lage jedes Gegners je Frame. Dazu `zusammenfassung-spezial`, `zusammenfassung-sprint` und `verdichtet` für die Belegdateien | ja (über `belege_spezial.sh` und `belege_sprint.sh`). Nach der Gegenprüfung ergänzt: Bewegung während der Aktion (`bewegung_in_aktion`); vorher sah `figur_bewegt` nur Bewegung nach dem Aktionsende und übersah, dass Mack sich im Spezialangriff bewegt |
| `messen_spezial_v.py` | Gegenprüfer V4 (Präfixe `spezial_v`, `sprint_v`), liest nur Watch-Protokolle: `ereignisse` (Aktion, Unterphase, Status, Timer `FFAA69`, LP der Figur, jeder LP-Verlust eines Objekts mit Typ und Lage, Ruhelage), `zeitachse` (je Frame Figur und nächste Objekte), `probe` (erster Treffer je Objekt, Abstände ohne Treffer), `tempo` (Geschwindigkeit der Figur je Abschnitt, 16.16) | ja: im V4-Block von `belege_spezial.sh` und in `belege_sprint.sh`, zwei volle Durchläufe (`spezial_v.csv` bitgleich bis auf die drei zuletzt ergänzten Läufe, `sprint_v.csv` bitgleich) |
| `messen_a5.py spezial` | Unterbefehl Spezialangriff: Ereignisse je Lauf (Aktion, Status, Timer `FFAA69`, Treffer, Umwerfen, Ruhelage, LP der Figur), `--frames` je Frame Bildnummer und Lage der Gegner; Umsetzung in `messen_spezial.py`. Gleichzeitig angemeldet: `sprint` (siehe Sprint) | ja (in `belege_spezial.sh`) |
| `belege_sprint.sh` | Sprint: 307 Läufe mit `scenarios/sprint_probe.lua` (Abschnitt 1 Eingabefenster `ew_*`, 2 Richtungen und Tempo `ri_*`, 3 Loslassen, Wechsel, neuer Sprint `rw_*`, 4 Sprintangriff `sa_*`, 5 Sprintsprung und Sprint-Sprungangriff `sj_*`, `sja_*`, 6 Griff und Spezialangriff aus dem Sprint `sg_*`, `sp_*`, 7 dritte Messung `d3_*`; Eingriffe `CC_SLOTS`, `CC_DX`, `CC_DZ`, `CC_FERN_BIS`/`CC_NAH_BIS`, `CC_VON`/`CC_BIS`, `CC_WEG`) und Auswertung mit `messen_a5.py sprint` (Ereignisse, `--frames --nach 20`, `--tempo`) und `messen_spezial.py zusammenfassung-sprint` nach `logs/sprint.csv`; danach Block „Gegenprüfung V4“: 180 Läufe mit `scenarios/sprint_v_frei.lua` und `messen_spezial_v.py` (`probe`, `tempo --bezug 0`, `ereignisse --ohne-bewegung`) nach `logs/sprint_v.csv`. Braucht die Savestates `ingame`, `kontakt`, `kontakt_b`, `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b` (`laeufe_a7.sh`), `stage1`, `stage2`, `stage3` (`scenarios/stage_start.lua`) sowie `spezial_drei` und `spezial_v_viele` aus `belege_spezial.sh` (geprüft werden nur die beiden letzten); löscht danach die eigenen Rohabzüge (vor Abschnitt 7: 149 s, mit V4-Block 303 s; mit Abschnitt 7 nicht gemessen) | ja: von V4 zweimal von vorn mit Exit 0 (149 s, mit V4-Block 303 s); `sprint.csv` vor Abschnitt 7 in drei Durchläufen bitgleich (MD5 `c16a94f1…`), `sprint_v.csv` in zwei vollen Durchläufen bitgleich (MD5 `8af4f226…`). Nach Ergänzung von Abschnitt 7 ein Durchlauf (`sprint.csv` jetzt MD5 `4f2b5e93…`, `sprint_v.csv` unverändert), kein zweiter zum Vergleich dokumentiert. Der Kopfkommentar nennt nur einen Teil der Savestates und noch ~5–10 min; die Kopfzeile von `sprint.csv` nennt die Eingriffe in `d3_sja13_*`, `d3_sjax_*` und `d3_tief_b` nicht (sie stehen nur im Skript) |
| `messen_a5.py sprint` | Unterbefehl Sprint (Doppeltipp), Sprintangriff, Sprintsprung: Ereignisse je Lauf wie `spezial` (Eingaben, Aktion, Treffer, Umwerfen, Flugweite, Griff, Bewegung) mit dem Sprint als Bezug (letzter Angriffsdruck, sonst Sprungdruck, sonst zweiter Richtungsdruck); `--tempo`: Bewegung der Figur je Abschnitt gleicher Aktion, Geschwindigkeit und Eingabe (16.16, mit Scheitel und Höhe vor dem Sprung, Bewegungsende am Rand); `--frames` (mit `--nach`): je Frame Lage der Gegner. Umsetzung in `messen_spezial.py` | ja (in `belege_sprint.sh`) |
| `messen_spezial.py` (Sprint-Teil) | `sprint` und `zusammenfassung-sprint EREIGNISSE FRAMES TEMPO`: Befunde je Lauf (Gruppen `ablauf`, `aktive_frames`, `reichweite_dx`, `reichweite_dz`, `tempo`, `dritte_sja13`, `dritte_sja_reichweite`) für den Kopf von `logs/sprint.csv`. Gemeinsame Datei mit dem Spezialangriff | ja (über `belege_sprint.sh`) |
| `messen_spezial_v.py` (Sprint-Teil) | Gegenprüfer V4, Präfix `sprint_v`: `probe --slot 17/18` (erster Treffer je Gegner mit Lage, Abstände ohne Treffer, Frames in der Nähe), `tempo --bezug 0` (Geschwindigkeit der Figur je Abschnitt, 16.16), `ereignisse --ohne-bewegung`. Gemeinsame Datei mit der Gegenprüfung des Spezialangriffs | ja: im V4-Block von `belege_sprint.sh`, `sprint_v.csv` in zwei vollen Durchläufen bitgleich |
| `belege_item.sh` | alle 486 Läufe für „Gegenstände und Waffen“ von vorn (etwa 14 min, `ITEM_PARALLEL` Läufe gleichzeitig, Standard 3). Teil A: Bot je Stage (`grafik/bot.lua` mit `scenarios/item_bot.lua`) mit Savestates. B: Waffen in der Bossarena aufnehmen (Savestates `item_hammer`, `item_laser`, `item_missile`). C: Einzelläufe mit `scenarios/item_frei.lua`. D: Auswertung mit `messen_item.py` nach `logs/item.csv`. V: Gegenprüfung (`scenarios/item_v_bot.lua`, `item_v_frei.lua`, Auswertung `messen_item_v.py` nach `logs/item_v.csv`). W: dritte Messung (`item_d_*`, an `logs/item.csv` angehängt). Eingriffe stehen je Lauf (`CC_POKES`, `CC_REL`, `CC_ZU`, `CC_LP`, `CC_ELP`, `CC_SETZE`, `CC_RANG`). Löscht danach die eigenen Rohabzüge, die Savestates `item_*` bleiben. Voraussetzung: Savestates `stage1` bis `stage9`, `ingame`, `anlauf_c` | ja: Teil A–D zweimal beim Messagenten und dreimal beim Gegenprüfer von vorn, `logs/item.csv` jedes Mal bitgleich (MD5 `574147291edef99ae2001c6eedaeefe1`). Letzter ganzer Lauf mit V und W ohne Fehler (14 min): `logs/item.csv` MD5 `f7d18ababf1709e03f7f40a5a4eeb111` (erste 755 Zeilen unverändert), `logs/item_v.csv` bitgleich (MD5 `c739e85610703b8fceda7d2e3f083b35`) |
| `messen_item.py` | Auswertung des Messagenten (Präfix `item`, auch `item_d`): `objekte` (Belegung der Slots 20–59 mit Gegenständen und Behältern: Art, Landung, Liegezeit, Ende), `nah` (Flag `FFAA08` mit Abstand zum Gegenstand), `aufnahme`, `waffe` (Waffeneinsätze, Geschossblöcke, Treffer, Verlust der Waffe), `punkte` (`FFAA74`), `reichweite` (Treffer je gesetztem Gegner), `nahsweep` (Aufnahmebereich), `griff` (Kniestoß und Wurf mit Waffe, für die dritte Messung ergänzt), `bot` und `botpunkte` (Bot-Protokolle aus `item_bot.lua`) | ja (über `belege_item.sh`) |
| `messen_item_v.py` | Auswertung des Gegenprüfers (Präfix `item_v`): `katalog` und `botpunkte` (Bot-Protokolle aus `item_v_bot.lua`), `aufnahme`, `behaelter` (Treffer, Angreifer-Slot, Inhalt), `liegen` (Liegezeit, Scrollen, Freigabe), `schuss` (Waffeneinsatz, Geschossblöcke, Treffer), `ziel` (erster Treffer je Zielslot), `griff`, `punkte`, `zeit` (Werte je Frame), `objekte` (belegte Slots in einem Frame) | ja (über `belege_item.sh`) |
| `belege_boss.sh` | Boss DOLG der Stage 1: 923 Läufe des Messagenten mit `scenarios/boss_frei.lua`, Laufliste als Kopf von `logs/boss.csv`. Teil Q (3 Läufe) legt die Savestates `boss_q_p`, `boss_q_r`, `boss_q_b`, `boss_q_m` an; A Start-LP nach Rang (18), B Treffer und Super-Armor mit Bot-Läufen (366), C Reaktion (37), D Angriffe und Reichweiten (121), E Rhythmus (8), F Wellen (18), G Fall (8), M dritte Messung (344, Abschnitte „# M …“). Auswertung mit `messen_boss.py belege` nach `logs/boss.csv`. Danach Teil V (Gegenprüfer V6, Präfix `boss_v`): 484 Läufe mit `scenarios/boss_v_frei.lua` und `scenarios/boss_v_bot.lua` (5 für Savestates, darunter zwei Bot-Läufe ab `ingame`; Teile A, B, P, D, DG, W, T, TS, TB, LI, U, AU, BOT), Auswertung `messen_boss_v.py belege` nach `logs/boss_v.csv`. Eingriffe stehen je Lauf (`CC_LP`, `CC_WEG`, `CC_RANG`, `CC_BSET`, `CC_FIG`, `CC_SSET`, `CC_BLP`, `CC_ENTF*`; Teil V `CC_SETZ`, `CC_FIGV`, `CC_FIGA`, `CC_FIGH`, `CC_BOSS`, `BV_BLP_MIN`, `BV_RANG`). Braucht die Savestates `p0_s1_s1_cam01536`, `p0_s1_s1_cam01793`, `p0_s1_s1_cam02048` (Phase 0), `item_missile`, `item_laser` (`belege_item.sh`), für Teil V `ingame` und `item_bot1_s1_cam02048`. Löscht am Anfang und am Ende die eigenen Rohdaten (`logs/raw/boss_[abcdefgmq]_*`, `boss_a2_*`, `snap/boss_[gm]_*`; Teil V `boss_v_*`), die Savestates `boss_q_*` und `boss_v_*` bleiben. `BOSS_JOBS` (Standard 8), `BOSS_V_JOBS` (Standard 4), `BOSS_BEHALTEN=1` behält die Rohdaten. Volllauf 21 min 3 s (Teil des Messagenten mit Teil M 801 s, Teil V 458 s). Der Kopfkommentar nennt noch etwa 10 min und rund 580 Läufe (Stand vor Teil M) sowie für Teil V etwa 8 min, der Kopf von Teil V etwa 6 min | ja: vor Teil M vom Gegenprüfer zweimal ganz von vorn (19 min 32 s und 16 min 47 s, Exit 0), `boss.csv` beide Male bitgleich mit dem Stand des Messagenten (MD5 `c4f6c794…`, 3442 Zeilen), `boss_v.csv` bitgleich (`06e9648e…`, 1508 Zeilen), die neu angelegten Savestates `boss_v_*` bitgleich. Dabei behoben: Zwei Savestates im selben Frame (5600) verdrängten sich, `boss_v_allein` kommt jetzt aus einem eigenen Bot-Lauf `boss_v_b1a`; seit dem Hinweis des Gegenprüfers löscht `aufraeumen` auch `boss_a2_*`. Mit Teil M zweimal von vorn, beim Messagenten (21 min 3 s) und in der Gegenprobe der Einarbeitung (`BOSS_JOBS=3`, `BOSS_V_JOBS=2`, 18 min 38 s), beide Male Exit 0: `boss.csv` MD5 `3a051470…` (4422 Zeilen) und `boss_v.csv` (`06e9648e…`) jeweils bitgleich |
| `messen_boss.py` | Auswertung des Messagenten (nur Standardbibliothek), liest die Watch-CSVs von `boss_frei.lua`: `zeitachse` (Boss-Slot und Figur je Frame, nur Wechsel), `lp` (Treffer, Rücksprung, Reaktion, Rückzug), `angriffe` (Art, A, aktive Frames, Schaden, Treffer, Nachlauf, Abstand), `rhythmus` (Abstände, Wahl nach Abstand und Rang), `wellen` (neue Gegner mit Boss-LP), `fall`, `start` (Start-LP, S+0x9A, S+0xB7 mit Rang), `probe` (Reichweite relativ zu A), `belege` (alle Läufe nach `logs/boss.csv`), `dritte` (nur die Abschnitte „# M …“). Angriffskennungen in `ANIM_*` | ja (über `belege_boss.sh`) |
| `messen_boss_v.py` | Auswertung des Gegenprüfers V6 (nur Watch-Protokolle von `boss_v_frei.lua` und Bot-Protokolle von `boss_v_bot.lua`): `zeit` (Werte je Frame), `treffer` (Schaden, Zurückweisung, Reaktion), `umwerfen` (Flug, Scheitel, Bodenkontakt, Weite, G, Trefferfläche), `zittern`, `figur` (LP-Verluste der Figur mit Angreifer-Slot und Lage zum Boss), `angriffe` (Beginn, A, Art, aktive Frames, Treffer), `belege` (alle Läufe von Teil V nach `logs/boss_v.csv`) | ja: im Teil V von `belege_boss.sh`, zweimal von vorn mit bitgleichem Ergebnis, in beiden Vollläufen mit Teil M unverändert |
| `belege_fern.sh` | Fernangriffe der Gegner (Messerwurf und Stichserie des SKIP, Pistole und Raketenwerfer des DICK) in drei Blöcken. Messagent M7 mit `scenarios/fern_frei.lua`, etwa 1100 Läufe: Teil 0 legt die Savestates `fern_sw9`, `fern_sw20`, `fern_sg9`, `fern_pw9`, `fern_pw20`, `fern_rw9`, `fern_rw20`, `fern_pz9` an, A natürliche Läufe (6000 bzw. 4000 Frames), B Trefferflächen (GESCH), C Abwehr (Schlag, Sprung, Gegner und zerbrechliche Objekte auf der Bahn), D Schaden je Rang 7–24, E Waffe des DICK beim Tod, F Erscheinen des Pistolen-DICK je Rang; Auswertung mit `messen_fern.py` nach `logs/fern.csv`. Block „Gegenprüfung V7“: Bot-Lauf `fern_v_bot1` (`scenarios/fern_v_bot.lua`, Savestate `fern_v_skip8`), natürliche Läufe und Proben mit `scenarios/fern_v_frei.lua` (358 Läufe), Auswertung `messen_fern_v.py belege` nach `logs/fern_v.csv`. Block „Dritte Messung M7“ (Präfix `fern_t`, 367 Läufe: 20 natürliche, 276 Proben `t_bm*`, `t_bk*`, `t_br*`, `t_kt_*`, 56 Läufe `t_z*` zur letzten Welle, `t_e_*`, drei Nachläufe von V7-Läufen mit `fern_v_frei.lua`) hängt die Abschnitte `## T …` an `logs/fern.csv` an. EINGRIFFE je Lauf, Kürzel im Skriptkopf (LP, RANG, DOLG, ENTF, LP27, LP25, PISTWEG, FEST, GESCH, TOET, TIEFE, RANGWECHSEL, HÖHE; V7: `CC_E`). Braucht die Savestates `p0_s1_s1_cam00768` und `p0_s1_s1_cam02048` (Bot-Lauf der Phase 0; kein Skript im Repo legt sie an), für V7 dazu `stage1`, für den Lauf `fern_a_gd` (fällt sonst weg) `greichweite_dick`. `FERN_PARALLEL` (Standard 3), `FERN_NUR_V=1` (nur Block V7, die dritte Messung entfällt dann), `FERN_BEHALTEN=1` (Rohdaten behalten, nötig für `messen_fern.py zeitachse`). Löscht danach die Rohdaten `fern_*`; die Savestates `fern_*`, `fern_v_*` und `fern_t_*` bleiben in `logs/raw/sta/captcomm`. Gesamtlauf 13 bis 22 min (je nach Last), bis etwa 3 GB in `logs/raw` (die Dauerangaben im Skript gelten je Block) | ja: nach dem Einbau der dritten Messung zweimal von vorn mit Exit 0 (22 min 23 s; 17 min 50 s, dazu nur der Abschnitt `E Bogen`). `logs/fern.csv` 4315 Zeilen, MD5 `bb1260429a9a366f82b18439017d6e2c`; ohne `E Bogen` bitgleich mit Lauf 1, die ersten 2802 Zeilen ohne `E Bogen` gleich dem Stand vor der dritten Messung (MD5 `7baee55ed275067e3656661114f5b34f`, beim Einarbeiten nachgerechnet). `logs/fern_v.csv` 1281 Zeilen, MD5 `b209e1f2b366e1eb0636a7d02162bc61`, gleich dem Volllauf von V7. Vorher beim Gegenprüfer ein Volllauf von Teil M7 und Block V7 (19 min, Exit 0, `fern.csv` bitgleich `7baee55e…`). Gegenprobe beim Einarbeiten: dritter Volllauf von vorn, Exit 0, 13 min 7 s, beide MD5 gleich |
| `messen_fern.py` | Auswertung des Messagenten und der dritten Messung (Präfixe `fern`, `fern_t`; nur Standardbibliothek). Liest die Abzüge `0xFFA900`–`0xFFEA00` und das Watch-CSV von `fern_frei.lua`; Geschoss = Objekt in Slot 20–59 mit S+0x6C auf einen SKIP oder DICK (ohne die gehaltene Waffe `0x9A988`), Treffer = P+0x40 < P+0x42 mit P+0x82 auf den Werfer. Unterbefehle: `geschosse` (je Geschoss Werfer, G, Startlage, Tempo, Flugende, Explosion, Ende, Treffer an Figur und Gegnern), `angriffe` (je Angriff von SKIP und DICK Beginn A, Art, Abstand, Schüsse, Ende, Nachlauf), `zeitachse PREFIX --slot N [--von --bis --alle]` (je Frame Animation, Aktion, Lage eines Slots), `abstand`, `rhythmus`, `waffe`, `erscheinen`, `probe` (k-tes Geschoss eines Laufs mit Eingriff, `--k`, `--werfer`), `zusammenfassung`; für die dritte Messung `ausloesung` (Zielpunkt und Abweichung), `salve` (Budget S+0xAB, Schüsse, Abbruch), `nachschuss` (Folgeaktion nach dem Schuss), `slots` (Belegung 27–29 vor G), `bahnende` (letzte Lage ohne Treffer), `welle` (letzte Welle, zweiter Raketen-DICK), `bogen` (Bogen der Waffe beim Tod, auch für `E Bogen`), `fenster` (Trefferfenster je Blick und Flugrichtung mit Prüfung der Regel) | ja (über `belege_fern.sh`; zwei Vollläufe gleich bis auf den neuen Abschnitt `E Bogen`) |
| `messen_fern_v.py` | Auswertung des Gegenprüfers V7 (Präfix `fern_v`, eigener Code, nur Standardbibliothek, Abzüge von `fern_v_frei.lua`): `skip` (Würfe und Stiche), `dick` (Salven und Raketen mit Abstand, Tiefenangleich, Ablauf, Treffern), `raketen`, `probe` (Einzelframe-Probe im Frame K), `bahn` (je Flugframe Abstand, Tiefe, Höhe der Figur und Treffer), `bahngegner` (Gegner im Trefferbereich), `tod` (Waffe des DICK beim Tod), `geschosse`, `treffer`, `anims`, `slots`, `zeit`; `belege` wertet alle Läufe `fern_v_*` in `logs/raw` aus, schreibt `logs/fern_v.csv` und löscht mit `--loeschen` die Rohdaten je Lauf | ja: im Block V7 von `belege_fern.sh`; `logs/fern_v.csv` im Volllauf von V7 und im letzten Gesamtlauf gleich (MD5 `b209e1f2…`) |
| `belege_rest.sh` | Rest der Spielfigur: alle MAME-Läufe von vorn und Auswertung nach `logs/rest.csv` und `logs/rest_v.csv`, zusammen 3066 Läufe. Teil A Nachlauf der Kettenstufen 2–4 (1234 Läufe mit `scenarios/rest_kette.lua`), B Sprungangriff hoch und runter (675, `scenarios/rest_sprung.lua`), C Gegner mit genau 0 LP (10, `rest_kette.lua` und `scenarios/rest_frei.lua`), D Tod und Neueinstieg der Figur (50, `rest_frei.lua`, teils als Hülle um `hurt*.lua`), E Rang beim Stage-Wechsel (2 Läufe legen die Savestates `rest_e_r8` und `rest_e_r24` an, dazu 5 Bot-Läufe mit `grafik/bot.sh` und `grafik/durchlauf.lua`), F Nachprüfungen (245: Mindestabstand, Blick links, Richtung beim Kettendruck, Treffer in der Luft, gleichzeitiger Treffer), M3 dritte Messung (201 Läufe `rest_m3_*`, eigene Gruppe am Ende von `rest.csv`), V Gegenprüfung V8 (641 Läufe mit `scenarios/rest_v_frei.lua`, 3 Bot-Läufe mit `scenarios/rest_v_bot.lua`, der Bot-Lauf `rest_v_e_boss` legt den Savestate `rest_v_e_vor` an; Auswertung `messen_rest_v.py belege`). Auswertung von A bis M3 mit `messen_rest.py`. EINGRIFFE stehen je Lauf im Aufruf und im Kopf jeder Tabelle (`CC_LEER`, `CC_DX`, `CC_DZ`, `CC_FERN`, `CC_ELP`, `CC_PLP`, `CC_RANG`, `CC_POKE`, `CC_SETZE`, `CC_VOR_DX`, `CC_WEG`, `CC_GBLICK`; bei V `CC_SETZE`, `CC_GLP`, `CC_PLP`, `CC_POKE`, `CC_RANG`). Braucht die Savestates `kontakt`, `kontakt_b`, `ingame`, `stage1`, `p0_s1_s1_cam02048`, `p0_s1_s2_cam00256` (A bis F), `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`, `stage3`, `held0`, `p0_s1_s1_cam00768`, `p0_s1_s1_cam01281`, `item_v_b1_s1_cam02016` (V) sowie `reaktion_w3`, `stage4`, `stage5`, `stage9`, neun `item_bot1_s1_cam*`, zwei `item_v_b1_s1_cam*` und fünf `greichweite_v_*` (M3); das Skript prüft sie am Anfang. Löscht am Anfang und am Ende `logs/raw/rest_*` (auch `rest_v_*`), die Savestates `rest_*` bleiben. `PAR` parallele Läufe (Standard 3) | ja: Stand des Messagenten vor der dritten Messung (Skript-MD5 `cf09d728…`) beim Gegenprüfer von vorn, Exit 0 in 1251 s, `rest.csv` bitgleich mit der Datei des Messagenten (MD5 `7c4b537127c15678edc3bef80b863031`); mit Teil V von vorn Exit 0 in 1094 s (PAR 3), `rest.csv` wieder bitgleich, `rest_v.csv` 1861 Zeilen (MD5 `793f6f9282995911deb5ddd0b482b688`). Gesamtlauf mit Teil M3 und V von vorn: Exit 0 in 28 min 48 s (PAR 3, Rechner mitbelegt), `rest.csv` MD5 `6b202b9fdd8d460e436cfc593fd05e02` (2617 Zeilen, erst einmal erzeugt), `rest_v.csv` unverändert. Der Kopfkommentar nennt die Liste der M3-Savestates `M3_STATES`, im Skript heißt die Liste der Todesstellen `M3_TOD` (die Prüfliste steht in der Schleife am Anfang); die Dauer im Kopf (etwa 22 min, mit Teil V etwa 30 min) ist eine Schätzung |
| `messen_rest.py` | Auswertung des Messagenten und der dritten Messung (Präfix `rest`, nur Standardbibliothek). Liest die Abzüge `FFA900`–`FFEA00` von `rest_kette.lua`, `rest_sprung.lua` und `rest_frei.lua` und die Watch-CSV (Rang `FFF82A`, Zähler `FFF82C`, Stage `FFA8CE`, Kamera `FFA82E`/`FFA830`); D aus `<lauf>_meta.txt`. 13 Unterbefehle (`--help`): `zeitachse` (je Frame Figur und ein Gegner, `--slot`, `--von`, `--bis`), `nachlauf` und `nachlauf-zusammenfassung` (A: Treffer der letzten Stufe, Ruhe, Wirkung jeder Folgeeingabe, frühester angenommener Angriff und Sprung, erste Bewegung), `sprung` und `sprung-zusammenfassung` (B, F2: Probeframe, Höhe, Abstand, Treffer, Schaden, Umwerfen; aktive Frames und Grenzen je Gruppe), `nulllp` (C), `tod` (D: Ablauf, Neueinstieg, Lage, Rang, Leben, Landung, Schutz, Treffer der Landung, Eingaben, Gegner bis zum Erscheinen), `stagewechsel` (E: Rang beim Wechsel des Stage-Index aus Bot- oder Watch-CSV), `probe` (F: erster Treffer der letzten Stufe mit dx, dz und Blick, `--bis`), `richtung` (F3), `gegentreffer` (F4, F5), `todesart` (dritte Messung D1: Angreifer, Attribut, Reaktion in t, Todesflug, Stopp an einer Begrenzung außer den Bildkanten, Aktion 8, Rollen, Neueinstieg und Klasse nach der Regel), `grenzen` (dritte Messung F1: `probe`-Ausgabe je Gruppe als Grenzen in dx) | ja (über `belege_rest.sh`) |
| `messen_rest_v.py` | Auswertung des Gegenprüfers V8 (Präfix `rest_v`, nur Standardbibliothek). Liest nur die Watch-Protokolle von `rest_v_frei.lua` und die Bot-Protokolle von `rest_v_bot.lua`, keinen Abzug. Unterbefehle (`--help`): `zeit` (Zeitachse eines Laufs, Figur und gewählte Slots), `treffer` (alle LP-Verluste eines Laufs mit Abstand und Angreifer), `teil` (CSV je Teil: `a`, `b`, `c`, `d`, `e`, `probe`, `f3`, `f3a`, `f5`, `f6`), `belege` (alle Läufe `rest_v_*` nach `logs/rest_v.csv`) | ja: Teil V allein (Testhülle mit denselben Funktionen) Exit 0 in 361 s, 1845 Zeilen (damals ohne die Ereigniszeilen der Bot-Läufe); im Belegskript `rest_v.csv` bis auf die 16 Ereigniszeilen zeilengleich und im Gesamtlauf mit Teil M3 unverändert (MD5 `793f6f92…`) |

Ablauf:

```sh
cd research/captcomm
/usr/games/mame -verifyroms captcomm -rompath ../../roms   # meldet nur ioc1.ic7, s. o.
scripts/run.sh scripts/scenarios/attract.lua
scripts/run.sh scripts/scenarios/coin_start.lua          # legt Savestate "ingame" an
scripts/run.sh scripts/scenarios/walk.lua ingame
python3 scripts/ramtools.py info logs/raw/walk
scripts/laeufe_a5.sh && scripts/belege_a5.sh             # alle Läufe und Belege für Aufgabe 5
```

Rohdaten landen in `logs/raw/` und sind git-ignoriert (ein 90-s-Vollabzug
hat etwa 350 MB). Im Repo stehen unter `logs/` nur kurze, kommentierte
Ausschnitte, auf die diese Notizen verweisen.

Zeitbezug: Alle Frame-Angaben sind **lokale Frames des Runners** (1 = erster
Frame-Callback nach Skriptstart). Zum Gegenprüfen steht in jeder Zeile
zusätzlich die MAME-interne Screen-Frame-Nummer. Eine Eingabe, die das
Szenario für Frame f vorsieht, setzt der Runner im Callback von Frame f−1.
Sie ist also während Frame f aktiv. Gemessen (Aufgabe 5): Das Spiel
reagiert ab Frame f+1 (Laufen, Schlag, Sprung), die Eingabelatenz beträgt
also 1 Frame. Eingaben für Frame 1 eines Laufs kann der Runner nicht setzen
(es gibt keinen Callback davor); sie wirken erst ab Frame 2.

Geprüft mit MAME 0.264: Beim Kaltstart gilt lokaler Frame = Screen-Frame + 1
(Frame 1 hat Screen-Frame 0). Ein Savestate ist vor dem ersten Callback
geladen. Die Screen-Frame-Spalte setzt dann die des speichernden Laufs
lückenlos fort: `ingame` wird in Frame 2400 (Screen 2399) von `coin_start`
gespeichert, Frame 1 von `walk`/`attack` hat Screen 2400. Lokaler Frame f ab
`ingame` entspricht also Frame 2400 + f des Kaltstarts.

## Szenarien (kalibriert 2026-10-01, ergänzt 2026-10-02)

Grundlage sind Snapshots alle 10 bis 300 Frames (nur lokal unter
`logs/raw/snap/`). Alle Frame-Angaben in dieser Tabelle sind **unsicher**
(±Snapshot-Abstand) und dienen nur der Szenario-Planung, nicht als Messwert.
Das gilt nicht für die Zeilen ab `reaktion`: Sie stammen aus den Nachträgen
vom 2026-10-02, ihre Frames sind in den Belegskripten kalibriert und in den
Nachträgen belegt.

| Szenario | Ablauf und Beobachtung |
|---|---|
| `attract` | Ohne Eingabe: Warnbildschirm (~300–600), Intro, Titel (~1200), danach Demo-Kämpfe mit wechselnden Figuren und Stages sowie Figurenvorstellungen (Captain ~2100, Ginzu ~3300, Mack ~4500). |
| `coin_start` | Münze bei 600 wird noch während des Warnbildschirms gezählt („CREDIT 1“). Start bei 700 öffnet die Figurenwahl (~720, Countdown). Der Cursor steht anfangs auf Feld 1 (Mack the Knife). **Ein Druck nach rechts (800–803) wählt Captain Commando**, die Bestätigung bei 900 greift. Stage 1 ist ab ~1380 steuerbar, die Figur steht bis 2400 allein am linken Rand. Savestate `ingame` bei 2400. |
| `walk` | ab `ingame`. **Referenzfigur ist Captain Commando.** Erste Fassung (lange rechts zuerst) war unbrauchbar: Nach ~120 Frames Rechtslauf scrollt die Kamera, ein Gegner erscheint (~180) und greift ab ~540 an. Neue Reihenfolge: hoch 61–100, runter 161–200, rechts 261–300, links 361–400, rechts+hoch 461–480, links+runter 541–560. Laut Snapshots kein Gegner und kein Scroll. |
| `attack` | ab `ingame`: Leerschläge bei 61, 181, 301, dann rechts 421–540 (der Gegner „WOOKY“ erscheint rechts), hoch 541–556, Schläge alle 8 Frames ab 561. Ohne den Tiefenabgleich gehen alle Schläge vorbei, weil der Gegner ~16 px höher läuft (Schatten im Snapshot). Mit Abgleich: erste Treffer ~590–600, Gegnerbalken im HUD, Punkte 0 → 10 → … → 140, Abschlusstritt ~640–660 schleudert den Gegner weg, ~690 ist sein HUD-Symbol durchgestrichen (besiegt). Ab da gehen die Schläge ins Leere. |
| `jump` | ab `ingame`: Sprung im Stand (61), Sprung nach vorn (181, rechts 181–210), Sprung mit Angriff (301, Angriff 315). Kein Gegner in der Nähe. |
| `hurt` | ab `ingame`: rechts 61–180 löst den Gegner aus, danach keine Eingabe. Der Gegner packt und schlägt die Figur (~450–575), wirft sie (575), sie liegt und steht auf, ab ~1000 kommen weitere Gegner. Bis 1500 sinken die LP auf 0. |
| `walk_b`, `jump_b`, `attack_b`, `hurt_b` | Gegenläufe mit anderen Startframes, Dauern und Reihenfolgen (Einzelheiten im Kopf der Dateien). `attack_b`: Gegner erscheint ~364, Kette trifft bei 402–455. `hurt_b`: erster Treffer 422, Wurf 544. |
| `combo_c` | wie `attack`, danach weiter nach rechts zum nächsten Gegner (pink, 30 LP). Rechtslauf bis 885 und 15 Frames hoch lassen ihn in die Kette laufen (Treffer 903–952). Läuft die Figur bis 900, geht er an ihr vorbei und wird bei Kontakt gepackt statt geschlagen. |
| `hurt_c` | wie `combo_c` bis 900, danach keine Eingabe: andere Gegner als in `hurt`, Schaden 5, 6 und 8. |
| `reaktion` | ab `kontakt` (WOOKY, 16 LP, Slot 18, steht 46 px vor der Figur, holt ohne Eingabe in Frame 19 aus und trifft in 28) bzw. `kontakt_b` mit `CC_SLOT=17` (EDDY, 30 LP, geht bis 13 heran, steht ab 14 bei 45 px, holt in 35 aus und trifft in 44; der WOOKY in Slot 16 wird in 13 aktiv), für die dritte Messung ab `reaktion_w3` und `tiefe_b`. Angriffsdrücke `CC_DRUECKE` (je 2 Frames; Stufe 1 trifft in P+2, Folgestufen in D+3/D+4/D+3), freie Eingaben `CC_IN`, Länge `CC_FRAMES`, Savestate `CC_SAVE`/`CC_SAVE_NAME`. **Eingriffe**: `CC_LP` (LP und Vorframe-LP, darüber auch Max-LP), `CC_DX`/`CC_DZ` mit `CC_POKE_VON`/`CC_POKE_BIS` und `CC_FERN_BIS`/`CC_NAH_BIS` (Einzelframe-Probe), `CC_SLOT2`/`CC_DX2`/`CC_DZ2`/`CC_POKE2_VON`/`CC_POKE2_BIS`/`CC_LP2` (zweiter Gegner). Abzug nur `FFA900`–`FFEA00` (`CC_DUMP_VON`/`CC_DUMP_BIS`), Rang nie verändert. |
| `reaktion_v_frei` | Gegenprüfung der Trefferreaktion mit freien Eingaben `CC_IN` ab `anlauf` bzw. `anlauf_b` (WOOKY, 16 LP, Slot 18, läuft aus 111 px heran, steht ab 40 bei dx 46/dz 10, holt in 61 aus und trifft in 70) und `anlauf_c` (EDDY, 30 LP, Slot 17, läuft aus 105 px heran, steht ab 38 bei dx 47/dz 0, holt in 59 aus und trifft in 68; mit rechts 2–15 steht der WOOKY aus Slot 16 ab etwa 135 bei dx 55/dz 1 hinter dem EDDY). Protokoll nur über das Watch-Feld (Figur, Kombostufe, Rang, Kamera, je Gegnerslot Zustand, Aktion, Phase, x/Höhe/Tiefe 16.16, Animation, Attribut, Typ, LP, Blick, Schaden), kein Abzug. Optionale **Eingriffe** `CC_LP` (nur in `b_tritt_w`), `CC_SETZE` und `CC_RANG` (in den Belegläufen nicht benutzt). |
| Savestate `reaktion_w3` | legt `belege_reaktion.sh` (Lauf `dr_setup`) aus `ingame` an: rechts 421–548 (8 Frames länger als in `attack`), hoch 549–564, gespeichert in Frame 590; der Rang steigt dabei planmäßig von 9 auf 10. Der WOOKY (Slot 18, 16 LP) geht heran, steht ab Frame 11 bei dx 47/dz 7, holt ohne Eingabe in 32 aus und ist in 41 aktiv (langsamer Schlag). Die EDDY-Läufe der dritten Messung starten aus `tiefe_b` mit 8 Frames hoch (2–9): Standpose ab 28 bei dx 46/dz 8. |
| `verhalten` | Lange Läufe des Messagenten ab Savestate (`anlauf`, `anlauf_b`, `anlauf_c`, `kontakt`, `kontakt_b`, `tiefe_b`, `ingame`, `stage1`, in der dritten Messung auch `held0` und `held3`; `held2` nur über `verhalten_bot`) mit eingeschränktem Abzug `0xFFA900`–`0xFFEA00`; Kamera `FFA82E`/`FFA830`, Stage, Rang und Rangzähler im Watch-CSV. Eingaben frei (`CC_IN`) oder als Muster ab `CC_AB` (`CC_MUSTER`: `passiv`, `weg_l`, `weg_r`, `tiefe`, `sprung`). **EINGRIFFE**: LP der Figur auffüllen (`CC_LP`, Standard an), Gegner relativ zur Figur setzen (`CC_GDX`, `CC_GDZ`, `CC_GSLOT`, `CC_GBIS`), Rang festhalten (`CC_RANG`), Gegner entfernen (`CC_ENTF`, `CC_ENTF2`), Gegner-x := Kamera-x + k in 1-px-Stufen (`CC_KSTUFEN`), LP der Gegner := 1 (`CC_GLP`). Kalibriert (Figur passiv): `anlauf` WOOKY steht ab Frame 40 bei dx 46, dz +10, erster Angriff W-A in 61, Treffer 70; `anlauf_c` EDDY steht ab 38 bei dx 47, dz 0, Angriff E-A in 59, Treffer 68; `stage1` mit Rechtslauf ab Frame 2: Weckreiz 109, kampffähig 125 |
| `verhalten_huelle` | Hülle um ein anderes Szenario (`CC_BASIS`, z. B. `hurt.lua`, `hurt_b.lua`, `hurt_c.lua`) für die Gruppenläufe `c_hurt*`: gleiche Eingaben, Laufzeit `CC_FRAMES` (hier 4000), Abzug und Watch-CSV wie `verhalten`. **EINGRIFF**: LP der Figur auffüllen (`CC_LP`, Standard an) |
| `verhalten_bot` | Konfiguration für `grafik/bot.lua` (Start über `grafik/bot.sh` ab `stage1` bzw. `held*`): Stage 1 mit dem Durchlauf-Bot für Gruppen und Wellen. `CC_ANGRIFF=0` setzt `angriff = false` (Bot läuft nur nach rechts, es stirbt kein Gegner). **EINGRIFFE**: LP der Figur immer aufgefüllt; `CC_CLEAR` (LP der Gegner im Bild := 1 nach so vielen Frames Kamerastillstand, Standard 900, 1 = sofort, 0 = nie), `CC_KILL` (Gegner bei Stillstand per S+4 := 0 entfernen). Alle Bot-Eingriffe stehen in `<CC_NAME>_events.txt`; Watch-Spalten je Gegnerslot 0–19 |
| `verhalten_v_frei` | Gegenprüfung: freier Runner ab beliebigem Savestate, alles über Umgebungsvariablen (ohne Variablen 3000 Frames ohne Eingabe). `CC_IN` feste Eingaben; `CC_REAKT` Reaktion auf einen nahen, stehenden Gegner (Bedingungen `CC_REAKT_N`, `_PAUSE`, `_AB`, `_TYP`, `_SEITE`, `_NACH`, `_ANIM`; jede Auslösung in `<CC_NAME>_reakt.txt`). **EINGRIFFE** nur wenn gesetzt: `CC_RANG`, `CC_LP`, `CC_SETZ` (Gegner relativ zur Figur), `CC_KAM` (Gegner-x := Kamera-x + k), `CC_ENTF` (S+4 := 0). Abzug `0xFFA900`–`0xFFEA00`. Kalibriert: `stage1` mit Rechtslauf 150–300: Weckreiz versteckter WOOKY Frame 257, EDDY 732, hockender WOOKY 1035; `anlauf` WOOKY steht ab Frame 39, `anlauf_c` EDDY ab 37 |
| `verhalten_v_bot` | Gegenprüfung: Konfiguration für `grafik/bot.lua` (ab `held0` bzw. `stage1`), Bot greift die Gegner an bis zum Stagewechsel. `VV_FRAMES` (Standard 16000), `VV_CLEAR` (Standard 0: kein Eingriff an Gegnern), `VV_ANGRIFF`. **EINGRIFF**: LP der Figur aufgefüllt. Watch-CSV je Slot 0–19 mit Status, S+5, Typ, Position, LP, Max-LP, Modus, Animationszeiger, Trefferattribut und Weckreiz S+0x0D |
| `stage_start` (Savestates `stage1`, `held0`, `held2`, `held3`) | `belege_verhalten.sh` braucht neben den Savestates aus Aufgabe 5 und den Nachträgen auch `stage1` (Stage 1, Captain Commando, Standard `CC_SAVE` 1400) und `held0`, `held2`, `held3`: `CC_FIGUR=0`, `2` bzw. `3`, `CC_SAVE=2400`, `CC_SAVE_NAME=held<N>`, also wie `ingame`, aber mit Mack, Ginzu bzw. Baby Head. **EINGRIFF** laut Kopf: In der Figurenwahl wird der Stage-Index `FFA8CE` gesetzt (für Stage 1: 0) |
| `greichweite_angriff` | Angriffe eines Gegners gegen die passive Figur, ab `kontakt` (WOOKY Slot 18, für `WS3R` der zweite WOOKY in Slot 16), `kontakt_b` (EDDY Slot 17, WOOKY Slot 16, SKIP Slot 18), `ingame` (Eingaben wie `hurt_c`, SKIP Slot 18) und für die dritte Messung auch `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`; immer über `rang.lua`. Bis zum Angriffsbeginn A (k-ter Wechsel des Animationszeigers S+0x1C auf die erste Angriffsanimation, `CC_AB`) läuft alles natürlich, der Gegner wählt seinen Angriff selbst. **EINGRIFFE**: LP der Figur vor jedem Frame auf 72 (`CC_LP`), Figur vor dem Angriff relativ zum Gegner (`CC_VOR`, `CC_VOR_DX`, `CC_VOR_DZ`, `CC_VOR_SLOT`), ab A+`CC_VON` Position, Tiefe oder Höhe der Figur (`CC_DX`, `CC_DZ`, `CC_H`), mit `CC_FERN=n` bis A+n 200 px weg (mit `CC_FERN_H`, `CC_FERN_DZ`, `CC_FERN_DX` stattdessen hoch, in der Tiefe versetzt oder an anderer Stelle). Kalibriert (Rang 12, nur `CC_LP`): ab `kontakt` WOOKY-Schlag A in Frame 19 und 77, Umwerfschlag A in 137; ab `kontakt_b` EDDY-Schlag A in 31, Umwerfschlag in 289. Eine Figur außerhalb des Bildes schiebt das Spiel im selben Frame zurück |
| `greichweite_bot` | Konfiguration für `grafik/bot.lua` (kein Runner-Szenario, Start über `grafik/bot.sh stage1`): Der Durchlauf-Bot spielt Stage 1 bis in die Bossarena. **EINGRIFFE** wie `grafik/durchlauf.lua`: LP der Figur jeden Frame auf 72, nach 900 Frames ohne Kamerafortschritt LP der Gegner im Bild auf 1 (einmal, Frame 6001, ein WOOKY der Bossarena). DICK erscheint in Frame 6002 in Slot 18. Legt die Savestates `greichweite_dick` (Frame 6010) und `greichweite_dick2` (6200) an. Ein Lauf mit passiver Figur ab dort zeigte keinen Schuss, weil DOLG die Figur ständig umwirft |
| `greichweite_v_frei` | Gegenprüfung: freier Lauf ab beliebigem Savestate, Eingaben über `CC_IN` (Kurzformen l r u d a j), Savestates über `CC_SAVE` (nur Präfix `greichweite_v`). **EINGRIFFE**: LP der Figur vor jedem Frame auf 72 (`CC_LP`, Standard an), Rang (`CC_RANG`), in den Proben die Figur relativ zum Gegner (`CC_POKE`, `CC_DX`, `CC_DZ`, `CC_PH`; `CC_WER=gegner` setzt stattdessen den Gegner; zweites Fenster `CC_POKE2`, `CC_DX2`, `CC_DZ2`, `CC_PH2`). Die natürlichen Läufe `n1`, `n4` bis `n8` ab `ingame` (3000 bis 9000 Frames) legen 32 Savestates `greichweite_v_*` je 3 Frames (`wa_r20`, `eb_r20`: 20 Frames) vor einem natürlich gewählten Angriff an; die Proben setzen die Figur ab A+1 bis A+37 |
| Savestates `greichweite_dick`, `greichweite_dick2` | aus `greichweite_bot.lua`: Bossarena von Stage 1, DICK (Typ `0x64E7A`) in Slot 18, Frame 6010 bzw. 6200 des Bot-Laufs. Von `belege_fern.sh` für den Lauf `fern_a_gd` genutzt (4000 Frames, ohne Rang- und DOLG-Eingriff; fehlt der Savestate, entfällt nur dieser Lauf). Die Messung von Pistole und Rakete steht im „Nachtrag: Fernangriffe der Gegner“ |
| Savestates `greichweite_v_*` (32) | aus Teil V von `belege_greichweite.sh` (`n1`: `w1r`, `w1l`, `wa_r`, `wa_r20`, `wb_l`, `wk2_r`; `n4`: `wa_l`, `wc_l`, `wk2_l`, `wb_r`, `ek2_r`, `eb_l`, `ek1_l`, `sm_l`, `smw_l`; `n5`: `eb_r`, `eb_r20`, `wc_r2`; `n6`: `wk1_l`, `wk1_r`, `ek1_r`, `sm_r`, `sa_r`, `sw_r`, `sm_l2`; `n7`: `wc_r`, `ea_l`, `ek2_l`, `ea_r`, `ek1_l2`; `n8`: `ea_r2`, `ek1_r2`), je 3 bzw. 20 Frames vor einem Angriff von WOOKY, EDDY oder SKIP; Teil V legt sie bei jedem Lauf neu an |
| `spezial_probe` | ab beliebigem Savestate (`kontakt`, `kontakt_b`, `ingame`, `spezial_*`): freie Eingaben `CC_IN` (ein Eintrag ohne Endframe wie `3:…` gilt für zwei Frames, 3 und 4), Länge `CC_FRAMES`, kleiner RAM-Abzug `CC_KLEIN=1` (`0xFFA900`–`0xFFEA00`), Savestate `CC_SAVE`. **Eingriff** (gekennzeichnet): Gegnerlage relativ zur Figur je Slot `CC_SLOTS`/`CC_DX`/`CC_DZ` (Nachkomma 0), Höhe `CC_DH` (Eingriffe in den Frames `CC_VON` bis `CC_BIS`, danach Höhe 0), Einzelframe-Proben `CC_FERN_BIS`/`CC_NAH_BIS` (sonst 200 px entfernt), andere Gegner 300 px beiseite `CC_WEG`, eigene LP `CC_LP`. Kalibriert: Angriff und Sprung im selben Frame P ergeben ab P+1 die Aktion 0x14; ab `kontakt` schlägt der WOOKY (Slot 18) ohne Eingabe in Frame 28 und 90 zu, ab `kontakt_b` der EDDY (Slot 17) in Frame 44. `sprint_probe.lua` ist dasselbe Szenario für den Sprint |
| `spezial_v_frei` | Gegenprüfer V4, unabhängig von `spezial_probe.lua` geschrieben: freie Eingaben `CC_IN`, Länge `CC_FRAMES`, protokollierte Slots `CC_SLOTS` (Standard 0–19, für Gegenstände 20–59), nur Watch-Protokoll (Figur, Timer `FFAA69`/`FFAA61`, Figur `FFAA34`, Rang, je Slot Zustand, Lage, LP, Typ S+0x38, Attribut, Aktion), Savestate `CC_SAVE`. **Eingriff** (gekennzeichnet): `CC_SETZE` (Lage eines Slots relativ zur Figur in Frames von..bis), `CC_P_LP` (eigene LP), `CC_G_LP` (LP eines Gegners), `CC_RANG`, `CC_POKE` (beliebige Adresse, hier Timer `FFAA69`). `sprint_v_frei.lua` ist eine Hülle darum |
| `spezial_h0` bis `spezial_h3` | legt `belege_spezial.sh` an: ab `held<k>` dieselbe Annäherung wie `kontakt` (rechts 421–540, hoch 541–556), Savestate in Frame 612: Figur k, WOOKY (16 LP) 46 px vor ihr. `spezial_h1` ab `ingame` (Captain, Vergleich) |
| `spezial_drei`, `spezial_drei_h0/h2/h3` | `spezial_drei` ab `kontakt` (rechts 2–280, Frame 286), `spezial_drei_h0` ab `spezial_h0` (ebenso), `spezial_drei_h2/h3` ab `spezial_h2/h3` (rechts 2–360, Frame 366): drei aktive Gegner in Slot 16, 17, 18. In `spezial_drei_h2/h3` belegen zerschlagene Kisten Objekt-Slots, eine Kiste liegt in Slot 46. `belege_sprint.sh` braucht `spezial_drei` |
| `spezial_h2_anlauf`, `spezial_h3_anlauf` | dritte Messung: ab `held2`/`held3` wie `anlauf` (rechts 421–540, Frame 570), der WOOKY läuft heran (Ginzu, Baby Head) |
| `spezial_v_viele`, `spezial_v_viele0/2/3` | Gegenprüfer V4: ab `ingame` bzw. `held<k>`, rechts 2–330, Frame 840: fünf Gegner um die Figur, Blick links |
| `spezial_v_h0/h2/h3` | Gegenprüfer V4: ab `held<k>`, rechts 2–121, Frame 130: der WOOKY läuft aus 149 px heran (dz 16) |
| `sprint_probe` | Hülle um `spezial_probe.lua` (dieselben Variablen) unter dem Präfix `sprint`: freie Eingaben `CC_IN`, z. B. Doppeltipp `2-3:p1_right;6-60:p1_right` (erster Druck 2 Frames, Pause 2 Frames, zweiter Druck gehalten), Länge `CC_FRAMES`, kleiner Abzug `CC_KLEIN=1`. **Eingriff** (gekennzeichnet): Gegnerlage relativ zur Figur `CC_SLOTS`/`CC_DX`/`CC_DZ`, Einzelframe-Proben `CC_FERN_BIS`/`CC_NAH_BIS`, Zeitraum `CC_VON`/`CC_BIS`, andere Gegner und Kisten 300 px beiseite `CC_WEG`. Kalibriert ab `ingame`: Sprint (Aktion 0x02) ab dem Frame nach dem zweiten Druck. Ab `tiefe_b` und `anlauf_b` liegen Kisten in Slot 46 und 47; ab `tiefe_b` trifft der Sprint-Sprungangriff ohne Eingriff an den Kisten dort in A+20 eine Kiste (Trefferstopp verschiebt die späteren Frames) |
| `sprint_v_frei` | Gegenprüfer V4: Hülle um `spezial_v_frei.lua` (freie Eingaben, nur Watch-Protokoll). **Eingriff** (gekennzeichnet) nur in den Proben: `CC_SETZE` (Gegner nur im geprüften Frame bei dx/dz, sonst 200 px rechts der Figur). Läufe ab `stage2`, `stage3`, `anlauf`, `anlauf_c`, `tiefe_b`, `ingame` und `spezial_v_viele`; kalibrierte Frames stehen bei den Läufen in `belege_sprint.sh`. Ab `anlauf_c` trifft der Sprint-Sprungangriff (A=J+25) in A+28 eine Kiste (Slot 46) |
| `item_bot` | Konfiguration für `grafik/bot.lua` (Start über `grafik/bot.sh`, nicht über `runner.lua`): Durchlauf-Bot je Stage. Protokolliert je Frame die Slots 0–19 (Zustand, Typ, LP, Max-LP) und 20–59 (Zustand, Typ, Art, Munition, x, Höhe, Tiefe, Liegezeit; Typ jeweils nur als unteres Wort S+0x3A, etwa `0x5F9C` für `0x95F9C`), dazu `FFAA09`, `FFAA41`, `FFAA08`, LP und Punkte. Die Punkte stehen dort nur als `FFAA76` (untere vier Stellen); eine Änderung über eine Zehntausendergrenze ist in `botpunkte` daher falsch. Savestates je 64 px Kamerafortschritt (`item_bot1_s1_cam*`), darunter `item_bot1_s1_cam01281` (bei den Ölfässern) und `item_bot1_s1_cam02048` (Betreten der Bossarena: DOLG zerschlägt in Frame 18 die Geldkassetten). Über `GFA_SAVE_AT` in festen Frames: `item_s3_0e`, `item_s6_22`, `item_s7_04`, `item_s7_0e`, `item_s7_00`, `item_s7_2c`, `item_s8_2c`, `item_s8_2a`, `item_s8_24` (ein Gegenstand dieser Art liegt) und, für die dritte Messung neu, `item_s3_mardia` (Stage 3, Frame 1200, MARDIA in Slot 14). EINGRIFFE: LP der Figur aufgefüllt, Gegner-LP nach 900 Frames ohne Kamerafortschritt auf 1 |
| `item_frei` | freies Szenario des Messagenten und der dritten Messung (Präfixe `item`, `item_d`); Eingaben und Eingriffe kommen aus Umgebungsvariablen, die Läufe stehen in `belege_item.sh`. `CC_IN` (Eingaben), EINGRIFFE `CC_POKES` (Wert an Adresse, Spieler- oder Slot-Offset), `CC_REL` (Slot relativ zur Figur setzen), `CC_ZU` (Figur auf einen Slot setzen); `CC_SAVE`, `CC_SNAPS`, `CC_DUMP`. Abzug `FFA900`–`FFEA00` je Frame, Kamera und Rang im Watch-CSV. Kalibriert ab `item_bot1_s1_cam01281`: rechts 2–60, runter 61–185, links 186, Schlag ab 190 trifft Fass 43 in 192; der Raketenwerfer erscheint in 193 in Slot 50 und landet in 241 (x 1520, Tiefe 172). Danach Fass 44 von rechts: Brathähnchen erscheint 273, landet 322 (x 1480, Tiefe 184). Der Mech (Slot 59) erscheint in Frame 39 bei x 1780 und greift ab etwa 470 an. Ab `item_bot1_s1_cam02048`: Geldkassetten in Frame 18 zerschlagen, MISSILE in Slot 44 (x 2352, Tiefe 232), LASER in Slot 53 (x 2320, Tiefe 208), HAMMER in Slot 58 (x 2384, Tiefe 200), alle gelandet in 66; zwei WOOKY (28 LP) in Slot 16 und 17 kommen von links |
| `item_v_bot` | Konfiguration des Gegenprüfers für `grafik/bot.lua`: Stage 1 ab `ingame` (nicht `stage1`), Savestates je 96 px Kamerafortschritt (`item_v_b1_s1_cam*`) und in festen Frames (`IV_SAVES`): `item_v_b1_f2880` (Ausgangslage für Fass 43), `item_v_s2_huhn`, `item_v_s3_shuriken`, `item_v_s5_laser2`, `item_v_s6_tendon`, `item_v_s6_mis_b`, `item_v_s6_24`, `item_v_s7_gun`, `item_v_s7_mgun`, `item_v_s7_hammer`, `item_v_s7_cherry`, `item_v_s8_cherry`, `item_v_s8_2a`. Protokolliert `FFAA08`, `FFAA09`, `FFAA0A`, `FFAA41`, LP, Punkte `FFAA74` (4 Byte), je Slot 20–59 Typ, Art, Zustand, Position, Liegezeit, Munition, je Slot 0–19 Typ und LP. EINGRIFFE: LP der Figur aufgefüllt, Gegner-LP nach 600 Frames ohne Kamerafortschritt auf 1 (`IV_CLEAR`) |
| `item_v_frei` | freies Szenario des Gegenprüfers (Präfix `item_v`): `CC_IN` („a-b:taste+taste“), Abzug `FFA900`–`FFEA00`, Rang, Kamera und Stage im Watch-CSV. EINGRIFFE `CC_LP` (LP der Figur), `CC_ELP` (LP, Vorframe-LP und Max-LP eines Gegners), `CC_SETZE` (Gegner oder Objekt relativ zur Figur), `CC_XY`, `CC_HALT`, `CC_RANG`. Mit `CC_SAVE` legt es Savestates mit Gegenstand an: `item_v_mis_liegt` (Raketenwerfer aus Fass 43 liegt), `item_v_mis` (Raketenwerfer in der Hand), `item_v_s5_las` (Laser, Stage 5; zwei Gegner während der Aufnahme weggesetzt), `item_v_s7_ham`, `item_v_s7_g`, `item_v_s7_mg` (Hammer, GUN, M-GUN in Stage 7) |
| Savestates `item_hammer`, `item_laser`, `item_missile` | Bossarena von Stage 1 mit der jeweiligen Waffe in der Hand, angelegt von `item_save_*` mit `item_frei.lua` ab `item_bot1_s1_cam02048` (EINGRIFF: DOLG auf x 2700). Ausgangslage aller Reichweiten des Messagenten und der dritten Messung |
| Savestates `p0_s1_s1_cam00256` bis `p0_s1_s1_cam02048`, `p0_s1_s2_cam00256` (Phase 0) | Bot-Lauf der Einrichtung (Phase 0) von Auftrag 2 durch Stage 1 ab `stage1` (`CC_NAME=p0_s1 GFA_CFG=scripts/grafik/durchlauf.lua GFA_SAVE_CAM=256 … scripts/grafik/bot.sh stage1`; Laufprotokoll, Eintrag „Einrichtung Auftrag 2“). **EINGRIFF** beim Anlegen: LP der Figur aufgefüllt, bei Stillstand LP der Gegner auf 1. Je 256 px Kamerafortschritt ein Savestate (Namen mit führenden Nullen, z. B. `cam00768`, `cam01281`, `cam01536`, `cam01793`, `cam02048`). `p0_s1_s1_cam00768` liegt laut Name bei Kamera-x 768 (SKIP), `p0_s1_s1_cam02048` ist die Bossarena (DOLG in Slot 19, LP 110, S+0x9A = 72, Rang 16; zwei WOOKY erscheinen in Frame 3 in Slot 16 und 17), `p0_s1_s2_cam00256` der Beginn von Stage 2. Kein Belegskript im Repo legt sie an (beim Einarbeiten geprüft); sie liegen nur lokal in `logs/raw/sta/captcomm`. Gebraucht von `belege_boss.sh` (`p0_s1_s1_cam01536`, `p0_s1_s1_cam01793`, `p0_s1_s1_cam02048`), `belege_fern.sh` (`p0_s1_s1_cam00768`, `p0_s1_s1_cam02048`; der Kopf von `logs/fern.csv` nennt sie) und `belege_rest.sh` (`p0_s1_s1_cam00768`, `p0_s1_s1_cam01281`, `p0_s1_s1_cam02048`, `p0_s1_s2_cam00256`); Grundlage der Nachträge „Boss“, „Fernangriffe der Gegner“ und „Rest der Spielfigur“ |
| `boss_frei` | Boss DOLG der Stage 1, Messagent und dritte Messung (Präfix `boss`; nie `boss_v`). Ab Savestates der Bossarena (`p0_s1_s1_cam02048`, `boss_q_b`, `boss_q_p`, `boss_q_r`, Teil M meist `boss_q_m`), für Teil A auch ab `p0_s1_s1_cam01536` und `p0_s1_s1_cam01793`, für Rakete und Laser ab `item_missile` und `item_laser`. Freie Eingaben `CC_IN`, einfacher Angreifer-Bot `CC_BOT=angriff` (`CC_BOT_AB`, `CC_BOT_TAKT`, `CC_BOT_KETTE`), Bezugsframe A über `CC_AB` (n-ter Wechsel des Animationszeigers S+0x1C des Bosses), Savestates `CC_SAVE` (nur `boss_*`), Aufnahmen `CC_SNAPS`. Protokoll nur über das Watch-CSV (Figur, Boss-Slot 19 mit Trefferfläche S+0x28, Schutzzähler S+0xAE und S+0xB7, alle Gegnerslots kurz). **EINGRIFFE**: `CC_LP` (LP der Figur vor jedem Frame auf 72, Standard an), `CC_RANG`/`CC_RANG2`, `CC_WEG` (Slots ab Frame 2 bei Kamera-x − 250 gehalten, mit `neu` auch jeder später erscheinende Gegner), `CC_ENTF`/`CC_ENTF2` (S+4 := 0), `CC_BLP` (LP des Bosses), `CC_GLP`, `CC_FIG` (Figur relativ zum Boss), `CC_BSET` (Boss relativ zur Figur), `CC_SSET` (anderer Slot), `CC_BX`. Kalibriert (ab `p0_s1_s1_cam02048`, Figur passiv, `CC_WEG=16,17,neu`): Der Boss bricht in Frame 1–61 aus dem Tresor und geht ab 62; erster Armschwung A = 157 (Treffer auf die Figur in 174, 212, 249). Mit dem Boss 50 px vor der Figur (`CC_BSET="62-63:50:0"`) beginnt er in 66 den kurzen Schlag, bei 49 px und weniger packt er die Figur in 63 |
| `boss_v_frei` | Gegenprüfer V6 (Präfix `boss_v`), unabhängig von `boss_frei.lua` geschrieben: freie Eingaben `CC_IN`, Bezugsframe A über `CC_A` (k-ter Wechsel eines Felds des Bosses, A in `<CC_NAME>_a.txt`), Savestates `CC_SAVE` (nur `boss_v_*`), Bildschirmfotos `CC_SNAP`; nur Watch-CSV (RAM-Abzug mit `CC_DUMP=1`). **EINGRIFFE** nur wenn gesetzt, außer `CC_LP` (Standard an): `CC_LP`, `CC_RANG`, `CC_BLP`, `CC_FIG`, `CC_FIGV` (in Blickrichtung des Bosses), `CC_FIGA` (relativ zur Lage der Figur in A), `CC_FIGH` (Höhe), `CC_BOSS` (Boss relativ zur Figur), `CC_SETZ` (absolute Lage), `CC_ENTF`, `CC_POKE`. Kalibriert: ab `boss_v_b1_s1_cam01984` mit Rechtslauf ab Frame 2 erreicht die Kamera 2048 in Frame 39, LP und Max-LP des Bosses stehen ab 40 (ab `boss_v_b1_s1_cam01920` mit hoch 2–20 und rechts ab 21: 95 bzw. 96). Ab `boss_v_allein` mit der Figur bei x 2250 (Frame 2, Rang 12): erster Ansturm in 57 (Lauf ab 77), erster Armschwung in 381, erste Körperpresse in 1474 |
| `boss_v_bot` | Gegenprüfer V6: Konfiguration für `grafik/bot.lua` (Start über `grafik/bot.sh`, nicht über `runner.lua`). Der Durchlauf-Bot spielt Stage 1 bis in die Bossarena bzw. kämpft dort gegen den Boss. `BV_FRAMES` (Standard 9000), `BV_SAVE_CAM` (Savestate je N px Kamerafortschritt, Name `<CC_NAME>_s<Stage>_cam<x>`), `BV_SAVE_AT` (feste Savestates, nur `boss_v_*`). **EINGRIFFE**: LP der Figur immer aufgefüllt, `BV_CLEAR` (LP der Gegner im Bild nach so vielen Frames Stillstand auf 1, Standard 0), `BV_RANG`, `BV_BLP_MIN`/`BV_BLP` (LP des Bosses unter dem Grenzwert zurückgesetzt), `BV_WEG` (andere Gegner entfernt). Watch-Spalten: Rang, Figur, Boss in Slot 19 (Zustand, Aktion, Phase, Lage, LP, Animation, Attribut, S+0x28, S+0xAE, S+0xB7, S+0x9A, Typ) und je Slot 0–18 Zustand, Typ und LP |
| Savestates `boss_q_p`, `boss_q_r` | legt `belege_boss.sh` (Lauf `q_quelle`, passiv ab `p0_s1_s1_cam02048`, EINGRIFF `CC_WEG=16,17,neu`) in Frame 800 bzw. 1240 an: kurz vor einer Körperpresse (A in Frame 8) bzw. einem Ansturm (Ausholen in 10, Lauf ab 30) |
| Savestate `boss_q_b` | zweite Arena-Ausgangslage des Messagenten: ab `p0_s1_s1_cam01793` 40 Frames hoch (2–41), warten, dann rechts (250–600), gespeichert in Frame 620. Der Boss erwacht dort in Frame 397, Rang 16, 110 LP |
| Savestate `boss_q_m` | Ausgangslage der dritten Messung: ab `p0_s1_s1_cam01536` mit Rang 20 (EINGRIFF `CC_RANG`), 23 Frames runter (2–24), dann rechts (25–330), gespeichert in Frame 371. Der Boss erwacht in Frame 311 mit 110 LP, steht in Tiefe 208 (sonst 156), schaut nach links und geht ab 372 |
| Savestates `boss_v_b1_s1_cam*`, `boss_v_allein` | Gegenprüfer V6, aus `boss_v_bot.lua`: Bot-Lauf `boss_v_b1` ab `ingame` (5605 Frames, `BV_CLEAR=900`, hier nicht ausgelöst; LP der Figur aufgefüllt) mit Savestates je 64 px Kamerafortschritt (`boss_v_b1_s1_cam00256` bis `boss_v_b1_s1_cam02112`); er erreicht die Arena bei Rang 16 (110 LP). `boss_v_allein` aus dem gleichen zweiten Bot-Lauf `boss_v_b1a` in Frame 5600: beide Arena-WOOKY besiegt, Boss 97 von 110 LP, Kamera 2112. Teil V legt alle bei jedem Lauf neu an (im zweiten Lauf bitgleich) |
| Savestates `boss_v_rakete`, `boss_v_laser`, `boss_v_r9` | Gegenprüfer V6, mit `boss_v_frei.lua`: `boss_v_rakete` ab `boss_v_b1_s1_cam01984` (Raketenwerfer aus der Arena aufgenommen, Frame 148); `boss_v_laser` ab `item_bot1_s1_cam02048` (Arena-WOOKY entfernt, EINGRIFF; Laser selbst aufgenommen, Frame 108); `boss_v_r9` ab `boss_v_b1_s1_cam01984` (Rang 9 und Arena-WOOKY entfernt, EINGRIFF; Boss 100 LP, Frame 300). Teil V legt sie bei jedem Lauf neu an (im zweiten Lauf bitgleich) |
| `fern_frei` | Freies Szenario des Messagenten und der dritten Messung (Präfixe `fern`, `fern_t`) ab beliebigem Savestate; die Läufe stehen in `belege_fern.sh`. Eingaben `CC_IN` („von-bis:taste\|taste;…“), Länge `CC_FRAMES`, Abzug `FFA900`–`FFEA00` je Frame (`CC_DUMP`, `CC_DUMP_AB`), Kamera, Rang, Rangzähler und Stage im Watch-CSV, Savestates `CC_SAVE`, Snapshots `CC_SNAPS`, Eingabe-Bot `CC_HIN` (die Figur geht periodisch auf einen Slot zu; Eingabe, kein Eingriff). **EINGRIFFE**: `CC_LP` (LP der Figur 72), `CC_RANG`, `CC_POKES` (Adresse, Spieler- oder Slot-Offset), `CC_REL` (Slot relativ zur Figur), `CC_ZU` (Figur relativ zu einem Slot), `CC_FEST` (Figur auf Welt-x und Tiefe), `CC_HOEHE`, `CC_ENTF` (Gegner eines Typs per S+4 := 0 entfernen), `CC_ENTF_SLOT`; ausgelöst: `CC_AB`/`CC_AB_ZU` (Figur relativ zum Gegner ab Angriffsbeginn), `CC_GESCH` (Figur ab dem Erscheinen eines Geschosses G relativ zu ihm), `CC_GESCH_GEGNER` (Gegner oder Objekt relativ zum Geschoss) |
| Savestates `fern_sw9`, `fern_sw20`, `fern_sg9`, `fern_pw9`, `fern_pw20`, `fern_rw9`, `fern_rw20`, `fern_pz9` | legt Teil 0 von `belege_fern.sh` mit `fern_frei.lua` an (SKIP ab `p0_s1_s1_cam00768`, DICK ab `p0_s1_s1_cam02048`, mit den Eingriffen des jeweiligen Laufs `fern_0_*`). Kalibriert (Frames ab Savestate): `fern_sw9`/`fern_sw20` SKIP wirft in A 36 bzw. 46, Messer G 44 bzw. 54 bei x 961, fliegt nach links, Figur bei x 900 (FEST bis zum Speichern); `fern_sg9` Gruppe (2 WOOKY, 2 EDDY, SKIP), Messer G 45 bei x 1235 (nach links); `fern_pw9`/`fern_pw20` Pistolen-DICK in Slot 18, Salve ab A 14 bzw. 22, Kugeln G 20, 37, 54, 71 bzw. 28, 45, 62, 79 ab x 2162 (nach rechts); `fern_rw9`/`fern_rw20` Raketen-DICK in Slot 13 bzw. 10 (bei Rang 20 ein zweiter in Slot 13), Rakete G 19 bzw. 17 ab x 2172 (nach rechts); `fern_pz9` Pistolen-DICK (18) und Raketen-DICK (13), Kugeln G 30, 47, 64, 81 |
| Savestates `fern_t_sw`, `fern_t_sw2`, `fern_t_pw`, `fern_t_pw2`, `fern_t_pw3`, `fern_t_rw`, `fern_t_rw2` | dritte Messung, angelegt im Block „Dritte Messung M7“ von den natürlichen Läufen `t_sf1000`, `t_sf880`, `t_pl22`, `t_p14`, `t_m22`, `t_rr14`, `t_r24`: `fern_t_sw` SKIP links, Messer nach rechts (A 10, G 18), Figur fest auf x 1000, Rang 14; `fern_t_sw2` SKIP rechts, Messer nach links (A 10, G 18), Figur x 880, Rang 17; `fern_t_pw` Pistolen-DICK rechts, Kugel nach links (A 18, G 24), Figur x 2110, Rang 22; `fern_t_pw2` Pistolen-DICK links, Kugel nach rechts (A 16, G 22), Rang 14; `fern_t_pw3` Salve mit Budget S+0xAB = 120 (A 13, 8 Schüsse nach rechts), Rang 22, EDDY der letzten Welle leben; `fern_t_rw` Raketen-DICK rechts, Rakete nach links (A 13, G 19), Figur x 2330, Rang 14; `fern_t_rw2` Raketen-DICK links, Rakete nach rechts (A 14, G 20), Rang 24 |
| `fern_v_frei` | Gegenprüfer V7 (Präfix `fern_v`), unabhängig von `fern_frei.lua` geschrieben: freier Lauf ab beliebigem Savestate, Eingaben `CC_IN` („namen:von-bis,…“, Kurzformen l r u d a j), Länge `CC_FRAMES`, Savestates `CC_SAVE` (nur Präfix `fern_v`), Abzug `0xFFA900`–`0xFFEA00` (`CC_DUMP`, `CC_EVERY`), Rang, Rangzähler, Kamera und Stage im Watch-CSV. **EINGRIFFE**: `CC_LP` (Standard an), `CC_RANG`, `CC_E` mit `fig` (Figur relativ zu einem Slot oder zum jüngsten Geschoss `g`), `obj` (Slot relativ zur Figur), `pos`, `spos`, `entf`, `glp`, `hoch`, `frac0`. Ein Geschoss außerhalb der begehbaren Tiefe prallt ab, deshalb liegt es in den Proben vor dem Probeframe 40 px in der Tiefe versetzt. Auch für die drei Nachläufe `fern_t_v7_*` der dritten Messung |
| Savestates `fern_v_m1a`, `fern_v_m1`, `fern_v_m2`, `fern_v_m3a`, `fern_v_m3`, `fern_v_k1`, `fern_v_k2`, `fern_v_k3`, `fern_v_r1a`, `fern_v_r1`, `fern_v_r2` | legt der Block V7 aus seinen natürlichen Läufen an (`s_nat`, `s_mov`, `s_r12`, `p_r12`, `p_r22`, `z_r12`). Kalibriert: `fern_v_m1a` SKIP (Slot 18, Rang 11) wirft in A 12, Messer G 20 bei x 853 nach links, Figur x 792 schaut zum SKIP, Treffer G+8 (vorn 29); `fern_v_m1` dasselbe 18 Frames später (Messer G 2); `fern_v_m2` Messer G 2 bei x 1277 nach links (Rang 21), Figur x 1215 schaut weg; `fern_v_m3a`/`fern_v_m3` SKIP links (Rang 12), Messer G 20 bzw. 2 bei x 1104 nach rechts; `fern_v_k1` Pistolen-DICK (Slot 18, Rang 12), Salve ab A 10, Kugeln G 16, 33, 50, 67 nach links (NNUN), Figur x 2110 schaut zum DICK; `fern_v_k3` wie `k1` (NUNU), Figur schaut weg; `fern_v_k2` DICK links (Rang 22), Salve A 10 nach rechts (NNUN), Figur x 2245; `fern_v_r1a` Raketen-DICK (Slot 13, Rang 12) A 10, Rakete G 16 nach links, Einschlag x 2353 in G+20; `fern_v_r1` Rakete G 2; `fern_v_r2` Rakete G 2 nach rechts (Einschlag x 2269) |
| `fern_v_bot` (Savestate `fern_v_skip8`) | Gegenprüfer V7: Konfiguration für `grafik/bot.lua` (Start über `grafik/bot.sh stage1`, Lauf `fern_v_bot1`, nicht über `runner.lua`). Der Durchlauf-Bot spielt Stage 1 bis zum SKIP; der SKIP erscheint in Frame 637 in Slot 18 (Kamera 770). `fern_v_skip8` (Frame 700, Rang 8): Figur x 1027, SKIP x 1074, zwei WOOKY (24 LP) in Slot 16/17. `FV_FRAMES`, `FV_SAVES` (nur Präfix `fern_v`), `FV_CAM`; Watch je Slot 10–19 Typ (unteres Wort), Zustand, LP. **EINGRIFFE** wie `grafik/durchlauf.lua`: LP der Figur aufgefüllt, nach 900 Frames ohne Kamerafortschritt LP der Gegner im Bild auf 1 |
| `rest_kette` | Kette des Messagenten (Präfix `rest`, Grundlage `kette.lua`) bis Stufe `CC_STUFE` mit Folgeeingaben relativ zum letzten Kettendruck D (`CC_NACH`, Tasten l r u d a j, z. B. „a:20“), dazu `CC_IN` (absolute Frames), erster Druck `CC_P1` (Standard 3), Druckabstand nach dem Treffer der Vorstufe `CC_ABSTAND` (Standard 14, `CC_ABSTAND_LETZT` nur für den letzten Druck), Richtung mit dem letzten Kettendruck `CC_DRUCKDIR`. Ab `kontakt` (WOOKY, Slot 18) bzw. `kontakt_b` (EDDY, `CC_SLOT=17`), in der dritten Messung ab `reaktion_w3` und `tiefe_b`. **EINGRIFFE**: `CC_LEER` (Gegner ab dem Treffer der Vorstufe 200 px rechts der Figur: Leerschlag), `CC_DX`, `CC_DZ`, `CC_FERN`, `CC_POKE_BIS`, `CC_POKE_VON`, `CC_VOR_DX` (Lage des Gegners wie in `kette.lua`), `CC_GBLICK` (Blickrichtung des Gegners, S+0x5E Bit 0x20), `CC_ELP` (LP und Vorframe-LP des Gegners). Schreibt `<CC_NAME>_meta.txt` (Druckframes, D, Stufe, Slot); Abzug nur `FFA900`–`FFEA00`. Kalibriert: mit `CC_P1=3` und `CC_ABSTAND=14` ist D = 3, 19, 36, 54 für Stufe 1 bis 4 (Treffer 5, 22, 40, 57) |
| `rest_sprung` | Sprungangriff des Messagenten mit Einzelframe-Proben (Grundlage `sprungangriff.lua`, kleiner Abzug): Sprungdruck `CC_J`, Angriffsdruck `CC_A`, Richtung nur im Frame des Sprungdrucks `CC_DIR` (u = hoch, l/r = Richtung), Richtung mit dem Angriff `CC_ADIR` (d = runter), weitere Eingaben `CC_IN` (z. B. „l:2“ dreht die Figur nach links). **EINGRIFF**: Gegner vor jedem Frame relativ zur Figur (`CC_DX`, `CC_DZ`, Zeitraum `CC_VON`/`CC_BIS`), nur im Probeframe T in Reichweite (`CC_FERN_BIS` = T−1, `CC_NAH_BIS` = T, sonst 200 px), weitere Slots 300 px rechts (`CC_WEG`), `CC_ELP`. Kalibriert: Ab `kontakt` schlägt der WOOKY ohne Eingriff in Frame 28 zu (bei J = 4 ist die Figur dann in der Luft), ab `kontakt_b` wird der WOOKY aus Slot 16 in Frame 13 aktiv (daher `CC_WEG=16`). Im Probeframe geht der Gegner weiter, vorn liegt er am Frame-Ende etwa 2 px näher als gesetzt |
| `rest_frei` | freie Eingaben (`CC_IN`) oder Hülle um ein anderes Szenario (`CC_BASIS`, z. B. `hurt_c.lua`; dessen Eingaben bleiben, Snapshots und Vollabzug entfallen), Laufzeit `CC_FRAMES`, Savestate `CC_SAVE` (nur Präfix `rest_`), Abzug `FFA900`–`FFEA00` (ab `CC_DUMP_AB`), Watch-CSV mit Rang `FFF82A`, Zähler `FFF82C`, Stage `FFA8CE`, Kamera `FFA82E`/`FFA830`. **EINGRIFFE** nur wenn gesetzt: `CC_SETZE` (Gegner relativ zur Figur), `CC_ELP`, `CC_PLP` (LP der Figur), `CC_RANG`, `CC_POKE` (beliebige Adresse). Kalibriert: ab `ingame` stirbt die Figur ohne Eingriff mit `hurt.lua` in Frame 1508 (Landung nach dem Neueinstieg L = 1681) und 2608, mit `hurt_b.lua` in 1855 und 3623, mit `hurt_c.lua` in 1741 (L = 1946) und 3063; mit `hurt_b.lua` erscheint die Figur nach dem ersten Tod in Frame 1976 bei x 914, Tiefe 304. Ab `kontakt` ist der WOOKY-Schlag in Frame 28 und 90 aktiv, ab `kontakt_b` der EDDY-Schlag in 44 und 121 (Figur passiv). Ab `tiefe_b` mit der Figur per EINGRIFF bei x 930 bzw. 960 und Tiefe 340 endet der Todesflug an der Stage-1-Wand bei x um 1016, in Tiefe 320 nicht |
| `rest_v_frei` | Gegenprüfer V8 (Präfix `rest_v`), unabhängig von den Szenarien des Messagenten geschrieben: freier Lauf ab beliebigem Savestate, Protokoll nur über das Watch-Feld (Figur mit Zustand, Aktion, Unterphase, Lage, Animation, LP, Blick, Angreiferzeiger P+0x82, Kombostufe, Timer `FFAA61`/`FFAA69`, Leben `FFAA7C`, Rang, Rangzähler, Stage, Kamera; je Slot aus `CC_SLOTS` Zustand, Aktion, Phase, Lage, Animation, Attribut, Typ, LP, Blick), kein Abzug. Zeitangaben absolut oder relativ zu Ereignissen im selben Lauf („EREIGNIS#k+n“: `lpN` LP-Verlust von Slot N, `plp` LP-Verlust der Figur, `tot` LP der Figur unter 0, `land` Landung, `hoch` Erscheinen nach dem Neueinstieg, `stage` Stage-Wechsel). Eingaben `CC_IN` („VON[..BIS]:tasten“), Laufzeit `CC_FRAMES`, Savestate `CC_SAVE` (nur Präfix `rest_v`). **EINGRIFFE** nur wenn gesetzt: `CC_SETZE` (Slot relativ zur Figur), `CC_GLP` (LP und Vorframe-LP eines Slots, nur unter den Max-LP: ein Eingriff auf S+0x9A = 7 ließ das Spiel beim nächsten Treffer stehen), `CC_PLP`, `CC_RANG`, `CC_POKE`. Läufe ab `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`, `p0_s1_s1_cam00768`, `p0_s1_s1_cam01281`, `item_v_b1_s1_cam02016` und `rest_v_e_vor` |
| `rest_v_bot` | Gegenprüfer V8: Konfiguration für `grafik/bot.lua` (Start über `grafik/bot.sh`, nicht über `runner.lua`). Der Durchlauf-Bot spielt eine Stage bis zum Stage-Wechsel und endet 60 Frames nach der Steuerbarkeit in der nächsten Stage. `RV_FRAMES` (Obergrenze, Standard 20000), `RV_SAVE` („frame:name“, nur Präfix `rest_v`). Zusätzliche Spalten im Bot-Protokoll: Rang `FFF82A`, Rangzähler `FFF82C`, Leben `FFAA7C`. **EINGRIFFE** von `bot.lua` (in `<CC_NAME>_events.txt`): LP der Figur jeden Frame auf 72, nach 900 Frames ohne Kamerafortschritt LP der Gegner im Bild auf 1. Läufe ab `item_v_b1_s1_cam02016`, `stage3` und `held0` |
| Savestates `rest_e_r8`, `rest_e_r24` | legt `belege_rest.sh` (Teil E, Läufe `rest_e_setz8`, `rest_e_setz24` mit `rest_frei.lua`) ab `p0_s1_s1_cam02048` an: **EINGRIFF** Rang 8 bzw. 24 und Rangzähler `FFF82C` = 3000 in Frame 2 bis 5, gespeichert in Frame 8 (Bossarena von Stage 1). Von dort spielt der Bot bis zum Stage-Wechsel |
| Savestate `rest_v_e_vor` | legt der Bot-Lauf `rest_v_e_boss` (Teil V, ab `item_v_b1_s1_cam02016`) in Frame 1950 an: Bossarena von Stage 1 kurz vor dem Stage-Wechsel, der von dort ohne Eingabe in Frame 70 kommt. Teil V legt ihn bei jedem Lauf neu an |
| `kontakt`, `kontakt_b` | legen die Savestates `kontakt` (Frame 612 der `attack`-Annäherung ohne Schläge: Gegner mit 16 LP steht 46 px entfernt und trifft sonst bei Frame 28) und `kontakt_b` (Frame 900 von `combo_c`: Gegner mit 30 LP läuft heran) an. |
| `schlag` | ab `kontakt`/`kontakt_b` (bzw. `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`): Einzelschlag ab `CC_PRESS`, optional zweiter Druck `CC_PRESS2`, Laufen (links) ab `CC_WALK` und vor dem Schlag `CC_VERT` Frames hoch (> 0) bzw. runter (< 0). |
| `sprung_c`, `sprung_d` | ab `ingame`: je 6–7 Sprünge ohne Gegner, mit Rückwärtssprung, Richtung nur vor bzw. nur nach dem Sprungdruck, Richtung in der Luft, Tiefe in der Luft (auch erst nach dem Scheitel), Tastendauer 1 und 40 Frames. |
| `anlauf_b`, `anlauf_c` | Savestates `anlauf_b` (Weg von `attack_b`, Gegner 16 LP läuft heran) und `anlauf_c` (Weg von `combo_c` mit Rechtslauf nur bis 860: Gegner 30 LP läuft aus 105 px heran). `kontakt` legt zusätzlich `anlauf` an (Frame 570), `kontakt_b` zusätzlich `tiefe_b` (Frame 886: Gegner 30 LP steht 62 px entfernt, 16 px weiter hinten). |
| `leerschlag` | ab `ingame`: Schlag ins Leere ab `CC_PRESS` (Standard 61), optional `CC_PRESS2`, Laufen (rechts) ab `CC_WALK`. |
| `schutz_eingriff` | **Eingriff**: wie `hurt`, aber der Aufsteh-Timer `FFAA69` wird ab 697 auf 0 gezwungen (`CC_MODE=null`) bzw. bis 830 auf 35 gehalten (`halten`). |

**Determinismus** (gesichert, je zwei Läufe): `attract`, `walk` und
`attack` erzeugen bei gleichen Eingaben bitgleiche RAM-Abzüge (MD5 über die
ganze `_ram.bin` identisch). Folge für die Methodik: Ein zweiter Lauf mit
denselben Eingaben belegt nur den Determinismus und ist **kein**
unabhängiger Gegenlauf. Für „gesichert“ muss der zweite Lauf die Eingaben
variieren, etwa durch andere Startframes, andere Dauer oder eine andere
Position.

## Vorgehen je Größe

Der Abgleich läuft immer gleich: Bekannte Ereignisse (eigene Eingaben,
sichtbare Treffer) erzeugen ein erwartetes Werteverhalten, und
`ramtools.py search` filtert die Adressen heraus, die genau dieses
Verhalten zeigen. Jede gefundene Adresse wird in einem zweiten,
unabhängigen Lauf mit variierten Eingaben geprüft, bevor sie als gesichert
gilt.

| Größe | Erwartetes Verhalten / Filter |
|---|---|
| Lebenspunkte Spieler | konstant ohne Treffer (`same`), fällt im Trefferframe (`A:B:lt`), sonst nie steigend |
| Lebenspunkte Gegner | wie oben, im `attack`-Szenario beim Treffer auf den Gegner |
| Position x | steigt nur bei „rechts“ (`inc`), fällt bei „links“, bleibt bei hoch/runter (`same`). Vermutlich Weltkoordinate plus Kamera-Scroll als eigene Adresse. Festkomma (Wort + Nachkomma-Byte) möglich, daher Breite 1 und 2 prüfen |
| Tiefe (y/z) | ändert sich nur bei hoch/runter |
| Höhe (Sprung) | ändert sich nur beim Springen, kehrt zum Bodenwert zurück |
| Zustand / Animationsphase | wechselt beim Schlag-Input von einem Ruhewert weg und kehrt nach der Aktion zurück; Animationszähler laufen dabei monoton |
| Anzahl aktiver Gegner | ändert sich beim Erscheinen und Besiegen von Gegnern. Alternativ werden aktive Objekt-Slots gezählt. Ergebnis: Es gibt feste Objekt-Slots, aber keinen eigenen Zähler (siehe „Objekt-Slots“) |

## Messgrößen

Alle Werte gelten für Captain Commando. Frames bei 59,637405 Hz, Einheiten
in Bildschirmpixeln. P = erster Frame, in dem die Taste gedrückt ist,
h = Frame, in dem die LP des Gegners sinken. Belege in `logs/a5_*.csv`
(erzeugt von `scripts/laeufe_a5.sh` und `scripts/belege_a5.sh`).

| Messgröße | Wert | Beleg | Status |
|---|---|---|---|
| Laufgeschwindigkeit | x ±1,75 px/Frame (≈ 104 px/s), Tiefe ±1,0 px/Frame (≈ 60 px/s), diagonal x ±1,25 und Tiefe ±0,75 px/Frame. Ohne Anlauf und Abbremsen, auch beim Richtungswechsel | `walk`, `walk_b`: alle 12 Segmente, je Frame exakt diese Werte (16.16). `a5_laufen.csv` | gesichert |
| Schaden je Kombostufe | Stufe 1: 3, Stufe 2: 4, Stufe 3: 5, Stufe 4 (Abschlusstritt): 10 LP. Unabhängig vom Gegnertyp | `attack`, `attack_b` (Gegner 16 LP), `combo_c` (Gegner 16 und 30 LP), Demo-Abschnitt 1 mit Captain (Stufen 1–3 gegen 32 LP). `a5_schaden.csv` | gesichert |
| Treffer bis zum Umfallen | 4: Der Abschlusstritt (Stufe 4) wirft um, auch wenn der Gegner danach noch LP hat | `combo_c`: Gegner mit 30 LP liegt nach Stufe 4 mit 8 LP. 16-LP-Gegner sterben bei Stufe 4. Demo (Mack): Gegner mit 26 und 46 LP fallen bei Stufe 4 | gesichert |
| Startup-Frames Schlag | Stufe 1: Treffer in P+2. Davon ist 1 Frame Eingabelatenz (Aktion ab P+1), der Treffer fällt in den 2. Frame der Aktion. Folgestufen: Stufe 2 in P+3, Stufe 3 in P+4, Stufe 4 in P+3 | `kontakt`: P = 2…10, `kontakt_b`: P = 2…4, immer P+2. Kettenstufen in `attack`, `attack_b`, `combo_c` je 3/4/3 Frames nach dem Druck. `a5_schlag.csv` | gesichert |
| Recovery-Frames Schlag | Mit Treffer: 7 Frames Trefferstopp. Die Figur ist ab h+13 wieder frei (Laufen bewegt ab h+14; Kettendruck ab h+12 wird angenommen). Ohne weitere Eingabe bleibt die Schlagpose bis h+27, Ruhe ab h+28. Leerschlag: frei ab P+8 (x ab P+9), Ruhe ab P+17 (16 Frames Aktion) | `kontakt` P = 3/6, `kontakt_b` P = 2/4 mit Laufen ab P+1. Leerschlag mit P = 61/81. Trefferstopp: Animationswechsel bei Treffer +1, +2, +13, +14 statt +1, +2, +6, +7 | gesichert |
| Unverwundbarkeit nach Treffer | 27 Frames (Trefferreaktion, Status S+4 = 3), unabhängig vom Schaden (5, 6, 8) | 23 abgeschlossene Reaktionen in `hurt`, `hurt_b`, `hurt_c`, alle 27 Frames, dazu zwei, die genau bei 27 von einem neuen Treffer abgelöst wurden. Kein Treffer kam früher als 27 Frames nach dem vorigen, zweimal genau 27 (`hurt` 1158, `hurt_c` 1437). `a5_schutz.csv` | gesichert (Wirkung); Mechanismus unsicher |
| Unverwundbarkeit nach Aufstehen | 35 Frames ab dem Aufstehen (Status 2 → 3, Timer `FFAA69` 35 → 0) | 7 Fälle in `hurt`, `hurt_b`, `hurt_c`, alle 35. Dreimal Treffer genau beim Ablauf (`hurt` 731 und 1434, `hurt_c` 1265). In genau diesen drei Fenstern stand ein Gegner alle 35 Frames in Reichweite (\|dx\| ≤ 60, \|dz\| ≤ 8), in den vier anderen keiner. Eingriff: Timer gehalten → kein Treffer bis zum Ablauf | gesichert (Wirkung); Mechanismus unsicher |

## Messungen im Einzelnen

**Laufen.** Die Bewegung beginnt einen Frame nach dem ersten gedrückten
Frame und endet einen Frame nach dem letzten. Die Zahl der Bewegungsframes
ist also gleich der Zahl der gedrückten Frames. Die Einheit ist am Bild
geprüft: Zwischen zwei Standbildern mit Δx = 70 liegen die beiden Figuren
im Differenzbild genau 70 px auseinander (je 57 × 76 px). Bei Δ Tiefe = 37
ist der gemeinsame Umriss 113 = 76 + 37 px hoch. Nach oben ist die Tiefe
bei 341 begrenzt (`walk`).

**Kette.** Ein Druck während der Kette wird nur im Fenster h+12 bis h+27
nach dem letzten Treffer angenommen und startet dann die nächste Stufe.
Drücke in h+1 bis h+11 werden verworfen und nicht gepuffert. Ein Druck ab
h+28 beginnt eine neue Kette mit Stufe 1. Das Fenster ist in `kontakt`
(P = 3 und 6) und `kontakt_b` (P = 3) auf den Frame gleich: h+11 verworfen,
h+12 angenommen, h+27 angenommen, h+28 Stufe 1. Die Ketten in `attack`,
`attack_b` und `combo_c` passen dazu (dort wurde bei h+6/h+8 verworfen und
bei h+14 angenommen). Die Unterphase `FFA99C` springt genau dann auf 4,
wenn die Figur wieder frei ist (beim Leerschlag auf 2). Das gilt für den
Druck der Stufe 2. Für Stufe 3 und 4 liegt das Fenster einen Frame früher
(h+11 bis h+26), siehe „Nachtrag: Reichweite der Kettenstufen 2–4“.

**Startup bei Annäherung.** Läuft der Gegner erst während des Schlags in
die Reichweite, kommt der Treffer später (`attack_b`: neuer Schlag ab 399 bei
89 px Abstand, der Gegner läuft heran, Treffer 402 bei 84 px). Die Faust
bleibt also mindestens bis zum 4. Frame der Aktion aktiv, die Reichweite
liegt bei etwa 84–86 px. Der
Startup in der Tabelle gilt für einen Gegner, der schon in Reichweite steht.

**Schutz.** Treffer gegen die Figur gab es in allen Läufen nur im Status
S+4 = 1. Wenn ein Schutzfenster endet und im selben Frame ein Treffer
kommt, wechselt der Status innerhalb dieses Frames von 3 auf 1 und wieder
auf 3. Im Abzug sieht man dann durchgehend 3, daher „Status vorher 3“ in
`a5_schutz.csv`. Der **Eingriff** (`schutz_eingriff.lua`, also kein reines
Zusehen) zeigt, dass der Status die Ursache ist:
- Timer bis 830 auf 35 gehalten: Status 3 bis 864, kein Treffer in diesen
  168 Frames, obwohl der Gegner in Reichweite steht. Nächster Treffer 892.
- Timer ab 697 auf 0 gezwungen: Der Status springt nie zurück auf 1 (das
  macht nur der Ablauf des Timers). Bis zum Laufende (900) kommt kein
  Treffer, 204 Frames mit Gegner in Reichweite.

Ob die Angriffe dabei ins Leere gehen oder ob der Gegner nicht zuschlägt,
lässt sich so nicht trennen. Der Gegner bleibt in seiner Angriffspose
(Aktion 0x06) und schlägt sichtbar nicht zu. Für das Spielgefühl ist das
Ergebnis gleich: kein LP-Verlust im Status 3.

**Zusatzwert** (gesichert, gleiche Belege): Liegen nach dem Umwerfen bis
zum Aufstehen dauert 121–122 Frames (7 Fälle in `hurt`, `hurt_b`, `hurt_c`).

**Korrigiert** (Nachtrag Würfe): Die Gegner halten die Figur nicht fest. Ihr
dritter oder vierter Schlag wirft sie um, ohne Griff; dazwischen kann die
Figur weglaufen. Die Schläge kommen im Abstand von etwa 56–79 Frames. Siehe
„Nachtrag: Griff und Würfe“.

**Figurabhängig** (unsicher, nur Demo): Mack the Knife macht in Stufe 1–3
ebenfalls 3, 4 und 5 Schaden, mit dem Abschlusstritt aber nur 8. Ab
Demo-Abschnitt 4 (Figur 3) macht die Kette in Stufe 1 und 2 je 6 Schaden.

## Nachtrag: Sprung und Schlagreichweite

Gemessen nach Aufgabe 6, gleiche Konventionen wie in „Messgrößen“
(Captain Commando, P = erster Frame mit gedrückter Taste). Belege:
`logs/a7_sprung.csv`, `logs/a7_reichweite.csv` (erzeugt von
`scripts/laeufe_a7.sh` und `scripts/belege_a7.sh`).

### Sprung

19 Sprünge in `jump`, `jump_b`, `sprung_c`, `sprung_d` haben alle exakt
dieselbe Höhenkurve (16.16).

| Größe | Wert | Status |
|---|---|---|
| Ablauf | Aktion ab P+1, Absprung P+2, 40 Frames in der Luft (P+2 bis P+41), Aufsetzen P+42, Landung bis P+47 (6 Frames), handlungsfähig ab P+48 | gesichert |
| Steighöhe | 51,25 px, Scheitel bei P+21 | gesichert |
| Anfangsgeschwindigkeit / Schwerkraft | 4,9375 px/Frame nach oben, −0,25 px/Frame² in jedem Frame | gesichert |
| Horizontal | ±2,25 px/Frame, festgelegt durch die Richtung im Frame des Sprungdrucks (P). Richtung erst ab P+1: Sprung im Stand. Anlauf ändert nichts. Weite 92,25 px (41 Frames). Keine Steuerung in der Luft | gesichert |
| Tiefe in der Luft | ±0,5 px/Frame, solange hoch/runter gehalten wird, auch erst nach dem Scheitel und zusammen mit der x-Bewegung | gesichert |
| Tastendauer | ohne Einfluss (1 und 40 Frames ergeben denselben Sprung) | gesichert |
| Landung | nicht abbrechbar: Bei gehaltener Richtung bewegt sich die Figur erst ab P+49 | gesichert |
| Sprungangriff | Aktion 0x0E; die Höhe steht im Frame des Angriffsbeginns einmal still, Landung und Ende kommen dadurch einen Frame später | gesichert (`jump`, `jump_b`) |

Am linken Bildrand wird ein Rückwärtssprung gebremst (`jump_b` 161,
`sprung_d` 251). Das ist der Rand, keine Sprungeigenschaft.

### Schlagreichweite (Standardschlag, Stufe 1)

Methode: Einzelschläge mit variiertem Eingabeframe, während ein Gegner
heranläuft (`anlauf`, `anlauf_b`: 16 LP; `anlauf_c`: 30 LP), dazu Schläge
nach gezielter Tiefenänderung (`tiefe_v*` gegen 16 LP, `tiefeA_v*`,
`tiefeB_v*` gegen 30 LP). Ausgewertet wird jeder aktive Frame mit den
ganzzahligen Positionen am Frame-Ende (`messen_a5.py aktiv`).

| Größe | Wert | Status |
|---|---|---|
| x-Reichweite | Treffer bei x-Abstand ≤ 85 px, kein Treffer ab 86 (bei \|dz\| ≤ 11). Gleich bei beiden Gegnertypen und in allen vier Annäherungen (`anlauf`, `anlauf_b`, `anlauf_c`, `attack_b`). Kleinster beobachteter Trefferabstand: 41 px | gesichert |
| Tiefentoleranz | \|dz\| ≤ 11: immer Treffer. 12: Grenzfall (7 von 8 aktiven Frames; beim 30-LP-Gegner erst im 2. aktiven Frame). Ab 13: nie (55 aktive Frames). Oben und unten gleich | gesichert |
| Aktive Frames | P+2 bis P+5 (4 Frames). Ein Gegner, der erst in P+5 in Reichweite kommt, wird noch getroffen, in P+6 nicht mehr | gesichert (`anlauf`, `anlauf_b`, `anlauf_c`) |

Die Positionsregel ist geprüft: Mit den exakten 16.16-Abständen oder mit
den Positionen vom Frame-Anfang widersprechen sich die Annäherungen. Nur die
ganzzahligen Positionen am Frame-Ende ergeben eine gemeinsame Grenze.
Gegner gleichen ihre Tiefe an die Figur an. Deshalb ist die untere Grenze
(Gegner 13 px weiter vorn, kein Treffer) nur in zwei Läufen belegt
(`tiefeA_v21`, `tiefeA_v22`). Die Kettenstufen 2–4 stehen im nächsten Abschnitt.

## Nachtrag: Reichweite der Kettenstufen 2–4

Belege: `logs/kette_reichweite.csv`, erzeugt von `scripts/belege_kette.sh`
mit dem Szenario `kette.lua` (Savestates `kontakt` mit 16 LP und
`kontakt_b` mit 30 LP, Slot 17). D ist der Frame, in dem die Taste der
geprüften Stufe gedrückt ist. Positionen wie oben: ganzzahlig am Frame-Ende,
dx = x(Gegner) − x(Figur), dz entsprechend in der Tiefe.

**Methode (EINGRIFF)**: In einer natürlichen Kette steht der getroffene
Gegner still, der Abstand bleibt also der beim ersten Treffer. Um die
Grenze zu finden, setzt `kette.lua` den Gegner vom Treffer der Vorstufe bis
D+12 auf einen festen Abstand zur Figur (x-Bruchteil 0). Mit `CC_FERN=n`
bleibt er bis D+n 200 px entfernt und kommt erst dann in Reichweite. Daran
sieht man, welche Frames aktiv sind. Die Kette selbst bleibt dabei
unverändert (Kombostufe im RAM, Schaden 4/5/10). Zur Kontrolle gibt der
gleiche Eingriff bei Stufe 1 genau die natürlich gemessenen Werte (≤ 85 px,
P+2 bis P+5).

Ein Workflow mit je einer Mess- und zwei Gegenprüfungen pro Stufe hat das
Ergebnis unter variierten Bedingungen bestätigt. Variiert wurden die
Abstände zwischen den Drücken (12 bis 26 Frames nach dem Treffer, also
innerhalb und außerhalb der Trefferreaktion des Gegners) und der Frame des
ersten Drucks, auf beiden Savestates, mit mehreren hundert Läufen je
Stufe. `belege_kette.sh` wiederholt davon eine Auswahl von 111 Läufen
(dazu 48 Läufe zum Kombo-Fenster, siehe unten).

| Größe | Stufe 2 | Stufe 3 | Stufe 4 (Abschlusstritt) | Status |
|---|---|---|---|---|
| Startup (Treffer ab) | D+3 | D+4 | D+3 | gesichert (Aufgabe 5) |
| x-Reichweite | ≤ 87 px, ab 88 nie | ≤ 91 px, ab 92 nie | ≤ 100 px, ab 101 nie | gesichert |
| Tiefentoleranz | \|dz\| ≤ 12, ab 13 nie | \|dz\| ≤ 12, ab 13 nie | \|dz\| ≤ 12, ab 13 nie | gesichert |
| Aktive Frames | D+3 bis D+6 | D+4 bis D+7 | D+3 bis D+6, dazu D+17 bis D+20 | gesichert |

- Anders als bei Stufe 1 gibt es bei \|dz\| = 12 keinen Grenzfall: Alle
  Folgestufen treffen dort immer. Das gilt auch an der x-Grenze (dx 87/91/100
  mit dz ±12 trifft, mit ±13 nie).
- Oben und unten sowie beide Gegnertypen verhalten sich gleich.
- **Zweites Fenster des Tritts**: Hat der Tritt in D+3 bis D+6 nichts
  getroffen, ist er von D+17 bis D+20 noch einmal aktiv, mit denselben
  Grenzen. Zwischen D+7 und D+16 sowie ab D+21 trifft er nicht. Weil der
  Trefferstopp die Animation anhält, verschieben sich diese Frames, sobald ein
  anderer Gegner getroffen wird.
- **Ohne Eingriff** (`kr_nat_*`): Eine Tiefenbewegung vor Stufe 1
  (`CC_VERT`) stellt die Tiefe ein. Danach läuft die Kette ohne Eingriff.
  Stufe 4 trifft bei dz +12 (`kr_nat_a_vm2`) und bei dz −12
  (`kr_nat_b_v13`). Bei dz 13 (`CC_VERT=-3`) trifft schon Stufe 1 nicht.
  Natürliche Treffer der Stufen 2–4 bei dx 84/85 kommen in `attack`,
  `attack_b`, `combo_c` und in Anläufen vor, alle innerhalb der Grenzen.

**Kombo-Fenster je Stufe** (Nebenbefund, ohne Eingriff, `kr_fen_*`): Der
Druck der Stufe 2 wird in h+12 bis h+27 nach dem Treffer der Stufe 1
angenommen (wie in „Messungen im Einzelnen“). Für die Drücke der Stufen 3
und 4 liegt das Fenster einen Frame früher, bei h+11 bis h+26 nach dem
Treffer der Vorstufe. Davor werden die Drücke verworfen, danach beginnen
sie eine neue Kette. Beide Fenster sind 16 Frames lang. Geprüft wurde das
auf `kontakt` und `kontakt_b`, mit erstem Druck in Frame 3 und 6 (beides
gleich). Es ist gesichert und deckt sich mit den Gegenprüfungen des
Workflows (dort Stufe 3/4 mit Abstand 27: neue Kette).

Unsicher:

- Mit Blick nach links ist die Reichweite vermutlich 1 px kürzer (Stufe 1
  ≤ 84, Stufe 2 ≤ 86). Das hat nur eine Gegenprüfung per Eingriff gemessen.
- Richtung während der Kette: Hoch, runter und zum Gegner hin ändern
  nichts, und die Kette bleibt erhalten. Vom Gegner weg bricht die Kette ab
  und setzt sie zurück. Wird beim Kettendruck die Richtung zum Gegner
  gehalten, macht die Figur einen Ausfallschritt von etwa 20 px und trifft
  später. Diese Variante kommt auch in der Demo vor; sie ist nur aus
  einzelnen Läufen bekannt.
- Reichweite des Sprungangriffs: siehe „Nachtrag: Sprungangriff“.

## Nachtrag: Sprungangriff

Belege: `logs/sprungangriff.csv`, erzeugt von `scripts/belege_sprungangriff.sh`
(Szenario `sprungangriff.lua`, Auswertung `messen_a5.py sprungangriff` und
`treffer`). Dazu kommt ein Workflow mit fünf Messagenten (Schaden, Timing,
Höhe, x, Tiefe, dazu eine Auswertung von 1.800 Läufen ohne Eingriff) und je
zwei Gegenprüfungen. J ist der Frame des Sprungdrucks, A der des
Angriffsdrucks. Die Proben setzen den Gegner per EINGRIFF relativ zur Figur
(Einzelframe-Proben: nur im Frame T in Reichweite, davor und danach 200 px
entfernt). Gewertet werden wie beim Schlag die ganzzahligen Positionen am
Frame-Ende.

Es gibt vier Varianten, alle mit Aktion 0x0E:

| Variante | Auslöser | Schaden | Status |
|---|---|---|---|
| neutral | Sprung ohne Richtung, Angriff ohne Richtung (oder hoch/links/rechts beim Angriff) | 7, wirft um | gesichert |
| Richtung | links oder rechts im Frame des Sprungdrucks (Vorwärts- und Rückwärtssprung; die Figur dreht sich dabei nicht) | 7, wirft um | gesichert |
| hoch | hoch genau im Frame des Sprungdrucks (senkrechter Sprung) | 12, wirft um, erster Treffer A+7, trifft auch in 46 px Höhe | gesichert (`sa_nat_*_hoch_*`, ein Gegenprüfer); Reichweite gemessen im „Nachtrag: Rest der Spielfigur“ (B) |
| unten | runter zusammen mit dem Angriffsdruck | 4, wirft nicht um | gesichert (`sa_nat_kb_unten_*`, ein Gegenprüfer); Reichweite gemessen im „Nachtrag: Rest der Spielfigur“ (B) |

Neutral und Richtung im Einzelnen:

| Größe | Wert | Status |
|---|---|---|
| Schaden | 7 je Treffer bei beiden Gegnertypen, in jeder Höhe, unabhängig von einer vorherigen Kette. Mehr als jede der Kettenstufen 1–3 | gesichert (174 Treffer im Workflow, `sa_nat_*`) |
| Umwerfen | jeder Treffer wirft um: der Gegner fliegt 135 px weit in Blickrichtung der Figur (nicht vom Angreifer weg), liegt 55 Frames nach dem Treffer | gesichert (Workflow); inzwischen mit Skript bestätigt: 135,125 px, Ruhe ab K+55, siehe „Nachtrag: Trefferreaktion der Gegner“ |
| Aktive Frames | A+5 bis A+28, solange die Figur in der Luft ist (bis J+42). A+3, A+4 und ab A+29 nie. Jeder Treffer hält Figur und Zeitgeber 7 Frames an (Trefferstopp), das Fenster verlängert sich entsprechend | gesichert (`sa_fen_*`) |
| Mehrere Gegner | ein Sprungangriff kann mehrere Gegner treffen (je 7), denselben aber nur einmal | gesichert (`sa_nat_kb_richtung`: Slot 17 in Frame 10, Slot 16 in Frame 40) |
| Höhe (neutral) | trifft bis zu einer Höhe der Figur von 45 px, ab 46 nie; keine Mindesthöhe. Beim normalen Sprung ist der Tritt dadurch um den Scheitel herum (A+12 bis A+24 bei A = J+4) wirkungslos | gesichert (`sa_fen_neutral_*`) |
| Höhe (Richtung) | trifft bis 41 px, ab 43 nie (42 kommt im Sprung nicht vor) | gesichert (`sa_fen_richtung_*`) |
| x-Reichweite (neutral) | Gegner vor der Figur bis dx 76, ab 77 nie; hinter der Figur bis dx −27, ab −28 nie (Gegner schaut zur Figur) | gesichert (`sa_x_*_neutral_*`, beide Gegnertypen) |
| x-Reichweite (Richtung) | vor der Figur bis dx 99, ab 100 nie; hinter der Figur bis dx −24, ab −25 nie | gesichert (`sa_x_*_richtung_*`) |
| Tiefe | \|dz\| ≤ 12 trifft immer, ab 13 nie, ohne Grenzfall, unabhängig von Höhe und Variante | gesichert (`sa_z_*`) |
| Frühester / spätester Druck | Angriff im selben Frame wie der Sprung ergibt den Spezialangriff (Aktion 0x14), ab J+1 einen Sprungangriff. Ein Druck bis J+41 startet ihn noch; ab A = J+38 bleibt er ohne aktiven Frame. Drücke bei der Landung gehen verloren | gesichert (Workflow) |
| Dauer | Der Sprung dauert mit Angriff einen Frame länger (Höhe steht in A+1 einmal still), mit Treffer zusätzlich 7 Frames je Treffer | gesichert |

Unsicher bzw. nur im Workflow:

- Die Reichweite hängt von Pose und Blickrichtung des Gegners ab (die
  Trefferfläche des Gegners ist nicht mittig). Schaut der Gegner von der Figur
  weg, reicht der neutrale Tritt nur bis dx 52 und hinten bis −3. In
  einzelnen Angriffsposen des Gegners verschiebt sich die Grenze um 1 bis
  10 px, und die Höhengrenze sinkt auf etwa 41 px.
- Mit Blick nach links ist die Reichweite 1 px kürzer (−75 bzw. −98), wie
  bei der Kette (eine Gegenprüfung). Gesichert im „Nachtrag: Rest der
  Spielfigur“ (F): neutral ≤ 75, Richtung ≤ 98 (Messagent und
  Gegenprüfer).

## Nachtrag: Griff und Würfe

Belege: `logs/wurf.csv`, erzeugt von `scripts/belege_wurf.sh` (Szenario
`griff.lua`, Auswertung `messen_a5.py wurf`, `wurfablauf`, `umfallen`). Dazu
kommt ein Workflow mit vier Messagenten und je zwei Gegenprüfungen. Dessen
Läufe liegen nur im Scratchpad der Sitzung, die Befehle stehen dort in
`workflow_wurf/*commands*.txt`. E ist der Frame der Wurfeingabe (Angriff
plus Richtung im Griff), Captain Commando wirft. „Rückprall“: In
`messen_a5.py wurf` heißt die Spalte `rutschen_nach_landung`. Der Gegner
rutscht aber nicht, er springt nach dem ersten Bodenkontakt flach (bis
3,7 px) wieder ab und landet erst danach endgültig.

### Griff

Belege: `logs/griff.csv`, erzeugt von `scripts/belege_griff.sh` (Szenario
`griff.lua`, Auswertung `messen_a5.py griff` und `treffer`), dazu ein
Workflow mit vier Messagenten (x, Tiefe, Bedingungen, Angriffe aus dem
Griff; zusammen über 7.000 Läufe) und je zwei Gegenprüfungen. Die Proben
setzen den Gegner bis Frame 4 per EINGRIFF ab (dx, dz 11). Danach macht die
Figur einen Schritt nach oben (dz 11 → 10), ohne sich in x zu bewegen.

| Größe | Wert | Status |
|---|---|---|
| Auslöser | Die Figur läuft (eine Richtung ist gehalten) und der Gegner steht in Griffweite. Entschieden wird an den ganzzahligen Positionen am Ende des Frames. Ein Tiefenschritt allein genügt. Ohne Eingabe gibt es keinen Griff, ebenso wenig im Sprung, bei der Landung, beim Sprint und in der eigenen Trefferreaktion | gesichert (`gr_still_*`, `gr_sprung_k`, `gr_x_*`, Workflow) |
| x-Reichweite | Gegner vor der Figur, beide schauen sich an: bis 39 px, ab 40 nie (Blick rechts); bis 38 px, ab 39 nie (Blick links). Gleich für beide Gegnertypen | gesichert (`gr_x_*`, `gr_nat_*`) |
| Tiefe | \|dz\| ≤ 10 greift, ab 11 nie, auf beiden Seiten | gesichert (`gr_z_*`) |
| Gegner hinter der Figur | Schaut er zur Figur, greift sie ihn bis 24 px hinter sich (Blick links: 25 px). Schaut er weg, gar nicht | gesichert (Workflow) |
| Gegner vor der Figur, schaut weg | nur bis etwa 14 px | gesichert (Workflow) |
| Pose des Gegners | In zwei Ausholposen vor seinem Schlag reicht der Griff 1 px weiter (40 bzw. 39 links), beim pinken Gegner in einer Pose bis 41 px; dann greift die Figur unter 5 px Abstand nicht. In aktiven Angriffsframes und in der Trefferreaktion des Gegners gibt es keinen Griff, liegende Gegner werden erst im Frame des Aufstehens gegriffen | gesichert (Workflow) |
| Haltedauer | 60 Frames, dann reißt sich der Gegner los. Danach ist 30 Frames lang kein neuer Griff möglich. Andere Gegner können die Figur beim Halten treffen; ein Treffer beendet den Griff | gesichert (Workflow, Haltedauer auch `wr_a_halten`) |
| Angriff am Griffbeginn (G = Griff-Frame) | Druck in G−1 oder früher: normaler Schlag, kein Griff. Druck in G: geht verloren. Ab G+1 Kniestoß bzw. Wurf, bis G+60 | gesichert (`gr_angriff_*`, Workflow) |
| Kniestoß, Wurf | siehe „Wurf der Figur“: Knie 4 LP (Treffer K+5), der dritte wirft um; Wurf 14 LP; höchstens 22 LP je Griff (2 Knie + Wurf) | gesichert |

### Wurf der Figur

| Größe | Wert | Status |
|---|---|---|
| Eingabe | Im Griff Angriff plus Richtung. Vorwärts (über den gehaltenen Gegner hinaus) nur, wenn die Richtung die Blickrichtung enthält, auch diagonal. Alle anderen Richtungen (weg, hoch, runter, diagonal weg) werfen rückwärts über die Figur. Angriff ohne Richtung ist ein Kniestoß. Eine Richtung, die erst nach dem Angriff gedrückt wird, zählt nicht. Links und rechts zugleich ergeben einen Kniestoß | gesichert (`wr_a_dir_*` Blick rechts, `wr_bl_*` Blick links) |
| Schaden | 14 LP in E+1, unabhängig vom Zeitpunkt und von vorherigen Kniestößen | gesichert (alle 25 Würfe) |
| Ablauf | Figur gebunden von E+1 bis E+37, frei ab E+38, sie bewegt sich nicht. Gegner losgelassen in E+22 in Höhe 59, erster Bodenkontakt E+59, Ruhe E+71 | gesichert |
| Flugbahn ab dem Loslassen | x: 5,0 px/Frame, jeden Frame 1/16 weniger. Höhe: +2,0 px/Frame, jeden Frame 13/64 (0,203) weniger; Scheitel 69,86 px nach 10 Frames. Erster Bodenkontakt nach 37 Frames und 143,4 px, dann trägt ein flacher Rückprall noch 28,1 px | gesichert (Workflow Frame für Frame, Eckwerte in `wurf.csv`) |
| Weite | Ruhelage 183,8 bis 185,2 px von der Figur, vorwärts wie rückwärts (13 px Versatz beim Loslassen plus 171,5 px Flug). Unabhängig von Tiefe, Zeitpunkt und Kniestößen. Ein Bildschirmrand begrenzt die Weite nicht | gesichert für WOOKY (16 LP), den 30-LP-Gegner (EDDY) und zwei weitere Typen (25 Würfe hier, 21 natürliche im Workflow) |
| Weite je Gegnertyp | SKIP (Typ `0x25086`): 175,6 px ab Loslassen, Ruhe etwa 196 px von der Figur. Typ `0x36fb2` (Stage 2): 163,3 px, Ruhe etwa 181 px. Schaden gleich (14) | gesichert (Workflow) |
| Haltedauer | Ohne Eingabe reißt sich der Gegner 60 Frames nach Griffbeginn los (`wr_a_halten`: Griff 6, los in 67). Wurf frühestens in Griff+1 (`wr_a_zeit7`), spätestens im letzten Halteframe (`wr_a_zeit66`); in Frame 67 kommt nur noch ein Leerschlag | gesichert |
| Kniestoß | Angriff ohne Richtung im Griff: Treffer K+5 mit 4 LP, Gegner wieder gehalten ab K+23. Die nächste Eingabe (Knie oder Wurf) wird ab K+18 angenommen, in K+2 bis K+17 verworfen und nicht gepuffert (`wr_a_knie1_frueh`). Jeder Kniestoß startet die 60 Frames Haltedauer neu. Der dritte Kniestoß wirft den Gegner um (4 LP, etwa 165 px weit) | gesichert (`wr_a_knie*`, Workflow) |
| Sprung im Griff | lässt den Gegner ohne Schaden los, danach normaler Sprung (im Stand oder mit Richtung) | gesichert (`wr_a_sprung*`) |
| Sprung + Angriff im Griff | Spezialangriff (Aktion 0x14): Gegner 6 LP in E+8 und umgeworfen (etwa 158 px), die Figur verliert 9 LP in E+16 und ist ab E+58 frei (beim 30-LP-Gegner E+65) | gesichert (`wr_a_spezial`, Workflow) |
| Geworfener Gegner als Geschoss | Er trifft andere Gegner auf seiner Bahn: 3 LP und umgeworfen, auch mehrere mit einem Wurf. Seine eigene Bahn ändert sich dadurch nicht. Treffer beim Tragen (ab E+1) und im Flug bis kurz vor dem ersten Bodenkontakt, nicht mehr beim Rückprall. Tiefenfenster \|dz\| ≤ 17 (`wr_b_geschoss21`: Treffer bei dz −7 in E+37; `wr_b_geschoss40`: dz −19, kein Treffer) | gesichert |
| Reichweite des Geschosses | etwa 52 px in x zwischen den Mittelpunkten bei WOOKY und EDDY; hängt vom Zieltyp und dessen Pose ab | unsicher |
| Grenzen | Geworfene Gegner bleiben höchstens 96 px außerhalb des Bildes (Kamera −96 bis Kamera +480; Kamera = `FFE99E`). Wände der Stage stoppen sie: in Stage 1 eine diagonale Wand bei x 1008 bis 1021 für Tiefe ≥ 330 (`wr_b_right`: Ruhe 183,0 statt 185,0 px) | gesichert |

Andere Figuren werfen anders (nur Stichproben im Workflow, unsicher): Mack
lässt in E+27 los und wirft 173 px; Ginzu macht 12 Schaden, lässt in E+17 los
und wirft bei hoch/runter vorwärts; Baby Head macht 12 Schaden und wirft etwa
208 px.

### Umwerfen der Figur durch Gegner

Die normalen Gegner der ersten Stages werfen die Figur nicht. Was in
`hurt`, `hurt_b` und `hurt_c` bisher als „Wurf“ bezeichnet war, ist ein
Treffer mit Umwerf-Eigenschaft: Die Figur wird dabei nicht gehalten und
kann zwischen den Schlägen weglaufen. Der WOOKY wirft meist mit seinem
dritten oder vierten Schlag um, mit mehreren Gegnern auch früher. Nur der
Boss von Stage 1 (DOLG) und der Roboter packen die Figur. Der Wurf des
DOLG macht je nach Rang 16–22 LP (gesichert (Workflow), siehe „Nachtrag:
Schaden der Gegner“). Die Figur fliegt dabei mit 5 px/Frame etwa 180–230 px
weit (unsicher, ein Lauf).

| Größe | Wert | Status |
|---|---|---|
| Flug | H = Treffer. Die Figur steht H+1 bis H+8 still und fliegt ab H+9 vom Angreifer weg: x 2,875 px/Frame konstant, Höhe +5,0 px/Frame, Schwerkraft 70/256 = 0,273 px/Frame². Scheitel 48,2 bis 48,5 px nach 18 Frames, erster Bodenkontakt nach 37 Frames bei 109,25 px, Ruhe bei 135,125 px (bei manchen Nachkommaständen der Höhe 138,0 px). Die Tiefe bleibt gleich | gesichert (`wr_u_*`, im Workflow etwa 45 Fälle) |
| Liegen | Vom Umwerfen bis zum Aufstehen 121 Frames (122 nach dem 138-px-Flug), bei beiden Gegnertypen | gesichert (`wr_u_passiv`, `wr_u_b_passiv`) |
| Aufstehen beschleunigen | Tastendrücke (Angriff oder Sprung) beim Liegen verkürzen die Liegephase: sechs Drücke beenden sie zwei Frames nach dem sechsten. Jeden 2. Frame gedrückt: 93 statt 121 Frames, jeden 4.: 103, Angriff und Sprung abwechselnd in jedem Frame: 88. Jeden 8. Frame gedrückt ändert nichts. Drücke während des Flugs und Richtungen zählen nicht | gesichert (`wr_u_mash*`, unabhängig vom Workflow gemessen) |
| Wand | Landet die Figur an einer Wand (Stage 1: Bankschalter), fehlt der Rückprall und sie liegt 6 Frames länger | unsicher (ein Agent, 10 Fälle) |

## Nachtrag: Schaden der Gegner

Belege: `logs/gegnerschaden.csv`, erzeugt von
`scripts/belege_gegnerschaden.sh` (Szenario `rang.lua` um `hurt*.lua` bzw.
`griff.lua`, Auswertung `messen_a5.py angreifer` und `rang`). Dazu kommt ein
Workflow mit vier Messagenten (Zuordnungsregel, Stage 1 auf zwei Wegen
durchgespielt, Gegnertypen, Zustand der Figur) und je zwei Gegenprüfungen.
Dessen Läufe liegen nur im Scratchpad (`workflow_gs/`). Werte, die nur dort
belegt sind, tragen den Status „gesichert (Workflow)“: von mindestens zwei
Agenten unabhängig gemessen und gegengeprüft, aber nicht mit einem Skript
im Repo nachvollziehbar. Die Durchspiel-Läufe des Workflows füllen die LP
der Figur nach jedem Treffer wieder auf (EINGRIFF; der Schaden des Treffers
selbst bleibt sichtbar).

**Zuordnung** (gesichert): Im Frame des LP-Verlusts zeigt das Wort P+0x82
(`FFAA12`) auf den Slot des Angreifers (S = `0xFF0000` + Wort − 4). Dessen
Trefferattribut S+0x24 ist aktiv, und das Byte S+0x8B ist genau der
Schaden. S+0x8B wird beim Beginn des Angriffs gesetzt. Ausnahmen: Bei
Geschossen zeigt der Zeiger auf den Werfer, der Schaden steht im Geschoss
(Slot 20–59, S+0x6C = Zeigerwort). Bei Griffen (Boss, Roboter) bleibt der
Zeiger alt, der Halter steht in P+0x70. Mit dieser Regel sind die früher
unklaren Werte erklärt: Die 6er in `hurt` (1158, 1217) sind Tritte des
30-LP-Gegners (EDDY), die 8er in `hurt_c` (1299–1410) Messerstiche von SKIP,
der 8er in 1741 ein WOOKY mit 26 LP.

**Rang** (gesichert): Das Byte `FFF82A` ist ein Schwierigkeitswert. Ab
`ingame` steht es auf 9, steigt in Frame 409 und danach alle 600 Frames um 1
(Zähler `FFF82C`) bis höchstens 24. Bei jedem Tod der Figur fällt es beim
Wiedereinstieg um 3 (`gs_hurt_c_lang`: Tod 1741, 12 → 9 in 1893). Der Zähler
läuft im 600er-Takt weiter. Das Spiel hält den Wert zwischen 7 und 24. Laut
Workflow fällt er auch zu Beginn von Stage 2 um 3. Bestätigt im „Nachtrag:
Rest der Spielfigur“ (E): −3 im Frame, in dem der Stage-Index wechselt,
gemessen bei Stage 1 → 2, 2 → 3 und 3 → 4, nie unter 7.

| Gegner | Schaden je Treffer | Status |
|---|---|---|
| Gegner, die beim Start von Stage 1 schon stehen (WOOKY 16 LP, EDDY 30 LP) | WOOKY 5, EDDY 6, bei jedem Rang (7 bis 24) und mit allen Angriffen | gesichert (`gs_*_rang7/24`, `gs_hurt*`) |
| später erscheinende WOOKY | Rang 7: 7, 8–14: 8, 15–21: 9, 22–24: 10 | gesichert: Rang 7 und 9–12 hier (`gs_hurt_c_rang7`, `gs_hurt_c_lang`), Rest Workflow |
| später erscheinende EDDY | Rang 7: 8, 8–14: 9, 15–21: 10, 22–24: 11 | gesichert (Workflow) |
| SKIP, Messerstich | Rang 7: 7, 11: 8, 16: 9, 24: 10 (Stufen bei etwa 9, 16/17, 23) | gesichert (`gs_hurt_c*`, Workflow) |
| SKIP, geworfenes Messer (Geschoss, wirft um) | 10 bis 13 je nach Rang (11 bei Rang 12–16, 13 ab 22) | gesichert (Workflow) |
| SKIP, Ausfallstich (wirft um) | 10 bis 13 je nach Rang | gesichert (Workflow) |
| DICK, Pistole (zwei Schüsse im Abstand von 17 Frames, der zweite wirft um) | 5 bis 7 je Schuss | gesichert (Workflow) |
| DICK, Raketenwerfer (Explosion) | 12 bis 15 | gesichert (Workflow) |
| Roboter (von einem WOOKY gesteuert) | Schläge 12 bis 23, Griff 13 bis 21, auch bei gleichem Rang verschieden | unsicher |
| DOLG (Boss Stage 1) | Schläge 9–12, Ansturm 12–17, Sprung/Körperpresse 16–22, Griff und Wurf 16–22, je nach Rang | gesichert (Workflow) |

Die maximalen LP später erscheinender Gegner hängen vom Rang beim
Erscheinen ab (WOOKY 22 bis 34, EDDY 32 bis 42, SKIP 34 bis 46). Deshalb
schien der Schaden früher mit den Max-LP zu wachsen.

**Unabhängig vom Zustand der Figur** (gesichert, Workflow mit über 1.000
Treffern): Stehen, Laufen, eigener Angriff, Sprung, Halten eines Gegners,
Blickrichtung, Tiefe und eigene LP ändern den Schaden nicht. Aufeinander
folgende Treffer werden nicht stärker; nur ein Rangwechsel zwischen zwei
Angriffen ändert den Wert.

Weitere Regeln (gesichert, Workflow):

- **Umwerfen**: Die Figur fällt nur, wenn das Attribut das Bit 0x0800 hat,
  wenn sie in der Luft getroffen wird oder wenn ihre LP unter 0 fallen.
  Jeder Treffer in der Luft wirft um. Mit Skript bestätigt für die Schläge
  von WOOKY und EDDY im „Nachtrag: Rest der Spielfigur“ (F).
- **Tod**: Genau 0 LP überlebt die Figur (normale Trefferreaktion). Erst
  unter 0 stirbt sie; etwa 120 Frames später geht es mit 72 LP weiter.
  Präzisiert im „Nachtrag: Rest der Spielfigur“ (D): normal t+120, je nach
  Todesart t+107, t+108 oder t+151/152.
- **Gleichzeitiger Treffer**: Wird der Schlag der Figur im ersten aktiven
  Frame des Gegners aktiv, verliert nur der Gegner LP. Einen Frame später
  trifft der Gegner zuerst. Mit Skript bestätigt im „Nachtrag: Rest der
  Spielfigur“ (F).
- **Schutz nach Treffer**: Die 27 Frames schützen vor Schlägen, nicht vor
  Geschossen und Griffen.
- **Reichweite der Gegner** (Stage-1-Fußvolk): WOOKY trifft bis zu einem
  Tiefenabstand von 11 px, ab 12 nicht. Gegen eine springende Figur treffen
  die Schläge bis zu ihrer Höhe von 48 px, bei 49–51 px nicht (der
  Sprungtritt von EDDY bis 50). Präzisiert im „Nachtrag: Reichweite der
  Gegnerangriffe“: Tiefe −10 bis +11 px (Figur 10 px weiter hinten bzw.
  11 px weiter vorn), sonst bricht der Gegner den Angriff ab.
- **Angriffe von WOOKY und EDDY**: Je zwei normale Schläge (Treffer 4 bzw.
  9 Frames nach Angriffsbeginn) und zwei Umwerf-Angriffe (Gerade und
  Aufwärtshaken beim WOOKY, Ausfallschlag und Sprungtritt bei EDDY).
  Zwischen zwei Umwerf-Angriffen landet derselbe Gegner 0 bis 3 normale
  Treffer. Korrigiert im „Nachtrag: Reichweite der Gegnerangriffe“: Der
  WOOKY hat drei normale Schläge (Startup 9, 4 und 10) und zwei
  Umwerfschläge; vor einem Umwerfangriff stehen 2 bis 13 normale Angriffe
  (EDDY 0 bis 10).
- **Trefferreaktion**: Von hinten getroffen eine eigene Animation, von
  vorn je nach Attribut zwei verschiedene (Bit 0x0400 wählt nur die
  Animation). Beim Tod entscheidet die Reaktion mit Bit 0x0400 (Aktion 4
  in t), ob die Figur rollt und erst in t+151/152 statt t+120 wieder einsteigt
  (gesichert, 3. Messung, „Nachtrag: Rest der Spielfigur“).

## Nachtrag: Trefferreaktion der Gegner

Belege: `logs/reaktion.csv` (Messung und dritte Messung) und
`logs/reaktion_v.csv` (Gegenprüfung), beide erzeugt von
`scripts/belege_reaktion.sh`: 319 Läufe mit dem Szenario `reaktion.lua`
(285 der ersten Messung ab `kontakt` und `kontakt_b`, 33 der dritten Messung
`dr_*` und der Lauf `dr_setup`, der den Savestate `reaktion_w3` anlegt),
Auswertung `messen_reaktion.py` (Unterbefehl `gegnerreaktion` auch in
`messen_a5.py`), danach 66 Läufe der Gegenprüfung mit `reaktion_v_frei.lua`,
Auswertung `messen_reaktion_v.py belege`. Laufzeit zuletzt 4 min 21 s (Exit 0),
die Rohdaten werden danach gelöscht. Reproduzierbar: Vor der dritten Messung
lief das Skript beim Gegenprüfer dreimal von vorn (Exit 0), einmal ohne und
zweimal mit seinem Teil. `reaktion.csv` war alle drei Male bitgleich mit der
Datei des Messagenten (929 Zeilen, MD5 `693f2f56ee6ec319a60daad64e64abac`),
`reaktion_v.csv` in beiden Läufen mit seinem Teil gleich (495 Zeilen,
`698463726ad28f3f3b7c09731df87445`). Nach der dritten Messung lief das ganze
Skript von vorn: `reaktion.csv` 1046 Zeilen, MD5
`3b606a30ce3e5516fac6731f64f1daf3`, `reaktion_v.csv` unverändert.

**Methode.** Der Messagent (M) misst ab `kontakt` (WOOKY, 16 LP, Slot 18) und
`kontakt_b` (EDDY, 30 LP, Slot 17) Einzeltreffer, Ketten, Sprungangriffe, Würfe
und Kniestöße mit variierten Druckframes. Er liest je Frame S+4, Aktion und
Phase (S+0x0A/S+0x0C), x, Höhe und Tiefe (16.16), LP, Animationszeiger S+0x1C
und Trefferattribut S+0x24 des Gegners. Der Gegenprüfer (V) hat Szenario und
Auswertung von M erst nach seinen eigenen Messungen gelesen. Er misst mit
eigenem Szenario nur über das Watch-Feld, aus `anlauf`, `anlauf_b` (WOOKY läuft
heran) und `anlauf_c` (EDDY läuft heran, der WOOKY aus Slot 16 stellt sich bei
dx 55/dz 1 dahinter), fast ohne Eingriff: 24 von 29 Zeilen bestätigt, 5
abweichend. Diese fünf hat M ein drittes Mal gemessen, aus dem neuen Savestate
`reaktion_w3` (WOOKY, vom Skript aus `ingame` angelegt) und `tiefe_b` mit
8 Frames hoch (EDDY), Läufe `dr_*`. Der Rang (`FFF82A`) wird nie verändert (je
nach Savestate 9 bis 11, nur planmäßig steigend). „gesichert (3. Messung)“
heißt: Nach der Abweichung erklärt eine gemeinsame Regel die Werte aller drei
Messungen.

Bezeichnungen: h = Frame, in dem die LP des Gegners sinken; D = Frame des
Kettendrucks; E = Wurfeingabe; K = Frame des LP-Verlusts beim Umwerfen (beim
Wurf E+1); G = erster Frame mit S+4 = 1 nach dem Aufstehen; t = Frame, in dem
die LP unter 0 fallen. In der Belegspalte steht M für Läufe `reaktion_m_*`
(in `reaktion.csv`, Namen ohne Vorsatz, `dr_*` = dritte Messung) und V für
Läufe `reaktion_v_*` (in `reaktion_v.csv`); `_w` = WOOKY, `_e` = EDDY.

**EINGRIFFE**:

- M, `CC_LP` (LP und Vorframe-LP setzen, darüber auch die Max-LP S+0x9A):
  LP 40 beim WOOKY in `a3_s4_*_w`, `a4_spaet_w`, `a4_spaet_w2`, `a4_frueh_w`,
  `b_tritt_w`, `b_tritt_w2` und den Proben dazu (ohne Eingriff stirbt er am
  Tritt, 16 LP gegen 22 Schaden: `d_tritt_w`). LP 2/5/10 in `d_s1_*`,
  `d_sprung_w`, `d_s3_e`, `d_gleich_w`, `d_probe_*`; LP 2/5/6/10 in `dr_d_*`
  außer `dr_d_w_tritt`.
- M, Position relativ zur Figur: `a_links_*` (Gegner bis h−1 bei dx −50, damit
  die Figur nach links schlägt), `bp_*` (nur im ersten aktiven Frame T eines
  Standardschlags, Druck T−2, bei dx 50/dz 0, davor und danach 200 px entfernt;
  T von K+40 bis G+40; nach dem Rückwärtswurf dx −50), `bg_*` (ab T−1 bei dx 30
  bzw. 20), `d_probe_*` (nur in T bei dx 50), `c_*` (WOOKY aus Slot 16 bei
  dx 50/dz 0 bzw. dx 70/dz −6).
- V nur `b_tritt_w` (LP, Vorframe-LP und Max-LP des WOOKY auf 35). Ohne
  Eingriff hat V die Proben am Aufstehen, mehrere Gegner und alle Todesfälle
  gemessen; M ohne Eingriff `bn_sprung_*` (Figur geht an den liegenden Gegner
  heran) und alle übrigen `dr_*`.
- Werden die LP über S+0x9A gesetzt, hält das Spiel nach dem nächsten Treffer
  an (von M und V beobachtet). Beide Szenarien setzen die Max-LP deshalb mit.

### A. Trefferreaktion ohne Umwerfen (Kettenstufen 1–3)

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Dauer | S+4 = 3 von h bis h+22 (23 Frames), gleich für Stufe 1, 2, 3 und beide Gegnertypen, ob der Gegner stand, ging oder ausholte | M: 48 Reaktionen (je Gegner Stufe 1/2/3: 8/9/7) in `a_*`, `a3_*`, `a4_*`; V: 47 Reaktionen (WOOKY 12/7/4, EDDY 12/6/6), z. B. `a_w_geh` h 19, `a_w_stand` h 54, `a_w_aus` h 66 | gesichert |
| Wieder frei | S+4 = 1 ab h+23, im selben Frame erstes Bild der Gehanimation (WOOKY `05ED1C`, EDDY `063746`). In Schlagdistanz ab h+24 Standpose (Aktion 6; `05ECAA`/`0636D4`), sonst geht er ab h+24 | M: `a_s1_*`, Gehen `a_s1_e_p3`, `a_links_*`; V: Stand `a_w_stand`, `a_w_aus`, `a_e_stand`, `a_e_aus`, Gehen `a_w_geh`, `a_e_geh`, `a_w_links` | gesichert |
| Animation | Wechsel in h+1, h+10, h+22. Stufe 1 und 3: WOOKY `05EFC8`/`05F002`/`05F034`, EDDY `0639F4`/`063A2E`/`063A60`. Stufe 2 eigene, gleich lange Animation (WOOKY `05EE94`/`05EECE`, EDDY `0638C0`/`0638FA`) | M: `a_s1_*`, `a_s2_*`; V: `a_w_kette`, `a_e_kette`, `a_*_spaet` | gesichert |
| Erster Angriff danach | Ausholen genau 21 Frames nach Erreichen der Standpose, also frühestens h+45, auch wenn der Treffer ein laufendes Ausholen unterbrochen hat. Aktiv beim WOOKY 4 Frames (schneller Schlag `05FC18`: h+49) oder 9 Frames (langsamer Schlag `05FA54`: h+54) nach dem Ausholen, beim EDDY 9 oder 10 Frames danach (h+54 bis h+56). Muss er erst herangehen, verschiebt sich alles | M: `a_s1_w_p3/p10/p18/p26` (p18/p26: Treffer im Ausholen bzw. im ersten aktiven Frame), `a_s1_e_p3` (Stand h+33, Ausholen h+54, aktiv h+63), `a_s2_*`, `a_s3_*`, `a3_s2_27_e` (Stand h+25, Ausholen h+46), `a4_grenze20_e` (Stand h+32, Ausholen h+53); V: h+49 `a_w_stand`, `a_w_aus`, `a_w_neu`, `k_w_19`, `k_w_20`, h+54 `a_w_kette` (h 94, Ausholen 139, aktiv 148), WOOKY aus Slot 16 in `c_zwei_a` (Stand h+30, Ausholen h+51, aktiv h+55), EDDY `a_e_stand`, `a_e_aus`, `c_zwei_a`, `a_e_geh` (Stand h+45, Ausholen h+66, aktiv h+75); dritte Messung: 14 Läufe `dr_a4_*`, Ausholen immer h+45 | gesichert (3. Messung) |
| Wahl des WOOKY-Schlags | M: immer der schnelle (h+49). V: der schnelle in `a_w_stand`, `a_w_aus`, `a_w_neu`, `k_w_19`, `k_w_20` (h+49) und `c_zwei_a` (h+55), der langsame in `a_w_kette` (drei Treffer mit Pausen, h+54) und in `c_zwei_b` (WOOKY aus Slot 16 nach einem einzelnen Treffer: Ausholen `05FA54` in h+50, der aktive Frame liegt nach dem Laufende). Dritte Messung: schnell in 6 Läufen (Einzeltreffer, Kette ohne Pause, zwei Treffer mit Pause), langsam in 3 (drei Treffer mit Pausen). Regel offen; „nach Einzeltreffern immer der schnelle“ (Entwurf M) widerlegt `c_zwei_b` | M `a_s1_w_*`; V `a_w_kette`, `c_zwei_a`, `c_zwei_b` (Spalte `ausholanimation`); `dr_a4_w_p3a/b/c` | unsicher |
| Rückstoß | keiner. Der Gegner zittert in h+9 bis h+14 um +3, −3, +2, −2, +1, −1 px, der erste Ausschlag in Blickrichtung der Figur (Blick links: −3, +3, …); Summe 0, Tiefe unverändert. Kommt der nächste Treffer schon in h+14, fehlt der letzte Schritt | M: 38 Treffer mit Blick rechts, Blick links `a_links_*` (EINGRIFF), letzter Schritt fehlt `a4_frueh_*`; V: 61 Treffer mit Blick rechts, Blick links ohne Eingriff `a_w_links` h 79, `a_e_links` h 247, letzter Schritt fehlt `a_e_frueh` h 80 | gesichert |
| Treffer in der Reaktion | startet sie neu: S+4 = 3 bis h₂+22, Animation und Zittern von vorn. Keine Verlängerung um einen festen Betrag, keine Verkürzung | M: Folgetreffer in h+15 (`a3_s2_12_*`, `a4_frueh_*`), h+16 bis h+18 (`a3_s3_*`, `a3_s4_*`); V: `a_w_neu` (h+18), `a_e_neu` (h+15, h+15), `a_*_frueh` | gesichert |
| Treffer nach der Reaktion | Druck in h+27 (Stufe 2) bzw. h+26 (Stufe 3) trifft in h+30: neue Reaktion h₂ bis h₂+22 | M: `a3_s2_27_*`, `a3_s3_26_*`; V: `a_w_spaet` (49 → 79 → 109), `a_e_spaet` (42 → 72 → 102), `c_fenster27` | gesichert |
| Treffer von hinten | eigene Animation (siehe „Nachtrag: Schaden der Gegner“), Ablauf nicht gemessen | – | offen |
| Andere Gegnertypen (SKIP, DICK) | nicht gemessen | – | offen |

### Kette und Trefferreaktion

Spätester erlaubter Druck je Stufe, h = Treffer der Vorstufe:

| Folgestufe | spätester Druck | Reaktion bis | erster aktiver Frame | Lücke mit S+4 = 1 | Beleg | Status |
|---|---|---|---|---|---|---|
| 2 | h+27 | h+22 | h+30 (D+3), Treffer immer | h+23 bis h+29, 7 Frames | M `a4_spaet_*`, `a3_s2_27_*`; V `a_w_spaet` 49 → 79, `a_e_spaet` 42 → 72 | gesichert |
| 3 | h+26 | h+22 | h+30 (D+4), Treffer immer | h+23 bis h+29, 7 Frames | M `a4_spaet_*`, `a3_s3_26_*`; V `a_w_spaet` 79 → 109, `a_e_spaet` 72 → 102 | gesichert |
| 4 (Tritt) | h+26 | h+22 | h+29 (D+3), Treffer immer | h+23 bis h+28, 6 Frames | M `a4_spaet_*`, `a3_s4_26_*`; V `a_w_spaet` 109 → 138, `a_e_spaet` 102 → 131 | gesichert |

- In der Lücke ist der Gegner frei: Gehanimation ab h+23, der WOOKY bleibt
  danach in der Standpose. Steht der EDDY schon in Schlagdistanz, nimmt er die
  Standpose in h+24 bis h+26 ein (V meist h+24), sonst geht er bis zum Treffer
  heran (M höchstens 6 Frames, rund 10 px). Keiner greift an, alle Folgestufen
  treffen.
- Ohne Lücke bleibt die Kette bis zum Druck in h+20: Der erste aktive Frame
  h+23 ist der Frame, in dem der Gegner frei würde; er wird im selben Frame
  getroffen und zeigt nie S+4 = 1 (M `a4_grenze20_*`, V `k_w_20`, `k_e_20`;
  Druck h+19 trifft in h+22: M `a4_grenze19_*`, V `k_w_19`). Für Stufe 3 liegt
  die Grenze bei h+19 (V `k_e_s3_19`), für den Tritt bei h+20 (V `a_e_kette`
  94 → 117); M hat beide Grenzen nur aus den aktiven Frames D+4 bzw. D+3
  errechnet.
- Mit den frühesten Drücken (h+12, h+11, h+11) steht der Gegner in jedem
  aktiven Frame noch in der Reaktion (M `a4_frueh_*`, V `a_e_frueh`).

Folge für das Design: Die Kette hält im Original nicht, weil die
Trefferreaktion lang genug wäre (23 Frames gegen ein Fenster bis h+27 bzw.
h+26), sondern weil der Gegner nach der Reaktion noch 21 Frames stehen bleibt,
bevor er ausholt. Wer das 16-Frame-Fenster übernimmt, braucht eine
Trefferreaktion bis mindestens h+29 oder eine Angriffssperre danach.

### B. Umwerfende Treffer

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Flug nach Tritt und Sprungangriff | K+1 bis K+8 Stillstand, ab K+9 x 2,875 px/Frame konstant in Blickrichtung der Figur, Höhe +5,0 px/Frame, Schwerkraft 70/256 px/Frame². Scheitel K+27 bei 48,24 px, erster Bodenkontakt K+46 bei 109,25 px, flacher Rückprall, Ruhe ab K+55 bei 135,125 px vom Ort des Treffers. Tiefe unverändert | M: `b_tritt_w`, `b_tritt_w2` (EINGRIFF LP 40), `b_tritt_e`, `b_tritt_e2`, `b_sprung_w`, `b_sprung_w2`, `b_sprung_e`, `b_sprung_e2`; V: `b_tritt_w` K 103 (EINGRIFF LP 35), ohne Eingriff `a_e_kette` K 117, `a_e_spaet` K 131, `a_e_frueh` K 94, `b_sprung_w` K 54, `b_sprung_e` K 58, `b_sprungr_w` und `b_sprungr_e` K 52 | gesichert |
| Flug nach dem dritten Kniestoß | wie beim Tritt, aber aus 16 px Höhe: Scheitel K+27 bei 64,24 px, Bodenkontakt K+49 bei 117,875 px, Ruhe K+58 bei 143,75 px vom Ort des Gegners im Frame K (zum Bezug auf „etwa 165 px“ in „Wurf der Figur“ siehe „Abgleich“ unten) | M `b_knie_w`, `b_knie_e`; V `b_knie_w` K 97, `b_knie_wb` K 100, `b_knie_e` K 93 | gesichert |
| Flug nach dem Wurf | bestätigt „Griff und Würfe“: losgelassen E+22, ab E+23 x 5,0 px/Frame (jeden Frame 1/16 weniger), Höhe +2,0, Schwerkraft 13/64; Scheitel E+32 bei 69,86 px, Bodenkontakt E+59, Ruhe E+71, Weg ab dem Loslassen ±171,5 px; rückwärts gespiegelt | M `b_wurf_w`, `b_wurf_w2` (rückwärts), `b_wurf_e`; V `b_wurf_w` E 60, `b_wurf_wr` E 65, `b_wurf_e` E 55, `b_wurf_er` E 58 | gesichert |
| Zustand beim Umwerfen | S+4 = 2 von K+1 bis G−1 (nach dem Wurf 3). Aktion 0x0C mit Phase 2 Flug, 4 Bodenkontakt, 8 Ruhe, 0x0A Aufstehen. Wurf: Aktion 2, ab E+22 4, ab E+71 0x0C | M alle `b_*`; V alle `b_*`, `a_e_kette/spaet/frueh` | gesichert |
| Liegen des WOOKY (Phase 8 bis 0x0A) | 32 Frames nach Tritt, Sprungangriff und Kniestoß, 16 nach dem Wurf | M `b_tritt_w/_w2`, `b_sprung_w/_w2`, `b_knie_w`, `b_wurf_w/_w2`, `dr_b_w_*`; V `b_tritt_w`, `b_sprung_w`, `b_sprungr_w`, `b_knie_w`, `b_knie_wb`, `b_wurf_w`, `b_wurf_wr` | gesichert |
| Liegen des EDDY | wechselt von Lauf zu Lauf zwischen 16 und 44 Frames, beobachtet 16, 20, 36, 40, 44 (Vielfache von 4). Gleiche Eingaben geben gleiche Werte, schon ein anderer Druckframe kann sie ändern (`a_e_kette` 16, `a_e_frueh` 44; aber `dr_b_e_t30/t35/t40` alle 20) | M `b_*_e*`, `dr_b_e_*`; V `a_e_kette`, `a_e_spaet`, `a_e_frueh`, `b_*_e*` | gesichert (3. Messung) |
| Liegedauer des EDDY im Einzelfall | M: Tritt 40 (`b_tritt_e`) und 20 (`b_tritt_e2`), Sprungangriff 40 (`b_sprung_e`) und 20 (`b_sprung_e2`), Kniestoß 20 (`b_knie_e`), Wurf 36 (`b_wurf_e`). V: Tritt 16 (`a_e_kette`, `a_e_spaet`) und 44 (`a_e_frueh`), Sprungangriff 44 (`b_sprung_e`, `b_sprungr_e`), Kniestoß 40 (`b_knie_e`), Wurf 40 (`b_wurf_e`, `b_wurf_er`). Dritte Messung: Tritt 20 (`dr_b_e_t30/t35/t40`), Sprungangriff 40 (`dr_b_e_s20/s25`) und 20 (`dr_b_e_s31`), Kniestoß 36 (`dr_b_e_k`), Wurf 36 (`dr_b_e_w`). Weder monoton im Frame des Umwerfens noch an die Umwerfart gebunden, vermutlich ein Zufallswert | M `b_*_e*`, `dr_b_e_*`; V `a_e_kette`, `a_e_spaet`, `a_e_frueh`, `b_*_e*` | unsicher |
| Aufstehen | 18 Frames von Phase 0x0A bis S+4 = 1, Animationswechsel in +1, +9, +17, in +17 Attribut `FF00` | M alle 13 `b_*`, `dr_b_*` (`FF00` nur im Entwurf, nicht in `reaktion.csv`); V 15 Fälle (Wechsel und `FF00` in den 11 ohne Wurf, Spalte `attr_aufstehen`; nach dem Wurf nicht geprüft) | gesichert |
| Umwerfen bis frei (K bis G) | G = Ruhe + Liegen + 18 (Ruhe K+55, nach dem Kniestoß K+58, nach dem Wurf K+70). WOOKY: K+105 (Tritt, Sprungangriff), K+108 (Kniestoß), K+104 (Wurf, = E+105). EDDY je nach Liegedauer: Tritt und Sprungangriff K+89 bis K+117, Kniestoß K+92 bis K+120, Wurf K+104 bis K+132 (beobachtet: Tritt und Sprungangriff K+89, 93, 113, 117; Kniestoß K+96, 112, 116; Wurf K+124, 128) | M `b_*`, `dr_b_*`; V wie Liegen; Regel gilt in allen 22 EDDY-Fällen | gesichert (3. Messung) |
| Verhalten nach dem Aufstehen | Aktion 0, Bewegung ab G+1 (WOOKY in allen Fällen, EDDY in 21 von 22) | M `b_*` (EDDY 5 von 6, WOOKY 7 von 7); dritte Messung `dr_b_*` (EDDY 8 von 8, WOOKY 3 von 3); V `b_*`, `a_e_kette/spaet/frueh` (EDDY 8 von 8, WOOKY 7 von 7) | gesichert (3. Messung) |
| Aktion 0x1C des EDDY nach dem Aufstehen | 85 Frames ohne Bewegung (Animationen `063C76`/`063CAA`/`063CD6`/`063D0A`). M: 1 von 6 Fällen; V: 0 von 8, auch nach 40 Frames Liegen; dritte Messung: 0 von 8. Nicht an die Liegedauer gebunden, Bedeutung (Spott, Pause) nicht geprüft | M `b_tritt_e` | unsicher |
| Verwundbarkeit | kein Schaden von K bis G−1 (Flug, Liegen, Aufstehen), Schaden in jedem geprüften Frame ab G. Kein Schutzfenster nach dem Aufstehen (die Figur hat 35 Frames) | M: 175 Proben in 8 Fällen (je Umwerfart beide Gegner) bei K+40, K+60, K+80, G−18, G−10, G−4, G−2, G−1 und G+0, +1, +2, +4, …, +40, davon 112 Treffer, alle ab G (`bp_tritt_*`, `bp_sprung_*`, `bp_knie_*`, `bp_wurf_*`); Gegenproben G−1/G+0/G+2 in `bp_*_w2`, `bp_*_e2` (15 Läufe); ohne Eingriff `bn_sprung_w_gm1/_g0`, `bn_sprung_e_gm1/_g0` (erster aktiver Frame G−1 trifft erst in G). V ohne Eingriff: `bp_w1`/`bp_w2` (jeder Frame G−48 bis G−1 ohne Treffer, Treffer in G), `bp_tritt_e2` (Treffer G+0; steht im Abschnitt „Alle LP-Verluste“ von `reaktion_v.csv`, die Zeile unter „Schläge der Figur um G“ führt den Druck als Stufe 4 und sucht den Treffer erst ab G+1), `bp_wurf_e3`/`e4`, `bp_wurf_e6` (G−1 ohne, G mit Treffer); die Flugphase hat nur M geprüft | gesichert |
| Reichweite nach dem Rückwärtswurf | Der Gegner schaut in G noch von der Figur weg und dreht sich in G+1 um. M: bei dx −50 Treffer in G. V: bei dx −47 Treffer in G, bei dx −61 (EDDY) und −74 (WOOKY) erst in G+1. Deutung: kürzere Reichweite gegen einen abgewandten Gegner, kein Schutzframe; Grenze nicht gemessen | M `bp_wurf_w2_*`; V `bp_wurf_e6`, `bp_wurf_e1`, `bp_wurf_w1` | unsicher |
| Wieder greifbar | Läuft die Figur schon vorher in den liegenden Gegner, greift sie ihn genau in G (Tritt, Sprungangriff, Kniestoß), nach dem Wurf in G+1 | M `bg_*_gm10`, `bg_*_gm3` (Laufen ab G−10 bzw. G−3, EINGRIFF Position dx 30 bzw. 20), je beide Gegner; V ohne Eingriff `bg_w1` (dx 24), `bg_w2` (dx 38), `bg_wknie` (dx 17): G, `bg_ewurf1` (dx 23), `bg_ewurf2` (dx 30): G+1; Tritt nur M | gesichert |

### C. Mehrere Gegner in einem Schlag

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Treffer | beide Gegner verlieren LP im selben Frame, jeder den vollen Schaden der Stufe (3/4/5) | M `c_zwei_a`, `c_zwei_b`, `c_kette_a`, `c_kette_b` (EINGRIFF Position Slot 16); V ohne Eingriff `c_zwei_a` h 189, `c_zwei_b` h 242, `c_kette_a` 189/207/223, `c_kette_b` 242/262/285 | gesichert |
| Trefferstopp der Figur | einmal 7 Frames: Animationswechsel der Figur in h+11 und h+12 (Folgestufen h+11), wie bei einem Gegner | M wie oben, Vergleich `a_s1_e_p20`, `a_s3_e_b`, `c_einzel_b`; V Abschnitt „Trefferstopp“ in `reaktion_v.csv` | gesichert |
| Kombostufe | zählt je Schlag, nicht je getroffenem Gegner: Stufe 1, 2, 3 mit 3, 4, 5 Schaden an beiden | M und V `c_kette_a`, `c_kette_b` | gesichert |
| Kombo-Fenster | unverändert: Druck in h+27 gibt Stufe 2 (4 Schaden an beiden), in h+28 eine neue Kette (Stufe 1) | M und V `c_fenster27`, `c_fenster28` | gesichert |
| Reaktion | beide reagieren synchron (Zittern in denselben Frames, frei in h+23) | M `c_zwei_a`, `c_zwei_b`; V `c_zwei_*`, `c_kette_*`, `c_fenster*` | gesichert |

### D. Tod

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Ablauf nach Stufe 1, Stufe 3, Tritt, Sprungangriff | Jeder Treffer mit LP unter 0 wirft um, auch Stufe 1 und 3. S+4 = 2 ab t+1, Flug ab t+3 (statt K+9) mit derselben Bahn (x 2,875, Höhe +5,0), Bodenkontakt t+40, Ruhe t+49 (Aktion 6), ab t+58 Aktion 0x0A, Slot frei (S+4 = 0) in t+79. Beide Gegner gleich | M `d_tritt_w` (ohne Eingriff), `d_s1_w`, `d_s1_e`, `d_s3_e`, `d_sprung_w`, `d_gleich_w` (EINGRIFF LP), `dr_d_w_s1`, `dr_d_w_tritt`, `dr_d_e_sprung`; V ohne Eingriff 9 Läufe: `d_s1_w` t 154, `d_gleich_w` t 171, `d_sprung_w` t 102, `d_probe_w1` t 102, `a_w_frueh` t 102, `a_w_spaet` t 138 (Tritt), `d_s1_e` t 248, `d_s3_e` t 248, `d_tritt_e` t 196 | gesichert |
| Tod durch Stufe 2 | Nach dem Bodenkontakt (t+40) rollt der Gegner 32 Frames mit 2 px/Frame weiter, Aktion 6 ab t+72, 0x0A ab t+90, frei t+111. WOOKY und EDDY gleich | V `d_s2_w` t 139 (`anlauf`), `d_s2_wb` t 136 (`anlauf_b`), `d_s2_e` t 198 (`anlauf_c`); dritte Messung `dr_d_w_s2` (EINGRIFF LP); in der ersten Messung nicht gemessen | gesichert (3. Messung) |
| Tod durch Wurf | S+4 bleibt 3, Flug wie beim Wurf (losgelassen t+21), Aktion 6 ab t+79, frei t+101 (= E+102) | V `d_wurf_w` t 73; dritte Messung `dr_d_w_wurf`, `dr_d_e_wurf`, `dr_d_e_wurfr` (rückwärts; EINGRIFF LP) | gesichert (3. Messung) |
| Tod durch Stufe 2 an einer Wand | Der EDDY rollt in `tiefe_b` (Tiefe 336) gegen die Stage-1-Wand (x 1008 bis 1021 für Tiefe ≥ 330, siehe „Wurf der Figur“) und bleibt bei x 1018,5 liegen: Ruhe t+63, frei t+93 | dritte Messung `dr_d_e_s2` (EINGRIFF LP); V `d_s2_e` ohne Wand: frei t+111 | unsicher |
| Treffer auf den sterbenden Gegner | keine: kein LP-Verlust in Proben bei t+15, +25, +40, +55, +70 (WOOKY) und t+18, +33, +48, +68 (EDDY) | M `d_probe_w_t*`, `d_probe_e_t*` (EINGRIFF Position); V ohne Eingriff: liegender toter WOOKY bei dx 83/dz 10 in jedem Frame t+54 bis t+78 geschlagen (`d_probe_w1`, `d_probe_w2`, `d_s1_w_pa`); im Flug nur t+15/t+16, EDDY nur M | gesichert |
| Sterbender Gegner trifft die Figur | nein: kein aktives Angriffsattribut nach t, kein LP-Verlust der Figur. Stirbt der WOOKY im ersten aktiven Frame seines Schlags, bleibt das Attribut in t+1 noch gesetzt, die Figur verliert trotzdem nichts | M alle `d_*`, Sonderfall `d_gleich_w` (t = 28 im ersten aktiven Frame des langsamen Schlags, Attribut `400C` in t und t+1, EINGRIFF LP); V 13 Todesfälle, Sonderfall ohne Eingriff mit dem schnellen Schlag: `d_gleich_ref` (erster aktiver Frame 171, Figur −5 LP), `d_gleich_w` (Tod in 171, Attribut `440C` in t und t+1, Figur behält 72 LP). Der Entwurf M führt den Sonderfall noch als unsicher (ein Lauf); mit dem unabhängigen Lauf von V sind es zwei | gesichert |
| Tod durch Kniestoß | nicht gemessen (endet wie Stufe 1 oder wie Stufe 2?) | – | offen |

Unsicher:

- Wahl des WOOKY-Schlags nach der Reaktion: M (erste Messung ab `kontakt`)
  immer der schnelle (`05FC18`, aktiv h+49); V schnell in 6 Fällen, langsam
  (`05FA54`) in `a_w_kette` (h+54) und in `c_zwei_b` (nach einem einzelnen
  Treffer, Ausholen h+50); dritte Messung schnell in 6 Läufen, langsam in 3
  (`dr_a4_w_p3a/b/c`). Nach drei Treffern mit Pausen (Gegner zwischendurch
  frei) kam 4 von 4 Mal der langsame; ohne Treffer greift er in `kontakt` und
  `reaktion_w3` mit dem langsamen an. Dass nach Einzeltreffern immer der
  schnelle kommt (Entwurf M), stimmt nach `c_zwei_b` nicht. Regel offen.
- Liegedauer des EDDY im Einzelfall: M 20, 36, 40; V 16, 40, 44; dritte
  Messung 20, 36, 40 Frames (Zuordnung siehe Tabelle B). Der WOOKY lag in
  allen drei Messungen 32 Frames (16 nach dem Wurf).
- Aktion 0x1C des EDDY nach dem Aufstehen: M 1 von 6 Fällen (`b_tritt_e`,
  85 Frames), V 0 von 8, dritte Messung 0 von 8.
- Reichweite nach dem Rückwärtswurf: M dx −50 trifft in G; V dx −47 in G,
  dx −61 und −74 erst in G+1; keine dritte Messung.
- Tod durch Stufe 2 an einer Wand: erste Messung nicht gemessen; V ohne Wand
  frei t+111 (`d_s2_e`); dritte Messung an der Wand Ruhe t+63, frei t+93
  (`dr_d_e_s2`), ein Lauf.
- Deutungen: Die Bezeichnungen der Animationszeiger (Gehen, Stand, Ausholen)
  folgen dem Verhalten in diesen Läufen (Bewegung, Attribut), nicht dem ROM.
  Aktion 0x0A beim Tod (t+58, nach Stufe 2 t+90, nach Wurf t+80) ist
  vermutlich das Ausblenden, am Bild nicht geprüft.

Abgleich mit bestehenden Werten (kein Widerspruch gefunden):

- „Nachtrag: Sprungangriff“, Zeile Umwerfen (gesichert (Workflow)), und
  mechanik.md „Sprungangriff“: Flug über 135 px und Ruhe 55 Frames nach dem
  Treffer sind jetzt mit Skript belegt (M `b_sprung_*`, V `b_sprung_*`,
  `b_sprungr_*`); der Zusatz „(Workflow)“ kann dort entfallen.
- „Griff“, Zeile Pose des Gegners (Workflow: liegende Gegner werden erst im
  Frame des Aufstehens gegriffen): präzisiert, Griff genau in G (nach einem
  Wurf in G+1), mit Skript (M `bg_*`, V `bg_*`).
- „Wurf der Figur“, Kniestoß: „Der dritte Kniestoß wirft den Gegner um
  (etwa 165 px weit)“. Hier sind es 143,75 px vom Ort des Gegners im Frame K.
  Der gehaltene Gegner steht beim Kniestoß etwa 17 bis 21 px vor der Figur
  (`wurf.csv`, `wr_a_knie`); das passt zu etwa 165 px von der Figur aus. Die
  Ruhe in K+58 passt zu `wr_a_knie3` (umgeworfen +41, Ruhe +99).
- „Wurf der Figur“ und mechanik.md „Griff und Wurf“: Loslassen E+22,
  Bodenkontakt E+59, Ruhe E+71, Scheitel 69,86 px und Weg 171,5 px ab dem
  Loslassen bestätigt.
- „Umwerfen der Figur durch Gegner“: Der umgeworfene Gegner fliegt auf
  derselben Bahn wie die Figur (8 Frames Stillstand, Scheitel 18 Frames nach
  Flugbeginn, Bodenkontakt nach 37 Frames bei 109,25 px, Ruhe bei 135,125 px).
- „Gefundene Adressen“, Gegner S+0x04/S+0x05: Im Lauf `attack` (Aufgabe 4)
  fallen die LP des WOOKY in 636 unter 0, S+4 wird in 637 zu 2 und in 715 zu
  0 (`a4_lp_gegner.csv`), also frei in t+79 wie hier.
- „Nachtrag: Schaden der Gegner“, Gleichzeitiger Treffer (Workflow): Für den
  Fall, dass der Gegner dabei stirbt, jetzt mit Skript belegt (M und V
  `d_gleich_w`, Figur verliert nichts).
- „Nachtrag: Schaden der Gegner“ nennt für WOOKY und EDDY je zwei normale
  Schläge mit Treffer 4 bzw. 9 Frames nach Angriffsbeginn. Beim WOOKY passt
  das. Der EDDY war nach einer Trefferreaktion nur 9 oder 10 Frames nach dem
  Ausholen aktiv (Ausholanimationen `064688` und `0643F8`: 9 Frames, `0645BC`:
  10 Frames; M und V). Ob `0645BC` ein normaler Schlag oder ein
  Umwerf-Angriff ist, ist nicht geprüft.
- „Messungen im Einzelnen“ (Schutz) nennt Aktion 0x06 des Gegners
  „Angriffspose“; hier ist es die Standpose in Schlagdistanz vor dem
  Ausholen. Dieselbe Aktion, nur andere Wörter.
- Symbol K: In „Wurf der Figur“ und mechanik.md „Griff und Wurf“ ist K der
  Frame des Kniestoßes, hier der Frame des umwerfenden Treffers.

Offen:

- Treffer von hinten (eigene Animation) und andere Gegnertypen (SKIP, DICK).
- Ob der Gegner in der Lücke einer Kette auch etwas anderes tun kann als
  stehen oder gehen (Rückzug, Ausweichen, Griff), wenn sein
  Angriffs-Zeitgeber vorher schon lief. In allen Läufen kam das Ausholen
  frühestens in h+45.
- Warum der Tod durch Stufe 2 rollt, und ob der Kniestoß als Todesart wie
  Stufe 1 oder wie Stufe 2 endet.

## Nachtrag: Verhalten der Nahkämpfer

Belege: `logs/verhalten.csv` (Messagent und dritte Messung) und
`logs/verhalten_v.csv` (Gegenprüfung), beide erzeugt von
`scripts/belege_verhalten.sh`: 220 MAME-Läufe (88 des Messagenten, 76 des
Gegenprüfers, 56 der dritten Messung), etwa 15 min (der Skriptkopf nennt
25 min), bis etwa 9 GB Rohdaten, die das Skript danach löscht. Szenarien:
`verhalten.lua`, `verhalten_huelle.lua` (Eingaben von `hurt*.lua`, länger),
`verhalten_bot.lua` (für `grafik/bot.lua`, dort neue Option
`angriff = false`); Gegenprüfer: `verhalten_v_frei.lua`, `verhalten_v_bot.lua`.
Auswertung: `messen_verhalten.py` (17 Unterbefehle) und
`messen_verhalten_v.py` (14). Reproduzierbarkeit: Der Gegenprüfer hat den
Teil des Messagenten (88 Läufe) von vorn wiederholt, `verhalten.csv` blieb
MD5-gleich (`68a048eda65b7451870503f7d99a93b7`), auch mit seinem Block
(164 Läufe). Der Gesamtlauf mit dritter Messung (220 Läufe, Exit 0) hat
beide CSVs neu geschrieben. `verhalten_v.csv` hat danach dieselbe
Zeilenzahl (1017) wie nach dem Lauf des Gegenprüfers; dessen MD5 ist nicht
festgehalten, Bytegleichheit also nicht belegt. Durch die erweiterte
Auswertung (z. B. Spalte `tempo_letzter_schritt`) ist auch der erste Teil
von `verhalten.csv` nicht mehr bytegleich mit dem geprüften Stand. MD5 beim
Einarbeiten: `verhalten.csv` `0b35920d6035d921fa7ad6554b68217e`,
`verhalten_v.csv` `89a7a882fe76b2359f8a96600f5a6238`. Ein zweiter
Gesamtlauf zur Prüfung der Endfassung steht aus.

**Methode.** Der Messagent hat Läufe ab `anlauf`, `anlauf_b`, `kontakt`
(WOOKY, 16 LP, Slot 18), `anlauf_c`, `kontakt_b`, `tiefe_b` (EDDY, 30 LP,
Slot 17), `ingame` und `stage1` gemessen (500 bis 8000 Frames, Figur passiv
oder mit festem Muster: weglaufen, Tiefenschritte, Sprünge), dazu
Gruppenläufe mit `hurt`-Eingaben, Rechtslauf durch Stage 1 und Bot-Läufe.
Der Gegenprüfer hat unabhängig mit eigenen Szenarien gemessen: andere
Savestates (zusätzlich `held0`, `held2`, `held3`, also Mack, Ginzu, Baby
Head), Startframes, Längen und Positionen; Reaktionen der Figur löst sein
Szenario im Lauf aus (`CC_REAKT`: Gegner steht nah, nach seinen aktiven
Frames oder in einer bestimmten Animation). Die 12 abweichenden Zeilen hat
der Messagent ein drittes Mal gemessen, wieder mit anderen Savestates
(`held0`, `held2`, `held3`, `stage1`, `anlauf_b`, `kontakt_b`), Startframes
und Positionen. Je Frame und Gegnerslot entsteht ein Zustand aus S+4/S+5,
dem Modus S+0x0A und der Kennung des Animationszeigers S+0x1C. Ein Angriff
beginnt mit seiner ersten Kennung, aktiv sind die Frames mit aktivem
Trefferattribut S+0x24.

Konventionen: K = Kamera-x (`FFA82E`, linker Bildrand), F = Frames, Rang =
`FFF82A`, dx und dz = Gegner minus Figur, ganzzahlig am Frame-Ende.
Angriffe: WOOKY W-A bis W-E, EDDY E-A bis E-D (siehe „Ablauf der
Angriffe“). In der Belegspalte stehen Läufe ohne Präfix `verhalten_`; die
des Gegenprüfers beginnen mit `v_`, die der dritten Messung mit `m3_`.
Abschnittsnamen ohne Zusatz beziehen sich auf `logs/verhalten.csv`, mit
`v:` auf `logs/verhalten_v.csv`. Status „gesichert (3. Messung)“: Messagent
und Gegenprüfer wichen ab, die dritte Messung erklärt alle Werte mit einer
gemeinsamen Regel.

**Eingriffe** (EINGRIFF, alle im Kopf der Szenarien beschrieben):

| Eingriff | Läufe | Wirkung, Gegenprobe |
|---|---|---|
| LP der Figur := 72, wenn 0 < LP < 72 (vor jedem Frame) | alle außer `lp0_*`, `v_e_wooky`, `v_e_eddy`, `v_p_natur` | Die Figur stirbt nie, der Rang sinkt nicht durch Tode. Gegenprobe: `a_w1` und `lp0_w1` haben über 3000 F bitgleiche Gegnerverläufe, `a_e1` und `lp0_e1` weichen erst in Frame 1507 ab, 8 F nach dem Tod der Figur ohne Auffüllen; `v_e_wooky` und `v_e_wooky_lp` haben gleiche Pause, Serienabstände und Rate (3,7 bzw. 4,0). Das Auffüllen ändert das Verhalten nicht |
| Rang festgehalten | `r_w_*`, `r_e_*` (Rang 7, 9, 12, 16, 19, 20, 23, 24), `v_r_*` (7, 9, 20, 23) | nur die Pause und die davon abhängigen Abstände ändern sich; Rang 8–20 ist natürlich belegt |
| Gegner relativ zur Figur gesetzt | `akt_eingriff_w` (+280), `akt_eingriff_e` (+236), `b_weg_r_*`, `b_weg_r90_*` (−60), `v_b1r_kontakt_e` (−70), `v_b1r_kontaktb_e` (−80) | Gegenprobe zum Weckreiz; Ausgangslage für Weglaufen nach rechts |
| Gegner-x := K + k in 1-px-Stufen | `m3_schwelle_s1`, `m3_schwelle_h3`, `v_sicht*`, `v_weck*` | Schwellen für Sichtbarkeit und Weckreiz bei stehender Kamera; natürliche Übergänge widersprechen ihnen nicht |
| Gegner per S+4 := 0 entfernt (ohne Tod) | `d_entf*`, `bot_entfernt`, `m3_d_m0/m3/m4/m5`, `v_d_e*` | Wellen und Kamerahalte in Abhängigkeit von der Zahl der Lebenden |
| LP der Gegner := 1 bei Kamerastillstand | `bot_schnell`, `bot_kampf` (Frame 6001) | löst die letzte Welle vorzeitig aus; für EDDY 4/5 zählen deshalb nur `m3_bot_h2`, `m3_bot_h3`, `v_d_bot_mack`, `v_d_bot_s1` (Bot greift an, kein Eingriff an Gegnern) |

### A: Einzelner Gegner, Figur passiv

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| A1 sichtbar (S+5 = 1) | −64 ≤ x − K ≤ 447 für WOOKY und EDDY, wartend wie aktiv, beim Verlassen wie beim Wiedereintreten (384 px Bild plus 63 px rechts, 64 px links); DOLG erst ab x − K 428–431. Der Messagent hatte zuerst −65 bis 446 aus natürlichen Übergängen mit 1–2 px Kamerasprung | gesichert (3. Messung) | `schwelle` (`m3_schwelle_s1`, `_h3`), `aktivierung`; `v_sicht` F 22 (447 → 1), 82 (448 → 0), 142 (−64 → 1), `v_sicht_s17`, `v_sicht_s18` |
| A1 Weckreiz (S+0x0C 0 → 2) | x − K ≤ 383: 383 weckt, 384 nicht. Maßgeblich ist die Kamera, nicht der Abstand zur Figur (Gegenprüfer: 214 und 319 px) oder die Tiefe. Läuft die Figur nach rechts, folgt die Kamera ab Bildschirm-x 200, der Abstand ist dann 178–183 px. Der Messagent hatte zuerst ≤ 382 (Kamera am Frame-Ende statt im Vorframe) | gesichert (3. Messung) | `m3_schwelle_*`, `akt_*`, `akt_eingriff_w/_e`; `v_weck_s16/17/18_k383` und `_k384`, `v_weckr_*` |
| A1 Zeit bis kampffähig (S+4 2 → 1) | versteckter WOOKY 16 F, hockender WOOKY 49 F, hockender EDDY 69 F, ohne Streuung | gesichert | `akt_*`, `d_*`, `bot_*`; `v_weck_s18_k383` F 40 → 56, `v_weck_s16_k383` 40 → 89, `v_weck_s17_k383` 40 → 109 |
| A2 Gehen | Schritt auf einer Ellipse: normal 1,75 px/F in x und 0,875 in der Tiefe, schnell 2,25 × 1,125. Schnell in rund einem Drittel der Gehframes (Messagent 29–30 %, bei stehender Figur 34–41 %; Gegenprüfer 33–41 %) | gesichert | `zusammenfassung` „gehen“; `v:gehen` (35.141 Gehframes) |
| A2 Tiefe | geht diagonal auf die Tiefe der Figur zu und hält bei dz −10 … +11 (\|dz\| Median 3; in 377 Stopps nie −11, 32-mal +11) | gesichert | `annaeherung`; `v:zusammenfassung` „A2 Tiefe“ (99 Fälle, Maximum 11) |
| A2 Anhalten (Kampfhaltung) | \|dx\| 46–48 nach normalem, 55–56 nach schnellem Gehen im letzten Schritt, auf beiden Seiten; daneben einzelne kürzere Stopps. Die Seitenregel der ersten Messung (46–47 rechts, 55–56 links) war eine Häufung der Startlagen | gesichert (3. Messung) | `annaeherung` (Spalte `tempo_letzter_schritt`), `m3_p_*`, `m3_e_*`, `m3_w_*`; `v:zusammenfassung` „A2 Stillstand“ |
| A3 Pause vor jedem Angriff | in Kampfhaltung 29 − 4·⌊Rang/4⌋ F: Rang 7: 25, 8–11: 21, 12–15: 17, 16–19: 13, 20–23: 9, 24: 5 (Rang 24 nur Messagent); ±1 F (ein Übergangsframe nach der Erholung) | gesichert (Rang 7–23); Rang 24 unsicher (nur Messagent, per EINGRIFF) | `zusammenfassung` „pause“ (998 Fälle), `r_*`, `m3_*` (Rang 8–20 natürlich); `v_r_kontakt_r7`, `v_r_tiefeb_r9`, `v_r_anlaufb_r20`, `v_r_anlaufc_r23` |
| A3 erster Angriff | WOOKY beginnt mit W-A, W-C oder W-E, EDDY mit E-A, E-C oder dem Sprungknie E-D; W-B, W-D und E-B kommen nie zuerst | gesichert | `annaeherung`; `v:zusammenfassung` „A3“ |
| A3 Anteile der ersten Angriffsart | Messagent W-A 101, W-C 33, W-E 4 von 138, E-A 41, E-D 41, E-C 36 von 118; Gegenprüfer W-A 40, W-C 21, W-E 2 von 63, E-A 14, E-C 14, E-D 7 von 35 | unsicher (E-D 35 % gegen 20 %) | wie oben |
| A4 Serie | Angriffe folgen ohne Gehen aufeinander (dazwischen nur Kampfhaltung und Erholung); die Serie endet, wenn ein Umwerf-Angriff die Figur umwirft. Das Sprungknie E-D kann eine Serie eröffnen. Gilt bei passiver Figur | gesichert | `zusammenfassung` „serienmuster“, `angriffe`; `v:angriffe` „Serien“ |
| A4 Länge einer Serie bis zum Umwerfen | Messagent, erste Messung: WOOKY 3–5, EDDY 1–6 Angriffe (Median je 3; 130 Serien). Gegenprüfer: 0–5 normale Angriffe vor dem Umwerf-Angriff (CSV: Median 2, 111 Serien; der Entwurfstext nennt Median 3). Dritte Messung (CSV, im Entwurf nicht ausgewertet): WOOKY 3–10 (Median 3, 64 Serien), EDDY 1–5 (Median 1, 17 Serien); dort stehen auch Umwerf-Angriffe ohne Umwerfen mitten in einer Serie (z. B. „A C C A D A C C A D“). „Nachtrag: Reichweite der Gegnerangriffe“ zählt über Unterbrechungen hinweg beim WOOKY 2–13, beim EDDY 0–10 normale Angriffe vor einem Umwerfangriff | unsicher (obere Grenze je Messung verschieden) | `zusammenfassung` „angriffe_je_serie_bis_umwerfen“ (auch Abschnitt der dritten Messung); `v:zusammenfassung` „A4 normale Angriffe vor dem Umwerf-Angriff“ |
| A4 Abstand in der Serie | Angriff bis nächster Angriff ohne Gehen: Rang 10–11 52–84 F (Messagent), 60–79 F (Gegenprüfer, ein Gegner); über alle Ränge 38–90 F (Gegenprüfer, Rang 7–23: 38–87 F), mit steigendem Rang kürzer | gesichert | `zusammenfassung` „rhythmus“ (349); `v:zusammenfassung` „A4 Abstand in einer Serie“ |
| A4 Pause zwischen zwei Serien (Gehen, Spott, Abwarten oder liegende Figur dazwischen) | EDDY 45–2237 F, WOOKY 58–3562 F, wird mit der Laufzeit länger; WOOKY Median je Laufgruppe 290–308 F (Gegenprüfer 294) | gesichert (3. Messung) | „abstand_angriffe_mit_unterbrechung“, `m3_e_lang*`, `m3_w_lang`; `v:zusammenfassung` „A4“ |
| A4 Pause des EDDY, Median | Messagent 149 F (65–925, Läufe `a_*`; Zusammenfassung aller passiven Läufe 152,5 F, 48–1120), Gegenprüfer 404 F (ein Gegner, 148–995) bzw. 293 F (alle passiven Läufe, 64–2237), dritte Messung 221 F (45–2235, 53 Abstände, 6 Läufe) | unsicher | wie oben |
| A4 Angriffe je 1000 F | kein fester Wert, fällt mit der Laufzeit und mit weiteren Gegnern. EDDY: Messagent allein 8,0–8,5, mit WOOKY 1,0–5,7; Gegenprüfer F 1–3000 7,3 (5,3 ohne LP-Auffüllen), danach 3,5–5,0, mit mehreren Gegnern 2,3–4,3; dritte Messung allein 5,6–7,3, mit WOOKY 2,0–3,9, F 1–3000 4,2–5,4, ab F 3001 2,3. WOOKY: Messagent allein 2,5–4,1 (erste Messung, `a_w1`–`a_w4`) bzw. 1,7–4,4 (dritte Messung `m3_w_lang`: F 1–3000 4,4, ab F 3001 1,7), Gegenprüfer 3,7–4,0 (F 1–3000), mit mehreren Gegnern 1,4–9,7 | unsicher | `aktivitaet`; `v:angriffe` (3000-F-Fenster) |

### B: Reaktion auf die Figur

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| B1 Weglaufen nach links (bis zum Bildrand) | Der Gegner folgt in Gehbefehlen und hält dann an (Spott oder Abwarten). WOOKY: 40–42 F (ein Gehbefehl) bei Flucht aus der Kampfhaltung ab 12 F nach dem Anhalten, aus dem Ausholen oder der Erholung; 80–92 F (zwei bis drei) in den drei Fällen mit Flucht in den ersten 5 F nach dem Anhalten (82 und 92 F Gegenprüfer, 83 F dritte Messung; der Entwurf nennt „4 von 5 Fällen“ bzw. „3 Fälle; einmal aus der Erholung“, die CSVs zeigen keinen Fall aus der Erholung); \|dx\| 46–48 → 63–155. EDDY: 0–92 F, 0 F nur bei Flucht aus seiner Erholung (4 von 8 Erholungsfällen in den CSVs, Entwurf: 4 von 7); \|dx\| bis 222. Die fünf ersten WOOKY-Läufe des Messagenten (genau 40 F) waren im Kern ein Fall | gesichert (3. Messung) | `weglauf` (`b_weg_*`, `m3_b1_w_t*`, `m3_b1_e_t*`); `v:reakt` (`v_b1l_*`, 13 Läufe) |
| B1 Weglaufen nach rechts (Gegner links der Figur) | Messagent (EINGRIFF −60 px): WOOKY folgt 180–337 Gehframes mit 1,88 px/F, der Abstand schrumpft einmal (108 → 75) und wächst einmal (56 → 237); EDDY bleibt zurück (4 Gehframes, \|dx\| 110 → 313). Gegenprüfer: WOOKY folgt 80–86 von 100 F mit 1,72–1,76 px/F (nur normale Gehbefehle), 101–299 Gehframes bis zur Kampfhaltung, \|dx\| 46–55 → 82–84; EDDY (EINGRIFF −80 px) 41 F fast nur in der Tiefe, \|dx\| 55 → 131 | unsicher (wenige Fälle, Zahlen weichen ab) | `b_weg_r_*`, `b_weg_r90_*`; `v:reakt` (`v_b1r_*`) |
| B1 nach dem Weglaufen | wieder in Kampfhaltung 8–566 F nach dem Stehenbleiben der Figur, in 5 von 21 Fällen nicht binnen 600 F (Messagent); 13–571 F nach Eingabeende in 16 Fällen, einmal nicht binnen 700 F (Gegenprüfer) | gesichert | `weglauf`; `v:reakt` (Spalte `zurueck_haltung_nach_eingabe`) |
| B2 Tiefenschritt aus der Reichweite | Kampfhaltung, Ausholen und Erholung brechen im selben Frame ab, in dem dz den Bereich −10 … +11 verlässt (nach unten bei +12, nach oben bei −11, die Figur darf in der Tiefe also höchstens 10 px weiter hinten und 11 px weiter vorn stehen; dasselbe Fenster nennt „Nachtrag: Reichweite der Gegnerangriffe“, `mechanik.md` „Reichweite der Gegnerschläge“ bisher pauschal 11 px); der abgebrochene Angriff hat keine aktiven Frames mehr. Danach geht er auf die andere Seite der Figur, spottet, wartet ab oder stellt sich nah in Kampfhaltung. Die erste Messung („im Ausholen und in der Erholung erst danach“) war falsch: Die Figur war dort meist schon getroffen | gesichert (3. Messung) | `tiefe` (`b_tiefe_*`, `m3_b2_*`); `v:tiefe` (`v_b2_*`, 14 Läufe, gezielt `v_b2_aus*`, `v_b2_erh_*`) |
| B2 wieder angriffsbereit | Messagent 9–314 F bis zur Kampfhaltung mit \|dz\| ≤ 11 (Median 93); Gegenprüfer 29–506 F bis zum nächsten Angriff (Median 144); dritte Messung 29–127 F bis zum nächsten Angriff (EDDY 29–30 in 7 Läufen, WOOKY 127 in 6), in 7 von 20 Läufen keiner binnen 500 F | unsicher (Messgrößen und Werte verschieden) | `tiefe`; `v:tiefe` (Spalte `naechster_angriff_nach_schritt`) |
| B3 Springen | Er greift im eigenen Rhythmus an und trifft die Figur in der Luft, jeder Treffer wirft um (16 von 103 bzw. 21 von 127 Sprüngen). Steht er beim Sprung in Kampfhaltung, kommt fast immer ein Angriff in der Luft (9 von 10 bzw. 12 von 12). Er wartet nicht auf die Landung | gesichert | `sprung` (`b_sprung_*`, 6 Läufe); `v:sprung` (`v_b3_*`, 6 Läufe) |
| B3 wiederholtes Springen | danach meist Abwarten (\|dx\| meist 121–127) oder Spott, dazwischen Gehen. Der EDDY greift dabei in allen drei Messungen seltener an als bei stehender Figur | gesichert (3. Messung) | `aktivitaet`, `m3_b3_e*`; `v:sprung` „Phasen“, `v:angriffe` (`v_b3_*dauer`) |
| B3 Angriffe je 1000 F bei wiederholtem Springen | EDDY: Messagent 3,0–5,0 (je Typ 2,2–5,0), Gegenprüfer 0,8–3,2, dritte Messung 2,0–4,7 (allein 4,7, mit WOOKY 2,0–3,1). WOOKY: Messagent 1,3–5,3, Gegenprüfer 1,5–3,5 | unsicher | wie oben |
| B4 Angriffe in den Schutzfenstern (P+4 = 3) | Die Gegner greifen an, die Treffer bleiben wirkungslos. Nach dem Aufstehen (35 F): Angriffsbeginn im Fenster in 43 von 47 (Messagent) bzw. 24 von 31 (Gegenprüfer) Fenstern mit Gegner in Reichweite, aktive Frames im Fenster in 42 bzw. 23. Nach einem Treffer (27 F) seltener: 46 von 333 bzw. 63 von 193 Fenstern mit Gegner in Reichweite mit Angriffsbeginn, 29 bzw. 50 mit aktiven Frames. LP-Verlust im Fenster: 0. Treffer genau im Frame nach dem Fenster: 12 bzw. 4 (Aufstehen), 14 bzw. 17 (Treffer) | gesichert | `schutz` (`a_*`, `r_*`, `c_*`, `b_*`), `zusammenfassung` „schutz“; `v:schutz` (`v_p_*`, `v_e_*`) |

Damit ist die offene Frage aus „Messungen im Einzelnen“ (Schutz) für die
natürlichen Fenster beantwortet: Die Treffer werden ignoriert, die Gegner
greifen trotzdem an. Die dort beschriebene „Angriffspose (Aktion 0x06)“ ist
der Modus S+0x0A = 6 (Kampfhaltung). **Widerspruch, nicht geklärt:** Beim
gekennzeichneten Eingriff `schutz_eingriff` (Aufsteh-Timer bis Frame 830
gehalten, Schutz bis 864, zusammen 168 F) blieb der Gegner dort in dieser
Haltung und schlug sichtbar nicht zu; der nächste Treffer kam 28 F nach
dem Ende des Schutzes (892). Ob ein künstlich verlängerter Schutz das
Verhalten ändert, ist mit der neuen Auswertung nicht nachgeprüft.

### C: Gruppen (mindestens 3 kampffähige Gegner)

Läufe: `c_hurt`, `c_hurt_b`, `c_hurt_c` ab Frame 1000 (8.000 Frames),
`d_rechts`, `bot_ohne` ab Frame 1 (10.100 Frames); dritte Messung `m3_c_h0`,
`m3_c_s1`, `m3_p_h3` ab Frame 1000 (13.000 Frames); Gegenprüfer
`v_p_stage1`, `v_p_held2`, `v_c_gully`, `v_c_tief` ab Frame 1000
(16.551 Frames).

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| gleichzeitig im Angriff (Ausholen bis Ende der Schlaganimation) | 0: 60–88 %, 1: 11–30 %, 2: 0,6–9 % der Gruppenframes; mehr als zwei in höchstens 3 % (Messagent bis 1,3 %, dritte Messung bis 1,4 %, Gegenprüfer bis 3,0 % in `v_p_held2`; die „höchstens 2 %“ im Entwurf übersehen diesen Lauf), Maximum je Lauf 2 bis 5 (Messagent und dritte Messung 3, Gegenprüfer 5 in `v_p_held2`) | gesichert (3. Messung) | `gruppe`, `m3_c_*`; `v:gruppe` |
| gleichzeitig aktiv (S+0x24) | 0: 77–93 %, 1: 6–20 %, 2: 0,1–3,0 %; 3 in höchstens 0,3 %, einmal 4 (Gegenprüfer), immer während die Figur geschützt ist (P+4 = 3). Das „nie 3“ der ersten Messung war falsch | gesichert (3. Messung) | `gruppe`, `m3_c_s1`, `m3_c_h0`; `v_p_stage1` F 2244–2247, 3031–3033, `v_p_held2` F 4082–4086 |
| Lage der übrigen (\|dx\|, Median je Lauf) | Kampfhaltung oder Erholung nah 45–55 (`v_c_tief` 30), Abwarten 121–128, Spott 47–103, Gehen 71–97 (dritte Messung 69–102) | gesichert | `gruppe`; `v:gruppe` |
| beide Seiten | Gegner auf beiden Seiten in Reichweite in 8–38 % (Messagent) bzw. 1–36 % (Gegenprüfer) der Gruppenframes; Angriffe von rechts 33–64 % bzw. 23–70 % je Lauf (dritte Messung 33–84 %); Folgeangriff von der anderen Seite binnen 60 F 1–33 bzw. 12–45 je Lauf | gesichert (Angriffe von beiden Seiten; Anteile streuen je Lauf) | `gruppe`; `v:gruppe` |
| zweiter Angreifer | Abstand zwischen Angriffsbeginnen verschiedener Gegner: Median 22–58 F (0–725), etwa die Hälfte unter 30 F (Messagent; dritte Messung Median 21–39 F, 0–769); Median 12–28 F (0–822), 56–70 % unter 30 F (Gegenprüfer) | gesichert | `gruppe`; `v:gruppe` |

Es gibt also kein striktes „einer nach dem anderen“. Meist greift einer an,
einer oder zwei warten in Kampfhaltung daneben oder auf etwa 125 px Abstand.
Drei bis fünf gleichzeitige Angriffe kommen nur vor, wenn alle dicht um die
geschützte Figur stehen, und bleiben dann wirkungslos (B4).

In den Zeilen „gleichzeitig im Angriff“ und „gleichzeitig aktiv“ ist die
dritte Messung eingerechnet. In den übrigen Zeilen stehen erste Messung und
Gegenprüfung; Werte der dritten Messung außerhalb dieser Spannen stehen in
Klammern.

### D: Wellen in Stage 1

Läufe: `d_rechts`, `d_entf*`, `bot_*` (Messagent), `m3_d_*`, `m3_bot_h2`,
`m3_bot_h3` (dritte Messung), `v_d_sprung`, `v_d_e*`, `v_d_bot_mack`,
`v_d_bot_s1` (Gegenprüfer).

| Gegner bzw. Ereignis | Max-LP | Erscheinen, Aufwachen (K) | Status | Beleg |
|---|---|---|---|---|
| WOOKY 1 (versteckt, Slot 18, x 688) | 16 | ab Start belegt und sichtbar (x − K 432); Weckreiz bei K 306–307, kampffähig 16 F später (K 326–343, je nach Tempo der Kamera) | gesichert | `wellen`, `aktivierung`; `v:wellen`, `v:wecken` |
| EDDY 1 (hockend, Slot 17, x 880) | 30 | S+5 → 1 bei K 435–436, Weckreiz bei K 498–502, kampffähig 69 F später (K 519–629) | gesichert | wie oben |
| WOOKY 2 (hockend, Slot 16, x 960) | 16 | S+5 → 1 bei K 514–517, Weckreiz bei K 578–582, kampffähig 49 F später (K 601–669) | gesichert | wie oben |
| SKIP (x 1184) | 34–36 | bei K 770–771, aber nur, wenn höchstens 2 Gegner leben (erschienen bei 0, 1 und 2, nicht bei 3) | gesichert | `wellen` (`d_entf*`, `bot_*`); `v:wellen` (`v_d_e16`, `v_d_e16_17`, `v_d_e_alle`, `v_d_sprung`) |
| WOOKY 3 und 4 (Gully, x 1152) | 24 (26 bei Rang 11) | neu belegt, sofort sichtbar; der erste bei K 808–820, der zweite 30 F später (K 820–884); auch mit 3 Lebenden und 0 Toten | gesichert | `wellen`; `v:wellen` |
| Kamerahalt bei 848 | – | Leben dort 5 Gegner (3 Anfangsgegner und 2 Gully-WOOKY, oder 2 Anfangsgegner, SKIP und 2 Gully-WOOKY), bleibt die Kamera stehen (über 2583 bzw. 7583 F; Gegenprüfer 6605 bzw. 8605 F). Mit 3 oder 4 Lebenden fährt sie weiter; ein Tod ist nicht nötig, Entfernen genügt | gesichert | `wellen` (`d_rechts`, `d_entf*`, `bot_ohne`, `bot_entfernt`); `v:kamera` (`v_d_sprung`, `v_d_e16`, `v_d_e16_17`, `v_d_e_alle`) |
| EDDY 2 und 3 (Gully, x 1344) | 34 | der erste bei K 994–996, der zweite 30 F später (K 995–1049); ohne Tote; sie kommen nicht, solange die Kamera bei 848 hält | gesichert | `wellen`; `v:wellen`, `v:kamera` |
| WOOKY 5 (im Mech, x 1780) | 24–26 | bei K 1346 (x − K 434–435), aber nur, wenn höchstens 3 Gegner leben; sonst hält die Kamera bei 1376–1378 (`m3_d_m4`, `m3_d_m5` über 3270 F) | gesichert | `m3_d_m0`, `m3_d_m3`, `m3_d_m4`, `m3_d_m5`; `v_d_e_mech2/3/4`, `v_d_e16_17`, `v_d_e_alle` |
| DOLG (Boss) | 110 | sichtbar bei K 1994–1996 (x − K 428–431); ab dann stehen seine LP in S+0x40 | gesichert | `wellen`, `m3_bot_*`; `v:wellen` (Spalten `dolg_lp_*`) |
| WOOKY 6 und 7 (Arena, von links) | 26–28 | neu belegt bei x 2016, bei K 2048 | gesichert | `bot_kampf`, `bot_entfernt`; `v_d_bot_*`; `m3_bot_h2`, `m3_bot_h3` |
| WOOKY 6 und 7, Auslöser | – | Messagent 33–40 F nach S+5 des DOLG (`bot_kampf`, `bot_entfernt`), in `bot_schnell` (LP-Eingriff) erst 109 F nach der letzten Welle; Gegenprüfer 40 F nach S+5 des DOLG. Die Wellen-Tabelle der dritten Messung zeigt ebenfalls 40 F (`m3_bot_h2` S+5 des DOLG F 4542, WOOKY F 4582; `m3_bot_h3` 4115 bzw. 4155), im Entwurf nicht ausgewertet | unsicher | wie oben |
| EDDY 4 und 5 (letzte Welle) | 36–40 | neu belegt bei x = K − 32 (2016 bzw. 2144) im Frame, nachdem die LP des DOLG etwa auf die Hälfte von 110 fallen: ausgelöst bei 54, 52, 50 und 49, nie bei 56–58; 55 kam nicht vor, die Grenze liegt also bei 55 oder 56 (Entwurf: „unter 56“). Das „ohne Eingriff nie“ der ersten Messung kam daher, dass die Bots ohne Angriff den DOLG nie trafen | gesichert (3. Messung) | `v_d_bot_mack` F 5635, `v_d_bot_s1` F 7253; `m3_bot_h2`, `m3_bot_h3` |
| zwei WOOKY von links (Arena) | 30–32 | erscheinen nach der letzten Welle, vor den DICK. Auslöser: Gegenprüfer nach dem Tod eines bzw. beider EDDY 4/5; dritte Messung (`m3_bot_h3`) schon vorher, bei LP 44 des DOLG; erste Messung nicht ausgewertet | unsicher | `v_d_bot_*`, `m3_bot_h3` |
| DICK (zwei) | 26–28 | sobald die LP des DOLG etwa auf ein Viertel von 110 fallen: ausgelöst bei 27 und 26, beim Gegenprüfer noch nicht bei den Werten davor (31 bzw. 30); Entwurf: „≤ 27“, 28 und 29 sind nicht belegt. Der zweite 40 F nach dem ersten | gesichert | `v_d_bot_*`; `m3_bot_h3` |
| Regel für Kamerahalte und Nachschub | – | beobachtet nur bei K 848 (5 Lebende) und 1376–1378 (mehr als 3 Lebende) sowie für SKIP (höchstens 2 Lebende); ob überall die Zahl der Lebenden zählt, ist nicht gemessen | offen | – |

Stage 1 hat also Halte, sie greifen aber nur, wenn die Figur die Gegner davor
nicht besiegt. Die Aussage „Stage 1 kommt ohne Sperre aus“
(`docs/erkenntnisse.md`) gilt nur für normales Spielen.

### Ablauf der Angriffe

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| Angriffsarten | WOOKY W-A, W-C, W-E und die Umwerf-Angriffe W-B, W-D; EDDY E-A, E-C und die Umwerf-Angriffe E-B und E-D (Sprungknie). Beginn-Kennungen S+0x1C siehe „Gefundene Adressen“. Korrigiert „Nachtrag: Schaden der Gegner“ („je zwei normale Schläge“): Der WOOKY hat mit W-E einen dritten, seltenen normalen Angriff (in beiden Messungen als erster Angriff: 4 von 138 bzw. 2 von 63) | gesichert | `katalog`; Tabelle `KENNUNG` in `messen_verhalten_v.py`; `v:zusammenfassung` „A3“ |
| Griff | WOOKY und EDDY packen die Figur in keinem Lauf. Das „Griff mit Knie“ beim WOOKY in `grafik/README.md` bestätigt sich nicht | gesichert (passt zu „Umwerfen der Figur durch Gegner“) | alle Läufe; `logs/wurf.csv` (`wr_u_*`) |
| Gehbefehle | Dauer in Einheiten von 40 F (häufigste Gehdauern 40, 80, 120 F; 650 Gehabschnitte), Richtung in 32 Stufen (11,25°) | unsicher (nur Messagent) | `dauern`, `uebergaenge` |
| Angriff bis zum ersten aktiven Frame | W-A, W-B, E-A, E-B, E-D 9 F; W-C 4 F; W-D 8 F; W-E, E-C 10 F, ohne Streuung (572 Angriffe) | unsicher (nur Messagent; W-A und W-C passen zu „Nachtrag: Schaden der Gegner“, alle Werte zum dort gesicherten „Nachtrag: Reichweite der Gegnerangriffe“) | `angriffe` |
| aktive Frames je Angriff (S+0x24) | mit Treffer: W-A 12, W-B 8, W-C 17, W-D 8, W-E 15; E-A 12, E-B 12, E-C 15, E-D 44 (Sprungknie, bis 23 px hoch). Ohne Treffer: W-A 5, W-B 5, W-C 10, W-D 10, W-E 8; E-A 5, E-B 5, E-C 8, E-D 37. Ein Treffer verlängert die aktive Phase also um den Trefferstopp von 7 F (nicht bei W-B und W-D). Der Entwurf („kürzer, wenn er vorher trifft“) nennt nur die Werte mit Treffer und deutet sie falsch | unsicher (nur Messagent; die Werte ohne Treffer passen zum dort gesicherten „Nachtrag: Reichweite der Gegnerangriffe“) | `angriffe` (Spalten `aktive_frames`, `treffer`), `zusammenfassung` „angriff“ |
| Dauer von Angriff und Erholung | Angriffsanimation W-A und E-A 26 F (alle Angriffe 14–60 F), Erholung 12–31 F (Median 16–17) | unsicher (nur Messagent) | `dauern` |
| Serienmuster | WOOKY meist „A A B“, „A A D“, „A A A B“, „C C A D“ (W-D folgt direkt auf die Erholung von W-A); EDDY „A A A B“, „C C A A B“, „A A B“ oder ein einzelnes Sprungknie D (130 Serien) | unsicher (nur Messagent) | `zusammenfassung` „serienmuster“ |
| nach dem Umwerfen | WOOKY: zurückweichen 53, Seitenwechsel 14, sonst 8 von 75; EDDY: Seitenwechsel 24, annähern 15, zurückweichen 9 von 55. Dritte Messung (CSV, im Entwurf nicht ausgewertet): WOOKY zurückweichen 33, Seitenwechsel 18, sonst 13 von 64; EDDY zurückweichen 10, Seitenwechsel 4, sonst 3 von 17 | unsicher (nur Messagent; beim EDDY je Messung eine andere häufigste Reaktion) | „nach_umwerfen“ |
| Dauer von Spott und Abwarten | WOOKY 50, 80, 110 oder 140 F; EDDY 30, 60, 90 oder 120 F (Raster 30 F, 408 Fälle) | unsicher (nur Messagent) | `dauern` |
| Seitenwechsel zwischen zwei Angriffen | WOOKY 16 von 289, EDDY 44 von 213 Abständen, fast immer, während die Figur liegt (dritte Messung, CSV: WOOKY 38 von 383, EDDY 20 von 98) | unsicher (nur Messagent) | „seitenwechsel_zwischen_angriffen“ |
| Angriff nach dem Aufstehen der Figur | Kampfhaltung beginnt mit dem Aufstehen, Angriff nach der Rangpause 5–34 F nach Fensterbeginn (Median 17–18), aktive Frames ab Frame 26–31 des 35-F-Fensters | unsicher (nur Messagent; dass im Fenster angegriffen wird, ist gesichert, B4) | `schutz`, `zusammenfassung` „schutz“ |
| Wahl der Angriffsart, der Gehstufe und zwischen Spott und Abwarten | nur Häufigkeiten belegt (A2, A3, oben); wonach der Gegner wählt, ist nicht gemessen | offen | – |

Deutung des Messagenten: Die Steuerung entscheidet neu nach jedem
Gehbefehl, nach Spott oder Abwarten und nach jedem Angriff. Gesichert ist
davon, dass sie in Kampfhaltung, Ausholen und Erholung jeden Frame prüft, ob
die Figur in der Tiefe noch erreichbar ist (B2).

Unsicher:

- A3 Pause bei Rang 24: 5 F, nur Messagent (EINGRIFF `r_*_24`);
  Gegenprüfer bis Rang 23, dritte Messung natürlich bis Rang 20. Die Formel
  ist für Rang 7–23 gesichert.
- A3 Anteile der ersten Angriffsart: Messagent E-D 41 von 118 (35 %),
  Gegenprüfer 7 von 35 (20 %); WOOKY W-A 101 von 138 bzw. 40 von 63; dritte
  Messung entfällt.
- A4 Länge einer Serie bis zum Umwerfen: Messagent WOOKY 3–5, EDDY 1–6
  (Median 3); Gegenprüfer 0–5 normale Angriffe davor (Median 2); dritte
  Messung WOOKY 3–10, EDDY 1–5 (Median 3 bzw. 1).
- A4 Median der EDDY-Pause zwischen Serien: Messagent 149 F, Gegenprüfer
  404 F (ein Gegner) bzw. 293 F (alle passiven Läufe), dritte Messung 221 F.
  Die Spanne 45–2237 F ist gesichert.
- A4 Angriffe je 1000 F: EDDY allein Messagent 8,0–8,5, Gegenprüfer 7,3
  (F 1–3000) und 3,5–5,0 danach, dritte Messung 5,6–7,3 (F 1–3000 4,2–5,4,
  ab F 3001 2,3); mit weiteren Gegnern 1,0–5,7, 2,3–4,3 bzw. 2,0–3,9. WOOKY
  allein Messagent 2,5–4,1, Gegenprüfer 3,7–4,0, dritte Messung 1,7–4,4.
  Kein fester Wert.
- B1 Weglaufen nach rechts: WOOKY Messagent 180–337 Gehframes mit
  1,88 px/F, Gegenprüfer 80–86 von 100 F mit 1,72–1,76 px/F (101–299
  Gehframes bis zur Kampfhaltung); EDDY bleibt in beiden zurück
  (4 Gehframes bzw. 41 F fast nur in der Tiefe); dritte Messung entfällt.
- B2 wieder angriffsbereit: Messagent 9–314 F bis zur Kampfhaltung
  (Median 93), Gegenprüfer 29–506 F bis zum nächsten Angriff (Median 144),
  dritte Messung 29–127 F bis zum nächsten Angriff, in 7 von 20 Läufen
  keiner binnen 500 F.
- B3 Angriffe je 1000 F bei wiederholtem Springen: EDDY Messagent 3,0–5,0,
  Gegenprüfer 0,8–3,2, dritte Messung 2,0–4,7; WOOKY 1,3–5,3 bzw. 1,5–3,5,
  dritte Messung entfällt.
- WOOKY 6 und 7, Auslöser: Messagent 33–40 F nach S+5 des DOLG (in
  `bot_schnell` 109 F nach der letzten Welle), Gegenprüfer 40 F; dritte
  Messung im Entwurf nicht ausgewertet (CSV: 40 F in `m3_bot_h2` und
  `m3_bot_h3`).
- Zwei WOOKY (30–32 LP) in der Arena, Auslöser: Gegenprüfer nach dem Tod
  der EDDY 4/5, dritte Messung vorher bei LP 44 des DOLG; erste Messung
  nicht ausgewertet.
- Ablauf der Angriffe (Gehbefehle, erster aktiver Frame, aktive Frames mit
  und ohne Treffer, Dauer von Angriff, Erholung, Spott und Abwarten,
  Serienmuster, nach dem Umwerfen, Seitenwechsel, Angriff nach dem
  Aufstehen): Werte in der Tabelle oben, nur Messagent; Gegenprüfer nicht
  geprüft, dritte Messung nicht gezielt (wo ihre CSV-Werte vorliegen, stehen
  sie in der Tabelle). Erster aktiver Frame und aktive Frames ohne Treffer
  stimmen mit „Nachtrag: Reichweite der Gegnerangriffe“ überein.

Offen:

- Regel für Kamerahalte und Nachschub in Stage 1 allgemein (beobachtet bei
  K 848 und 1376–1378 sowie für SKIP) und deren Mechanismus.
- Wonach die Gegner Angriffsart, Gehstufe und Spott oder Abwarten wählen.
- Auslöser der längeren Folge des WOOKY beim Weglaufen (80–92 statt 40 F);
  im Zustand nicht gefunden.
- Ursache des unsymmetrischen Tiefenbereichs −10 … +11 (Vergleich oder
  Rundung von z); für die Gegnerlogik genügt der Bereich.
- Widerspruch zum gekennzeichneten Eingriff `schutz_eingriff`: Bei 168 F
  gehaltenem Schutz schlug der Gegner laut „Messungen im Einzelnen“ nicht
  zu, in den natürlichen Fenstern greifen die Gegner an (B4). Mit der
  neuen Auswertung nicht nachgeprüft.
- Max-LP spät erscheinender WOOKY: In `m3_bot_h2` (Ginzu) haben WOOKY 36
  bzw. 40 Max-LP (F 1703, 9197, 9983), mehr als die 22 bis 34 aus
  „Nachtrag: Schaden der Gegner“ (Workflow, Captain). Nicht ausgewertet.
- Verhalten von SKIP, DICK und DOLG (nicht im Animationskatalog; in Gruppen
  zählt bei ihnen nur der aktive Angriff).

## Nachtrag: Reichweite der Gegnerangriffe

Belege: `logs/greichweite.csv` (Messagent, erste und dritte Messung) und
`logs/greichweite_v.csv` (Gegenprüfung), beide erzeugt von
`scripts/belege_greichweite.sh`. Szenarien: `greichweite_angriff.lua`
(immer über `rang.lua`), Gegenprüfer `greichweite_v_frei.lua`; für DICK
zusätzlich `greichweite_bot.lua` (ohne Ergebnis). Auswertung:
`messen_greichweite.py gegnerangriff` und `gegnerzusammenfassung` (auch über
`messen_a5.py` erreichbar) sowie `messen_greichweite_v.py`. Der Gesamtlauf
umfasst 565 Läufe des Messagenten (494 davon aus der ersten Messung) und
Teil V am Ende des Skripts (6 natürliche Läufe, 272 Proben); er dauerte
18:46 min und endete mit Exit 0. Teil V muss am Ende bleiben, weil der Teil
des Messagenten alles unter `logs/raw/greichweite_*` löscht, auch
`greichweite_v_*`. Voraussetzung sind die Savestates `ingame`, `kontakt`
und `kontakt_b` (`laeufe_a5.sh`) sowie `anlauf`, `anlauf_b`, `anlauf_c` und
`tiefe_b` (`laeufe_a7.sh`). Zur Reproduzierbarkeit: Der Stand der ersten
Messung (1005 Zeilen) entstand beim Gegenprüfer zweimal mit derselben MD5
`57083e566e3dc02f4cf04ec8475e4948` wie beim Messagenten. `greichweite_v.csv`
(1065 Zeilen) war im zweiten Lauf des Gegenprüfers und im Gesamtlauf der
dritten Messung gleich (MD5 `a445db13356f818e2f1b3624fe2b119d`). Die
Endfassung von `greichweite.csv` (mit dritter Messung, 1536 Zeilen, MD5
beim Einarbeiten `a26f20bc11cfc6f019ecdb935a4e546c`) ist erst einmal
erzeugt.

**Methode.** Der Messagent lässt jeden Angriff natürlich beginnen. Das
Szenario erkennt A am k-ten Wechsel des Animationszeigers S+0x1C auf die
erste Animation des Angriffs (`CC_AB`). Ab dem ersten aktiven Frame A+s
setzt ein EINGRIFF die passive Figur vor jedem Frame auf einen festen
Abstand dx, eine Tiefe dz oder eine Höhe (`WS1La1`, `SMWL_x*`: ab A+1). Einen Treffer zeigt der
LP-Verlust (P+0x40 < P+0x42), wobei P+0x82 auf den Gegnerslot zeigt. Für
die aktiven Frames steht die Figur bis A+k außer Reichweite und danach in
Reichweite (`_f<k>`): bei WOOKY und EDDY 60 px hoch, beim SKIP 20 px in der
Tiefe versetzt, beim Sprungtritt 200 px weg. In der ersten Messung stammen
die Quellen aus `kontakt`, `kontakt_b` und `ingame`; der Gegner merkt sich
dabei einen Zielabstand von ±46 bis ±48 (`WS3R`: −12). Dazu kommen sechs
natürliche Läufe (`lang_*`). Der Gegenprüfer hat sechs eigene natürliche
Läufe ab `ingame` gemacht (`n1`, `n4` bis `n8`, 3000 bis 9000 Frames,
Rang ohne Eingriff 10 bis 24, 625 Angriffsbeginne). Sie legen 32
Savestates `greichweite_v_*` an, je 3 Frames (`wa_r20`, `eb_r20`: 20 Frames)
vor einem natürlich gewählten Angriff. Ab diesen Savestates setzt er die
Figur, zur Kontrolle auch den Gegner, ab A+1 relativ zum Gegner und wertet
aus, ob der Angriff trifft (T), aktiv ohne Treffer bleibt (L) oder abbricht
(X). 11 von 272 Proben zählen nicht (`gueltig = nein`): Am Bild- oder
Spielfeldrand griff der Eingriff nicht, oder ein anderer Gegner traf die
Figur vor dem ersten aktiven Frame. Für die 21 abweichenden Zeilen hat der
Messagent ein drittes Mal gemessen. Dabei hält er die Figur vor dem Angriff per EINGRIFF bis A−1 bei dx 25 bzw. −30,
damit der Gegner sich andere Zielabstände merkt (S+0x96 = 25, −30, 3; Quellen
`W3*`, `E3*`), und prüft beide Grenzen des vorhergesagten Fensters. Dazu
kommen acht natürliche Läufe ab `anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`,
`kontakt_b` und `ingame` auf anderen Wegen (`lang3_*`, 3600 bis 4200 Frames,
ohne Positionseingriff).

Bezeichnungen: A = erster Frame der Angriffsanimation, A+s = erster aktiver
Frame (Startup s). dx = x(Gegner) − x(Figur), dz = z(Gegner) − z(Figur)
(dz > 0: Figur weiter vorn), alles ganzzahlig am Frame-Ende. „Blick links“:
Der Gegner schaut nach links. d = Abstand der Figur vor dem Gegner (dx bei
Blick links, −dx bei Blick rechts), negativ hinter ihm. Ziel = Wort S+0x96
des Gegners in A. In Klammern hinter dem Angriff steht die erste Animation
(S+0x1C), über sie lassen sich die Namen mit anderen Abschnitten abgleichen.
In der Belegspalte stehen Laufnamen ohne den Vorsatz `greichweite_`, die des
Gegenprüfers nach „V:“ ohne `greichweite_v_`. Teil 1 bis 5 ohne Zusatz
meinen `greichweite.csv`.

**Eingriffe** (EINGRIFF):

- Messagent, alle Läufe: Rang `FFF82A` ab Frame 2 auf 12 (`rang.lua`,
  `CC_RANG=12`), LP der Figur vor jedem Frame auf 72 (`CC_LP=1`).
- Vor dem Angriff (`CC_VOR`): Figur relativ zum Gegner gesetzt, zwei Frames
  lang (damit er sich umdreht) bzw. bis A−1 (Gegner bleibt in Bildmitte,
  dritte Messung bei dx 25 bzw. −30).
- Ab A+s: Position, Tiefe oder Höhe der Figur (`CC_DX`, `CC_DZ`, `CC_H`,
  `CC_FERN*`). `lang_*` und `lang3_*` laufen ohne Positionseingriff.
- Gegenprüfer: LP der Figur auf 72 in allen Läufen, Rang nur in `*_rang12`.
  Proben setzen die Figur von A+1 bis A+37 (`_gegner`: den Gegner,
  `_spaet`: erst ab A+5, Sprungtritt nur bis A+9, `_spaet<k>`: Figur bis
  A+k−1 40 px in der Tiefe versetzt, ab A+k bei dx −5). `_dreh` gibt in A+1
  einen Frame lang eine Richtung ein (die Figur dreht sich).
- Am Bildrand schiebt das Spiel die Figur im selben Frame zurück. Solche
  Proben zählen nicht (`SMSR`, `SASR` vorn, `W3S2L` oben; V: `gueltig`).

### Ablauf je Angriff

Werte: Startup; aktive Frames ohne Treffer; S+0x24; Schaden; Umwerfen am
Boden. Der Schaden gilt für die Gegner vom Stage-Beginn. Später erscheinende
WOOKY machen bei Rang 12 8 LP (alle drei Messungen), beim Gegenprüfer 9 bzw.
10 bei Rang 15–21 bzw. 22–24; der Ausfallstich des SKIP macht dort bei Rang
22–24 13 LP, wie im „Nachtrag: Schaden der Gegner“. Zahlen in Klammern sind
Angriffsbeginne in den natürlichen Läufen (`lang3_*` der dritten Messung
bzw. des Gegenprüfers).

| Angriff | Werte | Beleg | Status |
|---|---|---|---|
| WOOKY Schlag A (`5fa54`) | 9; A+9–A+13; 0x400C; 5; nein | `WS1*`, `W3S1*` (98); V: 193 Beginne, `p_w1r`, `p_wa_r` | gesichert |
| WOOKY Schlag B (`5fc18`) | 4; A+4–A+13; 0x440C; 5; nein | `WS2*`, `W3S2*` (59); V: 132, `p_wb_l` | gesichert |
| WOOKY Schlag C (`5fd24`) | 10; A+10–A+17; 0x440C; 5; nein | `WS3*`, `W3S3R` (6); V: 14, `p_wc_l`, `p_wc_r2` | gesichert |
| WOOKY Umwerfschlag A (`5fb50`) | 9; A+9–A+13; 0x4C0C; 5; ja | `WK1*`, `W3K1R` (20); V: 29, `p_wk1_r`, `p_wk1_l` | gesichert |
| WOOKY Umwerfschlag B (`5fc8c`) | 8; A+8–A+17; 0x4C0C; 5; ja | `WK2*`, `W3K2*` (25); V: 47, `p_wk2_l`, `p_wk2_r` | gesichert |
| EDDY Schlag A (`643f8`) | 9; A+9–A+13; 0x400C; 6; nein | `ES1*`, `E3S1*` (38); V: 47, `p_ea_*` | gesichert |
| EDDY Schlag B (`645bc`) | 10; A+10–A+17; 0x440C; 6; nein | `ES2*`, `E3S2*` (38); V: 69, `p_eb_*` | gesichert |
| EDDY Umwerfschlag (`644f4`) | 9; A+9–A+13; 0x4C0C; 6; ja | `EK2*`, `E3K2L` (13); V: 15, `p_ek2_*` | gesichert |
| EDDY Sprungtritt (`64688`) | 9; A+9–A+45 (in der Luft); 0x4C0C; 6; ja | `EK1*` (19); V: 22, `p_ek1_*` | gesichert |
| SKIP Messerstich (`287e0`) | 13; A+13–A+16; 0x8402; 8 (Rang 12); nein | `SMSL`, `SMSR` (19); V: 31, `p_sm_r_x-30_z0_rang12` | gesichert |
| SKIP Ausfallstich (`28642`) | 14; A+14–A+16; 0x8A02; 11 (Rang 12); ja | `SASR` (1); V: 5 in `n6`, `p_sa_r_x-30_z0_rang12` | gesichert |
| SKIP Wirbel-Varianten | S+0x24 ist in jedem Animationsschritt außer dessen erstem Frame 0x8C00, getroffen wird nur im Stich (Messer A+13, Ausfall A+14). Stich-Attribut, Schaden und Umwerfen wie ohne Wirbel: Messer-Wirbel 0x8402, Ausfall-Wirbel 0x8A02. Der Entwurfstext nannte für beide 0x8402 | `SMWL_*`, Teil 1 `*-Wirbel` (Spalte `attr_treffer`, auch in den Daten der ersten Messung); V: `p_smw_l_*`, `p_sw_r_*`, `n4` A 3499 | gesichert (3. Messung) |
| Trefferstopp | Trifft WOOKY oder EDDY, bleibt die aktive Pose 7 Frames länger (Schlag A A+9–A+20). Ausnahme: Wirft ein Treffer des WOOKY die Figur um (Umwerfschläge A und B, jeder Treffer in der Luft), endet die aktive Pose 7 Frames nach dem Treffer (Umwerfschlag A A+9–A+16, Schlag C gegen die Figur in 48 px Höhe A+10–A+17); nach den Umwerfschlägen geht er sofort nach. Beim EDDY bleibt es auch dann bei 7 Frames länger. SKIP hat keinen Trefferstopp (Messerstich mit Treffer A+13–A+16, Ausfallstich A+14–A+16) | Teil 1 `aktiv_mit_treffer`, `WK1*_nat`, `W3K1R_nat`, `W3K2L_nat`, `W*_h48`, `E*_h48` (Teil 4); V: Teil 1, Zusatz „Umwerfangriff: 7 Frames nach dem Treffer Gehen“ (60 von 60), `p_wa_r_*_h50`, `p_wb_l_*_h50`, `p_wc_l_*_h50`, `p_ea_r_*_h50`, `p_eb_r_*_h50` (Spalte `aktiv_bis`) | gesichert (3. Messung) |
| Flug des Sprungtritts | EDDY steigt bis 52 bzw. 53 px und fliegt ab A+5 mit 3 px/Frame auf die Figur zu | Teil 5 `EK1L_nat`; V: `p_ek1_l2_xnat` (52), `p_ek1_r_xnat` (53) | gesichert |

### Abbruchfenster und Reichweite x

Wichtigster Befund (vom Gegenprüfer gefunden, in der dritten Messung
bestätigt): WOOKY und EDDY haben keine feste Reichweite. Sie merken sich
einen Zielabstand im Wort S+0x96 und brechen ab, sobald die Figur zu weit
davon abweicht. Die festen Bereiche des ersten Entwurfs (15–78 usw.) sind
nur der Fall Ziel ±46 bis ±48. In den Zeilen je Angriff steht das Ziel je
Messung und dahinter in Klammern der Bereich ohne Abbruch, wie im Entwurf
in d oder dx.

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Abbruchfenster WOOKY und EDDY | Ab A+1 bis zum letzten aktiven Frame bricht der Gegner ab, ohne zu treffen, und geht nach, sobald dx das Fenster [Ziel − 31, Ziel + 32] verlässt. Die Figur darf also höchstens 32 px links und 31 px rechts vom Zielpunkt stehen. Der Abbruch kommt im ersten Frame außerhalb oder bis 2 Frames später, getroffen wird in diesen Frames nie: Der Gegenprüfer (Figur ab A+1 bzw. A+5 gesetzt) sah ihn immer im ersten Frame außerhalb, der Messagent (Figur erst ab dem ersten aktiven Frame gesetzt) meist dort, auf der nahen Seite und in `WS3R_x-44` (ferne Seite) 1 bis 2 Frames später. Die Blickrichtung der Figur spielt keine Rolle (dritte Messung: gleiche Fenster bei beiden Blickrichtungen der Figur), ebenso wenig, ob Figur oder Gegner versetzt wird (Kontrolle des Gegenprüfers). In allen 49 Quellgruppen von Teil 2 (erste und dritte Messung, auch `d5`, `a1`, `a10`) passen 188 von 188 x-Proben | Teil 2 Zeilen `ziel`; `WS1La1_x200` (Abbruch A+1), `WS1La10_x90` (A+10, in der aktiven Phase), `EK2L_x79` (A+9), `EK2L_x14` (A+11), `WS3R_x-44` (A+11); V: Teil 5 `fenster` (19 Quellen), Teil 4 Spalte `ende`, `p_w1r_*_gegner`, `p_w1r_*_spaet` (Abbruch A+5) | gesichert (3. Messung) |
| WOOKY Schlag A | erste: 46 (d 15–78), −46 (d 14–77). V3: 14 (dx −17 bis 46), −1 (−32 bis 31), −48 (d 16–79). dritte: 25 (dx −6 bis 57, −7 und 58 Abbruch), −30 (−61 bis 2, −62 und 3 Abbruch) | `WS1L`, `WS1R`, `W3S1L`, `W3S1R`; V: `p_w1l_*`, `p_w1r_*`, `p_wa_r_*` | gesichert (3. Messung) |
| WOOKY Schlag B | erste: 48 (d 17–80), 46 (15–78), −47 (15–78). V3: 48 (17–80), −48 (bis 79, Untergrenze am Bildrand). dritte: −30 (−61 bis 2), 3 (Untergrenze −28, oben Bildrand) | `WS2L`, `WS2Lb`, `WS2R`, `W3S2L`, `W3S2R`; V: `p_wb_l_*`, `p_wb_r_*` | gesichert (3. Messung) |
| WOOKY Schlag C | erste: 48 (d 17–80), −12 (dx −43 bis 4 getroffen, ab −44 Abbruch). V3: 48 (17–80), −48 (ab 16), −17 (d −15 bis 48). dritte: −30 (−61 bis 2; innen leer, weil die Figur geschützt war) | `WS3L`, `WS3R`, `W3S3R`; V: `p_wc_l_*`, `p_wc_r_*`, `p_wc_r2_*` | gesichert (3. Messung) |
| WOOKY Umwerfschlag A | erste: 46 und −46 (d 15–78 bzw. 14–77). V3: 48 (ab 17, oben Bildrand), −48 (16–79). dritte: −30 (−61 bis 2) | `WK1L`, `WK1R`, `W3K1R`; V: `p_wk1_l_*`, `p_wk1_r_*` | gesichert (3. Messung) |
| WOOKY Umwerfschlag B | erste: 46 (d 15–78), −47 (15–78). V3: 48 (17–80), −45 (13–76). dritte: 25 (−6 bis 57), −30 (−61 bis 2) | `WK2L`, `WK2R`, `W3K2L`, `W3K2R`; V: `p_wk2_l_*`, `p_wk2_r_*` | gesichert (3. Messung) |
| EDDY Schlag A | erste: 46 und −46 (d 15–78 bzw. 14–77). V3: 48 (ab 17), −48 (16–79), −17 (d −15 bis 48). dritte: 25 (−6 bis 57), −30 (−61 bis 2) | `ES1L`, `ES1R`, `E3S1L`, `E3S1R`; V: `p_ea_l_*`, `p_ea_r_*`, `p_ea_r2_*` | gesichert (3. Messung) |
| EDDY Schlag B | erste: 46 und −46 (d 15–78 bzw. 14–77). V3: 48 (ab 17), −48 (16–79). dritte: 25 (−6 bis 57), −30 (−61 bis 2) | `ES2L`, `ES2R`, `E3S2L`, `E3S2R`; V: `p_eb_l_*`, `p_eb_r_*` | gesichert (3. Messung) |
| EDDY Umwerfschlag | erste: 46 (d 15–78), −48 (16–79). V3: 32 (dx 1 bis 64), −42 (d 10–73). dritte: 25 (−6 bis 57) | `EK2L`, `EK2R`, `E3K2L`; V: `p_ek2_l_*`, `p_ek2_r_*` | gesichert (3. Messung) |
| Hinterkante | Innerhalb des Fensters trifft der Angriff in seinem ersten aktiven Frame, wenn die Figur vor dem Gegner oder höchstens 3 bis 4 px hinter ihm steht, weiter hinten geht er ins Leere. Das gilt für eine Figur, die vom Gegner wegschaut: So stand sie in allen Grenzproben außer `E3K2L_xm6` (Spalten `blick_figur`, `pface`); zur anderen Blickrichtung siehe „Unsicher“ | erste: `WS3R_x3`, `_x4` T. V: `p_w1l_x-3` T, `x-4` L; `p_w1r_x4` T, `x5` L, ebenso `p_ea_r2`, `p_wc_r2`. dritte: `*_x2` bei Ziel −30 T, `W3S1L`, `W3K2L`, `E3S1L`, `E3S2L` `_xm6` leer | gesichert (3. Messung) |
| Vorderkante | Die Trefferfläche reicht mindestens bis an den Fensterrand (Treffer bei d 79 und 80 mit Ziel ±48). Ihr eigenes Ende ist so nicht messbar | `WS2L_x80`; V: `p_wb_l_*`, `p_wa_r_*` | gesichert |
| EDDY Sprungtritt | bricht nie ab. In A+9 trifft er am Frame-Ende von d 0 bis 59 (Blick links) bzw. −1 bis 58 (Blick rechts). EDDY fliegt im Frame 3 px weiter, gesetzt wird deshalb 3 px weiter weg | `EK1L_x*`, `EK1R_x*`; V: `p_ek1_l2_x2/x3/x62/x63`, `p_ek1_r_x-1/x-2/x-61/x-62` | gesichert |
| SKIP Messerstich | bricht nie ab. Blick links, Figur schaut bei A vom SKIP weg (Bezeichnung der Entwürfe): dx −15 bis 108, −16 und 109 leer. Blick rechts, Figur schaut bei A zum SKIP: bis 8 px hinter ihm, 9 leer. Die Grenzen gelten nur für diese Blickrichtungen der Figur (siehe „Unsicher“) | `SMSL_x*`, `SMSR_x8`, `_x9`; V: `p_sm_l2_*`, `p_sm_r_x8/x9` | gesichert |
| SKIP Ausfallstich | bricht nie ab. Blick rechts, Figur schaut zum SKIP: Treffer bei d 0, 10 px hinter ihm leer, vorn mindestens 56 px | `SASR_x0`, `_x10`, `SASR_z*` (bei dx −56); V: `p_sa_r_*` | gesichert |

### Tiefe, Höhe, Umwerfen, Serien

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Tiefe WOOKY und EDDY | dz −10 bis +11 trifft, bei −11 und +12 Abbruch (Figur höchstens 10 px weiter hinten bzw. 11 px weiter vorn), unabhängig vom dz bei A | `*_z*`, `*x30_z*`; V: 16 Quellen (alle acht Angriffe, je beide Blickrichtungen) | gesichert |
| Tiefe EDDY-Sprungtritt | ±12 trifft, ±13 nie | `EK1*_z*`; V: `p_ek1_l2_*`, `p_ek1_r_*` | gesichert |
| Tiefe SKIP | Messerstich ±12 trifft, ±13 nie. Ausfallstich +12 trifft, +13 nie | `SMSL_z*`, `SASR_z12`, `_z13`; V: `p_sm_r_*`, `p_sm_l2_*`, `p_sa_r_*` | gesichert |
| Höhe WOOKY und EDDY | Treffer bis 48 px Höhe der Figur am Frame-Ende. Liegt sie in der ganzen aktiven Phase bei 49 bis 51 px (natürlicher Sprung), trifft der Schlag nicht | `*_h48`, `*_h49`, `WS1L_j*`, `ES1L_j*`; V: `p_*_h50`, `p_*_h53`, Sprünge ab `wa_r20` und `eb_r20` | gesichert |
| Höhe SKIP-Messerstich | Treffer bis 71 px, bei 72 erst nach dem Absinken, ab 73 nie | `SMSL_h71/72/73`; V: `p_sm_l2_*_h75/h76`, `p_sm_r_*_h75/h76` | gesichert |
| Umwerfen | Am Boden werfen um: Umwerfschläge A und B des WOOKY, Umwerfschlag und Sprungtritt des EDDY, Ausfallstich und Ausfall-Wirbel des SKIP (Bit 0x0800 in S+0x24 im treffenden Frame; die nie treffenden Wirbelphasen mit 0x8C00 zählen nicht). Nicht: die Schläge A, B, C, der Messerstich und der Messer-Wirbel (0x8402). Jeder Treffer in der Luft wirft um. Der Entwurfstext zählte den Messer-Wirbel mit, seine Daten nicht | Teil 1 `umgeworfen`; V: `n4` A 3499, `p_smw_l_x0/x10/x40`, `n5` A 4510, `n8` A 1929 | gesichert (3. Messung) |
| Serien | Normale Angriffe vor einem Umwerfangriff (seit dem vorigen oder seit Laufbeginn): WOOKY 2–13 (meist 2–5), EDDY 0–10, SKIP 0–8. Je Messung: erste 2–7 / 0–4 / 0–2, V3 2–13 / 0–10 / 0–8, dritte 2–6 (45 Umwerfangriffe) / 0–10 (32) / 0–4 (4). Eine feste Anfangsfolge gibt es nicht, A, A, Umwerf A kam nur in 3 von 21 Serienanfängen (V3) bzw. in 3 der 37 Folgen nach einem Umwerfangriff (dritte, Spalte `anfaenge`; der Entwurf schreibt „3 von 45“ und zählt gegen alle Umwerfangriffe) | Teil 1b, 1c `normale_vor_umwerf`; V: Teil 3 `serien` | gesichert (3. Messung) |
| Umwerfschlag B des WOOKY | kommt nur direkt aus der Wartepose (`5fb18`) nach Schlag A: erste 4 von 4, V3 47 von 47, dritte 25 von 25 | Teil 1c `umwerf_b_nach_a`; V: Teil 3 | gesichert |

### Nachlauf

Nachlauf = Frames zwischen dem letzten aktiven Frame und dem ersten Frame
mit Stand oder Gehen (beide nicht mitgezählt), nur Angriffe mit voller
aktiver Phase und vollem Rückzug (die übrigen in Spalte `nachlauf_sonst`). Nach dem festen Rückzug wählt das Spiel
die Länge der Wartepose (WOOKY `5fb18`, EDDY `644bc`, SKIP `2849e`). Spanne
über alle drei Messungen; dahinter erste / V3 / dritte.

| Angriff | Nachlauf ohne Treffer; mit Treffer | Beleg | Status |
|---|---|---|---|
| fester Rückzug | WOOKY Schlag A 5, B 0, C 8, Umwerfschlag A 5, B 0; EDDY Schlag A 5, B 8, Umwerfschlag 5, Sprungtritt 0; SKIP 8 | Teil 1 `nachlauf_fest`; V: Teil 2 | gesichert |
| WOOKY Schlag A | 12–36 (18–20 / 18–36 / 12–35); 16–36 (in allen drei) | Teil 1, `WS1*_whiff`; V: Teil 2 | gesichert (3. Messung) |
| WOOKY Schlag B | 7–18 (7–16 / 12–18 / 13–18); 11–18 (in allen drei) | `WS2*_whiff` | gesichert (3. Messung) |
| WOOKY Schlag C | 16–40 (16–38 / 34–37 / 37–40); 21–40 (36–39 / 36–40 / 21–39) | `WS3*_whiff` | gesichert (3. Messung) |
| WOOKY Umwerfschlag A | 30–36 (30–35 / 32–36 / 32–35); 0, er geht sofort nach | `WK1*_whiff` | gesichert (3. Messung) |
| WOOKY Umwerfschlag B | 14–31 (30–31 / 26–30, dazu ein verkürzter Fall mit 11 / 14–29); 0 | `WK2*_whiff` | gesichert (3. Messung) |
| EDDY Schlag A | 17–36 (23–35 / 19–33 / 17–36); 17–36 (18–36 / 17–35 / 17–36) | `ES1*` | gesichert (3. Messung) |
| EDDY Schlag B | 20–41 (23–39 / 20–41 / 23–39); 20–39 (22–38 / 20–39 / 20–39) | `ES2*` | gesichert (3. Messung) |
| EDDY Umwerfschlag | 30–36 (32–33 / 30–36 / 31–35); 5–33 (5–8 / 7–8 / 5–33), meist 5–8 und dann Gehen, selten Wartepose | `EK2*` | gesichert (3. Messung) |
| EDDY Sprungtritt | meist 1, selten 28 (1 / 1 und 28 / 1); 1–33 (1–30 / 1–28 / 1–33) | `EK1*` | gesichert (3. Messung) |
| SKIP Messerstich | 8 Frames Rückzug, dann Gehen oder 11–12 Frames Pause (`2849e`) und der nächste Stich. Aufeinanderfolgende Stiche kommen alle 37 bis 49 Frames (beobachtet 37, 42, 49) | Teil 1, 1c `messerstich_abstand`, `SMSL_nat`; V: `n4` A 1373, 1410, 1447, `n6` A 2736, 2773, 2810 | gesichert (3. Messung) |

### Weitere Aussagen

| Aussage | Stand | Status |
|---|---|---|
| Sprungtritt trifft noch in A+45 | Messagent ja, Gegenprüfer nur bis A+42 nachweisbar (Werte unten) | unsicher |
| Sprungtritt gegen eine Figur knapp außerhalb der Reichweite in A+9 (d 60 bei Blick links, 59 bei Blick rechts) | Messagent Treffer in A+41, Gegenprüfer in A+10 (unten) | unsicher |
| SKIP-Grenzen je Blickrichtung der Figur, Ausfallstich vorn und nach hinten in der Tiefe | nur Gegenprüfer (unten) | unsicher |
| Hinterkante, wenn die Figur zum Gegner schaut | ein Fall der dritten Messung (unten) | unsicher |
| Wie der Gegner das Ziel S+0x96 wählt | meist dx bei A, auf ±48 begrenzt, mit Ausnahmen (unten) | unsicher |
| Wann das Spiel S+0x96 setzt | nicht gemessen | offen |
| SKIP-Messerwurf | in keinem Lauf aufgetreten | offen |
| DICK (Pistole, Rakete) | kein Schuss gegen die passive Figur beobachtet | offen |

Die Standzeit vor dem nächsten Angriff (Entwurf meist 20–21 Frames,
Gegenprüfer 5–22 Frames mit Häufungen) ist hier gestrichen. Sie gehört zum
Verhaltensmodell der Gegner.

Abgleich mit älteren Abschnitten und `docs/mechanik.md` (dort nicht
stillschweigend geändert, Vorschläge am Ende von „Reichweite der
Gegnerangriffe“ in mechanik.md):

- Der WOOKY hat drei normale Schläge (Startup 9, 4 und 10), der EDDY zwei
  (9 und 10), dazu je zwei Umwerfangriffe. „Nachtrag: Schaden der Gegner“
  nennt je zwei normale Schläge (Treffer 4 bzw. 9 Frames nach
  Angriffsbeginn).
- Tiefe: „Nachtrag: Schaden der Gegner“ und mechanik.md („Reichweite der
  Gegnerschläge“, Workflow) nennen „bis 11 px, ab 12 nicht“. Das gilt nur
  für eine Figur, die weiter vorn steht. Nach hinten reicht der Angriff
  10 px (bei −11 bricht der Gegner ab), außerdem bricht er außerhalb des
  Fensters um S+0x96 ab. Widerspruch zum Workflow-Wert für die Seite nach
  hinten.
- Serien: mechanik.md („Umgeworfen werden“, Auslöser) sagt „beim WOOKY meist
  der dritte einer Serie“. Gemessen kommen vor dem Umwerfangriff 2 bis 13
  normale Angriffe; er ist der dritte in 17 von 76 (V3) bzw. 16 von 45
  (dritte Messung) Fällen, der vierte in 27 von 76 bzw. 15 von 45. „Meist der
  dritte“ trifft also nicht zu; der ältere Satz in „Umwerfen der Figur durch
  Gegner“ („meist mit seinem dritten oder vierten Schlag“) passt. „Zwischen
  zwei Umwerf-Angriffen landet derselbe Gegner 0 bis 3 normale Treffer“ zählt
  Treffer, hier sind Angriffe gezählt (auch solche ins Leere); ein
  Widerspruch ist das nicht.

Unsicher:

- Sprungtritt in A+45: Messagent: Figur bei dx 30 in A+45 noch getroffen,
  ab A+46 nicht (`EK1L_f44`, `EK1L_f45`, `EK1R_f44`, `EK1R_f45`).
  Gegenprüfer: Treffer nachgewiesen bis A+42 (`p_ek1_r2_xnat_z0_spaet40`,
  `_spaet42`), in A+43 ließ sich die Figur nicht vor den EDDY setzen
  (Bildrand). Dritte Messung entfällt. Gesichert ist die aktive Phase
  A+9–A+45 (S+0x24).
- Sprungtritt knapp außerhalb der Reichweite in A+9 (d 60 bei Blick links,
  59 bei Blick rechts; gesetzt wird 3 px weiter weg): Messagent: Treffer
  erst in A+41 (`EK1L_x63`, ebenso `EK1R_xm62`). Gegenprüfer: Treffer in
  A+10 (`p_ek1_l2_x63`, ebenso `p_ek1_r_x-62`). Dritte Messung entfällt.
  Beide Treffer fallen in den ersten Frame nach dem Ende des Eingriffs: Der
  Messagent hält die Figur bis A+40 (Standard `CC_BIS`), der Gegenprüfer nur
  bis A+9. Danach kommt der EDDY näher. Vermutlich ist der Unterschied eine Folge der Methode;
  gesichert ist nur die Grenze in A+9 (d 59 bzw. 58).
- SKIP-Grenzen (nur Gegenprüfer, Blickrichtung der Figur wie in den
  Entwürfen bei A bezeichnet; steht die Figur bei der Probe hinter dem SKIP,
  schaut sie tatsächlich in die andere Richtung). Messerstich, Blick links,
  Figur schaut zum SKIP: hinten nur 7 (`p_sm_l_x-7` T, `x-8` L,
  `p_sm_l2_*_dreh`), vorn mindestens 116. Blick rechts, Figur schaut zum
  SKIP: vorn bis 115 (116 L), Figur schaut weg: vorn 110 (112 L).
  Ausfallstich, Figur schaut weg: hinten bis 16 (18 L), vorn 100 T, 110 L.
  Tiefe des Ausfallstichs nach hinten: −12 T, −13 L. Messagent: nicht
  gemessen (Messerstich nur Blick links mit Figur weg und Blick rechts zum
  SKIP, Ausfallstich nur Blick rechts zum SKIP, Tiefe nur +12/+13). Dritte
  Messung entfällt. Der Gegenprüfer schreibt „Trefferfläche der Figur hinten
  breiter“. Nimmt man die Blickrichtung an der Probenstelle (Spalten
  `blick_figur`, `pface`), reicht der Stich in allen Fällen etwa 5 bis 8 px
  weiter, wenn die Figur zum SKIP schaut (Lesart beim Einarbeiten, nicht
  gemessen).
- Hinterkante, wenn die Figur zum Gegner schaut: In `E3K2L_xm6` (EDDY,
  Umwerfschlag, Ziel 25) trifft der Angriff die Figur 6 px hinter dem EDDY
  in A+9. In den vier anderen `_xm6`-Proben schaut sie weg und bleibt
  unberührt. Der Entwurf nennt `*_x-6` pauschal leer. Erste Messung und
  Gegenprüfer: nicht gemessen (alle ihre Grenzproben mit Figur, die
  wegschaut). Dritte Messung: Treffer bei 6 px, ein Fall. Ob die
  Blickrichtung der Figur oder der Angriff den Unterschied macht, ist offen;
  zur Lesart beim SKIP (Figur schaut zum Angreifer: weiter) würde die
  Blickrichtung passen.
- Wahl des Ziels S+0x96: Messagent (erste Messung): dx bei A, auf ±48
  begrenzt (z. B. `WS2L` 48 bei dx 55, `WS3R` −12; Ziel in den natürlichen
  Läufen zwischen −48 und 48, beim SKIP ±64, Spalte `ziel` in Teil 3).
  Gegenprüfer: natürliche Werte −1, 14, −17, 32, −42, −45, ±48, alle gleich
  dx bei A außer `ek2_l` (dx 44, Ziel 32); bei SKIP ±64; S+0xBA enthält
  denselben Wert. Dritte Messung (Figur bis A−1 bei dx 25 bzw. −30
  gehalten): Ziel meist der gehaltene Abstand (25, −30), in `W3S2L` aber 3
  bei gehaltenen 25.

Offen:

- Wann das Spiel S+0x96 setzt.
- SKIP-Messerwurf: kam in keinem Lauf vor.
- DICK (Pistole, Rakete): erscheint nur in der Bossarena. Die Savestates
  `greichweite_dick` und `greichweite_dick2` aus `greichweite_bot.lua`
  liegen vor, aber ein Lauf mit passiver Figur zeigte keinen Schuss, weil
  DOLG die Figur ständig umwirft.

## Nachtrag: Spezialangriff

Belege: `logs/spezial.csv` (Messagent M4) und `logs/spezial_v.csv`
(Gegenprüfer V4), beide erzeugt von `scripts/belege_spezial.sh`. M4:
Szenario `spezial_probe.lua`, Auswertung `messen_a5.py spezial` (Umsetzung in
`messen_spezial.py`) und `messen_spezial.py zusammenfassung-spezial`; 498
Läufe, davon 10 zum Anlegen von Savestates und 108 der dritten Messung
(`d3_*`, Abschnitt 9). V4 (Block „Gegenprüfung V4“ am Ende desselben
Skripts): Szenario `spezial_v_frei.lua`, nur Watch-Protokoll, Auswertung
`messen_spezial_v.py` (`probe`, `tempo`, `ereignisse`); 361 Läufe, davon 7
für Savestates. Laufzeit (gemessen von V4, vor der dritten Messung): 493 s
ohne, 724 s mit V4-Block auf stark ausgelastetem Rechner; mit Abschnitt 9
laut Dateizeiten der Savestates und Logs etwa 8 min ohne und 15 min mit
V4-Block.

Reproduzierbarkeit: Vor der dritten Messung war `spezial.csv` dreimal
bitgleich (M4s Fassung und zwei Durchläufe von vorn durch V4, MD5
`11b116a5460df502d0ae72e7f9d53450`), alle Savestates entstanden bitgleich
neu. `spezial_v.csv` (2096 Zeilen, MD5 `c1abf3d2f2895a027166490f577f24c5`)
war in zwei vollen Durchläufen bitgleich bis auf die drei zuletzt ergänzten
Läufe (`v_ab_treffer_lauf`, `v_f0_lauf1`, `v_f0_lauf10`). Mit den Läufen
`d3_*` hat sich `spezial.csv` geändert (jetzt 7117 Zeilen, MD5
`93c5a756345327258eb94f03f6eb6068`). Diese Fassung stammt aus einem
Durchlauf von `belege_spezial.sh` von vorn (Exit 0, alle 17 Savestates
`spezial_*` neu angelegt); ein MD5-Vergleich mit
einem zweiten Durchlauf ist nicht dokumentiert. Derselbe Durchlauf hat
`spezial_v.csv` neu geschrieben, die MD5 blieb `c1abf3d2…` (gleich V4s
Fassung).

Laufnamen ohne das Präfix `spezial_`; die Läufe von V4 (in `spezial_v.csv`
`spezial_v_…`) heißen damit `v_…`. P ist der Frame, in dem Angriff und
Sprung gedrückt sind, h der Frame des ersten Treffers (LP des Gegners
sinken), H ein Frame, in dem die Figur selbst LP verliert, J der Frame eines
Sprungdrucks, A der eines Schlagdrucks. dx/dz: Gegner minus Figur,
ganzzahlig am Frame-Ende. Stufe k (1 bis 6): Bild der wachsenden
Trefferfläche des Captains.

**Methode.** M4 hat jede Größe in mindestens zwei Läufen mit anderem
Druckframe, Savestate oder Gegnertyp gemessen: `kontakt` (WOOKY, 16 LP,
46 px vor der Figur), `kontakt_b` (EDDY, 30 LP), `ingame` (kein Gegner) und
für die anderen Figuren `spezial_h<k>`. Ausgewertet werden aus dem
RAM-Abzug Aktion (P+0x0A), Status (P+0x04), der Schutz-Timer `FFAA69`, die
LP von Figur und Gegnern und die Lage der Gegner in jedem Frame. V4 hat
zuerst nur die Ergebnistabellen gelesen und jede Zeile mit eigenen Läufen
nachgemessen: andere Savestates (`stage2`, `stage3`, `anlauf`, `anlauf_b`,
`anlauf_c`, `tiefe_b`, eigene `spezial_v_*`), andere Druckframes und
Reihenfolgen, Protokoll nur über das Watch-Feld. Wo V4 abwich, hat M4 ein
drittes Mal mit einer Variante gemessen, die keiner von beiden genutzt
hatte. Status „gesichert“: von V4 bestätigt; „gesichert (3. Messung)“: eine
Abweichung, die eine gemeinsame Regel für alle drei Messungen erklärt.

**Eingriffe** (EINGRIFF, in den Szenarien gekennzeichnet):

- Gegnerlage relativ zur Figur vor jedem Frame (x-Nachkomma 0): `rx_*`,
  `rz_*`, `rh_*`, `fen_*`, `sd_*` (außer `sd_kiste_*`), `h<k>_x_*`,
  `h<k>_xb_*`, `h<k>_z_*`, `h<k>_drei`, `d3_rx_*`, `d3_zone_*`; V4 `v_rx_*`,
  `v_fen_*`, `v_voll_*`, `v_rz_*`, `v_rg_*`, `v_flug_e_hinten`,
  `v_flug_w_hinten`, `v_beh_*` (Behälter), `v_sch_*`, `v_f<k>_anf*`,
  `v_g<k>_*`, `v_gz<k>_*`. Bei `fen_*` steht der Gegner nur in einem Frame
  in Reichweite, sonst 200 px entfernt. `CC_WEG` hält andere Gegner 300 px
  entfernt; bei `sd_kiste_*` und `d3_lauf_*` ist das der einzige Eingriff,
  die Figur selbst bleibt frei.
- Höhe des Gegners: `rh_*`. `sch_ende_*`: Gegner von P+7 bis P+43 in 70 px
  Höhe, danach 0; Kontrolle `sch_kontrolle_hoehe`: Derselbe Eingriff ohne
  Spezialangriff lässt den WOOKY normal treffen (Frame 28 und 90).
- Eigene LP in Frame 2: `lp_a*`, `lp_b*`, `lp_leer*`, `h<k>_lp5`,
  `v_lp0_s2`, `v_lp9_c`, `v_lp5_c`, `v_lp12_c`, `v_lp2_t`, `v_f<k>_lp5`.
  Timer `FFAA69` gesetzt: `v_sch_e_r45_t69`, `v_sch_w_r45_t69`,
  `v_sch_e_t5`.
- Ohne Eingriff gegengeprüft: Schaden, Flug, Dauer, Kosten und
  Schutzbeginn (`aus_gleich_k/kb`, `aus_lauf_k`, `lp_nat`, `sch_anf_*`,
  `v_viele_*`, `v_lp_nat`), Reichweite in Stufe 2 (`aus_gleich_k`: WOOKY
  bei 46 px, Treffer P+14) und Stufe 3 (`v_aus_c_1f`: EDDY bei 61 px,
  P+20), Tiefe (`v_mehr_t`: WOOKY bei dz −19 und dx 123 in P+47 nach einem
  Trefferstopp).

### Captain Commando

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| Auslösung | Angriff und Sprung im selben Frame P, auch nur einen Frame lang: Aktion 0x14 ab P+1 | gesichert | `aus_gleich_k` (P=3), `aus_gleich_kb` (P=5), `aus_1frame_k` (nur Frame 4), `lp_nat` (16 Auslösungen); `v_aus_s2` (P=17), `v_aus_s2_1f` (nur Frame 23), `v_aus_c_1f` (nur Frame 9) |
| Zweite Taste einen Frame später | kein Spezialangriff: Angriff zuerst gibt den Schlag (0x10), Sprung zuerst einen Sprung und danach den Sprungangriff (0x0E), auch wenn die erste Taste gehalten bleibt | gesichert | `aus_a_dann_j_k/_i`, `aus_j_dann_a_k/_i`; `v_aj_s2`, `v_ja_s2`, `v_aj_s3`, `v_ja_s3` |
| Gehaltene Taste | zählt nicht: Angriff gehalten und Sprung neu gibt einen Sprung, Sprung gehalten und Angriff neu einen Schlag; beide gehalten genau einen Spezialangriff | gesichert | `aus_a_gehalten`, `aus_j_gehalten`, `aus_beide_gehalten`; `v_hA_s2`, `v_hJ_s2`, `v_hAJ_s2` (einer in 16–65, kein zweiter bis 180) |
| Aus dem Lauf, aus dem Sprint | ab P+1, die Bewegung stoppt sofort, auch diagonal und nach unten | gesichert | `aus_lauf_k` (links), `aus_lauf_i` (rechts); `v_lauf_rh`, `v_lauf_d`, `v_lauf_l`; Sprint: `logs/sprint.csv` (`sp_spezial`), `logs/sprint_v.csv` (`sprint_v_sp_spezial`, `sprint_v_sp_spezial_c`) |
| In der Landung | Druck in J+41 (letzter Luftframe): Sprungangriff. J+42 bis J+46 (Landeframes 1–5): neuer normaler Sprung ab Druck+1, der Angriff geht verloren. J+47: geht ganz verloren. Ab J+48: Spezialangriff. Für Vorwärts- und Standsprung gleich | gesichert | `aus_land_a44/a45/a49/a50/a51` (J=3), `aus_land_b47/b48/b52/b53/b54` (J=6); `v_land_v41/v42/v46/v47/v48` (Vorwärtssprung, J=15), `v_land_n41/n42/n46/n47/n48` (Standsprung, J=22) |
| In der eigenen Trefferreaktion | Druck in H+1 bis H+7 geht verloren (nicht gepuffert), ab H+8 Spezialangriff ab Druck+1, noch während der 27 Frames Reaktion | gesichert | `aus_reakt_a35/a36` (H=28), `aus_reakt_b97/b98` (H=90), `aus_reakt_c51/c52` (EDDY, H=44); `v_reakt_c69/c72/c75/c76` (EDDY, H=68), `v_reakt_a77/a78` (WOOKY, H=70), `v_reakt_t82/t83` (EDDY, H=75) |
| Druck im Trefferframe H | kein Spezialangriff | gesichert | `sch_anf_a28`, `sch_anf_b44`; `v_htreff_c68`, `v_htreff_t75` |
| Bei 0 LP | kein Spezialangriff, sondern der normale Schlag (0x10) | gesichert | `lp_nat` (P+1201, P+1276), `lp_a0`, `lp_leer0`; `v_lp_nat` (LP 0 ab Frame 616), `v_lp0_s2`, `v_lp2_t` |
| Aus dem Leerschlag | Druck in A+7 und A+8 startet ihn im nächsten Frame. In A+2 kam kein Spezialangriff, aber dort war die Angriffstaste seit A ununterbrochen gedrückt (`3:p1_attack` hält Frame 3 und 4, `5:…` Frame 5 und 6), neu war nur der Sprung; Messverzerrung möglich | unsicher | `aus_schlag5/10/11` |
| Dauer ohne Treffer | Aktion 0x14 und Status 3 von P+1 bis P+50 (50 Frames), keine Bewegung. Ein Druck in P+51 (Schlag, Sprung oder neuer Spezialangriff) wirkt ab P+52, einer in P+50 geht verloren. Laufen bewegt ab P+52 | gesichert | `ab_leer_r`, `ab_leer_h`, `ab_angriff53/54` (P=3), `ab_b_angriff55/56` (P=5), `ab_sprung54`, `ab_wieder53/54`; `v_ab_leer_s2` (P=20), `v_ab_a70/a71`, `v_ab_j70/j71`, `v_ab_aj71`, `v_ab_lauf_s2`, `v_ab_s3_a83/a84`, `v_ab_s3_lauf` (P=33) |
| Dauer mit Treffer | je Bild mit Treffer 7 Frames Trefferstopp, gleichzeitige Treffer zählen einmal: ein Bild bis P+57 (Laufen ab P+59), zwei P+64, drei P+71, vier P+78 | gesichert | `aus_gleich_k`, `ab_treffer_l`, `sd_zwei_stufen` (P+64), `sd_drei_stufen` (P+71), `sd_drei_gleich` (P+57); `v_aus_c_1f`, `v_mehr_t` (P+64), `v_viele_p5`, `v_viele_p14` (P+71), `v_viele_p25` (P+78), `v_ab_treffer_lauf` |
| Schutz | Status 3 von P+1 bis zum Aktionsende (P+50, mit einem Treffer P+57), danach 20 Frames Schutz-Timer `FFAA69` bei Status 1 (P+51 bis P+70, mit einem Treffer P+58 bis P+77), obwohl die Figur schon handeln kann. LP-Verlust frühestens im Frame, in dem der Timer 0 wird: P+71 (mit einem Treffer P+78). Gegnerangriffe ab P+1 bis P+3 bleiben ohne Wirkung | gesichert | Anfang: `sch_anf_a25/26/27`, `sch_anf_b41/42/43`; `v_anf_c65/66/67`, `v_anf_t74`, `v_anf_a68/a69`, `v_anf_b67`. Ende: `sch_ende_a14/15/16` (WOOKY-Angriff ab P+69/68/67, LP-Verlust P+71), `sch_ende_b52..55` (EDDY ab P+64 bis P+67, jeweils P+71), `sch_kontrolle_a/b/hoehe`; Timer: `v_ab_leer_s2` (0 in P+71), `v_aus_c_1f` (0 in P+78), `v_sch_e_r45`, `v_sch_w_r45`, `v_sch_e_r45_t69`, `v_sch_w_r45_t69`, `v_sch_e_t5` |
| Angehängter zweiter Spezialangriff (Druck in P+51) | läuft P+52 bis P+101, Status 3 endet aber in P+70 mit dem Timer des ersten; danach Status 1 ohne Timer bis P+101 | unsicher | `ab_wieder54` |
| Schaden | 6 LP je Gegner, WOOKY (16 und 24 LP) und EDDY gleich; jeder Treffer wirft um (Status danach 2) | gesichert | `aus_gleich_k`, `aus_gleich_kb`, `sd_*`, `lp_nat` (12 Treffer); alle Treffer in `v_aus_*`, `v_reakt_*`, `v_viele_*`, `v_mehr_t`, `v_lp_nat`, `v_rx_*` |
| Mehrere Gegner | alle Gegner in der Fläche werden getroffen, jeder genau einmal, auch wenn er im Bereich bleibt; bis fünf Gegner beobachtet | gesichert | `sd_zwei_gleich`, `sd_drei_gleich` (drei in P+8), `sd_zwei_stufen`, `sd_drei_stufen` (P+8, P+21, P+34), `sd_einmal`; `v_viele_p5/p14/p25` (fünf Gegner, ohne Eingriff), `v_mehr_t`, alle `v_rx_*` (bis P+50 festgehalten, je ein Treffer) |
| Flug der Gegner | 135,125 px vom Trefferort, immer von der Figur weg: vor ihr nach vorn, hinter ihr nach hinten, auch mit Blick nach links. In natürlichen Läufen flogen einzelne Gegner anders weit: `lp_nat` +96,125, +133,125 und −138 (3 von 12), `v_flug_e_ueber` ein WOOKY +69,125 (in `spezial_v.csv` 79 von 81 Flügen ±135,125, der andere ist der EDDY in der Luft); Ursache nicht ausgewertet | gesichert | `aus_gleich_k`, `aus_gleich_kb`, `sd_flug_vorn` (+135,125), `sd_flug_hinten`, `sd_flug_b_hinten` (−135,125); `v_aus_c_1f`, `v_flug_w_ueber` (ohne Eingriff, hinten), `v_flug_e_hinten`, `v_flug_w_hinten`, `v_viele_p5` (Blick links) |
| Gegner schon in der Luft | fliegt weiter als 135,125 px | unsicher | `v_flug_e_ueber` |
| Reichweite x | Die Fläche wächst in sechs Stufen zu je 6 Frames (Stufe k ab P+2+6k: P+8, +14, +20, +26, +32, +38) um je 16 px: vor der Figur bis 43, 59, 75, 91, 107, 123 px, hinter ihr bis 42, 58, 74, 90, 106, 122 px; 1 px weiter kein Treffer in dieser Stufe. Volle Fläche: Nahe Gegner werden in jeder Stufe getroffen. Gilt für gehende oder stehende Gegner, WOOKY und EDDY gleich | gesichert | `rx_b_*` (EDDY, P=6), `rx_a_*` (WOOKY, P=3), `fen_a_p14..p38`; `v_rx_e_*` (EDDY, P=4), `v_rx_w_*` (WOOKY, P=6, dz 5), `v_rx_e_h124/h125`, `v_voll_e/w_v32`, `v_voll_e/w_h20` |
| Reichweite x, Stufe 3 vorn (P+20 bis P+25) | 75 px bei gehendem oder stehendem Gegner (76 nie); ein WOOKY in Ausholpose (Aktion 0x06) bis 76 px (77 nie) | gesichert (3. Messung) | `rx_a_76`; `v_rx_w_v77/v78`; `d3_rx_s16_73..80`, `d3_rx_k14_73..80` |
| Andere Gegnerposen | Die Trefferfläche des Gegners hängt von seiner Animation ab | unsicher | `rx_a_77/78`; `v_flug_w_ueber`, `v_rg_w_x100_z0` |
| Aktive Frames | P+8 bis P+43 (36 Frames, ohne Trefferstopp gezählt); P+7 und P+44 nie | gesichert | `fen_a_p7/p8/p43/p44` (P=3, dx 20), `fen_b_p7/p8/p43/p44` (EDDY, P=6); `v_fen_e_*` (EDDY, P=4), `v_fen_w_*` (WOOKY, P=6), beide bei dx −20 |
| Tiefe | \|dz\| ≤ 28 trifft, ab 29 nie, vorn und hinten, unabhängig vom x-Abstand, WOOKY und EDDY | gesichert | `rz_a_*` (dx 20, −60, 100), `rz_b_*`; `v_rz_e_*`, `v_rz_w_*` (dx 98 bis 100 und −32) |
| Höhe des Gegners | bis 53 px getroffen, ab 54 nicht | unsicher | `rh_*` |
| Kosten | 9 LP einmal je Spezialangriff, nur wenn er mindestens einen Gegner oder Gegenstand trifft, abgezogen in h+8. Ohne Treffer kostenlos | gesichert | `aus_gleich_k` (h=P+14, −9 in P+22), `sd_drei_stufen` (drei Treffer, einmal −9 in P+16), `ab_leer_*`, `lp_leer5`, Kiste `sd_kiste_h2/h3` (Ginzu, Baby Head); `v_aus_c_1f` (h=P+20, −9 in P+28), `v_viele_p5` (fünf Gegner, einmal −9 in P+22), `v_ab_leer_s2`, `v_lp_nat` (Leerläufe kostenlos), Behälter `v_beh_v60` (h=P+20, −9 in P+28), `v_beh_h30` (h=P+8, −9 in P+16) |
| Weniger als 9 LP | Die LP fallen auf 0, nicht darunter; die Figur stirbt dadurch nicht und spielt mit 0 LP weiter, erst der nächste Gegnertreffer bringt sie unter 0. Genau 9 LP: 0 | gesichert | `lp_nat` (9 → 0 in P+1165), `lp_a9`, `lp_b9` (9 → 0), `lp_a8`, `lp_b4`, `lp_a1` (→ 0), `lp_a10` (10 → 1); `v_lp_nat` (1 → 0 in Frame 616, Gegnertreffer 0 → −8 in 1257), `v_lp9_c`, `v_lp5_c`, `v_lp2_t` (→ 0), `v_lp12_c` (12 → 3) |
| Schaden an Behältern | 6 LP | unsicher | `v_beh_v60`, `v_beh_h30` |
| Bosse, schwerere und liegende Gegner | nicht gemessen (nur: ein umgeworfener Gegner wird kein zweites Mal getroffen) | offen | – |

### Andere Figuren

k = 0 Mack, 2 Ginzu, 3 Baby Head. M4 ab `spezial_h<k>` (WOOKY 46 px vor
der Figur), `spezial_drei_h<k>` (drei Gegner) und `held<k>` (kein Gegner),
Gegenlauf mit Druck in Frame 10 statt 3 und Tiefe +4 (`h<k>_xb_*`). V4 ab
`held<k>`, `spezial_v_h<k>` (WOOKY läuft aus 149 px heran, dz 16) und
`spezial_v_viele<k>` (fünf Gegner, Blick links); Reichweiten per EINGRIFF
mit dem WOOKY ab Frame 2 fest bei dx, dz 0, P=6.

Ginzu und Baby Head treffen nicht mit der Figur selbst, sondern über
Explosionsobjekte (Typ `0x9974E`, Slots 53–59) an festen Stellen relativ
zur Figur (vor ihr bei dx 88, 48, 64, 0, 16, dann 32, −16, −24; M4).
Deshalb gibt es keinen Trefferstopp, und die Dauer bleibt gleich. Baby Head
nutzt dasselbe Muster 11 Frames später.

| Größe | Captain | Mack | Ginzu | Baby Head | Status | Beleg |
|---|---|---|---|---|---|---|
| Dauer ohne Treffer (Aktion 0x14, Status 3) | P+1 bis P+50 | P+1 bis P+60 | P+1 bis P+41 | P+1 bis P+46 | gesichert | `h<k>_leer`, `h<k>_kontakt`; `v_f<k>_leer` (P=17), `v_ab_leer_s2` |
| mit Treffer | +7 je Bild (ein Bild P+57) | +7 je Bild (P+67, zwei Bilder P+74) | unverändert | unverändert, auch mit drei Treffern | gesichert | `h<k>_kontakt`, `h<k>_drei`, `h<k>_lp5`; `v_f<k>_kontakt`, `v_f<k>_viele` |
| Laufen bewegt nach der Aktion ab | P+52 | P+62 | P+43 | P+48 | gesichert (3. Messung) | `h<k>_leer`; `v_ab_lauf_s2`, `v_f<k>_lauf`, `v_f0_lauf1`; `d3_lauf_<k>_*` |
| Bewegung im Spezialangriff, x | keine | mit gehaltener Richtung ab dem Frame nach dem Richtungsdruck (frühestens P+2) bis P+60: 2,0 px/Frame, rechts wie links | keine | keine | gesichert (3. Messung) | `ab_leer_r` (Captain, keine), `h0_leer` (Mack, rechts ab P+1: +2,0 ab P+2, Ereignis `bewegung_in_aktion`); `v_f0_lauf1` (ab P+2), `v_f0_lauf10`, `v_f0_lauf`, `v_f0_kontakt_lauf`, `v_f2_lauf`, `v_f3_lauf`; `d3_lauf_0_l` (links ab P+5: −2,0 ab P+6), `d3_lauf_0_vor` (vorher gehalten: ab P+2), `d3_lauf_2_*`, `d3_lauf_3_*` |
| Bewegung im Spezialangriff, Tiefe und diagonal | – | Tiefe 1,25, diagonal 1,5/0,90625 px/Frame | – | – | unsicher | `d3_lauf_0_u`, `d3_lauf_0_ru` |
| Schutz danach (Timer `FFAA69`) | 20 Frames | 20 | 20 | 20 | gesichert | Timer in `h<k>_*` und allen `v_f<k>_*` |
| Wirkung des Timers | – | nicht geprüft | nicht geprüft | nicht geprüft | offen | – |
| Schutz am Anfang | Gegnerangriff ab P+1 ohne Wirkung | wirft den WOOKY in P+1 um, auch wenn dessen Angriff dort schon aktiv ist | WOOKY-Angriff ab P+2 bzw. P+1 bis zum Treffer (P+8) ohne Wirkung | ebenso (bis P+19) | gesichert | `h<k>_anf26`; `v_f<k>_anf28/29` (EINGRIFF: WOOKY ab Frame 5 bei dx 46, Angriff in Frame 30) |
| Schaden | 6 | 6 | 6 | 6 | gesichert | `h<k>_kontakt`, `h<k>_drei`; `v_f<k>_kontakt`, `v_f<k>_viele` |
| Trefferzeit (dz 0) | wachsende Fläche, P+8 bis P+43 | sofort in P+1 | Ein Gegner wird von der ersten Explosion getroffen, die ihn erreicht: P+4 bei dx 62 bis 139, P+8 bei 22 bis 61 (dazu −2 bis −1), P+16 bei −48 bis 21, P+28 bei −51 bis −66, P+32 bei −68 bis −74; die Bereiche schließen lückenlos aneinander (Grenzen bei −49/−50 und −67 nicht geprobt). Gilt mit freien Objekt-Slots, siehe „Nach zerschlagenen Kisten“ | dieselben Bereiche 11 Frames später (P+15, P+19, P+27, P+39, P+43) | gesichert (3. Messung) | `h<k>_x_*`, `h<k>_xb_*`; `v_g2_*`, `v_g3_*`; `d3_zone_h2_*`, `d3_zone_h3_*` |
| x vorn / hinten | 123 / 122 px | 94 (95 nie) / 93 px (94 nie) | 139 (140 nie) / 74 px (75 nie) | wie Ginzu | gesichert | `h<k>_x_*`, `h<k>_xb_*`; `v_g0_x96/x97/xm91/xm93`, `v_g2/g3_x141/x142/xm72/xm73`; `d3_zone_h<k>_*` |
| Tiefe Captain, Mack | ±28 (29 nie) | ±28 (29 nie), vorn und hinten | – | – | gesichert | `h0_z_*`; `v_gz0_x50_*`, `v_gz0_xm50_*` |
| Tiefe Ginzu, Baby Head | – | – | je Explosion verschieden | wie Ginzu | unsicher | `h2_z_*`, `h3_z_*`; `v_gz2_*`, `v_g2_*_z16`; `d3_zone_h2_z16_*`, `d3_zone_h2_z29_*`, `d3_zone_h2_zm16_*` |
| Aktive Frames Mack | – | Treffer in P+1, vereinzelt später | – | – | unsicher | `h0_x_*`; `v_f0_kontakt`, `v_f0_viele` |
| LP-Kosten | 9 in h+8 | 9 in h+8 | 9 in h+1 | 9 in h+1 | gesichert | `h<k>_kontakt`, `h<k>_drei`; `v_f0_kontakt` (h=P+1, −9 in P+9), `v_f2_kontakt` (h=P+4, P+5), `v_f3_kontakt` (h=P+15, P+16) |
| Mehrere Gegner, einmal 9 LP | ja | ja (drei in P+1) | ja, zu verschiedenen Zeiten | ja | gesichert | `h<k>_drei`; `v_f0_viele` (zwei, P+1 und P+32), `v_f2_viele` (fünf), `v_f3_viele` (vier) |
| Weniger als 9 LP | → 0 | → 0 | → 0 | → 0 | gesichert | `h<k>_lp5`; `v_f<k>_lp5` (5 → 0) |
| Nach zerschlagenen Kisten | – | – | einige Explosionen fehlten; Gegner bei dx −40 erst in P+24 statt P+16 getroffen | bei dx −40 erst in P+35 statt P+27 | unsicher | Erkundung M4 (nicht im Belegskript); im Belegskript `h2_drei`, `h3_drei` (ab `spezial_drei_h2/h3`) |
| Mack: Bewegung nach oben, Trefferfläche in Bewegung | – | nicht gemessen | – | – | offen | – |

### Abweichungen der Gegenprüfung und dritte Messung

Läufe `d3_*` (Abschnitt 9 von `belege_spezial.sh`, Gruppen `dritte_*` in
`spezial.csv`), je eine Variante, die weder M4 noch V4 genutzt hatten. Die
Spalte „Gegneraktion“ in `spezial.csv` ist die Aktion des Gegners im Frame
vor dem Treffer.

- **Reichweite Stufe 3 vorn**: M4 76 px (WOOKY ab `kontakt`, P=3), V4 75 px
  (76 erst in P+26; WOOKY ab `anlauf`, EDDY), dritte Messung: gehender
  WOOKY aus Slot 16 ab `spezial_drei` (P=8, Aktion 0x00) 75 ja, 76 nie;
  WOOKY ab `kontakt` mit P=14 in Ausholpose (0x06) 76 ja, 77 nie. Regel:
  75 px für gehende oder stehende Gegner, die Ausholpose reicht 1 px weiter.
- **Bewegung von Mack**: M4 „Laufen bewegt ab P+62“ (Bewegung in der Aktion
  nicht ausgewertet), V4 mit gehaltener Richtung ab Druck+1 bis P+60 mit
  2,0 px/Frame, normales Gehen ab P+62; dritte Messung ab `spezial_h0`
  (P=10, WOOKY beiseite): links ab P+5 bewegt ab P+6 mit −2,0, vorher
  gehalten ab P+2, jeweils bis P+60, Gehen ab P+62; Ginzu und Baby Head
  bewegen sich nicht. Regel: P+62 gilt für das Gehen nach der Aktion. Tiefe
  und diagonal hat nur die dritte Messung (je ein Lauf, siehe „Unsicher“).
- **Explosionen von Ginzu und Baby Head (dz 0)**: M4 in groben Schritten
  P+4 bei 78 bis 138, P+8 bei 40 bis 60, P+16 bei −40 bis 20, P+28 bei −66
  bis −62, P+32 bei −74 bis −68; V4 P+4 bei 62 bis 139, P+8 bei 22 bis 60
  (und −2), P+16 bei −48 bis 20, P+28 bei −66 bis −52, P+32 bei −74 bis
  −68; dritte Messung in 1-px-Schritten ab `spezial_h2_anlauf` bzw.
  `spezial_h3_anlauf` (WOOKY geht, P=8 bzw. 12): P+4 bei 62 bis 139 (61 und
  140 nie), P+8 bei 22 bis 61 und −2 bis −1 (21 und 0 nicht), P+16 bei −48
  bis 21 (−51 nicht), P+28 bei −51 bis −57 (Rest nicht geprobt), P+32 bei
  −74 (−75 nie); Baby Head dieselben Grenzen 11 Frames später, in P+43 bei
  −74 bis −72. Regel: lückenlos aneinander, die erste Explosion, die den
  Gegner erreicht, trifft; M4s Werte sind Teilmengen, V4s Obergrenzen 60 und
  20 waren die letzten geprobten Werte.

**Korrekturen.** `grafik/README.md` (Captain): Die 9 LP werden 8, nicht 13
Frames nach dem Treffer abgezogen. Der Workflow-Wert „etwa 50 Frames
geschützt“ (mechanik.md, „Nicht übernommen“) ist überholt: 70 Frames.
Bestätigt ist der Nebenbefund aus Aufgabe 4: In der Demo verliert P1 die
9 LP in Frame 4176, 8 Frames nach dem Treffer auf alle Gegner (4168).

**Abgleich mit `docs/mechanik.md` und den Adressen.** Kein gesicherter Wert
wird überschrieben; folgende Stellen sind betroffen:

- Sprung, „Ablauf“ („6 Frames Landung (nicht abbrechbar)“) und hier
  „Sprung“, Zeile „Landung“: Gemessen war dort, dass Laufen erst ab P+49
  bewegt. Angriff und Sprung zusammen in den Landeframes 1 bis 5 (J+42 bis
  J+46) starten dagegen im nächsten Frame einen neuen Sprung (gesichert,
  M4 und V4). Ein Sprungdruck allein tut das laut `aus_land_nurj` ebenfalls
  (Druck in J+43, Aktion 0x0A ohne Unterbrechung bis Frame 93; nur ein Lauf,
  in keinem Entwurf ausgewertet). Die Formulierung „nicht abbrechbar“ gilt
  also nur für Laufen und Angriff allein.
- Griff und Wurf, „Sprung + Angriff im Griff“: 6 LP in E+8, −9 LP in E+16
  und frei ab E+58 passen zu P+8, h+8 und dem Ende nach einem Trefferstopp.
  Die Flugweite „etwa 158 px“ weicht von 135,125 px ab dem Trefferort ab;
  sie ist für den gehaltenen Gegner gemessen (Workflow), der Bezugspunkt ist
  nicht geklärt. Nicht neu gemessen.
- Schaden der Gegner, „Tod“ (Workflow): Dass die Figur mit 0 LP weiterspielt
  und erst unter 0 LP stirbt, ist jetzt per Skript belegt (`lp_nat`,
  `v_lp_nat`: 1 → 0 in Frame 616, 0 → −8 in Frame 1257).
- Unverwundbarkeit, Absatz „ließ sich nicht trennen“: Beim Schutz im
  Spezialangriff sind Gegnerangriffe nachweislich aktiv und bleiben ohne
  Wirkung (`sch_anf_a27`: WOOKY-Angriff in P+1, im Kontrolllauf trifft er in
  diesem Frame; `sch_ende_a14`: Angriff ab P+69, LP-Verlust erst P+71;
  `v_sch_e_t5`: LP-Verlust im Frame, in dem der Timer 0 wird). Für die
  Trefferreaktion und das Aufstehen bleibt die Frage offen.
- Adresse `FFAA69`: bisher „Timer nach dem Aufstehen … sein Ablauf setzt
  S+4 zurück auf 1 und beendet damit den Schutz“. Nach dem Spezialangriff
  läuft er bei S+4 = 1 und schützt trotzdem (Ergänzung, siehe unten).
- Adresse `FFA9D0` (LP): bisher „fällt nur bei Treffern“; sie fällt auch
  durch die Kosten des Spezialangriffs (Ergänzung).

Unsicher (Werte von M4, V4 und der dritten Messung):

- **Aus dem Leerschlag**: M4 Druck in A+2 verloren, in A+7 und A+8
  Spezialangriff im nächsten Frame (`aus_schlag5/10/11`); in `aus_schlag5`
  war die Angriffstaste von A bis A+3 ohne Pause gedrückt, der Druck in A+2
  also kein neuer Angriffsdruck (Messverzerrung möglich); V4 nicht
  gemessen; dritte Messung entfällt. Die Grenze vor A+7 ist offen.
- **Angehängter zweiter Spezialangriff**: M4 läuft P+52 bis P+101, Status 3
  nur bis P+70, danach Status 1 ohne Timer bis P+101 (`ab_wieder54`); V4
  nicht ausgewertet (`v_ab_aj71` bestätigt den Start in P+52, das Protokoll
  zeigt denselben Statusverlauf); dritte Messung entfällt.
- **Gegner schon in der Luft**: M4 nicht gemessen; V4 EDDY in 9 px Höhe
  fliegt −146,625 statt −135,125 px (`v_flug_e_ueber`); dritte Messung
  entfällt.
- **Andere Gegnerposen**: M4 WOOKY im Schlag in Stufe 3 bis 78 px
  (`rx_a_77/78`, Treffer in P+25); V4 WOOKY im Ausholen (0x06) bei dx −20
  erst in P+14 statt P+8 (`v_flug_w_ueber`), WOOKY in Aktion 0x02 bei dx 96
  bis 108 in Stufe 5 nicht treffbar (`v_rg_w_x100_z0`: erst P+38; Vergleich
  `v_rg_w_x100_z0_p6fern`, `v_rg_e_x100_z0`: P+32); dritte Messung nur zu
  Stufe 3 vorn (siehe oben).
- **Höhe des Gegners**: M4 bis 53 px getroffen, ab 54 nicht (dx 20, WOOKY
  und EDDY), bei dx 100 traf 54 einmal (`rh_*`; gewertet ist die Höhe am
  Frame-Ende eines künstlich hochgehaltenen Gegners, Messverzerrung
  möglich); V4 nicht gemessen; dritte Messung entfällt.
- **Schaden an Behältern**: M4 nicht gemessen (an der Kiste nur die
  Kosten); V4 6 LP (Behälter Slot 43, 777 → 771, `v_beh_v60`, `v_beh_h30`);
  dritte Messung entfällt.
- **Mack, Tiefe und diagonal**: M4 nicht gemessen; V4 nicht gemessen (nur
  rechts und links); dritte Messung Tiefe −1,25 px/Frame ab P+2 bis zum
  Rand (`d3_lauf_0_u`), diagonal +1,5/−0,90625 ab P+21 (`d3_lauf_0_ru`), je
  ein Lauf.
- **Tiefe der Explosionen von Ginzu und Baby Head**: M4 vorn bis mindestens
  dz −28, hinten bis mindestens +43 (dx 100); V4 bei dx 0 +29 in P+20, −29
  nie, bei dx 100 +29 in P+12, −29 in P+8, dazu bei dz 16 eine Explosion in
  P+12 (dx 38 bis 40) und bei dz 29 eine in P+20; dritte Messung dz 16:
  P+12 bei dx 38 bis 40 (bei 34 bis 36 erst P+16), dz 29: P+20 bei dx −4
  bis 4, dazu `d3_zone_h2_zm16_*` (gesetzt −16, am Frame-Ende dz −12): P+8
  bei dx 44 bis 48. Die Grenzen je Explosion sind nicht ausgemessen.
- **Aktive Frames von Mack**: M4 Treffer immer in P+1, einmal in P+6
  (dx −93); das Attribut P+0x24 steht laut Abzug von P+1 bis P+60 auf
  `0x4C12`; V4 Treffer in P+1 (`v_f0_kontakt`), ein zweiter Gegner in P+32
  (`v_f0_viele`); dritte Messung entfällt. Einzelne Frames sind nicht
  geprüft.
- **Nach zerschlagenen Kisten**: M4 Kisten belegen danach Objekt-Slots, bei
  Ginzu fehlten einige Explosionen (Erkundung, nicht im Belegskript). Im
  Belegskript zeigen es `h2_drei` und `h3_drei` (ab `spezial_drei_h2/h3`):
  Der Gegner bei dx −40 wird erst in P+24 (Baby Head P+35) getroffen statt
  in P+16 (P+27) nach der Regel; der Kommentar in `belege_spezial.sh` nennt
  dafür fehlende Objekt-Slots. V4 nicht gemessen; dritte Messung entfällt.

Offen:

- Verwundbarkeit im angehängten zweiten Spezialangriff (P+71 bis P+101):
  Ein Gegner, der die Figur treffen könnte, würde vorher selbst getroffen.
- Spezialangriff gegen Bosse und schwerere Gegner (Flugweite, Umwerfen) und
  gegen liegende Gegner.
- Wirkung des 20-Frame-Timers bei Mack, Ginzu und Baby Head.
- Mack: Bewegung nach oben; ob seine Trefferfläche mitwandert.
- Ginzu und Baby Head: Grenzen zwischen P+16 und P+28 (−49/−50) und
  zwischen P+28 und P+32 (−67), nicht geprobt; Bereich von P+28 nur
  teilweise in 1-px-Schritten; Tiefen- und Höhengrenzen je Explosion.
- Aus dem Leerschlag: Grenze vor A+7, gemessen mit einem neuen
  Angriffsdruck.
- Flugweite in natürlichen Läufen: Ursache der abweichenden Flüge (siehe
  Zeile „Flug der Gegner“).
- Höhe des Gegners bei den anderen Figuren.

## Nachtrag: Sprint

Belege: `logs/sprint.csv` (Messagent M4) und `logs/sprint_v.csv`
(Gegenprüfer V4), beide erzeugt von `scripts/belege_sprint.sh`. M4:
Szenario `sprint_probe.lua` (lädt `spezial_probe.lua`), Auswertung
`messen_a5.py sprint` (Ereignisse, `--tempo`, `--frames`; Umsetzung in
`messen_spezial.py`) und `messen_spezial.py zusammenfassung-sprint`; 307
Läufe, davon 120 der dritten Messung (`d3_*`, Abschnitt 7). V4 (Block
„Gegenprüfung V4“ am Ende desselben Skripts): Szenario `sprint_v_frei.lua`
(Hülle um `spezial_v_frei.lua`), nur Watch-Protokoll, Auswertung
`messen_spezial_v.py` (`probe`, `tempo --bezug 0`, `ereignisse`); 180
Läufe. Das Skript braucht die Savestates `spezial_drei` und
`spezial_v_viele` aus `belege_spezial.sh`. Laufzeit vor Abschnitt 7 (von V4
gemessen): 149 s ohne, 303 s mit V4-Block auf stark ausgelastetem Rechner;
mit Abschnitt 7 nicht gemessen.

Reproduzierbarkeit: Vor der dritten Messung war `sprint.csv` in drei
Durchläufen bitgleich (M4 und zweimal V4, MD5
`c16a94f1afe1469bafc7f4ed6683824e`). `sprint_v.csv` (1340 Zeilen, MD5
`8af4f22659a42eb0c1077078f5b8f309`) war in zwei vollen Durchläufen
bitgleich. Mit den Läufen `d3_*` hat sich `sprint.csv` geändert (jetzt 5089
Zeilen, MD5 `4f2b5e9317c98a3daad881944294fe92`). Diese Fassung stammt laut
Dateizeiten aus einem Durchlauf des ganzen Skripts, in dem `sprint_v.csv`
wieder mit derselben MD5 entstand; ein zweiter Durchlauf zum Vergleich der
neuen `sprint.csv` ist nicht dokumentiert.

Laufnamen ohne das Präfix `sprint_`; die Läufe von V4 (in `sprint_v.csv`
`sprint_v_…`) heißen damit `v_…`. D2 ist der Frame des zweiten
Richtungsdrucks, „Sprintframe n“ der n-te Frame des Sprints (Sprintframe 1
= D2+1), A der Frame des Angriffsdrucks im Sprint bzw. Sprintsprung, J der
des Sprungdrucks im Sprint. Geschwindigkeiten in px/Frame (16.16 exakt).
dx/dz: Gegner minus Figur, ganzzahlig am Frame-Ende. Alle Werte für Captain
Commando.

**Methode.** M4 sprintet ab `ingame` (Figur allein am linken Rand), für die
Gegenrichtung ab `anlauf`, mit den Angriffen ab `kontakt` (WOOKY),
`kontakt_b` (EDDY), `anlauf_c` und `spezial_drei`, Beginn in Frame 2, 6
oder 10. Ausgewertet werden je Frame die Aktion (P+0x0A), Geschwindigkeit
in x und Tiefe, Höhe sowie LP und Lage der Gegner. Das Eingabefenster ist
mit erster Tastendauer und Pause von 1 bis 11 Frames in beide Richtungen
abgetastet. V4 hat zuerst nur M4s Ergebnistabelle gelesen und jede Zeile
mit eigenen Läufen nachgemessen: andere Savestates (`stage2`, `stage3`,
`anlauf_c`, `anlauf`, `tiefe_b`, `spezial_v_viele`),
Beginn in Frame 3, 5, 7, 9 oder 13, andere Druck- und Pausenlängen,
Reichweiten in 1-px-Schritten (M4: 2 px), die Höhe mit Nachkommawort
(P+0x14). Wo V4 abwich, hat M4 ein drittes Mal mit einer Variante gemessen,
die keiner von beiden genutzt hatte (`stage1`, `tiefe_b`, `anlauf_b`,
andere Sprung- und Angriffsframes). Status „gesichert“: von V4 bestätigt;
„gesichert (3. Messung)“: eine Abweichung, die eine gemeinsame Regel für
alle drei Messungen erklärt.

**Eingriffe** (EINGRIFF, in den Szenarien gekennzeichnet):

- Gegnerlage relativ zur Figur vor jedem Frame (bis A bzw. bis T−1
  200 px entfernt, ab A+1 bzw. nur im Frame T in Reichweite), andere
  Gegner mit `CC_WEG` 300 px beiseite: `sa_x_*`, `sa_z_*`, `sa_fen_*`,
  `sja_fen_*`, `sja_x_*`, `sja_z_*`, `d3_sja13_*`, `d3_sjax_*` (dort auch
  die Kisten in Slot 46/47 beiseite). In `sa_zwei_*` und `sg_dz0` nur in
  einzelnen Frames gesetzt, danach frei. `d3_tief_b`: nur Gegner beiseite.
- V4 (`CC_SETZE`, Gegner nur im geprüften Frame bei dx/dz, sonst 200 px
  rechts der Figur): `v_sa_fen_*`, `v_sa_x_*`, `v_sa_z_*`, `v_sja_fen_*`,
  `v_sja_x*`, `v_sja_z_*`, `v_sja_t1*`; `v_sja_hoehe_*`: Gegner ab A+1 fest
  bei dx.
- Ohne Eingriff: alle Sprints, Sprintsprünge, `sa_leer*`, `d3_rut_*`,
  `d3_sj_*`, `d3_tief_a`; natürliche Stichproben des Sprintangriffs
  `sa_nat_*`, `v_sa_nat_c`, `v_sa_nat_a`, `v_sa_viele`, `v_sa_viele2`
  (Treffer A+5, 9 LP, Flug 135,125 px), Griff `sg_k`, `sg_kb`, `v_sg_*`,
  Sprint-Sprungangriff `v_sja_nat_a3` (WOOKY bei dx 53 in A+20).

### Sprint

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| Eingabe | Doppeltipp derselben Richtung: erster Druck 1 bis 10 Frames, Pause 1 bis 10 Frames, unabhängig voneinander (10 + 10 geht). 11 Frames Druck oder 11 Frames Pause: kein Sprint, normales Gehen. Rechts und links gleich | gesichert | ab Frame 2 rechts `ew_d1_g2`, `ew_d10_g2`, `ew_d11_g2`, `ew_d2_g1`, `ew_d2_g10`, `ew_d2_g11`, `ew_d10_g10`, `ew_d1_g11`, `ew_d11_g1`, `ew_d8_g5`; ab Frame 10 links `ew_l_d10_g2`, `ew_l_d11_g2`, `ew_l_d2_g10`, `ew_l_d2_g11`; `v_ew_d1_g1`, `v_ew_d10_g10`, `v_ew_d10_g1`, `v_ew_d1_g10`, `v_ew_d6_g4` (stage2, ab Frame 9), `v_ew_l_d10_g10`, `v_ew_l_d3_g3` (anlauf_c, links, ab 5); kein Sprint `v_ew_d11_g1`, `v_ew_d1_g11`, `v_ew_d11_g11`, `v_ew_l_d11_g1`, `v_ew_l_d1_g11` |
| Zweiter Druck | muss gehalten werden: Sprint ab D2+1, solange die Richtung gehalten wird, höchstens 90 Frames. Kommt beim zweiten Druck eine weitere Richtung dazu (rechts, dann rechts+hoch; links, dann links+runter), gibt es keinen Sprint, sondern Gehen diagonal | gesichert | `ew_h1/h2/h5/h20` (1, 2, 5, 20 Frames Sprint), `ri_r` (D2=6: 7–96), `ri_r_b` (D2=17: 18–107), `ew_misch`; `v_ew_h1` (13), `v_ew_h3` (13–15), `v_ew_h30` (13–42), `v_ew_hmax` (13–102), `v_ri_r_s2` (D2=18: 19–108), `v_ew_misch2`, `v_ew_misch` |
| Geschwindigkeit x | Sprintframe 1: 1,75 (Gehtempo), Sprintframes 2–6: 3,875, danach alle 6 Frames 0,125 weniger bis 2,125 (Sprintframes 85–90). Weg in 90 Frames 267,875 px. Nach links gleich | gesichert | `ri_r`, `ri_r_b`, alle `ew_*`; links `ri_l`, `ew_l_d10_g2` (bis zum Bildrand); `v_ri_r_s2` (19: 1,75; 20–24: 3,875; 103–108: 2,125), `v_ri_l_c` (links bis zum Bildrand nach 51 Frames), alle `v_ew_*` |
| Geschwindigkeit Tiefe | Sprintframe 1: 1,0, dann 2,421875 (= 0,625 × 3,875), alle 6 Frames 0,078125 weniger. Gemessen bis Sprintframe 41 (1,953125, `v_ri_d_s2`), M4 bis Sprintframe 33 (2,03125); danach war jeder Lauf am Rand | gesichert | `ri_h`, `ri_u`; `v_ri_u_s2`, `v_ri_d_s2` (stage2, hoch und runter), `v_ri_u_ing`, `v_ri_band` |
| Tempo Tiefe nach Sprintframe 41 | nicht gemessen: Alle Tiefenläufe erreichen vorher den Rand (`ri_h`, `ri_u`, `v_ri_band` nach 34, `v_ri_u_s2` nach 24, `v_ri_d_s2` nach 42 Sprintframes). M4s Entwurf nennt `v_ri_u_s2` und `v_ri_d_s2` als Messung über die vollen 90 Frames, beide enden aber am Rand. Hinweis ohne Messung: Die Zitterwerte am Rand sinken im selben 6-Frame-Takt weiter (zuletzt 0,328125 bzw. −0,671875, also 1,328125 = 0,625 × 2,125 minus 1 bzw. 2 px) | offen | – |
| Tiefe am Rand | Am Rand der Tiefe stoppt nur die Bewegung, nach so vielen Frames, wie der Platz reicht; die Figur zittert dort um weniger als 1 px. Die Sprintaktion 0x02 läuft weiter bis zum Loslassen bzw. D2+90. In Stage 1 sind höchstens 75 px frei (Tiefe 266 bis 341, 34 Frames Bewegung) | gesichert (3. Messung) | `ri_h`, `ri_u`; `v_ri_band` (Sprint ab 75, Rand in 108, Aktion 0x02 bis 164); `d3_tief_a` (stage1 hoch, 37 px frei: 16 Frames Bewegung, Aktion 90 Frames), `d3_tief_b` (tiefe_b runter, 54 px frei: 23 Frames, 90 Frames) |
| Geschwindigkeit diagonal | Doppeltipp diagonal oder hoch/runter dazu: Sprintframe 1: 1,25 / 0,75, dann x 2,90625 (0,75 × 3,875) und Tiefe 1,75586; alle 6 Frames x 0,09375 und Tiefe 0,05664 weniger | gesichert | `ri_rh`, `ri_ru`, `ri_lh`, `ri_lu`; `v_di_rh`, `v_di_rd`, `v_di_lu` (tiefe_b), `v_di_ld` (anlauf_c), `v_rw_dazu` |
| Fehler diagonal nach rechts | Fehler im Spiel: In den Sprintframes 7–12 ist x 4,8125 statt 2,8125, also 12 px mehr Weg. Nach links nicht (−2,8125) | gesichert | `ri_rh`, `ri_ru` (+4,8125), `ri_lh`, `ri_lu` (−2,8125); `v_di_rh` (Frames 20–25), `v_di_rd` (71–76): 4,8125; `v_di_lu`, `v_di_ld` (16–21): −2,8125 |
| Loslassen | Der Sprint endet im Frame nach dem Loslassen, ohne Auslaufen | gesichert | `ew_h1/h2/h5/h20`; `v_ew_h1`, `v_ew_h3`, `v_ew_h30` |
| Ende nach 90 Frames | 1 Frame Stand, dann Gehen, falls die Richtung weiter gehalten ist | gesichert | `ri_r` (97 steht, ab 98 1,75), `ri_r_b`, `rw_neu_gehalten`; `v_ri_r_s2` (108 letzter Sprintframe, 109 Stand, ab 110 1,75), `v_ew_hmax` |
| Richtungswechsel | Gegenrichtung: Sprint endet, 1 Frame Stand, dann Gehen in die neue Richtung. Hoch oder runter dazu: der Sprint wird diagonal, der Tempoplan läuft weiter; loslassen macht ihn wieder gerade. Nur noch hoch: Sprint endet, 1 Frame Stand, dann Gehen hoch (V4 ausdrücklich; M4s `rw_nur_hoch` passt: Sprint bis D2+14, bewegt ab D2+16) | gesichert | `rw_links`, `rw_hoch`, `rw_nur_hoch`; `v_rw_links` (40 letzter Sprintframe, 41 Stand, ab 42 −1,75), `v_rw_dazu` (hoch 30–45: 31–46 diagonal, ab 47 wieder gerade mit 3,25), `v_rw_nur_hoch` (41 Stand, ab 42 hoch 1,0) |
| Neuer Sprint | nur mit neuem Doppeltipp, sofort nach dem Ende möglich (Tipp im ersten Frame danach); die über das Ende gehaltene Richtung gibt nur Gehen | gesichert | `rw_neu`, `rw_neu_sofort`, `rw_neu_gehalten`; `v_rw_neu` (Ende 42, Tipp 43, neuer Sprint ab 47), `v_ri_r_s2` |
| Griff aus dem Sprint | gibt es nicht: Die Figur läuft durch den Gegner hindurch (Tiefe 10 und 0). Nach dem Ende des Sprints greift sie beim Gehen wieder | gesichert | `sg_k`, `sg_kb`, `sg_dz0`; Gegenprobe `sg_lauf`, `sg_lauf_nach` (Griff bei dx 39 bzw. 32); `v_sg_c` (EDDY, dz 0: bis dx 2 ohne Griff), `v_sg_a` (WOOKY, dz 4–6: von dx 9 auf −2 ohne Griff), `v_sg_c_nach` (Griff bei dx 38) |
| Spezialangriff aus dem Sprint | Angriff und Sprung: Spezialangriff ab P+1, der Sprint endet sofort | gesichert | `sp_spezial`; `v_sp_spezial` (P=30, 0x14 ab 31, x fest ab 31), `v_sp_spezial_c` (links) |

### Sprintangriff (Angriff im Sprint)

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| Ablauf | Aktion 0x06 ab A+1, Treffer ab A+5. Ohne Treffer Aktion bis A+35, Gehen bewegt ab A+37; mit Treffer 7 Frames später (Aktion bis A+42, Gehen ab A+44) | gesichert | `sa_leer20`, `sa_leer40`, `sa_nat_k`, `sa_nat_kb`, `sa_nat_ac`; `v_sa_leer9` (A=21: 22–56, Gehen ab 58), `v_sa_leer40` (A=52: 53–87, ab 89), `v_sa_nat_c`, `v_sa_nat_a` (Treffer A+5, bis A+42), `v_sa_nat_c_lauf` (Gehen ab A+44) |
| Aktive Frames | A+5 bis A+14 (10 Frames); A+4 und A+15 nie | gesichert | `sa_fen_k_t*` (WOOKY, A=14), `sa_fen_kb_t*` (EDDY, A=20); `v_sa_fen_e_t4/t5/t14/t15` (EDDY, A=12), `v_sa_fen_w_*` (WOOKY, A=15) |
| Schaden | 9 LP, wirft um; Flug 135,125 px | gesichert | `sa_nat_k` (WOOKY), `sa_nat_kb`, `sa_nat_ac` (EDDY); `v_sa_nat_c` (EDDY 30 → 21), `v_sa_nat_a` (WOOKY 16 → 7), `v_sa_viele` (−135,125) |
| Reichweite | im ersten aktiven Frame (A+5) bis 105 px vor der Figur (106 nie) und bis 26 px hinter ihr (27 nie); Tiefe ±12 (13 nie). WOOKY und EDDY gleich | gesichert | `sa_x_k_*`, `sa_x_kb_*`, `sa_z_k_*`, `sa_z_kb_*` (2-px-Schritte, schließen die Grenzen ein); `v_sa_x_e_*`, `v_sa_x_w_*` (1-px-Schritte), `v_sa_z_*` |
| Gegner dicht an der Figur | bei dx −4 (WOOKY genau über der Figur) erster Treffer erst in A+9, bei dx −12, −8, 0 und +4 schon in A+5 (dx am Frame-Ende in A+5) | unsicher | nur M4: `sa_x_k_0` (gesetzt 0, in A+5 dx −4, Treffer A+9 bei dx −2); `sa_x_k_m8`, `sa_x_k_m4`, `sa_x_k_4`, `sa_x_k_8` (Treffer A+5 bei dx −12, −8, 0, +4) |
| Rutschen | A+1 steht die Figur, ab A+2 rutscht sie mit dem letzten Sprinttempo, jeden Frame 0,15625 weniger bis 0: 43,875 px nach Angriff in Sprintframe 14 (Tempo 3,625), 35,4375 px in Sprintframe 34 (3,25), 50 px gleich nach Sprintbeginn (3,875). Gerutscht wird nur, wenn die Richtung im Frame A noch gedrückt ist (danach darf sie losgelassen werden). Zuletzt in A−1 gedrückt: Sprintangriff (0x06, 35 Frames) ohne Rutschen; zuletzt in A−2: der Sprint ist schon vorbei, es kommt der normale Schlag (0x10) | gesichert (3. Messung) | `sa_leer20`, `sa_leer40`, `sa_leer20_los` (Richtung bis A+1), `sa_nat_*` (50 px); `v_sa_leer9` (3,75: 46,875 px), `v_sa_leer40` (3,125: 32,8125 px), `v_sa_nat_c` (3,875: 50 px), `v_sa_los_a`, `v_sa_los_a1` (rutscht), `v_sa_los_vor`, `v_sa_leer2_los` (kein Rutschen); `d3_rut_l18` (A−2: Schlag), `d3_rut_l19` (A−1: ohne Rutschen), `d3_rut_l20`, `d3_rut_l21` (43,875 px) |
| Mehrere Gegner | Gegner auf dem Weg werden alle getroffen, jeder einmal (je 9 LP, umgeworfen); keiner wird mitgeschoben | gesichert | `sa_zwei_a` (A+5 und A+6), `sa_zwei_b` (beide A+5), EINGRIFF nur in A+1; `v_sa_viele` (A=14), `v_sa_viele2` (A=20), ohne Eingriff |

### Sprintsprung und Sprint-Sprungangriff

| Größe | Wert | Status | Beleg |
|---|---|---|---|
| Sprintsprung | Aktion 0x04; Flugbahn wie der normale Vorwärtssprung: 2,25 px/Frame über 41 Frames, 92,25 px, 40 Frames in der Luft (J+2 bis J+41), Steighöhe 51,25 px (Scheitel in J+21), Landung J+42 bis J+47, frei ab J+48. Das Sprinttempo wird nicht mitgenommen. Absolut liegt der Scheitel bei 51,5, weil die Figur bei Höhe 0,25 steht | gesichert (3. Messung) | `sj_20` (bei 3,625), `sj_60` (bei 2,875), Vergleich `sj_norm`; `v_sj_10` (bei 3,75), `v_sj_50` (bei 2,875; V4 schreibt 3,0, das galt aber nur bis J−2), `v_sj_norm`; `d3_sj_s1`, `d3_sj_norm_s1` |
| Sprint-Sprungangriff: Schaden | 13 LP, wirft um (Status danach 2) | gesichert | `sja_*` (WOOKY und EDDY, EINGRIFF); `v_sja_nat_a3` (ohne Eingriff: WOOKY 16 → 3 in A+20), alle `v_sja_*` mit Treffer |
| Sprint-Sprungangriff: Flug des Gegners | fällt auf der Stelle, kein Flug | unsicher | `v_sja_nat_a3` (nur V4) |
| Sprint-Sprungangriff: aktive Frames | A+13 (ein Frame; A+12 und A+14 nie) und A+20 bis A+39 (A+19 und A+40 nie). Nach der Landung wirkt er bis A+39 weiter, bei spätem Angriff auch, wenn die Aktion schon vorbei ist und die Figur wieder geht (die Aktion 0x08 endet mit der Landung nach J+48, ohne Treffer und mit Treffer ab A+20: `sja_leer`, `d3_sjax_*`, `sja_fen_a14_t53`, `v_sja_nat_a3`; ein Treffer in A+13 verlängert sie um 7 Frames, `sja_fen_a34_t47`. Bei frühem Angriff wie in `sja_leer` mit A = J+8 läuft sie also bis A+40) | gesichert | `sja_fen_a14_t*`, `sja_fen_a30_t*`, `sja_fen_a34_t*`, `sja_fen_kb_t*` (EDDY); `v_sja_fen_*_t12/13/14/19/20/39/40` (A=J+25), `v_sja_t12_*`, `v_sja_t14_*` |
| Sprint-Sprungangriff: Höhe der Figur | In A+13 trifft er Gegner am Boden nur bei niedriger Figurhöhe (16 und 12 px ja, 20 und 24 px nie; geprüft bei dx 38 bis 96); von A+20 bis A+39 bis 20 px Höhe (24 nie) | gesichert (3. Messung) | `sja_fen_a34_t*` (A+13 bei 16 px), `sja_fen_a14_t*`; `v_sja_hoehe_*_a5`, `v_sja_hoehe_*_a8` (erster Treffer bei Höhe 20, Vorframe 24), `v_sja_t13_*_a25_v60` (20: nie), `v_sja_t13_*_a26_*` (16: ja), `v_sja_t13_*_a27_v40` (12: ja); `d3_sja13_*` (EDDY ab tiefe_b, WOOKY ab anlauf_b, J=9, dx 60 und 100: 24 nie, 20 nie, 16 ja) |
| Sprint-Sprungangriff: Höhengrenze genau | zwischen 16 und 20 px (A+13) bzw. 20 und 24 px (A+20 bis A+39) liegt kein Frame der Sprungkurve | offen | – |
| Sprint-Sprungangriff: Reichweite in A+13 | nicht gemessen. Beobachtet: Treffer bei dx 38 bis 96 (V4 `v_sja_t13_*`, dritte Messung dx 55 und 95), der EDDY bei dx 98 und 12 px Höhe nicht (`v_sja_t13_e_a27_v100`) | offen | – |
| Sprint-Sprungangriff: Reichweite in A+20 | am Boden 38 bis 147 px vor der Figur, WOOKY und EDDY gleich | gesichert (3. Messung) | `sja_x_k_*`, `sja_x_kb_*` (in A+21, 2-px-Schritte: WOOKY 38–146, EDDY 39–147); `v_sja_x20_*` (38–147; 37 und 148 nie); `d3_sjax_*_k20_*` (38–147; 36 und 149 nie) |
| Sprint-Sprungangriff: hinten und Tiefe | trifft nichts hinter der Figur; Tiefe ±12 (13 nie) | gesichert | `sja_x_k_m10`, `sja_x_k_m30`, `sja_z_k_*` (A+21); `v_sja_x_*_h10/h40`, `v_sja_z_*` (A+30) |
| Sprint-Sprungangriff: Reichweite nach A+20 | wächst nach vorn bis etwa A+30 und wird zum Ende kürzer; die Werte weichen zwischen V4 und der dritten Messung ab (siehe „Unsicher“) | unsicher | `v_sja_x25_*`, `v_sja_x_*`, `v_sja_x30_*`, `v_sja_x39_*`; `d3_sjax_*_k25_*`, `_k30_*`, `_k35_*`, `_k39_*` |
| Sprint-Sprungangriff gegen Gegner in der Luft | nicht gemessen | offen | – |
| Andere Figuren | Sprint, Sprintangriff und Sprint-Sprungangriff von Mack, Ginzu und Baby Head nicht gemessen (laut Grafik-Workflow gleicher Sprint) | offen | – |

**Abweichungen der Gegenprüfung und dritte Messung** (Läufe `d3_*`,
Abschnitt 7 von `belege_sprint.sh`, Gruppen `tempo` und `dritte_*` in
`sprint.csv`):

- **Tiefe am Rand**: M4 „der Sprint endet nach etwa 31 Frames am Rand“; V4
  nur die Bewegung stoppt nach 34 Frames, die Aktion 0x02 läuft bis D2+90;
  dritte Messung hoch ab `stage1` (37 px frei) 16 Frames Bewegung, runter ab
  `tiefe_b` (54 px frei) 23 Frames, Aktion jeweils 90 Frames. In M4s `ri_h`
  lief die Aktion ebenfalls weiter; der Wert war falsch beschrieben.
- **Rutschen**: M4 „auch ohne gehaltene Richtung“; V4 nur mit Richtung im
  Frame A; dritte Messung ab `stage1` (A=20) wie V4. M4s `sa_leer20_los`
  hielt die Richtung bis A+1.
- **Scheitel des Sprintsprungs**: M4 51,5 px, V4 51,25 px; dritte Messung
  ab `stage1` absolut 51,5 bei Standhöhe 0,25, also 51,25 Anstieg, beim
  normalen Sprung ebenso.
- **Sprint-Sprungangriff in A+13**: M4 „trifft bis 20 px Höhe“ (in A+13 nur
  bei 16 px gemessen), V4 bei 16 px ja, bei 20 px nicht; dritte Messung
  24 nie, 20 nie, 16 ja (vier Läufe). M4s „bis 20 px“ galt nur für A+20 bis
  A+39.
- **Reichweite in A+20**: M4 maß nur in A+21 (WOOKY 38–146, EDDY 39–147,
  2-px-Schritte), V4 in A+20 38–147 für beide, dritte Messung ebenso.

**Korrekturen.** `grafik/README.md` („Gemeinsame Bewegungen“): Der Sprint
legt in 90 Frames 267,875 px zurück (dort 266 px). Der Sprintangriff ist 10
Frames aktiv (A+5 bis A+14), nicht 23. Die „41 px (3,5 px/Frame
abnehmend)“ gelten nur für dieses Anfangstempo; der Weg hängt vom
Sprinttempo im Frame A ab (gemessen 32,8125 px ab 3,125 bis 50 px ab
3,875; M4s Spanne „35–50 px“ ist zu eng). Die Tabelle des Captains dort
(Rutschen ab 3,75 px/Frame, −0,15625 je Frame, 46,875 px) passt zu
`v_sa_leer9`.

**Abgleich mit `docs/mechanik.md`.** Kein Widerspruch zu gesicherten
Werten: Gehtempo 1,75 / 1,0 / 1,25 und 0,75 (Sprintframe 1), Eingabelatenz
(Sprint ab D2+1), Sprung (2,25 px/Frame, 92,25 px, Steighöhe 51,25 px,
Scheitel J+21, frei ab J+48), Trefferstopp 7 Frames (Sprintangriff mit
Treffer 7 Frames länger) und Umwerfen (135,125 px) stimmen überein. Zwei
Ergänzungen statt Widersprüchen: „Richtungswechsel ohne Verzögerung“ gilt
für das Gehen; aus dem Sprint gibt es beim Wechsel 1 Frame Stand. In
„Griff auslösen“ fehlt der Sprint bei den Fällen ohne Griff.

Unsicher (Werte von M4, V4 und der dritten Messung):

- **Reichweite des Sprint-Sprungangriffs nach A+20**: M4 erste Messung nur
  in A+21 (siehe oben). V4: A+25 bis mindestens 155; A+30 EDDY bis 175
  (180 nie), WOOKY bis 162 (164 nie); A+39 EDDY bis 162 (164 nie), WOOKY
  160 nie. Dritte Messung (EDDY ab `tiefe_b`, WOOKY ab `anlauf_b`, Kisten
  beiseite, Angriff 21 bzw. 25 Frames nach dem Sprung, beide Gegner
  gleich): A+25 bis 165/166 (169/170 nie); A+30 bis 172–174 (176 nie);
  A+35 bis 165 (169 nie), bei spätem Angriff schon 157 nie; A+39 bis 140
  (150 nie). Widerspruch bleibt: WOOKY in A+30 162 (V4) gegen 172 (dritte),
  EDDY in A+39 162 (V4) gegen 140 (dritte). V4s EDDY-Läufe ab `anlauf_c`
  trafen in A+28 eine Kiste (Slot 46), deren Trefferstopp die späteren
  Frames verschiebt; in M4s verworfenem Vorlauf ohne Eingriff an den Kisten
  traf der Angriff ab `tiefe_b` in A+20 eine Kiste und reichte danach in
  A+39 bis 156 (160 nie), dieser Vorlauf steht nicht im Belegskript. Die
  Läufe unterscheiden sich auch sonst: V4 hält die Richtung nur bis zum
  Sprungdruck und setzt den WOOKY nicht auf Tiefe 0; in der dritten Messung
  bleibt die Richtung gehalten, die Figur geht nach der Aktion weiter. Ob
  das die späten Frames beeinflusst und ob Kistenteile mittreffen, ist nicht
  geprüft. Aus den Logs, in keinem Entwurf genannt: Auch die nahe Grenze in
  A+30 weicht ab, V4 37 nie und 38 ja (beide Gegner, `v_sja_x_*_v37/v38`),
  dritte Messung bei A = J+25 schon 34 ja (`d3_sjax_*_a34_k30_v34`), bei
  A = J+21 36 nie und 40 ja.
- **Sprintangriff dicht an der Figur**: M4 bei dx −4 (WOOKY genau über der
  Figur) erster Treffer erst in A+9, bei dx −12, −8, 0, +4 in A+5
  (vermutlich dreht sich der Gegner beim Überholen um); V4 nicht gemessen
  (hinten nur die Grenze 26/27); dritte Messung entfällt.
- **Flug des Gegners beim Sprint-Sprungangriff**: M4 nur „wirft um“, Flug
  nicht ausgewertet; V4 fällt auf der Stelle, kein Flug (`v_sja_nat_a3`,
  ohne Eingriff); dritte Messung entfällt.

Offen:

- Genaue Höhengrenze des Sprint-Sprungangriffs (zwischen 16 und 20 px in
  A+13, zwischen 20 und 24 px in A+20 bis A+39): Die Sprungkurve hat
  dazwischen keinen Frame, messbar nur mit Eingriff an der Höhe.
- Reichweite des Sprint-Sprungangriffs in A+13 (beobachtet dx 38 bis 96,
  EDDY bei dx 98 und 12 px Höhe kein Treffer).
- Tempo in der Tiefe nach Sprintframe 41: Jeder Lauf erreichte vorher den
  Rand; nötig wäre eine Stelle mit rund 170 px freier Tiefe oder ein
  Eingriff an der Tiefe.
- Sprint-Sprungangriff gegen Gegner in der Luft.
- Sprint, Sprintangriff und Sprint-Sprungangriff der anderen Figuren (laut
  Grafik-Workflow gleicher Sprint, nicht gemessen).

## Nachtrag: Gegenstände und Waffen

Belege: `logs/item.csv` (Messagent, 872 Zeilen: Teile A–D und am Ende die
Abschnitte „dritte Messung“ aus Teil W) und `logs/item_v.csv`
(Gegenprüfer, 1183 Zeilen, Teil V), beide erzeugt von
`scripts/belege_item.sh`. Szenarien: `scenarios/item_frei.lua` (freie
Eingaben, Messagent und dritte Messung), `scenarios/item_bot.lua`
(Konfiguration für `grafik/bot.lua`), beim Gegenprüfer
`scenarios/item_v_frei.lua` und `scenarios/item_v_bot.lua`. Auswertung:
`scripts/messen_item.py` bzw. `scripts/messen_item_v.py`. Das Skript macht
486 MAME-Läufe: beim Messagenten 9 Bot-Läufe (Stage 1–9), 3 Läufe für
Savestates, 123 Einzelläufe und 46 Läufe der dritten Messung, beim
Gegenprüfer 9 Bot-Läufe, 6 Läufe für Savestates, 275 Messläufe und 15
Erklärungsläufe. Der letzte vollständige Lauf mit allen Teilen dauerte
14 min und lief ohne Fehler. Reproduzierbar: Teil A–D lief zweimal beim
Messagenten und dreimal beim Gegenprüfer von vorn, `logs/item.csv` war
jedes Mal bitgleich (MD5 `574147291edef99ae2001c6eedaeefe1`). Nach dem
Anhängen von Teil W hat `logs/item.csv` die MD5
`f7d18ababf1709e03f7f40a5a4eeb111`; ihre ersten 755 Zeilen haben weiter die
alte MD5. `logs/item_v.csv` blieb bitgleich (MD5
`c739e85610703b8fceda7d2e3f083b35`). Das Skript löscht danach die
Rohabzüge; die Savestates `item_*` und `item_v_*` bleiben lokal in
`logs/raw/sta/` (git-ignoriert). Voraussetzung sind die Savestates
`stage1` bis `stage9`, `ingame` und `anlauf_c`.

**Methode.** Der Messagent startet seine Läufe an Savestates, die ein
Durchlauf-Bot anlegt: bei den Ölfässern (`item_bot1_s1_cam01281`), beim
Betreten der Bossarena (`item_bot1_s1_cam02048`) und in Stage 3, 6, 7, 8,
wo ein bestimmter Gegenstand liegt (`item_s<Stage>_<Art>`). Von dort spielt
`item_frei.lua` feste Eingaben ein und schreibt in jedem Frame den Speicher
`FFA900`–`FFEA00` mit. Ausgewertet werden die Objekt-Slots 20–59, die
Waffenfelder der Figur, die Geschossblöcke der Figur, LP und Punkte.
Reichweiten und Aufnahmebereich sind per EINGRIFF gemessen, mit
natürlichen Stichproben. Der Gegenprüfer kannte zuerst nur die
Ergebnistabelle. Er hat eigene Szenarien, eigene Savestates (Stage 1 ab
`ingame`, Waffen aus Fass 43 und aus Stage 5, 6 und 7 statt aus der
Bossarena) und andere Gegner (MUSASHI, SASUKE, KOJIRO, EDDY, DICK) benutzt. Die Szenarien des Messagenten hat er erst
danach in Erklärungsläufen (`item_v_m5_*`) verwendet, die nicht als
Gegenläufe zählen. Von 42 Zeilen hat er 32 bestätigt, 8 wichen ab und 2
waren nicht prüfbar. Die acht abweichenden Zeilen hat der Messagent ein
drittes Mal gemessen (Teil W, Präfix `item_d`), jeweils mit anderer
Reihenfolge, anderen Startframes, anderem Gegner-Slot und anderer Position
als in beiden ersten Messungen.

Konventionen: P ist der Frame des Drucks, L der Frame der Landung eines
Gegenstands (Liegezeit 700), K der Druck des Kniestoßes, E die
Wurfeingabe. dx = x(Gegner bzw. Gegenstand) − x(Figur), positiv rechts der
Figur, dz entsprechend in der Tiefe. Kamera-x (`FFE99E`) ist der linke
Bildrand. Offsets im Spielerblock (`FFA990`) heißen P+0x.., in den
Objekt-Slots S+0x.. (hexadezimal, wie in „Nachtrag: Schaden der Gegner“).
Positionen sind ganzzahlig am Frame-Ende. Ein gesetzter Gegner
läuft im Frame noch 1 bis 3 px, angegeben ist der gemessene Abstand. Läufe
des Gegenprüfers heißen `item_v_*`, die der dritten Messung `item_d_*`.

**Eingriffe (EINGRIFF).**

- Bots (`item_bot*`, `item_v_b*`): LP der Figur aufgefüllt, Gegner-LP im
  Bild auf 1 nach 900 (Messagent) bzw. 600 Frames (Gegenprüfer) ohne
  Kamerafortschritt. Das ändert die Wellen, nicht die Regeln der
  Gegenstände. Viele Siege über SKIP, MARDIA und die Bosse folgen auf diesen
  Eingriff.
- Bossarena (`item_save_*`, `item_a_*` außer `item_a_liegen`, `item_w_*`,
  `item_ham_*`, `item_las_*`, `item_mis_*`, `item_nah_*`, die `item_d_*`
  dort außer `item_d_kill_dolg*`, `item_v_m5_*`): DOLG (Slot 19) jeden
  Frame auf x 2700.
- Reichweiten: WOOKY mit 100 LP jeden Frame relativ zur Figur gesetzt
  (`item_ham_*`, `item_las_*`, `item_mis_*`, `item_w_multi_*`; in
  `item_d_*` dazu Vorframe- und Max-LP 100). Gegenprüfer: `CC_ELP` (LP,
  Vorframe-LP und Max-LP 100) und `CC_SETZE` in `item_v_mz_*`, `item_v_lz_*`,
  `item_v_hz_*`, `item_v_gz_*`, `item_v_mg_*`, andere Gegner beiseite.
- Aufnahmebereich: Gegenstand alle 2 Frames um 1 px verschoben, die anderen
  Gegenstände 300 px weg (`item_nah_*`; `item_d_nah_*` rückwärts ab Frame
  40, beide WOOKY 300 px weg). Gegenprüfer: Raketenwerfer fest gesetzt
  (`item_v_sw_*`).
- Heilwerte: LP der Figur gesetzt (`item_f_essen10/40/70/71`,
  `item_k_*_lp10/40/70`, `item_v_huhn_lp*`, `item_v_e_*_lp*` außer `lp72`,
  `item_v_waffe_essen`, `item_v_huhn_links*`); in Stage 3, 6, 7, 8 die Figur
  auf den Gegenstand gesetzt (`item_k_*`). `item_f_fass`, `item_f_scroll`
  und `item_v_mech` halten die LP der Figur auf 72.
- Dritte Messung, Abschüsse (`item_d_kill_*`): Ziel 40 px vor die Figur
  gesetzt, seine LP so, dass Kettenstufe k tötet; bei MARDIA und DOLG LP der
  Figur auf 72 gehalten, bei DOLG dazu beide WOOKY auf x 1900. `item_d_mgun_*`: SASUKE bzw. Typ `0x6C660` mit
  100 LP gesetzt, Figur auf den Gegenstand gesetzt.
- `item_v_kiste_r*`: Rang festgehalten. `item_v_s5_las_auf`: zwei Gegner
  während der Laser-Aufnahme 300 px links gehalten.
- Zwei Artefakte von Eingriffen haben die erste Messung verfälscht. Setzt
  ein Eingriff nur die LP (S+0x40) eines Gegners über dessen Max-LP
  (S+0x9A), löst ein Angriff im Griff nichts aus (`item_w_griff`,
  `item_v_m5_griff`; mit Max-LP 100 der Kniestoß, `item_v_m5_griff_max`).
  Im Aufnahme-Sweep `item_nah_*` wirft ein WOOKY die Figur in Frame 204 um,
  genau als der Sweep dx +19 erreicht (`item_v_m5_nah_mxr` 200–206).
- Ohne Eingriff: Aufnahme `item_f_nah_*`, `item_v_mn_*`,
  `item_d_nah_lnat`; Rakete `item_f_waffe`, `item_v_mis_*`,
  `item_v_fass_rakete`; Hammer und Laser gegen anrückende WOOKY
  (`item_a_hammer`, `item_a_laser`, nur DOLG fern); Griff, Kniestoß und
  Wurf mit Waffe (`item_v_griff_gun`, `item_v_griff_wurf`, `item_d_griff*`);
  Liegezeit `item_a_liegen`, `item_v_liegen`; Fässer `item_v_fass*`.

**Abweichungen und dritte Messung** (Ergebnis in den Tabellen):

- Aufnahmebereich rechts: Der Messagent maß +18 für alle Gegenstände. Das
  war das Artefakt aus Frame 204. Die Grenze hängt von Gegenstand und
  Blickrichtung ab.
- Treffbereich der Rakete: In der Bossarena schlägt sie an der Wand bei dx
  150 ein und trifft ab dx 60, frei fliegend schlägt sie bei 163 ein und
  trifft ab 97.
- Hammer: Der Bereich hängt vom Gegnertyp ab (WOOKY beim Messagenten,
  MUSASHI beim Gegenprüfer).
- Laser: Die Trefferframes folgen ab etwa 100 px Abstand einer Formel auf
  etwa einen Frame genau. Der Strahl endet am ersten Gegner, wenn dieser
  überlebt.
- Angriff im Griff mit Waffe: Kniestoß. „Keine Aktion“ war das
  Max-LP-Artefakt. Den Wurf mit Waffe (beim Messagenten offen) hat der
  Gegenprüfer gemessen und die dritte Messung bestätigt.
- Punkte: MARDIA gibt einen Grundwert (900) plus die Punkte des tödlichen
  Kettenschlags. Bei SKIP kommen in allen drei Messungen zwei Grundwerte vor
  (250 und 300, jeweils plus Trefferpunkte); wann welcher gilt, hat die
  dritte Messung nicht geklärt, SKIP bleibt deshalb unsicher. DOLG und die
  Bosse von Stage 6 und 8 geben einen festen Wert, die von Stage 3 und 4
  Grundwert plus Trefferpunkte. Die Punkte je M-GUN-Kugel hängen vom
  Gegnertyp ab.

### Essen und SHURIKEN

| Gegenstand (Art S+0x3D) | Wirkung | Beleg | Status |
|---|---|---|---|
| Brathähnchen (0x20), Stage 1 Ölfass 44, Stage 2 | heilt voll: 10, 40, 70, 71 → 72 LP (Gegenprüfer 2, 35, 66, 71 → 72, Stage 2 50 → 72), ohne Punkte. Bei 72 LP statt dessen 1000 Punkte | `item_f_essen10/40/70/71/72` 336, `item_f_essen_waffe` 441; `item_v_huhn_lp2/35/66/71/72` P 135, `item_v_e_s2_lp50/72` P 145 | gesichert |
| TENDON (0x22), Stage 6 | +55 LP (10 → 65; Gegenprüfer 16 → 71, 17 → 72), 40 und 70 → 72; bei 72 LP 800 Punkte | `item_k_s6_22_lp*` 21; `item_v_e_s6t_lp16/17/72` P 55 | gesichert |
| Essen 0x24 (Name offen), Stage 8 und 6 | +40 LP (10 → 50; Gegenprüfer 31 → 71, 33 → 72); bei 72 LP 500 Punkte | `item_k_s8_24_lp*` 161; `item_v_e_s624_lp31/33/72` P 89 | gesichert |
| Essen 0x2A (Name offen), Stage 8 | +12 LP (10 → 22, 40 → 52; Gegenprüfer 59 → 71, 61 → 72); bei 72 LP 100 Punkte | `item_k_s8_2a_lp*` 161; `item_v_e_s82a_lp59/61/72` P 3 | gesichert |
| CHERRY (0x2C), Stage 7 und 8 | +16 LP (10 → 26, 40 → 56, 70 → 72; Gegenprüfer 55 → 71, 57 → 72, 30 → 46); bei 72 LP 100 Punkte | `item_k_s7_2c_lp*` 13, `item_k_s8_2c_lp*` 161; `item_v_e_s7c_lp55/57` P 15, `item_v_e_s8c_lp30/72` P 25 | gesichert |
| SHURIKEN (0x0E), Stage 3 und 7 | Captain Commando nimmt ihn nicht als Waffe: 300 Punkte, LP und P+0x79 (`FFAA09`) unverändert (auch bei LP 40) | `item_k_s3_0e_w` 21, `item_k_s7_0e_w` 101; `item_v_e_s3s_lp40/72` P 25, Bot `item_v_b3` 5078 | gesichert |

Bei LP unter 72 gibt kein Essen Punkte.

### Waffen und Behälter

Reichweiten und Schaden beim Messagenten gegen WOOKY (per EINGRIFF mit
100 LP), beim Gegenprüfer auch gegen SASUKE, KOJIRO, MUSASHI, EDDY und DICK.

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Raketenwerfer (MISSILE, 0x08): Munition, Ablauf | 3 Schuss (alle Funde voll), Munition sinkt in P+7. Aktion 17 Frames (P+1 bis P+17) | `item_f_waffe` 331–452; `item_v_mis_r` P 20/160/300, `item_v_mis_l` | gesichert |
| Raketenwerfer: Flug | Rakete (Geschossblock, Typ `0x1F9C0`) erscheint in P+7 58 px vor der Figur, 50 px hoch, in der Tiefe der Figur; 5,0 px/Frame, sinkt. Frei fliegend Einschlag in P+28, 105 px weiter (dx 163). Früher an einer Wand, an einem Behälter (Gegenprüfer: P+26, Fass-LP 777 → 0) und am linken Bildrand (P+15, 13 px innerhalb). Im Flug kein Schaden (WOOKY bei dx 61–96 nicht getroffen) | `item_f_waffe`, `item_d_misfrei` 75/96; `item_v_mis_r`, `item_v_mis_l` P 20, `item_v_fass_rakete` P 285 | gesichert |
| Raketenwerfer: Explosion | trifft 15 Frames lang (P+28 bis P+42, Attribut 0x1400), Geschossblock bis P+122 belegt. 8 LP, wirft um, trifft mehrere Gegner (Gegenprüfer: 2 bzw. 3 je Schuss). Tiefe ±28, ab 29 nicht | `item_f_waffe`, `item_mis_*_z*`, `item_w_multi_m` 29/30; `item_v_mz_z*`, `item_v_mz_multi`, `item_v_mz_multi3` | gesichert |
| Raketenwerfer: Treffbereich in x | hängt vom Einschlagort ab. Frei fliegend (Einschlag dx 163) trifft sie ab 66 bis 67 px vor dem Einschlagpunkt (Blick rechts ab dx 97, 96 nicht; Blick links ab −96, −95 nicht) bis etwa 90 px dahinter: dritte Messung Blick rechts dx 253 getroffen (weiter stand der WOOKY an der Wand), Messagent Blick links −250 getroffen und −256 nicht (93 px hinter dem Einschlag, 2 px innerhalb des linken Bildrands), Gegenprüfer Blick links bis mindestens −238. Begrenzt durch Kamera-x + 448 (Gegenprüfer: 211 = Kamera-x + 447 getroffen). Schlägt sie an der Arenawand bei dx 150 ein, trifft sie schon ab dx 60 (59 nicht) bis 191 (Kamera-x + 447) | `item_d_mis_x98…x290`, `item_mis_b17_x*`, `item_mis_a16_x59/60`; `item_v_mz_r55…r230`, `item_v_mz_l60…l239`; Erklärung `item_v_m5_mis_x60/x100` | gesichert (3. Messung) |
| Raketenwerfer: Einschlag an der Arenawand | nach 19 Frames und 92 px (P+26, Tiefe 226) statt 21 Frames und 105 px | `item_mis_*`; `item_v_m5_mis_*` (Erklärungslauf) | unsicher |
| LASER (0x10): Munition, Ablauf | 4 Schuss; jeder Schuss kostet einen, auch ohne Treffer (Munition in P+15). Aktion 25 Frames (P+1 bis P+25) | `item_a_laser` 6–150; `item_v_las_leer` P 10/60 | gesichert |
| Laser: Strahl | fünf Blöcke (Typ `0x1F9C0`, Attribut 0x0C00) in P+7, +9, +11, +13, +15, beginnend bei dx 62 in 52 px Höhe; die Spitze wächst 16 px/Frame. 6 LP, wirft um. Tiefe ±12, ab 13 nicht | `item_a_laser`, `item_las_*_z*`, `item_d_las_*`; `item_v_lz_r*`, `item_v_lz_z*` | gesichert |
| Laser: Trefferframe ab etwa 100 px | etwa P+7 + (dx − 62)/16, alle Werte ab dx 100 innerhalb ±1,3 Frames. Messagent 100 → P+9, 130 → P+11, 150 → P+12/13, 191 → P+14, 200 → P+16, 247 → P+19, 250 → P+18, 287 → P+20, 310 → P+22; Gegenprüfer 124 → P+11, 155 → P+13, 186 → P+15, 215 → P+17, 245 → P+19, 275 → P+21, 295 → P+22, 325 → P+24 (Stage 5, Figur und Gegner bewegt); dritte Messung 120 → P+10, 155 → P+14, 186 → P+16, 215 → P+17, 245 → P+19 | `item_las_*` (Reihen a, b, c), `item_d_las_x155…x245`, `item_d_las_zwei_lebt`; `item_v_lz_r130…r330` | gesichert (3. Messung) |
| Laser: untere Grenze und Nahbereich | Treffer ab dx 52 (51 nicht), Blick links ab −51 (−50 nicht). Unter 100 px trifft der Strahl schon in P+7 (dx 52, 80 und 90); bei dx 90 liegt die Formel (P+8,75) fast 2 Frames daneben. Nur Messagent (erste und dritte Messung), beim Gegenprüfer nicht prüfbar | `item_las_a16_x51/52`, `item_las_b17_x-50/-51/-52`, `item_w_multi_l` (dx 80), `item_d_las_zwei_tot` (dx 90) | unsicher |
| Laser: größte Reichweite | Messagent Treffer bis 310 (Blick links, P+22) und bei Blick rechts bis 287 (P+20, `item_las_c16_x290`, gleicher Ablauf wie in der dritten Messung, aber Slot 16); Gegenprüfer bis 350 (Kamera-x + 436); dritte Messung 245 ja, 275 nein (Slot 17). Gesichert ist nur: mindestens 245 px | `item_las_b17_x-310`, `item_las_c16_x290`; `item_v_lz_o340…o370`; `item_d_las_x245/x275` | unsicher |
| Laser: zwei Gegner, der erste überlebt | nur der erste wird getroffen, der Strahl endet an ihm | `item_w_multi_l` (dx 80/150), `item_d_las_zwei_lebt` (120/220); Erklärung `item_v_m5_las_zwei`, `item_v_m5_las_zwei2` (100/200, 220/120) | gesichert (3. Messung) |
| Laser: zwei Gegner, der erste stirbt | Gegenprüfer: beide getroffen; dritte Messung: nur der erste | `item_v_lz_zwei3/4/5`, KOJIRO bei dx 270 in `item_v_lz_r*`; `item_d_las_zwei_tot` (LP 4, dx 90/170) | unsicher |
| HAMMER (0x12): Ladungen, Treffer | 6 Ladungen, nur Treffer verbrauchen eine (Leerschlag 6 → 6). Aktion 19 Frames, mit Treffer 26 (7 Frames Trefferstopp). Treffer in P+13; 8 LP, kein Umwerfen (Trefferreaktion, Zustand 3); trifft mehrere Gegner zugleich. Tiefe ±12, ab 13 nicht | `item_a_hammer` 151–449, `item_ham_*_z*`, `item_w_multi_h` 16; `item_v_hz_leer`, `item_v_hz_z*`, `item_v_hz_zwei`, `item_v_s7h_auf` P 72 | gesichert |
| Hammer: Ende der aktiven Frames | P+18 | `item_a_hammer`, `item_ham_*` | unsicher |
| Hammer: Bereich in x | hängt vom Gegnertyp ab. WOOKY: Blick rechts dx 27 bis 124 (26 und 125 nicht), Blick links −26 bis −147 (−25 und −148 nicht). MUSASHI: 20 bis 143 bzw. −20 bis −143 (15/148 bzw. −15/−145 nicht; bei dx 0 überlappt er und wird getroffen) | `item_ham_a16/a17/b16/b17_x*`, `item_d_ham_x*` (Slot 17, Figur 10 px tiefer); `item_v_hz_r0…r160`, `item_v_hz_l0…l150`; Erklärung `item_v_m5_ham_x20…x145` | gesichert (3. Messung) |
| GUN (0x00), Stage 7 | 5 Schuss, Munition sinkt in P+7. Aktion 17 Frames. Kugel in P+7 48 px vor der Figur, 54 px hoch, 8 px/Frame. 6 LP, wirft um (WOOKY, DICK) | `item_k_s7_00_w` 21–198; `item_v_gun_leer`, `item_v_gz_r*`, `item_v_gz_l*` | gesichert |
| GUN: Lebensdauer der Kugel | 32 Frames (Reichweite rund 300 px) | `item_k_s7_00_w` | unsicher |
| M-GUN (0x04), Stage 7 | 5 Salven zu 4 Kugeln in P+7, +12, +17, +22, 74 px vor der Figur, 54 px hoch, 10 px/Frame. Aktion 37 Frames. 8 LP je Kugel, wirft um | `item_k_s7_04_w` 141–177, `item_d_mgun_*`; `item_v_s7mg_auf` P 90, `item_v_mg_leer`, `item_v_mg_r90/r130` | gesichert |
| M-GUN: aktive Frames je Kugel | 14 | `item_k_s7_04_w`, `item_d_mgun_*` | unsicher |
| Art 0x0C | Waffe mit 5 Schuss, Name offen | Geldkassetten nach dem Bot-Weg des Gegenprüfers (`item_v_kiste_*`), Bot `item_v_b3` nach dem Wechsel in Stage 4 (zwei Stück bei x 480 und 544) | unsicher |
| Waffe eines besiegten DICK | fliegt zuerst als Objekt mit dem unteren Typwort `0xA988` (S+0x3A, Slot 20–59; die volle Kennung protokolliert der Bot nicht) und wird beim Landen zum Gegenstand `0x95F9C`, hier ein Raketenwerfer mit 3 Schuss (Slot 30, Frame 6114) | `item_bot1` 6002–6114 (ein Fall, nur im Bot-Protokoll; im Katalog von `item.csv` ab 6114) | unsicher |
| Ölfass (Stage 1, Typ `0x9DA2A`, LP 777) | zerbricht beim ersten Treffer: Schlag 3 LP, Sprungtritt 7 LP, Rakete setzt auf 0. Ein Schlag kann beide Fässer treffen (Gegenprüfer). Der Inhalt erscheint im Frame danach am Ort des Fasses, springt bis 35 px hoch und landet 49 bzw. 50 Frames nach dem Treffer. Fass 43: Raketenwerfer, Fass 44: Brathähnchen. Gegnerangriffe zerbrechen Fässer ebenfalls (Messagent: Armschlag des Mechs, Gegenprüfer: EDDY-Schlag) | `item_f_*` 192/193 und 272/273, Mech `item_f_waffe` 501, `item_f_verlust` 500; `item_v_fass44` 72/73/122, `item_v_fass43` 157/158/206–207, `item_v_fass_tritt` 80, `item_v_fass_rakete` 152/311, `item_v_mech` 319 | gesichert |
| Geldkassetten (Stage 1, Bossarena, Slot 40–42) | DOLG zerschlägt alle drei beim Erwachen im selben Frame, ausgelöst durch die Ankunft der Figur (im Savestate `item_bot1_s1_cam02048` in Frame 18). Der Inhalt landet 48 bis 49 Frames später. Er hängt vom bisherigen Spielverlauf ab, nicht von Rang oder Ankunftsframe: nach dem Bot-Weg des Messagenten und nach einem Weg mit zerbrochenen Fässern MISSILE (3), LASER (4), HAMMER (6), nach dem Bot-Weg des Gegenprüfers Art 0x0C (5), MISSILE (3), MISSILE (3); Art 0x0C selbst siehe unten (unsicher) | `item_a_liegen` 18/66, `item_bot1` 5060; `item_v_kiste_w2` 39/87, `item_v_kiste_w9` 46/94, `item_v_kiste_r7`, `item_v_kiste_r24`, `item_v_scroll` 418, Bot `item_v_b1` 4553 | gesichert |

### Aufnehmen

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Auslöser | Angriffstaste, während P+0x78 (`FFAA08`) gesetzt ist. Darüberlaufen nimmt nichts auf | `item_f_nah_x`; `item_v_mn_g10…g13`, `item_v_mn_h*`, `item_v_mn_i*` | gesichert |
| Ablauf | Wirkung (Gegenstand weg, LP bzw. Munition) in P+1. Aktion 0x12 von P+1 bis P+7 (Grundzustand P+0x04 = 2), frei ab P+8 | 39 Aufnahmen in `item.csv` (Abschnitt `aufnahme`), 170 in `item_v.csv`, z. B. `item_v_huhn_lp2` 135/136/143 | gesichert |
| Tiefe | \|dz\| ≤ 12, ab 13 nicht | `item_f_nah_z` 275/332/357 (natürlich), `item_nah_hzr`, `item_nah_hzl`; `item_v_mn_z11/z12/z13` P 30 | gesichert |
| x-Bereich links (Gegenstand links der Figur) | Blick rechts: LASER bis −20, MISSILE −28, HAMMER −34. Blick links jeweils 8 px weiter: −28, −36, −42. Erste und dritte Messung gleich; der Gegenprüfer hat nur MISSILE geprüft (gleich) | `item_nah_*`, `item_d_nah_*`, natürlich `item_f_nah_x` 265 (−36), `item_f_nah_z` 241 (−35); `item_v_mn_l*`, `item_v_sw_*` | gesichert (3. Messung) |
| x-Bereich rechts | hängt von Gegenstand und Blickrichtung ab, vorn weiter als hinten. HAMMER +35 bei beiden Blickrichtungen, MISSILE +29 bei Blick links, LASER +29 (Blick rechts) bzw. +21 (Blick links), Brathähnchen +29 und CHERRY +22 bei Blick rechts (Gegenprüfer). Die +18 der ersten Messung waren das Sweep-Artefakt | `item_d_nah_hr/hl/mr/ml/lr/ll`, natürlich `item_d_nah_lnat` 95 (+28); `item_v_mn_*`, `item_v_hx_*`, `item_v_huhn_dx19/dx20`, `item_v_e_s7c_r*`, `item_v_sw_*`; Erklärung `item_v_m5_nah_mxr` | gesichert (3. Messung) |
| x-Bereich rechts, MISSILE bei Blick rechts | Messagent +18 (Artefakt, Figur umgeworfen), Gegenprüfer +37 (38 nicht; Raketenwerfer aus Fass 43), dritte Messung +35 (36 nicht; Raketenwerfer der Bossarena, Slot 44) | `item_nah_mxr`; `item_v_mn_i1`, `item_v_mn_v38`; `item_d_nah_mr` | unsicher |
| Im Sprung | nicht möglich: P+0x78 bleibt in der Luft 0, der Angriff gibt den Sprungangriff (0x0E); nach der Landung wird das Flag gesetzt und die Angriffstaste nimmt auf | `item_f_sprung` 271/300/311; `item_v_sprung` (Sprung 3, Flag 0 ab 7, Angriff 12, Landung 47, Aufnahme 60) | gesichert |
| Mit Waffe in der Hand | Essen wird gegessen, die Waffe bleibt. Eine zweite Waffe wird getauscht: Die alte fällt in P+1 als Gegenstand mit Restmunition und neuer Liegezeit 700 | `item_f_essen_waffe` 441, `item_a_tausch` 61; `item_v_waffe_essen` 70, `item_v_s7h_auf` 72/73/107, `item_v_s7mg_auf` 90 | gesichert |
| In der Trefferreaktion, im Griff | nicht gemessen (im Griff gibt der Angriff den Kniestoß) | – | offen |

### Lebensdauer

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Waffen und SHURIKEN | Liegezeit S+0x60 = 700 im Frame der Landung L, danach −1 je Frame; 0 in L+700, dann Blinken; frei in L+792 (Gegenstände, die schon liegend erscheinen, 1 Frame später: 4 Fälle in Stage 7 und 8). Aus dem Behälter erscheinen sie im Frame nach dem Treffer und landen 48 Frames danach (Brathähnchen 49), also 840 Frames vom Erscheinen bis zum Verschwinden | `item_a_liegen` (3 Gegenstände: erscheinen 18, Landung 66, Liegezeit 0 in 766, frei 858), `item_bot1`, `item_bot6/7/8` (17 Fälle, immer 92 Frames ab Liegezeit 0); `item_v_liegen` (Treffer 157, Landung 206, Liegezeit 0 in 906, frei 998), Bot `item_v_b7` (7 Waffen je 792) | gesichert |
| Zeitlupe nach dem Bosstod | Liegezeit läuft halb so schnell (855 bzw. 813 statt 792 Frames) | Bot `item_v_b1` | unsicher |
| Essen | läuft nicht ab, die Liegezeit bleibt auf 700 | `item_f_fass` 322–664, `item_f_verlust` 550–800, `item_bot8` (5500 Frames), CHERRY Stage 7 (2100 Frames); `item_v_liegen` (893 Frames), Bot `item_v_b2` 8638–11551 | gesichert |
| Scrollen | Ein Gegenstand verschwindet, sobald Kamera-x − x ≥ 163 (bei 162 noch da). Behälter erst bei 195/196 | `item_f_scroll` 421/422, `item_f_fass` 664/665 und 681/682, Bot-Läufe (162–164); `item_v_scroll` 169/192, Bot `item_v_b1` 3053/4339 | gesichert |
| Stage-Ende | liegende Gegenstände verschwinden etwa 480 Frames nach dem Sieg über den Boss, vor dem Stagewechsel | `item_bot1` 6027/6510; Bot `item_v_b1` 5271/5751 | gesichert |
| Kamerasprung in Stage 8 | liegende Gegenstände verschwinden | Bot `item_v_b8` 6559 | unsicher |
| Leer geschossene Waffe | wird 11 Frames nach dem letzten Abschuss (P+18) bzw. im Frame nach dem Aktionsende weggeworfen (S+0x04 = 0x0201, Munition 0, nicht aufnehmbar) und ist nach 61 Frames weg. Weitere Drücke geben Schläge | `item_f_waffe` 428–489, `item_a_laser` 151–212, `item_k_s7_00_w` 198; `item_v_mis_leer` 93–153, `item_v_mis_r` P 300, `item_v_gun_leer` P 145, Bot `item_v_b6` 3443, `item_v_b7` 5127/8232 | gesichert |
| Waffe bei Treffer gegen die Figur | P+0x79 = 0 im Frame nach dem Treffer; die Waffe fällt als Gegenstand mit Restmunition und neuer Liegezeit 700 und ist wieder aufnehmbar | `item_f_verlust` 479/513 (MISSILE, 3), `item_a_hammer` 483/517 (HAMMER, 2), `item_f_essen_waffe` 469; `item_v_mis_auf` 213/214/248, `item_v_s7h_auf` 141, Bot `item_v_b6` 3285–3331 | gesichert |

### Waffen allgemein

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Angriff mit Waffe | jeder Angriffsdruck ist ein Waffeneinsatz (Aktion 0x16), keine Schlagkette. Die Kombostufe (`FFAA2D`) ändert sich nicht (0 bleibt 0, ein alter Wert bleibt stehen) | alle Waffenläufe; `item_v_mis_r`, `item_v_hz_r60`, `item_v_lz_r130`, `item_v_gz_r100`, `item_v_mg_r90` | gesichert |
| Sprung mit Waffe | Waffe bleibt; Angriff in der Luft gibt den normalen Sprungangriff (0x0E) und kostet keine Munition | `item_w_sprung` (MISSILE), `item_w_sprung_h` (HAMMER); `item_v_waffe_sprung` | gesichert |
| Griff mit Waffe | Hineinlaufen greift den Gegner auch mit Waffe (P+0x09 = 4) | `item_w_griff`, `item_d_griffknie` 82; `item_v_griff_gun` 108 | gesichert |
| Kniestoß mit Waffe | Angriff im Griff gibt den Kniestoß: 4 LP in K+5, Aktion P+0x0A bleibt 0, Unterphase P+0x0C 2 → 4, `FFAA2D` = 4 (Rohwert wie nach Kettenstufe 2; `messen_item.py` zeigt Index 1), 20 Punkte wie für Kettenstufe 2. Waffe und Munition bleiben | `item_d_griffknie` (Hammer, natürlich: Druck 88, Treffer 93; zweiter 110/115); `item_v_griff_gun` 115/120 und 135/140 (GUN); Erklärung `item_v_m5_griff`, `item_v_m5_griff_max` | gesichert (3. Messung) |
| Wurf mit Waffe | wie ohne Waffe: 14 LP in E+1. Waffe und Munition bleiben. In der dritten Messung trifft der geworfene Gegner einen zweiten WOOKY (3 LP, E+38; nur dort beobachtet) | `item_d_griffwurf` (Hammer, E 88, Treffer 89 und 126); `item_v_griff_wurf` E 115/116 (GUN) | gesichert (3. Messung) |
| Gegner weit rechts außerhalb des Bildes | Rakete und Laser treffen Gegner ab Kamera-x + 448 nicht; dort werden Gegner deaktiviert (S+0x04 = 0x0100). Rakete trifft bei Kamera-x + 447, Laser bei + 436 | `item_las_a16_x191/192`, `item_mis_a16_x191/192`; `item_v_mz_r214/r215`, `item_v_lz_o355/o362/o370` | gesichert |

### Punkte

Punkte stehen in `FFAA74` (4 Byte BCD, siehe „Gefundene Adressen“) und
ändern sich im Frame nach dem Ereignis.

| Ereignis | Punkte | Beleg | Status |
|---|---|---|---|
| Kettenschlag Stufe 1 bis 4 | 10, 20, 30, 40 | `item_bot1` (über 20 Ketten); `item_v_kette` (EDDY, Treffer 42/59/77/94, Punkte 43/60/78/95) | gesichert |
| besiegter Gegner, insgesamt | WOOKY 80, EDDY 100 (unabhängig von der Kettenstufe), CAROL und BRENDA (Typ `0x36FB2`) 700, Mech 800 | `item_bot1`–`9`; Bot `item_v_b*` (Abschnitt `botpunkte`) | gesichert |
| MARDIA (Typ `0x3A2D6`) | Grundwert 900 plus Punkte des tödlichen Kettenschlags: 910, 920, 930, 940 | `item_d_kill_mardia1–4`, `item_bot3` 1308, `item_bot6` 2640, `item_bot7` 7095/7202; Bot `item_v_b3` 1793, `item_v_b6` 1553, `item_v_b7` 6130/10056/10117 | gesichert (3. Messung) |
| SKIP (Typ `0x25086`) | Grundwert 250 oder 300, jeweils plus Punkte des tödlichen Treffers; wann welcher gilt, ist offen. 250: Messagent 260–290 (Stage 1, 2, 9, Stage 3 einmal), Gegenprüfer 260, 270, 280, 290 (Stage 1, 2, 3, 9), dritte Messung 260, 270, 280, 290 (`item_d_kill_skip1–4`, Stage 1). 300: Messagent 310 (dreimal nach 3-LP-Treffer) und 320 (nach 4 LP) in Stage 3, Gegenprüfer 320 (nach 4 LP) und 330 (nach 5 LP, also nach dem dritten Kettenschlag) in Stage 3, dazu in Stage 2 390 und 320 mit mehreren Treffern (gleicher Bot-Lauf bei beiden), dritte Messung 340 (Stage 3, SKIP nach MARDIAs Tod von einem 10-LP-Treffer in Kombostufe 4 getroffen). Die Deutung im Entwurf („andere tödliche Treffer als Kettenschläge“) deckt die 330 und 340 nicht | `item_bot1` 1038, `item_bot2` 477/605/2206/2440, `item_bot3` 866/1151/1400/2244/2413, `item_bot9`; Bot `item_v_b1` 1090, `item_v_b2`, `item_v_b3` 796/848/973/1411/1928/1962, `item_v_b9`; `item_d_kill_skip1–4`, `item_d_kill_mardia4` 228 | unsicher |
| Bosse mit festem Wert | DOLG 2000 (Stage 1 und 9), Boss Stage 6 5000, Stage 8 8000 (Gegenprüfer: beide Bosse), ohne Punkte des tödlichen Treffers | `item_bot1` 6027, `item_bot9` 6912, `item_bot6`, `item_bot8`, `item_d_kill_dolg1/2` (Kettenstufe 1 bzw. 2, je genau 2000); Bot `item_v_b1` 5271, `item_v_b6` 9150, `item_v_b8` 11520/12029, `item_v_b9` 7676 | gesichert (3. Messung) |
| Bosse Stage 3 und 4 | Grundwert 4000 bzw. 5000 plus Punkte des tödlichen Treffers: Stage 3 4010 (Messagent) bzw. 4020 (Gegenprüfer), Stage 4 bei beiden 5010 | `item_bot3`, `item_bot4`; Bot `item_v_b3` 9139, `item_v_b4` 5204 | gesichert (3. Messung) |
| Bosse Stage 2, 5, 7, Endboss | Stage 2 3000, Stage 5 6000, Stage 7 7000 (+10), Endboss 15000 | `item_bot5`; Bot `item_v_b2` 11024, `item_v_b5` 5362, `item_v_b7` 15032, `item_v_b9` 11657 | unsicher |
| Stage-Ende („EARNED 2000 PTS“) | keine weiteren Punkte; die Anzeige nennt den Wert des Bosses, der beim Todestreffer gutgeschrieben wurde | `item_bot1` 6027 bis 6570; Bot `item_v_b1` 5271 bis 5810 | gesichert |
| Treffer auf Ölfass | 10 je Fass (ein Schlag auf beide: 20), nichts fürs Zerbrechen; zerbricht ein Gegner das Fass, bekommt die Figur nichts | alle `item_f_*` 193; `item_v_fass44` 73, `item_v_fass_tritt` 81, `item_v_fass_rakete` 153/312, `item_v_fass43` 158, `item_v_mech` | gesichert |
| Glasscheibe (Typ `0x98D64`) zerbrochen | 500 | Bot `item_v_b1` 1915; `item_d_kill_skip2` 24 (770 = 270 + 500), `item_d_kill_skip3/4` 24 (520 = 20 + 500, Scheibe in Slot 46 getroffen). Drei weitere 500er in Stage 5 ohne Gegner (`item_bot5` und `item_v_b5` 943/1586/1788, derselbe Bot-Lauf) sind keiner Scheibe zugeordnet | gesichert |
| Waffe aufnehmen | 0 | alle Waffenaufnahmen; 95 beim Gegenprüfer | gesichert |
| M-GUN je Kugel | hängt vom Gegnertyp ab: SASUKE (`0x74164`) und Typ `0x6C660` 10, EDDY 40 | `item_k_s7_04_w`, `item_d_mgun_sasuke`, `item_d_mgun_z`; `item_v_mg_r90/r130` | gesichert (3. Messung) |
| übrige Waffentreffer | Messagent: HAMMER 10, LASER und MISSILE 20 oder 40 (WOOKY). Gegenprüfer: HAMMER 10 (MUSASHI), MISSILE 20 bzw. 40 (40 beim ersten von zwei Gegnern), LASER 40/20, GUN 40 (WOOKY) bzw. 20 (DICK). Keine Regel erkennbar | `item_a_hammer`, `item_a_laser`, `item_w_multi_m`; `item_v_hz_r*`, `item_v_mz_r*`, `item_v_mz_multi`, `item_v_m5_las_zwei*`, `item_v_gz_r*`, `item_v_gun_leer` | unsicher |

Essen bei vollen LP und SHURIKEN: siehe „Essen und SHURIKEN“. Kniestoß mit
Waffe: 20 (siehe „Waffen allgemein“).

Unsicher (alle Werte; „dritte Messung“ nur, wo es eine gab):

- Aufnahmebereich rechts, Raketenwerfer bei Blick rechts: Messagent +18
  (Artefakt, Figur umgeworfen), Gegenprüfer +37, dritte Messung +35.
- Raketeneinschlag an der Arenawand: Messagent nach 19 Frames und 92 px
  (P+26, Tiefe 226); Gegenprüfer nur im Erklärungslauf (P+26, Attribut 25
  statt 15 Frames).
- Laser, untere Grenze und Nahbereich: Messagent ab dx 52 (Blick links
  −51), bis dx 90 schon in P+7 getroffen (erste und dritte Messung);
  Gegenprüfer nicht prüfbar (in Stage 5 greifen die Gegner aus der Nähe an,
  Blick links ging nicht).
- Laser, größte Reichweite: Messagent bis 310 (Blick links) und bis 287
  (Blick rechts, `item_las_c16_x290`, gleicher Ablauf wie die dritte
  Messung), Gegenprüfer bis 350 (Kamera-x + 436, Stage 5), dritte Messung
  245 ja, 275 nein (der vorderste Strahlblock endet dort bei dx 254).
- Laser, zwei Gegner, der erste stirbt: Messagent nicht gemessen (beide
  überlebten); Gegenprüfer beide getroffen (Stage 5, die Ninjas fallen nach
  dem Treffer vom Brett); dritte Messung nur der erste.
- Hammer, Ende der aktiven Frames: Messagent P+18; Gegenprüfer nicht
  geprüft.
- GUN, Lebensdauer der Kugel: Messagent 32 Frames; Gegenprüfer nicht
  erreichbar (Wände der Arena, längster Flug 25 Frames bis dx 248).
- M-GUN, aktive Frames je Kugel: Messagent 14 (auch nebenbei in der dritten
  Messung); Gegenprüfer 10 bis zur Wand.
- Art 0x0C (Waffe mit 5 Schuss): nur Gegenprüfer; beim Messagenten nicht
  gefunden.
- Waffe eines besiegten DICK (unteres Typwort `0xA988` im Flug, danach
  Raketenwerfer): Messagent ein Fall; Gegenprüfer nicht geprüft.
- Liegezeit in der Zeitlupe nach dem Bosstod halb so schnell: nur
  Gegenprüfer (855 bzw. 813 statt 792 Frames).
- Kamerasprung in Stage 8 lässt Gegenstände verschwinden: nur Gegenprüfer.
- Punkte für SKIP: Grundwert 250 oder 300 plus Trefferpunkte, Bedingung
  offen. Messagent 260–290 und 310, 320 (Stage 3); Gegenprüfer 260–290 und
  320, 330 (Stage 3, die 330 nach einem 5-LP-Kettenschlag); dritte Messung
  260–290 (Kettenstufe 1–4) und 340 (10-LP-Treffer in Kombostufe 4 nach
  MARDIAs Tod).
- Bosse Stage 2, 5, 7 und Endboss: Stage 5 6000 bei beiden, aber im selben
  Bot-Ereignis (Frame 5362), also nur eine Messung; Stage 2 3000, Stage 7
  7000 (+10) und Endboss 15000 nur beim Gegenprüfer.
- Punkte für Waffentreffer außer M-GUN: Messagent HAMMER 10, LASER und
  MISSILE 20 oder 40; Gegenprüfer HAMMER 10, MISSILE 20/40, LASER 40/20,
  GUN 40/20; keine Regel, Ziel-LP per Eingriff gesetzt.
- Allgemein: Treffbereiche gelten für das gemessene Ziel. Der Hammer zeigt,
  dass sie vom Gegnertyp und bei WOOKY auch von der Blickrichtung abhängen
  (vermutlich nicht gespiegelte Kollisionsboxen). Laser und Rakete sind nur
  gegen WOOKY und SASUKE/KOJIRO gemessen.

Offen:

- Aufnahme in der Trefferreaktion und im Griff.
- Frühester Folgeschuss je Waffe (gemessen nur Abstände von 40 Frames).
- Namen der Essen 0x24 und 0x2A und der Waffe 0x0C; Waffen der anderen
  Helden (Ginzu und SHURIKEN).
- Fässer in Stage 2 (Braten) und Kisten in Stage 3, 4 (W.BOX), 8 und 9:
  Inhalt und Trefferzahl (der Bot zerschlägt sie nicht gezielt).
- Ob die Figur die Geldkassetten vor DOLG zerschlagen kann (nicht
  prüfbar, er zerschlägt sie bei ihrer Ankunft).
- Ob Gegner liegende Waffen aufheben (laut `grafik/README.md` in Stage 6
  ein WOOKY).
- Regel für die Punkte je Waffentreffer und für den Grundwert von SKIP
  (250 oder 300).

## Nachtrag: Boss

Belege: `logs/boss.csv` (Messagent M6 und dritte Messung, 4422 Zeilen, am
Kopf die Laufliste) und `logs/boss_v.csv` (Gegenprüfer V6, 1508 Zeilen),
beide erzeugt von `scripts/belege_boss.sh`. Szenarien:
`scenarios/boss_frei.lua` (Messagent und dritte Messung), beim Gegenprüfer
`scenarios/boss_v_frei.lua` und `scenarios/boss_v_bot.lua` (Konfiguration für
`grafik/bot.lua`). Auswertung: `scripts/messen_boss.py belege` (`dritte`
schreibt nur die Abschnitte „# M …“) bzw. `scripts/messen_boss_v.py belege`.
Das Skript macht 923 Läufe des Messagenten (laut Laufliste: 3 für die
Savestates `boss_q_*`, 576 in Teil A bis G, 344 in Teil M der dritten
Messung) und 484 des Gegenprüfers (Teil V, davon 5 für Savestates und 3
Bot-Kämpfe gegen den Boss). Der Volllauf von vorn mit Teil M dauerte beim
Messagenten 21 min 3 s mit Exit 0 (Teil des Messagenten mit Teil M 801 s,
Teil V 458 s).
Reproduzierbar: Vor der dritten Messung lief das Skript beim Gegenprüfer
zweimal ganz von vorn (19 min 32 s und 16 min 47 s, Exit 0). `boss.csv` war
beide Male bitgleich mit dem Stand des Messagenten (3442 Zeilen, MD5
`c4f6c79446356103a3c65372ca32e37a`), `boss_v.csv` beide Male bitgleich (MD5
`06e9648e3d91b068a8ba4bfabd02be66`). Nach dem Anhängen von Teil M lief das
ganze Skript noch zweimal von vorn, beim Messagenten (siehe oben) und in der
Gegenprobe der Einarbeitung (`BOSS_JOBS=3`, `BOSS_V_JOBS=2`: 18 min 38 s,
Exit 0, Teil des Messagenten 718 s, Teil V 398 s): `boss.csv` beide Male
MD5 `3a051470fa672c786c5635677ec5c8f6` (4422 Zeilen), `boss_v.csv` beide
Male unverändert (`06e9648e…`). Die Endfassung beider CSV ist damit
zweimal identisch erzeugt. Das
Skript löscht danach die Rohdaten beider Teile (seit der Gegenprüfung auch
`boss_a2_*`); in `logs/raw/` bleiben nur Savestates (`boss_q_p`, `boss_q_r`,
`boss_q_b`, `boss_q_m` und die des Gegenprüfers, siehe „Szenarien“).
Voraussetzung sind die Savestates `p0_s1_s1_cam01536`, `p0_s1_s1_cam01793`,
`p0_s1_s1_cam02048` (Phase 0), `item_missile`, `item_laser`,
`item_bot1_s1_cam02048` (`belege_item.sh`) und `ingame`.

**Methode.** Der Messagent (M) misst ab Savestates der Bossarena
(`p0_s1_s1_cam02048`, eigene `boss_q_b`, `boss_q_p`, `boss_q_r`) bzw. kurz
davor (`p0_s1_s1_cam01536`, `p0_s1_s1_cam01793`). `boss_frei.lua`
protokolliert je Frame Figur, Boss-Slot 19 (`FFCAD0`) und alle Gegnerslots,
dazu Trefferfläche S+0x28 und Schutzzähler S+0xAE. Für Zeiten und
Reichweiten werden Boss oder Figur per Eingriff relativ zueinander gesetzt,
den Angriff wählt der Boss selbst; Häufigkeiten stammen aus passiven Läufen
und einem einfachen Angreifer-Bot über je 8000 Frames bei festgehaltenem
Rang. Variiert sind Startframes, Ausgangslagen, Rang und die Arena-WOOKY
(mit und ohne). Der Gegenprüfer (V) hat eigene Ausgangslagen angelegt
(Bot-Lauf ab `ingame`; `boss_v_allein` mit beiden Arena-WOOKY besiegt, Boss
97 von 110 LP), misst meist bei Rang 12 (M meist 24), lässt die Figur nach
links in die freie Arena angreifen und wertet nur das Watch-Protokoll aus.
Von 57 Zeilen bestätigte er 33, 22 wichen ab, 2 waren nicht prüfbar
(Gepackt halten; Reichweite des Ansturms). Diese 24 Zeilen hat M in einer
dritten Messung behandelt (Teil M, Läufe `m_*`; gemessen 23, „Gepackt
halten“ mangels zweitem Angreifer nicht): aus dem eigenen Savestate `boss_q_m`
(Boss in Tiefe 208 statt 156, Blick links), meist bei Rang 20 (sonst 9, 12,
15, 16, 24), mit anderen Startframes und beiden Blickrichtungen; Warten und
Körperpresse aus `boss_q_b` und `p0_s1_s1_cam02048`, Rakete und Laser aus
`item_missile` und `item_laser`. 20 der 24 erklärt eine gemeinsame Regel, 4
bleiben unsicher. Drei bestätigte Zeilen bleiben ebenfalls unsicher, weil
beide Agenten nur das Fehlen einer Regel bestätigen und die Werte abweichen.
Die Zeile Griff ist in Griff und Wurfweite geteilt; die Tabellen haben 58
gemessene Zeilen (30 gesichert, 20 gesichert (3. Messung), 8 unsicher) und 3
offene.

Bezeichnungen: h = Frame, in dem die LP des Bosses sinken; A = erster Frame
einer Angriffsanimation des Bosses (Wechsel von S+0x1C); K = Frame eines
umwerfenden Treffers; G = erster Frame mit S+4 = 1 danach; t = erster Frame
mit LP < 0; d = Abstand der Figur vor dem Boss in seiner Blickrichtung
(negativ: hinter ihm); dz = Tiefe des Bosses minus Tiefe der Figur (wie in
`docs/mechanik.md`; V zählt Figur minus Boss, seine Werte sind hier
umgerechnet). Rang = `FFF82A`. Die Angriffe heißen in den Entwürfen K, S, R,
P, G; hier stehen sie ausgeschrieben (kurzer Schlag, Armschwung, Ansturm,
Körperpresse, Griff), weil K und G Frames bezeichnen. In der Belegspalte
steht M für `logs/boss.csv` (Abschnitte „# A …“ bis „# G …“, dritte Messung
„# M …“; Läufe `boss_*` ohne Vorsatz, `m_*` = dritte Messung) und V für
`logs/boss_v.csv` (Abschnitte „# V …“, Läufe `boss_v_*` ohne Vorsatz).

**EINGRIFFE**:

- M, `CC_LP` (alle Läufe): LP der Figur vor jedem Frame auf 72; ein Treffer
  auf die Figur ist ein Frame mit weniger als 72.
- M, `CC_WEG=16,17,neu`: beide Arena-WOOKY und jeder später erscheinende
  Gegner 250 px links der Kamera festgehalten (sie leben weiter). Nach 2224
  bis 2454 Frames entfernt das Spiel die festgehaltenen WOOKY; in drei
  Bot-Läufen erschien danach ein DICK (auch er festgehalten). In Teil B, C,
  D, E, `f_dick_alle`, `g_lp0*`, `g_k*`, `g_s*` und den meisten Läufen von
  Teil M; in Teil F sonst nur die Arena-WOOKY (`CC_WEG=16,17`); nicht in
  Teil A, `g_tod_*`, `b_e*`, `m_f_*` (außer `m_f_h*`), `m_t_tod`,
  `m_t_todsp`.
- M, `CC_RANG`: Rang ab Frame 2 festgehalten in Teil A (bis zum Erwachen,
  mit Wechsel in `a_wechsel_*`), E, B6 (`b_t_*`, Rang 24), den Bot-Läufen
  und Teil M (meist 20); `boss_q_m` ist mit Rang 20 angelegt.
- M, `CC_BSET`, `CC_FIG`, `CC_SSET`: Boss, Figur bzw. ein WOOKY für einzelne
  Frames relativ zueinander gesetzt (Teil B, C, D, M).
- M, `CC_BLP`: LP des Bosses einmalig gesetzt (Teil F, G, `m_f_*`, `m_t_*`).
- M, `CC_ENTF`, `CC_ENTF2`: Gegner entfernt (S+4 := 0, ohne Tod) in `b_e*`,
  Teil F, `m_f_*`.
- V: LP der Figur 72 (alle Läufe, Bot `hp_refill`); Rang festgehalten in
  Teil A, B (12 bzw. 24, `k20_*` 20), D, P, W, T, LI, U, AU und in
  `bot_r7`, `bot_r24`; Lage von Figur bzw. Boss gesetzt (`CC_SETZ`,
  `CC_FIG`, `CC_FIGV`, `CC_FIGA`, `CC_FIGH`, `CC_BOSS`) in B, D, DG, W, T,
  LI, U, AU; LP des Bosses gesetzt in W, T (`CC_BLP`), im Bot unter 30 bzw.
  60 zurück auf 97 bzw. 100 (`BV_BLP_MIN`); Gegner entfernt: Arena-WOOKY in
  `q_r*`, `k20_*`, `boss_v_r9`, `boss_v_laser`, EDDY in `w_v*_e1`,
  `w_v*_e2`; Bot: LP der Gegner nach 900 Frames Stillstand auf 1, nur beim
  Anlegen von `boss_v_b1_s1_cam*` und `boss_v_allein` (dort nicht
  ausgelöst).
- Die Phase-0-Savestates `p0_s1_s1_cam*` stammen aus einem Bot-Lauf mit
  aufgefüllten LP der Figur und LP der Gegner auf 1 bei Stillstand.

### A. Lebenspunkte

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Start-LP nach Rang | Rang 7–8: 90, Rang 9–15: 100, Rang 16–23: 110, Rang 24: 120; gemessen bei Rang 7, 8, 9, 11, 12, 15, 16, 19, 20, 23, 24 | M „# A rang“ (`a_r*`, `a2_r*`); V „# V a rang“ (`a_r*`, LP ab Frame 40; `a2_r*`, ab Frame 96; zwei eigene Savestates, anderer Weg in die Arena) | gesichert |
| Zeitpunkt | Die LP (und S+0xB7) werden im Frame nach dem ersten Frame mit Kamera ≥ 2048 geschrieben (Erreichen der Arena); es zählt der Rang in diesem Frame, ein Rangwechsel danach ändert nichts | M „# A start“, `a_wechsel_9_24`, `a_wechsel_24_9`; V `a_w8_24_40` (90), `a_w8_24_39` (120), `a_w24_9_40` (120), `a_w24_9_39` (100), Kamera 2048 in Frame 39, LP ab 40 | gesichert |
| S+0x9A | beim Boss immer 72: Maßstab der Lebensleiste (wie bei der Figur), nicht die LP | M „# A start“; V „# V a rang“ (alle Läufe) | gesichert |
| S+0xB7 | die echten Max-LP (90 / 100 / 110 / 120), bleiben im Kampf stehen | M „# A start“; V „# V a rang“, „# V f wellen“ (Spalte `max_lp`) | gesichert |
| 100 oder 110 | Beides stimmt: Die Phase-0-Savestates und der eigene Bot-Lauf von V erreichen die Arena bei Rang 16 und haben daher 110; bei Rang 9–15 sind es 100 | M „# A start“, `a_nat`, `a2_nat`; V `a_nat`, `a2_nat` (Rang 16, 110), Bot `b1` Frame 4536 | gesichert |
| LP bei Rang 10, 13, 14, 17, 18, 21, 22 | nicht einzeln gemessen | – | offen |

### B. Super-Armor

Zurückweisung heißt: Die LP sinken in h um den vollen Schaden und stehen in
h+1 wieder auf dem Wert vor diesem Treffer (nicht vor der Kette). Danach
folgt der Rückzug oder, bei umwerfenden Treffern, auch das Abfangen.

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Nie zurückgewiesen | Spezialangriff, Kniestoß, Wurf (nach vorn und rückwärts), Raketenwerfer, Laser | M „# B arten“ (Rang 24, je 16 Läufe), „# M treffer summe“; V „# V b arten gesamt“: Spezial 19/19, Knie 42/42, Wurf 13/13, Rakete 5/5, Laser 13/13 dauerhaft (Rang 12–24) | gesichert |
| Zurückweisbar | Kettenstufe 1, 2, 3, Tritt, Sprungangriff neutral und hoch, Sprintangriff | M „# B arten“, „# M treffer summe“; V „# V b arten“ (Stufe 1 33/181, Stufe 2 23/83, Tritt 8/25 und 10 abgefangen, Sprung neutral 5/9, hoch 5/9, Sprint 5/22) | gesichert (Art); Anteile unsicher |
| Stufe 3 | zurückweisbar. M 0 von 7 (Rang 24, Frage offen gelassen), V 18 von 47 (Rang 7: 2/16, 12: 5/14, 24: 8/13, dazu Bot bei Rang 19–23), dritte Messung 3 von 27 (Rang 16 und 20). Regel: Stufe 3 ist zurückweisbar, der Anteil schwankt je Lage und Rang | dritte Messung `m_k20_6` h 79, `m_k20_16` h 129, `m_k16_4` h 79, „# M treffer summe“; M „# B arten“; V „# V b arten“, „# V bot“ | gesichert (3. Messung); Anteil unsicher |
| Schaden am Boss | unabhängig vom Rang: Stufe 1: 3, Stufe 2: 4, Stufe 3: 5, Tritt 10, Sprungangriff neutral 7, hoch 12, Sprintangriff 9, Spezialangriff 6, Wurf 14, Kniestoß 4 je Stoß, Rakete 8, Laser 6 | M „# B treffer“, „# B arten“; V „# V b arten“ (Spalte `schaden`, Rang 7–24) | gesichert |
| Rückzug nach Zurückweisung | Aktion 8 ab h+1, 54 Frames, 48 px rückwärts (an der Arenawand weniger); keine aktiven Frames (S+0x24 = 0), die Figur verliert nichts: der „Abbruchstoß“ ist harmlos. Frei ab h+55 | M „# C reaktion“; V „# V b rueckzug“ (54 Frames in 95 von 97 Fällen, 48 px in 77, die übrigen an der Wand; frei ab h+55 in 95/95) | gesichert |
| Trefferbar im Rückzug | nein: S+0x28 leer ab h+1 bis zum ersten Zellenwechsel der Animation nach Ablauf des Schutzzählers (S+0xAE = 5 in h+55), zusammen 60 bis 90 Frames (Median 62; V 60 bis 71, Median 62, n = 94); erster Treffer beim Gehen in h+63 | M „# C schutz“; V „# V b rueckzug“, `li_r0`, `li_r2` | gesichert |
| Abfangen (Aktion 0x1E) | zweite Art der Zurückweisung, nur bei umwerfenden Treffern (Tritt, Sprung- und Sprintangriff): In h+1 kommt die Hälfte des Schadens zurück (10 → 5, 9 → 5, 7 → 4), der Boss fliegt zurück, landet auf den Füßen, ist nach 46 Frames frei und sofort trefferbar. 109,25 px bis G und 106,38 px bis G−1 sind dieselbe Flugbahn. M: 106 px, auch Sprung- und Sprintangriff (3 Fälle); V: 109,25 px, nur Tritt (10 Fälle); dritte Messung: Tritt 2, Sprungangriff 3, Sprintangriff 4 Fälle (laut `boss.csv`; der Entwurf nennt 5), alle mit derselben Bahn. Ob Rückzug oder Abfangen folgt, ist offen | dritte Messung `m_k20_5` h 91, `m_k16_3`, `m_sprn20_6` h 47, `m_sprint20_4` h 45, „# M treffer summe“; V „# V c umwerfen“ (`k_38`, `k_45`, `k_52`: G = K+46), „# V b arten“ | gesichert (3. Messung) |
| Anteil zurückgewiesener Schlagtreffer (Bot) | steigt mit dem Rang, Werte siehe „Unsicher“ | M „# B bot“, „# B bot gruppen“; V „# V bot“ | unsicher |
| Regel der Zurückweisung | nicht gefunden, siehe „Unsicher“ | M „# B zweittreffer“ (`b_d*`, `b_e*`); V „# V b treffer“ (`e_*`) | unsicher |
| Erster Treffer | einzelner Schlag zu verschiedenen Zeitpunkten: M 89 Zeitpunkte, 37 dauerhaft, 6 zurückgewiesen, 46 ohne Treffer; V 16 Schläge: 5 / 2 / 9 (ohne Treffer: der Boss griff zuerst an) | M „# B einzelzeit“; V „# V b treffer“ (`e_*`) | gesichert |
| Unterbrochene Kette | zweiter Schlag nach Pause (neue Kette): kein festes Fenster, Werte siehe „Unsicher“ | M „# B zweittreffer“; V `u45_*` | unsicher |
| Griff durch die Figur | Die Figur packt den Boss von hinten und von vorn: beim Warten, beim Ausholen von kurzem Schlag und Armschwung und einen Frame nach Beginn des kurzen Schlags. Nur in seinem Entscheidungsframe packt er sie zuerst (siehe D, Griff). M: nur von hinten (`b_griff_vorn` lag in Frame 62/63, dem ersten Frame des Gehens); V: auch von vorn beim Ausholen zum kurzen Schlag (16 Griffe bei d 29 bis 35); dritte Messung: von vorn beim Ausholen von kurzem Schlag (`m_gf_k43/45/47`) und Armschwung (`m_gf_s*`), beim Warten (`m_gf_w*`), einen Frame nach Beginn des kurzen Schlags (`m_gf_g*`) | dritte Messung „# M griff“; M „# B treffer“ (`b_griff_*`); V „# V b griff“ | gesichert (3. Messung) |

### C. Reaktion des Bosses

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Zuck-Reaktion (S+4 = 3) | Treffer von vorn oder auf den gehenden Boss (er dreht sich zum Angreifer): Aktion 0, 27 Frames (h bis h+26) am Ort, Zittern +3 / +2 / +1 px in h+9 / h+11 / h+13, kein Rückstoß. Treffer von hinten, während er wartet oder angreift: Aktion 6, 15 Frames (V sah danach 3 bis 8 px Versatz). M: immer 27; V: 27 nur in Aktion 0, sonst 15 (er traf den wartenden und den angreifenden Boss von hinten); dritte Messung: von vorn 27 (29 Fälle, vorher Aktion 0, 4 oder 6), von hinten auf den gehenden Boss 27, beim Warten und Ausholen 15 | dritte Messung „# M zucken“, „# M zucken summe“ (`m_z_wph*`, `m_z_wbh*`, `m_z_sh*`); M „# C zittern“; V „# V c zittern“ (`e_38`, `e_45`: 27; `e_24`, `e_31`, `e_52`, `r24k_50`: 15) | gesichert (3. Messung) |
| Reaktion auf Stufe 2 | 15 Frames (Aktion 4 von vorn), frei ab h+15. Steht die Figur dann höchstens 49 px vor ihm, beginnt er in h+16 den kurzen Schlag, sonst geht er. M: Aktion 4, kurzer Schlag ab h+16; V: Aktion 4 oder 6, kurzer Schlag nicht immer; dritte Messung: 28 Fälle Aktion 4, kurzer Schlag in h+16 genau bei d ≤ 49 in h+15 (Aktion 6 bei V passt zu Treffern von hinten) | dritte Messung „# M stufe2“ (`m_k20_*`, `m_k16_*`); M „# C reaktion“; V „# V b treffer“ (Spalte `folge`) | gesichert (3. Messung) |
| Erneuter Treffer im Zucken | trifft (Stufe 2 in h+17); Zurückweisung wie immer möglich (V: Stufe 2 in 23 von 83 Fällen zurückgewiesen) | M „# B treffer“; V „# V b treffer“ (`k_*`), „# V b arten“ | gesichert |
| Umwerfen | Flug fest: Scheitel 48,24 px in K+27, Boden K+46, Ruhe K+55 (dritter Kniestoß K+57, Laser K+61 bis K+66), 127,25 px bis G. Danach liegt er unterschiedlich lange, nach Tritt, Sprung- und Sprintangriff 42 bis 70 Frames (bei M in Schritten von 4): G = K+97 bis K+125 nach Sprung-, Sprintangriff und Tritt, K+103 bis K+119 nach dem dritten Kniestoß, K+99 bis K+125 nach dem Laser, 116 bis 144 Frames nach dem Wurftreffer. M: G fest (K+105 / 109 / 99, Wurf 120); V: K+103 bis K+125, Wurf 116–144; dritte Messung: K+97 bis K+125, Knie K+107, Laser K+99/100, Wurf 120–140. Regel: Flug fest bis K+55, Liegezeit variabel | dritte Messung „# M umwerfen“ (`m_k*`, `m_spr*`, `m_uw_*`); M „# C aufstehen“; V „# V c umwerfen“, „# V c wurf“ | gesichert (3. Messung) |
| Spezialangriff (Aktion 0x12) | kein Liegen: 78 Frames Taumeln (S+4 = 3), 135 px (V 135,125), danach in G sofort trefferbar | M „# C reaktion“, „# C schutz“; V „# V c umwerfen“ (`sp_*`, `r24sp_*`) | gesichert |
| Rakete (Aktion 0x14) | Flug 109,25 px, an der Arenawand kürzer (56 bis 98 px); frei nach 132 bis 152 Frames. M: 152 Frames, 59 px; V: 132 bis 140 Frames (in einer Erkundung 152), 109,25 px, an der Wand 98 und 78 px; dritte Messung: 140 Frames und 109,25 px nach links (`m_mis_l*`), 140 bzw. 152 Frames und 56–59 px an der rechten Wand (`m_mis_r*`). Regel: 109,25 px frei, an der Wand kürzer, Liegezeit variabel | dritte Messung „# M umwerfen“; M `b_mis`; V „# V c umwerfen“ (`m_70`, `m_90`, `m_110`, `m_150`, `m_170`) | gesichert (3. Messung) |
| Trefferbar beim Liegen | nein, von K bis zum Aufstehen (V: kein Treffer zwischen K und G bei Schlägen alle 8 Frames) | M „# C aufstehen“; V `li_s0` bis `li_s6` | gesichert |
| Schutz nach dem Aufstehen | in G Schutzzähler S+0xAE = 10, Trefferfläche leer; sie kommt mit dem ersten Zellenwechsel nach Ablauf des Zählers zurück (G+11 bis G+17): beim Gehen erster Treffer in G+16 | M „# C aufstehen“, „# C schutz“; V „# V c umwerfen“ (Spalte `flaeche_ab_G+`), `li_s4`, `li_s6` | gesichert |
| Was er nach dem Aufstehen tut | gemeinsam nur: Figur höchstens 49 px vor ihm, kurzer Schlag in G+1; Werte siehe „Unsicher“ | dritte Messung „# M aufstehen“ (`m_au_*`); M „# C aufstehen“; V „# V c nach dem aufstehen“ (`au_*`) | unsicher |
| Trefferfläche als Regel | getroffen wird er nur in Frames mit gesetzter Trefferfläche S+0x28: M 1063 von 1063, V 468 von 468 Treffern (einige erst im Trefferframe gesetzt, bei V 33) | M „# C schutz Treffer“; V „# V c flaeche“ | gesichert |
| Trefferbar im eigenen Angriff | ja, die Fläche bleibt gesetzt: von hinten in allen aktiven Frames, von vorn nur im ersten aktiven Frame (Gleichstand, die Figur gewinnt), danach trifft sein Schlag die Figur zuerst. Ansturm und Körperpresse auch von vorn. M: in aktiven Frames von kurzem Schlag und Armschwung nie getroffen; V: 17 Treffer in aktiven Frames des kurzen Schlags (von hinten, mit dem Spezialangriff, im ersten aktiven Frame von vorn) und 4 im ersten aktiven Frame des Armschwungs (d 53 bis 54); dritte Messung: von vorn im ersten aktiven Frame (`m_z_k47`, h = A+7), von hinten in A+8 bis A+11 (`m_z_kh50` bis `m_z_kh53`) | dritte Messung „# M zucken“; M „# C im angriff“; V „# V c im angriff“ | gesichert (3. Messung) |
| Geschützte Körperpresse („Ausbruch“) | Beginnt die Körperpresse ohne Vorphase (direkt aus der Zuck-Reaktion oder einen Frame nach dem Gehen, etwa nach Aufstehen oder kurzem Schlag), steht der Schutzzähler in A auf 32 (direkt aus der Zuck-Reaktion) bzw. 31 (einen Frame nach dem Gehen, so auch bei V; „# M presse schutz“, Spalte `schutz_A`) und die Fläche bleibt bis zur Flugphase leer (32 bis 38 Frames). Mit Vorphase (Aktion 6, Phase 0/2) kein Schutz. M: 28 Pressen aus Zuck-Reaktionen; V: keine aus der Zuck-Reaktion, aber drei geschützte nach dem kurzen Schlag bzw. dem Aufstehen; dritte Messung: 8 Pressen ohne Vorphase alle geschützt (4 aus der Zuck-Reaktion, 4 einen Frame nach dem Gehen), 68 mit Vorphase alle ohne Schutz. Häufigkeit siehe „Unsicher“ | dritte Messung „# M presse schutz“ (Summe), `m_bot_*`, `m_e_*`; M „# C ausbruch“; V „# V c ausbruch“, „# V c zucken danach“ | gesichert (3. Messung); Häufigkeit unsicher |
| Gepackt halten | Während er die Figur hält, ist S+4 = 2; Werte siehe „Unsicher“ | M „# C schutz“; V „# V d einzelheiten“ (Griff) | unsicher |

### D. Angriffe

Schaden bei Rang 7 / 9 / 12 / 16 / 20 / 24. Alle umwerfenden Angriffe werfen
bei jedem Treffer um.

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Kurzer Schlag: Auslöser | Figur höchstens 49–50 px vor ihm; sofort bei dz −7 bis +6, bei +7, ±8, ±9 rückt er erst in der Tiefe nach und schlägt 2 bis 7 Frames später. M: −7 bis +6; V: Abstand ≤ 50 bestätigt (bei 50 und 51 in Wartehaltung stattdessen Körperpresse), in der Tiefe bei ±7, bei ±8 nicht; dritte Messung: sofort bei −7 bis +6, sonst nach dem Nachrücken | dritte Messung „# M ausloeser“ (`m_dkz_*`); M „# D zusammenfassung“; V „# V d griffweite“ (`dg_31_*`) | gesichert (3. Messung) |
| Kurzer Schlag: Zeiten | Startup 7, aktiv A+7 bis A+10, mit Treffer 7 Frames Trefferstopp (bis A+17); Nachlauf 7 bis 10 Frames (V 9) | M „# D proben“ (`d_k_*`); V „# V d proben“ (`dk_*`) | gesichert |
| Kurzer Schlag: Reichweite | nicht spiegelgleich: Blick links 16 px hinter bis 105 px vor ihm, Blick rechts 25 px hinter bis 95–96 px vor ihm (±1 px je nach Nachkommastelle); Tiefe ±12, Figur bis 66,75 px hoch. M: −15 bis 105; V: −16 bzw. −17 bis 105, am linken Arenarand (Blick rechts) bis 96; dritte Messung: Blick links −16 bis 105, Blick rechts −25 bis 95 | dritte Messung „# M proben“ (`m_dk_*`); M „# D proben“ (`d_k_*`); V „# V d proben“ (`dk_*`, `dk2_*`, `dk3_*`) | gesichert (3. Messung) |
| Kurzer Schlag: Schaden | 7 / 8 / 9 / 10 / 11 / 12, wirft immer um (V: 158 von 158; 10 bei Rang 17–19) | M „# D zusammenfassung“; V „# V d schaden“ | gesichert |
| Armschwung: Ablauf | heran bis etwa 78 px (72–80 laut „# D zusammenfassung“, Spalte `vorn_A`, der Entwurf nennt 73–80; V 76–80), Startup 17, 3 aktive Frames (+7 Trefferstopp); nur nach einem Treffer folgt 35–38 Frames später der nächste Schwung, höchstens drei; ohne Treffer ein Schwung (aktiv A+17 bis A+19) | M „# D angriffe“; V „# V d einzelheiten“, „# V d proben“ (`ds_x106`) | gesichert |
| Armschwung: Reichweite | Blick links 16 px hinter bis 105 px vor ihm (±1 px), Blick rechts nach hinten 17 px; Tiefe ±12, Figur bis 66,25 px hoch. M: −15 bis 104; V: −16 bis 105; dritte Messung: Blick links −16 bis 105, Blick rechts hinten −17 | dritte Messung „# M proben“ (`m_ds_*`); M „# D proben“ (`d_s_*`); V „# V d proben“ (`ds_*`) | gesichert (3. Messung) |
| Armschwung: Reichweite vorn bei Blick rechts | an der Wand nicht messbar | – | offen |
| Armschwung: Schaden | je Schwung 7 / 8 / 9 / 10 / 11 / 12; nur der dritte wirft um (V: Attribut `4002` beim ersten und zweiten, `4C02` beim dritten) | M „# D zusammenfassung“; V „# V d schaden“ | gesichert |
| Ansturm: Ablauf | Entscheidung bei etwa 100–320 px (V 104–306, Median 189), Ausholen 20 Frames, Lauf mit 4 px/Frame (diagonal 3,92) bis 45 Frames und 176 px, aktiv im ganzen Lauf; Auslauf 24–30 px; Nachlauf meist 14–18 Frames | M „# D zusammenfassung“; V „# V d einzelheiten“ | gesichert |
| Ansturm: Reichweite | Figur bis 90,75 px hoch im Trefferframe (Vorgabe 100 getroffen, 105 bis 115 nie); Tiefe bis 12 im Trefferframe, der Boss lenkt im Lauf 1 px je Frame nach (Figur in 13 px Tiefe wird noch getroffen, im Trefferframe 12). M und dritte Messung gleich; V nicht prüfbar (Tiefe im Trefferframe nie über 12, keine saubere Probe für 13/14 und die Höhe) | dritte Messung „# M proben“ (`m_dr_*`); M „# D proben“ (`d_r_*`) | gesichert (3. Messung) |
| Ansturm: Schaden | 10 / 11 / 12 / 13 / 15 / 17, wirft um | M „# D zusammenfassung“; V „# V d schaden“ | gesichert |
| Körperpresse: Ablauf | aktiv ab A+32 bis zur Landung, Scheitel 107,5 px in A+31 (V 107,53), Landung A+64 (mit Treffer A+71); Ziel ist der Ort der Figur in A | M „# D zusammenfassung“; V „# V d einzelheiten“ | gesichert |
| Körperpresse: Reichweite | Die Trefferfläche hängt am Boss, nicht am Landepunkt: von A+51 (Boss etwa 70 px hoch) bis A+62 trifft er eine Figur bis etwa 23–27 px um sich, in A+48 und nach der Landung nicht; den Landepunkt trifft er erst, wenn er darüber ist. M: ±25 um den Landepunkt (Figur ab A+45 mitgeführt, also um den Boss); V: bis etwa 23 px vor dem Boss ab A+51 (Boss etwa 69 px hoch), Landepunkt erst ab A+58; dritte Messung (Figur nur in A+F gesetzt): A+48 nie, A+51 bis A+62 bis 27 px (35 nie), A+66 nie, Landepunkt ab A+51 | dritte Messung „# M presse“ (`m_dp_*`); M „# D proben“ (`d_p_*`); V „# V d proben“ (`dp_x*`) | gesichert (3. Messung); Breite unsicher |
| Körperpresse: Schaden | 13 / 14 / 16 / 18 / 20 / 22, wirft um | M „# D zusammenfassung“; V „# V d schaden“ | gesichert |
| Griff | Er packt nur in einem Entscheidungsframe (erster Frame des Gehens nach Auftritt bzw. Savestate, Wahl eines neuen Angriffs): Steht die Figur dann höchstens 49 px vor ihm (dz −7 bis +6), packt er sofort. Kommt sie ihm sonst im Gehen so nahe, beginnt er den kurzen Schlag, aus dem Warten erst nach dessen Ende. Wurf nach 59 Frames (mit Tragen 67–74), hinter sich. M: sofort bis 49 px; V: aus dem Gehen bei d 46–49 (51 und 52 nicht), aus der Wartehaltung stattdessen kurzer Schlag nach 5 Frames; dritte Messung: Griff nur in Entscheidungsframes (`m_bg_c2`, `m_bg_c51`), sonst kurzer Schlag (`m_bg_g*`, `m_bg_h*`), aus dem Warten 13 Frames später (`m_bg_w*`) | dritte Messung „# M griff“; M „# D griff“ (`d_g_*`); V „# V d griffweite“ (`dg_2_*`, `dg_31_*`), „# V d einzelheiten“ | gesichert (3. Messung) |
| Griff: Wurfweite | hängt von Maß, Tragen und Wand ab, Werte siehe „Unsicher“ | dritte Messung „# M wurf“; M „# D zusammenfassung“; V „# V d einzelheiten“ | unsicher |
| Griff: Schaden | 13 / 14 / 16 / 18 / 20 / 22 (Rang 7 nur V), wirft um | M „# D zusammenfassung“; V „# V d schaden“ | gesichert |

### E. Rhythmus und Wahl

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Häufigkeit (Figur passiv) | 29–39 Angriffe in 8000 Frames, Median-Abstand der Angriffsbeginne 199–288 Frames; einzelne Abstände 76 bis 450 Frames (direkt nach einem kurzen Schlag einmal 28). M: 29–39, Median 199–288, Minimum 79, Maximum 426; V: 29–37, Median 221–276, Minimum 79 (einmal 28 nach einem kurzen Schlag), Maximum 409; dritte Messung: 34–38, Median 206–221,5, Minimum 76, Maximum 450 (der Entwurf nennt zusammengefasst „Minimum 79, Maximum 450“) | M „# E rhythmus“, „# M rhythmus“; V „# V e rhythmus“ (`p_r*`, `q_r*`) | gesichert |
| Rang | kein deutlicher Unterschied (29–39 Angriffe je 8000 Frames bei jedem Rang): Rang 7: 32 (V); Rang 9: 29, 35, 31 (M), 32, 34 (V), 35 (dritte Messung); Rang 12: 33 (V); Rang 16: 29 (V), 34 (dritte Messung), dazu natürlicher Rang ab 16: 35, 35 (M); Rang 20: 38, 39, 35 (M), 35, 33 (V); Rang 24: 37 (V), 38 (dritte Messung). M hatte Rang 20 für häufiger gehalten; V sah keinen Unterschied; dritte Messung 35 / 34 / 38 bei Rang 9 / 16 / 24 (der Entwurf zählt für Rang 16 die beiden Läufe mit natürlichem Rang und lässt V `p_r16` mit 29 weg) | dritte Messung „# M rhythmus“ (`m_e_r*`); M „# E rhythmus“; V „# V e rhythmus“ | gesichert (3. Messung) |
| Wahl nach Abstand | nah (< 80 px) kurzer Schlag oder Griff, auch Körperpresse und Armschwung; mittel (80–160 px) Armschwung, Körperpresse, Ansturm; fern (> 160 px) Ansturm, Körperpresse und Armschwung, selten Griff. M sah fern seltener Armschwung, V nicht; gemeinsam: fern alle drei, Anteile je Lauf verschieden (siehe „Unsicher“) | dritte Messung „# M rhythmus“; M „# E rhythmus“; V „# V e wahl nach abstand“ | gesichert (3. Messung); Anteile unsicher |
| Figur greift an (Bot) | hängt vom Angreifer ab, Werte siehe „Unsicher“ | dritte Messung „# M rhythmus“ (`m_bot_*`); M „# E rhythmus“; V „# V e rhythmus“ (`bot_*`) | unsicher |

### F. Verstärkung

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Halbe LP | Sinken die LP auf höchstens die Hälfte der Max-LP (55 bei 110, 50 bei 100; V: 56 bzw. 51 nicht), erscheinen zwei EDDY: nach einem Treffer in h+1, bei gesetzten LP im Frame des Eingriffs, in die freien Gegnerslots (15/18, 16/18 oder 14/15 je nach Belegung). M: im selben Frame, Slots 15/18; V: h+1 nach Treffer, Slots 16/18 bzw. 14/15; dritte Messung: h+1 nach Treffer (`m_f_h56`: h 43, EDDY 44), im Eingriffsframe bei gesetzten LP, Slots 15/18 bzw. 14/15 | dritte Messung „# M wellen“; M „# F wellen“; V „# V f wellen“ (`ws_55/56`, `w9s_50/51`, `w_r58_*`) | gesichert (3. Messung) |
| Viertel der LP | bei höchstens einem Viertel (27 bei 110, 25 bei 100) ein DICK; ein zweiter 40 Frames später nur ab Rang 16 (gemessen 16 und 20; nicht bei 12 und 15) und nur, wenn dann höchstens drei andere Gegner leben (wird später ein Gegnerslot frei, kommt er 39 Frames danach; maßgeblich ist der Rang nach der Wartezeit, siehe „Nachtrag: Fernangriffe der Gegner“, Zeile „Erscheinen Raketen-DICK“, `t_z22_e`, `t_z22_f`, `t_z15_f`). M: zweiter DICK nach 40 Frames; V: nie ein zweiter (Rang 12, bis 336 Frames danach); dritte Messung: zweiter bei Rang 16 und 20 (`m_f_leer16/20`, `m_f_ow16`, `m_f_e20`), nicht bei 12 und 15 (`m_f_leer12/15`) und nicht bei drei lebenden Gegnern (`m_f_ow20`) | dritte Messung „# M wellen“; M „# F wellen“; V „# V f wellen“ (`ws_27`, `w9s_25`, `w_v28` bis `w_v30*`) | gesichert (3. Messung) |
| Zweiter DICK bei Rang 13 | nicht gemessen. Bei Rang 14 kam keiner (dritte Messung im „Nachtrag: Fernangriffe der Gegner“, `t_z14_a` bis `t_z14_d`, 2 bis 5 belegte Gegnerslots samt DOLG); dort gesichert (3. Messung): bei Rang 15 und darunter nie (laut Entwurf M6 sah der Gegenprüfer des Fernkampfs bei Rang 17 und 18 einen zweiten) | `logs/fern.csv` (`T welle`), nur Rang 14 | offen |
| Begrenzung | Neben dem Boss leben höchstens vier Gegner: Leben schon vier (zwei WOOKY, zwei EDDY), kommt kein DICK; es zählt die Gesamtzahl, nicht ob die EDDY leben. Sinkt nach der Welle bei halben LP die Zahl lebender WOOKY und EDDY unter zwei (hier: EDDY entfernt), erscheinen sofort zwei WOOKY. M: kein DICK, solange beide EDDY leben (Gegner außerhalb des Bildes festgehalten); V: DICK trotz zwei lebender EDDY (WOOKY tot), nach Entfernen der EDDY zwei WOOKY und trotzdem ein DICK; dritte Messung: kein DICK bei zwei WOOKY und zwei EDDY (`m_f_alle20`), einer bei drei Gegnern (`m_f_ow20`, `m_f_owe12/20`) | dritte Messung „# M wellen“ (`m_f_alle20`, `m_f_owe*`); M „# F wellen“; V „# V f wellen“ | gesichert (3. Messung) |
| Welcher LP-Wert zählt | auch der vorübergehend gesenkte: Ein zurückgewiesener Treffer unter die Schwelle löst die Welle aus (V: 56 → 53, 57 → 54, 58 → 55, jeweils sofort zurück, lösen die EDDY aus, 59 → 56 nicht) | M „# F wellen“ (`f_rueck*`); V `w_h56` bis `w_h59` | gesichert |

### G. Fall

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Tod | erst bei LP unter 0; mit genau 0 LP kämpft der Boss weiter, greift an und trifft (V: 1300 Frames, 6 Angriffe, 7 Treffer auf die Figur) | M „# G fall“ (`g_lp0*`); V `t_lp0` | gesichert |
| Ablauf | ab t+1 Todesflug (S+4 = 2); die übrigen Gegner brechen in t+2 bis t+3 zusammen, ein gerade liegender oder getroffener erst nach seiner Reaktion (V: ein DICK in t+47). Der Boss-Slot ist 2 Frames nach dem Stagewechsel frei | M „# G fall“, „# M fall“; V „# V g fall“ (`t_todk`, `t_k1100r`, `t_todsp`) | gesichert |
| Bis „STAGE 1 CLEAR“ | Siegerpose, Schriftzug und Stagewechsel: Werte siehe „Unsicher“ | M „# G fall“, „# M fall“ (`m_t_*`); V „# V g fall“, „# V g schriftzug“ | unsicher |
| Treffer im Sterben | Stirbt er im ersten aktiven Frame des Armschwungs, bleibt das Attribut zwei Frames gesetzt (V: `4002` in t und t+1, bei Tod einen Frame vorher nur `8000`), die Figur verliert nichts. Beim kurzen Schlag nur M | M „# G fall“ (`g_s17`, `g_k7`); V „# V g sterben im angriff“ (`t_s397`, `t_s398`) | gesichert (Armschwung) |

Unsicher (Werte von Messagent M, Gegenprüfer V und dritter Messung):

- Anteil zurückgewiesener Schlagtreffer im Bot: M 18 / 15 / 19 / 24 / 28 /
  39 % bei Rang 7 / 9 / 12 / 16 / 20 / 24; V 16 % bei Rang 7 (82
  Schlagtreffer), 36 % bei Rang 24 (59), 34 % bei natürlichem Rang 18–24
  (53); dritte Messung entfällt. Steigt mit dem Rang, hängt aber auch von
  Lage und Angreifer ab.
- Anteil bei Stufe 3: M 0 von 7 (Rang 24), V 18 von 47 (Rang 7–24), dritte
  Messung 3 von 27 (Rang 16 und 20).
- Regel der Zurückweisung: M fand keine; Kettenstufe, Zeit seit dem letzten
  dauerhaften Treffer, LP-Stand und Zustand des Bosses scheiden aus, ein um
  wenige Frames verschobener Start kehrt das Ergebnis um, ohne Arena-WOOKY
  nahm der Boss jeden Treffer an. V fand ebenfalls keine (dieselbe Lage, 7
  Frames später gestartet: `e_10`, `e_17` zurückgewiesen, `e_24` bis `e_52`
  angenommen) und sah Zurückweisungen auch ohne Arena-WOOKY (beide tot).
  Dritte Messung: ebenso offen, wann statt des Rückzugs das Abfangen folgt.
- Unterbrochene Kette (zweiter Schlag nach Pause): M zurückgewiesen bis
  h+39 in einer Lage (Schwelle h+39/h+40); V angenommen ab h+30 bis h+36 in
  einer anderen (4 von 4, `u45_*`, h = 48; in `u31_*` griff der Boss vorher
  an); dritte Messung entfällt.
- Erste Aktion nach dem Aufstehen bei 50 px und mehr: M Griff in G+5 (Figur
  in 55 px, schlug gerade); V kurzer Schlag in G+1 / G+4 / G+10 bei d 45 /
  55 / 65 (Figur im Spezialangriff: G+7); dritte Messung kurzer Schlag in
  G+1 bei 45 px, bei 55 und 65 px kein Angriff, er weicht zurück (`m_au_*`).
  Gemeinsam nur: bis 49 px kurzer Schlag in G+1.
- Gepackt halten: M hielt den Boss für nicht trefferbar (S+4 = 2); V nicht
  prüfbar, S+0x28 bleibt in allen Halteframes gesetzt (Dauer 125 Frames bei
  Wurf in A+59, 80 bis 87 bei Wurf nach dem Tragen); dritte Messung nicht gemessen
  (kein zweiter Angreifer).
- Wurfweite des Bosses: M Ruhe 225–230 px nach dem Wurf (frei; laut
  „# D angriffe“ in drei Bot-Läufen auch 166, 166,25 und 206,38 px,
  `b_bot_q16`, `b_bot_kette`, `b_bot_p20`); V erster Bodenkontakt 223–301 px
  vom Griffort (mit Tragen); dritte Messung Ruhe 225–230 px, erster
  Bodenkontakt 174–196 px vom Griffort, an der Wand 95 und 151 px
  (`m_wurf_2`, `m_wurf_51`).
- Figur greift an (Bot): kurze Schläge je 8000 Frames M 4–13, V 15–24,
  dritte Messung 1–6; Median-Abstand der Angriffe 149–185, 122–175 bzw.
  165–193 Frames.
- Bis „STAGE 1 CLEAR“: Siegerpose nach tödlichem Spezialangriff t+98 (M,
  `g_tod_sp`) bzw. t+97 (V, dritte Messung), sonst t+127 bis t+139. M und
  dritte Messung: Schriftzug 105 Frames nach der Pose (t+232 bzw. t+231/232,
  nach Spezial t+203 bzw. t+202), Stagewechsel meist 413 Frames nach der
  Pose (t+540 bis t+552, nach Spezial t+511 bzw. t+510). V: Pose t+132 und
  t+128, Stagewechsel t+545 und t+553 (413 bzw. 425 Frames nach der Pose),
  Schriftzug t+244 (Pose t+128); nach Spezial Pose t+97, Schriftzug t+211,
  Stagewechsel t+520. Hinweise aus `logs/boss.csv` („# G fall“), im Entwurf
  nicht genannt: In zwei Bot-Läufen von M kam die Pose schon in t+55 bzw.
  t+61 (`b_bot_p16`, `b_bot_kette`), der Stagewechsel 413 Frames danach; in
  `b_bot_q16`, `b_bot_p20` und `b_bot_p24` kam der Stagewechsel 415, 418
  bzw. 453 Frames nach der Pose (t+543, t+546, t+581).
- Häufigkeit der geschützten Körperpresse direkt aus der Zuck-Reaktion: M
  28 von 414, V 0 von 268, dritte Messung 4 von 71 Zuck-Reaktionen
  (Bot-Läufe).
- Breite der Pressen-Trefferfläche: M ±25 px (um den Boss), V etwa 23 px vor
  dem Boss, dritte Messung bis 27 px (35 nie).
- Anteile der Wahl nach Abstand, fern (> 160 px): Armschwung 38 / 61 / 8,
  Ansturm 63 / 57 / 16, Körperpresse 50 / 50 / 14, Griff 13 / 0 / 3 (M / V /
  dritte Messung; passive Läufe, M-Griff aus „# E rhythmus“ gezählt).
- Treffer im Sterben beim kurzen Schlag: nur M (`g_k7`), V nicht geprüft,
  dritte Messung entfällt.

Offen:

- LP bei Rang 10, 13, 14, 17, 18, 21 und 22 (nicht einzeln gemessen).
- Zweiter DICK bei Rang 13 (bei Rang 14 und 15 kam in der dritten Messung
  des „Nachtrag: Fernangriffe der Gegner“ keiner, Zeile „Erscheinen
  Raketen-DICK“).
- Reichweite des Armschwungs nach vorn bei Blick rechts (an der Wand nicht
  messbar).
- Warum der kurze Schlag bei Blick rechts weiter nach hinten reicht als bei
  Blick links.
- Ob ein zweiter Angreifer (zweiter Spieler, geworfener Gegner) den Boss
  trifft, während er die Figur hält.
- Wann der Boss zurückweist und wann er sich statt des Rückzugs abfängt.

Abgleich mit bestehenden Werten:

- „Nachtrag: Schaden der Gegner“, Zeile DOLG (gesichert (Workflow): Schläge
  9–12, Ansturm 12–17, Sprung/Körperpresse 16–22, Griff und Wurf 16–22) und
  der Satz „Der Wurf des DOLG macht je nach Rang 16–22 LP“ in „Umwerfen der
  Figur durch Gegner“: für Rang 12 bis 24 bestätigt, jetzt mit Skript. Bei
  Rang 7 und 9 weniger: kurzer Schlag und Armschwung 7 bzw. 8, Ansturm 10
  bzw. 11, Körperpresse und Griff 13 bzw. 14. Der Zusatz „(Workflow)“ kann
  dort entfallen; die Spanne wird 7–12, 10–17, 13–22, 13–22.
- „Umwerfen der Figur durch Gegner“: „Die Figur fliegt dabei mit 5 px/Frame
  etwa 180–230 px weit (unsicher, ein Lauf)“ ist jetzt dreimal gemessen,
  bleibt aber unsicher (Werte oben).
- „Nachtrag: Schaden der Gegner“, Gleichzeitiger Treffer (Workflow): für den
  Boss bestätigt. Im ersten aktiven Frame des kurzen Schlags gewinnt die
  Figur, danach trifft er zuerst (`m_z_k47`; V „# V c im angriff“).
- „Nachtrag: Verhalten der Nahkämpfer“, D: Wellen in Stage 1. Zeile DOLG:
  Die LP stehen nicht schon ab der Sichtbarkeit (K 1994–1996) fest, sondern
  werden im Frame nach dem ersten Frame mit Kamera ≥ 2048 geschrieben; 110
  gilt nur bei Rang 16–23. Zeile EDDY 4 und 5: Die offene Grenze „55 oder
  56“ ist geklärt (55 löst aus, 56 nicht; bei 100 LP 50 bzw. 51). Zeile DICK
  (zwei): Der zweite DICK kommt nur ab Rang 16 und nur bei höchstens drei
  anderen lebenden Gegnern. Zeile „zwei WOOKY von links (Arena)“
  (unsicher): Die Regel „Sinkt nach der Welle bei halben LP die Zahl
  lebender WOOKY und EDDY unter zwei, erscheinen sofort zwei WOOKY“ passt zur
  Beobachtung des Gegenprüfers dort (nach dem Tod der EDDY 4/5); ob sie auch
  den Lauf `m3_bot_h3` (bei LP 44) erklärt, ist nicht nachgeprüft.
- „Gefundene Adressen“, Gegner S+0x40 (DOLG): „stehen, sobald er sichtbar
  ist“ gilt nicht (geschrieben im Frame nach dem ersten Frame mit Kamera
  ≥ 2048, wie bei der Wellen-Zeile oben); „Höchstwert 110“ ist Rang 16
  beim Erreichen der Arena; der Rücksprung (dort unsicher) ist jetzt
  gesichert. Gegner S+0x9A („Start- bzw. Maximal-LP“) gilt beim Boss nicht,
  dort ist es die Balkenskala 72. Neue Zeilen siehe „Gefundene Adressen“.
- „Objekt-Slots“: „Was in Slot 19 liegt, ist offen.“ Laut Gegenprüfer trägt
  Slot 19 den Typ DOLG schon ab Stage-Beginn (`0100`); beim Erreichen der
  Arena werden nur die LP geschrieben (nur V, unsicher).
- „Nachtrag: Spezialangriff“, Zeile „Bosse, schwerere und liegende Gegner“
  (offen): für den Boss gemessen (6 LP, nie zurückgewiesen, 78 Frames
  Taumeln, 135 px, kein Liegen).
- `grafik/README.md`, Beschreibung des DOLG (beschrieben): „100 LP“ gilt nur
  bei Rang 9–15. „danach springen seine LP auf den Wert vor der Kombo
  zurück; nur Kombos mit Niederschlag zählen“ ist widerlegt: Zurück geht es
  auf den Wert vor dem jeweiligen Treffer, auch Tritt, Sprung- und
  Sprintangriff werden zurückgewiesen oder abgefangen, und der Stoß danach
  ist harmlos. „etwa alle 170–200 Frames“ ist zu kurz (Median 199–288). Die
  dort genannten Schadenswerte (Armschwung 9–10, Ansturm 12–14, Körperpresse
  und Griff 17–19) und die Reichweite des Armschwungs (77–79 px) gelten nur
  für einzelne Ränge bzw. Abstände; maßgeblich sind die Werte hier. „Mit
  seinem Sturz brechen alle übrigen Gegner im selben Frame zusammen“: gemessen
  t+2 bis t+3, ein gerade liegender oder getroffener Gegner erst nach seiner
  Reaktion.
- `docs/mechanik.md`, „Trefferreaktion der Gegner“ (gesichert für WOOKY und
  EDDY): kein Widerspruch, aber der Boss verhält sich anders (Reaktion 27
  bzw. 15 statt 23 Frames, Schutzzähler 10 und Trefferfläche erst ab G+11
  bis G+17 statt „ab G sofort verwundbar“). Der Abschnitt „Boss“ in `docs/mechanik.md` führt diese
  Werte getrennt; die Zeilen für WOOKY und EDDY bleiben unverändert.
- Bezeichnungen: In den Entwürfen ist K auch die Abkürzung des kurzen
  Schlags und G die des Griffs; in `docs/mechanik.md` sind K und G Frames
  (umwerfender Treffer, wieder frei). Der Gegenprüfer zählt dz als Figur
  minus Boss; seine „−6 bis +7“ entsprechen „−7 bis +6“.

## Nachtrag: Fernangriffe der Gegner

Belege: `logs/fern.csv` (Messagent M7, Teile 0–F, und am Ende die
Abschnitte `## T …` der dritten Messung; 4315 Zeilen) und `logs/fern_v.csv`
(Gegenprüfer V7, 1281 Zeilen), beide erzeugt von `scripts/belege_fern.sh`.
Szenarien: `scenarios/fern_frei.lua` (Messagent und dritte Messung), beim
Gegenprüfer `scenarios/fern_v_frei.lua` und `scenarios/fern_v_bot.lua`
(Konfiguration für `grafik/bot.lua`, Savestate `fern_v_skip8`). Auswertung:
`scripts/messen_fern.py` (für die dritte Messung die Unterbefehle
`ausloesung`, `salve`, `nachschuss`, `slots`, `bahnende`, `welle`, `bogen`,
`fenster`) bzw. `scripts/messen_fern_v.py belege`. Das Skript hat drei
Blöcke: Messagent (Teile 0–F, etwa 1100 MAME-Läufe), Gegenprüfung V7 (358
Läufe) und dritte Messung (Präfix `fern_t`, 367 Läufe: 20 natürliche, 276
Proben in 12 Trefferfenstern, `t_kt_*`, 56 Läufe zur letzten Welle, 4 Tode
`t_e_*`, 3 Nachläufe von V7-Läufen; Zahl beim Einarbeiten aus dem Skript
gezählt). `FERN_NUR_V=1` führt nur den Block V7 aus (die dritte Messung
entfällt dann), `FERN_BEHALTEN=1` behält die Rohdaten (nötig für
`messen_fern.py zeitachse`). Voraussetzung sind die Savestates
`p0_s1_s1_cam00768` (SKIP) und `p0_s1_s1_cam02048` (Bossarena) aus dem
Bot-Lauf der Phase 0, für V7 dazu `stage1`; `greichweite_dick` braucht nur
der Lauf `a_gd`. Nach dem Einbau der dritten Messung lief das ganze Skript
zweimal von vorn mit Exit 0, in 22 min 23 s und 17 min 50 s (im zweiten Lauf
kam nur der Abschnitt `E Bogen` dazu). Reproduzierbar: `logs/fern.csv` hat
danach die MD5 `bb1260429a9a366f82b18439017d6e2c`; ohne `E Bogen` ist sie
bitgleich mit Lauf 1, und ihre ersten 2802 Zeilen (ohne die 12 Zeilen von
`E Bogen`) gleichen dem Stand vor der dritten Messung (MD5
`7baee55ed275067e3656661114f5b34f`, beim Einarbeiten nachgerechnet). Diesen
Stand hatte schon der Gegenprüfer in einem Volllauf von Teil M7 und Block V7
(19 min, Exit 0) bitgleich erhalten. `logs/fern_v.csv` (MD5
`b209e1f2b366e1eb0636a7d02162bc61`) ist gleich dem Volllauf von V7. Bei der
Gegenprobe beim Einarbeiten lief das ganze Skript ein drittes Mal von vorn
(Exit 0, 13 min 7 s) und ergab für beide Dateien wieder dieselben MD5. Das
Skript löscht danach die Rohdaten; die Savestates `fern_*` (Teil 0),
`fern_v_*` und `fern_t_*` bleiben lokal in `logs/raw/sta/captcomm`.

**Methode.** Der Messagent (M) schreibt ab den Phase-0-Savestates je Frame
den Speicher `FFA900`–`FFEA00`, dazu Kamera, Rang und Stage im Watch-CSV.
Ein Geschoss ist ein Objekt in Slot 20–59, dessen Zeigerwort S+0x6C auf den
Werfer zeigt (Messer Typ `0x85B42`, Kugel und Rakete `0x86022`). Ein Treffer
ist ein LP-Verlust der Figur (P+0x40 < P+0x42), zugeordnet über P+0x82;
der Schaden steht im Geschoss (S+0x8B). Natürliche Läufe (6000 bzw. 4000
Frames, Figur passiv, fest oder bewegt, Rang 9 und 20) liefern Auslösung,
Ablauf, Flug, Schaden und Rhythmus. Trefferfläche und Abwehr sind mit Proben
gemessen: Ab G setzt ein Eingriff die Figur relativ zum Geschoss bzw. ein
Objekt auf seine Bahn, oder die Figur schlägt bzw. springt in variierten
Frames; jede Probenreihe aus zwei Savestates mit anderem Rang und anderer
Lage. Der Gegenprüfer (V) hat eigenes Szenario, eigene Auswertung und einen
eigenen Bot-Savestate, andere Ränge (vor allem 12, 17, 22), DOLG auf
x 2600/Tiefe 300 statt 2900, Arena-WOOKY besiegt statt entfernt, EDDY teils
lebend. Er prüft die Trefferflächen umgekehrt (Geschoss relativ zur Figur
gesetzt, alle vier Kombinationen aus Flugrichtung und Blick), Tiefe und
Sprung ohne Eingriff. Natürlich: 10 SKIP-Läufe (54 Würfe, 250 Stiche),
8 DICK-Läufe (68 Salven mit 285 Kugeln, 76 Raketen). V bestätigte 37 von
55 Zeilen, 18 wichen ab (6 nur im Randwert), keine war nicht prüfbar. Die 18
hat M ein drittes Mal gemessen (T): Ränge 7, 12, 14, 17, 22, 24, andere
Savestates und Lagen (Figur fest auf x 880, 1000, 1560, 2110, 2180, 2330;
Gruppen-Savestate `fern_sg9`), beide Flugrichtungen, EDDY der letzten Welle
lebend, eine per Eingabe-Bot (`CC_HIN`, kein Eingriff) periodisch auf den
Gegner zugehende Figur, gezielte Eingriffe an Budget, Tiefe und Höhe und
drei Nachläufe von V-Läufen mit Abzug. „gesichert (3. Messung)“: Eine
gemeinsame Regel erklärt die Werte aller drei Messungen; ein reiner Bereich
gilt als Regel, wenn der dritte Wert in der Vereinigung der beiden ersten
liegt oder eine benannte Abhängigkeit ihn erklärt.

Bezeichnungen: A = erster Frame der Angriffsanimation des Werfers
(S+0x1C), G = erster Frame des Geschosses (nicht das G aus „Trefferreaktion
der Gegner“), t = Frame des tödlichen Treffers. d = Abstand der Figur vor dem
Werfer in dessen Blickrichtung, dz = z(Werfer) − z(Figur). vorn = Abstand
der Figur vor dem Geschoss in Flugrichtung (positiv: noch nicht erreicht).
b = Blick der Figur, s = Flugrichtung (je +1 rechts, −1 links); „zum“ bzw.
„weg“: Die Figur schaut zum Werfer bzw. von ihm weg. Lagen ganzzahlig am
Frame-Ende, Welt-x. Belegspalte: M = Läufe und Abschnitte von `fern.csv`
ohne Vorsatz `fern_`, T = deren dritte Messung (`t_*`, Abschnitte `T …`),
V = Läufe und Abschnitte von `fern_v.csv` ohne `fern_v_`.

**Eingriffe (EINGRIFF).**

- M, alle Läufe: LP der Figur vor jedem Frame auf 72 (LP); Rang `FFF82A`
  festgehalten (RANG: 9, 20, Teil D 7–24), außer `a_snat` und `a_gd`.
- M, DICK-Läufe: DOLG (Slot 19) vor jedem Frame auf x 2900 (DOLG; außer
  `a_k*`, `a_gd`). WOOKY und EDDY der Bossarena ab Frame 4 entfernt (ENTF,
  ohne Tod; der Pistolen-DICK erscheint dann in Frame 11; `a_p*`, `a_r*`,
  `a_z*`, Savestates `pw*`, `rw*`, `pz9`). DOLG-LP in Frame 100–101 auf 27
  (LP27; `a_r*`, `a_z*`, `rw*`, `pz9`, `c_ke_*`, `c_re_*`): Der Sprung von
  110 auf 27 unterschreitet die Hälfte und das Viertel zugleich, deshalb
  kommen im selben Frame die 2 EDDY (sofort entfernt; vermutlich die Welle
  der Hälfte) und der Raketen-DICK (Schwelle Viertel), siehe „Nachtrag:
  Verhalten der Nahkämpfer“, Tabelle D. V (LP 26) und T (LP 25) setzen die
  LP ebenso in einem Schritt. Pistolen-DICK samt Waffe (Slot 18 und 58)
  in Frame 12 entfernt (PISTWEG; `a_r9`, `a_r20`, `a_rf20`, `rw*`).
- M, Lage: Figur auf feste Welt-x bzw. Tiefe (FEST; `a_sf9`, `a_sf20`
  x 900; `a_pf9`, `a_rf20` x 2248, Tiefe 156; `sw9`, `sw20` bis zum
  Speichern; Raketenproben x 2420 in G+1..G+20). Figur bzw. Gegner oder
  Objekt ab G relativ zum Geschoss (GESCH; Teil B, `c_*g_*`, `c_*glas_*`,
  `c_mo_*`, `c_ke_*`, `c_re_*`). Gegner-LP auf 1, Figur 50 px daneben, ein
  Schlag (TOET; Teil E, `a_k*`).
- T, zusätzlich: DOLG-LP in Frame 150 auf 25 (LP25; `t_m22`, `t_r*`,
  `t_rr*`, `t_z*`); ENTF nur der WOOKY, die EDDY der Welle leben (`t_m22`,
  `t_r17`, `t_z*_a`, `t_z*_b`, `t_z22_e`, `t_z22_f`); Figur ab A+17k−4 auf
  Tiefe 200 (TIEFE; `t_kt_*`); Rang in Frame 160 umgestellt (RANGWECHSEL;
  `t_z15_f`, `t_z20_f`); Höhe des DICK in Frame 2–7 auf 0, 12, 24 bzw. 20
  (HÖHE; `t_e_*`); FEST in `t_sf880`, `t_sf1000`, `t_sr1560`, `t_pf12`,
  `t_pl22`, `t_rr14`, `t_rr17`; GESCH in `t_bm*`, `t_bk*`, `t_br*`.
- V: LP 72 (alle), Rang (außer `s_nat`, `s_mov`), DOLG auf x 2600/Tiefe 300
  (Bossarena), `glp`/`entf` (Arena-WOOKY LP 1 bzw. entfernt, EDDY der Welle
  entfernt, DOLG-LP 26, TOET, frühere Kugeln einer Salve entfernt), `pos`
  (Figur fest auf x 910, 900, 895), `obj:g`/`fig:g` (Geschoss relativ zur
  Figur bzw. Figur in die Explosion), `hoch`, `frac0`, `spos` (Glas, Fass).
- Alle Savestates stammen aus Bot-Läufen mit LP-Auffüllung (Phase 0 und
  `fern_v_skip8`: nach Stillstand LP der Gegner im Bild auf 1).

**Abweichungen und dritte Messung** (Ergebnis in den Tabellen):

- Trefferflächen: M probte das Messer nur im Flug nach links, Kugel und
  Explosion nur nach rechts (die Explosion nur mit Blick weg); in der
  Gegenrichtung liegt das Fenster 1 px anders. Eine Regel in Welt-x deckt
  alle Fenster.
- Messerwurf, Stich und Pistole lösen über einen Zielpunkt aus
  (S+0x96/S+0x98); Sonderwerte kommen von einer bewegten Figur oder einer
  Sperre.
- Salve: Die Länge folgt aus einem Budget S+0xAB (2–6 oder 8 Schüsse, früher
  Abbruch 1–7).
- Raketenwerfer: Nach dem Schuss geht der DICK immer erst los; „Aktion 4“
  im Entwurf von M war die Phase 4.
- Zweiter Raketen-DICK: hängt vom Rang und von der Zahl belegter
  Gegnerslots ab.
- Waffe beim Tod: Der Bogen hängt von der Höhe des DICK beim Tod ab.
- Unsicher blieben die Raten der drei Fernangriffe sowie Abstandsanteile und
  Rückzug des DICK.

### Gemeinsame Befunde

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Geschossblock | Messer immer Slot 29; Kugel und Rakete in einem der Slots 27–29, der im Frame vor G frei ist (welcher, hängt von Belegung und voriger Vergabe ab; Kugeln meist 27, wenn 28 belegt ist). S+0x6C = Zeigerwort auf den Werfer, S+0x8B = Schaden; P+0x82 der Figur zeigt beim Treffer auf den Werfer. Raketen: M Slot 28–29 (74), V 27–29 (11 von 76 in 27), T 27/28/29 = 1/39/68 (108); Kugeln T 30/121/105 (256); Messer T 18 von 18 in 29; der Slot war in allen 382 Fällen vorher frei | M `A geschosse` (306 Geschosse); V `wurf`, `angriff_dick`, `rakete`; T `T slots` (Rakete in 27: `t_m22` G 4510) | gesichert (3. Messung) |
| Flugbahn | geradeaus in x in Blickrichtung des Werfers, Tiefe und Höhe fest (die Rakete sinkt), keine Nachführung; Messer 4,0, Kugel 8,0, Rakete 5,0 px/Frame. Gezielt wird nur vor dem Schuss über die eigene Position | M `A geschosse` (Spalten `vx`, `z_flug`, `h_verlauf`); V `wurf`, `bmz1*`, `bkz*`, `brz1*` | gesichert |
| Gegner auf der Bahn | werden nie getroffen: Messer, Kugel, Rakete und Explosion gehen durch WOOKY, EDDY und DICK hindurch | M `c_mg_*`, `c_kg_*`, `c_ke_*`, `c_rg_*`, `c_re_*` (GESCH), `A geschosse` (0 Treffer an Gegnern); V ohne Eingriff `gegner_auf_bahn` (z. B. Raketenflug durch DICK/EDDY/WOOKY 756/439/554 Frames im Trefferbereich, nie ein LP-Verlust) | gesichert |
| Zerbrechliche Objekte | Messer und Kugel enden an einer Glasscheibe (LP 1) und zerbrechen sie, das Messer auch an einem Ölfass (LP 777 → 0). Die Rakete fliegt durch die Scheibe, ihre Explosion zerbricht sie | M `c_mglas_*`, `c_mo_-30`, `c_kglas_*`, `c_rglas_*`; V `cmglas`, `cmfass`, `ckglas`, `crglas_flug`, `crglas_ex` | gesichert |
| Mehrere Ziele | Messer und Kugel enden beim ersten Treffer (Trefferfunke `0x95B5C`, 12 Frames). Die Explosion trifft die Figur und zerbricht im selben Frame Objekte, Gegner nie | M `c_rg_beide`; V `s_nat` 1399–1410, `crglas_ex` | gesichert |
| Schutz nach Treffer | Geschosse treffen auch die Figur in ihrer Trefferreaktion (Zustand 3; gemessen an den Geschossen des DICK): Die zweite Kugel einer Salve trifft in der Reaktion auf die erste | M `A geschosse`; V `schutz` (82 von 193 Treffern durch DICK-Geschosse bei Zustand 3 im Vorframe) | gesichert |

### Messerwurf (SKIP)

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Auslösung | Zielpunkt 150 px vor der Figur in ihrer Tiefe (S+0x96 = Welt-x, S+0x98 = Tiefe; Aktion 6, Phase 0x0A). Der SKIP geht mit Blick zur Figur rückwärts dorthin und wirft, sobald x(SKIP) − x(Ziel) und Tiefe(SKIP) − Tiefe(Ziel) je in [−9, +10] liegen. Das Fenster ist in Welt-x unsymmetrisch: bei stehender Figur d 141–160, wenn er rechts von ihr steht, d 140–159 links, meist beim Eintritt ins Fenster (141/142 bzw. 140). Hat sich die Figur seit der Zielwahl bewegt, verschiebt sich d um ihren Weg (126–178 gemessen); versperrt ein Objekt oder Rand den Weg in x, wirft er von dort (d 38–123). Vorbereitung = Weg zum Zielpunkt (7–37 Frames). M: d 141–143 bzw. 146–156, Rand 114–116, Vorbereitung 7–31. V: d 140 sechsmal (SKIP links), sonst 141–142 bzw. 145–160, 178 nach bewegter Figur, Rand 111/114/123, Vorbereitung 7–37. T: Abweichung bei freiem Weg x −9..+10, Tiefe −9..+5; d 141–152 rechts, 140 dreimal links (je Abweichung +10), 126/136/138 bei bewegter Figur, 38 an einer Sperre (Ziel 112 px entfernt), Vorbereitung 11–30 | M `A abstand`, `A angriffe`; V `wurf` (d 140: `s_r12` A 4839, 5349, `s_fest12` A 5743, 5959, 7422, `s_mov` A 3743; Rand: `s_fest900` A 1210, 5971, `s_fest895` A 5268); T `T ausloesung` (`t_sf1000` A 4665, `t_s22h` A 5680, 1455, 5305, `t_sr1560` A 692, 1389, `t_s14r` A 777) | gesichert (3. Messung) |
| Ablauf | Animationen 4/3/1/1/32/1 = 42 Frames (`289F2`, `28A2E`, `28A64` mit Attribut 0xFF00, `28A9E`, `28AD8`, `28B12`); Messer in A+8, Nachlauf 33 Frames (A+9 bis A+41), Gehen ab A+42 | M `A angriffe` (32 von 32), `A geschosse` (G − A = 8); V `wurf` (54 von 54) | gesichert |
| Messer | Slot 29, erscheint 80 px vor dem SKIP in seiner Tiefe, 56 px hoch, 4,0 px/Frame, im ganzen Flug wirksam (Attribut 0x0C08) | M `A geschosse` (32); V `wurf` (54) | gesichert |
| Reichweite, linker Bildrand | bis zum Treffer; sonst verschwindet das Messer, sobald es mehr als 20 px links vom Bildrand ist (letzte Lage x − Kamera-x −17 bis −20). Natürlicher Fehlwurf: 27 Frames, 104 px | M `B Messer` (Proben ohne Treffer), `a_st9`; V `bmz1d_7` (−19, 27 Frames, 104 px), `s_r12` A 934 (−17, 36 Frames, 140 px) | gesichert |
| Reichweite, rechter Bildrand | M nicht gemessen (nur Würfe nach links ohne Treffer). V: letzte Lage 402 (18 px rechts vom Bild) nach 77 Frames, Figur per Eingriff 75 px hoch | V `bmrand3` | unsicher |
| Trefferfläche x | Treffer, wenn (x(Figur) + 4·b) − (x(Messer) + s) in [−25, 24]: 50 px breit, um 8 px zur Blickrichtung der Figur verschoben, in der Gegenrichtung 1 px anders. In vorn: Flug nach links zum −19..30, weg −27..22; Flug nach rechts zum −20..29, weg −28..21. Natürlicher Treffer (Flug nach links) bei vorn 29 bzw. 21 in A+16. M maß nur den Flug nach links; V maß alle vier Fälle aus Flugrichtung und Blick, nach links wie M, nach rechts 1 px versetzt (natürlich nach rechts nie über vorn 29); T alle vier (je 23 Proben, 0 Widersprüche) | M `b_mx_r*`, `b_mx_l*` (Rang 9), `b_mx20_*`; V `bmx1_*`, `bmx2_*`, `bmx3_*`, `bmx3w_*`; T `T fenster` (`t_bm1` Flug rechts, Rang 14; `t_bm2` Flug links, Rang 17) | gesichert (3. Messung) |
| Tiefe | \|dz\| ≤ 12 trifft, 13 nie | M `b_mz_*`, `b_mz20_*`; V ohne Eingriff `bmz1d_5..8`, `bmz1u_17..20` | gesichert |
| Höhe | trifft die Figur bis 59 px Höhe (Frame-Ende), ab 60 nie; ein Sprung (Scheitel 51) weicht nicht aus | M `b_mh_*`, `b_mh20_*`, `c_mj_*`, `c_mj20_*`; V `bmh3_57..66`, `bmh2_57..62`, `cmj1_*` | gesichert |
| Schaden | Rang 7–11: 10, 12–16: 11, 17–21: 12, 22–24: 13 | M `d_m_*`, `A geschosse` (Rang 9: 19, Rang 20: 7 Treffer); V `dm_*` (Rang 7, 8, 11, 12, 16, 17, 21, 22, 24), `wurf` | gesichert |
| Umwerfen | jeder Treffer wirft um | M `A geschosse` (31 von 31); V `wurf` (53 von 53), `bahn` | gesichert |
| Abwehr Schlag | Ein Schlag zerstört das Messer, wenn seine aktiven Frames (P+2 bis P+5) es in Schlagreichweite erfassen, bevor es trifft (V: P+5 ≥ G und P+2 ≤ Trefferframe). Bei 61 px Abstand beim Abwurf: Druck in G−5 bis G+6 (M Rang 20: G−4 bis G+6 in 2-Frame-Schritten; V bei 62 px, Flug nach rechts: G−5 bis G+7). Das Messer geht in Zustand 3, prallt mit etwa 1 px/Frame im Bogen (bis 66 px hoch) zurück und ist nach etwa 40 Frames (V 39–40) weg, ohne zu treffen | M `c_ms_*` (G 44), `c_ms20_*` (G 54); V `cms1_-8..9` (Rang 11), `cms3_-7..13` | gesichert |
| Abwehr Sprung | weicht nicht aus: Treffer in jeder Sprunghöhe (M 10–51 px, V 18–51 px), die Figur fällt | M `c_mj_*`, `c_mj20_*`; V `cmj1_*` (Sprung in A−10 bis A+12) | gesichert |
| Rhythmus | keine feste Rate: M 0,83 bzw. 0,58 Würfe je 1000 Frames, Abstände 247–3251; V je Lauf 0,12–1,5, Abstände 206–2860; T 0,17–0,67, Abstände 365–3903. Hängt von Lage, anderen Gegnern und dem Umwerfen der Figur ab | M `A rhythmus`; V `rhythmus_skip`; T `T rhythmus` | unsicher |

### Messerhagel (Stichserie des SKIP)

Der „Messerhagel“ aus `grafik/README.md` ist kein Wurf, sondern die Serie
des Messerstichs (`287E0`, siehe „Nachtrag: Reichweite der
Gegnerangriffe“).

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Ablauf | Stich 25 Frames, Treffer in A+13, danach 12 Frames Wartepose (`2849E`) und der nächste Stich: Abstand 37 Frames innerhalb einer Serie (bei freiem Weg); nach der Serie Gehen | M `A angriffe`, `A rhythmus` (84 von 84); V `stich` (Treffer A+13 in 226 von 229, A+14/15 nur bei bewegter Figur), `serien` (133 von 133) | gesichert |
| Serie | 1–4 Stiche bei freiem Weg (M 2: 36-mal, 4: 14, 1: 13, 3: 3; V 1: 36, 2: 55, 4: 26, keine 3er-Serie) | M `A rhythmus` (Spalte `salven_bzw_serien`); V `serien` | gesichert |
| Stichabstände zwischen Serien und an einer Begrenzung | Lesart beim Prüfen, von keinem Agenten ausgewertet. Zwischen zwei Serien auch 46–53 Frames: M 46, 48, 49, 51 (`a_sg9`, `a_s20`, `a_sf20`, `a_s9`, `a_snat`), V 46, 48, 49, 51 (`s_fest12`, `s_fest895`, `s_fest900`, `s_r22`, `s_nat` A 1801/1852, `s_rand14`, `s_rand20`), T 47, 49, 51, 53 (`t_sf1000`, `t_s14l`, `t_sf880`, `t_s17g`). An einer Begrenzung sticht der SKIP mehrmals hintereinander mit je 4–10 Frames Vorbereitung statt der Wartepose: V 6 Stiche bei d 2 im Abstand 43, 39, 39, 30, 39 (`s_r12` A 6080–6270), T 8 Stiche bei d 43 im Abstand 39, 39, 39, 33, 30, 39, 39 (`t_sr1560` A 3705–3963; `T rhythmus` zählt sie als Serie von 8, weil es Abstände bis 40 Frames zu einer Serie fasst); M sah keinen solchen Fall | M `A rhythmus`; V `stich`; T `T rhythmus`, `T ausloesung` | unsicher |
| Auslösung | Zielpunkt 64 px vor der Figur in ihrer Tiefe (S+0x96 = ±64, S+0x98 = 0, relativ zur Figur). Stich, sobald der SKIP höchstens 8 px in x daneben steht: d 56–72 (meist beim Eintritt ins Fenster, 56–59 von innen, 70–72 von außen), dz −6 bis +8. Versperrt eine Begrenzung den Zielpunkt, sticht er von dort. M: d 56–72, dz −5..+8. V: dazu d 2 (6 Stiche an der Begrenzung x 1605) und dz −6. T (151 Stiche: 121 Messer- und 30 Ausfallstiche, beide mit Zielpunkt ±64): d 56–72, Abweichung vom Zielpunkt −7..+8, d 43 achtmal an der Begrenzung (SKIP bei x 1603, Figur fest auf x 1560), dz −5..+5 | M `A angriffe`; V `stich` (d 2: `s_r12` A 6080–6270; dz −6: `s_fest900` A 6215, 6252); T `T ausloesung` (`t_sr1560` A 3705–3963) | gesichert (3. Messung) |
| Schaden | Rang 8: 7, 9–15: 8, 16–22: 9 (M Rang 8: 7, 9: 8, 17 und 20: 9); wirft nicht um | M `A angriffe` (Spalte `treffer`); V `stich` | gesichert |

### Pistole (DICK)

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Auslösung | Zielpunkt relativ zur Figur (S+0x96 = dx, S+0x98 = dz): ±128 px in ihrer Tiefe oder ±120 px mit ±24 px Tiefenversatz. Der Angriff (Aktion 6, Phase 2) beginnt, sobald der DICK höchstens 8 px in x und 6 px in der Tiefe vom Zielpunkt entfernt steht, also bei d 112–136. Dann gleicht er die Tiefe an (1 Frame ohne Versatz, sonst bis 22 Frames mit 0,875 bzw. 1,125 px/Frame) und schießt; x folgt der Figur dabei nur langsam. Bei stehender Figur d 112–136, geht sie auf ihn zu, kleiner; dz −6 bis +5. M: d 112–136, Angleich 1 bzw. 12–18 Frames. V: Zielpunkte genau diese sechs, Angleich 1 (36-mal) bzw. 12–16 Frames, d 105 zweimal bei einer Figur auf dem Weg zu ihm (Angleich dann 25 und 38 Frames). T (63 Salven): Beginn bei Abweichung x −8..+8, Tiefe −6..+5, d dort 112–136, beim Schuss 111–136 (111 einmal, Figur per Eingabe-Bot 2 px näher), Angleich 1–22 | M `A abstand`, `A angriffe`; V `angriff_dick` (d 105: `p_mov` A 1237, 4865); T `T ausloesung` (`t_ph14` A 3465) | gesichert (3. Messung) |
| Salve | Budget B = S+0xAB in A: 20, 40, 60, 80, 100 oder 120 Frames. Je Schuss 17 Frames (`68528` 5, `6855C` 1 mit Attribut 0xFF00, `68590` 10 mit Kugel in A+6, `685C4` 1). Nach dem k-ten Zyklus (Ende A+17k+16, k ab 0) folgt der nächste, solange 17k + 16 < B: 2, 3, 4, 5, 6 bzw. 8 Schüsse, 7 nie. Früher endet die Salve, wenn die Figur am Ende eines Zyklus außer Reichweite (Abbruch bei d 188–204, weiter bei d bis 167) oder aus der Tiefe ist: dann 1–7, mit Tiefenwechsel nach dem k-ten Schuss genau k. Danach Gehen (Aktion 0, Phase 4), 10 Frames Nachlauf nach der letzten Kugel. M: 2–6 Schüsse. V: 1–8 (8 zweimal; 1, wenn die Figur nach dem ersten Schuss die Tiefe verließ). T: 63 natürliche Salven mit 2 (3-mal), 3 (15), 4 (25), 5 (17), 6 (2), 8 (1) Schüssen, alle nach dem Budget außer 7 Abbrüchen nach 4 statt 5 Schüssen (d 188–204); die 8er-Salven von V hatten Budget 120. Budget je Rang in T: 7: 60/80, 12: 40–80, 14: 40–100, 22: 20–120, 24: 20–100 | M `A angriffe`; V `angriff_dick` (8 Schüsse: `g_r20` A 4917, `z_r22` A 7112), `bkz1u_*`; T `T salve` (`t_m22` A 4998, `t_kt_1` … `t_kt_7`, `t_v7_g_r20`, `t_v7_z_r22`) | gesichert (3. Messung) |
| Kugel | Slot 27–29, erscheint in A+6 34 px vor dem DICK in seiner Tiefe, 58 px hoch, 8,0 px/Frame, im ganzen Flug wirksam | M `A geschosse` (200 Kugeln); V `angriff_dick` (285 von 285) | gesichert |
| Normale und umwerfende Kugel | Die Kugeln einer Salve haben abwechselnd Attribut 0x0002 (wirft nicht um, Animation `863D8`) und 0x0C02 (wirft um, `863F0`); immer zuerst normal, nie zwei umwerfende nacheinander. M 48 Salven: 35 streng abwechselnd, 13 mit zwei normalen nacheinander; V 68 Salven: 43 bzw. 25. Gegen die passive Figur trifft deshalb meist die erste Kugel, die zweite wirft um, die weiteren gehen über die liegende Figur | M `A geschosse` (Spalte `art`); V `angriff_dick` (Spalte Muster) | gesichert |
| Regel für zwei normale Kugeln nacheinander | nicht gefunden (M NN… 11-mal, NUNN 2-mal; V auch NNUNN, NUNNU, NUNUNN, NUNUNUNN) | M `A geschosse`; V `angriff_dick` | offen |
| Reichweite | bis zum Treffer; sonst verschwindet die Kugel, sobald sie mehr als 71 px außerhalb des 384 px breiten Bildes ist (letzte Lage x − Kamera-x −71..−64 bzw. 447..454). An der rechten Arenawand Einschlag (`0x95Exx`, 5–6 Frames); die Wand liegt je nach Tiefe bei x ≈ 2540 (Tiefe 161) bis ≈ 2544 (Tiefe 150), die letzte Lage davor bei 2531–2543. M: Wand 2538–2541, Bildrand −64..−66 bzw. 449–450. V: Wand 2531–2543, −64..−68, 451–452. T: −71..−64 (37 Kugeln), 447..454 (11), Wand 2532–2542 (69; Tiefe 150: 2536–2542, Tiefe 161: 2532–2538) | M `A geschosse` (101 Kugeln ohne Treffer), `B Kugel`; V `kugel_ende` (154 Kugeln); T `T bahnende` (`t_pl22`, `t_ph14`, `t_pf12`) | gesichert (3. Messung) |
| Trefferfläche x | Treffer, wenn (x(Figur) + 4·b) − x(Kugel) in [−17, 16]: 34 px breit, um 8 px zur Blickrichtung verschoben. In vorn: Flug nach rechts zum −13..20, weg −21..12; Flug nach links zum −12..21, weg −20..13. M maß nur den Flug nach rechts; V alle vier Fälle, nach rechts wie M, nach links 1 px versetzt; T alle vier (0 Widersprüche) | M `b_kx_*` (Rang 20), `b_kx9_*`; V `bkx1_*`, `bkx2_*`, `bkx2w_*`, `bkx3_*`; T `T fenster` (`t_bk1` Flug links, Rang 22; `t_bk2` Flug rechts, Rang 14) | gesichert (3. Messung) |
| Trefferfläche zweite Kugel | wie die erste (umwerfende Kugel, beide Flugrichtungen) | M `b_kux_*`; V `bkux2_*`, `bkux3_*` | gesichert |
| Tiefe | \|dz\| ≤ 12 trifft, 13 nie | M `b_kz_*`, `b_kz9_*`; V ohne Eingriff `bkz1u_5..8`, `bkz3d_6..9` | gesichert |
| Höhe | trifft die Figur bis 59 px Höhe, ab 60 nie; ein Sprung weicht nicht aus (Treffer bei 52 px). In der Luft wirft auch die normale Kugel um | M `b_kh_*`, `b_kh9_*`, `c_kj_*`, `c_kj9_*` (Umwerfen: Spalte `umgeworfen` in `C Abwehr`, im Entwurf nicht ausgewertet); V `bkh1_61..65`, `ckj1_*` (Sprünge in 19, 33, 43, 49, 52 px getroffen und umgeworfen) | gesichert |
| Schaden | je Kugel Rang 7: 4, 8–14: 5, 15–21: 6, 22–24: 7 | M `d_k_*`, `A geschosse` (99 bzw. 100 Kugeln); V `dk_*`, `angriff_dick` | gesichert |
| Abwehr Schlag | zerstört die Kugel nicht, auch wenn die aktiven Frames des Schlags sie in 38–62 px Abstand erfassen | M `c_ks_*`, `c_ks9_*`; V `cks1_*` (Druck G−6 bis G+8, Treffer immer in G+9) | gesichert |
| Rhythmus | M 0,82 bzw. 1,57 Salven je 1000 Frames, Abstände 181–1792; V je DICK 0,38–1,76, Abstände 218–4090; T je DICK 0,50–2,34, Abstände 82–1745. `t_p7` und `t_p24` starten wie `a_p9` bzw. `a_p20` ohne Eingabe vom selben Savestate, nur mit anderem Rang, und wiederholen deren Abstände fast genau (672/943 bzw. 181 391 787 …); sie sind keine unabhängige Stichprobe | M `A rhythmus`; V `rhythmus_dick`; T `T rhythmus` | unsicher |

### Raketenwerfer (DICK)

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Auslösung | wie bei der Pistole (Zielpunkt ±128/0 oder ±120/±24, Tiefe angleichen bis höchstens 6 px): d 112–136, dz −6 bis +5 | M `A abstand`, `A angriffe` (74 Raketen); V `angriff_dick` (76 Raketen) | gesichert |
| Ablauf und Folgeaktion | ein Schuss je Angriff, 17 Frames: `685F8` (5), `6862A` (1, 0xFF00), `6865C` (10, Rakete in A+6), `68690` (1). In A+17 immer Aktion 0, Phase 4, Animation `67806` (Gehen) mit neuem Zielpunkt. Steht er dort noch nicht, geht er hin; steht er schon dort (höchstens 8 px in x, 6 in der Tiefe), steht er (Aktion 4, `677CE`), geht weiter oder greift sofort wieder an: Doppelschuss, 19 Frames nach dem ersten. M: „danach meist Stehen (Aktion 4)“; das war die Phase 4 (S+0x0C), auch bei M in 74 von 74 Fällen `67806`. V: immer sofort Gehen, Doppelschüsse im schon erreichten Zielpunkt (−128/0 bei d 120/121). T: in A+17 bei 108 von 108 Raketen und 63 von 63 Salven `67806`; danach bei nicht erreichtem Zielpunkt Gehen (90 von 90), bei erreichtem (18) Stehen 8-mal, Gehen 8-mal, Doppelschuss 2-mal | M `A angriffe`; V `angriff_dick`, `rhythmus_dick`; T `T nachschuss` (Doppelschuss `t_rr17` A 2419/2438, `t_r17` A 3632/3651, beide Rang 17) | gesichert (3. Messung) |
| Anteil der Doppelschüsse | M 8 von 74, V 2 von 76, T 2 von 108 Raketen | M `A angriffe`; V `angriff_dick` (`g_r12`); T `T nachschuss` | unsicher |
| Rakete | Slot 27–29 (wie die Kugel), erscheint in A+6 45 px vor dem DICK in seiner Tiefe, 44 px hoch, 5,0 px/Frame, sinkt (Höhe 44 → 1) und landet frei in G+20 100 px weiter (145 px vor dem DICK). Im Flug kein Attribut, trifft nicht (Figur an der Rakete in G+1..G+19 nicht getroffen, auch in Höhe 44) und durchfliegt Figur, Gegner und Glas. An der rechten Arenawand explodiert sie früher: Flug 14–19 Frames, letzte Lage x 2534–2543 (Wand je nach Tiefe wie bei der Kugel). M: Slot 28–29, Wand x 2543 nach 15–19 Frames. V: Slot 27–29, Wand 2538–2543 nach 16–19. T: Slot 27/28/29 = 1/39/68, Wand nach 14–18 Frames bei 2534–2542 (9 Raketen; Tiefe 150: 2540–2542, Tiefe 161: 2534) | M `A geschosse`, `b_rflug`, `b_rflug0`, `c_rglas_flug`; V `rakete` (76); T `T slots`, `T bahnende` | gesichert (3. Messung) |
| Explosion | Attribut 0x1402 in G+20 bis G+29, trifft in G+21 bis G+29 (9 Frames; ab G+30 nie); Animation bis etwa G+113, dann Block frei (V: G+115) | M `b_ra_*` (Rang 20), `b_ra9_*`, `A geschosse`; V `brt1_22..33`, `rakete` | gesichert |
| Explosion x | Treffer, wenn (x(Figur) + 4·b) − x(Einschlag) in [−52, 51]: 104 px breit, um 8 px zur Blickrichtung verschoben, in der Gegenrichtung 1 px anders. In vorn vom Einschlag: Flug nach rechts weg −56..47, zum −48..55; Flug nach links weg −55..48, zum −47..56; frei fliegend (Einschlag 145 px vor dem DICK) also etwa 89 bis 201 px vor dem DICK (89–192 nur bei Flug nach rechts und Blick weg, dem Fall von M; der Entwurf von M nennt nur diesen Bereich). M maß nur Flug nach rechts mit Blick weg; V und T alle vier Fälle (V bestätigt dabei den Fall von M, T 0 Widersprüche) | M `b_rx_*` (Rang 20), `b_rx9_*`; V `brx2t_*`, `brx2_*`, `brx1_*`, `brx1t_*`; T `T fenster` (`t_br1` Flug links, Rang 14, Einschlag x ≈ 2308; `t_br2` Flug rechts, Rang 24) | gesichert (3. Messung) |
| Explosion Tiefe | \|dz\| ≤ 12 trifft, 13 nie | M `b_rz_*`, `b_rz9_*`; V ohne Eingriff `brz1u_6..9`, `brz1d_16..19` | gesichert |
| Explosion Höhe | trifft die Figur bis 25 px Höhe, ab 27 nie | M `b_rh_*`, `b_rh9_*`; V `brh1_24..28` | gesichert |
| Explosion bei 26 px Höhe | M Treffer in 2 von 3 Proben, V in 3 von 10 Frames (Höhe am Frame-Ende, die Figur fällt im Frame) | M `b_rh_*`; V `brh1_26` | unsicher |
| Schaden | Rang 7: 12, 8–14: 13, 15–21: 14, 22–24: 15; wirft immer um | M `d_r_*`, `A geschosse` (64 Treffer); V `dr_*`, `rakete` | gesichert |
| Abwehr Schlag | zerstört die Rakete nicht (kein Schlagframe verhindert die Explosion) | M `c_rs_*`, `c_rs9_*`; V `crs1_*` (Druck G bis G+18) | gesichert |
| Abwehr Sprung | weicht aus, wenn die Figur in G+21..G+29 höher als 25 px ist: Sprung 8 bis 26 Frames vor G+21 ohne Treffer; 6 Frames oder weniger davor getroffen (M in 24, 15, 6 px Höhe; V 4 bzw. 6 Frames davor in 15 bzw. 23 px); V auch 28 und 30 Frames davor getroffen (in 25 px, G+29 bzw. G+27) | M `c_rj_*`, `c_rj9_*`; V `crj1_*` | gesichert |
| Rhythmus | M 1,27 bzw. 1,42 Raketen je 1000 Frames, Abstände 219–2632; V je DICK 1,03–2,05, Abstände 207–2204; T je DICK 1,03–2,39, Abstände 204–1949. Die Raten zählen Doppelschüsse mit, die Abstände nicht (ohne den 19-Frame-Abstand) | M `A rhythmus`; V `rhythmus_dick`; T `T rhythmus` | unsicher |

### DICK: Auftreten, Abstand und Bewegung

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Varianten und LP | Pistolen-DICK (gehaltenes Objekt `0x9A988` mit Art S+0x3D = 0) und Raketen-DICK (Art 4). Max-LP 19 bei Rang 7, 20–23 bei 8–15, 26–28 bei 20–24 (V dazu Rang 17: 24, 18: 25) | M `F erscheinen`, alle DICK-Läufe; V `erscheinen` | gesichert |
| Erscheinen Pistolen-DICK | 3 Frames nach dem Tod (LP < 0) des ersten Arena-WOOKY, in Slot 18 von links (M Tod 57, DICK 60; V Tod 42, DICK 45); nach Entfernen der WOOKY in Frame 4 bzw. 10 in Frame 11. Nur bei Rang 7–15 und 20–24; bei 16–19 kam er nicht (M Rang 16, 1500 Frames, auch nach dem Tod beider WOOKY; V 400 Frames) | M `F erscheinen` (`f_r7`–`f_r24`, `f_k12`, `f_k16`, `a_k9`, `a_k20`); V `fe_*`, `zweit_e*`, `g_*`, `z_*` | gesichert |
| Erscheinen Raketen-DICK | in Slot 13 bzw. 14, sobald die DOLG-LP auf etwa ein Viertel fallen (Schwelle 26–27 gesichert im „Nachtrag: Verhalten der Nahkämpfer“, Tabelle D; hier auch nach 25). Alle drei Messungen setzen die LP in einem Schritt (M 27, V 26, T 25) und unterschreiten dabei auch die Hälfte; die 2 EDDY im selben Frame gehören deshalb vermutlich zur Welle der Hälfte (EDDY 4 und 5); welche Gegner allein beim Viertel kommen, können diese Läufe nicht trennen (Lesart beim Prüfen). Ein zweiter Raketen-DICK erscheint 39–40 Frames, nachdem höchstens 4 Gegnerslots (0–19, DOLG mitgezählt) belegt sind (sind es mit der Welle schon höchstens 4, 39–40 Frames nach ihr), wenn dann Rang ≥ 16 gilt; maßgeblich ist der Rang nach der Wartezeit, nicht beim Freiwerden (`t_z15_f`); bei Rang ≤ 15 nie, auch nicht mit nur 2 Gegnern. M: bei Rang 20 (EDDY und Pistolen-DICK entfernt), nicht bei 9. V: bei 17 und 18 (ohne Pistolen-DICK, EDDY leben, 4 Gegner; `zweit_e17`, `zweit_e18`) und bei 22 (`z_r22`: EDDY in Frame 202 entfernt, DICK in 241), nicht bei 9 und 12, nicht bei 20 und 22, solange Pistolen-DICK und beide EDDY leben (`zweit_e20`, `zweit_e22`), und nicht bei 17, 18, 20 mit beiden Arena-WOOKY (`zweit_a*`). T (Rang 9, 12, 14–24, je vier Varianten): 9–15 nie, 16–19 immer (4 bzw. 2 Gegner), 20–24 mit 2–4 belegten Gegnerslots ja, mit 5 nein; wird dann ein Slot frei, kommt er 39 Frames später (`t_z22_e`: EDDY in 260 entfernt, DICK in 299; `t_z22_f`: Pistolen-DICK in 185 entfernt, DICK in 224); maßgeblich ist der Rang in diesem Moment (`t_z15_f`: 15 → 20 in Frame 160, DICK in 190; `t_z20_f`: 20 → 9, keiner) | M `a_r*`, `a_z*`, `F erscheinen`; V `zweit_e9..22`, `zweit_a17..20`, `z_r22`, `z_r12`, `r_r17`; T `T welle` (`t_z9_*` … `t_z24_*`) | gesichert (3. Messung) |
| Gehen | Vektor mit 1,75 px/Frame in x und 0,875 px/Frame in der Tiefe (Ellipse, z. B. 1,6133/0,332 oder 0,3398/0,8555), zeitweise 2,25/1,125. Weg von der Figur geht er rückwärts mit Blick zu ihr (M 99 % der Frames, V 98,8 %, je DICK 97,6–99,6 %) | M `A abstand`; V `dick_gehen` (14 DICK) | gesichert |
| Bedingung für schnelles Gehen (2,25/1,125) | nicht bestimmt | M `A abstand`; V `dick_gehen` | offen |
| Abstand beim Schuss | Er geht nur zum Schießen auf 112–136 px (siehe Auslösung); die README-Angabe „hält Abstand 100–140 px“ gilt nur für die Schüsse | M `A abstand`; V `dick_abstand`; T `T abstand` | gesichert |
| Abstand sonst (Anteile der Frames, Figur steht frei) | schwanken stark je DICK: 100–139 px M 38 %, V 28–61 %, T 25–54 %; näher als 20 px M 20 %, V 6–35 %, T 13–43 %; ab 140 px M 6 %, V 0–10 %, T 1–10 % (`t_p7` hat dieselbe Verteilung wie `a_p9`, siehe Rhythmus der Pistole) | M `A abstand`; V `dick_abstand`; T `T abstand` | unsicher |
| Rückzug | Geht die Figur auf ihn zu, weicht er nicht gezielt aus, er setzt sein Vorhaben fort (Zielpunkt, Pose, Stehen, Angriff). Frames, in denen sie auf ihn zugeht (er bleibt in x / weicht zurück / kommt näher): M 393 (217 / 141 / 35), V 246 (101 / 145 / 0), T 507 (156 / 267 / 83) bzw. 122 (31 / 90 / 1) | M `A abstand` (`a_pg9`); V `dick_annaeherung` (`p_mov`); T `T abstand` (`t_ph14`, `t_r22h`) | unsicher |
| Pose (Aktion 2) | `686C4` (10, gehalten bis 120 Frames), `686FE`, `68730`, `68760` (je 8), `6878E` (7), `687B8` (1), dann Stehen (V: `67760`). Dauer M 30, 42, 60, 74, 90 oder 120 Frames; V: Aktion 2 dauert 30, 60, 90 oder 120, die Bildfolge einmal oder zweimal gespielt 42 bzw. 74. An jedem Abstand (V 0–229 px, oft direkt neben der Figur), danach Gehen. Kein Angriff, keine Vorbereitung eines Schusses; die README nennt sie „Zielen 60–120“ | M `A angriffe` (Art „Haltung“, 368-mal); V `dick_pose`, `dick_pose_folge` (318 Posen) | gesichert |
| Mehrere DICK | schießen selten gleichzeitig: M 3 überlappende bei 70 Angriffen in 4 Läufen mit 2–3 DICK, V 9 bei 113 in 5 Läufen | M `a_z9`, `a_z20`, `a_rf20`, `a_gd`; V `mehrere_dick` (`z_r22` 6 von 39, `z_r12` 2 von 24, `g_r12` 1 von 14) | gesichert |

### Waffe des DICK beim Tod

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Pistolen-DICK | Die gehaltene Waffe fliegt nach dem tödlichen Treffer t im Bogen (2 px/Frame in x) bis 61–62 px über die Höhe, die der DICK in t hat (Nachkomma der Starthöhe), landet in t+34 (DICK 12–24 px hoch: t+36 bis t+38) und wird 10 Frames nach der Landung zum Gegenstand: GUN (Art 0x00) mit 5 Schuss, Liegezeit 700, unabhängig von den verschossenen Kugeln (M 0, 4, 8, 11; V 0, 0, 4, 13, 15). M (`E Bogen`): neunmal DICK am Boden, Bogen 61, Gegenstand t+44 (auch bei Haltehöhe 56 in der Schusspose, `e_p9_4`), `e_p20_11` DICK 16 px hoch, Bogen 77, Gegenstand t+47. V: bis 62 px (4-mal), Gegenstand nach 44 Frames, einmal 78 px und 47 Frames (`e_p0`). T: DICK 0/12/24 px hoch: höchster Punkt 61/73/85, Landung t+34/36/38, Gegenstand t+44/46/48; Nachlauf `e_p0`: DICK 16 px hoch (Trefferreaktion), 78, Landung t+37, Gegenstand t+47 | M `e_p9_0`, `e_p9_4`, `e_p20_0`, `e_p20_8`, `e_p20_11`, `E Bogen`; V `tod` (`e_p0`, `e_p0b`, `e_p4`, `e_p13`, `e_p15`); T `T bogen` (`t_e_h0`, `t_e_h12`, `t_e_h24`, `t_v7e_p0`) | gesichert (3. Messung) |
| Raketen-DICK | ebenso Raketenwerfer (MISSILE, Art 0x08) mit 3 Schuss, unabhängig von 0, 1 oder 2 (M) bzw. 0, 1, 6 (V) verschossenen Raketen; V: Bogen bis 61 px, Gegenstand nach 44 Frames, Liegezeit 700. T: DICK 20 px hoch, höchster Punkt 81, Landung t+37, Gegenstand t+48 (11 Frames nach der Landung) | M `e_r9_0`, `e_r9_1`, `e_r20_0`, `e_r20_1`, `e_r20_2`, `E Bogen`; V `tod` (`e_r0`, `e_r1b`, `e_r6`); T `T bogen` (`t_e_r0h`) | gesichert |

Unsicher (alle Werte; „dritte Messung“ nur, wo es eine gab):

- Rate des Messerwurfs: M 0,83 bzw. 0,58 Würfe je 1000 Frames (Abstände
  247–3251), V je Lauf 0,12–1,5 (206–2860), dritte Messung 0,17–0,67
  (365–3903). Keine gemeinsame Regel (Lage, andere Gegner, Umwerfen).
- Rate der Pistolensalven: M 0,82 bzw. 1,57 je 1000 Frames (181–1792),
  V je DICK 0,38–1,76 (218–4090), dritte Messung 0,50–2,34 (82–1745;
  `t_p7` und `t_p24` wiederholen `a_p9` bzw. `a_p20` mit anderem Rang).
- Rate der Raketen (Doppelschüsse mitgezählt; Abstände ohne Doppelschuss):
  M 1,27 bzw. 1,42 (219–2632), V 1,03–2,05 (207–2204), dritte Messung
  1,03–2,39 (204–1949).
- Abstand des DICK außerhalb der Schüsse (Anteile der Frames bei 100–139 /
  unter 20 / ab 140 px): M 38 / 20 / 6 %, V je DICK 28–61 / 6–35 / 0–10 %,
  dritte Messung 25–54 / 13–43 / 1–10 %. Gesichert ist nur 112–136 px beim
  Schuss.
- Rückzug des DICK vor einer herankommenden Figur (Frames gesamt: bleibt /
  zurück / näher): M 393: 217 / 141 / 35, V 246: 101 / 145 / 0, dritte
  Messung 507: 156 / 267 / 83 (`t_ph14`) und 122: 31 / 90 / 1 (`t_r22h`).
  Gemeinsam nur: kein gezieltes Ausweichen.
- Anteil der Doppelschüsse des Raketen-DICK: M 8 von 74, V 2 von 76, dritte
  Messung 2 von 108 (die Regel, wann er möglich ist, ist gesichert).
- Explosion bei genau 26 px Höhe der Figur: M 2 von 3 Proben getroffen,
  V 3 von 10 Frames; dritte Messung entfällt.
- Messer am rechten Bildrand: M nicht gemessen; V letzte Lage 402 (18 px
  rechts vom Bild) nach 77 Frames, Figur per Eingriff 75 px hoch; dritte
  Messung entfällt.
- Stichabstände des SKIP zwischen zwei Serien und an einer Begrenzung
  (Lesart beim Prüfen, von keinem Agenten ausgewertet): zwischen Serien
  M 46–51, V 46–51, dritte Messung 47–53 Frames; an einer Begrenzung
  mehrere Stiche hintereinander, M kein Fall, V 30–43 (`s_r12`, 6 Stiche
  bei d 2), dritte Messung 30–39 (`t_sr1560`, 8 Stiche bei d 43, in
  `T rhythmus` als Serie von 8 gezählt).
- Nur beim Gegenprüfer (ohne eigene Zeile): Funke an Glas und Fass
  `95B06`, `95B20`, `95B3E` (9 Frames); die Explosion zerbricht Glas auch
  67 px vom Einschlag; 2–21 % der Gehframes des DICK sind Übergänge mit
  kleinerem Tempo; Tiefenangleich 25 und 38 Frames, wenn die Figur auf den
  DICK zugeht.
- Methode: Die Höhenproben setzen die Figur in die Luft (Aktion Sprung), die
  Grenze 59/60 gilt für eine springende Figur. Der Schlag gegen das Messer
  ist nur mit Blick zum SKIP geprüft.

Offen:

- Regel, wann eine Salve zwei normale Kugeln nacheinander enthält.
- Wovon das Salvenbudget S+0xAB abhängt (Zufall oder Rang) und ob es mehr
  als 120 Frames gibt.
- Genaue Abbruchgrenze der Salve in x (zwischen d 167 und 188) und in der
  Tiefe.
- Auslösung des Messerwurfs bei versperrtem Weg (beobachtet: Wurf, wenn die
  Tiefe bis auf 5–6 px heran ist und x nicht mehr wächst) und Form der Sperre
  bei x ≈ 1006–1052 in Tiefe 320–345 (Bereich der Glasscheibe).
- Reihenfolge, in der Kugel und Rakete die Slots 27–29 vergeben.
- Bedingung für das schnelle Gehen des DICK (2,25 px/Frame).
- Warum der Pistolen-DICK bei Rang 16–19 ausbleibt (gemessen, nicht
  erklärt; gehört zu den Wellen der Bossarena).
- Ob eine Sperre gleichzeitige Schüsse mehrerer DICK verhindert.
- Messer gegen Wände (in Stage 1 keine im Bereich des SKIP), DICK-Geschosse
  gegen Ölfässer (in der Bossarena keine), Geschosse im Schutz nach dem
  Aufstehen (nicht gemessen).
- Andere Stages: Pistole, M-GUN und Raketen der DICK in Stage 4–8, Messer
  der SKIP in Stage 2, 3, 9.

Abgleich mit älteren Abschnitten:

- `grafik/README.md`, DICK: „Salven zu 3 Kugeln, 8 px/Frame, 6 LP“:
  gemessen 2–6 und 8 Kugeln (Budget, meist 4–5), 8 px/Frame bestätigt, 6 LP
  gilt bei Rang 15–21. „Zielen 60–120“ ist die Pose (Aktion 2), kein Zielen.
  „hält Abstand 100–140 px“ gilt nur beim Schießen (112–136). „#1 nach dem
  Tod eines Arena-WOOKY“ (#1 ist der DICK mit Pistole) bestätigt (3 Frames
  danach), aber nur bei Rang 7–15 und 20–24. „Gehen 8×4 (ca. 1,6 px/Frame)“:
  gemessen 1,75 px/Frame in x (Ellipse mit 0,875 in der Tiefe).
- `grafik/README.md`, SKIP: „Messerwurf 4/3/1/1/32, Messer 4 px/Frame
  (10 LP)“ bestätigt (dazu 1 Frame `28B12`; 10 LP bei Rang 7–11).
  „Messerhagel 25 + 12 Pause“ ist die Stichserie.
- „Nachtrag: Schaden der Gegner“, Tabelle (Workflow): geworfenes Messer
  „10 bis 13 je nach Rang (11 bei Rang 12–16, 13 ab 22)“ bestätigt, jetzt
  mit Skript. Pistole „zwei Schüsse im Abstand von 17 Frames, der zweite
  wirft um“, „5 bis 7 je Schuss“: Takt 17 und Wechsel normal/umwerfend
  bestätigt, aber Salven von 1 bis 8 Schüssen und Schaden 4–7 (4 bei
  Rang 7). Raketenwerfer 12–15 bestätigt.
  SKIP-Messerstich „Rang 7: 7, 11: 8, 16: 9, 24: 10 (Stufen bei etwa 9,
  16/17, 23)“: hier Rang 8: 7, 9–15: 8, 16–22: 9, also Stufen bei 9 und 16.
- „Nachtrag: Schaden der Gegner“, Schutz nach Treffer (Workflow: „schützen
  vor Schlägen, nicht vor Geschossen“): für Geschosse jetzt mit Skript
  belegt (Zeile „Schutz nach Treffer“). Damit gilt die gesicherte Zeile
  „nach erlittenem Treffer“ (27 Frames) in mechanik.md, „Unverwundbarkeit“,
  nur gegen Schläge; die Zeile bleibt, mechanik.md bekommt dazu eine Zeile
  „gegen Geschosse“.
- „Nachtrag: Reichweite der Gegnerangriffe“: Die offenen Punkte
  SKIP-Messerwurf und DICK (Tabelle „Weitere Aussagen“, Liste „Offen“) sind
  hier gemessen. Das Ziel ±64 des SKIP in S+0x96 („Gefundene Adressen“,
  Bedeutung bisher unsicher) ist der Zielpunkt der Stich-Auslösung.
  **Widerspruch** zur gesicherten Zeile „SKIP Messerstich“ (dort
  „Aufeinanderfolgende Stiche kommen alle 37 bis 49 Frames (beobachtet 37,
  42, 49)“, gesichert (3. Messung); in mechanik.md „Reichweite der
  Gegnerangriffe“ „aufeinanderfolgende Stiche alle 37 bis 49 Frames“):
  Innerhalb einer Serie sind es hier immer 37 Frames (M 84 von 84, V 133
  von 133). Zwischen zwei Serien zeigen die Belege dieser Messung auch 51
  und 53 Frames, an einer Begrenzung 30 bis 43 (Zeile „Stichabstände
  zwischen Serien und an einer Begrenzung“, unsicher). Die Spanne 37–49 ist
  damit zu eng; mechanik.md bleibt bis zu einer Prüfung unverändert.
- „Nachtrag: Gegenstände und Waffen“, Zeile „Waffe eines besiegten DICK“
  (unsicher, ein Fall: unteres Typwort `0xA988`, Raketenwerfer mit 3 Schuss)
  und die Zeile S+0x3A unter „Objekte in Slot 20–59“: jetzt gesichert, Typ
  `0x9A988`, GUN mit 5 bzw. Raketenwerfer mit 3 Schuss (Tabelle „Waffe des
  DICK beim Tod“). mechanik.md „Waffen je Art“: GUN 5 Schuss bestätigt; die
  Waffe des Raketen-DICK hat 3 Schuss wie die Raketenwerfer aus Behältern.
- „Gefundene Adressen“, Gegner S+0x40 (DOLG: „DICK bei etwa einem Viertel
  (ausgelöst bei 26–27)“) und „Nachtrag: Verhalten der Nahkämpfer“,
  Tabelle D, Zeile „DICK (zwei)“ (gesichert: „Der zweite 40 F nach dem
  ersten“): Der Raketen-DICK kam auch nach einem Eingriff auf 25 (dritte
  Messung). **Einschränkung** der gesicherten Zeile: Einen zweiten
  Raketen-DICK gibt es nur ab Rang 16 und bei höchstens 4 belegten
  Gegnerslots (Zeile „Erscheinen Raketen-DICK“); die Bot-Läufe jener
  Messung erfüllten das vermutlich (später Rang). Ob beim Viertel außer dem
  DICK weitere Gegner kommen, können die Fern-Läufe nicht zeigen (LP in
  einem Schritt unter die Hälfte und das Viertel).
- „Nachtrag: Boss“, Tabelle F, Zeile „Viertel der LP“ (zweiter DICK 40
  Frames später nur ab Rang 16 und nur, wenn dann höchstens drei andere
  Gegner leben): stimmt mit der Zeile „Erscheinen Raketen-DICK“ überein
  (höchstens 4 belegte Gegnerslots samt DOLG, also höchstens drei andere
  Gegner). Hier kommt hinzu, dass er 39 Frames nach dem Freiwerden eines
  Slots doch noch erscheint (`t_z22_e`, `t_z22_f`); die Zeile verweist jetzt
  darauf. Den dortigen offenen Punkt „Zweiter DICK bei Rang 13 und 14“
  (Tabelle F und Liste „Offen“) beantwortet `T welle` für Rang 14: kein
  zweiter Raketen-DICK, auch mit nur 2 belegten Gegnerslots (`t_z14_a` bis
  `t_z14_d`). Rang 13 ist nicht gemessen und bleibt dort offen.

## Nachtrag: Rest der Spielfigur

Belege: `logs/rest.csv` (Messagent M8, Teile A–F, am Ende die dritte Messung
Teil M3 als eigene Gruppe; 2617 Zeilen) und `logs/rest_v.csv` (Gegenprüfer
V8, Teil V; 1861 Zeilen), beide erzeugt von `scripts/belege_rest.sh`.
Szenarien des Messagenten und der dritten Messung: `scenarios/rest_kette.lua`
(Kette mit Folgeeingaben relativ zu D), `scenarios/rest_sprung.lua`
(Sprungangriff mit Einzelframe-Proben), `scenarios/rest_frei.lua` (freie
Eingaben oder Hülle um `hurt*.lua`); Teil E mit dem Durchlauf-Bot
(`grafik/bot.sh`, `grafik/durchlauf.lua`). Gegenprüfer:
`scenarios/rest_v_frei.lua` (nur Watch-Protokoll) und
`scenarios/rest_v_bot.lua` (Konfiguration für `grafik/bot.lua`). Auswertung:
`scripts/messen_rest.py` (13 Unterbefehle) bzw. `scripts/messen_rest_v.py`
(`belege`). Laut den Aufrufen in `belege_rest.sh` sind es 3066 MAME-Läufe:
Messagent 2221 (A 1234, B 675, C 10, D 50, E 2 und 5 Bot-Läufe, F 245),
dritte Messung 201 (D1 23, D4 24, F1 154), Gegenprüfer 644 (641 und 3
Bot-Läufe). Der Gesamtlauf mit allen Teilen lief von vorn in 28 min 48 s mit
Exit 0 (PAR 3, Rechner von anderen Agenten mitbelegt). Reproduzierbar: Den
Stand des Messagenten vor der dritten Messung (Skript-MD5 `cf09d728…`) hat
der Gegenprüfer von vorn wiederholt (Exit 0 in 1251 s), `logs/rest.csv` war
bitgleich (MD5 `7c4b537127c15678edc3bef80b863031`); mit Teil V von vorn
(1094 s) wieder dieselbe MD5, dazu `logs/rest_v.csv` mit MD5
`793f6f9282995911deb5ddd0b482b688`, bis auf die 16 Ereigniszeilen der
Bot-Läufe zeilengleich mit dem Einzellauf von Teil V (361 s). Die Endfassung
von `logs/rest.csv` mit Teil M3 (MD5 `6b202b9fdd8d460e436cfc593fd05e02`)
stammt aus einem Durchlauf; `logs/rest_v.csv` blieb dabei unverändert. Das
Skript löscht danach `logs/raw/rest_*`; die Savestates `rest_e_r8`,
`rest_e_r24` und `rest_v_e_vor` bleiben.

**Methode.** Der Messagent (M) startet ab `kontakt` (WOOKY, 16 LP, Slot 18)
und `kontakt_b` (EDDY, 30 LP, Slot 17), für Tod und Rang ab `ingame` (Hüllen
um `hurt`, `hurt_b`, `hurt_c`), `stage1` und den Phase-0-Savestates
`p0_s1_s1_cam02048` (Bossarena) und `p0_s1_s2_cam00256` (Stage 2). Er
schreibt je Frame `FFA900`–`FFEA00`, Rang, Stage und Kamera mit. Zeitgrenzen
misst er mit Einzeldrücken Frame für Frame über den ganzen Bereich (Teil A:
35 bzw. 45 Drücke je Gruppe), damit ist auch geprüft, dass frühere Drücke
verworfen werden. Reichweiten messen Einzelframe-Proben; gewertet wird die
ganzzahlige Lage am Frame-Ende. Der Gegenprüfer (V) kannte zuerst nur die
Ergebnistabelle (40 Zeilen). Er misst nur über das Watch-Protokoll, ab
anderen Savestates (`anlauf`, `anlauf_b`, `anlauf_c`, `tiefe_b`, `held0`,
`stage3`, `p0_s1_s1_cam00768`, `p0_s1_s1_cam01281`,
`item_v_b1_s1_cam02016`), mit anderen Druckabständen, Sprungzeiten und
Eingriffen und mit Eingaben relativ zu Ereignissen im selben Lauf (k-ter
LP-Verlust, Erscheinen). Er bestätigte 37 von 40 Zeilen. D1, D4 und F1 wichen
ab, weil er Fälle hatte, die beim Messagenten nicht vorkamen (Tod durch den
Mech, Landung auf einem Ölfass, Gegner hinter der Figur, der zu ihr schaut).
Diese drei hat der Messagent ein drittes Mal gemessen (Teil M3, Präfix
`rest_m3`): 23 Tode, davon 19 an Stellen in Stage 1, 4, 5 und 9 (Savestates
`item_bot1_s1_cam*`, `item_v_b1_s1_cam*`, `greichweite_v_*`, `stage4`,
`stage5`, `stage9`) und 4 an der Stage-1-Wand mit gesetzter Lage, dazu ein
versetztes Ölfass (Slot 43) und Kettenschläge hinter der Figur mit gesetzter
Blickrichtung des Gegners ab `reaktion_w3` (WOOKY) und `tiefe_b` (EDDY).
„gesichert (3. Messung)“ heißt: Nach der Abweichung erklärt eine gemeinsame
Regel die Werte aller drei Messungen.

Bezeichnungen: D = Frame des Kettendrucks der geprüften Stufe, h = Frame, in
dem die LP des Gegners sinken, P = Druck eines Einzelschlags, J = Sprungdruck,
A = Angriffsdruck im Sprung, t = Frame, in dem die LP der Figur unter 0
fallen (in Teil C die des Gegners), z0 = Frame, in dem die LP des Gegners
genau 0 werden, N = Neueinstieg (LP wieder 72), E = Erscheinen (N+1, Höhe
256), L = erster Frame der Landephase nach dem Neueinstieg (Aktion 0x0A,
Unterphase 2). Ein Druck in F wirkt in F+1 (Eingabelatenz). In der
Belegspalte steht M für Läufe `rest_*` in `logs/rest.csv` (Namen ohne
Vorsatz `rest_`, `m3_*` = dritte Messung) und V für Läufe `rest_v_*` in
`logs/rest_v.csv` (ohne Vorsatz `rest_v_`); `w` = WOOKY, `e` = EDDY.

**EINGRIFFE**:

- M, Teil A: `CC_LEER` (Gegner ab dem Treffer der Vorstufe 200 px rechts der
  Figur, die geprüfte Stufe geht ins Leere; Kombostufe und Animation der
  Kette bleiben unverändert); `CC_DX=60`, `CC_FERN=16`, `CC_POKE_BIS=24`
  (Tritt trifft erst im zweiten aktiven Abschnitt).
- M, Teil B und F2: Einzelframe-Proben `CC_FERN_BIS`/`CC_NAH_BIS` (Gegner nur
  im Probeframe am Abstand, sonst 200 px entfernt; er geht im Probeframe vorn
  etwa 2 px heran), `CC_WEG=16` (WOOKY ab `kontakt_b` 300 px entfernt).
- M, Teil C: `CC_ELP` (LP des Gegners so gesetzt, dass ein Treffer genau 0
  ergibt), natürlich gegengeprüft mit `c_nat_w` und `c_nat_e`.
- M, Teil D: `CC_PLP` (LP der Figur in Frame 2 auf 1; der Tod kommt vom
  nächsten Gegnertreffer, der Ablauf danach ist natürlich), `CC_RANG` (Rang
  bis Frame 870 gehalten: `d_rang7`, `d_rang9`, `d_rang24`), `CC_SETZE`
  (Gegner ab L+110 bei dx 40 gehalten: `d_c_schutz`, `d_h_schutz`).
- M, Teil E: Bot (LP der Figur aufgefüllt, LP der Gegner nach 300 bzw. 900
  Frames Stillstand auf 1); `e_r8`, `e_r24`: Rang 8 bzw. 24 und Rangzähler
  `FFF82C` = 3000 in der Bossarena gesetzt.
- M, Teil F: `CC_DX`, `CC_DZ` (F1); Gegner links der Figur mit `CC_VOR_DX`
  (F2; die Figur dreht sich per Eingabe in Frame 2 nach links); `CC_DX=26`,
  `CC_FERN` (`f3a_*`); `CC_SETZE` (F5 `*dx*`: Lage vor dem Gegnerangriff).
- Dritte Messung: `CC_PLP` an allen 23 Todesstellen; `CC_POKE` auf x und
  Tiefe der Figur (`FFA99E`, `FFA9A6`) und `CC_SETZE` für den EDDY an der
  Stage-1-Wand; `CC_POKE` auf x und Tiefe des Ölfasses in Slot 43 (`FFDCDE`,
  `FFDCE6`) ab dem Erscheinen; `CC_GBLICK` (Blickrichtung des Gegners, Bit
  0x20 in S+0x5E) zusammen mit `CC_VOR_DX`, `CC_DX`, `CC_DZ`.
- V: `CC_SETZE` (A-Leerschlag: Gegner 40 px in die Tiefe statt 200 px in x;
  Proben in B, D, F), `CC_GLP` (C: LP und Vorframe-LP unter den Max-LP; ein
  Eingriff, der auch S+0x9A auf 7 setzte, ließ das Spiel beim nächsten Treffer
  stehen), `CC_PLP` bzw. `CC_POKE` auf `FFA9D0`/`FFA9D2` (D: LP der Figur in
  einem Frame auf 4 bzw. 2), `CC_RANG` (D, E: in einem Frame gesetzt, nicht
  gehalten), Bot (LP der Figur aufgefüllt, LP der Gegner nach 900 Frames
  Stillstand auf 1). Jeder Eingriffswert hat einen natürlichen Gegenlauf (A
  und B die natürlichen Treffer bzw. `b_nat_*`, C `c_w_nat`, `c_e_nat`,
  `c_e_tod`, D `d_768`, `d_1281n`, E die Bot-Läufe, F `f3_*`, `f5_*`, `f6_*`).

**Abweichungen und dritte Messung** (Ergebnis in den Tabellen):

- D1 Ablauf des Todes: M sah nach Schlägen t+120 (in `d_hurt_c` t+152,
  Ursache offen), V nach dem Tod durch den Mech t+108. Regel: Der Neueinstieg
  hängt von der Todesart ab (normal, Rollen, Wand, Klinge). Der Mech ist nicht
  die Ursache: Die Figur stand bei V schon an der Abschnittsgrenze, deshalb
  Aktion 8 ab t+3. Alle 23 Tode der dritten Messung passen, ebenso die Werte
  von M und V (bei V auch die letzten Tode t2+107, t2+120 und t2+151).
- D4 Fall und Landung: M sah 52 Frames Fall am Boden, V auf dem Ölfass 49.
  Regel: Die Figur fällt bis auf den Untergrund unter ihr.
- F1 Mindestabstand: M sah Stufe 2 bis 4 bei dx −20 ohne Treffer, V mit
  Treffer. Regel: Die Blickrichtung des Gegners entscheidet; ein Gegner in
  seiner Trefferreaktion dreht sich nicht um.

### A. Nachlauf der Kettenstufen 2 bis 4

M: Folgedrücke 14 (WOOKY, `kontakt`) bzw. 18 Frames (EDDY, `kontakt_b`) nach
dem Treffer der Vorstufe, Gruppen `a_<g>_s<k>_<fall>` mit `t` Treffer, `l`
Leerschlag, `z` Tritt erst im zweiten Fenster. V: ab `anlauf_c` (EDDY,
Folgedrücke h+16, h+13, h+20) und `anlauf` (WOOKY, h+20, h+12, h+15). Beide
Gegner geben in jeder Zeile dieselben Werte.

| Größe | Stufe 2 | Stufe 3 | Stufe 4 (Tritt) | Beleg | Status |
|---|---|---|---|---|---|
| Treffer | h = D+3 | h = D+4 | h = D+3; trifft er erst im zweiten Fenster, D+17 | M `a_*_t_o`, `a_*_s4_z_o`; V `a_{e,w}_s{2,3,4}_t_o`, `a_*_s4_z_o` | gesichert |
| Pose ohne Eingabe nach Treffer | Aktion bis h+26, Ruhe ab h+27 | Aktion bis h+26, Ruhe ab h+27 | Aktion bis D+32 (h+29), Ruhe ab D+33, auch mit Treffer erst im zweiten Fenster | M `a_{w,e}_s{2,3,4}_{t,z}_o`; V `a_*_s{2,3}_t_o`, `a_*_s4_t_o`, `a_*_s4_z_o` | gesichert |
| Angriff nach Treffer | Druck ab h+11 gibt in h+12 Stufe 3 (h+9, h+10 ohne Wirkung) | Druck ab h+11 gibt in h+12 den Tritt | nicht abbrechbar: Druck in D+31, D+32 ohne Wirkung, ab D+33 (Ruhe) neuer Schlag Stufe 1 in D+34 | M `a_*_t_a*`, `a_*_s4_z_a*`; V `a_*_s{2,3}_t_a{9..12}`, `a_*_s4_t_a{31..34}`, `a_*_s4_z_a{32..34}` | gesichert |
| Sprung nach Treffer | Druck ab h+11, Sprung ab h+12 | Druck ab h+11, Sprung ab h+12 | Druck ab D+33, Sprung ab D+34 | M `a_*_t_j*`, `a_*_s4_z_j*`; V `a_*_s{2,3}_t_j{10..12}`, `a_*_s4_t_j{32..34}`, `a_*_s4_z_j{33,34}` | gesichert |
| Laufen zur Seite (gehalten) nach Treffer | Aktion 0 in h+12, Bewegung ab h+13 | Bewegung ab h+13 | Bewegung ab D+34 | M `a_*_t_hl`, `a_*_s4_z_hl`; V `a_*_s{2,3,4}_t_hl` | gesichert |
| Laufen in die Tiefe (gehalten) nach Treffer | bricht die Pose nicht ab: Bewegung erst ab h+28 (Frame nach Beginn der Ruhe) | ab h+28 | ab D+34 | M `a_*_t_hu`; V `a_e_s*_t_hd`, `a_w_s*_t_hu` | gesichert |
| Leerschlag ohne Eingabe | Aktion D+1 bis D+16, Ruhe ab D+17 | D+1 bis D+17, Ruhe ab D+18 | D+1 bis D+25 (beide Fenster leer), Ruhe ab D+26 | M `a_*_l_o`; V `a_*_s{2,3,4}_l_o` | gesichert |
| Leerschlag: Angriff oder Sprung | Druck ab D+7 wirkt in D+8 (D+6 ohne Wirkung); der Angriff beginnt eine neue Kette (Stufe 1) | Druck ab D+8 wirkt in D+9; Stufe 1 | Druck ab D+26 wirkt in D+27; Stufe 1 | M `a_*_l_a*`, `a_*_l_j*`; V `a_*_s*_l_a*`, `a_*_s*_l_j*` | gesichert |
| Leerschlag: Laufen (links, rechts, hoch) | Bewegung ab D+9 | ab D+10 | ab D+27 | M `a_*_l_h{l,r,u}`; V `a_*_s*_l_h{l,r,u}` | gesichert |
| Puffer | keiner: Drücke vor der Freigabe werden verworfen und wirken auch später nicht | wie Stufe 2 | wie Stufe 2 | M alle Sweeps (Spalten `angriff_regel`, `sprung_regel`); V `*_a9`, `*_a10`, `*_j10`, `*_l_a6`, `*_l_a25`, `*_t_a31`, `*_t_a32` | gesichert |

Zusammengefasst: Stufe 2 und 3 sind nach einem Treffer ab dem Kombo-Fenster
frei (Druck ab h+11; Stufe 1: h+12), der Tritt ist nie abbrechbar und dauert
25 Frames plus 7 je Treffer. Neu gegenüber „handlungsfähig ab h+13 (Laufen
oder nächster Schlag)“: Nach einem Treffer bricht bei Stufe 2 und 3 nur
Laufen zur Seite die Schlagpose ab, Laufen in die Tiefe wartet das Posenende
ab. Nach einem Leerschlag bricht jede gemessene Richtung (links, rechts,
hoch) ab. Kontrolle Stufe 1 (M `a_{w,e}_s1_*`, Drücke bis D+20): Die Methode
trifft die bekannten Werte genau (Treffer P+2, Druck ab h+12 wirkt in h+13,
Laufen zur Seite ab h+14, Pose bis h+27, Ruhe ab h+28; Leerschlag: Druck ab
P+7 wirkt in P+8, Bewegung ab P+9, Ruhe ab P+17). Laufen in die Tiefe nach
einem Treffer der Stufe 1 bewegt dort erst ab h+29 (M `a_{w,e}_s1_t_hu`; nur
M, **unsicher**, siehe unten). Ein Angriffsdruck in D+2 ist mit
`rest_kette.lua` nicht prüfbar (der Kettendruck liegt in D und D+1, D+2 ist
keine neue Kante).

### B. Sprungangriff hoch und runter

M: J = 4 ab `kontakt` (Probe bei dx 30) und J = 3 ab `kontakt_b` (dx 25),
Fenster bei A = J+1 bis J+33 (hoch) bzw. J+1 bis J+28 (runter). V: J = 10 ab
`anlauf_b` (WOOKY), J = 12 ab `tiefe_b` (EDDY), Probeframe F = A+m;
natürliche Läufe `b_nat_*` ab `anlauf_c` und `anlauf_b`. Hoch heißt hoch im
Frame des Sprungdrucks, runter heißt runter mit dem Angriffsdruck.

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Auslöser | hoch: hoch im Frame des Sprungdrucks (senkrechter Sprung); hoch nur mit dem Angriff gibt den neutralen Tritt (7 LP, wie in „Nachtrag: Sprungangriff“). Runter: runter mit dem Angriffsdruck, auch beim Sprung mit Richtung (4 LP, kein Umwerfen) | M `b_nat_*` (Richtung und runter: `b_nat_w_richtungrunter_a20`); V `b_nat_e_{h,uA,r,rlang,rri}`, `b_nat_w_{h,r,rri}` | gesichert (runter mit Richtung: ein Lauf bei M, zwei bei V) |
| Aktive Frames | hoch: A+7 bis A+10 (4 Frames) bei jedem Angriffszeitpunkt, solange die Figur in der Luft und höchstens 48 px hoch ist (A+5, A+6, A+11, A+12 nie). Runter: A+9 bis A+32, solange die Figur höchstens 41 px hoch ist, steigend wie fallend (A+8, A+33 nie); am Boden nie | M `b_*_hoch_a*`, `b_*_runter_a*`; V `b_*_h{1,6,24}_*`, `b_*_r3_*`, `b_*_r20_*` | gesichert |
| Höhengrenze | hoch trifft bis 48 px, ab 49 nie (M: 49 in A+7 bei A = J+11 und J+19; V: 48 in A+7 bei A = J+10 und in A+9 bei J+18, 49 in A+8, 50 und 51 bei A = J+12 nie). Runter bis 41 px, ab 43 nie (42 kommt im Sprung nicht vor) | M wie oben; V `b_*_h10_*`, `b_*_h18_*`, `b_*_h12_*`, `b_*_r3_11`, `b_*_r3_28`, `b_*_r20_{10,11}` | gesichert |
| x vorn | hoch bis 85 px, ab 86 nie; runter bis 42 px, ab 43 nie | M `b_*_hoch_x*`, `b_*_runter_x*`, `b_w_*_xg*`; V `b_*_h1_8_{84..90}_0_v`, `b_*_h6_9_{85..89}_0_v`, `b_*_r3_9_{41..44}_0_v`, `b_*_r20_18_{42,43}_0_v` | gesichert |
| x hinten | hoch bis 32 px hinter der Figur, ab 33 nie; runter bis 41 px, ab 42 nie; gleich, ob der Gegner vorher vor oder hinter der Figur stand | M wie oben; V `b_*_h1_8_n{31..34}_0_{v,h}`, `b_*_h6_9_n{32,33}_0_h`, `b_*_r3_9_n{40..43}_0_{v,h}`, `b_*_r20_18_n{41,42}_0_h` | gesichert |
| x je Höhe | gleich: hoch in A+7 (40 px) und A+10 (46 px), bei V in 29 px (A+8) und 44 px (A+9); runter in A+11 (41 px) und A+18 (20 px), bei V in 38 px (A+9) und 20 px (A+18) | wie x vorn und hinten | gesichert |
| Tiefe | \|dz\| ≤ 12 px, ab 13 nie, vor wie hinter der Figur, beide Varianten | M `b_*_z*`, `b_w_*_zh*`; V `b_*_h1_8_{40,n20}_*`, `b_*_r3_9_{20,n20}_*` | gesichert |
| Schaden, Umwerfen | hoch 12 LP, wirft um; runter 4 LP, wirft nicht um (WOOKY und EDDY, mit und ohne Eingriff) | M alle Treffer in `b_*`, ohne Eingriff `b_nat_*`; V alle `b_*` | gesichert |
| Ablauf | hoch: Aktion 0x0E bis A+29 (mit Treffer A+36), dann Fallpose (0x0A); landet die Figur vorher, endet die Aktion mit der Landung (J+48 ohne Treffer, J+55 mit). Runter: 0x0E bis zum Ende der Landung, J+48, mit Treffer 7 Frames später (J+55) | M Spalte `aktion0e_bis_rel` in Teil B; V Spalten `akt0E_bis_rel_A`, `akt0A_ab_rel_A`, `ende_rel_J` | gesichert |
| Reichweite gegen einen Gegner in seinem Angriff (runter) | M: runter traf den EDDY in seinem eigenen Schlag (Frame 44 ab `kontakt_b`) bei dx 46, also weiter als die 42 px gegen gehende Gegner; V nicht gemessen | M `b_nat_e_runter_a18`, `b_nat_e_runter_a22` | unsicher |
| Eingabevarianten, die nur V gemessen hat | V: hoch und rechts zugleich im Sprungdruck gibt den Tritt mit Richtung (7 LP), nicht hoch; runter nur im Sprungdruck gibt den neutralen Tritt (7 LP); hoch vor dem Sprungdruck gedrückt und darüber gehalten gibt hoch (12 LP). M nicht gemessen (hoch nur im Frame des Sprungdrucks) | V `b_nat_e_hdiag`, `b_nat_e_dJ`, `b_nat_e_hlang` | unsicher |

Alle Proben beider Agenten liefen gegen gehende oder stehende Gegner; dass
die Trefferfläche des Gegners von seiner Pose abhängt, ist schon aus
„Nachtrag: Sprungangriff“ bekannt.

### C. Gegner mit genau 0 LP

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Treffer, der die LP genau auf 0 senkt | Der Gegner stirbt nicht: normale Trefferreaktion (h bis h+22, frei ab h+23; Stufe 1 bis 3) bzw. Umwerfen, Liegen und Aufstehen (Tritt, Sprungangriff; V frei ab z0+89 bzw. z0+113), danach frei mit 0 LP | M EINGRIFF `c_s1_w`, `c_s1_e`, `c_s2_w`, `c_s3_e`, `c_tritt_w`, `c_tritt_e`; ohne Eingriff `c_nat_w` (3 + 3 + 3 + 7), `c_nat_e` (3 + 4 + 5 + 3 + 4 + 5 + 3 + 3); V `c_w_nat` (3 + 3 + 3 + 3 + 4), `c_e_tod` (3 + 4 + 5 + 3 + 3 + 3 + 4 + 5), `c_e_nat` (3 + 4 + 5 + 3 + 3 + 12), EINGRIFF `c_w_glp`, `c_e_glp` | gesichert |
| Verhalten mit 0 LP | greift weiter an wie mit LP über 0. M: WOOKY dreimal 5 LP, EDDY dreimal 6 LP in rund 200 Frames. V: WOOKY 5 LP in z0+55, +133, +208, genau wie ein WOOKY mit 4 LP nach denselben Treffern; EDDY 6 LP in z0+356 bzw. +417, so selten wie ein EDDY mit 3 LP | M wie oben (Spalte `figur_lp_verluste_durch_ihn`); V `c_w_nat`, `c_w_glp`, `c_e_nat`, `c_e_glp`, Vergleich `c_w_vgl`, `c_e_vgl` | gesichert |
| Tod | erst beim nächsten Treffer (LP unter 0, V: 0 → −3 durch Stufe 1). Ablauf wie in „Trefferreaktion der Gegner“ (Tod): Aktion 2 in t+2, Slot frei in t+79 | M `c_danach_w`, `c_danach_e`; V `c_w_nat` (t = 402), `c_w_glp` (148), `c_e_tod` (242) | gesichert |

Damit gilt für die Gegner dieselbe Regel wie für die Figur: Tod erst unter
0 LP.

### D. Tod und Neueinstieg der Figur

M ohne Eingriff: `d_hurt`, `d_hurt_b`, `d_hurt_c` (verlängert, die Figur ist
passiv und stirbt zweimal); mit EINGRIFF `CC_PLP`: Bossarena (`d_boss`),
Stage-Anfang (`d_anfang`), Rang gehalten (`d_rang*`). Eingaben: Richtung ab
t+4 gehalten, einzelne Drücke in L−1 bis L+7 (`d_c_*` ab `hurt_c`, `d_h_*`
ab `hurt`). V ohne Eingriff: `d_768` (SKIP, zwei Tode), `d_1281n` (Mech, zwei
Tode); mit EINGRIFF LP auf 4: `d_e`, `d_tb`, `d_boss`, `d_1281`, `d_1281b`.

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Ablauf des Todes (D1) | Flug ab t+2 (Aktion 2), Bodenkontakt t+40. N hängt von der Todesart ab. **Normal**: Aktion 4, 6, 0x0A ab t+40, t+49, t+59, N = t+120 (t+121, wenn der Rückprall einen Frame länger dauert). **Rollen**: Zeigt die Figur in t die Reaktion 4 (Treffer von vorn mit Attribut-Bit 0x0400, etwa `440C`), rollt sie nach dem Bodenkontakt 32 Frames mit 2 px/Frame weiter, N = t+151 bzw. t+152. **Wand**: Endet der Flug vor t+40 an einer Begrenzung der Stage oder des Abschnitts (diagonale Stage-1-Wand; Abschnittsgrenze vor dem Mech bei x = Kamera-Endwert + 200, bei stehender Kamera Bildschirm-x 200; Anfang von Stage 4), folgt ab dort Aktion 8 und ein senkrechter Fall, Bodenkontakt t+40 mit Aktion 6, 0x0A ab t+47, N = t+108. **Klinge**: Treffer mit Attribut-Bit 0x8000 (Messerstich `8402` und Ausfallstich `8A02` des SKIP, Gegner in Stage 5 `8002`; nicht das geworfene Messer, siehe „Gefundene Adressen“, Gegner S+0x24) geben einen eigenen Ablauf (Aktion 2, 4, 6, 8, 0x0A, 0x0C ab t+2, t+3, t+11, t+39, t+49, t+87), N = t+107; die Flugweite ist nicht einheitlich (unsicher, siehe unten). Die Bildkanten (Bildschirm-x 24 und 360) zählen nicht als Wand | M Spalte `aktionen_rel_t` aller `d_*` (t+120 in allen Toden außer denen ab `hurt_c`: t+152 in `d_hurt_c` zweimal und in den Eingabeläufen `d_c_*` beim selben ersten Tod); V `d_e`, `d_tb`, `d_boss`, `d_768`, `d_e2`, `d_e_r8`, `d_e_r22` (t+120), Mech `d_1281`, `d_1281b`, `d_1281n` (Aktion 8 ab t+3, t+108); dritte Messung 23 Tode `m3_d1_*` (`messen_rest.py todesart`): normal sieben, Rollen fünf (z. B. `m3_d1_item_bot1_s1_cam00832`, auch an den Bildkanten: `m3_d1_greichweite_v_eb_l`, `_wc_r`), Wand sechs (`m3_d1_wand_930_340` Stopp in t+33, `_960_340` in t+22, in Tiefe 320 ohne Wand t+120; vor dem Mech `m3_d1_item_bot1_s1_cam01408` Stopp in t+9 bei Bildschirm-x 200, `_cam01344` in t+26 bei 209,5 (Kamera noch nicht am Endwert), `m3_d1_item_v_b1_s1_cam01440` in t+37 nach einem WOOKY-Schlag `400C`, ohne Mech; `m3_d1_stage4` Stopp in t+3), Klinge fünf (SKIP `8402`, `8A02`, Stage-5-Gegner `8002`) | gesichert (3. Messung) |
| Neueinstieg | in N (t+120, je nach Todesart t+107, t+108, t+151/152): LP 72, Leben −1, Rang −3 | M `d_hurt`, `d_hurt_b`, `d_hurt_c`, `d_boss`, `d_anfang`; V Feld `lp_leben_rang_in_N` aller `d_*` | gesichert |
| Position | in E = N+1: x = Kamera-x + 64, Tiefe = Kamera-y + 48, Höhe 256, Blick rechts, an jeder Stelle (M Kamera-x 465, 849, 850, 2128; V 575, 618, 768, 1412, 2048) | M Spalten `x_minus_kx`, `z_minus_ky`; V Feld `lage_E` | gesichert |
| Fall und Landung (D4) | Die Figur fällt ab E bis auf den Untergrund unter ihr: Boden (Höhe 0) nach 52 Frames (L = E+52, nach normalem Tod t+173), Oberkante eines Ölfasses (Höhe 48) nach 49 Frames (L = E+49, an der Mech-Stelle t+158). Das Fass trägt sie, wenn es 1 bis 16 px weiter hinten liegt (Tiefe des Fasses um 1 bis 16 größer als die der Figur) und höchstens 35 px links bzw. 36 px rechts von ihr steht (dz 0, 17 und 20 sowie dx −36 bis −40 und +37 bis +40: Boden; geprüft dz 0 bis 20 bei dx 0 und dx −40 bis +40 bei dz 8, ein Fass vor der Figur nicht). Landung 6 Frames (L bis L+5), Stand ab L+6; alle Zeiten danach gelten ab L | M Spalten `landung_rel_t`, `landung_rel_erscheinen`, `hoehe_L`, `stand_rel_t` (Boden, 8 Tode an 5 Orten); V `d_e`, `d_tb`, `d_boss`, `d_768` (Boden), `d_1281`, `d_1281b`, `d_1281n` (Fass 44 bei x 1480, Feld `hoehe_in_L` 48); dritte Messung natürlich auf Fass 44 `m3_d1_item_bot1_s1_cam01344`, `_cam01408` (Erscheinen bei x 1476 bzw. 1489), EINGRIFF Fass 43 `m3_d4_fass_<dx>_<dz>` | gesichert (3. Messung) |
| Steuerbar | Im Fall wirkt keine Eingabe. Angriff: Druck ab L+6, Schlag ab L+7 (Drücke in L−1 bis L+5 verworfen). Sprung: Druck in L bis L+4 startet im nächsten Frame einen neuen Sprung (Absprung L+2 bzw. L+6), in L−1 und L+5 geht er verloren, ab L+6 normal (Sprung ab L+7, Absprung L+8). Gehaltene Richtung (seitlich und Tiefe) bewegt ab L+7 | M `d_{c,h}_{a,j}*`, `d_{c,h}_h{r,u}`; V `d_{e,tb}_a{20,51,52,56..59}`, `d_{e,tb}_j{30,51,52,56..59}`, `d_{e,tb}_h{r,l,u,d}` | gesichert |
| Schutz | S+4 = 3 von E bis L+199; Timer `FFAA69` steht in L auf 200 und erreicht 0 in L+200 (auch bei L = E+49), dann S+4 = 1. Bei Landung auf dem Boden zusammen 252 Frames ab E (≈ 4,2 s), davon 200 nach der Landung (≈ 3,4 s). Gegnerangriffe in dieser Zeit bleiben ohne Wirkung (M gesehen in L−34 bis L+170, V in L+129 bei dx 42); der erste LP-Verlust kam nie vor L+200 (M L+211, 212, 260, 280, 327; V L+227, 248, 314, 472, 517, 543; in den Läufen der dritten Messung zweimal genau L+200, `m3_d1_greichweite_v_sm_r` und `_wk2_r`, danach Status 3 der Trefferreaktion bis L+226) | M Spalten `status3_bis_rel_L`, `t69_*`, `gegnerangriffe_im_schutz`, `naechster_lp_verlust_rel_L`; EINGRIFF `d_h_schutz` (WOOKY ab L+110 bei dx 40: Angriff in L+141 ohne Wirkung, erster LP-Verlust L+211; in `d_c_schutz` griff der festgehaltene Gegner nicht an); V Felder `status3_von_bis_rel_L`, `t69_*`, EINGRIFF `d_e_schutz` (EDDY E+92 bis E+312 bei dx 45) | gesichert |
| Landung trifft alle Gegner im Bild | In L verliert jeder aktive Gegner im Bild LP und wird umgeworfen, unabhängig vom Abstand: WOOKY, EDDY und SKIP 5 LP, DOLG 10 LP (M dx −64 bis 221, SKIP bei 101 in `d_hurt_c`, dz −22 bis 29; V dx 18 bis 187, DOLG bei 204, SKIP bei 87, dz −19 bis 46). Ein noch wartender Gegner (S+4 = 2) bleibt unberührt (M EDDY in `d_anfang`, V WOOKY bei dx 321) | M Spalte `gegner_in_L`; V `d_e`, `d_tb`, `d_boss`, `d_768` (Feld `gegner_in_L`) | gesichert (DOLG: je ein Lauf bei M und V) |
| Rang | −3 in N: M 12 → 9 (dreimal), 16 → 13, 10 → 7; V 11 → 8, 17 → 14, 13 → 10. Untergrenze 7: M 9 → 7 und 7 → 7 (EINGRIFF), V 9 → 7 (EINGRIFF Rang 8 in Frame 60, natürlich auf 9 gestiegen); oben M 24 → 21, V 23 → 20 (EINGRIFF). Auch der letzte Tod ohne Neueinstieg senkt ihn um 3 (M 10 → 7, 12 → 9, 11 → 8, 14 → 11; V 10 → 7, 13 → 10, 9 → 7 in t2+107, t2+120 bzw. t2+151) | M Spalten `rang_*`, EINGRIFF `d_rang7`, `d_rang9`, `d_rang24`; V alle `d_*`, EINGRIFF `d_e_r8`, `d_e_r22`, Feld `t2_rangwechsel_rel_t2` in `d_768`, `d_1281n`, `d_e2` | gesichert |
| Leben | `FFAA7C` (P+0xEC) steht bei Spielbeginn auf 2 (DIP „Lives“, Standard 2 laut `-listxml`), nach dem ersten Tod auf 1, nach dem zweiten auf 0. Der zweite Tod führt zu keinem Neueinstieg (Spielende) | M Spalte `leben`; V `d_768`, `d_1281n` (ohne Eingriff), EINGRIFF `d_e2` (LP 2 in E+300) | gesichert |
| Gegner während Tod und Fall | In allen Toden von M (Teil D) und V beginnt zwischen t+1 und E kein Gegner einen Angriff; sie gehen, spotten, warten oder stehen in Kampfhaltung (Aktion 0, 2, 4, 6). Im Fall und danach greifen sie an, ohne Wirkung (siehe Schutz). Zwei Läufe der dritten Messung zeigen Ausnahmen (unsicher, siehe unten) | M Spalten `gegneraktionen_bis_erscheinen`, `gegnerangriffe_bis_erscheinen`; V Felder `gegnerangriffe_t+1_bis_E`, `gegneraktionen_t+1_bis_E` | gesichert (für die Läufe von M und V) |
| Gegner während Tod und Fall, Ausnahmen | M und V: in keinem Tod ein Angriffsbeginn zwischen t+1 und E. Dritte Messung (Spalte `gegnerangriffe_bis_erscheinen`, für D10 nicht ausgewertet): `m3_d1_greichweite_v_sw_r` t+4 S18 (der SKIP, dessen Ausfallstich `8A02` die Figur tötete), `m3_d1_stage9` t+17 S17 (Gegner aus Stage 9); Ursache nicht geklärt (beim SKIP vielleicht das Wirbel-Attribut, das in jedem Animationsschritt neu einsetzt) | M3 wie links | unsicher |
| Timer `FFAA69` vor der Landung | V: steht schon ab E auf 200 und nimmt ab L+1 ab; M hat nur den Wert in L ausgewertet (200) | V Felder `t69_200_ab_rel_L`, `t69_erste_abnahme_rel_L`; M Spalte `t69_start` | unsicher |
| Landung auf dem Mech | V: Die Landung an der Mech-Stelle trifft den Mech (−5 LP in L) und wirft den Reiter (WOOKY, Slot 16) ab (−5 LP in L+1, Aktion 0x0C). M nicht gemessen. Dritte Messung (Landungen dort in `m3_d1_item_bot1_s1_cam01344`, `_cam01408`) dafür nicht ausgewertet; ihre Spalte `gegner_in_L` zeigt nur, dass der Reiter in L noch keine LP verliert (passt zu V), Mech (Slot 59) und L+1 wertet sie nicht aus | V `d_1281`, `d_1281b`, `d_1281n` | unsicher |
| Abschnittsgrenze vor dem Mech für die gehende Figur | dritte Messung: Eine Erkundung außerhalb des Belegs zeigt, dass auch die gehende Figur bei Bildschirm-x 200 stehen bleibt; M (erste Messung) und V nicht gemessen | kein Lauf im Belegskript | unsicher |
| Flugweite beim Tod durch eine Klinge | nur dritte Messung (Spalte `flug_x`, Weg in x von t bis t+39): 62,375 px dreimal (SKIP, `m3_d1_item_bot1_s1_cam00768`, `_cam00960`, `m3_d1_greichweite_v_sm_r`), 171,625 px in Stage 5 (`m3_d1_stage5`), 0 px beim SKIP, dessen Opfer in t+3 an der Bildkante 360 stoppt (`m3_d1_greichweite_v_sw_r`). M hatte keinen Klingentod, V hat beim Klingentod nur N = t2+107 ausgewertet | M3 wie links | unsicher |
| Schutz nach dem Neueinstieg in anderen Stages | M und V nur Stage 1. Dritte Messung (für den Schutz nicht ausgewertet): in Stage 4, 5 und 9 ebenfalls Status 3 bis L+199, Timer `FFAA69` 200 in L und 0 in L+200 (`m3_d1_stage4`, `_stage5`, `_stage9`, Spalten `status3_bis_rel_L`, `t69_*`) | M3 wie links | unsicher |
| Tod mit zwei Sonderfällen zugleich (Klinge oder Rollen an einer Wand) | kam nicht vor; welche Regel dann gilt, ist offen | – | offen |
| Weitere tragende Untergründe | andere als das Ölfass (andere Stages) nicht gesucht; ein Fass vor der Figur (Tiefe kleiner) nicht geprüft | – | offen |
| Landung gegen schwache und ferne Gegner | ob die Landung Gegner mit 5 LP oder weniger tötet und ob sie Gegner außerhalb des Bildes trifft, nicht gemessen | – | offen |
| Schutz nach dem Neueinstieg bei anderen Figuren | nur Captain Commando gemessen | – | offen |

### E. Rang beim Stage-Wechsel

M: Bot (`grafik/bot.lua` mit `durchlauf.lua`) bis zur nächsten Stage, dazu
EINGRIFF Rang 8 bzw. 24 und Rangzähler 3000 in der Bossarena (`e_r8`,
`e_r24`). V: Bot mit `rest_v_bot.lua` ab `item_v_b1_s1_cam02016`, `stage3`
und `held0` (Mack), dazu ab dem Savestate `rest_v_e_vor` (Bossarena kurz vor
dem Wechsel) ohne und mit Rang-Eingriff in Frame 2 (Wechsel in Frame 70).

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Rang beim Stage-Wechsel | −3 genau im Frame, in dem der Stage-Index `FFA8CE` wechselt. M: Stage 1 → 2 17 → 14 (ab Bossarena) und 18 → 15 (ganze Stage 1), Stage 2 → 3 24 → 21; V: Stage 1 → 2 19 → 16 (Frame 2020), Stage 3 → 4 23 → 20 (9899), Mack Stage 1 → 2 20 → 17 (6748). Untergrenze 7: M 8 → 7, V 7 → 7, 8 → 7, 10 → 7; oben M 24 → 21, V 22 → 19 (jeweils EINGRIFF) | M `e_boss`, `e_s1`, `e_s2`, EINGRIFF `e_r8`, `e_r24`; V Bot `e_boss`, `e_s3`, `e_h0`, `e_vor_nat`, EINGRIFF `e_vor_r{7,8,10,22}` | gesichert |
| Rangzähler | `FFF82C` bleibt beim Wechsel unverändert (M 84, 365, 600, 2237, 3000; V 14, 178, 385) und zählt danach weiter (V: nächster Anstieg 17 Frames nach dem Wechsel) | wie oben | gesichert |

Die Angabe „Laut Workflow fällt er auch zu Beginn von Stage 2 um 3“ aus
„Nachtrag: Schaden der Gegner“ ist damit bestätigt.

### F. Nachprüfungen

| Größe | Wert | Beleg | Status |
|---|---|---|---|
| Mindestabstand und Reichweite hinter der Figur (F1) | kein Mindestabstand: alle Stufen treffen bei dx 0. Hinter der Figur entscheidet die Blickrichtung des Gegners: Schaut er zur Figur, trifft Stufe 1 bis −28 (−29 nie), Stufe 2 und 3 bis −26 (−27 nie), der Tritt bis −25 (−26 nie); schaut er weg, nur bis −4, −2 bzw. −1 (−5, −3, −2 nie). Ein Gegner in seiner Trefferreaktion dreht sich nicht um; deshalb trafen bei M Stufe 2 bis 4 bei −20 nicht (Kettendruck 14 Frames nach dem Treffer, Gegner schaut weg), bei V mit spätem Kettendruck schon | M `f1_{w,e}_*` (EINGRIFF `CC_DX`, `CC_DZ`); V EINGRIFF `f1_{e,w}_s1_*`, `f1_{e,w}_s{2,3,4}_{0,n20}`, `f1b_{e,w}_s{2,3,4}_n{20..35}`; dritte Messung `m3_f1_*` (Grenzen je Blickrichtung), `m3_f1z_*` (dx −20: in der Reaktion mit Blick zur Figur Treffer, frei mit Blick weg kein Treffer) | gesichert (3. Messung) |
| Reichweite bei Blick nach links | je 1 px kürzer: Stufe 1 ≤ 84 (85 nie), Stufe 2 ≤ 86 (87 nie), Stufe 3 ≤ 90 (91 nie), Tritt ≤ 99 (100 nie); Sprungangriff mit Richtung ≤ 98 (99 nie), neutral ≤ 75 (76 nie) | M `f2_*`, `f2j_*` (EINGRIFF, Sprungangriff in A+5); V EINGRIFF `f2_{e,w}_s{1..4}_*`, `f2j_{e,w}_{ri,ne}_{5,9}_*` (A+5 und A+9) | gesichert |
| Richtung zum Gegner beim Kettendruck | Ausfallschritt mit eigener Animation: Die Figur rückt in D+1 bis D+4 um 8, 6, 4 und 2 px vor (20 px). Treffer erst in D+9 (Stufe 2), D+8 (Stufe 3), D+9 (Tritt), aktiv D+9 bis D+12 (Stufe 3: D+8 bis D+11); Schaden unverändert (4 / 5 / 10), die Kette läuft weiter (Folgedruck gibt die nächste Stufe, nach Stufe 3 den Tritt mit eigener Animation) | M `f3_*_r`, `f3_*_r_a20`, EINGRIFF `f3a_*` (nur WOOKY); V `f3_{e,w}_s{2,3,4}_r`, `f3_*_r_f`, EINGRIFF `f3a_e_s{2,3,4}_{7,8,9,12,13}` | gesichert |
| Richtung weg vom Gegner beim Kettendruck | Die Figur dreht sich in D+1 um und macht denselben Schritt 20 px weg (−8, −6, −4, −2 px), kein Treffer; die Kette ist abgebrochen (Folgedruck in D+16 beginnt mit Stufe 1). Hoch oder runter ändern nichts (normaler Treffer in D+3 / D+4 / D+3, kein Schritt) | M `f3_*_l`, `f3_*_l_a16`, `f3_*_u`, `f3_*_d`; V `f3_*_s*_l`, `f3_*_l_f`, `f3_*_s*_{u,d}` | gesichert |
| Treffer in der Luft werfen immer um | Normale Schläge von WOOKY (5 LP) und EDDY (6 LP), die am Boden nicht umwerfen, werfen die springende Figur bei jeder Höhe um, steigend und fallend (M 5 bis 47 px; V bei 2, 5, 12, 18, 27, 35, 41, 44 und 48 px); am Boden nicht | M `f4_*` (ohne Eingriff, Referenz `f4_*_0`); V `f5_e_j*`, `f5_w_j*` (Referenz `j0`) | gesichert |
| Gleichzeitiger Treffer | Fällt der Treffer des Schlags (P+2) in den ersten aktiven Frame des Gegnerschlags, verliert nur der Gegner LP; einen Frame später verliert nur die Figur LP | M `f5_w_p26`/`p27`, `f5_e_p42`/`p43` (ohne Eingriff), `f5_wdx20_*`, `f5_wdx70_*`, `f5_edx20_*`, `f5_edx30_*` (EINGRIFF Lage vor dem Gegnerangriff); V ohne Eingriff `f6_e_p{65,66,67}` (`anlauf_c`), `f6_w_p{67,68,69}` (`anlauf_b`), `f6_t_p{72,73,74}` (`tiefe_b`) | gesichert |

Deutung der dritten Messung zu F1: Die Grenzen „schaut zu ihr“ und „schaut
weg“ liegen je Stufe 24 px auseinander, wie beim neutralen Sprungangriff in
„Nachtrag: Sprungangriff“ (vorn 76 bzw. 52 px, hinten −27 bzw. −3; dort
unsicher). Die Trefferfläche des Gegners liegt also in seine Blickrichtung
verschoben.

Unsicher (alle Werte; „dritte Messung“ nur, wo es eine gab):

- Laufen in die Tiefe nach einem Treffer der Stufe 1: Messagent erst ab h+29
  (Kontrollläufe `a_{w,e}_s1_t_hu`); Gegenprüfer nicht gemessen (Teil A nur
  Stufe 2 bis 4); keine dritte Messung.
- Sprungangriff runter gegen einen Gegner in seinem Angriff: Messagent Treffer
  bei dx 46 gegen den schlagenden EDDY (`b_nat_e_runter_a18`, `_a22`) statt
  bis 42 gegen gehende Gegner; Gegenprüfer nicht gemessen; keine dritte
  Messung.
- Eingabevarianten beim Sprungangriff, die nur der Gegenprüfer gemessen hat:
  Messagent nicht gemessen (hoch nur im Frame des Sprungdrucks); Gegenprüfer
  hoch und rechts im Sprungdruck → Tritt mit Richtung, 7 LP
  (`b_nat_e_hdiag`), runter nur im Sprungdruck → neutraler Tritt, 7 LP
  (`b_nat_e_dJ`), hoch vor dem Sprungdruck gedrückt und gehalten → hoch,
  12 LP (`b_nat_e_hlang`); keine dritte Messung.
- Timer `FFAA69` vor der Landung nach dem Neueinstieg: Messagent 200 in L
  (früher nicht ausgewertet); Gegenprüfer 200 schon ab E, Abnahme ab L+1;
  keine dritte Messung.
- Landung nach dem Neueinstieg an der Mech-Stelle: Messagent nicht gemessen;
  Gegenprüfer Mech −5 LP in L, Reiter −5 LP in L+1 und abgeworfen (Aktion
  0x0C); dritte Messung (Landungen dort in `m3_d1_item_bot1_s1_cam01344`,
  `_cam01408`) dafür nicht ausgewertet, nur der Reiter verliert dort in L
  keine LP (wie bei V).
- Abschnittsgrenze vor dem Mech als Halt für die gehende Figur: erste Messung
  des Messagenten und Gegenprüfer nicht gemessen; dritte Messung nur eine
  Erkundung außerhalb des Belegs (Halt bei Bildschirm-x 200).
- Flugweite beim Tod durch eine Klinge (x von t bis t+39): Messagent kein
  Klingentod; Gegenprüfer nicht ausgewertet (nur N = t2+107); dritte
  Messung 62,375 px dreimal (SKIP), 171,625 px in Stage 5, 0 px beim
  SKIP-Tod mit Stopp an der Bildkante 360.
- Angriffe der Gegner zwischen t+1 und dem Erscheinen: Messagent und
  Gegenprüfer in keinem Tod; dritte Messung (für D10 nicht ausgewertet)
  zweimal, `m3_d1_greichweite_v_sw_r` t+4 (SKIP, Slot 18, der die Figur mit
  dem Ausfallstich `8A02` tötete) und `m3_d1_stage9` t+17 (Slot 17).
- Schutz nach dem Neueinstieg in anderen Stages: Messagent und Gegenprüfer
  nur Stage 1; dritte Messung (nicht dafür ausgewertet) in Stage 4, 5 und 9
  wie in Stage 1 (Status 3 bis L+199, Timer 0 in L+200).

Offen:

- Tod, wenn sich zwei Sonderfälle überlagern (Klinge oder Rollen an einer
  Wand): kam nicht vor.
- Weitere tragende Untergründe als das Ölfass (andere Stages) und ein Fass
  vor der Figur (Tiefe kleiner als ihre).
- Ob die Landung nach dem Neueinstieg Gegner mit 5 LP oder weniger tötet und
  ob sie Gegner außerhalb des Bildes trifft.
- Schutz nach dem Neueinstieg bei den anderen Figuren.

Abgleich mit bestehenden Werten (kein gesicherter Wert wird überschrieben;
betroffen sind folgende Stellen):

- „Messgrößen“, Recovery-Frames Schlag („Die Figur ist ab h+13 wieder frei
  (Laufen bewegt ab h+14 …)“) und `mechanik.md`, „Recovery-Frames
  Standardschlag (Treffer)“ („handlungsfähig ab h+13 (Laufen oder nächster
  Schlag)“): **möglicher Widerspruch, unsicher**. Gemessen war dort Laufen
  zur Seite. Laufen in die Tiefe bewegt nach einem Treffer der Stufe 1 laut
  Messagent erst ab h+29 (nur eine Messung); für Stufe 2 und 3 ist das
  entsprechende Warten auf das Posenende (h+28) gesichert. Die Zeile in
  `mechanik.md` bleibt unverändert, bis Stufe 1 gegengeprüft ist. Die übrigen
  Werte der Stufe 1 hat Teil A genau wiedergefunden.
- `mechanik.md`, Abschnitt „Sprungangriff“, Zeile „Aktive Frames“ („A+5 bis
  A+28, solange die Figur in der Luft ist“): gilt laut „Nachtrag:
  Sprungangriff“ für neutral und Richtung. Hoch (A+7 bis A+10) und runter
  (A+9 bis A+32) haben eigene Fenster; die Zeile sollte deshalb „(neutral
  und Richtung)“ im Namen tragen, sonst widerspricht sie den neuen Zeilen.
- „Nachtrag: Schaden der Gegner“, Trefferreaktion (Workflow: „Bit 0x0400
  wählt nur die Animation“): beim Tod entscheidet diese Reaktion (Aktion 4
  in t) darüber, ob die Figur rollt und erst in t+151/152 statt t+120
  wieder einsteigt (gesichert, 3. Messung). Der Rangwechsel in
  `gs_hurt_c_lang` („Tod 1741, 12 → 9 in 1893“, also t+152) ist so ein
  Rollen.
- „Nachtrag: Reichweite der Kettenstufen 2–4“, Unsicher: Blick links (1 px
  kürzer) und Richtung während der Kette (hoch und runter ohne Wirkung,
  Ausfallschritt von 20 px zum Gegner, vom Gegner weg Abbruch) sind jetzt
  gesichert.
- „Nachtrag: Sprungangriff“, Varianten hoch und unten („Reichweite nicht
  gemessen“): jetzt gemessen (Teil B). „Mit Blick nach links ist die
  Reichweite 1 px kürzer (−75 bzw. −98)“: gesichert (neutral ≤ 75, Richtung
  ≤ 98).
- „Nachtrag: Schaden der Gegner“: Rang −3 beim Tod präzisiert (im Frame des
  Neueinstiegs, auch beim letzten Tod) und beim Stage-Wechsel bestätigt; die
  Workflow-Regeln „Jeder Treffer in der Luft wirft um“ und „Gleichzeitiger
  Treffer“ sind jetzt mit Skript belegt (gemessen mit WOOKY und EDDY);
  „etwa 120 Frames später geht es mit 72 LP weiter“ gilt für den normalen
  Tod (sonst 107, 108 oder 151/152).
- „Nachtrag: Trefferreaktion der Gegner“, Tod: Ein Treffer genau auf 0 LP
  tötet nicht; der Ablauf nach dem tödlichen Treffer (Aktion 2 in t+2, Slot
  frei in t+79) ist bestätigt.
- „Gefundene Adressen“, `FFAA69`: Neben 35 (Aufstehen) und 20
  (Spezialangriff) startet der Timer nach dem Neueinstieg mit 200.

## Objekt-Slots

Spieler und Gegner liegen in Blöcken mit gleichem Feldaufbau.

- **Spieler 1**: Block ab `FFA990`. Weitere Spielerdaten folgen direkt
  dahinter (`FFAA50` ff., z. B. Timer und Punkte).
- **Objekttabelle**: 60 Slots zu je 0xC0 Bytes, Slot n beginnt bei
  `FFBC90 + n·0xC0` (bis `FFE98F`). Das Byte bei S+0x80 ist eine laufende
  Slotnummer in drei Gruppen: 0–19 (Slots 0–19), 0–9 (20–29), 0–29 (30–59).
  Die Grenzen sind aus dem Zeitpunkt der letzten Änderung jedes Worts
  bestimmt: Der Gegner aus `attack` belegt genau `FFCA10`–`FFCACF`, und
  beim Verschwinden (Frame 715) geht S+4 auf 0.
- Gegner lagen in allen Läufen (Stage 1 und Demo-Stages) in den Slots 13–19.
  Ausnahme aus den Nachträgen vom 2026-10-02: In `fern_rw20` liegt der
  Raketen-DICK in Slot 10 (Szenarien, Savestates `fern_*`). In Slots 30–59
  lagen andere Objekte, z. B. Slot 59 als Trefferfunke (8 Frames je Treffer). **Unsicher**: dass die Slots 0–19 ausschließlich
  Gegner enthalten.
- Gegner zählen: `ramtools.py enemies` zählt je Frame die Slots 0–19 mit
  S+4 ≠ 0 (`belegt`), davon mit S+5 = 1 (`s5`), davon mit S+4 ∈ {1, 3}
  (`kampffaehig`). Einen eigenen Zähler des Spiels haben wir nicht
  gefunden: Für keine der Zählweisen gibt es in `hurt`, `attack` und
  `attract` eine Adresse, die in allen Frames denselben Wert hat. Die
  Zählung `kampffaehig` stimmt mit den Snapshots überein: `hurt` 1110 → 3,
  `hurt_b` 1080 → 3, `attack_b` 390 → 1, Demo 3984 → 5. In der Demo bei
  3900 stehen zwei der fünf Gegner fast deckungsgleich (Slots 14/15) und
  sind im Bild nicht zu trennen.
- Nachtrag 2026-10-02 (Einzelheiten in „Gefundene Adressen“): In den Slots 20–59 liegen
  Gegenstände (Typ `0x95F9C`, Art in S+0x3D), Behälter wie Ölfässer und
  Geldkassetten (Typ `0x9DA2A`, LP 777), Glasscheiben, Gullydeckel und die
  Explosionen des Spezialangriffs von Ginzu und Baby Head. Die Geschosse der
  Figur (Rakete, Laser, Kugeln) liegen nicht dort, sondern in fünf eigenen
  Blöcken ab `FFAD90`.
- Die Geschosse der Gegner liegen dagegen in der Objekttabelle (Nachtrag
  Fernangriffe der Gegner): das Messer des SKIP immer in Slot 29, Kugel und
  Rakete des DICK in einem der Slots 27–29, der im Frame vor dem Erscheinen
  frei ist (gesichert (3. Messung); Reihenfolge der Vergabe offen). Auch die
  Waffe in der Hand eines DICK ist ein eigenes Objekt (Typ `0x9A988`, beim
  Pistolen-DICK Slot 58). Einzelheiten in „Geschosse der Gegner“.
- Stage 1 belegt beim Start die Slots 16–18 mit `0200` und Slot 19 mit
  `0100` (S+5 = 0, x = 2424, also weit voraus). In Slot 19 liegt laut
  Gegenprüfer des Boss-Nachtrags ab Stage-Beginn schon der Boss DOLG (Typ
  gesetzt, beim Erreichen der Arena werden nur seine LP geschrieben;
  unsicher, eine Messung).

## Gefundene Adressen

Offsets beziehen sich auf den Blockanfang S (Spieler `FFA990`, Gegner
`FFBC90 + n·0xC0`). Werte sind Big Endian, „16.16“ heißt Ganzzahl-Wort
plus Nachkomma-Wort. Die Gegenprüfung lief immer blind: Gesucht wurde im
ganzen Arbeitsspeicher eines Gegenlaufs mit Filtern, die nur aus dessen
eigenen Eingabezeiten oder Snapshots abgeleitet sind (`scripts/verify_b.sh`,
Ausgabe `logs/a4_gegenpruefung.txt`).

### Spieler 1

| Adresse | Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|---|
| `FFA99E` / `FFA9A0` | S+0x0E / +0x10 | 16.16 | x-Position (Welt), wächst nach rechts | `walk`: rechts gedrückt 261–300, x ändert sich 262–301 um 1,75/Frame (320 → 390). `walk_b`: blinde Suche (Breite 2 und 4) liefert eindeutig `FFA99E`. `logs/a4_position.csv` | gesichert |
| `FFA9A6` / `FFA9A8` | S+0x16 / +0x18 | 16.16 | Tiefe, wächst nach oben/hinten | `walk`: hoch ab 61 → +1/Frame ab 62, Anschlag bei 341. `walk_b`: blinde Suche mit Breite 4 eindeutig. Mit Breite 2 schlägt sie fehl, weil sich das Ganzzahl-Wort diagonal (0,75/Frame) nicht in jedem Frame ändert | gesichert |
| `FFA9A2` / `FFA9A4` | S+0x12 / +0x14 | 16.16, vorzeichenbehaftet | Höhe über dem Boden, 0 = Boden. Das Nachkomma-Wort wird bei der Landung nicht genullt | `jump`: Sprung 61, Höhe > 0 in 63–102, max. 51. `jump_b`: blinde Suche → `FFA9A2` und dessen Vorframe-Kopie. `logs/a4_hoehe_aktion.csv` | gesichert |
| `FFA9F6`, `FFA9F8`, `FFA9FA` | S+0x66, +0x68, +0x6A | je 2 | x, Höhe und Tiefe (Ganzzahl) des Vorframes | stimmt in jedem Frame von `walk_b`, `jump_b`, `attack_b`, `hurt_b` (auch beim Geworfenwerden) | gesichert |
| `FFA9D0` | S+0x40 | 2, vorzeichenbehaftet | Lebenspunkte, Start 72, fällt nur bei Treffern | `hurt`: −5 bei 450, 510, 574, … `hurt_b`: blinde Suche (`same`, `noinc`, drei Abnahmen) → `FFA9D0` und Kopie. Demo: Start 72 je Abschnitt. `logs/a4_lp_spieler.csv` | gesichert |
| `FFA9D2` | S+0x42 | 2 | Lebenspunkte des Vorframes | wie oben | gesichert |
| `FFA99A` | S+0x0A | 2 | Aktion: 0 Stand/Laufen, 0x0A Sprung, 0x10 Schlag (bleibt bei Folgeschlägen der Kette 0x10). Weitere Werte unbekannt | `jump`/`attack`: Sprung 62–108, Leerschlag 62–77. `jump_b` und `attack_b`: blinde Suche nach diesen Werten zu den variierten Zeiten jeweils eindeutig | gesichert (für die drei Werte) |
| `FFA99C` | S+0x0C | 2 | Unterphase der Aktion: Sprung 2 = Landung (6 Frames). Schlag: 2 (Leerschlag) bzw. 4 (nach Treffer) ab dem Frame, in dem der Schlag abbrechbar ist; in der Kette 6 | `jump`, `attack`, `attack_b`; Aufgabe 5: `kontakt`, `kontakt_b`, Leerschlag | unsicher (Deutung) |
| `FFA994` | S+0x04 | 1 | Grundzustand: 1 normal, 3 geschützt (27 Frames Trefferreaktion bzw. 35 Frames nach dem Aufstehen), 2 am Boden nach Wurf, 0 vor Spielbeginn. In der Demo dauerhaft 3 | `hurt`, `hurt_b`, `hurt_c`. Eingriff `schutz_eingriff`: solange 3, kein LP-Verlust | gesichert (Werte und Schutzwirkung von 3), unsicher (Demo) |
| `FFA995` | S+0x05 | 1 | 0 im Spiel, 1 in der Demo (KI-gesteuert?) | `hurt`, `attract` | unsicher |
| `FFAA2D` | S+0x9D | 1 | Kombostufe × 4 (0/4/8/12). Wird 2–3 Frames vor dem Treffer des jeweiligen Kettenschlags gesetzt und erst beim nächsten Angriff nach der Kette wieder 0 (`attack`: Kette endet 666, Rücksetzen 674) | `attack` (602/618/634) und `attack_b` (417/435/453): identische Folge, Treffer je 2–3 Frames danach. `logs/a4_lp_gegner.csv` | gesichert |
| `FFAA61` | – | 1 | Timer beim Liegen: startet mit 40, 54 Frames nach dem Wurf, zählt bis 0 | `hurt` (629, 980, 1332), `hurt_b` (598, 994); blind wiedergefunden | gesichert |
| `FFAA69` | – | 1 | Timer nach dem Aufstehen: startet mit 35, wenn S+4 von 2 auf 3 geht. Sein Ablauf (1 → 0) setzt S+4 zurück auf 1 und beendet damit den Schutz | `hurt` (696, 1047, 1399), `hurt_b` (665, 1061), `hurt_c`; blind wiedergefunden. Eingriff: von außen auf 0 gesetzt, bleibt S+4 auf 3 | gesichert |
| `FFAA34` | – | 1 | gewählte Figur: 0 Mack the Knife, 1 Captain Commando, 2 Ginzu, 3 vermutlich Baby Head | `coin_start`: 0 → 1 mit dem Rechtsdruck in der Figurenwahl. Demo: 1, 2, 0, 3 in der Reihenfolge der folgenden Figurenvorstellungen (Captain, Ginzu, Mack) | gesichert (0–2), unsicher (3) |
| `FFAA76` | – | 2, BCD | Punkte Spieler 1 (0x140 = 140 Punkte) | `attack` und `attack_b`: 0x10, 0x30, 0x60, 0x140, passend zum HUD | gesichert |
| `FFA9C8`, `FFA9CA` | S+0x38, +0x3A | je 2, vorzeichenbehaftet | LP des zuletzt getroffenen Gegners nach bzw. vor dem Treffer, 2 Frames nach dem Treffer gesetzt (vermutlich für den HUD-Balken) | `attack`, `attack_b`: gleiche Folge wie die Gegner-LP | unsicher (Deutung) |
| `FFAA56` | – | 2 | +16 bei jedem Treffer, egal wer trifft | `attack`, `hurt` | unsicher |
| `FFA99A` | S+0x0A | 2 | Aktion, weitere Werte (Nachträge vom 2026-10-02): 0x02 Sprint (D2+1 bis zum Ende des Sprints, auch am Rand der Tiefe), 0x04 Sprintsprung, 0x06 Sprintangriff (A+1 bis A+35 ohne Treffer), 0x08 Sprint-Sprungangriff (ab A+1 bis zum Ende der Landung J+48, nach einem Treffer in A+13 7 Frames später), 0x0E Sprungangriff, 0x12 Aufnehmen (P+1 bis P+7, dabei S+0x04 = 2), 0x14 Spezialangriff (bei allen vier Figuren von P+1 bis zum Ende der Aktion), 0x16 Waffeneinsatz. Beim Kniestoß im Griff bleibt der Wert 0 | `logs/sprint.csv` (`ri_r`, `sj_20`, `sa_leer20`, `sja_leer`), `logs/sprint_v.csv`; `logs/spezial.csv` (`aus_*`, `h<k>_leer`), `logs/spezial_v.csv`; alle Läufe in `logs/item.csv` und `logs/item_v.csv` | gesichert (für diese Werte) |
| `FFA9AC` | S+0x1C | 4 | Animationszeiger der Figur. Trifft die Figur einen Gegner, wechselt er in h+11 und h+12 (Folgestufen h+11): Trefferstopp 7 Frames, auch wenn ein Schlag zwei Gegner trifft | `reaktion.csv` (M `c_*`, `a_s1_e_p20`, `a_s3_e_b`, `c_einzel_b`), `reaktion_v.csv` (Abschnitt „Trefferstopp“); gelesen von `messen_reaktion.py` und `reaktion_v_frei.lua` (`p_anim`) | gesichert (Wechselzeitpunkte), Werte nicht gedeutet |
| `FFA82E` | – | 2 | Kamera-x: Welt-x des linken Bildrands. Läuft die Figur nach rechts, folgt die Kamera ab Bildschirm-x 200. Sichtbarkeit (S+5) und Weckreiz der Gegner hängen an x − Kamera-x, nicht am Abstand zur Figur | Watch-Spalte in `verhalten.lua` und `verhalten_v_frei.lua`; Schwellen in `logs/verhalten.csv` (`schwelle`, `m3_schwelle_*`) und `logs/verhalten_v.csv` (`v_sicht*`, `v_weck*`). In „Wurf der Figur“ ist `FFE99E` als Kamera genannt; das Verhältnis der beiden ist nicht geprüft | gesichert |
| `FFF82A` | – | 1 | Rang (Schwierigkeitswert 7–24, siehe „Nachtrag: Schaden der Gegner“). Bestimmt auch die Pause der Gegner in Kampfhaltung vor jedem Angriff: 29 − 4·⌊Rang/4⌋ Frames (gesichert für Rang 7–23, Rang 24 nur eine Messung) | `logs/verhalten.csv` (`zusammenfassung` „pause“, EINGRIFF `r_w_*`, `r_e_*`), `logs/verhalten_v.csv` (`v_r_*`); natürlich bei Rang 8–20 | gesichert |
| `FFA994` | S+0x04 | 1 | Grundzustand: 3 auch während des ganzen Spezialangriffs (P+1 bis zum Aktionsende, alle vier Figuren); danach 1, obwohl der Timer `FFAA69` noch 20 Frames schützt | `ab_leer_*`, `h<k>_leer`; `spezial_v_ab_leer_s2`, `spezial_v_f<k>_leer` | gesichert |
| `FFAA69` | – | 1 | Schutz-Timer auch nach dem Spezialangriff (Ergänzung zur bisherigen Zeile „Timer nach dem Aufstehen“, die den Schutz an S+4 = 3 knüpft): startet dort mit 20 im ersten Frame nach der Aktion, bei S+4 = 1. Solange er über 0 steht, verliert die Figur keine LP, auch bei S+4 = 1; LP-Verlust frühestens im Frame, in dem er 0 wird | `sch_ende_a14/15/16`, `sch_ende_b52..55`; `spezial_v_ab_leer_s2` (Start P+51, 0 in P+71), `spezial_v_aus_c_1f` (P+58, 0 in P+78); EINGRIFF `spezial_v_sch_e_r45_t69`, `spezial_v_sch_w_r45_t69`, `spezial_v_sch_e_t5` | gesichert |
| `FFA9D0` | S+0x40 | 2, vorzeichenbehaftet | Lebenspunkte (Ergänzung zu „fällt nur bei Treffern“): fallen auch durch die Kosten des Spezialangriffs (9 LP in h+8, bei Ginzu und Baby Head h+1), dabei höchstens auf 0 | `lp_*`, `h<k>_lp5`; `spezial_v_lp*`, `spezial_v_f<k>_lp5` | gesichert |
| `FFA9B4` | S+0x24 | 2 | Attribut der Figur (bei Gegnern das Trefferattribut): bei Mack im Spezialangriff von P+1 bis P+60 `0x4C12` | RAM-Abzug der Läufe `h0_*` (M4) | unsicher (einzelne Frames nicht geprüft, Deutung) |
| `FFA9A2` / `FFA9A4` | S+0x12 / +0x14 | 16.16, vorzeichenbehaftet | Höhe: Die Figur steht ab `ingame` und `stage1` bei 0,25 (Nachkomma-Wort ≠ 0). Sprunghöhen deshalb als Anstieg über der Standhöhe auswerten: Scheitel absolut 51,5, Anstieg 51,25 | `sj_20`, `sj_60`, `sj_norm`, `d3_sj_s1`, `d3_sj_norm_s1` (Spalte „Hoehe vor dem Sprung 0.25“ in `logs/sprint.csv`); `sprint_v_sj_10`, `sprint_v_sj_50`, `sprint_v_sj_norm` (Anstieg 51,25 mit Nachkomma-Wort) | gesichert (3. Messung): Anstieg 51,25 und Standhöhe 0,25 ab `ingame` und `stage1` erklären zusammen die Werte aller drei Messungen (M4 51,5 absolut, V4 51,25, dritte Messung beides); passt zum gesicherten Befund oben, dass das Nachkomma-Wort bei der Landung nicht genullt wird |
| `FFA999` | S+0x09 | 1 | 4 = die Figur hält einen Gegner im Griff (auch mit Waffe) | `item_w_griff`, `item_d_griffknie` 82, `item_d_griffwurf` 82; `item_v_griff_gun` 108 | gesichert (Wert 4), übrige Werte offen |
| `FFA99C` | S+0x0C | 2 | Ergänzung der Unterphase: im Griff 2, beim Kniestoß 4, beim Wurf 6 | `item_d_griffknie`, `item_d_griffwurf`; `item_v_griff_gun`, `item_v_griff_wurf` | gesichert (Werte), unsicher (Deutung) |
| `FFAA08` | S+0x78 | 1 | 1 = ein Gegenstand liegt in Reichweite der Aufnahme; nur am Boden, im Sprung 0, nach der Landung wieder 1 | `item_f_nah_*`, `item_nah_*`, `item_f_sprung`; `item_v_sprung`, `item_v_mn_*` | gesichert |
| `FFAA09` | S+0x79 | 1 | 1 = die Figur hält eine Waffe; 0 im Frame nach einem Treffer gegen die Figur | `item_f_waffe`, `item_a_*`, `item_k_*_w`; `item_v_mis_auf` 213/214, `item_v_s7h_auf` 141 | gesichert |
| `FFAA0A` | S+0x7A | 2 | Zeigerwort auf S+4 des Gegenstands in Reichweite (Slot = (`FF0000` + Wort − 4 − `FFBC90`) / 0xC0); bleibt nach der Aufnahme stehen | alle Aufnahmen in `item.csv` und `item_v.csv` | gesichert |
| `FFAA18` | S+0x88 | 1 | 0xFF, solange eine Waffe gehalten wird (ab Ende der Aufnahme) | `item_f_waffe` (Probe) | unsicher (Deutung) |
| `FFAA1A` | S+0x8A | 1 | zählt ab der Aufnahme von 20 auf 0 | `item_f_waffe` (Probe) | unsicher (Deutung) |
| `FFAA2D` | S+0x9D | 1 | Ergänzung zur Kombostufe: Waffeneinsätze ändern sie nicht (0 bleibt 0, ein alter Wert bleibt stehen); der Kniestoß im Griff setzt 4 (wie Kettenstufe 2), auch mit Waffe | alle Waffenläufe; `item_d_griffknie`, `item_v_griff_gun` | gesichert |
| `FFAA41` | S+0xB1 | 1 | Munition bzw. Ladungen der gehaltenen Waffe, bei der Aufnahme aus S+0xB1 des Gegenstands übernommen | `item_f_waffe`, `item_a_*`, `item_k_*_w`; `item_v_mis_r`, `item_v_las_leer` | gesichert |
| `FFAA74` | – | 4, BCD | Punkte Spieler 1 als achtstellige BCD-Zahl. `FFAA76` ist ihre untere Hälfte mit den vier niedrigsten Stellen, ab 10.000 Punkten zählt `FFAA75` mit | `item_k_s7_2c_lp72` (13.260 Punkte), Abschnitte `punkte` in `item.csv`; Bot `item_v_b*` (Spalte `pkt`, 4 Byte) | gesichert |
| `FFAA76` | – | 2, BCD | präzisiert: nur die vier niedrigsten Stellen der Punkte (untere Hälfte von `FFAA74`); unter 10.000 Punkten gleich dem Punktestand, darüber zu klein | wie `FFAA74` | gesichert |
| `FFA99A` | S+0x0A | 2 | Aktion, Ergänzung (Nachtrag Boss), weiterer Wert: 0x18 Siegerpose nach dem Tod des Bosses (t+97 bzw. t+98 nach tödlichem Spezialangriff, sonst meist t+127 bis t+139) | `logs/boss.csv` („# G fall“, Spalte `siegerpose`; Kriterium im Kopf des Abschnitts), „# M fall“ | unsicher (Deutung nach dem Verhalten; beide Auswertungen nehmen unabhängig Aktion 0x18 als Kriterium, die Zeitpunkte t+97, t+128 und t+132 stimmen überein, in zwei Bot-Läufen des Messagenten aber t+55 und t+61) |
| `FFAA12` | S+0x82 | 2 | Zeigerwort auf S+4 des Angreifers im Frame des LP-Verlusts (Slot = (`FF0000` + Wort − 4 − `FFBC90`) / 0xC0, Regel aus „Nachtrag: Schaden der Gegner“). Bei Geschossen zeigt es auf den Werfer (SKIP, DICK), nicht auf das Geschoss | `logs/fern.csv` (`A geschosse`, alle Treffer der natürlichen Läufe), `logs/fern_v.csv` (`wurf`, `angriff_dick`, `bahn`) | gesichert |
| `FFAA7C` | S+0xEC | 1 | Leben von Spieler 1: 2 bei Spielbeginn (DIP „Lives“, Standard 2 laut `-listxml`), 1 nach dem ersten Tod (im Frame des Neueinstiegs), 0 nach dem zweiten; danach kein Neueinstieg | `logs/rest.csv` (Teil D, Spalte `leben`), `logs/rest_v.csv` (Teil D: `rest_v_d_768`, `rest_v_d_1281n`, EINGRIFF `rest_v_d_e2`) | gesichert |
| `FFAA69` | – | 1 | Ergänzung (Nachtrag Rest der Spielfigur): Schutz-Timer auch nach dem Neueinstieg (zu den Zeilen oben: 35 nach dem Aufstehen, 20 nach dem Spezialangriff): steht in L auf 200, zählt ab L+1 herunter und erreicht 0 in L+200, dann S+4 = 1. Laut Gegenprüfer steht er schon ab dem Erscheinen auf 200 | `logs/rest.csv` (Teil D, Spalten `t69_start`, `t69_null_rel_L`), `logs/rest_v.csv` (Teil D, Felder `t69_200_ab_rel_L`, `t69_erste_abnahme_rel_L`, `t69_null_rel_L`) | gesichert (200 in L, 0 in L+200), unsicher (200 schon ab dem Erscheinen: nur Gegenprüfer) |
| `FFA994` | S+0x04 | 1 | Grundzustand, Ergänzung (Nachtrag Rest der Spielfigur): 3 auch vom Erscheinen nach dem Neueinstieg bis L+199 (Schutz, danach 1 mit dem Ablauf von `FFAA69`) | `logs/rest.csv` (Teil D, Spalte `status3_bis_rel_L`), `logs/rest_v.csv` (Feld `status3_von_bis_rel_L`) | gesichert |
| `FFA99A` | S+0x0A | 2 | Aktion, Ergänzung (Nachtrag Rest der Spielfigur), Werte beim Tod der Figur (dieselben Zahlen wie Sprint, Sprintsprung usw. in der Zeile „weitere Werte“, hier aber im Ablauf des Todes): 2 Flug ab t+2; normal 4, 6, 0x0A ab t+40, t+49, t+59; beim Rollen 4 ab t+40 (32 Frames), 6 ab t+72, 0x0A ab t+90 bzw. t+91; nach einem Flug gegen eine Wand 8 ab dem Stopp (senkrechter Fall), 6 ab t+40, 0x0A ab t+47; nach einem Klingentreffer 2, 4, 6, 8, 0x0A, 0x0C ab t+2, t+3, t+11, t+39, t+49, t+87. Wert 4 im Frame t (Reaktion auf einen Treffer von vorn mit Attribut-Bit 0x0400) führt zum Rollen. Nach dem Neueinstieg ist L der erste Frame mit 0x0A und Unterphase (S+0x0C) 2. Sprungangriff hoch: 0x0E bis A+29 (mit Treffer A+36), danach 0x0A | `logs/rest.csv` (Teil D Spalte `aktionen_rel_t`, Teil M3 `todesart` Spalten `reaktion_t`, `aktion8_ab`, Teil B Spalte `aktion0e_bis_rel`; Rollen: `rest_d_hurt_c` und Teil M3), `logs/rest_v.csv` (Teil B `akt0E_bis_rel_A`, `akt0A_ab_rel_A`; Teil D) | gesichert (Werte und Zeiten; Todesarten: 3. Messung), unsicher (Deutung) |
| `FFA8CE` | – | 1 | Stage-Index (Stage 1 = 0). Im Frame seines Wechsels beginnt die nächste Stage, im selben Frame sinkt der Rang `FFF82A` um 3 | `logs/rest.csv` (Teil E, Ereigniszeilen „stage 0 -> 1“ der Bot-Läufe), `logs/rest_v.csv` (Teil E: `rest_v_e_*`) | gesichert |
| `FFF82C` | – | 2 | Rangzähler für den 600er-Takt des Rangs (siehe „Nachtrag: Schaden der Gegner“): bleibt beim Stage-Wechsel unverändert und zählt weiter | `logs/rest.csv` (Teil E, EINGRIFF `rest_e_r8`, `rest_e_r24` mit 3000), `logs/rest_v.csv` (Teil E) | gesichert |
| `FFA830` | – | 2 | Kamera-y (Gegenstück zu Kamera-x `FFA82E`): Die Figur erscheint nach dem Neueinstieg in Tiefe = Wert + 48 (und x = Kamera-x + 64) | `logs/rest.csv` (Teil D, Spalte `z_minus_ky`), `logs/rest_v.csv` (Feld `lage_E`) | gesichert (Bezug beim Neueinstieg), unsicher (Deutung als Tiefe des Bildausschnitts) |

### Gegner (Slot n, Basis S = `FFBC90 + n·0xC0`)

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| S+0x40 | 2, vorzeichenbehaftet | Lebenspunkte („WOOKY“: 16), fallen nur bei Treffern, nach dem Abschlusstritt negativ | `attack`: Slot 18 (`FFCA50`) 16 → 13 → 9 → 4 → −6. `attack_b`: blinde Suche eindeutig `FFCA50`. Demo: 48 Abnahmen, nie eine Zunahme in belegten Slots. Jede Abnahme fällt auf einen Statuswechsel 1 → 3 oder 1 → 2 oder liegt in Zustand 3 bzw. 2 | gesichert |
| S+0x42 | 2 | Lebenspunkte des Vorframes | `attack`, `attack_b` | gesichert |
| S+0x9A | 2 | Start- bzw. Maximal-LP des Gegners (16, 20, 22, 26, 30, 32, 36, 46) | In 59 von 60 Fällen (Demo, `hurt*`, `attack`, `combo_c`) gleich den LP beim Belegen oder Erscheinen. Ausnahme: ein Demo-Gegner, der beim Wiedererscheinen schon getroffen war | gesichert |
| S+0x04 / S+0x05 | je 1 | Grundzustand wie beim Spieler: 0 frei, 1 normal, 3 Trefferreaktion, 2 am Boden bzw. wartend. Wartende Gegner stehen auf `0200`. S+5 wird später 1, noch bevor der Gegner ins Bild kommt; er wartet dann am Bildrand (`0201`). Ablauf in `attack`: `0201` → `0101` (544, aktiv) → `0301` (587, Treffer) → `0201` (637, Abschlusstritt) → `0000` (715, frei) | `attack`, `attack_b`, `hurt`, `hurt_b`, Demo. `logs/a4_gegnerzahl.csv` | gesichert (Werte), unsicher (Deutung) |
| S+0x0E, +0x12, +0x16; Vorframe +0x66, +0x68, +0x6A | 16.16 bzw. 2 | x, Höhe, Tiefe wie beim Spieler | Der Gegner in `attack_b` läuft mit fallendem x auf den Spieler zu. Die Vorframe-Kopien stimmen in `hurt_b` immer, in Demo und `attack_b` aber nicht, solange ein Gegner nach einem Treffer durch die Luft fliegt (Höhen-Kopie bleibt 0) | unsicher |
| S+0x89 | 1 | laufende Nummer des treffenden Angriffs? **Keine** Kombostufe: `attack` 7/8/9/10, `attack_b` 4/5/6/7 bei gleicher Kette | `attack`, `attack_b` | unsicher |
| S+0x04 / S+0x05 | je 1 | Ergänzung (Nachträge vom 2026-10-02). S+4: 3 = Trefferreaktion, genau h bis h+22 (nach einem Wurf auch Flug, Liegen und Aufstehen bis G−1, beim Tod durch Wurf bis zum Ende); 2 = umgeworfen von K+1 bis G−1, sterbend ab t+1, und bei wartenden Gegnern (hockend, versteckt) bis zum Weckreiz; 1 ab h+23 bzw. ab G, nach dem Weckreiz beim versteckten WOOKY nach 16, beim hockenden WOOKY nach 49, beim hockenden EDDY nach 69 Frames; 0 ab Slot frei (t+79, nach Stufe 2 t+111, nach Wurf t+101). S+5 = 1 genau, solange −64 ≤ x − Kamera-x ≤ 447 (WOOKY, EDDY; DOLG erst ab 428–431), sonst 0, auch beim Wiedereintreten. Bei x ≥ Kamera-x + 448 steht der Gegner auf `0100` (deaktiviert); Rakete und Laser treffen ihn dort nicht | `logs/reaktion.csv`, `logs/reaktion_v.csv` (alle Läufe); `logs/verhalten.csv` (`akt_*`, `d_*`, `bot_*`, EINGRIFF `m3_schwelle_*`), `logs/verhalten_v.csv` (`v_weck_*`, `v_sicht*`, `v_p_stage1`); `logs/item.csv` (`item_las_a16_x192`, `item_mis_a16_x192`), `logs/item_v.csv` (`item_v_mz_r214/r215`, `item_v_lz_o*`) | gesichert (Grenzen von S+5: 3. Messung) |
| S+0x0A | 2 | Aktion bzw. Modus des Gegners (Werte aus den Nachträgen vom 2026-10-02): 0 frei bzw. gehend (auch ab G); 2 Spott; 4 Abwarten; 6 Kampfhaltung in Schlagdistanz vor dem Ausholen (4 und 6 mit derselben Haltungsanimation; das ist die „Angriffspose (Aktion 0x06)“ aus „Messungen im Einzelnen“; in dieser Pose reicht Stufe 3 des Spezialangriffs vorn 76 statt 75 px); 0x0C umgeworfen; beim Wurf 2, ab E+22 4, ab E+71 0x0C; 0x1C Pause des EDDY nach dem Aufstehen; beim Tod 2 ab t+2 (Flug ab t+3), 4 ab t+40, 6 ab der Ruhe (t+49, nach Stufe 2 t+72, nach Wurf t+79) und 0x0A ab t+58 (nach Stufe 2 t+90, nach Wurf t+80) | `logs/reaktion.csv` (`a_*`, `b_*`, `d_*`), `logs/reaktion_v.csv` (`b_*`, `d_*`); `logs/verhalten.csv` (`uebergaenge`, `gruppe`), `logs/verhalten_v.csv`; `logs/spezial.csv` (`d3_rx_*`) | gesichert (Werte), unsicher (Deutung; 0x1C nur ein Lauf) |
| S+0x0C | 2 | Phase der Aktion; beim Umwerfen (Aktion 0x0C): 2 Flug, 4 Bodenkontakt, 8 Ruhe, 0x0A Aufstehen (18 Frames bis S+4 = 1). Beim wartenden Gegner ist das Byte S+0x0D der Weckreiz: 0, wird 2 im Frame, in dem x − Kamera-x ≤ 383 ist (384 weckt nicht) | `logs/reaktion.csv`, `logs/reaktion_v.csv` (alle `b_*`); `logs/verhalten.csv` (`aktivierung`, `schwelle`), `logs/verhalten_v.csv` (`wecken`) | gesichert (Phasen beim Umwerfen, Weckreiz), unsicher (Bedeutung sonst) |
| S+0x0E, +0x12, +0x16 | 16.16 | präzisiert: x, Höhe und Tiefe des Gegners sind in 16.16 Frame für Frame lesbar; Flugbahn beim Umwerfen (x 2,875 px/Frame, Höhe +5,0, Schwerkraft 70/256) und Zittern (±3, ±2, ±1 px) in Messung und Gegenprüfung gleich | `logs/reaktion.csv` (`a_*`, `b_*`), `logs/reaktion_v.csv` (`a_*`, `b_*`) | gesichert (die Vorframe-Kopien +0x66 ff. bleiben unsicher) |
| S+0x1C | 4 | Animationszeiger des Gegners; die letzten fünf Hex-Stellen kennzeichnen Zustand und Angriff. Erste Animation je Angriff, ihr erster Frame ist der Angriffsbeginn A: WOOKY Schlag A `05FA54` (langsam; im „Nachtrag: Verhalten der Nahkämpfer“ W-A), Umwerfschlag A `05FB50` (W-B), Schlag B `05FC18` (schnell, W-C), Umwerfschlag B `05FC8C` (W-D), Schlag C `05FD24` (W-E); EDDY Schlag A `0643F8` (E-A), Umwerfschlag `0644F4` (E-B), Schlag B `0645BC` (E-C), Sprungtritt `064688` (E-D); SKIP Messerstich `0287E0`, Ausfallstich `028642`. Wartepose nach dem Angriff: WOOKY `05FB18`, EDDY `0644BC`, SKIP `02849E`. WOOKY außerdem: Gehen `05ED1C` ff., Stand `05ECAA`, Trefferreaktion Stufe 1 und 3 `05EFC8`/`05F002`/`05F034`, Stufe 2 `05EE94`/`05EECE`. EDDY: Gehen `063746`, Stand `0636D4`, Reaktion Stufe 1 und 3 `0639F4`/`063A2E`/`063A60`, Stufe 2 `0638C0`/`0638FA`, Aktion 0x1C `063C76` ff. Katalog: `messen_verhalten.py katalog` | `logs/greichweite.csv` (Teil 3 und 4, Spalte `anims`), `logs/greichweite_v.csv` (Teil 1 `anim_A`); `logs/verhalten.csv` (`katalog`), Tabelle `KENNUNG` in `messen_verhalten_v.py`; `logs/reaktion.csv`, `logs/reaktion_v.csv` (`a_*`, `c_zwei_*`) | gesichert (Beginn-Kennungen und Warteposen, in drei Nachträgen unabhängig gefunden), unsicher (Bezeichnungen nach dem Verhalten, nicht nach dem ROM; übriger Katalog) |
| S+0x24 | 2 | Trefferattribut (präzisiert, siehe „Nachtrag: Schaden der Gegner“), gesetzt genau in den aktiven Frames eines Angriffs: WOOKY Schlag A und EDDY Schlag A `0x400C`; WOOKY Schlag B und C, EDDY Schlag B `0x440C`; Umwerfschläge und Sprungtritt `0x4C0C`; SKIP Messerstich `0x8402`, Ausfallstich `0x8A02`; Wirbel-Varianten des SKIP `0x8C00` in jedem Animationsschritt außer dessen erstem Frame, ohne Treffer, ihr Stich mit dem Attribut der normalen Variante. Bit 0x0800 hat das Attribut im treffenden Frame genau bei den Angriffen, die am Boden umwerfen. Stirbt der WOOKY im ersten aktiven Frame seines Schlags, bleibt es in t+1 gesetzt (ohne Wirkung). Im Frame +17 des Aufstehens `FF00`. Ein tödlich geworfener Gegner trägt von t+1 bis t+57 `0008` (Geschoss gegen andere Gegner) | `logs/greichweite.csv` (Teil 1 `attr`, `attr_treffer`; Teil 2 `SMWL_*`), `logs/greichweite_v.csv` (Teil 1 `attr`); `logs/verhalten.csv` (`katalog`, `angriffe`); `logs/reaktion.csv` (`d_gleich_w`), `logs/reaktion_v.csv` (`b_*` Spalte `attr_aufstehen`, `d_gleich_w`, `d_wurf_w`) | gesichert (Werte je Angriff; Wirbel-Varianten: 3. Messung; `FF00` nach Tritt, Sprungangriff und Kniestoß), unsicher (`0008` und `FF00` nach dem Wurf je nur eine Messung) |
| S+0x96 | 2, vorzeichenbehaftet | Zielabstand dx (x(Gegner) − x(Figur)), den WOOKY und EDDY für einen Angriff gespeichert haben. Ab A+1 bricht der Angriff ab, sobald dx das Fenster [Wert − 31, Wert + 32] verlässt. In natürlichen Läufen meist dx bei A, auf ±48 begrenzt (Ausnahme `ek2_l`: dx 44, Wert 32). Hält ein EINGRIFF die Figur bis A−1 fest, übernimmt der Gegner meist diesen Abstand (25, −30; `W3S2L`: 3 bei gehaltenen 25). Beim SKIP ±64. S+0xBA enthält denselben Wert | `logs/greichweite.csv` (Teil 2 Zeilen `ziel`: 49 Quellgruppen, 188 x-Proben; Spalte `ziel` in Teil 3 und 4), `logs/greichweite_v.csv` (Teil 5 `fenster`, 19 Quellen; Spalte `ziel` in Teil 4) | gesichert (Abbruchfenster, 3. Messung), unsicher (wann und wie der Wert gesetzt wird; S+0xBA nur Gegenprüfer). ±64 beim SKIP (der nie abbricht) ist der Zielpunkt seines Stichs, gesichert in der Zeile „S+0x96 / S+0x98“ |
| S+0x9A | 2 | Ergänzung: Setzt ein Eingriff die LP (S+0x40) über S+0x9A, hält das Spiel nach dem nächsten Treffer an, und ein Angriff im Griff löst keinen Kniestoß aus. Eingriffe auf die LP setzen die Max-LP deshalb mit | Hinweise in `reaktion.lua` und `reaktion_v_frei.lua` (`CC_LP`); `logs/item.csv` (`item_w_griff`), Erklärungsläufe `item_v_m5_griff`, `item_v_m5_griff_max` | unsicher (Beobachtung bei Eingriffen) |
| S+0x40 (DOLG) | 2, vorzeichenbehaftet | LP des Boss DOLG (Zeilen der Nachträge „Verhalten der Nahkämpfer“ und „Boss“ zusammengeführt). Startwert nach Rang 90 / 100 / 110 / 120 (Rang 7–8 / 9–15 / 16–23 / 24), geschrieben im Frame nach dem ersten Frame mit Kamera-x ≥ 2048; der früher genannte „Höchstwert 110“ ist Rang 16 beim Erreichen der Arena. Zurückweisung unter der Super-Armor: in h um den vollen Schaden gesenkt, in h+1 wieder auf dem Wert vor diesem Treffer, nicht vor der Kette (z. B. 58 → 54 → 58), anders als „nie eine Zunahme“ in der Zeile S+0x40 oben (dort Demo und normale Gegner); beim Abfangen kommt in h+1 die Hälfte zurück (10 → 5, 9 → 5, 7 → 4). Mit 0 lebt der Boss weiter, tot erst unter 0. Die Wellen richten sich nach dem niedrigen Wert, auch dem vorübergehend gesenkten: EDDY 4/5 bei höchstens der Hälfte der Max-LP S+0xB7 (55 bei 110, 50 bei 100; in den Verhaltensläufen ausgelöst bei 49–54, nie bei 56–58), DICK bei höchstens einem Viertel (27 bei 110, 25 bei 100; ausgelöst bei 26–27) | `logs/boss.csv` („# A rang“, „# A start“, „# B treffer“, „# M treffer“, „# G fall“, „# F wellen“, „# M wellen“), `logs/boss_v.csv` („# V a rang“, `a_w*`, „# V b arten“, `t_lp0`, „# V f wellen“); Wellen auch `logs/verhalten.csv` (`wellen`: `m3_bot_h2`, `m3_bot_h3`), `logs/verhalten_v.csv` (`wellen`, Spalten `dolg_lp_*`, `v_d_bot_*`) | gesichert (Startwerte, Zeitpunkt, Rücksprung; Schwellen der Wellen und Abfangen: 3. Messung) |
| S+0x9A (DOLG) | 2 | Ergänzung (Nachtrag Boss): beim Boss immer 72, Maßstab der Lebensleiste, nicht die Max-LP (anders als bei den normalen Gegnern, Zeile S+0x9A oben; die Max-LP stehen in S+0xB7). Seine LP liegen damit ohne Eingriff über S+0x9A, ohne dass das Spiel anhält wie bei den Eingriffen auf die LP (Zeile S+0x9A „Ergänzung: Setzt ein Eingriff …“) | `logs/boss.csv` („# A start“), `logs/boss_v.csv` („# V a rang“, alle Läufe) | gesichert |
| S+0xB7 (DOLG) | 1 | Max-LP des Bosses (90 / 100 / 110 / 120), im selben Frame wie die LP geschrieben, bleibt im Kampf stehen | `logs/boss.csv` („# A start“), `logs/boss_v.csv` („# V a rang“, „# V f wellen“ Spalte `max_lp`) | gesichert |
| S+0x28 (DOLG) | 2 | Trefferfläche: 0 = nicht trefferbar. Jeder Treffer auf den Boss fiel in einen Frame mit gesetzter Fläche (1063 von 1063 bzw. 468 von 468, einige erst im Trefferframe gesetzt). Leer ab h+1 im Rückzug, von K bis nach dem Aufstehen und am Anfang einer Körperpresse ohne Vorphase; gesetzt bleibt sie in den eigenen Angriffen und (laut Gegenprüfer) während er die Figur hält | `logs/boss.csv` („# C schutz“, „# C schutz Treffer“), `logs/boss_v.csv` („# V c flaeche“, „# V b rueckzug“) | gesichert (Halten: unsicher, nur Gegenprüfer) |
| S+0xAE (DOLG) | 1 | Schutzzähler: 10 in G nach dem Aufstehen, 5 am Ende des Rückzugs (h+55), in A einer Körperpresse ohne Vorphase 32 (direkt aus der Zuck-Reaktion) bzw. 31 (einen Frame nach dem Gehen, so auch beim Gegenprüfer). Solange er läuft, bleibt S+0x28 leer; die Fläche kommt mit dem ersten Zellenwechsel der Animation nach seinem Ablauf zurück | `logs/boss.csv` („# C aufstehen“ Spalte `schutz_in_G`, „# C schutz“, „# M presse schutz“), `logs/boss_v.csv` („# V b rueckzug“, „# V c umwerfen“, „# V c ausbruch“) | gesichert (10 und 5; Presse: 3. Messung) |
| S+0x04 / S+0x05 (DOLG) | je 1 | Ergänzung (Nachtrag Boss), Zustand S+4 des Bosses: 1 frei (G = erster Frame mit 1), 3 Zuck-Reaktion (27 bzw. 15 Frames) und Taumeln nach dem Spezialangriff (78 Frames), 2 umgeworfen (K+1 bis G−1), beim Abfangen (Aktion 0x1E), während er die Figur hält und im Todesflug ab t+1. Slot 19 steht ab Stage-Beginn auf `0100` und trägt dann schon den Typ DOLG; beim Erreichen der Arena werden nur die LP geschrieben | `logs/boss.csv` („# M zucken“, „# M umwerfen“ Spalte `phasen`, „# C schutz“, „# G fall“), `logs/boss_v.csv` („# V c zittern“, „# V d einzelheiten“, „# V g fall“) | gesichert (Werte); unsicher (Typ ab Stage-Beginn: nur Gegenprüfer) |
| S+0x0A (DOLG) | 2 | Ergänzung (Nachtrag Boss), Aktion des Bosses: 0 Gehen, auch Zuck-Reaktion von vorn bzw. auf den gehenden Boss (27 Frames); 4 Warten, auch Reaktion auf Kettenstufe 2 von vorn; 6 Angriff (Vorphase in Phase 0/2), auch Zuck-Reaktion von hinten (15 Frames); 8 Rückzug nach einer Zurückweisung (h+1 bis h+54); 0x0C umgeworfen; 0x12 Taumeln nach dem Spezialangriff; 0x14 Flug nach einem Raketentreffer; 0x1E Abfangen | `logs/boss.csv` („# M zucken“, „# M zucken summe“, „# M stufe2“, „# M treffer“, „# M umwerfen“, „# C reaktion“, „# M presse schutz“), `logs/boss_v.csv` („# V c zittern“, „# V b rueckzug“, „# V c umwerfen“) | gesichert (Werte), unsicher (Deutung nach dem Verhalten) |
| S+0x1C (DOLG) | 4 | Ergänzung (Nachtrag Boss), Animationszeiger des Bosses, erster Frame eines Angriffs = A: kurzer Schlag `04A97E`, Armschwung `04A67C` (jeder Schwung), Ansturm Ausholen `04A6CA` (A; erstes Laufbild `04A26A` in A+20, ab dort aktiv), Körperpresse `04B842`, Griff `04ABDE`; Gehen ab `049EFA` | Kopf von `logs/boss_v.csv`, Abschnitte „# M stufe2“, „# M zucken“ in `logs/boss.csv`; Tabellen `ANIM_*` in `messen_boss.py` und `messen_boss_v.py` (unabhängig geschrieben, gleich) | gesichert (Beginn-Kennungen), unsicher (Bezeichnungen nach dem Verhalten) |
| S+0x96 / S+0x98 | je 2, vorzeichenbehaftet | Ergänzung (Nachtrag Fernangriffe der Gegner) zur Zeile S+0x96: Zielpunkt der Fernkämpfer vor dem Angriff. SKIP, Messerwurf: S+0x96 = Welt-x, S+0x98 = Tiefe eines Punkts 150 px vor der Figur in ihrer Tiefe (gesetzt mit Aktion 6, Phase 0x0A); Wurf, sobald x und Tiefe des SKIP je −9..+10 davon abweichen. SKIP, Stich: S+0x96 = ±64, S+0x98 = 0, relativ zur Figur (das „±64 beim SKIP“ der Zeile S+0x96); Stich bei höchstens 8 px Abweichung in x. DICK: S+0x96 = dx, S+0x98 = dz relativ zur Figur, ±128/0 oder ±120/±24; Angriff bei höchstens 8 px (x) und 6 px (Tiefe) Abweichung. Im Frame vor A steht beim DICK dort schon ein Wert nahe dem aktuellen Abstand mit Tiefe 0 | `logs/fern.csv` (`A abstand`, `A angriffe`, `T ausloesung`; Lesart: den Zielpunkt zeigt `T abstand` (Zeile `zielpunkt (dx,dz)`), die Abweichung beim Angriffsbeginn die Spalten `start_*` von `T ausloesung`, den Wert im Frame vor A deren Spalten `ziel_x`, `ziel_z`), `logs/fern_v.csv` (`wurf`, `stich`, `angriff_dick`) | gesichert (3. Messung; beim Raketen-DICK gesichert) |
| S+0xAB | 1 (ungerader Offset) | Salvenbudget des Pistolen-DICK, gesetzt in A: 20, 40, 60, 80, 100 oder 120 Frames. Schüsse der Salve = 1 + Anzahl k ≥ 0 mit 17k + 16 < Budget (2–6 oder 8), solange die Figur in Reichweite und Tiefe bleibt | `logs/fern.csv` (`T salve`: 63 natürliche Salven, `t_m22` A 4998, `t_kt_*`, Nachläufe `t_v7_g_r20`, `t_v7_z_r22` der V-Läufe `g_r20`, `z_r22`) | gesichert (3. Messung; Regel), offen (wovon der Wert abhängt) |
| S+0x0A / S+0x0C | je 2 | Ergänzung (Nachtrag Fernangriffe der Gegner), Aktion und Phase von SKIP und DICK: SKIP Aktion 6, Phase 0x0A = Zielpunkt für den Messerwurf gewählt. DICK Aktion 6, Phase 2 = Angriff (Tiefenangleich und Schüsse); Aktion 0, Phase 4 = Gehen ab A+17 nach jeder Rakete und jeder Salve; Aktion 4 = Stehen (`0677CE`); Aktion 2 = Pose ohne Angriff (30, 60, 90 oder 120 Frames) | `logs/fern.csv` (`A angriffe`, `A abstand`, `T nachschuss`), `logs/fern_v.csv` (`wurf`, `angriff_dick`, `dick_pose`) | gesichert (Werte), unsicher (Deutung) |
| S+0x1C | 4 | Ergänzung (Nachtrag Fernangriffe der Gegner) zur Zeile S+0x1C: Animationszeiger von SKIP und DICK. SKIP Messerwurf: `0289F2` (4 Frames, Beginn A), `028A2E` (3), `028A64` (1, Attribut 0xFF00), `028A9E` (1), `028AD8` (32), `028B12` (1); Gehen `0282F4`. DICK Pistole je Schuss: `068528` (5, Beginn A), `06855C` (1, 0xFF00), `068590` (10, Kugel), `0685C4` (1). Raketenwerfer: `0685F8` (5), `06862A` (1, 0xFF00), `06865C` (10, Rakete), `068690` (1). Gehen `067806`, Stehen `0677CE` bzw. `067760`, Pose `0686C4`, `0686FE`, `068730`, `068760`, `06878E`, `0687B8` | `logs/fern.csv` (`A angriffe`), `logs/fern_v.csv` (`wurf`, `stich`, `angriff_dick`, `dick_pose_folge`) | gesichert (Abläufe in beiden Messungen gleich), unsicher (Bezeichnungen nach dem Verhalten) |
| S+0x9A | 2 | Ergänzung (Nachtrag Fernangriffe der Gegner), Max-LP des DICK: 19 bei Rang 7, 20–23 bei Rang 8–15, 26–28 bei Rang 20–24; Gegenprüfer je Rang 8/9: 20, 12: 22, 14/15: 23, 17: 24, 18: 25, 20/21: 26, 22: 27, 24: 28 | `logs/fern.csv` (`F erscheinen`), `logs/fern_v.csv` (`erscheinen`) | gesichert |
| S+0x24 | 2 | Trefferattribut, Ergänzung (Nachtrag Rest der Spielfigur): Bit 0x8000 kennzeichnet Klingentreffer (SKIP Messerstich `8402` und Ausfallstich `8A02`, Gegner in Stage 5 `8002`; das geworfene Messer des SKIP trägt `0x0C08` ohne dieses Bit, siehe „Geschosse der Gegner“); stirbt die Figur daran, Neueinstieg t+107. Bit 0x0400 gibt der Figur bei einem Treffer von vorn die Reaktion 4; stirbt sie dabei, rollt sie (Neueinstieg t+151/152) | `logs/rest.csv` (Teil M3, `messen_rest.py todesart`: Spalten `attr`, `klinge`, `reaktion_t`, `klasse`) | gesichert (3. Messung) |
| S+0x5E | 1 | Blickrichtung des Gegners, Bit 0x20 (gesetzt = Blick nach rechts laut `rest_kette.lua`). Per EINGRIFF gesetzt bestimmt sie, wie weit die Kettenschläge hinter der Figur reichen; in seiner Trefferreaktion dreht der Gegner sich nicht um | `logs/rest.csv` (Teil M3, EINGRIFF `CC_GBLICK`: `rest_m3_f1_*`, `rest_m3_f1z_*`), `logs/rest_v.csv` (`rest_v_f1b_*`; Watch-Feld `s<n>_blick` in `rest_v_frei.lua`) | gesichert (Wirkung, 3. Messung), unsicher (Zuordnung des Bits nur aus dem Szenario) |
| S+0x40 | 2, vorzeichenbehaftet | Lebenspunkte, Ergänzung (Nachtrag Rest der Spielfigur): Ein Treffer genau auf 0 tötet nicht; der Gegner lebt mit 0 LP weiter (Trefferreaktion, Angriffe), Tod erst beim nächsten Treffer unter 0 (beim Boss ebenso, Zeile S+0x40 (DOLG)) | `logs/rest.csv` (Teil C, `rest_c_*`), `logs/rest_v.csv` (Teil C, `rest_v_c_*`) | gesichert |

### Objekte in Slot 20–59 (Gegenstände, Effekte)

Basis S = `FFBC90 + n·0xC0` wie bei den Gegnern (Nachträge vom 2026-10-02).

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| S+0x04 | 2 | 0x0101 liegt bzw. springt aus dem Behälter, 0x0201 fliegt als leer weggeworfene Waffe (nicht aufnehmbar, nach 61 Frames frei), 0x0000 frei | `item_f_waffe` 428–489, `item_a_laser` 151–212; `item_v_mis_leer` 93–153 | gesichert |
| S+0x04 | 2 | wechselt von 0x0101 auf 0x0100, wenn Kamera-x − x = 67 erreicht | `item_v_scroll` | unsicher (nur Gegenprüfer) |
| S+0x0E, +0x12, +0x16 | wie Gegner | x, Höhe, Tiefe | alle Läufe | gesichert |
| S+0x1C | 4 | Animationszeiger, je Art verschieden (MISSILE `0x9652A`, LASER `0x9658A`, HAMMER `0x965A4`, Brathähnchen `0x965C6`–`0x96614`) | Probe des Messagenten | unsicher |
| S+0x38 | 4 | Typkennung `0x95F9C` für alle Gegenstände (Waffen, Essen, SHURIKEN) | Abschnitte `objekte` und `bot` in `item.csv`, `katalog` in `item_v.csv` | gesichert |
| S+0x3D | 1 | Art: 0x00 GUN, 0x04 M-GUN, 0x08 MISSILE (Raketenwerfer), 0x0E SHURIKEN, 0x10 LASER, 0x12 HAMMER, 0x20 Brathähnchen, 0x22 TENDON, 0x24 und 0x2A Essen (Name offen), 0x2C CHERRY. Namen aus der Anzeigeleiste nach der Aufnahme | Bot-Kataloge `item_bot*` und `item_v_b*` | gesichert (Werte), Namen aus Snapshots |
| S+0x3D | 1 | 0x0C: Waffe mit 5 Schuss (Name offen) | `item_v_kiste_*`, Bot `item_v_b3` (Stage 4, x 480 und 544) | unsicher (nur Gegenprüfer) |
| S+0x60 | 2 | Liegezeit: 700 im Frame der Landung, danach −1 je Frame; bei Essen bleibt sie auf 700 | `item_a_liegen`, `item_f_fass`; `item_v_liegen` | gesichert |
| S+0xB1 | 1 | Munition bzw. Ladungen, die bei der Aufnahme übernommen werden; eine verlorene oder getauschte Waffe trägt ihren Rest | `item_f_verlust`, `item_a_tausch`; `item_v_mis_auf`, `item_v_s7h_auf` | gesichert |
| S+0x38 | 4 | Typ `0x98D64`: zerschlagbares Objekt in Slot 45–47 der Stage 1 (im Spezialangriff-Nachtrag Kiste genannt, Slot 46 in `spezial_drei_h2/h3`; laut Gegenstands-Nachtrag Glasscheiben mit LP 1) | `sd_kiste_h2`, `sd_kiste_h3`; `messen_spezial.py` (Ereignis `objekt_treffer`), Watch-Feld `typ` in `spezial_v_frei.lua` | gesichert (Wert), unsicher (Deutung) |
| S+0x40 | 2 | LP eines zerschlagbaren Gegenstands; ein Treffer des Spezialangriffs senkt sie und kostet die Figur 9 LP | `sd_kiste_h2`, `sd_kiste_h3` (Kiste); `spezial_v_beh_v60`, `spezial_v_beh_h30` (Behälter) | gesichert |
| S+0x38 | 4 | Typ `0x9974E` (Effekt, kein Gegenstand): Explosion des Spezialangriffs von Ginzu und Baby Head, in den Slots 53–59, an festen Stellen relativ zur Figur (vor ihr bei dx 88, 48, 64, 0, 16, dann 32, −16, −24); trifft statt der Figur, ohne Trefferstopp | RAM-Abzug der Läufe `h2_*`, `h3_*` (M4) | unsicher (nur M4; Zeiten und Bereiche der Treffer gesichert, siehe „Nachtrag: Spezialangriff“) |
| S+0x38 | 4 | Typ `0x9A988`: Waffe in der Hand eines DICK (beim Pistolen-DICK in Slot 58). Nach seinem Tod fliegt sie im Bogen und wird 44 Frames nach dem tödlichen Treffer (DICK am Boden) zum Gegenstand `0x95F9C`: GUN (Art 0x00) mit 5 Schuss bzw. MISSILE (Art 0x08) mit 3 Schuss. Zusammengeführt mit der früheren Zeile S+0x3A (unsicher, ein Fall): Der Bot des Gegenstands-Nachtrags protokolliert nur das untere Wort `0xA988` und sah denselben Ablauf einmal mit einem Raketenwerfer (3 Schuss) | `logs/fern.csv` (`E Waffe`, `E Bogen`, `T bogen`), `logs/fern_v.csv` (`tod`); `item_bot1` 6002–6114 (Bot-Protokoll) | gesichert |
| S+0x3D | 1 | Art der gehaltenen Waffe (Typ `0x9A988`): 0 Pistole, 4 Raketenwerfer. Andere Zählung als bei den Gegenständen `0x95F9C` (Zeile S+0x3D oben): nach der Landung Art 0x00 GUN bzw. 0x08 MISSILE | `logs/fern.csv` (`F erscheinen`), `logs/fern_v.csv` (`erscheinen`) | gesichert |

### Geschosse der Figur

G = `FFAD90` + k·0xC0 mit k = 0…4, Feldaufbau wie bei den Objekt-Slots.

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| G (k = 0…4) | 0xC0 je Block | fünf Blöcke für die Geschosse der Figur 1 (G+0x80 = k), vergeben ab k = 4 abwärts | `item_f_waffe`, `item_d_misfrei`, `item_d_las_*`, `item_d_mgun_*`; vom Gegenprüfer blind über die x-Position der Rakete gefunden (k = 4 zuerst) | gesichert |
| G+0x38 | 4 | Typ `0x1F9C0` für Rakete, Laserstrahl und Kugeln | wie oben | gesichert |
| G+0x24 | 2 | Trefferattribut: 0x1400 Raketenexplosion, 0x0C00 Laser und Kugeln; im Flug der Rakete 0 | wie oben | gesichert |
| ab `FFB150` | 0xC0 je Block | weitere Fünfergruppen, vermutlich für die anderen Spieler | – | unsicher |

### Behälter

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| S+0x38 | 4 | Typkennung `0x9DA2A` (Ölfass, Geldkassette, Kisten); auch die Trümmer beim Zerbrechen tragen diesen Typ (ohne LP 777) | `item_a_liegen`, `item_f_*`; Abschnitt `behaelter` in `item_v.csv` | gesichert |
| S+0x40 | 2 | Wert 777; ein Treffer senkt ihn um den Schaden (3 beim Schlag, 7 beim Sprungtritt) oder setzt ihn auf 0 (Rakete, Mech, EDDY-Schlag). Der Behälter zerbricht beim ersten Treffer | `item_f_*` 192; `item_v_fass44`, `item_v_fass_tritt`, `item_v_fass_rakete`, `item_v_mech` | gesichert |
| S+0x04 | 2 | 0x0101 steht, 0x0301 im Trefferframe, 0x0201 zerbrochen (fliegt weg, nach etwa 50 Frames frei) | `item_f_*`, `item_a_liegen`; `item_v_fass*` | gesichert |
| S+0x82 | 2 | Zeigerwort auf S+4 des Angreifers wie P+0x82 bei der Figur: die Figur oder ein Gegner-Slot (Mech: Slot 16, der Fahrer; EDDY: Slot 16) | `item_f_waffe` 501; `item_v_fass*`, `item_v_mech` 319 | gesichert |
| S+0x40 | 2 | LP des Behälters in Slot 43 der Stage 1 (ab `ingame`, Typ S+0x38 = `0x9DA2A`): 777; ein Treffer des Spezialangriffs senkt sie auf 771 | `spezial_v_beh_v60`, `spezial_v_beh_h30` (EINGRIFF: Behälter neben die Figur gesetzt) | unsicher (nur V4) |
| S+0x0E, S+0x16 (Slot 43: `FFDCDE`, `FFDCE6`) | 16.16 | x und Tiefe des Ölfasses. Seine Oberkante (Höhe 48) trägt die Figur beim Fall nach dem Neueinstieg, wenn das Fass 1 bis 16 px weiter hinten (Tiefe größer) und höchstens 35 px links bzw. 36 px rechts von ihr steht | `logs/rest.csv` (Teil M3, EINGRIFF `rest_m3_d4_fass_*`; natürlich Fass 44 in `rest_m3_d1_item_bot1_s1_cam01344`, `_cam01408`), `logs/rest_v.csv` (Fass 44: `rest_v_d_1281`, `_1281b`, `_1281n`) | gesichert (3. Messung) |

Stage 1 (Messagent): Geldkassetten in Slot 40–42 (x 2320–2384), Ölfässer in
Slot 43 (x 1520, Tiefe 172) und 44 (x 1480, Tiefe 184). Nebenbei:
Glasscheiben `0x98D64` (LP 1) in Slot 45–47, Gullydeckel `0x957C4` in Slot
38/39.

### Geschosse der Gegner

Basis S = `FFBC90 + n·0xC0` wie bei den Objekten (Nachtrag Fernangriffe der
Gegner, 2026-10-02). Das Messer des SKIP liegt
immer in Slot 29, Kugel und Rakete des DICK in einem der Slots 27–29, der im
Frame vor G frei ist (gesichert (3. Messung); Reihenfolge der Vergabe offen).

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| S+0x38 | 4 | Typ: `0x85B42` Messer des SKIP, `0x86022` Kugel und Rakete des DICK | `logs/fern.csv` (`A geschosse`, `T slots`), `logs/fern_v.csv` (`wurf`, `angriff_dick`, `rakete`) | gesichert |
| S+0x6C | 2 | Zeigerwort auf S+4 des Werfers (wie P+0x82 bei der Figur) | wie oben | gesichert (bisher nur im Absatz „Zuordnung“ des „Nachtrag: Schaden der Gegner“ erwähnt, ohne eigenen Beleg) |
| S+0x8B | 1 | Schaden des Geschosses; gleich dem LP-Verlust der Figur in allen Treffern | `logs/fern.csv` (`A geschosse`, `D Schaden je Rang`), `logs/fern_v.csv` (`bahn`, `dm_*`, `dk_*`, `dr_*`) | gesichert |
| S+0x24 | 2 | Trefferattribut: Messer 0x0C08 im ganzen Flug; Kugel abwechselnd 0x0002 (wirft nicht um) und 0x0C02 (wirft um); Rakete im Flug ohne Attribut, Explosion 0x1402 in G+20 bis G+29 (trifft G+21 bis G+29). Messer und umwerfende Kugel tragen Bit 0x0800 wie die umwerfenden Nahkampfangriffe (Zeile S+0x24 unter „Gegner“); die Explosion wirft die Figur immer um, aber ohne Bit 0x0800. Kein Geschoss trägt das Klingenbit 0x8000 | `logs/fern.csv` (`A geschosse`, `B Rakete`; Umwerfen durch die Rakete `d_r_*`), `logs/fern_v.csv` (`angriff_dick`, `rakete`, `brt1_*`, `dr_*`) | gesichert |
| S+0x1C | 4 | Animation: Kugel `0863D8` (normal) bzw. `0863F0` (umwerfend); nach einem Treffer Trefferfunke `095B5C` (12 Frames); Einschlag an der Arenawand `095Exx` (5–6 Frames; Gegenprüfer `095EAA`, `095EC4`, `095EDE`, `095EF8`); an Glas und Fass `095B06`, `095B20`, `095B3E` (9 Frames) | `logs/fern.csv` (`A geschosse`, `B Kugel`, `T bahnende`), `logs/fern_v.csv` (`kugel_ende`, `cmglas`, `cmfass`, `s_nat` 1399–1410) | gesichert (Kugel, Trefferfunke, Wand), unsicher (Glas und Fass, nur Gegenprüfer) |
| S+0x04 | 1 | Zustand 3 beim Messer, das ein Schlag der Figur getroffen hat: Es prallt im Bogen zurück (bis 66 px hoch), trifft nicht mehr und ist nach etwa 40 Frames frei | `logs/fern.csv` (`c_ms_*`, `c_ms20_*`), `logs/fern_v.csv` (`cms1_*`, `cms3_*`) | gesichert |

### Nebenbefunde aus Aufgabe 4

Diese Werte sind beim Suchen nebenbei angefallen. Laufen, Eingabelatenz,
Leerschlag, Schaden und Schutz sind inzwischen in Aufgabe 5 gemessen, der
Sprung im Nachtrag (siehe dort). Der Rest bleibt **unsicher**.

- Eingabelatenz: Eine Laufeingabe, die ab Frame f anliegt, ändert x bzw.
  Tiefe ab f+1 (`walk`, `walk_b`). Beim Sprung steht die Aktion ab f+1,
  die Höhe ab f+2.
- Laufen: x 1,75 px/Frame, Tiefe 1,0 px/Frame, diagonal x 1,25 und
  Tiefe 0,75 px/Frame. Die Tiefe ist bei 341 nach oben begrenzt (`walk`).
- Sprung im Stand: 40 Frames in der Luft (63–102), Scheitel 51 px,
  danach 6 Frames Landung. Sprung nach vorn: x +2,25 px/Frame, auch ohne
  gehaltene Richtung.
- Schlag ins Leere: Aktion 0x10 für 16 Frames (62–77 bei Eingabe 61).
- Kette gegen „WOOKY“ (16 LP): Schaden 3, 4, 5, 10, also vier Treffer
  bis zum Umfallen. In beiden Läufen gleich.
- Treffer gegen den Spieler: −5 LP (in `hurt` zweimal −6), danach 27 Frames S+4 = 3.
  Liegen 41 Frames Timer, Aufstehen 26 Frames nach Timer-Ende.
- Der erste Gegner wird genau 123 Frames nach Beginn des Rechtslaufs ab
  `ingame` aktiv (`attack`, `attack_b`, `hurt`, `hurt_b`).
- Demo: Nach einem Treffer auf alle Gegner gleichzeitig (4168) verliert
  P1 9 LP ohne Gegnertreffer (4176). Vermutlich kostet die Spezialattacke
  LP.

## Laufprotokoll

- 2026-10-01: Struktur, `.gitignore`, Skripte angelegt. ROM aus Drive
  geladen (nicht im Repo). Kein MAME-Lauf möglich (siehe Umgebung).
- 2026-10-01 (neuer Container): MAME 0.264 vorhanden (`/usr/games/mame`).
  ROM erneut aus Drive geladen. `-verifyroms`: nur PAL `ioc1.ic7` falsch,
  ZIP mit Unterordner wird akzeptiert. Alle vier Szenarien headless
  gelaufen. Fehler im Runner behoben (Savestate-Pfad). `coin_start` wählt
  jetzt Captain Commando, `walk` mit neuer Reihenfolge ohne
  Gegnerkontakt, `attack` mit Tiefenabgleich, damit die Schläge treffen.
  Determinismus geprüft (bitgleiche Abzüge). Erste x-Kandidaten gefunden.
- 2026-10-01 (Aufgabe 4): Objekttabelle und Spielerblock bestimmt.
  Neue Szenarien `jump`, `hurt` und die Gegenläufe `*_b`. Alle
  Kernadressen in den Gegenläufen blind wiedergefunden
  (`verify_b.sh`). Die Deutung von S+0x89 als Kombostufe wurde durch
  `attack_b` widerlegt, der echte Kombozähler ist S+0x9D im Spielerblock.
  Einen Fehler in `ramtools.py` behoben (Ausrichtung bei Breite 4),
  Filter `noinc`/`nodec` und Befehl `enemies` ergänzt.
- 2026-10-01 (Aufgabe 5): Alle sieben Messgrößen gemessen. Neue Szenarien
  `combo_c`, `hurt_c`, `kontakt`, `kontakt_b`, `schlag`, `leerschlag` und
  der gekennzeichnete Eingriff `schutz_eingriff` (Runner-Feld `pokes`).
  Neue Adressen: Figur `FFAA34`, Start-LP der Gegner S+0x9A. Alle Läufe mit
  `laeufe_a5.sh` von vorn wiederholt: Ergebnisse und A4-Belege identisch.
- 2026-10-01 (Aufgabe 6): Gesicherte Werte nach `docs/mechanik.md`
  übernommen, mit Verweisen auf diese Notizen und die Logausschnitte.
- 2026-10-01 (Nachtrag): Sprung und Schlagreichweite gemessen. Neue
  Szenarien `sprung_c`, `sprung_d`, `anlauf_b`, `anlauf_c`, neue
  Savestates `anlauf` und `tiefe_b`, `schlag.lua` mit `CC_VERT`.
- 2026-10-02 (Einrichtung): Neuer Container. Das ROM kam diesmal als Upload
  des Nutzers (die Sitzung durfte den Drive-Download nicht als Datei
  ablegen), 2.577.865 Bytes, `testzip` fehlerfrei, `-verifyroms` wie bisher
  nur `ioc1.ic7`. Savestates mit `laeufe_a5.sh` und `laeufe_a7.sh` neu
  erzeugt, dazu `stage1` bis `stage9` und `held0`, `held2`, `held3` aus
  `stage_start.lua` (in `stage9` hat die Figur beim Speichern 62 LP).
  Funktionsprüfung `messen_a5.py treffer logs/raw/attack`: Kette 3, 4, 5,
  10. Arbeitsweise der folgenden Nachträge: je Thema ein Messagent, ein
  unabhängiger Gegenprüfer (eigene Szenarien, liest die des Messagenten erst
  danach) und bei Abweichungen eine dritte Messung des Messagenten mit einer
  dritten Variante; Einarbeitung mit je einem Entwurfs- und einem
  Prüfagenten.
- 2026-10-02 (Trefferreaktion der Gegner): Der Messagent hat das neue
  Szenario `reaktion.lua` angelegt, dazu die Auswertung `messen_reaktion.py`
  (Unterbefehl `gegnerreaktion` auch in `messen_a5.py`) und das Belegskript
  `belege_reaktion.sh` (285 Läufe ab `kontakt` und `kontakt_b`). Der
  Gegenprüfer hat mit eigenem Szenario `reaktion_v_frei.lua` und
  `messen_reaktion_v.py` ab `anlauf`, `anlauf_b` und `anlauf_c` nachgemessen
  (66 Läufe als Schlussteil des Belegskripts). Ergebnis: 24 von 29 Zeilen
  bestätigt, 5 abweichend (aktiver Schlag des WOOKY nach der Reaktion;
  Liegen, K bis G und Verhalten nach dem Aufstehen beim EDDY; Tod durch
  Stufe 2 und Wurf). Diese fünf hat der Messagent ein drittes Mal gemessen:
  33 Läufe `dr_*` aus `tiefe_b` und dem neuen Savestate `reaktion_w3`, den
  das Skript im Lauf `dr_setup` aus `ingame` anlegt. Zusammen sind es 319
  Läufe mit `reaktion.lua`. Alle fünf Abweichungen sind durch gemeinsame
  Regeln erklärt. Unsicher bleiben die Wahl des WOOKY-Schlags (die
  Gegenprüfung zeigt in `c_zwei_b` auch nach einem einzelnen Treffer den
  langsamen Schlag), die Liegedauer des EDDY im Einzelfall, Aktion 0x1C und
  der Tod an einer Wand. Vor der dritten Messung lief das Belegskript beim
  Gegenprüfer dreimal von vorn: `reaktion.csv` war dreimal bitgleich
  (`693f2f56…`), `reaktion_v.csv` zweimal gleich (`698463…`). Danach lief es
  ganz von vorn in 4 min 21 s mit Exit 0 (`reaktion.csv` `3b606a30…`,
  `reaktion_v.csv` unverändert). Die gesicherten Werte stehen in
  `docs/mechanik.md` („Trefferreaktion der Gegner“).
- 2026-10-02 (Verhalten der Nahkämpfer): Ein Messagent hat das Verhalten von
  WOOKY und EDDY in Stage 1 gemessen, ein Gegenprüfer hat es unabhängig
  gegengeprüft (21 von 33 Zeilen bestätigt, 12 abweichend). Die Abweichungen
  hat der Messagent ein drittes Mal gemessen: 8 erklärt eine gemeinsame
  Regel, 2 nur teilweise (A4-Pause als Spanne, B3 qualitativ), 2 bleiben
  unsicher. Neu sind die Szenarien `verhalten`, `verhalten_huelle`,
  `verhalten_bot`, `verhalten_v_frei` und `verhalten_v_bot`, die
  Auswertungen `messen_verhalten.py` (17 Unterbefehle) und
  `messen_verhalten_v.py` (14) sowie das Belegskript `belege_verhalten.sh`
  (220 Läufe, etwa 15 min; der Skriptkopf nennt 25 min). `grafik/bot.lua`
  hat die neue Option `angriff = false`, der Standard ist unverändert.
  Zusätzlich genutzt werden die Savestates `stage1`, `held0`, `held2` und
  `held3` aus `stage_start.lua`. Beantwortet: Die Gegner greifen in den
  natürlichen Schutzfenstern an, die Treffer werden ignoriert. Offen bleibt
  der Widerspruch zum Eingriff `schutz_eingriff`. Korrigiert: Stage 1 hat
  Kamerahalte bei 848 und 1376–1378, abhängig von der Zahl der lebenden
  Gegner. Die letzte Welle kommt auch ohne Eingriff, sobald die LP des DOLG
  etwa auf die Hälfte fallen (ausgelöst bei 49–54). Den „Griff mit Knie“ des
  WOOKY gibt es nicht, dafür hat der WOOKY mit W-E einen dritten normalen
  Angriff. Reproduzierbarkeit: Den Teil des Messagenten hat der Gegenprüfer
  wiederholt, `logs/verhalten.csv` blieb MD5-gleich
  (`68a048eda65b7451870503f7d99a93b7`). Der Gesamtlauf endete mit Exit 0 und
  schrieb beide CSVs neu. `logs/verhalten_v.csv` hat danach dieselbe
  Zeilenzahl (1017) wie beim Gegenprüfer; ein MD5 seines Stands ist nicht
  festgehalten. Die Endfassung von `logs/verhalten.csv`
  (`0b35920d6035d921fa7ad6554b68217e`) ist erst einmal erzeugt. Der
  Gegenprüfer hat versehentlich einmal `pkill` auf MAME abgesetzt; alle
  Skripte liefen danach vollständig durch.
- 2026-10-02 (Reichweite der Gegnerangriffe): Neues Belegskript
  `belege_greichweite.sh` mit den Szenarien `greichweite_angriff` (über
  `rang.lua`) und `greichweite_v_frei`. Ausgewertet wird mit
  `messen_greichweite.py` (Unterbefehle `gegnerangriff` und
  `gegnerzusammenfassung`, auch in `messen_a5.py` registriert) und
  `messen_greichweite_v.py`. Die erste Messung umfasst 494 Läufe (EINGRIFF
  Rang 12 und LP der Figur, Figur ab dem ersten aktiven Frame gesetzt). Die
  Gegenprüfung (6 natürliche Läufe, 32 Savestates `greichweite_v_*`, 272
  Proben, davon 11 ungültig) bestätigte 19 von 40 Zeilen, wich bei 21 ab und
  fand das Abbruchfenster [Ziel − 31, Ziel + 32] um S+0x96. In der dritten
  Messung (Figur bis A−1 bei dx 25 bzw. −30 gehalten, 13 Quellen
  `W3*`/`E3*`, acht natürliche Läufe `lang3_*`) ließen sich alle 21 als
  Regel bzw. Spanne erklären. Der Gesamtlauf (565 Läufe plus Teil V) dauerte
  18:46 min ohne Fehlermeldung. `greichweite_v.csv` blieb unverändert (MD5
  `a445db13356f818e2f1b3624fe2b119d`). Der Stand der ersten Messung war
  zweimal MD5-gleich, die Endfassung von `greichweite.csv` (MD5
  `a26f20bc11cfc6f019ecdb935a4e546c`, 1536 Zeilen) ist erst einmal erzeugt.
  Für DICK legt `greichweite_bot.lua` die Savestates `greichweite_dick` und
  `greichweite_dick2` an; auf die passive Figur gab es keinen Schuss. Neu im
  Adressteil: S+0x96 sowie S+0x1C mit den Angriffsanimationen (bisher nicht
  in notes.md); präzisiert ist S+0x24. Vorgeschlagen, aber nicht
  stillschweigend übernommen: Änderungen an zwei mechanik.md-Zeilen
  („Reichweite der Gegnerschläge“, Workflow, Tiefe nach hinten; „Auslöser“,
  meist der dritte einer Serie).
- 2026-10-02 (Spezialangriff): Spezialangriff aller vier Figuren gemessen
  (Messagent M4, 498 Läufe mit `spezial_probe.lua`, davon 10 für Savestates
  und 108 der dritten Messung `d3_*`) und unabhängig gegengeprüft (V4, 361
  Läufe, davon 7 für Savestates, mit eigenem Szenario `spezial_v_frei.lua`
  und eigener Auswertung `messen_spezial_v.py`, nur Watch-Protokoll). V4
  bestätigte 28 von 31 Zeilen. Die drei Abweichungen (Reichweite Stufe 3
  vorn beim WOOKY, Bewegung von Mack, Bereiche der Explosionen von Ginzu und
  Baby Head) erklärte die dritte Messung jeweils durch eine gemeinsame
  Regel. Neue Skripte: `belege_spezial.sh`, `messen_spezial.py`,
  `messen_spezial_v.py` und der Unterbefehl `messen_a5.py spezial`. Neue
  Savestates: `spezial_h0` bis `spezial_h3`, `spezial_drei`,
  `spezial_drei_h0/h2/h3`, `spezial_h2_anlauf`, `spezial_h3_anlauf`,
  `spezial_v_viele`, `spezial_v_viele0/2/3`, `spezial_v_h0/h2/h3`. Vor der
  dritten Messung war `spezial.csv` dreimal bitgleich (MD5 `11b116a5…`;
  Laufzeit laut V4 493 s, mit V4-Block 724 s). Die Fassung mit `d3_*` (MD5
  `93c5a756…`) stammt aus einem einzigen vollen Durchlauf (laut Dateizeiten
  etwa 15 min mit V4-Block). Dabei wurden alle 17 Savestates neu
  geschrieben, `spezial_v.csv` blieb bitgleich (`c1abf3d2…`). Neue Bedeutung
  des Timers `FFAA69`: Er schützt auch bei S+4 = 1 (20 Frames nach dem
  Spezialangriff). Die LP `FFA9D0` fallen auch durch die Kosten des
  Spezialangriffs. Überholt: der Kostenzeitpunkt des Captains in
  `grafik/README.md` (8 statt 13 Frames nach dem Treffer) und der
  Workflow-Wert „etwa 50 Frames geschützt“ in `docs/mechanik.md` (richtig
  sind 70). Zu prüfen in `docs/mechanik.md`: „Landung nicht abbrechbar“ gilt
  nicht für einen Sprungdruck. Außerdem ist der Bezugspunkt der Flugweite
  „etwa 158 px“ beim Spezialangriff im Griff ungeklärt.
- 2026-10-02 (Sprint): Sprint, Sprintangriff, Sprintsprung und
  Sprint-Sprungangriff gemessen, vom Messagenten M4, vom Gegenprüfer V4 und
  mit einer dritten Messung zu den fünf Abweichungen. Neues Belegskript
  `belege_sprint.sh` mit 307 Läufen von M4 (`sprint_probe.lua`, davon 120
  der dritten Messung) und 180 Läufen von V4 (`sprint_v_frei.lua`). Es
  braucht `spezial_drei` und `spezial_v_viele` aus `belege_spezial.sh`. Neu
  ist der Unterbefehl `messen_a5.py sprint`; Umsetzung und
  `zusammenfassung-sprint` stehen in `messen_spezial.py`. V4 wertet mit
  `messen_spezial_v.py` aus. Neue Aktionswerte P+0x0A: 0x02, 0x04, 0x06,
  0x08. Gefunden wurde ein Fehler des Spiels beim Diagonalsprint nach
  rechts. Die dritte Messung klärte die Tiefe am Rand, die Bedingung fürs
  Rutschen, den Scheitel, A+13 und die Reichweite in A+20. Unsicher bleibt
  die Reichweite des Sprint-Sprungangriffs nach A+20. Das Tempo in der Tiefe
  ist nur bis Sprintframe 41 gemessen, weil jeder Lauf vorher den Rand
  erreichte. `sprint.csv` war vor der dritten Messung in drei Durchläufen
  bitgleich (MD5 `c16a94f1…`). Danach ist sie neu (MD5 `4f2b5e93…`) und
  stammt aus nur einem Durchlauf. `sprint_v.csv` ist in zwei Durchläufen
  bitgleich (MD5 `8af4f226…`). Korrekturen an `grafik/README.md`: Der
  Sprintangriff ist 10 statt 23 Frames aktiv. Sein Weg hängt vom Sprinttempo
  ab (gemessen 32,8125–50 px) und ist nicht fest 41 px. Der Sprintweg ist
  267,875 statt 266 px.
- 2026-10-02 (Gegenstände und Waffen): Messagent, Gegenprüfer und dritte
  Messung zu Aufnehmen, Essen, Waffen, Behältern und Punkten. Neue Szenarien
  `item_frei`, `item_bot` (Konfiguration für `grafik/bot.lua`),
  `item_v_frei` und `item_v_bot`. Neue Auswertungen `messen_item.py` (für
  die dritte Messung um `griff` ergänzt) und `messen_item_v.py`. Belegskript
  `belege_item.sh` (486 Läufe, 14 min) mit `logs/item.csv` und
  `logs/item_v.csv`. Der Gegenprüfer bestätigte 32 von 42 Zeilen, 8 wichen
  ab, 2 waren nicht prüfbar. Die dritte Messung (Teil W, `item_d_*`) erklärt
  die Abweichungen größtenteils durch gemeinsame Regeln. Unsicher bleiben
  dabei: der Aufnahmebereich des Raketenwerfers rechts (35 bzw. 37 px), die
  größte Laserreichweite (Messagent 287/310, Gegenprüfer 350, dritte Messung
  275 nicht), der Laser beim Tod des ersten Gegners und der SKIP-Grundwert
  (250 oder 300, in allen drei Messungen auch nach Kettenschlägen).
  Korrigiert: Aufnahmebereich rechts (die +18 waren ein Artefakt, die Figur
  wurde im Sweep umgeworfen) und Angriff im Griff mit Waffe (Kniestoß;
  „keine Aktion“ kam von einem Eingriff ohne Max-LP). Neue Adressen:
  Gegenstände (Typ `0x95F9C`, Art S+0x3D, Munition S+0xB1, Liegezeit
  S+0x60), Behälter (`0x9DA2A`, LP 777, Angreiferzeiger S+0x82),
  Geschossblöcke der Figur ab `FFAD90`, Waffenfelder der Figur (`FFAA08`,
  `FFAA09`, `FFAA0A`, `FFAA41`), Griff `FFA999` = 4, Aktionen 0x12 und 0x16.
  Die Punkte stehen in `FFAA74` (4 Byte BCD), `FFAA76` ist deren untere
  Hälfte. Reproduzierbarkeit: `logs/item.csv` Teil A–D fünfmal bitgleich
  (MD5 `574147291edef99ae2001c6eedaeefe1`), mit Teil W
  `f7d18ababf1709e03f7f40a5a4eeb111` (erste 755 Zeilen unverändert);
  `logs/item_v.csv` bitgleich (`c739e85610703b8fceda7d2e3f083b35`). Zu den
  bestehenden Werten in docs/mechanik.md gibt es keinen Widerspruch.
- 2026-10-02 (Gegenprobe vor der Übernahme): Alle sechs neuen Belegskripte
  (`belege_reaktion.sh`, `belege_verhalten.sh`, `belege_greichweite.sh`,
  `belege_spezial.sh`, `belege_sprint.sh`, `belege_item.sh`) liefen noch
  einmal von vorn, in zwei parallelen Spuren, jeweils mit Exit 0 (Laufzeiten
  194 s, 658 s, 590 s, 688 s, 324 s, 408 s). Alle zwölf CSV-Dateien waren
  danach bitgleich mit dem Stand davor (MD5 `reaktion.csv` `3b606a30…`,
  `reaktion_v.csv` `69846372…`, `verhalten.csv` `0b35920d…`,
  `verhalten_v.csv` `89a7a882…`, `greichweite.csv` `a26f20bc…`,
  `greichweite_v.csv` `a445db13…`, `spezial.csv` `93c5a756…`,
  `spezial_v.csv` `c1abf3d2…`, `sprint.csv` `4f2b5e93…`, `sprint_v.csv`
  `8af4f226…`, `item.csv` `f7d18aba…`, `item_v.csv` `c739e856…`). Damit ist
  jede Endfassung zweimal identisch erzeugt. Danach `logs/raw/` bis auf die
  Savestates geleert. Die Einarbeitung in diese Notizen und in
  `docs/mechanik.md` haben je Thema ein Entwurfs- und ein Prüfagent gegen
  die Entwürfe von Messagent und Gegenprüfer abgeglichen.
- 2026-10-02 (Einrichtung Auftrag 2): Derselbe Container wie am Vormittag, ROM und Savestates noch vorhanden. Neu angelegt per Durchlauf-Bot durch Stage 1 (`CC_NAME=p0_s1 GFA_CFG=scripts/grafik/durchlauf.lua GFA_SAVE_CAM=256 … scripts/grafik/bot.sh stage1`, **EINGRIFF**: LP der Figur aufgefüllt, bei Stillstand LP der Gegner auf 1) die Savestates `p0_s1_s1_cam00256` bis `p0_s1_s1_cam02048` und `p0_s1_s2_cam00256` (Namen mit führenden Nullen). Prüfung in `p0_s1_s1_cam02048`: Boss in Slot 19, LP 110, S+0x9A = 72, Rang 16.
- 2026-10-02 (Boss DOLG): Messagent M6, Gegenprüfer V6 und dritte Messung zum Boss der Stage 1. Neu sind die Szenarien `boss_frei`, `boss_v_frei` und `boss_v_bot` (Konfiguration für `grafik/bot.lua`), die Auswertungen `messen_boss.py` (Unterbefehl `dritte` für Teil M) und `messen_boss_v.py` sowie das Belegskript `belege_boss.sh` (923 Läufe des Messagenten einschließlich 344 der dritten Messung, 484 der Gegenprüfung) mit `logs/boss.csv` und `logs/boss_v.csv`. Neue Savestates: `boss_q_p`, `boss_q_r`, `boss_q_b`, `boss_q_m`, beim Gegenprüfer `boss_v_b1_s1_cam*`, `boss_v_allein`, `boss_v_rakete`, `boss_v_laser`, `boss_v_r9`; gebraucht werden außerdem die Phase-0-Savestates `p0_s1_s1_cam01536`, `p0_s1_s1_cam01793`, `p0_s1_s1_cam02048`. V6 bestätigte 33 von 57 Zeilen, 22 wichen ab, 2 waren nicht prüfbar; die dritte Messung (Teil M aus `boss_q_m`, Boss in Tiefe 208, meist Rang 20, beide Blickrichtungen) erklärte 20 der 24 durch gemeinsame Regeln. Mit der in Griff und Wurfweite geteilten Griff-Zeile: 58 Zeilen, 30 gesichert, 20 gesichert (3. Messung), 8 unsicher, dazu 3 offene. Korrigiert: Die Super-Armor betrifft auch Kettenstufe 3 und umwerfende Treffer (Abfangen mit halbem Schaden), die LP springen auf den Wert vor dem jeweiligen Treffer, der „Abbruchstoß“ ist harmlos; die Boss-LP hängen vom Rang beim Erreichen der Arena ab (90 bis 120); der zweite DICK kommt nur ab Rang 16 und bei höchstens drei anderen lebenden Gegnern. Mit Skript bestätigt: der Workflow-Schaden des Bosses (für Rang 12 bis 24, darunter weniger) und beim Boss der Gleichstand zugunsten der Figur. Reproduzierbarkeit: Vor Teil M lief das Skript beim Gegenprüfer zweimal ganz von vorn (19 min 32 s und 16 min 47 s, Exit 0), `boss.csv` (`c4f6c794…`, 3442 Zeilen) und `boss_v.csv` (`06e9648e…`, 1508 Zeilen) jeweils bitgleich; dabei behoben: zwei Savestates im selben Frame (`boss_v_allein` jetzt aus eigenem Bot-Lauf); das fehlende Aufräumen von `boss_a2_*` (Hinweis des Gegenprüfers) hat der Messagent danach behoben. Mit Teil M lief es zweimal ganz von vorn, beim Messagenten in 21 min 3 s (Exit 0; Teil des Messagenten 801 s, Teil V 458 s) und in der Gegenprobe der Einarbeitung in 18 min 38 s (Exit 0, `BOSS_JOBS=3`, `BOSS_V_JOBS=2`; 718 s und 398 s): `boss.csv` MD5 `3a051470fa672c786c5635677ec5c8f6` (4422 Zeilen) und `boss_v.csv` MD5 `06e9648e3d91b068a8ba4bfabd02be66` (1508 Zeilen) beide Male bitgleich. Danach enthält `logs/raw/` nur Savestates. Neu im Adressteil: beim Boss S+0x9A (Balkenskala), S+0xB7 (Max-LP), S+0x28 (Trefferfläche), S+0xAE (Schutzzähler), Zustände S+4, Aktionen S+0x0A und Angriffsanimationen S+0x1C.
- 2026-10-02 (Fernangriffe der Gegner): Messagent M7, Gegenprüfer V7 und dritte Messung zu Messerwurf und Stichserie des SKIP sowie Pistole und Raketenwerfer des DICK in Stage 1. Neues Belegskript `belege_fern.sh` mit drei Blöcken: M7 mit `fern_frei.lua` (etwa 1100 Läufe), V7 mit `fern_v_frei.lua` und `fern_v_bot.lua` (358 Läufe), dritte Messung `fern_t_*` (367 Läufe). Neue Auswertungen `messen_fern.py` (für die dritte Messung um `ausloesung`, `salve`, `nachschuss`, `slots`, `bahnende`, `welle`, `bogen`, `fenster` ergänzt) und `messen_fern_v.py`. Belege: `logs/fern.csv` und `logs/fern_v.csv`. V7 bestätigte 37 von 55 Zeilen, 18 wichen ab (6 nur im Randwert). Die dritte Messung (Ränge 7–24, beide Flugrichtungen, andere Lagen, Eingabe-Bot `CC_HIN`) erklärt 13 davon durch gemeinsame Regeln: Trefferflächen in Weltkoordinaten (das gespiegelte Fenster rückt um 1 px), Auslösung über die Zielpunkte S+0x96/S+0x98, Salvenlänge aus dem Budget S+0xAB, nach der Rakete immer zuerst Gehen, zweiter Raketen-DICK nach Rang und Zahl der Gegner, Bogen der Waffe relativ zur Höhe des DICK. Von den 18 bleiben 5 unsicher: die Raten der drei Fernangriffe sowie Abstandsanteile und Rückzug des DICK. Korrigiert: Salven haben 2–6 oder 8 Schüsse (früher Abbruch 1–7); „Danach meist Stehen“ beim Raketen-DICK war die Phase 4; die Pistole macht bei Rang 7 nur 4 LP (Workflow-Wert 5–7 in docs/mechanik.md). Beim Einarbeiten erkannt: Alle drei Messungen lösen die Wellen der Bossarena per DOLG-LP in einem Schritt aus und trennen die Schwellen bei der Hälfte und beim Viertel nicht. Gekennzeichnet sind Widersprüche bzw. Einschränkungen zu zwei gesicherten Zeilen: SKIP-Stiche „alle 37 bis 49 Frames“ (auch 51 und 53 kommen vor) und „DICK (zwei)“ (ein zweiter DICK nur ab Rang 16). Neue Adressen: Zielpunkt S+0x96/S+0x98 von SKIP und DICK, Salvenbudget S+0xAB, Geschosse der Gegner in Slot 27–29 (Typ `0x85B42` bzw. `0x86022`, Werfer S+0x6C, Schaden S+0x8B), Waffe in der Hand des DICK (`0x9A988`, Art 0 bzw. 4). Läufe und Reproduzierbarkeit: zwei Vollläufe mit Exit 0 (22 min 23 s, 17 min 50 s). `logs/fern.csv`: 4315 Zeilen, MD5 `bb1260429a9a366f82b18439017d6e2c`; ohne den im zweiten Lauf ergänzten Abschnitt `E Bogen` ist die Datei bitgleich mit dem ersten Lauf, und ihre ersten 2802 Zeilen (ohne `E Bogen`) sind gleich dem Stand vor der dritten Messung (`7baee55e…`). `logs/fern_v.csv`: 1281 Zeilen, MD5 `b209e1f2b366e1eb0636a7d02162bc61`, gleich dem Volllauf von V7. Gegenprobe beim Einarbeiten: dritter Volllauf von vorn mit Exit 0 in 13 min 7 s, beide MD5 gleich. Die Savestates `fern_*`, `fern_v_*` und `fern_t_*` bleiben lokal. Voraussetzung sind die Phase-0-Savestates `p0_s1_s1_cam00768` und `p0_s1_s1_cam02048`.
- 2026-10-02 (Rest der Spielfigur): Der Messagent M8 hat mit den neuen Szenarien `rest_kette`, `rest_sprung` und `rest_frei` gemessen. Teil A misst den Nachlauf der Kettenstufen 2–4, Teil B den Sprungangriff hoch und runter, Teil C Gegner mit genau 0 LP, Teil D Tod und Neueinstieg der Figur, Teil E den Rang beim Stage-Wechsel (Durchlauf-Bot) und Teil F sechs Nachprüfungen. Ausgewertet wird mit `messen_rest.py` (13 Unterbefehle). Der Gegenprüfer V8 hat ab anderen Savestates nachgemessen, mit eigenem Szenario `rest_v_frei` (nur Watch-Protokoll), der Bot-Konfiguration `rest_v_bot` und `messen_rest_v.py`. Er bestätigte 37 von 40 Zeilen. Ab wichen D1 (Tod durch den Mech: Neueinstieg t+108), D4 (Landung auf einem Ölfass nach 49 statt 52 Frames) und F1 (Kettenschläge hinter der Figur). Die dritte Messung (Teil M3, `rest_m3_*`) hat alle drei durch Regeln geklärt. Der Neueinstieg richtet sich nach der Todesart (normal t+120, Rollen t+151/152, Wand t+108, Klinge t+107; 23 Tode an Stellen in Stage 1, 4, 5 und 9). Die Figur fällt bis auf den Untergrund unter ihr (Boden 52, Ölfass 49 Frames). Hinter der Figur entscheidet die Blickrichtung des Gegners. Das Belegskript `belege_rest.sh` (Teile A–F, M3, V; laut seinen Aufrufen 3066 MAME-Läufe) lief von vorn in 28 min 48 s mit Exit 0. Dabei entstand `rest.csv` `6b202b9f…` (2617 Zeilen, erst einmal erzeugt), `rest_v.csv` `793f6f92…` (1861 Zeilen) blieb unverändert. Vor der dritten Messung lief es beim Gegenprüfer zweimal von vorn (1251 s ohne, 1094 s mit Teil V), und `rest.csv` war beide Male bitgleich mit der Datei des Messagenten (`7c4b5371…`). Neue Savestates sind `rest_e_r8`, `rest_e_r24` und `rest_v_e_vor`. Das Skript braucht dazu die Phase-0-Savestates `p0_s1_*` sowie Savestates aus `belege_item.sh`, `belege_greichweite.sh`, `belege_reaktion.sh` und `stage_start.lua`. Mit Skript bestätigt sind auch die bisherigen Workflow-Werte Rang −3 beim Stage-Wechsel, „Treffer in der Luft werfen um“ (mit WOOKY und EDDY) und gleichzeitiger Treffer. Gesichert sind jetzt auch die bisher unsicheren Werte Mindestabstand, Reichweite von hoch und runter, Blick links 1 px kürzer und Richtung beim Kettendruck. Neue Adressen: Leben `FFAA7C`, Stage-Index `FFA8CE`, Rangzähler `FFF82C`, Kamera-y `FFA830` und die Blickrichtung S+0x5E des Gegners. `FFAA69` steht nach dem Neueinstieg in L auf 200, und das Trefferattribut-Bit 0x8000 kennzeichnet Klingen. Bei der Einarbeitung fielen in nicht ausgewerteten Spalten von Teil M3 drei Punkte auf, die jetzt als unsicher geführt sind. Die Flugweite beim Klingentod ist nicht einheitlich (62,375 px beim SKIP, 171,625 px in Stage 5). Zwei Läufe zeigen einen Gegnerangriff zwischen Tod und Erscheinen. Stage 4, 5 und 9 zeigen denselben Schutz wie Stage 1. Unsicher bleiben damit neun Einzelwerte. Offen sind überlagerte Todesarten, weitere Untergründe, die Landung gegen schwache und ferne Gegner und der Schutz bei anderen Figuren.
- 2026-10-02 (Gegenprobe vor der Übernahme, Auftrag 2): Die drei neuen Belegskripte liefen noch einmal von vorn, nacheinander und mit Exit 0: `belege_boss.sh` in 1118 s (`BOSS_JOBS=3 BOSS_V_JOBS=2`, parallel zur dritten Messung des Fernkampfs), `belege_rest.sh` in 984 s und `belege_fern.sh` in 787 s. Alle sechs CSV-Dateien waren danach bitgleich mit dem Stand davor: `boss.csv` `3a051470…`, `boss_v.csv` `06e9648e…`, `rest.csv` `6b202b9f…`, `rest_v.csv` `793f6f92…`, `fern.csv` `bb126042…`, `fern_v.csv` `b209e1f2…`. Damit ist jede Endfassung mindestens zweimal identisch erzeugt. Danach `logs/raw/` bis auf die Savestates geleert. Arbeitsweise wie in Auftrag 1: je Thema ein Messagent, ein unabhängiger Gegenprüfer und bei Abweichungen eine dritte Messung des Messagenten; die Einarbeitung in diese Notizen, `docs/mechanik.md` und `docs/erkenntnisse.md` haben je Thema ein Entwurfs- und ein Prüfagent gegen die Entwürfe abgeglichen, danach prüften weitere Agenten die zusammengesetzten Dokumente.
