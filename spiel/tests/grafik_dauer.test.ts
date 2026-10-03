import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Atlanten, SpriteBlatt } from '../src/darstellung/zuordnung.ts';
import {
  AN_NACHLAUF,
  AS_NAECHSTER,
  AS_SCHWUENGE_MAX,
  AUFNEHMEN_DAUER,
  AUFSTEHEN_GEGNER,
  AUFTRITT_BOSS,
  AUFTRITT_HOCKE_BOLZER,
  AUFTRITT_HOCKE_RAMMBOCK,
  BOSS_TAUMELN_DAUER,
  F1_BODEN,
  F1_RUHE,
  F3_BODEN,
  F4_RUHE,
  FIGUR_AUFSTEHEN_DAUER,
  FIGUR_LIEGEN_AB,
  FIGUR_LIEGEN_ENDE,
  GEGENSTAND_FLUG,
  GEGNER_TREFFERSTOPP,
  GETROFFEN_DAUER,
  HALTEFRIST,
  KETTE2_LEER_DAUER,
  KETTE3_LEER_DAUER,
  KETTE4_DAUER,
  KETTE_AKTIV_BIS,
  KETTE_AKTIV_VON,
  KNIESTOSS_GEHALTEN_AB,
  KP_AKTIV_BIS,
  KP_NACHLAUF,
  LANDUNG_DAUER,
  LEERSCHLAG_DAUER,
  NAH_ANGRIFFE,
  NEUEINSTIEG_LANDUNG_DAUER,
  PAUSE_BASIS,
  PAUSE_FAKTOR,
  PAUSE_TEILER,
  RANG_MIN,
  REAKTION_DAUER,
  RX_DAUER,
  RZ_DAUER,
  SCHUSS_DAUER,
  SLOT_FREI_TOD,
  SPEZIAL_AKTIV_BIS,
  SPEZIAL_DAUER,
  SPEZIAL_STUFE_VON,
  SPOTT_DAUER,
  SPRINTANGRIFF_DAUER,
  SPRUNGANGRIFF_HOCH_AKTION_BIS,
  SPRUNG_LETZTER_LUFTFRAME,
  SS_ZWEITER_AKTIV_BIS,
  TREFFERSTOPP,
  WAFFE_DAUER,
  WURF_GEBUNDEN_BIS,
  WURF_TREFFER,
  ZR_EINSCHLAG,
  ZR_EXPLOSION_BIS,
} from '../src/kern/werte.ts';
import { SPRITE_BLAETTER, summe } from '../src/darstellung/zuordnung.ts';
import { atlantenLesen } from './grafik_einbau_hilfe.ts';

// Auftrag 4, Phase 3 (G7): Die Summe der Bilddauern einer Animation ist nicht
// länger als die Aktion der Logik, die sie zeigt (werte.ts). Die Darstellung
// nimmt die Zeit aus der Aktionsuhr (Auftrag 4, 2.3); eine längere Folge
// würde vom nächsten Zustand abgeschnitten. Jede nicht schleifende Animation
// mit Dauer braucht hier eine Logikdauer, sonst schlägt der Test fehl.
// Ausnahmen sind Effekte, die die Darstellung bewusst länger führt, als der
// Kern sie kennt (G4-5, G4-8); für sie gilt ihre eigene Regel (zweiter Test).

const A: Atlanten = atlantenLesen();

/**
 * Längster regulärer Ablauf eines Nah- oder Kolbenangriffs (Welt 5.4, 5.5;
 * werte.ts NAH_ANGRIFFE): A bis zum letzten aktiven Frame (nach einem
 * Treffer 7 länger), dazu der kürzeste Nachlauf ohne bzw. mit Treffer.
 */
function nahDauer(code: keyof typeof NAH_ANGRIFFE): number {
  const w = NAH_ANGRIFFE[code];
  const ohne = w.aktiv_bis + 1 + w.nachlauf_ohne[0];
  const mit = w.aktiv_bis + 1 + GEGNER_TREFFERSTOPP + w.nachlauf_mit[0];
  return Math.max(ohne, mit);
}

/** Längste Kampfhaltung (Welt 5.1: Pause 29 − 4 · ⌊Rang/4⌋, beim kleinsten Rang). */
const KAMPFHALTUNG_MAX = PAUSE_BASIS - PAUSE_FAKTOR * Math.floor(RANG_MIN / PAUSE_TEILER);

/** Gemeinsame Reaktionen der Gegner (Kampf 7; Bahnen 5.7). */
const REAKTION: Readonly<Record<string, number>> = {
  getroffen: REAKTION_DAUER,
  umgeworfen: F1_RUHE,
  aufstehen: AUFSTEHEN_GEGNER,
  geworfen: F3_BODEN - WURF_TREFFER,
  tot: SLOT_FREI_TOD,
};

/** Logikdauer je nicht schleifender Animation in Frames (Frames der Aktion bzw. des Zustands). */
const LOGIK: Readonly<Record<SpriteBlatt, Readonly<Record<string, number>>>> = {
  vela: {
    kette1: LEERSCHLAG_DAUER,
    kette2: KETTE2_LEER_DAUER,
    kette3: KETTE3_LEER_DAUER,
    kette4: KETTE4_DAUER,
    sprung: SPRUNG_LETZTER_LUFTFRAME + LANDUNG_DAUER,
    sprungangriff: SPRUNG_LETZTER_LUFTFRAME,
    richtung: SPRUNG_LETZTER_LUFTFRAME,
    hoch: SPRUNGANGRIFF_HOCH_AKTION_BIS,
    runter: SPRUNG_LETZTER_LUFTFRAME,
    griff: HALTEFRIST + 1,
    kniestoss: KNIESTOSS_GEHALTEN_AB - 1,
    wurf: WURF_GEBUNDEN_BIS,
    spezial: SPEZIAL_DAUER,
    sprintangriff: SPRINTANGRIFF_DAUER,
    sprint_sprungangriff: SS_ZWEITER_AKTIV_BIS + LANDUNG_DAUER,
    getroffen_vorn: GETROFFEN_DAUER,
    getroffen_hinten: GETROFFEN_DAUER,
    umgeworfen: FIGUR_LIEGEN_AB,
    liegen: FIGUR_LIEGEN_ENDE - FIGUR_LIEGEN_AB + 1,
    aufstehen: FIGUR_AUFSTEHEN_DAUER,
    waffe_schuss: WAFFE_DAUER,
    aufnehmen: AUFNEHMEN_DAUER,
    neueinstieg_landung: NEUEINSTIEG_LANDUNG_DAUER,
  },
  bolzer: {
    aufstehen_hocke: AUFTRITT_HOCKE_BOLZER,
    spott: SPOTT_DAUER,
    schlag_a: nahDauer('BA'),
    schlag_b: nahDauer('BB'),
    schlag_c: nahDauer('BC'),
    umwerfschlag_a: nahDauer('BUA'),
    umwerfschlag_b: nahDauer('BUB'),
    ...REAKTION,
  },
  puppe: {
    aufstehen_hocke: AUFTRITT_HOCKE_BOLZER,
    spott: SPOTT_DAUER,
    schlag_a: nahDauer('BA'),
    schlag_b: nahDauer('BB'),
    schlag_c: nahDauer('BC'),
    umwerfschlag_a: nahDauer('BUA'),
    umwerfschlag_b: nahDauer('BUB'),
    ...REAKTION,
  },
  rammbock: {
    aufstehen_hocke: AUFTRITT_HOCKE_RAMMBOCK,
    spott: SPOTT_DAUER,
    hocke_ankuendigung: KAMPFHALTUNG_MAX,
    schlag_a: nahDauer('RA'),
    schlag: nahDauer('RA'),
    schlag_b: nahDauer('RB'),
    umwerfschlag: nahDauer('RU'),
    sprungtritt: nahDauer('RS'),
    ...REAKTION,
  },
  zuender: {
    schuss: SCHUSS_DAUER,
    kolbenhieb: nahDauer('BA'),
    getroffen: REAKTION_DAUER,
    umgeworfen: F1_RUHE,
    aufstehen: AUFSTEHEN_GEGNER,
    tot: F4_RUHE,
  },
  ballast: {
    armschwung: AS_SCHWUENGE_MAX * AS_NAECHSTER,
    ansturm_bremsen: AN_NACHLAUF,
    koerperpresse: KP_AKTIV_BIS + 1 + KP_NACHLAUF,
    stoss_rueckzug: RZ_DAUER,
    getroffen: REAKTION_DAUER,
    umgeworfen: F1_RUHE,
    aufstehen: AUFSTEHEN_GEGNER,
    fall: F4_RUHE,
    auftritt: AUFTRITT_BOSS,
    taumeln: BOSS_TAUMELN_DAUER,
  },
  objekte: {
    magnetstoss1: (KETTE_AKTIV_BIS[0] as number) - (KETTE_AKTIV_VON[0] as number) + 1,
    magnetstoss2: (KETTE_AKTIV_BIS[1] as number) - (KETTE_AKTIV_VON[1] as number) + 1,
    magnetstoss3: (KETTE_AKTIV_BIS[2] as number) - (KETTE_AKTIV_VON[2] as number) + 1,
    magnetstoss4: (KETTE_AKTIV_BIS[3] as number) - (KETTE_AKTIV_VON[3] as number) + 1,
    eiswelle: SPEZIAL_AKTIV_BIS - (SPEZIAL_STUFE_VON[0] as number) + 1,
  },
};

/**
 * Effekte der Darstellung ohne eigene Aktion im Kern (docs/grafik.md 4.7, 9):
 * Mindestdauer (sie decken die aktiven Frames der Logik) und Höchstdauer
 * (ihre Regel in der Darstellung).
 */
const DARSTELLUNG: Readonly<Record<string, { min: number; max: number; regel: string }>> = {
  explosion: { min: RX_DAUER, max: 24, regel: 'G4-5: deckt RX (15 Frames), Darstellung etwa 24 Frames (Auftrag 4, 1.5)' },
  explosion_zuender: { min: ZR_EXPLOSION_BIS - ZR_EINSCHLAG + 1, max: 24, regel: 'G4-5: deckt ZR bis Uhr 10, Darstellung 24 Frames' },
  fass_truemmer: { min: 1, max: GEGENSTAND_FLUG, regel: 'G4-8: Trümmer fliegen und liegen so lange wie der Flug des Inhalts' },
  bosskiste_truemmer: { min: 1, max: GEGENSTAND_FLUG, regel: 'G4-8' },
  funke: { min: 1, max: TREFFERSTOPP + 1, regel: '4.7: 8 Frames (Trefferfunke des Vorbilds), nicht länger als Trefferframe und Trefferstopp' },
  staub: { min: 1, max: F1_RUHE - F1_BODEN, regel: '4.7: 3 Bilder zu 3 Frames, nicht länger als vom Bodenkontakt bis zur Ruhe' },
};

test('Bilddauern: Summe je Animation nicht länger als die Aktion der Logik (werte.ts)', (t) => {
  const fehlt: string[] = [];
  const zulang: string[] = [];
  let geprueft = 0;
  for (const blatt of SPRITE_BLAETTER) {
    for (const [name, an] of Object.entries(A[blatt].animationen)) {
      const s = summe(an.bilder.map((b) => b.dauer));
      if (DARSTELLUNG[name] !== undefined && blatt === 'objekte') continue;
      const logik = LOGIK[blatt][name];
      if (logik === undefined) {
        // schleifende Animationen und Standbilder (Dauer 0) haben keine Aktionsdauer
        if (!an.schleife && s > 0) fehlt.push(`${blatt}/${name}`);
        continue;
      }
      geprueft += 1;
      if (s > logik) zulang.push(`${blatt}/${name}: ${s} > ${logik}`);
    }
  }
  assert.deepEqual(fehlt, [], 'nicht schleifende Animationen ohne Logikdauer');
  assert.deepEqual(zulang, [], 'Summe der Bilddauern länger als die Aktion');
  t.diagnostic(`${geprueft} Animationen gegen ihre Aktion geprüft`);
  assert.ok(geprueft >= 70);
});

test('Bilddauern: Effekte der Darstellung decken die aktiven Frames und halten ihre Regel (G4-5, G4-8)', () => {
  for (const [name, r] of Object.entries(DARSTELLUNG)) {
    const an = A.objekte.animationen[name];
    assert.ok(an !== undefined, `objekte/${name} fehlt`);
    const s = summe(an.bilder.map((b) => b.dauer));
    assert.ok(s >= r.min && s <= r.max, `objekte/${name}: Summe ${s} nicht in ${r.min} bis ${r.max} (${r.regel})`);
  }
});
