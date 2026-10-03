// Griff, Haltelage, Losreißen und geworfener Gegner als Geschoss (K1) nach
// docs/spezifikation-kampf.md, 8.1 (Griff am Ende eines LAUF-Frames), 8.3
// (Haltefrist), 8.4 (Wurf) und 8.5 (WG E+1 bis E+58), P16, P19, P20.
//
// Zustand des Gegners: Greifen und Losreißen über die Hilfen von K2
// (gegner/reaktion.ts gegnerGreifen, gegnerLosreissen: Modus GEHALTEN bzw.
// FREI, Zustand, Rechte). Die Bahn F3 des Geworfenen führt K2 (Loslassen in
// E+22, erster Bahnframe E+23); K1 führt die Instanz WG am Geworfenen.

import type { Gegner, Wurfgeschoss } from '../entitaeten.ts';
import type { Welt } from '../welt.ts';
import { add, ausGanz, ganz, mulGanz } from '../festkomma.ts';
import { abstand, gegnerVon, schautZu, ZUSTAND_NORMAL } from '../entitaeten.ts';
import { EREIGNIS, ereignis, pfeil } from '../ereignisse.ts';
import { gegnerGreifen, gegnerLosreissen } from '../gegner/reaktion.ts';
import { GRIFF_HINTEN, GRIFF_TIEFE, GRIFF_VORN_ANSCHAUEN, GRIFF_VORN_WEG, HALTEFRIST, HALTELAGE, WG_BIS } from '../werte.ts';
import { aktionSetzen } from './basis.ts';

/** Gehaltener Gegner, solange der Griff besteht (gehalten_von = Figur), sonst null. */
export function gehaltener(welt: Welt): Gegner | null {
  const g = gegnerVon(welt, welt.figur.griff_ziel);
  if (g === null || !g.belegt || g.gehalten_von !== 'f') return null;
  return g;
}

/** Haltelage 19 px vor der Figur in ihrer Tiefe, am Boden (Kampf 8.1, P19). */
export function haltelageSetzen(welt: Welt, g: Gegner): void {
  const f = welt.figur;
  g.x = add(f.x, mulGanz(ausGanz(HALTELAGE), f.blick));
  g.z = f.z;
  g.h = 0;
}

/** Griff endet ohne Freilassen (Wurf, dritter Kniestoß, Spezialangriff, Tod des Gehaltenen: K2 setzt die Reaktion). */
export function griffBeenden(welt: Welt): void {
  const f = welt.figur;
  const g = gegnerVon(welt, f.griff_ziel);
  if (g !== null && g.gehalten_von === 'f') g.gehalten_von = null;
  f.griff_ziel = null;
  f.knie_zahl = 0;
  f.haltefrist = 0;
}

/**
 * Gegner frei (Losreißen nach 8.3, Sprung im Griff nach 8.2, wirksamer
 * Treffer gegen die Figur nach P16): Modus FREI, Zustand 1, Ereignis L:sn.
 */
export function griffLoesen(welt: Welt): void {
  const g = gehaltener(welt);
  griffBeenden(welt);
  if (g === null) return;
  gegnerLosreissen(g);
  ereignis(welt, EREIGNIS.LOSREISSEN, g.schluessel);
}

/** Greifbar (Kampf 7, 8.1): Zustand 1, nicht in aktiven Angriffsframes, am Boden. */
function greifbar(g: Gegner): boolean {
  if (!g.belegt || g.typ === '' || g.zustand !== ZUSTAND_NORMAL) return false;
  if (g.angriff !== null && g.angriff.aktiv) return false;
  return ganz(g.h) === 0;
}

/**
 * Ende KS7 (Kampf 8.1): Griff am Ende eines LAUF-Frames, |dz| ≤ 10; vorn 0
 * bis 39 (schaut zur Figur) bzw. 0 bis 14 (schaut weg), hinten −24 bis −1 nur
 * wenn er zur Figur schaut; nicht in der Griffsperre. Mehrere Kandidaten:
 * kleinstes |dx|, dann kleinste Slotnummer (P20). Im Griff-Frame Haltelage,
 * Ereignis G:F>sn, Haltefrist bis g+60, Drücke ab g+1.
 */
export function griffPruefenIntern(welt: Welt): void {
  const f = welt.figur;
  if (f.aktion !== 'LAUF' || f.griffsperre > 0 || f.h !== 0) return;
  let ziel: Gegner | null = null;
  let besterDx = 0;
  for (const g of welt.gegner) {
    if (!greifbar(g)) continue;
    const a = abstand(f, g);
    if (Math.abs(a.dz) > GRIFF_TIEFE) continue;
    const schaut = schautZu(g, f);
    let passt: boolean;
    if (a.d_vorn >= 0) passt = a.d_vorn <= (schaut ? GRIFF_VORN_ANSCHAUEN : GRIFF_VORN_WEG);
    else passt = schaut && a.d_vorn >= -GRIFF_HINTEN;
    if (!passt) continue;
    const dx = Math.abs(a.dx);
    if (ziel === null || dx < besterDx) {
      ziel = g;
      besterDx = dx;
    }
  }
  if (ziel === null) return;
  aktionSetzen(welt, 'GRIFF');
  f.druecke_ab = welt.frame + 1;
  f.griff_ziel = ziel.schluessel;
  f.knie_zahl = 0;
  f.haltefrist = HALTEFRIST;
  f.los_frame = welt.frame + HALTEFRIST + 1;
  gegnerGreifen(welt, ziel, 'f');
  haltelageSetzen(welt, ziel);
  ereignis(welt, EREIGNIS.GRIFF, pfeil('f', ziel.schluessel));
}

/**
 * KS4: Instanzen WG der geworfenen Gegner (Kampf 8.5): aktiv E+1 bis E+58,
 * am Geworfenen (urheber Figur), Flugrichtung als bahn_richtung; danach
 * entfernt. Die Instanz wird jeden Frame wieder in g.angriff eingesetzt, damit
 * ihre Menge der Getroffenen erhalten bleibt. Dazu die Haltelage eines
 * gehaltenen Gegners (P19).
 */
export function wurfGeschosseSchritt(welt: Welt): void {
  const f = welt.figur;
  const bleiben: Wurfgeschoss[] = [];
  for (const w of f.wuerfe) {
    const g = gegnerVon(welt, w.ziel);
    const d = welt.frame - w.e;
    if (g === null || !g.belegt || d > WG_BIS) {
      if (g !== null && g.angriff === w.inst) g.angriff = null;
      continue;
    }
    g.bahn_richtung = w.richtung;
    g.angriff = w.inst;
    w.inst.aktiv = d >= 1;
    bleiben.push(w);
  }
  f.wuerfe = bleiben;
  const g = gehaltener(welt);
  if (g !== null) haltelageSetzen(welt, g);
}
