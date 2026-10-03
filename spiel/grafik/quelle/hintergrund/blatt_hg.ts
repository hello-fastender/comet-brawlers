// Blatt und Atlas der Hintergründe (Auftrag 4, 1.6 und 2.2; G5; Format in docs/grafik.md
// 4.8): Jede Ebene eines Abschnitts wird ganz gezeichnet, in Kacheln 16 × 16 geschnitten
// (gleiche Kacheln liegen nur einmal im Blatt, leere entfallen) und als Kachelkarte mit
// Welt-x und Welt-y abgelegt; freie Bilder (Frachtcontainer, Funkladen, Dampf, Kabelrollen)
// stehen mit Name, Ebene, Folge und Lage einzeln im Atlas. Packen in fester Reihenfolge,
// also gleiche Bytes bei gleichem Inhalt.

import { Leinwand, deckend } from '../leinwand.ts';
import { mischen } from '../farbe.ts';
import { pngSchreiben } from '../png.ts';
import { BLATT_MAX } from '../blatt.ts';
import type { Abschnitt } from './lage.ts';
import { KACHEL, fugenTiefen } from './lage.ts';

/** Ebenen in Zeichenreihenfolge (Auftrag 4, 1.6). Vordergrund nach den Figuren. */
export type Ebene = 'himmel' | 'wand' | 'boden' | 'vordergrund';
export const EBENEN: readonly Ebene[] = ['himmel', 'wand', 'boden', 'vordergrund'];

/** Eine ganz gezeichnete Ebene, die in Kacheln geschnitten wird. */
export interface KartenQuelle {
  readonly ebene: Ebene;
  /** Name (z. B. der Bildname aus scheibe.txt, wenn die Karte ihn ganz abdeckt). */
  readonly name: string;
  /** 1 = mit der Kamera, 0,5 = Himmel (Auftrag 4, 1.6). */
  readonly parallax: number;
  readonly deckkraft: number;
  /** Welt-x der Spalte 0 (Himmel: Himmels-x, Bildschirm-x = x − ⌊K · parallax⌋). */
  readonly x: number;
  /** Abschnittszeile der Zeile 0 (Vielfaches von 16). */
  readonly zeile0: number;
  readonly leinwand: Leinwand;
}

/** Ein freies Bild (statisch oder als Folge gleich großer Bilder). */
export interface FreiesBild {
  readonly name: string;
  readonly ebene: Ebene;
  /** Reihenfolge innerhalb der Ebene über alle Blätter (aufsteigend, nach den Karten). */
  readonly folge: number;
  readonly parallax: number;
  readonly deckkraft: number;
  /** Welt-x und Abschnittszeile der linken oberen Ecke. */
  readonly x: number;
  readonly zeile: number;
  readonly bilder: readonly Leinwand[];
  /** Frames je Bild (0 = statisch). */
  readonly dauer: number;
}

/** Alle Ebenen eines Abschnitts. */
export interface AbschnittGrafik {
  readonly abschnitt: Abschnitt;
  readonly karten: readonly KartenQuelle[];
  readonly bilder: readonly FreiesBild[];
}

/** Atlas: Kachelkarte einer Ebene. */
export interface AtlasKarte {
  readonly ebene: Ebene;
  readonly name: string;
  readonly parallax: number;
  readonly deckkraft: number;
  readonly x: number;
  readonly y: number;
  readonly spalten: number;
  readonly zeilen: number;
  /** Kachelnummer je Zelle, zeilenweise; −1 = leer. */
  readonly kacheln: readonly (readonly number[])[];
}

/** Atlas: freies Bild. */
export interface AtlasFreiesBild {
  readonly name: string;
  readonly ebene: Ebene;
  readonly folge: number;
  readonly parallax: number;
  readonly deckkraft: number;
  readonly x: number;
  readonly y: number;
  readonly b: number;
  readonly h: number;
  readonly dauer: number;
  /** Lage jedes Bildes der Folge im Blatt. */
  readonly bilder: readonly { readonly x: number; readonly y: number }[];
}

/** Atlas eines Hintergrundblatts (docs/grafik.md 4.8). */
export interface HintergrundAtlas {
  readonly blatt: string;
  readonly abschnitt: string;
  readonly name: string;
  readonly welt: { readonly x0: number; readonly x1: number };
  readonly kameraY: number;
  /** Band in Tiefe z und Welt-y (Oberkante = erste Bodenzeile, Unterkante = z unten). */
  readonly band: { readonly oben: number; readonly unten: number; readonly kanteY: number; readonly untenY: number };
  /** Tiefen z der Plattenfugen. */
  readonly fugen: readonly number[];
  readonly kachel: number;
  /** Lage jeder Kachel im Blatt (Index = Kachelnummer). */
  readonly kacheln: readonly (readonly [number, number])[];
  readonly karten: readonly AtlasKarte[];
  readonly bilder: readonly AtlasFreiesBild[];
}

export interface GepacktesHintergrundBlatt {
  readonly leinwand: Leinwand;
  readonly atlas: HintergrundAtlas;
}

/** Kacheln je Zeile im Blatt und Abstand zwischen Bildern (1 px wie blatt.ts). */
const KACHELN_JE_ZEILE = 32;
const ABSTAND = 1;
const RASTER = KACHEL + ABSTAND;

/** Schlüssel einer Kachel für das Zusammenlegen gleicher Kacheln. */
function kachelSchluessel(l: Leinwand, x: number, y: number): string | null {
  const werte: number[] = [];
  let leer = true;
  for (let yy = 0; yy < KACHEL; yy++) {
    for (let xx = 0; xx < KACHEL; xx++) {
      const p = l.hole(x + xx, y + yy);
      if (deckend(p)) leer = false;
      werte.push(p);
    }
  }
  return leer ? null : werte.join(',');
}

/** Packt die Grafik eines Abschnitts in ein Blatt `${name}.png` mit Atlas. */
export function hintergrundPacken(name: string, g: AbschnittGrafik): GepacktesHintergrundBlatt {
  const a = g.abschnitt;
  const schluessel = new Map<string, number>();
  const kachelQuellen: { l: Leinwand; x: number; y: number }[] = [];
  const karten: AtlasKarte[] = [];
  for (const k of g.karten) {
    if (k.zeile0 % KACHEL !== 0) throw new Error(`Hintergrund ${name}: Karte ${k.ebene} beginnt nicht auf dem Kachelraster (${k.zeile0})`);
    const spalten = Math.ceil(k.leinwand.breite / KACHEL);
    const zeilenAlle = Math.ceil(k.leinwand.hoehe / KACHEL);
    const zellen: number[][] = [];
    for (let r = 0; r < zeilenAlle; r++) {
      const zeile: number[] = [];
      for (let s = 0; s < spalten; s++) {
        const key = kachelSchluessel(k.leinwand, s * KACHEL, r * KACHEL);
        if (key === null) {
          zeile.push(-1);
          continue;
        }
        let nr = schluessel.get(key);
        if (nr === undefined) {
          nr = kachelQuellen.length;
          schluessel.set(key, nr);
          kachelQuellen.push({ l: k.leinwand, x: s * KACHEL, y: r * KACHEL });
        }
        zeile.push(nr);
      }
      zellen.push(zeile);
    }
    // leere Zeilen oben und unten weglassen
    let oben = 0;
    while (oben < zellen.length && (zellen[oben] as number[]).every((n) => n < 0)) oben++;
    let unten = zellen.length;
    while (unten > oben && (zellen[unten - 1] as number[]).every((n) => n < 0)) unten--;
    karten.push({
      ebene: k.ebene,
      name: k.name,
      parallax: k.parallax,
      deckkraft: k.deckkraft,
      x: k.x,
      y: k.zeile0 + oben * KACHEL - a.ky,
      spalten,
      zeilen: unten - oben,
      kacheln: zellen.slice(oben, unten),
    });
  }
  // Lagen im Blatt: Kacheln im Raster, darunter die freien Bilder in Reihen
  const kachelLagen: [number, number][] = kachelQuellen.map((_, i) => [ABSTAND + (i % KACHELN_JE_ZEILE) * RASTER, ABSTAND + Math.floor(i / KACHELN_JE_ZEILE) * RASTER]);
  const kachelZeilen = Math.ceil(kachelQuellen.length / KACHELN_JE_ZEILE);
  let breite = ABSTAND + Math.min(kachelQuellen.length, KACHELN_JE_ZEILE) * RASTER;
  const maxBreite = Math.max(breite, ...g.bilder.flatMap((b) => b.bilder.map((l) => l.breite + 2 * ABSTAND)));
  let y = ABSTAND + kachelZeilen * RASTER;
  let x = ABSTAND;
  let zeilenHoehe = 0;
  const bildLagen: { x: number; y: number; l: Leinwand }[][] = [];
  for (const b of g.bilder) {
    const lagen: { x: number; y: number; l: Leinwand }[] = [];
    for (const l of b.bilder) {
      if (x + l.breite + ABSTAND > maxBreite && x > ABSTAND) {
        y += zeilenHoehe + ABSTAND;
        x = ABSTAND;
        zeilenHoehe = 0;
      }
      lagen.push({ x, y, l });
      x += l.breite + ABSTAND;
      zeilenHoehe = Math.max(zeilenHoehe, l.hoehe);
      breite = Math.max(breite, x);
    }
    bildLagen.push(lagen);
  }
  const hoehe = y + zeilenHoehe + ABSTAND;
  if (breite > BLATT_MAX || hoehe > BLATT_MAX) throw new Error(`Hintergrund ${name}: Blatt ${breite} × ${hoehe} größer als ${BLATT_MAX}`);
  const blatt = new Leinwand(Math.max(1, breite), Math.max(1, hoehe));
  kachelQuellen.forEach((q, i) => {
    const [bx, by] = kachelLagen[i] as [number, number];
    blatt.einsetzen(q.l.ausschnitt(q.x, q.y, KACHEL, KACHEL), bx, by);
  });
  const bilder: AtlasFreiesBild[] = g.bilder.map((b, i) => {
    const lagen = bildLagen[i] as { x: number; y: number; l: Leinwand }[];
    for (const q of lagen) blatt.einsetzen(q.l, q.x, q.y);
    const erstes = b.bilder[0] as Leinwand;
    if (b.bilder.some((l) => l.breite !== erstes.breite || l.hoehe !== erstes.hoehe)) throw new Error(`Hintergrund ${name}: Bilder von ${b.name} ungleich groß`);
    return {
      name: b.name,
      ebene: b.ebene,
      folge: b.folge,
      parallax: b.parallax,
      deckkraft: b.deckkraft,
      x: b.x,
      y: b.zeile - a.ky,
      b: erstes.breite,
      h: erstes.hoehe,
      dauer: b.dauer,
      bilder: lagen.map((q) => ({ x: q.x, y: q.y })),
    };
  });
  return {
    leinwand: blatt,
    atlas: {
      blatt: `${name}.png`,
      abschnitt: a.id,
      name: a.name,
      welt: { x0: a.x0, x1: a.x1 },
      kameraY: a.ky,
      band: { oben: a.zOben, unten: a.zUnten, kanteY: a.kanteMin - a.ky, untenY: (a.unten[0] as number) - a.ky },
      fugen: fugenTiefen(a),
      kachel: KACHEL,
      kacheln: kachelLagen,
      karten,
      bilder,
    },
  };
}

/** Zahl als JSON (ganze Zahlen ohne Nachkomma, 0,85 als 0.85). */
function zahl(n: number): string {
  return JSON.stringify(n);
}

/** Atlas als JSON-Text: feste Reihenfolge der Schlüssel, je Kachelzeile bzw. Bild eine Zeile. */
export function hintergrundAtlasText(atlas: HintergrundAtlas): string {
  const z: string[] = ['{'];
  z.push(`  "blatt": ${JSON.stringify(atlas.blatt)},`);
  z.push(`  "abschnitt": ${JSON.stringify(atlas.abschnitt)},`);
  z.push(`  "name": ${JSON.stringify(atlas.name)},`);
  z.push(`  "welt": { "x0": ${atlas.welt.x0}, "x1": ${atlas.welt.x1} },`);
  z.push(`  "kameraY": ${atlas.kameraY},`);
  z.push(`  "band": { "oben": ${atlas.band.oben}, "unten": ${atlas.band.unten}, "kanteY": ${atlas.band.kanteY}, "untenY": ${atlas.band.untenY} },`);
  z.push(`  "fugen": [${atlas.fugen.join(', ')}],`);
  z.push(`  "kachel": ${atlas.kachel},`);
  z.push('  "kacheln": [');
  for (let i = 0; i < atlas.kacheln.length; i += 8) {
    const teil = atlas.kacheln.slice(i, i + 8).map((k) => `[${k[0]}, ${k[1]}]`).join(', ');
    z.push(`    ${teil}${i + 8 < atlas.kacheln.length ? ',' : ''}`);
  }
  z.push('  ],');
  z.push('  "karten": [');
  atlas.karten.forEach((k, i) => {
    z.push('    {');
    z.push(`      "ebene": ${JSON.stringify(k.ebene)}, "name": ${JSON.stringify(k.name)}, "parallax": ${zahl(k.parallax)}, "deckkraft": ${zahl(k.deckkraft)},`);
    z.push(`      "x": ${k.x}, "y": ${k.y}, "spalten": ${k.spalten}, "zeilen": ${k.zeilen},`);
    z.push('      "kacheln": [');
    k.kacheln.forEach((r, j) => z.push(`        [${r.join(', ')}]${j < k.kacheln.length - 1 ? ',' : ''}`));
    z.push('      ]');
    z.push(`    }${i < atlas.karten.length - 1 ? ',' : ''}`);
  });
  z.push('  ],');
  z.push('  "bilder": [');
  atlas.bilder.forEach((b, i) => {
    const lagen = b.bilder.map((q) => `{ "x": ${q.x}, "y": ${q.y} }`).join(', ');
    z.push(
      `    { "name": ${JSON.stringify(b.name)}, "ebene": ${JSON.stringify(b.ebene)}, "folge": ${b.folge}, "parallax": ${zahl(b.parallax)}, "deckkraft": ${zahl(b.deckkraft)}, ` +
        `"x": ${b.x}, "y": ${b.y}, "b": ${b.b}, "h": ${b.h}, "dauer": ${b.dauer}, "bilder": [${lagen}] }${i < atlas.bilder.length - 1 ? ',' : ''}`,
    );
  });
  z.push('  ]');
  z.push('}');
  return z.join('\n') + '\n';
}

/** PNG und Atlas-Text eines gepackten Hintergrundblatts. */
export function hintergrundBytes(b: GepacktesHintergrundBlatt): { png: Uint8Array; json: string } {
  return { png: pngSchreiben(b.leinwand), json: hintergrundAtlasText(b.atlas) };
}

/** Setzt ein Bild mit fester Deckkraft (Mischung mit dem Darunter, wie globalAlpha). */
function einsetzenDeckkraft(ziel: Leinwand, quelle: Leinwand, x: number, y: number, deckkraft: number): void {
  if (deckkraft >= 1) {
    ziel.einsetzen(quelle, x, y);
    return;
  }
  for (let qy = 0; qy < quelle.hoehe; qy++) {
    for (let qx = 0; qx < quelle.breite; qx++) {
      const p = quelle.hole(qx, qy);
      if (!deckend(p) || !ziel.drin(x + qx, y + qy)) continue;
      const unter = ziel.hole(x + qx, y + qy);
      ziel.setze(x + qx, y + qy, deckend(unter) ? mischen(unter, p, deckkraft) : p);
    }
  }
}

/**
 * Setzt aus Blatt und Atlas zusammen, was die Darstellung bei Kamera (K, Ky) zeichnen
 * würde, in eine Leinwand, deren Spalte 0 die Welt-x `links` ist (Bildschirm: links = K).
 * Reihenfolge wie in docs/grafik.md 4.8: je Ebene erst die Karten, dann die freien
 * Bilder nach Folge; Vordergrund mit seiner Deckkraft (gemischt).
 */
export function zusammensetzen(
  blaetter: readonly GepacktesHintergrundBlatt[],
  ziel: Leinwand,
  k: number,
  ky: number,
  links: number,
  ebenen: readonly Ebene[] = EBENEN,
  frame: number = 0,
): void {
  for (const ebene of ebenen) {
    for (const b of blaetter) {
      for (const karte of b.atlas.karten) {
        if (karte.ebene !== ebene) continue;
        const ox = karte.x - Math.floor(k * karte.parallax) + k - links;
        const oy = karte.y + ky;
        karte.kacheln.forEach((r, j) =>
          r.forEach((nr, s) => {
            if (nr < 0) return;
            const [bx, by] = b.atlas.kacheln[nr] as [number, number];
            einsetzenDeckkraft(ziel, b.leinwand.ausschnitt(bx, by, KACHEL, KACHEL), ox + s * KACHEL, oy + j * KACHEL, karte.deckkraft);
          }),
        );
      }
    }
    const frei = blaetter.flatMap((b, bi) => b.atlas.bilder.filter((f) => f.ebene === ebene).map((f, fi) => ({ b, f, bi, fi })));
    frei.sort((p, q) => p.f.folge - q.f.folge || p.bi - q.bi || p.fi - q.fi);
    for (const { b, f } of frei) {
      const n = f.bilder.length;
      const i = f.dauer > 0 ? Math.floor(frame / f.dauer) % n : 0;
      const q = f.bilder[i] as { x: number; y: number };
      einsetzenDeckkraft(ziel, b.leinwand.ausschnitt(q.x, q.y, f.b, f.h), f.x - Math.floor(k * f.parallax) + k - links, f.y + ky, f.deckkraft);
    }
  }
}
