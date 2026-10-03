// Gehen der Gegner nach docs/spezifikation-welt.md, 5.3 (K3, Stufe 2), für
// Nahkämpfer (nah.ts) und Fernkämpfer (fern.ts):
// - Gehrichtung als einer von 32 Sektoren zu 11,25°, aus Δx und Δz zum Ziel
//   über die Tabelle der Tangensgrenzen (werte.ts GEH_TAN_GRENZEN), ohne
//   Winkelfunktion; Schritt (v_x · cos α, v_z · sin α) aus der Tabelle des
//   Gehtempos (werte.ts GEH_SCHRITT_…, je Tempo einmal gerundet, Ellipse).
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
import { EINS, abs, add, ausGanz, ganz, neg, produktGroesser, sub } from '../festkomma.ts';
import { bandGrenzen, inHindernis, schrittBegrenzt } from '../stage.ts';
import { behaelterHindernisse } from '../gegenstaende.ts';
import {
  GEH_SCHRITT_BOLZER,
  GEH_SCHRITT_BOLZER_SCHNELL,
  GEH_SCHRITT_RAMMBOCK,
  GEH_SCHRITT_RAMMBOCK_SCHNELL,
  GEH_SCHRITT_ZUENDER,
  GEH_SCHRITT_ZUENDER_SCHNELL,
  GEH_TAN_GRENZEN,
  HALTEPUNKT_MAX,
  HALTEPUNKT_MIN,
} from '../werte.ts';

/**
 * Gehtempo als Schritttabelle (Welt 5.3): x[k] = v_x · cos(k · 11,25°),
 * z[k] = v_z · sin(k · 11,25°) für die Sektoren k = 0 … 8 im Viertel, je
 * Tempo einmal auf 1/65536 gerundet (werte.ts GEH_SCHRITT_…).
 */
export interface Tempo {
  readonly x: readonly Fest[];
  readonly z: readonly Fest[];
}

/** Sektor 90° (nur Tiefe): Zahl der Tangensgrenzen im Viertel. */
const VIERTEL = GEH_TAN_GRENZEN.length;

/** Eintrag k einer Schritttabelle (Index geprüft). */
function schritt(tabelle: readonly Fest[], k: number): Fest {
  const w = tabelle[k];
  if (w === undefined) throw new RangeError(`Gehsektor ${k} außerhalb der Tabelle`);
  return w;
}

/** Gehtempo nach Typ und Gehstufe (Welt 5.1, 6). */
export function gehTempo(g: Gegner): Tempo {
  const schnell = g.gehstufe === 'schnell';
  switch (g.typ) {
    case 'Rammbock':
      return schnell ? GEH_SCHRITT_RAMMBOCK_SCHNELL : GEH_SCHRITT_RAMMBOCK;
    case 'Zünder':
      return schnell ? GEH_SCHRITT_ZUENDER_SCHNELL : GEH_SCHRITT_ZUENDER;
    default:
      return schnell ? GEH_SCHRITT_BOLZER_SCHNELL : GEH_SCHRITT_BOLZER;
  }
}

/** Volles Tempo in der Tiefe (Schritt nur in z, Sektor 90°). */
export function tiefenTempo(t: Tempo): Fest {
  return schritt(t.z, VIERTEL);
}

/**
 * Sektor im Viertel, 0 (waagrecht) bis 8 (nur Tiefe), aus |Δx| und |Δz| in
 * ganzen Pixeln: Zahl der Tangensgrenzen, die |Δz| / |Δx| überschreitet
 * (Vergleich |Δz| · 65536 > |Δx| · tan mit festkomma.ts produktGroesser,
 * exakt auch über 32 Bit).
 */
export function gehSektor(ax: number, az: number): number {
  let k = 0;
  for (const t of GEH_TAN_GRENZEN) if (produktGroesser(az, EINS, ax, t)) k += 1;
  return k;
}

/** Schritt (v_x · cos α, v_z · sin α) zum Ziel in Richtung (dx, dz) (ganze Pixel), ohne Begrenzung: aus der Tabelle nachgeschlagen. */
export function gehSchritt(t: Tempo, dx: number, dz: number): { sx: Fest; sz: Fest } {
  if (dx === 0 && dz === 0) return { sx: 0, sz: 0 };
  const k = gehSektor(Math.abs(dx), Math.abs(dz));
  let sx = schritt(t.x, k);
  let sz = schritt(t.z, k);
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
      r = schrittBegrenzt(b, r.x, g.z, g.h, 0, richtung < 0 ? neg(tiefenTempo(t)) : tiefenTempo(t));
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
