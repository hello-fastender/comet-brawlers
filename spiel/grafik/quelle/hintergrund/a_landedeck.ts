// Abschnitt A, Landedeck (Welt-x 0 bis 400, Band 75 px, Ky 128; Auftrag 4, 4): außen,
// Nachthimmel mit Kometenschweif (himmel.ts), oben eine Kranbrücke mit Eiszapfen und
// Laufkatze, eine Kranstütze, ein Leuchtfeuer, der Frachtcontainer „PERIHEL FRACHT“
// (rostrot, Schrift als Bitmuster; Satz hintergrund frachtcontainer x 330 bis 410), die
// hintere Plattform bis zur Bandoberkante von B und der Warnstreifen am Rand des Bandes;
// Boden aus Eisbetonplatten mit Reif und aufgemalten Pfeilen; vorn Kabelrollen
// (vordergrund.ts). Gestaltungszahlen (Zeilen, Breiten) sind Festlegungen G5 nach der
// Stilprobe docs/bilder/stil_1_arcade_szene.png, Lagen kommen aus scheibe.txt (lage.ts).

import { Leinwand } from '../leinwand.ts';
import type { TonIndex } from '../palette.ts';
import { EISBETON, EISWAND, FASSADE_STAHL, KABEL, KOMETENSCHWEIF, NACHTHIMMEL, NEON_CYAN, REIF, ROST, WARN_GELB } from '../palette.ts';
import type { AbschnittGrafik, FreiesBild, KartenQuelle } from './blatt_hg.ts';
import { plattenBoden, tonVon } from './boden.ts';
import { himmel } from './himmel.ts';
import type { Abschnitt } from './lage.ts';
import { ANZEIGE_ZEILEN, BILD_HOEHE, DECKKRAFT_VORDERGRUND, PARALLAX_HIMMEL, abschnitt, hintergrundSatz, vordergrundSatz } from './lage.ts';
import { kabelrollen } from './vordergrund.ts';
import { kasten, rauschen, rauschen2, raster, schild, schildBreite, ton, zufallsWert } from './werkzeug.ts';

/** Seeds (fest). */
const SEED_ZAPFEN = 5101;
const SEED_BODEN = 5102;
const SEED_REIF = 5103;
const SEED_CONTAINER = 5104;

/** Kranbrücke: Obergurt ab der ersten Zeile unter der Anzeigeleiste, Untergurt, Pfosten (Gestaltung G5). */
const BRUECKE = { oben: ANZEIGE_ZEILEN + 1, gurt: 3, hoehe: 11, pfosten: 22 } as const;
/** Kranstütze: linke Spalte (Welt-x) und Breite. */
const STUETZE = { x: 204, b: 13 } as const;
/** Laufkatze mit Haken: linke Spalte, Breite, Hakenzeile. */
const KATZE = { x: 120, b: 24, haken: 70 } as const;
/** Leuchtfeuer: Mast (Welt-x), Kopfzeile. */
const FEUER = { x: 38, kopf: 76 } as const;
/** Warnstreifen über der Bandoberkante: Höhe und Periode der Schrägstreifen. */
const WARN = { hoehe: 4, periode: 8 } as const;
/** Plattenraster des Landedecks: 64 × 16 ohne Versatz (versetzte Platten lesen sich wie Mauerwerk; 64 wie die Bodenmarken der Platzhalter). */
const PLATTE = { breite: 64, versatz: 0 } as const;
/** Aufgemalte Pfeile des Rollwegs: Welt-x der Spitze des ersten, Abstand, Höhe, Strichbreite. */
const PFEILE = { x: 236, abstand: 22, halb: 11, strich: 6, anzahl: 3 } as const;

/** Zeile der hinteren Plattformkante: Bandoberkante von B (z 229), damit Container und Hof bündig stehen. */
function hintenZeile(): number {
  return abschnitt('B').kanteMin;
}

/** Eiszapfen an einer Unterkante von x0 bis x1 (Zeile y), Längen zufällig (Seed). */
function eiszapfen(bild: Leinwand, x0: number, x1: number, y: number, laengeMax: number, seed: number): void {
  let x = x0;
  while (x < x1 - 1) {
    const w = zufallsWert(x, y, seed);
    const breite = w < 0.35 ? 1 : w < 0.8 ? 2 : 3;
    const lang = 2 + Math.floor(Math.pow(zufallsWert(x, y + 1, seed), 1.8) * (laengeMax - 2));
    if (zufallsWert(x, y + 2, seed) < 0.72) {
      for (let i = 0; i < lang; i++) {
        // verjüngt: nach unten schmaler
        const b = Math.max(1, Math.round(breite * (1 - i / lang) + 0.4));
        for (let s = 0; s < b; s++) {
          const t: TonIndex = s === 0 ? (i < lang - 1 ? 4 : 3) : s === b - 1 && b > 1 ? 2 : 3;
          bild.setze(x + s, y + i, ton(EISWAND, t));
        }
      }
      if (lang > 3) bild.setze(x, y + lang - 1, ton(REIF, 2));
    }
    x += breite + (zufallsWert(x, y + 3, seed) < 0.5 ? 1 : 2);
  }
}

/** Kranbrücke als Fachwerkträger über die ganze Breite, Reif auf dem Obergurt, Eiszapfen am Untergurt. */
function kranbruecke(bild: Leinwand, a: Abschnitt): void {
  const y0 = BRUECKE.oben;
  const yU = y0 + BRUECKE.hoehe - BRUECKE.gurt;
  const gurt = (y: number): void => {
    bild.rechteck(0, y, a.breite, 1, ton(FASSADE_STAHL, 3));
    bild.rechteck(0, y + 1, a.breite, 1, ton(FASSADE_STAHL, 2));
    bild.rechteck(0, y + 2, a.breite, 1, ton(FASSADE_STAHL, 1));
  };
  // Fachwerk zwischen den Gurten: Pfosten und Diagonalen (Warren), dahinter Himmel
  for (let x = -((a.x0 + 6) % BRUECKE.pfosten); x < a.breite; x += BRUECKE.pfosten) {
    bild.rechteck(x, y0 + 3, 2, yU - y0 - 3, ton(FASSADE_STAHL, 2));
    bild.rechteck(x + 1, y0 + 3, 1, yU - y0 - 3, ton(FASSADE_STAHL, 1));
    bild.linie(x + 2, y0 + 3, x + BRUECKE.pfosten - 1, yU - 1, ton(FASSADE_STAHL, 1));
    bild.linie(x + 2, yU - 1, x + BRUECKE.pfosten - 1, y0 + 3, ton(FASSADE_STAHL, 2));
  }
  gurt(y0);
  gurt(yU);
  // Nieten auf den Gurten
  for (let x = 3 - ((a.x0 + 3) % 8); x < a.breite; x += 8) {
    bild.setze(x, y0 + 1, ton(FASSADE_STAHL, 4));
    bild.setze(x, yU + 1, ton(FASSADE_STAHL, 4));
  }
  // Reif auf dem Obergurt (unregelmäßig) und am Untergurt
  for (let x = 0; x < a.breite; x++) {
    if (rauschen(a.x0 + x, 0, 7, 1, SEED_ZAPFEN) > 0.45) bild.setze(x, y0 - 1, ton(REIF, 1));
    if (rauschen(a.x0 + x, 0, 5, 1, SEED_ZAPFEN + 1) > 0.4) bild.setze(x, y0, ton(REIF, 2));
    bild.setze(x, yU + BRUECKE.gurt, ton(REIF, 1));
  }
  eiszapfen(bild, 0, a.breite, yU + BRUECKE.gurt + 1, 20, SEED_ZAPFEN);
}

/** Laufkatze auf dem Untergurt mit zwei Seilen und Hakenflasche. */
function laufkatze(bild: Leinwand): void {
  const x = KATZE.x;
  const y = BRUECKE.oben + BRUECKE.hoehe - 1;
  kasten(bild, x, y - 5, KATZE.b, 12, FASSADE_STAHL, true);
  bild.rechteck(x + 3, y - 2, KATZE.b - 6, 2, ton(WARN_GELB, 2));
  for (let i = 0; i < KATZE.b - 6; i += 4) bild.rechteck(x + 3 + i, y - 2, 2, 2, ton(KABEL, 1));
  const s1 = x + 7;
  const s2 = x + KATZE.b - 8;
  bild.rechteck(s1, y + 7, 1, KATZE.haken - y - 7, ton(KABEL, 3));
  bild.rechteck(s2, y + 7, 1, KATZE.haken - y - 7, ton(KABEL, 3));
  kasten(bild, s1 - 3, KATZE.haken, s2 - s1 + 7, 9, FASSADE_STAHL, true);
  bild.rechteck(s1 - 1, KATZE.haken + 3, s2 - s1 + 3, 2, ton(WARN_GELB, 2));
  // Haken
  const hx = Math.floor((s1 + s2) / 2);
  bild.rechteck(hx, KATZE.haken + 9, 2, 6, ton(FASSADE_STAHL, 3));
  bild.rechteck(hx + 2, KATZE.haken + 13, 3, 2, ton(FASSADE_STAHL, 2));
  bild.rechteck(hx + 4, KATZE.haken + 10, 2, 4, ton(FASSADE_STAHL, 1));
  bild.rechteck(hx, KATZE.haken + 9, 1, 6, ton(FASSADE_STAHL, 4));
}

/** Kranstütze: Kastenträger von der Brücke bis zur hinteren Plattform, Warnband, Fußplatte. */
function kranstuetze(bild: Leinwand, a: Abschnitt, hinten: number): void {
  const x = STUETZE.x - a.x0;
  const b = STUETZE.b;
  const y0 = BRUECKE.oben + BRUECKE.hoehe;
  const toene: TonIndex[] = [0, 3, 4, 3, 2, 2, 2, 2, 2, 1, 1, 1, 0];
  for (let i = 0; i < b; i++) bild.rechteck(x + i, y0, 1, hinten - y0, ton(FASSADE_STAHL, toene[i] as TonIndex));
  // Knotenbleche an der Brücke
  for (let i = 0; i < 6; i++) {
    bild.rechteck(x - 1 - i, y0 + i, 1, 1, ton(FASSADE_STAHL, 2));
    bild.rechteck(x + b + i, y0 + i, 1, 1, ton(FASSADE_STAHL, 1));
  }
  bild.rechteck(x - 6, y0, 6, 1, ton(FASSADE_STAHL, 1));
  bild.rechteck(x + b, y0, 6, 1, ton(FASSADE_STAHL, 1));
  // Stöße alle 24 Zeilen
  for (let y = y0 + 18; y < hinten - 12; y += 24) {
    bild.rechteck(x, y, b, 1, ton(FASSADE_STAHL, 0));
    bild.rechteck(x + 1, y + 1, b - 2, 1, ton(FASSADE_STAHL, 3));
  }
  // Warnband
  const wy = hinten - 30;
  for (let yy = 0; yy < 8; yy++) {
    for (let i = 1; i < b - 1; i++) {
      const gelb = (i + yy) % WARN.periode < WARN.periode / 2;
      bild.setze(x + i, wy + yy, gelb ? ton(WARN_GELB, i < 4 ? 3 : 2) : ton(KABEL, 1));
    }
  }
  // Fußplatte
  kasten(bild, x - 3, hinten - 4, b + 6, 4, FASSADE_STAHL, false);
  bild.rechteck(x - 3, hinten - 1, b + 6, 1, ton(FASSADE_STAHL, 0));
  // Reif auf der linken Kante
  for (let y = y0; y < hinten - 4; y++) if (rauschen(0, y, 1, 6, SEED_ZAPFEN + 2) > 0.62) bild.setze(x + 1, y, ton(REIF, 1));
}

/** Leuchtfeuer: dünner Mast mit Lampe und Schein. */
function leuchtfeuer(bild: Leinwand, a: Abschnitt, hinten: number): void {
  const x = FEUER.x - a.x0;
  const k = FEUER.kopf;
  bild.rechteck(x, k + 4, 1, hinten - k - 4, ton(FASSADE_STAHL, 3));
  bild.rechteck(x + 1, k + 4, 1, hinten - k - 4, ton(FASSADE_STAHL, 1));
  // Schein (Raster) um die Lampe
  for (let y = k - 7; y <= k + 7; y++) {
    for (let xx = x - 8; xx <= x + 9; xx++) {
      const d = Math.hypot(xx - x - 0.5, y - k - 1);
      if (d < 8 && raster(xx, y, 0.5 * (1 - d / 8))) bild.setze(xx, y, ton(KOMETENSCHWEIF, d < 4 ? 1 : 0));
    }
  }
  kasten(bild, x - 2, k + 1, 6, 4, FASSADE_STAHL, false);
  bild.rechteck(x - 1, k - 1, 4, 2, NEON_CYAN);
  bild.rechteck(x - 1, k - 2, 4, 1, ton(FASSADE_STAHL, 2));
  // Querträger mit Warnmarke
  bild.rechteck(x - 4, hinten - 22, 10, 2, ton(FASSADE_STAHL, 2));
  bild.rechteck(x - 4, hinten - 21, 10, 1, ton(FASSADE_STAHL, 1));
}

/**
 * Hintere Plattform (nicht begehbar) von der Zeile `hinten` bis zum Warnstreifen über der
 * Bandoberkante; in die Plattform eingelassene Landefeuer; Ecke am Übergang zu B.
 */
function hinterePlattform(bild: Leinwand, a: Abschnitt, hinten: number): void {
  for (let c = 0; c < a.breite; c++) {
    const kante = a.kante[c] as number;
    const warnOben = kante - WARN.hoehe;
    for (let y = hinten; y < warnOben; y++) {
      let t: TonIndex = 2;
      if (y === hinten) t = 3;
      else if (y === hinten + 1) t = 2;
      else if (raster(a.x0 + c, y, 0.25 + (0.35 * (warnOben - y)) / (warnOben - hinten))) t = 1;
      if ((a.x0 + c) % PLATTE.breite === 0 && y > hinten) t = 0;
      bild.setze(c, y, ton(EISBETON, t));
    }
    // Warnstreifen (schräg), oben Licht, unten Schatten
    for (let i = 0; i < WARN.hoehe; i++) {
      const y = warnOben + i;
      const gelb = (a.x0 + c + i) % WARN.periode < WARN.periode / 2;
      const t: TonIndex = i === 0 ? 3 : i === WARN.hoehe - 1 ? 1 : 2;
      bild.setze(c, y, gelb ? ton(WARN_GELB, t) : ton(KABEL, i === WARN.hoehe - 1 ? 0 : 1));
    }
  }
  // Landefeuer in der Plattform
  const ly = hinten + 5;
  for (let x = 24 - (a.x0 % 48); x < a.breite - 4; x += 48) {
    bild.rechteck(x - 1, ly - 1, 4, 3, ton(EISBETON, 0));
    bild.rechteck(x, ly, 2, 1, NEON_CYAN);
  }
  // Ecke am Übergang zu B (Band dort 16 px tiefer): dunkle Kante, Licht davor
  const r = a.breite - 1;
  for (let y = hinten; y < (a.kante[r] as number); y++) {
    bild.setze(r, y, ton(EISBETON, 0));
    bild.setze(r - 1, y, ton(EISBETON, 3));
  }
}

/** Frachtcontainer „PERIHEL FRACHT“: Wellblech rostrot, dunkles Schild mit heller Schrift, Reif oben. */
export function frachtcontainer(b: number, h: number): Leinwand {
  const bild = new Leinwand(b, h);
  // Wellblech: Periode 6, Licht auf der linken Flanke jeder Welle
  const welle: TonIndex[] = [3, 3, 2, 2, 1, 0];
  for (let x = 4; x < b - 4; x++) {
    const t = welle[(x - 4) % welle.length] as TonIndex;
    for (let y = 5; y < h - 6; y++) bild.setze(x, y, ton(ROST, t));
  }
  // Rostschlieren und Reif unten
  for (let y = 6; y < h - 6; y++) {
    for (let x = 4; x < b - 4; x++) {
      const p = bild.hole(x, y);
      const t = tonVon(ROST, p);
      if (t === null) continue;
      const s = rauschen(x, y, 3, 22, SEED_CONTAINER);
      if (s > 0.7 && t > 0 && raster(x, y, (s - 0.7) * 3)) bild.setze(x, y, ton(ROST, (t - 1) as TonIndex));
      const f = (y - (h - 20)) / 14;
      if (f > 0 && raster(x, y, f * 0.55 * rauschen(x, y, 6, 4, SEED_CONTAINER + 1))) bild.setze(x, y, ton(REIF, t >= 2 ? 1 : 0));
    }
  }
  // Eckpfosten
  const links: TonIndex[] = [0, 3, 2, 1];
  const rechts: TonIndex[] = [3, 2, 1, 0];
  for (let i = 0; i < 4; i++) {
    bild.rechteck(i, 0, 1, h, ton(ROST, links[i] as TonIndex));
    bild.rechteck(b - 4 + i, 0, 1, h, ton(ROST, rechts[i] as TonIndex));
  }
  // Oberer Rahmen mit Reif, unterer Rahmen
  bild.rechteck(0, 2, b, 1, ton(ROST, 3));
  bild.rechteck(0, 3, b, 1, ton(ROST, 2));
  bild.rechteck(0, 4, b, 1, ton(ROST, 0));
  for (let x = 0; x < b; x++) {
    bild.setze(x, 1, ton(REIF, 2));
    if (rauschen(x, 0, 6, 1, SEED_CONTAINER + 2) > 0.4) bild.setze(x, 0, ton(REIF, x < b / 3 ? 3 : 2));
    else bild.setze(x, 0, ton(ROST, 3));
  }
  bild.rechteck(0, h - 6, b, 1, ton(ROST, 0));
  bild.rechteck(0, h - 5, b, 1, ton(ROST, 3));
  bild.rechteck(0, h - 4, b, 2, ton(ROST, 2));
  bild.rechteck(0, h - 2, b, 1, ton(ROST, 1));
  bild.rechteck(0, h - 1, b, 1, ton(ROST, 0));
  // Eckbeschläge
  for (const [x, y] of [
    [0, 0],
    [b - 5, 0],
    [0, h - 6],
    [b - 5, h - 6],
  ] as const) {
    bild.rechteck(x, y, 5, 6, ton(ROST, 1));
    bild.rechteck(x + 1, y + 2, 3, 2, ton(ROST, 0));
    bild.setze(x, y, ton(ROST, 3));
  }
  // Schild: dunkle Tafel mit hellem Rand, „PERIHEL“ fett
  const text = 'PERIHEL';
  const tb = schildBreite(text, true);
  const sb = tb + 12;
  const sh = 17;
  const sx = Math.floor((b - sb) / 2);
  const sy = 11;
  bild.rechteck(sx, sy, sb, sh, ton(REIF, 1));
  bild.rechteck(sx + 1, sy + 1, sb - 2, sh - 2, ton(NACHTHIMMEL, 2));
  bild.rechteck(sx + 1, sy + sh - 2, sb - 2, 1, ton(NACHTHIMMEL, 1));
  bild.rechteck(sx + sb, sy + 1, 1, sh, ton(ROST, 0));
  bild.rechteck(sx + 1, sy + sh, sb, 1, ton(ROST, 0));
  schild(bild, text, sx + 6 + 1, sy + 5 + 1, ton(NACHTHIMMEL, 1), true);
  schild(bild, text, sx + 6, sy + 5, ton(REIF, 3), true);
  // „FRACHT“ darunter, eingeprägt (helle Kante, dunkler Schatten)
  const f = 'FRACHT';
  const fx = Math.floor((b - schildBreite(f)) / 2);
  const fy = sy + sh + 7;
  // glattes Feld hinter der Schrift, damit sie vor dem Wellblech lesbar bleibt
  bild.rechteck(fx - 3, fy - 3, schildBreite(f) + 6, 13, ton(ROST, 2));
  bild.rechteck(fx - 3, fy - 3, schildBreite(f) + 6, 1, ton(ROST, 3));
  bild.rechteck(fx - 3, fy - 3, 1, 13, ton(ROST, 3));
  bild.rechteck(fx - 3, fy + 9, schildBreite(f) + 6, 1, ton(ROST, 0));
  bild.rechteck(fx + schildBreite(f) + 2, fy - 3, 1, 13, ton(ROST, 0));
  schild(bild, f, fx + 1, fy + 1, ton(ROST, 0));
  schild(bild, f, fx, fy, ton(ROST, 4));
  return bild;
}

/** Wand des Landedecks: Kranbrücke, Laufkatze, Stütze, Leuchtfeuer, hintere Plattform mit Warnstreifen. */
function wand(a: Abschnitt): Leinwand {
  const bild = new Leinwand(a.breite, BILD_HOEHE);
  const hinten = hintenZeile();
  kranbruecke(bild, a);
  kranstuetze(bild, a, hinten);
  laufkatze(bild);
  leuchtfeuer(bild, a, hinten);
  hinterePlattform(bild, a, hinten);
  return bild;
}

/** Boden: Eisbetonplatten 64 × 16 mit halbem Versatz, Reif, aufgemalte Pfeile in Laufrichtung. */
function boden(a: Abschnitt): Leinwand {
  const bild = new Leinwand(a.breite, BILD_HOEHE);
  plattenBoden(bild, a, {
    m: EISBETON,
    breite: PLATTE.breite,
    versatz: PLATTE.versatz,
    flaeche: (x, y, l) => {
      // leichte Wolken im Beton, Plattenunterseite etwas dunkler
      const n = rauschen(a.x0 + x, y, 11, 5, SEED_BODEN + l.nr);
      if (n > 0.66 && raster(a.x0 + x, y, 0.5)) return 1;
      if (l.dy >= l.ph - 3 && raster(a.x0 + x, y, 0.25)) return 1;
      return null;
    },
  });
  // Pfeile (Rollweg) in heller Farbe, abgetreten; die Fugen bleiben sichtbar
  const py = Math.round(((a.kante[0] as number) + (a.unten[0] as number)) / 2) + 2;
  for (let i = 0; i < PFEILE.anzahl; i++) {
    const px = PFEILE.x + i * PFEILE.abstand - a.x0;
    for (let dy = -PFEILE.halb; dy <= PFEILE.halb; dy++) {
      const off = PFEILE.halb - Math.abs(dy);
      for (let s = 0; s < PFEILE.strich; s++) {
        const x = px + off + s;
        const y = py + dy;
        const t = tonVon(EISBETON, bild.hole(x, y));
        if (t === null || t === 0) continue;
        if (rauschen(a.x0 + x, y, 5, 3, SEED_BODEN + 9) > 0.7) continue;
        bild.setze(x, y, ton(EISBETON, s === 0 || dy === -PFEILE.halb ? 4 : t >= 3 ? 4 : 3));
      }
    }
  }
  // Reif: kleine Flecken (Rauschen), dichter an den Fugen und Plattenkanten, einzelne Glitzerpunkte
  for (let c = 0; c < a.breite; c++) {
    for (let y = (a.kante[c] as number) + 1; y < (a.unten[c] as number) - 2; y++) {
      const t = tonVon(EISBETON, bild.hole(c, y));
      if (t === null) continue;
      let f = rauschen2(a.x0 + c, y, 20, 7, SEED_REIF);
      if (t === 0 || t === 3) f += 0.07;
      if (f > 0.8 && raster(a.x0 + c, y, (f - 0.8) * 4)) bild.setze(c, y, ton(REIF, 1));
      else if (f > 0.68 && raster(a.x0 + c, y, (f - 0.68) * 3)) bild.setze(c, y, ton(REIF, 0));
      if (f > 0.74 && zufallsWert(a.x0 + c, y, SEED_REIF + 1) < 0.015) bild.setze(c, y, ton(REIF, 3));
    }
  }
  return bild;
}

/** Alle Ebenen des Landedecks. */
export function landedeck(): AbschnittGrafik {
  const a = abschnitt('A');
  const container = hintergrundSatz('frachtcontainer');
  const hinten = hintenZeile();
  const cHoehe = 75;
  const karten: KartenQuelle[] = [
    { ebene: 'himmel', name: 'himmel', parallax: PARALLAX_HIMMEL, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: himmel(a) },
    { ebene: 'wand', name: 'landedeck', parallax: 1, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: wand(a) },
    { ebene: 'boden', name: 'eisbeton', parallax: 1, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: boden(a) },
  ];
  const bilder: FreiesBild[] = [
    {
      name: container.bild,
      ebene: 'wand',
      folge: 1,
      parallax: 1,
      deckkraft: 1,
      x: container.x0,
      zeile: hinten - cHoehe,
      bilder: [frachtcontainer(container.x1 - container.x0, cHoehe)],
      dauer: 0,
    },
  ];
  for (const id of ['kabelrollen1', 'kabelrollen2']) {
    const v = vordergrundSatz(id);
    bilder.push({
      name: v.id,
      ebene: 'vordergrund',
      folge: 1,
      parallax: 1,
      deckkraft: DECKKRAFT_VORDERGRUND,
      x: v.x0,
      zeile: BILD_HOEHE - v.zeilen,
      bilder: [kabelrollen(v.x1 - v.x0, v.zeilen)],
      dauer: 0,
    });
  }
  return { abschnitt: a, karten, bilder };
}
