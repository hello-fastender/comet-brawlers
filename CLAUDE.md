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
