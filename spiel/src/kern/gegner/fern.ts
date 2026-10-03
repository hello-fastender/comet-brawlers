// Fernkämpfer Zünder nach docs/spezifikation-welt.md, Abschnitt 6 mit E17
// (K3, Stufe 2): Zielpunkt (128 px in der Tiefe der Figur oder 120 px mit
// 24 px Versatz, Wahl aus g.zufall), Zielbeginn höchstens 8 px in x und
// 6 px in der Tiefe vom Zielpunkt, Zielrecht, ZIELEN genau 60 Frames mit
// Tiefenschritten, SCHUSS ZR (17 Frames, Rakete in Q = A+6), Rakete und
// Explosion (Q+20 bzw. an einer Wand, Explosion 9 Frames als Instanz mit
// Fläche punkt), Zurückweichen, Kolbenhieb ZK mit Nahkampfrecht. Die Waffe
// beim Tod legt gegenstaende.ts ab.
//
// Festlegungen K3 (Lücken, Bericht):
// - „Zurückweichen: geht vom Zielpunkt weg“ ist gelesen als: Er geht mit
//   Blick zur Figur zu seinem Zielpunkt, also von der Figur weg (Zustand
//   ZURUECK, solange |dx| < 100); Zielbeginn gilt dort wie in ANNAEHERN.
// - Im Zielen bleibt der Blick vom Zielbeginn; so kann die Figur „hinter ihm“
//   stehen (Abbruch). Ein Abbruch des Zielens schreibt kein AA (kein Angriff
//   begonnen); die Zielpunktwahl bleibt.
// - Das Zielrecht wird ohne Ereignis abgegeben (RA gilt dem Nahkampfrecht).
// - Kolbenhieb: Nachlauf wie BA (12–36, mit Treffer 16–36 Frames), danach gibt
//   er das Nahkampfrecht ab. „Bildrand“ hinter ihm: K bzw. K + 383.
// - Der Bildrand hält die Rakete nicht auf (Welt 6: offen); eine Wand ist das
//   Ende des Tiefenbands bzw. ein Hindernis über ihrer Höhe. Einschlag: EX:on,
//   Bildschütteln (KA10).
// - fest.zielpunkt: 128, 120h (24 px nach hinten) oder 120v (24 px nach vorn).

import type { Blick, Gegner, Objekt, SlotKey, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import { add, ausGanz, divGanz, ganz, mulGanz, sub } from '../festkomma.ts';
import { ZUSTAND_NORMAL, angriffsinstanz, blickZu, freiesObjekt, freigeben, gegnerVon, imFenster, modusSetzen, objektBelegen } from '../entitaeten.ts';
import { EREIGNIS, ereignis } from '../ereignisse.ts';
import { bereich, ziehenAus } from '../zufall.ts';
import { rangstufe } from '../rang.ts';
import { begehbar, schrittBegrenzt } from '../stage.ts';
import { schuettelnStarten } from '../kamera.ts';
import { bandZ, fensterX, gegnerBegrenzung, gehen, gehTempo } from './nah_gehen.ts';
import {
  ausserhalbAbbruchfenster,
  festZahl,
  gehstufeZiehen,
  nahFenster,
  rechtAbgeben,
  rechtAnfordern,
  rechteGesperrt,
  tm,
  weltAbstand,
  zielabstandSetzen,
  zielrechtAbgeben,
  zielrechtAnfordern,
} from './nah.ts';
import {
  GEGNER_TREFFERSTOPP,
  IM_BILD_MAX,
  KOLBENHIEB_DX,
  KOLBENHIEB_RAND,
  NAH_ANGRIFFE,
  SCHADEN_BOLZER,
  SCHADEN_ZUENDER_RAKETE,
  SCHUSS_DAUER,
  ZIELBEGINN_X,
  ZIELBEGINN_Z,
  ZIELEN_ABBRUCH_DX,
  ZIELEN_DAUER,
  ZIELEN_DZ_MAX,
  ZIELEN_DZ_MIN,
  ZIELPUNKT_AUS,
  ZIELPUNKT_GERADE,
  ZIELPUNKT_VERSATZ_X,
  ZIELPUNKT_VERSATZ_Z,
  ZR_BLICK_VERSATZ,
  ZR_EINSCHLAG,
  ZR_EXPLOSION_BIS,
  ZR_EXPLOSION_H,
  ZR_EXPLOSION_HOEHE_MAX,
  ZR_EXPLOSION_TIEFE,
  ZR_EXPLOSION_VON,
  ZR_RAKETE_AB,
  ZR_RAKETE_H,
  ZR_RAKETE_H_MIN,
  ZR_RAKETE_V,
  ZR_RAKETE_X,
  ZURUECKWEICHEN_ABSTAND,
} from '../werte.ts';

/** Werte des Kolbenhiebs: wie Bolzer Schlag A (Welt 6). */
const KOLBEN = NAH_ANGRIFFE.BA;
/** Explosion d = 1 … 9 Frames nach dem Einschlag (Q+21 bis Q+29 bei Einschlag in Q+20, Welt 6). */
const EXPLOSION_VON = ZR_EXPLOSION_VON - ZR_EINSCHLAG;
const EXPLOSION_BIS = ZR_EXPLOSION_BIS - ZR_EINSCHLAG;
/** Höhenverlust der Rakete bis zum Einschlag in px (44 → 1, nur Darstellung). */
const RAKETE_SINKT = ganz(sub(ZR_RAKETE_H, ZR_RAKETE_H_MIN));

/** Werte von fest.zielpunkt in der Reihenfolge der Ziehung (Welt 6, 11.2). */
export const ZIELPUNKTE = ['128', '120h', '120v'] as const;

// ===========================================================================
// Zielpunkt (Welt 6)
// ===========================================================================

/** Zielpunkt ziehen: gleichverteilt aus drei Punkten (Welt 6), fest.zielpunkt ersetzt das Ergebnis. */
function zielpunktZiehen(welt: Welt, g: Gegner): void {
  let i = ziehenAus(g.zufall, ZIELPUNKT_AUS);
  const t = welt.fest['zielpunkt'];
  if (t !== undefined) {
    const j = ZIELPUNKTE.findIndex((z) => z === t);
    if (j < 0) throw new RangeError(`fest.zielpunkt=${t}: erlaubt sind ${ZIELPUNKTE.join(' ')}`);
    i = j;
  }
  g.timer['zielwahl'] = i;
  g.timer['zielwahl_gesetzt'] = 1;
}

/** Zielpunkt zur aktuellen Lage der Figur (Welt 6), begrenzt auf K + 16 … K + 368 und das Band; setzt g.zielpunkt_x, g.zielpunkt_z. */
function zielpunktBerechnen(welt: Welt, g: Gegner): void {
  const fig = welt.figur;
  const wahl = tm(g, 'zielwahl');
  const abstand = wahl === 0 ? ZIELPUNKT_GERADE : ZIELPUNKT_VERSATZ_X;
  const versatz = wahl === 1 ? ZIELPUNKT_VERSATZ_Z : wahl === 2 ? -ZIELPUNKT_VERSATZ_Z : 0;
  const dx = ganz(g.x) - ganz(fig.x);
  const seite: Blick = dx > 0 ? 1 : dx < 0 ? -1 : g.seite;
  g.seite = seite;
  g.zielpunkt_x = fensterX(welt, ganz(fig.x) + seite * abstand);
  g.zielpunkt_z = bandZ(welt, g.zielpunkt_x, ganz(fig.z) + versatz);
}

/** Steht er am Zielpunkt (höchstens 8 px in x und 6 px in der Tiefe, Welt 6)? */
function amZielpunkt(welt: Welt, g: Gegner): boolean {
  zielpunktBerechnen(welt, g);
  return Math.abs(ganz(g.x) - g.zielpunkt_x) <= ZIELBEGINN_X && Math.abs(ganz(g.z) - g.zielpunkt_z) <= ZIELBEGINN_Z;
}

// ===========================================================================
// Zustandswechsel
// ===========================================================================

function beginneAnnaehern(welt: Welt, g: Gegner): void {
  g.angriff = null;
  if (g.angriff_code === 'ZK') g.angriff_code = '';
  const zurueck = Math.abs(weltAbstand(welt, g).dx) < ZURUECKWEICHEN_ABSTAND;
  modusSetzen(g, zurueck ? 'ZURUECK' : 'ANNAEHERN');
  g.gehbefehl_rest = 0;
  g.timer['angekommen'] = 0;
}

function beginneZielen(welt: Welt, g: Gegner): void {
  modusSetzen(g, 'ZIELEN');
  g.timer['ziel_z'] = welt.frame;
  g.blick = blickZu(g, welt.figur);
  g.aktion = 'ZIELEN';
}

/** Schuss ZR in A = z+60 (Welt 6): Schaden nach dem Rang, AS:sn:ZR; die Rakete folgt in Q = A+6. */
function beginneSchuss(welt: Welt, g: Gegner): void {
  modusSetzen(g, 'SCHUSS');
  g.angriff_a = welt.frame;
  g.angriff_code = 'ZR';
  g.schaden = SCHADEN_ZUENDER_RAKETE[rangstufe(welt.rang.rang)] as number;
  g.aktion = 'SCHUSS';
  ereignis(welt, EREIGNIS.ANGRIFF, g.schluessel, 'ZR');
}

/** Kolbenhieb möglich (Welt 6): hinter ihm weniger als 24 px bis zum Bildrand, |dx| ≤ 60, im Fenster, keine Sperre (E-10). */
function kolbenhiebMoeglich(welt: Welt, g: Gegner): boolean {
  const { dx } = weltAbstand(welt, g);
  if (Math.abs(dx) > KOLBENHIEB_DX || !imFenster(g, welt.kamera.x) || rechteGesperrt(welt)) return false;
  const x = ganz(g.x);
  const k = welt.kamera.x;
  const blick = blickZu(g, welt.figur);
  const rand = blick === 1 ? x - k : k + IM_BILD_MAX - x;
  return rand < KOLBENHIEB_RAND;
}

/** Kolbenhieb ZK (Welt 6): wie BA, Fenster nach 5.4, Schaden wie ein später Bolzer. */
function beginneKolbenhieb(welt: Welt, g: Gegner): void {
  const f = welt.frame;
  g.blick = blickZu(g, welt.figur);
  zielabstandSetzen(welt, g);
  g.schaden = SCHADEN_BOLZER[rangstufe(welt.rang.rang)] as number;
  g.angriff_code = 'ZK';
  g.angriff_a = f;
  g.angriff_abgebrochen = false;
  g.timer['treffer'] = 0;
  g.timer['aktiv_ende'] = f + KOLBEN.aktiv_bis;
  g.timer['kolben_nachlauf'] = 0;
  g.angriff = angriffsinstanz({
    code: 'ZK',
    angreifer: g.schluessel,
    flaeche: nahFenster(g),
    schaden: g.schaden,
    umwerfen: KOLBEN.umwerfen,
    richtung: 'weg',
    trefferstopp: true,
    einmal: true,
    gegen: 'figur',
    beginn: f,
  });
  modusSetzen(g, 'KOLBENHIEB');
  g.aktion = 'ANGRIFF';
  ereignis(welt, EREIGNIS.ANGRIFF, g.schluessel, 'ZK');
}

/** W4 im Kolbenhieb: nach den aktiven Frames Nachlauf wie BA, danach Recht abgeben und neu annähern. */
function kolbenEntscheidung(welt: Welt, g: Gegner): void {
  const f = welt.frame;
  if (g.recht === '') {
    beginneAnnaehern(welt, g);
    return;
  }
  if (tm(g, 'kolben_nachlauf') === 0) {
    if (f <= tm(g, 'aktiv_ende')) return;
    g.angriff = null;
    const [a, b] = tm(g, 'treffer') > 0 ? KOLBEN.nachlauf_mit : KOLBEN.nachlauf_ohne;
    const n = festZahl(welt, 'nachlauf', bereich(g.zufall, a, b));
    g.timer['kolben_nachlauf'] = 1;
    g.timer['nachlauf_ende'] = f + n - 1;
    g.aktion = 'NACHLAUF';
    if (n > 0) return;
  }
  if (f > tm(g, 'nachlauf_ende')) {
    rechtAbgeben(welt, g);
    beginneAnnaehern(welt, g);
  }
}

// ===========================================================================
// W4
// ===========================================================================

/**
 * W4 für einen Zünder (nicht in einer Reaktion): Zustand (ANNAEHERN, BEREIT,
 * ZIELEN, SCHUSS, ZURUECK, KOLBENHIEB), Zielrecht und Nahkampfrecht anfordern
 * (Slots aufsteigend), Zielpunkt aus g.zufall, Angriffsbeginn.
 */
export function fernEntscheidung(welt: Welt, g: Gegner): void {
  if (g.lp < 0) return;
  const f = welt.frame;
  if (g.recht === '') {
    const dx = weltAbstand(welt, g).dx;
    if (dx !== 0) g.seite = dx > 0 ? 1 : -1;
  }
  switch (g.modus) {
    case 'WARTEN':
      g.aktion = 'WARTEN';
      return;
    case 'AUFTRITT':
      if (f < g.kampffaehig_ab) return;
      g.zustand = ZUSTAND_NORMAL;
      if (tm(g, 'zielwahl_gesetzt') !== 1) zielpunktZiehen(welt, g);
      beginneAnnaehern(welt, g);
      break;
    case 'FREI':
      if (g.recht !== '') rechtAbgeben(welt, g);
      if (tm(g, 'zielwahl_gesetzt') !== 1) zielpunktZiehen(welt, g);
      beginneAnnaehern(welt, g);
      break;
    case 'ZIELEN':
      if (!g.zielrecht) {
        beginneAnnaehern(welt, g);
        break;
      }
      if (f >= tm(g, 'ziel_z') + ZIELEN_DAUER) beginneSchuss(welt, g);
      return;
    case 'SCHUSS':
      if (f < g.angriff_a + SCHUSS_DAUER) return;
      g.angriff_code = '';
      zielrechtAbgeben(welt, g);
      zielpunktZiehen(welt, g);
      if (amZielpunkt(welt, g)) {
        if (zielrechtAnfordern(welt, g)) {
          beginneZielen(welt, g);
          return;
        }
        modusSetzen(g, 'BEREIT');
        g.aktion = 'STAND';
        return;
      }
      beginneAnnaehern(welt, g);
      break;
    case 'KOLBENHIEB':
      kolbenEntscheidung(welt, g);
      if (g.modus === 'KOLBENHIEB') return;
      break;
    case 'ANNAEHERN':
    case 'ZURUECK':
    case 'BEREIT':
      break;
    default:
      return;
  }
  // ANNAEHERN, ZURUECK, BEREIT
  if (kolbenhiebMoeglich(welt, g) && rechtAnfordern(welt, g)) {
    beginneKolbenhieb(welt, g);
    return;
  }
  if (g.modus === 'BEREIT' || tm(g, 'angekommen') === 1) {
    g.timer['angekommen'] = 0;
    if (amZielpunkt(welt, g)) {
      if (zielrechtAnfordern(welt, g)) {
        beginneZielen(welt, g);
        return;
      }
      modusSetzen(g, 'BEREIT');
      g.aktion = 'STAND';
      return;
    }
  }
  const zurueck = Math.abs(weltAbstand(welt, g).dx) < ZURUECKWEICHEN_ABSTAND;
  modusSetzen(g, zurueck ? 'ZURUECK' : 'ANNAEHERN');
  if (g.gehbefehl_rest <= 0) gehstufeZiehen(welt, g);
}

// ===========================================================================
// KS3
// ===========================================================================

/** Rakete in Q = A+6 im kleinsten freien Objektslot, 45 px vor ihm, 44 px hoch, in seiner Tiefe (Welt 6). */
function raketeAbfeuern(welt: Welt, g: Gegner): void {
  const o = freiesObjekt(welt);
  if (o === null) {
    ereignis(welt, EREIGNIS.OBJEKT_VOLL, 'Rakete');
    return;
  }
  objektBelegen(o, 'Rakete');
  o.x = ausGanz(ganz(g.x) + g.blick * ZR_RAKETE_X);
  o.z = g.z;
  o.h = ZR_RAKETE_H;
  o.blick = g.blick;
  o.bahn_richtung = g.blick;
  o.besitzer = g.schluessel;
  o.abschuss = welt.frame;
  o.flugphase = 'FLUG';
  o.flug_n = 0;
  o.timer['schaden'] = g.schaden;
}

function gehenZumZielpunkt(welt: Welt, g: Gegner): void {
  g.blick = blickZu(g, welt.figur);
  if (amZielpunkt(welt, g)) {
    g.timer['angekommen'] = 1;
    g.aktion = 'STAND';
    return;
  }
  gehen(welt, g, g.zielpunkt_x, g.zielpunkt_z, gehTempo(g));
  if (g.gehbefehl_rest > 0) g.gehbefehl_rest -= 1;
  g.aktion = 'GEHEN';
  g.blick = blickZu(g, welt.figur);
  if (amZielpunkt(welt, g)) g.timer['angekommen'] = 1;
}

/** Tiefenschritt im Zielen (Welt 6): dz nach dem Vorframe außerhalb von −6 … +5 → ein Schritt in der Tiefe zur Figur. */
function zielenTiefe(welt: Welt, g: Gegner): void {
  const dz = g.z_vor - welt.figur.z_vor;
  if (dz >= ZIELEN_DZ_MIN && dz <= ZIELEN_DZ_MAX) return;
  const t = gehTempo(g);
  const r = schrittBegrenzt(gegnerBegrenzung(welt), g.x, g.z, g.h, 0, dz > 0 ? -t.z : t.z);
  g.z = r.z;
}

/** KS3 für einen Zünder: Bewegung, Zielen mit Tiefenschritten, Schuss (Rakete in Q = A+6 im kleinsten freien Objektslot). */
export function fernBewegung(welt: Welt, g: Gegner): void {
  if (g.lp < 0) return;
  const f = welt.frame;
  switch (g.modus) {
    case 'WARTEN':
      g.aktion = 'WARTEN';
      break;
    case 'AUFTRITT':
      g.aktion = 'AUFTRITT';
      break;
    case 'ANNAEHERN':
    case 'ZURUECK':
      gehenZumZielpunkt(welt, g);
      break;
    case 'BEREIT':
      zielpunktBerechnen(welt, g);
      g.blick = blickZu(g, welt.figur);
      g.aktion = 'STAND';
      break;
    case 'ZIELEN':
      g.aktion = 'ZIELEN';
      zielenTiefe(welt, g);
      break;
    case 'SCHUSS':
      g.aktion = 'SCHUSS';
      if (f === g.angriff_a + ZR_RAKETE_AB) raketeAbfeuern(welt, g);
      break;
    case 'KOLBENHIEB': {
      const inst = g.angriff;
      if (inst !== null) {
        const rel = f - g.angriff_a;
        inst.aktiv = rel >= KOLBEN.aktiv_von && rel <= KOLBEN.aktiv_bis && tm(g, 'treffer') === 0 && !g.angriff_abgebrochen;
      }
      break;
    }
    default:
      g.aktion = 'STAND';
      break;
  }
}

// ===========================================================================
// KS5, KS7
// ===========================================================================

/** KS5: Abbruch des Zielens (Figur hinter ihm oder |dx| > 200) bzw. des Kolbenhiebs (Fenster nach 5.4). */
export function fernAbbruch(welt: Welt, g: Gegner): void {
  if (g.modus === 'ZIELEN') {
    const { dx } = weltAbstand(welt, g);
    const hinter = -dx * g.blick < 0;
    if (hinter || Math.abs(dx) > ZIELEN_ABBRUCH_DX) {
      zielrechtAbgeben(welt, g);
      beginneAnnaehern(welt, g);
    }
    return;
  }
  if (g.modus !== 'KOLBENHIEB' || g.angriff === null || tm(g, 'treffer') > 0) return;
  const rel = welt.frame - g.angriff_a;
  if (rel < 1 || rel > KOLBEN.aktiv_bis) return;
  if (!ausserhalbAbbruchfenster(welt, g)) return;
  g.angriff = null;
  g.angriff_abgebrochen = true;
  g.angriff_code = '';
  ereignis(welt, EREIGNIS.ABBRUCH, g.schluessel);
  rechtAbgeben(welt, g);
  beginneAnnaehern(welt, g);
}

/** KS7, Seite des Urhebers: wirksamer Treffer des Zünders (Kolbenhieb ZK: aktive Pose 7 Frames länger; Explosion ZR: nichts). */
export function fernHatGetroffen(welt: Welt, t: Treffer): void {
  const g = gegnerVon(welt, t.urheber);
  if (g === null || t.code !== 'ZK' || g.modus !== 'KOLBENHIEB') return;
  g.timer['treffer'] = welt.frame;
  g.timer['aktiv_ende'] = g.angriff_a + KOLBEN.aktiv_bis + GEGNER_TREFFERSTOPP;
  g.angriff_stopp = GEGNER_TREFFERSTOPP;
  if (g.angriff !== null) g.angriff.aktiv = false;
}

// ===========================================================================
// KS4: Raketen der Zünder (o20 bis o59)
// ===========================================================================

/** Einschlag (Welt 6): Explosion als Angriffsinstanz des Objektslots mit Fläche punkt, EX:on, Bildschütteln. */
function einschlag(welt: Welt, o: Objekt): void {
  o.flugphase = 'EXPLOSION';
  o.timer['einschlag'] = welt.frame;
  o.einschlag_x = ganz(o.x);
  o.einschlag_z = ganz(o.z);
  o.angriff = angriffsinstanz({
    code: 'ZR',
    angreifer: o.schluessel,
    urheber: o.besitzer ?? o.schluessel,
    flaeche: {
      art: 'punkt',
      x: o.einschlag_x,
      z: o.einschlag_z,
      richtung: 1,
      vorn: ZR_EXPLOSION_H - 1,
      hinten: ZR_EXPLOSION_H,
      tiefe: ZR_EXPLOSION_TIEFE,
      ziel_blick_versatz: ZR_BLICK_VERSATZ,
      hoehe_ziel_max: ZR_EXPLOSION_HOEHE_MAX,
    },
    schaden: tm2(o, 'schaden'),
    umwerfen: true,
    richtung: 'weg',
    trefferstopp: false,
    einmal: true,
    gegen: 'figur',
    behaelter: true,
    beginn: welt.frame,
  });
  ereignis(welt, EREIGNIS.EINSCHLAG, o.schluessel);
  schuettelnStarten(welt, 'explosion');
}

function tm2(o: Objekt, name: string): number {
  return o.timer[name] ?? 0;
}

/** Ist o eine Rakete eines Zünders (Besitzer ein Gegnerslot)? */
function istZuenderRakete(o: Objekt): boolean {
  const b: SlotKey | null = o.besitzer;
  return o.belegt && o.typ === 'Rakete' && b !== null && b.startsWith('s');
}

/**
 * KS4 (Kampf 2.2): Geschosse der Gegner in o20 bis o59, Slots aufsteigend:
 * Flug der Rakete (5 px/Frame ab Q+1, Höhe 44 → 1 nur Darstellung),
 * Einschlag in Q+20 bzw. an einer Wand, Explosion Q+21 bis Q+29 als
 * Angriffsinstanz des Objektslots (urheber = Zünder, gegen 'figur'), danach frei.
 */
export function fernGeschosseSchritt(welt: Welt): void {
  const f = welt.frame;
  for (const o of welt.objekte) {
    if (!istZuenderRakete(o)) continue;
    if (o.flugphase === 'FLUG') {
      if (f <= o.abschuss) continue;
      const n = f - o.abschuss;
      const nx = add(o.x, mulGanz(ZR_RAKETE_V, o.bahn_richtung));
      const wand = !begehbar(welt.stage, ganz(nx), ganz(o.z), ganz(o.h));
      if (!wand) {
        o.x = nx;
        o.flug_n = n;
        o.h = sub(ZR_RAKETE_H, ausGanz(divGanz(RAKETE_SINKT * n, ZR_EINSCHLAG)));
      }
      if (wand || n >= ZR_EINSCHLAG) einschlag(welt, o);
      continue;
    }
    if (o.flugphase === 'EXPLOSION') {
      const d = f - tm2(o, 'einschlag');
      if (d > EXPLOSION_BIS) {
        freigeben(o);
        continue;
      }
      if (o.angriff !== null) o.angriff.aktiv = d >= EXPLOSION_VON;
    }
  }
}
