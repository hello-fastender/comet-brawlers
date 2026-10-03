// Gemeinsame Bausteine der Nahkämpfer als Gliederpuppe (Auftrag 4, 2.4 und 3;
// Phase 2, G2): Bolzer (figuren/bolzer.ts, mit Puppe) und Rammbock
// (figuren/rammbock.ts). Beide Figuren haben dieselbe Gliederkette (Becken,
// Rumpf, Kopf, je zwei Arme mit Faust und Beine mit Stiefel) und dieselbe
// Zuordnung zur Logik (docs/grafik.md 4.2 bis 4.4). Hier stehen:
//
// - Haltung → Pose über zwei Gelenke je Glied (wie figuren/vela.ts und der
//   Rammbock aus Phase 1), Zwischenbild über gemischte Eingaben (G0-8);
// - Gehzyklus mit festem Standfuß (Auftrag 4, 1.4);
// - die Gesichtsmaske, gedreht in Vierteldrehungen, wenn der Kopf liegt;
// - die Dauern aller Zustände aus src/kern/werte.ts (Startup, aktive Frames,
//   Rückzug, Trefferreaktion, Flugbahnen F1 bis F4, Aufstehen, Spott).
//
// Keine Farbwerte und keine Figurmaße in dieser Datei.

import type { Animation, Bild } from '../blatt.ts';
import type { Punkt } from '../geometrie.ts';
import { drehe } from '../geometrie.ts';
import type { Pixel } from '../leinwand.ts';
import { streupixelEntfernen } from '../kontur.ts';
import type { Gerastert, Gesicht, Lage, Pose, Puppe } from '../puppe.ts';
import {
  AUFSTEHEN_GEGNER,
  F1_BODEN,
  F1_GH,
  F1_RUHE,
  F1_STILLSTAND,
  F1_VH,
  F2_BODEN,
  F2_RUHE,
  F3_BODEN,
  F3_ERSTER,
  F3_RUHE,
  F4_BODEN,
  F4_RUHE,
  F4_STILLSTAND,
  NAH_ANGRIFFE,
  REAKTION_ANIMATION,
  REAKTION_DAUER,
  SLOT_FREI_TOD,
  SPOTT_DAUER,
  SPRUNGTRITT_AUFSETZEN,
  WURF_LOSLASSEN,
} from '../../../src/kern/werte.ts';

export const P = (x: number, y: number): Punkt => ({ x, y });

// ===========================================================================
// Haltung und Pose
// ===========================================================================

/** Arm: Ziel des Handgelenks (Figurkoordinaten oder relativ zur Schulter), Weltwinkel der Faust. */
export interface Arm {
  readonly ziel: Punkt;
  readonly hand?: number;
  /** true: ziel relativ zum Schultergelenk statt zum Fußpunkt. */
  readonly schulter?: boolean;
}

/** Bein: Knöchel (Figurkoordinaten) und Weltwinkel des Stiefels (0 flach, + Spitze hoch, − Ferse hoch). */
export interface Bein {
  readonly knoechel: Punkt;
  readonly fuss: number;
}

/** Haltung: Eingaben, aus denen die Pose (Gelenkwinkel) berechnet wird. */
export interface Haltung {
  readonly huefte: Punkt;
  /** Weltwinkel des Beckens (Wurzel; 0 aufrecht, +90 auf dem Rücken mit dem Kopf nach hinten). */
  readonly becken?: number;
  /** Rumpf relativ zum Becken (negativ: nach vorn geneigt). */
  readonly rumpf: number;
  /** Kopf relativ zum Rumpf. */
  readonly kopf: number;
  readonly armV: Arm;
  readonly armH: Arm;
  readonly beinV: Bein;
  readonly beinH: Bein;
  readonly versatz?: Pose['versatz'];
  readonly ebenen?: Pose['ebenen'];
  readonly formen?: Pose['formen'];
  readonly versteckt?: Pose['versteckt'];
  /** Gesichtsmaske (Schlüssel im Stil der Figur, Vorgabe 'normal'); 'keins': ohne Gesicht. */
  readonly gesicht?: string;
}

/** Beuge der Gelenke: Knie nach vorn, Ellbogen nach unten und hinten. */
const KNIE: 1 = 1;
const ELLBOGEN: -1 = -1;

/** Rechnet eine Haltung in eine Pose um (Beine und Arme über zwei Gelenke, Puppe mit Becken, Rumpf, Kopf, *V/*H). */
export function pose(pu: Puppe, h: Haltung): Pose {
  let p: Pose = {
    wurzel: h.huefte,
    winkel: { Becken: h.becken ?? 0, Rumpf: h.rumpf, Kopf: h.kopf },
    ...(h.versatz !== undefined ? { versatz: h.versatz } : {}),
    ...(h.ebenen !== undefined ? { ebenen: h.ebenen } : {}),
    ...(h.formen !== undefined ? { formen: h.formen } : {}),
    ...(h.versteckt !== undefined ? { versteckt: h.versteckt } : {}),
    ...(h.gesicht === 'keins' ? { ohneGesicht: true } : {}),
  };
  const mit = (w: Record<string, number>): void => {
    p = { ...p, winkel: { ...p.winkel, ...w } };
  };
  for (const s of ['V', 'H'] as const) {
    const b = s === 'V' ? h.beinV : h.beinH;
    mit(pu.zweiGelenke(p, `Oberschenkel${s}`, `Unterschenkel${s}`, `Stiefel${s}`, b.knoechel, KNIE));
    mit(pu.weltWinkel(p, `Stiefel${s}`, b.fuss));
    const a = s === 'V' ? h.armV : h.armH;
    let ziel = a.ziel;
    if (a.schulter === true) {
      const sch = (pu.lagen(p).get(`Oberarm${s}`) as Lage).pos;
      ziel = P(sch.x + a.ziel.x, sch.y + a.ziel.y);
    }
    mit(pu.zweiGelenke(p, `Oberarm${s}`, `Unterarm${s}`, `Hand${s}`, ziel, ELLBOGEN));
    if (a.hand !== undefined) mit(pu.weltWinkel(p, `Hand${s}`, a.hand));
  }
  return p;
}

/** Ziel des Handgelenks in Figurkoordinaten (Schulterangaben aufgelöst). */
function armAbsolut(pu: Puppe, h: Haltung, seite: 'V' | 'H'): Arm {
  const a = seite === 'V' ? h.armV : h.armH;
  if (a.schulter !== true) return a;
  const sch = (pu.lagen(pose(pu, h)).get(`Oberarm${seite}`) as Lage).pos;
  return { ziel: P(sch.x + a.ziel.x, sch.y + a.ziel.y), ...(a.hand !== undefined ? { hand: a.hand } : {}) };
}

/**
 * Zwischenbild zwischen zwei Schlüsselhaltungen (Auftrag 4, 2.4: höchstens
 * ein Zwischenbild): Eingaben gemischt, dann über die Gelenke gelöst, damit
 * stehende Füße am Boden bleiben (docs/grafik.md 7, G0-8).
 */
export function zwischen(pu: Puppe, a: Haltung, b: Haltung, t: number = 0.5): Haltung {
  const m = (x: number, y: number): number => x + (y - x) * t;
  const mp = (p: Punkt, q: Punkt): Punkt => P(m(p.x, q.x), m(p.y, q.y));
  const arm = (seite: 'V' | 'H'): Arm => {
    const p = armAbsolut(pu, a, seite);
    const q = armAbsolut(pu, b, seite);
    const hand = p.hand !== undefined && q.hand !== undefined ? m(p.hand, q.hand) : (q.hand ?? p.hand);
    return { ziel: mp(p.ziel, q.ziel), ...(hand !== undefined ? { hand } : {}) };
  };
  const bein = (p: Bein, q: Bein): Bein => ({ knoechel: mp(p.knoechel, q.knoechel), fuss: m(p.fuss, q.fuss) });
  const versatz: Record<string, Punkt> = {};
  const va = a.versatz ?? {};
  const vb = b.versatz ?? {};
  for (const k of new Set([...Object.keys(va), ...Object.keys(vb)])) versatz[k] = mp(va[k] ?? P(0, 0), vb[k] ?? P(0, 0));
  const naeher = t < 0.5 ? a : b;
  return {
    huefte: mp(a.huefte, b.huefte),
    becken: m(a.becken ?? 0, b.becken ?? 0),
    rumpf: m(a.rumpf, b.rumpf),
    kopf: m(a.kopf, b.kopf),
    armV: arm('V'),
    armH: arm('H'),
    beinV: bein(a.beinV, b.beinV),
    beinH: bein(a.beinH, b.beinH),
    versatz,
    ...(naeher.ebenen !== undefined ? { ebenen: naeher.ebenen } : {}),
    ...(naeher.formen !== undefined ? { formen: naeher.formen } : {}),
    ...(naeher.versteckt !== undefined ? { versteckt: naeher.versteckt } : {}),
    ...(naeher.gesicht !== undefined ? { gesicht: naeher.gesicht } : {}),
  };
}

// ===========================================================================
// Gesichtsmaske bei gedrehtem Kopf
// ===========================================================================

/** Zeilen einer Maske eine Vierteldrehung gegen den Uhrzeigersinn im Bild (wie drehe(v, 90): rechts → oben). */
function maskeViertel(zeilen: readonly string[]): string[] {
  const h = zeilen.length;
  const w = Math.max(...zeilen.map((z) => z.length));
  const aus: string[] = [];
  for (let r = 0; r < w; r++) {
    let s = '';
    for (let c = 0; c < h; c++) s += (zeilen[c] as string)[w - 1 - r] ?? '.';
    aus.push(s);
  }
  return aus;
}

/**
 * Gesichtsmaske für einen Kopf mit dem Weltwinkel winkel: Das Raster der
 * Maske dreht in ganzen Vierteldrehungen (nächste zu winkel), ihre Mitte
 * liegt genau dort, wo die Mitte der ungedrehten Maske mit dem Kopf hinwandert
 * (puppe.ts setzt die linke obere Ecke drehe(ursprung, winkel) + Kopflage).
 * Bei winkel 0 ist das Ergebnis die Maske selbst (Festlegung G2, docs/grafik.md 7).
 */
export function gesichtGedreht(g: Gesicht, winkel: number): Gesicht {
  const viertel = (((Math.round(winkel / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  if (viertel === 0 && winkel === 0) return g;
  const w = Math.max(...g.zeilen.map((z) => z.length));
  const h = g.zeilen.length;
  let zeilen: readonly string[] = g.zeilen;
  for (let k = 0; k < viertel; k++) zeilen = maskeViertel(zeilen);
  const w2 = viertel % 2 === 1 ? h : w;
  const h2 = viertel % 2 === 1 ? w : h;
  const mitte = P(g.ursprung.x + w / 2, g.ursprung.y + h / 2);
  const halb = drehe(P(w2 / 2, h2 / 2), -winkel);
  return { ...g, zeilen, ursprung: P(mitte.x - halb.x, mitte.y - halb.y) };
}

// ===========================================================================
// Gehen: Standfuß fest am Boden (Auftrag 4, 1.4)
// ===========================================================================

/** Knöchel, wenn der Stiefel um winkel Grad um den Kontaktpunkt (Ferse oder Spitze) gedreht auf dem Boden steht. */
export function knoechelUeber(kontakt: Punkt, kontaktLokal: Punkt, winkel: number): Punkt {
  const w = (winkel * Math.PI) / 180;
  // drehe() der Geometrie: (x, y) → (x cos + y sin, −x sin + y cos)
  const dx = kontaktLokal.x * Math.cos(w) + kontaktLokal.y * Math.sin(w);
  const dy = -kontaktLokal.x * Math.sin(w) + kontaktLokal.y * Math.cos(w);
  return P(kontakt.x - dx, kontakt.y - dy);
}

/** Maße und Werte des Gehzyklus einer Figur. */
export interface Gehmass {
  /** Bilder je Zyklus (design-gegner-stages.md 9: 8). */
  readonly bilder: number;
  /** px je Bild (Frames je Bild · Gehgeschwindigkeit). */
  readonly schritt: number;
  /** Sohle bis Knöchel, Ferse und Spitze im Rahmen des Knöchels. */
  readonly knoechel: number;
  readonly ferse: Punkt;
  readonly spitze: Punkt;
  /** Fußhub in der Schwungphase, Neigung des Stiefels beim Aufsetzen und Abrollen. */
  readonly hub: number;
  readonly ferseAuf: number;
  readonly spitzeAb: number;
}

/** Rückversatz des Standfußes nach n Bildern ab Beginn des Zyklus, auf ganze px gerundet (G0c-3). */
export function gehVersatz(m: Gehmass, n: number): number {
  return Math.round(n * m.schritt);
}

/**
 * Lage eines Fußes im Bild i des Gehzyklus (wie Phase 1, docs/grafik.md 4.2).
 * Der Fuß steht in den Bildern start … start + bilder/2 (Standphase k): Ferse
 * setzt bei k = 0 auf, dazwischen flach, bei k = bilder/2 rollt er über die
 * Spitze ab. Sein Knöchel liegt in Bild start + k um gehVersatz(start + k) −
 * gehVersatz(start) hinter vorn (ganze px). Danach schwingt er nach vorn.
 */
export function gehFuss(m: Gehmass, i: number, start: number, vorn: number): Bein {
  const n = m.bilder;
  const stand = n / 2;
  const k = (((i - start) % n) + n) % n;
  const zurueck = (j: number): number => gehVersatz(m, start + j) - gehVersatz(m, start);
  if (k <= stand) {
    const flach = P(vorn - zurueck(k), -m.knoechel);
    if (k === 0) return { knoechel: knoechelUeber(P(flach.x + m.ferse.x, 0), m.ferse, m.ferseAuf), fuss: m.ferseAuf };
    if (k === stand) return { knoechel: knoechelUeber(P(flach.x + m.spitze.x, 0), m.spitze, m.spitzeAb), fuss: m.spitzeAb };
    return { knoechel: flach, fuss: 0 };
  }
  const s = (k - stand) / stand;
  const hinten = vorn - zurueck(stand);
  const x = hinten + (vorn - hinten) * s;
  const hub = Math.sin(Math.PI * s) * m.hub;
  return { knoechel: P(x, -m.knoechel - hub), fuss: m.spitzeAb * (1 - s) + m.ferseAuf * s * 0.5 };
}

/** Hüfthöhe beim Gehen: so hoch wie gewünscht, aber nie höher, als die Beine reichen (Reichweite reich). */
export function gehHuefte(hx: number, seite: number, beinV: Bein, beinH: Bein, reich: number, wunsch: number): number {
  const hoehe = (b: Bein, s: number): number => {
    const dx = b.knoechel.x - (hx + s);
    return b.knoechel.y - Math.sqrt(Math.max(0, reich * reich - dx * dx));
  };
  return Math.max(hoehe(beinV, seite), hoehe(beinH, -seite), wunsch);
}

// ===========================================================================
// Zeit: Bild zur Uhr (Auftrag 4, 2.3 und 3; docs/grafik.md 4.2)
// ===========================================================================

/** Index des Bildes bei Uhr uhr (1 = erstes Bild): das erste, bei dem die Summe der Dauern uhr erreicht. */
export function bildBeiUhr(dauern: readonly number[], uhr: number): number {
  let summe = 0;
  for (let i = 0; i < dauern.length; i++) {
    summe += dauern[i] as number;
    if (uhr <= summe) return i;
  }
  return dauern.length - 1;
}

/** Bild zur Zeit A + d eines Angriffs (d = 0 im Frame A): bildBeiUhr(dauern, d + 1). */
export function bildBeiAbstand(dauern: readonly number[], d: number): number {
  return bildBeiUhr(dauern, d + 1);
}

export type NahCode = keyof typeof NAH_ANGRIFFE;

/**
 * Richtwert der Rückzugsbilder in Frames, wenn werte.ts keinen festen Rückzug
 * nennt (BB, BUB: Rückzug 0): Die zwei Rückzugsbilder stehen dann in den ersten
 * Frames des Nachlaufs (kürzester Nachlauf ohne Treffer BB 7, BUB 14; Festlegung G2-4).
 */
export const RUECKZUG_RICHTWERT = 6;

/**
 * Dauern eines Nahangriffs mit 5 Bildern (Auftrag 4, 3: Ausholen 2, aktiv 1,
 * Rückzug 2): Ausholen über den Startup (aufgerundet halbiert), Trefferbild
 * über die aktiven Frames ohne Treffer, Rückzug über den festen Rückzug
 * (werte.ts NAH_ANGRIFFE; wie G0c und fremd/rammbock/zuordnung.txt).
 */
export function angriffDauern(code: NahCode): readonly number[] {
  const w = NAH_ANGRIFFE[code];
  const r = w.rueckzug > 0 ? w.rueckzug : RUECKZUG_RICHTWERT;
  return [Math.ceil(w.startup / 2), Math.floor(w.startup / 2), w.aktiv_bis - w.aktiv_von + 1, Math.ceil(r / 2), Math.floor(r / 2)];
}

/** Index des Trefferbilds eines Nahangriffs: Bild zur Zeit A + aktiv_von. */
export function trefferBild(code: NahCode, dauern: readonly number[] = angriffDauern(code)): number {
  return bildBeiAbstand(dauern, NAH_ANGRIFFE[code].aktiv_von);
}

/**
 * Sprungtritt RS (Welt 5.5): Absprung über den Startup (A bis A+8, ab A+5 in
 * der Luft), Flug mit Knie über die aktiven Frames A+9 bis A+45, Landung 2
 * Bilder ab dem Aufsetzen A+46 (Richtwert 4/4, wie fremd/rammbock/zuordnung.txt).
 */
export const SPRUNGTRITT_DAUERN: readonly number[] = [
  NAH_ANGRIFFE.RS.startup,
  NAH_ANGRIFFE.RS.aktiv_bis - NAH_ANGRIFFE.RS.aktiv_von + 1,
  4,
  4,
];
/** Erster Frame der Landung relativ zu A (werte.ts SPRUNGTRITT_AUFSETZEN). */
export const SPRUNGTRITT_LANDUNG = SPRUNGTRITT_AUFSETZEN;

/**
 * Trefferreaktion (Kampf 7): Bildwechsel bei h+1, h+10, h+22, 23 Frames
 * (REAKTION_ANIMATION, REAKTION_DAUER): 9 / 12 / 2. Die Zeit h + k zeigt
 * bildBeiUhr(dauern, k) (k = uhr − 1).
 */
export const GETROFFEN_DAUERN: readonly number[] = [
  (REAKTION_ANIMATION[1] as number) - (REAKTION_ANIMATION[0] as number),
  (REAKTION_ANIMATION[2] as number) - (REAKTION_ANIMATION[1] as number),
  REAKTION_DAUER + (REAKTION_ANIMATION[0] as number) - (REAKTION_ANIMATION[2] as number),
];

/**
 * Bahnframes, in denen der Körper auf F1 bis F4 steigt (vh > 0): ⌈vh / gh⌉
 * (F1_VH 5,0, F1_GH 70/256: 19); danach fällt er bis zum Bodenkontakt.
 */
export const STEIGEN = Math.ceil(F1_VH / F1_GH);
/** Frames vom Bodenkontakt bis zur Ruhe, aufgeteilt in Aufprall (5) und Liegen (Rest) (Festlegung G2-5). */
export const AUFPRALL = 5;

/**
 * Umgeworfen auf F1 (Kampf 5.7, 7): Zeit W + k zeigt bildBeiUhr(dauern, k).
 * Bild 0 Stillstand W+1 bis W+8, Bild 1 Steigen ab W+9 (19 Frames), Bild 2
 * Fallen bis vor den Bodenkontakt W+46, Bild 3 Aufprall (5), Bild 4 flach bis
 * vor der Ruhe W+55 (dann LIEGEN): 8 / 19 / 18 / 5 / 4.
 */
export const UMGEWORFEN_DAUERN: readonly number[] = [
  F1_STILLSTAND,
  STEIGEN,
  F1_BODEN - F1_STILLSTAND - 1 - STEIGEN,
  AUFPRALL,
  F1_RUHE - F1_BODEN - AUFPRALL,
];
/** Dieselben Bilder auf F2 (dritter Kniestoß, Start in 16 px Höhe): Fallen bis W+48, Bodenkontakt W+49, Ruhe W+58. */
export const UMGEWORFEN_F2_DAUERN: readonly number[] = [
  F1_STILLSTAND,
  STEIGEN,
  F2_BODEN - F1_STILLSTAND - 1 - STEIGEN,
  AUFPRALL,
  F2_RUHE - F2_BODEN - AUFPRALL,
];
/**
 * Tod auf F4 (Kampf 5.7, 7): Stillstand t+1, t+2, Steigen ab t+3, Fallen bis
 * vor den Bodenkontakt t+40, Aufprall, flach bis zur Ruhe t+49, dann liegend
 * bis zum Freiwerden des Slots t+79 (SLOT_FREI_TOD); das Blinken zeichnet die
 * Darstellung (Regel, kein Bild): 2 / 19 / 18 / 5 / 4 / 30.
 */
export const TOT_DAUERN: readonly number[] = [
  F4_STILLSTAND,
  STEIGEN,
  F4_BODEN - F4_STILLSTAND - 1 - STEIGEN,
  AUFPRALL,
  F4_RUHE - F4_BODEN - AUFPRALL,
  SLOT_FREI_TOD - F4_RUHE,
];
/**
 * Geworfen auf F3 (Kampf 8.4, 5.7): getragen E+1 bis E+21 und losgelassen in
 * E+22 (Bild 0, kopfüber), Flug ab E+23 bis vor den Bodenkontakt E+59
 * (Bild 1, waagrecht); danach umgeworfen Bild 3 und 4 bis zur Ruhe E+71.
 */
export const GEWORFEN_DAUERN: readonly number[] = [WURF_LOSLASSEN, F3_BODEN - F3_ERSTER];
/** Auf F3 nach dem Bodenkontakt: Aufprall und flach bis zur Ruhe (umgeworfen Bild 3 und 4). */
export const GEWORFEN_AUFPRALL: readonly number[] = [AUFPRALL, F3_RUHE - F3_BODEN - AUFPRALL];

/** Aufstehen 18 Frames (werte.ts AUFSTEHEN_GEGNER) in 6 Bildern zu 3. */
export const AUFSTEHEN_BILDER = 6;
export const AUFSTEHEN_DAUERN: readonly number[] = new Array<number>(AUFSTEHEN_BILDER).fill(AUFSTEHEN_GEGNER / AUFSTEHEN_BILDER);

/** Spott 42 Frames (spezifikation-welt.md 5.1: 10/8/8/8/7/1; werte.ts SPOTT_DAUER); Wiegen gleich (design-gegner-stages.md 9). */
export const SPOTT_DAUERN: readonly number[] = [10, 8, 8, 8, 7, 1];
if (SPOTT_DAUERN.reduce((a, b) => a + b, 0) !== SPOTT_DAUER) throw new Error('Spott: Dauern ergeben nicht SPOTT_DAUER');

/** Haltung 3 × 5, Schleife (design-gegner-stages.md 9). */
export const HALTUNG_DAUERN: readonly number[] = [5, 5, 5];
/** Kampfhaltung 2 Bilder, Schleife; Richtwert 8/8 (G0c-5). */
export const KAMPFHALTUNG_DAUERN: readonly number[] = [8, 8];

/**
 * Aufstehen aus der Hocke im AUFTRITT (Welt 4.2; werte.ts AUFTRITT_HOCKE_*):
 * drei Bilder, die letzten zwei je etwa ein Viertel der Dauer, das erste den
 * Rest (Kopf hoch, noch hockend; Festlegung G2-6).
 */
export function aufstehenHockeDauern(auftritt: number): readonly number[] {
  const viertel = Math.floor(auftritt / 4);
  return [auftritt - 2 * viertel, viertel, viertel];
}

// ===========================================================================
// Bilder und Animationen
// ===========================================================================

/**
 * Entfernt Streupixel, die nach dem Rastern übrig bleiben (Regel 1.3): Reste
 * einer Gesichtsmaske, deren übrige Pixel ein vorderes Teil verdeckt (die
 * Puppe schützt Maskenpixel beim Aufräumen). Ein solcher Pixel bekommt die
 * häufigste deckende Farbe seiner Nachbarn; Glanzfarben bleiben (G2-2).
 */
export function aufgeraeumt(g: Gerastert, glanz: ReadonlySet<Pixel>): Gerastert {
  streupixelEntfernen(g.leinwand, glanz);
  return g;
}

/** Bild aus einer gerasterten Pose. */
export function bildAus(g: Gerastert, dauer: number): Bild {
  return { leinwand: g.leinwand, ankerX: g.ankerX, ankerY: g.ankerY, dauer };
}

/** Animation aus Bildern; prüft die Zahl der Dauern. */
export function animationAus(name: string, bilder: readonly Bild[], schleife: boolean, aktiv?: readonly number[]): Animation {
  return aktiv !== undefined ? { name, schleife, bilder: [...bilder], aktiv: [...aktiv] } : { name, schleife, bilder: [...bilder] };
}

/** Dieselben Bilder mit anderen Dauern (gehen_schnell, tot aus umgeworfen und liegen). */
export function mitDauern(bilder: readonly Bild[], dauern: readonly number[]): Bild[] {
  if (bilder.length !== dauern.length) throw new Error(`mitDauern: ${bilder.length} Bilder, ${dauern.length} Dauern`);
  return bilder.map((b, i) => ({ ...b, dauer: dauern[i] as number }));
}
