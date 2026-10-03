// Tests K1: Angriffe der Figur (Kampf 4.3, 5.2, 5.3, 5.6, 9.3, 9.4) mit
// Frame-Erwartungen aus mechanik.md „Angriff (Standardschlag, Kette)“,
// „Sprungangriff“, „Sprint“, „Spezialangriff“. Treffer werden in KS7
// eingespeist (figur_hilfe.ts), die Trefferprüfung selbst ist Sache von K2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Haken, Zeile } from './figur_hilfe.ts';
import { aktiveFrames, bei, laufen, trefferDerFigur, trefferIn, weltAus } from './figur_hilfe.ts';
import type { Welt } from '../src/kern/welt.ts';

/** Fläche der laufenden Instanz der Figur (für Abstandsflächen). */
function flaeche(w: Welt): { vorn: number; hinten: number; tiefe: number; hoch: number | null } | null {
  const a = w.figur.angriff;
  if (a === null || a.flaeche.art !== 'abstand') return null;
  return { vorn: a.flaeche.vorn, hinten: a.flaeche.hinten, tiefe: a.flaeche.tiefe, hoch: a.flaeche.hoehe_angreifer_max };
}

/** Läuft Frame für Frame und sammelt zusätzlich die Fläche je Frame. */
function laufenMitFlaeche(w: Welt, eingabe: string, bis: number, haken: Haken | null = null) {
  const flaechen: ReturnType<typeof flaeche>[] = [];
  const h: Haken = (welt) => {
    flaechen[welt.frame] = flaeche(welt);
    return haken === null ? [] : haken(welt);
  };
  const zeilen = laufen(w, eingabe, bis, h);
  return { zeilen, flaechen };
}

function akt(z: Zeile[], von: number, bis: number): string[] {
  const r: string[] = [];
  for (let f = von; f <= bis; f++) r.push(bei(z, f).f_akt);
  return r;
}

test('figur: SCHLAG Stufe 1 mit Treffer h: Startup P+2, Trefferstopp 7, Pose bis h+27, STAND ab h+28 (Kampf 4.3, 5.3)', () => {
  const z = laufen(weltAus(), '10,10,A\n', 45, trefferIn([12]));
  assert.deepEqual([bei(z, 11).f_akt, bei(z, 11).f_ph, bei(z, 11).kombo, bei(z, 11).f_uhr, bei(z, 11).ereignis], ['SCHLAG', '1', 1, 1, 'KE:F:1']);
  assert.deepEqual([bei(z, 11).aktiv, bei(z, 12).aktiv], [false, true]);
  assert.deepEqual([bei(z, 12).f_uhr, bei(z, 12).f_stopp], [2, 7]);
  for (let f = 13; f <= 19; f++) {
    assert.deepEqual([bei(z, f).f_uhr, bei(z, f).f_stopp, bei(z, f).aktiv], [2, 19 - f, false], `Frame ${f}`);
  }
  assert.deepEqual([bei(z, 20).f_uhr, bei(z, 20).aktiv], [3, true]);
  assert.deepEqual(aktiveFrames(z, 11, 30), [12, 20, 21, 22]);
  assert.deepEqual([bei(z, 39).f_akt, bei(z, 39).kombo, bei(z, 40).f_akt, bei(z, 40).kombo], ['SCHLAG', 1, 'STAND', 0]);
});

test('figur: Kombofenster Stufe 2 h+12 bis h+27, ohne Puffer (Kampf 5.6, T4)', () => {
  // Treffer in h = 12
  const lauf = (d: number) => laufen(weltAus(), `10,10,A\n${d},${d},A\n`, 45, trefferIn([12]));
  const a = lauf(23); // h+11 verfällt
  assert.deepEqual([bei(a, 24).kombo, bei(a, 39).f_akt, bei(a, 40).f_akt, bei(a, 41).f_akt], [1, 'SCHLAG', 'STAND', 'STAND']);
  const b = lauf(24); // h+12
  assert.deepEqual([bei(b, 25).kombo, bei(b, 25).f_ph, bei(b, 25).ereignis, bei(b, 25).f_uhr], [2, '2', 'KE:F:2', 1]);
  assert.deepEqual(aktiveFrames(b, 25, 32), [27, 28, 29, 30]);
  const c = lauf(39); // h+27
  assert.deepEqual([bei(c, 39).kombo, bei(c, 40).kombo, bei(c, 40).f_akt], [1, 2, 'SCHLAG']);
  const d = lauf(40); // h+28: neue Kette
  assert.deepEqual([bei(d, 40).f_akt, bei(d, 41).f_akt, bei(d, 41).kombo], ['STAND', 'SCHLAG', 1]);
});

test('figur: Kombofenster Stufe 3 und 4 h+11 bis h+26 (Kampf 5.6; T3)', () => {
  // Stufe 2 in D = 24 trifft in h₂ = 27; Stufe 3 bei A in 37 (h₂+10) verfällt, in 38 (h₂+11) und 53 (h₂+26) nicht
  const verfaellt = laufen(weltAus(), '10,10,A\n24,24,A\n37,37,A\n', 60, trefferIn([12, 27]));
  assert.deepEqual([bei(verfaellt, 38).kombo, bei(verfaellt, 53).f_akt, bei(verfaellt, 54).f_akt], [2, 'SCHLAG', 'STAND']);
  const spaet = laufen(weltAus(), '10,10,A\n24,24,A\n53,53,A\n', 60, trefferIn([12, 27]));
  assert.deepEqual([bei(spaet, 54).kombo, bei(spaet, 54).f_akt], [3, 'SCHLAG']);
  // volle Kette wie T3: Stufe 3 aktiv D+4 bis D+7, Stufe 4 D+3 bis D+6
  const t3 = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,A\n53,53,A\n', 100, trefferIn([12, 27, 42, 56]));
  assert.deepEqual([bei(t3, 39).kombo, bei(t3, 42).f_stopp, bei(t3, 54).kombo, bei(t3, 56).f_stopp], [3, 7, 4, 7]);
  // Stufe 4 mit Treffer: Aktion D+1 bis D+32, STAND ab D+33 (K3)
  assert.deepEqual([bei(t3, 85).f_akt, bei(t3, 85).f_uhr, bei(t3, 86).f_akt], ['SCHLAG', 25, 'STAND']);
});

test('figur: LEERSCHLAG P+1 bis P+16, A und S ab P+7, Richtung ab P+8 (Kampf 4.3)', () => {
  const z = laufen(weltAus(), '10,10,A\n', 30);
  assert.deepEqual(akt(z, 11, 15), ['SCHLAG', 'SCHLAG', 'SCHLAG', 'SCHLAG', 'SCHLAG']);
  assert.deepEqual([bei(z, 16).f_akt, bei(z, 16).f_uhr, bei(z, 26).f_akt, bei(z, 26).f_uhr], ['LEERSCHLAG', 6, 'LEERSCHLAG', 16]);
  assert.equal(bei(z, 27).f_akt, 'STAND');
  assert.deepEqual(aktiveFrames(z, 11, 26), [12, 13, 14, 15]);
  // A in P+6 verfällt, A in P+7 beginnt eine neue Kette in P+8
  const a6 = laufen(weltAus(), '10,10,A\n16,16,A\n', 30);
  assert.equal(bei(a6, 17).f_akt, 'LEERSCHLAG');
  const a7 = laufen(weltAus(), '10,10,A\n17,17,A\n', 30);
  assert.deepEqual([bei(a7, 18).f_akt, bei(a7, 18).kombo, bei(a7, 18).f_uhr], ['SCHLAG', 1, 1]);
  // Richtung ab P+8: Bewegung ab P+9
  const r = laufen(weltAus(), '10,10,A\n15,20,R\n', 30);
  assert.deepEqual([bei(r, 18).f_akt, bei(r, 18).f_x, bei(r, 19).f_akt, bei(r, 19).f_x], ['LEERSCHLAG', '100', 'LAUF', '101.75']);
});

test('figur: Pose nach Stufe 1: L/R ab h+13 (Bewegung h+14), nur Tiefe erst ab h+29 (Kampf 4.3, P31)', () => {
  const seite = laufen(weltAus(), '10,10,A\n20,30,R\n', 32, trefferIn([12]));
  assert.deepEqual([bei(seite, 25).f_akt, bei(seite, 26).f_akt, bei(seite, 26).f_x], ['SCHLAG', 'LAUF', '101.75']);
  const tiefe = laufen(weltAus(), '10,10,A\n20,45,O\n', 45, trefferIn([12]));
  assert.deepEqual([bei(tiefe, 39).f_akt, bei(tiefe, 40).f_akt, bei(tiefe, 40).f_z, bei(tiefe, 41).f_akt, bei(tiefe, 41).f_z], ['SCHLAG', 'STAND', '100', 'LAUF', '101']);
  // Sprung ab h+12 (wirkt h+13)
  const sprung = laufen(weltAus(), '10,10,A\n24,24,S\n', 30, trefferIn([12]));
  assert.equal(bei(sprung, 25).f_akt, 'SPRUNG');
});

test('figur: Stufe 2 und 3 ohne Treffer D+16 bzw. D+17, Drücke ab D+7 bzw. D+8 (Kampf 4.3, K1, K2)', () => {
  const s2 = laufen(weltAus(), '10,10,A\n24,24,A\n', 50, trefferIn([12]));
  assert.deepEqual([bei(s2, 40).f_akt, bei(s2, 40).f_uhr, bei(s2, 41).f_akt], ['SCHLAG', 16, 'STAND']);
  const s2a = laufen(weltAus(), '10,10,A\n24,24,A\n30,30,A\n', 50, trefferIn([12]));
  assert.deepEqual([bei(s2a, 31).kombo, bei(s2a, 31).f_uhr], [2, 7]);
  const s2b = laufen(weltAus(), '10,10,A\n24,24,A\n31,31,A\n', 50, trefferIn([12]));
  assert.deepEqual([bei(s2b, 31).kombo, bei(s2b, 32).kombo, bei(s2b, 32).f_uhr], [2, 1, 1]);
  const s3 = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,A\n', 60, trefferIn([12, 27]));
  assert.deepEqual([bei(s3, 55).f_akt, bei(s3, 55).f_uhr, bei(s3, 56).f_akt], ['SCHLAG', 17, 'STAND']);
  const s3a = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,A\n45,45,A\n', 60, trefferIn([12, 27]));
  assert.equal(bei(s3a, 46).kombo, 3);
  const s3b = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,A\n46,46,A\n', 60, trefferIn([12, 27]));
  assert.deepEqual([bei(s3b, 47).kombo, bei(s3b, 47).f_uhr], [1, 1]);
});

test('figur: Stufe 4 nicht abbrechbar, aktiv D+3 bis D+6 und ohne Treffer D+17 bis D+20, STAND D+26 (Kampf 4.3, K3)', () => {
  const z = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,A\n53,53,A\n60,60,A\n70,70,S\n79,79,A\n', 85, trefferIn([12, 27, 42]));
  assert.deepEqual([bei(z, 54).kombo, bei(z, 54).f_ph], [4, '4']);
  assert.deepEqual(aktiveFrames(z, 54, 79), [56, 57, 58, 59, 70, 71, 72, 73]);
  assert.deepEqual([bei(z, 78).f_akt, bei(z, 78).f_uhr, bei(z, 79).f_akt], ['SCHLAG', 25, 'STAND']);
  assert.deepEqual([bei(z, 80).f_akt, bei(z, 80).kombo], ['SCHLAG', 1]);
  // Treffer im zweiten Fenster: 7 Stoppframes, Aktion bis D+32
  const zwei = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,A\n53,53,A\n', 90, trefferIn([12, 27, 42, 70]));
  assert.deepEqual([bei(zwei, 85).f_akt, bei(zwei, 86).f_akt], ['SCHLAG', 'STAND']);
});

test('figur: Ausfallschritt 20 px, aktiv D+9 bis D+12; Schritt weg dreht um, ohne aktive Frames (Kampf 5.6, P29)', () => {
  const vor = laufen(weltAus(), '10,10,A\n24,24,AR\n', 45, trefferIn([12]));
  assert.deepEqual([25, 26, 27, 28, 29].map((f) => bei(vor, f).f_x), ['108', '114', '118', '120', '120']);
  assert.deepEqual(aktiveFrames(vor, 25, 40), [33, 34, 35, 36]);
  const stufe3 = laufen(weltAus(), '10,10,A\n24,24,A\n38,38,AR\n', 60, trefferIn([12, 27]));
  assert.deepEqual(aktiveFrames(stufe3, 39, 55), [46, 47, 48, 49]);
  const weg = laufen(weltAus(), '10,10,A\n24,24,AL\n39,39,A\n', 45, trefferIn([12]));
  assert.deepEqual([bei(weg, 25).f_blick, bei(weg, 25).angriff, bei(weg, 28).f_x], ['L', '', '80']);
  assert.deepEqual(aktiveFrames(weg, 25, 38), []);
  // ohne Treffer kein Kettenfenster: der Folgedruck beginnt mit Stufe 1
  assert.deepEqual([bei(weg, 40).f_akt, bei(weg, 40).kombo], ['SCHLAG', 1]);
});

test('figur: SPRUNGANGRIFF neutral (T15): Höhe steht in A+1, aktiv A+5 bis A+28, Treffer verschiebt die Landung um 7', () => {
  const w = weltAus();
  const { zeilen: z, flaechen } = laufenMitFlaeche(w, '10,10,S\n14,14,A\n', 62, trefferIn([19]));
  assert.deepEqual([bei(z, 15).f_akt, bei(z, 15).f_ph, bei(z, 15).f_h, bei(z, 14).f_h, bei(z, 15).angriff], ['SPRUNGANGRIFF', 'N', '14.0625', '14.0625', 'SN']);
  assert.deepEqual(flaechen[19], { vorn: 76, hinten: 27, tiefe: 12, hoch: 45 });
  assert.deepEqual([bei(z, 19).f_h, bei(z, 19).f_stopp, bei(z, 19).aktiv], ['29.3125', 7, true]);
  for (let f = 20; f <= 26; f++) assert.equal(bei(z, f).f_h, '29.3125');
  assert.equal(bei(z, 27).f_h, '32.5');
  assert.deepEqual([bei(z, 59).f_h, bei(z, 60).f_akt, bei(z, 60).f_h], ['2.5', 'LANDUNG', '0']);
  // ohne Treffer: Landung J+42+1 = 53, aktiv A+5 bis A+28 (19 bis 42)
  const ohne = laufen(weltAus(), '10,10,S\n14,14,A\n', 60);
  assert.equal(bei(ohne, 53).f_akt, 'LANDUNG');
  assert.deepEqual(aktiveFrames(ohne, 15, 53), Array.from({ length: 24 }, (_, i) => 19 + i));
  // A in J+41 gibt noch den Sprungangriff, Aufsetzen einen Frame später; A ab J+38 ohne aktiven Frame
  const spaet = laufen(weltAus(), '10,10,S\n51,51,A\n', 60);
  assert.deepEqual([bei(spaet, 52).f_akt, bei(spaet, 53).f_akt], ['SPRUNGANGRIFF', 'LANDUNG']);
  const j38 = laufen(weltAus(), '10,10,S\n48,48,A\n', 60);
  assert.deepEqual(aktiveFrames(j38, 49, 55), []);
});

test('figur: Sprungangriff Richtung, hoch, runter (Kampf 5.2, K4, K5, P10)', () => {
  const r = laufenMitFlaeche(weltAus(), '10,10,RS\n14,14,A\n', 60);
  assert.deepEqual([bei(r.zeilen, 15).f_ph, bei(r.zeilen, 15).angriff], ['R', 'SR']);
  assert.deepEqual(r.flaechen[20], { vorn: 99, hinten: 24, tiefe: 12, hoch: 41 });
  const h = laufenMitFlaeche(weltAus(), '10,10,OS\n14,14,A\n', 60);
  assert.deepEqual([bei(h.zeilen, 15).f_ph, bei(h.zeilen, 15).angriff], ['H', 'SH']);
  assert.deepEqual(h.flaechen[21], { vorn: 85, hinten: 32, tiefe: 12, hoch: 48 });
  assert.deepEqual(aktiveFrames(h.zeilen, 15, 53), [21, 22, 23, 24]);
  // hoch: Aktion bis A+29, danach SPRUNG (Fallpose)
  assert.deepEqual([bei(h.zeilen, 43).f_akt, bei(h.zeilen, 44).f_akt, bei(h.zeilen, 53).f_akt], ['SPRUNGANGRIFF', 'SPRUNG', 'LANDUNG']);
  // Richtung geht vor hoch (P10); runter geht vor Richtung
  const rh = laufen(weltAus(), '10,10,ROS\n14,14,A\n', 20);
  assert.equal(bei(rh, 15).f_ph, 'R');
  const t = laufenMitFlaeche(weltAus(), '10,10,RS\n14,14,AU\n', 60);
  assert.deepEqual([bei(t.zeilen, 15).f_ph, bei(t.zeilen, 15).angriff], ['T', 'ST']);
  assert.deepEqual(t.flaechen[23], { vorn: 42, hinten: 41, tiefe: 12, hoch: 41 });
  assert.deepEqual(aktiveFrames(t.zeilen, 15, 53), Array.from({ length: 24 }, (_, i) => 23 + i));
});

test('figur: SPRINTANGRIFF (T12): steht in A+1, rutscht ab A+2 mit dem Sprinttempo, aktiv A+5 bis A+14, STAND A+36', () => {
  const z = laufen(weltAus(), '10,12,R\n16,40,R\n30,30,A\n', 70);
  assert.deepEqual([bei(z, 30).f_sprint, bei(z, 30).f_x], [14, '156.125']);
  assert.deepEqual([bei(z, 31).f_akt, bei(z, 31).f_x, bei(z, 31).angriff], ['SPRINTANGRIFF', '156.125', 'SA']);
  assert.equal(bei(z, 32).f_x, '159.75');
  assert.equal(bei(z, 35).f_x, '169.6875');
  assert.equal(bei(z, 55).f_x, '200');
  assert.deepEqual(aktiveFrames(z, 31, 65), [35, 36, 37, 38, 39, 40, 41, 42, 43, 44]);
  assert.deepEqual([bei(z, 65).f_akt, bei(z, 66).f_akt], ['SPRINTANGRIFF', 'STAND']);
  // mit Treffer in A+5: Stopp 36 bis 42, Rutschen steht (P24), STAND A+43
  const t = laufen(weltAus(), '10,12,R\n16,40,R\n30,30,A\n', 75, trefferIn([35]));
  for (let f = 36; f <= 42; f++) assert.equal(bei(t, f).f_x, '169.6875');
  assert.deepEqual([bei(t, 62).f_x, bei(t, 66).f_akt, bei(t, 72).f_akt, bei(t, 73).f_akt], ['200', 'SPRINTANGRIFF', 'SPRINTANGRIFF', 'STAND']);
  // Richtung zuletzt in A−1: kein Rutschen; zuletzt in A−2: Schlag
  const ohne = laufen(weltAus(), '10,12,R\n16,29,R\n30,30,A\n', 40);
  assert.deepEqual([bei(ohne, 31).f_akt, bei(ohne, 33).f_x], ['SPRINTANGRIFF', bei(ohne, 31).f_x]);
  const schlag = laufen(weltAus(), '10,12,R\n16,28,R\n30,30,A\n', 40);
  assert.equal(bei(schlag, 31).f_akt, 'SCHLAG');
});

test('figur: Sprint-Sprungangriff (Kampf 9.3, E15): aktiv A+13 (≤ 16 px) und A+20 bis A+39 (≤ 20 px), auch nach der Landung', () => {
  // Sprint ab 13, Sprintsprung J = 20, Angriff A = 35
  const w = weltAus();
  const { zeilen: z, flaechen } = laufenMitFlaeche(w, '10,10,R\n12,30,R\n20,20,S\n35,35,A\n', 80);
  assert.deepEqual([bei(z, 36).f_akt, bei(z, 36).f_ph, bei(z, 36).angriff], ['SPRINTSPRUNG', 'SS', 'SS']);
  // keine Höhenpause in A+1
  assert.notEqual(bei(z, 36).f_h, bei(z, 35).f_h);
  assert.deepEqual(aktiveFrames(z, 36, 80), [48, ...Array.from({ length: 20 }, (_, i) => 55 + i)]);
  assert.deepEqual([flaechen[48]?.hoch, flaechen[55]?.hoch, flaechen[48]?.vorn, flaechen[48]?.hinten], [16, 20, 147, -38]);
  // Landung J+42 = 62 ohne Pause; die Instanz läuft in LANDUNG und STAND weiter bis A+39 = 74
  assert.deepEqual([bei(z, 62).f_akt, bei(z, 68).f_akt, bei(z, 74).angriff, bei(z, 75).angriff], ['LANDUNG', 'STAND', 'SS', '']);
  // Treffer in A+13: 7 Stoppframes, Landung und A+20 bis A+39 verschieben sich um 7
  const t = laufen(weltAus(), '10,10,R\n12,30,R\n20,20,S\n35,35,A\n', 90, trefferIn([48]));
  assert.deepEqual([bei(t, 48).f_stopp, bei(t, 69).f_akt, bei(t, 68).f_akt], [7, 'LANDUNG', 'SPRINTSPRUNG']);
  assert.deepEqual(aktiveFrames(t, 49, 90), Array.from({ length: 20 }, (_, i) => 62 + i));
  // Treffer ab A+20 geben keinen Stopp
  const spaet = laufen(weltAus(), '10,10,R\n12,30,R\n20,20,S\n35,35,A\n', 80, trefferIn([55]));
  assert.deepEqual([bei(spaet, 55).f_stopp, bei(spaet, 62).f_akt], [0, 'LANDUNG']);
  // eine neue Aktion (Schlag nach der Landung) beendet die Instanz
  const neu = laufen(weltAus(), '10,10,R\n12,30,R\n20,20,S\n35,35,A\n69,69,A\n', 75);
  assert.deepEqual([bei(neu, 69).angriff, bei(neu, 70).f_akt, bei(neu, 70).angriff], ['SS', 'SCHLAG', 'KT1']);
});

test('figur: SPEZIAL ohne Treffer P+1 bis P+50, aktiv P+8 bis P+43, Fläche 43 bis 123 / 42 bis 122, Schutz 20 (T13, Kampf 9.4)', () => {
  const w = weltAus();
  const { zeilen: z, flaechen } = laufenMitFlaeche(w, '10,10,AS\n60,60,A\n', 85);
  assert.deepEqual([bei(z, 11).f_akt, bei(z, 11).f_zst, bei(z, 11).angriff], ['SPEZIAL', 3, 'SP']);
  assert.deepEqual(aktiveFrames(z, 11, 60), Array.from({ length: 36 }, (_, i) => 18 + i));
  const stufen = [18, 24, 30, 36, 42, 48].map((f) => flaechen[f]);
  assert.deepEqual(stufen.map((s) => s?.vorn), [43, 59, 75, 91, 107, 123]);
  assert.deepEqual(stufen.map((s) => s?.hinten), [42, 58, 74, 90, 106, 122]);
  assert.deepEqual([flaechen[23]?.vorn, flaechen[53]?.vorn, flaechen[18]?.tiefe], [43, 123, 28]);
  for (let f = 11; f <= 60; f++) assert.deepEqual([bei(z, f).f_akt, bei(z, f).f_zst, bei(z, f).f_x, bei(z, f).f_lp], ['SPEZIAL', 3, '100', 72]);
  assert.deepEqual([bei(z, 61).f_akt, bei(z, 61).f_schutz, bei(z, 61).f_zst], ['STAND', 20, 3]);
  // Druck in P+50 verfällt (T13 Lauf b); P+51 wirkt in P+52 (Lauf c)
  assert.deepEqual([bei(z, 62).f_akt, bei(z, 80).f_schutz, bei(z, 81).f_schutz, bei(z, 81).f_zst], ['STAND', 1, 0, 1]);
  const c = laufen(weltAus(), '10,10,AS\n61,61,A\n', 63);
  assert.equal(bei(c, 62).f_akt, 'SCHLAG');
});

test('figur: SPEZIAL mit Treffern: 7 Stoppframes je Stufe einmal, Kosten 9 LP in h+8 (T14, Kampf 6.4, 9.4)', () => {
  const w = weltAus();
  const haken: Haken = (welt) => {
    if (welt.frame === 24) return [trefferDerFigur(welt, 's0', 'U')];
    if (welt.frame === 33) return [trefferDerFigur(welt, 's2', 'U')]; // gleiche Stufe 2: kein neuer Stopp
    if (welt.frame === 49) return [trefferDerFigur(welt, 's1', 'U')];
    return [];
  };
  const z = laufen(w, '10,10,AS\n', 100, haken);
  assert.deepEqual([bei(z, 24).f_uhr, bei(z, 24).f_stopp], [14, 7]);
  for (let f = 25; f <= 31; f++) assert.deepEqual([bei(z, f).f_uhr, bei(z, f).f_stopp], [14, 31 - f]);
  assert.deepEqual([bei(z, 31).f_lp, bei(z, 32).f_lp, bei(z, 32).ereignis], [72, 63, 'K:F:9']);
  assert.equal(bei(z, 33).f_stopp, 0);
  assert.deepEqual([bei(z, 49).f_uhr, bei(z, 49).f_stopp], [32, 7]);
  assert.deepEqual([bei(z, 74).f_akt, bei(z, 75).f_akt, bei(z, 75).f_schutz], ['SPEZIAL', 'STAND', 20]);
  assert.deepEqual([bei(z, 94).f_zst, bei(z, 95).f_zst], [3, 1]);
});

test('figur: Kosten des Spezialangriffs höchstens bis 0 LP; mit 0 LP kein Spezialangriff (Kampf 6.4, T8 Lauf b)', () => {
  const w = weltAus(STANDARD_LP(5));
  const z = laufen(w, '10,10,AS\n', 40, trefferIn([18]));
  assert.deepEqual([bei(z, 26).f_lp, bei(z, 26).ereignis], [0, 'K:F:5']);
  const null_lp = laufen(weltAus(STANDARD_LP(0)), '10,10,AS\n', 12);
  assert.equal(bei(null_lp, 11).f_akt, 'SCHLAG');
});

function STANDARD_LP(lp: number): string {
  return `szene name=figur endframe=400 seed=1 buehne=pruefbuehne\npruefstart rang=9 rang.fest\nfigur x=100 z=100 blick=R lp=${lp}\n`;
}
