## Posen und Zeitläufe von Vela und die Zuordnung Aktion/Uhr → Pose (Auftrag 6, Phase 2;
## docs/grafik.md 4.1 Bilddauern, 9.3 Zuordnung), Nachbesserung Flüssigkeit.
##
## Eine Pose ist eine ABSICHT (Dictionary), keine Winkelliste. Die Puppe (DarstellungVelaPuppe)
## löst daraus alle Winkel (Zwei-Segment-IK für Arme und Beine):
##   "x"      Becken: Versatz vom Fußpunkt (px, vorwärts +)
##   "y"      Becken: Höhe über dem Boden wie gewünscht (px); die Puppe senkt sie, wenn ein Standbein
##            sein Ziel sonst nicht erreicht
##   "bt"     Becken: Neigung (Grad, vorwärts +)
##   "lean"   Rumpf: Neigung gegen die Senkrechte in der Welt (Grad, vorwärts +)
##   "tw"     Rumpf: Stauchung durch Drehung (0 bis 1; Rumpf bis −22 %, Becken bis −12 % breit)
##   "kopf"   Kopf: Neigung in der Welt (Grad, vorwärts +)
##   "z"      Zopf: Ruhewinkel gegen den Kopf (Grad, − = nach hinten); die Feder der Puppe schwingt darum
##   "hv","hh"   Zielpunkt des Handgelenks gegen die Schulter (px; x vorwärts, y nach unten), Weltachsen
##   "hwv","hwh" Drehung der Hand gegen den Unterarm (Grad)
##   "fv","fh"   Vector3(x, h, w): Knöchel x im Puppenraum, Höhe h der tiefsten Stiefelstelle über dem
##               Boden (px; h = 0 steht auf dem Boden), Weltwinkel w des Stiefels (Grad, 0 flach, + Spitze hoch)
##   "smv","smh" Streckung des Arms entlang seiner Länge (Verwischbild), 1 = normal
##   "breite","wende"  Stauchung der ganzen Puppe quer (Drehung), wende = ±1 spiegelt
##   "t"      Teiltausch (Bone → Teilbild), "e"  Ebenen (Bone → z_index 0 bis 23)
##
## Zeit: Schritt 1/60 s, gesteuert von der Logik. Eine Animation ist eine Liste von Schlüsselposen mit
## Zeitpunkten in Aktionsuhren (Beginn 1). Dazwischen wird je Tick mit Easing gemischt. Die Summe der
## Dauern der Schlüsselposen ist die Dauer aus der Logik (Kampf 4.3). Das Trefferbild beginnt im
## ersten aktiven Frame und hält bis zum letzten (die Uhr steht im Trefferstopp, die Pose also auch).
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
## Vorderes Bein vor dem Rumpf (Tritte).
const BEIN_V_VORN: Dictionary = {"OberschenkelV": 19, "UnterschenkelV": 20, "FussV": 21}

# ---------------------------------------------------------------------------
# Gehen: Zyklus, Schritt, Standfuß in Weltkoordinaten ohne Rutschen
# ---------------------------------------------------------------------------

## Gehtempo der Logik in Basispixeln je Tick: LAUF_X (Spielpixel, 16.16) · ASSET_BASIS (2).
const GEHEN_V: float = 3.5
## Zykluslänge in Ticks (zwei Schritte). Die Logik schleift LAUF über `uhr`, die Darstellung nimmt `uhr`
## modulo dieser Länge. Kürzer als die 48 Ticks des alten Entwurfs: Bei 3,5 px je Tick und
## 39 px Beinlänge (18 + 21) kann ein Standfuß nur etwa 40 px unter dem Körper entlang wandern.
const GEHEN_ZYKLUS: int = 24
## Dauer der Standphase je Fuß (Ticks); der Rest des Zyklus ist Schwungphase.
const GEHEN_STAND: float = 12.0
## Bilder des Gehens für Kontaktbögen und Tabellen: ein Bild alle 2 Ticks.
const GEHEN_BILD_DAUER: int = 2
const GEHEN_BILDER: int = 12
## Atmen im Stand: Periode in Ticks.
const ATEM_PERIODE: float = 100.0

# Stiefel (stiefel_seite.png, 25 × 21): Knöchel und die drei Hüllpunkte der Sohle (Bildkoordinaten)
const FUSS_ANKEL: Vector2 = Vector2(7, 5)
const FUSS_A: Vector2 = Vector2(1, 20)
const FUSS_B: Vector2 = Vector2(12, 21)
const FUSS_C: Vector2 = Vector2(25, 21)
## Stiefelwinkel beim Aufsetzen der Ferse und beim Abstoßen (Grad)
const GEHEN_W_AUFSETZEN: float = 12.0
const GEHEN_W_ABSTOSS: float = -24.0
## Dauer des Fersenabrollens und des Abstoßens (Ticks)
const GEHEN_T_FERSE: float = 1.5
const GEHEN_T_FLACH: float = 3.0
const GEHEN_T_ABSTOSS: float = 4.5
## Fußhub im Schwung (px)
const GEHEN_HUB: float = 5.0
## Knöchel-x in der Mitte der Standphase (px gegen den Fußpunkt) für Fuß V und H
const GEHEN_MITTE_V: float = 2.0
const GEHEN_MITTE_H: float = -2.0
const GEHEN_Y: float = 59.0
const GEHEN_BOB: float = 1.5
const GEHEN_HAND_OFFEN: bool = false

# ---------------------------------------------------------------------------
# Zeiten
# ---------------------------------------------------------------------------

## Schlüsselposen: Dauern in Ticks (Summe = Dauer der Aktion in der Logik); siehe `schluessel()`.
## Für die Prüfung: Dauern der Ketten aus KernWerte.
const KETTE_DAUER_KEY: Dictionary = {"kette1": "LEERSCHLAG_DAUER", "kette2": "KETTE2_LEER_DAUER", "kette3": "KETTE3_LEER_DAUER", "kette4": "KETTE4_DAUER"}

static var _tabellen: Dictionary = {}
static var _huelle_fuss: PackedVector2Array = PackedVector2Array()


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
## Rückgabe: {"animation": String, "uhr": int}. Im Stand läuft die Uhr der Logik (Atmen).
static func zuordnung(f: KernEntitaeten.Figur, _welt: KernWelt) -> Dictionary:
	match f.aktion:
		"STAND":
			return {"animation": "stand", "uhr": maxi(f.uhr, 1)}
		"LAUF":
			return {"animation": "gehen", "uhr": f.uhr}
		"SCHLAG", "LEERSCHLAG":
			return {"animation": "kette%d" % kette_stufe(f), "uhr": kette_uhr(f)}
	return {"animation": "stand", "uhr": 1}


## Ist die Aktion der Figur von der Puppe abgedeckt (sonst zeichnet die Hauptsitzung den Platzhalter)?
static func abgedeckt(f: KernEntitaeten.Figur) -> bool:
	return f.aktion == "STAND" or f.aktion == "LAUF" or f.aktion == "SCHLAG" or f.aktion == "LEERSCHLAG"


static func animationen() -> Array[String]:
	return ["stand", "gehen", "kette1", "kette2", "kette3", "kette4"]


# ---------------------------------------------------------------------------
# Zeitlauf: Schlüsselposen, Dauern, Bildindex
# ---------------------------------------------------------------------------

## Schlüsselposen einer Animation: Array von Dictionaries
## {"t": Zeitpunkt (Uhr, Beginn 1), "dauer": Ticks bis zur nächsten, "halt": Ticks, die die Pose ab t gehalten wird,
##  "pose": Absicht, "e": Easing der ankommenden Strecke, "wechsel": Fortschritt, ab dem Tausch und Ebenen
##  dieser Pose gelten, "schnapp": true = Sprung in diese Pose ist ein Schnappframe, "sm": Überschreibung im ersten Tick}.
## Für „stand“ und „gehen“ ein Eintrag je Kontaktbogenbild.
static func schluessel(animation: String) -> Array:
	if _tabellen.is_empty():
		_tabellen = _baue_tabellen()
	return _tabellen.get(animation, _tabellen["stand"])


## Dauern der Schlüsselposen in Ticks (Summe = Dauer der Aktion; gehen: Zyklus).
static func dauern(animation: String) -> Array:
	var a: Array = []
	for k: Dictionary in schluessel(animation):
		a.append(int(k["dauer"]))
	return a


## Index der Schlüsselpose zur Aktionsuhr (Beginn 1): die letzte mit t ≤ uhr; danach hält die letzte.
## Gehen: Bild des Zyklus (alle 2 Ticks); stand: 0.
static func bild_index(animation: String, uhr: int) -> int:
	if animation == "gehen":
		return posmod((maxi(uhr, 1) - 1) / GEHEN_BILD_DAUER, GEHEN_BILDER)
	if animation == "stand":
		return 0
	var ks: Array = schluessel(animation)
	var idx: int = 0
	for i: int in ks.size():
		if float((ks[i] as Dictionary)["t"]) <= float(uhr):
			idx = i
	return idx


## Bildindex des Trefferbildes (erster aktiver Frame) der Kettenstufe 1 bis 4.
static func treffer_bild(stufe: int) -> int:
	return bild_index("kette%d" % stufe, KernWerte.KETTE_AKTIV_VON[stufe - 1])


## Bildindex des zweiten Trefferfensters der Kette 4 (Tritt nach der Drehung).
static func treffer_bild_zweites_fenster() -> int:
	return bild_index("kette4", KernWerte.KETTE4_ZWEITES_FENSTER_VON)


## Alle Schlüsselposen einer Animation als Absichten (Kontaktbögen, Tests).
static func posen(animation: String) -> Array:
	var a: Array = []
	for k: Dictionary in schluessel(animation):
		a.append(k["pose"])
	return a


## Pose (Absicht) zur Animation und Aktionsuhr. `smear`: Verwischbild im ersten aktiven Frame zeigen
## (nicht im Trefferstopp). Die Zeit läuft stufenlos zwischen den Schlüsselposen.
static func pose(animation: String, uhr: int, smear: bool = true) -> Dictionary:
	if animation == "gehen":
		return _gehen_pose(float(posmod(maxi(uhr, 1) - 1, GEHEN_ZYKLUS)))
	if animation == "stand":
		return _stand_pose(float(uhr))
	return pose_bei(animation, float(uhr), smear)


## Wie `pose`, bei beliebiger (Bruchteil-)Uhr; für Filme mit mehr Bildern als Ticks.
static func pose_bei(animation: String, uhr: float, smear: bool = true) -> Dictionary:
	if animation == "gehen":
		return _gehen_pose(fposmod(uhr - 1.0, float(GEHEN_ZYKLUS)))
	if animation == "stand":
		return _stand_pose(uhr)
	return _auswerten(schluessel(animation), uhr, smear)


## Länge (Ticks) des Übergangs von der vorigen Pose in die Animation; bei Kettenschlägen
## endet er im ersten aktiven Frame (das Trefferbild steht dort rein).
static func uebergang_dauer(animation: String) -> int:
	if animation.begins_with("kette"):
		return KernWerte.KETTE_AKTIV_VON[int(animation.substr(5)) - 1]
	if animation == "gehen":
		return 12
	return 12


static func _auswerten(ks: Array, uhr: float, smear: bool) -> Dictionary:
	var erste: Dictionary = ks[0]
	if uhr <= float(erste["t"]):
		return _mit_smear(erste, uhr, smear)
	for i: int in ks.size() - 1:
		var a: Dictionary = ks[i]
		var b: Dictionary = ks[i + 1]
		if uhr < float(b["t"]):
			var t0: float = float(a["t"]) + float(a["halt"])
			if uhr <= t0:
				return _mit_smear(a, uhr, smear)
			var p: float = (uhr - t0) / (float(b["t"]) - t0)
			return mischen(a["pose"], b["pose"], _ease(String(b["e"]), p), float(b["wechsel"]))
	return _mit_smear(ks[ks.size() - 1], uhr, smear)


static func _mit_smear(k: Dictionary, uhr: float, smear: bool) -> Dictionary:
	if smear and k.has("sm") and absf(uhr - float(k["t"])) < 1e-9:
		var p: Dictionary = (k["pose"] as Dictionary).duplicate()
		p.merge(k["sm"], true)
		return p
	return k["pose"]


# ---------------------------------------------------------------------------
# Mischen und Easing
# ---------------------------------------------------------------------------

## Easing (0 bis 1 → 0 bis 1): linear, ein (Anlauf langsam), schnell (stark verzögerter Anlauf),
## aus (abbremsend), klingt (abklingend), ein_aus (sanft), feder (leichtes Überschwingen).
static func _ease(name: String, t: float) -> float:
	var x: float = clampf(t, 0.0, 1.0)
	match name:
		"ein":
			return x * x
		"schnell":
			return x * x * x
		"aus":
			return 1.0 - (1.0 - x) * (1.0 - x)
		"klingt":
			var u: float = 1.0 - x
			return 1.0 - u * u * u
		"ein_aus":
			return x * x * (3.0 - 2.0 * x)
		"feder":
			var c1: float = 1.2
			var c3: float = c1 + 1.0
			var y: float = x - 1.0
			return 1.0 + c3 * y * y * y + c1 * y * y
	return x


## Öffentlich für Prüfungen und die Puppe.
static func ease(name: String, t: float) -> float:
	return _ease(name, t)


## Mischt zwei Absichten (Zahlen und Vektoren stufenlos, Tausch und Ebenen ab `wechsel`).
## Die Wende der Drehung wechselt an der schmalsten Stelle.
static func mischen(a: Dictionary, b: Dictionary, t: float, wechsel: float = 0.5) -> Dictionary:
	var r: Dictionary = {}
	for k: String in b:
		var vb: Variant = b[k]
		var va: Variant = a.get(k, vb)
		if k == "wende":
			continue
		match typeof(vb):
			TYPE_FLOAT, TYPE_INT:
				r[k] = lerpf(float(va), float(vb), t)
			TYPE_VECTOR2:
				r[k] = (va as Vector2).lerp(vb as Vector2, t)
			TYPE_VECTOR3:
				r[k] = (va as Vector3).lerp(vb as Vector3, t)
			_:
				r[k] = vb if t >= wechsel else va
	var wa: float = float(a.get("wende", 1.0))
	var wb: float = float(b.get("wende", 1.0))
	if wa == wb:
		r["wende"] = wb
	else:
		var ma: float = float(a.get("breite", 1.0))
		var mb: float = float(b.get("breite", 1.0))
		if mb < ma:
			r["wende"] = wb if t >= 1.0 else wa
		else:
			r["wende"] = wa if t <= 0.0 else wb
	return r


# ---------------------------------------------------------------------------
# Tabellen
# ---------------------------------------------------------------------------

static func _baue_tabellen() -> Dictionary:
	var t: Dictionary = {}
	t["stand"] = [_eintrag(0.0, 0, {}, _stand_pose(0.0))]
	t["gehen"] = _gehen_bilder()
	t["kette1"] = _kette1()
	t["kette2"] = _kette2()
	t["kette3"] = _kette3()
	t["kette4"] = _kette4()
	return t


static func _eintrag(zeit: float, dauer: int, opt: Dictionary, p: Dictionary) -> Dictionary:
	var d: Dictionary = {"t": zeit, "dauer": dauer, "halt": float(opt.get("halt", 0.0)), "pose": p, "e": opt.get("e", "ein_aus"), "wechsel": float(opt.get("wechsel", 0.5)), "schnapp": bool(opt.get("schnapp", false))}
	if opt.has("sm"):
		d["sm"] = opt["sm"]
	return d


## Baut die Schlüsselliste aus [dauer, pose, optionen] ab Uhr 1.
static func _zeit(roh: Array) -> Array:
	var ks: Array = []
	var t: float = 1.0
	for r: Array in roh:
		ks.append(_eintrag(t, int(r[0]), r[2], r[1]))
		t += float(r[0])
	return ks


static func _gehen_bilder() -> Array:
	var ks: Array = []
	for i: int in GEHEN_BILDER:
		ks.append(_eintrag(1.0 + float(i * GEHEN_BILD_DAUER), GEHEN_BILD_DAUER, {}, _gehen_pose(float(i * GEHEN_BILD_DAUER))))
	return ks


# ---------------------------------------------------------------------------
# Kampfhaltung und Stand (Atmen)
# ---------------------------------------------------------------------------

## Kampfhaltung wie vela_k_kampfhaltung.png: Beine gegrätscht, vordere Faust vorn auf Brusthöhe,
## hintere vor dem Kinn; die Ketten bauen darauf auf.
const KAMPF: Dictionary = {
	"x": 0.0, "y": 62.0, "bt": 0.0, "lean": 5.0, "tw": 0.0, "kopf": 0.0, "z": -25.0,
	"hv": Vector2(17, -2), "hh": Vector2(12, 4), "hwv": 0.0, "hwh": 0.0,
	"fv": Vector3(14, 0, 0), "fh": Vector3(-14, 0, 0),
	"smv": 1.0, "smh": 1.0, "breite": 1.0, "wende": 1.0,
	"t": {}, "e": {},
}


## Kurzform: Abweichungen von einer Basis (Standard: Kampfhaltung).
static func _m(abw: Dictionary, basis: Dictionary = KAMPF) -> Dictionary:
	var d: Dictionary = basis.duplicate()
	d.merge(abw, true)
	return d


static func _stand_pose(uhr: float) -> Dictionary:
	var a: float = sin(TAU * uhr / ATEM_PERIODE)
	var p: Dictionary = KAMPF.duplicate()
	p["y"] = float(p["y"]) + 0.9 * a
	p["lean"] = float(p["lean"]) + 0.7 * a
	p["hv"] = (p["hv"] as Vector2) + Vector2(0.0, 0.8 * a)
	p["hh"] = (p["hh"] as Vector2) + Vector2(0.0, 0.8 * a)
	p["kopf"] = -0.4 * a
	return p


# ---------------------------------------------------------------------------
# Gehen
# ---------------------------------------------------------------------------

## Stiefelwinkel in der Standphase (Grad), s = Ticks seit dem Aufsetzen.
static func _stand_winkel(s: float) -> float:
	var sw: float = rad_to_deg(atan2(FUSS_B.y - FUSS_A.y, FUSS_B.x - FUSS_A.x))
	if s < GEHEN_T_FERSE:
		return lerpf(GEHEN_W_AUFSETZEN, sw, _ease("aus", s / GEHEN_T_FERSE))
	if s < GEHEN_T_FLACH:
		return lerpf(sw, 0.0, _ease("ein_aus", (s - GEHEN_T_FERSE) / (GEHEN_T_FLACH - GEHEN_T_FERSE)))
	var ab: float = GEHEN_STAND - GEHEN_T_ABSTOSS
	if s < ab:
		return 0.0
	return GEHEN_W_ABSTOSS * _ease("ein_aus", (s - ab) / GEHEN_T_ABSTOSS)


## Knöchel-x des Standfußes: der Auflagepunkt (Ferse, Sohlenansatz, Spitze) ruht in der Welt, also
## wandert er im Puppenraum mit −GEHEN_V je Tick zurück; der Knöchel rollt darüber.
static func _stand_x(s: float, mitte: float) -> float:
	var sw: float = rad_to_deg(atan2(FUSS_B.y - FUSS_A.y, FUSS_B.x - FUSS_A.x))
	var w: float = _stand_winkel(s)
	var rot: float = -deg_to_rad(w)
	var s_mitte: float = (GEHEN_T_FLACH + GEHEN_STAND - GEHEN_T_ABSTOSS) * 0.5
	# x des Sohlenansatzes B zur Zeit s auf seiner Weltlinie; in der Mitte der Flachphase liegt der Knöchel bei `mitte`
	var xb0: float = mitte + (FUSS_B - FUSS_ANKEL).x + GEHEN_V * s_mitte
	var pt: Vector2 = FUSS_B
	var konst: float = 0.0
	if w > sw + 1e-9:
		pt = FUSS_A
		konst = -(FUSS_B - FUSS_A).rotated(-deg_to_rad(sw)).x
	elif w < -1e-9:
		pt = FUSS_C
		konst = (FUSS_C - FUSS_B).x
	var px: float = xb0 - GEHEN_V * s + konst
	return px - (pt - FUSS_ANKEL).rotated(rot).x


## Hermite-Kurve über q in [0, 1].
static func _hermite(p0: float, m0: float, p1: float, m1: float, q: float) -> float:
	var q2: float = q * q
	var q3: float = q2 * q
	return (2.0 * q3 - 3.0 * q2 + 1.0) * p0 + (q3 - 2.0 * q2 + q) * m0 + (-2.0 * q3 + 3.0 * q2) * p1 + (q3 - q2) * m1


## Ein Fuß im Zyklus: c = Ticks seit dem Aufsetzen dieses Fußes (0 bis Zyklus).
static func _fuss_zyklus(c: float, mitte: float) -> Vector3:
	var ts: float = GEHEN_STAND
	if c < ts:
		return Vector3(_stand_x(c, mitte), 0.0, _stand_winkel(c))
	var tw: float = float(GEHEN_ZYKLUS) - ts
	var q: float = (c - ts) / tw
	var x1: float = _stand_x(ts, mitte)
	var x2: float = _stand_x(0.0, mitte)
	# Tangenten aus dem Tempo des Knöchels am Ende der Standphase und am Anfang der nächsten
	var v1: float = (_stand_x(ts, mitte) - _stand_x(ts - 0.05, mitte)) / 0.05
	var v2: float = (_stand_x(0.05, mitte) - _stand_x(0.0, mitte)) / 0.05
	var x: float = _hermite(x1, v1 * tw * 0.6, x2, v2 * tw * 0.6, q)
	var w: float = lerpf(GEHEN_W_ABSTOSS, GEHEN_W_AUFSETZEN, _ease("ein_aus", q))
	var h: float = GEHEN_HUB * sin(PI * q)
	return Vector3(x, h, w)


## Gehpose bei u Ticks im Zyklus (0 bis Zyklus): Fuß V setzt bei u = 0 auf, Fuß H bei der Hälfte.
static func _gehen_pose(u: float) -> Dictionary:
	var zyk: float = float(GEHEN_ZYKLUS)
	var um: float = (GEHEN_T_FLACH + GEHEN_STAND - GEHEN_T_ABSTOSS) * 0.5
	var fv: Vector3 = _fuss_zyklus(u, GEHEN_MITTE_V)
	var fh: Vector3 = _fuss_zyklus(fposmod(u - zyk * 0.5, zyk), GEHEN_MITTE_H)
	# Becken hebt und senkt sich zweimal je Zyklus: oben in der Standphasenmitte jedes Fußes
	var bob: float = cos(2.0 * TAU * (u - um) / zyk)
	var sw: float = sin(TAU * u / zyk)
	var cw: float = cos(TAU * u / zyk)
	# Arme gegen die Beine: Arm V ganz hinten beim Aufsetzen des Fußes V
	var av: Vector2 = Vector2(8.0 - 11.0 * cw, 18.0 + 10.0 * cw)
	var ah: Vector2 = Vector2(8.0 + 11.0 * cw, 18.0 - 10.0 * cw)
	var tausch: Dictionary = {}
	if GEHEN_HAND_OFFEN:
		tausch = {"HandV": "hand_offen", "HandH": "hand_offen"}
	return {
		"x": 0.0 + 0.8 * bob, "y": GEHEN_Y + GEHEN_BOB * bob, "bt": 2.0 * sw, "lean": 6.5 + 1.0 * bob, "tw": 0.08 + 0.1 * sw, "kopf": 2.0 - 0.8 * bob, "z": -30.0,
		"hv": av, "hh": ah, "hwv": 0.0, "hwh": 0.0,
		"fv": fv, "fh": fh,
		"smv": 1.0, "smh": 1.0, "breite": 1.0, "wende": 1.0,
		"t": tausch, "e": {},
	}


# ---------------------------------------------------------------------------
# Kette 1 bis 4
# ---------------------------------------------------------------------------

## Kette 1 (Dauer 16, aktiv 2 bis 5): Gerade mit der vorderen Faust aus dem Ausfallschritt.
## Ausholen (1), Kontakt (2 bis 5, Verwischbild im ersten Tick), Nachschwung (7), Rückzug (12),
## Kampfhaltung (15 bis 16).
static func _kette1() -> Array:
	var ausholen: Dictionary = _m({"x": -3.0, "y": 61.0, "lean": -2.0, "kopf": -3.0, "tw": 0.3, "z": -35.0, "hv": Vector2(8, 3), "hh": Vector2(14, -1), "fv": Vector3(11, 0, 0), "fh": Vector3(-17, 0, 0)})
	var treffer: Dictionary = _m({"x": 12.0, "y": 60.0, "bt": 6.0, "lean": 22.0, "kopf": 6.0, "tw": 0.35, "z": -50.0, "hv": Vector2(35, 5), "hh": Vector2(11, 7), "fv": Vector3(32, 0, 0), "fh": Vector3(-16, 0, -14)})
	var nach: Dictionary = _m({"x": 14.0, "y": 60.0, "bt": 7.0, "lean": 26.0, "kopf": 8.0, "tw": 0.3, "z": -45.0, "hv": Vector2(33, 9), "hh": Vector2(10, 8), "fv": Vector3(33, 0, 0), "fh": Vector3(-16, 0, -14)})
	var zurueck: Dictionary = _m({"x": 5.0, "y": 62.0, "lean": 10.0, "kopf": 2.0, "tw": 0.1, "z": -35.0, "hv": Vector2(13, 1), "hh": Vector2(13, 0), "fv": Vector3(19, 0, 0), "fh": Vector3(-14, 0, -4)})
	return _zeit([
		[1, ausholen, {"e": "ein"}],
		[5, treffer, {"halt": 3.0, "e": "schnell", "schnapp": true, "sm": {"smv": 1.13, "hv": Vector2(39, 5)}}],
		[5, nach, {"e": "aus"}],
		[3, zurueck, {"e": "ein_aus"}],
		[2, _m({}), {"e": "ein_aus"}],
	])


## Kette 2 (Dauer 16, aktiv 3 bis 6): Gerade mit der hinteren Faust, Schulter und Hüfte drehen vor.
static func _kette2() -> Array:
	var ausholen: Dictionary = _m({"x": -5.0, "y": 61.0, "lean": -4.0, "kopf": -4.0, "tw": 0.45, "z": -35.0, "hv": Vector2(15, -2), "hh": Vector2(8, 4), "fv": Vector3(10, 0, 0), "fh": Vector3(-18, 0, 0)})
	var spannen: Dictionary = _m({"x": -1.0, "y": 61.0, "lean": 6.0, "kopf": 2.0, "tw": 0.5, "z": -40.0, "hv": Vector2(16, -3), "hh": Vector2(9, 5), "fv": Vector3(15, 0, 0), "fh": Vector3(-17, 0, -6), "e": ARM_H_VORN})
	var treffer: Dictionary = _m({"x": 17.0, "y": 60.0, "bt": 8.0, "lean": 28.0, "kopf": 9.0, "tw": 0.55, "z": -55.0, "hv": Vector2(13, 1), "hh": Vector2(35, 8), "fv": Vector3(34, 0, 0), "fh": Vector3(-17, 0, -20), "e": ARM_H_VORN})
	var nach: Dictionary = _m({"x": 19.0, "y": 60.0, "bt": 9.0, "lean": 31.0, "kopf": 11.0, "tw": 0.45, "z": -50.0, "hv": Vector2(13, 2), "hh": Vector2(33, 12), "fv": Vector3(35, 0, 0), "fh": Vector3(-17, 0, -20), "e": ARM_H_VORN})
	var zurueck: Dictionary = _m({"x": 5.0, "y": 62.0, "lean": 10.0, "kopf": 3.0, "tw": 0.15, "z": -35.0, "hv": Vector2(16, -2), "hh": Vector2(14, 0), "fv": Vector3(21, 0, 0), "fh": Vector3(-15, 0, -4), "e": ARM_H_VORN})
	return _zeit([
		[1, ausholen, {"e": "ein"}],
		[1, spannen, {"e": "ein", "wechsel": 0.3}],
		[6, treffer, {"halt": 3.0, "e": "schnell", "schnapp": true, "wechsel": 0.2, "sm": {"smh": 1.13, "hh": Vector2(39, 8)}}],
		[5, nach, {"e": "aus"}],
		[2, zurueck, {"e": "ein_aus"}],
		[1, _m({}), {"e": "ein_aus", "wechsel": 0.8}],
	])


## Kette 3 (Dauer 17, aktiv 4 bis 7): Aufwärtshaken mit der vorderen Faust aus der Hocke.
static func _kette3() -> Array:
	var hocke1: Dictionary = _m({"x": -2.0, "y": 57.0, "lean": 2.0, "kopf": 0.0, "tw": 0.2, "z": -30.0, "hv": Vector2(14, 13), "hh": Vector2(13, 2), "fv": Vector3(17, 0, 0), "fh": Vector3(-19, 0, 0)})
	var hocke2: Dictionary = _m({"x": -3.0, "y": 51.0, "lean": -2.0, "kopf": -3.0, "tw": 0.35, "z": -30.0, "hv": Vector2(10, 22), "hh": Vector2(13, 2), "fv": Vector3(19, 0, 0), "fh": Vector3(-22, 0, 0)})
	var treffer: Dictionary = _m({"x": 9.0, "y": 66.0, "bt": 4.0, "lean": 13.0, "kopf": 6.0, "tw": 0.3, "z": -60.0, "hv": Vector2(21, -27), "hh": Vector2(10, 9), "fv": Vector3(26, 0, 0), "fh": Vector3(-16, 0, -22)})
	var nach: Dictionary = _m({"x": 10.0, "y": 68.0, "bt": 5.0, "lean": 17.0, "kopf": 8.0, "tw": 0.3, "z": -55.0, "hv": Vector2(19, -30), "hh": Vector2(10, 9), "fv": Vector3(26, 0, 0), "fh": Vector3(-16, 0, -26)})
	var zurueck: Dictionary = _m({"x": 4.0, "y": 62.0, "lean": 9.0, "kopf": 2.0, "tw": 0.1, "z": -35.0, "hv": Vector2(20, -8), "hh": Vector2(13, 0), "fv": Vector3(20, 0, 0), "fh": Vector3(-15, 0, -5)})
	return _zeit([
		[1, hocke1, {"e": "ein_aus"}],
		[2, hocke2, {"e": "ein_aus"}],
		[7, treffer, {"halt": 3.0, "e": "schnell", "schnapp": true, "sm": {"smv": 1.12, "hv": Vector2(22, -33)}}],
		[4, nach, {"e": "aus"}],
		[2, zurueck, {"e": "ein_aus"}],
		[1, _m({}), {"e": "ein_aus"}],
	])


## Stiefel-Ziel aus dem Knöchel: Vector3(x, h, w) mit h = Knöchelhöhe − Tiefe der Sohle unter dem Knöchel bei w.
static func _kn(x: float, knoechel_hoehe: float, w: float) -> Vector3:
	return Vector3(x, knoechel_hoehe - _sohle_tief(w), w)


static func _sohle_tief(w: float) -> float:
	if _huelle_fuss.is_empty():
		var bild: Image = DarstellungVelaPuppe.lade_png("res://grafik/vela/stiefel_seite.png")
		bild.convert(Image.FORMAT_RGBA8)
		_huelle_fuss = DarstellungVelaPuppe._huelle(bild)
	var xf: Transform2D = Transform2D(-deg_to_rad(w), Vector2.ZERO)
	var tiefster: float = -INF
	for q: Vector2 in _huelle_fuss:
		tiefster = maxf(tiefster, (xf * (q - FUSS_ANKEL)).y)
	return tiefster


## Kette 4 (Dauer 25, aktiv 3 bis 6 und 17 bis 20): Abschlusstritt mit dem vorderen Bein, Drehung
## (Rücken, Blick nach hinten, Vorderseite), zweiter Tritt, Landung. Die Drehung staucht die Puppe quer.
static func _kette4() -> Array:
	var heben: Dictionary = _m({"x": -2.0, "y": 63.0, "lean": -3.0, "kopf": -2.0, "z": -35.0, "hv": Vector2(16, -1), "hh": Vector2(12, 3), "fv": _kn(21, 25, 15), "fh": Vector3(-8, 0, 0), "e": BEIN_V_VORN})
	var knie: Dictionary = _m({"x": -2.0, "y": 63.0, "lean": -6.0, "kopf": -4.0, "z": -40.0, "hv": Vector2(15, 1), "hh": Vector2(12, 3), "fv": _kn(31, 38, 32), "fh": Vector3(-6, 0, 0), "e": BEIN_V_VORN})
	var tritt: Dictionary = _m({"x": 4.0, "y": 59.0, "bt": -4.0, "lean": -22.0, "kopf": -8.0, "tw": 0.1, "z": -30.0, "hv": Vector2(14, 5), "hh": Vector2(7, 10), "fv": _kn(44, 48, 78), "fh": Vector3(-4, 0, 0), "e": BEIN_V_VORN})
	var zurueck: Dictionary = _m({"x": 1.0, "y": 61.0, "lean": -8.0, "kopf": -5.0, "z": -40.0, "hv": Vector2(15, 6), "hh": Vector2(12, 7), "fv": _kn(22, 28, 20), "fh": Vector3(-5, 0, 0), "e": BEIN_V_VORN})
	var ruecken: Dictionary = _m({"x": 0.0, "y": 60.5, "lean": 0.0, "kopf": 0.0, "z": -25.0, "breite": 0.55, "hv": Vector2(16, 6), "hh": Vector2(16, 6), "fv": Vector3(15, 4, 8), "fh": Vector3(-6, 0, 0), "t": {"FussV": "stiefel_vorn"}, "e": ARM_H_VORN})
	var hinten: Dictionary = _m({"x": 0.0, "y": 60.5, "lean": 0.0, "kopf": 0.0, "z": -35.0, "breite": 1.0, "wende": -1.0, "hv": Vector2(16, 6), "hh": Vector2(16, 6), "fv": Vector3(15, 4, 8), "fh": Vector3(-8, 0, 0), "t": {}, "e": {}})
	var ruecken2: Dictionary = _m({"wende": 1.0, "x": 0.0, "y": 60.5, "z": -25.0, "breite": 0.55, "hv": Vector2(16, 6), "hh": Vector2(16, 6), "fv": Vector3(15, 4, 8), "fh": Vector3(-6, 0, 0), "t": {"FussV": "stiefel_vorn"}, "e": ARM_H_VORN})
	var knie2: Dictionary = _m({"z": -50.0, "x": -2.0, "y": 63.0, "lean": -6.0, "kopf": -4.0, "hv": Vector2(14, 8), "hh": Vector2(10, 10), "fv": _kn(32, 42, 35), "fh": Vector3(-6, 0, 0), "e": BEIN_V_VORN})
	var halb: Dictionary = _m({"z": -45.0, "x": 1.0, "y": 63.0, "lean": -14.0, "kopf": -6.0, "hv": Vector2(14, 6), "hh": Vector2(8, 10), "fv": _kn(40, 43, 52), "fh": Vector3(-5, 0, 0), "e": BEIN_V_VORN})
	var tritt2: Dictionary = _m({"z": -50.0, "x": 5.0, "y": 59.0, "bt": -5.0, "lean": -26.0, "kopf": -10.0, "tw": 0.1, "hv": Vector2(14, 5), "hh": Vector2(7, 10), "fv": _kn(45, 50, 85), "fh": Vector3(-4, 0, 0), "e": BEIN_V_VORN})
	var landung1: Dictionary = _m({"x": 2.0, "y": 61.0, "lean": 0.0, "kopf": -3.0, "z": -55.0, "hv": Vector2(16, 3), "hh": Vector2(10, 7), "fv": _kn(27, 29, 24), "fh": Vector3(-6, 0, 0), "e": BEIN_V_VORN})
	var landung2: Dictionary = _m({"x": -1.0, "y": 61.0, "lean": 3.0, "kopf": -1.0, "z": -42.0, "fv": Vector3(15, 0, 0), "fh": Vector3(-15, 0, 0)})
	return _zeit([
		[1, heben, {"e": "ein_aus"}],
		[1, knie, {"e": "ein_aus"}],
		[6, tritt, {"halt": 3.0, "e": "schnell", "schnapp": true}],
		[1, zurueck, {"e": "ein_aus"}],
		[2, ruecken, {"e": "ein_aus", "wechsel": 0.5}],
		[2, hinten, {"e": "ein_aus", "wechsel": 0.7}],
		[2, ruecken2, {"e": "ein_aus", "wechsel": 0.3}],
		[1, halb, {"e": "ein_aus", "wechsel": 0.5}],
		[5, tritt2, {"halt": 3.0, "e": "schnell"}],
		[2, landung1, {"e": "ein_aus"}],
		[2, landung2, {"e": "linear"}],
	])

