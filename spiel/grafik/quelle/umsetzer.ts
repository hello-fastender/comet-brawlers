// Umsetzer für Bildblätter, Fassung v2 (Auftrag 5, Abschnitt 1 und Phase 1, U2;
// E25: Grafik aus Grok-Bildern bei doppelter Darstellung).
//
// Macht aus Bildblättern eines fremden Werkzeugs (Grok) Sprites in
// Bildpixeln der doppelten Darstellung (2 Bildpixel = 1 Spielpixel) im
// Atlas-Format (Auftrag 4, 2.3) mit dem Feld "massstab": 2. Ablauf je Figur:
//   1. Hintergrund aus den vier Ecken, Freistellen mit Toleranz und
//      Randentscheidung nach dem Mehrheitsnachbarn (keine Halbtransparenz),
//      Schließen schmaler Innenlinien, Füllen eingeschlossener dunkler Flächen.
//   2. Zellen per Flutfüllung (oder festes Raster aus quelle.txt), kleine
//      Bereiche (Nummern, Staub) verwerfen, Reihenfolge zeilenweise.
//   3. Maßstab: Zielhöhe 2 × (Umrisshöhe − 5) aus der Stand-Zelle, ein Faktor
//      je Figur, Blätter mit anderer Figurgröße über eine Bezugszelle neu
//      kalibriert; Verkleinern mit Flächenmittel, Deckung ab 1/2.
//   4. Palette je Figur per Medianschnitt über alle Bilder, höchstens 63
//      Farben (64 mit durchsichtig), ohne Raster, keine Abbildung auf
//      palette.ts; Figurenpixel nicht dunkler als der dunkelste Bodenton.
//   5. Streupixel entfernen, Kontur: dunkle Außenkante bleibt, sonst 1
//      Bildpixel im dunkelsten Ton der Figur nachsetzen.
//   6. Anker: unterste Zeile, x Mitte der Füße (liegend: Mitte der Figur);
//      Gehbilder so verschoben, dass der Standfuß je Bild um die Gehstrecke
//      zurückwandert, Rest protokolliert.
//   7. Zuordnung Zelle → Animation aus fremd/<ordner>/zuordnung.txt, fehlende
//      Bilder durch Wiederholung (Nachbestellung), Ausgabe als Blatt mit Atlas.
//
// PNG lesen, Abstand, Kontur, Blatt und Schrift kommen aus dem Werkzeugkasten
// (png.ts, farbe.ts, kontur.ts, blatt.ts, kontakt.ts), der Medianschnitt aus
// medianschnitt.ts. Deterministisch: kein Math.random, kein Date, feste
// Reihenfolgen. Ablauf, Parameter und Grenzen: docs/grafik.md, Abschnitt 5.8.
//
// Aufruf: node --experimental-strip-types grafik/quelle/umsetzer.ts
//         grafik/quelle/fremd/rammbock [--aus grafik/ausgabe] [--kontakt ../docs/bilder]

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Animation, Atlas, Bild, GepacktesBlatt } from './blatt.ts';
import { atlasText, BLATT_MAX, blattPacken, zugeschnitten } from './blatt.ts';
import { farbAbstand, pixelZuHex, rgbZuPixel } from './farbe.ts';
import type { Punkt } from './geometrie.ts';
import { textBreite, textZeichnen, ZEICHEN_HOEHE } from './kontakt.ts';
import { streupixel } from './kontur.ts';
import type { Pixel } from './leinwand.ts';
import { deckend, kanaele, Leinwand } from './leinwand.ts';
import { farbHaeufigkeit, helligkeit, medianschnitt } from './medianschnitt.ts';
import { farbenZaehlen, KONTAKT_AKTIV, KONTAKT_ANKER, KONTAKT_BODEN, KONTAKT_GRUND, KONTAKT_TEXT, KONTAKT_ZELLE } from './palette.ts';
import { md5, pngDateiLesen, pngLesen, pngSchreiben } from './png.ts';
import type { Umriss } from '../../src/darstellung/masse.ts';
import { SCHATTEN_HOEHE, UMRISS_FIGUR, UMRISS_GEGNER } from '../../src/darstellung/masse.ts';
import { EINS } from '../../src/kern/festkomma.ts';
import * as werte from '../../src/kern/werte.ts';

// ===========================================================================
// Grundlagen
// ===========================================================================

/** Bildpixel je Spielpixel der Darstellung (E25: 768 × 448 Bildpixel für 384 × 224 Einheiten). */
export const MASSSTAB = 2;
/** Endung der Blätter des Umsetzers v2: <figur>_grok.png mit <figur>_grok.json (Auftrag 5, Phase 1). */
export const BLATT_ENDUNG = '_grok';

/** Deckkraft, unter der ein Pixel eines Quellblatts als durchsichtig gilt (Hälfte von 255). */
const HALB_DECKEND = 128;

/** Nachbarn in fester Reihenfolge: erst die vier Kanten (N, W, O, S), dann die Ecken. */
const NACHBARN: readonly (readonly [number, number])[] = [
  [0, -1], [-1, 0], [1, 0], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];
/** Anzahl der Kantennachbarn am Anfang von NACHBARN. */
const KANTEN = 4;

/** Deckender Pixel ohne Deckkraftanteil der Quelle. */
function deckendVon(p: Pixel): Pixel {
  const k = kanaele(p);
  return rgbZuPixel([k[0], k[1], k[2]]);
}

function median(werte: readonly number[]): number {
  const s = werte.slice().sort((a, b) => a - b);
  return s[(s.length - 1) >> 1] as number;
}

// ===========================================================================
// Parameter (Auftrag 5, 1; Festlegungen G0b und U2 in docs/grafik.md, 5 und 7)
// ===========================================================================

export interface Parameter {
  /** Abstand (farbAbstand) zur Hintergrundfarbe, bis zu dem ein Pixel sicher Hintergrund ist. */
  readonly toleranzHintergrund: number;
  /** Abstand zur Hintergrundfarbe, ab dem ein Pixel sicher Figur ist; dazwischen Randpixel. */
  readonly toleranzFigur: number;
  /** Zellen, deren Umrissrechteck kleiner als dieser Anteil der Blattfläche ist, werden verworfen (9.3: 1/50). */
  readonly mindestAnteil: number;
  /** Ausnahme G0b-1: eine Zelle bleibt, wenn ihr Rechteck mindestens dieser Anteil der größten Zelle ist (liegende Posen). */
  readonly vergleichsAnteil: number;
  /** Deckung (Anteil der Fläche), ab der ein verkleinerter Pixel deckend wird (keine Halbtransparenz). */
  readonly deckung: number;
  /** Höhe des Fußbands als Anteil der Figurhöhe; Mitte der Füße = Mitte der Pixel in diesem Band (Anker). */
  readonly fussband: number;
  /** Zusammenhängende Inseln unter dieser Pixelzahl werden nach dem Verkleinern entfernt. */
  readonly mindestInsel: number;
  /** Höchstzahl deckender Farben je Figur (E25: 64 einschließlich durchsichtig). */
  readonly hoechstFarben: number;
  /** Runden Nachschärfen nach dem Medianschnitt (medianschnitt.ts). */
  readonly nachschaerfen: number;
  /** Abweichung der Grundlinie in einer Blattzeile, ab der sie ein Befund ist, als Anteil der Zeilenhöhe. */
  readonly grundlinienToleranz: number;
  /** Höchstzahl der Durchgänge der Randentscheidung (größte Tiefe eines Randbereichs in Quellpixeln). */
  readonly durchgaenge: number;
  /**
   * Radius des Schließens in Quellpixeln (G0b-10): Lücken bis 2 · Radius zwischen Figurteilen werden
   * Figur. Fremde Blätter zeichnen Innenlinien oft fast in der Hintergrundfarbe; 0 schaltet ab.
   */
  readonly schliessen: number;
  /**
   * Löcher (U2-2): Ein vom Hintergrund eingeschlossener Bereich der Maske wird Figur, wenn der mittlere
   * Abstand seiner Pixel zur Hintergrundfarbe über diesem Wert liegt (dunkle Fläche der Figur);
   * echte Lücken (Arm und Rumpf) zeigen den Grund selbst und bleiben durchsichtig.
   */
  readonly lochToleranz: number;
  /** Höchstzahl der Runden beim Entfernen von Streupixeln. */
  readonly streuRunden: number;
  /**
   * Streupixel bei 64 Farben (U2-1): Ein Pixel steht allein, wenn keiner seiner acht Nachbarn ihm
   * ähnlich ist (farbAbstand höchstens dieser Wert); 0 ist die strenge Regel von v1 (gleiche Farbe).
   */
  readonly streuAbstand: number;
  /** Helligkeit (Luma 0 bis 255), bis zu der ein Pixel der Außenkante als dunkle Kontur gilt (U2-3). */
  readonly konturHelligkeit: number;
  /** Zeilen über der untersten Zeile, deren Pixel noch Bodenkontakt haben (Fußkontakt beim Gehen, Bildpixel). */
  readonly kontaktBand: number;
  /** Höhe des Fußes in Bildpixeln: Lage eines Fußes = Mitte seiner Pixel in diesen untersten Zeilen (Fußkontakt). */
  readonly fussHoehe: number;
  /** Lücken bis zu dieser Breite (Profil der Sohle) trennen keine Füße (Fußkontakt, Bildpixel). */
  readonly kontaktLuecke: number;
  /** Oberer Anteil der Figurhöhe, dessen Schwerpunkt die Körpermitte beim Gehen bestimmt (Fußkontakt). */
  readonly koerperAnteil: number;
}

/**
 * Standardwerte (Festlegungen G0b und U2, begründet in docs/grafik.md 5.2 und
 * 5.8). Abstände in der Einheit von farbAbstand (farbe.ts): Grau um n Stufen
 * je Kanal verschoben ergibt etwa 3n.
 */
export const STANDARD: Parameter = {
  toleranzHintergrund: 45,
  toleranzFigur: 90,
  mindestAnteil: 1 / 50,
  vergleichsAnteil: 1 / 4,
  deckung: 1 / 2,
  fussband: 1 / 8,
  mindestInsel: 4,
  hoechstFarben: 63,
  nachschaerfen: 2,
  grundlinienToleranz: 1 / 50,
  durchgaenge: 256,
  schliessen: 4,
  lochToleranz: 12,
  streuRunden: 8,
  streuAbstand: 60,
  konturHelligkeit: 40,
  kontaktBand: 2,
  fussHoehe: 8,
  kontaktLuecke: 3,
  koerperAnteil: 2 / 5,
};

// ===========================================================================
// 1. Hintergrund und Freistellen
// ===========================================================================

/** Kantenlänge der Eckfelder, aus denen die Hintergrundfarbe bestimmt wird. */
const ECKFELD = 4;

/** Hintergrund eines Blatts: Farbe und ob er durchsichtig ist. */
export interface Hintergrund {
  /** Deckende Hintergrundfarbe. */
  readonly farbe: Pixel;
  readonly durchsichtig: boolean;
  /** Größter Abstand eines Eckfelds zur gewählten Farbe (Befund, wenn über der Toleranz). */
  readonly streuung: number;
}

/** Hintergrundfarbe aus den vier Ecken: Median je Kanal über vier Eckfelder. */
export function hintergrundAusEcken(bild: Leinwand): Hintergrund {
  const k = Math.min(ECKFELD, bild.breite, bild.hoehe);
  const ecken: readonly (readonly [number, number])[] = [
    [0, 0], [bild.breite - k, 0], [0, bild.hoehe - k], [bild.breite - k, bild.hoehe - k],
  ];
  const alle: number[][] = [[], [], [], []];
  const eckFarben: Pixel[] = [];
  for (const [ex, ey] of ecken) {
    const feld: number[][] = [[], [], []];
    for (let y = ey; y < ey + k; y++) {
      for (let x = ex; x < ex + k; x++) {
        const c = kanaele(bild.hole(x, y));
        for (let i = 0; i < c.length; i++) (alle[i] as number[]).push(c[i] as number);
        for (let i = 0; i < feld.length; i++) (feld[i] as number[]).push(c[i] as number);
      }
    }
    eckFarben.push(rgbZuPixel([median(feld[0] as number[]), median(feld[1] as number[]), median(feld[2] as number[])]));
  }
  const farbe = rgbZuPixel([median(alle[0] as number[]), median(alle[1] as number[]), median(alle[2] as number[])]);
  const durchsichtig = median(alle[3] as number[]) < HALB_DECKEND;
  let streuung = 0;
  for (const e of eckFarben) streuung = Math.max(streuung, farbAbstand(e, farbe));
  return { farbe, durchsichtig, streuung };
}

/** Klassen beim Freistellen. */
const HG = 0;
const FIGUR = 1;
const RAND = 2;

/** Ergebnis des Freistellens: Maske und bereinigte Farben des ganzen Blatts. */
export interface Freistellung {
  readonly breite: number;
  readonly hoehe: number;
  /** 1 = Figur, 0 = Hintergrund. */
  readonly maske: Uint8Array;
  /** Deckende Farbe je Pixel; Randpixel der Figur am Hintergrund mit der Farbe des Mehrheitsnachbarn. */
  readonly farbe: Uint32Array;
  readonly hintergrund: Hintergrund;
  /** Randpixel, die Figur wurden, und solche, die Hintergrund wurden. */
  readonly randFigur: number;
  readonly randHintergrund: number;
  /** Pixel, die das Schließen zur Figur nahm (Innenlinien in Hintergrundfarbe). */
  readonly geschlossen: number;
  /** Eingeschlossene Bereiche, die als dunkle Fläche Figur wurden (U2-2), und ihre Pixel. */
  readonly loecherGefuellt: number;
  readonly loecherPixel: number;
  /** Eingeschlossene Bereiche, die als echte Lücke durchsichtig blieben. */
  readonly loecherOffen: number;
}

/** Abstand eines Pixels zum Hintergrund; durchsichtige Pixel gelten als Hintergrund. */
function abstandZumHintergrund(px: Pixel, hg: Hintergrund, p: Parameter): number {
  const a = px & 0xff;
  if (hg.durchsichtig) {
    // Durchsichtiger Grund: die Deckkraft entscheidet (unter 1/4 Hintergrund, ab 3/4 Figur, dazwischen Rand).
    if (a < HALB_DECKEND / 2) return 0;
    if (a >= HALB_DECKEND + HALB_DECKEND / 2) return Number.POSITIVE_INFINITY;
    return (p.toleranzHintergrund + p.toleranzFigur) / 2;
  }
  if (a < HALB_DECKEND) return 0;
  return farbAbstand(px, hg.farbe);
}

/**
 * Freistellen: Hintergrund mit Toleranz durchsichtig, sichere Figur ab
 * `toleranzFigur`, dazwischen Randpixel. Randpixel nehmen in Durchgängen die
 * Klasse der Mehrheit ihrer entschiedenen Nachbarn an (außerhalb des Blatts
 * zählt als Hintergrund). Ein Randpixel, das Figur wird und am Hintergrund
 * liegt, bekommt die häufigste Farbe seiner Figurnachbarn (Kantenglättung
 * entfernt); eines im Inneren behält seine Farbe (Innenlinien). Gleichstand
 * nach allen Durchgängen: Abstand über der Mitte beider Toleranzen ist Figur.
 * Danach Schließen (G0b-10) und Löcher füllen (U2-2).
 */
export function freistellen(bild: Leinwand, p: Parameter = STANDARD): Freistellung {
  const { breite, hoehe } = bild;
  const n = breite * hoehe;
  const hg = hintergrundAusEcken(bild);
  const klasse = new Uint8Array(n);
  const abst = new Float64Array(n);
  const farbe = new Uint32Array(n);
  let offen: number[] = [];
  for (let j = 0; j < n; j++) {
    const px = bild.daten[j] as Pixel;
    const d = abstandZumHintergrund(px, hg, p);
    abst[j] = d;
    const k = d <= p.toleranzHintergrund ? HG : d >= p.toleranzFigur ? FIGUR : RAND;
    klasse[j] = k;
    if (k === RAND) offen.push(j);
    farbe[j] = deckendVon(px);
  }
  let randFigur = 0;
  let randHintergrund = 0;
  for (let durchgang = 0; durchgang < p.durchgaenge && offen.length > 0; durchgang++) {
    const zuFigur: number[] = [];
    const zuFigurAmRand: number[] = [];
    const zuHg: number[] = [];
    const rest: number[] = [];
    for (const j of offen) {
      const x = j % breite;
      const y = (j - x) / breite;
      let fig = 0;
      let bg = 0;
      for (const [dx, dy] of NACHBARN) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) {
          bg++;
          continue;
        }
        const k = klasse[ny * breite + nx];
        if (k === FIGUR) fig++;
        else if (k === HG) bg++;
      }
      if (fig > bg) (bg > 0 ? zuFigurAmRand : zuFigur).push(j);
      else if (bg > fig) zuHg.push(j);
      else rest.push(j);
    }
    if (zuFigur.length + zuFigurAmRand.length + zuHg.length === 0) break;
    // Farben aus dem Stand vor diesem Durchgang, dann alle Klassen zugleich (Reihenfolge ohne Einfluss).
    const neueFarben = zuFigurAmRand.map((j) => mehrheitsfarbe(farbe, klasse, breite, hoehe, j));
    zuFigurAmRand.forEach((j, i) => {
      farbe[j] = neueFarben[i] as Pixel;
    });
    for (const j of zuFigur) klasse[j] = FIGUR;
    for (const j of zuFigurAmRand) klasse[j] = FIGUR;
    for (const j of zuHg) klasse[j] = HG;
    randFigur += zuFigur.length + zuFigurAmRand.length;
    randHintergrund += zuHg.length;
    offen = rest;
  }
  // Rückfall für Gleichstand: Abstand über der Mitte beider Toleranzen ist Figur.
  const mitte = (p.toleranzHintergrund + p.toleranzFigur) / 2;
  for (const j of offen) {
    if ((abst[j] as number) > mitte) {
      klasse[j] = FIGUR;
      randFigur++;
    } else {
      klasse[j] = HG;
      randHintergrund++;
    }
  }
  const offenMaske = new Uint8Array(n);
  for (let j = 0; j < n; j++) offenMaske[j] = klasse[j] === FIGUR ? 1 : 0;
  const maske = schliesse(offenMaske, breite, hoehe, p.schliessen);
  let geschlossen = 0;
  for (let j = 0; j < n; j++) if (maske[j] !== offenMaske[j]) geschlossen++;
  const loecher = fuelleLoecher(maske, abst, breite, hoehe, p.lochToleranz);
  return {
    breite, hoehe, maske, farbe, hintergrund: hg, randFigur, randHintergrund, geschlossen,
    loecherGefuellt: loecher.gefuellt, loecherPixel: loecher.pixel, loecherOffen: loecher.offen,
  };
}

/**
 * Löcher füllen (U2-2): Bereiche der Gegenmaske (4er-Nachbarschaft), die den
 * Blattrand nicht berühren, sind von Figur eingeschlossen. Liegt der mittlere
 * Abstand ihrer Pixel zur Hintergrundfarbe über `toleranz`, sind sie eine
 * dunkle Fläche der Figur (Grok zeichnet tiefe Schatten fast in der
 * Grundfarbe) und werden Figur mit ihrer eigenen Farbe; sonst bleiben sie
 * eine echte Lücke. Ändert die Maske.
 */
export function fuelleLoecher(maske: Uint8Array, abst: Float64Array, breite: number, hoehe: number, toleranz: number): { gefuellt: number; pixel: number; offen: number } {
  const marke = new Uint8Array(maske.length);
  const stapel: number[] = [];
  let gefuellt = 0;
  let pixel = 0;
  let offen = 0;
  for (let j0 = 0; j0 < maske.length; j0++) {
    if (maske[j0] !== 0 || marke[j0] !== 0) continue;
    const bereich: number[] = [];
    let amRand = false;
    let summe = 0;
    marke[j0] = 1;
    stapel.push(j0);
    while (stapel.length > 0) {
      const q = stapel.pop() as number;
      bereich.push(q);
      summe += abst[q] as number;
      const qx = q % breite;
      const qy = (q - qx) / breite;
      if (qx === 0 || qy === 0 || qx === breite - 1 || qy === hoehe - 1) amRand = true;
      for (let i = 0; i < KANTEN; i++) {
        const [dx, dy] = NACHBARN[i] as readonly [number, number];
        const nx = qx + dx;
        const ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) continue;
        const m = ny * breite + nx;
        if (maske[m] !== 0 || marke[m] !== 0) continue;
        marke[m] = 1;
        stapel.push(m);
      }
    }
    if (amRand) continue;
    if (summe / bereich.length > toleranz) {
      for (const q of bereich) maske[q] = 1;
      gefuellt++;
      pixel += bereich.length;
    } else offen++;
  }
  return { gefuellt, pixel, offen };
}

/**
 * Laufende Summe eines Fensters der Breite 2r + 1 entlang Zeilen (schrittX 1) oder Spalten:
 * Ergebnis 1, wo im Fenster mindestens `mindest` Einsen liegen (außerhalb zählt als 0).
 */
function fenster(m: Uint8Array, breite: number, hoehe: number, r: number, waagrecht: boolean, mindest: number): Uint8Array {
  const aus = new Uint8Array(m.length);
  const laenge = waagrecht ? breite : hoehe;
  const linien = waagrecht ? hoehe : breite;
  for (let l = 0; l < linien; l++) {
    const idx = (i: number): number => (waagrecht ? l * breite + i : i * breite + l);
    let summe = 0;
    for (let i = 0; i < Math.min(r, laenge); i++) summe += m[idx(i)] as number;
    for (let i = 0; i < laenge; i++) {
      if (i + r < laenge) summe += m[idx(i + r)] as number;
      if (i - r - 1 >= 0) summe -= m[idx(i - r - 1)] as number;
      if (summe >= mindest) aus[idx(i)] = 1;
    }
  }
  return aus;
}

/**
 * Morphologisches Schließen mit einem Quadrat der Kantenlänge 2r + 1 (Dehnen, dann Schrumpfen,
 * je getrennt nach Zeilen und Spalten). Füllt Lücken bis 2r px zwischen Figurteilen, lässt
 * breitere Lücken und den Außenrand stehen. Die Maske wird nur größer.
 */
export function schliesse(maske: Uint8Array, breite: number, hoehe: number, r: number): Uint8Array {
  if (r <= 0) return maske;
  const voll = 2 * r + 1;
  const gedehnt = fenster(fenster(maske, breite, hoehe, r, true, 1), breite, hoehe, r, false, 1);
  const geschrumpft = fenster(fenster(gedehnt, breite, hoehe, r, true, voll), breite, hoehe, r, false, voll);
  const aus = new Uint8Array(maske.length);
  for (let j = 0; j < aus.length; j++) aus[j] = (maske[j] as number) | (geschrumpft[j] as number);
  return aus;
}

/** Häufigste Farbe der Figurnachbarn eines Pixels (Gleichstand: erster in NACHBARN). */
function mehrheitsfarbe(farbe: Uint32Array, klasse: Uint8Array, breite: number, hoehe: number, j: number): Pixel {
  const x = j % breite;
  const y = (j - x) / breite;
  const zaehler = new Map<Pixel, number>();
  let beste = farbe[j] as Pixel;
  let besteZahl = 0;
  for (const [dx, dy] of NACHBARN) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) continue;
    const k = ny * breite + nx;
    if (klasse[k] !== FIGUR) continue;
    const f = farbe[k] as Pixel;
    const z = (zaehler.get(f) ?? 0) + 1;
    zaehler.set(f, z);
    if (z > besteZahl) {
      besteZahl = z;
      beste = f;
    }
  }
  return beste;
}

// ===========================================================================
// 2. Zellen finden
// ===========================================================================

/** Zusammenhängender Bereich der Maske (8er-Nachbarschaft). */
interface Komponente {
  nr: number;
  links: number;
  oben: number;
  rechts: number;
  unten: number;
  pixel: number;
}

/** Eine Zelle des Blatts: eine Figur (eine oder mehrere Komponenten). */
export interface Zelle {
  /** Nummer ab 1: Lesereihenfolge (Flutfüllung) oder Rasterposition (Raster). */
  nr: number;
  readonly links: number;
  readonly oben: number;
  readonly breite: number;
  readonly hoehe: number;
  /** Pixel der Figur. */
  readonly pixel: number;
  /** Blattzeile ab 1. */
  zeile: number;
  /** Komponenten der Zelle (intern, für den Ausschnitt). */
  readonly komponenten: readonly number[];
}

/** Ein verworfener Bereich (Nummer, Staub) mit Lage, für das Protokoll. */
export interface Verworfen {
  readonly links: number;
  readonly oben: number;
  readonly breite: number;
  readonly hoehe: number;
  readonly pixel: number;
}

/** Festes Raster eines Blatts (quelle.txt): Spalten × Zeilen über das ganze Blatt. */
export interface Raster {
  readonly spalten: number;
  readonly zeilen: number;
}

export interface Zellen {
  readonly zellen: Zelle[];
  readonly verworfen: Verworfen[];
  /** Komponentennummer je Pixel (0 = Hintergrund). */
  readonly marken: Int32Array;
  /** Leere Rasterfelder (nur im Rastermodus), Nummern ab 1. */
  readonly leer: number[];
}

/** Markiert die Komponenten der Maske im Rechteck [x0, x1) × [y0, y1) ab Nummer `start`. */
function markiere(
  fs: Freistellung, marken: Int32Array, x0: number, y0: number, x1: number, y1: number, start: number,
): Komponente[] {
  const { breite, maske } = fs;
  const komps: Komponente[] = [];
  const stapel: number[] = [];
  let nr = start;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const j = y * breite + x;
      if (maske[j] === 0 || marken[j] !== 0) continue;
      const k: Komponente = { nr, links: x, oben: y, rechts: x, unten: y, pixel: 0 };
      marken[j] = nr;
      stapel.push(j);
      while (stapel.length > 0) {
        const q = stapel.pop() as number;
        const qx = q % breite;
        const qy = (q - qx) / breite;
        k.pixel++;
        if (qx < k.links) k.links = qx;
        if (qx > k.rechts) k.rechts = qx;
        if (qy < k.oben) k.oben = qy;
        if (qy > k.unten) k.unten = qy;
        for (const [dx, dy] of NACHBARN) {
          const nx = qx + dx;
          const ny = qy + dy;
          if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1) continue;
          const m = ny * breite + nx;
          if (maske[m] === 0 || marken[m] !== 0) continue;
          marken[m] = nr;
          stapel.push(m);
        }
      }
      komps.push(k);
      nr++;
    }
  }
  return komps;
}

function flaeche(k: Komponente): number {
  return (k.rechts - k.links + 1) * (k.unten - k.oben + 1);
}

function schnitt(a: Komponente, b: Komponente): number {
  const w = Math.min(a.rechts, b.rechts) - Math.max(a.links, b.links) + 1;
  const h = Math.min(a.unten, b.unten) - Math.max(a.oben, b.oben) + 1;
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Gruppiert Komponenten: groß ist, wessen Rechteck mindestens `grenze` oder
 * `vergleich` mal das größte Rechteck misst; kleine schließen sich der großen
 * an, deren Rechteck sie am meisten schneiden, sonst werden sie verworfen.
 */
function gruppiere(
  komps: readonly Komponente[], grenze: number, vergleich: number,
): { gruppen: Komponente[][]; verworfen: Komponente[] } {
  let groesste = 0;
  for (const k of komps) groesste = Math.max(groesste, flaeche(k));
  const gross: Komponente[] = [];
  const klein: Komponente[] = [];
  for (const k of komps) {
    const f = flaeche(k);
    if (f >= grenze || f >= groesste * vergleich) gross.push(k);
    else klein.push(k);
  }
  const gruppen: Komponente[][] = gross.map((k) => [k]);
  const verworfen: Komponente[] = [];
  for (const k of klein) {
    let beste = -1;
    let besteSchnitt = 0;
    gross.forEach((g, i) => {
      const s = schnitt(k, g);
      if (s > besteSchnitt) {
        besteSchnitt = s;
        beste = i;
      }
    });
    if (beste >= 0) (gruppen[beste] as Komponente[]).push(k);
    else verworfen.push(k);
  }
  return { gruppen, verworfen };
}

function zelleAus(gruppe: readonly Komponente[], nr: number, zeile: number): Zelle {
  let links = Number.POSITIVE_INFINITY;
  let oben = Number.POSITIVE_INFINITY;
  let rechts = -1;
  let unten = -1;
  let pixel = 0;
  for (const k of gruppe) {
    links = Math.min(links, k.links);
    oben = Math.min(oben, k.oben);
    rechts = Math.max(rechts, k.rechts);
    unten = Math.max(unten, k.unten);
    pixel += k.pixel;
  }
  return {
    nr, links, oben, breite: rechts - links + 1, hoehe: unten - oben + 1, pixel, zeile,
    komponenten: gruppe.map((k) => k.nr).sort((a, b) => a - b),
  };
}

function alsVerworfen(k: Komponente): Verworfen {
  return { links: k.links, oben: k.oben, breite: k.rechts - k.links + 1, hoehe: k.unten - k.oben + 1, pixel: k.pixel };
}

/**
 * Zellen finden: zusammenhängende Bereiche der Maske; Bereiche, deren
 * Rechteck kleiner als `mindestAnteil` der Blattfläche ist (und kleiner als
 * `vergleichsAnteil` der größten Zelle), schließen sich einer großen Zelle
 * an, deren Rechteck sie schneiden, sonst werden sie verworfen. Reihenfolge
 * zeilenweise (eine Zelle gehört zur laufenden Zeile, solange ihre Mitte
 * über deren Unterkante liegt), in der Zeile von links nach rechts. Mit
 * Raster: feste Felder statt Flutfüllung über das Blatt.
 */
export function findeZellen(fs: Freistellung, p: Parameter = STANDARD, raster?: Raster): Zellen {
  if (raster !== undefined) return findeRasterzellen(fs, raster);
  const marken = new Int32Array(fs.breite * fs.hoehe);
  const komps = markiere(fs, marken, 0, 0, fs.breite, fs.hoehe, 1);
  const { gruppen, verworfen } = gruppiere(komps, fs.breite * fs.hoehe * p.mindestAnteil, p.vergleichsAnteil);
  const roh = gruppen.map((g) => zelleAus(g, 0, 0));
  const nachY = roh.slice().sort((a, b) => 2 * a.oben + a.hoehe - (2 * b.oben + b.hoehe) || a.links - b.links);
  const zeilen: Zelle[][] = [];
  let unterkante = -1;
  for (const z of nachY) {
    const mitte2 = 2 * z.oben + z.hoehe;
    const letzte = zeilen[zeilen.length - 1];
    if (letzte === undefined || mitte2 > 2 * unterkante) {
      zeilen.push([z]);
      unterkante = z.oben + z.hoehe;
    } else {
      letzte.push(z);
      unterkante = Math.max(unterkante, z.oben + z.hoehe);
    }
  }
  const zellen: Zelle[] = [];
  zeilen.forEach((zeile, zi) => {
    zeile.sort((a, b) => a.links - b.links || a.oben - b.oben);
    for (const z of zeile) {
      z.zeile = zi + 1;
      z.nr = zellen.length + 1;
      zellen.push(z);
    }
  });
  return { zellen, verworfen: verworfen.map(alsVerworfen), marken, leer: [] };
}

/**
 * Rastermodus: je Feld die größte Komponente samt den Komponenten, die ihr
 * Rechteck schneiden; der Rest des Felds (Nummern) wird verworfen. Die
 * Zellnummer ist die Feldnummer (zeilenweise ab 1), leere Felder werden
 * gemeldet.
 */
function findeRasterzellen(fs: Freistellung, raster: Raster): Zellen {
  const marken = new Int32Array(fs.breite * fs.hoehe);
  const zellen: Zelle[] = [];
  const verworfen: Verworfen[] = [];
  const leer: number[] = [];
  let naechste = 1;
  for (let r = 0; r < raster.zeilen; r++) {
    for (let s = 0; s < raster.spalten; s++) {
      const x0 = Math.floor((s * fs.breite) / raster.spalten);
      const x1 = Math.floor(((s + 1) * fs.breite) / raster.spalten);
      const y0 = Math.floor((r * fs.hoehe) / raster.zeilen);
      const y1 = Math.floor(((r + 1) * fs.hoehe) / raster.zeilen);
      const komps = markiere(fs, marken, x0, y0, x1, y1, naechste);
      naechste += komps.length;
      const nr = r * raster.spalten + s + 1;
      let groesste: Komponente | undefined;
      for (const k of komps) if (groesste === undefined || flaeche(k) > flaeche(groesste)) groesste = k;
      if (groesste === undefined) {
        leer.push(nr);
        continue;
      }
      // Nur die größte Komponente ist groß; kleine, die ihr Rechteck schneiden, gehören dazu.
      const { gruppen, verworfen: weg } = gruppiere(komps, flaeche(groesste), 1);
      zellen.push(zelleAus(gruppen[0] as Komponente[], nr, r + 1));
      for (const g of gruppen.slice(1)) for (const k of g) verworfen.push(alsVerworfen(k));
      for (const k of weg) verworfen.push(alsVerworfen(k));
    }
  }
  return { zellen, verworfen, marken, leer };
}

/** Schneidet eine Zelle aus: nur Pixel ihrer Komponenten deckend, sonst durchsichtig. */
export function schneideAus(fs: Freistellung, z: Zellen, zelle: Zelle): Leinwand {
  const bild = new Leinwand(zelle.breite, zelle.hoehe);
  const gehoert = new Set(zelle.komponenten);
  for (let y = 0; y < zelle.hoehe; y++) {
    for (let x = 0; x < zelle.breite; x++) {
      const j = (zelle.oben + y) * fs.breite + zelle.links + x;
      if (gehoert.has(z.marken[j] as number)) bild.daten[y * zelle.breite + x] = fs.farbe[j] as Pixel;
    }
  }
  return bild;
}

/** Befund der Grundlinie: Zelle, deren Unterkante mehr als die Toleranz vom Median ihrer Blattzeile abweicht. */
export interface Grundlinienbefund {
  readonly zelle: number;
  /** Abweichung in Quellpixeln (positiv: tiefer als der Median). */
  readonly abweichung: number;
}

/** Grundlinie je Blattzeile prüfen („Grundlinie je Blatt gleich, sonst Befund“). */
export function pruefeGrundlinie(z: Zellen, p: Parameter = STANDARD): Grundlinienbefund[] {
  const befunde: Grundlinienbefund[] = [];
  const zeilen = new Map<number, Zelle[]>();
  for (const c of z.zellen) {
    const liste = zeilen.get(c.zeile) ?? [];
    liste.push(c);
    zeilen.set(c.zeile, liste);
  }
  for (const zi of [...zeilen.keys()].sort((a, b) => a - b)) {
    const liste = zeilen.get(zi) as Zelle[];
    const m = median(liste.map((c) => c.oben + c.hoehe));
    const zeilenhoehe = Math.max(...liste.map((c) => c.hoehe));
    for (const c of liste) {
      const d = c.oben + c.hoehe - m;
      if (Math.abs(d) > zeilenhoehe * p.grundlinienToleranz) befunde.push({ zelle: c.nr, abweichung: d });
    }
  }
  return befunde;
}

// ===========================================================================
// 3. Maßstab und Verkleinern
// ===========================================================================

/** Rundungsreserve, damit ein rechnerisch ganzzahliges Maß nicht auf die nächste Zahl aufgerundet wird. */
const EPSILON = 1e-9;
/** Schritte der Halbierungssuche nach dem Faktor, der die Stand-Zelle genau auf die Zielhöhe bringt. */
const SUCHSCHRITTE = 32;
/** Suchbereich um den Rohfaktor in Zielzeilen (Deckung, Rundung und Kontur kosten oder bringen bis zu zwei Zeilen). */
const SUCHZEILEN = 3;

/** Gewicht einer Zielspalte (oder -zeile): Quellindex und Überdeckungslänge. */
interface Gewicht {
  readonly q: number;
  readonly w: number;
}

function gewichte(a0: number, a1: number, laenge: number): Gewicht[] {
  const liste: Gewicht[] = [];
  const von = Math.max(0, Math.floor(a0));
  const bis = Math.min(laenge, Math.ceil(a1));
  for (let q = von; q < bis; q++) {
    const w = Math.min(a1, q + 1) - Math.max(a0, q);
    if (w > 0) liste.push({ q, w });
  }
  return liste;
}

/**
 * Verkleinern mit Flächenmittel: Jeder Zielpixel deckt eine Fläche von
 * 1/faktor × 1/faktor Quellpixeln. Deckung = Anteil deckender Quellfläche;
 * ab `deckung` wird der Pixel deckend mit dem gewichteten Mittel der
 * deckenden Quellfarben, gerundet (keine Halbtransparenz, kein Abdunkeln
 * durch den Grund). Ausrichtung: Unterkante und linke Kante des Ausschnitts
 * liegen auf dem Raster, damit die Fußzeile ganz bleibt.
 */
export function verkleinere(bild: Leinwand, faktor: number, p: Parameter = STANDARD): Leinwand {
  const zb = Math.max(1, Math.ceil(bild.breite * faktor - EPSILON));
  const zh = Math.max(1, Math.ceil(bild.hoehe * faktor - EPSILON));
  const aus = new Leinwand(zb, zh);
  const s = 1 / faktor;
  const gx: Gewicht[][] = [];
  for (let x = 0; x < zb; x++) gx.push(gewichte(x * s, (x + 1) * s, bild.breite));
  const gy: Gewicht[][] = [];
  for (let y = 0; y < zh; y++) gy.push(gewichte(bild.hoehe - (zh - y) * s, bild.hoehe - (zh - y - 1) * s, bild.hoehe));
  const voll = s * s;
  for (let y = 0; y < zh; y++) {
    for (let x = 0; x < zb; x++) {
      let deck = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const wy of gy[y] as Gewicht[]) {
        for (const wx of gx[x] as Gewicht[]) {
          const px = bild.daten[wy.q * bild.breite + wx.q] as Pixel;
          if ((px & 0xff) < HALB_DECKEND) continue;
          const w = wx.w * wy.w;
          const c = kanaele(px);
          deck += w;
          r += w * c[0];
          g += w * c[1];
          b += w * c[2];
        }
      }
      if (deck < voll * p.deckung) continue;
      aus.daten[y * zb + x] = rgbZuPixel([Math.round(r / deck), Math.round(g / deck), Math.round(b / deck)]);
    }
  }
  return aus;
}

/** Entfernt zusammenhängende Inseln (8er-Nachbarschaft) unter `mindestInsel` Pixeln; gibt die Zahl entfernter Pixel zurück. */
export function entferneInseln(bild: Leinwand, p: Parameter = STANDARD): number {
  const { breite, hoehe, daten } = bild;
  const marke = new Uint8Array(breite * hoehe);
  let entfernt = 0;
  const stapel: number[] = [];
  for (let j = 0; j < breite * hoehe; j++) {
    if (!deckend(daten[j] as Pixel) || marke[j] !== 0) continue;
    const insel: number[] = [];
    marke[j] = 1;
    stapel.push(j);
    while (stapel.length > 0) {
      const q = stapel.pop() as number;
      insel.push(q);
      const qx = q % breite;
      const qy = (q - qx) / breite;
      for (const [dx, dy] of NACHBARN) {
        const nx = qx + dx;
        const ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) continue;
        const m = ny * breite + nx;
        if (!deckend(daten[m] as Pixel) || marke[m] !== 0) continue;
        marke[m] = 1;
        stapel.push(m);
      }
    }
    if (insel.length < p.mindestInsel) {
      for (const q of insel) daten[q] = 0;
      entfernt += insel.length;
    }
  }
  return entfernt;
}

/** Verkleinert und entfernt Inseln (der Teil der Kette, der die Höhe ohne Kontur bestimmt). */
export function verkleinertBereinigt(bild: Leinwand, faktor: number, p: Parameter = STANDARD): Leinwand {
  const v = verkleinere(bild, faktor, p);
  entferneInseln(v, p);
  return v;
}

function deckendeHoehe(bild: Leinwand): number {
  return bild.begrenzung()?.h ?? 0;
}

/**
 * Höhe eines verkleinerten Bildes samt nachgesetzter Kontur (5): Wo die
 * Außenkante nicht dunkel ist, wächst die Figur um 1 Bildpixel. Für die
 * Suche nach dem Faktor zählt die Helligkeit der Mischfarben vor der
 * Palette (die Palette verschiebt sie nur wenig).
 */
export function hoeheMitKontur(verkleinert: Leinwand, p: Parameter = STANDARD): number {
  return deckendeHoehe(konturNachsetzen(verkleinert, dunkelPruefer(p), 0x000000ff).bild);
}

/**
 * Maßstab: Faktor aus der Stand-Zelle auf die Zielhöhe (Auftrag 5, 1:
 * 2 × (Umrisshöhe − 5) Bildpixel, gemessen samt Kontur). Rohfaktor =
 * Zielhöhe / Quellhöhe; weil Deckung, Rundung und die nachgesetzte Kontur
 * oben oder unten eine Zeile kosten oder bringen können, sucht eine
 * Halbierung im Bereich ±3 Zeilen den kleinsten Faktor, bei dem die
 * verkleinerte Stand-Zelle genau die Zielhöhe hat (G0b-3). Gelingt das
 * nicht, gilt der Rohfaktor. `hoehe` misst ein verkleinertes Bild.
 */
export function bestimmeFaktor(
  stand: Leinwand, zielhoehe: number, p: Parameter = STANDARD, hoehe: (verkleinert: Leinwand) => number = (v) => hoeheMitKontur(v, p),
): number {
  const h = (f: number): number => hoehe(verkleinertBereinigt(stand, f, p));
  const roh = zielhoehe / stand.hoehe;
  if (h(roh) === zielhoehe) return roh;
  let lo = (roh * (zielhoehe - SUCHZEILEN)) / zielhoehe;
  let hi = (roh * (zielhoehe + SUCHZEILEN)) / zielhoehe;
  if (h(lo) >= zielhoehe) return roh;
  if (h(hi) < zielhoehe) return roh;
  for (let i = 0; i < SUCHSCHRITTE; i++) {
    const mitte = (lo + hi) / 2;
    if (h(mitte) >= zielhoehe) hi = mitte;
    else lo = mitte;
  }
  return h(hi) === zielhoehe ? hi : roh;
}

// ===========================================================================
// 4. Palette je Figur (Medianschnitt) und Bodenton
// ===========================================================================

export interface Palettenergebnis {
  /** Abgebildete Bilder (gleiche Reihenfolge wie die Eingabe). */
  readonly bilder: Leinwand[];
  /** Palette der Figur, nach Helligkeit aufsteigend; höchstens hoechstFarben. */
  readonly palette: readonly Pixel[];
  /** Dunkelster Ton der Figur (palette[0]): Farbe der nachgesetzten Kontur. */
  readonly dunkelster: Pixel;
  /** Zahl der Quellfarben vor dem Schnitt. */
  readonly quellfarben: number;
  /** Quellfarben im Bereich der Hintergrundfarbe (bis toleranzHintergrund), die nicht am Schnitt teilnahmen. */
  readonly ohneSchnitt: number;
  /** Pixelgewichteter mittlerer und größter Abstand Quelle → Palette (farbAbstand). */
  readonly mittlererAbstand: number;
  readonly groessterAbstand: number;
  /** Pixel je Palettenfarbe in den abgebildeten Bildern (vor Kontur und Streupixeln). */
  readonly pixel: readonly number[];
}

/**
 * Palette (Auftrag 5, 1): eine Palette je Figur aus allen Bildern per
 * Medianschnitt (medianschnitt.ts), höchstens `hoechstFarben` Farben, jede
 * Farbe auf die nächste Palettenfarbe ohne Raster. Die Bilder enthalten nur
 * freigestellte Figurpixel; Farben bis `toleranzHintergrund` an einer der
 * `hintergruende` (Grund der Blätter: Pixel, die das Schließen in die Figur
 * nahm) sind vor dem Schnitt entfernt und gehen danach auf die nächste
 * Palettenfarbe (U2-7).
 */
export function bildePalette(bilder: readonly Leinwand[], p: Parameter = STANDARD, hintergruende: readonly Pixel[] = []): Palettenergebnis {
  const zahl = farbHaeufigkeit(bilder);
  const ohne = (f: Pixel): boolean => hintergruende.some((h) => farbAbstand(f, h) <= p.toleranzHintergrund);
  const s = medianschnitt(zahl, p.hoechstFarben, p.nachschaerfen, ohne);
  const pixel = s.palette.map(() => 0);
  const aus = bilder.map((b) => {
    const neu = new Leinwand(b.breite, b.hoehe);
    for (let j = 0; j < b.daten.length; j++) {
      const px = b.daten[j] as Pixel;
      if (!deckend(px)) continue;
      const i = s.abbildung.get(px) as number;
      neu.daten[j] = s.palette[i] as Pixel;
      pixel[i] = (pixel[i] as number) + 1;
    }
    return neu;
  });
  return {
    bilder: aus, palette: s.palette, dunkelster: s.palette[0] ?? 0, quellfarben: s.quellfarben, ohneSchnitt: s.ohneSchnitt,
    mittlererAbstand: s.mittlererAbstand, groessterAbstand: s.groessterAbstand, pixel,
  };
}

/** Dunkelster Bodenton (Auftrag 5, 4): Farbe, Helligkeit und Herkunft. */
export interface Bodenton {
  readonly farbe: Pixel;
  readonly helligkeit: number;
  /** z. B. 'hintergrund_f (traenenblech)'. */
  readonly herkunft: string;
}

/** Ein Hintergrundblatt mit Atlas, wie bauen.ts es schreibt (docs/grafik.md 4.8). */
export interface Hintergrundblatt {
  readonly name: string;
  readonly atlas: string;
  readonly blatt: Leinwand;
}

/**
 * Dunkelster Bodenton aller Hintergrundblätter (Auftrag 5, 4; U2-5): alle
 * Pixel der Kacheln, die eine Karte der Ebene `boden` verwendet. Solange die
 * Hintergründe aus Code kommen, gilt der dunkelste Ton aller Abschnitte für
 * alle Figuren. Ohne Bodenkarte: null.
 */
export function dunkelsterBodenton(blaetter: readonly Hintergrundblatt[]): Bodenton | null {
  let bester: Bodenton | null = null;
  for (const h of [...blaetter].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const atlas = JSON.parse(h.atlas) as {
      kachel?: number; kacheln?: number[][]; karten?: { ebene: string; name: string; kacheln: number[][] }[];
    };
    const k = atlas.kachel;
    if (k === undefined || atlas.kacheln === undefined || atlas.karten === undefined) continue;
    for (const karte of atlas.karten) {
      if (karte.ebene !== 'boden') continue;
      const ids = [...new Set(karte.kacheln.flat())].filter((i) => i >= 0).sort((a, b) => a - b);
      for (const id of ids) {
        const lage = atlas.kacheln[id];
        if (lage === undefined) continue;
        for (let y = 0; y < k; y++) {
          for (let x = 0; x < k; x++) {
            const px = h.blatt.hole((lage[0] as number) + x, (lage[1] as number) + y);
            if (!deckend(px)) continue;
            const l = helligkeit(px);
            if (bester === null || l < bester.helligkeit || (l === bester.helligkeit && deckendVon(px) < bester.farbe)) {
              bester = { farbe: deckendVon(px), helligkeit: l, herkunft: `${h.name} (${karte.name})` };
            }
          }
        }
      }
    }
  }
  return bester;
}

/** Hintergrundblätter hintergrund_*.png mit Atlas aus einem Ordner (sortiert). */
export function hintergrundblaetterLesen(ordner: string): Hintergrundblatt[] {
  if (!existsSync(ordner)) return [];
  return readdirSync(ordner)
    .filter((d) => /^hintergrund_.*\.json$/.test(d))
    .sort()
    .flatMap((d) => {
      const name = d.slice(0, -'.json'.length);
      const png = join(ordner, `${name}.png`);
      return existsSync(png) ? [{ name, atlas: readFileSync(join(ordner, d), 'utf8'), blatt: pngDateiLesen(png) }] : [];
    });
}

/** Hintergrundblätter aus den Bytes eines Baus (Dateiname → PNG oder JSON), z. B. aus bauen.ts. */
export function hintergrundblaetterAus(dateien: ReadonlyMap<string, Uint8Array | string>): Hintergrundblatt[] {
  const aus: Hintergrundblatt[] = [];
  for (const [datei, inhalt] of [...dateien].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const m = /^(hintergrund_.*)\.json$/.exec(datei);
    if (m === null || typeof inhalt !== 'string') continue;
    const png = dateien.get(`${m[1]}.png`);
    if (png === undefined || typeof png === 'string') continue;
    aus.push({ name: m[1] as string, atlas: inhalt, blatt: pngLesen(png) });
  }
  return aus;
}

// ===========================================================================
// 5. Kontur und Streupixel
// ===========================================================================

/** Prüfer „dunkle Kontur“: Helligkeit höchstens konturHelligkeit (U2-3). */
export function dunkelPruefer(p: Parameter = STANDARD): (px: Pixel) => boolean {
  return (px) => helligkeit(px) <= p.konturHelligkeit;
}

/** true, wenn der deckende Pixel (x, y) über eine Kante an Durchsichtig oder den Bildrand grenzt. */
function amRand(bild: Leinwand, x: number, y: number): boolean {
  for (let i = 0; i < KANTEN; i++) {
    const [dx, dy] = NACHBARN[i] as readonly [number, number];
    if (!deckend(bild.hole(x + dx, y + dy))) return true;
  }
  return false;
}

/** Außenkante: alle deckenden Pixel am Rand (über eine Kante an Durchsichtig oder den Bildrand), als Index y · breite + x. */
export function aussenkante(bild: Leinwand): Set<number> {
  const s = new Set<number>();
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) if (deckend(bild.hole(x, y)) && amRand(bild, x, y)) s.add(y * bild.breite + x);
  }
  return s;
}

/**
 * Bodenton (Auftrag 5, 4): Kein Figurenpixel darf dunkler als der dunkelste
 * Bodenton sein, außer in der Kontur. Pixel im Inneren (nicht an der
 * Außenkante) mit geringerer Helligkeit werden um eine Stufe aufgehellt: auf
 * die nächste Palettenfarbe (farbAbstand) mit mindestens der Helligkeit des
 * Bodentons. Gibt die Zahl der geänderten Pixel zurück.
 */
export function hellerAlsBoden(bild: Leinwand, palette: readonly Pixel[], boden: number): number {
  const hell = palette.filter((q) => helligkeit(q) >= boden);
  if (hell.length === 0) return 0;
  const ersatz = new Map<Pixel, Pixel>();
  const rand = aussenkante(bild);
  let n = 0;
  for (let j = 0; j < bild.daten.length; j++) {
    const px = bild.daten[j] as Pixel;
    if (!deckend(px) || rand.has(j) || helligkeit(px) >= boden) continue;
    let e = ersatz.get(px);
    if (e === undefined) {
      e = hell[0] as Pixel;
      let d = farbAbstand(px, e);
      for (const q of hell) {
        const dq = farbAbstand(px, q);
        if (dq < d) {
          d = dq;
          e = q;
        }
      }
      ersatz.set(px, e);
    }
    bild.daten[j] = e;
    n++;
  }
  return n;
}

/**
 * Streupixel bei 64 Farben (Stilhandbuch 1.3, U2-1): deckende Pixel, denen
 * keiner der acht Nachbarn ähnlich ist (gleiche Farbe oder farbAbstand
 * höchstens `abstand`). Farben in `ausnahmen` zählen nicht. Mit `abstand` 0
 * gleich kontur.ts streupixel.
 */
export function streupixelAehnlich(bild: Leinwand, abstand: number, ausnahmen: ReadonlySet<Pixel> = new Set()): Punkt[] {
  if (abstand <= 0) return streupixel(bild, ausnahmen);
  const aus: Punkt[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      const px = bild.hole(x, y);
      if (!deckend(px) || ausnahmen.has(px)) continue;
      let allein = true;
      for (const [dx, dy] of NACHBARN) {
        const n = bild.hole(x + dx, y + dy);
        if (deckend(n) && (n === px || farbAbstand(n, px) <= abstand)) {
          allein = false;
          break;
        }
      }
      if (allein) aus.push({ x, y });
    }
  }
  return aus;
}

/**
 * Streupixel entfernen (Stilhandbuch 1.3, wie v1): Ein Pixel ohne
 * gleichfarbigen der acht Nachbarn bekommt die häufigste erlaubte Farbe
 * seiner deckenden Nachbarn (Gleichstand: zuerst gefunden in NACHBARN).
 * `erlaubt(farbe, innen)` schließt Farben aus (im Inneren nichts unter dem
 * Bodenton). Wiederholt bis nichts mehr ändert oder höchstens `runden`. Die
 * Deckung ändert sich nicht. Gibt die Zahl der Änderungen zurück.
 */
export function streupixelEntfernen(
  bild: Leinwand, ausnahmen: ReadonlySet<Pixel>, runden: number, erlaubt: (farbe: Pixel, innen: boolean) => boolean = () => true, abstand: number = 0,
): number {
  let gesamt = 0;
  for (let r = 0; r < runden; r++) {
    let geaendert = 0;
    for (const q of streupixelAehnlich(bild, abstand, ausnahmen)) {
      const eigen = bild.hole(q.x, q.y);
      const innen = !amRand(bild, q.x, q.y);
      const zahl = new Map<Pixel, number>();
      let beste: Pixel | undefined;
      for (const [dx, dy] of NACHBARN) {
        const n = bild.hole(q.x + dx, q.y + dy);
        if (!deckend(n) || !erlaubt(n, innen)) continue;
        const z = (zahl.get(n) ?? 0) + 1;
        zahl.set(n, z);
        if (beste === undefined || z > (zahl.get(beste) as number)) beste = n;
      }
      if (beste !== undefined && beste !== eigen) {
        bild.setze(q.x, q.y, beste);
        geaendert++;
      }
    }
    gesamt += geaendert;
    if (geaendert === 0) break;
  }
  return gesamt;
}

/**
 * Kontur nachsetzen (Auftrag 5, 1): Die Figur bekommt 1 Bildpixel freien
 * Rand. Jeder durchsichtige Pixel, der über eine Kante an einen deckenden
 * Pixel grenzt, der nicht dunkel ist, wird `farbe` (der dunkelste Ton der
 * Figur). Dunkle Pixel der Außenkante sind die Kontur des Bildes und
 * bleiben. Danach grenzt kein heller Pixel mehr an Durchsichtig.
 */
export function konturNachsetzen(bild: Leinwand, dunkel: (px: Pixel) => boolean, farbe: Pixel): { bild: Leinwand; gesetzt: number } {
  const aus = new Leinwand(bild.breite + 2, bild.hoehe + 2);
  aus.einsetzen(bild, 1, 1);
  const neu: number[] = [];
  for (let y = 0; y < aus.hoehe; y++) {
    for (let x = 0; x < aus.breite; x++) {
      if (deckend(aus.hole(x, y))) continue;
      for (let i = 0; i < KANTEN; i++) {
        const [dx, dy] = NACHBARN[i] as readonly [number, number];
        const n = aus.hole(x + dx, y + dy);
        if (deckend(n) && !dunkel(n)) {
          neu.push(y * aus.breite + x);
          break;
        }
      }
    }
  }
  for (const j of neu) aus.daten[j] = farbe;
  return { bild: aus, gesetzt: neu.length };
}

/** Lücken der dunklen Kontur: Pixel der Außenkante, die nicht dunkel sind. Leer heißt: Kontur geschlossen. */
export function konturLueckenDunkel(bild: Leinwand, dunkel: (px: Pixel) => boolean): Punkt[] {
  const aus: Punkt[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      const px = bild.hole(x, y);
      if (deckend(px) && amRand(bild, x, y) && !dunkel(px)) aus.push({ x, y });
    }
  }
  return aus;
}

/** Pixel im Inneren (nicht an der Außenkante), die dunkler als der Bodenton sind. */
export function dunklerAlsBoden(bild: Leinwand, boden: number): Punkt[] {
  const aus: Punkt[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      const px = bild.hole(x, y);
      if (deckend(px) && !amRand(bild, x, y) && helligkeit(px) < boden) aus.push({ x, y });
    }
  }
  return aus;
}

/** Zähler der Bildbearbeitung je Figur (Protokoll). */
interface Bearbeitung {
  aufgehellt: number;
  streupixel: number;
  kontur: number;
  konturStreu: number;
}

/**
 * Ein verkleinertes, abgebildetes Bild fertig machen (Auftrag 5, 1 und 4):
 * Streupixel entfernen, Kontur nachsetzen, dann Bodenton (Pixel im Inneren,
 * also nicht an der Außenkante, um eine Stufe aufhellen), dann noch einmal
 * Streupixel, wobei ein Pixel der Außenkante nur dunkle Farben und einer im
 * Inneren nur Farben ab dem Bodenton annehmen darf (die Kontur bleibt dunkel
 * und geschlossen). Gibt das Bild mit 1 Bildpixel Rand zurück.
 */
export function fertigMachen(
  bild: Leinwand, palette: Palettenergebnis, boden: number | null, ausnahmen: ReadonlySet<Pixel>, p: Parameter, zaehler?: Bearbeitung,
): Leinwand {
  const dunkel = dunkelPruefer(p);
  const streu = streupixelEntfernen(bild, ausnahmen, p.streuRunden, () => true, p.streuAbstand);
  const k = konturNachsetzen(bild, dunkel, palette.dunkelster);
  const aufgehellt = boden === null ? 0 : hellerAlsBoden(k.bild, palette.palette, boden);
  const erlaubt = (f: Pixel, innen: boolean): boolean => (innen ? boden === null || helligkeit(f) >= boden : dunkel(f));
  const ks = streupixelEntfernen(k.bild, ausnahmen, p.streuRunden, erlaubt, p.streuAbstand);
  if (zaehler !== undefined) {
    zaehler.aufgehellt += aufgehellt;
    zaehler.streupixel += streu;
    zaehler.kontur += k.gesetzt;
    zaehler.konturStreu += ks;
  }
  return k.bild;
}

// ===========================================================================
// 6. Anker und Fußkontakt
// ===========================================================================

/**
 * Fußpunkt eines Bildes im Umsetzer: Pixel (x, y) mit y = unterste Zeile der
 * Figur. Die Spiegelachse liegt rechts neben Spalte x (zwischen x und x + 1).
 * Im Atlas mit Maßstab 2 steht der linke obere Bildpixel des 2 × 2-Blocks
 * des Fußpunkt-Spielpixels (Schnittstelle U1, zeichner.ts): ankerX = x,
 * ankerY = y − 1 (atlasAnker).
 */
export interface Anker {
  readonly x: number;
  readonly y: number;
}

/**
 * Anker im Atlas (Auftrag 5, Phase 1, Schnittstelle U1): Der Ankerpixel ist
 * der linke obere Bildpixel des Spielpixels am Fußpunkt. Die Darstellung legt
 * ihn auf die Bildposition (2 · bildX, 2 · bildY) und spiegelt um 2 · bildX + 1,
 * also genau um die Achse rechts neben Spalte x. Die unterste Zeile der Figur
 * liegt damit auf der unteren Bildpixelzeile des Fußpunkt-Spielpixels.
 */
export function atlasAnker(a: Anker): { ankerX: number; ankerY: number } {
  return { ankerX: a.x, ankerY: a.y - (MASSSTAB - 1) };
}

/** Fußpunkt aus einem Atlas-Anker (Umkehrung von atlasAnker). */
export function ankerAusAtlas(ankerX: number, ankerY: number): Anker {
  return { x: ankerX, y: ankerY + (MASSSTAB - 1) };
}

/**
 * Anker: y = unterste Zeile der Figur; x = Mitte der Füße, das heißt Mitte
 * zwischen dem linken und dem rechten deckenden Pixel im Fußband (die
 * untersten `fussband` der Figurhöhe, mindestens eine Zeile), abgerundet.
 * Liegende Posen: x = Mitte der Figur.
 */
export function bestimmeAnker(bild: Leinwand, liegend: boolean, p: Parameter = STANDARD): Anker {
  const u = bild.begrenzung();
  if (u === null) return { x: bild.breite >> 1, y: bild.hoehe - 1 };
  const unten = u.y + u.h - 1;
  if (liegend) return { x: (2 * u.x + u.b - 1) >> 1, y: unten };
  const band = Math.max(1, Math.round(u.h * p.fussband));
  let links = bild.breite;
  let rechts = -1;
  for (let y = unten - band + 1; y <= unten; y++) {
    for (let x = 0; x < bild.breite; x++) {
      if (!deckend(bild.hole(x, y))) continue;
      if (x < links) links = x;
      if (x > rechts) rechts = x;
    }
  }
  return { x: (links + rechts) >> 1, y: unten };
}

/**
 * Füße mit Bodenkontakt: Spalten mit deckenden Pixeln in den untersten
 * `fussHoehe` Zeilen bis zum Anker (dem tiefsten Pixel), zu Läufen
 * zusammengefasst (Lücken bis `kontaktLuecke` überbrückt: Profil der Sohle);
 * es bleiben die Läufe mit einem Pixel in den untersten `kontaktBand` + 1
 * Zeilen. Je Fuß [Anfang, Ende] in Bildpixeln des Bildes, von links nach rechts.
 */
export function bodenkontakt(bild: Leinwand, ankerY: number, p: Parameter = STANDARD): [number, number][] {
  const spalte = (x: number, y0: number): boolean => {
    for (let y = Math.max(0, y0); y <= ankerY; y++) if (deckend(bild.hole(x, y))) return true;
    return false;
  };
  const laeufe: [number, number][] = [];
  for (let x = 0; x < bild.breite; x++) {
    if (!spalte(x, ankerY - p.fussHoehe + 1)) continue;
    const letzter = laeufe[laeufe.length - 1];
    if (letzter !== undefined && x - letzter[1] - 1 <= p.kontaktLuecke) letzter[1] = x;
    else laeufe.push([x, x]);
  }
  return laeufe.filter(([x0, x1]) => {
    for (let x = x0; x <= x1; x++) if (spalte(x, ankerY - p.kontaktBand)) return true;
    return false;
  });
}

/** Körpermitte in x: Schwerpunkt der deckenden Pixel im oberen `koerperAnteil` der Figur (Kopf und Schultern). */
export function koerpermitte(bild: Leinwand, p: Parameter = STANDARD): number {
  const u = bild.begrenzung();
  if (u === null) return bild.breite / 2;
  const bis = u.y + Math.max(1, Math.round(u.h * p.koerperAnteil));
  let summe = 0;
  let n = 0;
  for (let y = u.y; y < bis; y++) {
    for (let x = u.x; x < u.x + u.b; x++) {
      if (!deckend(bild.hole(x, y))) continue;
      summe += x;
      n++;
    }
  }
  return n > 0 ? summe / n : bild.breite / 2;
}

/** Ergebnis des Fußkontakts einer Gehanimation (Protokoll). */
export interface Fusskontakt {
  readonly animation: string;
  /** Gehstrecke je Bild in Bildpixeln (Geschwindigkeit × Dauer × MASSSTAB). */
  readonly strecke: number;
  /** true: Die Anker dieser Animation wurden verschoben; false: nur gemessen (gleiche Bilder wie eine andere). */
  readonly verschoben: boolean;
  /** Rest je Zyklus in Bildpixeln: so weit rutscht der Standfuß über einen Zyklus (vor dem Verteilen). */
  readonly rest: number;
  /** Verschiebung des Ankers je Bild gegenüber dem Fußpunkt-Anker in Bildpixeln. */
  readonly verschiebung: readonly number[];
  /** Rutschen des Standfußes je Bildwechsel nach dem Verschieben (Bildpixel; Soll 0). */
  readonly rutschen: readonly number[];
  /** Mitte des Standfußes je Bildwechsel i → i + 1: x in Bild i und in Bild i + 1. */
  readonly standfuss: readonly (readonly [number, number])[];
}

/** Lage eines Fußes: Mitte seines Laufs. */
function fussMitte(l: readonly [number, number]): number {
  return (l[0] + l[1]) / 2;
}

/**
 * Standfuß über den ganzen Gehzyklus (U2-4). Je Bild i kommt der Standfuß
 * als Fuß a(i) an und geht als Fuß s(i) weiter; meist ist es derselbe Fuß.
 * Eine Übergabe (s(i) ≠ a(i)) ist nur zu einem Fuß vor dem alten möglich
 * (Blick nach rechts: der vordere hat aufgesetzt) und kommt je Zyklus genau
 * zweimal vor (jeder Fuß trägt einmal), wenn die Bilder das hergeben. Gewählt
 * wird die Folge, bei der sich der Standfuß relativ zur Körpermitte je
 * Bildwechsel am wenigsten von der Gehstrecke nach hinten unterscheidet
 * (Summe der Abweichungen; Gleichstand: erste Folge in fester Reihenfolge).
 * Gibt je Bildwechsel i → i + 1 die Lage des Standfußes in beiden Bildern
 * zurück (null ohne Bodenkontakt).
 */
export function standfussFolge(
  bilder: readonly { leinwand: Leinwand; anker: Anker }[], strecke: number, p: Parameter = STANDARD,
): ([number, number] | null)[] {
  const n = bilder.length;
  const fuesse = bilder.map((b) => bodenkontakt(b.leinwand, b.anker.y, p).map(fussMitte));
  if (fuesse.some((f) => f.length === 0)) return bilder.map(() => null);
  const mitte = bilder.map((b) => koerpermitte(b.leinwand, p));
  // Wahlen je Bild: [ankommend, gehend] als Indizes der Füße.
  const wahlen = fuesse.map((f) => {
    const w: [number, number][] = [];
    for (let a = 0; a < f.length; a++) for (let g = 0; g < f.length; g++) if (a === g || (f[g] as number) > (f[a] as number)) w.push([a, g]);
    return w;
  });
  const kosten = (i: number, g: number, a: number): number => {
    const j = (i + 1) % n;
    const xg = (fuesse[i] as number[])[g] as number;
    const xa = (fuesse[j] as number[])[a] as number;
    return Math.abs(xa - (mitte[j] as number) - (xg - (mitte[i] as number)) + strecke);
  };
  type Weg = { kosten: number; folge: number[] };
  const beste: { zwei: Weg | null; sonst: Weg | null } = { zwei: null, sonst: null };
  const w0 = wahlen[0] as [number, number][];
  w0.forEach((start, si) => {
    // dp[wahl][übergaben] über die Bilder 1 … n − 1, Start fest.
    let dp: Map<string, Weg> = new Map([[`${si}|${start[0] !== start[1] ? 1 : 0}`, { kosten: 0, folge: [si] }]]);
    for (let i = 1; i < n; i++) {
      const neu = new Map<string, Weg>();
      const wi = wahlen[i] as [number, number][];
      for (const [schl, weg] of dp) {
        const [vorher, ue] = schl.split('|').map(Number) as [number, number];
        const gv = ((wahlen[i - 1] as [number, number][])[vorher] as [number, number])[1];
        wi.forEach((wahl, k) => {
          const u = ue + (wahl[0] !== wahl[1] ? 1 : 0);
          const c = weg.kosten + kosten(i - 1, gv, wahl[0]);
          const key = `${k}|${u}`;
          const alt = neu.get(key);
          if (alt === undefined || c < alt.kosten) neu.set(key, { kosten: c, folge: [...weg.folge, k] });
        });
      }
      dp = neu;
    }
    for (const [schl, weg] of [...dp].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))) {
      const [letzte, ue] = schl.split('|').map(Number) as [number, number];
      const gl = ((wahlen[n - 1] as [number, number][])[letzte] as [number, number])[1];
      const c = weg.kosten + kosten(n - 1, gl, start[0]);
      const ziel = { kosten: c, folge: weg.folge };
      if (ue === 2) {
        if (beste.zwei === null || c < beste.zwei.kosten) beste.zwei = ziel;
      } else if (beste.sonst === null || c < beste.sonst.kosten) beste.sonst = ziel;
    }
  });
  const weg = (beste.zwei ?? beste.sonst) as Weg;
  return bilder.map((_, i) => {
    const j = (i + 1) % n;
    const g = ((wahlen[i] as [number, number][])[weg.folge[i] as number] as [number, number])[1];
    const a = ((wahlen[j] as [number, number][])[weg.folge[j] as number] as [number, number])[0];
    return [(fuesse[i] as number[])[g] as number, (fuesse[j] as number[])[a] as number];
  });
}

/**
 * Fußkontakt beim Gehen (Auftrag 5, 1, Punkt 4): Die Anker der Bilder werden
 * so gesetzt, dass der Standfuß je Bildwechsel um die Gehstrecke `strecke`
 * (Bildpixel) relativ zum Anker zurückwandert: A(i+1) = A(i) + x(i+1) − x(i)
 * + strecke. Was über den Zyklus nicht aufgeht (Rest = Summe aller
 * Schritte), wird gleichmäßig auf die Bildwechsel verteilt (U2-4), damit der
 * Zyklus schließt; der Fuß rutscht dann je Bild um Rest / n. Die Anker
 * liegen im Mittel auf den Fußpunkt-Ankern, ganzzahlig gerundet.
 */
export function fusskontaktSetzen(
  bilder: readonly { leinwand: Leinwand; anker: Anker }[], strecke: number, p: Parameter = STANDARD,
): { anker: Anker[]; rest: number; rutschen: number[]; standfuss: [number, number][]; verschiebung: number[] } {
  const n = bilder.length;
  const paare = standfussFolge(bilder, strecke, p);
  const schritte = paare.map((q) => (q === null ? strecke : q[1] - q[0] + strecke));
  const rest = schritte.reduce((s, d) => s + d, 0);
  const lage: number[] = [0];
  for (let i = 1; i < n; i++) lage.push((lage[i - 1] as number) + (schritte[i - 1] as number) - rest / n);
  // Mittlere Abweichung zum Fußpunkt-Anker auf 0 bringen.
  let mittel = 0;
  for (let i = 0; i < n; i++) mittel += (lage[i] as number) - (bilder[i] as { anker: Anker }).anker.x;
  mittel /= n;
  const anker = bilder.map((b, i) => ({ x: Math.round((lage[i] as number) - mittel), y: b.anker.y }));
  const rutschen: number[] = [];
  for (let i = 0; i < n; i++) {
    const q = paare[i];
    if (q === null) {
      rutschen.push(Number.NaN);
      continue;
    }
    const a0 = (anker[i] as Anker).x;
    const a1 = (anker[(i + 1) % n] as Anker).x;
    // Lage des Standfußes auf dem Schirm vorher und nachher (Entität rückt um strecke vor).
    rutschen.push(strecke + q[1] - a1 - (q[0] - a0));
  }
  return {
    anker, rest, rutschen,
    standfuss: paare.map((q) => (q === null ? [Number.NaN, Number.NaN] : q)),
    verschiebung: anker.map((a, i) => a.x - (bilder[i] as { anker: Anker }).anker.x),
  };
}

// ===========================================================================
// 7. Zuordnung und Quelle (Textdateien in fremd/<ordner>/)
// ===========================================================================

/** Eine Animation der Zuordnung: Name, Schleife, Dauer je Bild (Richtwert), aktive Bilder. */
export interface ZuordnungAnimation {
  readonly name: string;
  readonly schleife: boolean;
  readonly dauern: readonly number[];
  readonly aktiv?: readonly number[];
}

/** Zelle eines Blatts als Quelle eines Bildes. */
export interface ZellBezug {
  readonly blatt: string;
  readonly zelle: number;
}

/** Maßstab eines Blatts über eine Bezugszelle (Zeile `massstab <blatt> <zelle> wie <blatt> <zelle>`). */
export interface MassstabBezug extends ZellBezug {
  readonly wie: ZellBezug;
}

/** Bild einer Animation aus einer Zelle (Zeile `bild`). */
export interface ZuordnungBild extends ZellBezug {
  readonly animation: string;
  readonly index: number;
  readonly liegend: boolean;
  readonly spiegeln: boolean;
}

/** Bild einer Animation als Kopie eines anderen Bildes (`gleich`: gewollt; `ersatz`: Lücke, wird nachbestellt). */
export interface ZuordnungKopie {
  readonly animation: string;
  readonly index: number;
  readonly von: string;
  readonly vonIndex: number;
  readonly spiegeln: boolean;
  readonly nachbestellen: boolean;
}

export interface Zuordnung {
  /** Name des Blatts und Atlas, z. B. rammbock_grok. */
  readonly figur: string;
  /**
   * Stand der Lieferung (`datum JJJJ-MM-TT`, U2-6): Nennen zwei Ordner dieselbe Figur, baut bauen.ts
   * den neueren (gleiches Datum: den im Alphabet späteren Ordner); '' ohne Angabe gilt als ältester.
   */
  readonly datum: string;
  /** Umriss aus masse.ts: Gegnertyp ('Rammbock') oder 'Figur' (Vela). */
  readonly typ: string;
  /** Höhe des Stands in Bildpixeln samt Kontur (Auftrag 5, 1: 2 × (Umrisshöhe − 5)). */
  readonly zielhoehe: number;
  readonly massstab: ZellBezug;
  /**
   * Maßstab weiterer Blätter (G0b-11): Zelle eines Blatts, die dieselbe Pose zeigt wie eine Zelle
   * eines Blatts mit bekanntem Faktor; das Blatt wird so skaliert, dass beide gleich hoch sind.
   */
  readonly massstaebe: readonly MassstabBezug[];
  readonly animationen: readonly ZuordnungAnimation[];
  readonly bilder: readonly ZuordnungBild[];
  readonly kopien: readonly ZuordnungKopie[];
  /** Fußkontakt: Animation → Name der Gehgeschwindigkeit in werte.ts (16.16, px/Frame), in Zeilenfolge. */
  readonly gehen: ReadonlyMap<string, string>;
  /** Überschriebene Parameter. */
  readonly parameter: Partial<Parameter>;
}

function ganz(text: string | undefined, zeile: number, was: string): number {
  if (text === undefined || !/^-?\d+$/.test(text)) throw new Error(`zuordnung.txt, Zeile ${zeile}: ${was} fehlt oder ist keine ganze Zahl`);
  return Number(text);
}

/**
 * Liest fremd/<ordner>/zuordnung.txt (Format in docs/grafik.md 5.3 und 5.8). Zeilen:
 *   figur <name> | datum <JJJJ-MM-TT> | typ <Typ> | zielhoehe <Bildpixel>
 *   massstab <blatt> <zelle> [wie <blatt> <zelle>]
 *   animation <name> schleife|einmal <dauer> … [aktiv <i> …]
 *   bild <blatt> <zelle> <animation> <index> [liegend] [spiegeln]
 *   gleich|ersatz <animation> <index> <von> <vonIndex> [spiegeln]
 *   gehen <animation> <WERTNAME>
 *   parameter <name> <zahl>
 * `#` beginnt einen Kommentar. `materialien` (v1) gibt es nicht mehr.
 */
export function leseZuordnung(text: string): Zuordnung {
  let figur = '';
  let datum = '';
  let typ = '';
  let zielhoehe = 0;
  let massstab: ZellBezug | undefined;
  const massstaebe: MassstabBezug[] = [];
  const animationen: ZuordnungAnimation[] = [];
  const bilder: ZuordnungBild[] = [];
  const kopien: ZuordnungKopie[] = [];
  const gehen = new Map<string, string>();
  const parameter: Record<string, number> = {};
  text.split(/\r?\n/).forEach((roh, i) => {
    const nr = i + 1;
    const teile = (roh.split('#')[0] as string).trim().split(/\s+/).filter((t) => t.length > 0);
    const [wort, ...rest] = teile;
    if (wort === undefined) return;
    switch (wort) {
      case 'figur':
        figur = rest[0] ?? '';
        break;
      case 'datum':
        if (rest[0] === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(rest[0])) throw new Error(`zuordnung.txt, Zeile ${nr}: datum JJJJ-MM-TT`);
        datum = rest[0];
        break;
      case 'typ':
        typ = rest[0] ?? '';
        break;
      case 'zielhoehe':
        zielhoehe = ganz(rest[0], nr, 'Zielhöhe');
        break;
      case 'massstab': {
        const bezug = { blatt: rest[0] ?? '', zelle: ganz(rest[1], nr, 'Zelle') };
        if (rest[2] === 'wie') massstaebe.push({ ...bezug, wie: { blatt: rest[3] ?? '', zelle: ganz(rest[4], nr, 'Bezugszelle') } });
        else if (rest.length === 2) massstab = bezug;
        else throw new Error(`zuordnung.txt, Zeile ${nr}: massstab <blatt> <zelle> [wie <blatt> <zelle>]`);
        break;
      }
      case 'animation': {
        const name = rest[0];
        const art = rest[1];
        if (name === undefined || (art !== 'schleife' && art !== 'einmal')) {
          throw new Error(`zuordnung.txt, Zeile ${nr}: animation <name> schleife|einmal <dauer> …`);
        }
        const k = rest.indexOf('aktiv');
        const dauern = (k < 0 ? rest.slice(2) : rest.slice(2, k)).map((t) => ganz(t, nr, 'Dauer'));
        const aktiv = k < 0 ? undefined : rest.slice(k + 1).map((t) => ganz(t, nr, 'aktives Bild'));
        if (dauern.length === 0) throw new Error(`zuordnung.txt, Zeile ${nr}: Animation ${name} ohne Bilder`);
        if (animationen.some((a) => a.name === name)) throw new Error(`zuordnung.txt, Zeile ${nr}: Animation ${name} doppelt`);
        animationen.push(aktiv === undefined ? { name, schleife: art === 'schleife', dauern } : { name, schleife: art === 'schleife', dauern, aktiv });
        break;
      }
      case 'bild':
        bilder.push({
          blatt: rest[0] ?? '',
          zelle: ganz(rest[1], nr, 'Zelle'),
          animation: rest[2] ?? '',
          index: ganz(rest[3], nr, 'Bildindex'),
          liegend: rest.includes('liegend'),
          spiegeln: rest.includes('spiegeln'),
        });
        break;
      case 'gleich':
      case 'ersatz':
        kopien.push({
          animation: rest[0] ?? '',
          index: ganz(rest[1], nr, 'Bildindex'),
          von: rest[2] ?? '',
          vonIndex: ganz(rest[3], nr, 'Bildindex'),
          spiegeln: rest.includes('spiegeln'),
          nachbestellen: wort === 'ersatz',
        });
        break;
      case 'gehen':
        gehen.set(rest[0] ?? '', rest[1] ?? '');
        break;
      case 'parameter': {
        const name = rest[0] ?? '';
        const wert = Number(rest[1]);
        if (!(name in STANDARD) || !Number.isFinite(wert)) throw new Error(`zuordnung.txt, Zeile ${nr}: Parameter ${name} unbekannt oder ohne Zahl`);
        parameter[name] = wert;
        break;
      }
      default:
        throw new Error(`zuordnung.txt, Zeile ${nr}: unbekanntes Wort '${wort}'`);
    }
  });
  if (figur === '') throw new Error('zuordnung.txt: figur fehlt');
  if (zielhoehe <= 0) throw new Error('zuordnung.txt: zielhoehe fehlt');
  if (massstab === undefined) throw new Error('zuordnung.txt: massstab fehlt');
  const mitFaktor = new Set([massstab.blatt]);
  for (const m of massstaebe) {
    if (mitFaktor.has(m.blatt)) throw new Error(`zuordnung.txt: Blatt ${m.blatt} hat zwei Maßstäbe`);
    if (!mitFaktor.has(m.wie.blatt)) throw new Error(`zuordnung.txt: massstab ${m.blatt} wie ${m.wie.blatt}: Bezugsblatt ohne Maßstab (vorher festlegen)`);
    mitFaktor.add(m.blatt);
  }
  const namen = new Set(animationen.map((a) => a.name));
  for (const b of bilder) {
    const a = animationen.find((x) => x.name === b.animation);
    if (a === undefined) throw new Error(`zuordnung.txt: bild für unbekannte Animation ${b.animation}`);
    if (b.index < 0 || b.index >= a.dauern.length) throw new Error(`zuordnung.txt: ${b.animation} hat kein Bild ${b.index}`);
  }
  for (const k of kopien) {
    if (!namen.has(k.animation) || !namen.has(k.von)) throw new Error(`zuordnung.txt: Kopie ${k.animation} ${k.index} ← ${k.von} ${k.vonIndex} nennt eine unbekannte Animation`);
  }
  return { figur, datum, typ, zielhoehe, massstab, massstaebe, animationen, bilder, kopien, gehen, parameter: parameter as Partial<Parameter> };
}

/** Angaben aus quelle.txt, die der Umsetzer braucht: festes Raster je Blatt. */
export interface Quelle {
  readonly raster: ReadonlyMap<string, Raster>;
}

/**
 * Liest fremd/<ordner>/quelle.txt. Freier Text (Datum, Werkzeug, Prompt)
 * bleibt unbeachtet; ausgewertet werden nur Zeilen der Form
 * `raster <blatt.png> <spalten> <zeilen>` (festes Raster, wenn das Blatt
 * eines hat).
 */
export function leseQuelle(text: string): Quelle {
  const raster = new Map<string, Raster>();
  for (const zeile of text.split(/\r?\n/)) {
    const m = /^raster\s+(\S+\.png)\s+(\d+)\s+(\d+)\s*$/.exec(zeile.trim());
    if (m !== null) raster.set(m[1] as string, { spalten: Number(m[2]), zeilen: Number(m[3]) });
  }
  return { raster };
}

// ===========================================================================
// 8. Prüfungen nach E25 (Auftrag 5, 1 und 4)
// ===========================================================================

/** Umriss der Figur aus masse.ts (in Spielpixeln). */
export function umrissFuer(typ: string): Umriss {
  if (typ === 'Figur') return UMRISS_FIGUR;
  const u = (UMRISS_GEGNER as Readonly<Record<string, Umriss>>)[typ];
  if (u === undefined) throw new Error(`Umsetzer: Typ ${typ} hat keinen Umriss in masse.ts`);
  return u;
}

/** Zielhöhe in Bildpixeln aus dem Umriss (Auftrag 5, 1): 2 × (Umrisshöhe − Schattenhöhe / 2). */
export function zielhoeheFuer(typ: string): number {
  return MASSSTAB * (umrissFuer(typ).hoehe - SCHATTEN_HOEHE / 2);
}

/** Gehgeschwindigkeit in Spielpixeln je Frame aus werte.ts (16.16). */
export function gehgeschwindigkeit(name: string): number {
  const w = (werte as Readonly<Record<string, unknown>>)[name];
  if (typeof w !== 'number') throw new Error(`Umsetzer: ${name} ist kein Zahlenwert in werte.ts`);
  return w / EINS;
}

/** Ein Befund der Prüfungen. `hart` bricht den Bau ab (Farben, Kontur, Streupixel, Anker, Bodenton, aktive Bilder). */
export interface Befund {
  readonly hart: boolean;
  readonly text: string;
}

/** Untergrenze der Höhe im Stand als Anteil der Zielhöhe (wie docs/grafik.md 2.5, „Umriss im Stand“). */
const STAND_MINDESTANTEIL = 0.9;

/**
 * Prüfungen nach E25 für ein Grok-Blatt (Auftrag 5, Phase 1). Hart: Farben
 * je Figur höchstens hoechstFarben + 1 einschließlich durchsichtig, Kontur
 * geschlossen aus dunklem Ton (konturLueckenDunkel), keine Streupixel, Anker
 * im Bild, aktive Indizes, kein Pixel im Inneren dunkler als der Bodenton.
 * Weich: Umriss im Stand (2× Umriss, Zielhöhe).
 */
export function pruefeGrok(
  animationen: readonly Animation[], umriss: Umriss, zielhoehe: number, ausnahmen: ReadonlySet<Pixel>, boden: number | null, p: Parameter = STANDARD,
): Befund[] {
  const befunde: Befund[] = [];
  const dunkel = dunkelPruefer(p);
  const alle: Leinwand[] = [];
  const gesehen = new Set<Leinwand>();
  for (const a of animationen) {
    a.bilder.forEach((roh, i) => {
      const b = zugeschnitten(roh);
      const l = b.leinwand;
      const ort = `${a.name} Bild ${i}`;
      if (!(b.ankerX >= 0 && b.ankerX < l.breite && b.ankerY >= 0 && b.ankerY < l.hoehe)) {
        befunde.push({ hart: true, text: `${ort}: Anker im Bild: (${b.ankerX}, ${b.ankerY}) außerhalb ${l.breite} × ${l.hoehe}` });
      }
      if (gesehen.has(roh.leinwand)) return;
      gesehen.add(roh.leinwand);
      alle.push(l);
      const luecken = konturLueckenDunkel(l, dunkel);
      if (luecken.length > 0) befunde.push({ hart: true, text: `${ort}: Kontur geschlossen: ${luecken.length} helle Pixel an der Außenkante` });
      const streu = streupixelAehnlich(l, p.streuAbstand, ausnahmen);
      if (streu.length > 0) {
        const q = streu[0] as Punkt;
        befunde.push({ hart: true, text: `${ort}: Streupixel: ${streu.length}, erster bei (${q.x}, ${q.y})` });
      }
      if (boden !== null) {
        const zuDunkel = dunklerAlsBoden(l, boden);
        if (zuDunkel.length > 0) befunde.push({ hart: true, text: `${ort}: Bodenton: ${zuDunkel.length} Pixel im Inneren dunkler als der Bodenton` });
      }
    });
    for (const i of a.aktiv ?? []) {
      if (!(Number.isInteger(i) && i >= 0 && i < a.bilder.length)) befunde.push({ hart: true, text: `${a.name}: aktives Bild ${i} außerhalb` });
    }
  }
  const farben = farbenZaehlen(alle);
  if (farben > p.hoechstFarben + 1) befunde.push({ hart: true, text: `Farbzählung: ${farben} Farben einschließlich durchsichtig, erlaubt ${p.hoechstFarben + 1}` });
  const stand = animationen.find((a) => a.name === 'stand');
  if (stand === undefined) befunde.push({ hart: false, text: 'Umriss im Stand: Animation stand fehlt' });
  else {
    const b = zugeschnitten(stand.bilder[0] as Bild);
    const breite = MASSSTAB * umriss.breite;
    if (b.leinwand.breite > breite) befunde.push({ hart: false, text: `Umriss im Stand: Breite ${b.leinwand.breite} > ${breite}` });
    if (b.leinwand.hoehe > zielhoehe) befunde.push({ hart: false, text: `Umriss im Stand: Höhe ${b.leinwand.hoehe} > ${zielhoehe}` });
    if (b.leinwand.hoehe < STAND_MINDESTANTEIL * zielhoehe) befunde.push({ hart: false, text: `Umriss im Stand: Höhe ${b.leinwand.hoehe} < ${STAND_MINDESTANTEIL} · ${zielhoehe}` });
    if (b.ankerY !== b.leinwand.hoehe - MASSSTAB) befunde.push({ hart: false, text: `Umriss im Stand: Anker nicht im untersten Spielpixel (${b.ankerY} von ${b.leinwand.hoehe})` });
  }
  return befunde;
}

// ===========================================================================
// 9. Gesamtablauf
// ===========================================================================

/** Eingabe des Umsetzers: Blätter nach Dateiname, Zuordnung, Quelle. */
export interface Eingabe {
  readonly blaetter: ReadonlyMap<string, Leinwand>;
  readonly zuordnung: Zuordnung;
  readonly quelle: Quelle;
  /** Überschreibt Parameter (nach denen der Zuordnung). */
  readonly parameter?: Partial<Parameter>;
  /** Dunkelster Bodenton (Auftrag 5, 4); null oder fehlend: keine Prüfung, Befund im Protokoll. */
  readonly bodenton?: Bodenton | null;
}

/** Zellen eines Blatts mit Befunden (Protokoll). */
export interface Blattbericht {
  readonly blatt: string;
  readonly breite: number;
  readonly hoehe: number;
  readonly hintergrund: Hintergrund;
  readonly raster: Raster | undefined;
  readonly zellen: readonly Zelle[];
  readonly verworfen: readonly Verworfen[];
  readonly leer: readonly number[];
  readonly grundlinie: readonly Grundlinienbefund[];
  /** Pixel, die das Schließen zur Figur nahm. */
  readonly geschlossen: number;
  /** Gefüllte Löcher (dunkle Flächen) und ihre Pixel, offene Lücken (U2-2). */
  readonly loecherGefuellt: number;
  readonly loecherPixel: number;
  readonly loecherOffen: number;
}

/** Ein nachzubestellendes Bild (fehlt im Blatt, im Atlas durch Wiederholung ersetzt). */
export interface Nachbestellung {
  readonly animation: string;
  readonly index: number;
  /** Woraus das Ersatzbild stammt: 'gehen 2', 'gehen 2 gespiegelt' oder 'Stand' (ganze Animation fehlt). */
  readonly ersatz: string;
}

export interface Ergebnis {
  readonly figur: string;
  /** Faktor des Blatts mit der Stand-Zelle. */
  readonly faktor: number;
  /** Faktor je benutztem Blatt (G0b-11). */
  readonly faktoren: ReadonlyMap<string, number>;
  readonly blaetter: readonly Blattbericht[];
  readonly palette: Palettenergebnis;
  readonly animationen: readonly Animation[];
  readonly blatt: GepacktesBlatt;
  readonly nachbestellungen: readonly Nachbestellung[];
  readonly befunde: readonly Befund[];
  readonly fusskontakt: readonly Fusskontakt[];
  readonly bodenton: Bodenton | null;
  /** Zähler der Bildbearbeitung über alle Zellen. */
  readonly bearbeitung: Readonly<Bearbeitung>;
  /** Ausnahmen der Streupixelregel (leer: keine). */
  readonly ausnahmen: ReadonlySet<Pixel>;
  readonly zielhoehe: number;
  readonly umriss: Umriss;
}

/** Bild aus einer Zelle nach Palette und Kontur, mit Anker. */
interface Zellbild {
  readonly leinwand: Leinwand;
  readonly anker: Anker;
}

/** Spiegelt ein Zellbild; die Achse rechts neben der Ankerspalte bleibt an derselben Stelle der Figur. */
function spiegelBild(z: Zellbild): Zellbild {
  return { leinwand: z.leinwand.gespiegelt(), anker: { x: Math.max(0, z.leinwand.breite - 2 - z.anker.x), y: z.anker.y } };
}

/** Blätter, die eine Zuordnung braucht (Maßstab, Bezugszellen, Bilder), sortiert. */
export function benutzteBlaetter(zu: Zuordnung): string[] {
  const s = new Set<string>([zu.massstab.blatt, ...zu.bilder.map((b) => b.blatt)]);
  for (const m of zu.massstaebe) {
    s.add(m.blatt);
    s.add(m.wie.blatt);
  }
  return [...s].sort();
}

/**
 * Setzt die Blätter einer Figur um (Auftrag 5, 1): Freistellen und Zellen je
 * Blatt, Maßstab aus der Stand-Zelle, Verkleinern, Palette per Medianschnitt
 * über alle Bilder, Bodenton, Streupixel, Kontur, Anker, Fußkontakt beim
 * Gehen, Zuordnung mit Ersatzbildern, Prüfungen, Blatt mit Atlas.
 */
export function setzeUm(eingabe: Eingabe): Ergebnis {
  const zu = eingabe.zuordnung;
  const p: Parameter = { ...STANDARD, ...zu.parameter, ...(eingabe.parameter ?? {}) };
  const befunde: Befund[] = [];
  const bodenton = eingabe.bodenton ?? null;
  const boden = bodenton === null ? null : bodenton.helligkeit;
  if (bodenton === null) befunde.push({ hart: false, text: 'Bodenton: kein Hintergrundblatt mit Bodenkarte, Prüfung entfällt' });

  // 1 und 2: Freistellen und Zellen je benutztem Blatt (Reihenfolge nach Namen).
  const benutzt = benutzteBlaetter(zu);
  const blaetter: Blattbericht[] = [];
  const zellbestand = new Map<string, { fs: Freistellung; zellen: Zellen }>();
  for (const name of benutzt) {
    const bild = eingabe.blaetter.get(name);
    if (bild === undefined) throw new Error(`Umsetzer: Blatt ${name} fehlt`);
    const fs = freistellen(bild, p);
    const raster = eingabe.quelle.raster.get(name);
    const zellen = findeZellen(fs, p, raster);
    const grundlinie = pruefeGrundlinie(zellen, p);
    zellbestand.set(name, { fs, zellen });
    blaetter.push({
      blatt: name, breite: bild.breite, hoehe: bild.hoehe, hintergrund: fs.hintergrund, raster,
      zellen: zellen.zellen, verworfen: zellen.verworfen, leer: zellen.leer, grundlinie, geschlossen: fs.geschlossen,
      loecherGefuellt: fs.loecherGefuellt, loecherPixel: fs.loecherPixel, loecherOffen: fs.loecherOffen,
    });
    if (fs.hintergrund.streuung > p.toleranzHintergrund) {
      befunde.push({ hart: false, text: `${name}: Hintergrund nicht einfarbig (Ecken weichen bis ${fs.hintergrund.streuung.toFixed(1)} ab)` });
    }
    for (const g of grundlinie) befunde.push({ hart: false, text: `${name}: Zelle ${g.zelle} weicht ${g.abweichung} px von der Grundlinie ihrer Zeile ab` });
  }
  const zelleVon = (bezug: ZellBezug): { fs: Freistellung; zellen: Zellen; zelle: Zelle } => {
    const b = zellbestand.get(bezug.blatt) as { fs: Freistellung; zellen: Zellen };
    const zelle = b.zellen.zellen.find((c) => c.nr === bezug.zelle);
    if (zelle === undefined) throw new Error(`Umsetzer: ${bezug.blatt} hat keine Zelle ${bezug.zelle} (gefunden: ${b.zellen.zellen.length})`);
    return { ...b, zelle };
  };

  // 3: Maßstab aus der Stand-Zelle; ein Faktor für alle Blätter, außer ein Blatt hat einen eigenen über
  // eine Bezugszelle (G0b-11): dann so, dass seine Zelle so hoch wird wie die verkleinerte Bezugszelle.
  const stand = zelleVon(zu.massstab);
  const standQuelle = schneideAus(stand.fs, stand.zellen, stand.zelle);
  const faktor = bestimmeFaktor(standQuelle, zu.zielhoehe, p);
  const faktoren = new Map<string, number>([[zu.massstab.blatt, faktor]]);
  for (const m of zu.massstaebe) {
    const ref = zelleVon(m.wie);
    const refHoehe = hoeheMitKontur(verkleinertBereinigt(schneideAus(ref.fs, ref.zellen, ref.zelle), faktoren.get(m.wie.blatt) as number, p), p);
    const z = zelleVon(m);
    const f = bestimmeFaktor(schneideAus(z.fs, z.zellen, z.zelle), refHoehe, p);
    faktoren.set(m.blatt, f);
    const groesse = (100 * faktor) / f;
    befunde.push({
      hart: false,
      text: `${m.blatt}: Figur ${groesse.toFixed(0)} % so groß wie auf ${zu.massstab.blatt}, neu kalibriert über Zelle ${m.zelle} wie ${m.wie.blatt} ${m.wie.zelle} (Faktor ${f.toFixed(4)})`,
    });
  }
  const faktorVon = (blatt: string): number => faktoren.get(blatt) ?? faktor;

  // Verkleinerte Zellen in fester Reihenfolge (Stand zuerst, dann nach Zuordnung), jede nur einmal.
  const schluessel = (b: ZellBezug): string => `${b.blatt}#${b.zelle}`;
  const reihenfolge: ZellBezug[] = [zu.massstab];
  for (const b of zu.bilder) if (!reihenfolge.some((r) => schluessel(r) === schluessel(b))) reihenfolge.push(b);
  const verkleinert = reihenfolge.map((b) => {
    const z = zelleVon(b);
    return verkleinertBereinigt(schneideAus(z.fs, z.zellen, z.zelle), faktorVon(b.blatt), p);
  });

  // 4: Palette per Medianschnitt über alle Bilder der Figur.
  const gruende = [...new Set(blaetter.filter((b) => !b.hintergrund.durchsichtig).map((b) => b.hintergrund.farbe))].sort((a, b) => a - b);
  const palette = bildePalette(verkleinert, p, gruende);
  const ausnahmen = new Set<Pixel>();

  // 5 und 6: Bodenton, Streupixel, Kontur, Anker.
  const bearbeitung: Bearbeitung = { aufgehellt: 0, streupixel: 0, kontur: 0, konturStreu: 0 };
  const liegend = new Set(zu.bilder.filter((b) => b.liegend).map(schluessel));
  const zellbilder = new Map<string, Zellbild>();
  reihenfolge.forEach((b, i) => {
    const l = fertigMachen(palette.bilder[i] as Leinwand, palette, boden, ausnahmen, p, bearbeitung);
    zellbilder.set(schluessel(b), { leinwand: l, anker: bestimmeAnker(l, liegend.has(schluessel(b)), p) });
  });
  if (bearbeitung.aufgehellt > 0 && bodenton !== null) {
    befunde.push({
      hart: false,
      text: `Bodenton: ${bearbeitung.aufgehellt} Pixel im Inneren dunkler als ${pixelZuHex(bodenton.farbe)} (Helligkeit ${bodenton.helligkeit.toFixed(1)}, ${bodenton.herkunft}), um eine Stufe aufgehellt`,
    });
  }
  const standBild = zellbilder.get(schluessel(zu.massstab)) as Zellbild;

  // 7: Zuordnung. Eigene Bilder, dann Fußkontakt der Gehanimationen mit eigenen Bildern, dann Kopien
  // (`gleich`, `ersatz`; die Quelle wird ihrerseits aufgelöst), sonst Wiederholung des nächsten
  // vorherigen Bildes mit eigener Quelle, sonst des nächsten folgenden, sonst des Stands.
  const nachbestellungen: Nachbestellung[] = [];
  const eigen = new Map<string, Zellbild>();
  for (const b of zu.bilder) {
    const z = zellbilder.get(schluessel(b)) as Zellbild;
    eigen.set(`${b.animation}#${b.index}`, b.spiegeln ? spiegelBild(z) : z);
  }
  const dauernVon = new Map(zu.animationen.map((a) => [a.name, a.dauern]));
  const fusskontakt: Fusskontakt[] = [];
  const verschobenVon = new Map<string, number>();
  for (const [name, wert] of zu.gehen) {
    const dauern = dauernVon.get(name);
    if (dauern === undefined) throw new Error(`Umsetzer: gehen nennt unbekannte Animation ${name}`);
    const strecke = gehgeschwindigkeit(wert) * (dauern[0] as number) * MASSSTAB;
    const alleEigen = dauern.every((_, i) => eigen.has(`${name}#${i}`));
    if (!alleEigen) continue;
    const bilder = dauern.map((_, i) => eigen.get(`${name}#${i}`) as Zellbild);
    const f = fusskontaktSetzen(bilder, strecke, p);
    f.anker.forEach((a, i) => eigen.set(`${name}#${i}`, { leinwand: (bilder[i] as Zellbild).leinwand, anker: a }));
    verschobenVon.set(name, strecke);
    fusskontakt.push({ animation: name, strecke, verschoben: true, rest: f.rest, verschiebung: f.verschiebung, rutschen: f.rutschen, standfuss: f.standfuss });
  }
  const kopie = new Map<string, ZuordnungKopie>();
  for (const k of zu.kopien) kopie.set(`${k.animation}#${k.index}`, k);
  const fertig = new Map<string, Zellbild>();
  const aufloesen = (anim: string, i: number, pfad: readonly string[]): Zellbild => {
    const k0 = `${anim}#${i}`;
    const schon = fertig.get(k0);
    if (schon !== undefined) return schon;
    if (pfad.includes(k0)) throw new Error(`Umsetzer: Kopien im Kreis: ${[...pfad, k0].join(' → ')}`);
    const reihe = dauernVon.get(anim);
    if (reihe === undefined || i < 0 || i >= reihe.length) throw new Error(`Umsetzer: ${anim} hat kein Bild ${i}`);
    let z = eigen.get(k0);
    const k = kopie.get(k0);
    if (z === undefined && k !== undefined) {
      const q = aufloesen(k.von, k.vonIndex, [...pfad, k0]);
      z = k.spiegeln ? spiegelBild(q) : q;
      if (k.nachbestellen) nachbestellungen.push({ animation: anim, index: i, ersatz: `${k.von} ${k.vonIndex}${k.spiegeln ? ' gespiegelt' : ''}` });
    }
    if (z === undefined) {
      const hatQuelle = (j: number): boolean => eigen.has(`${anim}#${j}`) || kopie.has(`${anim}#${j}`);
      let quelle = -1;
      for (let j = i - 1; j >= 0 && quelle < 0; j--) if (hatQuelle(j)) quelle = j;
      for (let j = i + 1; j < reihe.length && quelle < 0; j++) if (hatQuelle(j)) quelle = j;
      z = quelle >= 0 ? aufloesen(anim, quelle, [...pfad, k0]) : standBild;
      nachbestellungen.push({ animation: anim, index: i, ersatz: quelle >= 0 ? `${anim} ${quelle}` : 'Stand' });
    }
    fertig.set(k0, z);
    return z;
  };
  // Bei 2× wäre eine Zeile je Animation höher als BLATT_MAX: die Animationen setzen die Zeile fort (G1-8).
  const animationen: Animation[] = zu.animationen.map((a, ai) => {
    const bilder: Bild[] = a.dauern.map((dauer, i) => {
      const z = aufloesen(a.name, i, []);
      return { leinwand: z.leinwand, ...atlasAnker(z.anker), dauer };
    });
    const basis = { name: a.name, schleife: a.schleife, bilder, zeileFortsetzen: ai > 0 };
    return a.aktiv === undefined ? basis : { ...basis, aktiv: a.aktiv };
  });
  // Gehanimationen aus Kopien (gehen_schnell = gehen): Rest bei ihrer Geschwindigkeit nur messen.
  for (const [name, wert] of zu.gehen) {
    if (verschobenVon.has(name)) continue;
    const a = animationen.find((x) => x.name === name) as Animation;
    const strecke = gehgeschwindigkeit(wert) * ((a.bilder[0] as Bild).dauer) * MASSSTAB;
    const bilder = a.bilder.map((b) => ({ leinwand: b.leinwand, anker: ankerAusAtlas(b.ankerX, b.ankerY) }));
    const f = fusskontaktSetzen(bilder, strecke, p);
    const rutschen = f.standfuss.map((q, i) => {
      const a0 = (bilder[i] as { anker: Anker }).anker.x;
      const a1 = (bilder[(i + 1) % bilder.length] as { anker: Anker }).anker.x;
      return strecke + q[1] - a1 - (q[0] - a0);
    });
    const rest = rutschen.reduce((s, r) => s + r, 0);
    fusskontakt.push({ animation: name, strecke, verschoben: false, rest, verschiebung: bilder.map(() => 0), rutschen, standfuss: f.standfuss });
  }
  for (const f of fusskontakt) {
    befunde.push({
      hart: false,
      text: `Fußkontakt ${f.animation}: Strecke ${f.strecke.toFixed(1)} Bildpixel je Bild, Rest ${f.rest.toFixed(1)} Bildpixel (${(f.rest / MASSSTAB).toFixed(1)} Spielpixel) je Zyklus${f.verschoben ? ', gleichmäßig verteilt' : ', gemessen mit den Ankern der Quelle'}`,
    });
  }

  // Reichweite im Trefferbild (erstes aktives Bild): vorderster Pixel vor der Spiegelachse, in Spielpixeln (Befund).
  for (const a of animationen) {
    const i = a.aktiv?.[0];
    if (i === undefined) continue;
    const b = a.bilder[i] as Bild;
    const g = b.leinwand.begrenzung();
    if (g === null) continue;
    const weite = (g.x + g.b - 1 - b.ankerX) / MASSSTAB;
    befunde.push({ hart: false, text: `Reichweite ${a.name} im Trefferbild (Bild ${i}): ${weite.toFixed(1)} Spielpixel vor dem Fußpunkt` });
  }

  // 8: Prüfungen nach E25.
  const umriss = umrissFuer(zu.typ);
  for (const b of pruefeGrok(animationen, umriss, zu.zielhoehe, ausnahmen, boden, p)) befunde.push(b);
  // Zusätzlich je Zelle: Umriss (2×) überschritten (Angriffsposen dürfen das, 1.1), liegend gegen den gedrehten Umriss.
  for (const b of reihenfolge) {
    const g = (zellbilder.get(schluessel(b)) as Zellbild).leinwand.begrenzung();
    if (g === null) continue;
    const [ub, uh] = liegend.has(schluessel(b)) ? [umriss.hoehe, umriss.breite] : [umriss.breite, umriss.hoehe];
    if (g.b > MASSSTAB * ub) befunde.push({ hart: false, text: `${b.blatt} Zelle ${b.zelle}: ${g.b} Bildpixel breit, Umriss ${MASSSTAB * ub}` });
    if (g.h > MASSSTAB * uh) befunde.push({ hart: false, text: `${b.blatt} Zelle ${b.zelle}: ${g.h} Bildpixel hoch, Umriss ${MASSSTAB * uh}` });
  }
  const standHoehe = standBild.leinwand.begrenzung()?.h ?? 0;
  if (standHoehe !== zu.zielhoehe) befunde.push({ hart: false, text: `Stand ${standHoehe} Bildpixel hoch, Ziel ${zu.zielhoehe}` });

  const blatt = blattPacken(zu.figur, animationen, { maxBreite: BLATT_MAX });
  const alleFaktoren = new Map([...benutzt].sort().map((b) => [b, faktorVon(b)] as const));
  return {
    figur: zu.figur, faktor, faktoren: alleFaktoren, blaetter, palette, animationen, blatt, nachbestellungen, befunde,
    fusskontakt, bodenton, bearbeitung, ausnahmen, zielhoehe: zu.zielhoehe, umriss,
  };
}

// ===========================================================================
// 10. Ausgabe: Atlas mit Maßstab, Kontaktbögen, Protokoll, Aufruf
// ===========================================================================

/** Atlas als JSON-Text wie atlasText (blatt.ts) mit dem Feld "massstab" auf oberster Ebene (Auftrag 5, 1). */
export function grokAtlasText(atlas: Atlas, massstab: number = MASSSTAB): string {
  const zeilen = atlasText(atlas).split('\n');
  return [zeilen[0], zeilen[1], `  "massstab": ${massstab},`, ...zeilen.slice(2)].join('\n');
}

/** Bytes des Grok-Blatts: PNG und Atlas mit Maßstab (ohne zu schreiben). */
export function grokBytes(e: Ergebnis): { png: Uint8Array; json: string } {
  return { png: pngSchreiben(e.blatt.leinwand), json: grokAtlasText(e.blatt.atlas) };
}

/** Schreibt `${ordner}/${figur}.png` und `.json`; gibt Pfade und MD5 des PNG zurück. */
export function grokSchreiben(ordner: string, e: Ergebnis): { png: string; json: string; md5: string } {
  mkdirSync(ordner, { recursive: true });
  const bytes = grokBytes(e);
  const png = join(ordner, `${e.figur}.png`);
  const json = join(ordner, `${e.figur}.json`);
  writeFileSync(png, bytes.png);
  writeFileSync(json, bytes.json);
  return { png, json, md5: md5(bytes.png) };
}

/** Rand, Lücke und Zeilenhöhe der Kontaktbögen in Bildpixeln (Schrift 2×, Festlegung U2). */
const K_SCHRIFT = 2;
const K_RAND = 8;
const K_LUECKE = 8;
const K_ZEILE = (ZEICHEN_HOEHE + 3) * K_SCHRIFT;
const K_KREUZ = 3;

/**
 * Kontaktbogen eines Grok-Blatts (Auftrag 5, Phase 1): alle Bilder einer
 * Animation in natürlicher Größe (2× Bildpixel, nicht weiter vergrößert),
 * am Anker auf derselben Bodenlinie ausgerichtet (unter dem 2 × 2-Block des
 * Fußpunkts), Ankerkreuz auf der Spiegelachse, Rahmen um die aktiven Bilder,
 * darunter Bildnummer und Dauer (Schrift 3 × 5 in 2×).
 */
export function grokKontaktBogen(animation: Animation): Leinwand {
  const bilder = animation.bilder.map(zugeschnitten);
  if (bilder.length === 0) throw new Error(`Kontaktbogen ${animation.name}: keine Bilder`);
  let links = 0;
  let rechts = 0;
  let oben = 0;
  let unten = 0;
  for (const b of bilder) {
    links = Math.max(links, b.ankerX);
    rechts = Math.max(rechts, b.leinwand.breite - b.ankerX);
    oben = Math.max(oben, b.ankerY);
    unten = Math.max(unten, b.leinwand.hoehe - b.ankerY);
  }
  unten = Math.max(unten, K_KREUZ + MASSSTAB + 1);
  const texte = bilder.map((b, i) => `${i}:${b.dauer}F`);
  const zelleB = Math.max(links + rechts + 4, ...texte.map((t) => textBreite(t, K_SCHRIFT) + 2));
  const zelleH = oben + unten + 4;
  const summe = bilder.reduce((s, b) => s + b.dauer, 0);
  const titel = `${animation.name}  ${bilder.length} BILDER  SUMME ${summe} F${animation.schleife ? '  SCHLEIFE' : ''}  2×`;
  const breite = Math.max(K_RAND * 2 + bilder.length * zelleB + (bilder.length - 1) * K_LUECKE, K_RAND * 2 + textBreite(titel, K_SCHRIFT));
  const hoehe = K_RAND + K_ZEILE + zelleH + 4 + K_ZEILE + K_RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, titel, K_RAND, K_RAND, KONTAKT_TEXT, K_SCHRIFT);
  const aktiv = new Set(animation.aktiv ?? []);
  const y0 = K_RAND + K_ZEILE;
  bilder.forEach((b, i) => {
    const x0 = K_RAND + i * (zelleB + K_LUECKE);
    if (aktiv.has(i)) bogen.rechteck(x0 - 2, y0 - 2, zelleB + 4, zelleH + 4, KONTAKT_AKTIV);
    bogen.rechteck(x0, y0, zelleB, zelleH, KONTAKT_ZELLE);
    const ax = x0 + 2 + links;
    const ay = y0 + 2 + oben;
    // Bodenlinie unter dem Spielpixel des Fußpunkts (2 × 2 ab dem Anker), Kreuz auf der Spiegelachse
    bogen.rechteck(x0, ay + MASSSTAB, zelleB, 1, KONTAKT_BODEN);
    bogen.rechteck(ax + 1 - K_KREUZ, ay + MASSSTAB + K_KREUZ, 2 * K_KREUZ, 1, KONTAKT_ANKER);
    bogen.rechteck(ax, ay + MASSSTAB, 2, 2 * K_KREUZ + 1, KONTAKT_ANKER);
    bogen.einsetzen(b.leinwand, ax - b.ankerX, ay - b.ankerY);
    textZeichnen(bogen, texte[i] as string, x0, y0 + zelleH + 4, aktiv.has(i) ? KONTAKT_AKTIV : KONTAKT_TEXT, K_SCHRIFT);
  });
  return bogen;
}

/** Dateiname des Kontaktbogens einer Animation unter docs/bilder/. */
export function kontaktDatei(figur: string, animation: string): string {
  return `kontakt_${figur}_${animation}.png`;
}

/** Schreibt den Kontaktbogen als PNG nach pfad; gibt das MD5 zurück. */
export function grokKontaktSchreiben(pfad: string, animation: Animation): string {
  mkdirSync(dirname(pfad), { recursive: true });
  const bytes = pngSchreiben(grokKontaktBogen(animation));
  writeFileSync(pfad, bytes);
  return md5(bytes);
}

/** Protokoll als Markdown (für docs/grafik.md 5.8): Blätter, Maßstab, Palette, Fußkontakt, Nachbestellungen, Befunde. */
export function protokoll(e: Ergebnis): string {
  const z: string[] = [];
  z.push(`### Protokoll ${e.figur}`, '', `MD5 des Blatts ${md5(grokBytes(e).png)} (${e.blatt.leinwand.breite} × ${e.blatt.leinwand.hoehe}, Maßstab ${MASSSTAB})`, '');
  z.push('| Blatt | Maß | Hintergrund | Zellen je Zeile | verworfen | geschlossen px | Löcher gefüllt (px) / offen | Raster | Faktor |', '|---|---|---|---|---|---|---|---|---|');
  for (const b of e.blaetter) {
    const jeZeile: number[] = [];
    for (const c of b.zellen) jeZeile[c.zeile - 1] = (jeZeile[c.zeile - 1] ?? 0) + 1;
    const raster = b.raster === undefined ? '–' : `${b.raster.spalten} × ${b.raster.zeilen}`;
    z.push(`| ${b.blatt} | ${b.breite} × ${b.hoehe} | ${pixelZuHex(b.hintergrund.farbe)} | ${[...jeZeile].map((n) => n ?? 0).join(' + ')} = ${b.zellen.length} | ${b.verworfen.length} | ${b.geschlossen} | ${b.loecherGefuellt} (${b.loecherPixel}) / ${b.loecherOffen} | ${raster} | ${(e.faktoren.get(b.blatt) ?? e.faktor).toFixed(4)} |`);
  }
  const p = e.palette;
  z.push('', `Palette: ${p.palette.length} Farben (Medianschnitt aus ${p.quellfarben} Quellfarben, davon ${p.ohneSchnitt} im Bereich des Grunds ohne Schnitt), dunkelster Ton ${pixelZuHex(p.dunkelster)}, Abstand pixelgewichtet ${p.mittlererAbstand.toFixed(1)}, größter ${p.groessterAbstand.toFixed(1)}.`);
  z.push('', '| Farbe | Helligkeit | Pixel |', '|---|---|---|');
  p.palette.forEach((f, i) => z.push(`| ${pixelZuHex(f)} | ${helligkeit(f).toFixed(1)} | ${p.pixel[i] ?? 0} |`));
  const b = e.bearbeitung;
  z.push('', `Bearbeitung: ${b.aufgehellt} Pixel über den Bodenton aufgehellt${e.bodenton === null ? ' (kein Bodenton)' : ` (${pixelZuHex(e.bodenton.farbe)}, Helligkeit ${e.bodenton.helligkeit.toFixed(1)}, ${e.bodenton.herkunft})`}, ${b.streupixel} Streupixel umgefärbt, ${b.kontur} Konturpixel nachgesetzt, ${b.konturStreu} Streupixel nach Kontur und Bodenton umgefärbt.`);
  z.push('', 'Fußkontakt:');
  if (e.fusskontakt.length === 0) z.push('- keine Gehanimation');
  for (const f of e.fusskontakt) {
    z.push(`- ${f.animation}: Strecke ${f.strecke.toFixed(1)} Bildpixel je Bild, Rest ${f.rest.toFixed(1)} Bildpixel je Zyklus (${(f.rest / MASSSTAB).toFixed(1)} Spielpixel), ${f.verschoben ? `Anker verschoben um ${f.verschiebung.join(', ')}` : 'nur gemessen'}; Rutschen je Bild ${f.rutschen.map((r) => r.toFixed(1)).join(', ')}`);
  }
  z.push('', 'Nachbestellungen:');
  if (e.nachbestellungen.length === 0) z.push('- keine');
  for (const n of e.nachbestellungen) z.push(`- ${n.animation} Bild ${n.index} (ersetzt durch ${n.ersatz})`);
  z.push('', 'Befunde:');
  if (e.befunde.length === 0) z.push('- keine');
  for (const x of e.befunde) z.push(`- ${x.hart ? 'HART: ' : ''}${x.text}`);
  return z.join('\n') + '\n';
}

/** Ordner spiel/grafik/ausgabe/ (Vorgabe für die Hintergrundblätter mit dem Bodenton). */
export const AUSGABE_VORGABE = fileURLToPath(new URL('../ausgabe/', import.meta.url));

/**
 * Liest einen Ordner fremd/<ordner>/ (Blätter der Zuordnung, zuordnung.txt,
 * quelle.txt) und setzt ihn um. Der Bodenton kommt aus den
 * Hintergrundblättern in `ausgabe` (Vorgabe spiel/grafik/ausgabe/), wenn
 * er nicht übergeben wird.
 */
export function umsetzenOrdner(ordner: string, parameter: Partial<Parameter> = {}, bodenton?: Bodenton | null, ausgabe: string = AUSGABE_VORGABE): Ergebnis {
  const zuordnung = leseZuordnung(readFileSync(join(ordner, 'zuordnung.txt'), 'utf8'));
  const quellPfad = join(ordner, 'quelle.txt');
  const quelle = leseQuelle(existsSync(quellPfad) ? readFileSync(quellPfad, 'utf8') : '');
  const blaetter = new Map<string, Leinwand>();
  for (const datei of benutzteBlaetter(zuordnung)) blaetter.set(datei, pngDateiLesen(join(ordner, datei)));
  const ton = bodenton === undefined ? dunkelsterBodenton(hintergrundblaetterLesen(ausgabe)) : bodenton;
  return setzeUm({ blaetter, zuordnung, quelle, parameter, bodenton: ton });
}

function hauptprogramm(argumente: readonly string[]): number {
  const ordner = argumente[0];
  if (ordner === undefined) {
    process.stderr.write('Aufruf: umsetzer.ts <fremd/ordner> [--aus <ordner>] [--kontakt <ordner>]\n');
    return 2;
  }
  const wert = (schalter: string): string | undefined => {
    const i = argumente.indexOf(schalter);
    return i >= 0 ? argumente[i + 1] : undefined;
  };
  const aus = wert('--aus') ?? resolve(ordner, '..', '..', '..', 'ausgabe');
  // Bodenton aus den Hintergrundblättern des Baus (spiel/grafik/ausgabe/), auch wenn --aus woanders hin schreibt
  const e = umsetzenOrdner(ordner);
  const geschrieben = grokSchreiben(aus, e);
  process.stdout.write(protokoll(e));
  process.stdout.write(`\n${geschrieben.png}  MD5 ${geschrieben.md5}\n${geschrieben.json}\n`);
  const kontakt = wert('--kontakt');
  if (kontakt !== undefined) {
    for (const a of e.animationen) {
      const pfad = join(kontakt, kontaktDatei(e.figur, a.name));
      process.stdout.write(`${pfad}  MD5 ${grokKontaktSchreiben(pfad, a)}\n`);
    }
  }
  return e.befunde.some((b) => b.hart) ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = hauptprogramm(process.argv.slice(2));
}
