## Vorschau der HD-Clips von Vela (Umsetzer `video_umsetzer.gd --hd`): rendert einzelne Bilder mit dem Abspieler
## DarstellungVelaFrames auf grauem und weißem Grund, einmal in der Auflösung der Dateien (1 Dateipixel = 1 Bildschirmpixel)
## und einmal so, wie das Spiel sie zeigt (Spielmaßstab, 1 Bildpixel; dann 2-fach vergrößert wie das Spielfenster).
## Optional daneben ein Pixel-Clip aus demselben Video zum Vergleich.
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/hd_vorschau.gd -- \
##       --ordner <clip-ordner> [--vergleich <pixel-clip-ordner>] [--bilder 1,6,12] [--aus docs/bilder/godot_hd_test.png] [--rand]
##
##   --ordner <o>      Ordner eines HD-Clips (mit clip.txt); Pfad ab Repo-Wurzel oder absolut
##   --vergleich <o>   Ordner eines Pixel-Clips für die Zeile „Pixelmodus“
##   --bilder <a,b,…>  1-basierte Bildnummern (Standard: drei gleichmäßig verteilte)
##   --rand            Randkontrolle: zusätzlich 8-fach vergrößerter Ausschnitt (nearest) der Kante auf weißem Grund
##
## Zeilen: (1) HD in Dateiauflösung auf Grau und Weiß, (2) HD im Spielmaßstab ×2 auf Grau und Weiß, (3) der Pixel-Clip ×2.
extends SceneTree

const GRAU: Color = Color(0.5, 0.5, 0.5)
const WEISS: Color = Color(1.0, 1.0, 1.0)
const RAND_PX: int = 6
const SPIEL_ZOOM: int = 2


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


static func _absolut(pfad: String) -> String:
	if pfad.is_absolute_path():
		return pfad.simplify_path()
	return ProjectSettings.globalize_path("res://").path_join("..").path_join(pfad).simplify_path()


func _lauf() -> void:
	var arg: Dictionary = _argumente()
	var ordner: String = _absolut(String(arg.get("ordner", "")))
	var aus: String = _absolut(String(arg.get("aus", "docs/bilder/godot_hd_test.png")))
	if not DarstellungVelaFrames.clip_registrieren("hd_vorschau", ordner + "/"):
		printerr("Clip in %s nicht lesbar" % ordner)
		quit(1)
		return
	var vergleich: bool = arg.has("vergleich") and DarstellungVelaFrames.clip_registrieren("hd_vergleich", _absolut(String(arg["vergleich"])) + "/")
	var d: Dictionary = DarstellungVelaFrames.clip_daten("hd_vorschau")
	var nr: Array[int] = []
	if arg.has("bilder"):
		for s: String in String(arg["bilder"]).split(",", false):
			nr.append(int(s) - 1)
	else:
		for k: int in 3:
			nr.append(int(d["bilder"]) * (2 * k + 1) / 6)
	var b: int = int(d["bild_breite"])
	var h: int = int(d["bild_hoehe"])
	# Zeile 1: Dateiauflösung; Rand rundum für den Fußpunkt
	var zeilen: Array = []
	var z1: Array = []
	for i: int in nr:
		for grund: Color in [GRAU, WEISS]:
			z1.append(await _zelle("hd_vorschau", i, grund, Vector2i(b + 2 * RAND_PX, h + 2 * RAND_PX), Vector2(float(RAND_PX), float(RAND_PX)) + (d["fuss"] as Vector2), 1.0 / float(d["skala"]), 1))
	zeilen.append(z1)
	# Zeile 2: Spielmaßstab (Zelle in Spielbildpixeln, dann ×2 mit nearest)
	var sb: int = int(d["breite"]) + 2 * RAND_PX
	var sh: int = int(d["hoehe"]) + 2 * RAND_PX
	var z2: Array = []
	for i: int in nr:
		for grund: Color in [GRAU, WEISS]:
			var zi: Image = await _zelle("hd_vorschau", i, grund, Vector2i(sb, sh), Vector2(float(RAND_PX) + float(d["ankerx"]) + 0.5, float(RAND_PX) + float(d["ankery"]) + 1.0), 1.0, SPIEL_ZOOM)
			z2.append(zi)
	zeilen.append(z2)
	if vergleich:
		var dv: Dictionary = DarstellungVelaFrames.clip_daten("hd_vergleich")
		var z3: Array = []
		var nv: int = int(dv["bilder"])
		for i: int in nr:
			for grund: Color in [GRAU, WEISS]:
				z3.append(await _zelle("hd_vergleich", mini(i * nv / maxi(int(d["bilder"]), 1), nv - 1), grund, Vector2i(sb, sh), Vector2(float(RAND_PX) + float(dv["ankerx"]) + 0.5, float(RAND_PX) + float(dv["ankery"]) + 1.0), 1.0, SPIEL_ZOOM))
		zeilen.append(z3)
	# zusammensetzen
	var breite: int = 0
	var hoch: int = 0
	for z: Array in zeilen:
		var zb: int = 0
		var zh: int = 0
		for im: Image in z:
			zb += im.get_width()
			zh = maxi(zh, im.get_height())
		breite = maxi(breite, zb)
		hoch += zh
	var blatt: Image = Image.create(breite, hoch, false, Image.FORMAT_RGBA8)
	blatt.fill(Color(0.15, 0.15, 0.15))
	var y: int = 0
	for z: Array in zeilen:
		var x: int = 0
		var zh: int = 0
		for im: Image in z:
			blatt.blit_rect(im, Rect2i(0, 0, im.get_width(), im.get_height()), Vector2i(x, y))
			x += im.get_width()
			zh = maxi(zh, im.get_height())
		y += zh
	DirAccess.make_dir_recursive_absolute(aus.get_base_dir())
	blatt.save_png(aus)
	print("Vorschau: %s %s, Bilder %s" % [aus, str(blatt.get_size()), str(nr)])
	if arg.has("rand"):
		var z: Image = await _zelle("hd_vorschau", nr[0], WEISS, Vector2i(b + 2 * RAND_PX, h + 2 * RAND_PX), Vector2(float(RAND_PX), float(RAND_PX)) + (d["fuss"] as Vector2), 1.0 / float(d["skala"]), 1)
		var ausschnitt: Image = z.get_region(Rect2i(RAND_PX + b / 8, RAND_PX + h / 20, 64, 56))
		ausschnitt.resize(512, 448, Image.INTERPOLATE_NEAREST)
		ausschnitt.save_png(aus.get_basename() + "_rand.png")
	DarstellungVelaFrames.clips_vergessen()
	quit(0)


## Ein Bild: Zelle `groesse` in Pixeln, Fußpunkt bei `fuss` (Pixel der Zelle), der Abspieler in einem Elternknoten mit dem
## Maßstab `skala` (1 = Spielmaßstab; 1 / skala des Clips = Dateiauflösung), danach mit `zoom` (nearest) vergrößert.
func _zelle(clip: String, index: int, grund: Color, groesse: Vector2i, fuss: Vector2, skala: float, zoom: int) -> Image:
	var vp: SubViewport = SubViewport.new()
	vp.size = groesse
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(vp)
	var r: ColorRect = ColorRect.new()
	r.color = grund
	r.size = Vector2(groesse)
	vp.add_child(r)
	var wurzel: Node2D = Node2D.new()
	# Dateiauflösung: der Abspieler skaliert das Sprite um `skala` des Clips; der Elternknoten macht das rückgängig
	wurzel.scale = Vector2.ONE * skala
	wurzel.position = fuss
	vp.add_child(wurzel)
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	wurzel.add_child(v)
	v.aus_clip_bild(clip, index, 1)
	for _i: int in 4:
		await process_frame
	var bild: Image = vp.get_texture().get_image()
	vp.queue_free()
	if zoom > 1:
		bild.resize(groesse.x * zoom, groesse.y * zoom, Image.INTERPOLATE_NEAREST)
	return bild
