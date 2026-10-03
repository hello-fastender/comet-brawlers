// Umsetzer v2 (Auftrag 5, Phase 1, U2; docs/grafik.md 5.8): Medianschnitt
// (höchstens 64 Farben, keine Hintergrundfarbe, Helligkeit und Sättigung
// erhalten), Maßstab (Zielhöhe 2 × (Umrisshöhe − 5)), Kontur aus dunklem Ton,
// Bodenton, Fußkontakt beim Gehen (Standfuß wandert um die Gehstrecke, Rest
// protokolliert), Anker nach der Schnittstelle der Darstellung (U1), Atlas
// mit "massstab": 2, blaetter.json, Wahl des neueren Ordners, Determinismus.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AUSGABE, blaetterText, FREMD, grokGegenPuppe, grokOrdner, puppenName } from '../grafik/quelle/bauen.ts';
import type { Animation } from '../grafik/quelle/blatt.ts';
import { atlasText } from '../grafik/quelle/blatt.ts';
import { farbAbstand, mischen, pixelZuHex, rgbZuHsl, pixelZuRgb } from '../grafik/quelle/farbe.ts';
import type { Pixel } from '../grafik/quelle/leinwand.ts';
import { Leinwand } from '../grafik/quelle/leinwand.ts';
import { farbHaeufigkeit, helligkeit, medianschnitt } from '../grafik/quelle/medianschnitt.ts';
import { farbenZaehlen, HAUT_MITTEL, HOSE_BRAUN, NACHTHIMMEL, STAHL, TON_GRUND, WESTE_OLIV } from '../grafik/quelle/palette.ts';
import { pngDateiLesen } from '../grafik/quelle/png.ts';
import type { Anker } from '../grafik/quelle/umsetzer.ts';
import {
  ankerAusAtlas, atlasAnker, bildePalette, dunkelPruefer, dunklerAlsBoden, dunkelsterBodenton, findeZellen, freistellen, fusskontaktSetzen,
  grokAtlasText, grokBytes, hellerAlsBoden, hintergrundblaetterLesen, konturLueckenDunkel, MASSSTAB, schneideAus, STANDARD, umsetzenOrdner,
  verkleinertBereinigt, zielhoeheFuer,
} from '../grafik/quelle/umsetzer.ts';

const E = umsetzenOrdner(join(FREMD, 'rammbock'));
/** Hintergrund der Rammbock-Blätter (Ecken, docs/grafik.md 5.7). */
const GRUENDE = [...new Set(E.blaetter.map((b) => b.hintergrund.farbe))];

function mittel(bilder: readonly Leinwand[], wert: (p: Pixel) => number): number {
  let s = 0;
  let n = 0;
  for (const b of bilder) {
    for (const p of b.daten) {
      if (p === 0) continue;
      s += wert(p);
      n++;
    }
  }
  return s / n;
}

const saettigung = (p: Pixel): number => {
  const c = pixelZuRgb(p);
  return rgbZuHsl(c[0], c[1], c[2])[1];
};

test('Medianschnitt: höchstens die Höchstzahl, ohne Hintergrundfarbe, jede Farbe auf die nächste, unabhängig von der Reihenfolge', () => {
  const grund = NACHTHIMMEL.treppe[TON_GRUND];
  const zahl = new Map<Pixel, number>();
  const basis = [HAUT_MITTEL, WESTE_OLIV, HOSE_BRAUN, STAHL].flatMap((m) => [...m.treppe]);
  basis.forEach((f, i) => {
    for (let t = 0; t < 8; t++) zahl.set(mischen(f, basis[(i + 1) % basis.length]!, t / 16), 10 + ((i * 7 + t) % 13));
  });
  // Rauschen des Grunds (Pixel, die das Schließen in die Figur nahm)
  for (let t = 0; t < 6; t++) zahl.set(mischen(grund, HAUT_MITTEL.treppe[0], t / 40), 50);
  const ohne = (p: Pixel): boolean => farbAbstand(p, grund) <= STANDARD.toleranzHintergrund;
  const s = medianschnitt(zahl, 63, 2, ohne);
  assert.ok(s.palette.length <= 63);
  assert.equal(s.quellfarben, zahl.size);
  assert.equal(s.ohneSchnitt, 6);
  for (const p of s.palette) assert.ok(!ohne(p), `${pixelZuHex(p)} liegt im Bereich des Grunds`);
  for (const [f, i] of s.abbildung) for (const p of s.palette) assert.ok(farbAbstand(f, s.palette[i]!) <= farbAbstand(f, p) + 1e-9);
  // umgekehrte Einfügereihenfolge: gleiches Ergebnis (deterministisch)
  const rueck = new Map([...zahl].reverse());
  const s2 = medianschnitt(rueck, 63, 2, ohne);
  assert.deepEqual(s2.palette, s.palette);
  const klein = medianschnitt(zahl, 16, 2, ohne);
  assert.ok(klein.palette.length <= 16 && klein.mittlererAbstand > s.mittlererAbstand);
});

test('Medianschnitt am Rammbock: höchstens 64 Farben mit durchsichtig, keine Palettenfarbe im Bereich des Grunds der Blätter', () => {
  const bilder = E.animationen.flatMap((a) => a.bilder.map((b) => b.leinwand));
  assert.ok(farbenZaehlen(bilder) <= 64, `${farbenZaehlen(bilder)} Farben`);
  assert.ok(E.palette.palette.length <= STANDARD.hoechstFarben);
  assert.ok(E.palette.ohneSchnitt > 0, 'Rauschen des Grunds in der Figur (Innenlinien) ohne Schnitt');
  for (const p of E.palette.palette) {
    for (const g of GRUENDE) assert.ok(farbAbstand(p, g) > STANDARD.toleranzHintergrund, `${pixelZuHex(p)} nahe am Grund ${pixelZuHex(g)}`);
  }
});

test('Medianschnitt: Helligkeit und Sättigung bleiben (keine Abdunklung), am Gehblatt des Rammbocks gemessen', () => {
  const blatt = pngDateiLesen(join(FREMD, 'rammbock', 'rammbock_b_gehen.png'));
  const fs = freistellen(blatt);
  const z = findeZellen(fs);
  const f = E.faktoren.get('rammbock_b_gehen.png')!;
  const vorher = z.zellen.map((c) => verkleinertBereinigt(schneideAus(fs, z, c), f));
  const pal = bildePalette(vorher, STANDARD, [fs.hintergrund.farbe]);
  const dl = mittel(pal.bilder, helligkeit) - mittel(vorher, helligkeit);
  const ds = mittel(pal.bilder, saettigung) - mittel(vorher, saettigung);
  assert.ok(Math.abs(dl) < 1.5, `Helligkeit ${dl.toFixed(2)}`);
  assert.ok(Math.abs(ds) < 0.02, `Sättigung ${ds.toFixed(3)}`);
});

test('Maßstab: Zielhöhe 2 × (Umrisshöhe − 5) Bildpixel, Stand des Rammbocks genau darauf, Blätter neu kalibriert', () => {
  assert.deepEqual(
    ['Rammbock', 'Figur', 'Bolzer', 'Zünder', 'Ballast'].map(zielhoeheFuer),
    [142, 142, 134, 134, 190],
  );
  assert.equal(E.zielhoehe, 142);
  const stand = E.animationen.find((a) => a.name === 'stand')!.bilder[0]!.leinwand.begrenzung()!;
  assert.equal(stand.h, 142);
  assert.ok(stand.b <= MASSSTAB * E.umriss.breite);
  // Ein Faktor je Blatt; Blatt A hat den Faktor der Figur, die übrigen ihren eigenen (Figur anders groß gezeichnet)
  assert.equal(E.faktoren.get('rammbock_a_posen.png'), E.faktor);
  assert.equal(new Set(E.faktoren.values()).size, 5);
  // Gleiche Pose auf Blatt A und D (Stand, D14) ist nach der Neukalibrierung gleich hoch
  const d14 = E.animationen.find((a) => a.name === 'aufstehen')!.bilder[5]!.leinwand.begrenzung()!;
  assert.ok(Math.abs(d14.h - 142) <= 1, `D14 ${d14.h}`);
});

test('Kontur und Bodenton am Rammbock: Außenkante dunkel und geschlossen, kein Pixel im Inneren dunkler als der dunkelste Bodenton', () => {
  const ton = dunkelsterBodenton(hintergrundblaetterLesen(AUSGABE))!;
  assert.equal(pixelZuHex(ton.farbe), '#0F1016');
  assert.match(ton.herkunft, /^hintergrund_f/);
  assert.deepEqual(E.bodenton, ton);
  const dunkel = dunkelPruefer();
  assert.ok(dunkel(E.palette.dunkelster), 'Kontur im dunkelsten Ton der Figur');
  for (const a of E.animationen) {
    a.bilder.forEach((b, i) => {
      assert.equal(konturLueckenDunkel(b.leinwand, dunkel).length, 0, `${a.name} ${i}: Kontur`);
      assert.equal(dunklerAlsBoden(b.leinwand, ton.helligkeit).length, 0, `${a.name} ${i}: Bodenton`);
    });
  }
  // Aufhellen um eine Stufe: ein zu dunkler Pixel im Inneren geht auf die nächste Palettenfarbe ab dem Bodenton
  const l = new Leinwand(5, 5);
  l.rechteck(0, 0, 5, 5, HOSE_BRAUN.treppe[2]);
  l.setze(2, 2, HOSE_BRAUN.treppe[0]);
  l.setze(0, 2, HOSE_BRAUN.treppe[0]);
  const palette = [HOSE_BRAUN.treppe[0], HOSE_BRAUN.treppe[1], HOSE_BRAUN.treppe[2]];
  const grenze = helligkeit(HOSE_BRAUN.treppe[1]);
  assert.equal(hellerAlsBoden(l, palette, grenze), 1);
  assert.equal(l.hole(2, 2), HOSE_BRAUN.treppe[1], 'eine Stufe heller');
  assert.equal(l.hole(0, 2), HOSE_BRAUN.treppe[0], 'Außenkante (Kontur) bleibt');
});

/** Gehbild 120 × 60 mit Körper (Spalten 40 bis 59, oben) und Füßen (10 breit) bei den Mitten `boden`, Figur um `versatz` verschoben. */
function gehbild(boden: readonly number[], versatz: number = 0): { leinwand: Leinwand; anker: Anker } {
  const l = new Leinwand(120, 60);
  const f = HAUT_MITTEL.treppe[2];
  l.rechteck(40 + versatz, 0, 20, 40, f);
  l.rechteck(30 + versatz, 44, 6, 6, f); // gehobener Fuß ohne Bodenkontakt (über den untersten 8 Zeilen)
  for (const m of boden) l.rechteck(m - 5 + versatz, 54, 10, 6, f);
  return { leinwand: l, anker: { x: 50 + versatz, y: 59 } };
}

test('Fußkontakt: der Standfuß wandert je Bild um die Gehstrecke zurück, Versatz der Zelle ausgeglichen, Rest gleich verteilt', () => {
  // Gang auf der Stelle, Standfuß 10 Bildpixel je Bild zurück; Übergabe in Bild 0 und 2 (Doppelstand)
  const bilder = [gehbild([45, 65]), gehbild([55], 7), gehbild([45, 65]), gehbild([55])];
  const f = fusskontaktSetzen(bilder, 10);
  assert.equal(f.rest, 0);
  for (const r of f.rutschen) assert.ok(Math.abs(r) <= 0.5, `Rutschen ${r}`);
  assert.equal(f.anker[1]!.x - f.anker[0]!.x, 7, 'Versatz der Zelle ausgeglichen');
  assert.deepEqual(f.standfuss.map((q) => q.map((x) => x + 0.5)), [[65, 62], [62, 45], [65, 55], [55, 45]]);
  // Schneller als gezeichnet: Rest 4 × 2 je Zyklus, gleichmäßig verteilt
  const g = fusskontaktSetzen(bilder, 12);
  assert.equal(g.rest, 8);
  for (const r of g.rutschen) assert.ok(Math.abs(r - 2) <= 0.5, `Rutschen ${r}`);
  // Anker im Mittel auf den Fußpunkt-Ankern
  const mitte = g.verschiebung.reduce((s, v) => s + v, 0) / g.verschiebung.length;
  assert.ok(Math.abs(mitte) <= 0.5);
});

test('Fußkontakt am Rammbock: Gehbilder verschoben, Standfuß rutscht je Bild nur um Rest / 8, Rest im Protokoll', () => {
  const gehen = E.fusskontakt.find((x) => x.animation === 'gehen')!;
  assert.equal(gehen.verschoben, true);
  assert.ok(Math.abs(gehen.strecke - 1.6 * 4 * MASSSTAB) < 1e-3, '6,4 Spielpixel bei 1,6 px/Frame (16.16 aus werte.ts)');
  for (const r of gehen.rutschen) assert.ok(Math.abs(r - gehen.rest / 8) <= 0.5 + 1e-9, `Rutschen ${r}, Rest ${gehen.rest}`);
  const schnell = E.fusskontakt.find((x) => x.animation === 'gehen_schnell')!;
  assert.equal(schnell.verschoben, false);
  assert.equal(schnell.strecke, 2 * 3 * MASSSTAB);
  assert.ok(E.befunde.some((b) => b.text.startsWith('Fußkontakt gehen:') && b.text.includes('je Zyklus')));
  // Die Anker im Atlas sind die verschobenen (gehen und seine Kopien gehen_schnell, auftritt_versteck)
  const anim = (n: string): Animation => E.animationen.find((a) => a.name === n)!;
  anim('gehen').bilder.forEach((b, i) => {
    assert.equal(anim('gehen_schnell').bilder[i]!.ankerX, b.ankerX);
    assert.equal(anim('auftritt_versteck').bilder[i]!.ankerX, b.ankerX);
  });
});

test('Anker: linker oberer Bildpixel des Fußpunkt-Spielpixels (Schnittstelle U1), Spiegelachse rechts daneben', () => {
  assert.deepEqual(atlasAnker({ x: 20, y: 141 }), { ankerX: 20, ankerY: 140 });
  assert.deepEqual(ankerAusAtlas(20, 140), { x: 20, y: 141 });
  for (const a of E.animationen) {
    for (const b of a.bilder) {
      const g = b.leinwand.begrenzung()!;
      assert.ok(b.ankerX >= 0 && b.ankerX + 1 < b.leinwand.breite && b.ankerY >= 0 && b.ankerY + 1 < b.leinwand.hoehe, `${a.name}: Anker im Bild`);
      assert.equal(b.ankerY + 1, g.y + g.h - 1, `${a.name}: unterste Zeile im Fußpunkt-Spielpixel`);
    }
  }
  // Stand: Achse (zwischen ankerX und ankerX + 1) in der Mitte der Füße (± 1 Bildpixel)
  const stand = E.animationen.find((a) => a.name === 'stand')!.bilder[0]!;
  const g = stand.leinwand.begrenzung()!;
  const band = Math.round(g.h * STANDARD.fussband);
  let links = Number.POSITIVE_INFINITY;
  let rechts = -1;
  for (let y = g.y + g.h - band; y < g.y + g.h; y++) {
    for (let x = 0; x < stand.leinwand.breite; x++) {
      if (stand.leinwand.hole(x, y) === 0) continue;
      links = Math.min(links, x);
      rechts = Math.max(rechts, x);
    }
  }
  assert.ok(Math.abs(stand.ankerX + 1 - (links + rechts + 1) / 2) <= 1);
});

test('Atlas mit "massstab": 2 auf oberster Ebene, sonst wie atlasText; Namen wie die Gliederpuppe', () => {
  const json = grokBytes(E).json;
  const atlas = JSON.parse(json) as { blatt: string; massstab: number; animationen: Record<string, unknown> };
  assert.equal(atlas.massstab, 2);
  assert.equal(atlas.blatt, 'rammbock_grok.png');
  assert.equal(json.split('\n').filter((z) => !z.includes('"massstab"')).join('\n'), atlasText(E.blatt.atlas));
  assert.equal(grokAtlasText(E.blatt.atlas, 1).split('\n')[2], '  "massstab": 1,');
  assert.equal(puppenName('rammbock_grok'), 'rammbock');
  const puppe: Animation[] = [{ name: 'stand', schleife: true, bilder: [{ leinwand: new Leinwand(1, 1), ankerX: 0, ankerY: 0, dauer: 0 }] }];
  assert.deepEqual(grokGegenPuppe(puppe, puppe), []);
  const anders: Animation[] = [{ name: 'stand', schleife: false, bilder: [{ leinwand: new Leinwand(1, 1), ankerX: 0, ankerY: 0, dauer: 4 }] }];
  assert.equal(grokGegenPuppe(anders, puppe).length, 2);
});

test('blaetter.json: alphabetisch, ohne Endung, ohne Doppel; neuerer Ordner derselben Figur gewinnt (datum, dann Ordnername)', () => {
  const text = blaetterText(['vela', 'rammbock_grok', 'anzeige', 'vela']);
  assert.equal(text, '[\n  "anzeige",\n  "rammbock_grok",\n  "vela"\n]\n');
  assert.deepEqual(JSON.parse(text), ['anzeige', 'rammbock_grok', 'vela']);
  const wurzel = mkdtempSync(join(tmpdir(), 'grok-ordner-'));
  try {
    const ordner = (name: string, figur: string, datum: string): void => {
      mkdirSync(join(wurzel, name));
      writeFileSync(join(wurzel, name, 'zuordnung.txt'), `figur ${figur}\n${datum === '' ? '' : `datum ${datum}\n`}zielhoehe 142\nmassstab a.png 1\n`);
    };
    ordner('rammbock', 'rammbock_grok', '2026-10-03');
    ordner('rammbock_34', 'rammbock_grok', '2026-10-05');
    ordner('vela', 'vela_grok', '2026-10-04');
    ordner('vela_b', 'vela_grok', '2026-10-04');
    ordner('zuender', 'zuender_grok', '');
    const wahl = grokOrdner(['rammbock', 'rammbock_34', 'vela', 'vela_b', 'zuender'], wurzel);
    assert.deepEqual(wahl.map((o) => `${o.figur} ← ${o.ordner} (${o.ersetzt.join(',')})`), [
      'rammbock_grok ← rammbock_34 (rammbock)',
      'vela_grok ← vela_b (vela)',
      'zuender_grok ← zuender ()',
    ]);
  } finally {
    rmSync(wurzel, { recursive: true, force: true });
  }
});

test('Determinismus: gleicher Medianschnitt aus denselben Bildern, gleiches Blatt aus einem zweiten Lauf über die Bytes', () => {
  const bilder = E.animationen.slice(0, 3).flatMap((a) => a.bilder.map((b) => b.leinwand));
  const a = medianschnitt(farbHaeufigkeit(bilder), 16);
  const b = medianschnitt(farbHaeufigkeit([...bilder].reverse()), 16);
  assert.deepEqual(a.palette, b.palette);
  const datei = readFileSync(join(AUSGABE, 'rammbock_grok.json'), 'utf8');
  assert.equal(datei, grokBytes(E).json, 'Atlas auf Stand (npm run grafik)');
});
