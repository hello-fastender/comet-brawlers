## Kontaktbögen und GIFs der Video-Clips von Vela (Prüfbilder für werkzeuge/video_umsetzer.gd und die Zuordnung).
## Gezeigt wird mit dem Abspieler DarstellungVelaFrames selbst (Anker im Ursprung, Bodenlinie, Ankerkreuz).
##
##   xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://werkzeuge/video_bogen.gd -- \
##       --modus bogen --zeilen "_test_gehen:zyklus;_test_kette1:alle:3" --aus docs/bilder/godot_video_test.png
##   ... --modus zyklus --clip _probe_grok_gehen --aus <ordner>   Einzelbilder (png) für ein GIF des erkannten Zyklus
##   ... --modus ticks --clip _test_kette1 --aus <ordner>         Einzelbilder je Logik-Tick der Zuordnung (Kette, mit Trefferstopp)
##   ... --modus folge --folge <name> --aus <ordner> [--jede 2]   Einzelbilder (jeder 2. Logik-Tick) einer Aktionsfolge, gespielt
##       mit dem Abspieler und der Tabelle (wahl): sprung, getroffen, umgeworfen (Umgeworfen, Liegen, Aufstehen), sprint, stand.
##       Lage und Höhe kommen aus der Logik (Sprungbahn, Bahn F1 aus KernBahn, Sprinttempo).
##
## Zeilen des Bogens (`name:art`): `zyklus` (die Bilder des erkannten Zyklus), `alle:<n>` (jedes n-te Bild, Ereignisse
## Ausholen, Kontakt und Ruhe farbig umrandet), `bilder:<a>,<b>,…` (1-basierte Bildnummern).
## Optionen: --zoom <n> (Standard 2), --blick <1|-1>.
## Aus den Einzelbildern macht ffmpeg das GIF, z. B.
##   ffmpeg -framerate 24 -i <ordner>/b%04d.png -filter_complex "split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse=dither=none" x.gif
extends SceneTree

const GRUND: Color = Color(0.43, 0.47, 0.40)
const BODEN: Color = Color(0.30, 0.33, 0.27)
const RAND: int = 4
const KOPF: int = 10

var _zoom: int = 2
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


func _lauf() -> void:
	var arg: Dictionary = _argumente()
	_zoom = int(arg.get("zoom", "2"))
	_blick = int(arg.get("blick", "1"))
	var aus: String = String(arg.get("aus", ""))
	if aus == "":
		printerr("--aus fehlt")
		quit(1)
		return
	if not aus.is_absolute_path():
		aus = ProjectSettings.globalize_path("res://").path_join("..").path_join(aus).simplify_path()
	var modus: String = String(arg.get("modus", "bogen"))
	match modus:
		"bogen":
			await _bogen(String(arg.get("zeilen", "")), aus)
		"zyklus":
			await _zyklus(String(arg.get("clip", "")), aus)
		"ticks":
			await _ticks(String(arg.get("clip", "")), aus)
		"folge":
			await _folge(String(arg.get("folge", "")), aus, int(arg.get("jede", "2")))
		_:
			printerr("--modus bogen|zyklus|ticks|folge")
			quit(1)
			return
	quit(0)


func _viewport(b: int, h: int) -> Array:
	var vp: SubViewport = SubViewport.new()
	vp.size = Vector2i(b * _zoom, h * _zoom)
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(vp)
	var welt: Node2D = Node2D.new()
	welt.scale = Vector2(_zoom, _zoom)
	vp.add_child(welt)
	var grund: ColorRect = ColorRect.new()
	grund.color = GRUND
	grund.size = Vector2(b, h)
	welt.add_child(grund)
	return [vp, welt]


func _rechteck(eltern: Node, x: float, y: float, b: float, h: float, farbe: Color) -> void:
	var r: ColorRect = ColorRect.new()
	r.color = farbe
	r.position = Vector2(x, y)
	r.size = Vector2(b, h)
	eltern.add_child(r)


func _text(vp: SubViewport, x: float, y: float, text: String, farbe: Color = Color(1, 1, 1), groesse: int = 9) -> void:
	var l: Label = Label.new()
	l.text = text
	l.position = Vector2(x * _zoom, y * _zoom)
	l.add_theme_font_size_override("font_size", groesse)
	l.add_theme_color_override("font_color", farbe)
	vp.add_child(l)


## Bildnummern (0-basiert) der Ereignisse `ereignis_<name>` eines Clips.
func _ereignis_bilder(d: Dictionary) -> Array[int]:
	var a: Array[int] = []
	for k: String in (d["ereignis"] as Dictionary):
		a.append(int(d["ereignis"][k]))
	return a


## Namen der Ereignisse, die auf Bild i liegen (leer, wenn keines).
func _ereignis_name(d: Dictionary, i: int) -> String:
	var t: PackedStringArray = PackedStringArray()
	for k: String in (d["ereignis"] as Dictionary):
		if int(d["ereignis"][k]) == i:
			t.append(k)
	return ",".join(t)


## Zelle: Boden, Bodenlinie, Figur mit dem Abspieler, Ankerkreuz. `ort` = linke obere Ecke der Zelle (Weltpixel).
func _zelle(welt: Node2D, ort: Vector2, d: Dictionary, clip: String, index: int, rand_farbe: Variant) -> void:
	var b: int = int(d["breite"]) + 2 * RAND
	var h: int = int(d["hoehe"]) + 2 * RAND
	var fuss: Vector2 = ort + Vector2(float(RAND) + float(d["ankerx"]) + 0.5, float(RAND) + float(d["ankery"]) + 1.0)
	if _blick < 0:
		fuss.x = ort.x + float(b) - (float(RAND) + float(d["ankerx"]) + 0.5)
	_rechteck(welt, ort.x, fuss.y, b, ort.y + h - fuss.y, BODEN)
	_rechteck(welt, ort.x, fuss.y - 0.5, b, 0.5, Color(0.9, 0.9, 0.9, 0.7))
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	v.position = fuss
	welt.add_child(v)
	v.aus_clip_bild(clip, index, _blick)
	_rechteck(welt, fuss.x - 2.5, fuss.y - 0.25, 5, 0.5, Color(1, 0.1, 0.1))
	_rechteck(welt, fuss.x - 0.25, fuss.y - 2.5, 0.5, 5, Color(1, 0.1, 0.1))
	if rand_farbe != null:
		var c: Color = rand_farbe
		for r: Rect2 in [Rect2(0, 0, b, 1), Rect2(0, h - 1, b, 1), Rect2(0, 0, 1, h), Rect2(b - 1, 0, 1, h)]:
			_rechteck(welt, ort.x + r.position.x, ort.y + r.position.y, r.size.x, r.size.y, c)


func _bogen(zeilen_text: String, aus: String) -> void:
	var zeilen: Array = []
	var breit: int = 0
	var hoch: int = 0
	for z: String in zeilen_text.split(";", false):
		var t: PackedStringArray = z.split(":")
		var clip: String = t[0]
		var c: Dictionary = DarstellungVelaFrames.clip_laden(clip)
		if c.is_empty():
			printerr("Clip %s nicht geladen" % clip)
			quit(1)
			return
		var d: Dictionary = c["daten"]
		var art: String = t[1] if t.size() > 1 else "zyklus"
		var idx: Array[int] = []
		if art == "zyklus":
			for i: int in range(int(d["zyklus_start"]), int(d["zyklus_start"]) + DarstellungVelaFramesTabelle.zyklus_laenge(d)):
				idx.append(i)
		elif art == "alle":
			var n: int = int(t[2]) if t.size() > 2 else 1
			for i: int in range(0, int(d["bilder"]), n):
				idx.append(i)
			for e: int in [int(d["ausholen"]), int(d["kontakt"]), int(d["ruhe"])] + _ereignis_bilder(d):
				if not idx.has(e):
					idx.append(e)
			idx.sort()
		else:
			for s: String in (t[2] if t.size() > 2 else "1").split(",", false):
				idx.append(int(s) - 1)
		zeilen.append({"clip": clip, "d": d, "idx": idx})
		var cb: int = int(d["breite"]) + 2 * RAND
		breit = maxi(breit, mini(idx.size(), 10) * cb)
		hoch += ((idx.size() + 9) / 10) * (int(d["hoehe"]) + 2 * RAND + KOPF)
	var vw: Array = _viewport(breit, hoch)
	var vp: SubViewport = vw[0]
	var welt: Node2D = vw[1]
	var y: int = 0
	var texte: Array = []
	for zl: Dictionary in zeilen:
		var d: Dictionary = zl["d"]
		var cb: int = int(d["breite"]) + 2 * RAND
		var ch: int = int(d["hoehe"]) + 2 * RAND
		var idx: Array[int] = zl["idx"]
		for k: int in idx.size():
			var sp: int = k % 10
			if k > 0 and sp == 0:
				y += ch + KOPF
			var i: int = idx[k]
			var rand: Variant = null
			var marke: String = ""
			var evn: String = _ereignis_name(d, i)
			if evn != "":
				rand = Color(1.0, 0.85, 0.2)
				marke = " " + evn
			if String(zl["clip"]).contains("kette"):
				if i == int(d["ausholen"]):
					rand = Color(0.3, 0.7, 1.0)
					marke = " Ausholen"
				if i == int(d["kontakt"]):
					rand = Color(0.95, 0.2, 0.15)
					marke = " KONTAKT"
				if i == int(d["ruhe"]) and i != int(d["kontakt"]):
					rand = Color(0.3, 0.9, 0.4)
					marke = " Ruhe"
			var ort: Vector2 = Vector2(sp * cb, y + KOPF)
			_zelle(welt, ort, d, String(zl["clip"]), i, rand)
			texte.append([ort.x + 2, ort.y - KOPF + 1, "%d%s" % [i + 1, marke]])
		texte.append([2, y + 0.0, String(zl["clip"])])
		y += ch + KOPF
	for t: Array in texte:
		_text(vp, float(t[0]), float(t[1]), String(t[2]), Color(1, 1, 0.7), 8)
	for _i in 4:
		await process_frame
	var bild: Image = vp.get_texture().get_image()
	DirAccess.make_dir_recursive_absolute(aus.get_base_dir())
	bild.save_png(aus)
	print("Kontaktbogen: %s %s" % [aus, str(bild.get_size())])


## Einzelbilder des erkannten Zyklus (dreimal hintereinander), Bildrate der Quelle.
func _zyklus(clip: String, aus: String) -> void:
	var c: Dictionary = DarstellungVelaFrames.clip_laden(clip)
	if c.is_empty():
		printerr("Clip %s nicht geladen" % clip)
		quit(1)
		return
	var d: Dictionary = c["daten"]
	var n: int = DarstellungVelaFramesTabelle.zyklus_laenge(d)
	var start: int = int(d["zyklus_start"])
	var cb: int = int(d["breite"]) + 2 * RAND
	var ch: int = int(d["hoehe"]) + 2 * RAND
	var vw: Array = _viewport(cb, ch + KOPF)
	var vp: SubViewport = vw[0]
	var welt: Node2D = vw[1]
	DirAccess.make_dir_recursive_absolute(aus)
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	var fuss: Vector2 = Vector2(float(RAND) + float(d["ankerx"]) + 0.5, float(KOPF) + float(RAND) + float(d["ankery"]) + 1.0)
	_rechteck(welt, 0, fuss.y, cb, ch + KOPF - fuss.y, BODEN)
	_rechteck(welt, 0, fuss.y - 0.5, cb, 0.5, Color(0.9, 0.9, 0.9, 0.7))
	v.position = fuss
	welt.add_child(v)
	var l: Label = Label.new()
	l.add_theme_font_size_override("font_size", 9)
	l.position = Vector2(2 * _zoom, 0)
	vp.add_child(l)
	var nr: int = 0
	for runde: int in 3:
		for k: int in n:
			v.aus_clip_bild(clip, start + k, _blick)
			l.text = "%s  Zyklus %d/%d  Bild %d" % [clip, k + 1, n, start + k + 1]
			await process_frame
			await process_frame
			vp.get_texture().get_image().save_png(aus.path_join("b%04d.png" % nr))
			nr += 1
	print("Zyklus-Bilder: %d in %s" % [nr, aus])


## Einzelbilder je Logik-Tick der Zuordnung einer Kette (Name mit „kette“ und Stufe), mit Trefferstopp.
func _ticks(clip: String, aus: String) -> void:
	var c: Dictionary = DarstellungVelaFrames.clip_laden(clip)
	var stufe: int = DarstellungVelaFramesTabelle.stufe_aus_name(clip)
	if c.is_empty() or stufe == 0:
		printerr("Clip %s fehlt oder ist kein Schlagclip" % clip)
		quit(1)
		return
	var d: Dictionary = c["daten"]
	var von: int = KernWerte.KETTE_AKTIV_VON[stufe - 1]
	var bis: int = KernWerte.KETTE_AKTIV_BIS[stufe - 1]
	var dauer: int = DarstellungVelaFramesTabelle.kette_dauer(stufe)
	# Ticks der Logik: 6 davor (Kampfhaltung), Uhr 1 bis Dauer mit TREFFERSTOPP Ticks im ersten aktiven Frame
	# (die Uhr steht), 8 danach
	var folge: Array = []
	for i: int in 6:
		folge.append({"uhr": 0, "stopp": 0})
	for u: int in range(1, dauer + 1):
		folge.append({"uhr": u, "stopp": 0})
		if u == von or (stufe == KernWerte.KOMBO_MAX and u == KernWerte.KETTE4_ZWEITES_FENSTER_VON):
			for s: int in KernWerte.TREFFERSTOPP:
				folge.append({"uhr": u, "stopp": KernWerte.TREFFERSTOPP - s})
	for i: int in 8:
		folge.append({"uhr": dauer + 1, "stopp": 0})
	var kb: int = int(d["breite"]) + 2 * RAND
	var kh: int = int(d["hoehe"]) + 2 * RAND
	var box: int = 8
	var zeit_b: int = folge.size() * box + 8
	var b: int = maxi(kb, zeit_b)
	var h: int = kh + 52
	var vw: Array = _viewport(b, h)
	var vp: SubViewport = vw[0]
	var welt: Node2D = vw[1]
	DirAccess.make_dir_recursive_absolute(aus)
	var fuss: Vector2 = Vector2(float(RAND) + float(d["ankerx"]) + 0.5, float(RAND) + float(d["ankery"]) + 1.0 + 14.0)
	_rechteck(welt, 0, fuss.y, kb, kh + 14 - fuss.y + 4, BODEN)
	_rechteck(welt, 0, fuss.y - 0.5, kb, 0.5, Color(0.9, 0.9, 0.9, 0.7))
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	v.position = fuss
	welt.add_child(v)
	# Zeitachse: ein Kästchen je Tick der Logik
	var y0: float = float(kh + 22)
	var kaesten: Array[ColorRect] = []
	for i: int in folge.size():
		var f: Dictionary = folge[i]
		var farbe: Color = Color(0.25, 0.28, 0.24)
		var uu: int = int(f["uhr"])
		if (uu >= von and uu <= bis) or (stufe == KernWerte.KOMBO_MAX and uu >= KernWerte.KETTE4_ZWEITES_FENSTER_VON and uu <= KernWerte.KETTE4_ZWEITES_FENSTER_BIS):
			farbe = Color(0.85, 0.55, 0.15)
		if int(f["stopp"]) > 0:
			farbe = Color(0.85, 0.2, 0.15)
		if int(f["uhr"]) == 0 or int(f["uhr"]) > dauer:
			farbe = Color(0.35, 0.38, 0.34)
		var k: ColorRect = ColorRect.new()
		k.color = farbe
		k.position = Vector2(4 + i * box, y0)
		k.size = Vector2(box - 1, 10)
		welt.add_child(k)
		kaesten.append(k)
	var marke: ColorRect = ColorRect.new()
	marke.color = Color(1, 1, 1)
	marke.size = Vector2(box - 1, 2)
	welt.add_child(marke)
	var l1: Label = Label.new()
	l1.add_theme_font_size_override("font_size", 9)
	l1.position = Vector2(2 * _zoom, 0)
	vp.add_child(l1)
	var l2: Label = Label.new()
	l2.add_theme_font_size_override("font_size", 9)
	l2.add_theme_color_override("font_color", Color(1, 1, 0.7))
	l2.position = Vector2(2 * _zoom, (y0 + 13.0) * _zoom)
	l2.text = "1 Kästchen = 1 Tick der Logik (60/s); orange: aktive Frames (Uhr %d bis %d); rot: Trefferstopp (%d Ticks)" % [von, bis, KernWerte.TREFFERSTOPP]
	vp.add_child(l2)
	var nr: int = 0
	for i: int in folge.size():
		var f: Dictionary = folge[i]
		var uhr: int = int(f["uhr"])
		var idx: int = 0
		if uhr >= 1:
			idx = DarstellungVelaFramesTabelle.bildindex(clip, uhr, d)
		v.aus_clip_bild(clip, idx, _blick)
		marke.position = Vector2(4 + i * box, y0 - 3)
		var zusatz: String = ""
		if int(f["stopp"]) > 0:
			zusatz = "  TREFFERSTOPP noch %d" % int(f["stopp"])
		l1.text = "%s  Tick %d  Uhr %s  Bild %d%s" % [clip, i + 1, str(uhr) if uhr >= 1 and uhr <= dauer else "-", idx + 1, zusatz]
		await process_frame
		await process_frame
		vp.get_texture().get_image().save_png(aus.path_join("b%04d.png" % nr))
		nr += 1
	print("Tick-Bilder: %d in %s" % [nr, aus])


# ---------------------------------------------------------------------------
# Aktionsfolgen über Logik-Ticks (Sprung, Treffer, Umwerfen/Liegen/Aufstehen, Sprint, Stand)
# ---------------------------------------------------------------------------

const AKTION_FARBE: Dictionary = {
	"STAND": Color(0.30, 0.33, 0.28), "SPRINT": Color(0.85, 0.75, 0.20), "SPRUNG": Color(0.25, 0.55, 0.85),
	"LANDUNG": Color(0.20, 0.70, 0.70), "GETROFFEN": Color(0.85, 0.20, 0.15), "UMGEWORFEN": Color(0.85, 0.50, 0.15),
	"LIEGEN": Color(0.55, 0.55, 0.55), "AUFSTEHEN": Color(0.30, 0.75, 0.35),
}


func _schritt(f: KernEntitaeten.Figur, aktion: String, uhr: int, dx: float = 0.0, dy: float = 0.0, boden: float = 0.0) -> Dictionary:
	var c: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	c.aktion = aktion
	c.uhr = uhr
	c.blick = f.blick
	c.vh = f.vh
	c.bahn = f.bahn
	c.bahn_richtung = f.bahn_richtung
	c.bahn_frame = f.bahn_frame
	c.bahn_boden = f.bahn_boden
	c.sprint_n = f.sprint_n
	c.phase = f.phase
	return {"fig": c, "dx": dx, "dy": dy, "boden": boden}


## Baut die Tickfolge: Array von {fig, dx, dy, boden} (dx, dy in Bildpixeln aus den Positionen der Logik, boden = Scrollen
## des Bodens beim Sprint).
func _folge_bauen(name: String) -> Array:
	var aus: Array = []
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	var px: float = float(DarstellungMasse.DARSTELLUNG) / 65536.0
	for i: int in 6:
		aus.append(_schritt(f, "STAND", i + 1))
	match name:
		"sprung":
			var h: int = 0
			f.vh = KernWerte.SPRUNG_VH_START
			for u: int in range(1, KernWerte.SPRUNG_LETZTER_LUFTFRAME + 1):
				if u >= 2:
					h = h + f.vh
					f.vh = f.vh - KernWerte.SPRUNG_SCHWERKRAFT
				aus.append(_schritt(f, "SPRUNG", u, 0.0, float(h) * px))
			for u: int in range(1, KernWerte.LANDUNG_DAUER + 1):
				aus.append(_schritt(f, "LANDUNG", u))
			for i: int in 14:
				aus.append(_schritt(f, "STAND", 6 + i))
		"getroffen":
			for u: int in range(1, KernWerte.GETROFFEN_DAUER + 1):
				aus.append(_schritt(f, "GETROFFEN", u))
			for i: int in 14:
				aus.append(_schritt(f, "STAND", 6 + i))
		"umgeworfen":
			KernBahn.bahnStarten(f, "F1", -1)
			f.x = 0
			f.h = 0
			var ende: int = KernWerte.FIGUR_LIEGEN_ENDE
			for d: int in range(0, ende + KernWerte.FIGUR_AUFSTEHEN_DAUER + 1):
				var akt: String = "UMGEWORFEN"
				var uhr: int = d + 1
				if d >= KernWerte.FIGUR_LIEGEN_AB:
					akt = "LIEGEN"
					uhr = d - KernWerte.FIGUR_LIEGEN_AB + 1
				if d > ende:
					akt = "AUFSTEHEN"
					uhr = d - ende
				if d > KernWerte.F1_STILLSTAND and d <= KernWerte.FIGUR_UMGEWORFEN_RUHE:
					KernBahn.bahnSchritt(f, d, null)
				aus.append(_schritt(f, akt, uhr, float(f.x) * px, float(f.h) * px))
			for i: int in 14:
				aus.append(_schritt(f, "STAND", 6 + i, float(f.x) * px))
		"sprint":
			f.blick = 1
			var strecke: int = 0
			for n: int in range(1, 61):
				f.sprint_n = n
				strecke += DarstellungVelaFramesTabelle.sprint_tempo(n)
				aus.append(_schritt(f, "SPRINT", n, 0.0, 0.0, float(strecke) * px))
		"stand":
			for i: int in 170:
				aus.append(_schritt(f, "STAND", 7 + i))
	return aus


func _folge(name: String, aus: String, jede: int) -> void:
	var schritte: Array = _folge_bauen(name)
	if schritte.is_empty():
		printerr("Folge %s unbekannt (sprung, getroffen, umgeworfen, sprint, stand)" % name)
		quit(1)
		return
	# Bildgröße: Figur 160 × 160 Bildpixel Platz, Weg in x aus den Schritten
	var xmin: float = 0.0
	var xmax: float = 0.0
	var ymax: float = 0.0
	for st: Dictionary in schritte:
		xmin = minf(xmin, float(st["dx"]))
		xmax = maxf(xmax, float(st["dx"]))
		ymax = maxf(ymax, float(st["dy"]))
	var rand_l: float = 90.0
	var rand_r: float = 90.0
	var b: int = int(xmax - xmin + rand_l + rand_r)
	var kopf: int = 14
	var boden_h: int = 14
	var fig_h: int = 152
	var zeit_h: int = 22
	var h: int = int(ymax) + fig_h + kopf + boden_h + zeit_h
	var vw: Array = _viewport(b, h)
	var vp: SubViewport = vw[0]
	var welt: Node2D = vw[1]
	DirAccess.make_dir_recursive_absolute(aus)
	var fuss_y: float = float(kopf) + float(int(ymax) + fig_h)
	var x0: float = rand_l - xmin
	_rechteck(welt, 0, fuss_y, b, float(boden_h), BODEN)
	_rechteck(welt, 0, fuss_y - 0.5, b, 0.5, Color(0.9, 0.9, 0.9, 0.7))
	# Bodenmarken (scrollen beim Sprint)
	var marken: Array[ColorRect] = []
	for i: int in (b / 24) + 3:
		var m: ColorRect = ColorRect.new()
		m.color = Color(0.20, 0.23, 0.18)
		m.size = Vector2(2, float(boden_h) - 4.0)
		m.position = Vector2(float(i * 24), fuss_y + 2.0)
		welt.add_child(m)
		marken.append(m)
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	welt.add_child(v)
	var kaesten_y: float = float(h - zeit_h + 6)
	var box: float = float(b - 8) / float(schritte.size())
	for i: int in schritte.size():
		var k: ColorRect = ColorRect.new()
		k.color = AKTION_FARBE.get((schritte[i]["fig"] as KernEntitaeten.Figur).aktion, Color(0.4, 0.4, 0.4))
		k.position = Vector2(4.0 + float(i) * box, kaesten_y)
		k.size = Vector2(maxf(box - 0.5, 1.0), 8)
		welt.add_child(k)
	var marke: ColorRect = ColorRect.new()
	marke.color = Color(1, 1, 1)
	marke.size = Vector2(maxf(box, 2.0), 2)
	welt.add_child(marke)
	var l1: Label = Label.new()
	l1.add_theme_font_size_override("font_size", 9)
	l1.position = Vector2(2 * _zoom, 0)
	vp.add_child(l1)
	var nr: int = 0
	for i: int in schritte.size():
		var st: Dictionary = schritte[i]
		var f: KernEntitaeten.Figur = st["fig"]
		v.position = Vector2(x0 + float(st["dx"]), fuss_y - float(st["dy"]))
		var w: Dictionary = DarstellungVelaFramesTabelle.wahl(f, null)
		var text: String = "Tick %d  %s uhr %d" % [i + 1, f.aktion, f.uhr]
		if w.is_empty() or DarstellungVelaFrames.clip_laden(String(w["clip"])).is_empty():
			v.visible = false
			text += "  (kein Clip)"
		else:
			v.aus_figur(f, null)
			text += "  %s Bild %d%s" % [w["clip"], v.bild_index() + 1, "  gespiegelt" if v.blick() < 0 else ""]
		for mi: int in marken.size():
			marken[mi].position.x = fposmod(float(mi * 24) - float(st["boden"]), float((b / 24 + 3) * 24)) - 24.0
		marke.position = Vector2(4.0 + float(i) * box, kaesten_y - 3.0)
		l1.text = text
		if i % jede != 0 and i != schritte.size() - 1:
			continue
		await process_frame
		await process_frame
		vp.get_texture().get_image().save_png(aus.path_join("b%04d.png" % nr))
		nr += 1
	print("Folge %s: %d Bilder (jeder %d. Tick von %d) in %s, Größe %d x %d" % [name, nr, jede, schritte.size(), aus, b * _zoom, h * _zoom])
