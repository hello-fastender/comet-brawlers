// Vergleichsbild Rammbock für Haltepunkt 1 (Auftrag 4, Phase 1 und 9.4;
// Auftrag 5, Phase 1: auf das Grok-Blatt rammbock_grok umgestellt, U2-8):
// Reihe 1 der Grok-Rammbock (Umsetzer v2, Blatt rammbock_grok, Bildpixel in
// natürlicher Größe), Reihe 2 derselbe Satz vom Gliederpuppen-Rammbock
// (Blatt rammbock, 2× vergrößert), je Stand, Gehen (4 Bilder), Schlag im
// aktiven Bild und getroffen; Reihe 3 Vela im Stand und im Trefferbild von
// kette1 (2× vergrößert); darunter ein Streifen bei doppelter Darstellung mit
// allen drei Figuren auf dem Platzhalter-Hintergrund von Abschnitt A (Farben
// und Maße aus src/darstellung/masse.ts, Band A aus daten/stages/scheibe.txt,
// 2× vergrößert). Werkzeugfarben aus palette.ts (KONTAKT_*), Schrift aus
// kontakt.ts in 2×. Deterministisch.

import type { Umriss } from '../../src/darstellung/masse.ts';
import { FARBE, SCHATTEN_HOEHE, TIEFENLINIE_ABSTAND, BODENMARKE_ABSTAND, UMRISS_FIGUR, UMRISS_GEGNER } from '../../src/darstellung/masse.ts';
import type { Animation, Bild } from './blatt.ts';
import { zugeschnitten } from './blatt.ts';
import { hexZuPixel, mischen, rgbZuPixel } from './farbe.ts';
import { textBreite, textZeichnen, ZEICHEN_HOEHE } from './kontakt.ts';
import type { Pixel } from './leinwand.ts';
import { Leinwand } from './leinwand.ts';
import { KONTAKT_BODEN, KONTAKT_GRUND, KONTAKT_TEXT, KONTAKT_ZELLE } from './palette.ts';

/** Darstellungsmaßstab (E25: 2 Bildpixel je Spielpixel); alle Maße unten in Bildpixeln. */
const GROSS = 2;
/** Rand und Abstände in Bildpixeln (Festlegung G0b, nur Abnahmebild). */
const RAND = 16;
const LUECKE = 12;
/** Schrift 3 × 5 in 2×. */
const SCHRIFT = 2;
const ZEILE = (ZEICHEN_HOEHE + 4) * SCHRIFT;
/** Platz unter der Grundlinie einer Vergleichszelle. */
const UNTEN = 6;

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

/** Ein Bild der Vergleichsreihe mit Beschriftung, in Bildpixeln der doppelten Darstellung. */
interface Eintrag {
  readonly bild: Bild;
  readonly text: string;
}

/** Bild eines Blatts im Maßstab `massstab` (1 oder 2) auf Bildpixel der doppelten Darstellung gebracht. */
function aufGross(b: Bild, massstab: number): Bild {
  const f = GROSS / massstab;
  if (f === 1) return b;
  // Der Ankerpixel wird ein Block f × f; der Anker ist dessen linker oberer Bildpixel wie im Atlas mit Maßstab 2.
  return { leinwand: b.leinwand.vergroessert(f), ankerX: b.ankerX * f, ankerY: b.ankerY * f, dauer: b.dauer };
}

function holeBild(anim: readonly Animation[], name: string, index: number | 'aktiv', massstab: number): Bild {
  const a = anim.find((x) => x.name === name);
  if (a === undefined) throw new Error(`Vergleich: Animation ${name} fehlt`);
  const i = index === 'aktiv' ? ((a.aktiv ?? [0])[0] as number) : index;
  const b = a.bilder[i];
  if (b === undefined) throw new Error(`Vergleich: ${name} hat kein Bild ${i}`);
  return aufGross(zugeschnitten(b), massstab);
}

/** Satz eines Rammbocks: Stand, Gehen 0, 2, 4, 6, Schlag im aktiven Bild, getroffen 1. */
function rammbockSatz(anim: readonly Animation[], schlag: string, massstab: number): Eintrag[] {
  const gehen = anim.find((a) => a.name === 'gehen');
  const n = gehen?.bilder.length ?? 0;
  const schritte = [0, 1, 2, 3].map((k) => Math.floor((k * n) / 4));
  return [
    { bild: holeBild(anim, 'stand', 0, massstab), text: 'STAND' },
    ...schritte.map((i) => ({ bild: holeBild(anim, 'gehen', i, massstab), text: `GEHEN ${i}` })),
    { bild: holeBild(anim, schlag, 'aktiv', massstab), text: 'SCHLAG AKTIV' },
    { bild: holeBild(anim, 'getroffen', 1, massstab), text: 'GETROFFEN 1' },
  ];
}

/** Maße einer Reihe: größter Abstand links und rechts vom Anker, über und unter ihm. */
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

/** Streifen bei doppelter Darstellung: Wand, Band mit Tiefenlinien und Bodenmarken, Kanten (1× gebaut, 2× vergrößert), Figuren mit Schatten in Bildpixeln. */
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
  });
  const gross = l.vergroessert(GROSS);
  figuren.forEach((f, i) => {
    const x = STREIFEN.abstand * (i + 1) * GROSS;
    gross.einsetzen(f.bild.leinwand, x - f.bild.ankerX, fussY * GROSS - f.bild.ankerY);
  });
  return gross;
}

/** Dateiname des Vergleichsbilds unter docs/bilder/ (Auftrag 4, 9.4). */
export const VERGLEICH_DATEI = 'vergleich_rammbock.png';

/** Baut das Vergleichsbild aus den Animationen der drei Blätter (grok im Maßstab 2, puppe und vela im Maßstab 1). */
export function vergleichRammbock(grok: readonly Animation[], puppe: readonly Animation[], vela: readonly Animation[]): Leinwand {
  const reihen: { titel: string; eintraege: Eintrag[] }[] = [
    { titel: 'RAMMBOCK AUS GROK-BLAETTERN (UMSETZER V2, BLATT RAMMBOCK_GROK), NATUERLICHE GROESSE 2×', eintraege: rammbockSatz(grok, 'schlag_a', GROSS) },
    { titel: 'RAMMBOCK ALS GLIEDERPUPPE (BLATT RAMMBOCK), 2× VERGROESSERT', eintraege: rammbockSatz(puppe, 'schlag', 1) },
    {
      titel: 'VELA (GLIEDERPUPPE), 2× VERGROESSERT',
      eintraege: [
        { bild: holeBild(vela, 'stand', 0, 1), text: 'STAND' },
        { bild: holeBild(vela, 'kette1', 'aktiv', 1), text: 'KETTE1 AKTIV' },
      ],
    },
  ];
  const alle = reihen.flatMap((r) => r.eintraege);
  const m = reihenmass(alle);
  const zelleB = Math.max(m.links + m.rechts + 2 * GROSS, ...alle.map((e) => textBreite(e.text, SCHRIFT) + 2));
  const zelleH = m.oben + GROSS + UNTEN;
  const spalten = Math.max(...reihen.map((r) => r.eintraege.length));
  const streifenFig = [
    { bild: holeBild(vela, 'stand', 0, 1), umriss: UMRISS_FIGUR, text: 'VELA' },
    { bild: holeBild(puppe, 'stand', 0, 1), umriss: UMRISS_GEGNER.Rammbock, text: 'PUPPE' },
    { bild: holeBild(grok, 'stand', 0, GROSS), umriss: UMRISS_GEGNER.Rammbock, text: 'GROK' },
  ];
  const s2 = streifen(streifenFig);
  const breite = Math.max(RAND * 2 + spalten * zelleB + (spalten - 1) * LUECKE, RAND * 2 + s2.breite);
  const reiheH = ZEILE + zelleH + ZEILE + LUECKE;
  const hoehe = RAND + 2 * ZEILE + reihen.length * reiheH + 2 * ZEILE + s2.hoehe + ZEILE + RAND;
  const bogen = new Leinwand(breite, hoehe);
  bogen.fuelle(KONTAKT_GRUND);
  textZeichnen(bogen, 'VERGLEICH RAMMBOCK BEI DOPPELTER DARSTELLUNG: GROK (UMSETZER V2) GEGEN GLIEDERPUPPE, VELA ALS MASSSTAB', RAND, RAND, KONTAKT_TEXT, SCHRIFT);
  let y = RAND + 2 * ZEILE;
  for (const r of reihen) {
    textZeichnen(bogen, r.titel, RAND, y, KONTAKT_TEXT, SCHRIFT);
    const y0 = y + ZEILE;
    r.eintraege.forEach((e, i) => {
      const x0 = RAND + i * (zelleB + LUECKE);
      bogen.rechteck(x0, y0, zelleB, zelleH, KONTAKT_ZELLE);
      const grundY = y0 + m.oben + GROSS;
      bogen.rechteck(x0, grundY, zelleB, 1, KONTAKT_BODEN);
      // Anker aller Zellen an derselben Stelle (größter Überstand links plus Rand), damit Lagen vergleichbar sind
      const ax = x0 + m.links + GROSS;
      bogen.einsetzen(e.bild.leinwand, ax - e.bild.ankerX, grundY - GROSS - e.bild.ankerY);
      textZeichnen(bogen, e.text, x0 + 1, y0 + zelleH + 4, KONTAKT_TEXT, SCHRIFT);
    });
    y += reiheH;
  }
  textZeichnen(bogen, 'SPIELGROESSE BEI DOPPELTER DARSTELLUNG AUF DEM PLATZHALTER VON ABSCHNITT A (BAND 75 SPIELPIXEL):', RAND, y, KONTAKT_TEXT, SCHRIFT);
  y += ZEILE;
  bogen.einsetzen(s2, RAND, y);
  streifenFig.forEach((f, i) => {
    const mx = RAND + STREIFEN.abstand * (i + 1) * GROSS;
    textZeichnen(bogen, f.text, mx - Math.floor(textBreite(f.text, SCHRIFT) / 2), y + s2.hoehe + 4, KONTAKT_TEXT, SCHRIFT);
  });
  return bogen;
}
