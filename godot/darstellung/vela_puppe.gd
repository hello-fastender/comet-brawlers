## Vela als Cutout-Puppe aus echten Bildteilen (Auftrag 6, Phase 2; Auftrag 5, 2c).
##
## Baut zur Laufzeit ein `Skeleton2D` mit einer `Bone2D`-Hierarchie
## (Becken → Rumpf → Kopf → Zopf; Rumpf → Oberarm → Unterarm → Hand;
## Becken → Oberschenkel → Unterschenkel → Fuß, je vorn V und hinten H) und je
## Teilbild ein `Sprite2D` unter dem Bone. Die Teilbilder, Gelenke und Drehpunkte
## stehen in `res://grafik/vela/teile.txt` (erzeugt von `werkzeuge/umsetzer.gd`),
## die Posen in `DarstellungVelaPosen`.
##
## Einhängen in die Szene:
## - Ursprung des Nodes = Fußpunkt der Figur in Bildpixeln (2×): `position` ist
##   Spielposition × 2 (die Höhe `h` der Logik abziehen). Die Sohle der Standbeine liegt
##   in jeder Pose auf y = 0 (die Puppe rechnet die Höhe der Hüfte selbst).
## - Maßstab 1: ein Texturpixel ist ein Bildpixel. Nicht skalieren.
## - Blick links spiegelt die ganze Puppe (`scale.x = -1`, setzt `aus_figur` selbst).
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

var skelett: Skeleton2D = null
var teile: Dictionary = {}
## bone → Array[Gelenk] (Teilbilder, das erste ist der Standard)
var gelenke: Dictionary = {}
var bones: Dictionary = {}
## "Bone|teil" → Sprite2D
var sprites: Dictionary = {}
var geladen: bool = false
var fehler: String = ""

var _pose: Dictionary = {}
var _blick: int = 1
var _anim_name: String = ""
var _anim_uhr: int = 0
## bone → Transform2D im Puppenraum (Ursprung = Fußpunkt, ohne Spiegelung), nach der letzten Pose
var _welt: Dictionary = {}


func _init() -> void:
	name = "VelaPuppe"
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
			s.name = gv.teil
			s.texture = teil.textur
			s.centered = false
			s.offset = -gv.dreh
			s.rotation = deg_to_rad(gv.ruhe)
			s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			s.visible = (gv == (gelenke[b] as Array)[0])
			bone.add_child(s)
			sprites[b + "|" + gv.teil] = s


## Teilbild eines Bones nach Name (leer = Standard).
func _gelenk(bone: String, teil: String) -> Gelenk:
	var liste: Array = gelenke[bone]
	if teil != "":
		for g: Gelenk in liste:
			if g.teil == teil:
				return g
	return liste[0]


# ---------------------------------------------------------------------------
# Posen setzen
# ---------------------------------------------------------------------------

## Setzt die Pose für Animation `name` bei Aktionsuhr `uhr` (Beginn 1) und Blick (1 rechts, -1 links).
func aus_animation(anim: String, uhr: int, blick: int) -> void:
	_anim_name = anim
	_anim_uhr = uhr
	_blick = -1 if blick < 0 else 1
	setze_pose(DarstellungVelaPosen.pose(anim, uhr))


## Setzt Pose und Blick aus dem Zustand der Figur (Kern); ändert die Welt nicht.
func aus_figur(f: KernEntitaeten.Figur, welt: KernWelt) -> void:
	var z: Dictionary = DarstellungVelaPosen.zuordnung(f, welt)
	aus_animation(z["animation"], z["uhr"], f.blick)


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


## Wendet eine ausgelöste Pose an (siehe DarstellungVelaPosen). Winkel in Grad, vorwärts positiv.
func setze_pose(pose: Dictionary) -> void:
	if not geladen:
		return
	_pose = pose
	scale.x = float(_blick) * float(pose.get("breite", 1.0))
	var winkel: Dictionary = pose["winkel"]
	var versatz: Dictionary = pose.get("versatz", {})
	var tausch: Dictionary = pose.get("tausch", {})
	var ebenen: Dictionary = pose.get("ebenen", {})
	# Teilbilder wählen
	var aktiv: Dictionary = {}
	for b: String in BONES:
		var wahl: String = tausch.get(b, "")
		aktiv[b] = _gelenk(b, wahl)
		for gv: Gelenk in gelenke[b]:
			(sprites[b + "|" + gv.teil] as Sprite2D).visible = (gv == aktiv[b])
	# Bones: Transformationen im Puppenraum (Hüfte zunächst bei y = 0)
	var wurzel: Vector2 = pose.get("wurzel", Vector2.ZERO)
	_welt = {}
	for b: String in BONES:
		var g: Gelenk = aktiv[b]
		var rot: float = -deg_to_rad(float(winkel.get(b, 0.0)))
		var pos: Vector2 = Vector2.ZERO
		var elternform: Transform2D = Transform2D.IDENTITY
		if g.eltern == "-":
			pos = Vector2(wurzel.x, 0.0)
		else:
			var eg: Gelenk = aktiv[g.eltern]
			pos = g.ansatz - eg.dreh + versatz.get(b, Vector2.ZERO)
			elternform = _welt[g.eltern]
		_welt[b] = elternform * Transform2D(rot, pos)
	# Bodenkontakt: tiefster Punkt der Füße auf y = 0 (plus gewollte Höhe wurzel.y)
	var tiefster: float = -INF
	for b: String in ["FussV", "FussH"]:
		var g: Gelenk = aktiv[b]
		var t: Teil = teile[g.teil]
		var xf: Transform2D = (_welt[b] as Transform2D) * Transform2D(deg_to_rad(g.ruhe), Vector2.ZERO)
		for p: Vector2 in t.huelle:
			tiefster = maxf(tiefster, (xf * (p - g.dreh)).y)
	var hoehe: float = -tiefster + wurzel.y
	# anwenden
	for b: String in BONES:
		var bone: Bone2D = bones[b]
		var g: Gelenk = aktiv[b]
		bone.rotation = -deg_to_rad(float(winkel.get(b, 0.0)))
		if g.eltern == "-":
			bone.position = Vector2(wurzel.x, hoehe)
		else:
			bone.position = g.ansatz - (aktiv[g.eltern] as Gelenk).dreh + versatz.get(b, Vector2.ZERO)
		var z: int = int(ebenen.get(b, DarstellungVelaPosen.EBENE_STANDARD[b]))
		for gv: Gelenk in gelenke[b]:
			(sprites[b + "|" + gv.teil] as Sprite2D).z_index = clampi(z, 0, EBENEN_BREITE - 1)
	for b: String in BONES:
		_welt[b] = Transform2D(0.0, Vector2(0.0, hoehe)) * (_welt[b] as Transform2D)


# ---------------------------------------------------------------------------
# Abfragen (Tests, Kontaktbögen)
# ---------------------------------------------------------------------------

## Ort des Drehpunkts eines Bones im Puppenraum (Ursprung Fußpunkt, ohne Spiegelung) nach der letzten Pose.
func bone_ort(bone: String) -> Vector2:
	return (_welt[bone] as Transform2D).origin


## Drehwinkel (Godot, Bogenmaß) des Bones im Puppenraum.
func bone_drehung(bone: String) -> float:
	return (_welt[bone] as Transform2D).get_rotation()


## Tiefster Punkt der Füße im Puppenraum (sollte 0 sein).
func sohle_y() -> float:
	var tiefster: float = -INF
	for b: String in ["FussV", "FussH"]:
		var g: Gelenk = _aktives_gelenk(b)
		var t: Teil = teile[g.teil]
		var xf: Transform2D = (_welt[b] as Transform2D) * Transform2D(deg_to_rad(g.ruhe), Vector2.ZERO)
		for p: Vector2 in t.huelle:
			tiefster = maxf(tiefster, (xf * (p - g.dreh)).y)
	return tiefster


func _aktives_gelenk(bone: String) -> Gelenk:
	var wahl: String = (_pose.get("tausch", {}) as Dictionary).get(bone, "")
	return _gelenk(bone, wahl)


## Größe der Puppe im Puppenraum: umschließendes Rechteck aller sichtbaren Teilbilder (Hülle).
func umriss() -> Rect2:
	var r: Rect2 = Rect2()
	var erster: bool = true
	for b: String in BONES:
		var g: Gelenk = _aktives_gelenk(b)
		var t: Teil = teile[g.teil]
		var xf: Transform2D = (_welt[b] as Transform2D) * Transform2D(deg_to_rad(g.ruhe), Vector2.ZERO)
		for p: Vector2 in t.huelle:
			var q: Vector2 = xf * (p - g.dreh)
			if erster:
				r = Rect2(q, Vector2.ZERO)
				erster = false
			else:
				r = r.expand(q)
	return r
