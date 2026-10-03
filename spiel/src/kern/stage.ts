// Stage-Daten nach docs/spezifikation-welt.md, Abschnitt 2.
//
// Format (Welt 2.1): UTF-8, je Zeile ein Datensatz, zuerst die Satzart, dann
// Felder name=wert, getrennt durch Leerzeichen; # leitet einen Kommentar ein.
// Koordinaten sind ganze Pixel. Die Reihenfolge der gegner-Zeilen bestimmt
// die Slots (Welt 4.1), die der behaelter-Zeilen die Objektslots (Welt 9.1).
//
// Ergänzung K0 für die Prüfbühne (Kampf 11.2), im Satz stage:
//   kamera=fest   Kamera bleibt bei Kamera-x und Kamera-y des Starts
//   raender=aus   Welt 2.2 Punkt 4 (Bildränder und Stage-Ränder der Figur) gilt nicht
//
// Der Kern liest keine Dateien: parseStage nimmt den Text.

import type { Fest } from './festkomma.ts';
import { add, ausGanz, divGanz, ganz, nachkomma } from './festkomma.ts';
import type { Auftritt, BehaelterArt, Blick, GegenstandArt, GegnerTyp } from './entitaeten.ts';
import { BEHAELTER_HALB_X, BEHAELTER_HALB_Z, BEHAELTER_HOEHE } from './werte.ts';

// ===========================================================================
// Typen
// ===========================================================================

/** Tiefenband für x0 ≤ x < x1, Grenzen linear (Welt 2.1). */
export interface Band {
  x0: number;
  x1: number;
  unten0: number;
  unten1: number;
  oben0: number;
  oben1: number;
}

/** Ky als Funktion von K, linear, abgerundet (Welt 2.1). */
export interface KameraYSatz {
  k0: number;
  k1: number;
  y0: number;
  y1: number;
}

/** Punkt in der Ebene x/z. */
export interface Punkt {
  x: number;
  z: number;
}

/** Festes konvexes Vieleck in der Ebene x/z mit Höhe (Welt 2.1, 2.2). */
export interface Hindernis {
  id: string;
  punkte: Punkt[];
  hoehe: number;
}

/** Vorder- oder Hintergrundbild, ohne Wirkung auf die Logik (Welt 2.1). */
export interface BildSatz {
  id: string;
  x0: number;
  x1: number;
  /** Zeilen (vordergrund) */
  zeilen: number;
  /** Bildname (hintergrund) */
  bild: string;
}

/** Behälter (Welt 2.1, 9.2). */
export interface BehaelterSatz {
  id: string;
  art: BehaelterArt;
  x: number;
  z: number;
  inhalt: GegenstandArt | 'leer';
}

/** Vorplatzierter Gegner (Welt 2.1). */
export interface GegnerSatz {
  typ: GegnerTyp;
  x: number;
  z: number;
  auftritt: Auftritt;
  welle: number;
  werte: 'start' | 'rang';
  blick: Blick;
}

/** Auslöserart einer Welle (Welt 4.4). */
export type Ausloeser = 'kamera' | 'figur_abstand' | 'arena' | 'boss_lp';

/** Auslöser einer Welle (Welt 2.1, 4.4). */
export interface WelleSatz {
  nr: number;
  ausloeser: Ausloeser;
  wert: number;
  /** Zusatzbedingung lebende ≤ n, null = keine */
  lebende_max: number | null;
  bonus: number;
}

/** Neu erscheinender Gegner einer Welle (Welt 2.1). */
export interface EintragSatz {
  welle: number;
  typ: GegnerTyp;
  auftritt: Auftritt;
  z: number;
  verzoegerung: number;
}

/** Sperre bis „Welle besiegt“ (Welt 2.1, KA4). */
export interface SperreSatz {
  id: string;
  kamera_x: number;
  welle: number;
}

/** Halt, solange mehr Gegner leben (Welt 2.1, KA6). */
export interface HaltSatz {
  id: string;
  kamera_x: number;
  max_lebende: number;
}

/** Blende in einen anderen Teil der Stage (Welt 2.1, KA13). */
export interface SchnittSatz {
  kamera_x: number;
  figur_x: number;
  ziel_kamera_x: number;
  ziel_x: number;
  ziel_z: number;
}

/** Bossarena (Welt 2.1, KA7, KA8). */
export interface ArenaSatz {
  k0: number;
  k1: number;
  totzone_links: number;
  totzone_rechts: number;
}

/** Eine geladene Stage (Welt 2). */
export interface Stage {
  id: string;
  name: string;
  x_ende: number;
  kamera_x_max: number;
  start_x: number;
  start_z: number;
  start_blick: Blick;
  /** Kamera fest (Prüfbühne, Kampf 11.2) */
  kamera_fest: boolean;
  /** Welt 2.2 Punkt 4 gilt (false auf der Prüfbühne) */
  raender: boolean;
  baender: Band[];
  kamera_y: KameraYSatz[];
  hindernisse: Hindernis[];
  vordergrund: BildSatz[];
  hintergrund: BildSatz[];
  behaelter: BehaelterSatz[];
  gegner: GegnerSatz[];
  wellen: WelleSatz[];
  eintraege: EintragSatz[];
  sperren: SperreSatz[];
  halte: HaltSatz[];
  schnitte: SchnittSatz[];
  arena: ArenaSatz | null;
}

// ===========================================================================
// Zeilenformat (gemeinsam mit der Prüfszene, src/pruef/szene.ts)
// ===========================================================================

/** Eine Datenzeile: Satzart und Felder in ihrer Reihenfolge. */
export interface SatzZeile {
  /** Zeilennummer ab 1 */
  nr: number;
  satzart: string;
  /** Felder in Dateireihenfolge; ein Feld ohne „=“ hat den Wert „ja“ */
  felder: [string, string][];
}

/**
 * Zerlegt einen Text im Satzformat (Welt 2.1) in Datenzeilen. # beginnt einen
 * Kommentar bis zum Zeilenende; leere Zeilen entfallen. Doppelte Feldnamen in
 * einer Zeile sind ein Fehler.
 */
export function satzZeilen(text: string): SatzZeile[] {
  const zeilen: SatzZeile[] = [];
  const roh = text.replace(/^﻿/, '').split('\n');
  for (let i = 0; i < roh.length; i++) {
    const ohneKommentar = (roh[i] as string).replace(/\r$/, '').replace(/#.*$/, '').trim();
    if (ohneKommentar === '') continue;
    const teile = ohneKommentar.split(/\s+/);
    const satzart = teile[0] as string;
    const felder: [string, string][] = [];
    const gesehen = new Set<string>();
    for (const teil of teile.slice(1)) {
      const p = teil.indexOf('=');
      const name = p < 0 ? teil : teil.slice(0, p);
      const wert = p < 0 ? 'ja' : teil.slice(p + 1);
      if (name === '') throw new SyntaxError(`Zeile ${i + 1}: Feld ohne Namen („${teil}“)`);
      if (gesehen.has(name)) throw new SyntaxError(`Zeile ${i + 1}: Feld „${name}“ doppelt`);
      gesehen.add(name);
      felder.push([name, wert]);
    }
    zeilen.push({ nr: i + 1, satzart, felder });
  }
  return zeilen;
}

/** Zugriff auf die Felder einer Zeile mit Prüfung. */
export class Felder {
  readonly zeile: SatzZeile;
  private readonly werte: Map<string, string>;
  private readonly benutzt = new Set<string>();

  constructor(zeile: SatzZeile) {
    this.zeile = zeile;
    this.werte = new Map(zeile.felder);
  }

  private fehler(text: string): SyntaxError {
    return new SyntaxError(`Zeile ${this.zeile.nr} (${this.zeile.satzart}): ${text}`);
  }

  hat(name: string): boolean {
    return this.werte.has(name);
  }

  text(name: string, standard?: string): string {
    this.benutzt.add(name);
    const w = this.werte.get(name);
    if (w !== undefined) return w;
    if (standard !== undefined) return standard;
    throw this.fehler(`Feld „${name}“ fehlt`);
  }

  ganz(name: string, standard?: number): number {
    const w = this.text(name, standard === undefined ? undefined : String(standard));
    if (!/^-?\d+$/.test(w)) throw this.fehler(`Feld „${name}“ muss eine ganze Zahl sein, nicht „${w}“`);
    return Number(w);
  }

  /** Optionale ganze Zahl: null, wenn das Feld fehlt. */
  ganzOder(name: string): number | null {
    return this.hat(name) ? this.ganz(name) : null;
  }

  jaNein(name: string, standard?: boolean): boolean {
    const w = this.text(name, standard === undefined ? undefined : standard ? 'ja' : 'nein').toLowerCase();
    if (w === 'ja' || w === 'an' || w === '1') return true;
    if (w === 'nein' || w === 'aus' || w === '0') return false;
    throw this.fehler(`Feld „${name}“ muss ja/nein bzw. an/aus sein, nicht „${w}“`);
  }

  blick(name: string, standard?: Blick): Blick {
    const w = this.text(name, standard === undefined ? undefined : standard === 1 ? 'rechts' : 'links');
    return blickAusText(w, () => this.fehler(`Feld „${name}“: Blick „${w}“ unbekannt (rechts/links/R/L)`));
  }

  /** Wirft, wenn die Zeile Felder enthält, die nicht gelesen wurden. */
  pruefeRest(): void {
    for (const [name] of this.zeile.felder) {
      if (!this.benutzt.has(name)) throw this.fehler(`unbekanntes Feld „${name}“`);
    }
  }
}

/** Blick aus „rechts“, „links“, „R“, „L“, „+1“, „-1“. */
export function blickAusText(w: string, fehler: () => Error): Blick {
  const k = w.toLowerCase();
  if (k === 'rechts' || k === 'r' || k === '1' || k === '+1') return 1;
  if (k === 'links' || k === 'l' || k === '-1') return -1;
  throw fehler();
}

/** Gegnertyp aus Text (Groß-/Kleinschreibung egal, „Zuender“ = „Zünder“). */
export function gegnerTypAusText(w: string, fehler: () => Error): GegnerTyp {
  const k = w.toLowerCase().replace('ue', 'ü');
  switch (k) {
    case 'bolzer':
      return 'Bolzer';
    case 'rammbock':
      return 'Rammbock';
    case 'zünder':
      return 'Zünder';
    case 'ballast':
      return 'Ballast';
    case 'puppe':
      return 'Puppe';
    default:
      throw fehler();
  }
}

/** Gegenstandsart aus Text (Groß-/Kleinschreibung egal). */
export function gegenstandAusText(w: string, fehler: () => Error): GegenstandArt {
  switch (w.toLowerCase()) {
    case 'kometenbraten':
      return 'Kometenbraten';
    case 'eisnudelschale':
      return 'Eisnudelschale';
    case 'sternbeeren':
      return 'Sternbeeren';
    case 'raketenwerfer':
    case 'rw':
      return 'Raketenwerfer';
    default:
      throw fehler();
  }
}

/** Behälterart aus Text. */
export function behaelterArtAusText(w: string, fehler: () => Error): BehaelterArt {
  switch (w.toLowerCase()) {
    case 'fass':
      return 'Fass';
    case 'bosskiste':
      return 'Bosskiste';
    default:
      throw fehler();
  }
}

/** Behälterinhalt: Gegenstandsart oder „leer“. */
export function inhaltAusText(w: string, fehler: () => Error): GegenstandArt | 'leer' {
  if (w.toLowerCase() === 'leer') return 'leer';
  return gegenstandAusText(w, fehler);
}

/** Auftritt aus Text (Welt 4.2). */
export function auftrittAusText(w: string, fehler: () => Error): Auftritt {
  switch (w) {
    case 'hocke':
    case 'versteck':
    case 'luke':
    case 'rand_links':
    case 'rand_rechts':
    case 'boss':
      return w;
    default:
      throw fehler();
  }
}

// ===========================================================================
// Parser
// ===========================================================================

function stageLeer(): Stage {
  return {
    id: '',
    name: '',
    x_ende: 0,
    kamera_x_max: 0,
    start_x: 0,
    start_z: 0,
    start_blick: 1,
    kamera_fest: false,
    raender: true,
    baender: [],
    kamera_y: [],
    hindernisse: [],
    vordergrund: [],
    hintergrund: [],
    behaelter: [],
    gegner: [],
    wellen: [],
    eintraege: [],
    sperren: [],
    halte: [],
    schnitte: [],
    arena: null,
  };
}

function punkteAusText(w: string, fehler: () => Error): Punkt[] {
  const punkte: Punkt[] = [];
  for (const teil of w.split(';')) {
    if (teil.trim() === '') continue;
    const m = /^(-?\d+):(-?\d+)$/.exec(teil.trim());
    if (m === null) throw fehler();
    punkte.push({ x: Number(m[1]), z: Number(m[2]) });
  }
  if (punkte.length < 3) throw fehler();
  return punkte;
}

/** Zusatzbedingung „lebende≤n“ bzw. „lebende<=n“ (Welt 4.4). */
function bedingungAusText(w: string, fehler: () => Error): number {
  const m = /^lebende(?:≤|<=)(\d+)$/.exec(w);
  if (m === null) throw fehler();
  return Number(m[1]);
}

/** Liest Stage-Daten nach Welt 2.1. Wirft bei unbekannten Satzarten oder Feldern. */
export function parseStage(text: string): Stage {
  const s = stageLeer();
  let stageGesehen = false;
  for (const zeile of satzZeilen(text)) {
    const f = new Felder(zeile);
    const fehler = (was: string) => () => new SyntaxError(`Zeile ${zeile.nr} (${zeile.satzart}): ${was}`);
    switch (zeile.satzart) {
      case 'stage': {
        if (stageGesehen) throw new SyntaxError(`Zeile ${zeile.nr}: zweiter Satz stage`);
        stageGesehen = true;
        s.id = f.text('id');
        s.name = f.text('name', s.id);
        s.x_ende = f.ganz('x_ende');
        s.kamera_x_max = f.ganz('kamera_x_max');
        s.start_x = f.ganz('start_x');
        s.start_z = f.ganz('start_z');
        s.start_blick = f.blick('start_blick', 1);
        const kamera = f.text('kamera', 'folgt');
        if (kamera !== 'fest' && kamera !== 'folgt') throw fehler(`kamera=${kamera} unbekannt (fest/folgt)`)();
        s.kamera_fest = kamera === 'fest';
        s.raender = f.jaNein('raender', true);
        break;
      }
      case 'band':
        s.baender.push({
          x0: f.ganz('x0'),
          x1: f.ganz('x1'),
          unten0: f.ganz('unten0'),
          unten1: f.ganz('unten1'),
          oben0: f.ganz('oben0'),
          oben1: f.ganz('oben1'),
        });
        break;
      case 'kamera_y':
        s.kamera_y.push({ k0: f.ganz('k0'), k1: f.ganz('k1'), y0: f.ganz('y0'), y1: f.ganz('y1') });
        break;
      case 'hindernis':
        s.hindernisse.push({
          id: f.text('id'),
          punkte: punkteAusText(f.text('punkte'), fehler('punkte erwartet als x:z;x:z;… mit mindestens drei Punkten')),
          hoehe: f.ganz('hoehe'),
        });
        break;
      case 'vordergrund':
      case 'hintergrund': {
        const b: BildSatz = {
          id: f.text('id'),
          x0: f.ganz('x0'),
          x1: f.ganz('x1'),
          zeilen: f.ganz('zeilen', 0),
          bild: f.text('bild', ''),
        };
        (zeile.satzart === 'vordergrund' ? s.vordergrund : s.hintergrund).push(b);
        break;
      }
      case 'behaelter':
        s.behaelter.push({
          id: f.text('id'),
          art: behaelterArtAusText(f.text('art'), fehler('art unbekannt (fass/bosskiste)')),
          x: f.ganz('x'),
          z: f.ganz('z'),
          inhalt: inhaltAusText(f.text('inhalt', 'leer'), fehler('inhalt unbekannt')),
        });
        break;
      case 'gegner': {
        const werte = f.text('werte', 'rang');
        if (werte !== 'start' && werte !== 'rang') throw fehler(`werte=${werte} unbekannt (start/rang)`)();
        s.gegner.push({
          typ: gegnerTypAusText(f.text('typ'), fehler('typ unbekannt')),
          x: f.ganz('x'),
          z: f.ganz('z'),
          auftritt: auftrittAusText(f.text('auftritt'), fehler('auftritt unbekannt')),
          welle: f.ganz('welle', 0),
          werte,
          blick: f.blick('blick', -1),
        });
        break;
      }
      case 'welle': {
        const a = f.text('ausloeser');
        if (a !== 'kamera' && a !== 'figur_abstand' && a !== 'arena' && a !== 'boss_lp') {
          throw fehler(`ausloeser=${a} unbekannt (kamera/figur_abstand/arena/boss_lp)`)();
        }
        s.wellen.push({
          nr: f.ganz('nr'),
          ausloeser: a,
          wert: f.ganz('wert', 0),
          lebende_max: f.hat('bedingung') ? bedingungAusText(f.text('bedingung'), fehler('bedingung erwartet als lebende≤n')) : null,
          bonus: f.ganz('bonus', 0),
        });
        break;
      }
      case 'eintrag':
        s.eintraege.push({
          welle: f.ganz('welle'),
          typ: gegnerTypAusText(f.text('typ'), fehler('typ unbekannt')),
          auftritt: auftrittAusText(f.text('auftritt'), fehler('auftritt unbekannt')),
          z: f.ganz('z'),
          verzoegerung: f.ganz('verzoegerung', 0),
        });
        break;
      case 'sperre':
        s.sperren.push({ id: f.text('id'), kamera_x: f.ganz('kamera_x'), welle: f.ganz('welle') });
        break;
      case 'halt':
        s.halte.push({ id: f.text('id'), kamera_x: f.ganz('kamera_x'), max_lebende: f.ganz('max_lebende') });
        break;
      case 'schnitt':
        s.schnitte.push({
          kamera_x: f.ganz('kamera_x'),
          figur_x: f.ganz('figur_x'),
          ziel_kamera_x: f.ganz('ziel_kamera_x'),
          ziel_x: f.ganz('ziel_x'),
          ziel_z: f.ganz('ziel_z'),
        });
        break;
      case 'arena':
        if (s.arena !== null) throw new SyntaxError(`Zeile ${zeile.nr}: zweiter Satz arena`);
        s.arena = {
          k0: f.ganz('k0'),
          k1: f.ganz('k1'),
          totzone_links: f.ganz('totzone_links'),
          totzone_rechts: f.ganz('totzone_rechts'),
        };
        break;
      default:
        throw new SyntaxError(`Zeile ${zeile.nr}: unbekannte Satzart „${zeile.satzart}“`);
    }
    f.pruefeRest();
  }
  if (!stageGesehen) throw new SyntaxError('Stage-Daten ohne Satz stage');
  for (const b of s.baender) {
    if (b.x1 <= b.x0) throw new SyntaxError(`band x0=${b.x0} x1=${b.x1}: x1 muss größer als x0 sein`);
  }
  return s;
}

// ===========================================================================
// Bänder und Kamera-y (Welt 2.1, 2.2, 2.4)
// ===========================================================================

/** Linearer Verlauf zwischen (a0 bei p0) und (a1 bei p1), abgerundet (Kampf 2.4). */
function linear(a0: number, a1: number, p0: number, p1: number, p: number): number {
  if (p1 === p0) return a0;
  return a0 + divGanz((a1 - a0) * (p - p0), p1 - p0);
}

/** Band für die ganzzahlige Welt-x, oder null, wenn kein Band dort liegt. */
export function bandBei(stage: Stage, x: number): Band | null {
  for (const b of stage.baender) if (x >= b.x0 && x < b.x1) return b;
  return null;
}

/** Grenzen des Tiefenbands bei x: unten(x) und oben(x), abgerundet; null außerhalb aller Bänder. */
export function bandGrenzen(stage: Stage, x: number): { unten: number; oben: number } | null {
  const b = bandBei(stage, x);
  if (b === null) return null;
  return {
    unten: linear(b.unten0, b.unten1, b.x0, b.x1, x),
    oben: linear(b.oben0, b.oben1, b.x0, b.x1, x),
  };
}

/** Untergrenze unten(x) des Tiefenbands, null außerhalb. */
export function bandUnten(stage: Stage, x: number): number | null {
  return bandGrenzen(stage, x)?.unten ?? null;
}

/** Obergrenze oben(x) des Tiefenbands, null außerhalb. */
export function bandOben(stage: Stage, x: number): number | null {
  return bandGrenzen(stage, x)?.oben ?? null;
}

/**
 * Ky für Kamera-x K (Welt 2.1, KA9): innerhalb eines Satzes linear,
 * abgerundet; zwischen zwei Sätzen der Wert des vorigen (dessen y1); vor dem
 * ersten Satz dessen y0 (Festlegung K0); ohne Sätze 0.
 */
export function kameraY(stage: Stage, k: number): number {
  const saetze = [...stage.kamera_y].sort((a, b) => a.k0 - b.k0);
  if (saetze.length === 0) return 0;
  let wert = (saetze[0] as KameraYSatz).y0;
  for (const s of saetze) {
    if (k < s.k0) break;
    if (k <= s.k1) return linear(s.y0, s.y1, s.k0, s.k1, k);
    wert = s.y1;
  }
  return wert;
}

// ===========================================================================
// Hindernisse und begehbare Fläche (Welt 2.2)
// ===========================================================================

/**
 * Liegt der ganzzahlige Punkt (x, z) im konvexen Vieleck? Der Rand zählt als
 * innen (Festlegung K0). Die Umlaufrichtung ist gleichgültig.
 */
export function inHindernis(h: Hindernis, x: number, z: number): boolean {
  let positiv = false;
  let negativ = false;
  const n = h.punkte.length;
  for (let i = 0; i < n; i++) {
    const a = h.punkte[i] as Punkt;
    const b = h.punkte[(i + 1) % n] as Punkt;
    const kreuz = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if (kreuz > 0) positiv = true;
    else if (kreuz < 0) negativ = true;
    if (positiv && negativ) return false;
  }
  return true;
}

/** Hindernis eines unzerbrochenen Behälters: Grundfläche x ± 12, z ± 6, Höhe 32 (Welt 2.2, Punkt 6). */
export function behaelterHindernis(id: string, x: number, z: number): Hindernis {
  return {
    id,
    punkte: [
      { x: x - BEHAELTER_HALB_X, z: z - BEHAELTER_HALB_Z },
      { x: x - BEHAELTER_HALB_X, z: z + BEHAELTER_HALB_Z },
      { x: x + BEHAELTER_HALB_X, z: z + BEHAELTER_HALB_Z },
      { x: x + BEHAELTER_HALB_X, z: z - BEHAELTER_HALB_Z },
    ],
    hoehe: BEHAELTER_HOEHE,
  };
}

/**
 * Begehbar nach Welt 2.2 Punkt 1 und 3 für ganzzahlige Lage (x, z) und Höhe
 * h (⌊h⌋): unten(x) ≤ z ≤ oben(x) und in keinem Hindernis, dessen Höhe größer
 * als h ist. zusatz: weitere Hindernisse (z. B. unzerbrochene Behälter).
 */
export function begehbar(stage: Stage, x: number, z: number, h: number = 0, zusatz: readonly Hindernis[] = []): boolean {
  const g = bandGrenzen(stage, x);
  if (g === null || z < g.unten || z > g.oben) return false;
  for (const hi of stage.hindernisse) if (hi.hoehe > h && inHindernis(hi, x, z)) return false;
  for (const hi of zusatz) if (hi.hoehe > h && inHindernis(hi, x, z)) return false;
  return true;
}

/** Begrenzung eines Schritts (Welt 2.2). */
export interface Begrenzung {
  stage: Stage;
  /** weitere Hindernisse, z. B. unzerbrochene Behälter (behaelterHindernis) */
  zusatz: readonly Hindernis[];
  /** Ränder der Figur in x als Fest (Welt 2.2 Punkt 4), null = keine (Gegner, Prüfbühne) */
  x_min: Fest | null;
  x_max: Fest | null;
}

/** Ergebnis eines begrenzten Schritts. */
export interface SchrittErgebnis {
  x: Fest;
  z: Fest;
  /** der Schritt in x bzw. z wurde verkürzt */
  blockiert_x: boolean;
  blockiert_z: boolean;
}

/**
 * Ganzzahlige Lagen strikt hinter `von` bis einschließlich `bis` in
 * Schrittrichtung, in Reihenfolge des Weges.
 */
function ganzeLagen(von: Fest, bis: Fest): number[] {
  const lagen: number[] = [];
  if (bis > von) {
    for (let c = ganz(von) + 1; ausGanz(c) <= bis; c++) lagen.push(c);
  } else if (bis < von) {
    const start = nachkomma(von) === 0 ? ganz(von) - 1 : ganz(von);
    for (let c = start; ausGanz(c) >= bis; c--) lagen.push(c);
  }
  return lagen;
}

/** Begrenzt das Ziel einer Achse auf [min, max] (Fest), ohne über die Ausgangslage hinaus zurückzuschieben. */
function randBegrenzen(alt: Fest, neu: Fest, min: Fest | null, max: Fest | null): Fest {
  let n = neu;
  if (min !== null && n < min) n = alt < min ? alt : min;
  if (max !== null && n > max) n = alt > max ? alt : max;
  return n;
}

/**
 * Schritt um (dx, dz) nach Welt 2.2 Punkt 2: erst x, dann z. Würde ein Schritt
 * die begehbare Fläche verlassen, endet er an ihrer Kante: auf der letzten
 * ganzzahligen begehbaren Lage des Weges (Nachkommaanteil 0); gibt es keine,
 * bleibt die Achse stehen. Die andere Achse bewegt sich weiter. Ränder der
 * Figur (x_min, x_max) begrenzen x auf den genauen Wert (Welt-Test T1: Wand
 * K + 24). Festlegung K0 für „an ihrer Kante“; Stufe 2 nutzt diese Funktion
 * für Figur und Gegner.
 */
export function schrittBegrenzt(b: Begrenzung, x: Fest, z: Fest, h: Fest, dx: Fest, dz: Fest): SchrittErgebnis {
  const hg = ganz(h);
  let nx = x;
  let blockiertX = false;
  if (dx !== 0) {
    const ziel = randBegrenzen(x, add(x, dx), b.x_min, b.x_max);
    blockiertX = ziel !== add(x, dx);
    if (begehbar(b.stage, ganz(ziel), ganz(z), hg, b.zusatz)) {
      nx = ziel;
    } else {
      blockiertX = true;
      for (const c of ganzeLagen(x, ziel)) {
        if (!begehbar(b.stage, c, ganz(z), hg, b.zusatz)) break;
        nx = ausGanz(c);
      }
    }
  }
  let nz = z;
  let blockiertZ = false;
  if (dz !== 0) {
    const ziel = add(z, dz);
    if (begehbar(b.stage, ganz(nx), ganz(ziel), hg, b.zusatz)) {
      nz = ziel;
    } else {
      blockiertZ = true;
      for (const c of ganzeLagen(z, ziel)) {
        if (!begehbar(b.stage, ganz(nx), c, hg, b.zusatz)) break;
        nz = ausGanz(c);
      }
    }
  }
  return { x: nx, z: nz, blockiert_x: blockiertX, blockiert_z: blockiertZ };
}
