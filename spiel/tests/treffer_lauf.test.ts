// Test K2 im vollen Prüflauf (Kampf 11.2): Prüfangriff aus einer Prüfszene,
// mit dem Logikschritt aus welt.ts und allen Modulen der Stufe 2. Die
// übrigen Tests von K2 (treffer_pruefung, treffer_reaktion) laufen ohne die
// Module der anderen Agenten.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csv, laufDateien, zelle } from './hilfe.ts';

test('treffer: Prüfangriff aus der Prüfszene trifft die Figur einmal im vollen Prüflauf (Kampf 11.2, 5.8)', () => {
  const r = laufDateien('tests/szenen/treffer_pruefangriff.txt');
  const t = csv(r.protokoll);
  assert.equal(t.zeilen.length, 30);
  for (const zeile of t.zeilen) {
    const frame = Number(zelle(t, zeile, 'frame'));
    const treffer = zelle(t, zeile, 'ereignis').split(';').filter((e) => e.startsWith('T:'));
    assert.deepEqual(treffer, frame === 19 ? ['T:s0>F:PA:5:R'] : [], `Frame ${frame}`);
    assert.equal(zelle(t, zeile, 's0_lp'), '16');
    assert.equal(zelle(t, zeile, 's0_x'), '146');
  }
});
