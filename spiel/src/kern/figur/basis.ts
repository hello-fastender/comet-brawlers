// Grundbausteine der Spielfigur (K1): Aktionswechsel nach
// docs/spezifikation-kampf.md, 4.1 und 4.3, Sprungbeginn (4.3, 4.4) und
// Bewegung mit Begrenzung durch Tiefenband, Hindernisse, Behälter und
// Bildränder (docs/spezifikation-welt.md, 2.2).

import type { FigurAktion, FigurPhase } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Begrenzung } from '../stage.ts';
import type { Tasten } from '../tasten.ts';
import type { Welt } from '../welt.ts';
import { ausGanz, ganz } from '../festkomma.ts';
import { bandGrenzen, begehbar, schrittBegrenzt } from '../stage.ts';
import { behaelterHindernisse } from '../gegenstaende.ts';
import { richtungX } from '../tasten.ts';
import { FIGUR_RAND, FIGUR_RAND_RECHTS, FRAME_NIE, SPRUNGANGRIFF_DRUCK_VON, SPRUNG_VH_START } from '../werte.ts';
import { schwellenSetzen } from './intern.ts';

/** Aktionen, in denen die Figur Drücke nach 4.2 frei annimmt (Kampf 4.2). */
const FREIE_AKTIONEN: readonly FigurAktion[] = ['STAND', 'LAUF', 'SPRINT'];

/** Aktionen, die eine laufende Instanz SS nicht beenden (Kampf 9.3). */
const SS_BLEIBT: readonly FigurAktion[] = ['LANDUNG', 'STAND', 'LAUF'];

/**
 * Beginnt eine neue Aktion (Kampf 4.1, 4.3): uhr = 1, Unterphase, Ende der
 * laufenden Angriffsinstanz (SS läuft in LANDUNG, STAND und LAUF weiter,
 * Kampf 9.3), Kombostufe 0 außerhalb von SCHLAG (5.6, P12), Sprintframe 0
 * außerhalb von SPRINT. Schwellen: in STAND, LAUF und SPRINT Drücke ab dem
 * laufenden Frame, sonst „nie“, bis die Aktion sie setzt.
 */
export function aktionSetzen(welt: Welt, aktion: FigurAktion, phase: FigurPhase = ''): void {
  const f = welt.figur;
  const a = f.angriff;
  if (a !== null && !(a.code === 'SS' && SS_BLEIBT.includes(aktion))) f.angriff = null;
  if (f.angriff === null) f.ss_n = 0;
  f.aktion = aktion;
  f.phase = phase;
  f.uhr = 1;
  f.treffer_h = 0;
  f.treffer_frames = 0;
  if (aktion !== 'SCHLAG') {
    f.kombo = 0;
    f.ausfallschritt = 0;
  }
  if (aktion !== 'SPRINT') f.sprint_n = 0;
  if (FREIE_AKTIONEN.includes(aktion)) schwellenSetzen(f, welt.frame, welt.frame, welt.frame);
  else schwellenSetzen(f, FRAME_NIE, FRAME_NIE, FRAME_NIE);
}

/** STAND als Ende einer Aktion (Kampf 4.3): Drücke ab diesem Frame. */
export function standBeginnen(welt: Welt): void {
  aktionSetzen(welt, 'STAND');
}

/**
 * SPRUNG bzw. SPRINTSPRUNG ab J+1 (Kampf 4.3, 4.4, 9.3): J = Druckframe,
 * T(J) bestimmt die x-Richtung (Sprintsprung: Sprintrichtung = Blick); A ab
 * J+1; Absprung in J+2 mit vh = 4,9375.
 */
export function sprungBeginnen(welt: Welt, sprint: boolean, tasten: Tasten): void {
  const f = welt.figur;
  aktionSetzen(welt, sprint ? 'SPRINTSPRUNG' : 'SPRUNG');
  f.sprung_j = welt.frame - 1;
  f.sprung_tasten = tasten;
  f.vh = SPRUNG_VH_START;
  f.angriff_a = 0;
  f.sprung_dx = sprint ? f.blick : richtungX(tasten);
  f.sprung_angriff = false;
  f.sprung_variante = '';
  f.druecke_ab = f.sprung_j + SPRUNGANGRIFF_DRUCK_VON;
}

// ===========================================================================
// Bewegung (Welt 2.2)
// ===========================================================================

/**
 * Begrenzung der Figur (Welt 2.2): Band, Hindernisse, Behälter und die Ränder
 * K + 24 ≤ x ≤ K + 360, 24 ≤ x ≤ x_ende − 24 mit Kamera-x des Vorframes
 * (welt.kamera.x gilt im Kampfschritt unverändert, Kampf 2.2).
 */
export function begrenzung(welt: Welt): Begrenzung {
  const st = welt.stage;
  if (!st.raender) return { stage: st, zusatz: behaelterHindernisse(welt), x_min: null, x_max: null };
  const k = welt.kamera.x;
  const links = Math.max(k + FIGUR_RAND, FIGUR_RAND);
  const rechts = Math.min(k + FIGUR_RAND_RECHTS, st.x_ende - FIGUR_RAND);
  return { stage: st, zusatz: behaelterHindernisse(welt), x_min: ausGanz(links), x_max: ausGanz(rechts) };
}

/** Bewegt die Figur um (dx, dz) mit Begrenzung (Welt 2.2 Punkt 2: erst x, dann z, Stopp an der Kante). */
export function bewegen(welt: Welt, dx: Fest, dz: Fest): void {
  if (dx === 0 && dz === 0) return;
  const f = welt.figur;
  const r = schrittBegrenzt(begrenzung(welt), f.x, f.z, f.h, dx, dz);
  f.x = r.x;
  f.z = r.z;
}

/**
 * Aufsetzen innerhalb eines Hindernisses (Welt 2.2, Punkt 3): z wird zur
 * näheren freien Kante geschoben, bei Gleichstand nach vorn (z kleiner).
 */
export function aufsetzen(welt: Welt): void {
  const f = welt.figur;
  const x = ganz(f.x);
  const z = ganz(f.z);
  const zusatz = behaelterHindernisse(welt);
  if (begehbar(welt.stage, x, z, 0, zusatz)) return;
  const band = bandGrenzen(welt.stage, x);
  if (band === null) return;
  const weite = band.oben - band.unten;
  for (let d = 1; d <= weite; d++) {
    if (begehbar(welt.stage, x, z - d, 0, zusatz)) {
      f.z = ausGanz(z - d);
      return;
    }
    if (begehbar(welt.stage, x, z + d, 0, zusatz)) {
      f.z = ausGanz(z + d);
      return;
    }
  }
}
