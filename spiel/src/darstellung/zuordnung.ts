// Zuordnung Logikzustand → Animation → Bild (Auftrag 4, Abschnitt 3; G7).
// Reine Funktionen ohne DOM: Die Darstellung (sprites.ts, zeichnen.ts) und
// die Tests (grafik_zuordnung, grafik_aktiv, grafik_dauer) rufen dieselben
// Funktionen auf. Sie lesen die Welt und die Atlanten der Blätter und ändern
// nichts.
//
// Grundsatz (docs/grafik.md 3 und 9): Der Kern pflegt den Animationszeiger
// anim nicht vollständig; das Bild folgt aus Aktion, Unterphase und
// Aktionsuhr (Figur) bzw. Modus, Aktion, modus_uhr, Angriff und Bahn
// (Gegner), wie die Zuordnungstabellen in docs/grafik.md 4.1 bis 4.7 es
// festlegen. Die Uhr → Bild-Tabelle ist die Folge der Bilddauern im Atlas
// (bildZurUhr: das erste Bild, bei dem die Summe der Dauern die Uhr
// erreicht; danach hält das letzte Bild); Schleifen laufen über
// ((Uhr − 1) mod Summe) + 1. Zahlen der Logik kommen aus werte.ts, Maße der
// Darstellung aus masse.ts. Fehlt eine Animation im Atlas, wählt die
// Zuordnung stand und nennt den Grund in ersatz (die Darstellung meldet es
// in der Konsole, der Test schlägt fehl).

import type { Figur, Gegner, GegnerTyp, Objekt } from '../kern/entitaeten.ts';
import type { Welt } from '../kern/welt.ts';
import { BAHNEN } from '../kern/bahn.ts';
import { entitaet } from '../kern/entitaeten.ts';
import { ganz } from '../kern/festkomma.ts';
import {
  AS_AKTIV_VON,
  AS_NAECHSTER,
  AUSFALL_AKTIV_BIS,
  AUSFALL_AKTIV_VON,
  BLINKEN_TAKT,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  GEGNER_TREFFERSTOPP,
  KETTE4_ZWEITES_FENSTER_BIS,
  KETTE4_ZWEITES_FENSTER_VON,
  KETTE_AKTIV_BIS,
  KETTE_AKTIV_VON,
  KOMBO_MAX,
  KP_LANDUNG,
  NAH_ANGRIFFE,
  RAKETE_ABSCHUSS,
  SPEZIAL_AKTIV_BIS,
  SPEZIAL_STUFE_DAUER,
  SPEZIAL_STUFE_VON,
  SPRUNG_LETZTER_LUFTFRAME,
  SPRUNGTRITT_AUFSETZEN,
  WURF_LOSLASS_HOEHE,
  WURF_LOSLASS_X,
} from '../kern/werte.ts';
import {
  MAGNETSTOSS_ANSATZ,
  MAGNETSTOSS_ANSATZ_4B,
  MUENDUNGSBLITZ,
  WERFER_GRIFF,
  WERFER_MUENDUNG,
  WERFER_PUNKTE,
  WURF_TRAGEN_ANTEIL,
} from './masse.ts';

// ===========================================================================
// Atlas (Format Auftrag 4, 2.3; docs/grafik.md 2.3 blatt.ts)
// ===========================================================================

/** Ein Bild im Blatt: Rechteck, Anker (Fußpunkt), Richtwert der Dauer in Frames. */
export interface AtlasBild {
  x: number;
  y: number;
  b: number;
  h: number;
  ankerX: number;
  ankerY: number;
  dauer: number;
}

/** Eine Animation: Bilder in Reihenfolge, Schleife, Bilder der aktiven Frames. */
export interface AtlasAnimation {
  schleife: boolean;
  bilder: AtlasBild[];
  aktiv?: number[];
}

/** Atlas eines Sprite-Blatts (Figuren, Objekte). */
export interface SpriteAtlas {
  blatt: string;
  /** Auftrag 5: 2 = Bilder, Maße und Anker in Bildpixeln; 1 oder fehlend = Spielpixel (blaetter.ts massstabVon) */
  massstab?: number;
  animationen: Record<string, AtlasAnimation>;
}

/**
 * Sprite-Blätter der Darstellung (rammbock_fremd wird nicht geladen, E24).
 * Die Namen sind die Blätter der Zuordnung; welche Datei je Blatt geladen
 * wird (<name> oder <name>_grok), entscheidet die Blattwahl (blaetter.ts).
 */
export const SPRITE_BLAETTER = ['vela', 'bolzer', 'puppe', 'rammbock', 'zuender', 'ballast', 'objekte'] as const;
export type SpriteBlatt = (typeof SPRITE_BLAETTER)[number];
/** Alle Sprite-Atlanten nach Blattname. */
export type Atlanten = Readonly<Record<SpriteBlatt, SpriteAtlas>>;

/** Blatt eines Gegnertyps (Puppe: Palettentausch des Bolzers mit eigenem Blatt, 4.4). */
export const GEGNER_BLATT: Readonly<Record<GegnerTyp, SpriteBlatt>> = {
  Bolzer: 'bolzer',
  Rammbock: 'rammbock',
  Zünder: 'zuender',
  Ballast: 'ballast',
  Puppe: 'puppe',
};

/** Ergebnis der Zuordnung: Blatt, Animation, Bildindex, Spiegelung (Blick links). */
export interface Wahl {
  blatt: SpriteBlatt;
  animation: string;
  bild: number;
  spiegeln: boolean;
  /** in diesem Frame nicht zeichnen (Blinken toter Gegner, G7-8) */
  aus: boolean;
  /** Grund, wenn stand als Ersatz gewählt wurde (fehlende Animation); null = keiner */
  ersatz: string | null;
}

/** Zusatzbild an einer Figur (Werfer, Magnetstoß, Eiswelle, Mündungsblitz): Versatz vom Fußpunkt auf dem Bildschirm. */
export interface Teil {
  wahl: Wahl;
  /** Versatz des Ankers vom Fußpunkt der Figur in Bildschirm-px (schon nach dem Blick gespiegelt) */
  dx: number;
  dy: number;
  /** vor (true) oder hinter (false) der Figur zeichnen */
  vorn: boolean;
}

// ===========================================================================
// Uhr → Bild
// ===========================================================================

/** Bildindex zur Uhr u (1 = erstes Bild): erstes Bild, bei dem die Summe der Dauern u erreicht; danach das letzte (docs/grafik.md 4.1). */
export function bildZurUhr(dauern: readonly number[], uhr: number): number {
  let summe = 0;
  for (let i = 0; i < dauern.length; i++) {
    summe += dauern[i] as number;
    if (uhr <= summe) return i;
  }
  return Math.max(0, dauern.length - 1);
}

/** Summe der Dauern. */
export function summe(dauern: readonly number[]): number {
  let s = 0;
  for (const d of dauern) s += d;
  return s;
}

/** Bild einer Schleife zur Uhr u (1 = erstes Bild): ((u − 1) mod Summe) + 1. */
export function schleifenBild(dauern: readonly number[], uhr: number): number {
  const s = summe(dauern);
  if (s <= 0) return 0;
  const u = (((uhr - 1) % s) + s) % s;
  return bildZurUhr(dauern, u + 1);
}

/** Bilddauern einer Animation oder null, wenn sie im Atlas fehlt. */
export function dauernVon(a: Atlanten, blatt: SpriteBlatt, animation: string): number[] | null {
  const an = a[blatt].animationen[animation];
  return an === undefined ? null : an.bilder.map((b) => b.dauer);
}

/** Wahl eines Bildes; fehlt die Animation oder das Bild, stand Bild 0 mit Grund (Auftrag 4, 3). */
export function waehle(a: Atlanten, blatt: SpriteBlatt, animation: string, bild: number, spiegeln: boolean, aus: boolean = false): Wahl {
  const an = a[blatt].animationen[animation];
  if (an === undefined) return { blatt, animation: 'stand', bild: 0, spiegeln, aus, ersatz: `${blatt}: Animation ${animation} fehlt` };
  if (!Number.isInteger(bild) || bild < 0 || bild >= an.bilder.length) {
    return { blatt, animation: 'stand', bild: 0, spiegeln, aus, ersatz: `${blatt}: ${animation} hat kein Bild ${bild}` };
  }
  return { blatt, animation, bild, spiegeln, aus, ersatz: null };
}

/** Wahl nach der Uhr über die Dauern der Animation (hält das letzte Bild). */
function nachUhr(a: Atlanten, blatt: SpriteBlatt, animation: string, uhr: number, spiegeln: boolean): Wahl {
  const d = dauernVon(a, blatt, animation);
  return waehle(a, blatt, animation, d === null ? 0 : bildZurUhr(d, uhr), spiegeln);
}

/** Wahl einer Schleife nach der Uhr. */
function schleife(a: Atlanten, blatt: SpriteBlatt, animation: string, uhr: number, spiegeln: boolean): Wahl {
  const d = dauernVon(a, blatt, animation);
  return waehle(a, blatt, animation, d === null ? 0 : schleifenBild(d, uhr), spiegeln);
}

/** Ersatzwahl für einen unbekannten Zustand (stand, mit Grund). */
function unbekannt(a: Atlanten, blatt: SpriteBlatt, spiegeln: boolean, grund: string): Wahl {
  return { ...waehle(a, blatt, 'stand', 0, spiegeln), ersatz: grund };
}

// ===========================================================================
// Spiegelung im Flug (G1-12, G2-10)
// ===========================================================================

/**
 * Spiegeln eines Flug-, Liege- oder Aufstehbilds: Gezeichnet ist der Flug
 * rücklings vom Blick weg (Kopf voran nach hinten). Fliegt die Entität in
 * ihre Blickrichtung (bahn_richtung = blick, Treffer von hinten), zeigt das
 * Bild in die Gegenrichtung des Blicks. bahn_richtung bleibt nach dem Ende
 * der Bahn stehen (bahn.ts), deshalb gilt die Regel auch im Liegen und
 * Aufstehen bis zum nächsten Stand.
 */
function flugSpiegeln(blick: 1 | -1, bahnRichtung: 1 | -1): boolean {
  const zeigt = bahnRichtung === blick ? -blick : blick;
  return zeigt === -1;
}

// ===========================================================================
// Figur (docs/grafik.md 4.1, Tabelle „Zuordnung Zustand → Animation → Bild“)
// ===========================================================================

/** Zahl der Luftbilder von sprung (Bilder bis SPRUNG_LETZTER_LUFTFRAME), danach die Landebilder. */
function sprungLuftBilder(d: readonly number[]): number {
  return bildZurUhr(d, SPRUNG_LETZTER_LUFTFRAME) + 1;
}

/** Sprung: Luftbild zur Uhr (Fallpose hält), Fallpose nach einem Sprungangriff, Landebild zur Uhr. */
function sprungWahl(a: Atlanten, art: 'luft' | 'fall' | 'landung', uhr: number, sp: boolean): Wahl {
  const d = dauernVon(a, 'vela', 'sprung');
  if (d === null) return waehle(a, 'vela', 'sprung', 0, sp);
  const n = sprungLuftBilder(d);
  if (art === 'fall') return waehle(a, 'vela', 'sprung', n - 1, sp);
  if (art === 'luft') return waehle(a, 'vela', 'sprung', bildZurUhr(d.slice(0, n), uhr), sp);
  return waehle(a, 'vela', 'sprung', n + bildZurUhr(d.slice(n), uhr), sp);
}

/** Kettenstufe 1 bis 4 der Figur (kombo, sonst Unterphase). */
function ketteStufe(f: Figur): number {
  const k = f.kombo >= 1 && f.kombo <= KOMBO_MAX ? f.kombo : Number(f.phase);
  return Number.isInteger(k) && k >= 1 && k <= KOMBO_MAX ? k : 1;
}

/**
 * Uhr der Kettenbilder (G7-2): Mit Ausfallschritt liegen die aktiven Frames
 * später (AUSFALL_AKTIV_VON statt KETTE_AKTIV_VON); die Bilder verschieben
 * sich um den Unterschied, damit das Trefferbild im ersten aktiven Frame
 * steht. Das zweite Fenster der Kette 4 bleibt bei uhr 17 bis 20.
 */
export function ketteUhr(f: Figur): number {
  const k = ketteStufe(f);
  if (f.ausfallschritt <= 0) return f.uhr;
  if (k === KOMBO_MAX && f.uhr >= KETTE4_ZWEITES_FENSTER_VON) return f.uhr;
  const versatz = (AUSFALL_AKTIV_VON[k - 1] as number) - (KETTE_AKTIV_VON[k - 1] as number);
  return Math.max(1, f.uhr - versatz);
}

/** Steht der letzte Angreifer vor der Figur (G1-11)? Vorzeichen von x_Angreifer − x_Figur gleich blick, bei Gleichheit vorn. */
function angreiferVorn(f: Figur, welt: Welt): boolean {
  if (f.letzter_angreifer === null) return true;
  const e = entitaet(welt, f.letzter_angreifer);
  if (e === null) return true;
  const d = ganz(e.x) - ganz(f.x);
  return d === 0 || Math.sign(d) === f.blick;
}

/** Tod im Flug (G1-13): die Bilder von umgeworfen mit den Zeiten der Bahn F4 (1, Stillstand, Kippen, Flug bis zum Boden, Aufprall bis zur Ruhe). */
export function totFlugDauern(a: Atlanten): number[] | null {
  const d = dauernVon(a, 'vela', 'umgeworfen');
  if (d === null || d.length < 5) return null;
  const stoss = d[0] as number;
  const kippen = d[2] as number;
  return [stoss, F4_STILLSTAND, kippen, F4_BODEN - stoss - F4_STILLSTAND - kippen, F4_RUHE - F4_BODEN];
}

/** Hat die Figur den Werfer in der Hand und zeigt ihn (G1-14: nur STAND, LAUF, WAFFE)? */
function werferSichtbar(f: Figur): boolean {
  return f.waffe === 'RW' && (f.aktion === 'STAND' || f.aktion === 'LAUF' || f.aktion === 'WAFFE');
}

/** Bild der Figur. */
export function figurWahl(f: Figur, welt: Welt, a: Atlanten): Wahl {
  const sp = f.blick === -1;
  const u = f.uhr;
  const waffe = f.waffe === 'RW';
  const flug = flugSpiegeln(f.blick, f.bahn_richtung);
  switch (f.aktion) {
    case 'STAND':
      return waehle(a, 'vela', waffe ? 'waffe_stand' : 'stand', 0, sp);
    case 'LAUF':
      return schleife(a, 'vela', waffe ? 'waffe_gehen' : 'gehen', u, sp);
    case 'SPRINT':
      return schleife(a, 'vela', 'sprint', u, sp);
    case 'SPRUNG':
      return sprungWahl(a, f.sprung_angriff ? 'fall' : 'luft', u, sp);
    case 'SPRINTSPRUNG': {
      if (f.phase === 'SS' && f.ss_n > 0) {
        const d = dauernVon(a, 'vela', 'sprint_sprungangriff');
        const bild = d === null ? 0 : bildZurUhr(d.slice(0, d.length - 1), f.ss_n);
        return waehle(a, 'vela', 'sprint_sprungangriff', bild, sp);
      }
      return sprungWahl(a, f.sprung_angriff ? 'fall' : 'luft', u, sp);
    }
    case 'LANDUNG': {
      if (f.angriff !== null && f.angriff.code === 'SS') {
        const d = dauernVon(a, 'vela', 'sprint_sprungangriff');
        return waehle(a, 'vela', 'sprint_sprungangriff', d === null ? 0 : d.length - 1, sp);
      }
      return sprungWahl(a, 'landung', u, sp);
    }
    case 'SPRUNGANGRIFF': {
      const name = f.phase === 'R' ? 'richtung' : f.phase === 'H' ? 'hoch' : f.phase === 'T' ? 'runter' : 'sprungangriff';
      const d = dauernVon(a, 'vela', name);
      // neutral: nach dem Ende der Tabelle die Fallpose des Sprungs (4.1)
      if (name === 'sprungangriff' && d !== null && u > summe(d)) return sprungWahl(a, 'fall', u, sp);
      return nachUhr(a, 'vela', name, u, sp);
    }
    case 'SCHLAG':
    case 'LEERSCHLAG':
      return nachUhr(a, 'vela', `kette${ketteStufe(f)}`, ketteUhr(f), sp);
    case 'GRIFF': {
      const d = dauernVon(a, 'vela', 'griff');
      const halten = d === null ? 0 : d.length - 1;
      return waehle(a, 'vela', 'griff', f.knie_zahl > 0 || d === null ? halten : bildZurUhr(d, u), sp);
    }
    case 'KNIESTOSS':
      return nachUhr(a, 'vela', 'kniestoss', u, sp);
    case 'WURF':
      return nachUhr(a, 'vela', 'wurf', u, sp);
    case 'SPEZIAL':
      return nachUhr(a, 'vela', 'spezial', u, sp);
    case 'SPRINTANGRIFF':
      return nachUhr(a, 'vela', 'sprintangriff', u, sp);
    case 'GETROFFEN':
      return nachUhr(a, 'vela', angreiferVorn(f, welt) ? 'getroffen_vorn' : 'getroffen_hinten', u, sp);
    case 'UMGEWORFEN':
      return nachUhr(a, 'vela', 'umgeworfen', u, flug);
    case 'LIEGEN':
      return waehle(a, 'vela', 'liegen', 0, flug);
    case 'AUFSTEHEN':
      return nachUhr(a, 'vela', 'aufstehen', u, flug);
    case 'TOT': {
      const d = totFlugDauern(a);
      if (d === null || u > summe(d)) return waehle(a, 'vela', 'tot', 0, flug);
      return waehle(a, 'vela', 'umgeworfen', bildZurUhr(d, u), flug);
    }
    case 'WAFFE':
      return nachUhr(a, 'vela', 'waffe_schuss', u, sp);
    case 'AUFNEHMEN':
      return nachUhr(a, 'vela', 'aufnehmen', u, sp);
    case 'NEUEINSTIEG': {
      if (f.landung_ln <= 0 || welt.frame < f.landung_ln) return schleife(a, 'vela', 'neueinstieg_fall', u, sp);
      return nachUhr(a, 'vela', 'neueinstieg_landung', welt.frame - f.landung_ln + 1, sp);
    }
    default:
      return unbekannt(a, 'vela', sp, `Figur: Aktion ${String(f.aktion)} unbekannt`);
  }
}

/** Werferpunkt W zur Wahl der Figur (masse.ts WERFER_PUNKTE), null ohne Werfer. */
function werferPunkt(w: Wahl): readonly [number, number] | null {
  if (w.animation !== 'waffe_stand' && w.animation !== 'waffe_gehen' && w.animation !== 'waffe_schuss') return null;
  return WERFER_PUNKTE[w.animation][w.bild] ?? null;
}

/**
 * Zusatzbilder der Figur (docs/grafik.md 4.1, 4.7): Raketenwerfer in der Hand
 * mit dem Griffpunkt auf Velas Werferpunkt, vor ihr (G1-7); Mündungsblitz
 * (G7-3); Magnetstoß am Ansatz der Kettenstufe in den aktiven Frames; Eiswelle
 * des Spezialangriffs nach beiden Seiten (hinter ihr).
 */
export function figurTeile(f: Figur, welt: Welt, a: Atlanten, w: Wahl = figurWahl(f, welt, a)): Teil[] {
  const teile: Teil[] = [];
  const b = f.blick;
  const sp = b === -1;
  // Raketenwerfer: Anker bei W − Griffpunkt (y gerundet), vor Vela
  const wp = werferSichtbar(f) ? werferPunkt(w) : null;
  if (wp !== null) {
    const ax = wp[0] - WERFER_GRIFF.x;
    const ay = Math.round(wp[1] - WERFER_GRIFF.y);
    teile.push({ wahl: waehle(a, 'objekte', 'raketenwerfer', 0, sp), dx: b * ax, dy: ay, vorn: true });
    // Mündungsblitz ab dem Abschuss P+7 (uhr RAKETE_ABSCHUSS)
    const n = f.aktion === 'WAFFE' ? f.uhr - RAKETE_ABSCHUSS : -1;
    if (n >= 0 && n < MUENDUNGSBLITZ.bilder.length * MUENDUNGSBLITZ.dauer) {
      const bild = MUENDUNGSBLITZ.bilder[Math.floor(n / MUENDUNGSBLITZ.dauer)] as number;
      const mx = ax + WERFER_MUENDUNG.x + MUENDUNGSBLITZ.vor;
      const my = ay + WERFER_MUENDUNG.y;
      teile.push({ wahl: waehle(a, 'objekte', 'funke', bild, sp), dx: b * mx, dy: my, vorn: true });
    }
  }
  // Magnetstoß in den aktiven Frames der Kette (Fenster wie ketteFenster in figur/angriffe.ts)
  if ((f.aktion === 'SCHLAG' || f.aktion === 'LEERSCHLAG') && f.ausfallschritt >= 0) {
    const k = ketteStufe(f);
    const von = f.ausfallschritt > 0 ? (AUSFALL_AKTIV_VON[k - 1] as number) : (KETTE_AKTIV_VON[k - 1] as number);
    const bis = f.ausfallschritt > 0 ? (AUSFALL_AKTIV_BIS[k - 1] as number) : (KETTE_AKTIV_BIS[k - 1] as number);
    let ansatz: readonly [number, number] | null = null;
    let n = 0;
    if (f.uhr >= von && f.uhr <= bis) {
      ansatz = MAGNETSTOSS_ANSATZ[k - 1] ?? null;
      n = f.uhr - von;
    } else if (k === KOMBO_MAX && f.treffer_h === 0 && f.uhr >= KETTE4_ZWEITES_FENSTER_VON && f.uhr <= KETTE4_ZWEITES_FENSTER_BIS) {
      ansatz = MAGNETSTOSS_ANSATZ_4B;
      n = f.uhr - KETTE4_ZWEITES_FENSTER_VON;
    }
    if (ansatz !== null) {
      const name = `magnetstoss${k}`;
      const d = dauernVon(a, 'objekte', name);
      const bild = d === null ? 0 : bildZurUhr(d, n + 1);
      teile.push({ wahl: waehle(a, 'objekte', name, bild, sp), dx: b * ansatz[0], dy: ansatz[1], vorn: true });
    }
  }
  // Eiswelle: Stufe k = ⌊(uhr − 8) / 6⌋ + 1 von uhr 8 bis 43, vorn und gespiegelt hinten (G4-7)
  const von = SPEZIAL_STUFE_VON[0] as number;
  if (f.aktion === 'SPEZIAL' && f.uhr >= von && f.uhr <= SPEZIAL_AKTIV_BIS) {
    const stufe = Math.min(SPEZIAL_STUFE_VON.length, Math.floor((f.uhr - von) / SPEZIAL_STUFE_DAUER) + 1);
    teile.push({ wahl: waehle(a, 'objekte', 'eiswelle', stufe - 1, sp), dx: 0, dy: 0, vorn: false });
    teile.push({ wahl: waehle(a, 'objekte', 'eiswelle', stufe - 1, !sp), dx: 0, dy: 0, vorn: false });
  }
  return teile;
}

// ===========================================================================
// Gegner (docs/grafik.md 4.2 bis 4.6)
// ===========================================================================

/** Angriffscode → Animation der Nahkämpfer (4.2, 4.3; G2-11). */
const NAH_ANIMATION: Readonly<Record<string, string>> = {
  BA: 'schlag_a',
  BB: 'schlag_b',
  BC: 'schlag_c',
  BUA: 'umwerfschlag_a',
  BUB: 'umwerfschlag_b',
  RA: 'schlag_a',
  RB: 'schlag_b',
  RU: 'umwerfschlag',
  RS: 'sprungtritt',
};

/** Animation zu einem Angriffscode eines Nahkämpfers oder null. */
export function nahAnimation(code: string): string | null {
  return NAH_ANIMATION[code] ?? null;
}

/** Wartepose der Nahkämpfer nach dem Rückzug (Rammbock und Bolzer: kampfhaltung, 4.2, 4.3). */
const WARTEPOSE = 'kampfhaltung';

/**
 * Gehbild (G2, G3-15): n = Gehframes (Zähler der Darstellung, sonst
 * modus_uhr); Schleife über die Dauern; läuft der Gegner gegen seinen Blick
 * ((x − x_vor) · blick < 0), laufen die Bilder rückwärts.
 */
function gehWahl(a: Atlanten, blatt: SpriteBlatt, name: string, g: Gegner, n: number): Wahl {
  const d = dauernVon(a, blatt, name);
  const sp = g.blick === -1;
  if (d === null) return waehle(a, blatt, name, 0, sp);
  let bild = schleifenBild(d, n);
  if ((ganz(g.x) - g.x_vor) * g.blick < 0) bild = (d.length - bild) % d.length;
  return waehle(a, blatt, name, bild, sp);
}

/** Bildindex nach dem Stand einer Bahn (4.5): Stillstand 0, steigend 1, fallend 2, Aufprall 3, danach 4 (bzw. 5 ab der Ruhe). */
function bahnBild(g: Gegner, aufprall: number, bilder: number): number {
  if (g.bahn_boden === 0) {
    if (g.bahn_frame === 0) return 0;
    return g.vh > 0 ? 1 : 2;
  }
  const d = g.bahn_frame - g.bahn_boden;
  if (d < aufprall) return 3;
  if (bilder <= 5) return 4;
  return ruheErreicht(g) ? 5 : 4;
}

/** Hat die Bahn die Ruhe erreicht (bahn_frame − bahn_boden ≥ Frames vom Boden bis zur Ruhe, bahn.ts)? */
function ruheErreicht(g: Gegner): boolean {
  if (g.bahn === '' || g.bahn_boden === 0) return false;
  return g.bahn_frame - g.bahn_boden >= BAHNEN[g.bahn].nach_boden;
}

/** Blinken toter Gegner nach der Ruhe (G7-8): in jedem zweiten Framepaar nicht gezeichnet; der Boss blinkt nicht. */
function totBlinkt(g: Gegner, welt: Welt): boolean {
  return g.typ !== 'Ballast' && ruheErreicht(g) && Math.floor(welt.frame / BLINKEN_TAKT) % 2 === 1;
}

/** Hat der Gegnertyp eigene Wurfbilder (geworfen)? */
function hatGeworfen(a: Atlanten, blatt: SpriteBlatt): boolean {
  return a[blatt].animationen['geworfen'] !== undefined;
}

/** Reaktionen aller Gegner (Kampf 7; 4.2 bis 4.6); null = keine Reaktion. */
function reaktionWahl(g: Gegner, welt: Welt, a: Atlanten, blatt: SpriteBlatt): Wahl | null {
  const sp = g.blick === -1;
  const flug = flugSpiegeln(g.blick, g.bahn_richtung);
  const k = welt.frame - g.reaktion_h;
  // Wurf (Bahn F3) vor dem Bodenkontakt: geworfen, Bild nach der Flugrichtung (G2-10)
  const geworfen = g.bahn === 'F3' && g.bahn_boden === 0 && hatGeworfen(a, blatt);
  switch (g.modus) {
    case 'GETROFFEN':
      return nachUhr(a, blatt, 'getroffen', k, sp);
    case 'UMGEWORFEN': {
      if (geworfen) return waehle(a, blatt, 'geworfen', g.bahn_frame === 0 ? 0 : 1, g.bahn_richtung === -1);
      const d = dauernVon(a, blatt, 'umgeworfen');
      return waehle(a, blatt, 'umgeworfen', bahnBild(g, d === null ? 5 : (d[3] ?? 5), 5), flug);
    }
    case 'LIEGEN':
      return waehle(a, blatt, 'liegen', 0, flug);
    case 'AUFSTEHEN':
      return nachUhr(a, blatt, 'aufstehen', g.modus_uhr, flug);
    case 'TOT': {
      if (geworfen) return waehle(a, blatt, 'geworfen', g.bahn_frame === 0 ? 0 : 1, g.bahn_richtung === -1);
      const name = g.typ === 'Ballast' ? 'fall' : 'tot';
      const d = dauernVon(a, blatt, name);
      const bilder = d === null ? 5 : d.length;
      const w = waehle(a, blatt, name, bahnBild(g, d === null ? 5 : (d[3] ?? 5), bilder), flug);
      return { ...w, aus: totBlinkt(g, welt) };
    }
    case 'GEHALTEN':
      return waehle(a, blatt, 'gehalten', 0, sp);
    default:
      return null;
  }
}

/** Nahkämpfer: Bolzer, Rammbock, Puppe (4.2 bis 4.4). */
function nahWahl(g: Gegner, welt: Welt, a: Atlanten, blatt: SpriteBlatt, gehN: number): Wahl {
  const sp = g.blick === -1;
  const m = g.modus_uhr;
  const rammbock = g.typ === 'Rammbock';
  const schnell = g.gehstufe === 'schnell' ? 'gehen_schnell' : 'gehen';
  switch (g.modus) {
    case 'WARTEN':
      return waehle(a, blatt, g.auftritt === 'hocke' ? 'auftritt_hocke' : 'stand', 0, sp);
    case 'AUFTRITT':
      if (g.auftritt === 'hocke') return nachUhr(a, blatt, 'aufstehen_hocke', m, sp);
      return schleife(a, blatt, 'auftritt_versteck', m, sp);
    case 'ANNAEHERN':
    case 'ABWARTEN':
    case 'SEITENWECHSEL':
      if (g.aktion === 'GEHEN') return gehWahl(a, blatt, schnell, g, gehN);
      if (g.modus === 'ABWARTEN' && rammbock) return schleife(a, blatt, 'wiegen', m, sp);
      return schleife(a, blatt, 'haltung', m, sp);
    case 'FREI':
    case 'PUPPE':
      return schleife(a, blatt, 'haltung', m, sp);
    case 'KAMPFHALTUNG':
      if (rammbock) return nachUhr(a, blatt, 'hocke_ankuendigung', m, sp);
      return schleife(a, blatt, 'kampfhaltung', m, sp);
    case 'SPOTT':
      return nachUhr(a, blatt, 'spott', m, sp);
    case 'ANGRIFF':
    case 'NACHLAUF': {
      const name = nahAnimation(g.angriff_code);
      if (name === null) return schleife(a, blatt, WARTEPOSE, m, sp);
      const d = dauernVon(a, blatt, name);
      if (d === null) return waehle(a, blatt, name, 0, sp);
      const dA = welt.frame - g.angriff_a;
      if (g.angriff_code === 'RS') {
        // Sprungtritt (4.2): Absprung, Flug bis zum Aufsetzen A+46 (h = 0), dann je 4 Frames Landung und Aufrichten
        if (dA + 1 <= (d[0] as number)) return waehle(a, blatt, name, 0, sp);
        if (ganz(g.h) > 0 || dA < SPRUNGTRITT_AUFSETZEN) return waehle(a, blatt, name, 1, sp);
        const e = dA - SPRUNGTRITT_AUFSETZEN;
        if (e < (d[2] as number)) return waehle(a, blatt, name, 2, sp);
        if (e < (d[2] as number) + (d[3] as number) || g.modus === 'ANGRIFF') return waehle(a, blatt, name, 3, sp);
        return schleife(a, blatt, WARTEPOSE, m, sp);
      }
      // ANGRIFF: Ausholen, Trefferbild hält bis zum Ende der aktiven Frames (nach Treffer 7 länger)
      if (g.modus === 'ANGRIFF') return waehle(a, blatt, name, bildZurUhr(d.slice(0, 3), dA + 1), sp);
      // NACHLAUF: Rückzugsbilder 3 und 4, dann die Wartepose
      const rueck = d.slice(3);
      if (m <= summe(rueck)) return waehle(a, blatt, name, 3 + bildZurUhr(rueck, m), sp);
      return schleife(a, blatt, WARTEPOSE, m, sp);
    }
    default:
      return unbekannt(a, blatt, sp, `${g.typ}: Modus ${g.modus} unbekannt`);
  }
}

/** Zünder (4.5). */
function zuenderWahl(g: Gegner, welt: Welt, a: Atlanten, blatt: SpriteBlatt, gehN: number): Wahl {
  const sp = g.blick === -1;
  const m = g.modus_uhr;
  const schnell = g.gehstufe === 'schnell' ? 'gehen_schnell' : 'gehen';
  switch (g.modus) {
    case 'WARTEN':
    case 'BEREIT':
    case 'FREI':
    case 'PUPPE':
      return waehle(a, blatt, 'stand', 0, sp);
    case 'AUFTRITT':
      return gehWahl(a, blatt, 'gehen', g, m);
    case 'ANNAEHERN':
    case 'ZURUECK':
      if (g.aktion === 'GEHEN') return gehWahl(a, blatt, schnell, g, gehN);
      return waehle(a, blatt, 'stand', 0, sp);
    case 'ZIELEN':
      return schleife(a, blatt, 'zielen', m, sp);
    case 'SCHUSS':
      return nachUhr(a, blatt, 'schuss', welt.frame - g.angriff_a + 1, sp);
    case 'KOLBENHIEB': {
      const d = dauernVon(a, blatt, 'kolbenhieb');
      if (d === null) return waehle(a, blatt, 'kolbenhieb', 0, sp);
      if (g.aktion === 'NACHLAUF') {
        // Rückzugsbilder 3 und 4 am Anfang des Nachlaufs, dann stand (G7-6)
        const r = welt.frame - g.angriff_aktiv_ende;
        const rueck = d.slice(3);
        if (r >= 1 && r <= summe(rueck)) return waehle(a, blatt, 'kolbenhieb', 3 + bildZurUhr(rueck, r), sp);
        return waehle(a, blatt, 'stand', 0, sp);
      }
      // Ausholen, Trefferbild bis zum Ende der aktiven Frames (nach Treffer bis angriff_aktiv_ende)
      return waehle(a, blatt, 'kolbenhieb', bildZurUhr(d.slice(0, 3), welt.frame - g.angriff_a + 1), sp);
    }
    default:
      return unbekannt(a, blatt, sp, `Zünder: Modus ${g.modus} unbekannt`);
  }
}

/** Bilddauern eines Schwungs k (1 bis 3) des Armschwungs; nach einem Treffer 7 Frames länger im Trefferbild, Rückzug bis AS_NAECHSTER (4.6). */
function schwungDauern(d: readonly number[], k: number, treffer: boolean): number[] {
  const s = d.slice((k - 1) * 5, k * 5);
  if (!treffer || s.length < 5) return s;
  const vorn = (s[0] as number) + (s[1] as number) + (s[2] as number) + GEGNER_TREFFERSTOPP;
  const rest = Math.max(2, AS_NAECHSTER - vorn);
  return [s[0] as number, s[1] as number, (s[2] as number) + GEGNER_TREFFERSTOPP, Math.ceil(rest / 2), Math.floor(rest / 2)];
}

/** Ballast (4.6). */
function ballastWahl(g: Gegner, welt: Welt, a: Atlanten, blatt: SpriteBlatt, gehN: number): Wahl {
  const sp = g.blick === -1;
  const m = g.modus_uhr;
  const f = welt.frame;
  const boss = g.boss;
  switch (g.modus) {
    case 'WARTEN':
      return waehle(a, blatt, 'stand', 0, sp);
    case 'AUFTRITT':
      return nachUhr(a, blatt, 'auftritt', m, sp);
    case 'BEREIT':
    case 'FREI':
    case 'PUPPE':
      if (g.aktion === 'GEHEN') return gehWahl(a, blatt, 'gehen', g, gehN);
      return schleife(a, blatt, 'stand', m, sp);
    case 'ANKUENDIGUNG': {
      const ank = dauernVon(a, blatt, 'ankuendigung');
      const ankSumme = ank === null ? 0 : summe(ank);
      // Armschwung (nur Schwung 1 kündigt an, G3-13): erst die Ankündigung, danach das Ausholen des Schwungs
      if (boss.art === 'AS') {
        const n = f - boss.schwung_a;
        if (n < ankSumme) return nachUhr(a, blatt, 'ankuendigung', n + 1, sp);
        return armschwungWahl(g, welt, a, blatt);
      }
      // Ansturm (schleift bis n = 19) und Hocke der Körperpresse (n = 0 bis 14)
      return schleife(a, blatt, 'ankuendigung', f - g.angriff_a + 1, sp);
    }
    case 'ANGRIFF':
    case 'NACHLAUF':
      if (boss.art === 'AS') return armschwungWahl(g, welt, a, blatt);
      if (boss.art === 'AN') {
        if (g.modus === 'ANGRIFF') return schleife(a, blatt, 'ansturm', Math.max(1, boss.lauf_n), sp);
        const br = dauernVon(a, blatt, 'ansturm_bremsen');
        if (br !== null && boss.auslauf_n >= 1 && boss.auslauf_n <= summe(br)) return waehle(a, blatt, 'ansturm_bremsen', 0, sp);
        return schleife(a, blatt, 'stand', m, sp);
      }
      if (boss.art === 'KP') {
        const uhr = boss.kp_landung > 0 ? KP_LANDUNG + 1 + (f - boss.kp_landung) : boss.kp_k + 1;
        return nachUhr(a, blatt, 'koerperpresse', uhr, sp);
      }
      return schleife(a, blatt, 'stand', m, sp);
    case 'STOSS':
      return nachUhr(a, blatt, 'stoss_rueckzug', f - boss.stoss_beginn, sp);
    case 'TAUMELN':
      return nachUhr(a, blatt, 'taumeln', f - g.reaktion_h, sp);
    default:
      return unbekannt(a, blatt, sp, `Ballast: Modus ${g.modus} unbekannt`);
  }
}

/** Armschwung, Schwung k = schwung (4.6): Bild 5(k − 1) + Bild des Schwungs nach n = f − schwung_a; im Nachlauf nach AS_NAECHSTER stand. */
function armschwungWahl(g: Gegner, welt: Welt, a: Atlanten, blatt: SpriteBlatt): Wahl {
  const sp = g.blick === -1;
  const d = dauernVon(a, blatt, 'armschwung');
  if (d === null) return waehle(a, blatt, 'armschwung', 0, sp);
  const k = Math.min(3, Math.max(1, g.schwung));
  const n = welt.frame - g.boss.schwung_a;
  if (g.modus === 'NACHLAUF' && n >= AS_NAECHSTER) return schleife(a, blatt, 'stand', g.modus_uhr, sp);
  const s = schwungDauern(d, k, g.boss.treffer && n >= AS_AKTIV_VON);
  return waehle(a, blatt, 'armschwung', 5 * (k - 1) + bildZurUhr(s, n + 1), sp);
}

/**
 * Bild eines Gegners. gehN: Gehframes aus dem Verlauf der Darstellung
 * (verlauf.ts), sonst modus_uhr.
 */
export function gegnerWahl(g: Gegner, welt: Welt, a: Atlanten, gehN: number = g.modus_uhr): Wahl {
  const typ: GegnerTyp = g.typ === '' ? 'Bolzer' : g.typ;
  const blatt = GEGNER_BLATT[typ];
  const r = reaktionWahl(g, welt, a, blatt);
  if (r !== null) return r;
  if (typ === 'Zünder') return zuenderWahl(g, welt, a, blatt, gehN);
  if (typ === 'Ballast') return ballastWahl(g, welt, a, blatt, gehN);
  return nahWahl(g, welt, a, blatt, gehN);
}

/**
 * Darstellungsversatz eines getragenen Gegners beim Wurf (G7-7): Von E+1 bis
 * E+21 bleibt der Geworfene in der Logik in der Haltelage am Boden (Bahn F3
 * im Stillstand, Kampf 8.4); die Figur hebt ihn in ihrer Animation wurf über
 * den Kopf. Die Darstellung führt ihn deshalb je Bild der Wurfanimation von
 * der Haltelage zur Loslassstelle der Logik (x der Figur ± WURF_LOSLASS_X,
 * Höhe WURF_LOSLASS_HOEHE), an der er in E+22 tatsächlich erscheint. Sonst
 * kein Versatz. dx in Bildschirm-px, dh nach oben.
 */
export function getragenVersatz(g: Gegner, welt: Welt, a: Atlanten): { dx: number; dh: number } {
  const f = welt.figur;
  const getragen = g.bahn === 'F3' && g.bahn_frame === 0 && g.bahn_boden === 0 && (g.modus === 'UMGEWORFEN' || g.modus === 'TOT');
  if (!getragen || f.aktion !== 'WURF' || f.wurf_ziel !== g.schluessel) return { dx: 0, dh: 0 };
  const w = figurWahl(f, welt, a);
  if (w.animation !== 'wurf') return { dx: 0, dh: 0 };
  const anteil = WURF_TRAGEN_ANTEIL[Math.min(w.bild, WURF_TRAGEN_ANTEIL.length - 1)] ?? 1;
  const zielX = ganz(f.x) + WURF_LOSLASS_X * g.bahn_richtung;
  return { dx: Math.round((zielX - ganz(g.x)) * anteil), dh: Math.round(WURF_LOSLASS_HOEHE * anteil) };
}

// ===========================================================================
// Objekte (docs/grafik.md 4.7)
// ===========================================================================

/** Animation eines Gegenstands. */
const GEGENSTAND_ANIMATION: Readonly<Record<string, string>> = {
  Kometenbraten: 'kometenbraten',
  Eisnudelschale: 'eisnudelschale',
  Sternbeeren: 'sternbeeren',
  Raketenwerfer: 'raketenwerfer',
};

/**
 * Bild eines Objekts oder null (nicht als Objekt gezeichnet): zerbrochene
 * Behälter und Explosionen zeichnet die Effektliste (verlauf.ts), Effekte
 * des Typs Effekt kommen in der Scheibe nicht vor.
 */
export function objektWahl(o: Objekt, a: Atlanten): Wahl | null {
  switch (o.typ) {
    case 'Gegenstand': {
      const name = GEGENSTAND_ANIMATION[o.art];
      return name === undefined ? null : waehle(a, 'objekte', name, 0, false);
    }
    case 'Waffe':
      return waehle(a, 'objekte', 'waffe_leer', 0, false);
    case 'Behälter':
      if (o.zerbrochen) return null;
      return waehle(a, 'objekte', o.art === 'Bosskiste' ? 'bosskiste' : 'fass', 0, false);
    case 'Rakete': {
      if (o.flugphase !== 'FLUG') return null;
      const name = o.besitzer !== null && o.besitzer.startsWith('s') ? 'rakete_zuender' : 'rakete';
      return schleife(a, 'objekte', name, o.flug_n + 1, o.bahn_richtung === -1);
    }
    default:
      return null;
  }
}
