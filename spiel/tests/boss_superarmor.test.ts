// Tests K4: Super-Armor des Bosses (Welt 7.4, SA1 bis SA6), Reaktionen
// (7.1), Verstärkungsschwelle (7.5) und Fall (7.6). Orientiert an den
// Abnahmetests W-T7 und W-T8 (Welt 12), die Stufe 3 baut.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossLpDauerhaft } from '../src/kern/gegner/boss.ts';
import type { Gegner } from '../src/kern/entitaeten.ts';
import { bei, boss, bossLauf, bossWelt, frames } from './boss_hilfe.ts';

const PS7 = 'tests/szenen/boss_ps7.txt';

/** Kette 1 bis 3 wie W-T7: Drücke A 10, 24, 40 treffen in 12, 27, 44. */
const KETTE_1_BIS_3 = {
  12: [{ code: 'KT1' as const, schaden: 3 }],
  27: [{ code: 'KT2' as const, schaden: 4 }],
  44: [{ code: 'KT3' as const, schaden: 5 }],
};

test('Boss: Kette 1 bis 3 ohne Umwerfen, LP in h+23 zurück auf lp_folge, Stoß 54 Frames', () => {
  const welt = bossWelt(PS7);
  const v = bossLauf(welt, 140, { treffer: KETTE_1_BIS_3 });
  // W-T7 (a)
  assert.deepEqual([bei(v, 12).lp, bei(v, 12).folge, bei(v, 12).lp_folge], [97, 1, 100]);
  assert.equal(bei(v, 12).modus, 'GETROFFEN');
  assert.equal(bei(v, 27).lp, 93);
  assert.equal(bei(v, 44).lp, 88);
  assert.equal(bei(v, 66).lp, 88);
  assert.equal(bei(v, 66).folge, 1);
  assert.equal(bei(v, 66).modus, 'GETROFFEN', 'bis zur Auflösung der Folge in GETROFFEN (SA3)');
  const s67 = bei(v, 67);
  assert.deepEqual([s67.lp, s67.modus, s67.folge, s67.lp_folge], [100, 'STOSS', 0, 0]);
  assert.ok(s67.ereignisse.includes('SA:s0:100'));
  assert.equal(frames(v, 1, 140, (s) => s.ereignisse.some((e) => e.startsWith('SA:'))).length, 1);
  // Rückzug: 48 px von der Figur weg in den ersten 16 Frames nach S = 67, ohne aktive Frames
  assert.equal(bei(v, 67).x, '2060');
  assert.equal(bei(v, 68).x, '2063');
  assert.equal(bei(v, 83).x, '2108');
  assert.equal(bei(v, 120).x, '2108');
  assert.deepEqual(frames(v, 67, 140, (s) => s.aktiv), []);
  // 54 Frames STOSS (67 bis 120), BEREIT ab 121; nicht treffbar bis 128 (62 Frames), Zustand 1 ab 129
  assert.deepEqual(frames(v, 60, 140, (s) => s.modus === 'STOSS'), Array.from({ length: 54 }, (_, i) => 67 + i));
  assert.equal(bei(v, 120).timer, 54);
  assert.equal(bei(v, 121).modus, 'BEREIT');
  assert.equal(bei(v, 128).zustand, 2);
  assert.equal(bei(v, 129).zustand, 1);
  assert.equal(bei(v, 130).lp, 100);
});

test('Boss: Kette mit Tritt zieht endgültig ab und wirft um, Aufstehen ohne Schutz (E4)', () => {
  const welt = bossWelt(PS7);
  const v = bossLauf(welt, 200, { treffer: { ...KETTE_1_BIS_3, 60: [{ code: 'KT4', schaden: 10, umwerfen: true, richtung: 1 }] } });
  // W-T7 (b)
  const s60 = bei(v, 60);
  assert.deepEqual([s60.lp, s60.modus, s60.folge, s60.lp_folge], [78, 'UMGEWORFEN', 0, 0]);
  assert.ok(s60.ereignisse.includes('T:F>s0:KT4:10:U'));
  assert.equal(bei(v, 67).lp, 78);
  assert.deepEqual(frames(v, 1, 200, (s) => s.ereignisse.some((e) => e.startsWith('SA:'))), []);
  // Flug wie F1 bis zum Bodenkontakt (W+46), Ruhe W+55 bei 127,25 px vom Trefferort
  assert.equal(bei(v, 68).x, '2060');
  assert.equal(bei(v, 69).x, '2062.875');
  assert.equal(bei(v, 87).h, '48.2421875');
  assert.equal(bei(v, 106).x, '2169.25');
  assert.equal(bei(v, 106).h, '0');
  assert.equal(bei(v, 115).x, '2187.25');
  assert.equal(bei(v, 115).modus, 'LIEGEN');
  assert.equal(bei(v, 116).x, '2187.25');
  // G = W+97 bis W+125, in Viererschritten; frei und verwundbar genau ab G
  const g = boss(welt);
  const G = frames(v, 116, 200, (s) => s.modus === 'FREI')[0] as number;
  assert.ok(G >= 60 + 97 && G <= 60 + 125 && (G - 60 - 97) % 4 === 0, `G = ${G}`);
  assert.equal(bei(v, G).zustand, 1);
  assert.equal(bei(v, G - 1).zustand, 2);
  assert.equal(bei(v, G - 1).modus, 'AUFSTEHEN');
  assert.equal(frames(v, 116, 200, (s) => s.modus === 'AUFSTEHEN').length, 18);
  assert.equal(bei(v, G + 1).modus, 'BEREIT');
  assert.equal(bei(v, G + 1).zustand, 1);
  assert.equal(g.lp, 78);
});

test('Boss: Spezialangriff 6 LP endgültig, Taumeln 78 Frames über 135,125 px', () => {
  const welt = bossWelt(PS7);
  const v = bossLauf(welt, 120, { treffer: { 12: [{ code: 'SP', schaden: 6, umwerfen: true, richtung: 1 }] } });
  const s12 = bei(v, 12);
  assert.deepEqual([s12.lp, s12.modus, s12.folge], [94, 'TAUMELN', 0]);
  assert.ok(s12.ereignisse.includes('T:F>s0:SP:6:R'));
  assert.deepEqual(frames(v, 1, 120, (s) => s.ereignisse.some((e) => e.startsWith('SA:'))), []);
  assert.deepEqual(frames(v, 12, 120, (s) => s.lp !== 94), []);
  assert.equal(bei(v, 20).x, '2060');
  assert.equal(bei(v, 21).x, '2062.875');
  assert.equal(bei(v, 67).x, '2195.125');
  assert.equal(bei(v, 89).x, '2195.125');
  assert.equal(bei(v, 89).modus, 'TAUMELN');
  assert.equal(bei(v, 89).zustand, 2);
  assert.equal(bei(v, 90).modus, 'FREI');
  assert.equal(bei(v, 90).zustand, 1, 'danach sofort treffbar');
  assert.equal(bei(v, 91).modus, 'BEREIT');
});

test('Boss: Spezialangriff in einer offenen Folge beendet sie, alle Abzüge bleiben, kein Stoß', () => {
  const welt = bossWelt(PS7);
  const v = bossLauf(welt, 80, { treffer: { 12: [{ code: 'KT1', schaden: 3 }], 20: [{ code: 'SP', schaden: 6, umwerfen: true, richtung: 1 }] } });
  assert.deepEqual([bei(v, 20).lp, bei(v, 20).folge, bei(v, 20).modus], [91, 0, 'TAUMELN']);
  assert.equal(bei(v, 35).lp, 91);
  assert.equal(bei(v, 43).lp, 91);
  assert.deepEqual(frames(v, 1, 80, (s) => s.modus === 'STOSS'), []);
});

test('Boss: Sprungangriff runter in der Folge zählt als Treffer der Folge und senkt lp_folge (SA2)', () => {
  const welt = bossWelt(PS7);
  const v = bossLauf(welt, 50, { treffer: { 12: [{ code: 'KT1', schaden: 3 }], 20: [{ code: 'ST', schaden: 4 }] } });
  assert.deepEqual([bei(v, 20).lp, bei(v, 20).lp_folge, bei(v, 20).folge], [93, 96, 1]);
  assert.equal(bei(v, 42).modus, 'GETROFFEN');
  assert.equal(bei(v, 43).lp, 96);
  assert.equal(bei(v, 43).modus, 'STOSS');
  assert.ok(bei(v, 43).ereignisse.includes('SA:s0:96'));
});

test('Boss: Sprungangriff runter ohne Folge zieht endgültig ab, ohne Stoß', () => {
  const welt = bossWelt(PS7);
  const v = bossLauf(welt, 50, { treffer: { 12: [{ code: 'ST', schaden: 4 }] } });
  assert.deepEqual([bei(v, 12).lp, bei(v, 12).folge, bei(v, 12).modus], [96, 0, 'GETROFFEN']);
  assert.equal(bei(v, 34).zustand, 3);
  assert.equal(bei(v, 35).modus, 'FREI');
  assert.equal(bei(v, 35).zustand, 1);
  assert.equal(bei(v, 36).modus, 'BEREIT');
  assert.deepEqual(frames(v, 1, 50, (s) => s.modus === 'STOSS'), []);
  assert.equal(bei(v, 50).lp, 96);
});

test('Boss: gehalten ruht die Frist, nach dem Losreißen springen die LP im Frame danach zurück', () => {
  const welt = bossWelt(PS7);
  const g = boss(welt);
  const v = bossLauf(welt, 80, {
    treffer: { 12: [{ code: 'KT1', schaden: 3 }], 25: [{ code: 'KN', schaden: 4 }] },
    vorher: (_w, f) => {
      if (f === 20) g.gehalten_von = 'f';
      if (f === 60) g.gehalten_von = null;
    },
  });
  assert.equal(bei(v, 20).modus, 'GEHALTEN');
  assert.equal(bei(v, 20).zustand, 2);
  // Kniestoß 1 im Griff: endgültig, zählt zur Folge, keine Reaktion
  assert.deepEqual([bei(v, 25).lp, bei(v, 25).lp_folge, bei(v, 25).modus], [93, 96, 'GEHALTEN']);
  assert.deepEqual(frames(v, 1, 60, (s) => s.ereignisse.some((e) => e.startsWith('SA:'))), []);
  assert.equal(bei(v, 60).folge, 1);
  assert.equal(bei(v, 61).lp, 96);
  assert.equal(bei(v, 61).modus, 'STOSS');
  assert.ok(bei(v, 61).ereignisse.includes('SA:s0:96'));
});

test('Boss: Welle 9 bei 25 LP, es zählen die dauerhaft abgezogenen LP (7.5, wie W-T8 a)', () => {
  const welt = bossWelt('tests/szenen/boss_ps8a.txt');
  const g = boss(welt);
  const dauerhaft: number[] = [];
  const v = bossLauf(welt, 61, {
    treffer: { ...KETTE_1_BIS_3, 60: [{ code: 'KT4', schaden: 10, umwerfen: true, richtung: 1 }] },
    vorher: (w) => {
      dauerhaft[w.frame] = bossLpDauerhaft(w) as number;
    },
  });
  dauerhaft[61] = bossLpDauerhaft(welt) as number;
  // Stand am Ende von Frame f steht in dauerhaft[f] (vorher von f+1 gelesen)
  assert.equal(bei(v, 27).lp, 23, 'LP unter der Schwelle, aber nur vorläufig');
  assert.equal(dauerhaft[27], 30);
  assert.equal(dauerhaft[44], 30);
  assert.equal(dauerhaft[59], 30);
  assert.equal(bei(v, 60).lp, 8);
  assert.equal(dauerhaft[60], 8);
  // erster Frame mit dauerhaften LP ≤ 25 ist 60 (W-T8 a: WL:9 in 60)
  const unter: number[] = [];
  for (let f = 1; f <= 60; f++) if ((dauerhaft[f] as number) <= 25) unter.push(f);
  assert.equal(unter[0], 60);
  // K3 liest dieselben Felder: während einer Folge lp_folge, sonst LP (lp_folge außerhalb 0)
  assert.equal(g.folge, 0);
  assert.equal(g.lp_folge, 0);
});

test('Boss: Fall setzt alle übrigen Gegner im selben Frame auf LP −1 und TOT (7.6, wie W-T8 b)', () => {
  const welt = bossWelt('tests/szenen/boss_ps8b.txt', 'pruefstart welle.9=an\nobjekt slot=24 typ=Rakete x=2100 z=50');
  const rakete = welt.objekte[4];
  assert.ok(rakete !== undefined && rakete.belegt);
  rakete.besitzer = 's1';
  const w9 = welt.wellen.liste.find((w) => w.satz.nr === 9);
  assert.ok(w9 !== undefined && !w9.aus);
  const v = bossLauf(welt, 13, { treffer: { 12: [{ code: 'KT1', schaden: 3 }] } });
  const s12 = bei(v, 12);
  assert.equal(s12.lp, -1);
  assert.equal(s12.modus, 'TOT');
  assert.ok(s12.ereignisse.includes('T:F>s0:KT1:3:X'));
  assert.ok(s12.ereignisse.includes('BF:s0'));
  for (const n of [1, 2, 3]) {
    const o = welt.gegner[n] as Gegner;
    assert.equal(o.lp, -1, `s${n}`);
    assert.equal(o.modus, 'TOT', `s${n}`);
    assert.equal(o.tod_t, 12, `s${n}`);
    assert.equal(o.ohne_punkte, true, `s${n}`);
  }
  assert.equal(rakete.belegt, false, 'Geschosse der Gegner verschwinden');
  assert.equal(w9.aus, true, 'scharfe Wellen entfallen');
  assert.equal(welt.rahmen.boss_t, 12);
  assert.equal(frames(v, 1, 13, (s) => s.ereignisse.includes('BF:s0')).length, 1);
});

test('Boss: genau 0 LP kämpft weiter, LP unter 0 durch Eingriff ist der Tod (SA6)', () => {
  const welt = bossWelt('tests/szenen/boss_ps8b.txt', 'pruefstart boss.lp=3');
  const v = bossLauf(welt, 14, { treffer: { 12: [{ code: 'ST', schaden: 3 }] }, vorher: (w, f) => {
    if (f === 14) boss(w).lp = -2;
  } });
  assert.equal(bei(v, 12).lp, 0);
  assert.equal(bei(v, 12).modus, 'GETROFFEN');
  assert.equal(bei(v, 13).modus, 'GETROFFEN');
  assert.equal(bei(v, 14).modus, 'TOT');
  assert.ok(bei(v, 14).ereignisse.includes('BF:s0'));
  assert.equal((welt.gegner[1] as Gegner).modus, 'TOT');
});
