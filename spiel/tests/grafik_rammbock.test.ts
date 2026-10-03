// Tests der Rammbock-Gliederpuppe (Auftrag 4, Phase 1 G0c, Phase 2 G2 nach
// E24): vollständige Animationen nach Auftrag 4, 3 (wie der Bolzer, dazu
// wiegen, hocke_ankuendigung, sprungtritt; Angriffe RA, RB, RU, RS aus
// werte.ts), Umriss im Stand, Farben ≤ 16 mit der Zuteilung aus
// docs/grafik.md 4.2, Fußkontakt beim Gehen (6,4 px je Bild, auf ganze px
// 6/7/6/7/6/6/7/6 = 51 px je Zyklus), Trefferbilder im ersten aktiven Frame mit
// der größten Reichweite, Zeiten der Reaktionen aus werte.ts, alle Bilder mit
// dem untersten Pixel auf der Ankerzeile, Kontur und Streupixel,
// Determinismus und Stand der Ausgabe in spiel/grafik/ausgabe/.

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
  GETROFFEN_DAUERN,
  GLANZ_RAMMBOCK,
  HOCKE_DAUERN,
  PUPPE_RAMMBOCK,
  SCHLAG_DAUERN,
  bildBeiAbstand,
  bildBeiUhr,
  gehVersatz,
  gehen,
  pose,
  rammbockAnimationen,
  rammbockHaltungen,
} from '../grafik/quelle/figuren/rammbock.ts';
import { SPRUNGTRITT_DAUERN, TOT_DAUERN, UMGEWORFEN_DAUERN, angriffDauern } from '../grafik/quelle/figuren/bolzer_gemeinsam.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, HAUT_MITTEL, HOSE_BRAUN, KONTUR, STAHL, WESTE_OLIV, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import { SCHATTEN_HOEHE, UMRISS_GEGNER } from '../src/darstellung/masse.ts';
import {
  AUFTRITT_HOCKE_RAMMBOCK,
  NAH_ANGRIFFE,
  RAMMBOCK_ANGRIFF_CODES,
  RAMMBOCK_GEHEN_X,
  RAMMBOCK_SCHNELL_X,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  SPRUNGTRITT_AUFSETZEN,
  ZIELABSTAND_MAX,
} from '../src/kern/werte.ts';
import { EINS } from '../src/kern/festkomma.ts';

/** Der Rammbock wie in figuren() (bauen.ts), direkt gebaut; die Registrierung prüft der erste Test. */
const RAMMBOCK: Figur = {
  name: 'rammbock',
  umriss: UMRISS_GEGNER.Rammbock,
  animationen: rammbockAnimationen(),
  glanz: GLANZ_RAMMBOCK,
  budget: FARBBUDGET.figur,
  gehen: 'gehen',
  schritt: GEHEN_SCHRITT,
};
const anim = (name: string): Animation => RAMMBOCK.animationen.find((a) => a.name === name) as Animation;
const alleBilder = (): { name: string; i: number; b: Bild }[] =>
  RAMMBOCK.animationen.flatMap((a) => a.bilder.map((b, i) => ({ name: a.name, i, b: zugeschnitten(b) })));
const summe = (z: readonly number[]): number => z.reduce((x, y) => x + y, 0);

/** Animationen nach Auftrag 4, 3 (Rammbock: wie Bolzer, dazu wiegen, hocke_ankuendigung, sprungtritt) mit Bildzahl und Schleife; Angriffe nach den Codes. */
const ERWARTET: readonly [string, number, boolean][] = [
  ['stand', 1, true],
  ['haltung', 3, true],
  ['gehen', 8, true],
  ['gehen_schnell', 8, true],
  ['auftritt_versteck', 8, true],
  ['auftritt_hocke', 1, true],
  ['aufstehen_hocke', 3, false],
  ['spott', 6, false],
  ['wiegen', 6, true],
  ['kampfhaltung', 2, true],
  ['hocke_ankuendigung', 2, false],
  ['schlag_a', 5, false],
  ['schlag', 5, false],
  ['schlag_b', 5, false],
  ['umwerfschlag', 5, false],
  ['sprungtritt', 4, false],
  ['getroffen', 3, false],
  ['umgeworfen', 5, false],
  ['liegen', 1, true],
  ['aufstehen', 6, false],
  ['gehalten', 1, true],
  ['geworfen', 2, false],
  ['tot', 6, false],
];

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

/** Vorderster Pixel vor dem Anker (Reichweite) je Bild. */
const vorn = (a: Animation): number[] =>
  a.bilder.map((roh) => {
    const b = zugeschnitten(roh);
    return b.leinwand.breite - 1 - b.ankerX;
  });

test('Rammbock: registriert in bauen.ts, alle Animationen nach Auftrag 4, 3 mit Bildzahl und Schleife', () => {
  const eingetragen = figuren().find((f) => f.name === 'rammbock');
  assert.ok(eingetragen !== undefined, 'Figur rammbock in figuren()');
  assert.equal(eingetragen.umriss, UMRISS_GEGNER.Rammbock);
  assert.equal(eingetragen.glanz, GLANZ_RAMMBOCK);
  assert.equal(eingetragen.schritt, GEHEN_SCHRITT);
  assert.deepEqual(
    eingetragen.animationen.map((a) => a.name),
    ERWARTET.map(([n]) => n),
  );
  assert.deepEqual(
    RAMMBOCK.animationen.map((a) => [a.name, a.bilder.length, a.schleife]),
    ERWARTET,
  );
  // Namen aus Phase 1 bleiben (vergleich.ts): stand, gehen, schlag (mit aktivem Bild), getroffen
  for (const n of ['stand', 'gehen', 'schlag', 'getroffen']) assert.ok(anim(n) !== undefined, n);
  // genau die Angriffe der Logik: normale RA, RB (RAMMBOCK_ANGRIFF_CODES), Umwerf-Angriffe RU, RS (Welt 5.6)
  assert.deepEqual([...RAMMBOCK_ANGRIFF_CODES], ['RA', 'RB']);
  assert.deepEqual(
    Object.keys(NAH_ANGRIFFE).filter((c) => c.startsWith('R')),
    ['RA', 'RB', 'RU', 'RS'],
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
  // breit wie ein Schwergewicht (Vela 46 px mit vorgestreckter Faust): mindestens 42 px mit tiefen Fäusten
  assert.ok(b.leinwand.breite >= 42, `Breite ${b.leinwand.breite}`);
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

test('Rammbock: Kontur geschlossen, keine Streupixel (außer Glanz), Anker im Bild, unterstes Pixel auf der Ankerzeile', () => {
  for (const { name, i, b } of alleBilder()) {
    assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${name} Bild ${i}: Kontur`);
    assert.deepEqual(streupixel(b.leinwand, GLANZ_RAMMBOCK), [], `${name} Bild ${i}: Streupixel`);
    assert.ok(b.ankerX >= 0 && b.ankerX < b.leinwand.breite, `${name} Bild ${i}: ankerX`);
    // am Boden wie in der Luft (Flug, Liegen): die Darstellung hebt um h an (G2-3)
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
  assert.equal(summe(schritte), 51);
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
  // schnelle Gehstufe: dieselben Bilder, Richtwert 4 · 1,6 / 2,0 ≈ 3 Frames (G2-8)
  assert.equal(GEHEN_SCHNELL_DAUER, Math.round((4 * RAMMBOCK_GEHEN_X) / RAMMBOCK_SCHNELL_X));
  assert.equal(GEHEN_SCHNELL_DAUER, 3);
  anim('gehen_schnell').bilder.forEach((b, i) => {
    assert.equal(b.dauer, GEHEN_SCHNELL_DAUER);
    assert.ok(b.leinwand.gleich((anim('gehen').bilder[i] as Bild).leinwand), `gehen_schnell ${i} = gehen ${i}`);
    assert.ok(b.leinwand.gleich((anim('auftritt_versteck').bilder[i] as Bild).leinwand), `auftritt_versteck ${i} = gehen ${i}`);
  });
});

test('Rammbock: Angriffe RA, RB, RU: Ausholen über den Startup, Trefferbild in allen aktiven Frames mit der größten Reichweite, Rückzug', () => {
  for (const [name, code] of [
    ['schlag_a', 'RA'],
    ['schlag', 'RA'],
    ['schlag_b', 'RB'],
    ['umwerfschlag', 'RU'],
  ] as const) {
    const a = anim(name);
    const w = NAH_ANGRIFFE[code];
    const dauern = angriffDauern(code);
    const treffer = bildBeiAbstand(dauern, w.aktiv_von);
    assert.equal(treffer, 2, `${name}: Ausholen 2, aktiv 1, Rückzug 2 (Auftrag 4, 3)`);
    assert.deepEqual(a.aktiv, [treffer], name);
    assert.deepEqual(
      a.bilder.map((b) => b.dauer),
      [...dauern],
      name,
    );
    assert.equal(summe(dauern.slice(0, treffer)), w.startup, `${name}: Ausholen = Startup`);
    assert.equal(dauern[treffer], w.aktiv_bis - w.aktiv_von + 1, `${name}: Trefferbild = aktive Frames`);
    assert.equal(summe(dauern.slice(treffer + 1)), w.rueckzug, `${name}: Rückzug = fester Rückzug`);
    for (let d = 0; d < w.startup; d++) assert.ok(bildBeiAbstand(dauern, d) < treffer, `${name} A+${d}: Ausholen`);
    for (let d = w.aktiv_von; d <= w.aktiv_bis; d++) assert.equal(bildBeiAbstand(dauern, d), treffer, `${name} A+${d}: Trefferbild`);
    assert.ok(bildBeiAbstand(dauern, w.aktiv_bis + 1) > treffer, `${name}: danach Rückzug`);
    // Reichweite: größte im Trefferbild, höchstens der Zielabstand (werte.ts ZIELABSTAND_MAX)
    const v = vorn(a);
    assert.equal(Math.max(...v), v[treffer], `${name}: Reichweite ${v.join(', ')}`);
    assert.ok((v[treffer] as number) >= 40 && (v[treffer] as number) <= ZIELABSTAND_MAX, `${name}: Reichweite ${v[treffer]}`);
  }
  // RA wie in Phase 1 (G0c) und fremd/rammbock/zuordnung.txt
  assert.deepEqual([...SCHLAG_DAUERN], [5, 4, 5, 3, 2]);
  assert.deepEqual([...angriffDauern('RB')], [5, 5, 8, 4, 4]);
  // schlag ist schlag_a unter dem Namen aus Phase 1 (G2-11)
  anim('schlag').bilder.forEach((b, i) => assert.ok(b.leinwand.gleich((anim('schlag_a').bilder[i] as Bild).leinwand)));
});

test('Rammbock: Sprungtritt RS: Absprung A bis A+8, Flug mit Knie in allen aktiven Frames A+9 bis A+45, Landung ab dem Aufsetzen A+46', () => {
  const a = anim('sprungtritt');
  const w = NAH_ANGRIFFE.RS;
  assert.deepEqual([...SPRUNGTRITT_DAUERN], [9, 37, 4, 4]);
  assert.deepEqual(a.aktiv, [1]);
  for (let d = 0; d < w.startup; d++) assert.equal(bildBeiAbstand(SPRUNGTRITT_DAUERN, d), 0, `A+${d}`);
  for (let d = w.aktiv_von; d <= w.aktiv_bis; d++) assert.equal(bildBeiAbstand(SPRUNGTRITT_DAUERN, d), 1, `A+${d}`);
  assert.equal(w.aktiv_bis + 1, SPRUNGTRITT_AUFSETZEN);
  assert.equal(bildBeiAbstand(SPRUNGTRITT_DAUERN, SPRUNGTRITT_AUFSETZEN), 2, 'Landung ab dem Aufsetzen');
  const v = vorn(a);
  assert.equal(Math.max(...v), v[1], `Reichweite ${v.join(', ')}`);
  // Flugbild höher als die Landung (Knie hoch, Bein nachgezogen)
  assert.ok(zugeschnitten(a.bilder[1] as Bild).leinwand.hoehe > zugeschnitten(a.bilder[2] as Bild).leinwand.hoehe);
});

test('Rammbock: Reaktionen nach werte.ts: getroffen h+1/h+10/h+22, umgeworfen F1, tot F4, aufstehen 18, Spott und Wiegen 42, Hocke', () => {
  assert.deepEqual([...GETROFFEN_DAUERN], [9, 12, 2]);
  assert.equal(summe(GETROFFEN_DAUERN), REAKTION_DAUER);
  REAKTION_ANIMATION.forEach((ab, k) => {
    assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab), k, `h+${ab}`);
    if (ab > 1) assert.equal(bildBeiUhr(GETROFFEN_DAUERN, ab - 1), k - 1, `h+${ab - 1}`);
  });
  const dauern = (n: string): number[] => anim(n).bilder.map((b) => b.dauer);
  assert.deepEqual(dauern('getroffen'), [...GETROFFEN_DAUERN]);
  assert.deepEqual(dauern('umgeworfen'), [...UMGEWORFEN_DAUERN]);
  assert.deepEqual(dauern('tot'), [...TOT_DAUERN]);
  assert.deepEqual(dauern('aufstehen'), [3, 3, 3, 3, 3, 3]);
  assert.deepEqual(dauern('spott'), [10, 8, 8, 8, 7, 1]);
  assert.deepEqual(dauern('wiegen'), [10, 8, 8, 8, 7, 1]);
  assert.deepEqual(dauern('hocke_ankuendigung'), [...HOCKE_DAUERN]);
  assert.equal(summe(AUFSTEHEN_HOCKE_DAUERN), AUFTRITT_HOCKE_RAMMBOCK);
  // tot = umgeworfen + liegen (Blinken als Regel der Darstellung)
  const tot = anim('tot').bilder;
  anim('umgeworfen').bilder.forEach((b, i) => assert.ok(b.leinwand.gleich((tot[i] as Bild).leinwand), `tot ${i}`));
  assert.ok((tot[5] as Bild).leinwand.gleich((anim('liegen').bilder[0] as Bild).leinwand));
  // liegend und geworfen waagrecht: breiter als hoch, flach am Boden
  for (const [n, i] of [
    ['liegen', 0],
    ['umgeworfen', 4],
    ['geworfen', 1],
  ] as const) {
    const b = zugeschnitten(anim(n).bilder[i] as Bild);
    assert.ok(b.leinwand.breite > 2 * b.leinwand.hoehe - 20, `${n} ${i}: ${b.leinwand.breite} × ${b.leinwand.hoehe}`);
  }
  // Getroffen: Kopf nach hinten (das Bild reicht hinter den Anker weiter als im Stand)
  const stand = zugeschnitten(anim('stand').bilder[0] as Bild);
  assert.ok(zugeschnitten(anim('getroffen').bilder[0] as Bild).ankerX >= stand.ankerX);
});

test('Rammbock: Schlüsselhaltungen erreichen ihre Ziele (Knöchel), stehende Füße bleiben am Boden', () => {
  const h = rammbockHaltungen();
  for (const n of ['stand', 'haltung', 'kampfhaltung', 'hocke_ankuendigung', 'schlag_a', 'schlag_b', 'umwerfschlag']) {
    (h[n] as readonly (typeof h)[string][number][]).forEach((x, i) => {
      for (const seite of ['V', 'H'] as const) {
        const b = seite === 'V' ? x.beinV : x.beinH;
        assert.equal(b.knoechel.y, -6, `${n} ${i} ${seite}: Fuß am Boden`);
        const lage = PUPPE_RAMMBOCK.lagen(pose(x)).get(`Stiefel${seite}`);
        assert.ok(lage !== undefined && Math.hypot(lage.pos.x - b.knoechel.x, lage.pos.y - b.knoechel.y) < 1e-6, `${n} ${i} ${seite}: Knöchel am Ziel`);
      }
    });
  }
});

test('Rammbock: Determinismus, zwei Bauläufe geben gleiche Bytes für Blatt, Atlas und Kontaktbögen', () => {
  const summen = (): [string, string][] =>
    [...figurBytes({ ...RAMMBOCK, animationen: rammbockAnimationen() })].map(([k, v]) => [k, typeof v === 'string' ? md5(new TextEncoder().encode(v)) : md5(v)]);
  const a = summen();
  assert.deepEqual(
    a.map(([k]) => k),
    ['rammbock.png', 'rammbock.json', ...ERWARTET.map(([n]) => `kontakt_rammbock_${n}.png`)],
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
  for (const [n] of ERWARTET) {
    assert.ok(existsSync(SPIEL + `../docs/bilder/kontakt_rammbock_${n}.png`), `kontakt_rammbock_${n}.png`);
  }
});
