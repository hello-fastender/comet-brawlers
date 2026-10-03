// Reaktionen und eigene Bewegungen des Bosses Ballast (K4) nach
// docs/spezifikation-welt.md, 7.1 und 7.4: GETROFFEN (23 Frames, E3, E19),
// UMGEWORFEN mit Flug, LIEGEN und AUFSTEHEN (G = W+97 bis W+125, ohne Schutz
// danach, E4), Wurf, Explosion, TAUMELN nach dem Spezialangriff, Stoß RZ
// (SA5), TOT; dazu die Rückkehr in BEREIT.
//
// Die Flugbahnen rechnet bahn.ts (bahnStarten, bahnSchritt nach Kampf 5.7)
// mit den Bahndaten des Bosses (BOSS_BAHNEN); das Ende einer Reaktion ist
// gegner/reaktion.ts reaktionBeenden. Die Namen der Bossfunktionen
// tragen das Präfix boss, damit sie nicht mit den gleichartigen Funktionen
// der übrigen Gegner (reaktion.ts) verwechselt werden.
//
// Zustand wie bei K2 (gegner/reaktion.ts, Kopf): Der Trefferframe zeigt die
// Reaktion schon; Zustand 2 gilt beim Umwerfen und beim Tod ab W+1 bzw. t+1,
// im Trefferframe steht 3 (Kampf 7: „2 von W+1 bis G−1“, „2 ab t+1“).

import type { Bahn, Blick, BossBahn, Gegner, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import type { BahnDaten } from '../bahn.ts';
import { ZUSTAND_BODEN, ZUSTAND_NORMAL, ZUSTAND_REAKTION, modusSetzen } from '../entitaeten.ts';
import { bahnSchritt, bahnStarten, wurfLoslassen } from '../bahn.ts';
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
  REAKTION_DAUER,
  RZ_DAUER,
  RZ_NICHT_TREFFBAR,
  RZ_SCHNELL_V,
  RZ_WEG,
} from '../werte.ts';
import { bossBegrenzung, bossSchritt, eigenenAngriffBeenden, festZahl } from './boss_zustand.ts';
import { reaktionBeenden, vonFigurWeg } from './reaktion.ts';

// ===========================================================================
// Rückkehr
// ===========================================================================

/** Ist der Boss nach einem Stoß noch nicht treffbar (Welt 7.4, SA5: bis 62 Frames nach dessen Beginn)? */
export function nachStossUnverwundbar(welt: Welt, g: Gegner): boolean {
  const s = g.boss.stoss_beginn;
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
  g.boss.bahn = '';
  g.boss.art = '';
  g.boss.geh_x = 0;
  g.boss.geh_z = 0;
}

// ===========================================================================
// GETROFFEN (Welt 7.1; Kampf 7, E3, E19; SA3)
// ===========================================================================

/** GETROFFEN beginnen bzw. neu starten: Zustand 3 von h bis h+22, Stillstand, kein Rückstoß; eigener Angriff abgebrochen. */
export function bossGetroffenBeginnen(welt: Welt, g: Gegner): void {
  eigenenAngriffBeenden(g);
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'GETROFFEN');
  g.aktion = 'GETROFFEN';
  g.zustand = ZUSTAND_REAKTION;
  g.phase = '';
  g.angriff_code = '';
  g.boss.wahl = '';
}

/**
 * KS3 in GETROFFEN: frei ab h+23 (Zustand 1). Ist eine Folge der
 * Super-Armor offen, bleibt der Boss bis zu ihrer Auflösung in W5 in
 * GETROFFEN (SA3) und handelt nicht; sonst Modus FREI, BEREIT ab h+24.
 */
export function bossGetroffenSchritt(welt: Welt, g: Gegner): void {
  if (welt.frame - g.reaktion_h < REAKTION_DAUER) return;
  g.zustand = ZUSTAND_NORMAL;
  if (g.folge === 0) reaktionBeenden(g);
}

// ===========================================================================
// Flugbahnen (Kampf 5.7; Welt 7.1)
// ===========================================================================

/** Bahn nach Kampf 5.7 und eigene Bahndaten des Bosses (null: die Daten der Bahn aus Kampf 5.7 unverändert). */
interface BossBahnSatz {
  bahn: Exclude<Bahn, ''>;
  daten: BahnDaten | null;
}

/**
 * Bahnen des Bosses (Welt 7.1). Frames relativ zum Treffer W (Wurf: W =
 * E+1). Umwerfen und dritter Kniestoß laufen nach dem Bodenkontakt mit
 * 2 px/Frame bis zur Ruhe aus (Umwerfen: Ruhe in W+55 bei 127,25 px;
 * Kniestoß: Festlegung K4); die Explosion endet mit dem Bodenkontakt (Flug
 * 109,25 px); Wurf und Tod laufen wie F3 und F4.
 */
const BOSS_BAHNEN: Readonly<Record<Exclude<BossBahn, ''>, BossBahnSatz>> = {
  umwerfen: {
    bahn: 'F1',
    daten: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: F1_RUHE - F1_BODEN, boden_vx: BOSS_AUSROLLEN_V },
  },
  knie: {
    bahn: 'F2',
    daten: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: F2_START_HOEHE, nach_boden: F2_RUHE - F2_BODEN, boden_vx: BOSS_AUSROLLEN_V },
  },
  wurf: { bahn: 'F3', daten: null },
  explosion: {
    bahn: 'F1',
    daten: { stillstand: F1_STILLSTAND, vx: F1_VX, ax: F1_AX, vh: F1_VH, gh: F1_GH, start_h: null, nach_boden: 0, boden_vx: 0 },
  },
  tod: { bahn: 'F4', daten: null },
};

/** Satz der laufenden Bahn (wirft ohne Bahn). */
function bahnSatz(g: Gegner): BossBahnSatz {
  const art = g.boss.bahn;
  if (art === '') throw new Error(`Boss ${g.schluessel}: Bahnschritt ohne Bahn`);
  return BOSS_BAHNEN[art];
}

/** Bahn beginnen (Kampf 5.7) am Trefferort; W = g.reaktion_h. */
function bossBahnStarten(g: Gegner, art: Exclude<BossBahn, ''>, richtung: Blick): void {
  g.boss.bahn = art;
  bahnStarten(g, BOSS_BAHNEN[art].bahn, richtung);
}

/**
 * Ein Frame der Bahn (Kampf 5.7, bahn.ts bahnSchritt); x stoppt an Wänden,
 * Hindernissen und am Arenarand (bossBegrenzung). Beim Wurf in W+21
 * losgelassen 13 px vor bzw. hinter der Figur in 59 px Höhe (Kampf 8.4, P19);
 * die Tiefe bleibt die der Haltelage (bahn.ts wurfLoslassen, wie bei den
 * übrigen Gegnern).
 * Rückgabe: true im Frame, in dem die Ruhe erreicht ist, und danach.
 */
function bossBahnSchritt(welt: Welt, g: Gegner): boolean {
  const satz = bahnSatz(g);
  const k = welt.frame - g.reaktion_h;
  wurfLoslassen(welt, g, k);
  return bahnSchritt(g, k, bossBegrenzung(welt), satz.daten) === 'ruhe';
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
export function bossUmwerfenBeginnen(welt: Welt, g: Gegner, t: Treffer): void {
  eigenenAngriffBeenden(g);
  g.boss.wahl = '';
  g.boss.stoss_offen = false;
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'UMGEWORFEN');
  g.aktion = 'UMGEWORFEN';
  g.zustand = ZUSTAND_REAKTION;
  g.angriff_code = '';
  g.liegedauer = 0;
  g.gehalten_von = null;
  let art: Exclude<BossBahn, ''> = 'umwerfen';
  if (t.code === 'RX') art = 'explosion';
  else if (t.code === 'WU' || t.bahn === 'F3') art = 'wurf';
  else if (t.bahn === 'F2') art = 'knie';
  bossBahnStarten(g, art, t.richtung);
  g.phase = g.bahn;
  g.boss.frei_ab = 0;
  if (art === 'wurf') {
    let frei = bereich(g.zufall, BOSS_FREI_WURF_VON, BOSS_FREI_WURF_BIS, BOSS_ZUFALL_SCHRITT);
    frei = festZahl(welt, 'boss_frei_wurf', BOSS_FREI_WURF_VON, BOSS_FREI_WURF_BIS) ?? frei;
    g.boss.frei_ab = welt.frame + frei;
  } else if (art === 'explosion') {
    let frei = bereich(g.zufall, BOSS_FREI_EXPLOSION_VON, BOSS_FREI_EXPLOSION_BIS, BOSS_ZUFALL_SCHRITT);
    frei = festZahl(welt, 'boss_frei_explosion', BOSS_FREI_EXPLOSION_VON, BOSS_FREI_EXPLOSION_BIS) ?? frei;
    g.boss.frei_ab = welt.frame + frei;
  }
}

/** KS3 in UMGEWORFEN, LIEGEN, AUFSTEHEN: Bahn bis zur Ruhe, Liegen, Aufstehen 18 Frames, frei in G (Zustand 1, E4). */
export function bossUmwerfenSchritt(welt: Welt, g: Gegner): void {
  if (g.modus === 'UMGEWORFEN') {
    g.zustand = ZUSTAND_BODEN;
    if (!bossBahnSchritt(welt, g)) return;
    // Ruhe erreicht
    if (g.boss.frei_ab === 0) {
      let dauer = bereich(g.zufall, BOSS_LIEGEN_VON, BOSS_LIEGEN_BIS, BOSS_ZUFALL_SCHRITT);
      dauer = festZahl(welt, 'boss_liegen', BOSS_LIEGEN_VON, BOSS_LIEGEN_BIS) ?? dauer;
      g.boss.frei_ab = welt.frame + dauer;
    }
    g.liegedauer = g.boss.frei_ab - welt.frame - AUFSTEHEN_GEGNER;
    modusSetzen(g, 'LIEGEN');
    g.aktion = 'LIEGEN';
    g.phase = g.boss.bahn === 'explosion' ? 'RX' : g.bahn;
  }
  const frei = g.boss.frei_ab;
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
  g.boss.wahl = '';
  g.boss.stoss_offen = false;
  g.folge = 0;
  g.lp_folge = 0;
  g.boss.sa_faellig = 0;
  g.tod_t = welt.frame;
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'TOT');
  g.aktion = 'TOT';
  g.zustand = ZUSTAND_REAKTION;
  g.angriff_code = '';
  g.gehalten_von = null;
  bossBahnStarten(g, 'tod', richtung);
  g.phase = g.bahn;
}

/**
 * KS3 in TOT: Bahn F4 bis zur Ruhe (t+49). Der Slot des Bosses bleibt bis zum
 * Ende der Scheibe belegt (Festlegung K4, wie im Vorbild: frei erst nach dem
 * Stagewechsel, mechanik „Boss“).
 */
export function bossTodSchritt(welt: Welt, g: Gegner): void {
  if (welt.frame > g.tod_t) g.zustand = ZUSTAND_BODEN;
  bossBahnSchritt(welt, g);
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
  g.boss.wahl = '';
  g.boss.stoss_offen = false;
  g.reaktion_h = welt.frame;
  modusSetzen(g, 'TAUMELN');
  g.aktion = 'TAUMELN';
  g.zustand = ZUSTAND_REAKTION;
  g.angriff_code = '';
  g.phase = '';
  g.bahn_richtung = t.richtung;
  g.boss.taumeln_weg = 0;
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
  const weg = g.boss.taumeln_weg;
  if (weg >= BOSS_TAUMELN_WEG) return;
  const v = minF(F1_VX, sub(BOSS_TAUMELN_WEG, weg));
  g.boss.taumeln_weg = add(weg, v);
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
  g.boss.stoss_offen = false;
  g.boss.stoss_beginn = welt.frame;
  g.boss.stoss_richtung = vonFigurWeg(welt, g);
  g.boss.stoss_weg = 0;
  modusSetzen(g, 'STOSS');
  g.aktion = 'STOSS';
  g.zustand = ZUSTAND_BODEN;
  g.angriff_code = 'RZ';
  g.schaden = 0;
  g.phase = '';
}

/** KS3 im Stoß: Rückzug. */
export function stossSchritt(welt: Welt, g: Gegner): void {
  const weg = g.boss.stoss_weg;
  if (weg >= ausGanz(RZ_WEG)) return;
  const v = minF(RZ_SCHNELL_V, sub(ausGanz(RZ_WEG), weg));
  g.boss.stoss_weg = add(weg, v);
  bossSchritt(welt, g, mulGanz(v, g.boss.stoss_richtung), 0);
}

/** Endet der Stoß in diesem Frame (S+54: BEREIT)? */
export function stossVorbei(welt: Welt, g: Gegner): boolean {
  return welt.frame >= g.boss.stoss_beginn + RZ_DAUER;
}
