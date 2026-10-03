// Sprites der Darstellung (Auftrag 4, Phase 3, G7; docs/grafik.md 9): Laden
// der Blätter und Atlanten aus grafik/ausgabe/ (fetch der JSON, Image für die
// PNG) vor dem ersten Bild und Zeichnen mit drawImage. Welches Bild ein
// Zustand zeigt, entscheidet zuordnung.ts (ohne DOM); dieses Modul lädt und
// zeichnet nur.
//
// Laden: alle Sprite-Blätter außer rammbock_fremd (E24), die Hintergründe A,
// B, F mit Blende und die Anzeige. Fehlt ein Blatt oder ein Atlas, wirft
// ladeGrafik; main.ts meldet das in der Konsole und zeichnet die Rechtecke
// (Rückfall, wie ?platzhalter=1). Beim Laden entstehen einmal: je Kachelkarte
// eine Zeichenfläche (4.8, Absatz „Zeichnen“), je Sprite-Blatt ein Konturblatt
// für das Schutzblinken (nur die Pixel in KONTUR, G4-15) und die Schatten als
// pixelgenaue Ellipsen. Je Bild wird nichts neu erzeugt.
//
// Zeichnen: Anker (ankerX, ankerY) auf die Bildschirmposition, gespiegelt für
// Blick links um die Mitte der Ankerspalte (die Ankerspalte bleibt stehen);
// Hintergrund je Ebene erst die Karten, dann die freien Bilder nach folge
// (Bildschirm-x = x − ⌊K · parallax⌋, Bildschirm-y = y + Ky); Vordergrund mit
// seiner Deckkraft; Blende mit Front von rechts und Bayer-Kante (4.8 Punkt 5);
// Anzeige aus Schrift, Balkenbausteinen, Lebenssymbol, Pfeil und fertigen
// großen Texten (4.9).

import type { AnzeigeDaten, Balken } from '../kern/rahmen.ts';
import type { Atlanten, AtlasBild, SpriteAtlas, SpriteBlatt, Wahl } from './zuordnung.ts';
import { ANZEIGE, BILD_BREITE, BILD_HOEHE } from '../kern/werte.ts';
import { AUFZEICHNUNG_LAGE, FARBE, GRAFIK_ORDNER, KONTUR_RGB, LEBEN_ABSTAND, LEBEN_SYMBOL, SCHATTEN_SPRITE } from './masse.ts';
import { SPRITE_BLAETTER } from './zuordnung.ts';

// ===========================================================================
// Atlanten der Hintergründe, der Blende und der Anzeige (4.8, 4.9)
// ===========================================================================

/** Ebenen der Hintergründe in Zeichenreihenfolge (4.8); vordergrund kommt nach den Figuren. */
export type Ebene = 'himmel' | 'wand' | 'boden' | 'vordergrund';

/** Kachelkarte einer Ebene (4.8, Atlasformat). */
export interface HintergrundKarte {
  ebene: Ebene;
  name: string;
  parallax: number;
  deckkraft: number;
  x: number;
  y: number;
  spalten: number;
  zeilen: number;
  kacheln: number[][];
}

/** Freies Bild einer Ebene (4.8). */
export interface HintergrundBild {
  name: string;
  ebene: Ebene;
  folge: number;
  parallax: number;
  deckkraft: number;
  x: number;
  y: number;
  b: number;
  h: number;
  dauer: number;
  bilder: { x: number; y: number }[];
}

/** Atlas eines Hintergrundblatts (hintergrund_a/b/f.json). */
export interface HintergrundAtlas {
  blatt: string;
  abschnitt: string;
  kachel: number;
  kacheln: [number, number][];
  karten: HintergrundKarte[];
  bilder: HintergrundBild[];
}

/** Atlas der Blende (hintergrund_blende.json). */
export interface BlendeAtlas {
  blatt: string;
  kachel: number;
  kante: { x: number; y: number; b: number; h: number };
  weg: number;
  zu: number;
}

/** Teil der Anzeige: Rechteck im Blatt und Anker (4.9). */
export interface AnzeigeTeil {
  x: number;
  y: number;
  b: number;
  h: number;
  ankerX: number;
  ankerY: number;
}

/** Schrift der Anzeige (klein 8 × 8, groß 16 × 16; 4.9). */
export interface AnzeigeSchrift {
  laufweite: number;
  zeilenhoehe: number;
  ersatz: string;
  zeichen: Record<string, AnzeigeTeil>;
}

/** Atlas der Anzeige (anzeige.json, 4.9). */
export interface AnzeigeAtlas {
  blatt: string;
  schriften: { klein: AnzeigeSchrift; gross: AnzeigeSchrift };
  balken: { breite: number; rahmen_links: AnzeigeTeil; rahmen_rechts: AnzeigeTeil; lagen: AnzeigeTeil[]; leer: AnzeigeTeil };
  leben: AnzeigeTeil & { zahlDx: number };
  pfeil: AnzeigeTeil;
  texte: Record<string, AnzeigeTeil>;
}

/** Hintergrundblätter in der Reihenfolge der Zeichenregel (4.8: bei Gleichstand A, B, F). */
export const HINTERGRUND_BLAETTER = ['hintergrund_a', 'hintergrund_b', 'hintergrund_f'] as const;

// ===========================================================================
// Geladene Grafik
// ===========================================================================

/** Eine Karte, beim Laden einmal in eine eigene Zeichenfläche gesetzt. */
interface Karte {
  karte: HintergrundKarte;
  flaeche: HTMLCanvasElement;
}

/** Ein freies Bild mit seinem Blatt. */
interface FreiesBild {
  bild: HintergrundBild;
  quelle: CanvasImageSource;
}

/** Alles, was die Darstellung zum Zeichnen der Sprites braucht. */
export interface Grafik {
  atlanten: Atlanten;
  blaetter: Readonly<Record<SpriteBlatt, CanvasImageSource>>;
  /** nur die Pixel in KONTUR je Blatt (Schutzblinken, G4-15) */
  kontur: Readonly<Record<SpriteBlatt, CanvasImageSource>>;
  /** Karten je Ebene in Zeichenreihenfolge (A, B, F; Liste) */
  karten: Readonly<Record<Ebene, readonly Karte[]>>;
  /** freie Bilder je Ebene nach folge, dann Blatt, dann Liste */
  freie: Readonly<Record<Ebene, readonly FreiesBild[]>>;
  blende: { atlas: BlendeAtlas; bild: CanvasImageSource };
  anzeige: { atlas: AnzeigeAtlas; bild: CanvasImageSource };
  /** Schattenellipsen nach Breite × Höhe */
  schatten: Map<string, HTMLCanvasElement>;
}

async function ladeJson<T>(pfad: string): Promise<T> {
  const antwort = await fetch(pfad);
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
  return (await antwort.json()) as T;
}

function ladeBild(pfad: string): Promise<HTMLImageElement> {
  return new Promise((fertig, fehler) => {
    const bild = new Image();
    bild.onload = () => fertig(bild);
    bild.onerror = () => fehler(new Error(`${pfad}: Bild lädt nicht`));
    bild.src = pfad;
  });
}

function flaeche(breite: number, hoehe: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, breite);
  canvas.height = Math.max(1, hoehe);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D nicht verfügbar');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Konturblatt: nur die Pixel in KONTUR bleiben deckend (G4-15). */
function konturBlatt(bild: HTMLImageElement): HTMLCanvasElement {
  const { canvas, ctx } = flaeche(bild.width, bild.height);
  ctx.drawImage(bild, 0, 0);
  const daten = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = daten.data;
  const [r, g, b] = KONTUR_RGB;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i] !== r || p[i + 1] !== g || p[i + 2] !== b) p[i + 3] = 0;
  }
  ctx.putImageData(daten, 0, 0);
  return canvas;
}

/** Setzt eine Kachelkarte einmal in eine Zeichenfläche (4.8, Absatz „Zeichnen“ Punkt 1). */
function karteFlaeche(atlas: HintergrundAtlas, bild: HTMLImageElement, karte: HintergrundKarte): HTMLCanvasElement {
  const k = atlas.kachel;
  const { canvas, ctx } = flaeche(karte.spalten * k, karte.zeilen * k);
  karte.kacheln.forEach((reihe, r) =>
    reihe.forEach((nr, s) => {
      if (nr < 0) return;
      const lage = atlas.kacheln[nr];
      if (lage === undefined) throw new Error(`${atlas.blatt}: Kachel ${nr} fehlt`);
      ctx.drawImage(bild, lage[0], lage[1], k, k, s * k, r * k, k, k);
    }),
  );
  return canvas;
}

/** Prüft die Felder, die die Darstellung aus einem Sprite-Atlas liest. */
function spriteAtlasPruefen(name: string, a: SpriteAtlas): void {
  if (typeof a.blatt !== 'string' || typeof a.animationen !== 'object' || a.animationen === null) throw new Error(`${name}.json: kein Sprite-Atlas`);
  if (a.animationen['stand'] === undefined && name !== 'objekte') throw new Error(`${name}.json: Animation stand fehlt`);
}

/**
 * Lädt alle Blätter und Atlanten (Auftrag 4, 2.2) aus dem Ordner relativ zu
 * index.html. Wirft, wenn eines fehlt; der Aufrufer fällt dann auf die
 * Rechtecke zurück.
 */
export async function ladeGrafik(ordner: string = GRAFIK_ORDNER): Promise<Grafik> {
  const sprites = await Promise.all(
    SPRITE_BLAETTER.map(async (name) => {
      const atlas = await ladeJson<SpriteAtlas>(`${ordner}${name}.json`);
      spriteAtlasPruefen(name, atlas);
      const bild = await ladeBild(`${ordner}${atlas.blatt}`);
      return { name, atlas, bild };
    }),
  );
  const hintergruende = await Promise.all(
    HINTERGRUND_BLAETTER.map(async (name) => {
      const atlas = await ladeJson<HintergrundAtlas>(`${ordner}${name}.json`);
      if (!Array.isArray(atlas.karten) || !Array.isArray(atlas.bilder)) throw new Error(`${name}.json: kein Hintergrundatlas`);
      const bild = await ladeBild(`${ordner}${atlas.blatt}`);
      return { atlas, bild };
    }),
  );
  const blendeAtlas = await ladeJson<BlendeAtlas>(`${ordner}hintergrund_blende.json`);
  const blendeBild = await ladeBild(`${ordner}${blendeAtlas.blatt}`);
  const anzeigeAtlas = await ladeJson<AnzeigeAtlas>(`${ordner}anzeige.json`);
  if (anzeigeAtlas.schriften === undefined || anzeigeAtlas.balken === undefined) throw new Error('anzeige.json: kein Anzeigeatlas');
  const anzeigeBild = await ladeBild(`${ordner}${anzeigeAtlas.blatt}`);

  const atlanten = {} as Record<SpriteBlatt, SpriteAtlas>;
  const blaetter = {} as Record<SpriteBlatt, CanvasImageSource>;
  const kontur = {} as Record<SpriteBlatt, CanvasImageSource>;
  for (const s of sprites) {
    atlanten[s.name] = s.atlas;
    blaetter[s.name] = s.bild;
    kontur[s.name] = konturBlatt(s.bild);
  }
  const ebenen: Ebene[] = ['himmel', 'wand', 'boden', 'vordergrund'];
  const karten = {} as Record<Ebene, Karte[]>;
  const freie = {} as Record<Ebene, FreiesBild[]>;
  for (const e of ebenen) {
    karten[e] = [];
    const liste: { f: FreiesBild; bi: number; fi: number }[] = [];
    hintergruende.forEach((h, bi) => {
      for (const k of h.atlas.karten) if (k.ebene === e) karten[e].push({ karte: k, flaeche: karteFlaeche(h.atlas, h.bild, k) });
      h.atlas.bilder.forEach((b, fi) => {
        if (b.ebene === e) liste.push({ f: { bild: b, quelle: h.bild }, bi, fi });
      });
    });
    liste.sort((p, q) => p.f.bild.folge - q.f.bild.folge || p.bi - q.bi || p.fi - q.fi);
    freie[e] = liste.map((l) => l.f);
  }
  return {
    atlanten,
    blaetter,
    kontur,
    karten,
    freie,
    blende: { atlas: blendeAtlas, bild: blendeBild },
    anzeige: { atlas: anzeigeAtlas, bild: anzeigeBild },
    schatten: new Map(),
  };
}

// ===========================================================================
// Meldungen
// ===========================================================================

const gemeldet = new Set<string>();

/** Meldet eine Ersatzwahl einmal je Grund in der Konsole (Auftrag 4, 3). */
export function ersatzMelden(w: Wahl): void {
  if (w.ersatz === null || gemeldet.has(w.ersatz)) return;
  gemeldet.add(w.ersatz);
  console.warn(`Grafik: ${w.ersatz}; gezeigt wird stand`);
}

// ===========================================================================
// Sprites
// ===========================================================================

/** Bild einer Wahl im Atlas oder null. */
export function atlasBild(g: Grafik, w: Wahl): AtlasBild | null {
  return g.atlanten[w.blatt].animationen[w.animation]?.bilder[w.bild] ?? null;
}

/**
 * Zeichnet das Bild einer Wahl mit dem Anker auf (x, y); gespiegelt um die
 * Mitte der Ankerspalte (Blick links). nurKontur: nur die Pixel in KONTUR
 * (Schutzblinken).
 */
export function zeichneWahl(ctx: CanvasRenderingContext2D, g: Grafik, w: Wahl, x: number, y: number, nurKontur: boolean = false): void {
  ersatzMelden(w);
  const b = atlasBild(g, w);
  if (b === null) return;
  const quelle = nurKontur ? g.kontur[w.blatt] : g.blaetter[w.blatt];
  if (!w.spiegeln) {
    ctx.drawImage(quelle, b.x, b.y, b.b, b.h, x - b.ankerX, y - b.ankerY, b.b, b.h);
    return;
  }
  ctx.save();
  ctx.translate(2 * x + 1, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(quelle, b.x, b.y, b.b, b.h, x - b.ankerX, y - b.ankerY, b.b, b.h);
  ctx.restore();
}

/** Schattenellipse breite × hoehe, pixelgenau (Pixel deckend, wenn seine Mitte in der Ellipse liegt), einmal je Größe. */
function schattenFlaeche(g: Grafik, breite: number, hoehe: number): HTMLCanvasElement {
  const schluessel = `${breite}x${hoehe}`;
  const da = g.schatten.get(schluessel);
  if (da !== undefined) return da;
  const { canvas, ctx } = flaeche(breite, hoehe);
  ctx.fillStyle = SCHATTEN_SPRITE.farbe;
  const rx = breite / 2;
  const ry = hoehe / 2;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
    }
  }
  g.schatten.set(schluessel, canvas);
  return canvas;
}

/** Schatten mit der Mitte auf (x, y) wie zeichnen.ts (Ellipse um den Schattenpunkt), feste Deckkraft. */
export function zeichneSchatten(ctx: CanvasRenderingContext2D, g: Grafik, x: number, y: number, breite: number, hoehe: number): void {
  if (breite <= 0 || hoehe <= 0) return;
  const s = schattenFlaeche(g, breite, hoehe);
  ctx.globalAlpha = SCHATTEN_SPRITE.deckkraft;
  ctx.drawImage(s, x - Math.floor(breite / 2), y - Math.floor(hoehe / 2));
  ctx.globalAlpha = 1;
}

// ===========================================================================
// Hintergrund, Vordergrund, Blende (4.8)
// ===========================================================================

/**
 * Zeichnet eine Ebene aller Hintergrundblätter: erst die Karten, dann die
 * freien Bilder nach folge (4.8, Absatz „Zeichnen“). K, Ky = Kamera; frame
 * wählt das Bild animierter freier Bilder (Dampf, G5-12).
 */
export function zeichneEbene(ctx: CanvasRenderingContext2D, g: Grafik, ebene: Ebene, kx: number, ky: number, frame: number): void {
  for (const { karte, flaeche: f } of g.karten[ebene]) {
    const sx = karte.x - Math.floor(kx * karte.parallax);
    const sy = karte.y + ky;
    const x0 = Math.max(0, -sx);
    const x1 = Math.min(f.width, BILD_BREITE - sx);
    if (x1 <= x0 || sy >= BILD_HOEHE || sy + f.height <= 0) continue;
    ctx.globalAlpha = karte.deckkraft;
    ctx.drawImage(f, x0, 0, x1 - x0, f.height, sx + x0, sy, x1 - x0, f.height);
  }
  for (const { bild: b, quelle } of g.freie[ebene]) {
    const sx = b.x - Math.floor(kx * b.parallax);
    if (sx >= BILD_BREITE || sx + b.b <= 0) continue;
    const n = b.bilder.length;
    const i = b.dauer > 0 && n > 0 ? Math.floor(frame / b.dauer) % n : 0;
    const q = b.bilder[i];
    if (q === undefined) continue;
    ctx.globalAlpha = b.deckkraft;
    ctx.drawImage(quelle, q.x, q.y, b.b, b.h, sx, b.y + ky, b.b, b.h);
  }
  ctx.globalAlpha = 1;
}

/**
 * Blende bei Deckung d (0 bis zu, 4.8 Punkt 5; G5-5): die Szene wie heute
 * abdunkeln (Deckkraft d/zu), dazu ein voll dunkles Feld ab
 * F = weg − ⌊weg · d / zu⌋ und links davon die Kantenkachel untereinander.
 */
export function zeichneBlendeSprites(ctx: CanvasRenderingContext2D, g: Grafik, d: number): void {
  if (d <= 0) return;
  const a = g.blende.atlas;
  ctx.fillStyle = FARBE.rand;
  ctx.globalAlpha = Math.min(1, d / a.zu);
  ctx.fillRect(0, 0, BILD_BREITE, BILD_HOEHE);
  ctx.globalAlpha = 1;
  const front = a.weg - Math.floor((a.weg * d) / a.zu);
  if (front < BILD_BREITE) ctx.fillRect(front, 0, BILD_BREITE - front, BILD_HOEHE);
  const k = a.kante;
  for (let y = 0; y < BILD_HOEHE; y += k.h) ctx.drawImage(g.blende.bild, k.x, k.y, k.b, k.h, front - k.b, y, k.b, k.h);
}

// ===========================================================================
// Anzeige (4.9, „Zeichnen im Einbau“)
// ===========================================================================

/** Teil t mit dem Anker auf (x, y). */
function teil(ctx: CanvasRenderingContext2D, g: Grafik, t: AnzeigeTeil, x: number, y: number): void {
  ctx.drawImage(g.anzeige.bild, t.x, t.y, t.b, t.h, x - t.ankerX, y - t.ankerY, t.b, t.h);
}

/** Text ab (x, y) = linke obere Ecke der ersten Zelle, groß geschrieben, Unbekanntes als Ersatz; gibt die Breite zurück. */
export function zeichneText(ctx: CanvasRenderingContext2D, g: Grafik, s: AnzeigeSchrift, inhalt: string, x: number, y: number): number {
  const zeichen = [...inhalt.toUpperCase()];
  zeichen.forEach((z, i) => {
    const t = s.zeichen[z] ?? s.zeichen[s.ersatz];
    if (t !== undefined) teil(ctx, g, t, x + i * s.laufweite, y);
  });
  return zeichen.length * s.laufweite;
}

/** LP-Balken (Welt 10.1, 4.9): Rahmen, Läufe gleicher Bausteine gestreckt (ein Aufruf je Lauf). */
function zeichneBalken(ctx: CanvasRenderingContext2D, g: Grafik, x0: number, zeile0: number, b: Balken): void {
  const a = g.anzeige.atlas.balken;
  const lage = (n: number): AnzeigeTeil => a.lagen[Math.min(n, a.lagen.length) - 1] ?? a.leer;
  const lauf = (t: AnzeigeTeil, von: number, bis: number): void => {
    if (bis <= von) return;
    ctx.drawImage(g.anzeige.bild, t.x, t.y, t.b, t.h, x0 + von - t.ankerX, zeile0 - t.ankerY, bis - von, t.h);
  };
  teil(ctx, g, a.rahmen_links, x0 - 1, zeile0);
  const voll = Math.max(0, Math.min(b.breite, a.breite));
  if (voll > 0) lauf(lage(b.lage), 0, voll);
  lauf(b.unterlage > 0 ? lage(b.unterlage) : a.leer, voll, a.breite);
  teil(ctx, g, a.rahmen_rechts, x0 + a.breite, zeile0);
}

/** Anzeigeleiste nach Welt 10.1 und Pfeil „weiter“ (4.9). */
export function zeichneAnzeigeSprites(ctx: CanvasRenderingContext2D, g: Grafik, d: AnzeigeDaten): void {
  const a = g.anzeige.atlas;
  const klein = a.schriften.klein;
  zeichneText(ctx, g, klein, d.name, ANZEIGE.name.x, ANZEIGE.name.zeile);
  zeichneText(ctx, g, klein, d.punkte, ANZEIGE.punkte.x, ANZEIGE.punkte.zeile);
  teil(ctx, g, a.leben, ANZEIGE.leben.x, ANZEIGE.leben.zeile);
  zeichneText(ctx, g, klein, String(d.leben), ANZEIGE.leben.x + a.leben.zahlDx, ANZEIGE.leben.zeile);
  zeichneBalken(ctx, g, ANZEIGE.lp_balken.x0, ANZEIGE.lp_balken.zeile0, d.figur);
  if (d.gegner !== null) {
    zeichneText(ctx, g, klein, d.gegner.name, ANZEIGE.gegner_name.x, ANZEIGE.gegner_name.zeile);
    zeichneBalken(ctx, g, ANZEIGE.gegner_balken.x0, ANZEIGE.gegner_balken.zeile0, d.gegner.balken);
  }
  if (d.pfeil) teil(ctx, g, a.pfeil, ANZEIGE.pfeil.x0, ANZEIGE.pfeil.zeile0);
}

/** Große Texte waagrecht mittig, Zeilen im Abstand 20, der Block senkrecht mittig; fertige Bilder, sonst gesetzt (4.9, G6-4). */
export function zeichneGrosseTexteSprites(ctx: CanvasRenderingContext2D, g: Grafik, zeilen: readonly string[]): void {
  if (zeilen.length === 0) return;
  const a = g.anzeige.atlas;
  const s = a.schriften.gross;
  let y = Math.floor((BILD_HOEHE - zeilen.length * s.zeilenhoehe) / 2);
  for (const z of zeilen) {
    const x = Math.floor((BILD_BREITE - [...z].length * s.laufweite) / 2);
    const fertig = a.texte[z];
    if (fertig !== undefined) teil(ctx, g, fertig, x, y);
    else zeichneText(ctx, g, s, z, x, y);
    y += s.zeilenhoehe;
  }
}

/** Hinweis „AUFZ“ oben rechts in der kleinen Schrift mit rotem Punkt (F2). */
export function zeichneAufzeichnungSprites(ctx: CanvasRenderingContext2D, g: Grafik): void {
  const s = g.anzeige.atlas.schriften.klein;
  const inhalt = 'AUFZ';
  const x = BILD_BREITE - AUFZEICHNUNG_LAGE.rechts - inhalt.length * s.laufweite;
  ctx.fillStyle = FARBE.aufzeichnung;
  ctx.fillRect(x - LEBEN_ABSTAND, AUFZEICHNUNG_LAGE.zeile + 1, LEBEN_SYMBOL.breite, LEBEN_SYMBOL.breite);
  zeichneText(ctx, g, s, inhalt, x, AUFZEICHNUNG_LAGE.zeile);
}
