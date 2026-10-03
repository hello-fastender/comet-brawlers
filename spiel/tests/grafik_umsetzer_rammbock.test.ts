// Rammbock aus den Grok-Blättern (Auftrag 4, 9.3, Weg C; docs/grafik.md 5.7;
// angepasst an den Umsetzer v2, Auftrag 5, Phase 1, docs/grafik.md 5.8):
// Zellen je Reihe wie bestellt, Zuordnung vollständig und gleich dem Blatt
// der Gliederpuppe, Nachbestellungen, Prüfungen, Determinismus und
// Gleichheit der Ausgaben in spiel/grafik/ausgabe/ und docs/bilder/ mit dem
// Bau (npm run grafik).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUSGABE, BILDER, BLAETTER_DATEI, FREMD, FREMD_ORDNER, figuren, grokAusgabeBytes, grokGegenPuppe, grokOrdner, vergleichBytes,
} from '../grafik/quelle/bauen.ts';
import { farbenZaehlen } from '../grafik/quelle/palette.ts';
import { grokBytes, leseZuordnung, MASSSTAB, protokoll, STANDARD, umsetzenOrdner } from '../grafik/quelle/umsetzer.ts';
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

test('Rammbock grok: Zellen je Reihe wie bestellt, nichts verworfen', () => {
  assert.deepEqual(E.blaetter.map((b) => b.blatt), Object.keys(ZELLEN_JE_REIHE));
  for (const b of E.blaetter) {
    const jeZeile: number[] = [];
    for (const c of b.zellen) jeZeile[c.zeile - 1] = (jeZeile[c.zeile - 1] ?? 0) + 1;
    assert.deepEqual(jeZeile, ZELLEN_JE_REIHE[b.blatt], b.blatt);
    assert.equal(b.verworfen.length, 0, `${b.blatt}: nichts verworfen`);
  }
});

test('Rammbock grok: Zuordnung vollständig, Animationen wie rammbock.json, Stand genau 142 Bildpixel', () => {
  for (const a of ZUORDNUNG.animationen) {
    const atlas = E.blatt.atlas.animationen[a.name];
    assert.ok(atlas !== undefined, `Animation ${a.name} im Atlas`);
    assert.equal(atlas.bilder.length, a.dauern.length, `${a.name}: Bildzahl`);
    assert.deepEqual(atlas.aktiv, a.aktiv, `${a.name}: aktive Bilder`);
  }
  // Namen, Dauern, Schleife und aktive Bilder wie das Blatt der Gliederpuppe (die Darstellung erwartet sie so)
  const puppe = figuren().find((f) => f.name === 'rammbock')!;
  assert.deepEqual(grokGegenPuppe(E.animationen, puppe.animationen), []);
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
  assert.equal(stand.h, 142);
  // Stehende Posen anderer Blätter (Maßstab je Blatt, G0b-11) sind ebenso hoch
  for (const name of ['gehalten', 'aufstehen_hocke']) {
    const a = E.animationen.find((x) => x.name === name)!;
    const h = a.bilder[a.bilder.length - 1]!.leinwand.begrenzung()!.h;
    assert.ok(Math.abs(h - ZUORDNUNG.zielhoehe) <= 2 * MASSSTAB, `${name}: ${h} Bildpixel`);
  }
});

test('Rammbock grok: Nachbestellungen genau die Lücken (Haltung, Rückzug Schlag B, Landung Sprungtritt)', () => {
  assert.deepEqual(E.nachbestellungen.map((n) => `${n.animation} ${n.index} ← ${n.ersatz}`), [
    'haltung 1 ← haltung 0',
    'haltung 2 ← haltung 0',
    'schlag_b 3 ← schlag_b 2',
    'sprungtritt 2 ← hocke_ankuendigung 1',
    'sprungtritt 3 ← hocke_ankuendigung 0',
  ]);
});

test('Rammbock grok: keine harten Befunde, höchstens 64 Farben, Neukalibrierung und Fußkontakt-Rest im Protokoll', () => {
  assert.deepEqual(E.befunde.filter((b) => b.hart), []);
  assert.ok(farbenZaehlen(E.animationen.flatMap((a) => a.bilder.map((b) => b.leinwand))) <= STANDARD.hoechstFarben + 1);
  assert.ok(E.palette.palette.length <= STANDARD.hoechstFarben);
  // Blätter mit anderer Figurgröße: Befund je Blatt
  for (const blatt of ['rammbock_b_gehen.png', 'rammbock_c_angriffe.png', 'rammbock_d_reaktionen.png', 'rammbock_e_griff.png']) {
    assert.ok(E.befunde.some((b) => !b.hart && b.text.startsWith(`${blatt}: Figur`) && b.text.includes('neu kalibriert')), blatt);
  }
  const text = protokoll(E);
  assert.match(text, /- gehen: Strecke 12\.8 Bildpixel je Bild, Rest -?\d+\.\d Bildpixel je Zyklus/);
  assert.match(text, /- gehen_schnell: Strecke 12\.0 Bildpixel je Bild, Rest -?\d+\.\d Bildpixel je Zyklus/);
});

test('Rammbock grok: deterministisch, zwei Läufe ergeben gleiche Bytes und gleiches Protokoll', () => {
  const a = grokBytes(E);
  const b = grokBytes(ZWEITER);
  assert.deepEqual(a.png, b.png);
  assert.equal(a.json, b.json);
  assert.equal(protokoll(E), protokoll(ZWEITER));
});

test('Ausgabe: rammbock_grok.png/.json, Kontaktbögen, vergleich_rammbock.png und blaetter.json entsprechen dem Bau (npm run grafik)', () => {
  assert.ok(FREMD_ORDNER.includes('rammbock'), 'Ordner fremd/rammbock wird gebaut');
  assert.deepEqual(grokOrdner().map((o) => `${o.figur} ← ${o.ordner}`), ['rammbock_grok ← rammbock']);
  assert.equal(E.figur, 'rammbock_grok');
  for (const [datei, inhalt] of grokAusgabeBytes(E)) {
    const pfad = join(datei.startsWith('kontakt_') ? BILDER : AUSGABE, datei);
    if (typeof inhalt === 'string') assert.equal(readFileSync(pfad, 'utf8'), inhalt, datei);
    else assert.deepEqual(new Uint8Array(readFileSync(pfad)), inhalt, datei);
  }
  const vergleich = vergleichBytes(figuren(), [E]);
  assert.ok(vergleich !== null);
  assert.deepEqual(new Uint8Array(readFileSync(join(BILDER, VERGLEICH_DATEI))), vergleich);
  const blaetter = JSON.parse(readFileSync(join(AUSGABE, BLAETTER_DATEI), 'utf8')) as string[];
  assert.ok(blaetter.includes('rammbock_grok') && blaetter.includes('rammbock'));
  // Das Blatt rammbock_fremd (v1) entfällt aus dem Bau (Auftrag 5, Phase 1)
  assert.ok(!blaetter.includes('rammbock_fremd'));
  assert.ok(!existsSync(join(AUSGABE, 'rammbock_fremd.png')) && !existsSync(join(AUSGABE, 'rammbock_fremd.json')));
  assert.ok(!existsSync(join(BILDER, 'kontakt_rammbock_fremd_stand.png')));
});
