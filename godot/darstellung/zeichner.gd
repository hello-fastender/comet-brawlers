# Zeichenklasse der Darstellung (E25; Auftrag 5, Phase 1, U1; docs/grafik.md
# 9.10). Port von spiel/src/darstellung/zeichner.ts. Die Logik und alle Lagen
# der Darstellung rechnen in Spielpixeln (384 × 224, bildX und bildY in
# zeichnen.gd); das Fenster hat DARSTELLUNG-mal so viele Bildpixel (768 × 448).
# Jedes Zeichnen der Darstellung geht durch diese Klasse und gibt
# Spielkoordinaten an.
#
# Der Faktor wirkt an genau einer Stelle: Die Methoden rechnen jede
# Spielkoordinate über bx, by und bl (Spielpixel → Bildpixel, mit der
# Verschiebung des Bildschüttelns). Rechtecke, Linien der Debug-Anzeige
# (1 Spielpixel breit) und die Pixelschrift fallen so auf ganze Blöcke von
# DARSTELLUNG × DARSTELLUNG Bildpixeln.
#
# Umsetzung in Godot: Die Klasse kapselt ein CanvasItem (Node2D oder
# Control) und schreibt die Zeichenbefehle über den RenderingServer in
# dessen Canvas-Item (get_canvas_item()). Das ist dasselbe, was draw_rect und
# Verwandte intern tun, gilt aber auch außerhalb von _draw (Tests ohne
# Bildlauf). Im Spiel wird sie aus _draw des Knotens aufgerufen; der Knoten
# löscht sein Canvas-Item vor jedem _draw selbst. Orthogonale Linien und
# Umrisse sind exakte Rechtecke aus ganzen Bildpixeln wie die Linien auf dem
# Canvas 2D der TypeScript-Fassung (Linienbreite 1 Spielpixel, Mitte des
# Pixels bei +0,5); Vielecke und Ellipsen werden ohne Glättung gefüllt.
#
# Zum Prüfen: aufzeichnen = true hält jeden Zeichenbefehl in befehle (in
# Bildpixeln, mit Deckkraft) fest; ohne CanvasItem (null) wird nur
# aufgezeichnet.
class_name DarstellungZeichner
extends RefCounted

## Mitte eines Spielpixels: 1-px-Linien auf halben Koordinaten bleiben scharf.
const PIXELMITTE: float = 0.5
## Größe des Fensters in Bildpixeln (768 × 448).
const BILDPIXEL_BREITE: int = KernWerte.BILD_BREITE * DarstellungMasse.DARSTELLUNG
const BILDPIXEL_HOEHE: int = KernWerte.BILD_HOEHE * DarstellungMasse.DARSTELLUNG
## Eckenzahl des Vielecks, das eine Ellipse ersetzt.
const ELLIPSE_ECKEN: int = 48

## Das gekapselte CanvasItem (kann null sein: dann nur aufzeichnen).
var ci: CanvasItem = null
var _rid: RID = RID()
## Verschiebung in Spielpixeln (Bildschütteln)
var _vx: float = 0.0
var _vy: float = 0.0
## Deckkraft für das Folgende (0 bis 1)
var _deckkraft: float = 1.0
## gesicherte Zustände: je Eintrag [vx, vy, deckkraft]
var _gesichert: Array = []
## Pixelellipsen als Zeilenläufe nach Breite und Höhe: Array von [px_start, py, laenge]
var _ellipsen: Dictionary = {}

## Aufzeichnung der Zeichenbefehle (Prüfmittel); jeder Eintrag ein Dictionary
## mit "art" ("rechteck", "vieleck", "linie") und "farbe" (Color mit Deckkraft).
var aufzeichnen: bool = false
var befehle: Array = []
## Zahl aller Zeichenbefehle seit dem Anlegen (auch ohne Aufzeichnung).
var zaehler: int = 0


func _init(canvas_item: CanvasItem = null) -> void:
	ci = canvas_item
	if ci != null:
		_rid = ci.get_canvas_item()
	beginne()


# ===========================================================================
# Umrechnung Spielpixel → Bildpixel
# ===========================================================================

## Bildpixel zu Spiel-x (mit Verschiebung).
func bx(x: float) -> float:
	return (x + _vx) * DarstellungMasse.DARSTELLUNG


## Bildpixel zu Spiel-y (mit Verschiebung).
func by(y: float) -> float:
	return (y + _vy) * DarstellungMasse.DARSTELLUNG


## Länge in Bildpixeln zu einer Länge in Spielpixeln.
func bl(l: float) -> float:
	return l * DarstellungMasse.DARSTELLUNG


## Farbe mit der Deckkraft der Zeichenklasse.
func _mit(farbe: Color) -> Color:
	return Color(farbe.r, farbe.g, farbe.b, farbe.a * _deckkraft)


# ===========================================================================
# Ausgabe (einzige Stellen, die den RenderingServer rufen)
# ===========================================================================

## Gefülltes Rechteck in Bildpixeln.
func _fuellen(r: Rect2, farbe: Color) -> void:
	var rr: Rect2 = r.abs()
	if rr.size.x <= 0.0 or rr.size.y <= 0.0:
		return
	zaehler += 1
	if aufzeichnen:
		befehle.append({"art": "rechteck", "rect": rr, "farbe": farbe})
	if _rid.is_valid():
		RenderingServer.canvas_item_add_rect(_rid, rr, farbe)


## Gefülltes konvexes Vieleck in Bildpixeln als Dreiecksfächer um den ersten
## Punkt (Godots eigene Zerlegung von canvas_item_add_polygon scheitert an
## flachen Dreiecken, der Fächer nicht).
func _vieleckBild(p: PackedVector2Array, farbe: Color) -> void:
	var n: int = p.size()
	if n < 3:
		return
	# Fläche ungleich null?
	var flaeche: float = 0.0
	for i in range(n):
		var q: Vector2 = p[(i + 1) % n]
		flaeche += p[i].x * q.y - q.x * p[i].y
	if absf(flaeche) < 0.000001:
		return
	zaehler += 1
	if aufzeichnen:
		befehle.append({"art": "vieleck", "punkte": p, "farbe": farbe})
	if _rid.is_valid():
		var indizes: PackedInt32Array = PackedInt32Array()
		for i in range(1, n - 1):
			indizes.append(0)
			indizes.append(i)
			indizes.append(i + 1)
		var farben: PackedColorArray = PackedColorArray()
		farben.resize(n)
		farben.fill(farbe)
		RenderingServer.canvas_item_add_triangle_array(_rid, indizes, p, farben)


## Linie der Dicke breite von a nach b in Bildpixeln mit flachen Enden.
## Waagerechte und senkrechte Linien sind exakte Rechtecke.
func _linieBild(a: Vector2, b: Vector2, breite: float, farbe: Color) -> void:
	if a.is_equal_approx(b):
		return
	if is_equal_approx(a.y, b.y):
		_fuellen(Rect2(minf(a.x, b.x), a.y - breite / 2.0, absf(b.x - a.x), breite), farbe)
		return
	if is_equal_approx(a.x, b.x):
		_fuellen(Rect2(a.x - breite / 2.0, minf(a.y, b.y), breite, absf(b.y - a.y)), farbe)
		return
	zaehler += 1
	if aufzeichnen:
		befehle.append({"art": "linie", "von": a, "nach": b, "breite": breite, "farbe": farbe})
	if _rid.is_valid():
		RenderingServer.canvas_item_add_line(_rid, a, b, farbe, breite, false)


## Zerlegt die Strecke a–b nach dem Strichmuster (Bildpixel, abwechselnd Strich
## und Lücke, beginnend mit Strich) und zeichnet die Striche; phase ist der
## Stand im Muster zu Beginn der Strecke. Gibt die Phase am Ende zurück.
func _strichLinie(a: Vector2, b: Vector2, breite: float, farbe: Color, muster: PackedFloat32Array, phase: float) -> float:
	var laenge: float = a.distance_to(b)
	if laenge <= 0.0:
		return phase
	var richtung: Vector2 = (b - a) / laenge
	var gesamt: float = 0.0
	for l: float in muster:
		gesamt += l
	if gesamt <= 0.0:
		_linieBild(a, b, breite, farbe)
		return phase
	var pos: float = 0.0
	var p: float = fposmod(phase, gesamt)
	while pos < laenge:
		# Eintrag im Muster, in dem p liegt
		var index: int = 0
		var rest: float = p
		while rest >= muster[index]:
			rest -= muster[index]
			index = (index + 1) % muster.size()
		var bis: float = minf(laenge, pos + (muster[index] - rest))
		if index % 2 == 0:
			_linieBild(a + richtung * pos, a + richtung * bis, breite, farbe)
		p = fposmod(p + (bis - pos), gesamt)
		pos = bis
	return p


## Strichmuster (Spielpixel) in Bildpixel.
func _muster(strich: Variant) -> PackedFloat32Array:
	var m: PackedFloat32Array = PackedFloat32Array()
	if strich == null:
		return m
	for l: Variant in (strich as Array):
		m.append(bl(float(l)))
	return m


# ===========================================================================
# Zustand
# ===========================================================================

## Beginn eines Bildes: keine Verschiebung, volle Deckkraft, nichts gesichert.
func beginne() -> void:
	_vx = 0.0
	_vy = 0.0
	_deckkraft = 1.0
	_gesichert.clear()


## Verschiebung und Deckkraft sichern.
func sichern() -> void:
	_gesichert.append([_vx, _vy, _deckkraft])


## Gesicherte Verschiebung und Deckkraft wiederherstellen.
func zurueck() -> void:
	if _gesichert.is_empty():
		return
	var v: Array = _gesichert.pop_back()
	_vx = v[0]
	_vy = v[1]
	_deckkraft = v[2]


## Verschiebt alles Folgende um (dx, dy) Spielpixel (Bildschütteln, KA10).
func verschieben(dx: float, dy: float) -> void:
	_vx += dx
	_vy += dy


## Deckkraft 0 bis 1 für das Folgende.
func deckkraft(a: float) -> void:
	_deckkraft = a


## Verschiebung in Spielpixeln (für Prüfungen).
func verschiebung() -> Vector2:
	return Vector2(_vx, _vy)


## Löscht die Aufzeichnung der Befehle.
func leeren() -> void:
	befehle.clear()


# ===========================================================================
# Formen
# ===========================================================================

## Gefülltes Rechteck b × h mit der linken oberen Ecke bei (x, y).
func rechteck(x: float, y: float, b: float, h: float, farbe: Color) -> void:
	_fuellen(Rect2(bx(x), by(y), bl(b), bl(h)), _mit(farbe))


## Umriss eines Rechtecks als Linie von 1 Spielpixel um die Pixel (x, y) bis
## (x + b, y + h); strich: Strichmuster in Spielpixeln oder null.
func umriss(x: float, y: float, b: float, h: float, farbe: Color, strich: Variant = null) -> void:
	var f: Color = _mit(farbe)
	var d: float = bl(1.0)
	var l: float = bx(x + PIXELMITTE)
	var t: float = by(y + PIXELMITTE)
	var w: float = bl(b)
	var hh: float = bl(h)
	if strich == null:
		# Mitte der Linie läuft auf dem Rechteck (l, t, w, hh); Dicke d, Ecken gefüllt
		_fuellen(Rect2(l - d / 2.0, t - d / 2.0, w + d, d), f)
		if hh > 0.0:
			_fuellen(Rect2(l - d / 2.0, t + hh - d / 2.0, w + d, d), f)
			_fuellen(Rect2(l - d / 2.0, t + d / 2.0, d, hh - d), f)
			if w > 0.0:
				_fuellen(Rect2(l + w - d / 2.0, t + d / 2.0, d, hh - d), f)
		return
	var m: PackedFloat32Array = _muster(strich)
	var phase: float = 0.0
	phase = _strichLinie(Vector2(l, t), Vector2(l + w, t), d, f, m, phase)
	phase = _strichLinie(Vector2(l + w, t), Vector2(l + w, t + hh), d, f, m, phase)
	phase = _strichLinie(Vector2(l + w, t + hh), Vector2(l, t + hh), d, f, m, phase)
	_strichLinie(Vector2(l, t + hh), Vector2(l, t), d, f, m, phase)


## Linie von 1 Spielpixel durch die Pixel (x0, y0) und (x1, y1).
func linie(x0: float, y0: float, x1: float, y1: float, farbe: Color, strich: Variant = null) -> void:
	var f: Color = _mit(farbe)
	var a: Vector2 = Vector2(bx(x0 + PIXELMITTE), by(y0 + PIXELMITTE))
	var b: Vector2 = Vector2(bx(x1 + PIXELMITTE), by(y1 + PIXELMITTE))
	if strich == null:
		_linieBild(a, b, bl(1.0), f)
	else:
		_strichLinie(a, b, bl(1.0), f, _muster(strich), 0.0)


## Gefülltes konvexes Vieleck (Platzhalter). punkte: Array von Vector2 in
## Spielpixeln.
func vieleck(punkte: Array, farbe: Color) -> void:
	var p: PackedVector2Array = PackedVector2Array()
	for q: Variant in punkte:
		var v: Vector2 = q
		p.append(Vector2(bx(v.x), by(v.y)))
	_vieleckBild(p, _mit(farbe))


## Gefüllte Ellipse um (x, y) mit den Halbachsen rx, ry (Platzhalter).
func ellipse(x: float, y: float, rx: float, ry: float, farbe: Color) -> void:
	var cx: float = bx(x)
	var cy: float = by(y)
	var ax: float = bl(rx)
	var ay: float = bl(ry)
	if ax <= 0.0 or ay <= 0.0:
		return
	var p: PackedVector2Array = PackedVector2Array()
	for i in range(ELLIPSE_ECKEN):
		var w: float = TAU * float(i) / float(ELLIPSE_ECKEN)
		p.append(Vector2(cx + ax * cos(w), cy + ay * sin(w)))
	_vieleckBild(p, _mit(farbe))


## Pixelgenaue Ellipse b × h in Spielpixeln (ein Spielpixel ist gesetzt, wenn
## seine Mitte in der Ellipse liegt) mit der linken oberen Ecke bei
## (x − ⌊b/2⌋, y − ⌊h/2⌋), Farbe und Deckkraft fest (Schatten der Sprites,
## G7-12). Je Zeile ein Lauf, Deckkraft der Zeichenklasse wird ersetzt.
func pixelEllipse(x: float, y: float, b: int, h: int, farbe: Color, deckkraft_fest: float) -> void:
	if b <= 0 or h <= 0:
		return
	var schluessel: String = "%dx%d" % [b, h]
	var laeufe: Array = []
	if _ellipsen.has(schluessel):
		laeufe = _ellipsen[schluessel]
	else:
		var rx: float = b / 2.0
		var ry: float = h / 2.0
		for py in range(h):
			var start: int = -1
			var ende: int = -1
			for px in range(b):
				var dx: float = (float(px) + PIXELMITTE - rx) / rx
				var dy: float = (float(py) + PIXELMITTE - ry) / ry
				if dx * dx + dy * dy <= 1.0:
					if start < 0:
						start = px
					ende = px
			if start >= 0:
				laeufe.append([start, py, ende - start + 1])
		_ellipsen[schluessel] = laeufe
	var f: Color = Color(farbe.r, farbe.g, farbe.b, farbe.a * deckkraft_fest)
	var ox: float = bx(x - floorf(b / 2.0))
	var oy: float = by(y - floorf(h / 2.0))
	for lauf: Variant in laeufe:
		var a: Array = lauf
		_fuellen(Rect2(ox + bl(float(a[0])), oy + bl(float(a[1])), bl(float(a[2])), bl(1.0)), f)


## Text in einer Pixelschrift (schrift.gd) mit der linken oberen Ecke bei
## (x, y); faktor vergrößert jedes Schriftpixel. Gibt die Breite in
## Spielpixeln zurück. Die Schrift wird aus Rechtecken gebaut (keine
## Systemschrift).
func text(s: DarstellungSchrift.Schrift, inhalt: String, x: float, y: float, farbe: Color, faktor: int = 1) -> int:
	var f: Color = _mit(farbe)
	var px: int = floori(x + 0.5)
	var py: int = floori(y + 0.5)
	for i in range(inhalt.length()):
		var g: Array = DarstellungSchrift.glyphe(s, inhalt[i])
		for zeile in range(g.size()):
			var reihe: String = g[zeile]
			var anfang: int = -1
			for spalte in range(reihe.length() + 1):
				var gesetzt: bool = spalte < reihe.length() and reihe[spalte] == "#"
				if gesetzt and anfang < 0:
					anfang = spalte
				if not gesetzt and anfang >= 0:
					_fuellen(Rect2(bx(px + anfang * faktor), by(py + zeile * faktor), bl((spalte - anfang) * faktor), bl(faktor)), f)
					anfang = -1
		px += s.vorschub * faktor
	return DarstellungSchrift.textBreite(s, inhalt, faktor)
