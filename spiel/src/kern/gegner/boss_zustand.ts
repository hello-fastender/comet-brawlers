// Gemeinsame Hilfen des Bosses Ballast (K4) nach
// docs/spezifikation-welt.md, Abschnitt 7.
//
// Die eigenen Zustände des Bosses stehen in g.boss (entitaeten.ts
// BossFelder): Angriff, Wahl, Abläufe von Armschwung, Ansturm und Presse,
// Stoß, Bahn, Taumeln und Super-Armor; Positionen und Wege als Fest, Codes
// als Literaltypen.

import type { Gegner } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Begrenzung, SchrittErgebnis } from '../stage.ts';
import type { Welt } from '../welt.ts';
import { ausGanz } from '../festkomma.ts';
import { behaelterHindernisse } from '../gegenstaende.ts';
import { schrittBegrenzt } from '../stage.ts';
import { BILD_BREITE } from '../werte.ts';

// ===========================================================================
// Hilfen
// ===========================================================================

/** Eigener Angriff (Welt 7.4, SA3): von A bis zum letzten aktiven Frame, also ANKUENDIGUNG und ANGRIFF. */
export function eigenerAngriff(g: Gegner): boolean {
  return g.modus === 'ANKUENDIGUNG' || g.modus === 'ANGRIFF';
}

/** Gehört die Instanz im Feld angriff dem Boss selbst (nicht WG der Figur am geworfenen Boss)? */
export function eigeneInstanz(g: Gegner): boolean {
  return g.angriff !== null && g.angriff.urheber === g.schluessel;
}

/** Beendet den eigenen Angriff (Kampf 7: laufende Angriffe sind abgebrochen); fremde Instanzen bleiben. */
export function eigenenAngriffBeenden(g: Gegner): void {
  if (eigeneInstanz(g)) g.angriff = null;
  g.boss.art = '';
}

/**
 * Begrenzung eines Bossschritts (Welt 2.2 Punkt 5): Band, Hindernisse und
 * unzerbrochene Behälter (gegenstaende.ts behaelterHindernisse: ab h+1 kein
 * Hindernis, Welt 9.2), nicht die Bildränder; dazu der Arenarand (Welt 7.3:
 * Ansturm endet am Arenarand, Rückzug an der Arenawand kürzer): x von k0
 * bis k1 + Bildbreite (Festlegung K4, Lücke).
 */
export function bossBegrenzung(welt: Welt): Begrenzung {
  const a = welt.stage.arena;
  return {
    stage: welt.stage,
    zusatz: behaelterHindernisse(welt),
    x_min: a === null ? null : ausGanz(a.k0),
    x_max: a === null ? null : ausGanz(a.k1 + BILD_BREITE),
  };
}

/** Schritt des Bosses um (dx, dz) mit stage.ts schrittBegrenzt (erst x, dann z, Stopp an der Kante). */
export function bossSchritt(welt: Welt, g: Gegner, dx: Fest, dz: Fest): SchrittErgebnis {
  const r = schrittBegrenzt(bossBegrenzung(welt), g.x, g.z, g.h, dx, dz);
  g.x = r.x;
  g.z = r.z;
  return r;
}

/**
 * Ganze Zahl aus welt.fest[name] (Welt 11.3: ersetzt das Ergebnis einer
 * Ziehung nach der Ziehung) oder null, wenn nicht gesetzt.
 */
export function festZahl(welt: Welt, name: string, von: number, bis: number): number | null {
  const w = welt.fest[name];
  if (w === undefined) return null;
  const n = Number(w);
  if (!Number.isInteger(n) || n < von || n > bis) {
    throw new RangeError(`fest.${name} muss eine ganze Zahl von ${von} bis ${bis} sein, nicht „${w}“`);
  }
  return n;
}
