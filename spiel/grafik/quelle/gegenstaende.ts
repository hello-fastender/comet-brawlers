// Gegenstände, Behälter und Geschosse (Auftrag 4, Phase 2, G4; Abschnitte 1.5
// und 4): Kometenbraten, Eisnudelschale, Sternbeeren, Raketenwerfer und leere
// Waffe, Rakete der Figur und des Zünders, Fass und Bosskiste mit Trümmern.
// Beschreibung, Maße und Zuordnung zur Logik in docs/grafik.md 4.7.
//
// Gezeichnet wird mit Schichten: Formen aus geometrie.ts (Kapsel, Ellipse,
// Polygon) mit Material (Tonabbildung aus fünf Farben), Wölbung (Normale wie
// in puppe.ts, dazu stehender und liegender Zylinder für Fass und Rohr) und
// Zeichenreihenfolge (spätere Schicht vorn). Ton aus Licht und Normale in
// harten Stufen (licht.ts), Kantenregeln, Innenkontur zwischen Gruppen und
// Außenkontur wie bei der Gliederpuppe (docs/grafik.md 2.4). Koordinaten in
// Spielpixeln mit dem Anker in (0, 0): bei Gegenständen und Behältern der
// Fußpunkt (die Konturzeile unter dem Boden), bei Geschossen die Mitte.
// Keine Farbwerte in dieser Datei (palette.ts), Maße mit Herkunft.

import type { Animation, Bild } from './blatt.ts';
import type { Form, Punkt } from './geometrie.ts';
import { HALB, drehe, ellipseLage, formBewegt, formGrenzen, inForm, kapselLage, streckenAbstand } from './geometrie.ts';
import type { Pixel } from './leinwand.ts';
import { DURCHSICHTIG, Leinwand } from './leinwand.ts';
import { NACHBARN_4, NACHBARN_8, konturAussen } from './kontur.ts';
import { KISSEN_BREITE } from './puppe.ts';
import { SCHWELLEN_FIGUR, helligkeit, kissenNormale, tonAusHelligkeit, zylinderNormale } from './licht.ts';
import type { TonIndex } from './palette.ts';
import {
  BLATT_GRUEN,
  BRATEN,
  FASS_STAHLBLAU,
  FEUER,
  HOLZ,
  KISTE_GRAU,
  KONTUR,
  NUDEL,
  OVERALL_BOLZER,
  RAKETE_GELB,
  RAKETE_ROT,
  ROHR_GRUEN,
  SCHALE_BLAU,
  SIEGEL_ROT,
  SIGNAL_ORANGE,
  STAHL,
  STERNBEERE,
} from './palette.ts';
import { BEHAELTER_HALB_X, BEHAELTER_HOEHE } from '../../src/kern/werte.ts';

// ===========================================================================
// Schichten: Zeichnen aus Formen (wie puppe.ts, ohne Gelenke)
// ===========================================================================

/** Tonabbildung einer Schicht: Ton 0 (Innenkontur) bis 4 (Glanz) → Farbe. */
export type Toene = readonly [Pixel, Pixel, Pixel, Pixel, Pixel];

/** Wölbung einer Schicht: woher die Normale je Pixel kommt. */
export type Woelbung =
  /** wie puppe.ts: Kapsel als Zylinder, Ellipse als Kugel, Polygon als Kissen */
  | { readonly art: 'form' }
  /** stehender Zylinder über x0 … x1 (Fass, Kiste von vorn) */
  | { readonly art: 'senkrecht'; readonly x0: number; readonly x1: number }
  /** liegender Zylinder über y0 … y1 (Rohr, Ring) */
  | { readonly art: 'waagrecht'; readonly y0: number; readonly y1: number }
  /** eben, zum Betrachter (Grundton, Kantenregeln gelten) */
  | { readonly art: 'flach' };

/** Eine Schicht: Formen, Farben, Licht; spätere Schichten liegen vorn. */
export interface Schicht {
  readonly name: string;
  readonly formen: readonly Form[];
  readonly toene: Toene;
  /** Innenkontur nur zwischen verschiedenen Gruppen (docs/grafik.md 2.4, Schritt 4). */
  readonly gruppe: string;
  /** Vorgabe { art: 'form' }. */
  readonly woelbung?: Woelbung;
  /** Glanzton (4) erlaubt. */
  readonly glanz?: boolean;
  /** fester Ton ohne Licht und ohne Kantenregeln (Leuchtteile, Zeichen). */
  readonly ton?: TonIndex;
  /** Tonverschiebung nach dem Licht (+1 heller, −1 dunkler), begrenzt auf 1 … 3 (mit Glanz 4). */
  readonly stufe?: number;
  /** nur sichtbar, wo die Schicht dieses Namens liegt (Band auf dem Fass). */
  readonly auf?: string;
  /** Breite des Kantenlichts bei Polygonen (Vorgabe KISSEN_BREITE aus puppe.ts). */
  readonly kissen?: number;
  /** Faktor auf die Normale (Vorgabe 1; kleiner: flacher). */
  readonly relief?: number;
}

/** Symbol als Bitmuster (höchstens 8 × 8, Auftrag 4, 6), gesetzt auf eine Trägerschicht. */
export interface Maske {
  /** linke obere Ecke in Objektkoordinaten (ganze Pixel). */
  readonly ursprung: Punkt;
  /** Zeilen, je Zeichen ein Pixel; '.' = nichts. */
  readonly zeilen: readonly string[];
  readonly farben: Readonly<Record<string, Pixel>>;
  /** nur auf Pixeln dieser Schicht. */
  readonly auf: string;
}

/** Größe einer Symbolmaske (Auftrag 4, 6: Symbole bis 8 × 8 von Hand). */
const MASKE_MAX = 8;

export interface MalOptionen {
  /** Außenkontur in KONTUR (Vorgabe true; Gegenstände und Behälter immer, docs/grafik.md 1.2). */
  readonly kontur?: boolean;
  readonly masken?: readonly Maske[];
  /** Farben, die beim Aufräumen allein stehen dürfen (Glanzpunkte, Regel 1.3). */
  readonly glanz?: ReadonlySet<Pixel>;
}

/** Freier Rand um die Formen beim Rastern (Platz für die Außenkontur, wie puppe.ts). */
const RAND = 2;
/** Neigung der Kissennormale an der Kante (wie puppe.ts KISSEN_STAERKE, stilproben.html treffe() 0,85). */
const KISSEN_STAERKE = 0.85;
/** Runden beim Entfernen von Streupixeln (wie puppe.ts). */
const AUFRAEUM_RUNDEN = 4;

interface Treffer {
  readonly schicht: number;
  readonly nx: number;
  readonly ny: number;
}

/** Normale einer Form am Punkt (x, y), wenn er darin liegt (wie puppe.ts normale()). */
function formNormale(f: Form, x: number, y: number, kissen: number): [number, number] | null {
  if (!inForm(f, x, y)) return null;
  if (f.art === 'kapsel') {
    const l = kapselLage(f, x, y);
    return zylinderNormale(l.dx, l.dy, l.r);
  }
  if (f.art === 'ellipse') {
    const e = ellipseLage(f, x, y) as { ex: number; ey: number };
    const n = drehe({ x: e.ex, y: e.ey }, f.winkel);
    return [n.x, n.y];
  }
  let best = { d: Infinity, nx: 0, ny: 0 };
  const p = f.punkte;
  for (let k = 0; k < p.length; k++) {
    const s = streckenAbstand(p[k] as Punkt, p[(k + 1) % p.length] as Punkt, x, y);
    if (s.d < best.d) best = s;
  }
  return kissenNormale(best.d, -best.nx, -best.ny, kissen, KISSEN_STAERKE);
}

/** Normale der Schicht am Punkt oder null (spätere Formen der Schicht liegen oben). */
function schichtNormale(s: Schicht, x: number, y: number): [number, number] | null {
  for (let i = s.formen.length - 1; i >= 0; i--) {
    const f = s.formen[i] as Form;
    const n = formNormale(f, x, y, s.kissen ?? KISSEN_BREITE);
    if (n === null) continue;
    const w = s.woelbung ?? { art: 'form' };
    if (w.art === 'form') return n;
    if (w.art === 'flach') return [0, 0];
    if (w.art === 'senkrecht') {
      const m = (w.x0 + w.x1) / 2;
      const r = (w.x1 - w.x0) / 2;
      return [Math.max(-1, Math.min(1, (x - m) / r)), 0];
    }
    const m = (w.y0 + w.y1) / 2;
    const r = (w.y1 - w.y0) / 2;
    return [0, Math.max(-1, Math.min(1, (y - m) / r))];
  }
  return null;
}

/**
 * Zeichnet Schichten zu einem Bild (Schritte wie puppe.ts rastern(): Rastern
 * am Pixelmittelpunkt, Ton aus Licht, Kantenregeln, Innenkontur, Tonabbildung,
 * Masken, Streupixel entfernen, Außenkontur). Anker = Objektpunkt (0, 0).
 */
export function malen(schichten: readonly Schicht[], dauer: number, optionen: MalOptionen = {}): Bild {
  const namen = new Map<string, number>();
  schichten.forEach((s, i) => {
    if (namen.has(s.name)) throw new Error(`malen: Schicht ${s.name} doppelt`);
    if (s.auf !== undefined && !namen.has(s.auf)) throw new Error(`malen: Träger ${s.auf} von ${s.name} fehlt oder steht später`);
    namen.set(s.name, i);
  });
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of schichten) {
    for (const f of s.formen) {
      const g = formGrenzen(f);
      x0 = Math.min(x0, g.x0);
      y0 = Math.min(y0, g.y0);
      x1 = Math.max(x1, g.x1);
      y1 = Math.max(y1, g.y1);
    }
  }
  // Anker (0, 0) immer im Bild (docs/grafik.md 2.5, „Anker im Bild“)
  const bx = Math.min(Math.floor(x0), 0) - RAND;
  const by = Math.min(Math.floor(y0), 0) - RAND;
  const breite = Math.max(Math.ceil(x1), 0) + RAND - bx + 1;
  const hoehe = Math.max(Math.ceil(y1), 0) + RAND - by + 1;

  // 1. vorderste Schicht und Normale je Pixel
  const feld: (Treffer | null)[] = new Array(breite * hoehe).fill(null);
  for (let py = 0; py < hoehe; py++) {
    for (let px = 0; px < breite; px++) {
      const x = bx + px + HALB;
      const y = by + py + HALB;
      for (let i = schichten.length - 1; i >= 0; i--) {
        const s = schichten[i] as Schicht;
        const n = schichtNormale(s, x, y);
        if (n === null) continue;
        if (s.auf !== undefined && schichtNormale(schichten[namen.get(s.auf) as number] as Schicht, x, y) === null) continue;
        feld[py * breite + px] = { schicht: i, nx: n[0], ny: n[1] };
        break;
      }
    }
  }
  const an = (px: number, py: number): Treffer | null => (px < 0 || py < 0 || px >= breite || py >= hoehe ? null : (feld[py * breite + px] as Treffer | null));

  // 2. Ton je Pixel, Kantenregeln, Innenkontur
  const bild = new Leinwand(breite, hoehe);
  for (let py = 0; py < hoehe; py++) {
    for (let px = 0; px < breite; px++) {
      const t = an(px, py);
      if (t === null) continue;
      const s = schichten[t.schicht] as Schicht;
      let ton: number;
      if (s.ton !== undefined) ton = s.ton;
      else {
        const r = s.relief ?? 1;
        ton = tonAusHelligkeit(helligkeit(t.nx * r, t.ny * r), s.glanz === true, SCHWELLEN_FIGUR);
        ton = Math.max(1, Math.min(s.glanz === true ? 4 : 3, ton + (s.stufe ?? 0)));
        const rechts = an(px + 1, py) === null;
        const unten = an(px, py + 1) === null;
        const links = an(px - 1, py) === null;
        const oben = an(px, py - 1) === null;
        if ((rechts || unten) && ton > 1) ton = 1;
        if ((links || oben) && !(rechts || unten) && ton < 2) ton = 2;
        for (const [dx, dy] of NACHBARN_4) {
          const n = an(px + dx, py + dy);
          if (n === null || n.schicht <= t.schicht) continue;
          const ns = schichten[n.schicht] as Schicht;
          if (ns.auf === s.name || ns.ton !== undefined) continue;
          if (ns.gruppe !== s.gruppe) {
            ton = 0;
            break;
          }
        }
      }
      bild.setze(px, py, s.toene[ton as TonIndex] as Pixel);
    }
  }

  // 3. Streupixel innerhalb der Schicht aufräumen (wie puppe.ts aufraeumen), Glanz bleibt
  const glanz = optionen.glanz ?? new Set<Pixel>();
  for (let runde = 0; runde < AUFRAEUM_RUNDEN; runde++) {
    let geaendert = 0;
    for (let py = 0; py < hoehe; py++) {
      for (let px = 0; px < breite; px++) {
        const t = an(px, py);
        const p = bild.hole(px, py);
        if (t === null || glanz.has(p)) continue;
        if (NACHBARN_8.some(([dx, dy]) => bild.hole(px + dx, py + dy) === p)) continue;
        // Spitze aus einem Pixel (höchstens ein Kantennachbar): entfällt, die Kontur schließt darüber
        if (NACHBARN_4.filter(([dx, dy]) => an(px + dx, py + dy) !== null).length <= 1) {
          feld[py * breite + px] = null;
          bild.setze(px, py, DURCHSICHTIG);
          geaendert++;
          continue;
        }
        const zahl = new Map<Pixel, number>();
        let beste: Pixel = p;
        let besteZahl = 0;
        for (const [dx, dy] of NACHBARN_8) {
          const n = an(px + dx, py + dy);
          if (n === null || n.schicht !== t.schicht) continue;
          const q = bild.hole(px + dx, py + dy);
          const z = (zahl.get(q) ?? 0) + 1;
          zahl.set(q, z);
          if (z > besteZahl) {
            besteZahl = z;
            beste = q;
          }
        }
        if (besteZahl === 0) {
          // kein Nachbar derselben Schicht (Splitter einer gedrehten Schicht): häufigste deckende Farbe ringsum (wie puppe.ts)
          for (const [dx, dy] of NACHBARN_8) {
            if (an(px + dx, py + dy) === null) continue;
            const q = bild.hole(px + dx, py + dy);
            const z = (zahl.get(q) ?? 0) + 1;
            zahl.set(q, z);
            if (z > besteZahl) {
              besteZahl = z;
              beste = q;
            }
          }
        }
        if (besteZahl > 0 && beste !== p) {
          bild.setze(px, py, beste);
          geaendert++;
        }
      }
    }
    if (geaendert === 0) break;
  }

  // 4. Symbole (Bitmuster bis 8 × 8)
  for (const m of optionen.masken ?? []) {
    if (m.zeilen.length > MASKE_MAX || m.zeilen.some((z) => z.length > MASKE_MAX)) throw new Error('malen: Maske größer als 8 × 8');
    const traeger = namen.get(m.auf);
    if (traeger === undefined) throw new Error(`malen: Träger ${m.auf} der Maske fehlt`);
    m.zeilen.forEach((zeile, j) => {
      for (let i = 0; i < zeile.length; i++) {
        const c = zeile[i] as string;
        if (c === '.') continue;
        const farbe = m.farben[c];
        if (farbe === undefined) throw new Error(`malen: Maske, Zeichen '${c}' ohne Farbe`);
        const px = Math.round(m.ursprung.x) + i - bx;
        const py = Math.round(m.ursprung.y) + j - by;
        const t = an(px, py);
        if (t === null || t.schicht !== traeger) continue;
        bild.setze(px, py, farbe);
      }
    });
  }

  // 5. Außenkontur; eingeschlossene Lücken von 1 px zwischen Formen bekämen eine einzelne
  // Konturfarbe (Streupixel): sie nehmen die häufigste Farbe ringsum an
  if (optionen.kontur !== false) {
    konturAussen(bild, KONTUR);
    for (let py = 0; py < hoehe; py++) {
      for (let px = 0; px < breite; px++) {
        if (an(px, py) !== null || bild.hole(px, py) !== KONTUR) continue;
        if (NACHBARN_8.some(([dx, dy]) => bild.hole(px + dx, py + dy) === KONTUR)) continue;
        if (!NACHBARN_4.every(([dx, dy]) => an(px + dx, py + dy) !== null)) continue;
        const zahl = new Map<Pixel, number>();
        let beste: Pixel = KONTUR;
        let besteZahl = 0;
        for (const [dx, dy] of NACHBARN_8) {
          const q = bild.hole(px + dx, py + dy);
          if (an(px + dx, py + dy) === null) continue;
          const z = (zahl.get(q) ?? 0) + 1;
          zahl.set(q, z);
          if (z > besteZahl) {
            besteZahl = z;
            beste = q;
          }
        }
        bild.setze(px, py, beste);
      }
    }
  }
  return { leinwand: bild, ankerX: -bx, ankerY: -by, dauer };
}

// ===========================================================================
// Formen (kurz)
// ===========================================================================

export const P = (x: number, y: number): Punkt => ({ x, y });
export const kapsel = (ax: number, ay: number, bx: number, by: number, ra: number, rb: number = ra): Form => ({ art: 'kapsel', a: P(ax, ay), b: P(bx, by), ra, rb });
export const ellipse = (mx: number, my: number, rx: number, ry: number, winkel: number = 0): Form => ({ art: 'ellipse', m: P(mx, my), rx, ry, winkel });
export const polygon = (...punkte: [number, number][]): Form => ({ art: 'polygon', punkte: punkte.map(([x, y]) => P(x, y)) });
/** Rechteck über die Pixel x0 … x1, y0 … y1 (je einschließlich). */
export const pixelRechteck = (x0: number, y0: number, x1: number, y1: number): Form => polygon([x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]);

/** Tonabbildung aus fünf Farben. */
export const toene = (t0: Pixel, t1: Pixel, t2: Pixel, t3: Pixel, t4: Pixel): Toene => [t0, t1, t2, t3, t4];

/** Schicht, um winkel Grad um den Punkt um gedreht und um v verschoben (für Trümmer im Flug). */
export function schichtBewegt(s: Schicht, winkel: number, um: Punkt, v: Punkt): Schicht {
  const formen = s.formen.map((f) => formBewegt(formBewegt(f, 0, P(-um.x, -um.y)), winkel, P(um.x + v.x, um.y + v.y)));
  const w = s.woelbung;
  let woelbung: Woelbung | undefined = w;
  // Zylinder drehen nicht mit: gedrehte Teile nehmen die Formnormale (Kissen, Kugel, Zylinder der Kapsel)
  if (w !== undefined && (w.art === 'senkrecht' || w.art === 'waagrecht') && winkel !== 0) woelbung = { art: 'form' };
  else if (w !== undefined && w.art === 'senkrecht') woelbung = { art: 'senkrecht', x0: w.x0 + v.x, x1: w.x1 + v.x };
  else if (w !== undefined && w.art === 'waagrecht') woelbung = { art: 'waagrecht', y0: w.y0 + v.y, y1: w.y1 + v.y };
  return { ...s, formen, ...(woelbung !== undefined ? { woelbung } : {}) };
}

// ===========================================================================
// Raketenwerfer und leere Waffe (Auftrag 4, 4: grünes Rohr mit Griff und
// Zielfernrohr, etwa 30 × 10; leere Waffe gleich, aber grau)
// ===========================================================================

/**
 * Maße des Werfers in px (Objektkoordinaten, Anker = Fußpunkt unter dem Griff
 * beim liegenden Werfer; mit Kontur 30 × 10, Auftrag 4, 4). Innen 28 × 8,
 * je Teil die Pixel (einschließlich): Rohr x −12 … 11, y −6 … −3 (4 px
 * dick); Mündungsring x 12 … 13, y −7 … −2; Heckrand x −14 … −13,
 * y −6 … −3; Zielfernrohr x 0 … 6, y −8 … −7 (Linse vorn bei x 6);
 * Griff x −4 … −2, y −2 … −1 (schräg nach hinten); Schulterpolster
 * x −11 … −7, y −2. Vela (G1) und der Zünder (G3) tragen dieselbe Form.
 */
export const WERFER = {
  rohr: { x0: -12, x1: 11, y0: -6, y1: -3 },
  muendung: { x0: 12, x1: 13, y0: -7, y1: -2 },
  heck: { x0: -14, x1: -13, y0: -6, y1: -3 },
  fernrohr: { x0: 0, x1: 6, y0: -8, y1: -7 },
  griff: { x0: -4, x1: -2, y0: -2, y1: -1 },
  polster: { x0: -11, x1: -7, y0: -2, y1: -2 },
  /** Griffpunkt (Mitte der Hand) in Objektkoordinaten. */
  griffpunkt: P(-3, -1.5),
  /** Mündung (vorderste Innenspalte, Rohrachse) in Objektkoordinaten. */
  muendungspunkt: P(13, -4),
} as const;

type WerferTeil = 'rohr' | 'muendung' | 'heck' | 'fernrohr' | 'linse' | 'griff' | 'polster' | 'glanz';

/** Formen des Werfers je Teil (Objektkoordinaten wie WERFER). */
export function werferFormen(): Readonly<Record<WerferTeil, readonly Form[]>> {
  const w = WERFER;
  const r = (t: { x0: number; x1: number; y0: number; y1: number }): Form => pixelRechteck(t.x0, t.y0, t.x1, t.y1);
  return {
    rohr: [r(w.rohr)],
    muendung: [r(w.muendung)],
    heck: [r(w.heck)],
    fernrohr: [r(w.fernrohr)],
    linse: [pixelRechteck(w.fernrohr.x1, w.fernrohr.y0, w.fernrohr.x1, w.fernrohr.y0)],
    // Griff schräg nach hinten unten (untere Zeile 1 px weiter hinten)
    griff: [polygon([w.griff.x0, w.griff.y0], [w.griff.x1 + 1, w.griff.y0], [w.griff.x1, w.griff.y1 + 1], [w.griff.x0 - 1, w.griff.y1 + 1])],
    polster: [r(w.polster)],
    // Glanzlinie auf der Lichtseite des Rohrs (zweite Zeile, je 3 px hinter und vor dem Fernrohr)
    glanz: [pixelRechteck(-9, w.rohr.y0 + 1, -7, w.rohr.y0 + 1), pixelRechteck(8, w.rohr.y0 + 1, 9, w.rohr.y0 + 1)],
  };
}

const R = ROHR_GRUEN.treppe;
const S = STAHL.treppe;
const G = OVERALL_BOLZER.treppe;

/**
 * Farben des Werfers (7 plus durchsichtig, Farbbudget Gegenstand 8): KONTUR
 * (Außen- und Innenkontur), ROHR_GRUEN 1 bis 3 (Rohr), STAHL 1, 2
 * (Mündungsring, Heckrand, Fernrohr, Griff, Polster), STAHL 4 (Glanz von
 * Rohr und Linse). Leere Waffe: Rohr in OVERALL_BOLZER 1 bis 3 (grau).
 */
export const WERFER_FARBEN = {
  rohr: toene(KONTUR, R[1], R[2], R[3], S[4]),
  rohrLeer: toene(KONTUR, G[1], G[2], G[3], S[4]),
  beschlag: toene(KONTUR, S[1], S[2], S[2], S[4]),
  glanz: S[4],
} as const;

/** Raketenwerfer (leer: grau) als Bild, Anker am Fußpunkt. */
export function werferBild(leer: boolean, dauer: number = 0): Bild {
  const f = werferFormen();
  const w = WERFER;
  const rohr = leer ? WERFER_FARBEN.rohrLeer : WERFER_FARBEN.rohr;
  const b = WERFER_FARBEN.beschlag;
  const quer = (t: { y0: number; y1: number }): Woelbung => ({ art: 'waagrecht', y0: t.y0, y1: t.y1 + 1 });
  return malen(
    [
      { name: 'griff', formen: f.griff, toene: b, gruppe: 'griff', woelbung: { art: 'flach' } },
      { name: 'polster', formen: f.polster, toene: b, gruppe: 'polster', woelbung: { art: 'flach' }, stufe: -1 },
      { name: 'rohr', formen: f.rohr, toene: rohr, gruppe: 'rohr', woelbung: quer(w.rohr) },
      { name: 'glanz', formen: f.glanz, toene: rohr, gruppe: 'rohr', ton: 4, auf: 'rohr' },
      { name: 'heck', formen: f.heck, toene: b, gruppe: 'heck', woelbung: quer(w.heck) },
      { name: 'muendung', formen: f.muendung, toene: b, gruppe: 'muendung', woelbung: quer(w.muendung) },
      { name: 'fernrohr', formen: f.fernrohr, toene: b, gruppe: 'fernrohr', woelbung: quer(w.fernrohr) },
      { name: 'linse', formen: f.linse, toene: b, gruppe: 'fernrohr', ton: 4 },
    ],
    dauer,
    { glanz: new Set([WERFER_FARBEN.glanz]) },
  );
}

// ===========================================================================
// Rakete (Auftrag 4, 4: gelbe Spitze, grauer Körper, Flamme hinten, etwa
// 16 × 6; die des Zünders rot statt gelb)
// ===========================================================================

/**
 * Maße der Rakete in px (Anker in der Mitte, Zeile unter der Achse; mit
 * Kontur 16 × 6, innen 14 × 4): Flamme x −8 … −5, y −1 … 0 (kurz: ab
 * x −7); Leitwerk x −4 … −3, y −2 … 1 (dunkel); Körper x −2 … 2, y −2 … 1;
 * Spitze x 3 … 5: Zeilen −1 und 0 drei px, Zeilen −2 und 1 ein px (spitz).
 * Nach rechts gerichtet, die Darstellung spiegelt nach bahn_richtung.
 */
export const RAKETE = {
  flamme: { x0: -8, x1: -5, y0: -1, y1: 0 },
  leitwerk: { x0: -4, x1: -3 },
  koerper: { x0: -2, x1: 2, y0: -2, y1: 1 },
  spitze: { x0: 3, x1: 5 },
} as const;

/** Frames je Flammenbild (Auftrag 4, G4: 2 Bilder Flammenflackern; Festlegung G4: Wechsel alle 2 Frames). */
export const RAKETE_FLACKERN = 2;

const FE = FEUER.treppe;

/**
 * Rakete (Figur: RAKETE_GELB, Zünder: RAKETE_ROT) mit langer oder kurzer
 * Flamme. Farben (7 plus durchsichtig): KONTUR, STAHL 1 bis 3, Spitze Ton 2,
 * FEUER 2 (Flamme), FEUER 4 (Flammenkern, Licht der Spitze).
 */
function raketeBild(spitze: readonly Pixel[], lang: boolean): Bild {
  const r = RAKETE;
  const k = r.koerper;
  const fl = r.flamme;
  const quer: Woelbung = { art: 'waagrecht', y0: k.y0, y1: k.y1 + 1 };
  const flammeAussen = toene(KONTUR, FE[2], FE[2], FE[2], FE[2]);
  const flammeKern = toene(KONTUR, FE[4], FE[4], FE[4], FE[4]);
  return malen(
    [
      // Flamme: außen orange, Kern hell; lang: Kern 2 px, kurz: Kern 1 px
      { name: 'flamme', formen: [pixelRechteck(lang ? fl.x0 : fl.x0 + 1, fl.y0, fl.x1, fl.y1)], toene: flammeAussen, gruppe: 'flamme', ton: 2 },
      { name: 'kern', formen: [pixelRechteck(lang ? fl.x1 - 1 : fl.x1, fl.y0, fl.x1, fl.y1)], toene: flammeKern, gruppe: 'flamme', ton: 2 },
      { name: 'leitwerk', formen: [pixelRechteck(r.leitwerk.x0, k.y0, r.leitwerk.x1, k.y1)], toene: toene(KONTUR, S[1], S[1], S[2], S[2]), gruppe: 'leitwerk', woelbung: quer, stufe: -1 },
      { name: 'koerper', formen: [pixelRechteck(k.x0, k.y0, k.x1, k.y1)], toene: toene(KONTUR, S[1], S[2], S[3], S[3]), gruppe: 'koerper', woelbung: quer },
      {
        name: 'spitze',
        formen: [pixelRechteck(r.spitze.x0, k.y0, r.spitze.x0, k.y1), pixelRechteck(r.spitze.x0, k.y0 + 1, r.spitze.x1, k.y1 - 1)],
        toene: toene(KONTUR, spitze[2] as Pixel, spitze[2] as Pixel, FE[4], FE[4]),
        gruppe: 'spitze',
        woelbung: quer,
      },
    ],
    RAKETE_FLACKERN,
  );
}

// ===========================================================================
// Essen (Auftrag 4, 4): Kometenbraten etwa 28 × 18, Eisnudelschale etwa
// 20 × 14, Sternbeeren etwa 14 × 12; Anker am Fußpunkt (Mitte unten)
// ===========================================================================

/** Polygonpunkte auf einem Ellipsenbogen von Winkel a0 bis a1 (Grad, 0 = rechts, 90 = unten), n Schritte. */
export function bogen(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): [number, number][] {
  const aus: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    aus.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return aus;
}

/** Pixel eines kleinen Bitmusters (Symbol bis 8 × 8, Auftrag 4, 6) als Formen ab (x0, y0). */
export function musterFormen(x0: number, y0: number, zeilen: readonly string[]): Form[] {
  if (zeilen.length > MASKE_MAX || zeilen.some((z) => z.length > MASKE_MAX)) throw new Error('musterFormen: größer als 8 × 8');
  const aus: Form[] = [];
  zeilen.forEach((z, j) => {
    for (let i = 0; i < z.length; i++) if (z[i] !== '.') aus.push(pixelRechteck(x0 + i, y0 + j, x0 + i, y0 + j));
  });
  return aus;
}

const B = BRATEN.treppe;
const N = NUDEL.treppe;
const SB = SCHALE_BLAU.treppe;
const ST = STERNBEERE.treppe;
const BG = BLATT_GRUEN.treppe;

/** Dampfkringel (Symbol 2 × 3): Zickzacklinie, steigt nach oben. */
const DAMPF = ['.x', 'x.', '.x'];

/**
 * Kometenbraten (28 × 18 mit Kontur): glasierter Braten (Kugel, Glanz in
 * Cremeweiß wie die Glasur) auf einer ovalen Stahlplatte, Knochen rechts,
 * zwei Dampfkringel. Farben (7): KONTUR, BRATEN 1 bis 3, NUDEL 3 (Glanz der
 * Glasur, Knochen), STAHL 2 und 3 (Platte, Dampf).
 */
function kometenbraten(): Bild {
  const braten = toene(KONTUR, B[1], B[2], B[3], N[3]);
  const platte = toene(KONTUR, S[2], S[2], S[3], S[3]);
  const knochen = toene(KONTUR, B[3], N[3], N[3], N[3]);
  return malen(
    [
      { name: 'platte', formen: [ellipse(0, -3, 13, 3)], toene: platte, gruppe: 'platte', relief: 0.8 },
      { name: 'mulde', formen: [ellipse(0, -3.6, 10, 1.8)], toene: platte, gruppe: 'platte', ton: 1 },
      { name: 'knochen', formen: [kapsel(5, -8.4, 10.5, -10.6, 1.2), ellipse(11.3, -11.7, 1.4, 1.2), ellipse(12, -10.1, 1.2, 1.2)], toene: knochen, gruppe: 'knochen' },
      { name: 'braten', formen: [ellipse(-1.5, -8, 9.2, 5, -6)], toene: braten, gruppe: 'braten' },
      // Glanz der Glasur: kurzer Streifen oben links (statt der ganzen Lichtkappe)
      { name: 'glasur', formen: [kapsel(-7.4, -9.6, -4.6, -11.6, 0.6)], toene: braten, gruppe: 'braten', ton: 4, auf: 'braten' },
      // Einschnitte der Kruste (zwei kurze Kerben im Schatten)
      { name: 'kerben', formen: [kapsel(-2, -11.6, 0, -9.8, 0.5), kapsel(2.5, -10.8, 4.3, -9, 0.5)], toene: braten, gruppe: 'braten', ton: 1, auf: 'braten' },
      { name: 'dampf', formen: [...musterFormen(-5, -16, DAMPF), ...musterFormen(1, -16, DAMPF)], toene: knochen, gruppe: 'dampf', ton: 2 },
    ],
    0,
    { glanz: new Set([N[3] as Pixel]) },
  );
}

/**
 * Eisnudelschale (20 × 14 mit Kontur): blaue Schale (halbe Ellipse mit Fuß,
 * heller Randstreifen), Nudelberg mit Wellenlinien, zwei Stäbchen.
 * Farben (7): KONTUR, SCHALE_BLAU 1 bis 3 (Schale; 3 auch die lackierten
 * Stäbchen), NUDEL 1 (Wellenlinien), NUDEL 2 und 4 (Nudeln, Glanz).
 */
function eisnudelschale(): Bild {
  const schale = toene(KONTUR, SB[1], SB[2], SB[3], N[4]);
  const nudel = toene(KONTUR, N[1], N[2], N[2], N[4]);
  const stab = toene(KONTUR, SB[3], SB[3], SB[3], SB[3]);
  return malen(
    [
      { name: 'stab2', formen: [kapsel(1, -8, 7.6, -11.9, 0.55)], toene: stab, gruppe: 'stab2', ton: 2 },
      { name: 'nudeln', formen: [ellipse(-0.5, -7.2, 7.6, 4.6)], toene: nudel, gruppe: 'nudeln', glanz: true },
      { name: 'wellen', formen: [kapsel(-5.5, -8.2, -3.2, -9.4, 0.5), kapsel(-2.2, -10.2, 0.4, -9.2, 0.5), kapsel(-3.6, -6.4, -0.8, -7.4, 0.5), kapsel(1.6, -7.8, 4.4, -8.8, 0.5)], toene: nudel, gruppe: 'nudeln', ton: 1, auf: 'nudeln' },
      { name: 'stab1', formen: [kapsel(3, -7, 8.6, -11, 0.55)], toene: stab, gruppe: 'stab1', ton: 2 },
      { name: 'fuss', formen: [pixelRechteck(-3, -2, 2, -1)], toene: schale, gruppe: 'schale', woelbung: { art: 'senkrecht', x0: -3, x1: 3 } },
      { name: 'schale', formen: [polygon(...bogen(0, -7, 9, 5.6, 0, 180, 24))], toene: schale, gruppe: 'schale', woelbung: { art: 'senkrecht', x0: -9, x1: 9 }, glanz: true },
      { name: 'rand', formen: [polygon([-9, -7], [9, -7], [8.9, -6], [-8.9, -6])], toene: schale, gruppe: 'schale', stufe: 1, woelbung: { art: 'senkrecht', x0: -9, x1: 9 }, auf: 'schale' },
    ],
    0,
    { glanz: new Set([N[4] as Pixel]) },
  );
}

/**
 * Sternbeeren (14 × 12 mit Kontur): Büschel aus fünf leuchtenden Beeren
 * (Kugeln mit Glanzpunkt) mit Blatt und Stiel. Farben (7): KONTUR,
 * STERNBEERE 1 bis 4, BLATT_GRUEN 2 und 3.
 */
function sternbeeren(): Bild {
  const beere = toene(KONTUR, ST[1], ST[2], ST[3], ST[4]);
  const blatt = toene(KONTUR, BG[2], BG[2], BG[3], BG[3]);
  const lagen: [number, number][] = [
    [-1.2, -6],
    [2.8, -6],
    [-3.2, -2.3],
    [0.8, -2.3],
    [4.8, -2.3],
  ];
  return malen(
    [
      { name: 'stiel', formen: [kapsel(0.8, -7.6, 1.4, -9.4, 0.55)], toene: blatt, gruppe: 'stiel', ton: 2 },
      { name: 'blatt', formen: [ellipse(-2.4, -8.6, 2.8, 1.3, 20)], toene: blatt, gruppe: 'blatt' },
      ...lagen.map(([x, y], i) => ({ name: `beere${i}`, formen: [ellipse(x, y, 2.2, 2.2)], toene: beere, gruppe: `beere${i}`, glanz: true }) as Schicht),
    ],
    0,
    { glanz: new Set([ST[4] as Pixel]) },
  );
}

// ===========================================================================
// Behälter (Auftrag 4, 4): Fass 24 × 32, Bosskiste 40 × 28 (werte.ts
// BEHAELTER_HALB_X · 2 = 24, BEHAELTER_HOEHE = 32); Anker am Fußpunkt
// ===========================================================================

/** Halbe Breite und Höhe des Fasses innen (ohne Kontur): 11 und 30 px (24 × 32 mit Kontur, werte.ts). */
const FASS_RX = BEHAELTER_HALB_X - 1;
const FASS_H = BEHAELTER_HOEHE - 2;
/** Halbe Höhe der Ellipsen von Deckel und Boden (Aufsicht von schräg oben, Festlegung G4). */
const FASS_RY = 2.4;
/** Rollreifen (je eine helle und eine dunkle Zeile) und Band (6 Zeilen), Zeilen über dem Boden. */
const FASS_REIFEN: readonly number[] = [-24, -7];
const FASS_BAND = { y0: -18, y1: -13 } as const;

const F = FASS_STAHLBLAU.treppe;
const O = SIGNAL_ORANGE.treppe;

/** Perihel-Zeichen (Symbol 7 × 4): abstrakter Komet, runder Kopf rechts, zwei Schweifstreifen nach links. */
const KOMET = ['....xx.', 'xxx.xxx', '...xxxx', 'xx..xx.'];

/** Farben des Fasses (7): KONTUR, FASS_STAHLBLAU 1 bis 4, SIGNAL_ORANGE 1 und 2. */
const FASS_FARBEN = {
  mantel: toene(KONTUR, F[1], F[2], F[3], F[4]),
  band: toene(KONTUR, O[1], O[2], O[2], O[2]),
  glanz: F[4] as Pixel,
} as const;

/** Schichten des ganzen Fasses (Objektkoordinaten), optional nur innerhalb eines Trümmerteils. */
function fassSchichten(): Schicht[] {
  const m = FASS_FARBEN.mantel;
  const zyl: Woelbung = { art: 'senkrecht', x0: -FASS_RX, x1: FASS_RX };
  const oben = -FASS_H + FASS_RY;
  const reifen: Schicht[] = FASS_REIFEN.flatMap((y, i) => [
    { name: `reifen${i}h`, formen: [polygon([-FASS_RX, y], [FASS_RX, y], [FASS_RX, y + 1], [-FASS_RX, y + 1])], toene: m, gruppe: 'mantel', woelbung: zyl, stufe: 1, auf: 'mantel' },
    { name: `reifen${i}d`, formen: [polygon([-FASS_RX, y + 1], [FASS_RX, y + 1], [FASS_RX, y + 2], [-FASS_RX, y + 2])], toene: m, gruppe: 'mantel', woelbung: zyl, stufe: -1, auf: 'mantel' },
  ]);
  return [
    { name: 'mantel', formen: [polygon([-FASS_RX, oben], [FASS_RX, oben], ...bogen(0, -FASS_RY, FASS_RX, FASS_RY, 0, 180, 16))], toene: m, gruppe: 'mantel', woelbung: zyl, glanz: true },
    ...reifen,
    { name: 'band', formen: [pixelRechteck(-FASS_RX, FASS_BAND.y0, FASS_RX - 1, FASS_BAND.y1)], toene: FASS_FARBEN.band, gruppe: 'band', woelbung: zyl, auf: 'mantel' },
    // Glanzstreifen auf der Lichtseite (1 px, zwischen den Reifen und dem Band unterbrochen)
    { name: 'glanz', formen: [pixelRechteck(-7, -22, -7, -19), pixelRechteck(-7, -12, -7, -9), pixelRechteck(-7, -5, -7, -3)], toene: m, gruppe: 'mantel', ton: 4, auf: 'mantel' },
    { name: 'deckel', formen: [ellipse(0, oben, FASS_RX, FASS_RY)], toene: m, gruppe: 'deckel', stufe: 1, relief: 0.5 },
    { name: 'mulde', formen: [ellipse(-0.5, oben + 0.3, FASS_RX - 2.5, FASS_RY - 1)], toene: m, gruppe: 'deckel', ton: 2, auf: 'deckel' },
    { name: 'spund', formen: [ellipse(4.5, oben, 1.6, 0.9)], toene: m, gruppe: 'deckel', ton: 4, auf: 'deckel' },
  ];
}

/** Maske des Perihel-Zeichens auf dem Band (Mitte etwas links, auf der Lichtseite). */
const FASS_ZEICHEN: Maske = { ursprung: P(-6, FASS_BAND.y0 + 1), zeilen: KOMET, farben: { x: KONTUR }, auf: 'band' };

/** Fass, ganz. */
function fass(): Bild {
  return malen(fassSchichten(), 0, { masken: [FASS_ZEICHEN], glanz: new Set([FASS_FARBEN.glanz]) });
}

/** Bosskiste (Asservatenkiste): innen 38 × 26 (40 × 28 mit Kontur, Auftrag 4, 4); Deckel 6 Zeilen in Aufsicht. */
const KISTE = { x0: -19, x1: 18, y0: -26, deckelBis: -21, y1: -1 } as const;
/** Bretterfugen der Vorderseite (Zeilen) und Eckpfosten (3 px breit). */
const KISTE_FUGEN: readonly number[] = [-14, -8];
const KISTE_PFOSTEN = 3;
/** Siegelstreifen (4 px breit, über Deckel und Vorderseite) und Siegel (Mitte, Radius). */
const KISTE_SIEGEL = { x0: -2, x1: 1, siegelY: -11, siegelR: 3.2 } as const;
/** Aktenschild auf der Vorderseite links (Pixel, einschließlich; Festlegung G4). */
const KISTE_SCHILD = { x0: -13, x1: -6, y0: -19, y1: -15 } as const;

const K = KISTE_GRAU.treppe;
const SR = SIEGEL_ROT.treppe;
const H = HOLZ.treppe;

/** Farben der Bosskiste (7): KONTUR, KISTE_GRAU 1 bis 3, SIEGEL_ROT 1 bis 3. */
const KISTE_FARBEN = {
  kiste: toene(KONTUR, K[1], K[2], K[3], K[3]),
  siegel: toene(KONTUR, SR[1], SR[2], SR[3], SR[3]),
} as const;

/** Bosskiste, ganz: Vorderseite mit Fugen, Eckpfosten, heller Deckel, roter Siegelstreifen mit Siegel. */
function bosskiste(): Bild {
  const k = KISTE;
  const kf = KISTE_FARBEN.kiste;
  const sf = KISTE_FARBEN.siegel;
  return malen(
    [
      { name: 'vorne', formen: [pixelRechteck(k.x0, k.deckelBis + 1, k.x1, k.y1)], toene: kf, gruppe: 'vorne', kissen: 2 },
      { name: 'fugen', formen: KISTE_FUGEN.map((y) => pixelRechteck(k.x0, y, k.x1, y)), toene: kf, gruppe: 'vorne', ton: 1, auf: 'vorne' },
      { name: 'pfostenL', formen: [pixelRechteck(k.x0, k.deckelBis + 1, k.x0 + KISTE_PFOSTEN - 1, k.y1)], toene: kf, gruppe: 'pfostenL', kissen: 1.5 },
      { name: 'pfostenR', formen: [pixelRechteck(k.x1 - KISTE_PFOSTEN + 1, k.deckelBis + 1, k.x1, k.y1)], toene: kf, gruppe: 'pfostenR', kissen: 1.5, stufe: -1 },
      { name: 'deckel', formen: [pixelRechteck(k.x0, k.y0, k.x1, k.deckelBis)], toene: kf, gruppe: 'deckel', woelbung: { art: 'flach' }, stufe: 1 },
      { name: 'bandD', formen: [pixelRechteck(KISTE_SIEGEL.x0, k.y0, KISTE_SIEGEL.x1, k.deckelBis)], toene: sf, gruppe: 'band', woelbung: { art: 'flach' }, stufe: 1, auf: 'deckel' },
      { name: 'bandV', formen: [pixelRechteck(KISTE_SIEGEL.x0, k.deckelBis + 1, KISTE_SIEGEL.x1, k.y1)], toene: sf, gruppe: 'band', kissen: 1, auf: 'vorne' },
      { name: 'siegel', formen: [ellipse((KISTE_SIEGEL.x0 + KISTE_SIEGEL.x1 + 1) / 2, KISTE_SIEGEL.siegelY, KISTE_SIEGEL.siegelR, KISTE_SIEGEL.siegelR)], toene: sf, gruppe: 'siegel' },
      // Aktenschild links (hell, zwei Schriftzeilen angedeutet)
      { name: 'schild', formen: [pixelRechteck(KISTE_SCHILD.x0, KISTE_SCHILD.y0, KISTE_SCHILD.x1, KISTE_SCHILD.y1)], toene: kf, gruppe: 'schild', woelbung: { art: 'flach' }, stufe: 1 },
      { name: 'zeilen', formen: [pixelRechteck(KISTE_SCHILD.x0 + 1, KISTE_SCHILD.y0 + 1, KISTE_SCHILD.x1 - 1, KISTE_SCHILD.y0 + 1), pixelRechteck(KISTE_SCHILD.x0 + 1, KISTE_SCHILD.y0 + 3, KISTE_SCHILD.x1 - 3, KISTE_SCHILD.y0 + 3)], toene: kf, gruppe: 'schild', ton: 1, auf: 'schild' },
    ],
    0,
  );
}

// ===========================================================================
// Trümmer (Auftrag 4, 4: Fass in vier Trümmerteile, Bosskiste in vier
// Bretter). Der Kern kennt zerbrochene Behälter nur im Frame h (Welt 9.2);
// die Trümmer sind reine Darstellung (docs/grafik.md 4.7).
// ===========================================================================

/** Ein Trümmerteil: Schichten in Objektkoordinaten des ganzen Behälters, Drehpunkt. */
interface Truemmerteil {
  readonly schichten: readonly Schicht[];
  readonly um: Punkt;
  /** bleibt am Boden stehen (trägt den Anker in jedem Bild). */
  readonly fest?: boolean;
}

/** Lage eines Teils in einem Bild: Versatz, Drehung (Grad), liegt am Boden (unterste Kante auf y = 0). */
interface TeilLage {
  readonly dx: number;
  readonly dy: number;
  readonly w: number;
  readonly boden?: boolean;
}

/** Unterste Kante der Formen (größtes y), bei Ellipsen genau aus der Drehung. */
function untersteKante(schichten: readonly Schicht[]): number {
  let y = -Infinity;
  for (const s of schichten) {
    for (const f of s.formen) {
      if (f.art === 'ellipse') {
        const w = (f.winkel * Math.PI) / 180;
        y = Math.max(y, f.m.y + Math.sqrt((f.rx * Math.sin(w)) ** 2 + (f.ry * Math.cos(w)) ** 2));
      } else y = Math.max(y, formGrenzen(f).y1);
    }
  }
  return y;
}

/** Trümmerbild: jedes Teil gedreht und verschoben; nie unter dem Boden, mit boden genau aufliegend. */
function truemmerBild(teile: readonly Truemmerteil[], lagen: readonly TeilLage[], dauer: number, glanz: ReadonlySet<Pixel>): Bild {
  const schichten: Schicht[] = [];
  teile.forEach((t, i) => {
    const l = lagen[i] as TeilLage;
    let bewegt = t.schichten.map((s) => schichtBewegt(s, l.w, t.um, P(l.dx, l.dy)));
    const unten = untersteKante(bewegt);
    if (l.boden === true || unten > 0) bewegt = bewegt.map((s) => schichtBewegt(s, 0, P(0, 0), P(0, -unten)));
    schichten.push(...bewegt);
  });
  return malen(schichten, dauer, { glanz });
}

/** Dauern der Trümmer: Bersten, Flug (drei Bilder), Liegen (Festlegung G4; Summe 48 = Flug des Inhalts, werte.ts GEGENSTAND_FLUG). */
export const TRUEMMER_DAUERN: readonly number[] = [2, 4, 4, 6, 32];

/** Teile des Fasses: Bodenstumpf (bleibt), linke und rechte Daube, Deckel; Bruchkanten gezackt. */
function fassTeile(): Truemmerteil[] {
  const ganz = fassSchichten();
  const nach = (n: string): Schicht => ganz.find((s) => s.name === n) as Schicht;
  const oben = -FASS_H + FASS_RY;
  const mantel = nach('mantel');
  // Bruchlinien (Objektkoordinaten): waagrecht über dem unteren Reifen, senkrecht in der Mitte
  const unten: [number, number][] = [[FASS_RX, -10], [7, -8], [3, -11], [0, -9], [-4, -12], [-7, -9], [-FASS_RX, -11]];
  const mitte: [number, number][] = [[-3, oben], [-1, -24], [-4, -20], [-1, -16], [-4, -12]];
  const stuecke: Record<string, [number, number][]> = {
    stumpf: [...bogen(0, -FASS_RY, FASS_RX, FASS_RY, 0, 180, 16), ...unten.slice().reverse()],
    links: [[-FASS_RX, oben], ...mitte, [-7, -9], [-FASS_RX, -11]],
    rechts: [[-3, oben], [FASS_RX, oben], [FASS_RX, -10], [7, -8], [3, -11], [0, -9], ...mitte.slice(1).reverse()],
  };
  const teil = (n: string): Truemmerteil => {
    const pkt = stuecke[n] as [number, number][];
    const traeger: Schicht = { ...mantel, name: `${n}_mantel`, formen: [polygon(...pkt)], gruppe: n };
    const auf = ganz
      .filter((s) => s.auf === 'mantel')
      .map((s) => ({ ...s, name: `${n}_${s.name}`, auf: traeger.name, gruppe: s.gruppe === 'mantel' ? n : `${n}_${s.gruppe}` }));
    const xs = pkt.map((q) => q[0]);
    const ys = pkt.map((q) => q[1]);
    return { schichten: [traeger, ...auf], um: P((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2), ...(n === 'stumpf' ? { fest: true } : {}) };
  };
  const deckel: Truemmerteil = {
    schichten: ganz.filter((s) => s.name === 'deckel' || s.auf === 'deckel').map((s) => ({ ...s, name: `deckel_${s.name}`, ...(s.auf !== undefined ? { auf: `deckel_${s.auf}` } : {}) })),
    um: P(0, oben),
  };
  return [teil('stumpf'), teil('links'), teil('rechts'), deckel];
}

/** Lagen der Fassteile je Bild (Stumpf, links, rechts, Deckel); Weiten nach Augenmaß (Festlegung G4). */
const FASS_LAGEN: readonly (readonly TeilLage[])[] = [
  [{ dx: 0, dy: 0, w: 0 }, { dx: -2, dy: -1, w: -8 }, { dx: 2, dy: -1, w: 8 }, { dx: 0, dy: -3, w: 0 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -8, dy: -6, w: -35 }, { dx: 9, dy: -7, w: 40 }, { dx: 2, dy: -12, w: 25 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -14, dy: -3, w: -70 }, { dx: 15, dy: -4, w: 80 }, { dx: 5, dy: -16, w: 70 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -19, dy: 0, w: -90, boden: true }, { dx: 20, dy: 0, w: 95, boden: true }, { dx: 8, dy: -6, w: 140 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -20, dy: 0, w: -90, boden: true }, { dx: 21, dy: 0, w: 95, boden: true }, { dx: 13, dy: 0, w: 180, boden: true }],
];

/** Teile der Bosskiste: Bodenbrett (bleibt), zwei Bretter der Vorderseite, Deckel mit Siegelstreifen; Bruchenden zeigen HOLZ. */
function kisteTeile(): Truemmerteil[] {
  const k = KISTE;
  // Farben der Bretter (7): KONTUR, KISTE_GRAU 1 bis 3 (Anstrich), HOLZ 1 und 2 (Bruchenden), SIEGEL_ROT 2
  const kf = KISTE_FARBEN.kiste;
  const sf = toene(KONTUR, SR[2], SR[2], SR[2], SR[2]);
  const holz = toene(KONTUR, H[1], H[2], H[2], H[2]);
  /** Brett: Holzkörper mit gezackten Enden, grauer Anstrich bis 3 px vor den Bruchkanten, optional Siegelstück. */
  const brett = (n: string, pkt: [number, number][], anstrich: Form, siegel?: Form): Truemmerteil => {
    const xs = pkt.map((q) => q[0]);
    const ys = pkt.map((q) => q[1]);
    const schichten: Schicht[] = [
      { name: `${n}_holz`, formen: [polygon(...pkt)], toene: holz, gruppe: n, kissen: 1.5 },
      { name: `${n}_anstrich`, formen: [anstrich], toene: kf, gruppe: n, kissen: 1.5, auf: `${n}_holz` },
      ...(siegel !== undefined ? [{ name: `${n}_siegel`, formen: [siegel], toene: sf, gruppe: n, kissen: 1, auf: `${n}_holz` } as Schicht] : []),
    ];
    return { schichten, um: P((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2), ...(n === 'boden' ? { fest: true } : {}) };
  };
  const r = k.x1 + 1;
  return [
    brett('boden', [[k.x0, -8], [-12, -6], [-5, -9], [3, -7], [10, -9], [r, -7], [r, 0], [k.x0, 0]], pixelRechteck(k.x0, -5, k.x1, -1)),
    brett('links', [[k.x0, -15], [-3, -15], [-1, -12], [-3, -9], [k.x0, -9]], pixelRechteck(k.x0, -15, -6, -9)),
    brett('rechts', [[1, -21], [r, -21], [r, -14], [3, -14], [0, -17]], pixelRechteck(5, -21, k.x1, -14), pixelRechteck(1, -21, 3, -14)),
    brett('deckel', [[k.x0, k.y0], [r, k.y0], [r, -24], [12, -22], [5, -24], [-4, -21], [-11, -23], [k.x0, -21]], pixelRechteck(k.x0, k.y0, k.x1, -24), pixelRechteck(KISTE_SIEGEL.x0, k.y0, KISTE_SIEGEL.x1, -21)),
  ];
}

/** Lagen der Bretter je Bild (Boden, links, rechts, Deckel); Weiten nach Augenmaß (Festlegung G4). */
const KISTE_LAGEN: readonly (readonly TeilLage[])[] = [
  [{ dx: 0, dy: 0, w: 0 }, { dx: -2, dy: -1, w: -6 }, { dx: 2, dy: -1, w: 6 }, { dx: 0, dy: -3, w: 0 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -9, dy: -6, w: -30 }, { dx: 10, dy: -8, w: 35 }, { dx: -2, dy: -12, w: -15 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -16, dy: -2, w: -80 }, { dx: 18, dy: -4, w: 100 }, { dx: -4, dy: -16, w: -35 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -22, dy: 0, w: -150, boden: true }, { dx: 25, dy: 0, w: 160, boden: true }, { dx: -6, dy: -8, w: -20 }],
  [{ dx: 0, dy: 0, w: 0 }, { dx: -24, dy: 0, w: -180, boden: true }, { dx: 26, dy: 0, w: 180, boden: true }, { dx: -8, dy: 0, w: -4, boden: true }],
];

/** Trümmeranimation eines Behälters (Bilder nach TRUEMMER_DAUERN). */
function truemmer(teile: readonly Truemmerteil[], lagen: readonly (readonly TeilLage[])[], glanz: ReadonlySet<Pixel>): Bild[] {
  return lagen.map((l, i) => truemmerBild(teile, l, TRUEMMER_DAUERN[i] as number, glanz));
}

/** Trümmer des Fasses (für G3: Auftritt des Ballast nutzt die der Kiste). */
export function fassTruemmer(): Bild[] {
  return truemmer(fassTeile(), FASS_LAGEN, new Set([FASS_FARBEN.glanz]));
}

/** Trümmer der Bosskiste (vier Bretter). */
export function kisteTruemmer(): Bild[] {
  return truemmer(kisteTeile(), KISTE_LAGEN, new Set());
}

// ===========================================================================
// Animationen
// ===========================================================================

/** Gegenstände und Geschosse (Atlas-Namen nach docs/grafik.md 4.7). */
export function gegenstaendeAnimationen(): Animation[] {
  return [
    { name: 'kometenbraten', schleife: false, bilder: [kometenbraten()] },
    { name: 'eisnudelschale', schleife: false, bilder: [eisnudelschale()] },
    { name: 'sternbeeren', schleife: false, bilder: [sternbeeren()] },
    { name: 'raketenwerfer', schleife: false, bilder: [werferBild(false)] },
    { name: 'waffe_leer', schleife: false, bilder: [werferBild(true)] },
    { name: 'rakete', schleife: true, bilder: [raketeBild(RAKETE_GELB.treppe, true), raketeBild(RAKETE_GELB.treppe, false)] },
    { name: 'rakete_zuender', schleife: true, bilder: [raketeBild(RAKETE_ROT.treppe, true), raketeBild(RAKETE_ROT.treppe, false)] },
    { name: 'fass', schleife: false, bilder: [fass()] },
    { name: 'fass_truemmer', schleife: false, bilder: fassTruemmer() },
    { name: 'bosskiste', schleife: false, bilder: [bosskiste()] },
    { name: 'bosskiste_truemmer', schleife: false, bilder: kisteTruemmer() },
  ];
}

