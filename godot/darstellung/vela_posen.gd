## Posen von Vela und die Zuordnung Aktion/Uhr → Pose (Auftrag 6, Phase 2;
## docs/grafik.md 4.1 Bilddauern, 9.3 Zuordnung).
##
## Eine Pose ist ein Dictionary:
##   "wurzel":  Vector2, x = Versatz des Beckens vom Fußpunkt in Bildpixeln, y = zusätzliche
##              Höhe (0 = Sohle des tiefsten Fußes auf y = 0; y < 0 hebt die Figur)
##   "winkel":  Bone → Grad, Winkel relativ zum Elternteil, vorwärts (gegen den Uhrzeigersinn
##              auf dem Bildschirm, bei Blick rechts) positiv; Rumpf negativ = nach vorn
##              geneigt. Alle 16 Bones sind gesetzt. Die Füße sind aus dem Weltwinkel
##              (0 = Sohle flach, + Spitze hoch) umgerechnet.
##   "versatz": Bone → Vector2, zusätzlicher Versatz des Gelenks im Elternteil (Streckung im Trefferbild)
##   "tausch":  Bone → Teilbild (HandV: faust | hand_offen, FussV: stiefel_seite | stiefel_vorn)
##   "ebenen":  Bone → z_index (0 bis 23), überschreibt EBENE_STANDARD
##
## Die Winkel sind Vielfache von 15° (Auftrag 5, 2c), wo es die Pose nicht stört; Stufen
## von 5° nur an Beinen, damit beide Füße am Boden bleiben.
##
## Zeit: Schritt 1/60 s, gesteuert von der Logik. Die Bilddauern stehen unten, das Bild zur
## Aktionsuhr ist das erste, bei dem die Summe der Dauern die Uhr erreicht (`bild_index`).
class_name DarstellungVelaPosen
extends RefCounted

## Zeichenreihenfolge (z_index relativ zur Puppe) der Teile, wenn die Pose nichts anderes sagt.
## Hinten: Zopf, hinterer Arm, hinteres Bein; dann vorderes Bein, Becken, Rumpf, Kopf; vorn: vorderer Arm.
const EBENE_STANDARD: Dictionary = {
	"Zopf": 0,
	"FussH": 1, "UnterschenkelH": 2, "OberschenkelH": 3,
	"FussV": 4, "UnterschenkelV": 5, "OberschenkelV": 6,
	"Becken": 7, "Rumpf": 8, "Kopf": 9,
	"UnterarmH": 10, "OberarmH": 11, "HandH": 12,
	"UnterarmV": 13, "OberarmV": 14, "HandV": 15,
}

## Hinterer Arm vorn (schlagender Arm der Kette 2, Zopf vorn beim Drehen).
const ARM_H_VORN: Dictionary = {"UnterarmH": 16, "OberarmH": 17, "HandH": 18}
## Hinterer Arm hinter dem Rumpf (Rückenansicht).
const ARM_H_HINTEN: Dictionary = {"UnterarmH": 0, "OberarmH": 0, "HandH": 0}
## Vorderes Bein vor dem Rumpf (Tritte).
const BEIN_V_VORN: Dictionary = {"OberschenkelV": 19, "UnterschenkelV": 20, "FussV": 21}

## Bilddauern in Frames (docs/grafik.md 4.1). Die Bildzahl der Puppe ist die der Tabelle.
const GEHEN_BILDER: int = 12
const GEHEN_DAUER: int = 4
const DAUERN: Dictionary = {
	"stand": [0],
	"kette1": [1, 4, 1, 1, 1, 8],
	"kette2": [1, 1, 4, 10],
	"kette3": [1, 1, 1, 4, 10],
	"kette4": [1, 1, 4, 2, 2, 2, 2, 2, 4, 2, 2, 1],
}

static var _tabellen: Dictionary = {}


# ---------------------------------------------------------------------------
# Zuordnung Zustand der Figur → Animation und Uhr
# ---------------------------------------------------------------------------

## Kettenstufe 1 bis 4 der Figur (kombo, sonst Unterphase) wie `ketteStufe` in zuordnung.ts.
static func kette_stufe(f: KernEntitaeten.Figur) -> int:
	var k: int = f.kombo
	if k >= 1 and k <= KernWerte.KOMBO_MAX:
		return k
	if f.phase.is_valid_int():
		k = int(f.phase)
		if k >= 1 and k <= KernWerte.KOMBO_MAX:
			return k
	return 1


## Uhr der Kettenbilder (G7-2 in docs/grafik.md 9.3): Mit Ausfallschritt liegen die aktiven
## Frames später, die Bilder verschieben sich um den Unterschied, damit das Trefferbild im
## ersten aktiven Frame steht. Das zweite Fenster der Kette 4 bleibt bei uhr 17 bis 20.
static func kette_uhr(f: KernEntitaeten.Figur) -> int:
	var k: int = kette_stufe(f)
	if f.ausfallschritt <= 0:
		return f.uhr
	if k == KernWerte.KOMBO_MAX and f.uhr >= KernWerte.KETTE4_ZWEITES_FENSTER_VON:
		return f.uhr
	var versatz: int = KernWerte.AUSFALL_AKTIV_VON[k - 1] - KernWerte.KETTE_AKTIV_VON[k - 1]
	return maxi(1, f.uhr - versatz)


## Animation und Uhr zum Zustand der Figur. Nicht abgedeckte Aktionen zeigen die Standpose.
## Rückgabe: {"animation": String, "uhr": int}
static func zuordnung(f: KernEntitaeten.Figur, _welt: KernWelt) -> Dictionary:
	match f.aktion:
		"STAND":
			return {"animation": "stand", "uhr": 1}
		"LAUF":
			return {"animation": "gehen", "uhr": f.uhr}
		"SCHLAG", "LEERSCHLAG":
			return {"animation": "kette%d" % kette_stufe(f), "uhr": kette_uhr(f)}
	return {"animation": "stand", "uhr": 1}


## Ist die Aktion der Figur von der Puppe abgedeckt (sonst zeichnet die Hauptsitzung den Platzhalter)?
static func abgedeckt(f: KernEntitaeten.Figur) -> bool:
	return f.aktion == "STAND" or f.aktion == "LAUF" or f.aktion == "SCHLAG" or f.aktion == "LEERSCHLAG"


# ---------------------------------------------------------------------------
# Tabellen: Uhr → Bild → Pose
# ---------------------------------------------------------------------------

## Dauern der Bilder einer Animation.
static func dauern(animation: String) -> Array:
	if animation == "gehen":
		var a: Array = []
		for i: int in GEHEN_BILDER:
			a.append(GEHEN_DAUER)
		return a
	return DAUERN.get(animation, DAUERN["stand"])


## Bildindex zur Aktionsuhr (Beginn 1): erstes Bild, bei dem die Summe der Dauern die Uhr
## erreicht, danach hält das letzte. Schleife (gehen): (uhr − 1) / Dauer, modulo Bildzahl.
## Dauer 0 (stand): Bild 0.
static func bild_index(animation: String, uhr: int) -> int:
	if animation == "gehen":
		return posmod((maxi(uhr, 1) - 1) / GEHEN_DAUER, GEHEN_BILDER)
	var d: Array = dauern(animation)
	var summe: int = 0
	for i: int in d.size():
		summe += d[i]
		if uhr <= summe:
			return i
	return d.size() - 1


## Bildindex des Trefferbildes (erster aktiver Frame) der Kettenstufe 1 bis 4.
static func treffer_bild(stufe: int) -> int:
	return bild_index("kette%d" % stufe, KernWerte.KETTE_AKTIV_VON[stufe - 1])


## Bildindex des zweiten Trefferfensters der Kette 4 (Tritt nach der Drehung).
static func treffer_bild_zweites_fenster() -> int:
	return bild_index("kette4", KernWerte.KETTE4_ZWEITES_FENSTER_VON)


## Alle Posen einer Animation (ein Eintrag je Bild).
static func posen(animation: String) -> Array:
	if _tabellen.is_empty():
		_tabellen = _baue_tabellen()
	return _tabellen.get(animation, _tabellen["stand"])


## Pose zur Animation und Aktionsuhr.
static func pose(animation: String, uhr: int) -> Dictionary:
	var liste: Array = posen(animation)
	return liste[clampi(bild_index(animation, uhr), 0, liste.size() - 1)]


static func animationen() -> Array[String]:
	return ["stand", "gehen", "kette1", "kette2", "kette3", "kette4"]


# ---------------------------------------------------------------------------
# Auflösen einer kurzen Beschreibung zu einer vollen Pose
# ---------------------------------------------------------------------------

## Kurzform: x (Versatz), b (Becken), r (Rumpf), k (Kopf), z (Zopf),
## av/ah = [Oberarm, Unterarm, Hand] des vorderen/hinteren Arms,
## bv/bh = [Oberschenkel, Unterschenkel relativ, Fuß Welt] des vorderen/hinteren Beins,
## t = Tausch, e = Ebenen, v = Versatz, y = zusätzliche Höhe.
static func _k(s: Dictionary) -> Dictionary:
	var w: Dictionary = {}
	var b: float = s.get("b", 0.0)
	w["Becken"] = b
	w["Rumpf"] = s.get("r", 0.0)
	w["Kopf"] = s.get("k", 0.0)
	w["Zopf"] = s.get("z", 0.0)
	for seite: String in ["V", "H"]:
		var arm: Array = s.get("a" + seite.to_lower(), [0.0, 0.0, 0.0])
		w["Oberarm" + seite] = arm[0]
		w["Unterarm" + seite] = arm[1]
		w["Hand" + seite] = arm[2]
		var bein: Array = s.get("b" + seite.to_lower(), [0.0, 0.0, 0.0])
		w["Oberschenkel" + seite] = bein[0]
		w["Unterschenkel" + seite] = bein[1]
		# Fuß: Weltwinkel (0 = flach) in den Winkel zum Unterschenkel umrechnen
		w["Fuss" + seite] = float(bein[2]) - (b + float(bein[0]) + float(bein[1]))
	return {
		"wurzel": Vector2(s.get("x", 0.0), s.get("y", 0.0)),
		"winkel": w,
		"versatz": s.get("v", {}),
		"tausch": s.get("t", {}),
		"ebenen": s.get("e", {}),
		"breite": s.get("breite", 1.0),
	}


static func _baue_tabellen() -> Dictionary:
	var t: Dictionary = {}
	t["stand"] = [_stand()]
	t["gehen"] = _gehen()
	t["kette1"] = _kette1()
	t["kette2"] = _kette2()
	t["kette3"] = _kette3()
	t["kette4"] = _kette4()
	return t


# ---------------------------------------------------------------------------
# Posen (Winkel nach dem Bild gesetzt und im Kontaktbogen geprüft)
# ---------------------------------------------------------------------------

static func _stand() -> Dictionary:
	return _k({
		"x": 0, "r": -5, "k": 5, "z": -30,
		"av": [45, 105, 15], "ah": [15, 120, 15],
		"bv": [30, -30, 0], "bh": [-30, 30, 0],
	})


static func _gehen() -> Array:
	return [
		_k({"x": 0, "r": -5, "k": 5, "z": -45, "av": [-30, 15, 0], "ah": [30, 45, 0], "bv": [40, 0, 10], "bh": [-40, 0, -25], "t": {"HandV": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -30, "av": [-30, 15, 0], "ah": [30, 45, 0], "bv": [35, -5, 0], "bh": [-35, -35, -20], "t": {"HandV": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -30, "av": [-15, 15, 0], "ah": [15, 30, 0], "bv": [20, -10, 0], "bh": [-20, -65, -40], "t": {"HandV": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -45, "av": [0, 30, 0], "ah": [0, 30, 0], "bv": [0, -10, 0], "bh": [0, -75, -45]}),
		_k({"x": 0, "r": -5, "k": 5, "z": -60, "av": [15, 30, 0], "ah": [-15, 30, 0], "bv": [-20, -10, 0], "bh": [20, -65, -40], "t": {"HandH": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -60, "av": [30, 45, 0], "ah": [-30, 15, 0], "bv": [-35, -5, 0], "bh": [35, -40, -5], "t": {"HandH": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -45, "av": [30, 45, 0], "ah": [-30, 15, 0], "bv": [-40, 0, -25], "bh": [40, 0, 10], "t": {"HandH": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -30, "av": [30, 45, 0], "ah": [-30, 15, 0], "bv": [-35, -35, -20], "bh": [35, -5, 0], "t": {"HandH": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -30, "av": [15, 30, 0], "ah": [-15, 15, 0], "bv": [-20, -65, -40], "bh": [20, -10, 0], "t": {"HandH": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -45, "av": [0, 30, 0], "ah": [0, 30, 0], "bv": [0, -75, -45], "bh": [0, -10, 0]}),
		_k({"x": 0, "r": -5, "k": 5, "z": -60, "av": [-15, 30, 0], "ah": [15, 30, 0], "bv": [20, -65, -40], "bh": [-20, -10, 0], "t": {"HandV": "hand_offen"}}),
		_k({"x": 0, "r": -5, "k": 5, "z": -60, "av": [-30, 15, 0], "ah": [30, 45, 0], "bv": [35, -40, -5], "bh": [-35, -5, 0], "t": {"HandV": "hand_offen"}}),
	]


## Standpose in Kurzform (Kampfhaltung wie vela_k_kampfhaltung.png: Beine gegrätscht,
## vordere Faust vorn auf Brusthöhe, hintere vor dem Kinn); die Ketten bauen darauf auf.
const STAND_KURZ: Dictionary = {
	"x": 0, "r": -5, "k": 5, "z": -30,
	"av": [45, 105, 0], "ah": [15, 120, 0],
	"bv": [30, -30, 0], "bh": [-30, 30, 0],
}


## Kurzform mit Abweichungen von der Basis (Standard: Standpose).
static func _m(abw: Dictionary, basis: Dictionary = STAND_KURZ) -> Dictionary:
	var d: Dictionary = basis.duplicate()
	d.merge(abw, true)
	return _k(d)


## Kette 1 (6 Bilder, Dauern 1/4/1/1/1/8): Gerade mit der vorderen Faust aus dem Ausfallschritt.
## Bild 1 ist das Trefferbild (uhr 2), Bild 2 und 4 sind Zwischenbilder.
static func _kette1() -> Array:
	var treffer: Dictionary = {
		"x": 12, "r": -20, "k": 15, "z": -75,
		"av": [90, -15, 0], "ah": [30, 105, 0],
		"bv": [60, -60, 0], "bh": [-35, 0, -15],
	}
	return [
		_m({"x": -2, "r": 5, "k": 0, "z": -30, "av": [30, 105, 0]}),
		_m(treffer),
		_m({"x": 9, "r": -15, "k": 10, "z": -60, "av": [75, 0, 0], "bv": [55, -55, 0], "bh": [-35, 0, -15]}),
		_m({"x": 6, "r": -10, "k": 8, "z": -55, "av": [60, 15, 0], "bv": [45, -45, 0], "bh": [-30, 15, -10]}),
		_m({"x": 3, "r": -5, "k": 5, "z": -45, "av": [45, 60, 0]}),
		_m({}),
	]


## Kette 2 (4 Bilder, Dauern 1/1/4/10): Gerade mit der hinteren Faust, die Schulter dreht vor.
## Bild 2 ist das Trefferbild (uhr 3), der hintere Arm liegt in der Pose vor dem Rumpf.
static func _kette2() -> Array:
	return [
		_m({"x": -4, "r": 5, "k": 0, "z": -30, "ah": [20, 120, 0], "av": [30, 105, 0]}),
		_m({"x": 4, "r": -10, "k": 8, "z": -55, "ah": [60, 30, 0], "av": [20, 105, 0], "bv": [45, -45, 0], "bh": [-35, 15, -10], "e": ARM_H_VORN}),
		_m({
			"x": 14, "r": -25, "k": 20, "z": -75,
			"ah": [90, -15, 0], "av": [15, 105, 0],
			"bv": [60, -60, 0], "bh": [-40, 0, -30], "e": ARM_H_VORN,
		}),
		_m({"x": 6, "r": -12, "k": 10, "z": -60, "ah": [60, 15, 0], "av": [15, 105, 0], "bv": [45, -45, 0], "bh": [-30, 15, -10], "e": ARM_H_VORN}),
	]


## Kette 3 (5 Bilder, Dauern 1/1/1/4/10): Aufwärtshaken mit der vorderen Faust aus der Hocke.
## Bild 3 ist das Trefferbild (uhr 4).
static func _kette3() -> Array:
	var tief: Dictionary = {
		"x": -2, "r": 5, "k": 0, "z": -30,
		"av": [30, 90, 0], "bv": [60, -60, 0], "bh": [-55, 55, 0],
	}
	return [
		_m(tief),
		_m({"x": -2, "r": 0, "k": 5, "z": -25, "av": [0, 45, 0], "bv": [60, -60, 0], "bh": [-55, 55, 0]}),
		_m({"x": 3, "r": -10, "k": 8, "z": -50, "av": [45, 60, 0], "bv": [50, -50, 0], "bh": [-40, 30, 0]}),
		_m({
			"x": 10, "r": -20, "k": 15, "z": -80,
			"av": [135, 15, 0], "ah": [15, 120, 0],
			"bv": [45, -45, 0], "bh": [-30, 0, -30],
		}),
		_m({"x": 5, "r": -10, "k": 8, "z": -60, "av": [90, 45, 0], "bv": [40, -40, 0], "bh": [-30, 15, -10]}),
	]


## Kette 4 (12 Bilder, Dauern 1/1/4/2/2/2/2/2/4/2/2/1): Abschlusstritt mit dem vorderen Bein,
## Drehung (Rücken, Blick nach hinten, Rücken), zweiter Tritt im zweiten Fenster, Landung.
## Bild 2 (uhr 3) und Bild 8 (uhr 17) sind die Trefferbilder. Die Drehung staucht die Puppe
## quer ("breite"); Bild 5 (Blick nach hinten) spiegelt sie.
static func _kette4() -> Array:
	var heben: Dictionary = {
		"x": -2, "r": 5, "k": -2, "z": -40,
		"av": [30, 105, 0], "ah": [15, 120, 0],
		"bv": [75, -75, 15], "bh": [0, 0, 0], "e": BEIN_V_VORN,
	}
	var knie: Dictionary = heben.duplicate()
	knie.merge({"r": 10, "k": -5, "bv": [90, -45, 30]}, true)
	var tritt: Dictionary = {
		"x": 4, "r": 25, "k": -15, "z": -25,
		"av": [-30, 30, 0], "ah": [-60, 45, 0],
		"bv": [90, 0, 80], "bh": [-5, 0, 0], "e": BEIN_V_VORN,
	}
	var tritt2: Dictionary = tritt.duplicate()
	tritt2.merge({"r": 30, "k": -20, "z": -40, "bv": [105, 0, 90]}, true)
	var ruecken: Dictionary = {
		"x": 0, "r": 0, "k": 0, "z": -10, "breite": 0.55,
		"av": [20, 90, 0], "ah": [20, 90, 0],
		"bv": [10, -10, 0], "bh": [-10, 10, 0], "e": ARM_H_VORN,
		"t": {"FussV": "stiefel_vorn", "FussH": "stiefel_vorn"},
	}
	var hinten: Dictionary = ruecken.duplicate()
	hinten.merge({"breite": -1.0, "z": -35, "bv": [30, -30, 0], "bh": [-30, 30, 0], "t": {}}, true)
	return [
		_m(heben),
		_m(knie),
		_m(tritt),
		_m(heben, knie),
		_m(ruecken),
		_m(hinten),
		_m(ruecken),
		_m({"z": -60}, knie),
		_m(tritt2),
		_m({"x": 0, "r": 6, "k": 0, "z": -55, "bv": [60, -60, 15], "bh": [0, 0, 0], "e": BEIN_V_VORN}, heben),
		_m({"x": -1, "r": -2, "k": 2}),
		_m({}),
	]
