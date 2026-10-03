import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ausDezimal, ausGanz } from '../src/kern/festkomma.ts';
import {
  bandGrenzen,
  begehbar,
  behaelterHindernis,
  inHindernis,
  kameraY,
  parseStage,
  satzZeilen,
  schrittBegrenzt,
} from '../src/kern/stage.ts';
import { stageText } from './hilfe.ts';

test('stage: Prüfbühne nach Kampf 11.2', () => {
  const s = parseStage(stageText('pruefbuehne'));
  assert.equal(s.id, 'pruefbuehne');
  assert.equal(s.x_ende, 4000);
  assert.equal(s.kamera_fest, true);
  assert.equal(s.raender, false);
  assert.deepEqual([s.start_x, s.start_z, s.start_blick], [100, 100, 1]);
  assert.deepEqual(bandGrenzen(s, 0), { unten: 10, oben: 197 });
  assert.deepEqual(bandGrenzen(s, 3999), { unten: 10, oben: 197 });
  assert.equal(bandGrenzen(s, 4000), null);
  assert.equal(kameraY(s, 0), 0);
  assert.equal(s.wellen.length, 0);
  assert.equal(s.gegner.length, 0);
});

test('stage: Scheibe nach Welt 2.3 und 4.7', () => {
  const s = parseStage(stageText('scheibe'));
  assert.deepEqual([s.id, s.x_ende, s.kamera_x_max, s.start_x, s.start_z, s.start_blick], ['scheibe', 2304, 1920, 64, 170, 1]);
  assert.equal(s.baender.length, 3);
  assert.deepEqual(bandGrenzen(s, 0), { unten: 138, oben: 213 });
  assert.deepEqual(bandGrenzen(s, 399), { unten: 138, oben: 213 });
  assert.deepEqual(bandGrenzen(s, 400), { unten: 138, oben: 229 });
  assert.deepEqual(bandGrenzen(s, 849), { unten: 138, oben: 229 });
  assert.equal(bandGrenzen(s, 850), null);
  assert.equal(bandGrenzen(s, 1699), null);
  assert.deepEqual(bandGrenzen(s, 1700), { unten: 10, oben: 101 });
  assert.deepEqual(bandGrenzen(s, 2303), { unten: 10, oben: 101 });
  assert.equal(kameraY(s, 0), 128);
  assert.equal(kameraY(s, 466), 128);
  assert.equal(kameraY(s, 1000), 128); // zwischen zwei Sätzen: Wert des vorigen
  assert.equal(kameraY(s, 1792), 0);
  assert.equal(kameraY(s, 1920), 0);
  assert.deepEqual(
    s.behaelter.map((b) => [b.id, b.art, b.x, b.z, b.inhalt]),
    [
      ['F1', 'Fass', 560, 158, 'Kometenbraten'],
      ['B1', 'Bosskiste', 2040, 95, 'Raketenwerfer'],
      ['B2', 'Bosskiste', 2080, 95, 'Raketenwerfer'],
      ['B3', 'Bosskiste', 2120, 95, 'leer'],
    ],
  );
  assert.deepEqual(
    s.gegner.map((g) => [g.typ, g.x, g.z, g.auftritt, g.welle, g.werte]),
    [
      ['Ballast', 2080, 80, 'boss', 7, 'start'],
      ['Bolzer', 368, 206, 'versteck', 1, 'start'],
      ['Bolzer', 633, 168, 'hocke', 2, 'start'],
      ['Rammbock', 663, 208, 'hocke', 2, 'start'],
    ],
  );
  assert.deepEqual(
    s.wellen.map((w) => [w.nr, w.ausloeser, w.wert]),
    [
      [1, 'figur_abstand', 150],
      [2, 'kamera', 250],
      [7, 'arena', 0],
      [9, 'boss_lp', 25],
    ],
  );
  assert.deepEqual(
    s.eintraege.map((e) => [e.welle, e.typ, e.auftritt, e.z]),
    [
      [7, 'Bolzer', 'rand_links', 30],
      [7, 'Bolzer', 'rand_links', 80],
      [9, 'Zünder', 'rand_links', 55],
    ],
  );
  assert.deepEqual(s.sperren, [{ id: 'S1', kamera_x: 400, welle: 2 }]);
  assert.deepEqual(s.halte, [{ id: 'H1', kamera_x: 440, max_lebende: 0 }]);
  assert.deepEqual(s.schnitte, [{ kamera_x: 466, figur_x: 826, ziel_kamera_x: 1792, ziel_x: 1900, ziel_z: 55 }]);
  assert.deepEqual(s.arena, { k0: 1792, k1: 1920, totzone_links: 128, totzone_rechts: 256 });
  assert.equal(s.vordergrund.length, 2);
  assert.equal(s.hintergrund.length, 3);
});

test('stage: lineare Bandgrenzen und Kamera-y nach Welt 2.4, abgerundet', () => {
  const s = parseStage(`
stage id=probe x_ende=2304 kamera_x_max=1920 start_x=64 start_z=170
band x0=800 x1=1312 unten0=138 unten1=10 oben0=229 oben1=197
kamera_y k0=600 k1=1112 y0=128 y1=0
`);
  assert.equal(bandGrenzen(s, 800)?.unten, 138);
  assert.equal(bandGrenzen(s, 801)?.unten, 137); // 138 − 0,25 abgerundet
  assert.equal(bandGrenzen(s, 804)?.unten, 137);
  assert.equal(bandGrenzen(s, 805)?.unten, 136);
  assert.equal(bandGrenzen(s, 1311)?.unten, 10);
  assert.equal(bandGrenzen(s, 816)?.oben, 228);
  assert.equal(kameraY(s, 500), 128); // vor dem ersten Satz: dessen y0
  assert.equal(kameraY(s, 600), 128);
  assert.equal(kameraY(s, 604), 127);
  assert.equal(kameraY(s, 1112), 0);
  assert.equal(kameraY(s, 1500), 0);
});

test('stage: Hindernisse (Welt 2.2), Tresen aus Welt 2.4', () => {
  const s = parseStage(`
stage id=probe x_ende=2304 kamera_x_max=1920 start_x=64 start_z=50
band x0=1550 x1=1850 unten0=10 unten1=10 oben0=101 oben1=101
hindernis id=tresen punkte=1600:101;1640:58;1780:50;1820:101 hoehe=32
`);
  const t = s.hindernisse[0];
  assert.ok(t !== undefined);
  assert.equal(inHindernis(t, 1700, 80), true);
  assert.equal(inHindernis(t, 1700, 40), false);
  assert.equal(inHindernis(t, 1640, 58), true); // Rand zählt als innen
  assert.equal(begehbar(s, 1700, 80, 0), false);
  assert.equal(begehbar(s, 1700, 80, 40), true); // in der Luft nur unterhalb der Höhe
  assert.equal(begehbar(s, 1700, 40, 0), true);
  assert.equal(begehbar(s, 1700, 102, 0), false); // über dem Band
  const fass = behaelterHindernis('F1', 560, 158);
  assert.equal(inHindernis(fass, 548, 152), true);
  assert.equal(inHindernis(fass, 547, 158), false);
});

test('stage: Schritt mit Begrenzung (Welt 2.2 Punkt 2 und 4)', () => {
  const s = parseStage(stageText('scheibe'));
  const frei = { stage: s, zusatz: [], x_min: null, x_max: null };
  // Wand K + 24 (Welt-Test T1: 221 f_x 99, 222 f_x 98)
  const wand = { ...frei, x_min: ausGanz(98), x_max: ausGanz(434) };
  assert.equal(schrittBegrenzt(wand, ausGanz(99), ausGanz(170), 0, ausDezimal(-1.75), 0).x, ausGanz(98));
  assert.equal(schrittBegrenzt(wand, ausGanz(98), ausGanz(170), 0, ausDezimal(-1.75), 0).x, ausGanz(98));
  // Untergrenze des Bandes: endet an der Kante 138
  const unten = schrittBegrenzt(frei, ausGanz(100), ausDezimal(139.5), 0, 0, ausDezimal(-1.75));
  assert.equal(unten.z, ausGanz(138));
  assert.equal(unten.blockiert_z, true);
  // Obergrenze: ⌊z⌋ ≤ 213 erlaubt 213,5; darüber bleibt z stehen
  assert.equal(schrittBegrenzt(frei, ausGanz(100), ausDezimal(212.5), 0, 0, ausGanz(1)).z, ausDezimal(213.5));
  assert.equal(schrittBegrenzt(frei, ausGanz(100), ausDezimal(213.5), 0, 0, ausGanz(1)).z, ausDezimal(213.5));
  // Erst x, dann z: x blockiert, z läuft weiter
  const ecke = schrittBegrenzt(frei, ausGanz(849), ausGanz(170), 0, ausDezimal(1.75), ausGanz(1));
  assert.equal(ecke.x, ausGanz(849));
  assert.equal(ecke.z, ausGanz(171));
  // Behälter als Hindernis (Welt 2.2 Punkt 6)
  const mitFass = { ...frei, zusatz: [behaelterHindernis('F1', 560, 158)] };
  assert.equal(schrittBegrenzt(mitFass, ausDezimal(547.75), ausGanz(158), 0, ausDezimal(1.75), 0).x, ausDezimal(547.75));
  assert.equal(schrittBegrenzt(mitFass, ausGanz(546), ausGanz(158), 0, ausDezimal(1.75), 0).x, ausDezimal(547.75));
});

test('stage: Satzformat und Fehler', () => {
  const z = satzZeilen('# Kommentar\n\nband x0=1 x1=2   # Rest\nstage id=a rang.fest\n');
  assert.equal(z.length, 2);
  assert.deepEqual(z[0]?.felder, [['x0', '1'], ['x1', '2']]);
  assert.deepEqual(z[1]?.felder, [['id', 'a'], ['rang.fest', 'ja']]);
  assert.throws(() => satzZeilen('band x0=1 x0=2'), SyntaxError);
  assert.throws(() => parseStage('band x0=0 x1=10 unten0=1 unten1=1 oben0=2 oben1=2'), /ohne Satz stage/);
  assert.throws(() => parseStage('stage id=a x_ende=1 kamera_x_max=0 start_x=0 start_z=0\nwand x=1'), /unbekannte Satzart/);
  assert.throws(() => parseStage('stage id=a x_ende=1 kamera_x_max=0 start_x=0 start_z=0 farbe=rot'), /unbekanntes Feld/);
  assert.throws(() => parseStage('stage id=a x_ende=1 kamera_x_max=0 start_x=0 start_z=0\ngegner typ=Drache x=1 z=1 auftritt=hocke'), /typ unbekannt/);
});
