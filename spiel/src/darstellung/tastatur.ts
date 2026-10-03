// Tastatur der Browserfassung (Auftrag 3, 2.5; Kampf 2.1).
//
// Spieltasten: Pfeile = L R O U, Y oder Z = Angriff A, X = Sprung S.
// Steuertasten (außerhalb der Logik, nie aufgezeichnet; Welt 10.4, 10.6,
// 11.3): P Pause, F1 Debug-Anzeige, F2 Eingabeaufzeichnung, F3 Neustart mit
// Seed + 1, N Einzelschritt in der Pause.
//
// T(f) ist der Tastenstand zu Beginn des Logikschritts (abfragen()). Ein
// Druck, der zwischen zwei Abfragen beginnt und endet, zählt in der nächsten
// Abfrage noch als gedrückt, damit kein kurzer Tipp verloren geht
// (Festlegung K6). Die Tasten werden über KeyboardEvent.code erkannt, also
// nach ihrer Lage: Y und Z wirken auf QWERTZ und QWERTY gleich.

import type { Tasten } from '../kern/tasten.ts';
import { KEINE, TASTE_A, TASTE_L, TASTE_O, TASTE_R, TASTE_S, TASTE_U } from '../kern/tasten.ts';

/** Spieltasten nach KeyboardEvent.code. */
const SPIELTASTEN: Readonly<Record<string, Tasten>> = {
  ArrowLeft: TASTE_L,
  ArrowRight: TASTE_R,
  ArrowUp: TASTE_O,
  ArrowDown: TASTE_U,
  KeyY: TASTE_A,
  KeyZ: TASTE_A,
  KeyX: TASTE_S,
};

/** Steuertasten außerhalb der Logik. */
export type Steuertaste = 'pause' | 'debug' | 'aufzeichnung' | 'neustart' | 'einzelschritt';

const STEUERTASTEN: Readonly<Record<string, Steuertaste>> = {
  KeyP: 'pause',
  F1: 'debug',
  F2: 'aufzeichnung',
  F3: 'neustart',
  KeyN: 'einzelschritt',
};

/** Tastenstand der Spieltasten und Weitergabe der Steuertasten. */
export class Tastatur {
  /** je gehaltener Taste (code) ihre Spieltaste */
  private gehalten = new Map<string, Tasten>();
  /** seit der letzten Abfrage neu gedrückt */
  private neu: Tasten = KEINE;
  private readonly steuer: (t: Steuertaste) => void;

  constructor(ziel: Window, steuer: (t: Steuertaste) => void) {
    this.steuer = steuer;
    ziel.addEventListener('keydown', (e) => this.runter(e));
    ziel.addEventListener('keyup', (e) => this.hoch(e));
    ziel.addEventListener('blur', () => this.loslassen());
  }

  private runter(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const spiel = SPIELTASTEN[e.code];
    if (spiel !== undefined) {
      e.preventDefault();
      if (!this.gehalten.has(e.code)) this.neu |= spiel;
      this.gehalten.set(e.code, spiel);
      return;
    }
    const steuer = STEUERTASTEN[e.code];
    if (steuer !== undefined) {
      e.preventDefault();
      if (!e.repeat) this.steuer(steuer);
    }
  }

  private hoch(e: KeyboardEvent): void {
    if (SPIELTASTEN[e.code] !== undefined) e.preventDefault();
    this.gehalten.delete(e.code);
  }

  /** Alle Tasten los (Fenster verliert den Fokus). */
  loslassen(): void {
    this.gehalten.clear();
    this.neu = KEINE;
  }

  /** Gehaltene Spieltasten ohne Abfrage (für die Debug-Anzeige). */
  stand(): Tasten {
    let t = KEINE;
    for (const wert of this.gehalten.values()) t |= wert;
    return t;
  }

  /** T(f): Tastenstand zu Beginn des Logikschritts, dazu Drücke seit der letzten Abfrage. */
  abfragen(): Tasten {
    const t = this.stand() | this.neu;
    this.neu = KEINE;
    return t;
  }
}
