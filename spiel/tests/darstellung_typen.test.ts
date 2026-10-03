import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { SPIEL } from './hilfe.ts';
import { tscPfad } from './darstellung_hilfe.ts';

// Auftrag 3, 2.5: Die Darstellung liest nur den Kern. main.ts muss gegen den
// unveränderten Kern typprüfen (tsconfig.browser.json: Kern und Darstellung
// mit DOM, strict).
test('Darstellung: main.ts typprüft mit tsconfig.browser.json ohne Kern-Änderung', () => {
  const liste = execFileSync(tscPfad(), ['-p', 'tsconfig.browser.json', '--listFilesOnly'], { cwd: SPIEL, encoding: 'utf8' })
    .split('\n')
    .map((z) => resolve(z.trim()));
  assert.ok(liste.includes(resolve(SPIEL, 'src/darstellung/main.ts')), 'main.ts gehört nicht zu tsconfig.browser.json');
  assert.ok(liste.includes(resolve(SPIEL, 'src/kern/welt.ts')), 'der Kern gehört nicht zu tsconfig.browser.json');
  const lauf = spawnSync(tscPfad(), ['--noEmit', '-p', 'tsconfig.browser.json'], { cwd: SPIEL, encoding: 'utf8' });
  assert.equal(lauf.status, 0, `tsc meldet Fehler:\n${lauf.stdout}${lauf.stderr}`);
});
