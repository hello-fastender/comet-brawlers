## Messung der Leistung (E28): Zeit je Logikschritt, Zeichenbefehle je Bild und Zeit je gerendertem Bild. Gibt Zeilen aus.
##
##   godot --headless --path godot --script res://werkzeuge/leistung.gd -- --modus logik [--wiederholungen 10]
##       Zeit je Logikschritt (Vorführung, 600 Schritte je Wiederholung, nur Kern) und je Schritt mit Zeichnen auf ein
##       CanvasItem (Dummy-Renderer: misst die CPU-Arbeit der Darstellung, nicht die GPU).
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/leistung.gd -- --modus bild [--bilder 600] [--faktor N]
##       Zeit je Bild der laufenden Hauptszene (spiel.tscn, Takt 60 Hz) unter Xvfb mit Software-Rendering (llvmpipe).
##       --faktor N setzt DARSTELLUNG nicht um (die Konstante ist fest); der Vergleich 768 × 448 gegen 1536 × 896 geschieht
##       mit zwei Ständen des Codes (siehe docs/godot.md).
##
## WICHTIG: Unter Xvfb rendert llvmpipe auf der CPU. Die Zeit je Bild sagt etwas über das Verhältnis der Füllrate bei
## 768 × 448 und 1536 × 896 (rund 4×), nicht über die Leistung einer echten GPU. 60 Bilder je Sekunde auf der Zielhardware muss der
## Nutzer selbst bestätigen.
extends SceneTree


func _init() -> void:
	_lauf.call_deferred()


func _argumente() -> Dictionary:
	var aus: Dictionary = {}
	var a: PackedStringArray = OS.get_cmdline_user_args()
	var i: int = 0
	while i < a.size():
		if a[i].begins_with("--") and i + 1 < a.size() and not a[i + 1].begins_with("--"):
			aus[a[i].substr(2)] = a[i + 1]
			i += 2
			continue
		i += 1
	return aus


func _lauf() -> void:
	var arg: Dictionary = _argumente()
	await process_frame
	match String(arg.get("modus", "logik")):
		"bild":
			await _bild(int(arg.get("bilder", "600")))
		_:
			_logik(int(arg.get("wiederholungen", "10")))
	quit(0)


func _sitzung() -> DarstellungSitzung:
	var w: String = (load("res://darstellung/spiel.gd") as GDScript).call("wurzel")
	var szene: String = FileAccess.get_file_as_string(w.path_join("spiel/tests/szenen/vorfuehrung.txt"))
	var eingabe: String = FileAccess.get_file_as_string(w.path_join("spiel/tests/eingaben/vorfuehrung.txt"))
	var stage: String = FileAccess.get_file_as_string(w.path_join("spiel/daten/stages/scheibe.txt"))
	var s: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	s.ladeSzene(PruefSzene.parseSzene(szene), stage, eingabe)
	return s


func _logik(wiederholungen: int) -> void:
	var schritte: int = 600
	var summe_kern: int = 0
	var summe_zeichnen: int = 0
	var gross_kern: int = 0
	var befehle: int = 0
	var knoten: Node2D = Node2D.new()
	root.add_child(knoten)
	var zn_h: DarstellungZeichner = DarstellungZeichner.new(knoten)
	var zn_v: DarstellungZeichner = DarstellungZeichner.new(knoten)
	for _w: int in wiederholungen:
		var s: DarstellungSitzung = _sitzung()
		for _i: int in schritte:
			var t0: int = Time.get_ticks_usec()
			s.logikSchritt()
			var t1: int = Time.get_ticks_usec()
			summe_kern += t1 - t0
			gross_kern = maxi(gross_kern, t1 - t0)
			knoten.queue_redraw()
			zn_h.leeren()
			zn_v.leeren()
			var z0: int = Time.get_ticks_usec()
			DarstellungZeichnen.zeichneBildTeil(zn_h, zn_v, s.welt, false)
			summe_zeichnen += Time.get_ticks_usec() - z0
			befehle += zn_h.zaehler + zn_v.zaehler
			zn_h.zaehler = 0
			zn_v.zaehler = 0
	var n: int = wiederholungen * schritte
	print("Logikschritt (Kern): im Mittel %.1f µs, größter %.1f µs (%d Schritte, Vorführung)" % [float(summe_kern) / n, gross_kern / 1.0, n])
	print("Zeichenbefehle je Bild: im Mittel %.0f, CPU-Zeit zum Erzeugen im Mittel %.1f µs (Dummy-Renderer, Faktor %d: die Zahl der Befehle hängt nicht vom Faktor ab)" % [float(befehle) / n, float(summe_zeichnen) / n, DarstellungMasse.DARSTELLUNG])
	print("Vergleich: ein Tick hat 16667 µs")


func _bild(bilder: int) -> void:
	var skript: GDScript = load("res://darstellung/spiel.gd")
	var argumente: Dictionary = skript.call("parseArgumente", PackedStringArray(["--szene", "spiel/tests/szenen/vorfuehrung.txt", "--eingabe", "spiel/tests/eingaben/vorfuehrung.txt"]))
	var spiel: Node2D = (load("res://darstellung/spiel.tscn") as PackedScene).instantiate()
	spiel.set("argumente", argumente)
	root.add_child(spiel)
	var zeiten: Array[float] = []
	var letzte: int = Time.get_ticks_usec()
	for nr: int in bilder + 30:
		await process_frame
		await RenderingServer.frame_post_draw
		var jetzt: int = Time.get_ticks_usec()
		if nr >= 30:
			zeiten.append((jetzt - letzte) / 1000.0)
		letzte = jetzt
	zeiten.sort()
	var summe: float = 0.0
	for z: float in zeiten:
		summe += z
	print("Treiber: %s, Spielbild %d × %d" % [RenderingServer.get_video_adapter_name(), DarstellungZeichner.BILDPIXEL_BREITE, DarstellungZeichner.BILDPIXEL_HOEHE])
	print("Zeit je Bild (%d Bilder nach 30 Anlaufbildern): im Mittel %.2f ms, Median %.2f ms, 95 %% %.2f ms, größtes %.2f ms" % [zeiten.size(), summe / zeiten.size(), zeiten[zeiten.size() / 2], zeiten[zeiten.size() * 95 / 100], zeiten[zeiten.size() - 1]])
	spiel.queue_free()
