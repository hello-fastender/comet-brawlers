// Boss Ballast (K4) nach docs/spezifikation-welt.md, Abschnitt 7 (Werte und
// Zustände 7.1, Rhythmus und Wahl 7.2, Angriffe AS, AN, KP und Stoß RZ 7.3,
// Super-Armor SA1 bis SA6 7.4, Verstärkung 7.5, Fall besiegt alle 7.6),
// Auftritt nach 4.2 und 4.6 und docs/mechanik.md „Boss“.
//
// welt.ts gibt den Boss (typ Ballast, Slot s0) immer an diese Funktionen,
// auch in seinen Reaktionen:
//   W4   bossEntscheidung  Ende des Auftritts, Rückkehr nach Reaktionen,
//                          Gehbefehl, Wahl und Beginn der Angriffe
//                          (boss_angriffe.ts)
//   KS3  bossBewegung      Gehen, Angriffsabläufe, Stoß, eigene Reaktionen
//                          (boss_bahn.ts); setzt instanz.aktiv und den
//                          Frontschutz des Armschwungs (vorn_geschuetzt)
//   KS5  bossAbbruch       nichts: die Angriffe des Bosses brechen nicht ab
//   KS7  bossGetroffen     Zielhandler: LP vorläufig (SA2) oder endgültig
//                          (SA1), Folge, Reaktion nach SA3, Umwerfen, Taumeln, Tod
//   KS7  bossHatGetroffen  Urheber: Armschwung weiter (E18), Ansturm endet,
//                          Trefferstopp der Presse
//   W5   bossW5            Super-Armor (SA5: Rücksprung in h+23, Stoß),
//                          Fall (7.6)
//
// Für andere Module:
//   bossLpDauerhaft(welt)  LP ohne die vorläufigen Abzüge (7.5, Auslöser boss_lp)
// Den Weckreiz (Welt 4.2, 4.6: AUFTRITT, kampffähig ab w+60, Bosskisten
// zerbrechen) führt allein wellen.ts in W3.
// Von anderen Modulen: reaktion.ts todEinleiten, vonFigurWeg (K2, Fall 7.6),
// in boss_bahn.ts bahnStarten, bahnSchritt, reaktionBeenden (Kampf 5.7, 7);
// nah.ts rechteGesperrt (E-10, Welt 5.7, in boss_angriffe.ts); kamera.ts
// schuettelnStarten (K3, Landung der Presse, KA10); gegenstaende.ts
// behaelterHindernisse (Welt 9.2, in boss_zustand.ts).
//
// Abweichungen vom Auftragstext (die Spezifikation gilt): kein Schutz nach
// dem Aufstehen (E4, Welt 7.1); kein kurzer Schlag in der Scheibe (Welt 7.3:
// AS, AN, KP, dazu RZ).

import type { Gegner, Treffer } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import {
  ZUSTAND_BODEN,
  ZUSTAND_NORMAL,
  blickZu,
  freigeben,
  gegnerVon,
  istGegnerSlot,
  istLebend,
  modusSetzen,
} from '../entitaeten.ts';
import { EREIGNIS, ereignis, ereignisTreffer } from '../ereignisse.ts';
import { ganz, mulGanz, neg, sub, minF } from '../festkomma.ts';
import { todEinleiten, vonFigurWeg } from './reaktion.ts';
import {
  BOSS_ABSTAND,
  BOSS_ERSTER_ANGRIFF,
  BOSS_GEHEN_X,
  BOSS_GEHEN_Z,
  BOSS_SLOT,
  ERSTER_FRAME,
  SA_FOLGEFRIST,
} from '../werte.ts';
import { angriffEntscheiden, angriffGetroffen, angriffSchritt, nachlaufVorbei } from './boss_angriffe.ts';
import {
  bereitWerden,
  bossGetroffenBeginnen,
  bossGetroffenSchritt,
  bossTodSchritt,
  bossTotBeginnen,
  bossUmwerfenBeginnen,
  bossUmwerfenSchritt,
  nachStossUnverwundbar,
  stossBeginnen,
  stossSchritt,
  stossVorbei,
  taumelnBeginnen,
  taumelnSchritt,
} from './boss_bahn.ts';
import { bossSchritt, eigeneInstanz, eigenenAngriffBeenden, eigenerAngriff } from './boss_zustand.ts';

// ===========================================================================
// Anlegen, Auftritt (Welt 4.2, 4.6, 11.3)
// ===========================================================================

/**
 * Nach dem Anlegen (erzeugeWelt oder Eingriff): x, z, blick, lp, lp_max,
 * angriffe_an, bewegung_an, werte, auftritt, welle sind gesetzt; modus WARTEN
 * (aus der Stage) bzw. FREI (Prüfszene). Bei welt.wellen.nur_boss (Welt 11.3)
 * wach und kampffähig.
 */
export function bossAngelegt(welt: Welt, g: Gegner): void {
  g.rolle = 'boss';
  g.lp_folge = 0;
  g.folge = 0;
  g.folge_h = 0;
  g.schwung = 0;
  g.naechster_angriff = 0;
  if (g.modus === 'WARTEN' && !welt.wellen.nur_boss) {
    // Welt 4.2: wartend, nicht treffbar und nicht greifbar, unsichtbar
    g.zustand = ZUSTAND_BODEN;
    g.aktion = 'WARTEN';
    return;
  }
  // wach und kampffähig (Prüfszene mit Logik an, welle.7=nur_boss): erster Angriff 60 Frames danach (7.2)
  const ab = Math.max(welt.frame, ERSTER_FRAME);
  g.kampffaehig_ab = ab;
  g.naechster_angriff = ab + BOSS_ERSTER_ANGRIFF;
  // Anfangsmodus wie anlegen.ts (modusAnfang): sn_timer bleibt, wie anlegen.ts ihn gesetzt hat
  g.modus = 'BEREIT';
  g.aktion = 'STAND';
  g.zustand = ZUSTAND_NORMAL;
}

/** Kampfbereit (Welt 4.2, 7.2): BEREIT, erster Angriff 60 Frames danach. */
function kampfbereit(welt: Welt, g: Gegner): void {
  bereitWerden(welt, g);
  g.naechster_angriff = welt.frame + BOSS_ERSTER_ANGRIFF;
}

// ===========================================================================
// Griff durch die Figur (Kampf 7 GEHALTEN, 8; Welt 7.4 SA5)
// ===========================================================================

/** Modi, in denen der Boss nicht gehalten sein kann bzw. ein Halten nicht übernommen wird (Wurf: K1 trägt ihn). */
function haltenUnberuehrt(g: Gegner): boolean {
  switch (g.modus) {
    case 'UMGEWORFEN':
    case 'LIEGEN':
    case 'AUFSTEHEN':
    case 'TOT':
    case 'TAUMELN':
    case 'STOSS':
    case 'WARTEN':
    case 'AUFTRITT':
      return true;
    default:
      return false;
  }
}

/**
 * Gleicht den Griff der Figur ab (K1 setzt gehalten_von): GEHALTEN, Zustand
 * 2, eigener Angriff abgebrochen; die Frist der Super-Armor ruht (SA5).
 * Reißt er sich ohne Umwerfen los, gilt SA5 im Frame danach. Rückgabe: true,
 * solange er gehalten ist.
 */
function haltenAbgleich(welt: Welt, g: Gegner): boolean {
  if (haltenUnberuehrt(g)) {
    g.boss.gehalten = false;
    return false;
  }
  if (g.gehalten_von !== null) {
    if (g.modus !== 'GEHALTEN') {
      eigenenAngriffBeenden(g);
      g.boss.wahl = '';
      modusSetzen(g, 'GEHALTEN');
    }
    g.aktion = 'GEHALTEN';
    g.zustand = ZUSTAND_BODEN;
    g.boss.gehalten = true;
    return true;
  }
  if (g.boss.gehalten) {
    g.boss.gehalten = false;
    if (g.folge === 1) g.boss.sa_faellig = welt.frame + 1;
    if (g.modus === 'GEHALTEN') {
      modusSetzen(g, 'FREI');
      g.aktion = 'STAND';
      g.zustand = ZUSTAND_NORMAL;
    }
  }
  return false;
}

// ===========================================================================
// W4
// ===========================================================================

/** W4: Ende des Auftritts, Fälligkeit und Wahl des Angriffs (g.zufall), Rückkehr nach Reaktionen. */
export function bossEntscheidung(welt: Welt, g: Gegner): void {
  if (!g.belegt || g.modus === 'TOT') return;
  if (g.lp < 0) {
    // LP < 0 ohne Treffer (Eingriff): Tod in diesem Frame, Flug von der Figur weg
    bossTotBeginnen(welt, g, vonFigurWeg(welt, g));
    return;
  }
  // WARTEN: geweckt wird in W3 (wellen.ts, Welt 4.2)
  if (g.modus === 'WARTEN') return;
  if (g.modus === 'AUFTRITT') {
    // kampffähig ab w+60 (wellen.ts setzt kampffaehig_ab beim Weckreiz)
    if (welt.frame < g.kampffaehig_ab) return;
    kampfbereit(welt, g);
  } else {
    if (haltenAbgleich(welt, g)) return;
    switch (g.modus) {
      case 'STOSS':
        if (!stossVorbei(welt, g)) return;
        bereitWerden(welt, g);
        break;
      case 'NACHLAUF':
        if (!nachlaufVorbei(welt, g)) return;
        bereitWerden(welt, g);
        break;
      case 'BEREIT':
        break;
      case 'GETROFFEN':
      case 'UMGEWORFEN':
      case 'LIEGEN':
      case 'AUFSTEHEN':
      case 'TAUMELN':
      case 'ANKUENDIGUNG':
      case 'ANGRIFF':
        return;
      default:
        // FREI nach einer Reaktion (Vertrag 6) oder ein fremder Modus
        bereitWerden(welt, g);
        break;
    }
  }
  bereitEntscheidung(welt, g);
}

/**
 * W4 in BEREIT (Welt 7.1, 7.2): Zustand 1 ab 62 Frames nach dem Stoß, Blick
 * zur Figur, Angriff (Entscheidungsframe), sonst Gehbefehl: in x bis 70 px
 * Abstand (1,25 px/Frame), in der Tiefe zur Figur (0,625 px/Frame, nicht
 * darüber hinaus); Achsen getrennt (Festlegung K4).
 */
function bereitEntscheidung(welt: Welt, g: Gegner): void {
  if (g.zustand === ZUSTAND_BODEN && !nachStossUnverwundbar(welt, g)) g.zustand = ZUSTAND_NORMAL;
  g.boss.geh_x = 0;
  g.boss.geh_z = 0;
  g.blick = blickZu(g, welt.figur);
  if (angriffEntscheiden(welt, g)) return;
  if (!g.logik || !g.bewegung_an) return;
  const dx = ganz(g.x) - ganz(welt.figur.x);
  if (Math.abs(dx) > BOSS_ABSTAND) g.boss.geh_x = dx > 0 ? -1 : 1;
  const zDiff = sub(welt.figur.z, g.z);
  if (zDiff > 0) g.boss.geh_z = minF(BOSS_GEHEN_Z, zDiff);
  else if (zDiff < 0) g.boss.geh_z = neg(minF(BOSS_GEHEN_Z, neg(zDiff)));
}

// ===========================================================================
// KS3, KS5
// ===========================================================================

/** KS3: Bewegung, Angriffsabläufe, Stoß RZ, eigene Reaktionen (Umwerfen, Liegen, Taumeln); g.angriff.aktiv und g.vorn_geschuetzt setzen. */
export function bossBewegung(welt: Welt, g: Gegner): void {
  if (!g.belegt) return;
  if (eigeneInstanz(g) && g.angriff !== null) g.angriff.aktiv = false;
  // Frontschutz gilt nur im Frame, in dem der Armschwung ihn setzt (Welt 7.1)
  g.vorn_geschuetzt = false;
  if (haltenAbgleich(welt, g)) return;
  switch (g.modus) {
    case 'TOT':
      bossTodSchritt(welt, g);
      return;
    case 'UMGEWORFEN':
    case 'LIEGEN':
    case 'AUFSTEHEN':
      bossUmwerfenSchritt(welt, g);
      return;
    case 'GETROFFEN':
      bossGetroffenSchritt(welt, g);
      return;
    case 'TAUMELN':
      taumelnSchritt(welt, g);
      return;
    case 'STOSS':
      stossSchritt(welt, g);
      return;
    case 'ANKUENDIGUNG':
    case 'ANGRIFF':
    case 'NACHLAUF':
      angriffSchritt(welt, g);
      return;
    case 'BEREIT':
      gehenSchritt(welt, g);
      return;
    default:
      return;
  }
}

/** KS3 in BEREIT: der Gehbefehl aus W4 (Band, Hindernisse, Arenarand). */
function gehenSchritt(welt: Welt, g: Gegner): void {
  const gx = g.boss.geh_x;
  const gz = g.boss.geh_z;
  if (gx === 0 && gz === 0) {
    g.aktion = 'STAND';
    return;
  }
  bossSchritt(welt, g, mulGanz(BOSS_GEHEN_X, gx), gz);
  g.aktion = 'GEHEN';
}

/**
 * KS5: nichts zu tun. Die Angriffe des Bosses brechen nicht ab (Welt 7.3, kein
 * Abbruchfenster); das Ende des Ansturms an Wand und Arenarand prüft
 * bossBewegung beim Schritt.
 */
export function bossAbbruch(welt: Welt, g: Gegner): void {}

// ===========================================================================
// KS7: Treffer auf den Boss (Kampf 6.2; Welt 7.4)
// ===========================================================================

/** Art eines Treffers für die Super-Armor (Welt 7.4). */
type TrefferArt = 'vorlaeufig' | 'endgueltig' | 'umwerfend' | 'spezial';

/**
 * SA1: Spezialangriff, Kniestoß, Wurf, Explosion (und Landung beim
 * Neueinstieg) ziehen endgültig ab, umwerfende Treffer ebenso und werfen um;
 * SA2: der Sprungangriff runter zieht endgültig ab, ohne umzuwerfen; jeder
 * andere Treffer ohne Umwerfen (Kettenstufen 1 bis 3) zieht vorläufig ab.
 */
const ENDGUELTIG: readonly string[] = ['KN', 'WU', 'RX', 'LN', 'ST'];

function trefferArt(t: Treffer): TrefferArt {
  if (t.code === 'SP') return 'spezial';
  if (t.umwerfen) return 'umwerfend';
  if (ENDGUELTIG.includes(t.code)) return 'endgueltig';
  return 'vorlaeufig';
}

/** Folge beenden, alle Abzüge bleiben (SA4, SA6, Spezialangriff nach SA2); lp_folge ist außerhalb einer Folge 0. */
function folgeBeenden(g: Gegner): void {
  g.folge = 0;
  g.lp_folge = 0;
  g.boss.sa_faellig = 0;
}

/**
 * Reaktion nach SA3 auf einen Treffer ohne Umwerfen: außerhalb eines eigenen
 * Angriffs GETROFFEN (bzw. neu gestartet); im eigenen Angriff nur bei einem
 * Treffer von hinten (bricht ab), einer von vorn unterbricht nichts; in der
 * Luft (Körperpresse) unterbricht kein Treffer (Festlegung K4). Gehalten:
 * keine Reaktion (Kampf 7, GEHALTEN).
 */
function reaktionNachSA3(welt: Welt, g: Gegner, t: Treffer): void {
  if (g.modus === 'GEHALTEN') return;
  if (eigenerAngriff(g) && (t.von_vorn || g.h > 0)) return;
  bossGetroffenBeginnen(welt, g);
}

/**
 * KS7, Zielhandler für den Boss (Kampf 6.2; Welt 7.4): t.lp_vorher, t.wirkung,
 * als Erstes ereignisTreffer(welt, t), dann LP (vorläufig oder endgültig),
 * Folge (lp_folge, folge, folge_h), Reaktion nach SA3, Umwerfen nach SA1.
 */
export function bossGetroffen(welt: Welt, t: Treffer): void {
  const g = gegnerVon(welt, t.ziel);
  if (g === null) throw new Error(`bossGetroffen: ${t.ziel} ist kein Gegnerslot`);
  t.lp_vorher = g.lp;
  if (g.modus === 'TOT') {
    // nimmt keine Treffer an (Kampf 7); treffer.ts legt keine an, nur zur Sicherheit
    t.wirkung = 'X';
    ereignisTreffer(welt, t);
    return;
  }
  const art = trefferArt(t);
  const lpNeu = g.lp - t.schaden;
  t.wirkung = lpNeu < 0 ? 'X' : art === 'umwerfend' ? 'U' : 'R';
  ereignisTreffer(welt, t);
  g.lp = lpNeu;
  g.letzter_angreifer = t.urheber;
  if (t.urheber === 'f') g.getroffen_frame = welt.frame;

  if (lpNeu < 0) {
    // SA6: stirbt sofort, die Folge zählt
    bossTotBeginnen(welt, g, t.richtung);
    return;
  }
  switch (art) {
    case 'umwerfend':
      // SA1, SA4
      folgeBeenden(g);
      bossUmwerfenBeginnen(welt, g, t);
      return;
    case 'spezial':
      // SA1, SA2 letzter Satz: alle Abzüge bleiben, kein Stoß, Taumeln (7.1)
      folgeBeenden(g);
      taumelnBeginnen(welt, g, t);
      return;
    case 'vorlaeufig':
      // SA2: der erste vorläufige Treffer eröffnet die Folge
      if (g.folge === 0) {
        g.folge = 1;
        g.lp_folge = t.lp_vorher;
      }
      g.folge_h = welt.frame;
      g.boss.sa_faellig = 0;
      reaktionNachSA3(welt, g, t);
      return;
    case 'endgueltig':
      // SA2: während einer offenen Folge zählt er als Treffer der Folge und senkt auch lp_folge
      if (g.folge === 1) {
        g.lp_folge -= t.schaden;
        g.folge_h = welt.frame;
        g.boss.sa_faellig = 0;
      }
      reaktionNachSA3(welt, g, t);
      return;
  }
}

/** KS7, Seite des Urhebers: wirksamer Treffer des Bosses (Armschwung weiter nach E18, Trefferstopp +7). */
export function bossHatGetroffen(welt: Welt, t: Treffer): void {
  const g = gegnerVon(welt, t.urheber);
  if (g === null || !g.belegt || g.angriff === null || g.angriff !== t.instanz) return;
  angriffGetroffen(g);
}

// ===========================================================================
// W5: Super-Armor, Fall, Bildschütteln
// ===========================================================================

/**
 * W5 (Welt 1, 7.4, 7.6): Super-Armor auswerten (SA5: Rücksprung in h+23,
 * Ereignis SA:s0:lp, Stoß), Fall des Bosses (alle übrigen lebenden Gegner LP −1
 * und TOT mit ohne_punkte = true, Geschosse der Gegner verschwinden, scharfe
 * Wellen entfallen, Ereignis BF:s0).
 */
export function bossW5(welt: Welt): void {
  const g = welt.gegner[BOSS_SLOT] as Gegner;
  if (!g.belegt || g.typ !== 'Ballast') return;
  haltenAbgleich(welt, g);
  if (g.lp < 0 && g.modus !== 'TOT') bossTotBeginnen(welt, g, vonFigurWeg(welt, g));
  superArmor(welt, g);
  // Fall genau einmal: in W5 von t, vor rahmenW5 (welt.rahmen.boss_t ist dann noch 0)
  if (g.modus === 'TOT' && welt.rahmen.boss_t === 0) fall(welt, g);
  stossNachAngriff(welt, g);
}

/**
 * SA5: Kommt bis einschließlich h+23 kein neuer Treffer der Folge, springen in
 * W5 von h+23 die LP auf lp_folge zurück, die Folge endet, und der Stoß
 * beginnt; läuft gerade ein Angriff, folgt er nach dessen Ende. Gehalten ruht
 * die Frist; nach dem Losreißen gilt SA5 im Frame danach.
 */
function superArmor(welt: Welt, g: Gegner): void {
  if (g.folge !== 1 || g.modus === 'TOT') return;
  if (g.gehalten_von !== null || g.modus === 'GEHALTEN') return;
  const faellig = g.boss.sa_faellig > 0 ? g.boss.sa_faellig : g.folge_h + SA_FOLGEFRIST;
  if (welt.frame < faellig) return;
  g.lp = g.lp_folge;
  g.folge = 0;
  g.lp_folge = 0;
  g.boss.sa_faellig = 0;
  ereignis(welt, EREIGNIS.SUPER_ARMOR, g.schluessel, g.lp);
  if (eigenerAngriff(g)) g.boss.stoss_offen = true;
  else if (g.modus !== 'STOSS') stossBeginnen(welt, g);
}

/** Aufgeschobener Stoß (SA5): beginnt in W5 des ersten Frames nach den aktiven Frames des Angriffs bzw. nach einer Reaktion. */
function stossNachAngriff(welt: Welt, g: Gegner): void {
  if (!g.boss.stoss_offen) return;
  if (g.modus === 'NACHLAUF' || g.modus === 'BEREIT' || g.modus === 'FREI') stossBeginnen(welt, g);
}

/**
 * Fall des Bosses (Welt 7.6), in W5 des Frames t: alle übrigen lebenden
 * Gegner LP −1 und TOT (Flug von der Figur weg, ohne Punkte, ohne Waffe),
 * Geschosse der Gegner verschwinden, scharfe und vorgemerkte Wellen
 * entfallen, Ereignis BF:s0; welt.rahmen.boss_t = t (Welt 10.5).
 */
function fall(welt: Welt, g: Gegner): void {
  for (const o of welt.gegner) {
    if (o === g || !istLebend(o)) continue;
    o.lp = -1;
    o.ohne_punkte = true;
    // Tod nach Kampf 7 über die Hilfe von K2 (Bahn F4, Rechte, Slot frei in t+79)
    todEinleiten(welt, o, 'F4', vonFigurWeg(welt, o));
  }
  for (const o of welt.objekte) {
    if (!o.belegt || (o.typ !== 'Rakete' && o.typ !== 'Effekt')) continue;
    const besitzer = o.besitzer ?? o.angriff?.urheber ?? null;
    if (besitzer !== null && istGegnerSlot(besitzer)) freigeben(o);
  }
  for (const w of welt.wellen.liste) if (!w.ausgeloest) w.aus = true;
  welt.wellen.vorgemerkt = [];
  ereignis(welt, EREIGNIS.BOSS_FALL, g.schluessel);
  welt.rahmen.boss_t = welt.frame;
}

// ===========================================================================
// Für andere Module
// ===========================================================================

/**
 * Dauerhaft abgezogene LP des Bosses (Welt 4.4 Auslöser boss_lp, 7.5): während
 * einer Folge (folge = 1) lp_folge, sonst LP; null ohne Boss in s0.
 * Außerhalb einer Folge ist lp_folge 0 (Spalte s0_lpfolge).
 */
export function bossLpDauerhaft(welt: Welt): number | null {
  const g = welt.gegner[BOSS_SLOT] as Gegner;
  if (!g.belegt || g.typ !== 'Ballast') return null;
  return g.folge === 1 ? g.lp_folge : g.lp;
}
