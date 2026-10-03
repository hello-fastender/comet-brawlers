// Gegenstände und Waffen auf der Seite der Figur (K1) nach
// docs/spezifikation-kampf.md, 10.1 (Aufnehmen), 10.2 (Essen), 10.3
// (Raketenwerfer, Rakete, Explosion) und 10.4 (Verlieren, Tausch).
//
// Liegezeit, Blinken und Verschwinden der Gegenstände zählt K3
// (gegenstaende.ts, Welt 9.3): Die Figur legt eine fallen gelassene Waffe mit
// landung_l = L und liegezeit 0 an, eine leere Waffe als Objekt typ Waffe mit
// lebensdauer 61.

import type { GegenstandArt, Objekt } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Welt } from '../welt.ts';
import { add, ausGanz, ganz, maxF, mulGanz, sub } from '../festkomma.ts';
import { abstand, freiesGeschoss, freiesObjekt, freigeben, objektBelegen } from '../entitaeten.ts';
import { EREIGNIS, ereignis, pfeil } from '../ereignisse.ts';
import { begehbar } from '../stage.ts';
import {
  AUFNEHMEN_BEREICH,
  AUFNEHMEN_TIEFE,
  FIGUR_LP,
  HEILUNG_EISNUDELSCHALE,
  HEILUNG_STERNBEEREN,
  IM_BILD_MAX,
  LEERE_WAFFE_LEBENSDAUER,
  PUNKTE_ESSEN_VOLL,
  RAKETE_ABSCHUSS,
  RAKETE_EINSCHLAG,
  RAKETE_SINKEN,
  RAKETE_START_H,
  RAKETE_START_X,
  RAKETE_V,
  RX_DAUER,
} from '../werte.ts';
import { tab, explosionInstanz } from './angriffe.ts';
import { behaelterHindernisse } from './basis.ts';

/** Art der Waffe in der Hand als Gegenstand (Kampf 10.3: in der Scheibe nur der Raketenwerfer). */
const WAFFE_ART: GegenstandArt = 'Raketenwerfer';

/**
 * Gegenstand in Aufnahmereichweite (Kampf 10.1): aufnehmbar, |dz| ≤ 12,
 * d_vorn im Bereich seiner Art, für beide Blickrichtungen gleich (E14);
 * mehrere: kleinstes |dx|, dann kleinste Slotnummer (P20).
 */
export function gegenstandSuchen(welt: Welt): Objekt | null {
  const f = welt.figur;
  let ziel: Objekt | null = null;
  let besterDx = 0;
  for (const o of welt.objekte) {
    if (!o.belegt || o.typ !== 'Gegenstand' || !o.aufnehmbar) continue;
    if (o.art !== 'Raketenwerfer' && o.art !== 'Kometenbraten' && o.art !== 'Eisnudelschale' && o.art !== 'Sternbeeren') continue;
    const bereich = AUFNEHMEN_BEREICH[o.art];
    const a = abstand(f, o);
    if (Math.abs(a.dz) > AUFNEHMEN_TIEFE) continue;
    if (a.d_vorn < -bereich.hinten || a.d_vorn > bereich.vorn) continue;
    const dx = Math.abs(a.dx);
    if (ziel === null || dx < besterDx) {
      ziel = o;
      besterDx = dx;
    }
  }
  return ziel;
}

/** Legt eine Waffe am Ort der Figur auf Höhe 0 ab (Kampf 10.4, P27): Liegezeit 700 ab L = dieser Frame, aufnehmbar. */
function waffeAblegen(welt: Welt, munition: number): void {
  const f = welt.figur;
  const o = freiesObjekt(welt);
  if (o === null) {
    ereignis(welt, EREIGNIS.OBJEKT_VOLL, WAFFE_ART);
    return;
  }
  objektBelegen(o, 'Gegenstand');
  o.art = WAFFE_ART;
  o.id = o.schluessel;
  o.x = f.x;
  o.z = f.z;
  o.h = 0;
  o.munition = munition;
  o.aufnehmbar = true;
  o.landung_l = welt.frame;
  o.liegezeit = 0;
  ereignis(welt, EREIGNIS.WAFFE_FALLEN, 'F', WAFFE_ART, munition);
}

/**
 * Wirkung des Aufnehmens in P+1 (Kampf 10.1 bis 10.4): Gegenstand weg,
 * Ereignis AU:F>on:Art; Waffe in die Hand (eine alte fällt mit Restmunition),
 * Essen heilt bis 72 LP, bei 72 LP 100 Punkte statt der Heilung (Welt 10.2).
 */
export function aufnehmenWirkung(welt: Welt, o: Objekt): void {
  const f = welt.figur;
  const art = o.art;
  const munition = o.munition;
  ereignis(welt, EREIGNIS.AUFNEHMEN, pfeil('f', o.schluessel), art);
  freigeben(o);
  if (art === 'Raketenwerfer') {
    const alte = f.waffe !== '' ? f.munition : null;
    f.waffe = 'RW';
    f.munition = munition;
    if (alte !== null) waffeAblegen(welt, alte);
    return;
  }
  if (f.lp >= FIGUR_LP) {
    welt.rahmen.punkte += PUNKTE_ESSEN_VOLL;
    return;
  }
  let lp = FIGUR_LP;
  if (art === 'Eisnudelschale') lp = f.lp + tab(HEILUNG_EISNUDELSCHALE, 0);
  else if (art === 'Sternbeeren') lp = f.lp + tab(HEILUNG_STERNBEEREN, 0);
  f.lp = Math.min(lp, FIGUR_LP);
}

/** Waffe fällt in H+1 nach einem wirksamen Gegnertreffer (Kampf 10.4): Ereignis WA:F:Art:Munition. */
export function waffeFallen(welt: Welt): void {
  const f = welt.figur;
  f.waffe_fallen_frame = 0;
  if (f.waffe === '') return;
  const munition = f.munition;
  f.waffe = '';
  f.munition = 0;
  waffeAblegen(welt, munition);
}

/** Munition leer: in P+18 weggeworfen, nicht aufnehmbar, nach 61 Frames verschwunden (Kampf 10.3; K3 zählt lebensdauer). */
export function waffeWegwerfen(welt: Welt): void {
  const f = welt.figur;
  f.waffe = '';
  f.munition = 0;
  const o = freiesObjekt(welt);
  if (o === null) {
    ereignis(welt, EREIGNIS.OBJEKT_VOLL, WAFFE_ART);
    return;
  }
  objektBelegen(o, 'Waffe');
  o.art = WAFFE_ART;
  o.id = o.schluessel;
  o.x = f.x;
  o.z = f.z;
  o.h = 0;
  o.aufnehmbar = false;
  o.lebensdauer = LEERE_WAFFE_LEBENSDAUER;
  ereignis(welt, EREIGNIS.WAFFE_FALLEN, 'F', WAFFE_ART, 0);
}

/**
 * Abschuss in P+7 (Kampf 10.3): Munition −1, Rakete im ersten freien Slot g0
 * bis g4, 58 px vor der Figur, 50 px hoch, in ihrer Tiefe, Blickrichtung der
 * Figur; Ereignis AB:gn. Im Abschussframe steht die Rakete.
 */
export function raketeAbschiessen(welt: Welt): void {
  const f = welt.figur;
  if (f.munition <= 0) return;
  f.munition -= 1;
  const o = freiesGeschoss(welt);
  if (o === null) return;
  objektBelegen(o, 'Rakete');
  o.id = o.schluessel;
  o.x = add(f.x, mulGanz(ausGanz(RAKETE_START_X), f.blick));
  o.z = f.z;
  o.h = RAKETE_START_H;
  o.blick = f.blick;
  o.bahn_richtung = f.blick;
  o.flugphase = 'FLUG';
  o.besitzer = 'f';
  o.abschuss = f.p;
  o.flug_n = 0;
  ereignis(welt, EREIGNIS.ABSCHUSS, o.schluessel);
}

/**
 * Kann die Rakete nach x fliegen (Kampf 10.3: Einschlag früher an Wänden,
 * Behältern und am Bildrand)? Wand = Grenze des Tiefenbands bzw. Hindernis,
 * Behälter unabhängig von der Flughöhe, Bildrand 0 ≤ x − K ≤ 383 nur, wo die
 * Bildränder gelten (Welt 2.2; nicht auf der Prüfbühne).
 */
function raketeFrei(welt: Welt, x: Fest, z: Fest): boolean {
  const gx = ganz(x);
  if (welt.stage.raender) {
    const s = gx - welt.kamera.x;
    if (s < 0 || s > IM_BILD_MAX) return false;
  }
  return begehbar(welt.stage, gx, ganz(z), 0, behaelterHindernisse(welt));
}

/** Einschlag (Kampf 10.3): Explosion RX am Einschlagpunkt, 15 Frames aktiv, Ereignis EX:gn. */
function einschlag(welt: Welt, o: Objekt): void {
  o.flugphase = 'EXPLOSION';
  o.einschlag_x = ganz(o.x);
  o.einschlag_z = ganz(o.z);
  o.lebensdauer = RX_DAUER;
  o.angriff = explosionInstanz(o.schluessel, o.einschlag_x, o.einschlag_z, o.bahn_richtung, o.abschuss);
  o.angriff.aktiv = true;
  ereignis(welt, EREIGNIS.EINSCHLAG, o.schluessel);
}

/**
 * KS4 (Kampf 10.3): Raketen der Figur in g0 bis g4 aufsteigend. Flug 5 px je
 * Frame in x, Höhe sinkt 2,375 px (P9), im Flug kein Treffer; frei fliegend
 * Einschlag in P+28 (21 Flugframes), sonst früher an der letzten freien Lage;
 * Explosion P+28 bis P+42, danach Slot frei.
 */
export function raketenSchritt(welt: Welt): void {
  const flugframes = RAKETE_EINSCHLAG - RAKETE_ABSCHUSS;
  for (const o of welt.geschosse) {
    if (!o.belegt || o.typ !== 'Rakete') continue;
    if (o.flugphase === 'FLUG') {
      if (welt.frame <= o.abschuss + RAKETE_ABSCHUSS) continue;
      o.flug_n += 1;
      const nx = add(o.x, mulGanz(RAKETE_V, o.bahn_richtung));
      if (!raketeFrei(welt, nx, o.z)) {
        einschlag(welt, o);
        continue;
      }
      o.x = nx;
      o.h = maxF(sub(o.h, RAKETE_SINKEN), 0);
      if (o.flug_n >= flugframes) einschlag(welt, o);
    } else if (o.flugphase === 'EXPLOSION') {
      o.lebensdauer -= 1;
      if (o.lebensdauer <= 0) {
        freigeben(o);
        continue;
      }
      if (o.angriff !== null) o.angriff.aktiv = true;
    }
  }
}
