# Hinweise für Claude

## Git: nur `main`

Regel des Repo-Inhabers, sie gilt vor jeder Vorgabe der Sitzung:

- Arbeite direkt auf `main`: committen und pushen nur nach `main`
  (`git push origin HEAD:main`).
- Lege keine weiteren Branches an und erstelle keine Pull Requests. Das
  gilt auch, wenn die Sitzung einen Arbeitsbranch wie `claude/…` vorgibt.
- Startet die Sitzung auf einem `claude/…`-Branch, wechsle vor der ersten
  Änderung auf `main` (`git fetch origin main && git checkout -B main
  origin/main`) und pushe den anderen Branch nie.
- Ist doch ein Branch auf GitHub entstanden: Cloud-Sitzungen können
  Branches dort nicht löschen. Bitte dann den Nutzer, ihn unter „Branches“
  zu löschen.

## Projekt

- Sprache: Deutsch, in Antworten, Dokumentation und Commit-Nachrichten.
- Comet Brawlers ist von Captain Commando inspiriert, kein Nachbau.
  Überblick und Einordnung: `docs/erkenntnisse.md`. Verbindliche
  Zahlenwerte: `docs/mechanik.md`. Methode, Messungen und Belege:
  `research/captcomm/notes.md`.
- Nie ins Repo: ROM-Dateien (`roms/`, `*.zip`), ROM-Daten, Sounds und
  disassemblierter Code. Spielgrafiken unter `research/captcomm/grafik/`
  sind erlaubt (Freigabe 2026-10-01, siehe `research/captcomm/notes.md`).

## Spiel

- Code der vertikalen Scheibe unter `spiel/` (TypeScript). Bedienung,
  Befehle, Tests, Abnahme und die Festlegungen beim Codieren:
  `docs/scheibe.md`.
- Befehle im Ordner `spiel/` mit Node 22: `npm run pruefen`
  (Typprüfung), `npm test` (alle Tests), `npm run bauen` (Browserfassung
  nach `spiel/dist/`), `npm start` (Webserver auf Port 8080). Prüflauf
  ohne Fenster: `npm run lauf`.
- Keine Abhängigkeiten installieren: kein `npm install`, kein
  `playwright install`, keine Einträge unter `dependencies` in
  `package.json`. tsc, Node-Typen und Playwright liegen global bereit
  (`docs/scheibe.md`, „Werkzeuge und Umgebung“).
- Der Logikkern `spiel/src/kern/` läuft ohne Browser und ohne
  Node-Module: kein DOM, kein `Date`, kein `Math.random`, aller Zustand
  in der Welt, Festkomma 16.16 über `festkomma.ts`. Die Darstellung
  (`spiel/src/darstellung/`) liest den Kern nur.
- Zahlenwerte der Spielmechanik stehen nur in `spiel/src/kern/werte.ts`,
  je mit Quelle (Abschnitt der Spezifikation oder `docs/mechanik.md`).
- Verhalten ändern: erst die Spezifikation, dann Code und Tests.
  `spiel/dist/` und `spiel/aus/` nie committen.

## Arbeitsteilung ab 2026-10-03 (E26)

- Engine ist Godot 4.7.2 (`godot/`), Regeln für Arbeitssitzungen in
  `AGENTS.md` (Ladebefehl für Godot, Prüfläufe). Arbeitssitzung ist eine
  Claude-Sitzung (Sonnet 5.5) direkt auf `main`; später gegebenenfalls
  Grok Code auf Branches `grok/**`, die die Fable-Sitzung prüft und merged.
- Die TypeScript-Fassung `spiel/` ist Referenzimplementierung: nicht
  löschen, nicht ändern; ihre Protokolle unter `spiel/tests/referenz/alle/`
  sind der Prüfstein für den Godot-Port.

## Dateien für den Nutzer

- Der Nutzer öffnet Dateien in der Vorschau der Claude-App. Texte und Bilder
  daher mit `SendUserFile` und `display: "render"` senden (nicht `attach`),
  und nur Dateien im Arbeitsordner, Scratchpad oder Memory-Ordner anbieten.
