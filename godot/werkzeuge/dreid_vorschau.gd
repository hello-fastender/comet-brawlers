## 3D-Vorschau für Versuche mit 3D-Figuren (Vela als GLB von Tripo, Meshy …): lädt eine GLB-Datei zur Laufzeit
## (ohne Import im Editor), zeichnet sie mit flachen Farbstufen und dunkler Umrisslinie, orthografisch, in der
## Spielgröße der gemalten Vela, und schreibt Bilder. So lässt sich die 3D-Figur neben die gemalten Clips legen.
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/dreid_vorschau.gd -- \
##       --glb <datei.glb> --aus <ordner> [--info] [--ansichten] [--anim <name> [--fps 24] [--bilder <n>]]
##       [--hoehe 284] [--seite 512] [--blick 1] [--drehung 0] [--umriss 2] [--schatten 1]
##   ... --erzeuge-test <datei.glb>     schreibt die Testfigur als GLB (zum Prüfen dieses Werkzeugs)
##
##   --glb <datei>     die Figur; ohne: Testfigur aus Kapseln (Licht, Umriss und Kamera prüfen)
##   --aus <ordner>    Ausgabeordner (absolut oder ab Repo-Wurzel). Nicht ins Repo legen.
##   --info            nur ausgeben: Knoten, Netze, Knochen, Animationen mit Länge, Maße der Figur (kein Bild)
##   --ansichten       Ruhepose von vorn, Seite, hinten und schräg als ansicht_<name>.png
##   --anim <name>     Einzelbilder f0001.png … der Animation, von der Seite; --anim liste gibt die Namen aus
##   --fps, --bilder   Bilder je Sekunde (24) und Anzahl (Standard: ganze Länge)
##   --hoehe <px>      Höhe der Figur im Bild; die gemalte Vela ist im Spiel 284 Pixel hoch (1536 × 896)
##   --seite <px>      Kantenlänge des quadratischen Bilds (512)
##   --blick 1|-1      Blick nach rechts (1) oder links (-1) in der Seitenansicht
##   --drehung <grad>  Figur um die Hochachse drehen, falls das Modell nicht nach +Z (glTF-Vorne) schaut
##   --umriss <px>     Dicke der Umrisslinie in Bildpixeln (2)
##   --schatten <0..1> Stärke der Farbstufen, 0 = ganz flach (1)
##
## Die Figur steht mit den Füßen bei 88 % der Bildhöhe, mittig. Das Bild hat durchsichtigen Grund.
extends SceneTree

const FUSS_ANTEIL: float = 0.88

const FARBE_CODE: String = """
shader_type spatial;
render_mode unshaded, cull_back;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform vec4 albedo_color : source_color = vec4(1.0);
uniform bool hat_textur = false;
uniform float schatten = 1.0;
uniform vec3 licht_richtung = vec3(-0.35, 0.55, 0.75);

void fragment() {
	vec3 c = albedo_color.rgb;
	if (hat_textur) {
		c *= texture(albedo_tex, UV).rgb;
	}
	float d = dot(normalize(NORMAL), normalize(licht_richtung));
	float stufe = d > 0.25 ? 1.0 : (d > -0.2 ? 0.86 : 0.72);
	ALBEDO = c * mix(1.0, stufe, schatten);
}
"""

const UMRISS_CODE: String = """
shader_type spatial;
render_mode unshaded, cull_front;
uniform float breite = 0.01;
uniform vec4 farbe : source_color = vec4(0.08, 0.05, 0.05, 1.0);

void vertex() {
	VERTEX += NORMAL * breite;
}

void fragment() {
	ALBEDO = farbe.rgb;
}
"""

var _aus: String = ""
var _seite: int = 512
var _hoehe_px: float = 284.0
var _blick: int = 1
var _drehung: float = 0.0
var _umriss_px: float = 2.0
var _schatten: float = 1.0
var _vp: SubViewport = null
var _kamera: Camera3D = null
var _figur: Node3D = null
var _box: AABB = AABB()
var _einheit: float = 0.01
var _nr: int = 0


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
	_aus = _pfad(String(arg.get("aus", "")))
	_seite = int(arg.get("seite", "512"))
	_hoehe_px = float(arg.get("hoehe", "284"))
	_blick = -1 if int(arg.get("blick", "1")) < 0 else 1
	_drehung = float(arg.get("drehung", "0"))
	_umriss_px = float(arg.get("umriss", "2"))
	_schatten = float(arg.get("schatten", "1"))
	if arg.has("erzeuge-test"):
		_testfigur_schreiben(_pfad(String(arg["erzeuge-test"])))
		quit(0)
		return
	if String(arg.get("aus", "")) == "" and not arg.has("info"):
		printerr("--aus <ordner> fehlt")
		quit(1)
		return
	_figur = _lade(String(arg.get("glb", "")))
	if _figur == null:
		quit(1)
		return
	_figur.rotation_degrees.y = _drehung
	if arg.has("info"):
		root.add_child(_figur)
		await process_frame
		_info(_figur)
		quit(0)
		return
	DirAccess.make_dir_recursive_absolute(_aus)
	_aufbauen()
	for i: int in 3:
		await process_frame
	if arg.has("ansichten"):
		for name: String in ["vorn", "seite", "hinten", "schraeg"]:
			_kamera_setzen(name)
			await _bild("ansicht_%s.png" % name)
	if arg.has("anim"):
		await _animation(String(arg["anim"]), int(arg.get("fps", "24")), int(arg.get("bilder", "0")))
	if not arg.has("ansichten") and not arg.has("anim"):
		_kamera_setzen("seite")
		await _bild("ruhe.png")
	quit(0)


# ---------------------------------------------------------------------------
# Figur laden
# ---------------------------------------------------------------------------

func _lade(glb: String) -> Node3D:
	if glb == "":
		print("keine --glb: Testfigur")
		return _testfigur()
	var datei: String = _pfad(glb)
	var doc: GLTFDocument = GLTFDocument.new()
	var state: GLTFState = GLTFState.new()
	var fehler: int = doc.append_from_file(datei, state)
	if fehler != OK:
		printerr("GLB nicht lesbar (Fehler %d): %s" % [fehler, datei])
		return null
	var wurzel: Node = doc.generate_scene(state)
	if wurzel == null or not (wurzel is Node3D):
		printerr("keine 3D-Szene in ", datei)
		return null
	return wurzel as Node3D


## Testfigur: Kapseln für Rumpf, Beine, Arme, Kugel als Kopf, Würfel als Nase (zeigt nach +Z).
func _testfigur() -> Node3D:
	var wurzel: Node3D = Node3D.new()
	wurzel.name = "Testfigur"
	var bild: Image = Image.create(64, 64, false, Image.FORMAT_RGBA8)
	for y: int in 64:
		for x: int in 64:
			var k: float = 0.55 + 0.45 * float(x) / 63.0
			bild.set_pixel(x, y, Color(k, k * (0.8 + 0.2 * float(y) / 63.0), 1.0, 1.0))
	var tex: ImageTexture = ImageTexture.create_from_image(bild)
	var blau: StandardMaterial3D = StandardMaterial3D.new()
	blau.albedo_texture = tex
	blau.albedo_color = Color(0.25, 0.45, 0.9)
	var hose: StandardMaterial3D = StandardMaterial3D.new()
	hose.albedo_color = Color(0.1, 0.15, 0.35)
	var haut: StandardMaterial3D = StandardMaterial3D.new()
	haut.albedo_color = Color(0.95, 0.75, 0.6)
	_teil(wurzel, CapsuleMesh.new(), blau, Vector3(0, 1.15, 0), Vector3.ZERO, 0.17, 0.62)
	_teil(wurzel, SphereMesh.new(), haut, Vector3(0, 1.62, 0), Vector3.ZERO, 0.13, 0.26)
	_teil(wurzel, BoxMesh.new(), haut, Vector3(0, 1.6, 0.14), Vector3.ZERO, 0.04, 0.05)
	_teil(wurzel, CapsuleMesh.new(), hose, Vector3(-0.1, 0.46, 0), Vector3.ZERO, 0.08, 0.92)
	_teil(wurzel, CapsuleMesh.new(), hose, Vector3(0.1, 0.46, 0), Vector3.ZERO, 0.08, 0.92)
	_teil(wurzel, CapsuleMesh.new(), blau, Vector3(-0.36, 1.08, 0), Vector3(0, 0, 35), 0.06, 0.6)
	_teil(wurzel, CapsuleMesh.new(), blau, Vector3(0.36, 1.08, 0), Vector3(0, 0, -35), 0.06, 0.6)
	return wurzel


func _teil(eltern: Node3D, mesh: PrimitiveMesh, mat: Material, ort: Vector3, drehung_grad: Vector3, radius: float, hoehe: float) -> void:
	if mesh is CapsuleMesh:
		(mesh as CapsuleMesh).radius = radius
		(mesh as CapsuleMesh).height = hoehe
	elif mesh is SphereMesh:
		(mesh as SphereMesh).radius = radius
		(mesh as SphereMesh).height = hoehe
	elif mesh is BoxMesh:
		(mesh as BoxMesh).size = Vector3(radius * 2.0, radius * 2.0, radius * 2.0)
	var mi: MeshInstance3D = MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = null
	mesh.material = mat
	mi.position = ort
	mi.rotation_degrees = drehung_grad
	eltern.add_child(mi)


func _testfigur_schreiben(pfad: String) -> void:
	var fig: Node3D = _testfigur()
	var doc: GLTFDocument = GLTFDocument.new()
	var state: GLTFState = GLTFState.new()
	var f1: int = doc.append_from_scene(fig, state)
	var f2: int = doc.write_to_filesystem(state, pfad)
	print("Testfigur geschrieben: %s (append %d, write %d)" % [pfad, f1, f2])


# ---------------------------------------------------------------------------
# Aufbau: Viewport, Kamera, Materialien
# ---------------------------------------------------------------------------

func _aufbauen() -> void:
	_vp = SubViewport.new()
	_vp.size = Vector2i(_seite, _seite)
	_vp.transparent_bg = true
	_vp.own_world_3d = true
	_vp.msaa_3d = Viewport.MSAA_4X
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(_vp)
	_vp.add_child(_figur)
	_box = _masse(_figur)
	_einheit = _box.size.y / _hoehe_px
	_materialien(_figur)
	_kamera = Camera3D.new()
	_kamera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_kamera.size = float(_seite) * _einheit
	_kamera.near = 0.01
	_kamera.far = _box.size.y * 40.0
	_vp.add_child(_kamera)
	_kamera.current = true
	print("Figur: Höhe %.3f, Breite %.3f, Tiefe %.3f; %.5f Welteinheiten je Pixel" % [_box.size.y, _box.size.x, _box.size.z, _einheit])


## Alle Netze unterhalb von `n`.
func _netze(n: Node, aus: Array[MeshInstance3D]) -> void:
	if n is MeshInstance3D:
		aus.append(n as MeshInstance3D)
	for k: Node in n.get_children():
		_netze(k, aus)


## Maße der Figur in Weltkoordinaten (Ruhepose).
func _masse(n: Node3D) -> AABB:
	var netze: Array[MeshInstance3D] = []
	_netze(n, netze)
	var alle: AABB = AABB()
	var erstes: bool = true
	for mi: MeshInstance3D in netze:
		var b: AABB = mi.get_aabb()
		var xf: Transform3D = mi.global_transform if mi.is_inside_tree() else mi.transform
		var t: AABB = xf * b
		if erstes:
			alle = t
			erstes = false
		else:
			alle = alle.merge(t)
	return alle


func _materialien(n: Node3D) -> void:
	var umriss: ShaderMaterial = ShaderMaterial.new()
	var us: Shader = Shader.new()
	us.code = UMRISS_CODE
	umriss.shader = us
	umriss.set_shader_parameter("breite", _umriss_px * _einheit)
	var fs: Shader = Shader.new()
	fs.code = FARBE_CODE
	var netze: Array[MeshInstance3D] = []
	_netze(n, netze)
	for mi: MeshInstance3D in netze:
		for s: int in mi.mesh.get_surface_count():
			var alt: Material = mi.get_active_material(s)
			var m: ShaderMaterial = ShaderMaterial.new()
			m.shader = fs
			m.set_shader_parameter("schatten", _schatten)
			if alt is BaseMaterial3D:
				var b: BaseMaterial3D = alt as BaseMaterial3D
				m.set_shader_parameter("albedo_color", b.albedo_color)
				if b.albedo_texture != null:
					m.set_shader_parameter("albedo_tex", b.albedo_texture)
					m.set_shader_parameter("hat_textur", true)
			if _umriss_px > 0.0:
				m.next_pass = umriss
			mi.set_surface_override_material(s, m)


## Kamera für eine Ansicht: orthografisch, Füße bei FUSS_ANTEIL der Bildhöhe, mittig über der Figur.
func _kamera_setzen(ansicht: String) -> void:
	var mitte: Vector3 = _box.get_center()
	var abstand: float = _box.size.y * 10.0
	var richtung: Vector3 = Vector3(-1, 0, 0)
	match ansicht:
		"vorn":
			richtung = Vector3(0, 0, 1)
		"hinten":
			richtung = Vector3(0, 0, -1)
		"schraeg":
			richtung = Vector3(-0.7, 0, 0.7).normalized()
		_:
			richtung = Vector3(-float(_blick), 0, 0)
	var hoehe_kamera: float = _box.position.y + _kamera.size * (FUSS_ANTEIL - 0.5)
	var ziel: Vector3 = Vector3(mitte.x, hoehe_kamera, mitte.z)
	_kamera.look_at_from_position(ziel + richtung * abstand, ziel, Vector3.UP)


func _bild(name: String) -> void:
	await process_frame
	await process_frame
	var img: Image = _vp.get_texture().get_image()
	img.save_png(_aus.path_join(name))
	_nr += 1


func _animation(name: String, fps: int, bilder: int) -> void:
	var spieler: Array[Node] = _figur.find_children("*", "AnimationPlayer", true, false)
	if spieler.is_empty():
		printerr("kein AnimationPlayer in der Figur")
		return
	var ap: AnimationPlayer = spieler[0] as AnimationPlayer
	if name == "liste" or not ap.has_animation(name):
		print("Animationen:")
		for a: StringName in ap.get_animation_list():
			print("  %s (%.2f s)" % [a, ap.get_animation(a).length])
		return
	var laenge: float = ap.get_animation(name).length
	var n: int = bilder if bilder > 0 else maxi(1, roundi(laenge * float(fps)))
	ap.play(name)
	ap.pause()
	_kamera_setzen("seite")
	for i: int in n:
		ap.seek(float(i) / float(fps), true)
		await _bild("f%04d.png" % (i + 1))
	print("Animation %s: %d Bilder (%.2f s) in %s" % [name, n, laenge, _aus])


# ---------------------------------------------------------------------------
# Auskunft
# ---------------------------------------------------------------------------

func _info(n: Node3D) -> void:
	var netze: Array[MeshInstance3D] = []
	_netze(n, netze)
	print("Netze: %d" % netze.size())
	var fl: int = 0
	for mi: MeshInstance3D in netze:
		var flaechen: int = 0
		for s: int in mi.mesh.get_surface_count():
			var arr: Array = mi.mesh.surface_get_arrays(s)
			var idx: Variant = arr[Mesh.ARRAY_INDEX]
			if idx != null:
				flaechen += (idx as PackedInt32Array).size() / 3
			else:
				flaechen += (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size() / 3
		fl += flaechen
		var mats: String = ""
		for s: int in mi.mesh.get_surface_count():
			var m: Material = mi.get_active_material(s)
			var tx: String = "ohne Textur"
			if m is BaseMaterial3D and (m as BaseMaterial3D).albedo_texture != null:
				var t: Texture2D = (m as BaseMaterial3D).albedo_texture
				tx = "Textur %dx%d" % [t.get_width(), t.get_height()]
			mats += " [%s, %s]" % [m.get_class() if m != null else "kein Material", tx]
		print("  %s: %d Dreiecke, Oberflächen %d%s, Skelett: %s" % [mi.name, flaechen, mi.mesh.get_surface_count(), mats, str(mi.skeleton)])
	print("Dreiecke gesamt: %d" % fl)
	for s: Node in n.find_children("*", "Skeleton3D", true, false):
		var sk: Skeleton3D = s as Skeleton3D
		print("Skelett %s: %d Knochen" % [sk.name, sk.get_bone_count()])
		var namen: PackedStringArray = PackedStringArray()
		for b: int in sk.get_bone_count():
			namen.append(sk.get_bone_name(b))
		print("  " + ", ".join(namen))
	for a: Node in n.find_children("*", "AnimationPlayer", true, false):
		var ap: AnimationPlayer = a as AnimationPlayer
		print("AnimationPlayer %s:" % ap.name)
		for an: StringName in ap.get_animation_list():
			print("  %s (%.2f s, %d Spuren)" % [an, ap.get_animation(an).length, ap.get_animation(an).get_track_count()])
	var box: AABB = _masse(n)
	print("Maße (Ruhepose): Höhe %.3f, Breite %.3f, Tiefe %.3f, Fuß y = %.3f" % [box.size.y, box.size.x, box.size.z, box.position.y])
