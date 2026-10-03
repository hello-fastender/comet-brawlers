import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { SPIEL } from './hilfe.ts';

const KERN = resolve(SPIEL, 'src/kern');

function dateien(ordner: string): string[] {
  const liste: string[] = [];
  for (const name of readdirSync(ordner).sort()) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) liste.push(...dateien(pfad));
    else if (name.endsWith('.ts')) liste.push(pfad);
  }
  return liste;
}

/** Entfernt Block- und Zeilenkommentare (grob, genügt für den Kern). */
function ohneKommentare(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('Reinheit: src/kern importiert nichts aus node:, src/pruef oder src/darstellung und nutzt weder Date, Math.random, window noch document', () => {
  const liste = dateien(KERN);
  assert.ok(liste.length >= 10);
  for (const datei of liste) {
    const name = relative(SPIEL, datei);
    const text = readFileSync(datei, 'utf8');
    const importe = [...text.matchAll(/(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
      (m) => (m[1] ?? m[2]) as string,
    );
    for (const ziel of importe) {
      assert.ok(!ziel.startsWith('node:'), `${name} importiert ${ziel}`);
      assert.ok(ziel.startsWith('./') || ziel.startsWith('../'), `${name} importiert ein Paket (${ziel})`);
      const aufgeloest = resolve(dirname(datei), ziel);
      assert.ok(aufgeloest.startsWith(KERN + sep), `${name} importiert außerhalb von src/kern: ${ziel}`);
    }
    const code = ohneKommentare(text);
    for (const verboten of [/\bDate\b/, /Math\.random/, /\bwindow\b/, /\bdocument\b/]) {
      assert.ok(!verboten.test(code), `${name} verwendet ${verboten.source}`);
    }
  }
});
