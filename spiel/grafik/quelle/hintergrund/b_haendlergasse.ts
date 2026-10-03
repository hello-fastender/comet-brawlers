// Abschnitt B, Händlergasse (Welt-x 400 bis 850, Band 91 px, Ky 128; Auftrag 4, 4):
// Innenhof im Eis. Oben dunkle Eisdecke mit Rohrbrücke, links eine Eiswand mit
// Torpfosten (davor steht das rechte Ende des Frachtcontainers aus A), dann der Funkladen
// (Satz hintergrund funkladen x 450 bis 650) mit Neonschrift „FUNKLADEN“ in Magenta, zwei
// Schaufenstern voller Geräte (x 470 bis 530 und 560 bis 620 wie die Glasscheiben der
// vollen Stage, Welt 2.4) und Tür; daneben eine Stahlfassade mit Rohren, Handrad und
// Manometer, ein Lüftungsgitter mit Dampf (freies Bild, drei Bilder) und ein Rolltor am
// rechten Ende (dort liegt der Schnitt zur Asservatenkammer). Boden aus Gussplatten mit
// Noppen, Neon- und Fensterlicht auf dem Boden. Gestaltungszahlen sind Festlegungen G5.

import { Leinwand } from '../leinwand.ts';
import type { TonIndex } from '../palette.ts';
import { BRILLE_GLUT, EISWAND, FASSADE_STAHL, GUSSPLATTE, KABEL, NEON_CYAN, NEON_MAGENTA, NEON_SCHEIN, REIF, ROST, WAND_LADEN, WARN_GELB } from '../palette.ts';
import type { AbschnittGrafik, FreiesBild, KartenQuelle } from './blatt_hg.ts';
import { plattenBoden, tonVon } from './boden.ts';
import type { Abschnitt } from './lage.ts';
import { ANZEIGE_ZEILEN, BILD_HOEHE, abschnitt, hintergrundSatz, weltY } from './lage.ts';
import { kasten, niete, rauschen, raster, rohrSenkrecht, rohrWaagrecht, schildBreite, schildPixel, ton, zufallsWert } from './werkzeug.ts';

/** Seeds (fest). */
const SEED_DECKE = 6101;
const SEED_GERAETE = 6102;
const SEED_EIS = 6103;
const SEED_BODEN = 6105;

/** Rohrbrücke unter der Anzeigeleiste (Zeilen) und Oberkante der Fassaden (Gestaltung G5). */
const ROHRBRUECKE = ANZEIGE_ZEILEN;
const FASSADE_OBEN = ANZEIGE_ZEILEN + 10;
/** Funkladen: Oberkante (Zeile), Neonzeile, Fenster (Welt-x, Welt 2.4), Fensterzeilen, Tür (Welt-x). */
const LADEN = {
  oben: FASSADE_OBEN - 4,
  neon: FASSADE_OBEN + 7,
  fenster: [
    [470, 530],
    [560, 620],
  ] as const,
  fensterOben: 62,
  fensterUnten: 117,
  tuer: [534, 556] as const,
  tuerOben: 80,
} as const;
/** Stahlfassade: Welt-x, Panelraster, Rohre, Handrad, Manometer, Gitter, Rolltor (Gestaltung G5). */
const FASSADE = {
  x0: 650,
  panel: 32,
  naht: [64, 96] as const,
  rohr1: { y: 42, d: 7 },
  rohr2: { y: 53, d: 5, bisX: 760 },
  ventil: { x: 716, y: 82, r: 7 },
  manometer: { x: 690, y: 70, r: 4 },
  gitter: { x0: 772, x1: 804, y0: 111, y1: 127 },
  tor: { x0: 812, x1: 850, y0: 52 },
} as const;
/** Dampf über dem Gitter: Bildbreite, Oberkante, Bilder, Frames je Bild. */
const DAMPF = { b: 48, oben: 40, bilder: 3, dauer: 8 } as const;
/** Gussplatten 32 × 16, ohne Versatz. */
const PLATTE = { breite: 32, versatz: 0 } as const;
/** Kanaldeckel im Boden: Mitte (Welt-x, Tiefe z), Halbachsen (Gestaltung G5). */
const DECKEL = { x: 736, z: 186, rx: 11, ry: 7 } as const;

/** Zeile des Sockels (unterste Wandzeilen über der Bandoberkante). */
function sockel(a: Abschnitt): number {
  return a.kanteMin - 7;
}

/** Eisdecke und Rohrbrücke über die ganze Breite. */
function decke(bild: Leinwand, a: Abschnitt): void {
  for (let y = 0; y < ROHRBRUECKE + 10; y++) {
    for (let c = 0; c < a.breite; c++) {
      const n = rauschen(a.x0 + c, y, 13, 5, SEED_DECKE);
      bild.setze(c, y, ton(EISWAND, n > 0.66 && raster(a.x0 + c, y, 0.5) ? 1 : 0));
    }
  }
  rohrWaagrecht(bild, 0, a.breite, ROHRBRUECKE, 5, FASSADE_STAHL);
  rohrWaagrecht(bild, 0, a.breite, ROHRBRUECKE + 5, 4, FASSADE_STAHL);
  for (let x = 20 - (a.x0 % 48); x < a.breite; x += 48) {
    bild.rechteck(x, ROHRBRUECKE - 2, 3, 12, ton(FASSADE_STAHL, 1));
    bild.rechteck(x, ROHRBRUECKE - 2, 1, 12, ton(FASSADE_STAHL, 3));
  }
}

/** Eiswand links (Welt 400 bis 450) mit Torpfosten: senkrechte Schlieren, Licht von links, Risse. */
function eiswand(bild: Leinwand, a: Abschnitt, x0: number, x1: number): void {
  const s = sockel(a);
  for (let y = FASSADE_OBEN - 4; y < s + 7; y++) {
    for (let x = x0; x < x1; x++) {
      const wx = a.x0 + x;
      const n = rauschen(wx, y, 5, 26, SEED_EIS);
      const licht = 1 - (x - x0) / Math.max(1, x1 - x0);
      const v = n * 0.75 + licht * 0.35;
      let t: TonIndex = 1;
      if (v > 0.5) t = 2;
      if (v > 0.72 && raster(wx, y, 0.6)) t = 3;
      if (v < 0.28 && raster(wx, y, 0.5)) t = 0;
      bild.setze(x, y, ton(EISWAND, t));
    }
  }
  // Risse: schräge dunkle Linien mit heller Kante darunter
  for (let i = 0; i < 4; i++) {
    const rx = x0 + 6 + Math.floor(zufallsWert(i, 0, SEED_EIS + 2) * (x1 - x0 - 16));
    const ry = FASSADE_OBEN + 8 + Math.floor(zufallsWert(i, 1, SEED_EIS + 2) * (s - FASSADE_OBEN - 30));
    let x = rx;
    for (let y = ry; y < ry + 14; y++) {
      bild.setze(x, y, ton(EISWAND, 0));
      bild.setze(x + 1, y, ton(EISWAND, 3));
      if (zufallsWert(x, y, SEED_EIS + 3) < 0.45) x += zufallsWert(y, x, SEED_EIS + 4) < 0.5 ? 1 : -1;
    }
  }
  // Torpfosten (Doppel-T-Träger) am rechten Rand der Eiswand
  const px = x1 - 9;
  kasten(bild, px, FASSADE_OBEN - 4, 9, s + 7 - FASSADE_OBEN + 4, FASSADE_STAHL, true);
  bild.rechteck(px + 3, FASSADE_OBEN - 3, 3, s + 5 - FASSADE_OBEN + 4, ton(FASSADE_STAHL, 1));
  for (let y = FASSADE_OBEN + 4; y < s; y += 12) niete(bild, px + 1, y, FASSADE_STAHL);
}

/** Ein Gerät im Schaufenster (Radio, Bildschirm, Funkgerät) mit Leuchtpunkten. */
function geraet(bild: Leinwand, x: number, unten: number, b: number, h: number, art: number, seed: number): void {
  const y = unten - h;
  if (art < 0.4) {
    // Radio: Gehäuse, Lautsprecherraster links, Skala rechts, Knöpfe
    kasten(bild, x, y, b, h, FASSADE_STAHL, true);
    for (let yy = y + 2; yy < unten - 2; yy++) for (let xx = x + 2; xx < x + Math.floor(b / 2); xx++) if ((xx + yy) % 2 === 0) bild.setze(xx, yy, ton(FASSADE_STAHL, 0));
    bild.rechteck(x + Math.floor(b / 2) + 1, y + 2, b - Math.floor(b / 2) - 3, 2, ton(WARN_GELB, 3));
    bild.setze(x + b - 3, unten - 3, ton(FASSADE_STAHL, 4));
    if (zufallsWert(x, y, seed) < 0.5) bild.rechteck(x + b - 3, y - 4, 1, 4, ton(FASSADE_STAHL, 3));
  } else if (art < 0.75) {
    // Bildschirm: Rahmen, leuchtende Fläche mit Zeilen
    kasten(bild, x, y, b, h, FASSADE_STAHL, true);
    const hell = zufallsWert(x, y, seed) < 0.45;
    for (let yy = y + 2; yy < unten - 2; yy++) {
      for (let xx = x + 2; xx < x + b - 2; xx++) {
        const zeile = (yy - y) % 2 === 0;
        bild.setze(xx, yy, hell ? (zeile ? NEON_CYAN : ton(EISWAND, 4)) : zeile ? ton(EISWAND, 3) : ton(EISWAND, 2));
      }
    }
  } else {
    // Funkgerät: schmal, Antenne, Leuchtpunkt
    kasten(bild, x, y, b, h, WAND_LADEN, true);
    bild.rechteck(x + 1, y - 5, 1, 5, ton(FASSADE_STAHL, 3));
    bild.rechteck(x + 2, y + 2, b - 4 > 0 ? b - 4 : 1, 2, ton(EISWAND, 3));
    bild.setze(x + 2, unten - 3, zufallsWert(x, y, seed + 1) < 0.5 ? NEON_MAGENTA : NEON_CYAN);
  }
}

/** Schaufenster: Rahmen, dunkles Glas, drei Regalböden voller Geräte, Spiegelung. */
function schaufenster(bild: Leinwand, x: number, y: number, b: number, h: number, seed: number): void {
  kasten(bild, x, y, b, h, FASSADE_STAHL, true);
  const gx = x + 3;
  const gy = y + 3;
  const gb = b - 6;
  const gh = h - 6;
  for (let yy = gy; yy < gy + gh; yy++) {
    for (let xx = gx; xx < gx + gb; xx++) bild.setze(xx, yy, ton(EISWAND, raster(xx, yy, ((yy - gy) / gh) * 0.6) ? 1 : 0));
  }
  const boeden = [gy + 14, gy + 28, gy + gh - 1];
  for (const by of boeden) {
    bild.rechteck(gx, by, gb, 1, ton(FASSADE_STAHL, 3));
    if (by + 1 < gy + gh) bild.rechteck(gx, by + 1, gb, 1, ton(FASSADE_STAHL, 1));
    // Geräte von links nach rechts
    let xx = gx + 1;
    let n = 0;
    while (xx < gx + gb - 4) {
      const w = zufallsWert(xx, by, seed + n);
      const art = zufallsWert(xx, by, seed + n + 50);
      const gbr = art < 0.75 ? 8 + Math.floor(w * 6) : 4 + Math.floor(w * 2);
      const ghh = 7 + Math.floor(zufallsWert(xx, by, seed + n + 99) * 4);
      if (xx + gbr > gx + gb - 1) break;
      geraet(bild, xx, by, gbr, ghh, art, seed + n);
      xx += gbr + 1 + (w < 0.3 ? 1 : 0);
      n++;
    }
  }
  // Spiegelung: schräge helle Bahnen über dem Glas (Raster)
  for (let yy = gy; yy < gy + gh; yy++) {
    for (let xx = gx; xx < gx + gb; xx++) {
      const s = (xx - gx + (yy - gy) * 0.7) % 46;
      if (s < 6 && raster(xx, yy, 0.22)) bild.setze(xx, yy, ton(EISWAND, 3));
      else if (s >= 9 && s < 11 && raster(xx, yy, 0.18)) bild.setze(xx, yy, ton(EISWAND, 2));
    }
  }
  // Fensterbank
  bild.rechteck(x - 2, y + h, b + 4, 1, ton(FASSADE_STAHL, 4));
  bild.rechteck(x - 2, y + h + 1, b + 4, 2, ton(FASSADE_STAHL, 1));
}

/** Vergrößerung der Neonschrift (Bitmuster 5 × 7 doppelt: 10 × 14 je Zeichen; Stilprobe: Schrift etwa so breit wie ein Schaufenster). */
const NEON_FAKTOR = 2;

/**
 * Neonschrift mit Schein: Hof aus NEON_SCHEIN im Raster (dichter nahe der Röhre), Röhre in
 * NEON_MAGENTA mit hellem Kern (NEON_SCHEIN 4) links oben in jedem Block.
 */
function neon(bild: Leinwand, text: string, x: number, y: number): void {
  const roehre = new Set<number>();
  const kern = new Set<number>();
  const f = NEON_FAKTOR;
  schildPixel(text, 0, 0, (px, py) => {
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) roehre.add((y + py * f + dy) * bild.breite + x + px * f + dx);
    kern.add((y + py * f) * bild.breite + x + px * f);
  });
  const b = schildBreite(text) * f;
  const h = 7 * f;
  for (let yy = y - 4; yy < y + h + 4; yy++) {
    for (let xx = x - 4; xx < x + b + 4; xx++) {
      let d = Infinity;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (roehre.has((yy + dy) * bild.breite + xx + dx)) d = Math.min(d, Math.hypot(dx, dy));
      if (d === Infinity || d === 0) continue;
      if (d <= 1.01 && raster(xx, yy, 0.75)) bild.setze(xx, yy, ton(NEON_SCHEIN, 2));
      else if (d <= 2.3 && raster(xx, yy, 0.45)) bild.setze(xx, yy, ton(NEON_SCHEIN, 1));
      else if (raster(xx, yy, 0.2)) bild.setze(xx, yy, ton(NEON_SCHEIN, 0));
    }
  }
  for (const i of roehre) bild.setze(i % bild.breite, Math.floor(i / bild.breite), kern.has(i) ? ton(NEON_SCHEIN, 4) : NEON_MAGENTA);
}

/** Funkladen als freies Bild (Welt-x 450 bis 650): Gesims, Neon, Schaufenster, Tür, Klimagerät, Sockel. */
export function funkladen(a: Abschnitt, x0: number, x1: number): Leinwand {
  const b = x1 - x0;
  const h = a.kanteMin - LADEN.oben;
  const bild = new Leinwand(b, h);
  const z = (zeile: number): number => zeile - LADEN.oben;
  // Wand mit senkrechten Fugen und leichter Unruhe
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      let t: TonIndex = 2;
      if (rauschen(x0 + x, y, 7, 11, SEED_GERAETE) > 0.72 && raster(x0 + x, y, 0.4)) t = 1;
      if ((x0 + x) % 25 === 0) t = 1;
      bild.setze(x, y, ton(WAND_LADEN, t));
    }
  }
  // Gesims oben
  const gesims: TonIndex[] = [0, 3, 4, 2, 1, 0];
  gesims.forEach((t, i) => bild.rechteck(0, i, b, 1, ton(WAND_LADEN, t)));
  // Kanten links und rechts
  bild.rechteck(0, 0, 1, h, ton(WAND_LADEN, 0));
  bild.rechteck(1, 6, 1, h - 6, ton(WAND_LADEN, 3));
  bild.rechteck(b - 1, 0, 1, h, ton(WAND_LADEN, 0));
  // Neonschrift, mittig über der Ladenfront
  const text = 'FUNKLADEN';
  const nb = schildBreite(text) * NEON_FAKTOR;
  const nx = Math.floor((b - nb) / 2);
  // Halter der Neonröhren
  for (const hx of [nx + 3, nx + nb - 4]) bild.rechteck(hx, z(LADEN.neon) - 5, 1, 4, ton(FASSADE_STAHL, 2));
  neon(bild, text, nx, z(LADEN.neon));
  // Schaufenster
  LADEN.fenster.forEach(([f0, f1], i) => schaufenster(bild, f0 - x0, z(LADEN.fensterOben), f1 - f0, LADEN.fensterUnten - LADEN.fensterOben, SEED_GERAETE + 100 * i));
  // Tür mit Fenster und Leuchtpunkt
  const tx = LADEN.tuer[0] - x0;
  const tb = LADEN.tuer[1] - LADEN.tuer[0];
  const ty = z(LADEN.tuerOben);
  kasten(bild, tx, ty, tb, h - ty, FASSADE_STAHL, true);
  kasten(bild, tx + 3, ty + 3, tb - 6, h - ty - 5, WAND_LADEN, true);
  kasten(bild, tx + 6, ty + 7, tb - 12, 14, EISWAND, true);
  bild.rechteck(tx + 7, ty + 9, tb - 14, 1, ton(EISWAND, 4));
  bild.rechteck(tx + tb - 7, ty + 28, 2, 4, ton(WARN_GELB, 3));
  bild.rechteck(tx + tb - 6, ty + 29, 1, 3, ton(WARN_GELB, 1));
  bild.rechteck(tx + 6, ty + 4, 3, 1, NEON_CYAN);
  // Sockel unter den Fenstern
  const s = z(sockel(a));
  bild.rechteck(1, s, b - 2, 1, ton(WAND_LADEN, 0));
  bild.rechteck(1, s + 1, b - 2, h - s - 1, ton(WAND_LADEN, 1));
  bild.rechteck(1, h - 1, b - 2, 1, ton(WAND_LADEN, 0));
  bild.rechteck(tx, s, tb, h - s, ton(FASSADE_STAHL, 2));
  bild.rechteck(tx, s, tb, 1, ton(FASSADE_STAHL, 3));
  bild.rechteck(tx, h - 1, tb, 1, ton(FASSADE_STAHL, 0));
  // Klimagerät rechts mit Lüfter und Kabel nach oben
  const kx = b - 26;
  const ky = z(FASSADE_OBEN + 18);
  kasten(bild, kx, ky, 20, 16, FASSADE_STAHL, true);
  for (let yy = ky + 3; yy < ky + 13; yy++) {
    for (let xx = kx + 3; xx < kx + 17; xx++) {
      const d = Math.hypot(xx - kx - 9.5, yy - ky - 7.5);
      if (d < 5.2) bild.setze(xx, yy, ton(FASSADE_STAHL, d < 1.5 ? 3 : (xx + yy) % 2 === 0 ? 0 : 1));
    }
  }
  bild.rechteck(kx + 15, 6, 1, ky - 6, ton(KABEL, 2));
  bild.rechteck(kx + 16, 6, 1, ky - 6, ton(KABEL, 0));
  return bild;
}

/** Stahlfassade mit Paneelen, Nieten, Rohren, Handrad und Manometer. */
function stahlfassade(bild: Leinwand, a: Abschnitt, x0: number, x1: number): void {
  const s = sockel(a);
  const c0 = x0 - a.x0;
  const c1 = x1 - a.x0;
  for (let y = FASSADE_OBEN; y < s; y++) {
    for (let c = c0; c < c1; c++) {
      const wx = a.x0 + c;
      let t: TonIndex = 2;
      if (rauschen(wx, y, 17, 9, SEED_EIS + 7) > 0.76 && raster(wx, y, 0.3)) t = 1;
      if ((wx - x0) % FASSADE.panel === 0) t = 0;
      else if ((wx - x0) % FASSADE.panel === 1) t = 3;
      if (FASSADE.naht.includes(y as 64 | 96)) t = 0;
      else if (FASSADE.naht.includes((y - 1) as 64 | 96)) t = 3;
      bild.setze(c, y, ton(FASSADE_STAHL, t));
    }
  }
  bild.rechteck(c0, FASSADE_OBEN, c1 - c0, 1, ton(FASSADE_STAHL, 0));
  // Nieten an den senkrechten Nähten
  for (let wx = x0 + FASSADE.panel; wx < x1; wx += FASSADE.panel) {
    for (let y = FASSADE_OBEN + 4; y < s - 3; y += 9) niete(bild, wx - a.x0 + 3, y, FASSADE_STAHL);
  }
  // Rohre mit Flanschen
  rohrWaagrecht(bild, c0, c1, FASSADE.rohr1.y, FASSADE.rohr1.d, FASSADE_STAHL, true);
  rohrWaagrecht(bild, c0, FASSADE.rohr2.bisX - a.x0, FASSADE.rohr2.y, FASSADE.rohr2.d, FASSADE_STAHL);
  for (let wx = x0 + 20; wx < x1; wx += 40) {
    bild.rechteck(wx - a.x0, FASSADE.rohr1.y - 1, 2, FASSADE.rohr1.d + 2, ton(FASSADE_STAHL, 1));
    bild.rechteck(wx - a.x0, FASSADE.rohr1.y - 1, 1, FASSADE.rohr1.d + 2, ton(FASSADE_STAHL, 4));
  }
  // Rohr 2 knickt nach unten zum Handrad
  const vx = FASSADE.ventil.x - a.x0 - 2;
  rohrSenkrecht(bild, vx, FASSADE.rohr2.y + 2, s, 6, FASSADE_STAHL, true);
  rohrSenkrecht(bild, FASSADE.rohr2.bisX - a.x0 - 5, FASSADE.rohr2.y, s, 5, FASSADE_STAHL);
  kasten(bild, vx - 2, FASSADE.ventil.y + 6, 10, 8, FASSADE_STAHL, true);
  // Handrad (rostrot): Kranz, Speichen, Nabe
  const cx = FASSADE.ventil.x - a.x0 + 1;
  const cy = FASSADE.ventil.y;
  const r = FASSADE.ventil.r;
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
      const oben = y - cy < 0 || x - cx < 0;
      if (d > r - 1.6 && d <= r + 0.4) bild.setze(x, y, ton(ROST, oben ? 3 : 1));
      else if (d <= r - 1.6 && (Math.abs(x - cx + 0.5) < 1 || Math.abs(y - cy + 0.5) < 1)) bild.setze(x, y, ton(ROST, 2));
    }
  }
  bild.rechteck(cx - 1, cy - 1, 2, 2, ton(ROST, 4));
  // Manometer am oberen Rohr
  const mx = FASSADE.manometer.x - a.x0;
  const my = FASSADE.manometer.y;
  bild.rechteck(mx, FASSADE.rohr1.y + FASSADE.rohr1.d, 2, my - FASSADE.rohr1.y - FASSADE.rohr1.d - 3, ton(FASSADE_STAHL, 1));
  for (let y = my - 5; y <= my + 5; y++) {
    for (let x = mx - 5; x <= mx + 6; x++) {
      const d = Math.hypot(x - mx - 0.5, y - my);
      if (d <= FASSADE.manometer.r + 1) bild.setze(x, y, ton(FASSADE_STAHL, d > FASSADE.manometer.r ? 0 : 1));
      if (d <= FASSADE.manometer.r) bild.setze(x, y, ton(REIF, 2));
    }
  }
  bild.linie(mx, my, mx + 2, my - 2, ton(KABEL, 0));
  bild.setze(mx - 2, my - 1, ton(ROST, 2));
}

/** Lüftungsgitter am Sockel. */
function gitter(bild: Leinwand, a: Abschnitt): void {
  const g = FASSADE.gitter;
  kasten(bild, g.x0 - a.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, FASSADE_STAHL, true);
  for (let y = g.y0 + 2; y < g.y1 - 2; y += 3) {
    bild.rechteck(g.x0 - a.x0 + 2, y, g.x1 - g.x0 - 4, 1, ton(KABEL, 0));
    bild.rechteck(g.x0 - a.x0 + 2, y + 1, g.x1 - g.x0 - 4, 1, ton(FASSADE_STAHL, 3));
  }
}

/** Rolltor am rechten Ende: Kasten, Lamellen, Pfosten mit Warnstreifen, Warnleuchte. */
function rolltor(bild: Leinwand, a: Abschnitt): void {
  const t = FASSADE.tor;
  const c0 = t.x0 - a.x0;
  const c1 = t.x1 - a.x0;
  const s = a.kanteMin;
  // Lamellen
  for (let y = t.y0; y < s; y++) {
    const i = (y - t.y0) % 4;
    const tt: TonIndex = i === 0 ? 3 : i === 3 ? 0 : 2;
    bild.rechteck(c0, y, c1 - c0, 1, ton(FASSADE_STAHL, tt));
  }
  kasten(bild, c0 - 2, t.y0 - 8, c1 - c0 + 2, 8, FASSADE_STAHL, true);
  // Pfosten mit Warnstreifen
  for (const px of [c0 - 4, c1 - 4]) {
    for (let y = t.y0 - 8; y < s; y++) {
      for (let i = 0; i < 4; i++) {
        const gelb = (y + i) % 8 < 4;
        bild.setze(px + i, y, gelb ? ton(WARN_GELB, i === 0 ? 3 : 2) : ton(KABEL, i === 3 ? 0 : 1));
      }
    }
  }
  // Warnleuchte über dem Tor
  const lx = Math.floor((c0 + c1) / 2) - 2;
  kasten(bild, lx - 1, t.y0 - 14, 6, 5, FASSADE_STAHL, true);
  bild.rechteck(lx, t.y0 - 13, 4, 2, BRILLE_GLUT);
  for (let y = t.y0 - 20; y < t.y0 - 8; y++) {
    for (let x = lx - 6; x < lx + 10; x++) {
      const d = Math.hypot(x - lx - 1.5, y - t.y0 + 12);
      const p = bild.hole(x, y);
      if (d < 7 && d > 2.5 && raster(x, y, 0.35 * (1 - d / 7)) && tonVon(FASSADE_STAHL, p) !== null) bild.setze(x, y, ton(ROST, 3));
    }
  }
}

/** Sockelband unter Fassade und Eiswand. */
function sockelband(bild: Leinwand, a: Abschnitt, x0: number, x1: number): void {
  const s = sockel(a);
  for (let y = s; y < a.kanteMin; y++) {
    const t: TonIndex = y === s ? 3 : y === a.kanteMin - 1 ? 0 : 1;
    bild.rechteck(x0 - a.x0, y, x1 - x0, 1, ton(FASSADE_STAHL, t));
  }
}

/** Dampfwolken je Bild und Schwanken der Säule (Gestaltung G5). */
const DAMPF_WOLKEN = 5;

/**
 * Dampf aus dem Gitter: Wolken steigen auf, werden größer und lichter (Raster); in jedem der
 * n Bilder steht jede Wolke um 1/n ihres Abstands höher, so dass die Folge nahtlos schleift.
 */
export function dampf(n: number, h: number): Leinwand[] {
  const bilder: Leinwand[] = [];
  const b = DAMPF.b;
  for (let i = 0; i < n; i++) {
    const bild = new Leinwand(b, h);
    const wolken: { x: number; y: number; r: number; d: number }[] = [];
    for (let k = 0; k < DAMPF_WOLKEN; k++) {
      const p = (k + i / n) / DAMPF_WOLKEN; // 0 am Gitter, 1 oben
      wolken.push({
        x: b / 2 + 6 * p * p + 2 * Math.sin(p * 9),
        y: h - 3 - p * (h - 12),
        r: 4 + p * 11,
        d: Math.pow(1 - p, 1.3),
      });
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < b; x++) {
        let dichte = 0;
        for (const w of wolken) {
          const q = Math.hypot(x + 0.5 - w.x, (y + 0.5 - w.y) * 1.15) / w.r;
          if (q < 1) dichte = Math.max(dichte, w.d * (1 - q * q));
        }
        // dünne Säule direkt über dem Gitter
        const saeule = y > h - 14 ? Math.max(0, 1 - Math.abs(x + 0.5 - b / 2) / 5) * 0.7 : 0;
        dichte = Math.max(dichte, saeule);
        if (dichte <= 0.06) continue;
        if (dichte > 0.55 && raster(x, y, 0.8)) bild.setze(x, y, ton(REIF, 2));
        else if (dichte > 0.3 && raster(x, y, 0.7)) bild.setze(x, y, ton(REIF, 1));
        else if (raster(x, y, dichte * 1.1)) bild.setze(x, y, ton(REIF, 0));
      }
    }
    bilder.push(bild);
  }
  return bilder;
}

/** Wand der Händlergasse (überall deckend). */
function wand(a: Abschnitt): Leinwand {
  const bild = new Leinwand(a.breite, BILD_HOEHE);
  const laden = hintergrundSatz('funkladen');
  decke(bild, a);
  eiswand(bild, a, 0, laden.x0 - a.x0);
  // Grund hinter dem Funkladen (vom freien Bild verdeckt): ruhige Ladenwand
  bild.rechteck(laden.x0 - a.x0, FASSADE_OBEN - 4, laden.x1 - laden.x0, a.kanteMin - FASSADE_OBEN + 4, ton(WAND_LADEN, 1));
  stahlfassade(bild, a, FASSADE.x0, a.x1);
  sockelband(bild, a, FASSADE.x0, a.x1);
  sockelband(bild, a, a.x0, laden.x0);
  gitter(bild, a);
  rolltor(bild, a);
  return bild;
}

/** Boden: Gussplatten mit Noppen, Neonschein und Fensterlicht vor dem Laden. */
function boden(a: Abschnitt): Leinwand {
  const bild = new Leinwand(a.breite, BILD_HOEHE);
  plattenBoden(bild, a, {
    m: GUSSPLATTE,
    breite: PLATTE.breite,
    versatz: PLATTE.versatz,
    flaeche: (x, y, l) => {
      // Noppen im Raster 6 × 5: Licht links oben, Schatten rechts unten
      const nx = (l.dx - 2) % 6;
      const ny = (l.dy - 2) % 5;
      if (l.dx >= 2 && l.dy >= 2 && l.dx < l.pb - 2 && l.dy < l.ph - 2) {
        if (nx === 0 && ny === 0) return 3;
        if (nx === 1 && ny === 1) return 1;
      }
      if (rauschen(a.x0 + x, y, 15, 6, SEED_BODEN) > 0.7 && raster(a.x0 + x, y, 0.4)) return 1;
      return null;
    },
  });
  // Licht aus den Schaufenstern und Neonschein auf den vorderen Platten
  const k = a.kanteMin;
  for (const [f0, f1] of LADEN.fenster) {
    for (let y = k + 1; y < k + 30; y++) {
      const tiefe = (y - k) / 30;
      const spreiz = Math.round(tiefe * 10);
      for (let wx = f0 - spreiz; wx < f1 + spreiz; wx++) {
        const c = wx - a.x0;
        const p = bild.hole(c, y);
        const t = tonVon(GUSSPLATTE, p);
        if (t === null || t >= 3 || t === 0) continue;
        if (raster(wx, y, 0.55 * (1 - tiefe))) bild.setze(c, y, ton(GUSSPLATTE, (t + 1) as TonIndex));
      }
    }
  }
  // Kanaldeckel: dunkler Ring, Licht links oben, Rautenmuster
  const dx0 = DECKEL.x - a.x0;
  const dy0 = weltY(DECKEL.z) + a.ky;
  for (let y = dy0 - DECKEL.ry - 1; y <= dy0 + DECKEL.ry + 1; y++) {
    for (let x = dx0 - DECKEL.rx - 1; x <= dx0 + DECKEL.rx + 1; x++) {
      const ex = (x + 0.5 - dx0) / DECKEL.rx;
      const ey = (y + 0.5 - dy0) / DECKEL.ry;
      const q = Math.hypot(ex, ey);
      if (q > 1) continue;
      let t: TonIndex = 2;
      if (q > 0.82) t = ex + ey < -0.3 ? 1 : ex + ey > 0.3 ? 3 : 0;
      else if (q > 0.7) t = ex + ey < 0 ? 3 : 1;
      else if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) t = (x + y) % 4 === 0 ? 3 : 1;
      bild.setze(x, y, ton(GUSSPLATTE, t));
    }
  }
  const laden = hintergrundSatz('funkladen');
  const nm = (laden.x0 + laden.x1) / 2;
  for (let y = k + 1; y < k + 12; y++) {
    for (let wx = nm - 34; wx < nm + 34; wx++) {
      const d = Math.abs(wx - nm) / 34 + (y - k) / 12;
      if (d < 1 && raster(wx, y + 1, 0.3 * (1 - d))) bild.setze(wx - a.x0, y, ton(NEON_SCHEIN, 0));
    }
  }
  return bild;
}

/** Alle Ebenen der Händlergasse. */
export function haendlergasse(): AbschnittGrafik {
  const a = abschnitt('B');
  const laden = hintergrundSatz('funkladen');
  const g = FASSADE.gitter;
  const karten: KartenQuelle[] = [
    { ebene: 'wand', name: 'haendlergasse', parallax: 1, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: wand(a) },
    { ebene: 'boden', name: 'gussplatten', parallax: 1, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: boden(a) },
  ];
  const bilder: FreiesBild[] = [
    { name: laden.bild, ebene: 'wand', folge: 1, parallax: 1, deckkraft: 1, x: laden.x0, zeile: LADEN.oben, bilder: [funkladen(a, laden.x0, laden.x1)], dauer: 0 },
    {
      name: 'dampf',
      ebene: 'wand',
      folge: 2,
      parallax: 1,
      deckkraft: 1,
      x: Math.round((g.x0 + g.x1) / 2 - DAMPF.b / 2),
      zeile: DAMPF.oben,
      bilder: dampf(DAMPF.bilder, g.y0 + 4 - DAMPF.oben),
      dauer: DAMPF.dauer,
    },
  ];
  return { abschnitt: a, karten, bilder };
}
