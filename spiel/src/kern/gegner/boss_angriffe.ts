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

import type { BossAngriff, Flaeche, Gegner } from '../entitaeten.ts';
import type { Fest } from '../festkomma.ts';
import type { Welt } from '../welt.ts';
import { ZUSTAND_NORMAL, angriffsinstanz, blickZu, modusSetzen } from '../entitaeten.ts';
import { EREIGNIS, ereignis } from '../ereignisse.ts';
import { abs, add, ausGanz, divGanz, ganz, minF, mul, mulGanz, neg, sub } from '../festkomma.ts';
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
  KP_Z_ANTEIL,
} from '../werte.ts';
import { bossSchritt, eigeneInstanz, festZahl } from './boss_zustand.ts';
import { rechteGesperrt } from './nah.ts';

/** Angriff der Scheibe (Welt 7.3), ohne die leere Kennung. */
type Angriff = Exclude<BossAngriff, ''>;

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

/** Ist code ein Angriff der Scheibe (Welt 7.3)? */
function istAngriff(code: string): code is Angriff {
  return code === 'AS' || code === 'AN' || code === 'KP';
}

/** Wahl nach Abstand (Welt 7.2), eine Ziehung aus g.zufall; fest.boss_angriff ersetzt das Ergebnis. */
function angriffWaehlen(welt: Welt, g: Gegner): Angriff {
  const { dx } = abstandWelt(welt, g);
  const liste = Math.abs(dx) < BOSS_WAHL_GRENZE ? BOSS_WAHL_NAH : BOSS_WAHL_FERN;
  const code = wahl(g.zufall, liste);
  const fest = welt.fest['boss_angriff'];
  if (fest !== undefined) {
    if (!istAngriff(fest)) throw new RangeError(`fest.boss_angriff muss AS, AN oder KP sein, nicht „${fest}“`);
    return fest;
  }
  if (!istAngriff(code)) throw new RangeError(`Wahltabelle des Bosses enthält „${code}“ (nur AS, AN, KP)`);
  return code;
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
  // E-10 (Welt 5.7): dieselbe Sperre wie für die Rechte der Nahkämpfer
  if (rechteGesperrt(welt)) return false;
  let art = g.boss.wahl;
  if (art === '') {
    art = angriffWaehlen(welt, g);
    g.boss.wahl = art;
  }
  if (art === 'AS') {
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
function angriffBeginnen(welt: Welt, g: Gegner, art: Angriff): void {
  const f = welt.frame;
  g.boss.wahl = '';
  g.boss.art = art;
  g.boss.treffer = false;
  g.boss.geh_x = 0;
  g.boss.geh_z = 0;
  g.blick = blickZu(g, welt.figur);
  const stufe = rangstufe(welt.rang.rang);
  const tabelle = art === 'AS' ? AS_SCHADEN : art === 'AN' ? AN_SCHADEN : KP_SCHADEN;
  g.schaden = tabelle[stufe] as number;
  let d = bereich(g.zufall, BOSS_ABSTAND_VON, BOSS_ABSTAND_BIS);
  d = festZahl(welt, 'boss_abstand', BOSS_ABSTAND_VON, BOSS_ABSTAND_BIS) ?? d;
  g.naechster_angriff = f + d;
  g.angriff_a = f;
  g.ziel_abstand = 0;
  g.ziel_x = 0;
  modusSetzen(g, 'ANKUENDIGUNG');
  g.aktion = 'ANKUENDIGUNG';
  if (art === 'AS') {
    schwungBeginnen(welt, g, 1);
    return;
  }
  g.schwung = 0;
  g.phase = '';
  g.angriff_code = art;
  if (art === 'AN') {
    g.boss.lauf_n = 0;
    g.boss.lauf_weg = 0;
    g.boss.lauf_ende = false;
    g.boss.auslauf_n = 0;
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
    g.boss.kp_k = 0;
    g.boss.kp_stopp = 0;
    g.boss.kp_letzt = 0;
    g.boss.kp_landung = 0;
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
  g.angriff_code = 'AS' + String(k);
  g.boss.schwung_a = welt.frame;
  g.boss.treffer = false;
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
  g.boss.bereit_ab = bereitAb;
}

/** Ist der Nachlauf vorbei (W4)? */
export function nachlaufVorbei(welt: Welt, g: Gegner): boolean {
  return welt.frame >= g.boss.bereit_ab;
}

// ===========================================================================
// KS3: Abläufe
// ===========================================================================

/** KS3 in ANKUENDIGUNG, ANGRIFF, NACHLAUF: Ablauf des laufenden Angriffs; setzt instanz.aktiv für diesen Frame. */
export function angriffSchritt(welt: Welt, g: Gegner): void {
  if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = false;
  const art = g.boss.art;
  if (art === 'AS') armschwungSchritt(welt, g);
  else if (art === 'AN') ansturmSchritt(welt, g);
  else if (art === 'KP') presseSchritt(welt, g);
}

/**
 * Armschwung (Welt 7.3, E18): Schwung k holt in A_k bis A_k+16 aus, aktiv
 * A_k+17 bis A_k+19, nach einem wirksamen Treffer 7 Frames länger (Welt 5.4
 * Punkt 5). Von vorn ist der Boss nur im ersten aktiven Frame treffbar, in
 * den übrigen aktiven Frames nicht (Welt 7.1, vorn_geschuetzt). Hat
 * Schwung k (k = 1, 2) wirksam getroffen, beginnt Schwung k+1 in A_k+36;
 * sonst endet die Serie. Nachlauf 30 Frames nach dem letzten aktiven Frame
 * des letzten Schwungs.
 */
function armschwungSchritt(welt: Welt, g: Gegner): void {
  if (g.modus === 'NACHLAUF') return;
  const a = g.boss.schwung_a;
  const n = welt.frame - a;
  const getroffen = g.boss.treffer;
  const bis = AS_AKTIV_BIS + (getroffen ? GEGNER_TREFFERSTOPP : 0);
  if (n < AS_AKTIV_VON) {
    g.aktion = 'ANKUENDIGUNG';
    return;
  }
  if (n <= bis) {
    modusSetzen(g, 'ANGRIFF');
    g.aktion = 'ANGRIFF';
    if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = true;
    // von vorn nur im ersten aktiven Frame treffbar (Gleichstand, Kampf 5.4), danach geschützt (Welt 7.1)
    g.vorn_geschuetzt = n > AS_AKTIV_VON;
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
  if (g.boss.lauf_ende) {
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
  const weg = g.boss.lauf_weg;
  const schritt = minF(v, sub(ausGanz(AN_MAX_WEG), weg));
  const xAlt = g.x;
  const r = bossSchritt(welt, g, mulGanz(schritt, g.blick), dz);
  const wegNeu = add(weg, abs(sub(g.x, xAlt)));
  const laufN = g.boss.lauf_n + 1;
  g.boss.lauf_n = laufN;
  g.boss.lauf_weg = wegNeu;
  if (r.blockiert_x || laufN >= AN_MAX_FRAMES || wegNeu >= ausGanz(AN_MAX_WEG)) g.boss.lauf_ende = true;
  if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = true;
}

/** Auslauf nach dem Ansturm: 4 px/Frame, je Frame 0,25 weniger (15 Frames, 30 px), in Blickrichtung. */
function auslaufSchritt(welt: Welt, g: Gegner): void {
  g.aktion = 'NACHLAUF';
  const n = g.boss.auslauf_n + 1;
  g.boss.auslauf_n = n;
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
 * A = B+15 zum Ort der Figur in A (in x höchstens 200 px); nach k
 * Bahnframes x(A) + ⌊d·k/64⌋ (Kampf 2.4), z(A) + dz · k/64 als
 * Festkommaprodukt ohne Division und ohne Grenze (Festlegung K4, werte.ts
 * KP_Z_ANTEIL; Kampf 2.4 nennt nur x), Landung in A+64,
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
    g.boss.kp_x0 = g.x;
    g.boss.kp_z0 = g.z;
    g.boss.kp_dx = dx;
    g.boss.kp_dz = sub(welt.figur.z, g.z);
    g.boss.kp_k = 0;
    g.ziel_x = ganz(add(g.x, dx));
    g.ziel_abstand = ganz(dx) * g.blick;
    return;
  }
  if (g.modus === 'ANGRIFF' && g.boss.kp_k >= KP_LANDUNG) {
    nachlaufBeginnen(g, g.boss.kp_letzt + KP_NACHLAUF + 1);
  }
  presseBahn(welt, g);
  g.aktion = g.boss.kp_k >= KP_LANDUNG && g.modus === 'NACHLAUF' ? 'NACHLAUF' : 'ANGRIFF';
}

/** Ein Frame der Pressenbahn (auch im Nachlauf, bis zur Landung). */
function presseBahn(welt: Welt, g: Gegner): void {
  const p = g.boss;
  if (p.kp_k >= KP_LANDUNG) return;
  if (p.kp_stopp > 0) {
    p.kp_stopp -= 1;
    return;
  }
  const k = p.kp_k + 1;
  p.kp_k = k;
  g.x = add(p.kp_x0, divGanz(Math.imul(p.kp_dx, k), KP_X_TEILER));
  g.z = add(p.kp_z0, mul(p.kp_dz, mulGanz(KP_Z_ANTEIL, k)));
  g.h = presseHoehe(k);
  if (k === KP_LANDUNG) {
    p.kp_landung = welt.frame;
    // Bildschütteln ab der Landung (Welt 3, KA10) über die Hilfe von K3
    schuettelnStarten(welt, 'presse');
  }
  if (k >= KP_AKTIV_VON && k <= KP_AKTIV_BIS && eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = true;
  if (k === KP_AKTIV_BIS) p.kp_letzt = welt.frame;
}

// ===========================================================================
// KS7: wirksamer Treffer der eigenen Instanz (Welt 5.4 Punkt 5, 7.3)
// ===========================================================================

/** Seite des Urhebers: Armschwung weiter (E18), Ansturm endet, Presse stoppt 7 Frames. */
export function angriffGetroffen(g: Gegner): void {
  g.boss.treffer = true;
  if (g.boss.art === 'AN') g.boss.lauf_ende = true;
  else if (g.boss.art === 'KP') g.boss.kp_stopp = GEGNER_TREFFERSTOPP;
}
