// Testhilfen für die Spielfigur (K1), keine Testdatei.
//
// Schrittfolge nur mit den Funktionen der Figur in der Reihenfolge von
// welt.ts (KS1, KS2, KS4, KS7, griffPruefen), damit die Tests nicht von
// Trefferprüfung und Gegnerlogik abhängen: Treffer werden über einen Haken in
// KS7 eingespeist (wie trefferPruefen sie anlegen würde).

import type { Angriffsinstanz, SlotKey, Treffer } from '../src/kern/entitaeten.ts';
import type { Tasten } from '../src/kern/tasten.ts';
import type { Welt } from '../src/kern/welt.ts';
import { angriffsinstanz, vorframeKopieren } from '../src/kern/entitaeten.ts';
import { zuDezimalText } from '../src/kern/festkomma.ts';
import { figurEingabe, figurGeschosseSchritt, figurHatGetroffen, figurSchritt, griffPruefen } from '../src/kern/figur/figur.ts';
import { figurGetroffen } from '../src/kern/schaden.ts';
import { parseStage } from '../src/kern/stage.ts';
import { ALLE, KEINE, neuGedrueckt } from '../src/kern/tasten.ts';
import { erzeugeWelt } from '../src/kern/welt.ts';
import { parseEingabe, tastenIn } from '../src/pruef/eingabe.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { stageText } from './hilfe.ts';

/** Standard der Abnahmetests (Kampf 12): Prüfbühne, Figur x 100, z 100, Blick rechts. */
export const STANDARD = 'szene name=figur endframe=400 seed=1 buehne=pruefbuehne\npruefstart rang=9 rang.fest\nfigur x=100 z=100 blick=R\n';

/** Welt aus einer Prüfszene (Text). */
export function weltAus(szene: string = STANDARD): Welt {
  const start = parseSzene(szene);
  return erzeugeWelt(parseStage(stageText(start.buehne)), start);
}

/** Zustand der Figur am Ende eines Frames (Spaltennamen wie im Protokoll). */
export interface Zeile {
  frame: number;
  f_x: string;
  f_z: string;
  f_h: string;
  f_lp: number;
  f_zst: number;
  f_akt: string;
  f_ph: string;
  f_uhr: number;
  f_stopp: number;
  f_schutz: number;
  f_blick: string;
  kombo: number;
  f_sprint: number;
  f_waffe: string;
  f_mun: number;
  /** Code der laufenden Instanz und ob sie aktiv ist */
  angriff: string;
  aktiv: boolean;
  ereignis: string;
}

function zeile(w: Welt): Zeile {
  const f = w.figur;
  return {
    frame: w.frame,
    f_x: zuDezimalText(f.x),
    f_z: zuDezimalText(f.z),
    f_h: zuDezimalText(f.h),
    f_lp: f.lp,
    f_zst: f.zustand,
    f_akt: f.aktion,
    f_ph: f.phase,
    f_uhr: f.uhr,
    f_stopp: f.stopp,
    f_schutz: f.schutz,
    f_blick: f.blick === 1 ? 'R' : 'L',
    kombo: f.kombo,
    f_sprint: f.sprint_n,
    f_waffe: f.waffe,
    f_mun: f.munition,
    angriff: f.angriff === null ? '' : f.angriff.code,
    aktiv: f.angriff !== null && f.angriff.aktiv,
    ereignis: w.ereignisse.join(';'),
  };
}

/** Haken in KS7: liefert die Treffer des Frames (Ziel Figur oder Urheber Figur). */
export type Haken = (w: Welt) => Treffer[];

/** Ein Logikschritt nur mit der Figur (Reihenfolge welt.ts, Kampf 2.2). */
export function schritt(w: Welt, tasten: Tasten, haken: Haken | null = null): Zeile {
  w.frame += 1;
  const e = w.eingabe;
  e.t2 = e.t1;
  e.t1 = e.t;
  e.t = tasten & ALLE;
  e.neu = KEINE;
  w.ereignisse = [];
  w.treffer = [];
  vorframeKopieren(w);
  e.neu = neuGedrueckt(e.t1, e.t2);
  figurEingabe(w);
  figurSchritt(w);
  figurGeschosseSchritt(w);
  const liste = haken === null ? [] : haken(w);
  w.treffer = liste;
  for (const t of liste) if (t.ziel === 'f') figurGetroffen(w, t);
  for (const t of liste) if (t.urheber === 'f' && t.wirkung !== 'W') figurHatGetroffen(w, t);
  griffPruefen(w);
  return zeile(w);
}

/** Läuft bis Frame bis mit einer Eingabedatei (Kampf 11.1) und gibt die Zeilen je Frame (Index = Frame). */
export function laufen(w: Welt, eingabe: string, bis: number, haken: Haken | null = null): Zeile[] {
  const folge = parseEingabe(eingabe);
  const zeilen: Zeile[] = [];
  zeilen[0] = zeile(w);
  while (w.frame < bis) {
    const z = schritt(w, tastenIn(folge, w.frame + 1), haken);
    zeilen[z.frame] = z;
  }
  return zeilen;
}

/** Zeile eines Frames (wirft, wenn es ihn nicht gibt). */
export function bei(zeilen: Zeile[], frame: number): Zeile {
  const z = zeilen[frame];
  if (z === undefined) throw new Error(`Frame ${frame} fehlt`);
  return z;
}

/** Treffer der laufenden Instanz der Figur auf ein Ziel (wie trefferPruefen ihn anlegt, Wirkung gesetzt). */
export function trefferDerFigur(w: Welt, ziel: SlotKey = 's0', wirkung: 'R' | 'U' | 'X' | 'B' = 'R'): Treffer {
  const inst = w.figur.angriff;
  if (inst === null) throw new Error('Figur hat keine Instanz');
  return trefferMit(inst, ziel, wirkung);
}

/** Treffer einer beliebigen Instanz (z. B. WG, RX). */
export function trefferMit(inst: Angriffsinstanz, ziel: SlotKey, wirkung: 'R' | 'U' | 'X' | 'B' | '' = 'R'): Treffer {
  inst.getroffen.push(ziel);
  return {
    angreifer: inst.angreifer,
    urheber: inst.urheber,
    ziel,
    code: inst.code,
    schaden: inst.schaden,
    umwerfen: inst.umwerfen,
    bahn: inst.bahn,
    richtung: 1,
    von_vorn: true,
    wirkung,
    lp_vorher: 0,
    instanz: inst,
  };
}

/** Gegnertreffer auf die Figur (Prüfangriff PA eines Gegners in angreifer). */
export function trefferAufFigur(angreifer: SlotKey, schaden: number, umwerfen: boolean, beginn: number): Treffer {
  const inst = angriffsinstanz({
    code: 'PA',
    angreifer,
    flaeche: { art: 'abstand', vorn: 0, hinten: 0, hinten_weg: null, tiefe: 0, hoehe_angreifer_max: null, hoehe_ziel_max: null },
    schaden,
    umwerfen,
    trefferstopp: false,
    gegen: 'figur',
    beginn,
  });
  return trefferMit(inst, 'f', '');
}

/** Haken, der in den genannten Frames einen Treffer der laufenden Instanz der Figur auf s0 einspeist, wenn sie aktiv ist. */
export function trefferIn(frames: readonly number[], ziel: SlotKey = 's0'): Haken {
  return (w) => (frames.includes(w.frame) && w.figur.angriff !== null && w.figur.angriff.aktiv ? [trefferDerFigur(w, ziel)] : []);
}

/** Frames, in denen die Instanz der Figur aktiv war. */
export function aktiveFrames(zeilen: Zeile[], von: number, bis: number): number[] {
  const r: number[] = [];
  for (let f = von; f <= bis; f++) if (bei(zeilen, f).aktiv) r.push(f);
  return r;
}
