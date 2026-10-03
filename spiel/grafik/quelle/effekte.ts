// Effekte (Auftrag 4, 1.5 und Phase 2, G4): Magnetstoß je Kettenstufe,
// Trefferfunke, Eiswelle des Spezialangriffs, Explosion der Raketen, Staub.
// Schutzblinken ist nur eine Regel der Darstellung (keine Bilder). Effekte
// tragen keine Außenkontur außer der Eiswelle (feste Eisgebilde wie die
// Gegenstände); Zuordnung zur Logik und Anker in docs/grafik.md 4.7.
//
// Gezeichnet wird je Pixel aus einer Rechenvorschrift (Abstand zu Bogen,
// Strahl, Wolke) oder mit den Schichten aus gegenstaende.ts (Eiswelle,
// Staub). Raster nur als Schachbrett (Bayer-Stufe 1/2, raster.ts), damit
// kein Rasterpixel allein steht (Regel 1.3); Funken dürfen allein stehen.
// Zufall nur über src/kern/zufall.ts mit festem Seed. Keine Farbwerte in
// dieser Datei (palette.ts).

import type { Animation, Bild } from './blatt.ts';
import type { Pixel } from './leinwand.ts';
import { DURCHSICHTIG, Leinwand, deckend } from './leinwand.ts';
import { NACHBARN_8 } from './kontur.ts';
import { bayerSchwelle } from './raster.ts';
import { EIS, FEUER, STAHL, STAUB, KONTUR } from './palette.ts';
import type { Schicht } from './gegenstaende.ts';
import { ellipse, kapsel, malen, pixelRechteck, polygon, toene } from './gegenstaende.ts';
import type { Zufall } from '../../src/kern/zufall.ts';
import { zufallNeu, ziehenAus } from '../../src/kern/zufall.ts';
import {
  KETTE4_ZWEITES_FENSTER_BIS,
  KETTE4_ZWEITES_FENSTER_VON,
  KETTE_AKTIV_BIS,
  KETTE_AKTIV_VON,
  KETTE_VORN,
  RX_DAUER,
  SPEZIAL_STUFE_DAUER,
  SPEZIAL_STUFE_VON,
  SPEZIAL_VORN,
  ZR_EINSCHLAG,
  ZR_EXPLOSION_BIS,
  ZR_EXPLOSION_VON,
} from '../../src/kern/werte.ts';

const E = EIS.treppe;
const FE = FEUER.treppe;
const SB = STAUB.treppe;

// ===========================================================================
// Pixelhilfen
// ===========================================================================

/** Leinwand mit dem Ursprung (Anker) bei (ox, oy). */
class Feld {
  readonly l: Leinwand;
  readonly ox: number;
  readonly oy: number;
  constructor(x0: number, y0: number, x1: number, y1: number) {
    this.ox = -x0;
    this.oy = -y0;
    this.l = new Leinwand(x1 - x0 + 1, y1 - y0 + 1);
  }
  setze(x: number, y: number, p: Pixel): void {
    this.l.setze(x + this.ox, y + this.oy, p);
  }
  hole(x: number, y: number): Pixel {
    return this.l.hole(x + this.ox, y + this.oy);
  }
  bild(dauer: number): Bild {
    return { leinwand: this.l, ankerX: this.ox, ankerY: this.oy, dauer };
  }
}

/**
 * Aufräumen ohne Kontur (Regel 1.3): Pixel ohne deckenden Nachbarn werden
 * durchsichtig, Pixel ohne gleichfarbigen Nachbarn nehmen die häufigste
 * Nachbarfarbe an; Farben aus frei dürfen allein stehen (Glanz, Funken).
 */
function aufraeumen(l: Leinwand, frei: ReadonlySet<Pixel>): void {
  for (let runde = 0; runde < 4; runde++) {
    let geaendert = 0;
    for (let y = 0; y < l.hoehe; y++) {
      for (let x = 0; x < l.breite; x++) {
        const p = l.hole(x, y);
        if (!deckend(p) || frei.has(p)) continue;
        if (NACHBARN_8.some(([dx, dy]) => l.hole(x + dx, y + dy) === p)) continue;
        const zahl = new Map<Pixel, number>();
        let beste: Pixel = DURCHSICHTIG;
        let besteZahl = 0;
        for (const [dx, dy] of NACHBARN_8) {
          const q = l.hole(x + dx, y + dy);
          if (!deckend(q)) continue;
          const z = (zahl.get(q) ?? 0) + 1;
          zahl.set(q, z);
          if (z > besteZahl) {
            besteZahl = z;
            beste = q;
          }
        }
        l.setze(x, y, beste);
        geaendert++;
      }
    }
    if (geaendert === 0) break;
  }
}

/** Schachbrett-Raster (Bayer-Stufe 1/2, raster.ts): true auf der Hälfte der Pixel. */
function schach(x: number, y: number): boolean {
  return bayerSchwelle(x, y) < 0.5;
}

// ===========================================================================
// Magnetstoß (Auftrag 4, 1.5): blauweißer Bogen vor der Faust in den aktiven
// Frames der Kette, 2 Bilder zu 2 Frames
// ===========================================================================

/**
 * Reichweite der Trefferbilder von Vela in px vor dem Fußpunkt und Höhe der
 * Faust bzw. des Stiefels (docs/grafik.md 4.1, gemessen am Blatt vela:
 * Kette 1 bis 50 px bei 45 bis 49 px Höhe, Kette 2 bis 50 bei 44 bis 47,
 * Kette 3 bis 44 bei 63 bis 66, Kette 4 bis 47 bei 37 bis 44, zweiter Tritt
 * bis 46 bei 36 bis 45).
 */
export const VELA_TREFFER: readonly { readonly vorn: number; readonly hoehe: number }[] = [
  { vorn: 50, hoehe: 47 },
  { vorn: 50, hoehe: 46 },
  { vorn: 44, hoehe: 65 },
  { vorn: 47, hoehe: 41 },
];
/** Zweiter Tritt der Kette 4 (docs/grafik.md 4.1). */
export const VELA_TREFFER_4B = { vorn: 46, hoehe: 41 } as const;
/** Gegnerkörper beginnt etwa 25 px vor seiner Position (Auftrag 4, 1.5). */
const GEGNER_KOERPER = 25;

/**
 * Ansatzpunkt des Magnetstoßes je Stufe relativ zu Velas Fußpunkt (Blick
 * rechts; y nach unten): vorderster Pixel der Faust in Faustmitte. Der Anker
 * des Effekts liegt dort; die Darstellung setzt ihn auf Vela + Ansatz
 * (gespiegelt mit dem Blick).
 */
export const MAGNETSTOSS_ANSATZ: readonly { readonly x: number; readonly y: number }[] = VELA_TREFFER.map((t) => ({ x: t.vorn, y: -t.hoehe }));
export const MAGNETSTOSS_ANSATZ_4B = { x: VELA_TREFFER_4B.vorn, y: -VELA_TREFFER_4B.hoehe } as const;

/** Länge des Stoßes in x: Reichweite der Stufe minus Gegnerkörper minus Faust (Auftrag 4, 1.5): 10, 12, 22, 28. */
export const MAGNETSTOSS_LAENGE: readonly number[] = VELA_TREFFER.map((t, i) => (KETTE_VORN[i] as number) - GEGNER_KOERPER - t.vorn);

/** Richtung des Stoßes in Grad über der Waagrechten: Kette 3 ist ein Aufwärtshaken (Festlegung G4). */
const MAGNETSTOSS_RICHTUNG: readonly number[] = [0, 0, 30, 0];
/** Bilder und Frames je Bild: 2 zu 2, deckt die 4 aktiven Frames jeder Stufe (werte.ts KETTE_AKTIV_VON/BIS). */
export const MAGNETSTOSS_DAUER = 2;

/** Ein Bild des Magnetstoßes: Bogen am Ende, Strahlen, Glühen an der Faust; frisch (hell) oder verblassend. */
function magnetstossBild(stufe: number, frisch: boolean): Bild {
  const a = ((MAGNETSTOSS_RICHTUNG[stufe] as number) * Math.PI) / 180;
  // Länge entlang der Richtung so, dass der Stoß in x die Länge der Stufe erreicht
  const lx = MAGNETSTOSS_LAENGE[stufe] as number;
  const L = lx / Math.cos(a);
  // halbe Höhe des Bogens und Dicke in der Mitte (Festlegung G4: mit der Länge wachsend, begrenzt)
  const H = Math.min(4 + 0.45 * L, 14);
  const T = (frisch ? 2.6 : 1.6) + L / 12;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const r = Math.ceil(L + H + 3);
  const f = new Feld(-r, -r, r, r);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      // Lage entlang (u) und quer (v) zur Richtung; y nach unten, Richtung nach oben vorn
      const u = px * cos - py * sin;
      const v = px * sin + py * cos;
      let farbe: Pixel = DURCHSICHTIG;
      // Bogen: Rand einer Ellipse mit Halbachsen L und H, Dicke nach außen dünner
      const q = v / H;
      if (Math.abs(q) < 1 && u > 0) {
        const aussen = L * Math.sqrt(1 - q * q);
        const d = T * (1 - q * q) + 0.6;
        const t = (aussen - u) / d;
        if (t >= 0 && t <= 1) {
          const spitze = Math.abs(q) > 0.72;
          if (frisch) farbe = spitze ? (E[2] as Pixel) : t < 0.4 ? (E[4] as Pixel) : t < 0.75 ? (E[3] as Pixel) : (E[2] as Pixel);
          else farbe = spitze ? (E[1] as Pixel) : t < 0.5 ? (E[3] as Pixel) : (E[2] as Pixel);
        }
      }
      // innerer Bogen (kleinere Welle) und kurze Striche an der Faust
      if (farbe === DURCHSICHTIG && u > 0) {
        const L2 = L * 0.58;
        const H2 = H * 0.62;
        const q2 = v / H2;
        if (Math.abs(q2) < 1) {
          const aussen2 = L2 * Math.sqrt(1 - q2 * q2);
          const d2 = (frisch ? T * 0.55 : T * 0.45) * (1 - q2 * q2) + 0.5;
          const t2 = (aussen2 - u) / d2;
          if (t2 >= 0 && t2 <= 1 && Math.abs(q2) < 0.85) farbe = frisch ? (t2 < 0.5 ? (E[4] as Pixel) : (E[3] as Pixel)) : (E[2] as Pixel);
        }
        const strich = Math.abs(v) < 0.8 && u > 2.4 && u < L * 0.58 - T * 0.6 - 1;
        if (farbe === DURCHSICHTIG && strich && frisch) farbe = E[3] as Pixel;
      }
      // Glühen an der Faust (Anker): frisch Kreis mit weißem Kern, verblassend kleiner Rest
      const g = Math.hypot(px, py);
      if (frisch && g < 2.6) farbe = g < 1.3 ? (E[4] as Pixel) : (E[3] as Pixel);
      else if (!frisch && g < 1.6) farbe = E[2] as Pixel;
      if (farbe !== DURCHSICHTIG) f.setze(x, y, farbe);
    }
  }
  aufraeumen(f.l, new Set([E[4] as Pixel]));
  return f.bild(MAGNETSTOSS_DAUER);
}

/** Magnetstoß der Stufe 1 bis 4: Bild 0 frisch (Trefferbild mit voller Länge), Bild 1 verblassend. */
function magnetstoss(stufe: number): Animation {
  return { name: `magnetstoss${stufe + 1}`, schleife: false, bilder: [magnetstossBild(stufe, true), magnetstossBild(stufe, false)], aktiv: [0, 1] };
}

// ===========================================================================
// Trefferfunke (Auftrag 4, 1.5): 8 Frames, 4 Bilder zu 2 Frames, weiß bis
// orange, Anker am Trefferpunkt (Mitte)
// ===========================================================================

/** Frames je Bild des Funkens (Auftrag 4, 1.5). */
export const FUNKE_DAUER = 2;

/** Strahlen des Funkens: Richtung (Grad, 0 = rechts), Länge in px je Bild (Festlegung G4). */
const FUNKE_STRAHLEN: readonly { readonly w: number; readonly lang: boolean }[] = [0, 45, 90, 135, 180, 225, 270, 315].map((w) => ({ w, lang: w % 90 === 0 }));

function funkeBild(i: number): Bild {
  const r = 9;
  const f = new Feld(-r, -r, r, r);
  const weiss = E[4] as Pixel;
  const setzeStrahl = (w: number, von: number, bis: number, farben: (t: number) => Pixel): void => {
    const c = Math.cos((w * Math.PI) / 180);
    const s = Math.sin((w * Math.PI) / 180);
    for (let d = von; d <= bis; d += 0.5) f.setze(Math.round(c * d - 0.5), Math.round(s * d - 0.5), farben((d - von) / Math.max(1, bis - von)));
  };
  if (i === 0) {
    // Blitz: weißer Kern, kurze Strahlen
    for (const s of FUNKE_STRAHLEN) setzeStrahl(s.w, 0, s.lang ? 4 : 2.5, (t) => (t < 0.6 ? weiss : (FE[4] as Pixel)));
    f.setze(-1, -1, weiss);
    f.setze(0, -1, weiss);
    f.setze(-1, 0, weiss);
    f.setze(0, 0, weiss);
  } else if (i === 1) {
    // Stern: lange und kurze Strahlen, weiß innen, orange an den Spitzen
    for (const s of FUNKE_STRAHLEN) setzeStrahl(s.w, 0, s.lang ? 7.5 : 5, (t) => (t < 0.35 ? weiss : t < 0.75 ? (FE[4] as Pixel) : (FE[3] as Pixel)));
    for (let y = -2; y <= 1; y++) for (let x = -2; x <= 1; x++) if (Math.abs(x + 0.5) + Math.abs(y + 0.5) <= 2.5) f.setze(x, y, weiss);
  } else if (i === 2) {
    // Strahlen lösen sich vom Kern
    for (const s of FUNKE_STRAHLEN) setzeStrahl(s.w, s.lang ? 4.5 : 4, s.lang ? 8.5 : 6.5, (t) => (t < 0.5 ? (FE[3] as Pixel) : (FE[2] as Pixel)));
  } else {
    // Glut: einzelne Funken außen
    for (const s of FUNKE_STRAHLEN) setzeStrahl(s.w, s.lang ? 8 : 6.5, s.lang ? 8.5 : 7, () => (s.lang ? (FE[2] as Pixel) : (FE[1] as Pixel)));
  }
  return f.bild(FUNKE_DAUER);
}

// ===========================================================================
// Eiswelle des Spezialangriffs (Auftrag 4, 1.5; Kampf 9.4): sechs Stufen zu
// 6 Frames, je ein Bild bis „vorn bis“ der Stufe (werte.ts SPEZIAL_VORN:
// 43 bis 123 px, je Stufe 16 px mehr), nach rechts gezeichnet; die
// Darstellung zeichnet es zusätzlich gespiegelt nach hinten
// ===========================================================================

/** Eissplitter: Lage x, Breite, Neigung nach vorn (Anteil der Höhe), Reihe (0 vorn, 1 hinten), Höhenfaktor. */
interface Splitter {
  readonly x: number;
  readonly b: number;
  readonly neigung: number;
  readonly reihe: 0 | 1;
  readonly faktor: number;
}

/** Seed der Splitterverteilung (fest, Auftrag 4, 6). */
const EISWELLE_SEED = 0x45495357;
/** Abstand der Splitter in px (6 bis 9) und erster Splitter vor Vela (Festlegung G4). */
const SPLITTER_ABSTAND = 6;
const SPLITTER_START = 7;
/** Hintere Reihe 3 px höher im Bild (Tiefe angedeutet; die Fläche der Logik reicht ±28 in der Tiefe). */
const REIHE_HINTEN = 3;
/** Höhenprofil hinter der Wellenfront (Festlegung G4): an der Front 10 px, Kamm 22 px 6 bis 12 px dahinter, dann je px 0,45 niedriger bis 4 px. */
const KAMM = { front: 10, steigung: 2, hoch: 22, von: 6, bis: 12, abfall: 0.45, min: 4 } as const;

function splitterListe(): Splitter[] {
  const z: Zufall = zufallNeu(EISWELLE_SEED);
  const aus: Splitter[] = [];
  const ende = SPEZIAL_VORN[SPEZIAL_VORN.length - 1] as number;
  for (let x = SPLITTER_START; x <= ende; x += SPLITTER_ABSTAND + ziehenAus(z, 4)) {
    aus.push({ x, b: 5 + ziehenAus(z, 4), neigung: 0.15 + ziehenAus(z, 4) * 0.08, reihe: 0, faktor: 0.8 + ziehenAus(z, 5) * 0.08 });
    if (ziehenAus(z, 3) > 0) aus.push({ x: x + 3, b: 4 + ziehenAus(z, 3), neigung: 0.1 + ziehenAus(z, 3) * 0.08, reihe: 1, faktor: 0.6 + ziehenAus(z, 3) * 0.08 });
  }
  return aus;
}

/** Höhe eines Splitters d px hinter der Front (d ≥ 0). */
function kammHoehe(d: number): number {
  if (d < KAMM.von) return KAMM.front + KAMM.steigung * d;
  if (d <= KAMM.bis) return KAMM.hoch;
  return Math.max(KAMM.min, KAMM.hoch - (d - KAMM.bis) * KAMM.abfall);
}

/** Farben der Eiswelle (5 plus durchsichtig): KONTUR, EIS 1 bis 4 (4 = Glanz, weiß). */
const EIS_TOENE = toene(KONTUR, E[1] as Pixel, E[2] as Pixel, E[3] as Pixel, E[4] as Pixel);

function eiswelleBild(stufe: number): Bild {
  const front = SPEZIAL_VORN[stufe] as number;
  const schichten: Schicht[] = [
    // Reif auf dem Boden von Vela bis zur Front (2 Zeilen)
    { name: 'reif', formen: [pixelRechteck(0, -2, front - 1, -1)], toene: EIS_TOENE, gruppe: 'reif', woelbung: { art: 'flach' }, stufe: 1 },
  ];
  const liste = splitterListe().filter((s) => s.x + s.b / 2 <= front);
  // hintere Reihe zuerst, dann vordere; je Reihe von hinten (Vela) nach vorn
  for (const reihe of [1, 0] as const) {
    for (const s of liste.filter((t) => t.reihe === reihe)) {
      const h = Math.round(kammHoehe(front - s.x) * s.faktor);
      const y0 = reihe === 1 ? -REIHE_HINTEN : 0;
      const xl = s.x - s.b / 2;
      const xr = s.x + s.b / 2;
      const xm = s.x + s.b * 0.1;
      const spitze: [number, number] = [s.x + s.neigung * h, y0 - h];
      const n = `s${s.x}_${reihe}`;
      schichten.push(
        { name: `${n}l`, formen: [polygon([xl, y0], [xm, y0], spitze)], toene: EIS_TOENE, gruppe: n, woelbung: { art: 'flach' } },
        { name: `${n}r`, formen: [polygon([xm, y0], [xr, y0], spitze)], toene: EIS_TOENE, gruppe: n, woelbung: { art: 'flach' }, stufe: -1 },
      );
      if (h >= 9) {
        // Glanzkante links oben (Licht von links oben, docs/grafik.md 1.3)
        schichten.push({ name: `${n}g`, formen: [kapsel(xl + (spitze[0] - xl) * 0.45 + 0.6, y0 - h * 0.45, spitze[0] - 0.2, spitze[1] + 1.2, 0.5)], toene: EIS_TOENE, gruppe: n, ton: 4, auf: `${n}l` });
      }
    }
  }
  // Eissplitter in der Luft über dem Kamm (kleine Rauten, Lage je Stufe verschoben)
  for (const [dx, dy] of [
    [-9, -27],
    [-3, -31],
    [-15, -24],
  ] as const) {
    const x = front + dx + (stufe % 2) * 2;
    if (x < SPLITTER_START + 4) continue;
    schichten.push({ name: `luft${dx}`, formen: [polygon([x, dy - 2], [x + 2, dy], [x, dy + 2], [x - 2, dy])], toene: EIS_TOENE, gruppe: `luft${dx}`, ton: 3 });
  }
  return malen(schichten, SPEZIAL_STUFE_DAUER, { glanz: new Set([E[4] as Pixel]) });
}

// ===========================================================================
// Explosion (Auftrag 4, 1.5): etwa 24 Frames in 6 Bildern, Durchmesser 24 bis
// 72 px, Orange-Gelb-Weiß mit Raster außen, dann dunkler Rauch, der zerfällt;
// Anker am Einschlagpunkt: unter der Mitte in der untersten Zeile der Wolke
// ===========================================================================

/** Dauern der sechs Bilder (Summe 24, Auftrag 4, 1.5) und Durchmesser (24 bis 72 px, schnell wachsend; Festlegung G4). */
export const EXPLOSION_DAUERN: readonly number[] = [2, 3, 4, 4, 5, 6];
export const EXPLOSION_DURCHMESSER: readonly number[] = [24, 36, 48, 58, 66, 72];
/** Seed der Wolkenballen (fest). */
const EXPLOSION_SEED = 0x45585044;
/** Unterkante der Wolke in px unter dem Einschlagpunkt (Festlegung G4). */
const EXPLOSION_TIEFE = 3;
/** Rauch: dunkles Stahlblau (STAHL 1), einzige Farbe außerhalb von FEUER und dem Weiß aus EIS. */
const RAUCH = STAHL.treppe[1] as Pixel;

/** Farbstufen je Bild: Hitze ab der Schwelle → Farbe (absteigend); unter der letzten Schwelle durchsichtig. */
const EXPLOSION_STUFEN: readonly (readonly [number, Pixel][])[] = [
  [[0.55, E[4] as Pixel], [0.25, FE[4] as Pixel], [0.0, FE[3] as Pixel]],
  [[0.62, E[4] as Pixel], [0.4, FE[4] as Pixel], [0.2, FE[3] as Pixel], [0.0, FE[2] as Pixel]],
  [[0.75, E[4] as Pixel], [0.55, FE[4] as Pixel], [0.36, FE[3] as Pixel], [0.18, FE[2] as Pixel], [0.0, FE[1] as Pixel]],
  [[0.72, FE[4] as Pixel], [0.52, FE[3] as Pixel], [0.34, FE[2] as Pixel], [0.18, FE[1] as Pixel], [0.0, RAUCH]],
  [[0.7, FE[3] as Pixel], [0.52, FE[2] as Pixel], [0.36, FE[1] as Pixel], [0.22, FE[0] as Pixel], [0.0, RAUCH]],
  [[0.8, FE[2] as Pixel], [0.6, FE[1] as Pixel], [0.42, FE[0] as Pixel], [0.08, RAUCH]],
];
/** Anteil des Lochradius, der ganz durchsichtig ist (außen Rasterring; Festlegung G4). */
const LOCH_KERN = 0.7;
/** Breite der Rasterbänder an den Schwellen (Anteil der Hitze; etwa 1 bis 2 px). */
const EXPLOSION_BAND = 0.05;

function explosionBild(i: number): Bild {
  const R = (EXPLOSION_DURCHMESSER[i] as number) / 2;
  const z = zufallNeu(EXPLOSION_SEED + i);
  const zufall = (n: number): number => ziehenAus(z, n) / n;
  // Ballen: Mitte und ein Kranz; Unterkante 3 px unter dem Boden, damit nach Raster und Rand
  // die Ankerzeile 0 sicher dazugehört (Anker im Bild) und die Wolke auf dem Boden aufsitzt
  const cy = -R + EXPLOSION_TIEFE;
  type Ballen = { x: number; y: number; r: number };
  const ballen: Ballen[] = [{ x: 0, y: cy, r: R * 0.68 }];
  const kranz = 7;
  for (let k = 0; k < kranz; k++) {
    const w = (2 * Math.PI * (k + zufall(10) * 0.5)) / kranz;
    const r = R * (0.4 + zufall(10) * 0.14);
    const d = R - r;
    let y = cy + Math.sin(w) * d;
    if (y + r > EXPLOSION_TIEFE) y = EXPLOSION_TIEFE - r;
    ballen.push({ x: Math.cos(w) * d, y, r });
  }
  // Zerfall in den letzten Bildern: Löcher als Ballen ohne Inhalt
  const loecher: Ballen[] = [];
  if (i >= 4) {
    const n = i === 4 ? 3 : 6;
    for (let k = 0; k < n; k++) {
      const w = 2 * Math.PI * zufall(32);
      const d = R * (0.35 + zufall(10) * 0.5);
      const r = R * (i === 4 ? 0.16 : 0.22);
      // Löcher nur in der oberen Hälfte und an den Seiten: die Wolke bleibt auf dem Boden (Anker im Bild)
      const y = Math.min(cy + Math.sin(w) * d, cy + R * 0.45 - r);
      loecher.push({ x: Math.cos(w) * d, y, r });
    }
  }
  const stufen = EXPLOSION_STUFEN[i] as readonly [number, Pixel][];
  const rr = Math.ceil(R) + 1;
  const f = new Feld(-rr, Math.floor(cy) - rr, rr, EXPLOSION_TIEFE);
  // Bild 0: Blitz als Stern (lange Zacken waagrecht und senkrecht, kurze schräg)
  const stern = (px: number, py: number): number => {
    const dx = px;
    const dy = py - cy;
    const w = Math.atan2(dy, dx);
    const c = Math.cos(4 * w);
    const rand = R * (0.42 + 0.58 * Math.max(0, c) ** 6 + 0.25 * Math.max(0, -c) ** 6);
    return 1 - Math.hypot(dx, dy) / rand;
  };
  for (let y = Math.floor(cy) - rr; y <= EXPLOSION_TIEFE; y++) {
    for (let x = -rr; x <= rr; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let hitze: number;
      if (i === 0) hitze = stern(px, py);
      else {
        hitze = -Infinity;
        for (const b of ballen) hitze = Math.max(hitze, 1 - Math.hypot(px - b.x, py - b.y) / b.r);
        // Licht von links oben: links oben heißer, rechts unten dunkler (docs/grafik.md 1.3)
        hitze -= 0.12 * ((px / R + (py - cy) / R) * 0.5);
        // Löcher: innen durchsichtig, am Rand ein Rasterring
        for (const b of loecher) {
          const d = Math.hypot(px - b.x, py - b.y);
          if (d < b.r * LOCH_KERN) hitze = -1;
          else if (d < b.r) hitze = Math.min(hitze, (stufen[stufen.length - 1] as [number, Pixel])[0] - EXPLOSION_BAND * 0.5 - 0.01);
        }
      }
      // Stufe mit Schachbrettband an jeder Schwelle (Raster außen und zwischen den Tönen)
      let farbe: Pixel = DURCHSICHTIG;
      for (let k = 0; k < stufen.length; k++) {
        const [schwelle, p] = stufen[k] as [number, Pixel];
        if (hitze >= schwelle + EXPLOSION_BAND) {
          farbe = p;
          break;
        }
        if (hitze >= schwelle - EXPLOSION_BAND) {
          const darunter = k + 1 < stufen.length ? (stufen[k + 1] as [number, Pixel])[1] : DURCHSICHTIG;
          farbe = schach(x, y) ? p : darunter;
          break;
        }
      }
      if (farbe !== DURCHSICHTIG) f.setze(x, y, farbe);
    }
  }
  aufraeumen(f.l, new Set());
  // Die Wolke sitzt auf dem Boden: Anker in der untersten deckenden Zeile (unter der Mitte)
  const b = f.bild(EXPLOSION_DAUERN[i] as number);
  const g = b.leinwand.begrenzung();
  return g === null ? b : { ...b, ankerY: g.y + g.h - 1 };
}

/** Bilder der Explosion bei Aktionsuhr 1 … 24 ab dem Einschlag (1 = Einschlagframe). */
export function explosionBildBeiUhr(uhr: number): number {
  let summe = 0;
  for (let i = 0; i < EXPLOSION_DAUERN.length; i++) {
    summe += EXPLOSION_DAUERN[i] as number;
    if (uhr <= summe) return i;
  }
  return EXPLOSION_DAUERN.length - 1;
}

/** Aktive Uhren der Explosion: Figur (RX) 1 bis 15, Zünder (ZR) 2 bis 10 (Einschlag Q+20 = Uhr 1, aktiv Q+21 bis Q+29). */
export const EXPLOSION_AKTIV = {
  figur: { von: 1, bis: RX_DAUER },
  zuender: { von: ZR_EXPLOSION_VON - ZR_EINSCHLAG + 1, bis: ZR_EXPLOSION_BIS - ZR_EINSCHLAG + 1 },
} as const;

function aktiveBilder(von: number, bis: number): number[] {
  const aus = new Set<number>();
  for (let u = von; u <= bis; u++) aus.add(explosionBildBeiUhr(u));
  return [...aus].sort((a, b) => a - b);
}

// ===========================================================================
// Staub (Auftrag 4, 1.5): 3 Bilder zu 3 Frames, hellgrau, auf dem Boden;
// Anker am Fußpunkt
// ===========================================================================

/** Frames je Bild des Staubs (Auftrag 4, 1.5). */
export const STAUB_DAUER = 3;
/** Wolken je Bild: Abstand der Wolkenmitte vom Anker (beidseitig) und Radius (klein, groß, verweht; Festlegung G4). */
const STAUB_WOLKEN: readonly (readonly [number, number][])[] = [
  [[0, 4], [7, 4]],
  [[7, 5.5], [15, 5.5]],
  [[14, 4.5], [22, 5]],
];

function staubBild(i: number): Bild {
  const toeneStaub = toene(SB[1] as Pixel, SB[1] as Pixel, SB[2] as Pixel, SB[3] as Pixel, SB[4] as Pixel);
  const formen = (STAUB_WOLKEN[i] as [number, number][]).flatMap(([d, r]) => (d === 0 ? [ellipse(0, 1 - r * 0.8, r, r * 0.8)] : [ellipse(-d, 1 - r * 0.8, r, r * 0.8), ellipse(d, 1 - r * 0.8, r, r * 0.8)]));
  const b = malen([{ name: 'staub', formen, toene: toeneStaub, gruppe: 'staub', glanz: true, stufe: i === 2 ? 1 : 0 }], STAUB_DAUER, { kontur: false });
  if (i === 2) {
    // verweht: obere Hälfte jeder Wolke im Schachbrett gelichtet
    const l = b.leinwand;
    for (let y = 0; y < l.hoehe; y++) for (let x = 0; x < l.breite; x++) if (y < b.ankerY - 3 && !schach(x, y)) l.setze(x, y, DURCHSICHTIG);
  }
  aufraeumen(b.leinwand, new Set());
  return b;
}

// ===========================================================================
// Animationen
// ===========================================================================

/** Aktive Fenster der Kette (werte.ts) zur Prüfung: Magnetstoß deckt je Stufe 4 Frames mit 2 Bildern zu 2 Frames. */
export const KETTE_FENSTER = {
  von: KETTE_AKTIV_VON,
  bis: KETTE_AKTIV_BIS,
  zweitesVon: KETTE4_ZWEITES_FENSTER_VON,
  zweitesBis: KETTE4_ZWEITES_FENSTER_BIS,
} as const;

/** Uhr der Flächenstufen der Eiswelle (werte.ts SPEZIAL_STUFE_VON, je 6 Frames). */
export const EISWELLE_UHR = { von: SPEZIAL_STUFE_VON, dauer: SPEZIAL_STUFE_DAUER } as const;

/** Alle Effekte (Atlas-Namen nach docs/grafik.md 4.7). */
export function effekteAnimationen(): Animation[] {
  const explosion = EXPLOSION_DAUERN.map((_, i) => explosionBild(i));
  return [
    ...[0, 1, 2, 3].map(magnetstoss),
    { name: 'funke', schleife: false, bilder: [0, 1, 2, 3].map(funkeBild) },
    { name: 'eiswelle', schleife: false, bilder: SPEZIAL_VORN.map((_, i) => eiswelleBild(i)), aktiv: SPEZIAL_VORN.map((_, i) => i) },
    { name: 'explosion', schleife: false, bilder: explosion, aktiv: aktiveBilder(EXPLOSION_AKTIV.figur.von, EXPLOSION_AKTIV.figur.bis) },
    { name: 'explosion_zuender', schleife: false, bilder: explosion, aktiv: aktiveBilder(EXPLOSION_AKTIV.zuender.von, EXPLOSION_AKTIV.zuender.bis) },
    { name: 'staub', schleife: false, bilder: [0, 1, 2].map(staubBild) },
  ];
}
