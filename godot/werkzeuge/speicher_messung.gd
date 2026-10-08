## Messung des Arbeitsspeichers und der Ladezeiten der Video-Clips (E27, Teil A). Gibt Zeilen aus, schreibt nichts.
##
##   Clips nacheinander ganz laden (Speicher und Zeit je Clip):
##     godot --headless --path godot --script res://werkzeuge/speicher_messung.gd -- --modus clips
##     xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/speicher_messung.gd -- --modus clips
##   Das Spiel laufen lassen (Nachladen im Leerlauf, Zeit je Bild, Zeitpunkt, an dem jeder Clip bereit ist):
##     xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/speicher_messung.gd -- --modus spiel [--bilder 900]
##
## Zähler: RSS = Arbeitsspeicher des Prozesses (/proc/self/status, VmRSS), static = Performance.MEMORY_STATIC,
## tex = Performance.RENDER_TEXTURE_MEM_USED (nur mit Renderer; unter --headless 0), Clips = eigene Summe der
## Texturgrößen (DarstellungVelaFrames.speicher_bytes). Unter --headless hält der Dummy-Renderer die Bilder der Texturen im
## Speicher (static und RSS wachsen mit), unter Xvfb liegen sie zusätzlich im (Software-)Treiber. Zeiten unter Xvfb
## (llvmpipe) sind NICHT die einer echten GPU: das Hochladen der Texturen ist dort Software; die Entpackzeit (WebP) gilt auch
## für echte Rechner, soweit deren CPU ähnlich schnell ist.
extends SceneTree

const CLIPS: Array[String] = ["stand", "sprint", "kette1", "sprung", "sprungtritt"]


func _init() -> void:
	_lauf.call_deferred()


static func rss_mb() -> float:
	var f: FileAccess = FileAccess.open("/proc/self/status", FileAccess.READ)
	while f != null and not f.eof_reached():
		var z: String = f.get_line()
		if z.begins_with("VmRSS:"):
			return float(z.replace("\t", " ").split(" ", false)[1]) / 1024.0
	return 0.0


static func zaehler() -> String:
	return "RSS %.1f MB, static %.1f MB, tex %.1f MB, Clips %.1f MB" % [
		rss_mb(), Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0,
		Performance.get_monitor(Performance.RENDER_TEXTURE_MEM_USED) / 1048576.0,
		float(DarstellungVelaFrames.speicher_bytes()) / 1048576.0]


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
	print("Treiber: %s" % ("(kein Renderer, --headless)" if RenderingServer.get_video_adapter_name() == "" else RenderingServer.get_video_adapter_name()))
	print("Start: %s" % zaehler())
	if String(arg.get("modus", "clips")) == "spiel":
		await _spiel(int(arg.get("bilder", "900")))
	else:
		await _clips()
	quit(0)


func _clips() -> void:
	DarstellungVelaFrames.budget_bytes = 1 << 40
	var summe_us: int = 0
	for clip: String in CLIPS:
		var t0: int = Time.get_ticks_usec()
		var c: Dictionary = DarstellungVelaFrames.clip_laden(clip)
		var us: int = Time.get_ticks_usec() - t0
		await process_frame
		var z: Dictionary = DarstellungVelaFrames.ladezeiten[clip]
		var n: int = (c["texturen"] as Array).size()
		summe_us += us
		print("%s: %d Bilder %dx%d, %.1f MB, laden %.1f ms (%.2f ms je Bild, größtes %.2f ms) | %s" % [
			clip, n, int(c["daten"]["bild_breite"]), int(c["daten"]["bild_hoehe"]),
			float(c["bytes"]) / 1048576.0, us / 1000.0, us / 1000.0 / n, int(z["max_us"]) / 1000.0, zaehler()])
	print("Alle fünf: %.1f ms, %s" % [summe_us / 1000.0, zaehler()])
	DarstellungVelaFrames.clips_vergessen()
	await process_frame
	print("Nach clips_vergessen: %s" % zaehler())


func _spiel(bilder: int) -> void:
	DarstellungVelaFrames.clips_vergessen()
	var skript: GDScript = load("res://darstellung/spiel.gd")
	var argumente: Dictionary = skript.call("parseArgumente", PackedStringArray(["--szene", "spiel/tests/szenen/vorfuehrung.txt", "--eingabe", "spiel/tests/eingaben/vorfuehrung.txt"]))
	var spiel: Node2D = (load("res://darstellung/spiel.tscn") as PackedScene).instantiate()
	spiel.set("argumente", argumente)
	root.add_child(spiel)
	var frames: Node2D = spiel.get("_frames")
	print("Modus nachladen: %s" % str(DarstellungVelaFrames.nachladen))
	var bereit: Dictionary = {}
	var summe: float = 0.0
	var groesste: float = 0.0
	var gross_nr: int = 0
	var ohne_clip: int = 0
	var langsam: Array = []
	var letzte: int = Time.get_ticks_usec()
	for nr: int in bilder:
		await process_frame
		var jetzt: int = Time.get_ticks_usec()
		var ms: float = (jetzt - letzte) / 1000.0
		letzte = jetzt
		summe += ms
		if nr >= 5 and ms > groesste:
			groesste = ms
			gross_nr = nr
		if nr >= 5:
			langsam.append([ms, nr])
		if not frames.visible:
			ohne_clip += 1
		for clip: String in DarstellungVelaFrames.VORAUS_REIHE:
			if not bereit.has(clip) and DarstellungVelaFrames.ist_bereit(clip):
				bereit[clip] = nr
	print("Bilder %d: im Mittel %.2f ms, größtes ab Bild 5 %.2f ms (Bild %d), ohne gemalte Vela gezeigt: %d Bilder" % [bilder, summe / bilder, groesste, gross_nr, ohne_clip])
	langsam.sort_custom(func(a: Array, b: Array) -> bool: return a[0] > b[0])
	var text: String = ""
	for k: int in mini(5, langsam.size()):
		text += " %.1f ms (Bild %d)" % [langsam[k][0], langsam[k][1]]
	print("  fünf längste Bilder ab Bild 5:" + text)
	for clip: String in DarstellungVelaFrames.VORAUS_REIHE:
		print("  %s bereit ab Bild %s" % [clip, str(bereit.get(clip, "-"))])
	print("Ende: %s" % zaehler())
	spiel.queue_free()
