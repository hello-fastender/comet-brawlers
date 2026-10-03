// Raster (Bayer 4 × 4) für große Flächen (Auftrag 4, 1.3): Hintergrund-
// verläufe, Himmel, Boden, Nebel, Explosionen. Auf Figuren höchstens eine
// Rasterzeile am Übergang von Licht zu Schatten, nie auf Gesicht und Händen.
// Matrix und Schwelle wie BAYER und bayer() in stilproben.html.

import type { Leinwand, Pixel } from './leinwand.ts';

/** Bayer-Matrix 4 × 4 (stilproben.html, BAYER). */
export const BAYER_4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Kantenlänge und Stufenzahl der Matrix (Mathematik). */
const SEITE = 4;
const STUFEN = SEITE * SEITE;

/** Schwelle am Pixel (x, y) in (0, 1): (Bayer + 0,5) / 16 wie bayer() in stilproben.html. */
export function bayerSchwelle(x: number, y: number): number {
  const zeile = BAYER_4[((y % SEITE) + SEITE) % SEITE] as readonly number[];
  return ((zeile[((x % SEITE) + SEITE) % SEITE] as number) + 0.5) / STUFEN;
}

/**
 * Index in einer Liste aus n + 1 Stufen für den Anteil t (0 … 1) am Pixel
 * (x, y): mit Raster der untere oder obere Nachbar je nach Schwelle, ohne
 * Raster gerundet (verlaufV in stilproben.html).
 */
export function rasterIndex(t: number, n: number, x: number, y: number, raster: boolean): number {
  const s = Math.max(0, Math.min(1, t)) * n;
  if (!raster) return Math.min(n, Math.round(s));
  const i = Math.floor(s);
  const f = s - i;
  return Math.min(n, i + (f > bayerSchwelle(x, y) ? 1 : 0));
}

/** Senkrechter Verlauf über die Farben (oben die erste), mit oder ohne Raster (verlaufV in stilproben.html). */
export function verlaufSenkrecht(bild: Leinwand, x: number, y: number, b: number, h: number, farben: readonly Pixel[], raster: boolean): void {
  const n = farben.length - 1;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < b; xx++) {
      const t = yy / Math.max(1, h - 1);
      bild.setze(x + xx, y + yy, farben[rasterIndex(t, n, x + xx, y + yy, raster)] as Pixel);
    }
  }
}

/** Waagrechter Verlauf über die Farben (links die erste), mit oder ohne Raster. */
export function verlaufWaagrecht(bild: Leinwand, x: number, y: number, b: number, h: number, farben: readonly Pixel[], raster: boolean): void {
  const n = farben.length - 1;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < b; xx++) {
      const t = xx / Math.max(1, b - 1);
      bild.setze(x + xx, y + yy, farben[rasterIndex(t, n, x + xx, y + yy, raster)] as Pixel);
    }
  }
}

/** Rasterfläche: setzt farbe an den Pixeln des Rechtecks, deren Schwelle unter deckung (0 … 1) liegt. */
export function rasterFlaeche(bild: Leinwand, x: number, y: number, b: number, h: number, farbe: Pixel, deckung: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + b; xx++) {
      if (bayerSchwelle(xx, yy) < deckung) bild.setze(xx, yy, farbe);
    }
  }
}
