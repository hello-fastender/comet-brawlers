// Gehen der Gegner nach docs/spezifikation-welt.md, 5.3 (K3, Stufe 2), für
// Nahkämpfer (nah.ts) und Fernkämpfer (fern.ts):
// - Gehrichtung als einer von 32 Sektoren zu 11,25°, aus Δx und Δz zum Ziel
//   über die Tabelle der Tangensgrenzen (werte.ts GEH_TAN_GRENZEN), ohne
//   Winkelfunktion; Schritt (v_x · cos α, v_z · sin α) aus GEH_COS (Ellipse).
// - In z höchstens bis zum Ziel.
// - Band und Hindernisse begrenzen (stage.ts schrittBegrenzt, keine
//   Bildränder, Welt 2.2 Punkt 5); blockiert ein Hindernis den Schritt in x,
//   geht der Gegner in der Tiefe zur näheren freien Kante.
// - Haltepunkte und Wartepositionen liegen in K + 16 … K + 368 (Welt 4.1).
//
// Festlegung K3: „nähere freie Kante“ ist die nähere z-Grenze des
// achsparallelen Rechtecks um das Hindernis; bei Gleichstand nach vorn
// (kleineres z).

import type { Gegner } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Begrenzung, Hindernis } from '../stage.ts';
import type { Welt } from '../welt.ts';
import { EINS, abs, add, ausGanz, ganz, mul, neg, sub } from '../festkomma.ts';
import { bandGrenzen, inHindernis, schrittBegrenzt } from '../stage.ts';
import { behaelterHindernisse } from '../gegenstaende.ts';
import {
  BOLZER_GEHEN_X,
  BOLZER_GEHEN_Z,
  BOLZER_SCHNELL_X,
  BOLZER_SCHNELL_Z,
  GEH_COS,
  GEH_TAN_GRENZEN,
  HALTEPUNKT_MAX,
  HALTEPUNKT_MIN,
  RAMMBOCK_GEHEN_X,
  RAMMBOCK_GEHEN_Z,
  RAMMBOCK_SCHNELL_X,
  RAMMBOCK_SCHNELL_Z,
  ZUENDER_GEHEN_X,
  ZUENDER_GEHEN_Z,
  ZUENDER_SCHNELL_X,
  ZUENDER_SCHNELL_Z,
} from '../werte.ts';

/** Gehgeschwindigkeit in x und z (Fest). */
export interface Tempo {
  x: Fest;
  z: Fest;
}

/** Index des letzten Eintrags in GEH_COS (90°). */
const VIERTEL = GEH_COS.length - 1;

/** Gehgeschwindigkeit nach Typ und Gehstufe (Welt 5.1, 6). */
export function gehTempo(g: Gegner): Tempo {
  const schnell = g.gehstufe === 'schnell';
  switch (g.typ) {
    case 'Rammbock':
      return schnell ? { x: RAMMBOCK_SCHNELL_X, z: RAMMBOCK_SCHNELL_Z } : { x: RAMMBOCK_GEHEN_X, z: RAMMBOCK_GEHEN_Z };
    case 'Zünder':
      return schnell ? { x: ZUENDER_SCHNELL_X, z: ZUENDER_SCHNELL_Z } : { x: ZUENDER_GEHEN_X, z: ZUENDER_GEHEN_Z };
    default:
      return schnell ? { x: BOLZER_SCHNELL_X, z: BOLZER_SCHNELL_Z } : { x: BOLZER_GEHEN_X, z: BOLZER_GEHEN_Z };
  }
}

/**
 * Sektor im Viertel, 0 (waagrecht) bis 8 (nur Tiefe), aus |Δx| und |Δz| in
 * ganzen Pixeln: Zahl der Tangensgrenzen, die |Δz| / |Δx| überschreitet
 * (Vergleich |Δz| · 65536 > |Δx| · tan, ganzzahlig und exakt).
 */
export function gehSektor(ax: number, az: number): number {
  let k = 0;
  for (const t of GEH_TAN_GRENZEN) if (az * EINS > ax * t) k += 1;
  return k;
}

/** Schritt (v_x · cos α, v_z · sin α) zum Ziel in Richtung (dx, dz) (ganze Pixel), ohne Begrenzung. */
export function gehSchritt(t: Tempo, dx: number, dz: number): { sx: Fest; sz: Fest } {
  if (dx === 0 && dz === 0) return { sx: 0, sz: 0 };
  const k = gehSektor(Math.abs(dx), Math.abs(dz));
  let sx = mul(t.x, GEH_COS[k] as Fest);
  let sz = mul(t.z, GEH_COS[VIERTEL - k] as Fest);
  if (dx < 0) sx = neg(sx);
  if (dz < 0) sz = neg(sz);
  return { sx, sz };
}

/** Begrenzung der Gegner: Band, Hindernisse, unzerbrochene Behälter, keine Bildränder (Welt 2.2 Punkt 5). */
export function gegnerBegrenzung(welt: Welt): Begrenzung {
  return { stage: welt.stage, zusatz: behaelterHindernisse(welt), x_min: null, x_max: null };
}

/** x auf K + 16 … K + 368 begrenzt (Welt 4.1). */
export function fensterX(welt: Welt, x: number): number {
  const k = welt.kamera.x;
  return Math.min(k + HALTEPUNKT_MAX, Math.max(k + HALTEPUNKT_MIN, x));
}

/** z auf das Tiefenband bei x begrenzt (Welt 5.8: Warteposition begrenzt auf das Band). */
export function bandZ(welt: Welt, x: number, z: number): number {
  const b = bandGrenzen(welt.stage, x);
  if (b === null) return z;
  return Math.min(b.oben, Math.max(b.unten, z));
}

/** Hindernis (der Stage oder ein Behälter), das die Lage (x, z) in Höhe h sperrt, sonst null. */
function sperrendesHindernis(b: Begrenzung, x: number, z: number, h: number): Hindernis | null {
  for (const hi of b.stage.hindernisse) if (hi.hoehe > h && inHindernis(hi, x, z)) return hi;
  for (const hi of b.zusatz) if (hi.hoehe > h && inHindernis(hi, x, z)) return hi;
  return null;
}

/**
 * Ein Schritt des Gegners zum Ziel (zielX, zielZ) in ganzen Pixeln (Welt 5.3):
 * Sektor aus Δx, Δz; in z höchstens bis zum Ziel; nurZ: nur in der Tiefe.
 * Setzt g.x, g.z. Gibt zurück, ob der Schritt in x blockiert war.
 */
export function gehen(welt: Welt, g: Gegner, zielX: number, zielZ: number, t: Tempo, nurZ: boolean = false): boolean {
  const dx = nurZ ? 0 : zielX - ganz(g.x);
  const dz = zielZ - ganz(g.z);
  let { sx, sz } = gehSchritt(t, dx, dz);
  const rest = sub(ausGanz(zielZ), g.z);
  if (sz > 0) sz = rest > 0 ? Math.min(sz, rest) : 0;
  else if (sz < 0) sz = rest < 0 ? Math.max(sz, rest) : 0;
  const b = gegnerBegrenzung(welt);
  let r = schrittBegrenzt(b, g.x, g.z, g.h, sx, sz);
  if (r.blockiert_x && sx !== 0) {
    const hi = sperrendesHindernis(b, ganz(add(g.x, sx)), ganz(g.z), ganz(g.h));
    if (hi !== null) {
      let zMin = Infinity;
      let zMax = -Infinity;
      for (const p of hi.punkte) {
        zMin = Math.min(zMin, p.z);
        zMax = Math.max(zMax, p.z);
      }
      const zg = ganz(g.z);
      const richtung = zg - zMin <= zMax - zg ? -1 : 1;
      r = schrittBegrenzt(b, r.x, g.z, g.h, 0, richtung < 0 ? neg(t.z) : t.z);
    }
  }
  g.x = r.x;
  g.z = r.z;
  return r.blockiert_x;
}

/** Ist g weniger als tol (Fest) in x und in z von (x, z) (ganze Pixel) entfernt? */
export function nahAn(g: Gegner, x: number, z: number, tol: Fest): boolean {
  return abs(sub(g.x, ausGanz(x))) < tol && abs(sub(g.z, ausGanz(z))) < tol;
}
