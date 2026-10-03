// Vela, Phase 2 (G1): Trefferreaktionen (getroffen von vorn und von hinten),
// Umgeworfen, Liegen, Aufstehen und Tod (Auftrag 4, Abschnitt 3; Zeiten in
// vela_zeiten.ts). Nach E24 sind die Grok-Blätter des Rammbocks die Vorlage
// für diese Posen (spiel/grafik/quelle/fremd/rammbock/rammbock_d_reaktionen.png,
// Reihe 1 Getroffen, Reihe 2 Umgeworfen, Reihe 3 Aufstehen): Haltung von
// Kopf, Rumpf und Gliedern nachgebaut, für die schlanke Heldin angepasst
// (schmaler, Arme und Beine gestreckter, Pferdeschwanz folgt dem Schwung).
//
// Umgeworfen fliegt die Figur vom Angreifer weg; gezeichnet ist der Flug
// nach hinten (Blick rechts, Kopf voran nach links). Liegend liegt die Hüfte
// über dem Fußpunkt, der Kopf hinten, die Füße vorn (docs/grafik.md 4.1).
//
// Alle Haltungen entstehen in Funktionen, nicht beim Laden des Moduls:
// vela.ts und diese Datei importieren sich gegenseitig. Zahlen ohne eigene
// Quelle sind Posenmaße in Spielpixeln und Grad (Festlegung G1, am
// Kontaktbogen abgestimmt).

import type { Animation } from '../blatt.ts';
import type { Punkt } from '../geometrie.ts';
import type { Arm, Bein, Haltung } from './vela.ts';
import { DECKUNG_H, KNOECHEL, STAND, animationFrei, knoechelAufSpitze, faustAmBoden, fortsetzen, gedreht, zwischen } from './vela.ts';
import { AUFSTEHEN_DAUERN, GETROFFEN_DAUERN, LIEGEN_DAUERN, UMGEWORFEN_DAUERN } from './vela_zeiten.ts';

const P = (x: number, y: number): Punkt => ({ x, y });
/** Arm relativ zur Schulter. */
const sch = (x: number, y: number, hand?: number): Arm => (hand !== undefined ? { ziel: P(x, y), hand, schulter: true } : { ziel: P(x, y), schulter: true });
/** Arm mit absolutem Ziel des Handgelenks. */
const abs = (x: number, y: number, hand?: number): Arm => (hand !== undefined ? { ziel: P(x, y), hand } : { ziel: P(x, y) });
/** Bein: Knöchel und Weltwinkel des Stiefels. */
const fuss = (x: number, y: number, winkel: number): Bein => ({ knoechel: P(x, y), fuss: winkel });

/** Drehpunkt für Flug und Liegen: Hüfte der Luftpose. */
const MITTE = P(0, -34);

// ===========================================================================
// Getroffen (Grok-Blatt D, Reihe 1): Kopf und Rumpf fliegen zurück, die Arme
// nach vorn oben; dann gekrümmt mit gesenktem Kopf; zurück in die Deckung.
// Von hinten getroffen kippt der Rumpf nach vorn, der Kopf bleibt zurück,
// die Arme fliegen nach hinten.
// ===========================================================================

function deckungTief(): Haltung {
  return { ...STAND, huefte: P(-1, -31), rumpf: -8, kopf: 6, zopf: [-50, 22] };
}

function getroffenVorn(): Haltung[] {
  const stoss: Haltung = {
    ...STAND,
    huefte: P(-1, -31.5),
    rumpf: 10,
    kopf: 8,
    armV: sch(9, -1, 150),
    armH: sch(6, 1, 140),
    zopf: [-30, 15],
    gesicht: 'getroffen',
  };
  const zurueck: Haltung = {
    ...stoss,
    huefte: P(1, -31),
    rumpf: 24,
    kopf: 22,
    armV: sch(11, -9, 165),
    armH: sch(7, -11, 170),
    beinV: fuss(9, -KNOECHEL, 0),
    beinH: fuss(-11, -KNOECHEL, 0),
    zopf: [-10, 12],
  };
  const gekruemmt: Haltung = {
    ...STAND,
    huefte: P(-1, -30),
    rumpf: -18,
    kopf: -8,
    armV: sch(6, 11, 100),
    armH: sch(5, 12, 100),
    zopf: [-65, 30],
    gesicht: 'getroffen',
  };
  const deckung = deckungTief();
  return [stoss, zurueck, gekruemmt, deckung, zwischen(deckung, STAND)];
}

function getroffenHinten(): Haltung[] {
  const stoss: Haltung = {
    ...STAND,
    huefte: P(0, -31.5),
    rumpf: -10,
    kopf: -4,
    armV: sch(-3, 9, 30),
    armH: sch(-5, 9, 20),
    zopf: [-70, 25],
    gesicht: 'getroffen',
  };
  const vor: Haltung = {
    ...stoss,
    huefte: P(3, -31),
    rumpf: -22,
    kopf: 20,
    armV: sch(-10, 5, -20),
    armH: sch(-12, 3, -30),
    beinV: fuss(10, -KNOECHEL, 0),
    beinH: knoechelAufSpitze(-0.8, -8),
    zopf: [-100, 20],
  };
  const gekruemmt: Haltung = {
    ...STAND,
    huefte: P(0, -30),
    rumpf: -16,
    kopf: 2,
    armV: sch(5, 11, 100),
    armH: sch(-2, 12, 60),
    zopf: [-70, 28],
    gesicht: 'getroffen',
  };
  const deckung = deckungTief();
  return [stoss, vor, gekruemmt, deckung, zwischen(deckung, STAND)];
}

// ===========================================================================
// Umgeworfen (Grok-Blatt D, Reihe 2): Stoß, gekrümmt nach hinten mit den
// Armen vorn oben (Stillstand), Kippen, Flug rücklings mit angezogenen
// Beinen, Aufprall; danach Liegen.
// ===========================================================================

function umgeworfen(): Haltung[] {
  const stoss: Haltung = { ...(getroffenVorn()[1] as Haltung), rumpf: 28, kopf: 24, armV: sch(12, -4, 145), armH: sch(8, -6, 150) };
  const gebogen: Haltung = {
    ...STAND,
    huefte: P(2, -33),
    rumpf: 34,
    kopf: 24,
    armV: sch(12, -7, 150),
    armH: sch(8, -9, 160),
    beinV: fuss(9, -9, -20),
    beinH: knoechelAufSpitze(2.2, -30),
    zopf: [-5, 10],
    gesicht: 'getroffen',
  };
  const kippen = gedreht(
    { ...gebogen, huefte: MITTE, rumpf: 18, kopf: 16, beinV: fuss(9, -12, -10), beinH: fuss(0, -7, -30), zopf: [10, 15] },
    40,
    MITTE,
  );
  const flug = gedreht(
    {
      ...STAND,
      huefte: MITTE,
      rumpf: 4,
      kopf: -12,
      armV: sch(11, -11, 150),
      armH: sch(8, -14, 160),
      beinV: fuss(14, -16, 30),
      beinH: fuss(12, -12, 15),
      zopf: [20, 10],
      gesicht: 'getroffen',
    },
    82,
    MITTE,
  );
  const aufprall: Haltung = {
    ...STAND,
    huefte: P(0, -6),
    rumpf: 64,
    kopf: -24,
    armV: sch(6, -14, 160),
    armH: sch(2, -16, 170),
    beinV: fuss(22, -15, 50),
    beinH: fuss(24, -10, 40),
    zopf: [30, 10],
    gesicht: 'getroffen',
  };
  return [stoss, gebogen, kippen, flug, aufprall];
}

/** Liegen (Grok-Blatt D, Reihe 2, letztes Bild): flach auf dem Rücken, Auge zu; auch das Bild des Todes (Auftrag 4, 3: tot = liegen). */
function liegen(): Haltung {
  return gedreht(
    {
      ...STAND,
      huefte: MITTE,
      rumpf: 0,
      kopf: 0,
      armV: sch(3, 19, 10),
      armH: sch(0, 19, 5),
      beinV: fuss(2, -KNOECHEL, 0),
      beinH: fuss(-1, -KNOECHEL, 5),
      zopf: [40, 0],
      gesicht: 'zu',
    },
    90,
    MITTE,
  );
}

// ===========================================================================
// Aufstehen (Grok-Blatt D, Reihe 3): auf die Hände gestützt, Sitzen mit
// angezogenen Knien, Hocke mit einer Hand am Boden, Hocke mit Deckung,
// halb hoch, Stand.
// ===========================================================================

function aufstehen(): Haltung[] {
  const stuetzen: Haltung = {
    ...STAND,
    huefte: P(0, -5),
    rumpf: 55,
    kopf: -22,
    armV: faustAmBoden(-13),
    armH: faustAmBoden(-15),
    beinV: fuss(27, -5.5, 80),
    beinH: fuss(25, -5.8, 75),
    zopf: [10, 10],
  };
  const sitzen: Haltung = {
    ...STAND,
    huefte: P(0, -5),
    rumpf: -12,
    kopf: 10,
    armV: abs(12, -15, 120),
    armH: faustAmBoden(-9),
    beinV: fuss(16, -KNOECHEL, 0),
    beinH: fuss(13, -KNOECHEL, 0),
    zopf: [-50, 30],
  };
  const dreipunkt: Haltung = {
    ...STAND,
    huefte: P(-2, -20),
    rumpf: -42,
    kopf: 32,
    armV: faustAmBoden(12),
    armH: DECKUNG_H,
    beinV: fuss(9, -KNOECHEL, 0),
    beinH: knoechelAufSpitze(-4, -25),
    zopf: [-70, 30],
  };
  const hocke: Haltung = { ...STAND, huefte: P(-1, -25), rumpf: -22, kopf: 18, armV: sch(9, 2, 135), armH: DECKUNG_H, beinV: fuss(9, -KNOECHEL, 0), beinH: knoechelAufSpitze(-2, -10), zopf: [-60, 25] };
  const halb: Haltung = { ...hocke, huefte: P(-1, -29), rumpf: -12, kopf: 10, beinH: fuss(-12, -KNOECHEL, 0), zopf: [-50, 22] };
  return [stuetzen, sitzen, dreipunkt, hocke, halb, zwischen(halb, STAND)];
}

// ===========================================================================
// Animationen
// ===========================================================================

/** Getroffen vorn und hinten, Umgeworfen, Liegen, Aufstehen, Tod (Auftrag 4, 3). */
export function reaktionAnimationen(): Animation[] {
  const liegend = liegen();
  return [
    animationFrei('getroffen_vorn', getroffenVorn(), GETROFFEN_DAUERN, false),
    fortsetzen(animationFrei('getroffen_hinten', getroffenHinten(), GETROFFEN_DAUERN, false)),
    animationFrei('umgeworfen', umgeworfen(), UMGEWORFEN_DAUERN, false),
    fortsetzen(animationFrei('liegen', [liegend], LIEGEN_DAUERN, true)),
    fortsetzen(animationFrei('aufstehen', aufstehen(), AUFSTEHEN_DAUERN, false)),
    fortsetzen(animationFrei('tot', [liegend], [0], true)),
  ];
}
