// Trefferprüfung (K2) nach docs/spezifikation-kampf.md, Abschnitt 5 (Flächen
// 5.1, aktive Frames und Trefferstopp 5.3, Reihenfolge im Frame 5.4, ein
// Treffer je Ziel 5.5, Gegnerangriffe und Geschosse 5.8) und Prüfangriffe
// (11.2). Behälter als Trefferziele nach docs/spezifikation-welt.md, 9.2.
//
// Eingang: die Angriffsinstanzen in figur.angriff, geschosse[n].angriff,
// gegner[n].angriff und objekte[n].angriff (gemeinsame Schnittstelle
// Angriffsinstanz aus entitaeten.ts; aktiv vom Besitzer vor KS6 gesetzt).
// Ausgang: welt.treffer in der Reihenfolge von Kampf 5.4; jede Instanz trägt
// ihre Ziele in getroffen ein. LP, Reaktion und Ereignis T schreiben erst die
// Zielhandler in KS7; trefferFolgen räumt danach auf (P11).
//
// Reihenfolge in trefferPruefen (Kampf 5.4):
//   1. figur.angriff, dann g0 bis g4: gegen Gegner s0 bis s19, dann Behälter o20 bis o59
//   2. geworfener Gegner (Instanz WG am Gegnerslot, gegen 'gegner'), Slots aufsteigend
//   3. gegner[s0 … s19].angriff und objekte[o20 … o59].angriff gegen die Figur,
//      dann gegen Behälter. Ein Gegner, der in 1 oder 2 getroffen wurde,
//      prüft in 3 nicht (Angriff abgebrochen; der Boss nur in diesem Frame
//      nicht, SA3); ein sterbender Gegner trifft nie.
//
// Innerhalb eines Frames rechnet die Prüfung die Folgen schon angelegter
// Treffer vor (Festlegung K2): Ein Gegner, der umgeworfen wird oder unter
// 0 LP fällt, und ein schon getroffener Behälter sind für spätere Instanzen
// desselben Frames nicht mehr treffbar (wie bei sofortiger Anwendung im
// Vorbild); für spätere Frames dieser Instanzen bleibt das Ziel offen (5.5).
// Die Figur prüft figurGetroffen der Reihe nach selbst (Schutz nach dem
// ersten wirksamen Treffer macht weitere wirkungslos).

import type { Angriffsinstanz, Blick, EntitaetBasis, Gegner, GegnerModus, Objekt, SlotKey, Treffer } from './entitaeten.ts';
import type { PruefangriffDaten } from './start.ts';
import type { Welt } from './welt.ts';
import {
  ZUSTAND_NORMAL,
  ZUSTAND_REAKTION,
  abstand,
  angriffsinstanz,
  entitaet,
  gegnerVon,
  imFenster,
  istGegnerSlot,
  istReaktion,
  schautZu,
} from './entitaeten.ts';
import { ganz } from './festkomma.ts';
import { IM_BILD_MAX, PA_HINTEN, PA_HOEHE_MAX, PA_TIEFE, PA_VORN } from './werte.ts';

// ===========================================================================
// Treffbarkeit
// ===========================================================================

/** Modi, in denen ein Gegner für keinen Angriff treffbar ist (Kampf 5.5, 7; Welt 4.2). */
const NICHT_TREFFBAR: readonly GegnerModus[] = ['UMGEWORFEN', 'LIEGEN', 'AUFSTEHEN', 'TOT', 'GEHALTEN', 'WARTEN', 'AUFTRITT'];

/** Angriffe der haltenden Figur, die den gehaltenen Gegner treffen (Kampf 5.5, 7 GEHALTEN). */
const GEHALTEN_TREFFBAR_DURCH: readonly string[] = ['KN', 'WU', 'SP'];

/**
 * timer-Schlüssel für K4 (VORSCHLAG: eigenes Feld am Gegner): steht er beim
 * Boss auf 1, ist der Boss in diesem Frame von vorn nicht treffbar (Armschwung
 * ab dem zweiten aktiven Frame, Welt 7.1; mechanik „Boss“, Trefferbar in
 * seinem Angriff); von hinten bleibt er treffbar.
 */
export const TIMER_VORN_GESCHUETZT = 'vorn_geschuetzt';

/**
 * Ist der Gegner für Angriffe der Figur treffbar (Kampf 5.5, Welt 4.1)?
 * Belegt, Zustand 1 oder 3, nicht umgeworfen, liegend, aufstehend, tot,
 * gehalten, wartend oder im Auftritt, LP ≥ 0 und im aktiven Fenster
 * −64 ≤ ⌊x⌋ − K ≤ 447 (Raketen treffen ab K + 448 nicht, Kampf 10.3).
 * Gehaltene trifft nur die haltende Figur (siehe trefferPruefen).
 */
export function treffbar(welt: Welt, g: Gegner): boolean {
  if (!g.belegt) return false;
  if (g.zustand !== ZUSTAND_NORMAL && g.zustand !== ZUSTAND_REAKTION) return false;
  if (g.lp < 0 || NICHT_TREFFBAR.includes(g.modus)) return false;
  return imFenster(g, welt.kamera.x);
}

/** Behälter als Ziel (Welt 9.2): ein unzerbrochenes Fass; Bosskisten zerbrechen nur beim Weckreiz des Bosses. */
export function behaelterTreffbar(o: Objekt): boolean {
  return o.belegt && o.typ === 'Behälter' && o.art === 'Fass' && !o.zerbrochen;
}

/** Angreifer steht vor dem Ziel, in dessen Blickrichtung (dx · Blick_Ziel ≥ 0; Treffer.von_vorn, Boss SA3). */
function vonVorn(angreifer: EntitaetBasis, ziel: EntitaetBasis): boolean {
  return (ganz(angreifer.x) - ganz(ziel.x)) * ziel.blick >= 0;
}

/** Treffbarkeit eines Gegners für eine bestimmte Instanz (gehalten, Boss von vorn). */
function gegnerOffen(welt: Welt, inst: Angriffsinstanz, angreifer: EntitaetBasis, g: Gegner): boolean {
  if (!g.belegt) return false;
  if (g.modus === 'GEHALTEN') {
    return g.lp >= 0 && g.gehalten_von === inst.urheber && GEHALTEN_TREFFBAR_DURCH.includes(inst.code) && imFenster(g, welt.kamera.x);
  }
  if (!treffbar(welt, g)) return false;
  if (g.typ === 'Ballast' && g.timer[TIMER_VORN_GESCHUETZT] === 1 && vonVorn(angreifer, g)) return false;
  return true;
}

// ===========================================================================
// Flächen (Kampf 5.1)
// ===========================================================================

function hoeheErlaubt(max: number | null, e: EntitaetBasis): boolean {
  return max === null || ganz(e.h) <= max;
}

/**
 * Liegt ziel in der Fläche der Instanz (Kampf 5.1), an ganzzahligen Positionen
 * am Ende des Frames (Kampf 2.3)? dz in Kampf-Konvention (Ziel minus Ursprung).
 * - abstand: −hinten ≤ d_vorn ≤ vorn (hinten_weg, wenn ein Gegner als Ziel vom
 *   Angreifer wegschaut, K8), |dz| ≤ tiefe, Höhe des Angreifers und des Ziels
 * - fenster: x_z − links ≤ ⌊x_Ziel⌋ ≤ x_z + rechts, dz_min ≤ dz ≤ dz_max,
 *   d_vorn ≥ −hinten, Zielhöhe (Welt 5.4)
 * - punkt: d = ((⌊x_Ziel⌋ + versatz · Blick_Ziel) − x) · richtung in
 *   [−hinten, vorn], |⌊z_Ziel⌋ − z| ≤ tiefe; x und z sind ganze Pixel
 *   (⌊Einschlag⌋), mechanik „Fernangriffe der Gegner“, Trefferfläche
 * - umkreis: |dx| ≤ halbbreite, |dz| ≤ tiefe um den Angreifer (nie er selbst)
 * - gehalten: nur inst.ziel
 * - bild: 0 ≤ ⌊x⌋ − Kamera-x ≤ 383 (Kampf 6.5, P30)
 * Treffbarkeit (Zustand, Fenster, getroffen) prüft diese Funktion nicht.
 */
export function inFlaeche(welt: Welt, inst: Angriffsinstanz, angreifer: EntitaetBasis, ziel: EntitaetBasis): boolean {
  const fl = inst.flaeche;
  switch (fl.art) {
    case 'abstand': {
      const a = abstand(angreifer, ziel);
      const weg = fl.hinten_weg !== null && istGegnerSlot(ziel.schluessel) && !schautZu(ziel, angreifer);
      const hinten = weg && fl.hinten_weg !== null ? fl.hinten_weg : fl.hinten;
      if (a.d_vorn < -hinten || a.d_vorn > fl.vorn) return false;
      if (Math.abs(a.dz) > fl.tiefe) return false;
      if (!hoeheErlaubt(fl.hoehe_angreifer_max, angreifer)) return false;
      return hoeheErlaubt(fl.hoehe_ziel_max, ziel);
    }
    case 'fenster': {
      const x = ganz(ziel.x);
      if (x < fl.x_z - fl.links || x > fl.x_z + fl.rechts) return false;
      const a = abstand(angreifer, ziel);
      if (a.dz < fl.dz_min || a.dz > fl.dz_max) return false;
      if (a.d_vorn < -fl.hinten) return false;
      return hoeheErlaubt(fl.hoehe_ziel_max, ziel);
    }
    case 'punkt': {
      const d = (ganz(ziel.x) + fl.ziel_blick_versatz * ziel.blick - fl.x) * fl.richtung;
      if (d < -fl.hinten || d > fl.vorn) return false;
      if (Math.abs(ganz(ziel.z) - fl.z) > fl.tiefe) return false;
      return hoeheErlaubt(fl.hoehe_ziel_max, ziel);
    }
    case 'umkreis': {
      if (ziel.schluessel === angreifer.schluessel) return false;
      const a = abstand(angreifer, ziel);
      if (Math.abs(a.dx) > fl.halbbreite || Math.abs(a.dz) > fl.tiefe) return false;
      return hoeheErlaubt(fl.hoehe_ziel_max, ziel);
    }
    case 'gehalten':
      return inst.ziel !== null && inst.ziel === ziel.schluessel;
    case 'bild': {
      const d = ganz(ziel.x) - welt.kamera.x;
      return d >= 0 && d <= IM_BILD_MAX;
    }
  }
}

// ===========================================================================
// Treffer anlegen
// ===========================================================================

function gegenrichtung(b: Blick): Blick {
  return b === 1 ? -1 : 1;
}

/** „vom Angreifer weg“: d_vorn ≥ 0 → Blick des Angreifers, sonst entgegen (9.4; P14). */
function wegVom(angreifer: EntitaetBasis, ziel: EntitaetBasis): Blick {
  return abstand(angreifer, ziel).d_vorn >= 0 ? angreifer.blick : gegenrichtung(angreifer.blick);
}

/**
 * Flugrichtung bei Umwerfen (Kampf 5.7): die Figur fliegt immer vom Angreifer
 * weg (P14); sonst nach der RichtungsRegel der Instanz (blick: Blick des
 * Angreifers; weg: vom Angreifer weg; bahn: bahn_richtung des Angreifers).
 */
function flugrichtung(inst: Angriffsinstanz, angreifer: EntitaetBasis, ziel: EntitaetBasis): Blick {
  if (ziel.schluessel === 'f') return wegVom(angreifer, ziel);
  switch (inst.richtung) {
    case 'blick':
      return angreifer.blick;
    case 'weg':
      return wegVom(angreifer, ziel);
    case 'bahn':
      return angreifer.bahn_richtung;
  }
}

/** Stand der Prüfung innerhalb eines Frames. */
interface Lauf {
  /** Ziele, die nach einem schon angelegten Treffer dieses Frames nicht mehr treffbar sind */
  aus: Set<SlotKey>;
  /** vorgerechnete LP der in diesem Frame getroffenen Gegner */
  lp: Map<SlotKey, number>;
  /** Gegner, die in Punkt 1 oder 2 getroffen wurden (Kampf 5.4) */
  getroffen12: Set<SlotKey>;
}

function trefferAnlegen(welt: Welt, inst: Angriffsinstanz, angreifer: EntitaetBasis, ziel: EntitaetBasis, boss: boolean): Treffer {
  const schaden = boss && inst.schaden_boss !== null ? inst.schaden_boss : inst.schaden;
  const t: Treffer = {
    angreifer: inst.angreifer,
    urheber: inst.urheber,
    ziel: ziel.schluessel,
    code: inst.code,
    schaden,
    umwerfen: inst.umwerfen,
    bahn: inst.bahn,
    richtung: flugrichtung(inst, angreifer, ziel),
    von_vorn: vonVorn(angreifer, ziel),
    wirkung: '',
    lp_vorher: ziel.lp,
    instanz: inst,
  };
  welt.treffer.push(t);
  inst.getroffen.push(ziel.schluessel);
  return t;
}

/** Gegner als Ziel einer Instanz der Figur oder des geworfenen Gegners (Punkt 1 und 2). */
function gegenGegner(welt: Welt, lauf: Lauf, inst: Angriffsinstanz, angreifer: EntitaetBasis): void {
  for (const g of welt.gegner) {
    const key = g.schluessel;
    if (key === angreifer.schluessel || inst.getroffen.includes(key) || lauf.aus.has(key)) continue;
    if (!gegnerOffen(welt, inst, angreifer, g) || !inFlaeche(welt, inst, angreifer, g)) continue;
    const t = trefferAnlegen(welt, inst, angreifer, g, g.typ === 'Ballast');
    const rest = (lauf.lp.get(key) ?? g.lp) - t.schaden;
    lauf.lp.set(key, rest);
    if (inst.umwerfen || rest < 0) lauf.aus.add(key);
    lauf.getroffen12.add(key);
  }
}

/** Behälter als Ziel (Welt 9.2): jeder Treffer jeder Art zerbricht ein Fass, auch Gegnerangriffe. */
function gegenBehaelter(welt: Welt, lauf: Lauf, inst: Angriffsinstanz, angreifer: EntitaetBasis): void {
  if (!inst.behaelter || inst.flaeche.art === 'gehalten' || inst.flaeche.art === 'bild') return;
  for (const o of welt.objekte) {
    const key = o.schluessel;
    if (!behaelterTreffbar(o) || inst.getroffen.includes(key) || lauf.aus.has(key)) continue;
    if (!inFlaeche(welt, inst, angreifer, o)) continue;
    trefferAnlegen(welt, inst, angreifer, o, false);
    lauf.aus.add(key);
  }
}

/** Angreifende Entität einer aktiven Instanz der passenden Seite, sonst null. */
function angreiferVon(welt: Welt, inst: Angriffsinstanz | null, gegen: 'gegner' | 'figur'): EntitaetBasis | null {
  if (inst === null || !inst.aktiv || inst.gegen !== gegen) return null;
  const a = entitaet(welt, inst.angreifer);
  return a !== null && a.belegt ? a : null;
}

/** Punkt 1 und 2: Instanz gegen Gegner und Behälter. */
function pruefeGegenGegner(welt: Welt, lauf: Lauf, inst: Angriffsinstanz | null): void {
  const angreifer = angreiferVon(welt, inst, 'gegner');
  if (inst === null || angreifer === null) return;
  gegenGegner(welt, lauf, inst, angreifer);
  gegenBehaelter(welt, lauf, inst, angreifer);
}

/**
 * Punkt 3: Instanz eines Gegners oder Gegnergeschosses gegen die Figur, dann
 * gegen Behälter. Ein Gegnerangriff trifft die Figur in seinem ersten aktiven
 * Frame, in dem sie in der Fläche steht (5.8); hat er sie wirksam getroffen
 * (einmal), prüft er nicht mehr. Wirkungslose Treffer im Schutz nimmt
 * trefferFolgen wieder aus getroffen heraus (P11).
 */
function pruefeGegenFigur(welt: Welt, lauf: Lauf, inst: Angriffsinstanz | null): void {
  const angreifer = angreiferVon(welt, inst, 'figur');
  if (inst === null || angreifer === null) return;
  if (inst.einmal && inst.getroffen.includes('f')) return;
  const f = welt.figur;
  if (!inst.getroffen.includes('f') && inFlaeche(welt, inst, angreifer, f)) trefferAnlegen(welt, inst, angreifer, f, false);
  gegenBehaelter(welt, lauf, inst, angreifer);
}

/** Darf der Angriff dieses Gegners in Punkt 3 prüfen (Kampf 5.4, 7)? */
function gegnerDarfPruefen(lauf: Lauf, g: Gegner): boolean {
  if (g.lp < 0 || g.modus === 'TOT') return false;
  if (lauf.getroffen12.has(g.schluessel)) return false;
  if (g.typ !== 'Ballast' && istReaktion(g.modus)) return false;
  return true;
}

/**
 * KS6 (Kampf 5.4): prüft alle aktiven Instanzen an den Positionen nach KS2
 * bis KS4 und legt die Treffer in welt.treffer an (Reihenfolge im Kopf dieser
 * Datei). Je Treffer: schaden (schaden_boss beim Boss), umwerfen, bahn,
 * richtung (Kampf 5.7: Figur vom Angreifer weg, P14; sonst RichtungsRegel),
 * von_vorn, lp_vorher = aktuelle LP; wirkung bleibt ''.
 */
export function trefferPruefen(welt: Welt): void {
  const lauf: Lauf = { aus: new Set(), lp: new Map(), getroffen12: new Set() };
  // 1. Figur und ihre Geschosse gegen Gegner und Behälter
  pruefeGegenGegner(welt, lauf, welt.figur.angriff);
  for (const o of welt.geschosse) if (o.belegt) pruefeGegenGegner(welt, lauf, o.angriff);
  // 2. geworfener Gegner gegen andere Gegner und Behälter
  for (const g of welt.gegner) if (g.belegt) pruefeGegenGegner(welt, lauf, g.angriff);
  // 3. Gegner und ihre Geschosse gegen die Figur
  for (const g of welt.gegner) if (g.belegt && gegnerDarfPruefen(lauf, g)) pruefeGegenFigur(welt, lauf, g.angriff);
  for (const o of welt.objekte) if (o.belegt) pruefeGegenFigur(welt, lauf, o.angriff);
}

// ===========================================================================
// Prüfangriffe (Kampf 11.2)
// ===========================================================================

/** timer-Schlüssel am Gegner: Nummer + 1 des Prüfangriffs, dem die laufende Instanz PA gehört. */
const T_PA_NR = 'pa_nr';
/** timer-Schlüssel am Gegner: Präfix für „Prüfangriff i beendet“ (pa_ende_i = 1). */
const T_PA_ENDE = 'pa_ende_';

/** Instanz PA nach Kampf 11.2: Figur −4 bis 60 px vor dem Gegner, |dz| ≤ 10, Figurhöhe ≤ 48, ohne Trefferstopp. */
function pruefangriffInstanz(g: Gegner, p: PruefangriffDaten): Angriffsinstanz {
  return angriffsinstanz({
    code: 'PA',
    angreifer: g.schluessel,
    flaeche: {
      art: 'abstand',
      vorn: PA_VORN,
      hinten: PA_HINTEN,
      hinten_weg: null,
      tiefe: PA_TIEFE,
      hoehe_angreifer_max: null,
      hoehe_ziel_max: PA_HOEHE_MAX,
    },
    schaden: p.schaden,
    umwerfen: p.umwerfen,
    richtung: 'weg',
    trefferstopp: false,
    einmal: true,
    gegen: 'figur',
    // Festlegung K2: Kampf 11.2 nennt als Ziel nur die Figur
    behaelter: false,
    beginn: p.von,
  });
}

/** Beendet den laufenden Prüfangriff eines Gegners für immer (getroffen, Kampf 11.2). */
function pruefangriffBeenden(g: Gegner): void {
  const nr = g.timer[T_PA_NR] ?? 0;
  if (nr > 0) g.timer[T_PA_ENDE + String(nr - 1)] = 1;
  g.timer[T_PA_NR] = 0;
  if (g.angriff !== null && g.angriff.code === 'PA') g.angriff = null;
}

/**
 * KS3, nach der Bewegung der Gegner (Kampf 11.2): Prüfangriffe aus
 * welt.start.pruefangriffe in Szenenreihenfolge. In den Frames von bis führt
 * der Gegner die Instanz PA (aktiv); sie endet, wenn der Gegner getroffen
 * wird (trefferFolgen) oder Zustand 1 verlässt, und beginnt dann nicht neu.
 * Ein eigener Angriff des Gegners geht vor (Puppen haben keinen).
 */
export function pruefangriffeSchritt(welt: Welt): void {
  const f = welt.frame;
  const liste = welt.start.pruefangriffe;
  for (let i = 0; i < liste.length; i++) {
    const p = liste[i] as PruefangriffDaten;
    const g = welt.gegner[p.slot];
    if (g === undefined || !g.belegt || f < p.von) continue;
    const ende = T_PA_ENDE + String(i);
    const meine = g.angriff !== null && g.angriff.code === 'PA' && g.timer[T_PA_NR] === i + 1;
    if (f > p.bis || g.timer[ende] === 1 || g.zustand !== ZUSTAND_NORMAL) {
      if (f <= p.bis) g.timer[ende] = 1;
      if (meine) {
        g.angriff = null;
        g.timer[T_PA_NR] = 0;
      }
      continue;
    }
    if (!meine) {
      if (g.angriff !== null && g.angriff.code !== 'PA') continue;
      g.angriff = pruefangriffInstanz(g, p);
      g.timer[T_PA_NR] = i + 1;
    }
    (g.angriff as Angriffsinstanz).aktiv = true;
  }
}

// ===========================================================================
// KS7: Nacharbeit und Auskunft für die Urheberhandler
// ===========================================================================

/**
 * KS7, nach allen Ziel- und Urheberhandlern: Ein wirkungsloser Treffer im
 * Schutz zählt für den Angreifer nicht (P11, 5.5): das Ziel kommt wieder aus
 * instanz.getroffen heraus, der Angriff bleibt aktiv und kann in einem
 * späteren aktiven Frame treffen. Ein wirksam getroffener Gegner beendet
 * seinen Prüfangriff (Kampf 11.2).
 */
export function trefferFolgen(welt: Welt): void {
  for (const t of welt.treffer) {
    if (t.wirkung === 'W') {
      const i = t.instanz.getroffen.lastIndexOf(t.ziel);
      if (i >= 0) t.instanz.getroffen.splice(i, 1);
      continue;
    }
    const g = gegnerVon(welt, t.ziel);
    if (g !== null && g.belegt) pruefangriffBeenden(g);
  }
}

/** Ist der Treffer wirksam (Zielhandler fertig, Wirkung R, U, X oder B)? */
function wirksam(t: Treffer): boolean {
  return t.wirkung !== '' && t.wirkung !== 'W';
}

/**
 * Hat die Instanz in diesem Frame mindestens ein Ziel wirksam getroffen
 * (Kampf 5.3)? Gültig in KS7 nach den Zielhandlern, also im Urheberhandler.
 * Behältertreffer zählen (P12, 6.4).
 */
export function instanzHatGetroffen(welt: Welt, inst: Angriffsinstanz): boolean {
  for (const t of welt.treffer) if (t.instanz === inst && wirksam(t)) return true;
  return false;
}

/**
 * Ist t der erste wirksame Treffer seiner Instanz in diesem Frame? Für den
 * Trefferstopp „einmal 7 Frames je Frame mit Treffern“ (Kampf 5.3, mechanik
 * „Trefferreaktion der Gegner“, Mehrere Gegner): der Urheberhandler setzt
 * stopp nur, wenn das true ist.
 */
export function ersterWirksamerTreffer(welt: Welt, t: Treffer): boolean {
  for (const u of welt.treffer) {
    if (u.instanz === t.instanz && wirksam(u)) return u === t;
  }
  return false;
}
