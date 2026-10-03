// Gemeinsame Hilfen der Tests (keine Testdatei: Muster *.test.ts trifft sie nicht).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { md5 } from '../src/pruef/md5.ts';
import { pruefLauf } from '../src/pruef/pruefung.ts';
import type { PruefErgebnis } from '../src/pruef/pruefung.ts';

/** Ordner spiel/ (eine Ebene über tests/). */
export const SPIEL = fileURLToPath(new URL('../', import.meta.url));

/** Liest eine Datei relativ zu spiel/. */
export function lies(pfad: string): string {
  return readFileSync(SPIEL + pfad, 'utf8');
}

/** Text der Stage-Datei einer Bühne. */
export function stageText(buehne: string): string {
  return lies(`daten/stages/${buehne}.txt`);
}

/** Prüflauf im Speicher mit Szene- und Eingabetext. */
export function lauf(szeneText: string, eingabeText: string = ''): PruefErgebnis {
  return pruefLauf({ szeneText, eingabeText, stageText, md5 });
}

/** Prüflauf mit Dateien relativ zu spiel/. */
export function laufDateien(szene: string, eingabe: string | null = null): PruefErgebnis {
  return lauf(lies(szene), eingabe === null ? '' : lies(eingabe));
}

/** Datenzeilen einer CSV-Datei mit Kommentarkopf: [Spalten, Zeilen als Felder]. */
export function csv(text: string): { kopf: string[]; spalten: string[]; zeilen: string[][] } {
  const alle = text.split('\n');
  if (alle[alle.length - 1] === '') alle.pop();
  const kopf = alle.filter((z) => z.startsWith('#'));
  const daten = alle.filter((z) => !z.startsWith('#'));
  const spalten = (daten[0] ?? '').split(',');
  return { kopf, spalten, zeilen: daten.slice(1).map((z) => z.split(',')) };
}

/** Wert einer Spalte in einer Zeile. */
export function zelle(t: { spalten: string[] }, zeile: string[], spalte: string): string {
  const i = t.spalten.indexOf(spalte);
  if (i < 0) throw new Error(`Spalte ${spalte} fehlt`);
  return zeile[i] as string;
}
