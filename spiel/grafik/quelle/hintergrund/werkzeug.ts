// Gemeinsame Zeichenhilfen der Hintergründe (Auftrag 4, 1.3 und 1.6; G5): Töne aus den
// Treppen der Hintergrundmaterialien (palette.ts), Raster (Bayer 4 × 4 aus raster.ts),
// Wertrauschen über xorshift32 aus src/kern/zufall.ts mit festem Seed, schattierte
// Kästen und Rohre (Licht von links oben, docs/grafik.md 1.3), Aufhellen um eine Stufe
// in einem Lichtkegel und die Schilderschrift 5 × 7 als Bitmuster. Keine Farbwerte.

import type { Leinwand, Pixel } from '../leinwand.ts';
import { deckend } from '../leinwand.ts';
import type { Material, TonIndex } from '../palette.ts';
import { bayerSchwelle } from '../raster.ts';
import { xorshift32 } from '../../../src/kern/zufall.ts';

/** Ton t der Treppe eines Materials. */
export function ton(m: Material, t: TonIndex): Pixel {
  return m.treppe[t];
}

/** true, wenn das Raster am Pixel (x, y) die Deckung d (0 … 1) setzt (Bayer 4 × 4). */
export function raster(x: number, y: number, d: number): boolean {
  return bayerSchwelle(x, y) < d;
}

/** Ganzzahliger Hash zweier Koordinaten mit Seed (xorshift32 aus zufall.ts; nie 0 als Eingabe). */
export function hash(x: number, y: number, seed: number): number {
  // Primzahlen der räumlichen Streuung (Teschner u. a. 2003); | 1 hält die Eingabe ≠ 0.
  const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(seed, 83492791)) | 1;
  return xorshift32(xorshift32(h >>> 0));
}

/** Gleichverteilter Wert 0 … 1 (ohne 1) an (x, y) für den Seed. */
export function zufallsWert(x: number, y: number, seed: number): number {
  // 2^32 (Umfang des Zustandsraums von xorshift32).
  return hash(x, y, seed) / 4294967296;
}

/**
 * Wertrauschen: zufällige Werte auf einem Gitter der Zellgröße zx × zy, bilinear
 * dazwischen; Ergebnis 0 … 1. Deterministisch über den Seed.
 */
export function rauschen(x: number, y: number, zx: number, zy: number, seed: number): number {
  const gx = Math.floor(x / zx);
  const gy = Math.floor(y / zy);
  const fx = x / zx - gx;
  const fy = y / zy - gy;
  // weiche Gewichte (3f² − 2f³, Smoothstep)
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = zufallsWert(gx, gy, seed);
  const b = zufallsWert(gx + 1, gy, seed);
  const c = zufallsWert(gx, gy + 1, seed);
  const d = zufallsWert(gx + 1, gy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Zwei Oktaven Wertrauschen (grob und fein, Gewicht 2 : 1), 0 … 1. */
export function rauschen2(x: number, y: number, zx: number, zy: number, seed: number): number {
  return (2 * rauschen(x, y, zx, zy, seed) + rauschen(x, y, zx / 2, zy / 2, seed + 1)) / 3;
}

/**
 * Kasten mit Licht von links oben (docs/grafik.md 1.3): Fläche Ton 2, obere Zeile und linke
 * Spalte Ton 3, untere Zeile und rechte Spalte Ton 1; mit rand zusätzlich ein Ring in Ton 0.
 */
export function kasten(bild: Leinwand, x: number, y: number, b: number, h: number, m: Material, rand: boolean = false): void {
  if (b <= 0 || h <= 0) return;
  let x0 = x;
  let y0 = y;
  let bb = b;
  let hh = h;
  if (rand) {
    bild.rechteck(x, y, b, h, ton(m, 0));
    x0 += 1;
    y0 += 1;
    bb -= 2;
    hh -= 2;
    if (bb <= 0 || hh <= 0) return;
  }
  bild.rechteck(x0, y0, bb, hh, ton(m, 2));
  bild.rechteck(x0, y0 + hh - 1, bb, 1, ton(m, 1));
  bild.rechteck(x0 + bb - 1, y0, 1, hh, ton(m, 1));
  bild.rechteck(x0, y0, bb, 1, ton(m, 3));
  bild.rechteck(x0, y0, 1, hh, ton(m, 3));
}

/** Tonfolge quer über ein Rohr des Durchmessers d (Licht von oben bzw. links): Ton je Pixel. */
export function rohrToene(d: number, glanz: boolean = false): TonIndex[] {
  const aus: TonIndex[] = [];
  for (let i = 0; i < d; i++) {
    // Lage quer zur Achse −1 … 1; Licht kommt von der Seite mit kleinem i (oben bzw. links).
    const u = d === 1 ? 0 : (2 * i) / (d - 1) - 1;
    let t: TonIndex;
    if (i === d - 1 && d >= 4) t = 0;
    else if (u < -0.55) t = glanz && i === 1 ? 4 : 3;
    else if (u < 0.25) t = 2;
    else t = 1;
    aus.push(t);
  }
  return aus;
}

/** Waagrechtes Rohr von x0 bis x1 (ausschließlich), obere Zeile y, Durchmesser d. */
export function rohrWaagrecht(bild: Leinwand, x0: number, x1: number, y: number, d: number, m: Material, glanz: boolean = false): void {
  rohrToene(d, glanz).forEach((t, i) => bild.rechteck(x0, y + i, x1 - x0, 1, ton(m, t)));
}

/** Senkrechtes Rohr von y0 bis y1 (ausschließlich), linke Spalte x, Durchmesser d. */
export function rohrSenkrecht(bild: Leinwand, x: number, y0: number, y1: number, d: number, m: Material, glanz: boolean = false): void {
  rohrToene(d, glanz).forEach((t, i) => bild.rechteck(x + i, y0, 1, y1 - y0, ton(m, t)));
}

/** Niete 2 × 2: links oben Licht, rechts unten Ton 0, sonst Schatten (aufgesetzter Kopf). */
export function niete(bild: Leinwand, x: number, y: number, m: Material): void {
  bild.setze(x, y, ton(m, 3));
  bild.setze(x + 1, y, ton(m, 2));
  bild.setze(x, y + 1, ton(m, 1));
  bild.setze(x + 1, y + 1, ton(m, 0));
}

/**
 * Tonstufen der genannten Materialien als Tabelle Farbe → (Material, Ton), damit ein
 * Lichtkegel jeden Pixel um eine Stufe derselben Treppe aufhellen kann.
 */
export function tonTabelle(materialien: readonly Material[]): Map<Pixel, { m: Material; t: TonIndex }> {
  const tab = new Map<Pixel, { m: Material; t: TonIndex }>();
  for (const m of materialien) {
    for (let t = 0; t < 5; t++) if (!tab.has(m.treppe[t as TonIndex])) tab.set(m.treppe[t as TonIndex], { m, t: t as TonIndex });
  }
  return tab;
}

/**
 * Hellt Pixel um eine Stufe ihrer Treppe auf (höchstens bis Ton hoechst), wo
 * deckung(x, y) über der Bayer-Schwelle liegt; fremde Farben (Leuchttöne) bleiben.
 */
export function aufhellen(
  bild: Leinwand,
  tab: ReadonlyMap<Pixel, { m: Material; t: TonIndex }>,
  deckung: (x: number, y: number) => number,
  hoechst: TonIndex = 3,
  ox: number = 0,
  oy: number = 0,
): void {
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      const p = bild.hole(x, y);
      if (!deckend(p)) continue;
      const e = tab.get(p);
      if (e === undefined || e.t >= hoechst) continue;
      const d = deckung(x, y);
      if (d <= 0 || !raster(x + ox, y + oy, d)) continue;
      bild.setze(x, y, e.m.treppe[(e.t + 1) as TonIndex]);
    }
  }
}

// ===========================================================================
// Schilderschrift 5 × 7 (Bitmuster; G6 macht die Anzeigeschrift, doppelte Glyphen
// hier mit Absicht, docs/grafik.md 7, G5-6)
// ===========================================================================

/** Zeichenmaß der Schilderschrift. */
export const SCHILD_B = 5;
export const SCHILD_H = 7;

/** Bitmuster 5 × 7, je Zeichen sieben Zeilen aus fünf Bits ('1' gesetzt); nur die Zeichen der Schilder. */
const SCHILD: Readonly<Record<string, readonly string[]>> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
};

/** Zeichen, die die Schilderschrift kennt. */
export const SCHILD_ZEICHEN: readonly string[] = Object.keys(SCHILD);

/** Breite eines Schildtexts in px (fett: jede Glyphe 1 px breiter). */
export function schildBreite(text: string, fett: boolean = false, abstand: number = 1): number {
  if (text.length === 0) return 0;
  const b = SCHILD_B + (fett ? 1 : 0);
  return text.length * (b + abstand) - abstand;
}

/** Setzt die Pixel eines Schildtexts über setze(x, y); wirft bei unbekannten Zeichen. */
export function schildPixel(text: string, x: number, y: number, setze: (x: number, y: number) => void, fett: boolean = false, abstand: number = 1): void {
  let cx = x;
  const b = SCHILD_B + (fett ? 1 : 0);
  for (const zeichen of text) {
    const muster = SCHILD[zeichen];
    if (muster === undefined) throw new Error(`Schilderschrift: Zeichen '${zeichen}' fehlt`);
    for (let r = 0; r < SCHILD_H; r++) {
      const zeile = muster[r] as string;
      for (let s = 0; s < SCHILD_B; s++) {
        if (zeile[s] !== '1') continue;
        setze(cx + s, y + r);
        if (fett) setze(cx + s + 1, y + r);
      }
    }
    cx += b + abstand;
  }
}

/** Schreibt einen Schildtext in einer Farbe. */
export function schild(bild: Leinwand, text: string, x: number, y: number, p: Pixel, fett: boolean = false, abstand: number = 1): void {
  schildPixel(text, x, y, (px, py) => bild.setze(px, py, p), fett, abstand);
}
