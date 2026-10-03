// Erzeugnisse außer Figuren (Objekte, Effekte, Hintergründe, Anzeige; Auftrag 4, Phase 2):
// je Erzeugnis die Dateien für spiel/grafik/ausgabe/ und docs/bilder/ und die Befunde der
// Stilprüfung. Die Module von G4 bis G6 liefern sie, bauen.ts prüft und schreibt sie.

import type { Befund } from './bauen.ts';

/** Ein Erzeugnis des Baus (ein Blatt mit Atlas und Kontaktbögen oder Ähnliches). */
export interface Erzeugnis {
  /** Name, z. B. objekte, hintergrund_a, anzeige. */
  readonly name: string;
  /** Dateien unter spiel/grafik/ausgabe/: Dateiname → PNG-Bytes oder JSON-Text. */
  readonly ausgabe: ReadonlyMap<string, Uint8Array | string>;
  /** Dateien unter docs/bilder/ (Kontaktbögen): Dateiname → PNG-Bytes. */
  readonly bilder: ReadonlyMap<string, Uint8Array>;
  /** Befunde der Stilprüfung; ist die Liste nicht leer, bricht der Bau ab. */
  readonly befunde: readonly Befund[];
}
