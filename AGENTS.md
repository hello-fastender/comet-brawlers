# Regeln für Arbeitsagenten

Dieses Repo gehört zum Projekt Comet Brawlers. Der Orchestrator ist eine
Claude-Sitzung (Fable), die Aufträge unter `docs/auftraege/` ablegt und
Ergebnisse prüft. Diese Datei gilt für jede Arbeitssitzung, gleich welches
Modell; für Claude-Sitzungen gilt zusätzlich `CLAUDE.md`, und bei Git hat
`CLAUDE.md` Vorrang (nur `main`).

## Sprache und Stil

- Deutsch in Code-Kommentaren, Dokumentation, Commit-Nachrichten,
  Pull-Request-Texten und Rückmeldungen. Bezeichner im Code: deutsche
  Fachbegriffe der Spezifikation (Figur, Gegner, Kette, Welle, Rang),
  technische Allgemeinbegriffe dürfen englisch sein.
- Kurze, klare Commit-Nachrichten: erste Zeile, was sich ändert, danach
  ein Absatz, warum.

## Git

- Claude-Sitzungen (Sonnet, Opus): direkt auf `main` nach `CLAUDE.md`,
  kleine Commits, nach jeder abgeschlossenen Datei oder Szene pushen.
- Andere Agenten (Grok Code): Branch `grok/<auftrag>` und Pull Request
  gegen `main`; der Orchestrator prüft und merged. Nie direkt auf `main`
  pushen.
- Nie Historie umschreiben, nie fremde Branches löschen.
- Nie ins Repo: ROM-Dateien (`roms/`, `*.zip`), ROM-Daten, Sounds aus dem
  Vorbild, disassemblierter Code, Bauartefakte (`spiel/dist/`,
  `spiel/aus/`, `godot/.godot/`, Exporte), Geheimnisse.
- Große Binärdateien (über 20 MB) nicht committen; Quellbilder von Grok
  (PNG, meist 1 bis 2 MB) sind erlaubt unter `spiel/grafik/quelle/fremd/`.

## Aufträge und Rückmeldung

- Lies zuerst `AGENTS.md`, dann den genannten Auftrag unter
  `docs/auftraege/` vollständig, dann die dort genannten Dokumente in der
  genannten Reihenfolge. Die Zahlenwerte des Spiels stehen nur in
  `docs/mechanik.md`; das Verhalten in `docs/spezifikation-kampf.md` und
  `docs/spezifikation-welt.md`. Erfinde keine Werte.
- Halte an den Haltepunkten des Auftrags an und warte auf die Freigabe
  des Nutzers.
- Schreibe die Rückmeldung als Datei `docs/rueckmeldungen/<auftrag>.md`
  im Format, das der Auftrag vorgibt, und committe sie mit.
- Lücken in der Spezifikation: nicht raten, nicht still entscheiden.
  Gilt ein gemessener Wert aus `docs/mechanik.md`, nimm ihn; sonst die
  einfachste Lösung, die alle Tests erfüllt, und ein Eintrag in der
  Rückmeldung unter „Abweichungen und Lücken“.

## Godot

- Godot 4.7.2 (stabil, Stand 2026-10-03), GDScript mit statischer Typisierung
  (`static_typing` als Warnung, keine untypisierten Variablen im Kern).
  Keine Erweiterungen aus dem Asset-Store, keine Abhängigkeiten.
- Projekt unter `godot/`. Der Logikkern unter `godot/kern/` ist reine
  Logik: `RefCounted`-Klassen ohne Nodes, ohne `Vector2`/`float` für
  Positionen (Festkomma 16.16 als `int`), ohne `randi`, ohne `Time`,
  ohne Signale; ein Logikschritt ist ein Funktionsaufruf. Die Darstellung
  unter `godot/darstellung/` liest den Kern nur.
- Godot in einer Cloud-Sitzung laden (geprüft am 2026-10-03, läuft
  headless im Claude-Container):
  `curl -sSL -o /tmp/godot.zip https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64.zip && unzip -q /tmp/godot.zip -d /tmp && chmod +x /tmp/Godot_v4.7.2-stable_linux.x86_64`,
  dann `alias godot=/tmp/Godot_v4.7.2-stable_linux.x86_64`. Nie ins Repo
  legen.
- Prüfläufe ohne Fenster: `godot --headless --path godot --script
  res://pruef/lauf.gd -- <Argumente>`. Alle Tests:
  `godot --headless --path godot --script res://tests/alle.gd`. Das
  GitHub-Workflow `.github/workflows/godot-tests.yml` führt sie bei jedem
  Push aus; ein Pull Request ist erst fertig, wenn er grün ist.
- Prüfstein: Die TypeScript-Fassung unter `spiel/` ist die
  Referenzimplementierung. Ihre Protokolle für alle Testszenen liegen
  unter `spiel/tests/referenz/alle/`. Der Godot-Kern ist richtig, wenn er
  für jede Szene bitgleiche `protokoll.csv` und `objekte.csv` erzeugt.
  Die TypeScript-Fassung wird nicht gelöscht und nicht geändert.
