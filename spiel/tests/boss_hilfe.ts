// Hilfen der Bosstests (K4; keine Testdatei: das Muster *.test.ts trifft sie nicht).
//
// Die Bosstests laufen ohne die Module der anderen Agenten: bossLauf führt
// je Frame nur die Teile von logikSchritt aus, die den Boss betreffen
// (Vorlauf, W4 bossEntscheidung, KS3 bossBewegung, KS5 bossAbbruch, KS7
// bossGetroffen und bossHatGetroffen, W5 bossW5). Treffer der Figur und des
// Bosses entstehen von Hand (treffer.ts prüft erst in Stufe 3 mit).

import type { AngriffCode, Bahn, Blick, Gegner, Treffer } from '../src/kern/entitaeten.ts';
import type { Welt } from '../src/kern/welt.ts';
import { angriffsinstanz, vorframeKopieren } from '../src/kern/entitaeten.ts';
import { zuDezimalText } from '../src/kern/festkomma.ts';
import { bossAbbruch, bossBewegung, bossEntscheidung, bossGetroffen, bossHatGetroffen, bossW5 } from '../src/kern/gegner/boss.ts';
import { parseStage } from '../src/kern/stage.ts';
import { erzeugeWelt } from '../src/kern/welt.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { lies, stageText } from './hilfe.ts';

/**
 * Welt aus einer Prüfszene (Datei relativ zu spiel/) mit zusätzlichen Zeilen
 * (spätere pruefstart-Angaben gelten, z. B. pruefstart figur.x=1900) und
 * wahlweise anderem Seed.
 */
export function bossWelt(szene: string, zusatz: string = '', seed: number | null = null): Welt {
  let text = lies(szene);
  if (seed !== null) text = text.replace(/seed=\d+/, `seed=${seed}`);
  const start = parseSzene(text + '\n' + zusatz + '\n');
  return erzeugeWelt(parseStage(stageText(start.buehne)), start);
}

/** Der Boss in s0. */
export function boss(welt: Welt): Gegner {
  return welt.gegner[0] as Gegner;
}

/** Geplanter Treffer der Figur auf den Boss. */
export interface TrefferPlan {
  code: AngriffCode;
  schaden: number;
  umwerfen?: boolean;
  /** Figur steht vor dem Boss (Standard ja) */
  von_vorn?: boolean;
  /** Flugrichtung beim Umwerfen (Standard: Blick der Figur) */
  richtung?: Blick;
  bahn?: Bahn;
}

/** Treffer der Figur auf den Boss wie von treffer.ts angelegt (wirkung ''). */
export function trefferAufBoss(welt: Welt, p: TrefferPlan): Treffer {
  const umwerfen = p.umwerfen ?? false;
  const instanz = angriffsinstanz({
    code: p.code,
    angreifer: 'f',
    flaeche: { art: 'abstand', vorn: 100, hinten: 0, hinten_weg: null, tiefe: 12, hoehe_angreifer_max: 0, hoehe_ziel_max: null },
    schaden: p.schaden,
    umwerfen,
    trefferstopp: true,
    gegen: 'gegner',
    beginn: welt.frame,
  });
  instanz.getroffen.push('s0');
  return {
    angreifer: 'f',
    urheber: 'f',
    ziel: 's0',
    code: p.code,
    schaden: p.schaden,
    umwerfen,
    bahn: p.bahn ?? (umwerfen ? 'F1' : ''),
    richtung: p.richtung ?? welt.figur.blick,
    von_vorn: p.von_vorn ?? true,
    wirkung: '',
    lp_vorher: 0,
    instanz,
  };
}

/** Wirksamer Treffer der laufenden Instanz des Bosses auf die Figur (wie treffer.ts und schaden.ts ihn hinterließen). */
function trefferDesBosses(welt: Welt, g: Gegner): Treffer {
  const inst = g.angriff;
  if (inst === null || !inst.aktiv) throw new Error(`Frame ${welt.frame}: Boss hat keine aktive Instanz`);
  inst.getroffen.push('f');
  return {
    angreifer: 's0',
    urheber: 's0',
    ziel: 'f',
    code: inst.code,
    schaden: inst.schaden,
    umwerfen: inst.umwerfen,
    bahn: inst.bahn,
    richtung: welt.figur.x > g.x ? 1 : -1,
    von_vorn: true,
    wirkung: 'R',
    lp_vorher: welt.figur.lp,
    instanz: inst,
  };
}

/** Zustand des Bosses am Ende eines Frames. */
export interface Schnappschuss {
  frame: number;
  lp: number;
  lp_folge: number;
  folge: number;
  modus: string;
  aktion: string;
  zustand: number;
  timer: number;
  /** Positionen als Dezimaltext wie im Protokoll */
  x: string;
  z: string;
  h: string;
  angriff_code: string;
  /** eigene Instanz aktiv in diesem Frame */
  aktiv: boolean;
  ereignisse: string[];
}

/** Plan eines Laufs. */
export interface Plan {
  /** Treffer der Figur auf den Boss je Frame */
  treffer?: Record<number, TrefferPlan[]>;
  /** Frames, in denen die aktive Instanz des Bosses die Figur wirksam trifft */
  bossTrifft?: number[];
  /** wird zu Beginn jedes Frames (vor W1) mit der Nummer des kommenden Frames aufgerufen */
  vorher?: (welt: Welt, f: number) => void;
  /** wird in W3 jedes Frames aufgerufen (nach dem Leeren der Ereignisse, vor W4), z. B. wellenAnlegen für den Weckreiz */
  w3?: (welt: Welt) => void;
}

/** Lässt die bossbezogenen Schritte bis einschließlich Frame bis laufen; Ergebnis je Frame (Index = Frame). */
export function bossLauf(welt: Welt, bis: number, plan: Plan = {}): Schnappschuss[] {
  const verlauf: Schnappschuss[] = [];
  while (welt.frame < bis) {
    const f = welt.frame + 1;
    plan.vorher?.(welt, f);
    welt.frame = f;
    welt.ereignisse = [];
    welt.treffer = [];
    vorframeKopieren(welt);
    for (const g of welt.gegner) if (g.belegt) g.modus_uhr += 1;
    plan.w3?.(welt);
    const g = boss(welt);
    if (g.belegt) bossEntscheidung(welt, g);
    if (g.belegt) bossBewegung(welt, g);
    if (g.belegt) bossAbbruch(welt, g);
    // KS6/KS7 von Hand: erst Treffer der Figur (Kampf 5.4), dann der des Bosses
    for (const p of plan.treffer?.[f] ?? []) {
      const t = trefferAufBoss(welt, p);
      welt.treffer.push(t);
      bossGetroffen(welt, t);
      if (t.wirkung === '') throw new Error('bossGetroffen hat keine Wirkung gesetzt');
    }
    if ((plan.bossTrifft ?? []).includes(f)) {
      const t = trefferDesBosses(welt, g);
      welt.treffer.push(t);
      bossHatGetroffen(welt, t);
    }
    bossW5(welt);
    verlauf[f] = {
      frame: f,
      lp: g.lp,
      lp_folge: g.lp_folge,
      folge: g.folge,
      modus: g.modus,
      aktion: g.aktion,
      zustand: g.zustand,
      timer: g.modus_uhr,
      x: zuDezimalText(g.x),
      z: zuDezimalText(g.z),
      h: zuDezimalText(g.h),
      angriff_code: g.angriff_code,
      aktiv: g.angriff !== null && g.angriff.urheber === 's0' && g.angriff.aktiv,
      ereignisse: [...welt.ereignisse],
    };
  }
  return verlauf;
}

/** Frames im Bereich [von, bis], in denen die Bedingung gilt. */
export function frames(verlauf: Schnappschuss[], von: number, bis: number, bed: (s: Schnappschuss) => boolean): number[] {
  const r: number[] = [];
  for (let f = von; f <= bis; f++) {
    const s = verlauf[f];
    if (s !== undefined && bed(s)) r.push(f);
  }
  return r;
}

/** Schnappschuss eines Frames (wirft, wenn er fehlt). */
export function bei(verlauf: Schnappschuss[], f: number): Schnappschuss {
  const s = verlauf[f];
  if (s === undefined) throw new Error(`Frame ${f} fehlt`);
  return s;
}
