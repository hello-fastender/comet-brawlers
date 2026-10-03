import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import type { Bahn, Figur, FigurAktion, FigurPhase, Gegner, GegnerAktion, GegnerModus, GegnerTyp, Auftritt } from '../src/kern/entitaeten.ts';
import type { Welt } from '../src/kern/welt.ts';
import type { Atlanten, Wahl } from '../src/darstellung/zuordnung.ts';
import { FIGUR_AKTIONEN, REAKTIONEN, angriffsinstanz, figurNeu, gegnerBelegen } from '../src/kern/entitaeten.ts';
import { ausGanz } from '../src/kern/festkomma.ts';
import { AUFTRITT_HOCKE_RAMMBOCK, KP_LANDUNG } from '../src/kern/werte.ts';
import { GEGNER_BLATT, figurTeile, figurWahl, gegnerWahl, objektWahl } from '../src/darstellung/zuordnung.ts';
import { Verlauf } from '../src/darstellung/verlauf.ts';
import { MAGNETSTOSS_ANSATZ, MAGNETSTOSS_ANSATZ_4B, WERFER_GRIFF, WERFER_MUENDUNG, WERFER_PUNKTE } from '../src/darstellung/masse.ts';
import { werferPunkte } from '../grafik/quelle/figuren/vela_kampf.ts';
import { WERFER } from '../grafik/quelle/gegenstaende.ts';
import { MAGNETSTOSS_ANSATZ as G4_ANSATZ, MAGNETSTOSS_ANSATZ_4B as G4_ANSATZ_4B } from '../grafik/quelle/effekte.ts';
import { SPIEL } from './hilfe.ts';
import { atlantenLesen, scheibenWelt, szeneAblaufen } from './grafik_einbau_hilfe.ts';

// Auftrag 4, 3 und Phase 3 (G7): Jede Kombination aus Aktion und Unterphase
// der Figur und jeder Modus je Gegnertyp hat eine Animation im Atlas; fehlt
// eine, wählt die Zuordnung stand mit Grund (ersatz), und dieser Test schlägt
// fehl. Geprüft je Kombination über einen Bereich der Uhr (1 bis 130) und
// beide Blickrichtungen; dazu alle Prüfszenen und die Vorführung Frame für
// Frame mit der Zuordnung, wie die Darstellung sie aufruft.

const A: Atlanten = atlantenLesen();
/** Uhren, über die jede Kombination läuft (länger als jede Aktion der Tabellen). */
const UHREN = 130;

/** Prüft eine Wahl: keine Ersatzwahl, Animation und Bild im Atlas. */
function gueltig(w: Wahl, wo: string, fehler: Set<string>): void {
  if (w.ersatz !== null) {
    fehler.add(`${wo}: ${w.ersatz}`);
    return;
  }
  const an = A[w.blatt].animationen[w.animation];
  if (an === undefined || w.bild < 0 || w.bild >= an.bilder.length) fehler.add(`${wo}: ${w.blatt}/${w.animation}/${w.bild} nicht im Atlas`);
}

// ===========================================================================
// Figur: FIGUR_AKTIONEN × Varianten
// ===========================================================================

interface FigurVariante {
  name: string;
  phase?: FigurPhase;
  setze?: (f: Figur, welt: Welt) => void;
}

/** Gegner in Slot 1 als letzter Angreifer, vor (vorn) oder hinter der Figur. */
function angreifer(welt: Welt, f: Figur, vorn: boolean): void {
  const g = gegnerBelegen(welt.gegner[1] as Gegner, 'Bolzer');
  g.x = ausGanz(Math.trunc(f.x / 65536) + 40 * (vorn ? f.blick : -f.blick));
  f.letzter_angreifer = 's1';
}

const BAHN_VARIANTEN: FigurVariante[] = [
  { name: 'Flug vom Blick weg', setze: (f) => (f.bahn_richtung = f.blick === 1 ? -1 : 1) },
  { name: 'Flug in Blickrichtung', setze: (f) => (f.bahn_richtung = f.blick) },
];

const FIGUR_VARIANTEN: Readonly<Record<FigurAktion, readonly FigurVariante[]>> = {
  STAND: [{ name: 'ohne Waffe' }, { name: 'mit Waffe', setze: (f) => (f.waffe = 'RW') }],
  LAUF: [{ name: 'ohne Waffe' }, { name: 'mit Waffe', setze: (f) => (f.waffe = 'RW') }],
  SPRINT: [{ name: 'Sprint' }, { name: 'mit Waffe', setze: (f) => (f.waffe = 'RW') }],
  SPRUNG: [{ name: 'Sprung' }, { name: 'nach Sprungangriff', setze: (f) => (f.sprung_angriff = true) }],
  LANDUNG: [
    { name: 'Landung' },
    {
      name: 'mit laufender Instanz SS',
      setze: (f) => (f.angriff = angriffsinstanz({ code: 'SS', angreifer: 'f', flaeche: { art: 'bild' }, schaden: 1, umwerfen: true, trefferstopp: true, gegen: 'gegner', beginn: 1 })),
    },
  ],
  SCHLAG: [1, 2, 3, 4].flatMap((k) =>
    [-1, 0, 1].map((ausfall) => ({
      name: `Stufe ${k}, Ausfall ${ausfall}`,
      phase: String(k) as FigurPhase,
      setze: (f: Figur) => {
        f.kombo = k;
        f.ausfallschritt = ausfall;
      },
    })),
  ),
  LEERSCHLAG: [1, 2, 3, 4].map((k) => ({ name: `Stufe ${k}`, phase: String(k) as FigurPhase, setze: (f: Figur) => (f.kombo = k) })),
  SPRUNGANGRIFF: (['N', 'R', 'H', 'T'] as const).map((v) => ({ name: v, phase: v as FigurPhase, setze: (f: Figur) => (f.sprung_variante = v) })),
  GRIFF: [{ name: 'ohne Kniestoß' }, { name: 'nach Kniestoß', setze: (f) => (f.knie_zahl = 1) }],
  KNIESTOSS: [1, 2, 3].map((k) => ({ name: `Kniestoß ${k}`, phase: String(k) as FigurPhase, setze: (f: Figur) => (f.knie_zahl = k) })),
  WURF: [{ name: 'vorwärts', phase: 'V' }, { name: 'rückwärts', phase: 'R' }],
  SPEZIAL: [{ name: 'Spezialangriff' }],
  SPRINTANGRIFF: [{ name: 'Sprintangriff' }],
  SPRINTSPRUNG: [
    { name: 'ohne Angriff' },
    { name: 'SS', phase: 'SS', setze: (f) => ((f.ss_n = 1), (f.sprung_angriff = true)) },
    { name: 'SS beendet in der Luft', phase: 'SS', setze: (f) => ((f.ss_n = 0), (f.sprung_angriff = true)) },
  ],
  GETROFFEN: [
    { name: 'ohne Angreifer' },
    { name: 'Angreifer vorn', setze: (f, w) => angreifer(w, f, true) },
    { name: 'Angreifer hinten', setze: (f, w) => angreifer(w, f, false) },
  ],
  UMGEWORFEN: BAHN_VARIANTEN.flatMap((v) => (['F', 'B'] as const).map((p) => ({ ...v, name: `${v.name}, ${p}`, phase: p as FigurPhase }))),
  LIEGEN: BAHN_VARIANTEN,
  AUFSTEHEN: BAHN_VARIANTEN,
  TOT: BAHN_VARIANTEN.flatMap((v) => (['F', 'B', 'R'] as const).map((p) => ({ ...v, name: `${v.name}, ${p}`, phase: p as FigurPhase }))),
  WAFFE: [{ name: 'Raketenwerfer', setze: (f) => ((f.waffe = 'RW'), (f.munition = 2)) }],
  AUFNEHMEN: [{ name: 'Aufnehmen' }],
  NEUEINSTIEG: [
    { name: 'Fall', setze: (f, w) => ((f.landung_ln = w.frame + 30), (f.h = ausGanz(100))) },
    { name: 'Landung', setze: (f, w) => ((f.landung_ln = w.frame - 2), (f.h = 0)) },
  ],
};

test('Zuordnung Figur: jede Aktion aus FIGUR_AKTIONEN mit jeder Unterphase und Variante hat ihre Animation im Atlas', (t) => {
  assert.deepEqual(Object.keys(FIGUR_VARIANTEN).sort(), [...FIGUR_AKTIONEN].sort(), 'Variantentabelle deckt FIGUR_AKTIONEN nicht genau');
  const fehler = new Set<string>();
  let kombinationen = 0;
  const welt = scheibenWelt();
  for (const aktion of FIGUR_AKTIONEN) {
    for (const v of FIGUR_VARIANTEN[aktion]) {
      kombinationen += 1;
      for (const blick of [1, -1] as const) {
        for (let uhr = 1; uhr <= UHREN; uhr++) {
          welt.frame = 1000;
          const f = welt.figur;
          Object.assign(f, figurNeu());
          f.x = ausGanz(200);
          f.blick = blick;
          f.aktion = aktion;
          f.phase = v.phase ?? '';
          f.uhr = uhr;
          v.setze?.(f, welt);
          const w = figurWahl(f, welt, A);
          gueltig(w, `${aktion} (${v.name}) uhr ${uhr}`, fehler);
          for (const t of figurTeile(f, welt, A, w)) gueltig(t.wahl, `${aktion} (${v.name}) uhr ${uhr}, Zusatzbild`, fehler);
        }
      }
    }
  }
  assert.deepEqual([...fehler], []);
  t.diagnostic(`Figur: ${kombinationen} Kombinationen aus Aktion, Unterphase und Variante, je ${UHREN} Uhren und beide Blickrichtungen`);
  assert.ok(kombinationen >= FIGUR_AKTIONEN.length);
});

// ===========================================================================
// Gegner: jeder Modus je Typ
// ===========================================================================

const NAH_MODI: readonly GegnerModus[] = ['WARTEN', 'AUFTRITT', 'ANNAEHERN', 'ABWARTEN', 'KAMPFHALTUNG', 'ANGRIFF', 'NACHLAUF', 'SEITENWECHSEL', 'SPOTT'];
const FERN_MODI: readonly GegnerModus[] = ['WARTEN', 'AUFTRITT', 'ANNAEHERN', 'BEREIT', 'ZIELEN', 'SCHUSS', 'ZURUECK', 'KOLBENHIEB'];
const BOSS_MODI: readonly GegnerModus[] = ['WARTEN', 'AUFTRITT', 'BEREIT', 'ANKUENDIGUNG', 'ANGRIFF', 'NACHLAUF', 'STOSS', 'TAUMELN'];
const ALLGEMEIN: readonly GegnerModus[] = [...REAKTIONEN, 'FREI', 'PUPPE'];

/** Modi je Typ (Welt 5.2, 6, 7.1; Kampf 7; FREI und PUPPE nach K0). */
const MODI: Readonly<Record<GegnerTyp, readonly GegnerModus[]>> = {
  Bolzer: [...NAH_MODI, ...ALLGEMEIN],
  Rammbock: [...NAH_MODI, ...ALLGEMEIN],
  Puppe: [...NAH_MODI, ...ALLGEMEIN],
  Zünder: [...FERN_MODI, ...ALLGEMEIN],
  Ballast: [...BOSS_MODI, ...ALLGEMEIN],
};

interface GegnerVariante {
  name: string;
  setze: (g: Gegner, t: number) => void;
}

const BEGINN = 1000;

/** Bahnzustand nach Uhr t: Stillstand, Steigen, Fallen, Aufprall und danach (Felder wie bahn.ts). */
function bahnStand(g: Gegner, bahn: Exclude<Bahn, ''>, richtung: 1 | -1, t: number): void {
  g.bahn = bahn;
  g.bahn_richtung = richtung;
  if (t < 8) {
    g.bahn_frame = 0;
    g.bahn_boden = 0;
    g.vh = 0;
  } else if (t < 40) {
    g.bahn_frame = t - 7;
    g.bahn_boden = 0;
    g.vh = t < 25 ? ausGanz(1) : -ausGanz(1);
  } else {
    g.bahn_boden = 32;
    g.bahn_frame = 32 + Math.min(t - 40, 40);
    g.vh = 0;
  }
}

function varianten(typ: GegnerTyp, modus: GegnerModus): GegnerVariante[] {
  const v: GegnerVariante[] = [];
  const aktionen = (liste: readonly GegnerAktion[]): void => {
    for (const aktion of liste) {
      for (const stufe of ['normal', 'schnell'] as const) {
        v.push({ name: `${aktion} ${stufe}`, setze: (g) => ((g.aktion = aktion), (g.gehstufe = stufe)) });
      }
    }
  };
  switch (modus) {
    case 'WARTEN':
    case 'AUFTRITT':
      for (const auftritt of ['hocke', 'versteck', 'luke', 'rand_links', 'boss', ''] as Auftritt[]) {
        v.push({ name: `Auftritt ${auftritt}`, setze: (g) => ((g.auftritt = auftritt), (g.aktion = modus === 'WARTEN' ? 'WARTEN' : 'AUFTRITT')) });
      }
      return v;
    case 'ANNAEHERN':
    case 'ABWARTEN':
    case 'SEITENWECHSEL':
    case 'ZURUECK':
    case 'BEREIT':
    case 'FREI':
    case 'PUPPE':
      aktionen(['STAND', 'GEHEN']);
      // gegen den Blick (G3-15)
      v.push({ name: 'GEHEN rückwärts', setze: (g) => ((g.aktion = 'GEHEN'), (g.x_vor = Math.trunc(g.x / 65536) + g.blick)) });
      return v;
    case 'ANGRIFF':
    case 'NACHLAUF':
      if (typ === 'Ballast') {
        for (const k of [1, 2, 3]) {
          for (const treffer of [false, true]) {
            v.push({ name: `AS${k} ${treffer ? 'mit' : 'ohne'} Treffer`, setze: (g, t) => ((g.boss.art = 'AS'), (g.schwung = k), (g.boss.schwung_a = BEGINN), (g.boss.treffer = treffer), (g.aktion = 'ANGRIFF'), void t) });
          }
        }
        v.push({ name: 'AN', setze: (g, t) => ((g.boss.art = 'AN'), (g.boss.lauf_n = t + 1), (g.boss.auslauf_n = t + 1)) });
        v.push({ name: 'KP Flug', setze: (g, t) => ((g.boss.art = 'KP'), (g.boss.kp_k = Math.min(t, KP_LANDUNG)), (g.boss.kp_landung = 0)) });
        v.push({ name: 'KP gelandet', setze: (g) => ((g.boss.art = 'KP'), (g.boss.kp_k = KP_LANDUNG), (g.boss.kp_landung = BEGINN)) });
        return v;
      }
      for (const code of typ === 'Rammbock' ? ['RA', 'RB', 'RU', 'RS'] : ['BA', 'BB', 'BC', 'BUA', 'BUB']) {
        v.push({ name: code, setze: (g) => ((g.angriff_code = code), (g.angriff_a = BEGINN), (g.aktion = modus === 'ANGRIFF' ? 'ANGRIFF' : 'NACHLAUF')) });
        if (code === 'RS') v.push({ name: 'RS in der Luft', setze: (g) => ((g.angriff_code = code), (g.angriff_a = BEGINN), (g.h = ausGanz(30)), (g.aktion = 'SPRUNG')) });
      }
      v.push({ name: 'ohne Code', setze: (g) => (g.angriff_code = '') });
      return v;
    case 'ANKUENDIGUNG':
      for (const art of ['AS', 'AN', 'KP', ''] as const) {
        v.push({ name: `Ankündigung ${art}`, setze: (g) => ((g.boss.art = art), (g.boss.schwung_a = BEGINN), (g.schwung = art === 'AS' ? 1 : 0), (g.angriff_a = BEGINN)) });
      }
      return v;
    case 'KOLBENHIEB':
      for (const aktion of ['ANGRIFF', 'NACHLAUF'] as const) {
        for (const treffer of [0, BEGINN + 10]) {
          v.push({ name: `${aktion} Treffer ${treffer}`, setze: (g) => ((g.aktion = aktion), (g.angriff_a = BEGINN), (g.angriff_treffer = treffer), (g.angriff_aktiv_ende = BEGINN + (treffer > 0 ? 20 : 13))) });
        }
      }
      return v;
    case 'UMGEWORFEN':
    case 'TOT':
      for (const bahn of (modus === 'TOT' ? ['F4', 'F4b', 'F3'] : ['F1', 'F2', 'F3']) as Exclude<Bahn, ''>[]) {
        for (const richtung of [1, -1] as const) {
          v.push({ name: `${bahn} Richtung ${richtung}`, setze: (g, t) => bahnStand(g, bahn, richtung, t) });
        }
      }
      return v;
    case 'LIEGEN':
    case 'AUFSTEHEN':
      for (const richtung of [1, -1] as const) v.push({ name: `Richtung ${richtung}`, setze: (g) => ((g.bahn_richtung = richtung), (g.bahn = ''), (g.bahn_frame = 0)) });
      return v;
    default:
      v.push({ name: modus, setze: () => undefined });
      return v;
  }
}

test('Zuordnung Gegner: jeder Modus je Gegnertyp (mit Aktion, Angriff, Auftritt, Bahn) hat seine Animation im Atlas', (tt) => {
  const fehler = new Set<string>();
  let kombinationen = 0;
  let modi = 0;
  const welt = scheibenWelt();
  for (const typ of Object.keys(MODI) as GegnerTyp[]) {
    for (const modus of MODI[typ]) {
      modi += 1;
      for (const v of varianten(typ, modus)) {
        kombinationen += 1;
        for (const blick of [1, -1] as const) {
          for (let t = 0; t < UHREN; t++) {
            welt.frame = BEGINN + t;
            const g = gegnerBelegen(welt.gegner[2] as Gegner, typ);
            g.x = ausGanz(300);
            g.x_vor = 300;
            g.blick = blick;
            g.modus = modus;
            g.aktion = modus === 'GETROFFEN' || (REAKTIONEN as readonly string[]).includes(modus) ? (modus as GegnerAktion) : 'STAND';
            g.modus_uhr = t + 1;
            g.reaktion_h = BEGINN;
            g.angriff_a = BEGINN;
            g.boss.stoss_beginn = BEGINN;
            v.setze(g, t);
            gueltig(gegnerWahl(g, welt, A, t + 1), `${typ} ${modus} (${v.name}) t ${t}`, fehler);
          }
        }
      }
    }
  }
  assert.deepEqual([...fehler], []);
  tt.diagnostic(`Gegner: ${modi} Modi in 5 Typen, ${kombinationen} Kombinationen mit Varianten, je ${UHREN} Uhren und beide Blickrichtungen`);
  assert.ok(kombinationen > 200, `${kombinationen} Kombinationen`);
  // jedes Blatt eines Gegnertyps hat die Animationen der Tabellen (Stichprobe der Namen)
  assert.ok(A[GEGNER_BLATT.Rammbock].animationen['aufstehen_hocke']?.bilder.length === 3);
  assert.equal(AUFTRITT_HOCKE_RAMMBOCK, 69);
});

// ===========================================================================
// Ablauf: alle Prüfszenen und die Vorführung Frame für Frame
// ===========================================================================

/** Prüfszenen mit Eingabedatei gleichen Namens (falls vorhanden). */
function szenen(): { szene: string; eingabe: string | null }[] {
  const eingaben = new Set(readdirSync(SPIEL + 'tests/eingaben'));
  return readdirSync(SPIEL + 'tests/szenen')
    .filter((d) => d.endsWith('.txt'))
    .sort()
    .map((d) => ({ szene: `tests/szenen/${d}`, eingabe: eingaben.has(d) ? `tests/eingaben/${d}` : null }));
}

test('Zuordnung im Ablauf: alle Prüfszenen und die Vorführung zeigen in jedem Frame nur Animationen aus den Atlanten', { timeout: 300000 }, (t) => {
  const fehler = new Set<string>();
  const gesehen = new Set<string>();
  let frames = 0;
  for (const s of szenen()) {
    const verlauf = new Verlauf(A);
    szeneAblaufen(s.szene, s.eingabe, (welt) => {
      frames += 1;
      verlauf.beobachten(welt);
      const wo = `${s.szene} Frame ${welt.frame}`;
      const fw = figurWahl(welt.figur, welt, A);
      gueltig(fw, `${wo} Figur ${welt.figur.aktion}`, fehler);
      gesehen.add(`${fw.blatt}/${fw.animation}`);
      for (const teil of figurTeile(welt.figur, welt, A, fw)) {
        gueltig(teil.wahl, `${wo} Zusatzbild`, fehler);
        gesehen.add(`${teil.wahl.blatt}/${teil.wahl.animation}`);
      }
      for (const g of welt.gegner) {
        if (!g.belegt || g.typ === '') continue;
        const w = gegnerWahl(g, welt, A, verlauf.gehframes(g.nr));
        gueltig(w, `${wo} ${g.schluessel} ${g.typ} ${g.modus}/${g.aktion}`, fehler);
        gesehen.add(`${w.blatt}/${w.animation}`);
      }
      for (const o of [...welt.objekte, ...welt.geschosse]) {
        if (!o.belegt) continue;
        const w = objektWahl(o, A);
        if (w !== null) {
          gueltig(w, `${wo} ${o.schluessel} ${o.typ}`, fehler);
          gesehen.add(`${w.blatt}/${w.animation}`);
        }
      }
      for (const e of verlauf.bilder(welt)) {
        gueltig(e.wahl, `${wo} Effekt`, fehler);
        gesehen.add(`${e.wahl.blatt}/${e.wahl.animation}`);
      }
    });
  }
  assert.deepEqual([...fehler], []);
  t.diagnostic(`${frames} Frames, ${gesehen.size} verschiedene Animationen gezeigt`);
  assert.ok(gesehen.has('objekte/funke') && gesehen.has('objekte/explosion') && gesehen.has('objekte/staub'), 'Effekte der Darstellung kommen im Ablauf vor');
});

// ===========================================================================
// Übernommene Maße (masse.ts) gleich den Quellen in grafik/quelle/
// ===========================================================================

test('Zuordnung: Werferpunkte, Griffpunkt, Mündung und Magnetstoß-Ansätze in masse.ts gleich grafik/quelle', () => {
  const quelle = werferPunkte();
  for (const name of ['waffe_stand', 'waffe_gehen', 'waffe_schuss'] as const) {
    assert.deepEqual(
      WERFER_PUNKTE[name].map(([x, y]) => ({ x, y })),
      (quelle[name] ?? []).map((p) => ({ x: p.x, y: p.y })),
      name,
    );
    assert.equal(WERFER_PUNKTE[name].length, A.vela.animationen[name]?.bilder.length, `${name}: ein Werferpunkt je Bild`);
  }
  assert.deepEqual({ x: WERFER_GRIFF.x, y: WERFER_GRIFF.y }, { x: WERFER.griffpunkt.x, y: WERFER.griffpunkt.y });
  assert.deepEqual({ x: WERFER_MUENDUNG.x, y: WERFER_MUENDUNG.y }, { x: WERFER.muendungspunkt.x, y: WERFER.muendungspunkt.y });
  assert.deepEqual(MAGNETSTOSS_ANSATZ.map(([x, y]) => ({ x, y })), G4_ANSATZ.map((p) => ({ x: p.x, y: p.y })));
  assert.deepEqual({ x: MAGNETSTOSS_ANSATZ_4B[0], y: MAGNETSTOSS_ANSATZ_4B[1] }, { x: G4_ANSATZ_4B.x, y: G4_ANSATZ_4B.y });
});
