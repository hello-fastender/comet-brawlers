// Platzhalter (Stufe 1, K0) für K1: Schaden, LP, Schutz, Kosten, Tod und
// Neueinstieg der Figur nach docs/spezifikation-kampf.md, Abschnitt 6
// (Neueinstieg N = t+120 nach E16, Landung trifft alle Gegner im Bild,
// Schutz bis LN+199).

import type { Treffer } from './entitaeten.ts';
import type { Welt } from './welt.ts';
import { ereignisTreffer } from './ereignisse.ts';

/**
 * KS7, Zielhandler für die Figur (Kampf 6.2, 6.3): für jeden Treffer mit
 * t.ziel = 'f', in Trefferreihenfolge. Pflicht: t.lp_vorher setzen,
 * t.wirkung setzen (W im Schutz bei zustand 2 oder 3; X bei LP < 0; U bei
 * Umwerfen oder Figur in der Luft; sonst R), als Erstes ereignisTreffer(welt, t)
 * schreiben, dann LP, Zustand (GETROFFEN, UMGEWORFEN mit Bahn F1 nach
 * t.richtung, TOT), Ende eines Griffs (P16) und Waffe fallen lassen in H+1
 * (Kampf 10.4) anwenden. Ein wirkungsloser Treffer ändert nichts (E2, P11).
 *
 * Platzhalter: setzt nur lp_vorher und wirkung R und schreibt das Ereignis.
 */
export function figurGetroffen(welt: Welt, t: Treffer): void {
  t.lp_vorher = welt.figur.lp;
  t.wirkung = 'R';
  ereignisTreffer(welt, t);
}
