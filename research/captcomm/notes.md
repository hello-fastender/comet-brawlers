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
- **gesichert (Workflow)**: von mindestens zwei Agenten eines Workflows unabhängig gemessen und gegengeprüft, Läufe aber nur im Scratchpad der Sitzung (nicht mit einem Skript im Repo nachvollziehbar)
- **offen**: noch nicht gemessen

## Stand (2026-10-01)

| Aufgabe | Status |
|---|---|
| 1. Ordnerstruktur, `.gitignore` | erledigt |
| 2. `mame -verifyroms captcomm -rompath roms` | erledigt: alle Programm-, Grafik- und Sound-ROMs korrekt, nur ein PAL-Dump weicht ab (für die Emulation unerheblich, siehe unten) |
| 3. Headless-Lauf mit Lua (Demo, Münze/Start/Laufen/Schlagen) | erledigt: alle vier Szenarien laufen, kalibriert, bitgleich reproduzierbar |
| 4. Speicheradressen | erledigt: x, Tiefe, Höhe, LP Spieler und Gegner, Aktion, Kombostufe, Timer gesichert (blind in variierten Gegenläufen wiedergefunden). Gegnerzahl aus der Objekttabelle gezählt (kein eigener Zähler im RAM). Bedeutung einzelner Statuswerte unsicher, siehe „Gefundene Adressen“ |
| 5. Messungen | erledigt: alle sieben Messgrößen gesichert (Captain Commando), dazu Kombo-Fenster und Trefferstopp. Offen bleibt nur, *wie* der Schutz wirkt (Treffer ignoriert oder Gegner greift nicht an), siehe „Messungen“ |
| 6. Übernahme gesicherter Werte nach `docs/mechanik.md` | erledigt: alle gesicherten Messwerte aus Aufgabe 5 sowie Eingabelatenz, Trefferstopp, Kombo-Fenster, Liegedauer und Lebenspunkte; nach dem Nachtrag auch Sprung und Schlagreichweite. Unsichere Punkte stehen dort unter „Nicht übernommen“ |
| 7. Nachtrag: Sprung und Schlagreichweite | erledigt: Sprungablauf, Höhe, Schwerkraft, Weite und Steuerung sowie x-Reichweite, Tiefentoleranz und aktive Frames des Standardschlags gesichert, siehe „Nachtrag“ |
| 8. Nachtrag: Reichweite der Kettenstufen 2–4 | erledigt: x-Reichweite, Tiefentoleranz und aktive Frames je Stufe gesichert (per gekennzeichnetem Eingriff, natürlich gegengeprüft), siehe „Nachtrag: Reichweite der Kettenstufen 2–4“ |
| 9. Nachtrag: Würfe | erledigt: Eingabe, Schaden, Ablauf, Flugbahn und Weite des Wurfs, Kniestoß, Spezialangriff im Griff, geworfener Gegner als Geschoss; Umwerfen der Figur durch Gegner und Verkürzen des Liegens gesichert; dazu Reichweite und Bedingungen des Griffs, siehe „Nachtrag: Griff und Würfe“ |
| 10. Nachtrag: Schaden der Gegner | erledigt: Zuordnung jedes Treffers zum Angreifer, Schaden je Gegner und Angriff, Abhängigkeit vom Rang (Schwierigkeitswert FFF82A), Regeln für Umwerfen und Tod gesichert, siehe „Nachtrag: Schaden der Gegner“ |
| 11. Nachtrag: Sprungangriff | erledigt: vier Varianten, Schaden, Umwerfen, aktive Frames, Höhen-, x- und Tiefenreichweite gesichert, siehe „Nachtrag: Sprungangriff“ |
| 12. Grafik und Animationen | erledigt: Stage-Starts, Szenen und Panoramen aller 9 Stages, Animationsstreifen der 4 Spielfiguren, Pose-Galerien der Gegner je Stage, Beschreibung aller Stages, Helden und Gegner (Grafik-Workflow, Stichproben gegengeprüft: 115 von 129 bestätigt, Korrekturen eingearbeitet), siehe `grafik/README.md`. Offen: Titel, Figurenwahl, Abspann, Anzeigeleiste, Gegenstände |

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
| `messen_a5.py` | Auswertungen für Aufgabe 5: `laufen`, `treffer` (LP-Abnahmen der Gegner mit Kombostufe), `schlag` (Zeitachse eines Einzelschlags), `anim`, `schutz`, `fenster`, `reaktion` | ja |
| `laeufe_a5.sh` | alle MAME-Läufe für Aufgabe 5 (und die Grundläufe aus 3/4) von vorn, ~1 min | ja: zweimal ausgeführt, Ergebnisse identisch |
| `belege_a5.sh` | erzeugt `logs/a5_*.csv` | ja |
| `laeufe_a7.sh`, `belege_a7.sh` | Läufe (~1 min) und Logausschnitte `logs/a7_*.csv` für den Nachtrag Sprung und Schlagreichweite; dazu `messen_a5.py sprung` und `aktiv` | ja |
| `grafik/alle.sh` | erzeugt alle Spielgrafiken unter `grafik/` neu (~15 min): Stage-Starts (`scenarios/stage_start.lua`), Durchlauf-Bot (`grafik/bot.lua`, `bot.sh`, `durchlauf.lua`) mit Panoramen (`panorama.py`) und Szenenbildern (`szenen.py`), Animationsstreifen der Figuren (`helden.sh`, `scenarios/anim.lua`, `streifen.py`), Pose-Galerien (`gegner.sh`, `gegner.py`) und Ablaufstreifen der Gegner (`gegner_ablauf.sh`). Beschreibung in `grafik/README.md` | ja |
| `belege_sprungangriff.sh` | 129 Läufe mit `scenarios/sprungangriff.lua` (Einzelframe-Proben `CC_FERN_BIS`/`CC_NAH_BIS`, Richtung zum Angriff `CC_ADIR`) und Auswertung mit `messen_a5.py sprungangriff` und `treffer` nach `logs/sprungangriff.csv` (~1 min) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_griff.sh` | 36 Läufe mit `scenarios/griff.lua` und Auswertung mit `messen_a5.py griff` und `treffer` nach `logs/griff.csv` (~20 s) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_wurf.sh` | 42 Läufe mit `scenarios/griff.lua` (freie Eingaben `CC_IN`, Länge `CC_FRAMES`; Eingriff nur zum Absetzen des Gegners) und Auswertung mit `messen_a5.py wurf`, `wurfablauf`, `umfallen` nach `logs/wurf.csv` (~1 min) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_gegnerschaden.sh` | 13 Läufe mit `scenarios/rang.lua` (Hülle um `hurt*.lua`/`griff.lua`: Laufzeit `CC_FRAMES`, Rang-Eingriff `CC_RANG`) und Auswertung mit `messen_a5.py angreifer` und `rang` nach `logs/gegnerschaden.csv` (~30 s) | ja: zweimal ausgeführt, Ergebnis identisch |
| `belege_kette.sh` | 159 Läufe mit `scenarios/kette.lua` (Kette bis Stufe `CC_STUFE`, Eingriffe `CC_DX`, `CC_DZ`, `CC_FERN`, `CC_POKE_BIS`; ohne Eingriff `CC_VERT`, `CC_ABSTAND_LETZT`) und Auswertung mit `messen_a5.py kette` nach `logs/kette_reichweite.csv`; löscht danach die eigenen Rohabzüge (~2 min) | ja: zweimal ausgeführt, Ergebnis identisch |

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

## Szenarien (kalibriert 2026-10-01)

Grundlage sind Snapshots alle 10 bis 300 Frames (nur lokal unter
`logs/raw/snap/`). Alle Frame-Angaben in dieser Tabelle sind **unsicher**
(±Snapshot-Abstand) und dienen nur der Szenario-Planung, nicht als Messwert.

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
| hoch | hoch genau im Frame des Sprungdrucks (senkrechter Sprung) | 12, wirft um, erster Treffer A+7, trifft auch in 46 px Höhe | gesichert (`sa_nat_*_hoch_*`, ein Gegenprüfer); Reichweite nicht gemessen |
| unten | runter zusammen mit dem Angriffsdruck | 4, wirft nicht um | gesichert (`sa_nat_kb_unten_*`, ein Gegenprüfer); Reichweite nicht gemessen |

Neutral und Richtung im Einzelnen:

| Größe | Wert | Status |
|---|---|---|
| Schaden | 7 je Treffer bei beiden Gegnertypen, in jeder Höhe, unabhängig von einer vorherigen Kette. Mehr als jede der Kettenstufen 1–3 | gesichert (174 Treffer im Workflow, `sa_nat_*`) |
| Umwerfen | jeder Treffer wirft um: der Gegner fliegt 135 px weit in Blickrichtung der Figur (nicht vom Angreifer weg), liegt 55 Frames nach dem Treffer | gesichert (Workflow) |
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
  bei der Kette (eine Gegenprüfung).

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
Workflow fällt er auch zu Beginn von Stage 2 um 3.

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
  Jeder Treffer in der Luft wirft um.
- **Tod**: Genau 0 LP überlebt die Figur (normale Trefferreaktion). Erst
  unter 0 stirbt sie; etwa 120 Frames später geht es mit 72 LP weiter.
- **Gleichzeitiger Treffer**: Wird der Schlag der Figur im ersten aktiven
  Frame des Gegners aktiv, verliert nur der Gegner LP. Einen Frame später
  trifft der Gegner zuerst.
- **Schutz nach Treffer**: Die 27 Frames schützen vor Schlägen, nicht vor
  Geschossen und Griffen.
- **Reichweite der Gegner** (Stage-1-Fußvolk): WOOKY trifft bis zu einem
  Tiefenabstand von 11 px, ab 12 nicht. Gegen eine springende Figur treffen
  die Schläge bis zu ihrer Höhe von 48 px, bei 49–51 px nicht (der
  Sprungtritt von EDDY bis 50).
- **Angriffe von WOOKY und EDDY**: Je zwei normale Schläge (Treffer 4 bzw.
  9 Frames nach Angriffsbeginn) und zwei Umwerf-Angriffe (Gerade und
  Aufwärtshaken beim WOOKY, Ausfallschlag und Sprungtritt bei EDDY).
  Zwischen zwei Umwerf-Angriffen landet derselbe Gegner 0 bis 3 normale
  Treffer.
- **Trefferreaktion**: Von hinten getroffen eine eigene Animation, von
  vorn je nach Attribut zwei verschiedene (Bit 0x0400 wählt nur die
  Animation).

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
  In Slots 30–59 lagen andere Objekte, z. B. Slot 59 als Trefferfunke
  (8 Frames je Treffer). **Unsicher**: dass die Slots 0–19 ausschließlich
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
- Stage 1 belegt beim Start die Slots 16–18 mit `0200` und Slot 19 mit
  `0100` (S+5 = 0, x = 2424, also weit voraus). Was in Slot 19 liegt, ist
  offen.

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

### Gegner (Slot n, Basis S = `FFBC90 + n·0xC0`)

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| S+0x40 | 2, vorzeichenbehaftet | Lebenspunkte („WOOKY“: 16), fallen nur bei Treffern, nach dem Abschlusstritt negativ | `attack`: Slot 18 (`FFCA50`) 16 → 13 → 9 → 4 → −6. `attack_b`: blinde Suche eindeutig `FFCA50`. Demo: 48 Abnahmen, nie eine Zunahme in belegten Slots. Jede Abnahme fällt auf einen Statuswechsel 1 → 3 oder 1 → 2 oder liegt in Zustand 3 bzw. 2 | gesichert |
| S+0x42 | 2 | Lebenspunkte des Vorframes | `attack`, `attack_b` | gesichert |
| S+0x9A | 2 | Start- bzw. Maximal-LP des Gegners (16, 20, 22, 26, 30, 32, 36, 46) | In 59 von 60 Fällen (Demo, `hurt*`, `attack`, `combo_c`) gleich den LP beim Belegen oder Erscheinen. Ausnahme: ein Demo-Gegner, der beim Wiedererscheinen schon getroffen war | gesichert |
| S+0x04 / S+0x05 | je 1 | Grundzustand wie beim Spieler: 0 frei, 1 normal, 3 Trefferreaktion, 2 am Boden bzw. wartend. Wartende Gegner stehen auf `0200`. S+5 wird später 1, noch bevor der Gegner ins Bild kommt; er wartet dann am Bildrand (`0201`). Ablauf in `attack`: `0201` → `0101` (544, aktiv) → `0301` (587, Treffer) → `0201` (637, Abschlusstritt) → `0000` (715, frei) | `attack`, `attack_b`, `hurt`, `hurt_b`, Demo. `logs/a4_gegnerzahl.csv` | gesichert (Werte), unsicher (Deutung) |
| S+0x0E, +0x12, +0x16; Vorframe +0x66, +0x68, +0x6A | 16.16 bzw. 2 | x, Höhe, Tiefe wie beim Spieler | Der Gegner in `attack_b` läuft mit fallendem x auf den Spieler zu. Die Vorframe-Kopien stimmen in `hurt_b` immer, in Demo und `attack_b` aber nicht, solange ein Gegner nach einem Treffer durch die Luft fliegt (Höhen-Kopie bleibt 0) | unsicher |
| S+0x89 | 1 | laufende Nummer des treffenden Angriffs? **Keine** Kombostufe: `attack` 7/8/9/10, `attack_b` 4/5/6/7 bei gleicher Kette | `attack`, `attack_b` | unsicher |

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
