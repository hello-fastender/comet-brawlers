# Captain Commando (MAME-Set `captcomm`): Mechanik-Analyse

Wir analysieren das Spiel, indem wir ihm beim Laufen zusehen. MAME läuft
headless, ein Lua-Skript gibt Eingaben ein und protokolliert den
Arbeitsspeicher Frame für Frame. Ins Repo kommen nur eigene Skripte,
Messwerte und Beschreibungen. Keine ROM-Daten, keine Grafiken, keine Sounds
und kein disassemblierter Code.

Kennzeichnung in diesem Dokument:

- **gesichert**: in mindestens zwei unabhängigen Läufen reproduziert (mit variierten Eingaben, weil MAME deterministisch ist, siehe „Szenarien“), Beleg mit Frame-Nummern und Logausschnitt angegeben
- **unsicher**: einzelner Lauf, Vermutung oder Wert mit möglicher Messverzerrung (Begründung dabei)
- **offen**: noch nicht gemessen

## Stand (2026-10-01)

| Aufgabe | Status |
|---|---|
| 1. Ordnerstruktur, `.gitignore` | erledigt |
| 2. `mame -verifyroms captcomm -rompath roms` | erledigt: alle Programm-, Grafik- und Sound-ROMs korrekt, nur ein PAL-Dump weicht ab (für die Emulation unerheblich, siehe unten) |
| 3. Headless-Lauf mit Lua (Demo, Münze/Start/Laufen/Schlagen) | erledigt: alle vier Szenarien laufen, kalibriert, bitgleich reproduzierbar |
| 4. Speicheradressen | erledigt: x, Tiefe, Höhe, LP Spieler und Gegner, Aktion, Kombostufe, Timer gesichert (blind in variierten Gegenläufen wiedergefunden). Gegnerzahl aus der Objekttabelle gezählt (kein eigener Zähler im RAM). Bedeutung einzelner Statuswerte unsicher, siehe „Gefundene Adressen“ |
| 5. Messungen | **offen** |
| 6. Übernahme gesicherter Werte nach `docs/mechanik.md` | Gerüst angelegt, noch keine Werte |

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
| `run.sh` | startet `mame captcomm -video none -sound none -nothrottle` mit `runner.lua`; optional ab Savestate | ja (MAME 0.264) |
| `runner.lua` | spielt Szenario-Eingaben framegenau ein; schreibt Eingabe-CSV, Watch-CSV, RAM-Vollabzug (`0xFF0000–0xFFFFFF`), Liste der Eingabefelder; Snapshots/Savestates auf Wunsch | ja: Eingaben, Watch-CSV, Abzug (Größe = Frames × 65.544 Bytes), Snapshots auch mit `-video none`, Savestate. Ein Fehler behoben: `machine:save()` erwartet nur den Namen (MAME ergänzt `captcomm/` und `.sta`) |
| `scenarios/*.lua` | `attract` (Demo, 90 s), `coin_start` (Münze, Start, Figurenwahl, Savestate `ingame`), `walk`, `attack`, `jump`, `hurt`; Gegenläufe mit variierten Eingaben: `walk_b`, `jump_b`, `attack_b`, `hurt_b` | ja; Zeitpunkte am 2026-10-01 anhand von Snapshots kalibriert (siehe „Szenarien“) |
| `ramtools.py` | `info`, `search` (verkettete Filter, u. a. `noinc`/`nodec`), `track`, `changes`, `enemies` (Gegnerzahl aus der Objekttabelle) auf den RAM-Abzügen | ja, mit synthetischem Abzug und mit echten Abzügen (`search` über 64 KiB × 40 Frames < 1 s). Fehler behoben: `search --width 4` prüfte nur durch 4 teilbare Adressen, der 68000 liest Langwörter an jeder geraden Adresse |
| `verify_b.sh` | blinde Suchen für Aufgabe 4 in den Gegenläufen; Ausgabe in `logs/a4_gegenpruefung.txt` | ja |
| `belege_a4.sh` | erzeugt die Logausschnitte `logs/a4_*.csv` aus den Rohabzügen | ja |

Ablauf:

```sh
cd research/captcomm
/usr/games/mame -verifyroms captcomm -rompath ../../roms   # meldet nur ioc1.ic7, s. o.
scripts/run.sh scripts/scenarios/attract.lua
scripts/run.sh scripts/scenarios/coin_start.lua          # legt Savestate "ingame" an
scripts/run.sh scripts/scenarios/walk.lua ingame
python3 scripts/ramtools.py info logs/raw/walk
```

Rohdaten landen in `logs/raw/` und sind git-ignoriert (ein 90-s-Vollabzug
hat etwa 350 MB). Im Repo stehen unter `logs/` nur kurze, kommentierte
Ausschnitte, auf die diese Notizen verweisen.

Zeitbezug: Alle Frame-Angaben sind **lokale Frames des Runners** (1 = erster
Frame-Callback nach Skriptstart). Zum Gegenprüfen steht in jeder Zeile
zusätzlich die MAME-interne Screen-Frame-Nummer. Eine Eingabe, die das
Szenario für Frame f vorsieht, setzt der Runner im Callback von Frame f−1.
Sie ist also während Frame f aktiv. Ob das Spiel sie in Frame f oder erst
in f+1 auswertet (Eingabelatenz), muss gemessen werden. Bei Startup-Werten
ist diese Latenz deshalb gesondert auszuweisen.

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

| Messgröße | Methode | Wert | Status |
|---|---|---|---|
| Schaden pro Schlag je Kombostufe | Differenz Gegner-LP (S+0x40) je Treffer, Stufe aus `FFAA2D` | – | offen |
| Treffer bis zum Umfallen | Treffer zählen bis Gegner-S+4 = 2 | – | offen |
| Startup-Frames Schlag | Frames von Eingabe bis erster LP-Änderung beim Gegner (bei direktem Kontakt), Eingabelatenz getrennt ausgewiesen | – | offen |
| Recovery-Frames Schlag | Frames vom Trefferframe bis zur Rückkehr in den Ruhezustand, gegengeprüft über die früheste Laufeingabe, die x wieder ändert | – | offen |
| Laufgeschwindigkeit x / Tiefe / diagonal | Δ pro Frame von `FFA99E`/`FFA9A6` (16.16) in `walk`/`walk_b` | – | offen |
| Unverwundbarkeit nach Treffer | Frames nach eigenem Treffer, in denen gegnerische Treffer keine LP (`FFA9D0`) kosten | – | offen |
| Unverwundbarkeit nach Aufstehen | wie oben, ab S+4 2 → 3; Kandidat ist der 35-Frame-Timer `FFAA69` | – | offen |

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
| `FFA99C` | S+0x0C | 2 | Unterphase der Aktion: Sprung 2 = Landung (6 Frames); Schlag 0/2, in der Kette 4/6 | `jump`, `attack`, `attack_b` | unsicher (Deutung) |
| `FFA994` | S+0x04 | 1 | Grundzustand: 1 normal, 3 nach Treffer (27 Frames, Treffer währenddessen möglich), 2 am Boden nach Wurf, 0 vor Spielbeginn. In der Demo dauerhaft 3 | `hurt` und `hurt_b`: gleiches Muster zu anderen Zeiten | gesichert (Werte), unsicher (Deutung) |
| `FFA995` | S+0x05 | 1 | 0 im Spiel, 1 in der Demo (KI-gesteuert?) | `hurt`, `attract` | unsicher |
| `FFAA2D` | S+0x9D | 1 | Kombostufe × 4 (0/4/8/12). Wird 2–3 Frames vor dem Treffer des jeweiligen Kettenschlags gesetzt und erst beim nächsten Angriff nach der Kette wieder 0 (`attack`: Kette endet 666, Rücksetzen 674) | `attack` (602/618/634) und `attack_b` (417/435/453): identische Folge, Treffer je 2–3 Frames danach. `logs/a4_lp_gegner.csv` | gesichert |
| `FFAA61` | – | 1 | Timer beim Liegen: startet mit 40, 54 Frames nach dem Wurf, zählt bis 0 | `hurt` (629, 980, 1332), `hurt_b` (598, 994); blind wiedergefunden | gesichert |
| `FFAA69` | – | 1 | Timer nach dem Aufstehen: startet mit 35, wenn S+4 von 2 auf 3 geht. Bei 0 kehrt S+4 auf 1 zurück, falls kein Treffer kam | `hurt` (696, 1047, 1399), `hurt_b` (665, 1061); blind wiedergefunden. In `hurt` traf der Gegner zweimal genau beim Ablauf (731, 1434) | gesichert (Verhalten). Ob es eine Unverwundbarkeit ist: offen, Aufgabe 5 |
| `FFAA76` | – | 2, BCD | Punkte Spieler 1 (0x140 = 140 Punkte) | `attack` und `attack_b`: 0x10, 0x30, 0x60, 0x140, passend zum HUD | gesichert |
| `FFA9C8`, `FFA9CA` | S+0x38, +0x3A | je 2, vorzeichenbehaftet | LP des zuletzt getroffenen Gegners nach bzw. vor dem Treffer, 2 Frames nach dem Treffer gesetzt (vermutlich für den HUD-Balken) | `attack`, `attack_b`: gleiche Folge wie die Gegner-LP | unsicher (Deutung) |
| `FFAA56` | – | 2 | +16 bei jedem Treffer, egal wer trifft | `attack`, `hurt` | unsicher |

### Gegner (Slot n, Basis S = `FFBC90 + n·0xC0`)

| Offset | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| S+0x40 | 2, vorzeichenbehaftet | Lebenspunkte („WOOKY“: 16), fallen nur bei Treffern, nach dem Abschlusstritt negativ | `attack`: Slot 18 (`FFCA50`) 16 → 13 → 9 → 4 → −6. `attack_b`: blinde Suche eindeutig `FFCA50`. Demo: 48 Abnahmen, nie eine Zunahme in belegten Slots. Jede Abnahme fällt auf einen Statuswechsel 1 → 3 oder 1 → 2 oder liegt in Zustand 3 bzw. 2 | gesichert |
| S+0x42 | 2 | Lebenspunkte des Vorframes | `attack`, `attack_b` | gesichert |
| S+0x04 / S+0x05 | je 1 | Grundzustand wie beim Spieler: 0 frei, 1 normal, 3 Trefferreaktion, 2 am Boden bzw. wartend. Wartende Gegner stehen auf `0200`. S+5 wird später 1, noch bevor der Gegner ins Bild kommt; er wartet dann am Bildrand (`0201`). Ablauf in `attack`: `0201` → `0101` (544, aktiv) → `0301` (587, Treffer) → `0201` (637, Abschlusstritt) → `0000` (715, frei) | `attack`, `attack_b`, `hurt`, `hurt_b`, Demo. `logs/a4_gegnerzahl.csv` | gesichert (Werte), unsicher (Deutung) |
| S+0x0E, +0x12, +0x16; Vorframe +0x66, +0x68, +0x6A | 16.16 bzw. 2 | x, Höhe, Tiefe wie beim Spieler | Der Gegner in `attack_b` läuft mit fallendem x auf den Spieler zu. Die Vorframe-Kopien stimmen in `hurt_b` immer, in Demo und `attack_b` aber nicht, solange ein Gegner nach einem Treffer durch die Luft fliegt (Höhen-Kopie bleibt 0) | unsicher |
| S+0x89 | 1 | laufende Nummer des treffenden Angriffs? **Keine** Kombostufe: `attack` 7/8/9/10, `attack_b` 4/5/6/7 bei gleicher Kette | `attack`, `attack_b` | unsicher |

### Nebenbefunde (Rohwerte für Aufgabe 5, dort zu bestätigen)

Diese Werte sind beim Suchen nebenbei angefallen. Sie stammen aus den
Läufen oben, sind aber nicht nach der Methode aus „Messgrößen“ gemessen.
Deshalb gelten sie alle als **unsicher**.

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
