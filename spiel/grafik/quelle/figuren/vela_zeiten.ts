// Zeiten der Vela-Animationen aus Phase 2 (G1): Bilddauern in Frames ohne
// Trefferstopp und Bilder der aktiven Frames. Bildzahlen und Verteilung nach
// docs/design.md 8 (Animationstabelle der Heldin), Summen, aktive Frames und
// Bildwechsel nach der Logik (src/kern/werte.ts; docs/spezifikation-kampf.md
// 4.3, 5.2, 6.5, 8, 9, 10). Weichen beide ab, gilt die Logik (Auftrag 4, 1.4);
// jede Abweichung steht in docs/grafik.md 7 (G1-…). Die Darstellung nimmt die
// Dauer aus der Aktionsuhr (Auftrag 4, 2.3); das Bild zur Uhr u ist das erste,
// bei dem die Summe der Dauern u erreicht (bildBeiUhr in vela.ts).
//
// Diese Datei hängt nur von werte.ts ab (keine Figurteile), damit Tests und
// die Darstellung die Tabellen ohne die Puppe lesen können.

import {
  AUFNEHMEN_DAUER,
  FIGUR_AUFSTEHEN_DAUER,
  FIGUR_LIEGEN_AB,
  FIGUR_LIEGEN_ENDE,
  FIGUR_UMGEWORFEN_BODEN,
  F1_STILLSTAND,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  GETROFFEN_DAUER,
  HALTEFRIST,
  KNIESTOSS_GEHALTEN_AB,
  KNIESTOSS_TREFFER,
  LANDUNG_DAUER,
  NEUEINSTIEG_LANDUNG_DAUER,
  RAKETE_ABSCHUSS,
  SPEZIAL_DAUER,
  SPEZIAL_STUFE_DAUER,
  SPEZIAL_STUFE_VON,
  SPRINTANGRIFF,
  SPRINTANGRIFF_DAUER,
  SPRUNGANGRIFF,
  SPRUNGANGRIFF_HOCH_AKTION_BIS,
  SPRUNG_LETZTER_LUFTFRAME,
  SPRUNG_SCHEITEL_FRAME,
  SS_ERSTER_AKTIV,
  SS_ZWEITER_AKTIV_BIS,
  SS_ZWEITER_AKTIV_VON,
  WAFFE_DAUER,
  WURF_GEBUNDEN_BIS,
  WURF_LOSLASSEN,
  WURF_TREFFER,
} from '../../../src/kern/werte.ts';

/** Bildindex bei Aktionsuhr uhr (1 = erstes Bild); nach dem Ende hält das letzte Bild (wie bildBeiUhr in vela.ts). */
export function bildZurUhr(dauern: readonly number[], uhr: number): number {
  let summe = 0;
  for (let i = 0; i < dauern.length; i++) {
    summe += dauern[i] as number;
    if (uhr <= summe) return i;
  }
  return dauern.length - 1;
}

/** Summe der Dauern. */
export function summe(dauern: readonly number[]): number {
  return dauern.reduce((s, d) => s + d, 0);
}

/** Sprint: 6 Bilder zu 4 Frames, Schleife (docs/design.md 8). */
export const SPRINT_DAUERN = [4, 4, 4, 4, 4, 4] as const;

/**
 * Sprung (Auftrag 4, 3: 3 Steigen, Scheitel, 3 Fallen, 2 Landung): SPRUNG uhr
 * 1 bis 41 (J+1 bis J+41, werte.ts SPRUNG_LETZTER_LUFTFRAME) in 7 Bildern wie
 * design.md 8 (6/6/6/6, dann 17 Frames Fall, hier auf drei Bilder 6/6/5
 * verteilt); der Scheitel J+21 (SPRUNG_SCHEITEL_FRAME) liegt im Bild 3 (uhr
 * 19 bis 24). LANDUNG uhr 1 bis 6 (LANDUNG_DAUER) zeigt Bild 7 und 8 (5/1).
 */
export const SPRUNG_LUFT_DAUERN = [6, 6, 6, 6, 6, 6, 5] as const;
export const SPRUNG_LANDUNG_DAUERN = [5, 1] as const;
export const SPRUNG_DAUERN = [...SPRUNG_LUFT_DAUERN, ...SPRUNG_LANDUNG_DAUERN] as const;
/** Index des ersten Landebildes in sprung und des Scheitelbildes. */
export const SPRUNG_LANDUNG_BILD = SPRUNG_LUFT_DAUERN.length;
export const SPRUNG_SCHEITEL_BILD = bildZurUhr(SPRUNG_LUFT_DAUERN, SPRUNG_SCHEITEL_FRAME);
/** Fallpose des Sprungs (nach einem Sprungangriff bis zur Landung, docs/design.md 8): letztes Fallbild. */
export const SPRUNG_FALL_BILD = SPRUNG_LUFT_DAUERN.length - 1;

/** Sprungangriff neutral (SN): 2/2/24/2/1 (design.md 8), aktiv A+5 bis A+28 = uhr 5 bis 28 im Bild 2; danach Fallpose. */
export const SPRUNGANGRIFF_N_DAUERN = [2, 2, SPRUNGANGRIFF.N.aktiv_bis - SPRUNGANGRIFF.N.aktiv_von + 1, 2, 1] as const;
/** Sprungangriff Richtung (SR): 2/2/24/2/1/1 (design.md 8), aktiv uhr 5 bis 28 im Bild 2; Landung mit den Landebildern von sprung. */
export const SPRUNGANGRIFF_R_DAUERN = [2, 2, SPRUNGANGRIFF.R.aktiv_bis - SPRUNGANGRIFF.R.aktiv_von + 1, 2, 1, 1] as const;
/**
 * Sprungangriff hoch (SH): design.md 8 3/3/4/3/3/3/3/3/3/3/1 (32), die Logik
 * hält die Aktion nur bis uhr 29 (SPRUNGANGRIFF_HOCH_AKTION_BIS), danach
 * SPRUNG mit Fallpose: 3/3/4/3/3/3/3/3/2/1/1 (G1-2). Aktiv uhr 7 bis 10 im Bild 2.
 */
export const SPRUNGANGRIFF_H_DAUERN = [3, 3, SPRUNGANGRIFF.H.aktiv_bis - SPRUNGANGRIFF.H.aktiv_von + 1, 3, 3, 3, 3, 3, 2, 1, 1] as const;
/** Sprungangriff runter (ST): 4/4/24 (design.md 8), aktiv uhr 9 bis 32 im Bild 2, das bis zur Landung hält. */
export const SPRUNGANGRIFF_T_DAUERN = [4, 4, SPRUNGANGRIFF.T.aktiv_bis - SPRUNGANGRIFF.T.aktiv_von + 1] as const;

/** Griff: 1/2/2 (design.md 8), dann Haltebild bis zum Losreißen in g+61 (HALTEFRIST): Summe 61. */
export const GRIFF_DAUERN = [1, 2, 2, HALTEFRIST + 1 - 5] as const;
/** Index des Haltebildes in griff. */
export const GRIFF_HALTEN_BILD = 3;
/**
 * Kniestoß: design.md 8 2/2/9/2/1/1 (17); KNIESTOSS dauert in der Logik uhr 1
 * bis 22 (gehalten ab K+23, KNIESTOSS_GEHALTEN_AB): das letzte Bild hält 6
 * (G1-3). Treffer K+5 = uhr 5 (KNIESTOSS_TREFFER) im Bild 2.
 */
export const KNIESTOSS_DAUERN = [2, 2, 9, 2, 1, KNIESTOSS_GEHALTEN_AB - 1 - 16] as const;
/** Wurf: 9/7/5/10/5/1 (design.md 8) = uhr 1 bis 37 (WURF_GEBUNDEN_BIS); Treffer E+1 im Bild 0, Loslassen E+22 (WURF_LOSLASSEN) am Beginn von Bild 3. */
export const WURF_DAUERN = [9, 7, 5, 10, 5, 1] as const;
export const WURF_LOSLASS_BILD = bildZurUhr(WURF_DAUERN, WURF_LOSLASSEN);
/**
 * Spezialangriff: 14 Stufen 2/2/2/1/6/6/6/6/6/6/2/2/2/1 (design.md 8) = uhr 1
 * bis 50 (SPEZIAL_DAUER); die sechs Flächenstufen uhr 8, 14, … 38
 * (SPEZIAL_STUFE_VON) beginnen je ein Bild (4 bis 9). Bilder 7 bis 13 sind
 * die Bilder 6 bis 0 rückwärts.
 */
export const SPEZIAL_DAUERN = [2, 2, 2, 1, 6, 6, 6, 6, 6, 6, 2, 2, 2, 1] as const;
/** Bild je Stufe des Spezialangriffs: Index in die 7 gezeichneten Bilder. */
export const SPEZIAL_FOLGE = [0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0] as const;
/** Sprintangriff: 1/1/2/10/20/1 (design.md 8) = uhr 1 bis 35 (SPRINTANGRIFF_DAUER), aktiv uhr 5 bis 14 im Bild 3. */
export const SPRINTANGRIFF_DAUERN = [1, 1, 2, SPRINTANGRIFF.aktiv_bis - SPRINTANGRIFF.aktiv_von + 1, 20, 1] as const;
/**
 * Sprint-Sprungangriff (keine Zeile in design.md 8; G1-4): Bild nach ss_n
 * (Frames seit A ohne Stopp, Kampf 9.3): 4/8/7/20 bis ss_n 39
 * (SS_ZWEITER_AKTIV_BIS), Treffer in ss_n 13 (SS_ERSTER_AKTIV) im Bild 2,
 * zweites Fenster 20 bis 39 im Bild 3; Bild 4 ist die Landung (6 Frames,
 * LANDUNG_DAUER), solange die Instanz SS läuft.
 */
export const SPRINT_SPRUNGANGRIFF_DAUERN = [4, SS_ERSTER_AKTIV - 5, SS_ZWEITER_AKTIV_VON - SS_ERSTER_AKTIV, SS_ZWEITER_AKTIV_BIS - SS_ZWEITER_AKTIV_VON + 1, LANDUNG_DAUER] as const;
/** Getroffen vorn und hinten: 1/13/6/6/1 (design.md 8) = H bis H+26 (GETROFFEN_DAUER). */
export const GETROFFEN_DAUERN = [1, 13, 6, 6, 1] as const;
/**
 * Umgeworfen: design.md 8 1/8/6/31/9 (55); UMGEWORFEN dauert H bis H+53
 * (LIEGEN ab H+54, FIGUR_LIEGEN_AB): 1/8/6/31/8 (G1-5). Bild 1 über den
 * Stillstand H+1 bis H+8 (F1_STILLSTAND), Bild 2 ab dem ersten Bahnframe H+9,
 * Bild 4 ab dem Bodenkontakt H+46 (FIGUR_UMGEWORFEN_BODEN).
 */
export const UMGEWORFEN_DAUERN = [1, F1_STILLSTAND, 6, FIGUR_UMGEWORFEN_BODEN - F1_STILLSTAND - 7, FIGUR_LIEGEN_AB - FIGUR_UMGEWORFEN_BODEN] as const;
/**
 * Tod im Flug (Bahn F4, Kampf 6.5; keine Zeile in design.md 8, G1-13): die
 * Bilder von umgeworfen mit den Zeiten von F4: Stoß (uhr 1 = t), Stillstand
 * t+1 und t+2 (F4_STILLSTAND), Kippen ab t+3, Flug bis zum Bodenkontakt t+40
 * (F4_BODEN), Aufprall bis vor die Ruhe t+49 (F4_RUHE); ab der Ruhe das Bild tot.
 */
export const TOT_FLUG_DAUERN = [1, F4_STILLSTAND, 6, F4_BODEN - F4_STILLSTAND - 7, F4_RUHE - F4_BODEN] as const;
/** Liegen: 1 Bild, H+54 bis H+94 (FIGUR_LIEGEN_ENDE) = 41 Frames (design.md 8: 1 plus 40). */
export const LIEGEN_DAUERN = [FIGUR_LIEGEN_ENDE - FIGUR_LIEGEN_AB + 1] as const;
/** Aufstehen: 5/5/5/5/5/1 (design.md 8) = 26 (FIGUR_AUFSTEHEN_DAUER). */
export const AUFSTEHEN_DAUERN = [5, 5, 5, 5, 5, 1] as const;
/** Waffe (Raketenwerfer): 3 Bilder 6/4/7 = uhr 1 bis 17 (WAFFE_DAUER), Abschuss P+7 (RAKETE_ABSCHUSS) am Beginn von Bild 1 (G1-6). */
export const WAFFE_SCHUSS_DAUERN = [RAKETE_ABSCHUSS - 1, 4, WAFFE_DAUER - RAKETE_ABSCHUSS - 3] as const;
/** Aufnehmen: 3 Bilder 2/3/2 = uhr 1 bis 7 (AUFNEHMEN_DAUER; G1-6). */
export const AUFNEHMEN_DAUERN = [2, 3, 2] as const;
/** Neueinstieg: Fall 2 Bilder im Wechsel zu 4 Frames (N+1 bis LN−1), Landung 5/1 wie beim Sprung = LN bis LN+5 (NEUEINSTIEG_LANDUNG_DAUER; G1-6). */
export const NEUEINSTIEG_FALL_DAUERN = [4, 4] as const;
export const NEUEINSTIEG_LANDUNG_DAUERN = [5, 1] as const;

/** Prüfsummen gegen die Logik (für Tests und als Absicherung beim Laden). */
export const LOGIK_SUMMEN = {
  sprungLuft: SPRUNG_LETZTER_LUFTFRAME,
  sprungLandung: LANDUNG_DAUER,
  hoch: SPRUNGANGRIFF_HOCH_AKTION_BIS,
  griff: HALTEFRIST + 1,
  kniestoss: KNIESTOSS_GEHALTEN_AB - 1,
  wurf: WURF_GEBUNDEN_BIS,
  spezial: SPEZIAL_DAUER,
  sprintangriff: SPRINTANGRIFF_DAUER,
  getroffen: GETROFFEN_DAUER,
  umgeworfen: FIGUR_LIEGEN_AB,
  aufstehen: FIGUR_AUFSTEHEN_DAUER,
  waffe: WAFFE_DAUER,
  aufnehmen: AUFNEHMEN_DAUER,
  neueinstiegLandung: NEUEINSTIEG_LANDUNG_DAUER,
} as const;

/** Erste aktive Uhr je Angriff (werte.ts), für die Atlas-Felder aktiv. */
export const AKTIV_AB = {
  sprungangriff: SPRUNGANGRIFF.N.aktiv_von,
  richtung: SPRUNGANGRIFF.R.aktiv_von,
  hoch: SPRUNGANGRIFF.H.aktiv_von,
  runter: SPRUNGANGRIFF.T.aktiv_von,
  kniestoss: KNIESTOSS_TREFFER,
  wurf: WURF_TREFFER,
  sprintangriff: SPRINTANGRIFF.aktiv_von,
  waffe_schuss: RAKETE_ABSCHUSS,
} as const;

/** Bilder der sechs Flächenstufen des Spezialangriffs (je erste Uhr der Stufe). */
export const SPEZIAL_AKTIV_BILDER: readonly number[] = SPEZIAL_STUFE_VON.map((u) => bildZurUhr(SPEZIAL_DAUERN, u));
/** Dauer einer Flächenstufe (werte.ts), Gegenprobe zu SPEZIAL_DAUERN. */
export const SPEZIAL_STUFE = SPEZIAL_STUFE_DAUER;
/** Bilder des Sprint-Sprungangriffs in den aktiven Frames (ss_n 13 und 20). */
export const SS_AKTIV_BILDER: readonly number[] = [bildZurUhr(SPRINT_SPRUNGANGRIFF_DAUERN, SS_ERSTER_AKTIV), bildZurUhr(SPRINT_SPRUNGANGRIFF_DAUERN, SS_ZWEITER_AKTIV_VON)];
