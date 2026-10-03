// Referenzprotokoll (Kampf 11.6; K5, Stufe 3): protokoll.csv und objekte.csv
// der Abnahmeszene W-T8_a (Welt 12, T8 a: Kette gegen den Boss mit
// Super-Armor, Schwelle und Welle 9, Zünder mit Zielen, Schuss, Rakete und
// Explosion, Figur umgeworfen; berührt Figur, Treffer, Boss, Fernkämpfer,
// Wellen, Kamera, Rang und Objekte) müssen bitgleich zu den Dateien in
// tests/referenz/ sein. So fällt jede Änderung am Verhalten auf, auch über
// Rechner und Programmläufe hinweg (D1, „auf einem zweiten Rechner“).
//
// Die Referenz entstand beim ersten grünen Lauf aller Abnahmetests
// (2026-10-03). Ändert sich das Verhalten gewollt, wird sie neu geschrieben:
//   ABNAHME_REFERENZ_SCHREIBEN=1 npm test
// (dann den Unterschied prüfen und in docs/scheibe.md, Abschnitt „Abnahme“,
// begründen).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { abnahmeLauf, REFERENZ } from './abnahme_hilfe.ts';
import { SPIEL } from './hilfe.ts';

/** Szene des Referenzprotokolls. */
const SZENE = 'W-T8_a';

/** Erste abweichende Zeile zweier Texte, für die Fehlermeldung. */
function ersteAbweichung(ist: string, soll: string): string {
  const a = ist.split('\n');
  const b = soll.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `Zeile ${i + 1}:\n  ist:  ${(a[i] ?? '(fehlt)').slice(0, 300)}\n  soll: ${(b[i] ?? '(fehlt)').slice(0, 300)}`;
  }
  return 'keine';
}

test(`Referenz: protokoll.csv und objekte.csv von ${SZENE} gleich der Referenz in tests/referenz/ (Kampf 11.6)`, () => {
  const l = abnahmeLauf(SZENE);
  const dateien: [string, string][] = [
    [`${REFERENZ}${SZENE}.protokoll.csv`, l.protokoll],
    [`${REFERENZ}${SZENE}.objekte.csv`, l.objekte],
  ];
  for (const [pfad, ist] of dateien) {
    if (process.env['ABNAHME_REFERENZ_SCHREIBEN'] === '1') writeFileSync(SPIEL + pfad, ist, 'utf8');
    assert.ok(existsSync(SPIEL + pfad), `${pfad} fehlt; neu schreiben mit ABNAHME_REFERENZ_SCHREIBEN=1`);
    const soll = readFileSync(SPIEL + pfad, 'utf8');
    assert.ok(ist === soll, `${pfad} weicht ab, erste Abweichung ${ersteAbweichung(ist, soll)}`);
  }
});
