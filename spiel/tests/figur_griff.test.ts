// Tests K1: Griff, Kniestoß, Wurf und geworfener Gegner (Kampf 8, 4.3) mit
// Frame-Erwartungen aus mechanik.md „Griff und Wurf“ und Kampf 12 (T6, T16).
// Puppen stehen still (Schrittfolge ohne Gegnerlogik); Treffer werden in KS7
// eingespeist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Haken } from './figur_hilfe.ts';
import { STANDARD, aktiveFrames, bei, laufen, trefferDerFigur, trefferMit, weltAus } from './figur_hilfe.ts';
import { zuDezimalText } from '../src/kern/festkomma.ts';

function mitPuppen(...puppen: string[]): string {
  return STANDARD + puppen.map((p, i) => `gegner slot=${i} typ=Puppe rolle=leicht lp=30 ${p}\n`).join('');
}

/** Frame des Griffs (G-Ereignis) oder 0. */
function griffFrame(szene: string, eingabe: string, bis: number): number {
  const z = laufen(weltAus(szene), eingabe, bis);
  for (let f = 1; f <= bis; f++) if (bei(z, f).ereignis.includes('G:F>')) return f;
  return 0;
}

test('figur: Griff am Ende eines LAUF-Frames, vorn bis 39, Haltelage 19 px (T6, Kampf 8.1, P19)', () => {
  const w = weltAus(mitPuppen('x=160 z=100 blick=L'));
  const z = laufen(w, '10,30,R\n', 30);
  assert.deepEqual([bei(z, 21).f_akt, bei(z, 21).f_x], ['LAUF', '119.25']);
  assert.deepEqual([bei(z, 22).f_akt, bei(z, 22).f_x, bei(z, 22).ereignis, bei(z, 22).f_uhr], ['GRIFF', '121', 'G:F>s0', 1]);
  const g = w.gegner[0];
  assert.ok(g !== undefined);
  assert.deepEqual([zuDezimalText(g.x), g.modus, g.zustand, g.gehalten_von], ['140', 'GEHALTEN', 2, 'f']);
  // im Griff keine Bewegung trotz gehaltener Richtung
  assert.equal(bei(z, 30).f_x, '121');
});

test('figur: Griffbereich je Lage und Blick des Gegners (Kampf 8.1, E14, P20)', () => {
  // vorn, schaut weg: 0 bis 14 (Figur x ≥ 146 bei Gegner 160)
  assert.equal(griffFrame(mitPuppen('x=160 z=100 blick=R'), '10,60,R\n', 60), 37);
  // hinten, schaut zur Figur: bis −24; Figur geht nur in der Tiefe
  assert.equal(griffFrame(mitPuppen('x=76 z=100 blick=R'), '10,12,O\n', 15), 11);
  assert.equal(griffFrame(mitPuppen('x=75 z=100 blick=R'), '10,12,O\n', 15), 0);
  // hinten, schaut weg: kein Griff
  assert.equal(griffFrame(mitPuppen('x=90 z=100 blick=L'), '10,12,O\n', 15), 0);
  // Tiefe |dz| ≤ 10
  assert.equal(griffFrame(mitPuppen('x=130 z=110 blick=L'), '10,12,R\n', 15), 11);
  assert.equal(griffFrame(mitPuppen('x=130 z=111 blick=L'), '10,12,R\n', 15), 0);
  // Blick links symmetrisch (E14): vorn bis 39
  const links = 'szene name=figur endframe=400 seed=1 buehne=pruefbuehne\nfigur x=300 z=100 blick=L\ngegner slot=0 typ=Puppe rolle=leicht lp=30 x=240 z=100 blick=R\n';
  const zl = laufen(weltAus(links), '10,30,L\n', 22);
  assert.deepEqual([bei(zl, 21).f_akt, bei(zl, 21).f_x, bei(zl, 22).f_akt, bei(zl, 22).f_x], ['LAUF', '280.75', 'GRIFF', '279']);
  // zwei Kandidaten: kleinstes |dx| (P20)
  const w = weltAus(mitPuppen('x=135 z=100 blick=L', 'x=125 z=105 blick=L'));
  const z = laufen(w, '10,12,R\n', 12);
  assert.equal(bei(z, 11).ereignis, 'G:F>s1');
});

test('figur: A in g−1 gibt den Schlag, A in g verfällt, Drücke ab g+1 (Kampf 8.1)', () => {
  const vorher = laufen(weltAus(mitPuppen('x=160 z=100 blick=L')), '10,20,R\n21,21,AR\n', 25);
  assert.equal(bei(vorher, 22).f_akt, 'SCHLAG');
  const im = laufen(weltAus(mitPuppen('x=160 z=100 blick=L')), '10,21,R\n22,22,A\n', 30);
  assert.deepEqual([bei(im, 22).f_akt, bei(im, 23).f_akt, bei(im, 30).f_akt], ['GRIFF', 'GRIFF', 'GRIFF']);
});

test('figur: Losreißen in g+61, Griffsperre 30 Frames (T16 Lauf b, Kampf 8.3)', () => {
  const w = weltAus(mitPuppen('x=160 z=100 blick=L'));
  const z = laufen(w, '10,21,R\n90,95,R\n120,120,R\n', 122);
  assert.deepEqual([bei(z, 82).f_akt, bei(z, 83).f_akt, bei(z, 83).ereignis], ['GRIFF', 'STAND', 'L:s0']);
  const bis83 = weltAus(mitPuppen('x=160 z=100 blick=L'));
  laufen(bis83, '10,21,R\n', 83);
  assert.deepEqual([bis83.gegner[0]?.zustand, bis83.gegner[0]?.modus, bis83.figur.griffsperre], [1, 'FREI', 30]);
  for (let f = 91; f <= 96; f++) assert.equal(bei(z, f).f_akt, 'LAUF', `Frame ${f}`);
  assert.equal(bei(z, 121).f_akt, 'GRIFF');
});

test('figur: KNIESTOSS Treffer K+5, Drücke ab K+18, gehalten ab K+23, der dritte wirft um (T16 Lauf a, Kampf 8.3, P21)', () => {
  const w = weltAus(mitPuppen('x=160 z=100 blick=L'));
  // A in 39 (K+16) verfällt, 41 (K+18) gibt den zweiten Kniestoß, 59 den dritten
  const haken: Haken = (welt) => {
    const a = welt.figur.angriff;
    if (a === null || !a.aktiv || a.code !== 'KN') return [];
    return [trefferDerFigur(welt, 's0', a.umwerfen ? 'U' : 'R')];
  };
  const z = laufen(w, '10,21,R\n23,23,A\n39,39,A\n41,41,A\n59,59,A\n', 90, haken);
  assert.deepEqual([bei(z, 24).f_akt, bei(z, 24).f_ph, bei(z, 24).angriff], ['KNIESTOSS', '1', 'KN']);
  assert.deepEqual(aktiveFrames(z, 24, 90), [28, 46, 64]);
  assert.deepEqual([bei(z, 41).f_akt, bei(z, 42).f_akt, bei(z, 42).f_ph], ['KNIESTOSS', 'KNIESTOSS', '2']);
  assert.deepEqual([bei(z, 59).f_akt, bei(z, 59).f_stopp, bei(z, 60).f_ph], ['KNIESTOSS', 0, '3']);
  // nach dem dritten: Griff zu Ende, STAND ab K+23
  assert.equal(w.figur.griff_ziel, null);
  assert.deepEqual([bei(z, 81).f_akt, bei(z, 82).f_akt], ['KNIESTOSS', 'STAND']);
  // ohne weiteren Druck: GRIFF ab K+23, Losreißen in K+61
  const ein = laufen(weltAus(mitPuppen('x=160 z=100 blick=L')), '10,21,R\n23,23,A\n', 90);
  assert.deepEqual([bei(ein, 45).f_akt, bei(ein, 46).f_akt, bei(ein, 83).f_akt, bei(ein, 84).f_akt, bei(ein, 84).ereignis], ['KNIESTOSS', 'GRIFF', 'GRIFF', 'STAND', 'L:s0']);
});

test('figur: WURF E+1 bis E+37, WU in E+1, geworfener Gegner WG E+1 bis E+58 (T6, Kampf 8.4, 8.5)', () => {
  const w = weltAus(mitPuppen('x=160 z=100 blick=L', 'x=240 z=100 blick=L'));
  const haken: Haken = (welt) => {
    const a = welt.figur.angriff;
    const r = [];
    if (a !== null && a.aktiv && a.code === 'WU') r.push(trefferDerFigur(welt, 's0', 'U'));
    const wg = welt.gegner[0]?.angriff;
    if (welt.frame === 61 && wg !== null && wg !== undefined && wg.aktiv) r.push(trefferMit(wg, 's1', 'U'));
    return r;
  };
  const wg: boolean[] = [];
  const z = laufen(w, '10,21,R\n27,27,AR\n', 90, (welt) => {
    const t = haken(welt);
    const inst = welt.gegner[0]?.angriff;
    wg[welt.frame] = inst !== null && inst !== undefined && inst.code === 'WG' && inst.aktiv;
    return t;
  });
  assert.deepEqual([bei(z, 28).f_akt, bei(z, 28).f_ph, bei(z, 28).ereignis, bei(z, 28).aktiv], ['WURF', 'V', 'WU:F>s0:V', true]);
  assert.deepEqual(aktiveFrames(z, 28, 64), [28]);
  assert.equal(w.figur.griff_ziel, null);
  const wgFrames: number[] = [];
  for (let f = 22; f <= 90; f++) if (wg[f] === true) wgFrames.push(f);
  assert.deepEqual([wgFrames[0], wgFrames.at(-1), wgFrames.length], [28, 85, 58]);
  // WG gibt keinen Trefferstopp
  assert.equal(bei(z, 61).f_stopp, 0);
  assert.deepEqual([bei(z, 64).f_akt, bei(z, 65).f_akt], ['WURF', 'STAND']);
  // WG: Fläche |dx| ≤ 52, |dz| ≤ 17 um den Geworfenen, urheber Figur, Flugrichtung als bahn_richtung
  assert.equal(w.figur.wurf_richtung, 'V');
});

test('figur: Wurfrichtung nach T(E): Blickrichtung vorwärts, sonst rückwärts; A mit L und R ist ein Kniestoß (Kampf 8.2)', () => {
  const lauf = (taste: string) => {
    const w = weltAus(mitPuppen('x=160 z=100 blick=L'));
    const z = laufen(w, `10,21,R\n27,27,${taste}\n`, 30);
    return { akt: bei(z, 28).f_akt, ph: bei(z, 28).f_ph, richtung: w.figur.bahn_richtung, wg: w.gegner[0]?.bahn_richtung };
  };
  assert.deepEqual(lauf('ARO'), { akt: 'WURF', ph: 'V', richtung: 1, wg: 1 });
  assert.deepEqual(lauf('AL'), { akt: 'WURF', ph: 'R', richtung: -1, wg: -1 });
  assert.deepEqual(lauf('AU'), { akt: 'WURF', ph: 'R', richtung: -1, wg: -1 });
  assert.equal(lauf('ALR').akt, 'KNIESTOSS');
});

test('figur: S im Griff lässt los und springt, A und S geben den Spezialangriff aus dem Griff (Kampf 8.2, 9.4)', () => {
  const s = laufen(weltAus(mitPuppen('x=160 z=100 blick=L')), '10,21,R\n30,30,S\n', 35);
  assert.deepEqual([bei(s, 31).f_akt, bei(s, 31).ereignis], ['SPRUNG', 'L:s0']);
  const w = weltAus(mitPuppen('x=160 z=100 blick=L'));
  const haken: Haken = (welt) => {
    const a = welt.figur.angriff;
    return a !== null && a.aktiv && a.code === 'SP' && welt.frame === 38 ? [trefferDerFigur(welt, 's0', 'U')] : [];
  };
  // E = 30: Treffer in Stufe 1 (E+8), Kosten in E+16, Drücke ab E+58
  const z = laufen(w, '10,21,R\n30,30,AS\n', 90, haken);
  assert.deepEqual([bei(z, 31).f_akt, bei(z, 37).aktiv, bei(z, 38).aktiv, bei(z, 38).f_stopp], ['SPEZIAL', false, true, 7]);
  assert.equal(w.figur.griff_ziel, null);
  assert.deepEqual([bei(z, 45).f_lp, bei(z, 46).f_lp, bei(z, 46).ereignis], [72, 63, 'K:F:9']);
  assert.deepEqual([bei(z, 87).f_akt, bei(z, 88).f_akt, bei(z, 88).f_schutz], ['SPEZIAL', 'STAND', 20]);
});
