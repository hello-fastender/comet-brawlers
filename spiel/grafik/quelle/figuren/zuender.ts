// Zünder, Hafenwächter, als Gliederpuppe (Auftrag 4, Phase 2, G3; Auftrag 4,
// Abschnitte 3 und 4). Aussehen: mittelgroß, dunkelblaue Uniform mit
// Abzeichen und Koppel, Helm aus Stahl mit orangem Visier (leuchtet beim
// Zielen), grünes Raketenwerferrohr auf der Schulter; beim Zielen liegt das
// Rohr waagrecht, der Kopf neigt sich zur Figur. Unter dem Helm eine dunkle
// Haube (kein Hautton, Farbbudget, docs/grafik.md 4.5).
//
// Ansicht wie der Rammbock (E24): Rumpf halb von vorn, die nahe Schulter
// links der Mitte, die ferne rechts. Das Rohr liegt auf der fernen Schulter
// hinter dem Kopf, damit Visier und Helm frei bleiben; die nahe Hand hält
// den vorderen Griff vor der Brust, die ferne den hinteren (Festlegung G3-1).
//
// Maße in Spielpixeln. Herkunft: Umriss 64 × 72 mit Schatten
// (src/darstellung/masse.ts, UMRISS_GEGNER.Zünder), Körper im Stand
// höchstens 72 − SCHATTEN_HOEHE / 2 = 67 px hoch (docs/grafik.md 1.1, 2.5);
// Proportionen nach Auftrag 4, 1.1 (Kopf etwa 1/5 der Körperhöhe, große
// Hände und Füße); Raketenwerfer etwa 30 × 10 (Auftrag 4, 4, Tabelle der
// Gegenstände). Zeiten aus src/kern/werte.ts (ZUENDER_GEHEN_X, ZIELEN_DAUER,
// SCHUSS_DAUER, ZR_RAKETE_AB, NAH_ANGRIFFE.BA als Kolbenhieb,
// REAKTION_ANIMATION, F1_…, F4_…, AUFSTEHEN_GEGNER) und
// docs/design-gegner-stages.md 9; Festlegungen in docs/grafik.md 4.5 und
// Abschnitt 7 (G3-…).

import type { Animation, Bild } from '../blatt.ts';
import type { Figur } from '../bauen.ts';
import type { Form, Punkt } from '../geometrie.ts';
import { drehe } from '../geometrie.ts';
import type { Leinwand, Pixel } from '../leinwand.ts';
import { deckend } from '../leinwand.ts';
import { NACHBARN_8, streupixelEntfernen } from '../kontur.ts';
import { FARBBUDGET, KONTUR, LEDER, ROHR_GRUEN, STAHL, UNIFORM_ZUENDER, VISIER_ORANGE } from '../palette.ts';
import type { Gerastert, Gesicht, Lage, Pose, Stil, TeilDef, Toene } from '../puppe.ts';
import { Puppe } from '../puppe.ts';
import { UMRISS_GEGNER } from '../../../src/darstellung/masse.ts';
import {
  AUFSTEHEN_GEGNER,
  F1_BODEN,
  F1_RUHE,
  F1_STILLSTAND,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  NAH_ANGRIFFE,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  SCHUSS_DAUER,
  ZIELEN_DAUER,
  ZR_RAKETE_AB,
  ZUENDER_GEHEN_X,
  ZUENDER_SCHNELL_X,
} from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';

// ===========================================================================
// Maße
// ===========================================================================

/** Sohle bis Knöchel (Stiefel wie Vela, 5 px). */
const KNOECHEL = 5;
/** Hüfte bis Knie und Knie bis Knöchel (Beinlänge 27 + 5 = 32; Hüfte im Stand bei −31, Körper 67 px hoch). */
const SCHENKEL = 13.5;
const SCHIENBEIN = 13.5;
/** Schulter bis Ellbogen, Ellbogen bis Handgelenk (Vela 11 und 9; der Griff liegt nah an der Schulter). */
const OBERARM = 10;
const UNTERARM = 9;
/** Radien der Arme (Uniformärmel, etwas kräftiger als Vela 3,4 / 3 / 2,6). */
const OBERARM_R = [3.4, 3.0] as const;
const UNTERARM_R = [3.0, 2.6] as const;
/** Radien der Beine an Hüfte, Knie und Knöchel (Uniformhose; zwischen Vela 5 / 4,2 / 3,4 und dem Rammbock). */
const SCHENKEL_R = [4.8, 4.1] as const;
const SCHIENBEIN_R = [4.1, 3.4] as const;
/** Hüftgelenke links und rechts der Beckenmitte (wie Vela). */
const HUEFTE_SEITE = 2.5;
/** Schultergelenke im Rumpf (Ansicht wie der Rammbock, G0c-1, schmaler: Abstand 9 statt 13 px), Höhe über der Taille. */
const SCHULTER_V_X = -3;
const SCHULTER_H_X = 6;
const SCHULTER_HOEHE = 15;
/** Taille über dem Beckengelenk (wie Vela). */
const TAILLE = 2;
/** Nacken über der Taille (Kopfgelenk). */
const NACKEN = 18.5;

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
const minus = (a: Punkt, b: Punkt): Punkt => P(a.x - b.x, a.y - b.y);

/**
 * Zeichenreihenfolge (Auftrag 4, 2.4): ferner Arm, fernes Bein, nahes Bein,
 * Becken, Rumpf mit Gurt, Abzeichen und Koppel, dann das Rohr auf der fernen
 * Schulter mit der fernen Hand (vor dem Rücken, hinter Kopf und Kragen,
 * damit Heck und Mündung neben dem Kopf sichtbar sind), Kragen, Kopf,
 * Visier, Helm, naher Arm. Beim Kolbenhieb liegt das Rohr vorn (Pose).
 */
const EBENE = {
  armH: 10,
  beinH: 20,
  stiefelH: 21,
  beinV: 26,
  stiefelV: 27,
  becken: 29,
  rumpf: 30,
  gurt: 31,
  abzeichen: 32,
  koppel: 33,
  schnalle: 33.5,
  flamme: 33.6,
  handH: 33.8,
  rohr: 34,
  rohrMetall: 34.5,
  kragen: 35,
  kopf: 36,
  visier: 37,
  helm: 38,
  armV: 50,
  handV: 51,
  /** Rohr vor dem Körper (Kolbenhieb). */
  rohrVorn: 45,
  rohrMetallVorn: 46,
} as const;

/** Stiefel im Rahmen des Knöchels (Rammbock-Stiefel 0,9-fach, gut 14 lang wie Vela). */
const STIEFEL = polygon([-4.4, -4.6], [4, -4.6], [4.6, -1], [7.4, -0.2], [9.6, 1.4], [10, KNOECHEL], [-4.8, KNOECHEL], [-5.2, 1]);
const SOHLE = P(2.6, KNOECHEL);
const FERSE = P(-4.8, KNOECHEL);
const SPITZE = P(10, KNOECHEL);

/** Handschuh im Rahmen des Handgelenks (große Hände, Auftrag 4, 1.1; Velas Handschuh 9,2 × 10). */
const HANDSCHUH: Form[] = [ellipse(0, 2.6, 3.1, 3.5)];

function arm(seite: 'V' | 'H', x: number, ebeneArm: number, ebeneHand: number): TeilDef[] {
  return [
    {
      name: `Oberarm${seite}`,
      eltern: 'Rumpf',
      gelenk: P(x, -SCHULTER_HOEHE),
      formen: [kapsel(0, 0, 0, OBERARM, OBERARM_R[0], OBERARM_R[1])],
      material: 'UNIFORM',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    {
      name: `Unterarm${seite}`,
      eltern: `Oberarm${seite}`,
      gelenk: P(0, OBERARM),
      formen: [kapsel(0, 0, 0, UNTERARM, UNTERARM_R[0], UNTERARM_R[1])],
      material: 'UNIFORM',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    {
      name: `Hand${seite}`,
      eltern: `Unterarm${seite}`,
      gelenk: P(0, UNTERARM),
      formen: HANDSCHUH,
      material: 'LEDER',
      gruppe: `hand${seite}`,
      ebene: ebeneHand,
    },
  ];
}

function bein(seite: 'V' | 'H', x: number, ebeneBein: number, ebeneStiefel: number): TeilDef[] {
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
      name: `Stiefel${seite}`,
      eltern: `Unterschenkel${seite}`,
      gelenk: P(0, SCHIENBEIN),
      formen: [STIEFEL],
      material: 'LEDER',
      gruppe: `stiefel${seite}`,
      ebene: ebeneStiefel,
      sohle: SOHLE,
    },
  ];
}

/** Uniformjacke im Rahmen der Taille, halb von vorn: Schultern ±9,6, Taille ±7,5, Saum 3 px unter der Taille. */
const RUMPF = polygon(
  [-7.4, 3],
  [7.6, 3],
  [8.4, -2],
  [9, -7],
  [9.6, -12],
  [9, -15.6],
  [6.8, -17.8],
  [2.6, -18.6],
  [-2.4, -18.6],
  [-7, -17.6],
  [-9.6, -15],
  [-9.4, -8],
  [-8.2, -3],
);
/** Schultergurt der Koppel von der nahen Schulter zur fernen Hüfte (2 px breit, nur auf der Jacke). */
const GURT = polygon([-7.6, -17.8], [-5.2, -18.4], [7.8, 1.6], [5.6, 2.4]);
/** Abzeichen auf der Brust (Schild 3 × 4, rechts vom Gurt). */
const ABZEICHEN = polygon([3.2, -13.6], [6.4, -13.6], [6.4, -10.8], [4.8, -9.4], [3.2, -10.8]);
/** Koppel über dem Bund (Rahmen des Beckens) und Schnalle aus Stahl. */
const KOPPEL = polygon([-8.2, -3.6], [8.6, -3.6], [8.8, -1], [-8.4, -1]);
const SCHNALLE = polygon([1.4, -4], [4.2, -4], [4.2, -0.6], [1.4, -0.6]);
/** Hoher Uniformkragen am Nacken. */
const KRAGEN = kapsel(-3.6, -18.2, 4.2, -18.8, 2.2);

/** Kopf mit Haube (Rahmen des Kopfgelenks am Nacken): Hals und Schädel. */
const KOPF: Form[] = [kapsel(0, 0, 0.6, -3, 2.6), ellipse(1.6, -7.6, 4.8, 5.4)];
/**
 * Helm: Kuppel über Schädel und Hinterkopf mit Nackenschutz und Seitenteil bis
 * zur Kieferlinie, vorn ein Schirm über dem Visier (Auftrag 4, 2.4: Zünder mit
 * Helm und Visier).
 */
const HELM = polygon(
  [-5.4, -3.4],
  [-6.2, -7.6],
  [-5.2, -11.6],
  [-1.8, -13.6],
  [2.2, -13.7],
  [5.4, -12.2],
  [7.2, -10.2],
  [8.0, -8.9],
  [6.4, -8.5],
  [2.4, -9.1],
  [0.4, -8.2],
  [-0.4, -5.6],
  [-1.4, -3.2],
);
/** Visier: gewölbte Scheibe vor dem Gesicht vom Helmschirm bis unter das Kinn. */
const VISIER = polygon([1.6, -9.0], [6.8, -8.8], [7.5, -6.8], [7.3, -4.0], [6.1, -1.8], [2.6, -1.5], [1.1, -3.4]);

/**
 * Raketenwerfer im eigenen Rahmen: Achse entlang +y (Mündung bei +y), oben
 * ist +x (bei waagrechtem Rohr zeigt +x nach oben, Geometrie der Puppe).
 * Form und Farben wie der Gegenstand von G4 (docs/grafik.md 4.7, G4-16;
 * Werte dort in Objektkoordinaten x, y mit der Rohrachse bei y = −4,5),
 * getragen aber 1,2-fach (Festlegung G3-4: auf der Schulter hinter Kopf und
 * Hand bliebe vom 4 px dicken Rohr zu wenig für die Silhouette): Rohr 5 px
 * dick von −14,4 bis 13,2, Mündungsring bis 16,2 (7 px hoch), Heckrand bis
 * −17,4, Zielfernrohr 0 bis 7,8 über dem Rohr, Griff schräg nach hinten,
 * Schulterpolster unter dem hinteren Rohr.
 */
const WERFER_MASS = 1.2;
const w = (x: number, y: number): [number, number] => [x * WERFER_MASS, y * WERFER_MASS];
const ROHR_ACHSE = kapsel(0, -12 * WERFER_MASS, 0, 11 * WERFER_MASS, 2.2 * WERFER_MASS);
const ROHR_HECK = polygon(w(-2.4, -14.5), w(2.4, -14.5), w(2.4, -12.5), w(-2.4, -12.5));
const ROHR_MUENDUNG = polygon(w(-3, 11.5), w(3, 11.5), w(3, 13.5), w(-3, 13.5));
const ROHR_FERNROHR = polygon(w(2.1, -0.5), w(4.2, -0.5), w(4.2, 6.5), w(2.1, 6.5));
const ROHR_GRIFF: Form[] = [polygon(w(-2.1, -2.5), w(-2.1, -0.5), w(-4.2, -2.6), w(-4.2, -4.6)), polygon(w(-2.1, -11), w(-3.1, -11), w(-3.1, -6.5), w(-2.1, -6.5))];
/** Rückstrahl beim Schuss (hinter dem Heckrand): klein in der Zündung, groß im Rückstoß. */
const FLAMME_AUSSEN = {
  klein: [polygon([-3.4, -17.4], [3.4, -17.4], [4.4, -21.4], [0, -24.4], [-4.4, -21.4])],
  gross: [polygon([-3.6, -17.4], [3.6, -17.4], [7, -23.4], [3, -28.4], [0, -32.4], [-3, -28.4], [-7, -23.4])],
};
const FLAMME_KERN = {
  klein: [polygon([-1.8, -17.4], [1.8, -17.4], [2.2, -20.4], [-2.2, -20.4])],
  gross: [polygon([-2.2, -17.4], [2.2, -17.4], [4, -22.4], [0, -26.4], [-4, -22.4])],
};
/**
 * Mündungsfeuer vor dem Ring: Die Rakete erscheint erst 45 px vor dem Zünder
 * (werte.ts ZR_RAKETE_X), die Mündung liegt beim Zielen etwa 24 px vor ihm;
 * das Feuer überbrückt die Lücke (Festlegung G3-3).
 */
const MUENDUNG_AUSSEN = {
  klein: [polygon([-3.4, 16.2], [3.4, 16.2], [5, 19.7], [0, 23.7], [-5, 19.7])],
  gross: [polygon([-3.6, 16.2], [3.6, 16.2], [7, 20.7], [5, 26.7], [0, 32.7], [-5, 26.7], [-7, 20.7])],
};
const MUENDUNG_KERN = {
  klein: [polygon([-2, 16.2], [2, 16.2], [2.6, 19.2], [-2.6, 19.2])],
  gross: [polygon([-2.4, 16.2], [2.4, 16.2], [4, 20.7], [0, 26.7], [-4, 20.7])],
};

/** Lage des Rohrs auf der fernen Schulter: Achse 5 px über dem Schultergelenk (Rahmen des Rumpfs). */
const ROHR_AUFLAGE = P(0, -5);
/** Handgelenke im Rahmen des Rohrs: hinten am Griff (Griffpunkt von G4 bei −3, 1,2-fach), vorn um das Rohr. */
const GRIFF_HINTEN = P(-1.8, -3.6);
const GRIFF_VORN = P(-1.8, 7.2);
/** Teile des Raketenwerfers (ab dem Tod versteckt: die Waffe liegt als Gegenstand am Boden, G4). */
const ROHR_TEILE = ['Rohr', 'RohrHeck', 'RohrMuendung', 'RohrFernrohr', 'RohrGriff', 'FlammeAussen', 'FlammeKern', 'FeuerAussen', 'FeuerKern'] as const;
const FEUER_TEILE = ['FlammeAussen', 'FlammeKern', 'FeuerAussen', 'FeuerKern'] as const;

const TEILE: TeilDef[] = [
  { name: 'Becken', eltern: null, gelenk: P(0, 0), formen: [kapsel(-3, 0, 3, 0, 4.8)], material: 'HOSE', gruppe: 'becken', ebene: EBENE.becken },
  { name: 'Koppel', eltern: 'Becken', gelenk: P(0, 0), formen: [KOPPEL], material: 'LEDER', gruppe: 'koppel', ebene: EBENE.koppel, kissen: 1 },
  { name: 'Schnalle', eltern: 'Becken', gelenk: P(0, 0), formen: [SCHNALLE], material: 'METALL', gruppe: 'koppel', ebene: EBENE.schnalle, glanz: true, kissen: 1 },
  { name: 'Rumpf', eltern: 'Becken', gelenk: P(0, -TAILLE), formen: [RUMPF], material: 'UNIFORM', gruppe: 'rumpf', ebene: EBENE.rumpf, kissen: 3 },
  { name: 'Gurt', eltern: 'Rumpf', gelenk: P(0, 0), formen: [GURT], material: 'LEDER', gruppe: 'gurt', ebene: EBENE.gurt, auf: 'Rumpf' },
  { name: 'Abzeichen', eltern: 'Rumpf', gelenk: P(0, 0), formen: [ABZEICHEN], material: 'ABZEICHEN', gruppe: 'abzeichen', ebene: EBENE.abzeichen, flach: true, auf: 'Rumpf' },
  { name: 'Kragen', eltern: 'Rumpf', gelenk: P(0, 0), formen: [KRAGEN], material: 'UNIFORM', gruppe: 'kragen', ebene: EBENE.kragen },
  { name: 'Kopf', eltern: 'Rumpf', gelenk: P(1.5, -NACKEN), formen: KOPF, material: 'HAUBE', gruppe: 'kopf', ebene: EBENE.kopf, relief: 0.45 },
  { name: 'Visier', eltern: 'Kopf', gelenk: P(0, 0), formen: [VISIER], material: 'VISIER', gruppe: 'visier', ebene: EBENE.visier, glanz: true, kissen: 2 },
  { name: 'Helm', eltern: 'Kopf', gelenk: P(0, 0), formen: [HELM], material: 'HELM', gruppe: 'helm', ebene: EBENE.helm, glanz: true, kissen: 2.5 },
  ...arm('H', SCHULTER_H_X, EBENE.armH, EBENE.handH),
  { name: 'Rohr', eltern: 'Rumpf', gelenk: P(0, 0), formen: [ROHR_ACHSE], material: 'ROHR', gruppe: 'rohr', ebene: EBENE.rohr },
  { name: 'RohrHeck', eltern: 'Rohr', gelenk: P(0, 0), formen: [ROHR_HECK], material: 'METALL', gruppe: 'rohrMetall', ebene: EBENE.rohrMetall, glanz: true, kissen: 1 },
  { name: 'RohrMuendung', eltern: 'Rohr', gelenk: P(0, 0), formen: [ROHR_MUENDUNG], material: 'METALL', gruppe: 'rohrMetall', ebene: EBENE.rohrMetall, glanz: true, kissen: 1 },
  { name: 'RohrFernrohr', eltern: 'Rohr', gelenk: P(0, 0), formen: [ROHR_FERNROHR], material: 'METALL', gruppe: 'rohrMetall', ebene: EBENE.rohrMetall, glanz: true, kissen: 1 },
  { name: 'RohrGriff', eltern: 'Rohr', gelenk: P(0, 0), formen: ROHR_GRIFF, material: 'METALL', gruppe: 'griff', ebene: EBENE.rohr - 0.5, kissen: 1 },
  {
    name: 'FlammeAussen',
    eltern: 'Rohr',
    gelenk: P(0, 0),
    formen: FLAMME_AUSSEN.klein,
    varianten: FLAMME_AUSSEN,
    material: 'FLAMME_AUSSEN',
    gruppe: 'flamme',
    ebene: EBENE.flamme,
    flach: true,
  },
  {
    name: 'FlammeKern',
    eltern: 'Rohr',
    gelenk: P(0, 0),
    formen: FLAMME_KERN.klein,
    varianten: FLAMME_KERN,
    material: 'FLAMME_KERN',
    gruppe: 'flamme',
    ebene: EBENE.flamme + 0.1,
    flach: true,
  },
  {
    name: 'FeuerAussen',
    eltern: 'Rohr',
    gelenk: P(0, 0),
    formen: MUENDUNG_AUSSEN.klein,
    varianten: MUENDUNG_AUSSEN,
    material: 'FLAMME_AUSSEN',
    gruppe: 'flamme',
    ebene: EBENE.armV + 2,
    flach: true,
  },
  {
    name: 'FeuerKern',
    eltern: 'Rohr',
    gelenk: P(0, 0),
    formen: MUENDUNG_KERN.klein,
    varianten: MUENDUNG_KERN,
    material: 'FLAMME_KERN',
    gruppe: 'flamme',
    ebene: EBENE.armV + 2.1,
    flach: true,
  },
  ...bein('H', -HUEFTE_SEITE, EBENE.beinH, EBENE.stiefelH),
  ...bein('V', HUEFTE_SEITE, EBENE.beinV, EBENE.stiefelV),
  ...arm('V', SCHULTER_V_X, EBENE.armV, EBENE.handV),
];

export const PUPPE_ZUENDER = new Puppe(TEILE);

// ===========================================================================
// Farben: Tonabbildung (Farbbudget 16, docs/grafik.md 1.2 und 4.5)
// ===========================================================================

const U = UNIFORM_ZUENDER.treppe;
const S = STAHL.treppe;
const V = VISIER_ORANGE.treppe;
const R = ROHR_GRUEN.treppe;
const L = LEDER.treppe;

/** Visier ohne Leuchten: Grund im Ton 1 (tiefes Orange), Licht Ton 2, Glanz Ton 4. */
const VISIER_NORMAL: Toene = [V[1], V[1], V[1], V[2], V[4]];
/** Visier leuchtend beim Zielen (Auftrag 4, 4): Fläche im Glanzton 4, Rand im Grundton 2. */
const VISIER_GLUT: Toene = [V[2], V[2], V[4], V[4], V[4]];

/**
 * 15 Farben plus durchsichtig: KONTUR, Uniform 1 bis 3, Stahl 1 bis 4, Visier
 * 1, 2 und 4, Rohr 1 bis 3, Leder 2. Haube, Hose und Stiefel teilen die
 * Uniformtreppe; Leder hat nur seinen Grundton mit Uniform 1 als Schatten;
 * Abzeichen und Rückstrahl nehmen die Visiertöne (docs/grafik.md 4.5).
 */
const ZUTEILUNG: Readonly<Record<string, Toene>> = {
  UNIFORM: [KONTUR, U[1], U[2], U[3], U[3]],
  HOSE: [KONTUR, U[1], U[2], U[2], U[2]],
  HAUBE: [KONTUR, U[1], U[1], U[2], U[2]],
  HELM: [S[1], S[1], S[2], S[3], S[4]],
  METALL: [S[1], S[1], S[2], S[3], S[4]],
  VISIER: VISIER_NORMAL,
  ROHR: [R[1], R[1], R[2], R[3], R[3]],
  LEDER: [KONTUR, U[1], L[2], L[2], L[2]],
  ABZEICHEN: [V[2], V[2], V[2], V[2], V[2]],
  FLAMME_AUSSEN: [V[2], V[2], V[2], V[2], V[2]],
  FLAMME_KERN: [V[4], V[4], V[4], V[4], V[4]],
};

/** Glanzfarben (dürfen allein stehen, Regel 1.3): Stahl 4 und Visier 4. */
export const GLANZ_ZUENDER: ReadonlySet<Pixel> = new Set<Pixel>([S[4], V[4]]);

const STIL: Stil = { zuteilung: ZUTEILUNG, kontur: KONTUR, glanz: GLANZ_ZUENDER };
const STIL_GLUT: Stil = { ...STIL, zuteilung: { ...ZUTEILUNG, VISIER: VISIER_GLUT } };

/**
 * Abtastlinie im leuchtenden Visier (Maske 7 × 1 auf dem Visier, Auftrag 4, 6:
 * Gesichtsmasken bis 8 × 8): wandert beim Zielen über die Scheibe.
 */
function abtastLinie(zeile: number): Gesicht {
  return { teil: 'Visier', ursprung: P(1, -9 + zeile), zeilen: ['sssssss'], farben: { s: V[2] as Pixel } };
}

// ===========================================================================
// Haltungen
// ===========================================================================

/** Arm: Ziel des Handgelenks (Figurkoordinaten oder relativ zur Schulter), Weltwinkel der Hand. */
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

/** Lage des Raketenwerfers: Weltwinkel der Mündung (Puppe: 0 unten, 90 waagrecht nach vorn, 180 oben) und Punkt der Achse (Auflage auf der fernen Schulter oder Figurkoordinaten). */
interface Rohr {
  readonly winkel: number;
  /** Punkt der Rohrachse über dem Griff hinten (Rahmen-Ursprung des Rohrs); mit schulter: Versatz zur Auflage im Rahmen des Rumpfs. */
  readonly punkt?: Punkt;
  readonly schulter?: boolean;
}

/** Haltung: Eingaben, aus denen die Pose berechnet wird. */
export interface Haltung {
  readonly huefte: Punkt;
  /** Becken absolut (positiv: Oberkörper nach hinten gekippt, 90 = rücklings liegend). */
  readonly becken?: number;
  /** Rumpf relativ zum Becken (negativ: nach vorn geneigt). */
  readonly rumpf: number;
  /** Kopf relativ zum Rumpf (positiv: zum Boden vorn geneigt). */
  readonly kopf: number;
  /** Arme: 'griff' hält den Raketenwerfer (nahe Hand vorn, ferne Hand hinten), sonst freies Ziel. */
  readonly armV: Arm | 'griff';
  readonly armH: Arm | 'griff';
  readonly beinV: Bein;
  readonly beinH: Bein;
  /** Raketenwerfer; fehlt: nicht gezeichnet (ab dem Tod, Waffe liegt als Gegenstand). */
  readonly rohr?: Rohr;
  /** Visier leuchtet (Zielen) und Zeile der Abtastlinie (fehlt: keine Linie). */
  readonly glut?: boolean;
  readonly abtast?: number;
  /** Rückstrahl hinter dem Rohr und Mündungsfeuer vorn (Schuss). */
  readonly flamme?: 'klein' | 'gross';
  /** Rohr vor dem Körper (Kolbenhieb). */
  readonly rohrVorn?: boolean;
  readonly versatz?: Pose['versatz'];
  readonly ebenen?: Pose['ebenen'];
}

const KNIE: 1 = 1;
const ELLBOGEN: -1 = -1;

/** Rechnet eine Haltung in eine Pose um (Beine über zwei Gelenke, Rohr, Arme an die Griffe oder frei). */
export function pose(h: Haltung): Pose {
  const pu = PUPPE_ZUENDER;
  const versatz: Record<string, Punkt> = { ...(h.versatz ?? {}) };
  const ebenen: Record<string, number> = { ...(h.ebenen ?? {}) };
  const versteckt: string[] = [];
  const formen: Record<string, string> = {};
  let p: Pose = { wurzel: h.huefte, winkel: { Becken: h.becken ?? 0, Rumpf: h.rumpf, Kopf: h.kopf }, versatz, ebenen, versteckt, formen };
  const mit = (w: Record<string, number>): void => {
    p = { ...p, winkel: { ...p.winkel, ...w } };
  };
  for (const s of ['V', 'H'] as const) {
    const b = s === 'V' ? h.beinV : h.beinH;
    mit(pu.zweiGelenke(p, `Oberschenkel${s}`, `Unterschenkel${s}`, `Stiefel${s}`, b.knoechel, KNIE));
    mit(pu.weltWinkel(p, `Stiefel${s}`, b.fuss));
  }
  // Raketenwerfer: Ursprung und Weltwinkel über Versatz und Winkel relativ zum Rumpf
  let rohrLage: Lage | null = null;
  const lagen = pu.lagen(p);
  const rumpf = lagen.get('Rumpf') as Lage;
  if (h.rohr !== undefined) {
    const sch = (lagen.get('OberarmH') as Lage).pos;
    const punkt = h.rohr.schulter === true ? plus(sch, drehe(plus(ROHR_AUFLAGE, h.rohr.punkt ?? P(0, 0)), rumpf.winkel)) : (h.rohr.punkt ?? P(0, 0));
    versatz['Rohr'] = drehe(minus(punkt, rumpf.pos), -rumpf.winkel);
    mit({ Rohr: h.rohr.winkel - rumpf.winkel });
    rohrLage = { pos: punkt, winkel: h.rohr.winkel };
    if (h.rohrVorn === true) {
      ebenen['Rohr'] = EBENE.rohrVorn;
      ebenen['RohrGriff'] = EBENE.rohrVorn - 0.5;
      for (const t of ['RohrHeck', 'RohrMuendung', 'RohrFernrohr']) ebenen[t] = EBENE.rohrMetallVorn;
    }
    if (h.flamme === undefined) versteckt.push(...FEUER_TEILE);
    else for (const t of FEUER_TEILE) formen[t] = h.flamme;
  } else versteckt.push(...ROHR_TEILE);
  for (const s of ['V', 'H'] as const) {
    const a = s === 'V' ? h.armV : h.armH;
    if (a === 'griff') {
      if (rohrLage === null) throw new Error('Zünder: Griff ohne Rohr');
      const g = plus(rohrLage.pos, drehe(s === 'V' ? GRIFF_VORN : GRIFF_HINTEN, rohrLage.winkel));
      mit(pu.zweiGelenke(p, `Oberarm${s}`, `Unterarm${s}`, `Hand${s}`, g, ELLBOGEN));
      mit(pu.weltWinkel(p, `Hand${s}`, rohrLage.winkel - 90));
      continue;
    }
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

/** Rastert eine Haltung im Stil des Zünders (Visier leuchtend mit Abtastlinie beim Zielen). */
export function zeichne(h: Haltung): Gerastert {
  let stil = h.glut === true ? STIL_GLUT : STIL;
  if (h.glut === true && h.abtast !== undefined) stil = { ...stil, gesicht: abtastLinie(h.abtast) };
  return PUPPE_ZUENDER.rastern(pose(h), stil);
}

/**
 * Bild einer Haltung: letzte Streupixel zwischen Teilen entfernen (Regel 1.3,
 * Kontur geschützt), Anker in der untersten Zeile: Jedes Bild steht auf der
 * Ankerzeile, Posen in der Luft heben sich über die Höhe der Logik
 * (Festlegung G3-2).
 */
function bild(h: Haltung, dauer: number): Bild {
  const g = zeichne(h);
  streupixelEntfernen(g.leinwand, GLANZ_ZUENDER, new Set<Pixel>([KONTUR]));
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
export function untersteZeile(l: Leinwand): number {
  for (let y = l.hoehe - 1; y >= 0; y--) {
    for (let x = 0; x < l.breite; x++) if (deckend(l.hole(x, y))) return y;
  }
  return l.hoehe - 1;
}

/** Ziel des Handgelenks in Figurkoordinaten (Griff und Schulterangaben aufgelöst). */
function armAbsolut(h: Haltung, seite: 'V' | 'H'): Arm {
  const p = pose(h);
  const lage = PUPPE_ZUENDER.lagen(p).get(`Hand${seite}`) as Lage;
  return { ziel: lage.pos, hand: lage.winkel };
}

/**
 * Zwischenbild zwischen zwei Schlüsselhaltungen (Auftrag 4, 2.4: höchstens ein
 * Zwischenbild): Eingaben gemischt, dann über die Gelenke gelöst (wie Vela,
 * G0-8). Halten beide den Raketenwerfer, bleiben die Hände an den Griffen.
 */
export function zwischen(a: Haltung, b: Haltung, t: number = 0.5): Haltung {
  const m = (x: number, y: number): number => x + (y - x) * t;
  const mp = (p: Punkt, q: Punkt): Punkt => P(m(p.x, q.x), m(p.y, q.y));
  const naeher = t < 0.5 ? a : b;
  const arm = (seite: 'V' | 'H'): Arm | 'griff' => {
    const pa = seite === 'V' ? a.armV : a.armH;
    const pb = seite === 'V' ? b.armV : b.armH;
    if (pa === 'griff' && pb === 'griff') return 'griff';
    const p = armAbsolut(a, seite);
    const q = armAbsolut(b, seite);
    return { ziel: mp(p.ziel, q.ziel), hand: m(p.hand as number, q.hand as number) };
  };
  const bein = (p: Bein, q: Bein): Bein => ({ knoechel: mp(p.knoechel, q.knoechel), fuss: m(p.fuss, q.fuss) });
  const rohrMisch = (): Rohr | undefined => {
    if (a.rohr === undefined || b.rohr === undefined) return naeher.rohr;
    const lage = (h: Haltung): Lage => {
      const p = pose(h);
      return { pos: plus((PUPPE_ZUENDER.lagen(p).get('Rohr') as Lage).pos, P(0, 0)), winkel: (h.rohr as Rohr).winkel };
    };
    const la = lage(a);
    const lb = lage(b);
    return { winkel: m(la.winkel, lb.winkel), punkt: mp(la.pos, lb.pos) };
  };
  const versatz: Record<string, Punkt> = {};
  const va = a.versatz ?? {};
  const vb = b.versatz ?? {};
  for (const k of new Set([...Object.keys(va), ...Object.keys(vb)])) versatz[k] = mp(va[k] ?? P(0, 0), vb[k] ?? P(0, 0));
  const rohr = rohrMisch();
  return {
    huefte: mp(a.huefte, b.huefte),
    becken: m(a.becken ?? 0, b.becken ?? 0),
    rumpf: m(a.rumpf, b.rumpf),
    kopf: m(a.kopf, b.kopf),
    armV: arm('V'),
    armH: arm('H'),
    beinV: bein(a.beinV, b.beinV),
    beinH: bein(a.beinH, b.beinH),
    ...(rohr !== undefined ? { rohr } : {}),
    versatz,
    ...(naeher.ebenen !== undefined ? { ebenen: naeher.ebenen } : {}),
    ...(naeher.glut !== undefined ? { glut: naeher.glut } : {}),
    ...(naeher.rohrVorn !== undefined ? { rohrVorn: naeher.rohrVorn } : {}),
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

/** Bild zur Zeit A + d eines Angriffs (d = 0 im Frame A). */
export function bildBeiAbstand(dauern: readonly number[], d: number): number {
  return bildBeiUhr(dauern, d + 1);
}

// ---------------------------------------------------------------------------
// Stand: aufrecht, Rohr schräg auf der fernen Schulter (Winkel 106: Mündung 16° hoch, 3 px nach hinten geschoben, damit das Heck hinter dem Helm vorsteht),
// nahe Hand am vorderen Griff vor der Brust
// ---------------------------------------------------------------------------

export const STAND: Haltung = {
  huefte: P(0, -31),
  rumpf: -3,
  kopf: 3,
  armV: 'griff',
  armH: 'griff',
  beinV: { knoechel: P(7, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-8, -KNOECHEL), fuss: 0 },
  rohr: { winkel: 106, schulter: true, punkt: P(-3, 0) },
};

// ---------------------------------------------------------------------------
// Gehen: 8 Bilder zu 4 Frames (design-gegner-stages.md 9: Zünder 8 × 4); der
// Standfuß rückt je Bild um 4 · 1,75 = 7 px zurück (werte.ts ZUENDER_GEHEN_X,
// Auftrag 4, 1.4), 56 px je Zyklus. Schnell (2,25 px/Frame) dieselben Bilder
// mit 7 / 2,25 ≈ 3 Frames je Bild.
// ---------------------------------------------------------------------------

export const GEHEN_BILDER = 8;
export const GEHEN_DAUER = 4;
/** px je Bild: Frames je Bild · Gehgeschwindigkeit (1,75 als Festkomma, genau 7). */
export const GEHEN_SCHRITT = (GEHEN_DAUER * ZUENDER_GEHEN_X) / EINS;
/** Frames je Bild beim schnellen Gehen, damit der Fuß nicht rutscht: Schritt / 2,25, gerundet (Richtwert; die Darstellung nimmt die Uhr). */
export const GEHEN_SCHNELL_DAUER = Math.round(GEHEN_SCHRITT / (ZUENDER_SCHNELL_X / EINS));
/** Rückversatz des Standfußes nach n Bildern, auf ganze px gerundet. */
export function gehVersatz(n: number): number {
  return Math.round(n * GEHEN_SCHRITT);
}
const STANDBILDER = GEHEN_BILDER / 2;
/** Fußhub in der Schwungphase, Neigung beim Aufsetzen und Abrollen (wie Vela, G0-7, etwas kleiner). */
const FUSS_HUB = 5;
const FERSE_AUF = 12;
const SPITZE_AB = -20;

/** Knöchel, wenn der Stiefel um winkel Grad um den Kontaktpunkt (Ferse oder Spitze) gedreht auf dem Boden steht. */
function knoechelUeber(kontakt: Punkt, kontaktLokal: Punkt, winkel: number): Punkt {
  const w = (winkel * Math.PI) / 180;
  const dx = kontaktLokal.x * Math.cos(w) + kontaktLokal.y * Math.sin(w);
  const dy = -kontaktLokal.x * Math.sin(w) + kontaktLokal.y * Math.cos(w);
  return P(kontakt.x - dx, kontakt.y - dy);
}

/** Lage eines Fußes im Bild i (wie figuren/rammbock.ts gehFuss: Standphase k = 0 … 4, dann drei Bilder Schwung). */
function gehFuss(i: number, start: number, vorn: number): Bein {
  const k = (((i - start) % GEHEN_BILDER) + GEHEN_BILDER) % GEHEN_BILDER;
  const zurueck = (j: number): number => gehVersatz(start + j) - gehVersatz(start);
  if (k <= STANDBILDER) {
    const flach = P(vorn - zurueck(k), -KNOECHEL);
    if (k === 0) return { knoechel: knoechelUeber(P(flach.x + FERSE.x, 0), FERSE, FERSE_AUF), fuss: FERSE_AUF };
    if (k === STANDBILDER) return { knoechel: knoechelUeber(P(flach.x + SPITZE.x, 0), SPITZE, SPITZE_AB), fuss: SPITZE_AB };
    return { knoechel: flach, fuss: 0 };
  }
  const s = (k - STANDBILDER) / STANDBILDER;
  const hinten = vorn - zurueck(STANDBILDER);
  const x = hinten + (vorn - hinten) * s;
  const hub = Math.sin(Math.PI * s) * FUSS_HUB;
  return { knoechel: P(x, -KNOECHEL - hub), fuss: SPITZE_AB * (1 - s) + FERSE_AUF * s * 0.5 };
}

/** Vorderste Lage der Knöchel je Bein (ganze px) und Hüfte beim Gehen (wie im Stand, Wippen 1 px). */
const GEHEN_VORN_V = 14;
const GEHEN_VORN_H = 8;
const GEHEN_HUEFTE = -31;
const GEHEN_WIPPEN = [1, 0, -1, 0] as const;

/** Haltungen des Gehzyklus (8 Bilder): Beine im Wechsel, Rohr wippt mit der Schulter. */
export function gehen(): Haltung[] {
  const aus: Haltung[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const beinV = gehFuss(i, 0, GEHEN_VORN_V);
    const beinH = gehFuss(i, STANDBILDER, GEHEN_VORN_H);
    const reich = SCHENKEL + SCHIENBEIN - 1;
    const hoehe = (b: Bein, seite: number): number => {
      const dx = b.knoechel.x - seite;
      return b.knoechel.y - Math.sqrt(Math.max(0, reich * reich - dx * dx));
    };
    const hy = Math.max(hoehe(beinV, HUEFTE_SEITE), hoehe(beinH, -HUEFTE_SEITE), GEHEN_HUEFTE + (GEHEN_WIPPEN[i % GEHEN_WIPPEN.length] as number));
    const phase = (2 * Math.PI * i) / GEHEN_BILDER;
    aus.push({
      huefte: P(0, hy),
      rumpf: -5 + 1.5 * Math.cos(phase * 2),
      kopf: 5,
      armV: 'griff',
      armH: 'griff',
      beinV,
      beinH,
      rohr: { winkel: 106 - 3 * Math.cos(phase * 2), schulter: true, punkt: P(-3, 0) },
    });
  }
  return aus;
}

// ---------------------------------------------------------------------------
// Zielen: 4 Bilder zu 15 Frames, Schleife über die 60 Frames des Zielens
// (werte.ts ZIELEN_DAUER; Auftrag 4, 3). Rohr waagrecht auf der Schulter,
// Kopf zum Zielfernrohr geneigt, Visier leuchtet, Abtastlinie wandert; tiefer
// Stand mit dem vorderen Fuß voraus.
// ---------------------------------------------------------------------------

export const ZIELEN_DAUERN = [15, 15, 15, 15] as const;

export const ZIELEN: Haltung = {
  huefte: P(1, -26.5),
  rumpf: -12,
  kopf: 16,
  armV: 'griff',
  armH: 'griff',
  beinV: { knoechel: P(13, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
  rohr: { winkel: 90, schulter: true, punkt: P(-0.5, 1.5) },
  glut: true,
};

function zielen(): Haltung[] {
  // Abtastlinie oben, Mitte, unten, Mitte; Atmen: Hüfte 0 / 0,5 / 0 / −0,5 px
  const zeilen = [1, 4, 7, 4] as const;
  const atmen = [0, 0.5, 0, -0.5] as const;
  return zeilen.map((z, i) => ({ ...ZIELEN, huefte: P(ZIELEN.huefte.x, ZIELEN.huefte.y + (atmen[i] as number)), abtast: z }));
}

// ---------------------------------------------------------------------------
// Schuss ZR: 4 Bilder 5 / 1 / 10 / 1 = 17 Frames (werte.ts SCHUSS_DAUER;
// design-gegner-stages.md 9). Die Rakete erscheint in A+6 (ZR_RAKETE_AB):
// Bild 2 (Rückstoß mit großem Rückstrahl) steht ab A+6 und ist das „aktive“
// Bild des Atlas.
// ---------------------------------------------------------------------------

export const SCHUSS_DAUERN = [5, 1, 10, 1] as const;

function schuss(): Haltung[] {
  const anlegen: Haltung = { ...ZIELEN, abtast: undefined } as Haltung;
  const zuendung: Haltung = { ...anlegen, flamme: 'klein' };
  const rueckstoss: Haltung = {
    ...ZIELEN,
    huefte: P(-1, -27.5),
    rumpf: -4,
    kopf: 8,
    rohr: { winkel: 99, schulter: true, punkt: P(-1, 0) },
    glut: false,
    flamme: 'gross',
  };
  const zurueck: Haltung = { ...zwischen(rueckstoss, ZIELEN), glut: false };
  return [{ ...anlegen, glut: true }, zuendung, rueckstoss, zurueck];
}

/** Index des Bildes, das beim Erscheinen der Rakete steht (A + ZR_RAKETE_AB). */
export function schussRaketenBild(): number {
  return bildBeiAbstand(SCHUSS_DAUERN, ZR_RAKETE_AB);
}

// ---------------------------------------------------------------------------
// Kolbenhieb ZK wie BA (werte.ts NAH_ANGRIFFE.BA, Welt 6): Ausholen 2 Bilder
// über den Startup 9, Trefferbild über die aktiven Frames A+9 bis A+13,
// Rückzug 2 Bilder über den festen Rückzug 5 (Dauern wie der Schlag des
// Rammbocks, 5 / 4 / 5 / 3 / 2). Der Werfer wird umgedreht und mit dem
// Heck voran gestoßen.
// ---------------------------------------------------------------------------

const BA = NAH_ANGRIFFE.BA;
export const KOLBEN_DAUERN = [5, BA.startup - 5, BA.aktiv_bis - BA.aktiv_von + 1, 3, BA.rueckzug - 3] as const;

function kolbenhieb(): Haltung[] {
  // Ausholen: Werfer von der Schulter genommen und umgedreht (Mündung hinten, Heck vorn),
  // vor der Brust zurückgezogen, Gewicht hinten; die Hände greifen von oben
  const ausholen1: Haltung = {
    huefte: P(-1, -30),
    rumpf: 4,
    kopf: 2,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-9, -KNOECHEL), fuss: 0 },
    rohr: { winkel: -80, punkt: P(-5, -41) },
    rohrVorn: true,
  };
  const ausholen2: Haltung = {
    ...ausholen1,
    huefte: P(-3, -29),
    rumpf: 9,
    kopf: -2,
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 },
    rohr: { winkel: -76, punkt: P(-9, -42) },
  };
  // Treffer: Ausfallschritt, Arme gestreckt, Heck auf Brusthöhe etwa 43 px vor dem Fußpunkt
  const treffer: Haltung = {
    huefte: P(2, -28),
    rumpf: -14,
    kopf: 12,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(16, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
    rohr: { winkel: -84, punkt: P(27, -44) },
    rohrVorn: true,
  };
  // Rückzug: zurück vor die Brust, dann den Werfer senkrecht hochnehmen (Mündung oben) zum Schultern
  const zurueck: Haltung = { ...zwischen(treffer, ausholen1), rohrVorn: true };
  const hochnehmen: Haltung = {
    huefte: P(0, -30.5),
    rumpf: -2,
    kopf: 2,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(8, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-8, -KNOECHEL), fuss: 0 },
    rohr: { winkel: 150, punkt: P(12, -34) },
    rohrVorn: true,
  };
  return [ausholen1, ausholen2, treffer, zurueck, hochnehmen];
}

/** Index des Trefferbilds im Kolbenhieb: Bild zur Zeit A + aktiv_von. */
export function kolbenTrefferBild(): number {
  return bildBeiAbstand(KOLBEN_DAUERN, BA.aktiv_von);
}

// ---------------------------------------------------------------------------
// Getroffen: 3 Bilder ab h+1, h+10, h+22 (werte.ts REAKTION_ANIMATION),
// 9 / 12 / 2 = 23 Frames (REAKTION_DAUER); Haltung nach den Grok-Blättern
// des Rammbocks (E24, rammbock_d_reaktionen.png Reihe 1): Kopf in den
// Nacken, Rumpf zurück, Werfer reißt hoch; dann gekrümmt mit gesenktem Kopf.
// ---------------------------------------------------------------------------

export const GETROFFEN_DAUERN = [
  (REAKTION_ANIMATION[1] as number) - (REAKTION_ANIMATION[0] as number),
  (REAKTION_ANIMATION[2] as number) - (REAKTION_ANIMATION[1] as number),
  REAKTION_DAUER + (REAKTION_ANIMATION[0] as number) - (REAKTION_ANIMATION[2] as number),
] as const;

const GETROFFEN_STOSS: Haltung = {
  huefte: P(-3, -30),
  rumpf: 16,
  kopf: -18,
  armV: 'griff',
  armH: 'griff',
  beinV: { knoechel: P(8, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-8, -KNOECHEL), fuss: 0 },
  rohr: { winkel: 150, schulter: true, punkt: P(-1, 1) },
};

const GETROFFEN_KRUMM: Haltung = {
  huefte: P(-2, -29),
  rumpf: -16,
  kopf: 14,
  armV: 'griff',
  armH: 'griff',
  beinV: { knoechel: P(8, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-8, -KNOECHEL), fuss: 0 },
  rohr: { winkel: 96, schulter: true, punkt: P(0, 1) },
};

function getroffen(): Haltung[] {
  return [GETROFFEN_STOSS, GETROFFEN_KRUMM, zwischen(GETROFFEN_KRUMM, STAND)];
}

// ---------------------------------------------------------------------------
// Umgeworfen: 5 Bilder über die Bahn F1 (werte.ts F1_STILLSTAND, F1_BODEN,
// F1_RUHE): Stillstand W+1 bis W+8, Steigen bis zum Scheitel, Fallen bis zum
// Bodenkontakt in W+46, Aufprall, Ruhe in W+55; Haltungen nach
// rammbock_d_reaktionen.png Reihe 2 (E24). Liegen 1 Bild, Aufstehen 6 Bilder
// zu 3 Frames (AUFSTEHEN_GEGNER 18) nach Reihe 3.
// ---------------------------------------------------------------------------

/** Scheitel der Bahn F1: vh 5 px/Frame, Schwerkraft 70/256 px/Frame² → etwa 18 Bahnframes nach dem Stillstand (Kampf 5.7). */
const F1_STEIGEN = 18;
export const UMGEWORFEN_DAUERN = [F1_STILLSTAND, F1_STEIGEN, F1_BODEN - F1_STILLSTAND - F1_STEIGEN - 1, 5, F1_RUHE - F1_BODEN - 5 + 1] as const;
export const AUFSTEHEN_DAUERN = [3, 3, 3, 3, 3, AUFSTEHEN_GEGNER - 15] as const;

/** Liegen rücklings: Kopf hinten (−x), Füße vorn, Werfer quer über der Brust. */
const LIEGEN: Haltung = {
  huefte: P(4, -4.6),
  becken: 90,
  rumpf: 2,
  kopf: -14,
  armV: 'griff',
  armH: 'griff',
  beinV: { knoechel: P(30, -KNOECHEL + 1), fuss: 80 },
  beinH: { knoechel: P(27, -KNOECHEL + 1), fuss: 70 },
  rohr: { winkel: 100, punkt: P(-12, -9) },
};

function umgeworfen(): Haltung[] {
  // 0 Treffer: steif nach hinten, Arme mit dem Werfer hoch, Füße noch am Boden
  const treffer: Haltung = {
    huefte: P(-4, -29),
    becken: 18,
    rumpf: 10,
    kopf: -22,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(7, -KNOECHEL), fuss: 10 },
    beinH: { knoechel: P(-5, -KNOECHEL), fuss: 0 },
    rohr: { winkel: 150, schulter: true, punkt: P(0, 2) },
  };
  // 1 Steigen: schräg rücklings in der Luft, Beine angezogen (Bild am Anker, die Höhe trägt die Logik)
  const steigen: Haltung = {
    huefte: P(0, -19),
    becken: 52,
    rumpf: 10,
    kopf: -20,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(18, -6), fuss: 50 },
    beinH: { knoechel: P(12, -2), fuss: 40 },
    rohr: { winkel: 160, schulter: true, punkt: P(0, 2) },
  };
  // 2 Fallen: flach in der Luft, Kopf voran nach hinten, Beine gestreckt
  const fallen: Haltung = {
    huefte: P(3, -12),
    becken: 82,
    rumpf: 6,
    kopf: -16,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(28, -11), fuss: 85 },
    beinH: { knoechel: P(25, -6), fuss: 75 },
    rohr: { winkel: 140, schulter: true, punkt: P(0, 2) },
  };
  // 3 Aufprall: Rücken am Boden, Beine hochgeschlagen
  const aufprall: Haltung = {
    huefte: P(4, -5),
    becken: 96,
    rumpf: 0,
    kopf: -6,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(22, -22), fuss: 120 },
    beinH: { knoechel: P(26, -14), fuss: 110 },
    rohr: { winkel: 100, punkt: P(-12, -12) },
  };
  return [treffer, steigen, fallen, aufprall, LIEGEN];
}

function aufstehen(): Haltung[] {
  // nach rammbock_d_reaktionen.png Reihe 3 (E24): Kopf und Schultern heben, Sitzen mit der fernen Hand
  // am Boden, Knien auf dem fernen Knie, geduckt, aufrecht; die nahe Hand behält den Werfer
  const heben: Haltung = { ...LIEGEN, huefte: P(2, -5), becken: 70, rumpf: -10, kopf: 4 };
  const sitzen: Haltung = {
    huefte: P(-4, -5),
    becken: 8,
    rumpf: -26,
    kopf: 12,
    armV: 'griff',
    armH: { ziel: P(-15, -3), hand: -20 },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 10 },
    beinH: { knoechel: P(10, -KNOECHEL), fuss: 0 },
    rohr: { winkel: 112, punkt: P(2, -20) },
  };
  const knien: Haltung = {
    huefte: P(-3, -16),
    rumpf: -30,
    kopf: 22,
    armV: 'griff',
    armH: { ziel: P(9, -17), hand: 60 },
    beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-17, -4), fuss: -70 },
    rohr: { winkel: 76, punkt: P(6, -30) },
  };
  const geduckt: Haltung = {
    huefte: P(-2, -24),
    rumpf: -30,
    kopf: 22,
    armV: 'griff',
    armH: 'griff',
    beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-10, -KNOECHEL), fuss: 0 },
    rohr: { winkel: 96, schulter: true },
  };
  return [heben, sitzen, knien, geduckt, zwischen(geduckt, STAND), zwischen(geduckt, STAND, 0.8)];
}

// ---------------------------------------------------------------------------
// Tot: Bahn F4 (werte.ts F4_STILLSTAND, F4_BODEN, F4_RUHE): Stillstand t+1
// und t+2, Flug, Bodenkontakt t+40, Ruhe t+49; danach blinkt die Darstellung.
// Ab dem Tod ohne Raketenwerfer: die Waffe fliegt ab t als eigenes Objekt
// und liegt ab t+44 als Gegenstand (Welt 6; Gegenstand von G4).
// ---------------------------------------------------------------------------

export const TOT_DAUERN = [F4_STILLSTAND, F1_STEIGEN, F4_BODEN - F4_STILLSTAND - F1_STEIGEN - 1, 5, F4_RUHE - F4_BODEN - 5 + 1] as const;

function tot(): Haltung[] {
  const ohne = (h: Haltung, armV: Arm, armH: Arm): Haltung => {
    const { rohr: _rohr, ...rest } = h;
    return { ...rest, armV, armH };
  };
  const u = umgeworfen();
  return [
    ohne(u[0] as Haltung, { ziel: P(10, -14), hand: 150, schulter: true }, { ziel: P(14, -10), hand: 160, schulter: true }),
    ohne(u[1] as Haltung, { ziel: P(6, -16), hand: 170, schulter: true }, { ziel: P(12, -14), hand: 170, schulter: true }),
    ohne(u[2] as Haltung, { ziel: P(-2, -17), hand: 180, schulter: true }, { ziel: P(6, -17), hand: 180, schulter: true }),
    ohne(u[3] as Haltung, { ziel: P(-8, -14), hand: -150, schulter: true }, { ziel: P(4, -16), hand: 170, schulter: true }),
    ohne(LIEGEN, { ziel: P(-2, -3), hand: 90 }, { ziel: P(-33, -3), hand: -90 }),
  ];
}

// ---------------------------------------------------------------------------
// Gehalten (Kampf 8): gekrümmt im Griff der Figur, Werfer gesenkt
// ---------------------------------------------------------------------------

function gehalten(): Haltung[] {
  return [
    {
      ...GETROFFEN_KRUMM,
      huefte: P(-2, -27.5),
      rumpf: -22,
      kopf: 26,
      beinV: { knoechel: P(9, -KNOECHEL), fuss: 0 },
      beinH: { knoechel: P(-7, -KNOECHEL), fuss: -10 },
      rohr: { winkel: 72, schulter: true, punkt: P(0, 2) },
    },
  ];
}

// ===========================================================================
// Animationen
// ===========================================================================

function animation(name: string, haltungen: readonly Haltung[], dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation {
  if (haltungen.length !== dauern.length) throw new Error(`Zünder ${name}: ${haltungen.length} Haltungen, ${dauern.length} Dauern`);
  const bilder = haltungen.map((h, i) => bild(h, dauern[i] as number));
  return aktiv !== undefined ? { name, schleife, bilder, aktiv } : { name, schleife, bilder };
}

/** Alle Animationen des Zünders (Auftrag 4, 3; Zuordnung in docs/grafik.md 4.5). */
export function zuenderAnimationen(): Animation[] {
  const geh = gehen();
  if (ZIELEN_DAUERN.reduce((a, b) => a + b, 0) !== ZIELEN_DAUER) throw new Error('Zünder: Zielen nicht 60 Frames');
  if (SCHUSS_DAUERN.reduce((a, b) => a + b, 0) !== SCHUSS_DAUER) throw new Error('Zünder: Schuss nicht 17 Frames');
  return [
    animation('stand', [STAND], [0], true),
    animation('gehen', geh, new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true),
    animation('gehen_schnell', geh, new Array<number>(GEHEN_BILDER).fill(GEHEN_SCHNELL_DAUER), true),
    animation('zielen', zielen(), ZIELEN_DAUERN, true),
    animation('schuss', schuss(), SCHUSS_DAUERN, false, [schussRaketenBild()]),
    animation('kolbenhieb', kolbenhieb(), KOLBEN_DAUERN, false, [kolbenTrefferBild()]),
    animation('getroffen', getroffen(), GETROFFEN_DAUERN, false),
    animation('umgeworfen', umgeworfen(), UMGEWORFEN_DAUERN, false),
    animation('liegen', [LIEGEN], [0], true),
    animation('aufstehen', aufstehen(), AUFSTEHEN_DAUERN, false),
    animation('tot', tot(), TOT_DAUERN, false),
    animation('gehalten', gehalten(), [0], true),
  ];
}

/** Zünder als Gliederpuppe für bauen.ts. */
export function zuenderFiguren(): Figur[] {
  return [
    {
      name: 'zuender',
      umriss: UMRISS_GEGNER['Zünder'],
      animationen: zuenderAnimationen(),
      glanz: GLANZ_ZUENDER,
      budget: FARBBUDGET.figur,
      gehen: 'gehen',
      schritt: GEHEN_SCHRITT,
    },
  ];
}
