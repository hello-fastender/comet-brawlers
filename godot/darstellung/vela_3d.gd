## Vela als 3D-Figur (Versuch „Vela in 3D“, docs/dreid-vela.md): ein Sprite, das das Bild eines kleinen 3D-Raums zeigt, in dem das
## Modell (Tripo, Mixamo-Skelett) mit flachen Farbstufen und dunkler Umrisslinie von der Seite gezeichnet wird, orthografisch, in der
## Größe der gemalten Vela (142 Basispixel hohe Figur, DarstellungMasse.ASSET_ZU_BILD). Die Logik bleibt Taktgeber: je Aufruf von
## `aus_figur` wird aus Aktion und Aktionsuhr eine Zeit im Clip bestimmt (DarstellungVela3DTabelle) und das Skelett auf diese Zeit
## gesetzt (die Spuren der Animation werden von Hand abgetastet, es gibt keinen AnimationPlayer: die Pose hängt nur von Clip und
## Zeit ab, auch außerhalb des Baums und ohne Bilder dazwischen); die Animation läuft nie von selbst.
##
## Dateien (grafik/vela_3d/, gebaut von werkzeuge/dreid_bauen.gd, ohne Editor-Import geladen):
##   vela.glb          Modell mit 2048-Textur; animationen.res: AnimationLibrary mit allen Clips (60 Schlüsselbilder je Sekunde).
## Wo es für eine Aktion keinen 3D-Clip gibt, bleibt der Node unsichtbar; spiel.gd zeigt dann die gemalte Vela, die Puppe oder den
## Platzhalter.
##
## Ursprung des Nodes = Fußpunkt in Bildpixeln (wie DarstellungVelaFrames; die Hauptsitzung setzt `position` aus
## DarstellungZeichnen.figurFuss(welt) + DARSTELLUNG / 2 Bildpixel nach rechts). Blick links: scale.x = −1.
##
## Zur Pose (alles nach dem Setzen der Zeit, jedes Mal von vorn, damit nichts aufläuft):
##   - Fäuste: Tripo-Animationen bewegen die Finger nicht (offene Hände); alle Fingerglieder werden um FAUST_GRAD eingerollt.
##   - Boden: In Luftclips (Sprung) kommt die Höhe aus der Logik; der Clip wird so weit nach unten verschoben, dass die tieferen
##     Zehen am Fußpunkt stehen, sonst stiege die Figur doppelt.
##   - Überblendung: Beim Wechsel zu Stand, Gehen, Sprint oder Aufstehen mischt die Pose in BLEND_TICKS Logikschritten von der letzten
##     Pose zur neuen (Drehungen und Hüfthöhe). Beim Wechsel zu Schlägen, Treffern und Sprüngen springt sie sofort, wie die Bilder
##     der gemalten Clips; der Treffer soll im ersten Frame zu sehen sein.
class_name DarstellungVela3D
extends Node2D

const ORDNER: String = "res://grafik/vela_3d/"
const MODELL: String = "vela.glb"
const BIBLIOTHEK: String = "animationen.res"

## Kantenlänge des quadratischen Bildes (Bildpixel); die Füße stehen bei FUSS_ANTEIL der Höhe, die Figur mittig (Hüfte).
const BILDKANTE: int = 512
const FUSS_ANTEIL: float = 0.88
## Höhe der Figur im Spielbild in Bildpixeln: wie die gemalte Vela (142 Basispixel mal ASSET_ZU_BILD).
const FIGURHOEHE: float = 142.0 * float(DarstellungMasse.ASSET_ZU_BILD)
## Dicke der Umrisslinie in Bildpixeln (über 1,2 verschmiert sie das Gesicht).
const UMRISS_PX: float = 1.0
const SAETTIGUNG: float = 1.15
## Einrollwinkel der Finger in Grad um die lokale z-Achse des Fingerglieds (gilt für beide Hände; Daumen halb so stark).
const FAUST_GRAD: float = 70.0
## Größte Kantenlänge der Textur im Speicher (Tripo liefert bis 8192, das Modell hat 2048).
const TEXTUR_MAX: int = 2048
## Clips, in die überblendet wird, und die Dauer in Logikschritten.
const BLEND_TICKS: Dictionary = {"stand": 5, "gehen": 4, "sprint": 4, "aufstehen": 3}

const HUEFTE: String = "mixamorig_Hips"
const ZEHEN: Array[String] = ["mixamorig_LeftToeBase", "mixamorig_RightToeBase"]

const FARBE_CODE: String = """
shader_type spatial;
render_mode unshaded, cull_back;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform vec4 albedo_color : source_color = vec4(1.0);
uniform bool hat_textur = false;
uniform float schatten = 1.0;
uniform float saettigung = 1.0;
uniform vec3 licht_richtung = vec3(-0.35, 0.55, 0.75);

void fragment() {
	vec3 c = albedo_color.rgb;
	if (hat_textur) {
		c *= texture(albedo_tex, UV).rgb;
	}
	float grau = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(grau), c, saettigung);
	float d = dot(normalize(NORMAL), normalize(licht_richtung));
	float stufe = d > 0.25 ? 1.0 : (d > -0.2 ? 0.8 : 0.6);
	c *= mix(1.0, stufe, schatten);
	ALBEDO = c;
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

var _vp: SubViewport = null
var _kamera: Camera3D = null
var _modell: Node3D = null
var _sk: Skeleton3D = null
var _bib: AnimationLibrary = null
## Je Clip die Spuren mit Knochen: Name → Array von {"i": Spurnummer, "b": Knochen, "rot": Drehung (sonst Verschiebung)}
var _spuren: Dictionary = {}
var _sprite: Sprite2D = null
var _geladen: bool = false
var _box: AABB = AABB()
var _einheit: float = 0.01
var _hueft: int = -1
var _hueft_ruhe: Vector3 = Vector3.ZERO
var _zehen: Array[int] = []
var _boden_ref: float = 0.0
var _faeuste: Array[Dictionary] = []
var _texturen: Dictionary = {}

var _clip: String = ""
var _zeit: float = 0.0
var _blick: int = 1
var _luft: float = 0.0
var _letzte: Array[Quaternion] = []
var _letzte_hueft: Vector3 = Vector3.ZERO
var _blend_von: Array[Quaternion] = []
var _blend_hueft: Vector3 = Vector3.ZERO
var _blend_start: int = 0
var _blend_dauer: int = 0
var _letzte_frame: int = -1


func _init() -> void:
	name = "Vela3D"


func _ready() -> void:
	if not _geladen:
		laden()


## Liegen Modell und Animationen vor?
static func bereit() -> bool:
	return FileAccess.file_exists(ORDNER + MODELL) and FileAccess.file_exists(ORDNER + BIBLIOTHEK)


func geladen() -> bool:
	return _geladen


## Lädt Modell und Animationen und baut den 3D-Raum auf (der Node muss im Baum stehen). false, wenn etwas fehlt oder unlesbar ist.
func laden() -> bool:
	if _geladen:
		return true
	if not bereit():
		return false
	var doc: GLTFDocument = GLTFDocument.new()
	var state: GLTFState = GLTFState.new()
	if doc.append_from_file(ProjectSettings.globalize_path(ORDNER + MODELL), state) != OK:
		push_error("3D-Vela: Modell nicht lesbar")
		return false
	var wurzel: Node = doc.generate_scene(state)
	if wurzel == null or not (wurzel is Node3D):
		push_error("3D-Vela: keine 3D-Szene im Modell")
		return false
	_modell = wurzel as Node3D
	var sks: Array[Node] = _modell.find_children("*", "Skeleton3D", true, false)
	if sks.is_empty():
		push_error("3D-Vela: kein Skelett im Modell")
		return false
	_sk = sks[0] as Skeleton3D
	var bib: Resource = ResourceLoader.load(ORDNER + BIBLIOTHEK, "", ResourceLoader.CACHE_MODE_REUSE)
	if not (bib is AnimationLibrary):
		push_error("3D-Vela: Animationen nicht lesbar")
		return false
	_bib = bib as AnimationLibrary
	_hueft = _sk.find_bone(HUEFTE)
	_spuren_vorbereiten()
	_hueft_ruhe = _sk.get_bone_pose(_hueft).origin
	for n: String in ZEHEN:
		_zehen.append(_sk.find_bone(n))
	_faeuste_vorbereiten()
	_vp = SubViewport.new()
	_vp.name = "Raum"
	_vp.size = Vector2i(BILDKANTE, BILDKANTE)
	_vp.transparent_bg = true
	_vp.own_world_3d = true
	_vp.msaa_3d = Viewport.MSAA_4X
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_vp.add_child(_modell)
	add_child(_vp)
	_box = _masse(_modell)
	_einheit = _box.size.y / FIGURHOEHE
	_materialien(_modell)
	_kamera = Camera3D.new()
	_kamera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_kamera.size = float(BILDKANTE) * _einheit
	_kamera.near = 0.01
	_kamera.far = _box.size.y * 40.0
	_vp.add_child(_kamera)
	var ziel: Vector3 = Vector3(_hueft_ruhe.x, _box.position.y + _kamera.size * (FUSS_ANTEIL - 0.5), _hueft_ruhe.z)
	_kamera.look_at_from_position(ziel + Vector3(-_box.size.y * 10.0, 0.0, 0.0), ziel, Vector3.UP)
	_kamera.current = true
	_sprite = Sprite2D.new()
	_sprite.name = "Bild"
	_sprite.centered = false
	_sprite.texture = _vp.get_texture()
	_sprite.offset = Vector2(-float(BILDKANTE) * 0.5, -FUSS_ANTEIL * float(BILDKANTE))
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	add_child(_sprite)
	_geladen = true
	# Boden: Höhe der Zehen im Stand
	if _bib.has_animation("stand"):
		_pose_setzen("stand", 0.0)
		_boden_ref = _zehen_hoehe()
	_letzte = _drehungen()
	_letzte_hueft = _sk.get_bone_pose_position(_hueft)
	visible = false
	return true


# ---------------------------------------------------------------------------
# Aufbau
# ---------------------------------------------------------------------------

func _netze(n: Node, aus: Array[MeshInstance3D]) -> void:
	if n is MeshInstance3D:
		aus.append(n as MeshInstance3D)
	for k: Node in n.get_children():
		_netze(k, aus)


## Lage eines Knotens im Raum des Modells (ohne die Lage des Modells selbst, also auch ohne die Verschiebung nach unten in der
## Luft). Unabhängig davon, ob der Baum läuft: nur die Kette der Eltern bis zum Modell zählt.
func _im_modell(n: Node3D) -> Transform3D:
	var t: Transform3D = Transform3D.IDENTITY
	var k: Node = n
	while k != null and k != _modell and k is Node3D:
		t = (k as Node3D).transform * t
		k = k.get_parent()
	return t


## Maße der Figur im Raum des Modells (Ruhepose).
func _masse(n: Node3D) -> AABB:
	var netze: Array[MeshInstance3D] = []
	_netze(n, netze)
	var alle: AABB = AABB()
	var erstes: bool = true
	for mi: MeshInstance3D in netze:
		var t: AABB = _im_modell(mi) * mi.get_aabb()
		alle = t if erstes else alle.merge(t)
		erstes = false
	return alle


func _materialien(n: Node3D) -> void:
	var umriss: ShaderMaterial = ShaderMaterial.new()
	var us: Shader = Shader.new()
	us.code = UMRISS_CODE
	umriss.shader = us
	umriss.set_shader_parameter("breite", UMRISS_PX * _einheit)
	var fs: Shader = Shader.new()
	fs.code = FARBE_CODE
	var netze: Array[MeshInstance3D] = []
	_netze(n, netze)
	for mi: MeshInstance3D in netze:
		for s: int in mi.mesh.get_surface_count():
			var alt: Material = mi.get_active_material(s)
			var m: ShaderMaterial = ShaderMaterial.new()
			m.shader = fs
			m.set_shader_parameter("saettigung", SAETTIGUNG)
			if alt is BaseMaterial3D:
				var b: BaseMaterial3D = alt as BaseMaterial3D
				m.set_shader_parameter("albedo_color", b.albedo_color)
				if b.albedo_texture != null:
					m.set_shader_parameter("albedo_tex", _verkleinert(b.albedo_texture))
					m.set_shader_parameter("hat_textur", true)
			m.next_pass = umriss
			mi.set_surface_override_material(s, m)


## Textur auf höchstens TEXTUR_MAX Pixel Kantenlänge bringen und Mip-Stufen erzeugen (gegen Flimmern beim Verkleinern).
func _verkleinert(tex: Texture2D) -> Texture2D:
	var id: int = tex.get_instance_id()
	if _texturen.has(id):
		return _texturen[id] as Texture2D
	var img: Image = tex.get_image()
	if img == null:
		return tex
	if img.is_compressed():
		img.decompress()
	var gr: int = maxi(img.get_width(), img.get_height())
	if gr > TEXTUR_MAX:
		var f: float = float(TEXTUR_MAX) / float(gr)
		img.resize(maxi(1, roundi(float(img.get_width()) * f)), maxi(1, roundi(float(img.get_height()) * f)), Image.INTERPOLATE_LANCZOS)
	img.generate_mipmaps()
	var neu: ImageTexture = ImageTexture.create_from_image(img)
	_texturen[id] = neu
	return neu


## Fingerglieder und ihre eingerollte Drehung (Ruhedrehung mal Einrollen) merken.
func _faeuste_vorbereiten() -> void:
	_faeuste.clear()
	for seite: String in ["Left", "Right"]:
		for finger: String in ["Index", "Middle", "Ring", "Pinky", "Thumb"]:
			for glied: int in [1, 2, 3]:
				var b: int = _sk.find_bone("mixamorig_%sHand%s%d" % [seite, finger, glied])
				if b < 0:
					continue
				var grad: float = FAUST_GRAD * (0.5 if finger == "Thumb" else 1.0)
				var q: Quaternion = _sk.get_bone_rest(b).basis.get_rotation_quaternion() * Quaternion(Vector3.BACK, deg_to_rad(grad))
				_faeuste.append({"b": b, "q": q})


# ---------------------------------------------------------------------------
# Pose
# ---------------------------------------------------------------------------

func _drehungen() -> Array[Quaternion]:
	var r: Array[Quaternion] = []
	for i: int in _sk.get_bone_count():
		r.append(_sk.get_bone_pose_rotation(i))
	return r


## Lage eines Knochens im Raum des Skeletts, aus den lokalen Posen der Kette bis zur Wurzel gerechnet (der Zwischenspeicher des
## Skeletts, `get_bone_global_pose`, wird außerhalb des Baums nicht nachgeführt).
func knochen_global(b: int) -> Transform3D:
	var t: Transform3D = _sk.get_bone_pose(b)
	var p: int = _sk.get_bone_parent(b)
	while p >= 0:
		t = _sk.get_bone_pose(p) * t
		p = _sk.get_bone_parent(p)
	return t


## Tiefste Zehenhöhe in der aktuellen Pose, im Raum des Modells gemessen (Welteinheiten, 1,0 = Figurhöhe): nicht von der
## Verschiebung des Modells abhängig, die dieser Wert selbst bestimmt.
func _zehen_hoehe() -> float:
	var y: float = 1000.0
	var zum_modell: Transform3D = _im_modell(_sk)
	for b: int in _zehen:
		if b >= 0:
			y = minf(y, (zum_modell * knochen_global(b)).origin.y)
	return y


## Spuren jedes Clips (Knochen je Spur) vorbereiten; Spuren ohne Knochen im Modell bleiben draußen.
func _spuren_vorbereiten() -> void:
	_spuren.clear()
	for name: String in _bib.get_animation_list():
		var a: Animation = _bib.get_animation(name)
		var liste: Array[Dictionary] = []
		for i: int in a.get_track_count():
			var typ: int = a.track_get_type(i)
			if typ != Animation.TYPE_ROTATION_3D and typ != Animation.TYPE_POSITION_3D:
				continue
			var pfad: String = String(a.track_get_path(i))
			var b: int = _sk.find_bone(pfad.substr(pfad.rfind(":") + 1))
			if b >= 0:
				liste.append({"i": i, "b": b, "rot": typ == Animation.TYPE_ROTATION_3D})
		_spuren[name] = liste


## Setzt das Skelett auf die Zeit `t` (Sekunden) des Clips: alle Knochen in die Ruhe, dann die Spuren des Clips, dann die Fäuste.
func _pose_setzen(clip: String, t: float) -> void:
	_sk.reset_bone_poses()
	var a: Animation = _bib.get_animation(clip)
	for s: Dictionary in (_spuren[clip] as Array):
		if bool(s["rot"]):
			_sk.set_bone_pose_rotation(int(s["b"]), a.rotation_track_interpolate(int(s["i"]), t))
		else:
			_sk.set_bone_pose_position(int(s["b"]), a.position_track_interpolate(int(s["i"]), t))
	for fb: Dictionary in _faeuste:
		_sk.set_bone_pose_rotation(int(fb["b"]), fb["q"] as Quaternion)


## Zeigt die Wahl der Tabelle (DarstellungVela3DTabelle.wahl) zum Logikschritt `frame`: Clip, Zeit, Überblendung, Boden, Blick.
func aus_wahl(w: Dictionary, frame: int) -> void:
	if not _geladen or w.is_empty() or not _bib.has_animation(String(w["clip"])):
		_sichtbar(false)
		return
	var clip: String = String(w["clip"])
	var t: float = DarstellungVela3DTabelle.zeit(w)
	# Lücke im Aufruf (Foto nach vielen Schritten, Neustart): die letzte Pose ist nicht mehr die vorige, nicht überblenden
	var luecke: bool = _letzte_frame < 0 or frame < _letzte_frame or frame - _letzte_frame > 2
	_letzte_frame = frame
	if luecke:
		_blend_dauer = 0
	if clip != _clip:
		_blend_dauer = int(BLEND_TICKS.get(clip, 0)) if (_clip != "" and not luecke) else 0
		if _blend_dauer > 0:
			_blend_von = _letzte.duplicate()
			_blend_hueft = _letzte_hueft
			_blend_start = frame
		_clip = clip
	_zeit = t
	_pose_setzen(clip, t)
	if _blend_dauer > 0:
		var anteil: float = clampf(float(frame - _blend_start + 1) / float(_blend_dauer), 0.0, 1.0)
		if anteil >= 1.0:
			_blend_dauer = 0
		else:
			var glatt: float = anteil * anteil * (3.0 - 2.0 * anteil)
			for i: int in _sk.get_bone_count():
				_sk.set_bone_pose_rotation(i, _blend_von[i].slerp(_sk.get_bone_pose_rotation(i), glatt))
			var h: Vector3 = _sk.get_bone_pose_position(_hueft)
			_sk.set_bone_pose_position(_hueft, _blend_hueft.lerp(h, glatt))
	_letzte = _drehungen()
	_letzte_hueft = _sk.get_bone_pose_position(_hueft)
	_luft = 0.0
	if DarstellungVela3DTabelle.in_der_luft(w):
		_luft = maxf(0.0, _zehen_hoehe() - _boden_ref)
	_modell.position = Vector3(0.0, -_luft, 0.0)
	_blick = -1 if int(w["blick"]) < 0 else 1
	scale = Vector2(float(_blick), 1.0)
	_sichtbar(true)


## Zeigt die Figur nach ihrem Zustand (Aktion, Aktionsuhr, Blick); liest die Welt nur. Nicht abgedeckte Aktionen verstecken den Node.
func aus_figur(f: KernEntitaeten.Figur, welt: KernWelt) -> void:
	var w: Dictionary = DarstellungVela3DTabelle.wahl(f, welt)
	aus_wahl(w, welt.frame if welt != null else 0)


## Versteckt die Figur und hält das Zeichnen des 3D-Raums an (die Aktion hat keinen 3D-Clip).
func verstecken() -> void:
	_sichtbar(false)


func _sichtbar(an: bool) -> void:
	visible = an
	if _vp != null:
		_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS if an else SubViewport.UPDATE_DISABLED


# ---------------------------------------------------------------------------
# Auskunft (Tests, Werkzeuge)
# ---------------------------------------------------------------------------

func clip_name() -> String:
	return _clip


## Zeit im Clip in Sekunden der zuletzt gezeigten Pose.
func zeit() -> float:
	return _zeit


func blick() -> int:
	return _blick


func skelett() -> Skeleton3D:
	return _sk


func modell() -> Node3D:
	return _modell


func animationen() -> AnimationLibrary:
	return _bib


## Höhe der Figur über dem Fußpunkt, die der Clip in der Luft abgezogen hat (Welteinheiten, 1,0 = Figurhöhe).
func luft_abzug() -> float:
	return _luft


## Das gezeigte Bild des Raums (RGBA8, BILDKANTE²) oder null; braucht einen Rendertreiber (nicht unter --headless).
func raumbild() -> Image:
	if _vp == null:
		return null
	return _vp.get_texture().get_image()
