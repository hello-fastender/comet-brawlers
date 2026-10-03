import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJEKT_SPALTEN, PROTOKOLL_VERSION, protokollSpalten } from '../src/pruef/protokoll.ts';
import { md5 } from '../src/pruef/md5.ts';
import { csv, laufDateien, lies, zelle } from './hilfe.ts';

const ZAHL = /^-?(0|[1-9]\d*)(\.\d*[1-9])?$/;

test('protokoll: Spalten nach Kampf 11.3 und Welt 11.4 in fester Reihenfolge', () => {
  const s = protokollSpalten();
  assert.equal(s.length, 22 + 20 * 10 + 13 + 20 * 6 + 2 + 1);
  assert.equal(new Set(s).size, s.length);
  assert.deepEqual(s.slice(0, 22), [
    'frame', 'tasten', 'f_x', 'f_z', 'f_h', 'f_lp', 'f_zst', 'f_akt', 'f_ph', 'f_uhr', 'f_stopp', 'f_schutz',
    'f_blick', 'kombo', 'f_waffe', 'f_mun', 'f_sprint', 'rang', 'rang_zaehler', 'kamera_x', 'kamera_y', 'zufall_haupt',
  ]);
  assert.deepEqual(s.slice(22, 32), ['s0_typ', 's0_x', 's0_z', 's0_h', 's0_lp', 's0_zst', 's0_akt', 's0_modus', 's0_ph', 's0_blick']);
  assert.equal(s[221], 's19_blick');
  assert.deepEqual(s.slice(222, 235), [
    'kamera_modus', 'schuetteln', 'lebende', 'wellen', 'pfeil', 'recht_l', 'recht_r', 'zielrecht', 'leben', 'punkte',
    'anzeige', 'phase', 'steuerung',
  ]);
  assert.deepEqual(s.slice(235, 241), ['s0_recht', 's0_angriff', 's0_ziel', 's0_schaden', 's0_timer', 's0_zufall']);
  assert.equal(s[354], 's19_zufall');
  assert.deepEqual(s.slice(355), ['s0_lpfolge', 's0_folge', 'ereignis']);
  assert.deepEqual(OBJEKT_SPALTEN, ['frame', 'slot', 'typ', 'art', 'x', 'z', 'h', 'zst', 'lp', 'munition', 'liegezeit', 'inhalt', 'flugphase']);
});

test('protokoll: Prüflauf mit leerer Logik schreibt ein formal richtiges Protokoll', () => {
  const e = laufDateien('tests/szenen/beispiel_puppe.txt', 'tests/eingaben/beispiel.txt');
  assert.equal(e.frames, 140);
  assert.ok(e.protokoll.endsWith('\n'));
  assert.ok(!e.protokoll.includes('\r'));
  const p = csv(e.protokoll);
  assert.deepEqual(p.kopf, [
    `# version=${PROTOKOLL_VERSION}`,
    '# szene=beispiel_puppe',
    '# seed=1',
    `# eingabe_md5=${md5(lies('tests/eingaben/beispiel.txt'))}`,
    '# EINGRIFF frame=43 ziel=s0 feld=x wert=200',
    '# EINGRIFF pruefangriff slot=0 von=19 bis=23 schaden=5 umwerfen=nein',
  ]);
  assert.deepEqual(p.spalten, protokollSpalten());
  assert.equal(p.zeilen.length, 140);
  p.zeilen.forEach((z, i) => {
    assert.equal(z.length, p.spalten.length, `Zeile ${i + 1}`);
    assert.equal(zelle(p, z, 'frame'), String(i + 1));
    for (const sp of ['f_x', 'f_z', 'f_h', 's0_x', 's0_z', 's0_h', 'f_lp', 'rang', 'kamera_x']) {
      assert.match(zelle(p, z, sp), ZAHL, `${sp} in Zeile ${i + 1}`);
    }
    assert.notEqual(zelle(p, z, 'f_x'), '-0');
    // freie Slots haben leere Felder
    for (const sp of ['s1_typ', 's1_x', 's19_blick', 's1_recht', 's19_zufall']) assert.equal(zelle(p, z, sp), '');
  });
  const z1 = p.zeilen[0] as string[];
  assert.deepEqual(
    ['f_x', 'f_z', 'f_h', 'f_lp', 'f_zst', 'f_akt', 'f_blick', 's0_typ', 's0_x', 's0_lp', 's0_zst', 's0_modus', 'kamera_modus', 'leben', 'phase', 'steuerung', 'schuetteln'].map((sp) => zelle(p, z1, sp)),
    ['100', '100', '0', '72', '1', 'STAND', 'R', 'Puppe', '146', '16', '1', 'PUPPE', 'FREI', '3', 'SPIEL', '1', '0/0'],
  );
  assert.equal(zelle(p, p.zeilen[9] as string[], 'tasten'), 'A');
  assert.equal(zelle(p, p.zeilen[34] as string[], 'tasten'), 'RA');
  assert.equal(zelle(p, p.zeilen[42] as string[], 's0_x'), '200');
  assert.equal(zelle(p, p.zeilen[42] as string[], 'ereignis'), 'EI:s0.x=200');
  assert.equal(zelle(p, p.zeilen[41] as string[], 's0_x'), '146');
  assert.equal(zelle(p, z1, 's0_timer'), '1');
  assert.equal(zelle(p, p.zeilen[9] as string[], 's0_timer'), '10');
  // Objektprotokoll: nur Kopf, keine belegten Objektslots
  const o = csv(e.objekte);
  assert.deepEqual(o.spalten, [...OBJEKT_SPALTEN]);
  assert.equal(o.zeilen.length, 0);
});

test('protokoll: Objektprotokoll mit Behältern der Bühne scheibe (Kampf 11.5)', () => {
  const e = laufDateien('tests/szenen/beispiel_scheibe.txt');
  const o = csv(e.objekte);
  assert.equal(o.zeilen.length, 120 * 5);
  const erste = o.zeilen.slice(0, 5).map((z) => [z[1], z[2], z[3], z[4], z[5], z[11]]);
  assert.deepEqual(erste, [
    ['o20', 'Behälter', 'Fass', '560', '158', 'Kometenbraten'],
    ['o21', 'Behälter', 'Bosskiste', '2040', '95', 'Raketenwerfer'],
    ['o22', 'Behälter', 'Bosskiste', '2080', '95', 'Raketenwerfer'],
    ['o23', 'Behälter', 'Bosskiste', '2120', '95', 'leer'],
    ['o24', 'Behälter', 'Fass', '2150', '60', 'Raketenwerfer'],
  ]);
  for (const z of o.zeilen) assert.equal(z.length, OBJEKT_SPALTEN.length);
  const p = csv(e.protokoll);
  assert.ok(p.kopf.includes('# EINGRIFF erscheint frame=60 slot=2 typ=Bolzer x=1900 z=70'));
  const z59 = p.zeilen[58] as string[];
  const z60 = p.zeilen[59] as string[];
  assert.equal(zelle(p, z59, 's2_typ'), '');
  assert.equal(zelle(p, z60, 's2_typ'), 'Bolzer');
  assert.equal(zelle(p, z60, 's2_timer'), '1');
  assert.equal(zelle(p, z60, 'ereignis'), 'EI:s2.erscheint=Bolzer');
  assert.equal(zelle(p, z60, 'zufall_haupt'), '3');
  assert.deepEqual(['kamera_x', 'kamera_y', 'kamera_modus', 's0_typ', 's0_x', 's0_blick', 's0_lp', 's0_lpfolge', 's0_folge'].map((s) => zelle(p, z59, s)), ['1792', '0', 'ARENA', 'Ballast', '2060', 'L', '100', '0', '0']);
  assert.equal(zelle(p, p.zeilen[89] as string[], 'ereignis'), 'EI:welle.9.jetzt=ja');
});
