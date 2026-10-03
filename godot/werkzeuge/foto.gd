# Bildschirmfotos der Platzhalterdarstellung (Auftrag 6, Phase 2, 3.4).
#
#   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/foto.gd -- \
#       --szene <datei> --eingabe <datei> --nach 300,600,900 --aus <ordnerPrefix> [--debug] [--seed N]
#
# Lädt darstellung/spiel.tscn in einen SubViewport (768 × 448), lässt die
# Sitzung die Logikschritte laufen (ohne Echtzeit, ohne Takt) und speichert zu
# jedem Wert in --nach das Bild der Viewport-Textur als PNG
# <aus>_<n:04d>.png. Pfade relativ zum Repo-Wurzelverzeichnis (der Ordner über
# godot/). Ohne --szene beginnt der Lauf ab Spielstart (mit --eingabe: Seed aus
# „# seed=N“ der Datei, sonst --seed, sonst 1). Das Projekt braucht
# renderer/rendering_method=gl_compatibility (project.godot); ohne Fenster
# (--headless) gibt es keine Bilder.
extends SceneTree

const BILD: Vector2i = Vector2i(768, 448)


func _initialize() -> void:
	_lauf()


## Argumente --name wert (und --debug) → Dictionary; Fehler im Schlüssel "fehler".
func _argumente(argv: PackedStringArray) -> Dictionary:
	var a: Dictionary = {"szene": "", "eingabe": "", "nach": "", "aus": "", "seed": "", "debug": false, "platzhalter": false, "fehler": ""}
	var i: int = 0
	while i < argv.size():
		var name: String = argv[i]
		if name == "--debug":
			a["debug"] = true
			i += 1
			continue
		if name == "--platzhalter":
			a["platzhalter"] = true
			i += 1
			continue
		if not (name in ["--szene", "--eingabe", "--nach", "--aus", "--seed"]):
			a["fehler"] = "unerwartetes Argument „%s“" % name
			return a
		if i + 1 >= argv.size():
			a["fehler"] = "Argument %s ohne Wert" % name
			return a
		a[name.substr(2)] = argv[i + 1]
		i += 2
	return a


func _lauf() -> void:
	# erst wenn der Baum läuft (in _initialize steht root noch nicht im Baum)
	await process_frame
	var a: Dictionary = _argumente(OS.get_cmdline_user_args())
	if (a["fehler"] as String) != "" or (a["nach"] as String) == "" or (a["aus"] as String) == "":
		printerr("Aufruf: foto.gd -- --szene <datei> --eingabe <datei> --nach 300,600 --aus <ordnerPrefix> [--debug] [--seed N]  %s" % a["fehler"])
		quit(1)
		return
	var stufen: Array[int] = []
	for teil: String in (a["nach"] as String).split(","):
		if not teil.strip_edges().is_valid_int():
			printerr("--nach: „%s“ ist keine Zahl" % teil)
			quit(1)
			return
		stufen.append(teil.strip_edges().to_int())
	stufen.sort()
	# Argumente an die Hülle des Spiels weitergeben
	var argv: PackedStringArray = PackedStringArray()
	for schluessel: String in ["szene", "eingabe", "seed"]:
		if (a[schluessel] as String) != "":
			argv.append("--" + schluessel)
			argv.append(a[schluessel] as String)
	if a["debug"]:
		argv.append("--debug")
	if a["platzhalter"]:
		argv.append("--platzhalter")
	var spiel_skript: GDScript = load("res://darstellung/spiel.gd")
	var spiel_args: Dictionary = spiel_skript.call("parseArgumente", argv)
	var vp: SubViewport = SubViewport.new()
	vp.size = BILD
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(vp)
	var spiel: Node2D = (load("res://darstellung/spiel.tscn") as PackedScene).instantiate()
	spiel.set("automatisch", false)
	spiel.set("argumente", spiel_args)
	vp.add_child(spiel)
	var sitzung: DarstellungSitzung = spiel.get("sitzung")
	if sitzung == null:
		printerr("Das Spiel konnte nicht gestartet werden")
		quit(1)
		return
	var aus: String = spiel_skript.call("absolut", a["aus"] as String)
	DirAccess.make_dir_recursive_absolute(aus.get_base_dir())
	var fehler: int = 0
	for n in stufen:
		while sitzung.welt.frame < n and not sitzung.amEnde():
			sitzung.logikSchritt()
		await process_frame
		await process_frame
		await RenderingServer.frame_post_draw
		var bild: Image = vp.get_texture().get_image()
		if bild == null or bild.is_empty():
			printerr("Viewport-Textur nicht lesbar (Rendertreiber? --rendering-driver opengl3 unter xvfb-run)")
			fehler = 1
			break
		var pfad: String = "%s_%04d.png" % [aus, n]
		var e: int = bild.save_png(pfad)
		if e != OK:
			printerr("%s nicht schreibbar (Fehler %d)" % [pfad, e])
			fehler = 1
			break
		print("%s (Frame %d, %d × %d)" % [pfad, sitzung.welt.frame, bild.get_width(), bild.get_height()])
	quit(fehler)
