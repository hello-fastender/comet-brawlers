# Auftrag 4: Grafik der vertikalen Scheibe im Stil E23 (Arcade-Pixel)

Stand 2026-10-03. Orchestrator ist die Fable-Sitzung des Nutzers. Dieser
Auftrag folgt auf Auftrag 3 (`2026-10-03-opus-auftrag-3-codierung-scheibe.md`).
**Abschnitt 1 von Auftrag 1 (Regeln) und Abschnitt 2 von Auftrag 3
(Technische Vorgaben) gelten weiter.** MAME und ROM werden nicht gebraucht.

Ziel: Die Platzhalterrechtecke der Scheibe werden durch Pixelgrafik im
beschlossenen Stil E23 ersetzt: Sprites und Animationen für Vela, Bolzer,
Rammbock, Zünder, Ballast und die Puppe; Gegenstände, Behälter, Geschosse
und Effekte; die Hintergründe der Abschnitte A, B und F mit Vordergrund;
die Anzeigeleiste mit eigener Schrift. Die Logik, das Protokoll und alle
Tests bleiben unverändert. **Grafik entsteht als Code** (prozedurale
Pixelgrafik in TypeScript, ohne Werkzeuge von außen), damit sie
reproduzierbar, änderbar und ohne Paketinstallation baubar ist.

---

## 0. Startprompt für die Opus-Sitzung

```text
Du bist die Arbeitssitzung für das Projekt Comet Brawlers. Der Orchestrator
hat den vierten Auftrag in docs/auftraege/2026-10-03-opus-auftrag-4-grafik-scheibe.md
abgelegt. Lies zuerst CLAUDE.md, dann Abschnitt 1 (Regeln) von
docs/auftraege/2026-10-02-opus-messungen-und-design.md und Abschnitt 2
(Technische Vorgaben) von docs/auftraege/2026-10-03-opus-auftrag-3-codierung-scheibe.md,
dann den vierten Auftrag vollständig, dann docs/scheibe.md, docs/design.md
(Abschnitte 2, 5, 7, 8), docs/design-gegner-stages.md (Abschnitte 1, 4, 7,
8, 9), die Entscheidung E23 in docs/erkenntnisse.md und
spiel/werkzeuge/stilproben.html. Arbeite die Phasen 0 bis 5 des vierten
Auftrags der Reihe nach ab. Nur auf main, keine Branches, keine Pull
Requests, Deutsch. Halte an den zwei Haltepunkten an und zeige mir die
Kontaktbögen; arbeite erst nach meiner Freigabe weiter. Am Ende die
Rückmeldung im Format aus Abschnitt 8.
```

---

## 1. Stilvorgaben E23 im Einzelnen

Grundlage ist die Entscheidung E23 (`docs/erkenntnisse.md`) und die
gewählte Stilprobe `docs/bilder/stil_1_arcade_szene.png` mit
`stil_1_arcade_nah.png`. Daraus folgen diese verbindlichen Regeln; sie
kommen als Abschnitt „Stilhandbuch“ nach `docs/grafik.md`.

### 1.1 Raster und Maß

- Alles im Spielraster 384 × 224. Ein Bildpixel ist ein Spielpixel; keine
  Halbpixel, keine Kantenglättung, keine Transparenzstufen außer voll
  deckend und durchsichtig (Ausnahme: Schatten, Blende und Vordergrund
  dürfen eine feste Deckkraft haben, siehe 1.6).
- Figuren halten die beschlossenen Umrisse (Breite × Höhe mit Schatten,
  `spiel/src/darstellung/masse.ts`): Vela 57 × 76, Bolzer 57 × 72,
  Rammbock 60 × 76, Zünder 64 × 72, Ballast 70 × 100, Puppe wie Bolzer. Der
  Körper im Stand ist höchstens so breit wie der Umriss und etwa 5 px
  niedriger (die Schattenellipse liegt unter dem Fußpunkt). Einzelne Posen
  (Kette, Sprungtritt, Armschwung) dürfen über den Umriss hinausragen, aber
  nicht weiter als die Reichweite des Angriffs es verlangt: Der Schlag der
  Kettenstufe 1 reicht 85 px von der Figurposition, also darf die Faust in
  diesem Bild bis etwa 60 px vor dem Fußpunkt stehen, damit ein sichtbarer
  Magnetstoß (Effekt) den Rest trägt. Der Fußpunkt (Position der Entität)
  ist in jedem Bild der Ankerpunkt.
- Das Vorbild ist Referenz für Proportionen: Kopf etwa 1/5 der Körperhöhe,
  große Hände und Füße, breite Schultern bei schweren Figuren
  (`research/captcomm/grafik/figuren/*.png`, nur als Maßstab ansehen, nichts
  abzeichnen).

### 1.2 Farbe

- **Je Material eine Farbtreppe aus fünf Tönen** (dunkelste Kontur,
  Schatten, Grundton, Licht, Glanz), erzeugt wie in `stilproben.html`
  (`treppe(basis)`): Schatten verschieben den Farbton Richtung Blau und
  senken die Sättigung leicht, Lichter Richtung Gelb; der Glanzton ist nur
  für glänzendes Material (Metall, Visiere, Magnethandschuhe, Eis).
- **Höchstens 16 Farben je Figur** (15 plus durchsichtig), wie eine Palette
  des Vorbilds. Das zwingt zu drei bis vier Materialien je Figur und hält
  die Figuren lesbar. Gegenstände höchstens 8 Farben, Hintergrund eines
  Abschnitts höchstens 48 Farben, Anzeigeleiste höchstens 8.
- **Globale Palette**: Alle Farben des Spiels kommen aus einer Datei
  `spiel/grafik/quelle/palette.ts`, in der jedes Material mit Basisfarbe
  und Treppe benannt ist (zum Beispiel `JACKE_VELA`, `OVERALL_BOLZER`,
  `STAHL`, `EIS`, `HAUT_HELL`, `HAUT_DUNKEL`, `NEON_MAGENTA`). Figuren
  teilen Materialien (Haut, Leder, Stahl), damit das Bild einheitlich
  wirkt. Keine Farbe entsteht im Zeichencode selbst.
- **Außenkontur** in einem dunklen Violett (der Wert aus `stilproben.html`,
  dort als Außenkontur verwendet), **Innenkonturen** zwischen Teilen im
  dunkelsten Ton des jeweiligen Materials. Konturen sind geschlossen, 1 px,
  keine doppelten Konturen.
- **Hintergründe gedämpfter als Figuren**: Sättigung und Kontrast des
  Hintergrunds um etwa ein Drittel unter denen der Figuren, Hintergründe
  insgesamt kühler (Eisblau-Nacht), Figuren wärmer (Haut, Orange,
  Signalfarben). Ein Figurenpixel muss sich auf jedem Hintergrundpixel, auf
  dem er stehen kann, um mindestens zwei Treppenstufen unterscheiden.
  Prüfbar: der Boden der Tiefenbänder hat keinen Ton, der in einer
  Figurenpalette vorkommt.

### 1.3 Licht und Form

- Licht von links oben vorn (Vektor aus `stilproben.html`, `LICHT`).
  Linke und obere Kanten der Teile tragen den Lichtton, rechte und untere
  den Schatten; Unterseiten (Kinn, Ärmelenden, Bauch unter dem Brustkorb)
  im Schatten.
- Rundungen (Arme, Beine, Rumpf) als Zylinder schattiert: Grundton in
  der Mitte, Licht am linken Rand, Schatten am rechten, je 1 bis 2 px
  breit; bei 57 px breiten Figuren nie breiter als 3 px.
- **Raster (Bayer 4 × 4) nur auf großen Flächen**: Hintergrundverläufe,
  Himmel, Boden, Nebel, Explosionen, der Bauch des Ballast. Auf Figuren
  höchstens eine Rasterzeile am Übergang von Licht zu Schatten bei Flächen
  über 10 × 10 px, sonst harte Stufen. Nie Raster auf Gesichtern und
  Händen.
- Kein Pixel steht allein: Jeder Farbpixel hat mindestens einen gleichen
  Nachbarn, außer Glanzpunkte (genau 1 px) und Funken.

### 1.4 Lesbarkeit im Spiel

- **Silhouette**: Jede Figur ist als schwarze Silhouette erkennbar
  (Kopfform, Schulterbreite, Waffe). Vela schlank mit Pferdeschwanz und
  dicken Handschuhen, Bolzer gedrungen mit Maske, Rammbock breit mit
  Polsterweste, Zünder mit Rohr auf der Schulter, Ballast riesig mit
  Ladearm.
- **Zustände müssen ohne Debug-Anzeige lesbar sein**, weil die Logik sie
  so bemisst: Kampfhaltung (Ankündigung 25 bis 5 Frames), Ausholen
  (Startup 4 bis 10 Frames), aktive Frames (das Bild mit der größten
  Reichweite), Nachlauf, Trefferreaktion (23 Frames, Zittern), Liegen,
  Aufstehen, Zielen des Zünders (60 Frames), Ankündigung des Ballast
  (mindestens 15 Frames vor jedem Angriff), Rückzugsstoß (54 Frames),
  Schutz der Figur (Blinken: jedes zweite Framepaar nur Kontur, wie heute).
- **Das Bild mit dem Treffer liegt im ersten aktiven Frame** jeder
  Angriffsanimation; die Posen vor dem aktiven Frame sind Ausholen, die
  nach dem letzten aktiven Frame sind Rückzug. Die Zahlen stehen in
  `spiel/src/kern/werte.ts` (Startup, aktive Frames, Dauer je Aktion);
  die Animationstabellen des Vorbilds (`docs/design.md` Abschnitt 8,
  `docs/design-gegner-stages.md` Abschnitt 9) geben nur die Verteilung der
  Bilder vor. Weichen beide ab, gilt die Logik.
- **Füße rutschen nicht**: Beim Gehen (12 Bilder zu 4 Frames, 84 px je
  Zyklus für Vela; 8 Bilder zu 4 Frames für Bolzer und Rammbock bei 1,75
  bzw. 1,6 px/Frame) bewegt sich der Standfuß je Bild um die Strecke
  zurück, die die Figur in 4 Frames vorwärts geht (7 px bei 1,75 px/Frame).
  Sprint (6 Bilder zu 4 Frames) mit längeren Schritten und Vorlage.

### 1.5 Effekte

- **Magnetstoß** von Vela: ein kurzer, blauweißer Bogen (Eisblau-Treppe mit
  Glanz) vor der Faust in den aktiven Frames der Kette, 1 bis 2 Bilder,
  Länge so, dass Faust plus Stoß die gemessene Reichweite der Stufe
  andeuten (85, 87, 91, 100 px abzüglich des Gegnerkörpers, der etwa 25 px
  vor seiner Position beginnt).
- **Trefferfunke**: 8 Frames (wie der Trefferfunke des Vorbilds, Slot 59),
  4 Bilder zu 2 Frames, weiß bis orange, am Trefferpunkt zwischen Angreifer
  und Ziel.
- **Spezialangriff Vela**: kniet, schlägt auf den Boden, eine Welle aus
  Eissplittern läuft in sechs Stufen zu je 6 Frames nach beiden Seiten
  (Fläche wächst um 16 px je Stufe bis 123 px, `werte.ts`); die Welle ist
  ein eigener Effekt-Sprite je Stufe, gespiegelt für beide Seiten.
- **Explosion** der Rakete: 15 Frames aktiv (Figur) bzw. 9 (Zünder),
  Darstellung etwa 24 Frames in 6 Bildern, Orange-Gelb-Weiß mit Raster
  außen, Durchmesser wächst von 24 auf 72 px; die Trefferfläche bleibt die
  der Logik.
- **Schatten**: flache Ellipse unter dem Fußpunkt in Schattenblau mit
  fester Deckkraft (wie heute), Breite nach `masse.ts`, bei Sprüngen bleibt
  der Schatten am Boden.
- **Staub** beim Aufprall (Umgeworfen, Landung nach dem Neueinstieg): 3
  Bilder zu 3 Frames, hellgrau, auf dem Boden.

### 1.6 Hintergrund und Anzeigeleiste

- Hintergrund je Abschnitt aus Kacheln (16 × 16) und freien Bildern,
  gezeichnet als Ebenen: Himmel mit Kometenschweif (darf in der
  Darstellung mit halber Kamerageschwindigkeit laufen; reine Darstellung,
  ohne Wirkung auf die Logik), Wand mit Objekten, Boden des Tiefenbands
  mit Platten und Rastern der Tiefe, Vordergrund (Kabelrollen) mit
  fester Deckkraft 0,85 vor den Figuren.
- Der Boden zeigt die Tiefe lesbar: Plattenfugen alle 16 px in der Tiefe,
  die Oberkante des Tiefenbands als Kante (Wand, Geländer, Kai), die
  Unterkante am Bildrand.
- Anzeigeleiste: eigene Pixelschrift 8 × 8 (Großbuchstaben, Ziffern,
  Umlaute Ä Ö Ü, Satzzeichen, Pfeil), Balken 72 px mit 1 px je LP in den
  Lagenfarben grün, gelb, orange, Lebenssymbol (Velas Helmsilhouette),
  Pfeil „weiter“ blinkend; große Texte (PAUSE, STAGE CLEAR, GAME OVER,
  BALLAST BESIEGT 5000) in einer 16 × 16 Variante derselben Schrift.
  Lagen und Inhalte nach `docs/spezifikation-welt.md` 10.1, die Schrift
  ersetzt die heutige aus `src/darstellung/schrift.ts`.
- Blende (Schnitt von B nach F): Abdunkeln wie heute, zusätzlich eine
  Rasterkante (Bayer) am Rand des Dunkels.

---

## 2. Technik der Erzeugung

### 2.1 Grundsatz

Keine Grafikwerkzeuge von außen, keine Paketinstallation, keine Browser-
Zeichenfläche für die Erzeugung. Die Sprites werden von TypeScript-Code
unter Node 22 berechnet (Pixelpuffer) und als PNG geschrieben (eigener
Encoder mit `node:zlib` und CRC32, etwa 60 Zeilen). Der Browser lädt die
PNG-Blätter als Bilder und zeichnet Ausschnitte mit `drawImage`. Der Bau
der Grafik ist deterministisch: gleicher Code, gleiche Bytes (MD5 der
Blätter im Bericht).

### 2.2 Ablage

```
spiel/grafik/quelle/           Erzeugung (TypeScript, Node, keine Browser-APIs)
  leinwand.ts                  Pixelpuffer (RGBA), setze, hole, Rechteck, Linie, Polygon, Ellipse, Kapsel, Spiegeln, Ausschnitt
  png.ts                       PNG schreiben (node:zlib deflateSync, CRC32, 8-Bit-RGBA)
  farbe.ts                     RGB/HSL, Treppe aus fünf Tönen nach E23 (treppe(basis)), Mischen
  palette.ts                   alle Materialien mit Basisfarbe und Treppe; Zählung der Farben je Blatt
  raster.ts                    Bayer 4 × 4, Verläufe mit Raster
  licht.ts                     Lichtvektor, Zylinder- und Kugelschattierung, Kantenlicht
  kontur.ts                    Außen- und Innenkontur, Lückenprüfung, Streupixelprüfung
  puppe.ts                     Gliederpuppe: Teile (Kopf, Rumpf, Oberarm, Unterarm, Hand, Oberschenkel, Unterschenkel, Fuß, Zubehör) mit Gelenken, Pose je Bild als Winkel und Versätze, Zeichenreihenfolge je Pose, Spiegelung
  schrift.ts                   Pixelschrift 8 × 8 und 16 × 16 als Bitmuster
  figuren/vela.ts              Teile, Maße, Materialien, Posen aller Animationen
  figuren/bolzer.ts, rammbock.ts, zuender.ts, ballast.ts, puppe.ts
  effekte.ts                   Magnetstoß, Funke, Eiswelle, Explosion, Staub, Schutzblinken (nur Regel)
  gegenstaende.ts              Kometenbraten, Eisnudelschale, Sternbeeren, Raketenwerfer, leere Waffe, Rakete (Figur, Zünder), Fass, Bosskiste, Trümmer
  hintergrund/a_landedeck.ts, b_haendlergasse.ts, f_asservatenkammer.ts, vordergrund.ts, himmel.ts
  anzeige.ts                   Leiste, Balken, Lebenssymbol, Pfeil, große Texte
  blatt.ts                     packt Bilder in Sprite-Blätter (höchstens 2048 × 2048), schreibt Atlas-JSON
  kontakt.ts                   Kontaktbögen (alle Bilder einer Animation in einer Reihe, 2× vergrößert, mit Bildnummer und Dauer) nach docs/bilder/
  bauen.ts                     CLI: erzeugt alle Blätter, Atlanten, Kontaktbögen; gibt MD5 je Blatt aus
spiel/grafik/ausgabe/          erzeugte PNG-Blätter und JSON-Atlanten (werden committet)
spiel/src/darstellung/sprites.ts   Laden der Atlanten im Browser, Zuordnung Zustand → Animation → Bild, Zeichnen mit Anker und Spiegelung
spiel/src/darstellung/zeichnen.ts  ruft sprites.ts; die Rechteckdarstellung bleibt als Rückfall (?platzhalter=1)
spiel/tests/grafik_*.test.ts       Tests der Erzeugung und der Zuordnung
docs/grafik.md                 Stilhandbuch, Pipeline, Animationstabellen mit Zuordnung, Stand, Abweichungen
docs/bilder/kontakt_*.png      Kontaktbögen zur Abnahme
docs/bilder/szene_*.png        Szenenbilder aus Playwright
```

`package.json` bekommt die Skripte `grafik` (`node --experimental-strip-types
grafik/quelle/bauen.ts`) und `kontakt` (nur Kontaktbögen). `npm run bauen`
kopiert `grafik/ausgabe/` nicht, der Browser lädt sie direkt von
`grafik/ausgabe/` über `fetch` bzw. `<img>`.

### 2.3 Atlas-Format

Je Blatt eine JSON-Datei gleichen Namens:

```json
{
  "blatt": "vela.png",
  "animationen": {
    "stand": { "schleife": true, "bilder": [ { "x": 0, "y": 0, "b": 57, "h": 71, "ankerX": 28, "ankerY": 70, "dauer": 0 } ] },
    "gehen": { "schleife": true, "bilder": [ … 12 Einträge mit dauer 4 … ] },
    "kette1": { "schleife": false, "bilder": [ … ], "aktiv": [2] }
  }
}
```

- `ankerX`, `ankerY`: Fußpunkt im Bild; die Darstellung setzt ihn auf die
  Bildschirmposition aus `bildX` und `bildY` (`zeichnen.ts`).
- Alle Bilder sind nach rechts gerichtet gezeichnet; Blick links spiegelt
  um den Anker. Zubehör, das nicht spiegelsymmetrisch sein darf (Schrift
  auf Kleidung), wird vermieden.
- `aktiv`: Indizes der Bilder, die in den aktiven Frames der Logik stehen
  sollen (zur Prüfung in 5.3).
- `dauer`: Richtwert in Frames; die Darstellung nimmt die Dauer aus der
  Aktionsuhr der Logik, nicht aus dem Atlas (siehe 3).

### 2.4 Gliederpuppe

Figuren werden nicht Bild für Bild von Hand gesetzt, sondern aus Teilen
zusammengesetzt, die je Pose gedreht und verschoben werden. Das hält
Proportionen und Farben über 50 bis 80 Bilder je Figur gleich und macht
Korrekturen billig (ein Teil ändern, alle Bilder neu bauen).

- Teile sind Kapseln, Polygone und Ellipsen in Spielpixeln mit Material;
  je Teil ein Gelenkpunkt am Elternteil und eine Zeichenreihenfolge
  (hinterer Arm, hinteres Bein, Rumpf, Kopf, vorderes Bein, vorderer Arm,
  Zubehör), die je Pose überschrieben werden darf (beim Schlag liegt der
  schlagende Arm vorn).
- Eine Pose ist eine Tabelle aus Gelenkwinkeln (Grad) und Versätzen (px)
  plus Sonderformen (geballte Faust, offene Hand, Fuß gestreckt).
  Animationen sind Listen von Posen mit Dauern; Zwischenposen dürfen
  rechnerisch interpoliert werden, aber nur zwischen zwei von Hand
  gesetzten Schlüsselposen und nie mehr als ein Zwischenbild, damit der
  Stil hart und arcadehaft bleibt (keine weichen Übergänge).
- Nach dem Zeichnen der Teile: Außenkontur, Innenkonturen,
  Streupixelprüfung, Farbzählung. Jede Verletzung bricht den Bau mit
  Angabe von Figur, Animation, Bild ab.
- Gesichter: Augen als 2 × 1 oder 2 × 2 px, Mund 1 px, Haare als eigene
  Form; Bolzer mit Atemmaske (kein Gesicht), Zünder mit Helm und Visier,
  Ballast mit schwerem Kinn und Schweißerbrille.

---

## 3. Zuordnung von Logik zu Animation

Die Darstellung liest nur den Kern (Auftrag 3, 2.3). Die Animation folgt
dem Zustand:

- **Figur**: `aktion` (Kampf 4.3) plus Unterphase (Kettenstufe, Variante
  des Sprungangriffs, Wurfrichtung, Bahn), `uhr` (Frames seit
  Aktionsbeginn ohne Stoppframes), `stopp` (Trefferstopp hält das Bild),
  `schutz` (Blinken), `blick`, `h` (Höhe), `sprint`. Der Kern führt bereits
  einen Animationszeiger (`anim` in `entitaeten.ts`, Kampf 3); prüfe in
  Phase 0, ob er von der Logik vollständig gepflegt wird. Wenn ja, nutzt
  `sprites.ts` ihn. Wenn nein, leitet `sprites.ts` das Bild aus Aktion und
  Uhr ab (Tabelle je Aktion: Uhrbereich → Bild), ohne den Kern zu ändern.
  Ein Kern-Umbau ist nur erlaubt, wenn alle 214 Tests grün bleiben und die
  Referenzprotokolle bitgleich sind.
- **Gegner**: `modus` (Welt 5.2, 6, 7.1), `aktion` (Körperaktion),
  `modus_uhr`, Angriffsinstanz (Code, aktiv), `blick`, `h`, Boss zusätzlich
  Folge und Stoß.
- **Trefferstopp**: In Stoppframes bleibt das Bild stehen (die Uhr läuft
  nicht), zusätzlich 1 px Versatz des Getroffenen im Wechsel (das Zittern
  aus mechanik.md ist in der Logik enthalten; die Darstellung fügt nichts
  hinzu, was die Position betrifft).
- **Vollständigkeit**: Jede Kombination aus Aktion und Unterphase der Figur
  und jeder Modus jedes Gegnertyps hat eine Animation; fehlt eine, nimmt
  die Darstellung `stand` und meldet es in der Konsole, und ein Test
  schlägt fehl (5.3).

Animationsliste (Mindestumfang; Bilder und Dauern nach `docs/design.md`
Abschnitt 8 und `docs/design-gegner-stages.md` Abschnitt 9, abgeglichen mit
`werte.ts`):

| Figur | Animationen |
|---|---|
| Vela | stand (1), gehen (12), sprint (6), sprung (3 Steigen, Scheitel, 3 Fallen, 2 Landung), sprungangriff neutral (5), richtung (6), hoch (11), runter (3), kette1 (6), kette2 (4), kette3 (5), kette4 (12), griff (3 + Halten), kniestoss (6), wurf (6), spezial (14 Stufen, zweite Hälfte rückwärts), sprintangriff (6), sprint_sprungangriff (5), getroffen_vorn (5), getroffen_hinten (5), umgeworfen (5), liegen (1), aufstehen (6), tot (liegen), waffe_stand, waffe_gehen (Raketenwerfer in der Hand: eigene Armhaltung), waffe_schuss (3), aufnehmen (3), neueinstieg_fall (2), neueinstieg_landung (2) |
| Bolzer | haltung (3, Schleife), gehen (8), gehen_schnell (dieselben 8 mit kürzerer Dauer), spott (6), auftritt_hocke (1 hockend) und aufstehen aus der Hocke (3), auftritt_versteck (Einlauf = gehen), kampfhaltung (2, Schleife), schlag_a, schlag_b, schlag_c (je Ausholen 2, aktiv 1, Rückzug 2), umwerfschlag_a, umwerfschlag_b (je 2/1/2), getroffen (3 Bilder ab h+1, h+10, h+22), umgeworfen (5), liegen (1), aufstehen (6), gehalten (1), geworfen (2 fliegend), tot (umgeworfen + Blinken) |
| Rammbock | wie Bolzer, dazu wiegen (6), hocke_ankuendigung (2), sprungtritt (4: Absprung, Flug mit Knie, Landung 2); eigene Teile (Polsterweste, kahler Kopf, Bart) |
| Zünder | gehen (8), zielen (4, Schleife über 60 Frames: Rohr auf der Schulter, Kopf zur Figur), schuss (4: 5/1/10/1 Frames), kolbenhieb (5), getroffen (3), umgeworfen (5), liegen, aufstehen (6), tot |
| Ballast | stand (2, atmend), gehen (5 zu 8 Frames), ankuendigung (2, mindestens 15 Frames), kurzer_schlag (4), armschwung (3 Schwünge als Folge je 5 Bilder), ansturm (4 Laufbilder, schneller), koerperpresse (Absprung 2, Flug 1, Aufprall 2, Aufstehen 2), stoss_rueckzug (4, 54 Frames, taumelnd), getroffen (3), umgeworfen (5), liegen, aufstehen (6), fall (6, Zusammenbrechen), auftritt (4, bricht aus der Asservatenkammer, zerschlägt die Kisten) |
| Puppe | Bolzer-Blatt mit grauer Palette (Palettentausch im Bau, kein eigenes Zeichnen) |

---

## 4. Figuren- und Szenenbeschreibungen (Entwurfsvorgaben)

Alle Figuren sind eigene Entwürfe für die Welt Perihel (`docs/design.md`
Abschnitt 2): Frachthafen im Eiskern eines Kometen, Neonlicht auf blauem
Eis, dampfende Maschinen, Gegner in Overalls mit Atemmasken. Nichts aus
dem Vorbild abzeichnen; die Aufnahmen unter `research/captcomm/grafik/`
dienen nur als Maßstab für Größen und Posen.

| Figur | Aussehen | Materialien (höchstens 4 Treppen plus Haut) |
|---|---|---|
| Vela, Lotsin | schlank, aufrecht, rotbraunes Haar als Pferdeschwanz, blaue Lotsenjacke mit orangem Querstreifen (wie in der Stilprobe), dunkle Hose, schwere Stiefel, dicke Magnethandschuhe mit blauem Glanz; ruhiger Gesichtsausdruck | Jacke blau, Hose graublau, Leder dunkelbraun, Handschuhe stahlblau glänzend, Haar rotbraun, Haut hell |
| Bolzer, Hafenschläger | gedrungen, vorgebeugt, grauer Overall mit orangen Streifen an Schultern und Schienbeinen, Atemmaske mit Filter, Magnetstiefel mit Metallkappen, Werkzeuggürtel | Overall hellgrau, Streifen orange, Maske und Stiefel stahl, Haut dunkel |
| Rammbock, Schlepperfahrer | breit, kahl, kurzer Bart, olivgrüne Polsterweste über nacktem Oberkörper, Hose mit Knieschützern; Hocke vor jedem Angriff deutlich | Weste oliv, Hose braun, Haut mittel, Knieschützer stahl |
| Zünder, Hafenwächter | mittelgroß, dunkelblaue Uniform mit Abzeichen und Koppel, Helm mit orangem Visier, Raketenwerfer (grünes Rohr) auf der Schulter; beim Zielen das Rohr waagrecht, Visier leuchtet | Uniform dunkelblau, Helm stahl, Visier orange glänzend, Rohr grün |
| Ballast, Vorarbeiter | riesig (70 × 100), schwerer Oberkörper, Schweißerbrille auf der Stirn, violettes Arbeitshemd mit abgerissenen Ärmeln, rechter Arm als hydraulischer Ladearm aus Stahl mit Greifer (Armschwung), Stahlkappenstiefel; bewegt sich schwer, Stampfen beim Gehen (Staub) | Hemd violett, Hose dunkelgrau, Ladearm stahl glänzend mit orangen Warnstreifen, Haut hell |
| Puppe | Bolzer in Grau ohne Streifen | Palettentausch |

| Gegenstand oder Objekt | Aussehen, Maß |
|---|---|
| Kometenbraten | großer glasierter Braten auf Platte mit zwei Dampfkringeln, etwa 28 × 18 |
| Eisnudelschale | blaue Schale mit Nudelberg und Stäbchen, etwa 20 × 14 |
| Sternbeeren | Büschel aus fünf leuchtenden Beeren mit Blatt, etwa 14 × 12 |
| Raketenwerfer | grünes Rohr mit Griff und Zielfernrohr, etwa 30 × 10; leere Waffe gleich, aber grau |
| Rakete (Figur und Zünder) | gelbe Spitze, grauer Körper, Flamme hinten, etwa 16 × 6; die des Zünders rot statt gelb |
| Fass | Treibstofffass 24 × 32, stahlblau mit orangem Band und Perihel-Zeichen (abstrakter Komet), zerbrochen als vier Trümmerteile |
| Bosskiste | Asservatenkiste 40 × 28, grau mit Siegelstreifen, zerbrochen als Bretter |
| Explosion, Funke, Staub, Eiswelle, Magnetstoß | nach 1.5 |

| Abschnitt | Szene |
|---|---|
| A Landedeck (Welt-x 0 bis 400, Band 75 px) | Außen: Nachthimmel mit Kometenschweif als Verlauf (Raster), Eiszapfen an einer Kranbrücke oben, Frachtcontainer „PERIHEL FRACHT“ (rostrot, wie in der Stilprobe) bei x 330 bis 410, Landeplattform aus Eisbetonplatten mit Reif, Warnstreifen am Rand, vorn Kabelrollen (x 96 bis 176, 280 bis 344) als Vordergrund |
| B Händlergasse (400 bis 850, Band 91 px) | Innenhof: Funkladen mit Neonschrift „FUNKLADEN“ in Magenta und zwei Schaufenstern voller Geräte (x 450 bis 650), daneben Stahlfassade mit Rohren und Ventil, Dampf aus einem Gitter, Boden aus Gussplatten mit Fugen, ein Fass (Behälter) bei x 560 |
| F Asservatenkammer (1700 bis 2304, Band 91 px) | Innen: Regale mit beschlagnahmten Kisten, Gitterkäfig, Panzertür am rechten Ende (Arenawand), kaltes Deckenlicht als Lichtkegel (Raster), drei Asservatenkisten bei x 2040, 2080, 2120; Boden dunkler Stahl, damit Vela und Ballast sich abheben |

---

## 5. Phasen

### Phase 0: Einrichtung (Opus selbst)

1. `main` aktualisieren; `git log --oneline -1` mindestens b741bc4.
2. Werkzeuge prüfen wie in Auftrag 3 (Node, tsc, Playwright).
   `npm run pruefen` und `npm test` müssen grün sein, bevor etwas geändert
   wird (Ausgangslage im Bericht).
3. Prüfen, ob der Animationszeiger `anim` im Kern gepflegt wird (Abschnitt
   3); Ergebnis in `docs/grafik.md` festhalten.
4. `docs/grafik.md` anlegen mit Gerüst: Stilhandbuch (Abschnitt 1 dieses
   Auftrags übernommen und mit konkreten Farbwerten gefüllt), Pipeline,
   Animationstabellen, Stand, Abweichungen.
5. `.gitignore` prüfen: `spiel/grafik/ausgabe/` wird committet,
   Kontaktbögen und Szenenbilder unter `docs/bilder/` ebenfalls.

### Phase 1: Werkzeugkasten und erste Figur (G0, dann Haltepunkt 1)

**G0: Werkzeugkasten und Vela-Grundlagen**

```text
Aufgabe: Baue den Werkzeugkasten für prozedurale Pixelgrafik nach
Abschnitt 2 des vierten Auftrags (wörtlich angehängt) in
spiel/grafik/quelle/: leinwand.ts, png.ts, farbe.ts (Treppe nach E23 wie
treppe() in spiel/werkzeuge/stilproben.html), palette.ts mit allen
Materialien aus Abschnitt 4, raster.ts, licht.ts, kontur.ts, puppe.ts,
blatt.ts, kontakt.ts, bauen.ts. Dann die erste Figur: figuren/vela.ts mit
Teilen, Maßen und Materialien und den Animationen stand, gehen (12 Bilder,
Füße rutschen nicht: 7 px je Bild), kette1 bis kette4 (Trefferbild im
ersten aktiven Frame nach werte.ts: Stufe 1 P+2, Stufe 2 D+3, Stufe 3
D+4, Stufe 4 D+3; Reichweite 85/87/91/100 px mit Magnetstoß-Effekt),
sprung, getroffen_vorn, umgeworfen, liegen, aufstehen. Lies vorher
docs/design.md Abschnitte 2, 5 und 8, die Stilprobe stil_1_arcade_nah.png
(als Bild ansehen) und die Umrisse in spiel/src/darstellung/masse.ts.
Tests (node:test): PNG-Encoder (Rundlauf über einen eigenen Mini-Decoder
oder Prüfung der Chunk-Struktur und CRC), Treppe (fünf Töne, Farbton
verschiebt sich in die richtige Richtung), Kontur geschlossen,
Streupixelprüfung, Farbzählung ≤ 16 je Figurblatt, Anker im Bild,
Umriss eingehalten, Fußkontakt beim Gehen (der tiefste Pixel des
Standfußes bewegt sich je Bild um 7 px rückwärts), Determinismus (zwei
Bauläufe, gleiche MD5). Kontaktbögen nach docs/bilder/kontakt_vela_*.png
und eine Übersicht kontakt_vela.png mit allen Animationen untereinander.
Ablieferung: Code, Tests grün, docs/grafik.md Abschnitt Pipeline und
Vela, zehn Zeilen Bericht mit MD5 der Blätter. Nicht committen.
```

**Haltepunkt 1**: Opus committet „Grafik: Werkzeugkasten und Vela
(Entwurf)“ und zeigt dem Nutzer die Kontaktbögen von Vela (Stand, Gehen,
Kette, Sprung, Getroffen) mit drei Sätzen, was zu beurteilen ist
(Silhouette, Farben, Lesbarkeit der Kette). Der Nutzer gibt frei oder
nennt Änderungen; Opus lässt G0 nachbessern, bis die Freigabe da ist. Erst
dann Phase 2.

### Phase 2: Alle Grafiken (G1 bis G6, parallel; alle nutzen den Werkzeugkasten)

Jeder Agent liest zuerst `docs/grafik.md` (Stilhandbuch, Pipeline),
`spiel/grafik/quelle/` (Werkzeugkasten, `figuren/vela.ts` als Muster) und
seine Abschnitte der Designdokumente. Jeder ändert nur seine Dateien und
ergänzt `palette.ts` nur durch Anhängen. Jeder liefert Kontaktbögen und
Tests wie G0 für seine Figuren.

- **G1 Vela vollständig**: alle übrigen Animationen aus Abschnitt 3 (Sprint,
  Sprungangriffe, Griff, Kniestoß, Wurf, Spezial mit Eiswelle,
  Sprintangriff, Sprint-Sprungangriff, getroffen_hinten, Waffe,
  Aufnehmen, Neueinstieg, tot). Die Dauern nach `docs/design.md` Abschnitt
  8, aktive Frames nach `werte.ts`.
- **G2 Bolzer, Rammbock, Puppe**: nach Abschnitt 3 und 4; Puppe als
  Palettentausch des Bolzers.
- **G3 Zünder und Ballast**: nach Abschnitt 3 und 4; beim Ballast die
  Ankündigung vor jedem Angriff mindestens 15 Frames sichtbar, Armschwung
  als Folge, Stoß taumelnd, Fall als Zusammenbrechen; Auftritt mit
  zerschlagenen Kisten (Trümmer aus G4 verwenden oder eigene).
- **G4 Gegenstände, Behälter, Geschosse, Effekte**: nach Abschnitt 1.5
  und 4, als eigenes Blatt `objekte.png`; dazu der Magnetstoß und die
  Eiswelle für Vela (Abstimmung der Maße mit G1 über `docs/grafik.md`).
- **G5 Hintergründe**: Abschnitte A, B, F, Vordergrund, Himmel mit
  Kometenschweif, Boden mit Tiefenfugen, Blendenkante; als Kacheln und
  freie Bilder je Abschnitt (`hintergrund_a.png` usw.) mit Atlas, der
  jedem Bild seine Welt-x- und Tiefenlage zuordnet; Lagen der Objekte nach
  `spiel/daten/stages/scheibe.txt`.
- **G6 Anzeige und Schrift**: Pixelschrift 8 × 8 und 16 × 16, Balken,
  Lebenssymbol, Pfeil, große Texte, Blende; ersetzt `schrift.ts`.

Opus integriert nach Phase 2 (`npm run grafik`, `npm run pruefen`,
`npm test`), committet „Grafik: Figuren, Objekte, Hintergründe, Anzeige“
und legt alle Kontaktbögen und eine Übersichtsseite `docs/bilder/kontakt_uebersicht.png`
(alle Figuren im Stand nebeneinander, 2×) ab.

### Phase 3: Einbau in die Darstellung (G7), dann Haltepunkt 2

```text
Aufgabe: Baue die erzeugten Sprites in die Darstellung ein:
spiel/src/darstellung/sprites.ts lädt die Atlanten (fetch der JSON,
Image für PNG) vor dem ersten Bild, ordnet Zustände nach Abschnitt 3
des vierten Auftrags (wörtlich angehängt) Animationen und Bildern zu und
zeichnet mit drawImage am Anker, gespiegelt für Blick links; Schatten,
Blinken im Schutz, Höhe und Sortierung bleiben wie in zeichnen.ts.
Hintergrund, Vordergrund, Blende und Anzeigeleiste aus den Blättern von
G5 und G6; der ferne Himmel darf mit halber Kamerageschwindigkeit laufen
(nur Darstellung). Die Rechteckdarstellung bleibt erreichbar über
?platzhalter=1 und ist der Rückfall, wenn ein Blatt nicht lädt (Meldung in
der Konsole). Die Debug-Anzeige (F1) zeichnet weiter über die Sprites.
Die Logik bleibt unberührt: der Browser-Test darstellung_browser.test.ts
muss unverändert bestehen, das Protokoll bitgleich bleiben.
Tests: grafik_zuordnung.test.ts prüft, dass jede Kombination aus Aktion
und Unterphase der Figur (FIGUR_AKTIONEN × Varianten) und jeder Modus je
Gegnertyp eine Animation im Atlas hat; grafik_aktiv.test.ts prüft für
jede Angriffsanimation, dass das Bild aus „aktiv“ im Atlas bei der
Aktionsuhr des ersten aktiven Frames (werte.ts) gezeigt wird;
grafik_dauer.test.ts prüft, dass die Summe der Bilddauern nicht länger
ist als die Aktion der Logik. werkzeuge/foto.mjs erzeugt die
Szenenbilder docs/bilder/szene_0300.png bis szene_1500.png und
szene_debug.png aus der Vorführung, dazu szene_arena.png (Ballast in
Welle 7; Eingabedatei bis dorthin erweitern oder eine Prüfszene nutzen)
und szene_nah.png (Ausschnitt 152 × 88 um Vela und einen Bolzer, 3×).
docs/grafik.md: Abschnitt Einbau, Zuordnungstabelle, Stand.
```

**Haltepunkt 2**: Commit „Grafik: Einbau in die Darstellung“. Opus zeigt
dem Nutzer die Szenenbilder und bittet um Freigabe oder Änderungen.
Änderungen gehen an die zuständigen Agenten (SendMessage), höchstens drei
Runden; danach Abschlusscommit.

### Phase 4: Abnahme durch Opus

1. `npm run grafik` zweimal: alle Blätter bitgleich (MD5).
2. `npm run pruefen`, `npm test`: alles grün, einschließlich der neuen
   Grafiktests; die Referenzprotokolle unverändert.
3. Stilprüfung je Blatt (automatisch in `bauen.ts`, Ergebnis in
   `docs/grafik.md`): Farben je Blatt, Konturen geschlossen, keine
   Streupixel, Umrisse eingehalten, Anker im Bild, Fußkontakt beim Gehen.
4. Sichtprüfung durch Opus mit den Kontaktbögen: Silhouettentest (jede
   Figur als 1-Bit-Silhouette erkennbar), Zustände ohne Debug-Anzeige
   lesbar, Trefferbilder im aktiven Frame, kein Figurenpixel in Bodenfarbe.
5. Leistung: die Darstellung hält 60 Bilder je Sekunde in Chromium
   (Playwright misst 600 Bilder, mittlere Zeit je Bild unter 8 ms).

### Phase 5: Nacharbeit

1. `docs/scheibe.md`: Abschnitt „Bild“ auf Sprites umstellen, Rückfall
   `?platzhalter=1` nennen, Befehle `npm run grafik` und `npm run kontakt`.
2. `docs/erkenntnisse.md`: Stand-Zeile „Vertikale Scheibe“ um die Grafik
   ergänzen, unter „Wo was steht“ `docs/grafik.md` eintragen.
3. `CLAUDE.md`, Abschnitt „Spiel“: Grafik entsteht aus
   `spiel/grafik/quelle/`, Blätter unter `spiel/grafik/ausgabe/` werden
   committet, Stilregeln in `docs/grafik.md`, Farben nur in `palette.ts`.
4. Commits: „Grafik: Werkzeugkasten und Vela (Entwurf)“, „Grafik:
   Figuren, Objekte, Hintergründe, Anzeige“, „Grafik: Einbau in die
   Darstellung“, „Grafik: Abnahme und Dokumentation“.

---

## 6. Qualitätsregeln (zusätzlich zu Auftrag 3, 2.3)

- Keine Farbwerte außerhalb von `palette.ts`; keine Maße außerhalb der
  Figurdateien und `masse.ts`; jede Zahl mit Herkunft im Kommentar.
- Die Erzeugung ist deterministisch (kein `Math.random`, kein `Date`);
  Zufall für Rauschen über `src/kern/zufall.ts` mit festem Seed.
- Kein Bild wird von Hand als Pixelmatrix eingetragen, außer Schrift und
  Symbolen (Bitmuster) und Gesichtern (kleine Masken bis 8 × 8).
- Die Logik bleibt unberührt. Ein Kern-Umbau nur nach Abschnitt 3 und mit
  Begründung in `docs/grafik.md`.
- Jede Abweichung von den Animationstabellen (andere Bildzahl, andere
  Dauer) steht in `docs/grafik.md`, Abschnitt „Abweichungen“, mit Grund.

---

## 7. Umgang mit Lücken

Wie Auftrag 3, Abschnitt 2.6: nicht raten, nicht still entscheiden. Fehlt
eine Vorgabe (etwa eine Pose, die kein Dokument beschreibt), wählt der
Agent die einfachste Lösung, die die Stilregeln erfüllt, und trägt sie in
`docs/grafik.md` unter „Abweichungen und Lücken“ ein. Nur Fragen, die das
Aussehen der Helden oder der Welt grundsätzlich betreffen (Kostüm, Farbe
der Jacke, Form des Ladearms), gehen an den Nutzer, gebündelt an den
Haltepunkten.

---

## 8. Rückmeldung an den Orchestrator

```text
## Rückmeldung Opus, Auftrag 4, <Datum>

### Commits auf main
<hash> <Nachricht> (je Zeile)

### Haltepunkte
Haltepunkt 1: Freigabe des Nutzers am <Zeit>, Änderungen: <Liste oder keine>
Haltepunkt 2: Freigabe des Nutzers am <Zeit>, Änderungen: <Liste oder keine>

### Umfang
Blätter: <Name, Maß, Farben, Bilder, MD5> je Zeile
Animationen je Figur: <Anzahl>, Bilder gesamt: <Anzahl>
Code: Zeilen in grafik/quelle, sprites.ts, Tests

### Prüfung
npm run pruefen, npm test: <Anzahl Tests> grün; Referenzprotokolle unverändert: ja/nein
Stilprüfung je Blatt: bestanden / Befunde
Vollständigkeit der Zuordnung: <Anzahl Kombinationen>, fehlend: <keine oder Liste>
Trefferbilder im aktiven Frame: <Anzahl Angriffe geprüft>
Leistung: mittlere Zeit je Bild <ms>

### Abweichungen und Lücken (aus docs/grafik.md, je ein Satz)

### Bilder
docs/bilder/kontakt_*.png, szene_*.png: <Liste>

### Was nicht erledigt wurde und warum

### Fragen an den Nutzer (nummeriert, je ein Satz)
```

---

## 9. Fremdentwurf als Vergleich (Grok)

Der Nutzer lässt testweise eine Figur, zuerst den Rammbock, auch von einem
anderen Modell (Grok) entwerfen. Opus behandelt das so:

1. **Konzeptbild**: Lädt der Nutzer ein Bild hoch, gilt es für G2 als
   Entwurfsvorlage für Form, Haltung und Farben des Rammbocks; die
   Stilregeln aus Abschnitt 1 (Palette, Umriss, Konturen) haben Vorrang,
   Abweichungen stehen in `docs/grafik.md`.
2. **Code**: Fügt der Nutzer eine Datei als Text ein (nach Haltepunkt 1,
   erstellt gegen die Schnittstelle von `puppe.ts`), legt Opus sie als
   `spiel/grafik/quelle/figuren/rammbock_fremd.ts` ab, lässt sie unverändert
   durch `bauen.ts` laufen (gleiche Stilprüfungen wie alle Figuren) und
   behebt nur, was den Bau verhindert (Typfehler, fehlende Importe), mit
   Liste der Änderungen im Bericht. Kontaktbögen beider Fassungen nach
   `docs/bilder/kontakt_rammbock.png` und `kontakt_rammbock_fremd.png`,
   dazu ein Vergleichsbild `vergleich_rammbock.png` (beide im Stand und im
   Schlag nebeneinander, 2×).
3. Der Nutzer wählt an Haltepunkt 2, welche Fassung ins Spiel kommt; die
   andere bleibt im Repo, wird aber nicht in den Atlas gepackt. Die
   Entscheidung kommt als E24 nach `docs/erkenntnisse.md`.
