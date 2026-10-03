// Abschnitt F, Asservatenkammer (Welt-x 1700 bis 2304, Band 91 px, Ky 0; Auftrag 4, 4):
// innen, die Bossarena. Dunkle Decke mit Träger und Lüftungsrohr, Wand aus Stahlpaneelen,
// zwei Regale mit beschlagnahmten Kisten, Koffern und Fässchen, ein Gitterkäfig mit
// gestapelten Asservaten und Schild „ASSERVATE“, am rechten Ende (Arenawand) eine
// runde Panzertür im Rahmen mit Warnstreifen. Kaltes Deckenlicht fällt als Lichtkegel
// (Raster: jeder getroffene Pixel eine Stufe heller) über Wand und Boden; der Boden ist
// dunkler Stahl (Tränenblech), damit Vela und Ballast sich abheben. Die drei Asservaten-
// kisten bei x 2040, 2080, 2120 zeichnet G4 als Behälter; der Käfig steht dahinter.
// Gestaltungszahlen sind Festlegungen G5, Lagen aus scheibe.txt (lage.ts).

import { Leinwand } from '../leinwand.ts';
import type { Material, TonIndex } from '../palette.ts';
import { ASSERVAT_HOLZ, KAMMER_STAHL, LICHT_KALT, NEON_CYAN, REGAL, ROST, WARN_GELB } from '../palette.ts';
import type { AbschnittGrafik, KartenQuelle } from './blatt_hg.ts';
import { plattenBoden } from './boden.ts';
import type { Abschnitt } from './lage.ts';
import { ANZEIGE_ZEILEN, BILD_HOEHE, abschnitt, hintergrundSatz } from './lage.ts';
import { aufhellen, kasten, niete, rauschen, raster, rohrSenkrecht, rohrWaagrecht, schild, schildBreite, ton, tonTabelle, zufallsWert } from './werkzeug.ts';

/** Seeds (fest). */
const SEED_WAND = 7101;
const SEED_REGAL = 7102;
const SEED_KAEFIG = 7103;
const SEED_BODEN = 7104;

/** Decke bis unter die Anzeigeleiste, Deckenkante, Paneelraster der Wand (Gestaltung G5). */
const DECKE = ANZEIGE_ZEILEN + 2;
const WAND = { panel: 48, naht: 72 } as const;
/** Deckenlampen (Welt-x) und Zeile der Leuchte (Gestaltung G5: drei im Bild der Arena, eine links davor). */
const LAMPEN = [1730, 1862, 1994, 2142] as const;
const LAMPE_ZEILE = DECKE;
/** Regale: Welt-x der Pfosten je Regal, Zeilen der Böden, Oberkante. */
const REGALE = [
  [1706, 1790, 1874],
  [1926, 2040],
] as const;
const REGAL_OBEN = 40;
const REGAL_BOEDEN = [60, 85, 110] as const;
/** Gitterkäfig: Welt-x, Oberkante, Stababstand, Tür (Welt-x). */
const KAEFIG = { x0: 2052, x1: 2196, oben: 38, stab: 5, tuer: [2110, 2140] as const } as const;
/** Panzertür: Rahmen (Welt-x), Oberkante, Radius der Tür; Arenawand am rechten Ende. */
const TUER = { x0: 2204, x1: 2294, oben: 32, r: 33 } as const;
/** Tränenblech 48 × 16 ohne Versatz (versetzte Platten lesen sich wie Mauerwerk). */
const PLATTE = { breite: 48, versatz: 0 } as const;

/** Materialien der Kammer (für das Aufhellen im Lichtkegel). */
const MATERIALIEN: readonly Material[] = [KAMMER_STAHL, REGAL, ASSERVAT_HOLZ, ROST, WARN_GELB, LICHT_KALT];

/** Zeile des Sockels. */
function sockel(a: Abschnitt): number {
  return a.kanteMin - 7;
}

/** Decke, Träger, Lüftungsrohr, Wandpaneele, Sockel. */
function grundwand(bild: Leinwand, a: Abschnitt): void {
  const s = sockel(a);
  for (let y = 0; y < a.kanteMin; y++) {
    for (let c = 0; c < a.breite; c++) {
      const wx = a.x0 + c;
      let t: TonIndex;
      if (y < DECKE) t = y % 6 === 5 ? 1 : 0;
      else if (y >= s) t = y === s ? 3 : y === a.kanteMin - 1 ? 0 : 1;
      else {
        t = 2;
        if (rauschen(wx, y, 19, 13, SEED_WAND + 1) > 0.68 && raster(wx, y, 0.45)) t = 1;
        if ((wx - a.x0) % WAND.panel === 0) t = 0;
        else if ((wx - a.x0) % WAND.panel === 1) t = 3;
        if (y === WAND.naht) t = 0;
        else if (y === WAND.naht + 1) t = 3;
      }
      bild.setze(c, y, ton(KAMMER_STAHL, t));
    }
  }
  // Deckenkante und Träger
  bild.rechteck(0, DECKE, a.breite, 1, ton(REGAL, 3));
  bild.rechteck(0, DECKE + 1, a.breite, 2, ton(REGAL, 1));
  bild.rechteck(0, DECKE + 3, a.breite, 1, ton(KAMMER_STAHL, 0));
  for (let c = 40 - ((a.x0 + 40) % 80); c < a.breite; c += 80) {
    kasten(bild, c, 0, 12, DECKE + 1, KAMMER_STAHL, true);
  }
  rohrWaagrecht(bild, 0, a.breite, DECKE - 9, 6, KAMMER_STAHL, true);
  // Nieten an den Nähten
  for (let c = WAND.panel; c < a.breite; c += WAND.panel) {
    for (let y = DECKE + 8; y < s - 4; y += 11) niete(bild, c + 3, y, KAMMER_STAHL);
  }
}

/** Ein Asservat auf einem Regalboden: Holzkiste mit Siegelband, Metallkoffer oder Fässchen. */
function asservat(bild: Leinwand, x: number, unten: number, b: number, h: number, art: number, seed: number): void {
  const y = unten - h;
  if (art < 0.55) {
    kasten(bild, x, y, b, h, ASSERVAT_HOLZ, true);
    for (let xx = x + 4; xx < x + b - 2; xx += 4) bild.rechteck(xx, y + 2, 1, h - 3, ton(ASSERVAT_HOLZ, 1));
    // Siegelband
    const sx = x + Math.floor(b * (0.3 + 0.4 * zufallsWert(x, y, seed)));
    bild.rechteck(sx, y + 1, 2, h - 2, ton(ROST, 2));
    bild.rechteck(sx, y + 1, 1, h - 2, ton(ROST, 3));
    if (b > 10) bild.rechteck(x + 2, y + 2, 4, 3, ton(REGAL, 4));
  } else if (art < 0.85) {
    kasten(bild, x, y, b, h, REGAL, true);
    bild.rechteck(x + 1, y + Math.floor(h / 2), b - 2, 1, ton(REGAL, 0));
    bild.rechteck(x + Math.floor(b / 2) - 1, y + Math.floor(h / 2) - 1, 3, 2, ton(WARN_GELB, 2));
  } else {
    // Fässchen: senkrecht schattiert, zwei Reifen
    const toene: TonIndex[] = [0, 3, 3, 2, 2, 2, 1, 1, 0];
    for (let i = 0; i < b; i++) bild.rechteck(x + i, y, 1, h, ton(KAMMER_STAHL, toene[Math.min(toene.length - 1, Math.floor((i * toene.length) / b))] as TonIndex));
    bild.rechteck(x, y + 2, b, 1, ton(REGAL, 3));
    bild.rechteck(x, y + h - 3, b, 1, ton(REGAL, 3));
    bild.rechteck(x, y, b, 1, ton(KAMMER_STAHL, 4));
  }
}

/** Regal mit Pfosten und drei Böden voller Asservate. */
function regal(bild: Leinwand, a: Abschnitt, pfosten: readonly number[], seed: number): void {
  const unten = a.kanteMin - 2;
  const x0 = (pfosten[0] as number) - a.x0;
  const x1 = (pfosten[pfosten.length - 1] as number) - a.x0 + 4;
  // Tiefe des Regals: dunkler Grund
  for (let y = REGAL_OBEN; y < unten; y++) {
    for (let x = x0; x < x1; x++) bild.setze(x, y, ton(KAMMER_STAHL, raster(a.x0 + x, y, 0.3) ? 0 : 1));
  }
  const boeden = [...REGAL_BOEDEN, unten - 1];
  boeden.forEach((by, bi) => {
    for (let fach = 0; fach < pfosten.length - 1; fach++) {
      let xx = (pfosten[fach] as number) - a.x0 + 5;
      const ende = (pfosten[fach + 1] as number) - a.x0 - 1;
      let n = 0;
      const platz = bi === 0 ? by - REGAL_OBEN - 2 : by - (boeden[bi - 1] as number) - 4;
      while (xx < ende - 6) {
        const w = zufallsWert(xx, by, seed + n);
        const art = zufallsWert(xx, by, seed + n + 31);
        const b = art >= 0.85 ? 8 + Math.floor(w * 3) : 10 + Math.floor(w * 14);
        const h = Math.min(platz, 9 + Math.floor(zufallsWert(xx, by, seed + n + 57) * 10));
        if (xx + b > ende) break;
        asservat(bild, xx, by, b, h, art, seed + n);
        // manchmal eine kleine Kiste obenauf
        if (art < 0.55 && b > 14 && h + 8 < platz && zufallsWert(xx, by, seed + n + 77) < 0.45) asservat(bild, xx + 3, by - h, b - 7, 7, 0.1, seed + n + 5);
        xx += b + 1 + Math.floor(zufallsWert(xx, by, seed + n + 91) * 4);
        n++;
      }
    }
    bild.rechteck(x0, by, x1 - x0, 1, ton(REGAL, 3));
    bild.rechteck(x0, by + 1, x1 - x0, 1, ton(REGAL, 1));
  });
  for (const p of pfosten) {
    const px = p - a.x0;
    bild.rechteck(px, REGAL_OBEN - 2, 1, unten - REGAL_OBEN + 2, ton(REGAL, 3));
    bild.rechteck(px + 1, REGAL_OBEN - 2, 2, unten - REGAL_OBEN + 2, ton(REGAL, 2));
    bild.rechteck(px + 3, REGAL_OBEN - 2, 1, unten - REGAL_OBEN + 2, ton(REGAL, 0));
    for (let y = REGAL_OBEN; y < unten; y += 6) bild.setze(px + 2, y, ton(REGAL, 0));
  }
}

/** Gitterkäfig mit gestapelten Asservaten, Tür mit Vorhängeschloss und Schild. */
function kaefig(bild: Leinwand, a: Abschnitt): void {
  const k = KAEFIG;
  const x0 = k.x0 - a.x0;
  const x1 = k.x1 - a.x0;
  const unten = a.kanteMin - 1;
  // Innen: dunkel, Stapel aus Kisten (abgedunkelt)
  for (let y = k.oben; y < unten; y++) for (let x = x0; x < x1; x++) bild.setze(x, y, ton(KAMMER_STAHL, raster(a.x0 + x, y, 0.5) ? 0 : 1));
  let xx = x0 + 3;
  let n = 0;
  while (xx < x1 - 12) {
    const b = 14 + Math.floor(zufallsWert(xx, 0, SEED_KAEFIG + n) * 16);
    const stapel = 1 + Math.floor(zufallsWert(xx, 1, SEED_KAEFIG + n) * 3);
    let y = unten;
    for (let s = 0; s < stapel; s++) {
      const h = 12 + Math.floor(zufallsWert(xx, s + 2, SEED_KAEFIG + n) * 8);
      if (y - h < k.oben + 14) break;
      bild.rechteck(xx, y - h, b, h, ton(ASSERVAT_HOLZ, 0));
      bild.rechteck(xx + 1, y - h + 1, b - 2, h - 2, ton(ASSERVAT_HOLZ, 1));
      bild.rechteck(xx + 1, y - h + 1, b - 2, 1, ton(ASSERVAT_HOLZ, 2));
      bild.rechteck(xx + Math.floor(b / 2), y - h + 1, 2, h - 2, ton(ROST, 1));
      y -= h;
    }
    xx += b + 2;
    n++;
  }
  // Stäbe (Licht links) und Querbänder
  for (let x = x0; x < x1; x += k.stab) {
    bild.rechteck(x, k.oben, 1, unten - k.oben, ton(REGAL, 3));
    bild.rechteck(x + 1, k.oben, 1, unten - k.oben, ton(REGAL, 1));
  }
  for (const by of [k.oben, k.oben + 40, unten - 3]) {
    bild.rechteck(x0 - 2, by, x1 - x0 + 4, 1, ton(REGAL, 3));
    bild.rechteck(x0 - 2, by + 1, x1 - x0 + 4, 2, ton(REGAL, 2));
    bild.rechteck(x0 - 2, by + 3, x1 - x0 + 4, 1, ton(REGAL, 0));
  }
  // Pfosten an den Enden
  for (const px of [x0 - 3, x1 - 1]) kasten(bild, px, k.oben - 2, 4, unten - k.oben + 2, REGAL, false);
  // Tür: kräftiger Rahmen, Schloss
  const t0 = k.tuer[0] - a.x0;
  const t1 = k.tuer[1] - a.x0;
  for (const px of [t0, t1 - 3]) kasten(bild, px, k.oben + 4, 3, unten - k.oben - 4, REGAL, false);
  bild.rechteck(t1 - 8, k.oben + 52, 5, 2, ton(REGAL, 4));
  kasten(bild, t1 - 9, k.oben + 54, 7, 6, WARN_GELB, true);
  bild.rechteck(t1 - 7, k.oben + 56, 2, 2, ton(KAMMER_STAHL, 0));
  // Schild „ASSERVATE“
  const text = 'ASSERVATE';
  const sb = schildBreite(text) + 8;
  const sx = Math.floor((x0 + x1 - sb) / 2);
  const sy = k.oben + 12;
  kasten(bild, sx, sy, sb, 13, REGAL, true);
  bild.rechteck(sx + 2, sy + 2, sb - 4, 9, ton(LICHT_KALT, 0));
  schild(bild, text, sx + 4, sy + 3, ton(KAMMER_STAHL, 0));
}

/** Panzertür am rechten Ende: Rahmen mit Warnstreifen, runde Tür mit Bolzen und Handrad, Arenawand. */
function panzertuer(bild: Leinwand, a: Abschnitt): void {
  const t = TUER;
  const x0 = t.x0 - a.x0;
  const x1 = t.x1 - a.x0;
  const unten = a.kanteMin;
  // Rahmen
  kasten(bild, x0, t.oben, x1 - x0, unten - t.oben, REGAL, true);
  // Warnstreifen um die Öffnung
  const o0 = x0 + 5;
  const o1 = x1 - 5;
  const oy0 = t.oben + 5;
  for (let y = oy0; y < unten; y++) {
    for (let x = o0; x < o1; x++) {
      const rand = x < o0 + 4 || x >= o1 - 4 || y < oy0 + 4;
      if (!rand) continue;
      const gelb = (x + y) % 8 < 4;
      bild.setze(x, y, gelb ? ton(WARN_GELB, x < o0 + 1 || y < oy0 + 1 ? 3 : 2) : ton(KAMMER_STAHL, 0));
    }
  }
  // Öffnung dunkel
  bild.rechteck(o0 + 4, oy0 + 4, o1 - o0 - 8, unten - oy0 - 4, ton(KAMMER_STAHL, 0));
  // Runde Tür: Kranz (Licht links oben), Fläche, Ring, Bolzen, Handrad
  const cx = (o0 + o1) / 2;
  const cy = oy0 + 4 + t.r + 2;
  for (let y = Math.floor(cy - t.r - 1); y <= Math.ceil(cy + t.r + 1); y++) {
    for (let x = Math.floor(cx - t.r - 1); x <= Math.ceil(cx + t.r + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > t.r) continue;
      const licht = (-dx - dy) / (d || 1);
      let tt: TonIndex = 2;
      if (d > t.r - 4) tt = licht > 0.35 ? 4 : licht > -0.35 ? 3 : 1;
      else if (d > t.r - 5) tt = 0;
      else if (Math.abs(d - (t.r - 14)) < 0.8) tt = licht > 0 ? 1 : 3;
      else if (raster(x, y, 0.12 * (1 - licht))) tt = 1;
      bild.setze(x, y, ton(REGAL, tt));
    }
  }
  for (let i = 0; i < 12; i++) {
    const w = (i / 12) * Math.PI * 2;
    niete(bild, Math.round(cx + Math.cos(w) * (t.r - 8)) - 1, Math.round(cy + Math.sin(w) * (t.r - 8)) - 1, REGAL);
  }
  for (let i = 0; i < 3; i++) {
    const w = (i / 3) * Math.PI + 0.3;
    const dx = Math.cos(w) * 11;
    const dy = Math.sin(w) * 11;
    bild.linie(Math.round(cx - dx), Math.round(cy - dy), Math.round(cx + dx), Math.round(cy + dy), ton(REGAL, 3));
    bild.linie(Math.round(cx - dx) + 1, Math.round(cy - dy) + 1, Math.round(cx + dx) + 1, Math.round(cy + dy) + 1, ton(REGAL, 0));
  }
  kasten(bild, Math.round(cx) - 3, Math.round(cy) - 3, 6, 6, REGAL, true);
  // Scharniere links, Anzeige rechts
  for (const hy of [cy - 18, cy + 12]) kasten(bild, o0 + 2, Math.round(hy), 7, 8, REGAL, true);
  kasten(bild, x1 - 4, t.oben + 30, 4, 8, KAMMER_STAHL, true);
  bild.rechteck(x1 - 3, t.oben + 32, 2, 2, NEON_CYAN);
  // Arenawand am rechten Ende: dunkler Pfeiler
  for (let x = x1; x < a.breite; x++) {
    const tt: TonIndex = x === x1 ? 3 : x === a.breite - 1 ? 0 : 1;
    bild.rechteck(x, DECKE, 1, unten - DECKE, ton(KAMMER_STAHL, tt));
  }
}

/** Deckenleuchte: Schirm, kalte Röhre. */
function leuchte(bild: Leinwand, a: Abschnitt, wx: number): void {
  const x = wx - a.x0;
  const y = LAMPE_ZEILE;
  bild.rechteck(x, 0, 1, y, ton(REGAL, 1));
  bild.rechteck(x + 1, 0, 1, y, ton(REGAL, 0));
  for (let i = 0; i < 5; i++) {
    bild.rechteck(x - 3 - i, y + i, 8 + 2 * i, 1, ton(REGAL, i === 0 ? 3 : i < 3 ? 2 : 1));
    bild.setze(x - 3 - i, y + i, ton(REGAL, 3));
    bild.setze(x + 4 + i, y + i, ton(REGAL, 0));
  }
  bild.rechteck(x - 7, y + 5, 16, 1, ton(LICHT_KALT, 3));
  bild.rechteck(x - 6, y + 6, 14, 1, ton(LICHT_KALT, 1));
}

/**
 * Kegel einer Deckenleuchte: Deckung im Raster, innen fast gleich (scharfe Kante, damit der
 * Kegel als Form lesbar ist), nach unten schwächer.
 */
function kegel(wx: number, y0: number, staerke: number): (x: number, y: number) => number {
  return (x, y) => {
    if (y < y0) return 0;
    const w = 7 + (y - y0) * 0.4;
    const q = Math.abs(x + 0.5 - wx) / w;
    if (q >= 1) return 0;
    return staerke * (1 - (0.55 * (y - y0)) / 110) * (q > 0.85 ? 0.6 : 1);
  };
}

/** Wand der Asservatenkammer (überall deckend). */
function wand(a: Abschnitt): Leinwand {
  const bild = new Leinwand(a.breite, BILD_HOEHE);
  grundwand(bild, a);
  REGALE.forEach((p, i) => regal(bild, a, p, SEED_REGAL + 100 * i));
  kaefig(bild, a);
  panzertuer(bild, a);
  rohrSenkrecht(bild, 1912 - a.x0, DECKE + 4, sockel(a), 5, KAMMER_STAHL, true);
  const tab = tonTabelle(MATERIALIEN);
  const y0 = LAMPE_ZEILE + 7;
  for (const l of LAMPEN) {
    const k1 = kegel(l - a.x0, y0, 0.55);
    const k2 = kegel(l - a.x0, y0, 0.5);
    aufhellen(bild, tab, (x, y) => (y < a.kanteMin ? k1(x, y) : 0), 3, a.x0, 0);
    // zweite Stufe nahe der Leuchte
    aufhellen(bild, tab, (x, y) => (y >= y0 && y < a.kanteMin ? k2(x, y) - 0.6 * ((y - y0) / 40) : 0), 4, a.x0 + 1, 2);
    // Lichtstaub: dünnes Punktraster in kaltem Licht, nach unten schwächer
    const k3 = kegel(l - a.x0, y0, 0.085);
    for (let y = y0; y < a.kanteMin; y++) {
      for (let x = 0; x < a.breite; x++) if (raster(a.x0 + x + 2, y + 1, k3(x, y))) bild.setze(x, y, ton(LICHT_KALT, 0));
    }
  }
  for (const l of LAMPEN) leuchte(bild, a, l);
  return bild;
}

/** Boden: dunkles Tränenblech, Lichtflecken unter den Leuchten. */
function boden(a: Abschnitt): Leinwand {
  const bild = new Leinwand(a.breite, BILD_HOEHE);
  plattenBoden(bild, a, {
    m: KAMMER_STAHL,
    breite: PLATTE.breite,
    versatz: PLATTE.versatz,
    flaeche: (x, y, l) => {
      // Tränenblech: kurze schräge Rippen im Raster 6 × 4, Zellen abwechselnd gespiegelt
      if (l.dx < 1 || l.dy < 1 || l.dx >= l.pb - 1 || l.dy >= l.ph - 1) return null;
      const zx = Math.floor(l.dx / 6);
      const zy = Math.floor(l.dy / 4);
      const ix = l.dx % 6;
      const iy = l.dy % 4;
      const gespiegelt = (zx + zy) % 2 === 1;
      const rippe = gespiegelt ? ix - 1 === 2 - iy : ix - 1 === iy;
      if (rippe && iy < 3 && ix >= 1 && ix <= 3) return 3;
      if (rauschen(a.x0 + x, y, 13, 7, SEED_BODEN) > 0.72 && raster(a.x0 + x, y, 0.35)) return 1;
      return null;
    },
  });
  // Fugen (Ton 0) bleiben auch im Licht dunkel, damit die Tiefe lesbar bleibt
  const tab = tonTabelle([KAMMER_STAHL]);
  tab.delete(ton(KAMMER_STAHL, 0));
  const k = a.kanteMin;
  for (const l of LAMPEN) {
    const cx = l - a.x0;
    const cy = k + 14;
    const fleck = (x: number, y: number): number => {
      const q = ((x + 0.5 - cx) / 44) ** 2 + ((y + 0.5 - cy) / 13) ** 2;
      return q < 1 ? 0.8 * (1 - q) : 0;
    };
    aufhellen(bild, tab, (x, y) => (y > k ? fleck(x, y) : 0), 3, a.x0, 0);
    aufhellen(bild, tab, (x, y) => (y > k ? fleck(x, y) - 0.35 : 0), 4, a.x0 + 2, 1);
  }
  return bild;
}

/** Alle Ebenen der Asservatenkammer; die Wandkarte deckt den ganzen Satz hintergrund asservatenkammer ab. */
export function asservatenkammer(): AbschnittGrafik {
  const a = abschnitt('F');
  const satz = hintergrundSatz('asservatenkammer');
  if (satz.x0 !== a.x0 || satz.x1 !== a.x1) throw new Error(`Asservatenkammer: Satz ${satz.x0}–${satz.x1} passt nicht zum Band ${a.x0}–${a.x1}`);
  const karten: KartenQuelle[] = [
    { ebene: 'wand', name: satz.bild, parallax: 1, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: wand(a) },
    { ebene: 'boden', name: 'traenenblech', parallax: 1, deckkraft: 1, x: a.x0, zeile0: 0, leinwand: boden(a) },
  ];
  return { abschnitt: a, karten, bilder: [] };
}
