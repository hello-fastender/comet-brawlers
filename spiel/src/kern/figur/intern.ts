// Interner Zustand der Spielfigur (K1) und die Annahme der Eingaben nach
// docs/spezifikation-kampf.md, 2.1 (T(f−1), neue Drücke, kein Eingabepuffer)
// und 4.3 („Drücke ab X“).
//
// Felder, die entitaeten.ts für die Figur nicht vorsieht, stehen hier in
// einem Zustandsobjekt je Figur (WeakMap, nie iteriert). VORSCHLAG: die
// Felder tiefe_ab, stand_ab, sprung_dx, ss_n, los_frame, liege_ende und die
// Liste der Wurfgeschosse in Figur (entitaeten.ts) aufnehmen.

import type { Angriffsinstanz, Blick, Figur, SlotKey } from '../entitaeten.ts';
import type { Tasten } from '../tasten.ts';
import type { Welt } from '../welt.ts';
import { KEINE, TASTE_A, TASTE_S, hat, richtungX, richtungZ, richtungsteil } from '../tasten.ts';

/** Schwelle „nie“: bis zum Ende der Aktion nimmt die Figur keine Drücke an (Kampf 4.3). */
export const NIE = Number.POSITIVE_INFINITY;

/** Variante des Sprungangriffs (Kampf 5.2): runter, Richtung, hoch, neutral; '' = keiner. */
export type Variante = '' | 'N' | 'R' | 'H' | 'T';

/** Geworfener Gegner als Geschoss WG (Kampf 8.5), E+1 bis E+58. */
export interface Wurfgeschoss {
  /** Slot des Geworfenen */
  ziel: SlotKey;
  /** Druckframe E der Wurfeingabe */
  e: number;
  /** Flugrichtung des Geworfenen (vorwärts Blick der Figur, rückwärts entgegen) */
  richtung: Blick;
  /** Angriffsinstanz WG am Geworfenen (urheber 'f'); die Liste hält die Menge der Getroffenen */
  inst: Angriffsinstanz;
}

/** Zustand der Figur, der nicht in entitaeten.ts steht. */
export interface FigurIntern {
  /** Drücke ab X nur für eine Richtung allein in der Tiefe (Kampf 4.3, SCHLAG mit Treffer, P31) */
  tiefe_ab: number;
  /** Frame, ab dem die Kettenpose mit Treffer in STAND übergeht (h+28 bzw. h+27, Kampf 4.3) */
  stand_ab: number;
  /** Schlag ohne Treffer erkannt (Leerschlag bzw. Nachlauf der Stufe, Kampf 4.3) */
  leer: boolean;
  /** x-Richtung des Sprungs aus T(J) bzw. Sprintrichtung (Kampf 4.4, 9.3) */
  sprung_dx: -1 | 0 | 1;
  /** Angriff in diesem Sprung schon ausgelöst (Kampf 4.3: keine weiteren bis zur Landung) */
  sprung_angriff: boolean;
  /** Variante des laufenden Sprungangriffs */
  variante: Variante;
  /** Frames seit A ohne Stoppframes für den Sprint-Sprungangriff (Kampf 9.3), 0 = keiner */
  ss_n: number;
  /** Losreißen in diesem Frame ohne Eingabe (g+61 bzw. K+61, Kampf 8.3) */
  los_frame: number;
  /** L_end: letzter Frame des Liegens (Kampf 4.3) */
  liege_ende: number;
  /** Bodenkontakt der laufenden Bahn erreicht (Kampf 5.7) */
  gelandet: boolean;
  /** Frame, in dem KS1 einen Doppeltipp erkannt hat (Kampf 9.1), 0 = keiner */
  doppeltipp: number;
  /** Frame des letzten wirksamen Treffers der laufenden Aktion (je Frame einmal zählen) */
  trefferframe: number;
  /** im Frame N aufgefüllt: Erscheinen in N+1 (Kampf 6.5) */
  neueinstieg: boolean;
  /** laufende Wurfgeschosse (Kampf 8.5), in Reihenfolge der Würfe */
  wuerfe: Wurfgeschoss[];
}

const SPEICHER = new WeakMap<Figur, FigurIntern>();

function neu(): FigurIntern {
  return {
    tiefe_ab: 0,
    stand_ab: NIE,
    leer: false,
    sprung_dx: 0,
    sprung_angriff: false,
    variante: '',
    ss_n: 0,
    los_frame: NIE,
    liege_ende: 0,
    gelandet: false,
    doppeltipp: 0,
    trefferframe: 0,
    neueinstieg: false,
    wuerfe: [],
  };
}

/** Zustandsobjekt der Figur (wird beim ersten Zugriff angelegt). */
export function intern(f: Figur): FigurIntern {
  let i = SPEICHER.get(f);
  if (i === undefined) {
    i = neu();
    SPEICHER.set(f, i);
  }
  return i;
}

/** Setzt den internen Zustand zurück (figurInitialisieren). */
export function internNeu(f: Figur): FigurIntern {
  const i = neu();
  SPEICHER.set(f, i);
  return i;
}

// ===========================================================================
// Eingabe (Kampf 2.1, 4.3)
// ===========================================================================

/** Eingabe des Schritts f: T(f−1) und die neuen Drücke darin, bei steuerung 0 keine (Welt 3 KA13, 10.3, 10.5). */
export interface Eingang {
  /** T(f−1) */
  t: Tasten;
  /** neue Drücke in T(f−1) */
  neu: Tasten;
  /** Druckframe q = f − 1 */
  q: number;
}

/** Eingabe für den laufenden Schritt; bei steuerung 0 leer (Ausnahme Neueinstieg: schaden.ts liest roh). */
export function eingang(welt: Welt): Eingang {
  const an = welt.rahmen.steuerung === 1;
  return { t: an ? welt.eingabe.t1 : KEINE, neu: an ? welt.eingabe.neu : KEINE, q: welt.frame - 1 };
}

/** Von der Aktion angenommene Drücke (Kampf 4.3, „Drücke ab X“). */
export interface Angenommen extends Eingang {
  /** A neu und angenommen */
  a: boolean;
  /** S neu und angenommen */
  s: boolean;
  /** angenommene Richtungsmenge (0 = keine) */
  richtung: Tasten;
}

/** Hat die Richtungsmenge eine wirksame Richtung (P1: L und R zugleich bzw. O und U zugleich zählen nicht)? */
export function hatRichtung(r: Tasten): boolean {
  return richtungX(r) !== 0 || richtungZ(r) !== 0;
}

/**
 * Filtert die Eingabe nach den Schwellen der Aktion (Kampf 4.3): A und S ab
 * druecke_ab, eine Richtung mit L oder R ab richtung_ab, eine Richtung nur in
 * der Tiefe ab tiefe_ab. Tasten aus früheren Frames verfallen.
 */
export function angenommen(f: Figur, e: Eingang): Angenommen {
  const i = intern(f);
  const druecke = e.q >= f.druecke_ab;
  const r = richtungsteil(e.t);
  let richtung = KEINE;
  if (richtungX(r) !== 0) {
    if (e.q >= f.richtung_ab) richtung = r;
  } else if (richtungZ(r) !== 0) {
    if (e.q >= i.tiefe_ab) richtung = r;
  }
  return { ...e, a: druecke && hat(e.neu, TASTE_A), s: druecke && hat(e.neu, TASTE_S), richtung };
}

/** Setzt alle drei Schwellen (Kampf 4.3: „Drücke ab X“). */
export function schwellenSetzen(f: Figur, druecke: number, richtung: number, tiefe: number): void {
  f.druecke_ab = druecke;
  f.richtung_ab = richtung;
  intern(f).tiefe_ab = tiefe;
}
