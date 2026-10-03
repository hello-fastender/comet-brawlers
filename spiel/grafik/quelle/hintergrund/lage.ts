// Lagen der Hintergründe aus den Stage-Daten (Auftrag 4, 1.6 und Phase 2, G5):
// Abschnittsgrenzen, Bandober- und -unterkante je Welt-x, Kamera-y, Lagen der
// Hintergrund- und Vordergrundbilder. Alles wird aus spiel/daten/stages/scheibe.txt
// über den Kern gelesen (parseStage, bandGrenzen, kameraY), damit die Figuren auf
// dem gezeichneten Boden stehen.
//
// Koordinaten (docs/grafik.md 4.8):
//   Welt-y = 234 − z − h   (BILDSCHIRM_Y_BASIS; am Boden h = 0)
//   Bildschirm-x = Welt-x − ⌊K · parallax⌋,  Bildschirm-y = Welt-y + Ky
// Das ist dieselbe Abbildung wie bildX/bildY in src/darstellung/zeichnen.ts
// (Kampf 2.5: Bildschirm-y = 234 − (⌊z⌋ − Ky) − ⌊h⌋). Gezeichnet wird je
// Abschnitt in „Abschnittszeilen“: Zeile = Bildschirm-y beim Ky des Abschnitts
// (Ky ist in jedem Abschnitt der Scheibe fest, die Prüfung steht unten).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { BildSatz, Stage } from '../../../src/kern/stage.ts';
import { bandGrenzen, kameraY, parseStage } from '../../../src/kern/stage.ts';
import { ANZEIGE, BILD_BREITE, BILD_HOEHE, BILDSCHIRM_Y_BASIS } from '../../../src/kern/werte.ts';

/** Kantenlänge der Kacheln (Auftrag 4, 1.6). */
export const KACHEL = 16;
/** Der Himmel läuft mit halber Kamerageschwindigkeit (Auftrag 4, 1.6; nur Darstellung). */
export const PARALLAX_HIMMEL = 0.5;
/** Feste Deckkraft des Vordergrunds vor den Figuren (Auftrag 4, 1.6). */
export const DECKKRAFT_VORDERGRUND = 0.85;
/** Plattenfugen alle 16 px in der Tiefe (Auftrag 4, 1.6; wie TIEFENLINIE_ABSTAND in masse.ts). */
export const FUGE_TIEFE = 16;

/**
 * Zeilen der Anzeigeleiste oben (Welt 10.1: unterste Zeile der Balken 23). Hier bleibt der
 * Hintergrund ruhig und dunkel, damit Schrift und Balken lesbar bleiben (Gestaltung G5).
 */
export const ANZEIGE_ZEILEN = ANZEIGE.lp_balken.zeile1 + 1;

/** Bildgröße 384 × 224 (werte.ts). */
export { BILD_BREITE, BILD_HOEHE };

/** Pfad der Stage-Datei der Scheibe. */
export const STAGE_DATEI = fileURLToPath(new URL('../../../daten/stages/scheibe.txt', import.meta.url));

let stageZwischen: Stage | null = null;

/** Die Stage der Scheibe (einmal gelesen). */
export function scheibe(): Stage {
  if (stageZwischen === null) stageZwischen = parseStage(readFileSync(STAGE_DATEI, 'utf8'));
  return stageZwischen;
}

/** Welt-y eines Bodenpunkts in Tiefe z (und Höhe h): 234 − z − h. */
export function weltY(z: number, h: number = 0): number {
  return BILDSCHIRM_Y_BASIS - z - h;
}

/** Tiefe z zu einer Welt-y am Boden. */
export function tiefeAusWeltY(y: number): number {
  return BILDSCHIRM_Y_BASIS - y;
}

export type AbschnittId = 'A' | 'B' | 'F';

/** Ein Abschnitt der Scheibe mit allem, was die Zeichnung über die Lage wissen muss. */
export interface Abschnitt {
  readonly id: AbschnittId;
  /** Name nach Auftrag 4, 4 (Szenentabelle). */
  readonly name: string;
  /** Welt-x des Bandes: x0 ≤ x < x1. */
  readonly x0: number;
  readonly x1: number;
  /** Breite x1 − x0 in px. */
  readonly breite: number;
  /** Kamera-y, solange der Abschnitt im Bild ist (fest; geprüft). */
  readonly ky: number;
  /** Abschnittszeile der Bandoberkante je Spalte (erste Bodenzeile, z = oben(x)). */
  readonly kante: readonly number[];
  /** Abschnittszeile der Bandunterkante je Spalte (z = unten(x); 224 = unterer Bildrand). */
  readonly unten: readonly number[];
  /** Kleinste und größte Kantenzeile (bei geraden Bändern gleich). */
  readonly kanteMin: number;
  readonly kanteMax: number;
  /** Tiefe z der Bandober- und -unterkante am linken Rand. */
  readonly zOben: number;
  readonly zUnten: number;
  /** Kamera-x, bei denen der Abschnitt im Bild ist (von, bis). */
  readonly kamera: readonly [number, number];
}

/** Abschnitte der Scheibe in der Reihenfolge der Bänder (Auftrag 4, 4: A Landedeck, B Händlergasse, F Asservatenkammer). */
const NAMEN: readonly [AbschnittId, string][] = [
  ['A', 'Landedeck'],
  ['B', 'Händlergasse'],
  ['F', 'Asservatenkammer'],
];

/**
 * Kamera-x-Bereiche der Scheibe (Welt 3): vor dem Schnitt 0 bis kamera_x des Schnitts,
 * danach ziel_kamera_x bis kamera_x_max (KA13, KA3).
 */
export function kameraBereiche(stage: Stage = scheibe()): [number, number][] {
  const schnitt = stage.schnitte[0];
  if (schnitt === undefined) return [[0, stage.kamera_x_max]];
  return [
    [0, schnitt.kamera_x],
    [schnitt.ziel_kamera_x, stage.kamera_x_max],
  ];
}

const abschnittZwischen = new Map<AbschnittId, Abschnitt>();

/** Der Abschnitt mit Lage aus den Stage-Daten; wirft, wenn Ky im Abschnitt nicht fest ist. */
export function abschnitt(id: AbschnittId, stage: Stage = scheibe()): Abschnitt {
  const vorhanden = stage === scheibe() ? abschnittZwischen.get(id) : undefined;
  if (vorhanden !== undefined) return vorhanden;
  const i = NAMEN.findIndex((n) => n[0] === id);
  const band = stage.baender[i];
  const name = NAMEN[i];
  if (band === undefined || name === undefined) throw new Error(`Hintergrund: kein Band für Abschnitt ${id}`);
  // Kamera-x, bei denen der Abschnitt im Bild ist: [K, K + 384) schneidet [x0, x1).
  let von = Infinity;
  let bis = -Infinity;
  const kys = new Set<number>();
  for (const [k0, k1] of kameraBereiche(stage)) {
    for (let k = k0; k <= k1; k++) {
      if (k + BILD_BREITE <= band.x0 || k >= band.x1) continue;
      von = Math.min(von, k);
      bis = Math.max(bis, k);
      kys.add(kameraY(stage, k));
    }
  }
  if (kys.size !== 1) throw new Error(`Hintergrund ${id}: Kamera-y nicht fest (${[...kys].join(', ')})`);
  const ky = [...kys][0] as number;
  const kante: number[] = [];
  const unten: number[] = [];
  for (let x = band.x0; x < band.x1; x++) {
    const g = bandGrenzen(stage, x);
    if (g === null) throw new Error(`Hintergrund ${id}: kein Band bei x ${x}`);
    kante.push(weltY(g.oben) + ky);
    unten.push(weltY(g.unten) + ky);
  }
  const a: Abschnitt = {
    id,
    name: name[1],
    x0: band.x0,
    x1: band.x1,
    breite: band.x1 - band.x0,
    ky,
    kante,
    unten,
    kanteMin: Math.min(...kante),
    kanteMax: Math.max(...kante),
    zOben: band.oben0,
    zUnten: band.unten0,
    kamera: [von, bis],
  };
  if (stage === scheibe()) abschnittZwischen.set(id, a);
  return a;
}

/** Alle drei Abschnitte. */
export function abschnitte(): Abschnitt[] {
  return NAMEN.map((n) => abschnitt(n[0]));
}

/** Hintergrundsatz (Welt 2.1) mit Bildnamen, oder Fehler. */
export function hintergrundSatz(bild: string, stage: Stage = scheibe()): BildSatz {
  const s = stage.hintergrund.find((h) => h.bild === bild);
  if (s === undefined) throw new Error(`Hintergrund: Satz hintergrund bild=${bild} fehlt in scheibe.txt`);
  return s;
}

/** Vordergrundsatz (Welt 2.1) mit id, oder Fehler. */
export function vordergrundSatz(id: string, stage: Stage = scheibe()): BildSatz {
  const s = stage.vordergrund.find((h) => h.id === id);
  if (s === undefined) throw new Error(`Hintergrund: Satz vordergrund id=${id} fehlt in scheibe.txt`);
  return s;
}

/**
 * Abschnittszeilen der Plattenfugen in der Tiefe, aufsteigend (oben zuerst): Zeilen zu
 * z = n · 16 strikt innerhalb des Bandes (wie die Tiefenlinien der Platzhalter in zeichnen.ts).
 */
export function fugenZeilen(a: Abschnitt): number[] {
  const aus: number[] = [];
  for (let z = Math.ceil(a.zUnten / FUGE_TIEFE) * FUGE_TIEFE; z < a.zOben; z += FUGE_TIEFE) {
    if (z <= a.zUnten) continue;
    aus.push(weltY(z) + a.ky);
  }
  return aus.sort((p, q) => p - q);
}

/** Tiefen z der Plattenfugen (zu fugenZeilen), aufsteigend. */
export function fugenTiefen(a: Abschnitt): number[] {
  return fugenZeilen(a)
    .map((zeile) => tiefeAusWeltY(zeile - a.ky))
    .sort((p, q) => p - q);
}
