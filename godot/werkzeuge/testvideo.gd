## Erzeugt zwei TESTVIDEOS aus der Vela-Puppe (nicht von Grok), um werkzeuge/video_umsetzer.gd
## Ende zu Ende zu prüfen: `vela_v_gehen.mp4` (Gehen, 2 Sekunden) und `vela_v_kette1.mp4` (Stand, Ausholen,
## gerader Schlag mit Halt, Rückzug, Stand). Jedes Video: reines Chroma-Grün (0, 255, 0), 1280 × 720,
## 24 Bilder je Sekunde, H.264, feste Kamera, Figur auf der Stelle, vierfach vergrößert (die Figur ist
## dann rund 570 Pixel hoch, wie bei einem Videoclip von Grok).
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/testvideo.gd \
##       -- --aus <ordner> [--weich] [--behalte]
##
##   --aus <ordner>  Ausgabeordner (Pfad ab Repo-Wurzel oder absolut); darin die Videos. Nicht ins Repo legen.
##   --weich         Bilder vor der Kompression leicht weichzeichnen (ffmpeg gblur, Sigma 1,2), wie die
##                   weichen Kanten echter KI-Videos
##   --behalte       die Einzelbilder (je Tick, 60 je Sekunde) im Unterordner `bilder_<clip>` behalten
##
## Gerendert wird je Tick der Logik (60 je Sekunde); ffmpeg macht daraus mit `-framerate 60 -r 24`
## 24 Bilder je Sekunde (jedes 2,5. Bild, ohne Mischen).
##
## Gehen: die Puppe geht den Zyklus aus vela_posen.gd (24 Ticks je Doppelschritt, also 9,6 Videobilder:
## der Zyklus fällt nicht auf ganze Videobilder, wie bei einem echten Clip). Kette 1: dieselben Posen,
## aber auf rund das Vierfache gedehnt (Ausholen, Schlag in zwei Bildern, Halt, Rückzug), weil Grok-Clips
## keinen Trefferstopp und keine 16 Ticks kennen.
extends SceneTree

const BREITE: int = 1280
const HOEHE: int = 720
const ZOOM: int = 4
## Fußpunkt der Figur im Bild (Bildpixel des Videos)
const FUSS_X: int = 560
const FUSS_Y: int = 650
const GRUEN: Color = Color(0.0, 1.0, 0.0)
const FPS: int = 24

var _aus: String = ""
var _weich: bool = false
var _behalte: bool = false
var _vp: SubViewport = null
var _puppe: DarstellungVelaPuppe = null
var _nr: int = 0
var _bilder_ordner: String = ""
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
	_aus = String(arg.get("aus", ""))
	_weich = arg.has("weich")
	_behalte = arg.has("behalte")
	if _aus == "":
		printerr("--aus <ordner> fehlt")
		quit(1)
		return
	if not _aus.is_absolute_path():
		_aus = ProjectSettings.globalize_path("res://").path_join("..").path_join(_aus).simplify_path()
	DirAccess.make_dir_recursive_absolute(_aus)
	_vp = SubViewport.new()
	_vp.size = Vector2i(BREITE, HOEHE)
	_vp.transparent_bg = false
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(_vp)
	var grund: ColorRect = ColorRect.new()
	grund.color = GRUEN
	grund.size = _vp.size
	_vp.add_child(grund)
	var welt: Node2D = Node2D.new()
	welt.scale = Vector2(ZOOM, ZOOM)
	_vp.add_child(welt)
	_puppe = DarstellungVelaPuppe.new()
	_puppe.position = Vector2(float(FUSS_X) / ZOOM, float(FUSS_Y) / ZOOM)
	welt.add_child(_puppe)
	for i: int in 3:
		await process_frame
	var ok: bool = true
	ok = await _clip("gehen") and ok
	ok = await _clip("kette1") and ok
	quit(0 if ok else 1)


## Rendert einen Clip (Einzelbilder je Tick) und kodiert ihn mit ffmpeg.
func _clip(name: String) -> bool:
	_nr = 0
	_bilder_ordner = _aus.path_join("bilder_" + name)
	DirAccess.make_dir_recursive_absolute(_bilder_ordner)
	if name == "gehen":
		await _gehen()
	else:
		await _kette1()
	var video: String = _aus.path_join("vela_v_%s.mp4" % name)
	var filter: String = "gblur=sigma=1.2," if _weich else ""
	var args: PackedStringArray = ["-y", "-loglevel", "error", "-framerate", "60", "-i", _bilder_ordner.path_join("f%04d.png"),
		"-r", str(FPS), "-vf", filter + "format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", video]
	var ausgabe: Array = []
	var code: int = OS.execute("ffmpeg", args, ausgabe, true)
	if code != 0:
		printerr("ffmpeg fehlgeschlagen (Code %d): %s" % [code, "".join(PackedStringArray(ausgabe))])
		return false
	if not _behalte:
		var d: DirAccess = DirAccess.open(_bilder_ordner)
		for n: String in d.get_files():
			d.remove(n)
		DirAccess.remove_absolute(_bilder_ordner)
	print("Video: %s (%d Tick-Bilder)" % [video, _nr])
	return true


## Rendert das aktuelle Bild und speichert es als PNG.
func _speichern() -> void:
	await process_frame
	await process_frame
	var bild: Image = _vp.get_texture().get_image()
	bild.save_png(_bilder_ordner.path_join("f%04d.png" % (_nr + 1)))
	_nr += 1


## Gehen: Einlauf ohne Bild, dann 120 Ticks (2 Sekunden) Gehzyklus.
func _gehen() -> void:
	for u: int in range(1, 11):
		_frame += 1
		_puppe.schritt("stand", u, 1, _frame, _welt_x, 0)
	var z: int = DarstellungVelaPosen.GEHEN_ZYKLUS
	for u: int in range(1, 2 * z + 1):
		_welt_x += DarstellungVelaPosen.GEHEN_V
		_frame += 1
		_puppe.schritt("gehen", u, 1, _frame, _welt_x, 0)
	for u: int in range(2 * z + 1, 2 * z + 121):
		_welt_x += DarstellungVelaPosen.GEHEN_V
		_frame += 1
		_puppe.schritt("gehen", u, 1, _frame, _welt_x, 0)
		await _speichern()


## Kette 1 gedehnt: Stand 24 Ticks, Übergang zum Ausholen 12, Ausholen 6, Schlag 5 (uhr 1 bis 2),
## Halt am Kontakt 16 (uhr 2 bis 5), Rückzug 40 (uhr 5 bis 16), Stand 30.
func _kette1() -> void:
	var stand: Dictionary = DarstellungVelaPosen.pose("stand", 1)
	var ausholen: Dictionary = DarstellungVelaPosen.pose_bei("kette1", 1.0, false)
	for t: int in 24:
		_puppe.setze_pose(DarstellungVelaPosen.pose("stand", 1 + t))
		await _speichern()
	for t: int in 12:
		var q: float = DarstellungVelaPosen.ease("ein_aus", float(t + 1) / 12.0)
		_puppe.setze_pose(DarstellungVelaPosen.mischen(stand, ausholen, q))
		await _speichern()
	for t: int in 6:
		_puppe.setze_pose(ausholen)
		await _speichern()
	for t: int in 5:
		_puppe.setze_pose(DarstellungVelaPosen.pose_bei("kette1", 1.0 + float(t + 1) / 5.0, false))
		await _speichern()
	for t: int in 16:
		_puppe.setze_pose(DarstellungVelaPosen.pose_bei("kette1", 2.0 + 3.0 * float(t + 1) / 16.0, false))
		await _speichern()
	for t: int in 40:
		_puppe.setze_pose(DarstellungVelaPosen.pose_bei("kette1", 5.0 + 11.0 * float(t + 1) / 40.0, false))
		await _speichern()
	for t: int in 30:
		_puppe.setze_pose(DarstellungVelaPosen.pose("stand", 1 + t))
		await _speichern()
