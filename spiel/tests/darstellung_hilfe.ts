// Hilfen der Darstellungstests (keine Testdatei: das Muster *.test.ts trifft
// sie nicht): tsc, Webserver mit node:http, Playwright ohne Paketinstallation.
// Playwright ist nicht typisiert eingebunden; die Schnittstellen unten
// beschreiben nur, was die Tests benutzen.

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';

/** tsc aus dem Ordner von node (/opt/node22/bin), sonst aus PATH. */
export function tscPfad(): string {
  const neben = join(dirname(process.execPath), 'tsc');
  return existsSync(neben) ? neben : 'tsc';
}

/** Browser der Umgebung (Auftrag 3, 2.1). */
const PW_BROWSER = '/opt/pw-browsers';
/** Globale Node-Module der Umgebung (Auftrag 3, 2.1). */
const NODE_MODULE = '/opt/node22/lib/node_modules';

/** Seite von Playwright (benutzter Ausschnitt). */
export interface Seite {
  goto(url: string): Promise<unknown>;
  waitForFunction(ausdruck: string, arg?: unknown, optionen?: { timeout: number }): Promise<unknown>;
  evaluate<T>(ausdruck: string): Promise<T>;
  on(ereignis: 'pageerror', rueckruf: (fehler: Error) => void): void;
}

/** Browser von Playwright (benutzter Ausschnitt). */
export interface Browser {
  newPage(): Promise<Seite>;
  close(): Promise<void>;
}

/** Playwright (benutzter Ausschnitt). */
export interface Playwright {
  chromium: { launch(): Promise<Browser> };
}

function istPlaywright(p: unknown): p is Playwright {
  return typeof p === 'object' && p !== null && 'chromium' in p;
}

/**
 * Lädt Playwright über createRequire: erst über NODE_PATH, dann aus den
 * globalen Modulen; null, wenn es fehlt.
 */
export function ladePlaywright(): Playwright | null {
  if (process.env['PLAYWRIGHT_BROWSERS_PATH'] === undefined && existsSync(PW_BROWSER)) {
    process.env['PLAYWRIGHT_BROWSERS_PATH'] = PW_BROWSER;
  }
  const require = createRequire(import.meta.url);
  for (const k of ['playwright', join(NODE_MODULE, 'playwright'), join(dirname(process.execPath), '..', 'lib', 'node_modules', 'playwright')]) {
    try {
      const p: unknown = require(k);
      if (istPlaywright(p)) return p;
    } catch {
      // nächster Kandidat
    }
  }
  return null;
}

const TYPEN: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
};

/** Laufender Webserver. */
export interface Server {
  url: string;
  schliessen(): Promise<void>;
}

/** Webserver für den Ordner wurzel auf einem freien Port von 127.0.0.1. */
export function starteServer(wurzel: string): Promise<Server> {
  const basis = resolve(wurzel);
  const server = createServer((anfrage, antwort) => {
    const pfad = decodeURIComponent(new URL(anfrage.url ?? '/', 'http://localhost').pathname);
    let datei = normalize(join(basis, pfad));
    if (datei !== basis && !datei.startsWith(basis + sep)) {
      antwort.writeHead(403).end();
      return;
    }
    if (pfad.endsWith('/')) datei = join(datei, 'index.html');
    readFile(datei).then(
      (inhalt) => {
        antwort.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
        antwort.end(inhalt);
      },
      () => antwort.writeHead(404).end(),
    );
  });
  return new Promise((fertig, fehler) => {
    server.once('error', fehler);
    server.listen(0, '127.0.0.1', () => {
      const adresse = server.address() as AddressInfo;
      fertig({
        url: `http://127.0.0.1:${adresse.port}/`,
        schliessen: () =>
          new Promise<void>((zu) => {
            server.closeAllConnections();
            server.close(() => zu());
          }),
      });
    });
  });
}

/** Datenzeilen von protokoll.csv (ohne Kommentarkopf und Spaltenzeile). */
export function protokollDaten(protokoll: string): string[] {
  const zeilen = protokoll.split('\n').filter((z) => z !== '' && !z.startsWith('#'));
  return zeilen.slice(1);
}
