// Zustandsautomat der Spielfigur (K1) nach docs/spezifikation-kampf.md,
// Abschnitt 4 (4.1 Grundregeln, 4.2 Vorrang der Drücke, 4.3 Zustände, 4.4
// Bewegung im Sprung), Kette 5.6, Griff und Wurf 8.2 bis 8.4, Sprint 9.1 bis
// 9.3, Spezialangriff 9.4, Waffen 10.
//
// Zeitregel (Kampf 2.1, 4.3): Der Schritt f wertet T(f−1) aus (Druckframe
// q = f − 1). Eine Aktion, die in f beginnt, hat uhr 1 in f. „Drücke ab X“
// heißt q ≥ X; die Schwellen stehen in figur.druecke_ab, figur.richtung_ab
// und (nur Tiefe) figur.tiefe_ab. Endet eine Aktion in X mit STAND, nimmt
// die Figur Drücke ab X an (T(X) wirkt in X+1).

import type { FigurPhase, Objekt, SprungVariante, Tipp, Treffer } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Tasten } from '../tasten.ts';
import type { Welt } from '../welt.ts';
import { add, ausGanz, divGanz, mul, mulGanz, sub } from '../festkomma.ts';
import { EREIGNIS, ereignis, pfeil } from '../ereignisse.ts';
import { TASTE_A, TASTE_L, TASTE_R, TASTE_S, hat, richtungX, richtungZ, richtungsteil } from '../tasten.ts';
import {
  AUSFALLSCHRITT,
  FRAME_NIE,
  GETROFFEN_DAUER,
  GRIFFSPERRE,
  HALTEFRIST,
  KETTE1_DRUECKE_AB,
  KETTE1_RICHTUNG_AB,
  KETTE1_STAND_AB,
  KETTE1_TIEFE_BEWEGUNG_AB,
  KETTE23_DRUECKE_AB,
  KETTE23_RICHTUNG_AB,
  KETTE23_STAND_AB,
  KETTE23_TIEFE_BEWEGUNG_AB,
  KETTE2_LEER_DAUER,
  KETTE2_LEER_DRUECKE_AB,
  KETTE2_LEER_RICHTUNG_AB,
  KETTE3_LEER_DAUER,
  KETTE3_LEER_DRUECKE_AB,
  KETTE3_LEER_RICHTUNG_AB,
  KETTE4_DAUER,
  KETTE4_ZWEITES_FENSTER_BIS,
  KNIESTOSS_DRUECKE_AB,
  KNIESTOSS_GEHALTEN_AB,
  KNIESTOSS_UMWERFEN_NR,
  KOMBO_FENSTER_BIS,
  KOMBO_FENSTER_VON,
  KOMBO_MAX,
  LANDUNG_DAUER,
  LANDUNG_NEUSPRUNG_BIS,
  LAUF_DIAGONAL_X,
  LAUF_DIAGONAL_Z,
  LAUF_X,
  LAUF_Z,
  LEERSCHLAG_DAUER,
  LEERSCHLAG_DRUECKE_AB,
  LEERSCHLAG_RICHTUNG_AB,
  AUFNEHMEN_DAUER,
  RAKETE_ABSCHUSS,
  SPEZIAL_AUS_GETROFFEN_AB,
  SPEZIAL_DAUER,
  SPEZIAL_KOSTEN_NACH,
  SPEZIAL_SCHUTZ_DANACH,
  SPRINTANGRIFF_DAUER,
  SPRINTANGRIFF_RUTSCHEN_AB,
  SPRINTANGRIFF_RUTSCH_ABNAHME,
  SPRINT_DIAGONAL_X_FRAME1,
  SPRINT_DIAGONAL_Z_FRAME1,
  SPRINT_FAKTOR_DIAGONAL_X,
  SPRINT_FAKTOR_DIAGONAL_Z,
  SPRINT_MAX_FRAMES,
  SPRINT_PAUSE_MAX,
  SPRINT_STUFE_FRAMES,
  SPRINT_TIPP_MAX,
  SPRINT_V_START,
  SPRINT_V_STUFE,
  SPRINT_X_FRAME1,
  SPRUNGANGRIFF_HOCH_AKTION_BIS,
  SPRUNG_SCHWERKRAFT,
  SPRUNG_X,
  SPRUNG_Z,
  SS_ERSTER_AKTIV,
  SS_ZWEITER_AKTIV_BIS,
  TREFFERSTOPP,
  WAFFE_DAUER,
  WURF_GEBUNDEN_BIS,
} from '../werte.ts';
import { bodenSchritt, eingriffTodPruefen, figurZustandSetzen, kostenSchritt, neueinstiegSchritt, schutzZaehlen, todSchritt } from '../schaden.ts';
import {
  angriffAktivSetzen,
  ketteFenster,
  ketteInstanz,
  knieInstanz,
  spezialInstanz,
  spezialStufe,
  sprintangriffInstanz,
  sprungangriffInstanz,
  ssInstanz,
  tab,
  wgInstanz,
  wurfInstanz,
} from './angriffe.ts';
import { aktionSetzen, aufsetzen, bewegen, sprungBeginnen, standBeginnen } from './basis.ts';
import { gehaltener, griffBeenden, griffLoesen } from './griff.ts';
import type { Angenommen, Eingang } from './intern.ts';
import { angenommen, eingang, hatRichtung, schwellenSetzen } from './intern.ts';
import { aufnehmenWirkung, gegenstandSuchen, raketeAbschiessen, waffeFallen, waffeWegwerfen } from './waffen.ts';

/** Unterphase der Kettenstufe bzw. des Kniestoßes 1 bis 4 (Kampf 11.3). */
const STUFEN_PHASE: readonly FigurPhase[] = ['1', '2', '3', '4'];

function stufenPhase(n: number): FigurPhase {
  return STUFEN_PHASE[n - 1] ?? '';
}

/** Taste der Blickrichtung. */
function blickTaste(blick: number): Tasten {
  return blick === 1 ? TASTE_R : TASTE_L;
}

// ===========================================================================
// KS1: Doppeltipp-Erkennung (Kampf 9.1, P22)
// ===========================================================================

/**
 * Schreibt die Tipp-Erkennung mit der Richtungsmenge d aus T(f−1) fort. Ein
 * Tipp ist eine ununterbrochene Folge derselben Richtungsmenge mit L oder R;
 * Pause heißt keine Richtung. Gibt true zurück, wenn in diesem Druckframe D2
 * ein Tipp beginnt, der dem vorigen gleicht, der vorige 1 bis 10 Frames
 * dauerte und dazwischen 1 bis 10 Frames ohne Richtung lagen.
 */
export function tippFortschreiben(tipp: Tipp, d: Tasten): boolean {
  if (hat(d, TASTE_L | TASTE_R)) {
    if (d === tipp.lauf) {
      tipp.lauf_dauer += 1;
      return false;
    }
    if (tipp.lauf !== 0) {
      tipp.voriger = tipp.lauf;
      tipp.voriger_dauer = tipp.lauf_dauer;
      tipp.pause_dauer = 0;
    }
    const doppel =
      d === tipp.voriger &&
      tipp.voriger_dauer >= 1 &&
      tipp.voriger_dauer <= SPRINT_TIPP_MAX &&
      tipp.pause_dauer >= 1 &&
      tipp.pause_dauer <= SPRINT_PAUSE_MAX;
    tipp.lauf = d;
    tipp.lauf_dauer = 1;
    return doppel;
  }
  if (tipp.lauf !== 0) {
    tipp.voriger = tipp.lauf;
    tipp.voriger_dauer = tipp.lauf_dauer;
    tipp.lauf = 0;
    tipp.lauf_dauer = 0;
    tipp.pause_dauer = 0;
  }
  if (d === 0) {
    tipp.pause_dauer += 1;
  } else {
    // nur O oder U: keine Pause, der vorige Tipp zählt nicht mehr (P22)
    tipp.pause_dauer = 0;
    tipp.voriger = 0;
    tipp.voriger_dauer = 0;
  }
  return false;
}

/** KS1 (Kampf 2.2): Sprint-Erkennung mit T(f−1) fortschreiben. */
export function figurKs1(welt: Welt): void {
  const f = welt.figur;
  const e = eingang(welt);
  if (tippFortschreiben(f.tipp, richtungsteil(e.t))) f.tipp.erkannt = welt.frame;
}

// ===========================================================================
// 4.2 Vorrang der Drücke
// ===========================================================================

type Ziel = 'SPEZIAL' | 'SPRINTANGRIFF' | 'AUFNEHMEN' | 'WAFFE' | 'SCHLAG' | 'SPRUNG' | 'SPRINTSPRUNG' | 'SPRINT' | 'LAUF';

interface Wahl {
  ziel: Ziel;
  gegenstand: Objekt | null;
}

/**
 * Vorrang der Drücke (Kampf 4.2) auf den angenommenen Drücken. frei: Figur in
 * STAND, LAUF oder SPRINT; im Nachlauf anderer Aktionen (frei = false) gibt
 * es keinen Spezialangriff, kein Aufnehmen und keinen Sprint (9.1, 9.4, 10.1),
 * A gibt dort den Schlag bzw. die nächste Kettenstufe (5.6).
 */
function vorrang(welt: Welt, ein: Angenommen, frei: boolean): Wahl | null {
  const f = welt.figur;
  const imSprint = f.aktion === 'SPRINT';
  const amBoden = (f.aktion === 'STAND' || f.aktion === 'LAUF') && f.h === 0;
  if (frei && ein.a && ein.s && f.lp > 0) return { ziel: 'SPEZIAL', gegenstand: null };
  if (ein.a && imSprint) return { ziel: 'SPRINTANGRIFF', gegenstand: null };
  if (frei && ein.a && amBoden) {
    const o = gegenstandSuchen(welt);
    if (o !== null) return { ziel: 'AUFNEHMEN', gegenstand: o };
  }
  if (ein.a && f.waffe !== '') return { ziel: 'WAFFE', gegenstand: null };
  if (ein.a) return { ziel: 'SCHLAG', gegenstand: null };
  if (ein.s) return { ziel: imSprint ? 'SPRINTSPRUNG' : 'SPRUNG', gegenstand: null };
  if (frei && amBoden && f.tipp.erkannt === welt.frame && hatRichtung(ein.richtung)) return { ziel: 'SPRINT', gegenstand: null };
  if (hatRichtung(ein.richtung)) return { ziel: 'LAUF', gegenstand: null };
  return null;
}

/** Führt die gewählte Aktion aus (Beginn in diesem Frame). */
function starten(welt: Welt, w: Wahl, ein: Angenommen): void {
  switch (w.ziel) {
    case 'SPEZIAL':
      spezialBeginnen(welt);
      return;
    case 'SPRINTANGRIFF':
      sprintangriffBeginnen(welt, ein);
      return;
    case 'AUFNEHMEN':
      if (w.gegenstand !== null) aufnehmenBeginnen(welt, w.gegenstand);
      return;
    case 'WAFFE':
      waffeBeginnen(welt);
      return;
    case 'SCHLAG':
      schlagBeginnen(welt, kettenStufe(welt, ein.q), ein);
      return;
    case 'SPRUNG':
      sprungBeginnen(welt, false, ein.t);
      return;
    case 'SPRINTSPRUNG':
      sprungBeginnen(welt, true, ein.t);
      return;
    case 'SPRINT':
      sprintBeginnen(welt, ein);
      return;
    case 'LAUF':
      laufen(welt, ein.richtung);
      return;
  }
}

// ===========================================================================
// STAND, LAUF, SPRINT (Kampf 4.3, 9.1, 9.2)
// ===========================================================================

/** LAUF (Kampf 4.3): x 1,75, Tiefe 1,0, diagonal 1,25 und 0,75; Blick mit L oder R im ersten Bewegungsframe (4.1). */
function laufen(welt: Welt, richtung: Tasten): void {
  const f = welt.figur;
  const rx = richtungX(richtung);
  const rz = richtungZ(richtung);
  if (f.aktion !== 'LAUF') aktionSetzen(welt, 'LAUF');
  else f.uhr += 1;
  if (rx !== 0) f.blick = rx;
  let vx: Fest = 0;
  let vz: Fest = 0;
  if (rx !== 0 && rz !== 0) {
    vx = LAUF_DIAGONAL_X;
    vz = LAUF_DIAGONAL_Z;
  } else if (rx !== 0) {
    vx = LAUF_X;
  } else {
    vz = LAUF_Z;
  }
  bewegen(welt, mulGanz(vx, rx), mulGanz(vz, rz));
}

/**
 * Bewegung im Sprintframe n (Kampf 9.2): n = 1 wie Gehen, ab 2 v(n) =
 * 3,875 − 0,125·⌊(n − 1)/6⌋; diagonal 0,75·v und 29/64·v (P23, ohne den
 * Fehler des Vorbilds). sprint_tempo = x-Tempo dieses Frames (9.3).
 */
function sprintBewegen(welt: Welt, rz: -1 | 0 | 1): void {
  const f = welt.figur;
  const n = f.sprint_n;
  let vx: Fest;
  let vz: Fest = 0;
  if (n <= 1) {
    vx = rz !== 0 ? SPRINT_DIAGONAL_X_FRAME1 : SPRINT_X_FRAME1;
    if (rz !== 0) vz = SPRINT_DIAGONAL_Z_FRAME1;
  } else {
    const v = sub(SPRINT_V_START, mulGanz(SPRINT_V_STUFE, divGanz(n - 1, SPRINT_STUFE_FRAMES)));
    if (rz !== 0) {
      vx = mul(v, SPRINT_FAKTOR_DIAGONAL_X);
      vz = mul(v, SPRINT_FAKTOR_DIAGONAL_Z);
    } else {
      vx = v;
    }
  }
  f.sprint_tempo = vx;
  bewegen(welt, mulGanz(vx, f.blick), mulGanz(vz, rz));
}

/** SPRINT ab D2+1 (Kampf 9.1, 9.2): Sprintframe 1, Blick = Sprintrichtung, Ereignis SP:F:1. */
function sprintBeginnen(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  aktionSetzen(welt, 'SPRINT');
  f.sprint_n = 1;
  f.sprint_richtung = richtungsteil(ein.richtung);
  const rx = richtungX(ein.richtung);
  if (rx !== 0) f.blick = rx;
  ereignis(welt, EREIGNIS.SPRINT, 'F', f.sprint_n);
  sprintBewegen(welt, richtungZ(ein.richtung));
}

/**
 * Sprint fortsetzen (Kampf 9.2): solange die Sprintrichtung in T(f−1) liegt,
 * höchstens 90 Sprintframes; O oder U dazu diagonal. Sonst (losgelassen, nur
 * noch O oder U, Gegenrichtung, nach 90 Frames) 1 Frame STAND ohne Bewegung.
 */
function sprintFortsetzen(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  if (f.sprint_n >= SPRINT_MAX_FRAMES || richtungX(ein.richtung) !== f.blick) {
    standBeginnen(welt);
    return;
  }
  f.sprint_n += 1;
  f.uhr += 1;
  sprintBewegen(welt, richtungZ(ein.richtung));
}

/** STAND, LAUF und SPRINT: Drücke nach 4.2. */
function freiSchritt(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  const w = vorrang(welt, ein, true);
  if (w !== null && w.ziel !== 'LAUF') {
    starten(welt, w, ein);
    return;
  }
  if (f.aktion === 'SPRINT') {
    sprintFortsetzen(welt, ein);
    return;
  }
  if (w !== null) {
    laufen(welt, ein.richtung);
    return;
  }
  if (f.aktion !== 'STAND') standBeginnen(welt);
  else f.uhr += 1;
}

// ===========================================================================
// SPRUNG, SPRUNGANGRIFF, SPRINTSPRUNG, LANDUNG (Kampf 4.3, 4.4, 5.2, 9.3)
// ===========================================================================

/**
 * Ein Bahnschritt des Sprungs (Kampf 4.4): h += vh, danach vh −= 0,25; x ±2,25
 * nach T(J) (im Aufsetzframe noch einmal), Tiefe ±0,5 je Luftframe nach
 * T(f−1); wird h ≤ 0, ist h = 0 und die Landung beginnt (Welt 2.2 Punkt 3).
 */
function sprungBahn(welt: Welt, t: Tasten): void {
  const f = welt.figur;
  const hNeu = add(f.h, f.vh);
  f.vh = sub(f.vh, SPRUNG_SCHWERKRAFT);
  const dx = mulGanz(SPRUNG_X, f.sprung_dx);
  if (hNeu <= 0) {
    f.h = 0;
    bewegen(welt, dx, 0);
    aufsetzen(welt);
    aktionSetzen(welt, 'LANDUNG');
    return;
  }
  f.h = hNeu;
  bewegen(welt, dx, mulGanz(SPRUNG_Z, richtungZ(t)));
}

/**
 * Sprungangriff ab A+1 (Kampf 4.3, 5.2): Variante runter (T(A) mit U), sonst
 * Richtung (T(J) mit L oder R), sonst hoch (T(J) mit O, P10), sonst neutral;
 * die Höhe steht in A+1 einen Frame still.
 */
function sprungangriffBeginnen(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  let v: SprungVariante = 'N';
  if (richtungZ(ein.t) === -1) v = 'T';
  else if (richtungX(f.sprung_tasten) !== 0) v = 'R';
  else if (richtungZ(f.sprung_tasten) === 1) v = 'H';
  aktionSetzen(welt, 'SPRUNGANGRIFF', v);
  f.sprung_angriff = true;
  f.sprung_variante = v;
  f.p = ein.q;
  f.angriff_a = ein.q;
  f.angriff = sprungangriffInstanz(v, ein.q);
}

/** Sprint-Sprungangriff ab A+1 (Kampf 9.3, E15): Figur bleibt in SPRINTSPRUNG (f_ph SS), keine Höhenpause. */
function ssBeginnen(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  f.phase = 'SS';
  f.angriff = ssInstanz(ein.q);
  f.angriff_a = ein.q;
  f.ss_n = 1;
  f.sprung_angriff = true;
}

/** SPRUNG, SPRINTSPRUNG, SPRUNGANGRIFF: A ab J+1 gibt den Angriff (einmal je Sprung), sonst Bahn. */
function luftSchritt(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  f.uhr += 1;
  if (!f.sprung_angriff && ein.a) {
    if (f.aktion === 'SPRUNG') {
      sprungangriffBeginnen(welt, ein);
      return;
    }
    if (f.aktion === 'SPRINTSPRUNG') ssBeginnen(welt, ein);
  }
  if (f.aktion === 'SPRUNGANGRIFF' && f.sprung_variante === 'H' && f.uhr > SPRUNGANGRIFF_HOCH_AKTION_BIS) aktionSetzen(welt, 'SPRUNG');
  sprungBahn(welt, ein.t);
}

/**
 * LANDUNG (Kampf 4.3): 6 Frames ab dem Aufsetzen; S neu (auch mit A) in
 * Landeframe 1 bis 5 gibt einen neuen Sprung ab Druck+1 (P2), alle anderen
 * Drücke verfallen; STAND und Drücke ab Landeframe 7.
 */
function landungSchritt(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  f.uhr += 1;
  if (hat(ein.neu, TASTE_S) && f.uhr <= LANDUNG_NEUSPRUNG_BIS + 1) {
    sprungBeginnen(welt, false, ein.t);
    return;
  }
  if (f.uhr > LANDUNG_DAUER) standBeginnen(welt);
}

// ===========================================================================
// SCHLAG, LEERSCHLAG (Kampf 4.3, 5.2, 5.6)
// ===========================================================================

/**
 * Stufe eines neuen Kettenschlags (Kampf 5.6): nächste Stufe, wenn die
 * laufende Stufe k getroffen hat und q im Kombofenster liegt (Stufe 2: h+12
 * bis h+27, Stufe 3 und 4: h+11 bis h+26); sonst neue Kette mit Stufe 1.
 */
function kettenStufe(welt: Welt, q: number): number {
  const f = welt.figur;
  const k = f.kombo;
  if (f.aktion !== 'SCHLAG' || f.treffer_h === 0 || k < 1 || k >= KOMBO_MAX || f.ausfallschritt < 0) return 1;
  const h = f.kombo_h;
  if (q >= h + tab(KOMBO_FENSTER_VON, k) && q <= h + tab(KOMBO_FENSTER_BIS, k)) return k + 1;
  return 1;
}

/** Nachlauf ohne Treffer je Stufe 1 bis 4 (Kampf 4.3, K1, K2, K3): Dauer der Aktion, A und S ab, Richtung ab (Abstand zu P bzw. D). */
const LEER_DAUER: readonly number[] = [LEERSCHLAG_DAUER, KETTE2_LEER_DAUER, KETTE3_LEER_DAUER, KETTE4_DAUER];
const LEER_DRUECKE_AB: readonly number[] = [LEERSCHLAG_DRUECKE_AB, KETTE2_LEER_DRUECKE_AB, KETTE3_LEER_DRUECKE_AB, FRAME_NIE];
const LEER_RICHTUNG_AB: readonly number[] = [LEERSCHLAG_RICHTUNG_AB, KETTE2_LEER_RICHTUNG_AB, KETTE3_LEER_RICHTUNG_AB, FRAME_NIE];

/**
 * Nachlauf ohne Treffer (Kampf 4.3, K1, K2; P29): Stufe 1 wird LEERSCHLAG;
 * Drücke nach der Tabelle der Stufe, frühestens ab dem Frame nach dem letzten
 * aktiven Frame (Ausfallschritt); Stufe 4 nimmt bis zum Ende nichts an.
 */
function leerSetzen(welt: Welt): void {
  const f = welt.figur;
  f.leerschlag = true;
  const k = f.kombo - 1;
  if (k === 0) f.aktion = 'LEERSCHLAG';
  const druecke = Math.max(f.p + tab(LEER_DRUECKE_AB, k), welt.frame);
  const richtung = Math.max(f.p + tab(LEER_RICHTUNG_AB, k), welt.frame);
  schwellenSetzen(f, druecke, richtung, richtung);
}

/** Dauer der Aktion ohne Treffer je Stufe (Kampf 4.3): 16, 16, 17, 25. */
function leerDauer(stufe: number): number {
  return tab(LEER_DAUER, stufe - 1);
}

/** Ausfallschritt bzw. Schritt weg in D+1 bis D+4: 8, 6, 4, 2 px in Blickrichtung (Kampf 5.6). */
function ausfallBewegen(welt: Welt): void {
  const f = welt.figur;
  if (f.ausfallschritt === 0 || f.uhr > AUSFALLSCHRITT.length) return;
  bewegen(welt, mulGanz(ausGanz(tab(AUSFALLSCHRITT, f.uhr - 1)), f.blick), 0);
}

/**
 * SCHLAG der Stufe k ab P+1 bzw. D+1 (Kampf 4.3, 5.6): Ereignis KE:F:k. Ab
 * Stufe 2 mit Blickrichtung in T(D) Ausfallschritt (aktiv später), mit
 * Gegenrichtung Umdrehen und Schritt weg ohne aktive Frames, Kette abgebrochen.
 */
function schlagBeginnen(welt: Welt, stufe: number, ein: Angenommen): void {
  const f = welt.figur;
  aktionSetzen(welt, 'SCHLAG', stufenPhase(stufe));
  f.kombo = stufe;
  f.p = ein.q;
  f.p_tasten = ein.t;
  let ausfall = 0;
  if (stufe > 1) {
    const rx = richtungX(ein.t);
    if (rx === f.blick) ausfall = 1;
    else if (rx !== 0) {
      ausfall = -1;
      f.blick = rx;
    }
  }
  f.ausfallschritt = ausfall;
  f.leerschlag = false;
  f.stand_ab = FRAME_NIE;
  f.angriff = ausfall < 0 ? null : ketteInstanz(stufe, ein.q);
  ereignis(welt, EREIGNIS.KETTE, 'F', stufe);
  if (ausfall < 0) leerSetzen(welt);
  ausfallBewegen(welt);
}

/** SCHLAG und LEERSCHLAG: Drücke nach den Schwellen der Stufe, Ende nach Treffer oder Leerschlag (Kampf 4.3). */
function schlagSchritt(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  f.uhr += 1;
  const w = vorrang(welt, ein, false);
  if (w !== null) {
    starten(welt, w, ein);
    return;
  }
  ausfallBewegen(welt);
  const letzter = f.kombo === KOMBO_MAX ? KETTE4_ZWEITES_FENSTER_BIS : ketteFenster(f.kombo, f.ausfallschritt).bis;
  if (f.treffer_h === 0 && !f.leerschlag && f.uhr > letzter) leerSetzen(welt);
  if (f.kombo === KOMBO_MAX) {
    if (f.uhr > KETTE4_DAUER) standBeginnen(welt);
    return;
  }
  if (f.treffer_h > 0) {
    if (welt.frame >= f.stand_ab) standBeginnen(welt);
    return;
  }
  if (f.leerschlag && f.uhr > leerDauer(f.kombo)) standBeginnen(welt);
}

// ===========================================================================
// GRIFF, KNIESTOSS, WURF (Kampf 8.2 bis 8.4)
// ===========================================================================

/** KNIESTOSS ab K+1 (Kampf 8.3): Treffer K+5, Haltefrist neu bis K+60 (P21), Drücke ab K+18; der dritte wirft um. */
function knieBeginnen(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  const ziel = f.griff_ziel;
  if (ziel === null) return;
  const nr = f.knie_zahl + 1;
  aktionSetzen(welt, 'KNIESTOSS', stufenPhase(nr));
  f.knie_zahl = nr;
  f.p = ein.q;
  const ab = ein.q + KNIESTOSS_DRUECKE_AB;
  schwellenSetzen(f, ab, ab, ab);
  f.los_frame = ein.q + HALTEFRIST + 1;
  f.haltefrist = HALTEFRIST;
  f.angriff = knieInstanz(ziel, nr === KNIESTOSS_UMWERFEN_NR, ein.q);
}

/**
 * WURF ab E+1 (Kampf 8.4): Treffer WU in E+1 (14 LP, Bahn F3 in
 * Wurfrichtung), Figur gebunden bis E+37; Wurfgeschoss WG E+1 bis E+58
 * (8.5); Ereignis WU:F>sn:V oder R.
 */
function wurfBeginnen(welt: Welt, ein: Angenommen, r: 'V' | 'R'): void {
  const f = welt.figur;
  const ziel = f.griff_ziel;
  if (ziel === null) return;
  aktionSetzen(welt, 'WURF', r);
  const richtung = r === 'V' ? f.blick : f.blick === 1 ? -1 : 1;
  f.p = ein.q;
  f.wurf_e = ein.q;
  f.wurf_ziel = ziel;
  f.wurf_richtung = r;
  f.bahn_richtung = richtung;
  f.angriff = wurfInstanz(ziel, ein.q);
  f.wuerfe.push({ ziel, e: ein.q, richtung, inst: wgInstanz(ziel, ein.q) });
  ereignis(welt, EREIGNIS.WURF, pfeil('f', ziel), r);
}

/**
 * Drücke im Griff (Kampf 8.2): A und S → Spezialangriff; A ohne Richtung (oder
 * L und R) → Kniestoß; A mit Richtung → Wurf vorwärts, wenn sie die
 * Blickrichtung enthält, sonst rückwärts (Richtung aus T(E)); S allein →
 * Gegner frei, Sprung. Gibt true zurück, wenn eine Aktion begonnen hat.
 */
function griffEingabe(welt: Welt, ein: Angenommen): boolean {
  const f = welt.figur;
  if (ein.a && ein.s && f.lp > 0) {
    spezialBeginnen(welt);
    return true;
  }
  if (ein.a) {
    const rx = richtungX(ein.t);
    const rz = richtungZ(ein.t);
    if (rx === 0 && rz === 0) knieBeginnen(welt, ein);
    else wurfBeginnen(welt, ein, rx === f.blick ? 'V' : 'R');
    return true;
  }
  if (ein.s) {
    griffLoesen(welt);
    sprungBeginnen(welt, false, ein.t);
    return true;
  }
  return false;
}

/** GRIFF (Kampf 4.3, 8.3): Drücke ab g+1 bzw. K+18; ohne Eingabe Losreißen in g+61 bzw. K+61, Griffsperre 30. */
function griffSchritt(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  f.uhr += 1;
  if (gehaltener(welt) === null) {
    griffBeenden(welt);
    standBeginnen(welt);
    return;
  }
  if (griffEingabe(welt, ein)) return;
  if (welt.frame >= f.los_frame) {
    griffLoesen(welt);
    standBeginnen(welt);
    f.griffsperre = GRIFFSPERRE;
    return;
  }
  f.haltefrist = Math.max(f.los_frame - 1 - welt.frame, 0);
}

/** KNIESTOSS (Kampf 4.3): gehalten ab K+23 (GRIFF); nach dem dritten bzw. ohne Gehaltenen STAND ab K+23, Drücke ab K+18 (P21). */
function knieSchritt(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  f.uhr += 1;
  if (gehaltener(welt) !== null) {
    if (griffEingabe(welt, ein)) return;
    if (f.uhr >= KNIESTOSS_GEHALTEN_AB) {
      const ab = f.druecke_ab;
      aktionSetzen(welt, 'GRIFF');
      f.druecke_ab = ab;
    }
    return;
  }
  if (f.griff_ziel !== null) griffBeenden(welt);
  const w = vorrang(welt, ein, false);
  if (w !== null) {
    starten(welt, w, ein);
    return;
  }
  if (f.uhr >= KNIESTOSS_GEHALTEN_AB) standBeginnen(welt);
}

/** WURF: gebunden E+1 bis E+37, STAND ab E+38 (Kampf 4.3, 8.4). */
function wurfSchritt(welt: Welt): void {
  const f = welt.figur;
  f.uhr += 1;
  if (f.uhr > WURF_GEBUNDEN_BIS) standBeginnen(welt);
}

// ===========================================================================
// SPEZIAL, SPRINTANGRIFF, GETROFFEN, WAFFE, AUFNEHMEN
// ===========================================================================

/** SPEZIAL ab P+1 (Kampf 9.4): keine Bewegung, zustand 3; aus dem Griff bleibt der Gehaltene in der Haltelage. */
function spezialBeginnen(welt: Welt): void {
  const f = welt.figur;
  const q = welt.frame - 1;
  aktionSetzen(welt, 'SPEZIAL');
  f.p = q;
  f.spezial_stufen = 0;
  f.kosten_frame = 0;
  f.angriff = spezialInstanz(q);
}

/** SPEZIAL: uhr 1 bis 50 (je Stufe mit Treffer 7 Stoppframes mehr), danach STAND mit schutz 20 (Kampf 6.3, 9.4). */
function spezialSchritt(welt: Welt): void {
  const f = welt.figur;
  f.uhr += 1;
  if (f.uhr <= SPEZIAL_DAUER) return;
  if (f.griff_ziel !== null) griffLoesen(welt);
  standBeginnen(welt);
  f.schutz = SPEZIAL_SCHUTZ_DANACH;
}

/**
 * SPRINTANGRIFF ab A+1 (Kampf 9.3): in A+1 steht die Figur; lag die
 * Sprintrichtung auch in T(A), rutscht sie ab A+2 mit dem Tempo des
 * Sprintframes A, je Frame 0,15625 weniger, solange es über 0 liegt (P24).
 */
function sprintangriffBeginnen(welt: Welt, ein: Angenommen): void {
  const f = welt.figur;
  const tempo = f.sprint_tempo;
  const rutschen = hat(ein.t, blickTaste(f.blick));
  aktionSetzen(welt, 'SPRINTANGRIFF');
  f.p = ein.q;
  f.angriff_a = ein.q;
  f.rutsch_v = rutschen ? tempo : 0;
  f.angriff = sprintangriffInstanz(ein.q);
}

/** SPRINTANGRIFF: uhr 1 bis 35 (je Frame mit Treffer 7 mehr), Rutschen nur in x, nicht in Stoppframes. */
function sprintangriffSchritt(welt: Welt): void {
  const f = welt.figur;
  f.uhr += 1;
  if (f.uhr > SPRINTANGRIFF_DAUER) {
    standBeginnen(welt);
    return;
  }
  if (f.uhr >= SPRINTANGRIFF_RUTSCHEN_AB && f.rutsch_v > 0) {
    bewegen(welt, mulGanz(f.rutsch_v, f.blick), 0);
    f.rutsch_v = sub(f.rutsch_v, SPRINTANGRIFF_RUTSCH_ABNAHME);
  }
}

/** GETROFFEN H bis H+26 (Kampf 4.3, P3): nur A und S neu ab Druckframe H+8 geben den Spezialangriff; STAND in H+27. */
function getroffenSchritt(welt: Welt, e: Eingang): void {
  const f = welt.figur;
  f.uhr += 1;
  if (hat(e.neu, TASTE_A) && hat(e.neu, TASTE_S) && e.q >= f.getroffen_h + SPEZIAL_AUS_GETROFFEN_AB && f.lp > 0) {
    spezialBeginnen(welt);
    return;
  }
  if (f.uhr > GETROFFEN_DAUER) standBeginnen(welt);
}

/** WAFFE ab P+1 (Kampf 10.3, P5): Abschuss in P+7, STAND und Drücke ab P+18; leere Waffe in P+18 weggeworfen. */
function waffeBeginnen(welt: Welt): void {
  const f = welt.figur;
  aktionSetzen(welt, 'WAFFE');
  f.p = welt.frame - 1;
}

function waffeSchritt(welt: Welt): void {
  const f = welt.figur;
  f.uhr += 1;
  if (f.uhr === RAKETE_ABSCHUSS) raketeAbschiessen(welt);
  if (f.uhr > WAFFE_DAUER) {
    standBeginnen(welt);
    if (f.waffe !== '' && f.munition <= 0) waffeWegwerfen(welt);
  }
}

/** AUFNEHMEN ab P+1 (Kampf 10.1): Wirkung in P+1, Aktion bis P+7, Drücke ab P+8. */
function aufnehmenBeginnen(welt: Welt, o: Objekt): void {
  const f = welt.figur;
  aktionSetzen(welt, 'AUFNEHMEN');
  f.p = welt.frame - 1;
  f.aufnehmen_ziel = o.schluessel;
  aufnehmenWirkung(welt, o);
}

function aufnehmenSchritt(welt: Welt): void {
  const f = welt.figur;
  f.uhr += 1;
  if (f.uhr > AUFNEHMEN_DAUER) {
    f.aufnehmen_ziel = null;
    standBeginnen(welt);
  }
}

// ===========================================================================
// KS2
// ===========================================================================

/** Zustandsübergang und Bewegung eines Frames ohne Stopp (Kampf 4.3). */
function aktionSchritt(welt: Welt): void {
  const f = welt.figur;
  const e = eingang(welt);
  const ein = angenommen(f, e);
  switch (f.aktion) {
    case 'STAND':
    case 'LAUF':
    case 'SPRINT':
      freiSchritt(welt, ein);
      return;
    case 'SPRUNG':
    case 'SPRINTSPRUNG':
    case 'SPRUNGANGRIFF':
      luftSchritt(welt, ein);
      return;
    case 'LANDUNG':
      landungSchritt(welt, ein);
      return;
    case 'SCHLAG':
    case 'LEERSCHLAG':
      schlagSchritt(welt, ein);
      return;
    case 'GRIFF':
      griffSchritt(welt, ein);
      return;
    case 'KNIESTOSS':
      knieSchritt(welt, ein);
      return;
    case 'WURF':
      wurfSchritt(welt);
      return;
    case 'SPEZIAL':
      spezialSchritt(welt);
      return;
    case 'SPRINTANGRIFF':
      sprintangriffSchritt(welt);
      return;
    case 'GETROFFEN':
      getroffenSchritt(welt, e);
      return;
    case 'UMGEWORFEN':
    case 'LIEGEN':
    case 'AUFSTEHEN':
      bodenSchritt(welt);
      return;
    case 'TOT':
      todSchritt(welt);
      return;
    case 'WAFFE':
      waffeSchritt(welt);
      return;
    case 'AUFNEHMEN':
      aufnehmenSchritt(welt);
      return;
    case 'NEUEINSTIEG':
      neueinstiegSchritt(welt);
      return;
  }
}

/**
 * KS2 (Kampf 2.2): Timer (schutz, griffsperre), Kosten des Spezialangriffs in
 * h+8, Waffe fallen lassen in H+1, Tod nach Eingriff; dann Stoppframe (uhr,
 * Bewegung und Instanz stehen, Kampf 5.3) oder Zustandsübergang mit
 * Bewegung; zuletzt aktive Frames der Instanz und zustand.
 */
export function figurKs2(welt: Welt): void {
  const f = welt.figur;
  schutzZaehlen(welt);
  if (f.griffsperre > 0) f.griffsperre -= 1;
  kostenSchritt(welt);
  if (f.waffe_fallen_frame !== 0 && f.waffe_fallen_frame === welt.frame) waffeFallen(welt);
  let stoppframe = false;
  if (f.lp < 0 && f.lp_vor >= 0 && f.aktion !== 'TOT') {
    eingriffTodPruefen(welt);
  } else if (f.stopp > 0) {
    f.stopp -= 1;
    stoppframe = true;
  } else {
    if (f.angriff !== null && f.angriff.code === 'SS') f.ss_n += 1;
    aktionSchritt(welt);
    if (f.angriff !== null && f.angriff.code === 'SS' && f.ss_n > SS_ZWEITER_AKTIV_BIS) {
      f.angriff = null;
      f.ss_n = 0;
    }
  }
  angriffAktivSetzen(welt, stoppframe);
  figurZustandSetzen(welt);
}

// ===========================================================================
// KS7, Urheberseite
// ===========================================================================

/**
 * KS7, Urheberhandler (Kampf 5.3, 5.6, 6.4, 8): für jeden wirksamen Treffer
 * mit urheber 'f'. Griff endet mit Wurf, Spezialangriff, Umwerfen oder Tod
 * des Gehaltenen. Für die laufende Instanz der Figur: Trefferstopp 7 einmal
 * je Frame (Kette, Sprungangriff, Sprintangriff; SS nur in A+13; SP einmal
 * je Flächenstufe; nicht KN, WU, LN), Kette fortschreiben (kombo_h, Schwellen
 * der Pose), Kosten des Spezialangriffs in h+8 vormerken.
 */
export function figurUrheberTreffer(welt: Welt, t: Treffer): void {
  const f = welt.figur;
  const jetzt = welt.frame;
  if (f.griff_ziel !== null && t.ziel === f.griff_ziel) {
    if (t.code === 'WU' || t.code === 'SP' || t.wirkung === 'X' || t.wirkung === 'U') griffBeenden(welt);
  }
  if (t.instanz !== f.angriff) return;
  // treffer_h ist bis hierhin nur in diesem Handler gesetzt worden: ungleich
  // jetzt heißt erster wirksamer Treffer dieser Aktion in diesem Frame
  if (f.treffer_h !== jetzt) f.treffer_frames += 1;
  f.treffer_h = jetzt;
  switch (t.code) {
    case 'KT1':
    case 'KT2':
    case 'KT3':
    case 'KT4': {
      f.kombo_h = jetzt;
      if (f.kombo === 1) {
        schwellenSetzen(f, jetzt + KETTE1_DRUECKE_AB, jetzt + KETTE1_RICHTUNG_AB, jetzt + KETTE1_TIEFE_BEWEGUNG_AB - 1);
        f.stand_ab = jetzt + KETTE1_STAND_AB;
      } else if (f.kombo < KOMBO_MAX) {
        schwellenSetzen(f, jetzt + KETTE23_DRUECKE_AB, jetzt + KETTE23_RICHTUNG_AB, jetzt + KETTE23_TIEFE_BEWEGUNG_AB - 1);
        f.stand_ab = jetzt + KETTE23_STAND_AB;
      }
      f.stopp = TREFFERSTOPP;
      return;
    }
    case 'SN':
    case 'SR':
    case 'SH':
    case 'ST':
    case 'SA':
      f.stopp = TREFFERSTOPP;
      return;
    case 'SS':
      if (f.ss_n === SS_ERSTER_AKTIV) f.stopp = TREFFERSTOPP;
      return;
    case 'SP': {
      const k = spezialStufe(f.uhr);
      if (k < 0) return;
      if (f.spezial_stufen === 0) f.kosten_frame = jetzt + SPEZIAL_KOSTEN_NACH;
      const bit = 1 << k;
      if ((f.spezial_stufen & bit) === 0) {
        f.spezial_stufen |= bit;
        f.stopp = TREFFERSTOPP;
      }
      return;
    }
    default:
      return;
  }
}
