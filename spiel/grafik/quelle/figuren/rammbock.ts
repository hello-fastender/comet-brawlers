// Rammbock, Schlepperfahrer, als Gliederpuppe (Auftrag 4, 2.4, 3 und 4;
// Phase 1 G0c, Phase 2 G2 nach E24). Aussehen nach Auftrag 4, 4: breit, kahl,
// kurzer Bart, olivgrüne Polsterweste über nacktem Oberkörper, braune Hose
// mit Knieschützern aus Stahl; gedrungen-kräftig, breite Schultern, große
// Hände, deutlich wuchtiger als Vela (figuren/vela.ts ist das Muster).
//
// E24 (docs/grafik.md 8): Arme etwas schlanker als in Phase 1 und mehr
// Dreiviertelansicht wie im Automatenspiel: Brust und Bauch halb zum
// Betrachter gedreht, die nahe Westenhälfte zeigt Flanke und Seite, die ferne
// nur ihre Vorderkante; die ferne Schulter liegt hinter Brust und Kopf.
// Getroffen, Umgeworfen, Liegen, Aufstehen, Spott und Sprungtritt nach den
// Grok-Blättern des Rammbocks (fremd/rammbock/, Blätter A, C, D, E):
// Haltung von Kopf, Rumpf und Gliedern nachgebaut, nicht abgepaust.
//
// Maße in Spielpixeln. Herkunft: Umriss 60 × 76 mit Schatten
// (src/darstellung/masse.ts, UMRISS_GEGNER.Rammbock), Körper im Stand
// höchstens 76 − SCHATTEN_HOEHE / 2 = 71 px hoch (docs/grafik.md 1.1 und
// 2.5); Proportionen nach Auftrag 4, 1.1. Zeiten aus src/kern/werte.ts über
// bolzer_gemeinsam.ts; Festlegungen in docs/grafik.md 4.2 und Abschnitt 7
// (G0c-…, G2-…).

import type { Animation, Bild } from '../blatt.ts';
import type { Form, Punkt } from '../geometrie.ts';
import type { Pixel } from '../leinwand.ts';
import { HAUT_MITTEL, HOSE_BRAUN, KONTUR, STAHL, WESTE_OLIV } from '../palette.ts';
import type { Gerastert, Gesicht, Lage, Pose, Stil, TeilDef, Toene } from '../puppe.ts';
import { Puppe } from '../puppe.ts';
import { AUFTRITT_HOCKE_RAMMBOCK, NAH_ANGRIFFE, RAMMBOCK_GEHEN_X, RAMMBOCK_SCHNELL_X } from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';
import type { Arm, Bein, Gehmass, Haltung } from './bolzer_gemeinsam.ts';
import {
  AUFSTEHEN_DAUERN,
  GETROFFEN_DAUERN,
  GEWORFEN_DAUERN,
  HALTUNG_DAUERN,
  KAMPFHALTUNG_DAUERN,
  P,
  SPOTT_DAUERN,
  SPRUNGTRITT_DAUERN,
  TOT_DAUERN,
  UMGEWORFEN_DAUERN,
  angriffDauern,
  animationAus,
  aufgeraeumt,
  aufstehenHockeDauern,
  bildAus,
  bildBeiAbstand,
  bildBeiUhr,
  gehFuss,
  gehHuefte,
  gehVersatz as gehVersatzMass,
  knoechelUeber,
  gesichtGedreht,
  mitDauern,
  pose as poseAus,
  trefferBild,
  zwischen as zwischenAus,
} from './bolzer_gemeinsam.ts';

export { GETROFFEN_DAUERN, bildBeiAbstand, bildBeiUhr };
export type { Haltung };

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
/** Radien der Arme an Schulter, Ellbogen und Handgelenk: E24 „etwas schlanker“, je 0,6 px unter Phase 1 (4,8 / 4,2 / 3,6). */
const OBERARM_R = [4.2, 3.6] as const;
const UNTERARM_R = [3.6, 3] as const;
/** Radien der Beine an Hüfte, Knie und Knöchel (weite Arbeitshose; Vela 5 / 4,2 / 3,4). */
const SCHENKEL_R = [6, 5.2] as const;
const SCHIENBEIN_R = [5.2, 4.4] as const;
/** Hüftgelenke links und rechts der Beckenmitte (Vela 2,5; breiter Stand). */
const HUEFTE_SEITE = 3.5;
/**
 * Schultergelenke im Rumpf (Höhe über der Taille, Vela 15). Dreiviertelansicht
 * (E24, G0c-1): die nahe Schulter links der Mitte über der Flanke, die ferne
 * rechts hinter Brust und Kopf; Abstand 11 px (Phase 1: 13, Vela 7), weil die
 * gedrehte Schulterlinie kürzer erscheint.
 */
const SCHULTER_V_X = -3;
const SCHULTER_H_X = 8;
const SCHULTER_HOEHE = 19;
/** Taille über dem Beckengelenk (Vela 2; 1 px mehr: langer, schwerer Rumpf, Körper im Stand 70 px hoch). */
const TAILLE = 3;

// ===========================================================================
// Teile
// ===========================================================================

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
 * 9,8 × 9,4 mit Knöcheln am Ende (große Hände, Auftrag 4, 1.1; Phase 1
 * 10,4 × 9,8, mit den schlankeren Armen nach E24 etwas kleiner; Velas
 * Handschuh 9,2 × 10).
 */
const FAUST = polygon([-3.8, -0.4], [3.8, -0.4], [4.9, 2.4], [4.9, 6.9], [3.6, 9], [-3.6, 9], [-4.9, 6.9], [-4.9, 2.4]);
/** Fingerfalten auf der Fingerseite der Faust (−x), zwei Linien zu 1 px. */
const FALTEN: Form[] = [4, 6.7].map((y) => polygon([-6, y - 0.5], [-1, y - 0.5], [-1, y + 0.5], [-6, y + 0.5]));
/** Offene Hand (Getroffen, Spott, Aufstützen): Handfläche mit Fingern, länger und flacher als die Faust, Daumen auf der Fingerseite. */
const HAND_OFFEN: Form[] = [
  polygon([-3.4, -0.4], [3.4, -0.4], [4.2, 3.6], [3.6, 10], [1.2, 11.2], [-1.6, 10.8], [-3.8, 7.6], [-4.2, 3]),
  kapsel(-3.6, 2.4, -6.2, 5.6, 1.4),
];
/** Zeigende Hand (Spott): Faust mit gestrecktem Finger in der Mitte. */
const HAND_ZEIGEN: Form[] = [FAUST, kapsel(-1.2, 8, -1.2, 13.4, 1.3)];

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
      varianten: { offen: HAND_OFFEN, zeigen: HAND_ZEIGEN },
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
      varianten: { offen: [], zeigen: FALTEN },
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
 * Rumpf im Rahmen der Taille (y nach oben negativ), Dreiviertelansicht (E24):
 * Rücken und Flanke links (gerader), Brust und Bauch rechts vorgewölbt
 * (Bauch bis 11,8 vor der Mitte), Taille ±9,5; Nacken 22,6 über der Taille,
 * nach vorn verschoben.
 */
const RUMPF = polygon(
  [-9.4, 4],
  [9.4, 4],
  [11, -1],
  [11.8, -6],
  [11.2, -10.6],
  [11.8, -14.6],
  [10.2, -19.2],
  [5.4, -22.4],
  [-3, -22.6],
  [-9.4, -21],
  [-11.8, -17],
  [-11.4, -9],
  [-10.2, -3],
);

/**
 * Polsterweste im Rahmen der Taille, offen getragen, Dreiviertelansicht
 * (E24, nach dem Grok-Konzeptbild fremd/rammbock/rammbock_0_konzept.png): die
 * nahe Hälfte deckt Rücken, Flanke und die nahe Brustseite bis 1 px rechts der
 * Mitte (1 px über den Rumpf hinaus), die ferne zeigt nur ihre Vorderkante als
 * Streifen jenseits des Bauchs; Brust und Bauch dazwischen bleiben frei
 * (nackter Oberkörper, Auftrag 4, 4). Kragenpolster im Nacken.
 */
const WESTE_NAH = polygon([-10.4, 3.6], [1.4, 3.6], [0.8, -6], [0.6, -14], [1.2, -21.4], [-3, -23], [-8.4, -22.6], [-11.6, -20.8], [-13.2, -16.6], [-12.8, -9], [-11.6, -3]);
const WESTE_FERN = polygon([8.4, 3.6], [10.6, 3.6], [12.2, -1.6], [12.8, -6.4], [12.4, -10.6], [12.8, -15], [11.2, -19.6], [8.8, -21.2], [9, -14], [8.6, -6]);
const KRAGEN = kapsel(-7, -22.2, 3.6, -22.8, 2.4, 2);
/** Steppnähte der Polsterung: drei waagrechte Linien (1 px, nur auf der Weste). */
const NAEHTE: Form[] = [-4.5, -10.5, -16.5].map((y) => polygon([-16, y - 0.5], [16, y - 0.5], [16, y + 0.5], [-16, y + 0.5]));
/** Brustlinie unter dem nahen Brustmuskel, ferner Brustmuskel nur angeschnitten, Nabel (1 px im Hautschatten, nur auf dem Rumpf). */
const BRUSTLINIE: Form[] = [
  polygon([1.6, -11.8], [5.4, -10.6], [6.2, -11.6], [9.4, -12.4], [9.4, -11.4], [6.4, -10.6], [5.6, -9.4], [1.6, -10.8]),
  polygon([5.4, -3.6], [6.4, -3.6], [6.4, -1.6], [5.4, -1.6]),
];
/** Gürtel über dem Hosenbund (Rahmen des Beckens) und Schnalle aus Stahl vorn rechts der Mitte (Dreiviertelansicht). */
const GUERTEL = polygon([-9.6, -4.4], [10, -4.4], [10.2, -1.6], [-9.8, -1.6]);
const SCHNALLE = polygon([3.8, -4.8], [6.8, -4.8], [6.8, -1.2], [3.8, -1.2]);
/** Schulterpolster der Weste über dem nahen Oberarm (Rahmen des Rumpfs, um die nahe Schulter). */
const POLSTER = polygon([-8.6, -22.4], [-3, -23.8], [1.4, -22.2], [2, -18.6], [-1.8, -17.4], [-7.6, -18.4]);
/** Ohr im Rahmen des Kopfs (hinter der Kiefermitte, auf Augenhöhe). */
const OHR = ellipse(-1.4, -7.6, 1.6, 2.4);

const TEILE: TeilDef[] = [
  { name: 'Becken', eltern: null, gelenk: P(0, 0), formen: [kapsel(-4, 0, 4, 0, 5.4)], material: 'HOSE', gruppe: 'rumpf', ebene: EBENE.becken },
  { name: 'Guertel', eltern: 'Becken', gelenk: P(0, 0), formen: [GUERTEL], material: 'GUERTEL', gruppe: 'guertel', ebene: EBENE.rumpf + 2 },
  { name: 'Schnalle', eltern: 'Becken', gelenk: P(0, 0), formen: [SCHNALLE], material: 'STAHL', gruppe: 'guertel', ebene: EBENE.rumpf + 3, glanz: true, kissen: 1 },
  { name: 'Rumpf', eltern: 'Becken', gelenk: P(0, -TAILLE), formen: [RUMPF], material: 'HAUT', gruppe: 'rumpf', ebene: EBENE.rumpf, kissen: 3 },
  { name: 'Brust', eltern: 'Rumpf', gelenk: P(0, 0), formen: BRUSTLINIE, material: 'FALTE', gruppe: 'rumpf', ebene: EBENE.rumpf + 1, flach: true, auf: 'Rumpf' },
  { name: 'Weste', eltern: 'Rumpf', gelenk: P(0, 0), formen: [WESTE_NAH, WESTE_FERN, KRAGEN], material: 'WESTE', gruppe: 'weste', ebene: EBENE.weste, kissen: 3 },
  { name: 'Naht', eltern: 'Weste', gelenk: P(0, 0), formen: NAEHTE, material: 'NAHT', gruppe: 'weste', ebene: EBENE.naht, flach: true, auf: 'Weste' },
  {
    name: 'Kopf',
    eltern: 'Rumpf',
    gelenk: P(3, -22),
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
 * Innenkontur (docs/grafik.md 1.2, Farbbudget; G0c-2).
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

/** Ursprung der Gesichtsmasken im Rahmen des Kopfs (über dem Auge, vor der Kopfmitte). */
const GESICHT_URSPRUNG = P(3, -11);
/**
 * Gesichtsmasken (Blick rechts, höchstens 8 × 8, Auftrag 4, 6): normal Braue im
 * Hautdunkel über dem Auge 2 × 2 in KONTUR; getroffen Auge zugekniffen, Braue
 * hochgezogen; zu (liegend, umgeworfen) Auge geschlossen als Strich; wut
 * (Spott, Angriff) Braue schräg zur Nase gezogen.
 */
const MASKEN: Readonly<Record<string, readonly string[]>> = {
  normal: ['bbbb', '.kk.', '.kk.'],
  getroffen: ['.bbb', '....', 'kkk.'],
  zu: ['....', 'bbb.', '.kk.'],
  wut: ['b...', '.bbb', '.kk.'],
};
const GESICHT_FARBEN = { k: KONTUR, b: H[0] as Pixel };

const GLANZ = new Set<Pixel>([S[4] as Pixel]);

export const STIL_RAMMBOCK: Stil = {
  zuteilung: ZUTEILUNG,
  kontur: KONTUR,
  glanz: GLANZ,
  gesicht: { teil: 'Kopf', ursprung: GESICHT_URSPRUNG, zeilen: MASKEN.normal as readonly string[], farben: GESICHT_FARBEN },
};
/** Glanzfarben für die Prüfung der Streupixel (bauen.ts). */
export const GLANZ_RAMMBOCK: ReadonlySet<Pixel> = GLANZ;

// ===========================================================================
// Haltung → Bild
// ===========================================================================

/** Rechnet eine Haltung in eine Pose um (Beine und Arme über zwei Gelenke). */
export function pose(h: Haltung): Pose {
  return poseAus(PUPPE_RAMMBOCK, h);
}

/** Zwischenbild zweier Schlüsselhaltungen (höchstens ein Zwischenbild, G0-8). */
export function zwischen(a: Haltung, b: Haltung, t: number = 0.5): Haltung {
  return zwischenAus(PUPPE_RAMMBOCK, a, b, t);
}

/** Stil einer Haltung: Gesichtsmaske nach h.gesicht, gedreht mit dem Kopf (Vierteldrehungen, G2-2). */
function stilFuer(h: Haltung, p: Pose): Stil {
  const maske = MASKEN[h.gesicht ?? 'normal'] ?? MASKEN.normal;
  const kopf = (PUPPE_RAMMBOCK.lagen(p).get('Kopf') as Lage).winkel;
  const g: Gesicht = { teil: 'Kopf', ursprung: GESICHT_URSPRUNG, zeilen: maske as readonly string[], farben: GESICHT_FARBEN };
  return { ...STIL_RAMMBOCK, gesicht: gesichtGedreht(g, kopf) };
}

/**
 * Größte Breite in px, bis zu der ein sichtbarer Rest eines Knieschützers als
 * Splitter gilt und im Bild entfällt: gut die Hälfte der 7 px breiten Platte
 * (Festlegung G0c-4).
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
 * Stab (Auftrag 4, 1.4, Lesbarkeit; Festlegung G0c-4).
 */
export function zeichne(h: Haltung): Gerastert {
  let p = pose(h);
  const stil = stilFuer(h, p);
  let bild = PUPPE_RAMMBOCK.rastern(p, stil);
  for (const knie of ['KnieH', 'KnieV']) {
    if ((p.versteckt ?? []).includes(knie)) continue;
    const ohne: Pose = { ...p, versteckt: [...(p.versteckt ?? []), knie] };
    const g = PUPPE_RAMMBOCK.rastern(ohne, stil);
    if (sichtbareStahlbreite(bild, g) <= KNIE_SPLITTER) {
      p = ohne;
      bild = g;
    }
  }
  return aufgeraeumt(bild, GLANZ);
}

/** Bein, dessen Stiefel um winkel Grad (negativ: Ferse hoch) auf der Spitze bei x steht (Spitze auf dem Boden). */
function aufSpitze(x: number, winkel: number): Bein {
  return { knoechel: knoechelUeber(P(x, 0), SPITZE, winkel), fuss: winkel };
}

/** Haltung um ganze px verschoben (Hüfte, Knöchel, absolute Armziele). */
function verschoben(h: Haltung, dx: number, dy: number): Haltung {
  const arm = (a: Arm): Arm => (a.schulter === true ? a : { ...a, ziel: P(a.ziel.x + dx, a.ziel.y + dy) });
  const bein = (b: Bein): Bein => ({ ...b, knoechel: P(b.knoechel.x + dx, b.knoechel.y + dy) });
  return { ...h, huefte: P(h.huefte.x + dx, h.huefte.y + dy), armV: arm(h.armV), armH: arm(h.armH), beinV: bein(h.beinV), beinH: bein(h.beinH) };
}

/**
 * Haltung ohne Bodenkontakt der Füße (Flug, Liegen, kopfüber) so in ganzen px
 * senkrecht verschoben, dass ihr unterstes Pixel (Außenkontur) auf der
 * Ankerzeile liegt: Am Boden liegt sie auf, in der Luft hebt die Darstellung
 * das Bild um die Höhe h der Logik an (zeichnen.ts bildY; Festlegung G2-3).
 */
function amBoden(h: Haltung): Haltung {
  const g = zeichne(h);
  const r = g.leinwand.begrenzung();
  if (r === null) return h;
  const unten = r.y + r.h - 1 - g.ankerY;
  return unten === 0 ? h : verschoben(h, 0, -unten);
}

function bild(h: Haltung, dauer: number): Bild {
  return bildAus(zeichne(h), dauer);
}

function animation(name: string, haltungen: readonly Haltung[], dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation {
  if (haltungen.length !== dauern.length) throw new Error(`Rammbock ${name}: ${haltungen.length} Haltungen, ${dauern.length} Dauern`);
  return animationAus(
    name,
    haltungen.map((h, i) => bild(h, dauern[i] as number)),
    schleife,
    aktiv,
  );
}

// ===========================================================================
// Stand, Haltung, Kampfhaltung, Hocke
// ===========================================================================

/** Stand: schwer und aufrecht, Beine breit, Fäuste bereit vor dem Bauch (Rückfall der Darstellung, Prüfbild, G0b-8). */
export const STAND: Haltung = {
  huefte: P(-1, -29),
  rumpf: -7,
  kopf: 9,
  armV: { ziel: P(6, 15), hand: 75, schulter: true },
  armH: { ziel: P(7, 13), hand: 90, schulter: true },
  beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
};

/** Haltung (3 Bilder, Schleife): Atmen im Stand, Brust hebt und senkt sich um 1 px, Füße fest. */
function haltung(): Haltung[] {
  const ein: Haltung = { ...STAND, rumpf: -5, kopf: 8, armV: { ziel: P(6, 14), hand: 78, schulter: true }, armH: { ziel: P(7, 12), hand: 93, schulter: true } };
  const aus: Haltung = { ...STAND, huefte: P(-1, -28.6), rumpf: -9, kopf: 10, armV: { ziel: P(6, 15.5), hand: 72, schulter: true } };
  return [STAND, ein, aus];
}

/** Kampfhaltung (2 Bilder, Schleife): Boxerstellung nach Grok A4 und C1, naher Arm deckt das Kinn, ferne Faust vorn; Bild 1 wippt 1 px tiefer. */
export const KAMPF: Haltung = {
  huefte: P(0, -27),
  rumpf: -14,
  kopf: 13,
  armV: { ziel: P(9, 3), hand: 150, schulter: true },
  armH: { ziel: P(12, 0), hand: 160, schulter: true },
  beinV: { knoechel: P(13, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
};

function kampfhaltung(): Haltung[] {
  return [KAMPF, { ...KAMPF, huefte: P(0, -26), rumpf: -15, kopf: 14 }];
}

/**
 * Hocke vor jedem Angriff (design-gegner-stages.md 1.2: „deutliche Hocke“;
 * Grok C15, C16): Bild 0 halb gesenkt, Bild 1 tiefe Hocke mit vorgebeugtem
 * Rumpf und Fäusten vor Brust und Kinn (wie die Hocke aus Phase 1, tiefer).
 */
export const HOCKE: Haltung = {
  huefte: P(0, -22),
  rumpf: -22,
  kopf: 20,
  armV: { ziel: P(21, -38), hand: 135 },
  armH: { ziel: P(23, -43), hand: 145 },
  beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-15, -KNOECHEL), fuss: 0 },
};

function hockeAnkuendigung(): Haltung[] {
  return [zwischen(KAMPF, HOCKE), HOCKE];
}
/** Dauern der Hocke: 4 Frames senken, dann die tiefe Hocke (Richtwert 21 aus design-gegner-stages.md 9, A6; Festlegung G2-7). */
export const HOCKE_DAUERN: readonly number[] = [4, 21];

// ===========================================================================
// Gehen: 8 Bilder zu 4 Frames (design-gegner-stages.md 9, Rammbock 8 × 4);
// der Standfuß rückt je Bild um 4 · 1,6 = 6,4 px zurück (Auftrag 4, 1.4;
// werte.ts RAMMBOCK_GEHEN_X), auf ganze px gerundet 6/7/6/7/6/6/7/6 (G0c-3).
// ===========================================================================

export const GEHEN_BILDER = 8;
export const GEHEN_DAUER = 4;
/** px je Bild: Frames je Bild · Gehgeschwindigkeit (werte.ts RAMMBOCK_GEHEN_X = 1,6 als Festkomma, 6,4000244 px). */
export const GEHEN_SCHRITT = (GEHEN_DAUER * RAMMBOCK_GEHEN_X) / EINS;
/** Schnelle Gehstufe (2,0 px/Frame, werte.ts RAMMBOCK_SCHNELL_X): dieselben Bilder, Richtwert 4 · 1,6 / 2,0 ≈ 3 Frames je Bild (G2-8). */
export const GEHEN_SCHNELL_DAUER = Math.round((GEHEN_DAUER * RAMMBOCK_GEHEN_X) / RAMMBOCK_SCHNELL_X);

const GEHMASS: Gehmass = {
  bilder: GEHEN_BILDER,
  schritt: GEHEN_SCHRITT,
  knoechel: KNOECHEL,
  ferse: FERSE,
  spitze: SPITZE,
  // Fußhub und Neigung beim Aufsetzen und Abrollen (Festlegung G0c, wie Vela kleiner)
  hub: 5,
  ferseAuf: 10,
  spitzeAb: -18,
};

/** Rückversatz des Standfußes nach n Bildern ab Beginn des Zyklus, auf ganze px gerundet. */
export function gehVersatz(n: number): number {
  return gehVersatzMass(GEHMASS, n);
}

/** Vorderste Lage der Knöchel je Bein (ganze px), Hüfte wie im Stand mit Wippen 1 px (tief beim Aufsetzen, Bild 0 und 4). */
const GEHEN_VORN_V = 15;
const GEHEN_VORN_H = 8;
const GEHEN_HUEFTE = -29;
const GEHEN_WIPPEN = [1, 0, -1, 0] as const;

/** Haltungen des Gehzyklus (8 Bilder). */
export function gehen(): Haltung[] {
  const aus: Haltung[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const beinV = gehFuss(GEHMASS, i, 0, GEHEN_VORN_V);
    const beinH = gehFuss(GEHMASS, i, GEHEN_BILDER / 2, GEHEN_VORN_H);
    const hy = gehHuefte(0, HUEFTE_SEITE, beinV, beinH, SCHENKEL + SCHIENBEIN - 1, GEHEN_HUEFTE + (GEHEN_WIPPEN[i % GEHEN_WIPPEN.length] as number));
    const phase = (2 * Math.PI * i) / GEHEN_BILDER;
    // Arme gegen die Beine: der nahe Arm schwingt zurück, wenn das nahe Bein vorn aufsetzt (Bild 0);
    // naher Arm ±7 px, winkelt vorn an; ferner Arm angewinkelt, Faust vor dem Bauch
    const schwung = Math.cos(phase);
    const armNah = (s: number): Arm => ({ ziel: P(1 + 7 * s, 19 - 6 * Math.max(0, s)), hand: 10 + 60 * Math.max(0, s) + 25 * Math.min(0, s), schulter: true });
    const armFern = (s: number): Arm => ({ ziel: P(4 + 4 * s, 16 - 3 * Math.max(0, s)), hand: 60 + 30 * s, schulter: true });
    aus.push({
      huefte: P(0, hy),
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

// ===========================================================================
// Angriffe (werte.ts NAH_ANGRIFFE; spezifikation-welt.md 5.5): RA, RB, RU je
// Ausholen 2, aktiv 1, Rückzug 2 Bilder (Auftrag 4, 3); RS Sprungtritt.
// Bild zur Zeit A + d ist bildBeiUhr(dauern, d + 1).
// ===========================================================================

/** Dauern von RA (Startup 9 = 5 + 4, aktiv 5, Rückzug 5 = 3 + 2); wie schlag_a in fremd/rammbock/zuordnung.txt. */
export const SCHLAG_DAUERN = angriffDauern('RA');

/** Schlagarm im Trefferbild im Ellbogen und Handgelenk gestreckt (Zug wie bei Vela, docs/grafik.md 7, G0-6). */
const STRECKUNG_ARM_V = { UnterarmV: P(0, 1.5), HandV: P(0, 1) } as const;
const STRECKUNG_ARM_H = { UnterarmH: P(0, 1.5), HandH: P(0, 1) } as const;
/** Ferner Arm in Deckung: Faust vor dem Kinn (relativ zur Schulter). */
const DECKUNG_H: Arm = { ziel: P(9, -2), hand: 150, schulter: true };

/** RA: wuchtige Gerade mit dem nahen Arm aus der Hüfte (Grok C1 bis C5); Rückzug in die Kampfhaltung. */
function schlagA(): Haltung[] {
  const ausholen1: Haltung = { ...KAMPF, huefte: P(-2, -26), rumpf: -10, kopf: 10, armV: { ziel: P(-4, 6), hand: -30, schulter: true }, armH: DECKUNG_H };
  const ausholen2: Haltung = {
    ...ausholen1,
    huefte: P(-4, -26),
    rumpf: 2,
    kopf: 0,
    armV: { ziel: P(-9, 2), hand: -70, schulter: true },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    gesicht: 'wut',
  };
  const treffer: Haltung = {
    huefte: P(6, -27),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(43, -46), hand: 92 },
    armH: { ziel: P(6, 2), hand: 150, schulter: true },
    beinV: { knoechel: P(15, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    versatz: { OberarmV: P(2, 0), ...STRECKUNG_ARM_V },
    gesicht: 'wut',
  };
  const zurueck: Haltung = { ...KAMPF, huefte: P(2, -26), rumpf: -16, armV: { ziel: P(24, -42), hand: 115 }, versatz: { OberarmV: P(1, 0) } };
  return [ausholen1, ausholen2, treffer, zwischen(treffer, zurueck), zurueck];
}

/** RB: Schwinger von oben mit dem nahen Arm (Grok A5, A6): Faust weit hinter den Kopf, Gewicht zurück, dann schräg nach vorn unten. */
function schlagB(): Haltung[] {
  const ausholen1: Haltung = { ...KAMPF, huefte: P(-2, -27), rumpf: -6, kopf: 6, armV: { ziel: P(-7, -10), hand: 200, schulter: true }, armH: DECKUNG_H };
  const ausholen2: Haltung = {
    ...ausholen1,
    huefte: P(-4, -27),
    rumpf: 6,
    kopf: -2,
    armV: { ziel: P(-9, -14), hand: 225, schulter: true },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    gesicht: 'wut',
  };
  const treffer: Haltung = {
    huefte: P(5, -26),
    rumpf: -30,
    kopf: 26,
    armV: { ziel: P(40, -50), hand: 112 },
    armH: { ziel: P(4, 6), hand: 140, schulter: true },
    beinV: { knoechel: P(17, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    versatz: { OberarmV: P(1.5, 0), ...STRECKUNG_ARM_V },
    gesicht: 'wut',
  };
  const durch: Haltung = { ...treffer, huefte: P(6, -25), rumpf: -34, kopf: 28, armV: { ziel: P(30, -26), hand: 50 }, versatz: { OberarmV: P(2, 0) } };
  return [ausholen1, ausholen2, treffer, durch, zwischen(durch, KAMPF)];
}

/** RU: Hammerschlag mit beiden Fäusten von oben (Grok C6 bis C10): Faust hoch, beide Fäuste über dem Kopf, nach vorn unten, gebückt, zurück. */
function umwerfschlag(): Haltung[] {
  const ausholen1: Haltung = { ...KAMPF, huefte: P(-1, -28), rumpf: -4, kopf: 6, armV: { ziel: P(3, -21), hand: 175, schulter: true }, armH: DECKUNG_H };
  const ausholen2: Haltung = {
    ...ausholen1,
    huefte: P(-3, -28),
    rumpf: 6,
    kopf: 0,
    armV: { ziel: P(-1, -77), hand: 185 },
    armH: { ziel: P(2, -78), hand: 185 },
    ebenen: { OberarmH: 49, UnterarmH: 49, HandH: 49.5, FaltenH: 49.6 },
    gesicht: 'wut',
  };
  const treffer: Haltung = {
    huefte: P(5, -24),
    rumpf: -44,
    kopf: 36,
    armV: { ziel: P(35, -33), hand: 65 },
    armH: { ziel: P(37, -35), hand: 70 },
    beinV: { knoechel: P(16, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
    versatz: { ...STRECKUNG_ARM_V, ...STRECKUNG_ARM_H },
    gesicht: 'wut',
  };
  const gebueckt: Haltung = { ...treffer, huefte: P(3, -23), rumpf: -32, kopf: 26, armV: { ziel: P(25, -22), hand: 40 }, armH: { ziel: P(27, -24), hand: 45 }, versatz: {} };
  return [ausholen1, ausholen2, treffer, gebueckt, zwischen(gebueckt, KAMPF)];
}

/**
 * RS Sprungtritt (Grok A7, C12, C13; Welt 5.5): Absprung gestreckt mit
 * zurückgeschwungenen Armen, Flug mit hochgerissenem nahem Knie (Trefferbild,
 * A+9 bis A+45), Landung in der Hocke, Aufrichten. Flugbilder liegen mit dem
 * untersten Pixel auf der Ankerzeile (die Darstellung hebt um h an, G2-3).
 */
function sprungtritt(): Haltung[] {
  const absprung: Haltung = amBoden({
    huefte: P(1, -33),
    rumpf: -10,
    kopf: 8,
    armV: { ziel: P(-15, -36), hand: -60 },
    armH: { ziel: P(-9, -38), hand: -45 },
    beinV: { knoechel: P(6, -9), fuss: -40 },
    beinH: { knoechel: P(-8, -8), fuss: -45 },
    gesicht: 'wut',
  });
  const knie: Haltung = amBoden({
    huefte: P(0, -26),
    rumpf: -4,
    kopf: 6,
    armV: { ziel: P(-11, 12), hand: -40, schulter: true },
    armH: { ziel: P(22, -48), hand: 120 },
    beinV: { knoechel: P(17, -15), fuss: 20 },
    beinH: { knoechel: P(-15, -6), fuss: -55 },
    ebenen: { OberschenkelV: 49, UnterschenkelV: 49, KnieV: 49.5, StiefelV: 49.2 },
    gesicht: 'wut',
  });
  const landung: Haltung = {
    huefte: P(2, -20),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(14, -28), hand: 130 },
    armH: { ziel: P(16, -31), hand: 140 },
    beinV: { knoechel: P(13, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
  };
  return [absprung, knie, landung, zwischen(landung, KAMPF)];
}

// ===========================================================================
// Reaktionen nach den Grok-Blättern (E24; fremd/rammbock/rammbock_d_reaktionen.png,
// rammbock_e_griff.png). Zeiten: bolzer_gemeinsam.ts (Kampf 5.7, 7, 8.4).
// ===========================================================================

/**
 * Getroffen (Grok D2, D3, D1): Kopf in den Nacken, Oberkörper weit zurück,
 * Knie nach vorn eingeknickt, offene Hände nach vorn oben gerissen; dann etwas
 * weniger; dann aufgerichtet mit den Händen vor dem Körper.
 */
function getroffen(): Haltung[] {
  const stoss: Haltung = {
    huefte: P(-4, -28),
    rumpf: 20,
    kopf: 32,
    armV: { ziel: P(14, -15), hand: 160, schulter: true },
    armH: { ziel: P(15, -17), hand: 170, schulter: true },
    beinV: { knoechel: P(8, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-10, -KNOECHEL), fuss: 0 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  };
  const nach: Haltung = { ...stoss, huefte: P(-3, -28.5), rumpf: 15, kopf: 24, armV: { ziel: P(16, -10), hand: 145, schulter: true }, armH: { ziel: P(17, -12), hand: 150, schulter: true } };
  const fangen: Haltung = {
    ...STAND,
    huefte: P(-2, -29),
    rumpf: 5,
    kopf: 4,
    armV: { ziel: P(10, 9), hand: 125, schulter: true },
    armH: { ziel: P(12, 7), hand: 125, schulter: true },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
  };
  return [stoss, nach, fangen];
}

/**
 * Umgeworfen (Grok D4 bis D8): Stillstand weit zurückgebogen auf den Zehen,
 * Steigen schräg rücklings mit den Beinen vorn, Fallen waagrecht, Aufprall mit
 * hochfederndem Oberkörper und zurückgeworfenem Arm, flach auf dem Rücken.
 */
function umgeworfen(): Haltung[] {
  const zurueck: Haltung = amBoden({
    huefte: P(-4, -30),
    rumpf: 30,
    kopf: 34,
    armV: { ziel: P(10, -19), hand: 170, schulter: true },
    armH: { ziel: P(12, -20), hand: 178, schulter: true },
    beinV: { knoechel: P(6, -9), fuss: -28 },
    beinH: { knoechel: P(-5, -8), fuss: -32 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  });
  const steigen: Haltung = amBoden({
    huefte: P(0, -16),
    becken: 62,
    rumpf: 6,
    kopf: 12,
    armV: { ziel: P(3, -20), hand: 175, schulter: true },
    armH: { ziel: P(8, -18), hand: 165, schulter: true },
    beinV: { knoechel: P(23, -32), fuss: 85 },
    beinH: { knoechel: P(23, -21), fuss: 75 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  });
  const fallen: Haltung = amBoden({
    huefte: P(2, -14),
    becken: 96,
    rumpf: 0,
    kopf: 14,
    armV: { ziel: P(-1, 11), hand: 10, schulter: true },
    armH: { ziel: P(9, -7), hand: 150, schulter: true },
    beinV: { knoechel: P(28, -20), fuss: 95 },
    beinH: { knoechel: P(27, -13), fuss: 85 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  });
  const aufprall: Haltung = amBoden({
    huefte: P(4, -8),
    becken: 84,
    rumpf: -24,
    kopf: 22,
    armV: { ziel: P(-11, -6), hand: 210, schulter: true },
    armH: { ziel: P(7, 7), hand: 60, schulter: true },
    beinV: { knoechel: P(26, -9), fuss: 30 },
    beinH: { knoechel: P(29, -7), fuss: 40 },
    formen: { HandV: 'offen', FaltenV: 'offen' },
    gesicht: 'zu',
  });
  return [zurueck, steigen, fallen, aufprall, LIEGEN];
}

/** Liegen (Grok D8, D9): flach auf dem Rücken, Kopf hinten, Beine gestreckt, Arme am Körper, Augen zu. */
export const LIEGEN: Haltung = amBoden({
  huefte: P(6, -6),
  becken: 92,
  rumpf: 0,
  kopf: 2,
  armV: { ziel: P(11, 3), hand: 95, schulter: true },
  armH: { ziel: P(10, 0), hand: 95, schulter: true },
  beinV: { knoechel: P(33, -6), fuss: 88 },
  beinH: { knoechel: P(31, -5), fuss: 86 },
  formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
  gesicht: 'zu',
});

/**
 * Aufstehen (Grok D10 bis D14, 18 Frames in 6 Bildern): aufgesetzt mit Händen
 * hinten und angezogenen Knien; tief vorgebeugt mit der Hand am Boden; Hocke
 * mit Hand am Boden und Faust an der Brust; Hocke mit beiden Fäusten;
 * halb aufgerichtet; Stand.
 */
function aufstehen(): Haltung[] {
  const sitzen: Haltung = amBoden({
    huefte: P(-3, -8),
    rumpf: 22,
    kopf: -14,
    armV: { ziel: P(-17, -6), hand: 20 },
    armH: { ziel: P(-12, -6), hand: 20 },
    beinV: { knoechel: P(16, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(13, -KNOECHEL), fuss: 0 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
  });
  const vorgebeugt: Haltung = {
    huefte: P(-3, -19.5),
    rumpf: -48,
    kopf: 38,
    armV: { ziel: P(17, -12), hand: 5 },
    armH: { ziel: P(5, 11), hand: 60, schulter: true },
    beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
    beinH: aufSpitze(-3, -20),
    formen: { HandV: 'offen', FaltenV: 'offen' },
  };
  const hand: Haltung = {
    ...vorgebeugt,
    huefte: P(-2, -20),
    rumpf: -36,
    kopf: 30,
    armV: { ziel: P(19, -12), hand: 5 },
    armH: { ziel: P(9, 2), hand: 150, schulter: true },
    beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
  };
  const faeuste: Haltung = {
    huefte: P(-1, -22),
    rumpf: -22,
    kopf: 18,
    armV: { ziel: P(12, -1), hand: 150, schulter: true },
    armH: { ziel: P(14, -3), hand: 155, schulter: true },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
  };
  return [sitzen, vorgebeugt, hand, faeuste, zwischen(faeuste, STAND), STAND];
}

/**
 * Spott (Grok D15 bis D20, 42 Frames): Stand; herbeiwinken mit der nahen
 * Hand; mit beiden Armen auf die Figur zeigen; Hocke und Fäuste ballen
 * (Knurren); noch einmal winken; noch einmal zeigen.
 */
function spott(): Haltung[] {
  const winkenNah: Haltung = {
    ...STAND,
    rumpf: -3,
    kopf: 6,
    armV: { ziel: P(20, 0), hand: 150, schulter: true },
    armH: { ziel: P(5, 13), hand: 80, schulter: true },
    formen: { HandV: 'offen', FaltenV: 'offen' },
    gesicht: 'wut',
  };
  const zeigen: Haltung = {
    ...STAND,
    rumpf: -9,
    kopf: 10,
    armV: { ziel: P(27, -46), hand: 98 },
    armH: { ziel: P(29, -49), hand: 102 },
    formen: { HandV: 'zeigen', HandH: 'offen', FaltenH: 'offen' },
    versatz: { ...STRECKUNG_ARM_V },
    gesicht: 'wut',
  };
  const knurren: Haltung = {
    ...KAMPF,
    huefte: P(0, -25),
    rumpf: -18,
    kopf: 16,
    armV: { ziel: P(9, 4), hand: 145, schulter: true },
    armH: { ziel: P(16, 5), hand: 115, schulter: true },
    gesicht: 'wut',
  };
  const winken2: Haltung = { ...winkenNah, armV: { ziel: P(19, -4), hand: 175, schulter: true } };
  const zeigen2: Haltung = { ...zeigen, rumpf: -11, armV: { ziel: P(28, -44), hand: 95 } };
  return [STAND, winkenNah, zeigen, knurren, winken2, zeigen2];
}

/**
 * Wiegen (design-gegner-stages.md 9, G Stage 9, 42 Frames wie der Spott):
 * Oberkörper wiegt herausfordernd vor und zurück, die Fäuste pendeln vor dem
 * Bauch, die Füße bleiben stehen; endet im Stand, daher als Schleife beim
 * Abwarten an der Warteposition (Festlegung G2-9).
 */
function wiegen(): Haltung[] {
  const zurueck: Haltung = { ...STAND, huefte: P(-3, -29), rumpf: 0, kopf: 4, armV: { ziel: P(4, 15), hand: 50, schulter: true }, armH: { ziel: P(5, 14), hand: 60, schulter: true } };
  const vor: Haltung = {
    ...STAND,
    huefte: P(2, -28),
    rumpf: -16,
    kopf: 15,
    armV: { ziel: P(10, 12), hand: 110, schulter: true },
    armH: { ziel: P(11, 10), hand: 120, schulter: true },
    gesicht: 'wut',
  };
  const mitte = zwischen(zurueck, vor);
  return [zurueck, mitte, vor, mitte, zurueck, STAND];
}

/** Hocke im Versteck (Auftritt hocke, Welt 4.2; Grok A11): tief gekauert, Hand am Boden, Faust am Knie, Blick nach vorn. */
export const AUFTRITT_HOCKE: Haltung = {
  huefte: P(-1, -17),
  rumpf: -42,
  kopf: 34,
  armV: { ziel: P(17, -12), hand: 5 },
  armH: { ziel: P(6, 10), hand: 120, schulter: true },
  beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
  beinH: aufSpitze(-1, -35),
  formen: { HandV: 'offen', FaltenV: 'offen' },
};

/** Aufstehen aus der Hocke (AUFTRITT, 69 Frames, werte.ts AUFTRITT_HOCKE_RAMMBOCK): Kopf hoch, halb auf, fast aufrecht mit Deckung. */
function aufstehenHocke(): Haltung[] {
  const wach: Haltung = { ...AUFTRITT_HOCKE, huefte: P(-1, -18), rumpf: -30, kopf: 20 };
  const halb: Haltung = {
    huefte: P(-1, -22),
    rumpf: -22,
    kopf: 18,
    armV: { ziel: P(12, -1), hand: 150, schulter: true },
    armH: { ziel: P(14, -3), hand: 155, schulter: true },
    beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
  };
  return [wach, halb, zwischen(halb, KAMPF)];
}

/** Gehalten (Grok E1): aufrecht am Kragen gepackt, leicht zurückgelehnt, Kopf eingezogen, nahe Hand am Kragen, ferner Arm hängt. */
function gehalten(): Haltung {
  return {
    ...STAND,
    huefte: P(-1, -29),
    rumpf: 6,
    kopf: -4,
    armV: { ziel: P(9, -1), hand: 150, schulter: true },
    armH: { ziel: P(2, 13), hand: 5, schulter: true },
    beinV: { knoechel: P(6, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-8, -KNOECHEL), fuss: 0 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  };
}

/**
 * Geworfen (Grok E2, E3): kopfüber getragen mit hängenden Armen, dann
 * waagrecht mit dem Gesicht nach unten fliegend, Arme nach vorn
 * (Kopf voran in Blickrichtung des Bildes; G2-10).
 */
function geworfen(): Haltung[] {
  const kopfueber: Haltung = amBoden({
    huefte: P(0, -40),
    becken: 180,
    rumpf: 0,
    kopf: 0,
    armV: { ziel: P(-10, -4), hand: -25 },
    armH: { ziel: P(9, -5), hand: 25 },
    beinV: { knoechel: P(-2, -66), fuss: 175 },
    beinH: { knoechel: P(4, -67), fuss: 185 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  });
  const waagrecht: Haltung = amBoden({
    huefte: P(-6, -16),
    becken: -88,
    rumpf: 0,
    kopf: 30,
    armV: { ziel: P(34, -12), hand: 90 },
    armH: { ziel: P(36, -17), hand: 95 },
    beinV: { knoechel: P(-32, -13), fuss: -80 },
    beinH: { knoechel: P(-31, -18), fuss: -85 },
    formen: { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' },
    gesicht: 'getroffen',
  });
  return [kopfueber, waagrecht];
}

// ===========================================================================
// Animationen und Zuordnung (docs/grafik.md 4.2)
// ===========================================================================

/** Trefferbild des Schlags RA (Bild zur Zeit A + aktiv_von). */
export function schlagTrefferBild(): number {
  return trefferBild('RA', SCHLAG_DAUERN);
}

/** Dauern der Animationen, die nicht aus werte.ts über bolzer_gemeinsam.ts kommen. */
export const AUFSTEHEN_HOCKE_DAUERN = aufstehenHockeDauern(AUFTRITT_HOCKE_RAMMBOCK);

/**
 * Alle Animationen des Rammbocks (Auftrag 4, 3: wie der Bolzer, dazu wiegen,
 * hocke_ankuendigung, sprungtritt). Angriffe nach den Codes in werte.ts:
 * schlag_a = RA, schlag_b = RB, umwerfschlag = RU, sprungtritt = RS; schlag
 * ist schlag_a unter dem Namen aus Phase 1 (vergleich.ts, G2-11).
 */
export function rammbockAnimationen(): Animation[] {
  const h = rammbockHaltungen();
  const an = (name: string, dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation =>
    animation(name, h[name] as readonly Haltung[], dauern, schleife, aktiv);
  const geh = an('gehen', new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true);
  const umg = an('umgeworfen', UMGEWORFEN_DAUERN, false);
  const liegen = an('liegen', [0], true);
  const ra = angriffDauern('RA');
  const schlagAnim = an('schlag_a', ra, false, [trefferBild('RA', ra)]);
  return [
    an('stand', [0], true),
    an('haltung', HALTUNG_DAUERN, true),
    geh,
    animationAus('gehen_schnell', mitDauern(geh.bilder, new Array<number>(GEHEN_BILDER).fill(GEHEN_SCHNELL_DAUER)), true),
    animationAus('auftritt_versteck', geh.bilder, true),
    an('auftritt_hocke', [0], true),
    an('aufstehen_hocke', AUFSTEHEN_HOCKE_DAUERN, false),
    an('spott', SPOTT_DAUERN, false),
    an('wiegen', SPOTT_DAUERN, true),
    an('kampfhaltung', KAMPFHALTUNG_DAUERN, true),
    an('hocke_ankuendigung', HOCKE_DAUERN, false),
    schlagAnim,
    animationAus('schlag', schlagAnim.bilder, false, schlagAnim.aktiv),
    an('schlag_b', angriffDauern('RB'), false, [trefferBild('RB')]),
    an('umwerfschlag', angriffDauern('RU'), false, [trefferBild('RU')]),
    an('sprungtritt', SPRUNGTRITT_DAUERN, false, [bildBeiAbstand(SPRUNGTRITT_DAUERN, NAH_ANGRIFFE.RS.aktiv_von)]),
    an('getroffen', GETROFFEN_DAUERN, false),
    umg,
    liegen,
    an('aufstehen', AUFSTEHEN_DAUERN, false),
    an('gehalten', [0], true),
    an('geworfen', GEWORFEN_DAUERN, false),
    animationAus('tot', mitDauern([...umg.bilder, ...liegen.bilder], TOT_DAUERN), false),
  ];
}

/** Schlüsselhaltungen je gezeichneter Animation (für Tests und Prüfung der Gelenke). */
export function rammbockHaltungen(): Readonly<Record<string, readonly Haltung[]>> {
  return {
    stand: [STAND],
    haltung: haltung(),
    gehen: gehen(),
    auftritt_hocke: [AUFTRITT_HOCKE],
    aufstehen_hocke: aufstehenHocke(),
    spott: spott(),
    wiegen: wiegen(),
    kampfhaltung: kampfhaltung(),
    hocke_ankuendigung: hockeAnkuendigung(),
    schlag_a: schlagA(),
    schlag_b: schlagB(),
    umwerfschlag: umwerfschlag(),
    sprungtritt: sprungtritt(),
    getroffen: getroffen(),
    umgeworfen: umgeworfen(),
    liegen: [LIEGEN],
    aufstehen: aufstehen(),
    gehalten: [gehalten()],
    geworfen: geworfen(),
  };
}
