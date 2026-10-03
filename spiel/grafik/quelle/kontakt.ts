// Kontaktbögen zur Abnahme (Auftrag 4, 2.2): alle Bilder einer Animation in
// einer Reihe, 2× vergrößert, mit Bildnummer und Dauer. Alle Bilder stehen
// am Anker ausgerichtet auf derselben Bodenlinie, damit Rutschen und
// Reichweite sichtbar werden; das Ankerkreuz markiert den Fußpunkt, ein
// Rahmen die Bilder der aktiven Frames. Die Schrift ist ein kleines
// Bitmuster 3 × 5 (Großbuchstaben, Ziffern, Umlaute, wenige Zeichen).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Animation } from './blatt.ts';
import { zugeschnitten } from './blatt.ts';
import type { Pixel } from './leinwand.ts';
import { Leinwand } from './leinwand.ts';
import { KONTAKT_AKTIV, KONTAKT_ANKER, KONTAKT_BODEN, KONTAKT_GRUND, KONTAKT_TEXT, KONTAKT_ZELLE } from './palette.ts';
import { md5, pngSchreiben } from './png.ts';

/** Zeichenmaß der Kontaktschrift in px (1×). */
export const ZEICHEN_BREITE = 3;
export const ZEICHEN_HOEHE = 5;
/** Abstand zwischen Zeichen in px (1×). */
export const ZEICHEN_ABSTAND = 1;

/** Bitmuster der Schrift 3 × 5, je Zeichen fünf Zeilen aus drei Bits ('1' gesetzt). */
const SCHRIFT: Readonly<Record<string, readonly string[]>> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['110', '101', '101', '101', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '110', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  Ä: ['101', '010', '101', '111', '101'],
  Ö: ['101', '010', '101', '101', '010'],
  Ü: ['101', '000', '101', '101', '111'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['110', '001', '010', '100', '111'],
  '3': ['110', '001', '010', '001', '110'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '110', '001', '110'],
  '6': ['011', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '110'],
  ' ': ['000', '000', '000', '000', '000'],
  '-': ['000', '000', '111', '000', '000'],
  '+': ['000', '010', '111', '010', '000'],
  '=': ['000', '111', '000', '111', '000'],
  ':': ['000', '010', '000', '010', '000'],
  '.': ['000', '000', '000', '000', '010'],
  ',': ['000', '000', '000', '010', '100'],
  '/': ['001', '001', '010', '100', '100'],
  '#': ['101', '111', '101', '111', '101'],
  '(': ['010', '100', '100', '100', '010'],
  ')': ['010', '001', '001', '001', '010'],
  _: ['000', '000', '000', '000', '111'],
  '×': ['000', '101', '010', '101', '000'],
  '?': ['110', '001', '010', '000', '010'],
};

/** Breite eines Texts in px (1× mal faktor). */
export function textBreite(text: string, faktor: number = 1): number {
  if (text.length === 0) return 0;
  return (text.length * (ZEICHEN_BREITE + ZEICHEN_ABSTAND) - ZEICHEN_ABSTAND) * faktor;
}

/** Zeichnet text (Kleinbuchstaben werden groß, Unbekanntes als '?') mit linker oberer Ecke (x, y). */
export function textZeichnen(bild: Leinwand, text: string, x: number, y: number, farbe: Pixel, faktor: number = 1): void {
  let cx = x;
  for (const zeichen of text.toUpperCase()) {
    const muster = SCHRIFT[zeichen] ?? (SCHRIFT['?'] as readonly string[]);
    for (let r = 0; r < ZEICHEN_HOEHE; r++) {
      const zeile = muster[r] as string;
      for (let s = 0; s < ZEICHEN_BREITE; s++) {
        if (zeile[s] === '1') bild.rechteck(cx + s * faktor, y + r * faktor, faktor, faktor, farbe);
      }
    }
    cx += (ZEICHEN_BREITE + ZEICHEN_ABSTAND) * faktor;
  }
}

export interface KontaktOptionen {
  /** Vergrößerung (Vorgabe 2, Auftrag 4, 2.2) */
  readonly faktor?: number;
  /** Titel über der Reihe (Vorgabe: Name der Animation) */
  readonly titel?: string;
}

/** Rand und Abstände des Bogens in px (1×, Festlegung G0). */
const RAND = 4;
const LUECKE = 4;
const ZEILE = ZEICHEN_HOEHE + 3;
/** Halbe Länge des Ankerkreuzes (1×). */
const KREUZ = 2;

/** Baut den Kontaktbogen einer Animation (Bilder nebeneinander, am Anker ausgerichtet). */
export function kontaktBogen(animation: Animation, optionen: KontaktOptionen = {}): Leinwand {
  const faktor = optionen.faktor ?? 2;
  const bilder = animation.bilder.map(zugeschnitten);
  if (bilder.length === 0) throw new Error(`Kontaktbogen ${animation.name}: keine Bilder`);
  let links = 0;
  let rechts = 0;
  let oben = 0;
  let unten = 0;
  for (const b of bilder) {
    links = Math.max(links, b.ankerX);
    rechts = Math.max(rechts, b.leinwand.breite - b.ankerX);
    oben = Math.max(oben, b.ankerY);
    unten = Math.max(unten, b.leinwand.hoehe - b.ankerY);
  }
  // Platz unter dem Anker für das Kreuz.
  unten = Math.max(unten, KREUZ + 1);
  const zelleB = links + rechts + 2;
  const zelleH = oben + unten + 2;
  const summe = bilder.reduce((s, b) => s + b.dauer, 0);
  const titel = optionen.titel ?? `${animation.name}  ${bilder.length} BILDER  SUMME ${summe} F${animation.schleife ? '  SCHLEIFE' : ''}`;
  const breite = Math.max(RAND * 2 + bilder.length * zelleB + (bilder.length - 1) * LUECKE, RAND * 2 + textBreite(titel));
  const hoehe = RAND + ZEILE + zelleH + 2 + ZEILE + RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, titel, RAND, RAND, KONTAKT_TEXT);
  const aktiv = new Set(animation.aktiv ?? []);
  const y0 = RAND + ZEILE;
  bilder.forEach((b, i) => {
    const x0 = RAND + i * (zelleB + LUECKE);
    if (aktiv.has(i)) bogen.rechteck(x0 - 1, y0 - 1, zelleB + 2, zelleH + 2, KONTAKT_AKTIV);
    bogen.rechteck(x0, y0, zelleB, zelleH, KONTAKT_ZELLE);
    const ax = x0 + 1 + links;
    const ay = y0 + 1 + oben;
    // Bodenlinie eine Zeile unter dem Ankerpixel, Ankerkreuz darunter
    bogen.rechteck(x0, ay + 1, zelleB, 1, KONTAKT_BODEN);
    bogen.rechteck(ax - KREUZ, ay + KREUZ + 1, 2 * KREUZ + 1, 1, KONTAKT_ANKER);
    bogen.rechteck(ax, ay + 1, 1, 2 * KREUZ + 1, KONTAKT_ANKER);
    bogen.einsetzen(b.leinwand, ax - b.ankerX, ay - b.ankerY);
    const text = `${i}:${b.dauer}F`;
    textZeichnen(bogen, text, x0, y0 + zelleH + 2, aktiv.has(i) ? KONTAKT_AKTIV : KONTAKT_TEXT);
  });
  return bogen.vergroessert(faktor);
}

/** Schreibt den Kontaktbogen als PNG nach pfad; gibt das MD5 zurück. */
export function kontaktSchreiben(pfad: string, animation: Animation, optionen: KontaktOptionen = {}): string {
  mkdirSync(dirname(pfad), { recursive: true });
  const bytes = pngSchreiben(kontaktBogen(animation, optionen));
  writeFileSync(pfad, bytes);
  return md5(bytes);
}
