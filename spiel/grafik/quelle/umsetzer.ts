// Umsetzer für Bildblätter (Auftrag 4, Abschnitt 9.3, Weg C).
//
// Macht aus Bildblättern eines fremden Werkzeugs (Grok) Sprites im
// Atlas-Format (Auftrag 4, 2.3). Ablauf je Figur:
//   1. Hintergrund aus den vier Ecken, Freistellen mit Toleranz und
//      Randentscheidung nach dem Mehrheitsnachbarn (keine Halbtransparenz).
//   2. Zellen per Flutfüllung (oder festes Raster aus quelle.txt), kleine
//      Bereiche (Nummern, Staub) verwerfen, Reihenfolge zeilenweise.
//   3. Maßstab: ein Faktor je Figur aus der Stand-Zelle auf die Zielhöhe,
//      Verkleinern mit Flächenmittel, Deckung ab 1/2.
//   4. Palette: jede Farbe auf die nächste Stufe der Materialtreppen der
//      Figur (palette.ts), höchstens 15 Farben, Abstand je Farbe im Protokoll.
//   5. Kontur: Innenkonturen im dunkelsten Materialton, Außenkontur in
//      KONTUR neu (kontur.ts), Streupixel entfernen (Stilhandbuch 1.3).
//   6. Anker: unterste Zeile, x Mitte der Füße (liegend: Mitte der Figur).
//   7. Zuordnung Zelle → Animation, Bildindex aus fremd/<figur>/zuordnung.txt,
//      fehlende Bilder durch Wiederholung, Ausgabe als Blatt mit Atlas.
//
// PNG lesen, Treppen, Palette, Kontur, Blatt und Kontaktbogen kommen aus dem
// Werkzeugkasten (png.ts, farbe.ts, palette.ts, kontur.ts, blatt.ts,
// kontakt.ts). Deterministisch: kein Math.random, kein Date, feste
// Reihenfolgen. Ablauf, Parameter und Grenzen: docs/grafik.md, Abschnitt 5.
//
// Aufruf: node --experimental-strip-types grafik/quelle/umsetzer.ts
//         grafik/quelle/fremd/rammbock [--aus grafik/ausgabe] [--kontakt ../docs/bilder]

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Befund as Stilbefund, Figur } from './bauen.ts';
import { figurPruefen } from './bauen.ts';
import type { Animation, Bild, GepacktesBlatt } from './blatt.ts';
import { blattBytes, blattPacken, blattSchreiben } from './blatt.ts';
import { farbAbstand, pixelZuHex, rgbZuPixel } from './farbe.ts';
import { kontaktSchreiben } from './kontakt.ts';
import { randFaerben, streupixel, streupixelEntfernen } from './kontur.ts';
import type { Pixel } from './leinwand.ts';
import { deckend, kanaele, Leinwand } from './leinwand.ts';
import type { TonIndex } from './palette.ts';
import { FARBBUDGET, KONTUR, MATERIALIEN, naechsteFarbe, TON_DUNKEL, TON_GLANZ } from './palette.ts';
import { md5, pngDateiLesen } from './png.ts';
import type { Umriss } from '../../src/darstellung/masse.ts';
import { UMRISS_FIGUR, UMRISS_GEGNER } from '../../src/darstellung/masse.ts';
import { EINS } from '../../src/kern/festkomma.ts';
import * as werte from '../../src/kern/werte.ts';

// ===========================================================================
// Grundlagen
// ===========================================================================

/** Deckkraft, unter der ein Pixel eines Quellblatts als durchsichtig gilt (Hälfte von 255). */
const HALB_DECKEND = 128;

/** Nachbarn in fester Reihenfolge: erst die vier Kanten (N, W, O, S), dann die Ecken. */
const NACHBARN: readonly (readonly [number, number])[] = [
  [0, -1], [-1, 0], [1, 0], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];
/** Anzahl der Kantennachbarn am Anfang von NACHBARN. */
const KANTEN = 4;

/** Ton der Kontur in der Stufenliste (gehört zu keiner Treppe). */
const KONTUR_TON = -1;

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
// Parameter (Auftrag 4, 9.3; Festlegungen G0b in docs/grafik.md, 5 und 7)
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
  /** Deckung (Anteil der Fläche), ab der ein verkleinerter Pixel deckend wird (9.3: keine Halbtransparenz). */
  readonly deckung: number;
  /** Höhe des Fußbands als Anteil der Figurhöhe; Mitte der Füße = Mitte der Pixel in diesem Band (9.3, Anker). */
  readonly fussband: number;
  /** Abstand (farbAbstand), ab dem eine Farbabbildung ein Befund ist (9.3: große Abstände sind ein Befund). */
  readonly befundAbstand: number;
  /** Zusammenhängende Inseln unter dieser Pixelzahl werden nach dem Verkleinern entfernt (Streupixel, 1.3). */
  readonly mindestInsel: number;
  /** Höchstzahl deckender Farben je Figur (palette.ts FARBBUDGET.figur ohne durchsichtig). */
  readonly hoechstFarben: number;
  /** Abweichung der Grundlinie in einer Blattzeile, ab der sie ein Befund ist, als Anteil der Zeilenhöhe (9.3, Anker). */
  readonly grundlinienToleranz: number;
  /** Höchstzahl der Durchgänge der Randentscheidung (größte Tiefe eines Randbereichs in Quellpixeln). */
  readonly durchgaenge: number;
  /** Höchstzahl der Runden beim Entfernen von Streupixeln (kontur.ts streupixelEntfernen). */
  readonly streuRunden: number;
}

/**
 * Standardwerte (Festlegungen G0b, begründet in docs/grafik.md 5). Abstände
 * in der Einheit von farbAbstand (farbe.ts): Grau um n Stufen je Kanal
 * verschoben ergibt etwa 3n. Hintergrund bis etwa 15 Stufen je Kanal
 * (Rauschen eines einfarbigen Grunds), Figur ab etwa 30.
 */
export const STANDARD: Parameter = {
  toleranzHintergrund: 45,
  toleranzFigur: 90,
  mindestAnteil: 1 / 50,
  vergleichsAnteil: 1 / 4,
  deckung: 1 / 2,
  fussband: 1 / 8,
  befundAbstand: 72,
  mindestInsel: 4,
  hoechstFarben: FARBBUDGET.figur - 1,
  grundlinienToleranz: 1 / 50,
  durchgaenge: 256,
  streuRunden: 8,
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

/** Hintergrundfarbe aus den vier Ecken: Median je Kanal über vier Eckfelder (9.3, Zellen finden). */
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
 * Freistellen (9.3): Hintergrund mit Toleranz durchsichtig, sichere Figur ab
 * `toleranzFigur`, dazwischen Randpixel. Randpixel nehmen in Durchgängen die
 * Klasse der Mehrheit ihrer entschiedenen Nachbarn an (außerhalb des Blatts
 * zählt als Hintergrund). Ein Randpixel, das Figur wird und am Hintergrund
 * liegt, bekommt die häufigste Farbe seiner Figurnachbarn (Kantenglättung
 * entfernt); eines im Inneren behält seine Farbe (Innenlinien). Gleichstand
 * nach allen Durchgängen: Abstand über der Mitte beider Toleranzen ist Figur.
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
  const maske = new Uint8Array(n);
  for (let j = 0; j < n; j++) maske[j] = klasse[j] === FIGUR ? 1 : 0;
  return { breite, hoehe, maske, farbe, hintergrund: hg, randFigur, randHintergrund };
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
 * Zellen finden (9.3): zusammenhängende Bereiche der Maske; Bereiche, deren
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

/** Grundlinie je Blattzeile prüfen (9.3, Anker: „Grundlinie je Blatt gleich, sonst Befund“). */
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
/** Suchbereich um den Rohfaktor in Zielzeilen (eine Zeile mehr oder weniger durch Deckung und Rundung). */
const SUCHZEILEN = 1.5;

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
 * Verkleinern mit Flächenmittel (9.3): Jeder Zielpixel deckt eine Fläche
 * von 1/faktor × 1/faktor Quellpixeln. Deckung = Anteil deckender
 * Quellfläche; ab `deckung` wird der Pixel deckend mit dem gewichteten
 * Mittel der deckenden Quellfarben, gerundet (keine Halbtransparenz).
 * Ausrichtung: Unterkante und linke Kante des Ausschnitts liegen auf dem
 * Raster, damit die Fußzeile ganz bleibt.
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

/** Verkleinert und entfernt Inseln (der Teil der Kette, der die Höhe bestimmt). */
function verkleinertBereinigt(bild: Leinwand, faktor: number, p: Parameter): Leinwand {
  const v = verkleinere(bild, faktor, p);
  entferneInseln(v, p);
  return v;
}

function deckendeHoehe(bild: Leinwand): number {
  return bild.begrenzung()?.h ?? 0;
}

/**
 * Maßstab (9.3): Faktor aus der Stand-Zelle auf die Zielhöhe. Rohfaktor =
 * Zielhöhe / Quellhöhe; weil Deckung und Rundung oben oder unten eine Zeile
 * kosten können, sucht eine Halbierung im Bereich ±1,5 Zeilen den kleinsten
 * Faktor, bei dem die verkleinerte Stand-Zelle genau die Zielhöhe hat
 * („Rundung auf das Raster“). Gelingt das nicht, gilt der Rohfaktor.
 */
export function bestimmeFaktor(stand: Leinwand, zielhoehe: number, p: Parameter = STANDARD): number {
  const roh = zielhoehe / stand.hoehe;
  if (deckendeHoehe(verkleinertBereinigt(stand, roh, p)) === zielhoehe) return roh;
  let lo = (roh * (zielhoehe - SUCHZEILEN)) / zielhoehe;
  let hi = (roh * (zielhoehe + SUCHZEILEN)) / zielhoehe;
  if (deckendeHoehe(verkleinertBereinigt(stand, lo, p)) >= zielhoehe) return roh;
  if (deckendeHoehe(verkleinertBereinigt(stand, hi, p)) < zielhoehe) return roh;
  for (let i = 0; i < SUCHSCHRITTE; i++) {
    const mitte = (lo + hi) / 2;
    if (deckendeHoehe(verkleinertBereinigt(stand, mitte, p)) >= zielhoehe) hi = mitte;
    else lo = mitte;
  }
  return deckendeHoehe(verkleinertBereinigt(stand, hi, p)) === zielhoehe ? hi : roh;
}

// ===========================================================================
// 4. Palette
// ===========================================================================

/** Eine Stufe der Figurenpalette: Ton einer Materialtreppe oder die Kontur. */
export interface Stufe {
  readonly farbe: Pixel;
  /** Material aus palette.ts oder 'KONTUR'. */
  readonly material: string;
  /** Ton 0 … 4 der Treppe; Kontur −1. */
  readonly ton: number;
}

/** Name einer Stufe für Protokolle: 'HAUT_MITTEL:2' oder 'KONTUR'. */
export function stufenName(s: Stufe): string {
  return s.ton === KONTUR_TON ? s.material : `${s.material}:${s.ton}`;
}

/**
 * Stufen der Figur (9.3, Palette): je Material die Töne 0 bis 3, bei
 * glänzendem Material auch 4 (docs/grafik.md 1.2), in der Reihenfolge der
 * Materialliste; zuletzt KONTUR. Gleiche Farben nur einmal.
 */
export function stufenFuer(materialien: readonly string[]): Stufe[] {
  const liste: Stufe[] = [];
  const gesehen = new Set<Pixel>();
  for (const name of materialien) {
    const m = MATERIALIEN[name];
    if (m === undefined) throw new Error(`Umsetzer: Material ${name} fehlt in palette.ts`);
    const hoechster: TonIndex = m.glanz ? TON_GLANZ : 3;
    for (let t = TON_DUNKEL as number; t <= hoechster; t++) {
      const f = m.treppe[t as TonIndex];
      if (gesehen.has(f)) continue;
      gesehen.add(f);
      liste.push({ farbe: f, material: name, ton: t });
    }
  }
  if (!gesehen.has(KONTUR)) liste.push({ farbe: KONTUR, material: 'KONTUR', ton: KONTUR_TON });
  return liste;
}

/** Abbildung einer Quellfarbe auf eine Stufe, mit Abstand und Pixelzahl (Protokoll). */
export interface FarbAbbildung {
  readonly quelle: Pixel;
  readonly stufe: Stufe;
  /** farbAbstand(quelle, stufe.farbe). */
  readonly abstand: number;
  readonly pixel: number;
}

export interface Palettenergebnis {
  /** Abgebildete Bilder (gleiche Reihenfolge wie die Eingabe). */
  readonly bilder: Leinwand[];
  /** Je Quellfarbe die Abbildung, nach Pixelzahl absteigend, dann nach Farbe. */
  readonly abbildungen: FarbAbbildung[];
  /** Verwendete Stufen (höchstens hoechstFarben, KONTUR immer dabei), in Stufenreihenfolge. */
  readonly stufen: Stufe[];
  /** Wegen des Farbbudgets gestrichene Stufen, in der Reihenfolge des Streichens. */
  readonly gestrichen: Stufe[];
  /** Pixelgewichteter mittlerer und größter Abstand. */
  readonly mittlererAbstand: number;
  readonly groessterAbstand: number;
  /** Anteil der Pixel mit Abstand über befundAbstand. */
  readonly befundAnteil: number;
}

/**
 * Palette (9.3): Jede Quellfarbe geht auf die nächste Stufe (naechsteFarbe,
 * palette.ts). Sind mehr als `hoechstFarben` Stufen belegt (KONTUR zählt
 * immer, weil die Außenkontur sie setzt), wird die am wenigsten belegte
 * gestrichen (Gleichstand: die spätere) und neu abgebildet, bis das Budget
 * passt. Eine Palette für alle Bilder der Figur.
 */
export function bildePalette(bilder: readonly Leinwand[], stufen: readonly Stufe[], p: Parameter = STANDARD): Palettenergebnis {
  const zahl = new Map<Pixel, number>();
  for (const b of bilder) {
    for (const px of b.daten) if (deckend(px as Pixel)) zahl.set(px as Pixel, (zahl.get(px as Pixel) ?? 0) + 1);
  }
  const farben = [...zahl.keys()].sort((a, b) => a - b);
  let erlaubt = stufen.slice();
  const gestrichen: Stufe[] = [];
  let ziel = new Map<Pixel, number>();
  let nutzung: number[] = [];
  for (;;) {
    const auswahl = erlaubt.map((s) => s.farbe);
    ziel = new Map();
    nutzung = erlaubt.map(() => 0);
    for (const f of farben) {
      const n = naechsteFarbe(f, auswahl);
      ziel.set(f, n.index);
      nutzung[n.index] = (nutzung[n.index] as number) + (zahl.get(f) as number);
    }
    const belegt = erlaubt.filter((s, i) => (nutzung[i] as number) > 0 || s.farbe === KONTUR).length;
    if (belegt <= p.hoechstFarben) break;
    let weg = -1;
    erlaubt.forEach((s, i) => {
      const u = nutzung[i] as number;
      if (s.farbe === KONTUR || u === 0) return;
      if (weg < 0 || u <= (nutzung[weg] as number)) weg = i;
    });
    gestrichen.push(erlaubt[weg] as Stufe);
    erlaubt = erlaubt.filter((_, i) => i !== weg);
  }
  const verwendet = erlaubt.filter((s, i) => (nutzung[i] as number) > 0 || s.farbe === KONTUR);
  const abbildungen: FarbAbbildung[] = farben.map((f) => {
    const s = erlaubt[ziel.get(f) as number] as Stufe;
    return { quelle: f, stufe: s, abstand: farbAbstand(f, s.farbe), pixel: zahl.get(f) as number };
  });
  abbildungen.sort((a, b) => b.pixel - a.pixel || a.quelle - b.quelle);
  let summe = 0;
  let pixel = 0;
  let groesster = 0;
  let befund = 0;
  for (const a of abbildungen) {
    summe += a.abstand * a.pixel;
    pixel += a.pixel;
    groesster = Math.max(groesster, a.abstand);
    if (a.abstand > p.befundAbstand) befund += a.pixel;
  }
  const aus = bilder.map((b) => {
    const neu = new Leinwand(b.breite, b.hoehe);
    for (let j = 0; j < b.daten.length; j++) {
      const px = b.daten[j] as Pixel;
      if (deckend(px)) neu.daten[j] = (erlaubt[ziel.get(px) as number] as Stufe).farbe;
    }
    return neu;
  });
  return {
    bilder: aus,
    abbildungen,
    stufen: verwendet,
    gestrichen,
    mittlererAbstand: pixel > 0 ? summe / pixel : 0,
    groessterAbstand: groesster,
    befundAnteil: pixel > 0 ? befund / pixel : 0,
  };
}

// ===========================================================================
// 5. Kontur
// ===========================================================================

/**
 * Innenkonturen (9.3; Stilhandbuch 1.2): Ein Pixel in KONTUR im Inneren (alle
 * vier Kantennachbarn deckend) bekommt den dunkelsten Ton (0) des Materials,
 * das unter seinen acht Nachbarn am häufigsten ist (Gleichstand: früheres
 * Material der Liste), sofern dieser Ton zur Palette gehört; sonst bleibt
 * KONTUR (Innenkontur sehr dunkler Materialien, Pupillen). Innenlinien in
 * Ton 0 eines Materials bleiben, wie sie sind. Gibt die Zahl der Änderungen zurück.
 */
export function innenkonturen(bild: Leinwand, stufen: readonly Stufe[]): number {
  const vonFarbe = new Map<Pixel, Stufe>();
  for (const s of stufen) vonFarbe.set(s.farbe, s);
  const dunkel = new Map<string, Pixel>();
  const rang = new Map<string, number>();
  for (const s of stufen) {
    if (s.ton === KONTUR_TON) continue;
    if (!rang.has(s.material)) rang.set(s.material, rang.size);
    if (s.ton === TON_DUNKEL) dunkel.set(s.material, s.farbe);
  }
  const aenderungen: [number, Pixel][] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      if (bild.hole(x, y) !== KONTUR) continue;
      let innen = true;
      for (let i = 0; i < KANTEN; i++) {
        const [dx, dy] = NACHBARN[i] as readonly [number, number];
        if (!deckend(bild.hole(x + dx, y + dy))) innen = false;
      }
      if (!innen) continue;
      const zahl = new Map<string, number>();
      for (const [dx, dy] of NACHBARN) {
        const s = vonFarbe.get(bild.hole(x + dx, y + dy));
        if (s === undefined || s.ton === KONTUR_TON) continue;
        zahl.set(s.material, (zahl.get(s.material) ?? 0) + 1);
      }
      let bestes: string | undefined;
      for (const [m, z] of zahl) {
        const b = bestes === undefined ? 0 : (zahl.get(bestes) as number);
        if (bestes === undefined || z > b || (z === b && (rang.get(m) as number) < (rang.get(bestes) as number))) bestes = m;
      }
      const ton0 = bestes === undefined ? undefined : dunkel.get(bestes);
      if (ton0 !== undefined) aenderungen.push([y * bild.breite + x, ton0]);
    }
  }
  for (const [j, f] of aenderungen) bild.daten[j] = f;
  return aenderungen.length;
}

/** Glanztöne der Palette: Ausnahmen der Streupixelregel (Glanzpunkte genau 1 px, Stilhandbuch 1.3). */
export function glanzToene(stufen: readonly Stufe[]): Set<Pixel> {
  return new Set(stufen.filter((s) => s.ton === TON_GLANZ).map((s) => s.farbe));
}

/**
 * Kontur und Streupixel (9.3): Innenkonturen, dann Außenkontur neu (Rand in
 * KONTUR umfärben, die Figur wird nicht größer; kontur.ts randFaerben), dann
 * Streupixel entfernen, ohne die Kontur anzutasten (kontur.ts
 * streupixelEntfernen mit KONTUR geschützt). Ändert das Bild.
 */
export function konturieren(bild: Leinwand, stufen: readonly Stufe[], p: Parameter = STANDARD): void {
  const glanz = glanzToene(stufen);
  innenkonturen(bild, stufen);
  randFaerben(bild, KONTUR);
  streupixelEntfernen(bild, glanz, new Set([KONTUR]), p.streuRunden);
  for (let runde = 0; runde < p.streuRunden && restStreupixel(bild, glanz) > 0; runde++);
}

/**
 * Reststreupixel, die streupixelEntfernen bei geschützter Kontur stehen
 * lässt: ein Farbpixel, dessen deckende Nachbarn alle KONTUR sind, wird
 * KONTUR; ein KONTUR-Pixel im Inneren (alle Kantennachbarn deckend) ohne
 * KONTUR-Nachbarn bekommt die häufigste Farbe seiner Nachbarn. Die
 * Außenkontur bleibt dabei geschlossen. Gibt die Zahl der Änderungen zurück.
 */
function restStreupixel(bild: Leinwand, glanz: ReadonlySet<Pixel>): number {
  const aenderungen: [number, number, Pixel][] = [];
  for (const q of streupixel(bild, glanz)) {
    const eigen = bild.hole(q.x, q.y);
    const zahl = new Map<Pixel, number>();
    let beste: Pixel | undefined;
    let innen = true;
    NACHBARN.forEach(([dx, dy], i) => {
      const n = bild.hole(q.x + dx, q.y + dy);
      if (!deckend(n)) {
        if (i < KANTEN) innen = false;
        return;
      }
      if (n === KONTUR) return;
      const z = (zahl.get(n) ?? 0) + 1;
      zahl.set(n, z);
      if (beste === undefined || z > (zahl.get(beste) as number)) beste = n;
    });
    if (eigen !== KONTUR && beste === undefined) aenderungen.push([q.x, q.y, KONTUR]);
    else if (eigen === KONTUR && innen && beste !== undefined) aenderungen.push([q.x, q.y, beste]);
  }
  for (const [x, y, f] of aenderungen) bild.setze(x, y, f);
  return aenderungen.length;
}

// ===========================================================================
// 6. Anker
// ===========================================================================

export interface Anker {
  readonly x: number;
  readonly y: number;
}

/**
 * Anker (9.3): y = unterste Zeile der Figur; x = Mitte der Füße, das heißt
 * Mitte zwischen dem linken und dem rechten deckenden Pixel im Fußband (die
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

// ===========================================================================
// 7. Zuordnung und Quelle (Textdateien in fremd/<figur>/)
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
  /** Name des Blatts und Atlas, z. B. rammbock_fremd. */
  readonly figur: string;
  /** Umriss aus masse.ts: Gegnertyp ('Rammbock') oder 'Figur' (Vela). */
  readonly typ: string;
  readonly zielhoehe: number;
  readonly materialien: readonly string[];
  readonly massstab: ZellBezug;
  readonly animationen: readonly ZuordnungAnimation[];
  readonly bilder: readonly ZuordnungBild[];
  readonly kopien: readonly ZuordnungKopie[];
  /** Fußkontakt: Animation → Name der Gehgeschwindigkeit in werte.ts (16.16, px/Frame). */
  readonly gehen: ReadonlyMap<string, string>;
  /** Überschriebene Parameter. */
  readonly parameter: Partial<Parameter>;
}

function ganz(text: string | undefined, zeile: number, was: string): number {
  if (text === undefined || !/^-?\d+$/.test(text)) throw new Error(`zuordnung.txt, Zeile ${zeile}: ${was} fehlt oder ist keine ganze Zahl`);
  return Number(text);
}

/**
 * Liest fremd/<figur>/zuordnung.txt (Format in docs/grafik.md 5.3). Zeilen:
 *   figur <name> | typ <Typ> | zielhoehe <px> | materialien <M> …
 *   massstab <blatt> <zelle>
 *   animation <name> schleife|einmal <dauer> … [aktiv <i> …]
 *   bild <blatt> <zelle> <animation> <index> [liegend] [spiegeln]
 *   gleich|ersatz <animation> <index> <von> <vonIndex> [spiegeln]
 *   gehen <animation> <WERTNAME>
 *   parameter <name> <zahl>
 * `#` beginnt einen Kommentar.
 */
export function leseZuordnung(text: string): Zuordnung {
  let figur = '';
  let typ = '';
  let zielhoehe = 0;
  let materialien: string[] = [];
  let massstab: ZellBezug | undefined;
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
      case 'typ':
        typ = rest[0] ?? '';
        break;
      case 'zielhoehe':
        zielhoehe = ganz(rest[0], nr, 'Zielhöhe');
        break;
      case 'materialien':
        materialien = rest;
        break;
      case 'massstab':
        massstab = { blatt: rest[0] ?? '', zelle: ganz(rest[1], nr, 'Zelle') };
        break;
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
  if (materialien.length === 0) throw new Error('zuordnung.txt: materialien fehlen');
  if (massstab === undefined) throw new Error('zuordnung.txt: massstab fehlt');
  const namen = new Set(animationen.map((a) => a.name));
  for (const b of bilder) {
    const a = animationen.find((x) => x.name === b.animation);
    if (a === undefined) throw new Error(`zuordnung.txt: bild für unbekannte Animation ${b.animation}`);
    if (b.index < 0 || b.index >= a.dauern.length) throw new Error(`zuordnung.txt: ${b.animation} hat kein Bild ${b.index}`);
  }
  for (const k of kopien) {
    if (!namen.has(k.animation) || !namen.has(k.von)) throw new Error(`zuordnung.txt: Kopie ${k.animation} ${k.index} ← ${k.von} ${k.vonIndex} nennt eine unbekannte Animation`);
  }
  return { figur, typ, zielhoehe, materialien, massstab, animationen, bilder, kopien, gehen, parameter: parameter as Partial<Parameter> };
}

/** Angaben aus quelle.txt, die der Umsetzer braucht: festes Raster je Blatt. */
export interface Quelle {
  readonly raster: ReadonlyMap<string, Raster>;
}

/**
 * Liest fremd/<figur>/quelle.txt. Freier Text (Datum, Werkzeug, Prompt)
 * bleibt unbeachtet; ausgewertet werden nur Zeilen der Form
 * `raster <blatt.png> <spalten> <zeilen>` (9.3: festes Raster, wenn das
 * Blatt eines hat).
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
// 8. Prüfungen (dieselben wie bei der Gliederpuppe, Auftrag 4, 9.3)
// ===========================================================================

/** Umriss der Figur aus masse.ts. */
export function umrissFuer(typ: string): Umriss {
  if (typ === 'Figur') return UMRISS_FIGUR;
  const u = (UMRISS_GEGNER as Readonly<Record<string, Umriss>>)[typ];
  if (u === undefined) throw new Error(`Umsetzer: Typ ${typ} hat keinen Umriss in masse.ts`);
  return u;
}

/** Gehgeschwindigkeit in px/Frame aus werte.ts (16.16). */
export function gehgeschwindigkeit(name: string): number {
  const w = (werte as Readonly<Record<string, unknown>>)[name];
  if (typeof w !== 'number') throw new Error(`Umsetzer: ${name} ist kein Zahlenwert in werte.ts`);
  return w / EINS;
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
}

/** Ein nachzubestellendes Bild (fehlt im Blatt, im Atlas durch Wiederholung ersetzt). */
export interface Nachbestellung {
  readonly animation: string;
  readonly index: number;
  /** Woraus das Ersatzbild stammt: 'gehen 2', 'gehen 2 gespiegelt' oder 'Stand' (ganze Animation fehlt). */
  readonly ersatz: string;
}

/** Ein Befund der Prüfungen. `hart` bricht den Bau ab (Kontur, Streupixel, Farbbudget, Anker). */
export interface Befund {
  readonly hart: boolean;
  readonly text: string;
}

export interface Ergebnis {
  readonly figur: string;
  readonly faktor: number;
  readonly blaetter: readonly Blattbericht[];
  readonly palette: Palettenergebnis;
  readonly animationen: readonly Animation[];
  readonly blatt: GepacktesBlatt;
  readonly nachbestellungen: readonly Nachbestellung[];
  readonly befunde: readonly Befund[];
}

/** Regeln aus figurPruefen (bauen.ts), die beim Umsetzer nur Befunde sind (Festlegung G0b-4). */
const REGEL_FUSSKONTAKT = 'Fußkontakt';
const WEICHE_REGELN: ReadonlySet<string> = new Set(['Umriss im Stand', REGEL_FUSSKONTAKT]);

/** Bild aus einer Zelle nach Palette und Kontur, mit Anker. */
interface Zellbild {
  readonly leinwand: Leinwand;
  readonly anker: Anker;
}

function spiegelBild(z: Zellbild): Zellbild {
  return { leinwand: z.leinwand.gespiegelt(), anker: { x: z.leinwand.breite - 1 - z.anker.x, y: z.anker.y } };
}

/**
 * Setzt die Blätter einer Figur um (9.3): Freistellen und Zellen je Blatt,
 * Maßstab aus der Stand-Zelle, Verkleinern, Palette über alle Bilder,
 * Kontur, Anker, Zuordnung mit Ersatzbildern, Prüfungen, Blatt mit Atlas.
 */
export function setzeUm(eingabe: Eingabe): Ergebnis {
  const zu = eingabe.zuordnung;
  const p: Parameter = { ...STANDARD, ...zu.parameter, ...(eingabe.parameter ?? {}) };
  const befunde: Befund[] = [];

  // 1 und 2: Freistellen und Zellen je benutztem Blatt (Reihenfolge nach Namen).
  const benutzt = new Set<string>([zu.massstab.blatt, ...zu.bilder.map((b) => b.blatt)]);
  const blaetter: Blattbericht[] = [];
  const zellbestand = new Map<string, { fs: Freistellung; zellen: Zellen }>();
  for (const name of [...benutzt].sort()) {
    const bild = eingabe.blaetter.get(name);
    if (bild === undefined) throw new Error(`Umsetzer: Blatt ${name} fehlt`);
    const fs = freistellen(bild, p);
    const raster = eingabe.quelle.raster.get(name);
    const zellen = findeZellen(fs, p, raster);
    const grundlinie = pruefeGrundlinie(zellen, p);
    zellbestand.set(name, { fs, zellen });
    blaetter.push({
      blatt: name, breite: bild.breite, hoehe: bild.hoehe, hintergrund: fs.hintergrund, raster,
      zellen: zellen.zellen, verworfen: zellen.verworfen, leer: zellen.leer, grundlinie,
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

  // 3: Maßstab aus der Stand-Zelle, ein Faktor für alle Blätter.
  const stand = zelleVon(zu.massstab);
  const faktor = bestimmeFaktor(schneideAus(stand.fs, stand.zellen, stand.zelle), zu.zielhoehe, p);

  // Verkleinerte Zellen in fester Reihenfolge (Stand zuerst, dann nach Zuordnung), jede nur einmal.
  const schluessel = (b: ZellBezug): string => `${b.blatt}#${b.zelle}`;
  const reihenfolge: ZellBezug[] = [zu.massstab];
  for (const b of zu.bilder) if (!reihenfolge.some((r) => schluessel(r) === schluessel(b))) reihenfolge.push(b);
  const verkleinert = reihenfolge.map((b) => {
    const z = zelleVon(b);
    return verkleinertBereinigt(schneideAus(z.fs, z.zellen, z.zelle), faktor, p);
  });

  // 4: Palette über alle Bilder der Figur.
  const palette = bildePalette(verkleinert, stufenFuer(zu.materialien), p);

  // 5 und 6: Kontur, Streupixel, Anker.
  const liegend = new Set(zu.bilder.filter((b) => b.liegend).map(schluessel));
  const zellbilder = new Map<string, Zellbild>();
  reihenfolge.forEach((b, i) => {
    const l = palette.bilder[i] as Leinwand;
    konturieren(l, palette.stufen, p);
    zellbilder.set(schluessel(b), { leinwand: l, anker: bestimmeAnker(l, liegend.has(schluessel(b)), p) });
  });
  const standBild = zellbilder.get(schluessel(zu.massstab)) as Zellbild;

  // 7: Zuordnung, Ersatzbilder. Ein Bild löst sich auf als eigenes Bild (`bild`), sonst als Kopie
  // (`gleich`, `ersatz`; die Quelle wird ihrerseits aufgelöst), sonst als Wiederholung des nächsten
  // vorherigen Bildes mit eigener Quelle, sonst des nächsten folgenden, sonst des Stands.
  const nachbestellungen: Nachbestellung[] = [];
  const eigen = new Map<string, Zellbild>();
  for (const b of zu.bilder) {
    const z = zellbilder.get(schluessel(b)) as Zellbild;
    eigen.set(`${b.animation}#${b.index}`, b.spiegeln ? spiegelBild(z) : z);
  }
  const kopie = new Map<string, ZuordnungKopie>();
  for (const k of zu.kopien) kopie.set(`${k.animation}#${k.index}`, k);
  const dauernVon = new Map(zu.animationen.map((a) => [a.name, a.dauern]));
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
  const animationen: Animation[] = zu.animationen.map((a) => {
    const bilder: Bild[] = a.dauern.map((dauer, i) => {
      const z = aufloesen(a.name, i, []);
      return { leinwand: z.leinwand, ankerX: z.anker.x, ankerY: z.anker.y, dauer };
    });
    return a.aktiv === undefined ? { name: a.name, schleife: a.schleife, bilder } : { name: a.name, schleife: a.schleife, bilder, aktiv: a.aktiv };
  });

  // 8: Prüfungen wie bei der Gliederpuppe (bauen.ts figurPruefen, docs/grafik.md 2.5). Hart sind
  // Kontur, Streupixel, Farbzählung, Anker und aktive Bilder; Umriss im Stand und Fußkontakt sind
  // bei fremden Blättern Befunde für den Nutzer (Festlegung G0b-4).
  const umriss = umrissFuer(zu.typ);
  const figur: Figur = { name: zu.figur, umriss, animationen, glanz: glanzToene(palette.stufen), budget: FARBBUDGET.figur };
  const stil: Stilbefund[] = figurPruefen(figur);
  for (const [name, wert] of zu.gehen) {
    const anim = animationen.find((a) => a.name === name);
    if (anim === undefined) throw new Error(`Umsetzer: gehen nennt unbekannte Animation ${name}`);
    const schritt = gehgeschwindigkeit(wert) * ((anim.bilder[0] as Bild).dauer);
    for (const b of figurPruefen({ ...figur, gehen: name, schritt })) if (b.regel === REGEL_FUSSKONTAKT) stil.push(b);
  }
  for (const b of stil) befunde.push({ hart: !WEICHE_REGELN.has(b.regel), text: `${b.animation} Bild ${b.bild}: ${b.regel}: ${b.text}` });
  // Zusätzlich je Zelle: Umriss überschritten (Angriffsposen dürfen das, 1.1), liegend gegen den gedrehten Umriss.
  for (const b of reihenfolge) {
    const g = (zellbilder.get(schluessel(b)) as Zellbild).leinwand.begrenzung();
    if (g === null) continue;
    const [ub, uh] = liegend.has(schluessel(b)) ? [umriss.hoehe, umriss.breite] : [umriss.breite, umriss.hoehe];
    if (g.b > ub) befunde.push({ hart: false, text: `${b.blatt} Zelle ${b.zelle}: ${g.b} px breit, Umriss ${ub}` });
    if (g.h > uh) befunde.push({ hart: false, text: `${b.blatt} Zelle ${b.zelle}: ${g.h} px hoch, Umriss ${uh}` });
  }
  const standHoehe = standBild.leinwand.begrenzung()?.h ?? 0;
  if (standHoehe !== zu.zielhoehe) befunde.push({ hart: false, text: `Stand ${standHoehe} px hoch, Ziel ${zu.zielhoehe}` });
  if (palette.befundAnteil > 0) {
    befunde.push({ hart: false, text: `${(palette.befundAnteil * 100).toFixed(1)} % der Pixel weiter als ${p.befundAbstand} von der nächsten Stufe (größter Abstand ${palette.groessterAbstand.toFixed(1)})` });
  }

  const blatt = blattPacken(zu.figur, animationen);
  return { figur: zu.figur, faktor, blaetter, palette, animationen, blatt, nachbestellungen, befunde };
}

// ===========================================================================
// 10. Protokoll und Aufruf
// ===========================================================================

/** Protokoll als Markdown (für docs/grafik.md 5): Blätter, Zellen, Palette mit Abständen, Nachbestellungen, Befunde. */
export function protokoll(e: Ergebnis, p: Parameter = STANDARD): string {
  const z: string[] = [];
  z.push(`### Protokoll ${e.figur}`, '', `Faktor ${e.faktor.toFixed(6)}; MD5 des Blatts ${md5(blattBytes(e.blatt).png)}`, '');
  z.push('| Blatt | Maß | Hintergrund | Zellen | verworfen | Raster |', '|---|---|---|---|---|---|');
  for (const b of e.blaetter) {
    z.push(`| ${b.blatt} | ${b.breite} × ${b.hoehe} | ${pixelZuHex(b.hintergrund.farbe)} | ${b.zellen.length} | ${b.verworfen.length} | ${b.raster === undefined ? '–' : `${b.raster.spalten} × ${b.raster.zeilen}`} |`);
  }
  z.push('', '| Stufe | Farbe | Pixel | mittlerer Abstand | größter Abstand |', '|---|---|---|---|---|');
  for (const s of e.palette.stufen) {
    const liste = e.palette.abbildungen.filter((a) => a.stufe.farbe === s.farbe);
    const pixel = liste.reduce((t, a) => t + a.pixel, 0);
    const mittel = pixel > 0 ? liste.reduce((t, a) => t + a.abstand * a.pixel, 0) / pixel : 0;
    const max = liste.reduce((t, a) => Math.max(t, a.abstand), 0);
    z.push(`| ${stufenName(s)} | ${pixelZuHex(s.farbe)} | ${pixel} | ${mittel.toFixed(1)} | ${max.toFixed(1)} |`);
  }
  z.push('', `Gestrichen (Farbbudget): ${e.palette.gestrichen.map(stufenName).join(', ') || 'keine'}.`);
  z.push(`Abstand pixelgewichtet ${e.palette.mittlererAbstand.toFixed(1)}, größter ${e.palette.groessterAbstand.toFixed(1)}, über ${p.befundAbstand}: ${(e.palette.befundAnteil * 100).toFixed(1)} % der Pixel.`);
  const weit = e.palette.abbildungen.filter((a) => a.abstand > p.befundAbstand);
  if (weit.length > 0) {
    z.push('', '| Quellfarbe | Stufe | Abstand | Pixel |', '|---|---|---|---|');
    for (const a of weit) z.push(`| ${pixelZuHex(a.quelle)} | ${stufenName(a.stufe)} | ${a.abstand.toFixed(1)} | ${a.pixel} |`);
  }
  z.push('', 'Nachbestellungen:');
  if (e.nachbestellungen.length === 0) z.push('- keine');
  for (const n of e.nachbestellungen) z.push(`- ${n.animation} Bild ${n.index} (ersetzt durch ${n.ersatz})`);
  z.push('', 'Befunde:');
  if (e.befunde.length === 0) z.push('- keine');
  for (const b of e.befunde) z.push(`- ${b.hart ? 'HART: ' : ''}${b.text}`);
  return z.join('\n') + '\n';
}

/** Liest einen Ordner fremd/<figur>/ (alle *.png, zuordnung.txt, quelle.txt) und setzt ihn um. */
export function umsetzenOrdner(ordner: string, parameter: Partial<Parameter> = {}): Ergebnis {
  const zuordnung = leseZuordnung(readFileSync(join(ordner, 'zuordnung.txt'), 'utf8'));
  const quellPfad = join(ordner, 'quelle.txt');
  const quelle = leseQuelle(existsSync(quellPfad) ? readFileSync(quellPfad, 'utf8') : '');
  const blaetter = new Map<string, Leinwand>();
  for (const datei of readdirSync(ordner).filter((d) => d.endsWith('.png')).sort()) blaetter.set(datei, pngDateiLesen(join(ordner, datei)));
  return setzeUm({ blaetter, zuordnung, quelle, parameter });
}

function hauptprogramm(argumente: readonly string[]): number {
  const ordner = argumente[0];
  if (ordner === undefined) {
    process.stderr.write('Aufruf: umsetzer.ts <fremd/figur> [--aus <ordner>] [--kontakt <ordner>]\n');
    return 2;
  }
  const wert = (schalter: string): string | undefined => {
    const i = argumente.indexOf(schalter);
    return i >= 0 ? argumente[i + 1] : undefined;
  };
  const e = umsetzenOrdner(ordner);
  const aus = wert('--aus') ?? resolve(ordner, '..', '..', '..', 'ausgabe');
  const geschrieben = blattSchreiben(aus, e.figur, e.blatt);
  process.stdout.write(protokoll(e));
  process.stdout.write(`\n${geschrieben.png}  MD5 ${geschrieben.md5}\n${geschrieben.json}\n`);
  const kontakt = wert('--kontakt');
  if (kontakt !== undefined) {
    for (const a of e.animationen) {
      const pfad = join(kontakt, `kontakt_${e.figur}_${a.name}.png`);
      process.stdout.write(`${pfad}  MD5 ${kontaktSchreiben(pfad, a)}\n`);
    }
  }
  return e.befunde.some((b) => b.hart) ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = hauptprogramm(process.argv.slice(2));
}
