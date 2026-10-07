## Vela als Cutout-Puppe aus echten Bildteilen (Auftrag 6, Phase 2; Auftrag 5, 2c),
## Bewegung nach „Absichten“ statt Winkellisten (Nachbesserung Flüssigkeit).
##
## Baut zur Laufzeit ein `Skeleton2D` mit einer `Bone2D`-Hierarchie
## (Becken → Rumpf → Kopf → Zopf; Rumpf → Oberarm → Unterarm → Hand;
## Becken → Oberschenkel → Unterschenkel → Fuß, je vorn V und hinten H) und je
## Teilbild ein `Sprite2D`. Die Teilbilder, Gelenke und Drehpunkte stehen in
## `res://grafik/vela/teile.txt` (erzeugt von `werkzeuge/umsetzer.gd`), die Absichten
## (Posen) und ihre Zeitläufe in `DarstellungVelaPosen`.
##
## Pose = Absicht (siehe DarstellungVelaPosen): Becken (Lage, Höhe, Neigung), Rumpf
## (Neigung, Stauchung), Kopfwinkel, Zielpunkte von Hand (zur Schulter) und Fuß (zum
## Boden), Teiltausch. Die Puppe löst daraus die Winkel: ein Zwei-Segment-IK-Löser setzt
## Ellbogen (nach unten/hinten) und Knie (nach vorn); alle Winkel sind stufenlos. Die
## Höhe des Beckens wird so begrenzt, dass die Standbeine ihr Ziel erreichen (Sohle auf
## y = 0, nie ein Bein über seine Länge hinaus).
##
## Federn (Zopf, Kopf leicht) und der Übergang zwischen Animationen leben im Knoten:
## `aus_figur` ruft `schritt`, und `schritt` rechnet nur dann einen Schritt weiter, wenn
## sich `welt.frame` ändert (bei Sprüngen bis zu FEDER_SCHRITTE_MAX Schritte nachholen,
## in der Pause nichts). Gleiche Folge von Frames ergibt gleiche Pose (nur 64-Bit-Zahlen).
##
## Einhängen in die Szene:
## - Ursprung des Nodes = Fußpunkt der Figur in Bildpixeln (2×): `position` ist
##   Spielposition × 2 (die Höhe `h` der Logik abziehen). Die Sohle der Standbeine liegt
##   in jeder Pose auf y = 0.
## - Maßstab 1: ein Texturpixel ist ein Bildpixel. Nicht skalieren.
## - Blick links spiegelt die ganze Puppe (`scale.x = -1`, setzt `aus_figur` selbst).
## - Die Teile liegen auf ganzen Bildpixeln (Pixel-Snap der Positionen, nicht der Drehung,
##   RASTER), damit nichts flimmert.
## - Zeichenreihenfolge innerhalb der Puppe über `z_index` der Sprites, relativ zum Node
##   (0 bis EBENEN_BREITE - 1). Sortiert die Szene über `z_index`, muss der Abstand
##   zwischen zwei Puppen oder Figuren mindestens EBENEN_BREITE betragen
##   (`z_index` der Puppe = Rang × EBENEN_BREITE).
## - Die Puppe liest den Kern nur (`aus_figur`), sie ändert nichts an der Welt.
class_name DarstellungVelaPuppe
extends Node2D

const ORDNER: String = "res://grafik/vela/"
const TEILE_DATEI: String = "teile.txt"
## Breite des z_index-Bereichs, den die Puppe belegt.
const EBENEN_BREITE: int = 24
## Teile auf ganze Bildpixel setzen (Position, nicht Drehung).
const RASTER: bool = true
## Höchstens so viele Federschritte je aufgerufenem Bild nachholen.
const FEDER_SCHRITTE_MAX: int = 4
## Anteil der Beinlänge, bis zu dem das Standbein gestreckt werden darf.
const BEIN_REICHWEITE: float = 0.965
## Kürzester Abstand der Standbeinziele zum Boden gilt als Bodenkontakt bis zu dieser Höhe (px).
const BODEN_HOEHE: float = 0.5

## Bones in Reihenfolge Eltern vor Kindern.
const BONES: Array[String] = [
	"Becken", "Rumpf", "Kopf", "Zopf",
	"OberarmH", "UnterarmH", "HandH",
	"OberschenkelH", "UnterschenkelH", "FussH",
	"OberschenkelV", "UnterschenkelV", "FussV",
	"OberarmV", "UnterarmV", "HandV",
]

## Ein Teilbild: Textur, Maße, konvexe Hülle der deckenden Pixel (für den Bodenkontakt).
class Teil:
	var name: String = ""
	var breite: int = 0
	var hoehe: int = 0
	var textur: ImageTexture = null
	var bild: Image = null
	## konvexe Hülle der deckenden Pixelränder in Bildkoordinaten
	var huelle: PackedVector2Array = PackedVector2Array()

## Eine Zeile `gelenk` aus teile.txt: Teilbild eines Bones.
class Gelenk:
	var bone: String = ""
	var teil: String = ""
	var eltern: String = ""
	var ansatz: Vector2 = Vector2.ZERO
	var dreh: Vector2 = Vector2.ZERO
	var ruhe: float = 0.0


## Gedämpfte Feder um einen Ruhewinkel (Pendel mit bewegtem Aufhängepunkt):
## w'' = −schwer·sin w − steif·(w − ruhe) − daempf·w' + (−(ax + wind·vx)·cos w + ay·sin w) / laenge.
## Winkel in Bogenmaß, 0 = hängt senkrecht nach unten, positiv zur Seite +x der Welt.
class Feder:
	var w: float = 0.0
	var v: float = 0.0
	var steif: float = 0.10
	var daempf: float = 0.20
	var schwer: float = 0.012
	var wind: float = 0.18
	var laenge: float = 22.0
	## Grenze des Winkels (Bogenmaß) und der Winkelgeschwindigkeit je Tick
	var grenze: float = 1.75
	var tempo_max: float = 0.6

	func setze(winkel: float) -> void:
		w = winkel
		v = 0.0

	func schritt(ruhe: float, ax: float, ay: float, vx: float) -> void:
		# Die Feder spannt so vor, dass sie gegen die Schwerkraft genau bei `ruhe` zur Ruhe kommt
		var soll: float = ruhe + (schwer / steif) * sin(ruhe) if steif > 0.0 else ruhe
		var a: float = -schwer * sin(w) - steif * (w - soll) - daempf * v
		a += (-(ax + wind * vx) * cos(w) + ay * sin(w)) / laenge
		v = clampf(v + a, -tempo_max, tempo_max)
		w = clampf(w + v, -grenze, grenze)
		if is_nan(w) or is_nan(v):
			w = ruhe
			v = 0.0

var skelett: Skeleton2D = null
var teile: Dictionary = {}
## bone → Array[Gelenk] (Teilbilder, das erste ist der Standard)
var gelenke: Dictionary = {}
var bones: Dictionary = {}
## "Bone|teil" → Sprite2D
var sprites: Dictionary = {}
var geladen: bool = false
var fehler: String = ""

## letzte gelöste Pose: {"wurzel", "winkel", "tausch", "ebenen", "breite", "intent"}
var _pose: Dictionary = {}
## zuletzt gezeigte Absicht (nach Mischung), Ausgangspunkt eines Übergangs
var _intent: Dictionary = {}
var _blick: int = 1
var _anim_name: String = ""
var _anim_uhr: int = 0
## bone → Transform2D im Puppenraum (Ursprung = Fußpunkt, ohne Spiegelung), nach der letzten Pose
var _welt: Dictionary = {}
## bone → Gelenk (aktives Teilbild) der letzten Pose
var _aktiv: Dictionary = {}
var _teile_knoten: Node2D = null
## Gliedlängen (Bildpixel) aus den Gelenken, ohne Stauchung
var _l_arm: Array[float] = [0.0, 0.0]
var _l_bein: Array[float] = [0.0, 0.0]

# Übergang zwischen Animationen
var _von: Dictionary = {}
var _von_uhr: int = 0
var _blend_n: int = 0
# Takt und Federn
var _hat_frame: bool = false
var _frame: int = 0
var _welt_x: float = 0.0
var _kopf_ort: Vector2 = Vector2.ZERO
var _v_alt: Vector2 = Vector2.ZERO
var _hat_kopf: bool = false
var _zopf: Feder = Feder.new()
var _kopf_feder: Feder = Feder.new()
## Winkel des Zopfs in Weltrichtung (Grad, vorwärts = +x) nach dem letzten Schritt
var _zopf_ruhe_welt: float = 0.0
## bone → Vector2 Skalierung der letzten Pose (Stauchung, Streckung)
var _skala: Dictionary = {}


func _init() -> void:
	name = "VelaPuppe"
	_kopf_feder = _kopf_feder_neu()
	_laden()
	if geladen:
		_bauen()
		aus_animation("stand", 1, 1)


# ---------------------------------------------------------------------------
# Laden
# ---------------------------------------------------------------------------

func _laden() -> void:
	var text: String = FileAccess.get_file_as_string(ORDNER + TEILE_DATEI)
	if text == "":
		fehler = "teile.txt fehlt: " + ORDNER + TEILE_DATEI
		push_error(fehler)
		return
	for zeile: String in text.split("\n"):
		var z: String = zeile.strip_edges()
		if z == "" or z.begins_with("#"):
			continue
		var f: PackedStringArray = z.split(" ", false)
		if f[0] == "datei" and f.size() == 4:
			var t: Teil = Teil.new()
			t.name = f[1]
			t.breite = int(f[2])
			t.hoehe = int(f[3])
			var bild: Image = lade_png(ORDNER + t.name + ".png")
			if bild == null or bild.is_empty():
				fehler = "Teilbild fehlt: " + t.name
				push_error(fehler)
				return
			bild.convert(Image.FORMAT_RGBA8)
			t.bild = bild
			t.textur = ImageTexture.create_from_image(bild)
			t.huelle = _huelle(bild)
			teile[t.name] = t
		elif f[0] == "gelenk" and f.size() == 9:
			var g: Gelenk = Gelenk.new()
			g.bone = f[1]
			g.teil = f[2]
			g.eltern = f[3]
			g.ansatz = Vector2(float(f[4]), float(f[5]))
			g.dreh = Vector2(float(f[6]), float(f[7]))
			g.ruhe = float(f[8])
			if not gelenke.has(g.bone):
				gelenke[g.bone] = []
			(gelenke[g.bone] as Array).append(g)
	for b: String in BONES:
		if not gelenke.has(b):
			fehler = "Gelenk fehlt in teile.txt: " + b
			push_error(fehler)
			return
	geladen = true


## PNG aus der Datei lesen (ohne Editor-Import; Pfade res:// oder absolut).
static func lade_png(pfad: String) -> Image:
	var daten: PackedByteArray = FileAccess.get_file_as_bytes(pfad)
	if daten.is_empty():
		return null
	var bild: Image = Image.new()
	if bild.load_png_from_buffer(daten) != OK:
		return null
	return bild


## Konvexe Hülle der Eckpunkte aller deckenden Pixel (Monotone Chain).
static func _huelle(bild: Image) -> PackedVector2Array:
	var punkte: Array[Vector2] = []
	for y: int in bild.get_height():
		for x: int in bild.get_width():
			if bild.get_pixel(x, y).a > 0.5:
				punkte.append(Vector2(x, y))
				punkte.append(Vector2(x + 1, y))
				punkte.append(Vector2(x, y + 1))
				punkte.append(Vector2(x + 1, y + 1))
	if punkte.size() < 3:
		return PackedVector2Array(punkte)
	punkte.sort_custom(func(a: Vector2, b: Vector2) -> bool: return a.x < b.x or (a.x == b.x and a.y < b.y))
	var h: Array[Vector2] = []
	for p: Vector2 in punkte:
		while h.size() >= 2 and (h[h.size() - 1] - h[h.size() - 2]).cross(p - h[h.size() - 2]) <= 0.0:
			h.pop_back()
		h.append(p)
	var untere: int = h.size() + 1
	for i: int in range(punkte.size() - 2, -1, -1):
		var p: Vector2 = punkte[i]
		while h.size() >= untere and (h[h.size() - 1] - h[h.size() - 2]).cross(p - h[h.size() - 2]) <= 0.0:
			h.pop_back()
		h.append(p)
	h.pop_back()
	return PackedVector2Array(h)


# ---------------------------------------------------------------------------
# Aufbau
# ---------------------------------------------------------------------------

func _bauen() -> void:
	skelett = Skeleton2D.new()
	skelett.name = "Skelett"
	add_child(skelett)
	_teile_knoten = Node2D.new()
	_teile_knoten.name = "Teile"
	add_child(_teile_knoten)
	for b: String in BONES:
		var g0: Gelenk = (gelenke[b] as Array)[0]
		var bone: Bone2D = Bone2D.new()
		bone.name = b
		bone.set_autocalculate_length_and_angle(false)
		bone.set_length(10.0)
		var eltern: Node = skelett if g0.eltern == "-" else bones[g0.eltern]
		eltern.add_child(bone)
		bones[b] = bone
		bone.rest = Transform2D(0.0, Vector2.ZERO if g0.eltern == "-" else g0.ansatz - _gelenk(g0.eltern, "").dreh)
		bone.position = bone.rest.origin
		for gv: Gelenk in gelenke[b]:
			var teil: Teil = teile[gv.teil]
			var s: Sprite2D = Sprite2D.new()
			s.name = b + "_" + gv.teil
			s.texture = teil.textur
			s.centered = false
			s.offset = -gv.dreh
			s.rotation = deg_to_rad(gv.ruhe)
			s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			s.visible = (gv == (gelenke[b] as Array)[0])
			_teile_knoten.add_child(s)
			sprites[b + "|" + gv.teil] = s
	# Gliedlängen (Arm: Oberarm, Unterarm; Bein: Oberschenkel, Unterschenkel)
	_l_arm[0] = _segment("UnterarmV", "OberarmV").length()
	_l_arm[1] = _segment("HandV", "UnterarmV").length()
	_l_bein[0] = _segment("UnterschenkelV", "OberschenkelV").length()
	_l_bein[1] = _segment("FussV", "UnterschenkelV").length()


## Teilbild eines Bones nach Name (leer = Standard).
func _gelenk(bone: String, teil: String) -> Gelenk:
	var liste: Array = gelenke[bone]
	if teil != "":
		for g: Gelenk in liste:
			if g.teil == teil:
				return g
	return liste[0]


## Segmentvektor: Ansatz des Kindes im Elternbild minus Drehpunkt des Elternbildes.
func _segment(kind: String, eltern: String) -> Vector2:
	return _gelenk(kind, "").ansatz - _gelenk(eltern, "").dreh


# ---------------------------------------------------------------------------
# Löser (Zwei-Segment-IK)
# ---------------------------------------------------------------------------

## Richtungswinkel eines Vektors in der Drehrichtung von Transform2D:
## Vector2(0, 1).rotated(a) hat den Winkel a (0 = senkrecht nach unten).
static func richtungs_winkel(v: Vector2) -> float:
	return atan2(-v.x, v.y)


static func richtung(a: float) -> Vector2:
	return Vector2(-sin(a), cos(a))


## Zwei-Segment-IK. v1, v2: Ruhevektoren der Segmente (jeweils im Raum ihres Bones, bei
## Drehung 0 senkrecht nach unten gemessen), ziel: Zielpunkt relativ zum ersten Gelenk
## (Weltachsen), biegung: +1 Ellbogen (Gelenk liegt unten/hinten der Verbindungslinie),
## −1 Knie (vorn/oben). Die Reichweite wird begrenzt (kein NaN).
## Rückgabe: {"rot1": Weltdrehung des ersten Bones, "rot2": Drehung des zweiten relativ zum ersten,
## "ziel": tatsächlich erreichter Punkt, "gestreckt": bool}
static func ik2(v1: Vector2, v2: Vector2, ziel: Vector2, biegung: float, reichweite: float = 0.999) -> Dictionary:
	var l1: float = v1.length()
	var l2: float = v2.length()
	var b1: float = richtungs_winkel(v1)
	var b2: float = richtungs_winkel(v2)
	var d: float = ziel.length()
	var dmin: float = absf(l1 - l2) + 0.5
	var dmax: float = (l1 + l2) * reichweite
	var dd: float = clampf(d, dmin, dmax)
	var dt: float = richtungs_winkel(ziel) if d > 1e-6 else 0.0
	var c: float = clampf((l1 * l1 + dd * dd - l2 * l2) / (2.0 * l1 * dd), -1.0, 1.0)
	var delta: float = acos(c)
	var d1: float = dt + biegung * delta
	var z: Vector2 = richtung(dt) * dd
	var e: Vector2 = richtung(d1) * l1
	var d2: float = richtungs_winkel(z - e)
	return {"rot1": d1 - b1, "rot2": d2 - b2 - (d1 - b1), "ziel": z, "gestreckt": d >= dmax - 1e-9}


# ---------------------------------------------------------------------------
# Posen setzen
# ---------------------------------------------------------------------------

## Setzt die Pose für Animation `name` bei Aktionsuhr `uhr` (Beginn 1) und Blick (1 rechts, -1 links).
## Reine Pose der Tabelle: ohne Übergang und ohne Federn (unabhängig von der Vorgeschichte).
func aus_animation(anim: String, uhr: int, blick: int) -> void:
	_anim_name = anim
	_anim_uhr = uhr
	_blick = -1 if blick < 0 else 1
	setze_pose(DarstellungVelaPosen.pose(anim, uhr))


## Setzt Pose und Blick aus dem Zustand der Figur (Kern); ändert die Welt nicht. Übergänge
## und Federn laufen mit `welt.frame` (ohne Welt: nur die Pose, kein Schritt).
func aus_figur(f: KernEntitaeten.Figur, welt: KernWelt) -> void:
	var z: Dictionary = DarstellungVelaPosen.zuordnung(f, welt)
	var frame: int = welt.frame if welt != null else _frame
	var wx: float = float(f.x) / 65536.0 * float(DarstellungMasse.DARSTELLUNG)
	schritt(z["animation"], z["uhr"], f.blick, frame, wx, f.stopp)


## Ein Bild der Puppe: Animation, Aktionsuhr, Blick, Takt der Welt (`frame`), Weltlage der
## Figur in Bildpixeln (für den Antrieb der Federn) und verbleibende Stoppframes.
## Ändert sich `frame` gegenüber dem Aufruf davor, laufen Übergang und Federn weiter
## (1 bis FEDER_SCHRITTE_MAX Schritte); bei gleichem `frame` bleibt alles stehen.
func schritt(anim: String, uhr: int, blick: int, frame: int, welt_x: float = 0.0, stopp: int = 0) -> void:
	if not geladen:
		return
	var schritte: int = 0
	if not _hat_frame or frame < _frame:
		_feder_zuruecksetzen(welt_x)
	elif frame > _frame:
		schritte = mini(frame - _frame, FEDER_SCHRITTE_MAX)
	_hat_frame = true
	_frame = frame
	_blick = -1 if blick < 0 else 1
	# Übergang: neue Animation oder Uhr springt zurück
	var neu: bool = anim != _anim_name
	if not neu and uhr < _anim_uhr and anim != "gehen" and anim != "stand":
		neu = true
	if neu and not _intent.is_empty():
		_von = _intent
		_von_uhr = uhr
		_blend_n = DarstellungVelaPosen.uebergang_dauer(anim)
	_anim_name = anim
	_anim_uhr = uhr
	var ziel: Dictionary = DarstellungVelaPosen.pose(anim, uhr, stopp <= 0)
	if not _von.is_empty() and _blend_n > 0:
		var n: int = uhr - _von_uhr + 1
		var fortschritt: float = float(n) / float(_blend_n)
		if fortschritt < 1.0:
			ziel = DarstellungVelaPosen.mischen(_von, ziel, DarstellungVelaPosen.ease("ein_aus", fortschritt), 0.5)
		else:
			_von = {}
	_setze_intent(ziel, schritte, welt_x, true)


func _feder_zuruecksetzen(welt_x: float) -> void:
	_zopf = Feder.new()
	_kopf_feder = _kopf_feder_neu()
	_hat_kopf = false
	_v_alt = Vector2.ZERO
	_welt_x = welt_x
	_von = {}
	_blend_n = 0


func _kopf_feder_neu() -> Feder:
	var k: Feder = Feder.new()
	k.steif = 0.35
	k.daempf = 0.35
	k.schwer = 0.0
	k.wind = 0.0
	k.laenge = 1.0
	k.grenze = deg_to_rad(8.0)
	return k


## Blickrichtung setzen (1 rechts, -1 links); spiegelt die ganze Puppe.
func setze_blick(blick: int) -> void:
	_blick = -1 if blick < 0 else 1
	scale.x = float(_blick) * float(_pose.get("breite", 1.0))


func animation_name() -> String:
	return _anim_name


func animation_uhr() -> int:
	return _anim_uhr


func aktuelle_pose() -> Dictionary:
	return _pose


## Zuletzt gezeigte Absicht (nach Mischung und Federn der Absicht, ohne Federn der Teile).
func aktuelle_absicht() -> Dictionary:
	return _intent


## Setzt eine Absicht ohne Übergang und ohne Federschritt (Zopf in Ruhelage, Kopf ohne Zusatz).
func setze_pose(absicht: Dictionary) -> void:
	if not geladen:
		return
	_von = {}
	_blend_n = 0
	_setze_intent(absicht, 0, _welt_x, false)


## Wendet eine Absicht an: löst die Winkel, treibt die Federn (`schritte`) und stellt die Sprites.
func _setze_intent(p: Dictionary, schritte: int, welt_x: float, mit_federn: bool) -> void:
	_intent = p
	var kopf_zusatz: float = 0.0
	if mit_federn:
		kopf_zusatz = rad_to_deg(_kopf_feder.w)
	var zopf_ruhe_rel: float = float(p.get("z", -25.0))
	# Teil 1: alles außer dem Zopf (der Zopf braucht den Ort des Kopfes)
	_loese(p, kopf_zusatz, null)
	var kopf: Transform2D = _welt["Kopf"]
	var kopf_ort: Vector2 = kopf.origin
	# Federn
	var s: float = float(_blick)
	var kopf_welt_winkel: float = -(float(p.get("kopf", 0.0)) + kopf_zusatz)
	_zopf_ruhe_welt = s * (kopf_welt_winkel + zopf_ruhe_rel)
	if mit_federn and schritte > 0:
		_feder_schritte(schritte, kopf_ort, welt_x, deg_to_rad(_zopf_ruhe_welt))
	elif mit_federn and not _hat_kopf:
		_zopf.setze(deg_to_rad(_zopf_ruhe_welt))
		_kopf_ort = kopf_ort
		_welt_x = welt_x
		_hat_kopf = true
	var zopf_welt: Variant = null
	if mit_federn:
		zopf_welt = s * rad_to_deg(_zopf.w)
		# nach den Schritten wirkt der neue Kopfzusatz sofort
		var neu_zusatz: float = rad_to_deg(_kopf_feder.w)
		if absf(neu_zusatz - kopf_zusatz) > 1e-9:
			kopf_zusatz = neu_zusatz
			_loese(p, kopf_zusatz, zopf_welt)
		else:
			_zopf_anwenden(p, zopf_welt)
	else:
		_zopf_anwenden(p, null)
	_anwenden(p)


## Federschritte: Antrieb aus der Bewegung des Kopfes in der Welt (Figur + Wippen der Pose).
func _feder_schritte(n: int, kopf_ort: Vector2, welt_x: float, ruhe_zopf: float) -> void:
	var s: float = float(_blick)
	var alt: Vector2 = Vector2(_welt_x + s * _kopf_ort.x, _kopf_ort.y) if _hat_kopf else Vector2(welt_x + s * kopf_ort.x, kopf_ort.y)
	var neu: Vector2 = Vector2(welt_x + s * kopf_ort.x, kopf_ort.y)
	var v: Vector2 = (neu - alt) / float(n)
	v = Vector2(clampf(v.x, -8.0, 8.0), clampf(v.y, -8.0, 8.0))
	for i: int in n:
		var a: Vector2 = v - _v_alt if i == 0 else Vector2.ZERO
		a = Vector2(clampf(a.x, -6.0, 6.0), clampf(a.y, -6.0, 6.0))
		feder_schritt(a.x, a.y, v.x, ruhe_zopf, s)
		_v_alt = v
	_kopf_ort = kopf_ort
	_welt_x = welt_x
	_hat_kopf = true


## Ein Federschritt (auch für Prüfungen): Beschleunigung (ax, ay) und Tempo vx des Aufhängepunkts
## in der Welt (Bildpixel/Tick, ay positiv nach unten), Ruhelage des Zopfs (Bogenmaß, Welt), Blick.
func feder_schritt(ax: float, ay: float, vx: float, ruhe_zopf: float, blick: float = 1.0) -> void:
	_zopf.schritt(ruhe_zopf, ax, ay, vx)
	# Kopf: nickt gegen die Beschleunigung (vorwärts = Blickrichtung)
	var a_lokal: float = ax * blick
	_kopf_feder.schritt(0.0, 0.0, 0.0, 0.0)
	_kopf_feder.v += -0.012 * a_lokal + 0.004 * ay
	_kopf_feder.v = clampf(_kopf_feder.v, -_kopf_feder.tempo_max, _kopf_feder.tempo_max)


## Zopfwinkel in Weltrichtung (Grad, positiv nach +x der Welt) nach den Federschritten.
func zopf_welt_grad() -> float:
	return rad_to_deg(_zopf.w)


## Ruhewinkel des Zopfs in Weltrichtung (Grad) der letzten Pose.
func zopf_ruhe_grad() -> float:
	return _zopf_ruhe_welt


## Zopf der Feder auf einen Winkel setzen (Prüfungen: Stoß).
func zopf_setze_grad(grad: float) -> void:
	_zopf.setze(deg_to_rad(grad))


## Löst die Absicht `p` in Transformationen und Winkel. `zopf_welt`: Winkel des Zopfs im Puppenraum
## (Grad, vorwärts = Blickrichtung der Puppe, 0 = hängt senkrecht) oder null (Ruhewinkel der Pose relativ zum Kopf).
func _loese(p: Dictionary, kopf_zusatz: float, zopf_welt: Variant) -> void:
	var tausch: Dictionary = p.get("t", {})
	_aktiv = {}
	for b: String in BONES:
		_aktiv[b] = _gelenk(b, tausch.get(b, ""))
	# Skalen: Stauchung des Rumpfes (Drehung), Streckung der Arme (Verwischbild)
	var tw: float = absf(float(p.get("tw", 0.0)))
	var skala: Dictionary = {}
	for b: String in BONES:
		skala[b] = Vector2.ONE
	skala["Rumpf"] = Vector2(1.0 - 0.22 * tw, 1.0)
	skala["Becken"] = Vector2(1.0 - 0.12 * tw, 1.0)
	var smv: float = float(p.get("smv", 1.0))
	var smh: float = float(p.get("smh", 1.0))
	skala["OberarmV"] = Vector2(1.0, smv)
	skala["UnterarmV"] = Vector2(1.0, smv)
	skala["OberarmH"] = Vector2(1.0, smh)
	skala["UnterarmH"] = Vector2(1.0, smh)
	_skala = skala
	var bt: float = deg_to_rad(float(p.get("bt", 0.0)))
	var rumpf_neig: float = deg_to_rad(float(p.get("lean", 5.0)))
	var kopf_neig: float = deg_to_rad(float(p.get("kopf", 0.0)) + kopf_zusatz)
	var px: float = float(p.get("x", 0.0))
	# Becken: Höhe so begrenzen, dass die Standbeine ihr Ziel erreichen
	var fuesse: Dictionary = {"V": p.get("fv", Vector3(14, 0, 0)), "H": p.get("fh", Vector3(-14, 0, 0))}
	var y: float = float(p.get("y", 61.0))
	var ziele: Dictionary = {}
	for seite: String in ["V", "H"]:
		var fz: Vector3 = fuesse[seite]
		var gf: Gelenk = _aktiv["Fuss" + seite]
		var tief: float = _sohle_tief(gf, fz.z)
		var knöchel_y: float = -(fz.y + tief)
		ziele[seite] = Vector2(fz.x, knöchel_y)
		if fz.y <= BODEN_HOEHE:
			var off: Vector2 = Transform2D(bt, Vector2.ZERO).basis_xform(_skaliert(skala, "Becken", _versatz("Oberschenkel" + seite)))
			var l1: float = _skaliert(skala, "Oberschenkel" + seite, _segment("Unterschenkel" + seite, "Oberschenkel" + seite)).length()
			var l2: float = _skaliert(skala, "Unterschenkel" + seite, _segment("Fuss" + seite, "Unterschenkel" + seite)).length()
			var dmax: float = (l1 + l2) * BEIN_REICHWEITE
			var dx: float = fz.x - px - off.x
			var rest: float = dmax * dmax - dx * dx
			var dy: float = sqrt(maxf(rest, 0.0))
			y = minf(y, off.y + (fz.y + tief) + dy)
	var welt: Dictionary = {}
	welt["Becken"] = Transform2D(bt, Vector2(px, -y))
	welt["Rumpf"] = _kind(welt, skala, "Becken", "Rumpf", rumpf_neig - bt)
	welt["Kopf"] = _kind(welt, skala, "Rumpf", "Kopf", kopf_neig - rumpf_neig)
	# Arme
	for seite: String in ["V", "H"]:
		var schulter: Vector2 = (welt["Rumpf"] as Transform2D) * _skaliert(skala, "Rumpf", _versatz("Oberarm" + seite))
		var ziel: Vector2 = p.get("hv" if seite == "V" else "hh", Vector2(15, 0))
		var v1: Vector2 = _skaliert(skala, "Oberarm" + seite, _segment("Unterarm" + seite, "Oberarm" + seite))
		var v2: Vector2 = _skaliert(skala, "Unterarm" + seite, _segment("Hand" + seite, "Unterarm" + seite))
		var ik: Dictionary = ik2(v1, v2, ziel, 1.0)
		welt["Oberarm" + seite] = Transform2D(ik["rot1"], schulter)
		welt["Unterarm" + seite] = _kind_abs(welt, skala, "Oberarm" + seite, "Unterarm" + seite, ik["rot1"] + ik["rot2"])
		var hw: float = -deg_to_rad(float(p.get("hwv" if seite == "V" else "hwh", 0.0)))
		welt["Hand" + seite] = _kind_abs(welt, skala, "Unterarm" + seite, "Hand" + seite, ik["rot1"] + ik["rot2"] + hw)
	# Beine
	for seite: String in ["V", "H"]:
		var hueft: Vector2 = (welt["Becken"] as Transform2D) * _skaliert(skala, "Becken", _versatz("Oberschenkel" + seite))
		var v1: Vector2 = _skaliert(skala, "Oberschenkel" + seite, _segment("Unterschenkel" + seite, "Oberschenkel" + seite))
		var v2: Vector2 = _skaliert(skala, "Unterschenkel" + seite, _segment("Fuss" + seite, "Unterschenkel" + seite))
		var ik: Dictionary = ik2(v1, v2, (ziele[seite] as Vector2) - hueft, -1.0, 0.999)
		welt["Oberschenkel" + seite] = Transform2D(ik["rot1"], hueft)
		welt["Unterschenkel" + seite] = _kind_abs(welt, skala, "Oberschenkel" + seite, "Unterschenkel" + seite, ik["rot1"] + ik["rot2"])
		var fw: float = -deg_to_rad((fuesse[seite] as Vector3).z)
		welt["Fuss" + seite] = _kind_abs(welt, skala, "Unterschenkel" + seite, "Fuss" + seite, fw)
	# Zopf: relativ zum Kopf; Ruhelage oder Federwinkel (Weltrichtung, vorwärts = Blickrichtung)
	var kopf_rot: float = (welt["Kopf"] as Transform2D).get_rotation()
	var zopf_rot: float = kopf_rot - deg_to_rad(float(p.get("z", -25.0)))
	if zopf_welt != null:
		zopf_rot = -deg_to_rad(float(zopf_welt))
	welt["Zopf"] = _kind_abs(welt, skala, "Kopf", "Zopf", zopf_rot)
	_welt = welt
	# Winkel je Bone relativ zum Elternteil (Grad, vorwärts positiv, auf ±180° gewickelt)
	var w: Dictionary = {}
	for b: String in BONES:
		var g: Gelenk = _aktiv[b]
		var rot: float = (welt[b] as Transform2D).get_rotation()
		var rel: float = rot if g.eltern == "-" else angle_difference((welt[g.eltern] as Transform2D).get_rotation(), rot)
		w[b] = -rad_to_deg(rel)
	_pose = {
		"wurzel": Vector2(px, y),
		"winkel": w,
		"tausch": tausch,
		"ebenen": p.get("e", {}),
		"breite": float(p.get("breite", 1.0)) * float(p.get("wende", 1.0)),
		"intent": p,
		"kopf_zusatz": kopf_zusatz,
	}




## Nur den Zopf neu setzen (nach den Federschritten oder ohne Feder).
func _zopf_anwenden(p: Dictionary, zopf_welt: Variant) -> void:
	var kopf_rot: float = (_welt["Kopf"] as Transform2D).get_rotation()
	var zopf_rot: float = kopf_rot - deg_to_rad(float(p.get("z", -25.0)))
	if zopf_welt != null:
		zopf_rot = -deg_to_rad(float(zopf_welt))
	_welt["Zopf"] = _kind_abs(_welt, _skala, "Kopf", "Zopf", zopf_rot)
	(_pose["winkel"] as Dictionary)["Zopf"] = -rad_to_deg(zopf_rot - kopf_rot)


## Versatz des Bones im Raum des Elternteils (Ansatz minus Drehpunkt des Elternbildes).
func _versatz(bone: String) -> Vector2:
	var g: Gelenk = _aktiv[bone]
	return g.ansatz - (_aktiv[g.eltern] as Gelenk).dreh


func _skaliert(skala: Dictionary, bone: String, v: Vector2) -> Vector2:
	var s: Vector2 = skala[bone]
	return Vector2(v.x * s.x, v.y * s.y)


## Kind-Bone mit Drehung relativ zum Elternbone.
func _kind(welt: Dictionary, skala: Dictionary, eltern: String, bone: String, rot_rel: float) -> Transform2D:
	var te: Transform2D = welt[eltern]
	return Transform2D(te.get_rotation() + rot_rel, te * _skaliert(skala, eltern, _versatz(bone)))


## Kind-Bone mit Weltdrehung.
func _kind_abs(welt: Dictionary, skala: Dictionary, eltern: String, bone: String, rot_welt: float) -> Transform2D:
	var te: Transform2D = welt[eltern]
	return Transform2D(rot_welt, te * _skaliert(skala, eltern, _versatz(bone)))


## Größter Abstand der Hülle des Fußteils unter dem Knöchel (px) bei Weltwinkel w (Grad, 0 flach, + Spitze hoch).
func _sohle_tief(g: Gelenk, w: float) -> float:
	var t: Teil = teile[g.teil]
	var xf: Transform2D = Transform2D(-deg_to_rad(w) + deg_to_rad(g.ruhe), Vector2.ZERO)
	var tiefster: float = -INF
	for q: Vector2 in t.huelle:
		tiefster = maxf(tiefster, (xf * (q - g.dreh)).y)
	return tiefster


## Bones und Sprites nach `_welt` stellen.
func _anwenden(p: Dictionary) -> void:
	var ebenen: Dictionary = p.get("e", {})
	scale.x = float(_blick) * float(_pose.get("breite", 1.0))
	var skala: Dictionary = _skala
	for b: String in BONES:
		var bone: Bone2D = bones[b]
		var g: Gelenk = _aktiv[b]
		var tf: Transform2D = _welt[b]
		if g.eltern == "-":
			bone.rotation = tf.get_rotation()
			bone.position = tf.origin
		else:
			var te: Transform2D = _welt[g.eltern]
			bone.rotation = angle_difference(te.get_rotation(), tf.get_rotation())
			bone.position = _skaliert(skala, g.eltern, _versatz(b))
		var z: int = clampi(int(ebenen.get(b, DarstellungVelaPosen.EBENE_STANDARD[b])), 0, EBENEN_BREITE - 1)
		var ort: Vector2 = tf.origin
		if RASTER:
			ort = Vector2(roundf(ort.x), roundf(ort.y))
		for gv: Gelenk in gelenke[b]:
			var s: Sprite2D = sprites[b + "|" + gv.teil]
			var an: bool = (gv == g)
			s.visible = an
			if an:
				s.position = ort
				s.rotation = tf.get_rotation() + deg_to_rad(gv.ruhe)
				s.scale = skala[b]
				s.z_index = z


# ---------------------------------------------------------------------------
# Abfragen (Tests, Kontaktbögen)
# ---------------------------------------------------------------------------

## Ort des Drehpunkts eines Bones im Puppenraum (Ursprung Fußpunkt, ohne Spiegelung) nach der letzten Pose.
func bone_ort(bone: String) -> Vector2:
	return (_welt[bone] as Transform2D).origin


## Drehwinkel (Godot, Bogenmaß) des Bones im Puppenraum.
func bone_drehung(bone: String) -> float:
	return (_welt[bone] as Transform2D).get_rotation()


## Ort des Drehpunkts, wie er gezeichnet wird (auf ganze Bildpixel gesetzt, wenn RASTER).
func bone_ort_gezeichnet(bone: String) -> Vector2:
	var o: Vector2 = (_welt[bone] as Transform2D).origin
	if RASTER:
		return Vector2(roundf(o.x), roundf(o.y))
	return o


## Teilbild des Bones in der letzten Pose.
func aktives_teil(bone: String) -> String:
	return (_aktiv[bone] as Gelenk).teil


## Ansatzpunkt des Kindbones im Teilbild des Elternbones (Puppenraum, wie gezeichnet) und Drehpunkt des Kindes:
## Abstand der beiden = Spalt im Gelenk (px). Der Ansatz folgt dem gezeichneten Eltern-Sprite.
func gelenk_spalt(bone: String) -> float:
	var g: Gelenk = _aktiv[bone]
	if g.eltern == "-":
		return 0.0
	var tf_e: Transform2D = _welt[g.eltern]
	var ge: Gelenk = _aktiv[g.eltern]
	var s_e: Vector2 = _skala[g.eltern]
	var ort_e: Vector2 = bone_ort_gezeichnet(g.eltern)
	# Punkt des Elternbildes, an dem das Kind ansetzt, wie der Eltern-Sprite ihn zeichnet
	var rot_e: float = tf_e.get_rotation()
	var ansatz: Vector2 = ort_e + Transform2D(rot_e, Vector2.ZERO) * Vector2((g.ansatz.x - ge.dreh.x) * s_e.x, (g.ansatz.y - ge.dreh.y) * s_e.y)
	return ansatz.distance_to(bone_ort_gezeichnet(bone))


## Tiefster Punkt der Füße im Puppenraum (sollte 0 sein, wenn ein Fuß am Boden steht).
func sohle_y() -> float:
	var tiefster: float = -INF
	for b: String in ["FussV", "FussH"]:
		for q: Vector2 in fuss_huelle(b):
			tiefster = maxf(tiefster, q.y)
	return tiefster


## Hüllpunkte eines Fußes im Puppenraum: ideale Lage (aus der Lösung) oder wie gezeichnet
## (Drehpunkt auf ganzen Bildpixeln, wenn RASTER).
func fuss_huelle(bone: String, gezeichnet: bool = false) -> PackedVector2Array:
	var g: Gelenk = _aktiv[bone]
	var t: Teil = teile[g.teil]
	var ort: Vector2 = bone_ort_gezeichnet(bone) if gezeichnet else (_welt[bone] as Transform2D).origin
	var xf: Transform2D = Transform2D((_welt[bone] as Transform2D).get_rotation() + deg_to_rad(g.ruhe), ort)
	var aus: PackedVector2Array = PackedVector2Array()
	for q: Vector2 in t.huelle:
		aus.append(xf * (q - g.dreh))
	return aus


func _aktives_gelenk(bone: String) -> Gelenk:
	return _aktiv[bone]


## Größe der Puppe im Puppenraum: umschließendes Rechteck aller sichtbaren Teilbilder (Hülle).
func umriss() -> Rect2:
	var r: Rect2 = Rect2()
	var erster: bool = true
	for b: String in BONES:
		var g: Gelenk = _aktives_gelenk(b)
		var t: Teil = teile[g.teil]
		var tf: Transform2D = _welt[b]
		var xf: Transform2D = Transform2D(tf.get_rotation() + deg_to_rad(g.ruhe), tf.origin)
		for p: Vector2 in t.huelle:
			var q: Vector2 = xf * (p - g.dreh)
			if erster:
				r = Rect2(q, Vector2.ZERO)
				erster = false
			else:
				r = r.expand(q)
	return r
