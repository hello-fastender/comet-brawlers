// Angriffsinstanzen der Spielfigur (K1) nach docs/spezifikation-kampf.md,
// 5.2 (Flächen, Schaden, Umwerfen), 5.3 (aktive Frames nach der Aktionsuhr,
// Stoppframes), 5.6 (Ausfallschritt), 6.5 (Landung beim Neueinstieg),
// 8 (Kniestoß, Wurf, geworfener Gegner), 9.3 (Sprint-Sprungangriff), 9.4
// (Spezialangriff mit wachsender Fläche), 10.3 (Raketenexplosion).
//
// Schnittstelle zu treffer.ts (K2): Die Figur legt ihre Instanz in
// figur.angriff an, setzt aktiv vor KS6 für jeden Frame (false in
// Stoppframes) und entfernt sie am Ende. Flächen nach entitaeten.ts Flaeche;
// hoehe_angreifer_max ist die Grenze ⌊h⌋ der Figur (0 = nur am Boden).

import type { AngriffCode, Angriffsinstanz, Blick, SlotKey } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import { angriffsinstanz } from '../entitaeten.ts';
import {
  AUSFALL_AKTIV_BIS,
  AUSFALL_AKTIV_VON,
  KETTE4_ZWEITES_FENSTER_BIS,
  KETTE4_ZWEITES_FENSTER_VON,
  KETTE_AKTIV_BIS,
  KETTE_AKTIV_VON,
  KETTE_HINTEN,
  KETTE_HINTEN_WEG,
  KETTE_SCHADEN,
  KETTE_TIEFE,
  KETTE_VORN,
  KNIESTOSS_SCHADEN,
  KNIESTOSS_TREFFER,
  KOMBO_MAX,
  NEUEINSTIEG_LANDUNG_SCHADEN,
  NEUEINSTIEG_LANDUNG_SCHADEN_BOSS,
  RX_HINTEN,
  RX_SCHADEN,
  RX_TIEFE,
  RX_VORN,
  SPEZIAL_AKTIV_BIS,
  SPEZIAL_HINTEN,
  SPEZIAL_SCHADEN,
  SPEZIAL_STUFE_VON,
  SPEZIAL_TIEFE,
  SPEZIAL_VORN,
  SPRINTANGRIFF,
  SPRINT_SPRUNGANGRIFF,
  SPRUNGANGRIFF,
  SS_ERSTER_AKTIV,
  SS_ERSTER_HOEHE_MAX,
  SS_ZWEITER_AKTIV_BIS,
  SS_ZWEITER_AKTIV_VON,
  SS_ZWEITER_HOEHE_MAX,
  WG_HALBBREITE,
  WG_SCHADEN,
  WG_TIEFE,
  WURF_SCHADEN,
} from '../werte.ts';
import type { Variante } from './intern.ts';
import { intern } from './intern.ts';

/** Eintrag i einer Wertetabelle (Index geprüft). */
export function tab(werte: readonly number[], i: number): number {
  const w = werte[i];
  if (w === undefined) throw new RangeError(`Tabellenindex ${i} außerhalb (Länge ${werte.length})`);
  return w;
}

/** Codes der Kettenstufen 1 bis 4 (Kampf 5.2). */
const KETTE_CODES: readonly AngriffCode[] = ['KT1', 'KT2', 'KT3', 'KT4'];

/** Sprungangriff-Werte je Variante (Kampf 5.2). */
function sprungWerte(v: Variante): (typeof SPRUNGANGRIFF)[keyof typeof SPRUNGANGRIFF] {
  switch (v) {
    case 'R':
      return SPRUNGANGRIFF.R;
    case 'H':
      return SPRUNGANGRIFF.H;
    case 'T':
      return SPRUNGANGRIFF.T;
    default:
      return SPRUNGANGRIFF.N;
  }
}

// ===========================================================================
// Instanzen anlegen (Schaden steht beim Angriffsbeginn fest)
// ===========================================================================

/** Kettenstufe 1 bis 4 (Kampf 5.2): Boden, Tiefe 12, hinten je nach Blick des Ziels (K8), Stufe 4 wirft um. */
export function ketteInstanz(stufe: number, beginn: number): Angriffsinstanz {
  const i = stufe - 1;
  const code = KETTE_CODES[i];
  if (code === undefined) throw new RangeError(`Kettenstufe ${stufe}`);
  return angriffsinstanz({
    code,
    angreifer: 'f',
    flaeche: {
      art: 'abstand',
      vorn: tab(KETTE_VORN, i),
      hinten: tab(KETTE_HINTEN, i),
      hinten_weg: tab(KETTE_HINTEN_WEG, i),
      tiefe: KETTE_TIEFE,
      hoehe_angreifer_max: 0,
      hoehe_ziel_max: null,
    },
    schaden: tab(KETTE_SCHADEN, i),
    umwerfen: stufe === KOMBO_MAX,
    richtung: 'blick',
    trefferstopp: true,
    gegen: 'gegner',
    beginn,
  });
}

/** Sprungangriff N, R, H oder T (Kampf 5.2): Höhengrenze der Figur je Variante. */
export function sprungangriffInstanz(v: Variante, beginn: number): Angriffsinstanz {
  const w = sprungWerte(v);
  return angriffsinstanz({
    code: w.code,
    angreifer: 'f',
    flaeche: { art: 'abstand', vorn: w.vorn, hinten: w.hinten, hinten_weg: null, tiefe: w.tiefe, hoehe_angreifer_max: w.hoehe_max, hoehe_ziel_max: null },
    schaden: w.schaden,
    umwerfen: w.umwerfen,
    richtung: 'blick',
    trefferstopp: true,
    gegen: 'gegner',
    beginn,
  });
}

/** Sprintangriff SA (Kampf 5.2, 9.3). */
export function sprintangriffInstanz(beginn: number): Angriffsinstanz {
  const w = SPRINTANGRIFF;
  return angriffsinstanz({
    code: w.code,
    angreifer: 'f',
    flaeche: { art: 'abstand', vorn: w.vorn, hinten: w.hinten, hinten_weg: null, tiefe: w.tiefe, hoehe_angreifer_max: 0, hoehe_ziel_max: null },
    schaden: w.schaden,
    umwerfen: w.umwerfen,
    richtung: 'blick',
    trefferstopp: true,
    gegen: 'gegner',
    beginn,
  });
}

/** Sprint-Sprungangriff SS (Kampf 5.2, 9.3, P7, E15): 38 bis 147 px vor der Figur; Höhengrenze je aktivem Frame. */
export function ssInstanz(beginn: number): Angriffsinstanz {
  const w = SPRINT_SPRUNGANGRIFF;
  return angriffsinstanz({
    code: w.code,
    angreifer: 'f',
    flaeche: { art: 'abstand', vorn: w.vorn, hinten: w.hinten, hinten_weg: null, tiefe: w.tiefe, hoehe_angreifer_max: SS_ERSTER_HOEHE_MAX, hoehe_ziel_max: null },
    schaden: w.schaden,
    umwerfen: w.umwerfen,
    richtung: 'blick',
    trefferstopp: true,
    gegen: 'gegner',
    beginn,
  });
}

/** Spezialangriff SP (Kampf 5.2, 9.4): Fläche der Stufe 1, wächst je Stufe; Umwerfen von der Figur weg. */
export function spezialInstanz(beginn: number): Angriffsinstanz {
  return angriffsinstanz({
    code: 'SP',
    angreifer: 'f',
    flaeche: {
      art: 'abstand',
      vorn: tab(SPEZIAL_VORN, 0),
      hinten: tab(SPEZIAL_HINTEN, 0),
      hinten_weg: null,
      tiefe: SPEZIAL_TIEFE,
      hoehe_angreifer_max: 0,
      hoehe_ziel_max: null,
    },
    schaden: SPEZIAL_SCHADEN,
    umwerfen: true,
    richtung: 'weg',
    trefferstopp: true,
    gegen: 'gegner',
    beginn,
  });
}

/** Kniestoß KN (Kampf 5.2, 8.3): nur der gehaltene Gegner; der dritte wirft um (Bahn F2 in Blickrichtung). */
export function knieInstanz(ziel: SlotKey, umwerfen: boolean, beginn: number): Angriffsinstanz {
  return angriffsinstanz({
    code: 'KN',
    angreifer: 'f',
    flaeche: { art: 'gehalten' },
    schaden: KNIESTOSS_SCHADEN,
    umwerfen,
    bahn: umwerfen ? 'F2' : '',
    richtung: 'blick',
    trefferstopp: false,
    ziel,
    gegen: 'gegner',
    behaelter: false,
    beginn,
  });
}

/** Wurf WU (Kampf 5.2, 8.4): nur der gehaltene Gegner in E+1, Bahn F3 in Wurfrichtung (figur.bahn_richtung). */
export function wurfInstanz(ziel: SlotKey, beginn: number): Angriffsinstanz {
  return angriffsinstanz({
    code: 'WU',
    angreifer: 'f',
    flaeche: { art: 'gehalten' },
    schaden: WURF_SCHADEN,
    umwerfen: true,
    bahn: 'F3',
    richtung: 'bahn',
    trefferstopp: false,
    ziel,
    gegen: 'gegner',
    behaelter: false,
    beginn,
  });
}

/** Geworfener Gegner WG (Kampf 5.2, 8.5, P8): |dx| ≤ 52, |dz| ≤ 17 um den Geworfenen, F1 in seiner Flugrichtung. */
export function wgInstanz(geworfener: SlotKey, beginn: number): Angriffsinstanz {
  return angriffsinstanz({
    code: 'WG',
    angreifer: geworfener,
    urheber: 'f',
    flaeche: { art: 'umkreis', halbbreite: WG_HALBBREITE, tiefe: WG_TIEFE, hoehe_ziel_max: null },
    schaden: WG_SCHADEN,
    umwerfen: true,
    richtung: 'bahn',
    trefferstopp: false,
    gegen: 'gegner',
    beginn,
  });
}

/** Landung beim Neueinstieg LN (Kampf 6.5, P30): jeder wache Gegner im Bild, 5 LP, Boss 10 LP, F1 von der Figur weg. */
export function landungInstanz(beginn: number): Angriffsinstanz {
  return angriffsinstanz({
    code: 'LN',
    angreifer: 'f',
    flaeche: { art: 'bild' },
    schaden: NEUEINSTIEG_LANDUNG_SCHADEN,
    schaden_boss: NEUEINSTIEG_LANDUNG_SCHADEN_BOSS,
    umwerfen: true,
    richtung: 'weg',
    trefferstopp: false,
    gegen: 'gegner',
    behaelter: false,
    beginn,
  });
}

/**
 * Raketenexplosion RX am Geschossslot (Kampf 5.2, 10.3, P9, E14): Einschlag
 * −66 bis +90 in Flugrichtung, Tiefe 28, 8 LP, F1 in Flugrichtung
 * (bahn_richtung der Rakete), zerbricht Behälter.
 */
export function explosionInstanz(rakete: SlotKey, x: number, z: number, richtung: Blick, beginn: number): Angriffsinstanz {
  return angriffsinstanz({
    code: 'RX',
    angreifer: rakete,
    urheber: 'f',
    flaeche: { art: 'punkt', x, z, richtung, vorn: RX_VORN, hinten: RX_HINTEN, tiefe: RX_TIEFE, ziel_blick_versatz: 0, hoehe_ziel_max: null },
    schaden: RX_SCHADEN,
    umwerfen: true,
    richtung: 'bahn',
    trefferstopp: false,
    gegen: 'gegner',
    beginn,
  });
}

// ===========================================================================
// Aktive Frames (Kampf 5.3: nach der Aktionsuhr, nicht in Stoppframes)
// ===========================================================================

/** Index der Flächenstufe des Spezialangriffs zur Aktionsuhr (Kampf 9.4), −1 außerhalb. */
export function spezialStufe(uhr: number): number {
  if (uhr > SPEZIAL_AKTIV_BIS) return -1;
  let k = -1;
  for (let i = 0; i < SPEZIAL_STUFE_VON.length; i++) if (uhr >= tab(SPEZIAL_STUFE_VON, i)) k = i;
  return k;
}

/** Erster und letzter aktiver Frame (Aktionsuhr) der Kettenstufe, mit Ausfallschritt (Kampf 5.2, 5.6). */
export function ketteFenster(stufe: number, ausfall: number): { von: number; bis: number } {
  const i = stufe - 1;
  if (ausfall > 0) return { von: tab(AUSFALL_AKTIV_VON, i), bis: tab(AUSFALL_AKTIV_BIS, i) };
  return { von: tab(KETTE_AKTIV_VON, i), bis: tab(KETTE_AKTIV_BIS, i) };
}

/** Ist die Kettenstufe in diesem Frame aktiv (Kampf 5.2: Stufe 4 ohne Treffer erneut uhr 17 bis 20)? */
function ketteAktiv(welt: Welt): boolean {
  const f = welt.figur;
  if (f.aktion !== 'SCHLAG' && f.aktion !== 'LEERSCHLAG') return false;
  if (f.ausfallschritt < 0) return false;
  const w = ketteFenster(f.kombo, f.ausfallschritt);
  if (f.uhr >= w.von && f.uhr <= w.bis) return true;
  return f.kombo === KOMBO_MAX && f.treffer_h === 0 && f.uhr >= KETTE4_ZWEITES_FENSTER_VON && f.uhr <= KETTE4_ZWEITES_FENSTER_BIS;
}

/**
 * Setzt figur.angriff.aktiv für diesen Frame (vor KS6). In Stoppframes prüft
 * die Instanz nicht (Kampf 5.3). Beim Spezialangriff wächst die Fläche je
 * Stufe (9.4), beim Sprint-Sprungangriff gilt je Abschnitt eine eigene
 * Höhengrenze (9.3).
 */
export function angriffAktivSetzen(welt: Welt, stoppframe: boolean): void {
  const f = welt.figur;
  const a = f.angriff;
  if (a === null) return;
  if (stoppframe) {
    a.aktiv = false;
    return;
  }
  const i = intern(f);
  switch (a.code) {
    case 'KT1':
    case 'KT2':
    case 'KT3':
    case 'KT4':
      a.aktiv = ketteAktiv(welt);
      return;
    case 'SN':
    case 'SR':
    case 'SH':
    case 'ST': {
      const w = sprungWerte(i.variante);
      a.aktiv = f.aktion === 'SPRUNGANGRIFF' && f.uhr >= w.aktiv_von && f.uhr <= w.aktiv_bis && f.h > 0;
      return;
    }
    case 'SA':
      a.aktiv = f.aktion === 'SPRINTANGRIFF' && f.uhr >= SPRINTANGRIFF.aktiv_von && f.uhr <= SPRINTANGRIFF.aktiv_bis;
      return;
    case 'SS': {
      const fl = a.flaeche;
      if (i.ss_n === SS_ERSTER_AKTIV) {
        a.aktiv = true;
        if (fl.art === 'abstand') fl.hoehe_angreifer_max = SS_ERSTER_HOEHE_MAX;
      } else if (i.ss_n >= SS_ZWEITER_AKTIV_VON && i.ss_n <= SS_ZWEITER_AKTIV_BIS) {
        a.aktiv = true;
        if (fl.art === 'abstand') fl.hoehe_angreifer_max = SS_ZWEITER_HOEHE_MAX;
      } else {
        a.aktiv = false;
      }
      return;
    }
    case 'SP': {
      const k = f.aktion === 'SPEZIAL' ? spezialStufe(f.uhr) : -1;
      a.aktiv = k >= 0;
      if (k >= 0 && a.flaeche.art === 'abstand') {
        a.flaeche.vorn = tab(SPEZIAL_VORN, k);
        a.flaeche.hinten = tab(SPEZIAL_HINTEN, k);
      }
      return;
    }
    case 'KN':
      a.aktiv = f.aktion === 'KNIESTOSS' && f.uhr === KNIESTOSS_TREFFER;
      return;
    case 'WU':
      a.aktiv = f.aktion === 'WURF' && f.uhr === 1;
      return;
    case 'LN':
      a.aktiv = welt.frame === f.landung_ln;
      return;
    default:
      a.aktiv = false;
  }
}
