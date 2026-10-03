// Takt der Spielschleife nach E13 (docs/spezifikation-kampf.md, 2.1):
// requestAnimationFrame mit Akkumulator, 60 Logikschritte je Sekunde in
// Echtzeit, Bilder werden ausgelassen, je dargestelltem Bild höchstens 4
// Logikschritte; wären es mehr, laufen 4 und die übrige Zeit verfällt (kein
// Aufholen). Der Takt bestimmt nur, wann ein Logikschritt läuft, nie, was er
// tut (Kampf 11.6). Ohne DOM, damit er sich ohne Browser prüfen lässt.

import { LOGIKSCHRITTE_JE_SEKUNDE, MAX_SCHRITTE_JE_BILD } from '../kern/werte.ts';
import { MS_JE_SEKUNDE, TAKT_TOLERANZ_TEILER } from './masse.ts';

/** Dauer eines Logikschritts in ms (1000/60). */
export const SCHRITT_MS = MS_JE_SEKUNDE / LOGIKSCHRITTE_JE_SEKUNDE;

/** Akkumulator der Spielschleife (E13). */
export class Takt {
  private akku = 0;
  private letzte: number | null = null;

  /**
   * Zahl der Logikschritte, die zum Bild mit dem Zeitstempel zeit (ms) laufen.
   * Das erste Bild nach dem Start oder nach anhalten() läuft keinen Schritt.
   */
  schritte(zeit: number): number {
    if (this.letzte === null) {
      this.letzte = zeit;
      this.akku = 0;
      return 0;
    }
    const dt = zeit - this.letzte;
    this.letzte = zeit;
    if (dt > 0) this.akku += dt;
    const toleranz = SCHRITT_MS / TAKT_TOLERANZ_TEILER;
    let n = Math.floor((this.akku + toleranz) / SCHRITT_MS);
    if (n > MAX_SCHRITTE_JE_BILD) {
      // E13: höchstens 4 Schritte je Bild, die übrige Zeit verfällt
      n = MAX_SCHRITTE_JE_BILD;
      this.akku = 0;
    } else {
      this.akku -= n * SCHRITT_MS;
    }
    return n;
  }

  /** Hält den Takt an (Pause, Eingabedatei, verborgenes Fenster): kein Aufholen danach. */
  anhalten(): void {
    this.letzte = null;
    this.akku = 0;
  }
}
