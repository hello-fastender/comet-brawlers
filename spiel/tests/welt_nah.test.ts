// Tests K3 (Stufe 2): Nahkämpfer nach Welt 5 (Annähern, Haltabstand,
// Kampfhaltung und Pause nach Rang, Zielabstand und Abbruch, Angriffsarten,
// Serie, Angriffserlaubnis). Die Figur steht oder wird vor dem Logikschritt
// versetzt (wie ein Lauf in KS2); die Gegner reagieren im Kampfschritt auf
// die Lage nach KS2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Welt } from '../src/kern/welt.ts';
import type { Gegner } from '../src/kern/entitaeten.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { parseStage } from '../src/kern/stage.ts';
import { ausDezimal, ausGanz, ganz, zuDezimalText } from '../src/kern/festkomma.ts';
import { pauseNachRang, rechteGesperrt, sprungtrittHoehe } from '../src/kern/gegner/nah.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { stageText } from './hilfe.ts';

function weltAus(text: string): Welt {
  const s = parseSzene(text);
  return erzeugeWelt(parseStage(stageText(s.buehne)), s);
}

const LAUF = ausDezimal(1.75);

function gegner(w: Welt, n: number): Gegner {
  return w.gegner[n] as Gegner;
}

/** Läuft Frames bis zur Bedingung (höchstens bis), gibt den Frame zurück, in dem sie zuerst gilt. */
function bis(w: Welt, bedingung: (w: Welt) => boolean, hoechstens: number, vorher: (w: Welt) => void = () => {}): number {
  while (w.frame < hoechstens) {
    vorher(w);
    logikSchritt(w, 0);
    if (bedingung(w)) return w.frame;
  }
  throw new Error(`Bedingung bis Frame ${hoechstens} nicht erfüllt`);
}

test('Welt 5.3, 5.4: Versteck, Annähern, Kampfhaltung, Pause, Angriff BA mit Zielabstand 48 (Welt 12 T4, PS4)', () => {
  const w = weltAus(`szene name=welt_t4 endframe=200 seed=12345 buehne=scheibe
pruefstart welle.2=aus sperre.S1=aus rang.fest fest.gehstufe=normal fest.angriff=BA
figur z=206`);
  const s1 = gegner(w, 1);
  const zeilen: Record<number, string> = {};
  while (w.frame < 186) {
    const f = w.frame + 1;
    if (f >= 2 && f <= 89) w.figur.x += LAUF;
    logikSchritt(w, 0);
    zeilen[f] = `${zuDezimalText(w.figur.x)}|${w.kamera.x}|${s1.modus}|${zuDezimalText(s1.x)}|${w.rechte.r}|${w.ereignisse.join(';')}`;
  }
  assert.equal(zeilen[88]?.split('|')[0], '216.25');
  assert.equal(zeilen[89], '218|18|WARTEN|368|null|WL:1');
  assert.equal(zeilen[90], '218|18|AUFTRITT|368|null|WK:s1');
  assert.equal(zeilen[105]?.split('|')[2], 'AUFTRITT');
  assert.equal(zeilen[106], '218|18|ANNAEHERN|366.25|1|RE:s1:R');
  assert.equal(zeilen[162]?.split('|')[3], '268.25');
  assert.equal(zeilen[163]?.split('|').slice(2, 4).join('|'), 'ANNAEHERN|266.5');
  assert.equal(zeilen[164]?.split('|')[2], 'KAMPFHALTUNG');
  assert.equal(zeilen[184]?.split('|')[2], 'KAMPFHALTUNG');
  assert.equal(zeilen[185], '218|18|ANGRIFF|266.5|1|AS:s1:BA');
  assert.deepEqual([s1.angriff_code, s1.ziel_abstand, s1.ziel_x, s1.schaden, s1.kampfhaltung_s, s1.pause], ['BA', 48, 218, 5, 164, 21]);
});

test('Welt 5.1, 5.3: Nahkämpfer hält bei 46 bis 48 px an (normal), bei schnellem Gehen bei 54 bis 56 px', () => {
  const ergebnisse: number[] = [];
  for (const start of [120, 121, 122, 123, 160, 161, 162, 163]) {
    for (const seite of [1, -1] as const) {
      const w = weltAus(`szene name=welt_halt endframe=300 seed=7
pruefstart rang.fest fest.gehstufe=normal
figur x=200 z=100
gegner slot=1 typ=Bolzer x=${200 + seite * start} z=100 vorplatziert=ja logik=an`);
      const g = gegner(w, 1);
      bis(w, (x) => gegner(x, 1).modus === 'KAMPFHALTUNG', 300);
      const d = Math.abs(ganz(g.x) - ganz(w.figur.x));
      assert.ok(d === 47 || d === 48, `stehende Figur: |dx| ${d} (Start ${start}, Seite ${seite})`);
      ergebnisse.push(d);
    }
  }
  assert.deepEqual([...new Set(ergebnisse)].sort(), [47, 48]);
  // Figur geht dem Gegner entgegen (3,5 px je Frame Annäherung): auch dann 46 bis 48, weil der
  // Gegner vor seinem Schritt prüft, ob er schon im Haltabstand steht
  for (const start of [140, 141, 142, 143, 144, 145, 146, 147]) {
    const w = weltAus(`szene name=welt_halt2 endframe=300 seed=7
pruefstart rang.fest fest.gehstufe=normal
figur x=200 z=100
gegner slot=1 typ=Bolzer x=${200 + start} z=100 vorplatziert=ja logik=an`);
    const g = gegner(w, 1);
    bis(
      w,
      (x) => gegner(x, 1).timer['angekommen'] === 1,
      300,
      (x) => {
        x.figur.x += LAUF;
      },
    );
    const d = Math.abs(ganz(g.x) - ganz(w.figur.x));
    assert.ok(d >= 46 && d <= 48, `entgegen: |dx| ${d}`);
  }
  // schnelles Gehen: H = 56
  for (const start of [130, 131, 132, 133]) {
    const w = weltAus(`szene name=welt_halt3 endframe=300 seed=7
pruefstart rang.fest fest.gehstufe=schnell
figur x=200 z=100
gegner slot=1 typ=Bolzer x=${200 + start} z=100 vorplatziert=ja logik=an`);
    const g = gegner(w, 1);
    bis(w, (x) => gegner(x, 1).modus === 'KAMPFHALTUNG', 300);
    const d = Math.abs(ganz(g.x) - ganz(w.figur.x));
    assert.ok(d >= 54 && d <= 56, `schnell: |dx| ${d}`);
    assert.equal(g.haltabstand, 56);
  }
});

test('Welt 5.1, 8: Angriffspause in Kampfhaltung 29 − 4·⌊Rang/4⌋ (Startgegner wie spätere)', () => {
  const erwartet: Record<number, number> = { 7: 25, 8: 21, 11: 21, 12: 17, 15: 17, 16: 13, 19: 13, 20: 9, 23: 9, 24: 5 };
  for (let rang = 7; rang <= 24; rang++) {
    const e = erwartet[rang];
    if (e !== undefined) assert.equal(pauseNachRang(rang), e, `Rang ${rang}`);
  }
  for (const rang of [7, 9, 12, 16, 20, 24]) {
    for (const vorplatziert of ['ja', 'nein']) {
      const w = weltAus(`szene name=welt_pause endframe=100 seed=3
pruefstart rang=${rang} rang.fest fest.gehstufe=normal fest.angriff=BA
gegner slot=1 typ=Bolzer x=148 z=100 vorplatziert=${vorplatziert} logik=an`);
      const g = gegner(w, 1);
      const s = bis(w, (x) => gegner(x, 1).modus === 'KAMPFHALTUNG', 100);
      const a = bis(w, (x) => x.ereignisse.includes('AS:s1:BA'), 100);
      assert.equal(s, 2, 'Haltepunkt im ersten Frame erreicht, Kampfhaltung ab dem nächsten');
      assert.equal(a - s, pauseNachRang(rang), `Rang ${rang}`);
      assert.equal(g.kampfhaltung_s, s);
      // Schaden in A: Startgegner 5, spätere nach Rangstufe (Welt 8)
      const stufe = rang === 7 ? 7 : rang <= 14 ? 8 : rang <= 21 ? 9 : 10;
      assert.equal(g.schaden, vorplatziert === 'ja' ? 5 : stufe);
    }
  }
});

test('Welt 5.4: Abbruch bei mehr als 32 px links bzw. 31 px rechts vom Zielpunkt oder dz außerhalb −10 … +11', () => {
  const faelle: [string, number, number, boolean][] = [
    // Feld, Versatz der Figur ab A+1, Frame relativ zu A, abgebrochen?
    ['x', -32, 1, false],
    ['x', -33, 1, true],
    ['x', 31, 1, false],
    ['x', 32, 1, true],
    ['z', -10, 1, false],
    ['z', -11, 1, true],
    ['z', 11, 1, false],
    ['z', 12, 1, true],
  ];
  for (const [feld, versatz, nach, abbruch] of faelle) {
    const w = weltAus(`szene name=welt_abbruch endframe=100 seed=3
pruefstart rang.fest fest.gehstufe=normal fest.angriff=BA
gegner slot=1 typ=Bolzer x=148 z=100 vorplatziert=ja logik=an`);
    const g = gegner(w, 1);
    const a = bis(w, (x) => x.ereignisse.includes('AS:s1:BA'), 100);
    assert.deepEqual([g.ziel_abstand, g.ziel_x], [48, 100]);
    // in A+1 steht die Figur versetzt (Welt-dz = z_Gegner − z_Figur, also Figur-z = 100 − dz)
    if (feld === 'x') w.figur.x = ausGanz(100 + versatz);
    else w.figur.z = ausGanz(100 - versatz);
    for (let i = 0; i < nach; i++) logikSchritt(w, 0);
    assert.equal(w.frame, a + nach);
    assert.equal(w.ereignisse.includes('AA:s1'), abbruch, `${feld} ${versatz}`);
    assert.equal(g.modus, abbruch ? 'ANNAEHERN' : 'ANGRIFF', `${feld} ${versatz}`);
    assert.equal(g.angriff === null, abbruch);
  }
});

test('Welt 5.7: Angriffserlaubnis höchstens zwei, je Seite einer, ohne Rücksicht auf Schutz (Welt 12 T6, PS6)', () => {
  const w = weltAus(`szene name=welt_t6 endframe=600 seed=12345 buehne=scheibe
pruefstart welle.1=aus welle.2=aus sperre.S1=aus kamera.x=300 rang.fest fest.gehstufe=normal fest.angriff=BA
figur x=500 z=178
gegner slot=1 typ=Bolzer x=600 z=178 vorplatziert=ja logik=an
gegner slot=2 typ=Bolzer x=620 z=178 vorplatziert=ja logik=an
gegner slot=3 typ=Bolzer x=640 z=178 vorplatziert=ja logik=an
gegner slot=4 typ=Bolzer x=390 z=178 vorplatziert=ja logik=an`);
  const werte: Record<number, string> = {};
  let kaempfer = 0;
  while (w.frame < 600) {
    logikSchritt(w, 0);
    const f = w.frame;
    werte[f] = [1, 2, 3, 4].map((n) => `${gegner(w, n).modus}@${zuDezimalText(gegner(w, n).x)}`).join(' ');
    const im = w.gegner.filter((g) => g.belegt && (g.modus === 'KAMPFHALTUNG' || g.modus === 'ANGRIFF' || g.modus === 'NACHLAUF'));
    assert.ok(im.length <= 2, `Frame ${f}: ${im.length} im Nahangriff`);
    const seiten = im.map((g) => g.recht);
    assert.equal(new Set(seiten).size, seiten.length, `Frame ${f}: zwei auf einer Seite`);
    assert.ok(
      im.every((g) => g.recht !== ''),
      `Frame ${f}: ohne Recht im Nahangriff`,
    );
    kaempfer = Math.max(kaempfer, im.length);
    if (f === 1) {
      assert.deepEqual([w.rechte.r, w.rechte.l], [1, 4]);
      assert.deepEqual(w.ereignisse, ['RE:s1:R', 'RE:s4:L']);
    }
  }
  assert.equal(kaempfer, 2);
  assert.match(werte[1] ?? '', /^ANNAEHERN@598.25 ABWARTEN@620 ABWARTEN@638.25 ANNAEHERN@391.75$/);
  assert.equal(werte[2]?.split(' ')[2], 'ABWARTEN@636.5');
  assert.equal(werte[3]?.split(' ')[2], 'ABWARTEN@636.5');
  assert.equal(werte[30]?.split(' ')[0], 'ANNAEHERN@547.5');
  assert.equal(werte[31]?.split(' ')[0], 'KAMPFHALTUNG@547.5');
  assert.equal(werte[36]?.split(' ')[3], 'ANNAEHERN@453');
  assert.equal(werte[37]?.split(' ')[3], 'KAMPFHALTUNG@453');
  assert.equal(werte[51]?.split(' ')[0], 'KAMPFHALTUNG@547.5');
  assert.equal(werte[52]?.split(' ')[0], 'ANGRIFF@547.5');
  assert.equal(werte[57]?.split(' ')[3], 'KAMPFHALTUNG@453');
  assert.equal(werte[58]?.split(' ')[3], 'ANGRIFF@453');
});

test('Welt 5.6: Serie Bolzer – Gruppe aus normalen Angriffen, BUB direkt nach dem Nachlauf von BA ohne Pause', () => {
  const w = weltAus(`szene name=welt_serie endframe=400 seed=5
pruefstart rang.fest fest.gehstufe=normal fest.angriff=BA fest.gruppe=2 fest.umwerf=BUB
gegner slot=1 typ=Bolzer x=148 z=100 vorplatziert=ja logik=an`);
  const g = gegner(w, 1);
  const angriffe: [number, string][] = [];
  const modi: string[] = [''];
  while (w.frame < 400 && angriffe.length < 3) {
    logikSchritt(w, 0);
    modi.push(g.modus);
    for (const e of w.ereignisse) if (e.startsWith('AS:s1:')) angriffe.push([w.frame, e.slice(6)]);
  }
  assert.deepEqual(
    angriffe.map((a) => a[1]),
    ['BA', 'BA', 'BUB'],
  );
  const [, zweiter, dritter] = angriffe;
  // vor dem zweiten BA Kampfhaltung (Pause 21), vor BUB Nachlauf (keine Kampfhaltung)
  assert.equal(modi[(zweiter?.[0] ?? 0) - 1], 'KAMPFHALTUNG');
  assert.equal(modi[(dritter?.[0] ?? 0) - 1], 'NACHLAUF');
  assert.equal(g.recht, 'R');
});

test('Welt 5.5: Sprungtritt des Rammbocks – Höhe 5n − n(n−1)/8, Scheitel 52,5 px, 123 px weit, Aufsetzen in A+46, kein Abbruch', () => {
  assert.equal(zuDezimalText(sprungtrittHoehe(1)), '5');
  assert.equal(zuDezimalText(sprungtrittHoehe(2)), '9.75');
  assert.equal(zuDezimalText(sprungtrittHoehe(20)), '52.5');
  assert.equal(zuDezimalText(sprungtrittHoehe(21)), '52.5');
  assert.equal(zuDezimalText(sprungtrittHoehe(41)), '0');
  const w = weltAus(`szene name=welt_rs endframe=200 seed=5
pruefstart rang.fest fest.gehstufe=normal fest.sprungtritt=ja
gegner slot=1 typ=Rammbock x=148 z=100 vorplatziert=ja logik=an`);
  const g = gegner(w, 1);
  const a = bis(w, (x) => x.ereignisse.includes('AS:s1:RS'), 100);
  const xa = g.x;
  assert.equal(g.blick, -1);
  // die Figur geht weg: der Sprungtritt bricht nicht ab
  w.figur.x = ausGanz(300);
  const hoehen: Record<number, string> = {};
  while (w.frame < a + 46) {
    logikSchritt(w, 0);
    hoehen[w.frame - a] = zuDezimalText(g.h);
    assert.ok(!w.ereignisse.includes('AA:s1'));
  }
  assert.equal(hoehen[5], '0');
  assert.equal(hoehen[6], '5');
  assert.equal(hoehen[25], '52.5');
  assert.equal(hoehen[46], '0');
  assert.equal(zuDezimalText(xa - g.x), '123');
});

test('Welt 5.7 E-10: keine Rechte vom Tod der Figur (t+1) bis zum Erscheinen (N+1) und in der Blende', () => {
  const w = weltAus('szene name=welt_e10 endframe=10 seed=3');
  w.frame = 100;
  assert.equal(rechteGesperrt(w), false);
  w.figur.tod_t = 100;
  w.figur.neueinstieg_n = 220;
  assert.equal(rechteGesperrt(w), false, 'in t selbst noch nicht');
  w.frame = 101;
  assert.equal(rechteGesperrt(w), true);
  w.frame = 221;
  assert.equal(rechteGesperrt(w), true, 'bis N+1');
  w.frame = 222;
  assert.equal(rechteGesperrt(w), false);
  w.kamera.blende_c = 300;
  w.frame = 300;
  assert.equal(rechteGesperrt(w), false);
  w.frame = 301;
  assert.equal(rechteGesperrt(w), true);
  w.frame = 434;
  assert.equal(rechteGesperrt(w), true);
  w.frame = 435;
  assert.equal(rechteGesperrt(w), false);
});
