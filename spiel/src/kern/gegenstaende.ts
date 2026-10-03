// Platzhalter (Stufe 1, K0) für K3: Gegenstände und Behälter nach
// docs/spezifikation-welt.md, Abschnitt 9 (Slots 9.1, Behälter 9.2,
// Gegenstände 9.3: Erscheinen, Flug, Liegezeit, Blinken, Scrollen,
// Stage-Ende, leere Waffe). Die Seite der Figur (Aufnehmen, Essen, Waffe
// fallen lassen) baut K1 nach Kampf 10.

import type { Objekt, Treffer } from './entitaeten.ts';
import type { Welt } from './welt.ts';
import { ereignisTreffer } from './ereignisse.ts';

/**
 * KS7, Zielhandler für Behälter (Welt 9.2): Treffer mit Ziel on. Pflicht:
 * t.lp_vorher, t.wirkung = 'B', als Erstes ereignisTreffer(welt, t), dann
 * zerbrochen = true, zerbrochen_h = f, ab h+1 kein Hindernis, Inhalt in h+1.
 *
 * Platzhalter: setzt nur lp_vorher und wirkung B und schreibt das Ereignis.
 */
export function behaelterGetroffen(welt: Welt, t: Treffer): void {
  const o = welt.objekte.find((x) => x.schluessel === t.ziel) as Objekt;
  t.lp_vorher = o.lp;
  t.wirkung = 'B';
  ereignisTreffer(welt, t);
}

/** W6, nach der Kamera (Welt 9.2, 9.3): Gegenstände ab K − ⌊x⌋ ≥ 163 und Behälter ab 195 entfernen, Ereignis EN:on:S. */
export function gegenstaendeScrollen(welt: Welt): void {}

/**
 * W8 (Welt 9.3): Inhalt zerbrochener Behälter in h+1 erscheinen lassen
 * (ER:on:Art), Flug (Landung LA:on), Liegezeit und Blinken (sichtbar),
 * Entfernen (EN:on:L bzw. E), leere Waffen nach 61 Frames, Waffe des toten
 * Zünders.
 */
export function gegenstaendeSchritt(welt: Welt): void {}
