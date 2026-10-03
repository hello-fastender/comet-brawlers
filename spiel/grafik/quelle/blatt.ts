// Sprite-Blätter und Atlas (Auftrag 4, 2.2 und 2.3): packt die Bilder der
// Animationen einer Figur in ein Blatt (höchstens 2048 × 2048) und schreibt
// den Atlas als JSON gleichen Namens. Packen: je Animation eine neue Zeile
// (lesbar beim Ansehen des Blatts), umbrechen bei maxBreite; jedes Bild wird
// auf seine deckenden Pixel zugeschnitten, der Anker wandert mit; gleiche
// Bilder liegen nur einmal im Blatt. Reihenfolge fest, also gleiche Bytes
// bei gleichem Inhalt.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Leinwand } from './leinwand.ts';
import { md5, pngSchreiben } from './png.ts';

/** Ein Bild einer Animation: Pixel, Anker (Fußpunkt) im Bild, Richtwert der Dauer in Frames. */
export interface Bild {
  readonly leinwand: Leinwand;
  /** Fußpunkt: Pixel (ankerX, ankerY) liegt auf der Bildschirmposition der Entität (Auftrag 4, 2.3). */
  readonly ankerX: number;
  readonly ankerY: number;
  /** Richtwert in Frames; 0 = statisch (Auftrag 4, 2.3). */
  readonly dauer: number;
}

/** Eine Animation, nach rechts gerichtet gezeichnet (Blick links spiegelt die Darstellung um den Anker). */
export interface Animation {
  readonly name: string;
  readonly schleife: boolean;
  readonly bilder: readonly Bild[];
  /** Indizes der Bilder in den aktiven Frames der Logik (nur Angriffe; Auftrag 4, 2.3). */
  readonly aktiv?: readonly number[];
  /**
   * true: Die Animation setzt beim Packen die Zeile der vorigen fort, statt eine neue zu
   * beginnen (umbrochen wird weiter bei maxBreite). Ergänzung G1 (Phase 2) für Figuren mit
   * vielen Animationen, deren Blatt sonst höher als BLATT_MAX würde; ohne das Feld bleibt
   * das Packen wie bisher (docs/grafik.md 7, G1-8).
   */
  readonly zeileFortsetzen?: boolean;
}

/** Eintrag eines Bildes im Atlas (Auftrag 4, 2.3). */
export interface AtlasBild {
  readonly x: number;
  readonly y: number;
  readonly b: number;
  readonly h: number;
  readonly ankerX: number;
  readonly ankerY: number;
  readonly dauer: number;
}

export interface AtlasAnimation {
  readonly schleife: boolean;
  readonly bilder: readonly AtlasBild[];
  readonly aktiv?: readonly number[];
}

/** Atlas eines Blatts (Auftrag 4, 2.3). */
export interface Atlas {
  readonly blatt: string;
  readonly animationen: Readonly<Record<string, AtlasAnimation>>;
}

export interface GepacktesBlatt {
  readonly leinwand: Leinwand;
  readonly atlas: Atlas;
}

export interface PackOptionen {
  /** größte Breite des Blatts (Vorgabe 1024, höchstens BLATT_MAX) */
  readonly maxBreite?: number;
  /** Abstand zwischen Bildern und zum Rand in px (Vorgabe 1) */
  readonly abstand?: number;
}

/** Größte Kantenlänge eines Blatts (Auftrag 4, 2.2). */
export const BLATT_MAX = 2048;
/** Vorgabe der Blattbreite: halbe Höchstbreite, damit Blätter handlich bleiben (Festlegung G0). */
const BREITE_VORGABE = BLATT_MAX / 2;

/** Bild auf seine deckenden Pixel zugeschnitten, Anker angepasst (leeres Bild: 1 × 1 durchsichtig). */
export function zugeschnitten(bild: Bild): Bild {
  const g = bild.leinwand.begrenzung();
  if (g === null) return { leinwand: new Leinwand(1, 1), ankerX: bild.ankerX, ankerY: bild.ankerY, dauer: bild.dauer };
  if (g.x === 0 && g.y === 0 && g.b === bild.leinwand.breite && g.h === bild.leinwand.hoehe) return bild;
  return {
    leinwand: bild.leinwand.ausschnitt(g.x, g.y, g.b, g.h),
    ankerX: bild.ankerX - g.x,
    ankerY: bild.ankerY - g.y,
    dauer: bild.dauer,
  };
}

/** Packt die Animationen in ein Blatt namens `${name}.png` mit Atlas. */
export function blattPacken(name: string, animationen: readonly Animation[], optionen: PackOptionen = {}): GepacktesBlatt {
  const maxBreite = Math.min(optionen.maxBreite ?? BREITE_VORGABE, BLATT_MAX);
  const abstand = optionen.abstand ?? 1;
  type Platz = { x: number; y: number; bild: Bild };
  const plaetze: Platz[] = [];
  const atlasAnim: Record<string, AtlasAnimation> = {};
  let x = abstand;
  let y = abstand;
  let zeilenHoehe = 0;
  let breite = 0;
  const namen = new Set<string>();
  for (const anim of animationen) {
    if (namen.has(anim.name)) throw new Error(`Blatt ${name}: Animation ${anim.name} doppelt`);
    namen.add(anim.name);
    // neue Zeile je Animation (außer zeileFortsetzen)
    if (zeilenHoehe > 0 && anim.zeileFortsetzen !== true) {
      y += zeilenHoehe + abstand;
      x = abstand;
      zeilenHoehe = 0;
    }
    const eintraege: AtlasBild[] = [];
    for (const roh of anim.bilder) {
      const bild = zugeschnitten(roh);
      const l = bild.leinwand;
      let platz = plaetze.find((p) => p.bild.leinwand.gleich(l) && p.bild.ankerX === bild.ankerX && p.bild.ankerY === bild.ankerY);
      if (platz === undefined) {
        if (x + l.breite + abstand > maxBreite && x > abstand) {
          y += zeilenHoehe + abstand;
          x = abstand;
          zeilenHoehe = 0;
        }
        platz = { x, y, bild };
        plaetze.push(platz);
        x += l.breite + abstand;
        zeilenHoehe = Math.max(zeilenHoehe, l.hoehe);
        breite = Math.max(breite, x);
      }
      eintraege.push({ x: platz.x, y: platz.y, b: l.breite, h: l.hoehe, ankerX: bild.ankerX, ankerY: bild.ankerY, dauer: bild.dauer });
    }
    atlasAnim[anim.name] = anim.aktiv !== undefined ? { schleife: anim.schleife, bilder: eintraege, aktiv: [...anim.aktiv] } : { schleife: anim.schleife, bilder: eintraege };
  }
  const hoehe = y + zeilenHoehe + abstand;
  if (breite > BLATT_MAX || hoehe > BLATT_MAX) throw new Error(`Blatt ${name}: ${breite} × ${hoehe} größer als ${BLATT_MAX}`);
  const leinwand = new Leinwand(Math.max(1, breite), Math.max(1, hoehe));
  for (const p of plaetze) leinwand.einsetzen(p.bild.leinwand, p.x, p.y);
  return { leinwand, atlas: { blatt: `${name}.png`, animationen: atlasAnim } };
}

/** Atlas als JSON-Text: feste Reihenfolge der Schlüssel, je Bild eine Zeile, Zeilenende am Schluss. */
export function atlasText(atlas: Atlas): string {
  const zeilen: string[] = ['{', `  "blatt": ${JSON.stringify(atlas.blatt)},`, '  "animationen": {'];
  const namen = Object.keys(atlas.animationen);
  namen.forEach((n, i) => {
    const a = atlas.animationen[n] as AtlasAnimation;
    zeilen.push(`    ${JSON.stringify(n)}: {`);
    zeilen.push(`      "schleife": ${a.schleife},`);
    zeilen.push('      "bilder": [');
    a.bilder.forEach((b, j) => {
      const t = `{ "x": ${b.x}, "y": ${b.y}, "b": ${b.b}, "h": ${b.h}, "ankerX": ${b.ankerX}, "ankerY": ${b.ankerY}, "dauer": ${b.dauer} }`;
      zeilen.push(`        ${t}${j < a.bilder.length - 1 ? ',' : ''}`);
    });
    zeilen.push(`      ]${a.aktiv !== undefined ? ',' : ''}`);
    if (a.aktiv !== undefined) zeilen.push(`      "aktiv": [${a.aktiv.join(', ')}]`);
    zeilen.push(`    }${i < namen.length - 1 ? ',' : ''}`);
  });
  zeilen.push('  }', '}');
  return zeilen.join('\n') + '\n';
}

/** Bytes eines gepackten Blatts: PNG und Atlas-Text (ohne zu schreiben). */
export function blattBytes(blatt: GepacktesBlatt): { png: Uint8Array; json: string } {
  return { png: pngSchreiben(blatt.leinwand), json: atlasText(blatt.atlas) };
}

/** Schreibt `${ordner}/${name}.png` und `${ordner}/${name}.json`; gibt Pfade und MD5 des PNG zurück. */
export function blattSchreiben(ordner: string, name: string, blatt: GepacktesBlatt): { png: string; json: string; md5: string } {
  mkdirSync(ordner, { recursive: true });
  const bytes = blattBytes(blatt);
  const png = join(ordner, `${name}.png`);
  const json = join(ordner, `${name}.json`);
  writeFileSync(png, bytes.png);
  writeFileSync(json, bytes.json);
  return { png, json, md5: md5(bytes.png) };
}
