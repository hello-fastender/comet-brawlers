// PNG schreiben und lesen (Auftrag 4, 2.1 und 9.3), ohne Pakete: node:zlib
// für Deflate und Inflate, CRC32 nach PNG-Spezifikation (ISO/IEC 15948,
// Anhang D). Schreiben: 8-Bit-RGBA, ohne Zeilensprung, Filter wählbar
// (Vorgabe 0), Deflate-Stufe fest, damit gleiche Pixel gleiche Bytes geben.
// Lesen: Bittiefe 8, Farbtypen 0 (Grau), 2 (RGB), 3 (Palette, mit tRNS),
// 4 (Grau mit Alpha) und 6 (RGBA), Filtertypen 0 bis 4, ohne Zeilensprung.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { KANAL_MAX, Leinwand, rgba } from './leinwand.ts';

/** PNG-Signatur (ISO/IEC 15948, 5.2). */
const SIGNATUR = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** CRC-32 nach ISO 3309, Polynom 0xEDB88320 in umgekehrter Bitfolge (PNG Anhang D). */
const CRC_POLYNOM = 0xedb88320;
const CRC_TABELLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? CRC_POLYNOM ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Farbtypen (PNG 11.2.2). */
export const FARBTYP_GRAU = 0;
export const FARBTYP_RGB = 2;
export const FARBTYP_PALETTE = 3;
export const FARBTYP_GRAU_ALPHA = 4;
export const FARBTYP_RGBA = 6;

/** Kanäle je Farbtyp bei Bittiefe 8. */
const KANAELE: Readonly<Record<number, number>> = {
  [FARBTYP_GRAU]: 1,
  [FARBTYP_RGB]: 3,
  [FARBTYP_PALETTE]: 1,
  [FARBTYP_GRAU_ALPHA]: 2,
  [FARBTYP_RGBA]: 4,
};

/** Unterstützte Bittiefe. */
const BITTIEFE = 8;

/** Deflate-Stufe beim Schreiben (fest, für gleiche Bytes). */
const DEFLATE_STUFE = 9;

/** Filtertyp einer Zeile (PNG 9.2): 0 keiner, 1 Sub, 2 Up, 3 Average, 4 Paeth. */
export type Filtertyp = 0 | 1 | 2 | 3 | 4;

export interface PngOptionen {
  /** Filtertyp für alle Zeilen (Vorgabe 0). */
  readonly filter?: Filtertyp;
}

/** CRC-32 über daten[start … ende). */
export function crc32(daten: Uint8Array, start: number = 0, ende: number = daten.length): number {
  let c = 0xffffffff;
  for (let i = start; i < ende; i++) c = (CRC_TABELLE[(c ^ (daten[i] as number)) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MD5 als Hex-Text (für Berichte und Determinismus-Prüfung). */
export function md5(daten: Uint8Array): string {
  return createHash('md5').update(daten).digest('hex');
}

function u32be(wert: number): number[] {
  return [(wert >>> 24) & 0xff, (wert >>> 16) & 0xff, (wert >>> 8) & 0xff, wert & 0xff];
}

function chunk(typ: string, inhalt: Uint8Array): Uint8Array {
  const aus = new Uint8Array(12 + inhalt.length);
  aus.set(u32be(inhalt.length), 0);
  for (let i = 0; i < 4; i++) aus[4 + i] = typ.charCodeAt(i);
  aus.set(inhalt, 8);
  aus.set(u32be(crc32(aus, 4, 8 + inhalt.length)), 8 + inhalt.length);
  return aus;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Baut eine PNG-Datei aus schon gefilterten Zeilen (je Zeile ein Filterbyte
 * und die Bytes der Zeile), Bittiefe 8. Für Tests und Sonderfälle; Bilder
 * schreibt man mit pngSchreiben.
 */
export function pngAusRohdaten(breite: number, hoehe: number, farbtyp: number, zeilen: Uint8Array, palette?: Uint8Array): Uint8Array {
  const kopf = new Uint8Array(13);
  kopf.set(u32be(breite), 0);
  kopf.set(u32be(hoehe), 4);
  kopf[8] = BITTIEFE;
  kopf[9] = farbtyp;
  kopf[10] = 0; // Kompression 0 (Deflate)
  kopf[11] = 0; // Filtermethode 0
  kopf[12] = 0; // ohne Zeilensprung
  const teile: Uint8Array[] = [Uint8Array.from(SIGNATUR), chunk('IHDR', kopf)];
  if (palette !== undefined) teile.push(chunk('PLTE', palette));
  teile.push(chunk('IDAT', new Uint8Array(deflateSync(zeilen, { level: DEFLATE_STUFE }))));
  teile.push(chunk('IEND', new Uint8Array(0)));
  let laenge = 0;
  for (const t of teile) laenge += t.length;
  const aus = new Uint8Array(laenge);
  let o = 0;
  for (const t of teile) {
    aus.set(t, o);
    o += t.length;
  }
  return aus;
}

/** Filtert eine Zeile roh (Bytes) mit dem Filtertyp; vorher = vorige ungefilterte Zeile oder null. */
function filtereZeile(roh: Uint8Array, vorher: Uint8Array | null, typ: Filtertyp, bpp: number): Uint8Array {
  const aus = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) {
    const a = i >= bpp ? (roh[i - bpp] as number) : 0;
    const b = vorher !== null ? (vorher[i] as number) : 0;
    const c = vorher !== null && i >= bpp ? (vorher[i - bpp] as number) : 0;
    const x = roh[i] as number;
    let v = x;
    if (typ === 1) v = x - a;
    else if (typ === 2) v = x - b;
    else if (typ === 3) v = x - ((a + b) >>> 1);
    else if (typ === 4) v = x - paeth(a, b, c);
    aus[i] = v & 0xff;
  }
  return aus;
}

/** Schreibt ein Bild als PNG (8-Bit-RGBA). Gleiche Pixel und Optionen geben gleiche Bytes. */
export function pngSchreiben(bild: Leinwand, optionen: PngOptionen = {}): Uint8Array {
  const typ: Filtertyp = optionen.filter ?? 0;
  const bpp = KANAELE[FARBTYP_RGBA] as number;
  const zeilenLaenge = bild.breite * bpp;
  const zeilen = new Uint8Array((zeilenLaenge + 1) * bild.hoehe);
  let vorher: Uint8Array | null = null;
  for (let y = 0; y < bild.hoehe; y++) {
    const roh = new Uint8Array(zeilenLaenge);
    for (let x = 0; x < bild.breite; x++) {
      const p = bild.daten[y * bild.breite + x] as number;
      roh[x * bpp] = (p >>> 24) & 0xff;
      roh[x * bpp + 1] = (p >>> 16) & 0xff;
      roh[x * bpp + 2] = (p >>> 8) & 0xff;
      roh[x * bpp + 3] = p & 0xff;
    }
    zeilen[y * (zeilenLaenge + 1)] = typ;
    zeilen.set(filtereZeile(roh, vorher, typ, bpp), y * (zeilenLaenge + 1) + 1);
    vorher = roh;
  }
  return pngAusRohdaten(bild.breite, bild.hoehe, FARBTYP_RGBA, zeilen);
}

function liesU32(d: Uint8Array, o: number): number {
  return (((d[o] as number) << 24) | ((d[o + 1] as number) << 16) | ((d[o + 2] as number) << 8) | (d[o + 3] as number)) >>> 0;
}

/** Liest eine PNG-Datei (Bittiefe 8, Farbtypen 0, 2, 3, 4, 6, Filter 0 bis 4, ohne Zeilensprung). */
export function pngLesen(daten: Uint8Array): Leinwand {
  for (let i = 0; i < SIGNATUR.length; i++) {
    if (daten[i] !== SIGNATUR[i]) throw new Error('PNG: Signatur fehlt');
  }
  let o = SIGNATUR.length;
  let breite = 0;
  let hoehe = 0;
  let farbtyp = -1;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  let ende = false;
  while (o + 12 <= daten.length && !ende) {
    const laenge = liesU32(daten, o);
    const typ = String.fromCharCode(daten[o + 4] as number, daten[o + 5] as number, daten[o + 6] as number, daten[o + 7] as number);
    const inhalt = daten.subarray(o + 8, o + 8 + laenge);
    if (o + 12 + laenge > daten.length) throw new Error(`PNG: Chunk ${typ} abgeschnitten`);
    if (crc32(daten, o + 4, o + 8 + laenge) !== liesU32(daten, o + 8 + laenge)) throw new Error(`PNG: CRC von ${typ} falsch`);
    if (typ === 'IHDR') {
      breite = liesU32(inhalt, 0);
      hoehe = liesU32(inhalt, 4);
      const tiefe = inhalt[8] as number;
      farbtyp = inhalt[9] as number;
      if (tiefe !== BITTIEFE) throw new Error(`PNG: Bittiefe ${tiefe} nicht unterstützt (nur 8)`);
      if (KANAELE[farbtyp] === undefined) throw new Error(`PNG: Farbtyp ${farbtyp} nicht unterstützt`);
      if (inhalt[12] !== 0) throw new Error('PNG: Zeilensprung (Interlace) nicht unterstützt');
    } else if (typ === 'PLTE') palette = inhalt;
    else if (typ === 'tRNS') trns = inhalt;
    else if (typ === 'IDAT') idat.push(inhalt);
    else if (typ === 'IEND') ende = true;
    o += 12 + laenge;
  }
  if (farbtyp < 0) throw new Error('PNG: IHDR fehlt');
  if (idat.length === 0) throw new Error('PNG: IDAT fehlt');
  if (farbtyp === FARBTYP_PALETTE && palette === null) throw new Error('PNG: PLTE fehlt');
  let gesamt = 0;
  for (const t of idat) gesamt += t.length;
  const gepackt = new Uint8Array(gesamt);
  let p = 0;
  for (const t of idat) {
    gepackt.set(t, p);
    p += t.length;
  }
  const roh = new Uint8Array(inflateSync(gepackt));
  const bpp = KANAELE[farbtyp] as number;
  const zeilenLaenge = breite * bpp;
  if (roh.length < (zeilenLaenge + 1) * hoehe) throw new Error('PNG: Bilddaten zu kurz');
  const bild = new Leinwand(breite, hoehe);
  let vorher = new Uint8Array(zeilenLaenge);
  for (let y = 0; y < hoehe; y++) {
    const start = y * (zeilenLaenge + 1);
    const filter = roh[start] as number;
    const zeile = new Uint8Array(zeilenLaenge);
    for (let i = 0; i < zeilenLaenge; i++) {
      const x = roh[start + 1 + i] as number;
      const a = i >= bpp ? (zeile[i - bpp] as number) : 0;
      const b = vorher[i] as number;
      const c = i >= bpp ? (vorher[i - bpp] as number) : 0;
      let v: number;
      if (filter === 0) v = x;
      else if (filter === 1) v = x + a;
      else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >>> 1);
      else if (filter === 4) v = x + paeth(a, b, c);
      else throw new Error(`PNG: Filtertyp ${filter} in Zeile ${y} unbekannt`);
      zeile[i] = v & 0xff;
    }
    for (let x = 0; x < breite; x++) {
      const q = x * bpp;
      let r = 0;
      let g = 0;
      let bl = 0;
      let al = KANAL_MAX;
      if (farbtyp === FARBTYP_GRAU || farbtyp === FARBTYP_GRAU_ALPHA) {
        r = g = bl = zeile[q] as number;
        if (farbtyp === FARBTYP_GRAU_ALPHA) al = zeile[q + 1] as number;
        else if (trns !== null && trns.length >= 2 && ((trns[1] as number) | ((trns[0] as number) << 8)) === r) al = 0;
      } else if (farbtyp === FARBTYP_RGB || farbtyp === FARBTYP_RGBA) {
        r = zeile[q] as number;
        g = zeile[q + 1] as number;
        bl = zeile[q + 2] as number;
        if (farbtyp === FARBTYP_RGBA) al = zeile[q + 3] as number;
        else if (
          trns !== null &&
          trns.length >= 6 &&
          (trns[1] as number) === r &&
          (trns[3] as number) === g &&
          (trns[5] as number) === bl
        )
          al = 0;
      } else {
        const index = zeile[q] as number;
        const pal = palette as Uint8Array;
        if (index * 3 + 2 >= pal.length) throw new Error(`PNG: Palettenindex ${index} außerhalb`);
        r = pal[index * 3] as number;
        g = pal[index * 3 + 1] as number;
        bl = pal[index * 3 + 2] as number;
        if (trns !== null && index < trns.length) al = trns[index] as number;
      }
      bild.daten[y * breite + x] = rgba(r, g, bl, al);
    }
    vorher = zeile;
  }
  return bild;
}

/** Liest eine PNG-Datei vom Datenträger. */
export function pngDateiLesen(pfad: string): Leinwand {
  return pngLesen(new Uint8Array(readFileSync(pfad)));
}

/** Schreibt ein Bild als PNG-Datei und gibt das MD5 der Bytes zurück. */
export function pngDateiSchreiben(pfad: string, bild: Leinwand, optionen: PngOptionen = {}): string {
  const bytes = pngSchreiben(bild, optionen);
  writeFileSync(pfad, bytes);
  return md5(bytes);
}
