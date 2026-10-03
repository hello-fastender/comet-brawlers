// Sitzung der Browserfassung: ein Lauf der Scheibe ab Spielstart
// (standardStart, Welt 11.3) oder ab einer Prüfszene (Kampf 11.2) mit
// Tastatur oder Eingabedatei (Kampf 11.1), dazu der Verlauf T(1) … T(f) für
// die Eingabeaufzeichnung. Ohne DOM.
//
// Die Sitzung ruft nur erzeugeWelt und logikSchritt des Kerns; sie liest die
// Welt, ändert sie aber nie selbst (Auftrag 3, 2.3: Protokoll vor
// Darstellung). T(f) aus einer Eingabedatei wird wie im Prüflauf bestimmt
// (src/pruef/pruefung.ts), deshalb ergeben Browser und Prüflauf dieselben
// Protokollzeilen.

import type { Pruefstart } from '../kern/start.ts';
import type { Tasten } from '../kern/tasten.ts';
import type { Welt } from '../kern/welt.ts';
import type { Eingabefolge } from '../pruef/eingabe.ts';
import { KEINE } from '../kern/tasten.ts';
import { parseStage } from '../kern/stage.ts';
import { standardStart } from '../kern/start.ts';
import { erzeugeWelt, logikSchritt } from '../kern/welt.ts';
import { eingabeText, parseEingabe, tastenIn } from '../pruef/eingabe.ts';

/** Bühne der Browserfassung (Welt 2.3). */
export const BUEHNE = 'scheibe';
/** Seed beim Laden der Seite ohne Angabe (Welt 11.1: 0 ist verboten). */
export const SEED_STANDARD = 1;
/** Größter Seed (32-Bit-Zustand des Generators, Welt 11.1). */
const SEED_MAX = 0xffffffff;

/** Seed + 1 für einen Neustart (F3, Game Over; Welt 10.3); 0 wird übersprungen. */
export function naechsterSeed(seed: number): number {
  const n = seed >= SEED_MAX ? 1 : seed + 1;
  return n === 0 ? 1 : n;
}

/** Liest einen Seed aus einer Kommentarzeile „# seed=N“ der Eingabedatei (Festlegung K6), sonst null. */
export function seedAusEingabe(text: string): number | null {
  const m = /^#\s*seed\s*=\s*(\d+)\s*$/m.exec(text);
  if (m === null) return null;
  const seed = Number(m[1]);
  return Number.isSafeInteger(seed) && seed > 0 && seed <= SEED_MAX ? seed : null;
}

/** Herkunft von T(f): Tastatur oder Eingabedatei. */
export type Quelle = 'tastatur' | 'eingabe';

/** Geladene Prüfszene: Anfangszustand und Text ihrer Stage. */
interface Szene {
  start: Pruefstart;
  stageText: string;
}

/** Ein Lauf der Scheibe in der Browserfassung. */
export class Sitzung {
  /** Stage-Datei der Bühne scheibe (Spielstart) */
  readonly stageText: string;
  seed: number;
  welt: Welt;
  /** T(f) je gelaufenem Frame, Index = Frame (Index 0 unbenutzt) */
  verlauf: Tasten[];
  /** geladene Eingabedatei oder null (Tastatur) */
  folge: Eingabefolge | null;
  /** geladene Prüfszene oder null (Spielstart) */
  szene: Szene | null;

  constructor(stageText: string, seed: number = SEED_STANDARD) {
    this.stageText = stageText;
    this.seed = seed;
    this.folge = null;
    this.szene = null;
    this.verlauf = [KEINE];
    this.welt = erzeugeWelt(parseStage(stageText), standardStart(seed, BUEHNE));
  }

  get quelle(): Quelle {
    return this.folge === null ? 'tastatur' : 'eingabe';
  }

  /** Neuer Lauf ab Spielstart (Frame 0) mit diesem Seed; die Quelle bleibt. */
  neustart(seed: number = this.seed): void {
    this.seed = seed;
    this.szene = null;
    this.welt = erzeugeWelt(parseStage(this.stageText), standardStart(seed, BUEHNE));
    this.verlauf = [KEINE];
  }

  /**
   * Lädt eine Eingabedatei (Kampf 11.1) und beginnt ab Spielstart neu. Seed:
   * das Argument, sonst „# seed=N“ aus der Datei, sonst der bisherige.
   */
  ladeEingabe(text: string, seed: number | null = null): void {
    this.folge = parseEingabe(text);
    this.neustart(seed ?? seedAusEingabe(text) ?? this.seed);
  }

  /**
   * Lädt eine Prüfszene (Kampf 11.2, gelesen von src/pruef/szene.ts) mit dem
   * Text ihrer Stage und einer Eingabedatei und beginnt bei Frame 0. Der Lauf
   * endet wie der Prüflauf nach endframe.
   */
  ladeSzene(start: Pruefstart, stageText: string, eingabe: string): void {
    this.folge = parseEingabe(eingabe);
    this.szene = { start, stageText };
    this.seed = start.seed;
    this.welt = erzeugeWelt(parseStage(stageText), start);
    this.verlauf = [KEINE];
  }

  /** Zurück zur Tastatur; der Lauf geht vom aktuellen Frame aus weiter. */
  tastaturNehmen(): void {
    this.folge = null;
  }

  /** Ist der Lauf zu Ende (Welt 10.5, Game Over; bei einer Prüfszene nach endframe)? */
  get amEnde(): boolean {
    if (this.welt.beendet) return true;
    return this.szene !== null && this.welt.frame >= this.szene.start.endframe;
  }

  /**
   * Ein Logikschritt f = frame + 1 (Kampf 2.1). T(f) kommt aus der
   * Eingabedatei, sonst aus dem übergebenen Tastenstand. Am Ende des Laufs
   * läuft kein Schritt mehr; Rückgabe false.
   */
  schritt(tastatur: Tasten): boolean {
    if (this.amEnde) return false;
    const f = this.welt.frame + 1;
    const t = this.folge === null ? tastatur : tastenIn(this.folge, f);
    logikSchritt(this.welt, t);
    this.verlauf.push(this.welt.eingabe.t);
    return true;
  }

  /** T(f) des Verlaufs; nicht gelaufene Frames ohne Taste. */
  tastenVon(f: number): Tasten {
    return this.verlauf[f] ?? KEINE;
  }

  /**
   * Eingabedatei (Kampf 11.1) des laufenden Spiels, Frames 1 bis zum
   * aktuellen Frame, damit sie sich ab Spielstart abspielen lässt. Der Kopf
   * nennt Seed und Bühne (Zeile „# seed=N“ liest ladeEingabe wieder) und den
   * markierten Bereich der Aufzeichnung (F2).
   */
  aufzeichnung(markiertAb: number | null = null): string {
    const bis = this.welt.frame;
    const kopf = [
      'Comet Brawlers, Eingabeaufzeichnung der Browserfassung (Format docs/spezifikation-kampf.md, 11.1)',
      `seed=${this.seed}`,
      this.szene === null ? `buehne=${BUEHNE} ab Spielstart` : `szene=${this.szene.start.name} buehne=${this.szene.start.buehne}`,
      `frames=1 bis ${bis}`,
    ];
    if (markiertAb !== null) kopf.push(`aufzeichnung=${markiertAb} bis ${bis} (F2)`);
    return eingabeText((f) => this.tastenVon(f), bis, kopf.join('\n'));
  }
}
