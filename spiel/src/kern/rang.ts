// Rang nach docs/spezifikation-welt.md, Abschnitt 8 (K3, Stufe 2): Start 9,
// +1 bei Rang-Uhr r = 409 + 600·k, höchstens 24; −3 im Frame N des
// Neueinstiegs (Kampf 6.5), mindestens 7; Stillstand bei rang.fest (Welt
// 11.3), in der Pause (dort läuft kein Logikschritt) und ab dem Frame nach
// dem Fall des Bosses.
//
// Festlegung K3: rang.fest hält den Rang ganz fest, auch beim Tod der Figur
// (Welt 11.3: „rang.fest hält ihn“).

import type { Welt } from './welt.ts';
import { divGanz } from './festkomma.ts';
import { neueinstiegN } from './rahmen.ts';
import { RANG_ERSTER_ANSTIEG, RANG_MAX, RANG_MIN, RANG_TAKT, RANG_TOD, RANGSTUFE_AB } from './werte.ts';

/** Ist r ein Anstiegszeitpunkt r = 409 + 600·k mit k ≥ 0 (Welt 8)? */
export function rangAnstieg(r: number): boolean {
  if (r < RANG_ERSTER_ANSTIEG) return false;
  const k = divGanz(r - RANG_ERSTER_ANSTIEG, RANG_TAKT);
  return r === RANG_ERSTER_ANSTIEG + k * RANG_TAKT;
}

/** Rang nach dem Tod: −3, mindestens 7 (Welt 8). */
export function rangNachTod(rang: number): number {
  return Math.max(RANG_MIN, rang - RANG_TOD);
}

/** Steht die Rang-Uhr in diesem Frame (rang.fest oder nach dem Fall des Bosses, Welt 8)? */
export function rangUhrSteht(welt: Welt): boolean {
  if (welt.rang.fest) return true;
  const t = welt.rahmen.boss_t;
  return t > 0 && welt.frame > t;
}

/**
 * W2: Rang-Uhr welt.rang.zaehler und Rang welt.rang.rang; Rang −3 im Frame N
 * (welt.figur.neueinstieg_n, gesetzt von K1 beim Tod; sonst t+120), auch beim letzten Tod
 * (mechanik „Schaden der Gegner“: zur selben Zeit, obwohl kein Neueinstieg folgt).
 */
export function rangSchritt(welt: Welt): void {
  if (rangUhrSteht(welt)) return;
  const r = welt.rang;
  r.zaehler += 1;
  if (rangAnstieg(r.zaehler)) r.rang = Math.min(RANG_MAX, r.rang + 1);
  const n = neueinstiegN(welt.figur);
  if (n > 0 && welt.frame === n) r.rang = rangNachTod(r.rang);
}

/**
 * Rangstufe I bis IV als Index 0 bis 3 (Welt 8: I = 7, II = 8 bis 14,
 * III = 15 bis 21, IV = 22 bis 24), für Schadenstabellen in werte.ts.
 * Gemeinsame Hilfsfunktion (K0), auch für K4.
 */
export function rangstufe(rang: number): number {
  let stufe = 0;
  for (let i = 0; i < RANGSTUFE_AB.length; i++) if (rang >= (RANGSTUFE_AB[i] as number)) stufe = i;
  return stufe;
}
