// Vela, Phase 2 (G1): Bewegung in der Luft und am Boden ohne Gegner: Sprint,
// Sprung, die vier Sprungangriffe und der Neueinstieg (Auftrag 4, Abschnitt 3;
// Zeiten in vela_zeiten.ts). Haltungen wie in vela.ts (Hüfte, Neigung,
// Ziele von Händen und Knöcheln); Bilder in der Luft stehen mit dem tiefsten
// Pixel auf der Ankerzeile (bildFrei, docs/grafik.md 4.1).
//
// Alle Haltungen entstehen in Funktionen, nicht beim Laden des Moduls:
// vela.ts und diese Datei importieren sich gegenseitig.
//
// Zahlen ohne eigene Quelle sind Posenmaße in Spielpixeln und Grad
// (Festlegung G1, am Kontaktbogen abgestimmt); Bezug ist die Kampfhaltung
// STAND (Hüfte −32, Schulter etwa −49, Kopf bis −66, Beinlänge 30, Arm 20).

import type { Animation } from '../blatt.ts';
import type { Punkt } from '../geometrie.ts';
import type { Arm, Bein, Haltung } from './vela.ts';
import { BEIN_V_VORN, DECKUNG_H, KNOECHEL, STAND, STRECKUNG_ARM, STRECKUNG_BEIN, animationFrei, faustAmBoden, fortsetzen, gedreht, knieAmBoden, zwischen } from './vela.ts';
import {
  AKTIV_AB,
  NEUEINSTIEG_FALL_DAUERN,
  NEUEINSTIEG_LANDUNG_DAUERN,
  SPRINT_DAUERN,
  SPRUNGANGRIFF_H_DAUERN,
  SPRUNGANGRIFF_N_DAUERN,
  SPRUNGANGRIFF_R_DAUERN,
  SPRUNGANGRIFF_T_DAUERN,
  SPRUNG_DAUERN,
  bildZurUhr,
} from './vela_zeiten.ts';
import { SPRINT_V_START } from '../../../src/kern/werte.ts';
import { EINS } from '../../../src/kern/festkomma.ts';

const P = (x: number, y: number): Punkt => ({ x, y });

/** Arm relativ zur Schulter. */
const sch = (x: number, y: number, hand?: number): Arm => (hand !== undefined ? { ziel: P(x, y), hand, schulter: true } : { ziel: P(x, y), schulter: true });
/** Bein: Knöchel und Weltwinkel des Stiefels. */
const fuss = (x: number, y: number, winkel: number): Bein => ({ knoechel: P(x, y), fuss: winkel });

// ===========================================================================
// Sprint: 6 Bilder zu 4 Frames (docs/design.md 8), längere Schritte und
// Vorlage (Auftrag 4, 1.4). Der Standfuß rückt je Bild um 4 Frames
// Sprinttempo zurück: 4 · 3,875 = 15,5 px (werte.ts SPRINT_V_START, Tempo der
// ersten Stufe; danach sinkt es bis 2,125, der Fuß rutscht dann leicht).
// ===========================================================================

/** px je Bild im Sprint: Frames je Bild · Sprinttempo der ersten Stufe (werte.ts). */
export const SPRINT_SCHRITT = (SPRINT_DAUERN[0] * SPRINT_V_START) / EINS;

/**
 * Lage eines Fußes im Sprintzyklus, k = 0 … 5: Aufsetzen vorn (0), Stand
 * (1, ein Schritt weiter hinten), Abdruck über die Spitze (2), Ferse hoch
 * hinten (3), Knie vorn hoch (4), Vorschwingen (5).
 */
function sprintFuss(k: number): Bein {
  const vorn = 12;
  switch (k) {
    case 0:
      return fuss(vorn, -KNOECHEL, 6);
    case 1:
      return fuss(vorn - SPRINT_SCHRITT, -KNOECHEL, 0);
    case 2:
      return fuss(-15, -10, -45);
    case 3:
      return fuss(-13, -20, -80);
    case 4:
      return fuss(1, -23, -30);
    default:
      return fuss(11, -15, -5);
  }
}

function sprint(): Haltung[] {
  const aus: Haltung[] = [];
  const hy = [-30.5, -31.5, -32.5, -30.5, -31.5, -32.5];
  for (let i = 0; i < 6; i++) {
    const phase = (2 * Math.PI * i) / 6;
    // Arme gegen die Beine: aufsetzendes vorderes Bein (Bild 0), vorderer Arm hinten
    const s = -Math.cos(phase);
    const arm = (t: number): Arm => sch(1 + 9 * t, 10 - 7 * Math.max(0, t), 95 + 60 * t);
    aus.push({
      huefte: P(2, hy[i] as number),
      rumpf: -16,
      kopf: 12,
      armV: arm(s),
      armH: arm(-s),
      beinV: sprintFuss(i),
      beinH: sprintFuss((i + 3) % 6),
      zopf: [-95 + 8 * Math.sin(phase * 2), 12 + 6 * Math.cos(phase * 2)],
    });
  }
  return aus;
}

// ===========================================================================
// Sprung: 3 Steigen, Scheitel, 3 Fallen, 2 Landung (Auftrag 4, 3)
// ===========================================================================

/** Hüfte der Luftbilder (Rumpf wie im Stand; der tiefste Pixel steht auf der Ankerzeile). */
const LUFT_HUEFTE = P(0, -34);

/** Luftbilder des Sprungs: Steigen 0 bis 2, Scheitel 3, Fallen 4 bis 6. */
export function sprungLuft(): Haltung[] {
  const basis: Haltung = { ...STAND, huefte: LUFT_HUEFTE, rumpf: -6, kopf: 6 };
  const absprung: Haltung = {
    ...basis,
    rumpf: -8,
    armV: sch(13, -5, 150),
    armH: sch(-7, 7, 40),
    beinV: fuss(7, -17, -5),
    beinH: fuss(-5, -4, -40),
    zopf: [-30, 18],
  };
  const steigen2: Haltung = { ...absprung, armV: sch(12, -2, 145), armH: sch(-3, 8, 70), beinV: fuss(8, -21, 8), beinH: fuss(-3, -12, -30), zopf: [-18, 14] };
  const steigen3: Haltung = { ...basis, armV: sch(10, 1, 140), armH: DECKUNG_H, beinV: fuss(8, -22, 12), beinH: fuss(-1, -16, -20), zopf: [-15, 10] };
  const scheitel: Haltung = { ...basis, rumpf: -10, kopf: 8, armV: sch(10, 2, 135), armH: DECKUNG_H, beinV: fuss(7, -23, 15), beinH: fuss(0, -19, -8), zopf: [-55, 40] };
  const fallen1: Haltung = { ...basis, armV: sch(11, -1, 120), armH: sch(7, 3, 120), beinV: fuss(8, -16, 10), beinH: fuss(-3, -13, -15), zopf: [-110, 25] };
  const fallen2: Haltung = { ...basis, rumpf: -4, armV: sch(13, -3, 100), armH: sch(-5, 6, 60), beinV: fuss(9, -9, 6), beinH: fuss(-6, -7, -8), zopf: [-125, 15] };
  const fallen3: Haltung = { ...basis, rumpf: -4, huefte: P(0, -33), armV: sch(12, 0, 105), armH: sch(-2, 8, 70), beinV: fuss(9, -KNOECHEL, 8), beinH: fuss(-9, -4, -6), zopf: [-120, 10] };
  return [absprung, steigen2, steigen3, scheitel, fallen1, fallen2, fallen3];
}

/** Landebilder (LANDUNG uhr 1 bis 6): tiefe Hocke, dann halb hoch. */
export function sprungLandung(): Haltung[] {
  const hocke: Haltung = {
    ...STAND,
    huefte: P(-1, -25),
    rumpf: -18,
    kopf: 14,
    armV: sch(11, 7, 115),
    armH: sch(6, 9, 115),
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: fuss(-12, -KNOECHEL, 0),
    zopf: [-115, 25],
  };
  const halb: Haltung = { ...zwischen(hocke, STAND), zopf: [-70, 20] };
  return [hocke, halb];
}

// ===========================================================================
// Sprungangriffe (Kampf 5.2): neutral, Richtung, hoch, runter
// ===========================================================================

/** Hockende Luftpose als Ausgang der Sprungangriffe. */
function hockeLuft(): Haltung {
  return { ...STAND, huefte: LUFT_HUEFTE, rumpf: -8, kopf: 8, armV: sch(10, 1, 140), armH: DECKUNG_H, beinV: fuss(8, -21, 12), beinH: fuss(-1, -16, -20), zopf: [-40, 25] };
}

/**
 * Neutral (SN, vorn 76, hinten 27, Höhe ≤ 45): Sprungfaust schräg nach unten
 * mit der vorderen Faust, Knie angezogen; Rückzug mit Bild 1 und 0
 * (docs/design.md 8).
 */
function sprungangriffNeutral(): Haltung[] {
  const hocke = hockeLuft();
  const ausholen: Haltung = { ...hocke, rumpf: -6, kopf: 6, armV: sch(-3, 7, 170), zopf: [-35, 22] };
  const treffer: Haltung = {
    ...hocke,
    rumpf: -28,
    kopf: 20,
    armV: sch(16, 12, 55),
    armH: sch(-6, 9, 40),
    beinV: fuss(5, -19, 20),
    beinH: fuss(-4, -14, -30),
    zopf: [-70, 25],
    versatz: { OberarmV: P(2, 0), ...STRECKUNG_ARM },
  };
  const schwung: Haltung = { ...zwischen(ausholen, treffer), zopf: [-55, 24] };
  return [ausholen, schwung, treffer, schwung, ausholen];
}

/**
 * Richtung (SR, vorn 99, hinten 24, Höhe ≤ 41): Flugtritt mit dem vorderen
 * Bein waagrecht nach vorn, Oberkörper zurück; danach Einziehen, Hocke,
 * Fallpose.
 */
function sprungangriffRichtung(fall: Haltung): Haltung[] {
  const hocke = hockeLuft();
  const anziehen: Haltung = { ...hocke, rumpf: 6, kopf: -4, beinV: fuss(10, -27, 40), beinH: fuss(-2, -15, -25), ebenen: BEIN_V_VORN, zopf: [-35, 15] };
  const tritt: Haltung = {
    ...hocke,
    huefte: P(3, -34),
    rumpf: 22,
    kopf: -16,
    armV: sch(7, 3, 130),
    armH: sch(-12, 5, 40),
    beinV: fuss(38, -34, 88),
    beinH: fuss(-4, -17, -45),
    versatz: STRECKUNG_BEIN,
    ebenen: BEIN_V_VORN,
    zopf: [-20, 8],
  };
  return [hocke, anziehen, tritt, anziehen, hocke, fall];
}

/** Drehpunkt des Saltos: Mitte der gehockten Figur (Knie vorn), damit die Kugel auf der Stelle dreht. */
const SALTO_MITTE = P(4, -36);

/**
 * Hoch (SH, vorn 85, hinten 32, Höhe ≤ 48): Saltotritt. Aus der Hocke kippt
 * Vela nach hinten, das vordere Bein schlägt nach vorn oben (Trefferbild),
 * dann dreht sie gehockt rückwärts einmal herum und öffnet zur Fallpose.
 */
function sprungangriffHoch(fall: Haltung): Haltung[] {
  const ball: Haltung = {
    ...STAND,
    huefte: P(0, -30),
    rumpf: -22,
    kopf: 12,
    armV: sch(8, 7, 150),
    armH: sch(7, 9, 140),
    beinV: fuss(9, -22, 25),
    beinH: fuss(4, -19, 5),
    zopf: [-40, 20],
  };
  const vor: Haltung = { ...ball, rumpf: -12, kopf: 8, beinV: fuss(8, -15, 5), beinH: fuss(-2, -11, -20), zopf: [-30, 15] };
  const kippen: Haltung = gedreht({ ...ball, beinV: fuss(10, -27, 45), ebenen: BEIN_V_VORN }, 25, SALTO_MITTE);
  const treffer: Haltung = {
    ...STAND,
    huefte: P(0, -30),
    becken: 35,
    rumpf: 4,
    kopf: -8,
    armV: sch(-6, 12, 20),
    armH: sch(-9, 10, 10),
    beinV: fuss(26, -50, 125),
    beinH: fuss(-7, -21, -40),
    versatz: STRECKUNG_BEIN,
    ebenen: BEIN_V_VORN,
    zopf: [-5, 5],
  };
  const drehung = [80, 125, 170, 215, 260, 300, 335].map((w) => gedreht(ball, w, SALTO_MITTE));
  return [vor, kippen, treffer, ...drehung, zwischen(ball, fall)];
}

/** Runter (ST, vorn 42, hinten 41, Höhe ≤ 41): Stampfer, beide Beine gestreckt nach unten, Arme hoch; hält bis zur Landung. */
function sprungangriffRunter(): Haltung[] {
  const hocke: Haltung = { ...hockeLuft(), armV: sch(8, -2, 150), armH: sch(5, 0, 150), zopf: [-60, 30] };
  const strecken: Haltung = {
    ...hocke,
    rumpf: -2,
    kopf: 2,
    armV: sch(10, -7, 160),
    armH: sch(-8, -6, 205),
    beinV: fuss(5, -12, -40),
    beinH: fuss(-2, -11, -45),
    zopf: [-120, 20],
  };
  const stampfen: Haltung = {
    ...strecken,
    huefte: P(0, -35),
    rumpf: 0,
    kopf: -8,
    armV: sch(14, -5, 135),
    armH: sch(-12, -6, 220),
    beinV: fuss(3, -7, -62),
    beinH: fuss(-1, -6, -62),
    zopf: [-150, 10],
  };
  return [hocke, strecken, stampfen];
}

// ===========================================================================
// Neueinstieg (Kampf 6.5): Fall aus 256 px Höhe, Landung mit Wucht
// ===========================================================================

function neueinstiegFall(): Haltung[] {
  const a: Haltung = {
    ...STAND,
    huefte: P(0, -34),
    rumpf: 0,
    kopf: -6,
    armV: sch(12, -8, 150),
    armH: sch(-10, -9, 210),
    beinV: fuss(6, -11, -20),
    beinH: fuss(-3, -5, -45),
    zopf: [-150, 25],
  };
  const b: Haltung = { ...a, armV: sch(13, -6, 140), armH: sch(-11, -7, 200), beinV: fuss(7, -13, -15), zopf: [-140, 10] };
  return [a, b];
}

/** Landung des Neueinstiegs: ein Knie und die vordere Faust am Boden, dann halb hoch. */
function neueinstiegLandung(): Haltung[] {
  const knien: Haltung = {
    ...STAND,
    huefte: P(-2, -16),
    rumpf: -42,
    kopf: 32,
    armV: faustAmBoden(13),
    armH: sch(-8, 6, 40),
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: knieAmBoden(-16),
    zopf: [-130, 25],
  };
  const hoch: Haltung = { ...zwischen(knien, STAND), armV: sch(11, 4, 125), armH: DECKUNG_H, zopf: [-80, 20] };
  return [knien, hoch];
}

// ===========================================================================
// Animationen
// ===========================================================================

/** Sprint, Sprung und Sprungangriffe (Auftrag 4, 3). */
export function bewegungAnimationen(): Animation[] {
  const luft = sprungLuft();
  const fall = luft[luft.length - 1] as Haltung;
  return [
    animationFrei('sprint', sprint(), SPRINT_DAUERN, true),
    animationFrei('sprung', [...luft, ...sprungLandung()], SPRUNG_DAUERN, false),
    fortsetzen(animationFrei('sprungangriff', sprungangriffNeutral(), SPRUNGANGRIFF_N_DAUERN, false, [bildZurUhr(SPRUNGANGRIFF_N_DAUERN, AKTIV_AB.sprungangriff)])),
    animationFrei('richtung', sprungangriffRichtung(fall), SPRUNGANGRIFF_R_DAUERN, false, [bildZurUhr(SPRUNGANGRIFF_R_DAUERN, AKTIV_AB.richtung)]),
    animationFrei('hoch', sprungangriffHoch(fall), SPRUNGANGRIFF_H_DAUERN, false, [bildZurUhr(SPRUNGANGRIFF_H_DAUERN, AKTIV_AB.hoch)]),
    fortsetzen(animationFrei('runter', sprungangriffRunter(), SPRUNGANGRIFF_T_DAUERN, false, [bildZurUhr(SPRUNGANGRIFF_T_DAUERN, AKTIV_AB.runter)])),
  ];
}

/** Neueinstieg: Fall (Schleife) und Landung (Auftrag 4, 3). */
export function neueinstiegAnimationen(): Animation[] {
  return [
    fortsetzen(animationFrei('neueinstieg_fall', neueinstiegFall(), NEUEINSTIEG_FALL_DAUERN, true)),
    fortsetzen(animationFrei('neueinstieg_landung', neueinstiegLandung(), NEUEINSTIEG_LANDUNG_DAUERN, false)),
  ];
}
