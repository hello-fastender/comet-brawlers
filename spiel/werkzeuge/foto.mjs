// Bildschirmfotos der laufenden Scheibe (Auftrag 3, 2.4 und 2.5).
//
//   node werkzeuge/foto.mjs [--eingabe <datei>] [--abstand <n>] [--debug-frame <n>] [--ohne-bau]
//                           [--szene <datei>] [--aus <ordner>] [--praefix <name>]
//   (im Ordner spiel/: npm run foto)
//
// Ablauf: baut die Browserfassung (tsc -p tsconfig.browser.json, außer mit
// --ohne-bau), startet einen kleinen Webserver mit node:http für den Ordner
// spiel/, öffnet die Seite in Chromium (Playwright, global unter
// /opt/node22/lib/node_modules, Browser aus PLAYWRIGHT_BROWSERS_PATH bzw.
// /opt/pw-browsers, kein playwright install), spielt die Eingabedatei
// (Standard tests/eingaben/vorfuehrung.txt) über window.comet ab und
// speichert alle <abstand> Frames (Standard 300) ein Bild nach
// docs/bilder/scheibe_<frame>.png (Frame vierstellig mit führenden Nullen),
// dazu ein Bild mit Debug-Anzeige nach docs/bilder/scheibe_debug.png
// (Frame --debug-frame, Standard 718: Spezialangriff mit Trefferfläche, ein
// Bolzer im Angriff, der Rammbock im Anmarsch). Am Ende beendet es Browser
// und Server. Das Bild ist 768 × 448 (Raster 384 × 224, zweifach skaliert).
//
// Mit --szene spielt es statt des Spielstarts eine Prüfszene (Kampf 11.2)
// bis zu ihrem endframe ab (window.comet.ladeSzene); --aus und --praefix
// legen Ordner und Namensanfang der Bilder fest (Standard docs/bilder und
// scheibe).

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Ordner spiel/ (eine Ebene über werkzeuge/). */
const SPIEL = fileURLToPath(new URL('../', import.meta.url));
/** Zielordner der Bilder. */
const BILDER = resolve(SPIEL, '../docs/bilder');
/** Standard-Eingabedatei der Vorführung. */
const EINGABE_STANDARD = 'tests/eingaben/vorfuehrung.txt';
/** Abstand der Bilder in Frames. */
const ABSTAND_STANDARD = 300;
/** Frame des Bildes mit Debug-Anzeige (siehe Kopf). */
const DEBUG_FRAME_STANDARD = 718;
/** Logisches Raster (Kampf 2.3) und Vergrößerung der Bilder. */
const BILD_BREITE = 384;
const BILD_HOEHE = 224;
const SKALA = 2;
/** Stellen der Frame-Nummer im Dateinamen. */
const STELLEN = 4;
/** Browser der Umgebung (Auftrag 3, 2.1). */
const PW_BROWSER = '/opt/pw-browsers';
/** Globale Node-Module der Umgebung (Auftrag 3, 2.1). */
const NODE_MODULE = '/opt/node22/lib/node_modules';
/** Wartezeit auf window.comet in ms. */
const WARTEN_MS = 30000;

/** MIME-Typen des Webservers. */
const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ts': 'text/plain; charset=utf-8',
};

/**
 * Lädt Playwright aus ES-Modulen über createRequire (NODE_PATH greift dort
 * nicht direkt): erst über NODE_PATH, dann aus den globalen Modulen.
 */
export function ladePlaywright() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH === undefined && existsSync(PW_BROWSER)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = PW_BROWSER;
  }
  const require = createRequire(import.meta.url);
  const kandidaten = ['playwright', join(NODE_MODULE, 'playwright'), join(dirname(process.execPath), '..', 'lib', 'node_modules', 'playwright')];
  for (const k of kandidaten) {
    try {
      return require(k);
    } catch {
      // nächster Kandidat
    }
  }
  throw new Error('Playwright nicht gefunden (NODE_PATH=/opt/node22/lib/node_modules setzen)');
}

/** Startet einen Webserver für den Ordner wurzel auf einem freien Port; gibt url und schliessen() zurück. */
export function starteServer(wurzel) {
  const basis = resolve(wurzel);
  const server = createServer(async (anfrage, antwort) => {
    try {
      const pfad = decodeURIComponent(new URL(anfrage.url ?? '/', 'http://localhost').pathname);
      let datei = normalize(join(basis, pfad));
      if (datei !== basis && !datei.startsWith(basis + sep)) {
        antwort.writeHead(403).end();
        return;
      }
      if (pfad.endsWith('/')) datei = join(datei, 'index.html');
      const inhalt = await readFile(datei);
      antwort.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      antwort.end(inhalt);
    } catch {
      antwort.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('nicht gefunden');
    }
  });
  return new Promise((fertig, fehler) => {
    server.once('error', fehler);
    server.listen(0, '127.0.0.1', () => {
      const adresse = server.address();
      fertig({
        url: `http://127.0.0.1:${adresse.port}/`,
        schliessen: () =>
          new Promise((zu) => {
            server.closeAllConnections();
            server.close(() => zu());
          }),
      });
    });
  });
}

/** Baut die Browserfassung nach dist/ (tsc aus dem Ordner von node, sonst aus PATH). */
export function bauen() {
  const tsc = join(dirname(process.execPath), 'tsc');
  execFileSync(existsSync(tsc) ? tsc : 'tsc', ['-p', 'tsconfig.browser.json'], { cwd: SPIEL, stdio: 'inherit' });
}

/** Letzter genannter Frame einer Eingabedatei (Kampf 11.1). */
function letzterFrame(text) {
  let letzter = 0;
  for (const zeile of text.split('\n')) {
    const m = /^\s*(\d+)\s*,\s*(\d+)\s*,/.exec(zeile);
    if (m !== null) letzter = Math.max(letzter, Number(m[2]));
  }
  return letzter;
}

function argumente(argv) {
  const a = { eingabe: EINGABE_STANDARD, abstand: ABSTAND_STANDARD, debugFrame: DEBUG_FRAME_STANDARD, bau: true, szene: null, aus: BILDER, praefix: 'scheibe' };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (name === '--ohne-bau') a.bau = false;
    else if (name === '--eingabe') a.eingabe = argv[++i];
    else if (name === '--abstand') a.abstand = Number(argv[++i]);
    else if (name === '--debug-frame') a.debugFrame = Number(argv[++i]);
    else if (name === '--szene') a.szene = argv[++i];
    else if (name === '--aus') a.aus = resolve(argv[++i]);
    else if (name === '--praefix') a.praefix = argv[++i];
    else throw new Error(`unbekanntes Argument „${name}“`);
  }
  if (!(a.abstand > 0) || !(a.debugFrame > 0)) throw new Error('--abstand und --debug-frame müssen positiv sein');
  return a;
}

async function haupt() {
  const a = argumente(process.argv.slice(2));
  if (a.bau) bauen();
  const text = readFileSync(resolve(SPIEL, a.eingabe), 'utf8');
  const szene = a.szene === null ? null : readFileSync(resolve(SPIEL, a.szene), 'utf8');
  const endframe = szene === null ? null : /endframe=(\d+)/.exec(szene);
  const ende = endframe === null ? letzterFrame(text) : Number(endframe[1]);
  mkdirSync(a.aus, { recursive: true });
  const { chromium } = ladePlaywright();
  const server = await starteServer(SPIEL);
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: { width: BILD_BREITE * SKALA, height: BILD_HOEHE * SKALA }, deviceScaleFactor: 1 });
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    await seite.goto(server.url);
    await seite.waitForFunction(() => window.comet !== undefined && window.comet.bereit === true, undefined, { timeout: WARTEN_MS });
    const laden = () =>
      szene === null ? seite.evaluate((t) => window.comet.ladeEingabe(t), text) : seite.evaluate(([s, t]) => window.comet.ladeSzene(s, t), [szene, text]);
    const bild = async (name) => {
      const pfad = join(a.aus, name);
      await seite.locator('#bild').screenshot({ path: pfad });
      const z = await seite.evaluate(() => window.comet.zustand());
      process.stdout.write(`${pfad}  frame ${z.frame}  figur ${z.figur.aktion} x ${z.figur.x} z ${z.figur.z}  kamera ${z.kamera.x} ${z.kamera.modus}\n`);
    };
    const start = await laden();
    process.stdout.write(`${a.szene ?? 'Spielstart'}, Eingabe ${a.eingabe}, seed ${start.seed}, ${ende} Frames\n`);
    for (let f = a.abstand; f <= ende; f += a.abstand) {
      await seite.evaluate((n) => window.comet.schritt(n), a.abstand);
      await bild(`${a.praefix}_${String(f).padStart(STELLEN, '0')}.png`);
    }
    await laden();
    await seite.evaluate((n) => window.comet.schritt(n), a.debugFrame);
    await seite.evaluate(() => window.comet.debug(true));
    await bild(`${a.praefix}_debug.png`);
    if (fehler.length > 0) throw new Error(`Fehler in der Seite: ${fehler.join('; ')}`);
  } finally {
    await browser.close();
    await server.schliessen();
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  haupt().catch((fehler) => {
    process.stderr.write(`foto.mjs abgebrochen: ${fehler instanceof Error ? fehler.message : String(fehler)}\n`);
    process.exitCode = 1;
  });
}
