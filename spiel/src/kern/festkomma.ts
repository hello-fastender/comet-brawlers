// Festkomma 16.16 nach docs/spezifikation-kampf.md, 2.4 (verbindlich nach E12).
// Ein Wert ist eine vorzeichenbehaftete 32-Bit-Ganzzahl; die unteren 16 Bit
// tragen den Nachkommaanteil (Wert = Rohwert ÷ 65536). Alle Positionen,
// Geschwindigkeiten und Beschleunigungen der Logik sind Fest.
//
// Rechenregeln (Kampf 2.4):
// - add, sub: 32-Bit-Ganzzahlarithmetik (`| 0`).
// - mul: exakter 64-Bit-Zwischenwert, arithmetische Verschiebung um 16
//   (rundet nach −∞). Umgesetzt über eine Zerlegung in 16-Bit-Hälften, deren
//   Teilprodukte in Gleitkomma exakt bleiben (< 2^53).
// - divGanz: nur durch eine positive ganze Zahl, Ergebnis ⌊a/b⌋.
// - produktGroesser: a·b > c·d mit BigInt-Zwischenwert (Produkte über 32 Bit).
// - Gleitkomma nur in ausDezimal, also beim einmaligen Runden von Konstanten.

/** Rohwert eines 16.16-Festkommawerts (vorzeichenbehaftete 32-Bit-Ganzzahl). */
export type Fest = number;

/** Anzahl der Einheiten je Pixel (2^16, Kampf 2.4). */
export const EINS: Fest = 65536;

/** Halbe Einheit (2^15). */
const HALB = 32768;

/** Maske des Nachkommaanteils (2^16 − 1). */
const NACHKOMMA_MASKE = 0xffff;

/** 10^16 / 2^16 = 5^16: Faktor für die exakte Dezimaldarstellung. */
const FUENF_HOCH_16 = 152587890625n;

/** Stellen des Nachkommaanteils in der exakten Dezimaldarstellung (2^−16 hat 16 Stellen). */
const NACHKOMMA_STELLEN = 16;

/**
 * Dezimalzahl auf 1/65536 gerundet (nächster Rohwert). Nur für Konstanten
 * (Kampf 2.4, Punkt 1: gerundete Messwerte wie 3,92 werden einmal gerundet).
 */
export function ausDezimal(wert: number): Fest {
  return Math.round(wert * EINS) | 0;
}

/** Ganze Pixelzahl als Fest (Nachkommaanteil 0). */
export function ausGanz(n: number): Fest {
  return Math.imul(n | 0, EINS);
}

/**
 * Bruch zaehler/nenner als Fest, exakt auf 1/65536 nach −∞ gerundet
 * (z. B. 70/256, 13/64, 29/64). nenner muss eine positive ganze Zahl sein.
 */
export function ausBruch(zaehler: number, nenner: number): Fest {
  return divGanz(ausGanz(zaehler), nenner);
}

/** Summe, 32 Bit. */
export function add(a: Fest, b: Fest): Fest {
  return (a + b) | 0;
}

/** Differenz, 32 Bit. */
export function sub(a: Fest, b: Fest): Fest {
  return (a - b) | 0;
}

/** Negation, 32 Bit. */
export function neg(a: Fest): Fest {
  return -a | 0;
}

/** Betrag, 32 Bit. */
export function abs(a: Fest): Fest {
  return (a < 0 ? -a : a) | 0;
}

/**
 * Produkt zweier Festkommawerte: (a · b) >> 16 mit exaktem Zwischenwert,
 * Rundung nach −∞ (Kampf 2.4).
 */
export function mul(a: Fest, b: Fest): Fest {
  const aHoch = a >> 16; // vorzeichenbehaftet
  const aTief = a & NACHKOMMA_MASKE; // 0 … 65535
  // a·b = aHoch·b·2^16 + aTief·b; beide Teilprodukte < 2^47, also exakt.
  const tief = Math.floor((aTief * b) / EINS);
  return (aHoch * b + tief) | 0;
}

/** Produkt mit einer ganzen Zahl (kein Verschieben), 32 Bit. */
export function mulGanz(a: Fest, n: number): Fest {
  return Math.imul(a, n | 0);
}

/**
 * Vergleich a·b > c·d für ganze Zahlen mit exaktem Zwischenwert (BigInt,
 * Kampf 2.4: 64-Bit-Zwischenwert): Verhältnisse ohne Division vergleichen,
 * auch wenn ein Produkt 32 Bit übersteigt (z. B. |Δx| · tan in Welt 5.3).
 * Wirft bei nicht ganzzahligen Faktoren.
 */
export function produktGroesser(a: number, b: number, c: number, d: number): boolean {
  return BigInt(a) * BigInt(b) > BigInt(c) * BigInt(d);
}

/**
 * Ganzzahlige Division ⌊a / b⌋ durch eine positive ganze Zahl b (Kampf 2.4):
 * Ergebnis in derselben Einheit wie a, Rundung nach −∞. Gilt für Fest wie
 * für ganze Zahlen (Pixel, LP, Frames).
 */
export function divGanz(a: number, b: number): number {
  if (!Number.isInteger(b) || b <= 0) {
    throw new RangeError(`divGanz: Divisor muss eine positive ganze Zahl sein, nicht ${b}`);
  }
  if (!Number.isInteger(a)) {
    throw new RangeError(`divGanz: Dividend muss ganzzahlig sein, nicht ${a}`);
  }
  let q = Math.floor(a / b);
  // Korrektur gegen Rundung des Gleitkommaquotienten.
  if (q * b > a) q -= 1;
  else if ((q + 1) * b <= a) q += 1;
  return q;
}

/** Ganzzahliger Anteil ⌊v⌋ (Rundung nach −∞, Kampf 2.3). */
export function ganz(a: Fest): number {
  return a >> 16;
}

/** Nachkommaanteil als Rohwert 0 … 65535. */
export function nachkomma(a: Fest): number {
  return a & NACHKOMMA_MASKE;
}

/** Auf den ganzzahligen Anteil abgeschnitten (Nachkommaanteil 0), als Fest. */
export function abgerundet(a: Fest): Fest {
  return a & ~NACHKOMMA_MASKE;
}

/** Auf ganze Pixel gerundet (halbe nach +∞), als ganze Zahl; nur für die Darstellung. */
export function gerundet(a: Fest): number {
  return (a + HALB) >> 16;
}

/** Vergleich: −1, 0 oder +1. */
export function vergleich(a: Fest, b: Fest): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function gleich(a: Fest, b: Fest): boolean {
  return a === b;
}

export function kleiner(a: Fest, b: Fest): boolean {
  return a < b;
}

export function kleinerGleich(a: Fest, b: Fest): boolean {
  return a <= b;
}

export function groesser(a: Fest, b: Fest): boolean {
  return a > b;
}

export function groesserGleich(a: Fest, b: Fest): boolean {
  return a >= b;
}

export function minF(a: Fest, b: Fest): Fest {
  return a < b ? a : b;
}

export function maxF(a: Fest, b: Fest): Fest {
  return a > b ? a : b;
}

/** Vorzeichen −1, 0 oder +1. */
export function vorzeichen(a: Fest): -1 | 0 | 1 {
  return a < 0 ? -1 : a > 0 ? 1 : 0;
}

/**
 * Exakte Dezimaldarstellung ohne überflüssige Nullen und ohne „-0“
 * (Kampf 11.3), z. B. 135.125, 51.25, 100, -0.5.
 */
export function zuDezimalText(f: Fest): string {
  const roh = BigInt(f | 0);
  const negativ = roh < 0n;
  const betrag = negativ ? -roh : roh;
  const ganzTeil = betrag >> 16n;
  const bruch = betrag & 0xffffn;
  let text = ganzTeil.toString();
  if (bruch !== 0n) {
    const ziffern = (bruch * FUENF_HOCH_16)
      .toString()
      .padStart(NACHKOMMA_STELLEN, '0')
      .replace(/0+$/, '');
    text += '.' + ziffern;
  }
  return negativ && betrag !== 0n ? '-' + text : text;
}
