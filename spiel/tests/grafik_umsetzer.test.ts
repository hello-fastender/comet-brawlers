// Einzeltests des Umsetzers für Bildblätter (Auftrag 4, 9.3; docs/grafik.md 5)
// an kleinen, im Test gebauten Bildern. Farben nur aus palette.ts (und
// daraus gemischt). Der Gesamtablauf am synthetischen Blatt steht in
// grafik_umsetzer_blatt.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UMRISS_GEGNER } from '../src/darstellung/masse.ts';
import { NAH_ANGRIFFE } from '../src/kern/werte.ts';
import { farbAbstand, mischen } from '../grafik/quelle/farbe.ts';
import { Leinwand } from '../grafik/quelle/leinwand.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import {
  HAUT_MITTEL, HOSE_BRAUN, KONTUR, LEDER, LEISTE_TEXT, NACHTHIMMEL, STAHL, STERNBEERE, TON_DUNKEL, TON_GRUND, TON_SCHATTEN, WESTE_OLIV,
} from '../grafik/quelle/palette.ts';
import {
  bestimmeAnker, bestimmeFaktor, bildePalette, findeZellen, freistellen, gehgeschwindigkeit, glanzToene, innenkonturen, konturieren,
  leseQuelle, leseZuordnung, pruefeGrundlinie, schneideAus, STANDARD, stufenFuer, stufenName, verkleinere,
} from '../grafik/quelle/umsetzer.ts';

const GRUND = NACHTHIMMEL.treppe[TON_GRUND];
const HAUT = HAUT_MITTEL.treppe[TON_GRUND];
const OLIV = WESTE_OLIV.treppe[TON_GRUND];
const RAMMBOCK = ['HAUT_MITTEL', 'WESTE_OLIV', 'HOSE_BRAUN', 'STAHL', 'LEDER'];

function deckkraftWerte(l: Leinwand): Set<number> {
  const s = new Set<number>();
  for (const p of l.daten) s.add(p & 0xff);
  return s;
}

test('Freistellen: Hintergrund aus den Ecken, Randpixel nach dem Mehrheitsnachbarn, keine Halbtransparenz', () => {
  const l = new Leinwand(20, 20);
  l.fuelle(GRUND);
  l.rechteck(5, 5, 8, 8, HAUT);
  // Randpixel (15 % Haut auf Grund): Abstand zwischen beiden Toleranzen.
  const rand = mischen(GRUND, HAUT, 0.15);
  const d = farbAbstand(rand, GRUND);
  assert.ok(d > STANDARD.toleranzHintergrund && d < STANDARD.toleranzFigur, `Randpixel liegt zwischen den Toleranzen (${d})`);
  l.setze(13, 8, rand); // rechts am Block: 3 Figurnachbarn, 5 Hintergrund → Hintergrund
  l.setze(12, 13, rand); // unter dem Block an der Ecke: 2 Figur, 6 Hintergrund → Hintergrund
  l.setze(2, 16, rand); // allein im Grund → Hintergrund
  // Kerbe im Block: Randpixel mit 7 Figurnachbarn → Figur mit der Farbe des Mehrheitsnachbarn.
  l.setze(8, 5, rand);
  const fs = freistellen(l);
  assert.equal(fs.hintergrund.farbe, GRUND);
  assert.equal(fs.maske[8 * 20 + 13], 0);
  assert.equal(fs.maske[13 * 20 + 12], 0);
  assert.equal(fs.maske[16 * 20 + 2], 0);
  assert.equal(fs.maske[5 * 20 + 8], 1);
  assert.equal(fs.farbe[5 * 20 + 8], HAUT, 'Kantenpixel bekommt die Farbe des Mehrheitsnachbarn');
  const z = findeZellen(fs);
  assert.equal(z.zellen.length, 1);
  const aus = schneideAus(fs, z, z.zellen[0]!);
  for (const a of deckkraftWerte(aus)) assert.ok(a === 0 || a === 255, 'nur deckend oder durchsichtig');
  assert.equal(aus.breite, 8);
  assert.equal(aus.hoehe, 8);
});

test('Freistellen: dunkle Innenfläche ohne Hintergrundkontakt bleibt Figur', () => {
  const l = new Leinwand(30, 30);
  l.fuelle(GRUND);
  l.rechteck(5, 5, 20, 20, OLIV);
  // dunkles Feld im Inneren, nahe am Hintergrund (Randklasse), tiefer als ein Durchgang
  const dunkel = mischen(GRUND, OLIV, 0.2);
  l.rechteck(9, 9, 12, 12, dunkel);
  const fs = freistellen(l);
  for (let y = 9; y < 21; y++) for (let x = 9; x < 21; x++) assert.equal(fs.maske[y * 30 + x], 1, `(${x}, ${y}) bleibt Figur`);
  assert.equal(fs.farbe[15 * 30 + 15], dunkel, 'Innenpixel behält seine Farbe');
});

test('Zellen: Reihenfolge zeilenweise, kleine Bereiche verworfen oder angeschlossen, liegende Pose bleibt (G0b-1)', () => {
  const l = new Leinwand(300, 300);
  l.fuelle(GRUND);
  // Zeile 1: zwei stehende Figuren (40 × 60 = 2400 ≥ 1/50 von 90 000 = 1800)
  l.rechteck(160, 20, 40, 60, OLIV);
  l.rechteck(20, 25, 40, 30, OLIV); // Winkel: Rechteck 40 × 55
  l.rechteck(20, 55, 15, 25, OLIV);
  // Splitter im Rechteck der ersten Figur, ohne Verbindung: schließt sich an
  l.rechteck(50, 70, 3, 3, HAUT);
  // Zeile 2: liegende Figur 50 × 20 = 1000 < 1800, aber ≥ 1/4 der größten (600): bleibt
  l.rechteck(100, 200, 50, 20, OLIV);
  // Nummer 4 × 6 und Staub 2 × 2: verworfen
  l.rechteck(5, 150, 4, 6, LEISTE_TEXT);
  l.rechteck(250, 260, 2, 2, LEISTE_TEXT);
  const fs = freistellen(l);
  const z = findeZellen(fs);
  assert.equal(z.zellen.length, 3);
  assert.deepEqual(z.zellen.map((c) => [c.nr, c.zeile, c.links, c.oben]), [
    [1, 1, 20, 25],
    [2, 1, 160, 20],
    [3, 2, 100, 200],
  ]);
  assert.equal(z.verworfen.length, 2);
  assert.deepEqual(z.verworfen.map((v) => [v.links, v.oben, v.breite, v.hoehe]), [[5, 150, 4, 6], [250, 260, 2, 2]]);
  // ohne die Ausnahme G0b-1 fiele die liegende Pose weg
  const streng = findeZellen(fs, { ...STANDARD, vergleichsAnteil: 1 });
  assert.equal(streng.zellen.length, 2);
  // Grundlinie: erste Zeile endet bei 80 und 80
  assert.deepEqual(pruefeGrundlinie(z), []);
});

test('Zellen im festen Raster (quelle.txt): Feldnummern, Nummer im Feld verworfen, leere Felder gemeldet', () => {
  const l = new Leinwand(120, 80);
  l.fuelle(GRUND);
  l.rechteck(10, 10, 15, 25, OLIV); // Feld 1
  l.rechteck(2, 2, 2, 3, LEISTE_TEXT); // Nummer in Feld 1
  l.rechteck(90, 50, 20, 25, OLIV); // Feld 6
  const quelle = leseQuelle('Datum 2026-10-03\nWerkzeug Grok\nPrompt: Blatt A, Raster 3 × 2\nraster blatt.png 3 2\n');
  const raster = quelle.raster.get('blatt.png');
  assert.deepEqual(raster, { spalten: 3, zeilen: 2 });
  const z = findeZellen(freistellen(l), STANDARD, raster);
  assert.deepEqual(z.zellen.map((c) => [c.nr, c.zeile]), [[1, 1], [6, 2]]);
  assert.deepEqual(z.leer, [2, 3, 4, 5]);
  assert.equal(z.verworfen.length, 1);
});

test('Maßstab: Stand-Zelle genau auf Zielhöhe, Flächenmittel ohne Halbtransparenz', () => {
  const quelle = new Leinwand(60, 250);
  quelle.ellipse(30, 25, 24, 25, HAUT); // runder Kopf oben: die oberste Zeile ist nur teilweise gedeckt
  quelle.rechteck(10, 45, 40, 205, OLIV);
  const f = bestimmeFaktor(quelle, 71);
  const klein = verkleinere(quelle, f);
  assert.equal(klein.begrenzung()?.h, 71);
  assert.ok(Math.abs(f - 71 / 250) < (71 / 250) * (1.5 / 71) + 1e-12, `Faktor ${f} nahe am Rohfaktor`);
  assert.deepEqual([...deckkraftWerte(klein)].sort((a, b) => a - b), [0, 255]);
  // Flächenmittel: ein Pixel halb Haut, halb Oliv bekommt den Mittelwert
  const zwei = new Leinwand(2, 1);
  zwei.setze(0, 0, HAUT);
  zwei.setze(1, 0, OLIV);
  const eins = verkleinere(zwei, 1 / 2, { ...STANDARD, deckung: 1 / 2 });
  assert.equal(eins.breite, 1);
  assert.equal(eins.hole(0, 0), mischen(HAUT, OLIV, 0.5));
  // unter halber Deckung bleibt der Pixel durchsichtig
  const halb = new Leinwand(4, 4);
  halb.rechteck(0, 0, 1, 4, HAUT);
  assert.equal(verkleinere(halb, 1 / 4).hole(0, 0), 0);
});

test('Palette: nächste Stufe der Materialtreppen, Abstand je Farbe, höchstens 15 Farben', () => {
  const l = new Leinwand(16, 8);
  const fremd = STERNBEERE.treppe[TON_GRUND]; // Fremdfarbe ohne passendes Material
  const nah = mischen(HOSE_BRAUN.treppe[TON_GRUND], HAUT, 0.1); // fast Hosenbraun
  l.rechteck(0, 0, 8, 8, HAUT);
  l.rechteck(8, 0, 8, 4, nah);
  l.rechteck(8, 4, 4, 4, STAHL.treppe[4]);
  l.rechteck(12, 4, 4, 4, fremd);
  const stufen = stufenFuer(RAMMBOCK);
  // Töne 0 bis 3, bei glänzendem Stahl 0 bis 4, dazu KONTUR
  assert.equal(stufen.length, 4 + 4 + 4 + 5 + 4 + 1);
  const e = bildePalette([l], stufen);
  assert.equal(e.abbildungen.length, 4, 'je Quellfarbe ein Eintrag');
  for (const a of e.abbildungen) assert.equal(a.abstand, farbAbstand(a.quelle, a.stufe.farbe));
  const haut = e.abbildungen.find((a) => a.quelle === HAUT)!;
  assert.equal(stufenName(haut.stufe), 'HAUT_MITTEL:2');
  assert.equal(haut.abstand, 0);
  for (const a of e.abbildungen) {
    for (const st of stufen) assert.ok(a.abstand <= farbAbstand(a.quelle, st.farbe), 'nächste Stufe');
  }
  assert.ok(e.abbildungen.find((a) => a.quelle === nah)!.abstand < STANDARD.befundAbstand, 'fast passende Farbe ist kein Befund');
  const f = e.abbildungen.find((a) => a.quelle === fremd)!;
  assert.ok(f.abstand > STANDARD.befundAbstand, `Fremdfarbe ist ein Befund (${f.abstand})`);
  assert.equal(e.befundAnteil, 16 / 128);
  for (const p of e.bilder[0]!.daten) assert.ok(stufen.some((s) => s.farbe === p), 'nur Stufenfarben');
});

test('Palette: über dem Budget wird die am wenigsten belegte Stufe gestrichen', () => {
  // 7 Materialien × 4 bis 5 Töne, jeder Ton belegt, mit abnehmender Fläche
  const namen = ['HAUT_MITTEL', 'WESTE_OLIV', 'HOSE_BRAUN', 'STAHL', 'LEDER', 'JACKE_VELA', 'HAAR_VELA'];
  const stufen = stufenFuer(namen);
  const l = new Leinwand(stufen.length, 40);
  stufen.forEach((s, i) => l.rechteck(i, 0, 1, 40 - i, s.farbe));
  const e = bildePalette([l], stufen);
  const farben = new Set<Pixel>();
  for (const p of e.bilder[0]!.daten) if (p !== 0) farben.add(p);
  farben.add(KONTUR);
  assert.ok(farben.size <= 15, `${farben.size} Farben`);
  assert.equal(e.stufen.length, 15);
  assert.ok(e.gestrichen.length >= stufen.length - 15);
  assert.ok(e.stufen.some((s) => s.farbe === KONTUR), 'KONTUR bleibt');
  // gestrichen wird von hinten (kleinste Fläche zuerst)
  assert.equal(e.gestrichen[0], stufen[stufen.length - 2]);
});

test('Kontur: Außenkontur neu, Innenkontur im dunkelsten Materialton, keine Streupixel', () => {
  const stufen = stufenFuer(RAMMBOCK);
  const l = new Leinwand(12, 12);
  l.rechteck(1, 1, 10, 10, OLIV);
  l.rechteck(5, 2, 1, 8, KONTUR); // Innenlinie in KONTUR im Oliv
  l.setze(3, 3, LEDER.treppe[TON_SCHATTEN]); // Streupixel
  assert.equal(innenkonturen(l.klon(), stufen), 8);
  konturieren(l, stufen);
  assert.ok(konturGeschlossen(l, KONTUR));
  assert.equal(streupixel(l, glanzToene(stufen)).length, 0);
  assert.equal(l.hole(5, 5), WESTE_OLIV.treppe[TON_DUNKEL], 'Innenlinie im Ton 0 des Materials');
  assert.equal(l.hole(1, 5), KONTUR, 'Rand in KONTUR');
  assert.equal(l.hole(3, 3), OLIV, 'Streupixel nimmt die Mehrheitsfarbe');
  assert.equal(l.begrenzung()?.b, 10, 'die Figur wird nicht größer');
});

test('Anker: unterste Zeile, x Mitte der Füße; liegend Mitte der Figur', () => {
  const l = new Leinwand(40, 50);
  l.rechteck(10, 0, 20, 40, OLIV); // Rumpf
  l.rechteck(4, 40, 10, 8, LEDER.treppe[TON_GRUND]); // hinterer Fuß
  l.rechteck(22, 40, 14, 8, LEDER.treppe[TON_GRUND]); // vorderer Fuß
  const a = bestimmeAnker(l, false);
  assert.deepEqual(a, { x: (4 + 35) >> 1, y: 47 });
  const liegend = new Leinwand(60, 20);
  liegend.rechteck(3, 8, 50, 10, OLIV);
  assert.deepEqual(bestimmeAnker(liegend, true), { x: (3 + 52) >> 1, y: 17 });
});

test('Zuordnung: Animationen, Bilder, Kopien, Gehen und Parameter lesen; Fehler mit Zeilennummer', () => {
  const z = leseZuordnung(`# Test
figur test_fremd
typ Rammbock
zielhoehe 71   # 76 minus Schatten
materialien HAUT_MITTEL WESTE_OLIV
massstab a.png 1
animation stand schleife 0
animation schlag einmal 4 4 5 3 2 aktiv 2
bild a.png 1 stand 0
bild a.png 3 schlag 2 liegend
gleich schlag 0 stand 0
ersatz schlag 1 stand 0 spiegeln
gehen stand RAMMBOCK_GEHEN_X
parameter toleranzHintergrund 50
`);
  assert.equal(z.figur, 'test_fremd');
  assert.deepEqual(z.animationen[1], { name: 'schlag', schleife: false, dauern: [4, 4, 5, 3, 2], aktiv: [2] });
  assert.equal(z.bilder[1]!.liegend, true);
  assert.equal(z.kopien[0]!.nachbestellen, false);
  assert.equal(z.kopien[1]!.nachbestellen, true);
  assert.equal(z.kopien[1]!.spiegeln, true);
  assert.equal(z.gehen.get('stand'), 'RAMMBOCK_GEHEN_X');
  assert.equal(z.parameter.toleranzHintergrund, 50);
  assert.throws(() => leseZuordnung('figur x\nzielhoehe 71\nmaterialien A\nmassstab a.png 1\nanimation a einmal\n'), /Zeile 5/);
  assert.throws(() => leseZuordnung('figur x\nzielhoehe 71\nmaterialien A\nmassstab a.png 1\nbild a.png 1 fehlt 0\n'), /unbekannte Animation/);
});

test('Rammbock-Vorlage fremd/rammbock/zuordnung.txt: lesbar, Animationen nach Auftrag 4, 3, Angriffe nach werte.ts', () => {
  const z = leseZuordnung(readFileSync(new URL('../grafik/quelle/fremd/rammbock/zuordnung.txt', import.meta.url), 'utf8'));
  assert.equal(z.figur, 'rammbock_fremd');
  assert.equal(z.zielhoehe, UMRISS_GEGNER.Rammbock.hoehe - 5, '76 minus Schatten (Auftrag 4, 9.3)');
  assert.deepEqual(z.materialien, RAMMBOCK);
  const namen = z.animationen.map((a) => a.name);
  for (const n of ['stand', 'haltung', 'gehen', 'gehen_schnell', 'spott', 'wiegen', 'auftritt_hocke', 'aufstehen_hocke', 'auftritt_versteck',
    'hocke_ankuendigung', 'kampfhaltung', 'schlag_a', 'schlag_b', 'umwerfschlag', 'sprungtritt', 'getroffen', 'umgeworfen', 'liegen',
    'aufstehen', 'gehalten', 'geworfen', 'tot']) assert.ok(namen.includes(n), `Animation ${n}`);
  const anim = (n: string) => z.animationen.find((a) => a.name === n)!;
  assert.equal(anim('gehen').dauern.length, 8);
  assert.equal(anim('getroffen').dauern.reduce((s, d) => s + d, 0), 23, 'Trefferreaktion 23 Frames (E3)');
  for (const [name, code] of [['schlag_a', 'RA'], ['schlag_b', 'RB'], ['umwerfschlag', 'RU'], ['sprungtritt', 'RS']] as const) {
    const a = anim(name);
    const w = NAH_ANGRIFFE[code];
    const i = a.aktiv![0]!;
    assert.equal(a.dauern.slice(0, i).reduce((s, d) => s + d, 0), w.startup, `${name}: Ausholen = Startup`);
    assert.equal(a.dauern[i], w.aktiv_bis - w.aktiv_von + 1, `${name}: Trefferbild über die aktiven Frames`);
  }
  for (const [, wert] of z.gehen) assert.ok(gehgeschwindigkeit(wert) > 1, `${wert} aus werte.ts`);
});
