// Tests K1: Schaden, Schutz, Umgeworfen werden, Tod und Neueinstieg der Figur
// (Kampf 6, 4.3) sowie Waffen und Gegenstände (Kampf 10), Frame-Erwartungen
// aus mechanik.md „Unverwundbarkeit“, „Umgeworfen werden“, „Tod und
// Neueinstieg der Figur“, „Gegenstände und Waffen“ und Kampf 12 (T7, T9,
// T19, T20). Gegnertreffer werden in KS7 eingespeist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Haken } from './figur_hilfe.ts';
import { STANDARD, bei, laufen, schritt, trefferAufFigur, weltAus } from './figur_hilfe.ts';
import { csv, lauf, zelle } from './hilfe.ts';
import { zuDezimalText } from '../src/kern/festkomma.ts';

function szene(figur: string, ...rest: string[]): string {
  return STANDARD.replace('figur x=100 z=100 blick=R', figur) + rest.map((r) => r + '\n').join('');
}

/** Gegnertreffer aus slot in den Frames (Schaden, Umwerfen). */
function gegnerTrifft(frames: readonly number[], schaden: number, umwerfen: boolean, slot: `s${number}` = 's0'): Haken {
  return (w) => (frames.includes(w.frame) ? [trefferAufFigur(slot, schaden, umwerfen, w.frame)] : []);
}

test('figur: GETROFFEN H bis H+26, schutz 27, wirkungslos bis H+26, H+27 wirksam (T7, Kampf 6.3, P3)', () => {
  const w = weltAus(szene('figur x=300 z=100 blick=R', 'gegner slot=0 typ=Puppe rolle=leicht x=346 z=100 lp=16'));
  const frames = Array.from({ length: 28 }, (_, i) => 19 + i); // 19 bis 46
  const z = laufen(w, '', 47, gegnerTrifft(frames, 5, false));
  assert.deepEqual([bei(z, 19).f_lp, bei(z, 19).f_akt, bei(z, 19).f_zst, bei(z, 19).f_schutz, bei(z, 19).ereignis], [67, 'GETROFFEN', 3, 27, 'T:s0>F:PA:5:R']);
  for (let f = 20; f <= 45; f++) assert.deepEqual([bei(z, f).f_lp, bei(z, f).ereignis], [67, 'T:s0>F:PA:5:W'], `Frame ${f}`);
  assert.deepEqual([bei(z, 45).f_schutz, bei(z, 45).f_akt], [1, 'GETROFFEN']);
  assert.deepEqual([bei(z, 46).f_lp, bei(z, 46).f_schutz, bei(z, 46).f_akt], [62, 27, 'GETROFFEN']);
  // ohne zweiten Treffer: STAND in H+27
  const ein = laufen(weltAus(szene('figur x=300 z=100 blick=R', 'gegner slot=0 typ=Puppe rolle=leicht x=346 z=100 lp=16')), '', 47, gegnerTrifft([19], 5, false));
  assert.deepEqual([bei(ein, 45).f_akt, bei(ein, 46).f_akt, bei(ein, 46).f_zst], ['GETROFFEN', 'STAND', 1]);
});

test('figur: in GETROFFEN gibt nur A und S ab H+8 den Spezialangriff, frühere Drücke verfallen (Kampf 4.3, 9.4)', () => {
  const lauf = (eingabe: string) => laufen(weltAus(), eingabe, 40, gegnerTrifft([19], 5, false));
  const frueh = lauf('26,26,AS\n');
  assert.equal(bei(frueh, 27).f_akt, 'GETROFFEN');
  const ab8 = lauf('27,27,AS\n');
  assert.deepEqual([bei(ab8, 28).f_akt, bei(ab8, 28).f_zst], ['SPEZIAL', 3]);
  const schlag = lauf('30,30,A\n');
  assert.equal(bei(schlag, 31).f_akt, 'GETROFFEN');
});

test('figur: UMGEWORFEN, Bahn F1 vom Angreifer weg, LIEGEN ab H+54, STAND in H+121 mit schutz 35 (T7, Kampf 4.3, 5.7)', () => {
  const w = weltAus(szene('figur x=300 z=100 blick=R', 'gegner slot=0 typ=Puppe rolle=leicht x=346 z=100 lp=16'));
  const z = laufen(w, '', 260, gegnerTrifft([100], 5, true));
  assert.deepEqual([bei(z, 100).f_lp, bei(z, 100).f_akt, bei(z, 100).f_zst, bei(z, 100).ereignis], [67, 'UMGEWORFEN', 2, 'T:s0>F:PA:5:U']);
  for (let f = 101; f <= 108; f++) assert.equal(bei(z, f).f_x, '300');
  assert.deepEqual([bei(z, 109).f_x, bei(z, 109).f_ph], ['297.125', 'F']);
  assert.deepEqual([bei(z, 145).f_h === '0', bei(z, 146).f_h, bei(z, 146).f_x, bei(z, 146).f_ph], [false, '0', String(300 - 109.25), 'B']);
  assert.deepEqual([bei(z, 153).f_akt, bei(z, 154).f_akt, bei(z, 155).f_x, bei(z, 156).f_x], ['UMGEWORFEN', 'LIEGEN', '164.875', '164.875']);
  assert.deepEqual([bei(z, 194).f_akt, bei(z, 195).f_akt, bei(z, 220).f_akt], ['LIEGEN', 'AUFSTEHEN', 'AUFSTEHEN']);
  assert.deepEqual([bei(z, 221).f_akt, bei(z, 221).f_zst, bei(z, 221).f_schutz], ['STAND', 3, 35]);
  assert.deepEqual([bei(z, 255).f_zst, bei(z, 256).f_zst], [3, 1]);
});

test('figur: Liegen verkürzen, sechs Drücke ab H+54 (Kampf 4.3: U = H+88, H+93, H+103, H+121)', () => {
  const u = (abstand: number): number => {
    let eingabe = '';
    for (let q = 154; q <= 230; q += abstand) eingabe += `${q},${q},${q % 2 === 0 ? 'A' : 'S'}\n`;
    const z = laufen(weltAus(), eingabe, 230, gegnerTrifft([100], 5, true));
    for (let f = 150; f <= 230; f++) if (bei(z, f).f_akt === 'STAND') return f - 100;
    return 0;
  };
  // Druck in jedem Frame: A und S abwechselnd, damit jeder Frame einen neuen Druck hat
  assert.equal(u(1), 88);
  assert.equal(u(2), 93);
  assert.equal(u(4), 103);
  assert.equal(u(8), 121);
  // T7 Lauf b: A in 154, 156, …, 164 → U = H+93
  const b = laufen(weltAus(), '154,154,A\n156,156,A\n158,158,A\n160,160,A\n162,162,A\n164,164,A\n', 200, gegnerTrifft([100], 5, true));
  assert.deepEqual([bei(b, 166).f_akt, bei(b, 167).f_akt, bei(b, 192).f_akt, bei(b, 193).f_akt, bei(b, 193).f_schutz], ['LIEGEN', 'AUFSTEHEN', 'AUFSTEHEN', 'STAND', 35]);
});

test('figur: jeder wirksame Treffer in der Luft wirft um, F1 ab der aktuellen Höhe (Kampf 6.2, K11, P15)', () => {
  const z = laufen(weltAus(), '10,10,S\n', 80, gegnerTrifft([20], 5, false));
  assert.deepEqual([bei(z, 20).f_akt, bei(z, 20).f_lp], ['UMGEWORFEN', 67]);
  const h = bei(z, 20).f_h;
  assert.notEqual(h, '0');
  for (let f = 21; f <= 28; f++) assert.equal(bei(z, f).f_h, h);
  assert.equal(Number(bei(z, 29).f_h), Number(h) + 5);
  assert.equal(bei(z, 74).f_akt, 'LIEGEN');
});

test('figur: TOT bei LP < 0, Bahn F4, N = t+120 mit LP 72, Erscheinen in N+1, Landung LN = N+53 (Kampf 6.5, E16, K7)', () => {
  const w = weltAus(szene('figur x=100 z=100 blick=R lp=5', 'gegner slot=0 typ=Puppe rolle=leicht x=54 z=100 lp=16'));
  const z = laufen(w, '', 400, gegnerTrifft([20], 10, false));
  assert.deepEqual([bei(z, 20).f_lp, bei(z, 20).f_akt, bei(z, 20).f_zst, bei(z, 20).ereignis], [-5, 'TOT', 2, 'T:s0>F:PA:10:X']);
  assert.deepEqual([w.figur.tod_t, w.figur.neueinstieg_n], [20, 140]);
  for (let f = 21; f <= 22; f++) assert.equal(bei(z, f).f_x, '100');
  // Flug vom Angreifer (x 54) weg nach rechts
  assert.equal(bei(z, 23).f_x, '102.875');
  assert.deepEqual([bei(z, 59).f_h === '0', bei(z, 60).f_h, bei(z, 69).f_x, bei(z, 69).f_ph, bei(z, 70).f_ph], [false, '0', '235.125', 'B', 'R']);
  assert.deepEqual([bei(z, 139).f_lp, bei(z, 140).f_lp, bei(z, 140).f_akt], [-5, 72, 'TOT']);
  // Erscheinen bei Kamera-x + 64, Kamera-y + 48 (Prüfbühne: 0, 0), Höhe 256, Blick rechts, schutz 200
  const n1 = bei(z, 141);
  assert.deepEqual([n1.f_akt, n1.f_x, n1.f_z, n1.f_h, n1.f_blick, n1.f_schutz, n1.f_zst], ['NEUEINSTIEG', '64', '48', '256', 'R', 200, 3]);
  assert.deepEqual([bei(z, 192).f_h, bei(z, 192).f_schutz, bei(z, 193).f_h, bei(z, 193).f_schutz], ['1', 200, '0', 200]);
  // Landung trifft alle Gegner im Bild (Instanz LN, nur in LN aktiv)
  assert.deepEqual([bei(z, 193).angriff, bei(z, 193).aktiv, bei(z, 194).angriff], ['LN', true, '']);
  const ln = w.figur.landung_ln;
  assert.equal(ln, 193);
  assert.deepEqual([bei(z, 194).f_schutz, bei(z, 198).f_akt, bei(z, 199).f_akt], [199, 'NEUEINSTIEG', 'STAND']);
  // Schutz N+1 bis LN+199 (252 Frames), verwundbar ab LN+200
  assert.deepEqual([bei(z, 392).f_schutz, bei(z, 392).f_zst, bei(z, 393).f_schutz, bei(z, 393).f_zst], [1, 3, 0, 1]);
  let geschuetzt = 0;
  for (let f = 141; f <= 400; f++) if (bei(z, f).f_zst === 3) geschuetzt += 1;
  assert.equal(geschuetzt, 252);
});

test('figur: nach der Landung S in LN bis LN+4 neuer Sprung, auch bei steuerung 0; Bewegung ab LN+7 (Kampf 4.3, Welt 11.4)', () => {
  const w = weltAus(szene('figur x=100 z=100 blick=R lp=0'));
  laufen(w, '', 192, gegnerTrifft([20], 1, false));
  w.rahmen.steuerung = 0;
  const s = schritt(w, 0);
  assert.deepEqual([s.frame, s.f_h], [193, '0']);
  for (let f = 194; f <= 196; f++) schritt(w, 0);
  schritt(w, 32); // S in LN+4 = 197
  const sprung = schritt(w, 0);
  assert.deepEqual([sprung.frame, sprung.f_akt], [198, 'SPRUNG']);
  // S in LN+5 verfällt; Richtung ab LN+6 bewegt ab LN+7
  const v = weltAus(szene('figur x=100 z=100 blick=R lp=0'));
  const z = laufen(v, '198,198,S\n199,205,R\n', 205, gegnerTrifft([20], 1, false));
  assert.deepEqual([bei(z, 199).f_akt, bei(z, 199).f_x, bei(z, 200).f_akt, bei(z, 200).f_x], ['STAND', '64', 'LAUF', '65.75']);
});

test('figur: Tod durch Eingriff LP < 0 (Kampf 11.2, Formate: LP < 0 ≤ lp_vor)', () => {
  const r = lauf(STANDARD + 'eingriff frame=20 ziel=f feld=lp wert=-1\n', '');
  const t = csv(r.protokoll);
  const z = t.zeilen[19];
  assert.ok(z !== undefined);
  assert.deepEqual([zelle(t, z, 'f_akt'), zelle(t, z, 'f_zst')], ['TOT', '2']);
  assert.equal(r.welt.figur.neueinstieg_n, 140);
});

test('figur: wirksamer Treffer beendet den Griff (P16), Waffe fällt in H+1 (T20 Lauf a, Kampf 10.4, P27)', () => {
  const w = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=2', 'gegner slot=0 typ=Puppe rolle=leicht x=160 z=100 lp=16 blick=L'));
  const z = laufen(w, '10,21,R\n60,60,A\n', 70, gegnerTrifft([30], 5, false));
  assert.equal(bei(z, 22).f_akt, 'GRIFF');
  assert.deepEqual([bei(z, 30).f_akt, bei(z, 30).ereignis, bei(z, 30).f_waffe], ['GETROFFEN', 'T:s0>F:PA:5:R;L:s0', 'RW']);
  const bis30 = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=2', 'gegner slot=0 typ=Puppe rolle=leicht x=160 z=100 lp=16 blick=L'));
  laufen(bis30, '10,21,R\n', 30, gegnerTrifft([30], 5, false));
  assert.deepEqual([bis30.gegner[0]?.zustand, bis30.gegner[0]?.gehalten_von, bis30.figur.griff_ziel, bis30.figur.griffsperre], [1, null, null, 30]);
  assert.deepEqual([bei(z, 31).f_waffe, bei(z, 31).f_mun, bei(z, 31).ereignis], ['', 0, 'WA:F:Raketenwerfer:2']);
  const o = w.objekte[0];
  assert.ok(o !== undefined);
  // GETROFFEN bis H+26, in 60 aufgenommen: Slot frei, Waffe in der Hand
  assert.deepEqual([bei(z, 56).f_akt, bei(z, 57).f_akt], ['GETROFFEN', 'STAND']);
  assert.deepEqual([bei(z, 61).f_akt, bei(z, 61).f_waffe, bei(z, 61).f_mun, bei(z, 61).ereignis, o.belegt], ['AUFNEHMEN', 'RW', 2, 'AU:F>o20:Raketenwerfer', false]);
  assert.deepEqual([bei(z, 67).f_akt, bei(z, 68).f_akt], ['AUFNEHMEN', 'STAND']);
  // Lage der fallen gelassenen Waffe: am Ort der Figur, Höhe 0, L = H+1, aufnehmbar
  const v = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=2'));
  laufen(v, '', 21, gegnerTrifft([20], 5, false));
  const g = v.objekte[0];
  assert.ok(g !== undefined);
  assert.deepEqual([g.typ, g.art, zuDezimalText(g.x), g.h, g.munition, g.landung_l, g.liegezeit, g.aufnehmbar], ['Gegenstand', 'Raketenwerfer', '100', 0, 2, 21, 0, true]);
});

test('figur: AUFNEHMEN und Essen (T20 Lauf b, Kampf 10.1, 10.2): Wirkung in P+1, Bereich vorn/hinten, 72 LP gibt Punkte', () => {
  const w = weltAus(szene('figur x=100 z=100 blick=R lp=40', 'objekt slot=20 typ=Gegenstand art=Kometenbraten x=120 z=100'));
  const z = laufen(w, '10,10,A\n', 20);
  assert.deepEqual([bei(z, 11).f_lp, bei(z, 11).f_akt, bei(z, 11).ereignis, w.objekte[0]?.belegt], [72, 'AUFNEHMEN', 'AU:F>o20:Kometenbraten', false]);
  assert.deepEqual([bei(z, 17).f_akt, bei(z, 18).f_akt], ['AUFNEHMEN', 'STAND']);
  // außerhalb des Bereichs (vorn 29) gibt A den Schlag
  const weit = laufen(weltAus(szene('figur x=100 z=100 blick=R lp=40', 'objekt slot=20 typ=Gegenstand art=Kometenbraten x=130 z=100')), '10,10,A\n', 12);
  assert.equal(bei(weit, 11).f_akt, 'SCHLAG');
  // hinten 29 bei Essen (P26), |dz| ≤ 12
  const hinten = laufen(weltAus(szene('figur x=100 z=100 blick=R lp=40', 'objekt slot=20 typ=Gegenstand art=Eisnudelschale x=71 z=112')), '10,10,A\n', 12);
  assert.deepEqual([bei(hinten, 11).f_akt, bei(hinten, 11).f_lp], ['AUFNEHMEN', 72]);
  // bei 72 LP: 100 Punkte statt der Heilung
  const voll = weltAus(szene('figur x=100 z=100 blick=R', 'objekt slot=20 typ=Gegenstand art=Sternbeeren x=110 z=100'));
  laufen(voll, '10,10,A\n', 12);
  assert.deepEqual([voll.figur.lp, voll.rahmen.punkte], [72, 100]);
});

test('figur: WAFFE P+1 bis P+17, Rakete in P+7, Einschlag P+28, Explosion bis P+42 (T19, Kampf 10.3)', () => {
  const w = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=3'));
  const z = laufen(w, '10,10,A\n', 60);
  for (let f = 11; f <= 27; f++) assert.equal(bei(z, f).f_akt, 'WAFFE');
  assert.equal(bei(z, 28).f_akt, 'STAND');
  assert.deepEqual([bei(z, 16).f_mun, bei(z, 17).f_mun, bei(z, 17).ereignis], [3, 2, 'AB:g0']);
  assert.equal(bei(z, 38).ereignis, 'EX:g0');
  // Lage der Rakete: in 17 bei 158 / 50, Einschlag bei 263
  const v = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=3'));
  laufen(v, '10,10,A\n', 17);
  const g = v.geschosse[0];
  assert.ok(g !== undefined);
  assert.deepEqual([g.typ, zuDezimalText(g.x), zuDezimalText(g.h), g.flugphase, g.angriff], ['Rakete', '158', '50', 'FLUG', null]);
  laufen(v, '', 38);
  assert.deepEqual([zuDezimalText(g.x), g.flugphase, g.angriff?.code, g.angriff?.aktiv, g.angriff?.urheber], ['263', 'EXPLOSION', 'RX', true, 'f']);
  assert.deepEqual(g.angriff?.flaeche, { art: 'punkt', x: 263, z: 100, richtung: 1, vorn: 90, hinten: 66, tiefe: 28, ziel_blick_versatz: 0, hoehe_ziel_max: null });
  laufen(v, '', 52);
  assert.deepEqual([g.belegt, g.angriff?.aktiv], [true, true]);
  laufen(v, '', 53);
  assert.equal(g.belegt, false);
});

test('figur: Rakete schlägt an der Wand und am Behälter früher ein; leere Waffe in P+18 weggeworfen (Kampf 10.3)', () => {
  // Blick links bei x 60: Abschuss bei x 2, der nächste Schritt verließe das Band (x < 0)
  const wand = weltAus(szene('figur x=60 z=100 blick=L waffe=RW munition=3'));
  const zw = laufen(wand, '10,10,A\n', 18);
  assert.equal(bei(zw, 18).ereignis, 'EX:g0');
  assert.equal(wand.geschosse[0]?.einschlag_x, 2);
  // Behälter bei x 200: Grundfläche x ± 12
  const fass = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=3', 'objekt slot=20 typ=Behälter art=Fass x=200 z=100'));
  laufen(fass, '10,10,A\n', 30);
  assert.deepEqual([fass.geschosse[0]?.flugphase, fass.geschosse[0]?.einschlag_x], ['EXPLOSION', 183]);
  // dritter Schuss: Waffe in P+18 weggeworfen, nicht aufnehmbar, 61 Frames
  const leer = weltAus(szene('figur x=100 z=100 blick=R waffe=RW munition=1'));
  const zl = laufen(leer, '10,10,A\n30,30,A\n', 32);
  assert.deepEqual([bei(zl, 28).f_akt, bei(zl, 28).f_waffe, bei(zl, 28).ereignis], ['STAND', '', 'WA:F:Raketenwerfer:0']);
  const o = leer.objekte[0];
  assert.deepEqual([o?.typ, o?.aufnehmbar, o?.lebensdauer], ['Waffe', false, 61]);
  assert.equal(bei(zl, 31).f_akt, 'SCHLAG');
});
