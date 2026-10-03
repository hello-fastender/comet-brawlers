// Himmel über dem Landedeck (Auftrag 4, 1.6 und 4, Abschnitt A): Nachthimmel als
// Rasterverlauf (Bayer 4 × 4), Sterne, Kometenschweif als breites, leuchtendes Band mit
// Schlieren, ferne Eisgrate am Horizont mit dem Kontrollturm des Hafens. Ebene `himmel`,
// läuft in der Darstellung mit halber Kamerageschwindigkeit (PARALLAX_HIMMEL).
//
// Koordinaten: Spalte c = Himmels-x − x0 des Abschnitts, Zeile = Abschnittszeile.
// Farben nur aus den Hintergrundtreppen (NACHTHIMMEL, EISWAND, KOMETENSCHWEIF) und
// NEON_CYAN für die Lichter des Turms.

import { Leinwand } from '../leinwand.ts';
import type { Pixel } from '../leinwand.ts';
import { EISWAND, KOMETENSCHWEIF, NACHTHIMMEL, NEON_CYAN } from '../palette.ts';
import { rasterIndex } from '../raster.ts';
import type { Abschnitt } from './lage.ts';
import { ANZEIGE_ZEILEN, BILD_BREITE, KACHEL, PARALLAX_HIMMEL, kameraBereiche } from './lage.ts';
import { rauschen, ton, zufallsWert } from './werkzeug.ts';

/** Höhe des Himmels in Zeilen: 9 Kacheln, bis unter die hintere Plattformkante (Zeile 133) des Landedecks. */
export const HIMMEL_ZEILEN = 9 * KACHEL;

/** Seeds des Rauschens (fest; Gestaltung G5). */
const SEED_STERNE = 4101;
const SEED_GRAT = 4102;
const SEED_SCHWEIF = 4103;

/**
 * Breite des Himmels in px (auf Kacheln aufgerundet): größte Spalte, die bei einer Kamera-x des
 * Abschnitts sichtbar ist. Spalte = Welt-x − K + ⌊K · ½⌋ − x0 (Bildschirm-x = x0 + Spalte − ⌊K/2⌋).
 */
export function himmelBreite(a: Abschnitt): number {
  let max = 0;
  for (const [k0, k1] of kameraBereiche()) {
    for (let k = Math.max(k0, a.kamera[0]); k <= Math.min(k1, a.kamera[1]); k++) {
      const rechts = Math.min(a.x1, k + BILD_BREITE) - 1;
      max = Math.max(max, rechts - k + Math.floor(k * PARALLAX_HIMMEL) - a.x0 + 1);
    }
  }
  return Math.ceil(max / KACHEL) * KACHEL;
}

/** Stufen des Himmelsverlaufs von oben nach unten (NACHTHIMMEL 1 bis 4, dann EISWAND 2 am Horizont). */
function verlaufFarben(): Pixel[] {
  return [ton(NACHTHIMMEL, 1), ton(NACHTHIMMEL, 2), ton(NACHTHIMMEL, 3), ton(NACHTHIMMEL, 4), ton(EISWAND, 2)];
}

/**
 * Achse des Kometenschweifs als quadratische Bézierkurve in Himmelskoordinaten: vom Horizont
 * rechts (Kopf des Schweifs, hell) nach links oben (fächert auf, wird schwächer). Gestaltung G5
 * nach der Stilprobe (Schweif als Rasterwolke schräg über dem Himmel).
 */
const SCHWEIF = {
  p0: { x: 352, y: 150 },
  p1: { x: 250, y: 40 },
  p2: { x: 24, y: -12 },
  /** halbe Breite am Kopf und am Ende */
  breite0: 9,
  breite1: 46,
  /** Breite der Strähnen quer zur Achse in px, Länge der Achse in px (für das Rauschen längs) */
  schliere: 3.4,
  laenge: 420,
} as const;

/** Punkte der Schweifachse (Bézier) zum Abstandsvergleich. */
function schweifPunkte(): { x: number; y: number; s: number }[] {
  const aus: { x: number; y: number; s: number }[] = [];
  const n = 240;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const u = 1 - s;
    aus.push({
      x: u * u * SCHWEIF.p0.x + 2 * u * s * SCHWEIF.p1.x + s * s * SCHWEIF.p2.x,
      y: u * u * SCHWEIF.p0.y + 2 * u * s * SCHWEIF.p1.y + s * s * SCHWEIF.p2.y,
      s,
    });
  }
  return aus;
}

/** Helligkeit des Schweifs 0 … 1 am Himmelspixel (c, y). */
function schweifHelligkeit(punkte: readonly { x: number; y: number; s: number }[], c: number, y: number): number {
  let best = Infinity;
  let bs = 0;
  let seite = 0;
  for (let i = 0; i < punkte.length; i++) {
    const p = punkte[i] as { x: number; y: number; s: number };
    const d = (p.x - c - 0.5) ** 2 + (p.y - y - 0.5) ** 2;
    if (d < best) {
      best = d;
      bs = p.s;
      const q = punkte[Math.min(punkte.length - 1, i + 1)] as { x: number; y: number };
      const r = punkte[Math.max(0, i - 1)] as { x: number; y: number };
      // Seite quer zur Achse: Kreuzprodukt aus Richtung und Abstand
      seite = Math.sign((q.x - r.x) * (y + 0.5 - p.y) - (q.y - r.y) * (c + 0.5 - p.x));
    }
  }
  const d = Math.sqrt(best);
  const w = SCHWEIF.breite0 + (SCHWEIF.breite1 - SCHWEIF.breite0) * bs;
  const quer = d / w;
  if (quer > 1.6) return 0;
  // Grundform: hell in der Achse, weich nach außen; Kopf heller als das Ende.
  const form = Math.exp(-2.2 * quer * quer) * (1 - 0.62 * bs);
  // Schlieren: Rauschen quer zur Achse fein, längs grob (Strähnen), zum Ende hin breiter;
  // dazu leichte Unruhe in der Fläche.
  const quer2 = (seite * d) / (1 + bs);
  const schliere = 0.6 + 0.55 * rauschen(quer2 + 64, bs * SCHWEIF.laenge, SCHWEIF.schliere, 90, SEED_SCHWEIF + 1);
  const unruhe = 0.85 + 0.3 * rauschen(c, y, 14, 9, SEED_SCHWEIF);
  // unter der Anzeigeleiste ausblenden, damit Schrift und Balken lesbar bleiben (ANZEIGE_ZEILEN)
  const oben = Math.max(0, Math.min(1, (y - ANZEIGE_ZEILEN + 8) / 20));
  return Math.max(0, Math.min(1, form * schliere * unruhe * 1.25 * oben));
}

/** Kammlinie der fernen Eisgrate: Zeile der Oberkante je Spalte. */
function gratZeile(c: number): number {
  return Math.round(116 + 13 * rauschen(c, 0, 46, 1, SEED_GRAT) + 5 * rauschen(c, 7, 11, 1, SEED_GRAT + 1) - 4);
}

/** Kontrollturm am Horizont: Mitte, Schaft, Kanzel (Gestaltung G5; der Hafen hat einen Kontrollturm, design.md 2). */
const TURM = { mitte: 268, schaftB: 4, kanzelB: 12, kanzelH: 6, oben: 74 } as const;

/** Zeichnet den Himmel des Abschnitts (Breite himmelBreite, Höhe HIMMEL_ZEILEN). */
export function himmel(a: Abschnitt): Leinwand {
  const breite = himmelBreite(a);
  const bild = new Leinwand(breite, HIMMEL_ZEILEN);
  const verlauf = verlaufFarben();
  const leiter: Pixel[] = [ton(EISWAND, 2), ton(EISWAND, 3), ton(KOMETENSCHWEIF, 0), ton(KOMETENSCHWEIF, 1), ton(KOMETENSCHWEIF, 2), ton(KOMETENSCHWEIF, 3)];
  const punkte = schweifPunkte();
  const hell = new Float64Array(breite * HIMMEL_ZEILEN);
  for (let y = 0; y < HIMMEL_ZEILEN; y++) {
    const t = Math.pow(y / (HIMMEL_ZEILEN - 1), 1.1);
    for (let c = 0; c < breite; c++) {
      const grund = verlauf[rasterIndex(t, verlauf.length - 1, c, y, true)] as Pixel;
      const h = schweifHelligkeit(punkte, c, y);
      hell[y * breite + c] = h;
      // Schweif: Leiter über dem Grund, mit Raster; Stufe 0 heißt Grund
      const i = rasterIndex(h, leiter.length, c, y, true);
      bild.setze(c, y, i === 0 ? grund : (leiter[i - 1] as Pixel));
    }
  }
  // Sterne: je Zelle 11 × 9 höchstens einer, nicht im hellen Schweif und nicht am Horizont
  const zelleB = 11;
  const zelleH = 9;
  for (let gy = 0; gy * zelleH < 104; gy++) {
    for (let gx = 0; gx * zelleB < breite; gx++) {
      const w = zufallsWert(gx, gy, SEED_STERNE);
      if (w > 0.42) continue;
      const c = gx * zelleB + Math.floor(zufallsWert(gx, gy, SEED_STERNE + 1) * (zelleB - 2)) + 1;
      const y = gy * zelleH + Math.floor(zufallsWert(gx, gy, SEED_STERNE + 2) * (zelleH - 2)) + 1;
      if (c >= breite - 1 || (hell[y * breite + c] as number) > 0.08) continue;
      const art = zufallsWert(gx, gy, SEED_STERNE + 3);
      if (art < 0.07 && y > 2) {
        // großer Stern: Kreuz mit hellem Kern
        bild.setze(c, y, ton(KOMETENSCHWEIF, 4));
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) bild.setze(c + dx, y + dy, ton(KOMETENSCHWEIF, 1));
      } else if (art < 0.32) bild.setze(c, y, ton(KOMETENSCHWEIF, 3));
      else bild.setze(c, y, ton(EISWAND, 3));
    }
  }
  // Ferne Eisgrate: dunkles Eis, Licht auf den nach links oben gewandten Hängen
  for (let c = 0; c < breite; c++) {
    const r = gratZeile(c);
    const links = gratZeile(c - 1);
    for (let y = r; y < HIMMEL_ZEILEN; y++) bild.setze(c, y, ton(EISWAND, 0));
    if (links > r) {
      bild.setze(c, r, ton(EISWAND, 2));
      bild.setze(c, r + 1, ton(EISWAND, 1));
    } else bild.setze(c, r, ton(EISWAND, 1));
    // feine Schichtung im Eis (Raster)
    for (let y = r + 3; y < HIMMEL_ZEILEN; y++) {
      if (rauschen(c, y, 9, 3, SEED_GRAT + 2) > 0.62 && (c + y) % 2 === 0) bild.setze(c, y, ton(EISWAND, 1));
    }
  }
  // Kontrollturm: Schaft, Kanzel mit Fensterband, Leuchtfeuer
  const m = TURM.mitte;
  const fuss = gratZeile(m);
  const schaftOben = TURM.oben + TURM.kanzelH;
  bild.rechteck(m - TURM.schaftB / 2, schaftOben, TURM.schaftB, fuss - schaftOben + 2, ton(EISWAND, 0));
  bild.rechteck(m - TURM.schaftB / 2, schaftOben, 1, fuss - schaftOben + 2, ton(EISWAND, 1));
  bild.rechteck(m - TURM.kanzelB / 2, TURM.oben, TURM.kanzelB, TURM.kanzelH, ton(EISWAND, 0));
  bild.rechteck(m - TURM.kanzelB / 2 + 1, TURM.oben - 1, TURM.kanzelB - 2, 1, ton(EISWAND, 1));
  for (let i = 0; i < TURM.kanzelB - 4; i += 2) bild.rechteck(m - TURM.kanzelB / 2 + 2 + i, TURM.oben + 2, 1, 2, ton(KOMETENSCHWEIF, 2));
  bild.rechteck(m, TURM.oben - 6, 1, 5, ton(EISWAND, 1));
  bild.setze(m, TURM.oben - 7, NEON_CYAN);
  return bild;
}
