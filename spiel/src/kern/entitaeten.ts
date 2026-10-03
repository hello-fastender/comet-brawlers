// Entitäten, Slots, Angriffsinstanzen und Treffer nach
// docs/spezifikation-kampf.md, Abschnitt 3 (Felder), 4.3 (Aktionen der Figur),
// 5.1 bis 5.5 (Angriffsinstanz), 7 (Reaktionen) und
// docs/spezifikation-welt.md, 4.1 (Slots), 5.2, 6, 7.1 (Zustände der Gegner).
//
// Feldnamen folgen der Spezifikation wörtlich (x_vor, lp_max, letzter_angreifer,
// kombo_h …), damit Code, Protokoll und Spezifikation dieselben Wörter haben.
//
// Regeln für Stufe 2:
// - Alle Positionen, Geschwindigkeiten, Beschleunigungen sind Fest (16.16).
// - Abstände für Regeln an ganzzahligen Positionen (⌊v⌋, Kampf 2.3): abstand().
// - Ein freier Slot hat belegt = false und zustand = 0; anlegen nur über
//   freierGegner / freiesObjekt / freiesGeschoss + belegen, freigeben über
//   freigeben(). Slots werden immer aufsteigend durchlaufen.
// - Fehlt ein Feld, nicht ergänzen, sondern im Bericht vorschlagen. Für
//   modulinterne Zähler gibt es timer (Record, nie darüber iterieren).

import type { Fest } from './festkomma.ts';
import { ganz } from './festkomma.ts';
import type { Tasten } from './tasten.ts';
import type { Zufall } from './zufall.ts';
import {
  BOSS_SLOT,
  ERSTER_GEGNERSLOT,
  FENSTER_LINKS,
  FENSTER_RECHTS,
  FIGUR_LP,
  GEGNER_SLOTS,
  GESCHOSS_SLOTS,
  OBJEKT_SLOT_ERSTER,
  OBJEKT_SLOTS,
} from './werte.ts';

// ===========================================================================
// Grundtypen
// ===========================================================================

/** Blickrichtung: +1 rechts, −1 links (Kampf 2.3). */
export type Blick = 1 | -1;

/** Zustand (Kampf 3): 0 frei, 1 normal, 2 am Boden oder unverwundbar, 3 Trefferreaktion bzw. geschützt. */
export type Zustand = 0 | 1 | 2 | 3;

/** Zustand 0: Slot frei (Kampf 3). */
export const ZUSTAND_FREI: Zustand = 0;
/** Zustand 1: normal, verwundbar (Kampf 3). */
export const ZUSTAND_NORMAL: Zustand = 1;
/** Zustand 2: am Boden oder unverwundbar (umgeworfen, liegend, aufstehend, tot, gehalten, wartend, im Auftritt; Kampf 3). */
export const ZUSTAND_BODEN: Zustand = 2;
/** Zustand 3: Trefferreaktion bzw. geschützt (Kampf 3). */
export const ZUSTAND_REAKTION: Zustand = 3;

/** Slot einer Entität: f (Figur), s0 bis s19, o20 bis o59, g0 bis g4 (Kampf 3). */
export type SlotKey = 'f' | `s${number}` | `o${number}` | `g${number}`;

/** Animationszeiger (Kampf 3: Animation, Bild, Restdauer; läuft mit der Aktionsuhr). */
export interface Animation {
  name: string;
  bild: number;
  rest: number;
}

/** Flugbahnen (Kampf 5.7); '' = keine. */
export type Bahn = '' | 'F1' | 'F2' | 'F3' | 'F4' | 'F4b';

// ===========================================================================
// Aktionen und Zustände
// ===========================================================================

/** Aktionen der Figur (Kampf 4.3), Protokollspalte f_akt. */
export type FigurAktion =
  | 'STAND'
  | 'LAUF'
  | 'SPRINT'
  | 'SPRUNG'
  | 'LANDUNG'
  | 'SCHLAG'
  | 'LEERSCHLAG'
  | 'SPRUNGANGRIFF'
  | 'GRIFF'
  | 'KNIESTOSS'
  | 'WURF'
  | 'SPEZIAL'
  | 'SPRINTANGRIFF'
  | 'SPRINTSPRUNG'
  | 'GETROFFEN'
  | 'UMGEWORFEN'
  | 'LIEGEN'
  | 'AUFSTEHEN'
  | 'TOT'
  | 'WAFFE'
  | 'AUFNEHMEN'
  | 'NEUEINSTIEG';

/** Alle Aktionen der Figur in der Reihenfolge von Kampf 4.3. */
export const FIGUR_AKTIONEN: readonly FigurAktion[] = [
  'STAND', 'LAUF', 'SPRINT', 'SPRUNG', 'LANDUNG', 'SCHLAG', 'LEERSCHLAG', 'SPRUNGANGRIFF',
  'GRIFF', 'KNIESTOSS', 'WURF', 'SPEZIAL', 'SPRINTANGRIFF', 'SPRINTSPRUNG', 'GETROFFEN',
  'UMGEWORFEN', 'LIEGEN', 'AUFSTEHEN', 'TOT', 'WAFFE', 'AUFNEHMEN', 'NEUEINSTIEG',
];

/**
 * Unterphase der Figur, Protokollspalte f_ph (Kampf 11.3): Stufe 1 bis 4,
 * Variante N/R/H/T, Sprint-Sprungangriff SS, Wurf V/R, Bahn F/B/R; '' = keine.
 */
export type FigurPhase = '' | '1' | '2' | '3' | '4' | 'N' | 'R' | 'H' | 'T' | 'SS' | 'V' | 'F' | 'B';

/** Reaktionen der Gegner (Kampf 7); Name in sn_akt und sn_modus. */
export type Reaktion = 'GETROFFEN' | 'UMGEWORFEN' | 'LIEGEN' | 'AUFSTEHEN' | 'TOT' | 'GEHALTEN';

/** Alle Reaktionen (Kampf 7). */
export const REAKTIONEN: readonly Reaktion[] = ['GETROFFEN', 'UMGEWORFEN', 'LIEGEN', 'AUFSTEHEN', 'TOT', 'GEHALTEN'];

/** Zustände der Nahkämpfer (Welt 5.2). */
export type NahModus =
  | 'WARTEN'
  | 'AUFTRITT'
  | 'ANNAEHERN'
  | 'ABWARTEN'
  | 'KAMPFHALTUNG'
  | 'ANGRIFF'
  | 'NACHLAUF'
  | 'SEITENWECHSEL'
  | 'SPOTT';

/** Zustände des Fernkämpfers (Welt 6; POSE entfällt nach E17). */
export type FernModus = 'WARTEN' | 'AUFTRITT' | 'ANNAEHERN' | 'BEREIT' | 'ZIELEN' | 'SCHUSS' | 'ZURUECK' | 'KOLBENHIEB';

/** Zustände des Bosses (Welt 7.1). */
export type BossModus = 'WARTEN' | 'AUFTRITT' | 'BEREIT' | 'ANKUENDIGUNG' | 'ANGRIFF' | 'NACHLAUF' | 'STOSS' | 'TAUMELN';

/**
 * Protokollspalte sn_modus: Logikzustand nach Welt 5.2, 6, 7.1, in den
 * Reaktionen deren Name (Kampf 7). Zusätzlich (Festlegung K0):
 * - FREI: Reaktion beendet, die Gegnerlogik wählt im nächsten W4 den Zustand
 *   nach Welt 5.9 (setzt reaktion.ts am Ende einer Reaktion).
 * - PUPPE: Gegner mit Logik aus (Kampf 11.2), außerhalb der Reaktionen.
 */
export type GegnerModus = NahModus | FernModus | BossModus | Reaktion | 'FREI' | 'PUPPE';

/**
 * Protokollspalte sn_akt: Aktion des Körpers. In Reaktionen der Reaktionsname
 * (wie sn_modus), sonst die sichtbare Aktion (Festlegung K0): STAND, GEHEN,
 * ANGRIFF, NACHLAUF, WARTEN, AUFTRITT, SPOTT, ZIELEN, SCHUSS, SPRUNG
 * (Sprungtritt), TAUMELN, STOSS, ANKUENDIGUNG.
 */
export type GegnerAktion =
  | Reaktion
  | 'STAND'
  | 'GEHEN'
  | 'ANGRIFF'
  | 'NACHLAUF'
  | 'WARTEN'
  | 'AUFTRITT'
  | 'SPOTT'
  | 'ZIELEN'
  | 'SCHUSS'
  | 'SPRUNG'
  | 'TAUMELN'
  | 'STOSS'
  | 'ANKUENDIGUNG';

/** Typkennung der Gegner (Kampf 3), Protokollspalte sn_typ. */
export type GegnerTyp = 'Bolzer' | 'Rammbock' | 'Zünder' | 'Ballast' | 'Puppe';

/** Rolle (Kampf 3, 11.2): bestimmt Liegedauer und Startwerte. */
export type Rolle = 'leicht' | 'schwer' | 'fern' | 'boss';

/** Auftritt (Welt 2.1, 4.2); '' für Gegner aus der Prüfszene. */
export type Auftritt = '' | 'hocke' | 'versteck' | 'luke' | 'rand_links' | 'rand_rechts' | 'boss';

/** Typkennung der Objekte (Kampf 3, 11.5). */
export type ObjektTyp = 'Gegenstand' | 'Behälter' | 'Rakete' | 'Waffe' | 'Effekt';

/** Gegenstände der Scheibe (Kampf 3, 10). */
export type GegenstandArt = 'Kometenbraten' | 'Eisnudelschale' | 'Sternbeeren' | 'Raketenwerfer';

/** Behälter (Welt 9.2). */
export type BehaelterArt = 'Fass' | 'Bosskiste';

/** Flugphase eines Geschosses (Kampf 3) oder eines fliegenden Gegenstands; '' = keine. */
export type Flugphase = '' | 'FLUG' | 'EXPLOSION';

// ===========================================================================
// Angriffsinstanz (Kampf 3 Feld angriff; 5.1 bis 5.5)
// ===========================================================================

/**
 * Kennung eines Angriffs: Codes der Figur (Kampf 5.2), der Gegner (Welt 5.5,
 * 6, 7.3), Prüfangriff PA (Kampf 11.2) und LN (Landung beim Neueinstieg,
 * Kampf 6.5; Code festgelegt von K0). Der Armschwung trägt den Schwung
 * (AS1 bis AS3) in sn_angriff; im Treffereintrag steht der Code der Instanz.
 */
export type AngriffCode =
  | 'KT1' | 'KT2' | 'KT3' | 'KT4'
  | 'SN' | 'SR' | 'SH' | 'ST'
  | 'SA' | 'SS'
  | 'KN' | 'WU' | 'WG'
  | 'SP' | 'RX' | 'LN'
  | 'BA' | 'BB' | 'BC' | 'BUA' | 'BUB'
  | 'RA' | 'RB' | 'RU' | 'RS'
  | 'ZR' | 'ZK'
  | 'AS' | 'AS1' | 'AS2' | 'AS3' | 'AN' | 'KP'
  | 'PA';

/**
 * Trefferfläche als Bereich von Abständen (Kampf 5.1), keine Bildüberlappung.
 * Alle Abstände an ganzzahligen Positionen (Kampf 2.3). Zielhöhe zählt bei
 * Angriffen der Figur nicht (P6); bei Angriffen gegen die Figur begrenzt
 * hoehe_ziel_max die Figurhöhe.
 *
 * dz ist immer Kampf-Konvention: dz = ⌊z_Ziel⌋ − ⌊z_Ursprung⌋. Welt rechnet
 * Gegner minus Figur; ein Welt-Fenster dz −10 … +11 eines Gegners gegen die
 * Figur ist hier dz_min = −11, dz_max = +10.
 */
export type Flaeche =
  /**
   * Abstand zum Angreifer (Figur, Boss AS/AN, PA): d_vorn = (⌊x_Ziel⌋ − ⌊x_Angreifer⌋) · Blick
   * liegt in [−hinten, vorn]; |dz| ≤ tiefe. hinten_weg gilt statt hinten,
   * wenn das Ziel vom Angreifer wegschaut (Kette, K8). hinten < 0 heißt:
   * erst ab −hinten vor dem Angreifer (Sprint-Sprungangriff: hinten = −38).
   */
  | {
      art: 'abstand';
      vorn: number;
      hinten: number;
      hinten_weg: number | null;
      tiefe: number;
      /** Höhengrenze des Angreifers (⌊h⌋ ≤), 0 = nur am Boden, null = keine */
      hoehe_angreifer_max: number | null;
      /** Höhengrenze des Ziels (⌊h⌋ ≤), null = keine */
      hoehe_ziel_max: number | null;
    }
  /**
   * Fenster um einen Zielpunkt (Nahkämpfer, Welt 5.4): x_z − links ≤ ⌊x_Ziel⌋ ≤ x_z + rechts,
   * dz in [dz_min, dz_max], dazu d_vorn ≥ −hinten zum Angreifer.
   */
  | {
      art: 'fenster';
      x_z: number;
      links: number;
      rechts: number;
      dz_min: number;
      dz_max: number;
      hinten: number;
      hoehe_ziel_max: number | null;
    }
  /**
   * Abstand zu einem festen Punkt (Explosionen): d = ((⌊x_Ziel⌋ + versatz · Blick_Ziel) − x) · richtung
   * liegt in [−hinten, vorn]; |dz| ≤ tiefe mit dz = ⌊z_Ziel⌋ − z. Raketenexplosion der Figur:
   * Punkt = Einschlag, richtung = Flugrichtung, versatz 0. Explosion des Zünders
   * (mechanik „Fernangriffe der Gegner“): richtung = +1, hinten = 52, vorn = 51, versatz 4.
   */
  | {
      art: 'punkt';
      x: number;
      z: number;
      richtung: Blick;
      vorn: number;
      hinten: number;
      tiefe: number;
      ziel_blick_versatz: number;
      hoehe_ziel_max: number | null;
    }
  /** |dx| ≤ halbbreite und |dz| ≤ tiefe um den Angreifer (geworfener Gegner WG, Körperpresse KP). */
  | { art: 'umkreis'; halbbreite: number; tiefe: number; hoehe_ziel_max: number | null }
  /** Nur das Ziel in Angriffsinstanz.ziel (Kniestoß KN, Wurf WU: nur der gehaltene Gegner). */
  | { art: 'gehalten' }
  /** Jeder wache Gegner im Bild, 0 ≤ ⌊x⌋ − Kamera-x ≤ 383 (Landung LN, Kampf 6.5, P30). */
  | { art: 'bild' };

/**
 * Flugrichtung des Ziels bei Umwerfen (Kampf 5.7, Tabelle 5.2):
 * - blick: in Blickrichtung des Angreifers
 * - weg: vom Angreifer weg: d_vorn ≥ 0 → Blick des Angreifers, sonst −Blick
 *   (Spezialangriff 9.4; Figur als Ziel nach P14: gleiches x → Blick des Angreifers)
 * - bahn: in Bahnrichtung des Angreifers (geworfener Gegner WG, Raketen: bahn_richtung)
 */
export type RichtungsRegel = 'blick' | 'weg' | 'bahn';

/** Zielseite einer Instanz (Kampf 5.4). */
export type Zielseite = 'gegner' | 'figur';

/**
 * Laufende Angriffsinstanz (Kampf 3, Feld angriff; 5.5). Eine Instanz trifft
 * jedes Ziel höchstens einmal (getroffen), alle passenden Ziele im selben
 * Frame. Der Besitzer legt sie beim Angriffsbeginn an (Schaden dort
 * festgelegt), setzt aktiv vor KS6 für jeden Frame neu und entfernt sie am
 * Ende (angriff = null). treffer.ts liest nur und trägt in getroffen ein.
 */
export interface Angriffsinstanz {
  code: AngriffCode;
  /** Entität, deren Position und Blick die Fläche bestimmen (Figur, Gegner, Geschoss, geworfener Gegner) */
  angreifer: SlotKey;
  /** wem der Treffer zählt: Figur bei ihren Raketen und beim geworfenen Gegner; sonst = angreifer */
  urheber: SlotKey;
  flaeche: Flaeche;
  /** Schaden, beim Angriffsbeginn festgelegt (Kampf 3; Welt 5.4, 8) */
  schaden: number;
  /** abweichender Schaden gegen den Boss (Landung LN: 10, Kampf 6.5); null = schaden */
  schaden_boss: number | null;
  umwerfen: boolean;
  /** Bahn bei Umwerfen (Kampf 5.7); Tod wählt die Reaktion selbst (F4, F4b, F3) */
  bahn: Bahn;
  richtung: RichtungsRegel;
  /** Trefferstopp des Angreifers nach einem wirksamen Treffer (Kampf 5.3; Welt 5.4) */
  trefferstopp: boolean;
  /** prüft in diesem Frame; vom Besitzer vor KS6 gesetzt (Stoppframes: false) */
  aktiv: boolean;
  /** Ziel bei art 'gehalten' */
  ziel: SlotKey | null;
  /** Menge der schon getroffenen Ziele, in Trefferreihenfolge (nie als Set iterieren) */
  getroffen: SlotKey[];
  /** trifft insgesamt nur einmal (Gegnerangriffe gegen die Figur, Welt 5.4 Punkt 4) */
  einmal: boolean;
  /** Zielseite: 'gegner' (Angriffe der Figur und des geworfenen Gegners) oder 'figur' (Gegner, Geschosse der Gegner, PA) */
  gegen: Zielseite;
  /** zerbricht Behälter (Welt 9.2: jeder Treffer jeder Art) */
  behaelter: boolean;
  /** Frame des Angriffsbeginns (P, D, A, E, Q …) */
  beginn: number;
}

/** Neue Angriffsinstanz mit Standardwerten (aktiv false, getroffen leer). */
export function angriffsinstanz(p: {
  code: AngriffCode;
  angreifer: SlotKey;
  urheber?: SlotKey;
  flaeche: Flaeche;
  schaden: number;
  schaden_boss?: number | null;
  umwerfen: boolean;
  bahn?: Bahn;
  richtung?: RichtungsRegel;
  trefferstopp: boolean;
  ziel?: SlotKey | null;
  einmal?: boolean;
  gegen: Zielseite;
  behaelter?: boolean;
  beginn: number;
}): Angriffsinstanz {
  return {
    code: p.code,
    angreifer: p.angreifer,
    urheber: p.urheber ?? p.angreifer,
    flaeche: p.flaeche,
    schaden: p.schaden,
    schaden_boss: p.schaden_boss ?? null,
    umwerfen: p.umwerfen,
    bahn: p.bahn ?? (p.umwerfen ? 'F1' : ''),
    richtung: p.richtung ?? 'blick',
    trefferstopp: p.trefferstopp,
    aktiv: false,
    ziel: p.ziel ?? null,
    getroffen: [],
    einmal: p.einmal ?? false,
    gegen: p.gegen,
    behaelter: p.behaelter ?? true,
    beginn: p.beginn,
  };
}

// ===========================================================================
// Treffer (Folgen, Kampf 5.4, 6, 7; Ereignis T nach Kampf 11.4)
// ===========================================================================

/** Wirkung im Treffereintrag (Kampf 11.4): Reaktion, umgeworfen, Tod, Behälter zerbrochen, wirkungslos im Schutz. */
export type Wirkung = 'R' | 'U' | 'X' | 'B' | 'W';

/**
 * Ein Treffer eines Frames. trefferPruefen (KS6) legt ihn in welt.treffer an,
 * in der Reihenfolge von Kampf 5.4; KS7 gibt ihn erst an den Zielhandler
 * (setzt wirkung, schreibt das Ereignis T als Erstes, wendet LP und Reaktion
 * an), danach, wenn wirksam (wirkung ≠ 'W'), an den Handler des Urhebers
 * (Trefferstopp, Kosten, Serie).
 */
export interface Treffer {
  /** angreifende Entität (Figur, sn, on, gn; geworfener Gegner sn) */
  angreifer: SlotKey;
  /** Urheber für Punkte, Anzeige, letzter_angreifer und Trefferstopp */
  urheber: SlotKey;
  ziel: SlotKey;
  code: AngriffCode;
  /** Schaden gegen dieses Ziel (schaden_boss bereits eingerechnet) */
  schaden: number;
  umwerfen: boolean;
  bahn: Bahn;
  /** Flugrichtung bei Umwerfen nach der RichtungsRegel der Instanz */
  richtung: Blick;
  /** Angreifer steht vor dem Ziel (in Blickrichtung des Ziels, dx·Blick_Ziel ≥ 0): Boss SA3 */
  von_vorn: boolean;
  /** vom Zielhandler gesetzt; '' bis dahin */
  wirkung: Wirkung | '';
  /** LP des Ziels vor dem Treffer (vom Zielhandler gesetzt) */
  lp_vorher: number;
  instanz: Angriffsinstanz;
}

// ===========================================================================
// Entitäten
// ===========================================================================

/** Gemeinsame Felder aller Entitäten (Kampf 3). */
export interface EntitaetBasis {
  /** Slot dieser Entität (fest) */
  schluessel: SlotKey;
  /** Slotnummer (Figur 0, sn n, on n, gn n) */
  nr: number;
  belegt: boolean;
  typ: string;
  /** Position 16.16 (Kampf 3) */
  x: Fest;
  z: Fest;
  h: Fest;
  /** Geschwindigkeiten und Beschleunigungen laufender Bahnen (Kampf 3, 5.7) */
  vx: Fest;
  vz: Fest;
  vh: Fest;
  ax: Fest;
  gh: Fest;
  /** ganzzahlige Position am Ende des Vorframes (Kampf 3) */
  x_vor: number;
  z_vor: number;
  h_vor: number;
  lp: number;
  lp_vor: number;
  lp_max: number;
  zustand: Zustand;
  /** Unterphase (Stufe, Variante, Abschnitt) */
  phase: string;
  /** Aktionsuhr: Frames seit Aktionsbeginn ohne Stoppframes, Beginn = 1 (Kampf 3, 4.1) */
  uhr: number;
  /** verbleibende Stoppframes (Kampf 5.3) */
  stopp: number;
  anim: Animation;
  blick: Blick;
  angriff: Angriffsinstanz | null;
  /** Slot des Angreifers beim letzten Treffer (Kampf 3) */
  letzter_angreifer: SlotKey | null;
  /** laufende Bahn (Kampf 5.7) */
  bahn: Bahn;
  /** Richtung der laufenden Bahn bzw. Flugrichtung (+1/−1) */
  bahn_richtung: Blick;
  /** Bahnframe-Zähler (1 = erster Bahnframe), 0 = keine Bahn */
  bahn_frame: number;
  /** Ausgangspunkt der Bahn (Trefferort) */
  bahn_start_x: Fest;
  /** benannte modulinterne Zähler (Kampf 3, timer); nie darüber iterieren */
  timer: Record<string, number>;
}

/** Zustand der Doppeltipp-Erkennung (Kampf 9.1, P22). */
export interface Tipp {
  /** Richtungsmenge des laufenden Tipps (mit L oder R), 0 = keiner */
  lauf: Tasten;
  /** Dauer des laufenden Tipps in Frames */
  lauf_dauer: number;
  /** Frames ohne jede Richtung seit dem Ende des letzten Tipps */
  pause_dauer: number;
  /** Richtungsmenge und Dauer des vorigen Tipps */
  voriger: Tasten;
  voriger_dauer: number;
}

/** Spielfigur (Kampf 3, Zusatzfelder; Kampf 4 bis 10). */
export interface Figur extends EntitaetBasis {
  typ: 'Figur';
  aktion: FigurAktion;
  phase: FigurPhase;
  /** Schutz-Timer (Kampf 6.3) */
  schutz: number;
  /** Kombostufe 0 bis 4 (Kampf 4.1) */
  kombo: number;
  /** Frame des letzten Kettentreffers h, 0 = keiner */
  kombo_h: number;
  griff_ziel: SlotKey | null;
  /** Frames ohne neuen Griff nach einem Losreißen (Kampf 8.1) */
  griffsperre: number;
  /** verbleibende Haltefrist im Griff (Kampf 8.3) */
  haltefrist: number;
  waffe: '' | 'RW';
  munition: number;
  /** Sprintframe n, 0 = kein Sprint (Kampf 9.2) */
  sprint_n: number;
  /** aktuelles Sprinttempo in x (Kampf 9.2, 9.3) */
  sprint_tempo: Fest;
  /** Richtungsmenge des Sprints */
  sprint_richtung: Tasten;
  tipp: Tipp;
  /** gezählte Drücke im Liegen (Kampf 4.3) */
  liege_druecke: number;
  /** Druckframe der laufenden Aktion (P, D, J, A, K, E) */
  p: number;
  /** Tastenmenge im Druckframe der laufenden Aktion (T(P), T(D), T(A), T(E)) */
  p_tasten: Tasten;
  /** Sprung: J und T(J) (Kampf 4.4, 5.2) */
  sprung_j: number;
  sprung_tasten: Tasten;
  /** A eines Angriffs im Sprung oder Sprint (Kampf 5.2, 9.3) */
  angriff_a: number;
  /** h des letzten wirksamen Treffers der laufenden Aktion, 0 = keiner */
  treffer_h: number;
  /** Zahl der Frames mit Treffer in der laufenden Aktion (Stoppverlängerung) */
  treffer_frames: number;
  /** Drücke ab X (Kampf 4.3): A und S */
  druecke_ab: number;
  /** Richtung ab X (Kampf 4.3) */
  richtung_ab: number;
  /** Ausfallschritt beim Kettendruck: +1 Ausfall, −1 Schritt weg, 0 keiner (Kampf 5.6) */
  ausfallschritt: number;
  /** Bitmaske der Flächenstufen des Spezialangriffs mit Treffer (Kampf 9.4) */
  spezial_stufen: number;
  /** Frame, in dem die Kosten des Spezialangriffs fällig sind, 0 = keine (Kampf 6.4) */
  kosten_frame: number;
  /** H des letzten wirksamen Gegnertreffers */
  getroffen_h: number;
  /** Tod t, Neueinstieg N, Landung LN (Kampf 6.5); 0 = nicht gesetzt */
  tod_t: number;
  neueinstieg_n: number;
  landung_ln: number;
  /** Frame, in dem die Waffe fällt (H+1, Kampf 10.4), 0 = keiner */
  waffe_fallen_frame: number;
  /** Zahl der Kniestöße im laufenden Griff (Kampf 8.3) */
  knie_zahl: number;
  /** Wurf: E, geworfener Gegner, Richtung V/R (Kampf 8.4, 8.5) */
  wurf_e: number;
  wurf_ziel: SlotKey | null;
  wurf_richtung: '' | 'V' | 'R';
  /** Rutschtempo des Sprintangriffs (Kampf 9.3) */
  rutsch_v: Fest;
  /** Gegenstand, der in P+1 aufgenommen wird (Kampf 10.1) */
  aufnehmen_ziel: SlotKey | null;
}

/** Gegner in s0 bis s19 (Kampf 3; Welt 4 bis 8). */
export interface Gegner extends EntitaetBasis {
  typ: GegnerTyp | '';
  aktion: GegnerAktion;
  /** sn_modus (Welt 11.4) */
  modus: GegnerModus;
  /** Frames im aktuellen Modus, sn_timer (Welt 11.4); 1 im ersten Frame */
  modus_uhr: number;
  rolle: Rolle;
  /** Gegnerlogik an (Prüfszene: Puppe = aus, Kampf 11.2) */
  logik: boolean;
  /** fordert Rechte an (Welt 11.3: gegner.sn.erlaubnis=aus) */
  erlaubnis: boolean;
  vorplatziert: boolean;
  /** Startwerte oder Werte nach Rang (Welt 2.1, 4.5) */
  werte: 'start' | 'rang';
  /** LP sind noch nach Rang beim Erscheinen zu setzen (Welt 4.5, 8); wertet gegnerAngelegt (wellen.ts) aus */
  lp_offen: boolean;
  auftritt: Auftritt;
  /** Welle des Gegners, 0 = keine (Welt 2.1) */
  welle: number;
  rang_beim_erscheinen: number;
  gehalten_von: SlotKey | null;
  /** gezogene Liegedauer (Kampf 7, P18) */
  liegedauer: number;
  /** Frame des letzten Treffers h (Kampf 3) */
  reaktion_h: number;
  /** eigener Zufallsgenerator (Welt 11.1), Zähler = sn_zufall */
  zufall: Zufall;
  /** Seite zur Figur für die Rechte (Welt 5.7, E-1), +1 rechts der Figur */
  seite: Blick;
  /** gehaltenes Nahkampfrecht, sn_recht (Welt 5.7) */
  recht: '' | 'L' | 'R';
  /** hält das Zielrecht (Welt 6) */
  zielrecht: boolean;
  /** Angriffscode für sn_angriff (Welt 5.5, 7.3; Armschwung mit Schwung) */
  angriff_code: string;
  /** Zielabstand Z, sn_ziel (Welt 5.4) */
  ziel_abstand: number;
  /** Zielpunkt x_Z (Welt 5.4) */
  ziel_x: number;
  /** beim Angriffsbeginn gesetzter Schaden, sn_schaden (Welt 5.4, 8) */
  schaden: number;
  /** Frame A des laufenden Angriffs (Welt 5.3, 5.4) */
  angriff_a: number;
  /** Verlängerung der aktiven Frames durch den Trefferstopp (Welt 5.4 Punkt 5) */
  angriff_stopp: number;
  /** Angriff abgebrochen (Welt 5.4 Punkt 3) */
  angriff_abgebrochen: boolean;
  /** Pause in Kampfhaltung (Welt 5.1, 8) und Frame s ihres Beginns */
  pause: number;
  kampfhaltung_s: number;
  gehstufe: 'normal' | 'schnell';
  /** verbleibende Frames des Gehbefehls (Welt 5.3) */
  gehbefehl_rest: number;
  /** Haltabstand H (Welt 5.1) */
  haltabstand: number;
  /** Serie und Gruppe (Welt 5.6) */
  serie: boolean;
  gruppe_rest: number;
  gruppe_umwerf: string;
  /** Abwartezeit, Verfolgungsbudget, Nachlauf (Welt 5.1, 5.5, 5.8) */
  abwarten_rest: number;
  verfolgung_rest: number;
  nachlauf_rest: number;
  /** Weckreiz w und kampffähig ab (Welt 4.2) */
  weckreiz_w: number;
  kampffaehig_ab: number;
  /** keine Punkte beim Tod (Fall des Bosses, Welt 7.6) */
  ohne_punkte: boolean;
  /** Zielpunkt des Zünders (Welt 6) */
  zielpunkt_x: number;
  zielpunkt_z: number;
  /** Super-Armor des Bosses (Welt 7.4): lp_folge, Folge offen (0/1), letzter Treffer der Folge */
  lp_folge: number;
  folge: 0 | 1;
  folge_h: number;
  /** Boss: frühester Frame des nächsten Angriffs, Schwung k, Prüfstart-Schalter (Welt 7.2, 7.3, 11.3) */
  naechster_angriff: number;
  schwung: number;
  angriffe_an: boolean;
  bewegung_an: boolean;
  /** Tod t (Kampf 7) und Frame der Slotfreigabe */
  tod_t: number;
  frei_frame: number;
  /** im Frame von einer Handlung der Figur getroffen (Gegneranzeige, Welt 10.1) */
  getroffen_frame: number;
}

/** Objekt in o20 bis o59 oder Geschoss der Figur in g0 bis g4 (Kampf 3; Welt 9). */
export interface Objekt extends EntitaetBasis {
  typ: ObjektTyp | '';
  aktion: string;
  /** Gegenstand oder Behälterart; '' sonst */
  art: GegenstandArt | BehaelterArt | '';
  /** Kennung aus der Stage (Behälter F1, B1 …) */
  id: string;
  munition: number;
  /** Liegezeit f − L (Welt 9.3) */
  liegezeit: number;
  /** Frame der Landung L, 0 = nicht gelandet */
  landung_l: number;
  aufnehmbar: boolean;
  sichtbar: boolean;
  /** Inhalt eines Behälters: Gegenstandsart oder 'leer' */
  inhalt: GegenstandArt | 'leer' | '';
  zerbrochen: boolean;
  /** Frame des Zerbrechens h (Welt 9.2) */
  zerbrochen_h: number;
  flugphase: Flugphase;
  /** Flugframe n des Gegenstands (Welt 9.3) oder des Geschosses */
  flug_n: number;
  /** verbleibende Lebensdauer (leere Waffe, Explosion) */
  lebensdauer: number;
  einschlag_x: number;
  einschlag_z: number;
  besitzer: SlotKey | null;
  /** Abschuss P bzw. Q (Kampf 10.3; Welt 6) */
  abschuss: number;
}

/** Die Slottabelle der Welt (Kampf 3). welt.ts erfüllt diese Schnittstelle. */
export interface SlotTabelle {
  figur: Figur;
  /** s0 bis s19, Index = Slotnummer */
  gegner: Gegner[];
  /** o20 bis o59, Index = Slotnummer − 20 */
  objekte: Objekt[];
  /** g0 bis g4, Index = Slotnummer */
  geschosse: Objekt[];
}

// ===========================================================================
// Leere Entitäten
// ===========================================================================

function basisLeer(schluessel: SlotKey, nr: number): EntitaetBasis {
  return {
    schluessel,
    nr,
    belegt: false,
    typ: '',
    x: 0,
    z: 0,
    h: 0,
    vx: 0,
    vz: 0,
    vh: 0,
    ax: 0,
    gh: 0,
    x_vor: 0,
    z_vor: 0,
    h_vor: 0,
    lp: 0,
    lp_vor: 0,
    lp_max: 0,
    zustand: 0,
    phase: '',
    uhr: 0,
    stopp: 0,
    anim: { name: '', bild: 0, rest: 0 },
    blick: 1,
    angriff: null,
    letzter_angreifer: null,
    bahn: '',
    bahn_richtung: 1,
    bahn_frame: 0,
    bahn_start_x: 0,
    timer: {},
  };
}

/** Figur im Grundzustand (STAND, 72 LP, Zustand 1, Blick rechts, Position 0). */
export function figurNeu(): Figur {
  return {
    ...basisLeer('f', 0),
    typ: 'Figur',
    belegt: true,
    lp: FIGUR_LP,
    lp_vor: FIGUR_LP,
    lp_max: FIGUR_LP,
    zustand: ZUSTAND_NORMAL,
    aktion: 'STAND',
    phase: '',
    uhr: 1,
    schutz: 0,
    kombo: 0,
    kombo_h: 0,
    griff_ziel: null,
    griffsperre: 0,
    haltefrist: 0,
    waffe: '',
    munition: 0,
    sprint_n: 0,
    sprint_tempo: 0,
    sprint_richtung: 0,
    tipp: { lauf: 0, lauf_dauer: 0, pause_dauer: 0, voriger: 0, voriger_dauer: 0 },
    liege_druecke: 0,
    p: 0,
    p_tasten: 0,
    sprung_j: 0,
    sprung_tasten: 0,
    angriff_a: 0,
    treffer_h: 0,
    treffer_frames: 0,
    druecke_ab: 0,
    richtung_ab: 0,
    ausfallschritt: 0,
    spezial_stufen: 0,
    kosten_frame: 0,
    getroffen_h: 0,
    tod_t: 0,
    neueinstieg_n: 0,
    landung_ln: 0,
    waffe_fallen_frame: 0,
    knie_zahl: 0,
    wurf_e: 0,
    wurf_ziel: null,
    wurf_richtung: '',
    rutsch_v: 0,
    aufnehmen_ziel: null,
  };
}

/** Freier Gegnerslot sn. */
export function gegnerLeer(nr: number): Gegner {
  return {
    ...basisLeer(`s${nr}`, nr),
    typ: '',
    aktion: 'STAND',
    modus: 'FREI',
    modus_uhr: 0,
    rolle: 'leicht',
    logik: true,
    erlaubnis: true,
    vorplatziert: false,
    werte: 'rang',
    lp_offen: false,
    auftritt: '',
    welle: 0,
    rang_beim_erscheinen: 0,
    gehalten_von: null,
    liegedauer: 0,
    reaktion_h: 0,
    zufall: { zustand: 1, ziehungen: 0 },
    seite: 1,
    recht: '',
    zielrecht: false,
    angriff_code: '',
    ziel_abstand: 0,
    ziel_x: 0,
    schaden: 0,
    angriff_a: 0,
    angriff_stopp: 0,
    angriff_abgebrochen: false,
    pause: 0,
    kampfhaltung_s: 0,
    gehstufe: 'normal',
    gehbefehl_rest: 0,
    haltabstand: 0,
    serie: false,
    gruppe_rest: 0,
    gruppe_umwerf: '',
    abwarten_rest: 0,
    verfolgung_rest: 0,
    nachlauf_rest: 0,
    weckreiz_w: 0,
    kampffaehig_ab: 0,
    ohne_punkte: false,
    zielpunkt_x: 0,
    zielpunkt_z: 0,
    lp_folge: 0,
    folge: 0,
    folge_h: 0,
    naechster_angriff: 0,
    schwung: 0,
    angriffe_an: true,
    bewegung_an: true,
    tod_t: 0,
    frei_frame: 0,
    getroffen_frame: 0,
  };
}

/** Freier Objektslot on (nr 20 bis 59) bzw. Geschossslot gn (nr 0 bis 4). */
export function objektLeer(schluessel: `o${number}` | `g${number}`, nr: number): Objekt {
  return {
    ...basisLeer(schluessel, nr),
    typ: '',
    aktion: '',
    art: '',
    id: '',
    munition: 0,
    liegezeit: 0,
    landung_l: 0,
    aufnehmbar: false,
    sichtbar: true,
    inhalt: '',
    zerbrochen: false,
    zerbrochen_h: 0,
    flugphase: '',
    flug_n: 0,
    lebensdauer: 0,
    einschlag_x: 0,
    einschlag_z: 0,
    besitzer: null,
    abschuss: 0,
  };
}

/** Neue, leere Slottabelle (Figur im Grundzustand). */
export function slotTabelleNeu(): SlotTabelle {
  const gegner: Gegner[] = [];
  for (let i = 0; i < GEGNER_SLOTS; i++) gegner.push(gegnerLeer(i));
  const objekte: Objekt[] = [];
  for (let i = 0; i < OBJEKT_SLOTS; i++) objekte.push(objektLeer(`o${OBJEKT_SLOT_ERSTER + i}`, OBJEKT_SLOT_ERSTER + i));
  const geschosse: Objekt[] = [];
  for (let i = 0; i < GESCHOSS_SLOTS; i++) geschosse.push(objektLeer(`g${i}`, i));
  return { figur: figurNeu(), gegner, objekte, geschosse };
}

// ===========================================================================
// Slots anlegen und freigeben (Kampf 3: kleinster freier Slot des Bereichs)
// ===========================================================================

/** Kleinster freier Gegnerslot ab `ab` (Standard s1, Welt 4.1), sonst null. */
export function freierGegner(t: SlotTabelle, ab: number = ERSTER_GEGNERSLOT): Gegner | null {
  for (let i = ab; i < t.gegner.length; i++) {
    const g = t.gegner[i] as Gegner;
    if (!g.belegt) return g;
  }
  return null;
}

/** Bosslot s0, wenn frei, sonst null (Welt 4.1). */
export function freierBossSlot(t: SlotTabelle): Gegner | null {
  const g = t.gegner[BOSS_SLOT] as Gegner;
  return g.belegt ? null : g;
}

/** Kleinster freier Objektslot o20 bis o59, sonst null (Welt 9.1). */
export function freiesObjekt(t: SlotTabelle): Objekt | null {
  for (const o of t.objekte) if (!o.belegt) return o;
  return null;
}

/** Kleinster freier Geschossslot g0 bis g4, sonst null (Kampf 10.3). */
export function freiesGeschoss(t: SlotTabelle): Objekt | null {
  for (const o of t.geschosse) if (!o.belegt) return o;
  return null;
}

/** Setzt einen Gegnerslot auf den leeren Zustand zurück und belegt ihn (Zustand 1). */
export function gegnerBelegen(g: Gegner, typ: GegnerTyp): Gegner {
  Object.assign(g, gegnerLeer(g.nr));
  g.belegt = true;
  g.typ = typ;
  g.zustand = ZUSTAND_NORMAL;
  return g;
}

/** Setzt einen Objekt- oder Geschossslot zurück und belegt ihn (Zustand 1). */
export function objektBelegen(o: Objekt, typ: ObjektTyp): Objekt {
  Object.assign(o, objektLeer(o.schluessel as `o${number}` | `g${number}`, o.nr));
  o.belegt = true;
  o.typ = typ;
  o.zustand = ZUSTAND_NORMAL;
  return o;
}

/** Gibt einen Gegner-, Objekt- oder Geschossslot frei (belegt false, Zustand 0). Die Figur bleibt immer belegt. */
export function freigeben(e: Gegner | Objekt): void {
  if (e.schluessel.startsWith('s')) Object.assign(e, gegnerLeer(e.nr));
  else Object.assign(e, objektLeer(e.schluessel as `o${number}` | `g${number}`, e.nr));
}

/** Entität zu einem Slot, oder null, wenn es den Slot nicht gibt. */
export function entitaet(t: SlotTabelle, key: SlotKey): Figur | Gegner | Objekt | null {
  if (key === 'f') return t.figur;
  const nr = Number(key.slice(1));
  if (!Number.isInteger(nr)) return null;
  switch (key[0]) {
    case 's':
      return t.gegner[nr] ?? null;
    case 'o':
      return t.objekte[nr - OBJEKT_SLOT_ERSTER] ?? null;
    case 'g':
      return t.geschosse[nr] ?? null;
    default:
      return null;
  }
}

/** Gegner zu einem Slot oder null. */
export function gegnerVon(t: SlotTabelle, key: SlotKey | null): Gegner | null {
  if (key === null || !key.startsWith('s')) return null;
  return t.gegner[Number(key.slice(1))] ?? null;
}

/** Name eines Beteiligten im Ereignis (Kampf 11.4): F, sn, on, gn. */
export function beteiligter(key: SlotKey): string {
  return key === 'f' ? 'F' : key;
}

/** Ist der Slot ein Gegnerslot? */
export function istGegnerSlot(key: SlotKey): key is `s${number}` {
  return key.startsWith('s');
}

// ===========================================================================
// Vorframe-Kopien (Kampf 3: x_vor, z_vor, h_vor, lp_vor)
// ===========================================================================

function vorframeEntitaet(e: EntitaetBasis): void {
  e.x_vor = ganz(e.x);
  e.z_vor = ganz(e.z);
  e.h_vor = ganz(e.h);
  e.lp_vor = e.lp;
}

/**
 * Kopiert für alle Entitäten die ganzzahlige Position und die LP als
 * Vorframe-Werte. welt.ts ruft das zu Beginn jedes Logikschritts (vor W1)
 * auf, also gelten danach die Werte vom Ende des Vorframes.
 */
export function vorframeKopieren(t: SlotTabelle): void {
  vorframeEntitaet(t.figur);
  for (const g of t.gegner) vorframeEntitaet(g);
  for (const o of t.objekte) vorframeEntitaet(o);
  for (const o of t.geschosse) vorframeEntitaet(o);
}

// ===========================================================================
// Abstände und Hilfsabfragen
// ===========================================================================

/** Abstände nach Kampf 2.3 an ganzzahligen Positionen: Ziel minus Angreifer, d_vorn = dx · Blick des Angreifers. */
export interface Abstand {
  dx: number;
  dz: number;
  d_vorn: number;
}

/** Abstände von a (Angreifer) zu z (Ziel) nach Kampf 2.3. */
export function abstand(a: EntitaetBasis, z: EntitaetBasis): Abstand {
  const dx = ganz(z.x) - ganz(a.x);
  const dz = ganz(z.z) - ganz(a.z);
  return { dx, dz, d_vorn: dx * a.blick };
}

/** Schaut e auf andere zu? (gleiches x zählt als zuschauen) */
export function schautZu(e: EntitaetBasis, andere: EntitaetBasis): boolean {
  const dx = ganz(andere.x) - ganz(e.x);
  return dx * e.blick >= 0;
}

/** Blick zur anderen Entität; bei gleichem x bleibt der bisherige. */
export function blickZu(e: EntitaetBasis, andere: EntitaetBasis): Blick {
  const dx = ganz(andere.x) - ganz(e.x);
  if (dx > 0) return 1;
  if (dx < 0) return -1;
  return e.blick;
}

/** Protokolltext der Blickrichtung (Kampf 11.3): R oder L. */
export function blickText(b: Blick): 'R' | 'L' {
  return b === 1 ? 'R' : 'L';
}

/**
 * Setzt den Modus eines Gegners (sn_modus) und beginnt sn_timer neu mit 1.
 * welt.ts zählt modus_uhr zu Beginn jedes Logikschritts um 1 hoch; so zeigt
 * sn_timer die Frames im aktuellen Zustand einschließlich des laufenden.
 * Stufe 2 ändert den Modus nur über diese Funktion (gleicher Modus: keine Änderung).
 */
export function modusSetzen(g: Gegner, m: GegnerModus): void {
  if (g.modus === m) return;
  g.modus = m;
  g.modus_uhr = 1;
}

/** Ist der Modus eine Reaktion nach Kampf 7? */
export function istReaktion(m: GegnerModus): m is Reaktion {
  return (REAKTIONEN as readonly string[]).includes(m);
}

/**
 * Lebend nach Welt 4.3: vom Weckreiz bzw. Anlegen an, bis die LP unter 0
 * fallen; wartende und sterbende Gegner zählen nicht.
 */
export function istLebend(g: Gegner): boolean {
  return g.belegt && g.modus !== 'WARTEN' && g.modus !== 'TOT' && g.lp >= 0;
}

/** Im aktiven Fenster nach Welt 4.1: −64 ≤ ⌊x⌋ − K ≤ 447. */
export function imFenster(g: EntitaetBasis, kameraX: number): boolean {
  const d = ganz(g.x) - kameraX;
  return d >= FENSTER_LINKS && d <= FENSTER_RECHTS;
}
