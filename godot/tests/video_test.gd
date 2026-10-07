## Test des Video-Wegs für Vela: Ergebnisse des Umsetzers an den TESTCLIPS (aus der Puppe, nicht von Grok), die
## Zuordnung Aktion/Uhr → Bild, der Abspieler und die Rückfallreihenfolge der Quellen in der Darstellung.
## Läuft ohne Fenster und ohne ffmpeg (liest die bereits erzeugten Ordner unter godot/grafik/vela_video/):
##   godot --headless --path godot --script res://tests/alle.gd
## Einbindung: `var r := VideoTest.lauf()`; r["geprueft"] Zahl der Prüfungen, r["fehler"] Meldungen.
class_name VideoTest
extends RefCounted

const ORDNER: String = "res://grafik/vela_video/"
const GEHEN: String = "_test_gehen"
const KETTE: String = "_test_kette1"
const SCHRITTE: int = 600
## Raster der Bildunterschriften des Umsetzers (video_umsetzer.gd SIG)
const SIG: int = 24
const T = preload("res://darstellung/vela_frames_tabelle.gd")

var _geprueft: int = 0
var _fehler: Array[String] = []


static func lauf() -> Dictionary:
	var t: VideoTest = VideoTest.new()
	t._alles()
	return {"geprueft": t._geprueft, "fehler": t._fehler}


func _ok(bedingung: bool, name: String) -> void:
	_geprueft += 1
	if not bedingung:
		_fehler.append(name)


func _gleich(ist: Variant, soll: Variant, name: String) -> void:
	_geprueft += 1
	if typeof(ist) != typeof(soll) or ist != soll:
		_fehler.append("%s: ist %s, soll %s" % [name, var_to_str(ist), var_to_str(soll)])


func _alles() -> void:
	DarstellungVelaFrames.clips_vergessen()
	_clips(GEHEN)
	_clips(KETTE)
	_gehen_clip()
	_kette_clip()
	_umsetzer_funktionen()
	_tabelle_schlag()
	_tabelle_schleife()
	_tabelle_clipdaten()
	_abspieler()
	_abdeckung()
	_szene()
	DarstellungVelaFrames.clips_vergessen()


# ---------------------------------------------------------------------------
# Hilfen
# ---------------------------------------------------------------------------

func _bild(clip: String, nr: int) -> Image:
	var bytes: PackedByteArray = FileAccess.get_file_as_bytes(ORDNER + clip + "/f_%04d.png" % nr)
	var b: Image = Image.new()
	if bytes.is_empty() or b.load_png_from_buffer(bytes) != OK:
		return null
	b.convert(Image.FORMAT_RGBA8)
	return b


## Zeilen mit deckenden Pixeln: [oberste, unterste]; leer: [−1, −1].
func _zeilen(b: Image) -> Array[int]:
	var d: PackedByteArray = b.get_data()
	var w: int = b.get_width()
	var oben: int = -1
	var unten: int = -1
	for y: int in b.get_height():
		for x: int in w:
			if d[(y * w + x) * 4 + 3] != 0:
				if oben < 0:
					oben = y
				unten = y
				break
	return [oben, unten]


func _daten(clip: String) -> Dictionary:
	return DarstellungVelaFramesTabelle.clip_lesen(FileAccess.get_file_as_string(ORDNER + clip + "/clip.txt"))


func _liste(clip: String, schluessel: String) -> Array[int]:
	var a: Array[int] = []
	for z: String in FileAccess.get_file_as_string(ORDNER + clip + "/clip.txt").split("\n"):
		if z.begins_with(schluessel + "="):
			for s: String in z.substr(schluessel.length() + 1).split(",", false):
				a.append(int(s))
	return a


# ---------------------------------------------------------------------------
# Ergebnisse des Umsetzers an den Testclips
# ---------------------------------------------------------------------------

func _clips(clip: String) -> void:
	var d: Dictionary = _daten(clip)
	_ok(not d.is_empty(), "%s: clip.txt lesbar" % clip)
	if d.is_empty():
		return
	var n: int = d["bilder"]
	_ok(n >= 20, "%s: mindestens 20 Bilder (%d)" % [clip, n])
	var breite: int = d["breite"]
	var hoehe: int = d["hoehe"]
	var farben: Dictionary = {}
	var halb: int = 0
	var groesse_ok: bool = true
	var fehlt: bool = false
	for i: int in range(1, n + 1):
		var b: Image = _bild(clip, i)
		if b == null:
			fehlt = true
			continue
		if b.get_width() != breite or b.get_height() != hoehe:
			groesse_ok = false
		var px: PackedByteArray = b.get_data()
		for p: int in px.size() / 4:
			var a: int = px[p * 4 + 3]
			if a != 0 and a != 255:
				halb += 1
			if a == 255:
				farben[(px[p * 4] << 16) | (px[p * 4 + 1] << 8) | px[p * 4 + 2]] = true
	_ok(not fehlt, "%s: alle Bilder f_0001 bis f_%04d vorhanden" % [clip, n])
	_ok(groesse_ok, "%s: alle Bilder gleich groß (%d x %d)" % [clip, breite, hoehe])
	_gleich(halb, 0, "%s: keine Halbtransparenz (Alpha nur 0 oder 255)" % clip)
	_ok(farben.size() <= 63, "%s: höchstens 63 Farben und durchsichtig = 64 (%d)" % [clip, farben.size()])
	_ok(int(d["farben"]) <= 63, "%s: clip.txt meldet höchstens 63 Farben (%d)" % [clip, d["farben"]])
	# Maßstab: Figur im ersten Bild 142 Bildpixel hoch, Anker auf der Bodenlinie, x in der Mitte der Füße
	var b1: Image = _bild(clip, 1)
	if b1 == null:
		return
	var z: Array[int] = _zeilen(b1)
	_gleich(z[1] - z[0] + 1, 142, "%s: Figur im ersten Bild 142 Bildpixel hoch" % clip)
	_gleich(int(d["ankery"]), z[1], "%s: Anker y = unterste Figurzeile des ersten Bildes" % clip)
	var px1: PackedByteArray = b1.get_data()
	var xmin: int = breite
	var xmax: int = -1
	for y: int in range(z[1] - 5, z[1] + 1):
		for x: int in breite:
			if px1[(y * breite + x) * 4 + 3] != 0:
				xmin = mini(xmin, x)
				xmax = maxi(xmax, x)
	_gleich(int(d["ankerx"]), (xmin + xmax) / 2, "%s: Anker x = Mitte der untersten 6 Zeilen" % clip)
	_ok(int(d["ankerx"]) > 0 and int(d["ankerx"]) < breite and int(d["ankery"]) < hoehe, "%s: Anker im Bild" % clip)
	# Zuschnitt: 2 px Rand um die Vereinigung aller Figuren
	var x0: int = breite
	var y0: int = hoehe
	var x1: int = -1
	var y1: int = -1
	for i: int in range(1, n + 1):
		var b: Image = _bild(clip, i)
		var px: PackedByteArray = b.get_data()
		for y: int in hoehe:
			for x: int in breite:
				if px[(y * breite + x) * 4 + 3] != 0:
					x0 = mini(x0, x)
					x1 = maxi(x1, x)
					y0 = mini(y0, y)
					y1 = maxi(y1, y)
	_gleich([x0, y0, breite - 1 - x1, hoehe - 1 - y1], [2, 2, 2, 2], "%s: Zuschnitt = Vereinigung aller Figuren plus 2 px" % clip)


func _gehen_clip() -> void:
	var d: Dictionary = _daten(GEHEN)
	if d.is_empty():
		return
	# Die Puppe geht 24 Ticks je Doppelschritt = 9,6 Videobilder: erkannt werden muss 10 (±1), ein Zyklus
	var n: int = d["zyklus_bilder"]
	_ok(n >= 9 and n <= 11, "gehen: Zykluslänge 9 bis 11 Bilder erkannt (%d)" % n)
	_ok(int(d["zyklus_start"]) >= 0 and int(d["zyklus_start"]) + n <= int(d["bilder"]), "gehen: Zyklus liegt im Clip")
	var schluss: int = 1000
	for z: String in FileAccess.get_file_as_string(ORDNER + GEHEN + "/clip.txt").split("\n"):
		if z.begins_with("zyklus_schluss_in_schritten="):
			schluss = int(z.substr(28))
	_ok(schluss <= 100, "gehen: Zyklus schließt (Fehler %d %% eines Bildschritts, höchstens 100)" % schluss)
	_ok(int(d["zyklus_ticks"]) >= 18 and int(d["zyklus_ticks"]) <= 30, "gehen: Zyklusdauer aus der Schrittlänge nahe 24 Ticks (%d)" % d["zyklus_ticks"])
	var tick: int = DarstellungVelaFramesTabelle.zyklus_ticks("gehen", d)
	_gleich(tick, int(d["zyklus_ticks"]), "gehen: Tabelle nimmt die Dauer aus clip.txt")


func _kette_clip() -> void:
	var d: Dictionary = _daten(KETTE)
	if d.is_empty():
		return
	var a: int = d["ausholen"]
	var k: int = d["kontakt"]
	var r: int = d["ruhe"]
	_ok(a < k and k < r and r < int(d["bilder"]), "kette1: Ausholen (%d) < Kontakt (%d) < Ruhe (%d) < Bilderzahl" % [a, k, r])
	_gleich(d["rueckkehr"], "vorwaerts", "kette1: Clip kehrt in die Kampfhaltung zurück")
	var vorn: Array[int] = _liste(KETTE, "vorn")
	_gleich(vorn.size(), int(d["bilder"]), "kette1: eine Ausdehnung je Bild")
	if vorn.size() != int(d["bilder"]):
		return
	var spitze: int = vorn.max()
	_ok(vorn[k] >= spitze - 4, "kette1: Kontaktbild = volle Streckung nach vorn (%d von höchstens %d)" % [vorn[k], spitze])
	_ok(vorn[k] - vorn[0] >= 30, "kette1: im Kontakt ist der Arm weit vorn (%d gegen %d in der Haltung)" % [vorn[k], vorn[0]])
	_ok(vorn[a] <= vorn[0], "kette1: beim Ausholen-Ende liegt die Faust nicht weiter vorn als in der Haltung (%d)" % vorn[a])
	for i: int in range(0, k):
		if vorn[i] >= spitze - 4:
			_ok(false, "kette1: Kontakt ist das ERSTE Bild der vollen Streckung (Bild %d früher)" % i)
			break
	var rz: int = d["rueckzug"]
	_ok(rz >= k and rz < r and vorn[rz] >= spitze - 4, "kette1: Rückzug = letztes Bild der vollen Streckung (%d)" % rz)
	_ok(absi(vorn[r] - vorn[0]) <= 3, "kette1: Ruhe gleicht der Haltung (%d gegen %d)" % [vorn[r], vorn[0]])
	_ok(int(d["bilder"]) < int(_quell(KETTE)), "kette1: Wartezeit vorn abgeschnitten")


func _quell(clip: String) -> int:
	for z: String in FileAccess.get_file_as_string(ORDNER + clip + "/clip.txt").split("\n"):
		if z.begins_with("quell_bilder="):
			return int(z.substr(13))
	return 0


# ---------------------------------------------------------------------------
# Funktionen des Umsetzers an künstlichen Daten (ohne ffmpeg)
# ---------------------------------------------------------------------------

func _sig(zellen: Array) -> PackedByteArray:
	var s: PackedByteArray = PackedByteArray()
	s.resize(SIG * SIG * 4)
	for z: int in zellen:
		s[z * 4] = 255
		s[z * 4 + 1] = 200
	return s


func _umsetzer_funktionen() -> void:
	var u: GDScript = load("res://werkzeuge/video_umsetzer.gd")
	# Freistellen: Grün-Hintergrund, Schatten, Lücke, dunkle Fläche, Staub, nahe Teile
	var w: int = 80
	var h: int = 80
	var rgb: PackedByteArray = PackedByteArray()
	rgb.resize(w * h * 3)
	for p: int in w * h:
		rgb[p * 3 + 1] = 255
	var punkt: Callable = func(x0: int, y0: int, x1: int, y1: int, r: int, g: int, b: int) -> void:
		for y: int in range(y0, y1 + 1):
			for x: int in range(x0, x1 + 1):
				var i: int = (y * w + x) * 3
				rgb[i] = r
				rgb[i + 1] = g
				rgb[i + 2] = b
	punkt.call(20, 20, 59, 59, 10, 20, 60)
	punkt.call(30, 30, 49, 49, 0, 255, 0)
	punkt.call(24, 24, 27, 27, 0, 40, 0)
	punkt.call(10, 66, 70, 75, 0, 70, 0)
	punkt.call(2, 2, 3, 3, 200, 0, 0)
	punkt.call(61, 30, 64, 33, 200, 160, 30)
	punkt.call(40, 52, 41, 53, 2, 3, 2)
	punkt.call(20, 20, 20, 20, 120, 200, 120)
	var r: Dictionary = u.call("freistellen", rgb, w, h, Vector3i(0, 255, 0), "gruen")
	var m: PackedByteArray = r["maske"]
	var f: PackedByteArray = r["farbe"]
	_gleich(m[40 * w + 25], 1, "Freistellen: Fläche der Figur ist Figur")
	_gleich(m[40 * w + 40], 0, "Freistellen: echte Lücke (Schlüsselfarbe, vom Rand nicht erreichbar) bleibt durchsichtig")
	_gleich(m[26 * w + 26], 1, "Freistellen: eingeschlossene dunkle Fläche wird gefüllt")
	_gleich(m[70 * w + 40], 0, "Freistellen: dunkelgrüner Schatten fällt weg (Farbton, nicht Helligkeit)")
	_gleich(m[2 * w + 2], 0, "Freistellen: ferne Insel (Staub) fällt weg")
	_gleich(m[31 * w + 62], 1, "Freistellen: nahe Insel bleibt (Zopfspitze)")
	_gleich(m[52 * w + 40], 1, "Freistellen: schwarze Kleidung bleibt Figur")
	_gleich(m[5 * w + 70], 0, "Freistellen: Hintergrund bleibt Hintergrund")
	_gleich(m[20 * w + 20], 1, "Freistellen: Kantenpixel mit Grünstich bleibt Figur")
	_gleich(f[(20 * w + 20) * 3 + 1], 120, "Freistellen: Grünstich wird entfernt (Grün auf den größeren der anderen Kanäle begrenzt)")
	var r2: Dictionary = u.call("freistellen", rgb, w, h, Vector3i(0, 255, 0), "gruen")
	_ok(r["maske"] == r2["maske"] and r["farbe"] == r2["farbe"], "Freistellen: deterministisch")
	# Zyklus: ein Punkt läuft in 12 Bildern durch 12 Zellen (oben und unten), 60 Bilder
	var sigs: Array = []
	for i: int in 60:
		sigs.append(_sig([(i % 12) * 12, 300 + (i % 12) * 12]))
	var z: Dictionary = u.call("zyklus_suchen", sigs)
	_gleich(z["n"], 12, "Zyklus: Länge 12 aus künstlicher Schleife erkannt")
	_gleich(z["fehler"], 0, "Zyklus: Schließfehler 0 bei exakter Schleife")
	_gleich(z["schluss"], 0, "Zyklus: Schluss 0 Prozent")
	_gleich((z["start"] as int) + 12 <= 60, true, "Zyklus: Start im Clip")
	var z2: Dictionary = u.call("zyklus_suchen", sigs)
	_gleich(z["start"], z2["start"], "Zyklus: deterministisch")
	# Ereignisse: Haltung 30, Ausholen bis 25, Schlag auf 60 (Kontakt), Nachschwung 59, Rückkehr auf 30
	var vorn: Array[int] = [30, 30, 30, 28, 25, 25, 40, 60, 60, 59, 50, 40, 31, 30, 30]
	var hoch: Array[int] = []
	var sg: Array = []
	for v: int in vorn:
		hoch.append(10)
		sg.append(_sig([v]))
	var e: Dictionary = u.call("ereignisse_suchen", sg, vorn, hoch, "vorn")
	_gleich(e["kontakt"], 7, "Ereignisse: Kontakt = erstes Bild der vollen Streckung")
	_gleich(e["ausholen"], 5, "Ereignisse: Ausholen-Ende = letztes Bild vor dem Schlag")
	_gleich(e["ruhe"], 13, "Ereignisse: Ruhe = erstes Bild, das der Haltung wieder gleicht")
	_gleich(e["rueckkehr"], "vorwaerts", "Ereignisse: mit Rückkehr vorwärts")
	_gleich(e["rueckzug"], 9, "Ereignisse: Rückzug = letztes Bild der vollen Streckung")
	var vorn2: Array[int] = [30, 30, 28, 25, 40, 60, 60, 59, 60]
	var hoch2: Array[int] = []
	var sg2: Array = []
	for v: int in vorn2:
		hoch2.append(10)
		sg2.append(_sig([v]))
	var e2: Dictionary = u.call("ereignisse_suchen", sg2, vorn2, hoch2, "vorn")
	_gleich(e2["rueckkehr"], "rueckwaerts", "Ereignisse: Clip ohne Rückkehr erkannt (rueckwaerts)")
	_gleich(e2["ruhe"], 0, "Ereignisse: Ruhe ist dann das erste Bild")
	_gleich(e2["kontakt"], 5, "Ereignisse: Kontakt auch ohne Rückkehr")


# ---------------------------------------------------------------------------
# Zuordnung
# ---------------------------------------------------------------------------

## Clipdaten für Zuordnungstests ohne Dateien.
func _kunst(bilder: int, ausholen: int, kontakt: int, ruhe: int, rueck: String) -> Dictionary:
	return {"bilder": bilder, "ausholen": ausholen, "kontakt": kontakt, "ruhe": ruhe, "rueckkehr": rueck, "zyklus_start": 3, "zyklus_bilder": 10, "zyklus_ticks": 0, "fps": 24}


func _tabelle_schlag() -> void:
	_gleich([T.kette_dauer(1), T.kette_dauer(2), T.kette_dauer(3), T.kette_dauer(4)], [16, 16, 17, 25], "Tabelle: Dauern der Ketten 16, 16, 17, 25")
	var mit_halt: Dictionary = _kunst(60, 8, 20, 50, "vorwaerts")
	mit_halt["rueckzug"] = 40
	var daten: Array = [_kunst(60, 8, 20, 50, "vorwaerts"), _kunst(60, 8, 20, 50, "rueckwaerts"), mit_halt, _daten(KETTE)]
	for di: int in daten.size():
		var d: Dictionary = daten[di]
		if d.is_empty():
			continue
		for stufe: int in range(1, 5):
			var von: int = KernWerte.KETTE_AKTIV_VON[stufe - 1]
			var bis: int = KernWerte.KETTE_AKTIV_BIS[stufe - 1]
			var dauer: int = T.kette_dauer(stufe)
			var k: int = d["kontakt"]
			var tag: String = "Tabelle kette%d (Clip %d)" % [stufe, di]
			var alle: Array[int] = T.verlauf("kette%d" % stufe, dauer + 10, d)
			# Kontaktbild beginnt im ersten aktiven Frame und hält bis zum letzten
			_gleich(alle[von - 1], k, "%s: Kontaktbild beginnt bei Uhr %d (KETTE_AKTIV_VON)" % [tag, von])
			_gleich(alle[bis - 1], k, "%s: Kontaktbild hält bis Uhr %d (KETTE_AKTIV_BIS)" % [tag, bis])
			if von > 1:
				_ok(alle[von - 2] != k, "%s: das Bild vor dem Treffer ist nicht das Kontaktbild" % tag)
			_gleich(alle[bis] != k or int(d["ruhe"]) == k, true, "%s: nach Uhr %d läuft der Rückzug" % [tag, bis])
			# Ausholen: Bilder zwischen Ausholen-Ende und Kontakt
			var a: int = d["ausholen"]
			var ok_vor: bool = true
			for u: int in range(1, von):
				if alle[u - 1] < a or alle[u - 1] >= k:
					ok_vor = false
			_ok(ok_vor, "%s: Uhr 1 bis %d zeigt Ausholen bis vor dem Kontakt" % [tag, von - 1])
			# Dauer: im letzten Tick ist die Ruhe erreicht, danach hält sie
			var ziel: int = 0 if String(d["rueckkehr"]) == "rueckwaerts" else int(d["ruhe"])
			_gleich(alle[dauer - 1], ziel, "%s: Ruhe im letzten Tick (Uhr %d)" % [tag, dauer])
			_gleich(alle[dauer + 9], ziel, "%s: nach der Dauer hält die Ruhe" % tag)
			# Rückzug monoton in Richtung Ruhe, nie über Kontakt und Ruhe hinaus
			var mono: bool = true
			var r0: int = k if String(d["rueckkehr"]) == "rueckwaerts" else clampi(int(d.get("rueckzug", k)), k, ziel)
			for u: int in range(bis, dauer):
				if ziel >= r0 and alle[u] < alle[u - 1]:
					mono = false
				if ziel < r0 and alle[u] > alle[u - 1]:
					mono = false
				if alle[u] < mini(ziel, r0) or alle[u] > maxi(ziel, r0):
					mono = false
			_ok(mono, "%s: Rückzug läuft stetig von Bild %d %s Bild %d" % [tag, r0, "rückwärts bis" if ziel < r0 else "vorwärts bis", ziel])
			var innen: bool = true
			for i: int in alle:
				if i < 0 or i >= int(d["bilder"]):
					innen = false
			_ok(innen, "%s: alle Indizes im Clip" % tag)
			# deterministisch, ohne Zustand
			_ok(alle == T.verlauf("kette%d" % stufe, dauer + 10, d), "%s: deterministisch" % tag)
	# Rückwärts ist schneller als das Ausholen: Kontakt (20) zurück auf 0 in dauer − bis Ticks, Ausholen von 8 bis 20
	var rw: Dictionary = _kunst(60, 8, 20, 50, "rueckwaerts")
	var vl: Array[int] = T.verlauf("kette1", 16, rw)
	_ok(vl[15] == 0 and vl[4] == 20, "Tabelle: rückwärts bis zur Kampfhaltung (erstes Bild)")
	# Uhr außerhalb
	_gleich(T.schlag(0, 1, rw), T.schlag(1, 1, rw), "Tabelle: Uhr 0 gilt wie Uhr 1")
	_gleich(T.schlag(99, 1, rw), 0, "Tabelle: weit nach der Dauer hält die Ruhe")


func _tabelle_schleife() -> void:
	var d: Dictionary = _kunst(40, 8, 20, 30, "vorwaerts")
	var n: int = 10
	var start: int = 3
	for ticks: int in [24, 18, 30, 7]:
		var ok: bool = true
		var benutzt: Dictionary = {}
		for u: int in range(1, 3 * ticks + 1):
			var i: int = T.schleife(u, ticks, start, n)
			if i < start or i >= start + n:
				ok = false
			if i != T.schleife(u + ticks, ticks, start, n):
				ok = false
			if u <= ticks:
				benutzt[i] = true
		_ok(ok, "Schleife T=%d: Indizes im Zyklus, nach T Ticks von vorn (schließt)" % ticks)
		if ticks >= n:
			_gleich(benutzt.size(), n, "Schleife T=%d: alle %d Zyklusbilder kommen vor" % [ticks, n])
		_gleich(T.schleife(1, ticks, start, n), start, "Schleife T=%d: Uhr 1 zeigt das Startbild" % ticks)
		_ok(T.schleife(ticks, ticks, start, n) < start + n, "Schleife T=%d: letzter Tick vor dem Startbild" % ticks)
	# Stand: Echtzeit (n Bilder bei fps Bildern/s auf 60 Ticks/s)
	d["fps"] = 24
	_gleich(T.zyklus_ticks("stand", d), 25, "Stand: 10 Bilder bei 24 Bildern/s = 25 Ticks")
	d["zyklus_ticks"] = 0
	_gleich(T.zyklus_ticks("gehen", d), 24, "Gehen: ohne Messung 24 Ticks je Doppelschritt")
	d["zyklus_ticks"] = 999
	_gleich(T.zyklus_ticks("gehen", d), 60, "Gehen: Dauer begrenzt auf 60 Ticks")
	# Gehtempo: Dauer × 3,5 Bildpixel je Tick = zwei Schritte
	var g: Dictionary = _daten(GEHEN)
	if not g.is_empty():
		var vl: Array[int] = T.verlauf(GEHEN, 100, g)
		_ok(vl == T.verlauf(GEHEN, 100, g), "Schleife gehen: deterministisch")
		var gt: int = T.zyklus_ticks("gehen", g)
		_gleich(vl[gt], vl[0], "Schleife gehen: nach einem Zyklus wieder das Startbild")


func _tabelle_clipdaten() -> void:
	_gleich(T.clip_name("STAND", 0), "stand", "Aktion STAND → Clip stand")
	_gleich(T.clip_name("LAUF", 0), "gehen", "Aktion LAUF → Clip gehen")
	_gleich(T.clip_name("SCHLAG", 3), "kette3", "Aktion SCHLAG Stufe 3 → Clip kette3")
	_gleich(T.clip_name("LEERSCHLAG", 1), "kette1", "Aktion LEERSCHLAG → Clip kette")
	_gleich(T.clip_name("SPRUNG", 1), "", "Aktion SPRUNG → kein Clip vorgesehen")
	_gleich(T.stufe_aus_name("kette4"), 4, "Stufe aus dem Namen kette4")
	_gleich(T.stufe_aus_name("_test_kette1"), 1, "Stufe aus dem Namen _test_kette1")
	_gleich(T.stufe_aus_name("gehen"), 0, "gehen ist kein Schlagclip")
	_ok(T.clip_lesen("").is_empty(), "clip.txt leer → keine Daten")
	var d: Dictionary = T.clip_lesen("bilder=5\ngroesse=10,20\nanker=4,19\nkontakt=3\nruhe=5\nausholen=2\nrueckkehr=rueckwaerts\nunscharf=2,4\nzyklus_start=2\n")
	_gleich([d["bilder"], d["breite"], d["hoehe"], d["ankerx"], d["ankery"]], [5, 10, 20, 4, 19], "clip.txt: Größe und Anker")
	_gleich([d["kontakt"], d["ruhe"], d["ausholen"], d["zyklus_start"]], [2, 4, 1, 1], "clip.txt: Indizes werden 0-basiert")
	_gleich(d["unscharf"], [1, 3], "clip.txt: unscharfe Bilder 0-basiert")
	_gleich(d["rueckkehr"], "rueckwaerts", "clip.txt: rueckkehr")


# ---------------------------------------------------------------------------
# Abspieler
# ---------------------------------------------------------------------------

func _abspieler() -> void:
	var d: Dictionary = _daten(KETTE)
	if d.is_empty():
		return
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	var bilder_ok: bool = true
	var nur_quellbilder: bool = true
	var rand_ok: bool = true
	for u: int in range(1, 20):
		_ok(v.aus_clip(KETTE, u, 1), "Abspieler: Clip %s gezeigt (Uhr %d)" % [KETTE, u])
		var soll: int = DarstellungVelaFramesTabelle.bildindex(KETTE, u, d)
		if v.bild_index() != soll:
			bilder_ok = false
		var datei: Image = _bild(KETTE, soll + 1)
		var b: Image = v.aktuelles_bild()
		if b == null or b.get_data() != datei.get_data():
			nur_quellbilder = false
		var px: PackedByteArray = b.get_data()
		for p: int in px.size() / 4:
			if px[p * 4 + 3] != 0 and px[p * 4 + 3] != 255:
				rand_ok = false
	_ok(bilder_ok, "Abspieler: Bildindex nach der Tabelle")
	_ok(nur_quellbilder, "Abspieler: zeigt immer unverändert ein Quellbild (kein Überblenden)")
	_ok(rand_ok, "Abspieler: keine Halbtransparenz im gezeigten Bild")
	# Lage: Anker im Ursprung, Texturfilter NEAREST, Blick links spiegelt
	v.aus_clip(KETTE, 1, 1)
	var s: Sprite2D = v.get_node("Bild")
	_gleich(s.offset, Vector2(-(float(d["ankerx"]) + 0.5), -(float(d["ankery"]) + 1.0)), "Abspieler: Anker wird abgezogen")
	_gleich(s.texture_filter, CanvasItem.TEXTURE_FILTER_NEAREST, "Abspieler: Texturfilter NEAREST")
	_gleich(v.scale, Vector2(1.0, 1.0), "Abspieler: Blick rechts")
	v.aus_clip(KETTE, 1, -1)
	_gleich(v.scale, Vector2(-1.0, 1.0), "Abspieler: Blick links spiegelt (scale.x = −1)")
	_ok(not v.aus_clip("gibt_es_nicht", 1, 1) and not v.visible, "Abspieler: fehlender Clip versteckt den Node")
	# aus_figur: Aktion → Clip (die Testclips heißen nicht stand/gehen/kette, daher nur über aus_clip)
	v.free()


func _abdeckung() -> void:
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	f.aktion = "SPRUNG"
	_ok(not DarstellungVelaFrames.abgedeckt(f), "abgedeckt: Aktion ohne Clip (SPRUNG) ist nicht abgedeckt")
	f.aktion = "STAND"
	_gleich(DarstellungVelaFrames.abgedeckt(f), not DarstellungVelaFrames.clip_laden("stand").is_empty(), "abgedeckt: STAND genau dann, wenn der Clip stand geladen ist")
	f.aktion = "LAUF"
	_gleich(DarstellungVelaFrames.abgedeckt(f), not DarstellungVelaFrames.clip_laden("gehen").is_empty(), "abgedeckt: LAUF genau dann, wenn der Clip gehen geladen ist")
	f.aktion = "SCHLAG"
	f.kombo = 2
	_gleich(DarstellungVelaFrames.abgedeckt(f), not DarstellungVelaFrames.clip_laden("kette2").is_empty(), "abgedeckt: SCHLAG genau dann, wenn der Clip der Stufe geladen ist")
	_ok(DarstellungVelaFrames.clip_laden("gibt_es_nicht").is_empty(), "abgedeckt: unbekannter Clip ist leer (Rückfall auf Puppe oder Platzhalter)")
	# Namen der Testclips fangen nie eine Aktion ab
	f.aktion = "STAND"
	_ok(DarstellungVelaFramesTabelle.clip_name(f.aktion, 1) == "stand", "abgedeckt: Aktion wählt nur die echten Clipnamen")


# ---------------------------------------------------------------------------
# Quellenreihenfolge in der Szene: Video, sonst Puppe, sonst Platzhalter; Protokoll bleibt gleich
# ---------------------------------------------------------------------------

func _szene() -> void:
	# Testclips als „stand“, „gehen“, „kette1“ bis „kette4“ vortäuschen (nur im Speicher)
	var cache: Dictionary = {}
	cache["stand"] = DarstellungVelaFrames.clip_laden(GEHEN)
	cache["gehen"] = DarstellungVelaFrames.clip_laden(GEHEN)
	for k: int in range(1, 5):
		cache["kette%d" % k] = DarstellungVelaFrames.clip_laden(KETTE)
	for n: String in cache:
		DarstellungVelaFrames._clips[n] = cache[n]
	var w: String = VergleichHilfe.wurzel()
	var ref_roh: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/referenz/alle/vorfuehrung.protokoll.csv"))
	_ok(ref_roh != null, "Szene: Referenzprotokoll vorhanden")
	if ref_roh == null:
		DarstellungVelaFrames.clips_vergessen()
		return
	var skript: GDScript = load("res://darstellung/spiel.gd")
	var sz: PackedStringArray = PackedStringArray(["--szene", "spiel/tests/szenen/vorfuehrung.txt", "--eingabe", "spiel/tests/eingaben/vorfuehrung.txt"])
	# 1. Video vor Puppe
	var spiel: Node2D = _spiel(skript, sz)
	var sitzung: DarstellungSitzung = spiel.get("sitzung")
	_ok(sitzung != null, "Szene: Spiel gestartet")
	if sitzung == null:
		spiel.free()
		DarstellungVelaFrames.clips_vergessen()
		return
	sitzung.protokollSetzen(true)
	var frames: Node2D = spiel.get("_frames")
	var puppe: Node2D = spiel.get("_puppe")
	_ok(frames != null and puppe != null, "Szene: Video-Frames und Puppe eingehängt")
	var nur_video: bool = true
	var video_gesehen: int = 0
	var platzhalter: int = 0
	var nie_beide: bool = true
	var test_vor: Dictionary = {}
	for _i in range(SCHRITTE):
		sitzung.logikSchritt()
		spiel.call("_puppeAktualisieren")
		var f: KernEntitaeten.Figur = sitzung.welt.figur
		var soll_video: bool = DarstellungVelaFrames.abgedeckt(f)
		if frames.visible != soll_video:
			nur_video = false
		if frames.visible:
			video_gesehen += 1
		if frames.visible and puppe.visible:
			nie_beide = false
		if not frames.visible and not puppe.visible and not (spiel.get("figur_extern") as bool):
			platzhalter += 1
		if frames.visible:
			test_vor[f.aktion] = true
		if (spiel.get("figur_extern") as bool) != (frames.visible or puppe.visible):
			nie_beide = false
	_ok(video_gesehen > 0, "Szene: Video wurde gezeigt (%d von %d Schritten)" % [video_gesehen, SCHRITTE])
	_ok(nur_video, "Szene: Video sichtbar genau dort, wo für die Aktion ein Clip da ist")
	_ok(nie_beide, "Szene: nie Video und Puppe zugleich; figur_extern folgt der Quelle")
	_ok(platzhalter > 0, "Szene: Aktionen ohne Clip und ohne Puppe zeigen den Platzhalter (%d Schritte)" % platzhalter)
	var ref: PackedStringArray = (ref_roh as String).split("\n")
	var ki: int = VergleichHilfe.kopfIndex(ref)
	var bis: int = ki + 1 + SCHRITTE
	var gleich: bool = sitzung.schreiber.protokollZeilen.size() == bis
	if gleich:
		for z in range(bis):
			if sitzung.schreiber.protokollZeilen[z] != ref[z]:
				gleich = false
				break
	_ok(gleich, "Szene mit Video: Protokoll gleicht der Referenz (Darstellung liest die Welt nur)")
	spiel.free()
	# 2. --puppe erzwingt die Puppe
	var spiel2: Node2D = _spiel(skript, sz + PackedStringArray(["--puppe"]))
	_ok(spiel2.get("_frames") == null and spiel2.get("_puppe") != null, "Szene: --puppe hängt keine Video-Frames ein")
	spiel2.free()
	# 3. --platzhalter: weder noch
	var spiel3: Node2D = _spiel(skript, sz + PackedStringArray(["--platzhalter"]))
	_ok(spiel3.get("_frames") == null and spiel3.get("_puppe") == null, "Szene: --platzhalter hängt nichts ein")
	spiel3.free()
	# 4. ohne Clips (Rückfall): Puppe, wo sie abdeckt
	DarstellungVelaFrames.clips_vergessen()
	for n: String in ["stand", "gehen", "kette1", "kette2", "kette3", "kette4"]:
		DarstellungVelaFrames._clips[n] = {}
	var spiel4: Node2D = _spiel(skript, sz)
	var s4: DarstellungSitzung = spiel4.get("sitzung")
	var puppe_sichtbar: int = 0
	var frames_sichtbar: int = 0
	for _i in range(120):
		s4.logikSchritt()
		spiel4.call("_puppeAktualisieren")
		var f4: KernEntitaeten.Figur = s4.welt.figur
		if (spiel4.get("_frames") as Node2D).visible:
			frames_sichtbar += 1
		if (spiel4.get("_puppe") as Node2D).visible:
			puppe_sichtbar += 1
		if (spiel4.get("_puppe") as Node2D).visible != DarstellungVelaPosen.abgedeckt(f4):
			_ok(false, "Szene ohne Clips: Puppe sichtbar genau dort, wo sie die Aktion abdeckt")
			break
	_gleich(frames_sichtbar, 0, "Szene ohne Clips: Video-Frames nie sichtbar")
	_ok(puppe_sichtbar > 0, "Szene ohne Clips: die Puppe übernimmt (%d Schritte)" % puppe_sichtbar)
	spiel4.free()
	DarstellungVelaFrames.clips_vergessen()


func _spiel(skript: GDScript, argv: PackedStringArray) -> Node2D:
	var argumente: Dictionary = skript.call("parseArgumente", argv)
	var spiel: Node2D = (load("res://darstellung/spiel.tscn") as PackedScene).instantiate()
	spiel.set("automatisch", false)
	spiel.set("argumente", argumente)
	# Ein Testlauf in _init hat noch keinen laufenden Baum: _ready von Hand rufen.
	spiel.call("_ready")
	return spiel
