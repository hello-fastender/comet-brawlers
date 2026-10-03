// Frame-Protokoll und Objektprotokoll nach docs/spezifikation-kampf.md,
// 11.3 bis 11.5, mit den Zusatzspalten aus docs/spezifikation-welt.md, 11.4.
// Spaltenreihenfolge und Formate: docs/scheibe.md, Abschnitt „Formate“.
// Ohne Node-APIs (die Darstellung erzeugt dieselben Zeilen im Browser).
//
// Zahlen: Positionen als exakte Dezimalzahl des 16.16-Werts ohne
// überflüssige Nullen (festkomma.zuDezimalText), ganze Zahlen dezimal; leere
// Felder bei freien Slots. Trennzeichen Komma, Zeilenende LF.

import type { Gegner, Objekt } from '../kern/entitaeten.ts';
import type { Pruefstart } from '../kern/start.ts';
import type { Welt } from '../kern/welt.ts';
import { zuDezimalText } from '../kern/festkomma.ts';
import { blickText } from '../kern/entitaeten.ts';
import { tastenZuText } from '../kern/tasten.ts';
import { vonBeginn } from '../kern/start.ts';
import { BOSS_SLOT, GEGNER_SLOTS } from '../kern/werte.ts';

/** Programmversion im Protokollkopf (Kampf 11.3, 11.6). */
export const PROTOKOLL_VERSION = 'comet-brawlers-scheibe-0.1';

/** Spalten der Figur und des Rahmens am Anfang (Kampf 11.3). */
const SPALTEN_ANFANG = [
  'frame',
  'tasten',
  'f_x',
  'f_z',
  'f_h',
  'f_lp',
  'f_zst',
  'f_akt',
  'f_ph',
  'f_uhr',
  'f_stopp',
  'f_schutz',
  'f_blick',
  'kombo',
  'f_waffe',
  'f_mun',
  'f_sprint',
  'rang',
  'rang_zaehler',
  'kamera_x',
  'kamera_y',
  'zufall_haupt',
];

/** Spalten je Gegnerslot nach Kampf 11.3 (Präfix sn_). */
const SPALTEN_GEGNER = ['typ', 'x', 'z', 'h', 'lp', 'zst', 'akt', 'modus', 'ph', 'blick'];

/** Zusatzspalten der Welt (Welt 11.4), global. */
const SPALTEN_WELT = [
  'kamera_modus',
  'schuetteln',
  'lebende',
  'wellen',
  'pfeil',
  'recht_l',
  'recht_r',
  'zielrecht',
  'leben',
  'punkte',
  'anzeige',
  'phase',
  'steuerung',
];

/** Zusatzspalten der Welt je Gegnerslot (Welt 11.4, Präfix sn_). */
const SPALTEN_GEGNER_WELT = ['recht', 'angriff', 'ziel', 'schaden', 'timer', 'zufall'];

/** Super-Armor des Bosses in s0 (Welt 11.4). */
const SPALTEN_BOSS = ['s0_lpfolge', 's0_folge'];

/** Alle Spalten von protokoll.csv in fester Reihenfolge. */
export function protokollSpalten(): string[] {
  const spalten = [...SPALTEN_ANFANG];
  for (let n = 0; n < GEGNER_SLOTS; n++) for (const s of SPALTEN_GEGNER) spalten.push(`s${n}_${s}`);
  spalten.push(...SPALTEN_WELT);
  for (let n = 0; n < GEGNER_SLOTS; n++) for (const s of SPALTEN_GEGNER_WELT) spalten.push(`s${n}_${s}`);
  spalten.push(...SPALTEN_BOSS);
  spalten.push('ereignis');
  return spalten;
}

/** Spalten von objekte.csv (Kampf 11.5). */
export const OBJEKT_SPALTEN: readonly string[] = [
  'frame',
  'slot',
  'typ',
  'art',
  'x',
  'z',
  'h',
  'zst',
  'lp',
  'munition',
  'liegezeit',
  'inhalt',
  'flugphase',
];

/** Kommentarzeilen am Kopf von protokoll.csv (Kampf 11.3): version, szene, seed, eingabe_md5, EINGRIFF. */
export function protokollKopf(start: Pruefstart, eingabeMd5: string): string[] {
  const zeilen = [
    `# version=${PROTOKOLL_VERSION}`,
    `# szene=${start.name}`,
    `# seed=${start.seed}`,
    `# eingabe_md5=${eingabeMd5}`,
  ];
  for (const g of start.gegner) {
    if (!vonBeginn(g)) {
      zeilen.push(`# EINGRIFF erscheint frame=${g.erscheint} slot=${g.slot} typ=${g.typ} x=${g.x} z=${g.z}`);
    }
  }
  for (const e of start.eingriffe) zeilen.push(`# EINGRIFF frame=${e.frame} ziel=${e.ziel} feld=${e.feld} wert=${e.wert}`);
  for (const p of start.pruefangriffe) {
    zeilen.push(
      `# EINGRIFF pruefangriff slot=${p.slot} von=${p.von} bis=${p.bis} schaden=${p.schaden} umwerfen=${p.umwerfen ? 'ja' : 'nein'}`,
    );
  }
  return zeilen;
}

/** Kommentarzeilen am Kopf von objekte.csv (Festlegung K0: wie protokoll.csv ohne EINGRIFF). */
export function objektKopf(start: Pruefstart, eingabeMd5: string): string[] {
  return [
    `# version=${PROTOKOLL_VERSION}`,
    `# szene=${start.name}`,
    `# seed=${start.seed}`,
    `# eingabe_md5=${eingabeMd5}`,
  ];
}

function zahlOderLeer(n: number | null): string {
  return n === null ? '' : String(n);
}

function gegnerFelder(g: Gegner): string[] {
  if (!g.belegt) return SPALTEN_GEGNER.map(() => '');
  return [
    g.typ,
    zuDezimalText(g.x),
    zuDezimalText(g.z),
    zuDezimalText(g.h),
    String(g.lp),
    String(g.zustand),
    g.aktion,
    g.modus,
    g.phase,
    blickText(g.blick),
  ];
}

function gegnerWeltFelder(g: Gegner): string[] {
  if (!g.belegt) return SPALTEN_GEGNER_WELT.map(() => '');
  return [g.recht, g.angriff_code, String(g.ziel_abstand), String(g.schaden), String(g.modus_uhr), String(g.zufall.ziehungen)];
}

/** Eine Zeile von protokoll.csv für den zuletzt gelaufenen Frame. */
export function protokollZeile(welt: Welt): string {
  const f = welt.figur;
  const felder: string[] = [
    String(welt.frame),
    tastenZuText(welt.eingabe.t),
    zuDezimalText(f.x),
    zuDezimalText(f.z),
    zuDezimalText(f.h),
    String(f.lp),
    String(f.zustand),
    f.aktion,
    f.phase,
    String(f.uhr),
    String(f.stopp),
    String(f.schutz),
    blickText(f.blick),
    String(f.kombo),
    f.waffe,
    String(f.munition),
    String(f.sprint_n),
    String(welt.rang.rang),
    String(welt.rang.zaehler),
    String(welt.kamera.x),
    String(welt.kamera.y),
    String(welt.zufall.ziehungen),
  ];
  for (const g of welt.gegner) felder.push(...gegnerFelder(g));
  felder.push(
    welt.kamera.modus,
    `${welt.kamera.schuetteln_x}/${welt.kamera.schuetteln_y}`,
    String(welt.lebende),
    welt.wellen.ausgeloest.join('-'),
    String(welt.kamera.pfeil),
    zahlOderLeer(welt.rechte.l),
    zahlOderLeer(welt.rechte.r),
    zahlOderLeer(welt.rechte.ziel),
    String(welt.rahmen.leben),
    String(welt.rahmen.punkte),
    zahlOderLeer(welt.rahmen.anzeige),
    welt.rahmen.phase,
    String(welt.rahmen.steuerung),
  );
  for (const g of welt.gegner) felder.push(...gegnerWeltFelder(g));
  const boss = welt.gegner[BOSS_SLOT] as Gegner;
  if (boss.belegt) felder.push(String(boss.lp_folge), String(boss.folge));
  else felder.push('', '');
  felder.push(welt.ereignisse.join(';'));
  for (const feld of felder) {
    if (feld.includes(',') || feld.includes('\n')) throw new RangeError(`Protokollfeld „${feld}“ enthält ein Trennzeichen`);
  }
  return felder.join(',');
}

function objektZeile(frame: number, o: Objekt): string {
  return [
    String(frame),
    o.schluessel,
    o.typ,
    o.art,
    zuDezimalText(o.x),
    zuDezimalText(o.z),
    zuDezimalText(o.h),
    String(o.zustand),
    String(o.lp),
    String(o.munition),
    String(o.liegezeit),
    o.inhalt,
    o.flugphase,
  ].join(',');
}

/** Zeilen von objekte.csv für den zuletzt gelaufenen Frame: belegte Slots o20 bis o59, dann g0 bis g4 (Kampf 11.5). */
export function objektZeilen(welt: Welt): string[] {
  const zeilen: string[] = [];
  for (const o of welt.objekte) if (o.belegt) zeilen.push(objektZeile(welt.frame, o));
  for (const o of welt.geschosse) if (o.belegt) zeilen.push(objektZeile(welt.frame, o));
  return zeilen;
}
