// Abnahmetests des Kampfsystems nach docs/spezifikation-kampf.md, Abschnitt 12
// (K5, Stufe 3): T1 bis T20 und D1, je Test genau ein test() mit dem Namen der
// Spezifikation. Jeder Lauf hat eine Prüfszene in tests/szenen/ und eine
// Eingabedatei in tests/eingaben/ (Läufe a, b, c … als T5_a.txt usw.); der
// Prüflauf geht über src/pruef/ (pruefLauf), verglichen werden die genannten
// Protokollzellen als Text, Toleranz keine. Wo eine Erwartung der
// Spezifikation nach Auftrag 3, Abschnitt 2.6 festgelegt wurde, nennt der
// Kommentar die Nummer in docs/scheibe.md, „Abweichungen und Lücken“.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abnahmeLauf, abnahmeSzenen, ganzzahlig, md5Paar, Pruefung } from './abnahme_hilfe.ts';

test('T1', () => {
  // Kriterium 1, Bewegung: R 10–29, O 40–49, R und O 60–69, L 80
  const p = new Pruefung(abnahmeLauf('T1'));
  p.werte(10, { f_x: '100', f_akt: 'STAND' });
  p.werte(11, { f_x: '101.75', f_akt: 'LAUF' });
  p.gleich(30, 'f_x', '135');
  p.werte(31, { f_x: '135', f_akt: 'STAND' });
  p.gleich(41, 'f_z', '101');
  p.gleich(50, 'f_z', '110');
  p.gleich(51, 'f_z', '110');
  p.werte(61, { f_x: '136.25', f_z: '110.75' });
  p.werte(70, { f_x: '147.5', f_z: '117.5' });
  p.werte(71, { f_x: '147.5', f_z: '117.5' });
  p.werte(81, { f_x: '145.75', f_blick: 'L' });
  p.werte(82, { f_x: '145.75', f_akt: 'STAND' });
  p.ende();
});

test('T2', () => {
  // Kriterium 2, Sprung: S 10, R 30–70, R und S 100
  const p = new Pruefung(abnahmeLauf('T2'));
  p.werte(11, { f_akt: 'SPRUNG', f_h: '0' });
  p.gleich(12, 'f_h', '4.9375');
  p.gleich(31, 'f_h', '51.25');
  p.gleich(51, 'f_h', '2.5');
  p.werte(52, { f_h: '0', f_akt: 'LANDUNG' });
  p.bereich(11, 58, { f_x: '100' });
  p.gleich(58, 'f_akt', 'STAND');
  p.gleich(59, 'f_x', '101.75');
  p.gleich(72, 'f_x', '122.75');
  p.werte(101, { f_akt: 'SPRUNG', f_x: '122.75' });
  p.gleich(102, 'f_x', '125');
  p.werte(142, { f_x: '215', f_h: '0', f_akt: 'LANDUNG' });
  p.ende();
});

test('T3', () => {
  // Kriterium 3, volle Kette: Puppe leicht s0 x 146, 16 LP, vorplatziert; A 10, 24, 38, 53
  const p = new Pruefung(abnahmeLauf('T3'));
  p.werte(11, { f_akt: 'SCHLAG', f_ph: '1', kombo: '1', f_uhr: '1' });
  p.werte(12, { s0_lp: '13', s0_zst: '3', f_stopp: '7' });
  p.ereignis(12, 'T:F>s0:KT1:3:R');
  p.bereich(13, 19, { f_uhr: '2' });
  p.folge(13, 'f_stopp', ['6', '5', '4', '3', '2', '1', '0']);
  p.gleich(25, 'kombo', '2');
  p.werte(27, { kombo: '2', s0_lp: '9', f_stopp: '7' });
  p.gleich(39, 'kombo', '3');
  p.werte(42, { kombo: '3', s0_lp: '4', f_stopp: '7' });
  p.gleich(54, 'kombo', '4');
  p.werte(56, { kombo: '4', s0_lp: '-6' });
  p.ereignis(56, 'T:F>s0:KT4:10:X');
  p.werte(57, { s0_zst: '2', s0_akt: 'TOT', s0_x: '146' });
  p.gleich(59, 's0_x', '148.875');
  p.werte(96, { s0_x: '255.25', s0_h: '0' });
  p.gleich(105, 's0_x', '281.125');
  // „s0_zst 0 (Slot frei)“: ein freier Slot hat nach Kampf 11.3 leere Felder (L100)
  p.werte(135, { s0_typ: '', s0_zst: '' });
  p.ereignis(135, 'FR:s0');
  p.ende();
});

test('T4', () => {
  // Kriterium 4, Kombofenster: Puppe schwer s0 x 146, 30 LP; A 10 und je Lauf ein zweiter Druck
  const p = new Pruefung(abnahmeLauf('T4_a'), 'Lauf a');
  const treffer = () => {
    p.gleich(12, 's0_lp', '27');
    p.ereignis(12, 'T:F>s0:KT1:3:R');
  };
  // a: zweiter Druck in 23 (h+11) verfällt
  treffer();
  p.bereich(11, 39, { f_akt: 'SCHLAG', kombo: '1' });
  p.bereich(40, 60, { f_akt: 'STAND', kombo: '0' });
  p.bereich(12, 60, { s0_lp: '27' });
  // b: 24 (h+12)
  p.lauf(abnahmeLauf('T4_b'), 'Lauf b');
  treffer();
  p.bereich(25, 27, { kombo: '2' });
  p.gleich(27, 's0_lp', '23');
  // c: 39 (h+27)
  p.lauf(abnahmeLauf('T4_c'), 'Lauf c');
  treffer();
  p.bereich(40, 42, { kombo: '2' });
  p.gleich(42, 's0_lp', '23');
  // d: 40 (h+28) beginnt eine neue Kette
  p.lauf(abnahmeLauf('T4_d'), 'Lauf d');
  treffer();
  p.bereich(41, 42, { kombo: '1' });
  p.gleich(42, 's0_lp', '24');
  p.ende();
});

test('T5', () => {
  // Kriterium 5, Reichweite: Puppe schwer s0, 30 LP, Lage je Lauf
  const p = new Pruefung(abnahmeLauf('T5_a'), 'Lauf a');
  p.gleich(12, 's0_lp', '27');
  p.lauf(abnahmeLauf('T5_b'), 'Lauf b');
  p.bereich(11, 30, { s0_lp: '30' });
  p.lauf(abnahmeLauf('T5_c'), 'Lauf c');
  p.bereich(11, 30, { s0_lp: '30' });
  p.lauf(abnahmeLauf('T5_d'), 'Lauf d');
  p.gleich(12, 's0_lp', '27');
  // e: A 10, 24, 38, 53; in 43 s0_x := 200
  p.lauf(abnahmeLauf('T5_e'), 'Lauf e');
  p.gleich(42, 's0_lp', '18');
  p.werte(56, { s0_lp: '8', s0_akt: 'UMGEWORFEN' });
  p.bereich(43, 64, { s0_x: '200' });
  p.gleich(65, 's0_x', '202.875');
  // f: wie e, s0_x := 201: kein Treffer in 56–59 und 70–73
  p.lauf(abnahmeLauf('T5_f'), 'Lauf f');
  p.bereich(42, 90, { s0_lp: '18' });
  for (let f = 56; f <= 73; f++) p.keinEreignis(f, /^T:F>s0:/);
  // g, h: Figur Blick links (E14), d_vorn 85 bzw. 86
  p.lauf(abnahmeLauf('T5_g'), 'Lauf g');
  p.gleich(12, 's0_lp', '27');
  p.lauf(abnahmeLauf('T5_h'), 'Lauf h');
  p.bereich(11, 30, { s0_lp: '30' });
  p.ende();
});

test('T6', () => {
  // Kriterium 6, Griff und Wurf: R 10–21, A und R 27 (Lauf b gespiegelt)
  const p = new Pruefung(abnahmeLauf('T6_a'), 'Lauf a');
  p.werte(21, { f_akt: 'LAUF', f_x: '119.25' });
  p.keinEreignis(21, /^G:/);
  p.werte(22, { f_x: '121', f_akt: 'GRIFF', s0_x: '140' });
  p.ereignis(22, 'G:F>s0');
  p.werte(28, { s0_lp: '2', f_akt: 'WURF' });
  p.ereignis(28, 'T:F>s0:WU:14:U');
  p.werte(49, { s0_x: '134', s0_h: '59' });
  p.gleich(61, 's1_lp', '13');
  p.ereignis(61, 'T:s0>s1:WG:3:U');
  p.gleich(65, 'f_akt', 'STAND');
  p.werte(86, { s0_x: '277.375', s0_h: '0' });
  p.gleich(98, 's0_x', '305.5');
  p.lauf(abnahmeLauf('T6_b'), 'Lauf b');
  p.werte(21, { f_akt: 'LAUF', f_x: '280.75' });
  p.keinEreignis(21, /^G:/);
  p.werte(22, { f_x: '279', f_akt: 'GRIFF', s0_x: '260' });
  p.ereignis(22, 'G:F>s0');
  p.werte(28, { s0_lp: '2', f_akt: 'WURF' });
  p.ereignis(28, 'T:F>s0:WU:14:U');
  p.werte(49, { s0_x: '266', s0_h: '59' });
  p.gleich(61, 's1_lp', '13');
  p.ereignis(61, 'T:s0>s1:WG:3:U');
  p.gleich(65, 'f_akt', 'STAND');
  p.werte(86, { s0_x: '122.625', s0_h: '0' });
  p.gleich(98, 's0_x', '94.5');
  p.ende();
});

test('T7', () => {
  // Kriterium 7, Schutzfenster: Figur x 300; Puppe leicht s0 x 346, s1 x 118;
  // Prüfangriffe s0: 5 in 19; 5 in 20–46; 5 mit Umwerfen in 100; s1: 5 in 101–260
  const l = abnahmeLauf('T7_a');
  const p = new Pruefung(l, 'Lauf a');
  p.werte(19, { f_lp: '67', f_akt: 'GETROFFEN', f_zst: '3', f_schutz: '27' });
  p.bereich(20, 45, { f_lp: '67' });
  for (let f = 20; f <= 45; f++) p.ereignis(f, 'T:s0>F:PA:5:W');
  p.werte(46, { f_lp: '62', f_schutz: '27' });
  p.werte(100, { f_lp: '57', f_akt: 'UMGEWORFEN', f_zst: '2' });
  p.gleich(109, 'f_x', '297.125');
  p.gleich(155, 'f_x', '164.875');
  p.gleich(220, 'f_akt', 'AUFSTEHEN');
  p.werte(221, { f_akt: 'STAND', f_zst: '3', f_schutz: '35' });
  p.bereich(101, 255, { f_lp: '57' });
  // „wo der Prüfangriff aus s1 die Figur erreicht“: Fläche nach Kampf 11.2
  // (Figur −4 bis 60 px vor s1, |dz| ≤ 10, Figurhöhe ≤ 48), an den Protokollzellen
  let erreicht = 0;
  for (let f = 101; f <= 255; f++) {
    const b = l.wert(f, 's1_blick') === 'L' ? -1 : 1;
    const vorn = (ganzzahlig(l.wert(f, 'f_x')) - ganzzahlig(l.wert(f, 's1_x'))) * b;
    const dz = ganzzahlig(l.wert(f, 'f_z')) - ganzzahlig(l.wert(f, 's1_z'));
    const drin = vorn >= -4 && vorn <= 60 && Math.abs(dz) <= 10 && ganzzahlig(l.wert(f, 'f_h')) <= 48;
    if (drin) {
      erreicht += 1;
      p.ereignis(f, 'T:s1>F:PA:5:W');
    } else {
      p.keinEreignis(f, /^T:s1>F:/);
    }
  }
  p.wahr(erreicht > 0, 'Frames 101 bis 255: der Prüfangriff aus s1 erreicht die Figur nie');
  p.gleich(256, 'f_lp', '52');
  // b: A 154, 156, …, 164 (jeder 2. Frame ab H+54): U = H+93
  p.lauf(abnahmeLauf('T7_b'), 'Lauf b');
  p.gleich(193, 'f_akt', 'STAND');
  p.bereich(100, 227, { f_lp: '57' });
  p.gleich(228, 'f_lp', '52');
  p.ende();
});

test('T8', () => {
  // Kriterium 8, 0 LP und gleichzeitiger Treffer: Puppe leicht s0 x 146, 16 LP
  const p = new Pruefung(abnahmeLauf('T8_a'), 'Lauf a');
  p.werte(20, { f_lp: '0', f_akt: 'GETROFFEN' });
  p.werte(50, { f_lp: '-5', f_akt: 'TOT' });
  p.lauf(abnahmeLauf('T8_b'), 'Lauf b');
  p.bereich(49, 60, { f_akt: 'SCHLAG', f_lp: '0' });
  p.lauf(abnahmeLauf('T8_c'), 'Lauf c');
  p.werte(19, { s0_lp: '13', f_lp: '72' });
  p.bereich(1, 40, { f_lp: '72' });
  p.lauf(abnahmeLauf('T8_d'), 'Lauf d');
  p.werte(19, { f_lp: '67', f_akt: 'GETROFFEN' });
  p.bereich(1, 40, { s0_lp: '16' });
  p.ende();
});

test('T9', () => {
  // Kriterium 9, Rang (Rang nicht fest), Frame-Zählung nach Welt 8
  const p = new Pruefung(abnahmeLauf('T9_a'), 'Lauf a');
  p.gleich(408, 'rang', '9');
  p.gleich(409, 'rang', '10');
  p.gleich(1008, 'rang', '10');
  p.gleich(1009, 'rang', '11');
  p.gleich(8809, 'rang', '24');
  p.gleich(9409, 'rang', '24');
  // b: Puppe leicht s0 x 146, in 500 Prüfangriff 80: Tod in 500, N = t+120
  p.lauf(abnahmeLauf('T9_b'), 'Lauf b');
  p.gleich(500, 'f_akt', 'TOT');
  p.gleich(619, 'rang', '10');
  p.gleich(620, 'rang', '7');
  // c: in 100 erscheint ein Bolzer (nicht vorplatziert, Logik an) bei x 300, Slot s1 (L101)
  const c = abnahmeLauf('T9_c');
  p.lauf(c, 'Lauf c');
  const wirksam = /^T:s1>F:[A-Z0-9]+:(-?\d+):[RUX]$/;
  const f = c.ersterFrameMit((e) => wirksam.test(e));
  if (f === 0) {
    p.melde('kein wirksamer Treffer des erscheinenden Nahkämpfers bis zum Endframe');
  } else {
    const e = c.ereignisse(f).find((x) => wirksam.test(x)) as string;
    p.wahr(wirksam.exec(e)?.[1] === '8', `Frame ${f}: erster wirksamer Treffer „${e}“, erwartet Schaden 8`);
  }
  p.ende();
});

test('T10', () => {
  // Kriterium 10, Sperre und Boss, mit den Eingabedateien nach Welt 12 (Welt-T2, T7 a, T8 b; L102)
  // a: kamera_x bleibt am Sperrwert 400, solange ein Gegner der Sperrwelle lebt,
  // und läuft im Frame nach dem Tod des letzten weiter
  const a = abnahmeLauf('T10_a');
  const p = new Pruefung(a, 'Lauf a');
  const ankunft = a.frames.find((f) => a.wert(f, 'kamera_x') === '400') ?? 0;
  const tod = a.frames.find((f) => Number(a.wert(f, 's2_lp')) < 0 && Number(a.wert(f, 's3_lp')) < 0) ?? 0;
  p.wahr(ankunft > 0, 'Kamera erreicht den Sperrwert 400 nie');
  p.wahr(tod > ankunft, `Tod des letzten Gegners der Welle 2 (Frame ${tod}) nicht nach der Ankunft an der Sperre (${ankunft})`);
  if (ankunft > 0 && tod > ankunft) {
    p.bereich(ankunft, tod, { kamera_x: '400' });
    p.wahr(Number(a.wert(tod + 1, 'kamera_x')) > 400, `Frame ${tod + 1}: kamera_x „${a.wert(tod + 1, 'kamera_x')}“, erwartet > 400`);
  }
  // b: Kette 1 bis 3 gegen den Boss ohne Umwerfen endet mit dem Stoß, LP danach auf lp_folge (Welt 7.4)
  const b = abnahmeLauf('T10_b');
  p.lauf(b, 'Lauf b');
  const kette = b.frames.filter((f) => b.ereignisse(f).some((e) => /^T:F>s0:KT[123]:/.test(e)));
  const stoss = b.frames.find((f) => b.wert(f, 's0_modus') === 'STOSS') ?? 0;
  p.wahr(kette.length === 3, `drei Kettentreffer auf den Boss erwartet, gefunden in Frames ${kette.join(' ')}`);
  p.wahr(b.frames.every((f) => !b.ereignisse(f).some((e) => /^T:F>s0:.*:U$/.test(e))), 'kein umwerfender Treffer erwartet');
  p.wahr(stoss > (kette[kette.length - 1] ?? 0), `Stoß (Frame ${stoss}) nach dem letzten Kettentreffer erwartet`);
  if (stoss > 0) {
    p.gleich(stoss, 's0_lp', '100');
    p.ereignis(stoss, 'SA:s0:100');
    p.bereich(stoss, b.letzterFrame(), { s0_lp: '100' });
  }
  // c: im Frame, in dem die LP des Bosses unter 0 fallen, haben alle übrigen Gegner s_akt TOT
  const c = abnahmeLauf('T10_c');
  p.lauf(c, 'Lauf c');
  const t = c.frames.find((f) => Number(c.wert(f, 's0_lp')) < 0) ?? 0;
  p.wahr(t > 0, 'LP des Bosses fallen nie unter 0');
  if (t > 0) {
    for (let n = 1; n < 20; n++) if (c.wert(t, `s${n}_typ`) !== '') p.gleich(t, `s${n}_akt`, 'TOT');
  }
  p.ende();
});

test('T11', () => {
  // Sprint (9.1, 9.2): R 10–12, R 16–140
  const p = new Pruefung(abnahmeLauf('T11_a'), 'Lauf a');
  p.bereich(13, 16, { f_x: '105.25' });
  p.bereich(14, 16, { f_akt: 'STAND' });
  p.werte(17, { f_akt: 'SPRINT', f_sprint: '1', f_x: '107' });
  p.gleich(18, 'f_x', '110.875');
  p.gleich(22, 'f_x', '126.375');
  p.werte(106, { f_sprint: '90', f_x: '373.125' });
  p.werte(107, { f_akt: 'STAND', f_x: '373.125' });
  p.werte(108, { f_akt: 'LAUF', f_x: '374.875' });
  // b: R 10–20, R 24–40: kein Sprint (11 Frames Druck)
  const b = abnahmeLauf('T11_b');
  p.lauf(b, 'Lauf b');
  p.werte(25, { f_akt: 'LAUF', f_x: '121' });
  p.bereich(1, b.letzterFrame(), { f_sprint: '0' });
  // c: R 10–12, R 24–40: kein Sprint (11 Frames Pause)
  const c = abnahmeLauf('T11_c');
  p.lauf(c, 'Lauf c');
  p.bereich(1, c.letzterFrame(), { f_sprint: '0' });
  p.wahr(c.frames.every((f) => c.wert(f, 'f_akt') !== 'SPRINT'), 'f_akt SPRINT in einem Frame');
  p.ende();
});

test('T12', () => {
  // Sprintangriff (9.3): R 10–12, R 16–40, A 30; Lauf b mit Puppe leicht s0 x 230, 16 LP (L103)
  const p = new Pruefung(abnahmeLauf('T12_a'), 'Lauf a');
  for (const lauf of ['a', 'b']) {
    p.lauf(abnahmeLauf(`T12_${lauf}`), `Lauf ${lauf}`);
    p.werte(30, { f_sprint: '14', f_x: '156.125' });
    p.werte(31, { f_akt: 'SPRINTANGRIFF', f_x: '156.125' });
    p.gleich(32, 'f_x', '159.75');
    p.gleich(35, 'f_x', '169.6875');
    if (lauf === 'a') {
      p.gleich(55, 'f_x', '200');
      p.gleich(66, 'f_akt', 'STAND');
    } else {
      p.gleich(35, 's0_lp', '7');
      p.ereignis(35, 'T:F>s0:SA:9:U');
      p.bereich(36, 42, { f_x: '169.6875' });
      p.gleich(62, 'f_x', '200');
      p.gleich(66, 'f_akt', 'SPRINTANGRIFF');
      p.gleich(73, 'f_akt', 'STAND');
    }
  }
  p.ende();
});

test('T13', () => {
  // Spezialangriff ohne Treffer (6.3, 9.4): A und S 10; Lauf a: in 54 s0_x := 146, s0: 5 in 54–81
  const p = new Pruefung(abnahmeLauf('T13_a'), 'Lauf a');
  p.bereich(11, 60, { f_akt: 'SPEZIAL', f_zst: '3', f_x: '100', f_lp: '72' });
  for (let f = 54; f <= 80; f++) p.ereignis(f, 'T:s0>F:PA:5:W');
  p.werte(61, { f_akt: 'STAND', f_schutz: '20', f_zst: '3' });
  p.werte(80, { f_schutz: '1', f_lp: '72' });
  // „81: f_schutz 0, f_zst 1, f_lp 67“: schutz zählt in KS2 auf 0, der Treffer in 81 ist wirksam
  // und setzt in KS7 schutz = 27 und Zustand 3 (Kampf 6.3, 4.3 GETROFFEN); am Frame-Ende also 27 und 3 (L104)
  p.werte(81, { f_schutz: '27', f_zst: '3', f_lp: '67' });
  p.ereignis(81, 'T:s0>F:PA:5:R');
  // b: dazu A 60 (P+50): verfällt
  p.lauf(abnahmeLauf('T13_b'), 'Lauf b');
  p.gleich(61, 'f_akt', 'STAND');
  p.gleich(62, 'f_akt', 'STAND');
  // c: dazu A 61: Schlag
  p.lauf(abnahmeLauf('T13_c'), 'Lauf c');
  p.gleich(62, 'f_akt', 'SCHLAG');
  p.ende();
});

test('T14', () => {
  // Spezialangriff mit Treffern (6.4, 9.4): Figur x 300; s0 x 346; s1 x 200, z 120, je 16 LP (L103); A und S 10
  const p = new Pruefung(abnahmeLauf('T14'));
  p.gleich(24, 's0_lp', '10');
  p.ereignis(24, 'T:F>s0:SP:6:U');
  p.bereich(25, 31, { f_uhr: '14' });
  p.folge(25, 'f_stopp', ['6', '5', '4', '3', '2', '1', '0']);
  p.gleich(32, 'f_lp', '63');
  p.ereignis(32, 'K:F:9');
  p.gleich(49, 's1_lp', '10');
  p.ereignis(49, 'T:F>s1:SP:6:U');
  p.gleich(74, 'f_akt', 'SPEZIAL');
  p.werte(75, { f_akt: 'STAND', f_schutz: '20' });
  p.gleich(79, 's0_x', '481.125');
  p.gleich(94, 'f_zst', '3');
  p.gleich(95, 'f_zst', '1');
  p.gleich(104, 's1_x', '64.875');
  p.ende();
});

test('T15', () => {
  // Sprungangriff (4.4, 5.2, 5.3): Puppe schwer s0 x 160, 30 LP
  const p = new Pruefung(abnahmeLauf('T15_a'), 'Lauf a');
  p.werte(15, { f_akt: 'SPRUNGANGRIFF', f_ph: 'N', f_h: '14.0625' });
  p.werte(19, { f_h: '29.3125', s0_lp: '23' });
  p.ereignis(19, 'T:F>s0:SN:7:U');
  p.bereich(20, 26, { f_h: '29.3125' });
  p.gleich(27, 'f_h', '32.5');
  p.werte(60, { f_akt: 'LANDUNG', f_h: '0' });
  p.lauf(abnahmeLauf('T15_b'), 'Lauf b');
  p.folge(35, 'f_h', ['50.3125', '49.5', '48.4375', '47.125']);
  p.bereich(35, 38, { s0_lp: '30' });
  p.werte(39, { f_h: '45.5625', s0_lp: '23' });
  p.gleich(60, 'f_akt', 'LANDUNG');
  p.ende();
});

test('T16', () => {
  // Kniestoß, Haltedauer (8.2, 8.3): Puppe leicht s0 x 160, 30 LP
  // a: Eingabe A 23, 39, 41, 59 statt 23, 40, 41, 59 (L69): 39 verfällt, 41 ist ein neuer Druck in K+18
  const p = new Pruefung(abnahmeLauf('T16_a'), 'Lauf a');
  p.gleich(28, 's0_lp', '26');
  p.bereich(40, 45, { s0_lp: '26' });
  p.gleich(46, 's0_lp', '22');
  p.werte(64, { s0_lp: '18', s0_akt: 'UMGEWORFEN' });
  p.gleich(122, 's0_x', '283.75');
  // b: R 10–21, R 90–95, R 120: Losreißen in g+61, Griffsperre 30 Frames
  const b = abnahmeLauf('T16_b');
  p.lauf(b, 'Lauf b');
  p.ereignis(83, 'L:s0');
  p.werte(83, { f_akt: 'STAND', s0_zst: '1' });
  p.bereich(91, 96, { f_akt: 'LAUF' });
  for (let f = 91; f <= 96; f++) p.keinEreignis(f, /^G:/);
  p.gleich(121, 'f_akt', 'GRIFF');
  p.ende();
});

test('T17', () => {
  // Neustart der Reaktion, E3 (7): Puppe schwer s0 x 146, 30 LP; A 10, 24
  const p = new Pruefung(abnahmeLauf('T17'));
  p.gleich(12, 's0_lp', '27');
  p.gleich(27, 's0_lp', '23');
  p.bereich(12, 49, { s0_zst: '3' });
  p.gleich(50, 's0_zst', '1');
  p.bereich(10, 60, { s0_x: '146' });
  p.ende();
});

test('T18', () => {
  // Umwerfen, Aufstehen, E4 (7): Puppe leicht s0 x 146, 30 LP; A 10, 24, 38, 53, 158; in 150 f_x := 231
  const p = new Pruefung(abnahmeLauf('T18'));
  p.werte(56, { s0_lp: '8', s0_akt: 'UMGEWORFEN' });
  p.gleich(65, 's0_x', '148.875');
  p.werte(102, { s0_x: '255.25', s0_h: '0' });
  p.werte(111, { s0_x: '281.125', s0_akt: 'LIEGEN' });
  p.gleich(143, 's0_akt', 'AUFSTEHEN');
  p.werte(160, { s0_zst: '2', s0_lp: '8' });
  // G = W+105 sofort verwundbar: Treffer in 161, Zustand im Trefferframe 3 (Kampf 7, wie T3 Frame 12; L105)
  p.werte(161, { s0_zst: '3', s0_lp: '5' });
  p.ereignis(161, 'T:F>s0:KT1:3:R');
  p.ende();
});

test('T19', () => {
  // Raketenwerfer (10.3): Figur mit RW, 3 Schuss; Puppe leicht s0, 30 LP, x je Lauf; A 10
  const a = abnahmeLauf('T19_a');
  const p = new Pruefung(a, 'Lauf a');
  p.bereich(11, 27, { f_akt: 'WAFFE' });
  p.gleich(17, 'f_mun', '2');
  p.objekt(17, 'g0', { x: '158', h: '50' });
  p.ereignis(38, 'EX:g0');
  p.objekt(38, 'g0', { x: '263' });
  p.gleich(38, 's0_lp', '22');
  p.lauf(abnahmeLauf('T19_b'), 'Lauf b');
  p.bereich(1, 60, { s0_lp: '30' });
  p.lauf(abnahmeLauf('T19_c'), 'Lauf c');
  p.gleich(38, 's0_lp', '22');
  p.lauf(abnahmeLauf('T19_d'), 'Lauf d');
  p.bereich(1, 60, { s0_lp: '30' });
  p.ende();
});

test('T20', () => {
  // Verlieren, Aufnehmen, Essen (10)
  // a: Figur mit RW, 2 Schuss, Puppe leicht s0 x 146; s0: 5 in 20; A 50
  const p = new Pruefung(abnahmeLauf('T20_a'), 'Lauf a');
  p.werte(20, { f_lp: '67', f_akt: 'GETROFFEN' });
  p.gleich(21, 'f_waffe', '');
  p.objekt(21, 'o20', { art: 'Raketenwerfer', munition: '2', liegezeit: '0', x: '100' });
  p.objekt(22, 'o20', { liegezeit: '1' });
  p.werte(51, { f_akt: 'AUFNEHMEN', f_waffe: 'RW', f_mun: '2' });
  p.objektFrei(51, 'o20');
  p.gleich(58, 'f_akt', 'STAND');
  // b: Figur 40 LP, Kometenbraten o20 x 120, z 100 (L106); A 10
  p.lauf(abnahmeLauf('T20_b'), 'Lauf b');
  p.werte(11, { f_lp: '72', f_akt: 'AUFNEHMEN' });
  p.objektFrei(11, 'o20');
  p.ende();
});

test('D1', () => {
  // Determinismus (Kampf 11.6): jede Szene von T1 bis T20 zweimal, MD5 von
  // protokoll.csv und objekte.csv gleich. Der zweite Rechner ist hier nicht
  // prüfbar (L107); dafür vergleicht abnahme_referenz.test.ts ein Protokoll mit einer
  // im Repo abgelegten Referenz.
  const szenen = abnahmeSzenen(/^T\d+(_[a-z])?$/);
  const fehler: string[] = [];
  for (const n of szenen) {
    const a = md5Paar(abnahmeLauf(n));
    const b = md5Paar(abnahmeLauf(n));
    if (a.protokoll !== b.protokoll) fehler.push(`${n}: protokoll.csv ${a.protokoll} ≠ ${b.protokoll}`);
    if (a.objekte !== b.objekte) fehler.push(`${n}: objekte.csv ${a.objekte} ≠ ${b.objekte}`);
  }
  if (szenen.length < 20) fehler.push(`nur ${szenen.length} Szenen gefunden`);
  assert.deepEqual(fehler, [], fehler.join('\n'));
});
