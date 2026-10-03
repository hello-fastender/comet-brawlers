import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Figur, FigurAktion, FigurPhase, Gegner, GegnerTyp, Objekt } from '../src/kern/entitaeten.ts';
import type { Welt } from '../src/kern/welt.ts';
import type { Atlanten, SpriteBlatt, Wahl } from '../src/darstellung/zuordnung.ts';
import { figurNeu, gegnerBelegen, objektBelegen } from '../src/kern/entitaeten.ts';
import { ausGanz } from '../src/kern/festkomma.ts';
import {
  AS_AKTIV_VON,
  AUSFALL_AKTIV_VON,
  KETTE4_ZWEITES_FENSTER_VON,
  KETTE_AKTIV_VON,
  KNIESTOSS_TREFFER,
  KP_AKTIV_VON,
  NAH_ANGRIFFE,
  RAKETE_ABSCHUSS,
  RX_DAUER,
  SPEZIAL_STUFE_VON,
  SPRINTANGRIFF,
  SPRUNGANGRIFF,
  SS_ERSTER_AKTIV,
  SS_ZWEITER_AKTIV_VON,
  WURF_TREFFER,
  ZR_EINSCHLAG,
  ZR_EXPLOSION_VON,
  ZR_RAKETE_AB,
} from '../src/kern/werte.ts';
import { figurTeile, figurWahl, gegnerWahl } from '../src/darstellung/zuordnung.ts';
import { Verlauf } from '../src/darstellung/verlauf.ts';
import { atlantenLesen, scheibenWelt } from './grafik_einbau_hilfe.ts';

// Auftrag 4, 1.4 und Phase 3 (G7): Für jede Angriffsanimation zeigt die
// Zuordnung bei der Aktionsuhr des ersten aktiven Frames (werte.ts) ein Bild
// aus dem Atlas-Feld „aktiv“. Die Zustände werden von Hand gesetzt wie in der
// Logik zum ersten aktiven Frame (Figur: aktion, phase, uhr; Gegner: modus,
// angriff_code, angriff_a bzw. die Felder des Bosses).

const A: Atlanten = atlantenLesen();
const BEGINN = 1000;

/** Prüft, dass die Wahl die erwartete Animation zeigt und ihr Bild in „aktiv“ liegt; gibt den Index zurück. */
function aktivPruefen(w: Wahl, blatt: SpriteBlatt, animation: string, wo: string): number {
  assert.equal(w.ersatz, null, `${wo}: ${w.ersatz}`);
  assert.equal(w.blatt, blatt, `${wo}: Blatt`);
  assert.equal(w.animation, animation, `${wo}: Animation`);
  const aktiv = A[blatt].animationen[animation]?.aktiv;
  assert.ok(aktiv !== undefined && aktiv.length > 0, `${wo}: ${blatt}/${animation} hat kein Feld aktiv`);
  assert.ok(aktiv.includes(w.bild), `${wo}: Bild ${w.bild} nicht in aktiv ${JSON.stringify(aktiv)}`);
  return w.bild;
}

/** Figur zum ersten aktiven Frame. */
function figur(welt: Welt, aktion: FigurAktion, phase: FigurPhase, uhr: number, setze?: (f: Figur) => void): Figur {
  const f = welt.figur;
  Object.assign(f, figurNeu());
  f.aktion = aktion;
  f.phase = phase;
  f.uhr = uhr;
  setze?.(f);
  return f;
}

test('Trefferbild im aktiven Frame: Vela (Kette mit und ohne Ausfallschritt, Sprungangriffe, Kniestoß, Wurf, Spezial, Sprintangriffe, Waffe)', () => {
  const welt = scheibenWelt();
  welt.frame = BEGINN;
  let geprueft = 0;
  for (let k = 1; k <= 4; k++) {
    const name = `kette${k}`;
    for (const blick of [1, -1] as const) {
      const f = figur(welt, 'SCHLAG', String(k) as FigurPhase, KETTE_AKTIV_VON[k - 1] as number, (x) => ((x.kombo = k), (x.blick = blick)));
      aktivPruefen(figurWahl(f, welt, A), 'vela', name, `${name} uhr ${f.uhr} Blick ${blick}`);
    }
    if (k > 1) {
      const f = figur(welt, 'SCHLAG', String(k) as FigurPhase, AUSFALL_AKTIV_VON[k - 1] as number, (x) => ((x.kombo = k), (x.ausfallschritt = 1)));
      aktivPruefen(figurWahl(f, welt, A), 'vela', name, `${name} mit Ausfallschritt uhr ${f.uhr}`);
    }
    geprueft += 1;
  }
  const f4 = figur(welt, 'SCHLAG', '4', KETTE4_ZWEITES_FENSTER_VON, (x) => (x.kombo = 4));
  assert.equal(aktivPruefen(figurWahl(f4, welt, A), 'vela', 'kette4', 'kette4 zweites Fenster'), 8);

  const sprung: [FigurPhase, string, number][] = [
    ['N', 'sprungangriff', SPRUNGANGRIFF.N.aktiv_von],
    ['R', 'richtung', SPRUNGANGRIFF.R.aktiv_von],
    ['H', 'hoch', SPRUNGANGRIFF.H.aktiv_von],
    ['T', 'runter', SPRUNGANGRIFF.T.aktiv_von],
  ];
  for (const [phase, name, uhr] of sprung) {
    aktivPruefen(figurWahl(figur(welt, 'SPRUNGANGRIFF', phase, uhr), welt, A), 'vela', name, `${name} uhr ${uhr}`);
    geprueft += 1;
  }
  aktivPruefen(figurWahl(figur(welt, 'KNIESTOSS', '1', KNIESTOSS_TREFFER), welt, A), 'vela', 'kniestoss', 'kniestoss');
  aktivPruefen(figurWahl(figur(welt, 'WURF', 'V', WURF_TREFFER), welt, A), 'vela', 'wurf', 'wurf');
  aktivPruefen(figurWahl(figur(welt, 'SPRINTANGRIFF', '', SPRINTANGRIFF.aktiv_von), welt, A), 'vela', 'sprintangriff', 'sprintangriff');
  geprueft += 3;
  // Spezial: jede Flächenstufe beginnt ein eigenes aktives Bild
  const spezial = SPEZIAL_STUFE_VON.map((uhr) => aktivPruefen(figurWahl(figur(welt, 'SPEZIAL', '', uhr), welt, A), 'vela', 'spezial', `spezial uhr ${uhr}`));
  assert.equal(new Set(spezial).size, SPEZIAL_STUFE_VON.length, 'jede Stufe ein eigenes Bild');
  geprueft += 1;
  // Sprint-Sprungangriff nach ss_n (G1-4): erster aktiver Frame und zweites Fenster
  for (const ss of [SS_ERSTER_AKTIV, SS_ZWEITER_AKTIV_VON]) {
    const f = figur(welt, 'SPRINTSPRUNG', 'SS', ss + 5, (x) => ((x.ss_n = ss), (x.sprung_angriff = true)));
    aktivPruefen(figurWahl(f, welt, A), 'vela', 'sprint_sprungangriff', `sprint_sprungangriff ss_n ${ss}`);
  }
  geprueft += 1;
  const waffe = figur(welt, 'WAFFE', '', RAKETE_ABSCHUSS, (x) => ((x.waffe = 'RW'), (x.munition = 2)));
  aktivPruefen(figurWahl(waffe, welt, A), 'vela', 'waffe_schuss', 'waffe_schuss');
  geprueft += 1;
  assert.equal(geprueft, 14, '14 Angriffsanimationen von Vela');
});

test('Trefferbild im aktiven Frame: Magnetstoß je Kettenstufe und Eiswelle je Flächenstufe (Zusatzbilder der Figur)', () => {
  const welt = scheibenWelt();
  welt.frame = BEGINN;
  for (let k = 1; k <= 4; k++) {
    const f = figur(welt, 'SCHLAG', String(k) as FigurPhase, KETTE_AKTIV_VON[k - 1] as number, (x) => (x.kombo = k));
    const teile = figurTeile(f, welt, A).filter((t) => t.wahl.animation === `magnetstoss${k}`);
    assert.equal(teile.length, 1, `magnetstoss${k} im ersten aktiven Frame`);
    aktivPruefen((teile[0] as { wahl: Wahl }).wahl, 'objekte', `magnetstoss${k}`, `magnetstoss${k}`);
  }
  SPEZIAL_STUFE_VON.forEach((uhr, i) => {
    const f = figur(welt, 'SPEZIAL', '', uhr);
    const wellen = figurTeile(f, welt, A).filter((t) => t.wahl.animation === 'eiswelle');
    assert.equal(wellen.length, 2, 'Eiswelle vorn und hinten');
    for (const t of wellen) assert.equal(aktivPruefen(t.wahl, 'objekte', 'eiswelle', `eiswelle Stufe ${i + 1}`), i);
    assert.notEqual(wellen[0]?.wahl.spiegeln, wellen[1]?.wahl.spiegeln, 'hinten gespiegelt');
  });
});

/** Gegner in Slot 2 im Angriff zum Frame BEGINN + d. */
function gegner(welt: Welt, typ: GegnerTyp, setze: (g: Gegner) => void): Gegner {
  const g = gegnerBelegen(welt.gegner[2] as Gegner, typ);
  g.x = ausGanz(300);
  g.x_vor = 300;
  setze(g);
  return g;
}

test('Trefferbild im aktiven Frame: Bolzer, Puppe, Rammbock, Zünder und Ballast', () => {
  const welt = scheibenWelt();
  const nah: [GegnerTyp, SpriteBlatt, string, keyof typeof NAH_ANGRIFFE][] = [
    ['Bolzer', 'bolzer', 'schlag_a', 'BA'],
    ['Bolzer', 'bolzer', 'schlag_b', 'BB'],
    ['Bolzer', 'bolzer', 'schlag_c', 'BC'],
    ['Bolzer', 'bolzer', 'umwerfschlag_a', 'BUA'],
    ['Bolzer', 'bolzer', 'umwerfschlag_b', 'BUB'],
    ['Puppe', 'puppe', 'schlag_a', 'BA'],
    ['Puppe', 'puppe', 'schlag_b', 'BB'],
    ['Puppe', 'puppe', 'schlag_c', 'BC'],
    ['Puppe', 'puppe', 'umwerfschlag_a', 'BUA'],
    ['Puppe', 'puppe', 'umwerfschlag_b', 'BUB'],
    ['Rammbock', 'rammbock', 'schlag_a', 'RA'],
    ['Rammbock', 'rammbock', 'schlag_b', 'RB'],
    ['Rammbock', 'rammbock', 'umwerfschlag', 'RU'],
    ['Rammbock', 'rammbock', 'sprungtritt', 'RS'],
  ];
  for (const [typ, blatt, name, code] of nah) {
    const w = NAH_ANGRIFFE[code];
    welt.frame = BEGINN + w.aktiv_von;
    const g = gegner(welt, typ, (x) => {
      x.modus = 'ANGRIFF';
      x.aktion = code === 'RS' ? 'SPRUNG' : 'ANGRIFF';
      x.angriff_code = code;
      x.angriff_a = BEGINN;
      x.modus_uhr = w.aktiv_von + 1;
      if (code === 'RS') x.h = ausGanz(20);
    });
    aktivPruefen(gegnerWahl(g, welt, A), blatt, name, `${typ} ${code} A+${w.aktiv_von}`);
  }
  // Zünder: Schuss, Rakete erscheint in A+6 (ZR_RAKETE_AB); Kolbenhieb wie BA
  welt.frame = BEGINN + ZR_RAKETE_AB;
  const z = gegner(welt, 'Zünder', (x) => ((x.modus = 'SCHUSS'), (x.aktion = 'SCHUSS'), (x.angriff_a = BEGINN)));
  aktivPruefen(gegnerWahl(z, welt, A), 'zuender', 'schuss', 'Zünder Schuss');
  welt.frame = BEGINN + NAH_ANGRIFFE.BA.aktiv_von;
  const zk = gegner(welt, 'Zünder', (x) => ((x.modus = 'KOLBENHIEB'), (x.aktion = 'ANGRIFF'), (x.angriff_a = BEGINN), (x.angriff_aktiv_ende = BEGINN + NAH_ANGRIFFE.BA.aktiv_bis)));
  aktivPruefen(gegnerWahl(zk, welt, A), 'zuender', 'kolbenhieb', 'Zünder Kolbenhieb');
  // Ballast: drei Schwünge des Armschwungs, erster Laufframe des Ansturms, Körperpresse ab Bahnframe 51
  for (let k = 1; k <= 3; k++) {
    welt.frame = BEGINN + AS_AKTIV_VON;
    const b = gegner(welt, 'Ballast', (x) => ((x.modus = 'ANGRIFF'), (x.aktion = 'ANGRIFF'), (x.boss.art = 'AS'), (x.schwung = k), (x.boss.schwung_a = BEGINN)));
    assert.equal(aktivPruefen(gegnerWahl(b, welt, A), 'ballast', 'armschwung', `Armschwung ${k}`), 5 * (k - 1) + 2);
  }
  const an = gegner(welt, 'Ballast', (x) => ((x.modus = 'ANGRIFF'), (x.aktion = 'ANGRIFF'), (x.boss.art = 'AN'), (x.boss.lauf_n = 1)));
  aktivPruefen(gegnerWahl(an, welt, A), 'ballast', 'ansturm', 'Ansturm');
  const kp = gegner(welt, 'Ballast', (x) => ((x.modus = 'ANGRIFF'), (x.aktion = 'ANGRIFF'), (x.boss.art = 'KP'), (x.boss.kp_k = KP_AKTIV_VON)));
  aktivPruefen(gegnerWahl(kp, welt, A), 'ballast', 'koerperpresse', 'Körperpresse');
});

test('Trefferbild im aktiven Frame: Explosion der Rakete (Figur, Zünder) aus dem Verlauf der Darstellung', () => {
  for (const [slot, name, uhr] of [
    ['g0', 'explosion', 1],
    ['o20', 'explosion_zuender', ZR_EXPLOSION_VON - ZR_EINSCHLAG + 1],
  ] as const) {
    const welt = scheibenWelt();
    const verlauf = new Verlauf(A);
    verlauf.zuruecksetzen(welt);
    welt.frame = BEGINN;
    const o: Objekt = slot === 'g0' ? (welt.geschosse[0] as Objekt) : (welt.objekte[0] as Objekt);
    objektBelegen(o, 'Rakete');
    o.flugphase = 'EXPLOSION';
    o.besitzer = slot === 'g0' ? 'f' : 's3';
    o.einschlag_x = 250;
    o.einschlag_z = 150;
    o.lebensdauer = RX_DAUER;
    welt.ereignisse = [`EX:${slot}`];
    verlauf.beobachten(welt);
    for (let f = BEGINN + 1; f < BEGINN + uhr; f++) {
      welt.frame = f;
      welt.ereignisse = [];
      verlauf.beobachten(welt);
    }
    const bilder = verlauf.bilder(welt).filter((e) => e.wahl.animation === name);
    assert.equal(bilder.length, 1, `${name} läuft`);
    const e = bilder[0] as { x: number; z: number; wahl: Wahl };
    assert.deepEqual([e.x, e.z], [250, 150], 'Anker am Einschlagpunkt');
    aktivPruefen(e.wahl, 'objekte', name, `${name} Uhr ${uhr}`);
  }
});
