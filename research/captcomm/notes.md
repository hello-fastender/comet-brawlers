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
| 4. Speicheradressen | **offen**: erste Kandidaten für x aus dem Pipeline-Test, siehe „Gefundene Adressen“ |
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
| `scenarios/*.lua` | `attract` (Demo, 90 s), `coin_start` (Münze, Start, Figurenwahl, Savestate `ingame`), `walk`, `attack` | ja; Zeitpunkte am 2026-10-01 anhand von Snapshots kalibriert (siehe „Szenarien“) |
| `ramtools.py` | `info`, `search` (verkettete Filter), `track`, `changes` auf den RAM-Abzügen | ja, mit synthetischem Abzug und mit echten Abzügen (`search` über 64 KiB × 40 Frames < 1 s) |

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
| Anzahl aktiver Gegner | ändert sich beim Erscheinen und Besiegen von Gegnern. Alternativ werden aktive Objekt-Slots gezählt. **Unsicher**: Ob es feste Objekt-Slots gibt, ist eine Annahme, die erst zu prüfen ist |

## Messgrößen

| Messgröße | Methode | Wert | Status |
|---|---|---|---|
| Schaden pro Schlag je Kombostufe | Differenz Gegner-LP je Treffer, Stufe aus Zustandsadresse | – | offen |
| Treffer bis zum Umfallen | Treffer zählen bis Zustand „liegt“ | – | offen |
| Startup-Frames Schlag | Frames von Eingabe bis erster LP-Änderung beim Gegner (bei direktem Kontakt), Eingabelatenz getrennt ausgewiesen | – | offen |
| Recovery-Frames Schlag | Frames vom Trefferframe bis zur Rückkehr in den Ruhezustand, gegengeprüft über die früheste Laufeingabe, die x wieder ändert | – | offen |
| Laufgeschwindigkeit x / Tiefe / diagonal | Δx bzw. Δy pro Frame im `walk`-Szenario | – | offen |
| Unverwundbarkeit nach Treffer | Frames nach eigenem Treffer, in denen gegnerische Treffer keine LP kosten; Suche nach Timer-Adresse | – | offen |
| Unverwundbarkeit nach Aufstehen | wie oben, ab Ende der Aufstehanimation | – | offen |

## Gefundene Adressen

| Adresse | Breite | Bedeutung | Beleg | Status |
|---|---|---|---|---|
| `FFA99E` | 2 | Kandidat x-Position Spieler 1 | `walk`: `search --width 2 same:62:100 same:162:200 inc:264:300 dec:364:400` lässt genau diese zwei Adressen übrig. Werte bei Frame 1/260/300/360/400: 320/320/388/390/321 | unsicher: ein Lauf, Bedeutung der zweiten Adresse unklar, Nachlauf um 2 nach Loslassen ungeprüft |
| `FFA9F6` | 2 | Kandidat x (zweite Kopie, Objekt/Schatten?) | wie oben: 320/320/386/390/323 | unsicher, wie oben |

Diese beiden Kandidaten stammen aus dem End-to-End-Test der Auswertekette
und sind der Ausgangspunkt für Aufgabe 4, keine Messwerte.

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
