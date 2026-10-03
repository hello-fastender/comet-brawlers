// Platzhalter (Stufe 1, K0) für K2: Trefferreaktion der Gegner nach
// docs/spezifikation-kampf.md, Abschnitt 7 (23 Frames ohne Rückstoß mit
// Neustart, E3; Umwerfen, Liegen, Aufstehen, kein Schutz danach, E4; Tod und
// Slotfreigabe; genau 0 LP lebt weiter; gehalten) und Puppen (11.2).

import type { Gegner, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import { ZUSTAND_NORMAL, blickZu, istReaktion, modusSetzen } from '../entitaeten.ts';
import { ereignisTreffer } from '../ereignisse.ts';

/**
 * KS7, Zielhandler für Gegner außer dem Boss (Kampf 6.2, 7): für jeden Treffer
 * mit Ziel sn (typ ≠ Ballast), in Trefferreihenfolge. Pflicht: t.lp_vorher
 * setzen, t.wirkung (X bei LP < 0, U bei Umwerfen, sonst R), als Erstes
 * ereignisTreffer(welt, t), dann LP, letzter_angreifer, reaktion_h,
 * getroffen_frame (bei urheber 'f'), Reaktion mit modusSetzen und aktion,
 * Bahn nach t.bahn und t.richtung, laufenden Angriff abbrechen (angriff = null),
 * Rechte abgeben beim Umwerfen und Tod (Welt 5.7, E-4).
 *
 * Platzhalter: setzt nur lp_vorher und wirkung R und schreibt das Ereignis.
 */
export function gegnerGetroffen(welt: Welt, t: Treffer): void {
  const g = welt.gegner[Number(t.ziel.slice(1))] as Gegner;
  t.lp_vorher = g.lp;
  t.wirkung = 'R';
  ereignisTreffer(welt, t);
}

/**
 * KS3 für Gegner außer dem Boss: läuft eine Reaktion (GETROFFEN, UMGEWORFEN,
 * LIEGEN, AUFSTEHEN, TOT, GEHALTEN), schreibt sie fort (Stillstand, Bahn,
 * Liegedauer aus g.zufall bei der Ruhe, Aufstehen, Slot frei mit FR:sn) und gibt
 * true zurück; dann bewegt welt.ts den Gegner in diesem Frame nicht weiter.
 * Am Ende einer Reaktion: modusSetzen(g, 'FREI'), zustand 1, aktion STAND.
 * Erkennt auch LP < 0 ≤ lp_vor ohne Treffer (Eingriff) als Tod.
 *
 * Platzhalter: true, solange der Modus eine Reaktion ist.
 */
export function reaktionSchritt(welt: Welt, g: Gegner): boolean {
  return istReaktion(g.modus);
}

/**
 * W4 für Gegner mit Logik aus (Puppe, Kampf 11.2): steht, schaut in jedem
 * Frame mit Zustand 1 zur Figur. Nach einer Reaktion (FREI) wieder PUPPE.
 *
 * Platzhalter: genau das.
 */
export function puppeEntscheidung(welt: Welt, g: Gegner): void {
  if (g.zustand !== ZUSTAND_NORMAL) return;
  if (g.modus === 'FREI') {
    modusSetzen(g, 'PUPPE');
    g.aktion = 'STAND';
  }
  g.blick = blickZu(g, welt.figur);
}
