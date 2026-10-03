// Tests des Blatts objekte (Auftrag 4, Phase 2, G4; docs/grafik.md 4.7):
// Vollständigkeit der Animationen nach Auftrag 4, 1.5 und 4, Stilprüfung
// (Kontur, Streupixel, Farbzählung ≤ 8, Anker), Maße der Gegenstände und
// Behälter, Reichweite von Magnetstoß und Eiswelle nach werte.ts, aktive
// Bilder der Explosion, Abstimmung des Magnetstoßes mit Velas
// Trefferbildern, Atlas-Format, Determinismus und Stand der Ausgabe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPIEL } from './hilfe.ts';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { zugeschnitten } from '../grafik/quelle/blatt.ts';
import { OBJEKT_REGELN, objektAnimationen, objektePruefen, objekteErzeugnisse } from '../grafik/quelle/objekte.ts';
import {
  EXPLOSION_AKTIV,
  EXPLOSION_DAUERN,
  EXPLOSION_DURCHMESSER,
  MAGNETSTOSS_ANSATZ,
  MAGNETSTOSS_LAENGE,
  VELA_TREFFER,
  VELA_TREFFER_4B,
  explosionBildBeiUhr,
} from '../grafik/quelle/effekte.ts';
import { RAKETE, TRUEMMER_DAUERN, WERFER, werferBild } from '../grafik/quelle/gegenstaende.ts';
import { velaAnimationen } from '../grafik/quelle/figuren/vela.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, KONTUR, ROHR_GRUEN, OVERALL_BOLZER, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { md5 } from '../grafik/quelle/png.ts';
import {
  BEHAELTER_HALB_X,
  BEHAELTER_HOEHE,
  GEGENSTAND_FLUG,
  KETTE4_ZWEITES_FENSTER_VON,
  KETTE_AKTIV_BIS,
  KETTE_AKTIV_VON,
  KETTE_VORN,
  RX_DAUER,
  SPEZIAL_STUFE_DAUER,
  SPEZIAL_STUFE_VON,
  SPEZIAL_VORN,
  ZR_EINSCHLAG,
  ZR_EXPLOSION_BIS,
  ZR_EXPLOSION_VON,
} from '../src/kern/werte.ts';

const ANIM = objektAnimationen();
const anim = (name: string): Animation => {
  const a = ANIM.find((x) => x.name === name);
  assert.ok(a !== undefined, `Animation ${name}`);
  return a;
};
const bild = (name: string, i: number = 0): Bild => zugeschnitten(anim(name).bilder[i] as Bild);
/** Vorderster und hinterster deckender Pixel in x relativ zum Anker. */
function ausdehnungX(b: Bild): { links: number; rechts: number } {
  const z = zugeschnitten(b);
  return { links: -z.ankerX, rechts: z.leinwand.breite - 1 - z.ankerX };
}

test('Objekte: alle Animationen nach Auftrag 4, 1.5 und 4 mit Bildzahl und Dauern', () => {
  assert.deepEqual(
    ANIM.map((a) => [a.name, a.bilder.length]),
    [
      ['kometenbraten', 1],
      ['eisnudelschale', 1],
      ['sternbeeren', 1],
      ['raketenwerfer', 1],
      ['waffe_leer', 1],
      ['rakete', 2],
      ['rakete_zuender', 2],
      ['fass', 1],
      ['fass_truemmer', 5],
      ['bosskiste', 1],
      ['bosskiste_truemmer', 5],
      ['magnetstoss1', 2],
      ['magnetstoss2', 2],
      ['magnetstoss3', 2],
      ['magnetstoss4', 2],
      ['funke', 4],
      ['eiswelle', 6],
      ['explosion', 6],
      ['explosion_zuender', 6],
      ['staub', 3],
    ],
  );
  assert.deepEqual(Object.keys(OBJEKT_REGELN).sort(), ANIM.map((a) => a.name).sort());
  // Funke 4 Bilder zu 2 Frames (8 Frames), Eiswelle 6 zu 6, Explosion etwa 24, Staub 3 zu 3 (Auftrag 4, 1.5)
  assert.deepEqual(anim('funke').bilder.map((b) => b.dauer), [2, 2, 2, 2]);
  assert.deepEqual(anim('eiswelle').bilder.map((b) => b.dauer), Array(6).fill(SPEZIAL_STUFE_DAUER));
  assert.equal(anim('explosion').bilder.reduce((s, b) => s + b.dauer, 0), 24);
  assert.deepEqual(anim('staub').bilder.map((b) => b.dauer), [3, 3, 3]);
  for (let k = 1; k <= 4; k++) assert.deepEqual(anim(`magnetstoss${k}`).bilder.map((b) => b.dauer), [2, 2]);
  // Trümmer: Summe 48 = Flug des Inhalts (werte.ts GEGENSTAND_FLUG)
  assert.equal(TRUEMMER_DAUERN.reduce((s, d) => s + d, 0), GEGENSTAND_FLUG);
  assert.deepEqual(anim('fass_truemmer').bilder.map((b) => b.dauer), [...TRUEMMER_DAUERN]);
});

test('Objekte: Stilprüfung bestanden (Kontur, Streupixel, Farben ≤ 8, Anker im Bild, aktive Bilder)', () => {
  assert.deepEqual(objektePruefen(ANIM), []);
  const e = objekteErzeugnisse();
  assert.equal(e.length, 1);
  assert.deepEqual(e[0]?.befunde, []);
  for (const a of ANIM) {
    assert.ok(farbenZaehlen(a.bilder.map((b) => b.leinwand)) <= FARBBUDGET.gegenstand, `${a.name}: Farbbudget`);
    const regel = OBJEKT_REGELN[a.name];
    assert.ok(regel !== undefined);
    // Effekte ohne Kontur tragen kein KONTUR, Gegenstände und Behälter immer
    for (const b of a.bilder) assert.equal(farbenMenge(b.leinwand).has(KONTUR), regel.kontur, a.name);
  }
});

test('Objekte: Stilprüfung meldet Verstöße (Prüfung greift)', () => {
  const kaputt = anim('fass');
  const l = kaputt.bilder[0]?.leinwand.klon();
  assert.ok(l !== undefined);
  const g = l.begrenzung();
  assert.ok(g !== null);
  // einen Konturpixel am Rand durch Mantelfarbe ersetzen → Kontur offen
  const mitte = g.x + Math.floor(g.b / 2);
  l.setze(mitte, g.y, l.hole(mitte, g.y + 3));
  const befunde = objektePruefen([{ ...kaputt, bilder: [{ ...(kaputt.bilder[0] as Bild), leinwand: l }] }]);
  assert.ok(befunde.some((b) => b.animation === 'fass' && b.regel === 'Kontur geschlossen'));
  assert.ok(befunde.some((b) => b.regel === 'Vollständigkeit'));
});

test('Objekte: Maße nach Auftrag 4, 4 und werte.ts, Anker am Fußpunkt in der untersten Zeile', () => {
  const mass = (n: string): [number, number] => [bild(n).leinwand.breite, bild(n).leinwand.hoehe];
  assert.deepEqual(mass('fass'), [BEHAELTER_HALB_X * 2, BEHAELTER_HOEHE]);
  assert.deepEqual(mass('bosskiste'), [40, 28]);
  assert.deepEqual(mass('kometenbraten'), [28, 18]);
  assert.deepEqual(mass('eisnudelschale'), [20, 14]);
  assert.deepEqual(mass('sternbeeren'), [14, 12]);
  assert.deepEqual(mass('raketenwerfer'), [30, 10]);
  assert.deepEqual(mass('waffe_leer'), [30, 10]);
  assert.deepEqual(mass('rakete'), [16, 6]);
  for (const n of ['kometenbraten', 'eisnudelschale', 'sternbeeren', 'raketenwerfer', 'waffe_leer', 'fass', 'bosskiste', 'fass_truemmer', 'bosskiste_truemmer', 'staub', 'explosion', 'eiswelle']) {
    for (const roh of anim(n).bilder) {
      const b = zugeschnitten(roh);
      assert.equal(b.ankerY, b.leinwand.hoehe - 1, `${n}: Anker in der untersten Zeile`);
    }
  }
  // Fass und Kiste stehen mittig auf dem Anker (Hindernis x ± 12, werte.ts)
  assert.deepEqual(ausdehnungX(bild('fass')), { links: -BEHAELTER_HALB_X, rechts: BEHAELTER_HALB_X - 1 });
  // Rakete: Anker in der Mitte, Spitze vorn rechts
  const r = bild('rakete');
  assert.equal(r.ankerY, 3);
  assert.equal(ausdehnungX(r).rechts, RAKETE.spitze.x1 + 1);
});

test('Objekte: Raketenwerfer grün, leere Waffe grau, gleiche Form (für Vela und den Zünder)', () => {
  const voll = werferBild(false).leinwand;
  const leer = werferBild(true).leinwand;
  assert.equal(voll.breite, leer.breite);
  assert.equal(voll.hoehe, leer.hoehe);
  for (let i = 0; i < voll.daten.length; i++) assert.equal(deckend(voll.daten[i] as number), deckend(leer.daten[i] as number), 'gleiche Silhouette');
  const fv = farbenMenge(voll);
  const fl = farbenMenge(leer);
  assert.ok([1, 2, 3].every((t) => fv.has(ROHR_GRUEN.treppe[t as 1 | 2 | 3])), 'Rohr in ROHR_GRUEN');
  assert.ok([1, 2, 3].every((t) => fl.has(OVERALL_BOLZER.treppe[t as 1 | 2 | 3]) && !fl.has(ROHR_GRUEN.treppe[t as 1 | 2 | 3])), 'leer: grau');
  assert.equal(WERFER.rohr.x1 - WERFER.heck.x0 + 1 + 2, 28, 'Rohr mit Heck bis vor die Mündung');
});

test('Objekte: Magnetstoß reicht mit der Faust bis KETTE_VORN − 25 (Auftrag 4, 1.5) und deckt die aktiven Frames', () => {
  for (let k = 0; k < 4; k++) {
    const a = anim(`magnetstoss${k + 1}`);
    assert.deepEqual(a.aktiv, [0, 1]);
    // 2 Bilder zu 2 Frames = Länge des aktiven Fensters
    assert.equal(a.bilder.reduce((s, b) => s + b.dauer, 0), (KETTE_AKTIV_BIS[k] as number) - (KETTE_AKTIV_VON[k] as number) + 1);
    const ansatz = MAGNETSTOSS_ANSATZ[k] as { x: number; y: number };
    const vorn = ausdehnungX(a.bilder[0] as Bild).rechts;
    // Bild 0 ist das Trefferbild mit der vollen Länge (±1 px Rundung)
    assert.ok(Math.abs(vorn - (MAGNETSTOSS_LAENGE[k] as number)) <= 1, `Stufe ${k + 1}: Stoß ${vorn} statt ${MAGNETSTOSS_LAENGE[k]}`);
    assert.ok(Math.abs(ansatz.x + vorn - ((KETTE_VORN[k] as number) - 25)) <= 1, `Stufe ${k + 1}: Faust + Stoß`);
  }
  assert.deepEqual(MAGNETSTOSS_LAENGE, [10, 12, 22, 28]);
  assert.equal(KETTE4_ZWEITES_FENSTER_VON, 17);
});

test('Objekte: Ansatz des Magnetstoßes passt zu Velas Trefferbildern (Faust vorn, Höhe ±3 px)', () => {
  const vela = velaAnimationen();
  const messen = (name: string, index: number): { vorn: number; hoehe: number } => {
    const a = vela.find((x) => x.name === name);
    assert.ok(a !== undefined && a.aktiv !== undefined);
    const b = zugeschnitten(a.bilder[a.aktiv[index] as number] as Bild);
    const l = b.leinwand;
    for (let x = l.breite - 1; x >= 0; x--) {
      const hoehen: number[] = [];
      for (let y = 0; y < l.hoehe; y++) if (deckend(l.hole(x, y))) hoehen.push(b.ankerY - y);
      if (hoehen.length > 0) return { vorn: x - b.ankerX, hoehe: (Math.min(...hoehen) + Math.max(...hoehen)) / 2 };
    }
    throw new Error('leer');
  };
  const soll = [...VELA_TREFFER, VELA_TREFFER_4B];
  const ist = [messen('kette1', 0), messen('kette2', 0), messen('kette3', 0), messen('kette4', 0), messen('kette4', 1)];
  ist.forEach((m, i) => {
    const s = soll[i] as { vorn: number; hoehe: number };
    assert.ok(Math.abs(m.vorn - s.vorn) <= 3, `Treffer ${i}: vorn ${m.vorn} statt ${s.vorn} (docs/grafik.md 4.7 und 4.1 abgleichen)`);
    assert.ok(Math.abs(m.hoehe - s.hoehe) <= 3, `Treffer ${i}: Höhe ${m.hoehe} statt ${s.hoehe}`);
  });
});

test('Objekte: Eiswelle reicht je Stufe bis SPEZIAL_VORN (43 bis 123 px, +16 je Stufe), Anker an Velas Fußpunkt', () => {
  const a = anim('eiswelle');
  assert.deepEqual(a.aktiv, [0, 1, 2, 3, 4, 5]);
  a.bilder.forEach((b, k) => {
    const x = ausdehnungX(b);
    assert.equal(x.rechts, SPEZIAL_VORN[k], `Stufe ${k + 1}`);
    assert.ok(x.links <= 0, 'beginnt an Velas Fußpunkt');
  });
  // Stufe k steht bei Aktionsuhr SPEZIAL_STUFE_VON[k] bis + 5
  assert.deepEqual(SPEZIAL_STUFE_VON, [8, 14, 20, 26, 32, 38]);
});

test('Objekte: Explosion wächst von 24 auf 72 px, aktive Bilder nach RX (Figur) und ZR (Zünder)', () => {
  const a = anim('explosion');
  a.bilder.forEach((b, i) => {
    const d = zugeschnitten(b).leinwand.breite;
    assert.ok(Math.abs(d - (EXPLOSION_DURCHMESSER[i] as number)) <= 3, `Bild ${i}: ${d} px statt ${EXPLOSION_DURCHMESSER[i]}`);
  });
  assert.equal(EXPLOSION_DURCHMESSER[0], 24);
  assert.equal(EXPLOSION_DURCHMESSER[5], 72);
  assert.deepEqual(a.bilder.map((b) => b.dauer), [...EXPLOSION_DAUERN]);
  // Figur: Uhr 1 bis 15 (RX_DAUER), Zünder: Einschlag Q+20 = Uhr 1, aktiv Q+21 bis Q+29 = Uhr 2 bis 10
  assert.deepEqual(EXPLOSION_AKTIV.figur, { von: 1, bis: RX_DAUER });
  assert.deepEqual(EXPLOSION_AKTIV.zuender, { von: ZR_EXPLOSION_VON - ZR_EINSCHLAG + 1, bis: ZR_EXPLOSION_BIS - ZR_EINSCHLAG + 1 });
  assert.deepEqual(a.aktiv, [0, 1, 2, 3, 4]);
  assert.deepEqual(anim('explosion_zuender').aktiv, [0, 1, 2, 3]);
  assert.equal(explosionBildBeiUhr(1), 0);
  assert.equal(explosionBildBeiUhr(15), 4);
  assert.equal(explosionBildBeiUhr(24), 5);
  assert.equal(explosionBildBeiUhr(99), 5);
  // dieselben Bilder für beide Raketen
  anim('explosion_zuender').bilder.forEach((b, i) => assert.ok(b.leinwand.gleich((a.bilder[i] as Bild).leinwand)));
});

test('Objekte: Trümmer tragen den Anker in jedem Bild (Teil bleibt am Boden), Rakete flackert', () => {
  for (const n of ['fass_truemmer', 'bosskiste_truemmer']) {
    for (const roh of anim(n).bilder) {
      const b = zugeschnitten(roh);
      let unten = false;
      for (let x = 0; x < b.leinwand.breite; x++) if (deckend(b.leinwand.hole(x, b.ankerY)) && Math.abs(x - b.ankerX) <= BEHAELTER_HALB_X) unten = true;
      assert.ok(unten, `${n}: Bodenteil unter dem Anker`);
    }
  }
  const r = anim('rakete');
  assert.equal(r.schleife, true);
  assert.ok(!(r.bilder[0] as Bild).leinwand.gleich((r.bilder[1] as Bild).leinwand), 'zwei verschiedene Flammenbilder');
});

test('Objekte: Atlas im Format von Auftrag 4, 2.3; Bau deterministisch; Ausgabe auf Stand', () => {
  const a = objekteErzeugnisse()[0];
  const b = objekteErzeugnisse()[0];
  assert.ok(a !== undefined && b !== undefined);
  const png = a.ausgabe.get('objekte.png') as Uint8Array;
  const json = a.ausgabe.get('objekte.json') as string;
  assert.equal(md5(png), md5(b.ausgabe.get('objekte.png') as Uint8Array));
  assert.equal(json, b.ausgabe.get('objekte.json'));
  for (const [k, v] of a.bilder) assert.equal(md5(v), md5(b.bilder.get(k) as Uint8Array), k);
  assert.equal(a.bilder.size, ANIM.length);
  assert.ok([...a.bilder.keys()].every((k) => /^kontakt_objekte_[a-z0-9_]+\.png$/.test(k)));
  const atlas = JSON.parse(json) as { blatt: string; animationen: Record<string, { schleife: boolean; bilder: Record<string, number>[]; aktiv?: number[] }> };
  assert.equal(atlas.blatt, 'objekte.png');
  assert.deepEqual(Object.keys(atlas.animationen), ANIM.map((x) => x.name));
  for (const [name, an] of Object.entries(atlas.animationen)) {
    for (const bi of an.bilder) {
      assert.deepEqual(Object.keys(bi), ['x', 'y', 'b', 'h', 'ankerX', 'ankerY', 'dauer'], name);
      assert.ok(bi.ankerX !== undefined && bi.b !== undefined && bi.ankerX >= 0 && bi.ankerX < bi.b, `${name}: Anker im Bild`);
    }
  }
  const datei = join(SPIEL, 'grafik', 'ausgabe', 'objekte.png');
  if (existsSync(datei)) assert.equal(md5(new Uint8Array(readFileSync(datei))), md5(png), 'grafik/ausgabe/objekte.png ist auf Stand (npm run grafik)');
});
