import { test } from 'node:test';
import assert from 'node:assert/strict';
import { md5 } from '../src/pruef/md5.ts';
import { laufDateien } from './hilfe.ts';

// Kampf 11.6 für das Gerüst (der Abnahmetest D1 über T1 bis T20 folgt in Stufe 3).
test('Determinismus (Gerüst): zwei Prüfläufe ergeben gleiche MD5', () => {
  for (const szene of ['tests/szenen/beispiel_puppe.txt', 'tests/szenen/beispiel_scheibe.txt']) {
    const a = laufDateien(szene, 'tests/eingaben/beispiel.txt');
    const b = laufDateien(szene, 'tests/eingaben/beispiel.txt');
    assert.equal(md5(a.protokoll), md5(b.protokoll), `${szene}: protokoll.csv`);
    assert.equal(md5(a.objekte), md5(b.objekte), `${szene}: objekte.csv`);
    assert.equal(a.protokoll, b.protokoll);
  }
});
