// Rammbock aus den Grok-Blättern (Auftrag 4, 9.3, Weg C; docs/grafik.md 5.7):
// Zellen je Reihe wie bestellt, Zuordnung vollständig nach Auftrag 4, 3,
// Nachbestellungen, Prüfungen, Determinismus und Gleichheit der Ausgaben in
// spiel/grafik/ausgabe/ und docs/bilder/ mit dem Bau (npm run grafik).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BILDER, AUSGABE, FREMD, FREMD_ORDNER, figuren, vergleichBytes } from '../grafik/quelle/bauen.ts';
import { blattBytes } from '../grafik/quelle/blatt.ts';
import { pngSchreiben } from '../grafik/quelle/png.ts';
import { kontaktBogen } from '../grafik/quelle/kontakt.ts';
import { FARBBUDGET, farbenZaehlen } from '../grafik/quelle/palette.ts';
import { leseZuordnung, protokoll, umsetzenOrdner } from '../grafik/quelle/umsetzer.ts';
import { VERGLEICH_DATEI } from '../grafik/quelle/vergleich.ts';

const ORDNER = join(FREMD, 'rammbock');
const E = umsetzenOrdner(ORDNER);
const ZWEITER = umsetzenOrdner(ORDNER);
const ZUORDNUNG = leseZuordnung(readFileSync(join(ORDNER, 'zuordnung.txt'), 'utf8'));

/** Zellen je Blattzeile laut quelle.txt und Bestellliste. */
const ZELLEN_JE_REIHE: Readonly<Record<string, readonly number[]>> = {
  'rammbock_a_posen.png': [4, 4, 4],
  'rammbock_b_gehen.png': [8],
  'rammbock_c_angriffe.png': [5, 5, 4, 2],
  'rammbock_d_reaktionen.png': [3, 5, 6, 6],
  'rammbock_e_griff.png': [3],
};

test('Rammbock fremd: Zellen je Reihe wie bestellt, nichts verworfen', () => {
  assert.deepEqual(E.blaetter.map((b) => b.blatt), Object.keys(ZELLEN_JE_REIHE));
  for (const b of E.blaetter) {
    const jeZeile: number[] = [];
    for (const c of b.zellen) jeZeile[c.zeile - 1] = (jeZeile[c.zeile - 1] ?? 0) + 1;
    assert.deepEqual(jeZeile, ZELLEN_JE_REIHE[b.blatt], b.blatt);
    assert.equal(b.verworfen.length, 0, `${b.blatt}: nichts verworfen`);
  }
});

test('Rammbock fremd: Zuordnung vollständig, jede Animation mit allen Bildern, Stand genau 71 px', () => {
  for (const a of ZUORDNUNG.animationen) {
    const atlas = E.blatt.atlas.animationen[a.name];
    assert.ok(atlas !== undefined, `Animation ${a.name} im Atlas`);
    assert.equal(atlas.bilder.length, a.dauern.length, `${a.name}: Bildzahl`);
    assert.deepEqual(atlas.aktiv, a.aktiv, `${a.name}: aktive Bilder`);
  }
  // Jede Zelle der Blätter außer den bewusst nicht verwendeten ist zugeordnet
  const benutzt = new Set(ZUORDNUNG.bilder.map((b) => `${b.blatt}#${b.zelle}`));
  const frei = E.blaetter.flatMap((b) => b.zellen.filter((c) => !benutzt.has(`${b.blatt}#${c.nr}`)).map((c) => `${b.blatt}#${c.nr}`));
  assert.deepEqual(frei, [
    'rammbock_a_posen.png#2', 'rammbock_a_posen.png#3', 'rammbock_a_posen.png#7', 'rammbock_a_posen.png#8',
    'rammbock_a_posen.png#9', 'rammbock_a_posen.png#10', 'rammbock_a_posen.png#12',
    'rammbock_c_angriffe.png#11', 'rammbock_c_angriffe.png#14',
  ]);
  const stand = E.animationen.find((a) => a.name === 'stand')!.bilder[0]!.leinwand.begrenzung()!;
  assert.equal(stand.h, ZUORDNUNG.zielhoehe);
  // Stehende Posen anderer Blätter (Maßstab je Blatt, G0b-11) sind ebenso hoch
  for (const name of ['gehalten', 'aufstehen_hocke']) {
    const a = E.animationen.find((x) => x.name === name)!;
    const h = a.bilder[a.bilder.length - 1]!.leinwand.begrenzung()!.h;
    assert.ok(Math.abs(h - ZUORDNUNG.zielhoehe) <= 2, `${name}: ${h} px`);
  }
});

test('Rammbock fremd: Nachbestellungen genau die Lücken (Haltung, Rückzug Schlag B, Landung Sprungtritt)', () => {
  assert.deepEqual(E.nachbestellungen.map((n) => `${n.animation} ${n.index} ← ${n.ersatz}`), [
    'haltung 1 ← haltung 0',
    'haltung 2 ← haltung 0',
    'schlag_b 3 ← schlag_b 2',
    'sprungtritt 2 ← hocke_ankuendigung 1',
    'sprungtritt 3 ← hocke_ankuendigung 0',
  ]);
});

test('Rammbock fremd: keine harten Befunde, höchstens 16 Farben, Fußkontakt nur als Befund', () => {
  assert.deepEqual(E.befunde.filter((b) => b.hart), []);
  assert.ok(farbenZaehlen(E.animationen.flatMap((a) => a.bilder.map((b) => b.leinwand))) <= FARBBUDGET.figur);
  assert.ok(E.palette.stufen.length <= 15);
  assert.ok(E.pruefFigur.weich?.has('Fußkontakt'));
});

test('Rammbock fremd: deterministisch, zwei Läufe ergeben gleiche Bytes und gleiches Protokoll', () => {
  const a = blattBytes(E.blatt);
  const b = blattBytes(ZWEITER.blatt);
  assert.deepEqual(a.png, b.png);
  assert.equal(a.json, b.json);
  assert.equal(protokoll(E), protokoll(ZWEITER));
});

test('Ausgabe: rammbock_fremd.png/.json, Kontaktbögen und vergleich_rammbock.png entsprechen dem Bau (npm run grafik)', () => {
  assert.ok(FREMD_ORDNER.includes('rammbock'), 'in bauen.ts registriert (fremdFiguren)');
  const fremd = E.pruefFigur;
  assert.equal(fremd.name, 'rammbock_fremd');
  const bytes = blattBytes(E.blatt);
  assert.deepEqual(new Uint8Array(readFileSync(join(AUSGABE, 'rammbock_fremd.png'))), bytes.png);
  assert.equal(readFileSync(join(AUSGABE, 'rammbock_fremd.json'), 'utf8'), bytes.json);
  for (const a of E.animationen) {
    assert.deepEqual(new Uint8Array(readFileSync(join(BILDER, `kontakt_rammbock_fremd_${a.name}.png`))), pngSchreiben(kontaktBogen(a)), a.name);
  }
  const vergleich = vergleichBytes([...figuren(), fremd]);
  assert.ok(vergleich !== null);
  assert.deepEqual(new Uint8Array(readFileSync(join(BILDER, VERGLEICH_DATEI))), vergleich);
});
