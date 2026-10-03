// Kamera nach docs/spezifikation-welt.md, Abschnitt 3 (K3, Stufe 2): KA1 bis
// KA13 (Folgen nur nach rechts mit Folgepunkt Bildschirm-x 200, höchstens
// 4 px je Frame, Grenze aus Sperren, Halten, Schnitt und Arena, Pfeil
// „weiter“, Arena mit Totzone, Bildschütteln, Ende, Schnitt mit Blende).
//
// kameraSchritt läuft in W6, nach dem Kampfschritt: ⌊x_Figur⌋ ist die Lage am
// Ende dieses Frames. Sperren und Halte lesen den Stand vom Ende des
// Vorframes (welt.vorframe.besiegt, welt.vorframe.lebende; Welt 1, KA4, KA6).
//
// Festlegungen K3 (Lücken, Bericht):
// - Sperren und Halte, deren Kamera-x links von K liegt, sind vorbei und
//   begrenzen nichts (sonst hielte Halt H1 bei 440 die Kamera eines
//   Prüfstarts in der Arena fest, Welt 12 PS7).
// - SR:id und HR:id stehen nur, wenn die Sperre bzw. der Halt die Kamera im
//   Vorframe hielt (Modus SPERRE bzw. HALT an deren Kamera-x); nur dann
//   beginnt der Pfeil.
// - Eine abgeschaltete Welle (welle.n=aus) gilt als besiegt.
// - BL:e steht in c+135, dem ersten Frame nach der Blende; dort wertet die
//   Figur wieder Eingaben aus und der Modus wird ARENA (K = k0).
// - Es gibt höchstens einen Schnitt (der erste Satz `schnitt`), weil
//   welt.kamera.schnitt_ausgefuehrt nur einen kennt.
// - Bildschütteln (KA10) beginnt mit schuettelnStarten im Frame des Anlasses
//   (Einschlag der Rakete, Landung der Körperpresse); der erste Wert gilt in
//   diesem Frame. Anlass und Beginn stehen in welt.kamera (schuetteln_art,
//   schuetteln_ab).

import type { Welt } from './welt.ts';
import type { SchnittSatz } from './stage.ts';
import { ausGanz, ganz } from './festkomma.ts';
import { kameraY } from './stage.ts';
import { EREIGNIS, ereignis } from './ereignisse.ts';
import {
  BLENDE_AUF,
  BLENDE_SCHWARZ,
  BLENDE_ZU,
  KAMERA_FOLGEPUNKT,
  KAMERA_MAX_SCHRITT,
  PFEIL_BIS,
  PFEIL_TAKT,
  SCHUETTELN_EXPLOSION,
  SCHUETTELN_PRESSE,
} from './werte.ts';

/** Frame c+29 der Blende: Versetzen (KA13). */
const BLENDE_VERSETZEN = BLENDE_ZU + 1;
/** Letzter Frame der Blende c+134 (KA13). */
const BLENDE_LETZTER = BLENDE_ZU + BLENDE_SCHWARZ + BLENDE_AUF;

// ===========================================================================
// Bildschütteln (KA10), nur Darstellung
// ===========================================================================

/** Anlass des Bildschüttelns (KA10). */
export type SchuettelnArt = 'presse' | 'explosion';

/**
 * Beginnt das Bildschütteln im laufenden Frame (KA10): Körperpresse 11 Frames
 * waagrecht, Explosion einer Rakete 4 Frames senkrecht. Wirkt nie auf K, Ky
 * oder Logik. Für K4 (Landung der Körperpresse) und die Raketen.
 */
export function schuettelnStarten(welt: Welt, art: SchuettelnArt): void {
  welt.kamera.schuetteln_art = art;
  welt.kamera.schuetteln_ab = welt.frame;
}

function schuettelnSchritt(welt: Welt): void {
  const k = welt.kamera;
  k.schuetteln_x = 0;
  k.schuetteln_y = 0;
  const art = k.schuetteln_art;
  if (art === '') return;
  const werte = art === 'presse' ? SCHUETTELN_PRESSE : SCHUETTELN_EXPLOSION;
  const i = welt.frame - k.schuetteln_ab;
  if (i < 0) return;
  if (i >= werte.length) {
    k.schuetteln_art = '';
    k.schuetteln_ab = 0;
    return;
  }
  if (art === 'presse') k.schuetteln_x = werte[i] as number;
  else k.schuetteln_y = werte[i] as number;
}

// ===========================================================================
// Hilfen
// ===========================================================================

/** Ist Welle nr besiegt nach dem Stand vom Ende des Vorframes (KA4)? Abgeschaltete Wellen gelten als besiegt. */
export function welleBesiegtVor(welt: Welt, nr: number): boolean {
  if (welt.vorframe.besiegt.includes(nr)) return true;
  const w = welt.wellen.liste.find((x) => x.satz.nr === nr);
  return w !== undefined && w.aus;
}

/** Der noch nicht ausgeführte Schnitt (KA3, KA13) oder null. */
function offenerSchnitt(welt: Welt): SchnittSatz | null {
  if (welt.kamera.schnitt_ausgefuehrt) return null;
  return welt.stage.schnitte[0] ?? null;
}

function begrenzt(wert: number, min: number, max: number): number {
  return wert < min ? min : wert > max ? max : wert;
}

/** Läuft im Frame f die Blende (c+1 bis c+134)? */
export function kameraBlende(welt: Welt, f: number = welt.frame): boolean {
  const c = welt.kamera.blende_c;
  return c > 0 && f > c && f <= c + BLENDE_LETZTER;
}

// ===========================================================================
// W6
// ===========================================================================

/** Versetzen in c+29 (KA13): K, Ky, Figur auf (ziel_x, ziel_z), Blick rechts. */
function versetzen(welt: Welt, s: SchnittSatz): void {
  const k = welt.kamera;
  k.x = s.ziel_kamera_x;
  k.y = kameraY(welt.stage, k.x);
  k.schnitt_ausgefuehrt = true;
  const fig = welt.figur;
  fig.x = ausGanz(s.ziel_x);
  fig.z = ausGanz(s.ziel_z);
  fig.blick = 1;
  ereignis(welt, EREIGNIS.BLENDE, 'v');
}

/** Arena (KA8): Totzone ab arena_ab, K zwischen k0 und k1, auch nach links, höchstens 4 px je Frame. */
function arenaSchritt(welt: Welt): void {
  const k = welt.kamera;
  const a = welt.stage.arena;
  k.modus = 'ARENA';
  if (a === null) return;
  if (k.arena_ab === 0) k.arena_ab = welt.frame + 1;
  if (welt.frame >= k.arena_ab) {
    const fx = ganz(welt.figur.x);
    const s = fx - k.x;
    let ziel = k.x;
    if (s > a.totzone_rechts) ziel = fx - a.totzone_rechts;
    else if (s < a.totzone_links) ziel = fx - a.totzone_links;
    ziel = begrenzt(ziel, a.k0, a.k1);
    k.x = begrenzt(ziel, k.x - KAMERA_MAX_SCHRITT, k.x + KAMERA_MAX_SCHRITT);
  }
  k.y = kameraY(welt.stage, k.x);
}

/**
 * Pfeil „weiter“ (KA5): ab dem Frame der Freigabe, bis K > Sperren-x + 64;
 * 16 Frames an, 16 aus. PFEIL_TAKT ist eine Zweierpotenz: das Bit PFEIL_TAKT
 * der Frames seit der Freigabe (nie negativ) ist die Hälfte des Takts, ohne
 * Division (Kampf 2.4).
 */
function pfeilSchritt(welt: Welt): void {
  const k = welt.kamera;
  if (k.freigabe_frame > 0 && k.x <= k.freigabe_x + PFEIL_BIS) {
    k.pfeil = ((welt.frame - k.freigabe_frame) & PFEIL_TAKT) === 0 ? 1 : 0;
  } else {
    k.pfeil = 0;
    k.freigabe_frame = 0;
  }
}

/**
 * W6: neue Kamera-x und Kamera-y, Modus, Pfeil, Schütteln, Blende
 * (welt.kamera.blende_c, Versetzen der Figur in c+29), Ereignisse SR, HR,
 * BL. Bei welt.kamera.fest (Prüfbühne) bleibt alles.
 */
export function kameraSchritt(welt: Welt): void {
  const k = welt.kamera;
  if (k.fest) return;
  const f = welt.frame;
  const stage = welt.stage;
  schuettelnSchritt(welt);

  // KA11: ENDE ab dem Frame nach dem Fall des Bosses
  const bossT = welt.rahmen.boss_t;
  if (bossT > 0 && f > bossT) {
    k.modus = 'ENDE';
    k.pfeil = 0;
    return;
  }

  // KA13: Blende c+1 bis c+134, Versetzen in c+29, Ende in c+135
  if (k.blende_c > 0 && f > k.blende_c && f <= k.blende_c + BLENDE_LETZTER + 1) {
    const d = f - k.blende_c;
    const s = stage.schnitte[0];
    if (d === BLENDE_VERSETZEN && s !== undefined) versetzen(welt, s);
    if (d <= BLENDE_LETZTER) {
      k.modus = 'BLENDE';
      k.pfeil = 0;
      return;
    }
    ereignis(welt, EREIGNIS.BLENDE, 'e');
  }

  // KA7, KA8: Arena
  if (k.modus === 'ARENA' && stage.arena !== null) {
    arenaSchritt(welt);
    pfeilSchritt(welt);
    return;
  }

  const kAlt = k.x;
  const fx = ganz(welt.figur.x);
  const lebendeVor = welt.vorframe.lebende;

  // KA4, KA5: Sperren geben frei, sobald ihre Welle besiegt ist (Stand Vorframe)
  for (const s of welt.sperren) {
    if (s.freigegeben || s.kamera_x < kAlt) continue;
    if (!welleBesiegtVor(welt, s.welle)) continue;
    s.freigegeben = true;
    if (kAlt === s.kamera_x && welt.vorframe.kamera_modus === 'SPERRE') {
      ereignis(welt, EREIGNIS.SPERRE_FREI, s.id);
      k.freigabe_frame = f;
      k.freigabe_x = s.kamera_x;
    }
  }
  // KA6: Halte geben frei, wenn höchstens max_lebende leben (Stand Vorframe)
  for (const h of welt.halte) {
    if (h.freigegeben || h.kamera_x < kAlt) continue;
    if (lebendeVor > h.max_lebende) continue;
    if (kAlt === h.kamera_x && welt.vorframe.kamera_modus === 'HALT') {
      h.freigegeben = true;
      ereignis(welt, EREIGNIS.HALT_FREI, h.id);
    }
  }

  // KA3: Grenze
  let grenze = stage.kamera_x_max;
  for (const s of welt.sperren) if (!s.freigegeben && s.kamera_x >= kAlt) grenze = Math.min(grenze, s.kamera_x);
  for (const h of welt.halte) {
    if (!h.freigegeben && h.kamera_x >= kAlt && lebendeVor > h.max_lebende) grenze = Math.min(grenze, h.kamera_x);
  }
  const schnitt = offenerSchnitt(welt);
  if (schnitt !== null && schnitt.kamera_x >= kAlt) grenze = Math.min(grenze, schnitt.kamera_x);
  const arena = stage.arena;
  if (arena !== null && kAlt <= arena.k0) grenze = Math.min(grenze, arena.k0);

  // KA1, KA2: nur nach rechts, Folgepunkt Bildschirm-x 200, höchstens 4 px
  const kz = fx - KAMERA_FOLGEPUNKT;
  let kNeu = Math.max(kAlt, Math.min(kz, grenze));
  kNeu = Math.min(kNeu, kAlt + KAMERA_MAX_SCHRITT);
  k.x = kNeu;
  k.y = kameraY(stage, kNeu);

  // Modus
  k.modus = 'FREI';
  for (const s of welt.sperren) if (!s.freigegeben && s.kamera_x === kNeu) k.modus = 'SPERRE';
  for (const h of welt.halte) {
    if (!h.freigegeben && h.kamera_x === kNeu && lebendeVor > h.max_lebende) k.modus = 'HALT';
  }
  if (arena !== null && kNeu === arena.k0) {
    k.modus = 'ARENA';
    k.arena_ab = f + 1;
  }
  pfeilSchritt(welt);

  // KA13: Schnitt auslösen
  if (schnitt !== null && kNeu === schnitt.kamera_x && fx >= schnitt.figur_x) {
    k.blende_c = f;
    ereignis(welt, EREIGNIS.BLENDE, 'a');
  }
}
