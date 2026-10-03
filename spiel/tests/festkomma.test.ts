import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EINS,
  abs,
  add,
  ausBruch,
  ausDezimal,
  ausGanz,
  divGanz,
  ganz,
  gleich,
  groesser,
  groesserGleich,
  kleiner,
  kleinerGleich,
  maxF,
  minF,
  mul,
  mulGanz,
  nachkomma,
  neg,
  produktGroesser,
  sub,
  vergleich,
  vorzeichen,
  zuDezimalText,
} from '../src/kern/festkomma.ts';
import { xorshift32 } from '../src/kern/zufall.ts';

test('festkomma: Rohwerte aus Kampf 2.4', () => {
  assert.equal(ausDezimal(1.75), 114688);
  assert.equal(ausDezimal(4.9375), 323584);
  assert.equal(ausDezimal(70 / 256), 17920);
  assert.equal(ausDezimal(13 / 64), 13312);
  assert.equal(ausDezimal(0.15625), 10240);
  assert.equal(ausDezimal(1.755859375), 115072);
  assert.equal(ausBruch(70, 256), 17920);
  assert.equal(ausBruch(13, 64), 13312);
  assert.equal(ausBruch(29, 64), 29696);
  assert.equal(ausGanz(-3), -3 * EINS);
});

test('festkomma: gerundete Konstanten (Kampf 2.4 Punkt 1)', () => {
  assert.equal(ausDezimal(3.92), 256901);
  assert.equal(ausDezimal(1.6), 104858);
  assert.equal(ausDezimal(0.8), 52429);
});

test('festkomma: add, sub, neg, abs mit 32-Bit-Überlauf', () => {
  assert.equal(add(ausDezimal(1.25), ausDezimal(0.75)), ausGanz(2));
  assert.equal(sub(ausDezimal(1.25), ausDezimal(2)), ausDezimal(-0.75));
  assert.equal(add(0x7fffffff, 1), -2147483648);
  assert.equal(neg(ausDezimal(2.5)), ausDezimal(-2.5));
  assert.equal(abs(ausDezimal(-2.5)), ausDezimal(2.5));
});

test('festkomma: mul mit exaktem Zwischenwert, Rundung nach −∞', () => {
  assert.equal(mul(ausDezimal(1.5), ausGanz(2)), ausGanz(3));
  assert.equal(mul(ausDezimal(-1.5), ausDezimal(0.5)), ausDezimal(-0.75));
  assert.equal(mul(ausGanz(300), ausGanz(100)), ausGanz(30000));
  assert.equal(mul(1, 1), 0);
  assert.equal(mul(-1, 1), -1);
  // 29/64 · 3,875 = 1,755859375 (Kampf 9.2, Sprintframes 2 bis 6 diagonal)
  assert.equal(mul(ausBruch(29, 64), ausDezimal(3.875)), 115072);
  // Vergleich mit BigInt-Referenz über eine feste Zahlenfolge
  let r = 1;
  for (let i = 0; i < 2000; i++) {
    r = xorshift32(r);
    const a = r | 0;
    r = xorshift32(r);
    const b = (r | 0) >> (i % 17);
    const erwartet = Number(BigInt.asIntN(32, (BigInt(a) * BigInt(b)) >> 16n));
    assert.equal(mul(a, b), erwartet, `mul(${a}, ${b})`);
  }
  assert.equal(mulGanz(ausDezimal(1.75), 3), ausDezimal(5.25));
});

test('festkomma: divGanz nur durch positive ganze Zahl, Rundung nach −∞', () => {
  assert.equal(divGanz(7, 2), 3);
  assert.equal(divGanz(-7, 2), -4);
  assert.equal(divGanz(-8, 2), -4);
  assert.equal(divGanz(0, 5), 0);
  assert.equal(divGanz(ausGanz(-1), 3), -21846);
  // Tempostufe des Sprints ⌊(n − 1)/6⌋ (Kampf 9.2)
  assert.equal(divGanz(90 - 1, 6), 14);
  assert.throws(() => divGanz(1, 0), RangeError);
  assert.throws(() => divGanz(1, -2), RangeError);
  assert.throws(() => divGanz(1, 1.5), RangeError);
});

test('festkomma: ganz, nachkomma, Vergleiche', () => {
  assert.equal(ganz(ausDezimal(2.5)), 2);
  assert.equal(ganz(ausDezimal(-0.25)), -1);
  assert.equal(nachkomma(ausDezimal(-0.25)), ausDezimal(0.75));
  assert.equal(vergleich(1, 2), -1);
  assert.equal(vergleich(2, 2), 0);
  assert.equal(vergleich(3, 2), 1);
  assert.ok(gleich(5, 5) && kleiner(4, 5) && kleinerGleich(5, 5) && groesser(6, 5) && groesserGleich(5, 5));
  assert.equal(minF(-1, 2), -1);
  assert.equal(maxF(-1, 2), 2);
  assert.equal(vorzeichen(-7), -1);
  assert.equal(vorzeichen(0), 0);
});

test('festkomma: Formatierung nach Kampf 11.3', () => {
  assert.equal(zuDezimalText(ausDezimal(135.125)), '135.125');
  assert.equal(zuDezimalText(ausDezimal(51.25)), '51.25');
  assert.equal(zuDezimalText(ausDezimal(100)), '100');
  assert.equal(zuDezimalText(ausDezimal(-0.5)), '-0.5');
  assert.equal(zuDezimalText(0), '0');
  assert.equal(zuDezimalText(-0), '0');
  assert.equal(zuDezimalText(1), '0.0000152587890625');
  assert.equal(zuDezimalText(ausDezimal(1.755859375)), '1.755859375');
  assert.equal(zuDezimalText(-2147483648), '-32768');
});

test('festkomma: Sprungbahn exakt (Kampf 4.4: Scheitel 51,25, J+41 2,5)', () => {
  let h = 0;
  let vh = ausDezimal(4.9375);
  const verlauf: string[] = [];
  for (let n = 1; n <= 40; n++) {
    h = add(h, vh);
    vh = sub(vh, ausDezimal(0.25));
    verlauf.push(zuDezimalText(h));
  }
  assert.equal(verlauf[0], '4.9375'); // J+2
  assert.equal(verlauf[19], '51.25'); // J+21
  assert.equal(verlauf[39], '2.5'); // J+41
});

test('festkomma: produktGroesser vergleicht a·b > c·d exakt, auch über 32 Bit', () => {
  assert.equal(produktGroesser(3, 4, 2, 5), true);
  assert.equal(produktGroesser(2, 5, 3, 4), false);
  assert.equal(produktGroesser(2, 6, 3, 4), false);
  // 32767 · 665398 übersteigt 2^31, 32767 · 65536 nicht: trotzdem exakt
  assert.equal(produktGroesser(32767, EINS, 3227, 665398), true);
  assert.equal(produktGroesser(32767, EINS, 3228, 665398), false);
  assert.equal(produktGroesser(1, EINS, 32767, 665398), false);
  assert.equal(produktGroesser(2 ** 31 - 1, 2 ** 31 - 1, 2 ** 31 - 1, 2 ** 31 - 2), true);
  assert.throws(() => produktGroesser(1.5, 2, 1, 1), RangeError);
});
