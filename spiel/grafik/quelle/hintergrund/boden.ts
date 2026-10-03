// Boden der Tiefenbänder (Auftrag 4, 1.6; G5): Platten mit Fugen alle 16 px in der Tiefe
// (Zeilen zu z = n · 16, lage.ts fugenZeilen) und in Welt-x nach Plattenbreite, wahlweise
// je Plattenreihe versetzt. Licht von links oben (docs/grafik.md 1.3): die Oberkante und
// die linke Kante jeder Platte tragen Ton 3, die untere und rechte Ton 1, die Fuge Ton 0.
// Die Oberkante des Bandes ist eine dunkle Schattenzeile unter Wand, Geländer oder Kai,
// die Unterkante am Bildrand eine helle Kante mit dunkler Stirn darunter.

import type { Leinwand, Pixel } from '../leinwand.ts';
import type { Material, TonIndex } from '../palette.ts';
import type { Abschnitt } from './lage.ts';
import { FUGE_TIEFE, fugenZeilen } from './lage.ts';
import { ton } from './werkzeug.ts';

/** Lage eines Pixels in seiner Platte. */
export interface PlattenLage {
  /** Plattenreihe (0 = hinterste, an der Bandoberkante) */
  readonly reihe: number;
  /** Nummer der Platte in der Reihe (Welt-bezogen) */
  readonly nr: number;
  /** Spalte in der Platte (0 = linke Kante nach der Fuge) und Plattenbreite ohne Fuge */
  readonly dx: number;
  readonly pb: number;
  /** Zeile in der Platte (0 = Oberkante nach der Fuge) und Plattenhöhe ohne Fuge */
  readonly dy: number;
  readonly ph: number;
}

export interface PlattenArt {
  readonly m: Material;
  /** Plattenbreite einschließlich Fuge (Welt-x-Raster). */
  readonly breite: number;
  /** Versatz der Fugen je Plattenreihe in px (0 = Raster ohne Versatz). */
  readonly versatz: number;
  /** Fläche der Platte: Ton für eine Lage (Vorgabe 2); null = Ton 2. */
  readonly flaeche?: (x: number, y: number, l: PlattenLage) => TonIndex | null;
}

/** Lage jedes Bodenpixels: Fuge (null) oder Platte. Welt-x = a.x0 + Spalte. */
export function plattenLage(a: Abschnitt, art: PlattenArt, spalte: number, zeile: number, fugen: readonly number[] = fugenZeilen(a)): PlattenLage | 'fuge' {
  if (fugen.includes(zeile)) return 'fuge';
  // Reihe: Zahl der Fugen über der Zeile; Grenzen der Reihe aus den Nachbarfugen
  let reihe = 0;
  while (reihe < fugen.length && (fugen[reihe] as number) < zeile) reihe++;
  const oben = reihe > 0 ? (fugen[reihe - 1] as number) : (fugen[0] as number) - FUGE_TIEFE;
  const unten = reihe < fugen.length ? (fugen[reihe] as number) : (fugen[fugen.length - 1] as number) + FUGE_TIEFE;
  const wx = a.x0 + spalte - reihe * art.versatz;
  const nr = Math.floor(wx / art.breite);
  const dxRoh = wx - nr * art.breite;
  if (dxRoh === 0) return 'fuge';
  return { reihe, nr, dx: dxRoh - 1, pb: art.breite - 1, dy: zeile - oben - 1, ph: unten - oben - 1 };
}

/**
 * Zeichnet den Plattenboden zwischen Bandober- und -unterkante (je Spalte aus a.kante und
 * a.unten); die Zeile der Oberkante wird Schattenzeile (Ton 0), die beiden untersten Zeilen
 * Kante (Ton 3) und Stirn (Ton 0).
 */
export function plattenBoden(bild: Leinwand, a: Abschnitt, art: PlattenArt): void {
  const m = art.m;
  const fugen = fugenZeilen(a);
  for (let c = 0; c < a.breite; c++) {
    const y0 = a.kante[c] as number;
    const y1 = Math.min(bild.hoehe, a.unten[c] as number);
    for (let y = y0; y < y1; y++) {
      const l = plattenLage(a, art, c, y, fugen);
      let t: TonIndex;
      if (l === 'fuge') t = 0;
      else if (l.dy === 0 || l.dx === 0) t = 3;
      else if (l.dy === l.ph - 1 || l.dx === l.pb - 1) t = 1;
      else t = art.flaeche?.(c, y, l) ?? 2;
      bild.setze(c, y, ton(m, t));
    }
    // Oberkante: Schatten unter der Kante; Unterkante: helle Kante, dunkle Stirn am Bildrand
    bild.setze(c, y0, ton(m, 0));
    if (y1 - 2 > y0) bild.setze(c, y1 - 2, ton(m, 3));
    bild.setze(c, y1 - 1, ton(m, 0));
  }
}

/** Farbe eines Pixels als Ton von m, oder null, wenn er nicht aus dieser Treppe stammt. */
export function tonVon(m: Material, p: Pixel): TonIndex | null {
  const i = m.treppe.indexOf(p);
  return i < 0 ? null : (i as TonIndex);
}
