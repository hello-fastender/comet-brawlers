// Hintergründe der Abschnitte A, B, F mit Himmel, Vordergrund und Blendenkante (Auftrag 4,
// Phase 2, G5; Aufbau und Atlasformat in docs/grafik.md 4.8). Baut die drei Abschnitte
// (a_landedeck.ts, b_haendlergasse.ts, f_asservatenkammer.ts), packt je Abschnitt ein Blatt
// mit Atlas (blatt_hg.ts), prüft Farbbudget, Palette, Bodenfarben gegen die Figuren, Lagen
// gegen scheibe.txt und das Band (Befunde), und liefert Blätter, Atlanten und Kontaktbögen
// als Erzeugnisse an bauen.ts.

import type { Befund } from '../bauen.ts';
import type { Erzeugnis } from '../erzeugnis.ts';
import type { Pixel } from '../leinwand.ts';
import { DURCHSICHTIG, deckend } from '../leinwand.ts';
import {
  FARBBUDGET,
  HINTERGRUND_MATERIALIEN,
  HINTERGRUND_MATERIALIEN_G5,
  KONTUR,
  LEUCHTTOENE,
  MATERIALIEN,
  SCHATTEN_BLAU,
} from '../palette.ts';
import { pngSchreiben } from '../png.ts';
import { landedeck } from './a_landedeck.ts';
import { haendlergasse } from './b_haendlergasse.ts';
import type { AbschnittGrafik, GepacktesHintergrundBlatt } from './blatt_hg.ts';
import { hintergrundBytes, hintergrundPacken } from './blatt_hg.ts';
import { blendeBlatt } from './blende.ts';
import { asservatenkammer } from './f_asservatenkammer.ts';
import { kontaktBlende, kontaktKacheln, kontaktPanorama } from './kontakt_hg.ts';
import { BILD_HOEHE, DECKKRAFT_VORDERGRUND, KACHEL, PARALLAX_HIMMEL, scheibe } from './lage.ts';
import { BLENDE_ZU } from '../../../src/kern/werte.ts';

/** Ein gebauter Abschnitt: Grafik, Blatt mit Atlas, Name des Blatts. */
export interface HintergrundAbschnitt {
  readonly name: string;
  readonly grafik: AbschnittGrafik;
  readonly blatt: GepacktesHintergrundBlatt;
}

let zwischen: HintergrundAbschnitt[] | null = null;

/** Die drei Abschnitte gebaut und gepackt (einmal je Lauf; deterministisch). */
export function hintergrundAbschnitte(): HintergrundAbschnitt[] {
  if (zwischen === null) {
    zwischen = [
      ['hintergrund_a', landedeck()],
      ['hintergrund_b', haendlergasse()],
      ['hintergrund_f', asservatenkammer()],
    ].map(([name, grafik]) => ({ name: name as string, grafik: grafik as AbschnittGrafik, blatt: hintergrundPacken(name as string, grafik as AbschnittGrafik) }));
  }
  return zwischen;
}

/** Farben, die ein Hintergrund verwenden darf: Treppen der Hintergrundmaterialien und Leuchttöne. */
export function hintergrundPalette(): Set<Pixel> {
  const s = new Set<Pixel>([DURCHSICHTIG]);
  for (const m of [...Object.values(HINTERGRUND_MATERIALIEN), ...Object.values(HINTERGRUND_MATERIALIEN_G5)]) for (const p of m.treppe) s.add(p);
  for (const p of Object.values(LEUCHTTOENE)) s.add(p);
  return s;
}

/** Farben der Figuren (Auftrag 4, 1.2: Prüfung gegen die Treppen der Figurmaterialien; dazu Kontur, Schatten, Leuchttöne). */
export function figurenFarben(): Set<Pixel> {
  const s = new Set<Pixel>([KONTUR, SCHATTEN_BLAU]);
  for (const m of Object.values(MATERIALIEN)) for (const p of m.treppe) s.add(p);
  for (const p of Object.values(LEUCHTTOENE)) s.add(p);
  return s;
}

/** Alle Farben der Bodenkacheln eines Blatts (ohne durchsichtig). */
export function bodenFarben(b: GepacktesHintergrundBlatt): Set<Pixel> {
  const s = new Set<Pixel>();
  for (const k of b.atlas.karten) {
    if (k.ebene !== 'boden') continue;
    for (const r of k.kacheln) {
      for (const nr of r) {
        if (nr < 0) continue;
        const [bx, by] = b.atlas.kacheln[nr] as [number, number];
        for (let y = 0; y < KACHEL; y++) {
          for (let x = 0; x < KACHEL; x++) {
            const p = b.leinwand.hole(bx + x, by + y);
            if (deckend(p)) s.add(p);
          }
        }
      }
    }
  }
  return s;
}

/** Prüft einen Abschnitt (docs/grafik.md 4.8, „Prüfungen“) und gibt die Befunde zurück. */
export function hintergrundPruefen(h: HintergrundAbschnitt): Befund[] {
  const befunde: Befund[] = [];
  const melde = (animation: string, regel: string, text: string): void => {
    befunde.push({ figur: h.name, animation, bild: -1, regel, text });
  };
  const { blatt, grafik } = h;
  const a = grafik.abschnitt;
  const stage = scheibe();
  // Farbbudget (Auftrag 4, 1.2: höchstens 48 je Abschnitt, einschließlich durchsichtig)
  const farben = new Set<Pixel>(blatt.leinwand.daten);
  farben.add(DURCHSICHTIG);
  if (farben.size > FARBBUDGET.hintergrund) melde('alle', 'Farbzählung', `${farben.size} Farben, erlaubt ${FARBBUDGET.hintergrund}`);
  // nur Farben aus palette.ts (Hintergrundtreppen und Leuchttöne)
  const erlaubt = hintergrundPalette();
  const fremd = [...farben].filter((p) => !erlaubt.has(p));
  if (fremd.length > 0) melde('alle', 'Palette', `${fremd.length} Farben nicht aus den Hintergrundtreppen, erste ${(fremd[0] as number).toString(16)}`);
  // kein Bodenton in einer Figurenpalette (Auftrag 4, 1.2)
  const figur = figurenFarben();
  const gleich = [...bodenFarben(blatt)].filter((p) => figur.has(p));
  if (gleich.length > 0) melde('boden', 'Bodenfarbe', `${gleich.length} Bodentöne kommen in Figurenpaletten vor`);
  // Karten: Lage, Parallaxe, Deckkraft
  for (const k of blatt.atlas.karten) {
    const soll = k.ebene === 'himmel' ? PARALLAX_HIMMEL : 1;
    if (k.parallax !== soll) melde(k.ebene, 'Lage', `Parallaxe ${k.parallax}, soll ${soll}`);
    if (k.x !== a.x0) melde(k.ebene, 'Lage', `Karte beginnt bei x ${k.x}, Abschnitt bei ${a.x0}`);
    if ((k.y + a.ky) % KACHEL !== 0) melde(k.ebene, 'Lage', `Karte nicht auf dem Kachelraster (y ${k.y})`);
  }
  // freie Bilder: Lage nach scheibe.txt
  for (const f of blatt.atlas.bilder) {
    const hg = stage.hintergrund.find((s) => s.bild === f.name);
    const vg = stage.vordergrund.find((s) => s.id === f.name);
    if (hg !== undefined && (f.x !== hg.x0 || f.b !== hg.x1 - hg.x0 || f.ebene !== 'wand')) melde(f.name, 'Lage', `x ${f.x}, b ${f.b}, Ebene ${f.ebene}; Satz hintergrund ${hg.x0}–${hg.x1}`);
    if (vg !== undefined) {
      if (f.x !== vg.x0 || f.b !== vg.x1 - vg.x0 || f.h !== vg.zeilen || f.y + a.ky !== BILD_HOEHE - vg.zeilen) melde(f.name, 'Lage', `x ${f.x}, y ${f.y}, ${f.b} × ${f.h}; Satz vordergrund ${vg.x0}–${vg.x1}, ${vg.zeilen} Zeilen`);
      if (f.ebene !== 'vordergrund' || f.deckkraft !== DECKKRAFT_VORDERGRUND) melde(f.name, 'Lage', `Ebene ${f.ebene}, Deckkraft ${f.deckkraft}`);
    }
  }
  // Band: Boden genau ab der Bandoberkante, Wand genau darüber (Figuren stehen auf dem Boden)
  const wand = grafik.karten.find((k) => k.ebene === 'wand');
  const boden = grafik.karten.find((k) => k.ebene === 'boden');
  if (wand === undefined || boden === undefined) melde('alle', 'Band', 'Karte wand oder boden fehlt');
  else {
    for (let c = 0; c < a.breite; c++) {
      const kante = a.kante[c] as number;
      const unten = Math.min(BILD_HOEHE, a.unten[c] as number);
      for (let y = 0; y < BILD_HOEHE; y++) {
        const imBand = y >= kante && y < unten;
        const b = deckend(boden.leinwand.hole(c, y - boden.zeile0));
        const w = deckend(wand.leinwand.hole(c, y - wand.zeile0));
        if (imBand !== b || (imBand && w)) {
          melde('boden', 'Band', `Spalte ${c} (x ${a.x0 + c}), Zeile ${y}: Boden ${b ? 'gezeichnet' : 'leer'}, Wand ${w ? 'gezeichnet' : 'leer'}, im Band ${imBand}`);
          return befunde;
        }
      }
    }
  }
  return befunde;
}

/** Stufen der Blende im Kontaktbogen: ein Viertel, die Hälfte und drei Viertel von BLENDE_ZU. */
const BLENDE_STUFEN = [BLENDE_ZU / 4, BLENDE_ZU / 2, (3 * BLENDE_ZU) / 4].map(Math.round);

/** Kamera-x des Schnitts (Bild am Ende von B, dort beginnt die Blende; Welt 3, KA13). */
function schnittKamera(): number {
  return scheibe().schnitte[0]?.kamera_x ?? 0;
}

/** Hintergründe der Abschnitte A, B, F mit Himmel, Vordergrund und Blendenkante für bauen.ts. */
export function hintergrundErzeugnisse(): Erzeugnis[] {
  const abschnitte = hintergrundAbschnitte();
  const blaetter = abschnitte.map((h) => h.blatt);
  const aus: Erzeugnis[] = abschnitte.map((h) => {
    const bytes = hintergrundBytes(h.blatt);
    const id = h.grafik.abschnitt.id.toLowerCase();
    const farben = new Set<Pixel>(h.blatt.leinwand.daten);
    farben.add(DURCHSICHTIG);
    return {
      name: h.name,
      ausgabe: new Map<string, Uint8Array | string>([
        [`${h.name}.png`, bytes.png],
        [`${h.name}.json`, bytes.json],
      ]),
      bilder: new Map<string, Uint8Array>([
        [`kontakt_hintergrund_${id}.png`, pngSchreiben(kontaktPanorama(blaetter, h.blatt, h.grafik.abschnitt, farben.size))],
        [`kontakt_hintergrund_${id}_kacheln.png`, pngSchreiben(kontaktKacheln(h.blatt, h.grafik.abschnitt))],
      ]),
      befunde: hintergrundPruefen(h),
    };
  });
  const blende = blendeBlatt();
  const b = abschnitte.find((h) => h.grafik.abschnitt.id === 'B');
  aus.push({
    name: 'hintergrund_blende',
    ausgabe: new Map<string, Uint8Array | string>([
      ['hintergrund_blende.png', blende.png],
      ['hintergrund_blende.json', blende.json],
    ]),
    bilder: new Map<string, Uint8Array>([['kontakt_hintergrund_blende.png', pngSchreiben(kontaktBlende(blaetter, schnittKamera(), b?.grafik.abschnitt.ky ?? 0, BLENDE_STUFEN))]]),
    befunde: [],
  });
  return aus;
}
