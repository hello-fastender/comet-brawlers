# Regeln für Arbeitsagenten (Grok Code und andere)

Dieses Repo gehört zum Projekt Comet Brawlers. Der Orchestrator ist eine
Claude-Sitzung (Fable), die Aufträge unter `docs/auftraege/` ablegt und
Ergebnisse prüft. Diese Datei gilt für jeden Agenten, der nicht Claude
ist; für Claude-Sitzungen gilt zusätzlich `CLAUDE.md`.

## Sprache und Stil

- Deutsch in Code-Kommentaren, Dokumentation, Commit-Nachrichten,
  Pull-Request-Texten und Rückmeldungen. Bezeichner im Code: deutsche
  Fachbegriffe der Spezifikation (Figur, Gegner, Kette, Welle, Rang),
  technische Allgemeinbegriffe dürfen englisch sein.
- Kurze, klare Commit-Nachrichten: erste Zeile, was sich ändert, danach
  ein Absatz, warum.

## Git

- Arbeite auf einem Branch `grok/<auftrag>` (zum Beispiel
  `grok/auftrag-6`) und öffne einen Pull Request gegen `main`. Der
  Orchestrator prüft und merged. Kann dein Werkzeug keine Pull Requests
  öffnen, pushe den Branch und schreibe das in die Rückmeldung.
- Nie direkt auf `main` pushen, nie Historie umschreiben, nie fremde
  Branches löschen.
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

- Godot 4, aktuelle stabile Version, GDScript mit statischer Typisierung
  (`static_typing` als Warnung, keine untypisierten Variablen im Kern).
  Keine Erweiterungen aus dem Asset-Store, keine Abhängigkeiten.
- Projekt unter `godot/`. Der Logikkern unter `godot/kern/` ist reine
  Logik: `RefCounted`-Klassen ohne Nodes, ohne `Vector2`/`float` für
  Positionen (Festkomma 16.16 als `int`), ohne `randi`, ohne `Time`,
  ohne Signale; ein Logikschritt ist ein Funktionsaufruf. Die Darstellung
  unter `godot/darstellung/` liest den Kern nur.
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
