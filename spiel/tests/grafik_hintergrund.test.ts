// Tests der Hintergründe (Auftrag 4, Phase 2, G5; docs/grafik.md 4.8): Erzeugnisse und
// Befunde, Farbbudget 48 je Abschnitt, nur Farben der Hintergrundtreppen, kein Bodenton in
// einer Figurenpalette, Lagen nach scheibe.txt (Abschnitte, Bandkanten, Kamera-y,
// Hintergrund- und Vordergrundsätze), Tiefenfugen alle 16 px, Bild bei jeder Kamera-x
// lückenlos gedeckt, Atlas (Kacheln, JSON, Zusammensetzen gleich der Zeichnung),
// Blendenkante, Determinismus und Stand der Ausgabe in spiel/grafik/ausgabe/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import { Leinwand, deckend } from '../grafik/quelle/leinwand.ts';
import { BLENDE_DUNKEL, EISBETON, FARBBUDGET, GUSSPLATTE, KAMMER_STAHL } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import { hintergrundAbschnitte, hintergrundErzeugnisse, hintergrundPalette, figurenFarben, bodenFarben, hintergrundPruefen } from '../grafik/quelle/hintergrund/hintergruende.ts';
import type { HintergrundAbschnitt } from '../grafik/quelle/hintergrund/hintergruende.ts';
import { hintergrundAtlasText, hintergrundBytes, hintergrundPacken, zusammensetzen } from '../grafik/quelle/hintergrund/blatt_hg.ts';
import { landedeck } from '../grafik/quelle/hintergrund/a_landedeck.ts';
import { haendlergasse } from '../grafik/quelle/hintergrund/b_haendlergasse.ts';
import { asservatenkammer } from '../grafik/quelle/hintergrund/f_asservatenkammer.ts';
import { BLENDE_WEG, blendeAnwenden, blendeFront, blendenKante } from '../grafik/quelle/hintergrund/blende.ts';
import { abschnitt, fugenTiefen, fugenZeilen, kameraBereiche, scheibe } from '../grafik/quelle/hintergrund/lage.ts';
import { schildBreite, SCHILD_ZEICHEN } from '../grafik/quelle/hintergrund/werkzeug.ts';
import { BILD_BREITE, BILD_HOEHE, BLENDE_ZU } from '../src/kern/werte.ts';
import { kameraY } from '../src/kern/stage.ts';

const ABSCHNITTE = hintergrundAbschnitte();
const nach = (id: string): HintergrundAbschnitt => ABSCHNITTE.find((h) => h.grafik.abschnitt.id === id) as HintergrundAbschnitt;
const BLAETTER = ABSCHNITTE.map((h) => h.blatt);

test('Hintergrund: Erzeugnisse für bauen.ts (drei Abschnitte und Blende), Kontaktbögen, keine Befunde', () => {
  const e = hintergrundErzeugnisse();
  assert.deepEqual(
    e.map((x) => x.name),
    ['hintergrund_a', 'hintergrund_b', 'hintergrund_f', 'hintergrund_blende'],
  );
  for (const x of e) {
    assert.deepEqual([...x.ausgabe.keys()], [`${x.name}.png`, `${x.name}.json`]);
    assert.deepEqual(x.befunde, [], `${x.name}: ${x.befunde.map((b) => b.text).join('; ')}`);
  }
  assert.deepEqual(
    e.flatMap((x) => [...x.bilder.keys()]),
    [
      'kontakt_hintergrund_a.png',
      'kontakt_hintergrund_a_kacheln.png',
      'kontakt_hintergrund_b.png',
      'kontakt_hintergrund_b_kacheln.png',
      'kontakt_hintergrund_f.png',
      'kontakt_hintergrund_f_kacheln.png',
      'kontakt_hintergrund_blende.png',
    ],
  );
});

test('Hintergrund: Abschnitte und Lagen aus scheibe.txt (A 0–400 Ky 128, B 400–850 Ky 128, F 1700–2304 Ky 0; Bandkanten)', () => {
  const a = abschnitt('A');
  const b = abschnitt('B');
  const f = abschnitt('F');
  assert.deepEqual([a.x0, a.x1, a.ky, a.zUnten, a.zOben], [0, 400, 128, 138, 213]);
  assert.deepEqual([b.x0, b.x1, b.ky, b.zUnten, b.zOben], [400, 850, 128, 138, 229]);
  assert.deepEqual([f.x0, f.x1, f.ky, f.zUnten, f.zOben], [1700, 2304, 0, 10, 101]);
  // Bildschirm-y = 234 − (z − Ky): Oberkante A 149, B und F 133; Unterkante überall am Bildrand
  assert.deepEqual([a.kanteMin, a.kanteMax, b.kanteMin, f.kanteMin], [149, 149, 133, 133]);
  for (const x of [a, b, f]) assert.ok(x.unten.every((u) => u === BILD_HOEHE));
  assert.deepEqual(kameraBereiche(), [
    [0, 466],
    [1792, 1920],
  ]);
  for (const h of ABSCHNITTE) {
    const at = h.blatt.atlas;
    const x = h.grafik.abschnitt;
    assert.deepEqual([at.abschnitt, at.welt.x0, at.welt.x1, at.kameraY], [x.id, x.x0, x.x1, x.ky]);
    assert.deepEqual(at.band, { oben: x.zOben, unten: x.zUnten, kanteY: 234 - x.zOben, untenY: 234 - x.zUnten });
    assert.deepEqual(at.fugen, fugenTiefen(x));
    assert.ok(at.fugen.every((z) => z % 16 === 0 && z > x.zUnten && z < x.zOben));
    for (const k of at.karten) assert.equal(k.x, x.x0, `${h.name} ${k.ebene}`);
  }
});

test('Hintergrund: freie Bilder an den Lagen der Sätze hintergrund und vordergrund (Container, Funkladen, Kabelrollen mit Deckkraft 0,85)', () => {
  const stage = scheibe();
  const alle = BLAETTER.flatMap((b) => b.atlas.bilder.map((f) => ({ f, ky: ABSCHNITTE.find((h) => h.blatt === b)?.grafik.abschnitt.ky as number })));
  const finde = (name: string): (typeof alle)[number] => alle.find((q) => q.f.name === name) as (typeof alle)[number];
  for (const s of stage.hintergrund.filter((h) => h.bild !== 'asservatenkammer')) {
    const { f } = finde(s.bild);
    assert.deepEqual([f.ebene, f.x, f.b, f.parallax, f.deckkraft], ['wand', s.x0, s.x1 - s.x0, 1, 1], s.bild);
  }
  assert.deepEqual(
    stage.hintergrund.map((h) => [h.bild, h.x0, h.x1]),
    [
      ['frachtcontainer', 330, 410],
      ['funkladen', 450, 650],
      ['asservatenkammer', 1700, 2304],
    ],
  );
  // die Asservatenkammer deckt als Wandkarte den ganzen Abschnitt F
  const fk = nach('F').blatt.atlas.karten.find((k) => k.ebene === 'wand');
  assert.equal(fk?.name, 'asservatenkammer');
  for (const v of stage.vordergrund) {
    const { f, ky } = finde(v.id);
    assert.deepEqual([f.ebene, f.x, f.b, f.h, f.y + ky, f.deckkraft], ['vordergrund', v.x0, v.x1 - v.x0, v.zeilen, BILD_HOEHE - v.zeilen, 0.85], v.id);
  }
  assert.deepEqual(
    stage.vordergrund.map((v) => [v.id, v.x0, v.x1, v.zeilen]),
    [
      ['kabelrollen1', 96, 176, 24],
      ['kabelrollen2', 280, 344, 24],
    ],
  );
  // Himmel nur im Landedeck, mit halber Kamerageschwindigkeit
  const himmel = BLAETTER.flatMap((b) => b.atlas.karten.filter((k) => k.ebene === 'himmel'));
  assert.equal(himmel.length, 1);
  assert.equal(himmel[0]?.parallax, 0.5);
  // Dampf als Folge von drei gleich großen Bildern
  const dampf = finde('dampf').f;
  assert.equal(dampf.bilder.length, 3);
  assert.ok(dampf.dauer > 0);
});

test('Hintergrund: höchstens 48 Farben je Abschnitt, nur aus den Hintergrundtreppen und Leuchttönen (palette.ts)', () => {
  const erlaubt = hintergrundPalette();
  for (const h of ABSCHNITTE) {
    const farben = new Set(h.blatt.leinwand.daten);
    farben.add(0);
    assert.ok(farben.size <= FARBBUDGET.hintergrund, `${h.name}: ${farben.size} Farben`);
    for (const p of farben) assert.ok(erlaubt.has(p), `${h.name}: Farbe ${p.toString(16)} nicht aus palette.ts`);
  }
});

test('Hintergrund: kein Bodenton in einer Figurenpalette (Treppen der Figurmaterialien, Kontur, Leuchttöne, gebaute Figurenblätter)', () => {
  const figur = figurenFarben();
  for (const name of ['vela', 'rammbock', 'bolzer', 'puppe', 'zuender', 'ballast']) {
    const datei = SPIEL + `grafik/ausgabe/${name}.png`;
    if (!existsSync(datei)) continue;
    for (const p of pngDateiLesen(datei).daten) if (deckend(p)) figur.add(p);
  }
  for (const h of ABSCHNITTE) {
    const boden = bodenFarben(h.blatt);
    assert.ok(boden.size > 4, `${h.name}: Boden mit Farben`);
    for (const p of boden) assert.ok(!figur.has(p), `${h.name}: Bodenton ${p.toString(16)} in einer Figurenpalette`);
  }
});

test('Hintergrund: Boden genau im Band, Wand darüber; Tiefenfugen alle 16 px als dunkle Zeilen', () => {
  for (const h of ABSCHNITTE) assert.deepEqual(hintergrundPruefen(h), []);
  const material: Record<string, typeof EISBETON> = { A: EISBETON, B: GUSSPLATTE, F: KAMMER_STAHL };
  for (const h of ABSCHNITTE) {
    const a = h.grafik.abschnitt;
    const boden = h.grafik.karten.find((k) => k.ebene === 'boden') as (typeof h.grafik.karten)[number];
    const dunkel = (material[a.id] as typeof EISBETON).treppe[0];
    const zeilen = fugenZeilen(a);
    assert.ok(zeilen.length >= 4, `${h.name}: Fugen`);
    for (const y of zeilen) {
      let n = 0;
      for (let c = 0; c < a.breite; c++) if (boden.leinwand.hole(c, y) === dunkel) n++;
      assert.ok(n >= 0.8 * a.breite, `${h.name}: Fuge in Zeile ${y} nur ${n} von ${a.breite} Spalten dunkel`);
    }
    // Oberkante: Schattenzeile in Ton 0 unter der Wand
    let kante = 0;
    for (let c = 0; c < a.breite; c++) if (boden.leinwand.hole(c, a.kante[c] as number) === dunkel) kante++;
    assert.ok(kante >= 0.95 * a.breite, `${h.name}: Oberkante`);
  }
});

test('Hintergrund: bei jeder Kamera-x der Scheibe ist das Bild lückenlos gedeckt (Himmel mit halber Geschwindigkeit hinter A)', () => {
  for (const [k0, k1] of kameraBereiche()) {
    for (let k = k0; k <= k1; k += 6) {
      const ky = kameraY(scheibe(), k);
      const bild = new Leinwand(BILD_BREITE, BILD_HOEHE);
      zusammensetzen(BLAETTER, bild, k, ky, k, ['himmel', 'wand', 'boden']);
      let leer = -1;
      for (let i = 0; i < bild.daten.length && leer < 0; i++) if (!deckend(bild.daten[i] as number)) leer = i;
      assert.equal(leer, -1, `Kamera-x ${k}: Lücke bei (${leer % BILD_BREITE}, ${Math.floor(leer / BILD_BREITE)})`);
    }
  }
});

test('Hintergrund: Atlas als Kachelkarten 16 × 16 ohne doppelte Kacheln; Zusammensetzen ergibt die Zeichnung; JSON wie der Atlas', () => {
  for (const h of ABSCHNITTE) {
    const { blatt, grafik } = h;
    const a = grafik.abschnitt;
    assert.ok(blatt.leinwand.breite <= 2048 && blatt.leinwand.hoehe <= 2048);
    const schluessel = new Set<string>();
    for (const [x, y] of blatt.atlas.kacheln) {
      assert.ok(x >= 0 && y >= 0 && x + 16 <= blatt.leinwand.breite && y + 16 <= blatt.leinwand.hoehe);
      const s = Array.from(blatt.leinwand.ausschnitt(x, y, 16, 16).daten).join(',');
      assert.ok(!schluessel.has(s), `${h.name}: Kachel doppelt`);
      schluessel.add(s);
    }
    for (const k of blatt.atlas.karten) {
      assert.equal(k.kacheln.length, k.zeilen);
      assert.ok(k.kacheln.every((r) => r.length === k.spalten && r.every((n) => n >= -1 && n < blatt.atlas.kacheln.length)));
    }
    // Wand und Boden aus Blatt und Atlas gleich der gezeichneten Ebene
    for (const q of grafik.karten.filter((k) => k.ebene !== 'himmel')) {
      const z = new Leinwand(a.breite, BILD_HOEHE);
      zusammensetzen([blatt], z, a.x0, a.ky, a.x0, [q.ebene]);
      for (let y = 0; y < BILD_HOEHE; y++) {
        for (let c = 0; c < a.breite; c++) {
          const soll = q.leinwand.hole(c, y - q.zeile0);
          // freie Bilder der Wand liegen darüber; verglichen wird, wo keines liegt
          const frei = blatt.atlas.bilder.some((f) => f.ebene === q.ebene && a.x0 + c >= f.x && a.x0 + c < f.x + f.b && y - a.ky >= f.y && y - a.ky < f.y + f.h);
          if (!frei) assert.equal(z.hole(c, y), soll, `${h.name} ${q.ebene} (${c}, ${y})`);
        }
      }
    }
    assert.deepEqual(JSON.parse(hintergrundAtlasText(blatt.atlas)), JSON.parse(JSON.stringify(blatt.atlas)));
  }
});

test('Hintergrund: Blendenkante (Bayer von 0/16 bis 15/16), Front von außen rechts bis 0, d = 28 ganz dunkel', () => {
  const k = blendenKante();
  assert.deepEqual([k.breite, k.hoehe], [16, 16]);
  const gruppen = [0, 1, 2, 3].map((g) => {
    let n = 0;
    for (let y = 0; y < 16; y++) for (let x = 4 * g; x < 4 * g + 4; x++) if (k.hole(x, y) === BLENDE_DUNKEL) n++;
    return n;
  });
  for (let g = 1; g < 4; g++) assert.ok((gruppen[g] as number) > (gruppen[g - 1] as number), `Deckung steigt nach rechts: ${gruppen.join(', ')}`);
  for (let y = 0; y < 16; y++) assert.ok(!deckend(k.hole(0, y)), 'Spalte 0 offen');
  assert.equal(BLENDE_WEG, BILD_BREITE + 16);
  assert.equal(blendeFront(0), BLENDE_WEG);
  assert.equal(blendeFront(BLENDE_ZU), 0);
  const szene = new Leinwand(BILD_BREITE, BILD_HOEHE);
  zusammensetzen(BLAETTER, szene, 466, 128, 466);
  const offen = szene.klon();
  blendeAnwenden(offen, 0);
  assert.ok(offen.gleich(szene));
  blendeAnwenden(szene, BLENDE_ZU);
  assert.ok(szene.daten.every((p) => p === BLENDE_DUNKEL));
});

test('Hintergrund: Schilderschrift kennt alle Zeichen der Schilder', () => {
  for (const t of ['PERIHEL', 'FRACHT', 'FUNKLADEN', 'ASSERVATE']) {
    for (const z of t) assert.ok(SCHILD_ZEICHEN.includes(z), `${t}: ${z}`);
    assert.equal(schildBreite(t), t.length * 6 - 1);
  }
});

test('Hintergrund: deterministisch (zweiter Bau gleiche Bytes)', () => {
  const bauen = [landedeck, haendlergasse, asservatenkammer];
  ABSCHNITTE.forEach((h, i) => {
    const neu = hintergrundBytes(hintergrundPacken(h.name, (bauen[i] as () => typeof h.grafik)()));
    const alt = hintergrundBytes(h.blatt);
    assert.deepEqual(neu.png, alt.png, h.name);
    assert.equal(neu.json, alt.json, h.name);
  });
});

test('Ausgabe: spiel/grafik/ausgabe/hintergrund_*.png und .json entsprechen dem Bau (npm run grafik)', () => {
  for (const h of ABSCHNITTE) {
    const png = SPIEL + `grafik/ausgabe/${h.name}.png`;
    const json = SPIEL + `grafik/ausgabe/${h.name}.json`;
    assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
    assert.ok(pngDateiLesen(png).gleich(h.blatt.leinwand), `${h.name}: Pixel des Blatts`);
    assert.equal(readFileSync(json, 'utf8'), hintergrundAtlasText(h.blatt.atlas));
    const id = h.grafik.abschnitt.id.toLowerCase();
    assert.ok(existsSync(SPIEL + `../docs/bilder/kontakt_hintergrund_${id}.png`), `kontakt_hintergrund_${id}.png`);
    assert.ok(existsSync(SPIEL + `../docs/bilder/kontakt_hintergrund_${id}_kacheln.png`));
  }
  assert.ok(existsSync(SPIEL + 'grafik/ausgabe/hintergrund_blende.png'));
});
