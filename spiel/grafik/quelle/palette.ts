// Globale Palette (Auftrag 4, 1.2; docs/grafik.md 1.2): alle Farben des
// Spiels. Jedes Material hat Namen, Basisfarbe und Treppe aus fünf Tönen
// (farbe.ts); Leuchttöne und Einzelfarben stehen ohne Treppe. Namen und
// Basiswerte genau wie in den Tabellen von docs/grafik.md 1.2. Keine andere
// Datei enthält Farbwerte. Phase 2 ergänzt diese Datei nur durch Anhängen.

import type { Treppe } from './farbe.ts';
import { hexZuPixel, hintergrundTreppe, treppe } from './farbe.ts';
import type { Leinwand, Pixel } from './leinwand.ts';
import { farbAbstand } from './farbe.ts';

/** Index eines Tons in der Treppe (docs/grafik.md 1.2). */
export type TonIndex = 0 | 1 | 2 | 3 | 4;
export const TON_DUNKEL: TonIndex = 0;
export const TON_SCHATTEN: TonIndex = 1;
export const TON_GRUND: TonIndex = 2;
export const TON_LICHT: TonIndex = 3;
export const TON_GLANZ: TonIndex = 4;

/** Material mit Treppe. */
export interface Material {
  /** Name wie in docs/grafik.md 1.2, z. B. 'JACKE_VELA'. */
  readonly name: string;
  /** Basisfarbe '#RRGGBB' (Grundton, Index 2). */
  readonly basis: string;
  /** true: glänzendes Material, der Glanzton (Index 4) ist erlaubt. */
  readonly glanz: boolean;
  /** Figurentreppe (treppe) oder Hintergrundtreppe (hintergrundTreppe). */
  readonly art: 'figur' | 'hintergrund';
  readonly treppe: Treppe;
}

function figur(name: string, basis: string, glanz: boolean): Material {
  return { name, basis, glanz, art: 'figur', treppe: treppe(basis) };
}

function hintergrund(name: string, basis: string): Material {
  return { name, basis, glanz: false, art: 'hintergrund', treppe: hintergrundTreppe(basis) };
}

// ===========================================================================
// Einzelfarben ohne Treppe
// ===========================================================================

/** Außenkontur aller Figuren und Gegenstände, Konturviolett (stilproben.html RAND1; docs/grafik.md 1.2). */
export const KONTUR: Pixel = hexZuPixel('#140E22');
/** Schatten unter den Figuren; feste Deckkraft setzt die Darstellung (docs/grafik.md 1.2). */
export const SCHATTEN_BLAU: Pixel = hexZuPixel('#0A1230');

// ===========================================================================
// Figuren- und Gegenstandsmaterialien (docs/grafik.md 1.2, „Globale Palette“)
// ===========================================================================

export const HAUT_HELL = figur('HAUT_HELL', '#E8B189', false);
export const HAUT_MITTEL = figur('HAUT_MITTEL', '#C98E68', false);
export const HAUT_DUNKEL = figur('HAUT_DUNKEL', '#8F5A3E', false);
export const HAAR_VELA = figur('HAAR_VELA', '#C2502B', true);
export const HAAR_DUNKEL = figur('HAAR_DUNKEL', '#3B2B25', false);
export const JACKE_VELA = figur('JACKE_VELA', '#2D4F86', false);
export const HANDSCHUH_VELA = figur('HANDSCHUH_VELA', '#3F73DC', true);
export const HOSE_GRAUBLAU = figur('HOSE_GRAUBLAU', '#445069', false);
export const LEDER = figur('LEDER', '#4A3428', false);
export const SIGNAL_ORANGE = figur('SIGNAL_ORANGE', '#E8812F', false);
export const OVERALL_BOLZER = figur('OVERALL_BOLZER', '#8B909B', false);
export const STAHL = figur('STAHL', '#6F7C99', true);
export const WESTE_OLIV = figur('WESTE_OLIV', '#6B7A3A', false);
export const HOSE_BRAUN = figur('HOSE_BRAUN', '#6A4A32', false);
export const UNIFORM_ZUENDER = figur('UNIFORM_ZUENDER', '#253A6B', false);
export const VISIER_ORANGE = figur('VISIER_ORANGE', '#FF9A2A', true);
export const ROHR_GRUEN = figur('ROHR_GRUEN', '#4F8A3C', true);
export const HEMD_BALLAST = figur('HEMD_BALLAST', '#6A3F8C', false);
export const HOSE_DUNKELGRAU = figur('HOSE_DUNKELGRAU', '#3E424C', false);
export const PUPPE_GRAU = figur('PUPPE_GRAU', '#9A9CA2', false);
export const BRATEN = figur('BRATEN', '#B5642E', true);
export const SCHALE_BLAU = figur('SCHALE_BLAU', '#3F6FC4', true);
export const NUDEL = figur('NUDEL', '#F2D98A', false);
export const STERNBEERE = figur('STERNBEERE', '#FF5AC8', true);
export const BLATT_GRUEN = figur('BLATT_GRUEN', '#4F9A46', false);
export const RAKETE_GELB = figur('RAKETE_GELB', '#FFD23A', true);
export const RAKETE_ROT = figur('RAKETE_ROT', '#E0402E', true);
export const FASS_STAHLBLAU = figur('FASS_STAHLBLAU', '#4F6F9E', true);
export const KISTE_GRAU = figur('KISTE_GRAU', '#7A7F88', false);
export const SIEGEL_ROT = figur('SIEGEL_ROT', '#C43A3A', false);
export const HOLZ = figur('HOLZ', '#8A6A44', false);
export const EIS = figur('EIS', '#8FD8FF', true);
export const FEUER = figur('FEUER', '#FF8A2A', true);
export const STAUB = figur('STAUB', '#A7ADB8', false);

/** Alle Figuren- und Gegenstandsmaterialien nach Namen (für den Umsetzer und die Berichte). */
export const MATERIALIEN: Readonly<Record<string, Material>> = Object.fromEntries(
  [
    HAUT_HELL,
    HAUT_MITTEL,
    HAUT_DUNKEL,
    HAAR_VELA,
    HAAR_DUNKEL,
    JACKE_VELA,
    HANDSCHUH_VELA,
    HOSE_GRAUBLAU,
    LEDER,
    SIGNAL_ORANGE,
    OVERALL_BOLZER,
    STAHL,
    WESTE_OLIV,
    HOSE_BRAUN,
    UNIFORM_ZUENDER,
    VISIER_ORANGE,
    ROHR_GRUEN,
    HEMD_BALLAST,
    HOSE_DUNKELGRAU,
    PUPPE_GRAU,
    BRATEN,
    SCHALE_BLAU,
    NUDEL,
    STERNBEERE,
    BLATT_GRUEN,
    RAKETE_GELB,
    RAKETE_ROT,
    FASS_STAHLBLAU,
    KISTE_GRAU,
    SIEGEL_ROT,
    HOLZ,
    EIS,
    FEUER,
    STAUB,
  ].map((m) => [m.name, m]),
);

// ===========================================================================
// Leuchttöne ohne Treppe (docs/grafik.md 1.2)
// ===========================================================================

/** Spulen der Magnethandschuhe. */
export const SPULE: Pixel = hexZuPixel('#7EF6FF');
export const NEON_MAGENTA: Pixel = hexZuPixel('#FF4FD8');
export const NEON_CYAN: Pixel = hexZuPixel('#59F3FF');
export const BRILLE_GLUT: Pixel = hexZuPixel('#FFB828');

/** Leuchttöne nach Namen. */
export const LEUCHTTOENE: Readonly<Record<string, Pixel>> = { SPULE, NEON_MAGENTA, NEON_CYAN, BRILLE_GLUT };

// ===========================================================================
// Hintergrundmaterialien (Hintergrundtreppe; docs/grafik.md 1.2)
// ===========================================================================

export const NACHTHIMMEL = hintergrund('NACHTHIMMEL', '#0B1636');
export const KOMETENSCHWEIF = hintergrund('KOMETENSCHWEIF', '#6FA8D8');
export const EISWAND = hintergrund('EISWAND', '#2A4E86');
export const ROST = hintergrund('ROST', '#9A4A2C');
export const EISBETON = hintergrund('EISBETON', '#4D5D78');
export const REIF = hintergrund('REIF', '#B9D0E8');
export const GUSSPLATTE = hintergrund('GUSSPLATTE', '#3F4A5E');
export const FASSADE_STAHL = hintergrund('FASSADE_STAHL', '#4A5268');
export const WAND_LADEN = hintergrund('WAND_LADEN', '#2C2444');
export const WARN_GELB = hintergrund('WARN_GELB', '#E8B42C');
export const KAMMER_STAHL = hintergrund('KAMMER_STAHL', '#2C3342');
export const REGAL = hintergrund('REGAL', '#4A4F5C');
export const LICHT_KALT = hintergrund('LICHT_KALT', '#CFE6FF');
export const KABEL = hintergrund('KABEL', '#2A2F3A');

/** Alle Hintergrundmaterialien nach Namen. */
export const HINTERGRUND_MATERIALIEN: Readonly<Record<string, Material>> = Object.fromEntries(
  [
    NACHTHIMMEL,
    KOMETENSCHWEIF,
    EISWAND,
    ROST,
    EISBETON,
    REIF,
    GUSSPLATTE,
    FASSADE_STAHL,
    WAND_LADEN,
    WARN_GELB,
    KAMMER_STAHL,
    REGAL,
    LICHT_KALT,
    KABEL,
  ].map((m) => [m.name, m]),
);

// ===========================================================================
// Anzeigeleiste (docs/grafik.md 1.2); Kontur dort ebenfalls KONTUR
// ===========================================================================

export const LEISTE_TEXT: Pixel = hexZuPixel('#E8ECF4');
export const BALKEN_GRUEN: Pixel = hexZuPixel('#4CCF5A');
export const BALKEN_GELB: Pixel = hexZuPixel('#F2D23A');
export const BALKEN_ORANGE: Pixel = hexZuPixel('#F08A30');
export const BALKEN_LEER: Pixel = hexZuPixel('#1A1F2C');

// ===========================================================================
// Werkzeugfarben der Kontaktbögen (nur Abnahmebilder unter docs/bilder/,
// nicht im Spiel; Festlegung G0)
// ===========================================================================

/** Grund der Kontaktbögen: dunkles Eisblau wie der Grund der Stilprobe (stilproben.html, Nahansicht). */
export const KONTAKT_GRUND: Pixel = hexZuPixel('#18264A');
/** Grund einer Bildzelle, etwas heller, damit die Bildgrenze sichtbar ist. */
export const KONTAKT_ZELLE: Pixel = hexZuPixel('#1F3158');
/** Bodenlinie am Anker. */
export const KONTAKT_BODEN: Pixel = hexZuPixel('#3D5A8C');
/** Ankerkreuz. */
export const KONTAKT_ANKER: Pixel = hexZuPixel('#FF4FD8');
/** Schrift (Bildnummer, Dauer, Titel). */
export const KONTAKT_TEXT: Pixel = hexZuPixel('#E8ECF4');
/** Rahmen um Bilder, die in aktiven Frames stehen. */
export const KONTAKT_AKTIV: Pixel = hexZuPixel('#FF9A2A');

// ===========================================================================
// Farbbudget und Zählung (docs/grafik.md 1.2, „Farbbudget“)
// ===========================================================================

/** Höchstzahl der Farben je Blatt einschließlich durchsichtig (docs/grafik.md 1.2). */
export const FARBBUDGET = {
  /** je Figur 16 (15 plus durchsichtig) */
  figur: 16,
  /** je Gegenstand 8 */
  gegenstand: 8,
  /** je Hintergrund eines Abschnitts 48 */
  hintergrund: 48,
  /** Anzeigeleiste 8 */
  anzeige: 8,
} as const;

/** Menge der verschiedenen Pixelwerte (einschließlich DURCHSICHTIG, falls vorhanden). */
export function farbenMenge(bilder: Leinwand | readonly Leinwand[]): Set<Pixel> {
  const liste: readonly Leinwand[] = Array.isArray(bilder) ? bilder : [bilder as Leinwand];
  const menge = new Set<Pixel>();
  for (const b of liste) for (const p of b.daten) menge.add(p);
  return menge;
}

/** Zahl der verschiedenen Pixelwerte einschließlich durchsichtig (vergleichbar mit FARBBUDGET). */
export function farbenZaehlen(bilder: Leinwand | readonly Leinwand[]): number {
  return farbenMenge(bilder).size;
}

/** Nächste Farbe aus einer Auswahl (Abstand nach farbAbstand); bei Gleichstand die frühere. */
export function naechsteFarbe(p: Pixel, auswahl: readonly Pixel[]): { farbe: Pixel; index: number; abstand: number } {
  if (auswahl.length === 0) throw new RangeError('naechsteFarbe: leere Auswahl');
  let index = 0;
  let abstand = Infinity;
  for (let i = 0; i < auswahl.length; i++) {
    const d = farbAbstand(p, auswahl[i] as Pixel);
    if (d < abstand) {
      abstand = d;
      index = i;
    }
  }
  return { farbe: auswahl[index] as Pixel, index, abstand };
}

/** Alle Töne der genannten Materialien (je Material die Töne aus toene, Vorgabe alle fünf) in fester Reihenfolge. */
export function treppenFarben(materialien: readonly Material[], toene: readonly TonIndex[] = [0, 1, 2, 3, 4]): Pixel[] {
  const aus: Pixel[] = [];
  for (const m of materialien) for (const t of toene) if (!aus.includes(m.treppe[t])) aus.push(m.treppe[t]);
  return aus;
}

// ===========================================================================
// Ergänzung G5 (Hintergründe, Auftrag 4, Phase 2; docs/grafik.md 4.8 und 7, G5-2)
// ===========================================================================

/** Schein um die Neonschrift des Funkladens (Rasterhof auf der Wand und Spiegelung am Boden), gedämpftes Magenta. */
export const NEON_SCHEIN = hintergrund('NEON_SCHEIN', '#B84AA6');
/** Beschlagnahmte Holzkisten in den Regalen der Asservatenkammer (Hintergrund, nicht die Bosskiste). */
export const ASSERVAT_HOLZ = hintergrund('ASSERVAT_HOLZ', '#7E5E3E');
/** Hintergrundmaterialien der Ergänzung G5 nach Namen (HINTERGRUND_MATERIALIEN bleibt unverändert). */
export const HINTERGRUND_MATERIALIEN_G5: Readonly<Record<string, Material>> = Object.fromEntries([NEON_SCHEIN, ASSERVAT_HOLZ].map((m) => [m.name, m]));
/** Farbe der Blende und ihrer Rasterkante (wie heute FARBE.rand in src/darstellung/masse.ts: Schwarz). */
export const BLENDE_DUNKEL: Pixel = hexZuPixel('#000000');
