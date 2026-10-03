// Tests der Zünder-Gliederpuppe (Auftrag 4, Phase 2, G3): Registrierung in
// bauen.ts, Vollständigkeit der Animationen nach Auftrag 4, 3, Stilprüfung
// (docs/grafik.md 2.5), Umriss im Stand, Farben ≤ 16 mit der Zuteilung aus
// docs/grafik.md 4.5, Anker auf der untersten Zeile, Fußkontakt beim Gehen
// (7 px je Bild), Zielen 60 Frames mit leuchtendem Visier, Schuss 5/1/10/1
// mit Rakete in A+6, Trefferbild des Kolbenhiebs im ersten aktiven Frame mit
// der größten Reichweite, Bildwechsel der Trefferreaktion, Dauern der
// Bahnen, Tod ohne Raketenwerfer, Determinismus und Stand der Ausgabe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { atlasText, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Figur } from '../grafik/quelle/bauen.ts';
import { figurBytes, figurPruefen, figuren, md5 } from '../grafik/quelle/bauen.ts';
import {
  AUFSTEHEN_DAUERN,
  GEHEN_BILDER,
  GEHEN_DAUER,
  GEHEN_SCHNELL_DAUER,
  GEHEN_SCHRITT,
  GETROFFEN_DAUERN,
  GLANZ_ZUENDER,
  KOLBEN_DAUERN,
  SCHUSS_DAUERN,
  TOT_DAUERN,
  UMGEWORFEN_DAUERN,
  ZIELEN_DAUERN,
  bildBeiAbstand,
  bildBeiUhr,
  gehVersatz,
  kolbenTrefferBild,
  schussRaketenBild,
  zuenderFiguren,
} from '../grafik/quelle/figuren/zuender.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, KONTUR, LEDER, ROHR_GRUEN, STAHL, UNIFORM_ZUENDER, VISIER_ORANGE, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { pngDateiLesen, pngSchreiben } from '../grafik/quelle/png.ts';
import { kontaktBogen } from '../grafik/quelle/kontakt.ts';
import { SCHATTEN_HOEHE, UMRISS_GEGNER } from '../src/darstellung/masse.ts';
import {
  AUFSTEHEN_GEGNER,
  F1_RUHE,
  F4_RUHE,
  NAH_ANGRIFFE,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  SCHUSS_DAUER,
  ZIELABSTAND_MAX,
  ZIELEN_DAUER,
  ZR_RAKETE_AB,
  ZUENDER_GEHEN_X,
  ZUENDER_SCHNELL_X,
} from '../src/kern/werte.ts';
import { EINS } from '../src/kern/festkomma.ts';

const ZUENDER = zuenderFiguren()[0] as Figur;
const anim = (name: string): Animation => {
  const a = ZUENDER.animationen.find((x) => x.name === name);
  assert.ok(a !== undefined, `Animation ${name}`);
  return a;
};
const alleBilder = (): { name: string; i: number; b: Bild }[] => ZUENDER.animationen.flatMap((a) => a.bilder.map((b, i) => ({ name: a.name, i, b: zugeschnitten(b) })));
const summe = (z: readonly number[]): number => z.reduce((a, b) => a + b, 0);
const zaehle = (b: Bild, farben: ReadonlySet<Pixel>): number => {
  let n = 0;
  for (const p of b.leinwand.daten) if (farben.has(p)) n++;
  return n;
};

/** Läufe deckender Pixel auf der Ankerzeile (Kontur unter den Sohlen), x relativ zum Anker. */
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

test('Zünder: registriert in bauen.ts, Animationen nach Auftrag 4, 3 und den Modi aus FernModus', () => {
  const reg = figuren().find((f) => f.name === 'zuender');
  assert.ok(reg !== undefined, 'Figur zuender in figuren()');
  assert.equal(ZUENDER.umriss, UMRISS_GEGNER['Zünder']);
  assert.equal(ZUENDER.gehen, 'gehen');
  assert.deepEqual(
    ZUENDER.animationen.map((a) => [a.name, a.bilder.length, a.schleife]),
    [
      ['stand', 1, true],
      ['gehen', 8, true],
      ['gehen_schnell', 8, true],
      ['zielen', 4, true],
      ['schuss', 4, false],
      ['kolbenhieb', 5, false],
      ['getroffen', 3, false],
      ['umgeworfen', 5, false],
      ['liegen', 1, true],
      ['aufstehen', 6, false],
      ['tot', 5, false],
      ['gehalten', 1, true],
    ],
  );
});

test('Zünder: Stilprüfung bestanden (Kontur, Streupixel, Farben, Anker, Umriss, Fußkontakt)', () => {
  assert.deepEqual(figurPruefen(ZUENDER), []);
  for (const { name, i, b } of alleBilder()) {
    assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${name} Bild ${i}: Kontur`);
    assert.deepEqual(streupixel(b.leinwand, GLANZ_ZUENDER), [], `${name} Bild ${i}: Streupixel`);
  }
});

test('Zünder: Umriss im Stand 64 × 67 eingehalten (72 mit Schatten)', () => {
  const b = zugeschnitten(anim('stand').bilder[0] as Bild);
  const hoeheMax = UMRISS_GEGNER['Zünder'].hoehe - SCHATTEN_HOEHE / 2;
  assert.equal(hoeheMax, 67);
  assert.ok(b.leinwand.breite <= UMRISS_GEGNER['Zünder'].breite, `Breite ${b.leinwand.breite}`);
  assert.ok(b.leinwand.hoehe <= hoeheMax && b.leinwand.hoehe >= 64, `Höhe ${b.leinwand.hoehe}`);
});

test('Zünder: Farben ≤ 16 je Bild und gesamt, genau die Zuteilung aus docs/grafik.md 4.5', () => {
  for (const { name, i, b } of alleBilder()) assert.ok(farbenZaehlen(b.leinwand) <= FARBBUDGET.figur, `${name} Bild ${i}`);
  const U = UNIFORM_ZUENDER.treppe;
  const S = STAHL.treppe;
  const V = VISIER_ORANGE.treppe;
  const R = ROHR_GRUEN.treppe;
  const L = LEDER.treppe;
  const erwartet = new Set<Pixel>([0, KONTUR, U[1], U[2], U[3], S[1], S[2], S[3], S[4], V[1], V[2], V[4], R[1], R[2], R[3], L[2]]);
  const gesamt = farbenMenge(alleBilder().map((x) => x.b.leinwand));
  assert.equal(gesamt.size, FARBBUDGET.figur);
  assert.deepEqual([...gesamt].sort(), [...erwartet].sort());
  assert.deepEqual([...GLANZ_ZUENDER].sort(), [S[4], V[4]].sort());
});

test('Zünder: jedes Bild steht mit seiner untersten Zeile auf der Ankerzeile, Anker im Bild (G3-2)', () => {
  for (const { name, i, b } of alleBilder()) {
    assert.equal(b.ankerY, b.leinwand.hoehe - 1, `${name} Bild ${i}: ankerY`);
    assert.ok(b.ankerX >= 0 && b.ankerX < b.leinwand.breite, `${name} Bild ${i}: ankerX ${b.ankerX}`);
  }
});

test('Zünder: Fußkontakt beim Gehen, Standfuß rückt je Bild genau 7 px zurück (4 Frames zu 1,75 px)', () => {
  assert.equal(GEHEN_SCHRITT, (GEHEN_DAUER * ZUENDER_GEHEN_X) / EINS);
  assert.equal(GEHEN_SCHRITT, 7);
  assert.equal(GEHEN_BILDER, 8);
  assert.ok(anim('gehen').bilder.every((b) => b.dauer === 4));
  const s = anim('gehen').bilder.map(sohlen);
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const soll = gehVersatz(i + 1) - gehVersatz(i);
    assert.equal(soll, 7);
    const a = s[i] as [number, number][];
    const c = s[(i + 1) % GEHEN_BILDER] as [number, number][];
    const ok = a.some((p) => c.some((q) => q[0] - p[0] === -soll || q[1] - p[1] === -soll));
    assert.ok(ok, `Bild ${i} → ${(i + 1) % GEHEN_BILDER}: ${JSON.stringify(a)} → ${JSON.stringify(c)}`);
  }
  // schnell (2,25 px/Frame): dieselben Bilder, Dauer so, dass der Schritt von 7 px passt (7 / 2,25 ≈ 3)
  assert.equal(GEHEN_SCHNELL_DAUER, Math.round(7 / (ZUENDER_SCHNELL_X / EINS)));
  assert.equal(GEHEN_SCHNELL_DAUER, 3);
  const schnell = anim('gehen_schnell');
  assert.ok(schnell.bilder.every((b, i) => b.dauer === 3 && b.leinwand.gleich((anim('gehen').bilder[i] as Bild).leinwand)));
});

test('Zünder: Zielen 4 Bilder über 60 Frames, Rohr waagrecht, Visier leuchtet', () => {
  assert.equal(summe(ZIELEN_DAUERN), ZIELEN_DAUER);
  assert.deepEqual(
    anim('zielen').bilder.map((b) => b.dauer),
    [...ZIELEN_DAUERN],
  );
  const glut = new Set<Pixel>([VISIER_ORANGE.treppe[4]]);
  const stand = zaehle(zugeschnitten(anim('stand').bilder[0] as Bild), glut);
  for (const b of anim('zielen').bilder) assert.ok(zaehle(zugeschnitten(b), glut) >= 15 * Math.max(1, stand), 'Visier leuchtet');
  // Abtastlinie wandert: die Bilder unterscheiden sich
  const bilder = anim('zielen').bilder;
  assert.ok(!(bilder[0] as Bild).leinwand.gleich((bilder[1] as Bild).leinwand));
});

test('Zünder: Schuss 5/1/10/1 = 17 Frames, Rückstoßbild mit Rückstrahl ab A+6 (Rakete)', () => {
  assert.deepEqual([...SCHUSS_DAUERN], [5, 1, 10, 1]);
  assert.equal(summe(SCHUSS_DAUERN), SCHUSS_DAUER);
  const a = anim('schuss');
  assert.deepEqual(a.aktiv, [schussRaketenBild()]);
  assert.equal(schussRaketenBild(), 2);
  assert.equal(bildBeiAbstand(SCHUSS_DAUERN, ZR_RAKETE_AB), 2);
  assert.equal(bildBeiAbstand(SCHUSS_DAUERN, ZR_RAKETE_AB - 1), 1);
  // Rückstrahl hinter dem Rohr: das Bild ragt weiter nach hinten als das Anlegen
  const hinten = a.bilder.map((b) => zugeschnitten(b).ankerX);
  assert.ok((hinten[2] as number) > (hinten[0] as number) + 5, `hinten ${hinten.join(', ')}`);
});

test('Zünder: Kolbenhieb wie BA, Trefferbild in A+9 bis A+13 mit der größten Reichweite', () => {
  const ba = NAH_ANGRIFFE.BA;
  const a = anim('kolbenhieb');
  const t = kolbenTrefferBild();
  assert.equal(t, 2);
  assert.deepEqual(a.aktiv, [t]);
  assert.deepEqual([...KOLBEN_DAUERN], [5, 4, 5, 3, 2]);
  assert.equal(summe(KOLBEN_DAUERN.slice(0, t)), ba.startup);
  assert.equal(KOLBEN_DAUERN[t], ba.aktiv_bis - ba.aktiv_von + 1);
  assert.equal(summe(KOLBEN_DAUERN.slice(t + 1)), ba.rueckzug);
  for (let d = 0; d < ba.startup; d++) assert.ok(bildBeiAbstand(KOLBEN_DAUERN, d) < t, `A+${d}: Ausholen`);
  for (let d = ba.aktiv_von; d <= ba.aktiv_bis; d++) assert.equal(bildBeiAbstand(KOLBEN_DAUERN, d), t, `A+${d}: Trefferbild`);
  const vorn = a.bilder.map((roh) => {
    const b = zugeschnitten(roh);
    return b.leinwand.breite - 1 - b.ankerX;
  });
  assert.equal(Math.max(...vorn), vorn[t], `Reichweite ${vorn.join(', ')}`);
  assert.ok((vorn[t] as number) >= 40 && (vorn[t] as number) <= ZIELABSTAND_MAX, `Reichweite ${vorn[t]}`);
});

test('Zünder: getroffen wechselt bei h+1, h+10, h+22; Bahnen und Aufstehen nach werte.ts', () => {
  assert.deepEqual([...GETROFFEN_DAUERN], [9, 12, 2]);
  assert.equal(summe(GETROFFEN_DAUERN), REAKTION_DAUER);
  REAKTION_ANIMATION.forEach((ab, k) => assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab), k, `h+${ab}`));
  assert.equal(summe(UMGEWORFEN_DAUERN), F1_RUHE);
  assert.equal(summe(AUFSTEHEN_DAUERN), AUFSTEHEN_GEGNER);
  assert.equal(summe(TOT_DAUERN), F4_RUHE);
  for (const [n, d] of [
    ['getroffen', GETROFFEN_DAUERN],
    ['umgeworfen', UMGEWORFEN_DAUERN],
    ['aufstehen', AUFSTEHEN_DAUERN],
    ['tot', TOT_DAUERN],
  ] as const) {
    assert.deepEqual(
      anim(n).bilder.map((b) => b.dauer),
      [...d],
      n,
    );
  }
  // liegend: flach (höchstens 26 px hoch), breiter als hoch
  const liegen = zugeschnitten(anim('liegen').bilder[0] as Bild);
  assert.ok(liegen.leinwand.hoehe <= 26 && liegen.leinwand.breite > 2 * liegen.leinwand.hoehe, `${liegen.leinwand.breite} × ${liegen.leinwand.hoehe}`);
});

test('Zünder: ab dem Tod ohne Raketenwerfer (die Waffe liegt als Gegenstand), sonst immer mit Rohr', () => {
  const gruen = new Set<Pixel>([ROHR_GRUEN.treppe[1], ROHR_GRUEN.treppe[2], ROHR_GRUEN.treppe[3]]);
  for (const a of ZUENDER.animationen) {
    a.bilder.forEach((roh, i) => {
      const n = zaehle(zugeschnitten(roh), gruen);
      if (a.name === 'tot') assert.equal(n, 0, `tot Bild ${i}: kein Rohr`);
      else assert.ok(n >= 20, `${a.name} Bild ${i}: Rohr sichtbar (${n} px)`);
    });
  }
});

test('Zünder: Determinismus, zwei Bauläufe geben gleiche Bytes für Blatt, Atlas und Kontaktbögen', () => {
  const summen = (): [string, string][] => [...figurBytes(zuenderFiguren()[0] as Figur)].map(([k, v]) => [k, typeof v === 'string' ? md5(new TextEncoder().encode(v)) : md5(v)]);
  const a = summen();
  assert.deepEqual(a, summen());
  assert.equal(a.length, 2 + ZUENDER.animationen.length);
});

test('Ausgabe: grafik/ausgabe/zuender.png und .json und die Kontaktbögen entsprechen dem Bau', () => {
  const png = SPIEL + 'grafik/ausgabe/zuender.png';
  const json = SPIEL + 'grafik/ausgabe/zuender.json';
  assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
  const blatt = blattPacken('zuender', ZUENDER.animationen);
  assert.ok(pngDateiLesen(png).gleich(blatt.leinwand), 'Pixel des Blatts');
  assert.equal(readFileSync(json, 'utf8'), atlasText(blatt.atlas));
  for (const a of ZUENDER.animationen) {
    const datei = SPIEL + `../docs/bilder/kontakt_zuender_${a.name}.png`;
    assert.ok(existsSync(datei), `kontakt_zuender_${a.name}.png`);
    assert.ok(pngDateiLesen(datei).gleich(kontaktBogen(a)), `kontakt_zuender_${a.name}.png aktuell`);
  }
  assert.ok(pngSchreiben(blatt.leinwand).length > 0);
});
