// Tests der Vela-Animationen aus Phase 2 (Auftrag 4, G1): Vollständigkeit
// nach Auftrag 4, Abschnitt 3, Stilprüfung (Kontur, Streupixel, Farben,
// Anker, Fußkontakt auch mit Waffe), Farbbudget und Tonzuteilung aus
// docs/grafik.md 4.1, Dauern und aktive Bilder gegen die Logik (werte.ts),
// Trefferbilder mit der größten Reichweite, Rückwärtsbilder des
// Spezialangriffs, Werferpunkte, Sprintschritt, Phase 1 bitgleich, Blatt,
// Determinismus. Baut nur Vela (velaAnimationen), nicht die anderen Figuren.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Animation, Bild } from '../grafik/quelle/blatt.ts';
import { BLATT_MAX, blattBytes, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Figur } from '../grafik/quelle/bauen.ts';
import { figurPruefen } from '../grafik/quelle/bauen.ts';
import { GEHEN_SCHRITT, velaAnimationen } from '../grafik/quelle/figuren/vela.ts';
import { SPRINT_SCHRITT } from '../grafik/quelle/figuren/vela_bewegung.ts';
import { werferPunkte } from '../grafik/quelle/figuren/vela_kampf.ts';
import * as Z from '../grafik/quelle/figuren/vela_zeiten.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { deckend } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, HANDSCHUH_VELA, JACKE_VELA, SPULE, farbenMenge, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { md5, pngSchreiben } from '../grafik/quelle/png.ts';
import { UMRISS_FIGUR } from '../src/darstellung/masse.ts';
import {
  F1_STILLSTAND,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  FIGUR_UMGEWORFEN_BODEN,
  KNIESTOSS_TREFFER,
  RAKETE_ABSCHUSS,
  SPEZIAL_STUFE_DAUER,
  SPEZIAL_STUFE_VON,
  SPRINTANGRIFF,
  SPRUNGANGRIFF,
  SPRUNG_SCHEITEL_FRAME,
  SS_ERSTER_AKTIV,
  SS_ZWEITER_AKTIV_BIS,
  SS_ZWEITER_AKTIV_VON,
  WURF_LOSLASSEN,
  WURF_TREFFER,
} from '../src/kern/werte.ts';

const ANIM = velaAnimationen();
const VELA: Figur = { name: 'vela', umriss: UMRISS_FIGUR, animationen: ANIM, glanz: new Set<Pixel>([SPULE]), budget: FARBBUDGET.figur, gehen: 'gehen', schritt: GEHEN_SCHRITT };
const anim = (name: string): Animation => {
  const a = ANIM.find((x) => x.name === name);
  assert.ok(a !== undefined, `Animation ${name} fehlt`);
  return a;
};
const bild = (name: string, i: number): Bild => zugeschnitten(anim(name).bilder[i] as Bild);
/** vorderster deckender Pixel vor dem Anker (px). */
const vorn = (b: Bild): number => b.leinwand.breite - 1 - b.ankerX;

/** Auftrag 4, Abschnitt 3, Zeile Vela: Name, Bilder, Schleife. */
const SOLL: readonly (readonly [string, number, boolean])[] = [
  ['stand', 1, true],
  ['gehen', 12, true],
  ['kette1', 6, false],
  ['kette2', 4, false],
  ['kette3', 5, false],
  ['kette4', 12, false],
  ['sprint', 6, true],
  ['sprung', 9, false],
  ['sprungangriff', 5, false],
  ['richtung', 6, false],
  ['hoch', 11, false],
  ['runter', 3, false],
  ['griff', 4, false],
  ['kniestoss', 6, false],
  ['wurf', 6, false],
  ['spezial', 14, false],
  ['sprintangriff', 6, false],
  ['sprint_sprungangriff', 5, false],
  ['getroffen_vorn', 5, false],
  ['getroffen_hinten', 5, false],
  ['umgeworfen', 5, false],
  ['liegen', 1, true],
  ['aufstehen', 6, false],
  ['tot', 1, true],
  ['waffe_stand', 1, true],
  ['waffe_gehen', 12, true],
  ['waffe_schuss', 3, false],
  ['aufnehmen', 3, false],
  ['neueinstieg_fall', 2, true],
  ['neueinstieg_landung', 2, false],
];

test('Vela Phase 2: alle Animationen aus Auftrag 4, Abschnitt 3, mit Bildzahl und Schleife', () => {
  assert.deepEqual(
    ANIM.map((a) => [a.name, a.bilder.length, a.schleife]),
    SOLL.map((s) => [...s]),
  );
});

test('Vela Phase 2: Stilprüfung ohne Befunde, Fußkontakt auch beim Gehen mit Waffe', () => {
  assert.deepEqual(figurPruefen(VELA), []);
  assert.deepEqual(figurPruefen({ ...VELA, gehen: 'waffe_gehen' }).filter((b) => b.regel === 'Fußkontakt'), []);
});

test('Vela Phase 2: Farbbudget 16 und nur die Farben der Tonzuteilung (docs/grafik.md 4.1)', () => {
  const phase1 = ANIM.slice(0, 6).flatMap((a) => a.bilder.map((b) => b.leinwand));
  const erlaubt = farbenMenge(phase1);
  assert.equal(erlaubt.size, FARBBUDGET.figur);
  for (const a of ANIM) {
    a.bilder.forEach((b, i) => {
      assert.ok(farbenZaehlen(b.leinwand) <= FARBBUDGET.figur, `${a.name} Bild ${i}`);
      for (const f of farbenMenge(b.leinwand)) assert.ok(erlaubt.has(f), `${a.name} Bild ${i}: Farbe ${f.toString(16)} nicht in der Zuteilung`);
    });
  }
});

test('Vela Phase 2: Dauern wie die Tabellen in vela_zeiten.ts, Summen wie die Logik', () => {
  const tabellen: Record<string, readonly number[]> = {
    sprint: Z.SPRINT_DAUERN,
    sprung: Z.SPRUNG_DAUERN,
    sprungangriff: Z.SPRUNGANGRIFF_N_DAUERN,
    richtung: Z.SPRUNGANGRIFF_R_DAUERN,
    hoch: Z.SPRUNGANGRIFF_H_DAUERN,
    runter: Z.SPRUNGANGRIFF_T_DAUERN,
    griff: Z.GRIFF_DAUERN,
    kniestoss: Z.KNIESTOSS_DAUERN,
    wurf: Z.WURF_DAUERN,
    spezial: Z.SPEZIAL_DAUERN,
    sprintangriff: Z.SPRINTANGRIFF_DAUERN,
    sprint_sprungangriff: Z.SPRINT_SPRUNGANGRIFF_DAUERN,
    getroffen_vorn: Z.GETROFFEN_DAUERN,
    getroffen_hinten: Z.GETROFFEN_DAUERN,
    umgeworfen: Z.UMGEWORFEN_DAUERN,
    liegen: Z.LIEGEN_DAUERN,
    aufstehen: Z.AUFSTEHEN_DAUERN,
    waffe_schuss: Z.WAFFE_SCHUSS_DAUERN,
    aufnehmen: Z.AUFNEHMEN_DAUERN,
    neueinstieg_fall: Z.NEUEINSTIEG_FALL_DAUERN,
    neueinstieg_landung: Z.NEUEINSTIEG_LANDUNG_DAUERN,
  };
  for (const [name, d] of Object.entries(tabellen)) assert.deepEqual(anim(name).bilder.map((b) => b.dauer), [...d], name);
  assert.ok(anim('waffe_gehen').bilder.every((b) => b.dauer === anim('gehen').bilder[0]?.dauer));
  const L = Z.LOGIK_SUMMEN;
  assert.equal(Z.summe(Z.SPRUNG_LUFT_DAUERN), L.sprungLuft);
  assert.equal(Z.summe(Z.SPRUNG_LANDUNG_DAUERN), L.sprungLandung);
  assert.equal(Z.summe(Z.SPRUNGANGRIFF_H_DAUERN), L.hoch);
  assert.equal(Z.summe(Z.GRIFF_DAUERN), L.griff);
  assert.equal(Z.summe(Z.KNIESTOSS_DAUERN), L.kniestoss);
  assert.equal(Z.summe(Z.WURF_DAUERN), L.wurf);
  assert.equal(Z.summe(Z.SPEZIAL_DAUERN), L.spezial);
  assert.equal(Z.summe(Z.SPRINTANGRIFF_DAUERN), L.sprintangriff);
  assert.equal(Z.summe(Z.GETROFFEN_DAUERN), L.getroffen);
  assert.equal(Z.summe(Z.UMGEWORFEN_DAUERN), L.umgeworfen);
  assert.equal(Z.summe(Z.AUFSTEHEN_DAUERN), L.aufstehen);
  assert.equal(Z.summe(Z.WAFFE_SCHUSS_DAUERN), L.waffe);
  assert.equal(Z.summe(Z.AUFNEHMEN_DAUERN), L.aufnehmen);
  assert.equal(Z.summe(Z.NEUEINSTIEG_LANDUNG_DAUERN), L.neueinstiegLandung);
  // Sprint-Sprungangriff: Bilder 0 bis 3 bis zum Ende der Instanz (ss_n 39), Bild 4 in der Landung
  assert.equal(Z.summe(Z.SPRINT_SPRUNGANGRIFF_DAUERN.slice(0, 4)), SS_ZWEITER_AKTIV_BIS);
});

test('Vela Phase 2: Bildwechsel an den Zeitpunkten der Logik', () => {
  const u = Z.bildZurUhr;
  // Sprung: Scheitel J+21 im Scheitelbild
  assert.equal(u(Z.SPRUNG_LUFT_DAUERN, SPRUNG_SCHEITEL_FRAME), Z.SPRUNG_SCHEITEL_BILD);
  assert.equal(Z.SPRUNG_SCHEITEL_BILD, 3);
  // Umgeworfen: Bild 1 über den Stillstand H+1 bis H+8, Bild 2 ab dem ersten Bahnframe H+9, Bild 4 ab dem Bodenkontakt H+46
  for (let d = 1; d <= F1_STILLSTAND; d++) assert.equal(u(Z.UMGEWORFEN_DAUERN, d + 1), 1, `H+${d}`);
  assert.equal(u(Z.UMGEWORFEN_DAUERN, F1_STILLSTAND + 2), 2);
  assert.equal(u(Z.UMGEWORFEN_DAUERN, FIGUR_UMGEWORFEN_BODEN), 3);
  assert.equal(u(Z.UMGEWORFEN_DAUERN, FIGUR_UMGEWORFEN_BODEN + 1), 4);
  // Tod im Flug (F4): Stillstand t+1, t+2 im Bild 1, Bahn ab t+3 im Bild 2, Aufprall ab dem Bodenkontakt t+40, tot ab der Ruhe t+49 (uhr = d + 1)
  assert.equal(u(Z.TOT_FLUG_DAUERN, F4_STILLSTAND + 1), 1);
  assert.equal(u(Z.TOT_FLUG_DAUERN, F4_STILLSTAND + 2), 2);
  assert.equal(u(Z.TOT_FLUG_DAUERN, F4_BODEN), 3);
  assert.equal(u(Z.TOT_FLUG_DAUERN, F4_BODEN + 1), 4);
  assert.equal(Z.summe(Z.TOT_FLUG_DAUERN), F4_RUHE);
  // Wurf: Loslassen E+22 beginnt Bild 3
  assert.equal(u(Z.WURF_DAUERN, WURF_LOSLASSEN), 3);
  assert.equal(u(Z.WURF_DAUERN, WURF_LOSLASSEN - 1), 2);
  assert.equal(Z.WURF_LOSLASS_BILD, 3);
  // Spezialangriff: jede Flächenstufe ein eigenes Bild über alle 6 Frames
  SPEZIAL_STUFE_VON.forEach((von, k) => {
    for (let t = 0; t < SPEZIAL_STUFE_DAUER; t++) assert.equal(u(Z.SPEZIAL_DAUERN, von + t), 4 + k, `Stufe ${k + 1}, uhr ${von + t}`);
  });
});

test('Vela Phase 2: Trefferbild im ersten aktiven Frame, alle aktiven Frames zeigen es', () => {
  const fenster: readonly (readonly [string, readonly number[], number, number])[] = [
    ['sprungangriff', Z.SPRUNGANGRIFF_N_DAUERN, SPRUNGANGRIFF.N.aktiv_von, SPRUNGANGRIFF.N.aktiv_bis],
    ['richtung', Z.SPRUNGANGRIFF_R_DAUERN, SPRUNGANGRIFF.R.aktiv_von, SPRUNGANGRIFF.R.aktiv_bis],
    ['hoch', Z.SPRUNGANGRIFF_H_DAUERN, SPRUNGANGRIFF.H.aktiv_von, SPRUNGANGRIFF.H.aktiv_bis],
    ['runter', Z.SPRUNGANGRIFF_T_DAUERN, SPRUNGANGRIFF.T.aktiv_von, SPRUNGANGRIFF.T.aktiv_bis],
    ['kniestoss', Z.KNIESTOSS_DAUERN, KNIESTOSS_TREFFER, KNIESTOSS_TREFFER],
    ['wurf', Z.WURF_DAUERN, WURF_TREFFER, WURF_TREFFER],
    ['sprintangriff', Z.SPRINTANGRIFF_DAUERN, SPRINTANGRIFF.aktiv_von, SPRINTANGRIFF.aktiv_bis],
    ['waffe_schuss', Z.WAFFE_SCHUSS_DAUERN, RAKETE_ABSCHUSS, RAKETE_ABSCHUSS],
  ];
  for (const [name, dauern, von, bis] of fenster) {
    const treffer = Z.bildZurUhr(dauern, von);
    assert.equal(anim(name).aktiv?.[0], treffer, name);
    for (let uhr = von; uhr <= bis; uhr++) assert.equal(Z.bildZurUhr(dauern, uhr), treffer, `${name} uhr ${uhr}`);
  }
  // Sprint-Sprungangriff: ss_n 13 und 20 bis 39
  const ss = anim('sprint_sprungangriff').aktiv ?? [];
  assert.deepEqual(ss, [Z.bildZurUhr(Z.SPRINT_SPRUNGANGRIFF_DAUERN, SS_ERSTER_AKTIV), Z.bildZurUhr(Z.SPRINT_SPRUNGANGRIFF_DAUERN, SS_ZWEITER_AKTIV_VON)]);
  for (let n = SS_ZWEITER_AKTIV_VON; n <= SS_ZWEITER_AKTIV_BIS; n++) assert.equal(Z.bildZurUhr(Z.SPRINT_SPRUNGANGRIFF_DAUERN, n), ss[1], `ss_n ${n}`);
  // Spezialangriff: die sechs Stufenbilder
  assert.deepEqual(anim('spezial').aktiv, SPEZIAL_STUFE_VON.map((v) => Z.bildZurUhr(Z.SPEZIAL_DAUERN, v)));
});

test('Vela Phase 2: Trefferbilder reichen am weitesten nach vorn (Angriffe mit Fläche vor der Figur)', () => {
  for (const name of ['sprungangriff', 'richtung', 'hoch', 'runter', 'kniestoss', 'sprintangriff', 'sprint_sprungangriff']) {
    const a = anim(name);
    const r = a.bilder.map((_, i) => vorn(bild(name, i)));
    const t = a.aktiv?.[0] as number;
    assert.equal(Math.max(...r), r[t], `${name}: Reichweiten ${r.join(', ')}, Trefferbild ${t}`);
  }
  // Richtung, Sprintangriff und Sprint-Sprungangriff strecken sich deutlich über den Stand hinaus (Stand 27 px)
  assert.ok(vorn(bild('richtung', 2)) >= 40);
  assert.ok(vorn(bild('sprintangriff', 3)) >= 50);
  assert.ok(vorn(bild('sprint_sprungangriff', 2)) >= 40);
});

test('Vela Phase 2: Spezialangriff zeigt die zweite Hälfte rückwärts, Tod gleich Liegen', () => {
  const sp = anim('spezial').bilder;
  for (let i = 0; i < 7; i++) {
    const a = zugeschnitten(sp[i] as Bild);
    const b = zugeschnitten(sp[13 - i] as Bild);
    assert.ok(a.leinwand.gleich(b.leinwand) && a.ankerX === b.ankerX && a.ankerY === b.ankerY, `Stufe ${i} und ${13 - i}`);
  }
  assert.deepEqual([...Z.SPEZIAL_FOLGE], [0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0]);
  assert.ok(bild('tot', 0).leinwand.gleich(bild('liegen', 0).leinwand));
  // Liegen: flach, gut doppelt so breit wie hoch, Fußpunkt unter der Hüfte (Mitte)
  const l = bild('liegen', 0);
  assert.ok(l.leinwand.breite >= 2 * l.leinwand.hoehe, `${l.leinwand.breite} × ${l.leinwand.hoehe}`);
  assert.ok(Math.abs(l.ankerX - l.leinwand.breite / 2) <= 6, `ankerX ${l.ankerX} von ${l.leinwand.breite}`);
});

test('Vela Phase 2: Werferpunkt liegt im vorderen Handschuh (Griff des Raketenwerfers)', () => {
  const handschuh = new Set<Pixel>([JACKE_VELA.treppe[1], JACKE_VELA.treppe[2], JACKE_VELA.treppe[3], HANDSCHUH_VELA.treppe[3], SPULE]);
  const punkte = werferPunkte();
  for (const name of ['waffe_stand', 'waffe_gehen', 'waffe_schuss']) {
    const p = punkte[name] ?? [];
    assert.equal(p.length, anim(name).bilder.length, name);
    p.forEach((q, i) => {
      const b = bild(name, i);
      const px = b.leinwand.hole(b.ankerX + q.x, b.ankerY + q.y);
      assert.ok(deckend(px) && handschuh.has(px), `${name} Bild ${i}: Werferpunkt (${q.x}, ${q.y}) nicht im Handschuh`);
      // auf Schulterhöhe (Rakete startet 50 px hoch, Kampf 10.3)
      assert.ok(q.y <= -46 && q.y >= -54, `${name} Bild ${i}: Höhe ${q.y}`);
    });
  }
  // Rückstoß: der Werfer rückt beim Abschuss zurück
  const s = punkte.waffe_schuss ?? [];
  assert.ok((s[1]?.x ?? 0) < (s[0]?.x ?? 0));
});

test('Vela Phase 2: Sprint, der Standfuß rückt je Bild um 4 Frames Sprinttempo zurück (15,5 px)', () => {
  assert.equal(SPRINT_SCHRITT, 15.5);
  const sohlen = (i: number): [number, number][] => {
    const b = bild('sprint', i);
    const aus: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= b.leinwand.breite; x++) {
      const an = x < b.leinwand.breite && deckend(b.leinwand.hole(x, b.ankerY));
      if (an && start < 0) start = x;
      if (!an && start >= 0) {
        aus.push([start - b.ankerX, x - 1 - b.ankerX]);
        start = -1;
      }
    }
    return aus;
  };
  for (const [a, c] of [
    [0, 1],
    [3, 4],
  ] as const) {
    const ok = sohlen(a).some((p) => sohlen(c).some((q) => Math.abs(q[0] - p[0] + SPRINT_SCHRITT) <= 1 || Math.abs(q[1] - p[1] + SPRINT_SCHRITT) <= 1));
    assert.ok(ok, `Sprint ${a} → ${c}: ${JSON.stringify(sohlen(a))} → ${JSON.stringify(sohlen(c))}`);
  }
});

test('Vela Phase 2: stand, gehen und Kette bitgleich zu Phase 1 (G0)', () => {
  const text = ANIM.slice(0, 6)
    .map((a) => `${a.name}:${a.bilder.map((roh) => {
      const z = zugeschnitten(roh);
      return `${md5(pngSchreiben(z.leinwand))}@${z.ankerX},${z.ankerY},${roh.dauer}`;
    }).join(',')}`)
    .join(';');
  assert.equal(md5(new TextEncoder().encode(text)), 'ef5860311eaae11a9f0479c5eb268a29');
});

test('Vela Phase 2: Blatt höchstens 2048 px, Phase 1 an alter Stelle, deterministisch', () => {
  const blatt = blattPacken('vela', ANIM);
  assert.ok(blatt.leinwand.breite <= BLATT_MAX && blatt.leinwand.hoehe <= BLATT_MAX, `${blatt.leinwand.breite} × ${blatt.leinwand.hoehe}`);
  const alt = blattPacken('vela', ANIM.slice(0, 6));
  for (const n of Object.keys(alt.atlas.animationen)) assert.deepEqual(blatt.atlas.animationen[n], alt.atlas.animationen[n], n);
  // ohne zeileFortsetzen beginnt jede Animation eine neue Zeile (Packen wie vor G1)
  const ohne = blattPacken('probe', ANIM.slice(6, 9).map((a) => ({ name: a.name, schleife: a.schleife, bilder: a.bilder })));
  const y = Object.values(ohne.atlas.animationen).map((a) => a.bilder[0]?.y ?? -1);
  assert.ok((y[0] as number) < (y[1] as number) && (y[1] as number) < (y[2] as number), `Zeilen ${y.join(', ')}`);
  const zweiter = blattBytes(blattPacken('vela', velaAnimationen()));
  const erster = blattBytes(blatt);
  assert.equal(md5(zweiter.png), md5(erster.png));
  assert.equal(zweiter.json, erster.json);
});
