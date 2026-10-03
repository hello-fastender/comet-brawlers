// Angriffe des Bosses Ballast (K4) nach docs/spezifikation-welt.md, 7.2 und
// 7.3: Rhythmus und Wahl im Entscheidungsframe, Armschwung AS (E18),
// Ansturm AN (wirft um, ohne Griff, E10, E21), Körperpresse KP; Instanzen
// nach dem Vertrag (entitaeten.ts angriffsinstanz), geprüft von treffer.ts.
//
// Ablauf:
//   W4   angriffEntscheiden: fällig (frame ≥ naechster_angriff), Wahl mit einer
//        Ziehung (Entscheidungsframe), Annäherung für den Armschwung, Beginn
//   KS3  angriffSchritt: Ausholen bzw. Hocke (ANKUENDIGUNG), aktive Frames
//        (ANGRIFF, instanz.aktiv), Nachlauf (NACHLAUF)
//   KS7  angriffGetroffen: wirksamer Treffer der eigenen Instanz
//        (Armschwung weiter, Ansturm endet, Trefferstopp der Presse)
//
// Beginn eines Angriffs („Angriffsbeginn“, Ereignis AS:s0:Code, Schaden und
// Abstand zum nächsten Angriff festgelegt) ist der erste Frame der
// Ankündigung: beim Armschwung A = A_1, beim Ansturm A (Ausholen A bis A+19),
// bei der Körperpresse der erste Frame der Hocke (A − 15; Festlegung K4).

import type { Flaeche, Gegner } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Welt } from '../welt.ts';
import { ZUSTAND_NORMAL, angriffsinstanz, blickZu, modusSetzen } from '../entitaeten.ts';
import { EREIGNIS, ereignis } from '../ereignisse.ts';
import { abs, add, ausGanz, divGanz, ganz, minF, mulGanz, neg, sub } from '../festkomma.ts';
import { schuettelnStarten } from '../kamera.ts';
import { rangstufe } from '../rang.ts';
import { bereich, wahl } from '../zufall.ts';
import {
  AN_AUSHOLEN,
  AN_AUSLAUF_ABNAHME,
  AN_HOEHE_MAX,
  AN_MAX_FRAMES,
  AN_MAX_WEG,
  AN_NACHLAUF,
  AN_NACHLENKEN,
  AN_SCHADEN,
  AN_TIEFE,
  AN_V,
  AN_V_SCHRAEG,
  AN_VORN,
  AS_AKTIV_BIS,
  AS_AKTIV_VON,
  AS_HINTEN,
  AS_HOEHE_MAX,
  AS_NACHLAUF,
  AS_NAECHSTER,
  AS_SCHADEN,
  AS_SCHWUENGE_MAX,
  AS_TIEFE,
  AS_VORN,
  BOSS_ABSTAND_BIS,
  BOSS_ABSTAND_VON,
  BOSS_ARMSCHWUNG_DX,
  BOSS_ARMSCHWUNG_DZ,
  BOSS_WAHL_FERN,
  BOSS_WAHL_GRENZE,
  BOSS_WAHL_NAH,
  GEGNER_TREFFERSTOPP,
  KP_AKTIV_BIS,
  KP_AKTIV_VON,
  KP_FALL_FAKTOR,
  KP_HALBBREITE,
  KP_HOCKE,
  KP_LANDUNG,
  KP_MAX_WEG,
  KP_NACHLAUF,
  KP_SCHADEN,
  KP_SCHEITEL_FRAME,
  KP_SCHEITEL_HOEHE,
  KP_STEIG_FAKTOR,
  KP_TIEFE,
  KP_X_TEILER,
} from '../werte.ts';
import {
  ART_AN,
  ART_AS,
  ART_CODES,
  ART_KP,
  angriffGesperrt,
  bossSchritt,
  eigeneInstanz,
  festZahl,
  lies,
  setze,
} from './boss_zustand.ts';

// ===========================================================================
// Flächen (Welt 7.3; Kampf 5.1). dz in Kampf-Konvention, hier symmetrisch.
// ===========================================================================

/** Armschwung: 16 px hinter bis 105 px vor ihm, ±12, Figur bis 66 px hoch. */
export const FLAECHE_AS: Flaeche = {
  art: 'abstand',
  vorn: AS_VORN,
  hinten: AS_HINTEN,
  hinten_weg: null,
  tiefe: AS_TIEFE,
  hoehe_angreifer_max: null,
  hoehe_ziel_max: AS_HOEHE_MAX,
};

/** Ansturm: vorn 0 bis 40 px (Platzhalter), ±12, Figur bis 90 px hoch. */
export const FLAECHE_AN: Flaeche = {
  art: 'abstand',
  vorn: AN_VORN,
  hinten: 0,
  hinten_weg: null,
  tiefe: AN_TIEFE,
  hoehe_angreifer_max: null,
  hoehe_ziel_max: AN_HOEHE_MAX,
};

/** Körperpresse: |dx| ≤ 25 um den Boss selbst, ±12, Höhe ohne Grenze. */
export const FLAECHE_KP: Flaeche = { art: 'umkreis', halbbreite: KP_HALBBREITE, tiefe: KP_TIEFE, hoehe_ziel_max: null };

// ===========================================================================
// W4: Fälligkeit, Wahl, Beginn (Welt 7.2)
// ===========================================================================

/** Abstand nach Welt 1 (Gegner minus Figur, ganzzahlig). */
function abstandWelt(welt: Welt, g: Gegner): { dx: number; dz: number } {
  return { dx: ganz(g.x) - ganz(welt.figur.x), dz: ganz(g.z) - ganz(welt.figur.z) };
}

/** Wahl nach Abstand (Welt 7.2), eine Ziehung aus g.zufall; fest.boss_angriff ersetzt das Ergebnis. */
function angriffWaehlen(welt: Welt, g: Gegner): number {
  const { dx } = abstandWelt(welt, g);
  const liste = Math.abs(dx) < BOSS_WAHL_GRENZE ? BOSS_WAHL_NAH : BOSS_WAHL_FERN;
  let code = wahl(g.zufall, liste);
  const fest = welt.fest['boss_angriff'];
  if (fest !== undefined) {
    if (fest !== 'AS' && fest !== 'AN' && fest !== 'KP') {
      throw new RangeError(`fest.boss_angriff muss AS, AN oder KP sein, nicht „${fest}“`);
    }
    code = fest;
  }
  return ART_CODES.indexOf(code);
}

/**
 * W4 im Zustand BEREIT (Welt 7.2): Ist ein Angriff fällig, wählt der Boss
 * ihn in diesem Frame (Entscheidungsframe; eine Ziehung) und beginnt ihn;
 * für den Armschwung erst, wenn |dx| ≤ 78 und |dz| ≤ 6 (bis dahin geht er
 * heran, die Wahl bleibt). Kein Angriff mit Zustand ≠ 1 (nach dem Stoß, SA5)
 * und nicht in E-10. Gibt true zurück, wenn ein Angriff beginnt.
 */
export function angriffEntscheiden(welt: Welt, g: Gegner): boolean {
  if (!g.logik || !g.angriffe_an) return false;
  if (g.zustand !== ZUSTAND_NORMAL) return false;
  if (welt.frame < g.naechster_angriff) return false;
  if (angriffGesperrt(welt)) return false;
  let art = lies(g, 'wahl');
  if (art === 0) {
    art = angriffWaehlen(welt, g);
    setze(g, 'wahl', art);
  }
  if (art === ART_AS) {
    const { dx, dz } = abstandWelt(welt, g);
    if (Math.abs(dx) > BOSS_ARMSCHWUNG_DX || Math.abs(dz) > BOSS_ARMSCHWUNG_DZ) return false;
  }
  angriffBeginnen(welt, g, art);
  return true;
}

/**
 * Angriffsbeginn (Welt 7.2, 7.3, 8): Blick zur Figur, Schaden nach der
 * Rangstufe, Abstand d zum nächsten Angriff (170 bis 200, eine Ziehung;
 * fest.boss_abstand), Instanz, Ereignis AS:s0:Code.
 */
function angriffBeginnen(welt: Welt, g: Gegner, art: number): void {
  const f = welt.frame;
  setze(g, 'wahl', 0);
  setze(g, 'art', art);
  setze(g, 'treffer', 0);
  setze(g, 'geh_x', 0);
  setze(g, 'geh_z', 0);
  g.blick = blickZu(g, welt.figur);
  const stufe = rangstufe(welt.rang.rang);
  const tabelle = art === ART_AS ? AS_SCHADEN : art === ART_AN ? AN_SCHADEN : KP_SCHADEN;
  g.schaden = tabelle[stufe] as number;
  let d = bereich(g.zufall, BOSS_ABSTAND_VON, BOSS_ABSTAND_BIS);
  d = festZahl(welt, 'boss_abstand', BOSS_ABSTAND_VON, BOSS_ABSTAND_BIS) ?? d;
  g.naechster_angriff = f + d;
  g.angriff_a = f;
  g.ziel_abstand = 0;
  g.ziel_x = 0;
  modusSetzen(g, 'ANKUENDIGUNG');
  g.aktion = 'ANKUENDIGUNG';
  if (art === ART_AS) {
    schwungBeginnen(welt, g, 1);
    return;
  }
  g.schwung = 0;
  g.phase = '';
  g.angriff_code = ART_CODES[art] as string;
  if (art === ART_AN) {
    setze(g, 'lauf_n', 0);
    setze(g, 'lauf_weg', 0);
    setze(g, 'lauf_ende', 0);
    setze(g, 'auslauf_n', 0);
    g.angriff = angriffsinstanz({
      code: 'AN',
      angreifer: g.schluessel,
      flaeche: FLAECHE_AN,
      schaden: g.schaden,
      umwerfen: true,
      richtung: 'weg',
      trefferstopp: false,
      einmal: true,
      gegen: 'figur',
      beginn: f,
    });
  } else {
    setze(g, 'kp_k', 0);
    setze(g, 'kp_stopp', 0);
    setze(g, 'kp_letzt', 0);
    setze(g, 'kp_landung', 0);
    g.angriff = angriffsinstanz({
      code: 'KP',
      angreifer: g.schluessel,
      flaeche: FLAECHE_KP,
      schaden: g.schaden,
      umwerfen: true,
      richtung: 'weg',
      trefferstopp: true,
      einmal: true,
      gegen: 'figur',
      beginn: f,
    });
  }
  ereignis(welt, EREIGNIS.ANGRIFF, g.schluessel, g.angriff_code);
}

/** Schwung k des Armschwungs beginnt in A_k = dieser Frame (Welt 7.3): neue Instanz, sn_angriff ASk, Ereignis AS:s0:ASk. */
function schwungBeginnen(welt: Welt, g: Gegner, k: number): void {
  g.schwung = k;
  g.phase = String(k);
  g.angriff_code = ART_CODES[ART_AS] + String(k);
  setze(g, 'a', welt.frame);
  setze(g, 'treffer', 0);
  g.aktion = 'ANKUENDIGUNG';
  g.angriff = angriffsinstanz({
    code: 'AS',
    angreifer: g.schluessel,
    flaeche: FLAECHE_AS,
    schaden: g.schaden,
    // nur der dritte (letzte) Schwung wirft um (beschlossen, E9)
    umwerfen: k === AS_SCHWUENGE_MAX,
    richtung: 'weg',
    trefferstopp: true,
    einmal: true,
    gegen: 'figur',
    beginn: welt.frame,
  });
  ereignis(welt, EREIGNIS.ANGRIFF, g.schluessel, g.angriff_code);
}

/** Nachlauf beginnen: eigene Instanz beendet, BEREIT ab bereitAb (W4). */
function nachlaufBeginnen(g: Gegner, bereitAb: number): void {
  if (eigeneInstanz(g)) g.angriff = null;
  modusSetzen(g, 'NACHLAUF');
  g.aktion = 'NACHLAUF';
  setze(g, 'bereit_ab', bereitAb);
}

/** Ist der Nachlauf vorbei (W4)? */
export function nachlaufVorbei(welt: Welt, g: Gegner): boolean {
  return welt.frame >= lies(g, 'bereit_ab');
}

// ===========================================================================
// KS3: Abläufe
// ===========================================================================

/** KS3 in ANKUENDIGUNG, ANGRIFF, NACHLAUF: Ablauf des laufenden Angriffs; setzt instanz.aktiv für diesen Frame. */
export function angriffSchritt(welt: Welt, g: Gegner): void {
  if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = false;
  const art = lies(g, 'art');
  if (art === ART_AS) armschwungSchritt(welt, g);
  else if (art === ART_AN) ansturmSchritt(welt, g);
  else if (art === ART_KP) presseSchritt(welt, g);
}

/**
 * Armschwung (Welt 7.3, E18): Schwung k holt in A_k bis A_k+16 aus, aktiv
 * A_k+17 bis A_k+19, nach einem wirksamen Treffer 7 Frames länger (Welt 5.4
 * Punkt 5). Hat Schwung k (k = 1, 2) wirksam getroffen, beginnt Schwung k+1
 * in A_k+36; sonst endet die Serie. Nachlauf 30 Frames nach dem letzten
 * aktiven Frame des letzten Schwungs.
 */
function armschwungSchritt(welt: Welt, g: Gegner): void {
  if (g.modus === 'NACHLAUF') return;
  const a = lies(g, 'a');
  const n = welt.frame - a;
  const getroffen = lies(g, 'treffer') === 1;
  const bis = AS_AKTIV_BIS + (getroffen ? GEGNER_TREFFERSTOPP : 0);
  if (n < AS_AKTIV_VON) {
    g.aktion = 'ANKUENDIGUNG';
    return;
  }
  if (n <= bis) {
    modusSetzen(g, 'ANGRIFF');
    g.aktion = 'ANGRIFF';
    if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = true;
    return;
  }
  if (getroffen && g.schwung < AS_SCHWUENGE_MAX) {
    if (n >= AS_NAECHSTER) schwungBeginnen(welt, g, g.schwung + 1);
    else g.aktion = 'ANGRIFF';
    return;
  }
  nachlaufBeginnen(g, a + bis + AS_NACHLAUF + 1);
}

/**
 * Ansturm (Welt 7.3): Ausholen A bis A+19, dann Lauf in Blickrichtung mit
 * 4 px/Frame (in Frames mit Tiefenschritt 3,92), höchstens 45 Frames und
 * 176 px; lenkt in der Tiefe 1 px/Frame zur Figur nach; aktiv in jedem
 * Lauf-Frame. Endet nach einem wirksamen Treffer, an einer Wand, am
 * Arenarand oder an den Grenzen; im Frame danach beginnt der Nachlauf
 * (16 Frames) mit dem Auslauf.
 */
function ansturmSchritt(welt: Welt, g: Gegner): void {
  if (g.modus === 'NACHLAUF') {
    auslaufSchritt(welt, g);
    return;
  }
  const n = welt.frame - g.angriff_a;
  if (n < AN_AUSHOLEN) {
    g.aktion = 'ANKUENDIGUNG';
    return;
  }
  if (lies(g, 'lauf_ende') === 1) {
    nachlaufBeginnen(g, welt.frame + AN_NACHLAUF);
    auslaufSchritt(welt, g);
    return;
  }
  modusSetzen(g, 'ANGRIFF');
  g.aktion = 'ANGRIFF';
  // Tiefe: höchstens 1 px je Frame zur Figur, nicht darüber hinaus
  const zDiff = sub(welt.figur.z, g.z);
  let dz: Fest = 0;
  if (zDiff > 0) dz = minF(AN_NACHLENKEN, zDiff);
  else if (zDiff < 0) dz = neg(minF(AN_NACHLENKEN, neg(zDiff)));
  const v = dz === 0 ? AN_V : AN_V_SCHRAEG;
  const weg = lies(g, 'lauf_weg');
  const schritt = minF(v, sub(ausGanz(AN_MAX_WEG), weg));
  const xAlt = g.x;
  const r = bossSchritt(welt, g, mulGanz(schritt, g.blick), dz);
  const wegNeu = add(weg, abs(sub(g.x, xAlt)));
  const laufN = lies(g, 'lauf_n') + 1;
  setze(g, 'lauf_n', laufN);
  setze(g, 'lauf_weg', wegNeu);
  if (r.blockiert_x || laufN >= AN_MAX_FRAMES || wegNeu >= ausGanz(AN_MAX_WEG)) setze(g, 'lauf_ende', 1);
  if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = true;
}

/** Auslauf nach dem Ansturm: 4 px/Frame, je Frame 0,25 weniger (15 Frames, 30 px), in Blickrichtung. */
function auslaufSchritt(welt: Welt, g: Gegner): void {
  g.aktion = 'NACHLAUF';
  const n = lies(g, 'auslauf_n') + 1;
  setze(g, 'auslauf_n', n);
  const v = sub(AN_V, mulGanz(AN_AUSLAUF_ABNAHME, n));
  if (v > 0) bossSchritt(welt, g, mulGanz(v, g.blick), 0);
}

/** Höhe der Körperpresse nach k Bahnframes (Verlauf S2, werte.ts KP_STEIG_FAKTOR, KP_FALL_FAKTOR). */
export function presseHoehe(k: number): Fest {
  if (k >= KP_LANDUNG) return 0;
  const d = k <= KP_SCHEITEL_FRAME ? KP_SCHEITEL_FRAME - k : k - KP_SCHEITEL_FRAME;
  const faktor = k <= KP_SCHEITEL_FRAME ? KP_STEIG_FAKTOR : KP_FALL_FAKTOR;
  return sub(KP_SCHEITEL_HOEHE, mulGanz(faktor, d * d));
}

/**
 * Körperpresse (Welt 7.3): Hocke B bis B+14 (15 Frames), Absprung in
 * A = B+15 zum Ort der Figur in A (höchstens 200 px); nach k Bahnframes
 * x(A) + ⌊d·k/64⌋ (Kampf 2.4), ebenso z (Festlegung K4), Landung in A+64,
 * nach einem wirksamen Treffer 7 Stoppframes (Landung A+71). Aktiv
 * Bahnframe 51 bis 62. Nachlauf 40 Frames nach dem letzten aktiven Frame;
 * NACHLAUF ab dem Frame nach der Landung. Bei der Landung beginnt das
 * Bildschütteln (KA10).
 */
function presseSchritt(welt: Welt, g: Gegner): void {
  const b = g.angriff_a;
  const n = welt.frame - b;
  if (g.modus === 'ANKUENDIGUNG') {
    if (n < KP_HOCKE) {
      g.aktion = 'ANKUENDIGUNG';
      return;
    }
    // A: Absprung, Ziel ist der Ort der Figur in A
    modusSetzen(g, 'ANGRIFF');
    g.aktion = 'ANGRIFF';
    const grenze = ausGanz(KP_MAX_WEG);
    let dx = sub(welt.figur.x, g.x);
    if (dx > grenze) dx = grenze;
    if (dx < neg(grenze)) dx = neg(grenze);
    setze(g, 'kp_x0', g.x);
    setze(g, 'kp_z0', g.z);
    setze(g, 'kp_dx', dx);
    setze(g, 'kp_dz', sub(welt.figur.z, g.z));
    setze(g, 'kp_k', 0);
    g.ziel_x = ganz(add(g.x, dx));
    g.ziel_abstand = ganz(dx) * g.blick;
    return;
  }
  if (g.modus === 'ANGRIFF' && lies(g, 'kp_k') >= KP_LANDUNG) {
    nachlaufBeginnen(g, lies(g, 'kp_letzt') + KP_NACHLAUF + 1);
  }
  presseBahn(welt, g);
  g.aktion = lies(g, 'kp_k') >= KP_LANDUNG && g.modus === 'NACHLAUF' ? 'NACHLAUF' : 'ANGRIFF';
}

/** Ein Frame der Pressenbahn (auch im Nachlauf, bis zur Landung). */
function presseBahn(welt: Welt, g: Gegner): void {
  let k = lies(g, 'kp_k');
  if (k >= KP_LANDUNG) return;
  const stopp = lies(g, 'kp_stopp');
  if (stopp > 0) {
    setze(g, 'kp_stopp', stopp - 1);
    return;
  }
  k += 1;
  setze(g, 'kp_k', k);
  g.x = add(lies(g, 'kp_x0'), divGanz(Math.imul(lies(g, 'kp_dx'), k), KP_X_TEILER));
  g.z = add(lies(g, 'kp_z0'), divGanz(Math.imul(lies(g, 'kp_dz'), k), KP_X_TEILER));
  g.h = presseHoehe(k);
  if (k === KP_LANDUNG) {
    setze(g, 'kp_landung', welt.frame);
    // Bildschütteln ab der Landung (Welt 3, KA10) über die Hilfe von K3
    schuettelnStarten(welt, 'presse');
  }
  if (k >= KP_AKTIV_VON && k <= KP_AKTIV_BIS && eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = true;
  if (k === KP_AKTIV_BIS) setze(g, 'kp_letzt', welt.frame);
}

// ===========================================================================
// KS7: wirksamer Treffer der eigenen Instanz (Welt 5.4 Punkt 5, 7.3)
// ===========================================================================

/** Seite des Urhebers: Armschwung weiter (E18), Ansturm endet, Presse stoppt 7 Frames. */
export function angriffGetroffen(g: Gegner): void {
  setze(g, 'treffer', 1);
  const art = lies(g, 'art');
  if (art === ART_AN) setze(g, 'lauf_ende', 1);
  else if (art === ART_KP) setze(g, 'kp_stopp', GEGNER_TREFFERSTOPP);
}
