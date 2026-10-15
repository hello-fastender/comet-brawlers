## Bauwerkzeug der 3D-Vela (Versuch „Vela in 3D“, docs/dreid-vela.md): macht aus dem geriggten Modell (GLB) und den Tripo-
## Animationen (FBX, eine Animation je Datei, Mixamo-Skelett, an Ort und Stelle) die Dateien, die das Spiel braucht:
##
##   <aus>/vela.glb            das Modell (Kopie des geriggten GLB, 2048-Textur, rund 4 MB)
##   <aus>/animationen.res     AnimationLibrary mit allen Clips, 60 Schlüsselbilder je Sekunde (= Ticks der Logik), Hüfte
##                             waagrecht auf der Ruheposition (die Figur bleibt auf der Stelle)
##   <aus>/clips/<name>.txt    Clipdaten im Format der clip.txt der gemalten Clips (DarstellungVelaFramesTabelle.clip_lesen),
##                             aber mit der Zeiteinheit 1/240 s statt Bildnummern (fps=240; ein „Bild“ ist 1/240 s)
##   <aus>/.gdignore           der Ordner wird nicht vom Editor importiert (Dateizugriff zur Laufzeit wie bei vela_video)
##
## Die Quelldateien (rund 10 MB je FBX) liegen nicht im Repo. Welche Datei welcher Clip wird und wo die Ereignisse liegen, steht in
## werkzeuge/dreid_clips.json (Zeiten in Sekunden der Quelldatei; mit --analyse ausgeben lassen und ablesen).
##
##   godot --headless --path godot --script res://werkzeuge/dreid_bauen.gd -- --quelle <ordner> --bauen [--aus godot/grafik/vela_3d]
##       [--manifest godot/werkzeuge/dreid_clips.json]
##   godot --headless --path godot --script res://werkzeuge/dreid_bauen.gd -- --quelle <ordner> --analyse <quelle>
##
##   --quelle <ordner>     Ordner mit <name>.fbx (Rollennamen wie im Manifest unter "quelle") und modell.glb
##   --bauen               alle Clips des Manifests bauen
##   --analyse <quelle>    Merkmale je Bild (24 je Sekunde) einer Quelldatei als Tabelle ausgeben (Ereigniszeiten ablesen);
##                         "alle" für alle Quelldateien, die das Manifest nennt
##   --nur <clip>          nur diesen Clip bauen (animationen.res bleibt für die übrigen erhalten, soweit vorhanden)
##
## Merkmale der Tabelle (relativ zur Hüfte, +z ist vorn, y oben, in Einheiten der Figurhöhe 1,0):
##   hy, gier   Hüfthöhe und Drehung der Hüfte um die Hochachse in Grad (−90 = blickt nach vorn)
##   hand, fuss größte Auslage der Hand und der Zehen nach vorn (L/R: welche Seite); fussz_hinten: kleinste Auslage der Zehen
##   zeh_y      tiefster Zeh über dem Boden
##   kopf       Kopfhöhe und Kopf-z
##   e          Summe der Drehänderungen aller Knochen gegenüber dem Vorbild (Grad), ein Maß für die Bewegung
extends SceneTree

## Zeiteinheit der Clipdaten: 1/EINHEIT s
const EINHEIT: int = 240
## Schlüsselbilder der gebauten Animationen je Sekunde
const TAKT: int = 60
## Bilder je Sekunde der Quelldateien (nur für die Tabelle)
const QUELL_FPS: float = 24.0
## Spielpixel je Welteinheit (Figurhöhe 1,0 = 142 Basispixel = 71 Spielpixel, DarstellungMasse.ASSET_BASIS)
const SPIELPIXEL_JE_EINHEIT: float = 71.0
## Gehgeschwindigkeit der Logik in Spielpixeln je Tick (KernWerte.LAUF_X = 1,75)
const LAUF_X: float = 1.75
## Zehen gelten als am Boden, wenn sie höchstens so viel über dem tiefsten Punkt des Clips liegen (Einheiten der Figurhöhe)
const BODEN_TOLERANZ: float = 0.02
## Ein Schlüssel einer Drehspur gilt als Ausreißer, wenn er so viele Grad vom Wert zwischen seinen Nachbarn abweicht (siehe _entspitzen)
const SPITZE_GRAD: float = 30.0

const HUEFTE: String = "mixamorig_Hips"
const ZEHEN: Array[String] = ["mixamorig_LeftToeBase", "mixamorig_RightToeBase"]
const HAENDE: Array[String] = ["mixamorig_LeftHand", "mixamorig_RightHand"]
const KOPF: String = "mixamorig_Head"

var _quelle: String = ""
var _manifest: Dictionary = {}
var _cache: Dictionary = {}
var _modell: Dictionary = {}


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


func _pfad(p: String) -> String:
	if p.is_absolute_path():
		return p
	return ProjectSettings.globalize_path("res://").path_join("..").path_join(p).simplify_path()


func _lauf() -> void:
	var arg: Dictionary = _argumente()
	if not arg.has("quelle") or not (arg.has("bauen") or arg.has("analyse")):
		printerr("Aufruf: dreid_bauen.gd -- --quelle <ordner> (--bauen [--aus <ordner>] [--nur <clip>] | --analyse <quelle|alle>) [--manifest <datei>]")
		quit(1)
		return
	_quelle = _pfad(String(arg["quelle"]))
	var mpfad: String = _pfad(String(arg.get("manifest", "godot/werkzeuge/dreid_clips.json")))
	var text: String = FileAccess.get_file_as_string(mpfad)
	var m: Variant = JSON.parse_string(text)
	if text == "" or not (m is Dictionary):
		printerr("Manifest nicht lesbar: ", mpfad)
		quit(1)
		return
	_manifest = m as Dictionary
	if arg.has("analyse"):
		var wahl: String = String(arg["analyse"])
		var liste: Array[String] = []
		if wahl == "alle":
			for q: String in _quellen():
				liste.append(q)
		else:
			liste.append(wahl)
		for q: String in liste:
			_analyse(q)
		quit(0)
		return
	var aus: String = _pfad(String(arg.get("aus", "godot/grafik/vela_3d")))
	var fehler: int = _bauen(aus, String(arg.get("nur", "")))
	quit(fehler)


## Rollennamen aller Quelldateien, die das Manifest nennt (ohne Doppelte).
func _quellen() -> Array[String]:
	var r: Array[String] = []
	var clips: Dictionary = _manifest["clips"]
	for name: String in clips:
		var c: Dictionary = clips[name]
		for k: String in ["quelle", "basis", "bewegung"]:
			if c.has(k) and not r.has(String(c[k])):
				r.append(String(c[k]))
	return r


# ---------------------------------------------------------------------------
# Quelldateien laden
# ---------------------------------------------------------------------------

## Lädt <quelle>/<name>.fbx: {"wurzel", "ap" (AnimationPlayer), "sk" (Skeleton3D), "anim" (Animation), "name"}. Leer bei Fehler.
func _fbx(name: String) -> Dictionary:
	if _cache.has(name):
		return _cache[name]
	var datei: String = _quelle.path_join(name + ".fbx")
	var doc: GLTFDocument = FBXDocument.new()
	var state: GLTFState = FBXState.new()
	var e: int = doc.append_from_file(datei, state)
	if e != OK:
		printerr("FBX nicht lesbar (Fehler %d): %s" % [e, datei])
		return {}
	var wurzel: Node = doc.generate_scene(state)
	root.add_child(wurzel)
	var aps: Array[Node] = wurzel.find_children("*", "AnimationPlayer", true, false)
	var sks: Array[Node] = wurzel.find_children("*", "Skeleton3D", true, false)
	if aps.is_empty() or sks.is_empty():
		printerr("kein AnimationPlayer oder Skelett in ", datei)
		return {}
	var ap: AnimationPlayer = aps[0] as AnimationPlayer
	var liste: PackedStringArray = ap.get_animation_list()
	if liste.is_empty():
		printerr("keine Animation in ", datei)
		return {}
	var d: Dictionary = {"wurzel": wurzel, "ap": ap, "sk": sks[0], "name": liste[0], "anim": ap.get_animation(liste[0])}
	# Die Quelle ist mit 24 Schlüsselbildern je Sekunde gesetzt; die kubische Zwischenrechnung des Imports überschwingt bei
	# schnellen Drehungen zwischen zwei Bildern (der Tritt von kick02 sprang bei 22,5 Bildern kurz senkrecht). Linear (Kugel-
	# interpolation) folgt dem kürzesten Weg und ist an den Schlüsselbildern gleich.
	var anim0: Animation = d["anim"]
	for i: int in anim0.get_track_count():
		anim0.track_set_interpolation_type(i, Animation.INTERPOLATION_LINEAR)
	var weg: int = _entspitzen(anim0)
	if weg > 0:
		print("  %s: %d Ausreißer-Schlüssel entfernt" % [name, weg])
	ap.play(liste[0])
	ap.pause()
	_cache[name] = d
	return d


## Entfernt Ausreißer aus den Drehspuren: ein Schlüssel, dessen Drehung weit (über SPITZE_GRAD) von dem abweicht, was die Nachbarn
## ergeben, während die Nachbarn nah beieinander liegen (Fehler der Bewegungserzeugung; bei kick02 stand die Hüfte-rechts-Spur in
## einem Zwischenbild bei 30 Schlüsseln je Sekunde kurz senkrecht). Rückgabe: Zahl der entfernten Schlüssel.
func _entspitzen(a: Animation) -> int:
	var entfernt: int = 0
	for i: int in a.get_track_count():
		if a.track_get_type(i) != Animation.TYPE_ROTATION_3D:
			continue
		var k: int = 1
		while k < a.track_get_key_count(i) - 1:
			var t0: float = a.track_get_key_time(i, k - 1)
			var t1: float = a.track_get_key_time(i, k)
			var t2: float = a.track_get_key_time(i, k + 1)
			var q0: Quaternion = a.track_get_key_value(i, k - 1)
			var q1: Quaternion = a.track_get_key_value(i, k)
			var q2: Quaternion = a.track_get_key_value(i, k + 1)
			var erwartet: Quaternion = q0.slerp(q2, (t1 - t0) / maxf(t2 - t0, 0.0001))
			var abweichung: float = rad_to_deg(q1.angle_to(erwartet))
			var nachbarn: float = rad_to_deg(q0.angle_to(q2))
			if abweichung > SPITZE_GRAD and nachbarn < abweichung * 0.5:
				print("    Ausreißer in %s bei %.3f s: %.0f Grad neben dem Erwarteten, Nachbarn %.0f Grad auseinander" % [String(a.track_get_path(i)).substr(String(a.track_get_path(i)).rfind(":") + 1), t1, abweichung, nachbarn])
				a.track_remove_key(i, k)
				entfernt += 1
			else:
				k += 1
	return entfernt


## Lädt das Modell (GLB): {"wurzel", "sk", "sk_pfad" (Pfad des Skeletts ab der Wurzel), "hueft_ruhe" (Vector3, global)}.
func _modell_laden() -> Dictionary:
	if not _modell.is_empty():
		return _modell
	var datei: String = _quelle.path_join(String(_manifest.get("modell", "modell.glb")))
	var doc: GLTFDocument = GLTFDocument.new()
	var state: GLTFState = GLTFState.new()
	var e: int = doc.append_from_file(datei, state)
	if e != OK:
		printerr("Modell nicht lesbar (Fehler %d): %s" % [e, datei])
		return {}
	var wurzel: Node = doc.generate_scene(state)
	root.add_child(wurzel)
	var sk: Skeleton3D = wurzel.find_children("*", "Skeleton3D", true, false)[0] as Skeleton3D
	var h: int = sk.find_bone(HUEFTE)
	_modell = {
		"wurzel": wurzel, "sk": sk, "sk_pfad": String(wurzel.get_path_to(sk)),
		"hueft_ruhe": (sk.global_transform * sk.get_bone_global_pose(h)).origin,
		"datei": datei,
	}
	return _modell


# ---------------------------------------------------------------------------
# Analyse
# ---------------------------------------------------------------------------

func _global(s: Dictionary, b: int) -> Transform3D:
	var sk: Skeleton3D = s["sk"]
	return sk.global_transform * sk.get_bone_global_pose(b)


## Merkmale der Pose zur Zeit t (Sekunden) einer Quelle, relativ zur Hüfte.
func _merkmale(s: Dictionary, t: float) -> Dictionary:
	var ap: AnimationPlayer = s["ap"]
	var sk: Skeleton3D = s["sk"]
	ap.seek(t, true)
	var h: Transform3D = _global(s, sk.find_bone(HUEFTE))
	var vorn: Vector3 = h.basis * Vector3(0, 0, 1)
	var m: Dictionary = {"hy": h.origin.y, "gier": rad_to_deg(atan2(vorn.x, vorn.z))}
	var hand_z: float = -9.0
	var hand_s: String = ""
	for n: String in HAENDE:
		var d: Vector3 = _global(s, sk.find_bone(n)).origin - h.origin
		if d.z > hand_z:
			hand_z = d.z
			hand_s = n.substr(10, 1)
	m["hand_z"] = hand_z
	m["hand_s"] = hand_s
	var z_max: float = -9.0
	var z_min: float = 9.0
	var z_s: String = ""
	var y_min: float = 9.0
	var zeh_z: Dictionary = {}
	var zeh_y: Dictionary = {}
	for n: String in ZEHEN:
		var o: Vector3 = _global(s, sk.find_bone(n)).origin
		var d: Vector3 = o - h.origin
		zeh_z[n] = d.z
		zeh_y[n] = o.y
		if d.z > z_max:
			z_max = d.z
			z_s = n.substr(10, 1)
		z_min = minf(z_min, d.z)
		y_min = minf(y_min, o.y)
	m["fuss_z"] = z_max
	m["fuss_s"] = z_s
	m["fuss_z_hinten"] = z_min
	m["zeh_y"] = y_min
	m["zeh_z"] = zeh_z
	m["zeh_y_je"] = zeh_y
	var k: Vector3 = _global(s, sk.find_bone(KOPF)).origin - h.origin
	m["kopf_y"] = k.y
	m["kopf_z"] = k.z
	return m


## Drehungen aller Knochen (lokal) in der Pose zur Zeit t.
func _drehungen(s: Dictionary, t: float) -> Array[Quaternion]:
	var ap: AnimationPlayer = s["ap"]
	var sk: Skeleton3D = s["sk"]
	ap.seek(t, true)
	var r: Array[Quaternion] = []
	for i: int in sk.get_bone_count():
		r.append(sk.get_bone_pose_rotation(i))
	return r


func _analyse(name: String) -> void:
	var s: Dictionary = _fbx(name)
	if s.is_empty():
		return
	var anim: Animation = s["anim"]
	var n: int = floori(anim.length * QUELL_FPS) + 1
	print("== %s: %s, %.3f s, %d Spuren, %d Bilder zu %.0f je Sekunde" % [name, String(s["name"]).substr(0, 40), anim.length, anim.get_track_count(), n, QUELL_FPS])
	print("  Bild   t[s]     hy   gier | hand   z  | fuss  z  hinten | zeh_y | kopf y     z |    e")
	var vor: Array[Quaternion] = _drehungen(s, 0.0)
	var reihe: Array[Dictionary] = []
	for i: int in n:
		var t: float = minf(float(i) / QUELL_FPS, anim.length)
		var m: Dictionary = _merkmale(s, t)
		var dr: Array[Quaternion] = _drehungen(s, t)
		var e: float = 0.0
		for j: int in dr.size():
			e += rad_to_deg(dr[j].angle_to(vor[j]))
		vor = dr
		m["e"] = e
		reihe.append(m)
		print("  %4d  %5.3f  %5.2f %6.1f | %s %5.2f | %s %5.2f %5.2f | %5.3f | %5.2f %5.2f | %5.1f" % [
			i, t, m["hy"], m["gier"], m["hand_s"], m["hand_z"], m["fuss_s"], m["fuss_z"], m["fuss_z_hinten"], m["zeh_y"], m["kopf_y"], m["kopf_z"], e])
	var sch: Dictionary = _schritt(s)
	if not sch.is_empty():
		print("  Schritt: Stützfuß-Tempo %.3f Einheiten/s über %d Paare, Zyklus %.3f s → Strecke je Zyklus %.3f Einheiten = %.1f Spielpixel; Zyklus bei Gehtempo %d Ticks" % [
			sch["tempo"], sch["paare"], sch["zyklus"], sch["strecke"], sch["schritt_px"], sch["ticks"]])


## Strecke, die die Figur je Durchlauf des Clips zurücklegen muss, damit der Fuß am Boden nicht rutscht: mittlere Geschwindigkeit, mit
## der sich der Zeh am Boden relativ zur Hüfte nach hinten bewegt, mal Länge des Clips. Leer ohne Standphasen.
func _schritt(s: Dictionary, von: float = 0.0, bis: float = -1.0) -> Dictionary:
	var anim: Animation = s["anim"]
	var ende: float = anim.length if bis < 0.0 else bis
	var n: int = floori((ende - von) * QUELL_FPS * 2.0) + 1
	var z: Array[Dictionary] = []
	var y_min: float = 9.0
	for i: int in n:
		var m: Dictionary = _merkmale(s, von + float(i) / (QUELL_FPS * 2.0))
		z.append(m)
		y_min = minf(y_min, float(m["zeh_y"]))
	var summe: float = 0.0
	var paare: int = 0
	var dt: float = 1.0 / (QUELL_FPS * 2.0)
	for i: int in range(n - 1):
		for zeh: String in ZEHEN:
			var y0: float = float((z[i]["zeh_y_je"] as Dictionary)[zeh])
			var y1: float = float((z[i + 1]["zeh_y_je"] as Dictionary)[zeh])
			if y0 <= y_min + BODEN_TOLERANZ and y1 <= y_min + BODEN_TOLERANZ:
				var dz: float = float((z[i + 1]["zeh_z"] as Dictionary)[zeh]) - float((z[i]["zeh_z"] as Dictionary)[zeh])
				summe += -dz / dt
				paare += 1
	if paare == 0:
		return {}
	var tempo: float = summe / float(paare)
	var zyklus: float = ende - von
	var strecke: float = tempo * zyklus
	var px: float = strecke * SPIELPIXEL_JE_EINHEIT
	return {"tempo": tempo, "paare": paare, "zyklus": zyklus, "strecke": strecke, "schritt_px": px, "ticks": roundi(px / LAUF_X)}


# ---------------------------------------------------------------------------
# Bauen
# ---------------------------------------------------------------------------

func _bauen(aus: String, nur: String) -> int:
	var modell: Dictionary = _modell_laden()
	if modell.is_empty():
		return 1
	DirAccess.make_dir_recursive_absolute(aus.path_join("clips"))
	var bib: AnimationLibrary = AnimationLibrary.new()
	var pfad_res: String = aus.path_join("animationen.res")
	if nur != "" and FileAccess.file_exists(pfad_res):
		var alt: Resource = ResourceLoader.load(pfad_res, "", ResourceLoader.CACHE_MODE_IGNORE)
		if alt is AnimationLibrary:
			bib = alt as AnimationLibrary
	var clips: Dictionary = _manifest["clips"]
	var fehler: int = 0
	for name: String in clips:
		if nur != "" and name != nur:
			continue
		var c: Dictionary = clips[name]
		var ergebnis: Dictionary = _clip_bauen(name, c, modell)
		if ergebnis.is_empty():
			fehler += 1
			continue
		var anim: Animation = ergebnis["anim"]
		if bib.has_animation(name):
			bib.remove_animation(name)
		bib.add_animation(name, anim)
		var f: FileAccess = FileAccess.open(aus.path_join("clips").path_join(name + ".txt"), FileAccess.WRITE)
		f.store_string(String(ergebnis["text"]))
		f.close()
		print("%-10s %6.3f s, %3d Spuren  %s" % [name, anim.length, anim.get_track_count(), String(ergebnis["info"])])
	var e: int = ResourceSaver.save(bib, pfad_res, ResourceSaver.FLAG_COMPRESS)
	if e != OK:
		printerr("animationen.res nicht schreibbar (Fehler %d)" % e)
		return 1
	# Modell und .gdignore
	var quelle_glb: String = String(modell["datei"])
	var bytes: PackedByteArray = FileAccess.get_file_as_bytes(quelle_glb)
	var g: FileAccess = FileAccess.open(aus.path_join("vela.glb"), FileAccess.WRITE)
	g.store_buffer(bytes)
	g.close()
	var ig: FileAccess = FileAccess.open(aus.path_join(".gdignore"), FileAccess.WRITE)
	ig.close()
	print("geschrieben: %s (%d Clips, Modell %.1f MB)" % [aus, bib.get_animation_list().size(), float(bytes.size()) / 1048576.0])
	return fehler


## Baut einen Clip des Manifests: {"anim": Animation, "text": clip.txt, "info": String}; leer bei Fehler.
func _clip_bauen(name: String, c: Dictionary, modell: Dictionary) -> Dictionary:
	var typ: String = String(c.get("typ", "ablauf"))
	var hueft: Vector3 = modell["hueft_ruhe"]
	var pfad: String = String(modell["sk_pfad"])
	var anim: Animation = null
	var von: float = float(c.get("von", 0.0))
	var bis: float = -1.0
	var daten: Dictionary = {}
	var info: String = ""
	match typ:
		"stand":
			var basis: Dictionary = _fbx(String(c["basis"]))
			var bew: Dictionary = _fbx(String(c["bewegung"]))
			if basis.is_empty() or bew.is_empty():
				return {}
			anim = _stand_bauen(basis, bew, float(c.get("basis_zeit", 0.0)), float(c.get("verstaerkung", 1.0)), pfad, hueft)
			bis = anim.length
			daten["schleife"] = String(c.get("schleife", "pingpong"))
			info = "Pose aus %s, Bewegung aus %s (x%.1f)" % [c["basis"], c["bewegung"], float(c.get("verstaerkung", 1.0))]
		"pose":
			var q: Dictionary = _fbx(String(c["quelle"]))
			if q.is_empty():
				return {}
			anim = _pose_bauen(q, float(c["zeit"]), pfad, hueft)
			bis = anim.length
			info = "Pose aus %s bei %.3f s" % [c["quelle"], float(c["zeit"])]
		_:
			var q2: Dictionary = _fbx(String(c["quelle"]))
			if q2.is_empty():
				return {}
			var qa: Animation = q2["anim"]
			bis = float(c.get("bis", qa.length))
			anim = _abtasten(qa, von, bis, pfad, hueft, int(c.get("hueft_mitte", 1)) != 0)
			info = "aus %s, %.3f bis %.3f s" % [c["quelle"], von, bis]
			if bool(c.get("schritt", false)):
				var sch: Dictionary = _schritt(q2, von, bis)
				if sch.is_empty():
					printerr("%s: keine Standphase gefunden, Schrittlänge fehlt" % name)
					return {}
				daten["schritt_px"] = roundi(float(sch["schritt_px"]))
				daten["zyklus_ticks"] = int(sch["ticks"])
				info += "; Schritt %d Spielpixel, Zyklus %d Ticks" % [daten["schritt_px"], daten["zyklus_ticks"]]
	var laenge: float = bis - von if typ != "stand" and typ != "pose" else anim.length
	var bilder: int = roundi(laenge * float(EINHEIT)) + 1
	var z: Array[String] = []
	z.append("# Clip %s der 3D-Vela, erzeugt von werkzeuge/dreid_bauen.gd (nicht von Hand ändern). Zeiteinheit 1/%d s, Bilder 1-basiert." % [name, EINHEIT])
	z.append("version=1")
	z.append("name=" + name)
	z.append("quelle=" + String(c.get("quelle", c.get("basis", ""))))
	z.append("fps=%d" % EINHEIT)
	z.append("bilder=%d" % bilder)
	z.append("groesse=1,1")
	z.append("anker=0,0")
	z.append("weich=0")
	z.append("zyklus_bilder=%d" % bilder)
	z.append("zyklus_start=1")
	if daten.has("zyklus_ticks"):
		z.append("zyklus_ticks=%d" % int(daten["zyklus_ticks"]))
	if daten.has("schritt_px"):
		z.append("schritt_px=%d" % int(daten["schritt_px"]))
	if daten.has("schleife"):
		z.append("schleife=" + String(daten["schleife"]))
	var ev: Dictionary = c.get("ereignisse", {})
	# Ereigniszeiten (Sekunden der Quelldatei) → 1-basierte Bilder der Zeiteinheit
	var basis_keys: Array[String] = ["ausholen", "kontakt", "rueckzug", "ruhe"]
	for k: String in basis_keys:
		if ev.has(k):
			z.append("%s=%d" % [k, _bild(float(ev[k]) - von)])
	z.append("rueckkehr=" + String(c.get("rueckkehr", "vorwaerts")))
	for k: String in ev:
		z.append("ereignis_%s=%d" % [k, _bild(float(ev[k]) - von)])
	for k: String in c.get("werte", {}):
		z.append("%s=%s" % [k, str(c["werte"][k])])
	return {"anim": anim, "text": "\n".join(PackedStringArray(z)) + "\n", "info": info}


## 1-basiertes Bild der Zeiteinheit zu einer Zeit in Sekunden.
func _bild(t: float) -> int:
	return maxi(roundi(t * float(EINHEIT)), 0) + 1


## Neuer Pfad einer Spur: Skelett des Modells (ab der Wurzel) und Knochenname der Quellspur.
func _spurpfad(quell: NodePath, sk_pfad: String) -> NodePath:
	var s: String = String(quell)
	var p: int = s.rfind(":")
	return NodePath("%s:%s" % [sk_pfad, s.substr(p + 1)])


## Animation mit eigenem Takt: tastet die Spuren `von` bis `bis` der Quelle mit TAKT Bildern je Sekunde ab (Drehungen und
## Verschiebungen; kurze Wege dazwischen sind linear bzw. Kugelinterpolation). Die Hüfte bleibt waagrecht auf der Ruheposition.
func _abtasten(q: Animation, von: float, bis: float, sk_pfad: String, hueft: Vector3, mitte: bool) -> Animation:
	var a: Animation = Animation.new()
	var laenge: float = bis - von
	a.length = laenge
	a.loop_mode = Animation.LOOP_NONE
	var n: int = ceili(laenge * float(TAKT))
	for i: int in q.get_track_count():
		var typ: int = q.track_get_type(i)
		if typ != Animation.TYPE_POSITION_3D and typ != Animation.TYPE_ROTATION_3D:
			continue
		var t: int = a.add_track(typ)
		a.track_set_path(t, _spurpfad(q.track_get_path(i), sk_pfad))
		a.track_set_interpolation_type(t, Animation.INTERPOLATION_LINEAR)
		var ist_hueft: bool = String(q.track_get_path(i)).ends_with(":" + HUEFTE)
		for k: int in range(n + 1):
			var zeit: float = minf(float(k) / float(TAKT), laenge)
			if typ == Animation.TYPE_POSITION_3D:
				var p: Vector3 = q.position_track_interpolate(i, von + zeit)
				if ist_hueft and mitte:
					p = Vector3(hueft.x, p.y, hueft.z)
				a.position_track_insert_key(t, zeit, p)
			else:
				a.rotation_track_insert_key(t, zeit, q.rotation_track_interpolate(i, von + zeit))
	return a


## Spur der Quelle mit gleichem Pfad (nach Knochenname) und Typ; −1, wenn es sie nicht gibt.
func _spur_von(q: Animation, knochen: String, typ: int) -> int:
	for i: int in q.get_track_count():
		if q.track_get_type(i) == typ and String(q.track_get_path(i)).ends_with(":" + knochen):
			return i
	return -1


## Eine Pose (Zeit t der Quelle) als Animation von einem Tick Länge.
func _pose_bauen(q: Dictionary, t: float, sk_pfad: String, hueft: Vector3) -> Animation:
	var qa: Animation = q["anim"]
	var a: Animation = _abtasten(qa, t, minf(t + 1.0 / float(TAKT), qa.length), sk_pfad, hueft, true)
	return a


## Kampfhaltung: Pose der Quelle `basis` zur Zeit `t0`, dazu die kleinen Bewegungen (Atmen, Gewichtsverlagerung) der Quelle
## `bewegung` als Abweichung von deren erstem Bild, verstärkt um `gain`. Länge der Bewegung.
func _stand_bauen(basis: Dictionary, bew: Dictionary, t0: float, gain: float, sk_pfad: String, hueft: Vector3) -> Animation:
	var qb: Animation = basis["anim"]
	var qm: Animation = bew["anim"]
	var a: Animation = Animation.new()
	a.length = qm.length
	a.loop_mode = Animation.LOOP_NONE
	var n: int = ceili(qm.length * float(TAKT))
	var groesste: float = 0.0
	for i: int in qb.get_track_count():
		var typ: int = qb.track_get_type(i)
		if typ != Animation.TYPE_POSITION_3D and typ != Animation.TYPE_ROTATION_3D:
			continue
		var pfad: String = String(qb.track_get_path(i))
		var knochen: String = pfad.substr(pfad.rfind(":") + 1)
		var t: int = a.add_track(typ)
		a.track_set_path(t, NodePath("%s:%s" % [sk_pfad, knochen]))
		a.track_set_interpolation_type(t, Animation.INTERPOLATION_LINEAR)
		var j: int = _spur_von(qm, knochen, typ)
		if typ == Animation.TYPE_POSITION_3D:
			var p0: Vector3 = qb.position_track_interpolate(i, t0)
			var m0: Vector3 = qm.position_track_interpolate(j, 0.0) if j >= 0 else Vector3.ZERO
			for k: int in range(n + 1):
				var zeit: float = minf(float(k) / float(TAKT), qm.length)
				var d: Vector3 = (qm.position_track_interpolate(j, zeit) - m0) * gain if j >= 0 else Vector3.ZERO
				var p: Vector3 = p0 + d
				if knochen == HUEFTE:
					p = Vector3(hueft.x, p.y, hueft.z)
				a.position_track_insert_key(t, zeit, p)
		else:
			var q0: Quaternion = qb.rotation_track_interpolate(i, t0)
			var r0: Quaternion = qm.rotation_track_interpolate(j, 0.0) if j >= 0 else Quaternion.IDENTITY
			for k: int in range(n + 1):
				var zeit: float = minf(float(k) / float(TAKT), qm.length)
				var dq: Quaternion = Quaternion.IDENTITY
				if j >= 0:
					var delta: Quaternion = r0.inverse() * qm.rotation_track_interpolate(j, zeit)
					dq = Quaternion.IDENTITY.slerp(delta, gain)
					groesste = maxf(groesste, rad_to_deg(dq.angle_to(Quaternion.IDENTITY)))
				a.rotation_track_insert_key(t, zeit, (q0 * dq).normalized())
	print("  Kampfhaltung: größte Abweichung der Bewegung %.2f Grad" % groesste)
	return a
