// Tests K3 (Stufe 2): Rang (Welt 8) und Rahmen (Welt 10): Rang-Uhr, Tod
// und Neueinstieg (Leben, Rang −3, NE:F, Phase, Steuerung), Game Over,
// Stage-Ende, Punkte und Gegneranzeige, Anzeige-Daten. Den Tod der Figur
// setzt hier der Test (tod_t, neueinstieg_n), wie es K1 in KS7 tut.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Welt } from '../src/kern/welt.ts';
import type { SlotKey, Treffer } from '../src/kern/entitaeten.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { angriffsinstanz, freigeben, gegnerBelegen } from '../src/kern/entitaeten.ts';
import { parseStage } from '../src/kern/stage.ts';
import { rangAnstieg, rangNachTod } from '../src/kern/rang.ts';
import { anzeige, balken, rahmenW5 } from '../src/kern/rahmen.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { csv, lauf, stageText, zelle } from './hilfe.ts';

function weltAus(text: string): Welt {
  const s = parseSzene(text);
  return erzeugeWelt(parseStage(stageText(s.buehne)), s);
}

function laufeBis(w: Welt, f: number, vorher: (w: Welt) => void = () => {}): void {
  while (w.frame < f) {
    vorher(w);
    logikSchritt(w, 0);
  }
}

test('Welt 8: Rang 9 → 10 in Frame 409, dann alle 600 Frames +1, höchstens 24', () => {
  const w = weltAus('szene name=welt_rang endframe=9500 seed=1');
  const rang: Record<number, number> = {};
  laufeBis(w, 9409, (x) => {
    rang[x.frame] = x.rang.rang;
  });
  // vorher(w) läuft vor dem Schritt f + 1: rang[f] ist der Rang am Ende von f (der letzte Frame steht in w)
  const amEnde = (f: number) => rang[f] ?? w.rang.rang;
  assert.equal(amEnde(1), 9);
  assert.equal(amEnde(408), 9);
  assert.equal(amEnde(409), 10);
  assert.equal(amEnde(1008), 10);
  assert.equal(amEnde(1009), 11);
  assert.equal(amEnde(8808), 23);
  assert.equal(amEnde(8809), 24);
  assert.equal(amEnde(9409), 24);
  assert.equal(w.rang.zaehler, 9409);
  assert.ok(rangAnstieg(409) && rangAnstieg(1009) && !rangAnstieg(408) && !rangAnstieg(1008));
  assert.deepEqual([rangNachTod(11), rangNachTod(9), rangNachTod(7)], [8, 7, 7]);
  // rang.fest hält Rang und Rang-Uhr
  const w3 = weltAus('szene name=welt_rang endframe=500 seed=1\npruefstart rang=12 rang.fest');
  laufeBis(w3, 500);
  assert.deepEqual([w3.rang.rang, w3.rang.zaehler], [12, 0]);
});

test('Welt 8, 10.3: Tod der Figur – Rang −3 und Leben −1 im Frame N (NE:F), Phase TOD/NEUEINSTIEG, Steuerung bis LN+5 aus', () => {
  const w = weltAus('szene name=welt_tod endframe=1300 seed=1\npruefstart rang=11');
  const zeilen: Record<number, string> = {};
  while (w.frame < 290) {
    // K1 setzt tod_t und neueinstieg_n in KS7 von t; hier vor dem Schritt t
    if (w.frame === 99) {
      w.figur.tod_t = 100;
      w.figur.neueinstieg_n = 220;
    }
    logikSchritt(w, 0);
    zeilen[w.frame] = `${w.rang.rang}|${w.rahmen.leben}|${w.rahmen.phase}|${w.rahmen.steuerung}|${w.ereignisse.join(';')}`;
  }
  assert.equal(zeilen[99], '11|3|SPIEL|1|');
  assert.equal(zeilen[100], '11|3|TOD|1|');
  assert.equal(zeilen[101], '11|3|TOD|0|');
  assert.equal(zeilen[219], '11|3|TOD|0|');
  assert.equal(zeilen[220], '8|2|NEUEINSTIEG|0|NE:F');
  assert.equal(zeilen[278], '8|2|NEUEINSTIEG|0|', 'LN+5 = N+58');
  assert.equal(zeilen[279], '8|2|SPIEL|1|');
});

test('Welt 10.3: nach dem letzten Leben GAME OVER (GO im Frame N, kein NE:F), 240 Frames, dann Ende', () => {
  const w = weltAus('szene name=welt_gameover endframe=2000 seed=1');
  const tode = [100, 400, 700];
  const ereignisse: Record<number, string[]> = {};
  while (!w.beendet && w.frame < 2000) {
    logikSchritt(w, 0);
    if (tode.includes(w.frame)) {
      w.figur.tod_t = w.frame;
      w.figur.neueinstieg_n = w.frame + 120;
    }
    if (w.ereignisse.length > 0) ereignisse[w.frame] = [...w.ereignisse];
  }
  assert.deepEqual(ereignisse[220], ['NE:F']);
  assert.deepEqual(ereignisse[520], ['NE:F']);
  assert.deepEqual(ereignisse[820], ['GO']);
  assert.equal(w.rahmen.leben, 0);
  assert.equal(w.rahmen.phase, 'GAMEOVER');
  assert.equal(w.rahmen.gameover_frame, 820);
  assert.equal(w.frame, 820 + 239);
  assert.equal(w.rahmen.steuerung, 0);
  assert.ok(anzeige(w).texte.includes('GAME OVER'));
});

test('Welt 10.5: Stage-Ende – Fall des Bosses in t, Phase ENDE, 5000 Punkte, Kamera ENDE und Steuerung 0 ab t+1, SC in t+120, Gegenstände weg in t+480, Ende in t+585', () => {
  const e = lauf(`szene name=welt_ende endframe=700 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus welle.9=aus welle.7=nur_boss kamera.x=1792 kamera.modus=ARENA boss.angriffe=aus boss.bewegung=aus boss.lp=2
figur x=2000 z=50 blick=R
gegner slot=0 typ=Ballast x=2060 z=50 blick=L
eingriff frame=12 ziel=s0 feld=lp wert=-1`);
  assert.equal(e.frames, 597);
  const p = csv(e.protokoll);
  const z = (f: number) => p.zeilen[f - 1] as string[];
  assert.deepEqual(
    ['phase', 'punkte', 'steuerung', 'kamera_modus'].map((s) => zelle(p, z(11), s)),
    ['SPIEL', '0', '1', 'ARENA'],
  );
  assert.deepEqual(
    ['phase', 'punkte', 'steuerung'].map((s) => zelle(p, z(12), s)),
    ['ENDE', '5000', '1'],
  );
  assert.deepEqual(
    ['steuerung', 'kamera_modus', 'rang_zaehler'].map((s) => zelle(p, z(13), s)),
    ['0', 'ENDE', '12'],
  );
  assert.equal(zelle(p, z(400), 'rang_zaehler'), '12', 'Rang-Uhr steht ab t+1');
  assert.ok(zelle(p, z(132), 'ereignis').split(';').includes('SC'));
  const o = csv(e.objekte);
  const objekteIn = (f: number) => o.zeilen.filter((zz) => zz[0] === String(f)).length;
  assert.ok(objekteIn(491) > 0, 'Raketenwerfer aus den Bosskisten liegen noch');
  assert.equal(objekteIn(492), 0);
  assert.ok(
    zelle(p, z(492), 'ereignis')
      .split(';')
      .some((x) => /^EN:o\d+:E$/.test(x)),
  );
  assert.equal(p.zeilen.length, 597);
});

function treffer(ziel: SlotKey, schaden: number, wirkung: Treffer['wirkung'], urheber: SlotKey = 'f'): Treffer {
  const instanz = angriffsinstanz({
    code: 'KT1',
    angreifer: urheber,
    flaeche: { art: 'gehalten' },
    schaden,
    umwerfen: false,
    trefferstopp: true,
    gegen: 'gegner',
    beginn: 0,
  });
  return { angreifer: urheber, urheber, ziel, code: 'KT1', schaden, umwerfen: false, bahn: '', richtung: 1, von_vorn: true, wirkung, lp_vorher: 0, instanz };
}

test('Welt 10.1, 10.2: Punkte (10 je LP Schaden, besiegte Gegner) und Gegneranzeige (kleinster getroffener Slot)', () => {
  const w = weltAus(`szene name=welt_punkte endframe=10 seed=1
gegner slot=2 typ=Puppe x=150 z=100 lp=16
gegner slot=5 typ=Puppe x=160 z=100 lp=30 rolle=schwer`);
  logikSchritt(w, 0);
  w.treffer = [treffer('s5', 4, 'R'), treffer('s2', 3, 'R'), treffer('f', 5, 'R', 's2')];
  rahmenW5(w);
  assert.deepEqual([w.rahmen.punkte, w.rahmen.anzeige], [70, 2]);
  // besiegt im Frame t: LP unter 0, vorher nicht; schwere Puppe zählt wie Rammbock
  const s5 = w.gegner[5];
  assert.ok(s5 !== undefined);
  s5.lp_vor = 2;
  s5.lp = -2;
  w.treffer = [treffer('s5', 4, 'X')];
  rahmenW5(w);
  assert.deepEqual([w.rahmen.punkte, w.rahmen.anzeige], [70 + 40 + 200, 5]);
  // ohne_punkte (Fall des Bosses): keine Punkte für den Tod
  const s2 = w.gegner[2];
  assert.ok(s2 !== undefined);
  s2.lp_vor = 1;
  s2.lp = -1;
  s2.ohne_punkte = true;
  s5.lp_vor = s5.lp;
  w.treffer = [];
  rahmenW5(w);
  assert.equal(w.rahmen.punkte, 310);
});

test('Welt 10.1: Anzeige-Daten – 8 Ziffern, LP-Balken in Lagen zu 72 px, Gegneranzeige, Pfeil', () => {
  assert.deepEqual(balken(72), { lage: 1, breite: 72, unterlage: 0 });
  assert.deepEqual(balken(100), { lage: 2, breite: 28, unterlage: 1 });
  assert.deepEqual(balken(144), { lage: 2, breite: 72, unterlage: 1 });
  assert.deepEqual(balken(145), { lage: 3, breite: 1, unterlage: 2 });
  assert.deepEqual(balken(0), { lage: 0, breite: 0, unterlage: 0 });
  assert.deepEqual(balken(-3), { lage: 0, breite: 0, unterlage: 0 });
  const w = weltAus('szene name=welt_anzeige endframe=10 seed=1\ngegner slot=3 typ=Puppe x=150 z=100 lp=16');
  logikSchritt(w, 0);
  w.treffer = [treffer('s3', 4, 'R')];
  rahmenW5(w);
  w.rahmen.punkte = 5030;
  const a = anzeige(w);
  assert.deepEqual(
    [a.name, a.punkte, a.leben, a.figur.breite, a.gegner?.name, a.gegner?.balken.breite, a.pfeil, a.blende],
    ['VELA', '00005030', 3, 72, 'PUPPE', 16, false, 0],
  );
});

test('Welt 10.1: Gegneranzeige bleibt beim zuletzt getroffenen Gegner, nach dem Tod mit leerem Balken, auch wenn ein neuer Gegner den Slot belegt', () => {
  const w = weltAus(`szene name=welt_anzeige_bleibt endframe=10 seed=1
gegner slot=3 typ=Puppe x=150 z=100 lp=16
gegner slot=4 typ=Puppe x=170 z=100 lp=10`);
  logikSchritt(w, 0);
  const s3 = w.gegner[3];
  assert.ok(s3 !== undefined);
  const gezeigt = () => {
    const g = anzeige(w).gegner;
    return g === null ? null : [g.slot, g.name, g.balken.breite];
  };
  w.treffer = [treffer('s3', 4, 'R')];
  rahmenW5(w);
  assert.deepEqual(gezeigt(), [3, 'PUPPE', 16]);
  // die LP folgen dem Gegner im Frame der Änderung (auch ohne neuen Treffer)
  s3.lp = 5;
  w.treffer = [];
  rahmenW5(w);
  assert.deepEqual(gezeigt(), [3, 'PUPPE', 5]);
  // Tod: leerer Balken, Name bleibt
  s3.lp = -2;
  rahmenW5(w);
  assert.deepEqual(gezeigt(), [3, 'PUPPE', 0]);
  // Slot frei (FR) und von einem neuen Gegner belegt: die Anzeige zeigt ihn nicht
  freigeben(s3);
  rahmenW5(w);
  assert.deepEqual(gezeigt(), [3, 'PUPPE', 0]);
  const neu = gegnerBelegen(s3, 'Bolzer');
  neu.lp = 30;
  rahmenW5(w);
  assert.deepEqual(gezeigt(), [3, 'PUPPE', 0]);
  assert.equal(w.rahmen.anzeige, 3);
  // erst ein Treffer auf einen anderen Gegner wechselt die Anzeige
  w.treffer = [treffer('s4', 2, 'R')];
  rahmenW5(w);
  assert.deepEqual(gezeigt(), [4, 'PUPPE', 10]);
});
