import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ausDezimal, zuDezimalText } from '../src/kern/festkomma.ts';

test('festkomma: Rohwerte aus Kampf 2.4', () => {
  assert.equal(ausDezimal(1.75), 114688);
  assert.equal(ausDezimal(4.9375), 323584);
  assert.equal(ausDezimal(70 / 256), 17920);
  assert.equal(ausDezimal(13 / 64), 13312);
});

test('festkomma: Formatierung nach Kampf 11.3', () => {
  assert.equal(zuDezimalText(ausDezimal(135.125)), '135.125');
  assert.equal(zuDezimalText(ausDezimal(51.25)), '51.25');
  assert.equal(zuDezimalText(ausDezimal(100)), '100');
  assert.equal(zuDezimalText(ausDezimal(-0.5)), '-0.5');
  assert.equal(zuDezimalText(0), '0');
  assert.equal(zuDezimalText(1), '0.0000152587890625');
});
