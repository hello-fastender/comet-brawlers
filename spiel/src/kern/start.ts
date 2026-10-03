// Prüfstart und Spielstart als Daten (docs/spezifikation-welt.md, 11.3;
// docs/spezifikation-kampf.md, 11.2).
//
// Der Kern definiert den Anfangszustand als Datentyp; src/pruef/szene.ts
// liest ihn aus einer Prüfszene, die Darstellung nimmt standardStart(seed).
// Ein Spielstart ist ein Prüfstart ohne Abweichungen auf der Bühne scheibe.

import type { Blick, GegenstandArt, GegnerTyp, ObjektTyp, Rolle, BehaelterArt } from './entitaeten.ts';
import type { KameraModus } from './welt.ts';
import { ERSTER_FRAME } from './werte.ts';

/** Abweichungen der Figur vom Start der Stage (Kampf 11.2: x, z, blick, lp, waffe, munition). */
export interface FigurStart {
  x?: number;
  z?: number;
  blick?: Blick;
  lp?: number;
  waffe?: '' | 'RW';
  munition?: number;
}

/** Gegner einer Prüfszene (Kampf 11.2: typ, x, z, blick, lp, lp_max, vorplatziert, logik). */
export interface GegnerStart {
  /** Gegnerslot 0 bis 19 */
  slot: number;
  typ: GegnerTyp;
  rolle: Rolle;
  x: number;
  z: number;
  /** null: zur Figur (bei gleichem x rechts) */
  blick: Blick | null;
  /** null: nach Rolle und vorplatziert (Welt 4.5, 8) */
  lp: number | null;
  lp_max: number | null;
  vorplatziert: boolean;
  logik: boolean;
  erlaubnis: boolean;
  /** Frame, in dessen W1 der Gegner erscheint (Eingriff); ERSTER_FRAME oder kleiner = von Beginn an */
  erscheint: number;
}

/** Objekt einer Prüfszene (Kampf 11.2: typ, art, x, z, munition). */
export interface ObjektStart {
  /** Objektslot 20 bis 59 */
  slot: number;
  typ: ObjektTyp;
  art: GegenstandArt | BehaelterArt | '';
  x: number;
  z: number;
  munition: number;
  inhalt: GegenstandArt | 'leer' | '';
  /** Behälterkennung (für Behälter) */
  id: string;
}

/** Eingriff `frame, ziel, feld, wert` (Kampf 11.2; Welt 11.3), wirkt in W1 von frame. */
export interface EingriffDaten {
  frame: number;
  /** f, sn, on, gn, rang, kamera oder welle.n */
  ziel: string;
  feld: string;
  wert: string;
}

/** Prüfangriff `pruefangriff, slot, von, bis, schaden, umwerfen` (Kampf 11.2); Ausführung in treffer.ts. */
export interface PruefangriffDaten {
  slot: number;
  von: number;
  bis: number;
  schaden: number;
  umwerfen: boolean;
}

/** Zusätzlicher Behälter `behaelter.id=art,x,z,inhalt` (Welt 11.3). */
export interface BehaelterZusatz {
  id: string;
  art: BehaelterArt;
  x: number;
  z: number;
  inhalt: GegenstandArt | 'leer';
}

/** Anfangszustand eines Laufs (Welt 11.3, Kampf 11.2). */
export interface Pruefstart {
  name: string;
  /** letzter Frame des Prüflaufs; 0 = offen (Spiel) */
  endframe: number;
  seed: number;
  /** Stage-Kennung: pruefbuehne oder scheibe */
  buehne: string;
  /** Startrang, null = Standard (9) */
  rang: number | null;
  /** Rang-Uhr steht (Welt 11.3) */
  rang_fest: boolean;
  kamera_x: number | null;
  kamera_modus: KameraModus | null;
  /** Wellen ohne vorplatzierte und neue Gegner (welle.n=aus) */
  wellen_aus: number[];
  /** welle.7=nur_boss: Welle 7 ohne die Bolzer, Boss wach und kampffähig, Bosskisten zerbrochen */
  welle7_nur_boss: boolean;
  sperren_aus: string[];
  halte_aus: string[];
  behaelter_aus: string[];
  behaelter_zusatz: BehaelterZusatz[];
  /** Gegnerslots, die kein Recht anfordern (gegner.sn.erlaubnis=aus) */
  erlaubnis_aus: number[];
  boss_angriffe: boolean;
  boss_bewegung: boolean;
  boss_lp: number | null;
  /** fest.<entscheidung>=wert: ersetzt das Ergebnis einer Ziehung; die Ziehung findet trotzdem statt */
  fest: Record<string, string>;
  figur: FigurStart;
  gegner: GegnerStart[];
  objekte: ObjektStart[];
  eingriffe: EingriffDaten[];
  pruefangriffe: PruefangriffDaten[];
}

/** Spielstart ohne Abweichungen (Bühne scheibe, Rang 9, Rang-Uhr läuft). */
export function standardStart(seed: number, buehne: string = 'scheibe'): Pruefstart {
  return {
    name: 'spiel',
    endframe: 0,
    seed,
    buehne,
    rang: null,
    rang_fest: false,
    kamera_x: null,
    kamera_modus: null,
    wellen_aus: [],
    welle7_nur_boss: false,
    sperren_aus: [],
    halte_aus: [],
    behaelter_aus: [],
    behaelter_zusatz: [],
    erlaubnis_aus: [],
    boss_angriffe: true,
    boss_bewegung: true,
    boss_lp: null,
    fest: {},
    figur: {},
    gegner: [],
    objekte: [],
    eingriffe: [],
    pruefangriffe: [],
  };
}

/** Erscheint der Gegner von Beginn an (nicht erst über einen Eingriff)? */
export function vonBeginn(g: GegnerStart): boolean {
  return g.erscheint <= ERSTER_FRAME;
}
