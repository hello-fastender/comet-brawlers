// Medianschnitt (Auftrag 5, Abschnitt 1 und Phase 1, U2): Palette einer Figur
// aus den Farben ihrer Bilder, ohne Raster (kein Dithering), ohne Abbildung
// auf palette.ts. Helligkeit und Sättigung bleiben, weil jede Palettenfarbe
// das pixelgewichtete Mittel ihrer Kiste ist (keine Abdunklung).
//
// Ablauf: Die Hintergrundfarbe und ihr Rauschen werden vorher entfernt
// (Pixel, die das Schließen in die Figur nimmt, tragen sie). Alle übrigen
// Farben mit Pixelzahl bilden eine Kiste. Geteilt wird immer die
// Kiste mit dem größten gewichteten Fehler entlang ihrer stärksten Achse
// (Summe Pixelzahl × Abstand² zum Mittel, Achsen gewichtet wie farbAbstand
// im Mittel: Rot 2, Grün 4, Blau 3), am gewichteten Median dieser Achse, bis
// die Höchstzahl erreicht ist oder keine Kiste mehr teilbar ist. Danach
// wenige Runden Nachschärfen (jede Farbe zur nächsten Palettenfarbe, Mittel
// neu), dann die Abbildung jeder Farbe auf die nächste Palettenfarbe
// (farbAbstand). Deterministisch: feste Reihenfolgen, Gleichstand nach Index.

import { farbAbstand, rgbZuPixel } from './farbe.ts';
import type { Pixel } from './leinwand.ts';
import { deckend, kanaele } from './leinwand.ts';
import type { Leinwand } from './leinwand.ts';

/** Gewichte der Kanäle beim Teilen (Mittel der redmean-Gewichte von farbAbstand: 2 + r/256, 4, 3 − r/256). */
const GEWICHT: readonly [number, number, number] = [2, 4, 3];

/** Helligkeit (Luma nach Rec. 601, 0 bis 255) eines Pixels. */
export function helligkeit(p: Pixel): number {
  const c = kanaele(p);
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}

/** Pixelzahl je deckender Farbe über alle Bilder (durchsichtig zählt nicht). */
export function farbHaeufigkeit(bilder: readonly Leinwand[]): Map<Pixel, number> {
  const zahl = new Map<Pixel, number>();
  for (const b of bilder) {
    for (const px of b.daten) if (deckend(px as Pixel)) zahl.set(px as Pixel, (zahl.get(px as Pixel) ?? 0) + 1);
  }
  return zahl;
}

/** Eine Kiste: Indizes in die Farbliste und ihre Kennzahlen. */
interface Kiste {
  readonly glieder: number[];
  readonly mittel: [number, number, number];
  readonly gewicht: number;
  /** Gewichteter Fehler je Achse (Summe n · (c − μ)² · Kanalgewicht). */
  readonly fehler: [number, number, number];
}

function kiste(glieder: number[], kan: readonly (readonly [number, number, number])[], n: readonly number[]): Kiste {
  let w = 0;
  const s: [number, number, number] = [0, 0, 0];
  for (const i of glieder) {
    const c = kan[i] as readonly [number, number, number];
    const z = n[i] as number;
    w += z;
    for (let a = 0; a < 3; a++) s[a] += z * (c[a] as number);
  }
  const mittel: [number, number, number] = [s[0] / w, s[1] / w, s[2] / w];
  const fehler: [number, number, number] = [0, 0, 0];
  for (const i of glieder) {
    const c = kan[i] as readonly [number, number, number];
    const z = n[i] as number;
    for (let a = 0; a < 3; a++) {
      const d = (c[a] as number) - mittel[a];
      fehler[a] += z * d * d * (GEWICHT[a] as number);
    }
  }
  return { glieder, mittel, gewicht: w, fehler };
}

function staerksteAchse(k: Kiste): number {
  let beste = 0;
  for (let a = 1; a < 3; a++) if ((k.fehler[a] as number) > (k.fehler[beste] as number)) beste = a;
  return beste;
}

/** Teilt eine Kiste am gewichteten Median ihrer stärksten Achse; null, wenn sie nur eine Farbe hat. */
function teile(k: Kiste, kan: readonly (readonly [number, number, number])[], n: readonly number[], farben: readonly Pixel[]): [Kiste, Kiste] | null {
  if (k.glieder.length < 2) return null;
  const a = staerksteAchse(k);
  const sortiert = k.glieder.slice().sort((i, j) => ((kan[i] as readonly number[])[a] as number) - ((kan[j] as readonly number[])[a] as number) || (farben[i] as number) - (farben[j] as number));
  let summe = 0;
  let schnitt = 1;
  for (let i = 0; i < sortiert.length - 1; i++) {
    summe += n[sortiert[i] as number] as number;
    schnitt = i + 1;
    if (2 * summe >= k.gewicht) break;
  }
  return [kiste(sortiert.slice(0, schnitt), kan, n), kiste(sortiert.slice(schnitt), kan, n)];
}

function alsPixel(m: readonly [number, number, number]): Pixel {
  return rgbZuPixel([Math.round(m[0]), Math.round(m[1]), Math.round(m[2])]);
}

/** Index der nächsten Palettenfarbe (farbAbstand; Gleichstand: kleinerer Index). */
export function naechsteIndex(p: Pixel, palette: readonly Pixel[]): number {
  let beste = 0;
  let besterAbstand = Number.POSITIVE_INFINITY;
  palette.forEach((q, i) => {
    const d = farbAbstand(p, q);
    if (d < besterAbstand) {
      besterAbstand = d;
      beste = i;
    }
  });
  return beste;
}

export interface Schnittergebnis {
  /** Palette, nach Helligkeit aufsteigend (Gleichstand nach Wert). */
  readonly palette: Pixel[];
  /** Quellfarbe → Index in palette. */
  readonly abbildung: Map<Pixel, number>;
  /** Pixelgewichteter mittlerer und größter Abstand Quelle → Palette (farbAbstand). */
  readonly mittlererAbstand: number;
  readonly groessterAbstand: number;
  /** Zahl der Quellfarben. */
  readonly quellfarben: number;
  /** Quellfarben, die nicht am Schnitt teilnahmen (Hintergrundfarbe und ihr Rauschen). */
  readonly ohneSchnitt: number;
}

/**
 * Medianschnitt über die Farbhäufigkeit (höchstens `hoechst` Farben),
 * danach `runden` Runden Nachschärfen. Farben, für die `ohne` gilt (die
 * Hintergrundfarbe und ihr Rauschen), nehmen am Schnitt nicht teil und gehen
 * danach wie alle anderen auf die nächste Palettenfarbe. Gibt Palette und
 * Abbildung zurück.
 */
export function medianschnitt(
  zahl: ReadonlyMap<Pixel, number>, hoechst: number, runden: number = 2, ohne: (p: Pixel) => boolean = () => false,
): Schnittergebnis {
  const alleFarben = [...zahl.keys()].sort((a, b) => a - b);
  const geschnitten = alleFarben.filter((f) => !ohne(f));
  const farben = geschnitten.length > 0 ? geschnitten : alleFarben;
  if (farben.length === 0) return { palette: [], abbildung: new Map(), mittlererAbstand: 0, groessterAbstand: 0, quellfarben: 0, ohneSchnitt: 0 };
  const kan = farben.map((f) => {
    const c = kanaele(f);
    return [c[0], c[1], c[2]] as const;
  });
  const n = farben.map((f) => zahl.get(f) as number);
  let kisten: Kiste[] = [kiste(farben.map((_, i) => i), kan, n)];
  while (kisten.length < hoechst) {
    let wahl = -1;
    let groesster = -1;
    kisten.forEach((k, i) => {
      if (k.glieder.length < 2) return;
      const f = k.fehler[staerksteAchse(k)] as number;
      if (f > groesster) {
        groesster = f;
        wahl = i;
      }
    });
    if (wahl < 0) break;
    const geteilt = teile(kisten[wahl] as Kiste, kan, n, farben);
    if (geteilt === null) break;
    kisten = [...kisten.slice(0, wahl), geteilt[0], geteilt[1], ...kisten.slice(wahl + 1)];
  }
  let palette = kisten.map((k) => alsPixel(k.mittel));
  // Nachschärfen: Farben der nächsten Palettenfarbe zuordnen, Mittel neu (leere Gruppen behalten ihre Farbe).
  for (let r = 0; r < runden; r++) {
    const summen = palette.map(() => [0, 0, 0, 0]);
    farben.forEach((f, i) => {
      const s = summen[naechsteIndex(f, palette)] as number[];
      const c = kan[i] as readonly [number, number, number];
      const z = n[i] as number;
      s[0] = (s[0] as number) + z * c[0];
      s[1] = (s[1] as number) + z * c[1];
      s[2] = (s[2] as number) + z * c[2];
      s[3] = (s[3] as number) + z;
    });
    palette = palette.map((p, i) => {
      const s = summen[i] as number[];
      const w = s[3] as number;
      return w > 0 ? alsPixel([(s[0] as number) / w, (s[1] as number) / w, (s[2] as number) / w]) : p;
    });
  }
  // Doppelte entfernen, nach Helligkeit ordnen.
  palette = [...new Set(palette)].sort((a, b) => helligkeit(a) - helligkeit(b) || a - b);
  const abbildung = new Map<Pixel, number>();
  let summe = 0;
  let pixel = 0;
  let groesster = 0;
  for (const f of alleFarben) {
    const z = zahl.get(f) as number;
    const j = naechsteIndex(f, palette);
    abbildung.set(f, j);
    const d = farbAbstand(f, palette[j] as Pixel);
    summe += d * z;
    pixel += z;
    groesster = Math.max(groesster, d);
  }
  return {
    palette, abbildung, mittlererAbstand: pixel > 0 ? summe / pixel : 0, groessterAbstand: groesster,
    quellfarben: alleFarben.length, ohneSchnitt: alleFarben.length - farben.length,
  };
}
