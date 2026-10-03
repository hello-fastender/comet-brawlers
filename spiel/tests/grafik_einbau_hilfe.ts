// Hilfen der Einbautests (G7; keine Testdatei: das Muster *.test.ts trifft
// sie nicht): Sprite-Atlanten aus grafik/ausgabe/ lesen, eine Welt der
// Scheibe anlegen und Prüfszenen Frame für Frame mit Rückruf ablaufen lassen
// (wie src/pruef/pruefung.ts, aber mit Zugriff auf die Welt je Frame).

import { readFileSync } from 'node:fs';
import type { Welt } from '../src/kern/welt.ts';
import type { Atlanten, SpriteAtlas, SpriteBlatt } from '../src/darstellung/zuordnung.ts';
import { parseStage } from '../src/kern/stage.ts';
import { standardStart } from '../src/kern/start.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { parseEingabe, tastenIn } from '../src/pruef/eingabe.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { SPRITE_BLAETTER } from '../src/darstellung/zuordnung.ts';
import { SPIEL, lies, stageText } from './hilfe.ts';

/** Ordner der Blätter und Atlanten. */
export const AUSGABE = SPIEL + 'grafik/ausgabe/';

/** Liest alle Sprite-Atlanten (ohne rammbock_fremd, E24). */
export function atlantenLesen(): Atlanten {
  const a = {} as Record<SpriteBlatt, SpriteAtlas>;
  for (const name of SPRITE_BLAETTER) a[name] = JSON.parse(readFileSync(`${AUSGABE}${name}.json`, 'utf8')) as SpriteAtlas;
  return a;
}

/** Welt der Scheibe ab Spielstart (Seed 1), für Zustände von Hand. */
export function scheibenWelt(): Welt {
  return erzeugeWelt(parseStage(stageText('scheibe')), standardStart(1, 'scheibe'));
}

/**
 * Spielt eine Prüfszene (Dateien relativ zu spiel/) bis endframe ab und ruft
 * nach jedem Logikschritt rueckruf(welt) auf; vorher einmal für Frame 0.
 */
export function szeneAblaufen(szene: string, eingabe: string | null, rueckruf: (welt: Welt) => void): Welt {
  const start = parseSzene(lies(szene));
  const folge = parseEingabe(eingabe === null ? '' : lies(eingabe));
  const welt = erzeugeWelt(parseStage(stageText(start.buehne)), start);
  rueckruf(welt);
  while (welt.frame < start.endframe && !welt.beendet) {
    logikSchritt(welt, tastenIn(folge, welt.frame + 1));
    rueckruf(welt);
  }
  return welt;
}
