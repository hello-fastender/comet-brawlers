// Gesamtablauf des Umsetzers (Auftrag 4, 9.3; docs/grafik.md 5) an einem
// synthetischen Blatt, das der Test selbst erzeugt: 3 × 2 Zellen mit
// einfachen, absichtlich unsauberen Figuren in großem Maßstab (Stand 250 px
// statt 71): Kantenglättung am Rand, eine Außenlinie fast in
// Hintergrundfarbe, Fremdfarben, unsaubere Farbtöne, je Zelle eine kleine
// Nummer und ein Staubkorn, die verworfen werden müssen. Das Blatt geht als
// PNG durch Encoder und Decoder (png.ts). Farben nur aus palette.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blattBytes } from '../grafik/quelle/blatt.ts';
import { mischen } from '../grafik/quelle/farbe.ts';
import { konturAussen, konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { deckend, Leinwand } from '../grafik/quelle/leinwand.ts';
import {
  FARBBUDGET, farbenZaehlen, HAAR_DUNKEL, HAUT_HELL, HAUT_MITTEL, HOSE_BRAUN, KONTUR, LEDER, LEISTE_TEXT, NACHTHIMMEL, SIGNAL_ORANGE, STAHL,
  STAUB, STERNBEERE, TON_GLANZ, TON_GRUND, TON_LICHT, TON_SCHATTEN, WESTE_OLIV,
} from '../grafik/quelle/palette.ts';
import { md5, pngLesen, pngSchreiben } from '../grafik/quelle/png.ts';
import type { Ergebnis } from '../grafik/quelle/umsetzer.ts';
import { findeZellen, freistellen, glanzToene, leseQuelle, leseZuordnung, protokoll, setzeUm, STANDARD } from '../grafik/quelle/umsetzer.ts';

const GRUND = NACHTHIMMEL.treppe[TON_GRUND];
/** Zellen 280 × 300, Grundlinie 280 px unter der Oberkante der Zelle, Stand 250 px hoch. */
const ZB = 280;
const ZH = 300;
const FUSS = 280;
const STAND = 250;
const ZIEL = 71;

interface Pose {
  readonly vorne?: number;
  readonly hinten?: number;
  readonly schlag?: boolean;
  readonly neigung?: number;
  readonly hocke?: number;
}

/** Zeichnet eine einfache Figur (Fußzeile fuss − 1, Mitte cx) in Rammbockfarben, mit Fremd- und Mischfarben. */
function zeichneFigur(l: Leinwand, cx: number, fuss: number, pose: Pose): void {
  const n = pose.neigung ?? 0;
  const vorne = pose.vorne ?? 0;
  const hinten = pose.hinten ?? 0;
  const bein = 90 - (pose.hocke ?? 0);
  const huefte = fuss - 20 - bein;
  const oben = huefte - 90;
  const haut = HAUT_MITTEL.treppe[TON_GRUND];
  const oliv = WESTE_OLIV.treppe[TON_GRUND];
  // Arm hinten
  l.kapsel(cx - 44 + n, oben + 10, cx - 48 + n, oben + 80, 11, HAUT_MITTEL.treppe[TON_SCHATTEN]);
  // Stiefel und Beine
  for (const [dx, seite] of [[hinten, -1], [vorne, 1]] as const) {
    const x0 = seite < 0 ? cx - 36 + dx : cx + 2 + dx;
    l.rechteck(x0, fuss - 20, 34, 20, LEDER.treppe[TON_GRUND]);
    l.rechteck(x0, fuss - 20, 34, 3, LEDER.treppe[TON_LICHT]);
    const b0 = seite < 0 ? cx - 32 + dx : cx + 2 + dx;
    l.rechteck(b0, huefte, 30, bein, HOSE_BRAUN.treppe[TON_GRUND]);
    l.rechteck(b0 + 22, huefte, 8, bein, HOSE_BRAUN.treppe[TON_SCHATTEN]);
    l.ellipse(b0 + 15, huefte + bein / 2, 14, 12, STAHL.treppe[TON_GRUND]);
    l.rechteck(b0 + 8, huefte + bein / 2 - 7, 4, 3, STAHL.treppe[TON_GLANZ]);
  }
  // Rumpf: Weste mit Licht links, Schatten rechts, Gürtel, Fremdfarben
  l.rechteck(cx - 40 + n, oben, 80, 92, oliv);
  l.rechteck(cx + 26 + n, oben, 14, 92, WESTE_OLIV.treppe[TON_SCHATTEN]);
  l.rechteck(cx - 40 + n, oben, 8, 92, WESTE_OLIV.treppe[TON_LICHT]);
  l.rechteck(cx - 40 + n, huefte - 8, 80, 12, LEDER.treppe[TON_SCHATTEN]);
  l.rechteck(cx - 5 + n, huefte - 7, 10, 10, SIGNAL_ORANGE.treppe[TON_GRUND]);
  l.rechteck(cx - 16 + n, oben + 40, 12, 12, STERNBEERE.treppe[TON_GRUND]);
  for (let y = oben + 10; y < oben + 34; y++) {
    for (let x = cx - 30 + n; x < cx + 20 + n; x++) if ((x + y) % 5 === 0) l.setze(x, y, mischen(oliv, HAUT_HELL.treppe[TON_GRUND], 0.12));
  }
  // Kopf mit Bart und Auge
  l.ellipse(cx + n, oben - 25, 24, 25, haut);
  l.ellipse(cx + 8 + n, oben - 10, 14, 8, HAAR_DUNKEL.treppe[TON_GRUND]);
  l.rechteck(cx + 10 + n, oben - 36, 4, 4, KONTUR);
  // Arm vorn: hängend oder Schlag
  if (pose.schlag === true) l.kapsel(cx + 40 + n, oben + 14, cx + 120 + n, oben + 14, 11, haut);
  else l.kapsel(cx + 44 + n, oben + 10, cx + 48 + n, oben + 80, 11, haut);
}

/** Dreht ein Bild um 90° gegen den Uhrzeigersinn (Kopf nach links: liegende Pose). */
function gedreht(l: Leinwand): Leinwand {
  const neu = new Leinwand(l.hoehe, l.breite);
  for (let y = 0; y < l.hoehe; y++) for (let x = 0; x < l.breite; x++) neu.setze(y, l.breite - 1 - x, l.hole(x, y));
  return neu;
}

/** Setzt eine Figur mit Kantenglättung auf das Blatt: Kantennachbarn 1/2, Eckennachbarn 1/4 Figurfarbe. */
function setzeGeglaettet(blatt: Leinwand, fig: Leinwand, x0: number, y0: number): void {
  for (let y = -1; y <= fig.hoehe; y++) {
    for (let x = -1; x <= fig.breite; x++) {
      const p = fig.hole(x, y);
      if (deckend(p)) {
        blatt.setze(x0 + x, y0 + y, p);
        continue;
      }
      let kante: Pixel | undefined;
      let ecke: Pixel | undefined;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) if (kante === undefined && deckend(fig.hole(x + dx, y + dy))) kante = fig.hole(x + dx, y + dy);
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) if (ecke === undefined && deckend(fig.hole(x + dx, y + dy))) ecke = fig.hole(x + dx, y + dy);
      if (kante !== undefined) blatt.setze(x0 + x, y0 + y, mischen(GRUND, kante, 0.5));
      else if (ecke !== undefined) blatt.setze(x0 + x, y0 + y, mischen(GRUND, ecke, 0.25));
    }
  }
}

/** Posen der sechs Zellen (zeilenweise) und ob eine Außenlinie fast in Hintergrundfarbe gezogen wird. */
const POSEN: readonly { pose: Pose; linie: boolean; liegend?: boolean }[] = [
  { pose: {}, linie: true },
  { pose: { vorne: 16, hinten: -16 }, linie: false },
  { pose: { schlag: true }, linie: false },
  { pose: { neigung: -15 }, linie: false },
  { pose: {}, linie: true, liegend: true },
  { pose: { hocke: 70 }, linie: true },
];

/** Baut das synthetische Blatt 840 × 600 und gibt es als PNG-Bytes zurück. */
function synthetischesBlatt(): Uint8Array {
  const blatt = new Leinwand(3 * ZB, 2 * ZH);
  blatt.fuelle(GRUND);
  POSEN.forEach((eintrag, i) => {
    const zx = (i % 3) * ZB;
    const zy = Math.floor(i / 3) * ZH;
    let fig = new Leinwand(ZB, ZH);
    zeichneFigur(fig, ZB / 2, FUSS, eintrag.pose);
    if (eintrag.linie) {
      konturAussen(fig, KONTUR);
      konturAussen(fig, KONTUR);
    }
    if (eintrag.liegend === true) {
      const g = gedreht(fig);
      const b = g.begrenzung()!;
      fig = new Leinwand(ZB, ZH);
      fig.einsetzen(g.ausschnitt(b.x, b.y, b.b, b.h), (ZB - b.b) >> 1, FUSS - b.h);
    }
    setzeGeglaettet(blatt, fig, zx, zy);
    // Nummer (eine „1“ mit Fähnchen) oben links und ein Staubkorn: müssen verworfen werden
    blatt.rechteck(zx + 10, zy + 10, 4, 12, LEISTE_TEXT);
    blatt.rechteck(zx + 7, zy + 10, 3, 3, LEISTE_TEXT);
    blatt.rechteck(zx + 268, zy + 288, 2, 2, STAUB.treppe[TON_GRUND]);
  });
  return pngSchreiben(blatt);
}

const ZUORDNUNG = `# synthetischer Test (Auftrag 4, 9.3)
figur test_fremd
typ Rammbock
zielhoehe ${ZIEL}
materialien HAUT_MITTEL WESTE_OLIV HOSE_BRAUN STAHL LEDER
massstab blatt_a.png 1
gehen gehen RAMMBOCK_GEHEN_X
animation stand schleife 0
animation gehen schleife 4 4 4 4
animation schlag einmal 4 4 5 3 2 aktiv 2
animation getroffen einmal 9 12 2
animation liegen schleife 0
animation hocke einmal 69
bild blatt_a.png 1 stand 0
bild blatt_a.png 2 gehen 0
bild blatt_a.png 1 gehen 1
gleich gehen 2 gehen 0
ersatz gehen 3 gehen 1 spiegeln
bild blatt_a.png 3 schlag 2
bild blatt_a.png 4 getroffen 0
bild blatt_a.png 5 liegen 0 liegend
bild blatt_a.png 6 hocke 0
`;

const PNG = synthetischesBlatt();

function umsetzen(quelle: string = ''): Ergebnis {
  return setzeUm({
    blaetter: new Map([['blatt_a.png', pngLesen(PNG)]]),
    zuordnung: leseZuordnung(ZUORDNUNG),
    quelle: leseQuelle(quelle),
  });
}

const ERGEBNIS = umsetzen();

test('Blatt: Zellenerkennung findet sechs Figuren zeilenweise und verwirft Nummern und Staub', () => {
  const fs = freistellen(pngLesen(PNG));
  const z = findeZellen(fs);
  assert.equal(z.zellen.length, 6);
  z.zellen.forEach((c, i) => {
    assert.equal(c.nr, i + 1);
    assert.equal(c.zeile, Math.floor(i / 3) + 1);
    const zx = (i % 3) * ZB;
    const zy = Math.floor(i / 3) * ZH;
    // Zelle liegt in ihrem Feld, die Füße auf der Grundlinie (± 2 px Kantenglättung)
    assert.ok(c.links >= zx && c.links + c.breite <= zx + ZB, `Zelle ${c.nr} waagrecht im Feld`);
    assert.ok(Math.abs(c.oben + c.hoehe - (zy + FUSS)) <= 2, `Zelle ${c.nr} steht auf der Grundlinie (${c.oben + c.hoehe})`);
  });
  // Stand: 250 px ohne die Außenlinie, die als Hintergrund gilt
  assert.equal(z.zellen[0]!.hoehe, STAND);
  assert.equal(z.verworfen.length, 12, 'sechs Nummern, sechs Staubkörner');
  const grenze = fs.breite * fs.hoehe * STANDARD.mindestAnteil;
  for (const v of z.verworfen) assert.ok(v.breite * v.hoehe < grenze);
  assert.equal(ERGEBNIS.blaetter[0]!.grundlinie.length, 0, 'Grundlinie je Zeile gleich');
});

test('Blatt: festes Raster aus quelle.txt ergibt dieselben Zellen', () => {
  const e = umsetzen('Datum 2026-10-03\nWerkzeug: synthetisch\nraster blatt_a.png 3 2\n');
  const b = e.blaetter[0]!;
  assert.deepEqual(b.raster, { spalten: 3, zeilen: 2 });
  assert.deepEqual(b.zellen.map((c) => c.nr), [1, 2, 3, 4, 5, 6]);
  assert.equal(b.verworfen.length, 12);
  assert.deepEqual(blattBytes(e.blatt).png, blattBytes(ERGEBNIS.blatt).png);
});

test('Blatt: freigestellt ohne Halbtransparenz, Stand genau auf Zielhöhe, ein Faktor für alle', () => {
  const e = ERGEBNIS;
  for (const a of e.animationen) {
    for (const b of a.bilder) for (const p of b.leinwand.daten) assert.ok((p & 0xff) === 0 || (p & 0xff) === 255);
  }
  const hoehe = (name: string): number => e.animationen.find((a) => a.name === name)!.bilder[0]!.leinwand.begrenzung()!.h;
  assert.equal(hoehe('stand'), ZIEL);
  assert.ok(Math.abs(e.faktor - ZIEL / STAND) <= (ZIEL / STAND) * (1.5 / ZIEL));
  // Gehen ist so hoch wie der Stand, die Hocke (180 px in der Quelle) im selben Maßstab
  assert.ok(Math.abs(hoehe('gehen') - ZIEL) <= 1);
  assert.ok(Math.abs(hoehe('hocke') - Math.round((STAND - 70) * e.faktor)) <= 1, `Hocke ${hoehe('hocke')}`);
  // Umriss des Rammbocks (60 × 76) im Stand eingehalten
  const stand = e.animationen.find((a) => a.name === 'stand')!.bilder[0]!.leinwand.begrenzung()!;
  assert.ok(stand.b <= 60, `Stand ${stand.b} px breit`);
});

test('Blatt: Palette mit höchstens 15 Farben, Abstand je Quellfarbe protokolliert, Fremdfarben als Befund', () => {
  const e = ERGEBNIS;
  const alle = e.animationen.flatMap((a) => a.bilder.map((b) => b.leinwand));
  assert.ok(farbenZaehlen(alle) <= FARBBUDGET.figur, `${farbenZaehlen(alle)} Farben einschließlich durchsichtig`);
  const erlaubt = new Set(e.palette.stufen.map((s) => s.farbe));
  assert.ok(e.palette.stufen.length <= 15);
  for (const l of alle) for (const p of l.daten) if (p !== 0) assert.ok(erlaubt.has(p), 'nur Stufen der Palette');
  assert.ok(e.palette.abbildungen.length > 20, 'Flächenmittel erzeugt viele Quellfarben, jede protokolliert');
  for (const a of e.palette.abbildungen) assert.ok(Number.isFinite(a.abstand) && a.pixel > 0);
  assert.ok(e.palette.befundAnteil > 0, 'Fremdfarben (Magenta, Orange) liegen weit von jeder Stufe');
  assert.ok(e.befunde.some((b) => !b.hart && b.text.includes('der Pixel weiter als')));
  const text = protokoll(e);
  assert.match(text, /\| HAUT_MITTEL:2 \| #C98E68 \|/);
  assert.match(text, /Quellfarbe \| Stufe \| Abstand \| Pixel/);
});

test('Blatt: Kontur geschlossen, keine Streupixel, keine harten Befunde; Fußkontakt als Befund (figurPruefen)', () => {
  const e = ERGEBNIS;
  // Die Testfigur schreitet nicht: der Fußkontakt (bauen.ts) meldet das als weichen Befund
  assert.ok(e.befunde.some((b) => !b.hart && b.text.startsWith('gehen Bild') && b.text.includes('Fußkontakt')));
  const glanz = glanzToene(e.palette.stufen);
  for (const a of e.animationen) {
    for (const b of a.bilder) {
      assert.ok(konturGeschlossen(b.leinwand, KONTUR), `${a.name}: Kontur geschlossen`);
      assert.equal(streupixel(b.leinwand, glanz).length, 0, `${a.name}: keine Streupixel`);
    }
  }
  assert.deepEqual(e.befunde.filter((b) => b.hart), []);
});

test('Blatt: Anker am Fußpunkt (Mitte der Füße), liegend in der Mitte; Atlas mit unterster Zeile', () => {
  const e = ERGEBNIS;
  const stand = e.animationen.find((a) => a.name === 'stand')!.bilder[0]!;
  const g = stand.leinwand.begrenzung()!;
  assert.equal(stand.ankerY, g.y + g.h - 1, 'unterste Zeile');
  // Stiefel von cx − 36 bis cx + 35 in der Quelle, Zelle beginnt beim hinteren Arm (cx − 59)
  const erwartet = g.x + ((-36 + 59 + (35 + 59)) / 2) * e.faktor;
  assert.ok(Math.abs(stand.ankerX - erwartet) <= 1.5, `Anker x ${stand.ankerX}, erwartet etwa ${erwartet.toFixed(1)}`);
  const liegen = e.animationen.find((a) => a.name === 'liegen')!.bilder[0]!;
  const gl = liegen.leinwand.begrenzung()!;
  assert.equal(liegen.ankerX, (2 * gl.x + gl.b - 1) >> 1);
  assert.equal(liegen.ankerY, gl.y + gl.h - 1);
  const atlas = e.blatt.atlas.animationen;
  for (const name of ['stand', 'gehen', 'schlag', 'getroffen', 'hocke']) {
    for (const b of atlas[name]!.bilder) assert.equal(b.ankerY, b.h - 1, `${name}: Anker auf der untersten Zeile`);
  }
  assert.deepEqual(atlas['schlag']!.aktiv, [2]);
  assert.equal(atlas['gehen']!.bilder.length, 4);
  assert.equal(e.blatt.atlas.blatt, 'test_fremd.png');
});

test('Blatt: Lücken durch Wiederholung oder Spiegelung ersetzt und als Nachbestellung gemeldet', () => {
  const e = ERGEBNIS;
  assert.deepEqual(e.nachbestellungen.map((n) => `${n.animation} ${n.index} ← ${n.ersatz}`), [
    'gehen 3 ← gehen 1 gespiegelt',
    'schlag 0 ← schlag 2',
    'schlag 1 ← schlag 2',
    'schlag 3 ← schlag 2',
    'schlag 4 ← schlag 2',
    'getroffen 1 ← getroffen 0',
    'getroffen 2 ← getroffen 0',
  ]);
  const gehen = e.animationen.find((a) => a.name === 'gehen')!.bilder;
  assert.equal(gehen[2]!.leinwand, gehen[0]!.leinwand, 'gleich: gewollte Wiederholung');
  assert.ok(gehen[3]!.leinwand.gleich(gehen[1]!.leinwand.gespiegelt()), 'ersatz gespiegelt');
  assert.equal(gehen[3]!.ankerX, gehen[1]!.leinwand.breite - 1 - gehen[1]!.ankerX);
});

test('Blatt: deterministisch, zwei Läufe ergeben gleiche Bytes', () => {
  const a = blattBytes(ERGEBNIS.blatt);
  const b = blattBytes(umsetzen().blatt);
  assert.equal(md5(a.png), md5(b.png));
  assert.deepEqual(a.png, b.png);
  assert.equal(a.json, b.json);
  assert.equal(protokoll(ERGEBNIS), protokoll(umsetzen()));
});

test('Blatt: Kopie einer Lücke löst die Quelle auf, Kopien im Kreis sind ein Fehler', () => {
  const zusatz = `${ZUORDNUNG}animation fremd_kopie einmal 3\ngleich fremd_kopie 0 getroffen 2\n`;
  const e = setzeUm({ blaetter: new Map([['blatt_a.png', pngLesen(PNG)]]), zuordnung: leseZuordnung(zusatz), quelle: leseQuelle('') });
  const kopie = e.animationen.find((a) => a.name === 'fremd_kopie')!.bilder[0]!;
  const getroffen = e.animationen.find((a) => a.name === 'getroffen')!.bilder;
  assert.equal(kopie.leinwand, getroffen[0]!.leinwand, 'getroffen 2 fehlt und wiederholt getroffen 0');
  assert.equal(e.nachbestellungen.filter((n) => n.animation === 'getroffen' && n.index === 2).length, 1);
  assert.equal(e.nachbestellungen.filter((n) => n.animation === 'fremd_kopie').length, 0, 'gewollte Kopie ist keine Nachbestellung');
  const kreis = `${ZUORDNUNG}animation k1 einmal 1\nanimation k2 einmal 1\ngleich k1 0 k2 0\ngleich k2 0 k1 0\n`;
  assert.throws(
    () => setzeUm({ blaetter: new Map([['blatt_a.png', pngLesen(PNG)]]), zuordnung: leseZuordnung(kreis), quelle: leseQuelle('') }),
    /im Kreis/,
  );
});
