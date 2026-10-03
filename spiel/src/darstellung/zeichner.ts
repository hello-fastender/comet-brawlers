// Zeichenklasse der Darstellung (E25; Auftrag 5, Phase 1, U1; docs/grafik.md
// 9.10). Die Logik und alle Lagen der Darstellung rechnen in Spielpixeln
// (384 × 224, bildX und bildY in zeichnen.ts); das Canvas hat DARSTELLUNG-mal
// so viele Bildpixel (768 × 448). Jedes Zeichnen der Darstellung geht durch
// diese Klasse und gibt Spielkoordinaten an.
//
// Der Faktor wirkt an genau einer Stelle: Die Methoden rechnen jede
// Spielkoordinate über bx, by und bl (Spielpixel → Bildpixel, mit der
// Verschiebung des Bildschüttelns) und zeichnen mit der Einheitsmatrix in
// Bildpixeln. Rechtecke, Linien der Debug-Anzeige (1 Spielpixel breit) und
// die Pixelschrift fallen so auf ganze Blöcke von DARSTELLUNG × DARSTELLUNG
// Bildpixeln; ein Bild aus einem Blatt mit Massstab 1 (Spielpixel) wird mit
// drawImage ganzzahlig hochskaliert (nächster Nachbar), eines mit Massstab 2
// (Bildpixel) 1:1 gezeichnet. Die Schattenellipse (pixelgenau in
// Spielpixeln, G7-12) legt die Klasse einmal je Größe in Bildpixeln an und
// zeichnet sie 1:1 mit ihrer Deckkraft; so mischt Chromium sie genau wie
// bisher bei 1× (skaliert gezeichnet runden halbdurchsichtige Flächen aus
// einem Canvas um eine Stufe anders, U1-1).
//
// Anker und Spiegeln (Auftrag 5, Schnittstelle zu U2): Der Ankerpixel
// (ankerX, ankerY, in Pixeln des Blatts) liegt mit seiner linken oberen Ecke
// auf der Spielposition (x, y), also auf der Bildposition DARSTELLUNG · x,
// DARSTELLUNG · y. Gespiegelt wird um die Mitte der Spielpixelspalte x
// (Bildposition DARSTELLUNG · x + DARSTELLUNG / 2), bei Massstab 1 wie
// bisher um die Mitte der Ankerspalte (U1-2). So ergibt ein Blatt, das auf
// das Doppelte vergrößert und mit Massstab 2 abgelegt wird, Pixel für Pixel
// dasselbe Bild wie das Blatt selbst (darstellung_2x.test.ts).

import type { Schrift } from './schrift.ts';
import { BILD_BREITE, BILD_HOEHE } from '../kern/werte.ts';
import { DARSTELLUNG } from './masse.ts';
import { glyphe, textBreite } from './schrift.ts';

/** Rechteck in einem Blatt (Pixel des Blatts). */
export interface Ausschnitt {
  x: number;
  y: number;
  b: number;
  h: number;
}

/** Mitte eines Spielpixels: 1-px-Linien auf halben Koordinaten bleiben scharf. */
const PIXELMITTE = 0.5;

/** Größe des Canvas in Bildpixeln (768 × 448). */
export const BILDPIXEL = { breite: BILD_BREITE * DARSTELLUNG, hoehe: BILD_HOEHE * DARSTELLUNG } as const;

/** Setzt die Größe des Canvas in Bildpixeln (index.html trägt dieselbe). */
export function canvasEinrichten(canvas: HTMLCanvasElement): void {
  if (canvas.width !== BILDPIXEL.breite) canvas.width = BILDPIXEL.breite;
  if (canvas.height !== BILDPIXEL.hoehe) canvas.height = BILDPIXEL.hoehe;
}

/** Zeichnet in Spielkoordinaten auf ein Canvas mit DARSTELLUNG Bildpixeln je Spielpixel. */
export class Zeichner {
  readonly ctx: CanvasRenderingContext2D;
  /** Verschiebung in Spielpixeln (Bildschütteln) */
  private vx = 0;
  private vy = 0;
  private readonly gesichert: [number, number][] = [];
  /** Pixelellipsen in Bildpixeln nach Breite, Höhe und Farbe (U1-1) */
  private readonly ellipsen = new Map<string, HTMLCanvasElement>();

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.beginne();
  }

  /** Bildpixel zu Spiel-x (mit Verschiebung). */
  private bx(x: number): number {
    return (x + this.vx) * DARSTELLUNG;
  }

  /** Bildpixel zu Spiel-y (mit Verschiebung). */
  private by(y: number): number {
    return (y + this.vy) * DARSTELLUNG;
  }

  /** Länge in Bildpixeln zu einer Länge in Spielpixeln. */
  private bl(l: number): number {
    return l * DARSTELLUNG;
  }

  /** Beginn eines Bildes: Einheitsmatrix, keine Verschiebung, volle Deckkraft, keine Glättung. */
  beginne(): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.imageSmoothingEnabled = false;
    c.setLineDash([]);
    this.vx = 0;
    this.vy = 0;
    this.gesichert.length = 0;
  }

  /** Verschiebung und Deckkraft sichern. */
  sichern(): void {
    this.ctx.save();
    this.gesichert.push([this.vx, this.vy]);
  }

  /** Gesicherte Verschiebung und Deckkraft wiederherstellen. */
  zurueck(): void {
    this.ctx.restore();
    const v = this.gesichert.pop();
    if (v !== undefined) [this.vx, this.vy] = v;
  }

  /** Verschiebt alles Folgende um (dx, dy) Spielpixel (Bildschütteln, KA10). */
  verschieben(dx: number, dy: number): void {
    this.vx += dx;
    this.vy += dy;
  }

  /** Deckkraft 0 bis 1 für das Folgende. */
  deckkraft(a: number): void {
    this.ctx.globalAlpha = a;
  }

  /** Gefülltes Rechteck b × h mit der linken oberen Ecke bei (x, y). */
  rechteck(x: number, y: number, b: number, h: number, farbe: string): void {
    this.ctx.fillStyle = farbe;
    this.ctx.fillRect(this.bx(x), this.by(y), this.bl(b), this.bl(h));
  }

  /** Strichmuster in Bildpixeln zu einem in Spielpixeln. */
  private strich(strich: readonly number[] | null): void {
    this.ctx.setLineDash(strich === null ? [] : strich.map((l) => this.bl(l)));
  }

  /** Umriss eines Rechtecks als Linie von 1 Spielpixel um die Pixel (x, y) bis (x + b, y + h); strich: Strichmuster in Spielpixeln. */
  umriss(x: number, y: number, b: number, h: number, farbe: string, strich: readonly number[] | null = null): void {
    const c = this.ctx;
    c.strokeStyle = farbe;
    c.lineWidth = this.bl(1);
    this.strich(strich);
    c.strokeRect(this.bx(x + PIXELMITTE), this.by(y + PIXELMITTE), this.bl(b), this.bl(h));
    if (strich !== null) c.setLineDash([]);
  }

  /** Linie von 1 Spielpixel durch die Pixel (x0, y0) und (x1, y1). */
  linie(x0: number, y0: number, x1: number, y1: number, farbe: string, strich: readonly number[] | null = null): void {
    const c = this.ctx;
    c.strokeStyle = farbe;
    c.lineWidth = this.bl(1);
    this.strich(strich);
    c.beginPath();
    c.moveTo(this.bx(x0 + PIXELMITTE), this.by(y0 + PIXELMITTE));
    c.lineTo(this.bx(x1 + PIXELMITTE), this.by(y1 + PIXELMITTE));
    c.stroke();
    if (strich !== null) c.setLineDash([]);
  }

  /** Gefülltes Vieleck (Platzhalter). */
  vieleck(punkte: readonly (readonly [number, number])[], farbe: string): void {
    const c = this.ctx;
    c.fillStyle = farbe;
    c.beginPath();
    punkte.forEach(([x, y], i) => (i === 0 ? c.moveTo(this.bx(x), this.by(y)) : c.lineTo(this.bx(x), this.by(y))));
    c.closePath();
    c.fill();
  }

  /** Gefüllte Ellipse um (x, y) mit den Halbachsen rx, ry (Platzhalter). */
  ellipse(x: number, y: number, rx: number, ry: number, farbe: string): void {
    const c = this.ctx;
    c.fillStyle = farbe;
    c.beginPath();
    c.ellipse(this.bx(x), this.by(y), this.bl(rx), this.bl(ry), 0, 0, Math.PI * 2);
    c.fill();
  }

  /**
   * Bild q aus einem Blatt mit Massstab m (1 = Spielpixel, 2 = Bildpixel):
   * Ankerpixel (ankerX, ankerY) des Blatts auf die Spielposition (x, y);
   * spiegeln um die Mitte der Spielpixelspalte x. zielB, zielH strecken auf
   * eine Größe in Spielpixeln (Balkenbausteine), sonst Blattmaß / m.
   */
  bild(
    quelle: CanvasImageSource,
    q: Ausschnitt,
    m: number,
    x: number,
    y: number,
    ankerX: number = 0,
    ankerY: number = 0,
    spiegeln: boolean = false,
    zielB: number = q.b / m,
    zielH: number = q.h / m,
  ): void {
    const c = this.ctx;
    const dx = this.bx(x - ankerX / m);
    const dy = this.by(y - ankerY / m);
    const db = this.bl(zielB);
    const dh = this.bl(zielH);
    if (!spiegeln) {
      c.drawImage(quelle, q.x, q.y, q.b, q.h, dx, dy, db, dh);
      return;
    }
    // Spiegelachse bei Bildpixel a = Mitte der Spielpixelspalte x: u → 2a − u
    const a = this.bx(x + PIXELMITTE);
    c.setTransform(-1, 0, 0, 1, 2 * a, 0);
    c.drawImage(quelle, q.x, q.y, q.b, q.h, dx, dy, db, dh);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Pixelgenaue Ellipse b × h in Spielpixeln (ein Spielpixel ist gesetzt,
   * wenn seine Mitte in der Ellipse liegt) mit der linken oberen Ecke bei
   * (x − ⌊b/2⌋, y − ⌊h/2⌋), Farbe und Deckkraft fest (Schatten der Sprites,
   * G7-12). Einmal je Größe und Farbe in Bildpixeln angelegt, 1:1 gezeichnet.
   */
  pixelEllipse(x: number, y: number, b: number, h: number, farbe: string, deckkraft: number): void {
    if (b <= 0 || h <= 0) return;
    const schluessel = `${b}x${h}${farbe}`;
    let flaeche = this.ellipsen.get(schluessel);
    if (flaeche === undefined) {
      flaeche = document.createElement('canvas');
      flaeche.width = this.bl(b);
      flaeche.height = this.bl(h);
      const ctx = flaeche.getContext('2d');
      if (ctx === null) throw new Error('Canvas 2D nicht verfügbar');
      ctx.fillStyle = farbe;
      const rx = b / 2;
      const ry = h / 2;
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < b; px++) {
          const dx = (px + PIXELMITTE - rx) / rx;
          const dy = (py + PIXELMITTE - ry) / ry;
          if (dx * dx + dy * dy <= 1) ctx.fillRect(this.bl(px), this.bl(py), this.bl(1), this.bl(1));
        }
      }
      this.ellipsen.set(schluessel, flaeche);
    }
    const c = this.ctx;
    const alt = c.globalAlpha;
    c.globalAlpha = deckkraft;
    c.drawImage(flaeche, this.bx(x - Math.floor(b / 2)), this.by(y - Math.floor(h / 2)));
    c.globalAlpha = alt;
  }

  /**
   * Text in einer Pixelschrift (schrift.ts) mit der linken oberen Ecke bei
   * (x, y); faktor vergrößert jedes Schriftpixel. Gibt die Breite in
   * Spielpixeln zurück.
   */
  text(s: Schrift, inhalt: string, x: number, y: number, farbe: string, faktor: number = 1): number {
    this.ctx.fillStyle = farbe;
    let px = Math.round(x);
    const py = Math.round(y);
    for (const zeichen of inhalt) {
      const g = glyphe(s, zeichen);
      for (let zeile = 0; zeile < g.length; zeile++) {
        const reihe = g[zeile] as string;
        let anfang = -1;
        for (let spalte = 0; spalte <= reihe.length; spalte++) {
          const gesetzt = spalte < reihe.length && reihe[spalte] === '#';
          if (gesetzt && anfang < 0) anfang = spalte;
          if (!gesetzt && anfang >= 0) {
            this.ctx.fillRect(this.bx(px + anfang * faktor), this.by(py + zeile * faktor), this.bl((spalte - anfang) * faktor), this.bl(faktor));
            anfang = -1;
          }
        }
      }
      px += s.vorschub * faktor;
    }
    return textBreite(s, inhalt, faktor);
  }
}
