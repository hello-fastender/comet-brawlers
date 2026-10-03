// Platzhalter (Stufe 1, K0) für K2: Trefferprüfung nach
// docs/spezifikation-kampf.md, Abschnitt 5 (Flächen 5.1, aktive Frames und
// Trefferstopp 5.3, Reihenfolge 5.4, ein Treffer je Ziel 5.5, Flugbahnen 5.7,
// Gegnerangriffe und Geschosse 5.8) und Prüfangriffe (11.2).
//
// Eingang: die Angriffsinstanzen in figur.angriff, gegner[n].angriff,
// geschosse[n].angriff und objekte[n].angriff (aktiv = true in diesem Frame).
// Ausgang: welt.treffer in der Reihenfolge von Kampf 5.4; jede Instanz trägt
// das Ziel in getroffen ein. LP, Reaktionen und Ereignisse wenden erst die
// Zielhandler in KS7 an (welt.ts verteilt).

import type { Angriffsinstanz, EntitaetBasis, Gegner } from './entitaeten.ts';
import type { Welt } from './welt.ts';
import { ZUSTAND_NORMAL, ZUSTAND_REAKTION } from './entitaeten.ts';

/**
 * KS3, nach der Bewegung der Gegner (Kampf 11.2): Prüfangriffe aus
 * welt.start.pruefangriffe als Instanz PA am Gegnerslot anlegen (Frames von
 * bis), aktiv setzen und beenden, wenn der Gegner getroffen wird oder Zustand 1
 * verlässt. Fläche: Figur −4 bis 60 px vor ihm, |dz| ≤ 10, Figurhöhe ≤ 48,
 * ohne Trefferstopp (werte.ts PA_*).
 */
export function pruefangriffeSchritt(welt: Welt): void {}

/**
 * KS6 (Kampf 5.4): prüft alle aktiven Instanzen an den Positionen nach KS2
 * bis KS4 und legt Treffer in welt.treffer an: 1. Figur und ihre Geschosse
 * gegen Gegner und Behälter (Gegner aufsteigend), 2. geworfener Gegner,
 * 3. Gegner und ihre Geschosse gegen die Figur (aufsteigend; wer in 1 oder 2
 * wirksam getroffen wurde oder stirbt, prüft nicht mehr, Ausnahme Boss SA3).
 * Füllt je Treffer schaden (schaden_boss beim Boss), richtung nach der
 * RichtungsRegel, von_vorn; wirkung bleibt ''.
 */
export function trefferPruefen(welt: Welt): void {}

/**
 * KS7, nach allen Ziel- und Urheberhandlern: Nacharbeit der Trefferprüfung,
 * z. B. Instanzen mit einmal = true nach einem wirksamen Treffer beenden,
 * Prüfangriffe nach einem Treffer auf den Gegner beenden.
 */
export function trefferFolgen(welt: Welt): void {}

/**
 * Liegt ziel in der Fläche der Instanz (Kampf 5.1), an ganzzahligen
 * Positionen? Hilfsfunktion, auch für andere Module (z. B. Abbruchprüfung).
 * Platzhalter: immer false.
 */
export function inFlaeche(welt: Welt, inst: Angriffsinstanz, angreifer: EntitaetBasis, ziel: EntitaetBasis): boolean {
  return false;
}

/** Ist der Gegner für Angriffe der Figur treffbar (Kampf 5.5, Welt 4.1)? Platzhalter: Zustand 1 oder 3. */
export function treffbar(welt: Welt, g: Gegner): boolean {
  return g.belegt && (g.zustand === ZUSTAND_NORMAL || g.zustand === ZUSTAND_REAKTION);
}
