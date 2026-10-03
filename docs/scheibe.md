# Comet Brawlers: vertikale Scheibe (Programm)

Stand 2026-10-03, im Aufbau (Auftrag 3). Das Programm setzt
`docs/spezifikation-kampf.md` und `docs/spezifikation-welt.md` um. Es liegt
in `spiel/`, ist in TypeScript geschrieben und hat keine Abhängigkeiten
(E22). Dieses Dokument beschreibt Bedienung, Bau, Tests, den Stand der
Abnahme und die Festlegungen, die beim Codieren nötig waren.

## Bedienung

Folgt mit der Darstellung (Stufe 3).

## Bau und Befehle

Alle Befehle im Ordner `spiel/`, mit Node 22 aus `/opt/node22/bin`:

| Befehl | Wirkung |
|---|---|
| `npm run pruefen` | Typprüfung: Kern, Prüfläufe und Tests (`tsconfig.json`), Kern allein ohne Node- und DOM-Typen (`tsconfig.kern.json`), Kern und Darstellung für den Browser (`tsconfig.browser.json`) |
| `npm test` | alle Tests unter `tests/` mit `node:test` |
| `npm run lauf -- --szene <datei> --eingabe <datei> --aus <ordner>` | Prüflauf ohne Fenster; schreibt `protokoll.csv` und `objekte.csv` und gibt beide MD5 aus |
| `npm run bauen` | Browserfassung nach `spiel/dist/` |
| `npm start` | lokaler Webserver auf Port 8080 |
| `npm run foto` | Bildschirmfotos der laufenden Scheibe nach `docs/bilder/` |

## Werkzeuge und Umgebung

Geprüft in Phase 0 (2026-10-03):

| Werkzeug | Stand | Hinweis |
|---|---|---|
| Node | 22.22.0 | TypeScript direkt mit `--experimental-strip-types` |
| tsc | 6.0.2 | Typprüfung und Bau |
| Node-Typen | `@types/node` 26.1.1 unter `/opt/node-tools/node_modules/@types` | in `tsconfig.json` über `typeRoots` eingebunden; fehlen sie, scheitert nur die Typprüfung von Prüfläufen und Tests, nicht der Kern |
| `node --test` | ok | Node 22 nimmt keinen Ordner als Argument; das Skript `test` übergibt das Muster `"tests/**/*.test.ts"` |
| Playwright | ok, Chromium unter `/opt/pw-browsers` | aus ES-Modulen nur über `createRequire` ladbar, weil `NODE_PATH` dort nicht greift |
| Webserver | `http-server` global | Ersatz: `python3 -m http.server 8080 --directory spiel` |

## Tests

Folgt mit den Abnahmetests (Stufe 3).

## Abnahme

Folgt mit den Abnahmetests (Stufe 3).

## Abweichungen und Lücken

Stellen, die die Spezifikation nicht oder widersprüchlich regelt, und ihre
Festlegung beim Codieren (Auftrag 3, Abschnitt 2.6). Je Eintrag: Stelle,
Festlegung, Grund, ob die Spezifikation anzupassen ist.

| Nr. | Stelle | Festlegung | Grund | Spezifikation anpassen |
|---|---|---|---|---|
