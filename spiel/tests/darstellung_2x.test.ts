import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { SpriteAtlas } from '../src/darstellung/zuordnung.ts';
import type { AnzeigeAtlas, AnzeigeSchrift, AnzeigeTeil, BlendeAtlas, HintergrundAtlas } from '../src/darstellung/blaetter.ts';
import { BLAETTER_LISTE, GROK_ENDUNG, HINTERGRUND_BLAETTER, blaetterListe, blattWahl, konturMaske, massstabVon } from '../src/darstellung/blaetter.ts';
import { DARSTELLUNG, KONTUR_RGB } from '../src/darstellung/masse.ts';
import { SPRITE_BLAETTER } from '../src/darstellung/zuordnung.ts';
import { pngDateiLesen, pngSchreiben } from '../grafik/quelle/png.ts';
import { SPIEL, lies } from './hilfe.ts';
import type { Server } from './darstellung_hilfe.ts';
import { ladePlaywright, tscPfad } from './darstellung_hilfe.ts';
import { AUSGABE } from './grafik_einbau_hilfe.ts';

// Auftrag 5, Phase 1, U1 (docs/grafik.md 9.10): Die Darstellung zeichnet mit
// zwei Bildpixeln je Spielpixel. Geprüft werden
//   - in Node die reinen Funktionen aus blaetter.ts: Blattwahl nach
//     blaetter.json, Massstab der Atlanten, Konturmaske für das Schutzblinken;
//   - im Browser, dass ein Blatt mit Massstab 1 und dasselbe Blatt auf das
//     Doppelte vergrößert mit Massstab 2 dasselbe Bild ergeben: Alle Blätter
//     der Darstellung (Sprites, Hintergründe, Blende, Anzeige) werden in Node
//     verdoppelt (nächster Nachbar, Rechtecke, Maße und Anker · 2, Weltlagen
//     unverändert) und einer zweiten Seite statt der Blätter aus
//     grafik/ausgabe/ geliefert, Sprites und Hintergründe als <name>_grok
//     über blaetter.json (so läuft auch die Blattwahl mit); beide Seiten
//     spielen die Vorführung und die Arena, und an neun Bildern muss das
//     Canvas gleich sein: ein Ausschnitt um Vela Byte für Byte, das ganze
//     Bild über Zeilenprüfsummen;
//   - die Leistung: 600 Bilder der Vorführung in Chromium, mittlere Zeit je
//     Bild (Logikschritt und Zeichnen) unter 8 ms.
// Die Browserfassung wird für diesen Test in einen eigenen Ordner gebaut
// (nicht dist/, damit parallel laufende Tests sich nicht stören).

/** Höchstdauer der Browsertests und Wartezeit auf window.comet in ms. */
const TEST_MS = 180000;
const WARTEN_MS = 30000;
/** Vorführung und Frames des Vergleichs (Kette mit Magnetstoß und Funke, Sprung, Wurf, Trümmer, Spezial mit Eiswelle beidseitig, Rammbock, Sprint mit Dampf). */
const EINGABE = 'tests/eingaben/vorfuehrung.txt';
const FRAMES = [182, 300, 546, 600, 718, 900, 1200, 1500];
/** Arena: Prüfszene mit der Asservatenkammer und dem Ballast (foto.mjs szene_arena.png). */
const ARENA = { szene: 'tests/szenen/grafik_arena.txt', eingabe: 'tests/eingaben/grafik_arena.txt', frame: 138 };
/** Ausschnitt um Vela in Spielpixeln (Breite, Höhe; Fußpunkt unten mittig). */
const AUSSCHNITT = { breite: 128, hoehe: 104 };
/** Leistung: Zahl der Bilder und Grenze der mittleren Zeit je Bild in ms (Auftrag 5, U1). */
const LEISTUNG = { bilder: 600, grenzeMs: 8 };

// ===========================================================================
// Node: Blattwahl, Massstab, Konturmaske
// ===========================================================================

test('Blattwahl: ohne blaetter.json die bisherigen Blätter, sonst <name>_grok, wenn gebaut; rammbock_fremd nie', () => {
  const ohne = blattWahl(null);
  for (const n of [...SPRITE_BLAETTER, ...HINTERGRUND_BLAETTER]) assert.equal(ohne[n], n);
  const liste = ['ballast', 'objekte_grok', 'rammbock', 'rammbock_fremd', 'rammbock_grok', 'vela', 'vela_grok', 'hintergrund_a_grok', 'zuender'];
  const mit = blattWahl(liste);
  assert.equal(mit.vela, 'vela_grok');
  assert.equal(mit.rammbock, 'rammbock_grok');
  assert.equal(mit.objekte, 'objekte_grok');
  assert.equal(mit.hintergrund_a, 'hintergrund_a_grok');
  for (const n of ['bolzer', 'puppe', 'zuender', 'ballast', 'hintergrund_b', 'hintergrund_f'] as const) assert.equal(mit[n], n);
  assert.ok(!Object.values(mit).includes('rammbock_fremd'));
  assert.deepEqual(Object.keys(mit).sort(), [...SPRITE_BLAETTER, ...HINTERGRUND_BLAETTER].sort(), 'nur Blätter der Darstellung');
  assert.equal(blattWahl(['puppe' + GROK_ENDUNG]).puppe, 'puppe_grok');
  // blaetter.json: Liste von Namen, sonst Fehler (Rückfall auf die Rechtecke)
  assert.deepEqual(blaetterListe(['a', 'b']), ['a', 'b']);
  assert.throws(() => blaetterListe({ vela: true }), new RegExp(BLAETTER_LISTE));
  assert.throws(() => blaetterListe(['vela', 3]));
});

test('Massstab: fehlend oder 1 = Spielpixel, 2 = Bildpixel, sonst Fehler', () => {
  assert.equal(massstabVon({}, 'a'), 1);
  assert.equal(massstabVon({ massstab: 1 }, 'a'), 1);
  assert.equal(massstabVon({ massstab: 2 }, 'a'), 2);
  assert.throws(() => massstabVon({ massstab: 3 }, 'x.json'), /x\.json: massstab 3/);
  assert.throws(() => massstabVon({ massstab: '2' }, 'x.json'));
  assert.equal(DARSTELLUNG, 2);
  // die gebauten Atlanten in grafik/ausgabe/ tragen einen gültigen Massstab
  for (const name of [...SPRITE_BLAETTER, ...HINTERGRUND_BLAETTER, 'hintergrund_blende', 'anzeige']) {
    const atlas = JSON.parse(readFileSync(`${AUSGABE}${name}.json`, 'utf8')) as { massstab?: unknown };
    assert.doesNotThrow(() => massstabVon(atlas, name));
  }
});

/** RGBA-Daten aus Zeilen: '#' = KONTUR, 'o' = andere Farbe, '.' = durchsichtig. */
function bildAus(zeilen: string[]): { p: Uint8ClampedArray; b: number; h: number } {
  const b = zeilen[0]?.length ?? 0;
  const h = zeilen.length;
  const p = new Uint8ClampedArray(b * h * 4);
  zeilen.forEach((z, y) =>
    [...z].forEach((c, x) => {
      const o = (y * b + x) * 4;
      if (c === '#') p.set([...KONTUR_RGB, 255], o);
      else if (c === 'o') p.set([200, 120, 60, 255], o);
    }),
  );
  return { p, b, h };
}

/** Deckende Pixel als Zeilen aus 'x' und '.'. */
function deckendAls(p: Uint8ClampedArray, b: number, h: number): string[] {
  const aus: string[] = [];
  for (let y = 0; y < h; y++) {
    let z = '';
    for (let x = 0; x < b; x++) z += p[(y * b + x) * 4 + 3] !== 0 ? 'x' : '.';
    aus.push(z);
  }
  return aus;
}

test('Konturmaske: Blatt mit KONTUR behält genau diese Pixel; Blatt ohne KONTUR seinen Rand, ein Spielpixel breit (Ringe = Massstab)', () => {
  const mitKontur = bildAus(['.###.', '#ooo#', '#ooo#', '.###.']);
  assert.equal(konturMaske(mitKontur.p, mitKontur.b, mitKontur.h, KONTUR_RGB, 2), 'kontur');
  assert.deepEqual(deckendAls(mitKontur.p, mitKontur.b, mitKontur.h), ['.xxx.', 'x...x', 'x...x', '.xxx.']);

  const zeilen = ['........', '.oooooo.', '.oooooo.', '.oooooo.', '.oooooo.', '.oooooo.', '.oooooo.', '........'];
  const ein = bildAus(zeilen);
  assert.equal(konturMaske(ein.p, ein.b, ein.h, KONTUR_RGB, 1), 'rand');
  assert.deepEqual(deckendAls(ein.p, ein.b, ein.h), ['........', '.xxxxxx.', '.x....x.', '.x....x.', '.x....x.', '.x....x.', '.xxxxxx.', '........']);
  const zwei = bildAus(zeilen);
  assert.equal(konturMaske(zwei.p, zwei.b, zwei.h, KONTUR_RGB, 2), 'rand');
  assert.deepEqual(deckendAls(zwei.p, zwei.b, zwei.h), ['........', '.xxxxxx.', '.xxxxxx.', '.xx..xx.', '.xx..xx.', '.xxxxxx.', '.xxxxxx.', '........']);
  // Pixel am Blattrand zählen als Rand; die Farbe der Randpixel bleibt
  const rand = bildAus(['oo', 'oo']);
  konturMaske(rand.p, 2, 2, KONTUR_RGB, 1);
  assert.deepEqual([...rand.p.slice(0, 4)], [200, 120, 60, 255]);
});

// ===========================================================================
// Browser: 1×-Atlas gegen denselben Atlas als 2×
// ===========================================================================

const doppelt = (v: number): number => v * DARSTELLUNG;

function teil2<T extends AnzeigeTeil>(t: T): T {
  return { ...t, x: doppelt(t.x), y: doppelt(t.y), b: doppelt(t.b), h: doppelt(t.h), ankerX: doppelt(t.ankerX), ankerY: doppelt(t.ankerY) };
}

function abbilden<T, U>(r: Record<string, T>, f: (t: T) => U): Record<string, U> {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, f(v)]));
}

/** Sprite-Atlas als 2×: Rechtecke und Anker in Bildpixeln (Anker = linker oberer Bildpixel des Ankerpixels). */
function spriteAtlas2(a: SpriteAtlas): SpriteAtlas {
  return {
    blatt: a.blatt,
    massstab: DARSTELLUNG,
    animationen: abbilden(a.animationen, (an) => ({ ...an, bilder: an.bilder.map((b) => ({ ...teil2(b), dauer: b.dauer })) })),
  };
}

/** Hintergrundatlas als 2×: Kacheln, Lagen im Blatt und Maße der freien Bilder in Bildpixeln, Weltlagen unverändert. */
function hintergrundAtlas2(a: HintergrundAtlas): HintergrundAtlas {
  return {
    ...a,
    massstab: DARSTELLUNG,
    kachel: doppelt(a.kachel),
    kacheln: a.kacheln.map(([x, y]) => [doppelt(x), doppelt(y)] as [number, number]),
    bilder: a.bilder.map((b) => ({ ...b, b: doppelt(b.b), h: doppelt(b.h), bilder: b.bilder.map((q) => ({ x: doppelt(q.x), y: doppelt(q.y) })) })),
  };
}

function blendeAtlas2(a: BlendeAtlas): BlendeAtlas {
  return { ...a, massstab: DARSTELLUNG, kachel: doppelt(a.kachel), kante: { x: doppelt(a.kante.x), y: doppelt(a.kante.y), b: doppelt(a.kante.b), h: doppelt(a.kante.h) } };
}

function schrift2(s: AnzeigeSchrift): AnzeigeSchrift {
  return { ...s, laufweite: doppelt(s.laufweite), zeilenhoehe: doppelt(s.zeilenhoehe), zeichen: abbilden(s.zeichen, teil2) };
}

/** Anzeigeatlas als 2×: alle Längen in Bildpixeln. */
function anzeigeAtlas2(a: AnzeigeAtlas): AnzeigeAtlas {
  const b = a.balken;
  return {
    ...a,
    massstab: DARSTELLUNG,
    schriften: { klein: schrift2(a.schriften.klein), gross: schrift2(a.schriften.gross) },
    balken: { ...b, breite: doppelt(b.breite), rahmen_links: teil2(b.rahmen_links), rahmen_rechts: teil2(b.rahmen_rechts), lagen: b.lagen.map(teil2), leer: teil2(b.leer) },
    leben: { ...teil2(a.leben), zahlDx: doppelt(a.leben.zahlDx) },
    pfeil: teil2(a.pfeil),
    texte: abbilden(a.texte, teil2),
  };
}

/**
 * Alle Blätter der Darstellung als 2× (Pfad unter / → Inhalt, null = 404):
 * Sprites und Hintergründe als <name>_grok mit blaetter.json, damit die
 * Seite sie über die Blattwahl lädt (die bisherigen Namen fehlen), Blende und
 * Anzeige unter ihrem Namen.
 */
function blaetter2(): Map<string, Uint8Array | null> {
  const aus = new Map<string, Uint8Array | null>();
  const pfad = '/grafik/ausgabe/';
  const text = (s: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(s));
  const blatt = (von: string, nach: string = von): void => {
    aus.set(pfad + nach, pngSchreiben(pngDateiLesen(AUSGABE + von).vergroessert(DARSTELLUNG)));
  };
  const json = <T>(name: string): T => JSON.parse(readFileSync(`${AUSGABE}${name}.json`, 'utf8')) as T;
  const grok: string[] = [];
  const umbenannt = (name: string, a: { blatt: string }): string => {
    aus.set(`${pfad}${name}.json`, null);
    aus.set(pfad + a.blatt, null);
    grok.push(name + GROK_ENDUNG);
    return `${name}${GROK_ENDUNG}.png`;
  };
  for (const name of SPRITE_BLAETTER) {
    const a = json<SpriteAtlas>(name);
    const neu = umbenannt(name, a);
    aus.set(`${pfad}${name}${GROK_ENDUNG}.json`, text({ ...spriteAtlas2(a), blatt: neu }));
    blatt(a.blatt, neu);
  }
  for (const name of HINTERGRUND_BLAETTER) {
    const a = json<HintergrundAtlas>(name);
    const neu = umbenannt(name, a);
    aus.set(`${pfad}${name}${GROK_ENDUNG}.json`, text({ ...hintergrundAtlas2(a), blatt: neu }));
    blatt(a.blatt, neu);
  }
  const blende = json<BlendeAtlas>('hintergrund_blende');
  aus.set(`${pfad}hintergrund_blende.json`, text(blendeAtlas2(blende)));
  blatt(blende.blatt);
  const anzeige = json<AnzeigeAtlas>('anzeige');
  aus.set(`${pfad}anzeige.json`, text(anzeigeAtlas2(anzeige)));
  blatt(anzeige.blatt);
  aus.set(pfad + BLAETTER_LISTE, text([...grok, 'anzeige', 'hintergrund_blende', 'rammbock_fremd'].sort()));
  return aus;
}

const TYPEN: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

/**
 * Webserver für spiel/ auf einem freien Port: /dist/ aus dem eigenen Bau,
 * Pfade aus ersetzen mit deren Inhalt (null = 404), sonst die Datei.
 */
function server(dist: string, ersetzen: ReadonlyMap<string, Uint8Array | null>): Promise<Server> {
  const basis = resolve(SPIEL);
  const s = createServer((anfrage, antwort) => {
    const pfad = decodeURIComponent(new URL(anfrage.url ?? '/', 'http://localhost').pathname);
    const typ = TYPEN[extname(pfad)] ?? 'application/octet-stream';
    if (ersetzen.has(pfad)) {
      const inhalt = ersetzen.get(pfad);
      if (inhalt === null || inhalt === undefined) antwort.writeHead(404).end();
      else antwort.writeHead(200, { 'Content-Type': typ, 'Cache-Control': 'no-store' }).end(inhalt);
      return;
    }
    const wurzel = pfad.startsWith('/dist/') ? resolve(dist) : basis;
    let datei = normalize(join(wurzel, pfad.startsWith('/dist/') ? pfad.slice('/dist/'.length) : pfad));
    if (datei !== wurzel && !datei.startsWith(wurzel + sep)) {
      antwort.writeHead(403).end();
      return;
    }
    if (pfad.endsWith('/')) datei = join(datei, 'index.html');
    try {
      const inhalt = readFileSync(datei);
      antwort.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? typ, 'Cache-Control': 'no-store' }).end(inhalt);
    } catch {
      antwort.writeHead(404).end();
    }
  });
  return new Promise((fertig, fehler) => {
    s.once('error', fehler);
    s.listen(0, '127.0.0.1', () => {
      const adresse = s.address() as AddressInfo;
      fertig({
        url: `http://127.0.0.1:${adresse.port}/`,
        schliessen: () =>
          new Promise<void>((zu) => {
            s.closeAllConnections();
            s.close(() => zu());
          }),
      });
    });
  });
}

/** Benutzter Ausschnitt einer Playwright-Seite. */
interface Seite2 {
  goto(url: string): Promise<unknown>;
  waitForFunction(ausdruck: string, arg?: unknown, optionen?: { timeout: number }): Promise<unknown>;
  evaluate<T>(ausdruck: string): Promise<T>;
  on(ereignis: 'pageerror', rueckruf: (fehler: Error) => void): void;
  on(ereignis: 'console', rueckruf: (meldung: { type(): string; text(): string }) => void): void;
}

/** Canvas eines Frames: Zeilenprüfsummen des ganzen Bildes und der Ausschnitt um Vela als Base64. */
interface CanvasBild {
  breite: number;
  hoehe: number;
  zeilen: number[];
  ausschnitt: string;
  x0: number;
  y0: number;
  farben: number;
}

/** Liest das Canvas nach dem letzten Schritt (Ausdruck für page.evaluate). */
const CANVAS_LESEN = `(() => {
  const c = document.getElementById('bild');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const zeilen = [];
  for (let y = 0; y < c.height; y++) {
    let h = 2166136261;
    for (let i = y * c.width * 4; i < (y + 1) * c.width * 4; i++) { h ^= d[i]; h = Math.imul(h, 16777619); }
    zeilen.push(h >>> 0);
  }
  const z = window.comet.zustand();
  const f = ${DARSTELLUNG};
  const fx = Math.floor(z.figur.x) - z.kamera.x;
  const fy = 234 - (Math.floor(z.figur.z) - z.kamera.y) - Math.floor(z.figur.h);
  const b = ${AUSSCHNITT.breite} * f, h = ${AUSSCHNITT.hoehe} * f;
  const x0 = Math.max(0, Math.min(c.width - b, (fx - ${AUSSCHNITT.breite / 2}) * f));
  const y0 = Math.max(0, Math.min(c.height - h, (fy + 8) * f - h));
  const farben = new Set();
  let roh = '';
  for (let y = y0; y < y0 + h; y++) {
    const o = (y * c.width + x0) * 4;
    const reihe = d.subarray(o, o + b * 4);
    for (let i = 0; i < reihe.length; i += 4) farben.add((reihe[i] << 16) | (reihe[i + 1] << 8) | reihe[i + 2]);
    for (let i = 0; i < reihe.length; i += 8192) roh += String.fromCharCode.apply(null, reihe.subarray(i, i + 8192));
  }
  return { breite: c.width, hoehe: c.height, zeilen, ausschnitt: btoa(roh), x0, y0, farben: farben.size };
})()`;

/** Lädt die Seite, wartet auf window.comet; Fehler der Seite, Rückfall auf die Rechtecke und Ersatzwahlen der Grafik landen in fehler. */
async function oeffnen(seite: Seite2, url: string, fehler: string[]): Promise<void> {
  seite.on('pageerror', (e) => fehler.push(e.message));
  seite.on('console', (m) => {
    if (m.text().startsWith('Grafik')) fehler.push(`${m.type()}: ${m.text()}`);
  });
  await seite.goto(url);
  await seite.waitForFunction('window.comet !== undefined && window.comet.bereit === true', undefined, { timeout: WARTEN_MS });
}

/** Spielt in einer Seite die Vorführung bis zu den Frames und die Arena und liest je Frame das Canvas. */
async function bilder(seite: Seite2): Promise<Map<string, CanvasBild>> {
  const aus = new Map<string, CanvasBild>();
  await seite.evaluate(`window.comet.ladeEingabe(${JSON.stringify(lies(EINGABE))}).frame`);
  let frame = 0;
  for (const f of FRAMES) {
    await seite.evaluate(`window.comet.schritt(${f - frame}).frame`);
    frame = f;
    aus.set(`Vorführung Frame ${f}`, await seite.evaluate<CanvasBild>(CANVAS_LESEN));
  }
  await seite.evaluate(`window.comet.ladeSzene(${JSON.stringify(lies(ARENA.szene))}, ${JSON.stringify(lies(ARENA.eingabe))}).then((z) => z.frame)`);
  await seite.evaluate(`window.comet.schritt(${ARENA.frame}).frame`);
  aus.set(`Arena Frame ${ARENA.frame}`, await seite.evaluate<CanvasBild>(CANVAS_LESEN));
  return aus;
}

/** Baut die Browserfassung in einen eigenen Ordner; gibt ihn zurück. */
function eigenerBau(): string {
  const dist = mkdtempSync(join(tmpdir(), 'comet-2x-'));
  execFileSync(tscPfad(), ['-p', 'tsconfig.browser.json', '--outDir', dist], { cwd: SPIEL, stdio: 'pipe' });
  return dist;
}

test('Darstellung 2×: ein Atlas mit Massstab 1 und derselbe Atlas verdoppelt mit Massstab 2 ergeben dasselbe Bild (Vorführung, Arena)', { timeout: TEST_MS }, async (t) => {
  const pw = ladePlaywright();
  if (pw === null) {
    t.skip('Playwright fehlt (NODE_PATH=/opt/node22/lib/node_modules)');
    return;
  }
  const dist = eigenerBau();
  const einfach = await server(dist, new Map([['/grafik/ausgabe/' + BLAETTER_LISTE, null]]));
  const zweifach = await server(dist, blaetter2());
  const browser = await pw.chromium.launch();
  const fehler: string[] = [];
  let a: Map<string, CanvasBild>;
  let b: Map<string, CanvasBild>;
  try {
    const s1 = (await browser.newPage()) as unknown as Seite2;
    const s2 = (await browser.newPage()) as unknown as Seite2;
    await oeffnen(s1, einfach.url, fehler);
    await oeffnen(s2, zweifach.url, fehler);
    assert.equal(await s2.evaluate<number>('document.getElementById("bild").width'), 384 * DARSTELLUNG);
    a = await bilder(s1);
    b = await bilder(s2);
  } finally {
    await browser.close();
    await einfach.schliessen();
    await zweifach.schliessen();
    rmSync(dist, { recursive: true, force: true });
  }
  assert.deepEqual(fehler, [], 'Fehler in der Seite');
  assert.equal(a.size, FRAMES.length + 1);
  for (const [wo, x] of a) {
    const y = b.get(wo);
    assert.ok(y !== undefined, wo);
    assert.equal(x.breite, 768, `${wo}: Canvas 768 breit`);
    assert.equal(x.hoehe, 448, `${wo}: Canvas 448 hoch`);
    assert.ok(x.farben >= 8, `${wo}: Ausschnitt hat nur ${x.farben} Farben (keine Grafik?)`);
    assert.deepEqual([y.x0, y.y0], [x.x0, x.y0], `${wo}: Lage des Ausschnitts`);
    assert.ok(y.ausschnitt === x.ausschnitt, `${wo}: Ausschnitt ${AUSSCHNITT.breite * DARSTELLUNG} × ${AUSSCHNITT.hoehe * DARSTELLUNG} ab (${x.x0}, ${x.y0}) verschieden`);
    const anders = x.zeilen.flatMap((h, i) => (h === y.zeilen[i] ? [] : [i]));
    assert.deepEqual(anders, [], `${wo}: Bildzeilen verschieden`);
  }
  t.diagnostic(`${a.size} Bilder 768 × 448 gleich, Ausschnitt um Vela ${AUSSCHNITT.breite * DARSTELLUNG} × ${AUSSCHNITT.hoehe * DARSTELLUNG} Byte für Byte`);
});

test(`Darstellung 2×: ${LEISTUNG.bilder} Bilder der Vorführung in Chromium, mittlere Zeit je Bild unter ${LEISTUNG.grenzeMs} ms`, { timeout: TEST_MS }, async (t) => {
  const pw = ladePlaywright();
  if (pw === null) {
    t.skip('Playwright fehlt (NODE_PATH=/opt/node22/lib/node_modules)');
    return;
  }
  const dist = eigenerBau();
  const s = await server(dist, new Map());
  const browser = await pw.chromium.launch();
  const fehler: string[] = [];
  let m: { mittel: number; median: number; p95: number; erstes: number; mittelRaster: number };
  try {
    const seite = (await browser.newPage()) as unknown as Seite2;
    await oeffnen(seite, s.url, fehler);
    // je Bild: Logikschritt und Zeichnen (window.comet.schritt), einmal ohne und einmal mit erzwungenem Rastern (1 Pixel lesen)
    m = await seite.evaluate(`(() => {
      const c = window.comet;
      const ctx = document.getElementById('bild').getContext('2d');
      const lauf = (raster) => {
        c.ladeEingabe(${JSON.stringify(lies(EINGABE))});
        const zeiten = [];
        for (let i = 0; i < ${LEISTUNG.bilder}; i++) {
          const t0 = performance.now();
          c.schritt(1);
          if (raster) ctx.getImageData(0, 0, 1, 1);
          zeiten.push(performance.now() - t0);
        }
        return zeiten;
      };
      const ohne = lauf(false);
      const mit = lauf(true);
      const mittel = (z) => z.reduce((s, v) => s + v, 0) / z.length;
      const sortiert = [...ohne].sort((p, q) => p - q);
      return {
        mittel: mittel(ohne), median: sortiert[Math.floor(sortiert.length / 2)], p95: sortiert[Math.floor(sortiert.length * 0.95)],
        erstes: ohne[0], mittelRaster: mittel(mit),
      };
    })()`);
  } finally {
    await browser.close();
    await s.schliessen();
    rmSync(dist, { recursive: true, force: true });
  }
  assert.deepEqual(fehler, [], 'Fehler in der Seite');
  const r = (v: number): string => v.toFixed(2);
  t.diagnostic(`je Bild: Mittel ${r(m.mittel)} ms, Median ${r(m.median)} ms, 95 % unter ${r(m.p95)} ms, erstes ${r(m.erstes)} ms; mit erzwungenem Rastern Mittel ${r(m.mittelRaster)} ms`);
  assert.ok(m.mittel < LEISTUNG.grenzeMs, `mittlere Zeit je Bild ${r(m.mittel)} ms`);
  assert.ok(m.mittelRaster < LEISTUNG.grenzeMs, `mittlere Zeit je Bild mit Rastern ${r(m.mittelRaster)} ms`);
});
