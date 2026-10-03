// Tests K2: Trefferprüfung nach docs/spezifikation-kampf.md, Abschnitt 5
// (Flächen, Reihenfolge, ein Treffer je Ziel, Trefferstopp-Auskunft,
// Gegnerangriffe und Geschosse, Behälter) und Prüfangriffe (11.2).
//
// Die Welt entsteht hier nur aus Modulen der Stufe 1 (entitaeten, stage,
// start, zufall) und den Modulen von K2; die Frames laufen über einen kleinen
// eigenen Schritt mit den Teilen des Logikschritts, die K2 betreffen (Puppe in
// W4, KS3 Reaktion und Prüfangriffe, KS6, KS7 mit einfachen Stellvertretern
// für Figur, Boss und Behälter). So hängen diese Tests nicht vom Stand von
// Figur, Nahkämpfern, Wellen und Boss ab. Der volle Prüflauf mit Prüfszene
// steht in treffer_lauf.test.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AngriffCode, Angriffsinstanz, Flaeche, Gegner, GegnerTyp, Objekt, ObjektTyp, Rolle, Treffer } from '../src/kern/entitaeten.ts';
import { angriffsinstanz, blickZu, gegnerBelegen, objektBelegen, slotTabelleNeu, vorframeKopieren } from '../src/kern/entitaeten.ts';
import { ereignisTreffer } from '../src/kern/ereignisse.ts';
import { ausGanz } from '../src/kern/festkomma.ts';
import { parseStage } from '../src/kern/stage.ts';
import { standardStart } from '../src/kern/start.ts';
import type { Welt } from '../src/kern/welt.ts';
import { gegnerZufall, zufallNeu } from '../src/kern/zufall.ts';
import { gegnerGetroffen, puppeEntscheidung, reaktionSchritt, umwerfenBeginnen } from '../src/kern/gegner/reaktion.ts';
import {
  behaelterTreffbar,
  ersterWirksamerTreffer,
  inFlaeche,
  instanzHatGetroffen,
  pruefangriffeSchritt,
  treffbar,
  trefferFolgen,
  trefferPruefen,
} from '../src/kern/treffer.ts';
import {
  KETTE_HINTEN,
  KETTE_HINTEN_WEG,
  KETTE_SCHADEN,
  KETTE_TIEFE,
  KETTE_VORN,
  RX_HINTEN,
  RX_SCHADEN,
  RX_TIEFE,
  RX_VORN,
  SEED_KAMPF_TESTS,
  SPRINT_SPRUNGANGRIFF,
  TREFFERSTOPP,
  WG_HALBBREITE,
  WG_SCHADEN,
  WG_TIEFE,
  ZR_BLICK_VERSATZ,
  ZR_EXPLOSION_H,
  ZR_EXPLOSION_HOEHE_MAX,
  ZR_EXPLOSION_TIEFE,
} from '../src/kern/werte.ts';

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------

const BUEHNE = parseStage(readFileSync(new URL('../daten/stages/pruefbuehne.txt', import.meta.url), 'utf8'));

/**
 * Welt auf der Prüfbühne wie Kampf 12, Standard (Figur x 100, z 100, Blick
 * rechts, 72 LP, Rang 9 fest, Seed 1), mit Sätzen im Format der Prüfszene
 * (docs/scheibe.md „Formate“): gegner (Puppen), objekt, pruefangriff,
 * pruefstart fest.NAME=WERT.
 */
function welt(zeilen: string): Welt {
  const start = standardStart(SEED_KAMPF_TESTS, 'pruefbuehne');
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
    kamera: { x: 0, y: 0, modus: 'FREI', fest: true, schuetteln_x: 0, schuetteln_y: 0, schuetteln_art: '', schuetteln_ab: 0, pfeil: 0, blende_c: 0, schnitt_ausgefuehrt: false, arena_ab: 0, freigabe_frame: 0, freigabe_x: 0 },
    sperren: [],
    halte: [],
    wellen: { liste: [], ausgeloest: [], vorgemerkt: [], besiegt: [], nur_boss: false },
    rechte: { l: null, r: null, ziel: null },
    rahmen: { leben: 3, punkte: 0, anzeige: null, anzeige_typ: '', anzeige_lp: 0, anzeige_lebt: false, phase: 'SPIEL', steuerung: 1, boss_t: 0, gameover_frame: 0 },
    lebende: 0,
    treffer: [],
    ereignisse: [],
    pruefangriffe_beendet: start.pruefangriffe.map(() => false),
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

/** Gegnerangriff gegen die Figur mit beliebiger Fläche, aktiv. */
function gegnerAngriff(w: Welt, n: number, flaeche: Flaeche, schaden = 5, code: AngriffCode = 'BA'): Angriffsinstanz {
  const inst = angriffsinstanz({
    code,
    angreifer: `s${n}`,
    flaeche,
    schaden,
    umwerfen: false,
    trefferstopp: true,
    einmal: true,
    gegen: 'figur',
    beginn: w.frame,
  });
  inst.aktiv = true;
  return inst;
}

function trifft(w: Welt, inst: Angriffsinstanz, n: number): boolean {
  const ziel = n < 0 ? w.figur : gegner(w, n);
  const angreifer = inst.angreifer === 'f' ? w.figur : (w.gegner[Number(inst.angreifer.slice(1))] as Gegner);
  return inFlaeche(w, inst, angreifer, ziel);
}

function setzeX(e: { x: number }, x: number): void {
  e.x = ausGanz(x);
}

// ---------------------------------------------------------------------------
// 5.1, 5.2: Reichweiten
// ---------------------------------------------------------------------------

test('treffer: Reichweite der Kette vorn 85/86, 87/88, 91/92, 100/101 px, beide Blickrichtungen (Kampf 5.2, E14)', () => {
  const w = welt('gegner slot=0 typ=Puppe rolle=schwer x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  const grenzen = [85, 87, 91, 100];
  for (let stufe = 1; stufe <= 4; stufe++) {
    const vorn = grenzen[stufe - 1] as number;
    const inst = kette(w, stufe);
    w.figur.blick = 1;
    setzeX(w.figur, 100);
    setzeX(g, 100 + vorn);
    assert.equal(trifft(w, inst, 0), true, `Stufe ${stufe} bei ${vorn} px`);
    setzeX(g, 100 + vorn + 1);
    assert.equal(trifft(w, inst, 0), false, `Stufe ${stufe} bei ${vorn + 1} px`);
    // Blick links: dieselben Werte (E14, nicht K9)
    w.figur.blick = -1;
    setzeX(g, 100 - vorn);
    assert.equal(trifft(w, inst, 0), true, `Stufe ${stufe} links bei ${vorn} px`);
    setzeX(g, 100 - vorn - 1);
    assert.equal(trifft(w, inst, 0), false, `Stufe ${stufe} links bei ${vorn + 1} px`);
    // Nachkommaanteil zählt nicht (⌊x⌋, Kampf 2.3)
    w.figur.blick = 1;
    g.x = ausGanz(100 + vorn) + ausGanz(1) - 1;
    assert.equal(trifft(w, inst, 0), true, `Stufe ${stufe} bei ${vorn},99… px`);
  }
});

test('treffer: Tiefe 11 und 12 trifft, 13 nicht, alle Stufen (Kampf 5.2, E9)', () => {
  const w = welt('gegner slot=0 typ=Puppe rolle=schwer x=185 z=100 lp=30\n');
  const g = gegner(w, 0);
  for (let stufe = 1; stufe <= 4; stufe++) {
    const inst = kette(w, stufe);
    for (const [dz, erwartet] of [[11, true], [12, true], [13, false], [-12, true], [-13, false]] as const) {
      g.z = ausGanz(100 + dz);
      assert.equal(trifft(w, inst, 0), erwartet, `Stufe ${stufe}, dz ${dz}`);
    }
  }
  // Ablauf wie Kampf 12, T5 a bis d: KT1 aus x 100 gegen eine Puppe bei x 185 bzw. 186
  for (const [x, z, lp] of [[185, 111, 27], [186, 100, 30], [185, 113, 30], [185, 112, 27]] as const) {
    const v = welt(`gegner slot=0 typ=Puppe rolle=schwer x=${x} z=${z} lp=30\n`);
    bis(v, 12, { vor: (u) => { u.figur.angriff = u.frame === 12 ? kette(u, 1) : null; } });
    assert.equal(gegner(v, 0).lp, lp, `x ${x}, z ${z}`);
  }
});

test('treffer: hinter der Figur 28/26/26/25 px, schaut das Ziel weg 4/2/2/1 px (Kampf 5.2, K8)', () => {
  const w = welt('gegner slot=0 typ=Puppe rolle=schwer x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  for (let stufe = 1; stufe <= 4; stufe++) {
    const inst = kette(w, stufe);
    const zu = KETTE_HINTEN[stufe - 1] as number;
    const weg = KETTE_HINTEN_WEG[stufe - 1] as number;
    g.blick = 1; // schaut zur Figur (sie steht rechts von ihm)
    setzeX(g, 100 - zu);
    assert.equal(trifft(w, inst, 0), true);
    setzeX(g, 100 - zu - 1);
    assert.equal(trifft(w, inst, 0), false);
    g.blick = -1; // schaut weg
    setzeX(g, 100 - weg);
    assert.equal(trifft(w, inst, 0), true);
    setzeX(g, 100 - weg - 1);
    assert.equal(trifft(w, inst, 0), false);
    setzeX(g, 100); // kein Mindestabstand
    assert.equal(trifft(w, inst, 0), true);
  }
});

test('treffer: Sprint-Sprungangriff erst ab 38 px vor der Figur bis 147 px, Höhe der Figur (Kampf 5.2, 9.3)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  const inst = angriffsinstanz({
    code: 'SS',
    angreifer: 'f',
    flaeche: { art: 'abstand', vorn: SPRINT_SPRUNGANGRIFF.vorn, hinten: SPRINT_SPRUNGANGRIFF.hinten, hinten_weg: null, tiefe: SPRINT_SPRUNGANGRIFF.tiefe, hoehe_angreifer_max: 20, hoehe_ziel_max: null },
    schaden: SPRINT_SPRUNGANGRIFF.schaden,
    umwerfen: true,
    trefferstopp: false,
    gegen: 'gegner',
    beginn: 1,
  });
  for (const [d, erwartet] of [[37, false], [38, true], [147, true], [148, false], [0, false]] as const) {
    setzeX(g, 100 + d);
    assert.equal(trifft(w, inst, 0), erwartet, `d_vorn ${d}`);
  }
  setzeX(g, 140);
  w.figur.h = ausGanz(20);
  assert.equal(trifft(w, inst, 0), true);
  w.figur.h = ausGanz(21);
  assert.equal(trifft(w, inst, 0), false);
});

// ---------------------------------------------------------------------------
// 5.3, 5.5: mehrere Ziele, Trefferstopp einmal je Frame
// ---------------------------------------------------------------------------

test('treffer: zwei Gegner im selben Frame, Trefferstopp einmal 7 Frames (Kampf 5.3, 5.5)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=16\ngegner slot=1 typ=Puppe x=170 z=106 lp=16\n');
  // Mini-Figur nach Kampf 4.1 und 5.3: Schlag Stufe 1 ab P+1 = 11, aktiv uhr 2 bis 5,
  // Stoppframes halten die Aktionsuhr an.
  const f = w.figur;
  let inst: Angriffsinstanz | null = null;
  let uhr = 0;
  let stoppGesetzt = 0;
  const stoppVerlauf: number[] = [];
  const uhrVerlauf: number[] = [];
  const haken: Haken = {
    vor: (u) => {
      let stoppframe = false;
      if (u.frame === 11) {
        inst = kette(u, 1);
        uhr = 1;
      } else if (f.stopp > 0) {
        f.stopp -= 1;
        stoppframe = true;
      } else {
        uhr += 1;
      }
      if (inst !== null) inst.aktiv = !stoppframe && uhr >= 2 && uhr <= 5;
      f.angriff = inst;
    },
    figurHat: (u, t) => {
      if (ersterWirksamerTreffer(u, t)) {
        f.stopp = TREFFERSTOPP;
        stoppGesetzt += 1;
      }
      assert.equal(instanzHatGetroffen(u, t.instanz), true);
    },
  };
  bis(w, 24, haken, (u) => {
    stoppVerlauf.push(f.stopp);
    uhrVerlauf.push(uhr);
    if (u.frame === 12) {
      assert.deepEqual(u.treffer.map((t) => [t.ziel, t.code, t.schaden, t.wirkung]), [['s0', 'KT1', 3, 'R'], ['s1', 'KT1', 3, 'R']]);
      assert.equal(ersterWirksamerTreffer(u, u.treffer[0] as Treffer), true);
      assert.equal(ersterWirksamerTreffer(u, u.treffer[1] as Treffer), false);
      assert.deepEqual(u.ereignisse, ['T:F>s0:KT1:3:R', 'T:F>s1:KT1:3:R']);
    } else {
      assert.equal(u.treffer.length, 0, `Frame ${u.frame}: jedes Ziel nur einmal je Instanz`);
    }
  });
  assert.equal(stoppGesetzt, 1);
  // Frame 12: stopp 7; 13 bis 19: 6 bis 0 bei uhr 2; 20: uhr 3 (Kampf 12, T3)
  assert.deepEqual(stoppVerlauf.slice(11, 20), [7, 6, 5, 4, 3, 2, 1, 0, 0]);
  assert.deepEqual(uhrVerlauf.slice(11, 20), [2, 2, 2, 2, 2, 2, 2, 2, 3]);
  assert.deepEqual([gegner(w, 0).lp, gegner(w, 1).lp], [13, 13]);
  assert.deepEqual([gegner(w, 0).zustand, gegner(w, 1).zustand], [3, 3]);
});

test('treffer: nicht treffbares Ziel bleibt für spätere aktive Frames offen; Gegner in Reaktion treffbar (Kampf 5.5)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=30\n');
  const g = gegner(w, 0);
  bis(w, 9);
  g.zustand = 2;
  const inst = kette(w, 1);
  bis(w, 10, { vor: (u) => { u.figur.angriff = inst; } });
  assert.equal(w.treffer.length, 0);
  assert.deepEqual(inst.getroffen, []);
  g.zustand = 1;
  bis(w, 11, { vor: (u) => { u.figur.angriff = inst; } });
  assert.deepEqual(inst.getroffen, ['s0']);
  assert.equal(g.zustand, 3);
  assert.equal(treffbar(w, g), true); // Reaktion: treffbar
  const zweite = kette(w, 2);
  bis(w, 12, { vor: (u) => { u.figur.angriff = zweite; } });
  assert.equal(g.lp, 30 - 3 - 4);
  // aktives Fenster (Welt 4.1): ⌊x⌋ − K ≤ 447
  setzeX(g, 447);
  assert.equal(treffbar(w, g), true);
  setzeX(g, 448);
  assert.equal(treffbar(w, g), false);
  setzeX(g, -64);
  assert.equal(treffbar(w, g), true);
  setzeX(g, -65);
  assert.equal(treffbar(w, g), false);
});

// ---------------------------------------------------------------------------
// 5.4: Reihenfolge im Frame
// ---------------------------------------------------------------------------

test('treffer: gleichzeitiger Treffer gewinnt die Figur, einen Frame früher der Gegner (Kampf 5.4, K12)', () => {
  // wie Kampf 12, T8 c und d: Puppe s0 x 146, Prüfangriff 5 LP in 19 bis 23
  const szene = 'gegner slot=0 typ=Puppe x=146 z=100 lp=16 vorplatziert=ja\npruefangriff slot=0 von=19 bis=23 schaden=5 umwerfen=nein\n';
  // Lauf c: A in 17, Schlag aktiv ab 19 (P+2)
  const c = welt(szene);
  let instC: Angriffsinstanz | null = null;
  bis(c, 40, {
    vor: (u) => {
      if (u.frame === 19) instC = kette(u, 1);
      if (instC !== null) instC.aktiv = u.frame >= 19 && u.frame <= 22;
      u.figur.angriff = instC;
    },
  }, (u) => {
    if (u.frame === 19) {
      assert.equal(gegner(u, 0).lp, 13);
      assert.deepEqual(u.ereignisse, ['T:F>s0:KT1:3:R']);
    }
    assert.equal(u.figur.lp, 72, `Frame ${u.frame}`);
  });
  // Lauf d: A in 18, Schlag aktiv ab 20; der Gegner trifft in 19 zuerst, der Schlag endet
  const d = welt(szene);
  bis(d, 40, {
    vor: (u) => {
      // K1 beginnt keinen Schlag, weil die Figur in 19 getroffen wurde
      u.figur.angriff = u.frame >= 20 && u.figur.zustand === 1 ? kette(u, 1) : null;
    },
  }, (u) => {
    if (u.frame === 19) assert.deepEqual(u.ereignisse, ['T:s0>F:PA:5:R']);
    assert.equal(gegner(u, 0).lp, 16, `Frame ${u.frame}`);
    assert.equal(u.figur.lp, u.frame >= 19 ? 67 : 72);
  });
});

test('treffer: getroffener Gegner prüft nicht mehr, der Boss nur in diesem Frame nicht (Kampf 5.4, Welt 7.4 SA3)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=140 z=100 lp=100\ngegner slot=1 typ=Puppe x=150 z=100 lp=30\n');
  const boss = gegner(w, 0);
  boss.typ = 'Ballast';
  boss.rolle = 'boss';
  const g = gegner(w, 1);
  bis(w, 9);
  const flaeche: Flaeche = { art: 'abstand', vorn: 105, hinten: 16, hinten_weg: null, tiefe: 12, hoehe_angreifer_max: null, hoehe_ziel_max: 66 };
  boss.angriff = gegnerAngriff(w, 0, flaeche, 9, 'AS');
  g.angriff = gegnerAngriff(w, 1, flaeche, 5, 'BA');
  bis(w, 10, { vor: (u) => { u.figur.angriff = kette(u, 1); } });
  // Beide in Punkt 1 getroffen: keiner trifft die Figur in diesem Frame
  assert.deepEqual(w.ereignisse, ['T:F>s0:KT1:3:R', 'T:F>s1:KT1:3:R']);
  assert.equal(g.angriff, null); // abgebrochen (Kampf 7)
  assert.notEqual(boss.angriff, null); // Boss: von vorn nicht abgebrochen (K4)
  (boss.angriff as Angriffsinstanz).aktiv = true;
  bis(w, 11, { vor: (u) => { u.figur.angriff = null; } });
  assert.deepEqual(w.ereignisse, ['T:s0>F:AS:9:R']);
  assert.equal(w.figur.lp, 63);
});

test('treffer: sterbender Gegner trifft nie (Kampf 5.4, 7)', () => {
  const w = welt('gegner slot=1 typ=Puppe x=150 z=100 lp=2\n');
  const g = gegner(w, 1);
  bis(w, 9);
  const flaeche: Flaeche = { art: 'abstand', vorn: 60, hinten: 4, hinten_weg: null, tiefe: 10, hoehe_angreifer_max: null, hoehe_ziel_max: 48 };
  g.angriff = gegnerAngriff(w, 1, flaeche);
  bis(w, 10, { vor: (u) => { u.figur.angriff = kette(u, 1); } });
  assert.deepEqual(w.ereignisse, ['T:F>s1:KT1:3:X']);
  assert.equal(w.figur.lp, 72);
  g.angriff = gegnerAngriff(w, 1, flaeche);
  bis(w, 11, { vor: (u) => { u.figur.angriff = null; } });
  assert.equal(w.treffer.length, 0);
});

// ---------------------------------------------------------------------------
// 5.8: Gegnerangriffe, Geschosse, Schutz (P11)
// ---------------------------------------------------------------------------

test('treffer: Fenster des Nahkämpfers um den Zielpunkt (Welt 5.4)', () => {
  const w = welt('gegner slot=1 typ=Puppe x=150 z=100 lp=30\n');
  const g = gegner(w, 1);
  g.blick = -1;
  // Zielpunkt x_Z = 110; Welt-Fenster dz −10 … +11 (Gegner minus Figur) = Kampf −11 … +10
  const inst = gegnerAngriff(w, 1, { art: 'fenster', x_z: 110, links: 32, rechts: 31, dz_min: -11, dz_max: 10, hinten: 3, hoehe_ziel_max: 48 });
  for (const [x, erwartet] of [[78, true], [77, false], [141, true], [142, false]] as const) {
    setzeX(w.figur, x);
    assert.equal(trifft(w, inst, -1), erwartet, `Figur x ${x}`);
  }
  setzeX(w.figur, 110);
  for (const [z, erwartet] of [[110, true], [111, false], [89, true], [88, false]] as const) {
    w.figur.z = ausGanz(z);
    assert.equal(trifft(w, inst, -1), erwartet, `Figur z ${z}`);
  }
  w.figur.z = ausGanz(100);
  w.figur.h = ausGanz(48);
  assert.equal(trifft(w, inst, -1), true);
  w.figur.h = ausGanz(49);
  assert.equal(trifft(w, inst, -1), false);
  w.figur.h = 0;
  // höchstens 3 px hinter dem Gegner (Blick links): x 153 ja, 154 nein (Fenster weit genug)
  const breit = gegnerAngriff(w, 1, { art: 'fenster', x_z: 150, links: 32, rechts: 31, dz_min: -11, dz_max: 10, hinten: 3, hoehe_ziel_max: 48 });
  setzeX(w.figur, 153);
  assert.equal(trifft(w, breit, -1), true);
  setzeX(w.figur, 154);
  assert.equal(trifft(w, breit, -1), false);
});

test('treffer: Explosion des Zünders nach der Flächenformel, nur bis 25 px Höhe (mechanik „Fernangriffe der Gegner“, Welt 6)', () => {
  const w = welt('gegner slot=1 typ=Puppe x=1000 z=100 lp=30\nobjekt slot=21 typ=Rakete x=1145 z=100\nobjekt slot=22 typ=Behälter art=Fass x=1150 z=100\n');
  const rakete = w.objekte[1];
  assert.ok(rakete !== undefined);
  rakete.blick = 1;
  const inst = angriffsinstanz({
    code: 'ZR',
    angreifer: 'o21',
    urheber: 's1',
    flaeche: { art: 'punkt', x: 1145, z: 100, richtung: 1, vorn: ZR_EXPLOSION_H - 1, hinten: ZR_EXPLOSION_H, tiefe: ZR_EXPLOSION_TIEFE, ziel_blick_versatz: ZR_BLICK_VERSATZ, hoehe_ziel_max: ZR_EXPLOSION_HOEHE_MAX },
    schaden: 13,
    umwerfen: true,
    trefferstopp: false,
    einmal: true,
    gegen: 'figur',
    beginn: 1,
  });
  inst.aktiv = true;
  const f = w.figur;
  const pruef = (x: number) => {
    setzeX(f, x);
    return inFlaeche(w, inst, rakete, f);
  };
  // Rakete nach rechts, Figur schaut zum Zünder: 97 bis 200 px vor ihm
  f.blick = -1;
  assert.deepEqual([pruef(1096), pruef(1097), pruef(1200), pruef(1201)], [false, true, true, false]);
  // Figur schaut weg: 89 bis 192 px
  f.blick = 1;
  assert.deepEqual([pruef(1088), pruef(1089), pruef(1192), pruef(1193)], [false, true, true, false]);
  setzeX(f, 1150);
  f.h = ausGanz(25);
  assert.equal(inFlaeche(w, inst, rakete, f), true);
  f.h = ausGanz(26);
  assert.equal(inFlaeche(w, inst, rakete, f), false);
  f.h = 0;
  f.z = ausGanz(112);
  assert.equal(inFlaeche(w, inst, rakete, f), true);
  f.z = ausGanz(113);
  assert.equal(inFlaeche(w, inst, rakete, f), false);
  f.z = ausGanz(100);
  // Punkt 3: Treffer auf die Figur mit Urheber s1, Behälter zerbricht, Gegner trifft sie nicht
  setzeX(gegner(w, 1), 1140);
  rakete.angriff = inst;
  bis(w, 1);
  assert.deepEqual(w.ereignisse, ['T:o21>F:ZR:13:U', 'T:o21>o22:ZR:13:B']);
  assert.equal(w.treffer[0]?.urheber, 's1');
  assert.equal(w.treffer[0]?.richtung, 1); // vom Einschlag weg (P14)
  assert.equal(gegner(w, 1).lp, 30);
});

test('treffer: wirkungslos im Schutz zählt nicht, der Angriff trifft danach (P11, Kampf 12 T7)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=16\npruefangriff slot=0 von=20 bis=46 schaden=5 umwerfen=nein\n');
  const f = w.figur;
  bis(w, 50, { vor: (u) => { if (u.frame <= 45) f.zustand = 3; else if (u.frame === 46) f.zustand = 1; } }, (u) => {
    if (u.frame >= 20 && u.frame <= 45) assert.deepEqual(u.ereignisse, ['T:s0>F:PA:5:W'], `Frame ${u.frame}`);
    else if (u.frame === 46) assert.deepEqual(u.ereignisse, ['T:s0>F:PA:5:R']);
    else assert.deepEqual(u.ereignisse, [], `Frame ${u.frame}`);
  });
  assert.equal(f.lp, 67);
  assert.equal(gegner(w, 0).angriff, null); // nach bis beendet
});

test('treffer: ein beendeter Prüfangriff beginnt auch für einen neuen Gegner im selben Slot nicht neu (Kampf 11.2)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=16\npruefangriff slot=0 von=5 bis=40 schaden=5 umwerfen=nein\n');
  bis(w, 5, { vor: (u) => { u.figur.zustand = 3; } });
  const g = gegner(w, 0);
  assert.equal(g.angriff?.code, 'PA');
  assert.equal(g.pruefangriff, 1);
  // wirksamer Treffer auf den Gegner beendet den Prüfangriff (trefferFolgen)
  const t: Treffer = {
    angreifer: 'f', urheber: 'f', ziel: 's0', code: 'KT1', schaden: 1, umwerfen: false, bahn: '',
    richtung: 1, von_vorn: true, wirkung: 'R', lp_vorher: 16, instanz: kette(w, 1),
  };
  w.treffer = [t];
  trefferFolgen(w);
  assert.deepEqual([g.angriff, g.pruefangriff, w.pruefangriffe_beendet], [null, 0, [true]]);
  // Slot frei und neu belegt, noch innerhalb von von … bis: kein neuer Prüfangriff
  gegnerBelegen(g, 'Puppe');
  g.x = ausGanz(146);
  g.z = ausGanz(100);
  g.lp = 16;
  g.logik = false;
  g.modus = 'PUPPE';
  bis(w, 10, { vor: (u) => { u.figur.zustand = 3; } });
  assert.deepEqual([g.angriff, g.pruefangriff], [null, 0]);
});

test('treffer: Prüfangriff −4 bis 60 px vor dem Gegner, |dz| ≤ 10, Figur bis 48 px, Richtung vom Angreifer weg (Kampf 11.2, P14)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=146 z=100 lp=16\npruefangriff slot=0 von=5 bis=5 schaden=5 umwerfen=ja\n');
  bis(w, 4);
  const g = gegner(w, 0);
  bis(w, 5, { vor: (u) => { u.figur.zustand = 3; } });
  const inst = g.angriff as Angriffsinstanz;
  assert.equal(inst.code, 'PA');
  assert.equal(g.blick, -1);
  const f = w.figur;
  for (const [x, erwartet] of [[86, true], [85, false], [150, true], [151, false]] as const) {
    setzeX(f, x);
    assert.equal(trifft(w, inst, -1), erwartet, `Figur x ${x}`);
  }
  setzeX(f, 100);
  for (const [z, erwartet] of [[110, true], [111, false], [90, true], [89, false]] as const) {
    f.z = ausGanz(z);
    assert.equal(trifft(w, inst, -1), erwartet, `Figur z ${z}`);
  }
  f.z = ausGanz(100);
  f.h = ausGanz(48);
  assert.equal(trifft(w, inst, -1), true);
  f.h = ausGanz(49);
  assert.equal(trifft(w, inst, -1), false);
  f.h = 0;
  // Flugrichtung der Figur: vom Angreifer weg (Figur links von ihm → −1); gleiches x: sein Blick
  assert.equal(w.treffer[0]?.richtung, -1);
  assert.equal(w.treffer[0]?.umwerfen, true);
});

// ---------------------------------------------------------------------------
// Behälter, geworfener Gegner, Landung
// ---------------------------------------------------------------------------

test('treffer: Behälter zerbricht beim ersten Treffer, auch durch einen Gegner; Bosskiste nicht (Welt 9.2, Kampf 5.5)', () => {
  const w = welt('gegner slot=1 typ=Puppe x=280 z=100 lp=30\nobjekt slot=20 typ=Behälter art=Fass x=150 z=100\nobjekt slot=21 typ=Behälter art=Bosskiste x=160 z=100\nobjekt slot=22 typ=Behälter art=Fass x=260 z=100\n');
  assert.equal(behaelterTreffbar(w.objekte[0] as Objekt), true);
  assert.equal(behaelterTreffbar(w.objekte[1] as Objekt), false);
  // Rakete der Figur (RX) im selben Frame wie der Schlag: ein Treffer je Behälter
  const g0 = w.geschosse[0];
  assert.ok(g0 !== undefined);
  g0.belegt = true;
  g0.x = ausGanz(200);
  g0.z = ausGanz(100);
  const rx = angriffsinstanz({
    code: 'RX', angreifer: 'g0', urheber: 'f',
    flaeche: { art: 'punkt', x: 200, z: 100, richtung: 1, vorn: RX_VORN, hinten: RX_HINTEN, tiefe: RX_TIEFE, ziel_blick_versatz: 0, hoehe_ziel_max: null },
    schaden: RX_SCHADEN, umwerfen: true, richtung: 'bahn', trefferstopp: false, gegen: 'gegner', beginn: 1,
  });
  rx.aktiv = true;
  g0.angriff = rx;
  bis(w, 1, { vor: (u) => { u.figur.angriff = kette(u, 1); } });
  assert.deepEqual(w.ereignisse, ['T:F>o20:KT1:3:B', 'T:g0>s1:RX:8:U', 'T:g0>o22:RX:8:B']);
  assert.equal(w.treffer[0]?.urheber, 'f');
  assert.equal(w.treffer[1]?.urheber, 'f');
  assert.equal(w.objekte[1]?.zerbrochen, false);
  // Gegnerangriff zerbricht ein Fass
  const v = welt('gegner slot=1 typ=Puppe x=150 z=100 lp=30\nobjekt slot=20 typ=Behälter art=Fass x=120 z=100\n');
  setzeX(v.figur, 20);
  gegner(v, 1).blick = -1;
  gegner(v, 1).angriff = gegnerAngriff(v, 1, { art: 'fenster', x_z: 120, links: 32, rechts: 31, dz_min: -11, dz_max: 10, hinten: 3, hoehe_ziel_max: 48 });
  bis(v, 1);
  assert.deepEqual(v.ereignisse, ['T:s1>o20:BA:5:B']);
});

test('treffer: geworfener Gegner trifft andere bei |dx| ≤ 52 und |dz| ≤ 17, nicht sich selbst (Kampf 8.5, P8)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=200 z=100 lp=30\ngegner slot=1 typ=Puppe x=252 z=117 lp=16\ngegner slot=2 typ=Puppe x=147 z=100 lp=16\ngegner slot=3 typ=Puppe x=200 z=118 lp=16\n');
  setzeX(w.figur, 50);
  const s0 = gegner(w, 0);
  bis(w, 1);
  umwerfenBeginnen(w, s0, 'F3', -1);
  const wg = angriffsinstanz({
    code: 'WG', angreifer: 's0', urheber: 'f',
    flaeche: { art: 'umkreis', halbbreite: WG_HALBBREITE, tiefe: WG_TIEFE, hoehe_ziel_max: null },
    schaden: WG_SCHADEN, umwerfen: true, richtung: 'bahn', trefferstopp: false, gegen: 'gegner', beginn: 1,
  });
  wg.aktiv = true;
  s0.angriff = wg;
  bis(w, 2);
  assert.deepEqual(w.ereignisse, ['T:s0>s1:WG:3:U']);
  assert.equal(w.treffer[0]?.richtung, -1); // Flugrichtung des Geworfenen
  assert.equal(s0.angriff, wg); // die Instanz der Figur bleibt am Geworfenen
  setzeX(gegner(w, 2), 148);
  bis(w, 3);
  assert.deepEqual(w.ereignisse, ['T:s0>s2:WG:3:U']);
});

test('treffer: Landung beim Neueinstieg trifft jeden treffbaren Gegner im Bild, den Boss mit eigenem Schaden (Kampf 6.5, P30)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=383 z=40 lp=100\ngegner slot=1 typ=Puppe x=0 z=190 lp=16\ngegner slot=2 typ=Puppe x=384 z=100 lp=16\ngegner slot=3 typ=Puppe x=200 z=100 lp=16\n');
  gegner(w, 0).typ = 'Ballast';
  gegner(w, 3).zustand = 2; // liegt
  const ln = angriffsinstanz({
    code: 'LN', angreifer: 'f', flaeche: { art: 'bild' }, schaden: 5, schaden_boss: 10, umwerfen: true, richtung: 'weg', trefferstopp: false, gegen: 'gegner', beginn: 1,
  });
  ln.aktiv = true;
  bis(w, 1, { vor: (u) => { u.figur.angriff = ln; } });
  assert.deepEqual(w.ereignisse, ['T:F>s0:LN:10:R', 'T:F>s1:LN:5:U']);
  assert.equal(w.treffer[1]?.richtung, -1); // von der Figur weg
});

test('treffer: Boss von vorn nicht treffbar, solange K4 es meldet; von hinten schon (Welt 7.1)', () => {
  const w = welt('gegner slot=0 typ=Puppe x=150 z=100 lp=100\n');
  const boss = gegner(w, 0);
  boss.typ = 'Ballast';
  boss.logik = true; // keine Puppe: Blick bleibt, wie gesetzt
  boss.blick = -1; // schaut zur Figur
  boss.vorn_geschuetzt = true;
  bis(w, 1, { vor: (u) => { u.figur.angriff = kette(u, 1); } });
  assert.equal(w.treffer.length, 0);
  boss.blick = 1; // Figur hinter ihm
  bis(w, 2, { vor: (u) => { u.figur.angriff = kette(u, 1); } });
  assert.deepEqual(w.ereignisse, ['T:F>s0:KT1:3:R']);
  assert.equal(w.treffer[0]?.von_vorn, false);
});
