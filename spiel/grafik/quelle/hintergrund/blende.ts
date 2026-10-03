// Blendenkante (Auftrag 4, 1.6: „Abdunkeln wie heute, zusätzlich eine Rasterkante (Bayer)
// am Rand des Dunkels“; G5). Die Blende des Schnitts (Welt 3, KA13) und des Stage-Endes
// (Welt 10.5) hat die Deckung d = anzeige(welt).blende von 0 (offen) bis BLENDE_ZU = 28
// (schwarz). Regel für die Darstellung (docs/grafik.md 4.8):
//   1. wie heute die ganze Szene mit BLENDE_DUNKEL und Deckkraft d / 28 abdunkeln;
//   2. zusätzlich schiebt sich von rechts ein voll dunkles Feld ab Bildschirm-x
//      F = 400 − ⌊400 · d / 28⌋ bis zum rechten Rand ins Bild (400 = Bildbreite + Kante);
//   3. links davon, auf x F − 16 bis F − 1, steht die Kante: die Kachel `kante` (16 × 16,
//      Bayer 4 × 4, Deckung von 0/16 links bis 15/16 rechts) 14-mal untereinander.
// Beim Öffnen (d fällt) zieht sich das Dunkel nach rechts zurück. Die Anzeigeleiste bleibt
// darüber sichtbar (L114).

import { Leinwand } from '../leinwand.ts';
import type { Pixel } from '../leinwand.ts';
import { deckend } from '../leinwand.ts';
import { mischen } from '../farbe.ts';
import { BLENDE_DUNKEL } from '../palette.ts';
import { pngSchreiben } from '../png.ts';
import { bayerSchwelle } from '../raster.ts';
import { BLENDE_ZU } from '../../../src/kern/werte.ts';
import { BILD_BREITE, BILD_HOEHE, KACHEL } from './lage.ts';

/** Breite der Rasterkante in px (eine Kachel; 16 Spalten = 16 Stufen des Bayer-Rasters). */
export const KANTE_BREITE = KACHEL;
/** Weg des dunklen Feldes: Bildbreite plus Kante, damit es bei d = 0 und d = 28 ganz draußen liegt. */
export const BLENDE_WEG = BILD_BREITE + KANTE_BREITE;

/** Die Kantenkachel: Spalte s ist dunkel, wo die Bayer-Schwelle unter s / 16 liegt (0 links, 15/16 rechts). */
export function blendenKante(): Leinwand {
  const k = new Leinwand(KANTE_BREITE, KACHEL);
  for (let y = 0; y < KACHEL; y++) {
    for (let s = 0; s < KANTE_BREITE; s++) if (bayerSchwelle(s, y) < s / KANTE_BREITE) k.setze(s, y, BLENDE_DUNKEL);
  }
  return k;
}

/** Linke Kante des voll dunklen Feldes bei Deckung d (0 … BLENDE_ZU). */
export function blendeFront(d: number): number {
  return BLENDE_WEG - Math.floor((BLENDE_WEG * d) / BLENDE_ZU);
}

/** Wendet die Blende mit Deckung d auf ein Szenenbild 384 × 224 an (für Kontaktbögen und Tests). */
export function blendeAnwenden(szene: Leinwand, d: number): void {
  if (d <= 0) return;
  const t = Math.min(1, d / BLENDE_ZU);
  for (let i = 0; i < szene.daten.length; i++) {
    const p = szene.daten[i] as Pixel;
    if (deckend(p)) szene.daten[i] = mischen(p, BLENDE_DUNKEL, t);
  }
  const f = blendeFront(d);
  const kante = blendenKante();
  szene.rechteck(f, 0, BILD_BREITE - f, BILD_HOEHE, BLENDE_DUNKEL);
  for (let y = 0; y < BILD_HOEHE; y += KACHEL) szene.einsetzen(kante, f - KANTE_BREITE, y);
}

/** Blatt hintergrund_blende.png (nur die Kante, 1 px Rand) und sein Atlas. */
export function blendeBlatt(): { png: Uint8Array; json: string; leinwand: Leinwand } {
  const l = new Leinwand(KANTE_BREITE + 2, KACHEL + 2);
  l.einsetzen(blendenKante(), 1, 1);
  const json =
    [
      '{',
      '  "blatt": "hintergrund_blende.png",',
      `  "kachel": ${KACHEL},`,
      `  "kante": { "x": 1, "y": 1, "b": ${KANTE_BREITE}, "h": ${KACHEL} },`,
      `  "weg": ${BLENDE_WEG},`,
      `  "zu": ${BLENDE_ZU},`,
      '  "regel": "Szene mit BLENDE_DUNKEL und Deckkraft d/zu abdunkeln; dunkles Feld ab x F = weg - floor(weg*d/zu) bis zum rechten Rand; Kante (dicht rechts) auf x F-16 bis F-1, 14-mal untereinander"',
      '}',
    ].join('\n') + '\n';
  return { png: pngSchreiben(l), json, leinwand: l };
}
