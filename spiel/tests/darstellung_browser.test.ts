import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { md5 } from '../src/pruef/md5.ts';
import { pruefLauf } from '../src/pruef/pruefung.ts';
import { protokollSpalten } from '../src/pruef/protokoll.ts';
import { seedAusEingabe } from '../src/darstellung/sitzung.ts';
import { SPIEL, lies, stageText } from './hilfe.ts';
import { ladePlaywright, protokollDaten, starteServer, tscPfad } from './darstellung_hilfe.ts';

/** Zahl der Logikschritte im Vergleich (Auftrag 3, 2.5). */
const SCHRITTE = 600;
/** Eingabedatei der Vorführung. */
const EINGABE = 'tests/eingaben/vorfuehrung.txt';
/** Höchstdauer des Tests und Wartezeit auf window.comet in ms. */
const TEST_MS = 90000;
const WARTEN_MS = 30000;

interface BrowserLauf {
  seed: number;
  spalten: string[];
  zeilen: string[];
  frame: number;
}

// Kampf 11.6 und Auftrag 3, 2.3/2.5: Die Darstellung wirkt nicht auf die
// Logik. Die Seite lädt die Vorführung über window.comet, führt 600 Schritte
// aus (mit Debug-Anzeige, die nach Welt 10.6 das Protokoll nicht ändern
// darf; jeder Schritt zeichnet ein Bild), und jede Protokollzeile der
// Debug-Schnittstelle stimmt mit dem Prüflauf in Node (gleiche Szene:
// Spielstart auf der Bühne scheibe, gleicher Seed, gleiche Eingabedatei)
// überein.
test(`Darstellung: window.comet liefert in ${SCHRITTE} Schritten dieselben Protokollzeilen wie der Prüflauf (vorfuehrung.txt)`, { timeout: TEST_MS }, async (t) => {
  const pw = ladePlaywright();
  if (pw === null) {
    t.skip('Playwright fehlt (NODE_PATH=/opt/node22/lib/node_modules)');
    return;
  }
  execFileSync(tscPfad(), ['-p', 'tsconfig.browser.json'], { cwd: SPIEL, stdio: 'pipe' });
  const eingabe = lies(EINGABE);
  const seed = seedAusEingabe(eingabe);
  assert.ok(seed !== null, `${EINGABE} nennt keinen Seed („# seed=N“)`);

  const server = await starteServer(SPIEL);
  const browser = await pw.chromium.launch();
  let lauf: BrowserLauf;
  const fehler: string[] = [];
  try {
    const seite = await browser.newPage();
    seite.on('pageerror', (e) => fehler.push(e.message));
    await seite.goto(server.url);
    await seite.waitForFunction('window.comet !== undefined && window.comet.bereit === true', undefined, { timeout: WARTEN_MS });
    lauf = await seite.evaluate<BrowserLauf>(`(() => {
      const c = window.comet;
      const start = c.ladeEingabe(${JSON.stringify(eingabe)});
      c.debug(true);
      const zeilen = [];
      for (let i = 0; i < ${SCHRITTE}; i++) zeilen.push(c.schritt(1).protokoll);
      return { seed: start.seed, spalten: c.spalten(), zeilen, frame: c.zustand().frame };
    })()`);
  } finally {
    await browser.close();
    await server.schliessen();
  }
  assert.deepEqual(fehler, [], 'Fehler in der Seite');

  const node = pruefLauf({
    szeneText: `szene name=vorfuehrung endframe=${SCHRITTE} seed=${seed} buehne=scheibe\n`,
    eingabeText: eingabe,
    stageText,
    md5,
  });
  const erwartet = protokollDaten(node.protokoll);
  const spalten = protokollSpalten();
  assert.equal(lauf.seed, seed);
  assert.equal(lauf.frame, SCHRITTE);
  assert.deepEqual(lauf.spalten, spalten);
  assert.equal(erwartet.length, SCHRITTE);
  assert.equal(lauf.zeilen.length, SCHRITTE);
  for (let i = 0; i < SCHRITTE; i++) {
    const b = (lauf.zeilen[i] as string).split(',');
    const n = (erwartet[i] as string).split(',');
    assert.equal(b.length, spalten.length, `Frame ${i + 1}: ${b.length} statt ${spalten.length} Spalten`);
    for (let s = 0; s < spalten.length; s++) {
      assert.equal(b[s], n[s], `Frame ${i + 1}, Spalte ${spalten[s]}: Browser „${b[s]}“, Prüflauf „${n[s]}“`);
    }
  }
});
