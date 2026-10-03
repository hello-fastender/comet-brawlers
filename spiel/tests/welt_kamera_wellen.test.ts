// Tests K3 (Stufe 2): Kamera (Welt 3) und Wellen (Welt 4) auf der Bühne
// scheibe. Die Figur wird vor jedem Logikschritt um einen Lauf-Frame
// versetzt (1,75 px, Bildränder K + 24 … K + 360 mit K des Vorframes), wie es
// die Eingaben der Abnahmetests in KS2 tun würden; Kamera, Wellenauslöser
// und Weckreiz lesen die Lage erst nach dem Kampfschritt, also gleich.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Welt } from '../src/kern/welt.ts';
import type { Gegner } from '../src/kern/entitaeten.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { parseStage } from '../src/kern/stage.ts';
import { ausDezimal, ausGanz, ganz, zuDezimalText } from '../src/kern/festkomma.ts';
import { bossLpDauerhaft, lpNachRang, welleBesiegt } from '../src/kern/wellen.ts';
import { kameraBlende } from '../src/kern/kamera.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { stageText } from './hilfe.ts';

function weltAus(text: string): Welt {
  const s = parseSzene(text);
  return erzeugeWelt(parseStage(stageText(s.buehne)), s);
}

const LAUF = ausDezimal(1.75);

/** Ein Lauf-Frame der Figur in x (Kampf 4.3), begrenzt nach Welt 2.2 Punkt 4 mit K des Vorframes. */
function geh(w: Welt, richtung: 1 | -1): void {
  const k = w.kamera.x;
  let x = w.figur.x + richtung * LAUF;
  x = Math.max(ausGanz(k + 24), Math.min(ausGanz(k + 360), x));
  x = Math.max(ausGanz(24), Math.min(ausGanz(w.stage.x_ende - 24), x));
  w.figur.x = x;
}

interface Zeile {
  f: number;
  fx: string;
  fz: string;
  k: number;
  ky: number;
  modus: string;
  steuerung: number;
  pfeil: number;
  ereignisse: string[];
}

/**
 * Lauf bis Frame bis; bewegung(f) gibt die Laufrichtung in Frame f (Bewegung
 * in P+1 … q+1); in der Blende (steuerung 0) bewegt sich die Figur nicht.
 * nachher(w) läuft nach jedem Logikschritt.
 */
function laufe(w: Welt, bis: number, bewegung: (f: number) => -1 | 0 | 1 = () => 0, nachher: (w: Welt) => void = () => {}): Map<number, Zeile> {
  const zeilen = new Map<number, Zeile>();
  while (w.frame < bis) {
    const f = w.frame + 1;
    const r = bewegung(f);
    const blende = kameraBlende(w, f);
    if (r !== 0 && !blende) geh(w, r);
    logikSchritt(w, 0);
    nachher(w);
    zeilen.set(f, {
      f,
      fx: zuDezimalText(w.figur.x),
      fz: zuDezimalText(w.figur.z),
      k: w.kamera.x,
      ky: w.kamera.y,
      modus: w.kamera.modus,
      steuerung: w.rahmen.steuerung,
      pfeil: w.kamera.pfeil,
      ereignisse: [...w.ereignisse],
    });
  }
  return zeilen;
}

function z(m: Map<number, Zeile>, f: number): Zeile {
  const e = m.get(f);
  if (e === undefined) throw new Error(`Frame ${f} fehlt`);
  return e;
}

function erstesEreignis(m: Map<number, Zeile>, eintrag: string): number {
  for (const [f, e] of m) if (e.ereignisse.includes(eintrag)) return f;
  return 0;
}

const zwischen = (a: number, b: number) => (f: number) => (f >= a && f <= b ? 1 : 0);

test('Welt 4.7: Wellentabelle der Scheibe (Welle 1 bei 150 px am Versteck, Welle 2 bei K 250, Sperre 400, Halt 440, Schnitt 466)', () => {
  // Alle Wellen wie in 2.3; die drei Gegner fordern keine Rechte an (greifen nicht an).
  const w = weltAus(`szene name=welt_wellen endframe=900 seed=12345 buehne=scheibe
pruefstart gegner.s1.erlaubnis=aus gegner.s2.erlaubnis=aus gegner.s3.erlaubnis=aus fest.gehstufe=normal
eingriff frame=360 ziel=s2 feld=lp wert=-1
eingriff frame=380 ziel=s3 feld=lp wert=-1
eingriff frame=420 ziel=s1 feld=lp wert=-1`);
  // Figur läuft rechts 1–340, steht, läuft ab 400 wieder bis zum Schnitt.
  const m = laufe(w, 760, (f) => ((f >= 2 && f <= 341) || f >= 401 ? 1 : 0));
  // Welle 1: |⌊x_Figur⌋ − 368| ≤ 150, also bei x 218 in Frame 89; Versteck wacht in 90 auf, kampffähig 106
  assert.equal(z(m, 88).fx, '216.25');
  assert.equal(erstesEreignis(m, 'WL:1'), 89);
  assert.equal(z(m, 89).fx, '218');
  assert.equal(erstesEreignis(m, 'WK:s1'), 90);
  // Welle 2: Kamera-x 250 in Frame 222; Hockende wachen bei ⌊x⌋ − K ≤ 383 mit K des Vorframes
  assert.equal(z(m, 222).k, 250);
  assert.equal(erstesEreignis(m, 'WL:2'), 222);
  assert.equal(erstesEreignis(m, 'WK:s2'), 223);
  assert.equal(z(m, 239).k, 280);
  assert.equal(erstesEreignis(m, 'WK:s3'), 240);
  // Sperre S1 bei 400, solange Welle 2 nicht besiegt ist (s2 tot in 360, s3 erst in 380)
  assert.equal(z(m, 307).k, 399);
  assert.deepEqual([z(m, 308).k, z(m, 308).modus], [400, 'SPERRE']);
  for (let f = 308; f <= 380; f++) assert.equal(z(m, f).k, 400, `Frame ${f}`);
  assert.equal(z(m, 361).modus, 'SPERRE');
  assert.deepEqual([z(m, 381).k, z(m, 381).modus, z(m, 381).pfeil], [404, 'FREI', 1]);
  assert.ok(z(m, 381).ereignisse.includes('SR:S1'));
  // Halt H1 bei 440, solange s1 lebt; frei im Frame nach dem Tod (s1 tot in 420)
  assert.equal(z(m, 389).k, 436);
  assert.deepEqual([z(m, 390).k, z(m, 390).modus], [440, 'HALT']);
  for (let f = 390; f <= 420; f++) assert.deepEqual([z(m, f).k, z(m, f).modus], [440, 'HALT'], `Frame ${f}`);
  assert.equal(z(m, 421).k, 444);
  assert.ok(z(m, 421).ereignisse.includes('HR:H1'));
  // Schnitt bei 466: Kamera hält dort, die Figur löst an x 826 die Blende aus
  const c = erstesEreignis(m, 'BL:a');
  assert.ok(c > 421);
  assert.equal(z(m, c).k, 466);
  assert.equal(z(m, c).fx, '826');
  assert.ok(z(m, c - 1).k === 466 && Number(z(m, c - 1).fx) < 826);
  assert.equal(z(m, c + 29).k, 1792);
  assert.equal(erstesEreignis(m, 'BL:v'), c + 29);
  assert.equal(erstesEreignis(m, 'BL:e'), c + 135);
  // Arena: Welle 7 löst im ersten Frame mit Modus ARENA und ohne Blende aus; Boss und zwei Bolzer in W3 des nächsten
  assert.equal(z(m, c + 135).modus, 'ARENA');
  assert.equal(erstesEreignis(m, 'WL:7'), c + 135);
  assert.equal(erstesEreignis(m, 'WK:s0'), c + 136);
  const bolzer7 = w.gegner.filter((g) => g.belegt && g.typ === 'Bolzer' && g.welle === 7);
  assert.equal(bolzer7.length, 2);
  assert.deepEqual(w.wellen.ausgeloest, [1, 2, 7]);
  assert.deepEqual(
    w.objekte.filter((o) => o.belegt && o.typ === 'Behälter').map((o) => o.art),
    [],
    'Bosskisten beim Weckreiz des Bosses zerbrochen und in w+1 geöffnet',
  );
});

test('Welt 3 KA1, KA2: Kamera folgt nur nach rechts, Folgepunkt 200, linker Rand (Welt 12 T1, PS1)', () => {
  const w = weltAus(`szene name=welt_t1 endframe=301 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus sperre.S1=aus`);
  const m = laufe(w, 301, (f) => (f >= 2 && f <= 121 ? 1 : f >= 122 && f <= 301 ? -1 : 0));
  assert.deepEqual([z(m, 79).fx, z(m, 79).k], ['200.5', 0]);
  assert.deepEqual([z(m, 80).fx, z(m, 80).k], ['202.25', 2]);
  assert.deepEqual([z(m, 121).fx, z(m, 121).k], ['274', 74]);
  assert.equal(z(m, 221).fx, '99');
  assert.equal(z(m, 222).fx, '98');
  assert.deepEqual([z(m, 301).fx, z(m, 301).k], ['98', 74]);
  for (const e of m.values()) {
    assert.equal(e.modus, 'FREI');
    assert.equal(e.ky, 128);
  }
});

test('Welt 3 KA4, KA5: Sperre, Weckreiz der Hockenden, Pfeil 16 an / 16 aus (Welt 12 T2, PS2)', () => {
  const w = weltAus(`szene name=welt_t2 endframe=420 seed=12345 buehne=scheibe
pruefstart welle.1=aus gegner.s2.erlaubnis=aus gegner.s3.erlaubnis=aus fest.gehstufe=normal
eingriff frame=360 ziel=s2 feld=lp wert=-1
eingriff frame=360 ziel=s3 feld=lp wert=-1`);
  const modi: Record<number, string> = {};
  const m = laufe(w, 420, zwischen(2, 341), (x) => {
    modi[x.frame] = `${x.gegner[2]?.modus}/${x.gegner[3]?.modus}`;
  });
  assert.equal(z(m, 222).k, 250);
  assert.ok(z(m, 223).ereignisse.includes('WK:s2'));
  assert.equal(modi[223], 'AUFTRITT/WARTEN');
  assert.equal(z(m, 239).k, 280);
  assert.equal(modi[240], 'AUFTRITT/AUFTRITT');
  assert.equal(modi[271], 'AUFTRITT/AUFTRITT');
  assert.equal(modi[272]?.split('/')[0], 'ABWARTEN');
  assert.equal(z(m, 307).k, 399);
  assert.deepEqual([z(m, 308).k, z(m, 308).modus], [400, 'SPERRE']);
  assert.equal(modi[309], 'ABWARTEN/ABWARTEN');
  assert.equal(z(m, 341).fx, '659');
  assert.equal(z(m, 360).k, 400);
  assert.deepEqual([z(m, 361).k, z(m, 361).modus, z(m, 361).pfeil], [404, 'FREI', 1]);
  assert.ok(z(m, 361).ereignisse.includes('SR:S1'));
  assert.equal(z(m, 375).k, 459);
  // Pfeil ab dem Frame der Freigabe 16 Frames an, 16 aus, solange K ≤ 464
  assert.equal(z(m, 376).pfeil, 1);
  assert.equal(z(m, 377).pfeil, 0);
  assert.equal(z(m, 392).pfeil, 0);
  assert.equal(z(m, 393).pfeil, 1);
  // der Halt H1 hielt nie: kein HR
  for (const e of m.values()) assert.ok(!e.ereignisse.includes('HR:H1'));
});

test('Welt 3 KA6, KA7, KA8, KA13: Halt, Schnitt mit Blende, Arena mit Totzone (Welt 12 T3, PS3)', () => {
  const w = weltAus(`szene name=welt_t3 endframe=561 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus welle.7=aus sperre.S1=aus kamera.x=400 fest.gehstufe=normal
figur x=600 z=180
gegner slot=1 typ=Bolzer x=460 z=180 vorplatziert=ja logik=an erlaubnis=aus
eingriff frame=160 ziel=s1 feld=lp wert=-1`);
  const bewegung = (f: number): -1 | 0 | 1 => {
    if ((f >= 2 && f <= 151) || (f >= 171 && f <= 201) || (f >= 331 && f <= 461)) return 1;
    if (f >= 471 && f <= 561) return -1;
    return 0;
  };
  const m = laufe(w, 561, bewegung);
  assert.equal(z(m, 23).k, 438);
  assert.deepEqual([z(m, 24).k, z(m, 24).modus], [440, 'HALT']);
  assert.equal(z(m, 115).fx, '799.5');
  assert.equal(z(m, 116).fx, '800');
  assert.equal(z(m, 160).k, 440);
  assert.equal(z(m, 161).k, 444);
  assert.ok(z(m, 161).ereignisse.includes('HR:H1'));
  assert.equal(z(m, 167).k, 466);
  assert.equal(z(m, 184).fx, '824.5');
  assert.equal(z(m, 185).fx, '826');
  assert.ok(z(m, 185).ereignisse.includes('BL:a'));
  assert.deepEqual([z(m, 185).steuerung, z(m, 186).steuerung, z(m, 186).modus], [1, 0, 'BLENDE']);
  assert.equal(z(m, 213).k, 466);
  assert.deepEqual([z(m, 214).k, z(m, 214).ky, z(m, 214).fx, z(m, 214).fz], [1792, 0, '1900', '55']);
  assert.ok(z(m, 214).ereignisse.includes('BL:v'));
  assert.equal(z(m, 319).steuerung, 0);
  assert.deepEqual([z(m, 320).steuerung, z(m, 320).modus], [1, 'ARENA']);
  assert.ok(z(m, 320).ereignisse.includes('BL:e'));
  assert.deepEqual([z(m, 415).fx, z(m, 415).k], ['2048.75', 1792]);
  assert.equal(z(m, 416).k, 1794);
  assert.deepEqual([z(m, 461).fx, z(m, 461).k], ['2129.25', 1873]);
  assert.deepEqual([z(m, 543).fx, z(m, 543).k], ['2001.5', 1873]);
  assert.deepEqual([z(m, 544).fx, z(m, 544).k], ['1999.75', 1871]);
  assert.deepEqual([z(m, 561).fx, z(m, 561).k], ['1970', 1842]);
  for (let f = 186; f <= 319; f++) assert.equal(z(m, f).modus, 'BLENDE');
});

test('Welt 4.2, 4.6: Bossarena – Weckreiz des Bosses, Bosskisten zerbrechen, Bolzer von links mit LP nach Rang', () => {
  const w = weltAus(`szene name=welt_arena endframe=10 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus kamera.x=1792 kamera.modus=ARENA rang.fest
figur x=1900 z=55`);
  logikSchritt(w, 0);
  assert.ok(w.ereignisse.includes('WL:7'));
  logikSchritt(w, 0);
  assert.ok(w.ereignisse.includes('WK:s0'));
  const boss = w.gegner[0] as Gegner;
  assert.equal(boss.weckreiz_w, 2);
  assert.equal(boss.kampffaehig_ab, 62);
  const kisten = w.objekte.filter((o) => o.belegt && o.art === 'Bosskiste');
  assert.equal(kisten.length, 3);
  assert.ok(kisten.every((o) => o.zerbrochen && o.zerbrochen_h === 2));
  const neue = w.gegner.filter((g) => g.belegt && g.welle === 7 && g.typ === 'Bolzer');
  assert.deepEqual(
    neue.map((g) => [g.schluessel, ganz(g.z), g.lp, g.lp_max]),
    [
      ['s1', 30, 23, 23],
      ['s2', 80, 23, 23],
    ],
  );
  // angelegt bei K − 32 = 1760 und handeln sofort: s1 erhält das Recht links und geht im selben Frame,
  // s2 wartet (seine Warteposition läge links außerhalb von K + 16, also geht er erst in der Tiefe zum Bogen)
  assert.equal(w.rechte.l, 1);
  // Ziel (1852, 55) aus (1760, 30): Sektor 1 (11,25°), x-Schritt 1,75 · cos 11,25° = 1,7163… (Welt 5.3)
  assert.equal(zuDezimalText(neue[0]?.x ?? 0), '1761.71636962890625');
  assert.equal(neue[1]?.modus, 'ABWARTEN');
  assert.equal(zuDezimalText(neue[1]?.x ?? 0), '1760');
  logikSchritt(w, 0);
  assert.deepEqual(
    w.ereignisse.filter((e) => e.startsWith('ER:')),
    ['ER:o20:Raketenwerfer', 'ER:o21:Raketenwerfer'],
  );
});

test('Welt 4.4, 4.5: LP nach Rang, Boss-LP mit Folge, besiegt erst nach dem Aufwachen', () => {
  // LP = ⌊(34·U + 2·(O − U)·(Rang − 7) + 17) / 34⌋ (Welt 8; design-gegner-stages.md 7: Rang 11 Bolzer 25, Zünder 19)
  assert.equal(lpNachRang('Bolzer', 'leicht', 7), 22);
  assert.equal(lpNachRang('Bolzer', 'leicht', 9), 23);
  assert.equal(lpNachRang('Bolzer', 'leicht', 11), 25);
  assert.equal(lpNachRang('Bolzer', 'leicht', 24), 34);
  assert.equal(lpNachRang('Rammbock', 'schwer', 7), 32);
  assert.equal(lpNachRang('Rammbock', 'schwer', 24), 42);
  assert.equal(lpNachRang('Zünder', 'fern', 9), 17);
  assert.equal(lpNachRang('Zünder', 'fern', 11), 19);
  assert.equal(lpNachRang('Zünder', 'fern', 24), 28);
  const w = weltAus('szene name=welt_besiegt endframe=10 seed=12345 buehne=scheibe');
  const boss = w.gegner[0] as Gegner;
  boss.lp = 20;
  assert.equal(bossLpDauerhaft(boss), 20);
  boss.folge = 1;
  boss.lp_folge = 30;
  assert.equal(bossLpDauerhaft(boss), 30);
  // Welle 2: wartende Hockende sind nicht besiegt, auch nicht mit LP < 0
  const s2 = w.gegner[2] as Gegner;
  const s3 = w.gegner[3] as Gegner;
  s2.lp = -1;
  s3.lp = -1;
  assert.equal(welleBesiegt(w, 2), false);
  s2.modus = 'AUFTRITT';
  s3.modus = 'AUFTRITT';
  assert.equal(welleBesiegt(w, 2), true);
  // Welle 7 hat Einträge: erst besiegt, wenn ausgelöst und angelegt
  boss.lp = -1;
  boss.modus = 'TOT';
  assert.equal(welleBesiegt(w, 7), false);
});
