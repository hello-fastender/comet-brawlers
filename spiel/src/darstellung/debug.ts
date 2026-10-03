// Debug-Anzeige (Taste F1) nach docs/spezifikation-welt.md, 10.6 und
// Auftrag 3, 2.5. Sie liest nur die Welt, wird nicht aufgezeichnet und
// ändert weder Logik noch Protokoll. Sie zeichnet in Spielpixeln (Linien
// und Schrift 3 × 5 je Spielpixel, über die Zeichenklasse; Auftrag 5).
//
// Inhalt:
//   Text: Frame, T(f), Rang und Rang-Uhr, Seed und Ziehungen, K, Ky,
//         Kameramodus, Bildschütteln, aktives Fenster, Halter der Rechte,
//         Lebende, Wellen, Phase, Steuerung, Zustand der Figur, Ereignisse.
//   Welt: Trefferflächen aller Angriffsinstanzen als Kästen in x/z mit Höhe
//         (aktiv kräftig, sonst gestrichelt), Treffer des Frames, Zielpunkte
//         und Abbruchfenster der Gegner, Zustandsnamen, Seite, Recht,
//         Aufnahmebereiche, Grundflächen der Behälter, Hindernisse,
//         Folgepunkt, Totzone der Arena.

import type { Angriffsinstanz, EntitaetBasis, Gegner, Objekt } from '../kern/entitaeten.ts';
import type { Tasten } from '../kern/tasten.ts';
import type { Welt } from '../kern/welt.ts';
import { blickText, entitaet } from '../kern/entitaeten.ts';
import { ganz, zuDezimalText } from '../kern/festkomma.ts';
import { tastenZuText } from '../kern/tasten.ts';
import {
  ABBRUCH_LINKS,
  ABBRUCH_RECHTS,
  AUFNEHMEN_BEREICH,
  AUFNEHMEN_TIEFE,
  BEHAELTER_HALB_X,
  BEHAELTER_HALB_Z,
  BILD_BREITE,
  BILD_HOEHE,
  FENSTER_LINKS,
  FENSTER_RECHTS,
  IM_BILD_MAX,
  KAMERA_FOLGEPUNKT,
} from '../kern/werte.ts';
import type { Kamera, Koerper } from './zeichnen.ts';
import type { Zeichner } from './zeichner.ts';
import { bildX, bildY, figurRechteck, gegnerRechteck, gegnerSichtbar, lageVon, objektSichtbar, zeichneHindernis } from './zeichnen.ts';
import { DEBUG_MARKE, DEBUG_TEXT, FARBE, STRICH, ZIELKREUZ } from './masse.ts';
import { SCHRIFT_3X5, textBreite } from './schrift.ts';

/** Angaben außerhalb der Welt für die Debug-Anzeige. */
export interface DebugInfo {
  seed: number;
  /** gehaltene Spieltasten (Tastatur) */
  tasten: Tasten;
  quelle: 'tastatur' | 'eingabe';
  pause: boolean;
}

// ===========================================================================
// Hilfen
// ===========================================================================

function kasten(zn: Zeichner, x0: number, y0: number, x1: number, y1: number, farbe: string, gestrichelt: boolean): void {
  zn.umriss(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), farbe, gestrichelt ? STRICH : null);
}

function strich(zn: Zeichner, x0: number, y0: number, x1: number, y1: number, farbe: string, gestrichelt: boolean = false): void {
  zn.linie(x0, y0, x1, y1, farbe, gestrichelt ? STRICH : null);
}

function kreuz(zn: Zeichner, x: number, y: number, farbe: string): void {
  strich(zn, x - ZIELKREUZ, y - ZIELKREUZ, x + ZIELKREUZ, y + ZIELKREUZ, farbe);
  strich(zn, x - ZIELKREUZ, y + ZIELKREUZ, x + ZIELKREUZ, y - ZIELKREUZ, farbe);
}

/** Text mit dunklem Grund, damit er auf jeder Fläche lesbar ist. */
function marke(zn: Zeichner, inhalt: string, x: number, y: number, farbe: string): void {
  const b = textBreite(SCHRIFT_3X5, inhalt);
  zn.rechteck(Math.round(x) - 1, Math.round(y) - 1, b + 2, SCHRIFT_3X5.hoehe + 2, FARBE.debug_grund);
  zn.text(SCHRIFT_3X5, inhalt, x, y, farbe);
}

/** Marken über einem Körper; die letzte Zeile steht direkt über dem Umriss. */
function markenUeber(zn: Zeichner, r: Koerper, zeilen: readonly string[], farbe: string): void {
  let y = r.oben - DEBUG_MARKE.ueber - zeilen.length * DEBUG_MARKE.abstand;
  for (const z of zeilen) {
    marke(zn, z, r.links, y, farbe);
    y += DEBUG_MARKE.abstand;
  }
}

function leerOder(n: number | null): string {
  return n === null ? '-' : `S${n}`;
}

// ===========================================================================
// Trefferflächen (Kampf 5.1; Flächenarten in entitaeten.ts, Prüfung in treffer.ts)
// ===========================================================================

/** Bereich der Fußpunkte möglicher Ziele in x/z (ganze Pixel, Grenzen eingeschlossen) und Höhengrenze. */
interface Bereich {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  hoehe: number | null;
}

/**
 * Bereich einer Fläche zum Angreifer, wie inFlaeche (treffer.ts) ihn prüft:
 * abstand: −hinten ≤ d_vorn ≤ vorn, |dz| ≤ tiefe; fenster: x_z − links bis
 * x_z + rechts, dz_min bis dz_max, dazu d_vorn ≥ −hinten; punkt: um den
 * festen Punkt in Richtung richtung; umkreis: |dx| ≤ halbbreite. gehalten
 * und bild haben keinen Kasten (null).
 */
export function flaechenBereich(welt: Welt, inst: Angriffsinstanz, a: EntitaetBasis): Bereich | null {
  const fl = inst.flaeche;
  const ax = ganz(a.x);
  const az = ganz(a.z);
  switch (fl.art) {
    case 'abstand': {
      const x0 = a.blick === 1 ? ax - fl.hinten : ax - fl.vorn;
      const x1 = a.blick === 1 ? ax + fl.vorn : ax + fl.hinten;
      return { x0, x1, z0: az - fl.tiefe, z1: az + fl.tiefe, hoehe: fl.hoehe_ziel_max };
    }
    case 'fenster': {
      let x0 = fl.x_z - fl.links;
      let x1 = fl.x_z + fl.rechts;
      if (a.blick === 1) x0 = Math.max(x0, ax - fl.hinten);
      else x1 = Math.min(x1, ax + fl.hinten);
      return { x0, x1, z0: az + fl.dz_min, z1: az + fl.dz_max, hoehe: fl.hoehe_ziel_max };
    }
    case 'punkt': {
      const x0 = fl.richtung === 1 ? fl.x - fl.hinten : fl.x - fl.vorn;
      const x1 = fl.richtung === 1 ? fl.x + fl.vorn : fl.x + fl.hinten;
      return { x0, x1, z0: fl.z - fl.tiefe, z1: fl.z + fl.tiefe, hoehe: fl.hoehe_ziel_max };
    }
    case 'umkreis':
      return { x0: ax - fl.halbbreite, x1: ax + fl.halbbreite, z0: az - fl.tiefe, z1: az + fl.tiefe, hoehe: fl.hoehe_ziel_max };
    case 'bild':
      return { x0: welt.kamera.x, x1: welt.kamera.x + IM_BILD_MAX, z0: az, z1: az, hoehe: null };
    case 'gehalten':
      return null;
  }
}

function zeichneFlaeche(zn: Zeichner, welt: Welt, k: Kamera, inst: Angriffsinstanz): void {
  const a = entitaet(welt, inst.angreifer);
  if (a === null || !a.belegt) return;
  const farbe = !inst.aktiv ? FARBE.flaeche_inaktiv : inst.gegen === 'gegner' ? FARBE.flaeche_gegner : FARBE.flaeche_figur;
  const gestrichelt = !inst.aktiv;
  if (inst.flaeche.art === 'gehalten') {
    const ziel = inst.ziel === null ? null : entitaet(welt, inst.ziel);
    if (ziel === null) return;
    const la = lageVon(k, a);
    const lz = lageVon(k, ziel);
    strich(zn, la.x, la.schatten, lz.x, lz.schatten, farbe, gestrichelt);
    marke(zn, inst.code, lz.x, lz.schatten + DEBUG_MARKE.ueber, farbe);
    return;
  }
  const b = flaechenBereich(welt, inst, a);
  if (b === null) return;
  if (inst.flaeche.art === 'bild') {
    kasten(zn, 0, 0, BILD_BREITE - 1, BILD_HOEHE - 1, farbe, gestrichelt);
    marke(zn, `${inst.code} BILD`, DEBUG_TEXT.x, BILD_HOEHE - DEBUG_TEXT.abstand, farbe);
    return;
  }
  // Fußpunkte x0 … x1 und z0 … z1 eingeschlossen: Kasten bis zur Außenkante des letzten Pixels
  const sx0 = bildX(k, b.x0);
  const sx1 = bildX(k, b.x1) + 1;
  const syVorn = bildY(k, b.z0) + 1;
  const syHinten = bildY(k, b.z1);
  kasten(zn, sx0, syHinten, sx1, syVorn, farbe, gestrichelt);
  if (b.hoehe !== null && b.hoehe > 0) {
    // Höhengrenze des Ziels als zweiter Kasten darüber, verbunden an den vorderen Ecken
    kasten(zn, sx0, syHinten - b.hoehe, sx1, syVorn - b.hoehe, farbe, true);
    strich(zn, sx0, syVorn, sx0, syVorn - b.hoehe, farbe, true);
    strich(zn, sx1, syVorn, sx1, syVorn - b.hoehe, farbe, true);
  }
  // Kennung innen an der hinteren linken Ecke
  marke(zn, inst.code, sx0 + 1, syHinten + 1, farbe);
}

function alleInstanzen(welt: Welt): Angriffsinstanz[] {
  const liste: Angriffsinstanz[] = [];
  if (welt.figur.angriff !== null) liste.push(welt.figur.angriff);
  for (const e of [...welt.geschosse, ...welt.gegner, ...welt.objekte]) {
    if (e.belegt && e.angriff !== null) liste.push(e.angriff);
  }
  return liste;
}

// ===========================================================================
// Gegner, Objekte, Stage
// ===========================================================================

function gegnerMarken(g: Gegner): string[] {
  const zeilen = [`S${g.nr} ${g.modus} T${g.modus_uhr}`, `${g.aktion} LP ${g.lp} SEITE ${blickText(g.seite)}${g.recht !== '' ? ` RECHT ${g.recht}` : ''}${g.zielrecht ? ' ZIELRECHT' : ''}`];
  if (g.angriff_code !== '') zeilen.push(`${g.angriff_code} Z ${g.ziel_abstand} SCHADEN ${g.schaden}`);
  return zeilen;
}

function zeichneZielpunkt(zn: Zeichner, k: Kamera, g: Gegner): void {
  if (g.typ === 'Zünder') {
    if (g.zielpunkt_x === 0 && g.zielpunkt_z === 0) return;
    kreuz(zn, bildX(k, g.zielpunkt_x), bildY(k, g.zielpunkt_z), FARBE.zielpunkt);
    return;
  }
  if (g.ziel_x === 0) return;
  const y = bildY(k, ganz(g.z));
  const x = bildX(k, g.ziel_x);
  kreuz(zn, x, y, FARBE.zielpunkt);
  if (g.typ === 'Bolzer' || g.typ === 'Rammbock') {
    // Abbruchfenster nach Welt 5.4: x_Z − 32 bis x_Z + 31
    strich(zn, x - ABBRUCH_LINKS, y, x + ABBRUCH_RECHTS, y, FARBE.zielpunkt, true);
  }
}

function zeichneAufnahme(zn: Zeichner, welt: Welt, k: Kamera, o: Objekt): void {
  if (o.typ !== 'Gegenstand' || !o.aufnehmbar || o.art === '' || o.art === 'Fass' || o.art === 'Bosskiste') return;
  const bereich = AUFNEHMEN_BEREICH[o.art];
  // Fußpunkte der Figur, von denen aus sie aufnimmt: d_vorn = (x_o − x_f) · Blick in −hinten … vorn
  const ox = ganz(o.x);
  const oz = ganz(o.z);
  const blick = welt.figur.blick;
  const x0 = blick === 1 ? ox - bereich.vorn : ox - bereich.hinten;
  const x1 = blick === 1 ? ox + bereich.hinten : ox + bereich.vorn;
  kasten(zn, bildX(k, x0), bildY(k, oz + AUFNEHMEN_TIEFE), bildX(k, x1) + 1, bildY(k, oz - AUFNEHMEN_TIEFE) + 1, FARBE.aufnahme, true);
}

function zeichneBehaelterFlaeche(zn: Zeichner, k: Kamera, o: Objekt): void {
  if (o.typ !== 'Behälter' || o.zerbrochen) return;
  const x = ganz(o.x);
  const z = ganz(o.z);
  kasten(zn, bildX(k, x - BEHAELTER_HALB_X), bildY(k, z + BEHAELTER_HALB_Z), bildX(k, x + BEHAELTER_HALB_X) + 1, bildY(k, z - BEHAELTER_HALB_Z) + 1, FARBE.hindernis, true);
}

// ===========================================================================
// Ebenen
// ===========================================================================

/** Debug-Inhalte in Weltlage (mit Bildschütteln wie die Szene). */
export function zeichneDebugWelt(zn: Zeichner, welt: Welt): void {
  const k: Kamera = { x: welt.kamera.x, y: welt.kamera.y };
  zn.sichern();
  zn.verschieben(welt.kamera.schuetteln_x, welt.kamera.schuetteln_y);
  // Hindernisse und Grundflächen der Behälter
  for (const h of welt.stage.hindernisse) zeichneHindernis(zn, k, h, FARBE.hindernis_flaeche);
  for (const o of welt.objekte) if (o.belegt) zeichneBehaelterFlaeche(zn, k, o);
  // Folgepunkt (KA1) und Totzone der Arena (KA8)
  strich(zn, KAMERA_FOLGEPUNKT, 0, KAMERA_FOLGEPUNKT, BILD_HOEHE - 1, FARBE.folgepunkt, true);
  const arena = welt.stage.arena;
  if (arena !== null && welt.kamera.modus === 'ARENA') {
    strich(zn, arena.totzone_links, 0, arena.totzone_links, BILD_HOEHE - 1, FARBE.totzone, true);
    strich(zn, arena.totzone_rechts, 0, arena.totzone_rechts, BILD_HOEHE - 1, FARBE.totzone, true);
  }
  // Aufnahmebereiche, Zielpunkte
  for (const o of welt.objekte) if (o.belegt) zeichneAufnahme(zn, welt, k, o);
  for (const g of welt.gegner) if (gegnerSichtbar(welt, g)) zeichneZielpunkt(zn, k, g);
  // Trefferflächen aller Angriffsinstanzen
  for (const inst of alleInstanzen(welt)) zeichneFlaeche(zn, welt, k, inst);
  // Treffer dieses Frames: Ziel weiß umrahmt
  for (const t of welt.treffer) {
    const ziel = entitaet(welt, t.ziel);
    if (ziel === null || !ziel.belegt) continue;
    const l = lageVon(k, ziel);
    kasten(zn, l.x - ZIELKREUZ * 2, l.fuss - ZIELKREUZ * 2, l.x + ZIELKREUZ * 2, l.fuss, FARBE.treffer, false);
  }
  // Zustandsnamen
  for (const g of welt.gegner) if (gegnerSichtbar(welt, g)) markenUeber(zn, gegnerRechteck(k, g), gegnerMarken(g), FARBE.debug_text);
  for (const o of [...welt.objekte, ...welt.geschosse]) {
    if (!objektSichtbar(o)) continue;
    const l = lageVon(k, o);
    marke(zn, `${o.schluessel.toUpperCase()} ${o.art !== '' ? o.art : o.typ}${o.flugphase !== '' ? ` ${o.flugphase}` : ''}`, l.x, l.schatten + DEBUG_MARKE.ueber, FARBE.debug_text);
  }
  // Figur: Marke unter dem Schatten, damit sie nicht mit den Marken der Gegner kollidiert
  const f = welt.figur;
  const lf = lageVon(k, f);
  const rf = figurRechteck(k, f);
  marke(zn, `F ${f.aktion}${f.phase !== '' ? ` ${f.phase}` : ''} UHR ${f.uhr}`, rf.links, lf.schatten + DEBUG_MARKE.ueber + DEBUG_MARKE.abstand, FARBE.debug_text);
  zn.zurueck();
}

/** Bricht einen langen Text in Zeilen, die in die Bildbreite passen. */
function umbrechen(inhalt: string): string[] {
  const max = Math.floor((BILD_BREITE - DEBUG_TEXT.x * 2) / SCHRIFT_3X5.vorschub);
  const zeilen: string[] = [];
  for (let i = 0; i < inhalt.length; i += max) zeilen.push(inhalt.slice(i, i + max));
  return zeilen;
}

/** Debug-Text oben links unter der Anzeigeleiste (ohne Bildschütteln). */
export function zeichneDebugText(zn: Zeichner, welt: Welt, info: DebugInfo): void {
  const f = welt.figur;
  const k = welt.kamera;
  const r = welt.rechte;
  const zeilen = [
    `FRAME ${welt.frame}  T ${tastenZuText(welt.eingabe.t) || '-'}  GEHALTEN ${tastenZuText(info.tasten) || '-'}  QUELLE ${info.quelle === 'eingabe' ? 'EINGABEDATEI' : 'TASTATUR'}${info.pause ? '  PAUSE' : ''}`,
    `RANG ${welt.rang.rang} UHR ${welt.rang.zaehler}${welt.rang.fest ? ' FEST' : ''}  SEED ${info.seed} ZIEHUNGEN ${welt.zufall.ziehungen}`,
    `K ${k.x} KY ${k.y} ${k.modus}  SCHUETTELN ${k.schuetteln_x}/${k.schuetteln_y}  FENSTER ${k.x + FENSTER_LINKS} BIS ${k.x + FENSTER_RECHTS}`,
    `RECHT L ${leerOder(r.l)} R ${leerOder(r.r)} ZIEL ${leerOder(r.ziel)}  LEBENDE ${welt.lebende}  WELLEN ${welt.wellen.ausgeloest.join('-') || '-'}`,
    `PHASE ${welt.rahmen.phase} STEUERUNG ${welt.rahmen.steuerung}  LEBEN ${welt.rahmen.leben}  PUNKTE ${welt.rahmen.punkte}`,
    `FIGUR X ${zuDezimalText(f.x)} Z ${zuDezimalText(f.z)} H ${zuDezimalText(f.h)} LP ${f.lp} ZST ${f.zustand} SCHUTZ ${f.schutz} KOMBO ${f.kombo} STOPP ${f.stopp} SPRINT ${f.sprint_n}`,
  ];
  if (welt.ereignisse.length > 0) zeilen.push(...umbrechen(`EREIGNIS ${welt.ereignisse.join(' ')}`));
  let y = DEBUG_TEXT.zeile;
  for (const z of zeilen) {
    marke(zn, z, DEBUG_TEXT.x, y, FARBE.debug_text);
    y += DEBUG_TEXT.abstand;
  }
}
