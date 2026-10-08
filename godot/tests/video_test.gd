## Test des Video-Wegs für Vela: Ergebnisse des Umsetzers an den TESTCLIPS (aus der Puppe, nicht von Grok) und an den
## echten Clips (aus den Grok-Videos), die Zuordnung Aktion/Uhr → Bild, der Abspieler und die Rückfallreihenfolge der
## Quellen in der Darstellung.
## Läuft ohne Fenster und ohne ffmpeg (liest die bereits erzeugten Ordner unter godot/grafik/vela_video/); nur die
## Umsetzung eines synthetischen HD-Videos (`_hd_umsetzung`) braucht ffmpeg und wird ohne es übersprungen:
##   godot --headless --path godot --script res://tests/alle.gd
## Einbindung: `var r := VideoTest.lauf()`; r["geprueft"] Zahl der Prüfungen, r["fehler"] Meldungen.
class_name VideoTest
extends RefCounted

const ORDNER: String = "res://grafik/vela_video/"
const GEHEN: String = "_test_gehen"
const KETTE: String = "_test_kette1"
const SCHRITTE: int = 600
## Echte Clips (Grok-Videos): Name → Prüfparameter. min: Mindestzahl der Bilder; hoehe: erlaubte Figurhöhe im ersten Bild
## (Kampfhaltung = 142, ±1 wegen der Staubentfernung bzw. des Atems); ankerx: Anker x = Mitte der untersten 6 Zeilen
## des ersten Bildes (Fußmitte, nicht bei Schwerpunkt- und Übergangsanker).
## hd: gemalter Clip (Umsetzer --hd, clip.txt weich=1, WebP mit weicher Kante; Entscheidung des Nutzers 2026-10-08), sonst
## Pixel-Clip. Bei HD-Clips ist `hoehe` die Figurhöhe im ersten Bild in Spielbildpixeln (Dateipixel · skala), `massstab` der
## Spielbildpixel je Videopixel (Clips mit dem Sprung-Startbild: Figur nur 45 % der Bildhöhe, deshalb 0,330). `ankerx`: false
## bei HD-Clips, die nicht in der Kampfhaltung beginnen (kette1 beginnt am Ende des Ausholens, sprung und sprungtritt in der
## Hocke, Wartezeit abgeschnitten): ihr Anker (`--ankerx-video`, Fußmitte der Haltung im Video) liegt nicht unter dem ersten
## Bild, sondern nur innerhalb der Figur des ersten Bildes (geprüft).
const ECHTE: Dictionary = {
	"stand": {"min": 30, "hoehe": [141, 144], "ankerx": true, "hd": true},
	"kette1": {"min": 20, "hoehe": [139, 144], "ankerx": false, "hd": true},
	"kette2": {"min": 30, "hoehe": [142, 142], "ankerx": true},
	"kette3": {"min": 30, "hoehe": [142, 142], "ankerx": true},
	"kette4": {"min": 30, "hoehe": [142, 142], "ankerx": true},
	"sprint": {"min": 16, "hoehe": [], "ankerx": false, "hd": true},
	"sprung": {"min": 60, "hoehe": [], "ankerx": false, "hd": true, "massstab": 0.3302},
	"sprungtritt": {"min": 40, "hoehe": [], "ankerx": false, "hd": true, "massstab": 0.3302},
	"getroffen_vorn": {"min": 60, "hoehe": [142, 142], "ankerx": true},
	"umgeworfen": {"min": 60, "hoehe": [141, 142], "ankerx": false},
	"liegen": {"min": 1, "hoehe": [], "ankerx": false},
	"aufstehen": {"min": 60, "hoehe": [], "ankerx": false},
}
## Maßstab (clip.txt, Spielbildpixel je Videopixel) aller echten Clips: dieselbe Größe der Figur, 0,3 % Spielraum.
const MASSSTAB: float = 0.1694
const MASSSTAB_TOL: float = 0.0006
## HD-Clips: Figur im Spiel gleich hoch wie die Pixel-Figur (Spielbildpixel), Spielraum für Atem und Rundung
const SPIELHOEHE: float = 142.0
## Raster der Bildunterschriften des Umsetzers (video_umsetzer.gd SIG)
const SIG: int = 24
const T = preload("res://darstellung/vela_frames_tabelle.gd")
## Synthetischer HD-Test (`_hd_umsetzung`): Höhe der Figur in Dateipixeln und Zahl der Videobilder (klein halten: Laufzeit).
const HD_HOEHE: int = 240
const HD_BILDER: int = 8

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
	_echte_clips()
	_tabelle_neu()
	_hd_clips_zuordnung()
	_logik_szenen()
	_gehen_clip()
	_kette_clip()
	_umsetzer_funktionen()
	_tabelle_schlag()
	_tabelle_schleife()
	_tabelle_clipdaten()
	_abspieler()
	_hd_funktionen()
	_hd_umsetzung()
	_abdeckung()
	_szene()
	DarstellungVelaFrames.clips_vergessen()


# ---------------------------------------------------------------------------
# Hilfen
# ---------------------------------------------------------------------------

func _bild(clip: String, nr: int) -> Image:
	var b: Image = Image.new()
	var bytes: PackedByteArray = FileAccess.get_file_as_bytes(ORDNER + clip + "/f_%04d.webp" % nr)
	if not bytes.is_empty():
		if b.load_webp_from_buffer(bytes) != OK:
			return null
	else:
		bytes = FileAccess.get_file_as_bytes(ORDNER + clip + "/f_%04d.png" % nr)
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

func _clips(clip: String, min_n: int = 20, hoehe_ok: Array = [142, 142], ankerx_pruefen: bool = true, hd: bool = false) -> void:
	var d: Dictionary = _daten(clip)
	_ok(not d.is_empty(), "%s: clip.txt lesbar" % clip)
	if d.is_empty():
		return
	if hd:
		_clips_hd(clip, d, min_n, hoehe_ok, ankerx_pruefen)
		return
	var n: int = d["bilder"]
	_ok(n >= min_n, "%s: mindestens %d Bilder (%d)" % [clip, min_n, n])
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
	if not hoehe_ok.is_empty():
		var hh: int = z[1] - z[0] + 1
		_ok(hh >= int(hoehe_ok[0]) and hh <= int(hoehe_ok[1]), "%s: Figur im ersten Bild %d bis %d Bildpixel hoch (%d)" % [clip, hoehe_ok[0], hoehe_ok[1], hh])
	_gleich(int(d["ankery"]), z[1], "%s: Anker y = unterste Figurzeile des ersten Bildes" % clip)
	var px1: PackedByteArray = b1.get_data()
	var xmin: int = breite
	var xmax: int = -1
	for y: int in range(z[1] - 5, z[1] + 1):
		for x: int in breite:
			if px1[(y * breite + x) * 4 + 3] != 0:
				xmin = mini(xmin, x)
				xmax = maxi(xmax, x)
	if ankerx_pruefen:
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


## Ergebnisse des Umsetzers im HD-Modus an einem echten Clip: WebP mit weicher Kante, volle Farben, Skala, Anker, Zuschnitt.
## Die Figurhöhe des ersten Bildes steht in Spielbildpixeln (Dateipixel · skala), der Fußpunkt (`fuss`) in Dateipixeln.
func _clips_hd(clip: String, d: Dictionary, min_n: int, hoehe_ok: Array, ankerx_pruefen: bool) -> void:
	var n: int = d["bilder"]
	_ok(n >= min_n, "%s: mindestens %d Bilder (%d)" % [clip, min_n, n])
	_ok(bool(d["weich"]), "%s: clip.txt weich=1 (HD-Clip)" % clip)
	_gleich(d["format"], "webp", "%s: Bilder als verlustfreies WebP" % clip)
	_gleich(int(d["farben"]), 0, "%s: HD ohne Palette (farben=0)" % clip)
	var skala: float = d["skala"]
	_ok(skala > 0.3 and skala < 0.5, "%s: Skala %.4f (Spielbildpixel je Dateipixel, Figur 142 / 360)" % [clip, skala])
	var breite: int = d["bild_breite"]
	var hoehe: int = d["bild_hoehe"]
	var farben: Dictionary = {}
	var halb: int = 0
	var groesse_ok: bool = true
	var fehlt: bool = false
	var x0: int = breite
	var y0: int = hoehe
	var x1: int = -1
	var y1: int = -1
	for i: int in range(1, n + 1):
		var b: Image = _bild(clip, i)
		if b == null:
			fehlt = true
			continue
		if b.get_width() != breite or b.get_height() != hoehe:
			groesse_ok = false
		var px: PackedByteArray = b.get_data()
		for y: int in hoehe:
			for x: int in breite:
				var a: int = px[(y * breite + x) * 4 + 3]
				if a != 0 and a != 255:
					halb += 1
				if a == 255 and farben.size() < 5000:
					var o: int = (y * breite + x) * 4
					farben[(px[o] << 16) | (px[o + 1] << 8) | px[o + 2]] = true
				if a >= 128:
					x0 = mini(x0, x)
					x1 = maxi(x1, x)
					y0 = mini(y0, y)
					y1 = maxi(y1, y)
	_ok(not fehlt, "%s: alle Bilder f_0001 bis f_%04d vorhanden" % [clip, n])
	_ok(groesse_ok, "%s: alle Bilder gleich groß (%d x %d)" % [clip, breite, hoehe])
	_ok(halb > 0, "%s: weiche Kante (Alpha-Zwischenwerte vorhanden, %d)" % [clip, halb])
	_ok(farben.size() > 64, "%s: volle Farben, nicht auf 64 reduziert (%d, abgebrochen bei 5000)" % [clip, farben.size()])
	# Zuschnitt: Vereinigung aller Figuren (Alpha ab 128) plus 2 px Rand, weicher Rand darf bis zu 2 px hineinragen
	var rand: Array[int] = [x0, y0, breite - 1 - x1, hoehe - 1 - y1]
	var rand_ok: bool = true
	for r: int in rand:
		if r < 2 or r > 4:
			rand_ok = false
	_ok(rand_ok, "%s: Zuschnitt = Vereinigung aller Figuren plus 2 px (Rand links, oben, rechts, unten: %s)" % [clip, str(rand)])
	var b1: Image = _bild(clip, 1)
	if b1 == null:
		return
	var z: Array[int] = _zeilen_ab(b1, 128)
	var fuss: Vector2 = d["fuss"]
	if not hoehe_ok.is_empty():
		var hh: float = float(z[1] - z[0] + 1) * skala
		_ok(hh >= float(hoehe_ok[0]) and hh <= float(hoehe_ok[1]), "%s: Figur im ersten Bild %d bis %d Spielbildpixel hoch (%.1f)" % [clip, hoehe_ok[0], hoehe_ok[1], hh])
	# Anker: Fußpunkt (Dateipixel) liegt unter der untersten Figurzeile des ersten Bildes (±1,5 Dateipixel)
	_ok(absf(fuss.y - float(z[1] + 1)) <= 1.5, "%s: Fußpunkt y = Unterkante der Figur im ersten Bild (%.2f gegen %d)" % [clip, fuss.y, z[1] + 1])
	var xmin: int = breite
	var xmax: int = -1
	var px1: PackedByteArray = b1.get_data()
	for y: int in range(maxi(z[1] - 14, 0), z[1] + 1):
		for x: int in breite:
			if px1[(y * breite + x) * 4 + 3] >= 128:
				xmin = mini(xmin, x)
				xmax = maxi(xmax, x)
	if ankerx_pruefen:
		_ok(absf(fuss.x - (float(xmin + xmax) / 2.0 + 0.5)) <= 3.0, "%s: Fußpunkt x = Mitte der Füße im ersten Bild (%.2f gegen %.2f)" % [clip, fuss.x, float(xmin + xmax) / 2.0 + 0.5])
	else:
		var r1: Rect2i = _alpha_rahmen(b1, 128)
		_ok(fuss.x >= float(r1.position.x) and fuss.x <= float(r1.end.x), "%s: Fußpunkt x liegt innerhalb der Figur des ersten Bildes (%.1f in %d bis %d)" % [clip, fuss.x, r1.position.x, r1.end.x])
	_ok(fuss.x > 0.0 and fuss.x < float(breite) and fuss.y > 0.0 and fuss.y <= float(hoehe), "%s: Anker im Bild" % clip)
	# Umrechnung in Spielbildpixel (clip_lesen): Größe und Anker stimmen mit Skala überein
	_ok(absi(int(d["breite"]) - roundi(float(breite) * skala)) <= 1 and absi(int(d["hoehe"]) - roundi(float(hoehe) * skala)) <= 1, "%s: Größe in Spielbildpixeln = Dateigröße · Skala" % clip)


## Zeilen mit Alpha ab `schwelle`: [oberste, unterste]; leer: [−1, −1].
func _zeilen_ab(b: Image, schwelle: int) -> Array[int]:
	var r: Rect2i = _alpha_rahmen(b, schwelle)
	return [r.position.y, r.position.y + r.size.y - 1]


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


## Abbildung der gemalten (HD-)Clips auf die Zeiten der Logik: stand (Echtzeitschleife), sprungtritt (Sprungangriff N und R).
## kette1, sprint und sprung laufen über die allgemeinen Prüfungen (_tabelle_schlag, _tabelle_neu).
func _hd_clips_zuordnung() -> void:
	var st: Dictionary = _daten("stand")
	var tt: Dictionary = _daten("sprungtritt")
	if st.is_empty() or tt.is_empty():
		_ok(false, "HD-Zuordnung: die Clips stand und sprungtritt fehlen")
		return
	# --- stand: ein Atemzyklus in Echtzeit, nahtlos ---
	var n: int = st["zyklus_bilder"]
	var ticks: int = T.zyklus_ticks("stand", st)
	var ver: Array[int] = T.verlauf("stand", 3 * ticks, st)
	var s_ok: bool = true
	var benutzt: Dictionary = {}
	for u: int in ticks:
		benutzt[ver[u]] = true
		if u > 0 and ver[u] < ver[u - 1]:
			s_ok = false
		if ver[u] != ver[u + ticks] or ver[u] != ver[u + 2 * ticks]:
			s_ok = false
	_ok(s_ok, "HD stand: ein Zyklus über %d Ticks, danach von vorn, Bilder laufen vorwärts" % ticks)
	_gleich(benutzt.size(), n, "HD stand: alle %d Zyklusbilder kommen im Zyklus vor" % n)
	_ok(ticks >= 100 and ticks <= 140, "HD stand: Atemzyklus in Echtzeit (%d Ticks = %.1f s)" % [ticks, float(ticks) / 60.0])
	# --- sprungtritt: Sprungangriff N und R ---
	var ev: Dictionary = tt["ereignis"]
	var absprung: int = ev["absprung"]
	var aufsetzen: int = ev["aufsetzen"]
	var kontakt: int = tt["kontakt"]
	var rueck: int = tt["rueckzug"]
	for v: String in ["N", "R"]:
		var wv: Dictionary = KernWerte.SPRUNGANGRIFF[v]
		var von: int = wv["aktiv_von"]
		var bis: int = wv["aktiv_bis"]
		_ok(T.tritt_variante(v), "HD sprungtritt: Variante %s hat den Clip" % v)
		# A in der Sprunguhr J+1 (Angriff am Anfang) bis J+37 (Angriff spät, kürzer als das Trefferfenster)
		for j1: int in [2, 10, 21, 30, 38]:
			var dauer: int = KernWerte.SPRUNG_AUFSETZEN - j1
			var tag: String = "HD sprungtritt %s, Sprunguhr %d in uhr 1" % [v, j1]
			var lauf: Array[int] = []
			for u: int in range(1, dauer + 6):
				lauf.append(T.tritt(u, j1 + u - 1, von, bis, tt))
			var innen: bool = true
			var mono: bool = true
			for i: int in lauf.size():
				if lauf[i] < absprung or lauf[i] > aufsetzen - 1:
					innen = false
				if i > 0 and lauf[i] < lauf[i - 1]:
					mono = false
			_ok(innen, "%s: alle Bilder zwischen Absprung und letztem Luftbild" % tag)
			_ok(mono, "%s: die Bilder laufen vorwärts, kein Zurückspringen" % tag)
			var vor_ok: bool = true
			for u: int in range(1, mini(von, dauer + 1)):
				if lauf[u - 1] < absprung or lauf[u - 1] >= kontakt:
					vor_ok = false
			_ok(vor_ok, "%s: uhr 1 bis %d zeigt Bilder vom Absprung bis vor den Kontakt" % [tag, von - 1])
			for u: int in range(von, mini(bis, dauer) + 1):
				_gleich(lauf[u - 1], kontakt, "%s: Trefferfenster uhr %d zeigt das Kontaktbild" % [tag, u])
			if dauer > bis:
				_ok(lauf[bis] >= rueck, "%s: nach dem Fenster beginnt der Rückzug (Bild %d, Rückzug %d)" % [tag, lauf[bis], rueck])
				_gleich(lauf[dauer - 1], aufsetzen - 1, "%s: im letzten Luftframe (uhr %d) steht das letzte Luftbild" % [tag, dauer])
				# (nach dem letzten Luftframe wechselt die Logik zu LANDUNG; die Zeit darüber hinaus gilt nur hier, ohne Logik)
				_gleich(lauf[dauer + 4], lauf[dauer - 1], "%s: über das Ende der Aktion hinaus hält das letzte Bild" % tag)
	# wahl: Zustand der Figur → Clip, Bild; H und T haben keinen Clip, Landung nach dem Tritt kommt aus dem Tritt-Clip
	_gleich(T.clip_name("SPRUNGANGRIFF", 1, "N"), "sprungtritt", "HD sprungtritt: Aktion SPRUNGANGRIFF (N) → Clip sprungtritt")
	_gleich(T.clip_name("SPRUNGANGRIFF", 1, "R"), "sprungtritt", "HD sprungtritt: Aktion SPRUNGANGRIFF (R) → Clip sprungtritt")
	for v: String in ["H", "T", ""]:
		_gleich(T.clip_name("SPRUNGANGRIFF", 1, v), "", "HD sprungtritt: SPRUNGANGRIFF (%s) → kein Clip (Platzhalter)" % v)
		var fh: KernEntitaeten.Figur = _figur("SPRUNGANGRIFF")
		fh.sprung_variante = v
		_ok(T.wahl(fh).is_empty() and not DarstellungVelaFrames.abgedeckt(fh), "HD sprungtritt: SPRUNGANGRIFF (%s) nicht abgedeckt" % v)
	var fa: KernEntitaeten.Figur = _figur("SPRUNGANGRIFF")
	fa.sprung_variante = "R"
	fa.sprung_angriff = true
	fa.uhr = 5
	fa.vh = KernWerte.SPRUNG_VH_START - 6 * KernWerte.SPRUNG_SCHWERKRAFT
	var wa: Dictionary = T.wahl(fa)
	_gleich(wa.get("clip", ""), "sprungtritt", "HD sprungtritt: wahl(SPRUNGANGRIFF R) → Clip sprungtritt")
	_gleich(T.bildindex_wahl(wa, tt), kontakt, "HD sprungtritt: wahl(SPRUNGANGRIFF R, uhr 5 = aktiv_von) → Kontaktbild")
	_gleich(wa["sprung_uhr"], 7, "HD sprungtritt: Sprunguhr aus vh (6 Luftframes nach dem Absprung → 7)")
	_ok(DarstellungVelaFrames.abgedeckt(fa), "HD sprungtritt: SPRUNGANGRIFF (R) ist abgedeckt")
	fa.uhr = KernWerte.SPRUNGANGRIFF["R"]["aktiv_bis"] + 1
	_ok(T.bildindex_wahl(T.wahl(fa), tt) >= rueck, "HD sprungtritt: ab uhr aktiv_bis + 1 läuft der Rückzug")
	var fl: KernEntitaeten.Figur = _figur("LANDUNG")
	fl.sprung_variante = "N"
	fl.sprung_angriff = true
	_gleich(T.wahl(fl)["clip"], "sprungtritt", "HD sprungtritt: Landung nach dem Sprungangriff N aus dem Tritt-Clip")
	_gleich(T.bildindex_wahl(T.wahl(fl), tt), aufsetzen, "HD sprungtritt: Landung uhr 1 zeigt das Aufsetzbild")
	fl.uhr = KernWerte.LANDUNG_DAUER
	_gleich(T.bildindex_wahl(T.wahl(fl), tt), int(ev["ruhe"]), "HD sprungtritt: Landung uhr 6 zeigt das aufgerichtete Bild")
	fl.sprung_variante = "H"
	_gleich(T.wahl(fl)["clip"], "sprung", "HD sprungtritt: Landung nach dem Sprungangriff H aus dem Sprung-Clip")
	fl.sprung_variante = "N"
	fl.sprung_angriff = false
	_gleich(T.wahl(fl)["clip"], "sprung", "HD sprungtritt: Landung ohne Sprungangriff aus dem Sprung-Clip")
	# Kontaktbögen und Tests ohne Logik: bildindex() des Clips = Sprungangriff N
	_gleich(T.bildindex("sprungtritt", 5, tt), kontakt, "HD sprungtritt: bildindex() zeigt im Trefferfenster das Kontaktbild")


func _tabelle_schlag() -> void:
	_gleich([T.kette_dauer(1), T.kette_dauer(2), T.kette_dauer(3), T.kette_dauer(4)], [16, 16, 17, 25], "Tabelle: Dauern der Ketten 16, 16, 17, 25")
	var mit_halt: Dictionary = _kunst(60, 8, 20, 50, "vorwaerts")
	mit_halt["rueckzug"] = 40
	var daten: Array = [_kunst(60, 8, 20, 50, "vorwaerts"), _kunst(60, 8, 20, 50, "rueckwaerts"), mit_halt, _daten(KETTE), _daten("kette1")]
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
	_gleich(T.clip_name("SPRUNGANGRIFF", 1), "", "Aktion SPRUNGANGRIFF → kein Clip vorgesehen")
	for paar: Array in [["SPRINT", "sprint"], ["SPRUNG", "sprung"], ["LANDUNG", "sprung"], ["GETROFFEN", "getroffen_vorn"], ["UMGEWORFEN", "umgeworfen"], ["TOT", "umgeworfen"], ["LIEGEN", "liegen"], ["AUFSTEHEN", "aufstehen"]]:
		_gleich(T.clip_name(paar[0], 1), paar[1], "Aktion %s → Clip %s" % [paar[0], paar[1]])
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


# ---------------------------------------------------------------------------
# HD-Modus des Umsetzers (--hd): weiche Kante, RGBA, Skala; Abspieler mit linearer Filterung
# ---------------------------------------------------------------------------

## Funktionen des HD-Modus an künstlichen Daten (ohne ffmpeg).
func _hd_funktionen() -> void:
	var u: GDScript = load("res://werkzeuge/video_umsetzer.gd")
	_gleich(u.call("kante_standard", 540.0), 4, "HD: Übergang 4 px bei 540 Zeilen Figur im Arbeitsbild")
	_gleich(u.call("kante_standard", 284.0), 2, "HD: Übergang mindestens 2 px")
	_gleich(u.call("kante_standard", 5000.0), 6, "HD: Übergang höchstens 6 px")
	# Gewichte einer Achse: Box (Verkleinern) summiert auf inv16, Dreieck (Vergrößern) auf 65536
	for inv16: int in [98304, 65536, 40000, 25000]:
		var t: Dictionary = u.call("_achse", 5 * 65536 + 12345, inv16, 8, 40)
		var summe_ok: bool = true
		for o: int in 8:
			var s: int = 0
			for k: int in (t["zahl"] as PackedInt32Array)[o]:
				s += (t["gew"] as PackedInt32Array)[(t["ab"] as PackedInt32Array)[o] + k]
			if absi(s - int(t["nenner"])) > 2:
				summe_ok = false
		_ok(summe_ok, "HD: Gewichte der Achse (inv16 %d) summieren auf den Nenner" % inv16)
		_gleich(t["nenner"], inv16 if inv16 >= 65536 else 65536, "HD: Nenner der Achse (inv16 %d)" % inv16)
	# Verkleinern ohne dunklen Saum: rotes Quadrat auf Durchsichtig (Farbe unter Alpha 0 ist Schwarz), Gitter 1,5-fach, versetzt
	var wa: PackedByteArray = PackedByteArray()
	var wf: PackedByteArray = PackedByteArray()
	wa.resize(100)
	wf.resize(300)
	for y: int in range(2, 8):
		for x: int in range(2, 8):
			wa[y * 10 + x] = 255
			wf[(y * 10 + x) * 3] = 255
	var f: PackedByteArray = u.call("herunter_weich", wa, wf, 10, 10, 20000, 20000, 98304, 6, 6)
	var rot_ok: bool = true
	var teil: int = 0
	var voll: int = 0
	for p: int in 36:
		var a: int = f[p * 4 + 3]
		if a == 0:
			continue
		if f[p * 4] != 255 or f[p * 4 + 1] != 0 or f[p * 4 + 2] != 0:
			rot_ok = false
		if a == 255:
			voll += 1
		else:
			teil += 1
	_ok(rot_ok, "HD verkleinern: Farbe an der Kante bleibt Rot (kein Schwarz aus dem durchsichtigen Grund)")
	_ok(teil > 0 and voll > 0, "HD verkleinern: deckende Mitte und teildurchsichtiger Rand")
	var f2: PackedByteArray = u.call("herunter_weich", wa, wf, 10, 10, 20000, 20000, 98304, 6, 6)
	_ok(f == f2, "HD verkleinern: deterministisch")
	# Vergrößern (inv16 < 65536): bilinear, Mitte bleibt deckend
	var fv: PackedByteArray = u.call("herunter_weich", wa, wf, 10, 10, 0, 0, 32768, 20, 20)
	_gleich(fv[(10 * 20 + 10) * 4 + 3], 255, "HD vergrößern: Mitte deckend")
	_ok(fv[(4 * 20 + 4) * 4 + 3] > 0 and fv[(4 * 20 + 4) * 4 + 3] < 255, "HD vergrößern: Rand bilinear weich")
	# Farbrand: ein deckendes Pixel, Nachbarn bis Radius 2 bekommen seine Farbe, Alpha bleibt 0
	var fr: PackedByteArray = PackedByteArray()
	fr.resize(11 * 11 * 4)
	var mitte: int = (5 * 11 + 5) * 4
	fr[mitte] = 10
	fr[mitte + 1] = 200
	fr[mitte + 2] = 30
	fr[mitte + 3] = 255
	u.call("farbrand", fr, 11, 11, 2)
	var nah: int = (5 * 11 + 7) * 4
	var fern: int = (5 * 11 + 9) * 4
	_ok(fr[nah] == 10 and fr[nah + 1] == 200 and fr[nah + 2] == 30 and fr[nah + 3] == 0, "Farbrand: Nachbar bis Radius 2 hat die Farbe, Alpha 0")
	_ok(fr[fern] == 0 and fr[fern + 1] == 0 and fr[fern + 3] == 0, "Farbrand: weiter entfernt bleibt leer")
	# Weiche Kante: blaues Rechteck auf Grün, Rand als Mischung (Alpha 0,5 bei x = 9 und 30, 0,2 bei x = 8 und 31)
	var w: int = 40
	var h: int = 30
	var key: Vector3i = Vector3i(0, 177, 64)
	var fig: Vector3i = Vector3i(20, 30, 120)
	var rgb: PackedByteArray = PackedByteArray()
	rgb.resize(w * h * 3)
	var maske: PackedByteArray = PackedByteArray()
	maske.resize(w * h)
	for y: int in h:
		for x: int in w:
			var a: float = 0.0
			if y >= 8 and y <= 21:
				if x >= 10 and x <= 29:
					a = 1.0
				elif x == 9 or x == 30:
					a = 0.5
				elif x == 8 or x == 31:
					a = 0.2
			var i: int = (y * w + x) * 3
			rgb[i] = roundi(a * fig.x + (1.0 - a) * key.x)
			rgb[i + 1] = roundi(a * fig.y + (1.0 - a) * key.y)
			rgb[i + 2] = roundi(a * fig.z + (1.0 - a) * key.z)
			if y >= 8 and y <= 21 and x >= 10 and x <= 29:
				maske[y * w + x] = 1
	var farbe: PackedByteArray = rgb.duplicate()
	for p: int in w * h:
		farbe[p * 3 + 1] = mini(farbe[p * 3 + 1], maxi(farbe[p * 3], farbe[p * 3 + 2]))
	var wr: Dictionary = u.call("weich_freistellen", rgb, farbe, w, h, key, "gruen", maske, 4, 40)
	var al: PackedByteArray = wr["alpha"]
	var fa: PackedByteArray = wr["farbe"]
	_gleich(al[15 * w + 20], 255, "Weiche Kante: Mitte deckend")
	_gleich(al[15 * w + 2], 0, "Weiche Kante: Hintergrund durchsichtig")
	_ok(absi(al[15 * w + 9] - 128) <= 16, "Weiche Kante: Mischpixel 50 %% → Alpha etwa 128 (ist %d)" % al[15 * w + 9])
	_ok(absi(al[15 * w + 30] - 128) <= 16, "Weiche Kante: Mischpixel rechts 50 %% → Alpha etwa 128 (ist %d)" % al[15 * w + 30])
	_ok(absi(al[15 * w + 8] - 51) <= 24, "Weiche Kante: Mischpixel 20 %% → Alpha etwa 51 (ist %d)" % al[15 * w + 8])
	var edge: int = (15 * w + 9) * 3
	_ok(fa[edge + 2] > fa[edge + 1] and fa[edge + 1] <= maxi(fa[edge], fa[edge + 2]), "Weiche Kante: kein Grünstich am Randpixel (Farbe %d, %d, %d)" % [fa[edge], fa[edge + 1], fa[edge + 2]])
	_ok(absi(fa[edge] - fig.x) <= 24 and absi(fa[edge + 1] - fig.y) <= 24 and absi(fa[edge + 2] - fig.z) <= 24, "Weiche Kante: Randfarbe zurück zur Figurfarbe entmischt (ist %d, %d, %d)" % [fa[edge], fa[edge + 1], fa[edge + 2]])
	var wr2: Dictionary = u.call("weich_freistellen", rgb, farbe, w, h, key, "gruen", maske, 4, 40)
	_ok(wr["alpha"] == wr2["alpha"] and wr["farbe"] == wr2["farbe"], "Weiche Kante: deterministisch")
	# Staub und Inseln, die die harte Maske entfernt hat, kommen nicht als weiche Kante zurück: Insel weit weg von der Maske
	var rgb3: PackedByteArray = rgb.duplicate()
	var i3: int = (3 * w + 35) * 3
	rgb3[i3] = 30
	rgb3[i3 + 1] = 30
	rgb3[i3 + 2] = 30
	var wr3: Dictionary = u.call("weich_freistellen", rgb3, rgb3, w, h, key, "gruen", maske, 4, 40)
	_gleich((wr3["alpha"] as PackedByteArray)[3 * w + 35], 0, "Weiche Kante: Pixel außerhalb des Bandes bleibt durchsichtig")
	# clip.txt eines HD-Clips: Größe und Anker für alle Verbraucher in Spielbildpixeln
	var hd: Dictionary = T.clip_lesen("bilder=3\nweich=1\nformat=webp\ngroesse=100,200\nanker=50,190\nfuss_fein=50.5,190.9\nskala=0.4\nhoehe=360\n")
	_ok(bool(hd["weich"]), "clip.txt HD: weich")
	_gleich(hd["format"], "webp", "clip.txt HD: Format")
	_gleich(hd["skala"], 0.4, "clip.txt HD: Skala")
	_gleich([hd["bild_breite"], hd["bild_hoehe"]], [100, 200], "clip.txt HD: Größe der Dateien")
	_gleich([hd["breite"], hd["hoehe"], hd["ankerx"], hd["ankery"]], [40, 80, 20, 75], "clip.txt HD: Größe und Anker in Spielbildpixeln")
	_gleich(hd["fuss"], Vector2(50.5, 190.9), "clip.txt HD: Fußpunkt in Dateipixeln")
	var px: Dictionary = T.clip_lesen("bilder=3\ngroesse=100,200\nanker=50,190\n")
	_ok(not bool(px["weich"]) and px["skala"] == 1.0 and px["format"] == "png" and px["fuss"] == Vector2(50.5, 191.0), "clip.txt Pixel: nicht weich, Skala 1, Fußpunkt (anker + 0,5; + 1)")


## Synthetisches HD-Video (aus dem Quellbild von Vela auf Grün, mit Hüpfen, Skalierung und H.264-Kompression) im Umsetzer
## mit --hd umgesetzt und gegen den Pixelmodus desselben Videos geprüft. Braucht ffmpeg; ohne wird übersprungen.
func _hd_umsetzung() -> void:
	var u: GDScript = load("res://werkzeuge/video_umsetzer.gd")
	var projekt: String = ProjectSettings.globalize_path("res://")
	var quelle: String = projekt.path_join("..").path_join("spiel/grafik/quelle/fremd/vela/vela_k_kampfhaltung_gruen_quadrat.png").simplify_path()
	if String(u.call("ffmpeg_version")) == "" or not FileAccess.file_exists(quelle):
		_ok(true, "HD-Umsetzung übersprungen (kein ffmpeg oder Quellbild)")
		print("Hinweis: HD-Umsetzung übersprungen (ffmpeg oder Quellbild fehlt)")
		return
	var temp: String = ProjectSettings.globalize_path("user://hd_test")
	DirAccess.make_dir_recursive_absolute(temp)
	var video: String = temp.path_join("hdtest.mp4")
	var fc: String = "[1:v]scale=iw*0.94:ih*0.94:flags=bicubic[f];[0:v][f]overlay=x='(W-w)/2+sin(t*6.2832*1.5)*12':y='(H-h)/2-abs(sin(t*6.2832*1.5))*18':shortest=1,format=yuv420p"
	var r: Dictionary = u.call("ffmpeg_lauf", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x00B140:s=1024x1024:r=24:d=1", "-loop", "1", "-framerate", "24", "-t", "1", "-i", quelle, "-filter_complex", fc, "-c:v", "libx264", "-crf", "18", "-r", "24", "-frames:v", str(HD_BILDER), video])
	_gleich(r["code"], 0, "HD: Testvideo mit ffmpeg erzeugt")
	if int(r["code"]) != 0:
		return
	var aus: String = temp.path_join("aus")
	for modus: Array in [["hdtest", ["--hd", "--hoehe", str(HD_HOEHE)]], ["pixtest", []]]:
		var ausgabe: Array = []
		var args: Array = ["--headless", "--path", projekt, "--script", "res://werkzeuge/video_umsetzer.gd", "--", "--video", video, "--name", modus[0], "--aus", aus]
		args.append_array(modus[1])
		var code: int = OS.execute(OS.get_executable_path(), PackedStringArray(args), ausgabe, true)
		_gleich(code, 0, "HD: Umsetzer läuft (%s)" % modus[0])
		if code != 0:
			print("".join(PackedStringArray(ausgabe)))
			return
	_ok(DarstellungVelaFrames.clip_registrieren("_hd_test", aus.path_join("hdtest") + "/"), "HD: Clip lesbar")
	_ok(DarstellungVelaFrames.clip_registrieren("_hd_pixel", aus.path_join("pixtest") + "/"), "HD: Pixelclip desselben Videos lesbar")
	var d: Dictionary = DarstellungVelaFrames.clip_daten("_hd_test")
	var dp: Dictionary = DarstellungVelaFrames.clip_daten("_hd_pixel")
	if d.is_empty() or dp.is_empty():
		return
	_ok(bool(d["weich"]) and not bool(dp["weich"]), "HD: clip.txt weich=1 im HD-Clip, nicht im Pixelclip")
	_gleich(d["bilder"], HD_BILDER, "HD: Zahl der Bilder")
	_gleich(d["bilder"], dp["bilder"], "HD: gleich viele Bilder wie im Pixelmodus")
	_gleich(d["format"], "webp", "HD: Standardformat verlustfreies WebP")
	_gleich(int(FileAccess.get_file_as_string(aus.path_join("hdtest/clip.txt")).contains("hoehe=%d\n" % HD_HOEHE)), 1, "HD: hoehe in clip.txt")
	_gleich(d["farben"], 0, "HD: keine Palette (farben=0)")
	# Größe: Figur im ersten Bild = gewünschte Höhe ±2; im Spiel so groß wie im Pixelmodus
	var b0: Image = (DarstellungVelaFrames.clip_laden("_hd_test")["bilder"] as Array)[0]
	var z0: Rect2i = _alpha_rahmen(b0, 128)
	_ok(absi(z0.size.y - HD_HOEHE) <= 2, "HD: Figur im ersten Bild %d Zeilen hoch (soll %d ±2)" % [z0.size.y, HD_HOEHE])
	var p0: Image = (DarstellungVelaFrames.clip_laden("_hd_pixel")["bilder"] as Array)[0]
	var zp: Rect2i = _alpha_rahmen(p0, 128)
	var spiel_hd: float = float(z0.size.y) * float(d["skala"])
	_ok(absf(spiel_hd - float(zp.size.y)) <= 2.0, "HD: Figur im Spiel (%.1f Bildpixel) so hoch wie im Pixelmodus (%d)" % [spiel_hd, zp.size.y])
	_ok(absf(float(d["skala"]) * float(HD_HOEHE) - 142.0) <= 1.0, "HD: Skala · Höhe gleich 142 Spielbildpixeln (%.2f)" % (float(d["skala"]) * float(HD_HOEHE)))
	# Fußpunkt gegenüber der Figur (Spielbildpixel): Abstand vom linken Rand der Figur und von ihrer Unterkante wie im Pixelmodus
	var fuss: Vector2 = (d["fuss"] as Vector2) * float(d["skala"])
	var fuss_p: Vector2 = Vector2(float(dp["ankerx"]) + 0.5, float(dp["ankery"]) + 1.0)
	var rel: Vector2 = Vector2(fuss.x - float(z0.position.x) * float(d["skala"]), fuss.y - float(z0.end.y) * float(d["skala"]))
	var rel_p: Vector2 = Vector2(fuss_p.x - float(zp.position.x), fuss_p.y - float(zp.end.y))
	_ok(absf(rel.x - rel_p.x) <= 1.5 and absf(rel.y - rel_p.y) <= 1.5, "HD: Fußpunkt zur Figur %s wie im Pixelclip %s (±1,5 Bildpixel)" % [str(rel), str(rel_p)])
	# Eigenschaften der Bilder: Zwischenwerte im Alpha, mehr als 64 Farben, kein Grünstich am Rand
	var farben: Dictionary = {}
	var rand_zahl: int = 0
	var rand_gruen: int = 0
	var rand_r: int = 0
	var rand_g: int = 0
	var rand_b: int = 0
	var rgba_ok: bool = true
	var groesse_ok: bool = true
	var min_zwischen: int = 1 << 30
	var voll_zahl: int = 0
	var bilder: Array = DarstellungVelaFrames.clip_laden("_hd_test")["bilder"]
	for b: Image in bilder:
		if b.get_format() != Image.FORMAT_RGBA8:
			rgba_ok = false
		if b.get_width() != int(d["bild_breite"]) or b.get_height() != int(d["bild_hoehe"]):
			groesse_ok = false
		var px_d: PackedByteArray = b.get_data()
		var zwischen: int = 0
		for p: int in px_d.size() / 4:
			var a: int = px_d[p * 4 + 3]
			if a == 255:
				voll_zahl += 1
				if farben.size() <= 64:
					farben[(px_d[p * 4] << 16) | (px_d[p * 4 + 1] << 8) | px_d[p * 4 + 2]] = true
			elif a >= 8 and a <= 247:
				zwischen += 1
				rand_zahl += 1
				var rr: int = px_d[p * 4]
				var gg: int = px_d[p * 4 + 1]
				var bb: int = px_d[p * 4 + 2]
				rand_r += rr
				rand_g += gg
				rand_b += bb
				if gg > maxi(rr, bb) + 12:
					rand_gruen += 1
		min_zwischen = mini(min_zwischen, zwischen)
	_ok(rgba_ok and groesse_ok, "HD: alle Bilder RGBA 8 Bit in der Größe aus clip.txt")
	_ok(min_zwischen >= 200, "HD: Alpha hat Zwischenwerte in jedem Bild (mindestens %d Randpixel)" % min_zwischen)
	_ok(float(rand_zahl) > 0.01 * float(voll_zahl), "HD: weicher Rand umfasst mehr als 1 %% der deckenden Pixel (%d von %d)" % [rand_zahl, voll_zahl])
	_ok(farben.size() > 64, "HD: mehr als 64 verschiedene Farben (keine Palette)")
	var mr: float = float(rand_r) / float(maxi(rand_zahl, 1))
	var mg: float = float(rand_g) / float(maxi(rand_zahl, 1))
	var mb: float = float(rand_b) / float(maxi(rand_zahl, 1))
	_ok(mg <= maxf(mr, mb) + 4.0, "HD: kein Grünstich im Mittel der Randpixel (R %.1f, G %.1f, B %.1f)" % [mr, mg, mb])
	_ok(float(rand_gruen) <= 0.03 * float(maxi(rand_zahl, 1)), "HD: höchstens 3 %% der Randpixel mit deutlichem Grünanteil (%d von %d)" % [rand_gruen, rand_zahl])
	# Pixelclip desselben Videos: Palette, harte Kante wie vorher
	var p_farben: Dictionary = {}
	var p_hart: bool = true
	for b: Image in (DarstellungVelaFrames.clip_laden("_hd_pixel")["bilder"] as Array):
		var px_p: PackedByteArray = b.get_data()
		for p: int in px_p.size() / 4:
			if px_p[p * 4 + 3] != 0 and px_p[p * 4 + 3] != 255:
				p_hart = false
			if px_p[p * 4 + 3] == 255:
				p_farben[(px_p[p * 4] << 16) | (px_p[p * 4 + 1] << 8) | px_p[p * 4 + 2]] = true
	_ok(p_hart and p_farben.size() <= 63, "HD: der Pixelmodus bleibt hart und hat höchstens 63 Farben (%d)" % p_farben.size())
	# Abspieler: HD-Clip lineare Filterung und Maßstab, Pixelclip NEAREST und Maßstab 1; beide im selben Spiel
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	v.aus_clip_bild("_hd_test", 0, 1)
	var s: Sprite2D = v.get_node("Bild")
	_gleich(s.texture_filter, CanvasItem.TEXTURE_FILTER_LINEAR, "HD-Abspieler: lineare Texturfilterung")
	_gleich(s.scale, Vector2(float(d["skala"]), float(d["skala"])), "HD-Abspieler: Sprite im Maßstab skala")
	_gleich(s.offset, -(d["fuss"] as Vector2), "HD-Abspieler: Fußpunkt wird abgezogen")
	v.aus_clip_bild("_hd_pixel", 0, 1)
	_gleich(s.texture_filter, CanvasItem.TEXTURE_FILTER_NEAREST, "HD-Abspieler: danach Pixelclip wieder NEAREST")
	_gleich(s.scale, Vector2(1.0, 1.0), "HD-Abspieler: Pixelclip im Maßstab 1")
	v.aus_clip_bild("_hd_test", HD_BILDER - 1, -1)
	_gleich(v.scale, Vector2(-1.0, 1.0), "HD-Abspieler: Blick links spiegelt")
	_ok(v.aktuelles_bild().get_data() == bilder[HD_BILDER - 1].get_data(), "HD-Abspieler: zeigt unverändert das Dateibild")
	v.free()
	_hd_gemischt()
	DarstellungVelaFrames.clips_vergessen()
	# Aufräumen
	for ordner: String in ["hdtest", "pixtest"]:
		var dd: DirAccess = DirAccess.open(aus.path_join(ordner))
		if dd != null:
			for n: String in dd.get_files():
				dd.remove(n)
		DirAccess.remove_absolute(aus.path_join(ordner))
	DirAccess.remove_absolute(aus)
	DirAccess.remove_absolute(video)
	DirAccess.remove_absolute(temp)


## Im Spiel gemischt: HD-Clip als „stand“, Pixelclip als „gehen“ (nur im Speicher). Jeder Clip wird mit seiner Art gezeigt.
func _hd_gemischt() -> void:
	DarstellungVelaFrames._clips["stand"] = DarstellungVelaFrames.clip_laden("_hd_test")
	DarstellungVelaFrames._clips["gehen"] = DarstellungVelaFrames.clip_laden("_hd_pixel")
	var skript: GDScript = load("res://darstellung/spiel.gd")
	var spiel: Node2D = _spiel(skript, PackedStringArray(["--szene", "spiel/tests/szenen/vorfuehrung.txt", "--eingabe", "spiel/tests/eingaben/vorfuehrung.txt"]))
	var sitzung: DarstellungSitzung = spiel.get("sitzung")
	_ok(sitzung != null, "HD gemischt: Spiel gestartet")
	if sitzung == null:
		spiel.free()
		return
	var frames: DarstellungVelaFrames = spiel.get("_frames")
	var sprite: Sprite2D = frames.get_node("Bild")
	var hd_gesehen: int = 0
	var pixel_gesehen: int = 0
	var arten_ok: bool = true
	var skala: float = float(DarstellungVelaFrames.clip_daten("_hd_test")["skala"])
	for _i in range(SCHRITTE):
		sitzung.logikSchritt()
		spiel.call("_puppeAktualisieren")
		if not frames.visible:
			continue
		if frames.clip_name() == "stand":
			hd_gesehen += 1
			if sprite.texture_filter != CanvasItem.TEXTURE_FILTER_LINEAR or not is_equal_approx(sprite.scale.x, skala):
				arten_ok = false
		elif frames.clip_name() == "gehen":
			pixel_gesehen += 1
			if sprite.texture_filter != CanvasItem.TEXTURE_FILTER_NEAREST or sprite.scale != Vector2.ONE:
				arten_ok = false
	_ok(hd_gesehen > 0 and pixel_gesehen > 0, "HD gemischt: beide Arten kamen im Spiel vor (HD %d, Pixel %d Ticks)" % [hd_gesehen, pixel_gesehen])
	_ok(arten_ok, "HD gemischt: HD-Clip mit LINEAR und Skala, Pixelclip mit NEAREST und Maßstab 1, auch im Wechsel")
	spiel.free()


## Umschließendes Rechteck der Pixel mit Alpha ab `schwelle`.
func _alpha_rahmen(b: Image, schwelle: int) -> Rect2i:
	var dd: PackedByteArray = b.get_data()
	var w: int = b.get_width()
	var x0: int = w
	var x1: int = -1
	var oben: int = -1
	var unten: int = -1
	for y: int in b.get_height():
		for x: int in w:
			if dd[(y * w + x) * 4 + 3] >= schwelle:
				if oben < 0:
					oben = y
				unten = y
				x0 = mini(x0, x)
				x1 = maxi(x1, x)
	return Rect2i(x0, oben, x1 - x0 + 1, unten - oben + 1)



func _abdeckung() -> void:
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	f.aktion = "SPRUNGANGRIFF"
	_ok(not DarstellungVelaFrames.abgedeckt(f), "abgedeckt: Aktion ohne Clip (SPRUNGANGRIFF) ist nicht abgedeckt")
	# je Aktion genau dann abgedeckt, wenn der Clip geladen ist (TOT: umgeworfen bzw. ab der Ruhe liegen)
	for paar: Array in [["SPRINT", "sprint"], ["SPRUNG", "sprung"], ["LANDUNG", "sprung"], ["GETROFFEN", "getroffen_vorn"], ["UMGEWORFEN", "umgeworfen"], ["TOT", "umgeworfen"], ["LIEGEN", "liegen"], ["AUFSTEHEN", "aufstehen"]]:
		f.aktion = paar[0]
		f.phase = ""
		_gleich(DarstellungVelaFrames.abgedeckt(f), not DarstellungVelaFrames.clip_laden(paar[1]).is_empty(), "abgedeckt: %s genau dann, wenn der Clip %s geladen ist" % [paar[0], paar[1]])
	f.aktion = "TOT"
	f.phase = "R"
	_gleich(DarstellungVelaFrames.abgedeckt(f), not DarstellungVelaFrames.clip_laden("liegen").is_empty(), "abgedeckt: TOT ab der Ruhe genau dann, wenn liegen geladen ist")
	f.phase = ""
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
# Echte Clips (Grok-Videos, Umsetzer: Freistellen auf Schwarz)
# ---------------------------------------------------------------------------

func _diff(clip: String, a: int, b: int) -> int:
	var x: PackedByteArray = _bild(clip, a).get_data()
	var y: PackedByteArray = _bild(clip, b).get_data()
	var n: int = 0
	for p: int in x.size() / 4:
		var o: int = p * 4
		if x[o + 3] != y[o + 3] or (x[o + 3] != 0 and (x[o] != y[o] or x[o + 1] != y[o + 1] or x[o + 2] != y[o + 2])):
			n += 1
	return n


func _echte_clips() -> void:
	for clip: String in ECHTE:
		var sp: Dictionary = ECHTE[clip]
		var hd: bool = bool(sp.get("hd", false))
		_clips(clip, int(sp["min"]), sp["hoehe"], bool(sp["ankerx"]), hd)
		var d: Dictionary = _daten(clip)
		if d.is_empty():
			continue
		var soll_massstab: float = float(sp.get("massstab", MASSSTAB))
		_ok(absf(float(d["massstab"]) - soll_massstab) <= MASSSTAB_TOL, "%s: Maßstab %.5f gleich bei allen echten Clips (%.4f ± %.4f)" % [clip, d["massstab"], soll_massstab, MASSSTAB_TOL])
		_ok(int(d["farben"]) <= 63, "%s: höchstens 64 Farben mit durchsichtig" % clip)
		var n: int = d["bilder"]
		var ev: Dictionary = d["ereignis"]
		# Ereignisse liegen im Clip
		for k: String in ev:
			_ok(int(ev[k]) >= 0 and int(ev[k]) < n, "%s: Ereignis %s im Clip" % [clip, k])
		if clip.begins_with("kette"):
			var a: int = d["ausholen"]
			var kt: int = d["kontakt"]
			var r: int = d["ruhe"]
			var rz: int = d["rueckzug"]
			_ok(a < kt and kt <= rz and rz < n, "%s: Ausholen (%d) < Kontakt (%d) ≤ Rückzug (%d) < Bilderzahl" % [clip, a, kt, rz])
			if String(d["rueckkehr"]) == "vorwaerts":
				_ok(rz < r and r < n, "%s: Ruhe (%d) nach dem Rückzug, im Clip" % [clip, r])
			if clip == "kette4":
				_ok(int(d["kontakt1"]) > 0 and int(d["kontakt1"]) < kt, "kette4: erstes Trefferfenster (%d) liegt vor dem Tritt (%d)" % [d["kontakt1"], kt])
			var vorn: Array[int] = _liste(clip, "vorn")
			# HD-Clip kette1: das Video beginnt erst am Ende des Ausholens (die Wartezeit und der Anfang des Ausholens sind
			# abgeschnitten, Datei sparen); Bezug ist dann das Ausholen-Ende statt des ersten Bildes
			var bezug: int = vorn[a] if bool(d["weich"]) else vorn[0]
			if clip != "kette3":
				_ok(vorn[kt] - bezug >= 25, "%s: im Kontakt ist die Figur weit nach vorn gestreckt (%d gegen %d)" % [clip, vorn[kt], bezug])
		elif clip == "stand":
			_gleich(int(d["fps"]), 24, "stand: Quelle 24 Bilder/s")
			_gleich(int(d["zyklus_bilder"]), n, "stand: der ganze Clip ist der Zyklus")
			var mittel: int = 0
			for i: int in range(1, n):
				mittel += _diff(clip, i, i + 1)
			mittel /= n - 1
			_ok(_diff(clip, n, 1) <= 4 * mittel, "stand: die Schleife schließt (Unterschied letztes zum ersten Bild %d, mittlerer Bildschritt %d)" % [_diff(clip, n, 1), mittel])
			_gleich(T.zyklus_ticks("stand", d), (n * 60 + 12) / 24, "stand: %d Bilder bei 24 Bildern/s in Echtzeit (%d Ticks)" % [n, (n * 60 + 12) / 24])
		elif clip == "sprint":
			_gleich(int(d["zyklus_bilder"]), 16, "sprint: Doppelschritt aus 16 Bildern")
			var mittel2: int = 0
			for i: int in range(1, n):
				mittel2 += _diff(clip, i, i + 1)
			mittel2 /= n - 1
			_ok(_diff(clip, n, 1) <= 2 * mittel2, "sprint: die Schleife schließt (Unterschied letztes zum ersten Bild %d, mittlerer Bildschritt %d)" % [_diff(clip, n, 1), mittel2])
			_ok(int(d["schritt_px"]) >= 40 and int(d["schritt_px"]) <= 120, "sprint: Schrittlänge %d Bildpixel plausibel" % d["schritt_px"])
		elif clip == "sprung":
			var luft: Array[int] = _liste(clip, "luft")
			var ab: int = ev["absprung"]
			var sch: int = ev["scheitel"]
			var au: int = ev["aufsetzen"]
			_ok(int(ev["hocke"]) < ab and ab < sch and sch < au and au < int(ev["tief"]) and int(ev["tief"]) <= int(ev["ruhe"]), "sprung: Hocke < Absprung < Scheitel < Aufsetzen < Tief ≤ Ruhe")
			var erste_luft: int = 0
			while luft[erste_luft] < 2:
				erste_luft += 1
			_ok(ab <= erste_luft and erste_luft - ab <= 4, "sprung: das Absprungbild (Strecken, Arme hoch) liegt höchstens 4 Bilder vor dem ersten Luftbild (%d, erstes Luftbild %d)" % [ab, erste_luft])
			_ok(luft[sch] >= luft.max() - 6, "sprung: das Scheitelbild gehört zum höchsten Abschnitt (%d von %d)" % [luft[sch], luft.max()])
			_ok(luft[au] <= 1 and luft[au - 1] > 1, "sprung: das Aufsetzbild ist das erste am Boden (%d, davor %d)" % [luft[au], luft[au - 1]])
			# der HD-Clip beginnt in der Hocke (Wartezeit abgeschnitten): `rueckkehr` im Kopf bezieht sich auf das erste Bild und gilt
			# nicht; die Ruhe (Kampfhaltung) ist daran zu erkennen, dass die Silhouette wieder fast so hoch ist wie im Stand
			var hs: Array[int] = _liste(clip, "hoehe_sil")
			_ok(int(ev["ruhe"]) < n and hs[ev["ruhe"]] >= 138, "sprung: der Clip reicht bis zur Kampfhaltung (Ruhe %d von %d, Silhouette %d)" % [ev["ruhe"], n, hs[ev["ruhe"]]])
		elif clip == "sprungtritt":
			var luft2: Array[int] = _liste(clip, "luft")
			var vorn2: Array[int] = _liste(clip, "vorn")
			var ab2: int = ev["absprung"]
			var au2: int = ev["aufsetzen"]
			var kt2: int = d["kontakt"]
			var rz2: int = d["rueckzug"]
			_ok(int(ev["hocke"]) < ab2 and ab2 < kt2 and kt2 <= rz2 and rz2 < au2 and au2 < int(ev["tief"]) and int(ev["tief"]) <= int(ev["ruhe"]), "sprungtritt: Hocke < Absprung < Kontakt ≤ Rückzug < Aufsetzen < Tief ≤ Ruhe")
			_ok(luft2[ab2] >= 2 and luft2[ab2 - 1] < 2, "sprungtritt: das Absprungbild ist das erste in der Luft (%d, davor %d)" % [luft2[ab2], luft2[ab2 - 1]])
			_ok(vorn2[kt2] >= vorn2.max() - 4 and vorn2[kt2] - vorn2[0] >= 40, "sprungtritt: im Kontaktbild ist das Bein voll nach vorn gestreckt (%d gegen %d in der Haltung, größter Wert %d)" % [vorn2[kt2], vorn2[0], vorn2.max()])
			_ok(vorn2[ab2] < vorn2[kt2] - 40, "sprungtritt: im Absprungbild ist das Bein noch nicht gestreckt (%d)" % vorn2[ab2])
			_ok(vorn2[rz2] >= vorn2.max() - 4 and vorn2[rz2 + 1] < vorn2[rz2], "sprungtritt: Rückzug = letztes Bild der vollen Streckung (%d, danach %d)" % [vorn2[rz2], vorn2[rz2 + 1]])
			_ok(luft2[au2] <= 1 and luft2[au2 - 1] > 1, "sprungtritt: das Aufsetzbild ist das erste am Boden (%d, davor %d)" % [luft2[au2], luft2[au2 - 1]])
			var hs2: Array[int] = _liste(clip, "hoehe_sil")
			_ok(int(ev["ruhe"]) < n and hs2[ev["ruhe"]] >= 138, "sprungtritt: der Clip reicht bis zur Kampfhaltung (Ruhe %d von %d, Silhouette %d)" % [ev["ruhe"], n, hs2[ev["ruhe"]]])
		elif clip == "getroffen_vorn":
			var br: Array[int] = _liste(clip, "breite_sil")
			_ok(int(ev["start"]) < int(ev["kontakt"]) and int(ev["kontakt"]) < int(ev["rueckzug"]) and int(ev["rueckzug"]) < int(ev["ruhe"]), "getroffen_vorn: Start < Auslenkung < Rückzug < Ruhe")
			_ok(br[ev["kontakt"]] >= br.max() * 9 / 10, "getroffen_vorn: im Kontaktbild sind die Arme weit außen (%d von %d)" % [br[ev["kontakt"]], br.max()])
			_ok(br[ev["ruhe"]] <= br[0] + 6, "getroffen_vorn: die Ruhe ist wieder eine Haltung (Breite %d, Anfang %d)" % [br[ev["ruhe"]], br[0]])
		elif clip == "umgeworfen":
			var lu: Array[int] = _liste(clip, "luft")
			_ok(int(ev["start"]) < int(ev["abheben"]) and int(ev["abheben"]) < int(ev["scheitel"]) and int(ev["scheitel"]) < int(ev["aufprall"]) and int(ev["aufprall"]) < int(ev["liegt"]) and int(ev["liegt"]) < n, "umgeworfen: Start < Abheben < Scheitel < Aufprall < Liegt")
			_ok(lu[ev["scheitel"]] >= lu.max() - 1, "umgeworfen: der Scheitel ist der höchste Punkt (%d von %d)" % [lu[ev["scheitel"]], lu.max()])
			var tiefst: int = lu[ev["scheitel"]]
			for i: int in range(int(ev["scheitel"]), n):
				tiefst = mini(tiefst, lu[i])
			_ok(lu[ev["aufprall"]] <= tiefst + 3 and lu[int(ev["aufprall"]) - 1] > tiefst + 3, "umgeworfen: der Aufprall ist das erste Bild am Boden (Luft %d, davor %d, tiefster Stand %d)" % [lu[ev["aufprall"]], lu[int(ev["aufprall"]) - 1], tiefst])
			_ok(lu[int(ev["aufprall"]) - 1] - lu[ev["aufprall"]] >= 6, "umgeworfen: beim Aufprall fällt die Körperunterkante deutlich (%d px)" % (lu[int(ev["aufprall"]) - 1] - lu[ev["aufprall"]]))
		elif clip == "liegen":
			_gleich(n, 1, "liegen: ein Standbild (ohne Staubkörner)")
		elif clip == "aufstehen":
			_ok(int(ev["start"]) < int(ev["ruhe"]) and int(ev["ruhe"]) < n, "aufstehen: Start < Ruhe (Kampfhaltung) < Bilderzahl")
	# Liegen und Aufstehen gehören zusammen: das erste Bild von aufstehen ist das Liegebild (dieselbe Lage, Anker auf der Bodenlinie)
	var dl: Dictionary = _daten("liegen")
	var da: Dictionary = _daten("aufstehen")
	if not dl.is_empty() and not da.is_empty():
		var bl: Image = _bild("liegen", 1)
		var ba: Image = _bild("aufstehen", 1)
		var zl: Array[int] = _zeilen(bl)
		var za: Array[int] = _zeilen(ba)
		_gleich(int(dl["ankery"]) - zl[1], int(da["ankery"]) - za[1], "liegen/aufstehen: Bodenlinie gleich weit unter der untersten Zeile")
		_ok(absi((zl[1] - zl[0]) - (za[1] - za[0])) <= 2, "liegen/aufstehen: erstes Bild von aufstehen gleich hoch wie das Liegebild")


# ---------------------------------------------------------------------------
# Zuordnung der echten Clips (Zeiten aus KernWerte)
# ---------------------------------------------------------------------------

func _figur(aktion: String) -> KernEntitaeten.Figur:
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	f.aktion = aktion
	f.uhr = 1
	return f


func _tabelle_neu() -> void:
	var sd: Dictionary = _daten("sprung")
	var sp: Dictionary = _daten("sprint")
	var gv: Dictionary = _daten("getroffen_vorn")
	var um: Dictionary = _daten("umgeworfen")
	var au: Dictionary = _daten("aufstehen")
	var st: Dictionary = _daten("stand")
	if sd.is_empty() or sp.is_empty() or gv.is_empty() or um.is_empty() or au.is_empty() or st.is_empty():
		_ok(false, "Zuordnung: die echten Clips fehlen")
		return
	# --- Sprint: Schleife nach der Strecke, kein Rutschen, schließt ---
	var start: int = sp["zyklus_start"]
	var zn: int = sp["zyklus_bilder"]
	var z: int = int(sp["schritt_px"]) * 65536
	_gleich(T.sprint_bild(1, sp), start, "Sprint: Sprintframe 1 zeigt das Startbild")
	_gleich(T.sprint_tempo(1), KernWerte.SPRINT_X_FRAME1, "Sprint: Frame 1 mit Gehtempo")
	_gleich(T.sprint_tempo(2), KernWerte.SPRINT_V_START, "Sprint: Frame 2 mit dem Starttempo 3,875")
	_gleich(T.sprint_tempo(8), KernWerte.SPRINT_V_START - KernWerte.SPRINT_V_STUFE, "Sprint: das Tempo sinkt alle 6 Frames um 0,125")
	var sprint_ok: bool = true
	var gesehen: Dictionary = {}
	var rueck: bool = false
	var letzter: int = -1
	for n: int in range(1, KernWerte.SPRINT_MAX_FRAMES + 1):
		var i: int = T.sprint_bild(n, sp)
		if i < start or i >= start + zn:
			sprint_ok = false
		gesehen[i] = true
		# Die Phase wächst mit der Strecke: das Bild springt nur beim Umbruch zurück
		if letzter >= 0 and i < letzter and T.sprint_strecke(n - 1) % z > T.sprint_tempo(n) + 1:
			rueck = true
		letzter = i
		_ok(i == T.sprint_bild(n, sp), "Sprint: deterministisch")
	_ok(sprint_ok, "Sprint: alle Bilder im Zyklus")
	_ok(not rueck, "Sprint: das Bild geht nur am Zyklusende zurück (Phase folgt der Strecke)")
	_ok(gesehen.size() >= zn - 2, "Sprint: alle %d Zyklusbilder kommen in 90 Sprintframes vor (%d)" % [zn, gesehen.size()])
	# Eine Zyklenlänge Strecke (schritt_px Spielpixel) später dasselbe Bild: schließt
	var n0: int = 3
	var stre: int = T.sprint_strecke(n0)
	var dn: int = 0
	while T.sprint_strecke(n0 + dn) < stre + z and n0 + dn < 90:
		dn += 1
	if n0 + dn < 90:
		_ok(absi(T.sprint_bild(n0 + dn + 1, sp) - T.sprint_bild(n0 + 1, sp)) <= maxi(2, zn / 6) or T.sprint_bild(n0 + dn + 1, sp) < start + 2, "Sprint: nach einer Zyklenlänge Strecke wieder das Ausgangsbild (±1 Bild)")
	var fs: KernEntitaeten.Figur = _figur("SPRINT")
	fs.sprint_n = 5
	_gleich(T.wahl(fs)["clip"], "sprint", "Sprint: Aktion SPRINT → Clip sprint")
	# Cyclus-Dauer des Gehens aus der Schrittlänge: 24-Tick-Schleife bleibt für gehen
	# --- Sprung: Hocke, Absprung, Scheitel auf dem Scheitelframe, Aufsetzen, Landung ---
	var ev: Dictionary = sd["ereignis"]
	# Scheitel der Logik aus der Sprungbahn (Kampf 4.4): h += vh, vh −= 0,25 ab J+2
	var h: int = 0
	var vh: int = KernWerte.SPRUNG_VH_START
	var hmax: int = 0
	var u_scheitel: int = 0
	for u: int in range(2, KernWerte.SPRUNG_LETZTER_LUFTFRAME + 1):
		h = KernFestkomma.add(h, vh)
		vh = KernFestkomma.sub(vh, KernWerte.SPRUNG_SCHWERKRAFT)
		if h > hmax:
			hmax = h
			u_scheitel = u
	_gleich(u_scheitel, KernWerte.SPRUNG_SCHEITEL_FRAME, "Sprung: die Bahn der Logik hat den Scheitel in uhr 21 (J+21)")
	_gleich(T.sprung(1, sd), int(ev["hocke"]), "Sprung: uhr 1 zeigt die Hocke")
	_gleich(T.sprung(KernWerte.SPRUNG_ABSPRUNG, sd), int(ev["absprung"]), "Sprung: Absprung in uhr 2 (J+2) zeigt das Absprungbild")
	_gleich(T.sprung(u_scheitel, sd), int(ev["scheitel"]), "Sprung: das Scheitelbild steht im Scheitelframe (uhr 21)")
	_gleich(T.sprung(KernWerte.SPRUNG_LETZTER_LUFTFRAME, sd), int(ev["aufsetzen"]) - 1, "Sprung: das letzte Luftbild steht im letzten Luftframe (uhr 41)")
	var mono: bool = true
	var vl: Array[int] = []
	for u: int in range(1, KernWerte.SPRUNG_LETZTER_LUFTFRAME + 1):
		vl.append(T.sprung(u, sd))
		if vl.size() > 1 and vl[vl.size() - 1] < vl[vl.size() - 2]:
			mono = false
	_ok(mono, "Sprung: die Bilder laufen vorwärts, kein Zurückspringen")
	_gleich(T.landung(1, sd), int(ev["aufsetzen"]), "Landung: uhr 1 (Aufsetzen J+42) zeigt das Aufsetzbild")
	_gleich(T.landung(KernWerte.LANDUNG_DAUER, sd), int(ev["ruhe"]), "Landung: uhr 6 zeigt das aufgerichtete Bild")
	_gleich(T.landung(KernWerte.LANDUNG_DAUER + 3, sd), int(ev["ruhe"]), "Landung: außerhalb der Dauer hält die Aufrichtung")
	var fj: KernEntitaeten.Figur = _figur("SPRUNG")
	fj.uhr = 21
	_gleich(T.bildindex_wahl(T.wahl(fj), sd), int(ev["scheitel"]), "Sprung: wahl(SPRUNG, uhr 21) → Scheitelbild")
	# nach einem Sprungangriff (Fallpose) zählt die Geschwindigkeit: vh im Scheitel = Start − 20 · Schwerkraft
	fj.sprung_angriff = true
	fj.uhr = 3
	fj.vh = KernWerte.SPRUNG_VH_START - 20 * KernWerte.SPRUNG_SCHWERKRAFT
	_gleich(T.wahl(fj)["uhr"], 21, "Sprung nach Sprungangriff: die Sprunguhr folgt aus vh (Scheitel 21)")
	var fl: KernEntitaeten.Figur = _figur("LANDUNG")
	fl.uhr = 6
	_gleich(T.bildindex_wahl(T.wahl(fl), sd), int(ev["ruhe"]), "Landung: wahl(LANDUNG, uhr 6) → aufgerichtet")
	for a: String in ["SPRUNGANGRIFF", "SPRINTSPRUNG", "NEUEINSTIEG", "GRIFF", "SPEZIAL"]:
		_ok(T.wahl(_figur(a)).is_empty(), "Zuordnung: %s hat keinen Clip (Puppe oder Platzhalter)" % a)
	# --- Getroffen: Auslenkung früh, Rückkehr bis uhr 27 ---
	var ge: Dictionary = gv["ereignis"]
	_gleich(T.treffer(T.TREFFER_KONTAKT_VON, gv), int(ge["kontakt"]), "Getroffen: die Auslenkung steht ab uhr %d" % T.TREFFER_KONTAKT_VON)
	_gleich(T.treffer(T.TREFFER_KONTAKT_BIS, gv), int(ge["kontakt"]), "Getroffen: die Auslenkung hält bis uhr %d" % T.TREFFER_KONTAKT_BIS)
	_gleich(T.treffer(KernWerte.GETROFFEN_DAUER, gv), int(ge["ruhe"]), "Getroffen: im letzten Frame (uhr %d) ist die Haltung erreicht" % KernWerte.GETROFFEN_DAUER)
	var tv: Array[int] = []
	for u: int in range(1, KernWerte.GETROFFEN_DAUER + 6):
		tv.append(T.treffer(u, gv))
	_ok(tv[0] >= int(ge["start"]) and tv[0] < int(ge["kontakt"]), "Getroffen: uhr 1 zeigt schon die Reaktion (vor der Auslenkung)")
	var gmono: bool = true
	for u: int in range(T.TREFFER_KONTAKT_BIS, tv.size()):
		if tv[u] < tv[u - 1]:
			gmono = false
	_ok(gmono, "Getroffen: nach der Auslenkung nur noch vorwärts bis zur Ruhe")
	_gleich(tv[tv.size() - 1], int(ge["ruhe"]), "Getroffen: nach der Dauer hält die Ruhe")
	# vorn und hinten (G1-11): nur von vorn gibt es einen Clip
	var welt: KernWelt = KernWelt.new()
	var fg: KernEntitaeten.Figur = _figur("GETROFFEN")
	welt.figur = fg
	var gegner: KernEntitaeten.Gegner = KernEntitaeten.gegnerLeer(0)
	welt.gegner = [gegner]
	fg.x = KernFestkomma.ausGanz(100)
	fg.blick = 1
	fg.letzter_angreifer = "s0"
	gegner.x = KernFestkomma.ausGanz(150)
	_gleich(T.wahl(fg, welt).get("clip", ""), "getroffen_vorn", "Getroffen: Angreifer vor der Figur → getroffen_vorn")
	gegner.x = KernFestkomma.ausGanz(100)
	_gleich(T.wahl(fg, welt).get("clip", ""), "getroffen_vorn", "Getroffen: gleiche x-Lage zählt als vorn")
	gegner.x = KernFestkomma.ausGanz(50)
	_ok(T.wahl(fg, welt).is_empty() and not DarstellungVelaFrames.abgedeckt(fg, welt), "Getroffen: Angreifer hinter der Figur → kein Clip (Puppe oder Platzhalter)")
	fg.blick = -1
	_gleich(T.wahl(fg, welt).get("clip", ""), "getroffen_vorn", "Getroffen: Blick links, Angreifer links → vorn")
	fg.letzter_angreifer = null
	_gleich(T.wahl(fg, welt).get("clip", ""), "getroffen_vorn", "Getroffen: ohne Angreifer → vorn")
	# --- Flug: Aufprall im Bodenkontaktframe der Logik ---
	var fe: Dictionary = um["ereignis"]
	for art: String in ["F1", "F4"]:
		var f2: KernEntitaeten.Figur = _figur("UMGEWORFEN" if art == "F1" else "TOT")
		var still: int = KernWerte.F1_STILLSTAND if art == "F1" else KernWerte.F4_STILLSTAND
		KernBahn.bahnStarten(f2, art, -1)
		var boden_k: int = KernWerte.F1_BODEN if art == "F1" else KernWerte.F4_BODEN
		var idx_vor: int = -1
		var kontakt_k: int = -1
		var fmono: bool = true
		var alle: Array[int] = []
		for k: int in range(0, 58):
			f2.uhr = k + 1
			if k >= 1:
				KernBahn.bahnSchritt(f2, k, null)
			var w: Dictionary = T.wahl(f2)
			var i: int = T.bildindex_wahl(w, um)
			alle.append(i)
			if k > 0 and i < alle[k - 1]:
				fmono = false
			if f2.bahn_boden > 0 and kontakt_k < 0:
				kontakt_k = k
				_gleich(i, int(fe["aufprall"]), "%s: das Aufprallbild steht im Bodenkontaktframe der Logik (k = %d)" % [art, k])
			if kontakt_k < 0:
				idx_vor = i
		_gleich(kontakt_k, boden_k, "%s: Bodenkontakt der Bahn in H+%d (KernWerte)" % [art, boden_k])
		_ok(idx_vor < int(fe["aufprall"]), "%s: vor dem Bodenkontakt nie das Aufprallbild (%d)" % [art, idx_vor])
		_ok(fmono, "%s: die Bilder laufen vorwärts, kein Zurückspringen" % art)
		_gleich(alle[boden_k + FLUG_NACH], int(fe["liegt"]), "%s: %d Ticks nach dem Aufprall ist das Liegebild erreicht" % [art, FLUG_NACH])
		_gleich(alle[0], int(fe["start"]), "%s: der Treffer-Frame zeigt den Beginn der Reaktion" % art)
		_gleich(alle[still + 1], int(fe["abheben"]), "%s: der erste Bahnframe (Abheben) zeigt das Abhebebild (H+%d)" % [art, still + 1])
		# Stillstand: nur die Reaktion, danach Flug
		for k: int in range(1, still + 1):
			_ok(alle[k] < int(fe["abheben"]), "%s: im Stillstand (k = %d) noch vor dem Abheben" % [art, k])
	# Treffer aus der Luft: die Bahn dauert länger, das letzte Luftbild hält bis zum Bodenkontakt
	var f3: KernEntitaeten.Figur = _figur("UMGEWORFEN")
	f3.bahn_frame = 45
	f3.bahn_boden = 0
	f3.uhr = 54
	_gleich(T.bildindex_wahl(T.wahl(f3), um), int(fe["aufprall"]) - 1, "UMGEWORFEN: länger in der Luft (Treffer in der Luft) hält das letzte Luftbild")
	f3.bahn_frame = 30
	f3.bahn_boden = 30
	_gleich(T.bildindex_wahl(T.wahl(f3), um), int(fe["aufprall"]), "UMGEWORFEN: früherer Bodenkontakt (Treffer in der Luft) zeigt sofort den Aufprall")
	# Spiegelung: der Clip fliegt nach links (Blick rechts); Flug nach links ungespiegelt, nach rechts gespiegelt (G1-12)
	for a: String in ["UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT"]:
		var fm: KernEntitaeten.Figur = _figur(a)
		fm.blick = 1
		fm.bahn_richtung = -1
		_gleich(T.wahl(fm)["blick"], 1, "%s: Flug nach links (bahn_richtung −1) zeigt den Clip ungespiegelt" % a)
		fm.bahn_richtung = 1
		_gleich(T.wahl(fm)["blick"], -1, "%s: Flug nach rechts zeigt den Clip gespiegelt" % a)
		fm.blick = -1
		_gleich(T.wahl(fm)["blick"], -1, "%s: die Spiegelung hängt nur von der Flugrichtung ab" % a)
	var fb: KernEntitaeten.Figur = _figur("STAND")
	fb.blick = -1
	fb.bahn_richtung = -1
	_gleich(T.wahl(fb)["blick"], -1, "STAND: Blick der Logik gilt (nicht die Flugrichtung)")
	# TOT: Flug wie UMGEWORFEN, ab der Ruhe (phase R) das Liegebild
	var ft: KernEntitaeten.Figur = _figur("TOT")
	ft.phase = "R"
	ft.bahn_richtung = -1
	_gleich(T.wahl(ft)["clip"], "liegen", "TOT ab der Ruhe → Clip liegen")
	ft.phase = "B"
	_gleich(T.wahl(ft)["clip"], "umgeworfen", "TOT im Flug → Clip umgeworfen")
	# Liegen hält das Bild; Aufstehen über 26 Ticks von liegt bis zur Kampfhaltung
	_gleich(T.bildindex("liegen", 99, _daten("liegen")), 0, "Liegen: hält das Liegebild")
	_gleich(T.aufstehen(1, au), 0, "Aufstehen: uhr 1 zeigt das erste Bild (liegt wie `liegen`)")
	_gleich(T.aufstehen(KernWerte.FIGUR_AUFSTEHEN_DAUER, au), int(au["ereignis"]["ruhe"]), "Aufstehen: uhr 26 (letzter Frame) zeigt die Kampfhaltung")
	var amono: bool = true
	var av: Array[int] = []
	for u: int in range(1, KernWerte.FIGUR_AUFSTEHEN_DAUER + 4):
		av.append(T.aufstehen(u, au))
		if av.size() > 1 and av[av.size() - 1] < av[av.size() - 2]:
			amono = false
	_ok(amono, "Aufstehen: die Bilder laufen gleichmäßig vorwärts")
	# Kette 4: zwei Fenster (3 bis 6 und 17 bis 20), Drehung dazwischen
	var k4: Dictionary = _daten("kette4")
	if not k4.is_empty():
		var kk: int = k4["kontakt"]
		var k1: int = k4["kontakt1"]
		var v4: Array[int] = T.verlauf("kette4", KernWerte.KETTE4_DAUER + 5, k4)
		_gleich(v4[KernWerte.KETTE_AKTIV_VON[3] - 1], k1, "Kette 4: erstes Fenster beginnt mit dem ersten Kontaktbild (uhr %d)" % KernWerte.KETTE_AKTIV_VON[3])
		_gleich(v4[KernWerte.KETTE_AKTIV_BIS[3] - 1], k1, "Kette 4: erstes Fenster hält bis uhr %d" % KernWerte.KETTE_AKTIV_BIS[3])
		_gleich(v4[KernWerte.KETTE4_ZWEITES_FENSTER_VON - 1], kk, "Kette 4: zweites Fenster beginnt mit dem Tritt (uhr %d)" % KernWerte.KETTE4_ZWEITES_FENSTER_VON)
		_gleich(v4[KernWerte.KETTE4_ZWEITES_FENSTER_BIS - 1], kk, "Kette 4: zweites Fenster hält bis uhr %d" % KernWerte.KETTE4_ZWEITES_FENSTER_BIS)
		var dreh: bool = true
		for u: int in range(KernWerte.KETTE_AKTIV_BIS[3] + 1, KernWerte.KETTE4_ZWEITES_FENSTER_VON):
			if v4[u - 1] <= k1 or v4[u - 1] >= kk or v4[u - 1] < v4[u - 2]:
				dreh = false
		_ok(dreh, "Kette 4: zwischen den Fenstern läuft die Drehung (Bilder zwischen den beiden Kontakten, vorwärts)")
		_gleich(v4[KernWerte.KETTE4_DAUER - 1], int(k4["ruhe"]), "Kette 4: im letzten Tick (uhr 25) ist die Kampfhaltung erreicht")
	# Kette 2 bis 4 mit Ausfallschritt: Uhr wie bei kette1 (kette_uhr)
	for stufe: int in range(2, 5):
		var dk: Dictionary = _daten("kette%d" % stufe)
		if dk.is_empty():
			continue
		var von: int = KernWerte.KETTE_AKTIV_VON[stufe - 1]
		var bis: int = KernWerte.KETTE_AKTIV_BIS[stufe - 1]
		var fk: KernEntitaeten.Figur = _figur("SCHLAG")
		fk.kombo = stufe
		for u: int in range(1, T.kette_dauer(stufe) + 1):
			fk.uhr = u
			_ok(T.bildindex_wahl(T.wahl(fk), dk) == T.schlag(u, stufe, dk), "kette%d: wahl folgt der Schlagtabelle (uhr %d)" % [stufe, u])
		fk.uhr = von
		var kt: int = dk["kontakt"] if stufe != 4 else dk["kontakt1"]
		_gleich(T.bildindex_wahl(T.wahl(fk), dk), kt, "kette%d: Kontaktbild im ersten aktiven Frame (uhr %d)" % [stufe, von])
		fk.ausfallschritt = 1
		fk.uhr = KernWerte.AUSFALL_AKTIV_VON[stufe - 1]
		_gleich(T.bildindex_wahl(T.wahl(fk), dk), kt, "kette%d: mit Ausfallschritt steht das Kontaktbild im ersten aktiven Frame des Ausfallschritts (uhr %d)" % [stufe, fk.uhr])
		_ok(bis >= von, "kette%d: Fenster" % stufe)
	# Stand mit Pingpong: hin und her, kein Sprung, jedes Bild kommt vor
	var pd: Dictionary = {"bilder": 10, "zyklus_start": 2, "zyklus_bilder": 6, "fps": 24, "schleife": "pingpong", "zyklus_ticks": 0}
	var pt: int = T.zyklus_ticks("stand", pd)
	_gleich(pt, (10 * 60 + 12) / 24, "Pingpong: 2 · (6 − 1) = 10 Bildschritte in %d Ticks" % ((10 * 60 + 12) / 24))
	var pv: Array[int] = []
	for u: int in range(1, 2 * pt + 1):
		pv.append(T.bildindex("stand", u, pd))
	var pok: bool = true
	var pgesehen: Dictionary = {}
	for u: int in pv.size():
		pgesehen[pv[u]] = true
		if pv[u] < 2 or pv[u] > 7 or (u > 0 and absi(pv[u] - pv[u - 1]) > 1) or pv[u] != pv[(u + pt) % pv.size()]:
			pok = false
	_ok(pok, "Pingpong: Bilder 2 bis 7, Schritte höchstens 1, nach einer Periode von vorn")
	_gleich(pgesehen.size(), 6, "Pingpong: alle 6 Bilder kommen vor")
	_gleich(pv[0], 2, "Pingpong: Uhr 1 zeigt das erste Zyklusbild")
	_ok(pv.max() == 7 and pv.find(7) < pt, "Pingpong: das letzte Zyklusbild ist die Mitte der Periode")


const FLUG_NACH: int = 7


# ---------------------------------------------------------------------------
# Zuordnung an der laufenden Logik (echte Szenen)
# ---------------------------------------------------------------------------

## Szenen der Prüfbühne, in denen die Aktionen vorkommen: Sprint (T11_a), Sprung und Landung (T15_b, T2), Treffer,
## Umwerfen, Liegen und Aufstehen (T7_a, T9_c), Tod (T9_b).
const SZENEN: Array[String] = ["T11_a", "T15_b", "T2", "T7_a", "T9_b", "T9_c"]


func _logik_szenen() -> void:
	var skript: GDScript = load("res://darstellung/spiel.gd")
	var gesehen: Dictionary = {}
	for sn: String in SZENEN:
		var argv: PackedStringArray = PackedStringArray(["--szene", "spiel/tests/szenen/%s.txt" % sn, "--eingabe", "spiel/tests/eingaben/%s.txt" % sn])
		var spiel: Node2D = _spiel(skript, argv)
		var sitzung: DarstellungSitzung = spiel.get("sitzung")
		if sitzung == null:
			_ok(false, "Szene %s: gestartet" % sn)
			spiel.free()
			continue
		var schritte: int = 0
		var gut: bool = true
		var kontakt_gesehen: bool = false
		var letzte_clip: String = ""
		var sprung_scheitel_ok: bool = true
		var aufprall_ok: bool = true
		var auf_ende_ok: bool = true
		var blick_ok: bool = true
		var tritt_ok: bool = true
		while schritte < 800 and not sitzung.amEnde():
			sitzung.logikSchritt()
			schritte += 1
			var f: KernEntitaeten.Figur = sitzung.welt.figur
			var w: Dictionary = T.wahl(f, sitzung.welt)
			if w.is_empty():
				continue
			var cn: String = String(w["clip"])
			var c: Dictionary = DarstellungVelaFrames.clip_laden(cn)
			if c.is_empty():
				continue
			var d: Dictionary = c["daten"]
			var i: int = T.bildindex_wahl(w, d)
			gesehen["%s:%s" % [f.aktion, cn]] = int(gesehen.get("%s:%s" % [f.aktion, cn], 0)) + 1
			if i < 0 or i >= int(d["bilder"]) or int(w["blick"]) == 0:
				gut = false
			if f.aktion == "SPRUNG" and not f.sprung_angriff and f.uhr == KernWerte.SPRUNG_SCHEITEL_FRAME and i != int(d["ereignis"]["scheitel"]):
				sprung_scheitel_ok = false
			if f.aktion == "UMGEWORFEN" and f.bahn_boden > 0 and f.bahn_frame == f.bahn_boden:
				kontakt_gesehen = true
				if i != int(d["ereignis"]["aufprall"]):
					aufprall_ok = false
			if f.aktion == "UMGEWORFEN" and f.bahn_boden == 0 and i >= int(d["ereignis"]["aufprall"]):
				aufprall_ok = false
			if f.aktion == "AUFSTEHEN" and f.uhr == KernWerte.FIGUR_AUFSTEHEN_DAUER and i != int(d["ereignis"]["ruhe"]):
				auf_ende_ok = false
			if f.aktion == "SPRUNGANGRIFF" and cn == "sprungtritt":
				var fenster: Dictionary = KernWerte.SPRUNGANGRIFF[f.sprung_variante]
				if f.uhr >= int(fenster["aktiv_von"]) and f.uhr <= int(fenster["aktiv_bis"]) and i != int(d["kontakt"]):
					tritt_ok = false
				if f.uhr < int(fenster["aktiv_von"]) and i >= int(d["kontakt"]):
					tritt_ok = false
			if f.aktion in ["UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT"] and int(w["blick"]) != -f.bahn_richtung:
				blick_ok = false
			letzte_clip = cn
		_ok(gut, "Szene %s: alle Bildindizes im Clip, Blick ±1" % sn)
		_ok(sprung_scheitel_ok, "Szene %s: Sprung: Scheitelbild im Scheitelframe" % sn)
		_ok(aufprall_ok, "Szene %s: Umgeworfen: Aufprall genau im Bodenkontaktframe, davor nie" % sn)
		_ok(auf_ende_ok, "Szene %s: Aufstehen: im letzten Frame die Kampfhaltung" % sn)
		_ok(blick_ok, "Szene %s: Flugrichtung bestimmt die Spiegelung" % sn)
		_ok(tritt_ok, "Szene %s: Sprungangriff: Kontaktbild im Trefferfenster, davor nie" % sn)
		if sn == "T7_a" or sn == "T9_c":
			_ok(kontakt_gesehen, "Szene %s: Bodenkontakt kam vor" % sn)
		spiel.free()
	for k: String in ["SPRINT:sprint", "SPRUNG:sprung", "LANDUNG:sprung", "SPRUNGANGRIFF:sprungtritt", "LANDUNG:sprungtritt", "GETROFFEN:getroffen_vorn", "UMGEWORFEN:umgeworfen", "LIEGEN:liegen", "AUFSTEHEN:aufstehen", "TOT:umgeworfen"]:
		_ok(int(gesehen.get(k, 0)) > 0, "Szenen: %s kam mit dem Clip vor (%d Ticks)" % [k, int(gesehen.get(k, 0))])


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
	for n: String in ["stand", "gehen", "kette1", "kette2", "kette3", "kette4", "sprint", "sprung", "getroffen_vorn", "umgeworfen", "liegen", "aufstehen"]:
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
