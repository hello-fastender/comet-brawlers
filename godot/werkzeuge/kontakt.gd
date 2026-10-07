## Kontaktbogen der Vela-Puppe (Auftrag 6, Phase 2).
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/kontakt.gd \
##       -- --aus docs/bilder/godot_kontakt_vela.png
##
## Optionen nach `--`:
##   --aus <png>      Ausgabedatei (Pfad relativ zur Repo-Wurzel oder absolut)
##   --zoom <n>       ganzzahlige Vergrößerung (Standard 2)
##   --alle           alle Bilder jeder Animation statt der Schlüsselbilder
##   --gelenke        Gelenke der Bones als Kreuze eintragen
##   --nur <a,b,..>   nur diese Animationen (stand, gehen, kette1 … kette4)
##   --blick <1|-1>   Blickrichtung (Standard 1)
##
## Zeigt Stand, einige Gehbilder und die Kette 1 bis 4 mit Trefferbild (rot umrandet) in einem
## Raster; links oben die ganze Figur des Teileblatts als Maßstab (142 px).
extends SceneTree

const ZELLE_B: int = 190
const ZELLE_H: int = 176
## Fußpunkt in der Zelle (Bildpixel).
const FUSS_X: int = 78
const FUSS_Y: int = 150
const HINTERGRUND: Color = Color(0.43, 0.47, 0.40)
const BODEN: Color = Color(0.27, 0.30, 0.25)

var _zoom: int = 2
var _gelenke: bool = false
var _blick: int = 1


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


## Reihen des Bogens: [Beschriftung, Animation, Array von Bildern {"pose", "text", "treffer"}]
## (Stand, Gehen über einen ganzen Zyklus in Abständen von 2 Ticks bzw. 1 Tick mit --alle,
## Kette 1 bis 4 mit allen Schlüsselposen, Treffer rot umrandet; Verwischbilder eigens).
func _reihen(alle: bool, nur: PackedStringArray) -> Array:
	var r: Array = []
	r.append(["stand", "stand", [{"pose": DarstellungVelaPosen.pose("stand", 1), "text": "stand", "treffer": false}]])
	var schritt: int = 1 if alle else DarstellungVelaPosen.GEHEN_BILD_DAUER
	var gehen: Array = []
	for u: int in range(0, DarstellungVelaPosen.GEHEN_ZYKLUS, schritt):
		gehen.append({"pose": DarstellungVelaPosen.pose_bei("gehen", 1.0 + float(u)), "text": "gehen %d" % u, "treffer": false})
	r.append(["gehen", "gehen", gehen])
	for stufe: int in range(1, 5):
		var anim: String = "kette%d" % stufe
		var bilder: Array = []
		var ks: Array = DarstellungVelaPosen.schluessel(anim)
		var treffer_idx: Array = [DarstellungVelaPosen.treffer_bild(stufe)]
		if stufe == 4:
			treffer_idx.append(DarstellungVelaPosen.treffer_bild_zweites_fenster())
		for i: int in ks.size():
			var k: Dictionary = ks[i]
			var ist_treffer: bool = treffer_idx.has(i)
			if k.has("sm"):
				bilder.append({"pose": DarstellungVelaPosen.pose_bei(anim, float(k["t"]), true), "text": "%s t%d Verwischbild" % [anim, int(k["t"])], "treffer": true})
			bilder.append({"pose": DarstellungVelaPosen.pose_bei(anim, float(k["t"]), false), "text": "%s t%d%s" % [anim, int(k["t"]), " Treffer" if ist_treffer else ""], "treffer": ist_treffer})
		r.append([anim, anim, bilder])
	if nur.size() > 0 and nur[0] != "":
		var f: Array = []
		for e: Array in r:
			if nur.has(e[0]):
				f.append(e)
		r = f
	return r


func _lauf() -> void:
	var arg: Dictionary = _argumente()
	_zoom = int(arg.get("zoom", "2"))
	_gelenke = arg.has("gelenke")
	_blick = int(arg.get("blick", "1"))
	var wurzel: String = ProjectSettings.globalize_path("res://").path_join("..").simplify_path()
	var aus: String = arg.get("aus", "")
	if aus != "" and not aus.is_absolute_path():
		aus = wurzel.path_join(aus)
	var nur: PackedStringArray = String(arg.get("nur", "")).split(",", false)
	var reihen: Array = _reihen(arg.has("alle"), nur)
	# lange Reihen umbrechen
	var umbruch: Array = []
	for e: Array in reihen:
		var l: Array = e[2]
		var n: int = 8
		for a: int in range(0, l.size(), n):
			umbruch.append([e[0], e[1], l.slice(a, a + n), a == 0])
	reihen = umbruch
	var spalten: int = 1
	for e: Array in reihen:
		spalten = maxi(spalten, (e[2] as Array).size() + (1 if e[0] == "stand" else 0))
	var b: int = spalten * ZELLE_B * _zoom
	var h: int = reihen.size() * ZELLE_H * _zoom
	var vp: SubViewport = SubViewport.new()
	vp.size = Vector2i(b, h)
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(vp)
	var grund: ColorRect = ColorRect.new()
	grund.color = HINTERGRUND
	grund.size = Vector2(b, h)
	vp.add_child(grund)
	var welt: Node2D = Node2D.new()
	welt.scale = Vector2(_zoom, _zoom)
	vp.add_child(welt)
	var zeile: int = 0
	for e: Array in reihen:
		var spalte: int = 0
		if e[0] == "stand" and e[3]:
			# Maßstab: ganze Figur aus dem Teileblatt
			var m: Image = DarstellungVelaPuppe.lade_png("res://grafik/vela/massstab.png")
			if m != null and not m.is_empty():
				var s: Sprite2D = Sprite2D.new()
				s.texture = ImageTexture.create_from_image(m)
				s.centered = false
				s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
				s.position = Vector2(-m.get_width() / 2, -m.get_height())
				_zelle(welt, spalte, zeile, "Maßstab 142 px", false)
				_zelle_inhalt(welt, spalte, zeile).add_child(s)
				spalte += 1
		for eintrag: Dictionary in e[2]:
			var inhalt: Node2D = _zelle(welt, spalte, zeile, String(eintrag["text"]), bool(eintrag["treffer"]))
			var p: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
			p.setze_blick(_blick)
			p.setze_pose(eintrag["pose"])
			inhalt.add_child(p)
			if _gelenke:
				for bn: String in DarstellungVelaPuppe.BONES:
					var kreuz: Node2D = _kreuz(p.bone_ort(bn) * Vector2(p.scale.x, 1))
					inhalt.add_child(kreuz)
			spalte += 1
		zeile += 1
	for i: int in 4:
		await process_frame
	var bild: Image = vp.get_texture().get_image()
	if aus == "":
		print("Kein --aus angegeben")
	else:
		DirAccess.make_dir_recursive_absolute(aus.get_base_dir())
		bild.save_png(aus)
		print("Kontaktbogen: ", aus, " ", bild.get_size())
	quit(0)


## Zelle anlegen (Hintergrund, Boden, Beschriftung); gibt den Inhaltsknoten mit Ursprung am Fußpunkt zurück.
func _zelle(welt: Node2D, spalte: int, zeile: int, text: String, rahmen: bool) -> Node2D:
	var z: Node2D = Node2D.new()
	z.name = "Zelle_%d_%d" % [spalte, zeile]
	z.position = Vector2(spalte * ZELLE_B, zeile * ZELLE_H)
	welt.add_child(z)
	var feld: ColorRect = ColorRect.new()
	feld.color = BODEN
	feld.position = Vector2(2, FUSS_Y)
	feld.size = Vector2(ZELLE_B - 4, ZELLE_H - FUSS_Y - 2)
	z.add_child(feld)
	var linie: ColorRect = ColorRect.new()
	linie.color = Color(0.9, 0.9, 0.9, 0.5)
	linie.position = Vector2(2, FUSS_Y)
	linie.size = Vector2(ZELLE_B - 4, 0.5)
	z.add_child(linie)
	if rahmen:
		for r: Rect2 in [Rect2(1, 1, ZELLE_B - 2, 1), Rect2(1, ZELLE_H - 2, ZELLE_B - 2, 1), Rect2(1, 1, 1, ZELLE_H - 2), Rect2(ZELLE_B - 2, 1, 1, ZELLE_H - 2)]:
			var c: ColorRect = ColorRect.new()
			c.color = Color(0.9, 0.2, 0.15)
			c.position = r.position
			c.size = r.size
			z.add_child(c)
	var l: Label = Label.new()
	l.text = text
	l.position = Vector2(4, ZELLE_H - 18)
	l.add_theme_font_size_override("font_size", 8)
	l.add_theme_color_override("font_color", Color(1, 1, 1))
	l.scale = Vector2(1, 1)
	z.add_child(l)
	var inhalt: Node2D = Node2D.new()
	inhalt.name = "Inhalt"
	inhalt.position = Vector2(FUSS_X, FUSS_Y)
	z.add_child(inhalt)
	return inhalt


func _zelle_inhalt(welt: Node2D, spalte: int, zeile: int) -> Node2D:
	return welt.get_node("Zelle_%d_%d/Inhalt" % [spalte, zeile]) as Node2D


func _kreuz(ort: Vector2) -> Node2D:
	var n: Node2D = Node2D.new()
	n.position = ort
	for r: Rect2 in [Rect2(-2, 0, 5, 1), Rect2(0, -2, 1, 5)]:
		var c: ColorRect = ColorRect.new()
		c.color = Color(1, 0.1, 0.8)
		c.position = r.position
		c.size = r.size
		n.add_child(c)
	return n
