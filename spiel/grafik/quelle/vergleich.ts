// Vergleichsbild Rammbock für Haltepunkt 1 (Auftrag 4, Phase 1 und 9.4):
// Reihe 1 der Grok-Rammbock (Weg C, Blatt rammbock_fremd), Reihe 2 derselbe
// Satz vom Gliederpuppen-Rammbock (Blatt rammbock), je Stand, Gehen (4
// Bilder), Schlag im aktiven Bild und getroffen, 2×; Reihe 3 Vela im Stand
// und im Trefferbild von kette1, 2×; darunter ein Streifen in Spielgröße 1×
// und derselbe 2× mit allen drei Figuren auf dem Platzhalter-Hintergrund
// von Abschnitt A (Farben und Maße aus src/darstellung/masse.ts, Band A aus
// daten/stages/scheibe.txt). Werkzeugfarben aus palette.ts (KONTAKT_*),
// Schrift aus kontakt.ts. Deterministisch.

import type { Umriss } from '../../src/darstellung/masse.ts';
import { FARBE, SCHATTEN_HOEHE, TIEFENLINIE_ABSTAND, BODENMARKE_ABSTAND, UMRISS_FIGUR, UMRISS_GEGNER } from '../../src/darstellung/masse.ts';
import type { Animation, Bild } from './blatt.ts';
import { zugeschnitten } from './blatt.ts';
import { hexZuPixel, mischen, rgbZuPixel } from './farbe.ts';
import { textBreite, textZeichnen, ZEICHEN_HOEHE } from './kontakt.ts';
import type { Pixel } from './leinwand.ts';
import { Leinwand } from './leinwand.ts';
import { KONTAKT_BODEN, KONTAKT_GRUND, KONTAKT_TEXT, KONTAKT_ZELLE } from './palette.ts';

/** Vergrößerung der Vergleichsreihen (Auftrag 4, Phase 1: 2×). */
const GROSS = 2;
/** Rand und Abstände in px (Festlegung G0b, nur Abnahmebild). */
const RAND = 8;
const LUECKE = 6;
const ZEILE = ZEICHEN_HOEHE + 4;
/** Platz unter der Grundlinie einer Vergleichszelle (1×). */
const UNTEN = 3;

/** Band von Abschnitt A: Tiefe 138 bis 213 (daten/stages/scheibe.txt, 75 px). */
const BAND_A = { unten: 138, oben: 213 } as const;
/** Streifen (1×): Wandhöhe über dem Band, Rand unter dem Band, Abstand der Figuren, Tiefe der Figuren im Band. */
const STREIFEN = { wand: 34, unterRand: 6, abstand: 90, tiefe: 30 } as const;

/** Farbe aus masse.ts: '#rrggbb' deckend, 'rgba(r, g, b, a)' über grund gemischt. */
function farbe(wert: string, grund: Pixel): Pixel {
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(wert);
  if (m === null) return hexZuPixel(wert);
  return mischen(grund, rgbZuPixel([Number(m[1]), Number(m[2]), Number(m[3])]), Number(m[4]));
}

/** Ein Bild der Vergleichsreihe mit Beschriftung. */
interface Eintrag {
  readonly bild: Bild;
  readonly text: string;
}

function holeBild(anim: readonly Animation[], name: string, index: number | 'aktiv'): Bild {
  const a = anim.find((x) => x.name === name);
  if (a === undefined) throw new Error(`Vergleich: Animation ${name} fehlt`);
  const i = index === 'aktiv' ? ((a.aktiv ?? [0])[0] as number) : index;
  const b = a.bilder[i];
  if (b === undefined) throw new Error(`Vergleich: ${name} hat kein Bild ${i}`);
  return zugeschnitten(b);
}

/** Satz eines Rammbocks: Stand, Gehen 0, 2, 4, 6, Schlag im aktiven Bild, getroffen 1. */
function rammbockSatz(anim: readonly Animation[], schlag: string): Eintrag[] {
  const gehen = anim.find((a) => a.name === 'gehen');
  const n = gehen?.bilder.length ?? 0;
  const schritte = [0, 1, 2, 3].map((k) => Math.floor((k * n) / 4));
  return [
    { bild: holeBild(anim, 'stand', 0), text: 'STAND' },
    ...schritte.map((i) => ({ bild: holeBild(anim, 'gehen', i), text: `GEHEN ${i}` })),
    { bild: holeBild(anim, schlag, 'aktiv'), text: 'SCHLAG AKTIV' },
    { bild: holeBild(anim, 'getroffen', 1), text: 'GETROFFEN 1' },
  ];
}

/** Maße einer Reihe (1×): größter Abstand links und rechts vom Anker, über und unter ihm. */
function reihenmass(eintraege: readonly Eintrag[]): { links: number; rechts: number; oben: number; unten: number } {
  let links = 0;
  let rechts = 0;
  let oben = 0;
  let unten = 0;
  for (const e of eintraege) {
    links = Math.max(links, e.bild.ankerX);
    rechts = Math.max(rechts, e.bild.leinwand.breite - e.bild.ankerX);
    oben = Math.max(oben, e.bild.ankerY);
    unten = Math.max(unten, e.bild.leinwand.hoehe - e.bild.ankerY);
  }
  return { links, rechts, oben, unten };
}

/** Streifen in Spielgröße: Wand, Band mit Tiefenlinien und Bodenmarken, Kanten, Figuren mit Schatten. */
function streifen(figuren: readonly { bild: Bild; umriss: Umriss }[]): Leinwand {
  const band = BAND_A.oben - BAND_A.unten;
  const breite = STREIFEN.abstand * (figuren.length + 1);
  const hoehe = STREIFEN.wand + band + STREIFEN.unterRand;
  const l = new Leinwand(breite, hoehe);
  const wand = hexZuPixel(FARBE.wand[0] as string);
  const boden = hexZuPixel(FARBE.boden[0] as string);
  l.rechteck(0, 0, breite, STREIFEN.wand, wand);
  l.rechteck(0, STREIFEN.wand, breite, band, boden);
  l.rechteck(0, STREIFEN.wand + band, breite, STREIFEN.unterRand, hexZuPixel(FARBE.leer));
  // Tiefenlinien alle 16 px Tiefe (Welt-z, zeichnen.ts), Bodenmarken alle 64 px in x
  for (let z = Math.ceil(BAND_A.unten / TIEFENLINIE_ABSTAND) * TIEFENLINIE_ABSTAND; z < BAND_A.oben; z += TIEFENLINIE_ABSTAND) {
    if (z <= BAND_A.unten) continue;
    l.rechteck(0, STREIFEN.wand + (BAND_A.oben - z), breite, 1, farbe(FARBE.tiefenlinie, boden));
  }
  for (let x = BODENMARKE_ABSTAND; x < breite; x += BODENMARKE_ABSTAND) l.rechteck(x, STREIFEN.wand, 1, band, farbe(FARBE.bodenmarke, boden));
  const kante = hexZuPixel(FARBE.bandkante);
  l.rechteck(0, STREIFEN.wand, breite, 1, kante);
  l.rechteck(0, STREIFEN.wand + band - 1, breite, 1, kante);
  const fussY = STREIFEN.wand + band - STREIFEN.tiefe;
  figuren.forEach((f, i) => {
    const x = STREIFEN.abstand * (i + 1);
    // Schatten: Ellipse in Schattenbreite × SCHATTEN_HOEHE am Fußpunkt, Deckkraft wie die Darstellung
    l.ellipse(x + 0.5, fussY + 0.5, f.umriss.schatten / 2, SCHATTEN_HOEHE / 2, farbe(FARBE.schatten, boden));
    l.einsetzen(f.bild.leinwand, x - f.bild.ankerX, fussY - f.bild.ankerY);
  });
  return l;
}

/** Dateiname des Vergleichsbilds unter docs/bilder/ (Auftrag 4, 9.4). */
export const VERGLEICH_DATEI = 'vergleich_rammbock.png';

/** Baut das Vergleichsbild aus den Animationen der drei Blätter. */
export function vergleichRammbock(fremd: readonly Animation[], puppe: readonly Animation[], vela: readonly Animation[]): Leinwand {
  const reihen: { titel: string; eintraege: Eintrag[] }[] = [
    { titel: 'RAMMBOCK AUS GROK-BLAETTERN (WEG C, BLATT RAMMBOCK FREMD) 2×', eintraege: rammbockSatz(fremd, 'schlag_a') },
    { titel: 'RAMMBOCK ALS GLIEDERPUPPE (BLATT RAMMBOCK) 2×', eintraege: rammbockSatz(puppe, 'schlag') },
    {
      titel: 'VELA (GLIEDERPUPPE) 2×',
      eintraege: [
        { bild: holeBild(vela, 'stand', 0), text: 'STAND' },
        { bild: holeBild(vela, 'kette1', 'aktiv'), text: 'KETTE1 AKTIV' },
      ],
    },
  ];
  const alle = reihen.flatMap((r) => r.eintraege);
  const m = reihenmass(alle);
  const zelleB = Math.max((m.links + m.rechts + 2) * GROSS, ...alle.map((e) => textBreite(e.text) + 2));
  const zelleH = (m.oben + 1 + UNTEN) * GROSS;
  const spalten = Math.max(...reihen.map((r) => r.eintraege.length));
  const streifenFig = [
    { bild: holeBild(vela, 'stand', 0), umriss: UMRISS_FIGUR, text: 'VELA' },
    { bild: holeBild(puppe, 'stand', 0), umriss: UMRISS_GEGNER.Rammbock, text: 'PUPPE' },
    { bild: holeBild(fremd, 'stand', 0), umriss: UMRISS_GEGNER.Rammbock, text: 'GROK' },
  ];
  const s1 = streifen(streifenFig);
  const s2 = s1.vergroessert(GROSS);
  const breite = Math.max(RAND * 2 + spalten * zelleB + (spalten - 1) * LUECKE, RAND * 2 + s2.breite);
  const reiheH = ZEILE + zelleH + ZEILE + LUECKE;
  const hoehe = RAND + 2 * ZEILE + reihen.length * reiheH + 2 * ZEILE + s1.hoehe + ZEILE + s2.hoehe + ZEILE + RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, 'VERGLEICH RAMMBOCK: GROK (WEG C) GEGEN GLIEDERPUPPE, VELA ALS MASSSTAB', RAND, RAND, KONTAKT_TEXT);
  let y = RAND + 2 * ZEILE;
  for (const r of reihen) {
    textZeichnen(bogen, r.titel, RAND, y, KONTAKT_TEXT);
    const y0 = y + ZEILE;
    r.eintraege.forEach((e, i) => {
      const x0 = RAND + i * (zelleB + LUECKE);
      bogen.rechteck(x0, y0, zelleB, zelleH, KONTAKT_ZELLE);
      const grundY = y0 + (m.oben + 1) * GROSS;
      bogen.rechteck(x0, grundY, zelleB, 1, KONTAKT_BODEN);
      const gross = e.bild.leinwand.vergroessert(GROSS);
      // Anker aller Zellen an derselben Stelle (größter Überstand links plus 1 px), damit Lagen vergleichbar sind
      const ax = x0 + (m.links + 1) * GROSS;
      bogen.einsetzen(gross, ax - e.bild.ankerX * GROSS, grundY - (e.bild.ankerY + 1) * GROSS);
      textZeichnen(bogen, e.text, x0 + 1, y0 + zelleH + 2, KONTAKT_TEXT);
    });
    y += reiheH;
  }
  textZeichnen(bogen, 'SPIELGROESSE 1× AUF DEM PLATZHALTER VON ABSCHNITT A (BAND 75 PX):', RAND, y, KONTAKT_TEXT);
  y += ZEILE;
  bogen.einsetzen(s1, RAND, y);
  streifenFig.forEach((f, i) => textZeichnen(bogen, f.text, RAND + STREIFEN.abstand * (i + 1) - Math.floor(textBreite(f.text) / 2), y + s1.hoehe + 2, KONTAKT_TEXT));
  y += s1.hoehe + ZEILE;
  textZeichnen(bogen, 'DERSELBE STREIFEN 2×:', RAND, y, KONTAKT_TEXT);
  y += ZEILE;
  bogen.einsetzen(s2, RAND, y);
  return bogen;
}
