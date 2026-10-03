// Gliederpuppe (Auftrag 4, 2.4): Figuren aus Teilen (Kapseln, Ellipsen,
// Polygone) mit Gelenken. Eine Pose ist eine Tabelle aus Gelenkwinkeln
// (Grad, relativ zum Elternteil) und Versätzen plus Sonderformen,
// Zeichenreihenfolge und versteckten Teilen. Rastern nach dem
// Pixelmittelpunkt; Ton aus Normale und Licht in harten Stufen; Innenkontur
// zwischen Gruppen; Tonabbildung je Figur (geteilte Treppen); Gesichtsmaske;
// Streupixel entfernen; Außenkontur. Konventionen in docs/grafik.md 2.2:
// Fußpunkt (0, 0), Winkel 0 nach unten, +90 nach vorn. Keine Farbwerte und
// keine Figurmaße in dieser Datei.

import type { Form, Punkt } from './geometrie.ts';
import { GRAD, HALB, drehe, ellipseLage, formBewegt, formGespiegelt, formGrenzen, inForm, kapselLage, streckenAbstand } from './geometrie.ts';
import type { Pixel } from './leinwand.ts';
import { DURCHSICHTIG, Leinwand } from './leinwand.ts';
import { NACHBARN_4, NACHBARN_8, konturAussen } from './kontur.ts';
import type { Schwellen } from './licht.ts';
import { SCHWELLEN_FIGUR, helligkeit, kissenNormale, tonAusHelligkeit, zylinderNormale } from './licht.ts';
import type { TonIndex } from './palette.ts';

/** Definition eines Teils. */
export interface TeilDef {
  readonly name: string;
  /** Elternteil (muss vorher definiert sein); null: Wurzel (Becken). */
  readonly eltern: string | null;
  /** Lage des eigenen Gelenks im Rahmen des Elternteils (Elterngelenk = 0, 0; Elternwinkel 0 = nach unten). */
  readonly gelenk: Punkt;
  /** Formen im eigenen Rahmen (Gelenk = 0, 0; bei Winkel 0 hängt das Teil nach unten); spätere Formen liegen oben. */
  readonly formen: readonly Form[];
  /** Sonderformen (z. B. 'offen' für die Hand), wählbar je Pose. */
  readonly varianten?: Readonly<Record<string, readonly Form[]>>;
  /** Materialname, Schlüssel der Tonabbildung im Stil der Figur. */
  readonly material: string;
  /** Innenkonturen nur zwischen verschiedenen Gruppen oder Materialien. */
  readonly gruppe: string;
  /** Zeichenreihenfolge: größer liegt weiter vorn (je Pose überschreibbar). */
  readonly ebene: number;
  /** Glanzton (Index 4) erlaubt. */
  readonly glanz?: boolean;
  /** ohne Schattierung, immer Grundton (Leuchtteile). */
  readonly flach?: boolean;
  /** nur sichtbar, wo das genannte Teil liegt (Streifen auf der Jacke); Normale vom Trägerteil. */
  readonly auf?: string;
  /** Breite des Kantenlichts bei Polygonen in px (Vorgabe KISSEN_BREITE). */
  readonly kissen?: number;
  /** Bezugspunkt der Sohle im eigenen Rahmen (nur Füße, für Fußkontakt und Tests). */
  readonly sohle?: Punkt;
  /** Stärke der Wölbung (Faktor auf die Normale, Vorgabe 1); kleiner: flacher, mehr Grundton (Gesicht). */
  readonly relief?: number;
}

/** Pose: Lage der Wurzel und Winkel der Gelenke. */
export interface Pose {
  /** Lage des Wurzelgelenks relativ zum Fußpunkt. */
  readonly wurzel: Punkt;
  /** Winkel je Teil in Grad relativ zum Elternteil (Wurzel: absolut); fehlend = 0. */
  readonly winkel: Readonly<Record<string, number>>;
  /** zusätzlicher Versatz des Gelenks eines Teils im Rahmen des Elternteils. */
  readonly versatz?: Readonly<Record<string, Punkt>>;
  /** Zeichenreihenfolge je Teil (überschreibt TeilDef.ebene). */
  readonly ebenen?: Readonly<Record<string, number>>;
  /** Sonderform je Teil (Schlüssel in TeilDef.varianten). */
  readonly formen?: Readonly<Record<string, string>>;
  /** nicht gezeichnete Teile. */
  readonly versteckt?: readonly string[];
  /** true: Figur um x = 0 gespiegelt gezeichnet (Blick nach hinten, etwa in einer Drehung); Licht bleibt links oben. */
  readonly spiegeln?: boolean;
  /** true: keine Gesichtsmaske (Rücken zum Betrachter). */
  readonly ohneGesicht?: boolean;
}

/** Lage eines Teils in Figurkoordinaten. */
export interface Lage {
  readonly pos: Punkt;
  readonly winkel: number;
}

/** Gesichtsmaske (höchstens 8 × 8, von Hand; Auftrag 4, 6). */
export interface Gesicht {
  /** Teil, auf dem die Maske liegt (nur dort wird gesetzt). */
  readonly teil: string;
  /** linke obere Ecke der Maske im Rahmen des Teils (Lage dreht mit, das Raster nicht). */
  readonly ursprung: Punkt;
  /** Zeilen der Maske, je Zeichen ein Pixel; '.' = nichts. */
  readonly zeilen: readonly string[];
  /** Farbe je Zeichen. */
  readonly farben: Readonly<Record<string, Pixel>>;
}

/** Tonabbildung eines Materials: Ton 0 … 4 → Farbe der Figur. */
export type Toene = readonly [Pixel, Pixel, Pixel, Pixel, Pixel];

/** Stil einer Figur. */
export interface Stil {
  /** Tonabbildung je Material (geteilte Treppen und Zweitonmaterialien, docs/grafik.md 1.2). */
  readonly zuteilung: Readonly<Record<string, Toene>>;
  /** Außenkontur. */
  readonly kontur: Pixel;
  /** Glanzfarben: dürfen allein stehen (Regel 1.3), werden beim Aufräumen nicht ersetzt. */
  readonly glanz: ReadonlySet<Pixel>;
  readonly schwellen?: Schwellen;
  readonly gesicht?: Gesicht;
}

/** Ergebnis des Rasterns. */
export interface Gerastert {
  readonly leinwand: Leinwand;
  readonly ankerX: number;
  readonly ankerY: number;
  /** Sohlenpunkte der Füße in Figurkoordinaten (Teilname → Punkt). */
  readonly sohlen: Readonly<Record<string, Punkt>>;
}

/** Vorgabe der Kantenlichtbreite bei Polygonen in px (Auftrag 4, 1.3: 1 bis 2 px Licht und Schatten). */
export const KISSEN_BREITE = 2.5;
/** Neigung der Kissennormale an der Kante (0 … 1; Festlegung G0, wie 0,85 in stilproben.html treffe()). */
const KISSEN_STAERKE = 0.85;
/** Freier Rand um die Formen beim Rastern (Platz für die Außenkontur). */
const RAND = 2;
/** Kleinster Abstand vom Rand der IK-Reichweite (verhindert gestreckte Gelenke mit NaN). */
const IK_SPIEL = 1e-6;

/** Winkel in Grad der Richtung (x, y) in der Konvention der Puppe (0 = unten, 90 = vorn). */
export function richtung(x: number, y: number): number {
  return Math.atan2(x, y) / GRAD;
}

/** Pose zwischen a und b (t = 0: a, t = 1: b); Winkel und Versätze linear, Rest von der näheren Pose. */
export function zwischenPose(a: Pose, b: Pose, t: number = HALB): Pose {
  const winkel: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.winkel), ...Object.keys(b.winkel)])) {
    winkel[k] = (a.winkel[k] ?? 0) + ((b.winkel[k] ?? 0) - (a.winkel[k] ?? 0)) * t;
  }
  const versatz: Record<string, Punkt> = {};
  const va = a.versatz ?? {};
  const vb = b.versatz ?? {};
  for (const k of new Set([...Object.keys(va), ...Object.keys(vb)])) {
    const p = va[k] ?? { x: 0, y: 0 };
    const q = vb[k] ?? { x: 0, y: 0 };
    versatz[k] = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
  }
  const naeher = t < HALB ? a : b;
  return {
    wurzel: { x: a.wurzel.x + (b.wurzel.x - a.wurzel.x) * t, y: a.wurzel.y + (b.wurzel.y - a.wurzel.y) * t },
    winkel,
    versatz,
    ...(naeher.ebenen !== undefined ? { ebenen: naeher.ebenen } : {}),
    ...(naeher.formen !== undefined ? { formen: naeher.formen } : {}),
    ...(naeher.versteckt !== undefined ? { versteckt: naeher.versteckt } : {}),
    ...(naeher.spiegeln !== undefined ? { spiegeln: naeher.spiegeln } : {}),
    ...(naeher.ohneGesicht !== undefined ? { ohneGesicht: naeher.ohneGesicht } : {}),
  };
}

/** Pose mit ergänzten oder ersetzten Winkeln. */
export function mitWinkeln(p: Pose, winkel: Readonly<Record<string, number>>): Pose {
  return { ...p, winkel: { ...p.winkel, ...winkel } };
}

interface Treffer {
  teil: number;
  nx: number;
  ny: number;
}

export class Puppe {
  readonly teile: readonly TeilDef[];
  private readonly index: ReadonlyMap<string, number>;

  constructor(teile: readonly TeilDef[]) {
    const index = new Map<string, number>();
    teile.forEach((t, i) => {
      if (index.has(t.name)) throw new Error(`Puppe: Teil ${t.name} doppelt`);
      if (t.eltern !== null && !index.has(t.eltern)) throw new Error(`Puppe: Elternteil ${t.eltern} von ${t.name} fehlt oder steht später`);
      if (t.auf !== undefined && !index.has(t.auf)) throw new Error(`Puppe: Trägerteil ${t.auf} von ${t.name} fehlt oder steht später`);
      index.set(t.name, i);
    });
    this.teile = teile;
    this.index = index;
  }

  /** Definition eines Teils. */
  teil(name: string): TeilDef {
    const i = this.index.get(name);
    if (i === undefined) throw new Error(`Puppe: Teil ${name} unbekannt`);
    return this.teile[i] as TeilDef;
  }

  /** Lagen aller Teile in Figurkoordinaten. */
  lagen(pose: Pose): Map<string, Lage> {
    const aus = new Map<string, Lage>();
    for (const t of this.teile) {
      const w = pose.winkel[t.name] ?? 0;
      if (t.eltern === null) {
        aus.set(t.name, { pos: pose.wurzel, winkel: w });
        continue;
      }
      const e = aus.get(t.eltern) as Lage;
      const v = pose.versatz?.[t.name] ?? { x: 0, y: 0 };
      const g = drehe({ x: t.gelenk.x + v.x, y: t.gelenk.y + v.y }, e.winkel);
      aus.set(t.name, { pos: { x: e.pos.x + g.x, y: e.pos.y + g.y }, winkel: e.winkel + w });
    }
    return aus;
  }

  /**
   * Zwei Gelenke (a, dann b als Kind von a) so drehen, dass das Gelenk von
   * ende (Kind von b) auf ziel liegt. beuge +1 knickt das mittlere Gelenk
   * nach vorn (Knie), −1 nach hinten (Ellbogen). Gibt die Winkel für a und b
   * relativ zu ihren Eltern zurück; unerreichbare Ziele werden auf die
   * größte Reichweite gezogen.
   */
  zweiGelenke(pose: Pose, a: string, b: string, ende: string, ziel: Punkt, beuge: 1 | -1): Record<string, number> {
    const ta = this.teil(a);
    const tb = this.teil(b);
    const te = this.teil(ende);
    if (tb.eltern !== a || te.eltern !== b) throw new Error(`Puppe: ${a} → ${b} → ${ende} ist keine Kette`);
    const lagen = this.lagen(pose);
    const p = (lagen.get(a) as Lage).pos;
    const elternWinkel = ta.eltern === null ? 0 : (lagen.get(ta.eltern) as Lage).winkel;
    const gb = { x: tb.gelenk.x + (pose.versatz?.[b]?.x ?? 0), y: tb.gelenk.y + (pose.versatz?.[b]?.y ?? 0) };
    const ge = { x: te.gelenk.x + (pose.versatz?.[ende]?.x ?? 0), y: te.gelenk.y + (pose.versatz?.[ende]?.y ?? 0) };
    const l1 = Math.hypot(gb.x, gb.y);
    const l2 = Math.hypot(ge.x, ge.y);
    const phi1 = richtung(gb.x, gb.y);
    const phi2 = richtung(ge.x, ge.y);
    const dx = ziel.x - p.x;
    const dy = ziel.y - p.y;
    const d = Math.max(Math.abs(l1 - l2) + IK_SPIEL, Math.min(l1 + l2 - IK_SPIEL, Math.hypot(dx, dy)));
    const linie = richtung(dx, dy);
    const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const winkelA = Math.acos(Math.max(-1, Math.min(1, cosA))) / GRAD;
    const welt1 = linie + beuge * winkelA;
    const k = { x: p.x + l1 * Math.sin(welt1 * GRAD), y: p.y + l1 * Math.cos(welt1 * GRAD) };
    // Ziel auf die Reichweite gezogen, dann Richtung des zweiten Knochens
    const zx = p.x + (dx / Math.max(IK_SPIEL, Math.hypot(dx, dy))) * d;
    const zy = p.y + (dy / Math.max(IK_SPIEL, Math.hypot(dx, dy))) * d;
    const welt2 = richtung(zx - k.x, zy - k.y);
    const weltA = welt1 - phi1;
    const weltB = welt2 - phi2;
    return { [a]: weltA - elternWinkel, [b]: weltB - weltA };
  }

  /** Winkel eines Teils relativ zum Elternteil, so dass es in der Welt den Winkel welt hat (Pose sonst unverändert). */
  weltWinkel(pose: Pose, teil: string, welt: number): Record<string, number> {
    const t = this.teil(teil);
    const lagen = this.lagen(pose);
    const e = t.eltern === null ? 0 : (lagen.get(t.eltern) as Lage).winkel;
    return { [teil]: welt - e };
  }

  /** Rastert eine Pose im Stil der Figur. */
  rastern(pose: Pose, stil: Stil): Gerastert {
    const lagen = this.lagen(pose);
    const versteckt = new Set(pose.versteckt ?? []);
    type Sichtbar = { def: TeilDef; nr: number; ebene: number; formen: Form[] };
    const sichtbar: Sichtbar[] = [];
    const weltFormen = new Map<string, Form[]>();
    this.teile.forEach((def, nr) => {
      const lage = lagen.get(def.name) as Lage;
      const variante = pose.formen?.[def.name];
      const roh = variante !== undefined ? def.varianten?.[variante] : def.formen;
      if (roh === undefined) throw new Error(`Puppe: Sonderform ${variante} von ${def.name} fehlt`);
      const formen = roh.map((f) => {
        const w = formBewegt(f, lage.winkel, lage.pos);
        return pose.spiegeln === true ? formGespiegelt(w) : w;
      });
      weltFormen.set(def.name, formen);
      if (versteckt.has(def.name)) return;
      sichtbar.push({ def, nr, ebene: pose.ebenen?.[def.name] ?? def.ebene, formen });
    });
    // vorn zuerst; bei gleicher Ebene das später definierte Teil vorn
    sichtbar.sort((p, q) => q.ebene - p.ebene || q.nr - p.nr);

    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const s of sichtbar) {
      for (const f of s.formen) {
        const g = formGrenzen(f);
        x0 = Math.min(x0, g.x0);
        y0 = Math.min(y0, g.y0);
        x1 = Math.max(x1, g.x1);
        y1 = Math.max(y1, g.y1);
      }
    }
    const bx = Math.floor(x0) - RAND;
    const by = Math.floor(y0) - RAND;
    const breite = Math.ceil(x1) + RAND - bx + 1;
    const hoehe = Math.max(Math.ceil(y1), 0) + RAND - by + 1;

    // 1. Rastern: vorderstes Teil und Normale je Pixel
    const feld: (Treffer | null)[] = new Array(breite * hoehe).fill(null);
    for (let py = 0; py < hoehe; py++) {
      for (let px = 0; px < breite; px++) {
        const x = bx + px + HALB;
        const y = by + py + HALB;
        for (let i = 0; i < sichtbar.length; i++) {
          const s = sichtbar[i] as Sichtbar;
          const n = this.normale(s.formen, x, y, s.def);
          if (n === null) continue;
          let normale: [number, number] = n;
          if (s.def.auf !== undefined) {
            const traeger = this.normale(weltFormen.get(s.def.auf) as Form[], x, y, this.teil(s.def.auf));
            if (traeger === null) continue;
            normale = traeger;
          }
          feld[py * breite + px] = { teil: i, nx: normale[0], ny: normale[1] };
          break;
        }
      }
    }
    const an = (px: number, py: number): Treffer | null =>
      px < 0 || py < 0 || px >= breite || py >= hoehe ? null : (feld[py * breite + px] as Treffer | null);

    // 2. Ton je Pixel
    const schwellen = stil.schwellen ?? SCHWELLEN_FIGUR;
    const toene = new Int8Array(breite * hoehe).fill(-1);
    for (let py = 0; py < hoehe; py++) {
      for (let px = 0; px < breite; px++) {
        const t = an(px, py);
        if (t === null) continue;
        const def = (sichtbar[t.teil] as Sichtbar).def;
        let ton: TonIndex;
        if (def.flach === true) ton = 2;
        else {
          const r = def.relief ?? 1;
          ton = tonAusHelligkeit(helligkeit(t.nx * r, t.ny * r), def.glanz === true, schwellen);
          const rechts = an(px + 1, py) === null;
          const unten = an(px, py + 1) === null;
          const links = an(px - 1, py) === null;
          const oben = an(px, py - 1) === null;
          if ((rechts || unten) && ton > 1) ton = 1;
          if ((links || oben) && !(rechts || unten) && ton < 2) ton = 2;
        }
        // Innenkontur: Kante an ein vorderes Teil anderer Gruppe oder anderen Materials
        for (const [dx, dy] of NACHBARN_4) {
          const n = an(px + dx, py + dy);
          if (n === null || n.teil >= t.teil) continue;
          const nd = (sichtbar[n.teil] as Sichtbar).def;
          if (nd.auf === def.name || def.flach === true || nd.flach === true) continue;
          if (nd.gruppe !== def.gruppe || nd.material !== def.material) {
            ton = 0;
            break;
          }
        }
        toene[py * breite + px] = ton;
      }
    }

    // 3. Tonabbildung
    const bild = new Leinwand(breite, hoehe);
    for (let i = 0; i < feld.length; i++) {
      const t = feld[i] as Treffer | null;
      if (t === null) continue;
      const def = (sichtbar[t.teil] as Sichtbar).def;
      const z = stil.zuteilung[def.material];
      if (z === undefined) throw new Error(`Puppe: Material ${def.material} (Teil ${def.name}) fehlt in der Tonabbildung`);
      bild.daten[i] = z[toene[i] as number] as Pixel;
    }

    // 4. Gesichtsmaske (in gespiegelter Pose gespiegelt)
    const geschuetzt = new Uint8Array(breite * hoehe);
    if (stil.gesicht !== undefined && !versteckt.has(stil.gesicht.teil) && pose.ohneGesicht !== true) {
      const g = stil.gesicht;
      const lage = lagen.get(g.teil) as Lage;
      const o = drehe(g.ursprung, lage.winkel);
      const ox = Math.round(lage.pos.x + o.x);
      const oy = Math.round(lage.pos.y + o.y) - by;
      const nr = sichtbar.findIndex((s) => s.def.name === g.teil);
      g.zeilen.forEach((zeile, j) => {
        for (let i = 0; i < zeile.length; i++) {
          const c = zeile[i] as string;
          if (c === '.') continue;
          const farbe = g.farben[c];
          if (farbe === undefined) throw new Error(`Puppe: Gesichtsmaske, Zeichen '${c}' ohne Farbe`);
          // Pixelspalte a gespiegelt: −a − 1 (Mittelpunkt a + 0,5 → −a − 0,5)
          const px = (pose.spiegeln === true ? -(ox + i) - 1 : ox + i) - bx;
          const t = an(px, oy + j);
          if (t === null || t.teil !== nr) continue;
          bild.daten[(oy + j) * breite + px] = farbe;
          geschuetzt[(oy + j) * breite + px] = 1;
        }
      });
    }

    // 5. Streupixel entfernen (innerhalb des Teils, Gesicht und Glanz geschützt)
    this.aufraeumen(bild, feld, geschuetzt, stil.glanz);

    // 6. Außenkontur
    konturAussen(bild, stil.kontur);

    const sohlen: Record<string, Punkt> = {};
    for (const t of this.teile) {
      if (t.sohle === undefined) continue;
      const l = lagen.get(t.name) as Lage;
      const s = drehe(t.sohle, l.winkel);
      const sx = l.pos.x + s.x;
      sohlen[t.name] = { x: pose.spiegeln === true ? -sx : sx, y: l.pos.y + s.y };
    }
    return { leinwand: bild, ankerX: -bx, ankerY: -by, sohlen };
  }

  /** Normale am Punkt, falls er in einer der Formen liegt (spätere Formen oben). */
  private normale(formen: readonly Form[], x: number, y: number, def: TeilDef): [number, number] | null {
    for (let i = formen.length - 1; i >= 0; i--) {
      const f = formen[i] as Form;
      if (!inForm(f, x, y)) continue;
      if (f.art === 'kapsel') {
        const l = kapselLage(f, x, y);
        return zylinderNormale(l.dx, l.dy, l.r);
      }
      if (f.art === 'ellipse') {
        const e = ellipseLage(f, x, y) as { ex: number; ey: number };
        const n = drehe({ x: e.ex, y: e.ey }, f.winkel);
        return [n.x, n.y];
      }
      // Polygon: Kissen, zur nächsten Kante geneigt
      let best = { d: Infinity, nx: 0, ny: 0 };
      const p = f.punkte;
      for (let k = 0; k < p.length; k++) {
        const s = streckenAbstand(p[k] as Punkt, p[(k + 1) % p.length] as Punkt, x, y);
        if (s.d < best.d) best = s;
      }
      // streckenAbstand zeigt von der Kante zum Punkt (nach innen); nach außen ist die Gegenrichtung
      return kissenNormale(best.d, -best.nx, -best.ny, def.kissen ?? KISSEN_BREITE, KISSEN_STAERKE);
    }
    return null;
  }

  /**
   * Streupixel innerhalb eines Teils durch die häufigste Farbe der
   * Nachbarn desselben Teils ersetzen (Regel 1.3); geschützte Pixel
   * (Gesicht) und Glanzfarben bleiben. Wiederholt, bis nichts mehr ändert.
   */
  private aufraeumen(bild: Leinwand, feld: readonly (Treffer | null)[], geschuetzt: Uint8Array, glanz: ReadonlySet<Pixel>): void {
    const b = bild.breite;
    const h = bild.hoehe;
    const RUNDEN = 4;
    for (let r = 0; r < RUNDEN; r++) {
      let geaendert = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < b; x++) {
          const i = y * b + x;
          const t = feld[i] as Treffer | null;
          const p = bild.daten[i] as Pixel;
          if (t === null || geschuetzt[i] === 1 || glanz.has(p)) continue;
          let allein = true;
          for (const [dx, dy] of NACHBARN_8) {
            if (bild.hole(x + dx, y + dy) === p) {
              allein = false;
              break;
            }
          }
          if (!allein) continue;
          const zahl = new Map<Pixel, number>();
          let beste: Pixel = DURCHSICHTIG;
          let besteZahl = 0;
          for (const [dx, dy] of NACHBARN_8) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= b || ny >= h) continue;
            const n = feld[ny * b + nx] as Treffer | null;
            if (n === null || n.teil !== t.teil) continue;
            const q = bild.daten[ny * b + nx] as Pixel;
            const z = (zahl.get(q) ?? 0) + 1;
            zahl.set(q, z);
            if (z > besteZahl) {
              besteZahl = z;
              beste = q;
            }
          }
          if (besteZahl === 0) {
            // kein Nachbar desselben Teils: häufigste deckende Farbe ringsum
            for (const [dx, dy] of NACHBARN_8) {
              const q = bild.hole(x + dx, y + dy);
              if (q === DURCHSICHTIG) continue;
              const z = (zahl.get(q) ?? 0) + 1;
              zahl.set(q, z);
              if (z > besteZahl) {
                besteZahl = z;
                beste = q;
              }
            }
          }
          if (besteZahl > 0 && beste !== p) {
            bild.daten[i] = beste;
            geaendert++;
          }
        }
      }
      if (geaendert === 0) break;
    }
  }
}
