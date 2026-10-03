// Tests der Anzeige (Auftrag 4, Phase 2, G6; docs/grafik.md 4.9): Zeichenvorrat
// der Pixelschrift in beiden Größen, Bitmuster und Scale2x, Schattenkante und
// Umriss, Farbbudget 8, Atlas (Format, Lage im Blatt, Inhalt), Balken in Lagen
// nach Welt 10.1, Lebenssymbol, Pfeil 37 × 17, große Texte als fertige Bilder,
// nachgestellte Leiste in den Lagen aus Welt 10.1, Stilprüfung, Determinismus
// und Stand der Ausgabe in spiel/grafik/ausgabe/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SPIEL } from './hilfe.ts';
import type { AnzeigeAtlas, AtlasTeil } from '../grafik/quelle/anzeige.ts';
import {
  ANZEIGE_BLATT,
  GROSSE_TEXTE,
  KONTAKT_BILD_DATEI,
  KONTAKT_DATEI,
  LAGEN_FARBEN,
  LEBEN_ZAHL_DX,
  LEISTE_FARBEN,
  PFEIL_BREITE,
  PFEIL_HOEHE,
  anzeigeAtlasText,
  anzeigeBlatt,
  anzeigeErzeugnisse,
  anzeigePruefen,
  balkenSetzen,
  grosserTextBild,
  lebenBild,
  leisteSetzen,
  pfeilBild,
  textSetzen,
  zeichenBild,
} from '../grafik/quelle/anzeige.ts';
import { GLYPHEN_16, GLYPHEN_8, GROSS, KLEIN, PFEIL_ZEICHEN, ZEICHENVORRAT, maske, scale2x } from '../grafik/quelle/schrift.ts';
import { konturGeschlossen, streupixel } from '../grafik/quelle/kontur.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { DURCHSICHTIG, Leinwand, deckend } from '../grafik/quelle/leinwand.ts';
import { BALKEN_GELB, BALKEN_GRUEN, BALKEN_LEER, BALKEN_ORANGE, FARBBUDGET, HAUT_HELL, KONTUR, LEISTE_TEXT, farbenMenge } from '../grafik/quelle/palette.ts';
import { md5, pngDateiLesen, pngLesen } from '../grafik/quelle/png.ts';
import { balken } from '../src/kern/rahmen.ts';
import { ANZEIGE, BILD_BREITE, LP_BALKEN_BREITE, PUNKTE_BALLAST } from '../src/kern/werte.ts';

const BLATT = anzeigeBlatt();
const A: AnzeigeAtlas = BLATT.atlas;

/** Ausschnitt eines Atlas-Teils aus dem Blatt. */
const aus = (t: AtlasTeil): Leinwand => BLATT.leinwand.ausschnitt(t.x, t.y, t.b, t.h);

test('Anzeige: registriert in bauen.ts über anzeigeErzeugnisse(), ein Erzeugnis mit Blatt, Atlas, zwei Kontaktbögen, ohne Befunde', () => {
  const e = anzeigeErzeugnisse();
  assert.equal(e.length, 1);
  const [a] = e as [(typeof e)[number]];
  assert.equal(a.name, ANZEIGE_BLATT);
  assert.deepEqual([...a.ausgabe.keys()], ['anzeige.png', 'anzeige.json']);
  assert.deepEqual([...a.bilder.keys()], [KONTAKT_DATEI, KONTAKT_BILD_DATEI]);
  assert.deepEqual(a.befunde, []);
  assert.deepEqual(anzeigePruefen(BLATT), []);
});

test('Schrift: Zeichenvorrat A–Z, Ä Ö Ü, 0–9, . , : ! ? - + / \' Leerzeichen und Pfeil, in beiden Größen', () => {
  const soll = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ä', 'Ö', 'Ü', ...'0123456789', ...".,:!?-+/'", ' ', '→'];
  assert.deepEqual([...ZEICHENVORRAT].sort(), [...soll].sort());
  assert.equal(PFEIL_ZEICHEN, '→');
  assert.deepEqual(Object.keys(GLYPHEN_8).sort(), [...soll].sort());
  assert.deepEqual(Object.keys(GLYPHEN_16).sort(), [...soll].sort());
  assert.deepEqual(Object.keys(A.schriften.klein.zeichen).sort(), [...soll].sort());
  assert.deepEqual(Object.keys(A.schriften.gross.zeichen).sort(), [...soll].sort());
});

test('Schrift klein: Körper 7 × 7 aus # und ., alle Zeichen verschieden, nur das Leerzeichen leer, kein Pixel allein', () => {
  const gesehen = new Map<string, string>();
  for (const z of ZEICHENVORRAT) {
    const m = GLYPHEN_8[z] as readonly string[];
    assert.equal(m.length, KLEIN.koerper, `${z}: Zeilen`);
    for (const zeile of m) assert.match(zeile, /^[#.]{7}$/, `${z}: Zeile ${zeile}`);
    const schluessel = m.join('/');
    assert.ok(!gesehen.has(schluessel), `${z} gleicht ${gesehen.get(schluessel)}`);
    gesehen.set(schluessel, z);
    const b = maske(m);
    const n = b.flat().filter(Boolean).length;
    if (z === ' ') assert.equal(n, 0);
    else assert.ok(n > 0, `${z} leer`);
    b.forEach((reihe, y) =>
      reihe.forEach((an, x) => {
        if (!an) return;
        let nachbar = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx !== 0 || dy !== 0) && b[y + dy]?.[x + dx] === true) nachbar = true;
        assert.ok(nachbar, `${z}: Pixel (${x}, ${y}) allein`);
      }),
    );
  }
});

test('Schrift klein: kräftige Striche, jeder Buchstabe und jede Ziffer hat einen senkrechten Strich von 2 px Breite', () => {
  for (const z of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']) {
    const b = maske(GLYPHEN_8[z] as readonly string[]);
    let doppelt = false;
    for (let y = 0; y + 1 < b.length; y++) {
      for (let x = 0; x + 1 < 7; x++) {
        if (b[y]?.[x] && b[y]?.[x + 1] && b[y + 1]?.[x] && b[y + 1]?.[x + 1]) doppelt = true;
      }
    }
    assert.ok(doppelt, `${z}: kein Block 2 × 2`);
  }
});

test('Scale2x: bekanntes Beispiel (Schräge geglättet) und große Schrift = Scale2x der kleinen, je 2 × 2-Block höchstens ein Pixel anders', () => {
  assert.deepEqual(scale2x(['#.', '.#']), ['##..', '###.', '.###', '..##']);
  assert.deepEqual(scale2x(['#']), ['##', '##']);
  for (const z of ZEICHENVORRAT) {
    const g = GLYPHEN_16[z] as readonly string[];
    assert.deepEqual(g, scale2x(GLYPHEN_8[z] as readonly string[]), z);
    assert.equal(g.length, GROSS.koerper);
    for (const zeile of g) assert.equal(zeile.length, GROSS.koerper);
    const k = maske(GLYPHEN_8[z] as readonly string[]);
    const m = maske(g);
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        let anders = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) if (m[2 * y + dy]?.[2 * x + dx] !== k[y]?.[x]) anders += 1;
        assert.ok(anders <= 1, `${z}: Block (${x}, ${y}) ${anders} anders`);
      }
    }
  }
});

test('Zeichenbild klein: Körper in LEISTE_TEXT ab (1, 1), Schatten 1 px rechts unten und Umriss in KONTUR, Kontur geschlossen, 10 × 10', () => {
  for (const z of ZEICHENVORRAT) {
    const t = zeichenBild(KLEIN, z);
    const l = t.leinwand;
    assert.equal(l.breite, KLEIN.zelle + 2);
    assert.equal(l.hoehe, KLEIN.zelle + 2);
    assert.deepEqual([t.ankerX, t.ankerY], [1, 1]);
    const b = maske(GLYPHEN_8[z] as readonly string[]);
    for (let y = 0; y < l.hoehe; y++) {
      for (let x = 0; x < l.breite; x++) {
        const p = l.hole(x, y);
        const koerper = b[y - 1]?.[x - 1] === true;
        if (koerper) assert.equal(p, LEISTE_TEXT, `${z} (${x}, ${y})`);
        else if (deckend(p)) assert.equal(p, KONTUR, `${z} (${x}, ${y})`);
        if (!koerper && b[y - 2]?.[x - 2] === true) assert.equal(p, KONTUR, `${z}: Schatten (${x}, ${y})`);
      }
    }
    assert.ok(konturGeschlossen(l, KONTUR), z);
    assert.deepEqual(streupixel(l), [], z);
  }
});

test('Zeichenbild groß: 18 × 18, Körper in Bändern hell/gelb/orange (Zeilen 0–4, 5–9, 10–13), Schatten 2 px, Kontur geschlossen', () => {
  const band = (y: number): Pixel => (y <= 4 ? LEISTE_TEXT : y <= 9 ? BALKEN_GELB : BALKEN_ORANGE);
  for (const z of ZEICHENVORRAT) {
    const t = zeichenBild(GROSS, z);
    const l = t.leinwand;
    assert.equal(l.breite, GROSS.zelle + 2);
    assert.equal(l.hoehe, GROSS.zelle + 2);
    const b = maske(GLYPHEN_16[z] as readonly string[]);
    for (let y = 0; y < l.hoehe; y++) {
      for (let x = 0; x < l.breite; x++) {
        const koerper = b[y - 1]?.[x - 1] === true;
        if (koerper) assert.equal(l.hole(x, y), band(y - 1), `${z} (${x}, ${y})`);
        else {
          if (deckend(l.hole(x, y))) assert.equal(l.hole(x, y), KONTUR);
          for (const d of [1, 2]) if (b[y - 1 - d]?.[x - 1 - d] === true) assert.equal(l.hole(x, y), KONTUR, `${z}: Schatten ${d} (${x}, ${y})`);
        }
      }
    }
    assert.ok(konturGeschlossen(l, KONTUR), z);
    assert.deepEqual(streupixel(l), [], z);
  }
});

test('Farben: Blatt höchstens 8 einschließlich durchsichtig (FARBBUDGET.anzeige), nur LEISTE_TEXT, Balkenfarben, BALKEN_LEER, KONTUR, Haut', () => {
  assert.equal(FARBBUDGET.anzeige, 8);
  assert.deepEqual(new Set(LEISTE_FARBEN), new Set([KONTUR, LEISTE_TEXT, BALKEN_GRUEN, BALKEN_GELB, BALKEN_ORANGE, BALKEN_LEER, HAUT_HELL.treppe[2]]));
  assert.deepEqual(LAGEN_FARBEN, [BALKEN_GRUEN, BALKEN_GELB, BALKEN_ORANGE]);
  const farben = farbenMenge(BLATT.leinwand);
  assert.ok(farben.size <= FARBBUDGET.anzeige, `${farben.size} Farben`);
  for (const f of farben) assert.ok(f === DURCHSICHTIG || LEISTE_FARBEN.includes(f), f.toString(16));
  assert.equal(farben.size, 8, 'alle sieben Farben und durchsichtig werden genutzt');
});

test('Atlas: gültiges JSON gleich dem Atlas, Laufweite und Zeilenhöhe beider Größen, Teile im Blatt ohne Überlappung, Inhalt gleich den Teilen', () => {
  const json = JSON.parse(anzeigeAtlasText(A)) as AnzeigeAtlas;
  assert.deepEqual(json, JSON.parse(JSON.stringify(A)));
  assert.equal(json.blatt, 'anzeige.png');
  assert.equal(json.farben, 8);
  const k = json.schriften.klein;
  const g = json.schriften.gross;
  assert.deepEqual([k.zelle, k.laufweite, k.zeilenhoehe, k.schatten, k.umriss, k.ersatz], [8, 8, 12, 1, 1, '?']);
  assert.deepEqual([g.zelle, g.laufweite, g.zeilenhoehe, g.schatten, g.umriss, g.ersatz], [16, 16, 20, 2, 1, '?']);
  assert.equal(json.balken.breite, LP_BALKEN_BREITE);
  assert.equal(json.balken.hoehe, ANZEIGE.lp_balken.zeile1 - ANZEIGE.lp_balken.zeile0 + 1);
  assert.equal(json.balken.lagen.length, 3);
  assert.equal(json.leben.zahlDx, LEBEN_ZAHL_DX);
  const teile: [string, AtlasTeil][] = [
    ...Object.entries(k.zeichen).map(([z, t]) => [`klein ${z}`, t] as [string, AtlasTeil]),
    ...Object.entries(g.zeichen).map(([z, t]) => [`gross ${z}`, t] as [string, AtlasTeil]),
    ['rahmen_links', json.balken.rahmen_links],
    ['rahmen_rechts', json.balken.rahmen_rechts],
    ...json.balken.lagen.map((t, i) => [`lage ${i + 1}`, t] as [string, AtlasTeil]),
    ['leer', json.balken.leer],
    ['leben', json.leben],
    ['pfeil', json.pfeil],
    ...Object.entries(json.texte).map(([z, t]) => [`text ${z}`, t] as [string, AtlasTeil]),
  ];
  for (const [n, t] of teile) {
    assert.ok(t.x >= 0 && t.y >= 0 && t.x + t.b <= BLATT.leinwand.breite && t.y + t.h <= BLATT.leinwand.hoehe, `${n} im Blatt`);
    assert.ok(t.ankerX >= 0 && t.ankerX < t.b && t.ankerY >= 0 && t.ankerY < t.h, `${n}: Anker im Bild`);
  }
  for (let i = 0; i < teile.length; i++) {
    for (let j = i + 1; j < teile.length; j++) {
      const [na, a] = teile[i] as [string, AtlasTeil];
      const [nb, b] = teile[j] as [string, AtlasTeil];
      const frei = a.x + a.b <= b.x || b.x + b.b <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(frei, `${na} überlappt ${nb}`);
    }
  }
  for (const z of ZEICHENVORRAT) {
    assert.ok(aus(k.zeichen[z] as AtlasTeil).gleich(zeichenBild(KLEIN, z).leinwand), `klein ${z}`);
    assert.ok(aus(g.zeichen[z] as AtlasTeil).gleich(zeichenBild(GROSS, z).leinwand), `gross ${z}`);
  }
  assert.ok(aus(json.leben).gleich(lebenBild().leinwand));
  assert.ok(aus(json.pfeil).gleich(pfeilBild().leinwand));
  for (const t of GROSSE_TEXTE) assert.ok(aus(json.texte[t] as AtlasTeil).gleich(grosserTextBild(t).leinwand), t);
});

test('Balken: Bausteine 1 × 8 (Rahmen oben und unten, Füllung 6 Zeilen), Anker auf der obersten Füllzeile, Rahmenspalten mit runden Ecken', () => {
  for (const [t, fuellung] of [
    [A.balken.lagen[0], BALKEN_GRUEN],
    [A.balken.lagen[1], BALKEN_GELB],
    [A.balken.lagen[2], BALKEN_ORANGE],
    [A.balken.leer, BALKEN_LEER],
  ] as [AtlasTeil, Pixel][]) {
    const l = aus(t);
    assert.deepEqual([l.breite, l.hoehe, t.ankerX, t.ankerY], [1, 8, 0, 1]);
    assert.deepEqual([...l.daten], [KONTUR, ...new Array<Pixel>(6).fill(fuellung), KONTUR]);
  }
  for (const t of [A.balken.rahmen_links, A.balken.rahmen_rechts]) {
    assert.deepEqual([...aus(t).daten], [DURCHSICHTIG, ...new Array<Pixel>(6).fill(KONTUR), DURCHSICHTIG]);
  }
});

test('Balken: zusammengesetzt nach Welt 10.1, 1 px je LP von links, Lagen grün/gelb/orange über der vollen Vorlage, bei LP ≤ 0 leer', () => {
  const lage = (n: number): Pixel => LAGEN_FARBEN[Math.min(n, 3) - 1] as Pixel;
  for (const lp of [72, 40, 7, 1, 0, -3, 73, 100, 144, 145, 150, 216, 300]) {
    const b = balken(lp);
    const l = new Leinwand(80, 12);
    balkenSetzen(l, BLATT.leinwand, A, 3, 2, b);
    // Rahmen
    for (let i = -1; i <= 72; i++) {
      const rand = i === -1 || i === 72;
      assert.equal(l.hole(3 + i, 1), rand ? DURCHSICHTIG : KONTUR, `LP ${lp}: oben ${i}`);
      assert.equal(l.hole(3 + i, 8), rand ? DURCHSICHTIG : KONTUR, `LP ${lp}: unten ${i}`);
    }
    for (let r = 0; r < 6; r++) {
      assert.equal(l.hole(2, 2 + r), KONTUR);
      assert.equal(l.hole(75, 2 + r), KONTUR);
    }
    // Füllung
    const zaehle = new Map<Pixel, number>();
    for (let i = 0; i < 72; i++) {
      const p = l.hole(3 + i, 2);
      for (let r = 1; r < 6; r++) assert.equal(l.hole(3 + i, 2 + r), p, `LP ${lp}: Spalte ${i} einfarbig`);
      zaehle.set(p, (zaehle.get(p) ?? 0) + 1);
      if (i < b.breite) assert.equal(p, lage(b.lage), `LP ${lp}: Spalte ${i}`);
    }
    if (lp <= 0) assert.equal(zaehle.get(BALKEN_LEER), 72);
    else if (lp <= 72) {
      assert.equal(zaehle.get(BALKEN_GRUEN), lp);
      assert.equal(zaehle.get(BALKEN_LEER) ?? 0, 72 - lp);
    } else {
      // ab Lage 4 bleibt die Farbe orange, Lage und Unterlage sind dann gleich (Welt 10.1 nennt drei Farben)
      if (lage(b.lage) === lage(b.unterlage)) assert.equal(zaehle.get(lage(b.lage)), 72);
      else {
        assert.equal(zaehle.get(lage(b.lage)), b.breite);
        if (b.breite < 72) assert.equal(zaehle.get(lage(b.unterlage)), 72 - b.breite, `LP ${lp}: Unterlage`);
      }
      assert.equal(zaehle.get(BALKEN_LEER) ?? 0, 0);
    }
  }
  // Boss mit 100 LP (Welt 7.1): 28 px gelb über 72 grün
  assert.deepEqual(balken(100), { lage: 2, breite: 28, unterlage: 1 });
});

test('Lebenssymbol: 8 × 8, Kontur geschlossen, ohne Streupixel, Haar orange mit gelbem Glanz, Haut, Auge in KONTUR', () => {
  const t = lebenBild();
  const l = t.leinwand;
  assert.deepEqual([l.breite, l.hoehe, t.ankerX, t.ankerY], [8, 8, 0, 0]);
  assert.ok(konturGeschlossen(l, KONTUR));
  assert.deepEqual(streupixel(l), []);
  const f = farbenMenge(l);
  for (const p of [KONTUR, BALKEN_ORANGE, BALKEN_GELB, HAUT_HELL.treppe[2]]) assert.ok(f.has(p));
  // Auge: KONTUR mit Haut links und rechts (innen, nicht am Rand)
  let auge = false;
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) if (l.hole(x, y) === KONTUR && l.hole(x - 1, y) === HAUT_HELL.treppe[2] && l.hole(x + 1, y) === HAUT_HELL.treppe[2]) auge = true;
  assert.ok(auge, 'Auge');
  // Pferdeschwanz: Haar in der linken Spalte unterhalb der Kopfmitte
  assert.equal(l.hole(1, 6), BALKEN_ORANGE);
});

test('Pfeil „weiter“: 37 × 17 wie ANZEIGE.pfeil, Spitze rechts in der Mitte, Spitze höher als der Schaft, Kontur geschlossen', () => {
  const l = pfeilBild().leinwand;
  assert.equal(PFEIL_BREITE, ANZEIGE.pfeil.x1 - ANZEIGE.pfeil.x0 + 1);
  assert.equal(PFEIL_HOEHE, ANZEIGE.pfeil.zeile1 - ANZEIGE.pfeil.zeile0 + 1);
  assert.deepEqual([l.breite, l.hoehe], [37, 17]);
  assert.ok(konturGeschlossen(l, KONTUR));
  assert.deepEqual(streupixel(l), []);
  const hoeheFuellung = (x: number): number => {
    let n = 0;
    for (let y = 0; y < l.hoehe; y++) if (deckend(l.hole(x, y)) && l.hole(x, y) !== KONTUR) n += 1;
    return n;
  };
  let spitze = 0;
  for (let x = 0; x < l.breite; x++) spitze = Math.max(spitze, hoeheFuellung(x));
  assert.ok(spitze > 2 * hoeheFuellung(5), `Spitze ${spitze} px, Schaft ${hoeheFuellung(5)} px`);
  // Spitze: rechteste Füllspalte enthält die Mittelzeile der Füllung
  let rechts = 0;
  for (let x = 0; x < l.breite; x++) if (hoeheFuellung(x) > 0) rechts = x;
  const zeilen: number[] = [];
  for (let y = 0; y < l.hoehe; y++) if (deckend(l.hole(rechts, y)) && l.hole(rechts, y) !== KONTUR) zeilen.push(y);
  assert.ok(zeilen.length > 0 && zeilen.every((y) => Math.abs(y - 7.5) <= 1), `Spitze in Zeilen ${zeilen.join(',')}`);
});

test('Große Texte: PAUSE, STAGE CLEAR, GAME OVER, BALLAST BESIEGT, 5000 und die Zeile aus anzeige(); aus Zeichen der großen Schrift zusammengesetzt', () => {
  assert.deepEqual(GROSSE_TEXTE, ['PAUSE', 'STAGE CLEAR', 'GAME OVER', 'BALLAST BESIEGT', String(PUNKTE_BALLAST), `BALLAST BESIEGT ${PUNKTE_BALLAST}`]);
  assert.deepEqual(Object.keys(A.texte).sort(), [...GROSSE_TEXTE].sort());
  for (const text of GROSSE_TEXTE) {
    const t = A.texte[text] as AtlasTeil;
    const n = [...text].length;
    assert.deepEqual([t.b, t.h, t.ankerX, t.ankerY], [n * GROSS.laufweite + 2, GROSS.zelle + 2, 1, 1], text);
    assert.ok(t.b <= BILD_BREITE, `${text} passt ins Bild`);
    const l = aus(t);
    [...text].forEach((z, i) => {
      const b = maske(GLYPHEN_16[z] as readonly string[]);
      const zb = zeichenBild(GROSS, z).leinwand;
      for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) if (b[y]?.[x] === true) assert.equal(l.hole(1 + i * 16 + x, 1 + y), zb.hole(1 + x, 1 + y), `${text}: ${z}`);
    });
    // gleich dem Setzen aus den Zeichen
    const gesetzt = new Leinwand(t.b, t.h);
    textSetzen(gesetzt, BLATT.leinwand, A.schriften.gross, text, 1, 1);
    assert.ok(gesetzt.gleich(l), `${text} = Zeichen gesetzt`);
  }
});

test('Leiste: nachgestellt nach Welt 10.1 (Name x 8 Zeile 6, Punkte x 48, Leben x 8 Zeile 18, Balken x 48–119 und 200–271, Gegner x 200), alles in 384 × 32', () => {
  const l = new Leinwand(BILD_BREITE, 32);
  leisteSetzen(l, BLATT.leinwand, A, { name: 'VELA', punkte: '00012340', leben: 3, figur: balken(40), gegner: { slot: 0, name: 'RAMMBOCK', balken: balken(30) } });
  const koerperAn = (text: string, x0: number, y0: number): void => {
    [...text].forEach((z, i) => {
      const b = maske(GLYPHEN_8[z] as readonly string[]);
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (b[y]?.[x] === true) assert.equal(l.hole(x0 + i * 8 + x, y0 + y), LEISTE_TEXT, `${text}: ${z} bei (${x0 + i * 8 + x}, ${y0 + y})`);
    });
  };
  koerperAn('VELA', ANZEIGE.name.x, ANZEIGE.name.zeile);
  koerperAn('00012340', ANZEIGE.punkte.x, ANZEIGE.punkte.zeile);
  koerperAn('3', ANZEIGE.leben.x + LEBEN_ZAHL_DX, ANZEIGE.leben.zeile);
  koerperAn('RAMMBOCK', ANZEIGE.gegner_name.x, ANZEIGE.gegner_name.zeile);
  assert.ok(l.ausschnitt(ANZEIGE.leben.x, ANZEIGE.leben.zeile, 8, 8).gleich(lebenBild().leinwand), 'Lebenssymbol');
  for (let x = ANZEIGE.lp_balken.x0; x <= ANZEIGE.lp_balken.x1; x++) {
    for (let y = ANZEIGE.lp_balken.zeile0; y <= ANZEIGE.lp_balken.zeile1; y++) assert.equal(l.hole(x, y), x - ANZEIGE.lp_balken.x0 < 40 ? BALKEN_GRUEN : BALKEN_LEER);
  }
  for (let x = ANZEIGE.gegner_balken.x0; x <= ANZEIGE.gegner_balken.x1; x++) assert.equal(l.hole(x, ANZEIGE.gegner_balken.zeile0), x - ANZEIGE.gegner_balken.x0 < 30 ? BALKEN_GRUEN : BALKEN_LEER);
  // Leben-Zahl und Balken, Name und Punkte berühren sich nicht (eine freie Spalte dazwischen)
  const spalteLeer = (x: number, y0: number, y1: number): boolean => {
    for (let y = y0; y <= y1; y++) if (deckend(l.hole(x, y))) return false;
    return true;
  };
  assert.ok(spalteLeer(ANZEIGE.lp_balken.x0 - 2, ANZEIGE.leben.zeile - 1, ANZEIGE.leben.zeile + 9), 'zwischen Lebenszahl und Balken');
  assert.ok(spalteLeer(ANZEIGE.punkte.x - 2, ANZEIGE.name.zeile - 1, ANZEIGE.name.zeile + 9), 'zwischen Name und Punkten');
  assert.ok(spalteLeer(ANZEIGE.leben.x + 8, ANZEIGE.leben.zeile, ANZEIGE.leben.zeile + 7), 'zwischen Symbol und Zahl');
  // Alles innerhalb der Leiste (Zeilen 0 bis 31), nichts am Rand abgeschnitten
  const g = l.begrenzung();
  assert.ok(g !== null && g.y >= 1 && g.y + g.h <= 31 && g.x >= 1 && g.x + g.b <= BILD_BREITE - 1, JSON.stringify(g));
});

test('Determinismus: zwei Bauläufe geben gleiche Bytes für Blatt, Atlas und Kontaktbögen', () => {
  const [a] = anzeigeErzeugnisse() as [ReturnType<typeof anzeigeErzeugnisse>[number]];
  const [b] = anzeigeErzeugnisse() as [ReturnType<typeof anzeigeErzeugnisse>[number]];
  const summe = (v: Uint8Array | string): string => md5(typeof v === 'string' ? new TextEncoder().encode(v) : v);
  for (const [k, v] of a.ausgabe) assert.equal(summe(v), summe(b.ausgabe.get(k) as Uint8Array | string), k);
  for (const [k, v] of a.bilder) assert.equal(md5(v), md5(b.bilder.get(k) as Uint8Array), k);
  // das PNG liest sich zurück als dasselbe Blatt
  assert.ok(pngLesen(a.ausgabe.get('anzeige.png') as Uint8Array).gleich(BLATT.leinwand));
});

test('Ausgabe: spiel/grafik/ausgabe/anzeige.png und anzeige.json und die Kontaktbögen entsprechen dem Bau (npm run grafik)', () => {
  const png = SPIEL + 'grafik/ausgabe/anzeige.png';
  const json = SPIEL + 'grafik/ausgabe/anzeige.json';
  assert.ok(existsSync(png) && existsSync(json), 'npm run grafik ausführen');
  assert.ok(pngDateiLesen(png).gleich(BLATT.leinwand), 'anzeige.png veraltet');
  assert.equal(readFileSync(json, 'utf8'), anzeigeAtlasText(A), 'anzeige.json veraltet');
  const [e] = anzeigeErzeugnisse() as [ReturnType<typeof anzeigeErzeugnisse>[number]];
  for (const [datei, bytes] of e.bilder) {
    const pfad = SPIEL + `../docs/bilder/${datei}`;
    assert.ok(existsSync(pfad), datei);
    assert.equal(md5(new Uint8Array(readFileSync(pfad))), md5(bytes), `${datei} veraltet`);
  }
});
