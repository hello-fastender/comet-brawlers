# Comet Brawlers: Grafik der vertikalen Scheibe

Stand 2026-10-03 (Auftrag 4, Phase 0). Dieses Dokument beschreibt, wie die
Grafik der Scheibe aussieht und entsteht: Stilhandbuch nach E23, Pipeline
der Erzeugung, Animationstabellen mit Zuordnung zur Logik, Stand und
Abweichungen. Grundlage: Entscheidung E23 (`docs/erkenntnisse.md`), die
gewählte Stilprobe `docs/bilder/stil_1_arcade_szene.png` mit
`stil_1_arcade_nah.png` und das Zeichenwerkzeug der Proben
`spiel/werkzeuge/stilproben.html`, Auftrag 4
(`docs/auftraege/2026-10-03-opus-auftrag-4-grafik-scheibe.md`).

Grafik entsteht als Code: TypeScript unter Node berechnet Pixelpuffer und
schreibt PNG-Blätter mit Atlas. Keine Farbe, kein Maß und kein Bild
entsteht außerhalb von `spiel/grafik/quelle/`; Farben nur in
`palette.ts`, Umrisse in `spiel/src/darstellung/masse.ts`.

## 1. Stilhandbuch

### 1.1 Raster und Maß

- Alles im Spielraster 384 × 224. Ein Bildpixel ist ein Spielpixel: keine
  Halbpixel, keine Kantenglättung, nur voll deckend oder durchsichtig.
  Feste Deckkraft haben nur Schatten (wie heute in der Darstellung),
  Blende und Vordergrund (0,85).
- Umrisse (Breite × Höhe mit Schatten, `masse.ts`): Vela 57 × 76,
  Bolzer 57 × 72, Rammbock 60 × 76, Zünder 64 × 72, Ballast 70 × 100,
  Puppe wie Bolzer. Der Körper im Stand ist höchstens so breit wie der
  Umriss und etwa 5 px niedriger; die Schattenellipse liegt unter dem
  Fußpunkt. Angriffsposen dürfen über den Umriss hinausragen, aber nicht
  weiter, als die Reichweite verlangt (Kettenstufe 1: Faust bis etwa
  60 px vor dem Fußpunkt, den Rest bis 85 px trägt der Magnetstoß).
- Der Fußpunkt (Position der Entität) ist in jedem Bild der Anker.
- Proportionen nach dem Vorbild als Maßstab: Kopf etwa 1/5 der
  Körperhöhe, große Hände und Füße, breite Schultern bei schweren
  Figuren. Nichts abzeichnen.

### 1.2 Farbe

**Farbtreppe aus fünf Tönen** je Material, berechnet wie `treppe(basis)`
in `stilproben.html` (Werte in HSL, Sättigung und Helligkeit 0 bis 1,
Farbton in Grad; „Richtung Blau“ heißt Farbton um höchstens n Grad zu
235° hin, „Richtung Gelb“ zu 50° hin):

| Ton | Index | Farbton | Sättigung | Helligkeit | Verwendung |
|---|---|---|---|---|---|
| dunkel | 0 | 18° Richtung Blau | +0,06 | −0,27 | Innenkontur des Materials, tiefste Schatten |
| Schatten | 1 | 9° Richtung Blau | +0,03 | −0,14 | rechte und untere Kanten, Unterseiten |
| Grund | 2 | Basis | Basis | Basis | Fläche |
| Licht | 3 | 6° Richtung Gelb | −0,02 | +0,11 | linke und obere Kanten |
| Glanz | 4 | 12° Richtung Gelb | −0,08 | +0,22 | nur glänzendes Material, Glanzpunkte |

Abweichung vom Auftragstext (1.2 sagt „Schatten senken die Sättigung
leicht“): Die gewählte Stilprobe hebt die Sättigung der Schatten leicht
an; maßgeblich ist die Probe, die der Nutzer gewählt hat (Festlegung
Phase 0).

**Hintergrundtreppe**: dieselbe Rechnung, danach Sättigung × 2/3 und
Helligkeit jedes Tons um 1/3 zum Grundton hin (Kontrast um ein Drittel
kleiner). Hintergründe insgesamt kühler, Figuren wärmer. Kein Bodenton
eines Tiefenbands kommt in einer Figurenpalette vor (Prüfung in
`bauen.ts`).

**Außenkontur**: Konturviolett `#140E22` (RGB 20, 14, 34; in
`stilproben.html` `RAND1`), 1 px, geschlossen, für alle Figuren und
Gegenstände gleich. **Innenkonturen** zwischen Teilen verschiedener
Materialien im dunkelsten Ton (Index 0) des hinteren Teils, 1 px, keine
doppelten Konturen.

**Farbbudget**: höchstens 16 Farben je Figur (15 plus durchsichtig),
Gegenstände 8, Hintergrund eines Abschnitts 48, Anzeigeleiste 8. Fünf
Töne je Material und 15 Farben je Figur gehen zusammen nur mit geteilten
Treppen. Regel (Festlegung Phase 0):

- Die Außenkontur zählt einmal und dient zugleich als Pupille und als
  Innenkontur sehr dunkler Materialien (Leder, dunkles Haar).
- Materialien ähnlicher Farbe einer Figur teilen eine Treppe und nutzen
  verschiedene Ausschnitte daraus (Beispiel Vela: Jacke Töne 0 bis 3,
  Handschuh Töne 1 bis 4 derselben Blautreppe).
- Kleine Materialien (Streifen, Visier, Augenleuchten) nutzen zwei Töne.
- Leuchtende Teile (Spulen der Handschuhe, Visier, Neon) haben einen
  festen Leuchtton ohne Schattierung.
- `bauen.ts` zählt je Bild und je Figur und bricht über dem Budget ab.

**Globale Palette** (`spiel/grafik/quelle/palette.ts`; jedes Material mit
Basisfarbe und Treppe; Figuren teilen Materialien). Grundwerte aus der
gewählten Stilprobe, ergänzt nach Auftrag 4, Abschnitt 4:

| Material | Basis | Glanz | Verwendung |
|---|---|---|---|
| `KONTUR` | `#140E22` | – | Außenkontur aller Figuren und Gegenstände |
| `HAUT_HELL` | `#E8B189` | nein | Vela, Ballast |
| `HAUT_MITTEL` | `#C98E68` | nein | Rammbock |
| `HAUT_DUNKEL` | `#8F5A3E` | nein | Bolzer |
| `HAAR_VELA` | `#C2502B` | ja | Velas Pferdeschwanz (rotbraun) |
| `HAAR_DUNKEL` | `#3B2B25` | nein | Bart des Rammbocks |
| `JACKE_VELA` | `#2D4F86` | nein | Velas Lotsenjacke |
| `HANDSCHUH_VELA` | `#3F73DC` | ja | Magnethandschuhe (stahlblau) |
| `HOSE_GRAUBLAU` | `#445069` | nein | Velas Hose |
| `LEDER` | `#4A3428` | nein | Stiefel, Gürtel, Koppel (dunkelbraun) |
| `SIGNAL_ORANGE` | `#E8812F` | nein | Velas Querstreifen, Streifen des Bolzers, Warnstreifen am Ladearm, Band am Fass |
| `OVERALL_BOLZER` | `#8B909B` | nein | Overall des Bolzers (hellgrau) |
| `STAHL` | `#6F7C99` | ja | Atemmaske, Stiefelkappen, Knieschützer, Helm, Ladearm, Fass, Rohre |
| `WESTE_OLIV` | `#6B7A3A` | nein | Polsterweste des Rammbocks |
| `HOSE_BRAUN` | `#6A4A32` | nein | Hose des Rammbocks |
| `UNIFORM_ZUENDER` | `#253A6B` | nein | Uniform des Zünders (dunkelblau) |
| `VISIER_ORANGE` | `#FF9A2A` | ja | Visier des Zünders, leuchtet beim Zielen |
| `ROHR_GRUEN` | `#4F8A3C` | ja | Raketenwerfer |
| `HEMD_BALLAST` | `#6A3F8C` | nein | Arbeitshemd des Ballast (violett) |
| `HOSE_DUNKELGRAU` | `#3E424C` | nein | Hose des Ballast |
| `PUPPE_GRAU` | `#9A9CA2` | nein | Palettentausch des Bolzers zur Puppe |
| `BRATEN` | `#B5642E` | ja | Kometenbraten |
| `SCHALE_BLAU` | `#3F6FC4` | ja | Eisnudelschale |
| `NUDEL` | `#F2D98A` | nein | Nudeln |
| `STERNBEERE` | `#FF5AC8` | ja | Sternbeeren |
| `BLATT_GRUEN` | `#4F9A46` | nein | Blatt der Sternbeeren |
| `RAKETE_GELB` | `#FFD23A` | ja | Spitze der Rakete der Figur |
| `RAKETE_ROT` | `#E0402E` | ja | Spitze der Rakete des Zünders |
| `FASS_STAHLBLAU` | `#4F6F9E` | ja | Treibstofffass |
| `KISTE_GRAU` | `#7A7F88` | nein | Asservatenkiste |
| `SIEGEL_ROT` | `#C43A3A` | nein | Siegelstreifen |
| `HOLZ` | `#8A6A44` | nein | Bretter der zerbrochenen Kiste |
| `EIS` | `#8FD8FF` | ja | Magnetstoß, Eiswelle, Reif |
| `FEUER` | `#FF8A2A` | ja | Funke, Flamme, Explosion (mit Weiß als Glanz) |
| `STAUB` | `#A7ADB8` | nein | Staub beim Aufprall |
| `SCHATTEN_BLAU` | `#0A1230` | – | Schatten unter den Figuren, feste Deckkraft wie heute |

Leuchttöne (ohne Treppe): `SPULE` `#7EF6FF` (Spulen der Handschuhe),
`NEON_MAGENTA` `#FF4FD8`, `NEON_CYAN` `#59F3FF`, `BRILLE_GLUT` `#FFB828`.

Hintergrundmaterialien (Hintergrundtreppe, kühler und gedämpft):

| Material | Basis | Verwendung |
|---|---|---|
| `NACHTHIMMEL` | `#0B1636` | Himmel über dem Landedeck |
| `KOMETENSCHWEIF` | `#6FA8D8` | Schweif am Himmel (Rasterverlauf) |
| `EISWAND` | `#2A4E86` | Eiswände, Eiszapfen |
| `ROST` | `#9A4A2C` | Frachtcontainer |
| `EISBETON` | `#4D5D78` | Platten des Landedecks |
| `REIF` | `#B9D0E8` | Reif auf Platten |
| `GUSSPLATTE` | `#3F4A5E` | Boden der Händlergasse |
| `FASSADE_STAHL` | `#4A5268` | Stahlfassade, Rohre, Ventil |
| `WAND_LADEN` | `#2C2444` | Wand des Funkladens |
| `WARN_GELB` | `#E8B42C` | Warnstreifen an Kanten |
| `KAMMER_STAHL` | `#2C3342` | Boden der Asservatenkammer |
| `REGAL` | `#4A4F5C` | Regale, Gitterkäfig, Panzertür |
| `LICHT_KALT` | `#CFE6FF` | Lichtkegel der Deckenlampen |
| `KABEL` | `#2A2F3A` | Kabelrollen im Vordergrund |

Anzeigeleiste: `LEISTE_TEXT` `#E8ECF4`, `BALKEN_GRUEN` `#4CCF5A`,
`BALKEN_GELB` `#F2D23A`, `BALKEN_ORANGE` `#F08A30`, `BALKEN_LEER`
`#1A1F2C`, Kontur `KONTUR`.

### 1.3 Licht und Form

- Licht von links oben vorn: Vektor (−0,55; −0,66; 0,5), normiert (x nach
  rechts, y nach unten, z zum Betrachter; `LICHT` in `stilproben.html`).
  Linke und obere Kanten tragen den Lichtton, rechte und untere den
  Schatten; Unterseiten (Kinn, Ärmelenden, Bauch unter dem Brustkorb) im
  Schatten.
- Rundungen als Zylinder: Grundton in der Mitte, Licht links, Schatten
  rechts, je 1 bis 2 px, nie breiter als 3 px.
- Raster (Bayer 4 × 4) nur auf großen Flächen: Hintergrundverläufe,
  Himmel, Boden, Nebel, Explosionen, Bauch des Ballast. Auf Figuren
  höchstens eine Rasterzeile am Übergang von Licht zu Schatten bei Flächen
  über 10 × 10 px. Nie Raster auf Gesichtern und Händen.
- Kein Pixel steht allein (jeder Farbpixel hat einen gleichen Nachbarn),
  außer Glanzpunkten (genau 1 px) und Funken.

### 1.4 Lesbarkeit im Spiel

- Silhouette: Jede Figur ist als 1-Bit-Silhouette erkennbar. Vela schlank
  mit Pferdeschwanz und dicken Handschuhen; Bolzer gedrungen mit Maske;
  Rammbock breit mit Polsterweste; Zünder mit Rohr auf der Schulter;
  Ballast riesig mit Ladearm.
- Zustände ohne Debug-Anzeige lesbar: Kampfhaltung, Ausholen, aktive
  Frames (Bild mit der größten Reichweite), Nachlauf, Trefferreaktion,
  Liegen, Aufstehen, Zielen des Zünders, Ankündigung des Ballast,
  Rückzugsstoß, Schutz der Figur (Blinken wie heute).
- Das Trefferbild liegt im ersten aktiven Frame jeder Angriffsanimation;
  Zahlen (Startup, aktive Frames, Dauer) aus `spiel/src/kern/werte.ts`.
  Weichen Animationstabellen und Logik ab, gilt die Logik.
- Füße rutschen nicht: Beim Gehen bewegt sich der Standfuß je Bild um die
  Strecke zurück, die die Figur in der Bilddauer vorwärts geht (Vela
  12 Bilder zu 4 Frames bei 1,75 px/Frame: 7 px je Bild, 84 px je
  Zyklus).

### 1.5 Effekte

Nach Auftrag 4, 1.5: Magnetstoß (Eisblau mit Glanz, 1 bis 2 Bilder in den
aktiven Frames der Kette), Trefferfunke (4 Bilder zu 2 Frames, weiß bis
orange), Eiswelle des Spezialangriffs (sechs Stufen zu 6 Frames, je ein
Sprite, gespiegelt), Explosion (6 Bilder, Durchmesser 24 bis 72 px,
Raster außen), Schatten (wie heute), Staub (3 Bilder zu 3 Frames).

### 1.6 Hintergrund und Anzeigeleiste

Nach Auftrag 4, 1.6: Kacheln 16 × 16 und freie Bilder als Ebenen
(Himmel, Wand, Boden, Vordergrund mit Deckkraft 0,85); Plattenfugen alle
16 px in der Tiefe; Pixelschrift 8 × 8 und 16 × 16; Balken 72 px in den
Lagenfarben; Lebenssymbol; Pfeil; Blende mit Rasterkante.

## 2. Pipeline

Folgt mit G0 (Werkzeugkasten): Ablage, Schnittstellen von `leinwand.ts`,
`png.ts`, `palette.ts`, `kontur.ts`, `blatt.ts`, `kontakt.ts`, Befehle.

## 3. Zuordnung von Logik zu Animation

**Animationszeiger im Kern (Prüfung Phase 0):** Das Feld `anim`
(`entitaeten.ts`, Kampf 3) wird nicht vollständig gepflegt. Nur die
Trefferreaktion der Gegner setzt es (`gegner/reaktion.ts`: GETROFFEN,
UMGEWORFEN, TOT, STAND, LIEGEN, AUFSTEHEN); Figur, Angriffe der Gegner
und Boss setzen es nie. Deshalb leitet `sprites.ts` das Bild aus dem
Zustand ab, ohne den Kern zu ändern:

- Figur: `aktion` und Unterphase (`phase`), `uhr` (Frames seit
  Aktionsbeginn ohne Stoppframes, Beginn 1), `stopp`, `schutz`, `blick`,
  `h`, `sprint`; Tabelle je Aktion: Uhrbereich → Bild.
- Gegner: `modus`, `aktion`, `modus_uhr`, Angriffsinstanz (Code, aktiv),
  `blick`, `h`; Boss zusätzlich seine Felder in `g.boss`.

Animationstabellen mit Zuordnung folgen mit G0 bis G7.

## 4. Figuren

Folgt (Vela mit G0, übrige mit Phase 2).

## 5. Umsetzer für Bildblätter

Folgt mit G0b.

## 6. Stand

| Phase | Stand |
|---|---|
| 0 Einrichtung | Ausgangslage geprüft: `npm run pruefen` grün, `npm test` 214 von 214 grün; Animationszeiger geprüft (Abschnitt 3) |

## 7. Abweichungen und Lücken

| Nr. | Stelle | Festlegung | Grund |
|---|---|---|---|
| G1 | Auftrag 4, 1.2 (Schatten senken die Sättigung) | Treppe genau wie `treppe()` der Stilprobe: Schatten heben die Sättigung leicht an (+0,03, +0,06) | Die gewählte Stilprobe ist maßgeblich |
| G2 | Auftrag 4, 1.2 (fünf Töne je Material, 16 Farben je Figur) | geteilte Treppen und Zweitonmaterialien nach 1.2, „Farbbudget“ | Fünf volle Treppen für sechs Materialien wären 30 Farben |
