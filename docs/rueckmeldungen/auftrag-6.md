# Rückmeldung Arbeitssitzung (Claude Sonnet 5.5), Auftrag 6, 2026-10-03

Stand: **Zwischenstand an Haltepunkt 1** (Phase 0 und 1 fertig). Phase 2 bis 4
folgen nach der Freigabe; diese Datei wird dann fortgeschrieben.

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

## Darstellung
Noch nicht begonnen (Phase 2).

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
