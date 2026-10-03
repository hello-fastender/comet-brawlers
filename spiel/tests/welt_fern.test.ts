// Tests K3 (Stufe 2): Fernkämpfer Zünder nach Welt 6 mit E17 (Zielpunkt,
// Zielen 60 Frames mit Zielrecht, Schuss ZR, Rakete, Explosion, Kolbenhieb,
// Waffe beim Tod). Die Figur steht in der Arena (Prüfstart wie Welt 12 PS7).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Welt } from '../src/kern/welt.ts';
import type { Gegner, Objekt } from '../src/kern/entitaeten.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { objektBelegen } from '../src/kern/entitaeten.ts';
import { parseStage } from '../src/kern/stage.ts';
import { ausGanz, ganz, zuDezimalText } from '../src/kern/festkomma.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { stageText } from './hilfe.ts';

function weltAus(text: string): Welt {
  const s = parseSzene(text);
  return erzeugeWelt(parseStage(stageText(s.buehne)), s);
}

/** Arena wie Welt 12 PS7 (Boss greift nicht an und bewegt sich nicht), dazu eigene Zeilen. */
function arena(zusatz: string, figurX: number = 2000, figurZ: number = 55): Welt {
  return weltAus(`szene name=welt_fern endframe=600 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus welle.9=aus welle.7=nur_boss rang.fest kamera.x=1792 kamera.modus=ARENA
pruefstart boss.angriffe=aus boss.bewegung=aus fest.gehstufe=normal
figur x=${figurX} z=${figurZ} blick=R
gegner slot=0 typ=Ballast x=2060 z=50 blick=L
${zusatz}`);
}

function gegner(w: Welt, n: number): Gegner {
  return w.gegner[n] as Gegner;
}

function raketen(w: Welt): Objekt[] {
  return w.objekte.filter((o) => o.belegt && o.typ === 'Rakete');
}

test('Welt 6, E17: Zünder der Welle 9 – Anlegen am linken Rand, Zielen 60 Frames, Schuss, Rakete, Einschlag (Welt 12 T8a)', () => {
  const w = weltAus(`szene name=welt_t8a endframe=230 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus welle.7=nur_boss rang.fest kamera.x=1792 kamera.modus=ARENA
pruefstart boss.angriffe=aus boss.bewegung=aus boss.lp=30 fest.gehstufe=normal fest.zielpunkt=128
figur x=2000 z=55 blick=R
gegner slot=0 typ=Ballast x=2060 z=50 blick=L
eingriff frame=60 ziel=welle.9 feld=jetzt wert=ja`);
  const s1 = gegner(w, 1);
  const zeilen: Record<number, { modus: string; x: string; z: string; ev: string[]; zielrecht: number | null; rak: string }> = {};
  while (w.frame < 217) {
    logikSchritt(w, 0);
    const r = raketen(w)[0];
    zeilen[w.frame] = {
      modus: s1.modus,
      x: zuDezimalText(s1.x),
      z: zuDezimalText(s1.z),
      ev: [...w.ereignisse],
      zielrecht: w.rechte.ziel,
      rak: r === undefined ? '' : `${zuDezimalText(r.x)},${zuDezimalText(r.z)},${r.flugphase}`,
    };
  }
  assert.ok(zeilen[60]?.ev.includes('WL:9'));
  assert.deepEqual([s1.typ, s1.lp_max], ['Zünder', 17]);
  assert.deepEqual([zeilen[61]?.x, zeilen[61]?.z, zeilen[61]?.modus], ['1761.75', '55', 'ANNAEHERN']);
  assert.equal(zeilen[119]?.x, '1863.25');
  assert.deepEqual([zeilen[120]?.x, zeilen[120]?.modus], ['1865', 'ANNAEHERN']);
  assert.deepEqual([zeilen[121]?.modus, zeilen[121]?.zielrecht], ['ZIELEN', 1]);
  assert.ok(zeilen[121]?.ev.includes('ZR:s1'));
  for (let f = 121; f <= 180; f++) assert.deepEqual([zeilen[f]?.modus, zeilen[f]?.x, zeilen[f]?.z], ['ZIELEN', '1865', '55'], `Frame ${f}`);
  assert.equal(zeilen[181]?.modus, 'SCHUSS');
  assert.ok(zeilen[181]?.ev.includes('AS:s1:ZR'));
  assert.equal(zeilen[186]?.rak, '');
  assert.equal(zeilen[187]?.rak, '1910,55,FLUG');
  assert.deepEqual([zeilen[198]?.modus, zeilen[198]?.zielrecht], ['ZIELEN', 1]);
  assert.ok(zeilen[198]?.ev.includes('ZR:s1'));
  assert.equal(zeilen[206]?.rak, '2005,55,FLUG');
  assert.equal(zeilen[207]?.rak, '2010,55,EXPLOSION');
  assert.ok(zeilen[207]?.ev.some((e) => /^EX:o\d+$/.test(e)));
  assert.equal(zeilen[216]?.rak, '2010,55,EXPLOSION');
  assert.equal(zeilen[217]?.rak, '');
});

test('Welt 6: Zünder zielt genau 60 Frames und schießt aus 112 bis 136 px (alle drei Zielpunkte, von links und rechts)', () => {
  for (const zp of ['128', '120h', '120v']) {
    for (const start of [1760, 2240]) {
      const w = arena(`pruefstart fest.zielpunkt=${zp}
gegner slot=1 typ=Zünder x=${start} z=55 logik=an`);
      const g = gegner(w, 1);
      let z = 0;
      let a = 0;
      let abstand = 0;
      while (w.frame < 400 && a === 0) {
        logikSchritt(w, 0);
        if (z === 0 && g.modus === 'ZIELEN') {
          z = w.frame;
          abstand = Math.abs(ganz(g.x) - ganz(w.figur.x));
          assert.ok(w.ereignisse.includes('ZR:s1'));
        }
        if (w.ereignisse.includes('AS:s1:ZR')) a = w.frame;
        if (z > 0 && a === 0) assert.equal(g.modus, 'ZIELEN', `Frame ${w.frame}`);
      }
      assert.ok(z > 0, `${zp} von ${start}: kein Zielen`);
      assert.equal(a - z, 60, `${zp} von ${start}`);
      assert.ok(abstand >= 112 && abstand <= 136, `${zp} von ${start}: Zielbeginn aus ${abstand} px`);
      assert.equal(g.schaden, 13);
      // in A+6 die Rakete 45 px vor ihm in seiner Tiefe
      while (w.frame < a + 6) logikSchritt(w, 0);
      const r = raketen(w)[0] as Objekt;
      assert.equal(ganz(r.x), ganz(g.x) + 45 * g.blick);
      assert.equal(r.z, g.z);
      assert.equal(zuDezimalText(r.h), '44');
    }
  }
});

test('Welt 6: Explosion als Instanz mit Fläche punkt, aktiv Q+21 bis Q+29, danach Slot frei; Wand hält die Rakete früher auf', () => {
  const w = arena('gegner slot=1 typ=Zünder x=1760 z=55 logik=an\npruefstart fest.zielpunkt=128');
  const g = gegner(w, 1);
  while (w.frame < 400 && !w.ereignisse.includes('AS:s1:ZR')) logikSchritt(w, 0);
  const q = w.frame + 6;
  while (w.frame < q) logikSchritt(w, 0);
  const r = raketen(w)[0] as Objekt;
  const aktiv: number[] = [];
  while (w.frame < q + 31) {
    logikSchritt(w, 0);
    if (r.belegt && r.angriff !== null && r.angriff.aktiv) aktiv.push(w.frame - q);
    if (w.frame === q + 20) {
      assert.equal(r.flugphase, 'EXPLOSION');
      assert.equal(ganz(r.x), ganz(g.x) + 145);
      const inst = r.angriff;
      assert.ok(inst !== null);
      assert.deepEqual([inst.code, inst.urheber, inst.schaden, inst.umwerfen, inst.gegen, inst.trefferstopp], ['ZR', 's1', 13, true, 'figur', false]);
      assert.deepEqual(inst.flaeche, {
        art: 'punkt',
        x: ganz(g.x) + 145,
        z: 55,
        richtung: 1,
        vorn: 51,
        hinten: 52,
        tiefe: 12,
        ziel_blick_versatz: 4,
        hoehe_ziel_max: 25,
      });
    }
  }
  assert.deepEqual(aktiv, [21, 22, 23, 24, 25, 26, 27, 28, 29]);
  assert.equal(r.belegt && r.typ === 'Rakete', false, 'Slot nach Q+29 frei');

  // Wand: Ende des Tiefenbands bei x 2304
  const w2 = arena('');
  const o = w2.objekte[30] as Objekt;
  objektBelegen(o, 'Rakete');
  o.x = ausGanz(2290);
  o.z = ausGanz(55);
  o.h = ausGanz(44);
  o.blick = 1;
  o.bahn_richtung = 1;
  o.besitzer = 's5';
  o.flugphase = 'FLUG';
  o.abschuss = 0;
  logikSchritt(w2, 0);
  logikSchritt(w2, 0);
  assert.equal(zuDezimalText(o.x), '2300');
  assert.equal(o.flugphase, 'FLUG');
  logikSchritt(w2, 0);
  assert.deepEqual([zuDezimalText(o.x), o.flugphase, o.einschlag_x], ['2300', 'EXPLOSION', 2300]);
  assert.ok(w2.ereignisse.includes('EX:o50'));
});

test('Welt 6: Zielrecht – höchstens ein Zünder in ZIELEN oder SCHUSS, der andere steht BEREIT', () => {
  const w = arena(`pruefstart fest.zielpunkt=128
gegner slot=1 typ=Zünder x=1760 z=55 logik=an
gegner slot=2 typ=Zünder x=2240 z=55 logik=an`);
  let bereit = 0;
  while (w.frame < 400) {
    logikSchritt(w, 0);
    const zielend = [1, 2].filter((n) => ['ZIELEN', 'SCHUSS'].includes(gegner(w, n).modus));
    assert.ok(zielend.length <= 1, `Frame ${w.frame}: ${zielend.length} zielen`);
    if (gegner(w, 2).modus === 'BEREIT' || gegner(w, 1).modus === 'BEREIT') bereit += 1;
  }
  assert.ok(bereit > 0);
});

test('Welt 6: Kolbenhieb nur am Bildrand, nah und mit Nahkampfrecht (Code ZK, wie BA)', () => {
  // Zünder 8 px vom linken Bildrand, Figur 40 px rechts von ihm
  const w = arena('gegner slot=1 typ=Zünder x=1800 z=55 logik=an', 1840, 55);
  logikSchritt(w, 0);
  const g = gegner(w, 1);
  assert.deepEqual(
    w.ereignisse.filter((e) => /^(RE|AS):s1/.test(e)),
    ['RE:s1:L', 'AS:s1:ZK'],
  );
  assert.deepEqual([g.modus, g.recht, g.angriff_code, g.ziel_abstand, g.ziel_x, g.schaden], ['KOLBENHIEB', 'L', 'ZK', -40, 1840, 8]);
  assert.equal(g.angriff?.flaeche.art, 'fenster');
  // ohne Recht kein Kolbenhieb
  const w2 = arena('gegner slot=1 typ=Zünder x=1800 z=55 logik=an erlaubnis=aus', 1840, 55);
  logikSchritt(w2, 0);
  assert.ok(!w2.ereignisse.includes('AS:s1:ZK'));
  assert.notEqual(gegner(w2, 1).modus, 'KOLBENHIEB');
});

test('Welt 6, 9.3: Waffe des toten Zünders fliegt 34 Frames von der Figur weg und ist ab L = t+44 ein Raketenwerfer mit 3 Schuss', () => {
  const w = arena('gegner slot=1 typ=Zünder x=1900 z=55 logik=an\neingriff frame=5 ziel=s1 feld=lp wert=-1');
  while (w.frame < 5) logikSchritt(w, 0);
  const er = w.ereignisse.find((e) => e.startsWith('ER:'));
  assert.ok(er !== undefined && er.endsWith(':Raketenwerfer'), String(w.ereignisse));
  const slot = (er ?? '').split(':')[1] as string;
  const o = w.objekte[Number(slot.slice(1)) - 20] as Objekt;
  const x0 = o.x;
  assert.deepEqual([o.typ, o.art, o.munition, o.aufnehmbar, o.flugphase], ['Gegenstand', 'Raketenwerfer', 3, false, 'FLUG']);
  const hoehen: Record<number, string> = {};
  while (w.frame < 5 + 44) {
    logikSchritt(w, 0);
    hoehen[w.frame - 5] = zuDezimalText(o.h);
    if (w.frame < 5 + 44) assert.equal(o.aufnehmbar, false, `Frame ${w.frame}`);
  }
  assert.equal(hoehen[17], '61');
  assert.equal(hoehen[34], '0');
  assert.equal(zuDezimalText(x0 - o.x), '68', 'von der Figur weg (links), 2 px je Frame');
  assert.ok(w.ereignisse.includes(`LA:${slot}`));
  assert.deepEqual([o.aufnehmbar, o.landung_l, o.liegezeit], [true, 49, 0]);
});
