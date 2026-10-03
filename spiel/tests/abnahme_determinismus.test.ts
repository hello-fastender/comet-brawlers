// Determinismus der Abnahmeszenen (Kampf 11.6; K5, Stufe 3): jede Prüfszene
// der Abnahmetests (tests/szenen/T*.txt und W-T*.txt mit ihrer Eingabedatei)
// läuft zweimal; MD5 von protokoll.csv und objekte.csv müssen gleich sein.
// Der Abnahmetest D1 der Spezifikation (nur T1 bis T20) steht in
// abnahme_kampf.test.ts; der Vergleich mit einem Protokoll aus dem Repo
// (zweiter Rechner, andere Programmläufe) in abnahme_referenz.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abnahmeLauf, abnahmeSzenen, md5Paar } from './abnahme_hilfe.ts';

test('Determinismus: jede Abnahmeszene zweimal, gleiche MD5 beider Protokolle (Kampf 11.6)', () => {
  const szenen = abnahmeSzenen(/^(T|W-T)\d+(_[a-z])?$/);
  const fehler: string[] = [];
  for (const n of szenen) {
    const a = md5Paar(abnahmeLauf(n));
    const b = md5Paar(abnahmeLauf(n));
    if (a.protokoll !== b.protokoll) fehler.push(`${n}: protokoll.csv ${a.protokoll} ≠ ${b.protokoll}`);
    if (a.objekte !== b.objekte) fehler.push(`${n}: objekte.csv ${a.objekte} ≠ ${b.objekte}`);
  }
  // T1 bis T20 und W-T1 bis W-T10 mit ihren Läufen: 50 Kampf- und 15 Weltszenen
  if (szenen.filter((n) => n.startsWith('T')).length < 20) fehler.push('weniger als 20 Kampfszenen gefunden');
  if (szenen.filter((n) => n.startsWith('W-T')).length < 10) fehler.push('weniger als 10 Weltszenen gefunden');
  assert.deepEqual(fehler, [], fehler.join('\n'));
});
