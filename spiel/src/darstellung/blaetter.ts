// Blätter der Darstellung (Auftrag 5, Phase 1, U1; docs/grafik.md 9.10):
// Formate der Atlanten von Hintergrund, Blende und Anzeige (4.8, 4.9),
// Blattwahl, Massstab der Atlanten und das Konturblatt für das
// Schutzblinken. Typen und reine Funktionen ohne DOM; sprites.ts ruft sie
// beim Laden auf, die Tests (grafik_einbau_hilfe.ts, darstellung_2x.test.ts)
// in Node.
//
// Blattwahl: bauen.ts schreibt grafik/ausgabe/blaetter.json, die
// alphabetische Liste aller gebauten Blattnamen ohne Endung. Die Darstellung
// lädt sie zuerst und nimmt je Blatt <name>_grok statt <name>, wenn die Liste
// es nennt (Grok-Blätter tragen dieselben Animationsnamen wie die Blätter der
// Gliederpuppe derselben Figur). Fehlt die Liste, gilt die bisherige Wahl.
// rammbock_fremd ist kein Blatt der Darstellung und wird nie geladen (E24).
//
// Massstab: Das Atlas-Feld "massstab" auf oberster Ebene sagt, in welchen
// Pixeln das Blatt gezeichnet ist: 2 = Bildpixel (Bilder, Maße und Anker in
// Bildpixeln), 1 oder fehlend = Spielpixel.
//
// Konturblatt: Im Schutz zeigt die Figur in jedem zweiten Framepaar nur ihre
// Kontur (G4-15, G7-14). Blätter mit Pixeln in KONTUR behalten genau diese;
// Blätter ohne ein solches Pixel (Grok-Blätter, keine feste Konturfarbe)
// behalten ihren Rand: deckende Pixel mit durchsichtigem Kantennachbarn, so
// viele Ringe, wie ein Spielpixel Blattpixel hat (U1-3), damit das Blinken
// gleich aussieht.

import type { SpriteBlatt } from './zuordnung.ts';
import { SPRITE_BLAETTER } from './zuordnung.ts';

// ===========================================================================
// Atlanten der Hintergründe, der Blende und der Anzeige (4.8, 4.9; Formate,
// ohne DOM, damit die Tests in Node sie benutzen können)
// ===========================================================================

/** Ebenen der Hintergründe in Zeichenreihenfolge (4.8); vordergrund kommt nach den Figuren. */
export type Ebene = 'himmel' | 'wand' | 'boden' | 'vordergrund';

/** Kachelkarte einer Ebene (4.8, Atlasformat). */
export interface HintergrundKarte {
  ebene: Ebene;
  name: string;
  parallax: number;
  deckkraft: number;
  x: number;
  y: number;
  spalten: number;
  zeilen: number;
  kacheln: number[][];
}

/** Freies Bild einer Ebene (4.8). */
export interface HintergrundBild {
  name: string;
  ebene: Ebene;
  folge: number;
  parallax: number;
  deckkraft: number;
  x: number;
  y: number;
  b: number;
  h: number;
  dauer: number;
  bilder: { x: number; y: number }[];
}

/** Atlas eines Hintergrundblatts (hintergrund_a/b/f.json). */
export interface HintergrundAtlas {
  blatt: string;
  /** 1 oder fehlend = Spielpixel, 2 = Bildpixel (Kacheln, Lagen im Blatt, b, h); Weltlagen bleiben Spielpixel */
  massstab?: number;
  abschnitt: string;
  kachel: number;
  kacheln: [number, number][];
  karten: HintergrundKarte[];
  bilder: HintergrundBild[];
}

/** Atlas der Blende (hintergrund_blende.json). */
export interface BlendeAtlas {
  blatt: string;
  massstab?: number;
  kachel: number;
  kante: { x: number; y: number; b: number; h: number };
  weg: number;
  zu: number;
}

/** Teil der Anzeige: Rechteck im Blatt und Anker (4.9). */
export interface AnzeigeTeil {
  x: number;
  y: number;
  b: number;
  h: number;
  ankerX: number;
  ankerY: number;
}

/** Schrift der Anzeige (klein 8 × 8, groß 16 × 16; 4.9). */
export interface AnzeigeSchrift {
  laufweite: number;
  zeilenhoehe: number;
  ersatz: string;
  zeichen: Record<string, AnzeigeTeil>;
}

/** Atlas der Anzeige (anzeige.json, 4.9); bei Massstab 2 alle Längen in Bildpixeln. */
export interface AnzeigeAtlas {
  blatt: string;
  massstab?: number;
  schriften: { klein: AnzeigeSchrift; gross: AnzeigeSchrift };
  balken: { breite: number; rahmen_links: AnzeigeTeil; rahmen_rechts: AnzeigeTeil; lagen: AnzeigeTeil[]; leer: AnzeigeTeil };
  leben: AnzeigeTeil & { zahlDx: number };
  pfeil: AnzeigeTeil;
  texte: Record<string, AnzeigeTeil>;
}

// ===========================================================================
// Blattwahl, Massstab, Konturblatt (Auftrag 5)
// ===========================================================================

/** Hintergrundblätter in der Reihenfolge der Zeichenregel (4.8: bei Gleichstand A, B, F). */
export const HINTERGRUND_BLAETTER = ['hintergrund_a', 'hintergrund_b', 'hintergrund_f'] as const;
export type HintergrundBlatt = (typeof HINTERGRUND_BLAETTER)[number];
/** Blätter mit möglicher Grok-Fassung: alle Sprite-Blätter und die drei Hintergründe. */
export type WaehlbaresBlatt = SpriteBlatt | HintergrundBlatt;

/** Liste der gebauten Blätter in grafik/ausgabe/ (bauen.ts, Auftrag 5). */
export const BLAETTER_LISTE = 'blaetter.json';
/** Endung der Grok-Fassung eines Blatts (Auftrag 5). */
export const GROK_ENDUNG = '_grok';
/** Erlaubte Werte des Atlas-Felds massstab (Auftrag 5): 1 Spielpixel, 2 Bildpixel. */
export const MASSSTAEBE: readonly number[] = [1, 2];

/**
 * Liest die Liste aus blaetter.json: ein Feld von Blattnamen (Zeichenketten).
 * Wirft bei einem anderen Inhalt (die Darstellung fällt dann auf die
 * Rechtecke zurück, wie bei einem fehlenden Blatt).
 */
export function blaetterListe(json: unknown): string[] {
  if (!Array.isArray(json) || !json.every((n) => typeof n === 'string')) throw new Error(`${BLAETTER_LISTE}: keine Liste von Blattnamen`);
  return json as string[];
}

/**
 * Blattwahl: Datei (ohne Endung) je Blatt der Darstellung. <name>_grok, wenn
 * die Liste es nennt, sonst <name>; ohne Liste (null) die bisherige Wahl.
 */
export function blattWahl(liste: readonly string[] | null): Readonly<Record<WaehlbaresBlatt, string>> {
  const da = new Set(liste ?? []);
  const wahl = {} as Record<WaehlbaresBlatt, string>;
  for (const name of [...SPRITE_BLAETTER, ...HINTERGRUND_BLAETTER]) wahl[name] = da.has(name + GROK_ENDUNG) ? name + GROK_ENDUNG : name;
  return wahl;
}

/** Massstab eines Atlas (Feld massstab, fehlend = 1); wirft bei einem anderen Wert als 1 oder 2. */
export function massstabVon(atlas: { massstab?: unknown }, name: string): number {
  const m = atlas.massstab ?? 1;
  if (typeof m !== 'number' || !MASSSTAEBE.includes(m)) throw new Error(`${name}: massstab ${String(m)} (erlaubt ${MASSSTAEBE.join(' oder ')})`);
  return m;
}

/** Art des Konturblatts: Pixel in KONTUR oder Rand. */
export type KonturArt = 'kontur' | 'rand';

/**
 * Konturmaske eines Blatts in RGBA-Daten (Zeile für Zeile, 4 Byte je Pixel):
 * macht alle Pixel durchsichtig, die nicht zur Kontur gehören. Hat das Blatt
 * Pixel in der Farbe kontur (deckend), bleiben genau diese; sonst bleiben
 * die äußeren `ringe` Ringe deckender Pixel (Ring 1: deckend mit einem
 * durchsichtigen Kantennachbarn oder am Blattrand; Ring k: deckend, mit einem
 * Kantennachbarn in Ring k − 1). Gibt die Art zurück.
 */
export function konturMaske(p: Uint8ClampedArray | Uint8Array, breite: number, hoehe: number, kontur: readonly [number, number, number], ringe: number): KonturArt {
  const [r, g, b] = kontur;
  const n = breite * hoehe;
  let konturPixel = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (p[o + 3] !== 0 && p[o] === r && p[o + 1] === g && p[o + 2] === b) konturPixel += 1;
  }
  if (konturPixel > 0) {
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (p[o] !== r || p[o + 1] !== g || p[o + 2] !== b) p[o + 3] = 0;
    }
    return 'kontur';
  }
  // Ring je Pixel: 0 = durchsichtig oder innen, k = Ring k
  const ring = new Uint8Array(n);
  const deckend = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < breite && y < hoehe && p[(y * breite + x) * 4 + 3] !== 0;
  for (let k = 1; k <= ringe; k++) {
    const neu: number[] = [];
    const vor = k - 1;
    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        const i = y * breite + x;
        if (ring[i] !== 0 || p[i * 4 + 3] === 0) continue;
        const trifft =
          k === 1
            ? !deckend(x - 1, y) || !deckend(x + 1, y) || !deckend(x, y - 1) || !deckend(x, y + 1)
            : (x > 0 && ring[i - 1] === vor) || (x < breite - 1 && ring[i + 1] === vor) || (y > 0 && ring[i - breite] === vor) || (y < hoehe - 1 && ring[i + breite] === vor);
        if (trifft) neu.push(i);
      }
    }
    for (const i of neu) ring[i] = k;
  }
  for (let i = 0; i < n; i++) if (ring[i] === 0) p[i * 4 + 3] = 0;
  return 'rand';
}
