// Tests der Rammbock-Gliederpuppe (Auftrag 4, Phase 1, G0c; Vergleich an
// Haltepunkt 1 nach Auftrag 4, 9.4): Umriss im Stand, Farben ≤ 16 mit der
// Zuteilung aus docs/grafik.md 4.2, Fußkontakt beim Gehen (6,4 px je Bild,
// auf ganze px 6/7/6/7/6/6/7/6 = 51 px je Zyklus), Trefferbild im ersten
// aktiven Frame von RA, Bildwechsel der Trefferreaktion bei h+1, h+10,
// h+22, Kontur und Streupixel, Determinismus und Stand der Ausgabe in
// spiel/grafik/ausgabe/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { atlasText, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Figur } from '../grafik/quelle/bauen.ts';
import { figurBytes, figurPruefen, figuren, md5 } from '../grafik/quelle/bauen.ts';
import {
  GEHEN_BILDER,
  GEHEN_DAUER,
  GEHEN_SCHRITT,
  GETROFFEN_DAUERN,
  GLANZ_RAMMBOCK,
  PUPPE_RAMMBOCK,
  SCHLAG_DAUERN,
  bildBeiAbstand,
  bildBeiUhr,
  gehVersatz,
  gehen,
  pose,
} from '../grafik/quelle/figuren/rammbock.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, HAUT_MITTEL, HOSE_BRAUN, KONTUR, STAHL, WESTE_OLIV, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import { SCHATTEN_HOEHE, UMRISS_GEGNER } from '../src/darstellung/masse.ts';
import { NAH_ANGRIFFE, RAMMBOCK_GEHEN_X, REAKTION_ANIMATION, REAKTION_DAUER, ZIELABSTAND_MAX } from '../src/kern/werte.ts';
import { EINS } from '../src/kern/festkomma.ts';

const RAMMBOCK = figuren().find((f) => f.name === 'rammbock') as Figur;
const anim = (name: string): Animation => RAMMBOCK.animationen.find((a) => a.name === name) as Animation;
const alleBilder = (): { name: string; i: number; b: Bild }[] =>
  RAMMBOCK.animationen.flatMap((a) => a.bilder.map((b, i) => ({ name: a.name, i, b: zugeschnitten(b) })));

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

test('Rammbock: registriert in bauen.ts, Animationen für Haltepunkt 1 (Auftrag 4, 9.4), Bildzahlen nach Auftrag 4, 3', () => {
  assert.ok(RAMMBOCK !== undefined, 'Figur rammbock in figuren()');
  assert.equal(RAMMBOCK.umriss, UMRISS_GEGNER.Rammbock);
  assert.deepEqual(
    RAMMBOCK.animationen.map((a) => [a.name, a.bilder.length, a.schleife]),
    [
      ['stand', 1, true],
      ['gehen', 8, true],
      ['kampfhaltung', 2, true],
      ['schlag', 5, false],
      ['getroffen', 3, false],
    ],
  );
  assert.ok(anim('gehen').bilder.every((b) => b.dauer === GEHEN_DAUER && b.dauer === 4));
  assert.equal(GEHEN_BILDER, 8);
});

test('Rammbock: Umriss im Stand 60 × 71 eingehalten (76 mit Schatten), Körper etwa 71 px hoch', () => {
  const b = zugeschnitten(anim('stand').bilder[0] as Bild);
  const hoeheMax = UMRISS_GEGNER.Rammbock.hoehe - SCHATTEN_HOEHE / 2;
  assert.equal(hoeheMax, 71);
  assert.ok(b.leinwand.breite <= UMRISS_GEGNER.Rammbock.breite, `Breite ${b.leinwand.breite}`);
  assert.ok(b.leinwand.hoehe <= hoeheMax && b.leinwand.hoehe >= 69, `Höhe ${b.leinwand.hoehe}`);
  assert.equal(b.ankerY, b.leinwand.hoehe - 1, 'Anker in der Konturzeile unter den Sohlen');
  // deutlich wuchtiger als Vela (schlank, Stand 46 px breit mit vorgestreckter Faust): mindestens 45 px mit tiefen Fäusten
  assert.ok(b.leinwand.breite >= 45, `Breite ${b.leinwand.breite}`);
});

test('Rammbock: Farben ≤ 16 je Bild und über alle Bilder, genau die Zuteilung aus docs/grafik.md 4.2', () => {
  for (const { name, i, b } of alleBilder()) assert.ok(farbenZaehlen(b.leinwand) <= FARBBUDGET.figur, `${name} Bild ${i}`);
  const H = HAUT_MITTEL.treppe;
  const W = WESTE_OLIV.treppe;
  const B = HOSE_BRAUN.treppe;
  const S = STAHL.treppe;
  const erwartet = new Set([0, KONTUR, H[0], H[1], H[2], H[3], W[1], W[2], W[3], B[1], B[2], B[3], S[1], S[2], S[3], S[4]]);
  const gesamt = farbenMenge(alleBilder().map((x) => x.b.leinwand));
  assert.equal(gesamt.size, FARBBUDGET.figur);
  assert.deepEqual([...gesamt].sort(), [...erwartet].sort());
  // einzige Glanzfarbe: Stahl Ton 4
  assert.deepEqual([...GLANZ_RAMMBOCK], [S[4]]);
});

test('Rammbock: Kontur geschlossen, keine Streupixel (außer Glanz), Anker im Bild, alle Bilder am Boden', () => {
  for (const { name, i, b } of alleBilder()) {
    assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${name} Bild ${i}: Kontur`);
    assert.deepEqual(streupixel(b.leinwand, GLANZ_RAMMBOCK), [], `${name} Bild ${i}: Streupixel`);
    assert.ok(b.ankerX >= 0 && b.ankerX < b.leinwand.breite, `${name} Bild ${i}: ankerX`);
    assert.equal(b.ankerY, b.leinwand.hoehe - 1, `${name} Bild ${i}: ankerY`);
  }
  assert.deepEqual(figurPruefen(RAMMBOCK), []);
});

test('Rammbock: Fußkontakt beim Gehen, Standfuß rückt je Bild 6,4 px zurück (6/7/6/7/6/6/7/6, 51 px je Zyklus)', () => {
  // 4 Frames zu 1,6 px (werte.ts RAMMBOCK_GEHEN_X als Festkomma)
  assert.equal(GEHEN_SCHRITT, (4 * RAMMBOCK_GEHEN_X) / EINS);
  assert.ok(Math.abs(GEHEN_SCHRITT - 6.4) < 1e-4, `${GEHEN_SCHRITT}`);
  const versatz = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(gehVersatz);
  assert.deepEqual(versatz, [0, 6, 13, 19, 26, 32, 38, 45, 51]);
  // Pixel: Anfang (Ferse) oder Ende (Spitze) einer Sohle rückt zwischen zwei Bildern genau um den gerundeten Schritt zurück
  const s = anim('gehen').bilder.map(sohlen);
  const schritte: number[] = [];
  for (let i = 0; i < GEHEN_BILDER; i++) {
    const soll = (versatz[i + 1] as number) - (versatz[i] as number);
    const a = s[i] as [number, number][];
    const c = s[(i + 1) % GEHEN_BILDER] as [number, number][];
    const ok = a.some((p) => c.some((q) => q[0] - p[0] === -soll || q[1] - p[1] === -soll));
    assert.ok(ok, `Bild ${i} → ${(i + 1) % GEHEN_BILDER}: ${soll} px (Sohlen ${JSON.stringify(a)} → ${JSON.stringify(c)})`);
    schritte.push(soll);
  }
  assert.deepEqual(schritte, [6, 7, 6, 7, 6, 6, 7, 6]);
  assert.equal(
    schritte.reduce((x, y) => x + y, 0),
    51,
  );
  // Puppe: Knöchel des flachen Standfußes rücken um ganze px, und die Gelenke erreichen ihr Ziel
  const h = gehen();
  for (const seite of ['V', 'H'] as const) {
    let flach = 0;
    for (let i = 0; i < h.length; i++) {
      const a = h[i] as (typeof h)[number];
      const b = h[(i + 1) % h.length] as (typeof h)[number];
      const fa = seite === 'V' ? a.beinV : a.beinH;
      const fb = seite === 'V' ? b.beinV : b.beinH;
      if (fa.fuss === 0 && fb.fuss === 0 && fa.knoechel.y === fb.knoechel.y) {
        assert.equal(fa.knoechel.x - fb.knoechel.x, (versatz[i + 1] as number) - (versatz[i] as number), `${seite} Bild ${i}`);
        flach++;
      }
      const lage = PUPPE_RAMMBOCK.lagen(pose(a)).get(`Stiefel${seite}`);
      assert.ok(lage !== undefined && Math.hypot(lage.pos.x - fa.knoechel.x, lage.pos.y - fa.knoechel.y) < 1e-6, `${seite} Bild ${i}: Knöchel am Ziel`);
    }
    assert.equal(flach, 2, `${seite}: zwei Bildpaare mit flachem Standfuß`);
  }
});

test('Rammbock: Schlag RA, Trefferbild in den aktiven Frames A+9 bis A+13, mit der größten Reichweite', () => {
  const a = anim('schlag');
  const ra = NAH_ANGRIFFE.RA;
  const treffer = bildBeiAbstand(SCHLAG_DAUERN, ra.aktiv_von);
  assert.deepEqual(a.aktiv, [treffer]);
  assert.equal(treffer, 2, 'Ausholen 2, aktiv 1, Rückzug 2 (Auftrag 4, 3)');
  // Ausholen = Startup, Trefferbild = aktive Frames, Rückzug = fester Rückzug (wie fremd/rammbock/zuordnung.txt, schlag_a)
  assert.deepEqual([...SCHLAG_DAUERN], [5, 4, 5, 3, 2]);
  assert.equal(SCHLAG_DAUERN.slice(0, treffer).reduce((x, y) => x + y, 0), ra.startup);
  assert.equal(SCHLAG_DAUERN[treffer], ra.aktiv_bis - ra.aktiv_von + 1);
  assert.equal(SCHLAG_DAUERN.slice(treffer + 1).reduce((x, y) => x + y, 0), ra.rueckzug);
  assert.deepEqual(
    a.bilder.map((b) => b.dauer),
    [...SCHLAG_DAUERN],
  );
  for (let d = 0; d < ra.startup; d++) assert.ok(bildBeiAbstand(SCHLAG_DAUERN, d) < treffer, `A+${d}: Ausholen`);
  for (let d = ra.aktiv_von; d <= ra.aktiv_bis; d++) assert.equal(bildBeiAbstand(SCHLAG_DAUERN, d), treffer, `A+${d}: Trefferbild`);
  assert.ok(bildBeiAbstand(SCHLAG_DAUERN, ra.aktiv_bis + 1) > treffer, 'danach Rückzug');
  // Reichweite: vorderster Pixel vor dem Anker; größte im Trefferbild, höchstens der Zielabstand (werte.ts ZIELABSTAND_MAX)
  const vorn = a.bilder.map((roh) => {
    const b = zugeschnitten(roh);
    return b.leinwand.breite - 1 - b.ankerX;
  });
  assert.equal(Math.max(...vorn), vorn[treffer], `Reichweite ${vorn.join(', ')}`);
  assert.ok((vorn[treffer] as number) >= 40 && (vorn[treffer] as number) <= ZIELABSTAND_MAX, `Reichweite ${vorn[treffer]}`);
});

test('Rammbock: getroffen wechselt das Bild bei h+1, h+10, h+22 und dauert 23 Frames', () => {
  assert.deepEqual([...GETROFFEN_DAUERN], [9, 12, 2]);
  assert.equal(
    GETROFFEN_DAUERN.reduce((x, y) => x + y, 0),
    REAKTION_DAUER,
  );
  REAKTION_ANIMATION.forEach((ab, k) => {
    assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab), k, `h+${ab}`);
    if (ab > 1) assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab - 1), k - 1, `h+${ab - 1}`);
  });
  assert.deepEqual(
    anim('getroffen').bilder.map((b) => b.dauer),
    [...GETROFFEN_DAUERN],
  );
});

test('Rammbock: Determinismus, zwei Bauläufe geben gleiche Bytes für Blatt, Atlas und Kontaktbögen', () => {
  const summen = (): [string, string][] =>
    [...figurBytes(figuren().find((f) => f.name === 'rammbock') as Figur)].map(([k, v]) => [k, typeof v === 'string' ? md5(new TextEncoder().encode(v)) : md5(v)]);
  const a = summen();
  assert.deepEqual(
    a.map(([k]) => k),
    ['rammbock.png', 'rammbock.json', ...['stand', 'gehen', 'kampfhaltung', 'schlag', 'getroffen'].map((n) => `kontakt_rammbock_${n}.png`)],
  );
  assert.deepEqual(a, summen());
});

test('Ausgabe: spiel/grafik/ausgabe/rammbock.png und rammbock.json entsprechen dem Bau (npm run grafik)', () => {
  const png = SPIEL + 'grafik/ausgabe/rammbock.png';
  const json = SPIEL + 'grafik/ausgabe/rammbock.json';
  assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
  const blatt = blattPacken('rammbock', RAMMBOCK.animationen);
  assert.ok(pngDateiLesen(png).gleich(blatt.leinwand), 'Pixel des Blatts');
  assert.equal(readFileSync(json, 'utf8'), atlasText(blatt.atlas));
  for (const n of ['stand', 'gehen', 'kampfhaltung', 'schlag', 'getroffen']) {
    assert.ok(existsSync(SPIEL + `../docs/bilder/kontakt_rammbock_${n}.png`), `kontakt_rammbock_${n}.png`);
  }
});
