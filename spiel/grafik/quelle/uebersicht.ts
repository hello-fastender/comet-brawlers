// Übersicht aller Figuren im Stand nebeneinander, 2× (Auftrag 4, Phase 2: „eine
// Übersichtsseite docs/bilder/kontakt_uebersicht.png“). Gebaut von bauen.ts aus den
// Animationen `stand` der Figuren; das Blatt rammbock_fremd (Vorlage, E24) fehlt hier.

import type { Animation } from './blatt.ts';
import { zugeschnitten } from './blatt.ts';
import { textBreite, textZeichnen, ZEICHEN_HOEHE } from './kontakt.ts';
import { Leinwand } from './leinwand.ts';
import { KONTAKT_BODEN, KONTAKT_GRUND, KONTAKT_TEXT } from './palette.ts';

/** Dateiname unter docs/bilder/. */
export const UEBERSICHT_DATEI = 'kontakt_uebersicht.png';
/** Reihenfolge der Figuren in der Übersicht (Heldin, dann Gegner nach Auftrag 4, Abschnitt 3). */
export const UEBERSICHT_FIGUREN: readonly string[] = ['vela', 'bolzer', 'puppe', 'rammbock', 'zuender', 'ballast'];
/** Vergrößerung (Auftrag 4, Phase 2: 2×). */
const FAKTOR = 2;
/** Rand und Abstand zwischen den Figuren in Spielpixeln (Festlegung Opus, nur Darstellung). */
const RAND = 8;
const ABSTAND = 16;
/** Abstand der Beschriftung unter der Bodenlinie in Spielpixeln. */
const TEXT_ABSTAND = 4;

/** Baut die Übersicht aus den Figuren (Name → Animationen); fehlende Figuren werden übersprungen. */
export function uebersicht(figuren: ReadonlyMap<string, readonly Animation[]>): Leinwand {
  const bilder = UEBERSICHT_FIGUREN.flatMap((name) => {
    const stand = figuren.get(name)?.find((a) => a.name === 'stand')?.bilder[0];
    return stand === undefined ? [] : [{ name, bild: zugeschnitten(stand) }];
  });
  const hoehe = Math.max(...bilder.map((b) => b.bild.ankerY + 1));
  const breiten = bilder.map((b) => Math.max(b.bild.leinwand.breite, textBreite(b.name.toUpperCase())));
  const b1 = RAND * 2 + breiten.reduce((s, w) => s + w, 0) + ABSTAND * Math.max(0, bilder.length - 1);
  const h1 = RAND * 2 + hoehe + TEXT_ABSTAND + ZEICHEN_HOEHE;
  const klein = new Leinwand(b1, h1);
  klein.fuelle(KONTAKT_GRUND);
  const boden = RAND + hoehe;
  klein.rechteck(0, boden, b1, 1, KONTAKT_BODEN);
  let x = RAND;
  bilder.forEach((b, i) => {
    const w = breiten[i] as number;
    const l = b.bild.leinwand;
    const ox = x + Math.floor((w - l.breite) / 2);
    const oy = boden - 1 - b.bild.ankerY;
    for (let yy = 0; yy < l.hoehe; yy++) for (let xx = 0; xx < l.breite; xx++) {
      const p = l.hole(xx, yy);
      if (p !== 0) klein.setze(ox + xx, oy + yy, p);
    }
    const t = b.name.toUpperCase();
    textZeichnen(klein, t, x + Math.floor((w - textBreite(t)) / 2), boden + TEXT_ABSTAND, KONTAKT_TEXT);
    x += w + ABSTAND;
  });
  const gross = new Leinwand(b1 * FAKTOR, h1 * FAKTOR);
  for (let yy = 0; yy < gross.hoehe; yy++) for (let xx = 0; xx < gross.breite; xx++) gross.setze(xx, yy, klein.hole(Math.floor(xx / FAKTOR), Math.floor(yy / FAKTOR)));
  return gross;
}
