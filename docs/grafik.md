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

### 4.1 Vela (G0, Phase 1)

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

### 4.2 Rammbock (Gliederpuppe)

Stand G0c (Phase 1, Vergleich an Haltepunkt 1 nach Auftrag 4, 9.4).
Quelle `spiel/grafik/quelle/figuren/rammbock.ts`, Blatt
`spiel/grafik/ausgabe/rammbock.png` mit `rammbock.json`, Kontaktbögen
`docs/bilder/kontakt_rammbock_<animation>.png`, Tests
`spiel/tests/grafik_rammbock.test.ts`. Die Fassung aus Grok-Blättern heißt
später `rammbock_fremd` (Abschnitt 5). Aussehen nach Auftrag 4, 4: breiter,
kahler Schlepperfahrer mit kurzem Vollbart, olivgrüner Polsterweste offen
über nacktem Oberkörper, brauner Hose mit Gürtel und Stahlschnalle,
Knieschützern aus Stahl und schweren dunkelbraunen Arbeitsstiefeln.
Gedrungen-kräftig: breite Schultern, dicke Arme, große kantige Fäuste.
Gesicht: Auge 2 × 2 in `KONTUR` unter einer Braue im Hautdunkel, Nase als
Vorsprung im Profil, Ohr als eigene Form; in der Trefferreaktion ist das
Auge zugekniffen (zweite Gesichtsmaske).

**Ansicht** (G0c-1): Der Rumpf ist halb von vorn gesehen, die Brust zum
Betrachter gedreht. Die nahe (vordere) Schulter liegt links der Mitte über
der Flanke, die ferne (hintere) rechts hinter der Brust. Zwei gepolsterte
Vorderteile der Weste mit drei Steppnähten rahmen Brust und Bauch, dazu ein
Kragenpolster im Nacken und ein Schulterpolster über dem nahen Oberarm.

**Maße** (px; Körper im Stand 47 × 70 mit Kontur, Umriss 60 × 76 mit
Schatten, `masse.ts` `UMRISS_GEGNER.Rammbock`): Sohle bis Knöchel 6,
Oberschenkel 13, Unterschenkel 13 (Hüfte im Stand bei −29, gestreckt −32),
Taille 3 über der Hüfte, Schultergelenke 19 über der Taille bei x −4 (nah)
und +9 (fern), Rumpf ±12,4 breit (Weste ±13,6), Kopf mit Bart 15 hoch
(etwa 1/5 der Körperhöhe), Oberarm 12 (Radius 4,8 bis 4,2), Unterarm 11
(4,2 bis 3,6), Faust 10,4 × 9,8, Stiefel gut 16 lang, Knieschützer 7 × 9.
Zeichenreihenfolge: ferner Arm (10), fernes Bein (20, Knieschützer 22),
nahes Bein (26, Knieschützer 28), Becken (29), Rumpf (30, Brustlinie 31,
Gürtel 32, Schnalle 33), Weste (32, Nähte 33), Kopf (35, Ohr 35,5, Bart 36),
naher Arm (50), Faust (51), Schulterpolster (52).

**Tonzuteilung** (15 Farben plus durchsichtig = 16, Farbbudget 1.2; G0c-2):

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

**Animationen** (Zeiten in Frames ohne Trefferstopp). Beim Schlag zeigt die
Zeit A + d (d = 0 im ersten Frame des Angriffs) das Bild
`bildBeiUhr(dauern, d + 1)`. Bei der Trefferreaktion zeigt die Zeit h + d
(d ab 1) das Bild `bildBeiUhr(dauern, d)`. Die Dauern von `schlag` und
`getroffen` sind dieselben wie in `fremd/rammbock/zuordnung.txt` (G0b-9).
So zählen Gliederpuppe und Umsetzer gleich.

| Animation | Bilder | Dauern | Summe | aktiv | Inhalt |
|---|---|---|---|---|---|
| `stand` | 1 | 0 | – | – | aufrecht, Beine breit, Fäuste bereit vor dem Bauch; Brust und offene Weste frei (Rückfall der Darstellung und Prüfbild, wie G0b-8) |
| `gehen` | 8 | je 4 | 32, Schleife | – | schwerer Gang: Standfuß rückt je Bild 6, 7, 6, 7, 6, 6, 7, 6 px zurück, 51 px je Zyklus (G0c-3); Ferse setzt in Bild 0 (nahes Bein) und 4 (fernes) auf, die Spitze rollt in Bild 4 bzw. 0 ab; Hüfte wippt um 1 px (tief beim Aufsetzen, hoch beim Durchschwingen); naher Arm schwingt gegen das nahe Bein und winkelt vorn an |
| `kampfhaltung` | 2 | 8/8 | 16, Schleife | – | deutliche Hocke vor dem Angriff (design-gegner-stages.md 1.2): Hüfte −23 statt −29, Rumpf vorgebeugt, Fäuste vor Brust und Kinn; Bild 1 eine Spur höher (Atmen); Dauer als Richtwert (G0c-5) |
| `schlag` | 5 | 5/4/5/3/2 | 19 | [2] (A+9 bis A+13) | Code RA (`NAH_ANGRIFFE.RA`): Ausholen 2 Bilder über den Startup 9 (naher Arm weit zurück, Gewicht hinten), Trefferbild über die aktiven Frames 5 (wuchtige Gerade mit dem nahen Arm aus der Hüfte, Faust bis 48 px vor dem Fußpunkt bei 41 bis 53 px Höhe, höchstens `ZIELABSTAND_MAX`), Rückzug 2 Bilder über den festen Rückzug 5 (Zwischenbild, Hocke mit Deckung); danach hält die Darstellung bis zum Ende des Nachlaufs |
| `getroffen` | 3 | 9/12/2 | 23 | – | Bildwechsel bei h+1, h+10, h+22 (`REAKTION_ANIMATION`, `REAKTION_DAUER`): Kopf und Rumpf fliegen zurück, naher Arm nach hinten, ferner nach vorn, Auge zugekniffen; gekrümmt mit gesenktem Kopf; zurück in die Hocke |

**Knieschützer als Splitter** (G0c-4): Liegt ein Knieschützer fast ganz
hinter dem anderen Bein, entfällt er in diesem Bild. Das gilt, wenn sein
sichtbarer Rest in keiner Zeile breiter als 4 px Stahl ist (`KNIE_SPLITTER`,
gut die Hälfte der Platte). Das trifft den fernen Knieschützer in Bild 3 und
4 von `gehen`.

**Bauen weiterer Animationen** (Phase 2): wie bei Vela (4.1) über
`Haltung`, `pose()`, `zwischen()` und `animation()`. Die Haltung hat statt
des Pferdeschwanzes das Feld `getroffen` (Gesicht der Trefferreaktion).
Weitere Angriffe (RB, RU, RS) nehmen Startup, aktive Frames und Rückzug aus
`NAH_ANGRIFFE` und das Trefferbild über `bildBeiAbstand(dauern, aktiv_von)`.

## 5. Umsetzer für Bildblätter

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

## 6. Stand

| Phase | Stand |
|---|---|
| 0 Einrichtung | Ausgangslage geprüft: `npm run pruefen` grün, `npm test` 214 von 214 grün; Animationszeiger geprüft (Abschnitt 3) |

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
