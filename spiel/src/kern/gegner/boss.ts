// Platzhalter (Stufe 1, K0) für K4: Boss Ballast nach
// docs/spezifikation-welt.md, Abschnitt 7 (Werte und Zustände 7.1, Rhythmus
// 7.2, Angriffe AS, AN, KP 7.3, Super-Armor SA1 bis SA6 7.4, Verstärkung 7.5,
// Fall besiegt alle 7.6) und docs/mechanik.md „Boss“.
//
// welt.ts gibt den Boss (typ Ballast, Slot s0) immer an diese Funktionen,
// auch in seinen Reaktionen; K4 darf für GETROFFEN und TOT die Funktionen aus
// gegner/reaktion.ts (K2) aufrufen.

import type { Gegner, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import { ereignisTreffer } from '../ereignisse.ts';

/**
 * Nach dem Anlegen (erzeugeWelt oder Eingriff): x, z, blick, lp, lp_max,
 * angriffe_an, bewegung_an, werte, auftritt, welle sind gesetzt; modus WARTEN
 * (aus der Stage) bzw. FREI (Prüfszene). Bei welt.wellen.nur_boss (Welt 11.3)
 * wach und kampffähig.
 */
export function bossAngelegt(welt: Welt, g: Gegner): void {}

/** W4: Weckreiz-Folgen, Auftritt, Fälligkeit und Wahl des Angriffs (g.zufall), Rückkehr nach Reaktionen. */
export function bossEntscheidung(welt: Welt, g: Gegner): void {}

/** KS3: Bewegung, Angriffsabläufe, Stoß RZ, eigene Reaktionen (Umwerfen, Liegen, Taumeln); g.angriff.aktiv setzen. */
export function bossBewegung(welt: Welt, g: Gegner): void {}

/** KS5: Ende des Ansturms an Wand oder Arenarand o. ä. (Welt 7.3), falls nötig. */
export function bossAbbruch(welt: Welt, g: Gegner): void {}

/**
 * KS7, Zielhandler für den Boss (Kampf 6.2; Welt 7.4): t.lp_vorher, t.wirkung,
 * als Erstes ereignisTreffer(welt, t), dann LP (vorläufig oder endgültig),
 * Folge (lp_folge, folge, folge_h), Reaktion nach SA3, Umwerfen nach SA1.
 *
 * Platzhalter: setzt nur lp_vorher und wirkung R und schreibt das Ereignis.
 */
export function bossGetroffen(welt: Welt, t: Treffer): void {
  const g = welt.gegner[Number(t.ziel.slice(1))] as Gegner;
  t.lp_vorher = g.lp;
  t.wirkung = 'R';
  ereignisTreffer(welt, t);
}

/** KS7, Seite des Urhebers: wirksamer Treffer des Bosses (Armschwung weiter nach E18, Trefferstopp +7). */
export function bossHatGetroffen(welt: Welt, t: Treffer): void {}

/**
 * W5 (Welt 1, 7.4, 7.6): Super-Armor auswerten (SA5: Rücksprung in h+23,
 * Ereignis SA:s0:lp, Stoß), Fall des Bosses (alle übrigen lebenden Gegner LP −1
 * und TOT mit ohne_punkte = true, Geschosse der Gegner verschwinden, scharfe
 * Wellen entfallen, Ereignis BF:s0).
 */
export function bossW5(welt: Welt): void {}
