// Gegenstände, Behälter, Geschosse und Effekte als Blatt objekte (Auftrag 4,
// Phase 2, G4): packt die Animationen aus gegenstaende.ts und effekte.ts in
// objekte.png mit Atlas objekte.json (Format Auftrag 4, 2.3), prüft die
// Stilregeln je Animation (Kontur, Streupixel, Farbzählung, Anker, aktive
// Bilder; docs/grafik.md 2.5 und 4.7) und baut die Kontaktbögen
// docs/bilder/kontakt_objekte_<animation>.png. bauen.ts ruft
// objekteErzeugnisse() auf (Signatur fest).

import type { Befund } from './bauen.ts';
import type { Animation } from './blatt.ts';
import { blattBytes, blattPacken, zugeschnitten } from './blatt.ts';
import type { Erzeugnis } from './erzeugnis.ts';
import { effekteAnimationen } from './effekte.ts';
import { gegenstaendeAnimationen } from './gegenstaende.ts';
import { kontaktBogen } from './kontakt.ts';
import { konturLuecken, streupixel } from './kontur.ts';
import type { Leinwand, Pixel } from './leinwand.ts';
import { EIS, FARBBUDGET, FEUER, KONTUR, NUDEL, ROHR_GRUEN, STAHL, STERNBEERE, FASS_STAHLBLAU, farbenMenge, farbenZaehlen } from './palette.ts';
import { pngSchreiben } from './png.ts';

/** Name des Blatts (objekte.png, objekte.json). */
export const OBJEKTE_BLATT = 'objekte';

/** Stilregeln einer Animation des Blatts objekte (docs/grafik.md 4.7). */
export interface ObjektRegel {
  /** Außenkontur KONTUR geschlossen (Gegenstände, Behälter, Geschosse, Eiswelle); Effekte ohne Kontur. */
  readonly kontur: boolean;
  /** Farben, die allein stehen dürfen (Glanzpunkte, Funken; Regel 1.3). */
  readonly frei: ReadonlySet<Pixel>;
}

const glanz = (...p: Pixel[]): ReadonlySet<Pixel> => new Set(p);
const MIT_KONTUR = (frei: ReadonlySet<Pixel> = new Set()): ObjektRegel => ({ kontur: true, frei });
const OHNE_KONTUR = (frei: ReadonlySet<Pixel> = new Set()): ObjektRegel => ({ kontur: false, frei });

/**
 * Regeln je Animation. Glanzfarben wie in gegenstaende.ts und effekte.ts;
 * der Funke darf ganz aus Einzelpixeln bestehen (Funken, Regel 1.3).
 */
export const OBJEKT_REGELN: Readonly<Record<string, ObjektRegel>> = {
  kometenbraten: MIT_KONTUR(glanz(NUDEL.treppe[3])),
  eisnudelschale: MIT_KONTUR(glanz(NUDEL.treppe[4])),
  sternbeeren: MIT_KONTUR(glanz(STERNBEERE.treppe[4])),
  raketenwerfer: MIT_KONTUR(glanz(STAHL.treppe[4])),
  waffe_leer: MIT_KONTUR(glanz(STAHL.treppe[4])),
  rakete: MIT_KONTUR(),
  rakete_zuender: MIT_KONTUR(),
  fass: MIT_KONTUR(glanz(FASS_STAHLBLAU.treppe[4])),
  fass_truemmer: MIT_KONTUR(glanz(FASS_STAHLBLAU.treppe[4])),
  bosskiste: MIT_KONTUR(),
  bosskiste_truemmer: MIT_KONTUR(),
  magnetstoss1: OHNE_KONTUR(glanz(EIS.treppe[4])),
  magnetstoss2: OHNE_KONTUR(glanz(EIS.treppe[4])),
  magnetstoss3: OHNE_KONTUR(glanz(EIS.treppe[4])),
  magnetstoss4: OHNE_KONTUR(glanz(EIS.treppe[4])),
  funke: OHNE_KONTUR(glanz(EIS.treppe[4], ...FEUER.treppe)),
  eiswelle: MIT_KONTUR(glanz(EIS.treppe[4])),
  explosion: OHNE_KONTUR(),
  explosion_zuender: OHNE_KONTUR(),
  staub: OHNE_KONTUR(),
};

/** Alle Animationen des Blatts in fester Reihenfolge (Gegenstände, Geschosse, Behälter, Effekte). */
export function objektAnimationen(): Animation[] {
  return [...gegenstaendeAnimationen(), ...effekteAnimationen()];
}

/** Prüft die Stilregeln je Animation (docs/grafik.md 2.5 und 4.7); leere Liste: bestanden. */
export function objektePruefen(animationen: readonly Animation[]): Befund[] {
  const befunde: Befund[] = [];
  const melde = (animation: string, bild: number, regel: string, text: string): void => {
    befunde.push({ figur: OBJEKTE_BLATT, animation, bild, regel, text });
  };
  for (const anim of animationen) {
    const regel = OBJEKT_REGELN[anim.name];
    if (regel === undefined) {
      melde(anim.name, -1, 'Regel', 'keine Stilregel in OBJEKT_REGELN');
      continue;
    }
    const alle: Leinwand[] = [];
    anim.bilder.forEach((roh, i) => {
      const b = zugeschnitten(roh);
      const l = b.leinwand;
      alle.push(l);
      if (!(b.ankerX >= 0 && b.ankerX < l.breite && b.ankerY >= 0 && b.ankerY < l.hoehe)) {
        melde(anim.name, i, 'Anker im Bild', `Anker (${b.ankerX}, ${b.ankerY}) außerhalb ${l.breite} × ${l.hoehe}`);
      }
      if (regel.kontur) {
        const luecken = konturLuecken(l, KONTUR);
        if (luecken.length > 0) melde(anim.name, i, 'Kontur geschlossen', `${luecken.length} Pixel ohne Kontur, erster bei (${(luecken[0] as { x: number }).x - b.ankerX}, ${(luecken[0] as { y: number }).y - b.ankerY}) vom Anker`);
      } else if (farbenMenge(l).has(KONTUR)) melde(anim.name, i, 'Kontur', 'Effekt ohne Kontur enthält KONTUR');
      const streu = streupixel(l, regel.frei);
      if (streu.length > 0) melde(anim.name, i, 'Streupixel', `${streu.length} Streupixel, erster bei (${(streu[0] as { x: number }).x - b.ankerX}, ${(streu[0] as { y: number }).y - b.ankerY}) vom Anker`);
      const n = farbenZaehlen(l);
      if (n > FARBBUDGET.gegenstand) melde(anim.name, i, 'Farbzählung', `${n} Farben, erlaubt ${FARBBUDGET.gegenstand}`);
    });
    const gesamt = farbenZaehlen(alle);
    if (gesamt > FARBBUDGET.gegenstand) melde(anim.name, -1, 'Farbzählung', `${gesamt} Farben über alle Bilder, erlaubt ${FARBBUDGET.gegenstand}`);
    for (const a of anim.aktiv ?? []) {
      if (!(Number.isInteger(a) && a >= 0 && a < anim.bilder.length)) melde(anim.name, a, 'Aktiv', `Index ${a} außerhalb`);
    }
  }
  for (const name of Object.keys(OBJEKT_REGELN)) {
    if (!animationen.some((a) => a.name === name)) melde(name, -1, 'Vollständigkeit', 'Animation fehlt');
  }
  return befunde;
}

/** Größte Kante, bis zu der ein Kontaktbogen 4× statt 2× vergrößert wird (kleine Gegenstände lesbar; Festlegung G4-9). */
const KLEIN = 40;

/** Vergrößerung des Kontaktbogens einer Animation: 4× für kleine Bilder, sonst 2× (Auftrag 4, 2.2). */
export function kontaktFaktor(anim: Animation): number {
  const gross = Math.max(...anim.bilder.map((b) => {
    const z = zugeschnitten(b);
    return Math.max(z.leinwand.breite, z.leinwand.hoehe);
  }));
  return gross < KLEIN ? 4 : 2;
}

/** Gegenstände, Behälter, Geschosse und Effekte (Blatt objekte) für bauen.ts. */
export function objekteErzeugnisse(): Erzeugnis[] {
  const animationen = objektAnimationen();
  const befunde = objektePruefen(animationen);
  const blatt = blattBytes(blattPacken(OBJEKTE_BLATT, animationen));
  const ausgabe = new Map<string, Uint8Array | string>([
    [`${OBJEKTE_BLATT}.png`, blatt.png],
    [`${OBJEKTE_BLATT}.json`, blatt.json],
  ]);
  const bilder = new Map<string, Uint8Array>();
  for (const a of animationen) bilder.set(`kontakt_${OBJEKTE_BLATT}_${a.name}.png`, pngSchreiben(kontaktBogen(a, { faktor: kontaktFaktor(a) })));
  return [{ name: OBJEKTE_BLATT, ausgabe, bilder, befunde }];
}

/** Grün des Werfers (für Tests der Abstimmung mit G1/G3). */
export const WERFER_GRUEN: readonly Pixel[] = [ROHR_GRUEN.treppe[1], ROHR_GRUEN.treppe[2], ROHR_GRUEN.treppe[3]];
