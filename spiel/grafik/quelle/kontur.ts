// Konturen und Stilprüfungen auf Pixelebene (Auftrag 4, 1.2, 1.3, 2.4):
// Außenkontur setzen, Rand umfärben, Lücken der Kontur und Streupixel finden
// und Streupixel entfernen. Nachbarschaft: Kontur und Lücken über die vier
// Kantennachbarn (eine Kontur auf der Diagonale bleibt 1 px dünn), Streupixel
// über die acht Nachbarn (eine diagonale Konturlinie ist kein Streupixel).
// Außerhalb des Bildes gilt als durchsichtig. Keine Farbwerte.

import type { Punkt } from './geometrie.ts';
import type { Leinwand, Pixel } from './leinwand.ts';
import { DURCHSICHTIG, deckend } from './leinwand.ts';

/** Die vier Kantennachbarn (dx, dy). */
export const NACHBARN_4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Die acht Nachbarn (dx, dy). */
export const NACHBARN_8: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

function leerAn(bild: Leinwand, x: number, y: number): boolean {
  return !deckend(bild.hole(x, y));
}

/**
 * Außenkontur: Jeder durchsichtige Pixel, der über eine Kante an einen
 * deckenden grenzt, wird farbe (1 px, geschlossen). Das Bild braucht 1 px
 * freien Rand. Gibt die Zahl der gesetzten Pixel zurück.
 */
export function konturAussen(bild: Leinwand, farbe: Pixel): number {
  const neu: number[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      if (!leerAn(bild, x, y)) continue;
      for (const [dx, dy] of NACHBARN_4) {
        if (!leerAn(bild, x + dx, y + dy)) {
          neu.push(y * bild.breite + x);
          break;
        }
      }
    }
  }
  for (const i of neu) bild.daten[i] = farbe;
  return neu.length;
}

/**
 * Rand umfärben: Jeder deckende Pixel, der über eine Kante an Durchsichtig
 * oder den Bildrand grenzt, wird farbe (die Figur wird nicht größer; für
 * freigestellte Fremdbilder). Gibt die Zahl der geänderten Pixel zurück.
 */
export function randFaerben(bild: Leinwand, farbe: Pixel): number {
  const neu: number[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      if (leerAn(bild, x, y)) continue;
      for (const [dx, dy] of NACHBARN_4) {
        if (leerAn(bild, x + dx, y + dy)) {
          neu.push(y * bild.breite + x);
          break;
        }
      }
    }
  }
  for (const i of neu) bild.daten[i] = farbe;
  return neu.length;
}

/**
 * Lücken der Kontur: deckende Pixel in einer anderen Farbe als kontur, die
 * über eine Kante an Durchsichtig oder den Bildrand grenzen. Leer heißt:
 * Kontur geschlossen.
 */
export function konturLuecken(bild: Leinwand, kontur: Pixel): Punkt[] {
  const aus: Punkt[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      const p = bild.hole(x, y);
      if (!deckend(p) || p === kontur) continue;
      for (const [dx, dy] of NACHBARN_4) {
        if (leerAn(bild, x + dx, y + dy)) {
          aus.push({ x, y });
          break;
        }
      }
    }
  }
  return aus;
}

/** true, wenn die Kontur geschlossen ist (keine Lücken). */
export function konturGeschlossen(bild: Leinwand, kontur: Pixel): boolean {
  return konturLuecken(bild, kontur).length === 0;
}

/**
 * Streupixel (Regel 1.3: kein Pixel steht allein): deckende Pixel ohne
 * gleichfarbigen unter den acht Nachbarn. Farben in ausnahmen (Glanzpunkte,
 * Funken) zählen nicht.
 */
export function streupixel(bild: Leinwand, ausnahmen: ReadonlySet<Pixel> = new Set()): Punkt[] {
  const aus: Punkt[] = [];
  for (let y = 0; y < bild.hoehe; y++) {
    for (let x = 0; x < bild.breite; x++) {
      const p = bild.hole(x, y);
      if (!deckend(p) || ausnahmen.has(p)) continue;
      let allein = true;
      for (const [dx, dy] of NACHBARN_8) {
        if (bild.hole(x + dx, y + dy) === p) {
          allein = false;
          break;
        }
      }
      if (allein) aus.push({ x, y });
    }
  }
  return aus;
}

/**
 * Entfernt Streupixel: Ein Streupixel bekommt die häufigste deckende Farbe
 * seiner acht Nachbarn (bei Gleichstand die zuerst gefundene in der
 * Reihenfolge NACHBARN_8, außer Farben aus geschuetzt, z. B. die Kontur,
 * die nicht ins Innere wachsen soll). Wiederholt, bis nichts mehr ändert
 * oder höchstens runden Durchläufe. Gibt die Zahl der Änderungen zurück.
 */
export function streupixelEntfernen(
  bild: Leinwand,
  ausnahmen: ReadonlySet<Pixel> = new Set(),
  geschuetzt: ReadonlySet<Pixel> = new Set(),
  runden: number = 4,
): number {
  let gesamt = 0;
  for (let r = 0; r < runden; r++) {
    const liste = streupixel(bild, ausnahmen);
    let geaendert = 0;
    for (const q of liste) {
      const p = bild.hole(q.x, q.y);
      if (geschuetzt.has(p)) continue;
      const zahl = new Map<Pixel, number>();
      let beste: Pixel = DURCHSICHTIG;
      let besteZahl = 0;
      for (const [dx, dy] of NACHBARN_8) {
        const n = bild.hole(q.x + dx, q.y + dy);
        if (!deckend(n) || geschuetzt.has(n)) continue;
        const z = (zahl.get(n) ?? 0) + 1;
        zahl.set(n, z);
        if (z > besteZahl) {
          besteZahl = z;
          beste = n;
        }
      }
      if (besteZahl > 0 && beste !== p) {
        bild.setze(q.x, q.y, beste);
        geaendert++;
      }
    }
    gesamt += geaendert;
    if (geaendert === 0) break;
  }
  return gesamt;
}
