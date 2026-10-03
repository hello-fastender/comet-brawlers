// Vela, Phase 2 (G1): Griff, Kniestoß, Wurf, Spezialangriff, Sprintangriff,
// Sprint-Sprungangriff, Waffe und Aufnehmen (Auftrag 4, Abschnitt 3; Zeiten
// in vela_zeiten.ts). Haltungen wie in vela.ts; Bilder mit dem tiefsten Pixel
// auf der Ankerzeile (bildFrei, docs/grafik.md 4.1).
//
// Alle Haltungen entstehen in Funktionen, nicht beim Laden des Moduls:
// vela.ts und diese Datei importieren sich gegenseitig.
//
// Zahlen ohne eigene Quelle sind Posenmaße in Spielpixeln und Grad
// (Festlegung G1, am Kontaktbogen abgestimmt); Bezug ist die Kampfhaltung
// STAND (Hüfte −32, Schulter etwa −49, Kopf bis −66, Beinlänge 30, Arm 20).

import type { Animation } from '../blatt.ts';
import type { Punkt } from '../geometrie.ts';
import { drehe } from '../geometrie.ts';
import type { Arm, Bein, Haltung } from './vela.ts';
import {
  ARM_H_VORN,
  BEIN_V_VORN,
  DECKUNG_H,
  GEHEN_BILDER,
  GEHEN_DAUER,
  HAND_MITTE,
  KNOECHEL,
  PUPPE_VELA,
  STAND,
  STRECKUNG_ARM,
  animationFrei,
  knoechelAufSpitze,
  faustAmBoden,
  fortsetzen,
  gedreht,
  gehen,
  knieAmBoden,
  pose,
  zwischen,
} from './vela.ts';
import {
  AKTIV_AB,
  AUFNEHMEN_DAUERN,
  GRIFF_DAUERN,
  KNIESTOSS_DAUERN,
  SPEZIAL_AKTIV_BILDER,
  SPEZIAL_DAUERN,
  SPEZIAL_FOLGE,
  SPRINTANGRIFF_DAUERN,
  SPRINT_SPRUNGANGRIFF_DAUERN,
  SS_AKTIV_BILDER,
  WAFFE_SCHUSS_DAUERN,
  WURF_DAUERN,
  bildZurUhr,
} from './vela_zeiten.ts';
import { HALTELAGE } from '../../../src/kern/werte.ts';

const P = (x: number, y: number): Punkt => ({ x, y });
/** Arm relativ zur Schulter. */
const sch = (x: number, y: number, hand?: number): Arm => (hand !== undefined ? { ziel: P(x, y), hand, schulter: true } : { ziel: P(x, y), schulter: true });
/** Arm mit absolutem Ziel des Handgelenks. */
const abs = (x: number, y: number, hand?: number): Arm => (hand !== undefined ? { ziel: P(x, y), hand } : { ziel: P(x, y) });
/** Bein: Knöchel und Weltwinkel des Stiefels. */
const fuss = (x: number, y: number, winkel: number): Bein => ({ knoechel: P(x, y), fuss: winkel });

// ===========================================================================
// Griff, Kniestoß, Wurf (Kampf 8): der Gehaltene steht in der Haltelage,
// HALTELAGE = 19 px vor der Figur (werte.ts); Velas Handschuhe fassen ihn an
// Kragen und Schulter (x 10 bis 16, Höhe 42 bis 50).
// ===========================================================================

/**
 * Griffpunkte der Handgelenke (Klammergriff, beide Fäuste am Kragen des
 * Gehaltenen): vorn HALTELAGE − 5, hinten HALTELAGE − 7 px vor der Figur,
 * Kragenhöhe 49 bzw. 47 px (Nahkämpfer 67 bis 72 px hoch).
 */
const KRAGEN = P(HALTELAGE - 5, -49);
const SCHULTER = P(HALTELAGE - 7, -47);

/** Haltebild des Griffs (auch letztes Bild des Kniestoßes). */
function halten(): Haltung {
  return {
    ...STAND,
    huefte: P(0, -31.5),
    rumpf: -12,
    kopf: 10,
    armV: abs(KRAGEN.x, KRAGEN.y, 100),
    armH: abs(SCHULTER.x, SCHULTER.y, 110),
    beinV: fuss(11, -KNOECHEL, 0),
    beinH: fuss(-12, -KNOECHEL, 0),
    zopf: [-55, 22],
  };
}

function griff(): Haltung[] {
  const h = halten();
  const greifen: Haltung = {
    ...h,
    huefte: P(2, -31),
    rumpf: -18,
    kopf: 16,
    armV: abs(KRAGEN.x + 4, KRAGEN.y - 1, 90),
    armH: sch(9, 3, 130),
    beinV: fuss(13, -KNOECHEL, 0),
    zopf: [-65, 25],
  };
  const fassen: Haltung = { ...zwischen(greifen, h), armV: abs(KRAGEN.x + 2, KRAGEN.y, 95) };
  const ziehen: Haltung = { ...h, huefte: P(-1, -31.5), rumpf: -6, kopf: 6, armV: abs(KRAGEN.x - 1, KRAGEN.y + 1, 102), armH: abs(SCHULTER.x - 1, SCHULTER.y + 1, 112), zopf: [-45, 20] };
  return [greifen, fassen, ziehen, h];
}

function kniestoss(): Haltung[] {
  const h = halten();
  const ziehen: Haltung = {
    ...h,
    huefte: P(-1, -32),
    rumpf: -6,
    kopf: 6,
    armV: abs(KRAGEN.x - 1, KRAGEN.y + 5, 100),
    armH: abs(SCHULTER.x - 1, SCHULTER.y + 5, 110),
    beinV: fuss(6, -12, -25),
    ebenen: BEIN_V_VORN,
    zopf: [-50, 20],
  };
  const heben: Haltung = { ...ziehen, huefte: P(-1, -33), beinV: fuss(5, -20, -40), zopf: [-45, 18] };
  const treffer: Haltung = {
    ...ziehen,
    huefte: P(1, -34),
    rumpf: 2,
    kopf: 2,
    armV: abs(KRAGEN.x + 1, KRAGEN.y + 9, 100),
    armH: abs(SCHULTER.x, SCHULTER.y + 9, 110),
    beinV: fuss(8, -28, -50),
    beinH: fuss(-11, -KNOECHEL, 0),
    zopf: [-35, 12],
  };
  const senken: Haltung = zwischen(treffer, ziehen);
  return [ziehen, heben, treffer, senken, ziehen, h];
}

/** Wurf über Kopf (dieselben Bilder vorwärts und rückwärts, docs/design.md 8): anheben, über den Kopf, Loslassen nach oben, Nachlauf. */
function wurf(): Haltung[] {
  const h = halten();
  const hocke: Haltung = {
    ...h,
    huefte: P(-1, -27),
    rumpf: -14,
    kopf: 12,
    armV: abs(KRAGEN.x - 2, -43, 95),
    armH: abs(SCHULTER.x - 1, -38, 100),
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: fuss(-13, -KNOECHEL, 0),
    zopf: [-55, 25],
  };
  const heben: Haltung = {
    ...hocke,
    huefte: P(-2, -32),
    rumpf: 10,
    kopf: -6,
    armV: abs(9, -63, 150),
    armH: abs(5, -60, 150),
    zopf: [-40, 20],
  };
  const ueberKopf: Haltung = {
    ...heben,
    huefte: P(-2, -33),
    rumpf: 14,
    kopf: -10,
    armV: abs(1, -78, 185),
    armH: abs(-3, -76, 185),
    beinH: fuss(-13, -KNOECHEL, 0),
    zopf: [-30, 15],
  };
  const los: Haltung = {
    ...ueberKopf,
    huefte: P(0, -33),
    rumpf: -6,
    kopf: 2,
    armV: abs(9, -78, 175),
    armH: abs(5, -77, 175),
    zopf: [-75, 25],
  };
  const senken: Haltung = { ...STAND, huefte: P(-1, -31), rumpf: -8, kopf: 8, armV: sch(12, -4, 140), armH: sch(9, -2, 140), zopf: [-60, 22] };
  return [hocke, heben, ueberKopf, los, senken, zwischen(senken, STAND)];
}

// ===========================================================================
// Spezialangriff (Kampf 9.4; docs/design.md 5: kniet, schlägt die Handschuhe
// auf den Boden, eine Welle aus Eissplittern läuft nach beiden Seiten; die
// Welle zeichnet G4 als Effekt). 7 Bilder, die zweite Hälfte rückwärts.
// ===========================================================================

function spezial(): Haltung[] {
  const hocke: Haltung = {
    ...STAND,
    huefte: P(-1, -30),
    rumpf: -6,
    kopf: 6,
    armV: sch(3, 13, 70),
    armH: sch(1, 13, 70),
    beinV: fuss(9, -KNOECHEL, 0),
    beinH: fuss(-11, -KNOECHEL, 0),
    zopf: [-50, 20],
  };
  const ausholen: Haltung = {
    ...hocke,
    huefte: P(0, -34),
    rumpf: 6,
    kopf: -8,
    armV: sch(5, -18, 180),
    armH: sch(1, -18, 180),
    beinV: knoechelAufSpitze(16, -10),
    beinH: knoechelAufSpitze(-0.6, -15),
    zopf: [-20, 15],
  };
  const fallen: Haltung = {
    ...hocke,
    huefte: P(-1, -27),
    rumpf: -10,
    kopf: 8,
    armV: sch(10, -14, 160),
    armH: sch(6, -14, 160),
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: knoechelAufSpitze(-8.5, -40),
    zopf: [-30, 12],
  };
  const schlag: Haltung = {
    ...hocke,
    huefte: P(-2, -21),
    rumpf: -30,
    kopf: 24,
    armV: abs(17, -24, 40),
    armH: abs(13, -22, 40),
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: knieAmBoden(-15),
    zopf: [-15, 5],
  };
  const boden: Haltung = {
    ...schlag,
    huefte: P(-2, -18),
    rumpf: -40,
    kopf: 30,
    armV: faustAmBoden(14),
    armH: faustAmBoden(10),
    beinH: knieAmBoden(-16),
    zopf: [-5, 5],
  };
  const boden2: Haltung = { ...boden, huefte: P(-2, -17.5), kopf: 32, zopf: [-25, 15] };
  const boden3: Haltung = { ...boden, huefte: P(-2, -18), kopf: 30, zopf: [-45, 25] };
  const bilder = [hocke, ausholen, fallen, schlag, boden, boden2, boden3];
  return SPEZIAL_FOLGE.map((i) => bilder[i] as Haltung);
}

// ===========================================================================
// Sprintangriff und Sprint-Sprungangriff (Kampf 9.3)
// ===========================================================================

/** Sprintangriff (SA, vorn 105, hinten 26): Ausfallfaust aus dem Sprint, rutscht nach. */
function sprintangriff(): Haltung[] {
  const bremsen: Haltung = {
    ...STAND,
    huefte: P(0, -29),
    rumpf: -14,
    kopf: 12,
    armV: sch(-6, 5, 150),
    armH: DECKUNG_H,
    beinV: fuss(12, -KNOECHEL, 0),
    beinH: fuss(-12, -KNOECHEL, 0),
    zopf: [-85, 18],
  };
  const ansatz: Haltung = { ...bremsen, huefte: P(5, -28), rumpf: -22, kopf: 18, armV: sch(5, 9, 95), beinV: fuss(18, -KNOECHEL, 0), beinH: knoechelAufSpitze(-5.6, -15), zopf: [-88, 15] };
  const treffer: Haltung = {
    ...bremsen,
    huefte: P(12, -26),
    rumpf: -34,
    kopf: 26,
    armV: abs(52, -40, 90),
    armH: sch(-14, 7, 30),
    beinV: fuss(28, -KNOECHEL, 0),
    beinH: knoechelAufSpitze(-10.3, -20),
    versatz: { OberarmV: P(3, 0), ...STRECKUNG_ARM },
    zopf: [-95, 10],
  };
  const strecken: Haltung = { ...zwischen(ansatz, treffer), versatz: {} };
  const rutschen: Haltung = { ...treffer, huefte: P(11, -27), rumpf: -27, kopf: 20, armV: abs(40, -43, 100), versatz: { OberarmV: P(1, 0) }, zopf: [-80, 18] };
  return [bremsen, ansatz, strecken, treffer, rutschen, zwischen(rutschen, STAND)];
}

/** Drehpunkt des Hechtsprungs (Hüfte der Luftpose). */
const HECHT_MITTE = P(0, -34);

/**
 * Sprint-Sprungangriff (SS, 38 bis 147 vor der Figur, nichts dahinter):
 * Hechtsprung mit beiden Fäusten voran, waagrecht; landet in der Hocke mit
 * den Fäusten vorn (Bild 4, solange die Instanz in der Landung läuft).
 */
function sprintSprungangriff(): Haltung[] {
  const hocke: Haltung = {
    ...STAND,
    huefte: HECHT_MITTE,
    rumpf: -10,
    kopf: 8,
    armV: sch(-4, 6, 160),
    armH: sch(-6, 8, 150),
    beinV: fuss(8, -21, 12),
    beinH: fuss(-1, -16, -20),
    zopf: [-80, 20],
  };
  // gestreckte Haltung im Körperrahmen: Arme über den Kopf, Beine gestreckt (wird um HECHT_MITTE nach vorn gekippt)
  const gestreckt: Haltung = {
    ...STAND,
    huefte: HECHT_MITTE,
    rumpf: 0,
    kopf: 60,
    armV: sch(9, -17, 170),
    armH: sch(6, -18, 175),
    beinV: fuss(3, -KNOECHEL - 1, -70),
    beinH: fuss(-1, -KNOECHEL, -75),
    zopf: [-20, 10],
    ebenen: ARM_H_VORN,
  };
  const ansatz = gedreht({ ...gestreckt, kopf: 30, beinV: fuss(5, -10, -40), beinH: fuss(-2, -8, -50) }, -40, HECHT_MITTE);
  const treffer = gedreht(gestreckt, -75, HECHT_MITTE);
  const nach = gedreht({ ...gestreckt, kopf: 50, beinV: fuss(4, -8, -60), zopf: [-35, 15] }, -85, HECHT_MITTE);
  const landen: Haltung = {
    ...STAND,
    huefte: P(0, -20),
    rumpf: -30,
    kopf: 24,
    armV: abs(25, -20, 90),
    armH: abs(21, -18, 90),
    beinV: fuss(12, -KNOECHEL, 0),
    beinH: knieAmBoden(-14),
    zopf: [-100, 20],
  };
  return [hocke, ansatz, treffer, nach, landen];
}

// ===========================================================================
// Waffe (Kampf 10.3): Raketenwerfer auf der vorderen Schulter, die vordere
// Faust am Griff unter dem Rohr. Den Werfer zeichnet G4 als eigenes Bild
// (gegenstaende.ts, WERFER: Griffpunkt (−3; −1,5), Rohrachse 3 px darüber,
// Schulterpolster 6 bis 10 px hinter dem Griff); die Darstellung legt seinen
// Griffpunkt auf den Werferpunkt (Mitte des vorderen Handschuhs) und zeichnet
// ihn vor Vela (docs/grafik.md 4.1, G1-7). So liegt das Polster auf der
// Schulter, das Rohr auf Kinnhöhe und die Mündung 26 px vor dem Fußpunkt.
// ===========================================================================

/**
 * Vordere Faust aufrecht (Hand 180) am Griff, relativ zur Schulter: Mitte des
 * Handschuhs 9 px vor und 2,8 px über dem Schultergelenk, damit das Polster
 * des Werfers (8 px hinter dem Griff, 0,5 px darüber) auf der Schulter liegt
 * (Oberarm r 3,4). Die hintere Faust stützt das Rohr hinter dem Griff.
 */
const HALTEN_V = sch(9, 0.7, 180);
const HALTEN_H = sch(8.5, 2.5, 170);

function waffeStand(): Haltung {
  return { ...STAND, armV: HALTEN_V, armH: HALTEN_H };
}

function waffeGehen(): Haltung[] {
  return gehen().map((h) => ({ ...h, armV: HALTEN_V, armH: HALTEN_H }));
}

function waffeSchuss(): Haltung[] {
  const zielen: Haltung = { ...STAND, huefte: P(-1, -31), rumpf: -8, kopf: 8, armV: HALTEN_V, armH: HALTEN_H, beinV: fuss(11, -KNOECHEL, 0), beinH: fuss(-13, -KNOECHEL, 0), zopf: [-50, 20] };
  const rueckstoss: Haltung = { ...zielen, huefte: P(-3, -31.5), rumpf: 2, kopf: -2, beinH: fuss(-14, -KNOECHEL, 0), zopf: [-25, 15] };
  return [zielen, rueckstoss, zwischen(rueckstoss, zielen)];
}

/** Aufnehmen (Kampf 10.1): bücken, die vordere Faust greift am Boden, wieder hoch mit dem Gegenstand vor der Brust. */
function aufnehmen(): Haltung[] {
  const buecken: Haltung = {
    ...STAND,
    huefte: P(-1, -25),
    rumpf: -30,
    kopf: 20,
    armV: abs(15, -12, 20),
    armH: DECKUNG_H,
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: fuss(-11, -KNOECHEL, 0),
    zopf: [-60, 25],
  };
  const greifen: Haltung = { ...buecken, huefte: P(-1, -22), rumpf: -38, kopf: 26, armV: faustAmBoden(16), zopf: [-55, 25] };
  const hoch: Haltung = { ...zwischen(greifen, STAND), armV: sch(9, 4, 140) };
  return [buecken, greifen, hoch];
}

/**
 * Werferpunkt je Bild der Waffenanimationen (px vom Fußpunkt, x nach vorn,
 * y nach oben negativ): Mitte des vorderen Handschuhs, gerundet. Für
 * docs/grafik.md 4.1 und die Darstellung (G7).
 */
export function werferPunkte(): Record<string, Punkt[]> {
  const punkt = (h: Haltung): Punkt => {
    const l = PUPPE_VELA.lagen(pose(h)).get('HandV') as { pos: Punkt; winkel: number };
    const m = drehe(P(0, HAND_MITTE), l.winkel);
    return P(Math.round(l.pos.x + m.x), Math.round(l.pos.y + m.y));
  };
  return {
    waffe_stand: [punkt(waffeStand())],
    waffe_gehen: waffeGehen().map(punkt),
    waffe_schuss: waffeSchuss().map(punkt),
  };
}

// ===========================================================================
// Animationen
// ===========================================================================

/** Griff, Kniestoß, Wurf, Spezialangriff, Sprintangriff, Sprint-Sprungangriff (Auftrag 4, 3). */
export function kampfAnimationen(): Animation[] {
  return [
    animationFrei('griff', griff(), GRIFF_DAUERN, false),
    fortsetzen(animationFrei('kniestoss', kniestoss(), KNIESTOSS_DAUERN, false, [bildZurUhr(KNIESTOSS_DAUERN, AKTIV_AB.kniestoss)])),
    animationFrei('wurf', wurf(), WURF_DAUERN, false, [bildZurUhr(WURF_DAUERN, AKTIV_AB.wurf)]),
    fortsetzen(animationFrei('spezial', spezial(), SPEZIAL_DAUERN, false, SPEZIAL_AKTIV_BILDER)),
    animationFrei('sprintangriff', sprintangriff(), SPRINTANGRIFF_DAUERN, false, [bildZurUhr(SPRINTANGRIFF_DAUERN, AKTIV_AB.sprintangriff)]),
    fortsetzen(animationFrei('sprint_sprungangriff', sprintSprungangriff(), SPRINT_SPRUNGANGRIFF_DAUERN, false, SS_AKTIV_BILDER)),
  ];
}

/** Waffe (stehen, gehen, schießen) und Aufnehmen (Auftrag 4, 3). */
export function waffeAnimationen(): Animation[] {
  return [
    animationFrei('waffe_stand', [waffeStand()], [0], true),
    fortsetzen(animationFrei('waffe_gehen', waffeGehen(), new Array<number>(GEHEN_BILDER).fill(GEHEN_DAUER), true)),
    fortsetzen(animationFrei('waffe_schuss', waffeSchuss(), WAFFE_SCHUSS_DAUERN, false, [bildZurUhr(WAFFE_SCHUSS_DAUERN, AKTIV_AB.waffe_schuss)])),
    animationFrei('aufnehmen', aufnehmen(), AUFNEHMEN_DAUERN, false),
  ];
}
