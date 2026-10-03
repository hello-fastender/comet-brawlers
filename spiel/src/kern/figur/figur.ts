// Platzhalter (Stufe 1, K0) für K1: Spielfigur nach docs/spezifikation-kampf.md,
// Abschnitte 4 (Zustandsautomat), 5.2, 5.3, 5.6 (Angriffe, Trefferstopp,
// Kette), 8 (Griff, Kniestoß, Wurf, geworfener Gegner), 9 (Sprint,
// Spezialangriff), 10 (Waffen, Aufnehmen).
//
// K1 darf in src/kern/figur/ beliebige Dateien anlegen; welt.ts ruft genau
// die hier exportierten Funktionen auf (Signaturen nicht ändern).

import type { Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';

/**
 * Nach erzeugeWelt: Figur steht am Start (x, z, blick, lp, waffe, munition
 * sind gesetzt, aktion STAND, zustand 1, uhr 1). Hier weitere Startwerte.
 */
export function figurInitialisieren(welt: Welt): void {}

/**
 * KS1 (Kampf 2.2): welt.eingabe.t1 = T(f−1) und welt.eingabe.neu (neue Drücke
 * in T(f−1)) sind gesetzt. Sprint-Erkennung fortschreiben (Kampf 9.1, Feld
 * figur.tipp). Bei welt.rahmen.steuerung = 0 wertet die Figur keine Eingaben
 * aus (Welt 3 KA13, 10.3, 10.5; Ausnahme Neueinstieg LN bis LN+4).
 */
export function figurEingabe(welt: Welt): void {}

/**
 * KS2 (Kampf 2.2): Timer zählen (schutz vor der Trefferprüfung, stopp,
 * griffsperre, haltefrist), Zustandsübergänge nach Kampf 4 (Vorrang 4.2),
 * Bewegung mit Begrenzung (stage.ts schrittBegrenzt; Ränder mit Kamera-x des
 * Vorframes, welt.kamera.x), Angriffsinstanz figur.angriff anlegen bzw.
 * fortschreiben und figur.angriff.aktiv für diesen Frame setzen; ebenso die
 * Instanz WG am geworfenen Gegner (Kampf 8.5) und LN bei der Landung nach dem
 * Neueinstieg (Kampf 6.5). Ereignisse SP, KE, WU, AU, WA, AB, K; G schreibt
 * griffPruefen. Beim Tod in t setzt K1 figur.tod_t und figur.neueinstieg_n
 * (= t+120); Leben −1, Rang −3 und NE:F im Frame N übernimmt K3 (rang.ts,
 * rahmen.ts, Welt 8, 10.3), LP 72 und das Erscheinen in N+1 K1.
 */
export function figurSchritt(welt: Welt): void {}

/**
 * KS4 (Kampf 2.2, 10.3): Raketen der Figur in g0 bis g4, Slots aufsteigend:
 * Bewegung, Einschlag (EX:gn), Explosion RX als Angriffsinstanz des
 * Geschossslots (urheber 'f'), Lebensdauer, Freigabe.
 */
export function figurGeschosseSchritt(welt: Welt): void {}

/**
 * KS7, Seite des Urhebers (Kampf 5.3, 6.4, 5.6): für jeden wirksamen Treffer
 * (t.wirkung ≠ 'W') mit t.urheber = 'f', in Trefferreihenfolge. Trefferstopp
 * stopp = 7 einmal je Frame und Instanz (nicht für KN, WU, WG, RX; SP einmal je
 * Flächenstufe; SS nur in A+13), Kosten des Spezialangriffs vormerken
 * (h+8), Kette fortschreiben (kombo_h).
 */
export function figurHatGetroffen(welt: Welt, t: Treffer): void {}

/**
 * KS7, Ende (Kampf 8.1): Griff am Ende eines LAUF-Frames; Haltelage (P19);
 * Ereignis G:F>sn. Läuft nach allen Trefferfolgen, damit getroffene Gegner
 * (Zustand 3) nicht gegriffen werden.
 */
export function griffPruefen(welt: Welt): void {}
