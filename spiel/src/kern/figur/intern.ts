// Annahme der Eingaben der Spielfigur (K1) nach docs/spezifikation-kampf.md,
// 2.1 (T(f−1), neue Drücke, kein Eingabepuffer) und 4.3 („Drücke ab X“).
// Der Zustand der Figur steht vollständig in welt.figur (entitaeten.ts,
// Figur); hier stehen nur die Hilfen für die Eingabe.

import type { Figur } from '../entitaeten.ts';
import type { Tasten } from '../tasten.ts';
import type { Welt } from '../welt.ts';
import { KEINE, TASTE_A, TASTE_S, hat, richtungX, richtungZ, richtungsteil } from '../tasten.ts';

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
  const druecke = e.q >= f.druecke_ab;
  const r = richtungsteil(e.t);
  let richtung = KEINE;
  if (richtungX(r) !== 0) {
    if (e.q >= f.richtung_ab) richtung = r;
  } else if (richtungZ(r) !== 0) {
    if (e.q >= f.tiefe_ab) richtung = r;
  }
  return { ...e, a: druecke && hat(e.neu, TASTE_A), s: druecke && hat(e.neu, TASTE_S), richtung };
}

/** Setzt alle drei Schwellen (Kampf 4.3: „Drücke ab X“). */
export function schwellenSetzen(f: Figur, druecke: number, richtung: number, tiefe: number): void {
  f.druecke_ab = druecke;
  f.richtung_ab = richtung;
  f.tiefe_ab = tiefe;
}
