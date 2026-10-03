import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anteil, bereich, gegnerZufall, prozent, wahl, xorshift32, zufallKopie, zufallNeu, ziehen, ziehenAus } from '../src/kern/zufall.ts';

/**
 * Dokumentierte Folge für Seed 1 (Welt 11.1: Xorshift32 mit 13 links,
 * 17 rechts, 5 links): die ersten zehn Zustände nach je einer Ziehung.
 */
const SEED_1_FOLGE = [270369, 67634689, 2647435461, 307599695, 2398689233, 745495504, 632435482, 435756210, 2005365029, 2916098932];

test('zufall: Xorshift32 für Seed 1, die ersten zehn Zustände', () => {
  const z = zufallNeu(1);
  const folge: number[] = [];
  for (let i = 0; i < 10; i++) folge.push(ziehen(z));
  assert.deepEqual(folge, SEED_1_FOLGE);
  assert.equal(z.ziehungen, 10);
  assert.equal(xorshift32(1), SEED_1_FOLGE[0]);
});

test('zufall: Seed 0 ist verboten, Seed wird als uint32 gelesen', () => {
  assert.throws(() => zufallNeu(0), RangeError);
  assert.throws(() => zufallNeu(1.5), RangeError);
  assert.equal(zufallNeu(-1).zustand, 4294967295);
});

test('zufall: Ziehung aus n ist ⌊r · n / 2^32⌋ mit dem neuen Zustand', () => {
  for (const n of [1, 2, 3, 4, 8, 100, 1000]) {
    const z = zufallNeu(1);
    for (let i = 0; i < 10; i++) {
      const w = ziehenAus(z, n);
      const r = SEED_1_FOLGE[i] as number;
      const erwartet = Number((BigInt(r) * BigInt(n)) >> 32n);
      assert.equal(w, erwartet, `n=${n}, i=${i}`);
    }
    assert.equal(z.ziehungen, 10);
  }
  assert.throws(() => ziehenAus(zufallNeu(1), 0), RangeError);
});

test('zufall: Wahl aus einer Liste und aus einem Bereich in Schritten', () => {
  const z = zufallNeu(12345);
  const gesehen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const w = bereich(z, 16, 44, 4);
    assert.ok(w >= 16 && w <= 44 && (w - 16) % 4 === 0);
    gesehen.add(w);
  }
  assert.equal(gesehen.size, 8);
  assert.equal(z.ziehungen, 2000);
  const liste = ['BA', 'BB', 'BC'] as const;
  const a = zufallNeu(1);
  const b = zufallKopie(a);
  for (let i = 0; i < 50; i++) assert.equal(wahl(a, liste), liste[ziehenAus(b, 3)]);
  assert.throws(() => bereich(z, 16, 43, 4), RangeError);
});

test('zufall: Anteile in Prozent mit festen Grenzen (70/25/5 heißt 0–69, 70–94, 95–99)', () => {
  const z = zufallNeu(7);
  const kopie = zufallKopie(z);
  const zaehler = [0, 0, 0];
  for (let i = 0; i < 5000; i++) {
    const k = anteil(z, [70, 25, 5]);
    const w = ziehenAus(kopie, 100);
    const erwartet = w < 70 ? 0 : w < 95 ? 1 : 2;
    assert.equal(k, erwartet);
    zaehler[k] = (zaehler[k] as number) + 1;
  }
  assert.ok((zaehler[0] as number) > (zaehler[1] as number) && (zaehler[1] as number) > (zaehler[2] as number));
  assert.throws(() => anteil(z, [50, 40]), RangeError);
  const p = zufallNeu(1);
  assert.equal(prozent(p, 1), ziehenAus(zufallNeu(1), 100) < 1);
});

test('zufall: Generator je Gegner aus einer Ziehung des Hauptgenerators', () => {
  const haupt = zufallNeu(1);
  const g0 = gegnerZufall(haupt);
  const g1 = gegnerZufall(haupt);
  assert.equal(haupt.ziehungen, 2);
  assert.equal(g0.zustand, SEED_1_FOLGE[0]);
  assert.equal(g1.zustand, SEED_1_FOLGE[1]);
  assert.equal(g0.ziehungen, 0);
  // Ziehungen eines Gegners ändern weder den Hauptgenerator noch andere Gegner
  ziehen(g0);
  assert.equal(haupt.ziehungen, 2);
  assert.equal(g1.zustand, SEED_1_FOLGE[1]);
});
