// Anzeigeleiste, Pixelschrift 8 × 8 und 16 × 16, große Texte (Auftrag 4, 1.6 und
// Phase 2, G6; docs/grafik.md 4.9). Erzeugt das Blatt anzeige.png mit dem Atlas
// anzeige.json und die Kontaktbögen kontakt_anzeige.png (alle Teile) und
// kontakt_anzeige_bild.png (ganzes Bild 384 × 224 mit Leiste, Texten und Pfeil).
//
// Inhalt des Blatts:
//   Schrift klein und groß (Bitmuster aus schrift.ts) mit Schattenkante unten
//   rechts und 1 px Umriss in KONTUR, damit sie auf dunklem und hellem Grund
//   lesbar ist; Balkenbausteine (Rahmen, Füllspalte je Lage, Leerspalte);
//   Lebenssymbol (Velas Kopf mit Pferdeschwanz, Bitmuster 8 × 8); Pfeil
//   „weiter“ (Vieleck); die großen Texte als fertige Bilder.
// Farben: höchstens 8 einschließlich durchsichtig (FARBBUDGET.anzeige), siehe
// LEISTE_FARBEN. Die Zeichenfunktionen unten (teilZeichnen, textSetzen,
// balkenSetzen, leisteSetzen) lesen nur Blatt und Atlas, wie der Einbau in
// Phase 3 es im Browser tut; sie bauen die Kontaktbögen und dienen als Vorlage.

import type { Befund } from './bauen.ts';
import type { Erzeugnis } from './erzeugnis.ts';
import type { AnzeigeDaten, Balken } from '../../src/kern/rahmen.ts';
import { balken } from '../../src/kern/rahmen.ts';
import { ANZEIGE, BILD_BREITE, BILD_HOEHE, LP_BALKEN_BREITE, PUNKTE_BALLAST } from '../../src/kern/werte.ts';
import type { Punkt } from './geometrie.ts';
import { konturAussen, konturLuecken, streupixel } from './kontur.ts';
import { textBreite as kontaktTextBreite, textZeichnen as kontaktText } from './kontakt.ts';
import type { Pixel } from './leinwand.ts';
import { DURCHSICHTIG, Leinwand, deckend } from './leinwand.ts';
import {
  BALKEN_GELB,
  BALKEN_GRUEN,
  BALKEN_LEER,
  BALKEN_ORANGE,
  EISBETON,
  FARBBUDGET,
  HAUT_HELL,
  KONTAKT_BODEN,
  KONTAKT_GRUND,
  KONTAKT_TEXT,
  KONTAKT_ZELLE,
  KONTUR,
  LEISTE_TEXT,
  LICHT_KALT,
  NACHTHIMMEL,
  REIF,
  TON_GRUND,
  WAND_LADEN,
  farbenMenge,
} from './palette.ts';
import { pngSchreiben } from './png.ts';
import { verlaufSenkrecht } from './raster.ts';
import type { Schriftmass } from './schrift.ts';
import { ERSATZ_ZEICHEN, GROSS, KLEIN, ZEICHENVORRAT, koerper, maske } from './schrift.ts';

// ===========================================================================
// Farben (docs/grafik.md 1.2, Anzeigeleiste; Farbbudget 8)
// ===========================================================================

/** Haut des Lebenssymbols: Grundton von HAUT_HELL wie Velas Haut (docs/grafik.md 4.1). */
const HAUT: Pixel = HAUT_HELL.treppe[TON_GRUND];

/** Alle Farben des Blatts außer durchsichtig: 7 + durchsichtig = FARBBUDGET.anzeige (8). */
export const LEISTE_FARBEN: readonly Pixel[] = [KONTUR, LEISTE_TEXT, BALKEN_GRUEN, BALKEN_GELB, BALKEN_ORANGE, BALKEN_LEER, HAUT];

/** Farbe der Lage n (1, 2, 3) des LP-Balkens: grün, gelb, orange (Welt 10.1); darüber bleibt orange. */
export const LAGEN_FARBEN: readonly Pixel[] = [BALKEN_GRUEN, BALKEN_GELB, BALKEN_ORANGE];

/**
 * Farbbänder der großen Schrift nach Zeile des Körpers (14 Zeilen): oben hell,
 * Mitte gelb, unten orange wie Titelschriften der Automaten um 1991; Bänder
 * 5/5/4 Zeilen (Festlegung G6-3). Gilt auch für den Pfeil.
 */
const BAENDER: readonly { readonly bis: number; readonly farbe: Pixel }[] = [
  { bis: 4, farbe: LEISTE_TEXT },
  { bis: 9, farbe: BALKEN_GELB },
  { bis: 13, farbe: BALKEN_ORANGE },
];

function bandFarbe(zeile: number): Pixel {
  for (const b of BAENDER) if (zeile <= b.bis) return b.farbe;
  return (BAENDER[BAENDER.length - 1] as { farbe: Pixel }).farbe;
}

// ===========================================================================
// Maße (Welt 10.1 über werte.ts ANZEIGE; Festlegungen G6 in docs/grafik.md 4.9)
// ===========================================================================

/** Umriss in KONTUR um jedes Zeichen, 1 px (Festlegung G6-1). */
export const UMRISS = 1;
/** Höhe der Füllung des LP-Balkens: Zeilen 18 bis 23 (Welt 10.1). */
export const BALKEN_HOEHE = ANZEIGE.lp_balken.zeile1 - ANZEIGE.lp_balken.zeile0 + 1;
/** Höhe eines Balkenbausteins: Füllung plus Rahmen oben und unten. */
export const BAUSTEIN_HOEHE = BALKEN_HOEHE + 2;
/** Pfeil „weiter“: x 340 bis 376, Zeilen 96 bis 112 (Welt 10.1) = 37 × 17. */
export const PFEIL_BREITE = ANZEIGE.pfeil.x1 - ANZEIGE.pfeil.x0 + 1;
export const PFEIL_HOEHE = ANZEIGE.pfeil.zeile1 - ANZEIGE.pfeil.zeile0 + 1;
/** Kantenlänge des Lebenssymbols (Auftrag 4, G6: etwa 8 × 8; Bitmuster bis 8 × 8, Auftrag 4, 6). */
export const SYMBOL_GROESSE = 8;
/** Abstand der Lebenszahl vom Symbol: Symbol 8 px plus 2 px Luft (Festlegung G6-5). */
export const LEBEN_ZAHL_DX = SYMBOL_GROESSE + 2;
/** Länge des Schafts des Pfeils in px vom linken Rand der Füllung (knapp die Hälfte; Festlegung G6-6). */
const PFEIL_SCHAFT = 16;
/** Halbe Dicke des Schafts in px (Schaft 6 px, Spitze 14 px hoch; Festlegung G6-6). */
const PFEIL_SCHAFT_HALB = 3;

/** Name des Blatts (Auftrag 4, 2.2). */
export const ANZEIGE_BLATT = 'anzeige';
/** Kontaktbögen (docs/bilder/kontakt_anzeige*.png). */
export const KONTAKT_DATEI = 'kontakt_anzeige.png';
export const KONTAKT_BILD_DATEI = 'kontakt_anzeige_bild.png';
/** Vergrößerung der Kontaktbögen (Auftrag 4, 2.2: 2×). */
const KONTAKT_FAKTOR = 2;

/** Große Texte der Anzeige als fertige Bilder; Schlüssel = Text wie in anzeige(welt).texte bzw. „PAUSE“ (Welt 10.3 bis 10.5). */
export const GROSSE_TEXTE: readonly string[] = [
  'PAUSE',
  'STAGE CLEAR',
  'GAME OVER',
  'BALLAST BESIEGT',
  String(PUNKTE_BALLAST),
  `BALLAST BESIEGT ${PUNKTE_BALLAST}`,
];

// ===========================================================================
// Teile zeichnen
// ===========================================================================

/** Ein Teil des Blatts vor dem Packen: Pixel und Anker (Pixel, der auf die Zielposition fällt). */
export interface Teil {
  readonly leinwand: Leinwand;
  readonly ankerX: number;
  readonly ankerY: number;
}

/**
 * Zeichen als Bild: Körper aus schrift.ts in Schriftfarbe (klein LEISTE_TEXT,
 * groß in Bändern), Schatten in KONTUR um 1 … schatten px nach rechts unten
 * versetzt (geschlossen bis an den Körper), dann 1 px Umriss in KONTUR um
 * alles. Bild (zelle + 2) im Quadrat, Zelle bei (1, 1) = Anker.
 */
export function zeichenBild(groesse: Schriftmass, zeichen: string): Teil {
  const m = maske(koerper(groesse, zeichen));
  const seite = groesse.zelle + 2 * UMRISS;
  const l = new Leinwand(seite, seite);
  m.forEach((zeile, y) =>
    zeile.forEach((an, x) => {
      if (!an) return;
      for (let d = 1; d <= groesse.schatten; d++) l.setze(UMRISS + x + d, UMRISS + y + d, KONTUR);
    }),
  );
  const gross = groesse.zelle === GROSS.zelle;
  m.forEach((zeile, y) =>
    zeile.forEach((an, x) => {
      if (an) l.setze(UMRISS + x, UMRISS + y, gross ? bandFarbe(y) : LEISTE_TEXT);
    }),
  );
  konturAussen(l, KONTUR);
  return { leinwand: l, ankerX: UMRISS, ankerY: UMRISS };
}

/**
 * Balkenbaustein: eine Spalte 1 × 8, Zeile 0 und 7 Rahmen (KONTUR), Zeilen 1
 * bis 6 Füllung. farbe null: Rahmenspalte links bzw. rechts (Zeilen 1 bis 6
 * KONTUR, Ecken durchsichtig, also abgerundet). Anker (0, 1): die oberste
 * Füllzeile liegt auf zeile0 des Balkens.
 */
export function bausteinBild(farbe: Pixel | null): Teil {
  const l = new Leinwand(1, BAUSTEIN_HOEHE);
  if (farbe === null) l.rechteck(0, 1, 1, BALKEN_HOEHE, KONTUR);
  else {
    l.setze(0, 0, KONTUR);
    l.rechteck(0, 1, 1, BALKEN_HOEHE, farbe);
    l.setze(0, BAUSTEIN_HOEHE - 1, KONTUR);
  }
  return { leinwand: l, ankerX: 0, ankerY: 1 };
}

/**
 * Lebenssymbol: Velas Kopf im Profil nach rechts, Haar mit Glanz, Auge,
 * Pferdeschwanz hängt hinten herab (Bitmuster 8 × 8 von Hand, Auftrag 4, 6).
 * K Kontur, H Haar, G Glanz des Haars, S Haut.
 */
export const LEBEN_MUSTER: readonly string[] = [
  '...KKKK.',
  '..KGGHHK',
  '.KHHHHHK',
  'KHHHHSSK',
  'KHKHSKSK',
  'KHKHSKSK',
  'KHKKSSK.',
  '.K..KK..',
];

/** Farben des Lebenssymbols je Zeichen des Musters (Haar orange wie Velas Haarlicht, Glanz gelb). */
const LEBEN_FARBEN: Readonly<Record<string, Pixel>> = { K: KONTUR, H: BALKEN_ORANGE, G: BALKEN_GELB, S: HAUT };

/** Lebenssymbol 8 × 8, Anker oben links (liegt auf ANZEIGE.leben). */
export function lebenBild(): Teil {
  const l = new Leinwand(SYMBOL_GROESSE, SYMBOL_GROESSE);
  LEBEN_MUSTER.forEach((zeile, y) =>
    [...zeile].forEach((z, x) => {
      const f = LEBEN_FARBEN[z];
      if (f !== undefined) l.setze(x, y, f);
    }),
  );
  return { leinwand: l, ankerX: 0, ankerY: 0 };
}

/**
 * Pfeil „weiter“ 37 × 17 (Welt 10.1): Füllung als Vieleck (Schaft 6 px hoch,
 * Spitze über 14 Zeilen) in den Bändern der großen Schrift, Schatten 1 px nach
 * rechts unten und 1 px Umriss in KONTUR. Anker oben links (liegt auf
 * x0, zeile0 aus ANZEIGE.pfeil).
 */
export function pfeilBild(): Teil {
  const l = new Leinwand(PFEIL_BREITE, PFEIL_HOEHE);
  // Füllung in x 1 … breite − 3, y 1 … hoehe − 3 (Umriss links und oben, Schatten und Umriss rechts und unten)
  const x0 = UMRISS;
  const x1 = PFEIL_BREITE - 2 * UMRISS - 1;
  const y0 = UMRISS;
  const y1 = PFEIL_HOEHE - 2 * UMRISS - 1;
  const mitte = (y0 + y1 + 1) / 2;
  const basis = x0 + PFEIL_SCHAFT;
  const punkte: Punkt[] = [
    { x: x0, y: mitte - PFEIL_SCHAFT_HALB },
    { x: basis, y: mitte - PFEIL_SCHAFT_HALB },
    { x: basis, y: y0 },
    { x: x1 + 1, y: mitte },
    { x: basis, y: y1 + 1 },
    { x: basis, y: mitte + PFEIL_SCHAFT_HALB },
    { x: x0, y: mitte + PFEIL_SCHAFT_HALB },
  ];
  const fuellung = new Leinwand(PFEIL_BREITE, PFEIL_HOEHE);
  fuellung.polygon(punkte, LEISTE_TEXT);
  for (let y = 0; y < PFEIL_HOEHE; y++) {
    for (let x = 0; x < PFEIL_BREITE; x++) if (deckend(fuellung.hole(x, y))) l.setze(x + 1, y + 1, KONTUR);
  }
  for (let y = 0; y < PFEIL_HOEHE; y++) {
    for (let x = 0; x < PFEIL_BREITE; x++) if (deckend(fuellung.hole(x, y))) l.setze(x, y, bandFarbe(y - y0));
  }
  konturAussen(l, KONTUR);
  return { leinwand: l, ankerX: 0, ankerY: 0 };
}

/** Großer Text als fertiges Bild: Zeichen der großen Schrift mit Laufweite 16 nebeneinander; Anker (1, 1) = Zelle des ersten Zeichens. */
export function grosserTextBild(text: string): Teil {
  const zeichen = [...text];
  const l = new Leinwand(zeichen.length * GROSS.laufweite + 2 * UMRISS, GROSS.zelle + 2 * UMRISS);
  zeichen.forEach((z, i) => {
    const t = zeichenBild(GROSS, z);
    l.einsetzen(t.leinwand, UMRISS + i * GROSS.laufweite - t.ankerX, UMRISS - t.ankerY);
  });
  return { leinwand: l, ankerX: UMRISS, ankerY: UMRISS };
}

// ===========================================================================
// Atlas (Format docs/grafik.md 4.9)
// ===========================================================================

/** Rechteck im Blatt mit Anker. */
export interface AtlasTeil {
  readonly x: number;
  readonly y: number;
  readonly b: number;
  readonly h: number;
  readonly ankerX: number;
  readonly ankerY: number;
}

/** Eine Schriftgröße im Atlas. */
export interface AtlasSchrift {
  readonly zelle: number;
  readonly laufweite: number;
  readonly zeilenhoehe: number;
  readonly schatten: number;
  readonly umriss: number;
  readonly ersatz: string;
  readonly zeichen: Readonly<Record<string, AtlasTeil>>;
}

/** Atlas der Anzeige (anzeige.json). */
export interface AnzeigeAtlas {
  readonly blatt: string;
  readonly farben: number;
  readonly schriften: { readonly klein: AtlasSchrift; readonly gross: AtlasSchrift };
  readonly balken: {
    readonly breite: number;
    readonly hoehe: number;
    readonly rahmen_links: AtlasTeil;
    readonly rahmen_rechts: AtlasTeil;
    readonly lagen: readonly AtlasTeil[];
    readonly leer: AtlasTeil;
  };
  readonly leben: AtlasTeil & { readonly zahlDx: number };
  readonly pfeil: AtlasTeil;
  readonly texte: Readonly<Record<string, AtlasTeil>>;
}

/** Ein Teil mit Schlüssel für das Packen. */
interface Eintrag {
  readonly gruppe: string;
  readonly schluessel: string;
  readonly teil: Teil;
}

/** Abstand zwischen Teilen und zum Rand des Blatts (wie blatt.ts). */
const ABSTAND = 1;

/** Alle Teile in Blattreihenfolge, je Gruppe ein Abschnitt (neue Zeile). */
export function anzeigeTeile(): Eintrag[][] {
  const klein = ZEICHENVORRAT.map((z) => ({ gruppe: 'klein', schluessel: z, teil: zeichenBild(KLEIN, z) }));
  const gross = ZEICHENVORRAT.map((z) => ({ gruppe: 'gross', schluessel: z, teil: zeichenBild(GROSS, z) }));
  const sonst: Eintrag[] = [
    { gruppe: 'balken', schluessel: 'rahmen_links', teil: bausteinBild(null) },
    { gruppe: 'balken', schluessel: 'rahmen_rechts', teil: bausteinBild(null) },
    ...LAGEN_FARBEN.map((f, i) => ({ gruppe: 'balken', schluessel: `lage_${i + 1}`, teil: bausteinBild(f) })),
    { gruppe: 'balken', schluessel: 'leer', teil: bausteinBild(BALKEN_LEER) },
    { gruppe: 'leben', schluessel: 'leben', teil: lebenBild() },
    { gruppe: 'pfeil', schluessel: 'pfeil', teil: pfeilBild() },
  ];
  const texte = GROSSE_TEXTE.map((t) => ({ gruppe: 'texte', schluessel: t, teil: grosserTextBild(t) }));
  return [klein, gross, sonst, texte];
}

/** Blatt und Atlas der Anzeige. */
export interface AnzeigeBlatt {
  readonly leinwand: Leinwand;
  readonly atlas: AnzeigeAtlas;
}

/**
 * Packt die Teile zeilenweise in fester Reihenfolge (jede Gruppe beginnt eine
 * neue Zeile, Umbruch an der Breite des breitesten Teils plus Rand). Gleiche
 * Teile liegen einzeln im Blatt (die Rahmenspalten links und rechts sind gleich,
 * bleiben aber getrennt, damit der Atlas beide Schlüssel eigenständig führt).
 */
export function anzeigeBlatt(): AnzeigeBlatt {
  const abschnitte = anzeigeTeile();
  const alle = abschnitte.flat();
  const breite = Math.max(...alle.map((e) => e.teil.leinwand.breite)) + 2 * ABSTAND;
  const lagen = new Map<Eintrag, { x: number; y: number }>();
  let y = ABSTAND;
  for (const abschnitt of abschnitte) {
    let x = ABSTAND;
    let zeile = 0;
    for (const e of abschnitt) {
      const l = e.teil.leinwand;
      if (x + l.breite + ABSTAND > breite && x > ABSTAND) {
        y += zeile + ABSTAND;
        x = ABSTAND;
        zeile = 0;
      }
      lagen.set(e, { x, y });
      x += l.breite + ABSTAND;
      zeile = Math.max(zeile, l.hoehe);
    }
    y += zeile + ABSTAND;
  }
  const leinwand = new Leinwand(breite, y);
  const teil = (e: Eintrag): AtlasTeil => {
    const p = lagen.get(e) as { x: number; y: number };
    leinwand.einsetzen(e.teil.leinwand, p.x, p.y);
    return { x: p.x, y: p.y, b: e.teil.leinwand.breite, h: e.teil.leinwand.hoehe, ankerX: e.teil.ankerX, ankerY: e.teil.ankerY };
  };
  const finde = (gruppe: string, schluessel: string): Eintrag => alle.find((e) => e.gruppe === gruppe && e.schluessel === schluessel) as Eintrag;
  const schrift = (gruppe: string, m: Schriftmass): AtlasSchrift => ({
    zelle: m.zelle,
    laufweite: m.laufweite,
    zeilenhoehe: m.zeilenhoehe,
    schatten: m.schatten,
    umriss: UMRISS,
    ersatz: ERSATZ_ZEICHEN,
    zeichen: Object.fromEntries(ZEICHENVORRAT.map((z) => [z, teil(finde(gruppe, z))])),
  });
  const leben = teil(finde('leben', 'leben'));
  const atlas: AnzeigeAtlas = {
    blatt: `${ANZEIGE_BLATT}.png`,
    farben: FARBBUDGET.anzeige,
    schriften: { klein: schrift('klein', KLEIN), gross: schrift('gross', GROSS) },
    balken: {
      breite: LP_BALKEN_BREITE,
      hoehe: BALKEN_HOEHE,
      rahmen_links: teil(finde('balken', 'rahmen_links')),
      rahmen_rechts: teil(finde('balken', 'rahmen_rechts')),
      lagen: LAGEN_FARBEN.map((_, i) => teil(finde('balken', `lage_${i + 1}`))),
      leer: teil(finde('balken', 'leer')),
    },
    leben: { ...leben, zahlDx: LEBEN_ZAHL_DX },
    pfeil: teil(finde('pfeil', 'pfeil')),
    texte: Object.fromEntries(GROSSE_TEXTE.map((t) => [t, teil(finde('texte', t))])),
  };
  return { leinwand, atlas };
}

/** Schlüssel in der Reihenfolge der Vorgabe (Zeichenvorrat, große Texte), Unbekanntes danach; Ziffernschlüssel stünden sonst vorn. */
function geordnet(schluessel: readonly string[], vorgabe: readonly string[]): string[] {
  return [...vorgabe.filter((v) => schluessel.includes(v)), ...schluessel.filter((k) => !vorgabe.includes(k))];
}

function teilText(t: AtlasTeil): string {
  return `{ "x": ${t.x}, "y": ${t.y}, "b": ${t.b}, "h": ${t.h}, "ankerX": ${t.ankerX}, "ankerY": ${t.ankerY} }`;
}

/** Atlas als JSON-Text: feste Schlüsselfolge, je Teil eine Zeile, Zeilenende am Schluss. */
export function anzeigeAtlasText(a: AnzeigeAtlas): string {
  const z: string[] = ['{', `  "blatt": ${JSON.stringify(a.blatt)},`, `  "farben": ${a.farben},`, '  "schriften": {'];
  const schriften: [string, AtlasSchrift][] = [
    ['klein', a.schriften.klein],
    ['gross', a.schriften.gross],
  ];
  schriften.forEach(([name, s], i) => {
    z.push(`    ${JSON.stringify(name)}: {`);
    z.push(`      "zelle": ${s.zelle}, "laufweite": ${s.laufweite}, "zeilenhoehe": ${s.zeilenhoehe}, "schatten": ${s.schatten}, "umriss": ${s.umriss}, "ersatz": ${JSON.stringify(s.ersatz)},`);
    z.push('      "zeichen": {');
    const keys = geordnet(Object.keys(s.zeichen), ZEICHENVORRAT);
    keys.forEach((k, j) => z.push(`        ${JSON.stringify(k)}: ${teilText(s.zeichen[k] as AtlasTeil)}${j < keys.length - 1 ? ',' : ''}`));
    z.push('      }');
    z.push(`    }${i < schriften.length - 1 ? ',' : ''}`);
  });
  z.push('  },');
  z.push('  "balken": {');
  z.push(`    "breite": ${a.balken.breite}, "hoehe": ${a.balken.hoehe},`);
  z.push(`    "rahmen_links": ${teilText(a.balken.rahmen_links)},`);
  z.push(`    "rahmen_rechts": ${teilText(a.balken.rahmen_rechts)},`);
  z.push('    "lagen": [');
  a.balken.lagen.forEach((t, i) => z.push(`      ${teilText(t)}${i < a.balken.lagen.length - 1 ? ',' : ''}`));
  z.push('    ],');
  z.push(`    "leer": ${teilText(a.balken.leer)}`);
  z.push('  },');
  z.push(`  "leben": ${teilText(a.leben).replace(/ \}$/, `, "zahlDx": ${a.leben.zahlDx} }`)},`);
  z.push(`  "pfeil": ${teilText(a.pfeil)},`);
  z.push('  "texte": {');
  const texte = geordnet(Object.keys(a.texte), GROSSE_TEXTE);
  texte.forEach((k, j) => z.push(`    ${JSON.stringify(k)}: ${teilText(a.texte[k] as AtlasTeil)}${j < texte.length - 1 ? ',' : ''}`));
  z.push('  }');
  z.push('}');
  return z.join('\n') + '\n';
}

// ===========================================================================
// Zeichnen aus Blatt und Atlas (Vorlage für Phase 3; drawImage-Entsprechung)
// ===========================================================================

/** Setzt ein Teil des Blatts so, dass sein Anker auf (x, y) liegt (nur deckende Pixel, wie drawImage). */
export function teilZeichnen(ziel: Leinwand, blatt: Leinwand, t: AtlasTeil, x: number, y: number): void {
  ziel.einsetzen(blatt.ausschnitt(t.x, t.y, t.b, t.h), x - t.ankerX, y - t.ankerY);
}

/**
 * Setzt einen Text mit der linken oberen Ecke der ersten Zelle bei (x, y):
 * Zeichen von links nach rechts im Abstand der Laufweite (so überdeckt der
 * Körper eines Zeichens den Umriss des vorigen). Kleinbuchstaben werden groß,
 * Unbekanntes wird zum Ersatz. Gibt die Breite zurück (Zeichen · Laufweite).
 */
export function textSetzen(ziel: Leinwand, blatt: Leinwand, s: AtlasSchrift, text: string, x: number, y: number): number {
  const zeichen = [...text.toUpperCase()];
  zeichen.forEach((z, i) => {
    const t = s.zeichen[z] ?? (s.zeichen[s.ersatz] as AtlasTeil);
    teilZeichnen(ziel, blatt, t, x + i * s.laufweite, y);
  });
  return zeichen.length * s.laufweite;
}

/**
 * Setzt einen LP-Balken (Welt 10.1): Füllung in x0 … x0 + 71, Zeilen zeile0 …
 * zeile0 + 5, Rahmen eine Spalte bzw. Zeile darum. Spalte i < breite in der
 * Farbe der Lage, sonst in der Farbe der Unterlage, ohne Unterlage leer.
 */
export function balkenSetzen(ziel: Leinwand, blatt: Leinwand, a: AnzeigeAtlas, x0: number, zeile0: number, b: Balken): void {
  const lage = (n: number): AtlasTeil => a.balken.lagen[Math.min(n, a.balken.lagen.length) - 1] as AtlasTeil;
  teilZeichnen(ziel, blatt, a.balken.rahmen_links, x0 - 1, zeile0);
  for (let i = 0; i < a.balken.breite; i++) {
    const t = i < b.breite ? lage(b.lage) : b.unterlage > 0 ? lage(b.unterlage) : a.balken.leer;
    teilZeichnen(ziel, blatt, t, x0 + i, zeile0);
  }
  teilZeichnen(ziel, blatt, a.balken.rahmen_rechts, x0 + a.balken.breite, zeile0);
}

/** Inhalt der Leiste, wie anzeige(welt) ihn liefert (nur die Felder der Leiste). */
export type LeistenDaten = Pick<AnzeigeDaten, 'name' | 'punkte' | 'leben' | 'figur' | 'gegner'>;

/** Setzt die Anzeigeleiste nach den Lagen aus Welt 10.1 (werte.ts ANZEIGE). Den Pfeil setzt pfeilSetzen. */
export function leisteSetzen(ziel: Leinwand, blatt: Leinwand, a: AnzeigeAtlas, d: LeistenDaten): void {
  const klein = a.schriften.klein;
  textSetzen(ziel, blatt, klein, d.name, ANZEIGE.name.x, ANZEIGE.name.zeile);
  textSetzen(ziel, blatt, klein, d.punkte, ANZEIGE.punkte.x, ANZEIGE.punkte.zeile);
  teilZeichnen(ziel, blatt, a.leben, ANZEIGE.leben.x, ANZEIGE.leben.zeile);
  textSetzen(ziel, blatt, klein, String(d.leben), ANZEIGE.leben.x + a.leben.zahlDx, ANZEIGE.leben.zeile);
  balkenSetzen(ziel, blatt, a, ANZEIGE.lp_balken.x0, ANZEIGE.lp_balken.zeile0, d.figur);
  if (d.gegner !== null) {
    textSetzen(ziel, blatt, klein, d.gegner.name, ANZEIGE.gegner_name.x, ANZEIGE.gegner_name.zeile);
    balkenSetzen(ziel, blatt, a, ANZEIGE.gegner_balken.x0, ANZEIGE.gegner_balken.zeile0, d.gegner.balken);
  }
}

/** Pfeil „weiter“ an seiner Lage (Welt 10.1), wenn an (anzeige(welt).pfeil; blinkt 16 an, 16 aus nach KA5). */
export function pfeilSetzen(ziel: Leinwand, blatt: Leinwand, a: AnzeigeAtlas, an: boolean): void {
  if (an) teilZeichnen(ziel, blatt, a.pfeil, ANZEIGE.pfeil.x0, ANZEIGE.pfeil.zeile0);
}

/**
 * Große Texte waagrecht mittig, Zeilen im Abstand der Zeilenhöhe 20, der Block
 * senkrecht mittig im Bild (wie zeichneGrosseTexte heute). Fertige Bilder aus
 * atlas.texte, sonst aus den Zeichen der großen Schrift gesetzt.
 */
export function grosseTexteSetzen(ziel: Leinwand, blatt: Leinwand, a: AnzeigeAtlas, zeilen: readonly string[]): void {
  const s = a.schriften.gross;
  let y = Math.floor((BILD_HOEHE - zeilen.length * s.zeilenhoehe) / 2);
  for (const z of zeilen) {
    const x = Math.floor((BILD_BREITE - [...z].length * s.laufweite) / 2);
    const fertig = a.texte[z];
    if (fertig !== undefined) teilZeichnen(ziel, blatt, fertig, x, y);
    else textSetzen(ziel, blatt, s, z, x, y);
    y += s.zeilenhoehe;
  }
}

// ===========================================================================
// Stilprüfung (docs/grafik.md 2.5, angepasst an die Anzeige; 4.9)
// ===========================================================================

/** Prüft Blatt und Teile; gibt die Befunde zurück (leer = bestanden). */
export function anzeigePruefen(blatt: AnzeigeBlatt): Befund[] {
  const befunde: Befund[] = [];
  const melde = (teil: string, bild: number, regel: string, text: string): void => {
    befunde.push({ figur: ANZEIGE_BLATT, animation: teil, bild, regel, text });
  };
  // Farbbudget und Farben aus LEISTE_FARBEN
  const farben = farbenMenge(blatt.leinwand);
  if (farben.size > FARBBUDGET.anzeige) melde('blatt', -1, 'Farbzählung', `${farben.size} Farben, erlaubt ${FARBBUDGET.anzeige}`);
  for (const f of farben) if (f !== DURCHSICHTIG && !LEISTE_FARBEN.includes(f)) melde('blatt', -1, 'Farbzählung', `Farbe ${f.toString(16)} nicht in LEISTE_FARBEN`);
  // Kontur geschlossen und Streupixel je Teil (Balkenbausteine erst zusammengesetzt)
  const [klein, gross, sonst, texte] = anzeigeTeile() as [Eintrag[], Eintrag[], Eintrag[], Eintrag[]];
  const einzeln = [...klein, ...gross, ...sonst.filter((e) => e.gruppe !== 'balken'), ...texte];
  einzeln.forEach((e, i) => {
    const l = e.teil.leinwand;
    const luecken = konturLuecken(l, KONTUR);
    if (luecken.length > 0) melde(`${e.gruppe} ${JSON.stringify(e.schluessel)}`, i, 'Kontur geschlossen', `${luecken.length} Pixel ohne Kontur`);
    const streu = streupixel(l);
    if (streu.length > 0) melde(`${e.gruppe} ${JSON.stringify(e.schluessel)}`, i, 'Streupixel', `${streu.length} Streupixel, erster bei (${(streu[0] as Punkt).x}, ${(streu[0] as Punkt).y})`);
  });
  // Maße
  for (const e of [...klein, ...gross]) {
    const m = e.gruppe === 'klein' ? KLEIN : GROSS;
    const l = e.teil.leinwand;
    if (l.breite !== m.zelle + 2 * UMRISS || l.hoehe !== m.zelle + 2 * UMRISS) melde(e.gruppe, -1, 'Maß', `Zeichen ${JSON.stringify(e.schluessel)} ${l.breite} × ${l.hoehe}`);
  }
  const pfeil = pfeilBild().leinwand;
  if (pfeil.breite !== PFEIL_BREITE || pfeil.hoehe !== PFEIL_HOEHE) melde('pfeil', 0, 'Maß', `${pfeil.breite} × ${pfeil.hoehe}`);
  for (const e of texte) if (e.teil.leinwand.breite > BILD_BREITE) melde('texte', -1, 'Maß', `${e.schluessel} breiter als ${BILD_BREITE}`);
  // Balken: zusammengesetzt nach Welt 10.1 für typische LP (Figur, Gegner, Boss in Lagen)
  for (const lp of PRUEF_LP) {
    const l = new Leinwand(LP_BALKEN_BREITE + 4, BAUSTEIN_HOEHE + 2);
    const b = balken(lp);
    balkenSetzen(l, blatt.leinwand, blatt.atlas, 2, 2, b);
    for (let i = 0; i < LP_BALKEN_BREITE; i++) {
      const soll = i < b.breite ? LAGEN_FARBEN[Math.min(b.lage, LAGEN_FARBEN.length) - 1] : b.unterlage > 0 ? LAGEN_FARBEN[Math.min(b.unterlage, LAGEN_FARBEN.length) - 1] : BALKEN_LEER;
      for (let r = 0; r < BALKEN_HOEHE; r++) {
        if (l.hole(2 + i, 2 + r) !== soll) {
          melde('balken', lp, 'Balken', `LP ${lp}: Spalte ${i} Zeile ${r} falsch`);
          break;
        }
      }
    }
    if (streupixel(l).length > 0) melde('balken', lp, 'Streupixel', `LP ${lp}`);
  }
  return befunde;
}

/** LP, an denen die Prüfung und der Kontaktbogen die Balken zeigen: Figur 72, 40, 7, 1, 0; Boss 100 (Welt 7.1) in Lage 2, volle Lage 2, Lage 3. */
export const PRUEF_LP: readonly number[] = [LP_BALKEN_BREITE, 40, 7, 1, 0, 100, 2 * LP_BALKEN_BREITE, 150];

// ===========================================================================
// Kontaktbögen
// ===========================================================================

/** Rand und Abstände der Bögen in px (1×, wie kontakt.ts). */
const RAND = 4;
const LUECKE = 4;
const TITEL = 8;

/** Gründe für die Lesbarkeitsprobe: dunkel (Himmel), mittel (Boden), hell (Lichtkegel). */
const GRUENDE: readonly Pixel[] = [NACHTHIMMEL.treppe[TON_GRUND], EISBETON.treppe[TON_GRUND], LICHT_KALT.treppe[TON_GRUND]];

/** Beispiel der Leiste: Figur 40 LP, 3 Leben, Boss mit 100 LP in Lage 2 (Welt 10.1, 7.1). */
const BEISPIEL_LEISTE: LeistenDaten = {
  name: 'VELA',
  punkte: '00012340',
  leben: 3,
  figur: balken(40),
  gegner: { slot: 0, name: 'BALLAST', balken: balken(100) },
};

/** Zweites Beispiel: volle Figur, 2 Leben, Bolzer mit 7 LP. */
const BEISPIEL_LEISTE_2: LeistenDaten = {
  name: 'VELA',
  punkte: '00000460',
  leben: 2,
  figur: balken(LP_BALKEN_BREITE),
  gegner: { slot: 3, name: 'ZÜNDER', balken: balken(7) },
};

/** Himmel als Hintergrund der nachgestellten Leiste (wie Abschnitt A oben: Nachthimmel, gerastert). */
function himmel(l: Leinwand, x: number, y: number, b: number, h: number): void {
  const t = NACHTHIMMEL.treppe;
  verlaufSenkrecht(l, x, y, b, h, [t[0], t[1], t[2], t[3]], true);
}

/** Heller Hintergrund (Lichtkegel, Reif) für die Lesbarkeit im ungünstigsten Fall. */
function hell(l: Leinwand, x: number, y: number, b: number, h: number): void {
  verlaufSenkrecht(l, x, y, b, h, [LICHT_KALT.treppe[TON_GRUND], REIF.treppe[TON_GRUND], REIF.treppe[1]], true);
}

/** Kontaktbogen der Anzeige (1× gebaut, dann 2×). */
export function kontaktAnzeige(blatt: AnzeigeBlatt): Leinwand {
  const { leinwand: q, atlas: a } = blatt;
  const breite = RAND * 2 + BILD_BREITE;
  const k = a.schriften.klein;
  const g = a.schriften.gross;
  const kleinProZeile = Math.floor(BILD_BREITE / k.laufweite) - 4;
  const grossProZeile = Math.floor(BILD_BREITE / g.laufweite) - 2;
  const zeilenKlein = Math.ceil(ZEICHENVORRAT.length / kleinProZeile);
  const zeilenGross = Math.ceil(ZEICHENVORRAT.length / grossProZeile);
  const probeH = (zeilen: number, s: AtlasSchrift): number => zeilen * s.zeilenhoehe + 2 * RAND;
  const muster = 2 * RAND + 2 * k.zeilenhoehe + 2 * g.zeilenhoehe;
  const balkenH = PRUEF_LP.length * (BAUSTEIN_HOEHE + 4) + RAND;
  const hoehe =
    RAND + TITEL + 2 * probeH(zeilenKlein, k) + LUECKE + TITEL + 2 * probeH(zeilenGross, g) + LUECKE + TITEL + GRUENDE.length * muster + LUECKE + TITEL + balkenH + LUECKE + TITEL + 2 * 32 + LUECKE + 32 + RAND;
  const l = new Leinwand(breite, hoehe);
  l.fuelle(KONTAKT_GRUND);
  let y = RAND;
  const titel = (text: string): void => {
    kontaktText(l, text, RAND, y + 1, KONTAKT_TEXT);
    y += TITEL;
  };
  // Alle Zeichen auf dunklem und hellem Grund
  const probe = (s: AtlasSchrift, proZeile: number, zeilen: number): void => {
    for (const grund of [GRUENDE[0] as Pixel, GRUENDE[2] as Pixel]) {
      const h = probeH(zeilen, s);
      l.rechteck(RAND, y, BILD_BREITE, h, grund);
      for (let r = 0; r < zeilen; r++) {
        const text = ZEICHENVORRAT.slice(r * proZeile, (r + 1) * proZeile).join('');
        textSetzen(l, q, s, text, RAND + s.laufweite, y + RAND + r * s.zeilenhoehe);
      }
      y += h;
    }
  };
  titel(`SCHRIFT KLEIN ${k.zelle} × ${k.zelle}  LAUFWEITE ${k.laufweite}  ZEILE ${k.zeilenhoehe}  SCHATTEN ${k.schatten}  UMRISS ${k.umriss}`);
  probe(k, kleinProZeile, zeilenKlein);
  y += LUECKE;
  titel(`SCHRIFT GROSS ${g.zelle} × ${g.zelle}  LAUFWEITE ${g.laufweite}  ZEILE ${g.zeilenhoehe}  SCHATTEN ${g.schatten}  UMRISS ${g.umriss}`);
  probe(g, grossProZeile, zeilenGross);
  y += LUECKE;
  // Mustertexte auf drei Gründen
  titel('MUSTERTEXT AUF DUNKEL, MITTEL, HELL');
  for (const grund of GRUENDE) {
    l.rechteck(RAND, y, BILD_BREITE, muster, grund);
    let yy = y + RAND;
    textSetzen(l, q, k, 'VELA 00012340', RAND + k.laufweite, yy);
    yy += k.zeilenhoehe;
    textSetzen(l, q, k, 'BOLZER', RAND + k.laufweite, yy);
    yy += k.zeilenhoehe;
    teilZeichnen(l, q, a.texte['PAUSE'] as AtlasTeil, RAND + k.laufweite, yy);
    yy += g.zeilenhoehe;
    teilZeichnen(l, q, a.texte['GAME OVER'] as AtlasTeil, RAND + k.laufweite, yy);
    y += muster;
  }
  y += LUECKE;
  // Balken, Lebenssymbol, Pfeil (Spalten im Bogen frei gewählt: Beschriftung, Balken ab +40, Symbol ab +140, Pfeil ab +200)
  titel('BALKEN 72, 40, 7, 1, 0 LP, BOSS 100, 144, 150 LP IN LAGEN, LEBEN, PFEIL AN UND AUS');
  l.rechteck(RAND, y, BILD_BREITE, balkenH, GRUENDE[0] as Pixel);
  PRUEF_LP.forEach((lp, i) => {
    const yy = y + RAND + i * (BAUSTEIN_HOEHE + 4) + 1;
    const marke = `${lp} LP`;
    kontaktText(l, marke, RAND + 4, yy + 1, KONTAKT_TEXT);
    balkenSetzen(l, q, a, RAND + 40, yy, balken(lp));
  });
  const sx = RAND + 140;
  teilZeichnen(l, q, a.leben, sx, y + RAND + 1);
  textSetzen(l, q, k, '3', sx + a.leben.zahlDx, y + RAND + 1);
  kontaktText(l, 'LEBEN', sx + 24, y + RAND + 3, KONTAKT_TEXT);
  const px = RAND + 200;
  const py = y + RAND;
  teilZeichnen(l, q, a.pfeil, px, py);
  kontaktText(l, 'AN', px + PFEIL_BREITE + 4, py + 6, KONTAKT_TEXT);
  l.rechteck(px, py + PFEIL_HOEHE + 4, PFEIL_BREITE, PFEIL_HOEHE, KONTAKT_ZELLE);
  kontaktText(l, 'AUS', px + PFEIL_BREITE + 4, py + PFEIL_HOEHE + 10, KONTAKT_TEXT);
  kontaktText(l, '16 F AN, 16 F AUS (KA5)', px, py + 2 * PFEIL_HOEHE + 8, KONTAKT_TEXT);
  y += balkenH + LUECKE;
  // Nachgestellte Leiste 384 × 32 auf Himmel und hellem Grund, darunter auf der Ladenwand
  titel('ANZEIGELEISTE 384 × 32 NACH WELT 10.1 (HIMMEL A, HELLER GRUND, WAND B)');
  /** Höhe der nachgestellten Leiste (Auftrag 4, G6: 384 × 32). */
  const LEISTE_H = 32;
  himmel(l, RAND, y, BILD_BREITE, LEISTE_H);
  const leiste = new Leinwand(BILD_BREITE, LEISTE_H);
  leisteSetzen(leiste, q, a, BEISPIEL_LEISTE);
  l.einsetzen(leiste, RAND, y);
  y += LEISTE_H;
  hell(l, RAND, y, BILD_BREITE, LEISTE_H);
  l.einsetzen(leiste, RAND, y);
  y += LEISTE_H + LUECKE;
  l.rechteck(RAND, y, BILD_BREITE, LEISTE_H, WAND_LADEN.treppe[TON_GRUND]);
  const leiste2 = new Leinwand(BILD_BREITE, LEISTE_H);
  leisteSetzen(leiste2, q, a, BEISPIEL_LEISTE_2);
  l.einsetzen(leiste2, RAND, y);
  return l.vergroessert(KONTAKT_FAKTOR);
}

/**
 * Ganzes Bild 384 × 224 zur Einordnung (2×): Leiste auf dem Himmel, Boden als
 * Fläche, Pfeil an seiner Lage, große Texte des Stage-Endes mittig.
 */
export function kontaktBild(blatt: AnzeigeBlatt): Leinwand {
  const { leinwand: q, atlas: a } = blatt;
  const l = new Leinwand(BILD_BREITE, BILD_HOEHE);
  // Oberkante des Bodens: Tiefenband von Abschnitt A, 75 px (Auftrag 4, 4), nur zur Einordnung
  const boden = BILD_HOEHE - 75;
  himmel(l, 0, 0, BILD_BREITE, boden);
  verlaufSenkrecht(l, 0, boden, BILD_BREITE, BILD_HOEHE - boden, [EISBETON.treppe[1], EISBETON.treppe[TON_GRUND], EISBETON.treppe[3]], true);
  l.rechteck(0, boden, BILD_BREITE, 1, KONTAKT_BODEN);
  leisteSetzen(l, q, a, BEISPIEL_LEISTE);
  pfeilSetzen(l, q, a, true);
  grosseTexteSetzen(l, q, a, ['STAGE CLEAR', `BALLAST BESIEGT ${PUNKTE_BALLAST}`]);
  const marke = 'STAGE CLEAR + PFEIL ZUR EINORDNUNG';
  kontaktText(l, marke, BILD_BREITE - kontaktTextBreite(marke) - 4, BILD_HOEHE - 9, KONTAKT_TEXT);
  return l.vergroessert(KONTAKT_FAKTOR);
}

// ===========================================================================
// Erzeugnis für bauen.ts
// ===========================================================================

/** Anzeigeleiste, Pixelschrift 8 × 8 und 16 × 16, große Texte für bauen.ts. */
export function anzeigeErzeugnisse(): Erzeugnis[] {
  const blatt = anzeigeBlatt();
  const ausgabe = new Map<string, Uint8Array | string>([
    [`${ANZEIGE_BLATT}.png`, pngSchreiben(blatt.leinwand)],
    [`${ANZEIGE_BLATT}.json`, anzeigeAtlasText(blatt.atlas)],
  ]);
  const bilder = new Map<string, Uint8Array>([
    [KONTAKT_DATEI, pngSchreiben(kontaktAnzeige(blatt))],
    [KONTAKT_BILD_DATEI, pngSchreiben(kontaktBild(blatt))],
  ]);
  return [{ name: ANZEIGE_BLATT, ausgabe, bilder, befunde: anzeigePruefen(blatt) }];
}
