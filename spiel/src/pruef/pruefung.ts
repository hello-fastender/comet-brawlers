// Prüflauf ohne Dateien nach docs/spezifikation-kampf.md, 11.2 und 11.6:
// Szene und Eingabedatei als Text hinein, protokoll.csv und objekte.csv als
// Text heraus. Ohne Node-APIs; MD5 und Stage-Texte gibt der Aufrufer hinein
// (lauf.ts in Node, Tests im Speicher, die Darstellung im Browser).

import type { Pruefstart } from '../kern/start.ts';
import type { Welt } from '../kern/welt.ts';
import { parseStage } from '../kern/stage.ts';
import { erzeugeWelt, logikSchritt } from '../kern/welt.ts';
import { parseEingabe, tastenIn } from './eingabe.ts';
import { parseSzene } from './szene.ts';
import { objektKopf, objektZeilen, OBJEKT_SPALTEN, protokollKopf, protokollSpalten, protokollZeile } from './protokoll.ts';

/** Eingang eines Prüflaufs. */
export interface PruefEingang {
  szeneText: string;
  eingabeText: string;
  /** liefert den Text der Stage-Datei zu einer Bühne (pruefbuehne, scheibe) */
  stageText: (buehne: string) => string;
  /** MD5 eines Textes (UTF-8) als Hex, für eingabe_md5 im Kopf */
  md5: (text: string) => string;
}

/** Ergebnis eines Prüflaufs. */
export interface PruefErgebnis {
  start: Pruefstart;
  /** Inhalt von protokoll.csv */
  protokoll: string;
  /** Inhalt von objekte.csv */
  objekte: string;
  /** Zahl der gelaufenen Frames */
  frames: number;
  /** Welt nach dem letzten Frame */
  welt: Welt;
}

/** Schreibt laufend die Zeilen beider Protokolle (auch für die Darstellung). */
export class Protokollschreiber {
  readonly protokollZeilen: string[];
  readonly objektZeilen: string[];

  constructor(start: Pruefstart, eingabeMd5: string) {
    this.protokollZeilen = [...protokollKopf(start, eingabeMd5), protokollSpalten().join(',')];
    this.objektZeilen = [...objektKopf(start, eingabeMd5), OBJEKT_SPALTEN.join(',')];
  }

  /** Hängt die Zeilen des zuletzt gelaufenen Frames an. */
  frame(welt: Welt): void {
    this.protokollZeilen.push(protokollZeile(welt));
    this.objektZeilen.push(...objektZeilen(welt));
  }

  protokoll(): string {
    return this.protokollZeilen.join('\n') + '\n';
  }

  objekte(): string {
    return this.objektZeilen.join('\n') + '\n';
  }
}

/**
 * Prüflauf (Kampf 11.2): lädt Szene und Stage, spielt die Eingabedatei ab und
 * läuft bis endframe oder bis welt.beendet (Ende der Scheibe, Welt 10.5).
 */
export function pruefLauf(e: PruefEingang): PruefErgebnis {
  const start = parseSzene(e.szeneText);
  const stage = parseStage(e.stageText(start.buehne));
  const eingabe = parseEingabe(e.eingabeText);
  const welt = erzeugeWelt(stage, start);
  const schreiber = new Protokollschreiber(start, e.md5(e.eingabeText));
  while (welt.frame < start.endframe && !welt.beendet) {
    logikSchritt(welt, tastenIn(eingabe, welt.frame + 1));
    schreiber.frame(welt);
  }
  return { start, protokoll: schreiber.protokoll(), objekte: schreiber.objekte(), frames: welt.frame, welt };
}
