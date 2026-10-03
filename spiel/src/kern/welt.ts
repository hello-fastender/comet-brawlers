// Welt und Logikschritt der Scheibe nach docs/spezifikation-kampf.md, 2.2
// (KS1 bis KS7) und docs/spezifikation-welt.md, 1 „Ablauf eines Frames“
// (W1 bis W8).
//
// ===========================================================================
// VERTRAG FÜR STUFE 2 (K1 Figur, K2 Treffer und Reaktion, K3 Welt, K4 Boss)
// ===========================================================================
//
// 1. Ablauf von logikSchritt(welt, T(f)) – welt.ts ruft genau diese Funktionen
//    in dieser Reihenfolge; Gegner immer Slots aufsteigend, Boss = typ Ballast:
//
//    Vorlauf  frame = f; Eingabe verschieben (t2 = T(f−2), t1 = T(f−1), t = T(f));
//             ereignisse = [], treffer = []; vorframeKopieren (x_vor, z_vor,
//             h_vor, lp_vor); welt.vorframe (lebende, Kamera, besiegt); je
//             belegtem Gegner modus_uhr + 1
//    W1       eingriffeAusfuehren                       eingriffe.ts (K0)
//    W2       rangSchritt                               rang.ts (K3)
//    W3       wellenAnlegen                             wellen.ts (K3)
//    W4       rahmenVorlauf (steuerung, Phase)          rahmen.ts (K3)
//             rechteSchritt                             gegner/nah.ts (K3)
//             je Gegner: Ballast → bossEntscheidung     gegner/boss.ts (K4)
//                        Logik aus/Puppe → puppeEntscheidung  gegner/reaktion.ts (K2)
//                        in Reaktion → nichts (Logik ruht, Kampf 7)
//                        Bolzer, Rammbock → nahEntscheidung    gegner/nah.ts (K3)
//                        Zünder → fernEntscheidung             gegner/fern.ts (K3)
//    KS1      eingabe.neu = neue Drücke in T(f−1); figurEingabe   figur/figur.ts (K1)
//    KS2      figurSchritt                              figur/figur.ts (K1)
//    KS3      je Gegner: Ballast → bossBewegung (auch seine Reaktionen)  (K4)
//                        sonst reaktionSchritt; true → fertig          (K2)
//                        Logik aus/Puppe → nichts
//                        Bolzer, Rammbock → nahBewegung; Zünder → fernBewegung (K3)
//             pruefangriffeSchritt                      treffer.ts (K2)
//    KS4      figurGeschosseSchritt (g0–g4)             figur/figur.ts (K1)
//             fernGeschosseSchritt (o20–o59)            gegner/fern.ts (K3)
//    KS5      je Gegner mit Logik an, nicht in Reaktion (Boss immer):
//             nahAbbruch / fernAbbruch / bossAbbruch
//    KS6      trefferPruefen → welt.treffer             treffer.ts (K2)
//    KS7      je Treffer (Reihenfolge welt.treffer) der Zielhandler:
//               Figur → figurGetroffen                  schaden.ts (K1)
//               Ballast → bossGetroffen                 gegner/boss.ts (K4)
//               anderer Gegner → gegnerGetroffen        gegner/reaktion.ts (K2)
//               Objekt (Behälter) → behaelterGetroffen  gegenstaende.ts (K3)
//             dann je wirksamem Treffer (wirkung ≠ 'W') der Urheberhandler:
//               'f' → figurHatGetroffen (K1); Ballast → bossHatGetroffen (K4);
//               Bolzer, Rammbock → nahHatGetroffen; Zünder → fernHatGetroffen (K3);
//               Gegner mit Logik aus → nichts
//             trefferFolgen                             treffer.ts (K2)
//             griffPruefen                              figur/figur.ts (K1)
//    W5       bossW5 (Super-Armor, Fall)                gegner/boss.ts (K4)
//             rahmenW5 (Punkte, Gegneranzeige)          rahmen.ts (K3)
//    W6       kameraSchritt                             kamera.ts (K3)
//             gegenstaendeScrollen                      gegenstaende.ts (K3)
//    W7       wellenPruefen (danach lebende, besiegt)   wellen.ts (K3)
//    W8       gegenstaendeSchritt                       gegenstaende.ts (K3)
//             rahmenSchritt (Phase, Ende)               rahmen.ts (K3)
//    Die Protokollzeile schreibt src/pruef/ nach dem Schritt aus dem Zustand.
//
//    Kamera-x des Vorframes gilt im Kampfschritt: welt.kamera.x ist bis W6
//    unverändert. Eingabe: Die Figur wertet T(f−1) aus (welt.eingabe.t1),
//    neue Drücke welt.eingabe.neu; T(f) (welt.eingabe.t) nur fürs Protokoll.
//
// 2. Angriffe (entitaeten.ts, Angriffsinstanz): Jeder Angreifer führt seine
//    laufende Instanz im Feld angriff seiner Entität (figur, gegner[n],
//    geschosse[n], objekte[n]; WG am geworfenen Gegner mit urheber 'f'; PA am
//    Gegner der Prüfszene). Der Besitzer legt sie mit angriffsinstanz({…}) beim
//    Angriffsbeginn an (Schaden dort fest), setzt instanz.aktiv vor KS6 für
//    jeden Frame (false in Stoppframes und außerhalb der aktiven Frames) und
//    setzt angriff = null am Ende. treffer.ts liest Fläche (abstand, fenster,
//    punkt, umkreis, gehalten, bild), prüft und trägt getroffene Ziele in
//    instanz.getroffen ein; ein Ziel nie zweimal je Instanz.
//
// 3. Treffer (entitaeten.ts, Treffer): trefferPruefen legt sie in
//    welt.treffer an (Reihenfolge Kampf 5.4, schaden, richtung, von_vorn
//    gefüllt, wirkung ''). Der Zielhandler setzt t.lp_vorher und t.wirkung
//    (R, U, X, B, W) und schreibt als Erstes ereignisTreffer(welt, t), dann
//    LP und Reaktion; welt.ts wirft, wenn wirkung danach leer ist. Der
//    Urheberhandler sieht nur wirksame Treffer (P11: im Schutz kein
//    Trefferstopp). Punkte und Gegneranzeige liest rahmenW5 aus welt.treffer.
//
// 4. Ereignisse: ereignis(welt, Kennung, …Felder) aus ereignisse.ts in der
//    Reihenfolge des Eintretens; Kennungen in EREIGNIS.
//
// 5. Zufall: nur zufall.ts. Gegner ziehen aus g.zufall (wahl, bereich,
//    anteil, ziehenAus), je Entscheidung genau eine Ziehung, nur in W3, W4
//    und im Kampfschritt; welt.zufall (Hauptgenerator) nur für den Startwert
//    neuer Gegner (gegnerZufall). Feste Ergebnisse: welt.fest['gehstufe'] usw.
//    ersetzen das Ergebnis nach der Ziehung (Welt 11.3).
//
// 6. Gegnerzustand: modus (sn_modus) nur über modusSetzen (sn_timer), aktion
//    (sn_akt) = Reaktionsname in Reaktionen, sonst Körperaktion. Am Ende einer
//    Reaktion setzt reaktion.ts modus FREI; die Logik wählt im nächsten W4.
//
// 7. Konstanten: nur aus werte.ts; neue Konstanten am Ende von werte.ts
//    anhängen, je mit Quellkommentar. Fehlende Felder hier oder in
//    entitaeten.ts nicht selbst ergänzen, sondern im Bericht vorschlagen.
//
// 8. Anlegen und gemeinsame Hilfen: erzeugeWelt legt Stage- und
//    Szenengegner an (anlegen.ts), gibt jedem belegten Slot aufsteigend eine
//    Ziehung des Hauptgenerators und ruft dann bossAngelegt (K4) bzw. für
//    Gegner mit Logik an gegnerAngelegt (K3), zuletzt figurInitialisieren
//    (K1). Der Eingriff welle.N jetzt ruft welleAusloesen (K3). Neue Gegner
//    einer Welle legt K3 so an: freierGegner, gegnerBelegen, Felder setzen,
//    gegnerZufallGeben, gegnerUebergeben (anlegen.ts). Bewegung mit Band,
//    Hindernissen und Rändern: stage.ts schrittBegrenzt mit
//    gegenstaende.ts behaelterHindernisse (einzige Fassung: Behälter bis
//    einschließlich Frame h des Zerbrechens, Welt 9.2). Flugbahnen F1 bis F4b:
//    bahn.ts bahnStarten, bahnSchritt. Abstände: entitaeten.ts abstand,
//    blickZu, schautZu; Slots entitaet, gegnerVon, objektVon; aktives Fenster
//    imFenster; lebend istLebend; Rangstufe: rang.ts rangstufe.
//
// 9. Aller Zustand eines Laufs steht in der Welt (keine Modulvariablen, keine
//    WeakMaps): eine Kopie der Welt (structuredClone) läuft bitgleich weiter.
//
// ===========================================================================

import type { Gegner, GegnerTyp, SlotTabelle, Treffer } from './entitaeten.ts';
import type { EintragSatz, HaltSatz, SperreSatz, Stage, WelleSatz } from './stage.ts';
import type { Pruefstart } from './start.ts';
import type { SchuettelnArt } from './kamera.ts';
import type { Tasten } from './tasten.ts';
import type { Zufall } from './zufall.ts';
import { ausGanz, ganz } from './festkomma.ts';
import { gegnerVon, istGegnerSlot, istLebend, istReaktion, objektVon, slotTabelleNeu, vorframeKopieren } from './entitaeten.ts';
import { ALLE, KEINE, neuGedrueckt } from './tasten.ts';
import { zufallNeu } from './zufall.ts';
import { kameraY } from './stage.ts';
import { vonBeginn } from './start.ts';
import { behaelterAnlegen, gegnerAusStage, gegnerAusSzene, gegnerUebergeben, gegnerZufallGeben, objektAusSzene } from './anlegen.ts';
import { eingriffeAusfuehren, eingriffPruefen } from './eingriffe.ts';
import { figurEingabe, figurGeschosseSchritt, figurHatGetroffen, figurInitialisieren, figurSchritt, griffPruefen } from './figur/figur.ts';
import { figurGetroffen } from './schaden.ts';
import { pruefangriffeSchritt, trefferFolgen, trefferPruefen } from './treffer.ts';
import { gegnerGetroffen, puppeEntscheidung, reaktionSchritt } from './gegner/reaktion.ts';
import { nahAbbruch, nahBewegung, nahEntscheidung, nahHatGetroffen, rechteSchritt } from './gegner/nah.ts';
import { fernAbbruch, fernBewegung, fernEntscheidung, fernGeschosseSchritt, fernHatGetroffen } from './gegner/fern.ts';
import { bossAbbruch, bossBewegung, bossEntscheidung, bossGetroffen, bossHatGetroffen, bossW5 } from './gegner/boss.ts';
import { wellenAnlegen, wellenPruefen } from './wellen.ts';
import { kameraSchritt } from './kamera.ts';
import { rangSchritt } from './rang.ts';
import { behaelterGetroffen, gegenstaendeSchritt, gegenstaendeScrollen } from './gegenstaende.ts';
import { rahmenSchritt, rahmenVorlauf, rahmenW5 } from './rahmen.ts';
import {
  BOSS_SLOT,
  ERSTER_FRAME,
  ERSTER_GEGNERSLOT,
  FIGUR_LP,
  GEGNER_SLOTS,
  LEBEN_START,
  OBJEKT_SLOT_ERSTER,
  RAKETENWERFER_MUNITION,
  RANG_START,
} from './werte.ts';

// ===========================================================================
// Zustand
// ===========================================================================

/** Kamera-Modus (Welt 3), Spalte kamera_modus. */
export type KameraModus = 'FREI' | 'SPERRE' | 'HALT' | 'BLENDE' | 'ARENA' | 'ENDE';

/** Phase des Rahmens (Welt 10, 11.4), Spalte phase. */
export type Phase = 'SPIEL' | 'TOD' | 'NEUEINSTIEG' | 'BLENDE' | 'ENDE' | 'GAMEOVER';

/** Eingabe des laufenden Logikschritts f (Kampf 2.1). */
export interface Eingabe {
  /** T(f): zu Beginn von f abgefragt und aufgezeichnet (Spalte tasten) */
  t: Tasten;
  /** T(f−1): wertet der Logikschritt f aus */
  t1: Tasten;
  /** T(f−2): für neue Drücke in T(f−1) */
  t2: Tasten;
  /** neue Drücke in T(f−1), in KS1 bestimmt (Kampf 2.1) */
  neu: Tasten;
}

/** Rang (Welt 8), Spalten rang und rang_zaehler. */
export interface RangZustand {
  rang: number;
  /** Rang-Uhr r */
  zaehler: number;
  /** rang.fest: Rang-Uhr steht (Welt 11.3) */
  fest: boolean;
}

/** Kamera (Welt 3). */
export interface KameraZustand {
  /** K, ganzzahlig */
  x: number;
  /** Ky, ganzzahlig */
  y: number;
  modus: KameraModus;
  /** Kamera fest (Prüfbühne, Kampf 11.2) */
  fest: boolean;
  /** Bildschütteln (KA10), nur Darstellung: Spalte schuetteln „x/y“ */
  schuetteln_x: number;
  schuetteln_y: number;
  /** Anlass und erster Frame des laufenden Bildschüttelns (KA10); '' = keins */
  schuetteln_art: '' | SchuettelnArt;
  schuetteln_ab: number;
  /** Pfeil „weiter“ (KA5), Spalte pfeil */
  pfeil: 0 | 1;
  /** Frame c der Blende (KA13), 0 = keine */
  blende_c: number;
  /** Schnitt ausgeführt (KA3, KA13) */
  schnitt_ausgefuehrt: boolean;
  /** Frame, ab dem die Totzone der Arena gilt (KA7), 0 = nicht in der Arena */
  arena_ab: number;
  /** Frame und Kamera-x der letzten Sperrfreigabe (KA5) */
  freigabe_frame: number;
  freigabe_x: number;
}

/** Sperre der Stage im Lauf (Welt 3, KA4). */
export interface SperreZustand extends SperreSatz {
  freigegeben: boolean;
}

/** Halt der Stage im Lauf (Welt 3, KA6). */
export interface HaltZustand extends HaltSatz {
  freigegeben: boolean;
}

/** Eine Welle im Lauf (Welt 4.4). */
export interface WelleZustand {
  satz: WelleSatz;
  /** welle.n=aus (Welt 11.3) */
  aus: boolean;
  ausgeloest: boolean;
  /** Frame der Auslösung, 0 = noch nicht */
  frame: number;
}

/** Vorgemerkter neuer Gegner (Welt 4.4: Anlegen in W3 von f + 1 + verzoegerung). */
export interface Vormerkung {
  /** Frame, in dessen W3 der Gegner angelegt wird */
  frame: number;
  eintrag: EintragSatz;
  bonus: number;
}

/** Wellen (Welt 4). */
export interface WellenZustand {
  liste: WelleZustand[];
  /** ausgelöste Wellen in Reihenfolge der Auslösung (Spalte wellen, z. B. 1-2-7) */
  ausgeloest: number[];
  vorgemerkt: Vormerkung[];
  /** besiegte Wellen (KA4), von wellenPruefen gesetzt */
  besiegt: number[];
  /** welle.7=nur_boss (Welt 11.3) */
  nur_boss: boolean;
}

/** Halter der Rechte (Welt 5.7, 6), Slotnummern oder null (Spalten recht_l, recht_r, zielrecht). */
export interface RechteZustand {
  l: number | null;
  r: number | null;
  ziel: number | null;
}

/** Rahmen (Welt 10). */
export interface RahmenZustand {
  /** Leben einschließlich des laufenden (Welt 10.3) */
  leben: number;
  punkte: number;
  /** Slot der Gegneranzeige (Welt 10.1), null = keine */
  anzeige: number | null;
  /**
   * Typ (Name) und LP des angezeigten Gegners (Welt 10.1), gesetzt in W5 beim
   * Treffer durch die Figur. Die LP folgen ihm, solange er lebt und seinen
   * Slot belegt (anzeige_lebt); danach bleibt die Anzeige mit leerem Balken,
   * bis die Figur einen anderen Gegner trifft, auch wenn ein neuer Gegner den
   * Slot belegt.
   */
  anzeige_typ: GegnerTyp | '';
  anzeige_lp: number;
  anzeige_lebt: boolean;
  phase: Phase;
  /** 1 wertet Eingaben aus, 0 nicht (Welt 11.4) */
  steuerung: 0 | 1;
  /** Frame t des Bossfalls (Welt 10.5), 0 = noch nicht */
  boss_t: number;
  /** Frame des Game Over, 0 = keins */
  gameover_frame: number;
}

/** Stand vom Ende des Vorframes (Welt 1: Sperren, Halte, Weckreiz lesen ihn). */
export interface Vorframe {
  lebende: number;
  kamera_x: number;
  kamera_y: number;
  kamera_modus: KameraModus;
  besiegt: number[];
  /** ganzzahlige Lage der Figur */
  figur_x: number;
  figur_z: number;
}

/** Die Welt: aller Zustand eines Laufs; das Protokoll liest nur hieraus. */
export interface Welt extends SlotTabelle {
  /** Nummer des laufenden bzw. zuletzt gelaufenen Logikschritts; 0 vor dem ersten */
  frame: number;
  stage: Stage;
  start: Pruefstart;
  eingabe: Eingabe;
  /** Hauptgenerator (Welt 11.1), Spalte zufall_haupt = zufall.ziehungen */
  zufall: Zufall;
  /** fest.<entscheidung>=wert (Welt 11.3) */
  fest: Readonly<Record<string, string>>;
  rang: RangZustand;
  kamera: KameraZustand;
  sperren: SperreZustand[];
  halte: HaltZustand[];
  wellen: WellenZustand;
  rechte: RechteZustand;
  rahmen: RahmenZustand;
  /** lebende Gegner (Welt 4.3), Spalte lebende */
  lebende: number;
  /** Treffer dieses Frames (KS6, KS7) */
  treffer: Treffer[];
  /** Ereignisse dieses Frames (Kampf 11.4), Spalte ereignis */
  ereignisse: string[];
  /** Prüfangriff i (Reihenfolge in start.pruefangriffe) ist beendet und beginnt nicht neu (Kampf 11.2) */
  pruefangriffe_beendet: boolean[];
  vorframe: Vorframe;
  /** Ende der Scheibe erreicht (Welt 10.5): der Prüflauf hört nach dieser Zeile auf */
  beendet: boolean;
}

// ===========================================================================
// Anlegen der Welt
// ===========================================================================

function lebendeZaehlen(welt: Welt): number {
  let n = 0;
  for (const g of welt.gegner) if (istLebend(g)) n += 1;
  return n;
}

function vorframeSetzen(welt: Welt): void {
  welt.vorframe = {
    lebende: welt.lebende,
    kamera_x: welt.kamera.x,
    kamera_y: welt.kamera.y,
    kamera_modus: welt.kamera.modus,
    besiegt: [...welt.wellen.besiegt],
    figur_x: ganz(welt.figur.x),
    figur_z: ganz(welt.figur.z),
  };
}

/**
 * Legt die Welt aus Stage und Prüfstart an (Welt 2, 4.1, 11.3; Kampf 11.2).
 * Danach ist frame = 0; der erste logikSchritt ist Frame 1 (Kampf 2.1).
 */
export function erzeugeWelt(stage: Stage, start: Pruefstart): Welt {
  if (start.buehne !== stage.id) {
    throw new RangeError(`Prüfstart verlangt Bühne „${start.buehne}“, geladen ist „${stage.id}“`);
  }
  for (const e of start.eingriffe) eingriffPruefen(e);
  const slots = slotTabelleNeu();
  const kx = start.kamera_x ?? 0;
  const welt: Welt = {
    ...slots,
    frame: 0,
    stage,
    start,
    eingabe: { t: KEINE, t1: KEINE, t2: KEINE, neu: KEINE },
    zufall: zufallNeu(start.seed),
    fest: { ...start.fest },
    rang: { rang: start.rang ?? RANG_START, zaehler: 0, fest: start.rang_fest },
    kamera: {
      x: kx,
      y: kameraY(stage, kx),
      modus: start.kamera_modus ?? 'FREI',
      fest: stage.kamera_fest,
      schuetteln_x: 0,
      schuetteln_y: 0,
      schuetteln_art: '',
      schuetteln_ab: 0,
      pfeil: 0,
      blende_c: 0,
      schnitt_ausgefuehrt: false,
      arena_ab: start.kamera_modus === 'ARENA' ? ERSTER_FRAME : 0,
      freigabe_frame: 0,
      freigabe_x: 0,
    },
    sperren: stage.sperren.filter((s) => !start.sperren_aus.includes(s.id)).map((s) => ({ ...s, freigegeben: false })),
    halte: stage.halte.filter((h) => !start.halte_aus.includes(h.id)).map((h) => ({ ...h, freigegeben: false })),
    wellen: {
      liste: stage.wellen.map((w) => ({ satz: w, aus: start.wellen_aus.includes(w.nr), ausgeloest: false, frame: 0 })),
      ausgeloest: [],
      vorgemerkt: [],
      besiegt: [],
      nur_boss: start.welle7_nur_boss,
    },
    rechte: { l: null, r: null, ziel: null },
    rahmen: {
      leben: LEBEN_START,
      punkte: 0,
      anzeige: null,
      anzeige_typ: '',
      anzeige_lp: 0,
      anzeige_lebt: false,
      phase: 'SPIEL',
      steuerung: 1,
      boss_t: 0,
      gameover_frame: 0,
    },
    lebende: 0,
    treffer: [],
    ereignisse: [],
    pruefangriffe_beendet: start.pruefangriffe.map(() => false),
    vorframe: { lebende: 0, kamera_x: kx, kamera_y: 0, kamera_modus: 'FREI', besiegt: [], figur_x: 0, figur_z: 0 },
    beendet: false,
  };

  // Figur (Kampf 11.2: x, z, blick, lp, waffe, munition; sonst Start der Stage)
  const f = welt.figur;
  f.x = ausGanz(start.figur.x ?? stage.start_x);
  f.z = ausGanz(start.figur.z ?? stage.start_z);
  f.blick = start.figur.blick ?? stage.start_blick;
  f.lp = start.figur.lp ?? FIGUR_LP;
  f.lp_max = FIGUR_LP;
  f.waffe = start.figur.waffe ?? '';
  f.munition = start.figur.munition ?? (f.waffe === 'RW' ? RAKETENWERFER_MUNITION : 0);

  // Vorplatzierte Gegner der Stage (Welt 4.1): Boss in s0, übrige ab s1 in Zeilenfolge;
  // der Slot bleibt reserviert, auch wenn die Welle aus ist.
  let naechster = ERSTER_GEGNERSLOT;
  let bossGesehen = false;
  for (const satz of stage.gegner) {
    let nr: number;
    if (satz.typ === 'Ballast') {
      if (bossGesehen) throw new RangeError('Stage mit zwei Bossen');
      bossGesehen = true;
      nr = BOSS_SLOT;
    } else {
      nr = naechster;
      naechster += 1;
    }
    if (nr >= GEGNER_SLOTS) throw new RangeError('Stage mit mehr vorplatzierten Gegnern als Slots');
    if (start.wellen_aus.includes(satz.welle)) continue;
    gegnerAusStage(welt, welt.gegner[nr] as Gegner, satz);
  }

  // Gegner der Prüfszene, die von Beginn an da sind (ersetzen einen Stage-Gegner im selben Slot)
  for (const gs of start.gegner) if (vonBeginn(gs)) gegnerAusSzene(welt, gs);

  // Zufall je Gegner beim Laden, Slots aufsteigend (Welt 11.1)
  for (const g of welt.gegner) if (g.belegt) gegnerZufallGeben(welt, g);

  // Übergabe an die Gegnerlogik, Slots aufsteigend
  for (const g of welt.gegner) if (g.belegt) gegnerUebergeben(welt, g);

  // Behälter der Stage in Zeilenfolge, dann zusätzliche des Prüfstarts (Welt 9.1, 11.3)
  let objektNr = 0;
  const behaelter = [...stage.behaelter.filter((b) => !start.behaelter_aus.includes(b.id)), ...start.behaelter_zusatz];
  for (const b of behaelter) {
    const o = welt.objekte[objektNr];
    if (o === undefined) throw new RangeError('mehr Behälter als Objektslots');
    behaelterAnlegen(o, b, start.welle7_nur_boss && b.art === 'Bosskiste');
    objektNr += 1;
  }
  // Objekte der Prüfszene in ihren Slots
  for (const os of start.objekte) {
    const o = welt.objekte[os.slot - OBJEKT_SLOT_ERSTER];
    if (o !== undefined && o.belegt) throw new RangeError(`Objektslot o${os.slot} ist schon belegt`);
    objektAusSzene(welt, os);
  }

  figurInitialisieren(welt);
  welt.lebende = lebendeZaehlen(welt);
  vorframeKopieren(welt);
  vorframeSetzen(welt);
  return welt;
}

// ===========================================================================
// Logikschritt
// ===========================================================================

/** W4: Entscheidung eines Gegners nach Typ (Abschnitt 1 des Vertrags). */
function gegnerEntscheidung(welt: Welt, g: Gegner): void {
  if (g.typ === 'Ballast') {
    bossEntscheidung(welt, g);
    return;
  }
  if (!g.logik || g.typ === 'Puppe') {
    puppeEntscheidung(welt, g);
    return;
  }
  if (istReaktion(g.modus)) return;
  if (g.typ === 'Bolzer' || g.typ === 'Rammbock') nahEntscheidung(welt, g);
  else if (g.typ === 'Zünder') fernEntscheidung(welt, g);
}

/** KS3: Reaktion oder Bewegung eines Gegners. */
function gegnerBewegung(welt: Welt, g: Gegner): void {
  if (g.typ === 'Ballast') {
    bossBewegung(welt, g);
    return;
  }
  if (reaktionSchritt(welt, g)) return;
  if (!g.logik || g.typ === 'Puppe') return;
  if (g.typ === 'Bolzer' || g.typ === 'Rammbock') nahBewegung(welt, g);
  else if (g.typ === 'Zünder') fernBewegung(welt, g);
}

/** KS5: Abbruchprüfung eines Gegners. */
function gegnerAbbruch(welt: Welt, g: Gegner): void {
  if (g.typ === 'Ballast') {
    bossAbbruch(welt, g);
    return;
  }
  if (!g.logik || g.typ === 'Puppe' || istReaktion(g.modus)) return;
  if (g.typ === 'Bolzer' || g.typ === 'Rammbock') nahAbbruch(welt, g);
  else if (g.typ === 'Zünder') fernAbbruch(welt, g);
}

/** KS7: Treffer an Ziel- und Urheberhandler verteilen (Abschnitt 1 und 3 des Vertrags). */
function trefferVerteilen(welt: Welt): void {
  for (const t of welt.treffer) {
    if (t.ziel === 'f') {
      figurGetroffen(welt, t);
    } else if (istGegnerSlot(t.ziel)) {
      const g = gegnerVon(welt, t.ziel);
      if (g === null || !g.belegt) throw new Error(`KS7: Treffer auf freien Gegnerslot ${t.ziel}`);
      if (g.typ === 'Ballast') bossGetroffen(welt, t);
      else gegnerGetroffen(welt, t);
    } else {
      const o = objektVon(welt, t.ziel);
      if (o === null || !o.belegt) throw new Error(`KS7: Treffer auf freien Slot ${t.ziel}`);
      behaelterGetroffen(welt, t);
    }
    if (t.wirkung === '') throw new Error(`KS7: Zielhandler für ${t.ziel} hat keine Wirkung gesetzt (Vertrag 3)`);
  }
  for (const t of welt.treffer) {
    if (t.wirkung === 'W') continue;
    if (t.urheber === 'f') {
      figurHatGetroffen(welt, t);
      continue;
    }
    const g = gegnerVon(welt, t.urheber);
    if (g === null || !g.logik) continue;
    if (g.typ === 'Ballast') bossHatGetroffen(welt, t);
    else if (g.typ === 'Bolzer' || g.typ === 'Rammbock') nahHatGetroffen(welt, t);
    else if (g.typ === 'Zünder') fernHatGetroffen(welt, t);
  }
}

/**
 * Ein Logikschritt (Frame f = welt.frame + 1) mit der Tastenmenge T(f), die
 * zu Beginn von f abgefragt wurde. Die Figur wertet T(f−1) aus (ein Frame
 * Latenz, Kampf 2.1). Reihenfolge: Abschnitt 1 des Vertrags oben.
 */
export function logikSchritt(welt: Welt, tasten: Tasten): void {
  welt.frame += 1;
  const e = welt.eingabe;
  e.t2 = e.t1;
  e.t1 = e.t;
  e.t = tasten & ALLE;
  e.neu = KEINE;
  welt.ereignisse = [];
  welt.treffer = [];
  vorframeKopieren(welt);
  vorframeSetzen(welt);
  for (const g of welt.gegner) if (g.belegt) g.modus_uhr += 1;

  // W1 Eingriffe
  eingriffeAusfuehren(welt);
  // W2 Rang
  rangSchritt(welt);
  // W3 vorgemerkte Gegner, Weckreiz
  wellenAnlegen(welt);
  // W4 steuerung und Phase dieses Frames, Entscheidungen der Gegner und des Bosses
  rahmenVorlauf(welt);
  rechteSchritt(welt);
  for (const g of welt.gegner) if (g.belegt) gegnerEntscheidung(welt, g);

  // KS1 Eingabe, neue Drücke, Sprint-Erkennung
  e.neu = neuGedrueckt(e.t1, e.t2);
  figurEingabe(welt);
  // KS2 Figur
  figurSchritt(welt);
  // KS3 Gegner, dann Prüfangriffe
  for (const g of welt.gegner) if (g.belegt) gegnerBewegung(welt, g);
  pruefangriffeSchritt(welt);
  // KS4 Geschosse
  figurGeschosseSchritt(welt);
  fernGeschosseSchritt(welt);
  // KS5 Abbruchprüfung
  for (const g of welt.gegner) if (g.belegt) gegnerAbbruch(welt, g);
  // KS6 Trefferprüfung
  trefferPruefen(welt);
  // KS7 Folgen
  trefferVerteilen(welt);
  trefferFolgen(welt);
  griffPruefen(welt);

  // W5 Super-Armor, Fall, Punkte, Gegneranzeige
  bossW5(welt);
  rahmenW5(welt);
  // W6 Kamera, Verschwinden beim Scrollen
  kameraSchritt(welt);
  gegenstaendeScrollen(welt);
  // W7 Wellen
  wellenPruefen(welt);
  // W8 Gegenstände, Rahmen
  gegenstaendeSchritt(welt);
  rahmenSchritt(welt);
}
