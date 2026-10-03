// Festkomma 16.16 nach docs/spezifikation-kampf.md, 2.4 (verbindlich nach E12).
// Ein Wert ist eine vorzeichenbehaftete 32-Bit-Ganzzahl; die unteren 16 Bit
// tragen den Nachkommaanteil (Wert = Rohwert ÷ 65536).
// Rauchtest aus Phase 0; Stufe 1 (K0) baut das Modul vollständig aus.

/** Rohwert eines 16.16-Festkommawerts. */
export type Fest = number;

/** Anzahl der Einheiten je Pixel (2^16). */
export const EINS: Fest = 65536;

/** 10^16 / 2^16 = 5^16: Faktor für die exakte Dezimaldarstellung. */
const FUENF_HOCH_16 = 152587890625n;

/** Dezimalzahl auf 1/65536 gerundet (für Konstanten, Kampf 2.4 Punkt 1). */
export function ausDezimal(wert: number): Fest {
  return Math.round(wert * EINS) | 0;
}

/**
 * Exakte Dezimaldarstellung ohne überflüssige Nullen und ohne „-0“
 * (Kampf 11.3), z. B. 135.125, 51.25, 100.
 */
export function zuDezimalText(f: Fest): string {
  const roh = BigInt(f | 0);
  const negativ = roh < 0n;
  const betrag = negativ ? -roh : roh;
  const ganz = betrag >> 16n;
  const bruch = betrag & 0xffffn;
  let text = ganz.toString();
  if (bruch !== 0n) {
    const ziffern = (bruch * FUENF_HOCH_16).toString().padStart(16, '0').replace(/0+$/, '');
    text += '.' + ziffern;
  }
  return negativ && betrag !== 0n ? '-' + text : text;
}
