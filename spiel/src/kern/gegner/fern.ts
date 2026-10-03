// Platzhalter (Stufe 1, K0) für K3: Fernkämpfer Zünder nach
// docs/spezifikation-welt.md, Abschnitt 6 (Zielpunkt, Zielen 60 Frames mit
// Zielrecht nach E17, Schuss ZR, Rakete und Explosion, Zurückweichen,
// Kolbenhieb, Waffe beim Tod).

import type { Gegner, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';

/**
 * W4 für einen Zünder (nicht in einer Reaktion): Zustand (ANNAEHERN, BEREIT,
 * ZIELEN, SCHUSS, ZURUECK, KOLBENHIEB), Zielrecht und Nahkampfrecht anfordern
 * (Slots aufsteigend), Zielpunkt aus g.zufall, Angriffsbeginn.
 */
export function fernEntscheidung(welt: Welt, g: Gegner): void {}

/** KS3 für einen Zünder: Bewegung, Zielen mit Tiefenschritten, Schuss (Rakete in Q = A+6 im kleinsten freien Objektslot). */
export function fernBewegung(welt: Welt, g: Gegner): void {}

/** KS5: Abbruch des Zielens bzw. des Kolbenhiebs (Welt 6). */
export function fernAbbruch(welt: Welt, g: Gegner): void {}

/** KS7, Seite des Urhebers: wirksamer Treffer des Zünders (Kolbenhieb ZK oder Explosion ZR, Urheber sn). */
export function fernHatGetroffen(welt: Welt, t: Treffer): void {}

/**
 * KS4 (Kampf 2.2): Geschosse der Gegner in o20 bis o59, Slots aufsteigend:
 * Flug der Rakete, Einschlag in Q+20 bzw. an einer Wand, Explosion Q+21 bis
 * Q+29 als Angriffsinstanz des Objektslots (urheber = Zünder, gegen 'figur').
 */
export function fernGeschosseSchritt(welt: Welt): void {}
