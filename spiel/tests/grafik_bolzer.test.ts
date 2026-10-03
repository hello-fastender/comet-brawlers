// Tests von Bolzer und Puppe als Gliederpuppe (Auftrag 4, Phase 2, G2):
// Registrierung über bolzerFiguren() in bauen.ts, vollständige Animationen nach
// Auftrag 4, 3 (Zeile Bolzer; Angriffe BA, BB, BC, BUA, BUB aus werte.ts),
// Umriss im Stand 57 × 67, Farben ≤ 16 nach docs/grafik.md 4.3, Puppe als
// Palettentausch (grau, ohne Streifen und Haut), Fußkontakt beim Gehen (7 px je
// Bild, 56 px je Zyklus), Trefferbilder im ersten aktiven Frame mit der
// größten Reichweite, Zeiten der Reaktionen aus werte.ts (bolzer_gemeinsam.ts),
// gedrehte Gesichtsmaske, Kontur und Streupixel, Determinismus und Stand der
// Ausgabe in spiel/grafik/ausgabe/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { atlasText, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Figur } from '../grafik/quelle/bauen.ts';
import { figurBytes, figurPruefen, figuren, md5 } from '../grafik/quelle/bauen.ts';
import {
  AUFSTEHEN_HOCKE_DAUERN,
  GEHEN_BILDER,
  GEHEN_DAUER,
  GEHEN_SCHNELL_DAUER,
  GEHEN_SCHRITT,
  GLANZ_BOLZER,
  PUPPE_BOLZER,
  PUPPE_TAUSCH,
  bolzerFiguren,
  bolzerHaltungen,
  gehVersatz,
  gehen,
  pose,
} from '../grafik/quelle/figuren/bolzer.ts';
import { rammbockAnimationen } from '../grafik/quelle/figuren/rammbock.ts';
import {
  AUFSTEHEN_DAUERN,
  GETROFFEN_DAUERN,
  GEWORFEN_AUFPRALL,
  GEWORFEN_DAUERN,
  RUECKZUG_RICHTWERT,
  SPOTT_DAUERN,
  STEIGEN,
  TOT_DAUERN,
  UMGEWORFEN_DAUERN,
  UMGEWORFEN_F2_DAUERN,
  angriffDauern,
  aufstehenHockeDauern,
  bildBeiAbstand,
  bildBeiUhr,
  gesichtGedreht,
  trefferBild,
} from '../grafik/quelle/figuren/bolzer_gemeinsam.ts';
import { drehe } from '../grafik/quelle/geometrie.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, HAUT_DUNKEL, KONTUR, OVERALL_BOLZER, PUPPE_GRAU, SIGNAL_ORANGE, STAHL, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import { SCHATTEN_HOEHE, UMRISS_GEGNER } from '../src/darstellung/masse.ts';
import {
  AUFSTEHEN_GEGNER,
  AUFTRITT_HOCKE_BOLZER,
  BOLZER_ANGRIFF_CODES,
  BOLZER_GEHEN_X,
  BOLZER_SCHNELL_X,
  F1_BODEN,
  F1_GH,
  F1_RUHE,
  F1_STILLSTAND,
  F1_VH,
  F2_BODEN,
  F2_RUHE,
  F3_BODEN,
  F3_ERSTER,
  F3_RUHE,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  NAH_ANGRIFFE,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  SLOT_FREI_TOD,
  SPOTT_DAUER,
  WURF_LOSLASSEN,
  WURF_TRAGEN_BIS,
  ZIELABSTAND_MAX,
} from '../src/kern/werte.ts';
import { EINS } from '../src/kern/festkomma.ts';

// eigene Figuren direkt gebaut (die Registrierung in figuren() prüft der erste Test)
const [BOLZER, PUPPE] = bolzerFiguren() as [Figur, Figur];
const anim = (f: Figur, name: string): Animation => f.animationen.find((a) => a.name === name) as Animation;
const alleBilder = (f: Figur): { name: string; i: number; b: Bild }[] => f.animationen.flatMap((a) => a.bilder.map((b, i) => ({ name: a.name, i, b: zugeschnitten(b) })));
const summe = (z: readonly number[]): number => z.reduce((x, y) => x + y, 0);

/** Animationen nach Auftrag 4, 3 (Zeile Bolzer) mit Bildzahl und Schleife; dazu stand (G0b-8). */
const ERWARTET: readonly [string, number, boolean][] = [
  ['stand', 1, true],
  ['haltung', 3, true],
  ['gehen', 8, true],
  ['gehen_schnell', 8, true],
  ['auftritt_versteck', 8, true],
  ['auftritt_hocke', 1, true],
  ['aufstehen_hocke', 3, false],
  ['spott', 6, false],
  ['kampfhaltung', 2, true],
  ['schlag_a', 5, false],
  ['schlag_b', 5, false],
  ['schlag_c', 5, false],
  ['umwerfschlag_a', 5, false],
  ['umwerfschlag_b', 5, false],
  ['getroffen', 3, false],
  ['umgeworfen', 5, false],
  ['liegen', 1, true],
  ['aufstehen', 6, false],
  ['gehalten', 1, true],
  ['geworfen', 2, false],
  ['tot', 6, false],
];
/** Angriffe des Bolzers: Animation → Code (werte.ts NAH_ANGRIFFE, BOLZER_ANGRIFF_CODES, Welt 5.6). */
const ANGRIFFE = [
  ['schlag_a', 'BA'],
  ['schlag_b', 'BB'],
  ['schlag_c', 'BC'],
  ['umwerfschlag_a', 'BUA'],
  ['umwerfschlag_b', 'BUB'],
] as const;

function sohlen(b: Bild): [number, number][] {
  const z = zugeschnitten(b);
  const aus: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= z.leinwand.breite; x++) {
    const an = x < z.leinwand.breite && deckend(z.leinwand.hole(x, z.ankerY));
    if (an && start < 0) start = x;
    if (!an && start >= 0) {
      aus.push([start - z.ankerX, x - 1 - z.ankerX]);
      start = -1;
    }
  }
  return aus;
}

test('Bolzer und Puppe: über bolzerFiguren() in bauen.ts registriert, Umriss aus masse.ts, alle Animationen nach Auftrag 4, 3', () => {
  const namen = figuren().map((f) => f.name);
  assert.ok(namen.includes('bolzer') && namen.includes('puppe'), 'bolzer und puppe in figuren()');
  assert.deepEqual(
    bolzerFiguren().map((f) => f.name),
    ['bolzer', 'puppe'],
  );
  assert.equal(BOLZER.umriss, UMRISS_GEGNER.Bolzer);
  assert.equal(PUPPE.umriss, UMRISS_GEGNER.Puppe);
  assert.deepEqual(UMRISS_GEGNER.Puppe, UMRISS_GEGNER.Bolzer);
  for (const f of [BOLZER, PUPPE]) {
    assert.deepEqual(
      f.animationen.map((a) => [a.name, a.bilder.length, a.schleife]),
      ERWARTET,
      f.name,
    );
    assert.equal(f.gehen, 'gehen');
    assert.equal(f.schritt, GEHEN_SCHRITT);
  }
  // genau die Angriffe der Logik: BA, BB, BC normal (BOLZER_ANGRIFF_CODES), BUA, BUB Umwerfen (Welt 5.6)
  assert.deepEqual([...BOLZER_ANGRIFF_CODES], ['BA', 'BB', 'BC']);
  assert.deepEqual(
    Object.keys(NAH_ANGRIFFE).filter((c) => c.startsWith('B')),
    ANGRIFFE.map(([, c]) => c),
  );
  assert.ok(anim(BOLZER, 'gehen').bilder.every((b) => b.dauer === GEHEN_DAUER && b.dauer === 4));
  assert.equal(GEHEN_BILDER, 8);
});

test('Bolzer: Umriss im Stand 57 × 67 eingehalten (72 mit Schatten), gedrungen und vorgebeugt', () => {
  const b = zugeschnitten(anim(BOLZER, 'stand').bilder[0] as Bild);
  const hoeheMax = UMRISS_GEGNER.Bolzer.hoehe - SCHATTEN_HOEHE / 2;
  assert.equal(hoeheMax, 67);
  assert.ok(b.leinwand.breite <= UMRISS_GEGNER.Bolzer.breite, `Breite ${b.leinwand.breite}`);
  assert.ok(b.leinwand.hoehe <= hoeheMax && b.leinwand.hoehe >= Math.ceil(0.9 * hoeheMax), `Höhe ${b.leinwand.hoehe}`);
  assert.equal(b.ankerY, b.leinwand.hoehe - 1);
  // kleiner als der Rammbock (Stand 70 px), aber mindestens 60
  const r = zugeschnitten(rammbockAnimationen()[0]?.bilder[0] as Bild);
  assert.ok(b.leinwand.hoehe < r.leinwand.hoehe, `Bolzer ${b.leinwand.hoehe} < Rammbock ${r.leinwand.hoehe}`);
  // vorgebeugt: der Rumpf neigt sich nach vorn
  assert.ok((pose(bolzerHaltungen().stand?.[0] as Parameters<typeof pose>[0]).winkel.Rumpf as number) < -10);
});

test('Bolzer: Farben ≤ 16 je Bild und über alle Bilder, genau die Zuteilung aus docs/grafik.md 4.3', () => {
  for (const { name, i, b } of alleBilder(BOLZER)) assert.ok(farbenZaehlen(b.leinwand) <= FARBBUDGET.figur, `${name} Bild ${i}`);
  const O = OVERALL_BOLZER.treppe;
  const R = SIGNAL_ORANGE.treppe;
  const S = STAHL.treppe;
  const H = HAUT_DUNKEL.treppe;
  const erwartet = new Set([0, KONTUR, O[0], O[1], O[2], O[3], R[1], R[2], S[0], S[1], S[2], S[3], S[4], H[1], H[2], H[3]]);
  const gesamt = farbenMenge(alleBilder(BOLZER).map((x) => x.b.leinwand));
  assert.equal(gesamt.size, FARBBUDGET.figur);
  assert.deepEqual([...gesamt].sort(), [...erwartet].sort());
  assert.deepEqual([...GLANZ_BOLZER], [S[4]]);
  // Streifen an Schultern und Schienbeinen sichtbar (Auftrag 4, 4): Orange im Stand
  const stand = zugeschnitten(anim(BOLZER, 'stand').bilder[0] as Bild).leinwand;
  assert.ok([...stand.daten].filter((p) => p === R[2]).length >= 10, 'Streifen im Stand');
});

test('Puppe: Palettentausch des Bolzers (gleiche Bilder und Anker), grau ohne Streifen und ohne Haut', () => {
  const G = PUPPE_GRAU.treppe;
  const S = STAHL.treppe;
  for (const a of BOLZER.animationen) {
    const p = anim(PUPPE, a.name);
    assert.equal(p.schleife, a.schleife);
    assert.deepEqual(p.aktiv, a.aktiv, a.name);
    a.bilder.forEach((b, i) => {
      const q = p.bilder[i] as Bild;
      assert.equal(q.dauer, b.dauer);
      assert.deepEqual([q.ankerX, q.ankerY, q.leinwand.breite, q.leinwand.hoehe], [b.ankerX, b.ankerY, b.leinwand.breite, b.leinwand.hoehe], `${a.name} ${i}`);
      for (let k = 0; k < b.leinwand.daten.length; k++) {
        const von = b.leinwand.daten[k] as number;
        assert.equal(q.leinwand.daten[k], PUPPE_TAUSCH.get(von) ?? von, `${a.name} ${i} Pixel ${k}`);
      }
    });
  }
  const erlaubt = new Set([0, KONTUR, G[0], G[1], G[2], G[3], S[0], S[1], S[2], S[3], S[4]]);
  const gesamt = farbenMenge(alleBilder(PUPPE).map((x) => x.b.leinwand));
  for (const f of gesamt) assert.ok(erlaubt.has(f), `Farbe ${f.toString(16)} der Puppe`);
  assert.ok(gesamt.size <= FARBBUDGET.figur);
  // keine Streifen, keine Haut: kein Orange, kein HAUT_DUNKEL
  for (const f of [...SIGNAL_ORANGE.treppe, ...HAUT_DUNKEL.treppe]) assert.ok(!gesamt.has(f));
});

test('Bolzer und Puppe: Kontur geschlossen, keine Streupixel (außer Glanz), unterstes Pixel auf der Ankerzeile, Stilprüfung bestanden', () => {
  for (const f of [BOLZER, PUPPE]) {
    for (const { name, i, b } of alleBilder(f)) {
      assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${f.name} ${name} Bild ${i}: Kontur`);
      assert.deepEqual(streupixel(b.leinwand, GLANZ_BOLZER), [], `${f.name} ${name} Bild ${i}: Streupixel`);
      assert.ok(b.ankerX >= 0 && b.ankerX < b.leinwand.breite, `${f.name} ${name} Bild ${i}: ankerX`);
      assert.equal(b.ankerY, b.leinwand.hoehe - 1, `${f.name} ${name} Bild ${i}: ankerY`);
    }
    assert.deepEqual(figurPruefen(f), [], f.name);
  }
});

test('Bolzer: Fußkontakt beim Gehen, Standfuß rückt je Bild genau 7 px zurück (56 px je Zyklus)', () => {
  assert.equal(GEHEN_SCHRITT, (4 * BOLZER_GEHEN_X) / EINS);
  assert.equal(GEHEN_SCHRITT, 7);
  const versatz = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(gehVersatz);
  assert.deepEqual(versatz, [0, 7, 14, 21, 28, 35, 42, 49, 56]);
  for (const f of [BOLZER, PUPPE]) {
    const s = anim(f, 'gehen').bilder.map(sohlen);
    for (let i = 0; i < GEHEN_BILDER; i++) {
      const a = s[i] as [number, number][];
      const c = s[(i + 1) % GEHEN_BILDER] as [number, number][];
      const ok = a.some((p) => c.some((q) => q[0] - p[0] === -7 || q[1] - p[1] === -7));
      assert.ok(ok, `${f.name} Bild ${i} → ${(i + 1) % GEHEN_BILDER}: 7 px (Sohlen ${JSON.stringify(a)} → ${JSON.stringify(c)})`);
    }
  }
  const h = gehen();
  for (const seite of ['V', 'H'] as const) {
    let flach = 0;
    for (let i = 0; i < h.length; i++) {
      const a = h[i] as (typeof h)[number];
      const b = h[(i + 1) % h.length] as (typeof h)[number];
      const fa = seite === 'V' ? a.beinV : a.beinH;
      const fb = seite === 'V' ? b.beinV : b.beinH;
      if (fa.fuss === 0 && fb.fuss === 0 && fa.knoechel.y === fb.knoechel.y) {
        assert.equal(fa.knoechel.x - fb.knoechel.x, 7, `${seite} Bild ${i}`);
        flach++;
      }
      const lage = PUPPE_BOLZER.lagen(pose(a)).get(`Stiefel${seite}`);
      assert.ok(lage !== undefined && Math.hypot(lage.pos.x - fa.knoechel.x, lage.pos.y - fa.knoechel.y) < 1e-6, `${seite} Bild ${i}: Knöchel am Ziel`);
    }
    assert.equal(flach, 2, `${seite}: zwei Bildpaare mit flachem Standfuß`);
  }
  assert.equal(GEHEN_SCHNELL_DAUER, Math.round((4 * BOLZER_GEHEN_X) / BOLZER_SCHNELL_X));
  anim(BOLZER, 'gehen_schnell').bilder.forEach((b, i) => {
    assert.equal(b.dauer, GEHEN_SCHNELL_DAUER);
    assert.ok(b.leinwand.gleich((anim(BOLZER, 'gehen').bilder[i] as Bild).leinwand));
    assert.ok(b.leinwand.gleich((anim(BOLZER, 'auftritt_versteck').bilder[i] as Bild).leinwand));
  });
});

test('Bolzer: Angriffe BA, BB, BC, BUA, BUB: Ausholen über den Startup, Trefferbild in allen aktiven Frames mit der größten Reichweite', () => {
  for (const [name, code] of ANGRIFFE) {
    const a = anim(BOLZER, name);
    const w = NAH_ANGRIFFE[code];
    const dauern = angriffDauern(code);
    const treffer = trefferBild(code);
    assert.equal(treffer, 2, `${name}: Ausholen 2, aktiv 1, Rückzug 2`);
    assert.deepEqual(a.aktiv, [treffer], name);
    assert.deepEqual(
      a.bilder.map((b) => b.dauer),
      [...dauern],
      name,
    );
    assert.equal(summe(dauern.slice(0, treffer)), w.startup, `${name}: Ausholen = Startup`);
    assert.equal(dauern[treffer], w.aktiv_bis - w.aktiv_von + 1, `${name}: aktive Frames`);
    // fester Rückzug, sonst Richtwert für die ersten Frames des Nachlaufs (BB, BUB: Rückzug 0; G2-4)
    assert.equal(summe(dauern.slice(treffer + 1)), w.rueckzug > 0 ? w.rueckzug : RUECKZUG_RICHTWERT, `${name}: Rückzug`);
    for (let d = 0; d < w.startup; d++) assert.ok(bildBeiAbstand(dauern, d) < treffer, `${name} A+${d}`);
    for (let d = w.aktiv_von; d <= w.aktiv_bis; d++) assert.equal(bildBeiAbstand(dauern, d), treffer, `${name} A+${d}`);
    const v = a.bilder.map((roh) => {
      const b = zugeschnitten(roh);
      return b.leinwand.breite - 1 - b.ankerX;
    });
    assert.equal(Math.max(...v), v[treffer], `${name}: Reichweite ${v.join(', ')}`);
    assert.ok((v[treffer] as number) <= ZIELABSTAND_MAX, `${name}: Reichweite ${v[treffer]}`);
  }
  // der schnelle Schlag BB holt in 4 Frames aus (2 / 2)
  assert.deepEqual([...angriffDauern('BB')], [2, 2, 10, 3, 3]);
});

test('Zeiten aus werte.ts (bolzer_gemeinsam.ts): Trefferreaktion, Flugbahnen F1 bis F4, Aufstehen, Spott, Hocke', () => {
  assert.deepEqual([...GETROFFEN_DAUERN], [9, 12, 2]);
  assert.equal(summe(GETROFFEN_DAUERN), REAKTION_DAUER);
  REAKTION_ANIMATION.forEach((ab, k) => assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab), k, `h+${ab}`));
  // F1: Stillstand W+1 bis W+8, Steigen 19 Bahnframes, Bodenkontakt W+46, Ruhe W+55
  assert.equal(STEIGEN, Math.ceil(F1_VH / F1_GH));
  assert.equal(STEIGEN, 19);
  assert.deepEqual([...UMGEWORFEN_DAUERN], [8, 19, 18, 5, 4]);
  assert.equal(bildBeiUhr(UMGEWORFEN_DAUERN, F1_STILLSTAND), 0);
  assert.equal(bildBeiUhr(UMGEWORFEN_DAUERN, F1_STILLSTAND + 1), 1);
  assert.equal(bildBeiUhr(UMGEWORFEN_DAUERN, F1_BODEN), 3, 'Aufprall beim Bodenkontakt');
  assert.equal(summe(UMGEWORFEN_DAUERN), F1_RUHE - 1, 'bis vor die Ruhe (dann LIEGEN)');
  assert.equal(bildBeiUhr(UMGEWORFEN_F2_DAUERN, F2_BODEN), 3);
  assert.equal(summe(UMGEWORFEN_F2_DAUERN), F2_RUHE - 1);
  // F4 Tod: Stillstand 2, Bodenkontakt t+40, Ruhe t+49, liegend bis zum Freiwerden t+79
  assert.deepEqual([...TOT_DAUERN], [2, 19, 18, 5, 4, 30]);
  assert.equal(bildBeiUhr(TOT_DAUERN, F4_STILLSTAND + 1), 1);
  assert.equal(bildBeiUhr(TOT_DAUERN, F4_BODEN), 3);
  assert.equal(bildBeiUhr(TOT_DAUERN, F4_RUHE), 5);
  assert.equal(summe(TOT_DAUERN), SLOT_FREI_TOD - 1);
  // F3 Wurf: getragen bis E+21, losgelassen E+22, Flug ab E+23 bis vor den Bodenkontakt E+59, Ruhe E+71
  assert.equal(GEWORFEN_DAUERN[0], WURF_LOSLASSEN);
  assert.equal(bildBeiUhr(GEWORFEN_DAUERN, WURF_TRAGEN_BIS), 0);
  assert.equal(bildBeiUhr(GEWORFEN_DAUERN, F3_ERSTER), 1);
  assert.equal(summe(GEWORFEN_DAUERN), F3_BODEN - 1);
  assert.equal(summe(GEWORFEN_DAUERN) + summe(GEWORFEN_AUFPRALL), F3_RUHE - 1);
  // Aufstehen 18 Frames, Spott 42, Hocke so lang wie der Auftritt
  assert.deepEqual([...AUFSTEHEN_DAUERN], [3, 3, 3, 3, 3, 3]);
  assert.equal(summe(AUFSTEHEN_DAUERN), AUFSTEHEN_GEGNER);
  assert.equal(summe(SPOTT_DAUERN), SPOTT_DAUER);
  assert.deepEqual([...AUFSTEHEN_HOCKE_DAUERN], [...aufstehenHockeDauern(AUFTRITT_HOCKE_BOLZER)]);
  assert.equal(summe(AUFSTEHEN_HOCKE_DAUERN), AUFTRITT_HOCKE_BOLZER);
  const dauern = (n: string): number[] => anim(BOLZER, n).bilder.map((b) => b.dauer);
  assert.deepEqual(dauern('getroffen'), [...GETROFFEN_DAUERN]);
  assert.deepEqual(dauern('umgeworfen'), [...UMGEWORFEN_DAUERN]);
  assert.deepEqual(dauern('tot'), [...TOT_DAUERN]);
  assert.deepEqual(dauern('geworfen'), [...GEWORFEN_DAUERN]);
  assert.deepEqual(dauern('spott'), [...SPOTT_DAUERN]);
  const tot = anim(BOLZER, 'tot').bilder;
  anim(BOLZER, 'umgeworfen').bilder.forEach((b, i) => assert.ok(b.leinwand.gleich((tot[i] as Bild).leinwand)));
  assert.ok((tot[5] as Bild).leinwand.gleich((anim(BOLZER, 'liegen').bilder[0] as Bild).leinwand));
  const liegen = zugeschnitten(anim(BOLZER, 'liegen').bilder[0] as Bild);
  assert.ok(liegen.leinwand.breite > 2 * liegen.leinwand.hoehe, 'liegend flach');
});

test('Gesichtsmaske gedreht (G2-2): ungedreht unverändert, Vierteldrehungen drehen das Raster um die mitwandernde Mitte', () => {
  const g = { teil: 'Kopf', ursprung: { x: 3, y: -11 }, zeilen: ['bbbb', '.kk.', '.kk.'], farben: {} };
  assert.equal(gesichtGedreht(g, 0), g);
  const v = gesichtGedreht(g, 90);
  // rechts → oben (wie drehe(v, 90)): die Braue (oben) liegt danach links
  assert.deepEqual(v.zeilen, ['b..', 'bkk', 'bkk', 'b..']);
  // Mitte der gedrehten Maske = gedrehte Mitte der ungedrehten
  const mitteAlt = drehe({ x: 3 + 2, y: -11 + 1.5 }, 90);
  const ecke = drehe(v.ursprung, 90);
  assert.ok(Math.abs(ecke.x + 1.5 - mitteAlt.x) < 1e-9 && Math.abs(ecke.y + 2 - mitteAlt.y) < 1e-9);
  assert.deepEqual(gesichtGedreht(g, 180).zeilen, ['.kk.', '.kk.', 'bbbb']);
});

test('Bolzer und Puppe: Determinismus, zwei Bauläufe geben gleiche Bytes für Blatt, Atlas und Kontaktbögen', () => {
  for (const name of ['bolzer', 'puppe']) {
    const summen = (): [string, string][] =>
      [...figurBytes(bolzerFiguren().find((f) => f.name === name) as Figur)].map(([k, v]) => [k, typeof v === 'string' ? md5(new TextEncoder().encode(v)) : md5(v)]);
    const a = summen();
    assert.deepEqual(
      a.map(([k]) => k),
      [`${name}.png`, `${name}.json`, ...ERWARTET.map(([n]) => `kontakt_${name}_${n}.png`)],
    );
    assert.deepEqual(a, summen(), name);
  }
});

test('Ausgabe: spiel/grafik/ausgabe/bolzer.png, puppe.png mit Atlas entsprechen dem Bau (npm run grafik)', () => {
  for (const f of [BOLZER, PUPPE]) {
    const png = SPIEL + `grafik/ausgabe/${f.name}.png`;
    const json = SPIEL + `grafik/ausgabe/${f.name}.json`;
    assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
    const blatt = blattPacken(f.name, f.animationen);
    assert.ok(pngDateiLesen(png).gleich(blatt.leinwand), `Pixel von ${f.name}.png`);
    assert.equal(readFileSync(json, 'utf8'), atlasText(blatt.atlas));
    for (const [n] of ERWARTET) assert.ok(existsSync(SPIEL + `../docs/bilder/kontakt_${f.name}_${n}.png`), `kontakt_${f.name}_${n}.png`);
  }
});
