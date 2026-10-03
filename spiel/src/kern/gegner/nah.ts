// Platzhalter (Stufe 1, K0) für K3: Nahkämpfer Bolzer und Rammbock nach
// docs/spezifikation-welt.md, Abschnitt 5 (Zustandsautomat 5.2, Bewegung 5.3,
// Angriff 5.4, Angriffsarten 5.5, Serie 5.6, Angriffserlaubnis 5.7, Abwarten,
// Seitenwechsel, Verfolgung 5.8, Rückkehr 5.9).
//
// Zufall nur aus g.zufall (zufall.ts), je Entscheidung genau eine Ziehung;
// welt.fest['<entscheidung>'] ersetzt das Ergebnis nach der Ziehung (Welt 11.3).

import type { Gegner, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';

/**
 * W4, vor den Entscheidungen der einzelnen Gegner (Welt 5.7): Rechte
 * verwalten, die für alle gelten (E-10: vom Tod der Figur bis N+1 und in der
 * Blende alle Rechte frei, keine Zuteilung). Die Anforderung je Gegner
 * geschieht in nahEntscheidung bzw. fernEntscheidung (Slots aufsteigend).
 */
export function rechteSchritt(welt: Welt): void {}

/**
 * W4 für einen Bolzer oder Rammbock (nicht in einer Reaktion, Logik an):
 * Weckreiz-Folgen (WARTEN, AUFTRITT nach 4.2), Recht anfordern (E-3), Zustand
 * nach 5.2 wählen (FREI nach einer Reaktion: 5.9), Gehrichtung, Angriffsbeginn
 * A (Zielabstand, Schaden nach Rang, Ereignis AS:sn:Code), Instanz g.angriff
 * anlegen. Modus nur über modusSetzen.
 */
export function nahEntscheidung(welt: Welt, g: Gegner): void {}

/**
 * KS3 für einen Bolzer oder Rammbock (nicht in einer Reaktion): die in W4
 * entschiedene Bewegung (Schritt mit stage.ts schrittBegrenzt, ohne
 * Bildränder), Angriffsablauf fortschreiben, g.angriff.aktiv für diesen Frame
 * setzen (Welt 5.4, 5.5).
 */
export function nahBewegung(welt: Welt, g: Gegner): void {}

/**
 * KS5 (Kampf 2.2; Welt 5.4 Punkt 3): Abbruchprüfung von A+1 bis zum letzten
 * aktiven Frame; bei Abbruch Instanz beenden, Ereignis AA:sn, Verfolgung.
 */
export function nahAbbruch(welt: Welt, g: Gegner): void {}

/**
 * KS7, Seite des Urhebers (Welt 5.4 Punkt 5, 5.6): wirksamer Treffer eines
 * Bolzers oder Rammbocks gegen die Figur: aktive Frames +7 bzw. Sonderregel
 * des Bolzers bei Umwerfen; Serienende nach einem wirksamen Umwerf-Treffer.
 */
export function nahHatGetroffen(welt: Welt, t: Treffer): void {}
