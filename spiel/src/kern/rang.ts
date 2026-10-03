// Platzhalter (Stufe 1, K0) für K3: Rang nach docs/spezifikation-welt.md,
// Abschnitt 8 (Start 9, +1 bei r = 409 + 600·k, höchstens 24, −3 im Frame N
// des Neueinstiegs, mindestens 7, Stillstand bei rang.fest, in der Pause und
// ab dem Frame nach dem Fall des Bosses).

import type { Welt } from './welt.ts';
import { RANGSTUFE_AB } from './werte.ts';

/** W2: Rang-Uhr welt.rang.zaehler und Rang welt.rang.rang; Rang −3 im Frame N (welt.figur.neueinstieg_n). */
export function rangSchritt(welt: Welt): void {}

/**
 * Rangstufe I bis IV als Index 0 bis 3 (Welt 8: I = 7, II = 8 bis 14,
 * III = 15 bis 21, IV = 22 bis 24), für Schadenstabellen in werte.ts.
 * Gemeinsame Hilfsfunktion (K0), auch für K4.
 */
export function rangstufe(rang: number): number {
  let stufe = 0;
  for (let i = 0; i < RANGSTUFE_AB.length; i++) if (rang >= (RANGSTUFE_AB[i] as number)) stufe = i;
  return stufe;
}
