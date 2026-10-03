# Comet Brawlers: Grafik der vertikalen Scheibe

Stand 2026-10-03 (Auftrag 5, Phase 0; vorher Auftrag 4). Dieses Dokument beschreibt, wie die
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

## 0. E25: Grafik aus Grok-Bildern bei doppelter Darstellung

Entscheidung des Nutzers am 2026-10-03 (`docs/erkenntnisse.md`, E25;
Auftrag 5, `docs/auftraege/2026-10-03-opus-auftrag-5-grafik-grok-2x.md`):
Figuren, Gegenstände und Hintergründe entstehen aus Grok-Bildern. Die
Darstellung zeichnet mit doppelter Auflösung (768 × 448 Bildpixel), die
Logik bleibt unverändert bei 384 × 224 Einheiten. Je Figur sind bis zu
64 Farben erlaubt. Die Gliederpuppe bleibt nur als Rückfall
(`?platzhalter=1`) und für Effekte, die kein Bild haben. E23 (Arcade-Pixel)
bleibt als Stilrichtung; die Festlegungen „ein Bildpixel ist ein
Spielpixel“ und „16 Farben je Figur“ entfallen. Anlass: Der Nutzer hat an
Haltepunkt 2 von Auftrag 4 die Figuren der Gliederpuppe und die
gezeichneten Hintergründe abgelehnt; Maßstab für „lesbar“ ist die Probe
`docs/bilder/probe_grok_2x.png`.

| Bereich | Auftrag 4 | Auftrag 5 (E25) |
|---|---|---|
| Quelle der Figuren | Gliederpuppe aus Code | Grok-Bildblätter, Umsetzer macht Sprites |
| Ansicht | Seitenansicht | Dreiviertelansicht wie in Automaten-Prügelspielen (Körper leicht zum Betrachter gedreht, Blick nach rechts) |
| Darstellung | 384 × 224 Bildpixel, 1 Bildpixel = 1 Spielpixel | 768 × 448 Bildpixel, 2 Bildpixel = 1 Spielpixel; Sprites doppelt so hoch wie der Umriss (Vela 152 px, Bolzer 144, Rammbock 152, Zünder 144, Ballast 200) |
| Farben | 16 je Figur aus festen Materialtreppen | bis 64 je Figur, aus dem Bild selbst gewonnen (Medianschnitt), Helligkeit und Sättigung erhalten; keine Abbildung auf `palette.ts` |
| Kontur | Konturviolett 1 px | dunkle Kontur aus dem Bild erhalten, fehlende Außenkontur 1 Bildpixel (= 0,5 Spielpixel) nachsetzen |
| Hintergründe | gezeichnet aus Code | Grok-Panoramen je Abschnitt, in Ebenen zerlegt (Himmel, Wand, Boden), bei 2× |
| Anzeigeleiste, Schrift | aus Code (G6) | bleibt, bei 2× ganzzahlig verdoppelt |
| Effekte | aus Code (G4) | bleiben, bei 2× verdoppelt; Explosion und Funke dürfen durch Grok-Blätter ersetzt werden, wenn der Nutzer sie liefert |
| Logik, Protokoll, Tests | unverändert | unverändert; der Browser-Test und die Referenzprotokolle müssen bitgleich bleiben |

Positionen, Reichweiten, Anker und die Sortierung nach Tiefe rechnen weiter
in Spielpixeln; nur das Zeichnen multipliziert mit 2. Schatten, Blinken im
Schutz, Höhe und Blende bleiben wie bisher. Prüfung statt
Palettenabbildung: Kein Figurenpixel ist dunkler als der dunkelste Bodenton
des Abschnitts, außer in der Kontur (Auftrag 5, 4).

## 1. Stilhandbuch

### 1.1 Raster und Maß (ersetzt durch E25, Abschnitt 0)

> Ersetzt durch E25: gilt für die Gliederpuppe (Rückfall und Effekte), nicht für die Grafik aus Grok-Bildern.

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

### 1.2 Farbe (ersetzt durch E25, Abschnitt 0)

> Ersetzt durch E25: gilt für die Gliederpuppe (Rückfall und Effekte), nicht für die Grafik aus Grok-Bildern.

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

Stand G0 (Phase 1). Die Erzeugung läuft unter Node 22 mit
`--experimental-strip-types` (kein `enum`, keine Namespaces, keine
Parameter-Properties, `import type`, relative Importe mit `.ts`), ohne
Pakete. Sie ist deterministisch: kein `Math.random`, kein `Date`; Rauschen
nur über `src/kern/zufall.ts` mit festem Seed.

### 2.1 Ablage und Befehle

```
spiel/grafik/quelle/
  geometrie.ts   Punkt, Formen (Kapsel, Ellipse, Polygon), Drehung, Treffer am Pixelmittelpunkt
  leinwand.ts    Pixelpuffer (RGBA als 0xRRGGBBAA), Zeichnen, Ausschnitt, Spiegeln, Vergrößern
  png.ts         PNG schreiben (8-Bit-RGBA) und lesen (8 Bit, Farbtypen 0, 2, 3, 4, 6, Filter 0–4), CRC32, MD5
  farbe.ts       RGB/HSL, treppe() wie stilproben.html, hintergrundTreppe(), Mischen, Abstand
  palette.ts     alle Materialien und Einzelfarben (einzige Datei mit Farbwerten), Farbzählung
  raster.ts      Bayer 4 × 4, Verläufe mit Raster
  licht.ts       Lichtvektor, Helligkeit aus Normale, Ton aus Helligkeit
  kontur.ts      Außenkontur, Rand umfärben, Lücken, Streupixel finden und entfernen
  puppe.ts       Gliederpuppe: Teile, Gelenke, Posen, Zwischenbild, Rastern, Tonabbildung je Figur
  blatt.ts       Bild, Animation, Atlas; Packen in Blätter (≤ 2048 × 2048), Atlas-JSON
  kontakt.ts     Kontaktbögen mit Schrift 3 × 5 als Bitmuster
  bauen.ts       CLI und Prüfungen: baut alle Figuren, prüft, schreibt Blätter, Atlanten, Kontaktbögen, MD5
  figuren/vela.ts  Vela (Teile, Maße, Tonzuteilung, Posen)
  umsetzer.ts, fremd/   G0b (Abschnitt 5)
  vergleich.ts   Vergleichsbild Rammbock für Haltepunkt 1 (G0b, Abschnitt 5.7)
spiel/grafik/ausgabe/   <figur>.png und <figur>.json (werden committet)
docs/bilder/kontakt_<figur>_<animation>.png
```

Befehle im Ordner `spiel/`: `npm run grafik` (alle Blätter, Atlanten und
Kontaktbögen, gibt je Blatt das MD5 aus), `npm run kontakt` (nur
Kontaktbögen). `npm run pruefen` prüft `grafik/**/*.ts` mit.

### 2.2 Konventionen

- Koordinaten in Spielpixeln, x nach rechts, y nach unten. Ein Pixel
  (x, y) gehört zu einer Form, wenn sein Mittelpunkt (x + 0,5; y + 0,5)
  darin liegt (gleiche Regel in `leinwand.ts` und `puppe.ts`).
- `Pixel` ist eine vorzeichenlose 32-Bit-Zahl `0xRRGGBBAA`;
  `DURCHSICHTIG = 0`. Bilder sind voll deckend oder durchsichtig.
- Anker: Pixel (ankerX, ankerY) eines Bildes liegt auf der
  Bildschirmposition der Entität (`bildX`, `bildY`). Bei Figuren ist das
  die Konturzeile unter den Sohlen, also die unterste Zeile des Bildes im
  Stand.
- Puppe: Figurkoordinaten mit dem Fußpunkt in (0, 0); Winkel in Grad,
  0 zeigt nach unten, +90 nach vorn (Blickrichtung rechts), 180 nach oben;
  Winkel eines Teils gelten relativ zum Elternteil.
- Alle Bilder blicken nach rechts; Blick links spiegelt die Darstellung um
  den Anker.

### 2.3 Schnittstellen (fest; nur Ergänzungen, Änderungen unter 2.6)

`geometrie.ts`

```ts
interface Punkt { x: number; y: number }
type Form = Kapsel | Ellipse | Polygon
  // Kapsel { art: 'kapsel'; a; b: Punkt; ra; rb: number }  (Radius an a und b)
  // Ellipse { art: 'ellipse'; m: Punkt; rx; ry; winkel: number }
  // Polygon { art: 'polygon'; punkte: Punkt[] }
function drehe(v: Punkt, winkel: number): Punkt
function inForm(f: Form, x: number, y: number): boolean
function formBewegt(f: Form, winkel: number, v: Punkt): Form
function imPolygon(punkte, x, y): boolean
```

`leinwand.ts`

```ts
type Pixel = number                         // 0xRRGGBBAA
const DURCHSICHTIG: Pixel                   // 0
function rgba(r, g, b, a = 255): Pixel
function kanaele(p: Pixel): [r, g, b, a]
function alpha(p: Pixel): number
function deckend(p: Pixel): boolean        // Deckkraft > 0
interface Rechteck { x; y; b; h: number }
class Leinwand {
  readonly breite: number; readonly hoehe: number; readonly daten: Uint32Array  // Index y·breite + x
  constructor(breite: number, hoehe: number, daten?: Uint32Array)
  drin(x, y): boolean
  hole(x, y): Pixel                         // außerhalb DURCHSICHTIG
  setze(x, y, p: Pixel): void               // außerhalb ohne Wirkung
  fuelle(p): void
  rechteck(x, y, b, h, p): void
  linie(x0, y0, x1, y1, p): void            // Bresenham, Enden eingeschlossen
  polygon(punkte: Punkt[], p): void
  ellipse(cx, cy, rx, ry, p): void
  kapsel(ax, ay, bx, by, r, p): void
  einsetzen(quelle: Leinwand, x, y): void   // nur deckende Pixel, ohne Mischen
  ausschnitt(x, y, b, h): Leinwand
  gespiegelt(): Leinwand                    // waagrecht
  vergroessert(faktor: number): Leinwand    // ganzzahlig, nächster Nachbar
  klon(): Leinwand
  gleich(andere: Leinwand): boolean
  begrenzung(): Rechteck | null             // um alle deckenden Pixel
}
```

`png.ts`

```ts
type Filtertyp = 0 | 1 | 2 | 3 | 4
function pngSchreiben(bild: Leinwand, optionen?: { filter?: Filtertyp }): Uint8Array  // 8-Bit-RGBA, Deflate-Stufe 9
function pngLesen(daten: Uint8Array): Leinwand  // Bittiefe 8; Farbtyp 0, 2, 3 (mit tRNS), 4, 6; Filter 0–4; ohne Interlace
function pngDateiLesen(pfad: string): Leinwand
function pngDateiSchreiben(pfad: string, bild: Leinwand, optionen?): string  // MD5
function pngAusRohdaten(breite, hoehe, farbtyp, gefilterteZeilen: Uint8Array, palette?): Uint8Array  // für Tests
function crc32(daten: Uint8Array, start?, ende?): number
function md5(daten: Uint8Array): string
```

`farbe.ts`

```ts
type Rgb = [r, g, b]; type Hsl = [h, s, l]
type Treppe = [Pixel, Pixel, Pixel, Pixel, Pixel]   // 0 dunkel, 1 Schatten, 2 Grund, 3 Licht, 4 Glanz
function treppe(basis: '#RRGGBB'): Treppe            // genau treppe() aus stilproben.html
function hintergrundTreppe(basis: '#RRGGBB'): Treppe // 1.2, Hintergrundtreppe
function hexZuPixel(hex): Pixel; pixelZuHex(p): string; hexZuRgb; rgbZuPixel; pixelZuRgb
function rgbZuHsl(r, g, b): Hsl; hslZuRgb(h, s, l): Rgb; zuFarbton(h, ziel, um): number
function mischen(a: Pixel, b: Pixel, t: number): Pixel
function farbAbstand(a: Pixel, b: Pixel): number     // gewichtetes RGB („redmean“)
```

`palette.ts`

```ts
type TonIndex = 0 | 1 | 2 | 3 | 4        // TON_DUNKEL … TON_GLANZ
interface Material { name: string; basis: string; glanz: boolean; art: 'figur' | 'hintergrund'; treppe: Treppe }
const KONTUR, SCHATTEN_BLAU: Pixel
const HAUT_HELL, HAUT_MITTEL, …, STAUB: Material          // Namen und Basis wie 1.2
const MATERIALIEN: Record<string, Material>               // alle Figuren- und Gegenstandsmaterialien
const SPULE, NEON_MAGENTA, NEON_CYAN, BRILLE_GLUT: Pixel; LEUCHTTOENE: Record<string, Pixel>
const NACHTHIMMEL, …, KABEL: Material; HINTERGRUND_MATERIALIEN: Record<string, Material>
const LEISTE_TEXT, BALKEN_GRUEN, BALKEN_GELB, BALKEN_ORANGE, BALKEN_LEER: Pixel
const KONTAKT_GRUND, KONTAKT_ZELLE, KONTAKT_BODEN, KONTAKT_ANKER, KONTAKT_TEXT, KONTAKT_AKTIV: Pixel  // nur Kontaktbögen
const FARBBUDGET = { figur: 16, gegenstand: 8, hintergrund: 48, anzeige: 8 }  // einschließlich durchsichtig
function farbenMenge(bilder: Leinwand | Leinwand[]): Set<Pixel>   // einschließlich DURCHSICHTIG
function farbenZaehlen(bilder: Leinwand | Leinwand[]): number
function naechsteFarbe(p: Pixel, auswahl: Pixel[]): { farbe; index; abstand }
function treppenFarben(materialien: Material[], toene?: TonIndex[]): Pixel[]
```

`kontur.ts`

```ts
const NACHBARN_4, NACHBARN_8
function konturAussen(bild: Leinwand, farbe: Pixel): number       // durchsichtige Kantennachbarn deckender Pixel → farbe (braucht 1 px Rand)
function randFaerben(bild: Leinwand, farbe: Pixel): number        // äußerster deckender Ring → farbe (Figur wächst nicht)
function konturLuecken(bild: Leinwand, kontur: Pixel): Punkt[]     // deckend, nicht kontur, Kante an Durchsichtig oder Bildrand
function konturGeschlossen(bild: Leinwand, kontur: Pixel): boolean
function streupixel(bild: Leinwand, ausnahmen?: Set<Pixel>): Punkt[]   // ohne gleichfarbigen der 8 Nachbarn
function streupixelEntfernen(bild, ausnahmen?, geschuetzt?, runden = 4): number  // Mehrheit der Nachbarn
```

`blatt.ts`

```ts
interface Bild { leinwand: Leinwand; ankerX: number; ankerY: number; dauer: number }
interface Animation { name: string; schleife: boolean; bilder: Bild[]; aktiv?: number[] }
interface AtlasBild { x; y; b; h; ankerX; ankerY; dauer: number }
interface AtlasAnimation { schleife: boolean; bilder: AtlasBild[]; aktiv?: number[] }
interface Atlas { blatt: string; animationen: Record<string, AtlasAnimation> }   // Format Auftrag 4, 2.3
interface GepacktesBlatt { leinwand: Leinwand; atlas: Atlas }
const BLATT_MAX = 2048
function zugeschnitten(bild: Bild): Bild                       // auf deckende Pixel, Anker angepasst
function blattPacken(name: string, animationen: Animation[], optionen?: { maxBreite?; abstand? }): GepacktesBlatt
function atlasText(atlas: Atlas): string                        // feste Schlüsselfolge, je Bild eine Zeile
function blattBytes(blatt): { png: Uint8Array; json: string }
function blattSchreiben(ordner, name, blatt): { png: string; json: string; md5: string }
```

`kontakt.ts`

```ts
function kontaktBogen(animation: Animation, optionen?: { faktor?: number; titel?: string }): Leinwand  // Vorgabe 2×
function kontaktSchreiben(pfad: string, animation: Animation, optionen?): string   // MD5
function textZeichnen(bild: Leinwand, text: string, x, y, farbe: Pixel, faktor = 1): void  // Schrift 3 × 5
function textBreite(text: string, faktor = 1): number
```

`bauen.ts` (zur Mitbenutzung durch den Umsetzer)

```ts
interface Figur { name: string; umriss: Umriss; animationen: Animation[]; glanz: Set<Pixel>;
                  budget: number; schritt?: number; gehen?: string;  // schritt: px je Bild beim Gehen
                  weich?: Set<string> }                              // Regeln nur als Hinweis (G0b, 5.4)
function fremdFiguren(): Figur[]                     // Figuren aus Fremdblättern über den Umsetzer (G0b)
function vergleichBytes(gebaut: Figur[]): Uint8Array | null  // vergleich_rammbock.png (G0b)
const FREMD: string; FREMD_ORDNER: string[]          // spiel/grafik/quelle/fremd/, ['rammbock']
interface Befund { figur: string; animation: string; bild: number; regel: string; text: string }
function figurPruefen(figur: Figur): Befund[]       // alle Stilregeln aus 2.5
function figurAusgeben(figur: Figur, optionen?: { blatt?: boolean; kontakt?: boolean; ausgabe?: string; bilder?: string }): Map<string, string>  // schreibt Blatt, Atlas, Kontaktbögen; Datei → MD5
```

`puppe.ts` (für Phase 2)

```ts
interface TeilDef { name; eltern: string | null; gelenk: Punkt; formen: Form[]; varianten?: Record<string, Form[]>;
                    material: string; gruppe: string; ebene: number; glanz?; flach?; auf?: string; kissen?; sohle?: Punkt; relief?: number }
interface Pose { wurzel: Punkt; winkel: Record<string, number>; versatz?; ebenen?; formen?; versteckt?; spiegeln?: boolean; ohneGesicht?: boolean }
type Toene = [Pixel, Pixel, Pixel, Pixel, Pixel]                 // Tonabbildung eines Materials
interface Stil { zuteilung: Record<string, Toene>; kontur: Pixel; glanz: Set<Pixel>; schwellen?; gesicht?: Gesicht }
interface Gesicht { teil: string; ursprung: Punkt; zeilen: string[]; farben: Record<string, Pixel> }  // höchstens 8 × 8
class Puppe {
  constructor(teile: TeilDef[])                                  // Eltern vor Kindern
  lagen(pose): Map<string, { pos: Punkt; winkel: number }>
  zweiGelenke(pose, a, b, ende, ziel: Punkt, beuge: 1 | -1): Record<string, number>  // Knie +1, Ellbogen −1
  weltWinkel(pose, teil, welt: number): Record<string, number>
  rastern(pose, stil): { leinwand; ankerX; ankerY; sohlen }
}
function zwischenPose(a: Pose, b: Pose, t = 0.5): Pose          // Winkel linear (Vela mischt lieber die Haltung, 4.1)
```

### 2.4 Ablauf der Gliederpuppe

1. Pose → Welttransformation je Teil (Winkel relativ zum Elternteil,
   Versatz der Wurzel; Beine wahlweise über ein Ziel für den Fuß, das
   `puppe.ts` in Gelenkwinkel umrechnet).
2. Rastern am Pixelmittelpunkt: vorderstes Teil je Pixel nach der
   Zeichenreihenfolge (je Pose überschreibbar); dazu Normale (Kapsel als
   Zylinder, Ellipse als Kugel, Polygon als Kissen mit Kantenlicht).
3. Ton je Pixel aus der Helligkeit (`licht.ts`), harte Stufen ohne Raster;
   rechte und untere Außenkante höchstens Schatten, linke und obere
   mindestens Grund; Glanzton nur bei glänzenden Materialien.
4. Innenkontur: Pixel eines hinteren Teils, die über eine Kante an ein
   vorderes Teil anderer Gruppe grenzen, bekommen Ton 0 ihres Materials.
5. Tonabbildung je Figur (Material, Ton) → Farbe: so entstehen geteilte
   Treppen und Zweitonmaterialien (Farbbudget 1.2); Leuchtteile in ihrem
   Leuchtton.
6. Gesichtsmaske (bis 8 × 8, von Hand) am Kopfgelenk, dann Streupixel
   entfernen, dann Außenkontur in `KONTUR`.

### 2.5 Prüfungen in `bauen.ts`

Jede Verletzung bricht `npm run grafik` mit Figur, Animation und Bild ab:

| Regel | Prüfung |
|---|---|
| Kontur geschlossen | kein deckender Pixel außer `KONTUR` grenzt über eine Kante an Durchsichtig oder den Bildrand |
| Streupixel (1.3) | jeder deckende Pixel hat einen gleichfarbigen der acht Nachbarn, außer den Glanzfarben der Figur |
| Farbzählung | Farben je Bild und je Figur (alle Bilder) einschließlich durchsichtig ≤ Budget (Figur 16) |
| Anker im Bild | 0 ≤ ankerX < Breite, 0 ≤ ankerY < Höhe |
| Umriss im Stand | Bild `stand`: Breite ≤ Umrissbreite, Höhe ≤ Umrisshöhe − Schattenhöhe/2 und ≥ 90 % davon |
| Fußkontakt | Bilder von `gehen` (zyklisch): zwischen zwei Bildern verschiebt sich mindestens eine Sohle auf der Ankerzeile um `schritt` px nach hinten (±1) |

### 2.6 Änderungen

Auftrag 5 (E25): `bauen.ts` baut Grok-Blätter `<figur>_grok` mit dem Umsetzer v2 und schreibt `grafik/ausgabe/blaetter.json`; Schnittstelle in 5.8. Die Darstellung zeichnet bei 2× über die Zeichenklasse in 9.10.

Keine Änderung an den Signaturen aus 2.3. Ergänzt (Stand Ende G0):
`geometrie.ts` `formGespiegelt`; `puppe.ts` `TeilDef.relief`,
`Pose.spiegeln`, `Pose.ohneGesicht`; `bauen.ts` `figuren()`,
`figurBytes()`, `bauen()`, `AUSGABE`, `BILDER`. Kontaktbögen beschriften
jedes Bild mit `Nummer:DauerF`. Berichtigt: `figurAusgeben` gibt eine
Tabelle Datei → MD5 zurück (in 2.3 stand zuerst `{ md5 }`).

Ergänzt durch G0b (Freigabe Opus): `bauen.ts` `Figur.weich`,
`fremdFiguren()`, `vergleichBytes()`, `FREMD`, `FREMD_ORDNER`; `bauen()`
baut zusätzlich die Fremdfiguren und `vergleich_rammbock.png` und meldet
weiche Befunde über die Option `hinweis` (je Regel gezählt), ohne
abzubrechen. `figuren()` bleibt unverändert (nur Gliederpuppen).

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

### 4.1 Vela (G0, Phase 1; G1, Phase 2)

Quelle `spiel/grafik/quelle/figuren/vela.ts`, Blatt
`spiel/grafik/ausgabe/vela.png` mit `vela.json`, Kontaktbögen
`docs/bilder/kontakt_vela_<animation>.png`. Vorlage ist Vela der
Stilprobe (Pferdeschwanz, blaue Lotsenjacke mit orangem Querstreifen,
dunkle Hose, schwere Stiefel, dicke Magnethandschuhe mit leuchtenden
Spulen), sauberer ausgeführt: Auge 2 × 2 in `KONTUR`, Mund 1 px im
Hautschatten, Nase als kleiner Vorsprung im Profil, Gesicht frei, Haar
als eigene Form (Kappe mit Pony, Pferdeschwanz aus zwei Kapseln).

**Maße** (px; Körper im Stand 69 × 46 mit Kontur, Umriss 57 × 71 ohne
Schatten): Sohle bis Knöchel 5, Oberschenkel 15, Unterschenkel 15
(Hüfte im Stand bei −32, gestreckt −35), Taille 2 über der Hüfte,
Schulterlinie 17,5 über der Taille, Kopf 14 hoch (1/5 der Körperhöhe),
Oberarm 11, Unterarm 9, Handschuh 9,2 × 10 (Mitte 3,5 unter dem
Handgelenk), Stiefel 14,5 lang. Zeichenreihenfolge: hinterer Arm (10),
hinteres Bein (20), Pferdeschwanz (25), vorderes Bein (27, hinter dem
Saum der Jacke), Becken (29), Rumpf (30), Streifen (31, nur auf dem
Rumpf), Kopf (35), Haar (36), vorderer Arm (50). Der schlagende hintere
Arm (Kette 2) und das tretende Bein (Kette 4) liegen in ihrer Pose vorn.

**Tonzuteilung** (15 Farben plus durchsichtig = 16, Farbbudget 1.2):

| Farbe | Wert | Verwendung |
|---|---|---|
| `KONTUR` | `#140E22` | Außenkontur, Auge, Innenkontur (Ton 0) von Jacke, Hose und Stiefel |
| `HAUT_HELL` 1 | `#E0734A` | Hautschatten, Innenkontur der Haut, Mund |
| `HAUT_HELL` 2 | `#E8B189` | Haut |
| `HAUT_HELL` 3 | `#F0D6B9` | Hautlicht |
| `HAAR_VELA` 1 | `#8A261C` | Haarschatten und Innenkontur des Haars |
| `HAAR_VELA` 2 | `#C2502B` | Haar |
| `SIGNAL_ORANGE` 2 | `#E8812F` | Querstreifen (einstufig); Licht und Glanz des Haars |
| `JACKE_VELA` 1 | `#192752` | Jackenschatten; Innenkontur des Handschuhs; Stiefelschatten |
| `JACKE_VELA` 2 | `#2D4F86` | Jacke; Handschuhschatten |
| `JACKE_VELA` 3 | `#3D74AE` | Jackenlicht; Handschuh (stahlblau) |
| `HANDSCHUH_VELA` 3 | `#70A2E3` | Handschuhlicht |
| `SPULE` | `#7EF6FF` | Spulen (Leuchtton); Glanz des Handschuhs (einzige Glanzfarbe) |
| `HOSE_GRAUBLAU` 1 | `#262B3F` | Hosenschatten; Stiefel |
| `HOSE_GRAUBLAU` 2 | `#445069` | Hose; Stiefellicht |
| `HOSE_GRAUBLAU` 3 | `#5C6F89` | Hosenlicht |

**Animationen** (Zeiten in Frames ohne Trefferstopp; das Bild zur
Aktionsuhr `uhr` ist das erste, bei dem die Summe der Dauern `uhr`
erreicht; in Stoppframes bleibt es stehen):

| Animation | Bilder | Dauern | Summe | aktiv (uhr) | Inhalt |
|---|---|---|---|---|---|
| `stand` | 1 | 0 | – | – | Kampfhaltung wie die Stilprobe: Beine gegrätscht, vordere Faust vorn auf Brusthöhe, hintere vor der Brust |
| `gehen` | 12 | je 4 | 48, Schleife | – | Standfuß rückt je Bild 7 px zurück (84 px je Zyklus); Ferse setzt in Bild 0 auf, Spitze rollt in Bild 6 ab; Arme gegengleich, Pferdeschwanz schwingt |
| `kette1` | 6 | 1/4/1/1/1/8 | 16 | [1] (2–5) | Gerade mit der vorderen Faust aus dem Ausfallschritt; Bild 2 und 4 sind Zwischenbilder |
| `kette2` | 4 | 1/1/4/10 | 16 | [2] (3–6) | Gerade mit der hinteren Faust, Schulter dreht vor; Bild 1 ist Zwischenbild |
| `kette3` | 5 | 1/1/1/4/10 | 17 | [3] (4–7) | Aufwärtshaken mit der vorderen Faust aus der Hocke |
| `kette4` | 12 | 1/1/4/2/2/2/2/2/4/2/2/1 | 25 | [2, 8] (3–6; 17–20) | Abschlusstritt, Drehung (Rücken, Blick nach hinten, Rücken), zweiter Tritt im zweiten aktiven Fenster, Landung |

**Reichweite der Trefferbilder** (für den Magnetstoß, Auftrag 4, 1.5;
vorderster Pixel in x vom Anker, Höhe über dem Boden): Kette 1 Faust bis
50 px bei 45 bis 49 px Höhe; Kette 2 bis 50 px bei 44 bis 47; Kette 3 bis
44 px bei 63 bis 66; Kette 4 Stiefel bis 47 px bei 37 bis 44, zweiter
Tritt bis 46 px bei 36 bis 45. Der Stoß reicht dann bis Reichweite minus
etwa 25 px Gegnerkörper: Stufe 1 etwa 10 px, Stufe 2 etwa 12, Stufe 3
etwa 22, Stufe 4 etwa 28.

**Bauen weiterer Animationen** (Phase 2, G1): Eine `Haltung` gibt Hüfte,
Neigung von Rumpf und Kopf, die Ziele der Handgelenke (absolut oder
relativ zur Schulter), Knöchel und Stiefelwinkel, den Pferdeschwanz und
wahlweise Versätze, Zeichenreihenfolge, Spiegelung und `ohneGesicht`;
`pose()` löst sie über zwei Gelenke je Glied. `zwischen(a, b)` mischt die
Eingaben zweier Schlüsselhaltungen (höchstens ein Zwischenbild).
`animation(name, haltungen, dauern, schleife, aktiv)` rastert und prüft
die Länge; aktive Bilder aus `werte.ts` über `bildBeiUhr`.

**Phase 2 (G1): alle übrigen Animationen.** Quellen
`figuren/vela_bewegung.ts` (Sprint, Sprung, Sprungangriffe, Neueinstieg),
`figuren/vela_kampf.ts` (Griff, Kniestoß, Wurf, Spezialangriff,
Sprintangriff, Sprint-Sprungangriff, Waffe, Aufnehmen),
`figuren/vela_reaktion.ts` (Getroffen, Umgeworfen, Liegen, Aufstehen, Tod)
und `figuren/vela_zeiten.ts` (alle Dauern und aktiven Bilder, hängt nur von
`werte.ts` ab); `velaAnimationen()` in `vela.ts` hängt sie hinter
`stand`, `gehen` und die Kette. Diese bleiben bitgleich zu Phase 1 (Test
`grafik_vela_phase2.test.ts`), ebenso ihre Lage im Blatt. Tests
`spiel/tests/grafik_vela.test.ts` und `grafik_vela_phase2.test.ts`.

Werkzeuge in `vela.ts` (nur ergänzt): `bildFrei` legt den Anker auf die
Konturzeile unter dem tiefsten Pixel, auch in der Luft: Die Figur steht mit
ihrem tiefsten Punkt auf der Höhe `h` der Logik, wie beim Umsetzer (G1-9).
Bodenposen setzen dafür Sohle, Spitze (`knoechelAufSpitze`), Knie
(`knieAmBoden`) oder Faust (`faustAmBoden`) genau auf y = 0. `bildFrei`
entfernt danach Streupixel auch über Teilgrenzen (G1-10).
`animationFrei` baut daraus Animationen; gleiche Haltungen geben gleiche
Bilder, das Blatt legt sie einmal ab. `gedreht(h, winkel, um)` dreht eine
Haltung als Ganzes (Salto, Flug, Liegen). `fortsetzen` packt verwandte
Animationen in eine Blattzeile (G1-8). Die Haltung hat zusätzlich
`gesicht` (`'getroffen'`: Auge zugekniffen, Mund offen 2 × 1; `'zu'`: Auge
geschlossen) und `versteckt`. Farben: die 15 Farben der Tonzuteilung oben,
keine neue (Test).

| Animation | Bilder | Dauern | Summe | aktiv | Inhalt |
|---|---|---|---|---|---|
| `sprint` | 6 | je 4 | 24, Schleife | – | vorgebeugt (Rumpf −16°), Arme gebeugt im Gegentakt; Standfuß rückt von Bild 0 zu 1 (und 3 zu 4) um 4 · 3,875 = 15,5 px zurück (`SPRINT_SCHRITT`), Bild 2 und 5 Flugphase, Pferdeschwanz weht |
| `sprung` | 9 | 6/6/6/6/6/6/5, Landung 5/1 | 41 + 6 | – | Absprung (ein Knie hoch, Spitze unten), zwei Bilder Anziehen, Scheitel (Bild 3, gehockt, Haar hebt sich), drei Bilder Strecken mit Armen zum Ausgleich (Bild 6 ist die Fallpose), Landung tief in der Hocke, halb hoch (G1-1) |
| `sprungangriff` | 5 | 2/2/24/2/1 | 31 | [2] | neutral (SN): Sprungfaust schräg nach unten mit der vorderen Faust, Knie angezogen; Bild 3 und 4 = Bild 1 und 0 |
| `richtung` | 6 | 2/2/24/2/1/1 | 32 | [2] | Richtung (SR): Flugtritt, vorderes Bein waagrecht gestreckt (Stiefel bis 43 px vor dem Fußpunkt), Oberkörper zurück; Einziehen, Hocke, Fallpose |
| `hoch` | 11 | 3/3/4/3/3/3/3/3/2/1/1 | 29 | [2] | hoch (SH): Saltotritt, kippt zurück, vorderes Bein schlägt nach vorn oben (Trefferbild), dann gehockt rückwärts einmal herum (Drehpunkt Mitte der Kugel) und öffnet zur Fallpose (G1-2) |
| `runter` | 3 | 4/4/24 | 32 | [2] | runter (ST): Stampfer, beide Beine gestreckt nach unten, Arme weit vorn und hinten; Bild 2 hält bis zur Landung |
| `griff` | 4 | 1/2/2/56 | 61 | – | Klammergriff: vorgreifen, fassen, heranziehen, halten (beide Fäuste am Kragen des Gehaltenen 14 und 12 px vor dem Fußpunkt, `HALTELAGE` 19) |
| `kniestoss` | 6 | 2/2/9/2/1/6 | 22 | [2] | Gegner herunterziehen, Knie hoch (Trefferbild), senken, zurück ins Haltebild (Bild 5 = `griff` Bild 3) (G1-3) |
| `wurf` | 6 | 9/7/5/10/5/1 | 37 | [0] | Wurf über Kopf, dieselben Bilder vorwärts und rückwärts: in die Hocke fassen, anheben, über den Kopf, Loslassen ab Bild 3 (E+22) mit gestreckten Armen, senken, Stand |
| `spezial` | 14 | 2/2/2/1/6/6/6/6/6/6/2/2/2/1 | 50 | [4–9] | 7 gezeichnete Bilder, Stufen 7 bis 13 = Bilder 6 bis 0 rückwärts (`SPEZIAL_FOLGE`): Hocke, Fäuste hoch über den Kopf, fallen, Schlag ins Knien, Fäuste am Boden (Bilder 4 bis 6, je eine Flächenstufe, kleine Unterschiede an Kopf und Haar); die Eiswelle zeichnet G4 |
| `sprintangriff` | 6 | 1/1/2/10/20/1 | 35 | [3] | Ausfallfaust aus dem Sprint: bremsen (A+1, steht), Ansatz, Strecken, Trefferbild (Faust bis 57 px vor dem Fußpunkt, Rumpf −34°, hinteres Bein gestreckt auf der Spitze), Rutschen mit gebeugtem Arm, Stand |
| `sprint_sprungangriff` | 5 | 4/8/7/20, Landung 6 | 39 + 6 | [2, 3] | Hechtsprung mit beiden Fäusten voran: Hocke, Kippen, waagrecht (Trefferbild, Fäuste bis 45 px vor dem Fußpunkt), Nachdruck; Bild 4 Landung kniend mit den Fäusten vorn (G1-4) |
| `getroffen_vorn` | 5 | 1/13/6/6/1 | 27 | – | Grok D, Reihe 1: Stoß, Kopf und Rumpf fliegen zurück, Arme nach vorn oben, Auge zugekniffen, Mund offen; gekrümmt mit gesenktem Kopf; tiefe Deckung; fast Stand |
| `getroffen_hinten` | 5 | 1/13/6/6/1 | 27 | – | Rumpf kippt nach vorn, der Kopf bleibt zurück, Arme fliegen nach hinten; gekrümmt; tiefe Deckung; fast Stand |
| `umgeworfen` | 5 | 1/8/6/31/8 | 54 | – | Grok D, Reihe 2: Stoß, gekrümmt zurück mit den Armen vorn oben (Stillstand H+1 bis H+8), Kippen (40°), Flug rücklings mit angezogenen Beinen (82°), Aufprall mit hochgerissenen Beinen; Flug kopfvoran nach hinten (G1-12) (G1-5) |
| `liegen` | 1 | 41 | 41, Schleife | – | flach auf dem Rücken, Kopf hinten, Füße vorn, Auge zu; Fußpunkt unter der Hüfte (71 × 24) |
| `aufstehen` | 6 | 5/5/5/5/5/1 | 26 | – | Grok D, Reihe 3: auf die Fäuste gestützt, Sitzen mit angezogenen Knien und Faust hinten am Boden, Hocke mit einer Faust am Boden, Hocke mit Deckung, halb hoch, fast Stand |
| `tot` | 1 | 0 | – | – | dasselbe Bild wie `liegen` (Auftrag 4, 3: tot = liegen; im Blatt einmal) (G1-13) |
| `waffe_stand` | 1 | 0 | – | – | Kampfhaltung mit dem Raketenwerfer auf der vorderen Schulter, vordere Faust aufrecht am Griff (G1-7) |
| `waffe_gehen` | 12 | je 4 | 48, Schleife | – | Beine und Hüfte wie `gehen` (Fußkontakt 7 px je Bild, geprüft), Arme in der Haltung von `waffe_stand` |
| `waffe_schuss` | 3 | 6/4/7 | 17 | [1] | zielen (breiter Stand), Rückstoß beim Abschuss P+7 (Werferpunkt 5 px zurück), zurück ins Zielen (G1-6) |
| `aufnehmen` | 3 | 2/3/2 | 7 | – | bücken, die vordere Faust greift am Boden, hoch mit der Faust vor der Brust (G1-6) |
| `neueinstieg_fall` | 2 | 4/4 | 8, Schleife | – | Fall aus 256 px: Arme weit vorn und hinten oben, ein Knie angezogen, Pferdeschwanz weht nach oben (G1-6) |
| `neueinstieg_landung` | 2 | 5/1 | 6 | – | Landung mit Wucht: ein Knie und die vordere Faust am Boden; halb hoch (G1-6) |

**Zuordnung Zustand → Animation → Bild** (für `sprites.ts`, Phase 3). Uhr
ist `f.uhr` (Beginn 1, ohne Stoppframes, Kampf 4.1); „Tabelle“ heißt
`bildZurUhr(DAUERN, uhr)` aus `vela_zeiten.ts` (gleich `bildBeiUhr` in
`vela.ts`): das erste Bild, bei dem die Summe der Dauern `uhr` erreicht,
nach dem Ende hält das letzte. Schleifen zählen `⌊(uhr − 1) / 4⌋` modulo
der Bildzahl. Aktiv heißt: Bild in den aktiven Frames (Atlas-Feld `aktiv`).

| Zustand (`aktion`, `phase`, Bedingung) | Animation | Uhr → Bild | aktive Bilder |
|---|---|---|---|
| `STAND` | `stand`; mit Waffe (`waffe` ≠ '') `waffe_stand` | Bild 0 | – |
| `LAUF` | `gehen`; mit Waffe `waffe_gehen` | Schleife, 12 Bilder zu 4 | – |
| `SPRINT` | `sprint` (auch mit Waffe, G1-14) | Schleife, 6 Bilder zu 4 | – |
| `SPRUNG`, `SPRINTSPRUNG` ohne Angriff | `sprung` | Tabelle `SPRUNG_LUFT_DAUERN` 6/6/6/6/6/6/5: Bild 0 bis 6, Scheitel J+21 im Bild 3 | – |
| `SPRUNG` nach einem Sprungangriff (`sprung_angriff`, auch `H` nach uhr 29) | `sprung` | Bild 6 (Fallpose) bis zur Landung | – |
| `LANDUNG` (ohne laufende Instanz `SS`) | `sprung` | Tabelle `SPRUNG_LANDUNG_DAUERN` 5/1: Bild 7, 8 | – |
| `SPRUNGANGRIFF`, `N` | `sprungangriff` | Tabelle 2/2/24/2/1 bis uhr 31, danach `sprung` Bild 6 | [2]: uhr 5 bis 28 |
| `SPRUNGANGRIFF`, `R` | `richtung` | Tabelle 2/2/24/2/1/1 (Bild 5 ist die Fallpose und hält) | [2]: uhr 5 bis 28 |
| `SPRUNGANGRIFF`, `H` | `hoch` | Tabelle 3/3/4/3/3/3/3/3/2/1/1, uhr 1 bis 29; danach `SPRUNG` (Fallpose) | [2]: uhr 7 bis 10 |
| `SPRUNGANGRIFF`, `T` | `runter` | Tabelle 4/4/24, Bild 2 hält bis zur Landung | [2]: uhr 9 bis 32 |
| `SCHLAG` Stufe 1 bis 4, `LEERSCHLAG` | `kette1` … `kette4` | Tabelle `DAUERN.kette1` … `kette4` (`vela.ts`), letztes Bild hält bis zum Ende der Aktion | wie oben (G0-2) |
| `GRIFF`, noch kein Kniestoß (`knie_zahl` 0) | `griff` | Tabelle 1/2/2/56: Bild 0 bis 2 (uhr 1 bis 5), dann Bild 3 | – |
| `GRIFF` nach einem Kniestoß (`knie_zahl` > 0) | `griff` | Bild 3 (Halten) | – |
| `KNIESTOSS`, `1` bis `3` | `kniestoss` | Tabelle 2/2/9/2/1/6, uhr 1 bis 22 | [2]: uhr 5 (K+5) |
| `WURF`, `V` und `R` | `wurf` | Tabelle 9/7/5/10/5/1, uhr 1 bis 37; Loslassen uhr 22 = Bild 3 | [0]: uhr 1 (E+1) |
| `SPEZIAL` (auch aus Griff und Getroffen) | `spezial` | Tabelle 2/2/2/1/6/6/6/6/6/6/2/2/2/1, uhr 1 bis 50 | [4, 5, 6, 7, 8, 9]: Stufe k ab uhr 8 + 6 (k − 1) |
| `SPRINTANGRIFF` | `sprintangriff` | Tabelle 1/1/2/10/20/1, uhr 1 bis 35 | [3]: uhr 5 bis 14 |
| `SPRINTSPRUNG`, `SS` | `sprint_sprungangriff` | nach `ss_n` (nicht `uhr`): Tabelle 4/8/7/20, `ss_n` 1 bis 39; ist die Instanz zu Ende (`ss_n` 0) und die Figur noch in der Luft: `sprung` Bild 6 | [2]: `ss_n` 13; [3]: `ss_n` 20 bis 39 |
| `LANDUNG` mit laufender Instanz `SS` (`angriff.code` `SS`) | `sprint_sprungangriff` | Bild 4 (danach `STAND` und `LAUF` wie sonst) | – |
| `GETROFFEN` | `getroffen_vorn`, wenn der letzte Angreifer vor der Figur steht (Vorzeichen x_Angreifer − x_Figur gleich `blick`, bei Gleichheit vorn), sonst `getroffen_hinten` (G1-11) | Tabelle 1/13/6/6/1, uhr 1 bis 27 | – |
| `UMGEWORFEN` | `umgeworfen` (Flug in Blickrichtung: gespiegelt, G1-12) | Tabelle 1/8/6/31/8, uhr 1 bis 54: Bild 2 ab dem ersten Bahnframe H+9, Bild 4 ab dem Bodenkontakt H+46 | – |
| `LIEGEN` | `liegen` (gespiegelt wie davor) | Bild 0 | – |
| `AUFSTEHEN` | `aufstehen` (gespiegelt wie davor) | Tabelle 5/5/5/5/5/1, uhr 1 bis 26 | – |
| `TOT` | `umgeworfen`, dann `tot` (gespiegelt wie bei `UMGEWORFEN`) | Tabelle `TOT_FLUG_DAUERN` 1/2/6/31/9 (Bahn F4: Stillstand t+1, t+2, Bodenkontakt t+40), ab uhr 50 (Ruhe t+49) `tot` (G1-13) | – |
| `WAFFE` | `waffe_schuss`, Werfer am Werferpunkt | Tabelle 6/4/7, uhr 1 bis 17 | [1]: uhr 7 (Abschuss P+7) |
| `AUFNEHMEN` | `aufnehmen` | Tabelle 2/3/2, uhr 1 bis 7 | – |
| `NEUEINSTIEG`, `h` > 0 (Fall N+1 bis LN − 1) | `neueinstieg_fall` | Schleife, 2 Bilder zu 4 | – |
| `NEUEINSTIEG`, ab der Landung LN (`landung_ln`, `h` 0) | `neueinstieg_landung` | Tabelle 5/1 mit d + 1, d = `uhr` − (`landung_ln` − `neueinstieg_n`) | – |

Trefferstopp: In Stoppframes steht `uhr`, das Bild bleibt (Auftrag 4, 3).
Schutz blinkt wie heute. Fehlt ein Fall, nimmt die Darstellung `stand`.

**Raketenwerfer in der Hand** (G1-7, abgestimmt mit G4, 4.7): Vela trägt
den Werfer auf der vorderen Schulter, die vordere Faust aufrecht am Griff.
Den Werfer zeichnet nicht Velas Blatt (Farbbudget), sondern die Darstellung
aus dem Bild von G4 (`werferBild` in `gegenstaende.ts`, gleiche Form und
Farben `ROHR_GRUEN` wie der Gegenstand): Sein Griffpunkt (`WERFER.griffpunkt`,
(−3; −1,5) in Objektkoordinaten) liegt auf Velas Werferpunkt W, also sein
Anker bei W − Griffpunkt, gezeichnet vor Vela (das Rohr liegt über dem
oberen Rand der Faust, das Schulterpolster auf der Schulter). W ist die
Mitte des vorderen Handschuhs, in px vom Fußpunkt (x nach vorn, y nach
oben negativ; `werferPunkte()` in `vela_kampf.ts`):

| Animation | Werferpunkt W je Bild |
|---|---|
| `waffe_stand` | (13, −52) |
| `waffe_gehen` | (15, −48), (15, −51), (15, −51), (15, −51), (15, −51), (15, −49), (15, −48), (15, −51), (15, −51), (15, −51), (15, −51), (15, −49) |
| `waffe_schuss` | (14, −50), (9, −51), (11, −51) |

Die Mündung liegt damit im Schussbild bei W + (16; −2,5) = (25; −53,5); die
Rakete erscheint 58 px vor der Figur in 50 px Höhe (`RAKETE_START_X`,
`RAKETE_START_H`). Die 33 px dazwischen überbrückt der Mündungsblitz oder
die Darstellung (G1-7). Blick links: W gespiegelt (x → −x), der Werfer
gespiegelt.

### 4.2 Rammbock (Gliederpuppe)

Stand G2 (Phase 2, nach E24; Phase 1 G0c). Quelle
`spiel/grafik/quelle/figuren/rammbock.ts` mit den gemeinsamen Bausteinen der
Nahkämpfer in `figuren/bolzer_gemeinsam.ts` (Haltung → Pose, Gehzyklus,
gedrehte Gesichtsmaske, alle Dauern aus `werte.ts`), Blatt
`spiel/grafik/ausgabe/rammbock.png` mit `rammbock.json`, Kontaktbögen
`docs/bilder/kontakt_rammbock_<animation>.png`, Tests
`spiel/tests/grafik_rammbock.test.ts`. Die Fassung aus Grok-Blättern heißt
`rammbock_fremd` (Abschnitt 5) und bleibt Vorlage und Vergleich. Aussehen
nach Auftrag 4, 4: breiter, kahler Schlepperfahrer mit kurzem Vollbart,
olivgrüner Polsterweste offen über nacktem Oberkörper, brauner Hose mit
Gürtel und Stahlschnalle, Knieschützern aus Stahl und schweren dunkelbraunen
Arbeitsstiefeln; gedrungen-kräftig, breite Schultern, große kantige Fäuste.
Gesichtsmasken (je höchstens 4 × 3): `normal` Auge 2 × 2 in `KONTUR` unter
einer Braue im Hautdunkel, `getroffen` Auge zugekniffen, `zu` Auge
geschlossen (liegend), `wut` Braue schräg (Angriff, Spott). Nase als
Vorsprung im Profil, Ohr als eigene Form.

**Ansicht nach E24** (G2-1): Dreiviertelansicht wie im Automatenspiel nach
dem Grok-Konzeptbild (`fremd/rammbock/rammbock_0_konzept.png`): Brust und
Bauch halb zum Betrachter gedreht. Die nahe Westenhälfte deckt Rücken,
Flanke und die nahe Brustseite bis 1 px rechts der Mitte, die ferne zeigt
nur ihre Vorderkante als Streifen jenseits des Bauchs; Brust, Bauch, Nabel
und Schnalle liegen rechts der Mitte. Die nahe Schulter liegt links der
Mitte (x −3), die ferne rechts hinter Brust und Kopf (x +8). Die Arme sind
je 0,6 px schlanker als in Phase 1, die Faust etwas kleiner.

**Maße** (px; Körper im Stand 44 × 70 mit Kontur, Umriss 60 × 76 mit
Schatten, `masse.ts` `UMRISS_GEGNER.Rammbock`): Sohle bis Knöchel 6,
Oberschenkel 13, Unterschenkel 13 (Hüfte im Stand bei −29, gestreckt −32),
Taille 3 über der Hüfte, Schultergelenke 19 über der Taille bei x −3 (nah)
und +8 (fern), Rumpf von −11,8 (Rücken) bis +11,8 (Bauch), Kopf mit Bart 15
hoch (etwa 1/5 der Körperhöhe), Oberarm 12 (Radius 4,2 bis 3,6), Unterarm
11 (3,6 bis 3), Faust 9,8 × 9,4 (offene Hand und Zeigehand als Sonderform),
Stiefel gut 16 lang, Knieschützer 7 × 9. Zeichenreihenfolge: ferner Arm
(10), fernes Bein (20, Knieschützer 22), nahes Bein (26, Knieschützer 28),
Becken (29), Rumpf (30, Brustlinie 31, Gürtel 32, Schnalle 33), Weste (32,
Nähte 33), Kopf (35, Ohr 35,5, Bart 36), naher Arm (50), Faust (51),
Schulterpolster (52); je Pose überschrieben (Hammerschlag: ferner Arm vorn,
Sprungtritt: nahes Bein vorn).

**Tonzuteilung** (15 Farben plus durchsichtig = 16, Farbbudget 1.2; G0c-2,
unverändert):

| Farbe | Wert | Verwendung |
|---|---|---|
| `KONTUR` | `#140E22` | Außenkontur, Auge, Innenkontur (Ton 0) von Weste, Hose, Stiefeln, Gürtel und Bart |
| `HAUT_MITTEL` 0 | `#802F27` | Innenkontur der Haut (Arm vor Rumpf, Faust vor Unterarm, Ohr), Braue |
| `HAUT_MITTEL` 1 | `#B0563A` | Hautschatten; Brustlinie, Nabel, Fingerfalten |
| `HAUT_MITTEL` 2 | `#C98E68` | Haut |
| `HAUT_MITTEL` 3 | `#D6B493` | Hautlicht |
| `WESTE_OLIV` 1 | `#3B4B21` | Westenschatten, Steppnähte |
| `WESTE_OLIV` 2 | `#6B7A3A` | Weste |
| `WESTE_OLIV` 3 | `#939E4E` | Westenlicht |
| `HOSE_BRAUN` 1 | `#3B231A` | Hosenschatten; Grundton von Bart, Stiefeln und Gürtel |
| `HOSE_BRAUN` 2 | `#6A4A32` | Hose; Licht von Bart, Stiefeln und Gürtel |
| `HOSE_BRAUN` 3 | `#8E6C46` | Hosenlicht |
| `STAHL` 1 | `#4D5374` | Schatten der Knieschützer und der Schnalle |
| `STAHL` 2 | `#6F7C99` | Knieschützer, Schnalle |
| `STAHL` 3 | `#929DAE` | Stahllicht |
| `STAHL` 4 | `#B6BCC2` | Glanz (einzige Glanzfarbe, darf allein stehen) |

**Animationen** (Zeiten in Frames ohne Trefferstopp; Bild zur Uhr u ist
`bildBeiUhr(dauern, u)`: das erste Bild, bei dem die Summe der Dauern u
erreicht, in einer Schleife u modulo Summe). Angriffe nach den Codes der
Logik (`werte.ts` `NAH_ANGRIFFE`, `RAMMBOCK_ANGRIFF_CODES`; Welt 5.5, 5.6):
der Rammbock hat RA, RB (normal), RU, RS (Umwerfen), kein drittes normales
Schlagbild (G2-11). Getroffen, Umgeworfen, Liegen, Aufstehen, Spott und
Sprungtritt nach den Grok-Blättern des Rammbocks (E24; Zellen in Klammern,
`fremd/rammbock/`): Haltung nachgebaut, nicht abgepaust.

| Animation | Bilder | Dauern | Summe | aktiv | Inhalt |
|---|---|---|---|---|---|
| `stand` | 1 | 0 | – | – | aufrecht, Beine breit, Fäuste vor dem Bauch (Rückfall der Darstellung, Prüfbild „Umriss im Stand“, G0b-8) |
| `haltung` | 3 | 5/5/5 | 15, Schleife | – | Stand, einatmen (Brust 1 px höher), ausatmen; Füße fest |
| `gehen` | 8 | je 4 | 32, Schleife | – | Standfuß rückt je Bild 6, 7, 6, 7, 6, 6, 7, 6 px zurück, 51 px je Zyklus (G0c-3); Ferse setzt in Bild 0 (nahes Bein) und 4 (fernes) auf; Hüfte wippt um 1 px; Arme gegen die Beine |
| `gehen_schnell` | 8 | je 3 | 24, Schleife | – | dieselben Bilder, Richtwert 4 · 1,6 / 2,0 ≈ 3 (G2-8) |
| `auftritt_versteck` | 8 | je 4 | 32, Schleife | – | = `gehen` (Einlauf, Auftrag 4, 3) |
| `auftritt_hocke` | 1 | 0 | – | – | tief gekauert, nahe Hand am Boden, Faust am Knie, fernes Bein auf der Spitze (A11) |
| `aufstehen_hocke` | 3 | 35/17/17 | 69 | – | Kopf hoch, noch hockend; halb auf, Fäuste an der Brust; fast aufrecht mit Deckung (D12 bis D14); Summe = `AUFTRITT_HOCKE_RAMMBOCK` (G2-6) |
| `spott` | 6 | 10/8/8/8/7/1 | 42 | – | Stand; herbeiwinken mit der offenen nahen Hand; mit beiden Armen zeigen (Zeigehand); Hocke mit geballten Fäusten; winken; zeigen (D15 bis D20); Summe = `SPOTT_DAUER` |
| `wiegen` | 6 | 10/8/8/8/7/1 | 42, Schleife | – | Oberkörper wiegt zurück, Mitte, vor (Fäuste pendeln vor dem Bauch, wütend), Mitte, zurück, Stand (G2-9) |
| `kampfhaltung` | 2 | 8/8 | 16, Schleife | – | Boxerstellung (A4, C1): naher Arm deckt das Kinn, ferne Faust vorn, Knie gebeugt; Bild 1 wippt 1 px tiefer (G2-7) |
| `hocke_ankuendigung` | 2 | 4/21 | 25 | – | deutliche Hocke vor jedem Angriff (design-gegner-stages.md 1.2; C15, C16): halb gesenkt, dann tiefe Hocke mit vorgebeugtem Rumpf, Fäuste vor Brust und Kinn (G2-7) |
| `schlag_a` | 5 | 5/4/5/3/2 | 19 | [2] | RA: Faust weit zurück, Gewicht hinten; wuchtige Gerade aus der Hüfte (C1 bis C5), Faust bis 48 px vor dem Fußpunkt (`ZIELABSTAND_MAX`); Zwischenbild; Kampfhaltung |
| `schlag` | 5 | 5/4/5/3/2 | 19 | [2] | = `schlag_a` (Name aus Phase 1 für `vergleich.ts`, G2-11) |
| `schlag_b` | 5 | 5/5/8/4/4 | 26 | [2] | RB: Schwinger von oben (A5, A6): Faust hinter den Kopf, Gewicht zurück; schräg nach vorn unten bis 48 px; Nachschwung tief; zurück in die Kampfhaltung |
| `umwerfschlag` | 5 | 5/4/5/3/2 | 19 | [2] | RU: Hammerschlag (C6 bis C10): nahe Faust hoch, beide Fäuste über dem Kopf, beide nach vorn unten (47 px), gebückt, zurück |
| `sprungtritt` | 4 | 9/37/4/4 | 54 | [1] | RS: Absprung gestreckt mit zurückgeschwungenen Armen (C12); Flug mit hochgerissenem nahem Knie und ferner Faust vorn (A7, C13); Landung in der Hocke; Aufrichten |
| `getroffen` | 3 | 9/12/2 | 23 | – | Kopf in den Nacken, Rücken durchgebogen, Knie eingeknickt, offene Hände nach vorn oben (D2); etwas weniger (D3); aufgerichtet mit offenen Händen vor dem Körper (D1); Auge zugekniffen (G2-15) |
| `umgeworfen` | 5 | 8/19/18/5/4 | 54 | – | weit zurückgebogen auf den Zehen (D4); schräg rücklings steigend, Beine vorn (D5); waagrecht fallend, naher Arm hängt (D6); Aufprall mit federndem Oberkörper und zurückgeworfenem Arm (D7); flach auf dem Rücken (D8) |
| `liegen` | 1 | 0 | – | – | flach auf dem Rücken, Kopf hinten, Beine gestreckt, Augen zu (D8, D9) = `umgeworfen` 4 |
| `aufstehen` | 6 | je 3 | 18 | – | aufgesetzt mit Händen hinten (D10); tief vorgebeugt, Hand am Boden (D11); Hocke mit Hand am Boden und Faust an der Brust (D12); Hocke mit beiden Fäusten (D13); halb auf; Stand (D14) |
| `gehalten` | 1 | 0 | – | – | am Kragen gepackt, leicht zurückgelehnt, Kopf eingezogen, nahe Hand am Kragen, ferner Arm hängt (E1) |
| `geworfen` | 2 | 22/36 | 58 | – | kopfüber getragen, Arme hängen (E2); waagrecht mit dem Gesicht nach unten, Arme vorn (E3; G2-10) |
| `tot` | 6 | 2/19/18/5/4/30 | 78 | – | Bilder von `umgeworfen` und `liegen` mit den Zeiten der Bahn F4; Blinken zeichnet die Darstellung |

Flug-, Liege- und Kopfüberbilder liegen mit ihrem untersten Pixel auf der
Ankerzeile wie die Standbilder; in der Luft hebt die Darstellung das Bild um
die Höhe h der Logik an (`zeichnen.ts` `bildY`; G2-3). Die Reichweite (vorderster
Pixel vor dem Anker) ist in jedem Angriff im Trefferbild am größten: RA 48,
RB 48, RU 47, RS 32 (Knie und ferne Faust).

**Zuordnung zur Logik** (Gegner `modus`, `aktion`, `modus_uhr` ab 1,
Angriffsinstanz und `angriff_code`, `angriff_a` = A, `reaktion_h` = h bzw.
W, E, t, `gehstufe`, `auftritt`, `h`). In Stoppframes bleibt das Bild
stehen. Das Atlas-Feld `aktiv` nennt das Trefferbild:

| Zustand → Animation | Uhr → Bild | aktive Bilder |
|---|---|---|
| WARTEN mit `auftritt` hocke → `auftritt_hocke` (sonst unsichtbar, Welt 4.2) | Bild 0 | – |
| AUFTRITT mit `auftritt` hocke → `aufstehen_hocke` | `modus_uhr` 1–35 Bild 0, 36–52 Bild 1, 53–69 Bild 2 | – |
| AUFTRITT sonst (versteck, luke, Rand) → `auftritt_versteck` | wie `gehen` | – |
| ANNAEHERN, ABWARTEN, SEITENWECHSEL mit `aktion` GEHEN → `gehen` (`gehstufe` normal) bzw. `gehen_schnell` (schnell) | n = Frames seit Beginn des Gehens (ab 1): Bild ⌊(n − 1) / 4⌋ mod 8 bzw. ⌊(n − 1) / 3⌋ mod 8 | – |
| ABWARTEN mit `aktion` STAND (an der Warteposition) → `wiegen` | `bildBeiUhr(10/8/8/8/7/1, ((modus_uhr − 1) mod 42) + 1)` | – |
| ANNAEHERN mit `aktion` STAND, FREI → `haltung` | `bildBeiUhr(5/5/5, ((modus_uhr − 1) mod 15) + 1)` | – |
| KAMPFHALTUNG → `hocke_ankuendigung` | `modus_uhr` 1–4 Bild 0, ab 5 Bild 1 (hält bis A) | – |
| ANGRIFF, Code RA → `schlag_a` | d = Frame − A: d 0–4 Bild 0, 5–8 Bild 1, ab 9 (A+9 bis zum letzten aktiven Frame, nach Treffer 7 länger) Bild 2 | [2] (A+9) |
| ANGRIFF, Code RB → `schlag_b` | d 0–4 Bild 0, 5–9 Bild 1, ab 10 Bild 2 | [2] (A+10) |
| ANGRIFF, Code RU → `umwerfschlag` | d 0–4 Bild 0, 5–8 Bild 1, ab 9 Bild 2 | [2] (A+9) |
| ANGRIFF, Code RS → `sprungtritt` | d 0–8 Bild 0 (ab A+5 in der Luft), 9–45 Bild 1 (nach Treffer bis A+52), ab dem Aufsetzen A+46 (h = 0) 4 Frames Bild 2, dann 4 Frames Bild 3 | [1] (A+9) |
| NACHLAUF nach RA, RB, RU (Code in `angriff_code`) → Bild 3 und 4 des Angriffs, dann `kampfhaltung` | `modus_uhr` 1 bis Dauer von Bild 3: Bild 3, dann Bild 4 (zusammen der feste Rückzug 5 bzw. 8), danach `kampfhaltung` als Wartepose (Schleife über `modus_uhr`) | – |
| NACHLAUF nach RS → Bild 3 von `sprungtritt` bis A+53, dann `kampfhaltung` | wie oben | – |
| SPOTT → `spott` | `bildBeiUhr(10/8/8/8/7/1, modus_uhr)` | – |
| GETROFFEN → `getroffen` | k = Frame − h: `bildBeiUhr(9/12/2, k)`, Bildwechsel h+1, h+10, h+22 | – |
| UMGEWORFEN, Bahn F1 (`phase`) → `umgeworfen` | k = Frame − W: 1–8 Bild 0 (Stillstand), 9–27 Bild 1 (Steigen), 28–45 Bild 2 (Fallen), 46–50 Bild 3 (Bodenkontakt W+46), 51–54 Bild 4 (dann LIEGEN ab der Ruhe W+55) | – |
| UMGEWORFEN, Bahn F2 → `umgeworfen` | Dauern 8/19/21/5/4: Bild 3 ab dem Bodenkontakt W+49, Ruhe W+58 | – |
| UMGEWORFEN, Bahn F3 (Wurf) → `geworfen`, dann `umgeworfen` 3 und 4 | k = Frame − E: 1–22 `geworfen` 0 (getragen, losgelassen in E+22), 23–58 `geworfen` 1, 59–63 `umgeworfen` 3, 64–70 `umgeworfen` 4 (Ruhe E+71) | – |
| GEHALTEN → `gehalten` | Bild 0 | – |
| LIEGEN → `liegen` | Bild 0 | – |
| AUFSTEHEN → `aufstehen` | `bildBeiUhr(3/3/3/3/3/3, modus_uhr)`, 18 Frames bis G | – |
| TOT, Bahn F4 → `tot` | k = Frame − t: 1–2 Bild 0, 3–21 Bild 1, 22–39 Bild 2, 40–44 Bild 3 (Bodenkontakt t+40), 45–48 Bild 4, 49–78 Bild 5 (liegend bis Slot frei t+79); Blinken als Regel | – |
| TOT, Bahn F4b → `tot` | wie F4, Bild 4 während des Rollens bis t+72, dann Bild 5 | – |
| TOT, Bahn F3 → `geworfen`, `umgeworfen` 3 und 4, dann `liegen` | wie UMGEWORFEN F3, ab der Ruhe Bild 5 von `tot` bis Slot frei t+101 | – |
| sonst (unbekannte Kombination) → `stand` | Bild 0 (Auftrag 4, 3: Meldung in der Konsole) | – |

Blickrichtung (G2-10): `umgeworfen` und `tot` fliegen rücklings vom Blick
weg (Kopf nach hinten, Grok D). Fliegt der Gegner in seine Blickrichtung
(Treffer von hinten), spiegelt die Darstellung das Bild. `geworfen` 1 fliegt
Kopf voran in Blickrichtung des Bildes; die Darstellung wählt den Blick nach
der Flugrichtung.

**Knieschützer als Splitter** (G0c-4): Liegt ein Knieschützer fast ganz
hinter dem anderen Bein, entfällt er in diesem Bild. Das gilt, wenn sein
sichtbarer Rest in keiner Zeile breiter als 4 px Stahl ist (`KNIE_SPLITTER`,
gut die Hälfte der Platte).

### 4.3 Bolzer (Gliederpuppe, G2)

Stand G2 (Phase 2). Quelle `spiel/grafik/quelle/figuren/bolzer.ts` mit
`figuren/bolzer_gemeinsam.ts`, registriert über `bolzerFiguren()` (Blätter
`bolzer` und `puppe`), Blatt `spiel/grafik/ausgabe/bolzer.png` mit
`bolzer.json`, Kontaktbögen `docs/bilder/kontakt_bolzer_<animation>.png`,
Tests `spiel/tests/grafik_bolzer.test.ts`. Aussehen nach Auftrag 4, 4:
Hafenschläger, gedrungen und vorgebeugt (Rumpf 14° nach vorn, Kopf
vorgeschoben), grauer Overall mit Reißverschluss vorn, Kragen und orangen
Streifen um Schultern und Schienbeine, Atemmaske aus Stahl mit dunklem
Sichtglas und Filterdose vor dem Mund (kein Gesicht, Auftrag 4, 2.4),
Riemen über den kahlen Hinterkopf, Magnetstiefel mit Metallkappe und
Stahlsohle, Werkzeuggürtel mit Stahlschnalle und Tasche an der nahen Hüfte,
dunkle Haut an Kopf und Händen. Dreiviertelansicht wie der Rammbock (E24):
nahe Schulter links der Mitte, ferne rechts hinter der Brust, Reißverschluss
rechts der Mitte.

**Maße** (px; Körper im Stand 39 × 62 mit Kontur, Umriss 57 × 72 mit
Schatten, `masse.ts` `UMRISS_GEGNER.Bolzer`, Stand höchstens 67 und
mindestens 61 hoch): Sohle bis Knöchel 6, Oberschenkel 12,5, Unterschenkel
12,5 (Hüfte im Stand bei −27), Taille 2 über der Hüfte, Schultergelenke
15,5 über der Taille bei x −3 (nah) und +6,5 (fern), Rumpf von −11 (runder
Rücken) bis +10,2, 19 hoch, Kopf mit Hals 13,4 (etwa 1/5 der Körperhöhe),
Oberarm 10,5 (Radius 3,9 bis 3,4), Unterarm 9,5 (3,4 bis 2,9), Faust
8,6 × 8,2 (offene Hand und Zeigehand als Sonderform), Stiefel 15 lang mit
Kappe und 1,7 px Stahlsohle. Zeichenreihenfolge: ferner Arm (10, Streifen
10,2), fernes Bein (20, Streifen 20,2), Stiefel (21, Kappe 21,5), nahes
Bein (26), Becken (29), Rumpf (30, Reißverschluss 31), Gürtel (32, Tasche
32,5, Schnalle 33), Kragen (34), Kopf (35, Ohr 35,5, Riemen 35,8), Maske
(37, Sichtglas 37,5, Filter 38), naher Arm (50), Faust (51); Gerade mit der
fernen Faust und Tritt mit eigener Reihenfolge.

**Tonzuteilung** (15 Farben plus durchsichtig = 16, Farbbudget 1.2; G2-13):

| Farbe | Wert | Verwendung |
|---|---|---|
| `KONTUR` | `#140E22` | Außenkontur, Innenkontur von Haut, Stiefeln, Gürtel und Tasche |
| `OVERALL_BOLZER` 0 | `#444559` | Innenkontur des Overalls (Arm vor Rumpf, Bein vor Bein) |
| `OVERALL_BOLZER` 1 | `#64677B` | Overallschatten, Reißverschluss |
| `OVERALL_BOLZER` 2 | `#8B909B` | Overall |
| `OVERALL_BOLZER` 3 | `#ABAEB3` | Overalllicht |
| `SIGNAL_ORANGE` 1 | `#BE4412` | Streifen im Schatten |
| `SIGNAL_ORANGE` 2 | `#E8812F` | Streifen (Grund und Licht) |
| `STAHL` 0 | `#31334E` | Stiefel, Gürtel, Tasche, Riemen (Grund), Sichtglas, Innenkontur der Maske |
| `STAHL` 1 | `#4D5374` | Licht von Stiefeln, Gürtel und Tasche; Schatten von Maske, Kappe, Sohle, Filter |
| `STAHL` 2 | `#6F7C99` | Maske, Filter, Kappe, Sohle, Schnalle |
| `STAHL` 3 | `#929DAE` | Stahllicht |
| `STAHL` 4 | `#B6BCC2` | Glanz (einzige Glanzfarbe) |
| `HAUT_DUNKEL` 1 | `#5F3226` | Hautschatten, Fingerfalten |
| `HAUT_DUNKEL` 2 | `#8F5A3E` | Haut |
| `HAUT_DUNKEL` 3 | `#B17D54` | Hautlicht |

**Animationen** (wie 4.2; Angriffe nach `NAH_ANGRIFFE` BA, BB, BC
(`BOLZER_ANGRIFF_CODES`) und BUA, BUB; Reaktionsposen nach den
Grok-Blättern des Rammbocks, an den gedrungenen Bolzer angepasst: kürzere
Glieder, runder Rücken, Kopf tiefer zwischen den Schultern, daher die Arme
beim Getroffensein weiter vorn als beim Rammbock, damit der Kopf frei
bleibt):

| Animation | Bilder | Dauern | Summe | aktiv | Inhalt |
|---|---|---|---|---|---|
| `stand` | 1 | 0 | – | – | vorgebeugt, Kopf vorgeschoben, Fäuste vor dem Bauch (G0b-8, G2-14) |
| `haltung` | 3 | 5/5/5 | 15, Schleife | – | Atmen unter der Maske: Stand, Schultern hoch, Schultern tief |
| `gehen` | 8 | je 4 | 32, Schleife | – | stapfend, vorgebeugt; Standfuß rückt je Bild genau 7 px zurück (4 · 1,75), 56 px je Zyklus; Ferse in Bild 0 und 4; Arme gegen die Beine |
| `gehen_schnell` | 8 | je 3 | 24, Schleife | – | dieselben Bilder, Richtwert 4 · 1,75 / 2,25 ≈ 3 (G2-8) |
| `auftritt_versteck` | 8 | je 4 | 32, Schleife | – | = `gehen` |
| `auftritt_hocke` | 1 | 0 | – | – | tief gekauert, nahe Hand am Boden, Faust am Knie |
| `aufstehen_hocke` | 3 | 25/12/12 | 49 | – | Kopf hoch; halb auf mit Fäusten; fast aufrecht in Deckung; Summe = `AUFTRITT_HOCKE_BOLZER` (G2-6) |
| `spott` | 6 | 10/8/8/8/7/1 | 42 | – | Stand; winken; zeigen; geduckt die Faust in die offene Hand; winken; zeigen (nach Grok D15 bis D20) |
| `kampfhaltung` | 2 | 8/8 | 16, Schleife | – | geduckt, Fäuste vor der Maske; Bild 1 wippt 1 px tiefer |
| `schlag_a` | 5 | 5/4/5/3/2 | 19 | [2] | BA: Faust zurück, Gewicht hinten; Gerade mit der nahen Faust (41 px); Zwischenbild; Deckung (G2-16) |
| `schlag_b` | 5 | 2/2/10/3/3 | 20 | [2] | BB (schnell, Startup 4): kurz ducken, ferne Faust laden; Stoß mit der fernen Faust (46 px, Arm vorn gezeichnet); zurück; Kampfhaltung; Rückzug 3/3 als Richtwert (G2-4) |
| `schlag_c` | 5 | 5/5/8/4/4 | 26 | [2] | BC: Arm weit nach hinten geschwungen, Schulter dreht zurück; Haken auf Kopfhöhe (40 px); Nachschwung; zurück |
| `umwerfschlag_a` | 5 | 5/4/5/3/2 | 19 | [2] | BUA: tiefe Hocke mit der Faust hinten, tiefer; Aufwärtshaken mit gestrecktem Körper (32 px, Faust bis 64 px hoch); oben; zurück |
| `umwerfschlag_b` | 5 | 4/4/10/3/3 | 24 | [2] | BUB: Knie hoch, höher; Tritt mit der Stahlsohle nach vorn (37 px, Bein vorn gezeichnet); Bein zurück; abstellen; Rückzug 3/3 als Richtwert (G2-4) |
| `getroffen` | 3 | 9/12/2 | 23 | – | Kopf weit in den Nacken (Maske zeigt nach oben), Rücken durchgebogen, offene Hände vor dem Körper; weniger; aufgerichtet (nach D2, D3, D1) |
| `umgeworfen` | 5 | 8/19/18/5/4 | 54 | – | wie 4.2 nach D4 bis D8, Glieder kürzer |
| `liegen` | 1 | 0 | – | – | flach auf dem Rücken = `umgeworfen` 4 |
| `aufstehen` | 6 | je 3 | 18 | – | wie 4.2 nach D10 bis D14 |
| `gehalten` | 1 | 0 | – | – | am Kragen gepackt, nahe Hand am Kragen, ferner Arm hängt (nach E1) |
| `geworfen` | 2 | 22/36 | 58 | – | kopfüber mit gespreizten Armen; waagrecht, Gesicht nach unten (nach E2, E3) |
| `tot` | 6 | 2/19/18/5/4/30 | 78 | – | `umgeworfen` und `liegen` mit den Zeiten von F4, Blinken als Regel |

**Zuordnung zur Logik**: wie beim Rammbock (4.2) mit diesen Unterschieden:

| Zustand → Animation | Uhr → Bild | aktive Bilder |
|---|---|---|
| AUFTRITT mit `auftritt` hocke → `aufstehen_hocke` | `modus_uhr` 1–25 Bild 0, 26–37 Bild 1, 38–49 Bild 2 | – |
| ANNAEHERN, ABWARTEN mit `aktion` STAND, FREI → `haltung` | `bildBeiUhr(5/5/5, ((modus_uhr − 1) mod 15) + 1)` | – |
| KAMPFHALTUNG → `kampfhaltung` | `bildBeiUhr(8/8, ((modus_uhr − 1) mod 16) + 1)` | – |
| ANGRIFF, Code BA → `schlag_a` | d = Frame − A: 0–4 Bild 0, 5–8 Bild 1, ab 9 Bild 2 | [2] (A+9) |
| ANGRIFF, Code BB → `schlag_b` | d 0–1 Bild 0, 2–3 Bild 1, ab 4 Bild 2 | [2] (A+4) |
| ANGRIFF, Code BC → `schlag_c` | d 0–4 Bild 0, 5–9 Bild 1, ab 10 Bild 2 | [2] (A+10) |
| ANGRIFF, Code BUA → `umwerfschlag_a` | d 0–4 Bild 0, 5–8 Bild 1, ab 9 Bild 2 | [2] (A+9) |
| ANGRIFF, Code BUB → `umwerfschlag_b` | d 0–3 Bild 0, 4–7 Bild 1, ab 8 Bild 2 | [2] (A+8) |
| NACHLAUF → Bild 3 und 4 des Angriffs, dann `kampfhaltung` | `modus_uhr` 1 bis Dauer von Bild 3: Bild 3, dann Bild 4 (fester Rückzug 5 bzw. 8; bei BB und BUB Rückzug 0: 3 + 3 Frames Richtwert), dann `kampfhaltung`; wirft der Treffer um (Nachlauf 0), folgt der nächste Zustand direkt | – |
| SPOTT, Reaktionen, TOT | wie 4.2 | – |

### 4.4 Puppe (Palettentausch des Bolzers, G2)

Stand G2 (Phase 2). Zweite Figur aus `bolzerFiguren()` mit dem Blattnamen
`puppe`: Blatt `spiel/grafik/ausgabe/puppe.png` mit `puppe.json`,
Kontaktbögen `docs/bilder/kontakt_puppe_<animation>.png`, Umriss wie der
Bolzer (`UMRISS_GEGNER.Puppe` = 57 × 72). Kein eigenes Zeichnen: Jedes Bild
ist das Bild des Bolzers mit getauschten Farben (`PUPPE_TAUSCH`,
`puppeAnimationen()`), gleiche Maße, Anker, Dauern und aktiven Bilder.
Ergebnis nach Auftrag 4, 4: Bolzer in Grau ohne Streifen (G2-12).

| Farbe des Bolzers | Farbe der Puppe | Grund |
|---|---|---|
| `OVERALL_BOLZER` 0 bis 3 | `PUPPE_GRAU` 0 bis 3 (`#505262`, `#727383`, `#9A9CA2`, `#B9BABC`) | Overall grau |
| `SIGNAL_ORANGE` 1, 2 | `PUPPE_GRAU` 1, 2 | Streifen nehmen den Overallton gleicher Stufe an und verschwinden |
| `HAUT_DUNKEL` 1, 2, 3 | `PUPPE_GRAU` 0, 1, 2 | Kopf und Hände dunkelgrau, eine Stufe unter dem Overall (Übungspuppe ohne Haut) |
| `STAHL` 0 bis 4, `KONTUR` | unverändert | Maske, Stiefel, Gürtel sind schon grau; Kontur für alle Figuren gleich |

Die Puppe hat damit 11 Farben einschließlich durchsichtig. **Zuordnung zur
Logik**: Gegnertyp Puppe (Prüfszene, Kampf 11.2) in `modus` PUPPE → `haltung`
(Schleife wie 4.3), Reaktionen wie der Bolzer (4.3, 4.2); angreifen,
gehen und spotten tut sie nicht, die Animationen liegen trotzdem im Blatt
(gleiche Namen wie beim Bolzer).

### 4.5 Zünder (G3, Phase 2)

Quelle `spiel/grafik/quelle/figuren/zuender.ts` (`zuenderFiguren`), Blatt
`spiel/grafik/ausgabe/zuender.png` mit `zuender.json` (12 Animationen,
51 Bilder, 327 × 671, MD5 `cb8eae893543fff4b871c1bb1652f7bb`), Kontaktbögen `docs/bilder/kontakt_zuender_<animation>.png`,
Tests `spiel/tests/grafik_zuender.test.ts`. Aussehen nach Auftrag 4, 4:
Hafenwächter, mittelgroß, dunkelblaue Uniform mit Schultergurt der Koppel,
Koppel mit Stahlschnalle und orangem Abzeichen, Helm aus Stahl mit Schirm,
Nackenschutz und Seitenteil, oranges Visier vom Schirm bis unters Kinn,
darunter eine dunkle Haube (G3-10), Lederhandschuhe und -stiefel. Der grüne
Raketenwerfer liegt auf der fernen Schulter hinter dem Kopf (G3-1), Heck und
Mündung stehen neben dem Kopf vor; die nahe Hand hält das Rohr vorn, die
ferne den Griff. Beim Zielen liegt das Rohr waagrecht, der Kopf neigt sich
zum Zielfernrohr, das Visier leuchtet, und eine Abtastlinie (Maske 7 × 1)
wandert darüber. Ab dem Tod zeigt die Figur keinen Werfer mehr: Er fliegt
als Objekt davon und liegt ab t+44 als Gegenstand (Welt 6; Bild von G4).

**Ansicht und Maße** (px; Körper im Stand 35 × 67 mit Kontur, Umriss
64 × 72 mit Schatten, `masse.ts` `UMRISS_GEGNER.Zünder`): Rumpf halb von
vorn wie der Rammbock (G0c-1), nahe Schulter bei x −3, ferne bei +6, 15 über
der Taille; Sohle bis Knöchel 5, Oberschenkel und Unterschenkel je 13,5
(Hüfte im Stand bei −31), Taille 2, Nacken 18,5 über der Taille, Kopf mit
Helm 14 hoch, Oberarm 10, Unterarm 9, Handschuh 6,2 × 7, Stiefel gut 14 lang.
Raketenwerfer in Form und Farben wie der Gegenstand von G4 (4.7, G4-16),
getragen 1,2-fach (G3-4): Rohr 5 px dick, mit Heck und Mündungsring 34 px
lang, Zielfernrohr oben, Griff schräg nach hinten; Achse 5 px über dem
fernen Schultergelenk, beim Zielen 45 px über dem Boden (Rakete in 44 px
Höhe, `ZR_RAKETE_H`). Zeichenreihenfolge: ferner Arm (10), fernes Bein (20),
nahes Bein (26), Becken (29), Rumpf (30, Gurt 31, Abzeichen 32, Koppel 33),
Rückstrahl (33,6), ferne Hand (33,8), Werfer (34, Beschläge 34,5), Kragen
(35), Kopf (36), Visier (37), Helm (38), naher Arm (50), Mündungsfeuer (52);
beim Kolbenhieb liegt der Werfer vor dem Körper (45).

**Tonzuteilung** (15 Farben plus durchsichtig = 16):

| Farbe | Wert | Verwendung |
|---|---|---|
| `KONTUR` | `#140E22` | Außenkontur, Innenkontur von Uniform, Hose, Haube und Leder |
| `UNIFORM_ZUENDER` 1 | `#121737` | Uniformschatten, Haube, Lederschatten |
| `UNIFORM_ZUENDER` 2 | `#253A6B` | Uniform, Hose, Haubenlicht |
| `UNIFORM_ZUENDER` 3 | `#355B93` | Uniformlicht (Hose ohne Licht) |
| `STAHL` 1 | `#4D5374` | Schatten und Innenkontur von Helm und Beschlägen |
| `STAHL` 2 | `#6F7C99` | Helm, Heck, Mündungsring, Zielfernrohr, Griff, Schnalle |
| `STAHL` 3 | `#929DAE` | Stahllicht |
| `STAHL` 4 | `#B6BCC2` | Glanz (darf allein stehen) |
| `VISIER_ORANGE` 1 | `#E25500` | Visier ohne Leuchten |
| `VISIER_ORANGE` 2 | `#FF9A2A` | Visierlicht; Rand und Abtastlinie des leuchtenden Visiers; Abzeichen; äußeres Feuer |
| `VISIER_ORANGE` 4 | `#FBE29E` | Visierglanz; Fläche des leuchtenden Visiers; Kern des Feuers (darf allein stehen) |
| `ROHR_GRUEN` 1 | `#295A24` | Rohrschatten |
| `ROHR_GRUEN` 2 | `#4F8A3C` | Rohr |
| `ROHR_GRUEN` 3 | `#70AF50` | Rohrlicht |
| `LEDER` 2 | `#4A3428` | Handschuhe, Stiefel, Koppel, Schultergurt (einstufig mit Uniform 1 als Schatten) |

**Animationen** (Frames ohne Trefferstopp; Bild zur Uhr u ist das erste,
bei dem die Summe der Dauern u erreicht, `bildBeiUhr`):

| Animation | Bilder | Dauern | Summe | aktiv | Inhalt |
|---|---|---|---|---|---|
| `stand` | 1 | 0 | – | – | aufrecht, Werfer schräg auf der Schulter (Mündung 16° hoch) |
| `gehen` | 8 | je 4 | 32, Schleife | – | Standfuß rückt je Bild 7 px zurück (4 · 1,75, `ZUENDER_GEHEN_X`), 56 px je Zyklus; Ferse setzt in Bild 0 (nah) und 4 (fern) auf; der Werfer wippt mit |
| `gehen_schnell` | 8 | je 3 | 24, Schleife | – | dieselben Bilder; 7 px / 2,25 px/Frame ≈ 3 Frames (`ZUENDER_SCHNELL_X`, G3-16) |
| `zielen` | 4 | 15/15/15/15 | 60, Schleife | – | Rohr waagrecht, tiefer Stand, Visier leuchtet, Abtastlinie oben, Mitte, unten, Mitte (`ZIELEN_DAUER`) |
| `schuss` | 4 | 5/1/10/1 | 17 | [2] | Anlegen (leuchtend), Zündung (kleiner Rückstrahl und Mündungsfeuer), Rückstoß (Rohr 9° hoch, großes Feuer vorn und hinten; steht ab A+6, wenn die Rakete erscheint, `ZR_RAKETE_AB`), Absetzen (`SCHUSS_DAUER`, G3-3) |
| `kolbenhieb` | 5 | 5/4/5/3/2 | 19 | [2] | wie BA (`NAH_ANGRIFFE.BA`): Werfer umgedreht vor der Brust, weit zurück, Stoß mit dem Heck voran (45 px vor dem Fußpunkt, höchstens `ZIELABSTAND_MAX`), zurück, Werfer hochnehmen (G3-17) |
| `getroffen` | 3 | 9/12/2 | 23 | – | Bildwechsel h+1, h+10, h+22 (`REAKTION_ANIMATION`): Kopf zurück, Werfer reißt hoch; gekrümmt; zurück zum Stand |
| `umgeworfen` | 5 | 8/18/19/5/5 | 55 | – | Bahn F1 (`F1_STILLSTAND`, `F1_BODEN`, `F1_RUHE`): steif nach hinten, schräg steigend, flach fallend, Aufprall mit hochgeschlagenen Beinen, liegend |
| `liegen` | 1 | 0 | – | – | rücklings, Werfer quer über der Brust |
| `aufstehen` | 6 | je 3 | 18 | – | `AUFSTEHEN_GEGNER`: Kopf heben, sitzen (ferne Hand am Boden), knien, geduckt, zwei Zwischenbilder zum Stand |
| `tot` | 5 | 2/18/19/5/5 | 49 | – | Bahn F4 (`F4_STILLSTAND`, `F4_BODEN`, `F4_RUHE`) wie `umgeworfen`, ohne Werfer, Hände offen; danach Blinken der Darstellung |
| `gehalten` | 1 | 0 | – | – | gekrümmt im Griff der Figur, Werfer gesenkt (G3-18) |

Reaktionsposen (getroffen, umgeworfen, liegen, aufstehen, tot) nach den
Grok-Blättern des Rammbocks (E24, `rammbock_d_reaktionen.png` Reihen 1 bis
3), nachgebaut, nicht abgepaust.

**Zuordnung Zustand → Animation → Bild** (Darstellung, Phase 3; Felder aus
`entitaeten.ts`, Zahlen aus `werte.ts`; f = `welt.frame`; in Stoppframes
bleibt das Bild stehen):

| Zustand (`modus`, `aktion`) | Animation | Uhr → Bild | aktive Bilder |
|---|---|---|---|
| `WARTEN` | – | nicht sichtbar (Auftritt vom Rand) | – |
| `AUFTRITT` (`rand_links`, 0 Frames) | `gehen` | wie `ANNAEHERN` | – |
| `ANNAEHERN`, `ZURUECK` mit `aktion` `GEHEN` | `gehen` (`gehstufe` normal) bzw. `gehen_schnell` | Bild ⌊(`modus_uhr` − 1) / 4⌋ mod 8 (schnell / 3). Läuft er gegen seinen Blick ((x − `x_vor`) · `blick` < 0; Zurückweichen mit Blick zur Figur), laufen die Bilder rückwärts: (8 − i) mod 8 (G3-15) | – |
| `ANNAEHERN`, `ZURUECK` mit `aktion` `STAND`; `BEREIT`; `FREI`; `PUPPE` | `stand` | Bild 0 | – |
| `ZIELEN` | `zielen` | Bild ⌊(`modus_uhr` − 1) / 15⌋ mod 4 (z bis z+59) | – |
| `SCHUSS` | `schuss` | d = f − `angriff_a`; Bild `bildBeiUhr`([5, 1, 10, 1], d + 1) | 2 ab A+6 (Rakete) |
| `KOLBENHIEB` mit `aktion` `ANGRIFF` | `kolbenhieb` | d = f − `angriff_a`; Bild `bildBeiUhr`([5, 4, 5, 3, 2], d + 1); nach einem wirksamen Treffer (`angriff_treffer` > 0) steht Bild 2 bis `angriff_aktiv_ende` (A+20), danach Bild 3 und 4 um 7 Frames später | 2 in A+9 bis A+13 |
| `KOLBENHIEB` mit `aktion` `NACHLAUF` | `stand` | Bild 0 | – |
| `GETROFFEN` | `getroffen` | d = f − `reaktion_h` (≥ 1); Bild `bildBeiUhr`([9, 12, 2], d) | – |
| `UMGEWORFEN` (Bahnen F1, F2, F3) | `umgeworfen` | nach der Bahn: Stillstand (`bahn_frame` 0) Bild 0; steigend (`vh` > 0, `bahn_boden` 0) Bild 1; fallend Bild 2; `bahn_frame` − `bahn_boden` 0 bis 4 Bild 3; danach Bild 4. Bei F1 ist das d = f − `reaktion_h` mit [8, 18, 19, 5, 5] | – |
| `LIEGEN` | `liegen` | Bild 0 | – |
| `AUFSTEHEN` | `aufstehen` | Bild `bildBeiUhr`([3, 3, 3, 3, 3, 3], `modus_uhr`) | – |
| `TOT` (Bahn F4) | `tot` | wie `UMGEWORFEN`; nach der Ruhe Bild 4 mit Blinken | – |
| `GEHALTEN` (geworfen: `UMGEWORFEN` mit Bahn F3) | `gehalten` | Bild 0 | – |

### 4.6 Ballast (G3, Phase 2)

Quelle `spiel/grafik/quelle/figuren/ballast.ts` (`ballastFiguren`), Blatt
`spiel/grafik/ausgabe/ballast.png` mit `ballast.json` (16 Animationen,
70 Bilder, 992 × 1374, MD5 `feb5e7faae56578588e103b7f50f07a9`), Kontaktbögen `docs/bilder/kontakt_ballast_<animation>.png`,
Tests `spiel/tests/grafik_ballast.test.ts`. Aussehen nach Auftrag 4, 4:
riesiger Vorarbeiter mit schwerem Oberkörper und Bauch über dem Gürtel,
violettes Arbeitshemd mit V-Ausschnitt, Knopfleiste, Brusttasche und
abgerissenen Ärmeln (gezackter Stummel am freien Arm), dunkelgraue Hose mit
Gürtel und Stahlschnalle, Stahlkappenstiefel, helle Haut, kurzes dunkles
Haar, Schnauzbart, schweres Kinn, Schweißerbrille mit zwei Stahlgläsern auf
der Stirn. Der rechte Arm ist ein hydraulischer Ladearm aus Stahl
(Schulterkappe, Gehäuse mit Schlauch, Zylinder mit drei orangen
Warnstreifen, Kolbenstange, Greifer mit zwei Backen, offen oder zu); beim
Blick nach rechts ist er der nahe Arm und liegt vorn, der freie linke Arm
mit großer Faust hinter dem Rumpf. Vor jedem Angriff leuchten die Gläser
der Brille (`BRILLE_GLUT`, G3-12). Kurzer Schlag und Griff fehlen (E21:
nicht in der Scheibe).

**Ansicht und Maße** (px; Körper im Stand 51 × 94 mit Kontur, Umriss
70 × 100 mit Schatten): Rumpf halb von vorn wie der Rammbock, nahe Schulter
bei x −8, ferne bei +12, 25 über der Taille; Rumpf ±19 breit, Nacken 30,5
über der Taille (Taille 4); Sohle bis Knöchel 7, Oberschenkel und
Unterschenkel je 17 (Hüfte im Stand bei −39,5), Kopf mit Haar 18 hoch; freier
Arm 15 + 14 (Radien 6 bis 4,4), Faust 12 × 11; Ladearm 15 + 14 (Gehäuse
Radius 7, Zylinder 6,4), Greifer 13 × 16, Schulterkappe 15,6 × 13,6;
Stiefel 21 lang mit Stahlkappe. Zeichenreihenfolge: freier Arm (10, Ärmel
10,5, Faust 11), fernes Bein (20, Kappe 22), nahes Bein (26, Kappe 28),
Becken (29), Rumpf (30, Nähte 30,5, Ausschnitt 31, Gürtel 32), Kopf (35, Ohr,
Haar, Bart, Band, Rahmen, Gläser bis 38), Ladearm (Stange 49,5, Gehäuse 50,
Streifen 50,5, Schlauch 51, Greifer 51, Kappe 52).

**Tonzuteilung** (15 Farben plus durchsichtig = 16):

| Farbe | Wert | Verwendung |
|---|---|---|
| `KONTUR` | `#140E22` | Außenkontur, Auge, Innenkontur von Hemd, Hose, Haar, Bart, Band, Gürtel, Schlauch, Stiefeln |
| `HAUT_HELL` 1 | `#E0734A` | Hautschatten, Innenkontur der Haut, Braue, Fingerfalten |
| `HAUT_HELL` 2 | `#E8B189` | Haut |
| `HAUT_HELL` 3 | `#F0D6B9` | Hautlicht |
| `HEMD_BALLAST` 1 | `#3D275D` | Hemdschatten, Nähte |
| `HEMD_BALLAST` 2 | `#6A3F8C` | Hemd |
| `HEMD_BALLAST` 3 | `#9054AF` | Hemdlicht |
| `HOSE_DUNKELGRAU` 1 | `#1D1E26` | Hosenschatten; Haar, Bart, Band, Gürtel, Schlauch, Stiefel |
| `HOSE_DUNKELGRAU` 2 | `#3E424C` | Hose; Licht von Haar, Bart, Band, Gürtel, Stiefeln |
| `STAHL` 1 | `#4D5374` | Stahlschatten und Innenkontur des Stahls; Hosenlicht (neben `HOSE_DUNKELGRAU` 3 `#595F69`) |
| `STAHL` 2 | `#6F7C99` | Ladearm, Greifer, Stiefelkappen, Brillenrahmen, Schnalle, Gläser |
| `STAHL` 3 | `#929DAE` | Stahllicht |
| `STAHL` 4 | `#B6BCC2` | Glanz (darf allein stehen) |
| `SIGNAL_ORANGE` 2 | `#E8812F` | Warnstreifen (einstufig) |
| `BRILLE_GLUT` | `#FFB828` | Gläser leuchtend (Ankündigung, Brüllen im Auftritt; Leuchtton) |

**Animationen**:

| Animation | Bilder | Dauern | Summe | aktiv | Inhalt |
|---|---|---|---|---|---|
| `stand` | 2 | 20/20 | 40, Schleife | – | breitbeinig, Ladearm hängt schwer, Faust vor der Hüfte; Bild 1 Brust, Schultern und Arme 1 px gehoben (atmend, G3-5) |
| `gehen` | 5 | je 8 | 40, Schleife | – | Standfuß rückt je Bild 10 px zurück (8 · 1,25, `BOSS_GEHEN_X`), 50 px je Zyklus; jeder Fuß steht 4 Bilder (Ferse, flach, flach, Spitze), stampfend (G3-6) |
| `ankuendigung` | 2 | 8/7 | 15, Schleife | – | breite Hocke, vorgebeugt, Ladearm hinten hoch gespannt mit offenem Greifer, Faust vorn, Brille leuchtet; Bild 1 tiefer, Greifer zu (mindestens 15 Frames, `KP_HOCKE`, G3-13) |
| `armschwung` | 15 | je Schwung 9/8/3/8/8 | 3 · 36 | [2, 7, 12] | drei Schwünge als Folge (E18), je Ausholen 2 Bilder über `AS_AUSHOLEN` 17, Trefferbild über `AS_AKTIV_VON` bis `AS_AKTIV_BIS`, Durchschwung und Rückkehr bis `AS_NAECHSTER` 36: Vorhand waagrecht (Greifer 56 px vor dem Fußpunkt), Aufwärtshaken (46 px, auf Kopfhöhe), Hammer von oben (56 px; wirft um) (G3-9) |
| `ansturm` | 4 | je 4 | 16, Schleife | [0, 1, 2, 3] | Laufbilder, stark vorgebeugt, Ladearm als Rammbock vorgestreckt, freier Arm pumpt; Standfuß rückt 16 px je Bild (4 · 4, `AN_V`) (G3-7) |
| `ansturm_bremsen` | 1 | 16 | 16 | – | Auslauf im Nachlauf (`AN_NACHLAUF`): zurückgelehnt, vorderer Fuß stemmt (G3-7) |
| `koerperpresse` | 7 | 3/12/36/13/12/14/12 | 102 | [3] | Absprung 2 (Abdruck, gestreckt steigend), Flug 1 (Arme weit, Knie angezogen), Aufprall 2 (bäuchlings fallend als Trefferbild ab `KP_AKTIV_VON`, platt am Boden ab `KP_LANDUNG`), Aufstehen 2 (gestemmt, geduckt) (G3-14) |
| `stoss_rueckzug` | 4 | 8/8/18/20 | 54 | – | `RZ_DAUER`, taumelnd: abgestoßen (Arme hoch), rückwärts stolpernd (beides in den 16 Frames der Bewegung, `RZ_SCHNELL_FRAMES`), vornübergebeugt wankend, fängt sich |
| `getroffen` | 3 | 9/12/2 | 23 | – | h+1, h+10, h+22: Kopf fliegt zurück, Ladearm schlägt nach hinten; gekrümmt; zurück |
| `umgeworfen` | 5 | 8/18/19/5/5 | 55 | – | Bahn F1 wie der Zünder, Arme schwer, Beine weniger hoch |
| `liegen` | 1 | 0 | – | – | rücklings, Greifer offen auf dem Bauch, freier Arm über dem Kopf |
| `aufstehen` | 6 | je 3 | 18 | – | Kopf heben, sitzen (Greifer am Boden), knien, geduckt, zwei Zwischenbilder |
| `fall` | 6 | 2/18/19/4/5/1 | 49 | – | Tod, Bahn F4: erstarrt, Knie knicken ein, rücklings kippend, Aufschlag (t+40), Zusammensacken, liegt erschlafft ab t+49 (Zusammenbrechen) |
| `auftritt` | 4 | 15/15/15/15 | 60 | – | `AUFTRITT_BOSS`: bricht geduckt mit vorgestrecktem Greifer hervor, richtet sich mit erhobenem Arm auf, brüllt mit leuchtender Brille, stampft in den Stand; Kistentrümmer zeichnet G4 (4.7) |
| `taumeln` | 4 | 8/20/30/20 | 78 | – | `BOSS_TAUMELN_DAUER`: Trefferbild (Stillstand h+1 bis h+8), dann Bilder 1 bis 3 von `stoss_rueckzug` (G3-8) |
| `gehalten` | 1 | 0 | – | – | gekrümmt im Griff der Figur (G3-19) |

**Zuordnung Zustand → Animation → Bild** (Felder aus `entitaeten.ts`,
`g.boss` aus `BossFelder`, Abläufe aus `gegner/boss_angriffe.ts`; f =
`welt.frame`; n = f − `boss.schwung_a` beim Armschwung, sonst
n = f − `angriff_a`):

| Zustand (`modus`, `aktion`, `boss.art`) | Animation | Uhr → Bild | aktive Bilder |
|---|---|---|---|
| `WARTEN` | – | nicht sichtbar (in der Asservatenkammer) | – |
| `AUFTRITT` | `auftritt` | Bild `bildBeiUhr`([15, 15, 15, 15], `modus_uhr`) | – |
| `BEREIT`, `aktion` `STAND`; `FREI`; `PUPPE` | `stand` | Bild ⌊(`modus_uhr` − 1) / 20⌋ mod 2 | – |
| `BEREIT`, `aktion` `GEHEN` | `gehen` | Bild ⌊(`modus_uhr` − 1) / 8⌋ mod 5 (gegen den Blick rückwärts wie beim Zünder) | – |
| `ANKUENDIGUNG`, `AS` (Schwung 1) | `ankuendigung`, dann `armschwung` | n ≤ 14: `ankuendigung` Bild `bildBeiUhr`([8, 7], n + 1); n = 15, 16: `armschwung` Bild 1 | – |
| `ANKUENDIGUNG`, `AN` | `ankuendigung` | n = 0 bis 19: Bild `bildBeiUhr`([8, 7], (n mod 15) + 1) | – |
| `ANKUENDIGUNG`, `KP` (Hocke) | `ankuendigung` | n = 0 bis 14: Bild `bildBeiUhr`([8, 7], n + 1) | – |
| `ANGRIFF` oder `NACHLAUF`, `AS`, Schwung k = `schwung` | `armschwung` | Bild 5(k − 1) + `bildBeiUhr`([9, 8, 3, 8, 8], n + 1); hat der Schwung getroffen (`boss.treffer`), steht das Trefferbild bis n = 26 (7 Frames länger), Bild 3 n = 27 bis 31, Bild 4 n = 32 bis 35; im Nachlauf ab n = 36 `stand` | 2, 7, 12 in A_k+17 bis A_k+19 |
| `ANGRIFF`, `AN` (Lauf) | `ansturm` | Bild ⌊(`boss.lauf_n` − 1) / 4⌋ mod 4 | alle Laufbilder |
| `NACHLAUF`, `AN` | `ansturm_bremsen`, dann `stand` | Auslauf (`boss.auslauf_n` 1 bis 15) Bild 0, danach `stand` | – |
| `ANGRIFF` oder `NACHLAUF`, `KP` | `koerperpresse` | Flug: Bild `bildBeiUhr`(D, `boss.kp_k` + 1) mit D = [3, 12, 36, 13, 12, 14, 12] (Stoppframes halten das Bild, weil `kp_k` steht); nach der Landung m = f − `boss.kp_landung`: Bild `bildBeiUhr`(D, 65 + m) | 3 ab `kp_k` = 51 |
| `STOSS` | `stoss_rueckzug` | d = f − `boss.stoss_beginn`; Bild `bildBeiUhr`([8, 8, 18, 20], d) | – |
| `TAUMELN` | `taumeln` | d = f − `reaktion_h`; Bild `bildBeiUhr`([8, 20, 30, 20], d) | – |
| `GETROFFEN` | `getroffen` | d = f − `reaktion_h`; Bild `bildBeiUhr`([9, 12, 2], d); bleibt er bei offener Folge länger in `GETROFFEN` (SA3), steht Bild 2 | – |
| `UMGEWORFEN` (Umwerfen, Kniestoß, Wurf, Explosion) | `umgeworfen` | nach der Bahn wie beim Zünder (4.5) | – |
| `LIEGEN` | `liegen` | Bild 0 | – |
| `AUFSTEHEN` | `aufstehen` | Bild `bildBeiUhr`([3, 3, 3, 3, 3, 3], `modus_uhr`) | – |
| `TOT` (Bahn F4) | `fall` | nach der Bahn: Stillstand Bild 0, steigend 1, fallend 2, `bahn_frame` − `bahn_boden` 0 bis 3 Bild 3, 4 bis 8 Bild 4, danach Bild 5 | – |
| `GEHALTEN` | `gehalten` | Bild 0 | – |

### 4.7 Objekte und Effekte (G4, Phase 2)

Stand G4 (Phase 2). Quellen `spiel/grafik/quelle/gegenstaende.ts`
(Gegenstände, Behälter, Geschosse und die Zeichenhilfe `malen()`),
`effekte.ts` (Magnetstoß, Funke, Eiswelle, Explosion, Staub) und
`objekte.ts` (Regeln, Prüfung, Blatt, Kontaktbögen; `objekteErzeugnisse()`),
Blatt `spiel/grafik/ausgabe/objekte.png` mit `objekte.json` (Format Auftrag
4, 2.3), Kontaktbögen `docs/bilder/kontakt_objekte_<animation>.png`, Tests
`spiel/tests/grafik_objekte.test.ts`.

**Zeichenweg.** Gegenstände, Behälter, Geschosse und die Eiswelle entstehen
aus Schichten (`malen()`): Formen aus `geometrie.ts` mit Tonabbildung
(fünf Farben je Material), Wölbung (wie die Puppe: Kapsel als Zylinder,
Ellipse als Kugel, Polygon als Kissen; dazu stehender und liegender
Zylinder für Fass und Rohr) und Zeichenreihenfolge. Danach wie bei der
Gliederpuppe (2.4): Ton aus Licht in harten Stufen, Kantenregeln,
Innenkontur zwischen Gruppen, Streupixel aufräumen (Spitzen aus einem Pixel
entfallen), Symbole (Bitmuster bis 8 × 8), Außenkontur `KONTUR`.
Magnetstoß, Funke, Explosion und Staub werden je Pixel aus einer
Rechenvorschrift gezeichnet (Abstand zu Bogen, Strahl oder Wolke). Raster
nur als Schachbrett (Bayer-Stufe 1/2), sonst stünden Rasterpixel allein.
Zufall nur über `src/kern/zufall.ts` mit festem Seed (Splitter der
Eiswelle, Ballen der Explosion).

**Stilregeln je Animation** (`OBJEKT_REGELN`, geprüft in `objektePruefen()`;
der Bau bricht bei Befunden ab): höchstens 8 Farben einschließlich
durchsichtig je Bild und über alle Bilder der Animation (1.2), Anker im
Bild, aktive Indizes gültig, Streupixel außer Glanzfarben (Funke: alle
Farben, Funken dürfen allein stehen). Gegenstände, Behälter, Geschosse und
die Eiswelle haben eine geschlossene Außenkontur `KONTUR`; Magnetstoß,
Funke, Explosion und Staub haben keine Kontur und kein `KONTUR` (G4-1).

**Animationen** (Bilder nach rechts gezeichnet; die Darstellung spiegelt
um den Anker; Dauern in Frames als Richtwert):

| Animation | Bilder | Dauern | Maß (px, mit Kontur) | Anker | Farben | Inhalt |
|---|---|---|---|---|---|---|
| `kometenbraten` | 1 | 0 | 28 × 18 | Fußpunkt (Mitte unten) | 8 | glasierter Braten auf ovaler Stahlplatte, Knochen, Glanzstreifen der Glasur, zwei Dampfkringel |
| `eisnudelschale` | 1 | 0 | 20 × 14 | Fußpunkt | 8 | blaue Schale mit Fuß und hellem Rand, Nudelberg mit Wellenlinien, zwei hellblaue Stäbchen |
| `sternbeeren` | 1 | 0 | 14 × 12 | Fußpunkt | 8 | fünf leuchtende Beeren mit Glanzpunkt, Blatt und Stiel |
| `raketenwerfer` | 1 | 0 | 30 × 10 | Fußpunkt unter dem Griff | 8 | grünes Rohr, Mündungsring, Heckrand, Zielfernrohr, Griff, Schulterpolster |
| `waffe_leer` | 1 | 0 | 30 × 10 | wie `raketenwerfer` | 8 | dieselbe Form, Rohr grau |
| `rakete` | 2 | 2/2, Schleife | 16 × 6 (Bild 1: 15 × 6) | Mitte der Achse | 8 | Flamme lang/kurz, dunkles Leitwerk, Stahlkörper, gelbe Spitze |
| `rakete_zuender` | 2 | 2/2, Schleife | wie `rakete` | Mitte der Achse | 8 | wie `rakete`, rote Spitze |
| `fass` | 1 | 0 | 24 × 32 | Fußpunkt | 8 | Treibstofffass: stehender Zylinder, Deckel mit Mulde und Spund, zwei Rollreifen, orangefarbenes Band mit Perihel-Zeichen (Komet: runder Kopf, zwei Schweifstreifen) |
| `fass_truemmer` | 5 | 2/4/4/6/32 | bis 71 × 56 | Fußpunkt des Fasses | 8 | vier Teile: Bodenstumpf (bleibt stehen), linke und rechte Daube, Deckel; Bersten, Flug, Liegen |
| `bosskiste` | 1 | 0 | 40 × 28 | Fußpunkt | 8 | Asservatenkiste: Vorderseite mit Fugen, Eckpfosten, heller Deckel, Siegelstreifen mit Siegel, Aktenschild |
| `bosskiste_truemmer` | 5 | 2/4/4/6/32 | bis 90 × 54 | Fußpunkt der Kiste | 8 | vier Bretter: Bodenbrett (bleibt), zwei Bretter der Vorderseite, Deckel mit Siegelstreifen; grauer Anstrich, Bruchenden in `HOLZ` |
| `magnetstoss1` … `magnetstoss4` | 2 | 2/2 | 13 × 16 bis 31 × 26 | Ansatzpunkt an der Faust (Tabelle unten) | 5 | Bild 0 frisch: weißblaues Glühen an der Faust, innerer und äußerer Bogen mit weißem Kern (Trefferbild, volle Länge); Bild 1 verblassend, dünner, ohne Weiß |
| `funke` | 4 | 2/2/2/2 | 9 × 9 bis 18 × 18 | Trefferpunkt (Mitte) | 6 | weißer Blitz, Stern mit langen und kurzen Strahlen (weiß innen, orange außen), Strahlen lösen sich, einzelne Funken |
| `eiswelle` | 6 | je 6 | 45 × 34 bis 125 × 34 | Velas Fußpunkt | 6 | Reif auf dem Boden bis zur Front, Eissplitter in zwei Reihen mit Kamm 6 bis 12 px hinter der Front, Splitter in der Luft |
| `explosion` | 6 | 2/3/4/4/5/6 (24) | Durchmesser 24, 36, 48, 58, 66, 72 | Einschlagpunkt: unter der Mitte in der untersten Zeile | 8 | gelber Blitz (Stern), weißer Kern in oranger Wolke, Wolke ohne Weiß mit Rauchrand, Zerfall mit Löchern; Raster an jeder Tonschwelle und außen |
| `explosion_zuender` | 6 | wie `explosion` | wie `explosion` | wie `explosion` | 8 | dieselben Bilder, eigenes `aktiv` |
| `staub` | 3 | 3/3/3 | 22 × 6, 40 × 9, 54 × 8 | Fußpunkt | 5 | Wolken am Boden beidseitig: klein, groß, verweht (oben gelichtet) |

**Farben** (je Animation, einschließlich durchsichtig höchstens 8):

| Animation | Farben außer durchsichtig |
|---|---|
| Kometenbraten | `KONTUR`, `BRATEN` 1 bis 3, `NUDEL` 3 (Glasur, Knochen, Dampf), `STAHL` 2 und 3 (Platte) |
| Eisnudelschale | `KONTUR`, `SCHALE_BLAU` 1 bis 3 (3 auch die Stäbchen), `NUDEL` 1, 2 und 4 (Glanz) |
| Sternbeeren | `KONTUR`, `STERNBEERE` 1 bis 4, `BLATT_GRUEN` 2 und 3 |
| Raketenwerfer, leere Waffe | `KONTUR`, `ROHR_GRUEN` 1 bis 3 bzw. `OVERALL_BOLZER` 1 bis 3, `STAHL` 1, 2 und 4 (Glanz) |
| Rakete | `KONTUR`, `STAHL` 1 bis 3, `RAKETE_GELB` 2 bzw. `RAKETE_ROT` 2, `FEUER` 2 und 4 |
| Fass, Fasstrümmer | `KONTUR`, `FASS_STAHLBLAU` 1 bis 4, `SIGNAL_ORANGE` 1 und 2 |
| Bosskiste | `KONTUR`, `KISTE_GRAU` 1 bis 3, `SIEGEL_ROT` 1 bis 3 |
| Kistentrümmer | `KONTUR`, `KISTE_GRAU` 1 bis 3, `HOLZ` 1 und 2, `SIEGEL_ROT` 2 |
| Magnetstoß | `EIS` 1 bis 4 (4 = Weiß) |
| Funke | `EIS` 4 (Weiß), `FEUER` 1 bis 4 |
| Eiswelle | `KONTUR`, `EIS` 1 bis 4 |
| Explosion | `EIS` 4 (Weiß), `FEUER` 0 bis 4, `STAHL` 1 (Rauch) |
| Staub | `STAUB` 1 bis 4 |

**Raketenwerfer (für G1 und G3: gleiche Form)**: mit Kontur 30 × 10 px,
nach rechts gerichtet, Objektkoordinaten mit dem Fußpunkt des liegenden
Werfers in (0, 0) (`WERFER`, `werferFormen()`, `werferBild()` in
`gegenstaende.ts`). Pixel je Teil (einschließlich):

| Teil | x | y | Farben |
|---|---|---|---|
| Rohr (liegender Zylinder) | −12 … 11 | −6 … −3 | `ROHR_GRUEN` 3 (oben), 2, 2, 1 (unten); Glanzlinie `STAHL` 4 in Zeile −5 bei x −9 … −7 und 8 … 9 |
| Mündungsring | 12 … 13 | −7 … −2 | `STAHL` 2 und 1 |
| Heckrand | −14 … −13 | −6 … −3 | `STAHL` 2 und 1 |
| Zielfernrohr | 0 … 6 | −8 … −7 | `STAHL` 2 und 1, Linse vorn (6, −8) `STAHL` 4 |
| Griff (schräg nach hinten) | −4 … −2 (unten −5 … −3) | −2 … −1 | `STAHL` 2 und 1 |
| Schulterpolster | −11 … −7 | −2 | `STAHL` 1 |

Griffpunkt (Mitte der Hand) bei (−3; −1,5), Mündung bei (13, −4).
Außen- und Innenkontur `KONTUR`. Leere Waffe gleich, das Rohr in
`OVERALL_BOLZER` 3, 2, 1 (grau). Die Rakete der Figur erscheint 58 px vor
der Figur in 50 px Höhe (`RAKETE_START_X`, `RAKETE_START_H`), die des
Zünders 45 px vor ihm in 44 px Höhe (`ZR_RAKETE_X`, `ZR_RAKETE_H`): Dort
sollte im Schussbild die Mündung liegen.

**Ansatzpunkte des Magnetstoßes** (`MAGNETSTOSS_ANSATZ` in `effekte.ts`;
relativ zu Velas Fußpunkt bei Blick rechts, y nach unten; gemessen am
vordersten Pixel der Faust bzw. des Stiefels im aktiven Bild, 4.1; der
Test vergleicht mit dem Blatt `vela` auf ±3 px):

| Stufe | Ansatz | Länge in x | Faust + Stoß | Richtung |
|---|---|---|---|---|
| 1 | (50, −47) | 10 | 60 = 85 − 25 | waagrecht |
| 2 | (50, −46) | 12 | 62 = 87 − 25 | waagrecht |
| 3 | (44, −65) | 22 | 66 = 91 − 25 | 30° nach oben (Aufwärtshaken) |
| 4 | (47, −41) | 28 | 75 = 100 − 25 | waagrecht |
| 4, zweites Fenster | (46, −41) | 28 | 74 | waagrecht |

**Zuordnung Logikzustand → Bild** (Darstellung, Phase 3; „Uhr“ ist die
Aktionsuhr bzw. der genannte Zähler, Beginn 1; in Stoppframes bleibt das
Bild stehen, wo eine Aktionsuhr der Logik zählt; reine Darstellungseffekte
zählen echte Frames):

| Zustand → Animation | Uhr → Bild | aktive Bilder |
|---|---|---|
| Objekt `typ` `Gegenstand`, `art` Kometenbraten / Eisnudelschale / Sternbeeren / Raketenwerfer → `kometenbraten` / `eisnudelschale` / `sternbeeren` / `raketenwerfer`; im Flug (`flugphase` `FLUG`, aus dem Behälter oder vom Zünder) dasselbe Bild in Höhe `h`, Schatten am Boden | Bild 0; gezeichnet, solange `sichtbar` (Liegezeit der Waffe: der Kern setzt das Blinken 700 bis 791 mit 2 Frames sichtbar, 2 unsichtbar und entfernt bei 792; Essen liegt unbegrenzt) | – |
| Objekt `typ` `Waffe` (leere Waffe, Kampf 10.3) → `waffe_leer` | Bild 0, solange belegt (61 Frames) | – |
| Objekt `typ` `Rakete`, `flugphase` `FLUG`: Besitzer `f` (Slots g0 bis g4) → `rakete`, Besitzer ein Gegner (Slots o20 bis o59) → `rakete_zuender`; Anker auf (x, z, h), gespiegelt nach `bahn_richtung` | Bild ⌊`flug_n` / 2⌋ mod 2 (Schleife; im Abschussframe `flug_n` 0) | – |
| Rakete, `flugphase` `EXPLOSION` → `explosion` (Figur) bzw. `explosion_zuender` (Zünder); Anker auf (`einschlag_x`, `einschlag_z`) am Boden (Höhe 0) | Explosionsuhr u (1 = Einschlagframe): Figur u = `RX_DAUER` + 1 − `lebensdauer` (1 bis 15), Zünder u = Frame − `timer.einschlag` + 1 (1 bis 10); Bild `explosionBildBeiUhr(u)`. Der Kern gibt den Slot nach 15 bzw. 10 Frames frei; die Darstellung führt die Explosion bis u = 24 selbst weiter (G4-5) | `explosion` [0, 1, 2, 3, 4] (u 1 bis 15, RX), `explosion_zuender` [0, 1, 2, 3] (u 2 bis 10, ZR) |
| Objekt `typ` `Behälter`, nicht zerbrochen: `art` Fass → `fass`, Bosskiste → `bosskiste` | Bild 0 | – |
| Behälter zerbrochen (`zerbrochen`, Frame h = `zerbrochen_h`) → `fass_truemmer` bzw. `bosskiste_truemmer` an der Lage des Behälters; der Kern entfernt den Behälter in h+1, die Trümmer sind reine Darstellung (G4-8) | Trümmeruhr u = Frame − h + 1; Bild nach Dauern 2/4/4/6/32 (`TRUEMMER_DAUERN`); Bild 4 liegt bis u = 48, blinkt ab u = 33 (2 Frames sichtbar, 2 unsichtbar, beginnend sichtbar, wie die Liegezeit, Welt 9.3); ab u = 49 weg. Mit `welle.7=nur_boss` (Kisten zerbrochen seit Frame 0) ebenso ab Frame 0 | – |
| Figur `aktion` `SCHLAG` oder `LEERSCHLAG`, `phase` k (1 bis 4), `uhr` in `KETTE_AKTIV_VON[k]` … `KETTE_AKTIV_BIS[k]` → `magnetstoss`k am Ansatz der Stufe (Tabelle oben, gespiegelt mit `blick`) | Bild ⌊(`uhr` − `KETTE_AKTIV_VON[k]`) / 2⌋ (2 Bilder zu 2 Frames = 4 aktive Frames); Kette 4 zweites Fenster `uhr` 17 bis 20 ebenso, Ansatz (46, −41) | [0, 1] |
| Figur `aktion` `SPEZIAL`, `uhr` 8 bis 43 → `eiswelle`, Anker an Velas Fußpunkt; zweimal gezeichnet: in Blickrichtung und um den Anker gespiegelt nach hinten (Kampf 9.4: hinten bis = vorn − 1, G4-7) | Bild k − 1 für Stufe k = ⌊(`uhr` − 8) / 6⌋ + 1 (`SPEZIAL_STUFE_VON`, je 6 Frames); vor `uhr` 8 und nach 43 keine Welle | alle [0 … 5] |
| Treffer (Ereignis TR) mit Wirkung R, U, X oder B (nicht W, wirkungslos im Schutz) → `funke` am Trefferpunkt: vorgeschlagen x = Ziel-x minus 20 px zum Angreifer hin (Körper beginnt etwa 25 px vor der Position), Höhe = Mitte des aktiven Bilds des Angreifers (bei Vela die Ansatzhöhe, Explosion und Wurf 30 px) | Funkenuhr ab dem Trefferframe in echten Frames (läuft im Trefferstopp weiter); Bild ⌊(u − 1) / 2⌋, nach 8 Frames weg | – |
| Aufprall: Bodenkontakt einer Umwerf- oder Wurfbahn (`bahn_frame` = `bahn_boden`) und Landung beim Neueinstieg (LN) → `staub` am Fußpunkt (x, z, Höhe 0) | Staubuhr in echten Frames; Bild ⌊(u − 1) / 3⌋, nach 9 Frames weg | – |
| Schutzblinken der Figur (`schutz` > 0 in `zustand` 3, Kampf 6.3) | keine Bilder: in jedem zweiten Framepaar (`(frame >> 1) & 1`) zeichnet die Darstellung vom aktuellen Bild nur die Pixel in `KONTUR` (Umriss), wie heute nur den Rahmen (G4-15) | – |

**Hinweise für den Einbau** (Phase 3):

- Trümmer, Funke, Staub und das Ende der Explosion sind Darstellung ohne
  Gegenstück im Kern: Die Darstellung führt eine eigene Liste laufender
  Effekte (Startframe, Lage, Animation) und zeichnet sie in der Tiefe ihres
  Ankers (Kampf 2.5: Effekte zuletzt bei gleicher Tiefe).
- Schatten: Gegenstände, Behälter und Raketen bekommen den kleinen Schatten
  wie heute (`SCHATTEN_KLEIN_TEILER`), Effekte keinen.
- Der Anker jedes Bildes liegt im Bild (`objektePruefen()`), auch wenn ein
  Teil des Bildes leer ist (Trümmer: das Bodenteil bleibt unter dem Anker).

### 4.8 Hintergründe (G5, Phase 2)

Quellen unter `spiel/grafik/quelle/hintergrund/`: `lage.ts` (Lagen aus
`spiel/daten/stages/scheibe.txt` über `parseStage`, `bandGrenzen`,
`kameraY`), `werkzeug.ts` (Töne, Raster, Wertrauschen über `xorshift32`
aus `src/kern/zufall.ts`, Kästen, Rohre, Nieten, Aufhellen im Lichtkegel,
Schilderschrift 5 × 7), `boden.ts` (Plattenboden mit Tiefenfugen),
`himmel.ts`, `vordergrund.ts`, `a_landedeck.ts`, `b_haendlergasse.ts`,
`f_asservatenkammer.ts`, `blende.ts`, `blatt_hg.ts` (Kacheln, Packen,
Atlas, Zusammensetzen), `kontakt_hg.ts` und `hintergruende.ts`
(`hintergrundErzeugnisse()`, Prüfungen). Blätter in
`spiel/grafik/ausgabe/`: `hintergrund_a.png`, `hintergrund_b.png`,
`hintergrund_f.png` je mit Atlas `.json`, dazu `hintergrund_blende.png`
mit `.json`. Kontaktbögen in `docs/bilder/`:
`kontakt_hintergrund_<a|b|f>.png` (Panorama des ganzen Abschnitts, alle
Ebenen 1×; daneben dasselbe mit Bandkanten (gepunktet), Behältern und
Figuren im Stand an drei Tiefen und an den Lagen der Stage-Gegner;
darunter 2×), `kontakt_hintergrund_<a|b|f>_kacheln.png` (alle Kacheln und
freien Bilder 2×) und `kontakt_hintergrund_blende.png`. Tests
`spiel/tests/grafik_hintergrund.test.ts`. Grok-Konzeptbilder für
Hintergründe liegen nicht vor (E24); gezeichnet nach Auftrag 4,
Abschnitt 4, im Stil der Stilprobe `stil_1_arcade_szene.png`.

**Koordinaten.** Welt-y = 234 − z − h (am Boden h = 0). Die Darstellung
setzt einen Punkt (Welt-x, Welt-y) einer Ebene mit Parallaxe p auf

    Bildschirm-x = Welt-x − ⌊K · p⌋,   Bildschirm-y = Welt-y + Ky

(K, Ky aus `welt.kamera`; dieselbe Abbildung wie `bildX`, `bildY` in
`zeichnen.ts`). p ist 1 für Wand, Boden und Vordergrund und 0,5 für den
Himmel (Auftrag 4, 1.6). Das Bildschütteln (KA10) verschiebt alle Ebenen
wie heute.

**Lagen** (aus `scheibe.txt`; die Tests prüfen jede Zahl):

| Abschnitt | Welt-x | Ky | Band z | Oberkante Bildschirm-y (Welt-y) | Unterkante | Fugen z | Kamera-x |
|---|---|---|---|---|---|---|---|
| A Landedeck | 0–400 | 128 | 138–213 | 149 (21) | 224 = Bildrand | 144, 160, 176, 192, 208 | 0–399 |
| B Händlergasse | 400–850 | 128 | 138–229 | 133 (5) | 224 | 144 … 224 | 17–466 |
| F Asservatenkammer | 1700–2304 | 0 | 10–101 | 133 (133) | 224 | 16 … 96 | 1792–1920 |

Die erste Bodenzeile ist die Bandoberkante (z = oben(x)); der Boden reicht
genau bis zur Bandunterkante, die Wand genau bis über die Oberkante
(Prüfung „Band“). Eine Figur in Tiefe z steht so auf der Bodenzeile
234 − z + Ky. Die Fugen liegen bei z = n · 16 strikt im Band (wie die
Tiefenlinien der Platzhalter). Freie Bilder: `frachtcontainer` x 330 bis
410 und `funkladen` x 450 bis 650 wie die Sätze `hintergrund`, die
Wandkarte von F heißt `asservatenkammer` und deckt den Satz 1700 bis 2304,
`kabelrollen1` x 96 bis 176 und `kabelrollen2` x 280 bis 344 je 24 Zeilen
am unteren Bildrand (Welt-y 72 bei Ky 128) wie die Sätze `vordergrund`.

**Aufbau.** Jede Ebene eines Abschnitts wird ganz gezeichnet, in Kacheln
16 × 16 geschnitten (Raster ab x0 des Abschnitts und ab Bildschirmzeile 0)
und als Kachelkarte abgelegt; gleiche Kacheln liegen nur einmal im Blatt,
leere Zellen haben −1. Was einzeln gebraucht wird (die benannten
Stage-Bilder, der Dampf als Folge, die Kabelrollen mit eigener Deckkraft),
steht als freies Bild im Atlas.

- **A Landedeck** (außen): Himmel 400 × 144 (Ebene `himmel`, p 0,5) mit
  Nachthimmel als Rasterverlauf, Sternen, Kometenschweif als leuchtendem
  Band mit Strähnen vom Horizont rechts nach links oben (unter der
  Anzeigeleiste ausgeblendet), fernen Eisgraten und dem Kontrollturm des
  Hafens. Wand: Kranbrücke als Fachwerk ab Zeile 25 (unter der
  Anzeigeleiste) mit Reif und Eiszapfen, Laufkatze mit Hakenflasche,
  Kranstütze bei x 204 mit Warnband, Leuchtfeuer bei x 38, hintere
  Plattform von der Bandoberkante von B (z 229, Zeile 133) bis zum
  Warnstreifen (4 Zeilen, schräg gelb und schwarz) direkt über der
  Bandoberkante, eingelassene Landefeuer, Ecke am Übergang zu B. Freies
  Bild `frachtcontainer` 80 × 75 (rostrotes Wellblech, Reif, dunkles
  Schild „PERIHEL“ fett, darunter „FRACHT“ eingeprägt), steht auf z 229.
  Boden: Eisbetonplatten 64 × 16 mit Reifflecken, Glitzerpunkten und drei
  hellen Pfeilen des Rollwegs. Vordergrund: Kabeltrommeln (Stahlscheibe
  mit Kranz, Löchern und Nabe, Wicklung dahinter), vom Bildrand
  abgeschnitten, loses Kabel.
- **B Händlergasse** (Innenhof im Eis, überall deckend): Eisdecke und
  Rohrbrücke unter der Anzeigeleiste, Eiswand mit Rissen und Torpfosten
  (davor das Ende des Containers), freies Bild `funkladen` 200 × 103
  (violette Ladenwand, Neonschrift „FUNKLADEN“ doppelt groß in Magenta mit
  Rasterschein, zwei Schaufenster x 470 bis 530 und 560 bis 620 wie die
  Glasscheiben der vollen Stage mit drei Regalböden voller Radios,
  Bildschirme und Funkgeräte und Spiegelung, Tür, Klimagerät, Sockel),
  Stahlfassade mit Paneelen, Nieten, zwei Rohren, Handrad (rostrot) und
  Manometer, Lüftungsgitter, freies Bild `dampf` (3 Bilder zu 8 Frames,
  Wolken steigen auf), Rolltor mit Warnpfosten und Warnleuchte am rechten
  Ende (dort der Schnitt). Boden: Gussplatten 32 × 16 mit Noppen,
  Kanaldeckel bei (736, 186), Fensterlicht und Neonschein vor dem Laden.
- **F Asservatenkammer** (innen, überall deckend): dunkle Decke mit
  Trägern und Lüftungsrohr, Stahlpaneele, zwei Regale (Pfosten bei x 1706,
  1790, 1874 und 1926, 2040) mit Holzkisten mit Siegelband, Metallkoffern
  und Fässchen, Gitterkäfig x 2052 bis 2196 mit gestapelten Asservaten,
  Tür, Schloss und Schild „ASSERVATE“ (hinter den drei Bosskisten bei
  2040, 2080, 2120), runde Panzertür im Rahmen mit Warnstreifen x 2204 bis
  2294, dunkler Pfeiler als Arenawand bis 2304. Vier Deckenleuchten
  (x 1730, 1862, 1994, 2142) mit Lichtkegeln: jeder Pixel im Kegel im
  Raster eine Stufe seiner Treppe heller, nahe der Leuchte zwei, dazu ein
  dünnes Punktraster in kaltem Licht. Boden: Tränenblech 48 × 16, dunkel,
  Lichtflecken unter den Leuchten (Fugen bleiben dunkel).

**Atlasformat** (`hintergrund_<a|b|f>.json`, feste Schlüsselfolge):

```json
{
  "blatt": "hintergrund_a.png",
  "abschnitt": "A", "name": "Landedeck",
  "welt": { "x0": 0, "x1": 400 },
  "kameraY": 128,
  "band": { "oben": 213, "unten": 138, "kanteY": 21, "untenY": 96 },
  "fugen": [144, 160, 176, 192, 208],
  "kachel": 16,
  "kacheln": [[1, 1], [18, 1], …],
  "karten": [
    { "ebene": "himmel", "name": "himmel", "parallax": 0.5, "deckkraft": 1,
      "x": 0, "y": -128, "spalten": 25, "zeilen": 9,
      "kacheln": [[0, 1, 2, …], …] },
    { "ebene": "wand", … }, { "ebene": "boden", … }
  ],
  "bilder": [
    { "name": "frachtcontainer", "ebene": "wand", "folge": 1, "parallax": 1, "deckkraft": 1,
      "x": 330, "y": -70, "b": 80, "h": 75, "dauer": 0, "bilder": [{ "x": 1, "y": 239 }] },
    { "name": "kabelrollen1", "ebene": "vordergrund", "folge": 1, "parallax": 1, "deckkraft": 0.85,
      "x": 96, "y": 72, "b": 80, "h": 24, "dauer": 0, "bilder": [ … ] }
  ]
}
```

- `kacheln[n]` = linke obere Ecke der Kachel n im Blatt (16 × 16).
- `karten[i].kacheln[r][s]` = Kachel der Zelle in Zeile r, Spalte s oder
  −1; die Zelle liegt bei Welt-x `x + 16·s`, Welt-y `y + 16·r` (beim
  Himmel Himmels-x: Bildschirm-x = x + 16·s − ⌊K/2⌋).
- `bilder[j]`: freies Bild der Größe b × h mit linker oberer Ecke bei
  (x, y) in Welt-x und Welt-y; `bilder[j].bilder[i]` = Lage des Bildes i
  der Folge im Blatt; `dauer` Frames je Bild (0 = statisch), Bild i =
  ⌊Frame / dauer⌋ mod Anzahl (Frame = `welt.frame`, nur Darstellung).
- `band` und `fugen` dienen der Prüfung und der Debug-Anzeige:
  `kanteY` = Welt-y der ersten Bodenzeile, `untenY` = Welt-y von z unten,
  Tiefe am Boden z = 234 − Welt-y.

**Zeichnen** (Phase 3, G7; die Kontaktbögen setzen genau so zusammen,
`zusammensetzen` in `blatt_hg.ts`):

1. Für die Ebenen `himmel`, `wand`, `boden` nacheinander: zuerst alle
   Karten dieser Ebene aus allen Blättern (A, B, F), dann alle freien
   Bilder dieser Ebene aus allen Blättern nach `folge` (bei Gleichstand
   Blatt A, B, F, dann Reihenfolge der Liste). Der Container (Blatt A,
   x 330 bis 410) liegt so über der Wandkarte von B. Gezeichnet werden
   nur Zellen mit Bildschirm-x von −15 bis 383; einfacher ist, jede Karte
   beim Laden einmal in eine eigene Zeichenfläche (16·spalten ×
   16·zeilen) zu setzen und je Bild den sichtbaren Ausschnitt zu kopieren.
2. Schatten und Objekte wie heute.
3. Ebene `vordergrund` wie Schritt 1 mit `globalAlpha` = `deckkraft`
   (0,85). Die Bilder selbst sind voll deckend.
4. Der Himmel wird nicht beschnitten: Wand und Boden von B und F sind an
   jedem Pixel deckend und überdecken ihn; bei jeder Kamera-x der Scheibe
   ist das Bild ohne Lücke (Test).
5. Blende (`hintergrund_blende.json`): bei Deckung d = `anzeige(welt).blende`
   (0 bis 28) wie heute die Szene mit `BLENDE_DUNKEL` (Schwarz, Deckkraft
   d/28) abdunkeln; zusätzlich ein voll dunkles Feld ab Bildschirm-x
   F = 400 − ⌊400 · d / 28⌋ bis zum rechten Rand und links davon auf
   x F − 16 bis F − 1 die Kantenkachel (Bayer 4 × 4, Deckung von 0/16 in
   Spalte 0 bis 15/16 in Spalte 15) 14-mal untereinander. Das Dunkel
   schiebt sich beim Schließen von rechts ins Bild und zieht sich beim
   Öffnen nach rechts zurück; die Anzeigeleiste bleibt darüber.

**Farben je Abschnitt** (Hintergrundtreppe nach 1.2; Ton 0 bis 4; dazu
durchsichtig):

| Blatt | Farben | Materialien (Töne) |
|---|---|---|
| `hintergrund_a` | 43 | `NACHTHIMMEL` 1–4, `KOMETENSCHWEIF` 0–4, `EISWAND` 0–4, `ROST` 0–4, `EISBETON` 0–4, `REIF` 0–3, `FASSADE_STAHL` 0–4, `WARN_GELB` 1–3, `KABEL` 0–4, `NEON_CYAN` |
| `hintergrund_b` | 40 | `EISWAND` 0–4, `ROST` 1–4, `REIF` 0–2, `GUSSPLATTE` 0–3, `FASSADE_STAHL` 0–4, `WAND_LADEN` 0–4, `WARN_GELB` 1–3, `KABEL` 0–2, `NEON_SCHEIN` 0, 1, 2, 4, `NEON_MAGENTA`, `NEON_CYAN`, `BRILLE_GLUT` |
| `hintergrund_f` | 28 | `ROST` 1–4, `WARN_GELB` 0–3, `KAMMER_STAHL` 0–4, `REGAL` 0–4, `LICHT_KALT` 0, 1, 3, `ASSERVAT_HOLZ` 0–4, `NEON_CYAN` |
| `hintergrund_blende` | 2 | `BLENDE_DUNKEL` |

Bodentöne: A `EISBETON` 0–4 und `REIF` 0, 1, 3; B `GUSSPLATTE` 0–3 und
`NEON_SCHEIN` 0; F `KAMMER_STAHL` 0–4. Keiner kommt in einer
Figurenpalette vor (Prüfung „Bodenfarbe“ gegen alle Treppen der
Figurmaterialien, `KONTUR`, `SCHATTEN_BLAU`, die Leuchttöne und die
gebauten Figurenblätter). Neu in `palette.ts` (angehängt): `NEON_SCHEIN`
`#B84AA6`, `ASSERVAT_HOLZ` `#7E5E3E` (beide Hintergrundtreppe) und
`BLENDE_DUNKEL` `#000000` (G5-2).

**Prüfungen** (`hintergrundPruefen`, jede Verletzung ein Befund und
Abbruch in `bauen.ts`): Farbzählung ≤ 48 je Blatt einschließlich
durchsichtig; nur Farben aus den Hintergrundtreppen und Leuchttönen;
Bodenfarbe (oben); Lage der Karten (x0 des Abschnitts, Kachelraster,
Parallaxe) und der freien Bilder gegen die Sätze `hintergrund` und
`vordergrund` (Lage, Größe, Ebene, Deckkraft 0,85); Band (je Spalte Boden
genau von der Oberkante bis zur Unterkante, Wand nur darüber). Die Tests
prüfen zusätzlich die Fugen (jede Fugenzeile zu mindestens 80 % in Ton 0,
die Oberkante zu 95 %), die lückenlose Deckung bei jeder sechsten
Kamera-x beider Kamerabereiche, den Atlas (keine doppelte Kachel, Karte
aus dem Blatt gleich der Zeichnung, JSON gleich dem Atlas), die
Blendenkante und den Determinismus.

**Schilderschrift.** 5 × 7 als Bitmuster in `werkzeug.ts` (nur die
Zeichen der Schilder), wahlweise fett (jede Glyphe 1 px breiter); die
Neonschrift ist dieselbe Schrift doppelt groß. Die Anzeigeschrift von G6
(4.9) ist eine eigene Schrift; die doppelten Glyphen sind gewollt (G5-6).

### 4.9 Anzeige und Schrift (G6, Phase 2)

Quellen `spiel/grafik/quelle/schrift.ts` (Bitmuster der Schrift) und
`anzeige.ts` (Bilder, Blatt, Atlas, Prüfung, Kontaktbögen und eine
Zeichenvorlage für den Einbau; `anzeigeErzeugnisse()`), Blatt
`spiel/grafik/ausgabe/anzeige.png` (324 × 174) mit `anzeige.json`,
Kontaktbögen `docs/bilder/kontakt_anzeige.png` (alle Zeichen beider
Größen auf dunklem und hellem Grund, Mustertexte auf drei Gründen, Balken,
Lebenssymbol, Pfeil, nachgestellte Leiste 384 × 32, alles 2×) und
`kontakt_anzeige_bild.png` (ganzes Bild 384 × 224 mit Leiste, STAGE CLEAR
und Pfeil zur Einordnung, 2×), Tests `spiel/tests/grafik_anzeige.test.ts`.
Im Einbau (Phase 3) ersetzt die Schrift `SCHRIFT_5X7` aus
`src/darstellung/schrift.ts` (Leiste, große Texte, Hinweis „AUFZ“); die
Debug-Anzeige (F1) behält `SCHRIFT_3X5`. `src/darstellung/schrift.ts`
bleibt bis dahin unverändert.

**Schrift.** Eine Schrift in zwei Größen im Stil eines Automaten um 1991:
senkrechte Striche 2 px, waagrechte 1 px, Innenräume 3 px, alle Zeichen
gleich breit (Ziffern stehen spaltengenau untereinander), dunkle
Schattenkante unten rechts und 1 px Umriss, damit sie auf dunklem und
hellem Grund lesbar ist (G6-1).

| | klein | groß |
|---|---|---|
| Zelle (Körper und Schatten) | 8 × 8 | 16 × 16 |
| Körper | 7 × 7, Bitmuster von Hand (`GLYPHEN_8`) | 14 × 14, Scale2x der kleinen (`GLYPHEN_16`, G6-2) |
| Schatten in `KONTUR` | 1 px nach rechts unten | 1 und 2 px nach rechts unten |
| Umriss in `KONTUR` | 1 px um Körper und Schatten | ebenso |
| Farbe des Körpers | `LEISTE_TEXT` | Bänder: Zeilen 0–4 `LEISTE_TEXT`, 5–9 `BALKEN_GELB`, 10–13 `BALKEN_ORANGE` (G6-3) |
| Bild im Blatt | 10 × 10, Anker (1, 1) = linke obere Ecke der Zelle | 18 × 18, Anker (1, 1) |
| Laufweite | 8 | 16 |
| Zeilenhöhe | 12 (Name Zeile 6, Leben Zeile 18, Welt 10.1) | 20 (wie `GROSS_ZEILE` in `masse.ts`) |

Zeichenvorrat, 50 Zeichen in der Reihenfolge von Blatt und Atlas: `A` bis
`Z`, `Ä Ö Ü`, `0` bis `9`, `. , : ! ? - + / '`, Leerzeichen (leeres Bild,
nur Vorschub) und Pfeil nach rechts (Schlüssel `→`). Einzelheiten: Null
mit Schrägstrich (unterscheidet sich vom O), Umlaute mit zwei Punkten zu
2 px über einem 5 Zeilen hohen Buchstaben, I, T, Y, 1 und die Satzzeichen
in 6 Spalten mit mittigem Stamm, `-` 2 Zeilen dick, `→` mit 1 px Schaft
und Spitze über 7 Zeilen. Kleinbuchstaben gibt es nicht (G6-9).

**Farben** (`LEISTE_FARBEN`; 7 plus durchsichtig = 8 = `FARBBUDGET.anzeige`,
alle genutzt):

| Farbe | Wert | Verwendung |
|---|---|---|
| `KONTUR` | `#140E22` | Schatten, Umriss, Balkenrahmen, Auge des Symbols |
| `LEISTE_TEXT` | `#E8ECF4` | kleine Schrift, oberes Band der großen Schrift und des Pfeils |
| `BALKEN_GRUEN` | `#4CCF5A` | Lage 1 |
| `BALKEN_GELB` | `#F2D23A` | Lage 2, mittleres Band, Glanz im Haar des Symbols |
| `BALKEN_ORANGE` | `#F08A30` | Lage 3 und höher, unteres Band, Haar des Symbols |
| `BALKEN_LEER` | `#1A1F2C` | leerer Teil des Balkens |
| `HAUT_HELL` 2 | `#E8B189` | Gesicht des Lebenssymbols (G6-7) |

**Balkenbausteine** (je 1 × 8 px, Anker (0, 1) = oberste Füllzeile):

| Baustein | Pixel von oben nach unten | Atlas |
|---|---|---|
| Füllspalte Lage n (n = 1, 2, 3) | `KONTUR`, 6 × Lagenfarbe, `KONTUR` | `balken.lagen[n − 1]` |
| Leerspalte | `KONTUR`, 6 × `BALKEN_LEER`, `KONTUR` | `balken.leer` |
| Rahmen links, Rahmen rechts | durchsichtig, 6 × `KONTUR`, durchsichtig (runde Ecken) | `balken.rahmen_links`, `balken.rahmen_rechts` |

Regel nach Welt 10.1 mit `balken(lp)` aus `src/kern/rahmen.ts` (das
`Balken` in `anzeige(welt)`): Rahmen links in Spalte x0 − 1; für
i = 0 … 71 in Spalte x0 + i die Füllspalte der Lage `lage`, wenn
i < `breite`, sonst die der Lage `unterlage`, wenn `unterlage` > 0, sonst
die Leerspalte; Rahmen rechts in Spalte x0 + 72; jeweils der Anker auf
(Spalte, zeile0). Lage n nimmt `balken.lagen[min(n, 3) − 1]`, über Lage 3
bleibt es orange (wie `zeichnen.ts` heute, G6-8). Die Bausteine sind in x
einfarbig, `drawImage` darf sie auf eine Zielbreite n strecken (ein
Aufruf je Lauf statt je Spalte). Beispiel Boss mit 100 LP (Welt 7.1):
28 px gelb über 72 px grün.

**Lebenssymbol** 8 × 8 (`leben`, Bitmuster `LEBEN_MUSTER`): Velas Kopf im
Profil nach rechts, Haar orange mit gelbem Glanz, Gesicht in Haut, Auge
1 × 2 in `KONTUR`, der Pferdeschwanz hängt hinten bis unter das Kinn.
Anker (0, 0). Die Zahl der Leben steht `leben.zahlDx` = 10 px rechts vom
Symbol in der kleinen Schrift (G6-5).

**Pfeil „weiter“** 37 × 17 (`pfeil`, Anker (0, 0) auf x 340, Zeile 96 nach
Welt 10.1): Schaft 16 px lang und 6 px hoch, Spitze über 14 Zeilen,
Bänder wie die große Schrift, Schatten 1 px und Umriss 1 px in `KONTUR`
(Vieleck, G6-6). Das Blinken ist eine Regel, kein zweites Bild: „an“ =
`pfeil` zeichnen, „aus“ = nichts zeichnen; der Kern schaltet
`anzeige(welt).pfeil` 16 Frames an und 16 aus (KA5, `kamera.ts`
`PFEIL_TAKT`).

**Große Texte** als fertige Bilder (Entscheidung G6-4), Schlüssel = Text:
`PAUSE`, `STAGE CLEAR`, `GAME OVER`, `BALLAST BESIEGT`, `5000` und
`BALLAST BESIEGT 5000` (die Zeile, wie `anzeige(welt).texte` sie liefert).
Jedes Bild sind die Zeichen der großen Schrift mit Laufweite 16 gesetzt,
n · 16 + 2 px breit (längstes 322), 18 px hoch, Anker (1, 1). Andere
Texte setzt man aus den Zeichen der großen Schrift; das Ergebnis ist
pixelgleich (Test).

**Atlas `anzeige.json`** (Rechtecke im Blatt in px; Anker wie Auftrag 4,
2.3: der Pixel (ankerX, ankerY) des Bildes fällt auf die Zielposition; je
Teil eine Zeile, feste Schlüsselfolge):

```json
{
  "blatt": "anzeige.png",
  "farben": 8,
  "schriften": {
    "klein": {
      "zelle": 8, "laufweite": 8, "zeilenhoehe": 12, "schatten": 1, "umriss": 1, "ersatz": "?",
      "zeichen": {
        "A": { "x": 1, "y": 1, "b": 10, "h": 10, "ankerX": 1, "ankerY": 1 },
        … alle 50 Zeichen, Schlüssel = Zeichen (" " Leerzeichen, "→" Pfeil)
      }
    },
    "gross": { "zelle": 16, "laufweite": 16, "zeilenhoehe": 20, "schatten": 2, "umriss": 1, "ersatz": "?", "zeichen": { … 18 × 18 } }
  },
  "balken": {
    "breite": 72, "hoehe": 6,
    "rahmen_links": { … }, "rahmen_rechts": { … },
    "lagen": [ { grün }, { gelb }, { orange } ],
    "leer": { … }
  },
  "leben": { "x": …, "y": …, "b": 8, "h": 8, "ankerX": 0, "ankerY": 0, "zahlDx": 10 },
  "pfeil": { "x": …, "y": …, "b": 37, "h": 17, "ankerX": 0, "ankerY": 0 },
  "texte": { "PAUSE": { …, "ankerX": 1, "ankerY": 1 }, … }
}
```

**Zeichnen im Einbau.** `anzeige.ts` enthält eine Vorlage, die genau so
aus Blatt und Atlas zeichnet (`teilZeichnen`, `textSetzen`,
`balkenSetzen`, `leisteSetzen`, `pfeilSetzen`, `grosseTexteSetzen`); die
Kontaktbögen entstehen damit.

- Teil t an (x, y): `drawImage(blatt, t.x, t.y, t.b, t.h, x − t.ankerX, y − t.ankerY, t.b, t.h)`.
- Text in Schrift s ab (x, y) = linke obere Ecke der ersten Zelle: Zeichen
  i an (x + i · s.laufweite, y), von links nach rechts (der Körper eines
  Zeichens überdeckt den Umriss des vorigen); vorher groß schreiben,
  fehlende Zeichen durch `s.ersatz`. Breite = Zeichenzahl · Laufweite; der
  Umriss ragt 1 px links und oben über die Zellen, Schatten und Umriss
  rechts und unten liegen in der Zelle plus 1 px.
- Große Texte: waagrecht mittig, x = ⌊(384 − n · 16) / 2⌋, Zeilen im
  Abstand 20, der Block senkrecht mittig wie heute
  (`zeichneGrosseTexte`); fertige Bilder aus `texte`, sonst gesetzt. Den
  dunklen Textkasten von heute braucht der Umriss nicht mehr.

**Lagen und Zuordnung** (Welt 10.1 und 10.3 bis 10.5; Zahlen aus `werte.ts`
`ANZEIGE`; nachgestellt in `kontakt_anzeige.png`, untere drei Zeilen):

| Zustand (`anzeige(welt)`, Darstellung) | Teil | Lage des Ankers | Bild nach Uhr |
|---|---|---|---|
| `name` („VELA“) | kleine Schrift | x 8, Zeile 6 | statisch |
| `punkte` (8 Ziffern) | kleine Schrift | x 48, Zeile 6 (bis x 111) | statisch |
| `leben` | `leben`, dann die Zahl in kleiner Schrift | Symbol x 8, Zeile 18; Zahl x 18, Zeile 18 | statisch |
| `figur` | Balkenbausteine | Füllung x 48 bis 119, Zeilen 18 bis 23; Rahmen x 47 und 120, Zeilen 17 und 24 | im Frame der Änderung |
| `gegner.name` | kleine Schrift | x 200, Zeile 6 (längster Name RAMMBOCK bis x 263) | statisch |
| `gegner.balken` | Balkenbausteine | Füllung x 200 bis 271, Zeilen 18 bis 23 | im Frame der Änderung |
| `pfeil` = true / false | `pfeil` / nichts | x 340, Zeile 96 | der Kern blinkt (16 an, 16 aus) |
| `texte` (STAGE CLEAR, BALLAST BESIEGT 5000, GAME OVER), Pause | `texte[…]` | mittig, Zeilenhöhe 20 | statisch |
| `blende` | keine Bilder von G6; Abdunkeln wie heute, die Rasterkante liefert G5 | – | – |

Die Leiste belegt die Zeilen 5 bis 26 und x 7 bis 272; Name und Punkte,
Symbol und Zahl, Zahl und Balken berühren sich nicht (Test). Aktive Bilder
gibt es nicht.

**Prüfung** (`anzeigePruefen`; Befunde brechen `npm run grafik` ab): Farben
des Blatts höchstens 8 und nur aus `LEISTE_FARBEN`; Kontur geschlossen und
keine Streupixel je Zeichen beider Größen, Symbol, Pfeil und großem Text;
Maße (Zeichenbilder 10 × 10 und 18 × 18, Pfeil 37 × 17, Texte höchstens
384 breit); Balken für 72, 40, 7, 1, 0, 100, 144 und 150 LP aus den
Bausteinen gesetzt und Spalte für Spalte gegen `balken(lp)` geprüft
(einschließlich Streupixel). Umriss im Stand und Fußkontakt entfallen.

## 5. Umsetzer für Bildblätter

Seit Auftrag 5 (Phase 1, U2) gilt die Fassung v2 (5.8): Palette je Figur per
Medianschnitt statt der Materialtreppen, doppelte Darstellung, Kontur aus
dunklem Ton, Fußkontakt beim Gehen, Blätter `<figur>_grok`. Die Abschnitte
5.1 bis 5.7 beschreiben die Fassung v1 (G0b); was 5.8 nicht ändert
(Freistellen, Zellen, Zuordnung, Dateien), gilt weiter.

Stand G0b (Phase 1). `spiel/grafik/quelle/umsetzer.ts` macht aus
Bildblättern eines fremden Werkzeugs (Grok, Auftrag 4, 9.3, Weg C) Sprites
im Atlas-Format (Auftrag 4, 2.3). Er läuft deterministisch unter Node,
ohne Pakete, und nutzt den Werkzeugkasten aus Abschnitt 2: PNG lesen
(`png.ts`), Abstand (`farbe.ts` `farbAbstand`), Palette (`palette.ts`
`MATERIALIEN`, `naechsteFarbe`, `KONTUR`, `FARBBUDGET`), Kontur
(`kontur.ts` `randFaerben`, `streupixel`, `streupixelEntfernen`), Blatt
und Atlas (`blatt.ts`), Kontaktbögen (`kontakt.ts`) und die Prüfungen der
Gliederpuppe (`bauen.ts` `figurPruefen`). Eigene Kopien davon enthält er
nicht.

### 5.1 Ablauf

1. **Hintergrund**: Median je Kanal über vier Eckfelder zu 4 × 4 px.
   Weichen die Ecken stärker als die Hintergrundtoleranz voneinander ab,
   ist das ein Befund („Hintergrund nicht einfarbig“). Ein durchsichtiger
   Grund (RGBA) wird über die Deckkraft erkannt.
2. **Freistellen**: Abstand jedes Pixels zur Hintergrundfarbe
   (`farbAbstand`). Bis zur Hintergrundtoleranz Hintergrund, ab der
   Figurtoleranz Figur, dazwischen Randpixel. Randpixel übernehmen in
   Durchgängen die Klasse der Mehrheit ihrer entschiedenen acht Nachbarn
   (außerhalb des Blatts zählt als Hintergrund). Ein Randpixel, das Figur
   wird und am Hintergrund liegt, bekommt die häufigste Farbe seiner
   Figurnachbarn (Kantenglättung entfernt). Eines im Inneren behält seine
   Farbe (Innenlinien, dunkle Flächen). Gleichstand nach allen Durchgängen:
   Abstand über der Mitte beider Toleranzen ist Figur. Danach
   **Schließen** (G0b-10): Dehnen und Schrumpfen der Maske mit einem
   Quadrat von 2r + 1 px (r = `schliessen`). Lücken bis 2r px zwischen
   Figurteilen werden Figur und behalten ihre Farbe. Grok zeichnet
   Innenlinien genau in der Hintergrundfarbe (Rammbock: Linie zwischen Hose
   und Stiefel 6 px breit, Abstand zum Grund 4 bis 9), ohne Schließen
   zerfällt die Figur. Breitere Lücken (zwischen Arm und Rumpf) und der
   Außenrand bleiben. Ergebnis: Maske ohne Halbtransparenz.
3. **Zellen**: Flutfüllung über die Maske (8er-Nachbarschaft). Ein Bereich
   ist groß, wenn sein Rechteck mindestens 1/50 der Blattfläche misst oder
   mindestens 1/4 des größten Rechtecks (G0b-1). Kleine Bereiche, deren
   Rechteck das einer großen Zelle schneidet, gehören zu ihr (G0b-2), die
   übrigen werden verworfen (Nummern, Staub) und mit Lage protokolliert.
   Reihenfolge: nach der Mitte in y sortiert. Eine Zelle gehört zur
   laufenden Blattzeile, solange ihre Mitte über deren Unterkante liegt.
   In der Zeile gilt die Reihenfolge von links nach rechts, Nummern ab 1.
   **Festes Raster** (Zeile `raster` in `quelle.txt`): Spalten × Zeilen
   gleich groß über das ganze Blatt. Je Feld gilt die größte Komponente
   samt den Komponenten, die ihr Rechteck schneiden. Die Zellnummer ist
   die Feldnummer, leere Felder werden gemeldet.
4. **Grundlinie**: Je Blattzeile ist der Median der Unterkanten die
   Grundlinie. Eine Zelle, die mehr als 1/50 der Zeilenhöhe davon
   abweicht, ist ein Befund (Luftposen sind das zu Recht).
5. **Maßstab**: ein Faktor je Figur aus der Zelle `massstab` (Pose
   „Stand“): Rohfaktor Zielhöhe / Zellhöhe. Deckung und Rundung können oben
   oder unten eine Zeile kosten. Deshalb sucht eine Halbierung im Bereich
   ±1,5 Zeilen den kleinsten Faktor, bei dem der verkleinerte Stand genau
   die Zielhöhe hat (G0b-3). Derselbe Faktor gilt für alle Blätter,
   außer ein Blatt hat eine Zeile `massstab <blatt> <zelle> wie <blatt>
   <zelle>` (G0b-11): Dann bekommt es den Faktor, mit dem seine Zelle so
   hoch wird wie die verkleinerte Bezugszelle (dieselbe Pose auf einem
   Blatt mit bekanntem Faktor).
6. **Verkleinern** mit Flächenmittel: Jeder Zielpixel deckt
   1/Faktor × 1/Faktor Quellpixel. Ab einer Deckung von 1/2 wird er
   deckend, mit dem flächengewichteten Mittel der deckenden Quellfarben
   (gerundet), sonst durchsichtig. Unterkante und linke Kante der Zelle
   liegen auf dem Raster, damit die Fußzeile ganz bleibt. Danach werden
   Inseln unter 4 px entfernt.
7. **Palette** über alle Bilder der Figur: Kandidaten sind je Material
   der Figur die Töne 0 bis 3, bei glänzendem Material auch 4, dazu
   `KONTUR`. Jede Quellfarbe geht auf die nächste Stufe
   (`naechsteFarbe`). Sind mehr als 15 Stufen belegt (`KONTUR` zählt immer,
   weil die Außenkontur sie setzt), wird die am wenigsten belegte
   gestrichen (Gleichstand: die spätere) und neu abgebildet, bis das Budget
   passt. Protokolliert wird je Quellfarbe: Zielstufe, Abstand, Pixelzahl.
   Abstände über 72 sind ein Befund.
8. **Kontur**: `KONTUR` im Inneren (alle Kantennachbarn deckend) wird zum
   Ton 0 des häufigsten Nachbarmaterials, sofern dieser zur Palette
   gehört; Innenlinien, die schon im Ton 0 liegen, bleiben. Dann wird der
   äußerste deckende Ring in `KONTUR` umgefärbt (`randFaerben`, die Figur
   wird nicht größer), dann werden Streupixel entfernt
   (`streupixelEntfernen`, `KONTUR` geschützt, Glanztöne ausgenommen).
   Reste, die nur `KONTUR` als Nachbarn haben, werden `KONTUR`. Ein
   `KONTUR`-Pixel im Inneren ohne `KONTUR`-Nachbarn nimmt die
   Mehrheitsfarbe an.
9. **Anker**: y ist die unterste Zeile der Figur. x ist die Mitte zwischen
   dem linken und dem rechten deckenden Pixel im Fußband (die untersten
   1/8 der Figurhöhe), abgerundet. Bei liegenden Posen (`liegend`) ist x
   die Mitte der Figur. Gespiegelte Bilder spiegeln den Anker mit.
10. **Zuordnung**: Ein Bild einer Animation löst sich so auf: zuerst das
    eigene Bild (`bild`), sonst eine Kopie (`gleich`, `ersatz`; deren
    Quelle wird ebenso aufgelöst), sonst eine Wiederholung des nächsten
    vorherigen Bildes mit eigener Quelle, sonst des nächsten folgenden,
    sonst der Stand. Wiederholungen und `ersatz` sind Nachbestellungen,
    `gleich` ist gewollt. Kopien im Kreis sind ein Fehler.
11. **Prüfungen und Ausgabe**: wie bei der Gliederpuppe (5.4), dann
    `blattPacken` zum Blatt `<figur>.png` mit Atlas `<figur>.json`.

### 5.2 Parameter

Abstände in der Einheit von `farbAbstand` (gewichtetes RGB): Wird Grau in
allen Kanälen um n Stufen verschoben, ergibt das etwa 3n. Überschreibbar
je Figur mit `parameter <name> <zahl>` in `zuordnung.txt`.

| Parameter | Wert | Herkunft |
|---|---|---|
| `toleranzHintergrund` | 45 | etwa 15 Stufen je Kanal: Rauschen eines einfarbigen Grunds; die dunkle Außenlinie des Quellbilds (Konturviolett auf dunklem Grund, Abstand etwa 40) fällt darunter und wird neu gesetzt |
| `toleranzFigur` | 90 | etwa 30 Stufen je Kanal: dunkle Figurfarben wie Leder (Abstand etwa 110 auf Nachtblau) sind sicher Figur |
| `mindestAnteil` | 1/50 | Auftrag 4, 9.3 |
| `vergleichsAnteil` | 1/4 | G0b-1 |
| `deckung` | 1/2 | Auftrag 4, 9.3 (keine Halbtransparenz; die Hälfte ist die neutrale Schwelle) |
| `fussband` | 1/8 der Figurhöhe | Festlegung G0b: erfasst beide Füße auch beim angehobenen Fuß im Gehen |
| `befundAbstand` | 72 | etwa 24 Stufen je Kanal, rund zwei Drittel des Abstands zweier Treppentöne (etwa 0,11 bis 0,14 Helligkeit) |
| `mindestInsel` | 4 px | Streupixel im Sinn von 1.3 nach dem Verkleinern |
| `hoechstFarben` | 15 | `FARBBUDGET.figur` − 1 (durchsichtig) |
| `grundlinienToleranz` | 1/50 der Zeilenhöhe | Festlegung G0b |
| `durchgaenge` | 256 | größte Tiefe eines Randbereichs in Quellpixeln |
| `schliessen` | 4 px (Quelle) | G0b-10: schließt Innenlinien bis 8 px; bei Grok-Blättern um 2000 px sind sie 3 bis 6 px breit |
| `streuRunden` | 8 | Runden von `streupixelEntfernen` |

### 5.3 Dateien je Figur (`spiel/grafik/quelle/fremd/<figur>/`)

- Blätter `*.png` (von Opus abgelegt, Namen nach der Bestellliste).
- `quelle.txt` (Opus): Datum, Werkzeug, Prompt als freier Text.
  Ausgewertet werden nur Zeilen `raster <blatt.png> <spalten> <zeilen>`.
- `zuordnung.txt` (G0b, nach Sichtprüfung der Blätter gefüllt), je Zeile
  ein Satz, `#` beginnt einen Kommentar:

| Zeile | Bedeutung |
|---|---|
| `figur <name>` | Name von Blatt und Atlas, z. B. `rammbock_fremd` |
| `typ <Typ>` | Umriss aus `masse.ts`: Gegnertyp (`Rammbock`) oder `Figur` (Vela) |
| `zielhoehe <px>` | Höhe des Stands ohne Schatten (Rammbock 71 = 76 − 5) |
| `materialien <M> …` | Materialien aus `palette.ts` (Tabelle 5.5) |
| `massstab <blatt> <zelle>` | Zelle der Pose „Stand“ |
| `massstab <blatt> <zelle> wie <blatt> <zelle>` | Faktor eines weiteren Blatts über dieselbe Pose auf einem Blatt mit bekanntem Faktor (G0b-11) |
| `animation <name> schleife\|einmal <dauer> … [aktiv <i> …]` | Animation mit Richtwert der Dauer je Bild und aktiven Bildern |
| `bild <blatt> <zelle> <animation> <index> [liegend] [spiegeln]` | Zelle → Animation und Bildindex |
| `gleich <animation> <index> <von> <vonIndex> [spiegeln]` | gewollte Wiederholung |
| `ersatz <animation> <index> <von> <vonIndex> [spiegeln]` | Lücke, bewusst ersetzt, wird nachbestellt |
| `gehen <animation> <WERT>` | Fußkontakt prüfen mit der Gehgeschwindigkeit `WERT` aus `werte.ts` |
| `parameter <name> <zahl>` | Parameter aus 5.2 überschreiben |

Aufruf im Ordner `spiel/`:

```
node --experimental-strip-types grafik/quelle/umsetzer.ts grafik/quelle/fremd/rammbock --kontakt ../docs/bilder
```

`npm run grafik` baut die Ordner aus `FREMD_ORDNER` (`bauen.ts`) mit,
zusammen mit den Gliederpuppen, samt Kontaktbögen und
`vergleich_rammbock.png`. Einzeln aufgerufen schreibt der Umsetzer
`grafik/ausgabe/<figur>.png` und `.json` (mit `--aus` ein anderer Ordner)
und mit `--kontakt` die Kontaktbögen
`kontakt_<figur>_<animation>.png`. Auf die Standardausgabe gehen das
Protokoll als Markdown (Blätter, Palette mit Abständen je Stufe,
Quellfarben über 72, Nachbestellungen, Befunde) und das MD5 des Blatts.
Das Exit-Ergebnis ist 1 bei harten Befunden.

### 5.4 Prüfungen

Es gelten dieselben Prüfungen wie bei der Gliederpuppe (`figurPruefen`,
2.5), im Umsetzer und noch einmal in `bauen()`. Die Figur trägt
`weich` = {Umriss im Stand, Fußkontakt}; `npm run grafik` meldet diese
Befunde als Hinweis und bricht nur bei harten ab. **Hart** (Exit 1): Kontur geschlossen, Streupixel, Farbzählung je
Bild und je Figur, Anker im Bild, aktive Indizes. **Befund** (G0b-4):
Umriss im Stand, Fußkontakt je Zeile `gehen` (Schritt =
Gehgeschwindigkeit × Dauer des ersten Bildes). Dazu kommen als Befunde:
Hintergrund nicht einfarbig, Grundlinie, Zellen über dem Umriss (liegend
gegen den gedrehten Umriss), Stand nicht genau auf Zielhöhe und Anteil
der Pixel über dem Befundabstand.

### 5.5 Materialien je Figur

| Figur | Materialien | Kandidaten |
|---|---|---|
| Rammbock | `HAUT_MITTEL`, `WESTE_OLIV`, `HOSE_BRAUN`, `STAHL` (glänzend), `LEDER` | 4 + 4 + 4 + 5 + 4 Töne und `KONTUR` = 22, davon höchstens 15 belegt |

Der Bart (in Auftrag 4, 4 genannt) hat kein eigenes Material in der
Liste; er fällt auf die dunklen Töne von `LEDER` oder `HOSE_BRAUN`. Soll
er `HAAR_DUNKEL` tragen, gehört es in die Zeile `materialien`; das kostet
eine Stufe aus dem Budget.

### 5.6 Grenzen

- Nur PNG mit 8 Bit (Farbtypen aus `png.ts`). JPEG oder Bilder mit
  Zeilensprung muss Opus vorher umwandeln (ohne Pakete nicht im Umsetzer).
- Ein einfarbiger Grund wird vorausgesetzt. Bei Verlauf oder Vignette
  zeigt der Befund „Hintergrund nicht einfarbig“ das an; dann
  `toleranzHintergrund` erhöhen oder das Blatt nachbestellen.
- Ein gezeichneter Bodenschatten, der sich farblich vom Grund abhebt, wird
  Teil der Figur und verschiebt Fußpunkt und Maßstab. Er gilt als Befund
  der Sichtprüfung, und das Blatt wird ohne Schatten nachbestellt.
- Ein Teil der Figur, das außerhalb ihres Rechtecks frei schwebt
  (abgetrennte Faust, Bewegungslinien), wird wie eine Nummer verworfen.
  Ein Staubkorn im Rechteck einer Figur wird angeschlossen; im
  Zielmaßstab verschwindet es über die Deckungsregel.
- Eine dunkle Fläche, die außen am Grund liegt und im Abstand zwischen den
  Toleranzen liegt (Stiefel ohne Außenlinie), kann von beiden Seiten
  angefressen werden. Dann `toleranzFigur` senken.
- Fremdfarben (Farbtöne ohne passendes Material) landen auf der nächsten
  Stufe und erscheinen im Protokoll als Befund. Sie werden nicht still
  korrigiert.
- Flächenmittel mischt an Teilgrenzen Zwischenfarben. Die Palette fängt
  sie auf, schmale Innenlinien können dabei verschwinden.
- Der Fußkontakt fremder Gehzyklen trifft die Geschwindigkeit der Logik
  nur zufällig. Er ist ein Befund, keine Korrektur.
- Das Schließen (G0b-10) füllt auch echte Spalten unter 2r px (eng
  stehende Beine, Achsel). Im Zielmaßstab sind sie unter 1 px breit und
  wären ohnehin verschwunden. Liegen zwei Figuren näher als 2r px
  beieinander, verschmelzen sie zu einer Zelle; dann `schliessen`
  verkleinern.

### 5.7 Stand Rammbock und Nachbestellungen

Fassung v1. Seit Auftrag 5 baut `npm run grafik` aus denselben Blättern
`rammbock_grok` (5.8); das Blatt `rammbock_fremd` und seine Kontaktbögen
entfallen. Die Nachbestellungen unten gelten weiter.

Stand 2026-10-03 (G0b): Die Grok-Blätter liegen unter
`spiel/grafik/quelle/fremd/rammbock/` (A Posen, B Gehen, C Angriffe,
D Reaktionen, E Griff; Konzeptbild nur als Referenz). `npm run grafik`
baut daraus `spiel/grafik/ausgabe/rammbock_fremd.png` (346 × 1017,
22 Animationen, 91 Bilder, MD5 `0aec056bbf47f89783e3adfeeeddf387`),
`rammbock_fremd.json`, die Kontaktbögen
`docs/bilder/kontakt_rammbock_fremd_<animation>.png` und
`docs/bilder/vergleich_rammbock.png`. Keine harten Befunde.

**Bildzahlen je Reihe** (vom Umsetzer gezählt, wie bestellt): A 4 + 4 + 4,
B 8, C 5 + 5 + 4 + 2, D 3 + 5 + 6 + 6, E 3. Nichts verworfen.
**Inhaltlich weicht die Sprungtritt-Reihe (C, Zellen 11 bis 14) ab:**
Bild 1 zeigt eine Kampfhaltung statt der tiefen Hocke, Bild 4 einen
Schlag im Stand statt der Landung in der Hocke. Bild 2 (Absprung) und
Bild 3 (frei in der Luft mit Knie) sind brauchbar.

**Maßstab**: Grok hat die Figur auf jedem Blatt anders groß gezeichnet
(Stand auf A 445 px, auf D 339 px, Festgehalten auf E 748 px). Deshalb hat
jedes Blatt einen eigenen Faktor über eine gemeinsame Pose (G0b-11):

| Blatt | Bezug | Faktor | geschlossen px |
|---|---|---|---|
| A Posen | Stand (Zelle 1) auf 71 px | 0,1596 | 75 229 |
| B Gehen | Zelle 1 wie A 2 (Schrittstellung) | 0,2302 | 29 740 |
| C Angriffe | Zelle 1 wie A 4 (Kampfhaltung) | 0,1680 | 98 420 |
| D Reaktionen | Zelle 14 wie A 1 (Stand) | 0,2094 | 74 009 |
| E Griff | Zelle 1 wie A 1 (Stand) | 0,0949 | 31 402 |

**Zuordnung** (`zuordnung.txt`): stand und haltung 0 = A1; gehen = B1 bis
B8; schlag_a (RA) = C1 bis C5; schlag_b (RB) = A4, A5, A6, Lücke, A4;
umwerfschlag (RU) = C6 bis C10; sprungtritt (RS) = C12, C13, dann die Hocke
C16 und C15 als Ersatz für die Landung; hocke_ankuendigung = C15, C16;
auftritt_hocke = A11; aufstehen_hocke = D12 bis D14; getroffen = D1 bis
D3; umgeworfen = D4 bis D8; liegen = D9; aufstehen = D9 bis D14; spott =
D15 bis D20; gehalten = E1; geworfen = E2, E3. Gewollte Wiederholungen:
gehen_schnell und auftritt_versteck = gehen, kampfhaltung = Hocke, wiegen
= spott, tot = umgeworfen + liegen. Nicht verwendet: A2, A3, A7 bis A10,
A12, C11, C14.

**Palettenprotokoll** (eine Palette über alle 50 verwendeten Zellen):

| Stufe | Farbe | Pixel | mittlerer Abstand | größter Abstand |
|---|---|---|---|---|
| HAUT_MITTEL:2 | #C98E68 | 5027 | 49,2 | 96,6 |
| HAUT_MITTEL:3 | #D6B493 | 1299 | 65,5 | 101,8 |
| WESTE_OLIV:0 | #151E0C | 1148 | 24,4 | 41,9 |
| WESTE_OLIV:1 | #3B4B21 | 4452 | 25,8 | 54,7 |
| WESTE_OLIV:2 | #6B7A3A | 1963 | 29,9 | 76,0 |
| HOSE_BRAUN:0 | #0D0605 | 251 | 17,5 | 24,5 |
| HOSE_BRAUN:1 | #3B231A | 10452 | 22,4 | 54,5 |
| HOSE_BRAUN:2 | #6A4A32 | 7439 | 23,5 | 57,7 |
| HOSE_BRAUN:3 | #8E6C46 | 5550 | 40,2 | 94,3 |
| STAHL:0 | #31334E | 1047 | 41,1 | 60,4 |
| STAHL:2 | #6F7C99 | 382 | 69,8 | 97,5 |
| LEDER:1 | #1C110E | 3179 | 18,5 | 35,6 |
| LEDER:2 | #4A3428 | 9292 | 22,6 | 53,5 |
| LEDER:3 | #6D533D | 3579 | 39,1 | 77,3 |
| KONTUR | #140E22 | 858 | 28,9 | 55,6 |

Gestrichen (Farbbudget): STAHL:4, STAHL:1, STAHL:3, WESTE_OLIV:3. Abstand
pixelgewichtet 29,9, größter 101,8; 0,9 % der Pixel liegen über 72
(438 Quellfarben, vor allem helle gelbliche Haut um #DCAE60 und
neutralgraue Knieschützer um #9A938A).

**Befunde**:

- Farbe: Grok malt die Haut gelblicher und heller als `HAUT_MITTEL`
  (mittlerer Abstand 49, Lichter 65). Die Knieschützer sind neutralgrau
  statt stahlblau. Nach der Abbildung wirkt die Figur dunkler und
  bräunlicher als auf den Blättern. Die Knieschützer behalten nur zwei
  Stahltöne, weil das Budget drei Stahlstufen streicht.
- Umriss: Der Stand ist 22 × 71 px (Gliederpuppe 47 × 70, Umriss 60 × 76).
  Grok zeigt den Rammbock streng von der Seite und schmal, nicht „breit
  mit Polsterweste“ (Auftrag 4, 1.4). Geworfen kopfüber ist 69 px hoch
  (Umriss 60, liegend gedreht geprüft).
- Fußkontakt: In 7 von 8 Bildwechseln von gehen rückt keine Sohle um
  6,4 px zurück. Der Grok-Gehzyklus ist kein gleichmäßiger Lauf auf der
  Stelle; im Spiel rutschen die Füße.
- Grundlinie: Abweichungen bei Luftposen (A7, A9, C13, D5, D6, E3) und
  beim Liegen (D8, 19 px tiefer); dazu stehen in der Sprungtritt-Reihe
  C11 und C14 24 px und auf E das Festgehalten (E1) 17 px tiefer als der
  Median ihrer Reihe. Grok hält die Grundlinie also nicht genau ein; der
  Anker liegt trotzdem je Bild an der untersten Zeile.
- Stil: Die vielen kleinen Details der Vorlage (Gesicht, Steppnähte der
  Weste) werden bei Faktor 0,1 bis 0,23 zu Flecken. Innenlinien werden
  über das Schließen zu Innenkonturen.

**Nachbestellungen** (fertige Prompts für Grok, im Projekt „Comet
Brawlers“, nach `docs/grafik-bestellung.md`):

1. Haltung (`haltung` 1 und 2 fehlen, ersetzt durch den Stand):

```text
Nur eine Reihe, genau 3 Bilder: der Rammbock in ruhiger Haltung im Stand,
atmend. 1 Stand wie im ersten Bild, 2 Brust und Schultern leicht gehoben
(einatmen), 3 Schultern leicht gesenkt (ausatmen). Die Füße stehen in
allen drei Bildern genau an derselben Stelle, Blick nach rechts.
Dieselbe Figur, dieselben Farben und Proportionen wie im ersten Bild,
Figur im Stand genau so groß.
```

2. Rückzug nach dem zweiten Schlag (`schlag_b` 3 fehlt, ersetzt durch den
   Schlag):

```text
Nur dieses eine Bild: der Rammbock zieht nach dem geraden Schlag die
Faust zurück, der Schlagarm halb gebeugt auf dem Weg zurück in die
Kampfhaltung, die andere Faust vor dem Kinn, Füße wie beim Schlag, Blick
nach rechts. Zwischenbild zwischen „Schlag“ und „Kampfhaltung“ aus
Blatt A. Dieselbe Figur, dieselben Farben und Proportionen wie im ersten
Bild, Figur im Stand genau so groß.
```

3. Landung nach dem Sprungtritt (`sprungtritt` 2 und 3 fehlen, ersetzt
   durch die Hocke; Bild 4 der Reihe zeigt einen Schlag im Stand):

```text
Nur eine Reihe, genau 2 Bilder, Landung nach dem Sprungtritt: 1 Aufsetzen
in tiefer Hocke, beide Füße auf dem Boden, Knie stark gebeugt, Oberkörper
vorgebeugt, Fäuste vor der Brust; 2 Aufrichten aus der Hocke, Knie noch
gebeugt, Fäuste erhoben. Blick nach rechts, Füße auf der Grundlinie.
Dieselbe Figur, dieselben Farben und Proportionen wie im ersten Bild,
Figur im Stand genau so groß.
```

4. Tiefe Hocke zum Absprung (Bild 1 der Sprungtritt-Reihe zeigt eine
   Kampfhaltung; zurzeit überbrückt die Hocke aus Reihe C4 das Bild,
   daher nur wünschenswert):

```text
Nur dieses eine Bild: der Rammbock in tiefer Hocke zum Absprung für einen
Sprungtritt, Knie stark gebeugt, Gewicht auf den Fußballen, beide Arme
nach hinten geschwungen, beide Füße auf dem Boden, Blick nach rechts.
Dieselbe Figur, dieselben Farben und Proportionen wie im ersten Bild,
Figur im Stand genau so groß.
```

Der Tod braucht keine eigenen Bilder (Auftrag 4, 3: umgeworfen, liegen,
Blinken). Beim Nachbestellen der Reihen 1 bis 3 sollte der Nutzer auf
gleiche Figurgröße achten; abweichende Größen gleicht `massstab … wie …`
aus.

**Vergleichsbild** `docs/bilder/vergleich_rammbock.png` (`vergleich.ts`):
Reihe 1 Grok-Rammbock (Stand, Gehen 0, 2, 4, 6, Schlag A im aktiven Bild,
getroffen 1), Reihe 2 derselbe Satz der Gliederpuppe (Blatt `rammbock`),
Reihe 3 Vela im Stand und im Trefferbild von kette1, alles 2×; darunter
Vela, Gliederpuppe und Grok-Rammbock in Spielgröße 1× und 2× auf dem
Platzhalter von Abschnitt A (Wand, Band 75 px, Kanten, Tiefenlinien,
Schatten in Farben und Maßen aus `masse.ts`).

### 5.8 Umsetzer v2 (Auftrag 5)

Stand 2026-10-03 (Auftrag 5, Phase 1, U2; E25, Abschnitt 0). Der Umsetzer
macht aus Grok-Blättern Sprites in Bildpixeln der doppelten Darstellung
(2 Bildpixel = 1 Spielpixel). Er gilt für alle Grok-Blätter; wo 5.1 bis 5.7
(Fassung v1) abweichen, gilt dieser Abschnitt. Dateien:
`spiel/grafik/quelle/umsetzer.ts` (Ablauf, Prüfungen, Ausgabe),
`spiel/grafik/quelle/medianschnitt.ts` (Palette). Abweichungen U2-1 bis
U2-14 in Abschnitt 7.

**Ablauf** (1 bis 3 wie v1, 5.1):

1. Hintergrund aus den Ecken, Freistellen, Schließen (G0b-10), dann
   **Löcher füllen** (U2-2): Ein vom Grund eingeschlossener Bereich wird
   Figur, wenn seine Pixel im Mittel weiter als `lochToleranz` vom Grund
   liegen (dunkle Fläche der Figur, Grok malt tiefe Schatten fast in der
   Grundfarbe). Echte Lücken (zwischen Arm und Rumpf) zeigen den Grund
   selbst und bleiben durchsichtig.
2. Zellen wie v1 (Flutfüllung oder Raster aus `quelle.txt`).
3. **Maßstab**: Zielhöhe = 2 × (Umrisshöhe − 5) Bildpixel samt Kontur
   (`zielhoeheFuer`: Rammbock 142, Vela 142, Bolzer 134, Zünder 134, Ballast
   190), gemessen an der Stand-Zelle; die Halbierungssuche (G0b-3) misst die
   Höhe samt nachgesetzter Kontur und sucht ±3 Zeilen. Ein Faktor je Figur;
   ein Blatt mit anderer Figurgröße wird über `massstab <blatt> <zelle> wie
   <blatt> <zelle>` neu kalibriert (G0b-11), am Stand, wo das Blatt einen
   hat; jede Neukalibrierung steht als Befund im Protokoll („Figur n % so
   groß wie auf …“). Verkleinern mit Flächenmittel, Deckung ab 1/2, Inseln
   unter 4 Bildpixeln weg.
4. **Palette je Figur** (Medianschnitt, keine Abbildung auf `palette.ts`):
   alle verkleinerten Bilder der Figur, Farben bis `toleranzHintergrund` an
   der Hintergrundfarbe eines Blatts vorher entfernt (U2-7). Geteilt wird
   die Kiste mit dem größten gewichteten Fehler entlang ihrer stärksten
   Achse (Rot 2, Grün 4, Blau 3) am gewichteten Median, bis 63 Farben;
   dann zwei Runden Nachschärfen. Jede Farbe geht auf die nächste
   Palettenfarbe (`farbAbstand`), ohne Raster. Jede Palettenfarbe ist ein
   pixelgewichtetes Mittel: Helligkeit und Sättigung bleiben (am Gehblatt
   gemessen: Abweichung unter 1,5 Helligkeitsstufen und 0,02 Sättigung).
5. **Streupixel** entfernen (U2-1): Ein Pixel steht allein, wenn keiner
   seiner acht Nachbarn ihm ähnlich ist (`farbAbstand` ≤ `streuAbstand`);
   er nimmt die häufigste Nachbarfarbe an.
6. **Kontur** (U2-3): Die Figur bekommt 1 Bildpixel Rand. Wo ein Pixel
   der Außenkante nicht dunkel ist (Helligkeit über `konturHelligkeit`),
   wird außen 1 Bildpixel im dunkelsten Ton der Figur (Palettenfarbe mit der
   kleinsten Helligkeit) gesetzt; dunkle Pixel der Außenkante sind die
   Kontur des Bildes und bleiben.
7. **Bodenton** (Auftrag 5, 4; U2-5): Kein Pixel im Inneren (nicht an der
   Außenkante) ist dunkler als der dunkelste Bodenton; zu dunkle werden um
   eine Stufe aufgehellt (nächste Palettenfarbe ab dem Bodenton), Befund
   mit Zahl. Danach noch einmal Streupixel, wobei die Außenkante nur
   dunkle und das Innere nur Farben ab dem Bodenton annehmen darf.
8. **Anker** (U2-11, Schnittstelle U1, `zeichner.ts`): Fußpunkt wie v1
   (unterste Zeile, x Mitte der Füße im Fußband, liegend Mitte der Figur).
   Im Atlas steht der linke obere Bildpixel des Spielpixels am Fußpunkt:
   `ankerX` = x, `ankerY` = unterste Zeile − 1. Die Darstellung legt ihn auf
   (2 · bildX, 2 · bildY) und spiegelt um 2 · bildX + 1, also um die Achse
   rechts neben der Ankerspalte; eine in der Zuordnung gespiegelte Zelle
   bekommt `ankerX` = Breite − 2 − `ankerX`.
9. **Fußkontakt beim Gehen** (U2-4): Für die erste Zeile `gehen` mit
   eigenen Bildern setzt der Umsetzer die Anker so, dass der Standfuß je
   Bild um die Gehstrecke zurückwandert (Geschwindigkeit aus `werte.ts` ×
   Dauer des ersten Bildes × 2: Rammbock 1,6 × 4 × 2 = 12,8 Bildpixel =
   6,4 Spielpixel; bei 1,75 px/Frame 14 = 7 Spielpixel). Füße sind die
   Läufe in den untersten 8 Zeilen mit einem Pixel in den untersten 3
   (Profil der Sohle bis 3 Bildpixel überbrückt). Der Standfuß wird über
   den ganzen Zyklus gewählt: derselbe Fuß, außer an genau zwei Übergaben
   zu einem Fuß vor dem alten; gewählt wird die Folge, bei der der Fuß
   relativ zur Körpermitte (Schwerpunkt der oberen 2/5 der Figur) am
   wenigsten von der Gehstrecke abweicht. Was über den Zyklus nicht aufgeht
   (der **Rest**), wird gleichmäßig auf die Bildwechsel verteilt; die Anker
   liegen im Mittel auf den Fußpunkt-Ankern. Weitere Zeilen `gehen` mit
   denselben Bildern (`gehen_schnell`) werden nur gemessen.
10. **Zuordnung** wie v1 (5.1, Punkt 10). Namen, Schleife, Dauern und aktive
    Bilder müssen denen des Gliederpuppen-Blatts derselben Figur gleichen
    (`bauen.ts` `grokGegenPuppe`, harter Fehler im Bau).
11. **Prüfungen** (`pruefeGrok`, nach E25). Hart: höchstens 64 Farben
    einschließlich durchsichtig über alle Bilder, Kontur geschlossen aus
    dunklem Ton (kein heller Pixel an der Außenkante), keine Streupixel
    (U2-1), Anker im Bild, aktive Indizes, kein Pixel im Inneren dunkler
    als der Bodenton. Weich (Befund): Umriss im Stand (Breite ≤ 2 ×
    Umrissbreite, Höhe = Zielhöhe), Zellen über dem 2×-Umriss, Grundlinie,
    Neukalibrierung je Blatt, Fußkontakt-Rest, Reichweite im Trefferbild.
12. **Ausgabe**: Blatt `<figur>.png` (Animationen setzen die Zeile fort,
    Breite bis 2048, U2-12) und Atlas `<figur>.json` wie Auftrag 4, 2.3 mit
    `"massstab": 2` auf oberster Ebene (`grokAtlasText`); Bilder, Maße und
    Anker in Bildpixeln. Kontaktbögen `docs/bilder/kontakt_<figur>_<animation>.png`
    in natürlicher Größe (nicht weiter vergrößert), Schrift 2×, Bodenlinie
    unter dem Fußpunkt-Spielpixel, Ankerkreuz auf der Spiegelachse.

**Parameter** (neu oder geändert gegenüber 5.2; überschreibbar mit
`parameter <name> <zahl>`):

| Parameter | Wert | Herkunft |
|---|---|---|
| `hoechstFarben` | 63 | E25: 64 Farben je Figur einschließlich durchsichtig (Zählung wie `FARBBUDGET`) |
| `nachschaerfen` | 2 | Runden nach dem Medianschnitt (Festlegung U2) |
| `streuAbstand` | 60 | etwa 20 Stufen je Kanal, rund eine Palettenstufe bei 63 Farben (U2-1); 60 und 90 ergeben am Stand sichtbar dasselbe |
| `lochToleranz` | 12 | Grund der Rammbock-Blätter ±5, Groks dunkle Innenflächen 14 bis 40 (U2-2) |
| `konturHelligkeit` | 40 | Helligkeit (Luma) der Sohlen und Schattenkanten des Rammbocks 25 bis 35; Haut, Weste und Hose liegen darüber (U2-3) |
| `kontaktBand` | 2 | Zeilen über der untersten mit Bodenkontakt (Fußkontakt) |
| `fussHoehe` | 8 | Bildpixel, Sohle und Spitze eines Stiefels bei 2× |
| `kontaktLuecke` | 3 | Bildpixel, Profil der Sohle |
| `koerperAnteil` | 2/5 | Kopf und Schultern als Körpermitte beim Gehen |
| `befundAbstand`, `materialien` | entfallen | keine Abbildung auf `palette.ts` |

**Dateien je Figur**: wie 5.3; `zuordnung.txt` ohne `materialien`, mit
`figur <name>_grok`, `zielhoehe` in Bildpixeln und neu `datum
<JJJJ-MM-TT>` (Stand der Lieferung). **Ordner**: `bauen.ts` baut jeden
Ordner unter `fremd/` mit einer `zuordnung.txt` (`FREMD_ORDNER`). Nennen
zwei Ordner dieselbe Figur (z. B. `fremd/rammbock/` in Seitenansicht und
später `fremd/rammbock_34/` in Dreiviertelansicht, beide `figur
rammbock_grok`), gewinnt der neuere: das spätere `datum`, bei gleichem
Datum der im Alphabet spätere Ordnername (U2-6); `npm run grafik` meldet,
welcher Ordner welchen ersetzt.

**Bau** (`bauen.ts`, ergänzt 2.3): `bauen()` baut erst die Gliederpuppen,
dann die Erzeugnisse, dann die Grok-Blätter mit dem dunkelsten Bodenton aus
den Hintergrundblättern desselben Baus, dann Übersicht, Vergleichsbild und
`spiel/grafik/ausgabe/blaetter.json` (alphabetische Liste aller gebauten
Blattnamen ohne Endung, JSON-Feld, je Name eine Zeile; die Darstellung nimmt
darüber `<name>_grok` statt `<name>`, U1-6). Neue Ausfuhren:
`fremdOrdnerLesen`, `FREMD_ORDNER` (gelesen statt fest), `grokOrdner`,
`grokErgebnisse`, `grokGegenPuppe`, `puppenName`, `grokAusgabeBytes`,
`BLAETTER_DATEI`, `blaetterText`; `vergleichBytes(gebaut, grok)`.
Entfallen: `fremdFiguren()` und das Blatt `rammbock_fremd` mit seinen
Kontaktbögen (Quelle und `zuordnung.txt` bleiben, jetzt für
`rammbock_grok`). Die Stilprüfungen der Gliederpuppe (Farbbudget 16,
`KONTUR`) gelten für Grok-Blätter nicht. Einzeln:
`node --experimental-strip-types grafik/quelle/umsetzer.ts
grafik/quelle/fremd/rammbock [--aus <ordner>] [--kontakt ../docs/bilder]`
schreibt Blatt und Atlas und gibt das Protokoll aus; der Bodenton kommt dabei
immer aus `spiel/grafik/ausgabe/`.

**Stand Rammbock** (Blätter in Seitenansicht aus Auftrag 4, erste Probe für
Haltepunkt 1): `spiel/grafik/ausgabe/rammbock_grok.png` (2006 × 434,
23 Animationen, MD5 `9d308520a0d5d93fee814743d7960f9c`, zwei Läufe gleich),
`rammbock_grok.json`, 23 Kontaktbögen
`docs/bilder/kontakt_rammbock_grok_<animation>.png`, Vergleichsbild
`docs/bilder/vergleich_rammbock.png` (U2-8). Keine harten Befunde.

| Blatt | Bezug | Faktor | Figur gegenüber A | Löcher gefüllt (px) / offen |
|---|---|---|---|---|
| A Posen | Stand (Zelle 1) auf 142 Bildpixel | 0,3135 | 100 % | 27 (5 522) / 8 |
| B Gehen | Zelle 1 wie A 2 (Schrittstellung) | 0,4588 | 68 % | 8 (2 739) / 3 |
| C Angriffe | Zelle 1 wie A 4 (Kampfhaltung) | 0,3293 | 95 % | 31 (5 695) / 6 |
| D Reaktionen | Zelle 14 wie A 1 (Stand) | 0,4115 | 76 % | 13 (2 231) / 9 |
| E Griff | Zelle 1 wie A 1 (Stand) | 0,1865 | 168 % | 19 (3 541) / 1 |

**Palette Rammbock**: 63 Farben aus 76 995 Quellfarben (3 854 im Bereich
des Grunds ohne Schnitt), Abstand pixelgewichtet 11,3, größter 85,7;
dunkelster Ton und Kontur `#201A13` (Helligkeit 27), hellster `#EFC87E`
(Hautlicht, 203). 2 320 Streupixel umgefärbt, 18 458 Konturpixel
nachgesetzt. Dunkelster Bodenton `#0F1016` (Helligkeit 16,4, Abschnitt F,
Tränenblech); kein Pixel musste aufgehellt werden, weil Groks fast schwarze
Innenlinien nach U2-7 auf den dunkelsten Ton gehen.

**Fußkontakt-Rest Rammbock**: `gehen` (12,8 Bildpixel je Bild) Rest −12,1
Bildpixel je Zyklus (−6,0 Spielpixel): Der Standfuß rutscht je Bild um etwa
0,75 Spielpixel nach hinten, das Grok-Bild schreitet also etwas weiter aus,
als der Rammbock läuft. Anker der acht Bilder um −16, 3, −1, 5, −11, 4, 12,
3 Bildpixel gegenüber dem Fußpunkt verschoben; der Körper ruckt dadurch
zwischen Bild 6 und 7 sichtbar vor (Groks Bild 8 steht weit vor seinem
Standfuß). `gehen_schnell` (dieselben Bilder, 12 Bildpixel je Bild) Rest
−18,5 Bildpixel (−9,3 Spielpixel) je Zyklus.

**Zuordnung Rammbock** (gegenüber 5.7 geändert, U2-10): Animationen,
Schleifen, Dauern und aktive Bilder wie `rammbock.json` (neu `schlag` =
`schlag_a`; `wiegen` als Schleife; Dauern von `aufstehen_hocke`,
`hocke_ankuendigung`, `umgeworfen`, `liegen`, `aufstehen`, `geworfen`,
`tot` wie die Gliederpuppe). `getroffen` = D2, D3, D1 (G2-15);
`kampfhaltung` = C1, C5 (Boxerstellung, G2-7); `aufstehen` = D10 bis D13,
C15 (halb auf), D14. Nicht verwendet wie bisher: A2, A3, A7 bis A10, A12,
C11, C14.

**Befunde Rammbock**: Reichweite im Trefferbild (vorderster Pixel vor der
Spiegelachse) `schlag_a` 30,0, `schlag_b` 31,5, `umwerfschlag` 22,0,
`sprungtritt` 38,0 Spielpixel; die Gliederpuppe erreichte 48, 48, 47 und 32,
die Trefferzonen der Logik reichen bis 48. Der Grok-Arm in Seitenansicht ist
kürzer als die Zone. Geworfen kopfüber (E2) ist 137 Bildpixel hoch (Umriss
liegend 120). Grundlinie wie 5.7 (Luftposen, Liegen, C11, C14, E1).

**Nachbestellungen Rammbock** (unverändert, Prompts in 5.7): 1 Haltung
(`haltung` 1 und 2), 2 Rückzug nach dem zweiten Schlag (`schlag_b` 3),
3 Landung nach dem Sprungtritt (`sprungtritt` 2 und 3), 4 tiefe Hocke zum
Absprung (wünschenswert). Für die Blätter in Dreiviertelansicht zusätzlich:
die Schläge mit weit gestrecktem Arm (Faust etwa 48 Spielpixel vor dem
Fußpunkt, Befund Reichweite), sonst gleiche Bilder wie bisher.

**Grenzen** (zusätzlich zu 5.6): Der Fußkontakt setzt Gehbilder mit Blick
nach rechts und erkennbaren Füßen voraus; zeichnet Grok die Körpermitte
sprunghaft, ruckt der Körper statt der Füße (Rest und Verschiebungen im
Protokoll). Die Kontur ist nicht einfarbig (dunkle Kanten des Bildes
bleiben); die Darstellung bildet das Konturblatt fürs Schutzblinken
deshalb aus den Randpixeln (U1-3). Die Hintergrundfarbe der Blätter muss
sich von den dunkelsten Figurfarben abheben, sonst gehen diese nach U2-7
auf den dunkelsten Ton.

## 6. Stand

| Phase | Stand |
|---|---|
| 0 Einrichtung | Ausgangslage geprüft: `npm run pruefen` grün, `npm test` 214 von 214 grün; Animationszeiger geprüft (Abschnitt 3) |
| 1 Werkzeugkasten, Umsetzer, Vergleich | Werkzeugkasten, Vela (Stand, Gehen, Kette), Rammbock als Gliederpuppe und aus Grok-Blättern; Haltepunkt 1 am 2026-10-03: E24 (Gliederpuppe als Standardweg, Grok als Vorlage) |
| 2 Alle Grafiken | Vela (30 Animationen), Bolzer (21), Puppe (Farbtausch), Rammbock (23), Zünder (12), Ballast (16), Objekte und Effekte (20), Hintergründe A, B, F mit Himmel, Vordergrund und Blendenkante, Anzeige mit Pixelschrift; Übersicht `docs/bilder/kontakt_uebersicht.png`; `npm run grafik` zweimal bitgleich, `npm test` 367 grün |
| 3 Einbau (G7) | Sprites, Hintergründe, Vordergrund, Blende und Anzeige aus den Blättern in der Darstellung (Abschnitt 9); Rückfall `?platzhalter=1` und bei fehlendem Blatt; Zuordnung als reine Funktion (`zuordnung.ts`), Effektliste der Darstellung (`verlauf.ts`); Tests `grafik_zuordnung` (63 Kombinationen der Figur, 337 der Gegner in 83 Modi, 24 901 Frames aller Prüfszenen ohne Ersatzwahl), `grafik_aktiv` (40 Angriffsanimationen), `grafik_dauer` (81 Animationen); Szenenbilder `docs/bilder/szene_*.png`; `npm test` 377 grün, Browser-Test unverändert grün; mittlere Zeit je Bild 0,42 ms (600 Bilder, Chromium) |
| Haltepunkt 2 (Auftrag 4) | Der Nutzer hat die Figuren der Gliederpuppe und die gezeichneten Hintergründe abgelehnt; Auftrag 4, Phasen 4 und 5 entfallen; weiter mit Auftrag 5 (E25, Abschnitt 0) |
| A5 Phase 0 | Ausgangslage: `npm run pruefen` grün, `npm test` 377 von 377 grün; E25 eingetragen |
| A5 Phase 1 | Darstellung bei 2× (U1, Abschnitt 9.10), Umsetzer v2 mit Medianschnitt bis 64 Farben (U2, Abschnitt 5.8); `rammbock_grok` aus den alten Blättern in Seitenansicht ersetzt im Spiel die Gliederpuppe des Rammbocks; `rammbock_fremd` entfällt; `npm test` 394 grün; Haltepunkt 1 |

## 7. Abweichungen und Lücken

| Nr. | Stelle | Festlegung | Grund |
|---|---|---|---|
| G1 | Auftrag 4, 1.2 (Schatten senken die Sättigung) | Treppe genau wie `treppe()` der Stilprobe: Schatten heben die Sättigung leicht an (+0,03, +0,06) | Die gewählte Stilprobe ist maßgeblich |
| G2 | Auftrag 4, 1.2 (fünf Töne je Material, 16 Farben je Figur) | geteilte Treppen und Zweitonmaterialien nach 1.2, „Farbbudget“ | Fünf volle Treppen für sechs Materialien wären 30 Farben |
| G0b-1 | Auftrag 4, 9.3 (Zellen kleiner als 1/50 des Blatts verwerfen) | Gemessen wird das Rechteck der Zelle. Eine Zelle bleibt auch unter 1/50, wenn ihr Rechteck mindestens 1/4 des größten misst | Auf einem Blatt 4 × 3 hat eine liegende Pose etwa 1,5 % der Blattfläche und fiele sonst weg; Nummern und Staub liegen unter 0,1 % |
| G0b-2 | Auftrag 4, 9.3 (Zellen finden) | Kleine Bereiche, deren Rechteck das einer großen Zelle schneidet, gehören zu dieser Zelle | Getrennte Splitter einer Figur (Kantenglättung, Lücken) gingen sonst verloren |
| G0b-3 | Auftrag 4, 9.3 (Maßstab, Rundung auf das Raster) | Halbierungssuche ±1,5 Zeilen um den Rohfaktor, bis der Stand genau die Zielhöhe hat | Bei der Deckung 1/2 kann ein runder Kopf die oberste Zeile verlieren (70 statt 71 px) |
| G0b-4 | Auftrag 4, 9.3 (dieselben Prüfungen wie bei der Puppe) | `figurPruefen` aus `bauen.ts`. Hart: Kontur, Streupixel, Farben, Anker, aktive Bilder. Umriss im Stand und Fußkontakt sind beim Umsetzer Befunde | Fremde Blätter treffen Schrittweite und Breite nur zufällig. Das ist eine Frage an den Nutzer (Nachbestellung), kein Baufehler |
| G0b-5 | Auftrag 4, 9.3 (Außenkontur neu) | Der äußerste deckende Ring wird in `KONTUR` umgefärbt (`randFaerben`), die Figur wächst nicht | Die Zielhöhe 71 gilt für die ganze Figur mit Kontur, wie bei der Puppe |
| G0b-6 | Auftrag 4, 9.3 (Innenkonturen übernehmen, wo sie im dunkelsten Materialton liegen) | Innenlinien, die auf Ton 0 eines Materials fallen, bleiben. Innenlinien, die auf `KONTUR` fallen, werden Ton 0 des häufigsten Nachbarmaterials, sofern dieser zur Palette gehört, sonst bleibt `KONTUR` | Stilhandbuch 1.2: Innenkontur im dunkelsten Ton des Materials; `KONTUR` als Innenkontur sehr dunkler Materialien und als Pupille |
| G0b-7 | Auftrag 4, 9.3 (höchstens 15 Farben) | Kandidaten: Töne 0 bis 3 je Material, Glanz nur bei glänzendem; über dem Budget wird die am wenigsten belegte Stufe gestrichen | Fünf Materialien ergeben 22 Kandidaten |
| G0b-8 | Auftrag 4, 3 (Rammbock wie Bolzer: `haltung`) | Der Rammbock bekommt zusätzlich `stand` (1 Bild, Zelle des Maßstabs) | Rückfall der Darstellung für fehlende Animationen (Auftrag 4, 3) und Prüfung „Umriss im Stand“ (2.5) |
| G0b-9 | Auftrag 4, 3 und 9.3 (Dauern der Rammbock-Animationen) | Angriffe: Ausholen = Startup (A bis A+Startup−1), Trefferbild über die aktiven Frames ohne Treffer, Rest Rückzug (`NAH_ANGRIFFE`). Richtwerte ohne Quelle: `aufstehen_hocke` 6/6/6, `hocke_ankuendigung` 8/8, Aufteilung des Flugs bei `umgeworfen` (2/8/18/19/9), `geworfen` 21/21, `tot` | Die Darstellung nimmt die Dauer aus der Aktionsuhr; der Atlas trägt nur Richtwerte (Auftrag 4, 2.3) |
| G0b-10 | Auftrag 4, 9.3 (Freistellen mit Toleranz) | Nach der Randentscheidung wird die Maske geschlossen (Quadrat 2r + 1, r = 4 px Quelle): Lücken bis 8 px zwischen Figurteilen werden Figur und behalten ihre Farbe | Grok zeichnet Innenlinien genau in der Hintergrundfarbe (Abstand 4 bis 9); ohne Schließen zerfallen die Figuren (Stiefel, Kopf und Rumpf getrennt) |
| G0b-11 | Auftrag 4, 9.3 (Maßstab: derselbe Faktor für alle Blätter) | Ein Blatt kann seinen Faktor über eine gemeinsame Pose bekommen (`massstab <blatt> <zelle> wie <blatt> <zelle>`). Beim Rammbock gilt das für B bis E, Bezug ist A | Grok hat die verlangte gleiche Figurgröße nicht eingehalten (Stand 445, 339 und 748 px); mit einem Faktor wäre E 119 px und D 54 px hoch |
| G0b-12 | Auftrag 4, 2.2 und 9.3 (Bau) | `bauen.ts` ergänzt: `fremdFiguren()` baut `rammbock_fremd` über den Umsetzer, `Figur.weich` lässt Umriss im Stand und Fußkontakt nur melden, `bauen()` schreibt zusätzlich `vergleich_rammbock.png` (`vergleich.ts`). `figuren()` bleibt unverändert | `npm run grafik` baut alles deterministisch; die Tests der Gliederpuppen laufen nicht durch den langsamen Umsetzer |
| G0b-13 | Auftrag 4, 9.3 (Zuordnung nach Abschnitt 3) | Rammbock: Schlag B aus Blatt A (A4 bis A6), die Landung des Sprungtritts durch die Hocke C16 und C15 ersetzt, aufstehen_hocke aus D12 bis D14, auftritt_hocke = A11; die Zellen A2, A3, A7 bis A10, A12, C11 und C14 bleiben ungenutzt | Für Schlag B gibt es keine eigene Reihe; C14 zeigt einen Schlag statt der Landung; Gehen und Reaktionen kommen geschlossen aus B und D |
| G0-1 | docs/design.md 8 (Kette Stufe 2: 1/1/11/1, Stufe 3: 1/1/1/11/2) | Atlas ohne Trefferstopp (11 = 4 + 7): Stufe 2 1/1/4/10, Stufe 3 1/1/1/4/10; das letzte Bild hält bis zum Ende der Aktion | Die Tabelle deckt ohne Stopp nur 7 bzw. 9 Frames, die Logik dauert ohne Treffer 16 bzw. 17 (`KETTE2_LEER_DAUER`, `KETTE3_LEER_DAUER`), mit Treffer hält die Pose bis h+26; es gilt die Logik |
| G0-2 | Auftrag 4, 2.3 (`aktiv`) | `kette4` hat `aktiv` [2, 8]: Bild 8 (Dauer 4) liegt im zweiten aktiven Fenster uhr 17 bis 20 | werte.ts `KETTE4_ZWEITES_FENSTER_VON/BIS`; der zweite Tritt der Tabelle in design.md 8 fällt genau dorthin |
| G0-3 | Auftrag 4, 4 (Vela: Leder dunkelbraun für die Stiefel) | Stiefel in Hosentönen (dunkles Graublau mit Jackenschatten), Gürtel als dunkles Becken unter dem Saum; kein `LEDER` | Farbbudget: eine eigene Treppe für Leder ginge nur auf Kosten von Haut, Jacke oder Handschuh; die Stilprobe zeigt die Stiefel ebenfalls graublau-dunkel (`#262a35`). Frage an den Nutzer, falls braune Stiefel gewünscht sind |
| G0-4 | Auftrag 4, 1.2 (Treppe je Material, Glanz für Handschuhe) | Tonzuteilung Vela nach 4.1: Streifen einstufig, Haarlicht im Streifenorange, Handschuh aus der Jackentreppe (Töne 1 bis 3) mit `HANDSCHUH_VELA` 3 als Licht und `SPULE` als Glanz | 15 Farben plus durchsichtig (Farbbudget 1.2) |
| G0-5 | Auftrag 4, 1.3 (Licht und Schatten je 1 bis 2 px) | Tonschwellen der Figuren 0,86 / 0,68 / 0,2 statt 0,8 / 0,52 / 0,12 der Stilprobe; Gesicht mit halber Wölbung (`relief` 0,45) | Die Stilprobe glättet ihre Stufen mit Raster, das auf Figuren verboten ist; mit ihren Schwellen wäre das Licht eines 7-px-Arms 3 px breit und das Gesicht halb im Schatten |
| G0-6 | Auftrag 2.4 (Pose aus Winkeln und Versätzen) | Im Trefferbild werden Ellbogen und Handgelenk um 1,5 und 1 px gestreckt (Tritt: Knie 2, Knöchel 1) | Reichweite der Faust 50 px statt etwa 45; Zug im Trefferbild wie im Zeichentrick, bei 4 Frames nicht als Dehnung sichtbar |
| G0-7 | Auftrag 4, 1.4 (Gehen, 7 px je Bild) | Hüfte wippt um 2 bis 3 px; Ferse setzt mit 12° auf, Spitze rollt mit 22° ab | Ein Standfuß wandert 42 px unter der Hüfte durch; bei 29 px Beinlänge geht das nur mit gebeugtem Knie, das Abrollen hebt den Knöchel an den Enden |
| G0-8 | Auftrag 4, 2.4 (Zwischenposen rechnerisch) | Zwischenbilder mischen die Eingaben der Haltung (Hüfte, Ziele von Händen und Knöcheln, Winkel von Rumpf, Kopf, Stiefel), danach Lösung über die Gelenke | Gemischte Gelenkwinkel heben stehende Füße vom Boden (Fehler beim Bau von `kette2`, Bild 1) |
| G0-9 | docs/grafik.md 1.2 (Innenkontur zwischen Teilen verschiedener Materialien) | Innenkontur auch zwischen Teilen gleichen Materials aus verschiedenen Gruppen (Arm vor Rumpf, Bein vor Bein), im Ton 0 des hinteren Teils | Sonst verschmilzt der Jackenärmel mit der Jacke und das vordere mit dem hinteren Bein |
| G0-10 | Auftrag 4, 1.1 (Körper im Stand etwa 5 px niedriger als der Umriss) | Prüfung: Höhe im Stand höchstens 71 und mindestens 90 % davon; Vela 69 × 46 | „etwa“ braucht eine Grenze für die Prüfung in `bauen.ts` |
| G0-11 | Auftrag 4, 1.4 (Fußkontakt prüfen) | Prüfung am Bild: Läufe deckender Pixel auf der Ankerzeile (Kontur unter den Sohlen); zwischen zwei Bildern muss ein Lauf mit Anfang oder Ende um genau den Schritt zurückrücken (±1 px) | Prüft die Pixel statt der Puppenrechnung, gilt damit auch für den Umsetzer; die Puppenrechnung prüft `grafik_vela.test.ts` exakt |
| G0-12 | Auftrag 4, 2.4 (Spiegelung) | Gespiegelte Posen (Blick nach hinten in der Drehung von `kette4`) spiegeln die Formen, nicht das Bild: Licht bleibt links oben | Ein gespiegeltes Bild hätte das Licht von rechts |
| G0c-1 | Auftrag 4, 2.4 (Zeichenreihenfolge; Vela: vordere Schulter rechts der Mitte) | Rammbock: Rumpf halb von vorn mit der Brust zum Betrachter; nahe Schulter links der Mitte (x −4), ferne rechts hinter der Brust (x +9); der nahe Arm liegt vor dem linken Westenteil und schlägt | Mit Velas Anordnung verdeckte der breite Rumpf den fernen Arm ganz, und der linke Westenteil las sich als Panzer. So bleiben Brust und offene Weste frei, und der Schlagarm ist vom Ausholen bis zur Streckung ganz sichtbar |
| G0c-2 | Auftrag 4, 4 (Bart; Rammbock: Weste, Hose, Haut, Knieschützer) und 1.2 (Farbbudget) | Bart, Stiefel und Gürtel in `HOSE_BRAUN` 1 (Grund) und 2 (Licht) mit `KONTUR` als Innenkontur; kein eigenes `HAAR_DUNKEL`, kein `LEDER`; Weste und Hose ohne Ton 0 | `HOSE_BRAUN` 1 `#3B231A` liegt neben dem Grundton von `HAAR_DUNKEL` `#3B2B25`. Haut 4, Weste 3, Hose 3, Stahl 4 Töne und `KONTUR` füllen die 15 Farben |
| G0c-3 | Auftrag 4, 1.4 (Standfuß rückt je Bild um 4 · 1,6 = 6,4 px zurück) | Knöchel des Standfußes auf ganze px nach `round(n · 6,4)`, n = 0 … 8: 0, 6, 13, 19, 26, 32, 38, 45, 51; Schritte 6, 7, 6, 7, 6, 6, 7, 6 = 51 px je Zyklus. `bauen.ts` prüft mit `schritt` 6,4 ± 1, der Test exakt | 51,2 px je Zyklus gehen in ganzen Pixeln nicht auf. Die Rundung über den Zyklus hält den Fehler unter 0,5 px je Bild und bei 0,2 px je Zyklus (0,025 px je Frame); streng abwechselnd 6 und 7 ergäbe 52 px |
| G0c-4 | Auftrag 4, 2.4 (Teile je Pose) | Ein Knieschützer, der nur als Streifen von höchstens 4 px Stahl hinter dem anderen Bein hervorschaut, entfällt im Bild (`KNIE_SPLITTER`; betrifft `gehen` Bild 3 und 4) | Ein schmaler Stahlstreifen neben der Faust las sich als Stab (Lesbarkeit, Auftrag 4, 1.4) |
| G0c-5 | Auftrag 4, 3 (Rammbock `kampfhaltung` 2, Schleife; keine Dauer genannt) | `kampfhaltung` 8/8 als Richtwert wie `hocke_ankuendigung` in `fremd/rammbock/zuordnung.txt`; zwei Bilder der Hocke im Wechsel, Bild 1 eine Spur höher | Die Logik hält die Kampfhaltung 25 bis 5 Frames je nach Rang (design-gegner-stages.md 1.2); die Darstellung schleift |
| G2-1 | E24 (Rammbock: Arme etwas schlanker, mehr Dreiviertelansicht) und G0c-1 | Arme je 0,6 px schlanker (Oberarm 4,2 bis 3,6, Unterarm 3,6 bis 3), Faust 9,8 × 9,4 statt 10,4 × 9,8; Schultern bei x −3 und +8 statt −4 und +9; nahe Westenhälfte deckt Rücken, Flanke und nahe Brust bis 1 px rechts der Mitte, ferne nur als Streifen an der Vorderkante, Nabel und Schnalle rechts der Mitte; Tonzuteilung unverändert | Das Grok-Konzeptbild zeigt die Dreiviertelansicht so (Brust und Bauch vorn rechts, Westenseite links); in Phase 1 rahmten zwei gleich breite Westenteile die Brust frontal |
| G2-2 | Auftrag 4, 6 (Gesichtsmasken bis 8 × 8 von Hand) und docs/grafik.md 2.4 (Maske dreht ihre Lage mit, das Raster nicht) | Liegt der Kopf (Umgeworfen, Liegen, Kopfüber), dreht `gesichtGedreht` (`bolzer_gemeinsam.ts`) das Maskenraster in ganzen Vierteldrehungen (nächste zum Kopfwinkel) um die mitwandernde Maskenmitte. Verdeckt ein vorderes Teil einen Teil der Maske, wird ein übrig gebliebener Einzelpixel nach dem Rastern wie ein Streupixel umgefärbt (`aufgeraeumt`) | Ein aufrechtes Auge auf einem liegenden Kopf liest sich falsch; Maskenpixel schützt die Puppe beim Aufräumen, Reste verletzen sonst Regel 1.3 |
| G2-3 | Auftrag 4, 2.3 (Anker = Fußpunkt) für Bilder ohne Bodenkontakt | Flug-, Liege-, Sitz- und Kopfüberbilder werden in ganzen px so verschoben, dass ihr unterstes Pixel (Außenkontur) auf der Ankerzeile liegt (`amBoden`); in der Luft hebt die Darstellung um h an (`zeichnen.ts` `bildY`). Alle Bilder haben den Anker in der untersten Zeile | So liegt ein umgeworfener Gegner bei h = 0 genau auf dem Boden, und Prüfung „Anker im Bild“ (2.5) gilt ohne Sonderfall |
| G2-4 | Auftrag 4, 3 (Rückzug 2 Bilder) und werte.ts (BB, BUB: Rückzug 0) | Auch BB und BUB haben 2 Rückzugsbilder; sie stehen in den ersten 3 + 3 Frames des Nachlaufs (Richtwert `RUECKZUG_RICHTWERT` 6; kürzester Nachlauf ohne Treffer BB 7, BUB 14). Ohne festen Rückzug enthält der Atlas nur den Richtwert | Ohne Rückzugsbild spränge die Figur vom Trefferbild in die Kampfhaltung |
| G2-5 | design-gegner-stages.md 9 (Umgeworfen 2/8/37/9/41/8/8/1, dann 4/4/4; Aufstehen 8/8/1 + 4/4/4) | `umgeworfen` 8/19/18/5/4 nach der Bahn F1: Stillstand 8, Steigen ⌈vh / gh⌉ = 19 Bahnframes, Fallen bis vor den Bodenkontakt W+46, Aufprall 5, flach bis vor die Ruhe W+55; `aufstehen` 6 Bilder zu 3 (18 Frames, `AUFSTEHEN_GEGNER`) | Es gilt die Logik (Kampf 5.7, 7); die Aufteilung von Bodenkontakt bis Ruhe (9 Frames) in Aufprall 5 und flach 4 ist Festlegung |
| G2-6 | Auftrag 4, 3 (auftritt_hocke 1 und aufstehen aus der Hocke 3; keine Dauern) | `aufstehen_hocke` über den ganzen AUFTRITT: die letzten zwei Bilder je ⌊Dauer / 4⌋, das erste den Rest (Bolzer 25/12/12 = 49, Rammbock 35/17/17 = 69, `AUFTRITT_HOCKE_*`); `auftritt_hocke` in WARTEN | Der Auftritt dauert fest; zuerst hebt der Gegner den Kopf, dann richtet er sich auf |
| G2-7 | Auftrag 4, 3 (Rammbock kampfhaltung 2 und hocke_ankuendigung 2) und G0c-5 | KAMPFHALTUNG zeigt beim Rammbock `hocke_ankuendigung` (4 Frames senken, dann die tiefe Hocke, Richtwert 21 aus der Aufnahme A6); `kampfhaltung` ist jetzt die Boxerstellung (nach Grok A4, C1) und die Wartepose im Nachlauf nach dem Rückzug. In Phase 1 war `kampfhaltung` die Hocke | design-gegner-stages.md 1.2: deutliche Hocke vor jedem Angriff; die Animationsliste nennt beide Animationen getrennt |
| G2-8 | Auftrag 4, 3 (gehen_schnell: dieselben 8 kürzer) | Dauer je Bild 3 als Richtwert (4 · Normal / Schnell: Bolzer 3,1, Rammbock 3,2); Fußkontakt bei schnellem Gehen nur angenähert (Schritt 6,75 bzw. 6 px statt 7 bzw. 6,4) | Die Darstellung nimmt die Zeit aus der Logik; 8 Bilder in ganzen Frames treffen die schnelle Geschwindigkeit nicht genau |
| G2-9 | design-gegner-stages.md 9 (Rammbock: Wiegen 10/8/8/8/7/1, ohne Beschreibung) | `wiegen`: Oberkörper wiegt zurück, Mitte, vor, Mitte, zurück, Stand; Schleife; gezeigt beim Abwarten an der Warteposition (ABWARTEN mit `aktion` STAND); `spott` im SPOTT | Das Vorbild nennt Wiegen und Spott mit gleicher Folge (research/captcomm/grafik/README.md, EDDY); der Kern kennt keinen eigenen Zustand für das Wiegen |
| G2-10 | Auftrag 4, 2.3 (alle Bilder nach rechts) für Flugbilder | `umgeworfen` und `tot` fliegen rücklings vom Blick weg (Kopf nach hinten, Grok D4 bis D8); `geworfen` 1 Kopf voran in Bildrichtung (Grok E3). Fliegt ein Gegner in seine Blickrichtung, spiegelt die Darstellung das Bild (Hinweis für G7) | In Reaktionen dreht sich der Gegner nicht um (Kampf 5.2); getroffen von hinten fliegt er sonst mit dem Kopf voran rückwärts |
| G2-11 | Auftrag 4, 3 (Rammbock wie Bolzer: schlag_a, schlag_b, schlag_c, umwerfschlag_a, _b) | Rammbock nach den Codes der Logik: `schlag_a` = RA, `schlag_b` = RB, `umwerfschlag` = RU, `sprungtritt` = RS; kein `schlag_c` (kein RC in `NAH_ANGRIFFE`); `schlag` = `schlag_a` (gleiche Bilder, liegen einmal im Blatt) | `vergleich.ts` und das Vergleichsbild von Haltepunkt 1 nutzen `schlag` |
| G2-12 | Auftrag 4, 3 und 4 (Puppe: Bolzer in Grau ohne Streifen, Palettentausch) | Farbtausch auf den fertigen Bildern (`PUPPE_TAUSCH`): Overall → `PUPPE_GRAU` 0 bis 3, Orange → `PUPPE_GRAU` gleicher Stufe (Streifen verschwinden; die Lichtpixel der Streifen sind dabei Grundton), Haut → `PUPPE_GRAU` 0 bis 2, Stahl und `KONTUR` bleiben | Kein eigenes Zeichnen (Auftrag 4, 3); Kopf und Hände bleiben eine Stufe dunkler, damit die Fäuste vor dem Overall lesbar sind |
| G2-13 | Auftrag 4, 4 (Bolzer: Overall, Streifen, Maske und Stiefel Stahl, Haut dunkel; Werkzeuggürtel) | Stiefel, Gürtel, Tasche und Riemen in `STAHL` 0 und 1 mit `KONTUR` als Innenkontur, Kappe und Sohle in `STAHL` 1 bis 4; Streifen zweistufig (`SIGNAL_ORANGE` 1, 2); Haut ohne Ton 0 (`KONTUR` als Innenkontur); kein `LEDER` | Farbbudget 1.2: Overall 4, Streifen 2, Stahl 5, Haut 3 und `KONTUR` = 15 Farben |
| G2-14 | Auftrag 4, 3 (Bolzer ohne `stand`) | Der Bolzer (und die Puppe) hat zusätzlich `stand` (1 Bild) | wie G0b-8: Rückfall der Darstellung und Prüfung „Umriss im Stand“ (`figurPruefen` verlangt `stand`) |
| G2-15 | E24 (Getroffen nach den Grok-Blättern) | Reihenfolge der Bilder D2, D3, D1: der stärkste Rückschlag bei h+1, aufgerichtet ab h+22 (Grok-Blatt: D1 schwach, D2 und D3 stark) | Der Treffer wirkt im ersten Frame am stärksten; danach ist der Gegner ab h+23 frei (Kampf 7) |
| G2-16 | Auftrag 4, 3 (Bolzer: drei Schläge, zwei Umwerfschläge; keine Posen beschrieben) | BA Gerade mit der nahen Faust, BB schneller Stoß mit der fernen Faust, BC weiter Haken, BUA Aufwärtshaken aus der Hocke, BUB Tritt mit der Stahlsohle; Reichweite der Trefferbilder 41, 46, 40, 32, 37 px (höchstens `ZIELABSTAND_MAX`) | Einfachste lesbare Unterscheidung nach Startup (BB 4: kurzer Stoß; BC 10 und BUA 9: weit ausgeholt; BUB: Magnetstiefel aus Auftrag 4, 4) |
| G6-1 | Auftrag 4, 1.6 und G6 (Schrift 8 × 8 mit dunkler Schattenkante unten rechts) | Zusätzlich 1 px Umriss in `KONTUR` um Körper und Schatten; das Zeichenbild ist 10 × 10 (groß 18 × 18) mit der Zelle 8 × 8 (16 × 16) bei Anker (1, 1), Laufweite 8 (16); Zeichen werden von links nach rechts gesetzt | Mit Schatten allein verschwindet die helle Oberkante weißer Schrift auf hellem Grund (Lichtkegel in F, Reif, Probe in `kontakt_anzeige.png`); auf dunklem Grund ist der Umriss unsichtbar, die Schrift sieht aus wie mit Schatten allein |
| G6-2 | Auftrag 4, 1.6 (16 × 16 Variante derselben Schrift) | Die große Schrift ist Scale2x (EPX) der kleinen, ohne Nacharbeit von Hand; Schatten 1 und 2 px | Dieselbe Form in doppelter Größe; Scale2x ändert je 2 × 2-Block höchstens einen Pixel und glättet nur die Treppen der Schrägen (Test) |
| G6-3 | Auftrag 4, 1.6 (große Texte; keine Farbe genannt) | Körper der großen Schrift und des Pfeils in drei Bändern aus den Leistenfarben: Zeilen 0–4 `LEISTE_TEXT`, 5–9 `BALKEN_GELB`, 10–13 `BALKEN_ORANGE` | Titelschriften der Automaten um 1991 sind so gestuft; das Farbbudget 8 lässt keine eigenen Töne zu |
| G6-4 | Auftrag 4, G6 (große Texte als fertige Bilder oder als Regel) | Fertige Bilder für `PAUSE`, `STAGE CLEAR`, `GAME OVER`, `BALLAST BESIEGT`, `5000` und zusätzlich die ganze Zeile `BALLAST BESIEGT 5000`, Schlüssel = Text aus `anzeige(welt).texte`; andere Texte aus den Zeichen der großen Schrift | Ein Bild je Zeile ist für den Einbau ein Aufruf; die Zeichen bleiben für alles andere da, beide Wege ergeben dieselben Pixel |
| G6-5 | Welt 10.1 (Leben: „Symbol und Zahl“ bei x 8, Zeile 18; `masse.ts` `LEBEN_ABSTAND` 8) | Symbol 8 × 8 bei x 8, Zeile 18; Zahl bei x 18 (`leben.zahlDx` = 10 im Atlas); Zeilenangaben der Leiste sind die Oberkante des Körpers bzw. der Balkenfüllung | Mit 8 px Abstand stieße der Umriss der Zahl an das Symbol; oben bündig mit der Balkenfüllung wie die Zeile 18 der Spezifikation |
| G6-6 | Welt 10.1 (Pfeil „weiter“ x 340 bis 376, Zeilen 96 bis 112) und G6 (blinkend: zwei Bilder an/aus) | Ein Bild 37 × 17 (Vieleck: Schaft 16 × 6, Spitze über 14 Zeilen, Bänder wie G6-3, Schatten und Umriss 1 px); „aus“ ist kein Bild, sondern nicht zeichnen; das Blinken kommt aus `anzeige(welt).pfeil` (KA5) | Der Kern blinkt den Pfeil schon (16 an, 16 aus); ein zweites Bild wäre leer |
| G6-7 | Auftrag 4, 1.2 (Anzeigeleiste höchstens 8 Farben) und G6 (Lebenssymbol Velas Kopf) | Achte Farbe ist `HAUT_HELL` 2 für das Gesicht des Symbols; das Haar ist `BALKEN_ORANGE` mit `BALKEN_GELB` als Glanz statt `HAAR_VELA` | Durchsichtig, `KONTUR`, `LEISTE_TEXT`, die drei Lagenfarben und `BALKEN_LEER` belegen sieben der acht Plätze; ohne Haut läse sich das Symbol nicht als Kopf |
| G6-8 | Welt 10.1 (Lagen grün, gelb, orange) | Lage 4 und höher bleibt orange über orange (wie `zeichnen.ts` heute); der Balkenrahmen hat runde Ecken (Rahmenspalten nur die Zeilen 1 bis 6) | In der Scheibe hat der Boss 100 LP (Lage 2), mehr als drei Lagen kommen nicht vor |
| G6-9 | Auftrag 4, 1.6 (Großbuchstaben, Ziffern, Umlaute, Satzzeichen, Pfeil) | Keine Kleinbuchstaben und keine Zeichen der heutigen 5 × 7-Schrift außerhalb des Vorrats (`( ) < > # _ % * \| =`); die Darstellung schreibt groß, Unbekanntes wird `?` | Alle Texte der Leiste und der großen Texte sind Großbuchstaben, Ziffern und Leerzeichen; Sonderzeichen braucht nur die Debug-Anzeige, die `SCHRIFT_3X5` behält |
| G4-1 | Auftrag 4, 1.2 (Außenkontur) und G4 (Effekte dürfen ohne Kontur sein) | Gegenstände, Behälter, Raketen und die Eiswelle mit geschlossener Kontur `KONTUR`; Magnetstoß, Funke, Explosion und Staub ohne Kontur und ohne `KONTUR` (geprüft) | Leuchtende und weiche Effekte (Energie, Glut, Rauch, Staub) wirken mit dunklem Rand wie feste Körper; die Eissplitter sind feste Gebilde am Boden und brauchen den Rand auf hellem Reifboden |
| G4-2 | Auftrag 4, 1.5 (Funke und Explosion „weiß bis orange“; docs/grafik.md 1.2: `FEUER` mit Weiß als Glanz) | Weiß ist `EIS` Ton 4 (`#FFFFFF`), keine neue Palettenfarbe | Der Glanzton von `FEUER` ist cremegelb (`#FBDB9E`); `EIS` 4 ist das einzige Weiß der Palette |
| G4-3 | Auftrag 4, 1.5 (Explosion Orange-Gelb-Weiß mit Raster außen) | Die letzten drei Bilder zerfallen in Rauch in `STAHL` 1 mit `FEUER` 0 als Übergang; Löcher mit Rasterring | Bestellliste (`docs/grafik-bestellung.md`, Blatt objekte_c): „große orange Wolke mit dunklem Rauch, die dann zerfällt“; 7 Farben plus durchsichtig |
| G4-4 | Auftrag 4, 1.3 (Raster Bayer 4 × 4 auf Explosionen) | Raster nur als Schachbrett (Bayer-Stufe 1/2) an Tonschwellen und am Rand (Explosion, verwehter Staub) | Feinere Bayer-Stufen setzen Einzelpixel ohne gleichen Nachbarn; die Regel „kein Pixel steht allein“ (1.3) gilt auch hier |
| G4-5 | Auftrag 4, 1.5 (Explosion etwa 24 Frames in 6 Bildern) | Dauern 2/3/4/4/5/6; die Darstellung führt die Explosion nach der Freigabe des Slots (Figur nach 15, Zünder nach 10 Frames) bis Uhr 24 weiter; Anker am Boden unter der Mitte in der untersten Zeile der Wolke (sie sitzt auf), gezeichnet in Höhe 0 | Der Kern hält die Rakete nur über die aktiven Frames; die Wolke soll nach Auftrag 4 länger stehen als die Trefferfläche |
| G4-6 | Auftrag 4, G4 (Anker bei Effekten am Trefferpunkt oder Mittelpunkt) und 1.5 (Magnetstoß vor der Faust) | Magnetstoß mit Anker am Ansatzpunkt an der Faust, Ansatz je Stufe relativ zu Velas Fußpunkt in 4.7; Länge in x 10, 12, 22, 28 px; Kette 3 schräg 30° nach oben; zweites Fenster der Kette 4 mit demselben Bild am Ansatz (46, −41) | Ein Anker an Velas Fußpunkt läge außerhalb des Bildes (Prüfung „Anker im Bild“); der Aufwärtshaken trifft nach oben vorn |
| G4-7 | Kampf 9.4 (Fläche vorn bis 43 … 123, hinten bis 42 … 122, Tiefe 28) | Eiswelle je Stufe von Velas Fußpunkt bis „vorn bis“, hinten gespiegelt (1 px weiter als die Fläche); die Tiefe ±28 nur angedeutet (zweite Splitterreihe 3 px höher), Kamm 22 px 6 bis 12 px hinter der Front, dahinter niedriger bis 4 px | Ein 56 px tiefes Splitterfeld verdeckte Figuren und Gegner; die Trefferfläche bleibt die der Logik |
| G4-8 | Auftrag 4, 4 (Fass in vier Trümmerteile, Bosskiste als Bretter) | Trümmer als Animation aus 5 Bildern (Bersten 2, Flug 4/4/6, Liegen 32 Frames, Summe 48 wie der Flug des Inhalts); ein Teil bleibt am Boden unter dem Anker; Bild 4 blinkt ab Uhr 33 wie die Liegezeit; Kistenbretter grau mit Bruchenden in `HOLZ` | Der Kern kennt den zerbrochenen Behälter nur im Frame h (Welt 9.2); ohne Flug verschwände das Fass schlagartig |
| G4-9 | Auftrag 4, 2.2 (Kontaktbögen 2×) | Kontaktbögen von Animationen, deren größtes Bild unter 40 px misst, 4× (Gegenstände, Raketen, Funke, Magnetstoß 1 und 2), sonst 2× | Ein 14 × 12 großer Gegenstand ist in 2× für die Abnahme zu klein |
| G4-10 | Auftrag 4, 1.2 (Gegenstände höchstens 8 Farben) | Das Budget gilt je Animation über alle Bilder einschließlich durchsichtig; Teilmaterialien zwei- oder einstufig (Platte, Dampf, Siegel der Trümmer, Rauch) | Die Animation ist die Einheit, die die Darstellung zeigt; wie bei den Figuren (16 je Figur über alle Bilder) |
| G4-11 | Auftrag 4, 2.3 (`aktiv` je Animation) | Zwei Atlaseinträge `explosion` (aktiv [0 … 4], RX Uhr 1 bis 15) und `explosion_zuender` (aktiv [0 … 3], ZR Uhr 2 bis 10) mit denselben Bildern (im Blatt nur einmal) | Die aktiven Frames der beiden Explosionen sind verschieden lang (Kampf 10.3, Welt 6) |
| G4-12 | Welt 9.3 (in der Scheibe nur Kometenbraten und Raketenwerfer) | Eisnudelschale und Sternbeeren trotzdem gezeichnet | Auftrag 4, 4 verlangt sie; Kampf 10.1 und 10.2 kennen sie |
| G4-13 | Auftrag 4, G4 (Anker am Fußpunkt) | Raketen mit dem Anker in der Mitte der Achse, gezeichnet in Höhe `h`; Flammenwechsel alle 2 Frames über `flug_n` | Eine Rakete hat keinen Fußpunkt; ihre Höhe ist die der Flugbahn |
| G4-14 | Auftrag 4, 4 (leere Waffe grau) | Rohr der leeren Waffe in `OVERALL_BOLZER` (neutralgrau), Beschläge wie beim vollen Werfer in `STAHL` | `STAHL` ist bläulich und wäre vom Beschlag nicht zu unterscheiden |
| G4-15 | Auftrag 4, 1.4 (Schutz: jedes zweite Framepaar nur Kontur) | Keine Bilder: die Darstellung zeichnet im Blinkpaar nur die Pixel in `KONTUR` des aktuellen Bildes | Jedes Bild hat eine geschlossene Außenkontur in `KONTUR`; so blinkt jede Figur ohne eigene Bilder |
| G4-16 | Auftrag 4, 4 (Raketenwerfer etwa 30 × 10) | Maße und Farben des Werfers verbindlich für Vela (G1) und den Zünder (G3): Tabelle in 4.7, `WERFER` in `gegenstaende.ts` | Gleiche Form in der Hand und am Boden (Auftrag G4: Abstimmung mit G1) |
| G1-1 | Auftrag 4, 3 (Vela `sprung`: 3 Steigen, Scheitel, 3 Fallen, 2 Landung) und docs/design.md 8 (3 Bilder in 5 Stufen 6/6/6/6/17, Fallbilder gleich den Steigbildern, Landung 5/1) | 7 eigene Luftbilder 6/6/6/6/6/6/5 (die 17 Frames Fall auf drei Bilder verteilt), Landung 5/1; Summe 41 + 6 = 47 wie design.md. Bild 6 ist die Fallpose nach einem Sprungangriff | Der Auftrag verlangt eigene Fallbilder; die Summe folgt der Logik (`SPRUNG_LETZTER_LUFTFRAME` 41, `LANDUNG_DAUER` 6) |
| G1-2 | docs/design.md 8 (Sprungangriff hoch 3/3/4/3/3/3/3/3/3/3/1, Summe 32) | 3/3/4/3/3/3/3/3/2/1/1, Summe 29 | Die Logik hält `SPRUNGANGRIFF` H nur bis uhr 29 (`SPRUNGANGRIFF_HOCH_AKTION_BIS`), danach `SPRUNG` mit Fallpose (Kampf 4.3) |
| G1-3 | docs/design.md 8 (Kniestoß 2/2/9/2/1/1, Summe 17) | 2/2/9/2/1/6, Summe 22; das letzte Bild ist das Haltebild des Griffs | `KNIESTOSS` dauert uhr 1 bis 22, gehalten ab K+23 (`KNIESTOSS_GEHALTEN_AB`); der Treffer K+5 liegt wie in design.md im Bild 2 |
| G1-4 | Auftrag 4, 3 (`sprint_sprungangriff` 5; keine Zeile in docs/design.md 8) | Hechtsprung mit beiden Fäusten voran; Bild nach `ss_n` (Frames seit A ohne Stopp): 4/8/7/20 bis `ss_n` 39, Trefferbild in `ss_n` 13 (Bild 2), zweites Fenster 20 bis 39 (Bild 3); Bild 4 (6 Frames) zeigt die Landung, solange die Instanz läuft | Die Instanz läuft über die Landung hinaus (Kampf 9.3); `uhr` von `SPRINTSPRUNG` zählt ab J+1, nicht ab A. Fläche 38 bis 147 px nur vor der Figur, daher ein waagrechter Sprung nach vorn |
| G1-5 | docs/design.md 8 (Umgeworfen 1/8/6/31/9, Summe 55) | 1/8/6/31/8, Summe 54 | `UMGEWORFEN` dauert H bis H+53, `LIEGEN` ab H+54 (`FIGUR_LIEGEN_AB`); Bild 2 ab dem ersten Bahnframe H+9, Bild 4 ab dem Bodenkontakt H+46 wie design.md |
| G1-6 | Auftrag 4, 3 (`waffe_schuss` 3, `aufnehmen` 3, `neueinstieg_fall` 2, `neueinstieg_landung` 2; keine Dauern in docs/design.md 8) | `waffe_schuss` 6/4/7 (Abschuss P+7 am Beginn von Bild 1, `WAFFE_DAUER` 17), `aufnehmen` 2/3/2 (`AUFNEHMEN_DAUER` 7), `neueinstieg_fall` 4/4 Schleife, `neueinstieg_landung` 5/1 wie die Sprunglandung (`NEUEINSTIEG_LANDUNG_DAUER` 6), `griff` Haltebild 56 (bis g+60) | Einfachste Verteilung über die Aktionsdauer der Logik (Auftrag 4, 7) |
| G1-7 | Auftrag 4, 3 (`waffe_stand`, `waffe_gehen`: Raketenwerfer in der Hand) und G1-Auftrag (Werfer mitzeichnen oder als Teil der Figur, mit G4 abstimmen) | Velas Blatt zeigt nur die Armhaltung (Werfer auf der vorderen Schulter, vordere Faust aufrecht am Griff). Den Werfer zeichnet die Darstellung aus dem Bild von G4 (`werferBild`, 4.7) mit dem Griffpunkt auf Velas Werferpunkt (Mitte des vorderen Handschuhs, Tabelle in 4.1), vor Vela. Die Mündung liegt im Schussbild bei (25; −53,5), die Rakete erscheint bei (58, 50): Die Lücke überbrückt der Mündungsblitz | Farbbudget: Vela hat 15 Farben plus durchsichtig (4.1); `ROHR_GRUEN` braucht drei Töne. So bleibt der Werfer in Hand und am Boden derselbe. Eine Mündung bei 58 px ginge nur mit einem Arm von über 40 px |
| G1-8 | Auftrag 4, 2.2 (Blatt höchstens 2048 × 2048) und `blatt.ts` (je Animation eine neue Zeile) | `blatt.ts` ergänzt (rückwärtsverträglich): `Animation.zeileFortsetzen` lässt eine Animation die Zeile der vorigen fortsetzen. Vela packt verwandte Animationen in eine Zeile (`fortsetzen` in `vela.ts`); Blatt 712 × 1244 statt 523 × 2038 | Mit 30 Animationen in je eigener Zeile wäre Velas Blatt 2038 px hoch und mit der nächsten größeren Pose über 2048. Ohne das Feld packt `blattPacken` wie bisher; die anderen Blätter ändern sich nicht |
| G1-9 | Auftrag 4, 2.3 (Anker = Fußpunkt) und 2.5 (Anker im Bild) bei Bildern in der Luft | Alle Bilder von Phase 2 haben den Anker auf der Konturzeile unter dem tiefsten Pixel (wie der Umsetzer, 5), in x unter dem Fußpunkt der Puppe; die Figur steht mit ihrem tiefsten Punkt auf der Höhe `h`. Bodenposen setzen Sohle, Spitze, Knie oder Faust auf y = 0 | Der Fußpunkt einer Luftpose liegt unter dem Bild; `zugeschnitten` würde ihn aus dem Bild schieben (Prüfung „Anker im Bild“). Beim Sprung steht der Absprung bei h = 0 so auf der Spitze, die Fallpose auf dem tiefsten Fuß |
| G1-10 | docs/grafik.md 2.4 (Streupixel innerhalb eines Teils entfernen) | `bildFrei` entfernt Streupixel zusätzlich über Teilgrenzen (häufigste deckende Farbe der acht Nachbarn); die Außenkontur und der Glanz bleiben | In Saltos und Flugposen entstehen einzelne Innenkonturpixel zwischen zwei Teilen, die das Aufräumen der Puppe nicht erreicht |
| G1-11 | Auftrag 4, 3 (`getroffen_vorn`, `getroffen_hinten`) | Die Darstellung wählt nach dem letzten Angreifer (`letzter_angreifer`): steht er vor der Figur (Vorzeichen von x_Angreifer − x_Figur gleich `blick`, bei Gleichheit vorn), `getroffen_vorn`, sonst `getroffen_hinten` | Die Logik führt `GETROFFEN` ohne Unterphase (Kampf 4.3); vorn und hinten unterscheidet nur die Lage des Angreifers |
| G1-12 | Auftrag 4, 3 (`umgeworfen`, `liegen`, `aufstehen`) und Kampf 5.7 (Flug vom Angreifer weg) | Gezeichnet ist der Flug kopfvoran nach hinten (entgegen dem Blick), wie im Grok-Blatt D. Fliegt die Figur in Blickrichtung (Angreifer hinter ihr), spiegelt die Darstellung `umgeworfen`, `liegen`, `aufstehen` und `tot` bis zum nächsten `STAND` | Die Logik dreht den Blick beim Umwerfen nicht; gespiegelt bleibt der Flug kopfvoran und rücklings in beide Richtungen |
| G1-13 | Auftrag 4, 3 (`tot` = liegen) und Kampf 6.5 (Bahn F4) | `tot` ist dasselbe Bild wie `liegen` (Auge zu, im Blatt einmal). Im Flug zeigt `TOT` die Bilder von `umgeworfen` nach `TOT_FLUG_DAUERN` 1/2/6/31/9 (Stillstand t+1 und t+2, Bodenkontakt t+40), ab der Ruhe t+49 `tot` | Der Tod fliegt wie das Umwerfen, nur mit 2 statt 8 Frames Stillstand; eine eigene Flugfolge wäre dieselbe Bewegung |
| G1-14 | Auftrag 4, 3 (Waffe: nur `waffe_stand`, `waffe_gehen`, `waffe_schuss`) | Mit Waffe zeigen nur `STAND`, `LAUF` und `WAFFE` den Werfer; Sprint, Sprung, Griff, Wurf, Spezialangriff und Reaktionen zeigen die Bilder ohne Waffe und keinen Werfer | Für die anderen Aktionen verlangt der Auftrag keine Waffenbilder; die Logik behält die Waffe dort (Kampf 10.3) |
| G5-1 | Auftrag 4, 2.3 (Atlas-Format mit Animationen) und Phase 2, G5 (Atlas mit Welt-x- und Tiefenlage) | Hintergründe haben ein eigenes Atlasformat: Kachelkarten je Ebene (Welt-x, Welt-y, Parallaxe, Deckkraft, Kachelnummern) und freie Bilder mit Name, Ebene, Folge, Lage und Bildfolge; Format und Zeichenregel in 4.8 | Hintergründe haben keine Anker und keine Aktionsuhr, dafür Lage, Ebene und Reihenfolge; 16 × 16 als Karte statt je Kachel ein Eintrag hält den Atlas lesbar |
| G5-2 | Auftrag 4, 1.2 (Hintergrundmaterialien aus palette.ts) | `palette.ts` angehängt: `NEON_SCHEIN` `#B84AA6` (Schein um die Neonschrift, Spiegelung am Boden), `ASSERVAT_HOLZ` `#7E5E3E` (Kisten in den Regalen), beide als Hintergrundtreppe in `HINTERGRUND_MATERIALIEN_G5`; `BLENDE_DUNKEL` `#000000` wie heute `FARBE.rand`. `HINTERGRUND_MATERIALIEN` bleibt unverändert | Der Schein braucht Zwischentöne zwischen Ladenwand und Neon; die Kisten sollen sich von Regal und Wand abheben; die Blende bleibt schwarz wie heute |
| G5-3 | Auftrag 4, 1.6 (Vordergrund mit fester Deckkraft 0,85) | Die Kabelrollen sind im Blatt voll deckend; der Atlas trägt `deckkraft` 0,85, die Darstellung setzt `globalAlpha`. Nur der Kontaktbogen mischt (mit `mischen`) | Das Blatt bleibt bei den Farben der Palette (1.1: nur deckend oder durchsichtig) |
| G5-4 | Auftrag 4, 1.3 (kein Pixel steht allein) und 1.2 (Außenkontur) | Für Hintergründe gelten Kontur- und Streupixelregel nicht; Sterne, Glitzerpunkte im Reif und Leuchtpunkte stehen als Glanzpunkte allein | Raster (Bayer 4 × 4) auf großen Flächen ist erlaubt (1.3) und setzt bei Deckung unter 1/2 zwangsläufig einzelne Pixel; Hintergründe haben keine Außenkontur |
| G5-5 | Auftrag 4, 1.6 (Blende: Abdunkeln wie heute, zusätzlich Rasterkante am Rand des Dunkels) | Zum Abdunkeln wie heute schiebt sich ein voll dunkles Feld von rechts ins Bild (F = 400 − ⌊400 · d / 28⌋), an seinem Rand die Kantenkachel 16 × 16 (Bayer, 0/16 bis 15/16); Regel in 4.8 und `hintergrund_blende.json`. G6 liefert keine Blendenbilder (4.9) | Gleichmäßiges Abdunkeln hat keinen Rand; „Rand des Dunkels“ braucht eine Front. Von rechts, weil die Figur nach rechts in den Schnitt läuft |
| G5-6 | Auftrag G5 (Schrift für Schilder als kleines Bitmuster) | Schilderschrift 5 × 7 in `werkzeug.ts` mit nur den Zeichen der Schilder (PERIHEL, FRACHT, FUNKLADEN, ASSERVATE); die Glyphen doppeln die Anzeigeschrift von G6 | Vom Auftrag so vorgesehen; Schilder brauchen eine andere Größe und fette bzw. doppelte Form |
| G5-7 | Auftrag 4, 4 (Landedeck: Container, Warnstreifen am Rand) | Zwischen Warnstreifen (über der Bandoberkante z 213) und Container liegt eine hintere Plattform bis zur Bandoberkante von B (z 229, Bildschirmzeile 133); der Container steht auf z 229 | So endet der Container bündig mit der Wandlinie von B; sein rechtes Ende (x 400 bis 410) läge sonst über dem Boden von B |
| G5-8 | scheibe.txt (Frachtcontainer x 330 bis 410, Band A endet bei 400) | Der Container gehört zum Blatt A und ragt 10 px in B; Zeichenregel: je Ebene erst alle Karten aller Blätter, dann die freien Bilder nach `folge` | Sonst überdeckte die Wandkarte von B das Containerende |
| G5-9 | Auftrag 4, 1.6 (Himmel mit halber Kamerageschwindigkeit) | Himmel nur in A (400 × 144, aus der Kamerabewegung berechnet); kein Beschnitt, weil Wand und Boden von B und F deckend sind; der Test prüft die Deckung bei jeder sechsten Kamera-x | B (Innenhof unter Eis) und F (innen) haben keinen Himmel; so braucht der Einbau keine Clip-Regel |
| G5-10 | Auftrag 4, 1.6 (Plattenfugen alle 16 px in der Tiefe; Fugen in x offen) | Platten ohne Versatz: A 64 × 16 (wie die Bodenmarken der Platzhalter), B 32 × 16, F 48 × 16 | Versetzte Platten lasen sich in der Probe wie Mauerwerk |
| G5-11 | Welt 2.3 (Band F ab x 1700) | F ist ab 1700 gezeichnet, obwohl das Bild erst ab Kamera-x 1792 (Welt-x 1792) zu sehen ist | Das Band beginnt bei 1700 (Gegner laufen von links ein); der Satz `hintergrund asservatenkammer` nennt 1700 bis 2304 |
| G5-12 | Auftrag 4, 1.6 (Ebenen; keine Hintergrundanimation genannt) | Der Dampf über dem Gitter in B ist eine Folge aus 3 Bildern zu 8 Frames (`dauer`), Bild aus `welt.frame`; Bild 0 als Standbild genügt | Dampf, der stillsteht, liest sich als Fleck; reine Darstellung ohne Wirkung auf die Logik |
| G5-13 | scheibe.txt (vordergrund zeilen=24) | Die Kabeltrommeln bleiben in den 24 Zeilen am Bildrand und sind unten abgeschnitten | Lage und Höhe wie die Sätze; die Platzhalter zeichnen dieselben 24 Zeilen |
| G5-14 | Auftrag 4, 1.2 (Figurenpixel zwei Treppenstufen vom Hintergrund; prüfbar: kein Bodenton in einer Figurenpalette) | Geprüft wird die prüfbare Form (kein Bodenton gleich einem Ton der Figurentreppen, `KONTUR`, `SCHATTEN_BLAU`, Leuchttöne, gebaute Figurenblätter). Nächste Abstände (redmean): Grundtöne der Böden 12 bis 15 zu dunklen Tönen von `OVERALL_BOLZER`, `HOSE_DUNKELGRAU`, `KISTE_GRAU`; Fugentöne 5 bis 8 zu Schattentönen von `HOSE_GRAUBLAU` und `HOSE_DUNKELGRAU` | Die Außenkontur in `KONTUR` trennt jede Figur vom Boden; die nahen Töne sind dunkle Fugen und Innenschatten, keine Flächen gegen Flächen. Abnahme im Kontaktbogen mit Figuren |
| G5-15 | Auftrag G5 (Panorama des ganzen Abschnitts, alle Ebenen, 1×) | Der Himmel steht im Panorama bei der ersten Kamera-x des Abschnitts (A: 0); im zweiten Panorama stehen Vela an drei Tiefen und die Stage-Gegner aus den gebauten Blättern (fehlt ein Blatt, fehlt die Figur), Behälter als Umriss | Mit Parallaxe gibt es kein einziges „ganzes“ Bild; die Figuren zeigen, dass die Bodenzeilen stimmen |
| G5-16 | Welt 10.1 (Anzeigeleiste bis Zeile 23) | Über Zeile 24 bleibt der Hintergrund dunkel und ruhig: Kometenschweif dort ausgeblendet, Kranbrücke und Rohrbrücke ab Zeile 24 bzw. 25 | Schrift und Balken der Leiste liegen ohne eigenen Grund auf der Szene |
| G5-17 | Welt 2.4 (Schaufenster als Glasscheiben, zerbrechen beim Wurf, E9) | Die Schaufenster stehen an den Lagen der vollen Stage (x 470 bis 530, 560 bis 620), aber nur heil; Scherben gibt es nicht | Die Scheibe hat keine Glasscheiben als Hindernisse (scheibe.txt); Zerbrechen gehört zur vollen Stage |
| G3-1 | Auftrag 4, 4 (Zünder: Raketenwerfer auf der Schulter; Ansicht wie der Rammbock, G0c-1) | Der Werfer liegt auf der fernen Schulter, gezeichnet vor dem Rücken und hinter Kragen und Kopf; die nahe Hand hält das Rohr vorn, die ferne den Griff hinten | Auf der nahen Schulter verdeckte das Rohr Visier und Kinn (Lesbarkeit, Auftrag 4, 1.4); so bleiben Helm und Visier frei, und Heck und Mündung stehen neben dem Kopf vor |
| G3-2 | Auftrag 4, 2.3 (Anker = Fußpunkt) und 2.5 (Anker im Bild) | Wie G1-9: Jedes Bild von Zünder und Ballast steht mit seiner untersten Zeile auf der Ankerzeile (`untersteZeile` in `bild()`); Luftposen heben sich über die Höhe `h` der Logik, liegende Posen liegen auf dem Boden. Dazu ein letzter Durchgang gegen Streupixel zwischen Teilen (`streupixelEntfernen`, Kontur geschützt) und gegen einzelne Konturpixel im Inneren | Fußpunkte von Luftposen lägen sonst außerhalb des Bildes; nichts ragt unter den Boden; angeschnittene Augen und verdeckte Innenkonturen ließen einzelne Pixel stehen (Regel 1.3) |
| G3-3 | Welt 6 (Rakete in A+6, 45 px vor ihm, 44 px hoch) und docs/grafik.md 4.7 („dort sollte im Schussbild die Mündung liegen“) | Die Mündung liegt beim Zielen etwa 26 px vor dem Fußpunkt bei 45 px Höhe; Zündung (A+5) und Rückstoß (A+6 bis A+15) zeigen ein Mündungsfeuer bis 37 px und einen Rückstrahl hinter dem Heck (Visiertöne) | Mit 30 px Werferlänge auf der Schulter reicht die Mündung nicht bis 45 px; das Feuer überbrückt die Lücke zur Rakete |
| G3-4 | G4-16 (Maße und Farben des Werfers verbindlich für den Zünder) | Form, Teile und Farben wie der Gegenstand von G4, getragen aber 1,2-fach (Rohr 5 statt 4 px dick, 34 statt 28 px lang mit Heck und Ring); Griff in Stahl wie bei G4 | Auf der Schulter hinter Kopf und Hand blieb vom 4 px dicken Rohr in Spielgröße zu wenig für die Silhouette „Zünder mit Rohr auf der Schulter“ (Auftrag 4, 1.4); am Boden zeigt die Darstellung den Gegenstand von G4 |
| G3-5 | Auftrag 4, 3 (Ballast `stand` 2, atmend; keine Dauer) | 20/20 Frames als Richtwert | Langsamer als die Haltung des Bolzers (3 × 5), der Boss atmet schwer; die Darstellung schleift über `modus_uhr` |
| G3-6 | Auftrag 4, 1.4 (Füße rutschen nicht) und 3 (Ballast `gehen` 5 zu 8 Frames) | Jeder Fuß steht 4 Bilder (3 Bildwechsel, Ferse – flach – flach – Spitze, je 10 px zurück) und schwingt 2 Bildwechsel; der ferne Fuß setzt in Bild 3 auf, die Hüfte liegt beim Gehen 2 px hinter dem Fußpunkt (Standweg mittig unter den Hüftgelenken), Beine 17 + 17 statt kürzer | Bei 5 Bildern deckt nur ein Standweg von 3 Wechseln mit beiden Füßen jeden Bildwechsel (Prüfung in `bauen.ts`); der Abstand von Spitze und Ferse im Wechsel hält die Sohlen getrennt; 30 px Standweg brauchen die langen Beine |
| G3-7 | Auftrag 4, 3 (Ballast `ansturm` 4 Laufbilder; keine Dauer; Auslauf 30 px in 15 Frames, Welt 7.3) | `ansturm` 4 Frames je Bild (Standfuß 16 px zurück bei 4 px/Frame); zusätzlich `ansturm_bremsen` (1 Bild) für den Auslauf im Nachlauf | Richtwert passend zur Geschwindigkeit; ohne Bremsbild rutschte ein Laufbild 15 Frames über den Boden |
| G3-8 | Welt 7.1 (TAUMELN 78 Frames nach dem Spezialangriff; Auftrag 4, 3 nennt keine Animation) | `taumeln` = Trefferbild (h+1 bis h+8, Stillstand wie F1) und Bilder 1 bis 3 von `stoss_rueckzug`, 8/20/30/20 | Gewollte Wiederholung; die Bewegung von der Figur weg gleicht dem Rückzug |
| G3-9 | Auftrag 4, 3 (Armschwung 3 Schwünge je 5 Bilder) und 2.4 (Rumpf als starre Form) | Drei verschiedene Schwünge (Vorhand, Aufwärtshaken, Hammer); im Ausholen rollt die nahe Schulter 3 px zurück, im Trefferbild 5 px vor, Ellbogen und Handgelenk gestreckt (1,5 und 1 px, wie G0-6); Dauern 9/8/3/8/8 je Schwung | Die Folge ist nur lesbar, wenn jeder Schwung anders aussieht; der Rumpf dreht in der Puppe nicht, das Vorrollen der Schulter deutet die Drehung an und bringt den Greifer auf 56 px |
| G3-10 | Auftrag 4, 4 (Zünder; Materialien Uniform, Helm, Visier, Rohr) und 1.2 (Farbbudget) | Keine Haut: unter Helm und Visier eine dunkle Haube in Uniformtönen; Leder einstufig (Ton 2) mit Uniform 1 als Schatten; Abzeichen einstufig im Visierorange | Uniform 3, Stahl 4, Visier 3 (normal und leuchtend), Rohr 3 Töne und `KONTUR` füllen bereits 14 Farben |
| G3-11 | Auftrag 4, 4 (Visier leuchtet beim Zielen) | Leuchtend: Fläche `VISIER_ORANGE` 4, Rand 2; ohne Leuchten Grund 1, Licht 2, Glanz 4; beim Zielen wandert eine Abtastlinie (Gesichtsmaske 7 × 1 auf dem Visier) über die Scheibe | Der Zustand Zielen ist so ohne Debug-Anzeige lesbar (Auftrag 4, 1.4), und die vier Bilder unterscheiden sich |
| G3-12 | Auftrag 4, 4 (Ballast: Schweißerbrille auf der Stirn; Hose dunkelgrau) und 1.2 | Die Gläser leuchten in `BRILLE_GLUT` in der Ankündigung und beim Brüllen im Auftritt, sonst Stahlglas; Licht der Hose in `STAHL` 1; Haar, Bart, Band, Gürtel, Schlauch und Stiefel in Hosentönen | Ein Leuchtsignal macht die Ankündigung vor jedem Angriff lesbar; das Budget erlaubt keine dritte Hosenfarbe neben vier Stahltönen |
| G3-13 | Auftrag 4, 3 (Ankündigung 2 Bilder, mindestens 15 Frames vor jedem Angriff) und Welt 7.3 (Armschwung holt 17 Frames aus, Ansturm 20, Presse 15 Frames Hocke) | Eine Ankündigung für alle drei Angriffe (breite Hocke, gespannter Ladearm, leuchtende Brille), sie ist zugleich die Hocke der Presse; beim Armschwung folgen in n = 15 und 16 das weite Ausholen, beim Ansturm schleift sie bis n = 19 | Jeder Angriff zeigt so 15 Frames dasselbe Warnsignal; Schwung 2 und 3 holen ohne Ankündigung aus (sie folgen nur auf einen Treffer, E18) |
| G3-14 | Auftrag 4, 3 (Körperpresse: Absprung 2, Flug 1, Aufprall 2, Aufstehen 2) | Bauchklatscher: Trefferbild bäuchlings fallend ab Bahnframe 51, platt ab der Landung; Bild nach `boss.kp_k`, nach der Landung nach der Zeit seit `kp_landung` | Die Fläche liegt ±25 px um den Boss (Welt 7.3); flach liegend deckt er sie sichtbar |
| G3-15 | Welt 6 (rückwärts mit Blick zur Figur, wenn er sich von ihr entfernt) | Geht ein Gegner gegen seinen Blick ((x − `x_vor`) · `blick` < 0), laufen die Gehbilder rückwärts | Sonst rutschen die Füße beim Zurückweichen um 14 px je Bild |
| G3-16 | Welt 6 (schnell 2,25 px/Frame) | `gehen_schnell` = dieselben 8 Bilder zu 3 Frames (7 / 2,25 ≈ 3,1) | Schritt 7 px bleibt; Fehler 0,25 px je Bild |
| G3-17 | Welt 6 (Kolbenhieb wie BA, 42 Frames im Vorbild) | Werfer umgedreht, Stoß mit dem Heck voran (45 px), dann Werfer hochnehmen; im Nachlauf `stand` | Ausholen, Treffer und Rückzug nach `NAH_ANGRIFFE.BA`; das Halten eines Rückzugsbilds über 12 bis 36 Frames Nachlauf sähe eingefroren aus |
| G3-18 | Auftrag 4, 3 (Zünder: … tot; keine Bildzahl; GEHALTEN ist ein Gegnermodus, Kampf 7) | `tot` 5 Bilder wie `umgeworfen` ohne Werfer über die Bahn F4; zusätzlich `gehalten` (1); geworfen zeigt `umgeworfen` | Ab dem Tod liegt die Waffe als Gegenstand am Boden (Welt 6); jeder Modus braucht eine Animation (Auftrag 4, 3) |
| G3-19 | Auftrag 4, 3 (Ballast; GEHALTEN ist auch ein Modus des Bosses, Welt 7.1) | zusätzlich `gehalten` (1): gekrümmt | Die Figur kann den Boss greifen (Kampf 8) |
| G7-1 | Auftrag 4, 2.3 (`dauer` ist Richtwert; die Darstellung nimmt die Dauer aus der Aktionsuhr) | Die Tabelle Uhr → Bild ist die Folge der Bilddauern im Atlas (`bildZurUhr` über die Dauern der Animation, Schleifen über (Uhr − 1) mod Summe + 1); die Uhr kommt aus der Logik (`uhr`, `modus_uhr`, Frame − A, Bahnzustand). Zahlen, die der Atlas nicht trägt, aus `werte.ts` | Die Dauern der Blätter sind dieselben Tabellen, die G1 bis G3 aus `werte.ts` gerechnet haben (4.1 bis 4.6); so gibt es eine Quelle, und `grafik_aktiv`/`grafik_dauer` prüfen sie gegen die Logik |
| G7-2 | 4.1 (Kette: Tabelle nach `uhr`) und Kampf 5.6 (Ausfallschritt: aktiv `AUSFALL_AKTIV_VON` bis `_BIS`) | Mit Ausfallschritt laufen die Kettenbilder um `AUSFALL_AKTIV_VON − KETTE_AKTIV_VON` (6, 4, 6 Frames) später, davor hält Bild 0; in Kette 4 gilt ab uhr 17 (zweites Fenster) wieder die Uhr ohne Versatz. Der Magnetstoß steht im Fenster des Ausfallschritts | Sonst stünde das Trefferbild 4 bis 6 Frames vor den aktiven Frames (Auftrag 4, 1.4) |
| G7-3 | G1-7 (Mündung bei 25 px, Rakete bei 58 px: Mündungsblitz oder Lücke) | Mündungsblitz aus dem Trefferfunken: Bilder 0 und 1 von `funke` je 2 Frames ab dem Abschuss P+7 (uhr 7 bis 10), Mitte 4 px vor der Mündung (`MUENDUNGSBLITZ`); bis zum Heck der Rakete bleibt eine Lücke von etwa 10 px | Ein Explosionsbild an der Mündung läse sich als Einschlag; die Rakete steht nach der Logik bei 58 px und wird nicht verschoben. Ein eigenes Blitzbild (Strahl 25 bis 50 px) wäre eine Ergänzung im Blatt `objekte` (Bericht) |
| G7-4 | 4.7 (Trefferfunke am Trefferpunkt, Vorschlag G4: Ziel minus 20 px zum Angreifer, Höhe des Angriffs) | x = Ziel-x + 20 px zum Angreifer hin (bei gleichem x gegen dessen Blick; Behälter ± 12 px), Tiefe des Ziels, Höhe über dem Ziel nach dem Angriff (`FUNKE_HOEHE`: Kette in Ansatzhöhe der Faust 47, 46, 65, 41; Explosion, Kniestoß, Landung 30; Spezialangriff 12; Gegnerschläge 35 bis 50; Behälter 16); kein Funke bei W und beim Wurf WU (dessen Aufprall zeigt Staub) | Der Wurftreffer WU ist das Packen über dem Kopf, ein Funke vor Velas Brust las sich falsch |
| G7-5 | 4.7 (Staub beim Aufprall einer Umwerf- oder Wurfbahn und bei der Landung des Neueinstiegs) | Zusätzlich Staub bei der Landung der Körperpresse (`boss.kp_landung`); Aufprall erkannt am Wechsel von `bahn_boden` 0 auf > 0 (je Slot gemerkt) | Die Presse landet mit Bildschütteln (KA10) bäuchlings auf dem Boden; nach der Explosionsbahn des Bosses bleibt `bahn_frame` = `bahn_boden` stehen, daher der Wechsel statt der Gleichheit |
| G7-6 | 4.5 (Kolbenhieb: Bild 3 und 4 nach dem Trefferbild; mit `aktion` NACHLAUF `stand`) | Rückzugsbilder 3 und 4 (3 + 2 Frames) am Anfang des Nachlaufs (Frame − `angriff_aktiv_ende` = 1 bis 5), danach `stand` | Die Logik wechselt nach dem letzten aktiven Frame sofort auf `aktion` NACHLAUF; ohne diese Regel kämen Bild 3 und 4 nie vor, der Zünder spränge aus dem Stoß in den Stand |
| G7-7 | Kampf 8.4 (der Geworfene bleibt E+1 bis E+21 in der Haltelage, losgelassen in E+22 bei 13 px und 59 px Höhe) und „die Darstellung zeichnet am Anker“ | Darstellungsversatz des getragenen Gegners (Bahn F3 im Stillstand, Figur in WURF mit `wurf_ziel`): je Bild von `wurf` 0, ½, ganz von der Haltelage zur Loslassstelle der Logik (`WURF_TRAGEN_ANTEIL`, `WURF_LOSLASS_X`, `WURF_LOSLASS_HOEHE`), Schatten mit; ab E+22 die Lage der Logik ohne Sprung | Vela hebt ihn in ihrer Animation über den Kopf; am Boden vor ihr stand er kopfüber wie im Handstand. Die Logik bleibt unberührt |
| G7-8 | Auftrag 4, 3 (Bolzer: „tot (umgeworfen + Blinken)“; G2, G3: „Blinken zeichnet die Darstellung“) | Tote Gegner blinken ab der Ruhe ihrer Bahn bis zur Freigabe des Slots: in jedem zweiten Framepaar (`BLINKEN_TAKT` 2, nach `welt.frame`) nicht gezeichnet, mit Schatten; der Ballast blinkt nicht (sein Slot bleibt bis zum Ende belegt, K4) | Regel ohne eigene Bilder wie das Blinken der Gegenstände (Welt 9.3) |
| G7-9 | 4.8 (Hintergründe der Scheibe) und Kampf 11.2 (Prüfbühne) | Die Hintergrundblätter gelten nur für die Bühne `scheibe` (`HINTERGRUND_BUEHNE`); auf anderen Bühnen (Prüfbühne der Abnahmeszenen) zeichnet die Darstellung die Flächen und den Vordergrund der Platzhalter unter bzw. über den Sprites | Die Karten liegen an den Welt-x und Ky der Scheibe; auf der Prüfbühne (Ky 0) lagen die Kabelrollen von A mitten über den Figuren |
| G7-10 | G1-12 (Figur: Liegen und Aufstehen gespiegelt wie der Flug) und G2-10 (Gegner: nur Umgeworfen und Tot genannt) | Auch Gegner zeigen `liegen` und `aufstehen` gespiegelt wie den Flug davor; Regel für Figur und Gegner: gespiegelt, wenn `bahn_richtung` = `blick` (Flug in Blickrichtung). `bahn_richtung` bleibt nach dem Ende der Bahn stehen (`bahn.ts`); geworfene Gegner (`geworfen`) zeigen in Flugrichtung | Sonst spränge der Kopf beim Übergang vom Aufprall ins Liegen auf die andere Seite |
| G7-11 | 4.5, 4.6 (Gehbild des Zünders und des Ballast über `modus_uhr`) und G2 (Zähler der Gehframes) | Alle Gegner nehmen das Gehbild aus den Gehframes des Verlaufs (Frames mit `aktion` GEHEN seit Beginn des Gehens, `verlauf.ts`); gegen den Blick rückwärts (G3-15). Ohne Verlauf (Tests) `modus_uhr` | Der Modus beginnt oft mit Stehen (ANNAEHERN, BEREIT); mit `modus_uhr` begänne das Gehen mitten im Zyklus |
| G7-12 | Auftrag 4, 1.5 (Schatten wie heute, Schattenblau, feste Deckkraft) | Schatten als pixelgenaue Ellipse (Pixelmitte in der Ellipse) in `SCHATTEN_BLAU` mit Deckkraft 0,45, einmal je Größe erzeugt; Breiten und Höhe wie bisher (`masse.ts`), kleine Objekte nach der Breite ihres Bildes statt der Platzhaltermaße | Die geglättete Ellipse des Canvas hätte Halbtöne am Rand (1.1: keine Kantenglättung) |
| G7-13 | 4.2, 4.3 (Umgeworfen und Tot nach k = Frame − W mit Tabellen je Bahn) | Umgeworfen und Tot aller Gegner nach dem Bahnzustand wie 4.5 (Stillstand, steigend, fallend, Aufprall = erste `dauern[3]` Frames ab dem Bodenkontakt, danach liegend); das liegende Bild von `tot` bzw. `fall` erst ab der Ruhe der Bahn (F4b: während des Rollens Bild 4, wie 4.2) | Gleich der Tabelle für F1, deckt F2, F3 und F4b ohne eigene Tabellen und auch den Boss mit seinen Bahndaten |
| G7-14 | G4-15 (Schutzblinken: nur die Pixel in `KONTUR`) | Konturblätter werden beim Laden aus jedem Sprite-Blatt erzeugt; im Blinkpaar zeigt Vela nur ihre Kontur, der Werfer in der Hand ebenso; Magnetstoß, Eiswelle und Mündungsblitz blinken nicht | Effekte haben keine Kontur (G4-1) und gehören nicht zum Körper |
| G7-15 | 4.9 (Schrift ersetzt `SCHRIFT_5X7` auch im Hinweis „AUFZ“; große Texte ohne Kasten) | „AUFZ“ in der kleinen Schrift von G6 an der Lage von heute, davor der rote Punkt (`FARBE.aufzeichnung`); große Texte ohne den dunklen Textkasten | Umriss und Schatten der Schrift machen den Kasten überflüssig (4.9) |
| G7-16 | Auftrag 3, 2.4 (`foto.mjs` schreibt `scheibe_*.png`) und Phase 3 (Szenenbilder `szene_*.png`) | `foto.mjs` schreibt standardmäßig `szene_*.png` und dazu `szene_arena.png` und `szene_nah.png`; `--platzhalter` zeichnet die Rechtecke (so sind `scheibe_*.png` entstanden), `--nur-reihe` lässt Arena und Nahbild weg | Die Bilder der Platzhalter bleiben als Stand von Auftrag 3 erhalten |
| G7-17 | 4.7 (Explosion: Kern bis zur Freigabe des Slots, danach die Darstellung bis Uhr 24) | Die Explosion kommt ganz aus der Effektliste, gestartet mit dem Ereignis `EX:gn` bzw. `EX:on` am Einschlagpunkt; ihre Uhr zählt echte Frames ab dem Einschlag (gleich der Explosionsuhr der Logik, Explosionen haben keinen Trefferstopp). Das Objekt in der Flugphase EXPLOSION zeichnet die Darstellung nicht | Ein Weg statt zweier (Objekt, dann Effekt); kein Sprung beim Freigeben des Slots |
| G7-18 | G1-7 (Anker des Werfers bei W − Griffpunkt; Griffpunkt y −1,5) | y des Ankers gerundet (`Math.round(W.y + 1,5)`), Spiegeln mit dem Blick um Velas Fußpunkt | Bilder stehen auf ganzen Pixeln |
| G7-19 | Kampf 3 (Objekttyp Effekt) | Objekte des Typs `Effekt` zeichnet die Darstellung mit Sprites nicht | In der Scheibe entstehen keine (nur Prüfszenen könnten sie anlegen); Funke, Staub, Trümmer und Explosion führt die Effektliste |
| U1-1 | Auftrag 5, U1 (Zeichenklasse multipliziert an genau einer Stelle; 1×-Bilder mit drawImage ganzzahlig hochskaliert) | Die Methoden des `Zeichner` rechnen jede Spielkoordinate über `bx`, `by`, `bl` in Bildpixel und zeichnen mit der Einheitsmatrix, statt eine Skalierungsmatrix zu setzen; die Schattenellipse (pixelgenau in Spielpixeln) legt der Zeichner einmal je Größe in Bildpixeln an und zeichnet sie 1:1 (`pixelEllipse`) | Chromium rundet beim skalierten Zeichnen einer halbdurchsichtigen Canvas-Quelle um eine Stufe anders als 1:1 (gemessen: Blau 101 statt 102 unter dem Schatten); so bleibt die Grafik von Auftrag 4 Pixel für Pixel gleich, die Szenenbilder `szene_0300` bis `szene_1500` und `szene_arena` sind byte-gleich |
| U1-2 | Auftrag 5, Schnittstelle U1/U2 („Spiegeln um die Ankerspalte“) | Gespiegelt wird bei jedem Massstab um die Mitte der Spielpixelspalte des Ankers (Bildposition 2 · bildX + 1); bei Massstab 2 rückt die Ankerspalte des Blatts dabei um 1 Bildpixel, bleibt aber im selben Spielpixel | Die Logik ist um die Spielpixelmitte symmetrisch (Trefferflächen −hinten bis vorn); nur so ergeben ein 1×-Blatt und dasselbe Blatt verdoppelt auch gespiegelt dasselbe Bild (`darstellung_2x.test.ts`) |
| U1-3 | Auftrag 5, Schnittstelle (Konturblatt aus den Randpixeln: deckend mit durchsichtigem Nachbarn) | Rand mit so vielen Ringen wie der Massstab des Blatts (Massstab 2: 2 Bildpixel = 1 Spielpixel); Kantennachbarn, der Blattrand zählt als durchsichtig | Die Kontur der Gliederpuppe ist bei 2× zwei Bildpixel breit; ein einzelner Ring wirkte im Blinken halb so dick |
| U1-4 | Auftrag 5, U1 (ganzzahlig auf das Fenster skaliert; kleiner als 768 × 448 darf weich verkleinert werden) | Ab 768 × 448 Gerätepixeln ganzzahlig (1×, 2× …) mit `image-rendering: pixelated`; darunter so groß, wie es passt, mit `image-rendering: auto` (weich) | Festlegung; ein Fenster unter 768 × 448 Gerätepixeln zeigte sonst nur einen Ausschnitt |
| U1-5 | Auftrag 5, Schnittstelle (`"massstab"` für Sprite-Atlanten) | Auch die Atlanten von Hintergrund, Blende und Anzeige lesen `massstab`: Rechtecke, Kacheln, Maße, Anker, Laufweite, Zeilenhöhe, Balkenbreite und `zahlDx` in Pixeln des Blatts; Weltlagen (Karten und freie Bilder x, y; Blende `weg`) und die Lagen aus `werte.ts` bleiben Spielpixel | U4 kann die Hintergründe als 2× bauen, ohne die Darstellung zu ändern; geprüft im Pixelvergleich mit verdoppelten Blättern |
| U1-6 | Auftrag 5, Schnittstelle (Blattwahl nach `blaetter.json`) | Antwortet der Server mit 404, gilt die bisherige Wahl; ein anderer Inhalt als eine Liste von Namen bricht das Laden ab (Rückfall auf die Rechtecke mit Meldung); Blende und Anzeige haben keine Grok-Fassung | Wie ein fehlendes Blatt (9.2); bis `bauen.ts` die Liste schreibt, meldet Chromium den 404 einmal in der Konsole |
| U1-7 | G7-16 (`szene_nah.png`: Ausschnitt 152 × 88 dreifach, 456 × 264) | Ausschnitt 152 × 88 Spielpixel (304 × 176 Bildpixel), Canvas zweifach: 608 × 352 | Dreifach je Spielpixel wäre 1,5-fach je Bildpixel, also nicht ganzzahlig |
| U1-8 | Auftrag 5, U1 (Debug-Anzeige in Spielpixeln, Platzhalter unverändert) | Linien 1 Spielpixel breit, Striche 2 Spielpixel; gestrichelte Linien beginnen auf der Pixelgrenze und sind jetzt scharf (bei 1× waren die Strichenden halb gedeckt), schräge Linien und die Ellipsen der Platzhalter werden feiner geglättet; `szene_debug.png` ändert sich nur dort, `scheibe_*.png` bleiben der Stand von Auftrag 3 | Folge der feineren Rasterung; die Schrift 3 × 5 ist pixelgleich verdoppelt |
| U1-9 | 9.2 (Laden; `objekte` ohne `stand`) | Die Prüfung des Sprite-Atlas nimmt das Blatt `objekte` nach dem Blattnamen aus, nicht nach dem Dateinamen | Sonst schlüge `objekte_grok.json` fehl (gefunden mit `darstellung_2x.test.ts`) |
| U2-1 | Auftrag 5, U2 („Streupixel entfernen wie bisher“) und Stilhandbuch 1.3 | Bei 64 Farben steht ein Pixel allein, wenn keiner seiner acht Nachbarn ihm ähnlich ist (`farbAbstand` ≤ `streuAbstand` 60); die Prüfung im Bau nutzt dieselbe Regel (`streupixelAehnlich`) | Die strenge Regel (kein gleichfarbiger Nachbar) färbte am Rammbock 78 361 Pixel um und löschte Gesicht, Steppnähte und Schnürung: Benachbarte Töne eines Verlaufs sind bei 63 Farben verschiedene Farben. Mit der Ähnlichkeit werden nur 2 320 echte Ausreißer umgefärbt |
| U2-2 | Auftrag 5, U2 (Kontaktbögen „keine Löcher“) und 5.1 (Freistellen) | Nach dem Schließen werden vom Grund eingeschlossene Bereiche Figur, wenn ihre Pixel im Mittel weiter als `lochToleranz` 12 vom Grund liegen (Rammbock: 98 Bereiche, 19 728 Quellpixel); echte Lücken (Mittel unter 12) bleiben durchsichtig (27) | Grok malt tiefe Schatten der Hose fast in der Grundfarbe (Abstand 14 bis 40); in der Probe `probe_grok_2x.png` scheint dort der Hintergrund durch. Der Grund selbst ist sauber (Abstand 0 bis 5) |
| U2-3 | Auftrag 5, 1 (Kontur: dunkle Kontur bleibt, sonst 1 Bildpixel nachsetzen) | „Dunkel“ heißt Helligkeit (Luma nach Rec. 601) ≤ `konturHelligkeit` 40. Nachgesetzt wird außen: Die Figur wächst je Seite um 1 Bildpixel; die Zielhöhe 142 gilt samt Kontur (Suche des Faktors ±3 Zeilen) | Groks eigene Außenlinie liegt fast in der Grundfarbe und fällt beim Freistellen weg; außen gesetzt bleibt jedes Detail der Figur. Wie bei v1 (G0b-5) gehört die Kontur zur Zielhöhe |
| U2-4 | Auftrag 5, 1, Punkt 4 (Standfuß wandert je Bild um die Gehstrecke zurück, Rest protokollieren) | Der Standfuß wird über den ganzen Zyklus gewählt (derselbe Fuß, genau zwei Übergaben zu einem Fuß davor, kleinste Abweichung relativ zur Körpermitte). Der Rest wird gleichmäßig auf die Bildwechsel verteilt (Rammbock: −1,5 Bildpixel je Bild) statt am Zyklusende; die Anker liegen im Mittel auf den Fußpunkt-Ankern. Zeilen `gehen` mit kopierten Bildern (`gehen_schnell`) werden nur gemessen | Mit der Regel „hinterer Fuß beim Doppelstand“ oder einer Paarung je Bildwechsel wählte der Umsetzer an Groks Zwischenbildern den falschen Fuß. Ein gleichmäßiges Rutschen von 0,75 Spielpixeln fällt weniger auf als ein Sprung von 6 Spielpixeln einmal je Zyklus |
| U2-5 | Auftrag 5, 4 (kein Figurenpixel dunkler als der dunkelste Bodenton des Abschnitts, außer in der Kontur; sonst Aufhellung um eine Stufe) | Bodenton = dunkelstes Pixel der Kacheln aller Bodenkarten der Hintergrundblätter A, B, F (`#0F1016`, Helligkeit 16,4, F Tränenblech), für alle Figuren, solange die Hintergründe aus Code kommen. „Kontur“ = Außenkante nach dem Nachsetzen; „eine Stufe“ = nächste Palettenfarbe mit mindestens der Helligkeit des Bodentons; Maß ist die Helligkeit (Luma) | Eine Figur steht in jedem Abschnitt; der Abschnitt ist beim Umsetzen nicht bekannt. Die Palette hat keine Treppen mehr, die nächste Stufe ist die nächste hellere Palettenfarbe |
| U2-6 | Auftrag 5, Phase 1 (eigener Ordner `fremd/<figur>_34/`, „der neuere Ordner gewinnt“) | Neue Zeile `datum <JJJJ-MM-TT>` in `zuordnung.txt`; bei gleicher `figur` gewinnt das spätere Datum, bei gleichem Datum der im Alphabet spätere Ordnername; `npm run grafik` meldet die Ersetzung | `quelle.txt` gehört Opus und ist freier Text; das Datum der Lieferung ist eindeutig, Ordnernamen allein sind es nicht (`rammbock_10` vor `rammbock_9`) |
| U2-7 | Auftrag 5, 1 (Hintergrundfarbe vor dem Schnitt entfernen) | Farben bis `toleranzHintergrund` 45 an der Hintergrundfarbe eines Blatts nehmen nicht am Medianschnitt teil und gehen danach auf die nächste Palettenfarbe (Rammbock: 3 854 von 76 995 Quellfarben). Dunkelster Ton und Kontur werden dadurch `#201A13` statt `#0C0A0C` | Das Schließen nimmt Groks Innenlinien mit ihrer fast schwarzen Farbe in die Figur (Abstand zum Grund unter 45, meist 15 bis 25); ohne den Ausschluss enthielt die Palette eine Farbe 8 Einheiten neben dem Grund |
| U2-8 | Auftrag 5, Phase 1 (`vergleich.ts`: auf rammbock_grok umstellen oder entfernen) | `vergleich_rammbock.png` zeigt den Grok-Rammbock (`rammbock_grok`, natürliche Größe 2×) gegen die Gliederpuppe und Vela (2× vergrößert) und den Streifen auf dem Platzhalter von Abschnitt A bei doppelter Darstellung; der Streifen 1× entfällt | Bild für Haltepunkt 1 ohne Browser; Anker wie die Darstellung (linker oberer Bildpixel des Fußpunkt-Spielpixels) |
| U2-9 | E25 (bis zu 64 Farben je Figur) | 63 deckende Farben, mit durchsichtig 64 (Zählung wie `FARBBUDGET`); zwei Runden Nachschärfen nach dem Schnitt | Beide Lesarten von „64 Farben“ sind damit erfüllt |
| U2-10 | Auftrag 5, Phase 1 (Animationsnamen, Dauern und aktive Bilder wie das Gliederpuppen-Blatt) | `zuordnung.txt` übernimmt Namen, Schleife, Dauern und `aktiv` aus `rammbock.json` (neu `schlag` = `schlag_a`, `wiegen` Schleife, Dauern von `aufstehen_hocke`, `hocke_ankuendigung`, `umgeworfen`, `liegen`, `aufstehen`, `geworfen`, `tot`); Inhalt wie 4.2: `getroffen` D2, D3, D1, `kampfhaltung` C1, C5, `aufstehen` D10 bis D13, C15, D14. `bauen.ts` bricht ab, wenn ein Grok-Blatt abweicht | Die Darstellung (`zuordnung.ts`) und die Tests `grafik_aktiv`, `grafik_dauer` erwarten diese Namen und Dauern |
| U2-11 | Schnittstelle U1 (Anker bei Maßstab 2: linker oberer Bildpixel des Fußpunkt-Spielpixels; Spiegeln um 2 · bildX + 1) | Im Atlas `ankerY` = unterste Zeile − 1, `ankerX` = linke Spalte des Fußpunkt-Spielpixels (Mitte der Füße abgerundet); in der Zuordnung gespiegelte Zellen `ankerX` = Breite − 2 − `ankerX` | Die unterste Zeile liegt auf der unteren Bildpixelzeile des Fußpunkts wie bei vergrößerten 1×-Blättern; die Spiegelachse bleibt in der Mitte der Füße, die Figur springt bei Blick links nicht |
| U2-12 | Auftrag 4, 2.2 (je Animation eine neue Zeile, Blatt höchstens 2048 × 2048) | Grok-Blätter setzen die Zeile fort (`zeileFortsetzen`, G1-8), Breite bis 2048 | Bei 2× wäre das Blatt mit einer Zeile je Animation 2141 Bildpixel hoch |
| U2-13 | Auftrag 4, 2.2 (Kontaktbögen 2×) und Auftrag 5, Phase 1 (natürliche Größe) | Kontaktbögen der Grok-Blätter in natürlicher Größe mit Schrift 2× aus einer eigenen Funktion (`grokKontaktBogen`), `kontakt.ts` unverändert | `kontaktBogen` vergrößert Bild und Schrift gemeinsam; bei Faktor 1 wäre die Schrift 3 × 5 Bildpixel klein |
| U2-14 | Auftrag 5, 1 (Atlas mit `"massstab": 2`) | Das Feld schreibt der Umsetzer (`grokAtlasText`: `atlasText` aus `blatt.ts` plus eine Zeile); `blatt.ts` bleibt unverändert, die Gliederpuppen-Blätter bitgleich | Kein Eingriff in den Werkzeugkasten für ein Feld, das nur Grok-Blätter tragen |

## 8. Weg nach E24

Entscheidung des Nutzers an Haltepunkt 1 (2026-10-03, `docs/erkenntnisse.md`,
E24):

- Figuren und Objekte entstehen als Gliederpuppe aus dem Werkzeugkasten.
- Die Grok-Blätter des Rammbocks (`spiel/grafik/quelle/fremd/rammbock/`)
  sind Vorlage für die Posen Getroffen, Umgeworfen, Liegen, Aufstehen,
  Spott und Sprungtritt aller Figuren, damit die Puppen weniger steif
  wirken: Haltung von Kopf, Rumpf und Gliedern nachbauen, nicht abpausen.
- Rammbock: Arme etwas schlanker, Figur mehr in Dreiviertelansicht wie in
  einem Automatenspiel (Brust und Schultern halb zum Betrachter gedreht).
- Hintergründe: Liefert der Nutzer Grok-Konzeptbilder, sind sie Vorlage
  für Aufbau und Farben; sonst nach Auftrag 4, Abschnitt 4.
- Velas Stiefel bleiben graublau (G0-3).
- Das Blatt `rammbock_fremd` und der Umsetzer bleiben im Bau als Vorlage
  und Vergleich; die Darstellung nutzt sie nicht.

Registrierung im Bau (Phase 2): Jede Figurendatei liefert ihre Figuren
über eine feste Funktion (`bolzerFiguren` in `figuren/bolzer.ts`,
`zuenderFiguren`, `ballastFiguren`), Objekte, Hintergründe und Anzeige
liefern `Erzeugnis`se (`erzeugnis.ts`) über `objekteErzeugnisse`
(`objekte.ts`), `hintergrundErzeugnisse` (`hintergrund/hintergruende.ts`)
und `anzeigeErzeugnisse` (`anzeige.ts`); `bauen.ts` prüft und schreibt
alles.

## 9. Einbau in die Darstellung (G7, Phase 3)

Stand G7 (2026-10-03). Die Darstellung zeichnet Figuren, Gegner, Objekte,
Effekte, Hintergründe, Vordergrund, Blende und Anzeigeleiste aus den Blättern
in `spiel/grafik/ausgabe/`. Die Logik bleibt unberührt: Die Darstellung liest
die Welt und ändert sie nie; `darstellung_browser.test.ts` (600 Schritte mit
Debug-Anzeige, Protokoll Spalte für Spalte gegen den Prüflauf) besteht
unverändert.

### 9.1 Dateien

| Datei | Inhalt |
|---|---|
| `spiel/src/darstellung/zuordnung.ts` | Atlas-Typen und die Zuordnung Logikzustand → Blatt, Animation, Bild, Spiegelung als reine Funktionen ohne DOM: `figurWahl`, `figurTeile` (Werfer, Mündungsblitz, Magnetstoß, Eiswelle), `gegnerWahl`, `getragenVersatz`, `objektWahl`; `bildZurUhr`, `schleifenBild` |
| `spiel/src/darstellung/verlauf.ts` | `Verlauf`: Effektliste der Darstellung (Funke, Staub, Trümmer, Explosion) und Gehframes der Gegner, ohne DOM, gefüttert nach jedem Logikschritt |
| `spiel/src/darstellung/sprites.ts` | Laden (fetch der JSON, `Image` für die PNG), Konturblätter, Kachelkarten, Schatten; Zeichnen eines Bildes am Anker (gespiegelt), der Hintergrundebenen, der Blende und der Anzeige |
| `spiel/src/darstellung/zeichnen.ts` | Szene mit Sprites (`zeichneSzeneSprites`) neben den Rechtecken; `zeichneBild(ctx, welt, sprites)` und `zeichneObersteEbene(…, grafik)` wählen die Fassung |
| `spiel/src/darstellung/main.ts` | lädt die Grafik vor dem ersten Bild (parallel zur Stage), Rückfall, ruft `Verlauf.beobachten` nach jedem Logikschritt |
| `spiel/src/darstellung/masse.ts` | Werte der Darstellung, die die Blätter nicht tragen (Abschnitt „Sprites“): Werferpunkte, Griffpunkt und Mündung, Ansätze des Magnetstoßes, Mündungsblitz, Funke, Trümmerblinken, Schatten, Bühne der Hintergründe, Tragen beim Wurf |
| `spiel/index.html` | Hinweis auf das Laden und `?platzhalter=1` |
| `spiel/werkzeuge/foto.mjs` | Szenenbilder `docs/bilder/szene_*.png` (9.7) |
| `spiel/tests/grafik_zuordnung.test.ts`, `grafik_aktiv.test.ts`, `grafik_dauer.test.ts`, Hilfe `grafik_einbau_hilfe.ts` | Tests (9.6) |
| `spiel/tests/szenen/grafik_arena.txt`, `spiel/tests/eingaben/grafik_arena.txt` | Prüfszene der Arena (Welle 7 mit dem Ballast) für `szene_arena.png`; keine Abnahmeszene |

### 9.2 Laden und Rückfall

- `main.ts` lädt vor dem ersten Bild die Sprite-Blätter `vela`, `bolzer`,
  `puppe`, `rammbock`, `zuender`, `ballast`, `objekte` (nicht
  `rammbock_fremd`, E24), die Hintergründe `hintergrund_a`, `_b`, `_f`, die
  Blende und die Anzeige, je JSON mit `fetch` und PNG als `Image`, relativ zu
  `index.html` aus `grafik/ausgabe/`. `window.comet.bereit` gilt erst danach.
- Beim Laden entstehen einmal: je Kachelkarte eine Zeichenfläche (4.8,
  „Zeichnen“ Punkt 1), je Sprite-Blatt ein Konturblatt (nur die Pixel in
  `KONTUR`, für das Schutzblinken), die freien Bilder je Ebene nach `folge`
  sortiert, Schattenellipsen je Größe beim ersten Gebrauch. Je Bild wird
  nichts erzeugt; Spiegeln über `translate`/`scale(−1, 1)`.
- Rückfall: `?platzhalter=1` lädt nichts und zeichnet die Rechtecke von
  Auftrag 3. Lädt ein Blatt oder Atlas nicht, meldet die Seite
  „Grafik lädt nicht, Rückfall auf die Rechtecke: …“ mit `console.error` und
  zeichnet ebenso die Rechtecke (geprüft mit einem gesperrten `vela.png`).
- Fehlt im Atlas eine Animation, die die Zuordnung verlangt, zeigt die
  Darstellung `stand` und meldet den Grund einmal mit `console.warn`
  (Auftrag 4, 3); `grafik_zuordnung` schlägt dann fehl.
- Die Debug-Anzeige (F1) zeichnet weiter über die Sprites und behält
  `SCHRIFT_3X5`.

### 9.3 Zuordnungstabelle (Umsetzung)

Grundregel (G7-1): Die Uhr kommt aus der Logik, die Tabelle Uhr → Bild aus
den Bilddauern des Atlas (`bildZurUhr`: erstes Bild, bei dem die Summe der
Dauern die Uhr erreicht, danach hält das letzte; Schleifen über
(Uhr − 1) mod Summe + 1). Stoppframes halten das Bild, weil die Uhren der
Logik (`uhr`, `ss_n`, `kp_k`) in ihnen stehen. Blick links spiegelt um die
Ankerspalte. Die Tabellen in 4.1 bis 4.7 gelten; hier die Umsetzung mit den
Abweichungen G7-….

**Figur** (`figurWahl`, `figurTeile`; 4.1):

| Zustand | Animation, Uhr | Zusatzbilder |
|---|---|---|
| `STAND`, `LAUF`, `SPRINT` | `stand` bzw. `waffe_stand`; `gehen` bzw. `waffe_gehen` und `sprint` als Schleife über `uhr` | Werfer bei `waffe` RW in STAND und LAUF (Griffpunkt auf W, G7-18) |
| `SPRUNG`, `SPRINTSPRUNG` | `sprung`: Luftbilder (bis `SPRUNG_LETZTER_LUFTFRAME`) nach `uhr`, nach einem Sprungangriff die Fallpose; `SS` mit `ss_n` > 0: `sprint_sprungangriff` nach `ss_n` | – |
| `LANDUNG` | Landebilder von `sprung` nach `uhr`; mit laufender Instanz SS das Landebild von `sprint_sprungangriff` | – |
| `SPRUNGANGRIFF` N, R, H, T | `sprungangriff` (danach Fallpose), `richtung`, `hoch`, `runter` nach `uhr` | – |
| `SCHLAG`, `LEERSCHLAG` | `kette`k (k = `kombo`), `uhr` mit Ausfallschritt verschoben (G7-2) | Magnetstoß k am Ansatz in den aktiven Frames, Bild nach Uhr − erster aktiver Frame; Kette 4 zweites Fenster (ohne Treffer) am Ansatz 4B |
| `GRIFF`, `KNIESTOSS`, `WURF`, `SPEZIAL`, `SPRINTANGRIFF`, `WAFFE`, `AUFNEHMEN` | gleichnamige Animation nach `uhr` (`griff` nach einem Kniestoß im Haltebild, `waffe_schuss` für WAFFE) | Eiswelle Stufe ⌊(uhr − 8) / 6⌋ + 1 vorn und gespiegelt hinten (uhr 8 bis 43); Werfer und Mündungsblitz in WAFFE (G7-3) |
| `GETROFFEN` | `getroffen_vorn` bzw. `_hinten` nach `letzter_angreifer` (G1-11) | – |
| `UMGEWORFEN`, `LIEGEN`, `AUFSTEHEN` | `umgeworfen`, `liegen`, `aufstehen` nach `uhr`, gespiegelt bei Flug in Blickrichtung (G1-12, G7-10) | – |
| `TOT` | `umgeworfen` mit den Zeiten von F4 (G1-13, aus `werte.ts` und den Dauern von `umgeworfen`), ab der Ruhe `tot` | – |
| `NEUEINSTIEG` | vor der Landung `neueinstieg_fall` als Schleife, ab LN `neueinstieg_landung` nach Frame − LN + 1 | – |

Schutz blinkt wie heute: in jedem zweiten Framepaar (`(frame >> 1) & 1`, nur
in Zustand 3 mit Schutz) nur die Kontur (G7-14).

**Gegner** (`gegnerWahl`; 4.2 bis 4.6):

| Zustand | Animation, Uhr |
|---|---|
| Reaktionen aller Typen | `getroffen` nach Frame − `reaktion_h`; `umgeworfen` und `tot` (Ballast `fall`) nach dem Bahnzustand (G7-13), gespiegelt bei Flug in Blickrichtung; Wurf F3 vor dem Bodenkontakt `geworfen` (Bolzer, Puppe, Rammbock) in Flugrichtung, getragen mit Versatz (G7-7); `liegen`; `aufstehen` nach `modus_uhr`; `gehalten`; tote Gegner blinken ab der Ruhe (G7-8) |
| Bolzer, Puppe, Rammbock | WARTEN hockend `auftritt_hocke`; AUFTRITT `aufstehen_hocke` bzw. `auftritt_versteck`; Gehen `gehen` bzw. `gehen_schnell` nach den Gehframes (G7-11), rückwärts gegen den Blick (G3-15); stehend `haltung`, Rammbock in ABWARTEN `wiegen`; KAMPFHALTUNG `kampfhaltung` bzw. Rammbock `hocke_ankuendigung`; SPOTT `spott`; ANGRIFF Code → `schlag_a` … `umwerfschlag_b`, `umwerfschlag`, `sprungtritt` nach Frame − A, das Trefferbild hält bis zum Ende der aktiven Frames; NACHLAUF Rückzugsbilder 3 und 4 nach `modus_uhr`, dann `kampfhaltung`; Sprungtritt nach Höhe und A+46 (4.2) |
| Zünder | `stand` in WARTEN, BEREIT, FREI, PUPPE und stehend; Gehen wie oben; ZIELEN `zielen` als Schleife; SCHUSS `schuss` nach Frame − A + 1; KOLBENHIEB `kolbenhieb`, im Nachlauf Bild 3 und 4, dann `stand` (G7-6) |
| Ballast | AUFTRITT `auftritt`; BEREIT `stand` als Schleife bzw. `gehen`; ANKUENDIGUNG `ankuendigung` (beim Armschwung ab n = 15 das Ausholen); Armschwung Bild 5(k − 1) + Bild des Schwungs nach Frame − `schwung_a`, nach Treffer 7 Frames länger im Trefferbild und Rückzug bis 36 (4.6); Ansturm nach `lauf_n`, Auslauf `ansturm_bremsen`; Körperpresse nach `kp_k`, nach der Landung nach Frame − `kp_landung`; STOSS `stoss_rueckzug`; TAUMELN `taumeln` |

**Objekte** (`objektWahl`; 4.7): Gegenstände (auch im Flug in Höhe `h`),
leere Waffe, unzerbrochene Behälter, Raketen im Flug (`rakete` bzw.
`rakete_zuender` nach `flug_n`, gespiegelt nach `bahn_richtung`). Zerbrochene
Behälter und Explosionen zeichnet die Effektliste (9.5), Objekte des Typs
Effekt keine (G7-19). Gegenstände blinken über `sichtbar` wie heute.

### 9.4 Zeichnen

- Lage nach Kampf 2.5 wie die Rechtecke: Anker auf (⌊x⌋ − K,
  234 − (⌊z⌋ − Ky) − ⌊h⌋), Schatten am Boden (Ellipse pixelgenau, G7-12),
  Sortierung nach ⌊z⌋ absteigend, dann Behälter, Gegenstände, Gegner, Figur,
  Geschosse, Effekte, dann Slot. Bildschütteln verschiebt die Szene, nicht die
  Anzeige.
- Zusatzbilder der Figur im Stück der Figur: Eiswelle davor, Werfer,
  Magnetstoß und Mündungsblitz danach; Versatz vom Fußpunkt, mit dem Blick
  gespiegelt.
- Hintergrund nach 4.8: Himmel (Parallaxe 0,5), Wand, Boden je erst die
  Karten aller Blätter, dann die freien Bilder nach `folge`; Dampf nach
  `welt.frame`; Vordergrund nach den Figuren mit Deckkraft 0,85. Nur auf der
  Bühne `scheibe` (G7-9).
- Blende nach 4.8 Punkt 5: Szene abdunkeln (d/28), dunkles Feld ab
  F = 400 − ⌊400 · d / 28⌋, Bayer-Kante links davon; die Anzeige bleibt
  darüber.
- Anzeige nach 4.9: kleine Schrift für Name, Punkte, Leben und Gegnername,
  Lebenssymbol, Balken aus den Bausteinen (je Lauf ein gestreckter
  `drawImage`), Pfeil nach `anzeige(welt).pfeil`, große Texte als fertige
  Bilder (sonst gesetzt), „AUFZ“ mit rotem Punkt (G7-15).

### 9.5 Effektliste der Darstellung (`verlauf.ts`)

Der Verlauf liest die Welt nach jedem Logikschritt (`main.ts`: Tastatur und
`window.comet.schritt`) und beim Zeichnen; eine neue Welt (Neustart,
Eingabedatei, Prüfszene) setzt ihn zurück und liest ihren Frame 0 (so
erscheinen die mit `welle.7=nur_boss` zerbrochenen Kisten). Effekte zählen
echte Frames ab ihrem Start (Uhr 1 = Startframe) und laufen über die Summe
ihrer Bilddauern:

| Effekt | Start | Lage | Dauer |
|---|---|---|---|
| `funke` | je Treffer des Frames mit Wirkung R, U, X, B (nicht W, nicht WU) | G7-4 | 8 Frames |
| `staub` | Bodenkontakt einer Bahn (Figur, Gegner, Boss), Landung des Neueinstiegs, Landung der Körperpresse (G7-5) | Fußpunkt am Boden | 9 Frames |
| `fass_truemmer`, `bosskiste_truemmer` | Behälter im Frame h des Zerbrechens (auch Frame 0) | Fußpunkt des Behälters | 48 Frames, blinkt ab Uhr 33 (2 an, 2 aus) |
| `explosion`, `explosion_zuender` | Ereignis `EX:gn` bzw. `EX:on` (G7-17) | Einschlagpunkt am Boden, gespiegelt nach der Flugrichtung | 24 Frames |

Dazu die Gehframes je Gegnerslot (G7-11). Der Verlauf beeinflusst weder
Logik noch Protokoll.

### 9.6 Tests

| Test | prüft |
|---|---|
| `grafik_zuordnung.test.ts` | jede Aktion aus `FIGUR_AKTIONEN` mit ihren Unterphasen und Varianten (63 Kombinationen: Waffe, Kettenstufe × Ausfallschritt, Sprungangriff N/R/H/T, Kniestoß 1 bis 3, Wurf V/R, SS, Angreifer vorn/hinten, Flugrichtung, Fall/Landung …) und jeder Modus je Gegnertyp (83 Modi, 337 Kombinationen mit Aktion, Code, Auftritt, Bahn F1 bis F4b, Bosswerten) je über Uhr 1 bis 130 und beide Blickrichtungen: keine Ersatzwahl, Bild im Atlas; alle Prüfszenen und die Vorführung Frame für Frame (24 901 Frames, 96 verschiedene Animationen) ebenso, einschließlich Zusatzbildern und Effekten; die übernommenen Maße in `masse.ts` gleich `grafik/quelle/` (Werferpunkte, Griffpunkt, Mündung, Ansätze des Magnetstoßes) |
| `grafik_aktiv.test.ts` | für 40 Angriffsanimationen zeigt die Zuordnung im ersten aktiven Frame (`werte.ts`) ein Bild aus `aktiv`: Vela (14, Kette auch mit Ausfallschritt und im zweiten Fenster, jede Spezialstufe ein eigenes Bild), Magnetstoß 1 bis 4, Eiswelle je Stufe (vorn und gespiegelt hinten), Bolzer und Puppe je 5, Rammbock 4 (Sprungtritt in der Luft), Zünder 2, Ballast 3 (jeder Schwung, Ansturm, Presse), Explosionen aus dem Verlauf (Figur Uhr 1, Zünder Uhr 2) |
| `grafik_dauer.test.ts` | Summe der Bilddauern jeder nicht schleifenden Animation höchstens die Aktion der Logik (81 Animationen; Nahangriffe: längster Ablauf mit kürzestem Nachlauf ohne bzw. mit Treffer; Kampfhaltung des Rammbocks beim kleinsten Rang); jede solche Animation braucht einen Eintrag; Effekte der Darstellung gegen ihre Regel (Explosion deckt RX bzw. ZR und dauert 24, Trümmer höchstens der Flug des Inhalts, Funke höchstens Trefferframe und Stopp, Staub höchstens Boden bis Ruhe) |

Stand: `npm run pruefen` grün, `npm test` 377 grün (367 + 10), `npm run
bauen` grün.

### 9.7 Szenenbilder

`npm run foto` (`werkzeuge/foto.mjs`, 768 × 448, zweifach):

| Bild | Inhalt |
|---|---|
| `docs/bilder/szene_0300.png` | Frame 300: Sprung nach der Kette im Landedeck, Himmel mit halber Kamerageschwindigkeit |
| `docs/bilder/szene_0600.png` | Frame 600: geworfener Bolzer, Trümmer des Fasses, Kometenbraten, der Rammbock hockt am Rand |
| `docs/bilder/szene_0900.png` | Frame 900: der Rammbock kommt vor dem Funkladen heran |
| `docs/bilder/szene_1200.png` | Frame 1200: der Rammbock fliegt besiegt, Vela im Nachlauf |
| `docs/bilder/szene_1500.png` | Frame 1500: Sprint vor der Stahlfassade mit Dampf |
| `docs/bilder/szene_debug.png` | Frame 718 mit Debug-Anzeige über den Sprites: Spezialangriff Stufe 1 mit Eiswelle beidseitig |
| `docs/bilder/szene_arena.png` | Prüfszene `grafik_arena`, Frame 138: Asservatenkammer, Vela schlägt Kette 2 (Magnetstoß, Funke) gegen einen Bolzer, der Ballast holt zum Armschwung aus |
| `docs/bilder/szene_nah.png` | Vorführung Frame 182, Ausschnitt 152 × 88 dreifach: Kette 2 im Trefferstopp, Magnetstoß und Funke am getroffenen Bolzer |

Die Platzhalterbilder `scheibe_*.png` bleiben (G7-16).

### 9.8 Leistung

Gemessen mit Playwright in Chromium (ohne Fenster): 600 Schritte der
Vorführung über `window.comet.schritt(1)`, je Schritt Logik und ein Bild:
mittlere Zeit 0,42 ms, Median 0,2 ms, 95 % unter 0,6 ms, das erste Bild
30 ms (Schatten und erstes Dekodieren); Rechtecke zum Vergleich 0,37 ms.
Die Abnahme in Phase 4 misst nach ihrer eigenen Vorschrift.

### 9.9 Lücken und offene Punkte

- Mündungsblitz: zwischen Blitz und Rakete bleiben etwa 10 px (G7-3). Ein
  eigenes Bild `muendungsblitz` (Strahl von der Mündung bis etwa 50 px vor
  dem Fußpunkt, 2 bis 3 Bilder) im Blatt `objekte` würde die Lücke schließen.
- Getragener Gegner beim Wurf: Versatz der Darstellung (G7-7); ein eigenes
  Tragebild über dem Kopf ist nicht nötig, `geworfen` 0 passt.
- Prüfbühne ohne eigene Hintergründe (G7-9).
- Die Anzeigeleiste liegt ohne eigenen Grund auf der Szene (G5-16); in F
  liegen helle Lichtkegel unter der Schrift, der Umriss der Schrift hält sie
  lesbar.

### 9.10 Darstellung 2× (Auftrag 5)

Stand 2026-10-03 (Auftrag 5, Phase 1, U1). Nach E25 hat das Canvas
768 × 448 Bildpixel, zwei je Spielpixel (`DARSTELLUNG` = 2 in `masse.ts`).
Logik, Protokoll, Lagen (`bildX`, `bildY`), Sortierung, Zuordnung,
Werferpunkte, Ansätze des Magnetstoßes und Mündungsblitz rechnen weiter in
Spielpixeln; nur das Zeichnen multipliziert. Die Grafik von Auftrag 4
(Gliederpuppe, Effekte, Hintergründe, Anzeige und Pixelschrift) läuft
unverändert bei 2×: Die Szenenbilder `szene_0300` bis `szene_1500` und
`szene_arena` sind byte-gleich mit dem Stand G7 (U1-1). Der Himmel läuft
weiter mit halber Kamerageschwindigkeit in ganzen Spielpixeln, der Schatten
bleibt eine pixelgenaue Ellipse in Spielpixeln, `?platzhalter=1` zeichnet die
Rechtecke (über dieselbe Zeichenklasse).

**Dateien**

| Datei | Inhalt |
|---|---|
| `spiel/src/darstellung/zeichner.ts` | Zeichenklasse `Zeichner`; `BILDPIXEL` (768 × 448), `canvasEinrichten` |
| `spiel/src/darstellung/blaetter.ts` | ohne DOM: Atlasformate von Hintergrund, Blende und Anzeige (aus `sprites.ts` verlegt), `HINTERGRUND_BLAETTER`, `BLAETTER_LISTE`, `GROK_ENDUNG`, `blattWahl`, `blaetterListe`, `massstabVon`, `konturMaske` |
| `spiel/src/darstellung/masse.ts` | `DARSTELLUNG` = 2 |
| `spiel/src/darstellung/sprites.ts`, `zeichnen.ts`, `debug.ts` | zeichnen nur über den Zeichner; `sprites.ts` lädt nach der Blattwahl und führt je Blatt Datei, Massstab und Art des Konturblatts (`Grafik.dateien`, `massstab`, `konturArt`); `spielBreite` (Bildbreite in Spielpixeln für den Schatten kleiner Objekte) |
| `spiel/src/darstellung/schrift.ts` | nur noch Glyphen (`glyphe`, `textBreite`); gezeichnet wird mit `Zeichner.text` |
| `spiel/src/darstellung/main.ts`, `spiel/index.html` | Canvas 768 × 448, Skalierung auf das Fenster |
| `spiel/werkzeuge/foto.mjs` | Fenster 768 × 448, das Canvas erscheint 1:1; `szene_nah.png` 608 × 352 (U1-7) |
| `spiel/tests/darstellung_2x.test.ts` | Tests (unten) |
| `spiel/tests/grafik_einbau_hilfe.ts`, `grafik_zuordnung.test.ts`, `grafik_aktiv.test.ts`, `grafik_dauer.test.ts` | lesen die Blätter der Blattwahl (unten) |

**Zeichenklasse.** Jedes Zeichnen der Darstellung geht durch einen
`Zeichner` und gibt Spielkoordinaten an. Der Faktor steht nur in
`zeichner.ts`: Die Methoden rechnen jede Koordinate über `bx`, `by` (mit der
Verschiebung des Bildschüttelns) und jede Länge über `bl` in Bildpixel und
zeichnen mit der Einheitsmatrix (U1-1).

| Methode | Wirkung |
|---|---|
| `beginne()` | Beginn eines Bildes (`zeichneBild`): Einheitsmatrix, keine Verschiebung, Deckkraft 1, ohne Glättung |
| `sichern()`, `zurueck()`, `verschieben(dx, dy)` | Bildschütteln (KA10) in Spielpixeln |
| `deckkraft(a)` | Deckkraft für das Folgende (Vordergrund 0,85, Blende) |
| `rechteck(x, y, b, h, farbe)` | gefülltes Rechteck, also Blöcke aus 2 × 2 Bildpixeln |
| `bild(quelle, q, m, x, y, ankerX, ankerY, spiegeln, zielB?, zielH?)` | Ausschnitt q eines Blatts mit Massstab m; Ankerpixel auf (x, y); Größe q.b / m × q.h / m Spielpixel (Massstab 1 wird mit `drawImage` ganzzahlig hochskaliert, nächster Nachbar; Massstab 2 1:1); zielB, zielH strecken (Balkenbausteine) |
| `pixelEllipse(x, y, b, h, farbe, deckkraft)` | Schatten: pixelgenaue Ellipse b × h Spielpixel, einmal je Größe in Bildpixeln angelegt |
| `text(schrift, inhalt, x, y, farbe, faktor)` | Pixelschrift 5 × 7 und 3 × 5 (Platzhalter, Debug-Anzeige) |
| `umriss`, `linie`, `vieleck`, `ellipse` | Linien von 1 Spielpixel (Debug-Anzeige, Platzhalter), Strichmuster in Spielpixeln |

**Massstab** (Atlas-Feld `"massstab"` auf oberster Ebene, `massstabVon`): 1
oder fehlend = Spielpixel, 2 = Bildpixel; jeder andere Wert bricht das Laden
ab (Rückfall auf die Rechtecke). Bei Massstab 2 sind Rechtecke, Maße und
Anker in Bildpixeln. Der Ankerpixel (ankerX, ankerY) liegt mit seiner linken
oberen Ecke auf der Bildposition 2 · bildX, 2 · bildY; gespiegelt wird um die
Mitte der Spielpixelspalte (Bildposition 2 · bildX + 1, U1-2). Ein 1×-Bild
mit Anker (a, b) und dasselbe Bild verdoppelt mit Anker (2a, 2b) liegen so
Pixel für Pixel gleich. Hintergrund, Blende und Anzeige lesen das Feld
ebenso; ihre Weltlagen bleiben Spielpixel (U1-5). Die Schatten kleiner
Objekte nehmen die Bildbreite in Spielpixeln (gerundet).

**Blattwahl** (`blattWahl`, Schnittstelle zu U2): `bauen.ts` schreibt
`grafik/ausgabe/blaetter.json`, die alphabetische Liste aller gebauten
Blattnamen ohne Endung. `ladeGrafik` lädt sie zuerst und nimmt für `vela`,
`bolzer`, `puppe`, `rammbock`, `zuender`, `ballast`, `objekte` und
`hintergrund_a`, `_b`, `_f` die Datei `<name>_grok`, wenn die Liste sie nennt,
sonst `<name>`. `rammbock_fremd` wird nie geladen. Fehlt die Liste (HTTP 404),
gilt die bisherige Wahl (U1-6). Die Zuordnung arbeitet weiter mit den Blättern
`vela` … `objekte` und den Animationsnamen; die Grok-Blätter tragen dieselben
Namen. Die Einbautests lesen über `atlantenLesen` (`grafik_einbau_hilfe.ts`)
dieselbe Wahl aus `grafik/ausgabe/blaetter.json` und nennen die gewählten
Dateien in ihrer Diagnose; ein eigener Test in `grafik_zuordnung.test.ts`
prüft, dass die geprüften Atlanten die gewählten Dateien sind.

**Konturblatt** (`konturMaske`, Schutzblinken G4-15, G7-14): Hat ein Blatt
Pixel in `KONTUR`, bleiben genau diese (alle Blätter von Auftrag 4). Hat es
keines (Grok-Blätter, keine feste Konturfarbe), bleibt sein Rand: deckende
Pixel mit einem durchsichtigen Kantennachbarn oder am Blattrand, so viele
Ringe wie der Massstab (U1-3). Gebildet einmal beim Laden; ein Blatt von
2048 × 2048 Pixeln braucht dafür etwa 130 ms (Node, gemessen).

**Fenster.** Das Canvas (768 × 448) wird ganzzahlig auf das Fenster skaliert
(1×, 2× … in Gerätepixeln, `image-rendering: pixelated`); ist das Fenster
kleiner als 768 × 448 Gerätepixel, so groß wie es passt und weich verkleinert
(U1-4). Geprüft: Fenster 600 × 400 → 600 × 350 weich, 768 × 448 → 1×,
1600 × 900 → 2×, 2400 × 1400 → 3×; bei Pixeldichte 2 ein Fenster von
800 × 500 → 2× in Gerätepixeln (768 × 448 CSS-Pixel), 500 × 300 → 1×.

**Tests.** `darstellung_browser.test.ts` besteht unverändert (Protokoll in
600 Schritten mit Debug-Anzeige Spalte für Spalte gleich dem Prüflauf).
`darstellung_2x.test.ts` (5 Tests): Blattwahl (mit und ohne Liste, nie
`rammbock_fremd`, ungültige Liste), Massstab (auch der gebauten Atlanten),
Konturmaske (KONTUR, Rand mit 1 und 2 Ringen); im Browser 1× gegen 2×: alle
Blätter der Darstellung werden in Node verdoppelt (nächster Nachbar,
Rechtecke, Maße und Anker · 2) und einer zweiten Seite geliefert, Sprites und
Hintergründe als `<name>_grok` über `blaetter.json`; beide Seiten spielen die
Vorführung (Frames 182, 300, 546, 600, 718, 900, 1200, 1500) und die Arena
(Frame 138), und das Canvas ist gleich (Ausschnitt um Vela 256 × 208 Byte für
Byte, das ganze Bild über Zeilenprüfsummen; eine um einen halben Spielpixel
verschobene Spiegelachse fällt auf); Leistung (unten). Die Browsertests bauen
in einen eigenen Ordner, nicht nach `dist/`. Stand: `npm test` 383 grün
(377 + 6), `npm run pruefen` und `npm run bauen` grün.

**Leistung** (Playwright, Chromium ohne Fenster, 600 Schritte der Vorführung
über `window.comet.schritt(1)`, je Schritt Logik und ein Bild; im Test
`darstellung_2x`, Grenze 8 ms): Mittel 0,8 ms, Median 0,2 ms, 95 % unter
0,7 ms, erstes Bild etwa 5 ms; mit erzwungenem Rastern je Bild (1 Pixel
lesen) Mittel 0,8 bis 1,0 ms. Bei 1× waren es 0,42 ms (9.8).

**Offen.** Grok-Blätter mit Massstab 2 aus dem Umsetzer v2 lagen beim Bau
noch nicht vor; geprüft ist der Weg mit verdoppelten Blättern. Bis `bauen.ts`
`blaetter.json` schreibt, meldet Chromium einmal den 404 (U1-6). Der Himmel
könnte bei 2× in Bildpixeln laufen (2 · x − K); er bleibt wie erlaubt bei
ganzen Spielpixeln.
