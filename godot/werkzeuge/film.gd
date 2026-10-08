## Einzelbilder der Vela-Puppe für Filme (GIF) und Kontaktstreifen, ein Bild je Logik-Tick, durch die
## ganze Kette aus Schritt, Übergang und Federn der Puppe (wie im Spiel, nicht aus den Tabellen).
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/film.gd \
##       -- --aus /tmp/film_gehen --was gehen [--zoom 2] [--blick 1]
##
## --was gehen      ein Gehzyklus (24 Ticks, nach Einlauf), Boden mit Marken, die mit 3,5 px je Tick
##                  zurücklaufen (der Standfuß muss an einer Marke kleben), Bodenlinie
## --was kette1 ..4 Stand (12 Ticks), die Kette (alle Ticks, Trefferstopp von 7 Frames im ersten aktiven
##                  Frame), Stand (24 Ticks)
## --was stand      Stand (120 Ticks, Atmen, Zopf)
##
## Die Bilder heißen f0000.png, f0001.png, … im Ordner; ffmpeg macht daraus GIF oder Streifen
## (siehe docs/scheibe.md, Abschnitt Flüssigkeit der Vela-Puppe).
extends SceneTree

const BREITE: int = 260
const HOEHE: int = 200
const FUSS_X: int = 120
const FUSS_Y: int = 168
const HINTERGRUND: Color = Color(0.43, 0.47, 0.40)
const BODEN: Color = Color(0.30, 0.33, 0.27)
const MARKE: Color = Color(0.85, 0.85, 0.80)
const STOPP: int = 7
const MARKEN_ABSTAND: int = 24
const MARKEN: int = 14

var _zoom: int = 2
var _blick: int = 1
var _aus: String = ""
var _vp: SubViewport = null
var _marken: Array[ColorRect] = []
var _puppe: DarstellungVelaPuppe = null
var _nr: int = 0
var _frame: int = 1000
var _welt_x: float = 0.0


func _init() -> void:
	_lauf.call_deferred()


func _argumente() -> Dictionary:
	var aus: Dictionary = {}
	var a: PackedStringArray = OS.get_cmdline_user_args()
	var i: int = 0
	while i < a.size():
		if a[i].begins_with("--"):
			if i + 1 < a.size() and not a[i + 1].begins_with("--"):
				aus[a[i].substr(2)] = a[i + 1]
				i += 2
				continue
			aus[a[i].substr(2)] = "1"
		i += 1
	return aus


func _lauf() -> void:
	var arg: Dictionary = _argumente()
	_zoom = int(arg.get("zoom", "2"))
	_blick = int(arg.get("blick", "1"))
	_aus = String(arg.get("aus", ""))
	var was: String = String(arg.get("was", "gehen"))
	if _aus == "":
		print("--aus <ordner> fehlt")
		quit(1)
		return
	DirAccess.make_dir_recursive_absolute(_aus)
	_vp = SubViewport.new()
	_vp.size = Vector2i(BREITE * _zoom, HOEHE * _zoom)
	_vp.transparent_bg = false
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(_vp)
	var grund: ColorRect = ColorRect.new()
	grund.color = HINTERGRUND
	grund.size = _vp.size
	_vp.add_child(grund)
	var welt: Node2D = Node2D.new()
	welt.scale = Vector2(_zoom, _zoom)
	_vp.add_child(welt)
	var boden: ColorRect = ColorRect.new()
	boden.color = BODEN
	boden.position = Vector2(0, FUSS_Y)
	boden.size = Vector2(BREITE, HOEHE - FUSS_Y)
	welt.add_child(boden)
	for i: int in MARKEN:
		var m: ColorRect = ColorRect.new()
		m.color = MARKE
		m.size = Vector2(2, 6)
		m.position = Vector2(0, FUSS_Y + 8)
		welt.add_child(m)
		_marken.append(m)
	var linie: ColorRect = ColorRect.new()
	linie.color = Color(0.95, 0.95, 0.9, 0.6)
	linie.position = Vector2(0, FUSS_Y)
	linie.size = Vector2(BREITE, 1)
	welt.add_child(linie)
	_puppe = DarstellungVelaPuppe.new()
	_puppe.asset_zu_bild = 1  # das Werkzeug zeichnet in Basispixeln (Zoom wirkt über `welt`)
	_puppe.position = Vector2(FUSS_X, FUSS_Y)
	welt.add_child(_puppe)
	for i: int in 3:
		await process_frame
	match was:
		"gehen":
			await _gehen()
		"stand":
			for u: int in range(1, 121):
				await _bild("stand", u, 0, true)
		_:
			await _kette(int(was.substr(5)))
	print("Bilder: ", _nr, " in ", _aus)
	quit(0)


## Eine Pose rechnen und das Bild speichern.
func _bild(anim: String, uhr: int, stopp: int, speichern: bool) -> void:
	_frame += 1
	_puppe.schritt(anim, uhr, _blick, _frame, _welt_x, stopp)
	if not speichern:
		return
	var m0: float = fposmod(-_welt_x, float(MARKEN_ABSTAND))
	for i: int in MARKEN:
		_marken[i].position.x = float(i * MARKEN_ABSTAND) + m0 - float(MARKEN_ABSTAND)
	await process_frame
	await process_frame
	var bild: Image = _vp.get_texture().get_image()
	bild.save_png("%s/f%04d.png" % [_aus, _nr])
	_nr += 1


func _gehen() -> void:
	# Einlauf: Stand, dann zwei Zyklen gehen ohne Bild, dann ein Zyklus für den Film
	for u: int in range(1, 11):
		await _bild("stand", u, 0, false)
	var z: int = DarstellungVelaPosen.GEHEN_ZYKLUS
	for u: int in range(1, 2 * z + 1):
		_welt_x += float(_blick) * DarstellungVelaPosen.GEHEN_V
		await _bild("gehen", u, 0, false)
	for u: int in range(2 * z + 1, 3 * z + 1):
		_welt_x += float(_blick) * DarstellungVelaPosen.GEHEN_V
		await _bild("gehen", u, 0, true)


func _kette(stufe: int) -> void:
	var anim: String = "kette%d" % stufe
	var laenge: int = [KernWerte.LEERSCHLAG_DAUER, KernWerte.KETTE2_LEER_DAUER, KernWerte.KETTE3_LEER_DAUER, KernWerte.KETTE4_DAUER][stufe - 1]
	var von: int = KernWerte.KETTE_AKTIV_VON[stufe - 1]
	for u: int in range(1, 41):
		await _bild("stand", u, 0, u > 28)
	for u: int in range(1, laenge + 1):
		await _bild(anim, u, 0, true)
		if u == von:
			for i: int in STOPP:
				await _bild(anim, u, STOPP - i, true)
	for u: int in range(1, 25):
		await _bild("stand", u, 0, true)
