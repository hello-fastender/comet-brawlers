// Hilfen der Abnahmetests (K5, Stufe 3): Prüflauf über src/pruef/ mit einer
// Prüfszene aus tests/szenen/ und einer Eingabedatei aus tests/eingaben/,
// Zugriff auf die Protokollzellen (protokoll.csv, objekte.csv) und eine
// Prüfung, die alle Abweichungen eines Tests sammelt, statt beim ersten
// Fehler abzubrechen (Toleranz keine: verglichen wird der Text der Zelle).
//
// Keine Testdatei (das Muster *.test.ts trifft sie nicht).

import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { md5 } from '../src/pruef/md5.ts';
import type { PruefErgebnis } from '../src/pruef/pruefung.ts';
import { lies, lauf, SPIEL } from './hilfe.ts';

/** Ordner der Abnahmeszenen und Eingabedateien relativ zu spiel/. */
export const SZENEN = 'tests/szenen/';
export const EINGABEN = 'tests/eingaben/';
export const REFERENZ = 'tests/referenz/';

/** Eine Zeile von objekte.csv als Feldname → Wert. */
export type ObjektZeile = Record<string, string>;

/** Ergebnis eines Abnahmelaufs mit Zugriff auf die Protokollzellen. */
export class AbnahmeLauf {
  readonly name: string;
  readonly ergebnis: PruefErgebnis;
  readonly protokoll: string;
  readonly objekte: string;
  readonly spalten: string[];
  readonly kopf: string[];
  /** Datenzeilen je Frame (Frame → Felder) */
  readonly zeilen = new Map<number, string[]>();
  /** Frames in Reihenfolge des Protokolls */
  readonly frames: number[] = [];
  /** Objektzeilen je Frame (Frame → Slot → Zeile) */
  readonly objektZeilen = new Map<number, Map<string, ObjektZeile>>();
  private readonly index = new Map<string, number>();

  constructor(name: string, ergebnis: PruefErgebnis) {
    this.name = name;
    this.ergebnis = ergebnis;
    this.protokoll = ergebnis.protokoll;
    this.objekte = ergebnis.objekte;
    const p = zerlegeCsv(ergebnis.protokoll);
    this.kopf = p.kopf;
    this.spalten = p.spalten;
    this.spalten.forEach((s, i) => this.index.set(s, i));
    const iFrame = this.spalte('frame');
    for (const z of p.zeilen) {
      const f = Number(z[iFrame]);
      this.zeilen.set(f, z);
      this.frames.push(f);
    }
    const o = zerlegeCsv(ergebnis.objekte);
    for (const z of o.zeilen) {
      const zeile: ObjektZeile = {};
      o.spalten.forEach((s, i) => (zeile[s] = z[i] ?? ''));
      const f = Number(zeile['frame']);
      let jeSlot = this.objektZeilen.get(f);
      if (jeSlot === undefined) {
        jeSlot = new Map();
        this.objektZeilen.set(f, jeSlot);
      }
      jeSlot.set(zeile['slot'] as string, zeile);
    }
  }

  /** Index einer Spalte; wirft, wenn es sie nicht gibt. */
  spalte(name: string): number {
    const i = this.index.get(name);
    if (i === undefined) throw new Error(`${this.name}: Spalte ${name} fehlt im Protokoll`);
    return i;
  }

  /** Gibt es diesen Frame im Protokoll? */
  hat(frame: number): boolean {
    return this.zeilen.has(frame);
  }

  /** Wert einer Protokollzelle; undefined, wenn der Frame fehlt. */
  wert(frame: number, spalte: string): string | undefined {
    const z = this.zeilen.get(frame);
    if (z === undefined) return undefined;
    return z[this.spalte(spalte)] ?? '';
  }

  /** Einträge der Spalte ereignis eines Frames. */
  ereignisse(frame: number): string[] {
    const e = this.wert(frame, 'ereignis');
    if (e === undefined || e === '') return [];
    return e.split(';');
  }

  /** Objektzeile eines Slots (o20 … o59, g0 … g4) in einem Frame, sonst undefined. */
  objekt(frame: number, slot: string): ObjektZeile | undefined {
    return this.objektZeilen.get(frame)?.get(slot);
  }

  /** Alle Objektzeilen eines Frames. */
  objekteIn(frame: number): ObjektZeile[] {
    return [...(this.objektZeilen.get(frame)?.values() ?? [])];
  }

  /** Erster Frame, dessen Ereignisse einen Eintrag erfüllen; 0, wenn keiner. */
  ersterFrameMit(test: (eintrag: string) => boolean): number {
    for (const f of this.frames) if (this.ereignisse(f).some(test)) return f;
    return 0;
  }

  /** Letzter Frame des Protokolls. */
  letzterFrame(): number {
    return this.frames[this.frames.length - 1] ?? 0;
  }
}

/** Kopf, Spalten und Datenzeilen einer CSV-Datei mit Kommentarkopf. */
export function zerlegeCsv(text: string): { kopf: string[]; spalten: string[]; zeilen: string[][] } {
  const alle = text.split('\n');
  if (alle[alle.length - 1] === '') alle.pop();
  const kopf = alle.filter((z) => z.startsWith('#'));
  const daten = alle.filter((z) => !z.startsWith('#'));
  return { kopf, spalten: (daten[0] ?? '').split(','), zeilen: daten.slice(1).map((z) => z.split(',')) };
}

/** Texte von Szene und Eingabedatei eines Abnahmelaufs (Dateiname ohne .txt). */
export function abnahmeDateien(name: string): { szene: string; eingabe: string } {
  return { szene: lies(`${SZENEN}${name}.txt`), eingabe: lies(`${EINGABEN}${name}.txt`) };
}

/** Prüflauf (Kampf 11.2) mit tests/szenen/<name>.txt und tests/eingaben/<name>.txt. */
export function abnahmeLauf(name: string): AbnahmeLauf {
  const d = abnahmeDateien(name);
  return new AbnahmeLauf(name, lauf(d.szene, d.eingabe));
}

/** MD5 beider Protokolle eines Laufs (Kampf 11.6). */
export function md5Paar(l: { protokoll: string; objekte: string }): { protokoll: string; objekte: string } {
  return { protokoll: md5(l.protokoll), objekte: md5(l.objekte) };
}

/** Namen aller Abnahmeszenen (ohne .txt), deren Name mit einem der Präfixe beginnt, sortiert. */
export function abnahmeSzenen(praefix: RegExp): string[] {
  return readdirSync(SPIEL + SZENEN)
    .filter((d) => d.endsWith('.txt'))
    .map((d) => d.slice(0, -'.txt'.length))
    .filter((n) => praefix.test(n))
    .sort();
}

/** Spaltenwerte, die ein Frame erfüllen soll. */
export type Erwartung = Record<string, string>;

/**
 * Sammelt die Abweichungen eines Abnahmetests (bei Läufen mit Präfix „Lauf a“
 * usw.) und meldet am Ende alle auf einmal: Frame, Spalte, erwartet, ist.
 */
export class Pruefung {
  readonly fehler: string[] = [];
  private l: AbnahmeLauf;
  private praefix: string;

  constructor(l: AbnahmeLauf, praefix: string = '') {
    this.l = l;
    this.praefix = praefix;
  }

  /** Wechselt zum Lauf einer Teilprüfung (Läufe a, b, c …). */
  lauf(l: AbnahmeLauf, praefix: string): this {
    this.l = l;
    this.praefix = praefix;
    return this;
  }

  get aktuell(): AbnahmeLauf {
    return this.l;
  }

  /** Vermerkt eine Abweichung. */
  melde(text: string): void {
    this.fehler.push(this.praefix === '' ? text : `${this.praefix}: ${text}`);
  }

  private frameDa(frame: number): boolean {
    if (this.l.hat(frame)) return true;
    this.melde(`Frame ${frame} fehlt im Protokoll (letzter Frame ${this.l.letzterFrame()})`);
    return false;
  }

  /** Zelle (frame, spalte) gleich dem erwarteten Text. */
  gleich(frame: number, spalte: string, erwartet: string): void {
    if (!this.frameDa(frame)) return;
    const ist = this.l.wert(frame, spalte);
    if (ist !== erwartet) this.melde(`Frame ${frame}, ${spalte}: erwartet „${erwartet}“, ist „${ist}“`);
  }

  /** Mehrere Zellen eines Frames. */
  werte(frame: number, erwartung: Erwartung): void {
    for (const [s, w] of Object.entries(erwartung)) this.gleich(frame, s, w);
  }

  /** Dieselben Zellen in allen Frames von bis bis (einschließlich); meldet den ersten abweichenden Frame je Spalte. */
  bereich(von: number, bis: number, erwartung: Erwartung): void {
    for (const [s, w] of Object.entries(erwartung)) {
      for (let f = von; f <= bis; f++) {
        if (!this.frameDa(f)) break;
        const ist = this.l.wert(f, s);
        if (ist !== w) {
          this.melde(`Frames ${von} bis ${bis}, ${s}: erwartet „${w}“, in Frame ${f} „${ist}“`);
          break;
        }
      }
    }
  }

  /** Eine Spalte nimmt in den Frames von bis die Werte der Liste an (Frame von = erster Wert). */
  folge(von: number, spalte: string, werte: string[]): void {
    werte.forEach((w, i) => this.gleich(von + i, spalte, w));
  }

  /** Die Ereignisse des Frames enthalten den Eintrag genau so. */
  ereignis(frame: number, eintrag: string): void {
    if (!this.frameDa(frame)) return;
    const e = this.l.ereignisse(frame);
    if (!e.includes(eintrag)) this.melde(`Frame ${frame}, ereignis: erwartet „${eintrag}“, ist „${e.join(';')}“`);
  }

  /** Die Ereignisse des Frames enthalten einen Eintrag, der dem Muster entspricht. */
  ereignisMuster(frame: number, muster: RegExp): void {
    if (!this.frameDa(frame)) return;
    const e = this.l.ereignisse(frame);
    if (!e.some((x) => muster.test(x))) this.melde(`Frame ${frame}, ereignis: erwartet ${muster}, ist „${e.join(';')}“`);
  }

  /** Kein Eintrag des Frames entspricht dem Muster. */
  keinEreignis(frame: number, muster: RegExp): void {
    if (!this.frameDa(frame)) return;
    const e = this.l.ereignisse(frame).filter((x) => muster.test(x));
    if (e.length > 0) this.melde(`Frame ${frame}, ereignis: kein ${muster} erwartet, ist „${e.join(';')}“`);
  }

  /** Objektzeile eines Slots mit den erwarteten Feldern. */
  objekt(frame: number, slot: string, erwartung: Erwartung): void {
    const o = this.l.objekt(frame, slot);
    if (o === undefined) {
      this.melde(`Frame ${frame}, Objekt ${slot}: erwartet belegt, ist frei`);
      return;
    }
    for (const [s, w] of Object.entries(erwartung)) {
      if (o[s] !== w) this.melde(`Frame ${frame}, Objekt ${slot}.${s}: erwartet „${w}“, ist „${o[s]}“`);
    }
  }

  /** Slot im Objektprotokoll frei (keine Zeile). */
  objektFrei(frame: number, slot: string): void {
    const o = this.l.objekt(frame, slot);
    if (o !== undefined) this.melde(`Frame ${frame}, Objekt ${slot}: erwartet frei, ist belegt (${Object.values(o).join(',')})`);
  }

  /** Bedingung; bei false eine Meldung. */
  wahr(bedingung: boolean, text: string): void {
    if (!bedingung) this.melde(text);
  }

  /** Meldet alle gesammelten Abweichungen als einen Fehlschlag. */
  ende(): void {
    assert.deepEqual(this.fehler, [], `${this.fehler.length} Abweichung(en):\n${this.fehler.join('\n')}`);
  }
}

/** Zahl einer Protokollzelle (Festkomma-Dezimaltext) abgerundet auf ganze Pixel (⌊v⌋, Kampf 2.3). */
export function ganzzahlig(text: string | undefined): number {
  if (text === undefined || text === '') return Number.NaN;
  return Math.floor(Number(text));
}
