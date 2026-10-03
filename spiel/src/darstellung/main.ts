// Browserfassung der Scheibe (Auftrag 3, 2.5): Canvas 2D mit 768 × 448
// Bildpixeln für das Raster 384 × 224 (E25, Auftrag 5: zwei Bildpixel je
// Spielpixel, Zeichenklasse zeichner.ts), ganzzahlig auf das Fenster
// skaliert, Tastatur, Debug-Anzeige, Pause, Eingabeaufzeichnung, Neustart,
// Spielschleife nach E13 und die Debug-Schnittstelle window.comet für
// Playwright.
//
// Die Darstellung liest nur den Kern (Welt, anzeige(welt)) und ruft ihn nur
// über die Sitzung auf (erzeugeWelt, logikSchritt); sie hat keine eigene
// Spiellogik (Auftrag 3, 2.3). Pause, Debug-Anzeige, Aufzeichnung und
// Neustart liegen außerhalb der Logik (Welt 10.4, 10.6, 11.3).
//
// Grafik (Auftrag 4, Phase 3, G7): vor dem ersten Bild lädt sprites.ts die
// Blätter aus grafik/ausgabe/; mit ?platzhalter=1 oder wenn ein Blatt nicht
// lädt (Meldung in der Konsole), zeichnet die Darstellung die Rechtecke. Der
// Verlauf (verlauf.ts) liest die Welt nach jedem Logikschritt für die
// Effekte der Darstellung.
//
// Bedienung: docs/scheibe.md, Abschnitt „Bedienung“.

import type { AnzeigeDaten } from '../kern/rahmen.ts';
import type { Welt } from '../kern/welt.ts';
import type { Steuertaste } from './tastatur.ts';
import type { Grafik } from './sprites.ts';
import type { SpriteDarstellung } from './zeichnen.ts';
import { EINS } from '../kern/festkomma.ts';
import { blickText } from '../kern/entitaeten.ts';
import { anzeige } from '../kern/rahmen.ts';
import { tastenZuText } from '../kern/tasten.ts';
import { protokollSpalten, protokollZeile } from '../pruef/protokoll.ts';
import { parseSzene } from '../pruef/szene.ts';
import { zeichneDebugText, zeichneDebugWelt } from './debug.ts';
import { Takt } from './schleife.ts';
import { BUEHNE, SEED_STANDARD, Sitzung, naechsterSeed } from './sitzung.ts';
import { Tastatur } from './tastatur.ts';
import { ladeGrafik } from './sprites.ts';
import { Verlauf } from './verlauf.ts';
import { zeichneBild, zeichneObersteEbene } from './zeichnen.ts';
import { BILDPIXEL, Zeichner, canvasEinrichten } from './zeichner.ts';

/** Stage-Datei einer Bühne relativ zu index.html (Welt 2.3). */
function stagePfad(buehne: string): string {
  if (!/^[a-z0-9_]+$/.test(buehne)) throw new RangeError(`Bühnenname „${buehne}“ ungültig`);
  return `daten/stages/${buehne}.txt`;
}

/** Geladene Stage-Texte je Bühne. */
const stageTexte = new Map<string, string>();

async function stageLaden(buehne: string): Promise<string> {
  const bekannt = stageTexte.get(buehne);
  if (bekannt !== undefined) return bekannt;
  const pfad = stagePfad(buehne);
  const antwort = await fetch(pfad);
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
  const text = await antwort.text();
  stageTexte.set(buehne, text);
  return text;
}

// ===========================================================================
// Debug-Schnittstelle window.comet
// ===========================================================================

/** Einfache, serialisierbare Sicht auf den Zustand nach dem letzten Logikschritt. */
export interface CometZustand {
  frame: number;
  seed: number;
  /** Name der geladenen Prüfszene, null = Spielstart */
  szene: string | null;
  quelle: 'tastatur' | 'eingabe';
  pause: boolean;
  debug: boolean;
  aufzeichnung: boolean;
  beendet: boolean;
  /** T(f) des letzten Schritts in der Reihenfolge L R O U A S */
  tasten: string;
  figur: {
    x: number;
    z: number;
    h: number;
    lp: number;
    zustand: number;
    aktion: string;
    phase: string;
    blick: 'R' | 'L';
    schutz: number;
    kombo: number;
    waffe: string;
    munition: number;
  };
  gegner: { slot: number; typ: string; x: number; z: number; h: number; lp: number; zustand: number; aktion: string; modus: string; blick: 'R' | 'L' }[];
  objekte: { slot: string; typ: string; art: string; x: number; z: number; h: number }[];
  kamera: { x: number; y: number; modus: string; schuetteln_x: number; schuetteln_y: number };
  rang: { rang: number; zaehler: number };
  rahmen: { leben: number; punkte: number; anzeige: number | null; phase: string; steuerung: number };
  anzeige: AnzeigeDaten;
  /** Zeile von protokoll.csv für den letzten Schritt (gleiche Spalten), leer vor dem ersten */
  protokoll: string;
}

/** window.comet (Auftrag 3, 2.5): Steuerung für Playwright und Tests. */
export interface CometSchnittstelle {
  /** true, sobald die Stage geladen ist */
  bereit: boolean;
  /** Ersetzt die Tastatur durch eine Eingabedatei (Kampf 11.1) und beginnt neu; die Schleife steht dann. Seed: Argument, sonst „# seed=N“ der Datei, sonst der bisherige. */
  ladeEingabe(text: string, seed?: number): CometZustand;
  /** Lädt eine Prüfszene (Kampf 11.2, Format docs/scheibe.md „Formate“) mit Eingabedatei; die Schleife steht. Der Lauf endet nach endframe. */
  ladeSzene(szene: string, eingabe?: string): Promise<CometZustand>;
  /** Führt n Logikschritte aus (unabhängig von der Schleife) und zeichnet das Bild. */
  schritt(n?: number): CometZustand;
  zustand(): CometZustand;
  /** Schaltet die Debug-Anzeige (ohne Argument: umschalten); zeichnet neu. */
  debug(an?: boolean): boolean;
  /** Pause an oder aus (ohne Argument: umschalten). */
  pause(an?: boolean): boolean;
  /** Zurück zur Tastatur, die Schleife läuft vom aktuellen Frame weiter. */
  spielen(): CometZustand;
  /** Neuer Lauf (Standard: Seed + 1) mit Tastatur. */
  neustart(seed?: number): CometZustand;
  /** Eingabedatei des laufenden Spiels (Frames 1 bis frame), wie F2 sie speichert. */
  aufzeichnung(): string;
  /** Spalten von protokoll.csv. */
  spalten(): string[];
}

declare global {
  interface Window {
    comet?: CometSchnittstelle;
  }
}

function zahl(f: number): number {
  return f / EINS;
}

// ===========================================================================
// Spiel: Sitzung, Schleife, Zeichnen
// ===========================================================================

class Spiel {
  readonly sitzung: Sitzung;
  private readonly canvas: HTMLCanvasElement;
  /** Zeichenklasse: Spielkoordinaten auf das Canvas mit 768 × 448 Bildpixeln */
  private readonly zn: Zeichner;
  private readonly tastatur: Tastatur;
  private readonly takt = new Takt();
  /** Sprites (Grafik und Verlauf); null = Rechtecke (?platzhalter=1 oder Rückfall) */
  private readonly sprites: SpriteDarstellung | null;
  debugAn = false;
  pauseAn = false;
  /** Frame, ab dem die laufende Aufzeichnung (F2) markiert ist; null = keine */
  aufzeichnungAb: number | null = null;

  constructor(canvas: HTMLCanvasElement, stageText: string, seed: number, debug: boolean, grafik: Grafik | null) {
    canvasEinrichten(canvas);
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Canvas 2D nicht verfügbar');
    this.canvas = canvas;
    this.zn = new Zeichner(ctx);
    this.debugAn = debug;
    this.sitzung = new Sitzung(stageText, seed);
    this.sprites = grafik === null ? null : { grafik, verlauf: new Verlauf(grafik.atlanten) };
    this.tastatur = new Tastatur(window, (t) => this.steuer(t));
    window.addEventListener('resize', () => this.skalieren());
    document.addEventListener('visibilitychange', () => this.takt.anhalten());
    this.skalieren();
    this.zeichnen();
    requestAnimationFrame((zeit) => this.bild(zeit));
  }

  /**
   * Skalierung des Canvas (768 × 448 Bildpixel) auf die Fenstergröße in
   * Gerätepixeln, schwarzer Rand (Auftrag 3, 2.5; Auftrag 5): ganzzahlig
   * (1×, 2× …) mit image-rendering pixelated, solange das Fenster mindestens
   * 768 × 448 Gerätepixel hat; in einem kleineren Fenster so groß wie es passt
   * und weich verkleinert (image-rendering auto), damit das Spiel sichtbar
   * bleibt (U1-4).
   */
  skalieren(): void {
    const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const passt = Math.min((window.innerWidth * dpr) / BILDPIXEL.breite, (window.innerHeight * dpr) / BILDPIXEL.hoehe);
    const skala = passt >= 1 ? Math.floor(passt) : passt;
    this.canvas.style.width = `${(BILDPIXEL.breite * skala) / dpr}px`;
    this.canvas.style.height = `${(BILDPIXEL.hoehe * skala) / dpr}px`;
    this.canvas.style.imageRendering = passt >= 1 ? '' : 'auto';
  }

  /** Ein Bild der Schleife (E13): Logikschritte nach dem Takt, dann zeichnen. */
  private bild(zeit: number): void {
    if (this.sitzung.quelle === 'tastatur' && !this.pauseAn) {
      const n = this.takt.schritte(zeit);
      for (let i = 0; i < n; i++) this.logikSchritt();
    } else {
      this.takt.anhalten();
    }
    this.zeichnen();
    requestAnimationFrame((z) => this.bild(z));
  }

  /** Ein Logikschritt mit der Tastatur; nach dem Ende der Scheibe Neustart mit Seed + 1 (Welt 10.3, 10.5). */
  private logikSchritt(): void {
    if (this.sitzung.schritt(this.tastatur.abfragen())) this.beobachten();
    if (this.sitzung.welt.beendet && this.sitzung.szene === null) this.neustart(naechsterSeed(this.sitzung.seed));
  }

  private steuer(t: Steuertaste): void {
    switch (t) {
      case 'pause':
        this.pause(!this.pauseAn);
        break;
      case 'debug':
        this.debugAn = !this.debugAn;
        break;
      case 'aufzeichnung':
        if (this.aufzeichnungAb === null) this.aufzeichnungAb = this.sitzung.welt.frame + 1;
        else this.aufzeichnungBeenden();
        break;
      case 'neustart':
        this.sitzung.tastaturNehmen();
        this.neustart(naechsterSeed(this.sitzung.seed));
        break;
      case 'einzelschritt':
        // Welt 10.6: in der Pause ein gewöhnlicher Logikschritt mit dem aktuellen Tastenstand
        if (this.pauseAn && this.sitzung.quelle === 'tastatur') this.logikSchritt();
        break;
    }
    this.zeichnen();
  }

  pause(an: boolean): void {
    this.pauseAn = an;
    this.takt.anhalten();
  }

  /** Neuer Lauf; eine laufende Aufzeichnung endet vorher und wird gespeichert. */
  neustart(seed: number): void {
    if (this.aufzeichnungAb !== null) this.aufzeichnungBeenden();
    this.sitzung.neustart(seed);
    this.takt.anhalten();
  }

  /** Beendet die Aufzeichnung (F2) und bietet die Eingabedatei zum Herunterladen an. */
  private aufzeichnungBeenden(): void {
    const inhalt = this.sitzung.aufzeichnung(this.aufzeichnungAb);
    this.aufzeichnungAb = null;
    const url = URL.createObjectURL(new Blob([inhalt], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `eingabe_seed${this.sitzung.seed}_frame${this.sitzung.welt.frame}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url));
  }

  /** Logikschritte über window.comet (Eingabedatei oder Tastenstand), ohne Neustart am Ende. */
  schritte(n: number): void {
    for (let i = 0; i < n; i++) {
      if (!this.sitzung.schritt(this.tastatur.abfragen())) break;
      this.beobachten();
    }
    this.zeichnen();
  }

  /** Verlauf der Darstellung nach einem Logikschritt (Effekte, Gehframes); liest nur. */
  private beobachten(): void {
    if (this.sprites !== null) this.sprites.verlauf.beobachten(this.sitzung.welt);
  }

  zeichnen(): void {
    const zn = this.zn;
    const welt = this.sitzung.welt;
    // neue Welt (Neustart, Eingabedatei, Prüfszene): der Verlauf beginnt mit ihr neu
    this.beobachten();
    const a = zeichneBild(zn, welt, this.sprites);
    if (this.debugAn) {
      zeichneDebugWelt(zn, welt);
      zeichneDebugText(zn, welt, { seed: this.sitzung.seed, tasten: this.tastatur.stand(), quelle: this.sitzung.quelle, pause: this.pauseAn });
    }
    zeichneObersteEbene(zn, a, { pause: this.pauseAn, aufzeichnung: this.aufzeichnungAb !== null }, this.sprites === null ? null : this.sprites.grafik);
  }

  zustand(): CometZustand {
    const welt: Welt = this.sitzung.welt;
    const f = welt.figur;
    return {
      frame: welt.frame,
      seed: this.sitzung.seed,
      szene: this.sitzung.szene === null ? null : this.sitzung.szene.start.name,
      quelle: this.sitzung.quelle,
      pause: this.pauseAn,
      debug: this.debugAn,
      aufzeichnung: this.aufzeichnungAb !== null,
      beendet: welt.beendet,
      tasten: tastenZuText(welt.eingabe.t),
      figur: {
        x: zahl(f.x),
        z: zahl(f.z),
        h: zahl(f.h),
        lp: f.lp,
        zustand: f.zustand,
        aktion: f.aktion,
        phase: f.phase,
        blick: blickText(f.blick),
        schutz: f.schutz,
        kombo: f.kombo,
        waffe: f.waffe,
        munition: f.munition,
      },
      gegner: welt.gegner
        .filter((g) => g.belegt)
        .map((g) => ({
          slot: g.nr,
          typ: g.typ,
          x: zahl(g.x),
          z: zahl(g.z),
          h: zahl(g.h),
          lp: g.lp,
          zustand: g.zustand,
          aktion: g.aktion,
          modus: g.modus,
          blick: blickText(g.blick),
        })),
      objekte: [...welt.objekte, ...welt.geschosse]
        .filter((o) => o.belegt)
        .map((o) => ({ slot: o.schluessel, typ: o.typ, art: o.art, x: zahl(o.x), z: zahl(o.z), h: zahl(o.h) })),
      kamera: {
        x: welt.kamera.x,
        y: welt.kamera.y,
        modus: welt.kamera.modus,
        schuetteln_x: welt.kamera.schuetteln_x,
        schuetteln_y: welt.kamera.schuetteln_y,
      },
      rang: { rang: welt.rang.rang, zaehler: welt.rang.zaehler },
      rahmen: {
        leben: welt.rahmen.leben,
        punkte: welt.rahmen.punkte,
        anzeige: welt.rahmen.anzeige,
        phase: welt.rahmen.phase,
        steuerung: welt.rahmen.steuerung,
      },
      anzeige: anzeige(welt),
      protokoll: welt.frame === 0 ? '' : protokollZeile(welt),
    };
  }
}

// ===========================================================================
// Start
// ===========================================================================

function meldung(inhalt: string): void {
  const el = document.getElementById('meldung');
  if (el !== null) el.textContent = inhalt;
}

/** Seed aus ?seed=N (Welt 11.1: nicht 0), sonst SEED_STANDARD. */
function seedAusAdresse(p: URLSearchParams): number {
  const n = Number(p.get('seed'));
  return Number.isSafeInteger(n) && n > 0 ? n : SEED_STANDARD;
}

function schnittstelle(spiel: Spiel): CometSchnittstelle {
  return {
    bereit: true,
    ladeEingabe(text: string, seed?: number): CometZustand {
      spiel.sitzung.ladeEingabe(text, seed ?? null);
      spiel.aufzeichnungAb = null;
      spiel.pause(false);
      spiel.zeichnen();
      return spiel.zustand();
    },
    async ladeSzene(szene: string, eingabe: string = ''): Promise<CometZustand> {
      const start = parseSzene(szene);
      const stageText = await stageLaden(start.buehne);
      spiel.sitzung.ladeSzene(start, stageText, eingabe);
      spiel.aufzeichnungAb = null;
      spiel.pause(false);
      spiel.zeichnen();
      return spiel.zustand();
    },
    schritt(n: number = 1): CometZustand {
      spiel.schritte(n);
      return spiel.zustand();
    },
    zustand: () => spiel.zustand(),
    debug(an?: boolean): boolean {
      spiel.debugAn = an ?? !spiel.debugAn;
      spiel.zeichnen();
      return spiel.debugAn;
    },
    pause(an?: boolean): boolean {
      spiel.pause(an ?? !spiel.pauseAn);
      spiel.zeichnen();
      return spiel.pauseAn;
    },
    spielen(): CometZustand {
      spiel.sitzung.tastaturNehmen();
      spiel.pause(false);
      return spiel.zustand();
    },
    neustart(seed?: number): CometZustand {
      spiel.sitzung.tastaturNehmen();
      spiel.neustart(seed ?? naechsterSeed(spiel.sitzung.seed));
      spiel.zeichnen();
      return spiel.zustand();
    },
    aufzeichnung: () => spiel.sitzung.aufzeichnung(),
    spalten: () => protokollSpalten(),
  };
}

/**
 * Grafik laden (Auftrag 4, Phase 3): null mit ?platzhalter=1 oder wenn ein
 * Blatt oder Atlas nicht lädt; dann zeichnet die Darstellung die Rechtecke
 * und meldet den Grund in der Konsole.
 */
async function grafikLaden(p: URLSearchParams): Promise<Grafik | null> {
  if (p.get('platzhalter') === '1') return null;
  try {
    return await ladeGrafik();
  } catch (fehler: unknown) {
    console.error(`Grafik lädt nicht, Rückfall auf die Rechtecke: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
    return null;
  }
}

async function starten(): Promise<void> {
  const canvas = document.getElementById('bild');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas #bild fehlt in index.html');
  const p = new URLSearchParams(window.location.search);
  const [stageText, grafik] = await Promise.all([stageLaden(BUEHNE), grafikLaden(p)]);
  const spiel = new Spiel(canvas, stageText, seedAusAdresse(p), p.get('debug') === '1', grafik);
  canvas.focus();
  window.comet = schnittstelle(spiel);
}

starten().catch((fehler: unknown) => {
  meldung(`Start fehlgeschlagen: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
  throw fehler;
});
