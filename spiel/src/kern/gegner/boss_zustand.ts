// Interner Zustand und gemeinsame Hilfen des Bosses Ballast (K4) nach
// docs/spezifikation-welt.md, Abschnitt 7.
//
// Der Boss braucht mehr Zähler als die Felder der Gegner (entitaeten.ts)
// bieten. Sie stehen in g.timer unter Schlüsseln mit dem Präfix „boss_“
// (Vertrag entitaeten.ts: modulinterne Zähler in timer, nie darüber
// iterieren). 0 heißt „nicht gesetzt“ (Frame 1 ist der erste Logikschritt).
// VORSCHLAG: eigene Felder im Gegner statt timer (siehe Bericht K4).

import type { Blick, Gegner } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Begrenzung, Hindernis, SchrittErgebnis } from '../stage.ts';
import type { Welt } from '../welt.ts';
import { ausGanz, ganz } from '../festkomma.ts';
import { behaelterHindernis, schrittBegrenzt } from '../stage.ts';
import { BILD_BREITE } from '../werte.ts';

// ===========================================================================
// Zähler in g.timer
// ===========================================================================

/** Schlüssel der Bosszähler (ohne Präfix). */
export type BossZaehler =
  /** laufender Angriff: 0 keiner, ART_AS, ART_AN, ART_KP */
  | 'art'
  /** gewählter, noch nicht begonnener Angriff (Armschwung: Annäherung läuft) */
  | 'wahl'
  /** A des laufenden Schwungs (Armschwung) */
  | 'a'
  /** laufende Instanz hat wirksam getroffen (0/1) */
  | 'treffer'
  /** erster Frame nach dem Nachlauf (BEREIT ab) */
  | 'bereit_ab'
  /** Gehbefehl aus W4: Richtung in x (−1, 0, 1) und Schritt in z (Fest mit Vorzeichen) */
  | 'geh_x'
  | 'geh_z'
  /** Ansturm: Lauf-Frames, Weg (Fest), Lauf endet (0/1), Auslauf-Frames */
  | 'lauf_n'
  | 'lauf_weg'
  | 'lauf_ende'
  | 'auslauf_n'
  /** Körperpresse: Lage in A, Weg zum Ziel (Fest), Bahnframe k, Stoppframes, Frame des letzten aktiven Frames, Landung */
  | 'kp_x0'
  | 'kp_z0'
  | 'kp_dx'
  | 'kp_dz'
  | 'kp_k'
  | 'kp_stopp'
  | 'kp_letzt'
  | 'kp_landung'
  /** Stoß RZ: Beginn S, Richtung, Weg (Fest), wartet auf das Ende eines Angriffs (0/1) */
  | 'stoss_beginn'
  | 'stoss_richtung'
  | 'stoss_weg'
  | 'stoss_offen'
  /** Bahn: Treffer W, Art (BAHN_*), Bodenkontakt (Frame), Ruhe (Frame), frei ab G */
  | 'w'
  | 'bahn_art'
  | 'kontakt'
  | 'ruhe'
  | 'g'
  /** Taumeln: Weg (Fest) */
  | 'taumeln_weg'
  /** Super-Armor: Fälligkeit nach dem Losreißen (SA5), im Vorframe gehalten (0/1) */
  | 'sa_faellig'
  | 'gehalten'
  /** Fall des Bosses (7.6) ausgeführt (0/1) */
  | 'fall';

/** Wert eines Bosszählers (0, wenn nicht gesetzt). */
export function lies(g: Gegner, k: BossZaehler): number {
  return g.timer['boss_' + k] ?? 0;
}

/** Setzt einen Bosszähler. */
export function setze(g: Gegner, k: BossZaehler, wert: number): void {
  g.timer['boss_' + k] = wert;
}

// ===========================================================================
// Kennungen
// ===========================================================================

/** Angriffe der Scheibe (Welt 7.3). */
export const ART_AS = 1;
export const ART_AN = 2;
export const ART_KP = 3;

/** Code je Angriffsart (Index = Art), für Wahl und fest.boss_angriff. */
export const ART_CODES: readonly string[] = ['', 'AS', 'AN', 'KP'];

/** Bahnen des Bosses (Welt 7.1; Kampf 5.7). */
export const BAHN_UMWERFEN = 1; // F1 mit eigenem Auslauf (Ruhe 127,25 px)
export const BAHN_KNIE = 2; // F2 (dritter Kniestoß)
export const BAHN_WURF = 3; // F3 (Wurf)
export const BAHN_EXPLOSION = 4; // F1 bis zum Bodenkontakt (109,25 px)
export const BAHN_TOD = 5; // F4

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
  setze(g, 'art', 0);
}

/** Richtung von der Figur weg; bei gleichem x die Blickrichtung der Figur (wie P14). */
export function wegVonFigur(welt: Welt, g: Gegner): Blick {
  const dx = ganz(g.x) - ganz(welt.figur.x);
  if (dx > 0) return 1;
  if (dx < 0) return -1;
  return welt.figur.blick;
}

/**
 * Begrenzung eines Bossschritts (Welt 2.2 Punkt 5): Band, Hindernisse und
 * unzerbrochene Behälter (ab h+1 kein Hindernis, Welt 9.2), nicht die
 * Bildränder; dazu der Arenarand (Welt 7.3: Ansturm endet am Arenarand,
 * Rückzug an der Arenawand kürzer): x von k0 bis k1 + Bildbreite
 * (Festlegung K4, Lücke).
 */
export function bossBegrenzung(welt: Welt): Begrenzung {
  const zusatz: Hindernis[] = [];
  for (const o of welt.objekte) {
    if (o.belegt && o.typ === 'Behälter' && (!o.zerbrochen || o.zerbrochen_h >= welt.frame)) {
      zusatz.push(behaelterHindernis(o.id, ganz(o.x), ganz(o.z)));
    }
  }
  const a = welt.stage.arena;
  return {
    stage: welt.stage,
    zusatz,
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

/**
 * E-10 (Welt 5.7; Kampf 6.5): Vom Tod der Figur (t+1) bis zu ihrem Erscheinen
 * (N+1) und während einer Blende beginnt auch der Boss keinen Angriff; ebenso
 * nach dem Stage-Ende und im Game Over.
 */
export function angriffGesperrt(welt: Welt): boolean {
  const f = welt.figur;
  if (welt.kamera.modus === 'BLENDE') return true;
  if (welt.rahmen.phase === 'ENDE' || welt.rahmen.phase === 'GAMEOVER') return true;
  if (f.aktion === 'TOT') return true;
  if (f.tod_t > 0 && welt.frame > f.tod_t && (f.neueinstieg_n === 0 || welt.frame <= f.neueinstieg_n + 1)) return true;
  return false;
}
