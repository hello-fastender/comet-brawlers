import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eingabeText, parseEingabe, tastenIn } from '../src/pruef/eingabe.ts';
import { TASTE_A, TASTE_O, TASTE_R, TASTE_S, tastenAusText, tastenZuText, richtungX, richtungZ } from '../src/kern/tasten.ts';
import { lies } from './hilfe.ts';

test('eingabe: Datei nach Kampf 11.1 mit Kommentaren und Überlappung', () => {
  const e = parseEingabe(lies('tests/eingaben/beispiel.txt'));
  assert.equal(e.letzter, 40);
  assert.equal(tastenIn(e, 1), 0);
  assert.equal(tastenIn(e, 10), TASTE_A);
  assert.equal(tastenIn(e, 11), 0);
  assert.equal(tastenIn(e, 24), TASTE_A);
  assert.equal(tastenIn(e, 30), TASTE_R);
  assert.equal(tastenIn(e, 35), TASTE_R | TASTE_A);
  assert.equal(tastenIn(e, 36), TASTE_R | TASTE_A);
  assert.equal(tastenIn(e, 40), TASTE_R);
  assert.equal(tastenIn(e, 41), 0);
  assert.equal(tastenIn(e, 100000), 0);
});

test('eingabe: Aufzeichnung je Lauf gleicher Tastenmengen, aufsteigend', () => {
  const e = parseEingabe(lies('tests/eingaben/beispiel.txt'));
  const text = eingabeText((f) => tastenIn(e, f), e.letzter);
  assert.equal(text, '10,10,A\n24,24,A\n30,34,R\n35,36,RA\n37,40,R\n');
  const wieder = parseEingabe(text);
  for (let f = 1; f <= 45; f++) assert.equal(tastenIn(wieder, f), tastenIn(e, f));
  assert.equal(eingabeText(() => 0, 10), '');
});

test('eingabe: Fehler und Tastenreihenfolge L R O U A S', () => {
  assert.throws(() => parseEingabe('5,4,A'), SyntaxError);
  assert.throws(() => parseEingabe('1,2,X'), SyntaxError);
  assert.throws(() => parseEingabe('1;2;A'), SyntaxError);
  assert.equal(parseEingabe('1,3,\n').tasten[2], 0);
  assert.equal(tastenZuText(tastenAusText('SARO')), 'ROAS');
  assert.equal(tastenZuText(TASTE_S | TASTE_O), 'OS');
  // P1: L und R zugleich keine x-Richtung, O und U zugleich keine Tiefenrichtung
  assert.equal(richtungX(tastenAusText('LR')), 0);
  assert.equal(richtungX(tastenAusText('L')), -1);
  assert.equal(richtungZ(tastenAusText('OU')), 0);
  assert.equal(richtungZ(tastenAusText('O')), 1);
  assert.equal(richtungZ(tastenAusText('U')), -1);
});
