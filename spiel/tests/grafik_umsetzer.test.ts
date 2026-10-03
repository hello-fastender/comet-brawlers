// Einzeltests des Umsetzers für Bildblätter (Auftrag 4, 9.3; docs/grafik.md 5;
// angepasst an die Fassung v2, Auftrag 5, Phase 1, docs/grafik.md 5.8) an
// kleinen, im Test gebauten Bildern. Farben nur aus palette.ts (und daraus
// gemischt). Der Gesamtablauf am synthetischen Blatt steht in
// grafik_umsetzer_blatt.test.ts, die neuen Regeln von v2 in
// grafik_umsetzer_v2.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NAH_ANGRIFFE } from '../src/kern/werte.ts';
import { farbAbstand, mischen } from '../grafik/quelle/farbe.ts';
import { Leinwand } from '../grafik/quelle/leinwand.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { helligkeit } from '../grafik/quelle/medianschnitt.ts';
import {
  HAUT_MITTEL, HOSE_BRAUN, KONTUR, LEDER, LEISTE_TEXT, NACHTHIMMEL, STAHL, STERNBEERE, TON_DUNKEL, TON_GRUND, TON_SCHATTEN, WESTE_OLIV,
} from '../grafik/quelle/palette.ts';
import {
  bestimmeAnker, bestimmeFaktor, bildePalette, dunkelPruefer, findeZellen, fertigMachen, freistellen, gehgeschwindigkeit, hoeheMitKontur,
  konturLueckenDunkel, konturNachsetzen, leseQuelle, leseZuordnung, pruefeGrundlinie, schliesse, schneideAus, STANDARD, streupixelAehnlich,
  verkleinere, verkleinertBereinigt, zielhoeheFuer,
} from '../grafik/quelle/umsetzer.ts';

const GRUND = NACHTHIMMEL.treppe[TON_GRUND];
const HAUT = HAUT_MITTEL.treppe[TON_GRUND];
const OLIV = WESTE_OLIV.treppe[TON_GRUND];

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

test('Maßstab: Stand-Zelle samt nachgesetzter Kontur genau auf Zielhöhe, Flächenmittel ohne Halbtransparenz', () => {
  const quelle = new Leinwand(60, 250);
  quelle.ellipse(30, 25, 24, 25, HAUT); // runder Kopf oben: die oberste Zeile ist nur teilweise gedeckt
  quelle.rechteck(10, 45, 40, 205, OLIV);
  const f = bestimmeFaktor(quelle, 71);
  const klein = verkleinere(quelle, f);
  // v2: Haut und Oliv sind hell, die Kontur kommt oben und unten dazu (Auftrag 5, 1)
  assert.equal(hoeheMitKontur(verkleinertBereinigt(quelle, f)), 71);
  assert.equal(klein.begrenzung()?.h, 69);
  assert.ok(Math.abs(f - 71 / 250) < (71 / 250) * (3 / 71) + 1e-12, `Faktor ${f} nahe am Rohfaktor`);
  assert.deepEqual([...deckkraftWerte(klein)].sort((a, b) => a - b), [0, 255]);
  // Ohne Kontur (Messung wie v1) trifft die Suche die Zielhöhe mit dem verkleinerten Bild selbst
  const f1 = bestimmeFaktor(quelle, 71, STANDARD, (v) => v.begrenzung()?.h ?? 0);
  assert.equal(verkleinere(quelle, f1).begrenzung()?.h, 71);
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

test('Palette: Medianschnitt aus den Farben des Bildes, keine Abbildung auf palette.ts, Helligkeit erhalten', () => {
  const l = new Leinwand(16, 8);
  const fremd = STERNBEERE.treppe[TON_GRUND]; // Farbe ohne Material der Figur: bleibt erhalten (keine Palettenabbildung)
  const nah = mischen(HOSE_BRAUN.treppe[TON_GRUND], HAUT, 0.1);
  l.rechteck(0, 0, 8, 8, HAUT);
  l.rechteck(8, 0, 8, 4, nah);
  l.rechteck(8, 4, 4, 4, STAHL.treppe[4]);
  l.rechteck(12, 4, 4, 4, fremd);
  const e = bildePalette([l]);
  // Vier Farben, höchstens 63: jede Farbe ist ihre eigene Kiste, also unverändert
  assert.equal(e.quellfarben, 4);
  assert.deepEqual([...e.palette].sort((a, b) => a - b), [HAUT, nah, STAHL.treppe[4], fremd].sort((a, b) => a - b));
  assert.equal(e.mittlererAbstand, 0);
  assert.ok(e.bilder[0]!.gleich(l), 'Bild unverändert');
  // Nach Helligkeit geordnet, der dunkelste Ton vorn
  for (let i = 1; i < e.palette.length; i++) assert.ok(helligkeit(e.palette[i - 1]!) <= helligkeit(e.palette[i]!));
  assert.equal(e.dunkelster, e.palette[0]);
  assert.equal(e.pixel.reduce((s, n) => s + n, 0), 128);
});

test('Palette: über der Höchstzahl teilt der Medianschnitt, jede Farbe geht auf die nächste Palettenfarbe, Mittel bleibt', () => {
  // 5 Materialien × 5 Töne, jeder Ton belegt, mit abnehmender Fläche, dazu Mischfarben
  const farben: Pixel[] = [];
  for (const m of [HAUT_MITTEL, WESTE_OLIV, HOSE_BRAUN, STAHL, LEDER]) for (const t of m.treppe) farben.push(t);
  const l = new Leinwand(farben.length, 40);
  farben.forEach((f, i) => l.rechteck(i, 0, 1, 40 - i, f));
  for (let i = 1; i < farben.length; i++) l.setze(i, 39 - i, mischen(farben[i - 1]!, farben[i]!, 0.5));
  const e = bildePalette([l], { ...STANDARD, hoechstFarben: 8 });
  const benutzt = new Set<Pixel>();
  for (const p of e.bilder[0]!.daten) if (p !== 0) benutzt.add(p);
  assert.ok(e.palette.length <= 8, `${e.palette.length} Farben`);
  assert.ok(benutzt.size <= 8);
  for (const p of benutzt) assert.ok(e.palette.includes(p), 'nur Palettenfarben');
  // nächste Palettenfarbe je Quellfarbe
  for (let j = 0; j < l.daten.length; j++) {
    const q = l.daten[j]!;
    if (q === 0) continue;
    const z = e.bilder[0]!.daten[j]!;
    for (const p of e.palette) assert.ok(farbAbstand(q, z) <= farbAbstand(q, p) + 1e-9);
  }
  // Helligkeit im Mittel erhalten (keine Abdunklung)
  const mittel = (b: Leinwand): number => {
    let s = 0;
    let n = 0;
    for (const p of b.daten) {
      if (p === 0) continue;
      s += helligkeit(p);
      n++;
    }
    return s / n;
  };
  assert.ok(Math.abs(mittel(e.bilder[0]!) - mittel(l)) < 3, `Mittel ${mittel(e.bilder[0]!).toFixed(1)} statt ${mittel(l).toFixed(1)}`);
  assert.ok(Number.isFinite(e.mittlererAbstand) && e.groessterAbstand > 0);
});

test('Kontur: dunkle Außenkante bleibt, sonst 1 Bildpixel im dunkelsten Ton nachgesetzt; Innenlinie aufgehellt, keine Streupixel', () => {
  const l = new Leinwand(12, 12);
  l.rechteck(1, 1, 10, 10, OLIV);
  l.rechteck(1, 1, 10, 1, LEDER.treppe[TON_DUNKEL]); // dunkle Oberkante: Kontur des Bildes
  l.rechteck(5, 3, 1, 6, KONTUR); // Innenlinie in KONTUR, dunkler als der Bodenton
  l.setze(3, 6, LEDER.treppe[TON_SCHATTEN]); // Streupixel
  const dunkel = dunkelPruefer();
  assert.ok(dunkel(LEDER.treppe[TON_DUNKEL]) && dunkel(KONTUR) && !dunkel(OLIV));
  const k = konturNachsetzen(l.klon(), dunkel, KONTUR);
  assert.equal(k.bild.breite, 14, '1 Bildpixel Rand');
  assert.equal(k.bild.hole(1, 5), KONTUR, 'links nachgesetzt');
  assert.equal(k.bild.hole(1, 2), 0, 'neben der dunklen Ecke nichts nachgesetzt');
  assert.equal(k.bild.hole(5, 1), 0, 'über der dunklen Oberkante nichts nachgesetzt');
  assert.equal(k.bild.hole(5, 2), LEDER.treppe[TON_DUNKEL], 'dunkle Oberkante bleibt');
  assert.equal(konturLueckenDunkel(k.bild, dunkel).length, 0);
  assert.equal(k.gesetzt, 9 + 9 + 10, 'links und rechts ohne die dunkle Oberkante, unten ganz');
  const pal = bildePalette([l]);
  const boden = helligkeit(KONTUR) + 1;
  const fertig = fertigMachen(pal.bilder[0]!, pal, boden, new Set(), STANDARD);
  assert.equal(konturLueckenDunkel(fertig, dunkel).length, 0, 'Kontur geschlossen aus dunklem Ton');
  assert.equal(streupixelAehnlich(fertig, STANDARD.streuAbstand).length, 0, 'keine Streupixel');
  assert.ok(helligkeit(fertig.hole(6, 6)) >= boden, 'Innenlinie um eine Stufe aufgehellt');
  assert.equal(fertig.hole(4, 7), OLIV, 'Streupixel nimmt die Mehrheitsfarbe');
  assert.equal(fertig.begrenzung()?.b, 12, 'die Figur wächst um je 1 Bildpixel');
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
figur test_grok
datum 2026-10-03
typ Rammbock
zielhoehe 142   # 2 × (76 minus Schatten)
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
  assert.equal(z.figur, 'test_grok');
  assert.equal(z.datum, '2026-10-03');
  assert.equal(z.zielhoehe, 142);
  assert.deepEqual(z.animationen[1], { name: 'schlag', schleife: false, dauern: [4, 4, 5, 3, 2], aktiv: [2] });
  assert.equal(z.bilder[1]!.liegend, true);
  assert.equal(z.kopien[0]!.nachbestellen, false);
  assert.equal(z.kopien[1]!.nachbestellen, true);
  assert.equal(z.kopien[1]!.spiegeln, true);
  assert.equal(z.gehen.get('stand'), 'RAMMBOCK_GEHEN_X');
  assert.equal(z.parameter.toleranzHintergrund, 50);
  assert.throws(() => leseZuordnung('figur x\nzielhoehe 142\nmassstab a.png 1\n\nanimation a einmal\n'), /Zeile 5/);
  assert.throws(() => leseZuordnung('figur x\nzielhoehe 142\nmassstab a.png 1\nbild a.png 1 fehlt 0\n'), /unbekannte Animation/);
  // v2: keine Materialien mehr (keine Abbildung auf palette.ts, Auftrag 5, 1)
  assert.throws(() => leseZuordnung('figur x\nzielhoehe 142\nmaterialien HAUT_MITTEL\nmassstab a.png 1\n'), /Zeile 3: unbekanntes Wort 'materialien'/);
  assert.throws(() => leseZuordnung('figur x\ndatum 3.10.2026\nzielhoehe 142\nmassstab a.png 1\n'), /Zeile 2: datum/);
});

test('Rammbock-Vorlage fremd/rammbock/zuordnung.txt: lesbar, Animationen wie das Blatt der Gliederpuppe, Angriffe nach werte.ts', () => {
  const z = leseZuordnung(readFileSync(new URL('../grafik/quelle/fremd/rammbock/zuordnung.txt', import.meta.url), 'utf8'));
  assert.equal(z.figur, 'rammbock_grok');
  assert.equal(z.zielhoehe, zielhoeheFuer('Rammbock'), '2 × (76 minus Schatten) Bildpixel (Auftrag 5, 1)');
  assert.equal(z.zielhoehe, 142);
  // Namen, Schleife, Dauern und aktive Bilder wie rammbock.json (die Darstellung erwartet sie so)
  const puppe = JSON.parse(readFileSync(new URL('../grafik/ausgabe/rammbock.json', import.meta.url), 'utf8')) as {
    animationen: Record<string, { schleife: boolean; bilder: { dauer: number }[]; aktiv?: number[] }>;
  };
  assert.deepEqual(z.animationen.map((a) => a.name), Object.keys(puppe.animationen));
  for (const a of z.animationen) {
    const q = puppe.animationen[a.name]!;
    assert.equal(a.schleife, q.schleife, `${a.name}: Schleife`);
    assert.deepEqual(a.dauern, q.bilder.map((b) => b.dauer), `${a.name}: Dauern`);
    assert.deepEqual(a.aktiv, q.aktiv, `${a.name}: aktive Bilder`);
  }
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

test('Schließen (G0b-10): Innenlinie in Hintergrundfarbe verbindet, breite Lücke bleibt offen', () => {
  const l = new Leinwand(80, 60);
  l.fuelle(GRUND);
  l.rechteck(10, 5, 20, 20, OLIV); // Hose
  l.rechteck(10, 31, 20, 10, LEDER.treppe[TON_GRUND]); // Stiefel, 6 px Linie in Grundfarbe dazwischen
  l.rechteck(50, 5, 20, 20, OLIV); // zweite Figur, 20 px entfernt
  const fs = freistellen(l);
  assert.equal(fs.maske[28 * 80 + 20], 1, 'Linie zwischen Hose und Stiefel wird Figur');
  assert.equal(fs.maske[15 * 80 + 40], 0, 'breite Lücke bleibt Hintergrund');
  assert.ok(fs.geschlossen >= 6 * 20);
  assert.equal(findeZellen(fs).zellen.length, 2);
  const offen = freistellen(l, { ...STANDARD, schliessen: 0 });
  assert.equal(offen.geschlossen, 0);
  assert.equal(findeZellen(offen, { ...STANDARD, schliessen: 0 }).verworfen.length + findeZellen(offen).zellen.length, 3, 'ohne Schließen zerfällt die erste Figur');
  // Schließen ändert nur Hintergrund zu Figur, nie umgekehrt
  const zeile = [1, 0, 0, 1, 0, 0, 0, 0, 1];
  const m = new Uint8Array(9 * 5);
  for (let y = 1; y <= 3; y++) zeile.forEach((v, x) => (m[y * 9 + x] = v));
  const g = schliesse(m, 9, 5, 1);
  assert.deepEqual([...g.subarray(2 * 9, 3 * 9)], [1, 1, 1, 1, 0, 0, 0, 0, 1], 'Lücke 2 px gefüllt, Lücke 4 px offen');
  for (let j = 0; j < m.length; j++) assert.ok((g[j] as number) >= (m[j] as number));
});

test('Zuordnung: Maßstab je Blatt über eine Bezugszelle (G0b-11)', () => {
  const kopf = 'figur x\nzielhoehe 142\n';
  const z = leseZuordnung(`${kopf}massstab a.png 1\nmassstab b.png 3 wie a.png 2\n`);
  assert.deepEqual(z.massstab, { blatt: 'a.png', zelle: 1 });
  assert.deepEqual(z.massstaebe, [{ blatt: 'b.png', zelle: 3, wie: { blatt: 'a.png', zelle: 2 } }]);
  assert.throws(() => leseZuordnung(`${kopf}massstab a.png 1\nmassstab b.png 3 wie c.png 2\n`), /Bezugsblatt ohne Maßstab/);
  assert.throws(() => leseZuordnung(`${kopf}massstab a.png 1\nmassstab a.png 3 wie a.png 2\n`), /zwei Maßstäbe/);
});
