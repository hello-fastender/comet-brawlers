// Platzhalter (Stufe 1, K0) für K3: Anzeige-Daten, Punkte, Leben, Phasen,
// Stage-Ende und Game Over nach docs/spezifikation-welt.md, Abschnitt 10.

import type { Welt } from './welt.ts';

/**
 * W5 (Welt 1, 10.1, 10.2): Punkte für Treffer der Figur aus welt.treffer
 * (10 je LP Schaden), für besiegte Gegner im Frame t (nicht bei ohne_punkte),
 * Gegneranzeige welt.rahmen.anzeige (kleinster Slot der in diesem Frame von
 * einer Handlung der Figur getroffenen Gegner).
 */
export function rahmenW5(welt: Welt): void {}

/**
 * W8 (Welt 10.3 bis 10.5): Leben −1 und NE:F im Frame N, Phase, Steuerung
 * (welt.rahmen.steuerung), STAGE CLEAR (SC), GAME OVER (GO), Ende der
 * Scheibe in t+585: welt.beendet = true (der Prüflauf schreibt diese Zeile
 * noch und hört dann auf).
 */
export function rahmenSchritt(welt: Welt): void {}
