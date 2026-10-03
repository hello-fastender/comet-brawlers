import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ausGanz } from '../src/kern/festkomma.ts';
import { abstand, angriffsinstanz, beteiligter, freierGegner, freiesGeschoss, freiesObjekt, freigeben, gegnerBelegen, imFenster, istLebend, modusSetzen } from '../src/kern/entitaeten.ts';
import type { Gegner, Treffer } from '../src/kern/entitaeten.ts';
import { EREIGNIS, ereignis, ereignisTreffer } from '../src/kern/ereignisse.ts';
import { parseStage } from '../src/kern/stage.ts';
import { standardStart } from '../src/kern/start.ts';
import { TASTE_A, TASTE_R } from '../src/kern/tasten.ts';
import { erzeugeWelt, logikSchritt } from '../src/kern/welt.ts';
import { rangstufe } from '../src/kern/rang.ts';
import { parseSzene } from '../src/pruef/szene.ts';
import { lies, stageText } from './hilfe.ts';

function weltAus(szene: string) {
  const start = parseSzene(szene);
  return erzeugeWelt(parseStage(stageText(start.buehne)), start);
}

test('welt: Frame-Zähler und Eingabe mit einem Frame Latenz (Kampf 2.1)', () => {
  const w = weltAus('szene name=a endframe=10');
  assert.equal(w.frame, 0);
  const folge = [TASTE_A, 0, TASTE_A, TASTE_A, TASTE_A | TASTE_R, 0];
  const t1: number[] = [];
  const neu: number[] = [];
  for (const t of folge) {
    logikSchritt(w, t);
    assert.equal(w.eingabe.t, t); // T(f) für die Spalte tasten
    t1.push(w.eingabe.t1);
    neu.push(w.eingabe.neu);
  }
  assert.equal(w.frame, 6);
  // Schritt f wertet T(f−1) aus
  assert.deepEqual(t1, [0, TASTE_A, 0, TASTE_A, TASTE_A, TASTE_A | TASTE_R]);
  // neuer Druck: in T(f−1), nicht in T(f−2); gehaltene Taste löst nicht erneut aus
  assert.deepEqual(neu, [0, TASTE_A, 0, TASTE_A, 0, TASTE_R]);
});

test('welt: Slots der Bühne scheibe nach Welt 4.1 und 9.1', () => {
  const w = erzeugeWelt(parseStage(stageText('scheibe')), standardStart(12345));
  assert.deepEqual(
    w.gegner.slice(0, 5).map((g) => [g.belegt, g.typ, g.modus, g.zustand]),
    [
      [true, 'Ballast', 'WARTEN', 2],
      [true, 'Bolzer', 'WARTEN', 2],
      [true, 'Bolzer', 'WARTEN', 2],
      [true, 'Rammbock', 'WARTEN', 2],
      [false, '', 'FREI', 0],
    ],
  );
  assert.deepEqual(w.gegner.slice(0, 4).map((g) => g.lp), [100, 16, 16, 30]);
  assert.deepEqual(w.gegner.slice(1, 4).map((g) => g.schaden), [5, 5, 6]);
  assert.equal(w.zufall.ziehungen, 4); // je Gegner eine Ziehung beim Laden
  assert.equal(w.lebende, 0); // wartende zählen nicht (Welt 4.3)
  assert.deepEqual(
    w.objekte.slice(0, 5).map((o) => [o.schluessel, o.typ, o.id]),
    [
      ['o20', 'Behälter', 'F1'],
      ['o21', 'Behälter', 'B1'],
      ['o22', 'Behälter', 'B2'],
      ['o23', 'Behälter', 'B3'],
      ['o24', '', ''],
    ],
  );
  assert.equal(freierGegner(w)?.schluessel, 's4');
  assert.equal(freiesObjekt(w)?.schluessel, 'o24');
  assert.equal(freiesGeschoss(w)?.schluessel, 'g0');
  assert.deepEqual([w.kamera.x, w.kamera.y, w.kamera.modus], [0, 128, 'FREI']);
  assert.deepEqual([w.figur.x, w.figur.z, w.figur.blick, w.figur.lp], [ausGanz(64), ausGanz(170), 1, 72]);
  assert.deepEqual(w.sperren.map((s) => s.id), ['S1']);
  assert.deepEqual(w.halte.map((h) => h.id), ['H1']);
});

test('welt: abgeschaltete Welle lässt ihren Slot leer (Welt 4.1, 11.3)', () => {
  const w = weltAus(lies('tests/szenen/beispiel_scheibe.txt'));
  assert.equal(w.gegner[1]?.typ, 'Bolzer'); // Puppe der Szene in s1
  assert.equal(w.gegner[1]?.logik, false);
  assert.equal(w.gegner[2]?.belegt, false); // welle.2 aus, s2 bleibt leer bis zum Eingriff
  assert.equal(w.gegner[3]?.belegt, false);
  assert.equal(w.gegner[0]?.angriffe_an, false);
  assert.equal(w.gegner[0]?.bewegung_an, false);
  assert.equal(w.objekte[1]?.zerbrochen, true); // Bosskisten bei welle.7=nur_boss
  assert.equal(w.objekte[0]?.zerbrochen, false);
  assert.equal(w.wellen.liste.find((x) => x.satz.nr === 9)?.aus, true);
  assert.equal(w.wellen.nur_boss, true);
  assert.equal(w.kamera.arena_ab, 1);
  assert.equal(freierGegner(w)?.schluessel, 's2');
});

test('welt: Vorframe-Kopien und Eingriffe in W1 (Kampf 3, 11.2)', () => {
  const w = weltAus('szene name=a endframe=10\ngegner slot=0 typ=Puppe x=146 z=100 lp=16\neingriff frame=2 ziel=s0 feld=x wert=200\neingriff frame=3 ziel=f feld=lp wert=5\neingriff frame=3 ziel=rang feld=wert wert=12');
  const g = w.gegner[0] as Gegner;
  logikSchritt(w, 0);
  assert.equal(g.x_vor, 146);
  logikSchritt(w, 0);
  assert.equal(g.x_vor, 146); // Vorframe vor dem Eingriff
  assert.equal(g.x, ausGanz(200));
  assert.deepEqual(w.ereignisse, ['EI:s0.x=200']);
  logikSchritt(w, 0);
  assert.equal(g.x_vor, 200);
  assert.equal(w.figur.lp, 5);
  assert.equal(w.figur.lp_vor, 72);
  assert.equal(w.rang.rang, 12);
  assert.deepEqual(w.ereignisse, ['EI:f.lp=5', 'EI:rang.wert=12']);
  logikSchritt(w, 0);
  assert.equal(w.figur.lp_vor, 5);
  assert.deepEqual(w.ereignisse, []);
  assert.throws(() => weltAus('szene name=a endframe=1\neingriff frame=1 ziel=f feld=farbe wert=1'), /unbekanntes Feld/);
  assert.throws(() => weltAus('szene name=a endframe=1 buehne=scheibe\neingriff frame=1 ziel=mond feld=x wert=1'), /unbekanntes Ziel/);
});

test('welt: Gegner per Eingriff mit eigenem Zufall (Welt 11.1) und sn_timer', () => {
  const w = weltAus('szene name=a endframe=10\ngegner slot=0 typ=Puppe x=146 z=100 lp=16\ngegner slot=3 typ=Bolzer x=300 z=100 erscheint=3');
  assert.equal(w.zufall.ziehungen, 1);
  const g0 = w.gegner[0] as Gegner;
  logikSchritt(w, 0);
  assert.equal(g0.modus_uhr, 1);
  logikSchritt(w, 0);
  assert.equal(g0.modus_uhr, 2);
  assert.equal(w.gegner[3]?.belegt, false);
  logikSchritt(w, 0);
  const g3 = w.gegner[3] as Gegner;
  assert.equal(g3.belegt, true);
  // Stand nach Stufe 2 (K3): Der erscheinende Bolzer bekommt seine LP nach
  // Rang schon im Frame des Erscheinens (Welt-T9: „1700 s2_lp 23“) und handelt
  // im selben Frame (Recht der rechten Seite, Annähern).
  assert.equal(g3.modus, 'ANNAEHERN');
  assert.equal(g3.lp_offen, false);
  assert.equal(g3.lp, 23);
  assert.equal(w.zufall.ziehungen, 2);
  assert.deepEqual(w.ereignisse, ['EI:s3.erscheint=Bolzer', 'RE:s3:R']);
  modusSetzen(g3, 'ABWARTEN');
  assert.equal(g3.modus_uhr, 1);
  modusSetzen(g3, 'ABWARTEN');
  assert.equal(g3.modus_uhr, 1);
});

test('welt: Slots freigeben, Abstände, Fenster, Lebende, Rangstufe', () => {
  const w = weltAus('szene name=a endframe=1\ngegner slot=1 typ=Puppe x=150 z=105 lp=0');
  const g = w.gegner[1] as Gegner;
  assert.deepEqual(abstand(w.figur, g), { dx: 50, dz: 5, d_vorn: 50 });
  w.figur.blick = -1;
  assert.equal(abstand(w.figur, g).d_vorn, -50);
  assert.equal(istLebend(g), true); // genau 0 LP lebt (K6)
  assert.equal(imFenster(g, 0), true);
  assert.equal(imFenster(g, 600), false);
  freigeben(g);
  assert.deepEqual([g.belegt, g.zustand, g.typ, g.schluessel], [false, 0, '', 's1']);
  assert.equal(freierGegner(w)?.schluessel, 's1');
  gegnerBelegen(g, 'Rammbock');
  assert.deepEqual([g.belegt, g.zustand, g.typ], [true, 1, 'Rammbock']);
  assert.deepEqual([7, 8, 14, 15, 21, 22, 24].map(rangstufe), [0, 1, 1, 2, 2, 3, 3]);
});

test('welt: Ereignisse nach Kampf 11.4', () => {
  const w = { ereignisse: [] as string[] };
  ereignis(w, EREIGNIS.KETTE, beteiligter('f'), 2);
  ereignis(w, EREIGNIS.WELLE, 7);
  const inst = angriffsinstanz({ code: 'KT1', angreifer: 'f', flaeche: { art: 'gehalten' }, schaden: 3, umwerfen: false, trefferstopp: true, gegen: 'gegner', beginn: 11 });
  const t: Treffer = { angreifer: 'f', urheber: 'f', ziel: 's0', code: 'KT1', schaden: 3, umwerfen: false, bahn: '', richtung: 1, von_vorn: true, wirkung: '', lp_vorher: 16, instanz: inst };
  assert.throws(() => ereignisTreffer(w, t), RangeError);
  t.wirkung = 'R';
  ereignisTreffer(w, t);
  assert.deepEqual(w.ereignisse, ['KE:F:2', 'WL:7', 'T:F>s0:KT1:3:R']);
  assert.throws(() => ereignis(w, 'EI', 'a,b'), RangeError);
  assert.equal(inst.urheber, 'f');
  assert.equal(inst.bahn, '');
  assert.equal(inst.aktiv, false);
});

test('welt: Prüfstart verlangt die passende Bühne', () => {
  const start = parseSzene('szene name=a endframe=1 buehne=scheibe');
  assert.throws(() => erzeugeWelt(parseStage(stageText('pruefbuehne')), start), /Bühne/);
});
