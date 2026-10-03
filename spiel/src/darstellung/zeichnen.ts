// Zeichnen eines Bildes mit Canvas 2D im logischen Raster 384 × 224
// (Auftrag 3, 2.5). Liest nur die Welt; ändert sie nie.
//
// Bildschirmposition und Zeichenreihenfolge nach
// docs/spezifikation-kampf.md, 2.5:
//   Bildschirm-x = ⌊x⌋ − Kamera-x
//   Bildschirm-y des Schattens = 234 − (⌊z⌋ − Kamera-y)
//   Bildschirm-y des Fußpunkts = 234 − (⌊z⌋ − Kamera-y) − ⌊h⌋
//   Hintergrund; alle Schatten; Objekte nach ⌊z⌋ absteigend (hinten zuerst),
//   bei gleicher Tiefe Behälter, Gegenstände, Gegner, Figur, Geschosse und
//   Effekte, dann aufsteigende Slotnummer; Vordergrund; zuletzt Anzeige.
// Bildschütteln (Welt 3, KA10) verschiebt nur Hintergrund, Objekte und
// Vordergrund, nie die Anzeige. Die Blende (KA13, Welt 10.5) dunkelt das
// Bild nach anzeige(welt).blende ab; die Anzeigeleiste bleibt sichtbar.
// Gegner zeichnet sie nur im aktiven Fenster (Welt 4.1), wartende nur, wenn
// sie hocken (Welt 4.2).

import type { EntitaetBasis, Figur, FigurAktion, Gegner, GegnerModus, Objekt } from '../kern/entitaeten.ts';
import type { Balken, AnzeigeDaten } from '../kern/rahmen.ts';
import type { Hindernis } from '../kern/stage.ts';
import type { Welt } from '../kern/welt.ts';
import { ZUSTAND_REAKTION, imFenster } from '../kern/entitaeten.ts';
import { ganz } from '../kern/festkomma.ts';
import { anzeige } from '../kern/rahmen.ts';
import { bandGrenzen } from '../kern/stage.ts';
import { ANZEIGE, BEHAELTER_HALB_X, BEHAELTER_HOEHE, BILD_BREITE, BILD_HOEHE, BILDSCHIRM_Y_BASIS, BLENDE_ZU } from '../kern/werte.ts';
import type { Umriss } from './masse.ts';
import {
  AUFZEICHNUNG_LAGE,
  BLICK_HALB,
  BLICK_LAENGE,
  BLICK_OBEN,
  BODENMARKE_ABSTAND,
  EXPLOSION,
  FARBE,
  GROSS_FAKTOR,
  GROSS_ZEILE,
  HINTERGRUND_HOEHE,
  HINTERGRUND_RAND,
  HOCKE_NENNER,
  HOCKE_ZAEHLER,
  LEBEN_ABSTAND,
  LEBEN_SYMBOL,
  LIEGEND_TEILER,
  PFEIL_SCHAFT_TEILER,
  SCHATTEN_HOEHE,
  SCHATTEN_KLEIN_TEILER,
  SPRINT_STRICHE,
  TEXTKASTEN_RAND,
  TIEFENLINIE_ABSTAND,
  TRUEMMER_HOEHE,
  UMRISS_EFFEKT,
  UMRISS_FIGUR,
  UMRISS_GEGENSTAND,
  UMRISS_GEGNER,
  UMRISS_RAKETE,
  UMRISS_WAFFE,
  WAFFE_HAND,
} from './masse.ts';
import { SCHRIFT_3X5, SCHRIFT_5X7, text, textBreite } from './schrift.ts';

// ===========================================================================
// Bildschirmformeln (Kampf 2.5)
// ===========================================================================

/** Kamera als ganzzahliges Paar (K, Ky), Welt 3. */
export interface Kamera {
  x: number;
  y: number;
}

/** Bildschirm-x zu einer ganzzahligen Welt-x: ⌊x⌋ − Kamera-x. */
export function bildX(k: Kamera, x: number): number {
  return x - k.x;
}

/** Bildschirm-y zu ganzzahliger Tiefe und Höhe: 234 − (⌊z⌋ − Kamera-y) − ⌊h⌋. */
export function bildY(k: Kamera, z: number, h: number = 0): number {
  return BILDSCHIRM_Y_BASIS - (z - k.y) - h;
}

/** Bildschirmlage einer Entität: Fußpunkt und Schatten. */
export interface Lage {
  x: number;
  schatten: number;
  fuss: number;
}

/** Lage einer Entität nach Kampf 2.5 an ihren ganzzahligen Positionen. */
export function lageVon(k: Kamera, e: EntitaetBasis): Lage {
  const x = bildX(k, ganz(e.x));
  const schatten = bildY(k, ganz(e.z));
  return { x, schatten, fuss: schatten - ganz(e.h) };
}

/** Halbe Höhe des Schattens: der Umriss „mit Schatten“ reicht so weit unter den Fußpunkt. */
const SCHATTEN_HALB = SCHATTEN_HOEHE / 2;
/** Mitte eines Pixels: 1-px-Linien auf halben Koordinaten bleiben scharf. */
export const PIXELMITTE = 0.5;

// ===========================================================================
// Grundformen
// ===========================================================================

function rahmen(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, h: number, farbe: string): void {
  if (b <= 0 || h <= 0) return;
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + PIXELMITTE, y + PIXELMITTE, b - 1, h - 1);
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, farbe: string): void {
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function vieleck(ctx: CanvasRenderingContext2D, punkte: readonly (readonly [number, number])[], farbe: string): void {
  ctx.fillStyle = farbe;
  ctx.beginPath();
  punkte.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function linie(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, farbe: string): void {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + PIXELMITTE, y0 + PIXELMITTE);
  ctx.lineTo(x1 + PIXELMITTE, y1 + PIXELMITTE);
  ctx.stroke();
}

// ===========================================================================
// Hintergrund und Vordergrund (Welt 2.1, 2.3)
// ===========================================================================

function zyklisch(liste: readonly string[], i: number): string {
  return liste[i % liste.length] as string;
}

function zeichneHintergrund(ctx: CanvasRenderingContext2D, welt: Welt, k: Kamera): void {
  const stage = welt.stage;
  ctx.fillStyle = FARBE.leer;
  ctx.fillRect(0, 0, BILD_BREITE, BILD_HOEHE);
  stage.baender.forEach((b, i) => {
    const sx0 = bildX(k, b.x0);
    const sx1 = bildX(k, b.x1);
    if (sx1 < 0 || sx0 > BILD_BREITE) return;
    const yo0 = bildY(k, b.oben0);
    const yo1 = bildY(k, b.oben1);
    const yu0 = bildY(k, b.unten0);
    const yu1 = bildY(k, b.unten1);
    // Wand über dem Band, Boden im Band, Kante unter dem Band
    vieleck(ctx, [[sx0, 0], [sx1, 0], [sx1, yo1], [sx0, yo0]], zyklisch(FARBE.wand, i));
    vieleck(ctx, [[sx0, yo0], [sx1, yo1], [sx1, yu1], [sx0, yu0]], zyklisch(FARBE.boden, i));
    vieleck(ctx, [[sx0, yu0], [sx1, yu1], [sx1, BILD_HOEHE], [sx0, BILD_HOEHE]], FARBE.leer);
    // Tiefenlinien (z) und Bodenmarken (x) im Band
    const zMin = Math.max(b.unten0, b.unten1);
    const zMax = Math.min(b.oben0, b.oben1);
    for (let z = Math.ceil(zMin / TIEFENLINIE_ABSTAND) * TIEFENLINIE_ABSTAND; z < zMax; z += TIEFENLINIE_ABSTAND) {
      if (z <= zMin) continue;
      linie(ctx, sx0, bildY(k, z), sx1 - 1, bildY(k, z), FARBE.tiefenlinie);
    }
    for (let x = Math.ceil(b.x0 / BODENMARKE_ABSTAND) * BODENMARKE_ABSTAND; x < b.x1; x += BODENMARKE_ABSTAND) {
      const g = bandGrenzen(stage, x);
      if (g === null) continue;
      linie(ctx, bildX(k, x), bildY(k, g.oben), bildX(k, x), bildY(k, g.unten), FARBE.bodenmarke);
    }
    // Tiefenband als Linien: Ober- und Untergrenze
    linie(ctx, sx0, yo0, sx1 - 1, yo1, FARBE.bandkante);
    linie(ctx, sx0, yu0, sx1 - 1, yu1, FARBE.bandkante);
  });
  // Hintergrundbilder als Farbflächen auf der Wand
  stage.hintergrund.forEach((h, i) => {
    const sx0 = bildX(k, h.x0);
    const sx1 = bildX(k, h.x1);
    if (sx1 < 0 || sx0 > BILD_BREITE) return;
    const links = bandGrenzen(stage, h.x0);
    const rechts = bandGrenzen(stage, h.x1 - 1);
    const oben = Math.max(links?.oben ?? Number.NEGATIVE_INFINITY, rechts?.oben ?? Number.NEGATIVE_INFINITY);
    if (!Number.isFinite(oben)) return;
    const unten = bildY(k, oben);
    const y0 = Math.max(0, unten - HINTERGRUND_HOEHE);
    ctx.fillStyle = zyklisch(FARBE.bild, i);
    ctx.fillRect(sx0, y0, sx1 - sx0, unten - y0);
    rahmen(ctx, sx0, y0, sx1 - sx0, unten - y0, FARBE.kontur);
    // Beschriftung am linken Rand der sichtbaren Fläche
    text(ctx, SCHRIFT_3X5, (h.bild !== '' ? h.bild : h.id).toUpperCase(), Math.max(sx0, 0) + HINTERGRUND_RAND, y0 + HINTERGRUND_RAND, FARBE.bild_text);
  });
  // Hindernisse als Grundfläche (Welt 2.2)
  for (const h of stage.hindernisse) zeichneHindernis(ctx, k, h, FARBE.hindernis_flaeche);
}

/** Grundfläche eines Hindernisses in der Ebene x/z (Welt 2.1). */
export function zeichneHindernis(ctx: CanvasRenderingContext2D, k: Kamera, h: Hindernis, farbe: string): void {
  if (h.punkte.length < 2) return;
  vieleck(
    ctx,
    h.punkte.map((p) => [bildX(k, p.x), bildY(k, p.z)] as const),
    farbe,
  );
}

function zeichneVordergrund(ctx: CanvasRenderingContext2D, welt: Welt, k: Kamera): void {
  for (const v of welt.stage.vordergrund) {
    const sx0 = bildX(k, v.x0);
    const sx1 = bildX(k, v.x1);
    if (sx1 < 0 || sx0 > BILD_BREITE) continue;
    const y0 = BILD_HOEHE - v.zeilen;
    ctx.fillStyle = FARBE.vordergrund;
    ctx.fillRect(sx0, y0, sx1 - sx0, v.zeilen);
    linie(ctx, sx0, y0, sx1 - 1, y0, FARBE.vordergrund_kante);
  }
}

// ===========================================================================
// Figuren: Umriss, Zustandsfarbe, Blickrichtung, Höhe
// ===========================================================================

/** Form eines Körpers: stehend, hockend (Auftritt, Aufstehen) oder liegend. */
type Form = 'stand' | 'hocke' | 'liegend';

const FIGUR_LIEGEND: readonly FigurAktion[] = ['UMGEWORFEN', 'LIEGEN', 'TOT'];
const FIGUR_GRIFF: readonly FigurAktion[] = ['GRIFF', 'KNIESTOSS', 'WURF'];
const GEGNER_LIEGEND: readonly GegnerModus[] = ['UMGEWORFEN', 'LIEGEN', 'TOT'];
const GEGNER_ANKUENDIGUNG: readonly GegnerModus[] = ['KAMPFHALTUNG', 'ZIELEN', 'ANKUENDIGUNG'];

/** Rechteck eines Körpers relativ zum Fußpunkt. */
export interface Koerper {
  links: number;
  oben: number;
  breite: number;
  hoehe: number;
}

/** Rechteck des Körpers zum Umriss (Breite × Höhe mit Schatten) und zur Form. */
export function koerperRechteck(l: Lage, u: Umriss, form: Form): Koerper {
  let breite = u.breite;
  let hoehe = u.hoehe - SCHATTEN_HALB;
  if (form === 'liegend') {
    breite = u.hoehe - SCHATTEN_HALB;
    hoehe = Math.floor(u.breite / LIEGEND_TEILER);
  } else if (form === 'hocke') {
    hoehe = Math.floor((u.hoehe * HOCKE_ZAEHLER) / HOCKE_NENNER) - SCHATTEN_HALB;
  }
  return { links: l.x - Math.floor(breite / 2), oben: l.fuss - hoehe, breite, hoehe };
}

function zeichneKoerper(ctx: CanvasRenderingContext2D, r: Koerper, farbe: string, blick: 1 | -1, form: Form, blinkAus: boolean): void {
  if (blinkAus) {
    rahmen(ctx, r.links, r.oben, r.breite, r.hoehe, farbe);
  } else {
    ctx.fillStyle = farbe;
    ctx.fillRect(r.links, r.oben, r.breite, r.hoehe);
    rahmen(ctx, r.links, r.oben, r.breite, r.hoehe, FARBE.kontur);
  }
  // Blickrichtung als Dreieck an der Vorderkante
  const vorne = blick === 1 ? r.links + r.breite : r.links;
  const y = form === 'liegend' ? r.oben + Math.floor(r.hoehe / 2) : r.oben + BLICK_OBEN;
  vieleck(
    ctx,
    [
      [vorne, y - BLICK_HALB],
      [vorne + blick * BLICK_LAENGE, y],
      [vorne, y + BLICK_HALB],
    ],
    FARBE.text,
  );
}

function schatten(ctx: CanvasRenderingContext2D, l: Lage, breite: number, hoehe: number = SCHATTEN_HOEHE): void {
  ellipse(ctx, l.x, l.schatten, breite / 2, hoehe / 2, FARBE.schatten);
}

/** Zustandsfarbe der Figur (Auftrag 3, 2.5): Stand, Angriff aktiv, Getroffen, Liegen; Schutz blinkt. */
export function figurFarbe(f: Figur): string {
  if (f.aktion === 'GETROFFEN') return FARBE.getroffen;
  if (FIGUR_LIEGEND.includes(f.aktion) || f.aktion === 'AUFSTEHEN') return FARBE.liegen;
  if (f.angriff !== null && f.angriff.aktiv) return FARBE.angriff_aktiv;
  if (f.angriff !== null) return FARBE.angriff;
  if (FIGUR_GRIFF.includes(f.aktion)) return FARBE.griff;
  return FARBE.figur;
}

function figurForm(f: Figur): Form {
  if (FIGUR_LIEGEND.includes(f.aktion)) return 'liegend';
  if (f.aktion === 'AUFSTEHEN') return 'hocke';
  return 'stand';
}

/** Schutz blinkend: in jedem zweiten Paar von Frames nur der Rahmen (Kampf 6.3: zustand 3 mit schutz > 0). */
function schutzBlinkt(f: Figur, frame: number): boolean {
  return f.schutz > 0 && f.zustand === ZUSTAND_REAKTION && ((frame >> 1) & 1) === 1;
}

/** Rechteck der Figur im Bild (auch für die Debug-Anzeige). */
export function figurRechteck(k: Kamera, f: Figur): Koerper {
  return koerperRechteck(lageVon(k, f), UMRISS_FIGUR, figurForm(f));
}

function zeichneFigur(ctx: CanvasRenderingContext2D, k: Kamera, f: Figur, frame: number): void {
  const form = figurForm(f);
  const r = koerperRechteck(lageVon(k, f), UMRISS_FIGUR, form);
  const blinkAus = schutzBlinkt(f, frame);
  zeichneKoerper(ctx, r, figurFarbe(f), f.blick, form, blinkAus);
  if (f.aktion === 'SPRINT') {
    // Bewegungsstriche hinter der Figur
    const hinten = f.blick === 1 ? r.links - SPRINT_STRICHE.abstand - SPRINT_STRICHE.laenge : r.links + r.breite + SPRINT_STRICHE.abstand;
    for (let i = 1; i <= SPRINT_STRICHE.anzahl; i++) {
      const y = r.oben + i * SPRINT_STRICHE.zeile;
      linie(ctx, hinten, y, hinten + SPRINT_STRICHE.laenge - 1, y, FARBE.sprint);
    }
  }
  if (f.waffe === 'RW' && form === 'stand') {
    const x = f.blick === 1 ? r.links + r.breite - WAFFE_HAND.laenge + BLICK_LAENGE : r.links - BLICK_LAENGE;
    ctx.fillStyle = FARBE.waffe;
    ctx.fillRect(x, r.oben + WAFFE_HAND.oben, WAFFE_HAND.laenge, WAFFE_HAND.hoehe);
  }
}

/** Zustandsfarbe eines Gegners: Reaktionen, Angriff, Ankündigung, sonst die Farbe des Typs. */
export function gegnerFarbe(g: Gegner): string {
  if (g.modus === 'GETROFFEN') return FARBE.getroffen;
  if (GEGNER_LIEGEND.includes(g.modus) || g.modus === 'AUFSTEHEN') return FARBE.liegen;
  if (g.modus === 'GEHALTEN') return FARBE.gehalten;
  if (g.angriff !== null && g.angriff.aktiv) return FARBE.angriff_aktiv;
  if (g.angriff !== null || g.modus === 'ANGRIFF' || g.modus === 'SCHUSS' || g.modus === 'STOSS') return FARBE.angriff;
  if (GEGNER_ANKUENDIGUNG.includes(g.modus)) return FARBE.ankuendigung;
  if (g.modus === 'WARTEN') return FARBE.wartend;
  return g.typ === '' ? FARBE.wartend : FARBE.gegner[g.typ];
}

function gegnerForm(g: Gegner): Form {
  if (GEGNER_LIEGEND.includes(g.modus)) return 'liegend';
  if (g.modus === 'AUFSTEHEN' || g.modus === 'WARTEN') return 'hocke';
  return 'stand';
}

/** Wird der Gegner gezeichnet? Belegt, im aktiven Fenster (Welt 4.1), wartend nur hockend (Welt 4.2). */
export function gegnerSichtbar(welt: Welt, g: Gegner): boolean {
  if (!g.belegt || g.typ === '') return false;
  if (!imFenster(g, welt.kamera.x)) return false;
  if (g.modus === 'WARTEN' && g.auftritt !== 'hocke') return false;
  return true;
}

function gegnerUmriss(g: Gegner): Umriss {
  return g.typ === '' ? UMRISS_GEGNER.Bolzer : UMRISS_GEGNER[g.typ];
}

/** Rechteck eines Gegners im Bild (auch für die Debug-Anzeige). */
export function gegnerRechteck(k: Kamera, g: Gegner): Koerper {
  return koerperRechteck(lageVon(k, g), gegnerUmriss(g), gegnerForm(g));
}

function zeichneGegner(ctx: CanvasRenderingContext2D, k: Kamera, g: Gegner): void {
  const form = gegnerForm(g);
  zeichneKoerper(ctx, koerperRechteck(lageVon(k, g), gegnerUmriss(g), form), gegnerFarbe(g), g.blick, form, false);
}

// ===========================================================================
// Objekte und Geschosse (Kampf 3, 10; Welt 6, 9)
// ===========================================================================

/** Größe eines Objekts im Bild (Breite, Höhe), null = nicht zeichnen. */
function objektMass(o: Objekt): { breite: number; hoehe: number } | null {
  switch (o.typ) {
    case 'Behälter':
      return { breite: BEHAELTER_HALB_X * 2, hoehe: o.zerbrochen ? TRUEMMER_HOEHE : BEHAELTER_HOEHE };
    case 'Gegenstand':
      return o.art === '' || o.art === 'Fass' || o.art === 'Bosskiste' ? null : UMRISS_GEGENSTAND[o.art];
    case 'Waffe':
      return UMRISS_WAFFE;
    case 'Rakete':
      return o.flugphase === 'EXPLOSION' ? { breite: EXPLOSION.rx * 2, hoehe: EXPLOSION.ry * 2 } : UMRISS_RAKETE;
    case 'Effekt':
      return { breite: UMRISS_EFFEKT, hoehe: UMRISS_EFFEKT };
    default:
      return null;
  }
}

function objektFarbe(o: Objekt): string {
  switch (o.typ) {
    case 'Behälter':
      if (o.zerbrochen) return FARBE.truemmer;
      return o.art === 'Bosskiste' ? FARBE.bosskiste : FARBE.fass;
    case 'Gegenstand':
      return o.art === '' || o.art === 'Fass' || o.art === 'Bosskiste' ? FARBE.effekt : FARBE.gegenstand[o.art];
    case 'Waffe':
      return FARBE.waffe;
    case 'Rakete':
      return o.flugphase === 'EXPLOSION' ? FARBE.explosion : FARBE.rakete;
    default:
      return FARBE.effekt;
  }
}

/** Wird das Objekt gezeichnet? Belegt und sichtbar (Blinken der Liegezeit, Welt 9.3). */
export function objektSichtbar(o: Objekt): boolean {
  return o.belegt && o.sichtbar && objektMass(o) !== null;
}

function objektSchatten(ctx: CanvasRenderingContext2D, k: Kamera, o: Objekt): void {
  const m = objektMass(o);
  if (m === null || (o.typ === 'Rakete' && o.flugphase === 'EXPLOSION')) return;
  schatten(ctx, lageVon(k, o), m.breite, SCHATTEN_HOEHE / SCHATTEN_KLEIN_TEILER);
}

function zeichneObjekt(ctx: CanvasRenderingContext2D, k: Kamera, o: Objekt): void {
  const m = objektMass(o);
  if (m === null) return;
  const l = lageVon(k, o);
  const farbe = objektFarbe(o);
  if (o.typ === 'Rakete' && o.flugphase === 'EXPLOSION') {
    ellipse(ctx, l.x, l.fuss - EXPLOSION.ry, EXPLOSION.rx, EXPLOSION.ry, farbe);
    return;
  }
  const links = l.x - Math.floor(m.breite / 2);
  const oben = l.fuss - m.hoehe;
  ctx.fillStyle = farbe;
  ctx.fillRect(links, oben, m.breite, m.hoehe);
  rahmen(ctx, links, oben, m.breite, m.hoehe, FARBE.kontur);
  if (o.typ === 'Rakete') {
    // Spitze in Flugrichtung
    const vorne = o.bahn_richtung === 1 ? links + m.breite : links;
    vieleck(
      ctx,
      [
        [vorne, oben],
        [vorne + o.bahn_richtung * Math.floor(m.hoehe / 2), oben + Math.floor(m.hoehe / 2)],
        [vorne, oben + m.hoehe],
      ],
      farbe,
    );
  }
}

// ===========================================================================
// Szene in Zeichenreihenfolge (Kampf 2.5)
// ===========================================================================

/** Rang bei gleicher Tiefe (Kampf 2.5): Behälter, Gegenstände, Gegner, Figur, Geschosse und Effekte. */
const RANG_BEHAELTER = 0;
const RANG_GEGENSTAND = 1;
const RANG_GEGNER = 2;
const RANG_FIGUR = 3;
const RANG_GESCHOSS = 4;

interface Stueck {
  z: number;
  rang: number;
  nr: number;
  schatten: () => void;
  zeichne: () => void;
}

function objektRang(o: Objekt): number {
  if (o.typ === 'Behälter') return RANG_BEHAELTER;
  if (o.typ === 'Gegenstand' || o.typ === 'Waffe') return RANG_GEGENSTAND;
  return RANG_GESCHOSS;
}

function stuecke(ctx: CanvasRenderingContext2D, welt: Welt, k: Kamera): Stueck[] {
  const liste: Stueck[] = [];
  const f = welt.figur;
  liste.push({
    z: ganz(f.z),
    rang: RANG_FIGUR,
    nr: f.nr,
    schatten: () => schatten(ctx, lageVon(k, f), UMRISS_FIGUR.schatten),
    zeichne: () => zeichneFigur(ctx, k, f, welt.frame),
  });
  for (const g of welt.gegner) {
    if (!gegnerSichtbar(welt, g)) continue;
    liste.push({
      z: ganz(g.z),
      rang: RANG_GEGNER,
      nr: g.nr,
      schatten: () => schatten(ctx, lageVon(k, g), gegnerUmriss(g).schatten),
      zeichne: () => zeichneGegner(ctx, k, g),
    });
  }
  for (const o of [...welt.objekte, ...welt.geschosse]) {
    if (!objektSichtbar(o)) continue;
    liste.push({
      z: ganz(o.z),
      rang: objektRang(o),
      nr: o.nr,
      schatten: () => objektSchatten(ctx, k, o),
      zeichne: () => zeichneObjekt(ctx, k, o),
    });
  }
  // hinten zuerst (⌊z⌋ absteigend), dann Rang, dann Slotnummer aufsteigend
  return liste.sort((a, b) => b.z - a.z || a.rang - b.rang || a.nr - b.nr);
}

/** Zeichnet Hintergrund, Schatten, Objekte und Vordergrund mit Bildschütteln (KA10). */
export function zeichneSzene(ctx: CanvasRenderingContext2D, welt: Welt): void {
  const k: Kamera = { x: welt.kamera.x, y: welt.kamera.y };
  ctx.save();
  ctx.translate(welt.kamera.schuetteln_x, welt.kamera.schuetteln_y);
  zeichneHintergrund(ctx, welt, k);
  const liste = stuecke(ctx, welt, k);
  for (const s of liste) s.schatten();
  for (const s of liste) s.zeichne();
  zeichneVordergrund(ctx, welt, k);
  ctx.restore();
}

// ===========================================================================
// Blende, Anzeigeleiste, Texte (Welt 10)
// ===========================================================================

/** Abdunklung der Blende (KA13, Welt 10.5) nach anzeige(welt).blende: 0 offen bis BLENDE_ZU schwarz. */
export function zeichneBlende(ctx: CanvasRenderingContext2D, a: AnzeigeDaten): void {
  if (a.blende <= 0) return;
  ctx.fillStyle = FARBE.rand;
  ctx.globalAlpha = Math.min(1, a.blende / BLENDE_ZU);
  ctx.fillRect(0, 0, BILD_BREITE, BILD_HOEHE);
  ctx.globalAlpha = 1;
}

function zeichneBalken(ctx: CanvasRenderingContext2D, lage: { x0: number; x1: number; zeile0: number; zeile1: number }, b: Balken): void {
  const breite = lage.x1 - lage.x0 + 1;
  const hoehe = lage.zeile1 - lage.zeile0 + 1;
  ctx.fillStyle = FARBE.balken_rand;
  ctx.fillRect(lage.x0 - 1, lage.zeile0 - 1, breite + 2, hoehe + 2);
  ctx.fillStyle = FARBE.balken_grund;
  ctx.fillRect(lage.x0, lage.zeile0, breite, hoehe);
  const lagen = FARBE.lagen;
  const farbe = (n: number): string => lagen[Math.min(n, lagen.length - 1)] as string;
  if (b.unterlage > 0) {
    ctx.fillStyle = farbe(b.unterlage);
    ctx.fillRect(lage.x0, lage.zeile0, breite, hoehe);
  }
  if (b.breite > 0) {
    ctx.fillStyle = farbe(b.lage);
    ctx.fillRect(lage.x0, lage.zeile0, Math.min(b.breite, breite), hoehe);
  }
}

function zeichnePfeil(ctx: CanvasRenderingContext2D): void {
  const p = ANZEIGE.pfeil;
  const mitte = Math.floor((p.zeile0 + p.zeile1) / 2);
  const hoehe = p.zeile1 - p.zeile0;
  const spitze = Math.floor(hoehe / 2);
  const schaft = Math.floor(hoehe / PFEIL_SCHAFT_TEILER);
  ctx.fillStyle = FARBE.pfeil;
  ctx.fillRect(p.x0, mitte - schaft, p.x1 - p.x0 - spitze, schaft * 2);
  vieleck(
    ctx,
    [
      [p.x1 - spitze, p.zeile0],
      [p.x1, mitte],
      [p.x1 - spitze, p.zeile1],
    ],
    FARBE.pfeil,
  );
}

/** Anzeigeleiste nach Welt 10.1: Name, Punkte, Leben, LP-Balken, Gegneranzeige, Pfeil „weiter“. */
export function zeichneAnzeige(ctx: CanvasRenderingContext2D, a: AnzeigeDaten): void {
  text(ctx, SCHRIFT_5X7, a.name, ANZEIGE.name.x, ANZEIGE.name.zeile, FARBE.text);
  text(ctx, SCHRIFT_5X7, a.punkte, ANZEIGE.punkte.x, ANZEIGE.punkte.zeile, FARBE.text);
  ctx.fillStyle = FARBE.figur;
  ctx.fillRect(ANZEIGE.leben.x, ANZEIGE.leben.zeile, LEBEN_SYMBOL.breite, LEBEN_SYMBOL.hoehe);
  text(ctx, SCHRIFT_5X7, String(a.leben), ANZEIGE.leben.x + LEBEN_ABSTAND, ANZEIGE.leben.zeile, FARBE.text);
  zeichneBalken(ctx, ANZEIGE.lp_balken, a.figur);
  if (a.gegner !== null) {
    text(ctx, SCHRIFT_5X7, a.gegner.name, ANZEIGE.gegner_name.x, ANZEIGE.gegner_name.zeile, FARBE.text);
    zeichneBalken(ctx, ANZEIGE.gegner_balken, a.gegner.balken);
  }
  if (a.pfeil) zeichnePfeil(ctx);
}

/** Große Texte in der Bildmitte (PAUSE, STAGE CLEAR, GAME OVER) mit dunklem Kasten. */
export function zeichneGrosseTexte(ctx: CanvasRenderingContext2D, zeilen: readonly string[]): void {
  if (zeilen.length === 0) return;
  const gesamt = zeilen.length * GROSS_ZEILE;
  let y = Math.floor((BILD_HOEHE - gesamt) / 2);
  const breiteste = Math.max(...zeilen.map((z) => textBreite(SCHRIFT_5X7, z, GROSS_FAKTOR)));
  const kx = Math.floor((BILD_BREITE - breiteste) / 2) - TEXTKASTEN_RAND;
  ctx.fillStyle = FARBE.textkasten;
  ctx.fillRect(kx, y - TEXTKASTEN_RAND, breiteste + TEXTKASTEN_RAND * 2, gesamt + TEXTKASTEN_RAND);
  for (const z of zeilen) {
    const b = textBreite(SCHRIFT_5X7, z, GROSS_FAKTOR);
    text(ctx, SCHRIFT_5X7, z, Math.floor((BILD_BREITE - b) / 2), y, FARBE.text, GROSS_FAKTOR);
    y += GROSS_ZEILE;
  }
}

/** Hinweis „AUFZ“ oben rechts, solange die Eingabeaufzeichnung läuft (F2). */
export function zeichneAufzeichnung(ctx: CanvasRenderingContext2D): void {
  const inhalt = 'AUFZ';
  const b = textBreite(SCHRIFT_5X7, inhalt);
  const x = BILD_BREITE - AUFZEICHNUNG_LAGE.rechts - b;
  ctx.fillStyle = FARBE.aufzeichnung;
  ctx.fillRect(x - LEBEN_ABSTAND, AUFZEICHNUNG_LAGE.zeile + 1, LEBEN_SYMBOL.breite, LEBEN_SYMBOL.breite);
  text(ctx, SCHRIFT_5X7, inhalt, x, AUFZEICHNUNG_LAGE.zeile, FARBE.aufzeichnung);
}

/** Zustand der Darstellung außerhalb der Logik. */
export interface Ansicht {
  pause: boolean;
  aufzeichnung: boolean;
}

/**
 * Ein ganzes Bild ohne Debug-Anzeige: Szene, Blende, Anzeige, Texte. Gibt die
 * Anzeige-Daten zurück (für die Debug-Anzeige danach).
 */
export function zeichneBild(ctx: CanvasRenderingContext2D, welt: Welt): AnzeigeDaten {
  const a = anzeige(welt);
  zeichneSzene(ctx, welt);
  zeichneBlende(ctx, a);
  zeichneAnzeige(ctx, a);
  return a;
}

/** Texte über allem (nach der Debug-Anzeige): STAGE CLEAR, GAME OVER, PAUSE, Aufzeichnung. */
export function zeichneObersteEbene(ctx: CanvasRenderingContext2D, a: AnzeigeDaten, ansicht: Ansicht): void {
  const zeilen = [...a.texte];
  if (ansicht.pause) zeilen.push('PAUSE');
  zeichneGrosseTexte(ctx, zeilen);
  if (ansicht.aufzeichnung) zeichneAufzeichnung(ctx);
}
