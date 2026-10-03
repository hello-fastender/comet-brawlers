// Tests der Ballast-Gliederpuppe (Auftrag 4, Phase 2, G3): Registrierung in
// bauen.ts, Vollständigkeit der Animationen nach Auftrag 4, 3 (ohne kurzen
// Schlag und Griff, E21), Stilprüfung (docs/grafik.md 2.5), Umriss im Stand,
// Farben ≤ 16 mit der Zuteilung aus docs/grafik.md 4.6, Anker auf der
// untersten Zeile, Fußkontakt beim Gehen (10 px je Bild) und beim Ansturm
// (16 px), Ankündigung mindestens 15 Frames mit leuchtender Brille,
// Armschwung als Folge mit Trefferbildern im ersten aktiven Frame jedes
// Schwungs, Körperpresse, Stoß 54 Frames, Trefferreaktion, Bahnen, Fall,
// Auftritt, Taumeln, Determinismus und Stand der Ausgabe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { atlasText, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Figur } from '../grafik/quelle/bauen.ts';
import { figurBytes, figurPruefen, figuren, md5 } from '../grafik/quelle/bauen.ts';
import {
  ANKUENDIGUNG_DAUERN,
  ANSTURM_DAUER,
  ANSTURM_SCHRITT,
  AUFSTEHEN_DAUERN,
  AUFTRITT_DAUERN,
  FALL_DAUERN,
  GEHEN_BILDER,
  GEHEN_DAUER,
  GEHEN_SCHRITT,
  GETROFFEN_DAUERN,
  GLANZ_BALLAST,
  PRESSE_DAUERN,
  SCHWUNG_BILDER,
  SCHWUNG_DAUERN,
  STOSS_DAUERN,
  TAUMELN_DAUERN,
  UMGEWORFEN_DAUERN,
  armschwungAktiv,
  ballastFiguren,
  bildBeiAbstand,
  bildBeiUhr,
  presseTrefferBild,
  schwungTrefferBild,
} from '../grafik/quelle/figuren/ballast.ts';
import { kontaktBogen } from '../grafik/quelle/kontakt.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { BRILLE_GLUT, FARBBUDGET, HAUT_HELL, HEMD_BALLAST, HOSE_DUNKELGRAU, KONTUR, SIGNAL_ORANGE, STAHL, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import { SCHATTEN_HOEHE, UMRISS_GEGNER } from '../src/darstellung/masse.ts';
import {
  AN_V,
  AS_AKTIV_BIS,
  AS_AKTIV_VON,
  AS_AUSHOLEN,
  AS_NAECHSTER,
  AS_SCHWUENGE_MAX,
  AUFSTEHEN_GEGNER,
  AUFTRITT_BOSS,
  BOSS_GEHEN_X,
  BOSS_TAUMELN_DAUER,
  F1_RUHE,
  F4_RUHE,
  KP_AKTIV_VON,
  KP_HOCKE,
  KP_LANDUNG,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  RZ_DAUER,
  RZ_SCHNELL_FRAMES,
} from '../src/kern/werte.ts';
import { EINS } from '../src/kern/festkomma.ts';

const BALLAST = ballastFiguren()[0] as Figur;
const anim = (name: string): Animation => {
  const a = BALLAST.animationen.find((x) => x.name === name);
  assert.ok(a !== undefined, `Animation ${name}`);
  return a;
};
const alleBilder = (): { name: string; i: number; b: Bild }[] => BALLAST.animationen.flatMap((a) => a.bilder.map((b, i) => ({ name: a.name, i, b: zugeschnitten(b) })));
const summe = (z: readonly number[]): number => z.reduce((a, b) => a + b, 0);
const zaehle = (b: Bild, farbe: Pixel): number => {
  let n = 0;
  for (const p of zugeschnitten(b).leinwand.daten) if (p === farbe) n++;
  return n;
};
const vorn = (roh: Bild): number => {
  const b = zugeschnitten(roh);
  return b.leinwand.breite - 1 - b.ankerX;
};

/** Läufe deckender Pixel auf der Ankerzeile, x relativ zum Anker. */
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

/** Eine Sohle rückt zwischen a und c um genau schritt px zurück (Anfang oder Ende eines Laufs). */
function rueckt(a: Bild, c: Bild, schritt: number): boolean {
  const sa = sohlen(a);
  const sc = sohlen(c);
  return sa.some((p) => sc.some((q) => q[0] - p[0] === -schritt || q[1] - p[1] === -schritt));
}

test('Ballast: registriert in bauen.ts, Animationen nach Auftrag 4, 3 (ohne kurzen Schlag und Griff, E21)', () => {
  assert.ok(
    figuren().some((f) => f.name === 'ballast'),
    'Figur ballast in figuren()',
  );
  assert.equal(BALLAST.umriss, UMRISS_GEGNER.Ballast);
  assert.deepEqual(
    BALLAST.animationen.map((a) => [a.name, a.bilder.length, a.schleife]),
    [
      ['stand', 2, true],
      ['gehen', 5, true],
      ['ankuendigung', 2, true],
      ['armschwung', 15, false],
      ['ansturm', 4, true],
      ['ansturm_bremsen', 1, false],
      ['koerperpresse', 7, false],
      ['stoss_rueckzug', 4, false],
      ['getroffen', 3, false],
      ['umgeworfen', 5, false],
      ['liegen', 1, true],
      ['aufstehen', 6, false],
      ['fall', 6, false],
      ['auftritt', 4, false],
      ['taumeln', 4, false],
      ['gehalten', 1, true],
    ],
  );
  assert.ok(!BALLAST.animationen.some((a) => a.name === 'kurzer_schlag' || a.name === 'griff'));
});

test('Ballast: Stilprüfung bestanden (Kontur, Streupixel, Farben, Anker, Umriss, Fußkontakt)', () => {
  assert.deepEqual(figurPruefen(BALLAST), []);
  for (const { name, i, b } of alleBilder()) {
    assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${name} Bild ${i}: Kontur`);
    assert.deepEqual(streupixel(b.leinwand, GLANZ_BALLAST), [], `${name} Bild ${i}: Streupixel`);
  }
});

test('Ballast: Umriss im Stand 70 × 95 eingehalten (100 mit Schatten), beide Atembilder', () => {
  const hoeheMax = UMRISS_GEGNER.Ballast.hoehe - SCHATTEN_HOEHE / 2;
  assert.equal(hoeheMax, 95);
  for (const roh of anim('stand').bilder) {
    const b = zugeschnitten(roh);
    assert.ok(b.leinwand.breite <= UMRISS_GEGNER.Ballast.breite, `Breite ${b.leinwand.breite}`);
    assert.ok(b.leinwand.hoehe <= hoeheMax && b.leinwand.hoehe >= 0.9 * hoeheMax, `Höhe ${b.leinwand.hoehe}`);
  }
  // riesig: deutlich größer als der Zünder (67) und der Rammbock (71)
  assert.ok(zugeschnitten(anim('stand').bilder[0] as Bild).leinwand.hoehe >= 90);
  const [a, b] = anim('stand').bilder as [Bild, Bild];
  assert.ok(!a.leinwand.gleich(b.leinwand), 'atmend: zwei verschiedene Bilder');
});

test('Ballast: Farben ≤ 16 je Bild und gesamt, genau die Zuteilung aus docs/grafik.md 4.6', () => {
  for (const { name, i, b } of alleBilder()) assert.ok(farbenZaehlen(b.leinwand) <= FARBBUDGET.figur, `${name} Bild ${i}`);
  const H = HAUT_HELL.treppe;
  const M = HEMD_BALLAST.treppe;
  const D = HOSE_DUNKELGRAU.treppe;
  const S = STAHL.treppe;
  const erwartet = new Set<Pixel>([0, KONTUR, H[1], H[2], H[3], M[1], M[2], M[3], D[1], D[2], S[1], S[2], S[3], S[4], SIGNAL_ORANGE.treppe[2], BRILLE_GLUT]);
  const gesamt = farbenMenge(alleBilder().map((x) => x.b.leinwand));
  assert.equal(gesamt.size, FARBBUDGET.figur);
  assert.deepEqual([...gesamt].sort(), [...erwartet].sort());
});

test('Ballast: jedes Bild steht mit seiner untersten Zeile auf der Ankerzeile, Anker im Bild (G3-2)', () => {
  for (const { name, i, b } of alleBilder()) {
    assert.equal(b.ankerY, b.leinwand.hoehe - 1, `${name} Bild ${i}: ankerY`);
    assert.ok(b.ankerX >= 0 && b.ankerX < b.leinwand.breite, `${name} Bild ${i}: ankerX ${b.ankerX}`);
  }
});

test('Ballast: Gehen 5 Bilder zu 8 Frames, Standfuß rückt je Bild genau 10 px zurück (1,25 px/Frame)', () => {
  assert.equal(GEHEN_BILDER, 5);
  assert.equal(GEHEN_DAUER, 8);
  assert.equal(GEHEN_SCHRITT, (8 * BOSS_GEHEN_X) / EINS);
  assert.equal(GEHEN_SCHRITT, 10);
  const g = anim('gehen').bilder;
  assert.ok(g.every((b) => b.dauer === 8));
  for (let i = 0; i < GEHEN_BILDER; i++) {
    assert.ok(rueckt(g[i] as Bild, g[(i + 1) % GEHEN_BILDER] as Bild, 10), `Bild ${i} → ${(i + 1) % GEHEN_BILDER}: ${JSON.stringify(sohlen(g[i] as Bild))} → ${JSON.stringify(sohlen(g[(i + 1) % GEHEN_BILDER] as Bild))}`);
  }
});

test('Ballast: Ankündigung mindestens 15 Frames, Brille leuchtet nur in Ankündigung und Auftritt', () => {
  assert.ok(summe(ANKUENDIGUNG_DAUERN) >= KP_HOCKE);
  assert.equal(summe(ANKUENDIGUNG_DAUERN), 15);
  for (const a of BALLAST.animationen) {
    a.bilder.forEach((b, i) => {
      const n = zaehle(b, BRILLE_GLUT);
      const soll = a.name === 'ankuendigung' || (a.name === 'auftritt' && i === 2);
      if (soll) assert.ok(n >= 4, `${a.name} Bild ${i}: Brille leuchtet (${n} px)`);
      else assert.equal(n, 0, `${a.name} Bild ${i}: Brille dunkel`);
    });
  }
});

test('Ballast: Armschwung als Folge, je Schwung Trefferbild in A_k+17 bis A_k+19 mit der größten Reichweite', () => {
  assert.equal(summe(SCHWUNG_DAUERN), AS_NAECHSTER);
  assert.equal(SCHWUNG_BILDER, 5);
  const t = schwungTrefferBild();
  assert.equal(t, 2);
  assert.equal(summe(SCHWUNG_DAUERN.slice(0, t)), AS_AUSHOLEN);
  assert.equal(SCHWUNG_DAUERN[t], AS_AKTIV_BIS - AS_AKTIV_VON + 1);
  for (let n = 0; n < AS_AKTIV_VON; n++) assert.ok(bildBeiAbstand(SCHWUNG_DAUERN, n) < t, `A_k+${n}: Ausholen`);
  for (let n = AS_AKTIV_VON; n <= AS_AKTIV_BIS; n++) assert.equal(bildBeiAbstand(SCHWUNG_DAUERN, n), t);
  assert.ok(bildBeiAbstand(SCHWUNG_DAUERN, AS_AKTIV_BIS + 1) > t);
  const a = anim('armschwung');
  assert.deepEqual(a.aktiv, armschwungAktiv());
  assert.deepEqual(armschwungAktiv(), [2, 7, 12]);
  assert.equal(a.bilder.length, AS_SCHWUENGE_MAX * SCHWUNG_BILDER);
  for (let k = 0; k < AS_SCHWUENGE_MAX; k++) {
    const teil = a.bilder.slice(k * SCHWUNG_BILDER, (k + 1) * SCHWUNG_BILDER);
    const r = teil.map(vorn);
    assert.equal(Math.max(...r), r[t], `Schwung ${k + 1}: Reichweite ${r.join(', ')}`);
    assert.ok((r[t] as number) >= 44, `Schwung ${k + 1}: Reichweite ${r[t]}`);
    assert.deepEqual(
      teil.map((b) => b.dauer),
      [...SCHWUNG_DAUERN],
    );
  }
});

test('Ballast: Ansturm 4 Laufbilder, alle aktiv, Standfuß rückt 16 px je Bild (4 Frames zu 4 px)', () => {
  const a = anim('ansturm');
  assert.deepEqual(a.aktiv, [0, 1, 2, 3]);
  assert.equal(ANSTURM_SCHRITT, (ANSTURM_DAUER * AN_V) / EINS);
  assert.equal(ANSTURM_SCHRITT, 16);
  assert.ok(rueckt(a.bilder[0] as Bild, a.bilder[1] as Bild, 16), 'naher Fuß');
  assert.ok(rueckt(a.bilder[2] as Bild, a.bilder[3] as Bild, 16), 'ferner Fuß');
  // vorgebeugt mit vorgestrecktem Ladearm: reicht weiter nach vorn als der Stand
  assert.ok(a.bilder.every((b) => vorn(b) >= vorn(anim('stand').bilder[0] as Bild) + 15));
});

test('Ballast: Körperpresse Absprung 2, Flug 1, Aufprall 2, Aufstehen 2; Trefferbild ab KP_AKTIV_VON', () => {
  const a = anim('koerperpresse');
  const t = presseTrefferBild();
  assert.equal(t, 3);
  assert.deepEqual(a.aktiv, [t]);
  assert.equal(summe(PRESSE_DAUERN.slice(0, t)), KP_AKTIV_VON);
  assert.equal(summe(PRESSE_DAUERN.slice(0, t + 1)), KP_LANDUNG);
  assert.equal(bildBeiAbstand(PRESSE_DAUERN, KP_AKTIV_VON - 1), t - 1);
  // Presse und Aufprall liegen flach (bäuchlings)
  for (const i of [3, 4]) {
    const b = zugeschnitten(a.bilder[i] as Bild);
    assert.ok(b.leinwand.breite > 1.5 * b.leinwand.hoehe, `Bild ${i}: ${b.leinwand.breite} × ${b.leinwand.hoehe}`);
  }
});

test('Ballast: Stoß 54 Frames taumelnd (Bewegung in den ersten 16), Taumeln 78, Auftritt 60', () => {
  assert.equal(summe(STOSS_DAUERN), RZ_DAUER);
  assert.equal(summe(STOSS_DAUERN.slice(0, 2)), RZ_SCHNELL_FRAMES);
  assert.equal(summe(TAUMELN_DAUERN), BOSS_TAUMELN_DAUER);
  assert.equal(summe(AUFTRITT_DAUERN), AUFTRITT_BOSS);
  for (const [n, d] of [
    ['stoss_rueckzug', STOSS_DAUERN],
    ['taumeln', TAUMELN_DAUERN],
    ['auftritt', AUFTRITT_DAUERN],
  ] as const) {
    assert.deepEqual(
      anim(n).bilder.map((b) => b.dauer),
      [...d],
      n,
    );
  }
});

test('Ballast: getroffen wechselt bei h+1, h+10, h+22; Umgeworfen, Aufstehen und Fall nach werte.ts', () => {
  assert.deepEqual([...GETROFFEN_DAUERN], [9, 12, 2]);
  assert.equal(summe(GETROFFEN_DAUERN), REAKTION_DAUER);
  REAKTION_ANIMATION.forEach((ab, k) => assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab), k, `h+${ab}`));
  assert.equal(summe(UMGEWORFEN_DAUERN), F1_RUHE);
  assert.equal(summe(AUFSTEHEN_DAUERN), AUFSTEHEN_GEGNER);
  assert.equal(summe(FALL_DAUERN), F4_RUHE);
  // Fall endet liegend (Zusammenbrechen)
  const ende = zugeschnitten(anim('fall').bilder[5] as Bild);
  assert.ok(ende.leinwand.breite > 2 * ende.leinwand.hoehe, `${ende.leinwand.breite} × ${ende.leinwand.hoehe}`);
});

test('Ballast: Determinismus, zwei Bauläufe geben gleiche Bytes für Blatt, Atlas und Kontaktbögen', () => {
  const summen = (): [string, string][] => [...figurBytes(ballastFiguren()[0] as Figur)].map(([k, v]) => [k, typeof v === 'string' ? md5(new TextEncoder().encode(v)) : md5(v)]);
  const a = summen();
  assert.deepEqual(a, summen());
  assert.equal(a.length, 2 + BALLAST.animationen.length);
});

test('Ausgabe: grafik/ausgabe/ballast.png und .json und die Kontaktbögen entsprechen dem Bau', () => {
  const png = SPIEL + 'grafik/ausgabe/ballast.png';
  const json = SPIEL + 'grafik/ausgabe/ballast.json';
  assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
  const blatt = blattPacken('ballast', BALLAST.animationen);
  assert.ok(pngDateiLesen(png).gleich(blatt.leinwand), 'Pixel des Blatts');
  assert.equal(readFileSync(json, 'utf8'), atlasText(blatt.atlas));
  for (const a of BALLAST.animationen) {
    const datei = SPIEL + `../docs/bilder/kontakt_ballast_${a.name}.png`;
    assert.ok(existsSync(datei), `kontakt_ballast_${a.name}.png`);
    assert.ok(pngDateiLesen(datei).gleich(kontaktBogen(a)), `kontakt_ballast_${a.name}.png aktuell`);
  }
});
