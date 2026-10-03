// CLI der Grafik (Auftrag 4, 2.2): baut alle Figuren, prüft die Stilregeln
// (docs/grafik.md 2.5), schreibt Blätter und Atlanten nach
// spiel/grafik/ausgabe/ und Kontaktbögen nach docs/bilder/, gibt je Blatt
// das MD5 aus. Jede Verletzung bricht mit Figur, Animation und Bild ab.
// Dazu die Grok-Blätter des Umsetzers v2 (Auftrag 5, Phase 1;
// docs/grafik.md 5.8) und die Liste aller Blätter blaetter.json.
//
//   node --experimental-strip-types grafik/quelle/bauen.ts            alles
//   node --experimental-strip-types grafik/quelle/bauen.ts --nur-kontakt   nur Kontaktbögen

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import type { Bodenton, Ergebnis as GrokErgebnis } from './umsetzer.ts';
import {
  BLATT_ENDUNG, dunkelsterBodenton, grokBytes, grokKontaktBogen, hintergrundblaetterAus, kontaktDatei, leseZuordnung, umsetzenOrdner,
} from './umsetzer.ts';
import { VERGLEICH_DATEI, vergleichRammbock } from './vergleich.ts';
import { UEBERSICHT_DATEI, uebersicht } from './uebersicht.ts';

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

/** Ordner unter FREMD mit einer zuordnung.txt, alphabetisch (Umsetzer v2, docs/grafik.md 5.8). */
export function fremdOrdnerLesen(fremd: string = FREMD): string[] {
  if (!existsSync(fremd)) return [];
  return readdirSync(fremd, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(fremd, d.name, 'zuordnung.txt')))
    .map((d) => d.name)
    .sort();
}

/** Alle Ordner der Fremdblätter (z. B. rammbock, später rammbock_34). */
export const FREMD_ORDNER: readonly string[] = fremdOrdnerLesen();

/** Ein Ordner, aus dem ein Grok-Blatt gebaut wird, und die Ordner derselben Figur, die er ersetzt. */
export interface GrokOrdner {
  readonly ordner: string;
  readonly figur: string;
  readonly datum: string;
  readonly ersetzt: readonly string[];
}

/**
 * Je Figur (Zeile `figur` der zuordnung.txt) der neueste Ordner (U2-6): das
 * spätere `datum`, bei gleichem Datum der im Alphabet spätere Ordnername
 * (rammbock_34 nach rammbock). Die übrigen Ordner derselben Figur werden
 * nicht gebaut. Reihenfolge nach Figurname.
 */
export function grokOrdner(ordner: readonly string[] = FREMD_ORDNER, fremd: string = FREMD): GrokOrdner[] {
  const jeFigur = new Map<string, { ordner: string; datum: string }[]>();
  for (const o of ordner) {
    const zu = leseZuordnung(readFileSync(join(fremd, o, 'zuordnung.txt'), 'utf8'));
    const liste = jeFigur.get(zu.figur) ?? [];
    liste.push({ ordner: o, datum: zu.datum });
    jeFigur.set(zu.figur, liste);
  }
  return [...jeFigur.keys()].sort().map((figur) => {
    const liste = (jeFigur.get(figur) as { ordner: string; datum: string }[])
      .slice()
      .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.ordner < b.ordner ? -1 : a.ordner > b.ordner ? 1 : 0));
    const sieger = liste[liste.length - 1] as { ordner: string; datum: string };
    return { ordner: sieger.ordner, figur, datum: sieger.datum, ersetzt: liste.slice(0, -1).map((x) => x.ordner) };
  });
}

/**
 * Grok-Blätter über den Umsetzer v2 (Auftrag 5, Phase 1): je Figur der neueste Ordner unter FREMD.
 * Der Bodenton kommt aus den Hintergrundblättern dieses Baus (bauen) oder, ohne Angabe, aus
 * spiel/grafik/ausgabe/. Getrennt von figuren(), weil das Umsetzen der großen Blätter einige Sekunden dauert.
 */
export function grokErgebnisse(bodenton?: Bodenton | null): GrokErgebnis[] {
  return grokOrdner().map((o) => umsetzenOrdner(join(FREMD, o.ordner), {}, bodenton));
}

/**
 * Animationen eines Grok-Blatts gegen das Blatt der Gliederpuppe derselben Figur (Auftrag 5,
 * Phase 1): gleiche Namen in gleicher Folge, Schleife, Dauern und aktive Bilder, weil die
 * Darstellung (zuordnung.ts) sie so erwartet. Gibt die Abweichungen als Text zurück.
 */
export function grokGegenPuppe(grok: readonly Animation[], puppe: readonly Animation[]): string[] {
  const fehler: string[] = [];
  const g = grok.map((a) => a.name);
  const q = puppe.map((a) => a.name);
  if (g.join(' ') !== q.join(' ')) fehler.push(`Animationen ${g.join(', ')} statt ${q.join(', ')}`);
  for (const a of puppe) {
    const b = grok.find((x) => x.name === a.name);
    if (b === undefined) continue;
    const da = a.bilder.map((x) => x.dauer).join('/');
    const db = b.bilder.map((x) => x.dauer).join('/');
    if (da !== db) fehler.push(`${a.name}: Dauern ${db} statt ${da}`);
    if (a.schleife !== b.schleife) fehler.push(`${a.name}: Schleife ${b.schleife} statt ${a.schleife}`);
    if ((a.aktiv ?? []).join(',') !== (b.aktiv ?? []).join(',')) fehler.push(`${a.name}: aktiv [${(b.aktiv ?? []).join(', ')}] statt [${(a.aktiv ?? []).join(', ')}]`);
  }
  return fehler;
}

/** Name des Gliederpuppen-Blatts zu einem Grok-Blatt (rammbock_grok → rammbock). */
export function puppenName(grokFigur: string): string {
  return grokFigur.endsWith(BLATT_ENDUNG) ? grokFigur.slice(0, -BLATT_ENDUNG.length) : grokFigur;
}

/** Bytes aller Ausgaben eines Grok-Blatts ohne zu schreiben (Blatt, Atlas mit Maßstab, Kontaktbögen 2×). */
export function grokAusgabeBytes(e: GrokErgebnis): Map<string, Uint8Array | string> {
  const aus = new Map<string, Uint8Array | string>();
  const b = grokBytes(e);
  aus.set(`${e.figur}.png`, b.png);
  aus.set(`${e.figur}.json`, b.json);
  for (const a of e.animationen) aus.set(kontaktDatei(e.figur, a.name), pngSchreiben(grokKontaktBogen(a)));
  return aus;
}

/** Datei mit der Liste aller gebauten Blätter unter spiel/grafik/ausgabe/ (Auftrag 5, Phase 1). */
export const BLAETTER_DATEI = 'blaetter.json';

/** blaetter.json: alphabetische Liste der Blattnamen ohne Endung als JSON-Feld, je Name eine Zeile. */
export function blaetterText(namen: Iterable<string>): string {
  const liste = [...new Set(namen)].sort();
  return liste.length === 0 ? '[]\n' : `[\n${liste.map((n) => `  ${JSON.stringify(n)}`).join(',\n')}\n]\n`;
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
 * Baut alle Figuren (Gliederpuppen), die Erzeugnisse und die Grok-Blätter: prüfen, dann
 * schreiben. Wirft bei Befunden; Befunde der weichen Regeln einer Figur und die weichen Befunde
 * der Grok-Blätter gehen gezählt an `hinweis`. Schreibt zuletzt blaetter.json.
 */
export function bauen(optionen: { nurKontakt?: boolean; hinweis?: (zeile: string) => void } = {}): Map<string, string> {
  const alle = new Map<string, string>();
  const blaetter: string[] = [];
  const gebaut = figuren();
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
    blaetter.push(f.name);
  }
  const erzeugt = erzeugnisse();
  for (const e of erzeugt) {
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
    for (const datei of e.ausgabe.keys()) if (datei.endsWith('.png')) blaetter.push(datei.slice(0, -'.png'.length));
    mkdirSync(BILDER, { recursive: true });
    for (const [datei, inhalt] of e.bilder) {
      writeFileSync(join(BILDER, datei), inhalt);
      alle.set(datei, md5(inhalt));
    }
  }
  // Grok-Blätter (Umsetzer v2): Bodenton aus den Hintergrundblättern dieses Baus (Auftrag 5, 4).
  const bodenton = dunkelsterBodenton(hintergrundblaetterAus(new Map(erzeugt.flatMap((e) => [...e.ausgabe]))));
  for (const o of grokOrdner()) {
    if (o.ersetzt.length > 0) optionen.hinweis?.(`Hinweis ${o.figur}: Ordner ${o.ordner} ersetzt ${o.ersetzt.join(', ')} (neuerer Ordner, docs/grafik.md 5.8)`);
  }
  const grok = grokErgebnisse(bodenton);
  for (const e of grok) {
    const hart = e.befunde.filter((b) => b.hart);
    if (hart.length > 0) throw new Error(`Prüfung ${e.figur} verletzt (${hart.length}):\n${hart.map((b) => `  ${b.text}`).join('\n')}`);
    const puppe = gebaut.find((f) => f.name === puppenName(e.figur));
    if (puppe !== undefined) {
      const fehler = grokGegenPuppe(e.animationen, puppe.animationen);
      if (fehler.length > 0) throw new Error(`${e.figur} passt nicht zu ${puppe.name}.json (${fehler.length}):\n${fehler.map((t) => `  ${t}`).join('\n')}`);
    }
    const weich = e.befunde.length - hart.length;
    if (weich > 0) optionen.hinweis?.(`Hinweis ${e.figur}: ${weich} Befunde (Protokoll: node --experimental-strip-types grafik/quelle/umsetzer.ts grafik/quelle/fremd/<ordner>)`);
    for (const [datei, inhalt] of grokAusgabeBytes(e)) {
      const kontakt = datei.startsWith('kontakt_');
      if (!kontakt && optionen.nurKontakt === true) continue;
      const ordner = kontakt ? BILDER : AUSGABE;
      mkdirSync(ordner, { recursive: true });
      writeFileSync(join(ordner, datei), inhalt);
      alle.set(datei, md5(typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : inhalt));
    }
    blaetter.push(e.figur);
  }
  const uebersichtBytes = pngSchreiben(uebersicht(new Map(gebaut.map((f) => [f.name, f.animationen] as const))));
  mkdirSync(BILDER, { recursive: true });
  writeFileSync(join(BILDER, UEBERSICHT_DATEI), uebersichtBytes);
  alle.set(UEBERSICHT_DATEI, md5(uebersichtBytes));
  const vergleich = vergleichBytes(gebaut, grok);
  if (vergleich !== null) {
    mkdirSync(BILDER, { recursive: true });
    writeFileSync(join(BILDER, VERGLEICH_DATEI), vergleich);
    alle.set(VERGLEICH_DATEI, md5(vergleich));
  }
  if (optionen.nurKontakt !== true) {
    const text = blaetterText(blaetter);
    writeFileSync(join(AUSGABE, BLAETTER_DATEI), text);
    alle.set(BLAETTER_DATEI, md5(new TextEncoder().encode(text)));
  }
  return alle;
}

/**
 * Vergleichsbild Rammbock für Haltepunkt 1 von Auftrag 5 (vergleich.ts): Grok-Rammbock (Blatt
 * rammbock_grok, 2×) gegen Gliederpuppe und Vela, als PNG-Bytes, wenn die Blätter vela,
 * rammbock und rammbock_grok gebaut sind; sonst null.
 */
export function vergleichBytes(gebaut: readonly Figur[], grok: readonly GrokErgebnis[]): Uint8Array | null {
  const anim = (name: string): readonly Animation[] | undefined => gebaut.find((f) => f.name === name)?.animationen;
  const g = grok.find((e) => e.figur === `rammbock${BLATT_ENDUNG}`)?.animationen;
  const puppe = anim('rammbock');
  const vela = anim('vela');
  if (g === undefined || puppe === undefined || vela === undefined) return null;
  return pngSchreiben(vergleichRammbock(g, puppe, vela));
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
