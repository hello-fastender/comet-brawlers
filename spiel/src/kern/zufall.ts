// Seedbarer Zufall nach docs/spezifikation-welt.md, 11.1.
//
// Verfahren: 32-Bit-Xorshift mit den Verschiebungen 13 nach links, 17 nach
// rechts, 5 nach links; Zustand nie 0. Eine Ziehung „gleichverteilt aus n
// Werten“ ist ⌊r · n / 2^32⌋ mit dem neuen Zustand r. Anteile in Prozent
// werden als Ziehung aus 100 mit festen Grenzen umgesetzt (70/25/5 heißt
// 0–69, 70–94, 95–99).
//
// Hauptgenerator: startet mit dem Seed (0 verboten) und liefert nur die
// Startwerte der Generatoren je Gegner (eine Ziehung je Gegner, 0 wird zu 1).
// Jede Entscheidung zieht genau einmal; `ziehungen` zählt mit (Protokoll-
// spalten zufall_haupt und sn_zufall).

import {
  XORSHIFT_LINKS_1,
  XORSHIFT_LINKS_2,
  XORSHIFT_RECHTS,
  ZUFALL_ERSATZ_NULL,
  ZUFALL_PROZENT,
} from './werte.ts';

/** Zustand eines Generators. */
export interface Zufall {
  /** aktueller Zustand, 1 … 2^32 − 1 (vorzeichenlos) */
  zustand: number;
  /** Zahl der bisherigen Ziehungen */
  ziehungen: number;
}

/** 2^32 (Mathematik: Umfang des Zustandsraums). */
const ZWEI_HOCH_32 = 4294967296;

/** Größtes n, für das r · n exakt in Gleitkomma bleibt (r < 2^32, r·n < 2^53). */
const N_MAX = 2097152;

/** Neuer Generator mit Startwert seed (ganze Zahl, nicht 0; wird als uint32 gelesen). */
export function zufallNeu(seed: number): Zufall {
  if (!Number.isInteger(seed)) throw new RangeError(`Seed muss ganzzahlig sein, nicht ${seed}`);
  const z = seed >>> 0;
  if (z === 0) throw new RangeError('Seed 0 ist verboten (Welt 11.1)');
  return { zustand: z, ziehungen: 0 };
}

/** Ein Xorshift-Schritt ohne Zählung (für Tests und Dokumentation). */
export function xorshift32(x: number): number {
  let r = x >>> 0;
  r = (r ^ (r << XORSHIFT_LINKS_1)) >>> 0;
  r = (r ^ (r >>> XORSHIFT_RECHTS)) >>> 0;
  r = (r ^ (r << XORSHIFT_LINKS_2)) >>> 0;
  return r;
}

/** Eine Ziehung: neuer Zustand r (1 … 2^32 − 1), zählt mit. */
export function ziehen(z: Zufall): number {
  z.zustand = xorshift32(z.zustand);
  z.ziehungen += 1;
  return z.zustand;
}

/** Gleichverteilt aus n Werten 0 … n−1: ⌊r · n / 2^32⌋ (Welt 11.1). Eine Ziehung. */
export function ziehenAus(z: Zufall, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > N_MAX) {
    throw new RangeError(`ziehenAus: n muss eine ganze Zahl von 1 bis ${N_MAX} sein, nicht ${n}`);
  }
  const r = ziehen(z);
  return Math.floor((r * n) / ZWEI_HOCH_32);
}

/** Gleichverteilt ein Element der Liste (Reihenfolge der Liste zählt). Eine Ziehung. */
export function wahl<T>(z: Zufall, liste: readonly T[]): T {
  if (liste.length === 0) throw new RangeError('wahl: leere Liste');
  const i = ziehenAus(z, liste.length);
  return liste[i] as T;
}

/**
 * Gleichverteilt aus von, von + schritt, …, bis (einschließlich), z. B.
 * Liegedauer 16 bis 44 in Viererschritten. Eine Ziehung.
 */
export function bereich(z: Zufall, von: number, bis: number, schritt: number = 1): number {
  if (!Number.isInteger(von) || !Number.isInteger(bis) || !Number.isInteger(schritt) || schritt < 1 || bis < von) {
    throw new RangeError(`bereich: ungültig von=${von} bis=${bis} schritt=${schritt}`);
  }
  if ((bis - von) % schritt !== 0) {
    throw new RangeError(`bereich: bis − von muss ein Vielfaches von schritt sein (${von}, ${bis}, ${schritt})`);
  }
  const anzahl = (bis - von) / schritt + 1;
  return von + ziehenAus(z, anzahl) * schritt;
}

/**
 * Wahl nach Anteilen in Prozent (Summe 100): Ziehung aus 100, Grenzen in der
 * Reihenfolge der Liste (Welt 11.1). Ergebnis ist der Index des Anteils.
 * Beispiel: [70, 25, 5] gibt 0 für 0–69, 1 für 70–94, 2 für 95–99.
 */
export function anteil(z: Zufall, anteile: readonly number[]): number {
  let summe = 0;
  for (const a of anteile) summe += a;
  if (summe !== ZUFALL_PROZENT) throw new RangeError(`anteil: Summe muss ${ZUFALL_PROZENT} sein, nicht ${summe}`);
  const w = ziehenAus(z, ZUFALL_PROZENT);
  let grenze = 0;
  for (let i = 0; i < anteile.length; i++) {
    grenze += anteile[i] as number;
    if (w < grenze) return i;
  }
  return anteile.length - 1;
}

/** Wahrscheinlichkeit in Prozent: true, wenn die Ziehung aus 100 kleiner als prozent ist. Eine Ziehung. */
export function prozent(z: Zufall, prozentsatz: number): boolean {
  return ziehenAus(z, ZUFALL_PROZENT) < prozentsatz;
}

/**
 * Startwert für den Generator eines Gegners: eine Ziehung des Hauptgenerators,
 * 0 wird zu 1 (Welt 11.1). Gibt den neuen Generator zurück.
 */
export function gegnerZufall(haupt: Zufall): Zufall {
  const r = ziehen(haupt);
  return { zustand: r === 0 ? ZUFALL_ERSATZ_NULL : r, ziehungen: 0 };
}

/** Kopie eines Generators (für Vorschau oder Tests). */
export function zufallKopie(z: Zufall): Zufall {
  return { zustand: z.zustand, ziehungen: z.ziehungen };
}
