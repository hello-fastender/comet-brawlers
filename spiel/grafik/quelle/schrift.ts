// Pixelschrift der Anzeige (Auftrag 4, 1.6 und Phase 2, G6; docs/grafik.md 4.9):
// eine Schrift in zwei Größen, Zelle 8 × 8 und 16 × 16, im Stil eines
// Automaten um 1991. Kräftige Striche (senkrecht 2 px, waagrecht 1 px), offene
// Innenräume von 3 px, dunkle Schattenkante unten rechts (die Farben setzt
// anzeige.ts, hier stehen nur Bitmuster). Bitmuster von Hand (Auftrag 4, 6:
// Schrift und Symbole als Bitmuster erlaubt).
//
// Klein (8 × 8): Körper 7 × 7 oben links in der Zelle, Schatten 1 px nach
// rechts unten; Laufweite 8, alle Zeichen gleich breit (Ziffern stehen
// spaltengenau untereinander).
// Groß (16 × 16): derselbe Körper mit Scale2x (EPX) auf 14 × 14 verdoppelt,
// Schatten 2 px; Laufweite 16. Scale2x ändert je 2 × 2-Block höchstens einen
// Pixel, glättet also nur die Treppen der Schrägen; die Form bleibt dieselbe.
//
// Zeichenvorrat (Auftrag 4, 1.6 und G6): A–Z, Ä Ö Ü, 0–9, . , : ! ? - + / '
// Leerzeichen und Pfeil nach rechts (Schlüssel „→“). Kleinbuchstaben gibt es
// nicht; die Darstellung schreibt groß und setzt für Unbekanntes „?“.

/** Pfeil nach rechts als Zeichen der Schrift. */
export const PFEIL_ZEICHEN = '→';

/** Ersatz für Zeichen außerhalb des Vorrats (wie src/darstellung/schrift.ts). */
export const ERSATZ_ZEICHEN = '?';

/** Zeichenvorrat in fester Reihenfolge (Reihenfolge im Blatt und im Atlas). */
export const ZEICHENVORRAT: readonly string[] = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'Ä',
  'Ö',
  'Ü',
  ...'0123456789',
  '.',
  ',',
  ':',
  '!',
  '?',
  '-',
  '+',
  '/',
  "'",
  ' ',
  PFEIL_ZEICHEN,
];

/** Maße einer Schriftgröße in px. */
export interface Schriftmass {
  /** Kantenlänge der Zelle (Körper plus Schatten) */
  readonly zelle: number;
  /** Kantenlänge des Körpers */
  readonly koerper: number;
  /** Versatz des Schattens nach rechts unten */
  readonly schatten: number;
  /** Vorschub je Zeichen */
  readonly laufweite: number;
  /** Abstand zweier Zeilen (Oberkante zu Oberkante) */
  readonly zeilenhoehe: number;
}

/**
 * Klein 8 × 8 (Auftrag 4, 1.6). Zeilenhöhe 12: Abstand von Name (Zeile 6) und
 * Leben (Zeile 18) in der Anzeigeleiste (docs/spezifikation-welt.md 10.1).
 */
export const KLEIN: Schriftmass = { zelle: 8, koerper: 7, schatten: 1, laufweite: 8, zeilenhoehe: 12 };

/**
 * Groß 16 × 16 (Auftrag 4, 1.6), doppelte Maße der kleinen. Zeilenhöhe 20 wie
 * GROSS_ZEILE der heutigen Darstellung (src/darstellung/masse.ts).
 */
export const GROSS: Schriftmass = { zelle: 16, koerper: 14, schatten: 2, laufweite: 16, zeilenhoehe: 20 };

/** Zeichen eines Bitmusters: gesetzt. */
const AN = '#';
/** Zeichen eines Bitmusters: frei. */
const AUS = '.';

/**
 * Körper der kleinen Schrift: je Zeichen 7 Zeilen zu 7 Spalten, „#“ gesetzt.
 * Schmale Zeichen (I, T, Y, 1, Satzzeichen) stehen links bündig in 6 Spalten,
 * damit der 2 px breite Stamm mittig im Zeichen steht.
 */
export const GLYPHEN_8: Readonly<Record<string, readonly string[]>> = {
  A: ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##'],
  B: ['######.', '##...##', '##...##', '######.', '##...##', '##...##', '######.'],
  C: ['.#####.', '##...##', '##.....', '##.....', '##.....', '##...##', '.#####.'],
  D: ['#####..', '##..##.', '##...##', '##...##', '##...##', '##..##.', '#####..'],
  E: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '#######'],
  F: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '##.....'],
  G: ['.#####.', '##...##', '##.....', '##.####', '##...##', '##...##', '.######'],
  H: ['##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##'],
  I: ['######.', '..##...', '..##...', '..##...', '..##...', '..##...', '######.'],
  J: ['.....##', '.....##', '.....##', '.....##', '##...##', '##...##', '.#####.'],
  K: ['##...##', '##..##.', '##.##..', '####...', '##.##..', '##..##.', '##...##'],
  L: ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######'],
  M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##'],
  N: ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  P: ['######.', '##...##', '##...##', '######.', '##.....', '##.....', '##.....'],
  Q: ['.#####.', '##...##', '##...##', '##...##', '##.#.##', '##..##.', '.###.##'],
  R: ['######.', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##'],
  S: ['.#####.', '##...##', '##.....', '.#####.', '.....##', '##...##', '.#####.'],
  T: ['######.', '..##...', '..##...', '..##...', '..##...', '..##...', '..##...'],
  U: ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  V: ['##...##', '##...##', '##...##', '##...##', '.##.##.', '..###..', '...#...'],
  W: ['##...##', '##...##', '##...##', '##.#.##', '#######', '###.###', '##...##'],
  X: ['##...##', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '##...##'],
  Y: ['##..##.', '##..##.', '##..##.', '.####..', '..##...', '..##...', '..##...'],
  Z: ['#######', '.....##', '....##.', '...##..', '..##...', '.##....', '#######'],
  Ä: ['.##.##.', '.......', '.#####.', '##...##', '#######', '##...##', '##...##'],
  Ö: ['.##.##.', '.......', '.#####.', '##...##', '##...##', '##...##', '.#####.'],
  Ü: ['.##.##.', '.......', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  '0': ['.#####.', '##...##', '##..###', '##.#.##', '###..##', '##...##', '.#####.'],
  '1': ['..##...', '.###...', '####...', '..##...', '..##...', '..##...', '######.'],
  '2': ['.#####.', '##...##', '.....##', '..####.', '.##....', '##.....', '#######'],
  '3': ['.#####.', '##...##', '.....##', '...###.', '.....##', '##...##', '.#####.'],
  '4': ['...###.', '..####.', '.##.##.', '##..##.', '#######', '....##.', '....##.'],
  '5': ['#######', '##.....', '######.', '.....##', '.....##', '##...##', '.#####.'],
  '6': ['..####.', '.##....', '##.....', '######.', '##...##', '##...##', '.#####.'],
  '7': ['#######', '##...##', '....##.', '...##..', '..##...', '..##...', '..##...'],
  '8': ['.#####.', '##...##', '##...##', '.#####.', '##...##', '##...##', '.#####.'],
  '9': ['.#####.', '##...##', '##...##', '.######', '.....##', '....##.', '.####..'],
  '.': ['.......', '.......', '.......', '.......', '.......', '..##...', '..##...'],
  ',': ['.......', '.......', '.......', '.......', '..##...', '..##...', '.##....'],
  ':': ['.......', '..##...', '..##...', '.......', '..##...', '..##...', '.......'],
  '!': ['..##...', '..##...', '..##...', '..##...', '..##...', '.......', '..##...'],
  '?': ['.#####.', '##...##', '.....##', '...###.', '..##...', '.......', '..##...'],
  '-': ['.......', '.......', '.......', '.#####.', '.#####.', '.......', '.......'],
  '+': ['.......', '..##...', '..##...', '######.', '..##...', '..##...', '.......'],
  '/': ['.....##', '....##.', '....##.', '...##..', '..##...', '.##....', '##.....'],
  "'": ['..##...', '..##...', '.##....', '.......', '.......', '.......', '.......'],
  ' ': ['.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  [PFEIL_ZEICHEN]: ['...#...', '...##..', '...###.', '#######', '...###.', '...##..', '...#...'],
};

/** Bitmuster als Wahrheitsmatrix [y][x]. */
export function maske(muster: readonly string[]): boolean[][] {
  return muster.map((zeile) => [...zeile].map((z) => z === AN));
}

/** Wahrheitsmatrix als Bitmuster. */
export function muster(m: readonly (readonly boolean[])[]): string[] {
  return m.map((zeile) => zeile.map((an) => (an ? AN : AUS)).join(''));
}

/**
 * Scale2x (EPX, Andrea Mazzoleni): verdoppelt ein Bitmuster und glättet
 * Schrägen. Zu jedem Pixel E mit den Nachbarn B (oben), D (links), F (rechts),
 * H (unten) entstehen vier Pixel E0 E1 / E2 E3:
 *   E0 = D, wenn B = D, B ≠ F, D ≠ H, sonst E (oben links; entsprechend
 *   E1 = F bei B = F, E2 = D bei D = H, E3 = F bei H = F).
 * Außerhalb des Musters gilt frei.
 */
export function scale2x(eingabe: readonly string[]): string[] {
  const m = maske(eingabe);
  const h = m.length;
  const b = h > 0 ? (m[0] as boolean[]).length : 0;
  const an = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < b && y < h && (m[y] as boolean[])[x] === true;
  const aus: boolean[][] = Array.from({ length: 2 * h }, () => new Array<boolean>(2 * b).fill(false));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const e = an(x, y);
      const ob = an(x, y - 1);
      const li = an(x - 1, y);
      const re = an(x + 1, y);
      const un = an(x, y + 1);
      const z0 = aus[2 * y] as boolean[];
      const z1 = aus[2 * y + 1] as boolean[];
      z0[2 * x] = ob === li && ob !== re && li !== un ? li : e;
      z0[2 * x + 1] = ob === re && ob !== li && re !== un ? re : e;
      z1[2 * x] = li === un && li !== ob && un !== re ? li : e;
      z1[2 * x + 1] = un === re && li !== un && ob !== re ? re : e;
    }
  }
  return muster(aus);
}

/**
 * Körper der großen Schrift: Scale2x der kleinen (14 × 14). Von Hand
 * nachgearbeitet ist nichts; eine Nacharbeit gehörte als Eintrag hierher und in
 * docs/grafik.md 4.9.
 */
export const GLYPHEN_16: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  ZEICHENVORRAT.map((z) => [z, scale2x(GLYPHEN_8[z] as readonly string[])]),
);

/** Körper eines Zeichens in der Größe (Ersatz „?“ für Unbekanntes). */
export function koerper(groesse: Schriftmass, zeichen: string): readonly string[] {
  const satz = groesse.zelle === GROSS.zelle ? GLYPHEN_16 : GLYPHEN_8;
  return satz[zeichen] ?? (satz[ERSATZ_ZEICHEN] as readonly string[]);
}
