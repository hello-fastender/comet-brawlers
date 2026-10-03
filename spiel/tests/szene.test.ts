import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSzene } from '../src/pruef/szene.ts';
import { lies } from './hilfe.ts';

test('szene: Prüfbühne mit Puppe (Kampf 11.2)', () => {
  const s = parseSzene(lies('tests/szenen/beispiel_puppe.txt'));
  assert.deepEqual([s.name, s.endframe, s.seed, s.buehne], ['beispiel_puppe', 140, 1, 'pruefbuehne']);
  assert.equal(s.rang, 9);
  assert.equal(s.rang_fest, true);
  assert.deepEqual(s.figur, { x: 100, z: 100, blick: 1, lp: 72 });
  assert.equal(s.gegner.length, 1);
  const g = s.gegner[0];
  assert.ok(g !== undefined);
  assert.deepEqual(
    [g.slot, g.typ, g.rolle, g.x, g.z, g.blick, g.lp, g.lp_max, g.vorplatziert, g.logik, g.erlaubnis, g.erscheint],
    [0, 'Puppe', 'leicht', 146, 100, null, 16, null, true, false, true, 0],
  );
  assert.deepEqual(s.eingriffe, [{ frame: 43, ziel: 's0', feld: 'x', wert: '200' }]);
  assert.deepEqual(s.pruefangriffe, [{ slot: 0, von: 19, bis: 23, schaden: 5, umwerfen: false }]);
});

test('szene: Bühne scheibe mit Prüfstart (Welt 11.3)', () => {
  const s = parseSzene(lies('tests/szenen/beispiel_scheibe.txt'));
  assert.deepEqual([s.name, s.endframe, s.seed, s.buehne], ['beispiel_scheibe', 120, 12345, 'scheibe']);
  assert.deepEqual(s.wellen_aus, [1, 2, 9]);
  assert.equal(s.welle7_nur_boss, true);
  assert.equal(s.rang_fest, true);
  assert.deepEqual([s.kamera_x, s.kamera_modus], [1792, 'ARENA']);
  assert.deepEqual([s.boss_angriffe, s.boss_bewegung, s.boss_lp], [false, false, null]);
  assert.deepEqual(s.fest, { gehstufe: 'normal' });
  assert.deepEqual(s.behaelter_zusatz, [{ id: 'F9', art: 'Fass', x: 2150, z: 60, inhalt: 'Raketenwerfer' }]);
  assert.deepEqual(s.figur, { x: 2000, z: 50, blick: 1 });
  assert.deepEqual(
    s.gegner.map((g) => [g.slot, g.typ, g.logik, g.blick, g.erscheint, g.vorplatziert]),
    [
      [0, 'Ballast', true, -1, 0, false],
      [1, 'Bolzer', false, null, 0, false],
      [2, 'Bolzer', true, null, 60, false],
    ],
  );
  assert.deepEqual(s.eingriffe, [{ frame: 90, ziel: 'welle.9', feld: 'jetzt', wert: 'ja' }]);
});

test('szene: alle Schlüssel des Prüfstarts aus Welt 11.3', () => {
  const s = parseSzene(`
szene name=probe endframe=10
pruefstart rang=12 rang.fest=nein kamera.x=300 kamera.modus=FREI welle.1=aus welle.9=aus
pruefstart welle.9=an
pruefstart sperre.S1=aus halt.H1=aus behaelter.F1=aus gegner.s2.erlaubnis=aus gegner.s3.erlaubnis=aus
pruefstart boss.angriffe=aus boss.bewegung=an boss.lp=30 fest.angriff=BA fest.zielpunkt=128 figur.z=206
objekt slot=20 typ=Gegenstand art=Kometenbraten x=120 z=100
objekt slot=21 typ=Behälter art=fass x=250 z=158 inhalt=Raketenwerfer id=F9
gegner slot=1 typ=Zuender x=300 z=100 lp=19 rolle=fern blick=links erlaubnis=aus
`);
  assert.deepEqual([s.seed, s.buehne, s.rang, s.rang_fest, s.kamera_x, s.kamera_modus], [1, 'pruefbuehne', 12, false, 300, 'FREI']);
  assert.deepEqual(s.wellen_aus, [1]);
  assert.deepEqual([s.sperren_aus, s.halte_aus, s.behaelter_aus, s.erlaubnis_aus], [['S1'], ['H1'], ['F1'], [2, 3]]);
  assert.deepEqual([s.boss_angriffe, s.boss_bewegung, s.boss_lp], [false, true, 30]);
  assert.deepEqual(s.fest, { angriff: 'BA', zielpunkt: '128' });
  assert.equal(s.figur.z, 206);
  assert.deepEqual(
    s.objekte.map((o) => [o.slot, o.typ, o.art, o.x, o.z, o.inhalt, o.id]),
    [
      [20, 'Gegenstand', 'Kometenbraten', 120, 100, '', 'o20'],
      [21, 'Behälter', 'Fass', 250, 158, 'Raketenwerfer', 'F9'],
    ],
  );
  assert.deepEqual([s.gegner[0]?.typ, s.gegner[0]?.rolle, s.gegner[0]?.blick, s.gegner[0]?.erlaubnis], ['Zünder', 'fern', -1, false]);
});

test('szene: Fehler werden mit Zeile gemeldet', () => {
  assert.throws(() => parseSzene('figur x=1'), /ohne Satz szene/);
  assert.throws(() => parseSzene('szene name=a endframe=1 seed=0'), /seed 0/);
  assert.throws(() => parseSzene('szene name=a endframe=1\npruefstart wetter=gut'), /Zeile 2.*unbekannter Schlüssel/);
  assert.throws(() => parseSzene('szene name=a endframe=1\nwolke x=1'), /unbekannte Satzart/);
  assert.throws(() => parseSzene('szene name=a endframe=1\ngegner slot=20 typ=Bolzer x=1 z=1'), /slot 20/);
  assert.throws(() => parseSzene('szene name=a endframe=1\ngegner slot=1 typ=Bolzer x=1 z=1 farbe=rot'), /unbekanntes Feld/);
  assert.throws(() => parseSzene('szene name=a endframe=1\npruefstart welle.2=nur_boss'), /nur_boss/);
});
