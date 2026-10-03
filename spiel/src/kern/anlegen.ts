// Anlegen von Gegnern und Objekten aus Stage-Daten (Welt 2.1, 4.1, 9.1) und
// Prüfszene (Kampf 11.2; Welt 11.3). Gemeinsam für erzeugeWelt (welt.ts) und
// Eingriffe (eingriffe.ts). Logik der Gegner setzt danach gegnerAngelegt
// (wellen.ts, K3) bzw. bossAngelegt (gegner/boss.ts, K4).

import type { Gegner, GegnerModus, Objekt, Rolle, GegnerTyp } from './entitaeten.ts';
import type { BehaelterSatz, GegnerSatz } from './stage.ts';
import type { GegnerStart, ObjektStart } from './start.ts';
import type { Welt } from './welt.ts';
import { ausGanz } from './festkomma.ts';
import { ZUSTAND_BODEN, ZUSTAND_NORMAL, blickZu, gegnerBelegen, objektBelegen } from './entitaeten.ts';
import { gegnerZufall } from './zufall.ts';
import { gegnerAngelegt } from './wellen.ts';
import { bossAngelegt } from './gegner/boss.ts';
import {
  BOLZER_START_LP,
  BOLZER_START_SCHADEN,
  BOSS_LP,
  OBJEKT_SLOT_ERSTER,
  RAKETENWERFER_MUNITION,
  RAMMBOCK_START_LP,
  RAMMBOCK_START_SCHADEN,
} from './werte.ts';

/** Rolle nach Typ (Kampf 3, 11.2): Bolzer leicht, Rammbock schwer, Zünder fern, Ballast boss, Puppe leicht. */
export function rolleVon(typ: GegnerTyp): Rolle {
  switch (typ) {
    case 'Rammbock':
      return 'schwer';
    case 'Zünder':
      return 'fern';
    case 'Ballast':
      return 'boss';
    default:
      return 'leicht';
  }
}

/**
 * Startwerte nach Welt 4.5 (werte=start, vorplatziert): Bolzer bzw. Rolle
 * leicht 16 LP / 5 Schaden, Rammbock bzw. Rolle schwer 30 LP / 6 Schaden,
 * Ballast 100 LP (Welt 7.1). Zünder hat keine Startwerte: LP nach Rang.
 */
function startwerte(g: Gegner): { lp: number; schaden: number } | null {
  if (g.typ === 'Ballast') return { lp: BOSS_LP, schaden: 0 };
  if (g.rolle === 'leicht') return { lp: BOLZER_START_LP, schaden: BOLZER_START_SCHADEN };
  if (g.rolle === 'schwer') return { lp: RAMMBOCK_START_LP, schaden: RAMMBOCK_START_SCHADEN };
  return null;
}

/**
 * Anfangsmodus eines neuen Gegners: sn_timer zeigt im ersten Frame 1 (beim
 * Laden 0, weil welt.ts zu Beginn von Frame 1 hochzählt; beim Anlegen in
 * einem laufenden Frame 1).
 */
function modusAnfang(welt: Welt, g: Gegner, m: GegnerModus): void {
  g.modus = m;
  g.modus_uhr = welt.frame > 0 ? 1 : 0;
}

/** Setzt LP und Schaden nach den Startwerten bzw. merkt lp_offen für LP nach Rang. */
function lpSetzen(g: Gegner, lp: number | null, lpMax: number | null): void {
  const sw = g.werte === 'start' ? startwerte(g) : null;
  if (sw !== null) g.schaden = sw.schaden;
  if (lp !== null) {
    g.lp = lp;
  } else if (sw !== null) {
    g.lp = sw.lp;
  } else {
    g.lp = 0;
    g.lp_offen = true;
  }
  g.lp_max = lpMax ?? g.lp;
  g.lp_vor = g.lp;
}

/** Legt einen vorplatzierten Gegner aus der Stage in Slot g an (Welt 2.1, 4.1, 4.2): WARTEN, Zustand 2. */
export function gegnerAusStage(welt: Welt, g: Gegner, satz: GegnerSatz): void {
  gegnerBelegen(g, satz.typ);
  g.x = ausGanz(satz.x);
  g.z = ausGanz(satz.z);
  g.blick = satz.blick;
  g.rolle = rolleVon(satz.typ);
  g.auftritt = satz.auftritt;
  g.welle = satz.welle;
  g.werte = satz.werte;
  g.vorplatziert = true;
  g.logik = true;
  g.erlaubnis = !welt.start.erlaubnis_aus.includes(g.nr);
  g.rang_beim_erscheinen = welt.rang.rang;
  modusAnfang(welt, g, 'WARTEN');
  g.aktion = 'WARTEN';
  g.zustand = ZUSTAND_BODEN;
  if (g.typ === 'Ballast') {
    lpSetzen(g, welt.start.boss_lp ?? BOSS_LP, null);
    g.angriffe_an = welt.start.boss_angriffe;
    g.bewegung_an = welt.start.boss_bewegung;
  } else {
    lpSetzen(g, null, null);
  }
}

/**
 * Legt einen Gegner der Prüfszene in seinem Slot an (Kampf 11.2): Logik aus
 * → Puppe (PUPPE, Zustand 1, steht); Logik an → wach und kampffähig (FREI,
 * Zustand 1; Welt 11.3). Ohne lp: Startwerte bei vorplatziert, sonst nach Rang.
 */
export function gegnerAusSzene(welt: Welt, gs: GegnerStart): Gegner {
  const g = welt.gegner[gs.slot];
  if (g === undefined) throw new RangeError(`Gegnerslot s${gs.slot} gibt es nicht`);
  gegnerBelegen(g, gs.typ);
  g.x = ausGanz(gs.x);
  g.z = ausGanz(gs.z);
  g.blick = gs.blick ?? blickZu(g, welt.figur);
  g.rolle = gs.rolle;
  g.logik = gs.logik;
  g.erlaubnis = gs.erlaubnis && !welt.start.erlaubnis_aus.includes(gs.slot);
  g.vorplatziert = gs.vorplatziert;
  g.werte = gs.vorplatziert ? 'start' : 'rang';
  g.rang_beim_erscheinen = welt.rang.rang;
  g.zustand = ZUSTAND_NORMAL;
  g.aktion = 'STAND';
  modusAnfang(welt, g, gs.logik ? 'FREI' : 'PUPPE');
  if (g.typ === 'Ballast') {
    lpSetzen(g, gs.lp ?? welt.start.boss_lp ?? BOSS_LP, gs.lp_max);
    g.angriffe_an = welt.start.boss_angriffe;
    g.bewegung_an = welt.start.boss_bewegung;
  } else {
    lpSetzen(g, gs.lp, gs.lp_max);
  }
  return g;
}

/** Gibt dem Gegner seinen Zufallsgenerator aus einer Ziehung des Hauptgenerators (Welt 11.1). */
export function gegnerZufallGeben(welt: Welt, g: Gegner): void {
  g.zufall = gegnerZufall(welt.zufall);
}

/**
 * Übergibt einen frisch angelegten Gegner an seine Logik: Boss an K4, alle
 * anderen an K3. Für Puppen (Logik aus) setzt gegnerAngelegt nur die LP nach
 * Rang, wenn die Szene keine nennt (Lücke L18; Kernfehler aus Stufe 3).
 */
export function gegnerUebergeben(welt: Welt, g: Gegner): void {
  if (g.typ === 'Ballast') bossAngelegt(welt, g);
  else gegnerAngelegt(welt, g);
}

/** Legt einen Behälter in Objektslot o an (Welt 9.1, 9.2). */
export function behaelterAnlegen(o: Objekt, satz: BehaelterSatz, zerbrochen: boolean): void {
  objektBelegen(o, 'Behälter');
  o.id = satz.id;
  o.art = satz.art;
  o.x = ausGanz(satz.x);
  o.z = ausGanz(satz.z);
  o.inhalt = satz.inhalt;
  o.zerbrochen = zerbrochen;
}

/**
 * Legt ein Objekt der Prüfszene in seinem Slot an (Kampf 11.2). Ein
 * Gegenstand liegt von Beginn an (gelandet, aufnehmbar, liegezeit 0;
 * Festlegung K0); ein Raketenwerfer ohne Angabe hat 3 Schuss.
 */
export function objektAusSzene(welt: Welt, os: ObjektStart): Objekt {
  const o = welt.objekte[os.slot - OBJEKT_SLOT_ERSTER];
  if (o === undefined) throw new RangeError(`Objektslot o${os.slot} gibt es nicht`);
  objektBelegen(o, os.typ);
  o.id = os.id;
  o.art = os.art;
  o.x = ausGanz(os.x);
  o.z = ausGanz(os.z);
  o.inhalt = os.inhalt;
  o.munition = os.munition > 0 || os.art !== 'Raketenwerfer' ? os.munition : RAKETENWERFER_MUNITION;
  if (os.typ === 'Gegenstand') {
    o.aufnehmbar = true;
    o.landung_l = 0;
    o.liegezeit = 0;
  }
  return o;
}
