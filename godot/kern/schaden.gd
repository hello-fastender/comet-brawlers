# Schaden, LP, Schutz, Kosten, Tod und Neueinstieg der Spielfigur (K1) nach
# docs/spezifikation-kampf.md, Abschnitt 6 (6.2 Schaden anwenden, 6.3 Schutz,
# 6.4 Kosten des Spezialangriffs, 6.5 Tod und Neueinstieg) mit den Abläufen
# aus 4.3 (GETROFFEN, UMGEWORFEN, LIEGEN, AUFSTEHEN, TOT, NEUEINSTIEG) und
# den Bahnen F1 und F4 aus 5.7 (gemeinsame Bahnrechnung in bahn.gd).
# Port von spiel/src/kern/schaden.ts.
#
# Was ein Gegnertreffer an der Figur auslöst (Zielhandler figurGetroffen, KS7):
# - Figur geschützt (zustand 2 oder 3): Wirkung W, sonst nichts (E2, P11, P17).
# - sonst LP −= Schaden; LP < 0 → TOT (X), Umwerfen oder Figur in der Luft
#   → UMGEWORFEN (U, K11), sonst GETROFFEN (R) mit schutz 27; Flug immer vom
#   Angreifer weg (P14). Dazu: eigener Angriff endet (auch SS), Griff endet
#   (P16: Gegner frei, L:sn, Griffsperre 30), Waffe fällt in H+1 (10.4).
# Neueinstieg einheitlich N = t+120 (E16); Landung LN = N+53 trifft alle wachen
# Gegner im Bild (Instanz LN); Schutz 200 ab N+1, zählt ab LN+1 (252 Frames).
# Leben −1, Rang −3 und NE:F im Frame N führt K3 (Welt 8, 10.3).
class_name KernSchaden
extends RefCounted

## Aktionen mit zustand 2 (Kampf 4.1).
const BODEN_AKTIONEN: Array[String] = ["UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT"]


## Gegenrichtung.
static func gegen(b: int) -> int:
	return -1 if b == 1 else 1


## zustand der Figur nach Kampf 4.1: 2 in UMGEWORFEN, LIEGEN, AUFSTEHEN, TOT; 3 bei schutz > 0 oder im Spezialangriff; sonst 1.
static func figurZustandSetzen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if BODEN_AKTIONEN.has(f.aktion):
		f.zustand = KernEntitaeten.ZUSTAND_BODEN
	elif f.schutz > 0 or f.aktion == "SPEZIAL":
		f.zustand = KernEntitaeten.ZUSTAND_REAKTION
	else:
		f.zustand = KernEntitaeten.ZUSTAND_NORMAL


## KS2: schutz zählt vor der Trefferprüfung herunter (Kampf 6.3); im Fall nach dem Neueinstieg erst ab LN+1.
static func schutzZaehlen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.schutz <= 0:
		return
	if f.aktion == "NEUEINSTIEG" and welt.frame <= f.landung_ln:
		return
	f.schutz -= 1


## KS2 im Frame h+8 (Kampf 6.4): 9 LP Kosten, höchstens bis 0; Ereignis K:F:Betrag (tatsächlich abgezogen).
static func kostenSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.kosten_frame == 0 or f.kosten_frame != welt.frame:
		return
	f.kosten_frame = 0
	var neu: int = maxi(f.lp - KernWerte.SPEZIAL_KOSTEN, 0)
	var betrag: int = f.lp - neu
	if betrag <= 0:
		return
	f.lp = neu
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["KOSTEN"], "F", betrag])


## Flug vom Angreifer weg: Vorzeichen von x_Figur − x_Angreifer, bei Gleichheit dessen Blick (Kampf 5.7, P14).
static func flugrichtung(welt: KernWelt, t: KernEntitaeten.Treffer) -> int:
	var a: KernEntitaeten.EntitaetBasis = KernEntitaeten.entitaet(welt, t.angreifer)
	if a == null:
		return t.richtung
	var dx: int = KernFestkomma.ganz(welt.figur.x) - KernFestkomma.ganz(a.x)
	if dx > 0:
		return 1
	if dx < 0:
		return -1
	return a.blick


## UMGEWORFEN in H (Kampf 4.3): Stillstand H+1 bis H+8, Bahn F1 vom Angreifer
## weg in der aktuellen Höhe (Kampf 5.7, P15; bahn.gd), LIEGEN ab H+54.
static func figurUmwerfenBeginnen(welt: KernWelt, richtung: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "UMGEWORFEN")
	f.getroffen_h = welt.frame
	f.liege_druecke = 0
	f.liege_ende = welt.frame + KernWerte.FIGUR_LIEGEN_ENDE
	KernBahn.bahnStarten(f, "F1", richtung)


## TOT in t (Kampf 4.3, 6.5): Bahn F4, Neueinstieg N = t+120 bei jeder Todesart (E16).
static func todBeginnen(welt: KernWelt, richtung: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "TOT")
	f.tod_t = welt.frame
	f.neueinstieg_n = welt.frame + KernWerte.NEUEINSTIEG_NACH_TOD
	f.landung_ln = 0
	f.neueinstieg_bereit = false
	KernBahn.bahnStarten(f, "F4", richtung)


## Ein Bahnframe der Figur k Frames nach dem Treffer (Kampf 5.7, bahn.gd
## bahnSchritt): erst x mit der Begrenzung der Figur (Welt 2.2), dann h bis
## zum Bodenkontakt; danach läuft nur x weiter (Rückprall nur Darstellung,
## P13). Unterphase F im Flug, B ab dem Bodenkontakt. Die Aufrufer begrenzen
## die Bahn auf H+9 bis H+55 bzw. t+3 bis t+49 (Kampf 4.3).
static func figurBahnSchritt(welt: KernWelt, k: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var lage: String = KernBahn.bahnSchritt(f, k, KernFigurBasis.begrenzung(welt))
	f.phase = "F" if lage == "luft" else "B"


## KS7, Zielhandler für die Figur (Kampf 6.2, 6.3): t.lp_vorher, t.wirkung
## (W im Schutz bei zustand 2 oder 3; X bei LP < 0; U bei Umwerfen oder in
## der Luft; sonst R), als Erstes das Ereignis T, dann LP und Folgen. Ein
## wirkungsloser Treffer ändert nichts (E2, P11).
static func figurGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	t.lp_vorher = f.lp
	if f.zustand != KernEntitaeten.ZUSTAND_NORMAL:
		t.wirkung = "W"
		KernEreignisse.ereignisTreffer(welt, t)
		return
	var lp: int = f.lp - t.schaden
	t.wirkung = "X" if lp < 0 else ("U" if (t.umwerfen or f.h > 0) else "R")
	KernEreignisse.ereignisTreffer(welt, t)
	f.lp = lp
	f.letzter_angreifer = t.angreifer
	f.getroffen_h = welt.frame
	f.stopp = 0
	if f.waffe != "":
		f.waffe_fallen_frame = welt.frame + KernWerte.WAFFE_FALLEN_NACH
	if f.griff_ziel != null:
		KernFigurGriff.griffLoesen(welt)
		f.griffsperre = KernWerte.GRIFFSPERRE
	var r: int = flugrichtung(welt, t)
	if t.wirkung == "X":
		todBeginnen(welt, r)
	elif t.wirkung == "U":
		figurUmwerfenBeginnen(welt, r)
	else:
		KernFigurBasis.aktionSetzen(welt, "GETROFFEN")
		f.schutz = KernWerte.SCHUTZ_TREFFER
	figurZustandSetzen(welt)


## KS2: LP unter 0 ohne Treffer (Eingriff, LP < 0 ≤ lp_vor) ist der Tod in diesem Frame; Flug nach hinten (Festlegung K1).
static func eingriffTodPruefen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.lp < 0 and f.lp_vor >= 0 and f.aktion != "TOT":
		todBeginnen(welt, gegen(f.blick))


## KS2 in UMGEWORFEN, LIEGEN und AUFSTEHEN (Kampf 4.3): Bahn F1 H+9 bis H+55,
## LIEGEN ab H+54; jeder Frame ab H+54 mit neuem A oder S zählt einen Druck,
## mit dem sechsten in q endet das Liegen in L_end = q+2 (sonst H+94);
## AUFSTEHEN 26 Frames, STAND in U = L_end+27 mit schutz 35, Drücke ab U (P4).
static func bodenSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var h: int = f.getroffen_h
	var d: int = welt.frame - h
	f.uhr += 1
	if d > KernWerte.F1_STILLSTAND and d <= KernWerte.FIGUR_UMGEWORFEN_RUHE:
		figurBahnSchritt(welt, d)
	if f.aktion == "UMGEWORFEN" and d >= KernWerte.FIGUR_LIEGEN_AB:
		var phase: String = f.phase
		KernFigurBasis.aktionSetzen(welt, "LIEGEN")
		f.phase = phase if d <= KernWerte.FIGUR_UMGEWORFEN_RUHE else ""
		return
	if f.aktion == "LIEGEN":
		if d > KernWerte.FIGUR_UMGEWORFEN_RUHE:
			f.phase = ""
		var q: int = welt.frame - 1
		var neu: int = welt.eingabe.neu if welt.rahmen.steuerung == 1 else 0
		if q >= h + KernWerte.FIGUR_LIEGEN_AB and KernTasten.hat(neu, KernTasten.TASTE_A | KernTasten.TASTE_S):
			f.liege_druecke += 1
			if f.liege_druecke == KernWerte.LIEGE_DRUECKE and q + KernWerte.LIEGE_ENDE_NACH_DRUCK < f.liege_ende:
				f.liege_ende = q + KernWerte.LIEGE_ENDE_NACH_DRUCK
		if welt.frame > f.liege_ende:
			KernFigurBasis.aktionSetzen(welt, "AUFSTEHEN")
		return
	if f.aktion == "AUFSTEHEN" and welt.frame > f.liege_ende + KernWerte.FIGUR_AUFSTEHEN_DAUER:
		KernFigurBasis.standBeginnen(welt)
		f.bahn = ""
		f.schutz = KernWerte.SCHUTZ_AUFSTEHEN


## KS2 in TOT (Kampf 4.3, 6.5): Bahn F4 t+3 bis t+49 (Unterphase F, B, ab der
## Ruhe R); in N LP 72, wenn noch ein Leben folgt (K3 zieht in N ein Leben ab
## und beendet sonst das Spiel); in N+1 Erscheinen.
static func todSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var d: int = welt.frame - f.tod_t
	f.uhr += 1
	if d > KernWerte.F4_STILLSTAND and d <= KernWerte.F4_RUHE:
		figurBahnSchritt(welt, d)
	elif d > KernWerte.F4_RUHE:
		f.phase = "R"
	if welt.frame == f.neueinstieg_n and welt.rahmen.leben > 1:
		f.lp = KernWerte.FIGUR_LP
		f.neueinstieg_bereit = true
	if welt.frame == f.neueinstieg_n + 1 and f.neueinstieg_bereit and welt.rahmen.phase != "GAMEOVER":
		neueinstiegBeginnen(welt)


## Erscheinen in N+1 (Kampf 6.5): x = Kamera-x + 64, Tiefe = Kamera-y + 48, Höhe 256, Blick rechts, schutz 200, zustand 3.
static func neueinstiegBeginnen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "NEUEINSTIEG")
	f.neueinstieg_bereit = false
	f.x = KernFestkomma.ausGanz(welt.kamera.x + KernWerte.NEUEINSTIEG_X)
	f.z = KernFestkomma.ausGanz(welt.kamera.y + KernWerte.NEUEINSTIEG_Z)
	f.h = KernWerte.NEUEINSTIEG_H
	f.blick = 1
	f.bahn = ""
	f.vh = 0
	f.schutz = KernWerte.SCHUTZ_NEUEINSTIEG
	f.landung_ln = f.neueinstieg_n + KernWerte.NEUEINSTIEG_LANDUNG
	f.griff_ziel = null
	f.liege_druecke = 0


## KS2 in NEUEINSTIEG (Kampf 4.3, 6.5): Fall bis LN = N+53 (Höhenverlauf P28,
## 5 px je Frame), in LN Landung mit Instanz LN; LN bis LN+5 Landung, S neu in
## LN bis LN+4 gibt einen neuen Sprung ab Druck+1 (auch bei steuerung 0,
## Welt 11.4), STAND ab LN+6 mit Drücken ab LN+6.
static func neueinstiegSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var ln: int = f.landung_ln
	f.uhr += 1
	if welt.frame < ln:
		f.h = maxi(KernFestkomma.sub(f.h, KernWerte.NEUEINSTIEG_FALL_V), 0)
		return
	if welt.frame == ln:
		f.h = 0
		KernFigurBasis.aufsetzen(welt)
		f.angriff = KernFigurAngriffe.landungInstanz(ln)
		return
	if f.angriff != null and f.angriff.code == "LN":
		f.angriff = null
	var q: int = welt.frame - 1
	if KernTasten.hat(welt.eingabe.neu, KernTasten.TASTE_S) and q <= ln + KernWerte.NEUEINSTIEG_NEUSPRUNG_BIS:
		KernFigurBasis.sprungBeginnen(welt, false, welt.eingabe.t1)
		return
	if welt.frame >= ln + KernWerte.NEUEINSTIEG_LANDUNG_DAUER:
		KernFigurBasis.standBeginnen(welt)
