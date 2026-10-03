// Licht und Form (Auftrag 4, 1.3; docs/grafik.md 1.3): Lichtvektor von
// links oben vorn wie LICHT in stilproben.html, Helligkeit aus einer
// Flächennormale, Ton der Treppe aus der Helligkeit in harten Stufen
// (ohne Raster), Normalen für Zylinder, Kugel und Kissen.

import type { TonIndex } from './palette.ts';

/** Rohvektor des Lichts (x nach rechts, y nach unten, z zum Betrachter; stilproben.html LICHT). */
const LICHT_ROH: readonly [number, number, number] = [-0.55, -0.66, 0.5];

/** Lichtvektor, normiert. */
export const LICHT: readonly [number, number, number] = (() => {
  const n = Math.hypot(LICHT_ROH[0], LICHT_ROH[1], LICHT_ROH[2]);
  return [LICHT_ROH[0] / n, LICHT_ROH[1] / n, LICHT_ROH[2] / n];
})();

/** Schwellen der Helligkeit für die Töne: über glanz → 4, über licht → 3, über grund → 2, sonst 1 (0 bleibt der Innenkontur). */
export interface Schwellen {
  readonly glanz: number;
  readonly licht: number;
  readonly grund: number;
}

/** Schwellen der Stilprobe (stilproben.html, figurPixel: 0,8 / 0,52 / 0,12). */
export const SCHWELLEN_STILPROBE: Schwellen = { glanz: 0.8, licht: 0.52, grund: 0.12 };

/**
 * Schwellen für Figuren ohne Raster (Festlegung G0): ein Zylinder mit 7 px
 * Durchmesser bekommt 2 px Licht, 3 px Grund, 2 px Schatten (Auftrag 4, 1.3:
 * Licht und Schatten je 1 bis 2 px). Die Stilprobe glättet ihre Stufen mit
 * Raster, das auf Figuren nicht erlaubt ist; daher höhere Lichtschwelle.
 */
export const SCHWELLEN_FIGUR: Schwellen = { glanz: 0.86, licht: 0.68, grund: 0.2 };

/** Helligkeit n · LICHT; nz ohne Angabe aus der Einheitslänge (Halbkugel zum Betrachter). */
export function helligkeit(nx: number, ny: number, nz?: number): number {
  const z = nz ?? Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return nx * LICHT[0] + ny * LICHT[1] + z * LICHT[2];
}

/** Ton aus der Helligkeit; ohne Glanz höchstens Licht (3); nie 0 (Ton 0 nur für Innenkonturen). */
export function tonAusHelligkeit(h: number, glanz: boolean, schwellen: Schwellen = SCHWELLEN_FIGUR): TonIndex {
  if (h > schwellen.glanz) return glanz ? 4 : 3;
  if (h > schwellen.licht) return 3;
  if (h > schwellen.grund) return 2;
  return 1;
}

/** Normale eines Zylinders mit Radius r im Abstand d (mit Richtung ux, uy quer zur Achse). */
export function zylinderNormale(dx: number, dy: number, r: number): [number, number] {
  if (r <= 0) return [0, 0];
  const nx = dx / r;
  const ny = dy / r;
  const l = Math.hypot(nx, ny);
  return l > 1 ? [nx / l, ny / l] : [nx, ny];
}

/** Normale eines Kissens: zur nächsten Kante geneigt (Richtung nach außen ox, oy), je näher, desto stärker; innen flach. */
export function kissenNormale(abstand: number, ox: number, oy: number, breite: number, staerke: number): [number, number] {
  const f = Math.max(0, 1 - abstand / breite) * staerke;
  return [ox * f, oy * f];
}
