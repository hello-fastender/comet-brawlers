// CLI der Grafik (Auftrag 4, 2.2): baut alle Figuren, prüft die Stilregeln
// (docs/grafik.md 2.5), schreibt Blätter und Atlanten nach
// spiel/grafik/ausgabe/ und Kontaktbögen nach docs/bilder/, gibt je Blatt
// das MD5 aus. Jede Verletzung bricht mit Figur, Animation und Bild ab.
//
//   node --experimental-strip-types grafik/quelle/bauen.ts            alles
//   node --experimental-strip-types grafik/quelle/bauen.ts --nur-kontakt   nur Kontaktbögen

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Umriss } from '../../src/darstellung/masse.ts';
import { SCHATTEN_HOEHE, UMRISS_FIGUR, UMRISS_GEGNER } from '../../src/darstellung/masse.ts';
import type { Animation } from './blatt.ts';
import { blattBytes, blattPacken, blattSchreiben, zugeschnitten } from './blatt.ts';
import { GEHEN_SCHRITT, velaAnimationen } from './figuren/vela.ts';
import { GEHEN_SCHRITT as RAMMBOCK_SCHRITT, GLANZ_RAMMBOCK, rammbockAnimationen } from './figuren/rammbock.ts';
import { bolzerFiguren } from './figuren/bolzer.ts';
import { zuenderFiguren } from './figuren/zuender.ts';
import { ballastFiguren } from './figuren/ballast.ts';
import type { Erzeugnis } from './erzeugnis.ts';
import { objekteErzeugnisse } from './objekte.ts';
import { hintergrundErzeugnisse } from './hintergrund/hintergruende.ts';
import { anzeigeErzeugnisse } from './anzeige.ts';
import { kontaktBogen, kontaktSchreiben } from './kontakt.ts';
import { konturLuecken, streupixel } from './kontur.ts';
import type { Leinwand, Pixel } from './leinwand.ts';
import { deckend } from './leinwand.ts';
import { FARBBUDGET, KONTUR, SPULE, farbenZaehlen } from './palette.ts';
import { md5, pngSchreiben } from './png.ts';
import { umsetzenOrdner } from './umsetzer.ts';
import { VERGLEICH_DATEI, vergleichRammbock } from './vergleich.ts';

/** Ordner spiel/ (zwei Ebenen über grafik/quelle/). */
const SPIEL = fileURLToPath(new URL('../../', import.meta.url));
/** Ausgabe der Blätter und Atlanten (Auftrag 4, 2.2). */
export const AUSGABE = join(SPIEL, 'grafik', 'ausgabe');
/** Ablage der Kontaktbögen (Auftrag 4, 2.2). */
export const BILDER = join(SPIEL, '..', 'docs', 'bilder');

/** Eine Figur mit allen Animationen und den Angaben für die Prüfungen. */
export interface Figur {
  /** Name des Blatts (Datei <name>.png und <name>.json). */
  readonly name: string;
  /** Umriss aus masse.ts. */
  readonly umriss: Umriss;
  readonly animationen: readonly Animation[];
  /** Farben, die als Glanzpunkte allein stehen dürfen (Regel 1.3). */
  readonly glanz: ReadonlySet<Pixel>;
  /** Farbbudget einschließlich durchsichtig (FARBBUDGET.figur). */
  readonly budget: number;
  /** Name der Gehanimation für die Prüfung des Fußkontakts (fehlt: keine Prüfung). */
  readonly gehen?: string;
  /** px, um die der Standfuß je Bild nach hinten rückt. */
  readonly schritt?: number;
  /**
   * Regeln, die bei dieser Figur nur als Hinweis gemeldet werden und den Bau nicht abbrechen
   * (Figuren aus Fremdblättern: Umriss im Stand, Fußkontakt; docs/grafik.md 5.4, G0b-4).
   */
  readonly weich?: ReadonlySet<string>;
}

/** Ein Befund einer Prüfung. */
export interface Befund {
  readonly figur: string;
  readonly animation: string;
  readonly bild: number;
  readonly regel: string;
  readonly text: string;
}

/** Untergrenze der Körperhöhe im Stand als Anteil der Höchsthöhe (Auftrag 4, 1.1: „etwa 5 px niedriger“; Festlegung G0). */
const STAND_MINDESTANTEIL = 0.9;
/** Spiel beim Fußkontakt in px (Rundung auf ganze Pixel). */
const FUSS_SPIEL = 1;

/** Läufe deckender Pixel in Zeile y: [Anfang, Ende] in x relativ zum Anker. */
function laeufe(a: Animation['bilder'][number], y: number): [number, number][] {
  const l = a.leinwand;
  const aus: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= l.breite; x++) {
    const an = x < l.breite && deckend(l.hole(x, y));
    if (an && start < 0) start = x;
    if (!an && start >= 0) {
      aus.push([start - a.ankerX, x - 1 - a.ankerX]);
      start = -1;
    }
  }
  return aus;
}

/** Prüft alle Stilregeln (docs/grafik.md 2.5) und gibt die Befunde zurück. */
export function figurPruefen(figur: Figur): Befund[] {
  const befunde: Befund[] = [];
  const melde = (animation: string, bild: number, regel: string, text: string): void => {
    befunde.push({ figur: figur.name, animation, bild, regel, text });
  };
  const alle: Leinwand[] = [];
  for (const anim of figur.animationen) {
    anim.bilder.forEach((roh, i) => {
      const b = zugeschnitten(roh);
      alle.push(b.leinwand);
      const l = b.leinwand;
      if (!(b.ankerX >= 0 && b.ankerX < l.breite && b.ankerY >= 0 && b.ankerY < l.hoehe)) {
        melde(anim.name, i, 'Anker im Bild', `Anker (${b.ankerX}, ${b.ankerY}) außerhalb ${l.breite} × ${l.hoehe}`);
      }
      const luecken = konturLuecken(l, KONTUR);
      if (luecken.length > 0) {
        const q = luecken[0] as { x: number; y: number };
        melde(anim.name, i, 'Kontur geschlossen', `${luecken.length} Pixel ohne Kontur, erster bei (${q.x - b.ankerX}, ${q.y - b.ankerY}) vom Anker`);
      }
      const streu = streupixel(l, figur.glanz);
      if (streu.length > 0) {
        const q = streu[0] as { x: number; y: number };
        melde(anim.name, i, 'Streupixel', `${streu.length} Streupixel, erster bei (${q.x - b.ankerX}, ${q.y - b.ankerY}) vom Anker`);
      }
      const n = farbenZaehlen(l);
      if (n > figur.budget) melde(anim.name, i, 'Farbzählung', `${n} Farben, erlaubt ${figur.budget}`);
    });
    if (anim.aktiv !== undefined) {
      for (const a of anim.aktiv) {
        if (!(Number.isInteger(a) && a >= 0 && a < anim.bilder.length)) melde(anim.name, a, 'Aktiv', `Index ${a} außerhalb`);
      }
    }
  }
  const gesamt = farbenZaehlen(alle);
  if (gesamt > figur.budget) melde('alle', -1, 'Farbzählung', `${gesamt} Farben über alle Bilder, erlaubt ${figur.budget}`);

  // Umriss im Stand (Auftrag 4, 1.1)
  const stand = figur.animationen.find((a) => a.name === 'stand');
  if (stand === undefined) melde('stand', -1, 'Umriss im Stand', 'Animation stand fehlt');
  else {
    const b = zugeschnitten(stand.bilder[0] as Animation['bilder'][number]);
    const hoeheMax = figur.umriss.hoehe - SCHATTEN_HOEHE / 2;
    if (b.leinwand.breite > figur.umriss.breite) melde('stand', 0, 'Umriss im Stand', `Breite ${b.leinwand.breite} > ${figur.umriss.breite}`);
    if (b.leinwand.hoehe > hoeheMax) melde('stand', 0, 'Umriss im Stand', `Höhe ${b.leinwand.hoehe} > ${hoeheMax}`);
    if (b.leinwand.hoehe < STAND_MINDESTANTEIL * hoeheMax) melde('stand', 0, 'Umriss im Stand', `Höhe ${b.leinwand.hoehe} < ${STAND_MINDESTANTEIL} · ${hoeheMax}`);
    if (b.ankerY !== b.leinwand.hoehe - 1) melde('stand', 0, 'Umriss im Stand', `Anker nicht in der untersten Zeile (${b.ankerY} von ${b.leinwand.hoehe})`);
  }

  // Fußkontakt beim Gehen (Auftrag 4, 1.4): zwischen zwei Bildern rückt eine Sohle um schritt px nach hinten
  if (figur.gehen !== undefined && figur.schritt !== undefined) {
    const gehen = figur.animationen.find((a) => a.name === figur.gehen);
    if (gehen === undefined) melde(figur.gehen, -1, 'Fußkontakt', 'Animation fehlt');
    else {
      const n = gehen.bilder.length;
      const sohlen = gehen.bilder.map((b) => laeufe(b, b.ankerY));
      for (let i = 0; i < n; i++) {
        const a = sohlen[i] as [number, number][];
        const c = sohlen[(i + 1) % n] as [number, number][];
        if (a.length === 0) {
          melde(gehen.name, i, 'Fußkontakt', 'keine Sohle auf der Ankerzeile');
          continue;
        }
        const ok = a.some((p) => c.some((q) => Math.abs(q[0] - p[0] + (figur.schritt as number)) <= FUSS_SPIEL || Math.abs(q[1] - p[1] + (figur.schritt as number)) <= FUSS_SPIEL));
        if (!ok) {
          melde(gehen.name, i, 'Fußkontakt', `keine Sohle rückt zu Bild ${(i + 1) % n} um ${figur.schritt} px zurück (Sohlen ${JSON.stringify(a)} → ${JSON.stringify(c)})`);
        }
      }
    }
  }
  return befunde;
}

/**
 * Alle Figuren der Erzeugung: Vela und Rammbock (Phase 1), dazu die Figuren der Dateien von G2
 * (Bolzer, Puppe) und G3 (Zünder, Ballast) in Phase 2 (Auftrag 4, E24).
 */
export function figuren(): Figur[] {
  return [
    {
      name: 'vela',
      umriss: UMRISS_FIGUR,
      animationen: velaAnimationen(),
      glanz: new Set<Pixel>([SPULE]),
      budget: FARBBUDGET.figur,
      gehen: 'gehen',
      schritt: GEHEN_SCHRITT,
    },
    {
      name: 'rammbock',
      umriss: UMRISS_GEGNER.Rammbock,
      animationen: rammbockAnimationen(),
      glanz: GLANZ_RAMMBOCK,
      budget: FARBBUDGET.figur,
      gehen: 'gehen',
      schritt: RAMMBOCK_SCHRITT,
    },
    ...bolzerFiguren(),
    ...zuenderFiguren(),
    ...ballastFiguren(),
  ];
}

/** Erzeugnisse außer Figuren (Phase 2): Objekte und Effekte (G4), Hintergründe (G5), Anzeige (G6). */
export function erzeugnisse(): Erzeugnis[] {
  return [...objekteErzeugnisse(), ...hintergrundErzeugnisse(), ...anzeigeErzeugnisse()];
}

/** Ordner der Fremdblätter je Figur (Auftrag 4, 9.3; docs/grafik.md 5.3). */
export const FREMD = join(SPIEL, 'grafik', 'quelle', 'fremd');
/** Figuren aus Fremdblättern: Ordnername unter FREMD (Weg C, Umsetzer G0b). */
export const FREMD_ORDNER: readonly string[] = ['rammbock'];

/**
 * Figuren aus Grok-Blättern über den Umsetzer (Auftrag 4, 9.3): Blatt `<figur>_fremd` je Ordner
 * unter FREMD. Getrennt von figuren(), weil das Umsetzen der großen Blätter einige Sekunden dauert.
 */
export function fremdFiguren(): Figur[] {
  return FREMD_ORDNER.map((ordner) => umsetzenOrdner(join(FREMD, ordner)).pruefFigur);
}

/** Bytes aller Ausgaben einer Figur ohne zu schreiben (für den Determinismus-Test). */
export function figurBytes(figur: Figur): Map<string, Uint8Array | string> {
  const aus = new Map<string, Uint8Array | string>();
  const blatt = blattBytes(blattPacken(figur.name, figur.animationen));
  aus.set(`${figur.name}.png`, blatt.png);
  aus.set(`${figur.name}.json`, blatt.json);
  for (const a of figur.animationen) aus.set(`kontakt_${figur.name}_${a.name}.png`, pngSchreiben(kontaktBogen(a)));
  return aus;
}

export interface AusgabeOptionen {
  readonly blatt?: boolean;
  readonly kontakt?: boolean;
  readonly ausgabe?: string;
  readonly bilder?: string;
}

/** Schreibt Blatt, Atlas und Kontaktbögen einer Figur; gibt die MD5 je Datei zurück. */
export function figurAusgeben(figur: Figur, optionen: AusgabeOptionen = {}): Map<string, string> {
  const md5s = new Map<string, string>();
  if (optionen.blatt !== false) {
    const r = blattSchreiben(optionen.ausgabe ?? AUSGABE, figur.name, blattPacken(figur.name, figur.animationen));
    md5s.set(`${figur.name}.png`, r.md5);
  }
  if (optionen.kontakt !== false) {
    for (const a of figur.animationen) {
      const datei = `kontakt_${figur.name}_${a.name}.png`;
      md5s.set(datei, kontaktSchreiben(join(optionen.bilder ?? BILDER, datei), a));
    }
  }
  return md5s;
}

/**
 * Baut alle Figuren (Gliederpuppen und Fremdblätter): prüfen, dann schreiben. Wirft bei
 * Befunden; Befunde der weichen Regeln einer Figur gehen je Regel gezählt an `hinweis`.
 */
export function bauen(optionen: { nurKontakt?: boolean; hinweis?: (zeile: string) => void } = {}): Map<string, string> {
  const alle = new Map<string, string>();
  const gebaut = [...figuren(), ...fremdFiguren()];
  for (const f of gebaut) {
    const weich = f.weich ?? new Set<string>();
    const alleBefunde = figurPruefen(f);
    const befunde = alleBefunde.filter((b) => !weich.has(b.regel));
    for (const regel of [...weich].sort()) {
      const n = alleBefunde.filter((b) => b.regel === regel).length;
      if (n > 0) optionen.hinweis?.(`Hinweis ${f.name}: ${n} Befunde „${regel}“ (nur gemeldet, docs/grafik.md 5.4)`);
    }
    if (befunde.length > 0) {
      const text = befunde.map((b) => `  ${b.figur} / ${b.animation} / Bild ${b.bild}: ${b.regel}: ${b.text}`).join('\n');
      throw new Error(`Stilprüfung verletzt (${befunde.length}):\n${text}`);
    }
    for (const [k, v] of figurAusgeben(f, { blatt: optionen.nurKontakt !== true })) alle.set(k, v);
  }
  for (const e of erzeugnisse()) {
    if (e.befunde.length > 0) {
      const text = e.befunde.map((b) => `  ${b.figur} / ${b.animation} / Bild ${b.bild}: ${b.regel}: ${b.text}`).join('\n');
      throw new Error(`Stilprüfung verletzt (${e.befunde.length}):\n${text}`);
    }
    if (optionen.nurKontakt !== true) {
      mkdirSync(AUSGABE, { recursive: true });
      for (const [datei, inhalt] of e.ausgabe) {
        writeFileSync(join(AUSGABE, datei), inhalt);
        alle.set(datei, md5(typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : inhalt));
      }
    }
    mkdirSync(BILDER, { recursive: true });
    for (const [datei, inhalt] of e.bilder) {
      writeFileSync(join(BILDER, datei), inhalt);
      alle.set(datei, md5(inhalt));
    }
  }
  const vergleich = vergleichBytes(gebaut);
  if (vergleich !== null) {
    mkdirSync(BILDER, { recursive: true });
    writeFileSync(join(BILDER, VERGLEICH_DATEI), vergleich);
    alle.set(VERGLEICH_DATEI, md5(vergleich));
  }
  return alle;
}

/**
 * Vergleichsbild Rammbock für Haltepunkt 1 (Auftrag 4, 9.4; vergleich.ts) als PNG-Bytes, wenn
 * die Blätter vela, rammbock und rammbock_fremd gebaut sind; sonst null.
 */
export function vergleichBytes(gebaut: readonly Figur[]): Uint8Array | null {
  const anim = (name: string): readonly Animation[] | undefined => gebaut.find((f) => f.name === name)?.animationen;
  const fremd = anim('rammbock_fremd');
  const puppe = anim('rammbock');
  const vela = anim('vela');
  if (fremd === undefined || puppe === undefined || vela === undefined) return null;
  return pngSchreiben(vergleichRammbock(fremd, puppe, vela));
}

/** MD5 der Bytes (Wiederverwendung in Tests). */
export { md5 };

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const md5s = bauen({ nurKontakt: process.argv.includes('--nur-kontakt'), hinweis: (zeile) => console.error(zeile) });
    for (const [datei, summe] of md5s) console.log(`${summe}  ${datei}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}
