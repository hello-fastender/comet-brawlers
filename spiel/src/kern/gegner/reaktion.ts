// Trefferreaktion der Gegner (K2) nach docs/spezifikation-kampf.md, Abschnitt 7
// (23 Frames ohne Rückstoß mit Neustart, E3; Umwerfen, Liegen, Aufstehen,
// kein Schutz danach, E4; Tod und Slotfreigabe; genau 0 LP lebt weiter;
// gehalten), Flugbahnen F1 bis F4b nach Abschnitt 5.7 und Puppen nach 11.2.
//
// Ablauf je Gegner (außer dem Boss, den K4 führt):
//   KS7  gegnerGetroffen: Wirkung bestimmen, Ereignis T, LP, Reaktion beginnen
//   KS3  reaktionSchritt: Reaktion fortschreiben (Stillstand, Bahn, Liegen,
//        Aufstehen, Tod, Slot frei); true, solange der Gegner reagiert
//   W4   puppeEntscheidung: Puppe schaut zur Figur
//
// Zustand je Reaktion (Kampf 7). Der Trefferframe h bzw. W bzw. t zeigt die
// Reaktion schon (Modus, Aktion); Zustand 2 gilt ab W+1 bzw. t+1, im
// Trefferframe selbst steht Zustand 3 (Festlegung K2 nach dem Wortlaut
// „2 von W+1 bis G−1“, „2 ab t+1“; ein schon gehaltener Gegner bleibt 2).
//   GETROFFEN   3 von h bis h+22, frei (1, FREI) ab h+23, Neustart je Treffer
//   UMGEWORFEN  Bahn F1, F2 oder F3, 2 ab W+1; in der Ruhe LIEGEN
//   LIEGEN      leicht 32 (nach Wurf 16), schwer 16 bis 44 (P18), Zufall bei der Ruhe
//   AUFSTEHEN   18 Frames; G = Ruhe + Liegen + 18: Zustand 1, FREI (E4: ohne Schutz)
//   TOT         Bahn F4 (nach KT2 F4b, nach Wurf F3), 2 ab t+1, Slot frei t+79 (t+111, t+101)
//   GEHALTEN    führt K1 (Griff, Haltelage, Wurf); hier nur Logik ruht
//
// Die Bahnberechnung (BAHNEN, bahnStarten, bahnSchritt) ist exportiert, damit
// K1 (Figur auf F1 und F4, P15) und K4 (Boss: F1 mit anderem Auslauf) sie
// nutzen können.
//
// Eigene Zähler stehen in g.timer unter den Schlüsseln T_BODEN und T_RUHE
// (nie darüber iterieren, Vertrag entitaeten.ts).

import type { Bahn, Blick, EntitaetBasis, Gegner, SlotKey, Treffer } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Begrenzung, Hindernis } from '../stage.ts';
import type { Welt } from '../welt.ts';
import {
  ZUSTAND_BODEN,
  ZUSTAND_NORMAL,
  ZUSTAND_REAKTION,
  blickZu,
  freigeben,
  gegnerVon,
  istReaktion,
  modusSetzen,
} from '../entitaeten.ts';
import { EREIGNIS, ereignis, ereignisTreffer } from '../ereignisse.ts';
import { add, ausGanz, ganz, maxF, mulGanz, sub } from '../festkomma.ts';
import { behaelterHindernis, schrittBegrenzt } from '../stage.ts';
import { bereich } from '../zufall.ts';
import {
  AUFSTEHEN_GEGNER,
  BILD_BREITE,
  BOSS_LIEGEN_BIS,
  BOSS_LIEGEN_VON,
  BOSS_ZUFALL_SCHRITT,
  F1_AX,
  F1_BODEN,
  F1_GH,
  F1_RUHE,
  F1_STILLSTAND,
  F1_VH,
  F1_VX,
  F2_BODEN,
  F2_RUHE,
  F2_START_HOEHE,
  F3_AX,
  F3_BODEN,
  F3_ERSTER,
  F3_GH,
  F3_RUHE,
  F3_VH,
  F3_VX,
  F4B_ROLLEN,
  F4B_ROLLEN_BIS,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  LIEGEN_LEICHT,
  LIEGEN_LEICHT_WURF,
  LIEGEN_SCHWER_BIS,
  LIEGEN_SCHWER_SCHRITT,
  LIEGEN_SCHWER_VON,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  SLOT_FREI_STUFE2,
  SLOT_FREI_TOD,
  SLOT_FREI_WURF,
  WURF_AUSSERHALB_MAX,
  WURF_LOSLASSEN,
  WURF_LOSLASS_HOEHE,
  WURF_LOSLASS_X,
  WURF_TREFFER,
} from '../werte.ts';

// ===========================================================================
// Flugbahnen (Kampf 5.7)
// ===========================================================================

/** Bahn ohne die leere Kennung. */
export type BahnArt = Exclude<Bahn, ''>;

/**
 * Daten einer Flugbahn (Kampf 5.7). Je Bahnframe: x += vx · Richtung, danach
 * vx −= ax; h += vh, danach vh −= gh; wird h ≤ 0, ist h = 0 (Bodenkontakt).
 * Nach dem Bodenkontakt läuft x bis zur Ruhe weiter, die Höhe bleibt 0 (P13).
 */
export interface BahnDaten {
  /** Stillstandsframes W+1 bis W+stillstand; erster Bahnframe W+stillstand+1 */
  stillstand: number;
  vx: Fest;
  ax: Fest;
  vh: Fest;
  gh: Fest;
  /** Höhe ab W+1 (F2: 16 px); null = die aktuelle Höhe bleibt (Treffer in der Luft, P15) */
  start_h: Fest | null;
  /**
   * Bahnframes vom Bodenkontakt bis zur Ruhe (F1: Boden W+46, Ruhe W+55 → 9).
   * Relativ zum Bodenkontakt, damit eine Bahn aus der Luft (P15) erst nach
   * dem Bodenkontakt zur Ruhe kommt; vom Boden aus gibt das genau die Tabelle.
   */
  nach_boden: number;
  /** x-Geschwindigkeit nach dem Bodenkontakt (F4b: Rollen 2,0 ab t+41); null = vx läuft weiter */
  boden_vx: Fest | null;
}

/** Die Bahnen aus Kampf 5.7, Frames relativ zum Treffer W (beim Wurf W = E+1). */
export const BAHNEN: Readonly<Record<BahnArt, BahnDaten>> = {
  /** F1 Umwerfen: Stillstand W+1 bis W+8, Boden W+46 bei 109,25, Ruhe W+55 bei 135,125 */
  F1: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F1_RUHE - F1_BODEN, boden_vx: null },
  /** F2 dritter Kniestoß: wie F1 aus 16 px Höhe, Boden W+49, Ruhe W+58 */
  F2: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: F2_START_HOEHE, nach_boden: F2_RUHE - F2_BODEN, boden_vx: null },
  /** F3 Wurf: getragen bis E+21, losgelassen E+22, erster Bahnframe E+23, Boden E+59, Ruhe E+71 */
  F3: { stillstand: F3_ERSTER - WURF_TREFFER - 1, vx: F3_VX, ax: F3_AX, vh: F3_VH, gh: F3_GH, start_h: null, nach_boden: F3_RUHE - F3_BODEN, boden_vx: null },
  /** F4 Tod: Stillstand t+1, t+2, Boden t+40, Ruhe t+49 */
  F4: { stillstand: F4_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F4_RUHE - F4_BODEN, boden_vx: null },
  /** F4b Tod durch Stufe 2: wie F4, ab t+41 Rollen 2,0 bis t+72 */
  F4b: { stillstand: F4_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F4B_ROLLEN_BIS - F4_BODEN, boden_vx: F4B_ROLLEN },
};

/** Lage nach einem Bahnschritt. */
export type BahnLage = 'stillstand' | 'luft' | 'boden' | 'rutschen' | 'ruhe';

/** timer-Schlüssel: Bahnframe des Bodenkontakts, 0 = noch keiner. */
export const T_BODEN = 'bahn_boden';
/** timer-Schlüssel: Frame, in dem die Ruhe erreicht wurde (Beginn von LIEGEN). */
export const T_RUHE = 'reaktion_ruhe';

/**
 * Beginnt eine Bahn am Trefferort (Kampf 5.7): setzt bahn, bahn_richtung,
 * bahn_start_x, vx, ax, vh, gh; bahn_frame 0. Die Höhe bleibt, wie sie ist
 * (am Boden 0; in der Luft beginnt die Bahn dort, P15).
 */
export function bahnStarten(e: EntitaetBasis, bahn: BahnArt, richtung: Blick): void {
  const d = BAHNEN[bahn];
  e.bahn = bahn;
  e.bahn_richtung = richtung;
  e.bahn_frame = 0;
  e.bahn_start_x = e.x;
  e.vx = d.vx;
  e.ax = d.ax;
  e.vh = d.vh;
  e.gh = d.gh;
  e.vz = 0;
  e.timer[T_BODEN] = 0;
}

/**
 * Ein Frame der laufenden Bahn (Kampf 5.7). k = Frames seit dem Treffer
 * (Frame W+k). Stillstand bis W+stillstand (F2 setzt dort 16 px Höhe), dann
 * je Bahnframe x, danach h; x wird durch b begrenzt (Welt 2.2: Band,
 * Hindernisse, Wände; null = unbegrenzt). Nach dem Bodenkontakt (vh und gh
 * werden 0) läuft x mit vx bzw. boden_vx weiter, bis nach_boden Frames später
 * die Ruhe erreicht ist; danach bewegt sich nichts mehr.
 *
 * Rückgabe: 'ruhe' im Frame, in dem die Ruhe erreicht ist, und danach.
 * Für K1 (Figur auf F1/F4, auch aus der Luft) und K4 (Boss mit eigenem
 * Auslauf über den Parameter d) gedacht.
 */
export function bahnSchritt(e: EntitaetBasis, k: number, b: Begrenzung | null, d: BahnDaten | null = null): BahnLage {
  if (d === null && e.bahn === '') return 'ruhe';
  const daten = d ?? BAHNEN[e.bahn as BahnArt];
  if (k < 1) return 'stillstand';
  if (k <= daten.stillstand) {
    if (k === 1 && daten.start_h !== null) e.h = daten.start_h;
    return 'stillstand';
  }
  const n = k - daten.stillstand;
  const boden = e.timer[T_BODEN] ?? 0;
  if (boden > 0 && n > boden + daten.nach_boden) return 'ruhe';
  e.bahn_frame = n;
  // x
  const v = boden > 0 && daten.boden_vx !== null ? daten.boden_vx : e.vx;
  const dx = mulGanz(v, e.bahn_richtung);
  e.x = b === null ? add(e.x, dx) : schrittBegrenzt(b, e.x, e.z, e.h, dx, 0).x;
  e.vx = maxF(0, sub(e.vx, e.ax));
  // Höhe
  if (boden === 0) {
    e.h = add(e.h, e.vh);
    e.vh = sub(e.vh, e.gh);
    if (e.h > 0) return 'luft';
    e.h = 0;
    e.vh = 0;
    e.gh = 0;
    e.timer[T_BODEN] = n;
    return daten.nach_boden === 0 ? 'ruhe' : 'boden';
  }
  return n >= boden + daten.nach_boden ? 'ruhe' : 'rutschen';
}

/**
 * Begrenzung einer Gegnerbahn (Welt 2.2 Punkt 5): Band, Hindernisse und
 * unzerbrochene Behälter, nicht die Bildränder; geworfene Gegner (F3) bleiben
 * höchstens 96 px außerhalb des Bildes (Kampf 5.7), außer auf einer Bühne
 * ohne Ränder (Prüfbühne, Kampf 11.2).
 */
export function gegnerBegrenzung(welt: Welt, g: Gegner): Begrenzung {
  const zusatz: Hindernis[] = [];
  for (const o of welt.objekte) {
    if (o.belegt && o.typ === 'Behälter' && !o.zerbrochen) zusatz.push(behaelterHindernis(o.id, ganz(o.x), ganz(o.z)));
  }
  let xMin: Fest | null = null;
  let xMax: Fest | null = null;
  if (g.bahn === 'F3' && welt.stage.raender) {
    xMin = ausGanz(welt.kamera.x - WURF_AUSSERHALB_MAX);
    xMax = ausGanz(welt.kamera.x + BILD_BREITE - 1 + WURF_AUSSERHALB_MAX);
  }
  return { stage: welt.stage, zusatz, x_min: xMin, x_max: xMax };
}

/** Frame des Loslassens beim Wurf relativ zu W = E+1 (E+22, Kampf 8.4). */
const WURF_LOSLASSEN_K = WURF_LOSLASSEN - WURF_TREFFER;

/**
 * Wurfbahn F3: Der Gegner bleibt E+1 bis E+21 in der Haltelage (die Figur ist
 * gebunden und steht) und wird in E+22 in 59 px Höhe 13 px vor bzw. hinter
 * der Figur losgelassen, in Flugrichtung (P19, Kampf 8.4).
 */
function wurfLoslassen(welt: Welt, g: Gegner, k: number): void {
  if (g.bahn !== 'F3' || k !== WURF_LOSLASSEN_K) return;
  g.x = add(welt.figur.x, mulGanz(ausGanz(WURF_LOSLASS_X), g.bahn_richtung));
  g.h = ausGanz(WURF_LOSLASS_HOEHE);
}

// ===========================================================================
// Hilfen
// ===========================================================================

function gegenrichtung(b: Blick): Blick {
  return b === 1 ? -1 : 1;
}

/** Flugrichtung von der Figur weg (Tod ohne Angreifer, Welt 7.6); bei gleichem x Blick der Figur (wie P14). */
export function vonFigurWeg(welt: Welt, g: Gegner): Blick {
  const dx = ganz(g.x) - ganz(welt.figur.x);
  if (dx > 0) return 1;
  if (dx < 0) return -1;
  return welt.figur.blick;
}

/**
 * Flugrichtung des Getroffenen: t.richtung (Regel der Instanz, treffer.ts).
 * Beim Wurf gilt die Wurfrichtung der Figur (vorwärts in Blickrichtung,
 * rückwärts entgegen, Kampf 8.2), falls K1 sie gesetzt hat.
 */
function flugrichtung(welt: Welt, g: Gegner, t: Treffer): Blick {
  const f = welt.figur;
  if (t.code === 'WU' && f.wurf_ziel === g.schluessel) {
    if (f.wurf_richtung === 'V') return f.blick;
    if (f.wurf_richtung === 'R') return gegenrichtung(f.blick);
  }
  return t.richtung;
}

/** Bricht einen eigenen laufenden Angriff ab (Kampf 7); fremde Instanzen (WG der Figur) bleiben. */
function eigenenAngriffAbbrechen(g: Gegner): void {
  if (g.angriff !== null && g.angriff.urheber === g.schluessel) g.angriff = null;
}

/** Zielrecht frei: eine Reaktion beendet das Zielen (Welt 6). */
function zielrechtFrei(welt: Welt, g: Gegner): void {
  if (welt.rechte.ziel === g.nr) welt.rechte.ziel = null;
  g.zielrecht = false;
}

/** Nahkampfrecht und Zielrecht abgeben (Welt 5.7 E-4: beim Umwerfen, Greifen, Werfen und Tod), Ereignis RA:sn. */
function rechteAbgeben(welt: Welt, g: Gegner): void {
  let abgegeben = g.recht !== '';
  if (welt.rechte.l === g.nr) {
    welt.rechte.l = null;
    abgegeben = true;
  }
  if (welt.rechte.r === g.nr) {
    welt.rechte.r = null;
    abgegeben = true;
  }
  g.recht = '';
  if (abgegeben) ereignis(welt, EREIGNIS.RECHT_ABGEGEBEN, g.schluessel);
  zielrechtFrei(welt, g);
}

/** Im Trefferframe Zustand 3, ab dem nächsten Frame 2 (siehe Kopf); ein schon gehaltener Gegner bleibt 2. */
function zustandImTrefferframe(g: Gegner): void {
  if (g.zustand !== ZUSTAND_BODEN) g.zustand = ZUSTAND_REAKTION;
}

/** Bahn beim Tod (Kampf 7): nach Wurf F3, nach Kettenstufe 2 F4b, sonst F4. */
function todesbahn(t: Treffer): BahnArt {
  if (t.code === 'WU' || t.bahn === 'F3') return 'F3';
  if (t.code === 'KT2') return 'F4b';
  return 'F4';
}

/** Slot frei nach dem Tod (Kampf 7): t+79, nach Stufe 2 t+111, nach Wurf t+101. */
function slotFreiNach(bahn: BahnArt): number {
  if (bahn === 'F3') return SLOT_FREI_WURF;
  if (bahn === 'F4b') return SLOT_FREI_STUFE2;
  return SLOT_FREI_TOD;
}

// ===========================================================================
// Reaktionen beginnen und beenden (auch für K1 und K4)
// ===========================================================================

/**
 * GETROFFEN beginnen bzw. neu starten (Kampf 7, E3): Zustand 3 ab h, Stillstand
 * h+1 bis h+8, frei ab h+23; kein Rückstoß, Welt-x bleibt. Ein laufender
 * eigener Angriff ist abgebrochen, das Zielrecht frei; das Nahkampfrecht
 * bleibt (Welt 5.7 E-4).
 */
export function getroffenBeginnen(welt: Welt, g: Gegner): void {
  g.reaktion_h = welt.frame;
  g.uhr = 1;
  modusSetzen(g, 'GETROFFEN');
  g.aktion = 'GETROFFEN';
  g.zustand = ZUSTAND_REAKTION;
  g.phase = '';
  g.anim = { name: 'GETROFFEN', bild: 0, rest: 0 };
  eigenenAngriffAbbrechen(g);
  zielrechtFrei(welt, g);
}

/**
 * UMGEWORFEN beginnen (Kampf 7): Bahn F1, F2 oder F3 in richtung, Zustand 2 ab
 * W+1, nicht treffbar und nicht greifbar bis G−1. Rechte abgeben (E-4).
 */
export function umwerfenBeginnen(welt: Welt, g: Gegner, bahn: BahnArt, richtung: Blick): void {
  g.reaktion_h = welt.frame;
  g.uhr = 1;
  modusSetzen(g, 'UMGEWORFEN');
  g.aktion = 'UMGEWORFEN';
  zustandImTrefferframe(g);
  g.phase = bahn;
  g.liegedauer = 0;
  g.gehalten_von = null;
  g.anim = { name: 'UMGEWORFEN', bild: 0, rest: 0 };
  bahnStarten(g, bahn, richtung);
  eigenenAngriffAbbrechen(g);
  rechteAbgeben(welt, g);
}

/**
 * TOT einleiten (Kampf 7): t = dieser Frame, Bahn F4 (F4b, F3), Zustand 2 ab
 * t+1, nimmt keine Treffer an und trifft nicht, Slot frei in t+79 (t+111,
 * t+101). Auch für K4 (Welt 7.6: Fall des Bosses, Flug von der Figur weg,
 * richtung = vonFigurWeg) und für den Tod ohne Treffer (Eingriff).
 */
export function todEinleiten(welt: Welt, g: Gegner, bahn: BahnArt, richtung: Blick): void {
  g.tod_t = welt.frame;
  g.reaktion_h = welt.frame;
  g.frei_frame = welt.frame + slotFreiNach(bahn);
  g.uhr = 1;
  modusSetzen(g, 'TOT');
  g.aktion = 'TOT';
  zustandImTrefferframe(g);
  g.phase = bahn;
  g.gehalten_von = null;
  g.anim = { name: 'TOT', bild: 0, rest: 0 };
  bahnStarten(g, bahn, richtung);
  eigenenAngriffAbbrechen(g);
  rechteAbgeben(welt, g);
}

/**
 * Reaktion beendet (Kampf 7): Zustand 1, Modus FREI, Aktion STAND, Bahn
 * gelöscht. Die Gegnerlogik wählt im nächsten W4 (Vertrag 6); eine Puppe wird
 * dort wieder PUPPE. Kein Schutz danach (E4).
 */
export function reaktionBeenden(g: Gegner): void {
  g.zustand = ZUSTAND_NORMAL;
  modusSetzen(g, 'FREI');
  g.aktion = 'STAND';
  g.phase = '';
  g.bahn = '';
  g.bahn_frame = 0;
  g.vx = 0;
  g.vh = 0;
  g.ax = 0;
  g.gh = 0;
  g.anim = { name: 'STAND', bild: 0, rest: 0 };
}

/**
 * Liegedauer ab der Ruhe (Kampf 7, P18), gezogen im Frame der Ruhe (Welt
 * 11.2): leicht 32 (nach einem Wurf 16), schwer gleichverteilt 16, 20, …, 44
 * aus g.zufall; Boss: LIEGEN und AUFSTEHEN zusammen 42 bis 70 in
 * Viererschritten (Welt 7.1), hier als Liegedauer ohne die 18 Frames
 * Aufstehen. Ein Fernkämpfer liegt wie ein leichter (Festlegung K2, Lücke).
 * welt.fest['liegedauer'] ersetzt eine Ziehung nach der Ziehung (Welt 11.3).
 */
export function liegedauerZiehen(welt: Welt, g: Gegner): number {
  let dauer: number;
  if (g.rolle === 'schwer') {
    dauer = bereich(g.zufall, LIEGEN_SCHWER_VON, LIEGEN_SCHWER_BIS, LIEGEN_SCHWER_SCHRITT);
  } else if (g.rolle === 'boss') {
    dauer = bereich(g.zufall, BOSS_LIEGEN_VON, BOSS_LIEGEN_BIS, BOSS_ZUFALL_SCHRITT) - AUFSTEHEN_GEGNER;
  } else {
    return g.bahn === 'F3' ? LIEGEN_LEICHT_WURF : LIEGEN_LEICHT;
  }
  const fest = welt.fest['liegedauer'];
  if (fest !== undefined) {
    const n = Number(fest);
    if (!Number.isInteger(n) || n < 1) throw new RangeError(`fest.liegedauer muss eine positive ganze Zahl sein, nicht „${fest}“`);
    dauer = n;
  }
  return dauer;
}

/**
 * Griff (Kampf 7 GEHALTEN, 8.1), Hilfe für K1: Modus GEHALTEN, Zustand 2,
 * gehalten_von; eigener Angriff abgebrochen, Rechte abgegeben (Welt 5.7 E-4).
 * Haltelage, Ereignis G und Haltefrist führt K1.
 */
export function gegnerGreifen(welt: Welt, g: Gegner, von: SlotKey): void {
  modusSetzen(g, 'GEHALTEN');
  g.aktion = 'GEHALTEN';
  g.zustand = ZUSTAND_BODEN;
  g.gehalten_von = von;
  g.phase = '';
  eigenenAngriffAbbrechen(g);
  rechteAbgeben(welt, g);
}

/** Losreißen (Kampf 7, 8.3), Hilfe für K1: frei, Zustand 1, Modus FREI (Logik nach Welt 5.9). Ereignis L schreibt K1. */
export function gegnerLosreissen(g: Gegner): void {
  g.gehalten_von = null;
  reaktionBeenden(g);
}

// ===========================================================================
// KS7: Zielhandler
// ===========================================================================

/**
 * KS7, Zielhandler für Gegner außer dem Boss (Kampf 6.2, 7), in der
 * Reihenfolge von welt.treffer. Setzt t.lp_vorher und t.wirkung (X bei LP < 0,
 * U bei Umwerfen, sonst R; W, wenn der Gegner schon stirbt), schreibt als
 * Erstes das Ereignis T, dann LP, letzter_angreifer (= Urheber),
 * getroffen_frame (Urheber Figur) und die Reaktion. Genau 0 LP: normale
 * Reaktion, der Gegner lebt weiter (K6). Ein gehaltener Gegner bleibt bei
 * einem Treffer ohne Umwerfen gehalten (Kniestoß 1 und 2).
 */
export function gegnerGetroffen(welt: Welt, t: Treffer): void {
  const g = gegnerVon(welt, t.ziel);
  if (g === null || !g.belegt) throw new Error(`gegnerGetroffen: Gegnerslot ${t.ziel} ist frei`);
  t.lp_vorher = g.lp;
  if (g.modus === 'TOT' || g.lp < 0) {
    // Der sterbende Gegner nimmt keine Treffer an (Kampf 7); kommt nur vor,
    // wenn ein anderer Treffer desselben Frames ihn schon getötet hat.
    t.wirkung = 'W';
    ereignisTreffer(welt, t);
    return;
  }
  const lp = g.lp - t.schaden;
  t.wirkung = lp < 0 ? 'X' : t.umwerfen ? 'U' : 'R';
  ereignisTreffer(welt, t);
  g.lp = lp;
  g.letzter_angreifer = t.urheber;
  if (t.urheber === 'f') g.getroffen_frame = welt.frame;
  const richtung = flugrichtung(welt, g, t);
  if (t.wirkung === 'X') {
    todEinleiten(welt, g, todesbahn(t), richtung);
  } else if (t.wirkung === 'U') {
    const bahn: BahnArt = t.bahn === '' ? 'F1' : t.bahn;
    umwerfenBeginnen(welt, g, bahn, richtung);
  } else if (g.modus === 'GEHALTEN') {
    g.reaktion_h = welt.frame;
  } else {
    getroffenBeginnen(welt, g);
  }
}

// ===========================================================================
// KS3: Reaktion fortschreiben
// ===========================================================================

/** GETROFFEN: Stillstand, Zittern nur in der Darstellung, frei ab h+23 (Kampf 7). */
function getroffenSchritt(welt: Welt, g: Gegner): boolean {
  const k = welt.frame - g.reaktion_h;
  g.uhr = k + 1;
  let bild = 0;
  for (const w of REAKTION_ANIMATION) if (k >= w) bild += 1;
  g.anim = { name: 'GETROFFEN', bild, rest: 0 };
  if (k >= REAKTION_DAUER) reaktionBeenden(g);
  return true;
}

/** UMGEWORFEN, LIEGEN, AUFSTEHEN (Kampf 7). */
function bodenSchritt(welt: Welt, g: Gegner): boolean {
  const k = welt.frame - g.reaktion_h;
  g.uhr = k + 1;
  if (k >= 1) g.zustand = ZUSTAND_BODEN;
  if (g.modus === 'UMGEWORFEN') {
    wurfLoslassen(welt, g, k);
    const lage = bahnSchritt(g, k, gegnerBegrenzung(welt, g));
    if (lage === 'ruhe') {
      g.liegedauer = liegedauerZiehen(welt, g);
      g.timer[T_RUHE] = welt.frame;
      modusSetzen(g, 'LIEGEN');
      g.aktion = 'LIEGEN';
      g.phase = '';
      g.anim = { name: 'LIEGEN', bild: 0, rest: 0 };
    }
    return true;
  }
  const r = welt.frame - (g.timer[T_RUHE] ?? welt.frame);
  if (g.modus === 'LIEGEN' && r >= g.liegedauer) {
    modusSetzen(g, 'AUFSTEHEN');
    g.aktion = 'AUFSTEHEN';
    g.anim = { name: 'AUFSTEHEN', bild: 0, rest: 0 };
  }
  if (g.modus === 'AUFSTEHEN' && r >= g.liegedauer + AUFSTEHEN_GEGNER) reaktionBeenden(g);
  return true;
}

/** TOT: Bahn bis zur Ruhe, Slot frei mit Ereignis FR:sn (Kampf 7). */
function todSchritt(welt: Welt, g: Gegner): boolean {
  const k = welt.frame - g.tod_t;
  g.uhr = k + 1;
  if (welt.frame >= g.frei_frame) {
    const slot = g.schluessel;
    freigeben(g);
    ereignis(welt, EREIGNIS.FREI, slot);
    return true;
  }
  if (k >= 1) g.zustand = ZUSTAND_BODEN;
  wurfLoslassen(welt, g, k);
  bahnSchritt(g, k, gegnerBegrenzung(welt, g));
  return true;
}

/**
 * KS3 für Gegner außer dem Boss: läuft eine Reaktion (GETROFFEN, UMGEWORFEN,
 * LIEGEN, AUFSTEHEN, TOT, GEHALTEN), schreibt sie fort und gibt true zurück;
 * welt.ts bewegt den Gegner dann in diesem Frame nicht weiter. Auch im Frame,
 * in dem die Reaktion endet (h+23, G), gibt sie true zurück: Bewegung erst ab
 * dem nächsten Frame (mechanik „Trefferreaktion der Gegner“: ab h+24 bzw. G+1).
 * LP < 0 ohne TOT (Eingriff) ist der Tod in diesem Frame, Flug von der Figur weg.
 */
export function reaktionSchritt(welt: Welt, g: Gegner): boolean {
  if (!g.belegt) return false;
  if (g.lp < 0 && g.modus !== 'TOT') {
    todEinleiten(welt, g, 'F4', vonFigurWeg(welt, g));
    return true;
  }
  switch (g.modus) {
    case 'GETROFFEN':
      return getroffenSchritt(welt, g);
    case 'UMGEWORFEN':
    case 'LIEGEN':
    case 'AUFSTEHEN':
      return bodenSchritt(welt, g);
    case 'TOT':
      return todSchritt(welt, g);
    case 'GEHALTEN':
      return true;
    default:
      return istReaktion(g.modus);
  }
}

// ===========================================================================
// W4: Puppe
// ===========================================================================

/**
 * W4 für Gegner mit Logik aus (Puppe, Kampf 11.2): steht, schaut in jedem
 * Frame mit Zustand 1 zur Figur. Nach einer Reaktion (FREI) wieder PUPPE.
 * In einer Reaktion dreht sie sich nicht um (Kampf 5.2).
 */
export function puppeEntscheidung(welt: Welt, g: Gegner): void {
  if (g.zustand !== ZUSTAND_NORMAL) return;
  if (g.modus === 'FREI') {
    modusSetzen(g, 'PUPPE');
    g.aktion = 'STAND';
  }
  g.blick = blickZu(g, welt.figur);
}
