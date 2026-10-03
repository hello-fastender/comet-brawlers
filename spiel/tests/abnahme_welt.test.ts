// Abnahmetests der Welt nach docs/spezifikation-welt.md, Abschnitt 12 (K5,
// Stufe 3): dort T1 bis T10, hier W-T1 bis W-T10, je Test genau ein test().
// Bühne scheibe, Seed 12345; Prüfstarts PS1 bis PS10b als Prüfszenen in
// tests/szenen/W-T*.txt, Eingaben in tests/eingaben/W-T*.txt (Läufe a, b, c
// als W-T5_a.txt usw.). Der Prüflauf geht über src/pruef/ (pruefLauf),
// verglichen werden die genannten Protokollzellen als Text, Toleranz keine.
// Festlegungen nach Auftrag 3, Abschnitt 2.6 nennt der Kommentar mit der
// Nummer in docs/scheibe.md, „Abweichungen und Lücken“.

import { test } from 'node:test';
import { abnahmeLauf, ganzzahlig, Pruefung } from './abnahme_hilfe.ts';
import type { AbnahmeLauf } from './abnahme_hilfe.ts';

/** Slot (on) aus dem ersten Ereignis eines Frames, das dem Muster mit einer Gruppe (o\d+) entspricht. */
function slotAus(l: AbnahmeLauf, frame: number, muster: RegExp): string | undefined {
  for (const e of l.ereignisse(frame)) {
    const m = muster.exec(e);
    if (m !== null) return m[1];
  }
  return undefined;
}

test('W-T1', () => {
  // Kamera folgt, linker Rand (KA1, KA2, 2.2). PS1; R 1–120, L 121–300
  const l = abnahmeLauf('W-T1');
  const p = new Pruefung(l);
  p.werte(79, { f_x: '200.5', kamera_x: '0' });
  p.werte(80, { f_x: '202.25', kamera_x: '2' });
  p.werte(121, { f_x: '274', kamera_x: '74' });
  p.gleich(122, 'f_blick', 'L');
  p.gleich(221, 'f_x', '99');
  p.gleich(222, 'f_x', '98');
  p.werte(301, { f_x: '98', kamera_x: '74' });
  p.bereich(1, l.letzterFrame(), { kamera_modus: 'FREI', kamera_y: '128' });
  p.ende();
});

test('W-T2', () => {
  // Weckreiz, Aufwachen, Sperre (4.2, KA4, KA5). PS2; R 1–340; in 360 s2, s3 lp := −1
  const p = new Pruefung(abnahmeLauf('W-T2'));
  p.gleich(222, 'kamera_x', '250');
  p.gleich(223, 's2_modus', 'AUFTRITT');
  p.ereignis(223, 'WK:s2');
  p.gleich(239, 'kamera_x', '280');
  p.gleich(240, 's3_modus', 'AUFTRITT');
  p.gleich(272, 's2_modus', 'ABWARTEN');
  p.gleich(307, 'kamera_x', '399');
  p.werte(308, { kamera_x: '400', kamera_modus: 'SPERRE' });
  p.gleich(309, 's3_modus', 'ABWARTEN');
  p.gleich(341, 'f_x', '659');
  p.werte(360, { s2_modus: 'TOT', s3_modus: 'TOT', kamera_x: '400' });
  p.werte(361, { kamera_x: '404', kamera_modus: 'FREI', pfeil: '1' });
  p.ereignis(361, 'SR:S1');
  p.gleich(375, 'kamera_x', '459');
  p.ende();
});

test('W-T3', () => {
  // Halt, Schnitt, Arena (KA6, KA7, KA8, KA13). PS3; R 1–150, R 170–200, R 330–460, L 470–560; in 160 s1 lp := −1
  const p = new Pruefung(abnahmeLauf('W-T3'));
  p.gleich(23, 'kamera_x', '438');
  p.werte(24, { kamera_x: '440', kamera_modus: 'HALT' });
  p.gleich(115, 'f_x', '799.5');
  p.gleich(116, 'f_x', '800');
  p.werte(160, { s1_modus: 'TOT', kamera_x: '440' });
  p.gleich(161, 'kamera_x', '444');
  p.ereignis(161, 'HR:H1');
  p.gleich(167, 'kamera_x', '466');
  p.gleich(184, 'f_x', '824.5');
  p.gleich(185, 'f_x', '826');
  p.ereignis(185, 'BL:a');
  p.werte(186, { steuerung: '0', kamera_modus: 'BLENDE' });
  p.gleich(213, 'kamera_x', '466');
  p.werte(214, { kamera_x: '1792', kamera_y: '0', f_x: '1900', f_z: '55' });
  p.ereignis(214, 'BL:v');
  p.gleich(319, 'steuerung', '0');
  p.werte(320, { steuerung: '1', kamera_modus: 'ARENA' });
  p.werte(415, { f_x: '2048.75', kamera_x: '1792' });
  p.gleich(416, 'kamera_x', '1794');
  p.werte(461, { f_x: '2129.25', kamera_x: '1873' });
  p.werte(543, { f_x: '2001.5', kamera_x: '1873' });
  p.werte(544, { f_x: '1999.75', kamera_x: '1871' });
  p.werte(561, { f_x: '1970', kamera_x: '1842' });
  p.ende();
});

test('W-T4', () => {
  // Versteck, Annähern, Pause, Treffer (4.2, 5.3, 5.4). PS4; R 1–88
  const l = abnahmeLauf('W-T4');
  const p = new Pruefung(l);
  p.gleich(88, 'f_x', '216.25');
  p.werte(89, { f_x: '218', kamera_x: '18' });
  p.ereignis(89, 'WL:1');
  p.gleich(90, 's1_modus', 'AUFTRITT');
  p.werte(106, { s1_modus: 'ANNAEHERN', recht_r: '1', s1_x: '366.25' });
  p.gleich(162, 's1_x', '268.25');
  p.gleich(163, 's1_x', '266.5');
  p.gleich(164, 's1_modus', 'KAMPFHALTUNG');
  p.werte(185, { s1_modus: 'ANGRIFF', s1_angriff: 'BA', s1_ziel: '48', s1_schaden: '5' });
  // 194 erster aktiver Frame (A+9): Treffer, f_lp 67
  p.gleich(194, 'f_lp', '67');
  p.ereignis(194, 'T:s1>F:BA:5:R');
  for (let f = 185; f < 194; f++) p.keinEreignis(f, /^T:s1>F:/);
  p.ende();
});

test('W-T5', () => {
  // Zielpunkt und Abbruch (5.4). PS4 wie W-T4
  // a: dazu L 185–193: Treffer trotz 15,75 px Weg (Fenster 186 bis 249)
  const p = new Pruefung(abnahmeLauf('W-T5_a'), 'Lauf a');
  p.werte(194, { f_x: '202.25', f_lp: '67' });
  // b: dazu U 175–199: dz (Gegner minus Figur, Welt 1) 10, 11, 12; Abbruch in 187
  const b = abnahmeLauf('W-T5_b');
  p.lauf(b, 'Lauf b');
  const dz = (f: number) => ganzzahlig(b.wert(f, 's1_z')) - ganzzahlig(b.wert(f, 'f_z'));
  p.gleich(185, 's1_modus', 'ANGRIFF');
  p.wahr(dz(185) === 10, `Frame 185: dz erwartet 10, ist ${dz(185)}`);
  p.wahr(dz(186) === 11, `Frame 186: dz erwartet 11, ist ${dz(186)}`);
  p.wahr(dz(187) === 12, `Frame 187: dz erwartet 12, ist ${dz(187)}`);
  p.gleich(187, 's1_modus', 'ANNAEHERN');
  p.ereignis(187, 'AA:s1');
  p.bereich(1, 200, { f_lp: '72' });
  p.ende();
});

test('W-T6', () => {
  // Angriffserlaubnis und Schutz (5.7). PS6, keine Eingabe
  const l = abnahmeLauf('W-T6');
  const p = new Pruefung(l);
  p.werte(1, { recht_r: '1', recht_l: '4', s2_modus: 'ABWARTEN', s3_modus: 'ABWARTEN' });
  p.gleich(2, 's3_x', '636.5');
  p.gleich(30, 's1_x', '547.5');
  p.gleich(31, 's1_modus', 'KAMPFHALTUNG');
  p.gleich(36, 's4_x', '453');
  p.gleich(37, 's4_modus', 'KAMPFHALTUNG');
  p.gleich(52, 's1_modus', 'ANGRIFF');
  p.gleich(58, 's4_modus', 'ANGRIFF');
  p.gleich(61, 'f_lp', '67');
  // 67 erster aktiver Frame von s4 (A+9): Treffer mit Wirkung W (E2)
  p.gleich(67, 'f_lp', '67');
  p.ereignis(67, 'T:s4>F:BA:5:W');
  for (let f = 58; f < 67; f++) p.keinEreignis(f, /^T:s4>F:/);
  // in keinem Frame mehr als zwei Gegner in KAMPFHALTUNG, ANGRIFF oder NACHLAUF, nie zwei auf derselben Seite
  const nah = new Set(['KAMPFHALTUNG', 'ANGRIFF', 'NACHLAUF']);
  for (const f of l.frames) {
    const seiten: string[] = [];
    for (let n = 0; n < 20; n++) {
      if (!nah.has(l.wert(f, `s${n}_modus`) ?? '')) continue;
      const dx = ganzzahlig(l.wert(f, `s${n}_x`)) - ganzzahlig(l.wert(f, 'f_x'));
      seiten.push(dx > 0 ? 'R' : dx < 0 ? 'L' : (l.wert(f, `s${n}_recht`) ?? ''));
    }
    p.wahr(seiten.length <= 2, `Frame ${f}: ${seiten.length} Gegner im Nahangriff`);
    p.wahr(new Set(seiten).size === seiten.length, `Frame ${f}: zwei Gegner im Nahangriff auf derselben Seite (${seiten.join(' ')})`);
  }
  p.ende();
});

test('W-T7', () => {
  // Super-Armor (7.4). PS7
  // a: A 10, A 24, A 40
  const p = new Pruefung(abnahmeLauf('W-T7_a'), 'Lauf a');
  p.werte(12, { s0_lp: '97', s0_folge: '1', s0_lpfolge: '100' });
  p.gleich(27, 's0_lp', '93');
  p.gleich(44, 's0_lp', '88');
  p.gleich(66, 's0_lp', '88');
  p.werte(67, { s0_lp: '100', s0_modus: 'STOSS', s0_folge: '0' });
  p.ereignis(67, 'SA:s0:100');
  // b: A 10, A 24, A 40, A 57
  p.lauf(abnahmeLauf('W-T7_b'), 'Lauf b');
  p.werte(60, { s0_lp: '78', s0_modus: 'UMGEWORFEN', s0_folge: '0' });
  p.gleich(67, 's0_lp', '78');
  p.ende();
});

test('W-T8', () => {
  // Schwelle, Zünder und Fall (6, 7.5, 7.6, 10.5)
  // a: PS8a, A 10, A 24, A 40, A 57
  const a = abnahmeLauf('W-T8_a');
  const p = new Pruefung(a, 'Lauf a');
  p.gleich(27, 's0_lp', '23');
  p.wahr(!(a.wert(27, 'wellen') ?? '').split('-').includes('9'), `Frame 27: wellen „${a.wert(27, 'wellen')}“ enthält 9`);
  p.gleich(60, 's0_lp', '8');
  p.ereignis(60, 'WL:9');
  p.werte(61, { s1_typ: 'Zünder', s1_x: '1761.75', s1_z: '55', s1_lp: '17' });
  p.gleich(119, 's1_x', '1863.25');
  p.werte(120, { s1_x: '1865', s1_modus: 'ANNAEHERN' });
  p.werte(121, { s1_modus: 'ZIELEN', zielrecht: '1' });
  p.ereignis(121, 'ZR:s1');
  p.werte(180, { s1_modus: 'ZIELEN', s1_x: '1865', s1_z: '55' });
  p.werte(181, { s1_modus: 'SCHUSS', s1_schaden: '13' });
  p.ereignis(181, 'AS:s1:ZR');
  // Rakete des Zünders im Objektprotokoll
  const raketen = (f: number) => a.objekteIn(f).filter((o) => o['typ'] === 'Rakete');
  const r187 = raketen(187);
  p.wahr(r187.length === 1 && r187[0]?.['x'] === '1910' && r187[0]?.['z'] === '55', `Frame 187: Rakete bei x 1910, z 55 erwartet, ist ${JSON.stringify(r187)}`);
  p.gleich(198, 's1_modus', 'ZIELEN');
  p.ereignis(198, 'ZR:s1');
  const r207 = raketen(207);
  p.wahr(
    r207.length === 1 && r207[0]?.['x'] === '2010' && r207[0]?.['flugphase'] === 'EXPLOSION',
    `Frame 207: Rakete bei x 2010 mit Einschlag (flugphase EXPLOSION) erwartet, ist ${JSON.stringify(r207)}`,
  );
  const r206 = raketen(206);
  p.wahr(r206.length === 1 && r206[0]?.['flugphase'] === 'FLUG', `Frame 206: Rakete noch im Flug erwartet, ist ${JSON.stringify(r206)}`);
  p.werte(208, { f_lp: '59', f_akt: 'UMGEWORFEN' });
  // b: PS8b, A 10
  const b = abnahmeLauf('W-T8_b');
  p.lauf(b, 'Lauf b');
  p.werte(12, { s0_lp: '-1', s1_modus: 'TOT', s2_modus: 'TOT', s3_modus: 'TOT', punkte: '5030', phase: 'ENDE' });
  p.ereignis(12, 'BF:s0');
  p.werte(13, { steuerung: '0', kamera_modus: 'ENDE' });
  p.ereignis(132, 'SC');
  p.wahr(b.objekteIn(492).length === 0, `Frame 492: keine Objekte erwartet, ist ${b.objekteIn(492).map((o) => o['slot']).join(' ')}`);
  p.wahr(b.letzterFrame() === 597, `letzte Protokollzeile in Frame ${b.letzterFrame()}, erwartet 597`);
  p.ende();
});

test('W-T9', () => {
  // Rang (8, 10.3). PS9 (Puppe s1 mit 16 LP, L103), keine Eingabe; in 1100 Prüfangriff s1 80 umwerfen;
  // in 1700 erscheint ein Bolzer in s2 bei (416, 170)
  const l = abnahmeLauf('W-T9');
  const p = new Pruefung(l);
  p.gleich(408, 'rang', '9');
  p.gleich(409, 'rang', '10');
  p.gleich(1009, 'rang', '11');
  p.gleich(1100, 'f_akt', 'TOT');
  p.werte(1219, { rang: '11', leben: '3' });
  p.werte(1220, { rang: '8', leben: '2', f_lp: '72' });
  p.ereignis(1220, 'NE:F');
  p.werte(1221, { f_x: '64', f_z: '176', f_h: '256' });
  p.werte(1273, { f_h: '0', s1_lp: '11', s1_akt: 'UMGEWORFEN', s1_modus: 'UMGEWORFEN' });
  p.gleich(1278, 'steuerung', '0');
  p.gleich(1279, 'steuerung', '1');
  // 1473 erster Frame ohne Schutz (LN+200)
  p.werte(1472, { f_zst: '3' });
  p.wahr(l.wert(1472, 'f_schutz') !== '0', `Frame 1472: f_schutz „${l.wert(1472, 'f_schutz')}“, erwartet > 0`);
  p.werte(1473, { f_schutz: '0', f_zst: '1' });
  p.gleich(1609, 'rang', '9');
  p.gleich(1700, 's2_lp', '23');
  const as = l.ersterFrameMit((e) => /^AS:s2:/.test(e));
  if (as === 0) p.melde('kein AS:s2 bis zum Endframe');
  else p.gleich(as, 's2_schaden', '8');
  p.ende();
});

test('W-T10', () => {
  // Gegenstände (9)
  // a: PS10a, A 10, R 62–68, A 72
  const a = abnahmeLauf('W-T10_a');
  const p = new Pruefung(a, 'Lauf a');
  p.ereignisMuster(12, /^T:F>o20:KT1:\d+:B$/);
  const essen = slotAus(a, 13, /^ER:(o\d+):Kometenbraten$/);
  if (essen === undefined) {
    p.melde(`Frame 13: ER:on:Kometenbraten erwartet, ist „${a.ereignisse(13).join(';')}“`);
  } else {
    p.objekt(13, essen, { h: '0' });
    p.objekt(37, essen, { h: '35' });
    p.objekt(61, essen, { h: '0' });
    p.ereignis(61, `LA:${essen}`);
    p.ereignis(73, `AU:F>${essen}:Kometenbraten`);
  }
  p.gleich(69, 'f_x', '532.25');
  p.werte(73, { f_lp: '72', punkte: '0' });
  // b: PS10b, A 10; „sichtbar“ und „blinkt“ über liegezeit nach Welt 9.3 (L108)
  const b = abnahmeLauf('W-T10_b');
  p.lauf(b, 'Lauf b');
  const fass = slotAus(b, 12, /^T:F>(o\d+):[A-Z0-9]+:\d+:B$/);
  p.wahr(fass !== undefined, `Frame 12: Treffer auf F9 mit Wirkung B erwartet, ist „${b.ereignisse(12).join(';')}“`);
  const waffe = slotAus(b, 13, /^ER:(o\d+):Raketenwerfer$/);
  if (waffe === undefined) {
    p.melde(`Frame 13: ER:on:Raketenwerfer erwartet, ist „${b.ereignisse(13).join(';')}“`);
  } else {
    p.ereignis(61, `LA:${waffe}`);
    p.objekt(61, waffe, { liegezeit: '0' });
    p.objekt(760, waffe, { liegezeit: '699' });
    p.objekt(761, waffe, { liegezeit: '700' });
    p.objekt(852, waffe, { liegezeit: '791' });
    p.ereignis(853, `EN:${waffe}:L`);
    p.objektFrei(853, waffe);
  }
  // c: PS10b, A 10, R 70–310
  const c = abnahmeLauf('W-T10_c');
  p.lauf(c, 'Lauf c');
  const rw = (f: number) => c.objekteIn(f).filter((o) => o['typ'] === 'Gegenstand' && o['art'] === 'Raketenwerfer');
  p.gleich(300, 'kamera_x', '412');
  p.wahr(rw(300).length === 1, `Frame 300: Raketenwerfer erwartet, ist ${rw(300).length}`);
  p.gleich(301, 'kamera_x', '414');
  const weg = rw(300)[0]?.['slot'];
  if (weg !== undefined) {
    p.ereignis(301, `EN:${weg}:S`);
    p.objektFrei(301, weg);
  }
  p.ende();
});
