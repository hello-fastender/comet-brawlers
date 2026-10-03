// Gegenstände und Behälter nach docs/spezifikation-welt.md, Abschnitt 9 (K3,
// Stufe 2): Slots 9.1, Behälter 9.2, Gegenstände 9.3 (Erscheinen in h+1,
// Flug 48 Frames, Landung L = h+49, Liegezeit 700 + 92 mit Blinken,
// Scrollen, Stage-Ende, leere Waffe) und die Waffe des toten Zünders (Welt 6).
// Die Seite der Figur (Aufnehmen, Essen, Waffe fallen lassen, Kampf 10)
// baut K1 mit den Hilfen unten.
//
// Schnittstelle für K1 (Kampf 10.1 bis 10.4):
// - Aufnehmbar ist ein Objekt o mit o.belegt, o.typ === 'Gegenstand' und
//   o.aufnehmbar (ab L, nicht im Flug); Art o.art, Munition o.munition,
//   Liegezeit o.liegezeit, sichtbar o.sichtbar (Blinken). Bereich und Ablauf
//   nach Kampf 10.1 (werte.ts AUFNEHMEN_BEREICH[o.art], AUFNEHMEN_TIEFE).
// - In P+1: gegenstandAufnehmen(welt, o) gibt { art, munition } zurück und
//   gibt den Slot frei; das Ereignis AU:F>on:Art schreibt K1 vorher.
// - Waffe fallen lassen bzw. Tausch (Kampf 10.4): gegenstandAblegen(welt,
//   'Raketenwerfer', x, z, munition) legt sie gelandet und aufnehmbar ab,
//   L = laufender Frame (Liegezeit 0); WA schreibt K1.
// - Leere Waffe (Kampf 10.3): leereWaffeWerfen(welt, x, z), verschwindet nach
//   61 Frames.
// - Punkte für Essen bei 72 LP: rahmen.ts punkteAddieren.
// - Hindernisse der unzerbrochenen Behälter für schrittBegrenzt:
//   behaelterHindernisse(welt).
//
// Festlegungen K3 (Lücken, Bericht):
// - Ein zerbrochener Behälter verschwindet in W8 von h+1; sein Inhalt
//   erscheint im selben Schritt im kleinsten freien Objektslot (meist dem
//   Slot des Behälters).
// - Bei welle.7=nur_boss sind die Bosskisten seit Frame 0 zerbrochen; ihr
//   Inhalt erscheint deshalb in Frame 1 und fliegt wie sonst.
// - Ein Treffer auf eine Bosskiste oder einen schon zerbrochenen Behälter
//   bleibt wirkungslos (Wirkung W); VORSCHLAG (K2): solche Behälter gar nicht
//   als Ziel prüfen.
// - Die Waffe des Zünders erscheint in W8 von t an seiner Lage und Höhe,
//   fliegt 34 Frames (n = 1 … 34) mit 2 px/Frame von der Figur weg, liegt ab
//   t+34 am Boden und ist ab L = t+44 aufnehmbar (Ereignis LA in t+44). Eine
//   Wand hält sie in x auf.
// - Behälter, die beim Scrollen verschwinden, schreiben ebenfalls EN:on:S.
// - Ein Gegenstand der Prüfszene (liegt von Beginn an, L19) zählt seine
//   Liegezeit ab seinem ersten W8 (L = 1).

import type { Blick, GegenstandArt, Objekt, Treffer } from './entitaeten.ts';
import type { Hindernis } from './stage.ts';
import type { Welt } from './welt.ts';
import { add, ausGanz, divGanz, ganz, mulGanz } from './festkomma.ts';
import { entitaet, freiesObjekt, freigeben, objektBelegen } from './entitaeten.ts';
import { EREIGNIS, ereignis, ereignisTreffer } from './ereignisse.ts';
import { behaelterHindernis, schrittBegrenzt } from './stage.ts';
import {
  BLINKEN_TAKT,
  GEGENSTAND_FLUG,
  GEGENSTAND_FLUG_TEILER,
  GEGENSTAND_SCHEITEL,
  LEERE_WAFFE_LEBENSDAUER,
  LIEGEZEIT_ENTFERNT,
  LIEGEZEIT_WAFFE,
  RAKETENWERFER_MUNITION,
  SCROLL_BEHAELTER,
  SCROLL_GEGENSTAND,
  STAGE_ENDE_ENTFERNEN,
  ZUENDER_WAFFE_FLUG,
  ZUENDER_WAFFE_HOEHE,
  ZUENDER_WAFFE_LIEGT_AB,
  ZUENDER_WAFFE_TEILER,
  ZUENDER_WAFFE_X,
} from './werte.ts';

/** Flugart eines Gegenstands in timer.flug: aus einem Behälter bzw. Waffe des Zünders. */
const FLUG_BEHAELTER = 1;
const FLUG_ZUENDER = 2;

// ===========================================================================
// Hilfen für andere Module
// ===========================================================================

/** Hindernisse der unzerbrochenen Behälter (Welt 2.2, Punkt 6) für stage.ts schrittBegrenzt. */
export function behaelterHindernisse(welt: Welt): Hindernis[] {
  const liste: Hindernis[] = [];
  for (const o of welt.objekte) {
    if (o.belegt && o.typ === 'Behälter' && !o.zerbrochen) liste.push(behaelterHindernis(o.id === '' ? o.schluessel : o.id, ganz(o.x), ganz(o.z)));
  }
  return liste;
}

/** Ist o ein aufnehmbarer Gegenstand (Welt 9.3: ab L, nicht im Flug)? */
export function istAufnehmbar(o: Objekt): boolean {
  return o.belegt && o.typ === 'Gegenstand' && o.aufnehmbar;
}

/** Munition eines neuen Gegenstands: Raketenwerfer 3 Schuss (Welt 9.3), sonst 0. */
function munitionVon(art: GegenstandArt): number {
  return art === 'Raketenwerfer' ? RAKETENWERFER_MUNITION : 0;
}

/** Legt einen Gegenstand im kleinsten freien Objektslot an; ohne Slot OV:Art und null (Welt 9.1). */
function gegenstandNeu(welt: Welt, art: GegenstandArt, x: number, z: number): Objekt | null {
  const o = freiesObjekt(welt);
  if (o === null) {
    ereignis(welt, EREIGNIS.OBJEKT_VOLL, art);
    return null;
  }
  objektBelegen(o, 'Gegenstand');
  o.art = art;
  o.x = ausGanz(x);
  o.z = ausGanz(z);
  o.munition = munitionVon(art);
  o.abschuss = welt.frame;
  return o;
}

/**
 * Legt einen Gegenstand sofort gelandet und aufnehmbar ab (Kampf 10.4: Waffe
 * fallen lassen in H+1 bzw. Tausch in P+1, L = laufender Frame, Liegezeit 0).
 * Gibt das Objekt zurück, ohne freien Slot null (OV:Art).
 */
export function gegenstandAblegen(welt: Welt, art: GegenstandArt, x: number, z: number, munition: number): Objekt | null {
  const o = gegenstandNeu(welt, art, x, z);
  if (o === null) return null;
  o.munition = munition;
  o.landung_l = welt.frame;
  o.liegezeit = 0;
  o.aufnehmbar = true;
  return o;
}

/** Wirft die leere Waffe weg (Kampf 10.3): nicht aufnehmbar, nach 61 Frames entfernt (EN:on:L). */
export function leereWaffeWerfen(welt: Welt, x: number, z: number): Objekt | null {
  const o = freiesObjekt(welt);
  if (o === null) {
    ereignis(welt, EREIGNIS.OBJEKT_VOLL, 'Raketenwerfer');
    return null;
  }
  objektBelegen(o, 'Waffe');
  o.art = 'Raketenwerfer';
  o.x = ausGanz(x);
  o.z = ausGanz(z);
  o.munition = 0;
  o.abschuss = welt.frame;
  return o;
}

/** Nimmt einen aufnehmbaren Gegenstand auf (Kampf 10.1, Wirkung in P+1): gibt Art und Munition zurück, Slot frei. */
export function gegenstandAufnehmen(_welt: Welt, o: Objekt): { art: GegenstandArt; munition: number } {
  if (!istAufnehmbar(o) || o.art === '' || o.art === 'Fass' || o.art === 'Bosskiste') {
    throw new RangeError(`gegenstandAufnehmen: ${o.schluessel} ist kein aufnehmbarer Gegenstand`);
  }
  const ergebnis = { art: o.art, munition: o.munition };
  freigeben(o);
  return ergebnis;
}

/** Zerbricht alle Bosskisten im laufenden Frame (Welt 4.6, 9.2: beim Weckreiz des Bosses); Inhalt in h+1. */
export function bosskistenZerbrechen(welt: Welt): void {
  for (const o of welt.objekte) {
    if (!o.belegt || o.typ !== 'Behälter' || o.art !== 'Bosskiste' || o.zerbrochen) continue;
    o.zerbrochen = true;
    o.zerbrochen_h = welt.frame;
  }
}

// ===========================================================================
// KS7: Behälter getroffen (Welt 9.2)
// ===========================================================================

/**
 * KS7, Zielhandler für Behälter (Welt 9.2): ein Fass zerbricht beim ersten
 * Treffer jeder Art im Frame h (Wirkung B); ab h+1 kein Hindernis, Inhalt in
 * h+1. Bosskisten und schon zerbrochene Behälter: Wirkung W (siehe Kopf).
 */
export function behaelterGetroffen(welt: Welt, t: Treffer): void {
  const o = entitaet(welt, t.ziel) as Objekt;
  t.lp_vorher = o.lp;
  const zerbricht = o.typ === 'Behälter' && o.art === 'Fass' && !o.zerbrochen;
  t.wirkung = zerbricht ? 'B' : 'W';
  ereignisTreffer(welt, t);
  if (!zerbricht) return;
  o.zerbrochen = true;
  o.zerbrochen_h = welt.frame;
}

// ===========================================================================
// W6: Verschwinden beim Scrollen (Welt 9.2, 9.3)
// ===========================================================================

/** W6, nach der Kamera: Gegenstände ab K − ⌊x⌋ ≥ 163 und Behälter ab 195 entfernen, Ereignis EN:on:S. */
export function gegenstaendeScrollen(welt: Welt): void {
  const k = welt.kamera.x;
  for (const o of welt.objekte) {
    if (!o.belegt) continue;
    const links = k - ganz(o.x);
    const weg = ((o.typ === 'Gegenstand' || o.typ === 'Waffe') && links >= SCROLL_GEGENSTAND) || (o.typ === 'Behälter' && links >= SCROLL_BEHAELTER);
    if (!weg) continue;
    ereignis(welt, EREIGNIS.ENTFERNT, o.schluessel, 'S');
    freigeben(o);
  }
}

// ===========================================================================
// W8: Erscheinen, Flug, Liegezeit (Welt 9.3, 6)
// ===========================================================================

/** Höhe im n-ten Frame nach dem Erscheinen aus einem Behälter: ⌊n·(48 − n)·35/576⌋ px (Welt 9.3). */
export function flughoeheBehaelter(n: number): number {
  return divGanz(n * (GEGENSTAND_FLUG - n) * GEGENSTAND_SCHEITEL, GEGENSTAND_FLUG_TEILER);
}

/** Bogen der Zünderwaffe über der Höhe in t: ⌊n·(34 − n)·61/289⌋ px (Welt 6). */
export function flughoeheZuenderwaffe(n: number): number {
  return divGanz(n * (ZUENDER_WAFFE_FLUG - n) * ZUENDER_WAFFE_HOEHE, ZUENDER_WAFFE_TEILER);
}

/** Inhalt zerbrochener Behälter in h+1: Behälter weg, Gegenstand erscheint am Ort, Höhe 0, ER:on:Art. */
function behaelterOeffnen(welt: Welt): void {
  const f = welt.frame;
  for (const o of welt.objekte) {
    if (!o.belegt || o.typ !== 'Behälter' || !o.zerbrochen || f !== o.zerbrochen_h + 1) continue;
    const inhalt = o.inhalt;
    const x = ganz(o.x);
    const z = ganz(o.z);
    freigeben(o);
    if (inhalt === 'leer' || inhalt === '') continue;
    const neu = gegenstandNeu(welt, inhalt, x, z);
    if (neu === null) continue;
    neu.flugphase = 'FLUG';
    neu.flug_n = 0;
    neu.timer['flug'] = FLUG_BEHAELTER;
    ereignis(welt, EREIGNIS.ERSCHEINT, neu.schluessel, inhalt);
  }
}

/** Waffe des toten Zünders ab t (Welt 6): Raketenwerfer mit 3 Schuss, unabhängig von seinen Schüssen. */
function zuenderWaffen(welt: Welt): void {
  const fig = welt.figur;
  for (const g of welt.gegner) {
    if (!g.belegt || g.typ !== 'Zünder' || g.lp >= 0 || g.ohne_punkte || g.timer['waffe_fallen'] === 1) continue;
    g.timer['waffe_fallen'] = 1;
    const neu = gegenstandNeu(welt, 'Raketenwerfer', ganz(g.x), ganz(g.z));
    if (neu === null) continue;
    const dx = ganz(g.x) - ganz(fig.x);
    const richtung: Blick = dx > 0 ? 1 : dx < 0 ? -1 : g.blick === 1 ? -1 : 1;
    neu.h = g.h;
    neu.flugphase = 'FLUG';
    neu.flug_n = 0;
    neu.bahn_richtung = richtung;
    neu.timer['flug'] = FLUG_ZUENDER;
    neu.timer['h0'] = g.h;
    neu.timer['liegt_ab'] = welt.frame + ZUENDER_WAFFE_LIEGT_AB;
    ereignis(welt, EREIGNIS.ERSCHEINT, neu.schluessel, 'Raketenwerfer');
  }
}

function landen(welt: Welt, o: Objekt): void {
  o.landung_l = welt.frame;
  o.liegezeit = 0;
  o.aufnehmbar = true;
  ereignis(welt, EREIGNIS.GELANDET, o.schluessel);
}

/** Flug eines Gegenstands aus einem Behälter: n = 1 … 48, gelandet bei n = 48 (L = h+49). */
function flugBehaelter(welt: Welt, o: Objekt): void {
  o.flug_n += 1;
  const n = o.flug_n;
  o.h = ausGanz(flughoeheBehaelter(n));
  if (n >= GEGENSTAND_FLUG) {
    o.h = 0;
    o.flugphase = '';
    landen(welt, o);
  }
}

/** Flug der Zünderwaffe: n = 1 … 34 mit 2 px/Frame von der Figur weg, aufnehmbar ab L = t+44. */
function flugZuender(welt: Welt, o: Objekt): void {
  if (o.flugphase === 'FLUG') {
    o.flug_n += 1;
    const n = o.flug_n;
    const schritt = schrittBegrenzt({ stage: welt.stage, zusatz: [], x_min: null, x_max: null }, o.x, o.z, o.h, mulGanz(ZUENDER_WAFFE_X, o.bahn_richtung), 0);
    o.x = schritt.x;
    o.h = add(o.timer['h0'] ?? 0, ausGanz(flughoeheZuenderwaffe(n)));
    if (n >= ZUENDER_WAFFE_FLUG) {
      o.h = 0;
      o.flugphase = '';
    }
  }
  if (welt.frame === o.timer['liegt_ab']) landen(welt, o);
}

/** Liegezeit und Blinken (Welt 9.3): Waffen sichtbar bis 699, Blinken 700 bis 791, entfernt bei 792; Essen unbegrenzt. */
function liegen(welt: Welt, o: Objekt): void {
  o.liegezeit = welt.frame - o.landung_l;
  if (o.art !== 'Raketenwerfer') return;
  if (o.liegezeit >= LIEGEZEIT_ENTFERNT) {
    ereignis(welt, EREIGNIS.ENTFERNT, o.schluessel, 'L');
    freigeben(o);
    return;
  }
  o.sichtbar = o.liegezeit < LIEGEZEIT_WAFFE || (divGanz(o.liegezeit - LIEGEZEIT_WAFFE, BLINKEN_TAKT) & 1) === 0;
}

/**
 * W8 (Welt 9.3): Inhalt zerbrochener Behälter in h+1 (ER:on:Art), Waffe des
 * toten Zünders in t, Flug (LA:on), Liegezeit und Blinken (sichtbar),
 * Entfernen nach der Liegezeit (EN:on:L), leere Waffen nach 61 Frames
 * (EN:on:L), alle Gegenstände in t+480 nach dem Fall des Bosses (EN:on:E).
 */
export function gegenstaendeSchritt(welt: Welt): void {
  const f = welt.frame;
  behaelterOeffnen(welt);
  zuenderWaffen(welt);
  for (const o of welt.objekte) {
    if (!o.belegt) continue;
    if (o.typ === 'Waffe') {
      if (f - o.abschuss >= LEERE_WAFFE_LEBENSDAUER) {
        ereignis(welt, EREIGNIS.ENTFERNT, o.schluessel, 'L');
        freigeben(o);
      }
      continue;
    }
    if (o.typ !== 'Gegenstand') continue;
    const flug = o.timer['flug'] ?? 0;
    if (o.landung_l === 0 && flug === 0 && o.aufnehmbar) o.landung_l = f;
    if (o.landung_l === 0 && o.abschuss < f) {
      if (flug === FLUG_BEHAELTER) flugBehaelter(welt, o);
      else if (flug === FLUG_ZUENDER) flugZuender(welt, o);
      continue;
    }
    if (o.landung_l > 0) liegen(welt, o);
  }
  const t = welt.rahmen.boss_t;
  if (t > 0 && f === t + STAGE_ENDE_ENTFERNEN) {
    for (const o of welt.objekte) {
      if (!o.belegt || (o.typ !== 'Gegenstand' && o.typ !== 'Waffe')) continue;
      ereignis(welt, EREIGNIS.ENTFERNT, o.schluessel, 'E');
      freigeben(o);
    }
  }
}
