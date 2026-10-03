// Prüfszene nach docs/spezifikation-kampf.md, 11.2 und Prüfstart nach
// docs/spezifikation-welt.md, 11.3, in einem Textformat wie die Stage-Daten
// (Welt 2.1): je Zeile ein Satz, Felder name=wert, # Kommentar. Beschreibung
// in docs/scheibe.md, Abschnitt „Formate“. Ohne Node-APIs.
//
//   szene        name= endframe= seed=1 (SEED_KAMPF_TESTS) buehne=pruefbuehne|scheibe
//   pruefstart   Schlüssel aus Welt 11.3 in deren Schreibweise (mehrere Sätze erlaubt,
//                spätere Angaben gelten): rang= rang.fest kamera.x= kamera.modus=
//                welle.N=aus|an|nur_boss sperre.ID=aus halt.ID=aus behaelter.ID=aus
//                behaelter.ID=art,x,z,inhalt gegner.sN.erlaubnis=aus boss.angriffe=aus
//                boss.bewegung=aus boss.lp=N fest.NAME=WERT figur.x= figur.z= …
//   figur        x= z= blick= lp= waffe=RW|leer munition=
//   gegner       slot= typ= rolle= x= z= blick= lp= lp_max= vorplatziert= logik= erlaubnis= erscheint=
//   objekt       slot= typ= art= x= z= munition= inhalt= id=
//   eingriff     frame= ziel= feld= wert=
//   pruefangriff slot= von= bis= schaden= umwerfen=

import type { GegenstandArt, BehaelterArt, ObjektTyp, Rolle } from '../kern/entitaeten.ts';
import type { FigurStart, GegnerStart, ObjektStart, Pruefstart } from '../kern/start.ts';
import type { SatzZeile } from '../kern/stage.ts';
import { standardStart } from '../kern/start.ts';
import {
  Felder,
  behaelterArtAusText,
  blickAusText,
  gegenstandAusText,
  gegnerTypAusText,
  inhaltAusText,
  satzZeilen,
} from '../kern/stage.ts';
import { rolleVon } from '../kern/anlegen.ts';
import { KAMERA_MODI } from '../kern/eingriffe.ts';
import { BOSS_WELLE_SCHEIBE, GEGNER_SLOTS, OBJEKT_SLOT_ERSTER, OBJEKT_SLOT_LETZTER, PRUEF_RANG_STANDARD, SEED_KAMPF_TESTS } from '../kern/werte.ts';

function fehlerIn(z: SatzZeile, text: string): SyntaxError {
  return new SyntaxError(`Szene Zeile ${z.nr} (${z.satzart}): ${text}`);
}

function ganzText(z: SatzZeile, name: string, w: string): number {
  if (!/^-?\d+$/.test(w)) throw fehlerIn(z, `${name} muss eine ganze Zahl sein, nicht „${w}“`);
  return Number(w);
}

function anAus(z: SatzZeile, name: string, w: string): boolean {
  const k = w.toLowerCase();
  if (k === 'an' || k === 'ja') return true;
  if (k === 'aus' || k === 'nein') return false;
  throw fehlerIn(z, `${name} muss an/aus (ja/nein) sein, nicht „${w}“`);
}

function rolleAusText(z: SatzZeile, w: string): Rolle {
  if (w === 'leicht' || w === 'schwer' || w === 'fern' || w === 'boss') return w;
  throw fehlerIn(z, `rolle „${w}“ unbekannt (leicht/schwer/fern/boss)`);
}

function objektTypAusText(z: SatzZeile, w: string): ObjektTyp {
  switch (w.toLowerCase()) {
    case 'gegenstand':
      return 'Gegenstand';
    case 'behälter':
    case 'behaelter':
      return 'Behälter';
    case 'rakete':
      return 'Rakete';
    case 'waffe':
      return 'Waffe';
    case 'effekt':
      return 'Effekt';
    default:
      throw fehlerIn(z, `typ „${w}“ unbekannt (Gegenstand/Behälter/Rakete/Waffe/Effekt)`);
  }
}

function hinzu<T>(liste: T[], wert: T): void {
  if (!liste.includes(wert)) liste.push(wert);
}

function entferne<T>(liste: T[], wert: T): void {
  const i = liste.indexOf(wert);
  if (i >= 0) liste.splice(i, 1);
}

function figurFeld(z: SatzZeile, figur: FigurStart, name: string, w: string): void {
  switch (name) {
    case 'x':
      figur.x = ganzText(z, name, w);
      break;
    case 'z':
      figur.z = ganzText(z, name, w);
      break;
    case 'blick':
      figur.blick = blickAusText(w, () => fehlerIn(z, `blick „${w}“ unbekannt`));
      break;
    case 'lp':
      figur.lp = ganzText(z, name, w);
      break;
    case 'waffe':
      if (w !== 'RW' && w !== 'leer' && w !== '') throw fehlerIn(z, 'waffe muss RW oder leer sein');
      figur.waffe = w === 'RW' ? 'RW' : '';
      break;
    case 'munition':
      figur.munition = ganzText(z, name, w);
      break;
    default:
      throw fehlerIn(z, `unbekanntes Feld der Figur „${name}“`);
  }
}

/** Ein Schlüssel des Prüfstarts (Welt 11.3). */
function pruefstartFeld(z: SatzZeile, s: Pruefstart, name: string, w: string): void {
  let m: RegExpExecArray | null;
  if (name === 'rang') {
    s.rang = ganzText(z, name, w);
  } else if (name === 'rang.fest') {
    s.rang_fest = anAus(z, name, w);
  } else if (name === 'kamera.x') {
    s.kamera_x = ganzText(z, name, w);
  } else if (name === 'kamera.modus') {
    const modus = KAMERA_MODI.find((k) => k === w);
    if (modus === undefined) throw fehlerIn(z, `kamera.modus „${w}“ unbekannt (${KAMERA_MODI.join(' ')})`);
    s.kamera_modus = modus;
  } else if ((m = /^welle\.(\d+)$/.exec(name)) !== null) {
    const nr = Number(m[1]);
    if (w === 'aus') {
      hinzu(s.wellen_aus, nr);
    } else if (w === 'an') {
      entferne(s.wellen_aus, nr);
    } else if (w === 'nur_boss') {
      if (nr !== BOSS_WELLE_SCHEIBE) throw fehlerIn(z, `nur_boss gibt es nur für welle.${BOSS_WELLE_SCHEIBE}`);
      entferne(s.wellen_aus, nr);
      s.welle7_nur_boss = true;
    } else {
      throw fehlerIn(z, `${name}=${w}: erlaubt aus, an, nur_boss`);
    }
  } else if ((m = /^sperre\.(.+)$/.exec(name)) !== null) {
    if (anAus(z, name, w)) entferne(s.sperren_aus, m[1] as string);
    else hinzu(s.sperren_aus, m[1] as string);
  } else if ((m = /^halt\.(.+)$/.exec(name)) !== null) {
    if (anAus(z, name, w)) entferne(s.halte_aus, m[1] as string);
    else hinzu(s.halte_aus, m[1] as string);
  } else if ((m = /^behaelter\.(.+)$/.exec(name)) !== null) {
    const id = m[1] as string;
    if (w === 'aus') {
      hinzu(s.behaelter_aus, id);
    } else {
      const teile = w.split(',');
      if (teile.length !== 4) throw fehlerIn(z, `${name}: erwartet aus oder art,x,z,inhalt`);
      const [art, x, zz, inhalt] = teile as [string, string, string, string];
      s.behaelter_zusatz.push({
        id,
        art: behaelterArtAusText(art, () => fehlerIn(z, `Behälterart „${art}“ unbekannt`)),
        x: ganzText(z, 'x', x),
        z: ganzText(z, 'z', zz),
        inhalt: inhaltAusText(inhalt, () => fehlerIn(z, `Inhalt „${inhalt}“ unbekannt`)),
      });
    }
  } else if ((m = /^gegner\.s(\d+)\.erlaubnis$/.exec(name)) !== null) {
    const slot = Number(m[1]);
    if (anAus(z, name, w)) entferne(s.erlaubnis_aus, slot);
    else hinzu(s.erlaubnis_aus, slot);
  } else if (name === 'boss.angriffe') {
    s.boss_angriffe = anAus(z, name, w);
  } else if (name === 'boss.bewegung') {
    s.boss_bewegung = anAus(z, name, w);
  } else if (name === 'boss.lp') {
    s.boss_lp = ganzText(z, name, w);
  } else if ((m = /^fest\.(.+)$/.exec(name)) !== null) {
    s.fest[m[1] as string] = w;
  } else if ((m = /^figur\.(.+)$/.exec(name)) !== null) {
    figurFeld(z, s.figur, m[1] as string, w);
  } else {
    throw fehlerIn(z, `unbekannter Schlüssel des Prüfstarts „${name}“`);
  }
}

function gegnerSatz(z: SatzZeile): GegnerStart {
  const f = new Felder(z);
  const slot = f.ganz('slot');
  if (slot < 0 || slot >= GEGNER_SLOTS) throw fehlerIn(z, `slot ${slot} außerhalb 0 bis ${GEGNER_SLOTS - 1}`);
  const typ = gegnerTypAusText(f.text('typ'), () => fehlerIn(z, `typ „${f.text('typ')}“ unbekannt`));
  const g: GegnerStart = {
    slot,
    typ,
    rolle: f.hat('rolle') ? rolleAusText(z, f.text('rolle')) : rolleVon(typ),
    x: f.ganz('x'),
    z: f.ganz('z'),
    blick: f.hat('blick') ? f.blick('blick') : null,
    lp: f.ganzOder('lp'),
    lp_max: f.ganzOder('lp_max'),
    vorplatziert: f.jaNein('vorplatziert', false),
    logik: f.jaNein('logik', typ !== 'Puppe'),
    erlaubnis: f.jaNein('erlaubnis', true),
    erscheint: f.ganz('erscheint', 0),
  };
  f.pruefeRest();
  return g;
}

function objektSatz(z: SatzZeile): ObjektStart {
  const f = new Felder(z);
  const slot = f.ganz('slot');
  if (slot < OBJEKT_SLOT_ERSTER || slot > OBJEKT_SLOT_LETZTER) {
    throw fehlerIn(z, `slot ${slot} außerhalb ${OBJEKT_SLOT_ERSTER} bis ${OBJEKT_SLOT_LETZTER}`);
  }
  const typ = objektTypAusText(z, f.text('typ'));
  const artText = f.text('art', '');
  let art: GegenstandArt | BehaelterArt | '' = '';
  if (artText !== '') {
    art =
      typ === 'Behälter'
        ? behaelterArtAusText(artText, () => fehlerIn(z, `Behälterart „${artText}“ unbekannt`))
        : gegenstandAusText(artText, () => fehlerIn(z, `Gegenstand „${artText}“ unbekannt`));
  }
  const inhaltText = f.text('inhalt', typ === 'Behälter' ? 'leer' : '');
  const o: ObjektStart = {
    slot,
    typ,
    art,
    x: f.ganz('x'),
    z: f.ganz('z'),
    munition: f.ganz('munition', 0),
    inhalt: inhaltText === '' ? '' : inhaltAusText(inhaltText, () => fehlerIn(z, `Inhalt „${inhaltText}“ unbekannt`)),
    id: f.text('id', `o${slot}`),
  };
  f.pruefeRest();
  return o;
}

/** Liest eine Prüfszene in einen Prüfstart (Kampf 11.2, Welt 11.3). */
export function parseSzene(text: string): Pruefstart {
  const s = standardStart(SEED_KAMPF_TESTS, 'pruefbuehne');
  s.name = '';
  s.rang = PRUEF_RANG_STANDARD;
  let szeneGesehen = false;
  let figurGesehen = false;
  for (const z of satzZeilen(text)) {
    switch (z.satzart) {
      case 'szene': {
        if (szeneGesehen) throw fehlerIn(z, 'zweiter Satz szene');
        szeneGesehen = true;
        const f = new Felder(z);
        s.name = f.text('name');
        s.endframe = f.ganz('endframe');
        s.seed = f.ganz('seed', SEED_KAMPF_TESTS);
        s.buehne = f.text('buehne', 'pruefbuehne');
        f.pruefeRest();
        if (s.endframe < 1) throw fehlerIn(z, 'endframe muss ≥ 1 sein');
        if (s.seed === 0) throw fehlerIn(z, 'seed 0 ist verboten (Welt 11.1)');
        break;
      }
      case 'pruefstart':
        for (const [name, wert] of z.felder) pruefstartFeld(z, s, name, wert);
        break;
      case 'figur':
        if (figurGesehen) throw fehlerIn(z, 'zweiter Satz figur');
        figurGesehen = true;
        for (const [name, wert] of z.felder) figurFeld(z, s.figur, name, wert);
        break;
      case 'gegner': {
        const g = gegnerSatz(z);
        if (s.gegner.some((x) => x.slot === g.slot && x.erscheint === g.erscheint)) throw fehlerIn(z, `Gegnerslot s${g.slot} doppelt`);
        s.gegner.push(g);
        break;
      }
      case 'objekt': {
        const o = objektSatz(z);
        if (s.objekte.some((x) => x.slot === o.slot)) throw fehlerIn(z, `Objektslot o${o.slot} doppelt`);
        s.objekte.push(o);
        break;
      }
      case 'eingriff': {
        const f = new Felder(z);
        s.eingriffe.push({ frame: f.ganz('frame'), ziel: f.text('ziel'), feld: f.text('feld'), wert: f.text('wert') });
        f.pruefeRest();
        break;
      }
      case 'pruefangriff': {
        const f = new Felder(z);
        const p = {
          slot: f.ganz('slot'),
          von: f.ganz('von'),
          bis: f.ganz('bis'),
          schaden: f.ganz('schaden'),
          umwerfen: f.jaNein('umwerfen', false),
        };
        f.pruefeRest();
        if (p.slot < 0 || p.slot >= GEGNER_SLOTS) throw fehlerIn(z, `slot ${p.slot} außerhalb 0 bis ${GEGNER_SLOTS - 1}`);
        if (p.von < 1 || p.bis < p.von) throw fehlerIn(z, 'von muss ≥ 1 und bis ≥ von sein');
        s.pruefangriffe.push(p);
        break;
      }
      default:
        throw fehlerIn(z, `unbekannte Satzart „${z.satzart}“`);
    }
  }
  if (!szeneGesehen) throw new SyntaxError('Szene ohne Satz szene');
  return s;
}
