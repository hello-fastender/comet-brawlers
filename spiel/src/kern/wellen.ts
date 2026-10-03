// Platzhalter (Stufe 1, K0) für K3: Aktivierung und Wellen nach
// docs/spezifikation-welt.md, Abschnitt 4 (aktives Fenster 4.1, Warten und
// Aufwachen 4.2, Lebende 4.3, Auslöser 4.4, LP beim Erscheinen 4.5,
// Bossarena 4.6, Wellentabelle 4.7).

import type { Gegner } from './entitaeten.ts';
import type { Welt } from './welt.ts';
import { istLebend } from './entitaeten.ts';

/**
 * Nach dem Anlegen eines Gegners mit Logik an außer dem Boss (erzeugeWelt,
 * Eingriff „erscheint“, später Wellen): typ, rolle, x, z, blick, auftritt,
 * welle, werte, rang_beim_erscheinen, zufall sind gesetzt; Startgegner haben
 * LP und Schaden nach Welt 4.5. Ist g.lp_offen, hier LP und lp_max nach dem
 * Rang setzen (Welt 8, rang_beim_erscheinen + Bonus der Welle). Modus: WARTEN
 * (aus der Stage) bzw. FREI (Prüfszene, wach und kampffähig).
 */
export function gegnerAngelegt(welt: Welt, g: Gegner): void {}

/**
 * W3 (Welt 1, 4.2, 4.4): in W7 des Vorframes vorgemerkte Gegner anlegen
 * (welt.wellen.vorgemerkt; Slot nach entitaeten.ts freierGegner, Zufall nach
 * zufall.ts gegnerZufall aus welt.zufall, dann gegnerAngelegt), Weckreiz mit
 * Kamera-x des Vorframes (welt.vorframe.kamera_x), Ereignis WK:sn.
 */
export function wellenAnlegen(welt: Welt): void {}

/**
 * W7 (Welt 1, 4.4): Auslöser prüfen (Stand dieses Frames), Ereignis WL:n,
 * welt.wellen.ausgeloest ergänzen, neue Gegner für W3 vormerken; danach
 * welt.lebende (4.3) und welt.wellen.besiegt (KA4) für diesen Frame setzen.
 *
 * Platzhalter: zählt nur welt.lebende nach istLebend.
 */
export function wellenPruefen(welt: Welt): void {
  let n = 0;
  for (const g of welt.gegner) if (istLebend(g)) n += 1;
  welt.lebende = n;
}

/** Löst Welle nr sofort aus (Eingriff ziel=welle.n feld=jetzt in W1, Welt 11.3). */
export function welleAusloesen(welt: Welt, nr: number): void {}
