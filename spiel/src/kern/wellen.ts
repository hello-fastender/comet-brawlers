// Aktivierung und Wellen nach docs/spezifikation-welt.md, Abschnitt 4 (K3,
// Stufe 2): aktives Fenster 4.1 (entitaeten.ts imFenster), Warten und
// Aufwachen 4.2, Lebende 4.3, Auslöser 4.4, LP beim Erscheinen 4.5,
// Bossarena 4.6, Wellentabelle der Scheibe 4.7 (daten/stages/scheibe.txt).
//
// Ablauf:
//   W3 wellenAnlegen   vorgemerkte Gegner anlegen (Rand: handeln sofort),
//                      dann Weckreiz (Hocke nach Kamera-x des Vorframes,
//                      Versteck, Luke und Boss nach der Auslösung im Vorframe)
//   W7 wellenPruefen   Auslöser (Stand dieses Frames), WL:n, Vormerken,
//                      welt.lebende, welt.wellen.besiegt
//
// Festlegungen K3 (Lücken, Bericht):
// - Der Auslöser figur_abstand misst zu den wartenden Gegnern seiner Welle;
//   hat die Welle keinen, löst er nicht aus.
// - Eine abgeschaltete Welle (welle.n=aus) löst in W7 nie aus und gilt als
//   besiegt. Der Eingriff welle.n jetzt löst sie trotzdem aus und legt ihre
//   neuen Gegner an (ausdrücklicher Wunsch des Prüfstarts).
// - Nach dem Fall des Bosses löst keine Welle mehr aus (Welt 7.6).
// - Einträge brauchen eine Lage in x; die Daten haben nur z. Zulässig sind
//   deshalb nur rand_links und rand_rechts (Welt 4.2); andere Auftritte in
//   `eintrag` sind ein Fehler.
// - Ist kein Gegnerslot frei, entsteht der Gegner nicht (wie Welt 9.1 für
//   Objekte, ohne Ereignis).
// - Vorplatzierte Gegner mit werte=rang bekommen ihre LP beim Weckreiz
//   (Erscheinen), mit dem Rang dieses Frames.

import type { Auftritt, Gegner, GegnerTyp, Rolle } from './entitaeten.ts';
import type { Vormerkung, Welt, WelleZustand } from './welt.ts';
import { ausGanz, divGanz, ganz } from './festkomma.ts';
import { ZUSTAND_BODEN, blickZu, freierGegner, gegnerBelegen, istLebend, modusSetzen } from './entitaeten.ts';
import { EREIGNIS, ereignis } from './ereignisse.ts';
import { gegnerUebergeben, gegnerZufallGeben, rolleVon } from './anlegen.ts';
import { bosskistenZerbrechen } from './gegenstaende.ts';
import { kameraBlende } from './kamera.ts';
import {
  AUFTRITT_BOSS,
  AUFTRITT_HOCKE_BOLZER,
  AUFTRITT_HOCKE_RAMMBOCK,
  AUFTRITT_LUKE,
  AUFTRITT_RAND,
  AUFTRITT_VERSTECK,
  BOSS_SLOT,
  LP_BOLZER_O,
  LP_BOLZER_U,
  LP_RAMMBOCK_O,
  LP_RAMMBOCK_U,
  LP_ZUENDER_O,
  LP_ZUENDER_U,
  RAND_LINKS_X,
  RAND_RECHTS_X,
  RANG_LP_FAKTOR,
  RANG_LP_RUNDUNG,
  RANG_LP_TEILER,
  RANG_MAX,
  RANG_MIN,
  WECKREIZ_HOCKE,
} from './werte.ts';

/**
 * Die Welle des Bosses (in der Scheibe Welle 7, Welt 4.6, 4.7): welle.7=nur_boss
 * (Welt 11.3) nimmt ihr die neuen Gegner. Aus den Stage-Daten statt als Zahl.
 */
function istBosswelleOhneEintraege(welt: Welt, nr: number): boolean {
  if (!welt.wellen.nur_boss) return false;
  return welt.stage.gegner.some((g) => g.typ === 'Ballast' && g.welle === nr);
}

// ===========================================================================
// LP nach Rang (Welt 4.5, 8)
// ===========================================================================

function lpSpanne(typ: GegnerTyp | '', rolle: Rolle): [number, number] {
  if (typ === 'Rammbock' || (typ === 'Puppe' && rolle === 'schwer')) return [LP_RAMMBOCK_U, LP_RAMMBOCK_O];
  if (typ === 'Zünder' || (typ === 'Puppe' && rolle === 'fern')) return [LP_ZUENDER_U, LP_ZUENDER_O];
  return [LP_BOLZER_U, LP_BOLZER_O];
}

/** LP = ⌊(34·U + 2·(O − U)·(Rang − 7) + 17) / 34⌋ (Welt 8), Rang auf 7 bis 24 begrenzt. */
export function lpNachRang(typ: GegnerTyp | '', rolle: Rolle, rang: number): number {
  const [u, o] = lpSpanne(typ, rolle);
  const r = Math.min(RANG_MAX, Math.max(RANG_MIN, rang));
  return divGanz(RANG_LP_TEILER * u + RANG_LP_FAKTOR * (o - u) * (r - RANG_MIN) + RANG_LP_RUNDUNG, RANG_LP_TEILER);
}

/** Setzt LP und Max-LP nach dem Rang dieses Frames plus Bonus (g.timer.bonus) und löscht lp_offen. */
function lpNachRangSetzen(welt: Welt, g: Gegner): void {
  const bonus = g.timer['bonus'] ?? 0;
  g.rang_beim_erscheinen = welt.rang.rang;
  g.lp = lpNachRang(g.typ, g.rolle, welt.rang.rang) + bonus;
  g.lp_max = g.lp;
  g.lp_vor = g.lp;
  g.lp_offen = false;
}

/**
 * Nach dem Anlegen eines Gegners mit Logik an außer dem Boss (erzeugeWelt,
 * Eingriff „erscheint“, Wellen): Ist g.lp_offen, LP und lp_max nach dem Rang
 * setzen (Welt 4.5, 8; Bonus der Welle in g.timer.bonus). Wartende (WARTEN)
 * bekommen ihre LP erst beim Weckreiz. Der Modus bleibt: WARTEN (aus der
 * Stage) bzw. FREI (Prüfszene, Rand; wach und kampffähig).
 */
export function gegnerAngelegt(welt: Welt, g: Gegner): void {
  if (g.lp_offen && g.modus !== 'WARTEN') lpNachRangSetzen(welt, g);
}

// ===========================================================================
// Weckreiz (Welt 4.2)
// ===========================================================================

/** Dauer bis kampffähig je Auftritt (Welt 4.2). */
export function auftrittDauer(auftritt: Auftritt, typ: GegnerTyp | ''): number {
  switch (auftritt) {
    case 'hocke':
      return typ === 'Rammbock' ? AUFTRITT_HOCKE_RAMMBOCK : AUFTRITT_HOCKE_BOLZER;
    case 'versteck':
      return AUFTRITT_VERSTECK;
    case 'luke':
      return AUFTRITT_LUKE;
    case 'boss':
      return AUFTRITT_BOSS;
    default:
      return AUFTRITT_RAND;
  }
}

/**
 * Weckreiz im Frame w (Welt 4.2): AUFTRITT ab w, kampffähig ab w + Dauer
 * (g.kampffaehig_ab), bis dahin nicht treffbar und nicht greifbar (Zustand 2),
 * aber lebend. Ereignis WK:sn. Beim Boss zerbrechen alle Bosskisten (4.6).
 */
function weckreiz(welt: Welt, g: Gegner): void {
  const w = welt.frame;
  modusSetzen(g, 'AUFTRITT');
  g.aktion = 'AUFTRITT';
  g.zustand = ZUSTAND_BODEN;
  g.weckreiz_w = w;
  g.kampffaehig_ab = w + auftrittDauer(g.auftritt, g.typ);
  g.timer['weckreiz_ab'] = 0;
  if (g.lp_offen) lpNachRangSetzen(welt, g);
  ereignis(welt, EREIGNIS.WECKREIZ, g.schluessel);
  if (g.typ === 'Ballast') bosskistenZerbrechen(welt);
}

// ===========================================================================
// W3
// ===========================================================================

/** Legt einen vorgemerkten Gegner am Bildrand an (Welt 4.2: rand_links bei K − 32, rand_rechts bei K + 416). */
function eintragAnlegen(welt: Welt, v: Vormerkung): void {
  const e = v.eintrag;
  const g = freierGegner(welt);
  if (g === null) return;
  gegnerBelegen(g, e.typ);
  const k = welt.kamera.x;
  g.x = ausGanz(k + (e.auftritt === 'rand_links' ? RAND_LINKS_X : RAND_RECHTS_X));
  g.z = ausGanz(e.z);
  g.blick = blickZu(g, welt.figur);
  g.rolle = rolleVon(e.typ);
  g.auftritt = e.auftritt;
  g.welle = e.welle;
  g.werte = 'rang';
  g.vorplatziert = false;
  g.logik = true;
  g.erlaubnis = !welt.start.erlaubnis_aus.includes(g.nr);
  g.rang_beim_erscheinen = welt.rang.rang;
  g.lp_offen = true;
  g.modus = 'FREI';
  g.modus_uhr = 1;
  g.aktion = 'STAND';
  g.timer['bonus'] = v.bonus;
  gegnerZufallGeben(welt, g);
  gegnerUebergeben(welt, g);
}

/**
 * W3 (Welt 1, 4.2, 4.4): in W7 des Vorframes vorgemerkte Gegner anlegen
 * (nach Wellennummer, dann Zeilenfolge), danach Weckreiz: Hockende mit
 * ⌊x⌋ − K ≤ 383 (K des Vorframes), Versteck, Luke und Boss, deren Welle im
 * Vorframe (oder früher in diesem Frame per Eingriff) ausgelöst wurde.
 */
export function wellenAnlegen(welt: Welt): void {
  const f = welt.frame;
  const faellig = welt.wellen.vorgemerkt
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v.frame === f)
    .sort((a, b) => a.v.eintrag.welle - b.v.eintrag.welle || a.i - b.i);
  welt.wellen.vorgemerkt = welt.wellen.vorgemerkt.filter((v) => v.frame > f);
  for (const { v } of faellig) eintragAnlegen(welt, v);

  const kVor = welt.vorframe.kamera_x;
  for (const g of welt.gegner) {
    if (!g.belegt || g.modus !== 'WARTEN') continue;
    const ab = g.timer['weckreiz_ab'] ?? 0;
    if (ab > 0 && f >= ab) weckreiz(welt, g);
    else if (g.auftritt === 'hocke' && ganz(g.x) - kVor <= WECKREIZ_HOCKE) weckreiz(welt, g);
  }
}

// ===========================================================================
// Auslösen (Welt 4.4)
// ===========================================================================

/**
 * Löst Welle nr aus (W7 oder Eingriff ziel=welle.n feld=jetzt in W1,
 * Welt 11.3): genau einmal; Ereignis WL:n; neue Gegner werden für W3 von
 * f + 1 + verzoegerung vorgemerkt (bei welle.7=nur_boss ohne die Bolzer);
 * vorplatzierte Gegner der Welle mit Auftritt Versteck, Luke oder Boss wachen
 * in W3 von f + 1 auf.
 */
export function welleAusloesen(welt: Welt, nr: number): void {
  const f = welt.frame;
  const w = welt.wellen.liste.find((x) => x.satz.nr === nr);
  if (w !== undefined) {
    if (w.ausgeloest) return;
    w.ausgeloest = true;
    w.frame = f;
  } else if (welt.wellen.ausgeloest.includes(nr)) {
    return;
  }
  welt.wellen.ausgeloest.push(nr);
  ereignis(welt, EREIGNIS.WELLE, nr);
  const bonus = w?.satz.bonus ?? 0;
  if (!istBosswelleOhneEintraege(welt, nr)) {
    for (const e of welt.stage.eintraege) {
      if (e.welle !== nr) continue;
      if (e.auftritt !== 'rand_links' && e.auftritt !== 'rand_rechts') {
        throw new RangeError(`Welle ${nr}: Eintrag mit Auftritt „${e.auftritt}“ hat keine Lage in x (nur rand_links, rand_rechts)`);
      }
      if (e.typ === 'Ballast') throw new RangeError(`Welle ${nr}: der Boss kann kein Eintrag sein`);
      welt.wellen.vorgemerkt.push({ frame: f + 1 + e.verzoegerung, eintrag: e, bonus });
    }
  }
  for (const g of welt.gegner) {
    if (!g.belegt || g.welle !== nr || g.modus !== 'WARTEN') continue;
    if (g.auftritt === 'versteck' || g.auftritt === 'luke' || g.auftritt === 'boss') g.timer['weckreiz_ab'] = f + 1;
  }
}

/** LP des Bosses für den Auslöser boss_lp: während einer Folge lp_folge, sonst LP (Welt 4.4, 7.5). */
export function bossLpDauerhaft(g: Gegner): number {
  return g.folge === 1 ? g.lp_folge : g.lp;
}

function ausloeserErfuellt(welt: Welt, w: WelleZustand): boolean {
  const s = w.satz;
  switch (s.ausloeser) {
    case 'kamera':
      return welt.kamera.x >= s.wert;
    case 'figur_abstand': {
      const fx = ganz(welt.figur.x);
      for (const g of welt.gegner) {
        if (!g.belegt || g.welle !== s.nr || g.modus !== 'WARTEN') continue;
        if (Math.abs(fx - ganz(g.x)) <= s.wert) return true;
      }
      return false;
    }
    case 'arena':
      return welt.kamera.modus === 'ARENA' && !kameraBlende(welt);
    case 'boss_lp': {
      const b = welt.gegner[BOSS_SLOT] as Gegner;
      return b.belegt && b.typ === 'Ballast' && bossLpDauerhaft(b) <= s.wert;
    }
  }
}

// ===========================================================================
// W7
// ===========================================================================

/** Hat Welle nr Einträge, die angelegt werden (Welt 2.1; welle.7=nur_boss ohne)? */
function hatEintraege(welt: Welt, nr: number): boolean {
  if (istBosswelleOhneEintraege(welt, nr)) return false;
  return welt.stage.eintraege.some((e) => e.welle === nr);
}

/**
 * Besiegt nach KA4: alle Gegner der Welle sind aufgewacht bzw. angelegt, und
 * ihre LP liegen unter 0. Abgeschaltete Wellen gelten als besiegt.
 */
export function welleBesiegt(welt: Welt, nr: number): boolean {
  const w = welt.wellen.liste.find((x) => x.satz.nr === nr);
  if (w !== undefined && w.aus) return true;
  for (const g of welt.gegner) {
    if (!g.belegt || g.welle !== nr) continue;
    if (g.modus === 'WARTEN' || g.lp >= 0) return false;
  }
  if (hatEintraege(welt, nr)) {
    if (w === undefined || !w.ausgeloest) return false;
    if (welt.wellen.vorgemerkt.some((v) => v.eintrag.welle === nr)) return false;
  }
  return true;
}

/** Zahl der lebenden Gegner nach Welt 4.3. */
export function lebendeZaehlen(welt: Welt): number {
  let n = 0;
  for (const g of welt.gegner) if (istLebend(g)) n += 1;
  return n;
}

/**
 * W7 (Welt 1, 4.4): Auslöser prüfen (Stand dieses Frames, nach der Kamera),
 * Ereignis WL:n, neue Gegner vormerken; danach welt.lebende (4.3) und
 * welt.wellen.besiegt (KA4) für diesen Frame setzen.
 */
export function wellenPruefen(welt: Welt): void {
  const lebende = lebendeZaehlen(welt);
  if (welt.rahmen.boss_t === 0) {
    const liste = [...welt.wellen.liste].sort((a, b) => a.satz.nr - b.satz.nr);
    for (const w of liste) {
      if (w.aus || w.ausgeloest) continue;
      if (!ausloeserErfuellt(welt, w)) continue;
      if (w.satz.lebende_max !== null && lebende > w.satz.lebende_max) continue;
      welleAusloesen(welt, w.satz.nr);
    }
  }
  welt.lebende = lebende;
  const nummern = [...welt.wellen.liste.map((w) => w.satz.nr), ...welt.sperren.map((s) => s.welle)];
  for (const nr of nummern) {
    if (welt.wellen.besiegt.includes(nr)) continue;
    if (welleBesiegt(welt, nr)) welt.wellen.besiegt.push(nr);
  }
}
