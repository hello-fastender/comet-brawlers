// Anzeige-Daten, Punkte, Leben, Phasen, Stage-Ende und Game Over nach
// docs/spezifikation-welt.md, Abschnitt 10 (K3, Stufe 2).
//
// Ablauf im Frame (welt.ts logikSchritt ruft die drei Schritte direkt auf):
//   W4 (Anfang) rahmenVorlauf  steuerung für diesen Frame (die Figur liest sie in KS1)
//   W5          rahmenW5       Fall des Bosses (boss_t), Punkte, Gegneranzeige
//   W8          rahmenSchritt  Leben −1 und NE:F im Frame N, GO, Phase, SC, Ende
//
// Festlegungen K3 (Lücken, Bericht):
// - steuerung ist 0 von t+1 bis LN+5 (Tod), von c+1 bis c+134 (Blende), ab
//   dem Frame nach dem Fall des Bosses und im Game Over; in t selbst 1.
// - GAME OVER beginnt im Frame N des letzten Todes (Leben 0, Ereignis GO statt
//   NE:F); nach 240 Frames (Frame N+239) ist die Scheibe beendet, die
//   Darstellung beginnt neu mit Seed + 1.
// - Punkte für besiegte Gegner im Frame t, in dem die LP unter 0 fallen (auch
//   durch einen Eingriff), außer ohne_punkte (Fall des Bosses, Welt 7.6).
//   Eine Puppe zählt nach ihrer Rolle (leicht wie Bolzer, schwer wie Rammbock).

import type { Figur, Gegner } from './entitaeten.ts';
import type { Phase, Welt } from './welt.ts';
import { istGegnerSlot } from './entitaeten.ts';
import { EREIGNIS, ereignis } from './ereignisse.ts';
import { kameraBlende } from './kamera.ts';
import {
  ANZEIGE,
  BLENDE_AUF,
  BLENDE_SCHWARZ,
  BLENDE_ZU,
  BOSS_SLOT,
  GAMEOVER_DAUER,
  LP_BALKEN_BREITE,
  NEUEINSTIEG_LANDUNG,
  NEUEINSTIEG_LANDUNG_DAUER,
  NEUEINSTIEG_NACH_TOD,
  PUNKTE_BALLAST,
  PUNKTE_BOLZER,
  PUNKTE_JE_LP,
  PUNKTE_RAMMBOCK,
  PUNKTE_ZUENDER,
  STAGE_CLEAR_NACH,
  STAGE_ENDE_BLENDE,
  STAGE_ENDE_ENTFERNEN,
  STAGE_ENDE_NACH,
} from './werte.ts';

/** Letzter Frame der Kamera-Blende ab c (KA13: c+1 bis c+134). */
const BLENDE_LETZTER = BLENDE_ZU + BLENDE_SCHWARZ + BLENDE_AUF;

// ===========================================================================
// Tod, Neueinstieg, Blende: gemeinsame Abfragen (auch für nah.ts, kamera.ts)
// ===========================================================================

/**
 * Neueinstieg N zum letzten Tod: figur.neueinstieg_n, wenn K1 ihn für diesen
 * Tod gesetzt hat (nach t), sonst t + 120 (Kampf 6.5, E16); 0 ohne Tod.
 */
export function neueinstiegN(f: Figur): number {
  if (f.tod_t <= 0) return f.neueinstieg_n;
  return f.neueinstieg_n > f.tod_t ? f.neueinstieg_n : f.tod_t + NEUEINSTIEG_NACH_TOD;
}

/**
 * Landung LN des laufenden Neueinstiegs: figur.landung_ln, wenn K1 sie für
 * diesen Tod gesetzt hat (größer als N), sonst N + 53 (Kampf 6.5).
 */
export function landungLN(f: Figur): number {
  const n = neueinstiegN(f);
  if (n <= 0) return 0;
  return f.landung_ln > n ? f.landung_ln : n + NEUEINSTIEG_LANDUNG;
}

/** Letzter Frame der Landung nach dem Neueinstieg: LN+5 (Kampf 4.3, Welt 10.3). */
export function landungEnde(f: Figur): number {
  const ln = landungLN(f);
  return ln > 0 ? ln + NEUEINSTIEG_LANDUNG_DAUER - 1 : 0;
}

/** Läuft im Frame f die Kamera-Blende (c+1 bis c+134, KA13)? */
const blendeLaeuft = kameraBlende;

/** Ist die Figur im Frame f zwischen Tod t und Ende der Landung LN+5 (einschließlich t)? */
function imTodeszyklus(f: Figur, frame: number): boolean {
  return f.tod_t > 0 && frame >= f.tod_t && frame <= landungEnde(f);
}

// ===========================================================================
// Steuerung und Phase
// ===========================================================================

/** steuerung für den Frame f (Welt 10.3, 10.5, 11.4, KA13): 1 wertet Eingaben aus, 0 nicht. */
export function steuerungBerechnen(welt: Welt, f: number = welt.frame): 0 | 1 {
  const r = welt.rahmen;
  if (r.gameover_frame > 0) return 0;
  if (r.boss_t > 0 && f > r.boss_t) return 0;
  const fig = welt.figur;
  if (imTodeszyklus(fig, f) && f > fig.tod_t) return 0;
  if (blendeLaeuft(welt, f)) return 0;
  return 1;
}

/** Phase für den Frame f (Welt 10.3 bis 10.5, 11.4). */
export function phaseBerechnen(welt: Welt, f: number = welt.frame): Phase {
  const r = welt.rahmen;
  if (r.gameover_frame > 0 && f >= r.gameover_frame) return 'GAMEOVER';
  if (r.boss_t > 0 && f >= r.boss_t) return 'ENDE';
  const fig = welt.figur;
  if (imTodeszyklus(fig, f)) return f < neueinstiegN(fig) ? 'TOD' : 'NEUEINSTIEG';
  if (blendeLaeuft(welt, f)) return 'BLENDE';
  return 'SPIEL';
}

/**
 * Anfang von W4 (vor KS1): steuerung und Phase für diesen Frame setzen. Die
 * Figur liest welt.rahmen.steuerung in KS1 (Kampf 2.2).
 */
export function rahmenVorlauf(welt: Welt): void {
  welt.rahmen.steuerung = steuerungBerechnen(welt);
  welt.rahmen.phase = phaseBerechnen(welt);
}

// ===========================================================================
// Punkte und Gegneranzeige (W5)
// ===========================================================================

/** Punkte eines besiegten Gegners (Welt 10.2); Puppe nach ihrer Rolle. */
export function punkteFuerGegner(g: Gegner): number {
  switch (g.typ) {
    case 'Bolzer':
      return PUNKTE_BOLZER;
    case 'Rammbock':
      return PUNKTE_RAMMBOCK;
    case 'Zünder':
      return PUNKTE_ZUENDER;
    case 'Ballast':
      return PUNKTE_BALLAST;
    default:
      if (g.rolle === 'schwer') return PUNKTE_RAMMBOCK;
      if (g.rolle === 'fern') return PUNKTE_ZUENDER;
      if (g.rolle === 'boss') return PUNKTE_BALLAST;
      return PUNKTE_BOLZER;
  }
}

/** Punkte gutschreiben (z. B. K1: Essen bei 72 LP in P+1, Welt 10.2). */
export function punkteAddieren(welt: Welt, punkte: number): void {
  welt.rahmen.punkte += punkte;
}

/**
 * W5 (Welt 1, 10.1, 10.2): Fall des Bosses merken (welt.rahmen.boss_t,
 * Phase ENDE ab t), Punkte für Treffer der Figur (10 je LP Schaden, auch über
 * die Rest-LP und bei vorläufigen Treffern auf den Boss), Punkte für besiegte
 * Gegner im Frame t (nicht bei ohne_punkte), Gegneranzeige (kleinster Slot
 * der in diesem Frame von einer Handlung der Figur getroffenen Gegner; Name
 * und LP gemerkt, die LP folgen dem Gegner bis zu seinem Tod bzw. bis sein
 * Slot frei wird, Welt 10.1).
 */
export function rahmenW5(welt: Welt): void {
  const r = welt.rahmen;
  const boss = welt.gegner[BOSS_SLOT] as Gegner;
  if (r.boss_t === 0 && boss.belegt && boss.typ === 'Ballast' && boss.lp < 0) {
    r.boss_t = welt.frame;
    r.phase = 'ENDE';
  }
  let anzeige: number | null = null;
  for (const t of welt.treffer) {
    if (t.urheber !== 'f' || !istGegnerSlot(t.ziel)) continue;
    if (t.wirkung !== 'R' && t.wirkung !== 'U' && t.wirkung !== 'X') continue;
    r.punkte += PUNKTE_JE_LP * t.schaden;
    const nr = Number(t.ziel.slice(1));
    if (t.schaden > 0 && (anzeige === null || nr < anzeige)) anzeige = nr;
  }
  if (anzeige !== null) {
    const g = welt.gegner[anzeige] as Gegner;
    r.anzeige = anzeige;
    r.anzeige_typ = g.typ;
    r.anzeige_lp = g.lp;
    r.anzeige_lebt = g.lp >= 0;
  } else if (r.anzeige !== null && r.anzeige_lebt) {
    const g = welt.gegner[r.anzeige] as Gegner;
    if (g.belegt) {
      r.anzeige_lp = g.lp;
      r.anzeige_lebt = g.lp >= 0;
    } else {
      r.anzeige_lp = 0;
      r.anzeige_lebt = false;
    }
  }
  for (const g of welt.gegner) {
    if (!g.belegt || g.ohne_punkte) continue;
    if (g.lp < 0 && g.lp_vor >= 0) r.punkte += punkteFuerGegner(g);
  }
}

// ===========================================================================
// Leben, Phasen, Ende (W8)
// ===========================================================================

/**
 * W8 (Welt 10.3 bis 10.5): Leben −1 und NE:F im Frame N (beim letzten Leben
 * GO und GAME OVER), Phase, STAGE CLEAR (SC) in t+120, Ende der Scheibe in
 * t+585 bzw. nach 240 Frames GAME OVER: welt.beendet = true.
 */
export function rahmenSchritt(welt: Welt): void {
  const r = welt.rahmen;
  const f = welt.frame;
  const n = neueinstiegN(welt.figur);
  if (n > 0 && f === n && r.gameover_frame === 0) {
    r.leben = Math.max(0, r.leben - 1);
    if (r.leben > 0) {
      ereignis(welt, EREIGNIS.NEUEINSTIEG, 'F');
    } else {
      r.gameover_frame = f;
      ereignis(welt, EREIGNIS.GAME_OVER);
    }
  }
  r.phase = phaseBerechnen(welt);
  if (r.boss_t > 0) {
    if (f === r.boss_t + STAGE_CLEAR_NACH) ereignis(welt, EREIGNIS.STAGE_CLEAR);
    if (f >= r.boss_t + STAGE_ENDE_NACH) welt.beendet = true;
  }
  if (r.gameover_frame > 0 && f >= r.gameover_frame + GAMEOVER_DAUER - 1) welt.beendet = true;
}

// ===========================================================================
// Anzeige-Daten für die Darstellung (Welt 10.1), nur lesend
// ===========================================================================

/** Ein LP-Balken in Lagen (Welt 10.1): Lage n zeigt breite px in Farbe n über einem vollen Balken in Farbe unterlage (0 = keiner). */
export interface Balken {
  lage: number;
  breite: number;
  unterlage: number;
}

/** Inhalt der Anzeigeleiste und der Texte (Welt 10.1, 10.3, 10.5); ganze Zahlen, keine Logik. */
export interface AnzeigeDaten {
  name: string;
  /** 8 Ziffern mit führenden Nullen */
  punkte: string;
  leben: number;
  figur: Balken;
  /** Gegneranzeige: Slot, Name und Balken des zuletzt von der Figur getroffenen Gegners (Welt 10.1); null = keine */
  gegner: { slot: number; name: string; balken: Balken } | null;
  pfeil: boolean;
  /** große Texte in der Bildmitte (STAGE CLEAR, BALLAST BESIEGT 5000, GAME OVER) */
  texte: string[];
  /** Deckung der Blende 0 (offen) bis BLENDE_ZU (schwarz), Kamera-Blende oder Stage-Ende */
  blende: number;
}

/** Name der Heldin in der Anzeige (Welt 10.1). */
export const NAME_HELDIN = 'VELA';

/** Balken in Lagen für LP (Welt 10.1): bei LP ≤ 0 leer; n = ⌈LP/72⌉. */
export function balken(lp: number): Balken {
  if (lp <= 0) return { lage: 0, breite: 0, unterlage: 0 };
  let lage = 1;
  while (lp > lage * LP_BALKEN_BREITE) lage += 1;
  return { lage, breite: lp - LP_BALKEN_BREITE * (lage - 1), unterlage: lage - 1 };
}

function blendeDeckung(welt: Welt): number {
  const f = welt.frame;
  const c = welt.kamera.blende_c;
  if (blendeLaeuft(welt)) {
    const d = f - c;
    if (d <= BLENDE_ZU) return d;
    if (d <= BLENDE_ZU + BLENDE_SCHWARZ) return BLENDE_ZU;
    return BLENDE_LETZTER - d + 1;
  }
  const t = welt.rahmen.boss_t;
  if (t > 0 && f >= t + STAGE_ENDE_ENTFERNEN) {
    const d = f - (t + STAGE_ENDE_ENTFERNEN) + 1;
    return d >= STAGE_ENDE_BLENDE ? STAGE_ENDE_BLENDE : d;
  }
  return 0;
}

/** Anzeige-Daten des zuletzt gelaufenen Frames (Welt 10.1). */
export function anzeige(welt: Welt): AnzeigeDaten {
  const r = welt.rahmen;
  const texte: string[] = [];
  if (r.boss_t > 0 && welt.frame >= r.boss_t + STAGE_CLEAR_NACH && welt.frame < r.boss_t + STAGE_ENDE_ENTFERNEN + STAGE_ENDE_BLENDE) {
    texte.push('STAGE CLEAR', `BALLAST BESIEGT ${PUNKTE_BALLAST}`);
  }
  if (r.phase === 'GAMEOVER') texte.push('GAME OVER');
  let gegner: AnzeigeDaten['gegner'] = null;
  if (r.anzeige !== null) gegner = { slot: r.anzeige, name: r.anzeige_typ.toUpperCase(), balken: balken(r.anzeige_lp) };
  return {
    name: NAME_HELDIN,
    punkte: String(r.punkte).padStart(ANZEIGE.punkte.ziffern, '0'),
    leben: r.leben,
    figur: balken(welt.figur.lp),
    gegner,
    pfeil: welt.kamera.pfeil === 1,
    texte,
    blende: blendeDeckung(welt),
  };
}
