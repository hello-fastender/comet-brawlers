// Platzhalter (Stufe 1, K0) für K3: Kamera nach docs/spezifikation-welt.md,
// Abschnitt 3 (KA1 bis KA13: Folgen, Sperre, Halt, Pfeil, Arena mit Totzone,
// Bildschütteln, Ende, Schnitt mit Blende).

import type { Welt } from './welt.ts';

/**
 * W6: neue Kamera-x und Kamera-y (kameraY aus stage.ts), Modus, Pfeil,
 * Schütteln, Blende (welt.kamera.blende_c, Versetzen der Figur in c+29),
 * Ereignisse SR, HR, BL. Sperren und Halte lesen den Stand vom Ende des
 * Vorframes (welt.vorframe). Bei welt.kamera.fest (Prüfbühne) bleibt alles.
 */
export function kameraSchritt(welt: Welt): void {}
