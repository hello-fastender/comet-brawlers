// Tests K1: Zustandsautomat der Figur ohne Treffer (Kampf 4.2 bis 4.4, 9.1,
// 9.2), Frame-Erwartungen aus mechanik.md „Bewegung“, „Sprung“, „Sprint“ und
// Kampf 12 (T1, T2, T11). Die ersten drei laufen über den echten Prüflauf
// (welt.ts), die übrigen über die Schrittfolge der Figur (figur_hilfe.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csv, lauf, zelle } from './hilfe.ts';
import { STANDARD, bei, laufen, weltAus } from './figur_hilfe.ts';
import { tippFortschreiben } from '../src/kern/figur/zustaende.ts';
import { TASTE_O, TASTE_R } from '../src/kern/tasten.ts';
import type { Tipp } from '../src/kern/entitaeten.ts';

/** Spalten eines echten Prüflaufs je Frame. */
function protokoll(eingabe: string, endframe: number): (frame: number, spalte: string) => string {
  const r = lauf(STANDARD.replace('endframe=400', `endframe=${endframe}`), eingabe);
  const t = csv(r.protokoll);
  return (frame, spalte) => {
    const z = t.zeilen[frame - 1];
    if (z === undefined) throw new Error(`Frame ${frame} fehlt`);
    return zelle(t, z, spalte);
  };
}

test('figur: STAND und LAUF (T1; mechanik „Bewegung“: 1,75 / 1,0 / 1,25 und 0,75, Bewegung P+1 bis E+1)', () => {
  const p = protokoll('10,29,R\n40,49,O\n60,69,RO\n80,80,L\n', 90);
  assert.deepEqual([p(10, 'f_x'), p(10, 'f_akt')], ['100', 'STAND']);
  assert.deepEqual([p(11, 'f_x'), p(11, 'f_akt'), p(11, 'f_uhr')], ['101.75', 'LAUF', '1']);
  assert.equal(p(30, 'f_x'), '135');
  assert.deepEqual([p(31, 'f_x'), p(31, 'f_akt')], ['135', 'STAND']);
  assert.deepEqual([p(41, 'f_z'), p(50, 'f_z'), p(51, 'f_z')], ['101', '110', '110']);
  assert.deepEqual([p(61, 'f_x'), p(61, 'f_z')], ['136.25', '110.75']);
  assert.deepEqual([p(70, 'f_x'), p(70, 'f_z'), p(71, 'f_x'), p(71, 'f_z')], ['147.5', '117.5', '147.5', '117.5']);
  assert.deepEqual([p(81, 'f_x'), p(81, 'f_blick')], ['145.75', 'L']);
  assert.deepEqual([p(82, 'f_x'), p(82, 'f_akt')], ['145.75', 'STAND']);
});

test('figur: SPRUNG und LANDUNG (T2; P+21 Scheitel 51,25, P+42 Aufsetzen, P+48 frei, Weite 92,25)', () => {
  const p = protokoll('10,10,S\n30,70,R\n100,100,RS\n', 150);
  assert.deepEqual([p(11, 'f_akt'), p(11, 'f_h'), p(11, 'f_uhr')], ['SPRUNG', '0', '1']);
  assert.equal(p(12, 'f_h'), '4.9375');
  assert.equal(p(31, 'f_h'), '51.25');
  let hoechst = 0;
  for (let f = 11; f <= 52; f++) hoechst = Math.max(hoechst, Number(p(f, 'f_h')));
  assert.equal(hoechst, 51.25);
  assert.equal(p(51, 'f_h'), '2.5');
  assert.deepEqual([p(52, 'f_h'), p(52, 'f_akt')], ['0', 'LANDUNG']);
  for (let f = 11; f <= 58; f++) assert.equal(p(f, 'f_x'), '100', `Frame ${f}`);
  assert.equal(p(57, 'f_akt'), 'LANDUNG');
  assert.equal(p(58, 'f_akt'), 'STAND');
  assert.equal(p(59, 'f_x'), '101.75');
  assert.equal(p(72, 'f_x'), '122.75');
  assert.deepEqual([p(101, 'f_akt'), p(101, 'f_x')], ['SPRUNG', '122.75']);
  assert.equal(p(102, 'f_x'), '125');
  assert.deepEqual([p(142, 'f_x'), p(142, 'f_h'), p(142, 'f_akt')], ['215', '0', 'LANDUNG']);
  assert.equal(p(148, 'f_akt'), 'STAND');
});

test('figur: SPRINT (T11; Sprintframe 1 = D2+1, 267,875 px in 90 Frames, danach 1 Frame STAND)', () => {
  const p = protokoll('10,12,R\n16,140,R\n', 150);
  for (let f = 13; f <= 16; f++) assert.equal(p(f, 'f_x'), '105.25');
  for (let f = 14; f <= 16; f++) assert.equal(p(f, 'f_akt'), 'STAND');
  assert.deepEqual([p(17, 'f_akt'), p(17, 'f_sprint'), p(17, 'f_x'), p(17, 'ereignis')], ['SPRINT', '1', '107', 'SP:F:1']);
  assert.equal(p(18, 'f_x'), '110.875');
  assert.equal(p(22, 'f_x'), '126.375');
  assert.deepEqual([p(106, 'f_sprint'), p(106, 'f_x')], ['90', '373.125']);
  assert.equal(Number(p(106, 'f_x')) - Number(p(16, 'f_x')), 267.875);
  assert.deepEqual([p(107, 'f_akt'), p(107, 'f_x')], ['STAND', '373.125']);
  assert.deepEqual([p(108, 'f_akt'), p(108, 'f_x')], ['LAUF', '374.875']);
  // Lauf b: erster Tipp 11 Frames; Lauf c: 11 Frames Pause → kein Sprint
  const b = protokoll('10,20,R\n24,40,R\n', 30);
  assert.deepEqual([b(25, 'f_akt'), b(25, 'f_x')], ['LAUF', '121']);
  const c = protokoll('10,12,R\n24,40,R\n', 30);
  assert.deepEqual([c(25, 'f_akt'), c(25, 'f_sprint')], ['LAUF', '0']);
});

test('figur: Doppeltipp-Erkennung (Kampf 9.1, P22)', () => {
  const folge = (liste: number[]): boolean[] => {
    const tipp: Tipp = { lauf: 0, lauf_dauer: 0, pause_dauer: 0, voriger: 0, voriger_dauer: 0, erkannt: 0 };
    return liste.map((d) => tippFortschreiben(tipp, d));
  };
  const R = TASTE_R;
  const RO = TASTE_R | TASTE_O;
  // 1 Frame Tipp, 1 Frame Pause → Sprint im ersten Frame des zweiten Tipps
  assert.deepEqual(folge([R, 0, R, R]), [false, false, true, false]);
  // rechts, dann rechts plus hoch: kein Sprint
  assert.deepEqual(folge([R, 0, RO]), [false, false, false]);
  // diagonal zweimal: Sprint
  assert.deepEqual(folge([RO, 0, RO]), [false, false, true]);
  // 10 Frames Tipp und 10 Frames Pause gehen, 11 nicht
  const zehn = (n: number, d: number) => Array.from({ length: n }, () => d);
  assert.equal(folge([...zehn(10, R), ...zehn(10, 0), R]).at(-1), true);
  assert.equal(folge([...zehn(11, R), ...zehn(1, 0), R]).at(-1), false);
  assert.equal(folge([...zehn(1, R), ...zehn(11, 0), R]).at(-1), false);
  // nur hoch in der Pause zählt nicht als Pause
  assert.equal(folge([R, TASTE_O, R]).at(-1), false);
});

test('figur: SPRINT diagonal und Abbruch mit Gegenrichtung (Kampf 9.2: 1 Frame STAND, dann LAUF)', () => {
  const w = weltAus();
  const z = laufen(w, '10,10,R\n12,20,R\n15,16,RO\n21,25,L\n', 26);
  assert.equal(bei(z, 13).f_akt, 'SPRINT');
  // Sprintframe 1 in 13 gerade: 1,75; Sprintframe 2 in 14: 3,875
  assert.equal(Number(bei(z, 14).f_x) - Number(bei(z, 13).f_x), 3.875);
  // 16, 17 diagonal (T(15), T(16) mit O): x 0,75·3,875, Tiefe 29/64·3,875 (P23)
  assert.equal(Number(bei(z, 16).f_x) - Number(bei(z, 15).f_x), 2.90625);
  assert.equal(Number(bei(z, 16).f_z) - Number(bei(z, 15).f_z), 1.755859375);
  assert.equal(bei(z, 18).f_z, bei(z, 17).f_z);
  // 21 letzter Sprintframe (T(20) mit R), 22 Gegenrichtung: STAND ohne Bewegung, 23 LAUF nach links
  assert.equal(bei(z, 21).f_akt, 'SPRINT');
  assert.deepEqual([bei(z, 22).f_akt, bei(z, 22).f_x, bei(z, 22).f_sprint], ['STAND', bei(z, 21).f_x, 0]);
  assert.deepEqual([bei(z, 23).f_akt, bei(z, 23).f_blick], ['LAUF', 'L']);
});

test('figur: LANDUNG nimmt nur S in Landeframe 1 bis 5 an (Kampf 4.3, P2), A verfällt', () => {
  // J = 10, Aufsetzen J+42 = 52; S in 56 (Landeframe 5) gibt einen neuen Sprung ab 57
  const a = laufen(weltAus(), '10,10,S\n56,56,S\n', 60);
  assert.deepEqual([bei(a, 56).f_akt, bei(a, 57).f_akt, bei(a, 57).f_uhr], ['LANDUNG', 'SPRUNG', 1]);
  // S in 57 (Landeframe 6) verfällt
  const b = laufen(weltAus(), '10,10,S\n57,57,S\n', 60);
  assert.deepEqual([bei(b, 58).f_akt, bei(b, 59).f_akt], ['STAND', 'STAND']);
  // A und S in Landeframe 1 (52): neuer Sprung, A verfällt
  const c = laufen(weltAus(), '10,10,S\n52,52,AS\n', 60);
  assert.deepEqual([bei(c, 53).f_akt, bei(c, 53).angriff], ['SPRUNG', '']);
  // A allein in der Landung verfällt
  const d = laufen(weltAus(), '10,10,S\n54,54,A\n', 60);
  assert.equal(bei(d, 55).f_akt, 'LANDUNG');
  assert.equal(bei(d, 58).f_akt, 'STAND');
});

test('figur: Sprung rückwärts und Tiefe in der Luft (Kampf 4.1, 4.4): Blick bleibt, Tiefe ±0,5 je Luftframe', () => {
  const z = laufen(weltAus(), '10,10,LS\n20,29,U\n', 60);
  assert.equal(bei(z, 12).f_x, '97.75');
  assert.equal(bei(z, 12).f_blick, 'R');
  assert.equal(bei(z, 52).f_x, String(100 - 92.25));
  assert.equal(bei(z, 30).f_z, '95');
  assert.equal(bei(z, 52).f_akt, 'LANDUNG');
});

test('figur: SPRINTSPRUNG (Kampf 9.3): Vorwärtssprung in Sprintrichtung, Sprinttempo verfällt', () => {
  const z = laufen(weltAus(), '10,10,R\n12,20,R\n18,18,S\n', 70);
  assert.equal(bei(z, 18).f_akt, 'SPRINT');
  assert.deepEqual([bei(z, 19).f_akt, bei(z, 19).f_sprint], ['SPRINTSPRUNG', 0]);
  const x19 = Number(bei(z, 19).f_x);
  assert.equal(Number(bei(z, 20).f_x) - x19, 2.25);
  assert.equal(bei(z, 39).f_h, '51.25');
  assert.deepEqual([bei(z, 60).f_akt, Number(bei(z, 60).f_x) - x19], ['LANDUNG', 92.25]);
  assert.equal(bei(z, 66).f_akt, 'STAND');
});
