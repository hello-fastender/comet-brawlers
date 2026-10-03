// Reaktionen und eigene Bewegungen des Bosses Ballast (K4) nach
// docs/spezifikation-welt.md, 7.1 und 7.4: GETROFFEN (23 Frames, E3, E19),
// UMGEWORFEN mit Flug, LIEGEN und AUFSTEHEN (G = W+97 bis W+125, ohne Schutz
// danach, E4), Wurf, Explosion, TAUMELN nach dem Spezialangriff, Stoß RZ
// (SA5), TOT; dazu die Rückkehr in BEREIT.
//
// Zustand wie bei K2 (gegner/reaktion.ts, Kopf): Der Trefferframe zeigt die
// Reaktion schon; Zustand 2 gilt beim Umwerfen und beim Tod ab W+1 bzw. t+1,
// im Trefferframe steht 3 (Kampf 7: „2 von W+1 bis G−1“, „2 ab t+1“).

import type { Blick, Gegner, Treffer } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Welt } from '../welt.ts';
import { ZUSTAND_BODEN, ZUSTAND_NORMAL, ZUSTAND_REAKTION, modusSetzen } from '../entitaeten.ts';
import { add, ausGanz, minF, mulGanz, sub } from '../festkomma.ts';
import { bereich } from '../zufall.ts';
import {
  AUFSTEHEN_GEGNER,
  BOSS_AUSROLLEN_V,
  BOSS_FREI_EXPLOSION_BIS,
  BOSS_FREI_EXPLOSION_VON,
  BOSS_FREI_WURF_BIS,
  BOSS_FREI_WURF_VON,
  BOSS_LIEGEN_BIS,
  BOSS_LIEGEN_VON,
  BOSS_TAUMELN_DAUER,
  BOSS_TAUMELN_WEG,
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
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  REAKTION_DAUER,
  RZ_DAUER,
  RZ_NICHT_TREFFBAR,
  RZ_SCHNELL_V,
  RZ_WEG,
  WURF_LOSLASSEN,
  WURF_LOSLASS_HOEHE,
  WURF_LOSLASS_X,
  WURF_TREFFER,
} from '../werte.ts';
import {
  BAHN_EXPLOSION,
  BAHN_KNIE,
  BAHN_TOD,
  BAHN_UMWERFEN,
  BAHN_WURF,
  bossSchritt,
  eigenenAngriffBeenden,
  festZahl,
  lies,
  setze,
  wegVonFigur,
} from './boss_zustand.ts';

// ===========================================================================
// Rückkehr
// ===========================================================================

/** Ist der Boss nach einem Stoß noch nicht treffbar (Welt 7.4, SA5: bis 62 Frames nach dessen Beginn)? */
export function nachStossUnverwundbar(welt: Welt, g: Gegner): boolean {
  const s = lies(g, 'stoss_beginn');
  return s > 0 && welt.frame < s + RZ_NICHT_TREFFBAR;
}

/** BEREIT (Welt 7.1): steht oder geht, wartet auf den nächsten Angriff; Zustand 1, außer nach einem Stoß (SA5). */
export function bereitWerden(welt: Welt, g: Gegner): void {
  modusSetzen(g, 'BEREIT');
  g.aktion = 'STAND';
  g.phase = '';
  g.angriff_code = '';
  g.bahn = '';
  g.zustand = nachStossUnverwundbar(welt, g) ? ZUSTAND_BODEN : ZUSTAND_NORMAL;
  setze(g, 'art', 0);
  setze(g, 'geh_x', 0);
  setze(g, 'geh_z', 0);
}

/** Reaktion beendet (wie K2 reaktionBeenden): Zustand 1, Modus FREI; die Logik wählt im nächsten W4 (Vertrag 6). */
function reaktionBeenden(g: Gegner): void {
  g.zustand = ZUSTAND_NORMAL;
  modusSetzen(g, 'FREI');
  g.aktion = 'STAND';
  g.phase = '';
  g.bahn = '';
  g.vx = 0;
  g.vh = 0;
  g.ax = 0;
  g.gh = 0;
}

// ===========================================================================
// GETROFFEN (Welt 7.1; Kampf 7, E3, E19; SA3)
// ===========================================================================

/** GETROFFEN beginnen bzw. neu starten: Zustand 3 von h bis h+22, Stillstand, kein Rückstoß; eigener Angriff abgebrochen. */
export function getroffenBeginnen(welt: Welt, g: Gegner): void {
  eigenenAngriffBeenden(g);
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'GETROFFEN');
  g.aktion = 'GETROFFEN';
  g.zustand = ZUSTAND_REAKTION;
  g.phase = '';
  g.angriff_code = '';
  setze(g, 'wahl', 0);
}

/**
 * KS3 in GETROFFEN: frei ab h+23 (Zustand 1). Ist eine Folge der
 * Super-Armor offen, bleibt der Boss bis zu ihrer Auflösung in W5 in
 * GETROFFEN (SA3) und handelt nicht; sonst Modus FREI, BEREIT ab h+24.
 */
export function getroffenSchritt(welt: Welt, g: Gegner): void {
  if (welt.frame - g.reaktion_h < REAKTION_DAUER) return;
  g.zustand = ZUSTAND_NORMAL;
  if (g.folge === 0) reaktionBeenden(g);
}

// ===========================================================================
// Flugbahnen (Kampf 5.7; Welt 7.1)
// ===========================================================================
//
// HINWEIS: Die Flugbahn ist hier nach Kampf 5.7 und Welt 7.1 selbst
// gerechnet, bis K2 die Hilfsfunktion in gegner/reaktion.ts fertig anbietet
// (bahnStarten, bahnSchritt mit eigenen BahnDaten; Boss: boden_vx = 2 px/Frame).

/** Daten einer Bahn des Bosses, Frames relativ zum Treffer W (Wurf: W = E+1). */
interface BossBahn {
  /** Stillstand W+1 bis W+stillstand, erster Bahnframe W+stillstand+1 */
  stillstand: number;
  vx: Fest;
  ax: Fest;
  vh: Fest;
  gh: Fest;
  /** Höhe im Stillstand (F2: 16 px); null = die aktuelle Höhe bleibt (Treffer in der Luft wie P15) */
  start_h: Fest | null;
  /** Frames vom Bodenkontakt bis zur Ruhe */
  nach_boden: number;
  /** x je Frame nach dem Bodenkontakt: null = vx läuft weiter (Kampf 5.7) */
  boden_vx: Fest | null;
}

/** Wurf: losgelassen in E+22, also W+21 (Kampf 8.4). */
const WURF_LOSLASSEN_K = WURF_LOSLASSEN - WURF_TREFFER;

function bahnDaten(art: number): BossBahn {
  switch (art) {
    case BAHN_KNIE:
      // F2 aus 16 px Höhe; Auslauf wie beim Umwerfen (Festlegung K4)
      return { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: F2_START_HOEHE, nach_boden: F2_RUHE - F2_BODEN, boden_vx: BOSS_AUSROLLEN_V };
    case BAHN_WURF:
      // F3: erster Bahnframe E+23 = W+22, Ruhe E+71
      return { stillstand: F3_ERSTER - WURF_TREFFER - 1, vx: F3_VX, ax: F3_AX, vh: F3_VH, gh: F3_GH, start_h: null, nach_boden: F3_RUHE - F3_BODEN, boden_vx: null };
    case BAHN_EXPLOSION:
      // Flug 109,25 px (Welt 7.1, BOSS_EXPLOSION_WEG): F1 bis zum Bodenkontakt, kein Auslauf
      return { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: 0, boden_vx: 0 };
    case BAHN_TOD:
      return { stillstand: F4_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F4_RUHE - F4_BODEN, boden_vx: null };
    default:
      // Umwerfen: F1 bis zum Bodenkontakt (W+46, 109,25 px), dann 2 px/Frame bis zur Ruhe in W+55 (127,25 px)
      return { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F1_RUHE - F1_BODEN, boden_vx: BOSS_AUSROLLEN_V };
  }
}

function bahnStarten(welt: Welt, g: Gegner, art: number, richtung: Blick): void {
  const d = bahnDaten(art);
  setze(g, 'w', welt.frame);
  setze(g, 'bahn_art', art);
  setze(g, 'kontakt', 0);
  setze(g, 'ruhe', 0);
  g.bahn = art === BAHN_KNIE ? 'F2' : art === BAHN_WURF ? 'F3' : art === BAHN_TOD ? 'F4' : 'F1';
  g.bahn_richtung = richtung;
  g.bahn_frame = 0;
  g.bahn_start_x = g.x;
  g.vx = d.vx;
  g.ax = d.ax;
  g.vh = d.vh;
  g.gh = d.gh;
}

/**
 * Ein Frame der Bahn (Kampf 5.7): Stillstand, dann je Bahnframe x += vx ·
 * Richtung, vx −= ax; h += vh, vh −= gh; h ≤ 0 ist der Bodenkontakt. Danach
 * läuft x bis zur Ruhe weiter. x stoppt an Wänden und am Arenarand.
 * Rückgabe: true im Frame, in dem die Ruhe erreicht ist.
 */
function bahnSchritt(welt: Welt, g: Gegner): boolean {
  const art = lies(g, 'bahn_art');
  const d = bahnDaten(art);
  const k = welt.frame - lies(g, 'w');
  if (lies(g, 'ruhe') > 0) return false;
  if (art === BAHN_WURF && k === WURF_LOSLASSEN_K) {
    // Kampf 8.4, P19: losgelassen 13 px vor bzw. hinter der Figur in 59 px Höhe, in ihrer Tiefe
    g.x = add(welt.figur.x, mulGanz(ausGanz(WURF_LOSLASS_X), g.bahn_richtung));
    g.z = welt.figur.z;
    g.h = ausGanz(WURF_LOSLASS_HOEHE);
  }
  if (k <= d.stillstand) {
    if (k >= 1 && d.start_h !== null) g.h = d.start_h;
    return false;
  }
  const kontakt = lies(g, 'kontakt');
  g.bahn_frame += 1;
  if (kontakt === 0) {
    bossSchritt(welt, g, mulGanz(g.vx, g.bahn_richtung), 0);
    g.vx = sub(g.vx, g.ax);
    g.h = add(g.h, g.vh);
    g.vh = sub(g.vh, g.gh);
    if (g.h > 0) return false;
    g.h = 0;
    setze(g, 'kontakt', welt.frame);
    if (d.nach_boden > 0) return false;
  } else {
    const v = d.boden_vx ?? g.vx;
    if (v > 0) bossSchritt(welt, g, mulGanz(v, g.bahn_richtung), 0);
    if (d.boden_vx === null) g.vx = sub(g.vx, g.ax);
    if (welt.frame - kontakt < d.nach_boden) return false;
  }
  setze(g, 'ruhe', welt.frame);
  return true;
}

// ===========================================================================
// UMGEWORFEN, LIEGEN, AUFSTEHEN (Welt 7.1)
// ===========================================================================

/**
 * Umwerfen beginnen (Welt 7.1, SA1): Bahn nach dem Treffer (Kettenstufe 4,
 * Sprung-, Sprint- und Sprint-Sprungangriff, geworfener Gegner, Landung:
 * F1 mit Ruhe bei 127,25 px; dritter Kniestoß F2; Wurf F3; Explosion F1 bis
 * zum Bodenkontakt). Frei nach dem Wurf 116 bis 144, nach der Explosion 132
 * bis 152 Frames ab dem Treffer, hier gezogen (Welt 11.2); nach den übrigen
 * zieht die Ruhe 42 bis 70 Frames für Liegen und Aufstehen.
 */
export function umwerfenBeginnen(welt: Welt, g: Gegner, t: Treffer): void {
  eigenenAngriffBeenden(g);
  setze(g, 'wahl', 0);
  setze(g, 'stoss_offen', 0);
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'UMGEWORFEN');
  g.aktion = 'UMGEWORFEN';
  g.zustand = ZUSTAND_REAKTION;
  g.angriff_code = '';
  g.liegedauer = 0;
  g.gehalten_von = null;
  let art = BAHN_UMWERFEN;
  if (t.code === 'RX') art = BAHN_EXPLOSION;
  else if (t.code === 'WU' || t.bahn === 'F3') art = BAHN_WURF;
  else if (t.bahn === 'F2') art = BAHN_KNIE;
  bahnStarten(welt, g, art, t.richtung);
  g.phase = g.bahn;
  setze(g, 'g', 0);
  if (art === BAHN_WURF) {
    let frei = bereich(g.zufall, BOSS_FREI_WURF_VON, BOSS_FREI_WURF_BIS, BOSS_ZUFALL_SCHRITT);
    frei = festZahl(welt, 'boss_frei_wurf', BOSS_FREI_WURF_VON, BOSS_FREI_WURF_BIS) ?? frei;
    setze(g, 'g', welt.frame + frei);
  } else if (art === BAHN_EXPLOSION) {
    let frei = bereich(g.zufall, BOSS_FREI_EXPLOSION_VON, BOSS_FREI_EXPLOSION_BIS, BOSS_ZUFALL_SCHRITT);
    frei = festZahl(welt, 'boss_frei_explosion', BOSS_FREI_EXPLOSION_VON, BOSS_FREI_EXPLOSION_BIS) ?? frei;
    setze(g, 'g', welt.frame + frei);
  }
}

/** KS3 in UMGEWORFEN, LIEGEN, AUFSTEHEN: Bahn bis zur Ruhe, Liegen, Aufstehen 18 Frames, frei in G (Zustand 1, E4). */
export function umwerfenSchritt(welt: Welt, g: Gegner): void {
  if (g.modus === 'UMGEWORFEN') {
    g.zustand = ZUSTAND_BODEN;
    if (!bahnSchritt(welt, g)) return;
    // Ruhe erreicht
    const art = lies(g, 'bahn_art');
    if (lies(g, 'g') === 0) {
      let dauer = bereich(g.zufall, BOSS_LIEGEN_VON, BOSS_LIEGEN_BIS, BOSS_ZUFALL_SCHRITT);
      dauer = festZahl(welt, 'boss_liegen', BOSS_LIEGEN_VON, BOSS_LIEGEN_BIS) ?? dauer;
      setze(g, 'g', welt.frame + dauer);
    }
    g.liegedauer = lies(g, 'g') - welt.frame - AUFSTEHEN_GEGNER;
    modusSetzen(g, 'LIEGEN');
    g.aktion = 'LIEGEN';
    g.phase = art === BAHN_EXPLOSION ? 'RX' : g.bahn;
  }
  const frei = lies(g, 'g');
  if (welt.frame >= frei) {
    reaktionBeenden(g);
    return;
  }
  if (g.modus === 'LIEGEN' && welt.frame >= frei - AUFSTEHEN_GEGNER) {
    modusSetzen(g, 'AUFSTEHEN');
    g.aktion = 'AUFSTEHEN';
  }
}

// ===========================================================================
// TOT (Welt 7.4 SA6, 7.6; Kampf 7)
// ===========================================================================

/** Tod des Bosses in diesem Frame t (SA6): Bahn F4 in richtung; die Folge zählt (alle Abzüge bleiben). */
export function bossTotBeginnen(welt: Welt, g: Gegner, richtung: Blick): void {
  eigenenAngriffBeenden(g);
  setze(g, 'wahl', 0);
  setze(g, 'stoss_offen', 0);
  g.folge = 0;
  g.lp_folge = 0;
  setze(g, 'sa_faellig', 0);
  g.tod_t = welt.frame;
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'TOT');
  g.aktion = 'TOT';
  g.zustand = ZUSTAND_REAKTION;
  g.angriff_code = '';
  g.gehalten_von = null;
  bahnStarten(welt, g, BAHN_TOD, richtung);
  g.phase = g.bahn;
}

/**
 * KS3 in TOT: Bahn F4 bis zur Ruhe (t+49). Der Slot des Bosses bleibt bis zum
 * Ende der Scheibe belegt (Festlegung K4, wie im Vorbild: frei erst nach dem
 * Stagewechsel, mechanik „Boss“).
 */
export function todSchritt(welt: Welt, g: Gegner): void {
  if (welt.frame > g.tod_t) g.zustand = ZUSTAND_BODEN;
  bahnSchritt(welt, g);
}

// ===========================================================================
// TAUMELN nach dem Spezialangriff (Welt 7.1)
// ===========================================================================

/**
 * TAUMELN beginnen: 78 Frames (h bis h+77) über 135,125 px von der Figur weg,
 * kein Liegen, danach (G = h+78) sofort treffbar. Im Taumeln nicht treffbar
 * (Zustand 2 ab h+1, Festlegung K4). Verlauf wie der x-Verlauf von F1
 * (Stillstand h+1 bis h+8, dann 2,875 px/Frame bis 135,125 px; Festlegung K4).
 */
export function taumelnBeginnen(welt: Welt, g: Gegner, t: Treffer): void {
  eigenenAngriffBeenden(g);
  setze(g, 'wahl', 0);
  setze(g, 'stoss_offen', 0);
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'TAUMELN');
  g.aktion = 'TAUMELN';
  g.zustand = ZUSTAND_REAKTION;
  g.angriff_code = '';
  g.phase = '';
  g.bahn_richtung = t.richtung;
  setze(g, 'taumeln_weg', 0);
}

/** KS3 in TAUMELN. */
export function taumelnSchritt(welt: Welt, g: Gegner): void {
  const n = welt.frame - g.reaktion_h;
  if (n >= BOSS_TAUMELN_DAUER) {
    reaktionBeenden(g);
    return;
  }
  g.zustand = ZUSTAND_BODEN;
  if (n <= F1_STILLSTAND) return;
  const weg = lies(g, 'taumeln_weg');
  if (weg >= BOSS_TAUMELN_WEG) return;
  const v = minF(F1_VX, sub(BOSS_TAUMELN_WEG, weg));
  setze(g, 'taumeln_weg', add(weg, v));
  bossSchritt(welt, g, mulGanz(v, g.bahn_richtung), 0);
}

// ===========================================================================
// Stoß RZ (Welt 7.3, 7.4 SA5)
// ===========================================================================

/**
 * Stoß RZ beginnen (in W5): 54 Frames (S bis S+53), 48 px von der Figur weg,
 * in den ersten 16 Frames nach S je 3 px (S+1 bis S+16; Verlauf S2), ohne
 * aktive Frames und ohne Schaden, nicht treffbar bis S+61 (62 Frames).
 */
export function stossBeginnen(welt: Welt, g: Gegner): void {
  eigenenAngriffBeenden(g);
  setze(g, 'stoss_offen', 0);
  setze(g, 'stoss_beginn', welt.frame);
  setze(g, 'stoss_richtung', wegVonFigur(welt, g));
  setze(g, 'stoss_weg', 0);
  modusSetzen(g, 'STOSS');
  g.aktion = 'STOSS';
  g.zustand = ZUSTAND_BODEN;
  g.angriff_code = 'RZ';
  g.schaden = 0;
  g.phase = '';
}

/** KS3 im Stoß: Rückzug. */
export function stossSchritt(welt: Welt, g: Gegner): void {
  const weg = lies(g, 'stoss_weg');
  if (weg >= ausGanz(RZ_WEG)) return;
  const v = minF(RZ_SCHNELL_V, sub(ausGanz(RZ_WEG), weg));
  setze(g, 'stoss_weg', add(weg, v));
  const r: Blick = lies(g, 'stoss_richtung') < 0 ? -1 : 1;
  bossSchritt(welt, g, mulGanz(v, r), 0);
}

/** Endet der Stoß in diesem Frame (S+54: BEREIT)? */
export function stossVorbei(welt: Welt, g: Gegner): boolean {
  return welt.frame >= lies(g, 'stoss_beginn') + RZ_DAUER;
}
