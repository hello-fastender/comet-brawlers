// Pixelpuffer der Erzeugung (Auftrag 4, 2.2): RGBA, ein Bildpixel ist ein
// Spielpixel. Formen werden nach dem Mittelpunkt der Pixel gerastert
// (geometrie.ts), ohne Kantenglättung. Pixel sind voll deckend oder
// durchsichtig; einsetzen() kopiert nur deckende Pixel, ohne Mischen.
// Keine Farbwerte in dieser Datei (Farben nur aus palette.ts).

import type { Kapsel, Punkt } from './geometrie.ts';
import { HALB, imKapsel, imPolygon } from './geometrie.ts';

/** Farbe eines Pixels als vorzeichenlose 32-Bit-Zahl 0xRRGGBBAA. */
export type Pixel = number;

/** Durchsichtig (alle Kanäle 0). Kein Farbwert, sondern das Fehlen einer Farbe. */
export const DURCHSICHTIG: Pixel = 0;

/** Größter Kanalwert (8 Bit, Mathematik). */
export const KANAL_MAX = 255;

/** Rechteck in ganzen Pixeln. */
export interface Rechteck {
  readonly x: number;
  readonly y: number;
  readonly b: number;
  readonly h: number;
}

/** Pixel aus Kanälen 0 … 255 (a ohne Angabe: voll deckend). */
export function rgba(r: number, g: number, b: number, a: number = KANAL_MAX): Pixel {
  return (((r & KANAL_MAX) << 24) | ((g & KANAL_MAX) << 16) | ((b & KANAL_MAX) << 8) | (a & KANAL_MAX)) >>> 0;
}

/** Kanäle eines Pixels [r, g, b, a]. */
export function kanaele(p: Pixel): [number, number, number, number] {
  return [(p >>> 24) & KANAL_MAX, (p >>> 16) & KANAL_MAX, (p >>> 8) & KANAL_MAX, p & KANAL_MAX];
}

/** Deckkraft eines Pixels (0 … 255). */
export function alpha(p: Pixel): number {
  return p & KANAL_MAX;
}

/** true, wenn der Pixel sichtbar ist (Deckkraft über 0). */
export function deckend(p: Pixel): boolean {
  return (p & KANAL_MAX) !== 0;
}

export class Leinwand {
  readonly breite: number;
  readonly hoehe: number;
  /** Pixel zeilenweise, Index y · breite + x. */
  readonly daten: Uint32Array;

  constructor(breite: number, hoehe: number, daten?: Uint32Array) {
    if (!Number.isInteger(breite) || !Number.isInteger(hoehe) || breite < 1 || hoehe < 1) {
      throw new RangeError(`Leinwand: ungültige Größe ${breite} × ${hoehe}`);
    }
    if (daten !== undefined && daten.length !== breite * hoehe) {
      throw new RangeError(`Leinwand: ${daten.length} Pixel passen nicht zu ${breite} × ${hoehe}`);
    }
    this.breite = breite;
    this.hoehe = hoehe;
    this.daten = daten ?? new Uint32Array(breite * hoehe);
  }

  /** true, wenn (x, y) im Bild liegt (ganze Pixel). */
  drin(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.breite && y < this.hoehe;
  }

  /** Pixel an (x, y); außerhalb DURCHSICHTIG. Koordinaten werden abgerundet. */
  hole(x: number, y: number): Pixel {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (!this.drin(px, py)) return DURCHSICHTIG;
    return this.daten[py * this.breite + px] as Pixel;
  }

  /** Setzt den Pixel an (x, y); außerhalb ohne Wirkung. Koordinaten werden abgerundet. */
  setze(x: number, y: number, p: Pixel): void {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (!this.drin(px, py)) return;
    this.daten[py * this.breite + px] = p;
  }

  /** Füllt das ganze Bild. */
  fuelle(p: Pixel): void {
    this.daten.fill(p);
  }

  /** Rechteck ab (x, y) mit Breite b und Höhe h. */
  rechteck(x: number, y: number, b: number, h: number, p: Pixel): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + b; xx++) this.setze(xx, yy, p);
  }

  /** Linie von (x0, y0) bis (x1, y1) nach Bresenham, ganze Pixel, beide Enden eingeschlossen. */
  linie(x0: number, y0: number, x1: number, y1: number, p: Pixel): void {
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const xe = Math.floor(x1);
    const ye = Math.floor(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let fehler = dx + dy;
    for (;;) {
      this.setze(x, y, p);
      if (x === xe && y === ye) return;
      const f2 = 2 * fehler;
      if (f2 >= dy) {
        fehler += dy;
        x += sx;
      }
      if (f2 <= dx) {
        fehler += dx;
        y += sy;
      }
    }
  }

  /** Gefülltes Polygon (Pixelmittelpunkt innen). */
  polygon(punkte: readonly Punkt[], p: Pixel): void {
    if (punkte.length < 3) return;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const q of punkte) {
      x0 = Math.min(x0, q.x);
      y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x);
      y1 = Math.max(y1, q.y);
    }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (imPolygon(punkte, x + HALB, y + HALB)) this.setze(x, y, p);
      }
    }
  }

  /** Gefüllte Ellipse um (cx, cy) mit Halbachsen rx, ry (Pixelmittelpunkt innen). */
  ellipse(cx: number, cy: number, rx: number, ry: number, p: Pixel): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const ex = (x + HALB - cx) / rx;
        const ey = (y + HALB - cy) / ry;
        if (ex * ex + ey * ey <= 1) this.setze(x, y, p);
      }
    }
  }

  /** Gefüllte Kapsel von (ax, ay) nach (bx, by) mit Radius r (Pixelmittelpunkt innen). */
  kapsel(ax: number, ay: number, bx: number, by: number, r: number, p: Pixel): void {
    const k: Kapsel = { art: 'kapsel', a: { x: ax, y: ay }, b: { x: bx, y: by }, ra: r, rb: r };
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        if (imKapsel(k, x + HALB, y + HALB)) this.setze(x, y, p);
      }
    }
  }

  /** Kopiert die deckenden Pixel von quelle mit ihrer linken oberen Ecke nach (x, y). */
  einsetzen(quelle: Leinwand, x: number, y: number): void {
    for (let qy = 0; qy < quelle.hoehe; qy++) {
      for (let qx = 0; qx < quelle.breite; qx++) {
        const p = quelle.daten[qy * quelle.breite + qx] as Pixel;
        if (deckend(p)) this.setze(x + qx, y + qy, p);
      }
    }
  }

  /** Neuer Ausschnitt ab (x, y) mit Breite b und Höhe h; Teile außerhalb bleiben durchsichtig. */
  ausschnitt(x: number, y: number, b: number, h: number): Leinwand {
    const neu = new Leinwand(b, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < b; xx++) neu.daten[yy * b + xx] = this.hole(x + xx, y + yy);
    return neu;
  }

  /** Waagrecht gespiegelte Kopie (Blick links). */
  gespiegelt(): Leinwand {
    const neu = new Leinwand(this.breite, this.hoehe);
    for (let y = 0; y < this.hoehe; y++) {
      for (let x = 0; x < this.breite; x++) {
        neu.daten[y * this.breite + (this.breite - 1 - x)] = this.daten[y * this.breite + x] as Pixel;
      }
    }
    return neu;
  }

  /** Um einen ganzzahligen Faktor vergrößerte Kopie (nächster Nachbar). */
  vergroessert(faktor: number): Leinwand {
    if (!Number.isInteger(faktor) || faktor < 1) throw new RangeError(`vergroessert: Faktor ${faktor}`);
    const neu = new Leinwand(this.breite * faktor, this.hoehe * faktor);
    for (let y = 0; y < neu.hoehe; y++) {
      for (let x = 0; x < neu.breite; x++) {
        neu.daten[y * neu.breite + x] = this.daten[Math.floor(y / faktor) * this.breite + Math.floor(x / faktor)] as Pixel;
      }
    }
    return neu;
  }

  /** Kopie. */
  klon(): Leinwand {
    return new Leinwand(this.breite, this.hoehe, new Uint32Array(this.daten));
  }

  /** true, wenn Größe und alle Pixel gleich sind. */
  gleich(andere: Leinwand): boolean {
    if (andere.breite !== this.breite || andere.hoehe !== this.hoehe) return false;
    for (let i = 0; i < this.daten.length; i++) if (this.daten[i] !== andere.daten[i]) return false;
    return true;
  }

  /** Kleinstes Rechteck um alle deckenden Pixel; null, wenn das Bild leer ist. */
  begrenzung(): Rechteck | null {
    let x0 = this.breite;
    let y0 = this.hoehe;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < this.hoehe; y++) {
      for (let x = 0; x < this.breite; x++) {
        if (!deckend(this.daten[y * this.breite + x] as Pixel)) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return null;
    return { x: x0, y: y0, b: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
}
