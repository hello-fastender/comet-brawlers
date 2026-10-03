// Prüflauf auf der Kommandozeile (Kampf 11.2, 11.6; Auftrag 3, 2.4):
//
//   node --experimental-strip-types src/pruef/lauf.ts --szene <datei> --eingabe <datei> --aus <ordner> [--stages <ordner>]
//
// Liest Szene und Eingabedatei, lädt die Stage aus daten/stages/<buehne>.txt
// (oder --stages), läuft bis endframe, schreibt protokoll.csv und objekte.csv
// nach --aus und gibt beide MD5 aus. Ohne --eingabe läuft er ohne Tasten.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { md5 } from './md5.ts';
import { pruefLauf } from './pruefung.ts';

/** Standardordner der Stage-Daten relativ zu dieser Datei. */
export const STAGE_ORDNER = fileURLToPath(new URL('../../daten/stages/', import.meta.url));

/** Liest die Stage-Datei einer Bühne aus einem Ordner. */
export function stageAusOrdner(ordner: string): (buehne: string) => string {
  return (buehne: string) => {
    if (!/^[a-z0-9_]+$/.test(buehne)) throw new RangeError(`Bühnenname „${buehne}“ ungültig`);
    return readFileSync(join(ordner, `${buehne}.txt`), 'utf8');
  };
}

function argumente(argv: string[]): Map<string, string> {
  const a = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i] as string;
    if (!name.startsWith('--')) throw new Error(`unerwartetes Argument „${name}“`);
    const wert = argv[i + 1];
    if (wert === undefined || wert.startsWith('--')) throw new Error(`Argument ${name} ohne Wert`);
    a.set(name.slice(2), wert);
    i += 1;
  }
  return a;
}

function haupt(): void {
  const a = argumente(process.argv.slice(2));
  const szene = a.get('szene');
  const aus = a.get('aus');
  if (szene === undefined || aus === undefined) {
    throw new Error('Aufruf: lauf.ts --szene <datei> --eingabe <datei> --aus <ordner> [--stages <ordner>]');
  }
  const eingabe = a.get('eingabe');
  const ergebnis = pruefLauf({
    szeneText: readFileSync(szene, 'utf8'),
    eingabeText: eingabe === undefined ? '' : readFileSync(eingabe, 'utf8'),
    stageText: stageAusOrdner(resolve(a.get('stages') ?? STAGE_ORDNER)),
    md5,
  });
  mkdirSync(aus, { recursive: true });
  writeFileSync(join(aus, 'protokoll.csv'), ergebnis.protokoll, 'utf8');
  writeFileSync(join(aus, 'objekte.csv'), ergebnis.objekte, 'utf8');
  process.stdout.write(`protokoll.csv ${md5(ergebnis.protokoll)}\n`);
  process.stdout.write(`objekte.csv ${md5(ergebnis.objekte)}\n`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    haupt();
  } catch (fehler) {
    process.stderr.write(`Prüflauf abgebrochen: ${(fehler as Error).message}\n`);
    process.exitCode = 1;
  }
}
