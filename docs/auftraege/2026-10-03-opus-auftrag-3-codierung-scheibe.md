# Auftrag 3: Entscheidungen E10 bis E21 einarbeiten und die vertikale Scheibe codieren

Stand 2026-10-03. Orchestrator ist die Fable-Sitzung des Nutzers. Dieser
Auftrag folgt auf Auftrag 1 (`2026-10-02-opus-messungen-und-design.md`)
und Auftrag 2 (`2026-10-02-opus-auftrag-2-boss-fernkampf-spezifikation.md`).
**Abschnitt 1 von Auftrag 1 (Regeln) gilt weiter**, soweit er Repo, Sprache
und Commits betrifft. MAME und ROM werden in diesem Auftrag nicht gebraucht.

Ziel: (1) die Entscheidungen E10 bis E21 in die vier Dokumente einarbeiten,
(2) die vertikale Scheibe nach `docs/spezifikation-kampf.md` und
`docs/spezifikation-welt.md` als lauffähiges Programm bauen, mit
Frame-Protokoll, Eingabeaufzeichnung, allen Abnahmetests und einer
Darstellung mit Platzhaltergrafik. **Ab jetzt wird codiert.**

---

## 0. Startprompt für die Opus-Sitzung

```text
Du bist die Arbeitssitzung für das Projekt Comet Brawlers. Der Orchestrator
hat den dritten Auftrag in docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md
abgelegt. Lies zuerst CLAUDE.md, dann Abschnitt 1 (Regeln) von
docs/auftraege/2026-10-02-opus-messungen-und-design.md, dann den dritten
Auftrag vollständig, dann docs/spezifikation-kampf.md und
docs/spezifikation-welt.md vollständig, dann docs/mechanik.md, docs/design.md
und docs/design-gegner-stages.md. Arbeite die Phasen 0 bis 5 des dritten
Auftrags der Reihe nach ab. Nur auf main, keine Branches, keine Pull
Requests, Deutsch. Melde dich bei mir nur, wenn Phase 0 scheitert oder wenn
die Spezifikation eine Lücke hat, die sich nicht nach Abschnitt 2.6 des
dritten Auftrags schließen lässt. Am Ende die Rückmeldung im Format aus
Abschnitt 7.
```

---

## 1. Entscheidungen des Nutzers (2026-10-03, verbindlich)

Der Nutzer hat alle Empfehlungen des Orchestrators angenommen. Sie ergänzen
E1 bis E9 aus Auftrag 2.

| Nr. | Thema | Entscheidung |
|---|---|---|
| E10 | Arbeitsregeln | Alle Festlegungen, die in `docs/design.md` (Abschnitt 9), `docs/design-gegner-stages.md` (Abschnitt 10), `docs/spezifikation-kampf.md` (13.2 P1 bis P31 und 13.3) und `docs/spezifikation-welt.md` (Abschnitt 13, Fragen) als „Arbeitsregel“, „Platzhalter“ oder „Einverstanden?“ geführt sind, gelten als bestätigt, soweit E11 bis E21 nichts anderes sagen. Darunter: Schutz wirkt auch gegen Geschosse (P17); wirkungslose Treffer im Schutz erzeugen keinen Trefferstopp (P11); Spezialangriff aus dem Griff mit den aktiven Frames des freien (Kampf 9.4); Ansturm des Bosses wirft in der Scheibe ohne Griff um; Diagonalsprint ohne den Fehler des Vorbilds (P23); Kette endet beim Verlassen des Schlags, Ausfallschritt und Abbruch wie gemessen (P12, 5.6); Landung nach dem Neueinstieg trifft alle Gegner im Bild, Schutz 252 Frames; Haltelage 19 px (P19); Halt H1 bei Kamera-x 440; Punkte bleiben bei zurückgewiesenen Treffern; kein Bonus und keine Waffe für Gegner, die mit dem Boss fallen; kein Stage-Bonus über die Bosspunkte hinaus; wartende und auftretende Gegner nicht treffbar und nicht greifbar; Rammbock mit Gehstufe 2,0 px/Frame und Wartezeit 90 bis 180 Frames; Game Over in der Scheibe ohne Continue, Neustart mit Seed + 1; Zuschnitt der Scheibe (Wellen 1, 2, 7, 9; Sperre bei Kamera-x 400; Blende von B nach F; Essen aus einem Fass in B; Kisten ohne Laser); Gehstufe der Nahkämpfer zufällig, etwa ein Drittel schnell; Liegedauer des schweren Nahkämpfers gleichverteilt 16 bis 44 in Schritten von 4; Kolbenhieb des Fernkämpfers wie Schlag A des leichten Nahkämpfers; Boss zählt nicht zur Angreifergrenze; Verstärkungsschwellen nach dauerhaft abgezogenen LP; bei zwei Spielern gilt die Angreifergrenze je Figur; Ausnahmen über 13 LP (Fahrzeuggriff 15, Rollfass 16); Zünder-Zielpunkt zufällig aus den drei Punkten des Vorbilds, keine Doppelschüsse |
| E11 | Super-Armor | Deterministische Regel der Spezifikation (`spezifikation-welt.md` 7.4, SA1 bis SA6): Kettenstufen 1 bis 3 ziehen LP vorläufig ab, 23 Frames nach dem letzten Treffer ohne Umwerfen springen sie zurück und der Boss zieht sich 54 Frames zurück; umwerfende Treffer, Spezialangriff, Kniestoß, Wurf, Explosion, Sprintangriff, geworfener Gegner und die Landung beim Neueinstieg zählen endgültig. Keine zufällige Zurückweisung wie im Vorbild. Damit ist auch Frage 11 in `design-gegner-stages.md` Abschnitt 10 entschieden |
| E12 | Zahlendarstellung | Festkomma 16.16 nach `spezifikation-kampf.md` 2.4 ist verbindlich für Positionen, Geschwindigkeiten und Beschleunigungen |
| E13 | Zu langsame Darstellung | Die Logik läuft in Echtzeit mit 60 Schritten je Sekunde und lässt bei zu langsamer Darstellung Bilder aus; sie läuft nicht langsamer. Höchstens 4 Logikschritte je dargestelltem Bild, darüber bleibt die Zeit stehen (kein Aufholen über mehr als 4 Schritte) |
| E14 | Blickrichtung | Symmetrisch: Für Blick links gelten dieselben Reichweiten, Griffweiten, Aufnahmebereiche und Explosionsgrenzen wie für Blick rechts (Werte für Blick rechts aus `mechanik.md`). Griff von hinten 24 px in beide Richtungen |
| E15 | Sprint-Sprungangriff | gehört in die Scheibe: 13 LP, Reichweite 38 bis 147 px in allen aktiven Frames (P7) |
| E16 | Todesarten | Einheitlich: Neueinstieg N = t+120 für jede Todesart in der Scheibe; die Sonderfälle Wand und Rollen des Vorbilds kommen nicht in die Scheibe |
| E17 | Zünder (Fernkämpfer) | Sichtbares Zielen 60 Frames als Ankündigung mit Zielrecht, danach Schuss; nicht wie im Vorbild sofort schießen. Die Werte des Schusses, der Geschosse und der Explosion bleiben wie gemessen |
| E18 | Boss-Armschwung | Wie im Vorbild: Nach dem ersten Schwung folgt der nächste nur, wenn der vorige getroffen hat, höchstens drei |
| E19 | Boss-Trefferreaktion | 23 Frames wie bei allen Gegnern (E3); die Folgefrist der Super-Armor ist h+23 |
| E20 | Welle 9 der vollen ersten Stage | wie gemessen: Pistolen-Zünder nach dem Tod des ersten Arena-Bolzers, Raketen-Zünder bei einem Viertel der Boss-LP, ein zweiter nur ab Rang 16 und bei höchstens drei anderen lebenden Gegnern. Für die Scheibe gilt der Zuschnitt (E10) |
| E21 | Griff des Bosses | im Vollspiel ja (Griff mit Wurf nach `mechanik.md`, „Boss“), in der Scheibe nein |
| E22 | Technik | TypeScript. Reiner Logikkern ohne Browser-Abhängigkeit, Darstellung über Canvas 2D in einer HTML-Seite, Prüfläufe und Abnahmetests in Node, Bildschirmfotos über Playwright. Keine npm-Abhängigkeiten (Einzelheiten in Abschnitt 2) |

---

## 2. Technische Vorgaben für die Codierung

### 2.1 Werkzeuge ohne Paketinstallation

Die npm-Registry ist aus dem Cloud-Container nicht erreichbar (403 durch
die Netzregel der Umgebung). Deshalb **keine Abhängigkeiten in
`package.json`**, kein `npm install`. Vorhanden sind global unter
`/opt/node22/bin` bzw. `/opt/node22/lib/node_modules`:

| Werkzeug | Verwendung |
|---|---|
| Node 22 | Ausführen von TypeScript direkt mit `node --experimental-strip-types` (nur Typauslöschung, also keine `enum`, keine Parameter-Properties, keine Namespaces; Importe mit `.ts`-Endung) |
| `tsc` 6.0 | Typprüfung mit `tsc --noEmit` und Bau der Browserfassung nach `spiel/dist/` als ES-Module |
| `node --test` | Abnahmetests mit der eingebauten Testbibliothek `node:test` und `node:assert/strict` |
| `playwright` (global) | Bildschirmfotos der laufenden Scheibe mit `NODE_PATH=/opt/node22/lib/node_modules`, Chromium unter `/opt/pw-browsers` (kein `playwright install`) |
| `http-server` (global) oder `python3 -m http.server` | lokaler Webserver für die Browserfassung (ES-Module laufen nicht über `file://`) |
| `prettier`, `eslint` (global) | Formatierung; nur verwenden, wenn sie ohne Konfiguration aus dem Netz laufen |

Prüfen in Phase 0, dass das alles läuft. Fehlt etwas, ohne Paketinstallation
umgehen und in der Rückmeldung nennen.

### 2.2 Ablage

```
spiel/
  package.json          nur "scripts", keine Abhängigkeiten
  tsconfig.json         strict, ES2022, module nodenext, allowImportingTsExtensions, noEmit für Prüfung; zweite Konfiguration tsconfig.browser.json für dist/
  index.html            lädt dist/darstellung/main.js
  src/kern/             Logikkern, keine Browser- und keine Node-APIs
    festkomma.ts        16.16: aus/zu Dezimal, mul, div nach Kampf 2.4, Formatierung nach Kampf 11.3
    zufall.ts           seedbarer Generator nach Welt 11
    werte.ts            alle Zahlen aus mechanik.md und den Spezifikationen als benannte Konstanten, je Konstante ein Kommentar mit Quelle (Datei, Abschnitt)
    entitaeten.ts       Felder nach Kampf 3 und Welt 4.1
    figur/              Zustandsautomat (Kampf 4), Angriffe (Kampf 5.2), Sprint und Spezial (Kampf 9), Griff und Wurf (Kampf 8), Waffen (Kampf 10)
    treffer.ts          Trefferprüfung und Reihenfolge im Frame (Kampf 5, 2.2)
    schaden.ts          LP, Schutz, Kosten, Tod und Neueinstieg (Kampf 6)
    gegner/             Trefferreaktion (Kampf 7), Nahkämpfer (Welt 5), Fernkämpfer (Welt 6), Boss (Welt 7)
    stage.ts            Stage-Daten laden (Welt 2), Bänder, Hindernisse
    kamera.ts           Welt 3
    wellen.ts           Welt 4
    rang.ts             Welt 8
    gegenstaende.ts     Welt 9
    rahmen.ts           Anzeige-Daten, Leben, Punkte, Phasen (Welt 10)
    welt.ts             ein Logikschritt in der Reihenfolge aus Kampf 2.2 und Welt
  src/pruef/            Prüfszene (Kampf 11.2), Eingabedatei (11.1), Protokoll und Objektprotokoll (11.3 bis 11.5), MD5, CLI lauf.ts
  src/darstellung/      Canvas 2D, Tastatur, Debug-Anzeige, Spielschleife nach E13, main.ts
  daten/stages/scheibe.txt   Stage-Daten nach Welt 2.3
  daten/stages/pruefbuehne.txt
  tests/szenen/         Prüfszenen der Abnahmetests
  tests/eingaben/       Eingabedateien
  tests/*.test.ts       Abnahmetests
docs/scheibe.md         Bedienung, Bau, Tests, Stand der Abnahme, Abweichungen und Lücken
```

Namen im Code: deutsche Fachbegriffe der Spezifikation (Figur, Gegner,
Kette, Trefferreaktion, Welle, Rang), damit Code, Protokoll und
Spezifikation dieselben Wörter verwenden; technische Allgemeinbegriffe
(index, buffer, parse) dürfen englisch sein. Kommentare und `docs/scheibe.md`
auf Deutsch.

### 2.3 Qualitätsregeln

- **Keine nackten Zahlen.** Jede Zahl aus der Spezifikation steht in
  `werte.ts` mit Quellkommentar. Eine Zahl im übrigen Code ist nur erlaubt,
  wenn sie aus der Mathematik folgt (0, 1, 2, 65536).
- **Logikkern rein.** `src/kern/` importiert nichts aus `node:`, `dom` oder
  `src/darstellung/`; `tsconfig.json` für den Kern ohne `dom`-Lib.
- **Determinismus** nach Kampf 11.6: kein `Date`, kein `Math.random`, keine
  Iteration über ungeordnete Mengen in der Logik; Slots aufsteigend.
- **Festkomma** nach E12: Positionen, Geschwindigkeiten und Beschleunigungen
  als 32-Bit-Ganzzahlen (`| 0`), Multiplikation mit `Math.imul` oder
  BigInt-Zwischenwert, Division nur, wo die Spezifikation sie vorschreibt.
- **Typprüfung** mit `strict`, keine `any`, keine `@ts-ignore`.
- **Tests** mit `node:test`; jeder Abnahmetest der Spezifikation ist genau
  ein Testfall mit dem Namen der Spezifikation (T1 bis T20 Kampf, W-T1 bis
  W-T10 Welt, D1).
- **Protokoll vor Darstellung.** Die Darstellung liest nur den Zustand des
  Kerns; sie verändert ihn nicht und hat keine eigene Logik.

### 2.4 Befehle (in `package.json` als Skripte, ohne Abhängigkeiten)

| Skript | Befehl |
|---|---|
| `pruefen` | `tsc --noEmit -p tsconfig.json` |
| `test` | `node --experimental-strip-types --test tests/` |
| `lauf` | `node --experimental-strip-types src/pruef/lauf.ts --szene <datei> --eingabe <datei> --aus <ordner>` schreibt `protokoll.csv`, `objekte.csv` und gibt beide MD5 aus |
| `bauen` | `tsc -p tsconfig.browser.json` nach `dist/` |
| `start` | `http-server spiel -p 8080 -c-1` oder `python3 -m http.server 8080 --directory spiel` |
| `foto` | Playwright-Skript `werkzeuge/foto.mjs`: öffnet `http://localhost:8080/`, spielt eine Eingabedatei über die Debug-Schnittstelle ab und speichert `docs/bilder/scheibe_<name>.png` |

### 2.5 Darstellung (Platzhaltergrafik)

- Logische Auflösung 384 × 224, ganzzahlig skaliert auf die Fenstergröße,
  `image-rendering: pixelated`, schwarzer Rand.
- Figur, Gegner, Geschosse, Gegenstände und Behälter als gefüllte Rechtecke
  in den Umrissen aus `docs/design.md` Abschnitt 5 und
  `docs/design-gegner-stages.md` Abschnitt 1 (Vela 57 × 76, Bolzer 57 × 73,
  Rammbock 49 × 71, Zünder 65 × 74, Ballast 70 × 100), Schatten als flache
  Ellipse am Fußpunkt, Blickrichtung als Dreieck, Zustand als Farbe
  (Stand, Angriff aktiv, Getroffen, Liegen, Schutz blinkend), Höhe durch
  Versatz nach oben. Hintergrund als Farbflächen je Abschnitt, Tiefenband
  als Linien, Vordergrundstreifen als halbtransparente Fläche.
- Anzeige nach Welt 10: LP-Balken Figur und zuletzt getroffener Gegner,
  Leben, Punkte, Rang (Debug), Frame (Debug).
- Debug-Anzeige (Taste F1): Trefferflächen des aktiven Angriffs als Rahmen,
  Zielpunkte der Gegner, Zustandsnamen, Kamera-x, Rechte.
- Tastatur: Pfeile = L R O U, Y oder Z = Angriff (A), X = Sprung (S), P =
  Pause, F1 = Debug, F2 = Eingabeaufzeichnung starten/stoppen (Datei zum
  Herunterladen), F3 = Neustart mit Seed + 1. Debug-Schnittstelle
  `window.comet` mit `ladeEingabe(text)`, `schritt(n)`, `zustand()`, für
  Playwright.
- Spielschleife nach E13 mit `requestAnimationFrame` und Akkumulator.

### 2.6 Lücken und Widersprüche in der Spezifikation

Beim Codieren tauchen Stellen auf, die die Spezifikation nicht regelt oder
widersprüchlich regelt. Regel: **nicht raten, nicht still entscheiden.**

1. Steht der Wert in `docs/mechanik.md` oder `research/captcomm/notes.md`,
   gilt der gemessene Wert des Vorbilds.
2. Sonst die einfachste Festlegung, die alle Abnahmetests erfüllt.
3. Jede so geschlossene Lücke kommt in `docs/scheibe.md`, Abschnitt
   „Abweichungen und Lücken“: Stelle, Festlegung, Grund, und ob die
   Spezifikation anzupassen ist. Opus trägt die Anpassung in die
   Spezifikation nach (Phase 4), mit Kennzeichnung „Festlegung beim
   Codieren, 2026-10-03“.
4. Nur wenn beide Festlegungen das Spielgefühl sichtbar ändern würden,
   fragt Opus den Nutzer; sonst nicht.

---

## 3. Phase 0: Einrichtung (Opus selbst)

1. `git fetch origin main && git checkout -B main origin/main`;
   `git log --oneline -1` muss 2fc587b oder neuer zeigen.
2. Werkzeuge prüfen: `node --version` (22), `tsc --version` (6),
   `node --experimental-strip-types -e "const x: number = 1"`,
   `node -e "require('playwright')"` mit
   `NODE_PATH=/opt/node22/lib/node_modules`, Chromium unter
   `/opt/pw-browsers`. Ergebnis in der Rückmeldung.
3. `spiel/` mit `package.json`, beiden `tsconfig`-Dateien, leeren Ordnern
   und `docs/scheibe.md` (Gerüst) anlegen. `.gitignore` um `spiel/dist/`,
   `spiel/aus/` (Prüfläufe) und `node_modules/` ergänzen.
4. Rauchtest: ein Modul `festkomma.ts` mit zwei Tests, `npm run pruefen`,
   `npm test`, `npm run bauen` laufen durch. Commit „Scheibe: Gerüst“.

---

## 4. Phase 1: Dokumente (D4 und D5, parallel; danach Commit)

### D4: Designdokumente und Erkenntnisse

```text
Aufgabe: Arbeite die Entscheidungen E10 bis E22 (Abschnitt 1 des dritten
Auftrags, wörtlich angehängt) in docs/design.md, docs/design-gegner-stages.md
und docs/erkenntnisse.md ein. Lies zuerst CLAUDE.md und die drei Dateien
vollständig. Kein Code, Deutsch, nur die nötigen Änderungen.

1. erkenntnisse.md: Tabelle „Entscheidungen“ um E10 bis E22 ergänzen (Datum
   2026-10-03, je ein Satz Begründung aus dem Auftrag); unter „Wo was steht“
   die Datei docs/scheibe.md eintragen (entsteht in diesem Auftrag).
2. design.md: Abschnitt 9 „Offen“ und alle „Arbeitsregel (Bestätigung des
   Nutzers offen)“ auf „beschlossen (E10)“ bzw. die Nummer der passenden
   Entscheidung umstellen; Punkt 5 (Grenzfälle) nach E14 symmetrisch;
   Abschnitt 4.5 um den Sprint-Sprungangriff (E15) ergänzen; Abschnitt 3
   um E12 und E13; Abschnitt 8 (Scheibe) um E16 und E22. Offen bleiben nur
   Heldennamen, Grafikstil, Sound, Continues, Extraleben.
3. design-gegner-stages.md: Abschnitt 10 „Offene Entscheidungen“ auf die
   Entscheidungen umstellen (Frage 1 Sonderstage und Frage 2 Trefferreaktion
   des schweren Gegners bleiben offen, der Rest ist durch E10, E11, E17,
   E18, E20, E21 entschieden); Abschnitt 4 Prinzip 1 nach E11; Abschnitt 1.4
   Zünder nach E17; Boss-Skizze Ballast nach E18 und E21; Abschnitt 7 Welle
   8 und 9 nach E20.
4. Prüfen: keine Capcom-Namen außerhalb der Quellenabschnitte; die drei
   Dateien nennen keine Arbeitsregel mehr ohne Entscheidungsnummer.
Ablieferung: die drei Dateien, dazu zehn Zeilen Bericht. Nicht committen.
```

### D5: Spezifikationen

```text
Aufgabe: Arbeite die Entscheidungen E10 bis E22 (Abschnitt 1 des dritten
Auftrags, wörtlich angehängt) in docs/spezifikation-kampf.md und
docs/spezifikation-welt.md ein. Lies zuerst CLAUDE.md und beide Dateien
vollständig. Kein Code, Deutsch, nur die nötigen Änderungen; Zahlen und
Testerwartungen bleiben, außer wo eine Entscheidung sie ändert.

1. spezifikation-kampf.md: 13.2 (P1 bis P31) als „beschlossen (E10)“
   führen; 13.3 auflösen: jede Frage mit ihrer Entscheidung beantworten
   (1: E10/P17; 2: E10; 3: E10; 4: E15; 5: E10/P23; 6: E14, dazu 5.1, 5.2,
   8.1, 10.1 symmetrisch umschreiben und K9 als „nicht übernommen (E14)“
   kennzeichnen; 7: E10; 8: E10/P11; 9: E10/P19; 10: E12; 11: E10; 12:
   E16, dazu 6.5 einheitlich t+120; 13: E13, dazu 2.1 anpassen). Abschnitt
   9.3 um den Sprint-Sprungangriff in der Scheibe (E15). Die Abnahmetests
   T1 bis T20 und D1 prüfen, ob eine Erwartung von E14 oder E16 abhängt,
   und anpassen (Blick links symmetrisch).
2. spezifikation-welt.md: Überschrift 7.4 ohne „(Platzhalter)“, SA1 bis
   SA6 als „beschlossen (E11)“; 6 Zünder nach E17 (Zielen 60 Frames mit
   Zielrecht, dann Schuss; Posenzeit danach entfällt oder wird kurz, mit
   Begründung); 7.3 Armschwung nach E18; 7.1 Trefferreaktion 23 Frames
   nach E19 bestätigen; Abschnitt 13 Fragen auflösen (1: E10; 2: E11; 3,
   4, 5, 6, 7, 8, 9: E10; 10: E17; 11: E18; 12: E19). W-T6 und W-T7 und
   alle Tests, die den Zünder oder den Boss betreffen, auf E17 und E18
   prüfen und anpassen.
3. Beide Dateien: Abschnitt „Technik“ oder Vorbemerkung um E22 (TypeScript,
   Kern ohne Browser, Canvas, Node-Tests) und E13 (Spielschleife) ergänzen,
   mit Verweis auf docs/scheibe.md.
4. Prüfen: beide Dateien widerspruchsfrei zueinander bei E11, E14, E16,
   E17, E18, E19; keine Capcom-Namen außerhalb der Quellenabschnitte.
Ablieferung: beide Dateien, dazu zehn Zeilen Bericht mit der Liste der
geänderten Testerwartungen. Nicht committen.
```

Opus prüft beide Ergebnisse gegeneinander (gleiche Entscheidungen, gleiche
Zahlen in Tests) und committet: „Dokumente: Entscheidungen E10 bis E22
eingearbeitet“.

---

## 5. Phase 2 und 3: Codierung der Scheibe

Die Codierung läuft in drei Stufen. Innerhalb einer Stufe arbeiten die
Agenten parallel in getrennten Ordnern; Opus integriert nach jeder Stufe,
lässt `npm run pruefen` und `npm test` laufen und committet. Jeder Agent
bekommt Abschnitt 2 dieses Auftrags (Technische Vorgaben) wörtlich
angehängt und die Regel: **nur die eigenen Dateien ändern; braucht er eine
Änderung an fremden Dateien, schreibt er sie als Vorschlag in seinen
Bericht.**

### Stufe 1: Gerüst und Kern-Grundlagen (K0, allein)

```text
Aufgabe: Baue das Fundament des Logikkerns der vertikalen Scheibe von Comet
Brawlers in spiel/src/kern/ und spiel/src/pruef/, nach
docs/spezifikation-kampf.md (Abschnitte 2, 3, 11) und
docs/spezifikation-welt.md (Abschnitte 2, 4.1, 11). Lies beide
Spezifikationen vollständig, dazu docs/mechanik.md „Konventionen“.

Zu liefern:
1. festkomma.ts: Typ Fest (number, 32-Bit), ausDezimal, zuDezimalText
   (Formatierung nach Kampf 11.3), add, sub, mul (BigInt-Zwischenwert oder
   Math.imul-Zerlegung, Verschiebung mit Rundung nach −∞), divGanz (nur
   ganzzahliger Divisor, Rundung nach −∞), ganz (ganzzahliger Anteil),
   Vergleiche. Tests mit den Beispielwerten aus Kampf 2.4 (1,75 = 114688,
   4,9375 = 323584, 70/256 = 17920, 13/64 = 13312).
2. zufall.ts: Generator nach Welt 11 (Algorithmus und Seed-Regel genau wie
   dort), Zähler der Ziehungen, Hilfsfunktionen für gleichverteilte Wahl
   aus einer Liste und aus einem Bereich in Schritten.
3. werte.ts: alle Konstanten aus mechanik.md, die die Scheibe braucht
   (Bewegung, Sprung, Kette, Sprungangriff, Griff und Wurf, Spezialangriff,
   Sprint, Trefferreaktion der Gegner, Umgeworfen werden, Schaden, Schutz,
   Gegenstände, Boss, Fernangriffe) und aus beiden Spezifikationen, je mit
   Quellkommentar. Lieber zu viele als zu wenige; die späteren Agenten
   ergänzen nur.
4. entitaeten.ts: Typen und Felder nach Kampf 3 und Welt 4.1 (Figur,
   Gegnerslot 0 bis 19, Objektslot 20 bis 59, Geschoss g0 bis g4),
   Zustandscodes nach Kampf 4.3 und Welt 5.2, 6, 7.1 als String-Literal-
   Typen; Anlegen und Freigeben von Slots; Vorframe-Kopien.
5. stage.ts: Parser für das Stage-Datenformat nach Welt 2.1, Band- und
   Kamera-y-Funktionen nach Welt 2.2 und 2.4, Hindernisse; Datei
   daten/stages/pruefbuehne.txt nach Kampf 11.2 und
   daten/stages/scheibe.txt nach Welt 2.3 und 4.7.
6. welt.ts: Gerüst des Logikschritts in der Reihenfolge aus Kampf 2.2 und
   den Phasen W1 bis W5 aus Welt (als leere Funktionen mit Kommentar, was
   dort geschieht), Eingabeabfrage T(f) mit einem Frame Latenz, Frame-
   Zähler, Zustandsobjekt Welt mit allem, was das Protokoll braucht.
7. pruef/: Eingabedatei (Kampf 11.1), Prüfszene (11.2, mit Eingriffen und
   Prüfangriffen als Daten; Ausführung der Prüfangriffe baut Stufe 2 ein),
   Protokoll und Objektprotokoll (11.3 bis 11.5) mit allen Spalten, MD5
   (node:crypto), CLI lauf.ts. Ein Prüflauf mit leerer Logik muss schon
   ein formal richtiges Protokoll schreiben.
8. Tests: festkomma, zufall (feste Folge für Seed 1 dokumentiert), Stage-
   Parser, Protokollformat, Determinismus (zwei Läufe, gleiche MD5).
Ablieferung: Dateien, npm run pruefen und npm test grün, zehn Zeilen
Bericht mit den Schnittstellen (exportierte Typen und Funktionen), die
Stufe 2 verwenden soll. Nicht committen.
```

### Stufe 2: Kernmodule (K1 bis K4, parallel)

Alle vier lesen zuerst beide Spezifikationen vollständig, `mechanik.md`
und die Dateien aus Stufe 1. Sie ändern nur ihre Ordner und ergänzen
`werte.ts` nur durch Anhängen am Ende mit Quellkommentar.

**K1: Figur** (`src/kern/figur/`, `schaden.ts`)

```text
Aufgabe: Implementiere die Spielfigur der Scheibe: Zustandsautomat nach
Kampf 4 (alle Zustände aus 4.3, Vorrang der Drücke 4.2, Bewegung im
Sprung 4.4), Angriffe der Figur mit aktiven Frames und Flächen nach Kampf
5.2 und 5.3 (Kette mit Kombofenster 5.6 ohne Puffer, Sprungangriff vier
Varianten, Sprintangriff, Sprint-Sprungangriff nach E15, Spezialangriff
mit wachsender Fläche nach 9.4), Griff, Kniestoß, Wurf und geworfener
Gegner als Geschoss nach Kampf 8, Sprint mit Doppeltipp und Tempoverlauf
nach 9.1 bis 9.3, Waffen und Aufnehmen nach 10, Schaden, Schutz, Kosten,
Tod und Neueinstieg nach 6 (Neueinstieg einheitlich t+120 nach E16,
Landung trifft alle Gegner im Bild, Schutz 252 Frames). Blickrichtung
symmetrisch nach E14. Die Figur bietet eine Funktion schritt(welt,
tasten) und liefert ihre Angriffsinstanzen (Fläche, Schaden, Umwerfen,
Frame) an treffer.ts; die Trefferprüfung selbst macht K2. Umwerfen und
Flugbahn der Figur nach mechanik.md „Umgeworfen werden“.
Tests: je Zustand ein Test mit Frame-Erwartungen aus mechanik.md
(Startup, Dauer, handlungsfähig ab), Kombofenster h+12 bis h+27, Sprung
P+21 Scheitel 51,25, P+42 Aufsetzen, P+48 frei, Sprintverlauf 267,875 px
in 90 Frames, Spezialangriff P+8 bis P+43 mit Flächen 43 bis 123 px.
Bericht: Schnittstelle zu treffer.ts und zu den Gegnern (was ein Treffer
an der Figur auslöst).
```

**K2: Trefferprüfung und Gegner-Reaktion** (`src/kern/treffer.ts`, `src/kern/gegner/reaktion.ts`)

```text
Aufgabe: Implementiere die Trefferprüfung nach Kampf 5 (Abstände und
Flächen 5.1, aktive Frames und Trefferstopp 5.3 mit einmal 7 Frames je
Frame mit Treffern, Reihenfolge im Frame 5.4 mit Vorrang der Figur beim
gleichzeitigen Treffer, ein Treffer je Ziel 5.5, Umwerfen und Flugbahnen
5.7, Gegnerangriffe gegen die Figur 5.8 einschließlich Geschosse mit den
Flächenformeln aus mechanik.md „Fernangriffe der Gegner“, Schutz der
Figur wirkungslos ohne Trefferstopp für den Angreifer nach E10/P11) und
die Trefferreaktion der Gegner nach Kampf 7: 23 Frames ohne Rückstoß mit
Neustart (E3), Umwerfen mit Flugbahn K+1 bis K+8 Stillstand, 2,875
px/Frame, Schwerkraft 70/256, Ruhe K+55 bei 135,125 px, Liegen (leicht 32,
schwer gleichverteilt 16 bis 44 nach E10), Aufstehen 18 Frames, kein
Schutz danach (E4), Verwundbarkeit, Tod und Slot-Freigabe nach 79 Frames,
Gegner mit genau 0 LP leben weiter; Behälter nach Welt 9.2 als
Trefferziele. Prüfangriffe aus der Prüfszene (Kampf 11.2) als
Angriffsinstanzen der Puppen. treffer.ts arbeitet mit den
Angriffsinstanzen der Figur (K1) und der Gegner (K3, K4) über eine
gemeinsame Schnittstelle aus Stufe 1; ist sie unzureichend, Vorschlag im
Bericht.
Tests: Reichweiten 85/86, 87/88, 91/92, 100/101 px und Tiefe 11/12/13 px,
Trefferstopp bei zwei Gegnern einmal 7 Frames, Reaktion 23 Frames mit
Neustart, Umwerfen Ruhe K+55 bei 135,125, Puppe schwer mit 30 LP nach
voller Kette 8 LP, gleichzeitiger Treffer, Tod und Slot frei nach 79.
```

**K3: Nahkämpfer, Fernkämpfer, Wellen, Kamera, Rang, Gegenstände, Rahmen** (`src/kern/gegner/nah.ts`, `fern.ts`, `wellen.ts`, `kamera.ts`, `rang.ts`, `gegenstaende.ts`, `rahmen.ts`)

```text
Aufgabe: Implementiere die Welt der Scheibe außer dem Boss: Kamera nach
Welt 3 (nur nach rechts, Folgepunkt Bildschirm-x 200, Sperre, Halt, Blende
mit Schnitt, Arena mit Totzone), Aktivierung und Wellen nach Welt 4
(aktives Fenster, Aufwachen bei 1 px im Bild, Auftritte Versteck und
Hocke, Auslöser nach Kamera-x, Lebenden und Boss-LP, LP und Schaden beim
Erscheinen nach Rang), Nahkämpfer nach Welt 5 (Zustandsautomat 5.2,
Bewegung 5.3 mit zufälliger Gehstufe nach E10, Angriff mit Zielabstand
und Abbruchfenster 5.4, Angriffsarten 5.5 mit Startup, aktiven Frames,
Flächen aus mechanik.md „Reichweite der Gegnerangriffe“, Serie und
Angriffswahl 5.6, Angriffserlaubnis 5.7 nach E5 und E2 ohne Rücksicht auf
Schutz, Abwarten, Seitenwechsel und Verfolgung 5.8, Rückkehr 5.9),
Fernkämpfer nach Welt 6 mit E17 (Zielen 60 Frames mit Zielrecht, dann
Schuss; Rakete, Explosion, Waffe beim Tod), Rang nach Welt 8 (Start 9,
+1 nach 409 und dann alle 600 Frames, −3 bei Tod, Pause der Gegner
29 − 4·⌊Rang/4⌋), Gegenstände und Behälter nach Welt 9 (Flug 48 Frames,
Liegezeit 700 + 92, Aufnehmen, Essen, Raketenwerfer 3 Schuss), Anzeige-
Daten, Leben, Punkte, Phasen, Stage-Ende und Game Over nach Welt 10 und
E10 (kein Continue, Neustart mit Seed + 1). Zufall nur über zufall.ts.
Tests: Wellentabelle der Scheibe (Welle 1 bei Figur 150 px am Versteck,
Welle 2 bei Kamera-x 250, Sperre 400 bis beide besiegt, Halt 440, Schnitt
466), Nahkämpfer hält 46 bis 48 px an, Angriffspause nach Rang, Abbruch
bei mehr als 32 px vom Zielpunkt, Erlaubnis höchstens zwei und je Seite
einer, Zünder zielt 60 Frames und schießt aus 112 bis 136 px, Rang 9 → 10
in Frame 409, Gegenstand verschwindet in L+792.
```

**K4: Boss** (`src/kern/gegner/boss.ts`)

```text
Aufgabe: Implementiere den Boss der Scheibe (Ballast) nach Welt 7 und
mechanik.md „Boss“: Werte und Zustände 7.1 (100 LP in der Scheibe,
Trefferreaktion 23 Frames nach E19, Umwerfen, Aufstehen mit 11 bis 17
Frames Schutz wie gemessen), Rhythmus und Auswahl 7.2 (Entscheidungsframe,
Abstände 170 bis 200 Frames, Auswahl nach Abstand über zufall.ts), die
drei Angriffe der Scheibe 7.3 (kurzer Schlag, Armschwung nach E18: weiter
nur nach Treffer, höchstens drei; Ansturm wirft bei Kontakt um, ohne
Griff nach E10 und E21; Körperpresse mit Flugbahn und Zielpunkt) mit
Startup, aktiven Frames, Flächen und Schaden nach mechanik.md „Boss“,
Super-Armor nach E11 (SA1 bis SA6: vorläufige LP, lp_folge, Rückzug 54
Frames und 48 px nicht treffbar bis 62 Frames, Abfangen entfällt),
Verstärkung an LP-Schwellen 7.5 (Scheibe: Welle 9 bei 25 LP), Fall
besiegt alle 7.6, Auftritt aus der Asservatenkammer bei Kamera-x 1792 mit
Zerschlagen der Kisten (Welt 4.6, 9.2). Angriffsinstanzen über die
Schnittstelle aus Stufe 1 an treffer.ts.
Tests: Kette 1 bis 3 ohne Umwerfen: LP in h+23 nach dem letzten Treffer
zurück auf lp_folge, Rückzug 54 Frames; Kette mit Tritt zieht endgültig
ab; Spezialangriff 6 LP endgültig; Armschwung bricht nach Fehlschlag ab;
Ansturm wirft um; Welle 9 bei 25 LP; Fall setzt alle übrigen Gegner auf
LP −1 im selben Frame.
```

### Stufe 3: Abnahmetests und Darstellung (K5 und K6, parallel; nach der Integration von Stufe 2)

**K5: Abnahmetests** (`tests/`, `docs/scheibe.md` Abschnitt „Abnahme“)

```text
Aufgabe: Schreibe alle Abnahmetests der Spezifikation als Tests mit
node:test: Kampf 12 (T1 bis T20, D1) und Welt 12 (W-T1 bis W-T10), je
Test genau eine Prüfszene in tests/szenen/, eine Eingabedatei in
tests/eingaben/ und Erwartungen Frame für Frame genau wie in der
Spezifikation (Toleranz keine). Jeder Test führt den Prüflauf über
src/pruef/ aus und vergleicht die genannten Protokollzellen. Dazu ein
Determinismustest (jede Szene zweimal, MD5 gleich) und ein Test, der
protokoll.csv einer Szene gegen eine im Repo abgelegte Referenzdatei
vergleicht (tests/referenz/, erzeugt beim ersten grünen Lauf).
Schlägt ein Test fehl, prüfe zuerst die Erwartung gegen mechanik.md und
die Spezifikation, dann den Kern. Fehler im Kern beschreibst du im Bericht
mit Testname, erwartetem und tatsächlichem Wert und, wo du ihn gefunden
hast, der Ursache (Datei, Funktion); du änderst den Kern nicht selbst.
Fehler in der Erwartung (Spezifikation widerspricht mechanik.md)
beschreibst du nach Abschnitt 2.6 des Auftrags in docs/scheibe.md.
In docs/scheibe.md Abschnitt „Abnahme“: Tabelle je Test mit Stand (grün,
rot mit Grund, nicht umsetzbar mit Grund).
```

**K6: Darstellung** (`src/darstellung/`, `index.html`, `werkzeuge/foto.mjs`, `docs/scheibe.md` Abschnitt „Bedienung“)

```text
Aufgabe: Baue die Darstellung der Scheibe nach Abschnitt 2.5 des Auftrags:
Canvas 2D, 384 × 224 ganzzahlig skaliert, Platzhalterrechtecke in den
genannten Umrissen mit Schatten, Blickrichtung, Zustandsfarbe und
Höhenversatz, Hintergrundflächen, Tiefenband, Vordergrundstreifen,
Anzeige nach Welt 10, Debug-Anzeige (F1) mit Trefferflächen, Zielpunkten,
Zuständen, Tastatur, Pause, Eingabeaufzeichnung (F2, Datei zum
Herunterladen im Format Kampf 11.1), Neustart (F3), Spielschleife nach
E13, Debug-Schnittstelle window.comet. Die Darstellung liest nur den
Kern; keine Logik. Dazu werkzeuge/foto.mjs mit Playwright
(NODE_PATH=/opt/node22/lib/node_modules, Chromium aus /opt/pw-browsers,
kein playwright install): startet den Webserver, lädt die Seite, spielt
die Eingabedatei tests/eingaben/vorfuehrung.txt ab (du schreibst sie:
etwa 1500 Frames mit Laufen, Kette gegen Welle 1, Sprung, Griff und Wurf,
Spezialangriff, Sprint), macht alle 300 Frames ein Bild nach
docs/bilder/scheibe_<frame>.png und eines mit Debug-Anzeige. Bedienung,
Bau und Start in docs/scheibe.md Abschnitt „Bedienung“.
Tests: ein Test, dass main.ts ohne Kern-Änderung typprüft, und ein
Playwright-Lauf, der die Seite lädt, 600 Schritte über window.comet
ausführt und prüft, dass das Protokoll der Debug-Schnittstelle dieselben
Werte liefert wie ein Prüflauf in Node mit derselben Eingabedatei.
```

### Integration durch Opus nach jeder Stufe

1. `npm run pruefen`, `npm test`, `npm run bauen`; Fehler an den
   zuständigen Agenten zurück (SendMessage) mit genauer Fehlermeldung,
   höchstens drei Runden je Stufe; danach behebt Opus selbst.
2. Nach Stufe 3: alle Abnahmetests grün oder in `docs/scheibe.md` mit
   Grund rot; Determinismus gezeigt; Bilder in `docs/bilder/`; Opus spielt
   die Vorführung zusätzlich mit der Debug-Anzeige durch und prüft
   stichprobenartig fünf Werte gegen `mechanik.md` (Laufgeschwindigkeit,
   Sprunghöhe, Kettenreichweite, Trefferstopp, Nahkämpfer-Haltepunkt).
3. Commits: „Scheibe: Gerüst“, „Scheibe: Kern (Figur, Treffer, Gegner,
   Boss, Welt)“, „Scheibe: Abnahmetests“, „Scheibe: Darstellung und
   Bilder“. Vor jedem Commit `git status` sauber, `dist/` und `aus/`
   nicht im Index.

---

## 6. Phase 4: Nacharbeit (Opus)

1. Lücken aus `docs/scheibe.md` „Abweichungen und Lücken“ in die
   Spezifikationen nachtragen (Kennzeichnung „Festlegung beim Codieren,
   2026-10-03“), Commit „Spezifikation: Festlegungen beim Codieren“.
2. `docs/erkenntnisse.md` Stand-Tabelle um die Zeile „Vertikale Scheibe“
   mit dem Stand der Abnahme.
3. `CLAUDE.md` um einen Abschnitt „Spiel“ ergänzen: Ablage `spiel/`,
   Befehle `npm run pruefen`, `npm test`, `npm run bauen`, `npm start`,
   keine Abhängigkeiten installieren, Logikkern ohne Browser, Zahlen nur in
   `werte.ts` mit Quelle. Commit „CLAUDE.md: Hinweise zum Spiel“.

---

## 7. Rückmeldung an den Orchestrator

```text
## Rückmeldung Opus, Auftrag 3, <Datum>

### Commits auf main
<hash> <Nachricht> (je Zeile)

### Werkzeuge
Node, tsc, Playwright, Webserver: je ok oder Umgehung

### Dokumente
E10 bis E22 eingearbeitet in: <Dateien>; geänderte Testerwartungen: <Liste>; verbleibende offene Entscheidungen: <Liste>

### Umfang des Codes
Dateien und Zeilen je Ordner (kern, pruef, darstellung, tests); Konstanten in werte.ts: <Anzahl>

### Abnahme
Kampf T1 bis T20, D1 und Welt W-T1 bis W-T10: <n> grün, <n> rot (je Test ein Satz Grund), <n> nicht umsetzbar (Grund)
Determinismus: MD5 der Vorführung zweimal gleich: ja/nein
Stichprobe gegen mechanik.md: fünf Werte mit Soll und Ist

### Abweichungen und Lücken (aus docs/scheibe.md, je ein Satz)

### Bilder
docs/bilder/: <Liste>

### Was nicht erledigt wurde und warum

### Fragen an den Nutzer (nummeriert, je ein Satz)

### Laufzeit, Probleme mit dem Container
```
