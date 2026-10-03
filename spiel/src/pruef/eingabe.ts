// Eingabedatei nach docs/spezifikation-kampf.md, 11.1.
//
// Textdatei, UTF-8, Zeilenende LF. Zeilen mit # sind Kommentare. Jede
// Datenzeile: von,bis,tasten mit Buchstaben aus L R O U A S (Reihenfolge
// beliebig), gedrückt in allen Frames von bis bis einschließlich.
// Überlappende Zeilen werden vereinigt; nicht genannte Frames haben keine
// Taste. Die Aufzeichnung schreibt je Lauf gleicher Tastenmengen eine Zeile,
// aufsteigend nach von. Ohne Node-APIs (auch für die Darstellung).

import type { Tasten } from '../kern/tasten.ts';
import { KEINE, tastenAusText, tastenZuText } from '../kern/tasten.ts';

/** Gelesene Eingabedatei: T(f) für jeden Frame. */
export interface Eingabefolge {
  /** Tastenmenge je Frame; Index = Frame, Index 0 unbenutzt */
  tasten: Tasten[];
  /** größter genannter Frame (0 ohne Datenzeile) */
  letzter: number;
}

/** Liest eine Eingabedatei (Kampf 11.1). Wirft bei fehlerhaften Zeilen. */
export function parseEingabe(text: string): Eingabefolge {
  const laeufe: { von: number; bis: number; t: Tasten }[] = [];
  const zeilen = text.replace(/^﻿/, '').split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = (zeilen[i] as string).replace(/\r$/, '').trim();
    if (zeile === '' || zeile.startsWith('#')) continue;
    const m = /^(\d+)\s*,\s*(\d+)\s*,\s*([A-Za-z]*)$/.exec(zeile);
    if (m === null) throw new SyntaxError(`Eingabe Zeile ${i + 1}: erwartet „von,bis,tasten“, gelesen „${zeile}“`);
    const von = Number(m[1]);
    const bis = Number(m[2]);
    if (von < 1 || bis < von) throw new SyntaxError(`Eingabe Zeile ${i + 1}: von muss ≥ 1 und bis ≥ von sein`);
    let t: Tasten;
    try {
      t = tastenAusText(m[3] as string);
    } catch (fehler) {
      throw new SyntaxError(`Eingabe Zeile ${i + 1}: ${(fehler as Error).message}`);
    }
    laeufe.push({ von, bis, t });
  }
  let letzter = 0;
  for (const l of laeufe) if (l.bis > letzter) letzter = l.bis;
  const tasten: Tasten[] = new Array<Tasten>(letzter + 1).fill(KEINE);
  for (const l of laeufe) for (let f = l.von; f <= l.bis; f++) tasten[f] = (tasten[f] as Tasten) | l.t;
  return { tasten, letzter };
}

/** T(f) aus der Eingabefolge; nicht genannte Frames haben keine Taste. */
export function tastenIn(folge: Eingabefolge, f: number): Tasten {
  return folge.tasten[f] ?? KEINE;
}

/**
 * Schreibt eine Eingabedatei (Kampf 11.1) aus T(1) bis T(bis): je Lauf
 * gleicher, nicht leerer Tastenmengen eine Zeile, aufsteigend nach von.
 */
export function eingabeText(tastenVon: (f: number) => Tasten, bis: number, kommentar: string = ''): string {
  const zeilen: string[] = [];
  if (kommentar !== '') for (const k of kommentar.split('\n')) zeilen.push(`# ${k}`);
  let f = 1;
  while (f <= bis) {
    const t = tastenVon(f);
    let ende = f;
    while (ende + 1 <= bis && tastenVon(ende + 1) === t) ende += 1;
    if (t !== KEINE) zeilen.push(`${f},${ende},${tastenZuText(t)}`);
    f = ende + 1;
  }
  return zeilen.length === 0 ? '' : zeilen.join('\n') + '\n';
}
