// Maße, Farben und Lagen der Platzhaltergrafik (Auftrag 3, 2.5).
//
// Zahlen der Spezifikation (Bildgröße, Bildschirm-y, Anzeigeleiste, Blende,
// aktives Fenster, Behälter) kommen aus src/kern/werte.ts. Diese Datei hält
// nur Werte der Darstellung, die die Spezifikation frei lässt (Farben,
// Schriftgrößen, Lagen der Debug-Anzeige), und die Umrisse aus den
// Designdokumenten; je Wert ein Kommentar mit Herkunft. Keine Logik.

import type { GegenstandArt, GegnerTyp } from '../kern/entitaeten.ts';

// ===========================================================================
// Zeit (Spielschleife nach E13, Kampf 2.1)
// ===========================================================================

/** Millisekunden je Sekunde (Einheit der Zeitstempel von requestAnimationFrame). */
export const MS_JE_SEKUNDE = 1000;
/**
 * Toleranz des Akkumulators als Anteil eines Logikschritts: Ein Bild, das
 * bis zu 1/8 Schritt zu früh kommt, zählt schon als voller Schritt; der
 * Akkumulator trägt den Rest (auch negativ) weiter. Ohne Toleranz liefe ein
 * 60-Hz-Bildschirm mit Zeitstempel-Zittern abwechselnd 0 und 2 Schritte.
 * Festlegung K6 (Darstellung), wirkt nicht auf die Logik.
 */
export const TAKT_TOLERANZ_TEILER = 8;

// ===========================================================================
// Umrisse (Breite × Höhe mit Schatten, px)
// ===========================================================================

/** Umriss einer Figur im Stand: Breite und Höhe mit Schatten, Breite des Schattens. */
export interface Umriss {
  breite: number;
  hoehe: number;
  schatten: number;
}

/** Vela 57 × 76 (docs/design.md, 5: „wie die Referenzfigur“); Schatten 36 wie im Vorbild (research/captcomm/grafik/README.md: Ellipse 36 × 11). */
export const UMRISS_FIGUR: Umriss = { breite: 57, hoehe: 76, schatten: 36 };

/**
 * Gegner nach docs/design-gegner-stages.md, 1 (beschlossen E9): Bolzer 57 × 72,
 * Rammbock 60 × 76, Zünder 64 × 72. Ballast 70 × 100 nach Auftrag 3, 2.5
 * (die Designdokumente nennen für ihn keinen Umriss). Puppe wie ein Bolzer.
 * Schatten etwa 5/8 der Breite (Vorbild: 36 bei 57).
 */
export const UMRISS_GEGNER: Readonly<Record<GegnerTyp, Umriss>> = {
  Bolzer: { breite: 57, hoehe: 72, schatten: 36 },
  Rammbock: { breite: 60, hoehe: 76, schatten: 38 },
  Zünder: { breite: 64, hoehe: 72, schatten: 40 },
  Ballast: { breite: 70, hoehe: 100, schatten: 48 },
  Puppe: { breite: 57, hoehe: 72, schatten: 36 },
};

/** Höhe der Schattenellipse (Vorbild 10 bis 11 px, research/captcomm/grafik/README.md). */
export const SCHATTEN_HOEHE = 10;
/** Liegende Figuren: Breite = Höhe des Umrisses, Höhe = Breite des Umrisses / LIEGEND_TEILER (Lesbarkeit). */
export const LIEGEND_TEILER = 3;
/** Hockende und aufstehende Figuren: Höhe = Höhe des Umrisses · HOCKE_ZAEHLER / HOCKE_NENNER. */
export const HOCKE_ZAEHLER = 2;
export const HOCKE_NENNER = 3;
/** Dreieck der Blickrichtung: Abstand vom oberen Rand, halbe Höhe, Länge über den Rand hinaus. */
export const BLICK_OBEN = 8;
export const BLICK_HALB = 4;
export const BLICK_LAENGE = 5;
/** Sprint: Bewegungsstriche hinter der Figur (Anzahl, Länge, Abstand vom Körper, Zeilenabstand ab dem oberen Rand). */
export const SPRINT_STRICHE = { anzahl: 3, laenge: 14, abstand: 4, zeile: 14 } as const;
/** Raketenwerfer in der Hand der Figur: Länge, Höhe, Abstand vom oberen Rand. */
export const WAFFE_HAND = { laenge: 22, hoehe: 5, oben: 22 } as const;

/** Gegenstände (Platzhalter): Breite × Höhe in px. */
export const UMRISS_GEGENSTAND: Readonly<Record<GegenstandArt, { breite: number; hoehe: number }>> = {
  Kometenbraten: { breite: 16, hoehe: 10 },
  Eisnudelschale: { breite: 16, hoehe: 10 },
  Sternbeeren: { breite: 12, hoehe: 8 },
  Raketenwerfer: { breite: 28, hoehe: 10 },
};
/** Weggeworfene leere Waffe (Kampf 10.4). */
export const UMRISS_WAFFE = { breite: 28, hoehe: 8 } as const;
/** Rakete im Flug (Kampf 10.3; Welt 6). */
export const UMRISS_RAKETE = { breite: 14, hoehe: 6 } as const;
/** Explosion: Halbachsen der Ellipse (Platzhalter). */
export const EXPLOSION = { rx: 22, ry: 14 } as const;
/** Effekt (Platzhalter): Kantenlänge. */
export const UMRISS_EFFEKT = 10;
/** Zerbrochener Behälter: Höhe der Trümmer. */
export const TRUEMMER_HOEHE = 6;
/** Schatten kleiner Objekte: Breite = Breite des Objekts, Höhe = SCHATTEN_HOEHE / 2. */
export const SCHATTEN_KLEIN_TEILER = 2;

// ===========================================================================
// Hintergrund (Welt 2.1, 2.3: Farbflächen je Abschnitt, Tiefenband als Linien)
// ===========================================================================

/** Abstand der Tiefenlinien im Band (z) und der Bodenmarken (x), px. */
export const TIEFENLINIE_ABSTAND = 16;
export const BODENMARKE_ABSTAND = 64;
/** Höhe der Hintergrundbilder über der Obergrenze des Bandes, px (Platzhalter). */
export const HINTERGRUND_HOEHE = 72;
/** Abstand der Beschriftung vom Rand eines Hintergrundbilds, px. */
export const HINTERGRUND_RAND = 3;

// ===========================================================================
// Anzeige (Welt 10.1; Lagen aus werte.ts ANZEIGE)
// ===========================================================================

/** Symbol der Leben: Breite und Höhe in px; die Zahl folgt nach LEBEN_ABSTAND px. */
export const LEBEN_SYMBOL = { breite: 5, hoehe: 7 } as const;
export const LEBEN_ABSTAND = 8;
/** Pfeil „weiter“: Dicke des Schafts = Höhe des Pfeils / PFEIL_SCHAFT_TEILER · 2. */
export const PFEIL_SCHAFT_TEILER = 4;
/** Große Texte (PAUSE, STAGE CLEAR, GAME OVER): Vergrößerung der Schrift 5 × 7 und Zeilenabstand. */
export const GROSS_FAKTOR = 2;
export const GROSS_ZEILE = 20;
/** Rand des Kastens hinter großen Texten, px. */
export const TEXTKASTEN_RAND = 4;
/** Anzeige der Aufzeichnung (F2) oben rechts: Abstand vom rechten Rand, Zeile. */
export const AUFZEICHNUNG_LAGE = { rechts: 8, zeile: 6 } as const;

// ===========================================================================
// Debug-Anzeige (Welt 10.6; Auftrag 3, 2.5)
// ===========================================================================

/** Debug-Text: erste Zeile, linker Rand, Zeilenabstand (Schrift 3 × 5). */
export const DEBUG_TEXT = { zeile: 28, x: 4, abstand: 7 } as const;
/** Beschriftung über einer Figur: Abstand über dem Umriss, Zeilenabstand. */
export const DEBUG_MARKE = { ueber: 3, abstand: 7 } as const;
/** Halbe Größe des Kreuzes am Zielpunkt, px. */
export const ZIELKREUZ = 3;
/** Strichmuster für Höhenkästen und inaktive Flächen. */
export const STRICH = [2, 2] as const;

// ===========================================================================
// Farben
// ===========================================================================

export const FARBE = {
  rand: '#000000',
  /** Figur Vela und Gegner im Stand, je Typ */
  figur: '#3fa7ff',
  gegner: {
    Bolzer: '#7fae4f',
    Rammbock: '#c07a3a',
    Zünder: '#4fa3a8',
    Ballast: '#9a56c4',
    Puppe: '#b7a98a',
  } as Readonly<Record<GegnerTyp, string>>,
  /** Zustandsfarben (Auftrag 3, 2.5) */
  angriff_aktiv: '#ff4b2b',
  angriff: '#ff9a3c',
  ankuendigung: '#ffd23f',
  getroffen: '#ffffff',
  liegen: '#8a8f99',
  gehalten: '#d9a6ff',
  griff: '#6fd6ff',
  wartend: '#5a5f6a',
  kontur: '#10131a',
  blick: '#10131a',
  schatten: 'rgba(0, 0, 0, 0.45)',
  waffe: '#3c9a48',
  sprint: 'rgba(255, 255, 255, 0.6)',
  /** Objekte */
  fass: '#8b5a2b',
  bosskiste: '#6f7f8f',
  truemmer: '#5b4630',
  gegenstand: {
    Kometenbraten: '#e8643c',
    Eisnudelschale: '#bfe6ff',
    Sternbeeren: '#e04fd0',
    Raketenwerfer: '#3c9a48',
  } as Readonly<Record<GegenstandArt, string>>,
  rakete: '#ffe14d',
  explosion: 'rgba(255, 140, 40, 0.75)',
  effekt: '#ffffff',
  /** Hintergrund: Wand und Boden je Band (zyklisch), Bildflächen je Hintergrundsatz (zyklisch) */
  wand: ['#1c2a44', '#2d2341', '#283028'] as readonly string[],
  boden: ['#3a4762', '#4a3f58', '#465140'] as readonly string[],
  bild: ['#4a5a7a', '#6a4a6e', '#56604a', '#7a6040'] as readonly string[],
  bild_text: 'rgba(255, 255, 255, 0.45)',
  leer: '#0b0d12',
  bandkante: '#9fd8ff',
  tiefenlinie: 'rgba(255, 255, 255, 0.07)',
  bodenmarke: 'rgba(255, 255, 255, 0.10)',
  vordergrund: 'rgba(12, 14, 22, 0.55)',
  vordergrund_kante: 'rgba(160, 170, 190, 0.6)',
  /** Anzeige */
  text: '#f2f4f8',
  balken_grund: '#1a1d24',
  balken_rand: '#606775',
  /** Lagen der LP-Balken: Farbe n (1 grün, 2 gelb, 3 orange; Welt 10.1, Richtwert grafik/README.md) */
  lagen: ['#1a1d24', '#3ccf4e', '#f2d431', '#f28a1e'] as readonly string[],
  pfeil: '#ffd23f',
  textkasten: 'rgba(0, 0, 0, 0.6)',
  aufzeichnung: '#ff3b3b',
  /** Debug */
  debug_text: '#e8f0ff',
  debug_grund: 'rgba(0, 0, 0, 0.55)',
  flaeche_gegner: '#00e5ff',
  flaeche_figur: '#ff3366',
  flaeche_inaktiv: 'rgba(200, 200, 200, 0.55)',
  zielpunkt: '#ffe14d',
  folgepunkt: 'rgba(255, 255, 255, 0.35)',
  totzone: 'rgba(255, 210, 63, 0.5)',
  aufnahme: '#7dff8a',
  hindernis: '#ff9a3c',
  hindernis_flaeche: 'rgba(0, 0, 0, 0.35)',
  treffer: '#ffffff',
} as const;

// ===========================================================================
// Sprites (Auftrag 4, Phase 3, G7; docs/grafik.md 9): Werte der Darstellung,
// die die Blätter nicht tragen. Je Wert die Herkunft; die Tests vergleichen
// die übernommenen Maße mit grafik/quelle/ (grafik_zuordnung.test.ts).
// ===========================================================================

/** Ordner der Blätter relativ zu index.html (Auftrag 4, 2.2: der Browser lädt grafik/ausgabe/ direkt). */
export const GRAFIK_ORDNER = 'grafik/ausgabe/';
/** Konturviolett RGB (palette.ts KONTUR, docs/grafik.md 1.2): nur diese Pixel zeigt das Schutzblinken (G4-15). */
export const KONTUR_RGB: readonly [number, number, number] = [0x14, 0x0e, 0x22];
/** Schatten der Sprites: SCHATTEN_BLAU (palette.ts) mit der Deckkraft von FARBE.schatten (Auftrag 4, 1.5: „wie heute“), Ellipse pixelgenau. */
export const SCHATTEN_SPRITE = { farbe: '#0a1230', deckkraft: 0.45 } as const;

/**
 * Werferpunkt W je Bild der Waffenanimationen von Vela (docs/grafik.md 4.1,
 * G1-7; figuren/vela_kampf.ts werferPunkte): Mitte des vorderen Handschuhs in
 * px vom Fußpunkt, x nach vorn, y nach oben negativ.
 */
export const WERFER_PUNKTE: Readonly<Record<'waffe_stand' | 'waffe_gehen' | 'waffe_schuss', readonly (readonly [number, number])[]>> = {
  waffe_stand: [[13, -52]],
  waffe_gehen: [
    [15, -48], [15, -51], [15, -51], [15, -51], [15, -51], [15, -49],
    [15, -48], [15, -51], [15, -51], [15, -51], [15, -51], [15, -49],
  ],
  waffe_schuss: [[14, -50], [9, -51], [11, -51]],
};
/** Griffpunkt und Mündung des Raketenwerfers in Objektkoordinaten (docs/grafik.md 4.7; gegenstaende.ts WERFER.griffpunkt, muendungspunkt). */
export const WERFER_GRIFF = { x: -3, y: -1.5 } as const;
export const WERFER_MUENDUNG = { x: 13, y: -4 } as const;

/** Ansatz des Magnetstoßes je Kettenstufe relativ zu Velas Fußpunkt, y nach unten (docs/grafik.md 4.7; effekte.ts MAGNETSTOSS_ANSATZ). */
export const MAGNETSTOSS_ANSATZ: readonly (readonly [number, number])[] = [[50, -47], [50, -46], [44, -65], [47, -41]];
/** Ansatz im zweiten Fenster der Kette 4 (effekte.ts MAGNETSTOSS_ANSATZ_4B). */
export const MAGNETSTOSS_ANSATZ_4B: readonly [number, number] = [46, -41];

/**
 * Mündungsblitz von Velas Werfer (G7-3): die ersten zwei Bilder des
 * Trefferfunkens (weißer Blitz, Stern) je 2 Frames ab dem Abschuss, Mitte
 * 4 px vor der Mündung.
 */
export const MUENDUNGSBLITZ = { bilder: [0, 1], dauer: 2, vor: 4 } as const;

/**
 * Trefferfunke (docs/grafik.md 4.7, Vorschlag G4; G7-4): x = Ziel-x plus
 * FUNKE_ABSTAND zum Angreifer hin (Körper beginnt etwa 25 px vor der
 * Position), bei Behältern ihre halbe Breite; Höhe über dem Ziel je Angriff:
 * Kette an der Ansatzhöhe der Faust (MAGNETSTOSS_ANSATZ), Explosion, Wurf und
 * Würfe 30 px, Spezialangriff am Boden, Gegnerschläge in Brusthöhe der Figur.
 */
export const FUNKE_ABSTAND = 20;
export const FUNKE_HOEHE: Readonly<Record<string, number>> = {
  KT1: 47, KT2: 46, KT3: 65, KT4: 41,
  SN: 40, SR: 40, SH: 50, ST: 50, SA: 47, SS: 40,
  KN: 30, WU: 30, WG: 30, SP: 12, RX: 30, LN: 30,
  BA: 45, BB: 45, BC: 50, BUA: 50, BUB: 35, RA: 45, RB: 45, RU: 45, RS: 40,
  ZR: 30, ZK: 40, AS: 50, AN: 40, KP: 20, PA: 40,
};
/** Höhe des Funkens für Angriffe ohne Eintrag. */
export const FUNKE_HOEHE_STANDARD = 40;
/** Treffer ohne Funken (G7-4): der Wurf WU ist das Packen über den Kopf, sein Aufprall zeigt Staub. */
export const FUNKE_OHNE: readonly string[] = ['WU'];
/** Trümmer blinken ab Uhr 33 je 2 Frames sichtbar, 2 unsichtbar (docs/grafik.md 4.7, G4-8). */
export const TRUEMMER_BLINKEN_AB = 33;
/** Bühne, für die die Hintergrundblätter gebaut sind (G5: hintergrund/lage.ts liest daten/stages/scheibe.txt); andere Bühnen zeigen den Hintergrund der Platzhalter (G7-9). */
export const HINTERGRUND_BUEHNE = 'scheibe';
/**
 * Getragener Gegner beim Wurf (G7-7): Anteil des Wegs von der Haltelage zur
 * Loslassstelle der Logik (13 px vor bzw. hinter der Figur, 59 px hoch,
 * werte.ts WURF_LOSLASS_X, WURF_LOSLASS_HOEHE) je Bild der Animation wurf:
 * fassen, anheben, über dem Kopf (ab Bild 2 ganz).
 */
export const WURF_TRAGEN_ANTEIL: readonly number[] = [0, 0.5, 1];
