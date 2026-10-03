# Rückmeldung Arbeitssitzung (Claude Sonnet 5.5), Auftrag 6, 2026-10-03

Stand: **Zwischenstand an Haltepunkt 2** (Phase 0, 1 und 2 fertig, Freigabe zu
Haltepunkt 1 am 2026-10-03). Phase 3 und 4 folgen nach der Freigabe zu
Haltepunkt 2; diese Datei wird dann fertiggestellt.

## Commits
Erster Commit auf `main`: `3526453` (Godot-Projekt, Festkomma, Zufall, Werte,
Tasten, Entitäten, Ereignisse). Letzter Commit dieses Stands: siehe `git log`
(Commit „Rückmeldung Auftrag 6, Zwischenstand Haltepunkt 1“). Alle Commits
direkt auf `main`, keine Branches, kein Pull Request. Workflow
`Godot-Tests`: grün ab Commit `7d485d4` (Lauf 10, Ergebnis `success`); die
frühen Zwischenstände waren grün, weil `alle.gd` dort nur ein Rauchtest war.

## Godot-Version und Umgebung
Godot 4.7.2.stable.official (`--headless --version` gibt
`4.7.2.stable.official.ed1daf0bf` aus), Linux x86_64 im Claude-Container,
`GODOT_VERSION` im Workflow ebenfalls 4.7.2. Laufzeit des Testlaufs
(`alle.gd`, 362 Prüfungen einschließlich aller 74 Szenen und Determinismus):
etwa 9 bis 10 s lokal; die 74 Szenen allein 8,6 s. Frischer Klon von GitHub
mit `--import` und `alle.gd`: grün.

## Port
| Ordner | Dateien | Zeilen |
|---|---|---|
| `godot/kern/` (ohne `werte.gd` etwa 10 400) | 35 | 11 472 |
| `godot/pruef/` | 5 | 917 |
| `godot/tests/` | 3 | 918 |
| `godot/darstellung/` | 0 (nur leere `spiel.tscn`) | 0 |
| `godot/werkzeuge/` | 0 | 0 |

Zum Vergleich: der TypeScript-Kern hat 12 272 Zeilen. Konstanten in
`werte.gd`: 495 (alle Namen aus `werte.ts`; `werte.gd` ist aus `werte.ts`
mechanisch erzeugt, Festkommawerte `ausDezimal`/`ausBruch` sind einmal
ausgerechnet und als Rohwert eingetragen, der Aufruf steht als Kommentar
dahinter). Die Portregeln, nach denen die Module entstanden, stehen in
`godot/PORTREGELN.md`.

Vorgehen: Fundament (Festkomma, Zufall, Werte, Tasten, Entitäten, Ereignisse,
Welt) von der Hauptsitzung; die übrigen Module von zehn Unteragenten
parallel, je Datei genau ein Schreiber; Zusammenführung und Abnahme durch die
Hauptsitzung.

## Abnahme (Haltepunkt 1)
Szenen bitgleich: **74 von 74**; keine abweichende Szene.
Grundlagentests: Festkomma, Zufall, Tasten, Eingabeparser, Stage-Parser
(beide Stages), Protokollformat, Reinheit des Kerns: grün (insgesamt 362
Prüfungen mit den Szenen und dem Determinismustest).
Determinismus: ja (T1 zweimal, gleiche MD5; die Szenenläufe erzeugen
zusätzlich die Referenz-MD5 aus `PRUEFSUMMEN.md5`).
Leistung: Vorführung headless noch nicht gemessen (Phase 3); alle 74 Szenen in
8,6 s.

## Darstellung (Phase 2)
Platzhalter: **fertig** (Rechtecke, Schatten, Hintergrundbänder, Anzeigeleiste,
Debug F1, Pause P, Einzelschritt N, Aufzeichnung F2, Neustart F3,
Tastenbelegung wie `docs/scheibe.md`, Spielschleife in `_physics_process`
mit 60 Hz und höchstens 4 Schritten je Bild, Sitzungsklasse ohne Nodes,
Zeichner mit Faktor 2). Vela-Puppe: **Stand, Gehen (12 Bilder zu je 4 Frames)
und Kette 1 bis 4** aus den Teilen von `vela_t_teile.png` (13 Teile, 64 Farben,
Maßstab 142 px), als `Skeleton2D` mit 16 Bones; alle anderen Aktionen zeichnet
weiter der Platzhalter. Bilder: `docs/bilder/godot_szene_0300/0600/0900/1200/1500.png`
(Platzhalter), `godot_vela_szene_*.png` (mit Puppe), `godot_kontakt_vela.png`
(Kontaktbogen). Tests: `darstellung_test.gd` (121 Prüfungen), `vela_test.gd`
(2129), `puppe_protokoll_test.gd` (Vorführung 600 Schritte mit Darstellung und
Puppe: Protokoll bitgleich zur Referenz). `alle.gd`: 2616 Prüfungen grün.

Abweichungen der Darstellung (nur Godot): Bildschirmfotos brauchen
`xvfb-run -a godot --path godot --rendering-driver opengl3 --script
res://werkzeuge/foto.gd` (unter `--headless` gibt es kein Rendering; das
Projekt nutzt `gl_compatibility`). Die Platzhalterbilder sind nicht
pixelgleich zur Canvas-Fassung (Dreiecke und Ellipsen als Fächer ohne
Glättung, 4/4-Strichmuster), optisch gleich. Die Gehpose rutscht ca. 25 %
(Kompromiss der Schrittweite); die Posen sind von Hand gesetzte
Winkeltabellen (15°-Stufen), die Drehbilder der Kette 4 stauchen/spiegeln den
Körper, weil das Teileblatt keinen Hinterkopf hat (Nachbestellung nötig, wenn
eine Rückenansicht gewünscht wird); der gestreckte Ärmel ist am Ellbogen
geteilt, der angewinkelte Ärmel (`aermel_angewinkelt`) ist ungenutzt.

## Befunde zur TypeScript-Fassung (Verhalten ohne Spezifikation, mögliche Fehler)
Der Port blieb überall bitgleich zur Referenz. Beobachtungen der Port-Agenten,
zur Nachpflege durch den Orchestrator (keine davon ändert ein Protokoll):

1. `fern.ts`: `fernHatGetroffen` setzt `angriff_treffer = welt.frame`;
   `fernBewegung` und `fernAbbruch` prüfen `> 0` bzw. `== 0`. Das hängt davon
   ab, dass `welt.frame` im Kampfschritt nie 0 ist.
2. `treffer.ts` (um Zeile 358): `meine` hängt nur von `g.pruefangriff === i + 1`
   ab; der Zweig `inst !== null && inst.code !== 'PA'` ist nur über `!meine`
   erreichbar.
3. `schaden.ts` und `figur/intern.ts` lesen `steuerung` unterschiedlich:
   `eingang()` liefert bei `steuerung == 0` leere Eingaben, `schaden.ts` liest
   roh (Ausnahme Neueinstieg, laut Kommentar gewollt).
4. `figur/angriffe.ts`: `ketteFenster` und `ketteAktiv` lesen die Fenster mit
   `tab(AUSFALL_AKTIV_VON, i)`; bei Stufe 1 mit Ausfallschritt steht dort der
   Platzhalter 0, das Fenster wäre 0 bis 0.
5. `eingriffe.ts`: `eingriffPruefen` prüft nicht, ob `wert` zum Feld passt
   (Zahl bei `x`); der Fehler tritt erst in `eingriffAnwenden` auf, das
   `eingriffPruefen` noch einmal aufruft (doppelte Arbeit ohne Folgen).
6. `pruef/szene.ts`: `kamera.modus` speichert den gefundenen Text, nicht den
   Index; Fehlermeldungen von `satzZeilen` tragen nur die Zeilennummer.
7. `kamera.ts`: `offenerSchnitt` und die Blende benutzen nur `schnitte[0]`
   (im Kopf als Festlegung dokumentiert, in der Spezifikation nicht).
8. `gegner/boss_bahn.ts`: `BAHNEN.F1` hat `boden_vx` null, die Bossbahn
   `explosion` setzt 0. `festZahl` in `boss_zustand.ts` und in `nah.ts` sind
   zwei verschiedene Funktionen gleichen Namens.
9. `werte.ts` Kommentar zu `rang.ts`: „Q1“-Division als Lücke von Kampf 2.4,
   umgesetzt mit `divGanz`.

## Abweichungen und Lücken (nur Godot)
- **Fehlerbehandlung**: `throw` der TypeScript-Fassung wird zu `push_error`
  mit demselben Text und einem unauffälligen Rückgabewert; GDScript kann
  Fehler nicht abfangen. Die Szenen lösen keinen dieser Fälle aus. Die
  `throws`-Tests der TypeScript-Fassung (Festkomma, Zufall, Eingabe) gibt es
  deshalb in Godot nicht.
- **Konstanten mit Objekten** (`BAHNEN`, `BOSS_BAHNEN`, `FLAECHE_AS/AN/KP`,
  `GEH_SCHRITT_*` als Tempo): GDScript hat keine Objektkonstanten; es sind
  Funktionen, die bei jedem Aufruf frische Objekte liefern (`KernBahn.bahnDaten`
  usw.). Dictionary-Konstanten stehen in `werte.gd`.
- **`Number(...)`/Dezimaltext** in `fest.*`-Werten (`festZahl`,
  `liegedauerZiehen`): nur ganze Zahlen werden erkannt (das Wort `float` ist im
  Kern verboten). Die Szenen setzen nur Ganzzahlen.
- **Regulärer Ausdruck, Leerraum und `trim`** von JavaScript (inklusive NBSP,
  U+2000 bis U+200A, U+3000, BOM) sind in `KernStage` nachgebildet; `eingabe.gd`
  und `szene.gd` benutzen sie.
- **`produktGroesser`** nutzt 64 Bit statt BigInt; die Faktoren der Aufrufer
  liegen unter 2^31.
- **`Infinity`** in `nah_gehen` ist `1 << 60`.
- **Stabiles Sortieren** (`kameraY`, `wellenAnlegen`, `wellenPruefen`,
  `erscheinendeGegner`): eigener Einfügesort, weil `Array.sort` in GDScript
  nicht stabil ist.
- **Zyklische Klassenverweise** (`KernWelt` ↔ Module) übersetzen in 4.7.2
  ohne Probleme; einzelne Funktionen der Reaktion und der Figur nehmen
  `welt: KernWelt`, `ereignisse.gd`/`entitaeten.gd` nehmen `Object`.
- **`.uid`-Dateien** von Godot 4.4+ liegen im Repo (empfohlen); `.godot/` ist
  ignoriert.
- Die Kommandozeile des Prüflaufs löst relative Pfade ab dem Repo-Wurzel
  auf (`spiel/tests/szenen/…`), nicht ab `spiel/`.

## Was nicht erledigt wurde und warum
Phase 2 bis 4 (Darstellung, Vela-Puppe, Abnahme, `docs/godot.md`,
Nacharbeit an `erkenntnisse.md`/`scheibe.md`): warten auf die Freigabe an
Haltepunkt 1.

## Fragen an den Nutzer
Keine offenen Fragen zu Phase 1. Zu Phase 2: die Zuordnung Aktion → Animation
für Vela entnehme ich `docs/grafik.md`, Abschnitt 3 und 9.3; melde mich, falls
dort Lücken sind.
