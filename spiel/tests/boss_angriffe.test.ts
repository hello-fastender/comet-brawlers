// Tests K4: Rhythmus und Wahl (Welt 7.2), Angriffe der Scheibe (7.3:
// Armschwung AS nach E18, Ansturm AN, Körperpresse KP), ihre Instanzen
// (aktive Frames, Flächen, Schaden), Auftritt und Weckreiz (4.2, 4.6).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossWecken } from '../src/kern/gegner/boss.ts';
import { presseHoehe } from '../src/kern/gegner/boss_angriffe.ts';
import { ART_CODES, lies } from '../src/kern/gegner/boss_zustand.ts';
import type { Gegner } from '../src/kern/entitaeten.ts';
import { zuDezimalText } from '../src/kern/festkomma.ts';
import { bei, boss, bossLauf, bossWelt, frames } from './boss_hilfe.ts';

const PS7 = 'tests/szenen/boss_ps7.txt';

function mitAngriff(code: string, zusatz: string = ''): string {
  return `pruefstart boss.angriffe=an fest.boss_angriff=${code}\n${zusatz}`;
}

test('Boss: erster Angriff 60 Frames nach der Kampfbereitschaft, nächster d Frames nach dem Beginn', () => {
  const welt = bossWelt(PS7, mitAngriff('AS', 'pruefstart fest.boss_abstand=180'));
  const v = bossLauf(welt, 260);
  assert.deepEqual(frames(v, 1, 260, (s) => s.ereignisse.some((e) => e.startsWith('AS:'))), [61, 241]);
  assert.ok(bei(v, 61).ereignisse.includes('AS:s0:AS1'));
  // ohne feste Ziehung: d gleichverteilt 170 bis 200; je Entscheidung eine Ziehung
  const welt2 = bossWelt(PS7, mitAngriff('AS'));
  const v2 = bossLauf(welt2, 61);
  const d = boss(welt2).naechster_angriff - 61;
  assert.ok(d >= 170 && d <= 200, `d = ${d}`);
  assert.equal(boss(welt2).zufall.ziehungen, 2, 'Wahl und Abstand');
  assert.equal(bei(v2, 60).modus, 'BEREIT');
});

test('Boss: Wahl nach Abstand über zufall.ts (nah AS oder KP, fern auch AN)', () => {
  // Wahl im Entscheidungsframe 61; der Armschwung beginnt erst in Reichweite (fern mit Bewegung aus: nie)
  const gewaehlt = (g: Gegner): string => ART_CODES[lies(g, 'wahl')] || g.angriff_code.slice(0, 2);
  const nah = new Set<string>();
  const fern = new Set<string>();
  // große Seeds: Xorshift aus kleinen Startwerten liefert anfangs kleine Zahlen (Welt 11.1)
  for (let i = 1; i <= 40; i++) {
    const seed = 12345 + 1000003 * i;
    const w1 = bossWelt(PS7, 'pruefstart boss.angriffe=an', seed);
    bossLauf(w1, 61);
    nah.add(gewaehlt(boss(w1)));
    const w2 = bossWelt(PS7, 'pruefstart boss.angriffe=an figur.x=1900', seed);
    bossLauf(w2, 61);
    fern.add(gewaehlt(boss(w2)));
  }
  assert.deepEqual([...nah].sort(), ['AS', 'KP']);
  assert.deepEqual([...fern].sort(), ['AN', 'AS', 'KP']);
});

test('Boss: Armschwung bricht nach Fehlschlag ab (E18)', () => {
  const welt = bossWelt(PS7, mitAngriff('AS'));
  const v = bossLauf(welt, 250);
  const g = boss(welt);
  // A = 61: Ausholen 61 bis 77, aktiv A+17 bis A+19, Nachlauf 30, BEREIT ab 111
  assert.equal(bei(v, 61).modus, 'ANKUENDIGUNG');
  assert.equal(bei(v, 61).angriff_code, 'AS1');
  assert.deepEqual(frames(v, 1, 250, (s) => s.aktiv), [78, 79, 80]);
  assert.equal(bei(v, 78).modus, 'ANGRIFF');
  assert.deepEqual(frames(v, 1, 250, (s) => s.modus === 'NACHLAUF'), Array.from({ length: 30 }, (_, i) => 81 + i));
  assert.equal(bei(v, 111).modus, 'BEREIT');
  assert.deepEqual(frames(v, 1, 250, (s) => s.ereignisse.some((e) => e.startsWith('AS:s0:AS2'))), []);
  assert.equal(g.angriff, null);
});

test('Boss: Armschwung-Instanz mit Fläche, Schaden nach Rangstufe, nur der dritte Schwung wirft um', () => {
  const welt = bossWelt(PS7, mitAngriff('AS'));
  bossLauf(welt, 61);
  const inst = boss(welt).angriff;
  assert.ok(inst !== null);
  assert.equal(inst.code, 'AS');
  assert.deepEqual(inst.flaeche, { art: 'abstand', vorn: 105, hinten: 16, hinten_weg: null, tiefe: 12, hoehe_angreifer_max: null, hoehe_ziel_max: 66 });
  assert.equal(inst.schaden, 10, 'Rang 9 = Rangstufe II');
  assert.equal(boss(welt).schaden, 10);
  assert.equal(inst.umwerfen, false);
  assert.equal(inst.einmal, true);
  assert.equal(inst.gegen, 'figur');
  assert.equal(inst.trefferstopp, true);
});

test('Boss: Armschwung nach Treffer weiter, höchstens drei Schwünge, der dritte wirft um', () => {
  const welt = bossWelt(PS7, mitAngriff('AS'));
  const v = bossLauf(welt, 200, { bossTrifft: [78, 114, 150] });
  // Schwung 1 trifft in A+17: 7 Frames länger aktiv; Schwung 2 in A_1+36 = 97, Schwung 3 in 133
  assert.deepEqual(frames(v, 1, 200, (s) => s.ereignisse.some((e) => e.startsWith('AS:'))), [61, 97, 133]);
  assert.ok(bei(v, 97).ereignisse.includes('AS:s0:AS2'));
  assert.ok(bei(v, 133).ereignisse.includes('AS:s0:AS3'));
  // aktiv A_k+17 bis A_k+19, mit Treffer 7 Frames länger: A_k+17 bis A_k+26
  const reihe = (a: number): number[] => Array.from({ length: 10 }, (_, i) => a + 17 + i);
  assert.deepEqual(frames(v, 61, 96, (s) => s.aktiv), reihe(61));
  assert.deepEqual(frames(v, 97, 132, (s) => s.aktiv), reihe(97));
  assert.deepEqual(frames(v, 133, 200, (s) => s.aktiv), reihe(133));
  assert.equal(bei(v, 133).angriff_code, 'AS3');
  assert.equal(frames(v, 1, 200, (s) => s.ereignisse.some((e) => e.startsWith('AS:s0:AS4'))).length, 0);
  // Nachlauf 30 nach dem letzten aktiven Frame 159 des dritten Schwungs: BEREIT ab 190
  assert.equal(bei(v, 160).modus, 'NACHLAUF');
  assert.equal(bei(v, 189).modus, 'NACHLAUF');
  assert.equal(bei(v, 190).modus, 'BEREIT');
});

test('Boss: dritter Schwung trägt das Umwerfen in seiner Instanz', () => {
  const welt = bossWelt(PS7, mitAngriff('AS'));
  bossLauf(welt, 133, { bossTrifft: [78, 114] });
  const inst = boss(welt).angriff;
  assert.ok(inst !== null);
  assert.equal(inst.umwerfen, true);
  assert.equal(inst.bahn, 'F1');
});

test('Boss: Ansturm wirft bei Kontakt um und endet beim Treffer, Auslauf 30 px', () => {
  const welt = bossWelt(PS7, mitAngriff('AN', 'pruefstart figur.x=1900'));
  const v = bossLauf(welt, 120, { bossTrifft: [90] });
  const s61 = bei(v, 61);
  assert.ok(s61.ereignisse.includes('AS:s0:AN'));
  assert.equal(s61.modus, 'ANKUENDIGUNG');
  // Ausholen 20 Frames (61 bis 80), Lauf ab 81 mit 4 px/Frame, aktiv in jedem Lauf-Frame
  assert.deepEqual(frames(v, 61, 80, (s) => s.aktiv), []);
  assert.equal(bei(v, 80).x, '2060');
  assert.equal(bei(v, 81).x, '2056');
  assert.equal(bei(v, 90).x, '2020');
  assert.deepEqual(frames(v, 61, 120, (s) => s.aktiv), Array.from({ length: 10 }, (_, i) => 81 + i));
  // Nachlauf 16 Frames ab 91 mit Auslauf (3,75 + 3,5 + … + 0,25 = 30 px)
  assert.equal(bei(v, 91).modus, 'NACHLAUF');
  assert.equal(bei(v, 91).x, '2016.25');
  assert.equal(bei(v, 105).x, '1990');
  assert.equal(bei(v, 106).x, '1990');
  assert.equal(bei(v, 106).modus, 'NACHLAUF');
  assert.equal(bei(v, 107).modus, 'BEREIT');
});

test('Boss: Ansturm-Instanz: wirft um (F1), ohne Griff, Fläche vorn 0 bis 40, Schaden nach Rangstufe', () => {
  const welt = bossWelt(PS7, mitAngriff('AN', 'pruefstart figur.x=1900'));
  bossLauf(welt, 81);
  const inst = boss(welt).angriff;
  assert.ok(inst !== null);
  assert.equal(inst.code, 'AN');
  assert.equal(inst.umwerfen, true);
  assert.equal(inst.bahn, 'F1');
  assert.equal(inst.aktiv, true);
  assert.deepEqual(inst.flaeche, { art: 'abstand', vorn: 40, hinten: 0, hinten_weg: null, tiefe: 12, hoehe_angreifer_max: null, hoehe_ziel_max: 90 });
  assert.equal(inst.schaden, 14);
});

test('Boss: Ansturm ohne Treffer höchstens 176 px, lenkt in der Tiefe 1 px/Frame nach (schräg 3,92)', () => {
  const welt = bossWelt(PS7, mitAngriff('AN', 'pruefstart figur.x=1900 figur.z=55'));
  const v = bossLauf(welt, 150);
  assert.equal(bei(v, 81).z, '51');
  assert.equal(bei(v, 81).x, zuDezimalText(2060 * 65536 - 256901));
  assert.equal(bei(v, 85).z, '55');
  assert.equal(bei(v, 86).z, '55');
  const lauf = frames(v, 81, 150, (s) => s.aktiv);
  assert.equal(lauf.length, 45);
  assert.equal(lauf[0], 81);
  const xEnde = bei(v, lauf.at(-1) as number).x;
  assert.equal(xEnde, String(2060 - 176));
  assert.equal(bei(v, 126).modus, 'NACHLAUF');
});

test('Boss: Körperpresse mit Hocke, Flugbahn zum Zielpunkt, aktiv A+51 bis A+62, Landung A+64', () => {
  const welt = bossWelt(PS7, mitAngriff('KP'));
  const v = bossLauf(welt, 200);
  // Hocke 61 bis 75 (Ankündigung 15 Frames), Absprung A = 76 zum Ort der Figur (2000, 50)
  assert.ok(bei(v, 61).ereignisse.includes('AS:s0:KP'));
  assert.deepEqual(frames(v, 61, 75, (s) => s.modus === 'ANKUENDIGUNG').length, 15);
  assert.equal(bei(v, 76).modus, 'ANGRIFF');
  assert.equal(bei(v, 76).h, '0');
  assert.equal(bei(v, 77).x, zuDezimalText(2060 * 65536 + Math.floor((-60 * 65536 * 1) / 64)));
  assert.equal(bei(v, 107).h, '107.5', 'Scheitel in A+31');
  assert.equal(bei(v, 107).x, '2030.9375');
  assert.equal(bei(v, 140).x, '2000');
  assert.equal(bei(v, 140).h, '0');
  assert.deepEqual(frames(v, 61, 200, (s) => s.aktiv), Array.from({ length: 12 }, (_, i) => 127 + i));
  // Bildschütteln ab der Landung (KA10, schuettelnStarten von K3)
  assert.equal(lies(boss(welt), 'kp_landung'), 140);
  // Nachlauf 40 nach dem letzten aktiven Frame 138: BEREIT ab 179
  assert.equal(bei(v, 141).modus, 'NACHLAUF');
  assert.equal(bei(v, 178).modus, 'NACHLAUF');
  assert.equal(bei(v, 179).modus, 'BEREIT');
  const inst = boss(welt);
  assert.equal(inst.schaden, 18);
});

test('Boss: Körperpresse mit Treffer stoppt 7 Frames, Landung A+71', () => {
  const welt = bossWelt(PS7, mitAngriff('KP'));
  let flaeche: unknown = null;
  const v = bossLauf(welt, 200, {
    bossTrifft: [127],
    vorher: (w, f) => {
      if (f === 127) flaeche = boss(w).angriff?.flaeche ?? null;
    },
  });
  assert.deepEqual(flaeche, { art: 'umkreis', halbbreite: 25, tiefe: 12, hoehe_ziel_max: null });
  const h127 = bei(v, 127).h;
  for (let f = 128; f <= 134; f++) assert.equal(bei(v, f).h, h127, `Stopp in ${f}`);
  assert.notEqual(bei(v, 135).h, h127);
  assert.equal(bei(v, 146).h === '0', false);
  assert.equal(bei(v, 147).h, '0');
  assert.equal(bei(v, 147).x, '2000');
  assert.equal(bei(v, 186).modus, 'BEREIT');
  assert.equal(bei(v, 185).modus, 'NACHLAUF');
});

test('Boss: Höhenverlauf der Körperpresse steigt bis 107,5 in A+31 und fällt bis zur Landung', () => {
  let vorher = -1;
  for (let k = 1; k <= 31; k++) {
    assert.ok(presseHoehe(k) > vorher, `steigt in k = ${k}`);
    vorher = presseHoehe(k);
  }
  for (let k = 32; k <= 63; k++) {
    assert.ok(presseHoehe(k) < vorher && presseHoehe(k) > 0, `fällt in k = ${k}`);
    vorher = presseHoehe(k);
  }
  assert.equal(presseHoehe(64), 0);
  assert.equal(zuDezimalText(presseHoehe(31)), '107.5');
});

test('Boss: Treffer von vorn im eigenen Angriff unterbricht nicht, der Stoß folgt nach dem Angriff (SA3, SA5)', () => {
  const welt = bossWelt(PS7, mitAngriff('AN', 'pruefstart figur.x=1900'));
  const v = bossLauf(welt, 140, { treffer: { 65: [{ code: 'KT1', schaden: 3, von_vorn: true }] } });
  assert.deepEqual([bei(v, 65).lp, bei(v, 65).folge, bei(v, 65).modus], [97, 1, 'ANKUENDIGUNG']);
  // h+23 = 88: LP zurück im Lauf, der Lauf läuft weiter (45 Frames ab 81)
  assert.equal(bei(v, 88).lp, 100);
  assert.ok(bei(v, 88).ereignisse.includes('SA:s0:100'));
  assert.equal(bei(v, 88).modus, 'ANGRIFF');
  // Lauf 81 bis 124 (44 Frames zu 4 px = 176 px), Stoß im ersten Frame danach
  assert.equal(bei(v, 124).modus, 'ANGRIFF');
  assert.equal(bei(v, 125).modus, 'STOSS');
  assert.ok(bei(v, 125).ereignisse.every((e) => !e.startsWith('SA:')));
});

test('Boss: Treffer von hinten im eigenen Angriff bricht ihn ab (GETROFFEN)', () => {
  const welt = bossWelt(PS7, mitAngriff('AS'));
  const v = bossLauf(welt, 100, { treffer: { 70: [{ code: 'KT1', schaden: 3, von_vorn: false }] } });
  assert.equal(bei(v, 70).modus, 'GETROFFEN');
  assert.equal(boss(welt).angriff, null);
  assert.deepEqual(frames(v, 70, 100, (s) => s.aktiv), []);
  assert.equal(bei(v, 93).modus, 'STOSS');
});

test('Boss: Weckreiz, Auftritt 60 Frames nicht treffbar, Kisten zerbrechen, erster Angriff 60 Frames danach', () => {
  const welt = bossWelt('tests/szenen/boss_weckreiz.txt', 'pruefstart fest.boss_angriff=AS');
  const g = boss(welt);
  assert.deepEqual([g.modus, g.zustand, g.aktion], ['WARTEN', 2, 'WARTEN']);
  // Arena-Auslöser (Welle 7) in W7 von Frame 4 (sonst K3, wellen.ts): Weckreiz in Frame 5
  const v = bossLauf(welt, 130, {
    vorher: (w, f) => {
      if (f === 5) {
        const w7 = w.wellen.liste.find((x) => x.satz.nr === 7);
        if (w7 === undefined) throw new Error('Welle 7 fehlt');
        w7.ausgeloest = true;
        w7.frame = 4;
      }
    },
  });
  assert.equal(bei(v, 4).modus, 'WARTEN');
  assert.equal(bei(v, 5).modus, 'AUFTRITT');
  assert.ok(bei(v, 5).ereignisse.includes('WK:s0'));
  const kisten = welt.objekte.filter((o) => o.belegt && o.art === 'Bosskiste');
  assert.equal(kisten.length, 3);
  for (const k of kisten) {
    assert.equal(k.zerbrochen, true);
    assert.equal(k.zerbrochen_h, 5);
  }
  assert.deepEqual(frames(v, 5, 64, (s) => s.zustand !== 2), []);
  assert.equal(bei(v, 65).modus, 'BEREIT');
  assert.equal(bei(v, 65).zustand, 1);
  // geht heran (1,25 × 0,625 px/Frame, hält 70 px), erster Angriff 60 Frames nach der Kampfbereitschaft
  // im Frame w + Dauer handelt er schon (Welt 4.2)
  assert.equal(bei(v, 64).x, '2080');
  assert.equal(bei(v, 65).x, '2078.75');
  assert.equal(bei(v, 65).z, '79.375');
  assert.equal(bei(v, 65).aktion, 'GEHEN');
  assert.deepEqual(frames(v, 65, 130, (s) => s.ereignisse.some((e) => e.startsWith('AS:'))), [125]);
  assert.ok(bei(v, 125).ereignisse.includes('AS:s0:AS1'));
  assert.ok(Math.abs(Number(bei(v, 124).x) - 2000) <= 78 && Math.abs(Number(bei(v, 124).z) - 50) <= 6);
  assert.ok(g.naechster_angriff >= 125 + 170 && g.naechster_angriff <= 125 + 200);
});

test('Boss: bossWecken (für K3 in W3) und welle.7=nur_boss (sofort kampffähig)', () => {
  const welt = bossWelt('tests/szenen/boss_weckreiz.txt');
  welt.frame = 9;
  welt.ereignisse = [];
  bossWecken(welt, boss(welt));
  assert.deepEqual([boss(welt).modus, boss(welt).kampffaehig_ab, welt.ereignisse.join(';')], ['AUFTRITT', 69, 'WK:s0']);
  bossWecken(welt, boss(welt));
  assert.equal(welt.ereignisse.length, 1, 'nur einmal');
  const w2 = bossWelt(PS7);
  assert.deepEqual([boss(w2).modus, boss(w2).zustand, boss(w2).naechster_angriff], ['BEREIT', 1, 61]);
});
