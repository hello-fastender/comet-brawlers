// Farbrechnung der Erzeugung (Auftrag 4, 1.2; docs/grafik.md 1.2): RGB und
// HSL, die Farbtreppe aus fünf Tönen nach E23 genau wie treppe() in
// spiel/werkzeuge/stilproben.html, die gedämpfte Hintergrundtreppe, Mischen
// und Abstand. Diese Datei enthält keine Farbwerte: Basisfarben stehen nur
// in palette.ts.

import type { Pixel } from './leinwand.ts';
import { KANAL_MAX, kanaele, rgba } from './leinwand.ts';

/** RGB, Kanäle 0 … 255. */
export type Rgb = readonly [number, number, number];
/** HSL: Farbton in Grad, Sättigung und Helligkeit 0 … 1. */
export type Hsl = readonly [number, number, number];

/** Fünf Töne eines Materials: 0 dunkel, 1 Schatten, 2 Grund, 3 Licht, 4 Glanz (docs/grafik.md 1.2). */
export type Treppe = readonly [Pixel, Pixel, Pixel, Pixel, Pixel];

/** Vollkreis in Grad und Sechstel des Farbkreises (Mathematik der HSL-Umrechnung). */
const VOLLKREIS = 360;
const SEKTOR = 60;
const HALBKREIS = 180;

/**
 * Stufen der Treppe nach stilproben.html, treppe(): je Ton Zielfarbton,
 * höchste Drehung in Grad, Änderung der Sättigung und der Helligkeit.
 * Zielfarbtöne: Blau 235°, Gelb 50° (docs/grafik.md 1.2, Tabelle).
 */
const FARBTON_BLAU = 235;
const FARBTON_GELB = 50;
const STUFEN: readonly { ziel: number; um: number; ds: number; dl: number }[] = [
  { ziel: FARBTON_BLAU, um: 18, ds: 0.06, dl: -0.27 },
  { ziel: FARBTON_BLAU, um: 9, ds: 0.03, dl: -0.14 },
  { ziel: FARBTON_BLAU, um: 0, ds: 0, dl: 0 },
  { ziel: FARBTON_GELB, um: 6, ds: -0.02, dl: 0.11 },
  { ziel: FARBTON_GELB, um: 12, ds: -0.08, dl: 0.22 },
];
/** Index des Grundtons in der Treppe. */
const GRUND = 2;

/** Hintergrundtreppe: Sättigung × 2/3, Helligkeit um 1/3 zum Grundton hin (docs/grafik.md 1.2). */
const HINTERGRUND_SAETTIGUNG = 2 / 3;
const HINTERGRUND_KONTRAST = 1 / 3;

/** '#RRGGBB' → [r, g, b]. */
export function hexZuRgb(hex: string): Rgb {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new RangeError(`Farbe: '${hex}' ist kein #RRGGBB`);
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** [r, g, b] → deckender Pixel. */
export function rgbZuPixel(c: Rgb): Pixel {
  return rgba(c[0], c[1], c[2]);
}

/** Pixel → [r, g, b] (Deckkraft fällt weg). */
export function pixelZuRgb(p: Pixel): Rgb {
  const k = kanaele(p);
  return [k[0], k[1], k[2]];
}

/** '#RRGGBB' → deckender Pixel. */
export function hexZuPixel(hex: string): Pixel {
  return rgbZuPixel(hexZuRgb(hex));
}

/** Pixel → '#RRGGBB' (für Berichte). */
export function pixelZuHex(p: Pixel): string {
  const k = kanaele(p);
  return '#' + [k[0], k[1], k[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** RGB → HSL wie rgbZuHsl in stilproben.html. */
export function rgbZuHsl(r0: number, g0: number, b0: number): Hsl {
  const r = r0 / KANAL_MAX;
  const g = g0 / KANAL_MAX;
  const b = b0 / KANAL_MAX;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= SEKTOR;
  }
  return [h, s, l];
}

/** HSL → RGB wie hslZuRgb in stilproben.html (Sättigung und Helligkeit auf 0 … 1 begrenzt, Kanäle gerundet). */
export function hslZuRgb(h0: number, s0: number, l0: number): Rgb {
  const h = ((h0 % VOLLKREIS) + VOLLKREIS) % VOLLKREIS;
  const s = Math.max(0, Math.min(1, s0));
  const l = Math.max(0, Math.min(1, l0));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / SEKTOR) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < SEKTOR) {
    r = c;
    g = x;
  } else if (h < 2 * SEKTOR) {
    r = x;
    g = c;
  } else if (h < 3 * SEKTOR) {
    g = c;
    b = x;
  } else if (h < 4 * SEKTOR) {
    g = x;
    b = c;
  } else if (h < 5 * SEKTOR) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [Math.round((r + m) * KANAL_MAX), Math.round((g + m) * KANAL_MAX), Math.round((b + m) * KANAL_MAX)];
}

/** Dreht den Farbton h um höchstens um Grad zum Zielfarbton hin (zuHue in stilproben.html). */
export function zuFarbton(h: number, ziel: number, um: number): number {
  const d = ((ziel - h + VOLLKREIS + HALBKREIS) % VOLLKREIS) - HALBKREIS;
  return h + Math.sign(d) * Math.min(Math.abs(d), um);
}

/** HSL-Werte der fünf Töne ohne Rundung (Sättigung und Helligkeit noch nicht begrenzt). */
function stufenHsl(basis: string): Hsl[] {
  const c = hexZuRgb(basis);
  const [h, s, l] = rgbZuHsl(c[0], c[1], c[2]);
  return STUFEN.map((st) => [zuFarbton(h, st.ziel, st.um), s + st.ds, l + st.dl] as Hsl);
}

/**
 * Farbtreppe aus fünf Tönen nach E23, genau wie treppe(basis) in
 * stilproben.html: Schatten zum Blau, Lichter zum Gelb; der Grundton ist die
 * Basisfarbe selbst.
 */
export function treppe(basis: string): Treppe {
  const t = stufenHsl(basis).map((hsl, i) => (i === GRUND ? hexZuPixel(basis) : rgbZuPixel(hslZuRgb(hsl[0], hsl[1], hsl[2]))));
  return [t[0] as Pixel, t[1] as Pixel, t[2] as Pixel, t[3] as Pixel, t[4] as Pixel];
}

/**
 * Hintergrundtreppe (docs/grafik.md 1.2): dieselbe Rechnung wie treppe(),
 * dann je Ton Sättigung (auf 0 … 1 begrenzt) × 2/3 und Helligkeit (auf
 * 0 … 1 begrenzt) um 1/3 zur Helligkeit des Grundtons hin; gerechnet auf
 * den ungerundeten HSL-Werten, gerundet erst am Ende.
 */
export function hintergrundTreppe(basis: string): Treppe {
  const stufen = stufenHsl(basis);
  const lGrund = Math.max(0, Math.min(1, (stufen[GRUND] as Hsl)[2]));
  const t = stufen.map((hsl) => {
    const s = Math.max(0, Math.min(1, hsl[1])) * HINTERGRUND_SAETTIGUNG;
    const l0 = Math.max(0, Math.min(1, hsl[2]));
    const l = l0 + (lGrund - l0) * HINTERGRUND_KONTRAST;
    return rgbZuPixel(hslZuRgb(hsl[0], s, l));
  });
  return [t[0] as Pixel, t[1] as Pixel, t[2] as Pixel, t[3] as Pixel, t[4] as Pixel];
}

/** Mischt zwei Pixel (t = 0: a, t = 1: b), Kanäle gerundet, deckend. */
export function mischen(a: Pixel, b: Pixel, t: number): Pixel {
  const ka = kanaele(a);
  const kb = kanaele(b);
  const m = (i: number): number => Math.round((ka[i] as number) + ((kb[i] as number) - (ka[i] as number)) * t);
  return rgba(m(0), m(1), m(2));
}

/**
 * Abstand zweier Farben (gewichtetes RGB nach „redmean“, etwa
 * wahrnehmungsgleich; 0 = gleich, etwa 765 = Schwarz zu Weiß).
 */
export function farbAbstand(a: Pixel, b: Pixel): number {
  const ka = kanaele(a);
  const kb = kanaele(b);
  const rm = (ka[0] + kb[0]) / 2;
  const dr = ka[0] - kb[0];
  const dg = ka[1] - kb[1];
  const db = ka[2] - kb[2];
  // Gewichte der redmean-Näherung (Mathematik: 2 + r/256, 4, 2 + (255 − r)/256).
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (KANAL_MAX - rm) / 256) * db * db);
}
