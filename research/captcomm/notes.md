# Captain Commando (MAME-Set `captcomm`): Mechanik-Analyse

Wir analysieren das Spiel, indem wir ihm beim Laufen zusehen. MAME läuft
headless, ein Lua-Skript gibt Eingaben ein und protokolliert den
Arbeitsspeicher Frame für Frame. Ins Repo kommen nur eigene Skripte,
Messwerte und Beschreibungen. Keine ROM-Daten, keine Grafiken, keine Sounds
und kein disassemblierter Code.

Kennzeichnung in diesem Dokument:

- **gesichert**: in mindestens zwei unabhängigen Läufen reproduziert, Beleg mit Frame-Nummern und Logausschnitt angegeben
- **unsicher**: einzelner Lauf, Vermutung oder Wert mit möglicher Messverzerrung (Begründung dabei)
- **offen**: noch nicht gemessen

## Stand (2026-10-01)

| Aufgabe | Status |
|---|---|
| 1. Ordnerstruktur, `.gitignore` | erledigt |
| 2. `mame -verifyroms captcomm -rompath roms` | **offen**: MAME ist nicht installiert, siehe unten |
| 3. Headless-Lauf mit Lua (Demo, Münze/Start/Laufen/Schlagen) | Skripte geschrieben, **noch nicht ausgeführt** |
| 4. Speicheradressen | **offen** |
| 5. Messungen | **offen** |
| 6. Übernahme gesicherter Werte nach `docs/mechanik.md` | Gerüst angelegt, noch keine Werte |

### Umgebung

- **ROM**: `roms/captcomm.zip` (2.577.865 Bytes, `testzip` fehlerfrei) wurde
  aus dem Google Drive des Nutzers geladen. `roms/` und `*.zip` stehen in der
  `.gitignore`. Das Archiv wurde auf einem Mac gepackt. Die ROM-Dateien liegen
  im Unterordner `captcomm/` statt im Wurzelverzeichnis, dazu kommen
  `__MACOSX/._*`-Metadateien. **Unsicher**: Ob MAME das Archiv so akzeptiert,
  zeigt erst `-verifyroms`. Falls nicht, wird es lokal nach `roms/captcomm/`
  entpackt (Verzeichnisse sind als Romset erlaubt) oder ohne Unterordner neu
  gepackt. Beides bleibt außerhalb des Repos.
- **MAME**: nicht installiert. `apt-get install mame` scheitert, weil die
  Egress-Policy des Cloud-Containers die Ubuntu-Spiegel sperrt
  (`archive.ubuntu.com` → 403). Offizielle Linux-Binaries gibt es nicht.
  Möglich wäre ein Build aus dem Quellcode (GitHub ist erreichbar, Compiler,
  CMake und Ninja sind vorhanden, SDL2 fehlt nur als Header). Dieser Weg
  wartet auf die Freigabe des Nutzers. Alternativ kann `mame` dauerhaft über
  das Setup-Skript der Umgebung installiert werden.
- Python 3.11 ohne numpy. Die Auswertewerkzeuge nutzen deshalb nur die
  Standardbibliothek.

## Werkzeuge (`scripts/`)

| Datei | Zweck | Getestet |
|---|---|---|
| `run.sh` | startet `mame captcomm -video none -sound none -nothrottle` mit `runner.lua`; optional ab Savestate | nein (kein MAME) |
| `runner.lua` | spielt Szenario-Eingaben framegenau ein; schreibt Eingabe-CSV, Watch-CSV, RAM-Vollabzug (`0xFF0000–0xFFFFFF`), Liste der Eingabefelder; Snapshots/Savestates auf Wunsch | nein (kein MAME, kein Lua-Interpreter im Container) |
| `scenarios/*.lua` | `attract` (Demo, 90 s), `coin_start` (Münze, Start, Figurenwahl, Savestate `ingame`), `walk`, `attack` | nein; Zeitpunkte sind Startwerte |
| `ramtools.py` | `info`, `search` (verkettete Filter), `track`, `changes` auf den RAM-Abzügen | ja, mit synthetischem Abzug (bekannte Adressen wiedergefunden, Wortbreite und Vorzeichen geprüft) |

Ablauf:

```sh
cd research/captcomm
mame -verifyroms captcomm -rompath ../../roms
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

## Vorgehen je Größe

Der Abgleich läuft immer gleich: Bekannte Ereignisse (eigene Eingaben,
sichtbare Treffer) erzeugen ein erwartetes Werteverhalten, und
`ramtools.py search` filtert die Adressen heraus, die genau dieses
Verhalten zeigen. Jede gefundene Adresse wird in einem zweiten,
unabhängigen Lauf geprüft, bevor sie als gesichert gilt.

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

Noch keine. Spalten: Adresse, Breite, Bedeutung, Beleg (Szenario,
Frames, Logausschnitt), Status.

## Laufprotokoll

- 2026-10-01: Struktur, `.gitignore`, Skripte angelegt. ROM aus Drive
  geladen (nicht im Repo). Kein MAME-Lauf möglich (siehe Umgebung).
