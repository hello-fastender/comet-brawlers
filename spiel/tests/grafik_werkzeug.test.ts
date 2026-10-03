// Tests des Werkzeugkastens der Grafik (Auftrag 4, Phase 1, G0): PNG
// schreiben und lesen, Treppe nach der Stilprobe, Konturen und Streupixel,
// Farbzählung, Blatt und Atlas, Kontaktbogen, Gliederpuppe.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import { atlasText, blattPacken, zugeschnitten } from '../grafik/quelle/blatt.ts';
import type { Animation } from '../grafik/quelle/blatt.ts';
import { hexZuPixel, hintergrundTreppe, pixelZuRgb, rgbZuHsl, treppe } from '../grafik/quelle/farbe.ts';
import { kontaktBogen, textBreite } from '../grafik/quelle/kontakt.ts';
import { konturAussen, konturGeschlossen, konturLuecken, randFaerben, streupixel, streupixelEntfernen } from '../grafik/quelle/kontur.ts';
import { DURCHSICHTIG, Leinwand, kanaele, rgba } from '../grafik/quelle/leinwand.ts';
import { FARBBUDGET, JACKE_VELA, KONTUR, MATERIALIEN, farbenZaehlen, naechsteFarbe } from '../grafik/quelle/palette.ts';
import { crc32, pngAusRohdaten, pngLesen, pngSchreiben } from '../grafik/quelle/png.ts';
import type { Filtertyp } from '../grafik/quelle/png.ts';
import { Puppe } from '../grafik/quelle/puppe.ts';

/** Testbild mit Farben, Durchsichtigkeit und halber Deckkraft (deterministisches Muster). */
function muster(b: number, h: number): Leinwand {
  const l = new Leinwand(b, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const v = (x * 37 + y * 91 + x * y * 13) & 0xff;
      l.setze(x, y, (x + y) % 7 === 0 ? DURCHSICHTIG : rgba(v, (v * 3) & 0xff, (255 - v) & 0xff, (x + 2 * y) % 5 === 0 ? 128 : 255));
    }
  }
  return l;
}

test('PNG: Rundlauf schreiben und lesen ist bitgleich, für jeden Filtertyp', () => {
  const bild = muster(23, 17);
  for (const filter of [0, 1, 2, 3, 4] as Filtertyp[]) {
    const zurueck = pngLesen(pngSchreiben(bild, { filter }));
    assert.equal(zurueck.breite, 23);
    assert.equal(zurueck.hoehe, 17);
    assert.ok(zurueck.gleich(bild), `Filter ${filter}`);
  }
  // gleiche Pixel, gleiche Bytes
  assert.deepEqual(pngSchreiben(bild), pngSchreiben(bild.klon()));
});

test('PNG: CRC32 mit bekannten Prüfwerten', () => {
  const ascii = (t: string): Uint8Array => Uint8Array.from([...t].map((c) => c.charCodeAt(0)));
  assert.equal(crc32(ascii('123456789')), 0xcbf43926);
  assert.equal(crc32(ascii('IEND')), 0xae426082);
});

/** Paeth-Vorhersage, hier unabhängig von png.ts nachgebaut (PNG 9.4). */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Filtert Zeilen von Hand (je Zeile eigener Filtertyp), unabhängig vom Encoder. */
function vonHandGefiltert(zeilen: number[][], filter: number[], bpp: number): Uint8Array {
  const aus: number[] = [];
  zeilen.forEach((roh, y) => {
    const vorher = y > 0 ? (zeilen[y - 1] as number[]) : roh.map(() => 0);
    const f = filter[y] as number;
    aus.push(f);
    roh.forEach((x, i) => {
      const a = i >= bpp ? (roh[i - bpp] as number) : 0;
      const b = vorher[i] as number;
      const c = i >= bpp ? (vorher[i - bpp] as number) : 0;
      const vorhersage = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][f] as number;
      aus.push((x - vorhersage + 256) & 0xff);
    });
  });
  return Uint8Array.from(aus);
}

test('PNG: Lesen eines von Hand gebauten Bildes mit den Filtertypen 1 bis 4 (RGB und RGBA)', () => {
  // RGB (Farbtyp 2), 4 × 5, Zeilen mit Filter 0, 1, 2, 3, 4
  const rgb: number[][] = [];
  for (let y = 0; y < 5; y++) {
    const z: number[] = [];
    for (let x = 0; x < 4; x++) z.push((x * 60 + y * 7) & 0xff, (200 - x * 30 + y * 11) & 0xff, (x * y * 29 + 5) & 0xff);
    rgb.push(z);
  }
  const datei = pngAusRohdaten(4, 5, 2, vonHandGefiltert(rgb, [0, 1, 2, 3, 4], 3));
  const bild = pngLesen(datei);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 4; x++) {
      const z = rgb[y] as number[];
      assert.deepEqual(kanaele(bild.hole(x, y)), [z[x * 3], z[x * 3 + 1], z[x * 3 + 2], 255], `RGB (${x}, ${y})`);
    }
  }
  // RGBA (Farbtyp 6), 3 × 4, Filter 4, 3, 2, 1
  const rgbaZeilen: number[][] = [];
  for (let y = 0; y < 4; y++) {
    const z: number[] = [];
    for (let x = 0; x < 3; x++) z.push((x * 90 + y) & 0xff, (y * 70) & 0xff, (255 - x * 40) & 0xff, x === 1 && y === 2 ? 0 : 255);
    rgbaZeilen.push(z);
  }
  const bild2 = pngLesen(pngAusRohdaten(3, 4, 6, vonHandGefiltert(rgbaZeilen, [4, 3, 2, 1], 4)));
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 3; x++) {
      const z = rgbaZeilen[y] as number[];
      assert.deepEqual(kanaele(bild2.hole(x, y)), [z[x * 4], z[x * 4 + 1], z[x * 4 + 2], z[x * 4 + 3]], `RGBA (${x}, ${y})`);
    }
  }
});

test('PNG: Lesen von Palette mit tRNS und Graustufen', () => {
  // Palettenbild 2 × 1: Index 0 rot (durchsichtig über tRNS), Index 1 grün
  const zeilen = Uint8Array.from([0, 0, 1]);
  const palette = Uint8Array.from([255, 0, 0, 0, 255, 0]);
  const basis = pngAusRohdaten(2, 1, 3, zeilen, palette);
  // tRNS-Chunk vor IDAT einfügen: Länge 1, Typ, Daten 0, CRC
  const typ = Uint8Array.from([0x74, 0x52, 0x4e, 0x53, 0]);
  const crc = crc32(typ);
  const trns = Uint8Array.from([0, 0, 0, 1, ...typ, (crc >>> 24) & 0xff, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff]);
  // Signatur 8 + IHDR 25 + PLTE (12 + 6) = 51: danach einfügen
  const datei = new Uint8Array(basis.length + trns.length);
  datei.set(basis.subarray(0, 51), 0);
  datei.set(trns, 51);
  datei.set(basis.subarray(51), 51 + trns.length);
  const bild = pngLesen(datei);
  assert.deepEqual(kanaele(bild.hole(0, 0)), [255, 0, 0, 0]);
  assert.deepEqual(kanaele(bild.hole(1, 0)), [0, 255, 0, 255]);
  // Grau (Farbtyp 0), 2 × 1
  const grau = pngLesen(pngAusRohdaten(2, 1, 0, Uint8Array.from([0, 10, 200])));
  assert.deepEqual(kanaele(grau.hole(1, 0)), [200, 200, 200, 255]);
  // Fehler: falsche Signatur, unbekannter Filter
  assert.throws(() => pngLesen(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9])), /Signatur/);
  assert.throws(() => pngLesen(pngAusRohdaten(1, 1, 2, Uint8Array.from([7, 1, 2, 3]))), /Filtertyp 7/);
});

/** treppe() aus spiel/werkzeuge/stilproben.html, ausgeführt wie im Browser. */
function stilprobenTreppe(): (basis: string) => number[][] {
  const html = readFileSync(SPIEL + 'werkzeuge/stilproben.html', 'utf8');
  const von = html.indexOf('function hex(h)');
  const bis = html.indexOf('function u32(c)');
  assert.ok(von > 0 && bis > von, 'Farbfunktionen in stilproben.html gefunden');
  return new Function(`${html.slice(von, bis)}\nreturn treppe;`)() as (basis: string) => number[][];
}

test('Treppe: genau wie treppe() der Stilprobe, für alle Materialien; Werte für JACKE_VELA nachgerechnet', () => {
  const probe = stilprobenTreppe();
  for (const m of Object.values(MATERIALIEN)) {
    const soll = probe(m.basis);
    assert.deepEqual(m.treppe.map((p) => [...pixelZuRgb(p)]), soll, m.name);
  }
  // JACKE_VELA #2D4F86: HSL (217,1°; 0,497; 0,351); Ton 3 = HSL(211,1°; 0,477; 0,461) = RGB (61, 116, 174)
  assert.deepEqual(
    JACKE_VELA.treppe.map((p) => [...pixelZuRgb(p)]),
    [
      [9, 11, 32],
      [25, 39, 82],
      [45, 79, 134],
      [61, 116, 174],
      [100, 153, 191],
    ],
  );
  const [h, s, l] = rgbZuHsl(45, 79, 134);
  assert.ok(Math.abs(h - 217.08) < 0.01 && Math.abs(s - 0.4972) < 0.001 && Math.abs(l - 0.3510) < 0.001);
  // Treppe: Helligkeit steigt von Ton 0 bis 4
  for (const m of Object.values(MATERIALIEN)) {
    const hell = m.treppe.map((p) => rgbZuHsl(...pixelZuRgb(p))[2]);
    for (let i = 1; i < 5; i++) assert.ok((hell[i] as number) >= (hell[i - 1] as number), `${m.name} Ton ${i}`);
  }
});

test('Hintergrundtreppe: Sättigung × 2/3, Kontrast um ein Drittel kleiner', () => {
  const basis = '#4D5D78';
  const f = treppe(basis);
  const g = hintergrundTreppe(basis);
  const hsl = (p: number) => rgbZuHsl(...pixelZuRgb(p));
  const [, sf, lf] = hsl(f[2]);
  const [, sg, lg] = hsl(g[2]);
  assert.ok(Math.abs(sg - (sf * 2) / 3) < 0.01, 'Sättigung des Grundtons');
  assert.ok(Math.abs(lg - lf) < 0.01, 'Helligkeit des Grundtons bleibt');
  const spanneF = hsl(f[4])[2] - hsl(f[0])[2];
  const spanneG = hsl(g[4])[2] - hsl(g[0])[2];
  assert.ok(Math.abs(spanneG - (spanneF * 2) / 3) < 0.01, `Kontrast ${spanneG} statt ${(spanneF * 2) / 3}`);
});

test('Kontur: Außenkontur geschlossen, Lücken und Rand werden gefunden', () => {
  const grund = hexZuPixel('#336699');
  const l = new Leinwand(12, 12);
  l.ellipse(6, 6, 4, 3, grund);
  assert.equal(konturGeschlossen(l, KONTUR), false);
  assert.ok(konturLuecken(l, KONTUR).length > 0);
  konturAussen(l, KONTUR);
  assert.equal(konturGeschlossen(l, KONTUR), true);
  // Lücke: ein Konturpixel fehlt
  const g = l.begrenzung();
  assert.ok(g !== null);
  const loch = l.klon();
  for (let x = 0; x < 12; x++) {
    if (loch.hole(x, g.y) === KONTUR) {
      loch.setze(x, g.y, DURCHSICHTIG);
      break;
    }
  }
  assert.equal(konturLuecken(loch, KONTUR).length, 1);
  // Figur am Bildrand: Rand zählt als durchsichtig
  const rand = new Leinwand(3, 3);
  rand.fuelle(grund);
  assert.equal(konturLuecken(rand, KONTUR).length, 8);
  assert.equal(randFaerben(rand, KONTUR), 8);
  assert.equal(konturGeschlossen(rand, KONTUR), true);
});

test('Streupixel: allein stehende Pixel werden gefunden und entfernt, Glanz ausgenommen', () => {
  const a = hexZuPixel('#336699');
  const b = hexZuPixel('#99CCFF');
  const l = new Leinwand(6, 6);
  l.rechteck(0, 0, 6, 6, a);
  l.setze(2, 2, b);
  assert.deepEqual(streupixel(l), [{ x: 2, y: 2 }]);
  assert.deepEqual(streupixel(l, new Set([b])), []);
  // Diagonale Linie ist kein Streupixel (acht Nachbarn)
  l.setze(3, 3, b);
  assert.deepEqual(streupixel(l), []);
  l.setze(3, 3, a);
  assert.equal(streupixelEntfernen(l), 1);
  assert.equal(l.hole(2, 2), a);
  assert.deepEqual(streupixel(l), []);
});

test('Farbzählung: verschiedene Pixelwerte einschließlich durchsichtig; nächste Farbe', () => {
  const l = new Leinwand(4, 1);
  l.setze(0, 0, KONTUR);
  l.setze(1, 0, JACKE_VELA.treppe[2]);
  l.setze(2, 0, JACKE_VELA.treppe[2]);
  assert.equal(farbenZaehlen(l), 3);
  assert.equal(farbenZaehlen([l, l.gespiegelt()]), 3);
  assert.equal(FARBBUDGET.figur, 16);
  const n = naechsteFarbe(hexZuPixel('#2E4F87'), [KONTUR, JACKE_VELA.treppe[2], JACKE_VELA.treppe[3]]);
  assert.equal(n.index, 1);
  assert.ok(n.abstand < 5);
});

test('Leinwand: Formen, Spiegeln, Ausschnitt, Vergrößern, Begrenzung', () => {
  const p = hexZuPixel('#FF0000');
  const l = new Leinwand(10, 8);
  l.rechteck(1, 2, 3, 2, p);
  assert.deepEqual(l.begrenzung(), { x: 1, y: 2, b: 3, h: 2 });
  assert.equal(l.gespiegelt().hole(8, 2), p);
  assert.equal(l.gespiegelt().hole(1, 2), DURCHSICHTIG);
  assert.equal(l.ausschnitt(1, 2, 2, 2).hole(1, 1), p);
  const v = l.vergroessert(2);
  assert.equal(v.breite, 20);
  assert.equal(v.hole(3, 5), p);
  const m = new Leinwand(9, 9);
  m.polygon(
    [
      { x: 0, y: 0 },
      { x: 9, y: 0 },
      { x: 0, y: 9 },
    ],
    p,
  );
  assert.equal(m.hole(0, 0), p);
  assert.equal(m.hole(8, 8), DURCHSICHTIG);
  m.linie(0, 8, 8, 8, p);
  assert.equal(m.hole(8, 8), p);
});

test('Blatt: Packen mit Zuschnitt, Anker, gleiche Bilder einmal, Atlas im Format 2.3', () => {
  const p = hexZuPixel('#FF0000');
  const a = new Leinwand(10, 10);
  a.rechteck(2, 3, 4, 5, p);
  const b = zugeschnitten({ leinwand: a, ankerX: 4, ankerY: 7, dauer: 4 });
  assert.equal(b.leinwand.breite, 4);
  assert.equal(b.ankerX, 2);
  assert.equal(b.ankerY, 4);
  const anim: Animation[] = [
    { name: 'stand', schleife: true, bilder: [{ leinwand: a, ankerX: 4, ankerY: 7, dauer: 0 }] },
    { name: 'kette1', schleife: false, bilder: [{ leinwand: a, ankerX: 4, ankerY: 7, dauer: 1 }, { leinwand: a.gespiegelt(), ankerX: 5, ankerY: 7, dauer: 4 }], aktiv: [1] },
  ];
  const blatt = blattPacken('probe', anim);
  const atlas = JSON.parse(atlasText(blatt.atlas)) as {
    blatt: string;
    animationen: Record<string, { schleife: boolean; bilder: { x: number; y: number; b: number; h: number; ankerX: number; ankerY: number; dauer: number }[]; aktiv?: number[] }>;
  };
  assert.equal(atlas.blatt, 'probe.png');
  assert.deepEqual(Object.keys(atlas.animationen), ['stand', 'kette1']);
  const s = atlas.animationen['stand']?.bilder[0];
  const k = atlas.animationen['kette1']?.bilder[0];
  assert.ok(s !== undefined && k !== undefined);
  assert.deepEqual([k.x, k.y], [s.x, s.y], 'gleiches Bild liegt einmal im Blatt');
  assert.deepEqual(atlas.animationen['kette1']?.aktiv, [1]);
  assert.equal(atlas.animationen['stand']?.schleife, true);
  // Pixel im Blatt an der Stelle des Atlas
  assert.equal(blatt.leinwand.hole(s.x, s.y), p);
  assert.deepEqual(Object.keys(s), ['x', 'y', 'b', 'h', 'ankerX', 'ankerY', 'dauer']);
});

test('Kontaktbogen: 2× vergrößert, Bilder nebeneinander, Schrift misst 4 px je Zeichen', () => {
  const p = hexZuPixel('#FF0000');
  const a = new Leinwand(5, 9);
  a.rechteck(0, 0, 5, 9, p);
  const anim: Animation = { name: 'probe', schleife: false, bilder: [0, 1, 2].map(() => ({ leinwand: a, ankerX: 2, ankerY: 8, dauer: 3 })), aktiv: [1] };
  const bogen = kontaktBogen(anim);
  assert.equal(bogen.breite % 2, 0);
  assert.equal(bogen.hoehe % 2, 0);
  let rot = 0;
  for (const q of bogen.daten) if (q === p) rot++;
  assert.equal(rot, 3 * 5 * 9 * 4, 'drei Bilder, je 2 × 2 Pixel je Bildpixel');
  assert.equal(textBreite('AB'), 7);
  assert.equal(textBreite('AB', 2), 14);
});

test('Puppe: zwei Gelenke treffen das Ziel, Kette und Winkelkonvention', () => {
  const pu = new Puppe([
    { name: 'Wurzel', eltern: null, gelenk: { x: 0, y: 0 }, formen: [], material: 'M', gruppe: 'a', ebene: 0 },
    { name: 'Ober', eltern: 'Wurzel', gelenk: { x: 0, y: 0 }, formen: [], material: 'M', gruppe: 'a', ebene: 0 },
    { name: 'Unter', eltern: 'Ober', gelenk: { x: 0, y: 10 }, formen: [], material: 'M', gruppe: 'a', ebene: 0 },
    { name: 'Ende', eltern: 'Unter', gelenk: { x: 0, y: 8 }, formen: [], material: 'M', gruppe: 'a', ebene: 0 },
  ]);
  const basis = { wurzel: { x: 0, y: -20 }, winkel: {} };
  // Winkel 90: nach vorn
  const vorn = pu.lagen({ ...basis, winkel: { Ober: 90 } }).get('Unter');
  assert.ok(vorn !== undefined && Math.abs(vorn.pos.x - 10) < 1e-9 && Math.abs(vorn.pos.y + 20) < 1e-9);
  for (const ziel of [
    { x: 5, y: -6 },
    { x: -7, y: -10 },
    { x: 12, y: -25 },
  ]) {
    for (const beuge of [1, -1] as const) {
      const w = pu.zweiGelenke(basis, 'Ober', 'Unter', 'Ende', ziel, beuge);
      const e = pu.lagen({ ...basis, winkel: w }).get('Ende');
      assert.ok(e !== undefined && Math.hypot(e.pos.x - ziel.x, e.pos.y - ziel.y) < 1e-6, `Ziel ${JSON.stringify(ziel)} Beuge ${beuge}`);
    }
  }
});
