// Eingriffe eines Prüfstarts in W1 nach docs/spezifikation-welt.md, 11.3 und
// docs/spezifikation-kampf.md, 11.2.
//
// Ein Eingriff `frame, ziel, feld, wert` setzt in W1 des Frames einen Wert,
// Nachkommaanteil 0, und schreibt das Ereignis EI:<ziel>.<feld>=<wert>. Er
// setzt nur das Feld; Folgen (z. B. Tod bei LP < 0 ≤ lp_vor) erkennt das
// zuständige Modul im selben Frame. Gegner der Prüfszene mit erscheint = f
// (f > 1) erscheinen ebenfalls in W1, vor den übrigen Eingriffen, Slots
// aufsteigend (Festlegung K0 für „in Frame f erscheint ein Gegner“).
//
// Ziele und Felder:
//   f        x z h (px), lp, lp_max, blick (R/L), schutz, waffe (RW/leer), munition
//   sN       x z h, lp, lp_max, blick
//   oN, gN   x z h, lp, munition, liegezeit
//   rang     wert, zaehler, fest (ja/nein)
//   kamera   x (Ky nach kamera_y), modus
//   welle.N  jetzt (löst Welle N aus, wellen.ts welleAusloesen)

import type { Blick, Figur, Gegner, Objekt } from './entitaeten.ts';
import type { EingriffDaten, GegnerStart } from './start.ts';
import type { KameraModus, Welt } from './welt.ts';
import { ausGanz } from './festkomma.ts';
import { entitaet, objektVon } from './entitaeten.ts';
import { EREIGNIS, ereignis, eingriffText } from './ereignisse.ts';
import { kameraY, blickAusText } from './stage.ts';
import { gegnerAusSzene, gegnerUebergeben, gegnerZufallGeben } from './anlegen.ts';
import { welleAusloesen } from './wellen.ts';
import { ERSTER_FRAME, KOORDINATE_MAX } from './werte.ts';

/** Kamera-Modi für Eingriffe und Prüfstart (Welt 3). */
export const KAMERA_MODI: readonly KameraModus[] = ['FREI', 'SPERRE', 'HALT', 'BLENDE', 'ARENA', 'ENDE'];

const FELDER_FIGUR = ['x', 'z', 'h', 'lp', 'lp_max', 'blick', 'schutz', 'waffe', 'munition'];
const FELDER_GEGNER = ['x', 'z', 'h', 'lp', 'lp_max', 'blick'];
const FELDER_OBJEKT = ['x', 'z', 'h', 'lp', 'munition', 'liegezeit'];
const FELDER_RANG = ['wert', 'zaehler', 'fest'];
const FELDER_KAMERA = ['x', 'modus'];

function fehler(e: EingriffDaten, text: string): Error {
  return new RangeError(`Eingriff frame=${e.frame} ziel=${e.ziel} feld=${e.feld} wert=${e.wert}: ${text}`);
}

function ganzzahl(e: EingriffDaten): number {
  if (!/^-?\d+$/.test(e.wert)) throw fehler(e, 'Wert muss eine ganze Zahl sein');
  return Number(e.wert);
}

function koordinate(e: EingriffDaten): number {
  const n = ganzzahl(e);
  if (Math.abs(n) > KOORDINATE_MAX) throw fehler(e, `Koordinate außerhalb ±${KOORDINATE_MAX}`);
  return ausGanz(n);
}

function blickWert(e: EingriffDaten): Blick {
  return blickAusText(e.wert, () => fehler(e, 'Blick muss R oder L sein'));
}

/** Prüft einen Eingriff beim Laden (wirft bei unbekanntem Ziel oder Feld). */
export function eingriffPruefen(e: EingriffDaten): void {
  if (!Number.isInteger(e.frame) || e.frame < ERSTER_FRAME) throw fehler(e, 'frame muss ≥ 1 sein');
  const welle = /^welle\.(\d+)$/.exec(e.ziel);
  if (welle !== null) {
    if (e.feld !== 'jetzt') throw fehler(e, 'für welle.N gibt es nur das Feld jetzt');
    return;
  }
  let felder: string[];
  if (e.ziel === 'f') felder = FELDER_FIGUR;
  else if (/^s\d+$/.test(e.ziel)) felder = FELDER_GEGNER;
  else if (/^[og]\d+$/.test(e.ziel)) felder = FELDER_OBJEKT;
  else if (e.ziel === 'rang') felder = FELDER_RANG;
  else if (e.ziel === 'kamera') felder = FELDER_KAMERA;
  else throw fehler(e, 'unbekanntes Ziel (f, sN, oN, gN, rang, kamera, welle.N)');
  if (!felder.includes(e.feld)) throw fehler(e, `unbekanntes Feld (erlaubt: ${felder.join(' ')})`);
}

function setzeGemeinsam(ziel: Figur | Gegner | Objekt, e: EingriffDaten): boolean {
  switch (e.feld) {
    case 'x':
      ziel.x = koordinate(e);
      return true;
    case 'z':
      ziel.z = koordinate(e);
      return true;
    case 'h':
      ziel.h = koordinate(e);
      return true;
    case 'lp':
      ziel.lp = ganzzahl(e);
      return true;
    case 'lp_max':
      ziel.lp_max = ganzzahl(e);
      return true;
    default:
      return false;
  }
}

/** Wendet einen Eingriff an (W1) und schreibt EI. */
export function eingriffAnwenden(welt: Welt, e: EingriffDaten): void {
  eingriffPruefen(e);
  const welle = /^welle\.(\d+)$/.exec(e.ziel);
  if (welle !== null) {
    welleAusloesen(welt, Number(welle[1]));
  } else if (e.ziel === 'rang') {
    if (e.feld === 'wert') welt.rang.rang = ganzzahl(e);
    else if (e.feld === 'zaehler') welt.rang.zaehler = ganzzahl(e);
    else welt.rang.fest = e.wert === 'ja' || e.wert === 'an';
  } else if (e.ziel === 'kamera') {
    if (e.feld === 'x') {
      welt.kamera.x = ganzzahl(e);
      welt.kamera.y = kameraY(welt.stage, welt.kamera.x);
    } else {
      const m = KAMERA_MODI.find((k) => k === e.wert);
      if (m === undefined) throw fehler(e, `Modus unbekannt (${KAMERA_MODI.join(' ')})`);
      welt.kamera.modus = m;
    }
  } else {
    const ziel = entitaet(welt, e.ziel as `s${number}`);
    if (ziel === null) throw fehler(e, 'Slot gibt es nicht');
    if (!setzeGemeinsam(ziel, e)) {
      if (e.feld === 'blick') {
        ziel.blick = blickWert(e);
      } else if (ziel === welt.figur) {
        const f = welt.figur;
        if (e.feld === 'schutz') f.schutz = ganzzahl(e);
        else if (e.feld === 'munition') f.munition = ganzzahl(e);
        else if (e.feld === 'waffe') {
          if (e.wert !== 'RW' && e.wert !== 'leer' && e.wert !== '') throw fehler(e, 'Waffe muss RW oder leer sein');
          f.waffe = e.wert === 'RW' ? 'RW' : '';
        }
      } else {
        const o = objektVon(welt, ziel.schluessel);
        if (o === null) throw fehler(e, 'Feld gibt es nur für Objekte');
        if (e.feld === 'munition') o.munition = ganzzahl(e);
        else if (e.feld === 'liegezeit') o.liegezeit = ganzzahl(e);
      }
    }
  }
  ereignis(welt, EREIGNIS.EINGRIFF, eingriffText(e.ziel, e.feld, e.wert));
}

/** Gegner der Prüfszene, die in Frame f (f > 1) erscheinen, Slots aufsteigend. */
function erscheinendeGegner(welt: Welt, f: number): GegnerStart[] {
  return welt.start.gegner.filter((g) => g.erscheint > ERSTER_FRAME && g.erscheint === f).sort((a, b) => a.slot - b.slot);
}

/** W1 (Welt 1, 11.3): erscheinende Gegner und Eingriffe dieses Frames in Szenenreihenfolge. */
export function eingriffeAusfuehren(welt: Welt): void {
  const f = welt.frame;
  for (const gs of erscheinendeGegner(welt, f)) {
    const g = gegnerAusSzene(welt, gs);
    gegnerZufallGeben(welt, g);
    gegnerUebergeben(welt, g);
    ereignis(welt, EREIGNIS.EINGRIFF, eingriffText(g.schluessel, 'erscheint', gs.typ));
  }
  for (const e of welt.start.eingriffe) if (e.frame === f) eingriffAnwenden(welt, e);
}
