// Schaden, LP, Schutz, Kosten, Tod und Neueinstieg der Spielfigur (K1) nach
// docs/spezifikation-kampf.md, Abschnitt 6 (6.2 Schaden anwenden, 6.3 Schutz,
// 6.4 Kosten des Spezialangriffs, 6.5 Tod und Neueinstieg) mit den Abläufen
// aus 4.3 (GETROFFEN, UMGEWORFEN, LIEGEN, AUFSTEHEN, TOT, NEUEINSTIEG) und
// den Bahnen F1 und F4 aus 5.7.
//
// Was ein Gegnertreffer an der Figur auslöst (Zielhandler figurGetroffen, KS7):
// - Figur geschützt (zustand 2 oder 3): Wirkung W, sonst nichts (E2, P11, P17).
// - sonst LP −= Schaden; LP < 0 → TOT (X), Umwerfen oder Figur in der Luft
//   → UMGEWORFEN (U, K11), sonst GETROFFEN (R) mit schutz 27; Flug immer vom
//   Angreifer weg (P14). Dazu: eigener Angriff endet (auch SS), Griff endet
//   (P16: Gegner frei, L:sn, Griffsperre 30), Waffe fällt in H+1 (10.4).
// Neueinstieg einheitlich N = t+120 (E16); Landung LN = N+53 trifft alle wachen
// Gegner im Bild (Instanz LN); Schutz 200 ab N+1, zählt ab LN+1 (252 Frames).
// Leben −1, Rang −3 und NE:F im Frame N führt K3 (Welt 8, 10.3).

import type { Blick, Treffer } from './entitaeten.ts';
import type { Welt } from './welt.ts';
import { add, ausGanz, ganz, mulGanz, sub } from './festkomma.ts';
import { entitaet, ZUSTAND_BODEN, ZUSTAND_NORMAL, ZUSTAND_REAKTION } from './entitaeten.ts';
import { EREIGNIS, ereignis, ereignisTreffer } from './ereignisse.ts';
import { TASTE_A, TASTE_S, hat } from './tasten.ts';
import {
  F1_AX,
  F1_GH,
  F1_STILLSTAND,
  F1_VH,
  F1_VX,
  F4_RUHE,
  F4_STILLSTAND,
  FIGUR_AUFSTEHEN_DAUER,
  FIGUR_LIEGEN_AB,
  FIGUR_LIEGEN_ENDE,
  FIGUR_LP,
  FIGUR_UMGEWORFEN_RUHE,
  GRIFFSPERRE,
  LIEGE_DRUECKE,
  LIEGE_ENDE_NACH_DRUCK,
  NEUEINSTIEG_FALL_V,
  NEUEINSTIEG_H,
  NEUEINSTIEG_LANDUNG,
  NEUEINSTIEG_LANDUNG_DAUER,
  NEUEINSTIEG_NACH_TOD,
  NEUEINSTIEG_NEUSPRUNG_BIS,
  NEUEINSTIEG_X,
  NEUEINSTIEG_Z,
  SCHUTZ_AUFSTEHEN,
  SCHUTZ_NEUEINSTIEG,
  SCHUTZ_TREFFER,
  SPEZIAL_KOSTEN,
  WAFFE_FALLEN_NACH,
} from './werte.ts';
import { landungInstanz } from './figur/angriffe.ts';
import { aktionSetzen, aufsetzen, bewegen, sprungBeginnen, standBeginnen } from './figur/basis.ts';
import { griffLoesen } from './figur/griff.ts';
import { intern } from './figur/intern.ts';

/** Aktionen mit zustand 2 (Kampf 4.1). */
const BODEN_AKTIONEN = ['UMGEWORFEN', 'LIEGEN', 'AUFSTEHEN', 'TOT'];

/** Gegenrichtung. */
function gegen(b: Blick): Blick {
  return b === 1 ? -1 : 1;
}

/** zustand der Figur nach Kampf 4.1: 2 in UMGEWORFEN, LIEGEN, AUFSTEHEN, TOT; 3 bei schutz > 0 oder im Spezialangriff; sonst 1. */
export function figurZustandSetzen(welt: Welt): void {
  const f = welt.figur;
  if (BODEN_AKTIONEN.includes(f.aktion)) f.zustand = ZUSTAND_BODEN;
  else if (f.schutz > 0 || f.aktion === 'SPEZIAL') f.zustand = ZUSTAND_REAKTION;
  else f.zustand = ZUSTAND_NORMAL;
}

/** KS2: schutz zählt vor der Trefferprüfung herunter (Kampf 6.3); im Fall nach dem Neueinstieg erst ab LN+1. */
export function schutzZaehlen(welt: Welt): void {
  const f = welt.figur;
  if (f.schutz <= 0) return;
  if (f.aktion === 'NEUEINSTIEG' && welt.frame <= f.landung_ln) return;
  f.schutz -= 1;
}

/** KS2 im Frame h+8 (Kampf 6.4): 9 LP Kosten, höchstens bis 0; Ereignis K:F:Betrag (tatsächlich abgezogen). */
export function kostenSchritt(welt: Welt): void {
  const f = welt.figur;
  if (f.kosten_frame === 0 || f.kosten_frame !== welt.frame) return;
  f.kosten_frame = 0;
  const neu = Math.max(f.lp - SPEZIAL_KOSTEN, 0);
  const betrag = f.lp - neu;
  if (betrag <= 0) return;
  f.lp = neu;
  ereignis(welt, EREIGNIS.KOSTEN, 'F', betrag);
}

/** Flug vom Angreifer weg: Vorzeichen von x_Figur − x_Angreifer, bei Gleichheit dessen Blick (Kampf 5.7, P14). */
function flugrichtung(welt: Welt, t: Treffer): Blick {
  const a = entitaet(welt, t.angreifer);
  if (a === null) return t.richtung;
  const dx = ganz(welt.figur.x) - ganz(a.x);
  if (dx > 0) return 1;
  if (dx < 0) return -1;
  return a.blick;
}

/** Bahn F1 bzw. F4 der Figur beginnen (Kampf 5.7): in der aktuellen Höhe (P15). */
function bahnBeginnen(welt: Welt, bahn: 'F1' | 'F4', richtung: Blick): void {
  const f = welt.figur;
  const i = intern(f);
  f.bahn = bahn;
  f.bahn_richtung = richtung;
  f.bahn_frame = 0;
  f.bahn_start_x = f.x;
  f.vx = F1_VX;
  f.ax = F1_AX;
  f.vh = F1_VH;
  f.gh = F1_GH;
  i.gelandet = false;
}

/** UMGEWORFEN in H (Kampf 4.3): Stillstand H+1 bis H+8, Bahn F1 vom Angreifer weg, LIEGEN ab H+54. */
export function umwerfenBeginnen(welt: Welt, richtung: Blick): void {
  const f = welt.figur;
  aktionSetzen(welt, 'UMGEWORFEN');
  f.getroffen_h = welt.frame;
  f.liege_druecke = 0;
  intern(f).liege_ende = welt.frame + FIGUR_LIEGEN_ENDE;
  bahnBeginnen(welt, 'F1', richtung);
}

/** TOT in t (Kampf 4.3, 6.5): Bahn F4, Neueinstieg N = t+120 bei jeder Todesart (E16). */
export function todBeginnen(welt: Welt, richtung: Blick): void {
  const f = welt.figur;
  aktionSetzen(welt, 'TOT');
  f.tod_t = welt.frame;
  f.neueinstieg_n = welt.frame + NEUEINSTIEG_NACH_TOD;
  f.landung_ln = 0;
  intern(f).neueinstieg = false;
  bahnBeginnen(welt, 'F4', richtung);
}

/**
 * Ein Bahnframe (Kampf 5.7): x += vx · Richtung, vx −= ax; bis zum
 * Bodenkontakt h += vh, vh −= gh, bei h ≤ 0 ist h = 0; danach läuft nur x bis
 * zur Ruhe weiter (Rückprall nur Darstellung, P13). Unterphase F im Flug, B
 * ab dem Bodenkontakt.
 */
function bahnSchritt(welt: Welt): void {
  const f = welt.figur;
  const i = intern(f);
  f.bahn_frame += 1;
  if (!i.gelandet) {
    f.h = add(f.h, f.vh);
    f.vh = sub(f.vh, f.gh);
    if (f.h <= 0) {
      f.h = 0;
      i.gelandet = true;
    }
  }
  bewegen(welt, mulGanz(f.vx, f.bahn_richtung), 0);
  f.vx = sub(f.vx, f.ax);
  f.phase = i.gelandet ? 'B' : 'F';
}

/**
 * KS7, Zielhandler für die Figur (Kampf 6.2, 6.3): t.lp_vorher, t.wirkung
 * (W im Schutz bei zustand 2 oder 3; X bei LP < 0; U bei Umwerfen oder in
 * der Luft; sonst R), als Erstes das Ereignis T, dann LP und Folgen. Ein
 * wirkungsloser Treffer ändert nichts (E2, P11).
 */
export function figurGetroffen(welt: Welt, t: Treffer): void {
  const f = welt.figur;
  t.lp_vorher = f.lp;
  if (f.zustand !== ZUSTAND_NORMAL) {
    t.wirkung = 'W';
    ereignisTreffer(welt, t);
    return;
  }
  const lp = f.lp - t.schaden;
  t.wirkung = lp < 0 ? 'X' : t.umwerfen || f.h > 0 ? 'U' : 'R';
  ereignisTreffer(welt, t);
  f.lp = lp;
  f.letzter_angreifer = t.angreifer;
  f.getroffen_h = welt.frame;
  f.stopp = 0;
  if (f.waffe !== '') f.waffe_fallen_frame = welt.frame + WAFFE_FALLEN_NACH;
  if (f.griff_ziel !== null) {
    griffLoesen(welt);
    f.griffsperre = GRIFFSPERRE;
  }
  const r = flugrichtung(welt, t);
  if (t.wirkung === 'X') {
    todBeginnen(welt, r);
  } else if (t.wirkung === 'U') {
    umwerfenBeginnen(welt, r);
  } else {
    aktionSetzen(welt, 'GETROFFEN');
    f.schutz = SCHUTZ_TREFFER;
  }
  figurZustandSetzen(welt);
}

/** KS2: LP unter 0 ohne Treffer (Eingriff, LP < 0 ≤ lp_vor) ist der Tod in diesem Frame; Flug nach hinten (Festlegung K1). */
export function eingriffTodPruefen(welt: Welt): void {
  const f = welt.figur;
  if (f.lp < 0 && f.lp_vor >= 0 && f.aktion !== 'TOT') todBeginnen(welt, gegen(f.blick));
}

/**
 * KS2 in UMGEWORFEN, LIEGEN und AUFSTEHEN (Kampf 4.3): Bahn F1 H+9 bis H+55,
 * LIEGEN ab H+54; jeder Frame ab H+54 mit neuem A oder S zählt einen Druck,
 * mit dem sechsten in q endet das Liegen in L_end = q+2 (sonst H+94);
 * AUFSTEHEN 26 Frames, STAND in U = L_end+27 mit schutz 35, Drücke ab U (P4).
 */
export function bodenSchritt(welt: Welt): void {
  const f = welt.figur;
  const i = intern(f);
  const h = f.getroffen_h;
  const d = welt.frame - h;
  f.uhr += 1;
  if (d > F1_STILLSTAND && d <= FIGUR_UMGEWORFEN_RUHE) bahnSchritt(welt);
  if (f.aktion === 'UMGEWORFEN' && d >= FIGUR_LIEGEN_AB) {
    const phase = f.phase;
    aktionSetzen(welt, 'LIEGEN');
    f.phase = d <= FIGUR_UMGEWORFEN_RUHE ? phase : '';
    return;
  }
  if (f.aktion === 'LIEGEN') {
    if (d > FIGUR_UMGEWORFEN_RUHE) f.phase = '';
    const q = welt.frame - 1;
    const neu = welt.rahmen.steuerung === 1 ? welt.eingabe.neu : 0;
    if (q >= h + FIGUR_LIEGEN_AB && hat(neu, TASTE_A | TASTE_S)) {
      f.liege_druecke += 1;
      if (f.liege_druecke === LIEGE_DRUECKE && q + LIEGE_ENDE_NACH_DRUCK < i.liege_ende) i.liege_ende = q + LIEGE_ENDE_NACH_DRUCK;
    }
    if (welt.frame > i.liege_ende) aktionSetzen(welt, 'AUFSTEHEN');
    return;
  }
  if (f.aktion === 'AUFSTEHEN' && welt.frame > i.liege_ende + FIGUR_AUFSTEHEN_DAUER) {
    standBeginnen(welt);
    f.bahn = '';
    f.schutz = SCHUTZ_AUFSTEHEN;
  }
}

/**
 * KS2 in TOT (Kampf 4.3, 6.5): Bahn F4 t+3 bis t+49 (Unterphase F, B, ab der
 * Ruhe R); in N LP 72, wenn noch ein Leben folgt (K3 zieht in N ein Leben ab
 * und beendet sonst das Spiel); in N+1 Erscheinen.
 */
export function todSchritt(welt: Welt): void {
  const f = welt.figur;
  const i = intern(f);
  const d = welt.frame - f.tod_t;
  f.uhr += 1;
  if (d > F4_STILLSTAND && d <= F4_RUHE) bahnSchritt(welt);
  else if (d > F4_RUHE) f.phase = 'R';
  if (welt.frame === f.neueinstieg_n && welt.rahmen.leben > 1) {
    f.lp = FIGUR_LP;
    i.neueinstieg = true;
  }
  if (welt.frame === f.neueinstieg_n + 1 && i.neueinstieg && welt.rahmen.phase !== 'GAMEOVER') neueinstiegBeginnen(welt);
}

/** Erscheinen in N+1 (Kampf 6.5): x = Kamera-x + 64, Tiefe = Kamera-y + 48, Höhe 256, Blick rechts, schutz 200, zustand 3. */
function neueinstiegBeginnen(welt: Welt): void {
  const f = welt.figur;
  const i = intern(f);
  aktionSetzen(welt, 'NEUEINSTIEG');
  i.neueinstieg = false;
  f.x = ausGanz(welt.kamera.x + NEUEINSTIEG_X);
  f.z = ausGanz(welt.kamera.y + NEUEINSTIEG_Z);
  f.h = NEUEINSTIEG_H;
  f.blick = 1;
  f.bahn = '';
  f.vh = 0;
  f.schutz = SCHUTZ_NEUEINSTIEG;
  f.landung_ln = f.neueinstieg_n + NEUEINSTIEG_LANDUNG;
  f.griff_ziel = null;
  f.liege_druecke = 0;
}

/**
 * KS2 in NEUEINSTIEG (Kampf 4.3, 6.5): Fall bis LN = N+53 (Höhenverlauf P28,
 * 5 px je Frame), in LN Landung mit Instanz LN; LN bis LN+5 Landung, S neu in
 * LN bis LN+4 gibt einen neuen Sprung ab Druck+1 (auch bei steuerung 0,
 * Welt 11.4), STAND ab LN+6 mit Drücken ab LN+6.
 */
export function neueinstiegSchritt(welt: Welt): void {
  const f = welt.figur;
  const ln = f.landung_ln;
  f.uhr += 1;
  if (welt.frame < ln) {
    f.h = Math.max(sub(f.h, NEUEINSTIEG_FALL_V), 0);
    return;
  }
  if (welt.frame === ln) {
    f.h = 0;
    aufsetzen(welt);
    f.angriff = landungInstanz(ln);
    return;
  }
  if (f.angriff !== null && f.angriff.code === 'LN') f.angriff = null;
  const q = welt.frame - 1;
  if (hat(welt.eingabe.neu, TASTE_S) && q <= ln + NEUEINSTIEG_NEUSPRUNG_BIS) {
    sprungBeginnen(welt, false, welt.eingabe.t1);
    return;
  }
  if (welt.frame >= ln + NEUEINSTIEG_LANDUNG_DAUER) standBeginnen(welt);
}
