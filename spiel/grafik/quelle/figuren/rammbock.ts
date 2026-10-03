// Rammbock, Schlepperfahrer, als Gliederpuppe (Auftrag 4, 2.4 und 4; Phase 1,
// Vergleich an Haltepunkt 1 nach Auftrag 4, 9.4: stand, gehen,
// kampfhaltung, schlag, getroffen). Aussehen nach Auftrag 4, 4: breit, kahl,
// kurzer Bart, olivgrüne Polsterweste über nacktem Oberkörper, braune Hose
// mit Knieschützern aus Stahl; gedrungen-kräftig, breite Schultern, große
// Hände, deutlich wuchtiger als Vela (figuren/vela.ts ist das Muster).
//
// Maße in Spielpixeln. Herkunft: Umriss 60 × 76 mit Schatten
// (src/darstellung/masse.ts, UMRISS_GEGNER.Rammbock), Körper im Stand
// höchstens 76 − SCHATTEN_HOEHE / 2 = 71 px hoch (docs/grafik.md 1.1 und
// 2.5); Proportionen nach Auftrag 4, 1.1 (Kopf etwa 1/5 der Körperhöhe,
// große Hände und Füße, breite Schultern bei schweren Figuren). Zeiten aus
// src/kern/werte.ts (RAMMBOCK_GEHEN_X, NAH_ANGRIFFE.RA, REAKTION_ANIMATION)
// und docs/design-gegner-stages.md 9; Festlegungen in docs/grafik.md 4.2 und
// Abschnitt 7 (G0c-…).

import type { Animation, Bild } from '../blatt.ts';
import type { Form, Punkt } from '../geometrie.ts';
import type { Pixel } from '../leinwand.ts';
import { HAUT_MITTEL, HOSE_BRAUN, KONTUR, STAHL, WESTE_OLIV } from '../palette.ts';
import type { Gerastert, Gesicht, Pose, Stil, TeilDef, Toene } from '../puppe.ts';
import { Puppe } from '../puppe.ts';
import { NAH_ANGRIFFE, RAMMBOCK_GEHEN_X, REAKTION_ANIMATION, REAKTION_DAUER } from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';

// ===========================================================================
// Maße
// ===========================================================================

/** Sohle bis Knöchel (schwere Arbeitsstiefel; Vela 5, der Rammbock 1 px mehr für den schweren Stand). */
const KNOECHEL = 6;
/** Hüfte bis Knie und Knie bis Knöchel (Beinlänge 26 + 6 = 32: gedrungen, kürzer als Vela mit 35 bei gleicher Gesamthöhe). */
const SCHENKEL = 13;
const SCHIENBEIN = 13;
/** Schulter bis Ellbogen, Ellbogen bis Handgelenk (kräftige Arme; Reichweite des Schlags etwa 46 px, Auftrag 4, 1.1). */
const OBERARM = 12;
const UNTERARM = 11;
/** Radien der Arme an Schulter, Ellbogen und Handgelenk (Vela 3,4 / 3 / 2,6; wuchtiger). */
const OBERARM_R = [4.8, 4.2] as const;
const UNTERARM_R = [4.2, 3.6] as const;
/** Radien der Beine an Hüfte, Knie und Knöchel (weite Arbeitshose; Vela 5 / 4,2 / 3,4). */
const SCHENKEL_R = [6, 5.2] as const;
const SCHIENBEIN_R = [5.2, 4.4] as const;
/** Hüftgelenke links und rechts der Beckenmitte (Vela 2,5; breiter Stand). */
const HUEFTE_SEITE = 3.5;
/**
 * Schultergelenke im Rumpf (Höhe über der Taille, Vela 15). Der Rumpf ist
 * halb von vorn gesehen, die Brust zum Betrachter gedreht: Die nahe (vordere)
 * Schulter liegt links der Mitte über der Flanke, die ferne (hintere) rechts
 * hinter der Brust (Festlegung G0c, docs/grafik.md 4.2). Abstand 13 px:
 * breite Schultern (Vela 7).
 */
const SCHULTER_V_X = -4;
const SCHULTER_H_X = 9;
const SCHULTER_HOEHE = 19;
/** Taille über dem Beckengelenk (Vela 2; 1 px mehr: langer, schwerer Rumpf, Körper im Stand 70 px hoch). */
const TAILLE = 3;

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

/**
 * Zeichenreihenfolge (Auftrag 4, 2.4: hinterer Arm, hinteres Bein, Rumpf,
 * Kopf, vorderes Bein, vorderer Arm). Die Weste liegt über dem nackten Rumpf,
 * ihr vorderes Schulterpolster über dem vorderen Oberarm.
 */
const EBENE = {
  armH: 10,
  handH: 11,
  beinH: 20,
  stiefelH: 21,
  knieH: 22,
  beinV: 26,
  stiefelV: 27,
  knieV: 28,
  becken: 29,
  rumpf: 30,
  weste: 32,
  naht: 33,
  kopf: 35,
  bart: 36,
  armV: 50,
  handV: 51,
  polster: 52,
} as const;

/** Stiefel im Rahmen des Knöchels: Schaft bis 5 über dem Knöchel, Spitze 11 vor, Ferse 5,2 bis 5,6 hinter dem Knöchel (gut 16 lang, Vela 14,5; große Füße). */
const STIEFEL = polygon([-4.8, -5], [4.4, -5], [5, -1.2], [8.2, -0.2], [10.6, 1.6], [11, KNOECHEL], [-5.2, KNOECHEL], [-5.6, 1]);
/** Sohlenpunkt (Mitte der Sohle), Ferse und Spitze im Rahmen des Knöchels (Drehpunkte beim Abrollen). */
const SOHLE = P(2.9, KNOECHEL);
const FERSE = P(-5.2, KNOECHEL);
const SPITZE = P(11, KNOECHEL);

/** Knieschützer aus Stahl im Rahmen des Unterschenkels (Knie = 0, 0): Platte vor dem Knie, oben gerundet, 7 × 9. */
const KNIESCHUTZ = polygon([-0.6, -2.4], [2.2, -3.8], [5, -2.6], [6, 1], [4.8, 4.8], [1.4, 5.6], [-0.8, 3]);

/**
 * Faust im Rahmen des Handgelenks (y entlang des Unterarms): kantiger Block
 * 10,4 × 9,8 mit Knöcheln am Ende (große Hände, Auftrag 4, 1.1; Velas
 * Handschuh 9,2 × 10).
 */
const FAUST = polygon([-4, -0.4], [4, -0.4], [5.2, 2.6], [5.2, 7.2], [3.8, 9.4], [-3.8, 9.4], [-5.2, 7.2], [-5.2, 2.6]);
/** Fingerfalten auf der Fingerseite der Faust (−x), zwei Linien zu 1 px. */
const FALTEN: Form[] = [4.2, 7].map((y) => polygon([-6, y - 0.5], [-1, y - 0.5], [-1, y + 0.5], [-6, y + 0.5]));

function arm(seite: 'V' | 'H', x: number, ebeneArm: number, ebeneHand: number): TeilDef[] {
  return [
    {
      name: `Oberarm${seite}`,
      eltern: 'Rumpf',
      gelenk: P(x, -SCHULTER_HOEHE),
      formen: [kapsel(0, 0, 0, OBERARM, OBERARM_R[0], OBERARM_R[1])],
      material: 'HAUT',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    {
      name: `Unterarm${seite}`,
      eltern: `Oberarm${seite}`,
      gelenk: P(0, OBERARM),
      formen: [kapsel(0, 0, 0, UNTERARM, UNTERARM_R[0], UNTERARM_R[1])],
      material: 'HAUT',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    {
      name: `Hand${seite}`,
      eltern: `Unterarm${seite}`,
      gelenk: P(0, UNTERARM),
      formen: [FAUST],
      material: 'HAUT',
      gruppe: `hand${seite}`,
      ebene: ebeneHand,
      kissen: 2,
    },
    {
      name: `Falten${seite}`,
      eltern: `Hand${seite}`,
      gelenk: P(0, 0),
      formen: FALTEN,
      material: 'FALTE',
      gruppe: `hand${seite}`,
      ebene: ebeneHand + 0.5,
      flach: true,
      auf: `Hand${seite}`,
    },
  ];
}

function bein(seite: 'V' | 'H', x: number, ebeneBein: number, ebeneStiefel: number, ebeneKnie: number): TeilDef[] {
  return [
    {
      name: `Oberschenkel${seite}`,
      eltern: 'Becken',
      gelenk: P(x, 1),
      formen: [kapsel(0, 0, 0, SCHENKEL, SCHENKEL_R[0], SCHENKEL_R[1])],
      material: 'HOSE',
      gruppe: `bein${seite}`,
      ebene: ebeneBein,
    },
    {
      name: `Unterschenkel${seite}`,
      eltern: `Oberschenkel${seite}`,
      gelenk: P(0, SCHENKEL),
      formen: [kapsel(0, 0, 0, SCHIENBEIN, SCHIENBEIN_R[0], SCHIENBEIN_R[1])],
      material: 'HOSE',
      gruppe: `bein${seite}`,
      ebene: ebeneBein,
    },
    {
      name: `Knie${seite}`,
      eltern: `Unterschenkel${seite}`,
      gelenk: P(0, 0),
      formen: [KNIESCHUTZ],
      material: 'STAHL',
      gruppe: `knie${seite}`,
      ebene: ebeneKnie,
      glanz: true,
      kissen: 2,
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

/**
 * Rumpf im Rahmen der Taille (y nach oben negativ), halb von vorn gesehen
 * wie Vela: breite Schultern (±12,4 auf Brusthöhe), Bauch vorn gewölbt,
 * Taille ±9; Nacken 22,6 über der Taille.
 */
const RUMPF = polygon(
  [-9, 4],
  [9.5, 4],
  [11, -2],
  [11.6, -7],
  [12.4, -12],
  [12, -17],
  [9.6, -20.6],
  [4, -22.6],
  [-3, -22.6],
  [-9.6, -20.8],
  [-12.4, -17],
  [-12, -9],
  [-10.4, -3],
);

/**
 * Polsterweste im Rahmen der Taille, offen getragen und halb von vorn
 * gesehen: zwei gepolsterte Vorderteile (1 px über den Rumpf hinaus) rahmen
 * Brust und Bauch, die frei bleiben (nackter Oberkörper, Auftrag 4, 4);
 * Kragenpolster im Nacken.
 */
const WESTE_LINKS = polygon([-10, 3.6], [-3.6, 3.6], [-4.2, -6], [-5, -14], [-5.2, -21.6], [-8, -22.6], [-11.4, -21.4], [-13.6, -17.4], [-13.4, -9], [-11.6, -3]);
const WESTE_RECHTS = polygon([6.6, 3.6], [10, 3.6], [11.8, -2], [12.6, -7], [13.4, -12], [13, -17], [10.6, -20.8], [7.8, -21.8], [7.6, -14], [7, -6]);
const KRAGEN = kapsel(-7, -22, 7, -22.4, 2.4, 2.2);
/** Steppnähte der Polsterung: drei waagrechte Linien (1 px, nur auf der Weste). */
const NAEHTE: Form[] = [-4.5, -10.5, -16.5].map((y) => polygon([-16, y - 0.5], [16, y - 0.5], [16, y + 0.5], [-16, y + 0.5]));
/** Brustlinie unter den Brustmuskeln mit Kerbe am Brustbein, Nabel (1 px im Hautschatten, nur auf dem Rumpf). */
const BRUSTLINIE: Form[] = [
  polygon([-4.6, -11.6], [0.6, -10.4], [1.4, -11.6], [7.2, -12.4], [7.2, -11.4], [1.6, -10.6], [0.8, -9.4], [-4.6, -10.6]),
  polygon([1, -3.6], [2, -3.6], [2, -1.6], [1, -1.6]),
];
/** Gürtel über dem Hosenbund (Rahmen des Beckens) und Schnalle aus Stahl vorn. */
const GUERTEL = polygon([-9.6, -4.4], [10, -4.4], [10.2, -1.6], [-9.8, -1.6]);
const SCHNALLE = polygon([2.6, -4.8], [5.6, -4.8], [5.6, -1.2], [2.6, -1.2]);
/** Schulterpolster der Weste über dem vorderen Oberarm (Rahmen des Rumpfs, um die nahe Schulter). */
const POLSTER = polygon([-9.6, -22.4], [-4.4, -23.6], [-0.4, -22], [0.6, -18.6], [-3.4, -17.4], [-8.6, -18.4]);
/** Ohr im Rahmen des Kopfs (hinter der Kiefermitte, auf Augenhöhe). */
const OHR = ellipse(-1.4, -7.6, 1.6, 2.4);

const TEILE: TeilDef[] = [
  { name: 'Becken', eltern: null, gelenk: P(0, 0), formen: [kapsel(-4, 0, 4, 0, 5.4)], material: 'HOSE', gruppe: 'rumpf', ebene: EBENE.becken },
  { name: 'Guertel', eltern: 'Becken', gelenk: P(0, 0), formen: [GUERTEL], material: 'GUERTEL', gruppe: 'guertel', ebene: EBENE.rumpf + 2 },
  { name: 'Schnalle', eltern: 'Becken', gelenk: P(0, 0), formen: [SCHNALLE], material: 'STAHL', gruppe: 'guertel', ebene: EBENE.rumpf + 3, glanz: true, kissen: 1 },
  { name: 'Rumpf', eltern: 'Becken', gelenk: P(0, -TAILLE), formen: [RUMPF], material: 'HAUT', gruppe: 'rumpf', ebene: EBENE.rumpf, kissen: 3 },
  { name: 'Brust', eltern: 'Rumpf', gelenk: P(0, 0), formen: BRUSTLINIE, material: 'FALTE', gruppe: 'rumpf', ebene: EBENE.rumpf + 1, flach: true, auf: 'Rumpf' },
  {
    name: 'Weste',
    eltern: 'Rumpf',
    gelenk: P(0, 0),
    formen: [WESTE_LINKS, WESTE_RECHTS, KRAGEN],
    material: 'WESTE',
    gruppe: 'weste',
    ebene: EBENE.weste,
    kissen: 3,
  },
  { name: 'Naht', eltern: 'Weste', gelenk: P(0, 0), formen: NAEHTE, material: 'NAHT', gruppe: 'weste', ebene: EBENE.naht, flach: true, auf: 'Weste' },
  {
    name: 'Kopf',
    eltern: 'Rumpf',
    gelenk: P(2, -22),
    // dicker Hals, kahler Schädel, schweres Kinn vorn, Nase als Vorsprung im Profil
    formen: [kapsel(0, 0, 0.6, -4, 3.6), ellipse(1.6, -8.4, 6, 6), polygon([0, -6], [7, -6.4], [7.2, -2.4], [4, -0.6], [0, -1.6]), polygon([6.6, -9.4], [8.6, -7.2], [6.6, -6.4])],
    material: 'HAUT',
    gruppe: 'kopf',
    ebene: EBENE.kopf,
    // Gesicht überwiegend im Grundton (wie Vela, docs/grafik.md 7, G0-5)
    relief: 0.45,
  },
  { name: 'Ohr', eltern: 'Kopf', gelenk: P(0, 0), formen: [OHR], material: 'HAUT', gruppe: 'ohr', ebene: EBENE.kopf + 0.5 },
  {
    name: 'Bart',
    eltern: 'Kopf',
    gelenk: P(0, 0),
    // kurzer Vollbart über Kiefer und Kinn, vom Ohr bis vor das Kinn
    formen: [polygon([-1, -6.4], [1.4, -5.2], [3.6, -4.6], [6.4, -5], [7.8, -4], [7.6, -1.6], [4.6, 0.4], [0.4, 0.2], [-1.6, -2.6])],
    material: 'BART',
    gruppe: 'bart',
    ebene: EBENE.bart,
  },
  ...arm('H', SCHULTER_H_X, EBENE.armH, EBENE.handH),
  ...bein('H', -HUEFTE_SEITE, EBENE.beinH, EBENE.stiefelH, EBENE.knieH),
  ...bein('V', HUEFTE_SEITE, EBENE.beinV, EBENE.stiefelV, EBENE.knieV),
  ...arm('V', SCHULTER_V_X, EBENE.armV, EBENE.handV),
  { name: 'Polster', eltern: 'Rumpf', gelenk: P(0, 0), formen: [POLSTER], material: 'WESTE', gruppe: 'polster', ebene: EBENE.polster, kissen: 2 },
];

export const PUPPE_RAMMBOCK = new Puppe(TEILE);

// ===========================================================================
// Farben: Tonabbildung (Farbbudget 16, docs/grafik.md 1.2 und 4.2)
// ===========================================================================

const H = HAUT_MITTEL.treppe;
const W = WESTE_OLIV.treppe;
const B = HOSE_BRAUN.treppe;
const S = STAHL.treppe;

/**
 * 15 Farben plus durchsichtig: KONTUR, Haut 0 bis 3, Weste 1 bis 3, Hose 1
 * bis 3, Stahl 1 bis 4. Bart und Stiefel teilen die Hosentreppe (Ton 1 als
 * Grund, Ton 2 als Licht; HOSE_BRAUN 1 #3B231A liegt neben dem Grundton von
 * HAAR_DUNKEL #3B2B25). Weste, Hose, Bart und Stiefel nehmen KONTUR als
 * Innenkontur (docs/grafik.md 1.2, Farbbudget).
 */
const ZUTEILUNG: Readonly<Record<string, Toene>> = {
  HAUT: [H[0], H[1], H[2], H[3], H[3]],
  WESTE: [KONTUR, W[1], W[2], W[3], W[3]],
  NAHT: [W[1], W[1], W[1], W[1], W[1]],
  FALTE: [H[1], H[1], H[1], H[1], H[1]],
  HOSE: [KONTUR, B[1], B[2], B[3], B[3]],
  STIEFEL: [KONTUR, B[1], B[1], B[2], B[2]],
  BART: [KONTUR, B[1], B[1], B[2], B[2]],
  GUERTEL: [KONTUR, B[1], B[1], B[2], B[2]],
  STAHL: [S[1], S[1], S[2], S[3], S[4]],
};

/** Gesicht (Blick rechts): Braue im Hautdunkel über dem Auge 2 × 2 in KONTUR. */
const GESICHT: Gesicht = {
  teil: 'Kopf',
  ursprung: P(3, -11),
  zeilen: ['bbbb', '.kk.', '.kk.'],
  farben: { k: KONTUR, b: H[0] as Pixel },
};
/** Gesicht getroffen: Auge zugekniffen (Strich), Braue hochgezogen. */
const GESICHT_GETROFFEN: Gesicht = {
  teil: 'Kopf',
  ursprung: P(3, -11),
  zeilen: ['.bbb', '....', 'kkk.'],
  farben: { k: KONTUR, b: H[0] as Pixel },
};

const GLANZ = new Set<Pixel>([S[4] as Pixel]);

export const STIL_RAMMBOCK: Stil = { zuteilung: ZUTEILUNG, kontur: KONTUR, glanz: GLANZ, gesicht: GESICHT };
const STIL_GETROFFEN: Stil = { ...STIL_RAMMBOCK, gesicht: GESICHT_GETROFFEN };
/** Glanzfarben für die Prüfung der Streupixel (bauen.ts). */
export const GLANZ_RAMMBOCK: ReadonlySet<Pixel> = GLANZ;

// ===========================================================================
// Haltungen
// ===========================================================================

/** Arm: Ziel des Handgelenks (Figurkoordinaten oder relativ zur Schulter), Weltwinkel der Faust. */
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
  /** Rumpf relativ zum Becken (negativ: nach vorn geneigt). */
  readonly rumpf: number;
  /** Kopf relativ zum Rumpf. */
  readonly kopf: number;
  readonly armV: Arm;
  readonly armH: Arm;
  readonly beinV: Bein;
  readonly beinH: Bein;
  readonly versatz?: Pose['versatz'];
  readonly ebenen?: Pose['ebenen'];
  /** Gesicht der Trefferreaktion. */
  readonly getroffen?: boolean;
}

/** Beuge der Gelenke: Knie nach vorn, Ellbogen nach unten und hinten. */
const KNIE: 1 = 1;
const ELLBOGEN: -1 = -1;

/** Rechnet eine Haltung in eine Pose um (Beine und Arme über zwei Gelenke). */
export function pose(h: Haltung): Pose {
  const pu = PUPPE_RAMMBOCK;
  let p: Pose = {
    wurzel: h.huefte,
    winkel: { Rumpf: h.rumpf, Kopf: h.kopf },
    ...(h.versatz !== undefined ? { versatz: h.versatz } : {}),
    ...(h.ebenen !== undefined ? { ebenen: h.ebenen } : {}),
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

/**
 * Größte Breite in px, bis zu der ein sichtbarer Rest eines Knieschützers als
 * Splitter gilt und im Bild entfällt: gut die Hälfte der 7 px breiten Platte
 * (Festlegung G0c).
 */
export const KNIE_SPLITTER = 4;
/** Farben des Stahls in der Tonabbildung (Knieschützer, Schnalle). */
const STAHL_FARBEN: ReadonlySet<Pixel> = new Set<Pixel>([S[1], S[2], S[3], S[4]]);

/**
 * Breitester waagrechter Lauf von Stahlpixeln, die in a sichtbar sind und in b
 * fehlen (Bilder über den Anker ausgerichtet): sichtbare Breite eines Teils,
 * das in b versteckt ist.
 */
function sichtbareStahlbreite(a: Gerastert, b: Gerastert): number {
  let breit = 0;
  for (let y = 0; y < a.leinwand.hoehe; y++) {
    let lauf = 0;
    for (let x = 0; x < a.leinwand.breite; x++) {
      const p = a.leinwand.hole(x, y);
      const anders = STAHL_FARBEN.has(p) && p !== b.leinwand.hole(x - a.ankerX + b.ankerX, y - a.ankerY + b.ankerY);
      lauf = anders ? lauf + 1 : 0;
      breit = Math.max(breit, lauf);
    }
  }
  return breit;
}

/**
 * Rastert eine Haltung. Ein Knieschützer, der fast ganz hinter dem anderen
 * Bein liegt und nur als Streifen von höchstens KNIE_SPLITTER px Breite
 * hervorschaute, entfällt im Bild: Ein solcher Stahlstreifen läse sich als
 * Stab (Auftrag 4, 1.4, Lesbarkeit; Festlegung G0c).
 */
export function zeichne(h: Haltung): Gerastert {
  const stil = h.getroffen === true ? STIL_GETROFFEN : STIL_RAMMBOCK;
  let p = pose(h);
  let bild = PUPPE_RAMMBOCK.rastern(p, stil);
  for (const knie of ['KnieH', 'KnieV']) {
    const ohne: Pose = { ...p, versteckt: [...(p.versteckt ?? []), knie] };
    const g = PUPPE_RAMMBOCK.rastern(ohne, stil);
    if (sichtbareStahlbreite(bild, g) <= KNIE_SPLITTER) {
      p = ohne;
      bild = g;
    }
  }
  return bild;
}

function bild(h: Haltung, dauer: number): Bild {
  const g = zeichne(h);
  return { leinwand: g.leinwand, ankerX: g.ankerX, ankerY: g.ankerY, dauer };
}

/** Ziel des Handgelenks in Figurkoordinaten (Schulterangaben aufgelöst). */
function armAbsolut(h: Haltung, seite: 'V' | 'H'): Arm {
  const a = seite === 'V' ? h.armV : h.armH;
  if (a.schulter !== true) return a;
  const sch = (PUPPE_RAMMBOCK.lagen(pose(h)).get(`Oberarm${seite}`) as { pos: Punkt }).pos;
  return { ziel: P(sch.x + a.ziel.x, sch.y + a.ziel.y), ...(a.hand !== undefined ? { hand: a.hand } : {}) };
}

/**
 * Zwischenbild zwischen zwei Schlüsselhaltungen (Auftrag 4, 2.4: höchstens
 * ein Zwischenbild): Eingaben gemischt, dann über die Gelenke gelöst, damit
 * stehende Füße am Boden bleiben (wie Vela, docs/grafik.md 7, G0-8).
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
    rumpf: m(a.rumpf, b.rumpf),
    kopf: m(a.kopf, b.kopf),
    armV: arm('V'),
    armH: arm('H'),
    beinV: bein(a.beinV, b.beinV),
    beinH: bein(a.beinH, b.beinH),
    versatz,
    ...(naeher.ebenen !== undefined ? { ebenen: naeher.ebenen } : {}),
    ...(naeher.getroffen !== undefined ? { getroffen: naeher.getroffen } : {}),
  };
}

// ---------------------------------------------------------------------------
// Stand: schwer und aufrecht, Beine breit, Fäuste bereit vor dem Bauch
// (Brust und offene Weste bleiben frei; die Kampfhaltung hebt die Fäuste)
// ---------------------------------------------------------------------------

export const STAND: Haltung = {
  huefte: P(-1, -29),
  rumpf: -7,
  kopf: 9,
  armV: { ziel: P(6, 15), hand: 75, schulter: true },
  armH: { ziel: P(8, 13), hand: 90, schulter: true },
  beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
};

// ---------------------------------------------------------------------------
// Kampfhaltung: deutliche Hocke vor dem Angriff (design-gegner-stages.md
// 1.2), zwei Bilder im Wechsel (Auftrag 4, 3: kampfhaltung 2, Schleife)
// ---------------------------------------------------------------------------

/** Richtwert der Dauer je Bild der Kampfhaltung (wie hocke_ankuendigung in fremd/rammbock/zuordnung.txt: 8/8). */
const KAMPFHALTUNG_DAUERN = [8, 8] as const;

export const HOCKE: Haltung = {
  huefte: P(0, -23),
  rumpf: -18,
  kopf: 16,
  armV: { ziel: P(21, -40), hand: 135 },
  armH: { ziel: P(22, -46), hand: 145 },
  beinV: { knoechel: P(13, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-14, -KNOECHEL), fuss: 0 },
};

function kampfhaltung(): Haltung[] {
  // Bild 1: Schultern und Fäuste 1 px höher, Hüfte 1 px höher (Atmen in der Hocke)
  const hoch: Haltung = {
    ...HOCKE,
    huefte: P(0, -24),
    rumpf: -16,
    kopf: 14,
    armV: { ziel: P(21, -42), hand: 133 },
    armH: { ziel: P(22, -48), hand: 143 },
  };
  return [HOCKE, hoch];
}

// ---------------------------------------------------------------------------
// Gehen: 8 Bilder zu 4 Frames (design-gegner-stages.md 9, Rammbock 8 × 4);
// der Standfuß rückt je Bild um 4 · 1,6 = 6,4 px zurück (Auftrag 4, 1.4;
// werte.ts RAMMBOCK_GEHEN_X). Auf ganze px gerundet über den Zyklus:
// round(n · 6,4) für n = 0 … 8 = 0, 6, 13, 19, 26, 32, 38, 45, 51, also
// Schritte 6, 7, 6, 7, 6, 6, 7, 6 und 51 px je Zyklus (51,2 exakt).
// ---------------------------------------------------------------------------

/** Bilder des Gehzyklus und Frames je Bild (design-gegner-stages.md 9). */
export const GEHEN_BILDER = 8;
export const GEHEN_DAUER = 4;
/** px je Bild: Frames je Bild · Gehgeschwindigkeit (werte.ts RAMMBOCK_GEHEN_X = 1,6 als Festkomma, 6,4000244 px). */
export const GEHEN_SCHRITT = (GEHEN_DAUER * RAMMBOCK_GEHEN_X) / EINS;
/** Rückversatz des Standfußes nach n Bildern ab Beginn des Zyklus, auf ganze px gerundet. */
export function gehVersatz(n: number): number {
  return Math.round(n * GEHEN_SCHRITT);
}
/** Bilder, die ein Fuß steht (halber Zyklus, an den Enden beide Füße am Boden). */
const STANDBILDER = GEHEN_BILDER / 2;
/** Fußhub in der Schwungphase und Neigung des Stiefels beim Aufsetzen und Abrollen (Festlegung G0c, wie Vela kleiner). */
const FUSS_HUB = 5;
const FERSE_AUF = 10;
const SPITZE_AB = -18;

/** Knöchel, wenn der Stiefel um winkel Grad um den Kontaktpunkt (Ferse oder Spitze) gedreht auf dem Boden steht. */
function knoechelUeber(kontakt: Punkt, kontaktLokal: Punkt, winkel: number): Punkt {
  const w = (winkel * Math.PI) / 180;
  // drehe() der Geometrie: (x, y) → (x cos + y sin, −x sin + y cos)
  const dx = kontaktLokal.x * Math.cos(w) + kontaktLokal.y * Math.sin(w);
  const dy = -kontaktLokal.x * Math.sin(w) + kontaktLokal.y * Math.cos(w);
  return P(kontakt.x - dx, kontakt.y - dy);
}

/**
 * Lage eines Fußes im Bild i des Gehzyklus. Der Fuß steht in den Bildern
 * start … start + 4 (Standphase k = 0 … 4): Ferse setzt bei k = 0 auf
 * (Spitze hoch), k = 1 bis 3 flach, bei k = 4 rollt er über die Spitze ab.
 * Sein Knöchel liegt in Bild start + k um gehVersatz(start + k) −
 * gehVersatz(start) hinter vorn (ganze px). Danach schwingt er in drei
 * Bildern nach vorn.
 */
function gehFuss(i: number, start: number, vorn: number): Bein {
  const k = (((i - start) % GEHEN_BILDER) + GEHEN_BILDER) % GEHEN_BILDER;
  const zurueck = (j: number): number => gehVersatz(start + j) - gehVersatz(start);
  if (k <= STANDBILDER) {
    const flach = P(vorn - zurueck(k), -KNOECHEL);
    if (k === 0) return { knoechel: knoechelUeber(P(flach.x + FERSE.x, 0), FERSE, FERSE_AUF), fuss: FERSE_AUF };
    if (k === STANDBILDER) return { knoechel: knoechelUeber(P(flach.x + SPITZE.x, 0), SPITZE, SPITZE_AB), fuss: SPITZE_AB };
    return { knoechel: flach, fuss: 0 };
  }
  // Schwungphase: von hinten nach vorn, angehoben
  const s = (k - STANDBILDER) / STANDBILDER;
  const hinten = vorn - zurueck(STANDBILDER);
  const x = hinten + (vorn - hinten) * s;
  const hub = Math.sin(Math.PI * s) * FUSS_HUB;
  return { knoechel: P(x, -KNOECHEL - hub), fuss: SPITZE_AB * (1 - s) + FERSE_AUF * s * 0.5 };
}

/** Hüfte beim Gehen (x), vorderste Lage der Knöchel je Bein (ganze px: die Sohlen rücken um ganze Pixel). */
const GEHEN_HUEFTE_X = 0;
const GEHEN_VORN_V = 15;
const GEHEN_VORN_H = 8;
/** Hüfte beim Gehen (wie im Stand) und Wippen je Bild: 1 px tiefer beim Aufsetzen (Bild 0, 4), 1 px höher beim Durchschwingen (Bild 2, 6); schwerer Gang (Festlegung G0c). */
const GEHEN_HUEFTE = -29;
const GEHEN_WIPPEN = [1, 0, -1, 0] as const;

/** Haltungen des Gehzyklus (8 Bilder). */
export function gehen(): Haltung[] {
  const aus: Haltung[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const beinV = gehFuss(i, 0, GEHEN_VORN_V);
    const beinH = gehFuss(i, STANDBILDER, GEHEN_VORN_H);
    const hx = GEHEN_HUEFTE_X;
    const reich = SCHENKEL + SCHIENBEIN - 1;
    const hoehe = (b: Bein, seite: number): number => {
      const dx = b.knoechel.x - (hx + seite);
      return b.knoechel.y - Math.sqrt(Math.max(0, reich * reich - dx * dx));
    };
    const hy = Math.max(hoehe(beinV, HUEFTE_SEITE), hoehe(beinH, -HUEFTE_SEITE), GEHEN_HUEFTE + (GEHEN_WIPPEN[i % GEHEN_WIPPEN.length] as number));
    const phase = (2 * Math.PI * i) / GEHEN_BILDER;
    // Arme gegen die Beine: der vordere Arm schwingt zurück, wenn das vordere Bein vorn aufsetzt (Bild 0)
    const schwung = Math.cos(phase);
    // naher Arm schwingt ±7 px und winkelt vorn an (Faust vor dem Bauch, nicht vor dem Schritt);
    // ferner Arm bleibt angewinkelt, damit seine Faust vor dem Bauch erscheint
    const armNah = (s: number): Arm => ({ ziel: P(1 + 7 * s, 19 - 6 * Math.max(0, s)), hand: 10 + 60 * Math.max(0, s) + 25 * Math.min(0, s), schulter: true });
    const armFern = (s: number): Arm => ({ ziel: P(4 + 4 * s, 16 - 3 * Math.max(0, s)), hand: 60 + 30 * s, schulter: true });
    aus.push({
      huefte: P(hx, hy),
      rumpf: -9 + 2 * Math.cos(phase * 2),
      kopf: 11,
      armV: armNah(-schwung),
      armH: armFern(schwung),
      beinV,
      beinH,
    });
  }
  return aus;
}

// ---------------------------------------------------------------------------
// Schlag (Code RA): Ausholen 2, aktiv 1, Rückzug 2 Bilder (Auftrag 4, 3).
// Bild zur Zeit A + d (d Frames seit Angriffsbeginn A) ist
// bildBeiUhr(dauern, d + 1); das Trefferbild steht über den aktiven Frames
// A + 9 bis A + 13 (werte.ts NAH_ANGRIFFE.RA), der Rückzug dauert 5 Frames.
// ---------------------------------------------------------------------------

const RA = NAH_ANGRIFFE.RA;
/** Ausholen (Startup 9 = 5 + 4), Trefferbild (aktiv 5), Rückzug (5 = 3 + 2); wie schlag_a in fremd/rammbock/zuordnung.txt. */
export const SCHLAG_DAUERN = [5, RA.startup - 5, RA.aktiv_bis - RA.aktiv_von + 1, 3, RA.rueckzug - 3] as const;

/** Index des Bildes, das bei Aktionsuhr uhr (1 = erstes Bild) gezeigt wird (wie figuren/vela.ts). */
export function bildBeiUhr(dauern: readonly number[], uhr: number): number {
  let summe = 0;
  for (let i = 0; i < dauern.length; i++) {
    summe += dauern[i] as number;
    if (uhr <= summe) return i;
  }
  return dauern.length - 1;
}

/** Bild zur Zeit A + d eines Angriffs (d = 0 im Frame A). */
export function bildBeiAbstand(dauern: readonly number[], d: number): number {
  return bildBeiUhr(dauern, d + 1);
}

/** Schlagarm im Trefferbild im Ellbogen und Handgelenk gestreckt (Zug wie bei Vela, docs/grafik.md 7, G0-6). */
const STRECKUNG_ARM_V = { UnterarmV: P(0, 1.5), HandV: P(0, 1) } as const;
/** Ferner Arm in Deckung: Faust vor dem Kinn (relativ zur Schulter). */
const DECKUNG_H: Arm = { ziel: P(9, -2), hand: 150, schulter: true };

function schlag(): Haltung[] {
  // wuchtige Gerade mit dem nahen Arm (der ganze Arm bleibt sichtbar): Faust weit zurück,
  // Gewicht nach hinten, dann aus der Hüfte nach vorn; der ferne Arm deckt das Kinn
  const ausholen1: Haltung = {
    ...HOCKE,
    huefte: P(-2, -25),
    rumpf: -10,
    kopf: 10,
    armV: { ziel: P(-4, 6), hand: -30, schulter: true },
    armH: DECKUNG_H,
  };
  const ausholen2: Haltung = {
    ...ausholen1,
    huefte: P(-4, -26),
    rumpf: 2,
    kopf: 0,
    armV: { ziel: P(-9, 2), hand: -70, schulter: true },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
  };
  const treffer: Haltung = {
    huefte: P(6, -27),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(44, -46), hand: 92 },
    armH: { ziel: P(6, 2), hand: 150, schulter: true },
    beinV: { knoechel: P(15, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    versatz: { OberarmV: P(3, 0), ...STRECKUNG_ARM_V },
  };
  const zurueck: Haltung = {
    ...HOCKE,
    huefte: P(2, -25),
    rumpf: -18,
    kopf: 16,
    armV: { ziel: P(24, -42), hand: 115 },
    versatz: { OberarmV: P(1, 0) },
  };
  return [ausholen1, ausholen2, treffer, zwischen(treffer, zurueck), zurueck];
}

// ---------------------------------------------------------------------------
// Getroffen: 3 Bilder ab h+1, h+10, h+22 (werte.ts REAKTION_ANIMATION;
// design-gegner-stages.md 9); Dauern 9 / 12 / 2 = 23 Frames
// (REAKTION_DAUER), wie getroffen in fremd/rammbock/zuordnung.txt
// ---------------------------------------------------------------------------

export const GETROFFEN_DAUERN = [
  (REAKTION_ANIMATION[1] as number) - (REAKTION_ANIMATION[0] as number),
  (REAKTION_ANIMATION[2] as number) - (REAKTION_ANIMATION[1] as number),
  REAKTION_DAUER + (REAKTION_ANIMATION[0] as number) - (REAKTION_ANIMATION[2] as number),
] as const;

function getroffen(): Haltung[] {
  // Kopf und Schultern fliegen zurück, die Arme schlagen auseinander (naher nach hinten, ferner nach vorn)
  const stoss: Haltung = {
    huefte: P(-2, -28),
    rumpf: 18,
    kopf: 16,
    armV: { ziel: P(-9, 15), hand: -40, schulter: true },
    armH: { ziel: P(15, 3), hand: 120, schulter: true },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    getroffen: true,
  };
  // gekrümmt, Kopf gesenkt, Fäuste tief
  const krumm: Haltung = {
    ...stoss,
    huefte: P(-2, -27),
    rumpf: -6,
    kopf: -6,
    armV: { ziel: P(6, 15), hand: 100, schulter: true },
    armH: { ziel: P(2, 15), hand: 110, schulter: true },
  };
  const fangen: Haltung = { ...zwischen(krumm, HOCKE), getroffen: false };
  return [stoss, krumm, fangen];
}

// ===========================================================================
// Animationen
// ===========================================================================

function animation(name: string, haltungen: readonly Haltung[], dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation {
  if (haltungen.length !== dauern.length) throw new Error(`Rammbock ${name}: ${haltungen.length} Haltungen, ${dauern.length} Dauern`);
  const bilder = haltungen.map((h, i) => bild(h, dauern[i] as number));
  return aktiv !== undefined ? { name, schleife, bilder, aktiv } : { name, schleife, bilder };
}

/** Index des Trefferbilds im Schlag: Bild zur Zeit A + aktiv_von. */
export function schlagTrefferBild(): number {
  return bildBeiAbstand(SCHLAG_DAUERN, RA.aktiv_von);
}

/** Alle Animationen des Rammbocks für den Vergleich an Haltepunkt 1 (Auftrag 4, 9.4). */
export function rammbockAnimationen(): Animation[] {
  return [
    animation('stand', [STAND], [0], true),
    animation('gehen', gehen(), new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true),
    animation('kampfhaltung', kampfhaltung(), KAMPFHALTUNG_DAUERN, true),
    animation('schlag', schlag(), SCHLAG_DAUERN, false, [schlagTrefferBild()]),
    animation('getroffen', getroffen(), GETROFFEN_DAUERN, false),
  ];
}
