// Tests K2: Trefferreaktion der Gegner nach docs/spezifikation-kampf.md,
// Abschnitt 7 (23 Frames mit Neustart, E3; Umwerfen, Liegen, Aufstehen ohne
// Schutz, E4; Tod und Slotfreigabe; genau 0 LP) und Flugbahnen F1 bis F4b
// (Abschnitt 5.7). Aufbau wie treffer_pruefung.test.ts: Welt nur aus Modulen
// der Stufe 1 und von K2, verkürzter Logikschritt mit den Teilen von K2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AngriffCode, Angriffsinstanz, Gegner, GegnerTyp, Objekt, ObjektTyp, Rolle, Treffer } from '../src/kern/entitaeten.ts';
import { angriffsinstanz, blickZu, gegnerBelegen, istLebend, objektBelegen, slotTabelleNeu, vorframeKopieren } from '../src/kern/entitaeten.ts';
import { ereignisTreffer } from '../src/kern/ereignisse.ts';
import { ausGanz, zuDezimalText } from '../src/kern/festkomma.ts';
import { parseStage } from '../src/kern/stage.ts';
import { standardStart } from '../src/kern/start.ts';
import type { Welt } from '../src/kern/welt.ts';
import { gegnerZufall, zufallNeu } from '../src/kern/zufall.ts';
import {
  BAHNEN,
  bahnSchritt,
  bahnStarten,
  gegnerBegrenzung,
  gegnerGetroffen,
  gegnerGreifen,
  puppeEntscheidung,
  reaktionSchritt,
} from '../src/kern/gegner/reaktion.ts';
import { pruefangriffeSchritt, trefferFolgen, trefferPruefen } from '../src/kern/treffer.ts';
import { KETTE_HINTEN, KETTE_HINTEN_WEG, KETTE_SCHADEN, KETTE_TIEFE, KETTE_VORN, KNIESTOSS_SCHADEN, WURF_SCHADEN } from '../src/kern/werte.ts';

// ---------------------------------------------------------------------------
// Hilfen (wie in treffer_pruefung.test.ts)
// ---------------------------------------------------------------------------

const BUEHNE = parseStage(readFileSync(new URL('../daten/stages/pruefbuehne.txt', import.meta.url), 'utf8'));

/**
 * Welt auf der Prüfbühne wie Kampf 12, Standard (Figur x 100, z 100, Blick
 * rechts, 72 LP, Rang 9 fest, Seed 1), mit Sätzen im Format der Prüfszene
 * (docs/scheibe.md „Formate“): gegner (Puppen), objekt, pruefangriff,
 * pruefstart fest.NAME=WERT.
 */
function welt(zeilen: string): Welt {
  const start = standardStart(1, 'pruefbuehne');
  start.rang = 9;
  start.rang_fest = true;
  const saetze = zeilen
    .split('\n')
    .map((z) => z.trim())
    .filter((z) => z !== '')
    .map((z) => {
      const teile = z.split(/\s+/);
      const felder: Record<string, string> = {};
      for (const t of teile.slice(1)) {
        const [k, v] = t.split('=');
        felder[k as string] = v ?? 'ja';
      }
      return { art: teile[0] as string, f: felder };
    });
  for (const { art, f } of saetze) {
    if (art === 'pruefangriff') {
      start.pruefangriffe.push({ slot: Number(f.slot), von: Number(f.von), bis: Number(f.bis), schaden: Number(f.schaden), umwerfen: f.umwerfen === 'ja' });
    } else if (art === 'pruefstart') {
      for (const [k, v] of Object.entries(f)) if (k.startsWith('fest.')) start.fest[k.slice('fest.'.length)] = v;
    }
  }
  const w: Welt = {
    ...slotTabelleNeu(),
    frame: 0,
    stage: BUEHNE,
    start,
    eingabe: { t: 0, t1: 0, t2: 0, neu: 0 },
    zufall: zufallNeu(start.seed),
    fest: { ...start.fest },
    rang: { rang: 9, zaehler: 0, fest: true },
    kamera: { x: 0, y: 0, modus: 'FREI', fest: true, schuetteln_x: 0, schuetteln_y: 0, pfeil: 0, blende_c: 0, schnitt_ausgefuehrt: false, arena_ab: 0, freigabe_frame: 0, freigabe_x: 0 },
    sperren: [],
    halte: [],
    wellen: { liste: [], ausgeloest: [], vorgemerkt: [], besiegt: [], nur_boss: false },
    rechte: { l: null, r: null, ziel: null },
    rahmen: { leben: 3, punkte: 0, anzeige: null, phase: 'SPIEL', steuerung: 1, boss_t: 0, gameover_frame: 0 },
    lebende: 0,
    treffer: [],
    ereignisse: [],
    vorframe: { lebende: 0, kamera_x: 0, kamera_y: 0, kamera_modus: 'FREI', besiegt: [], figur_x: 100, figur_z: 100 },
    beendet: false,
  };
  w.figur.x = ausGanz(100);
  w.figur.z = ausGanz(100);
  w.figur.blick = 1;
  for (const { art, f } of saetze) {
    if (art === 'gegner') {
      const g = gegnerBelegen(w.gegner[Number(f.slot)] as Gegner, (f.typ ?? 'Puppe') as GegnerTyp);
      g.x = ausGanz(Number(f.x));
      g.z = ausGanz(Number(f.z ?? 100));
      g.lp = Number(f.lp);
      g.lp_max = g.lp;
      g.lp_vor = g.lp;
      g.rolle = (f.rolle ?? 'leicht') as Rolle;
      g.logik = false;
      g.vorplatziert = true;
      g.werte = 'start';
      g.modus = 'PUPPE';
      g.aktion = 'STAND';
      g.blick = blickZu(g, w.figur);
      g.zufall = gegnerZufall(w.zufall);
    } else if (art === 'objekt') {
      const o = objektBelegen(w.objekte[Number(f.slot) - 20] as Objekt, f.typ as ObjektTyp);
      o.id = `o${f.slot}`;
      o.art = (f.art ?? '') as Objekt['art'];
      o.x = ausGanz(Number(f.x));
      o.z = ausGanz(Number(f.z ?? 100));
      o.inhalt = o.typ === 'Behälter' ? 'leer' : '';
    } else if (art !== 'pruefangriff' && art !== 'pruefstart') {
      throw new Error(`unbekannter Satz ${art}`);
    }
  }
  vorframeKopieren(w);
  return w;
}

function gegner(w: Welt, n: number): Gegner {
  return w.gegner[n] as Gegner;
}

/** Stellvertreter der Figur in KS7: wirksam nur in Zustand 1, danach geschützt (Kampf 6.3). */
function figurStandIn(w: Welt, t: Treffer): void {
  const f = w.figur;
  t.lp_vorher = f.lp;
  t.wirkung = f.zustand !== 1 ? 'W' : f.lp - t.schaden < 0 ? 'X' : t.umwerfen ? 'U' : 'R';
  ereignisTreffer(w, t);
  if (t.wirkung !== 'W') {
    f.lp -= t.schaden;
    f.zustand = 3;
  }
}

/** Stellvertreter für Behälter und Boss in KS7. */
function sonstStandIn(w: Welt, t: Treffer): void {
  t.lp_vorher = 0;
  if (t.ziel.startsWith('o')) {
    t.wirkung = 'B';
    const o = w.objekte.find((x) => x.schluessel === t.ziel);
    if (o !== undefined) o.zerbrochen = true;
  } else {
    t.wirkung = 'R';
  }
  ereignisTreffer(w, t);
}

interface Haken {
  /** W1: Eingriffe (Lage, LP) */
  w1?: (w: Welt) => void;
  /** vor KS6 (nach KS3): Instanzen der Figur setzen, Lagen ändern */
  vor?: (w: Welt) => void;
  /** Urheberhandler der Figur für wirksame Treffer */
  figurHat?: (w: Welt, t: Treffer) => void;
}

/** Ein verkürzter Logikschritt (Reihenfolge nach Vertrag, nur die Teile von K2). */
function schritt(w: Welt, h: Haken = {}): void {
  w.frame += 1;
  w.ereignisse = [];
  w.treffer = [];
  vorframeKopieren(w);
  for (const g of w.gegner) if (g.belegt) g.modus_uhr += 1;
  h.w1?.(w);
  for (const g of w.gegner) if (g.belegt && !g.logik) puppeEntscheidung(w, g);
  for (const g of w.gegner) if (g.belegt && g.typ !== 'Ballast') reaktionSchritt(w, g);
  pruefangriffeSchritt(w);
  h.vor?.(w);
  trefferPruefen(w);
  for (const t of w.treffer) {
    if (t.ziel === 'f') figurStandIn(w, t);
    else if (t.ziel.startsWith('s') && gegner(w, Number(t.ziel.slice(1))).typ !== 'Ballast') gegnerGetroffen(w, t);
    else sonstStandIn(w, t);
  }
  for (const t of w.treffer) if (t.wirkung !== 'W' && t.urheber === 'f') h.figurHat?.(w, t);
  trefferFolgen(w);
}

function bis(w: Welt, frame: number, h: Haken = {}, jeFrame?: (w: Welt) => void): void {
  while (w.frame < frame) {
    schritt(w, h);
    jeFrame?.(w);
  }
}

/** Kettenschlag der Figur als Instanz (Kampf 5.2), aktiv. */
function kette(w: Welt, stufe: number): Angriffsinstanz {
  const i = stufe - 1;
  const inst = angriffsinstanz({
    code: `KT${stufe}` as AngriffCode,
    angreifer: 'f',
    flaeche: {
      art: 'abstand',
      vorn: KETTE_VORN[i] as number,
      hinten: KETTE_HINTEN[i] as number,
      hinten_weg: KETTE_HINTEN_WEG[i] as number,
      tiefe: KETTE_TIEFE,
      hoehe_angreifer_max: 0,
      hoehe_ziel_max: null,
    },
    schaden: KETTE_SCHADEN[i] as number,
    umwerfen: stufe === 4,
    trefferstopp: true,
    gegen: 'gegner',
    beginn: w.frame,
  });
  inst.aktiv = true;
  return inst;
}

/** Instanz gegen den gehaltenen Gegner s0 (Kniestoß KN, Wurf WU; Kampf 5.2, 8). */
function gehalten(w: Welt, code: 'KN' | 'WU', umwerfen: boolean): Angriffsinstanz {
  const inst = angriffsinstanz({
    code,
    angreifer: 'f',
    flaeche: { art: 'gehalten' },
    schaden: code === 'WU' ? WURF_SCHADEN : KNIESTOSS_SCHADEN,
    umwerfen,
    bahn: code === 'WU' ? 'F3' : umwerfen ? 'F2' : '',
    trefferstopp: false,
    ziel: 's0',
    gegen: 'gegner',
    beginn: w.frame,
  });
  inst.aktiv = true;
  return inst;
}

/** Figur schlägt in den genannten Frames mit der genannten Kettenstufe (nur dieser Frame aktiv). */
function schlaege(plan: Record<number, number>): Haken {
  return {
    vor: (u) => {
      const stufe = plan[u.frame];
      u.figur.angriff = stufe === undefined ? null : kette(u, stufe);
    },
  };
}

function x(g: Gegner): string {
  return zuDezimalText(g.x);
}

function h(g: Gegner): string {
  return zuDezimalText(g.h);
}

// ---------------------------------------------------------------------------
// Trefferreaktion ohne Umwerfen
// ---------------------------------------------------------------------------

test('reaktion: 23 Frames ohne Rückstoß, Neustart bei erneutem Treffer (Kampf 7, E3; wie Kampf 12 T17)', () => {
  const w = welt('gegner slot=0 typ=Puppe rolle=schwer x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  bis(w, 60, schlaege({ 12: 1, 27: 2 }), (u) => {
    const f = u.frame;
    assert.equal(x(g), '146', `Frame ${f}: Welt-x bleibt`);
    if (f === 12) assert.deepEqual([g.lp, u.ereignisse], [27, ['T:F>s0:KT1:3:R']]);
    if (f === 27) assert.equal(g.lp, 23);
    if (f >= 12 && f <= 49) {
      assert.equal(g.zustand, 3, `Frame ${f}`);
      assert.deepEqual([g.modus, g.aktion], ['GETROFFEN', 'GETROFFEN']);
    }
    if (f === 50) assert.deepEqual([g.zustand, g.modus, g.aktion], [1, 'FREI', 'STAND']);
    if (f === 51) assert.equal(g.modus, 'PUPPE');
    if (f < 12) assert.equal(g.zustand, 1);
  });
  assert.equal(g.reaktion_h, 27);
});

test('reaktion: genau 0 LP lebt weiter und reagiert normal; der nächste Treffer tötet (Kampf 7, K6)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=3\n');
  const g = gegner(w, 0);
  bis(w, 12, schlaege({ 12: 1 }));
  assert.deepEqual([g.lp, g.modus, g.zustand], [0, 'GETROFFEN', 3]);
  assert.deepEqual(w.ereignisse, ['T:F>s0:KT1:3:R']);
  assert.equal(istLebend(g), true);
  bis(w, 40, schlaege({ 40: 1 }));
  assert.deepEqual([g.lp, g.modus], [-3, 'TOT']);
  assert.deepEqual(w.ereignisse, ['T:F>s0:KT1:3:X']);
  assert.equal(istLebend(g), false);
  // genau 0 LP durch einen umwerfenden Treffer: umgeworfen, nicht tot
  const v = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=10\n');
  bis(v, 12, schlaege({ 12: 4 }));
  assert.deepEqual([gegner(v, 0).lp, gegner(v, 0).modus], [0, 'UMGEWORFEN']);
});

// ---------------------------------------------------------------------------
// Umwerfen, Liegen, Aufstehen
// ---------------------------------------------------------------------------

test('reaktion: Umwerfen mit F1, Ruhe W+55 bei 135,125, Liegen 32, Aufstehen 18, G = W+105 sofort verwundbar (Kampf 5.7, 7, E4; wie T18)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  const plan = schlaege({ 12: 1, 27: 2, 42: 3, 56: 4 });
  let spaet: Angriffsinstanz | null = null;
  const haken: Haken = {
    w1: (u) => {
      if (u.frame === 150) u.figur.x = ausGanz(231);
    },
    vor: (u) => {
      if (u.frame < 160) plan.vor?.(u);
      else {
        if (u.frame === 160) spaet = kette(u, 1);
        if (spaet !== null) spaet.aktiv = u.frame <= 163;
        u.figur.angriff = spaet;
      }
    },
  };
  bis(w, 170, haken, (u) => {
    const f = u.frame;
    if (f === 56) {
      assert.deepEqual([g.lp, g.aktion, g.modus, g.zustand], [8, 'UMGEWORFEN', 'UMGEWORFEN', 3]);
      assert.deepEqual(u.ereignisse, ['T:F>s0:KT4:10:U']);
    }
    if (f >= 57 && f <= 160) assert.equal(g.zustand, 2, `Frame ${f}`);
    if (f >= 56 && f <= 64) assert.deepEqual([x(g), h(g)], ['146', '0'], `Frame ${f}: Stillstand`);
    if (f === 65) assert.deepEqual([x(g), h(g)], ['148.875', '5']);
    if (f === 83) assert.equal(h(g), '48.2421875'); // Scheitel W+27
    if (f === 101) assert.ok(g.h > 0);
    if (f === 102) assert.deepEqual([x(g), h(g)], ['255.25', '0']); // Bodenkontakt W+46
    if (f === 110) assert.deepEqual([x(g), g.aktion], ['278.25', 'UMGEWORFEN']);
    if (f === 111) assert.deepEqual([x(g), h(g), g.aktion, g.modus], ['281.125', '0', 'LIEGEN', 'LIEGEN']);
    if (f > 111) assert.equal(x(g), '281.125');
    if (f === 142) assert.equal(g.aktion, 'LIEGEN');
    if (f === 143) assert.equal(g.aktion, 'AUFSTEHEN');
    if (f === 160) assert.deepEqual([g.zustand, g.lp, u.treffer.length], [2, 8, 0]); // Schlag aktiv, kein Treffer
    if (f === 161) {
      assert.deepEqual([g.zustand, g.lp], [3, 5]); // G = W+105: frei und im selben Frame getroffen
      assert.deepEqual(u.ereignisse, ['T:F>s0:KT1:3:R']);
    }
  });
  assert.equal(g.liegedauer, 32);
});

test('reaktion: Puppe schwer mit 30 LP nach voller Kette 8 LP und umgeworfen, Liegedauer 16 bis 44 aus ihrem Zufall (Kampf 7, P18; wie T5 e)', () => {
  for (const fest of ['', 'pruefstart fest.liegedauer=20\n']) {
    const w = welt(`gegner slot=0 typ=Puppe rolle=schwer x=146 z=100 lp=30\n${fest}`);
    const g = gegner(w, 0);
    const haken = schlaege({ 12: 1, 27: 2, 42: 3, 56: 4 });
    haken.w1 = (u) => {
      if (u.frame === 43) gegner(u, 0).x = ausGanz(200);
    };
    let ziehungen = 0;
    let ruhe = 0;
    bis(w, 200, haken, (u) => {
      const f = u.frame;
      if (f === 42) assert.equal(g.lp, 18);
      if (f === 55) ziehungen = g.zufall.ziehungen;
      if (f === 56) assert.deepEqual([g.lp, g.aktion], [8, 'UMGEWORFEN']);
      if (f >= 43 && f <= 64) assert.equal(x(g), '200', `Frame ${f}`);
      if (f === 65) assert.equal(x(g), '202.875');
      if (f === 111) {
        ruhe = f;
        assert.deepEqual([x(g), g.aktion], ['335.125', 'LIEGEN']);
        assert.equal(g.zufall.ziehungen, ziehungen + 1, 'genau eine Ziehung bei der Ruhe');
      }
      if (ruhe > 0 && f === ruhe + g.liegedauer) assert.equal(g.aktion, 'AUFSTEHEN');
      if (ruhe > 0 && f === ruhe + g.liegedauer + 17) assert.equal(g.zustand, 2);
      if (ruhe > 0 && f === ruhe + g.liegedauer + 18) assert.deepEqual([g.zustand, g.modus], [1, 'FREI']);
    });
    assert.ok(g.liegedauer >= 16 && g.liegedauer <= 44 && g.liegedauer % 4 === 0, `Liegedauer ${g.liegedauer}`);
    if (fest !== '') assert.equal(g.liegedauer, 20);
  }
});

test('reaktion: dritter Kniestoß mit F2 aus 16 px Höhe, Ruhe W+58, G = W+108 (Kampf 5.7, 7; wie T16)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=140 z=100 lp=30\n');
  w.figur.x = ausGanz(121);
  const g = gegner(w, 0);
  gegnerGreifen(w, g, 'f');
  const plan: Record<number, boolean> = { 28: false, 46: false, 64: true };
  bis(w, 180, {
    vor: (u) => {
      const um = plan[u.frame];
      u.figur.angriff = um === undefined ? null : gehalten(u, 'KN', um);
    },
  }, (u) => {
    const f = u.frame;
    if (f === 28) assert.deepEqual([g.lp, g.modus, g.zustand, u.ereignisse], [26, 'GEHALTEN', 2, ['T:F>s0:KN:4:R']]);
    if (f === 46) assert.equal(g.lp, 22);
    if (f === 64) assert.deepEqual([g.lp, g.aktion, u.ereignisse], [18, 'UMGEWORFEN', ['T:F>s0:KN:4:U']]);
    if (f >= 65 && f <= 72) assert.deepEqual([x(g), h(g)], ['140', '16'], `Frame ${f}`);
    if (f === 73) assert.deepEqual([x(g), h(g)], ['142.875', '21']);
    if (f === 113) assert.deepEqual([x(g), h(g)], ['257.875', '0']); // W+49
    if (f === 122) assert.deepEqual([x(g), g.aktion], ['283.75', 'LIEGEN']); // W+58
    if (f === 171) assert.equal(g.zustand, 2);
    if (f === 172) assert.equal(g.zustand, 1); // G = W+108
  });
  assert.equal(g.gehalten_von, null);
});

test('reaktion: Wurf mit F3 vorwärts und rückwärts, Liegen 16, G = W+104 (Kampf 5.7, 8.4; wie T6)', () => {
  const faelle = [
    { fx: 121, blick: 1, gx: 140, richtung: 'V', los: '134', boden: '277.375', ruhe: '305.5' },
    { fx: 279, blick: -1, gx: 260, richtung: 'V', los: '266', boden: '122.625', ruhe: '94.5' },
    { fx: 300, blick: 1, gx: 319, richtung: 'R', los: '287', boden: '143.625', ruhe: '115.5' },
  ] as const;
  for (const c of faelle) {
    const w = welt(`gegner slot=0 typ=Puppe x=${c.gx} z=100 lp=16\n`);
    w.figur.x = ausGanz(c.fx);
    w.figur.blick = c.blick;
    const g = gegner(w, 0);
    gegnerGreifen(w, g, 'f');
    bis(w, 140, {
      vor: (u) => {
        if (u.frame === 28) {
          u.figur.wurf_ziel = 's0';
          u.figur.wurf_richtung = c.richtung;
        }
        u.figur.angriff = u.frame === 28 ? gehalten(u, 'WU', true) : null;
      },
    }, (u) => {
      const f = u.frame;
      if (f === 28) assert.deepEqual([g.lp, g.zustand, u.ereignisse], [2, 2, ['T:F>s0:WU:14:U']]);
      if (f >= 29 && f <= 48) assert.deepEqual([x(g), h(g)], [String(c.gx), '0'], `Frame ${f}: getragen`);
      if (f === 49) assert.deepEqual([x(g), h(g)], [c.los, '59']); // E+22
      if (f === 86) assert.deepEqual([x(g), h(g)], [c.boden, '0']); // E+59
      if (f === 98) assert.deepEqual([x(g), g.aktion], [c.ruhe, 'LIEGEN']); // E+71
      if (f === 114) assert.equal(g.aktion, 'AUFSTEHEN');
      if (f === 131) assert.equal(g.zustand, 2);
      if (f === 132) assert.equal(g.zustand, 1); // G = W+104
    });
    assert.equal(g.liegedauer, 16);
  }
});

// ---------------------------------------------------------------------------
// Tod
// ---------------------------------------------------------------------------

test('reaktion: Tod mit F4, Bodenkontakt t+40, Ruhe t+49, Slot frei nach 79 Frames (Kampf 7; wie T3)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=16\n');
  const g = gegner(w, 0);
  bis(w, 140, schlaege({ 12: 1, 27: 2, 42: 3, 56: 4 }), (u) => {
    const f = u.frame;
    if (f === 56) {
      assert.deepEqual([g.lp, g.aktion, g.modus], [-6, 'TOT', 'TOT']);
      assert.deepEqual(u.ereignisse, ['T:F>s0:KT4:10:X']);
      assert.equal(u.treffer[0]?.lp_vorher, 4);
    }
    if (f === 57) assert.deepEqual([g.zustand, g.aktion, x(g)], [2, 'TOT', '146']);
    if (f === 58) assert.equal(x(g), '146');
    if (f === 59) assert.equal(x(g), '148.875');
    if (f === 96) assert.deepEqual([x(g), h(g)], ['255.25', '0']);
    if (f === 105) assert.equal(x(g), '281.125');
    if (f === 134) assert.deepEqual([g.belegt, x(g)], [true, '281.125']);
    if (f === 135) {
      assert.deepEqual([g.belegt, g.zustand], [false, 0]);
      assert.deepEqual(u.ereignisse, ['FR:s0']);
    }
  });
});

test('reaktion: Tod durch Stufe 2 rollt (F4b), frei nach 111; Tod durch Wurf mit F3, frei nach 101 (Kampf 5.7, 7)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=2\n');
  const g = gegner(w, 0);
  bis(w, 130, schlaege({ 12: 2 }), (u) => {
    const f = u.frame;
    if (f === 14) assert.equal(x(g), '146');
    if (f === 15) assert.equal(x(g), '148.875');
    if (f === 52) assert.deepEqual([x(g), h(g)], ['255.25', '0']);
    if (f === 53) assert.equal(x(g), '257.25');
    if (f === 84) assert.equal(x(g), '319.25');
    if (f === 85) assert.equal(x(g), '319.25');
    if (f === 122) assert.equal(g.belegt, true);
    if (f === 123) assert.deepEqual([g.belegt, u.ereignisse], [false, ['FR:s0']]);
  });
  const v = welt('gegner slot=0 typ=Puppe x=140 z=100 lp=10\n');
  v.figur.x = ausGanz(121);
  const s0 = gegner(v, 0);
  gegnerGreifen(v, s0, 'f');
  bis(v, 130, { vor: (u) => { u.figur.angriff = u.frame === 28 ? gehalten(u, 'WU', true) : null; } }, (u) => {
    const f = u.frame;
    if (f === 28) assert.deepEqual([s0.lp, s0.modus, u.ereignisse], [-4, 'TOT', ['T:F>s0:WU:14:X']]);
    if (f === 49) assert.deepEqual([x(s0), h(s0)], ['134', '59']);
    if (f === 98) assert.equal(x(s0), '305.5');
    if (f === 128) assert.equal(s0.belegt, true);
    if (f === 129) assert.equal(s0.belegt, false); // t+101
  });
});

test('reaktion: Tod ohne Treffer (Eingriff LP < 0) fliegt von der Figur weg (Kampf 7, Welt 7.6)', () => {
  for (const [gx, nach] of [[146, '148.875'], [50, '47.125']] as const) {
    const w = welt(`gegner slot=0 typ=Puppe x=${gx} z=100 lp=16\n`);
    const g = gegner(w, 0);
    bis(w, 90, { w1: (u) => { if (u.frame === 5) gegner(u, 0).lp = -1; } }, (u) => {
      const f = u.frame;
      if (f === 5) assert.deepEqual([g.modus, g.tod_t, g.zustand], ['TOT', 5, 3]);
      if (f === 6) assert.equal(g.zustand, 2);
      if (f === 8) assert.equal(x(g), nach);
      if (f === 83) assert.equal(g.belegt, true);
      if (f === 84) assert.deepEqual([g.belegt, u.ereignisse], [false, ['FR:s0']]);
    });
  }
});

// ---------------------------------------------------------------------------
// Rechte, Bahnen
// ---------------------------------------------------------------------------

test('reaktion: Recht in GETROFFEN behalten, beim Umwerfen abgeben; Zielrecht frei in jeder Reaktion (Welt 5.7 E-4, Welt 6)', () => {
  const w = welt('gegner slot=1 typ=Puppe x=146 z=100 lp=30\n');
  const g = gegner(w, 1);
  w.rechte.r = 1;
  w.rechte.ziel = 1;
  g.recht = 'R';
  g.zielrecht = true;
  bis(w, 12, schlaege({ 12: 1 }));
  assert.deepEqual([w.rechte.r, g.recht, w.rechte.ziel, g.zielrecht], [1, 'R', null, false]);
  assert.deepEqual(w.ereignisse, ['T:F>s1:KT1:3:R']);
  bis(w, 20, schlaege({ 20: 4 }));
  assert.deepEqual([w.rechte.r, g.recht], [null, '']);
  assert.deepEqual(w.ereignisse, ['T:F>s1:KT4:10:U', 'RA:s1']);
});

test('reaktion: Bahn aus der Luft ruht 9 Frames nach dem Bodenkontakt; Kanten und Behälter halten x auf (Kampf 5.7, P15, Welt 2.2)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  // aus 20 px Höhe: Stillstand dort, Bodenkontakt später als W+46, Ruhe 9 Frames danach
  g.h = ausGanz(20);
  bahnStarten(g, 'F1', 1);
  let boden = 0;
  let ruhe = 0;
  for (let k = 1; k <= 80 && ruhe === 0; k++) {
    const lage = bahnSchritt(g, k, null);
    if (k <= BAHNEN.F1.stillstand) assert.deepEqual([lage, h(g)], ['stillstand', '20']);
    if (lage === 'boden') boden = k;
    if (lage === 'ruhe') ruhe = k;
  }
  assert.ok(boden > 46, `Bodenkontakt ${boden}`);
  assert.equal(ruhe, boden + 9);
  assert.equal(g.x, ausGanz(146) + (ruhe - BAHNEN.F1.stillstand) * BAHNEN.F1.vx);
  // Kante der Prüfbühne (Band bis x 4000): Stopp bei 3999
  g.x = ausGanz(3990);
  g.h = 0;
  bahnStarten(g, 'F1', 1);
  for (let k = 1; k <= 60; k++) bahnSchritt(g, k, gegnerBegrenzung(w, g));
  assert.equal(x(g), '3999');
  // geworfener Gegner bleibt höchstens 96 px außerhalb des Bildes (Bühne mit Rändern)
  w.stage = { ...w.stage, raender: true };
  g.x = ausGanz(400);
  bahnStarten(g, 'F3', 1);
  for (let k = 1; k <= 80; k++) bahnSchritt(g, k, gegnerBegrenzung(w, g));
  assert.equal(x(g), '479');
  // unzerbrochenes Fass hält die Bahn am Boden auf (Welt 2.2 Punkt 6)
  const v = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=30\nobjekt slot=20 typ=Behälter art=Fass x=270 z=100\n');
  const s0 = gegner(v, 0);
  bis(v, 70, schlaege({ 12: 4 }), (u) => {
    if (u.frame === 58) assert.deepEqual([x(s0), h(s0)], ['255.25', '0']); // W+46 vor dem Fass
    if (u.frame === 59) assert.equal(x(s0), '257'); // Kante x 258 des Fasses
  });
  assert.deepEqual([x(s0), s0.aktion], ['257', 'LIEGEN']); // Ruhe W+55 = 67 am Fass
});
