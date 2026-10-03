// Nahkämpfer Bolzer und Rammbock nach docs/spezifikation-welt.md, Abschnitt
// 5 (K3, Stufe 2): Zustandsautomat 5.2, Bewegung 5.3 (nah_gehen.ts),
// Angriff mit Zielabstand und Abbruch 5.4, Angriffsarten 5.5, Serie und
// Angriffswahl 5.6, Angriffserlaubnis 5.7 (auch für den Zünder, fern.ts;
// Abgabe der Rechte gemeinsam mit reaktion.ts in rechte.ts),
// Abwarten, Seitenwechsel, Verfolgung 5.8, Rückkehr nach Reaktionen 5.9.
//
// Ablauf im Frame:
//   W4  rechteSchritt   Halter prüfen, E-10, E-5 (nach rahmenVorlauf, welt.ts)
//       nahEntscheidung Zustand, Recht anfordern (E-3), Gehstufe ziehen,
//                       Angriffsbeginn A (Zielabstand Z, Schaden, AS:sn:Code)
//   KS3 nahBewegung     Schritt zum Ziel, Sprungtritt, aktive Frames setzen
//   KS5 nahAbbruch      Abbruchfenster x_Z − 32 … x_Z + 31, dz −10 … +11
//   KS7 nahHatGetroffen wirksamer Treffer: Trefferstopp, Serienende
//
// Zufall nur aus g.zufall, je Entscheidung eine Ziehung (Entscheidungen mit
// nur einer Möglichkeit ziehen nicht); welt.fest[name] ersetzt das Ergebnis
// nach der Ziehung (Welt 11.3). Namen der festen Ziehungen: FEST unten.
//
// Festlegungen K3 (Lücken, Bericht):
// - Der feste Rückzug im Nachlauf (5.5) bewegt den Gegner nicht; Strecke und
//   Tempo sind nicht angegeben.
// - Die Abwartezeit zählt in jedem Zustand herunter; ein Recht fordert der
//   Gegner erst an, wenn sie abgelaufen ist (auch nach Seitenwechsel und
//   Spott). Nach verbrauchtem Verfolgungsbudget wird keine neue Abwartezeit
//   gezogen (11.2 nennt dort nur Spott oder Abwarten).
// - Haltepunkt erreicht, aber dz außerhalb von −10 … +11: der Gegner geht nur
//   in der Tiefe weiter (5.3 „sonst geht er in z weiter“).
// - BUB direkt nach dem Nachlauf von BA (5.6): die Wahl BUB/BUA fällt am Ende
//   dieses Nachlaufs; nach einer Unterbrechung (Reaktion) fällt sie bei A.
// - „Figur hinter ihm“ (5.2) wird mit dem Blick des Vorframes geprüft; in
//   Kampfhaltung schaut er danach wieder zur Figur.
// - Nach einer Reaktion (modus FREI, gesetzt von K2 im ersten freien Frame)
//   wählt W4 des nächsten Frames: so gilt s = h+24 (5.9) und Bewegung ab G+1;
//   das Recht nach dem Aufstehen fordert der Gegner damit in G+1 an.
// - Vom Tod der Figur bis N+1 und in der Blende (E-10) verlassen Halter
//   Kampfhaltung, Angriff und Nachlauf (ABWARTEN); ein Sprungtritt landet erst.

import type { Blick, Flaeche, Gegner, GegnerModus, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import { ausGanz, divGanz, ganz, mulGanz, sub } from '../festkomma.ts';
import { ZUSTAND_NORMAL, angriffsinstanz, blickZu, gegnerVon, imFenster, istReaktion, modusSetzen } from '../entitaeten.ts';
import { EREIGNIS, ereignis } from '../ereignisse.ts';
import { anteil, bereich, prozent, wahl, ziehenAus } from '../zufall.ts';
import { rangstufe } from '../rang.ts';
import { neueinstiegN } from '../rahmen.ts';
import { kameraBlende } from '../kamera.ts';
import { bandGrenzen, schrittBegrenzt } from '../stage.ts';
import { bandZ, fensterX, gegnerBegrenzung, gehen, gehTempo, nahAn } from './nah_gehen.ts';
import { rechtAbgeben, serieZuruecksetzen, zielrechtAbgeben } from './rechte.ts';
import {
  ABBRUCH_LINKS,
  ABBRUCH_RECHTS,
  ABWARTEN_BOLZER,
  ABWARTEN_RAMMBOCK,
  BOLZER_ANGRIFF_ANTEILE,
  BOLZER_ANGRIFF_CODES,
  BOLZER_BUB_ANTEIL,
  BOLZER_GRUPPE,
  BOLZER_SERIENENDE_ANTEILE,
  GEGNER_HINTEN,
  GEGNER_HINTEN_BLICK_RECHTS,
  GEGNER_HOEHE_MAX,
  GEGNER_TREFFERSTOPP,
  GEHBEFEHL_DAUER,
  GEHSTUFE_AUS,
  HALTABSTAND_NORMAL,
  HALTABSTAND_SCHNELL,
  HALTEPUNKT_MAX,
  HALTEPUNKT_MIN,
  KAMPF_DX_MAX,
  KAMPF_DZ_MAX,
  KAMPF_DZ_MIN,
  NAH_ANGRIFFE,
  PAUSE_BASIS,
  PAUSE_FAKTOR,
  PAUSE_TEILER,
  RAMMBOCK_ANGRIFF_ANTEILE,
  RAMMBOCK_ANGRIFF_CODES,
  RAMMBOCK_GRUPPE,
  RAMMBOCK_SERIENENDE_ANTEILE,
  RAMMBOCK_SPRUNGTRITT_ANTEIL,
  RAMMBOCK_UMWERF_ANTEILE,
  SCHADEN_BOLZER,
  SCHADEN_RAMMBOCK,
  SEITENWECHSEL_DX,
  SEITENWECHSEL_Z,
  SPOTT_DAUER,
  SPOTT_ODER_ABWARTEN_AUS,
  SPRUNGTRITT_AUFSETZEN,
  SPRUNGTRITT_FLUG_AB,
  SPRUNGTRITT_HINTEN_BLICK_RECHTS,
  SPRUNGTRITT_HOEHE_LINEAR,
  SPRUNGTRITT_HOEHE_MAX,
  SPRUNGTRITT_HOEHE_TEILER,
  SPRUNGTRITT_TIEFE,
  SPRUNGTRITT_VORN,
  SPRUNGTRITT_VORN_BLICK_RECHTS,
  SPRUNGTRITT_X,
  VERFOLGUNG_BOLZER,
  VERFOLGUNG_RAMMBOCK,
  WARTEABSTAND_BASIS,
  WARTEABSTAND_MAX,
  WARTEABSTAND_SCHRITT,
  WARTEPOSITION_TOLERANZ,
  ZIELABSTAND_MAX,
  ZIELRECHT_BIS,
} from '../werte.ts';

// ===========================================================================
// Namen, Typen, kleine Hilfen
// ===========================================================================

/** Namen der Ziehungen für fest.<name>=<wert> (Welt 11.3) und ihre Werte. */
export const FEST = {
  /** normal | schnell */
  gehstufe: 'gehstufe',
  /** Zahl der normalen Angriffe einer Gruppe */
  gruppe: 'gruppe',
  /** Rammbock: Gruppe beginnt mit Sprungtritt: ja | nein */
  sprungtritt: 'sprungtritt',
  /** normaler Angriff: BA BB BC RA RB */
  angriff: 'angriff',
  /** Umwerf-Angriff: BUA BUB RU RS */
  umwerf: 'umwerf',
  /** Länge des Nachlaufs in Frames */
  nachlauf: 'nachlauf',
  /** nach dem Serienende: abwarten | seitenwechsel | spott */
  serienende: 'serienende',
  /** Abwartezeit in Frames */
  abwarten: 'abwarten',
  /** Verfolgungsbudget in Gehbefehlen */
  verfolgung: 'verfolgung',
  /** nach verbrauchtem Budget: spott | abwarten */
  spott_oder_abwarten: 'spott_oder_abwarten',
} as const;

/** Code eines Nahangriffs (Welt 5.5). */
export type NahCode = keyof typeof NAH_ANGRIFFE;

function istNahCode(c: string): c is NahCode {
  return Object.prototype.hasOwnProperty.call(NAH_ANGRIFFE, c);
}

/** Eintrag i einer Liste (Index geprüft: eine Ziehung außerhalb der Liste ist ein Fehler). */
function eintrag<T>(liste: readonly T[], i: number): T {
  const w = liste[i];
  if (w === undefined) throw new RangeError(`Index ${i} außerhalb der Liste (Länge ${liste.length})`);
  return w;
}

/**
 * Codes der normalen Angriffe aus werte.ts als NahCode, beim Laden geprüft
 * (Welt 5.5, 5.6): jeder Code muss in NAH_ANGRIFFE stehen und je Code ein
 * Anteil; ein Tippfehler in werte.ts wirft sofort statt erst im Lauf.
 */
function nahCodes(codes: readonly string[], anteile: readonly number[]): readonly NahCode[] {
  if (codes.length !== anteile.length) throw new RangeError(`Angriffscodes ${codes.join(' ')}: ${anteile.length} Anteile`);
  return codes.map((c) => {
    if (!istNahCode(c)) throw new RangeError(`Angriffscode „${c}“ fehlt in NAH_ANGRIFFE (werte.ts)`);
    return c;
  });
}

/** Normale Angriffe des Bolzers und des Rammbocks (Welt 5.6), geprüft. */
const BOLZER_CODES = nahCodes(BOLZER_ANGRIFF_CODES, BOLZER_ANGRIFF_ANTEILE);
const RAMMBOCK_CODES = nahCodes(RAMMBOCK_ANGRIFF_CODES, RAMMBOCK_ANGRIFF_ANTEILE);

/** Modulinterner Zähler aus g.timer (fehlend = 0). */
export function tm(g: Gegner, name: string): number {
  return g.timer[name] ?? 0;
}

/** Ganze Zahl aus welt.fest[name], sonst wert (Welt 11.3: ersetzt das Ergebnis nach der Ziehung). */
export function festZahl(welt: Welt, name: string, wert: number): number {
  const t = welt.fest[name];
  if (t === undefined) return wert;
  if (!/^-?\d+$/.test(t)) throw new RangeError(`fest.${name}=${t}: ganze Zahl erwartet`);
  return Number(t);
}

/** Text aus welt.fest[name], wenn er zu den erlaubten gehört, sonst wert. */
function festWahl<T extends string>(welt: Welt, name: string, erlaubt: readonly T[], wert: T): T {
  const t = welt.fest[name];
  if (t === undefined) return wert;
  const gefunden = erlaubt.find((e) => e === t);
  if (gefunden === undefined) throw new RangeError(`fest.${name}=${t}: erlaubt sind ${erlaubt.join(' ')}`);
  return gefunden;
}

/** Aktueller Modus (ohne Typverengung aus einem vorigen switch). */
function modusVon(g: Gegner): GegnerModus {
  return g.modus;
}

/** Ist g ein Nahkämpfer mit Logik (Bolzer, Rammbock)? */
function istNahkaempfer(g: Gegner): boolean {
  return g.typ === 'Bolzer' || g.typ === 'Rammbock';
}

/** dz (Gegner minus Figur, Welt 1) im Bereich −10 … +11 (Welt 5.2)? */
export function dzImKampfbereich(dz: number): boolean {
  return dz >= KAMPF_DZ_MIN && dz <= KAMPF_DZ_MAX;
}

/** Abstände nach Welt 1: dx, dz = Gegner minus Figur (ganzzahlig). */
export function weltAbstand(welt: Welt, g: Gegner): { dx: number; dz: number } {
  return { dx: ganz(g.x) - ganz(welt.figur.x), dz: ganz(g.z) - ganz(welt.figur.z) };
}

/** Seite aus dx (E-1): Vorzeichen, bei dx = 0 die bisherige. */
function seiteAus(dx: number, bisher: Blick): Blick {
  return dx > 0 ? 1 : dx < 0 ? -1 : bisher;
}

/** Gehstufe für einen neuen Gehbefehl ziehen (schnell mit 1/3, Welt 5.1, 5.3), Haltabstand H danach. */
export function gehstufeZiehen(welt: Welt, g: Gegner): void {
  const z = ziehenAus(g.zufall, GEHSTUFE_AUS);
  const stufe = festWahl(welt, FEST.gehstufe, ['normal', 'schnell'] as const, z === 0 ? 'schnell' : 'normal');
  g.gehstufe = stufe;
  g.haltabstand = stufe === 'schnell' ? HALTABSTAND_SCHNELL : HALTABSTAND_NORMAL;
  g.gehbefehl_rest = GEHBEFEHL_DAUER;
}

// ===========================================================================
// Angriffserlaubnis (Welt 5.7), auch für den Zünder
// ===========================================================================

/**
 * E-10: vom Tod der Figur (t+1) bis zu ihrem Erscheinen (N+1), in der Blende,
 * im Game Over und nach dem Fall des Bosses werden keine Rechte zugeteilt und
 * beginnt kein Angriff, auch nicht der des Bosses (K4).
 */
export function rechteGesperrt(welt: Welt): boolean {
  const f = welt.frame;
  const fig = welt.figur;
  if (fig.tod_t > 0 && f > fig.tod_t && f <= neueinstiegN(fig) + 1) return true;
  if (kameraBlende(welt)) return true;
  if (welt.rahmen.gameover_frame > 0) return true;
  const bossT = welt.rahmen.boss_t;
  return bossT > 0 && f > bossT;
}

function rechtSlot(welt: Welt, seite: Blick): number | null {
  return seite === 1 ? welt.rechte.r : welt.rechte.l;
}

function rechtSetzen(welt: Welt, seite: Blick, nr: number | null): void {
  if (seite === 1) welt.rechte.r = nr;
  else welt.rechte.l = nr;
}

/**
 * Fordert das Nahkampfrecht der eigenen Seite an (E-3): ein freies Recht wird
 * sofort zugeteilt (RE:sn:L oder R). Nicht mit gegner.sN.erlaubnis=aus und
 * nicht in E-10. Gibt zurück, ob g das Recht jetzt hält.
 */
export function rechtAnfordern(welt: Welt, g: Gegner): boolean {
  if (g.recht !== '') return true;
  if (!g.erlaubnis || rechteGesperrt(welt)) return false;
  if (rechtSlot(welt, g.seite) !== null) return false;
  rechtSetzen(welt, g.seite, g.nr);
  g.recht = g.seite === 1 ? 'R' : 'L';
  ereignis(welt, EREIGNIS.RECHT_ERHALTEN, g.schluessel, g.recht);
  return true;
}

/** Fordert das Zielrecht an (Welt 6: höchstens ein Fernkämpfer in ZIELEN oder SCHUSS); ZR:sn. */
export function zielrechtAnfordern(welt: Welt, g: Gegner): boolean {
  if (g.zielrecht) return true;
  if (!g.erlaubnis || rechteGesperrt(welt) || welt.rechte.ziel !== null) return false;
  welt.rechte.ziel = g.nr;
  g.zielrecht = true;
  ereignis(welt, EREIGNIS.ZIELRECHT, g.schluessel);
  return true;
}

/** Darf g in diesem Zustand das Nahkampfrecht halten (E-2, E-4)? */
function haeltRechtGueltig(g: Gegner): boolean {
  if (istReaktion(g.modus)) return g.modus === 'GETROFFEN';
  if (g.modus === 'FREI') return true;
  if (g.typ === 'Zünder') return g.modus === 'KOLBENHIEB';
  return g.modus === 'ANNAEHERN' || g.modus === 'KAMPFHALTUNG' || g.modus === 'ANGRIFF' || g.modus === 'NACHLAUF';
}

/** Hält g das Zielrecht noch (Welt 6: von z bis A+16)? */
function zielrechtGueltig(welt: Welt, g: Gegner): boolean {
  if (g.modus === 'ZIELEN') return true;
  return g.modus === 'SCHUSS' && welt.frame <= g.angriff_a + ZIELRECHT_BIS;
}

/** Ist der Gegner in der Luft eines Sprungtritts (bis zur Landung in A+46, Welt 5.5)? */
function sprungtrittInDerLuft(welt: Welt, g: Gegner): boolean {
  return g.modus === 'ANGRIFF' && g.angriff_code === 'RS' && welt.frame <= g.angriff_a + SPRUNGTRITT_AUFSETZEN;
}

/**
 * W4, nach rahmenVorlauf und vor den Entscheidungen der einzelnen Gegner
 * (Welt 5.7): Halter prüfen (E-2, E-4), E-10 (alle Rechte frei, keine
 * Zuteilung), E-5 (Seitenwechsel der Halter).
 * Die Anforderung je Gegner geschieht in nahEntscheidung bzw.
 * fernEntscheidung (Slots aufsteigend).
 */
export function rechteSchritt(welt: Welt): void {
  // Halter prüfen
  for (const g of welt.gegner) {
    if (!g.belegt) continue;
    if (g.recht !== '') {
      const seite: Blick = g.recht === 'R' ? 1 : -1;
      if (rechtSlot(welt, seite) !== g.nr) g.recht = '';
      else if (!haeltRechtGueltig(g)) rechtAbgeben(welt, g);
    }
    if (g.zielrecht && (welt.rechte.ziel !== g.nr || !zielrechtGueltig(welt, g))) zielrechtAbgeben(welt, g);
  }
  for (const seite of [-1, 1] as const) {
    const nr = rechtSlot(welt, seite);
    if (nr === null) continue;
    const g = welt.gegner[nr];
    if (g === undefined || !g.belegt || g.recht !== (seite === 1 ? 'R' : 'L')) rechtSetzen(welt, seite, null);
  }
  const z = welt.rechte.ziel;
  if (z !== null) {
    const g = welt.gegner[z];
    if (g === undefined || !g.belegt || !g.zielrecht) welt.rechte.ziel = null;
  }
  // E-10
  if (rechteGesperrt(welt)) {
    for (const g of welt.gegner) {
      if (!g.belegt) continue;
      if (g.recht !== '') rechtAbgeben(welt, g);
      if (g.zielrecht) zielrechtAbgeben(welt, g);
    }
    return;
  }
  // E-5: Seitenwechsel der Halter, Slots aufsteigend
  for (const g of welt.gegner) {
    if (!g.belegt || g.recht === '') continue;
    const alt: Blick = g.recht === 'R' ? 1 : -1;
    const neu = seiteAus(weltAbstand(welt, g).dx, alt);
    if (neu === alt) {
      g.seite = alt;
      continue;
    }
    if (sprungtrittInDerLuft(welt, g)) {
      if (rechtSlot(welt, neu) !== null) g.timer['rs_inaktiv'] = 1;
      continue;
    }
    g.seite = neu;
    if (rechtSlot(welt, neu) === null) {
      rechtSetzen(welt, alt, null);
      rechtSetzen(welt, neu, g.nr);
      g.recht = neu === 1 ? 'R' : 'L';
      ereignis(welt, EREIGNIS.RECHT_ERHALTEN, g.schluessel, g.recht);
    } else {
      rechtAbgeben(welt, g);
    }
  }
}

// ===========================================================================
// Zustandswechsel (Welt 5.2)
// ===========================================================================

/** Laufenden Angriff ohne Ereignis beenden (Instanz weg, Code leer). */
function angriffBeenden(g: Gegner): void {
  g.angriff = null;
  g.angriff_code = '';
}

function beginneAnnaehern(g: Gegner, verfolgung: boolean): void {
  modusSetzen(g, 'ANNAEHERN');
  g.gehbefehl_rest = 0;
  g.timer['angekommen'] = 0;
  g.timer['verfolgung'] = verfolgung ? 1 : 0;
  g.verfolgung_rest = verfolgung ? -1 : 0;
}

function beginneAbwarten(g: Gegner): void {
  angriffBeenden(g);
  modusSetzen(g, 'ABWARTEN');
  g.gehbefehl_rest = 0;
  g.timer['verfolgung'] = 0;
}

function beginneSpott(g: Gegner): void {
  angriffBeenden(g);
  modusSetzen(g, 'SPOTT');
  g.aktion = 'SPOTT';
}

/** Richtung des Bogens (5.8): +1 nach hinten oder −1 nach vorn, wo das Band um die Figur mehr Platz lässt; Gleichstand nach hinten. */
function bogenRichtung(welt: Welt): Blick {
  const fx = ganz(welt.figur.x);
  const fz = ganz(welt.figur.z);
  const b = bandGrenzen(welt.stage, fx);
  if (b === null) return 1;
  return b.oben - fz >= fz - b.unten ? 1 : -1;
}

function beginneSeitenwechsel(welt: Welt, g: Gegner): void {
  angriffBeenden(g);
  modusSetzen(g, 'SEITENWECHSEL');
  g.gehbefehl_rest = 0;
  g.timer['angekommen'] = 0;
  g.timer['wechsel_seite'] = -g.seite;
  g.timer['wechsel_z'] = bogenRichtung(welt);
}

/** Pause in Kampfhaltung 29 − 4·⌊Rang/4⌋ (Welt 5.1, 8). */
export function pauseNachRang(rang: number): number {
  return PAUSE_BASIS - PAUSE_FAKTOR * divGanz(rang, PAUSE_TEILER);
}

function beginneKampfhaltung(welt: Welt, g: Gegner): void {
  angriffBeenden(g);
  modusSetzen(g, 'KAMPFHALTUNG');
  g.kampfhaltung_s = welt.frame;
  g.pause = pauseNachRang(welt.rang.rang);
  g.timer['verfolgung'] = 0;
  g.timer['angekommen'] = 0;
  g.verfolgung_rest = 0;
  g.aktion = 'STAND';
  g.blick = blickZu(g, welt.figur);
}

/** Figur im Bereich der Kampfhaltung (5.2): dz in −10 … +11, |dx| ≤ 79, nicht hinter ihm. */
function inKampfbereich(welt: Welt, g: Gegner): boolean {
  const { dx, dz } = weltAbstand(welt, g);
  if (!dzImKampfbereich(dz) || Math.abs(dx) > KAMPF_DX_MAX) return false;
  return -dx * g.blick >= 0;
}

/** Abwartezeit abgelaufen: darf ein Recht anfordern (5.6). */
function darfAnfordern(g: Gegner): boolean {
  return g.abwarten_rest <= 0;
}

/** Nach Auftritt, Reaktion (FREI) oder als frischer Gegner (5.9). */
function nachFreiwerden(welt: Welt, g: Gegner): void {
  if (g.recht !== '') {
    if (inKampfbereich(welt, g)) beginneKampfhaltung(welt, g);
    else beginneAnnaehern(g, false);
    return;
  }
  serieZuruecksetzen(g);
  if (darfAnfordern(g) && rechtAnfordern(welt, g)) beginneAnnaehern(g, false);
  else beginneAbwarten(g);
}

// ===========================================================================
// Angriff (Welt 5.4 bis 5.6)
// ===========================================================================

/** Trefferfläche eines Nahangriffs: Fenster um den Zielpunkt (5.4) bzw. Sprungtritt (5.5). */
function nahFlaeche(code: NahCode, g: Gegner): Flaeche {
  if (code === 'RS') {
    return {
      art: 'abstand',
      vorn: g.blick === 1 ? SPRUNGTRITT_VORN_BLICK_RECHTS : SPRUNGTRITT_VORN,
      hinten: g.blick === 1 ? SPRUNGTRITT_HINTEN_BLICK_RECHTS : 0,
      hinten_weg: null,
      tiefe: SPRUNGTRITT_TIEFE,
      hoehe_angreifer_max: null,
      hoehe_ziel_max: SPRUNGTRITT_HOEHE_MAX,
    };
  }
  return nahFenster(g);
}

/** Fenster nach 5.4 um x_Z (g.ziel_x): Kampf-dz −11 … +10 (= Welt −10 … +11), Figur vor ihm oder 3 px (Blick rechts 4 px) hinter ihm, bis 48 px hoch. */
export function nahFenster(g: Gegner): Flaeche {
  return {
    art: 'fenster',
    x_z: g.ziel_x,
    links: ABBRUCH_LINKS,
    rechts: ABBRUCH_RECHTS,
    dz_min: -KAMPF_DZ_MAX,
    dz_max: -KAMPF_DZ_MIN,
    hinten: g.blick === 1 ? GEGNER_HINTEN_BLICK_RECHTS : GEGNER_HINTEN,
    hoehe_ziel_max: GEGNER_HOEHE_MAX,
  };
}

/** Zielabstand Z = dx begrenzt auf −48 … +48 und Zielpunkt x_Z = ⌊x_Gegner⌋ − Z (5.4); setzt g.ziel_abstand, g.ziel_x. */
export function zielabstandSetzen(welt: Welt, g: Gegner): void {
  const { dx } = weltAbstand(welt, g);
  const z = Math.max(-ZIELABSTAND_MAX, Math.min(ZIELABSTAND_MAX, dx));
  g.ziel_abstand = z;
  g.ziel_x = ganz(g.x) - z;
}

/** Schaden beim Angriffsbeginn (5.4, 8): Startgegner fest, sonst nach der Rangstufe dieses Frames. */
function nahSchaden(welt: Welt, g: Gegner): number {
  if (g.werte === 'start') return g.schaden;
  const tabelle = g.typ === 'Rammbock' ? SCHADEN_RAMMBOCK : SCHADEN_BOLZER;
  return tabelle[rangstufe(welt.rang.rang)] as number;
}

/** Neue Gruppe (5.6): Bolzer 2 bis 5 normale; Rammbock Sprungtritt mit 30 %, sonst 1 bis 3 normale. */
function neueGruppe(welt: Welt, g: Gegner): void {
  g.timer['gruppe_aktiv'] = 1;
  g.gruppe_umwerf = '';
  if (g.typ === 'Rammbock') {
    const rs = prozent(g.zufall, RAMMBOCK_SPRUNGTRITT_ANTEIL);
    if (festWahl(welt, FEST.sprungtritt, ['ja', 'nein'] as const, rs ? 'ja' : 'nein') === 'ja') {
      g.gruppe_rest = 0;
      g.gruppe_umwerf = 'RS';
      return;
    }
    g.gruppe_rest = festZahl(welt, FEST.gruppe, wahl(g.zufall, RAMMBOCK_GRUPPE));
    return;
  }
  g.gruppe_rest = festZahl(welt, FEST.gruppe, wahl(g.zufall, BOLZER_GRUPPE));
}

/** Normaler Angriff (5.6): Bolzer BA 70 %, BB 25 %, BC 5 %; Rammbock RA, RB je 50 %. */
function normalerAngriff(welt: Welt, g: Gegner): NahCode {
  const rammbock = g.typ === 'Rammbock';
  const codes = rammbock ? RAMMBOCK_CODES : BOLZER_CODES;
  const i = anteil(g.zufall, rammbock ? RAMMBOCK_ANGRIFF_ANTEILE : BOLZER_ANGRIFF_ANTEILE);
  return festWahl(welt, FEST.angriff, codes, eintrag(codes, i));
}

/** Umwerf-Angriff (5.6): Bolzer nach BA BUB mit 60 %, sonst BUA (ohne Ziehung); Rammbock RU 70 %, RS 30 %. */
function umwerfAngriff(welt: Welt, g: Gegner): NahCode {
  if (g.typ === 'Rammbock') {
    const codes = ['RU', 'RS'] as const satisfies readonly NahCode[];
    return festWahl(welt, FEST.umwerf, codes, eintrag(codes, anteil(g.zufall, RAMMBOCK_UMWERF_ANTEILE)));
  }
  if (tm(g, 'letzter_ba') !== 1) return festWahl(welt, FEST.umwerf, ['BUA', 'BUB'] as const, 'BUA');
  const bub = prozent(g.zufall, BOLZER_BUB_ANTEIL);
  return festWahl(welt, FEST.umwerf, ['BUA', 'BUB'] as const, bub ? 'BUB' : 'BUA');
}

/**
 * Angriffsbeginn A im laufenden Frame (5.4 bis 5.6): Code wählen (Gruppe,
 * normaler oder Umwerf-Angriff; vorgegeben bei BUB direkt nach BA),
 * Zielabstand, Schaden, Instanz anlegen (aktiv ab A + Startup), AS:sn:Code.
 */
function beginneAngriff(welt: Welt, g: Gegner, vorgegeben: NahCode | null): void {
  let code: NahCode;
  let umwerf = false;
  if (vorgegeben !== null) {
    code = vorgegeben;
    umwerf = true;
    g.serie = true;
    g.gruppe_umwerf = '';
    g.timer['gruppe_aktiv'] = 0;
  } else {
    if (!g.serie) {
      g.serie = true;
      g.timer['gruppe_aktiv'] = 0;
    }
    if (tm(g, 'gruppe_aktiv') !== 1) neueGruppe(welt, g);
    if (g.gruppe_umwerf !== '' && istNahCode(g.gruppe_umwerf)) {
      code = g.gruppe_umwerf;
      umwerf = true;
      g.gruppe_umwerf = '';
      g.timer['gruppe_aktiv'] = 0;
    } else if (g.gruppe_rest > 0) {
      code = normalerAngriff(welt, g);
      g.gruppe_rest -= 1;
      g.timer['letzter_ba'] = code === 'BA' ? 1 : 0;
    } else {
      code = umwerfAngriff(welt, g);
      umwerf = true;
      g.timer['gruppe_aktiv'] = 0;
    }
  }
  const w = NAH_ANGRIFFE[code];
  const f = welt.frame;
  g.blick = blickZu(g, welt.figur);
  zielabstandSetzen(welt, g);
  g.schaden = nahSchaden(welt, g);
  g.angriff_code = code;
  g.angriff_a = f;
  g.angriff_abgebrochen = false;
  g.timer['ist_umwerf'] = umwerf ? 1 : 0;
  g.angriff_treffer = 0;
  g.angriff_aktiv_ende = f + w.aktiv_bis;
  g.timer['nachlauf_null'] = 0;
  g.timer['rs_inaktiv'] = 0;
  g.timer['rs_a'] = code === 'RS' ? f : 0;
  g.angriff = angriffsinstanz({
    code,
    angreifer: g.schluessel,
    flaeche: nahFlaeche(code, g),
    schaden: g.schaden,
    umwerfen: w.umwerfen,
    richtung: 'weg',
    trefferstopp: true,
    einmal: true,
    gegen: 'figur',
    beginn: f,
  });
  modusSetzen(g, 'ANGRIFF');
  g.aktion = code === 'RS' ? 'SPRUNG' : 'ANGRIFF';
  ereignis(welt, EREIGNIS.ANGRIFF, g.schluessel, code);
}

/** Darf der Gegner jetzt einen Angriff beginnen (im aktiven Fenster, keine Sperre nach E-10)? */
function darfAngreifen(welt: Welt, g: Gegner): boolean {
  return imFenster(g, welt.kamera.x) && !rechteGesperrt(welt);
}

/** Nachlauf nach dem letzten aktiven Frame (5.5): Länge gleichverteilt aus der Spanne ohne bzw. mit Treffer. */
function nachlaufBeginnen(welt: Welt, g: Gegner): void {
  const code = g.angriff_code;
  g.angriff = null;
  let n = 0;
  if (istNahCode(code) && tm(g, 'nachlauf_null') !== 1) {
    const w = NAH_ANGRIFFE[code];
    const [a, b] = g.angriff_treffer > 0 ? w.nachlauf_mit : w.nachlauf_ohne;
    n = a === b ? a : festZahl(welt, FEST.nachlauf, bereich(g.zufall, a, b));
  }
  g.nachlauf_ende = welt.frame + n - 1;
  if (n <= 0) {
    nachlaufEnde(welt, g);
    return;
  }
  modusSetzen(g, 'NACHLAUF');
  g.aktion = 'NACHLAUF';
}

/** Serienende (5.6): Recht zurück, Reaktion und Abwartezeit ziehen. */
function serienende(welt: Welt, g: Gegner): void {
  rechtAbgeben(welt, g);
  const rammbock = g.typ === 'Rammbock';
  const folgen = rammbock ? (['seitenwechsel', 'abwarten', 'spott'] as const) : (['abwarten', 'seitenwechsel', 'spott'] as const);
  const i = anteil(g.zufall, rammbock ? RAMMBOCK_SERIENENDE_ANTEILE : BOLZER_SERIENENDE_ANTEILE);
  const folge = festWahl(welt, FEST.serienende, ['abwarten', 'seitenwechsel', 'spott'] as const, folgen[i] as 'abwarten');
  g.abwarten_rest = festZahl(welt, FEST.abwarten, wahl(g.zufall, rammbock ? ABWARTEN_RAMMBOCK : ABWARTEN_BOLZER));
  if (folge === 'seitenwechsel') beginneSeitenwechsel(welt, g);
  else if (folge === 'spott') beginneSpott(g);
  else beginneAbwarten(g);
}

/** Ende des Nachlaufs (5.2): Serienende, BUB direkt nach BA oder Kampfhaltung für den nächsten Angriff. */
function nachlaufEnde(welt: Welt, g: Gegner): void {
  g.angriff = null;
  g.angriff_code = '';
  if (tm(g, 'serie_ende') === 1) {
    g.timer['serie_ende'] = 0;
    serienende(welt, g);
    return;
  }
  if (g.typ === 'Bolzer' && tm(g, 'gruppe_aktiv') === 1 && g.gruppe_rest === 0 && g.gruppe_umwerf === '' && tm(g, 'letzter_ba') === 1) {
    const code = umwerfAngriff(welt, g);
    if (code === 'BUB' && darfAngreifen(welt, g)) {
      beginneAngriff(welt, g, 'BUB');
      return;
    }
    g.gruppe_umwerf = code;
  }
  beginneKampfhaltung(welt, g);
}

// ===========================================================================
// Abwarten, Seitenwechsel (Welt 5.8)
// ===========================================================================

/** Platz k unter den wartenden Gegnern dieser Seite, nach Slot ab 0 (5.8). */
function warteplatz(welt: Welt, g: Gegner): number {
  let k = 0;
  for (const h of welt.gegner) {
    if (h.nr >= g.nr) break;
    if (h.belegt && istNahkaempfer(h) && h.modus === 'ABWARTEN' && h.seite === g.seite) k += 1;
  }
  return k;
}

/** Warteposition (5.8): |dx| = min(120 + 16·k, 140) auf der eigenen Seite, sonst auf der anderen; z = z_Figur im Band. */
function warteposition(welt: Welt, g: Gegner): { x: number; z: number } {
  const d = Math.min(WARTEABSTAND_BASIS + WARTEABSTAND_SCHRITT * warteplatz(welt, g), WARTEABSTAND_MAX);
  const fx = ganz(welt.figur.x);
  const k = welt.kamera.x;
  let x = fx + g.seite * d;
  if (x < k + HALTEPUNKT_MIN || x > k + HALTEPUNKT_MAX) x = fensterX(welt, fx - g.seite * d);
  return { x, z: bandZ(welt, x, ganz(welt.figur.z)) };
}

/** Zwischenziel über den Bogen (5.8), wenn das Ziel auf der anderen Seite der Figur liegt: erst z_Figur ± 40, dann x. */
function bogenZiel(welt: Welt, g: Gegner, x: number, z: number, richtung: Blick): { x: number; z: number } {
  const fx = ganz(welt.figur.x);
  const gx = ganz(g.x);
  if ((x - fx) * (gx - fx) >= 0) return { x, z };
  const zb = bandZ(welt, gx, ganz(welt.figur.z) + richtung * SEITENWECHSEL_Z);
  if (Math.abs(sub(g.z, ausGanz(zb))) >= WARTEPOSITION_TOLERANZ) return { x: gx, z: zb };
  return { x, z: zb };
}

// ===========================================================================
// W4
// ===========================================================================

function annaehernEntscheidung(welt: Welt, g: Gegner): void {
  if (g.recht === '' && !(darfAnfordern(g) && rechtAnfordern(welt, g))) {
    beginneAbwarten(g);
    abwartenEntscheidung(welt, g);
    return;
  }
  if (tm(g, 'verfolgung') === 1 && g.verfolgung_rest < 0) {
    const liste = g.typ === 'Rammbock' ? VERFOLGUNG_RAMMBOCK : VERFOLGUNG_BOLZER;
    const budget = festZahl(welt, FEST.verfolgung, wahl(g.zufall, liste));
    g.verfolgung_rest = budget * GEHBEFEHL_DAUER;
    g.gehbefehl_rest = 0;
  }
  if (tm(g, 'angekommen') === 1) {
    g.timer['angekommen'] = 0;
    if (dzImKampfbereich(weltAbstand(welt, g).dz)) {
      beginneKampfhaltung(welt, g);
      return;
    }
  }
  if (tm(g, 'verfolgung') === 1 && g.verfolgung_rest === 0) {
    rechtAbgeben(welt, g);
    const z = ziehenAus(g.zufall, SPOTT_ODER_ABWARTEN_AUS);
    const folge = festWahl(welt, FEST.spott_oder_abwarten, ['spott', 'abwarten'] as const, z === 0 ? 'spott' : 'abwarten');
    if (folge === 'spott') beginneSpott(g);
    else beginneAbwarten(g);
    return;
  }
  if (g.gehbefehl_rest <= 0) gehstufeZiehen(welt, g);
}

function abwartenEntscheidung(welt: Welt, g: Gegner): void {
  if (darfAnfordern(g) && rechtAnfordern(welt, g)) {
    beginneAnnaehern(g, false);
    annaehernEntscheidung(welt, g);
    return;
  }
  const w = warteposition(welt, g);
  if (!nahAn(g, w.x, w.z, WARTEPOSITION_TOLERANZ) && g.gehbefehl_rest <= 0) gehstufeZiehen(welt, g);
}

function kampfhaltungEntscheidung(welt: Welt, g: Gegner): void {
  if (g.recht === '') {
    beginneAbwarten(g);
    abwartenEntscheidung(welt, g);
    return;
  }
  if (!inKampfbereich(welt, g)) {
    beginneAnnaehern(g, true);
    annaehernEntscheidung(welt, g);
    return;
  }
  g.blick = blickZu(g, welt.figur);
  if (welt.frame >= g.kampfhaltung_s + g.pause && darfAngreifen(welt, g)) beginneAngriff(welt, g, null);
}

function angriffEntscheidung(welt: Welt, g: Gegner): void {
  if (g.recht === '' && !sprungtrittInDerLuft(welt, g)) {
    beginneAbwarten(g);
    abwartenEntscheidung(welt, g);
    return;
  }
  if (welt.frame > g.angriff_aktiv_ende && !sprungtrittInDerLuft(welt, g)) nachlaufBeginnen(welt, g);
}

function nachlaufEntscheidung(welt: Welt, g: Gegner): void {
  if (g.recht === '') {
    beginneAbwarten(g);
    abwartenEntscheidung(welt, g);
    return;
  }
  if (welt.frame > g.nachlauf_ende) nachlaufEnde(welt, g);
}

/**
 * W4 für einen Bolzer oder Rammbock (nicht in einer Reaktion, Logik an):
 * Auftritt, Recht anfordern (E-3), Zustand nach 5.2 (FREI nach einer
 * Reaktion: 5.9), Gehstufe, Angriffsbeginn A. Modus nur über modusSetzen.
 */
export function nahEntscheidung(welt: Welt, g: Gegner): void {
  if (g.lp < 0) return;
  if (g.recht === '') g.seite = seiteAus(weltAbstand(welt, g).dx, g.seite);
  if (g.abwarten_rest > 0) g.abwarten_rest -= 1;
  switch (g.modus) {
    case 'WARTEN':
      g.aktion = 'WARTEN';
      return;
    case 'AUFTRITT':
      if (welt.frame >= g.kampffaehig_ab) {
        g.zustand = ZUSTAND_NORMAL;
        nachFreiwerden(welt, g);
        break;
      }
      return;
    case 'FREI':
      nachFreiwerden(welt, g);
      break;
    case 'SPOTT':
      if (g.modus_uhr > SPOTT_DAUER) {
        beginneAbwarten(g);
        break;
      }
      return;
    case 'SEITENWECHSEL':
      if (tm(g, 'angekommen') === 1) {
        g.timer['angekommen'] = 0;
        beginneAnnaehern(g, false);
        break;
      }
      if (g.gehbefehl_rest <= 0) gehstufeZiehen(welt, g);
      return;
    case 'ANNAEHERN':
      annaehernEntscheidung(welt, g);
      return;
    case 'ABWARTEN':
      abwartenEntscheidung(welt, g);
      return;
    case 'KAMPFHALTUNG':
      kampfhaltungEntscheidung(welt, g);
      return;
    case 'ANGRIFF':
      angriffEntscheidung(welt, g);
      return;
    case 'NACHLAUF':
      nachlaufEntscheidung(welt, g);
      return;
    default:
      return;
  }
  // Folgezustand dieses Frames weiterführen (Gehstufe, Recht)
  const folge: GegnerModus = modusVon(g);
  if (folge === 'ANNAEHERN') annaehernEntscheidung(welt, g);
  else if (folge === 'ABWARTEN') abwartenEntscheidung(welt, g);
}

// ===========================================================================
// KS3
// ===========================================================================

/** Gehbefehl um einen Frame weiterzählen. */
function gehbefehlZaehlen(g: Gegner): void {
  if (g.gehbefehl_rest > 0) g.gehbefehl_rest -= 1;
}

function annaehernGehen(welt: Welt, g: Gegner): void {
  const fig = welt.figur;
  const h = g.haltabstand > 0 ? g.haltabstand : HALTABSTAND_NORMAL;
  const vorher = weltAbstand(welt, g);
  g.blick = blickZu(g, fig);
  if (Math.abs(vorher.dx) <= h && dzImKampfbereich(vorher.dz)) {
    g.timer['angekommen'] = 1;
    g.aktion = 'STAND';
    return;
  }
  if (Math.abs(vorher.dx) <= h) {
    gehen(welt, g, ganz(g.x), ganz(fig.z), gehTempo(g), true);
  } else {
    const hx = fensterX(welt, ganz(fig.x) + g.seite * h);
    gehen(welt, g, hx, bandZ(welt, hx, ganz(fig.z)), gehTempo(g));
  }
  g.aktion = 'GEHEN';
  gehbefehlZaehlen(g);
  if (tm(g, 'verfolgung') === 1 && g.verfolgung_rest > 0) g.verfolgung_rest -= 1;
  const nachher = weltAbstand(welt, g);
  if (Math.abs(nachher.dx) <= h && dzImKampfbereich(nachher.dz)) g.timer['angekommen'] = 1;
}

function abwartenGehen(welt: Welt, g: Gegner): void {
  const w = warteposition(welt, g);
  g.blick = blickZu(g, welt.figur);
  if (nahAn(g, w.x, w.z, WARTEPOSITION_TOLERANZ)) {
    g.aktion = 'STAND';
    return;
  }
  const ziel = bogenZiel(welt, g, w.x, w.z, bogenRichtung(welt));
  gehen(welt, g, ziel.x, ziel.z, gehTempo(g));
  g.aktion = 'GEHEN';
  gehbefehlZaehlen(g);
}

function seitenwechselGehen(welt: Welt, g: Gegner): void {
  const fig = welt.figur;
  const fx = ganz(fig.x);
  const ws: Blick = tm(g, 'wechsel_seite') >= 0 ? 1 : -1;
  const richtung: Blick = tm(g, 'wechsel_z') >= 0 ? 1 : -1;
  const zielX = fensterX(welt, fx + ws * SEITENWECHSEL_DX);
  const ziel = bogenZiel(welt, g, zielX, bandZ(welt, zielX, ganz(fig.z) + richtung * SEITENWECHSEL_Z), richtung);
  g.blick = blickZu(g, fig);
  gehen(welt, g, ziel.x, ziel.z, gehTempo(g));
  g.aktion = 'GEHEN';
  gehbefehlZaehlen(g);
  const gekreuzt = (ganz(g.x) - fx) * ws > 0;
  if (gekreuzt && Math.abs(sub(g.x, ausGanz(zielX))) < WARTEPOSITION_TOLERANZ) g.timer['angekommen'] = 1;
}

/** Höhe des Sprungtritts in A+5+n (n = 1 … 41): 5n − n(n−1)/8 (Welt 5.5), in 1/65536. */
export function sprungtrittHoehe(n: number): number {
  return sub(ausGanz(SPRUNGTRITT_HOEHE_LINEAR * n), divGanz(ausGanz(n * (n - 1)), SPRUNGTRITT_HOEHE_TEILER));
}

/** Flug des Sprungtritts (5.5): ab A+5 mit 3 px/Frame in Blickrichtung, Höhe nach sprungtrittHoehe, Aufsetzen in A+46. */
function sprungtrittFlug(welt: Welt, g: Gegner): void {
  const a = tm(g, 'rs_a');
  if (a <= 0 || (g.modus !== 'ANGRIFF' && g.modus !== 'NACHLAUF')) return;
  const n = welt.frame - a - SPRUNGTRITT_FLUG_AB;
  if (n < 1 || n > SPRUNGTRITT_AUFSETZEN - SPRUNGTRITT_FLUG_AB) return;
  const h = sprungtrittHoehe(n);
  const r = schrittBegrenzt(gegnerBegrenzung(welt), g.x, g.z, h, mulGanz(SPRUNGTRITT_X, g.blick), 0);
  g.x = r.x;
  g.h = h > 0 ? h : 0;
  if (n === SPRUNGTRITT_AUFSETZEN - SPRUNGTRITT_FLUG_AB) {
    g.h = 0;
    g.timer['rs_a'] = 0;
  }
}

/** Aktive Frames des laufenden Angriffs setzen (5.4, 5.5): A + Startup bis A + Ende, vor einem wirksamen Treffer. */
function angriffFrame(welt: Welt, g: Gegner): void {
  const code = g.angriff_code;
  g.aktion = code === 'RS' ? 'SPRUNG' : 'ANGRIFF';
  const inst = g.angriff;
  if (inst === null || !istNahCode(code)) return;
  const w = NAH_ANGRIFFE[code];
  const rel = welt.frame - g.angriff_a;
  let aktiv = rel >= w.aktiv_von && rel <= w.aktiv_bis && g.angriff_treffer === 0 && !g.angriff_abgebrochen;
  if (code === 'RS') aktiv = aktiv && g.h > 0 && tm(g, 'rs_inaktiv') !== 1;
  inst.aktiv = aktiv;
}

/**
 * KS3 für einen Bolzer oder Rammbock (nicht in einer Reaktion): die in W4
 * entschiedene Bewegung (Schritt mit stage.ts schrittBegrenzt, ohne
 * Bildränder), Angriffsablauf fortschreiben, g.angriff.aktiv für diesen Frame
 * setzen (Welt 5.4, 5.5).
 */
export function nahBewegung(welt: Welt, g: Gegner): void {
  if (g.lp < 0) return;
  sprungtrittFlug(welt, g);
  switch (g.modus) {
    case 'WARTEN':
      g.aktion = 'WARTEN';
      break;
    case 'AUFTRITT':
      g.aktion = 'AUFTRITT';
      break;
    case 'FREI':
      g.aktion = 'STAND';
      break;
    case 'ANNAEHERN':
      annaehernGehen(welt, g);
      break;
    case 'ABWARTEN':
      abwartenGehen(welt, g);
      break;
    case 'SEITENWECHSEL':
      seitenwechselGehen(welt, g);
      break;
    case 'KAMPFHALTUNG':
      g.aktion = 'STAND';
      g.blick = blickZu(g, welt.figur);
      break;
    case 'ANGRIFF':
      angriffFrame(welt, g);
      break;
    case 'NACHLAUF':
      g.aktion = 'NACHLAUF';
      break;
    case 'SPOTT':
      g.aktion = 'SPOTT';
      g.blick = blickZu(g, welt.figur);
      break;
    default:
      break;
  }
}

// ===========================================================================
// KS5, KS7
// ===========================================================================

/**
 * Liegt die Figur außerhalb des Abbruchfensters (5.4 Punkt 3): ⌊x_Figur⌋
 * außerhalb von x_Z − 32 … x_Z + 31 oder dz außerhalb von −10 … +11?
 */
export function ausserhalbAbbruchfenster(welt: Welt, g: Gegner): boolean {
  const fx = ganz(welt.figur.x);
  if (fx < g.ziel_x - ABBRUCH_LINKS || fx > g.ziel_x + ABBRUCH_RECHTS) return true;
  return !dzImKampfbereich(weltAbstand(welt, g).dz);
}

/**
 * KS5 (Kampf 2.2; Welt 5.4 Punkt 3): Abbruchprüfung von A+1 bis zum letzten
 * aktiven Frame ohne Treffer; bei Abbruch Instanz beenden, Ereignis AA:sn,
 * Verfolgung (ANNAEHERN). Nicht beim Sprungtritt.
 */
export function nahAbbruch(welt: Welt, g: Gegner): void {
  if (g.modus !== 'ANGRIFF' || g.angriff === null) return;
  const code = g.angriff_code;
  if (!istNahCode(code)) return;
  const w = NAH_ANGRIFFE[code];
  if (!w.abbruch || g.angriff_treffer > 0) return;
  const rel = welt.frame - g.angriff_a;
  if (rel < 1 || rel > w.aktiv_bis) return;
  if (!ausserhalbAbbruchfenster(welt, g)) return;
  g.angriff = null;
  g.angriff_abgebrochen = true;
  g.angriff_code = '';
  ereignis(welt, EREIGNIS.ABBRUCH, g.schluessel);
  beginneAnnaehern(g, true);
  g.aktion = 'STAND';
}

/**
 * KS7, Seite des Urhebers (Welt 5.4 Punkt 5, 5.6): wirksamer Treffer eines
 * Bolzers oder Rammbocks gegen die Figur: aktive Pose 7 Frames länger, beim
 * Bolzer mit Umwerfen Ende 7 Frames nach dem Treffer und Nachlauf 0; danach
 * trifft der Angriff nicht mehr. Wirft der Umwerf-Angriff wirksam um, endet
 * die Serie nach dem Nachlauf.
 */
export function nahHatGetroffen(welt: Welt, t: Treffer): void {
  const g = gegnerVon(welt, t.urheber);
  if (g === null || g.modus !== 'ANGRIFF' || t.code !== g.angriff_code) return;
  const code = g.angriff_code;
  if (!istNahCode(code)) return;
  const f = welt.frame;
  const umgeworfen = t.wirkung === 'U' || t.wirkung === 'X';
  g.angriff_treffer = f;
  if (g.typ === 'Bolzer' && umgeworfen) {
    g.angriff_aktiv_ende = f + GEGNER_TREFFERSTOPP;
    g.timer['nachlauf_null'] = 1;
  } else {
    g.angriff_aktiv_ende = g.angriff_a + NAH_ANGRIFFE[code].aktiv_bis + GEGNER_TREFFERSTOPP;
  }
  if (tm(g, 'ist_umwerf') === 1 && umgeworfen) g.timer['serie_ende'] = 1;
  if (g.angriff !== null) g.angriff.aktiv = false;
}
