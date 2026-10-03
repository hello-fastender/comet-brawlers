// Tasten und Tastenmengen T(f) nach docs/spezifikation-kampf.md, 2.1 und 11.1.
//
// T(f) ist eine Bitmenge der Tasten L R O U A S. P (Pause) gehört nicht zu T.
// Der Logikschritt f wertet T(f−1) aus; ein neuer Druck in f heißt: in T(f),
// nicht in T(f−1). Die Reihenfolge L R O U A S gilt für das Protokoll und die
// Eingabedatei.

/** Bitmenge der gedrückten Tasten. */
export type Tasten = number;

/** Links (x kleiner). */
export const TASTE_L: Tasten = 1;
/** Rechts (x größer). */
export const TASTE_R: Tasten = 2;
/** Hoch: in der Tiefe nach hinten (z größer). */
export const TASTE_O: Tasten = 4;
/** Runter: in der Tiefe nach vorn (z kleiner). */
export const TASTE_U: Tasten = 8;
/** Angriff. */
export const TASTE_A: Tasten = 16;
/** Sprung. */
export const TASTE_S: Tasten = 32;

/** Keine Taste. */
export const KEINE: Tasten = 0;
/** Alle Richtungstasten. */
export const RICHTUNGEN: Tasten = TASTE_L | TASTE_R | TASTE_O | TASTE_U;
/** Alle Tasten. */
export const ALLE: Tasten = RICHTUNGEN | TASTE_A | TASTE_S;

/** Buchstaben in Protokollreihenfolge L R O U A S. */
export const TASTEN_REIHENFOLGE: readonly (readonly [string, Tasten])[] = [
  ['L', TASTE_L],
  ['R', TASTE_R],
  ['O', TASTE_O],
  ['U', TASTE_U],
  ['A', TASTE_A],
  ['S', TASTE_S],
];

/** Ist die Taste (oder eine der Tasten) in der Menge? */
export function hat(t: Tasten, taste: Tasten): boolean {
  return (t & taste) !== 0;
}

/** Sind alle genannten Tasten in der Menge? */
export function hatAlle(t: Tasten, tasten: Tasten): boolean {
  return (t & tasten) === tasten;
}

/** Neue Drücke: in jetzt, nicht in vorher (Kampf 2.1). */
export function neuGedrueckt(jetzt: Tasten, vorher: Tasten): Tasten {
  return jetzt & ~vorher & ALLE;
}

/** Nur die Richtungstasten. */
export function richtungsteil(t: Tasten): Tasten {
  return t & RICHTUNGEN;
}

/**
 * x-Richtung: +1 für R, −1 für L, 0 ohne oder bei L und R zugleich (Kampf 2.1, P1).
 */
export function richtungX(t: Tasten): -1 | 0 | 1 {
  const l = hat(t, TASTE_L);
  const r = hat(t, TASTE_R);
  if (l === r) return 0;
  return r ? 1 : -1;
}

/**
 * Tiefenrichtung: +1 für O (nach hinten, z wächst), −1 für U (nach vorn),
 * 0 ohne oder bei O und U zugleich (Kampf 2.1, 2.3, P1).
 */
export function richtungZ(t: Tasten): -1 | 0 | 1 {
  const o = hat(t, TASTE_O);
  const u = hat(t, TASTE_U);
  if (o === u) return 0;
  return o ? 1 : -1;
}

/** Text in Protokollreihenfolge, z. B. „RA“; leer ohne Taste (Kampf 11.3). */
export function tastenZuText(t: Tasten): string {
  let s = '';
  for (const [b, m] of TASTEN_REIHENFOLGE) if (hat(t, m)) s += b;
  return s;
}

/** Text (Buchstaben aus L R O U A S, Reihenfolge beliebig) in eine Tastenmenge (Kampf 11.1). */
export function tastenAusText(text: string): Tasten {
  let t = KEINE;
  for (const zeichen of text.trim().toUpperCase()) {
    const eintrag = TASTEN_REIHENFOLGE.find(([b]) => b === zeichen);
    if (eintrag === undefined) throw new RangeError(`Unbekannte Taste „${zeichen}“ (erlaubt: L R O U A S)`);
    t |= eintrag[1];
  }
  return t;
}
