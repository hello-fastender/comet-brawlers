// Flugbahnen F1 bis F4b nach docs/spezifikation-kampf.md, 5.7: gemeinsam
// für die Trefferreaktion der Gegner (gegner/reaktion.ts), die Figur auf F1
// und F4 (schaden.ts, auch aus der Luft nach P15) und den Boss mit eigenem
// Auslauf (Parameter d von bahnSchritt); dazu das Loslassen beim Wurf (F3).
// gegner/reaktion.ts exportiert alles hier unter denselben Namen weiter.
//
// Zustand je Entität: bahn, bahn_richtung, bahn_frame, bahn_start_x, vx, ax,
// vh, gh und bahn_boden (Bahnframe des Bodenkontakts).

import type { Bahn, Blick, EntitaetBasis } from './entitaeten.ts';
import type { Fest } from './festkomma.ts';
import type { Begrenzung } from './stage.ts';
import type { Welt } from './welt.ts';
import { add, ausGanz, maxF, mulGanz, sub } from './festkomma.ts';
import { schrittBegrenzt } from './stage.ts';
import {
  F1_AX,
  F1_BODEN,
  F1_GH,
  F1_RUHE,
  F1_STILLSTAND,
  F1_VH,
  F1_VX,
  F2_BODEN,
  F2_RUHE,
  F2_START_HOEHE,
  F3_AX,
  F3_BODEN,
  F3_ERSTER,
  F3_GH,
  F3_RUHE,
  F3_VH,
  F3_VX,
  F4B_ROLLEN,
  F4B_ROLLEN_BIS,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  WURF_LOSLASSEN,
  WURF_LOSLASS_HOEHE,
  WURF_LOSLASS_X,
  WURF_TREFFER,
} from './werte.ts';

/** Bahn ohne die leere Kennung. */
export type BahnArt = Exclude<Bahn, ''>;

/**
 * Daten einer Flugbahn (Kampf 5.7). Je Bahnframe: x += vx · Richtung, danach
 * vx −= ax; h += vh, danach vh −= gh; wird h ≤ 0, ist h = 0 (Bodenkontakt).
 * Nach dem Bodenkontakt läuft x bis zur Ruhe weiter, die Höhe bleibt 0 (P13).
 */
export interface BahnDaten {
  /** Stillstandsframes W+1 bis W+stillstand; erster Bahnframe W+stillstand+1 */
  stillstand: number;
  vx: Fest;
  ax: Fest;
  vh: Fest;
  gh: Fest;
  /** Höhe ab W+1 (F2: 16 px); null = die aktuelle Höhe bleibt (Treffer in der Luft, P15) */
  start_h: Fest | null;
  /**
   * Bahnframes vom Bodenkontakt bis zur Ruhe (F1: Boden W+46, Ruhe W+55 → 9).
   * Relativ zum Bodenkontakt, damit eine Bahn aus der Luft (P15) erst nach
   * dem Bodenkontakt zur Ruhe kommt; vom Boden aus gibt das genau die Tabelle.
   */
  nach_boden: number;
  /** x-Geschwindigkeit nach dem Bodenkontakt (F4b: Rollen 2,0 ab t+41); null = vx läuft weiter */
  boden_vx: Fest | null;
}

/** Die Bahnen aus Kampf 5.7, Frames relativ zum Treffer W (beim Wurf W = E+1). */
export const BAHNEN: Readonly<Record<BahnArt, BahnDaten>> = {
  /** F1 Umwerfen: Stillstand W+1 bis W+8, Boden W+46 bei 109,25, Ruhe W+55 bei 135,125 */
  F1: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F1_RUHE - F1_BODEN, boden_vx: null },
  /** F2 dritter Kniestoß: wie F1 aus 16 px Höhe, Boden W+49, Ruhe W+58 */
  F2: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: F2_START_HOEHE, nach_boden: F2_RUHE - F2_BODEN, boden_vx: null },
  /** F3 Wurf: getragen bis E+21, losgelassen E+22, erster Bahnframe E+23, Boden E+59, Ruhe E+71 */
  F3: { stillstand: F3_ERSTER - WURF_TREFFER - 1, vx: F3_VX, ax: F3_AX, vh: F3_VH, gh: F3_GH, start_h: null, nach_boden: F3_RUHE - F3_BODEN, boden_vx: null },
  /** F4 Tod: Stillstand t+1, t+2, Boden t+40, Ruhe t+49 */
  F4: { stillstand: F4_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F4_RUHE - F4_BODEN, boden_vx: null },
  /** F4b Tod durch Stufe 2: wie F4, ab t+41 Rollen 2,0 bis t+72 */
  F4b: { stillstand: F4_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F4B_ROLLEN_BIS - F4_BODEN, boden_vx: F4B_ROLLEN },
};

/** Lage nach einem Bahnschritt. */
export type BahnLage = 'stillstand' | 'luft' | 'boden' | 'rutschen' | 'ruhe';

/**
 * Beginnt eine Bahn am Trefferort (Kampf 5.7): setzt bahn, bahn_richtung,
 * bahn_start_x, vx, ax, vh, gh; bahn_frame 0. Die Höhe bleibt, wie sie ist
 * (am Boden 0; in der Luft beginnt die Bahn dort, P15).
 */
export function bahnStarten(e: EntitaetBasis, bahn: BahnArt, richtung: Blick): void {
  const d = BAHNEN[bahn];
  e.bahn = bahn;
  e.bahn_richtung = richtung;
  e.bahn_frame = 0;
  e.bahn_start_x = e.x;
  e.vx = d.vx;
  e.ax = d.ax;
  e.vh = d.vh;
  e.gh = d.gh;
  e.vz = 0;
  e.bahn_boden = 0;
}

/**
 * Ein Frame der laufenden Bahn (Kampf 5.7). k = Frames seit dem Treffer
 * (Frame W+k). Stillstand bis W+stillstand (F2 setzt dort 16 px Höhe), dann
 * je Bahnframe x, danach h; x wird durch b begrenzt (Welt 2.2: Band,
 * Hindernisse, Wände; null = unbegrenzt). Nach dem Bodenkontakt (vh und gh
 * werden 0) läuft x mit vx bzw. boden_vx weiter, bis nach_boden Frames später
 * die Ruhe erreicht ist; danach bewegt sich nichts mehr.
 *
 * Rückgabe: 'ruhe' im Frame, in dem die Ruhe erreicht ist, und danach.
 * Für die Gegner (reaktion.ts), die Figur auf F1 und F4, auch aus der Luft
 * (schaden.ts), und den Boss mit eigenem Auslauf über den Parameter d.
 */
export function bahnSchritt(e: EntitaetBasis, k: number, b: Begrenzung | null, d: BahnDaten | null = null): BahnLage {
  if (d === null && e.bahn === '') return 'ruhe';
  const daten = d ?? BAHNEN[e.bahn as BahnArt];
  if (k < 1) return 'stillstand';
  if (k <= daten.stillstand) {
    if (k === 1 && daten.start_h !== null) e.h = daten.start_h;
    return 'stillstand';
  }
  const n = k - daten.stillstand;
  const boden = e.bahn_boden;
  if (boden > 0 && n > boden + daten.nach_boden) return 'ruhe';
  e.bahn_frame = n;
  // x
  const v = boden > 0 && daten.boden_vx !== null ? daten.boden_vx : e.vx;
  const dx = mulGanz(v, e.bahn_richtung);
  e.x = b === null ? add(e.x, dx) : schrittBegrenzt(b, e.x, e.z, e.h, dx, 0).x;
  e.vx = maxF(0, sub(e.vx, e.ax));
  // Höhe
  if (boden === 0) {
    e.h = add(e.h, e.vh);
    e.vh = sub(e.vh, e.gh);
    if (e.h > 0) return 'luft';
    e.h = 0;
    e.vh = 0;
    e.gh = 0;
    e.bahn_boden = n;
    return daten.nach_boden === 0 ? 'ruhe' : 'boden';
  }
  return n >= boden + daten.nach_boden ? 'ruhe' : 'rutschen';
}

/** Frame des Loslassens beim Wurf relativ zu W = E+1 (E+22, Kampf 8.4). */
const WURF_LOSLASSEN_K = WURF_LOSLASSEN - WURF_TREFFER;

/**
 * Wurfbahn F3, k Frames nach dem Treffer W = E+1: Der Geworfene bleibt E+1
 * bis E+21 in der Haltelage (die Figur ist gebunden und steht) und wird in
 * E+22 in 59 px Höhe 13 px vor bzw. hinter der Figur losgelassen, in
 * Flugrichtung (P19, Kampf 8.4); die Tiefe bleibt. Für Gegner (reaktion.ts)
 * und Boss (boss_bahn.ts), vor bahnSchritt im selben Frame aufzurufen.
 */
export function wurfLoslassen(welt: Welt, e: EntitaetBasis, k: number): void {
  if (e.bahn !== 'F3' || k !== WURF_LOSLASSEN_K) return;
  e.x = add(welt.figur.x, mulGanz(ausGanz(WURF_LOSLASS_X), e.bahn_richtung));
  e.h = ausGanz(WURF_LOSLASS_HOEHE);
}
