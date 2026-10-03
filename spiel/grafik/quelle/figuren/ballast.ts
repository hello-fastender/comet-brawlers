// Ballast, Vorarbeiter und Boss der Scheibe, als Gliederpuppe (Auftrag 4,
// Phase 2, G3; Auftrag 4, Abschnitte 3 und 4). Aussehen: riesig, schwerer
// Oberkörper, Schweißerbrille auf der Stirn, violettes Arbeitshemd mit
// abgerissenen Ärmeln, dunkelgraue Hose, rechter Arm als hydraulischer
// Ladearm aus Stahl mit Greifer und orangen Warnstreifen,
// Stahlkappenstiefel, helle Haut, kurzes Haar und Schnauzbart.
//
// Ansicht wie der Rammbock (E24): Rumpf halb von vorn, die nahe Schulter
// links der Mitte, die ferne rechts. Der Ladearm ist der rechte Arm, beim
// Blick nach rechts also der nahe (vorn gezeichnet); der freie linke Arm
// liegt hinter dem Rumpf.
//
// Maße in Spielpixeln. Herkunft: Umriss 70 × 100 mit Schatten
// (src/darstellung/masse.ts, UMRISS_GEGNER.Ballast), Körper im Stand
// höchstens 100 − SCHATTEN_HOEHE / 2 = 95 px hoch (docs/grafik.md 1.1,
// 2.5); Proportionen nach Auftrag 4, 1.1 (Kopf etwa 1/5 der Körperhöhe,
// große Hände und Füße, breite Schultern bei schweren Figuren). Zeiten aus
// src/kern/werte.ts (BOSS_GEHEN_X, AS_…, AN_…, KP_…, RZ_DAUER,
// BOSS_TAUMELN_DAUER, AUFTRITT_BOSS, REAKTION_ANIMATION, F1_…, F4_…,
// AUFSTEHEN_GEGNER); Ablauf nach docs/spezifikation-welt.md 7 und
// gegner/boss_angriffe.ts. Festlegungen in docs/grafik.md 4.6 und
// Abschnitt 7 (G3-…).

import type { Animation, Bild } from '../blatt.ts';
import type { Figur } from '../bauen.ts';
import type { Form, Punkt } from '../geometrie.ts';
import { drehe } from '../geometrie.ts';
import type { Leinwand, Pixel } from '../leinwand.ts';
import { deckend } from '../leinwand.ts';
import { NACHBARN_8, streupixelEntfernen } from '../kontur.ts';
import { BRILLE_GLUT, FARBBUDGET, HAUT_HELL, HEMD_BALLAST, HOSE_DUNKELGRAU, KONTUR, SIGNAL_ORANGE, STAHL } from '../palette.ts';
import type { Gerastert, Gesicht, Lage, Pose, Stil, TeilDef, Toene } from '../puppe.ts';
import { Puppe } from '../puppe.ts';
import { UMRISS_GEGNER } from '../../../src/darstellung/masse.ts';
import {
  AN_AUSHOLEN,
  AN_NACHLAUF,
  AN_V,
  AS_AKTIV_BIS,
  AS_AKTIV_VON,
  AS_AUSHOLEN,
  AS_NAECHSTER,
  AS_SCHWUENGE_MAX,
  AUFSTEHEN_GEGNER,
  AUFTRITT_BOSS,
  BOSS_GEHEN_X,
  BOSS_TAUMELN_DAUER,
  F1_BODEN,
  F1_RUHE,
  F1_STILLSTAND,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  KP_AKTIV_VON,
  KP_HOCKE,
  KP_LANDUNG,
  KP_NACHLAUF,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  RZ_DAUER,
  RZ_SCHNELL_FRAMES,
} from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';

// ===========================================================================
// Maße
// ===========================================================================

/** Sohle bis Knöchel (schwere Stahlkappenstiefel; Rammbock 6). */
const KNOECHEL = 7;
/** Hüfte bis Knie und Knie bis Knöchel (Beinlänge 34 + 7 = 41; Hüfte im Stand bei −40; lang genug für 30 px Standweg beim Gehen). */
const SCHENKEL = 17;
const SCHIENBEIN = 17;
/** Schulter bis Ellbogen, Ellbogen bis Handgelenk (lange, schwere Arme; Handgelenk im Stand auf Hüfthöhe). */
const OBERARM = 15;
const UNTERARM = 14;
/** Ladearm: Gehäuse am Oberarm, Hydraulikzylinder am Unterarm (dicker als der freie Arm). */
const LADE_OBERARM = 15;
const LADE_UNTERARM = 14;
/** Radien des freien Arms (muskulös; Rammbock 4,8 / 4,2 / 3,6). */
const OBERARM_R = [6, 5.2] as const;
const UNTERARM_R = [5.4, 4.4] as const;
/** Radien der Beine (weite Arbeitshose; Rammbock 6 / 5,2 / 4,4). */
const SCHENKEL_R = [8, 7] as const;
const SCHIENBEIN_R = [7, 5.8] as const;
/** Hüftgelenke links und rechts der Beckenmitte (breiter Stand). */
const HUEFTE_SEITE = 4.5;
/** Schultergelenke (Ansicht wie der Rammbock, G0c-1): nah links, fern rechts, Höhe über der Taille. */
const SCHULTER_V_X = -8;
const SCHULTER_H_X = 12;
const SCHULTER_HOEHE = 25;
/** Taille über dem Beckengelenk. */
const TAILLE = 4;
/** Nacken über der Taille (Kopfgelenk). */
const NACKEN = 30.5;

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
const plus = (a: Punkt, b: Punkt): Punkt => P(a.x + b.x, a.y + b.y);

/** Polygon um den Punkt d gedreht (für die Backen des Greifers). */
function gedreht(punkte: readonly [number, number][], d: Punkt, winkel: number): Form {
  return {
    art: 'polygon',
    punkte: punkte.map(([x, y]) => plus(d, drehe(P(x - d.x, y - d.y), winkel))),
  };
}

/**
 * Zeichenreihenfolge (Auftrag 4, 2.4): freier Arm hinten, fernes Bein, nahes
 * Bein, Becken, Rumpf mit Ausschnitt und Gürtel, Kopf mit Ohr, Haar, Bart und
 * Brille, vorn der Ladearm mit Schlauch, Warnstreifen, Greifer und
 * Schulterkappe.
 */
const EBENE = {
  armH: 10,
  aermelH: 10.5,
  handH: 11,
  beinH: 20,
  stiefelH: 21,
  kappeH: 22,
  beinV: 26,
  stiefelV: 27,
  kappeV: 28,
  becken: 29,
  rumpf: 30,
  ausschnitt: 31,
  guertel: 32,
  schnalle: 33,
  kopf: 35,
  ohr: 35.5,
  haar: 36,
  bart: 36.5,
  band: 37,
  rahmen: 37.5,
  linse: 38,
  schlauch: 49,
  armV: 50,
  streifen: 50.5,
  stange: 49.5,
  handV: 51,
  kappe: 52,
} as const;

/** Stiefel im Rahmen des Knöchels: Schaft bis 6 über dem Knöchel, 21 lang (große Füße), Stahlkappe vorn. */
const STIEFEL = polygon([-6.4, -6], [5.6, -6], [6.4, -1.6], [10.4, -0.4], [13.4, 1.8], [14, KNOECHEL], [-6.8, KNOECHEL], [-7.4, 1.4]);
const STAHLKAPPE = polygon([8.6, -0.8], [10.6, -0.4], [13.4, 1.8], [14, 6.2], [8.6, 6.2]);
const SOHLE = P(3.6, KNOECHEL);
const FERSE = P(-6.8, KNOECHEL);
const SPITZE = P(14, KNOECHEL);

/** Faust des freien Arms (Rammbock-Faust 1,15-fach: 12 × 11, große Hände). */
const FAUST = polygon([-4.6, -0.4], [4.6, -0.4], [6, 3], [6, 8.3], [4.4, 10.8], [-4.4, 10.8], [-6, 8.3], [-6, 3]);
const FALTEN: Form[] = [4.8, 8].map((y) => polygon([-7, y - 0.5], [-1.2, y - 0.5], [-1.2, y + 0.5], [-7, y + 0.5]));
/** Ärmelstummel des abgerissenen Hemdärmels am freien Oberarm (gezackter Saum). */
const AERMEL = polygon([-6.8, -3.4], [6.8, -3.4], [6.9, 3.4], [4.8, 4.8], [2.6, 3.4], [0.6, 5.4], [-1.6, 3.6], [-3.8, 5.2], [-6.9, 3.8]);

/** Greifer des Ladearms im Rahmen des Handgelenks (Achse entlang +y): Grundplatte und zwei Backen. */
const GREIFER_PLATTE = polygon([-5.8, -1.2], [5.8, -1.2], [6.4, 4.4], [-6.4, 4.4]);
const BACKE_VORN: [number, number][] = [
  [1.2, 3.6],
  [6.4, 3.6],
  [8.2, 8.6],
  [7, 13.4],
  [3.8, 15.4],
  [4.6, 11.8],
  [4.4, 8.4],
  [1.2, 7],
];
const BACKE_HINTEN: [number, number][] = BACKE_VORN.map(([x, y]) => [-x, y]);
/** Drehpunkte der Backen; offen um ±24° gespreizt (Festlegung G3). */
const BACKE_DREH_VORN = P(3.8, 4);
const BACKE_DREH_HINTEN = P(-3.8, 4);
const GREIFER_OFFEN = 24;
const GREIFER = {
  zu: [GREIFER_PLATTE, polygon(...BACKE_VORN), polygon(...BACKE_HINTEN)],
  offen: [GREIFER_PLATTE, gedreht(BACKE_VORN, BACKE_DREH_VORN, GREIFER_OFFEN), gedreht(BACKE_HINTEN, BACKE_DREH_HINTEN, -GREIFER_OFFEN)],
};
/** Warnstreifen schräg über dem Zylindergehäuse (drei Bänder zu 2 px, nur auf dem Gehäuse). */
const STREIFEN: Form[] = [0.5, 4.5, 8.5].map((y) => polygon([-8, y - 2], [8, y + 1], [8, y + 3], [-8, y]));
/** Hydraulikschlauch an der Rückseite des Oberarmgehäuses. */
const SCHLAUCH = kapsel(-5.6, 2, -4.6, 15.5, 1.4);

/** Rumpf im Rahmen der Taille, halb von vorn: Schultern ±19, Bauch vorn gewölbt, Taille ±13, Nacken 31,5 über der Taille. */
const RUMPF = polygon(
  [-13, 3.6],
  [12, 3.6],
  [16.4, 1.4],
  [18.4, -4],
  [18.2, -9.6],
  [18.6, -15],
  [19, -20.6],
  [17.4, -25.4],
  [13, -28.8],
  [6, -30.8],
  [-4, -30.8],
  [-12, -29],
  [-17.6, -24.6],
  [-19, -18],
  [-17, -9],
  [-15, -3],
);
/** V-Ausschnitt des Hemds (Haut, nur auf dem Rumpf). */
const AUSSCHNITT = polygon([-1.6, -31.5], [7.6, -31.5], [3.4, -23.6]);
/**
 * Nähte des Hemds (1 px im Hemdschatten, nur auf dem Rumpf): Knopfleiste vom
 * Ausschnitt zum Gürtel, Brusttasche auf der fernen Seite, eine Falte unter
 * der fernen Achsel.
 */
const NAEHTE: Form[] = [
  polygon([2.9, -24], [3.9, -24], [5.1, 3], [4.1, 3]),
  polygon([8.6, -23.6], [15, -24.2], [15, -23.2], [8.6, -22.6]),
  polygon([8.6, -23.6], [9.6, -23.6], [9.6, -17.4], [8.6, -17.4]),
  polygon([14, -24], [15, -24], [15, -17.6], [14, -17.6]),
  polygon([8.6, -18.4], [15, -18.6], [15, -17.6], [8.6, -17.4]),
  polygon([16.6, -19], [17.6, -19], [13.4, -9], [12.4, -9]),
];
/** Gürtel (Rahmen des Beckens) und Schnalle aus Stahl. */
const GUERTEL = polygon([-14, -4.2], [14.4, -4.2], [14.6, -0.8], [-14.2, -0.8]);
const SCHNALLE = polygon([3.4, -4.8], [7.4, -4.8], [7.4, -0.2], [3.4, -0.2]);

/** Kopf im Rahmen des Nackens: dicker Hals, Schädel, schweres Kinn, Nase im Profil (Auftrag 4, 2.4). */
const KOPF: Form[] = [
  kapsel(0, 0, 1, -4, 5),
  ellipse(2, -10.4, 7.4, 7.6),
  polygon([0, -8], [9.8, -8.8], [10.4, -3.4], [7.8, -0.8], [1, -1.4]),
  polygon([8.8, -12], [11.6, -8.8], [8.8, -7.8]),
];
const OHR = ellipse(-1, -9.6, 1.8, 2.6);
/** Kurzes Haar (flach geschnitten) und Schnauzbart. */
const HAAR = polygon([-6.4, -12.2], [-5.6, -16.6], [-2, -18], [7.6, -18], [9.2, -15.8], [9.2, -13.6], [-4.6, -11]);
const BART = polygon([5.6, -7.8], [10.8, -8.2], [11.4, -6.2], [9.4, -5.2], [6.4, -5.6]);
/** Schweißerbrille auf der Stirn: Band und zwei runde Gläser mit Stahlrahmen. */
const BAND = polygon([-6.6, -15.4], [9.8, -16.4], [10, -13.8], [-6.4, -12.8]);
const RAHMEN: Form[] = [ellipse(3, -16, 2.7, 2.3), ellipse(7.9, -16.1, 2.7, 2.3)];
const LINSEN: Form[] = [ellipse(3, -16, 1.6, 1.3), ellipse(7.9, -16.1, 1.6, 1.3)];

const TEILE: TeilDef[] = [
  { name: 'Becken', eltern: null, gelenk: P(0, 0), formen: [kapsel(-5, 0, 5, 0, 7)], material: 'HOSE', gruppe: 'becken', ebene: EBENE.becken },
  { name: 'Guertel', eltern: 'Becken', gelenk: P(0, 0), formen: [GUERTEL], material: 'DUNKEL', gruppe: 'guertel', ebene: EBENE.guertel, kissen: 1 },
  { name: 'Schnalle', eltern: 'Becken', gelenk: P(0, 0), formen: [SCHNALLE], material: 'STAHL', gruppe: 'guertel', ebene: EBENE.schnalle, glanz: true, kissen: 1 },
  { name: 'Rumpf', eltern: 'Becken', gelenk: P(0, -TAILLE), formen: [RUMPF], material: 'HEMD', gruppe: 'rumpf', ebene: EBENE.rumpf, kissen: 4 },
  { name: 'Ausschnitt', eltern: 'Rumpf', gelenk: P(0, 0), formen: [AUSSCHNITT], material: 'HAUT', gruppe: 'ausschnitt', ebene: EBENE.ausschnitt, auf: 'Rumpf' },
  { name: 'Naehte', eltern: 'Rumpf', gelenk: P(0, 0), formen: NAEHTE, material: 'NAHT', gruppe: 'rumpf', ebene: EBENE.ausschnitt - 0.5, flach: true, auf: 'Rumpf' },
  { name: 'Kopf', eltern: 'Rumpf', gelenk: P(2.5, -NACKEN), formen: KOPF, material: 'HAUT', gruppe: 'kopf', ebene: EBENE.kopf, relief: 0.45 },
  { name: 'Ohr', eltern: 'Kopf', gelenk: P(0, 0), formen: [OHR], material: 'HAUT', gruppe: 'ohr', ebene: EBENE.ohr },
  { name: 'Haar', eltern: 'Kopf', gelenk: P(0, 0), formen: [HAAR], material: 'DUNKEL', gruppe: 'haar', ebene: EBENE.haar, kissen: 1.5 },
  { name: 'Bart', eltern: 'Kopf', gelenk: P(0, 0), formen: [BART], material: 'DUNKEL', gruppe: 'bart', ebene: EBENE.bart, kissen: 1.5 },
  { name: 'Band', eltern: 'Kopf', gelenk: P(0, 0), formen: [BAND], material: 'DUNKEL', gruppe: 'band', ebene: EBENE.band, kissen: 1 },
  { name: 'Rahmen', eltern: 'Kopf', gelenk: P(0, 0), formen: RAHMEN, material: 'STAHL', gruppe: 'rahmen', ebene: EBENE.rahmen, glanz: true },
  { name: 'Linse', eltern: 'Kopf', gelenk: P(0, 0), formen: LINSEN, material: 'LINSE', gruppe: 'linse', ebene: EBENE.linse, glanz: true },
  // freier linker Arm (fern, hinter dem Rumpf)
  {
    name: 'OberarmH',
    eltern: 'Rumpf',
    gelenk: P(SCHULTER_H_X, -SCHULTER_HOEHE),
    formen: [kapsel(0, 0, 0, OBERARM, OBERARM_R[0], OBERARM_R[1])],
    material: 'HAUT',
    gruppe: 'armH',
    ebene: EBENE.armH,
  },
  { name: 'AermelH', eltern: 'OberarmH', gelenk: P(0, 0), formen: [AERMEL], material: 'HEMD', gruppe: 'aermelH', ebene: EBENE.aermelH, kissen: 2 },
  {
    name: 'UnterarmH',
    eltern: 'OberarmH',
    gelenk: P(0, OBERARM),
    formen: [kapsel(0, 0, 0, UNTERARM, UNTERARM_R[0], UNTERARM_R[1])],
    material: 'HAUT',
    gruppe: 'armH',
    ebene: EBENE.armH,
  },
  { name: 'HandH', eltern: 'UnterarmH', gelenk: P(0, UNTERARM), formen: [FAUST], material: 'HAUT', gruppe: 'handH', ebene: EBENE.handH, kissen: 2 },
  { name: 'FaltenH', eltern: 'HandH', gelenk: P(0, 0), formen: FALTEN, material: 'FALTE', gruppe: 'handH', ebene: EBENE.handH + 0.5, flach: true, auf: 'HandH' },
  // Beine
  ...(['H', 'V'] as const).flatMap((s): TeilDef[] => {
    const x = s === 'V' ? HUEFTE_SEITE : -HUEFTE_SEITE;
    const eb = s === 'V' ? EBENE.beinV : EBENE.beinH;
    const es = s === 'V' ? EBENE.stiefelV : EBENE.stiefelH;
    const ek = s === 'V' ? EBENE.kappeV : EBENE.kappeH;
    return [
      {
        name: `Oberschenkel${s}`,
        eltern: 'Becken',
        gelenk: P(x, 1),
        formen: [kapsel(0, 0, 0, SCHENKEL, SCHENKEL_R[0], SCHENKEL_R[1])],
        material: 'HOSE',
        gruppe: `bein${s}`,
        ebene: eb,
      },
      {
        name: `Unterschenkel${s}`,
        eltern: `Oberschenkel${s}`,
        gelenk: P(0, SCHENKEL),
        formen: [kapsel(0, 0, 0, SCHIENBEIN, SCHIENBEIN_R[0], SCHIENBEIN_R[1])],
        material: 'HOSE',
        gruppe: `bein${s}`,
        ebene: eb,
      },
      {
        name: `Stiefel${s}`,
        eltern: `Unterschenkel${s}`,
        gelenk: P(0, SCHIENBEIN),
        formen: [STIEFEL],
        material: 'DUNKEL',
        gruppe: `stiefel${s}`,
        ebene: es,
        sohle: SOHLE,
      },
      { name: `Kappe${s}`, eltern: `Stiefel${s}`, gelenk: P(0, 0), formen: [STAHLKAPPE], material: 'STAHL', gruppe: `kappe${s}`, ebene: ek, glanz: true, kissen: 1.5 },
    ];
  }),
  // Ladearm (rechter Arm, nah, vorn)
  {
    name: 'OberarmV',
    eltern: 'Rumpf',
    gelenk: P(SCHULTER_V_X, -SCHULTER_HOEHE),
    formen: [kapsel(0, 0, 0, LADE_OBERARM, 7, 6.2)],
    material: 'STAHL',
    gruppe: 'ladeOben',
    ebene: EBENE.armV,
    glanz: true,
  },
  { name: 'Schlauch', eltern: 'OberarmV', gelenk: P(0, 0), formen: [SCHLAUCH], material: 'DUNKEL', gruppe: 'schlauch', ebene: EBENE.schlauch + 2 },
  {
    name: 'UnterarmV',
    eltern: 'OberarmV',
    gelenk: P(0, LADE_OBERARM),
    formen: [kapsel(0, 0, 0, 9, 6.4, 5.8)],
    material: 'STAHL',
    gruppe: 'ladeUnten',
    ebene: EBENE.armV + 0.2,
    glanz: true,
  },
  { name: 'Streifen', eltern: 'UnterarmV', gelenk: P(0, 0), formen: STREIFEN, material: 'WARN', gruppe: 'ladeUnten', ebene: EBENE.streifen, flach: true, auf: 'UnterarmV' },
  {
    name: 'Stange',
    eltern: 'UnterarmV',
    gelenk: P(0, 0),
    formen: [kapsel(0, 8, 0, LADE_UNTERARM, 3)],
    material: 'STAHL',
    gruppe: 'stange',
    ebene: EBENE.stange,
    glanz: true,
  },
  {
    name: 'HandV',
    eltern: 'UnterarmV',
    gelenk: P(0, LADE_UNTERARM),
    formen: GREIFER.zu,
    varianten: GREIFER,
    material: 'STAHL',
    gruppe: 'greifer',
    ebene: EBENE.handV,
    glanz: true,
    kissen: 1.5,
  },
  { name: 'Kappe', eltern: 'OberarmV', gelenk: P(0, 0), formen: [ellipse(0.2, -0.6, 7.8, 6.8)], material: 'STAHL', gruppe: 'kappe', ebene: EBENE.kappe, glanz: true },
];

export const PUPPE_BALLAST = new Puppe(TEILE);

// ===========================================================================
// Farben: Tonabbildung (Farbbudget 16, docs/grafik.md 1.2 und 4.6)
// ===========================================================================

const H = HAUT_HELL.treppe;
const M = HEMD_BALLAST.treppe;
const D = HOSE_DUNKELGRAU.treppe;
const S = STAHL.treppe;
const O = SIGNAL_ORANGE.treppe;

/** Gläser der Brille: Stahlglas mit Glanz; leuchtend in BRILLE_GLUT vor jedem Angriff (Ankündigung, Festlegung G3). */
const LINSE_NORMAL: Toene = [S[1], S[2], S[3], S[4], S[4]];
const LINSE_GLUT: Toene = [BRILLE_GLUT, BRILLE_GLUT, BRILLE_GLUT, BRILLE_GLUT, BRILLE_GLUT];

/**
 * 15 Farben plus durchsichtig: KONTUR, Haut 1 bis 3, Hemd 1 bis 3, Hose 1 und
 * 2, Stahl 1 bis 4, Signalorange 2, BRILLE_GLUT. Haar, Bart, Brillenband,
 * Gürtel, Schlauch und Stiefel in den Hosentönen; Licht der Hose im Stahl 1
 * (#4D5374 liegt neben HOSE_DUNKELGRAU 3 #595F69); Warnstreifen einstufig
 * (docs/grafik.md 4.6).
 */
const ZUTEILUNG: Readonly<Record<string, Toene>> = {
  HAUT: [H[1], H[1], H[2], H[3], H[3]],
  FALTE: [H[1], H[1], H[1], H[1], H[1]],
  HEMD: [KONTUR, M[1], M[2], M[3], M[3]],
  NAHT: [M[1], M[1], M[1], M[1], M[1]],
  HOSE: [KONTUR, D[1], D[2], S[1], S[1]],
  DUNKEL: [KONTUR, D[1], D[1], D[2], D[2]],
  STAHL: [S[1], S[1], S[2], S[3], S[4]],
  WARN: [O[2], O[2], O[2], O[2], O[2]],
  LINSE: LINSE_NORMAL,
};

/** Gesicht (Blick rechts): Braue im Hautschatten über dem Auge 2 × 2 in KONTUR. */
const GESICHT: Gesicht = { teil: 'Kopf', ursprung: P(3, -12), zeilen: ['bbbb', '..kk', '..kk'], farben: { k: KONTUR, b: H[1] as Pixel } };
/** Getroffen: Auge zugekniffen, Braue hochgezogen. */
const GESICHT_GETROFFEN: Gesicht = { teil: 'Kopf', ursprung: P(3, -12), zeilen: ['.bbb', '....', '.kkk'], farben: { k: KONTUR, b: H[1] as Pixel } };
/** Wütend (Ankündigung, Angriffe): Braue tief und schräg zur Nase. */
const GESICHT_WUT: Gesicht = { teil: 'Kopf', ursprung: P(3, -12), zeilen: ['bb..', '.bbb', '..kk'], farben: { k: KONTUR, b: H[1] as Pixel } };

/** Glanzfarben (dürfen allein stehen): Stahl 4 und das Leuchten der Brille. */
export const GLANZ_BALLAST: ReadonlySet<Pixel> = new Set<Pixel>([S[4], BRILLE_GLUT]);

type Miene = 'ruhig' | 'wut' | 'getroffen' | 'ohne';

function stil(glut: boolean, miene: Miene): Stil {
  const zuteilung = glut ? { ...ZUTEILUNG, LINSE: LINSE_GLUT } : ZUTEILUNG;
  const g = miene === 'wut' ? GESICHT_WUT : miene === 'getroffen' ? GESICHT_GETROFFEN : miene === 'ruhig' ? GESICHT : undefined;
  return g === undefined ? { zuteilung, kontur: KONTUR, glanz: GLANZ_BALLAST } : { zuteilung, kontur: KONTUR, glanz: GLANZ_BALLAST, gesicht: g };
}

// ===========================================================================
// Haltungen
// ===========================================================================

/** Arm: Ziel des Handgelenks (Figurkoordinaten oder relativ zur Schulter), Weltwinkel von Faust bzw. Greifer. */
interface Arm {
  readonly ziel: Punkt;
  readonly hand?: number;
  readonly schulter?: boolean;
}

/** Bein: Knöchel (Figurkoordinaten) und Weltwinkel des Stiefels (0 flach, + Spitze hoch, − Ferse hoch). */
interface Bein {
  readonly knoechel: Punkt;
  readonly fuss: number;
}

/** Haltung: Eingaben, aus denen die Pose berechnet wird. */
export interface Haltung {
  readonly huefte: Punkt;
  /** Becken absolut (positiv: Oberkörper nach hinten gekippt; 90 rücklings, −90 bäuchlings). */
  readonly becken?: number;
  readonly rumpf: number;
  readonly kopf: number;
  /** Ladearm (nah). */
  readonly armV: Arm;
  /** freier Arm (fern). */
  readonly armH: Arm;
  readonly beinV: Bein;
  readonly beinH: Bein;
  readonly greifer?: 'offen' | 'zu';
  /** Brille leuchtet (Ankündigung). */
  readonly glut?: boolean;
  readonly miene?: Miene;
  readonly versatz?: Pose['versatz'];
  readonly ebenen?: Pose['ebenen'];
}

const KNIE: 1 = 1;
const ELLBOGEN: -1 = -1;

/** Rechnet eine Haltung in eine Pose um (Beine und Arme über zwei Gelenke). */
export function pose(h: Haltung): Pose {
  const pu = PUPPE_BALLAST;
  let p: Pose = {
    wurzel: h.huefte,
    winkel: { Becken: h.becken ?? 0, Rumpf: h.rumpf, Kopf: h.kopf },
    formen: { HandV: h.greifer ?? 'zu' },
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
      const sch = (pu.lagen(p).get(`Oberarm${s}`) as Lage).pos;
      ziel = plus(sch, a.ziel);
    }
    mit(pu.zweiGelenke(p, `Oberarm${s}`, `Unterarm${s}`, `Hand${s}`, ziel, ELLBOGEN));
    if (a.hand !== undefined) mit(pu.weltWinkel(p, `Hand${s}`, a.hand));
  }
  return p;
}

export function zeichne(h: Haltung): Gerastert {
  return PUPPE_BALLAST.rastern(pose(h), stil(h.glut === true, h.miene ?? 'ruhig'));
}

/**
 * Bild einer Haltung: letzte Streupixel zwischen Teilen entfernen (Regel 1.3,
 * Kontur geschützt), Anker in der untersten Zeile: Jedes Bild steht auf der
 * Ankerzeile, Posen in der Luft heben sich über die Höhe der Logik
 * (Festlegung G3-2).
 */
function bild(h: Haltung, dauer: number): Bild {
  const g = zeichne(h);
  streupixelEntfernen(g.leinwand, GLANZ_BALLAST, new Set<Pixel>([KONTUR]));
  einzelKonturEntfernen(g.leinwand);
  return { leinwand: g.leinwand, ankerX: g.ankerX, ankerY: untersteZeile(g.leinwand), dauer };
}

/**
 * Einzelne Konturpixel im Inneren (ohne Kontur unter den acht Nachbarn, alle
 * vier Kantennachbarn deckend; Reste einer verdeckten Innenkontur oder eines
 * angeschnittenen Auges) nehmen die häufigste Nachbarfarbe an (Regel 1.3).
 * Die Außenkontur bleibt unberührt: Ihre Pixel haben Kontur als Nachbarn.
 */
function einzelKonturEntfernen(l: Leinwand): void {
  for (let y = 0; y < l.hoehe; y++) {
    for (let x = 0; x < l.breite; x++) {
      if (l.hole(x, y) !== KONTUR) continue;
      const zahl = new Map<Pixel, number>();
      let allein = true;
      let innen = true;
      for (const [dx, dy] of NACHBARN_8) {
        const n = l.hole(x + dx, y + dy);
        if (n === KONTUR) allein = false;
        if (!deckend(n) && (dx === 0 || dy === 0)) innen = false;
        if (deckend(n)) zahl.set(n, (zahl.get(n) ?? 0) + 1);
      }
      if (!allein || !innen) continue;
      let beste: Pixel = KONTUR;
      let besteZahl = 0;
      for (const [farbe, z] of zahl) {
        if (z > besteZahl) {
          besteZahl = z;
          beste = farbe;
        }
      }
      l.setze(x, y, beste);
    }
  }
}

/** Unterste Zeile mit deckenden Pixeln (Konturzeile unter dem tiefsten Teil). */
function untersteZeile(l: Leinwand): number {
  for (let y = l.hoehe - 1; y >= 0; y--) {
    for (let x = 0; x < l.breite; x++) if (deckend(l.hole(x, y))) return y;
  }
  return l.hoehe - 1;
}

/** Ziel des Handgelenks und Weltwinkel der Hand in Figurkoordinaten. */
function armAbsolut(h: Haltung, seite: 'V' | 'H'): Arm {
  const lage = PUPPE_BALLAST.lagen(pose(h)).get(`Hand${seite}`) as Lage;
  return { ziel: lage.pos, hand: lage.winkel };
}

/** Zwischenbild zwischen zwei Schlüsselhaltungen (Eingaben gemischt, Gelenke neu gelöst; wie Vela, G0-8). */
export function zwischen(a: Haltung, b: Haltung, t: number = 0.5): Haltung {
  const m = (x: number, y: number): number => x + (y - x) * t;
  const mp = (p: Punkt, q: Punkt): Punkt => P(m(p.x, q.x), m(p.y, q.y));
  const arm = (seite: 'V' | 'H'): Arm => {
    const p = armAbsolut(a, seite);
    const q = armAbsolut(b, seite);
    return { ziel: mp(p.ziel, q.ziel), hand: m(p.hand as number, q.hand as number) };
  };
  const bein = (p: Bein, q: Bein): Bein => ({ knoechel: mp(p.knoechel, q.knoechel), fuss: m(p.fuss, q.fuss) });
  const naeher = t < 0.5 ? a : b;
  const versatz: Record<string, Punkt> = {};
  const va = a.versatz ?? {};
  const vb = b.versatz ?? {};
  for (const k of new Set([...Object.keys(va), ...Object.keys(vb)])) versatz[k] = mp(va[k] ?? P(0, 0), vb[k] ?? P(0, 0));
  return {
    huefte: mp(a.huefte, b.huefte),
    becken: m(a.becken ?? 0, b.becken ?? 0),
    rumpf: m(a.rumpf, b.rumpf),
    kopf: m(a.kopf, b.kopf),
    armV: arm('V'),
    armH: arm('H'),
    beinV: bein(a.beinV, b.beinV),
    beinH: bein(a.beinH, b.beinH),
    versatz,
    ...(naeher.greifer !== undefined ? { greifer: naeher.greifer } : {}),
    ...(naeher.glut !== undefined ? { glut: naeher.glut } : {}),
    ...(naeher.miene !== undefined ? { miene: naeher.miene } : {}),
    ...(naeher.ebenen !== undefined ? { ebenen: naeher.ebenen } : {}),
  };
}

/** Index des Bildes, das bei Aktionsuhr uhr (1 = erstes Bild) gezeigt wird (wie figuren/vela.ts). */
export function bildBeiUhr(dauern: readonly number[], uhr: number): number {
  let summe = 0;
  for (let i = 0; i < dauern.length; i++) {
    summe += dauern[i] as number;
    if (uhr <= summe) return i;
  }
  return dauern.length - 1;
}

/** Bild zur Zeit A + d (d = 0 im Frame A). */
export function bildBeiAbstand(dauern: readonly number[], d: number): number {
  return bildBeiUhr(dauern, d + 1);
}

const summe = (z: readonly number[]): number => z.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Stand: 2 Bilder, atmend (Auftrag 4, 3); breitbeinig, Ladearm hängt schwer,
// freie Faust vor der Hüfte; Bild 1 mit gehobener Brust und Schultern
// ---------------------------------------------------------------------------

/** Richtwert je Atemzug (keine Quelle; langsamer als die Haltung des Bolzers 3 × 5, Festlegung G3-5). */
export const STAND_DAUERN = [20, 20] as const;

export const STAND: Haltung = {
  huefte: P(-1, -39.5),
  rumpf: -6,
  kopf: 6,
  armV: { ziel: P(3, 27), hand: 8, schulter: true },
  armH: { ziel: P(4, 25), hand: 50, schulter: true },
  beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
};

function stand(): Haltung[] {
  const ein: Haltung = { ...STAND, rumpf: -4.5, kopf: 5, armV: { ziel: P(3.5, 26), hand: 8, schulter: true }, armH: { ziel: P(4.5, 24), hand: 50, schulter: true }, versatz: { Kopf: P(0, -0.6) } };
  return [STAND, ein];
}

// ---------------------------------------------------------------------------
// Gehen: 5 Bilder zu 8 Frames (Auftrag 4, 3); der Standfuß rückt je Bild um
// 8 · 1,25 = 10 px zurück (werte.ts BOSS_GEHEN_X), 50 px je Zyklus. Jeder
// Fuß steht 4 Bilder (3 Bildwechsel, Ferse – flach – flach – Spitze) und
// schwingt 2 Bildwechsel; so deckt immer ein Fuß jeden Bildwechsel
// (Festlegung G3-6). Schwerer, stampfender Gang: Hüfte sinkt beim Aufsetzen.
// ---------------------------------------------------------------------------

export const GEHEN_BILDER = 5;
export const GEHEN_DAUER = 8;
/** px je Bild: Frames je Bild · Gehgeschwindigkeit (1,25 als Festkomma, genau 10). */
export const GEHEN_SCHRITT = (GEHEN_DAUER * BOSS_GEHEN_X) / EINS;
export function gehVersatz(n: number): number {
  return Math.round(n * GEHEN_SCHRITT);
}
/** Bildwechsel, die ein Fuß am Boden steht. */
const STAND_WECHSEL = 3;
const FUSS_HUB = 7;
const FERSE_AUF = 12;
const SPITZE_AB = -22;

function knoechelUeber(kontakt: Punkt, kontaktLokal: Punkt, winkel: number): Punkt {
  const w = (winkel * Math.PI) / 180;
  const dx = kontaktLokal.x * Math.cos(w) + kontaktLokal.y * Math.sin(w);
  const dy = -kontaktLokal.x * Math.sin(w) + kontaktLokal.y * Math.cos(w);
  return P(kontakt.x - dx, kontakt.y - dy);
}

/** Lage eines Fußes im Bild i: Standphase k = 0 … 3 (Ferse, flach, flach, Spitze), dann Schwung. */
function gehFuss(i: number, start: number, vorn: number): Bein {
  const k = (((i - start) % GEHEN_BILDER) + GEHEN_BILDER) % GEHEN_BILDER;
  const zurueck = (j: number): number => gehVersatz(start + j) - gehVersatz(start);
  if (k <= STAND_WECHSEL) {
    const flach = P(vorn - zurueck(k), -KNOECHEL);
    if (k === 0) return { knoechel: knoechelUeber(P(flach.x + FERSE.x, 0), FERSE, FERSE_AUF), fuss: FERSE_AUF };
    if (k === STAND_WECHSEL) return { knoechel: knoechelUeber(P(flach.x + SPITZE.x, 0), SPITZE, SPITZE_AB), fuss: SPITZE_AB };
    return { knoechel: flach, fuss: 0 };
  }
  const s = (k - STAND_WECHSEL) / (GEHEN_BILDER - STAND_WECHSEL);
  const hinten = vorn - zurueck(STAND_WECHSEL);
  const x = hinten + (vorn - hinten) * s;
  const hub = Math.sin(Math.PI * s) * FUSS_HUB;
  return { knoechel: P(x, -KNOECHEL - hub), fuss: SPITZE_AB * (1 - s) + FERSE_AUF * s * 0.5 };
}

/** Vorderste Lage der Knöchel (Standweg 30 px, etwa ±15 um das jeweilige Hüftgelenk) und Hüfte beim Gehen. */
const GEHEN_VORN_V = 15;
const GEHEN_VORN_H = 10;
const GEHEN_HUEFTE = -39;
/** Hüfte beim Gehen 2 px hinter dem Fußpunkt: Standweg beider Füße mittig unter ihren Hüftgelenken. */
const GEHEN_HUEFTE_X = -2;
/** Beginn der Standphase des fernen Fußes (Bild 3: er setzt auf, wenn der nahe über die Spitze abrollt; dazwischen 4 px Abstand von Ferse zu Spitze, damit die Sohlen getrennt bleiben). */
const GEHEN_START_H = 3;

export function gehen(): Haltung[] {
  const aus: Haltung[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const beinV = gehFuss(i, 0, GEHEN_VORN_V);
    const beinH = gehFuss(i, GEHEN_START_H, GEHEN_VORN_H);
    const reich = SCHENKEL + SCHIENBEIN - 1;
    const hoehe = (b: Bein, seite: number, hx: number): number => {
      const dx = b.knoechel.x - (hx + seite);
      return b.knoechel.y - Math.sqrt(Math.max(0, reich * reich - dx * dx));
    };
    const hx = GEHEN_HUEFTE_X;
    const hy = Math.max(hoehe(beinV, HUEFTE_SEITE, hx), hoehe(beinH, -HUEFTE_SEITE, hx), GEHEN_HUEFTE);
    // Arme gegen die Beine: der Ladearm schwingt schwer und wenig, der freie Arm weiter
    const phase = (2 * Math.PI * i) / GEHEN_BILDER;
    const schwung = Math.cos(phase);
    aus.push({
      huefte: P(hx, hy),
      rumpf: -8 + 1.5 * Math.cos(phase * 2),
      kopf: 8,
      armV: { ziel: P(3 - 5 * schwung, 27 - 2 * Math.max(0, -schwung)), hand: 8 - 18 * schwung, schulter: true },
      armH: { ziel: P(5 + 6 * schwung, 24 - 3 * Math.max(0, schwung)), hand: 50 + 30 * schwung, schulter: true },
      beinV,
      beinH,
    });
  }
  return aus;
}

// ---------------------------------------------------------------------------
// Ankündigung: 2 Bilder 8 / 7 = 15 Frames, Schleife (Auftrag 4, 3:
// mindestens 15 Frames vor jedem Angriff; werte.ts KP_HOCKE). Breite Hocke,
// vorgebeugt, Ladearm hinten hoch gespannt mit offenem Greifer, freie Faust
// vorn, Brille glüht (BRILLE_GLUT); Bild 1 tiefer, Greifer zu (Hydraulik
// pumpt).
// ---------------------------------------------------------------------------

export const ANKUENDIGUNG_DAUERN = [8, KP_HOCKE - 8] as const;

export const ANKUENDIGUNG: Haltung = {
  huefte: P(-3, -34),
  rumpf: -14,
  kopf: 16,
  armV: { ziel: P(-30, -76), hand: -140 },
  armH: { ziel: P(26, -52), hand: 110 },
  beinV: { knoechel: P(15, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-17, -KNOECHEL), fuss: 0 },
  greifer: 'offen',
  glut: true,
  miene: 'wut',
  versatz: { OberarmV: P(-3, 0) },
};

function ankuendigung(): Haltung[] {
  const tief: Haltung = {
    ...ANKUENDIGUNG,
    huefte: P(-3, -32.5),
    rumpf: -16,
    armV: { ziel: P(-31, -72), hand: -150 },
    armH: { ziel: P(26, -50), hand: 110 },
    greifer: 'zu',
  };
  return [ANKUENDIGUNG, tief];
}

// ---------------------------------------------------------------------------
// Armschwung AS: 3 Schwünge als Folge zu je 5 Bildern (Auftrag 4, 3; E18).
// Je Schwung: Ausholen 2 Bilder über AS_AUSHOLEN = 17 Frames (9 + 8),
// Trefferbild über die aktiven Frames A_k+17 bis A_k+19 (3; mit Treffer
// 7 Frames länger, dann bleibt es stehen), Durchschwung und Rückkehr 8 + 8
// bis zum nächsten Schwung in A_k+36 (AS_NAECHSTER). Schwung 1 Vorhand,
// Schwung 2 Aufwärtshaken, Schwung 3 Hammer von oben (wirft um).
// ---------------------------------------------------------------------------

export const SCHWUNG_DAUERN = [9, AS_AUSHOLEN - 9, AS_AKTIV_BIS - AS_AKTIV_VON + 1, 8, AS_NAECHSTER - AS_AKTIV_BIS - 1 - 8] as const;
/** Bilder je Schwung und Index des Trefferbilds im Schwung. */
export const SCHWUNG_BILDER = SCHWUNG_DAUERN.length;
export function schwungTrefferBild(): number {
  return bildBeiAbstand(SCHWUNG_DAUERN, AS_AKTIV_VON);
}

/** Beine im Ausfallschritt beim Schlag (vorn weit vor, hinten zurück). */
const AUSFALL_V: Bein = { knoechel: P(20, -KNOECHEL), fuss: 0 };
const AUSFALL_H: Bein = { knoechel: P(-15, -KNOECHEL), fuss: 0 };
const ZURUECK_V: Bein = { knoechel: P(12, -KNOECHEL), fuss: 0 };
const ZURUECK_H: Bein = { knoechel: P(-18, -KNOECHEL), fuss: 0 };
/**
 * Der Rumpf bleibt in der Dreiviertelansicht; beim Schwung rollt die nahe
 * Schulter um 5 px vor bzw. 3 px zurück, und im Trefferbild sind Ellbogen und
 * Handgelenk um 1,5 und 1 px gestreckt (wie Vela, G0-6; Festlegung G3-9).
 */
const SCHULTER_VOR = { OberarmV: P(5, 0) } as const;
const SCHULTER_ZURUECK = { OberarmV: P(-3, 0) } as const;
const STRECKUNG = { UnterarmV: P(0, 1.5), HandV: P(0, 1) } as const;

function schwung1(): Haltung[] {
  const ausholen: Haltung = {
    huefte: P(-3, -36),
    rumpf: 4,
    kopf: 4,
    armV: { ziel: P(-36, -62), hand: -100 },
    armH: { ziel: P(16, -50), hand: 140 },
    beinV: ZURUECK_V,
    beinH: ZURUECK_H,
    greifer: 'offen',
    miene: 'wut',
    versatz: SCHULTER_ZURUECK,
  };
  const weit: Haltung = { ...ausholen, huefte: P(-5, -35), rumpf: 10, kopf: -2, armV: { ziel: P(-42, -58), hand: -110 }, versatz: SCHULTER_ZURUECK };
  const treffer: Haltung = {
    huefte: P(5, -35),
    rumpf: -18,
    kopf: 14,
    armV: { ziel: P(46, -60), hand: 92 },
    versatz: { ...SCHULTER_VOR, ...STRECKUNG },
    armH: { ziel: P(-4, -46), hand: -40 },
    beinV: AUSFALL_V,
    beinH: AUSFALL_H,
    greifer: 'zu',
    miene: 'wut',
  };
  const durch: Haltung = { ...treffer, huefte: P(5, -35), rumpf: -22, kopf: 16, armV: { ziel: P(28, -38), hand: 50 }, armH: { ziel: P(-10, -50), hand: -60 } };
  return [ausholen, weit, treffer, durch, zwischen(durch, STAND)];
}

function schwung2(): Haltung[] {
  const ausholen: Haltung = {
    huefte: P(-3, -32),
    rumpf: -14,
    kopf: 18,
    armV: { ziel: P(-26, -20), hand: -30 },
    armH: { ziel: P(14, -50), hand: 140 },
    beinV: ZURUECK_V,
    beinH: ZURUECK_H,
    greifer: 'offen',
    miene: 'wut',
  };
  const tief: Haltung = { ...ausholen, huefte: P(-4, -30), rumpf: -22, kopf: 24, armV: { ziel: P(-30, -14), hand: -20 } };
  const treffer: Haltung = {
    huefte: P(5, -37),
    rumpf: -8,
    kopf: 2,
    armV: { ziel: P(34, -82), hand: 148 },
    versatz: { ...SCHULTER_VOR, ...STRECKUNG },
    armH: { ziel: P(-6, -46), hand: -40 },
    beinV: AUSFALL_V,
    beinH: AUSFALL_H,
    greifer: 'zu',
    miene: 'wut',
  };
  const hoch: Haltung = { ...treffer, huefte: P(4, -38), rumpf: 2, kopf: -2, armV: { ziel: P(20, -90), hand: 170 } };
  return [ausholen, tief, treffer, hoch, zwischen(hoch, STAND)];
}

function schwung3(): Haltung[] {
  const ausholen: Haltung = {
    huefte: P(-2, -37),
    rumpf: 6,
    kopf: 0,
    armV: { ziel: P(-6, -98), hand: 175 },
    armH: { ziel: P(16, -52), hand: 140 },
    beinV: ZURUECK_V,
    beinH: ZURUECK_H,
    greifer: 'zu',
    miene: 'wut',
  };
  const hoch: Haltung = { ...ausholen, huefte: P(-4, -38), rumpf: 14, kopf: -8, armV: { ziel: P(-20, -96), hand: -150 } };
  const treffer: Haltung = {
    huefte: P(5, -33),
    rumpf: -28,
    kopf: 22,
    armV: { ziel: P(42, -42), hand: 70 },
    versatz: { ...SCHULTER_VOR, ...STRECKUNG },
    armH: { ziel: P(0, -40), hand: -30 },
    beinV: AUSFALL_V,
    beinH: AUSFALL_H,
    greifer: 'zu',
    miene: 'wut',
  };
  const aufschlag: Haltung = { ...treffer, huefte: P(5, -31), rumpf: -34, kopf: 26, armV: { ziel: P(38, -18), hand: 20 } };
  return [ausholen, hoch, treffer, aufschlag, zwischen(aufschlag, STAND)];
}

function armschwung(): Haltung[] {
  return [...schwung1(), ...schwung2(), ...schwung3()];
}

// ---------------------------------------------------------------------------
// Ansturm AN: 4 Laufbilder (Auftrag 4, 3), Schleife über die Lauf-Frames
// (alle aktiv, Welt 7.3). Richtwert 4 Frames je Bild: der Standfuß rückt
// je Bild um 4 · 4 = 16 px zurück (werte.ts AN_V). Vorgebeugt, der Ladearm
// als Rammbock vorgestreckt, der freie Arm pumpt. Dazu ansturm_bremsen
// (1 Bild) für den Auslauf im Nachlauf (AN_NACHLAUF, Festlegung G3-7).
// ---------------------------------------------------------------------------

export const ANSTURM_DAUER = 4;
export const ANSTURM_SCHRITT = (ANSTURM_DAUER * AN_V) / EINS;
/** Vorderste Lage der Knöchel beim Aufsetzen, Neigung des Stiefels beim Aufsetzen und Abstoßen (Festlegung G3-7). */
const ANSTURM_VORN_V = 18;
const ANSTURM_VORN_H = 12;
const ANSTURM_FERSE = 10;
const ANSTURM_SPITZE = -40;

function ansturm(): Haltung[] {
  const s = ANSTURM_SCHRITT;
  const basis = {
    rumpf: -30,
    kopf: 26,
    greifer: 'zu' as const,
    miene: 'wut' as Miene,
  };
  const ram = (dx: number, dy: number): Arm => ({ ziel: P(34 + dx, -56 + dy), hand: 96 });
  // Aufsetzen auf der Ferse (vorn), flach unter dem Körper (s px weiter hinten), Abstoßen über die Spitze
  const auf = (vorn: number): Bein => ({ knoechel: knoechelUeber(P(vorn + FERSE.x, 0), FERSE, ANSTURM_FERSE), fuss: ANSTURM_FERSE });
  const flach = (vorn: number): Bein => ({ knoechel: P(vorn - s, -KNOECHEL), fuss: 0 });
  const ab = (x: number): Bein => ({ knoechel: knoechelUeber(P(x + SPITZE.x, 0), SPITZE, ANSTURM_SPITZE), fuss: ANSTURM_SPITZE });
  return [
    // 0: naher Fuß setzt vorn auf, ferner stößt hinten ab
    { ...basis, huefte: P(2, -35), armV: ram(0, 0), armH: { ziel: P(-14, -52), hand: -60 }, beinV: auf(ANSTURM_VORN_V), beinH: ab(ANSTURM_VORN_H - 2 * s) },
    // 1: naher Fuß flach unter dem Körper, ferner schwingt vor
    { ...basis, huefte: P(2, -37), armV: ram(1, -2), armH: { ziel: P(4, -54), hand: 40 }, beinV: flach(ANSTURM_VORN_V), beinH: { knoechel: P(4, -20), fuss: -10 } },
    // 2: ferner Fuß setzt vorn auf, naher stößt hinten ab
    { ...basis, huefte: P(2, -35), armV: ram(0, 1), armH: { ziel: P(18, -60), hand: 120 }, beinV: ab(ANSTURM_VORN_V - 2 * s), beinH: auf(ANSTURM_VORN_H) },
    // 3: ferner Fuß flach unter dem Körper, naher schwingt vor
    { ...basis, huefte: P(2, -37), armV: ram(1, -1), armH: { ziel: P(4, -54), hand: 40 }, beinV: { knoechel: P(10, -22), fuss: -10 }, beinH: flach(ANSTURM_VORN_H) },
  ];
}

function ansturmBremsen(): Haltung[] {
  return [
    {
      huefte: P(-4, -34),
      rumpf: 6,
      kopf: 4,
      armV: { ziel: P(30, -48), hand: 80 },
      armH: { ziel: P(-18, -58), hand: -120 },
      beinV: { knoechel: P(22, -KNOECHEL), fuss: 14 },
      beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
      greifer: 'offen',
      miene: 'wut',
    },
  ];
}

// ---------------------------------------------------------------------------
// Körperpresse KP: Absprung 2, Flug 1, Aufprall 2, Aufstehen 2 Bilder
// (Auftrag 4, 3). Die 15 Frames Hocke davor zeigen die Ankündigung. Bild
// nach dem Bahnframe k ab A (gegner/boss_angriffe.ts kp_k): Absprung k 0 bis
// 2, Steigen bis 14, Flug bis 50, Presse (bäuchlings fallend, Trefferbild)
// ab KP_AKTIV_VON = 51 bis zur Landung in k = 64, Aufprall, dann Aufstehen
// im Nachlauf (40 Frames nach dem letzten aktiven Frame).
// ---------------------------------------------------------------------------

export const PRESSE_DAUERN = [3, 12, KP_AKTIV_VON - 15, KP_LANDUNG - KP_AKTIV_VON, 12, 14, KP_NACHLAUF - 12 - 14 - 2] as const;

function koerperpresse(): Haltung[] {
  const absprung: Haltung = {
    huefte: P(-1, -30),
    rumpf: -24,
    kopf: 20,
    armV: { ziel: P(-24, -40), hand: -60 },
    armH: { ziel: P(-14, -36), hand: -50 },
    beinV: { knoechel: P(13, -KNOECHEL), fuss: -20 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: -30 },
    greifer: 'zu',
    miene: 'wut',
  };
  // Steigen: gestreckt, Arme hoch, Füße hängen (Bild am Anker, die Höhe trägt die Logik)
  const steigen: Haltung = {
    huefte: P(0, -40),
    rumpf: 2,
    kopf: -6,
    armV: { ziel: P(4, -100), hand: 170 },
    armH: { ziel: P(16, -96), hand: 170 },
    beinV: { knoechel: P(4, -KNOECHEL), fuss: -50 },
    beinH: { knoechel: P(-6, -KNOECHEL + 1), fuss: -60 },
    greifer: 'offen',
    miene: 'wut',
  };
  // Flug: Knie angezogen, Arme weit, schwer am Scheitel
  const flug: Haltung = {
    huefte: P(0, -26),
    rumpf: -10,
    kopf: 10,
    armV: { ziel: P(-30, -70), hand: -130 },
    armH: { ziel: P(30, -72), hand: 130 },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: -10 },
    beinH: { knoechel: P(-6, -KNOECHEL - 2), fuss: -20 },
    greifer: 'offen',
    miene: 'wut',
  };
  // Presse: bäuchlings fallend, Arme ausgebreitet (Trefferbild: die Fläche liegt ±25 px um ihn)
  const presse: Haltung = {
    huefte: P(-6, -12),
    becken: -82,
    rumpf: -6,
    kopf: 30,
    armV: { ziel: P(34, -6), hand: 100 },
    armH: { ziel: P(28, -18), hand: 90 },
    beinV: { knoechel: P(-36, -16), fuss: -60 },
    beinH: { knoechel: P(-38, -10), fuss: -70 },
    greifer: 'offen',
    miene: 'wut',
  };
  // Aufprall: platt am Boden, Beine und Arme schlagen auf
  const aufprall: Haltung = {
    huefte: P(-8, -7),
    becken: -90,
    rumpf: 0,
    kopf: 34,
    armV: { ziel: P(36, -4), hand: 100 },
    armH: { ziel: P(26, -4), hand: 90 },
    beinV: { knoechel: P(-40, -KNOECHEL), fuss: -90 },
    beinH: { knoechel: P(-42, -KNOECHEL), fuss: -90 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  // Aufstehen: auf Arme und Knie gestemmt, dann geduckt
  const stemmen: Haltung = {
    huefte: P(-10, -22),
    becken: -10,
    rumpf: -62,
    kopf: 44,
    armV: { ziel: P(18, -4), hand: 0 },
    armH: { ziel: P(26, -4), hand: 0 },
    beinV: { knoechel: P(-4, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-28, -4), fuss: -80 },
    greifer: 'zu',
    miene: 'wut',
  };
  const geduckt: Haltung = {
    huefte: P(-3, -31),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(6, 26), hand: 10, schulter: true },
    armH: { ziel: P(8, 22), hand: 60, schulter: true },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-15, -KNOECHEL), fuss: 0 },
    miene: 'wut',
  };
  return [absprung, steigen, flug, presse, aufprall, stemmen, geduckt];
}

/** Index des Trefferbilds der Presse (Bahnframe KP_AKTIV_VON, gezählt ab A wie die Aktionsuhr). */
export function presseTrefferBild(): number {
  return bildBeiAbstand(PRESSE_DAUERN, KP_AKTIV_VON);
}

// ---------------------------------------------------------------------------
// Stoß RZ (Rückzug): 4 Bilder über 54 Frames (werte.ts RZ_DAUER), taumelnd;
// die Bewegung (3 px/Frame) liegt in den ersten 16 Frames (RZ_SCHNELL_FRAMES),
// darin Bild 0 und 1; danach wankt er auf der Stelle und fängt sich.
// ---------------------------------------------------------------------------

export const STOSS_DAUERN = [8, RZ_SCHNELL_FRAMES - 8, 18, RZ_DAUER - RZ_SCHNELL_FRAMES - 18] as const;

function stossRueckzug(): Haltung[] {
  const abstossen: Haltung = {
    huefte: P(-6, -38),
    rumpf: 20,
    kopf: -16,
    armV: { ziel: P(-24, -62), hand: -140 },
    armH: { ziel: P(22, -66), hand: 150 },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 18 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const stolpern: Haltung = {
    huefte: P(-8, -37),
    rumpf: 12,
    kopf: -8,
    armV: { ziel: P(-28, -48), hand: -80 },
    armH: { ziel: P(18, -56), hand: 130 },
    beinV: { knoechel: P(8, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-26, -14), fuss: 10 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const wanken: Haltung = {
    huefte: P(-3, -34),
    rumpf: -24,
    kopf: 30,
    armV: { ziel: P(10, 26), hand: 30, schulter: true },
    armH: { ziel: P(12, 22), hand: 70, schulter: true },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-16, -KNOECHEL), fuss: 0 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const fangen: Haltung = { ...zwischen(wanken, STAND, 0.6), kopf: -4, miene: 'wut', greifer: 'zu' };
  return [abstossen, stolpern, wanken, fangen];
}

// ---------------------------------------------------------------------------
// Getroffen: 3 Bilder ab h+1, h+10, h+22 (REAKTION_ANIMATION), 9 / 12 / 2 =
// 23 Frames (REAKTION_DAUER); Haltung nach rammbock_d_reaktionen.png
// Reihe 1 (E24), schwerer: der Kopf fliegt zurück, der Rumpf weniger.
// ---------------------------------------------------------------------------

export const GETROFFEN_DAUERN = [
  (REAKTION_ANIMATION[1] as number) - (REAKTION_ANIMATION[0] as number),
  (REAKTION_ANIMATION[2] as number) - (REAKTION_ANIMATION[1] as number),
  REAKTION_DAUER + (REAKTION_ANIMATION[0] as number) - (REAKTION_ANIMATION[2] as number),
] as const;

const GETROFFEN_STOSS: Haltung = {
  huefte: P(-3, -38.5),
  rumpf: 12,
  kopf: -20,
  armV: { ziel: P(-14, 20), hand: -40, schulter: true },
  armH: { ziel: P(16, -6), hand: 140, schulter: true },
  beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
  greifer: 'offen',
  miene: 'getroffen',
};

const GETROFFEN_KRUMM: Haltung = {
  ...GETROFFEN_STOSS,
  huefte: P(-2, -37),
  rumpf: -12,
  kopf: 10,
  armV: { ziel: P(6, 26), hand: 20, schulter: true },
  armH: { ziel: P(6, 22), hand: 80, schulter: true },
  greifer: 'zu',
};

function getroffen(): Haltung[] {
  return [GETROFFEN_STOSS, GETROFFEN_KRUMM, { ...zwischen(GETROFFEN_KRUMM, STAND), miene: 'ruhig' }];
}

// ---------------------------------------------------------------------------
// Umgeworfen (Bahn F1, wie der Zünder): Stillstand W+1 bis W+8, Steigen,
// Fallen bis W+46, Aufprall, Ruhe in W+55; Liegen; Aufstehen 6 × 3 Frames
// (AUFSTEHEN_GEGNER 18); Haltungen nach rammbock_d_reaktionen.png Reihen 2
// und 3 (E24), an die Masse angepasst (Arme schwer, Beine kürzer gehoben).
// ---------------------------------------------------------------------------

const F1_STEIGEN = 18;
export const UMGEWORFEN_DAUERN = [F1_STILLSTAND, F1_STEIGEN, F1_BODEN - F1_STILLSTAND - F1_STEIGEN - 1, 5, F1_RUHE - F1_BODEN - 5 + 1] as const;
export const AUFSTEHEN_DAUERN = [3, 3, 3, 3, 3, AUFSTEHEN_GEGNER - 15] as const;

export const LIEGEN: Haltung = {
  huefte: P(8, -7),
  becken: 90,
  rumpf: 0,
  kopf: -10,
  armV: { ziel: P(-4, -6), hand: 80 },
  armH: { ziel: P(-46, -5), hand: -90 },
  beinV: { knoechel: P(44, -KNOECHEL), fuss: 80 },
  beinH: { knoechel: P(41, -KNOECHEL + 1), fuss: 70 },
  greifer: 'offen',
  miene: 'getroffen',
};

function umgeworfen(): Haltung[] {
  const treffer: Haltung = {
    huefte: P(-4, -37),
    becken: 16,
    rumpf: 8,
    kopf: -22,
    armV: { ziel: P(-14, -14), hand: -150, schulter: true },
    armH: { ziel: P(16, -16), hand: 160, schulter: true },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 10 },
    beinH: { knoechel: P(-8, -KNOECHEL), fuss: 0 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const steigen: Haltung = {
    huefte: P(0, -26),
    becken: 48,
    rumpf: 8,
    kopf: -18,
    armV: { ziel: P(-6, -24), hand: 170, schulter: true },
    armH: { ziel: P(14, -22), hand: 170, schulter: true },
    beinV: { knoechel: P(26, -9), fuss: 50 },
    beinH: { knoechel: P(18, -3), fuss: 40 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const fallen: Haltung = {
    huefte: P(4, -16),
    becken: 80,
    rumpf: 6,
    kopf: -14,
    armV: { ziel: P(-14, -22), hand: -160, schulter: true },
    armH: { ziel: P(4, -26), hand: 180, schulter: true },
    beinV: { knoechel: P(40, -16), fuss: 85 },
    beinH: { knoechel: P(37, -8), fuss: 75 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const aufprall: Haltung = {
    huefte: P(6, -8),
    becken: 96,
    rumpf: 0,
    kopf: -4,
    armV: { ziel: P(-10, -26), hand: 160 },
    armH: { ziel: P(-40, -10), hand: -120 },
    beinV: { knoechel: P(32, -30), fuss: 120 },
    beinH: { knoechel: P(38, -20), fuss: 110 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  return [treffer, steigen, fallen, aufprall, LIEGEN];
}

function aufstehen(): Haltung[] {
  const heben: Haltung = { ...LIEGEN, huefte: P(6, -7), becken: 70, rumpf: -8, kopf: 6, miene: 'wut' };
  const sitzen: Haltung = {
    huefte: P(-6, -7),
    becken: 8,
    rumpf: -26,
    kopf: 14,
    armV: { ziel: P(-26, -4), hand: -10 },
    armH: { ziel: P(16, -26), hand: 60 },
    beinV: { knoechel: P(20, -KNOECHEL), fuss: 10 },
    beinH: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    miene: 'wut',
  };
  const knien: Haltung = {
    huefte: P(-4, -22),
    rumpf: -40,
    kopf: 30,
    armV: { ziel: P(14, -4), hand: 0 },
    armH: { ziel: P(12, -26), hand: 70 },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-24, -5), fuss: -70 },
    miene: 'wut',
  };
  const geduckt: Haltung = {
    huefte: P(-3, -31),
    rumpf: -28,
    kopf: 24,
    armV: { ziel: P(8, 25), hand: 10, schulter: true },
    armH: { ziel: P(8, 21), hand: 60, schulter: true },
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-15, -KNOECHEL), fuss: 0 },
    miene: 'wut',
  };
  return [heben, sitzen, knien, geduckt, zwischen(geduckt, STAND), zwischen(geduckt, STAND, 0.8)];
}

// ---------------------------------------------------------------------------
// Fall (Tod): 6 Bilder über die Bahn F4 (werte.ts F4_STILLSTAND, F4_BODEN,
// F4_RUHE): Erstarren t+1 und t+2, die Knie knicken ein, rücklings kippend,
// Aufschlag in t+40, Zusammensacken, liegt erschlafft ab t+49
// (Zusammenbrechen, Auftrag 4, 3).
// ---------------------------------------------------------------------------

export const FALL_DAUERN = [F4_STILLSTAND, F1_STEIGEN, F4_BODEN - F4_STILLSTAND - F1_STEIGEN - 1, 4, F4_RUHE - F4_BODEN - 4, 1] as const;

function fall(): Haltung[] {
  const erstarren: Haltung = {
    huefte: P(-2, -39),
    rumpf: 6,
    kopf: -26,
    armV: { ziel: P(-18, 18), hand: -30, schulter: true },
    armH: { ziel: P(18, 12), hand: 90, schulter: true },
    beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-13, -KNOECHEL), fuss: 0 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const knicken: Haltung = {
    huefte: P(-6, -28),
    becken: 30,
    rumpf: 6,
    kopf: -20,
    armV: { ziel: P(-10, -22), hand: 160, schulter: true },
    armH: { ziel: P(14, -20), hand: 170, schulter: true },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 20 },
    beinH: { knoechel: P(-2, -KNOECHEL), fuss: 10 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const kippen: Haltung = {
    huefte: P(2, -16),
    becken: 72,
    rumpf: 4,
    kopf: -16,
    armV: { ziel: P(-16, -20), hand: -160, schulter: true },
    armH: { ziel: P(6, -26), hand: 180, schulter: true },
    beinV: { knoechel: P(30, -24), fuss: 70 },
    beinH: { knoechel: P(30, -14), fuss: 60 },
    greifer: 'offen',
    miene: 'getroffen',
  };
  const aufschlag: Haltung = { ...umgeworfen()[3] as Haltung, beinV: { knoechel: P(30, -34), fuss: 130 }, beinH: { knoechel: P(36, -24), fuss: 120 } };
  const sacken: Haltung = { ...LIEGEN, beinV: { knoechel: P(42, -12), fuss: 90 }, beinH: { knoechel: P(40, -6), fuss: 80 }, armV: { ziel: P(-8, -14), hand: 120 } };
  const schlaff: Haltung = { ...LIEGEN, kopf: -24, armV: { ziel: P(4, -5), hand: 90 }, armH: { ziel: P(-44, -4), hand: -100 }, miene: 'getroffen' };
  return [erstarren, knicken, kippen, aufschlag, sacken, schlaff];
}

// ---------------------------------------------------------------------------
// Auftritt: 4 Bilder zu 15 Frames = 60 (werte.ts AUFTRITT_BOSS): bricht aus
// der Asservatenkammer (die Kisten zerbrechen beim Weckreiz; Trümmer zeichnet
// G4), richtet sich auf, brüllt mit leuchtender Brille, stampft in den Stand.
// ---------------------------------------------------------------------------

export const AUFTRITT_DAUERN = [15, 15, 15, AUFTRITT_BOSS - 45] as const;

function auftritt(): Haltung[] {
  const durchbruch: Haltung = {
    huefte: P(-2, -31),
    rumpf: -30,
    kopf: 26,
    armV: { ziel: P(34, -58), hand: 110 },
    armH: { ziel: P(14, -34), hand: 100 },
    beinV: { knoechel: P(16, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-16, -KNOECHEL), fuss: -20 },
    greifer: 'offen',
    miene: 'wut',
  };
  const aufrichten: Haltung = {
    huefte: P(-1, -37),
    rumpf: -6,
    kopf: 4,
    armV: { ziel: P(12, -90), hand: 160 },
    armH: { ziel: P(16, -44), hand: 140 },
    beinV: { knoechel: P(13, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-14, -KNOECHEL), fuss: 0 },
    greifer: 'zu',
    miene: 'wut',
  };
  const bruellen: Haltung = {
    huefte: P(-2, -38),
    rumpf: 10,
    kopf: -18,
    armV: { ziel: P(-26, -88), hand: -160 },
    armH: { ziel: P(30, -84), hand: 160 },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-15, -KNOECHEL), fuss: 0 },
    greifer: 'offen',
    glut: true,
    miene: 'wut',
  };
  const stampfen: Haltung = { ...STAND, huefte: P(-1, -37), rumpf: -12, kopf: 12, beinV: { knoechel: P(13, -KNOECHEL), fuss: 0 }, miene: 'wut' };
  return [durchbruch, aufrichten, bruellen, stampfen];
}

// ---------------------------------------------------------------------------
// Taumeln nach dem Spezialangriff (78 Frames, werte.ts BOSS_TAUMELN_DAUER):
// gewollte Wiederholung aus getroffen und stoss_rueckzug (Festlegung G3-8):
// Stillstand h+1 bis h+8 im Trefferbild, dann rückwärts stolpern, wanken,
// fangen.
// ---------------------------------------------------------------------------

export const TAUMELN_DAUERN = [F1_STILLSTAND, 20, 30, BOSS_TAUMELN_DAUER - F1_STILLSTAND - 50] as const;

function taumeln(): Haltung[] {
  const s = stossRueckzug();
  return [GETROFFEN_STOSS, s[1] as Haltung, s[2] as Haltung, s[3] as Haltung];
}

/** Gehalten (Kampf 8): gekrümmt im Griff der Figur. */
function gehalten(): Haltung[] {
  return [{ ...GETROFFEN_KRUMM, huefte: P(-2, -36), rumpf: -18, kopf: 18 }];
}

// ===========================================================================
// Animationen
// ===========================================================================

function animation(name: string, haltungen: readonly Haltung[], dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation {
  if (haltungen.length !== dauern.length) throw new Error(`Ballast ${name}: ${haltungen.length} Haltungen, ${dauern.length} Dauern`);
  const bilder = haltungen.map((h, i) => bild(h, dauern[i] as number));
  return aktiv !== undefined ? { name, schleife, bilder, aktiv } : { name, schleife, bilder };
}

/** Trefferbilder des Armschwungs: je Schwung das Bild der aktiven Frames (5(k−1) + 2). */
export function armschwungAktiv(): number[] {
  const t = schwungTrefferBild();
  return Array.from({ length: AS_SCHWUENGE_MAX }, (_, k) => k * SCHWUNG_BILDER + t);
}

/** Alle Animationen des Ballast (Auftrag 4, 3; Zuordnung in docs/grafik.md 4.6). */
export function ballastAnimationen(): Animation[] {
  if (summe(ANKUENDIGUNG_DAUERN) < KP_HOCKE) throw new Error('Ballast: Ankündigung unter 15 Frames');
  if (summe(STOSS_DAUERN) !== RZ_DAUER) throw new Error('Ballast: Stoß nicht 54 Frames');
  if (summe(AUFTRITT_DAUERN) !== AUFTRITT_BOSS) throw new Error('Ballast: Auftritt nicht 60 Frames');
  if (summe(TAUMELN_DAUERN) !== BOSS_TAUMELN_DAUER) throw new Error('Ballast: Taumeln nicht 78 Frames');
  if (summe(SCHWUNG_DAUERN) !== AS_NAECHSTER) throw new Error('Ballast: Schwung nicht 36 Frames');
  const geh = gehen();
  const schwungDauern = [...SCHWUNG_DAUERN, ...SCHWUNG_DAUERN, ...SCHWUNG_DAUERN];
  return [
    animation('stand', stand(), STAND_DAUERN, true),
    animation('gehen', geh, new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true),
    animation('ankuendigung', ankuendigung(), ANKUENDIGUNG_DAUERN, true),
    animation('armschwung', armschwung(), schwungDauern, false, armschwungAktiv()),
    animation('ansturm', ansturm(), new Array<number>(4).fill(ANSTURM_DAUER), true, [0, 1, 2, 3]),
    animation('ansturm_bremsen', ansturmBremsen(), [AN_NACHLAUF], false),
    animation('koerperpresse', koerperpresse(), PRESSE_DAUERN, false, [presseTrefferBild()]),
    animation('stoss_rueckzug', stossRueckzug(), STOSS_DAUERN, false),
    animation('getroffen', getroffen(), GETROFFEN_DAUERN, false),
    animation('umgeworfen', umgeworfen(), UMGEWORFEN_DAUERN, false),
    animation('liegen', [LIEGEN], [0], true),
    animation('aufstehen', aufstehen(), AUFSTEHEN_DAUERN, false),
    animation('fall', fall(), FALL_DAUERN, false),
    animation('auftritt', auftritt(), AUFTRITT_DAUERN, false),
    animation('taumeln', taumeln(), TAUMELN_DAUERN, false),
    animation('gehalten', gehalten(), [0], true),
  ];
}

/** Ballast als Gliederpuppe für bauen.ts. */
export function ballastFiguren(): Figur[] {
  return [
    {
      name: 'ballast',
      umriss: UMRISS_GEGNER.Ballast,
      animationen: ballastAnimationen(),
      glanz: GLANZ_BALLAST,
      budget: FARBBUDGET.figur,
      gehen: 'gehen',
      schritt: GEHEN_SCHRITT,
    },
  ];
}
