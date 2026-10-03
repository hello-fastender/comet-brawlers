// Verlauf der Darstellung (G7, docs/grafik.md 9): rein visuelle Effekte, die
// länger leben, als der Kern sie kennt (G4-5, G4-8), und Zähler, die das
// Bild eines Zustands über mehrere Frames brauchen (Gehframes der Gegner,
// G2, G3-15). Ohne DOM.
//
// Der Verlauf liest nach jedem Logikschritt die Welt (welt.treffer,
// welt.ereignisse, Bahnen, Behälter) und startet daraus Effekte: Trefferfunke,
// Staub beim Aufprall, Trümmer zerbrochener Behälter, Explosionen der
// Raketen. Er ändert nichts an der Welt; Logik und Protokoll bleiben, wie sie
// sind (Auftrag 3, 2.3). Effekte zählen echte Frames ab ihrem Start (der
// Funke läuft im Trefferstopp weiter, 4.7).

import type { EntitaetBasis, Objekt, SlotKey, Treffer } from '../kern/entitaeten.ts';
import type { Welt } from '../kern/welt.ts';
import type { Atlanten, Wahl } from './zuordnung.ts';
import { entitaet, objektVon } from '../kern/entitaeten.ts';
import { ganz } from '../kern/festkomma.ts';
import { BEHAELTER_HALB_X, BEHAELTER_HOEHE, GEGNER_SLOTS } from '../kern/werte.ts';
import { FUNKE_ABSTAND, FUNKE_HOEHE, FUNKE_HOEHE_STANDARD, FUNKE_OHNE, TRUEMMER_BLINKEN_AB } from './masse.ts';
import { bildZurUhr, dauernVon, summe, waehle } from './zuordnung.ts';

/** Ein laufender Effekt der Darstellung (Blatt objekte). */
export interface Effekt {
  animation: string;
  /** Frame des Starts (Uhr 1) */
  start: number;
  /** Lage in Welt-x, Tiefe und Höhe (ganze px) */
  x: number;
  z: number;
  h: number;
  spiegeln: boolean;
  /** Uhr, ab der der Effekt blinkt (2 sichtbar, 2 unsichtbar), null = nie */
  blinkenAb: number | null;
}

/** Ein Effekt zum Zeichnen in einem Frame: Lage und Wahl. */
export interface EffektBild {
  x: number;
  z: number;
  h: number;
  wahl: Wahl;
}

/** Wirkungen, die einen Funken zeigen (4.7: nicht W, wirkungslos im Schutz). */
const FUNKE_WIRKUNGEN = new Set(['R', 'U', 'X', 'B']);
/** Takt des Trümmerblinkens: 2 Frames sichtbar, 2 unsichtbar (Welt 9.3 wie die Liegezeit; G4-8). */
const BLINK_TAKT = 2;

/** Laufende Effekte und Zähler einer Welt. */
export class Verlauf {
  private readonly atlanten: Atlanten;
  private welt: Welt | null = null;
  private letzter = -1;
  private effekte: Effekt[] = [];
  /** Gehframes je Gegnerslot (G2): Frames seit Beginn des Gehens, 0 = geht nicht */
  private readonly geh: number[] = new Array<number>(GEGNER_SLOTS).fill(0);
  /** bahn_boden je Slot im Vorframe (Aufprall = Wechsel von 0 auf > 0) */
  private readonly boden = new Map<SlotKey, number>();

  constructor(atlanten: Atlanten) {
    this.atlanten = atlanten;
  }

  /** Beginnt neu mit dieser Welt (Neustart, Eingabedatei, Prüfszene) und liest ihren Anfangszustand. */
  zuruecksetzen(welt: Welt): void {
    this.welt = welt;
    this.letzter = -1;
    this.effekte = [];
    this.geh.fill(0);
    this.boden.clear();
    this.beobachten(welt);
  }

  /** Liest den Zustand nach einem Logikschritt; eine andere Welt oder ein Rücksprung setzt zurück. */
  beobachten(welt: Welt): void {
    if (welt !== this.welt || welt.frame < this.letzter) {
      this.welt = welt;
      this.letzter = -1;
      this.effekte = [];
      this.geh.fill(0);
      this.boden.clear();
    }
    if (welt.frame === this.letzter) return;
    this.letzter = welt.frame;
    this.gehZaehlen(welt);
    this.funken(welt);
    this.aufprall(welt);
    this.truemmer(welt);
    this.explosionen(welt);
    this.aufraeumen(welt.frame);
  }

  /** Gehframes des Gegners in Slot nr (0 = geht nicht). */
  gehframes(nr: number): number {
    return this.geh[nr] ?? 0;
  }

  /** Effekte, die im laufenden Frame zu sehen sind, mit ihrer Wahl (unsichtbare Blinkframes ausgelassen). */
  bilder(welt: Welt): EffektBild[] {
    const aus: EffektBild[] = [];
    for (const e of this.effekte) {
      const d = dauernVon(this.atlanten, 'objekte', e.animation);
      if (d === null) continue;
      const u = welt.frame - e.start + 1;
      if (u < 1 || u > summe(d)) continue;
      if (e.blinkenAb !== null && u >= e.blinkenAb && Math.floor((u - e.blinkenAb) / BLINK_TAKT) % 2 === 1) continue;
      aus.push({ x: e.x, z: e.z, h: e.h, wahl: waehle(this.atlanten, 'objekte', e.animation, bildZurUhr(d, u), e.spiegeln) });
    }
    return aus;
  }

  /** Zahl der laufenden Effekte (Tests). */
  get anzahl(): number {
    return this.effekte.length;
  }

  // -------------------------------------------------------------------------

  private starten(e: Effekt): void {
    this.effekte.push(e);
  }

  /** Entfernt abgelaufene Effekte. */
  private aufraeumen(frame: number): void {
    this.effekte = this.effekte.filter((e) => {
      const d = dauernVon(this.atlanten, 'objekte', e.animation);
      return d !== null && frame - e.start + 1 <= summe(d);
    });
  }

  /** Gehframes je Gegner: zählt, solange aktion GEHEN, sonst 0 (G2). */
  private gehZaehlen(welt: Welt): void {
    for (const g of welt.gegner) {
      this.geh[g.nr] = g.belegt && g.aktion === 'GEHEN' ? (this.geh[g.nr] ?? 0) + 1 : 0;
    }
  }

  /**
   * Trefferfunke je wirksamem Treffer des Frames (4.7, G7-4): x = Ziel-x plus
   * FUNKE_ABSTAND zum Angreifer hin (Behälter: ihre halbe Breite), Höhe über
   * dem Ziel nach dem Angriff (masse.ts FUNKE_HOEHE), Tiefe des Ziels.
   */
  private funken(welt: Welt): void {
    for (const t of welt.treffer) {
      if (!FUNKE_WIRKUNGEN.has(t.wirkung) || FUNKE_OHNE.includes(t.code)) continue;
      const ziel = entitaet(welt, t.ziel);
      if (ziel === null) continue;
      const angreifer = entitaet(welt, t.angreifer);
      const zx = ganz(ziel.x);
      const behaelter = t.wirkung === 'B' || t.ziel.startsWith('o');
      const s = richtungZum(ziel, angreifer, t);
      const abstand = behaelter ? BEHAELTER_HALB_X : FUNKE_ABSTAND;
      const hoehe = behaelter ? Math.floor(BEHAELTER_HOEHE / 2) : (FUNKE_HOEHE[t.code] ?? FUNKE_HOEHE_STANDARD);
      this.starten({ animation: 'funke', start: welt.frame, x: zx + s * abstand, z: ganz(ziel.z), h: ganz(ziel.h) + hoehe, spiegeln: s === -1, blinkenAb: null });
    }
  }

  /** Staub beim Aufprall einer Umwerf- oder Wurfbahn, bei der Landung des Neueinstiegs und der Körperpresse (4.7, G7-5). */
  private aufprall(welt: Welt): void {
    const pruefe = (e: EntitaetBasis): void => {
      const vor = this.boden.get(e.schluessel) ?? 0;
      this.boden.set(e.schluessel, e.bahn_boden);
      if (vor === 0 && e.bahn_boden > 0 && e.bahn !== '' && e.bahn_frame === e.bahn_boden) this.staub(welt, e);
    };
    const f = welt.figur;
    pruefe(f);
    if (f.aktion === 'NEUEINSTIEG' && f.landung_ln > 0 && welt.frame === f.landung_ln) this.staub(welt, f);
    for (const g of welt.gegner) {
      if (!g.belegt) {
        this.boden.delete(g.schluessel);
        continue;
      }
      pruefe(g);
      if (g.typ === 'Ballast' && g.boss.kp_landung === welt.frame && g.boss.art === 'KP') this.staub(welt, g);
    }
  }

  private staub(welt: Welt, e: EntitaetBasis): void {
    this.starten({ animation: 'staub', start: welt.frame, x: ganz(e.x), z: ganz(e.z), h: 0, spiegeln: false, blinkenAb: null });
  }

  /** Trümmer eines Behälters im Frame des Zerbrechens h (4.7, G4-8): Bild nach der Trümmeruhr, Blinken ab Uhr 33. */
  private truemmer(welt: Welt): void {
    for (const o of welt.objekte) {
      if (!o.belegt || o.typ !== 'Behälter' || !o.zerbrochen || o.zerbrochen_h !== welt.frame) continue;
      const name = o.art === 'Bosskiste' ? 'bosskiste_truemmer' : 'fass_truemmer';
      this.starten({ animation: name, start: welt.frame, x: ganz(o.x), z: ganz(o.z), h: 0, spiegeln: false, blinkenAb: TRUEMMER_BLINKEN_AB });
    }
  }

  /** Explosion einer Rakete beim Einschlag (Ereignis EX:gn bzw. EX:on; 4.7, G4-5): Anker am Einschlagpunkt am Boden. */
  private explosionen(welt: Welt): void {
    for (const ev of welt.ereignisse) {
      if (!ev.startsWith('EX:')) continue;
      const slot = ev.slice(3) as SlotKey;
      const o: Objekt | null = objektVon(welt, slot);
      if (o === null || !o.belegt) continue;
      const name = slot.startsWith('g') ? 'explosion' : 'explosion_zuender';
      this.starten({ animation: name, start: welt.frame, x: o.einschlag_x, z: o.einschlag_z, h: 0, spiegeln: o.bahn_richtung === -1, blinkenAb: null });
    }
  }
}

/** Richtung vom Ziel zum Angreifer (+1 rechts, −1 links): nach den Lagen, bei gleichem x gegen den Blick des Angreifers. */
function richtungZum(ziel: EntitaetBasis, angreifer: EntitaetBasis | null, t: Treffer): 1 | -1 {
  if (angreifer !== null) {
    const d = ganz(angreifer.x) - ganz(ziel.x);
    if (d > 0) return 1;
    if (d < 0) return -1;
    return angreifer.blick === 1 ? -1 : 1;
  }
  return t.richtung === 1 ? -1 : 1;
}
