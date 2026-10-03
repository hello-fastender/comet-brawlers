// Vela, Lotsin des Hafens, als Gliederpuppe (Auftrag 4, 2.4 und 4; Phase 1:
// stand, gehen, kette1 bis kette4). Vorlage ist Vela der gewählten
// Stilprobe (docs/bilder/stil_1_arcade_nah.png, stilproben.html VELA):
// Pferdeschwanz, blaue Lotsenjacke mit orangem Querstreifen, dunkle Hose,
// schwere Stiefel, dicke Magnethandschuhe mit leuchtenden Spulen. Sauberer
// als die Probe: Augen 2 × 2, Mund 1 px, Gesicht frei, Haar als eigene Form.
//
// Maße in Spielpixeln. Herkunft: Umriss 57 × 76 mit Schatten
// (src/darstellung/masse.ts, UMRISS_FIGUR), Körper im Stand höchstens
// 76 − SCHATTEN_HOEHE / 2 = 71 px hoch; Proportionen nach der Stilprobe
// (stilproben.html VELA, etwa 0,93-fach) und Auftrag 4, 1.1 (Kopf etwa 1/5
// der Körperhöhe, große Hände und Füße). Zeiten aus docs/design.md 8 und
// src/kern/werte.ts (Abweichungen in docs/grafik.md 7, G0-…).

import type { Animation, Bild } from '../blatt.ts';
import type { Form, Punkt } from '../geometrie.ts';
import type { Pixel } from '../leinwand.ts';
import {
  HAAR_VELA,
  HANDSCHUH_VELA,
  HAUT_HELL,
  HOSE_GRAUBLAU,
  JACKE_VELA,
  KONTUR,
  SIGNAL_ORANGE,
  SPULE,
} from '../palette.ts';
import type { Gerastert, Pose, Stil, TeilDef, Toene } from '../puppe.ts';
import { Puppe } from '../puppe.ts';
import { KETTE4_ZWEITES_FENSTER_VON, KETTE_AKTIV_VON, LAUF_X } from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';

// ===========================================================================
// Maße
// ===========================================================================

/** Sohle bis Knöchel (schwere Stiefel; Stilprobe: Stiefel 8 px hoch, Knöchel bei 5). */
const KNOECHEL = 5;
/** Hüfte bis Knie und Knie bis Knöchel (Beinlänge 30: Hüfte im Stand bei 35, Stilprobe 34 bei 76 px Gesamthöhe). */
const SCHENKEL = 15;
const SCHIENBEIN = 15;
/** Schulter bis Ellbogen, Ellbogen bis Handgelenk (Stilprobe 10 und 9; je 1 px länger für die Reichweite der Kette, Auftrag 4, 1.1). */
const OBERARM = 11;
const UNTERARM = 9;
/** Mitte des Handschuhs unter dem Handgelenk, Halbachsen (dicke Handschuhe; Stilprobe rx 6, ry 5,5 vorn). */
const HAND_MITTE = 3.5;
const HAND_RX = 4.6;
const HAND_RY = 5;
/** Hüftgelenke links und rechts der Beckenmitte. */
const HUEFTE_SEITE = 2.5;
/** Schultergelenke im Rumpf: seitlich, Höhe über der Taille. */
const SCHULTER_SEITE = 3.5;
const SCHULTER_HOEHE = 15;
/** Taille über dem Beckengelenk. */
const TAILLE = 2;

// ===========================================================================
// Teile
// ===========================================================================

const P = (x: number, y: number): Punkt => ({ x, y });
const kapsel = (ax: number, ay: number, bx: number, by: number, ra: number, rb: number = ra): Form => ({
  art: 'kapsel',
  a: P(ax, ay),
  b: P(bx, by),
  ra,
  rb,
});
const ellipse = (mx: number, my: number, rx: number, ry: number, winkel: number = 0): Form => ({ art: 'ellipse', m: P(mx, my), rx, ry, winkel });
const polygon = (...punkte: [number, number][]): Form => ({ art: 'polygon', punkte: punkte.map(([x, y]) => P(x, y)) });

/** Zeichenreihenfolge (Auftrag 4, 2.4: hinterer Arm, hinteres Bein, Rumpf, Kopf, vorderes Bein, vorderer Arm). */
const EBENE = {
  armH: 10,
  handH: 11,
  beinH: 20,
  stiefelH: 21,
  zopf: 25,
  beinV: 27,
  stiefelV: 28,
  becken: 29,
  rumpf: 30,
  streifen: 31,
  kopf: 35,
  haar: 36,
  armV: 50,
  handV: 51,
} as const;

/** Stiefel im Rahmen des Knöchels: Schaft bis 5 über dem Knöchel, Spitze 10 vor, Ferse 4,5 hinter dem Knöchel. */
const STIEFEL = polygon([-4, -5], [3.6, -5], [4, -0.6], [7, 0.4], [9.4, 1.9], [10, KNOECHEL], [-4.5, KNOECHEL], [-4.8, 1]);
/** Sohlenpunkt (Mitte der Sohle) im Rahmen des Knöchels. */
const SOHLE = P(2.5, KNOECHEL);
/** Ferse und Spitze der Sohle (Drehpunkte beim Abrollen). */
const FERSE = P(-4.5, KNOECHEL);
const SPITZE = P(10, KNOECHEL);

/** Spulen auf dem Handschuh: zwei Leuchtlinien quer über den Handrücken (Stilprobe: zwei Linien je Handschuh). */
const SPULEN: Form[] = [kapsel(-2.2, 2.2, 2.4, 1.6, 0.6), kapsel(-2.2, 5, 2.4, 4.4, 0.6)];

function arm(seite: 'V' | 'H', x: number, ebeneArm: number, ebeneHand: number): TeilDef[] {
  return [
    {
      name: `Oberarm${seite}`,
      eltern: 'Rumpf',
      gelenk: P(x, -SCHULTER_HOEHE),
      formen: [kapsel(0, 0, 0, OBERARM, 3.4, 3)],
      material: 'JACKE',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    {
      name: `Unterarm${seite}`,
      eltern: `Oberarm${seite}`,
      gelenk: P(0, OBERARM),
      formen: [kapsel(0, 0, 0, UNTERARM, 3, 2.6)],
      material: 'JACKE',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    {
      name: `Hand${seite}`,
      eltern: `Unterarm${seite}`,
      gelenk: P(0, UNTERARM),
      formen: [ellipse(0, HAND_MITTE, HAND_RX, HAND_RY)],
      material: 'HANDSCHUH',
      gruppe: `hand${seite}`,
      ebene: ebeneHand,
      glanz: true,
    },
    {
      name: `Spule${seite}`,
      eltern: `Hand${seite}`,
      gelenk: P(0, 0),
      formen: SPULEN,
      material: 'SPULE',
      gruppe: `hand${seite}`,
      ebene: ebeneHand + 1,
      flach: true,
      auf: `Hand${seite}`,
    },
  ];
}

function bein(seite: 'V' | 'H', x: number, ebeneBein: number, ebeneStiefel: number): TeilDef[] {
  return [
    {
      name: `Oberschenkel${seite}`,
      eltern: 'Becken',
      gelenk: P(x, 1),
      formen: [kapsel(0, 0, 0, SCHENKEL, 5, 4.2)],
      material: 'HOSE',
      gruppe: `bein${seite}`,
      ebene: ebeneBein,
    },
    {
      name: `Unterschenkel${seite}`,
      eltern: `Oberschenkel${seite}`,
      gelenk: P(0, SCHENKEL),
      formen: [kapsel(0, 0, 0, SCHIENBEIN, 4.2, 3.4)],
      material: 'HOSE',
      gruppe: `bein${seite}`,
      ebene: ebeneBein,
    },
    {
      name: `Stiefel${seite}`,
      eltern: `Unterschenkel${seite}`,
      gelenk: P(0, SCHIENBEIN),
      formen: [STIEFEL],
      material: 'STIEFEL',
      gruppe: `stiefel${seite}`,
      ebene: ebeneStiefel,
      sohle: SOHLE,
    },
  ];
}

const TEILE: TeilDef[] = [
  { name: 'Becken', eltern: null, gelenk: P(0, 0), formen: [kapsel(-3, 0, 3, 0, 4.5)], material: 'HOSE', gruppe: 'rumpf', ebene: EBENE.becken },
  {
    name: 'Rumpf',
    eltern: 'Becken',
    gelenk: P(0, -TAILLE),
    // Taille unten (Saum 4 unter der Taille), Brust vorn, Schulterlinie 17,5 über der Taille
    formen: [polygon([-6.8, 4], [6.8, 4], [7.4, -3], [8.8, -10], [8.2, -15], [5.2, -17.5], [-4.8, -17.5], [-8, -15], [-8.2, -8], [-7.4, -2])],
    material: 'JACKE',
    gruppe: 'rumpf',
    ebene: EBENE.rumpf,
    kissen: 3,
  },
  {
    name: 'Streifen',
    eltern: 'Rumpf',
    gelenk: P(0, 0),
    // orangener Querstreifen auf Brusthöhe, 3 px (Stilprobe: y −48 bis −45)
    formen: [polygon([-12, -12.5], [12, -12.5], [12, -9.5], [-12, -9.5])],
    material: 'STREIFEN',
    gruppe: 'rumpf',
    ebene: EBENE.streifen,
    auf: 'Rumpf',
  },
  {
    name: 'Kopf',
    eltern: 'Rumpf',
    gelenk: P(1, -17),
    // Hals, Kopf, Nase als kleiner Vorsprung im Profil (zeigt die Blickrichtung)
    formen: [kapsel(0, 0, 0.5, -3.5, 2.4), ellipse(1, -8.5, 5.8, 6.6), polygon([5.6, -9.4], [7.6, -7.4], [5.6, -6.6])],
    material: 'HAUT',
    gruppe: 'kopf',
    ebene: EBENE.kopf,
    // Gesicht überwiegend im Grundton (Auftrag 4, 2.4: Gesicht frei); Schatten nur am Rand
    relief: 0.45,
  },
  {
    name: 'Haar',
    eltern: 'Kopf',
    gelenk: P(1, -8.5),
    // Kappe über Scheitel und Hinterkopf, Pony vorn oben; Gesicht bleibt frei
    formen: [
      polygon(
        [-6.6, 1.5],
        [-6.8, -2.5],
        [-5, -5.8],
        [-1.5, -7.4],
        [2.5, -7.3],
        [5.6, -5.2],
        [6.4, -3.2],
        [5, -3.6],
        [3.4, -4.8],
        [1, -4.2],
        [-1.2, -2.6],
        [-2.4, 1],
        [-3.6, 4.4],
        [-6, 4.6],
      ),
    ],
    material: 'HAAR',
    gruppe: 'haar',
    ebene: EBENE.haar,
    glanz: true,
  },
  { name: 'Zopf1', eltern: 'Haar', gelenk: P(-5, -3.5), formen: [kapsel(0, 0, 0, 7, 3, 2.6)], material: 'HAAR', gruppe: 'zopf', ebene: EBENE.zopf },
  { name: 'Zopf2', eltern: 'Zopf1', gelenk: P(0, 7), formen: [kapsel(0, 0, 0, 8, 2.6, 1.2)], material: 'HAAR', gruppe: 'zopf', ebene: EBENE.zopf },
  ...arm('H', -SCHULTER_SEITE, EBENE.armH, EBENE.handH),
  ...bein('H', -HUEFTE_SEITE, EBENE.beinH, EBENE.stiefelH),
  ...bein('V', HUEFTE_SEITE, EBENE.beinV, EBENE.stiefelV),
  ...arm('V', SCHULTER_SEITE, EBENE.armV, EBENE.handV),
];

export const PUPPE_VELA = new Puppe(TEILE);

// ===========================================================================
// Farben: Tonabbildung (Farbbudget 16, docs/grafik.md 1.2 und 4)
// ===========================================================================

const H = HAUT_HELL.treppe;
const HA = HAAR_VELA.treppe;
const J = JACKE_VELA.treppe;
const HS = HANDSCHUH_VELA.treppe;
const HO = HOSE_GRAUBLAU.treppe;
const O = SIGNAL_ORANGE.treppe;

const ZUTEILUNG: Readonly<Record<string, Toene>> = {
  HAUT: [H[1], H[1], H[2], H[3], H[3]],
  HAAR: [HA[1], HA[1], HA[2], O[2], O[2]],
  JACKE: [KONTUR, J[1], J[2], J[3], J[3]],
  STREIFEN: [O[2], O[2], O[2], O[2], O[2]],
  HANDSCHUH: [J[1], J[2], J[3], HS[3], SPULE],
  HOSE: [KONTUR, HO[1], HO[2], HO[3], HO[3]],
  STIEFEL: [KONTUR, J[1], HO[1], HO[2], HO[2]],
  SPULE: [SPULE, SPULE, SPULE, SPULE, SPULE],
};

/** Gesicht (Blick rechts): Auge 2 × 2 (oben Lid und Pupille, unten Pupille), Mund 1 px im Hautschatten. */
const GESICHT = {
  teil: 'Kopf',
  ursprung: P(3, -9),
  zeilen: ['.kk', '.kk', '...', '.m.'],
  farben: { k: KONTUR, m: H[1] as Pixel },
};

export const STIL_VELA: Stil = {
  zuteilung: ZUTEILUNG,
  kontur: KONTUR,
  glanz: new Set<Pixel>([SPULE]),
  gesicht: GESICHT,
};

// ===========================================================================
// Haltungen
// ===========================================================================

/** Arm: Ziel des Handgelenks (Figurkoordinaten), Weltwinkel der Hand (Vorgabe: wie der Unterarm). */
interface Arm {
  readonly ziel: Punkt;
  readonly hand?: number;
  /** true: ziel relativ zum Schultergelenk statt zum Fußpunkt. */
  readonly schulter?: boolean;
}

/** Bein: Knöchel (Figurkoordinaten) und Weltwinkel des Stiefels (0 flach, + Spitze hoch, − Ferse hoch). */
interface Bein {
  readonly knoechel: Punkt;
  readonly fuss: number;
}

/** Haltung: Eingaben, aus denen die Pose (Gelenkwinkel) berechnet wird. */
export interface Haltung {
  readonly huefte: Punkt;
  readonly becken?: number;
  /** Rumpf relativ zum Becken (negativ: nach vorn geneigt). */
  readonly rumpf: number;
  /** Kopf relativ zum Rumpf. */
  readonly kopf: number;
  readonly armV: Arm;
  readonly armH: Arm;
  readonly beinV: Bein;
  readonly beinH: Bein;
  /** Pferdeschwanz: Zopf1 relativ zum Haar, Zopf2 relativ zu Zopf1. */
  readonly zopf: readonly [number, number];
  readonly versatz?: Pose['versatz'];
  readonly ebenen?: Pose['ebenen'];
  readonly spiegeln?: boolean;
  readonly ohneGesicht?: boolean;
}

/** Beuge der Gelenke: Knie nach vorn, Ellbogen nach unten und hinten. */
const KNIE: 1 = 1;
const ELLBOGEN: -1 = -1;

/** Rechnet eine Haltung in eine Pose um (Beine und Arme über zwei Gelenke). */
export function pose(h: Haltung): Pose {
  const pu = PUPPE_VELA;
  let p: Pose = {
    wurzel: h.huefte,
    winkel: { Becken: h.becken ?? 0, Rumpf: h.rumpf, Kopf: h.kopf, Zopf1: h.zopf[0], Zopf2: h.zopf[1] },
    ...(h.versatz !== undefined ? { versatz: h.versatz } : {}),
    ...(h.ebenen !== undefined ? { ebenen: h.ebenen } : {}),
    ...(h.spiegeln !== undefined ? { spiegeln: h.spiegeln } : {}),
    ...(h.ohneGesicht !== undefined ? { ohneGesicht: h.ohneGesicht } : {}),
  };
  const mit = (w: Record<string, number>): void => {
    p = { ...p, winkel: { ...p.winkel, ...w } };
  };
  for (const s of ['V', 'H'] as const) {
    const b = s === 'V' ? h.beinV : h.beinH;
    mit(pu.zweiGelenke(p, `Oberschenkel${s}`, `Unterschenkel${s}`, `Stiefel${s}`, b.knoechel, KNIE));
    mit(pu.weltWinkel(p, `Stiefel${s}`, b.fuss));
    const a = s === 'V' ? h.armV : h.armH;
    let ziel = a.ziel;
    if (a.schulter === true) {
      const sch = (pu.lagen(p).get(`Oberarm${s}`) as { pos: Punkt }).pos;
      ziel = P(sch.x + a.ziel.x, sch.y + a.ziel.y);
    }
    mit(pu.zweiGelenke(p, `Oberarm${s}`, `Unterarm${s}`, `Hand${s}`, ziel, ELLBOGEN));
    if (a.hand !== undefined) mit(pu.weltWinkel(p, `Hand${s}`, a.hand));
  }
  return p;
}

/** Rastert eine Haltung. */
export function zeichne(h: Haltung): Gerastert {
  return PUPPE_VELA.rastern(pose(h), STIL_VELA);
}

function bild(h: Haltung, dauer: number): Bild {
  const g = zeichne(h);
  return { leinwand: g.leinwand, ankerX: g.ankerX, ankerY: g.ankerY, dauer };
}

// ---------------------------------------------------------------------------
// Stand: Kampfhaltung wie die Stilprobe (Beine gegrätscht, vordere Faust
// vorn auf Brusthöhe, hintere Faust vor der Brust)
// ---------------------------------------------------------------------------

export const STAND: Haltung = {
  huefte: P(-1, -32),
  rumpf: -4,
  kopf: 4,
  armV: { ziel: P(19, -48), hand: 112 },
  armH: { ziel: P(8, -44), hand: 125 },
  beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
  zopf: [-45, 20],
};

// ---------------------------------------------------------------------------
// Gehen: 12 Bilder zu 4 Frames, 84 px je Zyklus (docs/design.md 8); der
// Standfuß wandert je Bild um 4 · 1,75 = 7 px nach hinten (Auftrag 4, 1.4)
// ---------------------------------------------------------------------------

/** Bilder des Gehzyklus und Frames je Bild (docs/design.md 8). */
const GEHEN_BILDER = 12;
const GEHEN_DAUER = 4;
/** px je Bild: Frames je Bild · Laufgeschwindigkeit x (werte.ts LAUF_X = 1,75). */
export const GEHEN_SCHRITT = (GEHEN_DAUER * LAUF_X) / EINS;
/** Bilder, die ein Fuß steht (halber Zyklus, an den Enden beide Füße am Boden). */
const STANDBILDER = GEHEN_BILDER / 2;
/** Fußhub in der Schwungphase und Neigung des Stiefels beim Aufsetzen und Abrollen (Festlegung G0). */
const FUSS_HUB = 6;
const FERSE_AUF = 12;
const SPITZE_AB = -22;

/** Knöchel, wenn der Stiefel um winkel Grad um den Kontaktpunkt (Ferse oder Spitze) gedreht auf dem Boden steht. */
function knoechelUeber(kontakt: Punkt, kontaktLokal: Punkt, winkel: number): Punkt {
  const w = (winkel * Math.PI) / 180;
  // drehe() der Geometrie: (x, y) → (x cos + y sin, −x sin + y cos)
  const dx = kontaktLokal.x * Math.cos(w) + kontaktLokal.y * Math.sin(w);
  const dy = -kontaktLokal.x * Math.sin(w) + kontaktLokal.y * Math.cos(w);
  return P(kontakt.x - dx, kontakt.y - dy);
}

/**
 * Lage eines Fußes im Bild i des Gehzyklus (Phase versetzt um versatz
 * Bilder). Standphase i = 0 … 6: Ferse setzt bei Bild 0 auf (Spitze hoch),
 * Bild 1 bis 5 flach, Bild 6 rollt über die Spitze ab; der Fuß liegt dabei
 * fest auf dem Boden, rückt also je Bild um GEHEN_SCHRITT nach hinten.
 */
function gehFuss(i: number, versatz: number, mitte: number): Bein {
  const k = (((i + versatz) % GEHEN_BILDER) + GEHEN_BILDER) % GEHEN_BILDER;
  // Knöchel beim flachen Fuß: Bild 0 vorn, je Bild GEHEN_SCHRITT zurück; Bild 3 (Mitte der Standphase) bei mitte.
  const vorn = mitte + (STANDBILDER / 2) * GEHEN_SCHRITT;
  if (k <= STANDBILDER) {
    const flach = P(vorn - k * GEHEN_SCHRITT, -KNOECHEL);
    if (k === 0) {
      const ferse = P(flach.x + FERSE.x, 0);
      return { knoechel: knoechelUeber(ferse, FERSE, FERSE_AUF), fuss: FERSE_AUF };
    }
    if (k === STANDBILDER) {
      // Spitze bleibt, wo sie im Bild davor (flach) lag, minus ein Schritt
      const spitze = P(vorn - (STANDBILDER - 1) * GEHEN_SCHRITT + SPITZE.x - GEHEN_SCHRITT, 0);
      return { knoechel: knoechelUeber(spitze, SPITZE, SPITZE_AB), fuss: SPITZE_AB };
    }
    return { knoechel: flach, fuss: 0 };
  }
  // Schwungphase: von hinten nach vorn, angehoben
  const s = (k - STANDBILDER) / STANDBILDER;
  const hinten = vorn - STANDBILDER * GEHEN_SCHRITT;
  const x = hinten + (vorn - hinten) * s;
  const hub = Math.sin(Math.PI * s) * FUSS_HUB;
  return { knoechel: P(x, -KNOECHEL - hub), fuss: SPITZE_AB * (1 - s) + FERSE_AUF * s * 0.5 };
}

/** Lage der Hüfte beim Gehen (x) und Versatz der Standphase gegen das Hüftgelenk (Festlegung G0: Abrollen hebt den Knöchel hinten stärker). */
const GEHEN_HUEFTE_X = 1;
const GEHEN_MITTE = -2;

/** Höchste Hüfte beim Gehen: Knie immer leicht gebeugt, damit die Hüfte nur wenig wippt (Festlegung G0). */
const GEHEN_HUEFTE_MAX = -32;

/** Haltungen des Gehzyklus (12 Bilder). */
export function gehen(): Haltung[] {
  const aus: Haltung[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const beinV = gehFuss(i, 0, GEHEN_HUEFTE_X + HUEFTE_SEITE + GEHEN_MITTE);
    const beinH = gehFuss(i, STANDBILDER, GEHEN_HUEFTE_X - HUEFTE_SEITE + GEHEN_MITTE);
    // Hüfte so hoch, wie beide Beine (Knöchel) es mit leicht gebeugtem Knie erlauben, höchstens GEHEN_HUEFTE_MAX
    const hx = GEHEN_HUEFTE_X;
    const reich = SCHENKEL + SCHIENBEIN - 1;
    const hoehe = (b: Bein, seite: number): number => {
      const dx = b.knoechel.x - (hx + seite);
      return b.knoechel.y - Math.sqrt(Math.max(0, reich * reich - dx * dx));
    };
    const hy = Math.max(hoehe(beinV, HUEFTE_SEITE), hoehe(beinH, -HUEFTE_SEITE), GEHEN_HUEFTE_MAX);
    const phase = (2 * Math.PI * i) / GEHEN_BILDER;
    // Arme gegen die Beine: der vordere Arm schwingt zurück, wenn das vordere Bein vorn aufsetzt (Bild 0)
    const schwung = Math.cos(phase);
    const arm = (s: number): Arm => ({ ziel: P(3 + 9 * s, 14 - 3 * Math.max(0, s)), hand: 70 + 40 * s, schulter: true });
    aus.push({
      huefte: P(hx, hy),
      rumpf: -6,
      kopf: 6,
      armV: arm(-schwung),
      armH: arm(schwung),
      beinV,
      beinH,
      zopf: [-55 + 8 * Math.sin(phase * 2), 25 + 6 * Math.sin(phase * 2)],
    });
  }
  return aus;
}

// ---------------------------------------------------------------------------
// Kette: Schlagbild im ersten aktiven Frame (werte.ts KETTE_AKTIV_VON),
// Ausholen davor, Rückzug danach; Bildzahlen und Dauern nach docs/design.md 8
// ---------------------------------------------------------------------------

/** Kette Stufe 1, Dauern 1/4/1/1/1/8 (docs/design.md 8; Summe 16 = werte.ts LEERSCHLAG_DAUER). */
const KETTE1_DAUERN = [1, 4, 1, 1, 1, 8] as const;
/** Kette Stufe 2: design.md 1/1/11/1 (11 = 4 + 7 Stopp), ohne Stopp 1/1/4/1; letztes Bild hält bis uhr 16 (KETTE2_LEER_DAUER). */
const KETTE2_DAUERN = [1, 1, 4, 10] as const;
/** Kette Stufe 3: design.md 1/1/1/11/2, ohne Stopp 1/1/1/4/2; letztes Bild hält bis uhr 17 (KETTE3_LEER_DAUER). */
const KETTE3_DAUERN = [1, 1, 1, 4, 10] as const;
/** Kette Stufe 4: design.md 1/1/11/2/2/2/2/2/4/2/2/1, ohne Stopp Summe 25 (KETTE4_DAUER). */
const KETTE4_DAUERN = [1, 1, 4, 2, 2, 2, 2, 2, 4, 2, 2, 1] as const;

/** Index des Bildes, das bei Aktionsuhr uhr (1 = erstes Bild) gezeigt wird. */
export function bildBeiUhr(dauern: readonly number[], uhr: number): number {
  let summe = 0;
  for (let i = 0; i < dauern.length; i++) {
    summe += dauern[i] as number;
    if (uhr <= summe) return i;
  }
  return dauern.length - 1;
}

/** Hinteres Bein mit angehobener Ferse: Spitze auf dem Boden bei x, Stiefel um winkel Grad (negativ) gedreht. */
function knoechelAufSpitze(x: number, winkel: number): Bein {
  return { knoechel: knoechelUeber(P(x, 0), SPITZE, winkel), fuss: winkel };
}

/** Schlagarm im Trefferbild um diese px im Ellbogen und Handgelenk gestreckt (Zug wie im Zeichentrick, nur im Trefferbild; Festlegung G0). */
const STRECKUNG_ARM = { UnterarmV: P(0, 1.5), HandV: P(0, 1) } as const;
const STRECKUNG_ARM_H = { UnterarmH: P(0, 1.5), HandH: P(0, 1) } as const;
const STRECKUNG_BEIN = { UnterschenkelV: P(0, 2), StiefelV: P(0, 1) } as const;
/** Hinterer Arm vorn gezeichnet (Auftrag 4, 2.4: der schlagende Arm liegt vorn). */
const ARM_H_VORN = { OberarmH: 52, UnterarmH: 52, HandH: 53, SpuleH: 54 } as const;
/** Vorderes Bein vor dem Rumpf (Tritt). */
const BEIN_V_VORN = { OberschenkelV: 45, UnterschenkelV: 45, StiefelV: 46 } as const;
/** Deckung: hintere Faust vor dem Kinn (relativ zur Schulter). */
const DECKUNG_H: Arm = { ziel: P(9, 5), hand: 130, schulter: true };

function kette1(): Haltung[] {
  // Gerade mit der vorderen Faust aus dem Ausfallschritt
  const ausholen: Haltung = {
    ...STAND,
    huefte: P(-2, -31.5),
    rumpf: 2,
    kopf: 2,
    armV: { ziel: P(11, -47), hand: 115 },
    zopf: [-40, 18],
  };
  const treffer: Haltung = {
    huefte: P(8, -30),
    rumpf: -22,
    kopf: 18,
    armV: { ziel: P(70, -50), hand: 90 },
    armH: DECKUNG_H,
    beinV: { knoechel: P(21, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    zopf: [-70, 30],
    versatz: { OberarmV: P(3, 0), ...STRECKUNG_ARM },
  };
  const zurueck: Haltung = {
    ...treffer,
    huefte: P(4, -31),
    rumpf: -12,
    kopf: 10,
    armV: { ziel: P(22, -48), hand: 105 },
    beinV: { knoechel: P(15, -KNOECHEL), fuss: 0 },
    zopf: [-58, 25],
    versatz: { OberarmV: P(1, 0) },
  };
  return [ausholen, treffer, zwischen(treffer, zurueck), zurueck, zwischen(zurueck, STAND), STAND];
}

function kette2(): Haltung[] {
  // Gerade mit der hinteren Faust, Schulter dreht nach vorn
  const ausholen: Haltung = {
    ...STAND,
    huefte: P(-3, -31.5),
    rumpf: 4,
    kopf: 0,
    armV: { ziel: P(14, -48), hand: 115 },
    armH: { ziel: P(-4, -44), hand: 100 },
    zopf: [-38, 15],
  };
  const treffer: Haltung = {
    huefte: P(9, -30),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(8, 4), hand: 140, schulter: true },
    armH: { ziel: P(72, -48), hand: 90 },
    beinV: { knoechel: P(22, -KNOECHEL), fuss: 0 },
    beinH: knoechelAufSpitze(-10, -18),
    zopf: [-72, 30],
    versatz: { OberarmH: P(8, 1), ...STRECKUNG_ARM_H },
    ebenen: ARM_H_VORN,
  };
  const schwung = { ...zwischen(ausholen, treffer), ebenen: ARM_H_VORN };
  const zurueck: Haltung = {
    ...treffer,
    huefte: P(5, -31),
    rumpf: -14,
    kopf: 12,
    armH: { ziel: P(28, -47), hand: 100 },
    armV: { ziel: P(9, 0), hand: 135, schulter: true },
    beinV: { knoechel: P(16, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    zopf: [-60, 22],
    versatz: { OberarmH: P(4, 0) },
  };
  return [ausholen, schwung, treffer, zurueck];
}

function kette3(): Haltung[] {
  // Aufwärtshaken mit der vorderen Faust aus der Hocke
  const tief: Haltung = {
    ...STAND,
    huefte: P(-2, -28),
    rumpf: 2,
    kopf: 2,
    armV: { ziel: P(8, -33), hand: 60 },
    armH: DECKUNG_H,
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
    zopf: [-30, 12],
  };
  const tiefer: Haltung = { ...tief, huefte: P(-1, -26.5), rumpf: -4, kopf: 6, armV: { ziel: P(6, -29), hand: 40 }, zopf: [-28, 10] };
  const treffer: Haltung = {
    huefte: P(7, -33),
    rumpf: -18,
    kopf: 8,
    armV: { ziel: P(60, -76), hand: 140 },
    armH: DECKUNG_H,
    beinV: { knoechel: P(18, -KNOECHEL), fuss: 0 },
    beinH: knoechelAufSpitze(-9, -30),
    zopf: [-82, 38],
    versatz: { OberarmV: P(3, -1), ...STRECKUNG_ARM },
  };
  const zurueck: Haltung = {
    ...treffer,
    huefte: P(4, -32),
    rumpf: -10,
    kopf: 6,
    armV: { ziel: P(28, -55), hand: 130 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    zopf: [-65, 20],
    versatz: { OberarmV: P(1, 0) },
  };
  const auf: Haltung = {
    ...tiefer,
    huefte: P(3, -30),
    rumpf: -10,
    kopf: 8,
    armV: { ziel: P(20, -36), hand: 160 },
    beinV: { knoechel: P(16, -KNOECHEL), fuss: 0 },
    zopf: [-50, 25],
  };
  return [tief, tiefer, auf, treffer, zurueck];
}

function kette4(): Haltung[] {
  // Abschlusstritt mit dem vorderen Bein, Drehung und zweiter Tritt im Nachlauf (docs/design.md 8)
  const heben: Haltung = {
    ...STAND,
    huefte: P(-2, -33),
    rumpf: 6,
    kopf: -2,
    armV: { ziel: P(14, -48), hand: 120 },
    armH: DECKUNG_H,
    beinV: { knoechel: P(6, -17), fuss: 20 },
    beinH: { knoechel: P(-6, -KNOECHEL), fuss: 0 },
    zopf: [-40, 15],
    ebenen: BEIN_V_VORN,
  };
  const knie: Haltung = { ...heben, huefte: P(-1, -34), rumpf: 12, kopf: -6, beinV: { knoechel: P(9, -27), fuss: 45 }, zopf: [-36, 12] };
  const tritt: Haltung = {
    ...heben,
    huefte: P(6, -34),
    rumpf: 26,
    kopf: -18,
    armV: { ziel: P(6, -2), hand: 130, schulter: true },
    armH: { ziel: P(-12, 6), hand: 40, schulter: true },
    beinV: { knoechel: P(70, -36), fuss: 88 },
    beinH: { knoechel: P(1, -KNOECHEL), fuss: 0 },
    zopf: [-25, 8],
    versatz: STRECKUNG_BEIN,
  };
  const einziehen: Haltung = { ...knie, huefte: P(1, -34), rumpf: 14, beinH: { knoechel: P(-2, -KNOECHEL), fuss: 0 }, zopf: [-45, 15] };
  // Drehung: Rücken zum Betrachter (hinterer Arm und Pferdeschwanz vorn, ohne Gesicht), dann Blick nach hinten (gespiegelt)
  const ruecken: Haltung = {
    ...STAND,
    huefte: P(-1, -33),
    rumpf: 0,
    kopf: 0,
    armV: { ziel: P(6, -44), hand: 120 },
    armH: { ziel: P(10, -44), hand: 120 },
    beinV: { knoechel: P(5, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-5, -KNOECHEL), fuss: 0 },
    ohneGesicht: true,
    ebenen: { ...ARM_H_VORN, Zopf1: 40, Zopf2: 40 },
    zopf: [-10, 5],
  };
  const hinten: Haltung = { ...ruecken, spiegeln: true, ohneGesicht: false, ebenen: {}, zopf: [-35, 15] };
  const ausholen2: Haltung = { ...knie, zopf: [-60, 20] };
  const tritt2: Haltung = { ...tritt, rumpf: 30, kopf: -20, beinV: { knoechel: P(70, -44), fuss: 95 }, zopf: [-85, 12] };
  const ab: Haltung = { ...knie, huefte: P(0, -33), rumpf: 6, beinV: { knoechel: P(12, -15), fuss: 15 }, zopf: [-55, 20] };
  const landen: Haltung = { ...STAND, huefte: P(-1, -31) };
  return [heben, knie, tritt, einziehen, ruecken, hinten, ruecken, ausholen2, tritt2, ab, landen, STAND];
}

// ===========================================================================
// Animationen
// ===========================================================================

function animation(name: string, haltungen: readonly Haltung[], dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation {
  if (haltungen.length !== dauern.length) throw new Error(`Vela ${name}: ${haltungen.length} Haltungen, ${dauern.length} Dauern`);
  const bilder = haltungen.map((h, i) => bild(h, dauern[i] as number));
  return aktiv !== undefined ? { name, schleife, bilder, aktiv } : { name, schleife, bilder };
}

/** Bildindex des ersten aktiven Frames einer Kettenstufe (1 bis 4). */
export function trefferBild(stufe: number, dauern: readonly number[]): number {
  return bildBeiUhr(dauern, KETTE_AKTIV_VON[stufe - 1] as number);
}

export const DAUERN = { kette1: KETTE1_DAUERN, kette2: KETTE2_DAUERN, kette3: KETTE3_DAUERN, kette4: KETTE4_DAUERN } as const;

/** Alle Animationen von Vela (Phase 1). */
export function velaAnimationen(): Animation[] {
  return [
    animation('stand', [STAND], [0], true),
    animation('gehen', gehen(), new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true),
    animation('kette1', kette1(), KETTE1_DAUERN, false, [trefferBild(1, KETTE1_DAUERN)]),
    animation('kette2', kette2(), KETTE2_DAUERN, false, [trefferBild(2, KETTE2_DAUERN)]),
    animation('kette3', kette3(), KETTE3_DAUERN, false, [trefferBild(3, KETTE3_DAUERN)]),
    animation('kette4', kette4(), KETTE4_DAUERN, false, [trefferBild(4, KETTE4_DAUERN), bildBeiUhr(KETTE4_DAUERN, KETTE4_ZWEITES_FENSTER_VON)]),
  ];
}

/** Ziel des Handgelenks in Figurkoordinaten (Schulterangaben aufgelöst). */
function armAbsolut(h: Haltung, seite: 'V' | 'H'): Arm {
  const a = seite === 'V' ? h.armV : h.armH;
  if (a.schulter !== true) return a;
  const sch = (PUPPE_VELA.lagen(pose(h)).get(`Oberarm${seite}`) as { pos: Punkt }).pos;
  return { ziel: P(sch.x + a.ziel.x, sch.y + a.ziel.y), ...(a.hand !== undefined ? { hand: a.hand } : {}) };
}

/**
 * Zwischenbild zwischen zwei Schlüsselhaltungen (Auftrag 4, 2.4: höchstens
 * ein Zwischenbild): Eingaben der Haltung linear gemischt (Hüfte, Winkel,
 * Ziele von Händen und Knöcheln, Versätze), dann wie jede Haltung über die
 * Gelenke gelöst. So bleiben Füße, die in beiden Haltungen stehen, am Boden.
 */
export function zwischen(a: Haltung, b: Haltung, t: number = 0.5): Haltung {
  const m = (x: number, y: number): number => x + (y - x) * t;
  const mp = (p: Punkt, q: Punkt): Punkt => P(m(p.x, q.x), m(p.y, q.y));
  const arm = (seite: 'V' | 'H'): Arm => {
    const p = armAbsolut(a, seite);
    const q = armAbsolut(b, seite);
    const hand = p.hand !== undefined && q.hand !== undefined ? m(p.hand, q.hand) : (q.hand ?? p.hand);
    return { ziel: mp(p.ziel, q.ziel), ...(hand !== undefined ? { hand } : {}) };
  };
  const bein = (p: Bein, q: Bein): Bein => ({ knoechel: mp(p.knoechel, q.knoechel), fuss: m(p.fuss, q.fuss) });
  const versatz: Record<string, Punkt> = {};
  const va = a.versatz ?? {};
  const vb = b.versatz ?? {};
  for (const k of new Set([...Object.keys(va), ...Object.keys(vb)])) versatz[k] = mp(va[k] ?? P(0, 0), vb[k] ?? P(0, 0));
  const naeher = t < 0.5 ? a : b;
  return {
    huefte: mp(a.huefte, b.huefte),
    becken: m(a.becken ?? 0, b.becken ?? 0),
    rumpf: m(a.rumpf, b.rumpf),
    kopf: m(a.kopf, b.kopf),
    armV: arm('V'),
    armH: arm('H'),
    beinV: bein(a.beinV, b.beinV),
    beinH: bein(a.beinH, b.beinH),
    zopf: [m(a.zopf[0], b.zopf[0]), m(a.zopf[1], b.zopf[1])],
    versatz,
    ...(naeher.ebenen !== undefined ? { ebenen: naeher.ebenen } : {}),
    ...(naeher.spiegeln !== undefined ? { spiegeln: naeher.spiegeln } : {}),
    ...(naeher.ohneGesicht !== undefined ? { ohneGesicht: naeher.ohneGesicht } : {}),
  };
}
