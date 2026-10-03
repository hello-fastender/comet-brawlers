// Vordergrund des Landedecks (Auftrag 4, 1.6 und 4, Abschnitt A): Kabelrollen am unteren
// Bildrand bei Welt-x 96 bis 176 und 280 bis 344, je 24 Zeilen (scheibe.txt, Sätze
// vordergrund kabelrollen1 und kabelrollen2). Kabeltrommeln mit der Achse in die Tiefe:
// vorn die Stahlscheibe mit Kranz, Erleichterungslöchern und Nabe (Licht von links oben),
// dahinter die Wicklung als Band waagrechter Windungen und der Rand der hinteren Scheibe;
// der untere Bildrand schneidet die Trommeln ab. Ein loses Kabel liegt am Boden. Die
// Darstellung zeichnet den Vordergrund mit fester Deckkraft 0,85 vor den Figuren
// (DECKKRAFT_VORDERGRUND); das Bild selbst ist voll deckend.

import { Leinwand } from '../leinwand.ts';
import type { TonIndex } from '../palette.ts';
import { FASSADE_STAHL, KABEL, REIF } from '../palette.ts';
import { raster, ton } from './werkzeug.ts';

/** Versatz der hinteren Scheibe nach oben (Tiefe der Trommel im Bild) und Rand der Wicklung (Gestaltung G5). */
const TIEFE = 5;
const WICKEL_RAND = 3;

/** Lichtanteil −1 … 1 für eine Richtung (dx, dy) vom Mittelpunkt: links oben hell (docs/grafik.md 1.3). */
function licht(dx: number, dy: number): number {
  const d = Math.hypot(dx, dy) || 1;
  return (-dx - dy) / d / Math.SQRT2;
}

/** Eine Kabeltrommel: Mitte der vorderen Scheibe (cx, cy), Radius r. */
function trommel(bild: Leinwand, cx: number, cy: number, r: number): void {
  const rw = r - WICKEL_RAND;
  // hintere Scheibe (nur ihr oberer Rand schaut hervor)
  for (let y = Math.floor(cy - TIEFE - r); y <= cy - TIEFE + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - (cy - TIEFE);
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      bild.setze(x, y, ton(FASSADE_STAHL, d > r - 1.2 ? (licht(dx, dy) > 0.2 ? 2 : 0) : 1));
    }
  }
  // Wicklung zwischen den Scheiben: Vereinigung der Kreise rw von hinten nach vorn, Windungen waagrecht
  for (let o = TIEFE; o >= 0; o--) {
    for (let y = Math.floor(cy - o - rw); y <= cy - o + rw; y++) {
      for (let x = Math.floor(cx - rw); x <= cx + rw; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - (cy - o);
        if (Math.hypot(dx, dy) > rw) continue;
        const l = licht(dx, dy);
        const windung = (y + 64) % 2 === 0;
        let t: number = windung ? 3 : 2;
        if (l < -0.3) t -= 1;
        if (l > 0.55 && windung) t = 4;
        bild.setze(x, y, ton(KABEL, Math.max(1, Math.min(4, t)) as TonIndex));
      }
    }
  }
  // vordere Scheibe: Kranz mit Licht links oben, Fläche, zwei Ringe, Erleichterungslöcher, Nabe
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const l = licht(dx, dy);
      let t: TonIndex;
      if (d > r - 1.1) t = l > 0.35 ? 4 : l > -0.2 ? 3 : 0;
      else if (d > r - 2.2) t = l > 0 ? 3 : 1;
      else if (Math.abs(d - r * 0.55) < 0.6) t = l > 0 ? 1 : 3;
      else t = raster(x, y, 0.3 * (1 - l)) ? 1 : 2;
      bild.setze(x, y, ton(FASSADE_STAHL, t));
    }
  }
  // Erleichterungslöcher auf dem Lochkreis, dunkel mit heller Unterkante
  const lochR = Math.max(1.6, r * 0.14);
  for (let i = 0; i < 6; i++) {
    const w = ((i + 0.5) / 6) * Math.PI * 2;
    const lx = cx + Math.cos(w) * r * 0.74;
    const ly = cy + Math.sin(w) * r * 0.74;
    for (let y = Math.floor(ly - lochR); y <= ly + lochR; y++) {
      for (let x = Math.floor(lx - lochR); x <= lx + lochR; x++) {
        const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly);
        if (d > lochR) continue;
        bild.setze(x, y, y + 0.5 > ly + lochR * 0.4 ? ton(FASSADE_STAHL, 3) : ton(KABEL, 0));
      }
    }
  }
  // Nabe
  bild.rechteck(Math.round(cx) - 3, Math.round(cy) - 3, 6, 6, ton(FASSADE_STAHL, 0));
  bild.rechteck(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4, ton(FASSADE_STAHL, 3));
  bild.rechteck(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, ton(FASSADE_STAHL, 1));
  // Reif auf dem Kranz oben
  for (let x = Math.floor(cx - r * 0.6); x < cx + r * 0.2; x++) {
    const y = Math.floor(cy - Math.sqrt(Math.max(0, r * r - (x + 0.5 - cx) ** 2)));
    if ((x & 3) !== 3) bild.setze(x, y + 1, ton(REIF, 2));
  }
}

/** Loses Kabel am Boden: 2 px dick, als flache Wellenlinie von x0 bis x1 um Zeile y. */
function kabel(bild: Leinwand, x0: number, x1: number, y: number): void {
  for (let x = x0; x < x1; x++) {
    const yy = Math.round(y + 2 * Math.sin((x - x0) / 5));
    bild.setze(x, yy, ton(KABEL, 3));
    bild.setze(x, yy + 1, ton(KABEL, 1));
  }
}

/** Kabelrollen der Breite b und Höhe h (Satz vordergrund); Aufteilung in Trommeln nach der Breite. */
export function kabelrollen(b: number, h: number): Leinwand {
  const bild = new Leinwand(b, h);
  if (b >= 72) {
    // zwei Trommeln, die rechte kleiner und weiter vorn (Gestaltung G5), Kabel dazwischen
    kabel(bild, 26, b - 8, h - 4);
    trommel(bild, 21, h + 1, 19);
    trommel(bild, b - 20, h + 5, 16);
  } else {
    kabel(bild, 0, b - 2, h - 3);
    trommel(bild, b - 26, h + 3, 20);
  }
  return bild;
}
