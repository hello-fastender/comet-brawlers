// Tests der Vela-Gliederpuppe und der Stilprüfungen in bauen.ts (Auftrag 4,
// Phase 1, G0): Kontur geschlossen, Streupixel, Farbzählung ≤ 16, Anker im
// Bild, Umriss im Stand, Fußkontakt beim Gehen, Trefferbild im ersten
// aktiven Frame, Determinismus (zwei Bauläufe, gleiche MD5) und Stand der
// Ausgabe in spiel/grafik/ausgabe/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { atlasText, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Figur } from '../grafik/quelle/bauen.ts';
import { figurBytes, figurPruefen, figuren, md5 } from '../grafik/quelle/bauen.ts';
import { DAUERN, GEHEN_SCHRITT, PUPPE_VELA, bildBeiUhr, gehen, pose } from '../grafik/quelle/figuren/vela.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import { Leinwand } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, KONTUR, SPULE, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import { SCHATTEN_HOEHE, UMRISS_FIGUR } from '../src/darstellung/masse.ts';
import {
  KETTE2_LEER_DAUER,
  KETTE3_LEER_DAUER,
  KETTE4_DAUER,
  KETTE4_ZWEITES_FENSTER_VON,
  KETTE_AKTIV_BIS,
  KETTE_AKTIV_VON,
  LEERSCHLAG_DAUER,
} from '../src/kern/werte.ts';

const VELA = figuren().find((f) => f.name === 'vela') as Figur;
const anim = (name: string): Animation => VELA.animationen.find((a) => a.name === name) as Animation;
const alleBilder = (): { name: string; i: number; b: Bild }[] =>
  VELA.animationen.flatMap((a) => a.bilder.map((b, i) => ({ name: a.name, i, b: zugeschnitten(b) })));

test('Vela: Animationen der Phase 1 vollständig, gehen 12 Bilder zu 4 Frames, 84 px je Zyklus', () => {
  assert.deepEqual(
    VELA.animationen.map((a) => [a.name, a.bilder.length]),
    [
      ['stand', 1],
      ['gehen', 12],
      ['kette1', 6],
      ['kette2', 4],
      ['kette3', 5],
      ['kette4', 12],
    ],
  );
  assert.ok(anim('gehen').bilder.every((b) => b.dauer === 4));
  assert.equal(GEHEN_SCHRITT, 7);
  assert.equal(12 * GEHEN_SCHRITT, 84);
});

test('Vela: Kontur geschlossen in jedem Bild', () => {
  for (const { name, i, b } of alleBilder()) assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${name} Bild ${i}`);
});

test('Vela: keine Streupixel (außer Glanz der Spulen)', () => {
  for (const { name, i, b } of alleBilder()) assert.deepEqual(streupixel(b.leinwand, new Set([SPULE])), [], `${name} Bild ${i}`);
});

test('Vela: Farbzählung ≤ 16 je Bild und über alle Bilder (einschließlich durchsichtig)', () => {
  for (const { name, i, b } of alleBilder()) assert.ok(farbenZaehlen(b.leinwand) <= FARBBUDGET.figur, `${name} Bild ${i}`);
  const gesamt = farbenZaehlen(alleBilder().map((x) => x.b.leinwand));
  assert.ok(gesamt <= FARBBUDGET.figur, `${gesamt} Farben`);
  assert.equal(FARBBUDGET.figur, 16);
});

test('Vela: Anker im Bild, bei Bodenposen in der Konturzeile unter den Sohlen', () => {
  for (const { name, i, b } of alleBilder()) {
    assert.ok(b.ankerX >= 0 && b.ankerX < b.leinwand.breite && b.ankerY >= 0 && b.ankerY < b.leinwand.hoehe, `${name} Bild ${i}`);
    // Alle Bilder der Phase 1 stehen am Boden: unterste Zeile ist die Ankerzeile, darin Kontur
    assert.equal(b.ankerY, b.leinwand.hoehe - 1, `${name} Bild ${i}`);
  }
});

test('Vela: Umriss im Stand 57 × 71 eingehalten (76 mit Schatten)', () => {
  const b = zugeschnitten(anim('stand').bilder[0] as Bild);
  const hoeheMax = UMRISS_FIGUR.hoehe - SCHATTEN_HOEHE / 2;
  assert.ok(b.leinwand.breite <= UMRISS_FIGUR.breite, `Breite ${b.leinwand.breite}`);
  assert.ok(b.leinwand.hoehe <= hoeheMax && b.leinwand.hoehe >= 0.9 * hoeheMax, `Höhe ${b.leinwand.hoehe}`);
});

test('Vela: Fußkontakt beim Gehen, der Standfuß rückt je Bild genau 7 px zurück', () => {
  // Bildprüfung aus bauen.ts
  assert.deepEqual(
    figurPruefen(VELA).filter((b) => b.regel === 'Fußkontakt'),
    [],
  );
  // Rechnung der Puppe: Knöchel des flachen Standfußes (Bilder 1 bis 5 der Standphase) und Lage nach dem Rastern
  const h = gehen();
  for (const seite of ['V', 'H'] as const) {
    let flach = 0;
    for (let i = 0; i < h.length; i++) {
      const a = h[i] as (typeof h)[number];
      const b = h[(i + 1) % h.length] as (typeof h)[number];
      const fa = seite === 'V' ? a.beinV : a.beinH;
      const fb = seite === 'V' ? b.beinV : b.beinH;
      if (fa.fuss === 0 && fb.fuss === 0 && fa.knoechel.y === fb.knoechel.y) {
        assert.equal(fb.knoechel.x - fa.knoechel.x, -GEHEN_SCHRITT, `${seite} Bild ${i}`);
        flach++;
      }
      const lage = PUPPE_VELA.lagen(pose(a)).get(`Stiefel${seite}`);
      assert.ok(lage !== undefined && Math.hypot(lage.pos.x - fa.knoechel.x, lage.pos.y - fa.knoechel.y) < 1e-6, `${seite} Bild ${i}: Knöchel am Ziel`);
    }
    assert.ok(flach >= 4, `${seite}: ${flach} Bildpaare mit flachem Standfuß`);
  }
});

test('Vela: Trefferbild im ersten aktiven Frame (werte.ts), mit der größten Reichweite; Dauern wie die Logik', () => {
  const stufen = [
    ['kette1', DAUERN.kette1, LEERSCHLAG_DAUER],
    ['kette2', DAUERN.kette2, KETTE2_LEER_DAUER],
    ['kette3', DAUERN.kette3, KETTE3_LEER_DAUER],
    ['kette4', DAUERN.kette4, KETTE4_DAUER],
  ] as const;
  stufen.forEach(([name, dauern, logik], s) => {
    const a = anim(name);
    const treffer = bildBeiUhr(dauern, KETTE_AKTIV_VON[s] as number);
    assert.equal(a.aktiv?.[0], treffer, name);
    // alle aktiven Frames zeigen das Trefferbild
    for (let uhr = KETTE_AKTIV_VON[s] as number; uhr <= (KETTE_AKTIV_BIS[s] as number); uhr++) assert.equal(bildBeiUhr(dauern, uhr), treffer, `${name} uhr ${uhr}`);
    // Bilder davor sind Ausholen, das Trefferbild reicht am weitesten nach vorn
    const vorn = a.bilder.map((roh) => {
      const b = zugeschnitten(roh);
      return b.leinwand.breite - 1 - b.ankerX;
    });
    assert.equal(Math.max(...vorn), vorn[treffer], `${name}: Reichweite ${vorn.join(', ')}`);
    assert.equal(
      a.bilder.reduce((x, b) => x + b.dauer, 0),
      logik,
      `${name}: Summe der Dauern`,
    );
  });
  // Stufe 4: zweites Fenster uhr 17 bis 20 zeigt den zweiten Tritt
  assert.equal(anim('kette4').aktiv?.[1], bildBeiUhr(DAUERN.kette4, KETTE4_ZWEITES_FENSTER_VON));
  // Kettenstufe 1: Faust weit vorgestreckt (Auftrag 4, 1.1: bis etwa 60 px vor dem Fußpunkt)
  const k1 = zugeschnitten(anim('kette1').bilder[1] as Bild);
  const reichweite = k1.leinwand.breite - 1 - k1.ankerX;
  assert.ok(reichweite >= 45 && reichweite <= 60, `Reichweite Stufe 1: ${reichweite}`);
});

test('Stilprüfung: Vela ohne Befunde; Verletzungen werden mit Figur, Animation und Bild gemeldet', () => {
  assert.deepEqual(figurPruefen(VELA), []);
  // Lücke in der Kontur, Streupixel, zu viele Farben, Anker außerhalb
  const kaputt = (name: string, aendern: (b: Bild) => Bild): Figur => ({
    ...VELA,
    animationen: VELA.animationen.map((a) => (a.name === name ? { ...a, bilder: a.bilder.map((b, i) => (i === 0 ? aendern(b) : b)) } : a)),
  });
  const regeln = (f: Figur): string[] => [...new Set(figurPruefen(f).map((b) => `${b.animation}/${b.bild}: ${b.regel}`))];
  const loch = kaputt('kette1', (b) => {
    const l = zugeschnitten(b).leinwand.klon();
    for (let x = 0; x < l.breite; x++) {
      if (l.hole(x, 0) === KONTUR) {
        l.setze(x, 0, 0);
        break;
      }
    }
    return { ...zugeschnitten(b), leinwand: l };
  });
  assert.ok(regeln(loch).includes('kette1/0: Kontur geschlossen'), regeln(loch).join('; '));
  const bunt = kaputt('kette2', (b) => {
    const z = zugeschnitten(b);
    const l = z.leinwand.klon();
    for (let i = 0; i < 20; i++) l.setze(10 + (i % 5) * 2, 30 + Math.floor(i / 5) * 2, 0xff000000 + i * 0x100 + 0xff);
    return { ...z, leinwand: l };
  });
  const r = regeln(bunt);
  assert.ok(r.includes('kette2/0: Farbzählung') && r.includes('kette2/0: Streupixel') && r.includes('alle/-1: Farbzählung'), r.join('; '));
  const anker = kaputt('gehen', (b) => ({ ...b, ankerX: -3 }));
  assert.ok(regeln(anker).includes('gehen/0: Anker im Bild'), regeln(anker).join('; '));
  // Umriss: Stand zu breit
  const breit = kaputt('stand', (b) => {
    const l = new Leinwand(70, b.leinwand.hoehe);
    l.einsetzen(b.leinwand, 0, 0);
    l.rechteck(60, 10, 8, 3, KONTUR);
    return { ...b, leinwand: l };
  });
  assert.ok(regeln(breit).includes('stand/0: Umriss im Stand'), regeln(breit).join('; '));
  // Fußkontakt: ein Gehbild um 3 px verschoben (Fuß rutscht)
  const rutscht = kaputt('gehen', (b) => ({ ...b, ankerX: b.ankerX + 3 }));
  assert.ok(regeln(rutscht).some((x) => x.endsWith('Fußkontakt')), regeln(rutscht).join('; '));
});

test('Determinismus: zwei Bauläufe geben gleiche Bytes (MD5) für Blatt, Atlas und Kontaktbögen', () => {
  const summen = (): Map<string, string> => {
    const aus = new Map<string, string>();
    for (const f of figuren()) for (const [k, v] of figurBytes(f)) aus.set(k, typeof v === 'string' ? md5(new TextEncoder().encode(v)) : md5(v));
    return aus;
  };
  const a = summen();
  const b = summen();
  assert.ok(a.size >= 8);
  assert.deepEqual([...a], [...b]);
});

test('Ausgabe: spiel/grafik/ausgabe/vela.png und vela.json entsprechen dem Bau (npm run grafik)', () => {
  const png = SPIEL + 'grafik/ausgabe/vela.png';
  const json = SPIEL + 'grafik/ausgabe/vela.json';
  assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
  const blatt = blattPacken('vela', VELA.animationen);
  assert.ok(pngDateiLesen(png).gleich(blatt.leinwand), 'Pixel des Blatts');
  assert.equal(readFileSync(json, 'utf8'), atlasText(blatt.atlas));
});
