// Ereignisse eines Frames nach docs/spezifikation-kampf.md, 11.4 und
// docs/spezifikation-welt.md, 11.4.
//
// Ein Eintrag besteht aus Feldern, getrennt durch „:“; die Einträge eines
// Frames stehen in der Reihenfolge ihres Eintretens im Logikschritt und
// werden im Protokoll durch „;“ getrennt (Spalte ereignis). Beteiligte: F
// (Figur), sn, on, gn. welt.ts leert welt.ereignisse zu Beginn jedes Schritts.
//
// Verwendung in Stufe 2:
//   ereignis(welt, 'KE', 'F', 2)           → „KE:F:2“
//   ereignis(welt, 'WL', 7)                → „WL:7“
//   ereignisTreffer(welt, t)               → „T:F>s0:KT1:3:R“ (nach dem Setzen von t.wirkung)
// Felder dürfen kein „,“, „;“ oder „:“ enthalten.

import type { SlotKey, Treffer } from './entitaeten.ts';
import { beteiligter } from './entitaeten.ts';

/** Was ereignis() braucht: die Ereignisliste des laufenden Frames. */
export interface MitEreignissen {
  ereignisse: string[];
}

/** Kennungen der Einträge (Kampf 11.4, Welt 11.4). */
export const EREIGNIS = {
  /** T:Angreifer>Ziel:Angriff:Schaden:Wirkung, Treffer */
  TREFFER: 'T',
  /** K:F:Betrag, Kosten des Spezialangriffs */
  KOSTEN: 'K',
  /** G:F>sn, Griff */
  GRIFF: 'G',
  /** L:sn, Losreißen */
  LOSREISSEN: 'L',
  /** WU:F>sn:V oder R, Wurf */
  WURF: 'WU',
  /** AU:F>on:Art, Aufnehmen */
  AUFNEHMEN: 'AU',
  /** WA:F:Art:Munition, Waffe fallen gelassen */
  WAFFE_FALLEN: 'WA',
  /** AB:gn, Abschuss */
  ABSCHUSS: 'AB',
  /** EX:gn, Einschlag einer Rakete */
  EINSCHLAG: 'EX',
  /** SP:F:n, Sprintbeginn */
  SPRINT: 'SP',
  /** KE:F:k, Kettenstufe k beginnt */
  KETTE: 'KE',
  /** FR:sn, Slot frei */
  FREI: 'FR',
  /** EI:Beschreibung, Eingriff ausgeführt */
  EINGRIFF: 'EI',
  /** WL:n, Welle ausgelöst */
  WELLE: 'WL',
  /** WK:sn, Weckreiz, Auftritt beginnt */
  WECKREIZ: 'WK',
  /** RE:sn:L oder R, Recht erhalten */
  RECHT_ERHALTEN: 'RE',
  /** RA:sn, Recht abgegeben */
  RECHT_ABGEGEBEN: 'RA',
  /** ZR:sn, Zielrecht erhalten */
  ZIELRECHT: 'ZR',
  /** AS:sn:Code, Angriffsbeginn A */
  ANGRIFF: 'AS',
  /** AA:sn, Abbruch */
  ABBRUCH: 'AA',
  /** SR:id, Sperre gibt frei */
  SPERRE_FREI: 'SR',
  /** HR:id, Halt gibt frei */
  HALT_FREI: 'HR',
  /** BL:a, BL:v, BL:e, Blende ausgelöst, Versetzen, Ende */
  BLENDE: 'BL',
  /** SA:s0:lp, Super-Armor springt auf lp zurück */
  SUPER_ARMOR: 'SA',
  /** BF:s0, Fall des Bosses, alle besiegt */
  BOSS_FALL: 'BF',
  /** ER:on:Art, Gegenstand erscheint */
  ERSCHEINT: 'ER',
  /** LA:on, Gegenstand gelandet */
  GELANDET: 'LA',
  /** EN:on:L, S oder E, Gegenstand entfernt (Liegezeit, Scrollen, Stage-Ende) */
  ENTFERNT: 'EN',
  /** NE:F, Neueinstieg */
  NEUEINSTIEG: 'NE',
  /** GO, Game Over */
  GAME_OVER: 'GO',
  /** SC, STAGE CLEAR */
  STAGE_CLEAR: 'SC',
  /** OV:Art, kein Objektslot frei, Objekt entsteht nicht (Welt 9.1; Kennung festgelegt von K0) */
  OBJEKT_VOLL: 'OV',
} as const;

/** Unzulässige Zeichen in Feldern (Trennzeichen von CSV, Einträgen und Feldern). */
const VERBOTEN = /[,;:\n\r]/;

/** Hängt einen Eintrag aus den Feldern an die Ereignisliste des Frames. */
export function ereignis(welt: MitEreignissen, ...felder: (string | number)[]): void {
  const texte = felder.map((f) => String(f));
  for (const t of texte) {
    if (VERBOTEN.test(t)) throw new RangeError(`Ereignisfeld „${t}“ enthält ein Trennzeichen`);
  }
  welt.ereignisse.push(texte.join(':'));
}

/** „A>Z“ für Griff, Wurf, Aufnehmen und Treffer. */
export function pfeil(a: SlotKey, z: SlotKey): string {
  return `${beteiligter(a)}>${beteiligter(z)}`;
}

/** Treffereintrag T:Angreifer>Ziel:Angriff:Schaden:Wirkung (Kampf 11.4); t.wirkung muss gesetzt sein. */
export function ereignisTreffer(welt: MitEreignissen, t: Treffer): void {
  if (t.wirkung === '') throw new RangeError('ereignisTreffer: wirkung ist nicht gesetzt');
  ereignis(welt, EREIGNIS.TREFFER, pfeil(t.angreifer, t.ziel), t.code, t.schaden, t.wirkung);
}

/** Beschreibung eines Eingriffs für EI (ohne Trennzeichen). */
export function eingriffText(ziel: string, feld: string, wert: string): string {
  return `${ziel}.${feld}=${wert}`.replace(/[,;:\s]/g, '_');
}
