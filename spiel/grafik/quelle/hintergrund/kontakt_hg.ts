// Kontaktbögen der Hintergründe (Auftrag 4, Phase 2, G5): je Abschnitt ein Panoramabild aus
// Blatt und Atlas zusammengesetzt (alle Ebenen, 1×; daneben dasselbe mit Bandkanten,
// Behältern und Figuren im Stand als Maßstab; darunter 2×) und eine Kachelübersicht (alle
// Kacheln und freien Bilder des Blatts, 2×); dazu die Blende in drei Stufen. Die Figuren
// kommen aus den gebauten Blättern in spiel/grafik/ausgabe/ (fehlt eines, fehlt die Figur).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Leinwand } from '../leinwand.ts';
import { deckend } from '../leinwand.ts';
import { mischen } from '../farbe.ts';
import { textBreite, textZeichnen } from '../kontakt.ts';
import { KONTAKT_AKTIV, KONTAKT_ANKER, KONTAKT_GRUND, KONTAKT_TEXT, KONTAKT_ZELLE, SCHATTEN_BLAU } from '../palette.ts';
import { pngDateiLesen } from '../png.ts';
import { BEHAELTER_HALB_X, BEHAELTER_HOEHE } from '../../../src/kern/werte.ts';
import type { GegnerTyp } from '../../../src/kern/entitaeten.ts';
import { UMRISS_FIGUR, UMRISS_GEGNER, SCHATTEN_HOEHE } from '../../../src/darstellung/masse.ts';
import type { GepacktesHintergrundBlatt } from './blatt_hg.ts';
import { zusammensetzen } from './blatt_hg.ts';
import { blendeAnwenden, blendenKante } from './blende.ts';
import type { Abschnitt } from './lage.ts';
import { BILD_BREITE, BILD_HOEHE, KACHEL, scheibe, weltY } from './lage.ts';

/** Ordner der gebauten Blätter (für die Figuren als Maßstab). */
const AUSGABE = fileURLToPath(new URL('../../ausgabe/', import.meta.url));

/** Rand und Abstände der Bögen in px (1×, wie kontakt.ts). */
const RAND = 4;
const LUECKE = 6;
const ZEILE = 8;
/** Deckkraft des Schattens wie heute in der Darstellung (FARBE.schatten, Schwarz 0,45). */
const SCHATTEN_DECKKRAFT = 0.45;

/** Bild „stand“ einer Figur aus ihrem Blatt, oder null. */
function standBild(name: string): { l: Leinwand; ax: number; ay: number } | null {
  const png = join(AUSGABE, `${name}.png`);
  const json = join(AUSGABE, `${name}.json`);
  if (!existsSync(png) || !existsSync(json)) return null;
  try {
    const atlas = JSON.parse(readFileSync(json, 'utf8')) as { animationen?: Record<string, { bilder: { x: number; y: number; b: number; h: number; ankerX: number; ankerY: number }[] }> };
    const anim = atlas.animationen?.['stand'] ?? atlas.animationen?.['haltung'];
    const b = anim?.bilder[0];
    if (b === undefined) return null;
    return { l: pngDateiLesen(png).ausschnitt(b.x, b.y, b.b, b.h), ax: b.ankerX, ay: b.ankerY };
  } catch {
    return null;
  }
}

/** Blattname eines Gegnertyps (Auftrag 4, 2.2). */
function blattName(typ: GegnerTyp): string {
  return typ === 'Zünder' ? 'zuender' : typ.toLowerCase();
}

/** Schatten (Ellipse) und Figur mit Anker auf (x, y) in das Bild, Blick links wahlweise gespiegelt. */
function figurSetzen(ziel: Leinwand, f: { l: Leinwand; ax: number; ay: number }, x: number, y: number, schatten: number, links: boolean): void {
  const rx = schatten / 2;
  const ry = SCHATTEN_HOEHE / 2;
  for (let yy = Math.floor(y - ry); yy <= y + ry; yy++) {
    for (let xx = Math.floor(x - rx); xx <= x + rx; xx++) {
      const ex = (xx + 0.5 - x) / rx;
      const ey = (yy + 0.5 - y) / ry;
      if (ex * ex + ey * ey > 1 || !ziel.drin(xx, yy)) continue;
      const p = ziel.hole(xx, yy);
      if (deckend(p)) ziel.setze(xx, yy, mischen(p, SCHATTEN_BLAU, SCHATTEN_DECKKRAFT));
    }
  }
  const l = links ? f.l.gespiegelt() : f.l;
  const ax = links ? f.l.breite - 1 - f.ax : f.ax;
  ziel.einsetzen(l, x - ax, y - f.ay);
}

/** Panorama eines Abschnitts aus allen Blättern (Kamera-x = erste sichtbare Kamera des Abschnitts; der Himmel steht dort). */
export function panorama(blaetter: readonly GepacktesHintergrundBlatt[], a: Abschnitt, mitVordergrund: boolean = true): Leinwand {
  const p = new Leinwand(a.breite, BILD_HOEHE);
  const ebenen = mitVordergrund ? (['himmel', 'wand', 'boden', 'vordergrund'] as const) : (['himmel', 'wand', 'boden'] as const);
  zusammensetzen(blaetter, p, a.kamera[0], a.ky, a.x0, ebenen);
  return p;
}

/** Panorama mit Bandkanten, Behältern und Figuren (Vela an drei Tiefen, Gegner der Stage an ihrem Ort), Vordergrund darüber. */
function panoramaMitFiguren(blaetter: readonly GepacktesHintergrundBlatt[], a: Abschnitt): Leinwand {
  const p = panorama(blaetter, a, false);
  const stage = scheibe();
  const zeile = (z: number): number => weltY(z) + a.ky;
  // Behälter als Umriss (Grundfläche wie in der Logik: x ± 12, Höhe 32)
  for (const b of stage.behaelter) {
    if (b.x < a.x0 || b.x >= a.x1) continue;
    const x = b.x - a.x0 - BEHAELTER_HALB_X;
    const y = zeile(b.z) - BEHAELTER_HOEHE;
    for (let i = 0; i < BEHAELTER_HALB_X * 2; i++) {
      p.setze(x + i, y, KONTAKT_AKTIV);
      p.setze(x + i, y + BEHAELTER_HOEHE - 1, KONTAKT_AKTIV);
    }
    for (let j = 0; j < BEHAELTER_HOEHE; j++) {
      p.setze(x, y + j, KONTAKT_AKTIV);
      p.setze(x + BEHAELTER_HALB_X * 2 - 1, y + j, KONTAKT_AKTIV);
    }
  }
  // Figuren nach Tiefe (hinten zuerst)
  const stuecke: { z: number; male: () => void }[] = [];
  const vela = standBild('vela');
  if (vela !== null) {
    const lagen: [number, number][] = [
      [a.x0 + 40, a.zOben],
      [a.x0 + Math.round(a.breite * 0.42), Math.round((a.zOben + a.zUnten) / 2)],
      [a.x0 + a.breite - 70, a.zUnten + 4],
    ];
    for (const [x, z] of lagen) stuecke.push({ z, male: () => figurSetzen(p, vela, x - a.x0, zeile(z), UMRISS_FIGUR.schatten, false) });
  }
  for (const g of stage.gegner) {
    if (g.x < a.x0 || g.x >= a.x1) continue;
    const f = standBild(blattName(g.typ));
    if (f === null) continue;
    stuecke.push({ z: g.z, male: () => figurSetzen(p, f, g.x - a.x0, zeile(g.z), UMRISS_GEGNER[g.typ].schatten, g.blick === -1) });
  }
  stuecke.sort((u, v) => v.z - u.z);
  for (const s of stuecke) s.male();
  zusammensetzen(blaetter, p, a.kamera[0], a.ky, a.x0, ['vordergrund']);
  // Bandkanten: Oberkante und unterste Bandzeile gepunktet am Rand
  for (let c = 0; c < a.breite; c += 2) {
    p.setze(c, a.kante[c] as number, KONTAKT_ANKER);
    p.setze(c, Math.min(BILD_HOEHE, a.unten[c] as number) - 1, KONTAKT_ANKER);
  }
  return p;
}

/** Kontaktbogen eines Abschnitts: Titel, Panorama 1× und mit Figuren nebeneinander, darunter 2×. */
export function kontaktPanorama(blaetter: readonly GepacktesHintergrundBlatt[], eigen: GepacktesHintergrundBlatt, a: Abschnitt, farben: number): Leinwand {
  const rein = panorama(blaetter, a);
  const mit = panoramaMitFiguren(blaetter, a);
  const doppelt = rein.vergroessert(2);
  const titel = `HINTERGRUND ${a.id} ${a.name.toUpperCase()}  WELT-X ${a.x0}-${a.x1}  KY ${a.ky}  BAND Z ${a.zUnten}-${a.zOben}  KAMERA-X AB ${a.kamera[0]}  ${farben} FARBEN  ${eigen.atlas.kacheln.length} KACHELN`;
  const breite = Math.max(RAND * 2 + doppelt.breite, RAND * 2 + textBreite(titel));
  const hoehe = RAND + ZEILE + ZEILE + BILD_HOEHE + LUECKE + ZEILE + doppelt.hoehe + RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, titel, RAND, RAND, KONTAKT_TEXT);
  const y1 = RAND + ZEILE;
  textZeichnen(bogen, '1× ALLE EBENEN', RAND, y1, KONTAKT_TEXT);
  textZeichnen(bogen, '1× MIT BANDKANTEN, BEHÄLTERN UND FIGUREN', RAND + a.breite + LUECKE, y1, KONTAKT_TEXT);
  bogen.einsetzen(rein, RAND, y1 + ZEILE);
  bogen.einsetzen(mit, RAND + a.breite + LUECKE, y1 + ZEILE);
  const y2 = y1 + ZEILE + BILD_HOEHE + LUECKE;
  textZeichnen(bogen, '2× ALLE EBENEN', RAND, y2, KONTAKT_TEXT);
  bogen.einsetzen(doppelt, RAND, y2 + ZEILE);
  return bogen;
}

/** Kachelübersicht: alle Kacheln eines Blatts (2×, 32 je Zeile, Nummer am Zeilenanfang) und die freien Bilder (2×). */
export function kontaktKacheln(b: GepacktesHintergrundBlatt, a: Abschnitt): Leinwand {
  const f = 2;
  const je = 32;
  const zelle = KACHEL * f + 2;
  const n = b.atlas.kacheln.length;
  const zeilen = Math.ceil(n / je);
  const nummer = textBreite('000') + 3;
  const freie = b.atlas.bilder;
  const freiB = freie.reduce((s, q) => s + q.bilder.length * (q.b * f + LUECKE), 0);
  const freiH = freie.reduce((m, q) => Math.max(m, q.h * f), 0);
  const titel = `KACHELN ${b.atlas.blatt.toUpperCase()}  ${n} KACHELN 16×16  ${b.atlas.karten.length} KARTEN  ${freie.length} FREIE BILDER  (ABSCHNITT ${a.id})`;
  const breite = Math.max(RAND * 2 + nummer + je * zelle, RAND * 2 + freiB, RAND * 2 + textBreite(titel));
  const hoehe = RAND + ZEILE + zeilen * zelle + LUECKE + (freie.length > 0 ? ZEILE + freiH + ZEILE : 0) + RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, titel, RAND, RAND, KONTAKT_TEXT);
  for (let i = 0; i < n; i++) {
    const [bx, by] = b.atlas.kacheln[i] as [number, number];
    const x = RAND + nummer + (i % je) * zelle;
    const y = RAND + ZEILE + Math.floor(i / je) * zelle;
    if (i % je === 0) textZeichnen(bogen, String(i), RAND, y + KACHEL - 2, KONTAKT_TEXT);
    bogen.rechteck(x, y, KACHEL * f, KACHEL * f, KONTAKT_ZELLE);
    bogen.einsetzen(b.leinwand.ausschnitt(bx, by, KACHEL, KACHEL).vergroessert(f), x, y);
  }
  if (freie.length > 0) {
    const y0 = RAND + ZEILE + zeilen * zelle + LUECKE;
    let x = RAND;
    for (const q of freie) {
      q.bilder.forEach((lage, i) => {
        textZeichnen(bogen, `${q.name.toUpperCase()}${q.bilder.length > 1 ? ` ${i}` : ''} (${q.ebene.toUpperCase()}, X ${q.x}, Y ${q.y})`.slice(0, Math.floor((q.b * f + LUECKE) / 4)), x, y0, KONTAKT_TEXT);
        bogen.rechteck(x, y0 + ZEILE, q.b * f, q.h * f, KONTAKT_ZELLE);
        bogen.einsetzen(b.leinwand.ausschnitt(lage.x, lage.y, q.b, q.h).vergroessert(f), x, y0 + ZEILE);
        x += q.b * f + LUECKE;
      });
    }
  }
  return bogen;
}

/** Kontaktbogen der Blende: Bild am Schnitt (Ende von B) mit Deckung 7, 14, 21 und die Kantenkachel 8×. */
export function kontaktBlende(blaetter: readonly GepacktesHintergrundBlatt[], k: number, ky: number, stufen: readonly number[]): Leinwand {
  const kante = blendenKante().vergroessert(8);
  const titel = `BLENDE: ABDUNKELN WIE HEUTE PLUS DUNKLES FELD VON RECHTS MIT RASTERKANTE  KAMERA-X ${k}  DECKUNG ${stufen.join(', ')} VON 28`;
  const breite = Math.max(RAND * 2 + stufen.length * (BILD_BREITE + LUECKE) + kante.breite, RAND * 2 + textBreite(titel));
  const hoehe = RAND + ZEILE + ZEILE + BILD_HOEHE + RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, titel, RAND, RAND, KONTAKT_TEXT);
  stufen.forEach((d, i) => {
    const s = new Leinwand(BILD_BREITE, BILD_HOEHE);
    zusammensetzen(blaetter, s, k, ky, k);
    blendeAnwenden(s, d);
    const x = RAND + i * (BILD_BREITE + LUECKE);
    textZeichnen(bogen, `D ${d}`, x, RAND + ZEILE, KONTAKT_TEXT);
    bogen.einsetzen(s, x, RAND + ZEILE + ZEILE);
  });
  const kx = RAND + stufen.length * (BILD_BREITE + LUECKE);
  textZeichnen(bogen, 'KANTE 8×', kx, RAND + ZEILE, KONTAKT_TEXT);
  bogen.rechteck(kx, RAND + ZEILE + ZEILE, kante.breite, kante.hoehe, KONTAKT_ZELLE);
  bogen.einsetzen(kante, kx, RAND + ZEILE + ZEILE);
  return bogen;
}
