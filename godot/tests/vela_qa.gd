## Das „Tor“ für die Bewegung der Vela-Puppe (Nachbesserung Flüssigkeit): Messgrößen mit festen
## Grenzen, die den Lauf scheitern lassen. Vorbild ist das Prüfskript „qa_hero“ des Artikels über
## GRAYFALL (eine Zeile je Animation, feste Schwellen). Läuft ohne Fenster:
##   godot --headless --path godot --script res://tests/alle.gd
## `VelaQa.lauf()` liefert {"geprueft": n, "fehler": [..]}, `VelaQa.bericht()` eine Zeile je Animation.
##
## Messgrößen (Grenzen unten als Konstanten):
##  (a) Fußrutschen beim Gehen: größte Weltbewegung eines Auflagepunkts des Stiefels zwischen zwei
##      Ticks, die Figur läuft mit 3,5 Bildpixeln je Tick; ideal (aus der Lösung) und wie gezeichnet
##      (Teile auf ganzen Bildpixeln).
##  (b) Glätte: größte Winkeländerung eines Gelenks zwischen zwei Ticks (Gehen, Stand ≤ 12°; Angriffe ≤ 35°,
##      ausgenommen der als Schnappframe markierte Sprung in das Trefferbild, höchstens einer je Angriff).
##  (c) Angriffe: ≥ 5 Schlüsselposen; Trefferbild im ersten aktiven Frame bis zum letzten gehalten.
##  (d) Sohle: tiefster Stiefelpunkt jedes Standfußes auf y = 0 (± 0,5).
##  (e) Gelenkspalt: Abstand der Ansatzpunkte benachbarter Teile ≤ 2 Bildpixel.
##  (f) Feder: der Zopf klingt nach einem Stoß binnen 60 Ticks auf unter 3° ab, bleibt endlich.
##  (g) Determinismus: dieselbe Frame-Folge zweimal ergibt bitgleiche Posen; Pause ändert nichts.
class_name VelaQa
extends RefCounted

const GRENZE_RUTSCHEN: float = 1.0
const GRENZE_GLATT_GEHEN: float = 12.0
const GRENZE_GLATT_ANGRIFF: float = 35.0
const GRENZE_SOHLE: float = 0.5
const GRENZE_SPALT: float = 2.0
const GRENZE_FEDER: float = 3.0
const GRENZE_UEBERGANG_GEHEN: float = 20.0
const GRENZE_UEBERGANG_ANGRIFF: float = 55.0
const FEDER_TICKS: int = 60
const MIN_POSEN: int = 5
## Bodenkontakt eines Hüllpunkts: höchstens so hoch über dem Boden (px)
const KONTAKT_HOEHE: float = 0.75
const TOLERANZ: float = 1e-6

var _geprueft: int = 0
var _fehler: Array[String] = []
var _zeilen: Array[String] = []
var _puppe: DarstellungVelaPuppe = null


static func lauf() -> Dictionary:
	var q: VelaQa = VelaQa.new()
	q._alles()
	return {"geprueft": q._geprueft, "fehler": q._fehler}


static func bericht() -> String:
	var q: VelaQa = VelaQa.new()
	q._alles()
	var kopf: String = "Vela-Bewegung, Messwerte gegen Grenzen (%d Prüfungen, %d Fehler)" % [q._geprueft, q._fehler.size()]
	var z: Array[String] = [kopf]
	z.append_array(q._zeilen)
	for f: String in q._fehler:
		z.append("FEHLER " + f)
	return "\n".join(z)


func _ok(bedingung: bool, name: String) -> void:
	_geprueft += 1
	if not bedingung:
		_fehler.append(name)


func _alles() -> void:
	_puppe = DarstellungVelaPuppe.new()
	_ok(_puppe.geladen, "QA: Puppe geladen")
	if not _puppe.geladen:
		return
	for anim: String in DarstellungVelaPosen.animationen():
		_animation(anim)
	_feder()
	_determinismus()
	_uebergaenge()
	_puppe.free()


# ---------------------------------------------------------------------------
# Hilfen
# ---------------------------------------------------------------------------

## Längste Uhr, die für die Animation abgetastet wird.
func _ende(anim: String) -> int:
	match anim:
		"stand":
			return int(DarstellungVelaPosen.ATEM_PERIODE) * 2
		"gehen":
			return DarstellungVelaPosen.GEHEN_ZYKLUS * 2 + 1
		"kette1":
			return KernWerte.LEERSCHLAG_DAUER + 2
		"kette2":
			return KernWerte.KETTE2_LEER_DAUER + 2
		"kette3":
			return KernWerte.KETTE3_LEER_DAUER + 2
	return KernWerte.KETTE4_DAUER + 2


func _winkel() -> Dictionary:
	return _puppe.aktuelle_pose()["winkel"]


## Größte Winkeländerung (Grad) zwischen zwei Winkelsätzen, mit Bone.
func _delta(a: Dictionary, b: Dictionary) -> Array:
	var gr: float = 0.0
	var wer: String = ""
	for bone: String in DarstellungVelaPuppe.BONES:
		var d: float = absf(rad_to_deg(angle_difference(deg_to_rad(float(a[bone])), deg_to_rad(float(b[bone])))))
		if d > gr:
			gr = d
			wer = bone
	return [gr, wer]


func _endlich(w: Dictionary) -> bool:
	for bone: String in DarstellungVelaPuppe.BONES:
		if is_nan(float(w[bone])) or is_inf(float(w[bone])):
			return false
	return true


func _punkt_endlich(v: Vector2) -> bool:
	return not (is_nan(v.x) or is_nan(v.y) or is_inf(v.x) or is_inf(v.y))


# ---------------------------------------------------------------------------
# Je Animation
# ---------------------------------------------------------------------------

func _animation(anim: String) -> void:
	var ende: int = _ende(anim)
	var grenze_glatt: float = GRENZE_GLATT_ANGRIFF if anim.begins_with("kette") else GRENZE_GLATT_GEHEN
	# Tickpaare, die als Schnappframe ausgenommen sind: (t − 1, t) vor einem als schnapp markierten Schlüssel
	var schnapp_ticks: Array[int] = []
	var ks: Array = DarstellungVelaPosen.schluessel(anim)
	for k: Dictionary in ks:
		if bool(k["schnapp"]):
			schnapp_ticks.append(int(k["t"]))
	if anim.begins_with("kette"):
		_ok(schnapp_ticks.size() <= 1, "QA %s: höchstens ein Schnappframe je Angriff (%d)" % [anim, schnapp_ticks.size()])
	var vorher: Dictionary = {}
	var glatt_max: float = 0.0
	var glatt_wo: String = ""
	var glatt_roh: float = 0.0
	var sohle_max: float = 0.0
	var spalt_max: float = 0.0
	var ohne_stand: int = 0
	var rutsch_ideal: float = 0.0
	var rutsch_bild: float = 0.0
	var kontakt_alt: Dictionary = {}
	var kontakt_alt_g: Dictionary = {}
	var ok_endlich: bool = true
	var n_pose: int = 0
	for uhr: int in range(1, ende + 1):
		_puppe.aus_animation(anim, uhr, 1)
		var w: Dictionary = _winkel()
		ok_endlich = ok_endlich and _endlich(w)
		n_pose += 1
		# (b)
		if not vorher.is_empty():
			var d: Array = _delta(vorher, w)
			glatt_roh = maxf(glatt_roh, float(d[0]))
			if not schnapp_ticks.has(uhr):
				if float(d[0]) > glatt_max:
					glatt_max = float(d[0])
					glatt_wo = "%s uhr %d" % [d[1], uhr]
		vorher = w.duplicate()
		# (d) Standfüße: Absicht h ≤ 0,5
		var p: Dictionary = _puppe.aktuelle_pose()["intent"]
		var stand_fuesse: int = 0
		for seite: String in ["V", "H"]:
			var fz: Vector3 = p["fv" if seite == "V" else "fh"]
			if fz.y <= DarstellungVelaPuppe.BODEN_HOEHE:
				stand_fuesse += 1
				var tiefster: float = -INF
				for q: Vector2 in _puppe.fuss_huelle("Fuss" + seite):
					tiefster = maxf(tiefster, q.y)
				sohle_max = maxf(sohle_max, absf(tiefster))
		if stand_fuesse == 0:
			ohne_stand += 1
		# (e)
		for bone: String in DarstellungVelaPuppe.BONES:
			spalt_max = maxf(spalt_max, _puppe.gelenk_spalt(bone))
		# (a) nur Gehen
		if anim == "gehen":
			var welt_x: float = DarstellungVelaPosen.GEHEN_V * float(uhr)
			for seite: String in ["V", "H"]:
				for gezeichnet: bool in [false, true]:
					var h: PackedVector2Array = _puppe.fuss_huelle("Fuss" + seite, gezeichnet)
					var alt: Dictionary = kontakt_alt_g if gezeichnet else kontakt_alt
					var neu: Dictionary = {}
					for i: int in h.size():
						var wx: float = h[i].x + welt_x
						if h[i].y > -KONTAKT_HOEHE:
							neu[seite + str(i)] = wx
							if alt.has(seite + str(i)):
								var dx: float = absf(wx - float(alt[seite + str(i)]))
								if gezeichnet:
									rutsch_bild = maxf(rutsch_bild, dx)
								else:
									rutsch_ideal = maxf(rutsch_ideal, dx)
					if gezeichnet:
						kontakt_alt_g = _mit(kontakt_alt_g, neu, seite)
					else:
						kontakt_alt = _mit(kontakt_alt, neu, seite)
	_ok(ok_endlich, "QA %s: alle Winkel endlich" % anim)
	_ok(glatt_max <= grenze_glatt, "QA %s: Glätte %.2f° > %.0f° (%s)" % [anim, glatt_max, grenze_glatt, glatt_wo])
	_ok(sohle_max <= GRENZE_SOHLE, "QA %s: Sohle weicht %.3f px vom Boden ab (> %.1f)" % [anim, sohle_max, GRENZE_SOHLE])
	_ok(ohne_stand == 0, "QA %s: %d Posen ohne Standfuß" % [anim, ohne_stand])
	_ok(spalt_max <= GRENZE_SPALT, "QA %s: Gelenkspalt %.2f px > %.1f" % [anim, spalt_max, GRENZE_SPALT])
	var zeile: String = "%-7s Glätte %5.2f° (≤%2.0f)%s | Sohle %.3f (≤%.1f) | Spalt %.2f (≤%.1f)" % [anim, glatt_max, grenze_glatt, " [roh %5.1f°]" % glatt_roh if anim.begins_with("kette") else "", sohle_max, GRENZE_SOHLE, spalt_max, GRENZE_SPALT]
	if anim == "gehen":
		_ok(rutsch_ideal <= GRENZE_RUTSCHEN + TOLERANZ, "QA gehen: Fußrutschen (ideal) %.3f px > %.1f" % [rutsch_ideal, GRENZE_RUTSCHEN])
		_ok(rutsch_bild <= GRENZE_RUTSCHEN + TOLERANZ, "QA gehen: Fußrutschen (gezeichnet) %.3f px > %.1f" % [rutsch_bild, GRENZE_RUTSCHEN])
		zeile += " | Rutschen ideal %.3f, gezeichnet %.3f (≤%.1f) | Zyklus %d, Schritt %.1f px, Stand %.1f Ticks" % [rutsch_ideal, rutsch_bild, GRENZE_RUTSCHEN, DarstellungVelaPosen.GEHEN_ZYKLUS, DarstellungVelaPosen.GEHEN_V * float(DarstellungVelaPosen.GEHEN_ZYKLUS) * 0.5, DarstellungVelaPosen.GEHEN_STAND]
	if anim.begins_with("kette"):
		zeile += " | " + _angriff(anim, ks)
	_zeilen.append(zeile)


## Hilfsmittel: Kontakte einer Seite ersetzen (die andere Seite bleibt).
func _mit(alt: Dictionary, neu: Dictionary, seite: String) -> Dictionary:
	var r: Dictionary = {}
	for k: String in alt:
		if not k.begins_with(seite):
			r[k] = alt[k]
	r.merge(neu, true)
	return r


## (c) Posenzahl und Trefferbild; Rückgabe: Kurzbericht
func _angriff(anim: String, ks: Array) -> String:
	var stufe: int = int(anim.substr(5))
	_ok(ks.size() >= MIN_POSEN, "QA %s: %d Schlüsselposen (< %d)" % [anim, ks.size(), MIN_POSEN])
	var dauer: int = 0
	for k: Dictionary in ks:
		dauer += int(k["dauer"])
	var soll: int = KernWerte.KETTE4_DAUER if stufe == 4 else (KernWerte.LEERSCHLAG_DAUER if stufe == 1 else (KernWerte.KETTE2_LEER_DAUER if stufe == 2 else KernWerte.KETTE3_LEER_DAUER))
	_ok(dauer == soll, "QA %s: Summe der Dauern %d, Logik %d" % [anim, dauer, soll])
	var fenster: Array = [[KernWerte.KETTE_AKTIV_VON[stufe - 1], KernWerte.KETTE_AKTIV_BIS[stufe - 1]]]
	if stufe == 4:
		fenster.append([KernWerte.KETTE4_ZWEITES_FENSTER_VON, KernWerte.KETTE4_ZWEITES_FENSTER_BIS])
	var gehalten: bool = true
	for fe: Array in fenster:
		var von: int = fe[0]
		var bis: int = fe[1]
		var treffer: Dictionary = DarstellungVelaPosen.pose_bei(anim, float(von), false)
		var erster: bool = DarstellungVelaPosen.bild_index(anim, von) != DarstellungVelaPosen.bild_index(anim, von - 1)
		_ok(erster, "QA %s: Trefferbild beginnt im ersten aktiven Frame %d" % [anim, von])
		_ok(DarstellungVelaPosen.pose_bei(anim, float(von - 1), false) != treffer, "QA %s: Pose vor dem ersten aktiven Frame %d ist anders" % [anim, von])
		for u: int in range(von, bis + 1):
			var gleich: bool = DarstellungVelaPosen.pose_bei(anim, float(u), false) == treffer
			gehalten = gehalten and gleich
			_ok(gleich, "QA %s: Trefferbild hält in uhr %d" % [anim, u])
	var smear: int = 0
	for k: Dictionary in ks:
		if k.has("sm"):
			smear += 1
	return "Posen %d (≥%d), Dauer %d = Logik, Treffer %s, Schnappframes %d, Verwischbilder %d" % [ks.size(), MIN_POSEN, dauer, "gehalten" if gehalten else "NICHT gehalten", _schnapp_zahl(ks), smear]


func _schnapp_zahl(ks: Array) -> int:
	var n: int = 0
	for k: Dictionary in ks:
		if bool(k["schnapp"]):
			n += 1
	return n


# ---------------------------------------------------------------------------
# (f) Feder
# ---------------------------------------------------------------------------

func _feder() -> void:
	var p: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	p.aus_animation("stand", 1, 1)
	var ruhe: float = p.zopf_ruhe_grad()
	var worst: float = 0.0
	var endlich: bool = true
	var zeile: String = "feder   "
	# (1) Auslenkung um 70° und loslassen
	for stoss: float in [70.0, -70.0, 30.0]:
		p.zopf_setze_grad(ruhe + stoss)
		for i: int in FEDER_TICKS:
			p.feder_schritt(0.0, 0.0, 0.0, deg_to_rad(ruhe))
			endlich = endlich and not is_nan(p.zopf_welt_grad()) and not is_inf(p.zopf_welt_grad())
		var rest: float = absf(p.zopf_welt_grad() - ruhe)
		worst = maxf(worst, rest)
	zeile += "Rest nach %d Ticks (70°-Stoß) %.2f° (<%.0f)" % [FEDER_TICKS, worst, GRENZE_FEDER]
	_ok(worst < GRENZE_FEDER, "QA Feder: Zopf klingt nicht ab (%.2f° nach %d Ticks)" % [worst, FEDER_TICKS])
	# (2) Beschleunigungsstoß (Richtungswechsel): ein Tick mit ax = 8
	p.zopf_setze_grad(ruhe)
	p.feder_schritt(8.0, 0.0, 0.0, deg_to_rad(ruhe))
	var spitze: float = 0.0
	for i: int in FEDER_TICKS:
		p.feder_schritt(0.0, 0.0, 0.0, deg_to_rad(ruhe))
		spitze = maxf(spitze, absf(p.zopf_welt_grad() - ruhe))
		endlich = endlich and not is_nan(p.zopf_welt_grad())
	var rest2: float = absf(p.zopf_welt_grad() - ruhe)
	_ok(rest2 < GRENZE_FEDER, "QA Feder: nach Beschleunigungsstoß %.2f° nach %d Ticks" % [rest2, FEDER_TICKS])
	_ok(spitze > 2.0, "QA Feder: Beschleunigungsstoß bewegt den Zopf (%.2f°)" % spitze)
	# (3) wilde Anregung, danach Ruhe
	var groesst: float = 0.0
	for i: int in 400:
		var a: float = 6.0 if (i / 3) % 2 == 0 else -6.0
		p.feder_schritt(a, a * 0.5, a * 1.3, deg_to_rad(ruhe), 1.0 if (i / 50) % 2 == 0 else -1.0)
		groesst = maxf(groesst, absf(p.zopf_welt_grad()))
		endlich = endlich and not is_nan(p.zopf_welt_grad())
	for i: int in FEDER_TICKS:
		p.feder_schritt(0.0, 0.0, 0.0, deg_to_rad(ruhe))
	var rest3: float = absf(p.zopf_welt_grad() - ruhe)
	_ok(endlich, "QA Feder: Zopfwinkel endlich")
	_ok(groesst < 180.0, "QA Feder: Zopf explodiert nicht (%.0f°)" % groesst)
	_ok(rest3 < GRENZE_FEDER, "QA Feder: nach wilder Anregung %.2f° nach %d Ticks" % [rest3, FEDER_TICKS])
	zeile += " | Beschleunigungsstoß: Spitze %.1f°, Rest %.2f° | wilde Anregung: größter Ausschlag %.0f° (<180), Rest %.2f°" % [spitze, rest2, groesst, rest3]
	_zeilen.append(zeile)
	p.free()


# ---------------------------------------------------------------------------
# Frame-Folgen: Determinismus, Pause, Übergänge
# ---------------------------------------------------------------------------

## Eine Folge von Bildern: {"anim","uhr","blick","x","stopp"} je Tick (ein Frame pro Eintrag).
func _folge() -> Array:
	var f: Array = []
	var x: float = 0.0
	for u: int in range(1, 31):
		f.append({"anim": "stand", "uhr": u, "blick": 1, "x": x, "stopp": 0})
	for u: int in range(1, 61):
		x += DarstellungVelaPosen.GEHEN_V
		f.append({"anim": "gehen", "uhr": u, "blick": 1, "x": x, "stopp": 0})
	for u: int in range(1, 21):
		f.append({"anim": "stand", "uhr": u, "blick": 1, "x": x, "stopp": 0})
	# Kette 1 mit Trefferstopp im ersten aktiven Frame, danach Kette 2, 3, 4 verkettet
	for u: int in range(1, 15):
		f.append({"anim": "kette1", "uhr": u, "blick": 1, "x": x, "stopp": 0})
		if u == 2:
			for i: int in 7:
				f.append({"anim": "kette1", "uhr": 2, "blick": 1, "x": x, "stopp": 7 - i})
	for u: int in range(1, 14):
		f.append({"anim": "kette2", "uhr": u, "blick": 1, "x": x, "stopp": 0})
	for u: int in range(1, 15):
		f.append({"anim": "kette3", "uhr": u, "blick": 1, "x": x, "stopp": 0})
	for u: int in range(1, 26):
		f.append({"anim": "kette4", "uhr": u, "blick": 1, "x": x, "stopp": 0})
	# Richtungswechsel im Gehen: nach links
	for u: int in range(1, 31):
		x -= DarstellungVelaPosen.GEHEN_V
		f.append({"anim": "gehen", "uhr": u, "blick": -1, "x": x, "stopp": 0})
	for u: int in range(1, 41):
		f.append({"anim": "stand", "uhr": u, "blick": -1, "x": x, "stopp": 0})
	return f


## Spielt die Folge, hängt nach jedem Bild einen Abdruck der Pose an `aus` (Array) und gibt die Winkel zurück.
func _spiele(folge: Array, p: DarstellungVelaPuppe, pausen: bool, aus: Array) -> void:
	var frame: int = 100
	for e: Dictionary in folge:
		frame += 1
		p.schritt(e["anim"], e["uhr"], e["blick"], frame, e["x"], e["stopp"])
		aus.append(_abdruck(p))
		if pausen:
			# Pause: dasselbe Bild mehrmals, nichts darf sich ändern
			p.schritt(e["anim"], e["uhr"], e["blick"], frame, e["x"], e["stopp"])
			p.schritt(e["anim"], e["uhr"], e["blick"], frame, e["x"], e["stopp"])


func _abdruck(p: DarstellungVelaPuppe) -> Array:
	var a: Array = []
	for b: String in DarstellungVelaPuppe.BONES:
		a.append(p.bone_ort(b))
		a.append(p.bone_drehung(b))
		a.append(p.bone_ort_gezeichnet(b))
	a.append(p.scale.x)
	a.append(p.zopf_welt_grad())
	return a


func _determinismus() -> void:
	var folge: Array = _folge()
	var p1: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var p2: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var p3: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var a1: Array = []
	var a2: Array = []
	var a3: Array = []
	_spiele(folge, p1, false, a1)
	_spiele(folge, p2, false, a2)
	_spiele(folge, p3, true, a3)
	var gleich: bool = a1.size() == a2.size()
	var pause_gleich: bool = a1.size() == a3.size()
	for i: int in mini(a1.size(), a2.size()):
		gleich = gleich and a1[i] == a2[i]
	for i: int in mini(a1.size(), a3.size()):
		pause_gleich = pause_gleich and a1[i] == a3[i]
	_ok(gleich, "QA Determinismus: dieselbe Frame-Folge ergibt dieselbe Pose (bitgleich)")
	_ok(pause_gleich, "QA Pause: gleiches Bild mehrfach ändert Pose und Federn nicht")
	# Sprünge um mehrere Frames: höchstens FEDER_SCHRITTE_MAX Schritte, sonst gleiche Folge → gleiche Pose
	var p4: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var p5: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var s4: Array = []
	var s5: Array = []
	for i: int in 40:
		p4.schritt("gehen", 1 + i * 3, 1, 100 + i * 3, 10.0 * i, 0)
		p5.schritt("gehen", 1 + i * 3, 1, 100 + i * 3, 10.0 * i, 0)
		s4.append(_abdruck(p4))
		s5.append(_abdruck(p5))
	var spruenge: bool = s4 == s5
	var endlich: bool = true
	for a: Array in s4:
		for v: Variant in a:
			if typeof(v) == TYPE_FLOAT:
				endlich = endlich and not is_nan(v)
			elif typeof(v) == TYPE_VECTOR2:
				endlich = endlich and _punkt_endlich(v)
	_ok(spruenge, "QA Determinismus: Sprünge über mehrere Frames")
	_ok(endlich, "QA: Sprünge über mehrere Frames bleiben endlich")
	p1.free()
	p2.free()
	p3.free()
	p4.free()
	p5.free()
	_zeilen.append("folge   Determinismus bitgleich: %s | Pause ohne Änderung: %s | Mehrfach-Sprünge: %s (%d Bilder)" % ["ja" if gleich else "NEIN", "ja" if pause_gleich else "NEIN", "ja" if spruenge else "NEIN", a1.size()])


## Größte Winkeländerung je Tick über die ganze Folge (mit Übergängen, Federn, Trefferstopp) je Strecke.
func _uebergaenge() -> void:
	var folge: Array = _folge()
	var p: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var frame: int = 100
	var vor: Dictionary = {}
	var gr: Dictionary = {}
	var orte: Dictionary = {}
	var vor_anim: String = ""
	for e: Dictionary in folge:
		frame += 1
		p.schritt(e["anim"], e["uhr"], e["blick"], frame, e["x"], e["stopp"])
		var w: Dictionary = p.aktuelle_pose()["winkel"].duplicate()
		w.erase("Zopf")
		var ke: String = "%s→%s" % [vor_anim, e["anim"]] if vor_anim != e["anim"] else String(e["anim"])
		var ausnahme: bool = false
		for k: Dictionary in DarstellungVelaPosen.schluessel(e["anim"]) if String(e["anim"]).begins_with("kette") else []:
			if bool(k["schnapp"]) and int(k["t"]) == int(e["uhr"]):
				ausnahme = true
		if not vor.is_empty() and not ausnahme:
			var bones_ohne: Dictionary = vor
			var d: float = 0.0
			var wer: String = ""
			for bone: String in w:
				var dd: float = absf(rad_to_deg(angle_difference(deg_to_rad(float(bones_ohne[bone])), deg_to_rad(float(w[bone])))))
				if dd > d:
					d = dd
					wer = bone
			if d > float(gr.get(ke, 0.0)):
				gr[ke] = d
				orte[ke] = "%s uhr %d" % [wer, e["uhr"]]
		vor = w
		vor_anim = e["anim"]
	var teile: Array[String] = []
	for k: String in gr:
		teile.append("%s %.0f° (%s)" % [k, gr[k], orte[k]])
	_zeilen.append("folge   größte Winkeländerung je Tick mit Übergängen und Federn (Zopf ausgenommen): " + ", ".join(teile))
	for k: String in gr:
		var grenze: float = GRENZE_UEBERGANG_ANGRIFF if k.contains("kette") else GRENZE_UEBERGANG_GEHEN
		_ok(float(gr[k]) <= grenze, "QA Folge: %s %.1f° > %.0f° (%s)" % [k, gr[k], grenze, orte[k]])
	p.free()
