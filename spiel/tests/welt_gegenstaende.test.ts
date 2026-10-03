// Tests K3 (Stufe 2): Gegenstände und Behälter nach Welt 9 (Erscheinen in
// h+1, Flug 48 Frames, Landung L = h+49, Liegezeit 700 + 92 mit Blinken,
// Scrollen, Essen unbegrenzt, Hilfen für K1). Den Treffer auf das Fass gibt
// der Test direkt an den Zielhandler (in KS7 tut es welt.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Welt } from '../src/kern/welt.ts';
import type { Objekt, SlotKey, Treffer } from '../src/kern/entitaeten.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { angriffsinstanz } from '../src/kern/entitaeten.ts';
import { parseStage } from '../src/kern/stage.ts';
import { ausDezimal, ausGanz, zuDezimalText } from '../src/kern/festkomma.ts';
import {
  behaelterGetroffen,
  behaelterHindernisse,
  flughoeheBehaelter,
  gegenstandAblegen,
  gegenstandAufnehmen,
  istAufnehmbar,
  leereWaffeWerfen,
} from '../src/kern/gegenstaende.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { stageText } from './hilfe.ts';

function weltAus(text: string): Welt {
  const s = parseSzene(text);
  return erzeugeWelt(parseStage(stageText(s.buehne)), s);
}

function objekt(w: Welt, slot: number): Objekt {
  return w.objekte[slot - 20] as Objekt;
}

function trefferAuf(ziel: SlotKey): Treffer {
  const instanz = angriffsinstanz({
    code: 'KT1',
    angreifer: 'f',
    flaeche: { art: 'gehalten' },
    schaden: 3,
    umwerfen: false,
    trefferstopp: true,
    gegen: 'gegner',
    beginn: 0,
  });
  return {
    angreifer: 'f',
    urheber: 'f',
    ziel,
    code: 'KT1',
    schaden: 3,
    umwerfen: false,
    bahn: '',
    richtung: 1,
    von_vorn: true,
    wirkung: '',
    lp_vorher: 0,
    instanz,
  };
}

/** Welt 12 PS10b: Fass F9 mit Raketenwerfer bei (250, 158), Figur (210, 158), Kamera-x 10. */
function ps10b(): Welt {
  return weltAus(`szene name=welt_ps10b endframe=900 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus welle.7=aus welle.9=aus sperre.S1=aus halt.H1=aus kamera.x=10
pruefstart behaelter.F1=aus behaelter.F9=fass,250,158,Raketenwerfer
figur x=210 z=158`);
}

test('Welt 9.2, 9.3: Fass zerbricht in h, Raketenwerfer erscheint in h+1, landet in L = h+49 und verschwindet in L+792 (Welt 12 T10b)', () => {
  const w = ps10b();
  const fass = objekt(w, 23);
  assert.deepEqual([fass.typ, fass.id, fass.art, fass.inhalt], ['Behälter', 'F9', 'Fass', 'Raketenwerfer']);
  assert.equal(behaelterHindernisse(w).length, 4);
  while (w.frame < 12) logikSchritt(w, 0);
  const t = trefferAuf('o23');
  behaelterGetroffen(w, t);
  assert.equal(t.wirkung, 'B');
  assert.deepEqual([fass.zerbrochen, fass.zerbrochen_h], [true, 12]);
  assert.equal(behaelterHindernisse(w).length, 3, 'ab h+1 kein Hindernis');
  const verlauf: Record<number, string> = {};
  while (w.frame < 853) {
    logikSchritt(w, 0);
    const o = objekt(w, 23);
    verlauf[w.frame] = o.belegt
      ? `${o.typ}|${zuDezimalText(o.h)}|${o.liegezeit}|${o.sichtbar}|${o.aufnehmbar}|${w.ereignisse.join(';')}`
      : `frei|${w.ereignisse.join(';')}`;
  }
  assert.equal(verlauf[13], 'Gegenstand|0|0|true|false|ER:o23:Raketenwerfer');
  assert.equal(verlauf[37], 'Gegenstand|35|0|true|false|');
  assert.equal(verlauf[60], `Gegenstand|${flughoeheBehaelter(47)}|0|true|false|`);
  assert.equal(verlauf[61], 'Gegenstand|0|0|true|true|LA:o23');
  assert.equal(verlauf[760], 'Gegenstand|0|699|true|true|');
  assert.equal(verlauf[761], 'Gegenstand|0|700|true|true|');
  assert.equal(verlauf[762], 'Gegenstand|0|701|true|true|');
  assert.equal(verlauf[763], 'Gegenstand|0|702|false|true|');
  assert.equal(verlauf[765], 'Gegenstand|0|704|true|true|');
  assert.equal(verlauf[852], 'Gegenstand|0|791|false|true|');
  assert.equal(verlauf[853], 'frei|EN:o23:L');
  assert.equal(objekt(w, 23).munition, 0);
});

test('Welt 9.3: Gegenstände verschwinden beim Scrollen ab K − ⌊x⌋ ≥ 163 (Welt 12 T10c)', () => {
  const w = ps10b();
  while (w.frame < 12) logikSchritt(w, 0);
  behaelterGetroffen(w, trefferAuf('o23'));
  const lauf = ausDezimal(1.75);
  const k: Record<number, number> = {};
  const da: Record<number, boolean> = {};
  const ev: Record<number, string[]> = {};
  while (w.frame < 301) {
    const f = w.frame + 1;
    if (f >= 71 && f <= 311) w.figur.x = Math.min(w.figur.x + lauf, ausGanz(w.kamera.x + 360));
    logikSchritt(w, 0);
    k[f] = w.kamera.x;
    da[f] = objekt(w, 23).belegt;
    ev[f] = [...w.ereignisse];
  }
  assert.deepEqual([k[300], da[300]], [412, true]);
  assert.deepEqual([k[301], da[301]], [414, false]);
  assert.ok(ev[301]?.includes('EN:o23:S'));
});

test('Welt 9.2: Behälter verschwinden erst ab K − ⌊x⌋ ≥ 195; Bosskisten zerbrechen nicht durch Treffer', () => {
  const w = weltAus(`szene name=welt_scroll endframe=10 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus sperre.S1=aus halt.H1=aus
eingriff frame=2 ziel=kamera feld=x wert=754
eingriff frame=3 ziel=kamera feld=x wert=755`);
  logikSchritt(w, 0);
  logikSchritt(w, 0);
  assert.equal(objekt(w, 20).id, 'F1');
  logikSchritt(w, 0);
  assert.equal(objekt(w, 20).belegt, false);
  assert.ok(w.ereignisse.includes('EN:o20:S'));
  const t = trefferAuf('o21');
  behaelterGetroffen(w, t);
  assert.equal(t.wirkung, 'W');
  assert.equal(objekt(w, 21).zerbrochen, false);
});

test('Welt 9.3: Kometenbraten liegt unbegrenzt (Welt 12 PS10a)', () => {
  const w = weltAus(`szene name=welt_ps10a endframe=900 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus welle.7=aus welle.9=aus sperre.S1=aus halt.H1=aus kamera.x=320
figur x=520 z=158 lp=40`);
  while (w.frame < 12) logikSchritt(w, 0);
  behaelterGetroffen(w, trefferAuf('o20'));
  while (w.frame < 61 + 900) logikSchritt(w, 0);
  const o = objekt(w, 20);
  assert.deepEqual([o.belegt, o.art, o.landung_l, o.liegezeit, o.sichtbar, istAufnehmbar(o)], [true, 'Kometenbraten', 61, 900, true, true]);
});

test('Welt 9.3, Kampf 10.1 bis 10.4: Hilfen für die Figur – ablegen, aufnehmen, leere Waffe nach 61 Frames', () => {
  const w = weltAus('szene name=welt_hilfen endframe=200 seed=1');
  logikSchritt(w, 0);
  const o = gegenstandAblegen(w, 'Raketenwerfer', 120, 100, 2);
  assert.ok(o !== null);
  assert.deepEqual([o.schluessel, o.typ, o.munition, o.landung_l, o.aufnehmbar], ['o20', 'Gegenstand', 2, 1, true]);
  logikSchritt(w, 0);
  assert.equal(o.liegezeit, 1);
  assert.deepEqual(gegenstandAufnehmen(w, o), { art: 'Raketenwerfer', munition: 2 });
  assert.equal(o.belegt, false);
  const leer = leereWaffeWerfen(w, 100, 100);
  assert.ok(leer !== null);
  assert.deepEqual([leer.typ, leer.aufnehmbar, istAufnehmbar(leer)], ['Waffe', false, false]);
  const ab = w.frame;
  while (w.frame < ab + 60) logikSchritt(w, 0);
  assert.equal(leer.belegt, true);
  logikSchritt(w, 0);
  assert.equal(leer.belegt, false);
  assert.ok(w.ereignisse.includes('EN:o20:L'));
});
