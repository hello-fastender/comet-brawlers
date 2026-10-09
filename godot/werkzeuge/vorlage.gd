## Bewegungsvorlagen für Groks Videobearbeitung (Video zu Video, Versuch): die Vela-Puppe mit den Posen
## des Spiels, auf dem Grün des Startbilds, quadratisch, 24 Bilder je Sekunde, im natürlichen Tempo
## (nicht im Takt der Logik: Grok-Clips kennen weder Trefferstopp noch 60 Hz). Grok soll die Vorlage
## „malen“ und dabei Bewegung und Zeitpunkte behalten (Bearbeiten statt neu erfinden).
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/vorlage.gd \
##       -- --aus <ordner> --was kette1|kniestoss [--weich 1.5] [--behalte] [--posen]
##
##   --aus <ordner>  Ausgabeordner (absolut oder ab Repo-Wurzel); darin `vela_vorlage_<was>.mp4`. Nicht ins Repo.
##   --was           kette1 (Probe: Posen der Tabelle), kniestoss (neu, nur hier, keine Spielpose)
##   --weich <σ>     Weichzeichner (ffmpeg gblur) gegen die harten Pixelblöcke der Teile (Standard 1.5, 0 = aus)
##   --behalte       Einzelbilder im Unterordner `bilder_<was>` behalten
##   --posen         nur die Schlüsselposen als `p_<name>.png` schreiben (zum Einrichten der Posen, kein Video)
##
## Bildaufbau wie das gemalte Startbild (1024 × 1024, Figur 60 % der Höhe, Fußpunkt bei y = 839), hier
## auf 960 × 960 umgerechnet: Fußpunkt (480, 787), Figur in der Kampfhaltung rund 575 Pixel hoch (Zoom 4,5 der Puppe in Basispixeln).
## Posen sind Absichten wie in `DarstellungVelaPosen`; die Puppe rechnet daraus die Winkel (IK).
extends SceneTree

const SEITE: int = 960
const ZOOM: float = 4.5
const FUSS_X: float = 480.0
const FUSS_Y: float = 787.0
const GRUEN: Color = Color8(25, 212, 32)
const FPS: int = 24
## Ticks der Logik je Sekunde (Atmen im Stand läuft in Ticks).
const TICKS: float = 60.0

var _aus: String = ""
var _was: String = "kette1"
var _weich: float = 1.5
var _behalte: bool = false
var _nur_posen: bool = false
var _vp: SubViewport = null
var _puppe: DarstellungVelaPuppe = null
var _nr: int = 0
var _ordner: String = ""


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
	_was = String(arg.get("was", "kette1"))
	_weich = float(arg.get("weich", "1.5"))
	_behalte = arg.has("behalte")
	_nur_posen = arg.has("posen")
	if _aus == "":
		printerr("--aus <ordner> fehlt")
		quit(1)
		return
	if not _aus.is_absolute_path():
		_aus = ProjectSettings.globalize_path("res://").path_join("..").path_join(_aus).simplify_path()
	DirAccess.make_dir_recursive_absolute(_aus)
	_vp = SubViewport.new()
	_vp.size = Vector2i(SEITE, SEITE)
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
	_puppe.asset_zu_bild = 1  # das Werkzeug zeichnet in Basispixeln (Zoom wirkt über `welt`)
	_puppe.position = Vector2(FUSS_X, FUSS_Y) / ZOOM
	welt.add_child(_puppe)
	for i: int in 3:
		await process_frame
	var ok: bool = true
	if _nur_posen:
		_ordner = _aus
		var p: Dictionary = _posen_satz(_was)
		for name: String in p:
			await _bild(p[name], "p_%s.png" % name)
	else:
		ok = await _video(_was)
	quit(0 if ok else 1)


## Rendert die Vorlage `was` (Einzelbilder, 24 je Sekunde) und kodiert sie mit ffmpeg.
func _video(was: String) -> bool:
	var schritte: Array = _ablauf(was)
	if schritte.is_empty():
		printerr("unbekannte Vorlage: ", was)
		return false
	_nr = 0
	_ordner = _aus.path_join("bilder_" + was)
	DirAccess.make_dir_recursive_absolute(_ordner)
	await _spiele(schritte)
	var video: String = _aus.path_join("vela_vorlage_%s.mp4" % was)
	var filter: String = ("gblur=sigma=%s," % str(_weich)) if _weich > 0.0 else ""
	var args: PackedStringArray = ["-y", "-loglevel", "error", "-framerate", str(FPS), "-i", _ordner.path_join("f%04d.png"),
		"-vf", filter + "format=yuv420p", "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", video]
	var ausgabe: Array = []
	var code: int = OS.execute("ffmpeg", args, ausgabe, true)
	if code != 0:
		printerr("ffmpeg fehlgeschlagen (Code %d): %s" % [code, "".join(PackedStringArray(ausgabe))])
		return false
	if not _behalte:
		var d: DirAccess = DirAccess.open(_ordner)
		for n: String in d.get_files():
			d.remove(n)
		DirAccess.remove_absolute(_ordner)
	print("Video: %s (%d Bilder, %.2f s)" % [video, _nr, float(_nr) / float(FPS)])
	return true


## Rendert die Absicht `p` und speichert das Bild (Name leer: laufende Nummer f0001.png, …).
func _bild(p: Dictionary, name: String = "") -> void:
	_puppe.setze_pose(p)
	await process_frame
	await process_frame
	var bild: Image = _vp.get_texture().get_image()
	if name == "":
		bild.save_png(_ordner.path_join("f%04d.png" % (_nr + 1)))
	else:
		bild.save_png(_ordner.path_join(name))
	_nr += 1


## Spielt Schritte ab. Ein Schritt ist ein Dictionary mit "art" und "dauer" (Sekunden):
##   stand   Atmen in der Kampfhaltung (Uhr läuft in Ticks weiter)
##   mix     von der letzten Pose zur Pose "ziel", Easing "e" (Standard ein_aus)
##   halt    letzte Pose halten
##   tab     Pose der Tabelle "anim" von Uhr "von" bis Uhr "bis" (stufenlos), Easing "e" auf dem Weg (Standard linear)
func _spiele(schritte: Array) -> void:
	var zuletzt: Dictionary = DarstellungVelaPosen.pose("stand", 1)
	var t: float = 0.0
	for s: Dictionary in schritte:
		var n: int = maxi(1, roundi(float(s["dauer"]) * float(FPS)))
		match String(s["art"]):
			"stand":
				for i: int in n:
					await _bild(DarstellungVelaPosen.pose("stand", 1 + int((t + float(i) / FPS) * TICKS)))
				zuletzt = DarstellungVelaPosen.pose("stand", 1 + int((t + float(n) / FPS) * TICKS))
			"mix":
				var ziel: Dictionary = s["ziel"]
				var e: String = String(s.get("e", "ein_aus"))
				for i: int in n:
					var q: float = DarstellungVelaPosen.ease(e, float(i + 1) / float(n))
					await _bild(DarstellungVelaPosen.mischen(zuletzt, ziel, q, 0.5))
				zuletzt = ziel
			"halt":
				for i: int in n:
					await _bild(zuletzt)
			"tab":
				var anim: String = String(s["anim"])
				var von: float = float(s["von"])
				var bis: float = float(s["bis"])
				var e: String = String(s.get("e", "linear"))
				for i: int in n:
					var q: float = DarstellungVelaPosen.ease(e, float(i + 1) / float(n))
					await _bild(DarstellungVelaPosen.pose_bei(anim, lerpf(von, bis, q), false))
				zuletzt = DarstellungVelaPosen.pose_bei(anim, bis, false)
		t += float(n) / float(FPS)


# ---------------------------------------------------------------------------
# Abläufe
# ---------------------------------------------------------------------------

func _ablauf(was: String) -> Array:
	match was:
		"kette1":
			return _ablauf_kette1()
		"kniestoss":
			return _ablauf_kniestoss()
	return []


## Probe: gerader Schlag der Kette 1 mit den Posen des Spiels, im Tempo eines echten Schlags
## (Ausholen, Schnapp in zwei Bildern, Halt am Kontakt, ruhiger Rückzug).
func _ablauf_kette1() -> Array:
	var ausholen: Dictionary = DarstellungVelaPosen.pose_bei("kette1", 1.0, false)
	return [
		{"art": "stand", "dauer": 1.0},
		{"art": "mix", "dauer": 0.4, "ziel": ausholen},
		{"art": "halt", "dauer": 0.15},
		{"art": "tab", "anim": "kette1", "von": 1.0, "bis": 2.0, "dauer": 0.083, "e": "ein"},
		{"art": "halt", "dauer": 0.25},
		{"art": "tab", "anim": "kette1", "von": 5.0, "bis": 16.0, "dauer": 0.7},
		{"art": "stand", "dauer": 1.2},
	]


func _m(abw: Dictionary) -> Dictionary:
	return DarstellungVelaPosen._m(abw)


func _kn(x: float, h: float, w: float) -> Vector3:
	return DarstellungVelaPosen._kn(x, h, w)


## Schlüsselposen des Kniestoßes (nur für diese Vorlage, nicht im Spiel).
func _posen_satz(was: String) -> Dictionary:
	if was != "kniestoss":
		return {"ausholen": DarstellungVelaPosen.pose_bei("kette1", 1.0, false), "treffer": DarstellungVelaPosen.pose_bei("kette1", 2.0, false)}
	var offen: Dictionary = {"HandV": "hand_offen", "HandH": "hand_offen"}
	# Griff: beide Arme nach vorn auf Schulterhöhe, offene Hände, Oberkörper leicht vorgebeugt, breiter Stand
	var griff: Dictionary = _m({"x": 3.0, "y": 61.0, "bt": 2.0, "lean": 10.0, "kopf": 2.0, "tw": 0.25, "z": -40.0,
		"hv": Vector2(37, -6), "hh": Vector2(35, -3), "fv": Vector3(18, 0, 0), "fh": Vector3(-18, 0, 0), "t": offen})
	# Zug: die Hände ziehen das Ziel zum Körper, der Oberkörper richtet sich auf
	var zug: Dictionary = _m({"x": 0.0, "y": 61.0, "lean": 4.0, "kopf": 0.0, "tw": 0.2, "z": -35.0,
		"hv": Vector2(24, 3), "hh": Vector2(22, 5), "fv": Vector3(14, 0, 0), "fh": Vector3(-17, 0, 0), "t": offen})
	# Knie oben: vorderes Knie auf Hüfthöhe und höher, Schienbein fällt nach unten, Stiefelspitze zeigt nach unten
	var knie: Dictionary = _m({"x": -1.0, "y": 63.0, "bt": -2.0, "lean": 0.0, "kopf": 4.0, "tw": 0.0, "z": -35.0,
		"hv": Vector2(22, 7), "hh": Vector2(20, 9), "fv": _kn(23, 41, -40), "fh": Vector3(-14, 0, 0),
		"t": offen, "e": DarstellungVelaPosen.BEIN_V_VORN})
	return {"kampf": DarstellungVelaPosen.pose("stand", 1), "griff": griff, "zug": zug, "knie": knie}


## Kniestoß: Kampfhaltung → Griff (Arme vor) → Zug → Knie hoch (schnell) → kurz oben → zurück in den Griff → Kampfhaltung.
func _ablauf_kniestoss() -> Array:
	var p: Dictionary = _posen_satz("kniestoss")
	return [
		{"art": "stand", "dauer": 0.8},
		{"art": "mix", "dauer": 0.35, "ziel": p["griff"]},
		{"art": "halt", "dauer": 0.4},
		{"art": "mix", "dauer": 0.17, "ziel": p["zug"], "e": "ein"},
		{"art": "mix", "dauer": 0.12, "ziel": p["knie"], "e": "schnell"},
		{"art": "halt", "dauer": 0.12},
		{"art": "mix", "dauer": 0.4, "ziel": p["griff"]},
		{"art": "halt", "dauer": 0.35},
		{"art": "mix", "dauer": 0.4, "ziel": p["kampf"]},
		{"art": "stand", "dauer": 1.0},
	]
