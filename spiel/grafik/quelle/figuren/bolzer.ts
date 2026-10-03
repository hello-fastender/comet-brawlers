// Bolzer, Hafenschläger, und Puppe (Palettentausch des Bolzers) als
// Gliederpuppe (Auftrag 4, 2.4, 3 und 4; Phase 2, G2). Aussehen nach Auftrag
// 4, 4: gedrungen, vorgebeugt, grauer Overall (OVERALL_BOLZER) mit orangen
// Streifen (SIGNAL_ORANGE) an Schultern und Schienbeinen, Atemmaske mit
// Filter aus Stahl (kein Gesicht, Auftrag 4, 2.4), Magnetstiefel mit
// Metallkappen und Stahlsohle, Werkzeuggürtel mit Tasche, Haut dunkel
// (HAUT_DUNKEL) an Kopf und Händen. Dreiviertelansicht wie der Rammbock
// (E24): Brust halb zum Betrachter, nahe Schulter links der Mitte.
// Reaktionsposen (Getroffen, Umgeworfen, Liegen, Aufstehen, Spott) nach den
// Grok-Blättern des Rammbocks (E24), an den gedrungenen Bolzer angepasst.
//
// Maße in Spielpixeln. Herkunft: Umriss 57 × 72 mit Schatten
// (src/darstellung/masse.ts, UMRISS_GEGNER.Bolzer), Körper im Stand höchstens
// 72 − SCHATTEN_HOEHE / 2 = 67 px hoch und mindestens 90 % davon
// (docs/grafik.md 2.5); Proportionen nach Auftrag 4, 1.1 (Kopf etwa 1/5 der
// Körperhöhe, große Hände und Füße). Zeiten aus src/kern/werte.ts über
// bolzer_gemeinsam.ts; Festlegungen in docs/grafik.md 4.3, 4.4 und
// Abschnitt 7 (G2-…).

import type { Animation, Bild } from '../blatt.ts';
import type { Form } from '../geometrie.ts';
import type { Pixel } from '../leinwand.ts';
import { Leinwand } from '../leinwand.ts';
import { FARBBUDGET, HAUT_DUNKEL, KONTUR, OVERALL_BOLZER, PUPPE_GRAU, SIGNAL_ORANGE, STAHL } from '../palette.ts';
import type { Gerastert, Pose, Stil, TeilDef, Toene } from '../puppe.ts';
import { Puppe } from '../puppe.ts';
import { UMRISS_GEGNER } from '../../../src/darstellung/masse.ts';
import { AUFTRITT_HOCKE_BOLZER, BOLZER_GEHEN_X, BOLZER_SCHNELL_X } from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';
import type { Figur } from '../bauen.ts';
import type { Arm, Bein, Gehmass, Haltung } from './bolzer_gemeinsam.ts';
import {
  AUFSTEHEN_DAUERN,
  GETROFFEN_DAUERN,
  GEWORFEN_DAUERN,
  HALTUNG_DAUERN,
  KAMPFHALTUNG_DAUERN,
  P,
  SPOTT_DAUERN,
  TOT_DAUERN,
  UMGEWORFEN_DAUERN,
  angriffDauern,
  animationAus,
  aufgeraeumt,
  aufstehenHockeDauern,
  bildAus,
  gehFuss,
  gehHuefte,
  gehVersatz as gehVersatzMass,
  knoechelUeber,
  mitDauern,
  pose as poseAus,
  trefferBild,
  zwischen as zwischenAus,
} from './bolzer_gemeinsam.ts';

// ===========================================================================
// Maße
// ===========================================================================

/** Sohle bis Knöchel: Magnetstiefel mit Stahlsohle (wie der Rammbock 6; Vela 5). */
const KNOECHEL = 6;
/** Hüfte bis Knie und Knie bis Knöchel: kurze Beine (25 + 6 = 31; Rammbock 32, Vela 35), gedrungen. */
const SCHENKEL = 12.5;
const SCHIENBEIN = 12.5;
/** Schulter bis Ellbogen, Ellbogen bis Handgelenk (Reichweite des Schlags etwa 40 px, er trifft aus 46 px, design-gegner-stages.md 1.1). */
const OBERARM = 10.5;
const UNTERARM = 9.5;
/** Radien der Overallärmel (weit) an Schulter, Ellbogen und Handgelenk. */
const OBERARM_R = [3.9, 3.4] as const;
const UNTERARM_R = [3.4, 2.9] as const;
/** Radien der Hosenbeine an Hüfte, Knie und Knöchel (weiter Overall). */
const SCHENKEL_R = [5.2, 4.6] as const;
const SCHIENBEIN_R = [4.6, 3.9] as const;
/** Hüftgelenke links und rechts der Beckenmitte. */
const HUEFTE_SEITE = 3;
/** Schultergelenke im Rumpf, Dreiviertelansicht wie der Rammbock (E24): nah links, fern rechts hinter der Brust; Höhe über der Taille. */
const SCHULTER_V_X = -3;
const SCHULTER_H_X = 6.5;
const SCHULTER_HOEHE = 15.5;
/** Taille über dem Beckengelenk (wie Vela). */
const TAILLE = 2;

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
/** Waagrechtes Band über ein Glied (im Rahmen des Glieds, y von a bis b), nur auf dem Träger sichtbar. */
const band = (a: number, b: number): Form => polygon([-8, a], [8, a], [8, b], [-8, b]);

/** Zeichenreihenfolge (Auftrag 4, 2.4) wie beim Rammbock. */
const EBENE = {
  armH: 10,
  handH: 11,
  beinH: 20,
  stiefelH: 21,
  beinV: 26,
  stiefelV: 27,
  becken: 29,
  rumpf: 30,
  kopf: 35,
  maske: 37,
  armV: 50,
  handV: 51,
} as const;

/** Magnetstiefel im Rahmen des Knöchels: Schaft bis 4,5 über dem Knöchel, Spitze 10 vor, Ferse 5 hinter dem Knöchel (15 lang; große Füße). */
const STIEFEL = polygon([-4.4, -4.5], [4, -4.5], [4.6, -1], [7.6, 0], [9.6, 1.6], [10, KNOECHEL], [-5, KNOECHEL], [-5.2, 1]);
/** Metallkappe über den Zehen und Stahlsohle (Magnetplatte) unter dem ganzen Stiefel. */
const KAPPE = polygon([5, -0.8], [7.8, 0.1], [9.9, 1.8], [10.4, 4.6], [5.2, 4.6]);
const PLATTE = polygon([-5.4, 4.3], [10.4, 4.3], [10.2, KNOECHEL], [-5.2, KNOECHEL]);
const SOHLE = P(2.5, KNOECHEL);
const FERSE = P(-5, KNOECHEL);
const SPITZE = P(10, KNOECHEL);

/** Faust (dunkle Haut) im Rahmen des Handgelenks: 8,6 × 8,2, groß im Verhältnis (Auftrag 4, 1.1). */
const FAUST = polygon([-3.4, -0.4], [3.4, -0.4], [4.3, 2.2], [4.3, 6], [3.2, 7.8], [-3.2, 7.8], [-4.3, 6], [-4.3, 2.2]);
const FALTEN: Form[] = [3.6, 5.8].map((y) => polygon([-6, y - 0.5], [-1, y - 0.5], [-1, y + 0.5], [-6, y + 0.5]));
const HAND_OFFEN: Form[] = [
  polygon([-3, -0.4], [3, -0.4], [3.7, 3.2], [3.2, 8.8], [1, 9.8], [-1.4, 9.4], [-3.4, 6.6], [-3.7, 2.6]),
  kapsel(-3.2, 2.2, -5.4, 4.9, 1.3),
];
const HAND_ZEIGEN: Form[] = [FAUST, kapsel(-1, 7, -1, 11.8, 1.2)];

function arm(seite: 'V' | 'H', x: number, ebeneArm: number, ebeneHand: number): TeilDef[] {
  return [
    {
      name: `Oberarm${seite}`,
      eltern: 'Rumpf',
      gelenk: P(x, -SCHULTER_HOEHE),
      formen: [kapsel(0, 0, 0, OBERARM, OBERARM_R[0], OBERARM_R[1])],
      material: 'OVERALL',
      gruppe: `arm${seite}`,
      ebene: ebeneArm,
    },
    // oranger Streifen um die Schulter (Auftrag 4, 4): Band am Oberarm unter dem Schultergelenk
    { name: `Schulterstreifen${seite}`, eltern: `Oberarm${seite}`, gelenk: P(0, 0), formen: [band(1.2, 3.8)], material: 'STREIFEN', gruppe: `arm${seite}`, ebene: ebeneArm + 0.2, auf: `Oberarm${seite}` },
    {
      name: `Unterarm${seite}`,
      eltern: `Oberarm${seite}`,
      gelenk: P(0, OBERARM),
      formen: [kapsel(0, 0, 0, UNTERARM, UNTERARM_R[0], UNTERARM_R[1])],
      material: 'OVERALL',
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

function bein(seite: 'V' | 'H', x: number, ebeneBein: number, ebeneStiefel: number): TeilDef[] {
  return [
    {
      name: `Oberschenkel${seite}`,
      eltern: 'Becken',
      gelenk: P(x, 1),
      formen: [kapsel(0, 0, 0, SCHENKEL, SCHENKEL_R[0], SCHENKEL_R[1])],
      material: 'OVERALL',
      gruppe: `bein${seite}`,
      ebene: ebeneBein,
    },
    {
      name: `Unterschenkel${seite}`,
      eltern: `Oberschenkel${seite}`,
      gelenk: P(0, SCHENKEL),
      formen: [kapsel(0, 0, 0, SCHIENBEIN, SCHIENBEIN_R[0], SCHIENBEIN_R[1])],
      material: 'OVERALL',
      gruppe: `bein${seite}`,
      ebene: ebeneBein,
    },
    // oranger Streifen um das Schienbein (Auftrag 4, 4)
    { name: `Schienstreifen${seite}`, eltern: `Unterschenkel${seite}`, gelenk: P(0, 0), formen: [band(5.4, 8)], material: 'STREIFEN', gruppe: `bein${seite}`, ebene: ebeneBein + 0.2, auf: `Unterschenkel${seite}` },
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
    {
      name: `Kappe${seite}`,
      eltern: `Stiefel${seite}`,
      gelenk: P(0, 0),
      formen: [KAPPE, PLATTE],
      material: 'STAHL',
      gruppe: `kappe${seite}`,
      ebene: ebeneStiefel + 0.5,
      glanz: true,
      kissen: 1.5,
    },
  ];
}

/**
 * Rumpf im Rahmen der Taille, Dreiviertelansicht mit rundem Rücken (vorgebeugt,
 * gedrungen): Rücken links höher gewölbt, Brust rechts; ±10 breit, 19 hoch.
 */
const RUMPF = polygon(
  [-8.6, 3.5],
  [8.6, 3.5],
  [9.8, -1],
  [10.2, -6],
  [10, -11],
  [9, -15.4],
  [6, -18],
  [0, -19],
  [-5.8, -18.6],
  [-9.8, -15.8],
  [-11, -11],
  [-10.4, -5],
  [-9.4, -1],
);
/** Reißverschluss des Overalls vorn rechts der Mitte (Dreiviertelansicht), 1 px im Overallschatten, nur auf dem Rumpf. */
const REISSVERSCHLUSS = polygon([4.6, 3.5], [5.6, 3.5], [5.8, -17.6], [4.8, -17.6]);
/** Kragen des Overalls im Nacken. */
const KRAGEN = kapsel(-5.4, -18.2, 4.4, -18.8, 2.3, 2);
/** Werkzeuggürtel im Rahmen des Beckens, Schnalle aus Stahl vorn, Tasche an der nahen Hüfte. */
const GUERTEL = polygon([-9, -4], [9.4, -4], [9.6, -1.4], [-9.2, -1.4]);
const SCHNALLE = polygon([3.4, -4.4], [6, -4.4], [6, -1], [3.4, -1]);
const TASCHE = polygon([-9.6, -2.2], [-4.4, -2.2], [-4.6, 3.8], [-9.4, 3.8]);

/** Kopf (dunkle Haut, kahl) im Rahmen des Halsgelenks: kurzer Hals, runder Schädel. */
const KOPF: Form[] = [kapsel(0, 0, 0.6, -3, 3), ellipse(1.4, -7.6, 5.4, 5.8)];
/** Atemmaske aus Stahl vor dem Gesicht (von der Augenhöhe bis unter das Kinn) mit dunklem Sichtglas und Filterdose vorn. */
const MASKE = polygon([0.8, -10], [6.2, -10.4], [7.6, -7.4], [7.8, -3.4], [6, -0.8], [2.2, -0.2], [0.4, -3.2], [0.2, -7]);
const SICHTGLAS = polygon([3, -9.6], [6.8, -9.8], [7.4, -7.6], [3.2, -7.2]);
const FILTER: Form[] = [kapsel(6.8, -3.6, 9.4, -2.2, 2.3, 2.5)];
/** Riemen der Maske über den Hinterkopf (1 px). */
const RIEMEN = polygon([-5, -8.4], [1, -8.8], [1, -7.8], [-5, -7.4]);
const OHR = ellipse(-1.2, -6.2, 1.4, 2);

const TEILE: TeilDef[] = [
  { name: 'Becken', eltern: null, gelenk: P(0, 0), formen: [kapsel(-3.5, 0, 3.5, 0, 4.8)], material: 'OVERALL', gruppe: 'rumpf', ebene: EBENE.becken },
  { name: 'Guertel', eltern: 'Becken', gelenk: P(0, 0), formen: [GUERTEL], material: 'GURT', gruppe: 'guertel', ebene: EBENE.rumpf + 2 },
  { name: 'Tasche', eltern: 'Becken', gelenk: P(0, 0), formen: [TASCHE], material: 'GURT', gruppe: 'tasche', ebene: EBENE.rumpf + 2.5, kissen: 1.5 },
  { name: 'Schnalle', eltern: 'Becken', gelenk: P(0, 0), formen: [SCHNALLE], material: 'STAHL', gruppe: 'guertel', ebene: EBENE.rumpf + 3, glanz: true, kissen: 1 },
  { name: 'Rumpf', eltern: 'Becken', gelenk: P(0, -TAILLE), formen: [RUMPF], material: 'OVERALL', gruppe: 'rumpf', ebene: EBENE.rumpf, kissen: 3 },
  { name: 'Reissverschluss', eltern: 'Rumpf', gelenk: P(0, 0), formen: [REISSVERSCHLUSS], material: 'NAHT', gruppe: 'rumpf', ebene: EBENE.rumpf + 1, flach: true, auf: 'Rumpf' },
  { name: 'Kragen', eltern: 'Rumpf', gelenk: P(0, 0), formen: [KRAGEN], material: 'OVERALL', gruppe: 'kragen', ebene: EBENE.rumpf + 4 },
  { name: 'Kopf', eltern: 'Rumpf', gelenk: P(2.6, -18.4), formen: KOPF, material: 'HAUT', gruppe: 'kopf', ebene: EBENE.kopf, relief: 0.6 },
  { name: 'Ohr', eltern: 'Kopf', gelenk: P(0, 0), formen: [OHR], material: 'HAUT', gruppe: 'ohr', ebene: EBENE.kopf + 0.5 },
  { name: 'Riemen', eltern: 'Kopf', gelenk: P(0, 0), formen: [RIEMEN], material: 'GURT', gruppe: 'maske', ebene: EBENE.kopf + 0.8, flach: true, auf: 'Kopf' },
  { name: 'Maske', eltern: 'Kopf', gelenk: P(0, 0), formen: [MASKE], material: 'STAHL', gruppe: 'maske', ebene: EBENE.maske, glanz: true, kissen: 2 },
  { name: 'Sichtglas', eltern: 'Kopf', gelenk: P(0, 0), formen: [SICHTGLAS], material: 'GLAS', gruppe: 'maske', ebene: EBENE.maske + 0.5, flach: true, auf: 'Maske' },
  { name: 'Filter', eltern: 'Kopf', gelenk: P(0, 0), formen: FILTER, material: 'STAHL', gruppe: 'filter', ebene: EBENE.maske + 1, glanz: true },
  ...arm('H', SCHULTER_H_X, EBENE.armH, EBENE.handH),
  ...bein('H', -HUEFTE_SEITE, EBENE.beinH, EBENE.stiefelH),
  ...bein('V', HUEFTE_SEITE, EBENE.beinV, EBENE.stiefelV),
  ...arm('V', SCHULTER_V_X, EBENE.armV, EBENE.handV),
];

export const PUPPE_BOLZER = new Puppe(TEILE);

// ===========================================================================
// Farben: Tonabbildung (Farbbudget 16, docs/grafik.md 1.2 und 4.3)
// ===========================================================================

const O = OVERALL_BOLZER.treppe;
const R = SIGNAL_ORANGE.treppe;
const S = STAHL.treppe;
const H = HAUT_DUNKEL.treppe;

/**
 * 15 Farben plus durchsichtig: KONTUR, Overall 0 bis 3, Streifen 1 und 2,
 * Stahl 0 bis 4, Haut 1 bis 3. Stiefel, Gürtel, Tasche und Riemen in Stahl 0
 * (Grund) und 1 (Licht) mit KONTUR als Innenkontur; Sichtglas einfarbig Stahl 0;
 * Haut mit KONTUR als Innenkontur (dunkle Haut, docs/grafik.md 1.2, Farbbudget).
 */
const ZUTEILUNG: Readonly<Record<string, Toene>> = {
  OVERALL: [O[0], O[1], O[2], O[3], O[3]],
  NAHT: [O[1], O[1], O[1], O[1], O[1]],
  STREIFEN: [R[1], R[1], R[2], R[2], R[2]],
  HAUT: [KONTUR, H[1], H[2], H[3], H[3]],
  FALTE: [H[1], H[1], H[1], H[1], H[1]],
  STAHL: [S[0], S[1], S[2], S[3], S[4]],
  STIEFEL: [KONTUR, S[0], S[0], S[1], S[1]],
  GURT: [KONTUR, S[0], S[0], S[1], S[1]],
  GLAS: [S[0], S[0], S[0], S[0], S[0]],
};

const GLANZ = new Set<Pixel>([S[4] as Pixel]);

/** Stil ohne Gesichtsmaske: Der Bolzer trägt eine Atemmaske (Auftrag 4, 2.4: kein Gesicht). */
export const STIL_BOLZER: Stil = { zuteilung: ZUTEILUNG, kontur: KONTUR, glanz: GLANZ };
export const GLANZ_BOLZER: ReadonlySet<Pixel> = GLANZ;

// ===========================================================================
// Puppe: Palettentausch (Auftrag 4, 3 und 4: Bolzer in Grau ohne Streifen)
// ===========================================================================

const G = PUPPE_GRAU.treppe;
/**
 * Palettentausch Bolzer → Puppe (Farbe für Farbe auf den fertigen Bildern, kein
 * eigenes Zeichnen): Overall in PUPPE_GRAU 0 bis 3; die Streifen nehmen den
 * Overallton gleicher Stufe an und verschwinden; die Haut wird dunkles Grau
 * (PUPPE_GRAU 0 bis 2); Stahl und KONTUR bleiben (Festlegung G2-12).
 */
export const PUPPE_TAUSCH: ReadonlyMap<Pixel, Pixel> = new Map<Pixel, Pixel>([
  [O[0] as Pixel, G[0] as Pixel],
  [O[1] as Pixel, G[1] as Pixel],
  [O[2] as Pixel, G[2] as Pixel],
  [O[3] as Pixel, G[3] as Pixel],
  [R[1] as Pixel, G[1] as Pixel],
  [R[2] as Pixel, G[2] as Pixel],
  [H[1] as Pixel, G[0] as Pixel],
  [H[2] as Pixel, G[1] as Pixel],
  [H[3] as Pixel, G[2] as Pixel],
]);

/** Bild mit getauschter Palette (gleiche Maße und Anker). */
export function getauscht(b: Bild, tausch: ReadonlyMap<Pixel, Pixel>): Bild {
  const l = new Leinwand(b.leinwand.breite, b.leinwand.hoehe, b.leinwand.daten.map((p) => tausch.get(p) ?? p));
  return { ...b, leinwand: l };
}

// ===========================================================================
// Haltung → Bild
// ===========================================================================

export function pose(h: Haltung): Pose {
  return poseAus(PUPPE_BOLZER, h);
}

export function zwischen(a: Haltung, b: Haltung, t: number = 0.5): Haltung {
  return zwischenAus(PUPPE_BOLZER, a, b, t);
}

export function zeichne(h: Haltung): Gerastert {
  return aufgeraeumt(PUPPE_BOLZER.rastern(pose(h), STIL_BOLZER), GLANZ);
}

function verschoben(h: Haltung, dx: number, dy: number): Haltung {
  const arm = (a: Arm): Arm => (a.schulter === true ? a : { ...a, ziel: P(a.ziel.x + dx, a.ziel.y + dy) });
  const bein = (b: Bein): Bein => ({ ...b, knoechel: P(b.knoechel.x + dx, b.knoechel.y + dy) });
  return { ...h, huefte: P(h.huefte.x + dx, h.huefte.y + dy), armV: arm(h.armV), armH: arm(h.armH), beinV: bein(h.beinV), beinH: bein(h.beinH) };
}

/** Haltung ohne Bodenkontakt der Füße mit ihrem untersten Pixel auf die Ankerzeile gesetzt (G2-3, wie beim Rammbock). */
function amBoden(h: Haltung): Haltung {
  const g = zeichne(h);
  const r = g.leinwand.begrenzung();
  if (r === null) return h;
  const unten = r.y + r.h - 1 - g.ankerY;
  return unten === 0 ? h : verschoben(h, 0, -unten);
}

/** Bein auf der Stiefelspitze bei x, Stiefel um winkel Grad geneigt (negativ: Ferse hoch). */
function aufSpitze(x: number, winkel: number): Bein {
  return { knoechel: knoechelUeber(P(x, 0), SPITZE, winkel), fuss: winkel };
}

const OFFEN = { HandV: 'offen', FaltenV: 'offen', HandH: 'offen', FaltenH: 'offen' } as const;
const OFFEN_V = { HandV: 'offen', FaltenV: 'offen' } as const;

// ===========================================================================
// Stand, Haltung, Kampfhaltung
// ===========================================================================

/** Stand: gedrungen und vorgebeugt, Kopf vorgeschoben, Arme hängen angewinkelt mit den Fäusten vor dem Bauch (Rückfall, Prüfbild, G0b-8). */
export const STAND: Haltung = {
  huefte: P(-1, -27),
  rumpf: -14,
  kopf: 12,
  armV: { ziel: P(5, 13), hand: 70, schulter: true },
  armH: { ziel: P(6, 11), hand: 85, schulter: true },
  beinV: { knoechel: P(8, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-9, -KNOECHEL), fuss: 0 },
};

/** Haltung (3 Bilder, Schleife): Atmen unter der Maske, Schultern heben und senken sich, Füße fest. */
function haltung(): Haltung[] {
  const ein: Haltung = { ...STAND, rumpf: -12, kopf: 11, armV: { ziel: P(5, 12), hand: 73, schulter: true }, armH: { ziel: P(6, 10), hand: 88, schulter: true } };
  const aus: Haltung = { ...STAND, huefte: P(-1, -26.6), rumpf: -16, kopf: 13, armV: { ziel: P(5, 13.5), hand: 67, schulter: true } };
  return [STAND, ein, aus];
}

/** Kampfhaltung (2 Bilder, Schleife): geduckt, Fäuste vor der Maske, Bild 1 wippt 1 px tiefer. */
export const KAMPF: Haltung = {
  huefte: P(0, -25),
  rumpf: -20,
  kopf: 17,
  armV: { ziel: P(9, 2), hand: 150, schulter: true },
  armH: { ziel: P(11, -1), hand: 160, schulter: true },
  beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
  beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
};

function kampfhaltung(): Haltung[] {
  return [KAMPF, { ...KAMPF, huefte: P(0, -24), rumpf: -21, kopf: 18 }];
}

// ===========================================================================
// Gehen: 8 Bilder zu 4 Frames (design-gegner-stages.md 9, Bolzer 8 × 4); der
// Standfuß rückt je Bild um 4 · 1,75 = 7 px zurück (Auftrag 4, 1.4; werte.ts
// BOLZER_GEHEN_X), 56 px je Zyklus.
// ===========================================================================

export const GEHEN_BILDER = 8;
export const GEHEN_DAUER = 4;
/** px je Bild: Frames je Bild · Gehgeschwindigkeit (BOLZER_GEHEN_X = 1,75: genau 7 px). */
export const GEHEN_SCHRITT = (GEHEN_DAUER * BOLZER_GEHEN_X) / EINS;
/** Schnelle Gehstufe (2,25 px/Frame, BOLZER_SCHNELL_X): dieselben Bilder, Richtwert 4 · 1,75 / 2,25 ≈ 3 Frames je Bild (G2-8). */
export const GEHEN_SCHNELL_DAUER = Math.round((GEHEN_DAUER * BOLZER_GEHEN_X) / BOLZER_SCHNELL_X);

const GEHMASS: Gehmass = {
  bilder: GEHEN_BILDER,
  schritt: GEHEN_SCHRITT,
  knoechel: KNOECHEL,
  ferse: FERSE,
  spitze: SPITZE,
  // schwere Magnetstiefel: wenig Hub, flaches Aufsetzen (Festlegung G2)
  hub: 5,
  ferseAuf: 9,
  spitzeAb: -18,
};

export function gehVersatz(n: number): number {
  return gehVersatzMass(GEHMASS, n);
}

const GEHEN_VORN_V = 15;
const GEHEN_VORN_H = 8;
const GEHEN_HUEFTE = -27;
const GEHEN_WIPPEN = [1, 0, -1, 0] as const;

/** Haltungen des Gehzyklus (8 Bilder): vorgebeugt stapfend, Arme schwingen gegen die Beine. */
export function gehen(): Haltung[] {
  const aus: Haltung[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const beinV = gehFuss(GEHMASS, i, 0, GEHEN_VORN_V);
    const beinH = gehFuss(GEHMASS, i, GEHEN_BILDER / 2, GEHEN_VORN_H);
    const hy = gehHuefte(0, HUEFTE_SEITE, beinV, beinH, SCHENKEL + SCHIENBEIN - 1, GEHEN_HUEFTE + (GEHEN_WIPPEN[i % GEHEN_WIPPEN.length] as number));
    const phase = (2 * Math.PI * i) / GEHEN_BILDER;
    const schwung = Math.cos(phase);
    const armNah = (s: number): Arm => ({ ziel: P(1 + 7 * s, 16 - 5 * Math.max(0, s)), hand: 10 + 60 * Math.max(0, s) + 25 * Math.min(0, s), schulter: true });
    const armFern = (s: number): Arm => ({ ziel: P(4 + 4 * s, 14 - 3 * Math.max(0, s)), hand: 60 + 30 * s, schulter: true });
    aus.push({
      huefte: P(0, hy),
      rumpf: -16 + 2 * Math.cos(phase * 2),
      kopf: 14,
      armV: armNah(-schwung),
      armH: armFern(schwung),
      beinV,
      beinH,
    });
  }
  return aus;
}

// ===========================================================================
// Angriffe (werte.ts NAH_ANGRIFFE; spezifikation-welt.md 5.5): BA, BB, BC,
// BUA, BUB je Ausholen 2, aktiv 1, Rückzug 2 Bilder (Auftrag 4, 3).
// ===========================================================================

const STRECKUNG_ARM_V = { UnterarmV: P(0, 1.5), HandV: P(0, 1) } as const;
const STRECKUNG_ARM_H = { UnterarmH: P(0, 1.5), HandH: P(0, 1) } as const;
const STRECKUNG_BEIN_V = { UnterschenkelV: P(0, 1.5), StiefelV: P(0, 1) } as const;
const DECKUNG_H: Arm = { ziel: P(8, -2), hand: 150, schulter: true };
const DECKUNG_V: Arm = { ziel: P(8, 1), hand: 145, schulter: true };
/** Ferner Arm vorn gezeichnet (Gerade mit der fernen Faust). */
const ARM_H_VORN = { OberarmH: 52, SchulterstreifenH: 52.2, UnterarmH: 52, HandH: 53, FaltenH: 53.5 } as const;
/** Nahes Bein vorn gezeichnet (Tritt). */
const BEIN_V_VORN = { OberschenkelV: 45, SchienstreifenV: 45.2, UnterschenkelV: 45, StiefelV: 46, KappeV: 46.5 } as const;

/** BA: Gerade mit dem nahen Arm aus der Hüfte. */
function schlagA(): Haltung[] {
  const ausholen1: Haltung = { ...KAMPF, huefte: P(-2, -25), rumpf: -14, kopf: 12, armV: { ziel: P(-3, 6), hand: -30, schulter: true }, armH: DECKUNG_H };
  const ausholen2: Haltung = { ...ausholen1, huefte: P(-3, -25), rumpf: -4, kopf: 4, armV: { ziel: P(-8, 2), hand: -70, schulter: true }, beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 } };
  const treffer: Haltung = {
    huefte: P(5, -25),
    rumpf: -26,
    kopf: 30,
    armV: { ziel: P(37, -36), hand: 88 },
    armH: { ziel: P(5, 2), hand: 150, schulter: true },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
    versatz: { OberarmV: P(2.5, 0), ...STRECKUNG_ARM_V },
  };
  const zurueck: Haltung = { ...KAMPF, huefte: P(2, -24), rumpf: -22, armV: { ziel: P(20, -36), hand: 115 }, versatz: { OberarmV: P(1, 0) } };
  return [ausholen1, ausholen2, treffer, zwischen(treffer, zurueck), zurueck];
}

/** BB: schneller Stoß mit der fernen Faust (Startup 4): kurz gesenkt, Faust zurück, Stoß, zurück in die Deckung. */
function schlagB(): Haltung[] {
  const ducken: Haltung = { ...KAMPF, huefte: P(0, -24), rumpf: -22, armH: { ziel: P(6, 1), hand: 140, schulter: true } };
  const laden: Haltung = { ...ducken, huefte: P(-1, -24), rumpf: -18, armH: { ziel: P(2, 3), hand: 120, schulter: true }, armV: DECKUNG_V };
  const treffer: Haltung = {
    huefte: P(4, -25),
    rumpf: -26,
    kopf: 22,
    armV: DECKUNG_V,
    armH: { ziel: P(38, -41), hand: 95 },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-10, -KNOECHEL), fuss: 0 },
    versatz: { OberarmH: P(1.5, 0), ...STRECKUNG_ARM_H },
    ebenen: ARM_H_VORN,
  };
  const zurueck: Haltung = { ...KAMPF, huefte: P(2, -24), armH: { ziel: P(22, -38), hand: 120 }, ebenen: ARM_H_VORN };
  return [ducken, laden, treffer, zwischen(treffer, zurueck), KAMPF];
}

/** BC: weiter Haken mit dem nahen Arm: Arm weit nach hinten geschwungen, Schulter dreht zurück, Haken auf Kopfhöhe, Nachschwung. */
function schlagC(): Haltung[] {
  const ausholen1: Haltung = { ...KAMPF, huefte: P(-2, -25), rumpf: -10, kopf: 8, armV: { ziel: P(-10, -4), hand: -100, schulter: true }, armH: DECKUNG_H };
  const ausholen2: Haltung = { ...ausholen1, huefte: P(-4, -25), rumpf: 0, kopf: 2, armV: { ziel: P(-13, -6), hand: -110, schulter: true }, beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 } };
  const treffer: Haltung = {
    huefte: P(5, -25),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(34, -45), hand: 130 },
    armH: { ziel: P(4, 4), hand: 140, schulter: true },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
    versatz: { OberarmV: P(2.5, 0), UnterarmV: P(0, 1) },
  };
  const durch: Haltung = { ...treffer, huefte: P(4, -24), rumpf: -32, kopf: 26, armV: { ziel: P(22, -36), hand: 170 }, versatz: { OberarmV: P(1.5, 0) } };
  return [ausholen1, ausholen2, treffer, durch, zwischen(durch, KAMPF)];
}

/** BUA: Aufwärtshaken aus der tiefen Hocke (Umwerfschlag): Faust tief hinten, tiefer, Haken nach oben, Körper gestreckt. */
function umwerfschlagA(): Haltung[] {
  const tief: Haltung = {
    ...KAMPF,
    huefte: P(-1, -21),
    rumpf: -28,
    kopf: 24,
    armV: { ziel: P(-6, 10), hand: -20, schulter: true },
    armH: DECKUNG_H,
    beinV: { knoechel: P(12, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-12, -KNOECHEL), fuss: 0 },
  };
  const tiefer: Haltung = { ...tief, huefte: P(-2, -20), rumpf: -32, kopf: 28, armV: { ziel: P(-9, 9), hand: -40, schulter: true } };
  const treffer: Haltung = {
    huefte: P(4, -27),
    rumpf: -10,
    kopf: 6,
    armV: { ziel: P(30, -56), hand: 165 },
    armH: { ziel: P(4, 6), hand: 120, schulter: true },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    beinH: aufSpitze(-3, -20),
    versatz: { OberarmV: P(2, 0), ...STRECKUNG_ARM_V },
  };
  const oben: Haltung = { ...treffer, huefte: P(3, -26), rumpf: -14, armV: { ziel: P(20, -52), hand: 175 }, versatz: { OberarmV: P(1, 0) }, beinH: { knoechel: P(-10, -KNOECHEL), fuss: 0 } };
  return [tief, tiefer, treffer, oben, zwischen(oben, KAMPF)];
}

/** BUB: Tritt mit dem Magnetstiefel (Umwerfschlag): Knie hoch, Knie höher, Sohle nach vorn gestoßen, Bein zurück, abstellen. */
function umwerfschlagB(): Haltung[] {
  const knie: Haltung = {
    ...KAMPF,
    huefte: P(-2, -27),
    rumpf: -6,
    kopf: 6,
    armV: DECKUNG_V,
    armH: DECKUNG_H,
    beinV: { knoechel: P(9, -18), fuss: 20 },
    beinH: { knoechel: P(-5, -KNOECHEL), fuss: 0 },
    ebenen: BEIN_V_VORN,
  };
  const hoch: Haltung = { ...knie, huefte: P(-3, -28), rumpf: 0, kopf: 2, beinV: { knoechel: P(11, -24), fuss: 30 } };
  const treffer: Haltung = {
    ...hoch,
    huefte: P(-3, -28),
    rumpf: 8,
    kopf: -2,
    armV: { ziel: P(-4, 10), hand: -20, schulter: true },
    armH: { ziel: P(9, 0), hand: 150, schulter: true },
    beinV: { knoechel: P(32, -26), fuss: 70 },
    versatz: { ...STRECKUNG_BEIN_V },
  };
  const zurueck: Haltung = { ...knie, huefte: P(-2, -27), beinV: { knoechel: P(13, -17), fuss: 25 } };
  return [knie, hoch, treffer, zurueck, { ...KAMPF, ebenen: BEIN_V_VORN }];
}

// ===========================================================================
// Reaktionen nach den Grok-Blättern des Rammbocks (E24), angepasst an den
// gedrungenen Bolzer (kürzere Glieder, runder Rücken).
// ===========================================================================

/** Getroffen (Grok D2, D3, D1): Kopf zurück, Rücken durchgebogen, Knie eingeknickt, offene Hände hoch; weniger; aufgerichtet. */
function getroffen(): Haltung[] {
  const stoss: Haltung = {
    huefte: P(-3, -26),
    rumpf: 12,
    kopf: 34,
    armV: { ziel: P(16, -7), hand: 145, schulter: true },
    armH: { ziel: P(17, -9), hand: 155, schulter: true },
    beinV: { knoechel: P(7, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-9, -KNOECHEL), fuss: 0 },
    formen: OFFEN,
  };
  const nach: Haltung = { ...stoss, huefte: P(-3, -26.5), rumpf: 7, kopf: 26, armV: { ziel: P(17, -3), hand: 130, schulter: true }, armH: { ziel: P(18, -5), hand: 140, schulter: true } };
  const fangen: Haltung = { ...STAND, huefte: P(-2, -27), rumpf: -4, kopf: 6, armV: { ziel: P(9, 8), hand: 125, schulter: true }, armH: { ziel: P(11, 6), hand: 125, schulter: true }, formen: OFFEN };
  return [stoss, nach, fangen];
}

/** Umgeworfen (Grok D4 bis D8): zurückgebogen auf den Zehen, schräg rücklings steigend, waagrecht fallend, Aufprall, flach. */
function umgeworfen(): Haltung[] {
  const zurueck: Haltung = amBoden({
    huefte: P(-4, -28),
    rumpf: 22,
    kopf: 36,
    armV: { ziel: P(15, -11), hand: 150, schulter: true },
    armH: { ziel: P(16, -13), hand: 160, schulter: true },
    beinV: { knoechel: P(5, -8), fuss: -28 },
    beinH: { knoechel: P(-5, -7), fuss: -32 },
    formen: OFFEN,
  });
  const steigen: Haltung = amBoden({
    huefte: P(0, -15),
    becken: 62,
    rumpf: 4,
    kopf: 14,
    armV: { ziel: P(3, -17), hand: 175, schulter: true },
    armH: { ziel: P(7, -15), hand: 165, schulter: true },
    beinV: { knoechel: P(21, -29), fuss: 85 },
    beinH: { knoechel: P(21, -19), fuss: 75 },
    formen: OFFEN,
  });
  const fallen: Haltung = amBoden({
    huefte: P(2, -13),
    becken: 96,
    rumpf: 0,
    kopf: 14,
    armV: { ziel: P(-1, 10), hand: 10, schulter: true },
    armH: { ziel: P(8, -6), hand: 150, schulter: true },
    beinV: { knoechel: P(25, -18), fuss: 95 },
    beinH: { knoechel: P(24, -12), fuss: 85 },
    formen: OFFEN,
  });
  const aufprall: Haltung = amBoden({
    huefte: P(4, -8),
    becken: 84,
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(-10, -5), hand: 210, schulter: true },
    armH: { ziel: P(6, 6), hand: 60, schulter: true },
    beinV: { knoechel: P(23, -8), fuss: 30 },
    beinH: { knoechel: P(26, -6), fuss: 40 },
    formen: OFFEN_V,
  });
  return [zurueck, steigen, fallen, aufprall, LIEGEN];
}

/** Liegen (Grok D8, D9): flach auf dem Rücken, Beine gestreckt, Arme am Körper. */
export const LIEGEN: Haltung = amBoden({
  huefte: P(5, -6),
  becken: 92,
  rumpf: 0,
  kopf: 4,
  armV: { ziel: P(10, 3), hand: 95, schulter: true },
  armH: { ziel: P(9, 0), hand: 95, schulter: true },
  beinV: { knoechel: P(30, -6), fuss: 88 },
  beinH: { knoechel: P(28, -5), fuss: 86 },
  formen: OFFEN,
});

/** Aufstehen (Grok D10 bis D14, 18 Frames in 6 Bildern): aufgesetzt, vorgebeugt mit Hand am Boden, Hocke mit Hand, Hocke mit Fäusten, halb auf, Stand. */
function aufstehen(): Haltung[] {
  const sitzen: Haltung = amBoden({
    huefte: P(-3, -8),
    rumpf: 18,
    kopf: -8,
    armV: { ziel: P(-15, -6), hand: 20 },
    armH: { ziel: P(-10, -6), hand: 20 },
    beinV: { knoechel: P(14, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(11, -KNOECHEL), fuss: 0 },
    formen: OFFEN,
  });
  const vorgebeugt: Haltung = {
    huefte: P(-3, -18.5),
    rumpf: -50,
    kopf: 40,
    armV: { ziel: P(15, -11), hand: 5 },
    armH: { ziel: P(4, 10), hand: 60, schulter: true },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 },
    beinH: aufSpitze(-3, -20),
    formen: OFFEN_V,
  };
  const hand: Haltung = { ...vorgebeugt, huefte: P(-2, -19.5), rumpf: -40, kopf: 32, armV: { ziel: P(17, -11), hand: 5 }, armH: { ziel: P(8, 2), hand: 150, schulter: true }, beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 } };
  const faeuste: Haltung = {
    huefte: P(-1, -21),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(10, -1), hand: 150, schulter: true },
    armH: { ziel: P(12, -3), hand: 155, schulter: true },
    beinV: { knoechel: P(11, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
  };
  return [sitzen, vorgebeugt, hand, faeuste, zwischen(faeuste, STAND), STAND];
}

/** Spott (Grok D15 bis D20, 42 Frames): Stand, winken, zeigen, Faust in die Hand schlagen (geduckt), winken, zeigen. */
function spott(): Haltung[] {
  const winken: Haltung = { ...STAND, rumpf: -10, kopf: 10, armV: { ziel: P(15, -5), hand: 160, schulter: true }, armH: { ziel: P(5, 11), hand: 80, schulter: true }, formen: OFFEN_V };
  const zeigen: Haltung = {
    ...STAND,
    rumpf: -14,
    kopf: 14,
    armV: { ziel: P(24, -38), hand: 98 },
    armH: { ziel: P(26, -41), hand: 102 },
    formen: { HandV: 'zeigen', HandH: 'offen', FaltenH: 'offen' },
    versatz: { ...STRECKUNG_ARM_V },
  };
  const faust: Haltung = {
    ...KAMPF,
    huefte: P(0, -24),
    rumpf: -22,
    kopf: 18,
    armV: { ziel: P(11, 2), hand: 120, schulter: true },
    armH: { ziel: P(13, 4), hand: 200, schulter: true },
    formen: { HandH: 'offen', FaltenH: 'offen' },
  };
  const winken2: Haltung = { ...winken, armV: { ziel: P(13, -8), hand: 185, schulter: true } };
  const zeigen2: Haltung = { ...zeigen, rumpf: -16, armV: { ziel: P(25, -36), hand: 95 } };
  return [STAND, winken, zeigen, faust, winken2, zeigen2];
}

/** Hocke im Versteck (Auftritt hocke, Welt 4.2): tief gekauert, Hand am Boden, Faust am Knie. */
export const AUFTRITT_HOCKE: Haltung = {
  huefte: P(-1, -16),
  rumpf: -44,
  kopf: 36,
  armV: { ziel: P(15, -11), hand: 5 },
  armH: { ziel: P(5, 9), hand: 120, schulter: true },
  beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 },
  beinH: aufSpitze(-1, -35),
  formen: OFFEN_V,
};

/** Aufstehen aus der Hocke (AUFTRITT, 49 Frames, werte.ts AUFTRITT_HOCKE_BOLZER): Kopf hoch, halb auf, fast aufrecht mit Deckung. */
function aufstehenHocke(): Haltung[] {
  const wach: Haltung = { ...AUFTRITT_HOCKE, huefte: P(-1, -17), rumpf: -32, kopf: 22 };
  const halb: Haltung = {
    huefte: P(-1, -21),
    rumpf: -26,
    kopf: 22,
    armV: { ziel: P(10, -1), hand: 150, schulter: true },
    armH: { ziel: P(12, -3), hand: 155, schulter: true },
    beinV: { knoechel: P(10, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-11, -KNOECHEL), fuss: 0 },
  };
  return [wach, halb, zwischen(halb, KAMPF)];
}

/** Gehalten (Grok E1): aufrecht am Kragen gepackt, zurückgelehnt, Kopf eingezogen, nahe Hand am Kragen, ferner Arm hängt. */
function gehalten(): Haltung {
  return {
    ...STAND,
    huefte: P(-1, -27),
    rumpf: 2,
    kopf: -2,
    armV: { ziel: P(8, -1), hand: 150, schulter: true },
    armH: { ziel: P(2, 12), hand: 5, schulter: true },
    beinV: { knoechel: P(5, -KNOECHEL), fuss: 0 },
    beinH: { knoechel: P(-7, -KNOECHEL), fuss: 0 },
    formen: OFFEN,
  };
}

/** Geworfen (Grok E2, E3): kopfüber getragen, dann waagrecht mit dem Gesicht nach unten, Arme nach vorn (G2-10). */
function geworfen(): Haltung[] {
  const kopfueber: Haltung = amBoden({
    huefte: P(0, -36),
    becken: 180,
    rumpf: 0,
    kopf: 0,
    armV: { ziel: P(-9, -4), hand: -25 },
    armH: { ziel: P(8, -5), hand: 25 },
    beinV: { knoechel: P(-2, -60), fuss: 175 },
    beinH: { knoechel: P(4, -61), fuss: 185 },
    formen: OFFEN,
  });
  const waagrecht: Haltung = amBoden({
    huefte: P(-6, -15),
    becken: -88,
    rumpf: 0,
    kopf: 30,
    armV: { ziel: P(29, -11), hand: 90 },
    armH: { ziel: P(31, -16), hand: 95 },
    beinV: { knoechel: P(-29, -12), fuss: -80 },
    beinH: { knoechel: P(-28, -17), fuss: -85 },
    formen: OFFEN,
  });
  return [kopfueber, waagrecht];
}

// ===========================================================================
// Animationen und Zuordnung (docs/grafik.md 4.3, 4.4)
// ===========================================================================

function animation(name: string, haltungen: readonly Haltung[], dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation {
  if (haltungen.length !== dauern.length) throw new Error(`Bolzer ${name}: ${haltungen.length} Haltungen, ${dauern.length} Dauern`);
  return animationAus(
    name,
    haltungen.map((h, i) => bildAus(zeichne(h), dauern[i] as number)),
    schleife,
    aktiv,
  );
}

export const AUFSTEHEN_HOCKE_DAUERN = aufstehenHockeDauern(AUFTRITT_HOCKE_BOLZER);

/** Schlüsselhaltungen je gezeichneter Animation (für Tests und Prüfung der Gelenke). */
export function bolzerHaltungen(): Readonly<Record<string, readonly Haltung[]>> {
  return {
    stand: [STAND],
    haltung: haltung(),
    gehen: gehen(),
    auftritt_hocke: [AUFTRITT_HOCKE],
    aufstehen_hocke: aufstehenHocke(),
    spott: spott(),
    kampfhaltung: kampfhaltung(),
    schlag_a: schlagA(),
    schlag_b: schlagB(),
    schlag_c: schlagC(),
    umwerfschlag_a: umwerfschlagA(),
    umwerfschlag_b: umwerfschlagB(),
    getroffen: getroffen(),
    umgeworfen: umgeworfen(),
    liegen: [LIEGEN],
    aufstehen: aufstehen(),
    gehalten: [gehalten()],
    geworfen: geworfen(),
  };
}

/**
 * Alle Animationen des Bolzers (Auftrag 4, 3, Zeile Bolzer). Angriffe nach
 * den Codes in werte.ts: schlag_a = BA, schlag_b = BB, schlag_c = BC,
 * umwerfschlag_a = BUA, umwerfschlag_b = BUB.
 */
export function bolzerAnimationen(): Animation[] {
  const h = bolzerHaltungen();
  const an = (name: string, dauern: readonly number[], schleife: boolean, aktiv?: readonly number[]): Animation =>
    animation(name, h[name] as readonly Haltung[], dauern, schleife, aktiv);
  const geh = an('gehen', new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true);
  const umg = an('umgeworfen', UMGEWORFEN_DAUERN, false);
  const liegen = an('liegen', [0], true);
  const angriff = (name: string, code: 'BA' | 'BB' | 'BC' | 'BUA' | 'BUB'): Animation => an(name, angriffDauern(code), false, [trefferBild(code)]);
  return [
    an('stand', [0], true),
    an('haltung', HALTUNG_DAUERN, true),
    geh,
    animationAus('gehen_schnell', mitDauern(geh.bilder, new Array<number>(GEHEN_BILDER).fill(GEHEN_SCHNELL_DAUER)), true),
    animationAus('auftritt_versteck', geh.bilder, true),
    an('auftritt_hocke', [0], true),
    an('aufstehen_hocke', AUFSTEHEN_HOCKE_DAUERN, false),
    an('spott', SPOTT_DAUERN, false),
    an('kampfhaltung', KAMPFHALTUNG_DAUERN, true),
    angriff('schlag_a', 'BA'),
    angriff('schlag_b', 'BB'),
    angriff('schlag_c', 'BC'),
    angriff('umwerfschlag_a', 'BUA'),
    angriff('umwerfschlag_b', 'BUB'),
    an('getroffen', GETROFFEN_DAUERN, false),
    umg,
    liegen,
    an('aufstehen', AUFSTEHEN_DAUERN, false),
    an('gehalten', [0], true),
    an('geworfen', GEWORFEN_DAUERN, false),
    animationAus('tot', mitDauern([...umg.bilder, ...liegen.bilder], TOT_DAUERN), false),
  ];
}

/** Animationen der Puppe: dieselben Bilder mit getauschter Palette (Auftrag 4, 3). */
export function puppeAnimationen(bolzer: readonly Animation[] = bolzerAnimationen()): Animation[] {
  return bolzer.map((a) => ({ ...a, bilder: a.bilder.map((b) => getauscht(b, PUPPE_TAUSCH)) }));
}

/** Bolzer und Puppe (Palettentausch des Bolzers) als Gliederpuppe für bauen.ts. */
export function bolzerFiguren(): Figur[] {
  const bolzer = bolzerAnimationen();
  const gemeinsam = { glanz: GLANZ_BOLZER, budget: FARBBUDGET.figur, gehen: 'gehen', schritt: GEHEN_SCHRITT } as const;
  return [
    { name: 'bolzer', umriss: UMRISS_GEGNER.Bolzer, animationen: bolzer, ...gemeinsam },
    { name: 'puppe', umriss: UMRISS_GEGNER.Puppe, animationen: puppeAnimationen(bolzer), ...gemeinsam },
  ];
}
