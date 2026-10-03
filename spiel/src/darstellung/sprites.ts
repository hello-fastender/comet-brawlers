// Sprites der Darstellung (Auftrag 4, Phase 3, G7; docs/grafik.md 9 und
// 9.10): Laden der Blätter und Atlanten aus grafik/ausgabe/ (fetch der JSON,
// Image für die PNG) vor dem ersten Bild und Zeichnen über die Zeichenklasse
// (zeichner.ts) in Spielkoordinaten. Welches Bild ein Zustand zeigt,
// entscheidet zuordnung.ts (ohne DOM); dieses Modul lädt und zeichnet nur.
//
// Laden: zuerst blaetter.json (Blattwahl, blaetter.ts: <name>_grok statt
// <name>, wenn gebaut; fehlt die Liste, die bisherigen Blätter), dann alle
// Sprite-Blätter (nie rammbock_fremd, E24), die Hintergründe A, B, F mit
// Blende und die Anzeige. Jeder Atlas trägt seinen Massstab (1 Spielpixel,
// 2 Bildpixel; Auftrag 5). Fehlt ein Blatt oder ein Atlas, wirft ladeGrafik;
// main.ts meldet das in der Konsole und zeichnet die Rechtecke (Rückfall,
// wie ?platzhalter=1). Beim Laden entstehen einmal: je Kachelkarte eine
// Zeichenfläche (4.8, Absatz „Zeichnen“), je Sprite-Blatt ein Konturblatt für
// das Schutzblinken (die Pixel in KONTUR, G4-15; bei Blättern ohne KONTUR der
// Rand, blaetter.ts konturMaske); die Schatten als pixelgenaue Ellipsen in
// Spielpixeln legt die Zeichenklasse beim ersten Gebrauch je Größe an. Je
// Bild wird nichts neu erzeugt.
//
// Zeichnen: Anker (ankerX, ankerY) auf die Bildschirmposition in
// Spielpixeln, gespiegelt für Blick links um die Mitte der Spielpixelspalte
// des Ankers (Zeichner.bild); Hintergrund je Ebene erst die Karten, dann die
// freien Bilder nach folge (Bildschirm-x = x − ⌊K · parallax⌋, Bildschirm-y =
// y + Ky); Vordergrund mit seiner Deckkraft; Blende mit Front von rechts und
// Bayer-Kante (4.8 Punkt 5); Anzeige aus Schrift, Balkenbausteinen,
// Lebenssymbol, Pfeil und fertigen großen Texten (4.9). Weltlagen der Atlanten
// (Karten, freie Bilder, Blendenfront) sind Spielpixel, Rechtecke, Maße und
// Anker im Blatt Pixel des Blatts (bei Massstab 2 Bildpixel).

import type { AnzeigeDaten, Balken } from '../kern/rahmen.ts';
import type { AnzeigeAtlas, AnzeigeSchrift, AnzeigeTeil, BlendeAtlas, Ebene, HintergrundAtlas, HintergrundBild, HintergrundKarte, KonturArt, WaehlbaresBlatt } from './blaetter.ts';
import type { Zeichner } from './zeichner.ts';
import type { Atlanten, AtlasBild, SpriteAtlas, SpriteBlatt, Wahl } from './zuordnung.ts';
import { ANZEIGE, BILD_BREITE, BILD_HOEHE } from '../kern/werte.ts';
import { BLAETTER_LISTE, HINTERGRUND_BLAETTER, blaetterListe, blattWahl, konturMaske, massstabVon } from './blaetter.ts';
import { AUFZEICHNUNG_LAGE, FARBE, GRAFIK_ORDNER, KONTUR_RGB, LEBEN_ABSTAND, LEBEN_SYMBOL, SCHATTEN_SPRITE } from './masse.ts';
import { SPRITE_BLAETTER } from './zuordnung.ts';

// ===========================================================================
// Geladene Grafik
// ===========================================================================

/** Eine Karte, beim Laden einmal in eine eigene Zeichenfläche gesetzt (Pixel des Blatts). */
interface Karte {
  karte: HintergrundKarte;
  flaeche: HTMLCanvasElement;
  /** Massstab des Blatts */
  m: number;
}

/** Ein freies Bild mit seinem Blatt. */
interface FreiesBild {
  bild: HintergrundBild;
  quelle: CanvasImageSource;
  m: number;
}

/** Alles, was die Darstellung zum Zeichnen der Sprites braucht. */
export interface Grafik {
  atlanten: Atlanten;
  /** gewählte Datei (ohne Endung) je Blatt (Blattwahl, blaetter.ts) */
  dateien: Readonly<Record<WaehlbaresBlatt, string>>;
  /** Massstab je Sprite-Blatt (1 Spielpixel, 2 Bildpixel) */
  massstab: Readonly<Record<SpriteBlatt, number>>;
  blaetter: Readonly<Record<SpriteBlatt, CanvasImageSource>>;
  /** Konturblatt je Blatt (Schutzblinken, G4-15): Pixel in KONTUR oder Rand */
  kontur: Readonly<Record<SpriteBlatt, CanvasImageSource>>;
  /** Art des Konturblatts je Blatt */
  konturArt: Readonly<Record<SpriteBlatt, KonturArt>>;
  /** Karten je Ebene in Zeichenreihenfolge (A, B, F; Liste) */
  karten: Readonly<Record<Ebene, readonly Karte[]>>;
  /** freie Bilder je Ebene nach folge, dann Blatt, dann Liste */
  freie: Readonly<Record<Ebene, readonly FreiesBild[]>>;
  blende: { atlas: BlendeAtlas; bild: CanvasImageSource; m: number };
  anzeige: { atlas: AnzeigeAtlas; bild: CanvasImageSource; m: number };
}

async function ladeJson<T>(pfad: string): Promise<T> {
  const antwort = await fetch(pfad);
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
  return (await antwort.json()) as T;
}

/** Liste der gebauten Blätter (blaetter.json); null, wenn es sie nicht gibt (HTTP 404). */
async function ladeListe(pfad: string): Promise<string[] | null> {
  const antwort = await fetch(pfad);
  if (antwort.status === 404) return null;
  if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
  return blaetterListe(await antwort.json());
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

/**
 * Konturblatt (G4-15, Auftrag 5): die Pixel in KONTUR bleiben deckend; hat das
 * Blatt keine, sein Rand, m Ringe breit (ein Spielpixel, U1-3).
 */
function konturBlatt(bild: HTMLImageElement, m: number): { canvas: HTMLCanvasElement; art: KonturArt } {
  const { canvas, ctx } = flaeche(bild.width, bild.height);
  ctx.drawImage(bild, 0, 0);
  const daten = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const art = konturMaske(daten.data, canvas.width, canvas.height, KONTUR_RGB, m);
  ctx.putImageData(daten, 0, 0);
  return { canvas, art };
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

/** Prüft die Felder, die die Darstellung aus einem Sprite-Atlas liest (Blatt name, Datei datei). */
function spriteAtlasPruefen(name: SpriteBlatt, datei: string, a: SpriteAtlas): void {
  if (typeof a.blatt !== 'string' || typeof a.animationen !== 'object' || a.animationen === null) throw new Error(`${datei}.json: kein Sprite-Atlas`);
  if (a.animationen['stand'] === undefined && name !== 'objekte') throw new Error(`${datei}.json: Animation stand fehlt`);
}

/**
 * Lädt alle Blätter und Atlanten (Auftrag 4, 2.2) aus dem Ordner relativ zu
 * index.html, nach der Blattwahl aus blaetter.json (Auftrag 5). Wirft, wenn
 * eines fehlt; der Aufrufer fällt dann auf die Rechtecke zurück.
 */
export async function ladeGrafik(ordner: string = GRAFIK_ORDNER): Promise<Grafik> {
  const dateien = blattWahl(await ladeListe(`${ordner}${BLAETTER_LISTE}`));
  const sprites = await Promise.all(
    SPRITE_BLAETTER.map(async (name) => {
      const datei = dateien[name];
      const atlas = await ladeJson<SpriteAtlas>(`${ordner}${datei}.json`);
      spriteAtlasPruefen(name, datei, atlas);
      const m = massstabVon(atlas, `${datei}.json`);
      const bild = await ladeBild(`${ordner}${atlas.blatt}`);
      return { name, atlas, bild, m };
    }),
  );
  const hintergruende = await Promise.all(
    HINTERGRUND_BLAETTER.map(async (name) => {
      const datei = dateien[name];
      const atlas = await ladeJson<HintergrundAtlas>(`${ordner}${datei}.json`);
      if (!Array.isArray(atlas.karten) || !Array.isArray(atlas.bilder)) throw new Error(`${datei}.json: kein Hintergrundatlas`);
      const m = massstabVon(atlas, `${datei}.json`);
      const bild = await ladeBild(`${ordner}${atlas.blatt}`);
      return { atlas, bild, m };
    }),
  );
  const blendeAtlas = await ladeJson<BlendeAtlas>(`${ordner}hintergrund_blende.json`);
  const blendeM = massstabVon(blendeAtlas, 'hintergrund_blende.json');
  const blendeBild = await ladeBild(`${ordner}${blendeAtlas.blatt}`);
  const anzeigeAtlas = await ladeJson<AnzeigeAtlas>(`${ordner}anzeige.json`);
  if (anzeigeAtlas.schriften === undefined || anzeigeAtlas.balken === undefined) throw new Error('anzeige.json: kein Anzeigeatlas');
  const anzeigeM = massstabVon(anzeigeAtlas, 'anzeige.json');
  const anzeigeBild = await ladeBild(`${ordner}${anzeigeAtlas.blatt}`);

  const atlanten = {} as Record<SpriteBlatt, SpriteAtlas>;
  const massstab = {} as Record<SpriteBlatt, number>;
  const blaetter = {} as Record<SpriteBlatt, CanvasImageSource>;
  const kontur = {} as Record<SpriteBlatt, CanvasImageSource>;
  const konturArt = {} as Record<SpriteBlatt, KonturArt>;
  for (const s of sprites) {
    atlanten[s.name] = s.atlas;
    massstab[s.name] = s.m;
    blaetter[s.name] = s.bild;
    const k = konturBlatt(s.bild, s.m);
    kontur[s.name] = k.canvas;
    konturArt[s.name] = k.art;
  }
  const ebenen: Ebene[] = ['himmel', 'wand', 'boden', 'vordergrund'];
  const karten = {} as Record<Ebene, Karte[]>;
  const freie = {} as Record<Ebene, FreiesBild[]>;
  for (const e of ebenen) {
    karten[e] = [];
    const liste: { f: FreiesBild; bi: number; fi: number }[] = [];
    hintergruende.forEach((h, bi) => {
      for (const k of h.atlas.karten) if (k.ebene === e) karten[e].push({ karte: k, flaeche: karteFlaeche(h.atlas, h.bild, k), m: h.m });
      h.atlas.bilder.forEach((b, fi) => {
        if (b.ebene === e) liste.push({ f: { bild: b, quelle: h.bild, m: h.m }, bi, fi });
      });
    });
    liste.sort((p, q) => p.f.bild.folge - q.f.bild.folge || p.bi - q.bi || p.fi - q.fi);
    freie[e] = liste.map((l) => l.f);
  }
  return {
    atlanten,
    dateien,
    massstab,
    blaetter,
    kontur,
    konturArt,
    karten,
    freie,
    blende: { atlas: blendeAtlas, bild: blendeBild, m: blendeM },
    anzeige: { atlas: anzeigeAtlas, bild: anzeigeBild, m: anzeigeM },
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

/** Breite des Bilds einer Wahl in Spielpixeln (Schatten kleiner Objekte), 0 ohne Bild. */
export function spielBreite(g: Grafik, w: Wahl): number {
  const b = atlasBild(g, w);
  return b === null ? 0 : Math.round(b.b / g.massstab[w.blatt]);
}

/**
 * Zeichnet das Bild einer Wahl mit dem Anker auf (x, y) in Spielpixeln;
 * gespiegelt um die Mitte der Spielpixelspalte des Ankers (Blick links).
 * nurKontur: nur das Konturblatt (Schutzblinken).
 */
export function zeichneWahl(zn: Zeichner, g: Grafik, w: Wahl, x: number, y: number, nurKontur: boolean = false): void {
  ersatzMelden(w);
  const b = atlasBild(g, w);
  if (b === null) return;
  const quelle = nurKontur ? g.kontur[w.blatt] : g.blaetter[w.blatt];
  zn.bild(quelle, b, g.massstab[w.blatt], x, y, b.ankerX, b.ankerY, w.spiegeln);
}

/**
 * Schatten mit der Mitte auf (x, y) wie zeichnen.ts (Ellipse um den
 * Schattenpunkt), feste Deckkraft: eine pixelgenaue Ellipse in Spielpixeln
 * (G7-12; Zeichner.pixelEllipse).
 */
export function zeichneSchatten(zn: Zeichner, x: number, y: number, breite: number, hoehe: number): void {
  zn.pixelEllipse(x, y, breite, hoehe, SCHATTEN_SPRITE.farbe, SCHATTEN_SPRITE.deckkraft);
}

// ===========================================================================
// Hintergrund, Vordergrund, Blende (4.8)
// ===========================================================================

/**
 * Zeichnet eine Ebene aller Hintergrundblätter: erst die Karten, dann die
 * freien Bilder nach folge (4.8, Absatz „Zeichnen“). K, Ky = Kamera; frame
 * wählt das Bild animierter freier Bilder (Dampf, G5-12). Weltlagen in
 * Spielpixeln, Flächen und Bilder in Pixeln ihres Blatts (Massstab m).
 */
export function zeichneEbene(zn: Zeichner, g: Grafik, ebene: Ebene, kx: number, ky: number, frame: number): void {
  for (const { karte, flaeche: f, m } of g.karten[ebene]) {
    const sx = karte.x - Math.floor(kx * karte.parallax);
    const sy = karte.y + ky;
    const breite = f.width / m;
    const x0 = Math.max(0, -sx);
    const x1 = Math.min(breite, BILD_BREITE - sx);
    if (x1 <= x0 || sy >= BILD_HOEHE || sy + f.height / m <= 0) continue;
    zn.deckkraft(karte.deckkraft);
    zn.bild(f, { x: x0 * m, y: 0, b: (x1 - x0) * m, h: f.height }, m, sx + x0, sy);
  }
  for (const { bild: b, quelle, m } of g.freie[ebene]) {
    const sx = b.x - Math.floor(kx * b.parallax);
    if (sx >= BILD_BREITE || sx + b.b / m <= 0) continue;
    const n = b.bilder.length;
    const i = b.dauer > 0 && n > 0 ? Math.floor(frame / b.dauer) % n : 0;
    const q = b.bilder[i];
    if (q === undefined) continue;
    zn.deckkraft(b.deckkraft);
    zn.bild(quelle, { x: q.x, y: q.y, b: b.b, h: b.h }, m, sx, b.y + ky);
  }
  zn.deckkraft(1);
}

/**
 * Blende bei Deckung d (0 bis zu, 4.8 Punkt 5; G5-5): die Szene wie heute
 * abdunkeln (Deckkraft d/zu), dazu ein voll dunkles Feld ab
 * F = weg − ⌊weg · d / zu⌋ und links davon die Kantenkachel untereinander.
 */
export function zeichneBlendeSprites(zn: Zeichner, g: Grafik, d: number): void {
  if (d <= 0) return;
  const a = g.blende.atlas;
  const m = g.blende.m;
  zn.deckkraft(Math.min(1, d / a.zu));
  zn.rechteck(0, 0, BILD_BREITE, BILD_HOEHE, FARBE.rand);
  zn.deckkraft(1);
  const front = a.weg - Math.floor((a.weg * d) / a.zu);
  if (front < BILD_BREITE) zn.rechteck(front, 0, BILD_BREITE - front, BILD_HOEHE, FARBE.rand);
  const k = a.kante;
  for (let y = 0; y < BILD_HOEHE; y += k.h / m) zn.bild(g.blende.bild, k, m, front - k.b / m, y);
}

// ===========================================================================
// Anzeige (4.9, „Zeichnen im Einbau“); Längen des Atlas in Pixeln des
// Blatts, geteilt durch seinen Massstab
// ===========================================================================

/** Teil t mit dem Anker auf (x, y). */
function teil(zn: Zeichner, g: Grafik, t: AnzeigeTeil, x: number, y: number): void {
  zn.bild(g.anzeige.bild, t, g.anzeige.m, x, y, t.ankerX, t.ankerY);
}

/** Text ab (x, y) = linke obere Ecke der ersten Zelle, groß geschrieben, Unbekanntes als Ersatz; gibt die Breite in Spielpixeln zurück. */
export function zeichneText(zn: Zeichner, g: Grafik, s: AnzeigeSchrift, inhalt: string, x: number, y: number): number {
  const zeichen = [...inhalt.toUpperCase()];
  const lauf = s.laufweite / g.anzeige.m;
  zeichen.forEach((c, i) => {
    const t = s.zeichen[c] ?? s.zeichen[s.ersatz];
    if (t !== undefined) teil(zn, g, t, x + i * lauf, y);
  });
  return zeichen.length * lauf;
}

/** LP-Balken (Welt 10.1, 4.9): Rahmen, Läufe gleicher Bausteine gestreckt (ein Aufruf je Lauf). */
function zeichneBalken(zn: Zeichner, g: Grafik, x0: number, zeile0: number, b: Balken): void {
  const a = g.anzeige.atlas.balken;
  const m = g.anzeige.m;
  const breite = a.breite / m;
  const lage = (n: number): AnzeigeTeil => a.lagen[Math.min(n, a.lagen.length) - 1] ?? a.leer;
  const lauf = (t: AnzeigeTeil, von: number, bis: number): void => {
    if (bis <= von) return;
    zn.bild(g.anzeige.bild, t, m, x0 + von, zeile0, t.ankerX, t.ankerY, false, bis - von);
  };
  teil(zn, g, a.rahmen_links, x0 - 1, zeile0);
  const voll = Math.max(0, Math.min(b.breite, breite));
  if (voll > 0) lauf(lage(b.lage), 0, voll);
  lauf(b.unterlage > 0 ? lage(b.unterlage) : a.leer, voll, breite);
  teil(zn, g, a.rahmen_rechts, x0 + breite, zeile0);
}

/** Anzeigeleiste nach Welt 10.1 und Pfeil „weiter“ (4.9). */
export function zeichneAnzeigeSprites(zn: Zeichner, g: Grafik, d: AnzeigeDaten): void {
  const a = g.anzeige.atlas;
  const klein = a.schriften.klein;
  zeichneText(zn, g, klein, d.name, ANZEIGE.name.x, ANZEIGE.name.zeile);
  zeichneText(zn, g, klein, d.punkte, ANZEIGE.punkte.x, ANZEIGE.punkte.zeile);
  teil(zn, g, a.leben, ANZEIGE.leben.x, ANZEIGE.leben.zeile);
  zeichneText(zn, g, klein, String(d.leben), ANZEIGE.leben.x + a.leben.zahlDx / g.anzeige.m, ANZEIGE.leben.zeile);
  zeichneBalken(zn, g, ANZEIGE.lp_balken.x0, ANZEIGE.lp_balken.zeile0, d.figur);
  if (d.gegner !== null) {
    zeichneText(zn, g, klein, d.gegner.name, ANZEIGE.gegner_name.x, ANZEIGE.gegner_name.zeile);
    zeichneBalken(zn, g, ANZEIGE.gegner_balken.x0, ANZEIGE.gegner_balken.zeile0, d.gegner.balken);
  }
  if (d.pfeil) teil(zn, g, a.pfeil, ANZEIGE.pfeil.x0, ANZEIGE.pfeil.zeile0);
}

/** Große Texte waagrecht mittig, Zeilen im Abstand 20, der Block senkrecht mittig; fertige Bilder, sonst gesetzt (4.9, G6-4). */
export function zeichneGrosseTexteSprites(zn: Zeichner, g: Grafik, zeilen: readonly string[]): void {
  if (zeilen.length === 0) return;
  const a = g.anzeige.atlas;
  const s = a.schriften.gross;
  const lauf = s.laufweite / g.anzeige.m;
  const zeilenhoehe = s.zeilenhoehe / g.anzeige.m;
  let y = Math.floor((BILD_HOEHE - zeilen.length * zeilenhoehe) / 2);
  for (const zeile of zeilen) {
    const x = Math.floor((BILD_BREITE - [...zeile].length * lauf) / 2);
    const fertig = a.texte[zeile];
    if (fertig !== undefined) teil(zn, g, fertig, x, y);
    else zeichneText(zn, g, s, zeile, x, y);
    y += zeilenhoehe;
  }
}

/** Hinweis „AUFZ“ oben rechts in der kleinen Schrift mit rotem Punkt (F2). */
export function zeichneAufzeichnungSprites(zn: Zeichner, g: Grafik): void {
  const s = g.anzeige.atlas.schriften.klein;
  const inhalt = 'AUFZ';
  const x = BILD_BREITE - AUFZEICHNUNG_LAGE.rechts - (inhalt.length * s.laufweite) / g.anzeige.m;
  zn.rechteck(x - LEBEN_ABSTAND, AUFZEICHNUNG_LAGE.zeile + 1, LEBEN_SYMBOL.breite, LEBEN_SYMBOL.breite, FARBE.aufzeichnung);
  zeichneText(zn, g, s, inhalt, x, AUFZEICHNUNG_LAGE.zeile);
}
