# Tests der Darstellung (Auftrag 6, Phase 2). Eigene Datei, nicht Teil von
# alle.gd; Einbindung (die Hauptsitzung trägt sie dort ein):
#
#   var r: Dictionary = DarstellungTest.lauf()
#   _geprueft += r["geprueft"]
#   for f: String in r["fehler"]:
#       _fehler += 1
#       print("FEHLER Darstellung: %s" % f)
#
# lauf() ist ein gewöhnlicher Aufruf (kein await) und braucht weder Fenster
# noch Rendertreiber; unter --headless genügt der Dummy-Renderer. Geprüft wird:
#
#  (a) Eine DarstellungSitzung treibt die Szene vorfuehrung (Szene und
#      Eingabe aus spiel/tests/) 600 Schritte und erzeugt dieselben
#      Protokollzeilen wie spiel/tests/referenz/alle/vorfuehrung.protokoll.csv,
#      wobei in jedem Schritt zusätzlich gezeichnet wird: zeichneBild, Debug,
#      oberste Ebene auf ein echtes Node2D im SceneTree (dessen Canvas-Item),
#      dazu queue_redraw.
#  (b) Tastatur (K6) und Zeichner (Faktor 4, E28), Auflösung, Schrift, Sitzung einzeln.
#  (c) Das Zeichnen liest die Welt nur: Fingerabdruck des gesamten Weltzustands
#      vor und nach dem Zeichnen gleich; Protokoll mit und ohne Zeichnen gleich;
#      die zweiteilige Zeichnung ergibt dieselbe Befehlsfolge wie die ganze.
class_name DarstellungTest
extends RefCounted

var geprueft: int = 0
var fehler: Array[String] = []


# ===========================================================================
# Prüfhilfen
# ===========================================================================

func _ok(bedingung: bool, name: String) -> void:
	geprueft += 1
	if not bedingung:
		fehler.append(name)


func _gleich(ist: Variant, soll: Variant, name: String) -> void:
	geprueft += 1
	if typeof(ist) != typeof(soll) or ist != soll:
		fehler.append("%s: ist %s, soll %s" % [name, var_to_str(ist), var_to_str(soll)])


## Ruft alle Prüfungen auf. Ergebnis: {"geprueft": n, "fehler": Array von String}.
static func lauf() -> Dictionary:
	var t: DarstellungTest = DarstellungTest.new()
	t.tastatur()
	t.zeichner()
	t.aufloesung()
	t.schrift()
	t.sitzung()
	t.vorfuehrung()
	return {"geprueft": t.geprueft, "fehler": t.fehler}


# ===========================================================================
# (b) Tastatur (K6)
# ===========================================================================

func tastatur() -> void:
	var L: int = KernTasten.TASTE_L
	var R: int = KernTasten.TASTE_R
	var O: int = KernTasten.TASTE_O
	var U: int = KernTasten.TASTE_U
	var A: int = KernTasten.TASTE_A
	var S: int = KernTasten.TASTE_S
	var t: DarstellungTastatur = DarstellungTastatur.new()
	# K6: Tipp zwischen zwei Abfragen zählt in der nächsten Abfrage noch
	t.runter(KEY_RIGHT)
	t.hoch(KEY_RIGHT)
	_gleich(t.stand(), 0, "Tastatur: nach dem Loslassen kein Stand")
	_gleich(t.abfragen(), R, "Tastatur K6: kurzer Tipp zählt in der nächsten Abfrage")
	_gleich(t.abfragen(), 0, "Tastatur K6: danach nicht mehr")
	# gehaltene Taste bleibt, bis sie losgelassen ist
	t.runter(KEY_LEFT)
	_gleich(t.abfragen(), L, "Tastatur: gedrückt")
	_gleich(t.abfragen(), L, "Tastatur: gehalten")
	t.hoch(KEY_LEFT)
	_gleich(t.abfragen(), 0, "Tastatur: losgelassen")
	# Wiederholung (echo) und doppelter Druck setzen nichts neu
	t.runter(KEY_RIGHT)
	_gleich(t.abfragen(), R, "Tastatur: Druck")
	t.runter(KEY_RIGHT, true)
	t.runter(KEY_RIGHT)
	t.hoch(KEY_RIGHT)
	_gleich(t.abfragen(), 0, "Tastatur: Wiederholung ist kein neuer Druck")
	# Lage der Tasten: Y und Z gleich (QWERTZ und QWERTY), X = S, Pfeile
	t.runter(KEY_Y)
	_gleich(t.abfragen(), A, "Tastatur: Y = A")
	t.hoch(KEY_Y)
	t.abfragen()
	t.runter(KEY_Z)
	_gleich(t.abfragen(), A, "Tastatur: Z = A")
	t.hoch(KEY_Z)
	t.abfragen()
	t.runter(KEY_X)
	t.runter(KEY_UP)
	t.runter(KEY_DOWN)
	_gleich(t.abfragen(), S | O | U, "Tastatur: X = S, Pfeil hoch = O, runter = U")
	t.loslassen()
	_gleich(t.abfragen(), 0, "Tastatur: loslassen löscht gehalten und neu")
	# stand() verbraucht nichts
	t.runter(KEY_RIGHT)
	t.hoch(KEY_RIGHT)
	t.stand()
	_gleich(t.abfragen(), R, "Tastatur: stand() lässt neue Drücke stehen")
	# Y und Z zugleich gehalten, eine losgelassen: A bleibt
	t.runter(KEY_Y)
	t.runter(KEY_Z)
	t.hoch(KEY_Y)
	t.abfragen()
	_gleich(t.abfragen(), A, "Tastatur: A bleibt, solange eine der Tasten gehalten ist")
	t.loslassen()
	# Steuertasten: nicht in T(f), Rückruf ohne Wiederholung, nicht mit Strg/Alt/Meta
	var gesehen: Array = []
	var s: DarstellungTastatur = DarstellungTastatur.new(func(taste: String) -> void: gesehen.append(taste))
	s.runter(KEY_P)
	s.runter(KEY_P, true)
	s.runter(KEY_F1)
	s.runter(KEY_F2)
	s.runter(KEY_F3)
	s.runter(KEY_N)
	s.runter(KEY_F11)
	s.runter(KEY_P, false, true)
	_gleich(gesehen, ["pause", "debug", "aufzeichnung", "neustart", "einzelschritt", "vollbild"], "Tastatur: Steuertasten")
	_gleich(s.abfragen(), 0, "Tastatur: Steuertasten gehören nicht zu T")
	# mit Strg gedrückte Spieltaste wirkt nicht
	s.runter(KEY_RIGHT, false, true)
	_gleich(s.abfragen(), 0, "Tastatur: Strg + Pfeil wirkt nicht")
	# über InputEventKey (physical_keycode, auch ohne: keycode)
	var e: InputEventKey = InputEventKey.new()
	e.physical_keycode = KEY_Z
	e.pressed = true
	_ok(s.eingabe(e), "Tastatur: InputEventKey erkannt")
	_gleich(s.abfragen(), A, "Tastatur: physical_keycode Z = A")
	e.pressed = false
	s.eingabe(e)
	_gleich(s.abfragen(), 0, "Tastatur: InputEventKey losgelassen")
	var e2: InputEventKey = InputEventKey.new()
	e2.keycode = KEY_X
	e2.pressed = true
	s.eingabe(e2)
	_gleich(s.abfragen(), S, "Tastatur: ohne physical_keycode zählt keycode")
	_ok(not s.eingabe(InputEventMouseButton.new()), "Tastatur: Mausereignis ist keine Taste")


# ===========================================================================
# (b) Zeichner (Faktor 4)
# ===========================================================================

func zeichner() -> void:
	var rot: Color = Color(1, 0, 0, 1)
	# d: Bildpixel je Spielpixel; alle Erwartungen unten sind Spielpixel · d (nichts hängt am Wert 2 oder 4)
	var d: float = float(DarstellungMasse.DARSTELLUNG)
	_gleich(DarstellungMasse.DARSTELLUNG, 4, "Faktor 4")
	_gleich(DarstellungZeichner.BILDPIXEL_BREITE, 1536, "Bildpixel breit")
	_gleich(DarstellungZeichner.BILDPIXEL_HOEHE, 896, "Bildpixel hoch")
	_gleich(DarstellungMasse.ASSET_ZU_BILD * DarstellungMasse.ASSET_BASIS, DarstellungMasse.DARSTELLUNG, "Puppe und Clips: ganzzahlige Vergrößerung auf den Faktor")
	var zn: DarstellungZeichner = DarstellungZeichner.new(null)
	zn.aufzeichnen = true
	zn.rechteck(10, 20, 5, 6, rot)
	_gleich(zn.befehle[0]["rect"], Rect2(10 * d, 20 * d, 5 * d, 6 * d), "Rechteck in Bildpixeln")
	# Verschiebung (Bildschütteln) in Spielpixeln, sichern/zurueck
	zn.leeren()
	zn.sichern()
	zn.verschieben(3, 4)
	zn.rechteck(0, 0, 1, 1, rot)
	_gleich(zn.befehle[0]["rect"], Rect2(3 * d, 4 * d, d, d), "Verschiebung 3/4 Spielpixel in Bildpixeln")
	zn.verschieben(1, 1)
	zn.zurueck()
	zn.rechteck(0, 0, 1, 1, rot)
	_gleich(zn.befehle[1]["rect"], Rect2(0, 0, d, d), "zurueck stellt die Verschiebung her")
	# Deckkraft, auch gesichert
	zn.leeren()
	zn.sichern()
	zn.deckkraft(0.5)
	zn.rechteck(0, 0, 1, 1, rot)
	zn.zurueck()
	zn.rechteck(0, 0, 1, 1, rot)
	_gleich(zn.befehle[0]["farbe"].a, 0.5, "Deckkraft 0,5")
	_gleich(zn.befehle[1]["farbe"].a, 1.0, "zurueck stellt die Deckkraft her")
	# Farbe mit Alpha wird mit der Deckkraft multipliziert
	zn.leeren()
	zn.deckkraft(0.5)
	zn.rechteck(0, 0, 1, 1, Color(0, 0, 0, 0.4))
	_ok(is_equal_approx((zn.befehle[0]["farbe"] as Color).a, 0.2), "Alpha mal Deckkraft")
	zn.beginne()
	zn.leeren()
	# Umriss: Linie von 1 Spielpixel um die Pixel (0,0) bis (10,10) = Bildpixel 0 bis 11 · d
	zn.umriss(0, 0, 10, 10, rot)
	var r: Array = []
	for b: Dictionary in zn.befehle:
		r.append(b["rect"])
	_gleich(r, [Rect2(0, 0, 11 * d, d), Rect2(0, 10 * d, 11 * d, d), Rect2(0, d, d, 9 * d), Rect2(10 * d, d, d, 9 * d)], "Umriss als vier Rechtecke")
	# Umriss mit Strichmuster [2, 2]: Striche von 2 Spielpixeln, Lücken von 2
	zn.leeren()
	zn.umriss(0, 0, 10, 10, rot, [2, 2])
	var summe: float = 0.0
	var kurz: bool = true
	for b: Dictionary in zn.befehle:
		var q: Rect2 = b["rect"]
		summe += maxf(q.size.x, q.size.y)
		if maxf(q.size.x, q.size.y) > 2.0 * d:
			kurz = false
	_ok(kurz, "Umriss gestrichelt: Striche höchstens 2 Spielpixel lang")
	_ok(zn.befehle.size() > 8, "Umriss gestrichelt: mehrere Striche")
	_ok(summe >= 18.0 * d and summe <= 30.0 * d, "Umriss gestrichelt: etwa die Hälfte der Länge (%s)" % summe)
	# Linie waagerecht durch die Pixel (0,0) und (9,0): Mitte des Pixels, Dicke 1 Spielpixel
	zn.leeren()
	zn.linie(0, 0, 9, 0, rot)
	_gleich(zn.befehle[0]["rect"], Rect2(0.5 * d, 0, 9 * d, d), "Linie waagerecht")
	zn.leeren()
	zn.linie(3, 1, 3, 8, rot)
	_gleich(zn.befehle[0]["rect"], Rect2(3 * d, 1.5 * d, d, 7 * d), "Linie senkrecht")
	zn.leeren()
	zn.linie(0, 0, 4, 3, rot)
	_gleich(zn.befehle[0]["art"], "linie", "Linie schräg bleibt eine Linie")
	_gleich(zn.befehle[0]["breite"], d, "Linie schräg: Dicke 1 Spielpixel")
	# Vieleck und Ellipse
	zn.leeren()
	zn.vieleck([Vector2(0, 0), Vector2(4, 0), Vector2(4, 3)], rot)
	_gleich(zn.befehle[0]["punkte"], PackedVector2Array([Vector2(0, 0), Vector2(4 * d, 0), Vector2(4 * d, 3 * d)]), "Vieleck in Bildpixeln")
	zn.leeren()
	zn.ellipse(10, 10, 5, 2, rot)
	var pts: PackedVector2Array = zn.befehle[0]["punkte"]
	_gleich(pts.size(), DarstellungZeichner.ELLIPSE_ECKEN, "Ellipse: Eckenzahl")
	var rechts: float = -1e9
	var hoch: float = 1e9
	for p: Vector2 in pts:
		rechts = maxf(rechts, p.x)
		hoch = minf(hoch, p.y)
	_ok(is_equal_approx(rechts, 15.0 * d) and is_equal_approx(hoch, 8.0 * d), "Ellipse: Halbachsen 5 und 2 Spielpixel um (10, 10)")
	# Pixelellipse: eine Zeile je Lauf, Mitte der Zeilen
	zn.leeren()
	zn.pixelEllipse(10, 10, 6, 4, rot, 0.5)
	_gleich(zn.befehle.size(), 4, "Pixelellipse 6 × 4: vier Zeilenläufe")
	_gleich((zn.befehle[0]["farbe"] as Color).a, 0.5, "Pixelellipse: feste Deckkraft")
	# Text: Schriftpixel als Rechtecke, Glyphe A = 12 Läufe
	zn.leeren()
	var w: int = zn.text(DarstellungSchrift.SCHRIFT_5X7, "A", 0, 0, rot)
	_gleich(w, 5, "Text A: Breite")
	_gleich(zn.befehle.size(), 12, "Text A: Läufe")
	_gleich(zn.befehle[0]["rect"], Rect2(d, 0, 3 * d, d), "Text A: erste Zeile .###. = 3 Schriftpixel ab Spalte 1")
	zn.leeren()
	zn.text(DarstellungSchrift.SCHRIFT_5X7, "A", 4, 7, rot, 2)
	_gleich(zn.befehle[0]["rect"], Rect2((4 + 2 * 1) * d, 7 * d, 6 * d, 2 * d), "Text A mit Faktor 2: Lauf 3 Schriftpixel = 6 Spielpixel")
	# ganzzahlig: alle Kanten der Schrift liegen auf ganzen Spielpixeln (Vielfachen von d)
	var gerade: bool = true
	for b: Dictionary in zn.befehle:
		var q: Rect2 = b["rect"]
		var di: int = DarstellungMasse.DARSTELLUNG
		if int(q.position.x) % di != 0 or int(q.position.y) % di != 0 or int(q.size.x) % di != 0 or int(q.size.y) % di != 0:
			gerade = false
	_ok(gerade, "Text: Kanten auf ganzen Spielpixeln")
	# gegen ein echtes CanvasItem: keine Aufzeichnung nötig, der Zähler zählt
	var knoten: Node2D = Node2D.new()
	var zc: DarstellungZeichner = DarstellungZeichner.new(knoten)
	zc.rechteck(0, 0, 4, 4, rot)
	zc.linie(0, 0, 4, 3, rot)
	zc.vieleck([Vector2(0, 0), Vector2(4, 0), Vector2(4, 3)], rot)
	_gleich(zc.zaehler, 3, "Zeichner auf einem CanvasItem: drei Befehle")
	knoten.free()


# ===========================================================================
# (b) Auflösung 1536 × 896 (E28): Projekt, Vollbildtaste, Maßstab der Puppe
# ===========================================================================

func aufloesung() -> void:
	var d: int = DarstellungMasse.DARSTELLUNG
	_gleich(ProjectSettings.get_setting("display/window/size/viewport_width"), KernWerte.BILD_BREITE * d, "Projekt: Viewportbreite = Logikbreite · Faktor")
	_gleich(ProjectSettings.get_setting("display/window/size/viewport_height"), KernWerte.BILD_HOEHE * d, "Projekt: Viewporthöhe = Logikhöhe · Faktor")
	_gleich(ProjectSettings.get_setting("display/window/stretch/mode"), "viewport", "Projekt: Stretch viewport")
	_gleich(ProjectSettings.get_setting("display/window/stretch/aspect"), "keep", "Projekt: Seitenverhältnis bleibt")
	_gleich(ProjectSettings.get_setting("display/window/size/resizable"), true, "Projekt: Fenster frei skalierbar")
	var fb: int = ProjectSettings.get_setting("display/window/size/window_width_override")
	var fh: int = ProjectSettings.get_setting("display/window/size/window_height_override")
	_ok(fb > 0 and fh > 0 and absi(fb * KernWerte.BILD_HOEHE - fh * KernWerte.BILD_BREITE) <= KernWerte.BILD_BREITE, "Projekt: Startfenster %d × %d hat das Seitenverhältnis des Spielbilds (±1 Pixel)" % [fb, fh])
	_ok(fb <= 1366 and fh <= 768 - 21, "Projekt: Startfenster passt auf einen Schirm von 1366 × 768 (mit Leiste)")
	_gleich(d, DarstellungMasse.ASSET_BASIS * DarstellungMasse.ASSET_ZU_BILD, "Faktor = Vermessung · Vergrößerung (ganzzahlig, Pixel bleiben scharf)")
	# Vollbild (F11): nur die Anfrage der Sitzung, das Fenster schaltet der Knoten
	var s: DarstellungSitzung = DarstellungSitzung.new(_stage("scheibe"), 3)
	s.tastatur.runter(KEY_F11)
	_ok(s.vollbild_anfrage, "F11: Vollbild-Anfrage gesetzt")
	s.tastatur.runter(KEY_F11, true)
	s.vollbild_anfrage = false
	s.tastatur.runter(KEY_F11, true)
	_ok(not s.vollbild_anfrage, "F11: Wiederholung durch das Betriebssystem wirkt nicht")
	_gleich(s.welt.frame, 0, "F11: ändert die Logik nicht")
	# Puppe: vergrößert sich selbst um ASSET_ZU_BILD, Werkzeuge setzen 1
	var p: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	p.aus_animation("stand", 1, 1)
	_gleich(p.scale, Vector2(float(DarstellungMasse.ASSET_ZU_BILD), float(DarstellungMasse.ASSET_ZU_BILD)), "Puppe: Maßstab ASSET_ZU_BILD, Blick rechts")
	p.aus_animation("stand", 1, -1)
	_gleich(p.scale, Vector2(-float(DarstellungMasse.ASSET_ZU_BILD), float(DarstellungMasse.ASSET_ZU_BILD)), "Puppe: Blick links spiegelt")
	p.free()
	var q: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	q.asset_zu_bild = 1
	q.aus_animation("stand", 1, 1)
	_gleich(q.scale, Vector2.ONE, "Puppe: Werkzeugmodus Maßstab 1")
	q.free()


# ===========================================================================
# (b) Schrift
# ===========================================================================

func schrift() -> void:
	var s7: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_5X7
	var s3: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_3X5
	_gleich(DarstellungSchrift.textBreite(s7, ""), 0, "Textbreite leer")
	_gleich(DarstellungSchrift.textBreite(s7, "AB"), 11, "Textbreite 5 × 7: 2 Zeichen")
	_gleich(DarstellungSchrift.textBreite(s7, "PAUSE", 2), 58, "Textbreite 5 × 7 mal 2: PAUSE")
	_gleich(DarstellungSchrift.textBreite(s3, "ABC"), 11, "Textbreite 3 × 5: 3 Zeichen")
	_gleich(DarstellungSchrift.glyphe(s7, "a"), DarstellungSchrift.glyphe(s7, "A"), "Kleinbuchstabe wird groß geschrieben")
	_gleich(DarstellungSchrift.glyphe(s7, "~"), DarstellungSchrift.glyphe(s7, "?"), "Unbekanntes als ?")
	_gleich(s7.glyphen.size(), 58, "Glyphen 5 × 7")
	_gleich(s3.glyphen.size(), 58, "Glyphen 3 × 5")
	var form: bool = true
	for g: String in s7.glyphen.keys():
		var z: Array = s7.glyphen[g]
		if z.size() != 7:
			form = false
		for reihe: String in z:
			if reihe.length() != 5:
				form = false
	_ok(form, "alle Glyphen 5 × 7")
	form = true
	for g: String in s3.glyphen.keys():
		var z: Array = s3.glyphen[g]
		if z.size() != 5:
			form = false
		for reihe: String in z:
			if reihe.length() != 3:
				form = false
	_ok(form, "alle Glyphen 3 × 5")


# ===========================================================================
# (b) Sitzung
# ===========================================================================

func _wurzel() -> String:
	return VergleichHilfe.wurzel()


func _stage(buehne: String) -> String:
	return VergleichHilfe.lesen(_wurzel().path_join("spiel/daten/stages/%s.txt" % buehne)) as String


func sitzung() -> void:
	_gleich(DarstellungSitzung.naechsterSeed(1), 2, "Seed + 1")
	_gleich(DarstellungSitzung.naechsterSeed(DarstellungSitzung.SEED_MAX), 1, "Seed: nach dem größten wieder 1")
	_gleich(DarstellungSitzung.seedAusEingabe("# kopf\n# seed=42\n1,2,R\n"), 42, "seedAusEingabe")
	_gleich(DarstellungSitzung.seedAusEingabe("# seed = 7 \n"), 7, "seedAusEingabe mit Leerzeichen")
	_gleich(DarstellungSitzung.seedAusEingabe("# seed=0\n"), 0, "seedAusEingabe: 0 ist verboten")
	_gleich(DarstellungSitzung.seedAusEingabe("1,2,R\n"), 0, "seedAusEingabe: ohne Zeile")
	var stage: String = _stage("scheibe")
	_ok(stage != "", "Stage scheibe lesbar")
	var s: DarstellungSitzung = DarstellungSitzung.new(stage, 3)
	_gleich(s.welt.frame, 0, "Sitzung: Frame 0 nach dem Anlegen")
	_gleich(s.quelle(), "tastatur", "Sitzung: Quelle Tastatur")
	_gleich(s.start.name, "spiel", "Sitzung: Spielstart")
	# Pause: kein Logikschritt; Einzelschritt nur in der Pause
	s.tick()
	_gleich(s.welt.frame, 1, "Sitzung: tick = ein Logikschritt")
	s.steuer("einzelschritt")
	_gleich(s.welt.frame, 1, "Sitzung: Einzelschritt außerhalb der Pause wirkt nicht")
	s.tastatur.runter(KEY_P)
	_ok(s.pause, "Sitzung: P schaltet die Pause ein")
	s.tick()
	_gleich(s.welt.frame, 1, "Sitzung: in der Pause kein Schritt")
	s.tastatur.runter(KEY_N)
	_gleich(s.welt.frame, 2, "Sitzung: N in der Pause = ein Schritt")
	s.tastatur.runter(KEY_RIGHT)
	s.tastatur.runter(KEY_N)
	_gleich(s.welt.eingabe.t, KernTasten.TASTE_R, "Sitzung: Einzelschritt mit dem Tastenstand als T(f)")
	s.tastatur.runter(KEY_P)
	_ok(not s.pause, "Sitzung: P schaltet die Pause aus")
	s.tastatur.runter(KEY_F1)
	_ok(s.debug, "Sitzung: F1 schaltet Debug ein")
	s.tastatur.runter(KEY_F1)
	_ok(not s.debug, "Sitzung: F1 schaltet Debug aus")
	# Neustart mit Seed + 1 (F3), Quelle bleibt Tastatur
	s.tastatur.loslassen()
	s.tastatur.runter(KEY_F3)
	_gleich(s.seed_wert, 4, "Sitzung: F3 = Seed + 1")
	_gleich(s.welt.frame, 0, "Sitzung: F3 beginnt bei Frame 0")
	_gleich(s.verlauf.size(), 1, "Sitzung: Verlauf neu")
	# Ende der Scheibe: Neustart mit Seed + 1
	s.welt.beendet = true
	s.tick()
	_gleich(s.seed_wert, 5, "Sitzung: nach dem Ende Seed + 1")
	_gleich(s.welt.frame, 0, "Sitzung: nach dem Ende Frame 0")
	# schritte_max
	var m: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	m.schritte_max = 5
	for _i in range(10):
		m.tick()
	_gleich(m.welt.frame, 5, "Sitzung: nach schritte_max pausiert")
	_ok(m.pause, "Sitzung: Pause nach schritte_max")
	# Aufzeichnung F2: Datei im Format der Eingabedatei, Seed im Kopf, Neustart ab Spielstart
	var a: DarstellungSitzung = DarstellungSitzung.new(stage, 9)
	a.protokollSetzen(true)
	a.tastatur.runter(KEY_F2)
	_ok(a.aufzeichnung_ab != null and a.aufzeichnung_ab == 1, "Sitzung: F2 startet ab Frame 1")
	_ok(a.ansicht().aufzeichnung, "Sitzung: Ansicht zeigt die Aufzeichnung")
	for i in range(240):
		match i:
			0:
				a.tastatur.runter(KEY_RIGHT)
			70:
				a.tastatur.hoch(KEY_RIGHT)
				a.tastatur.runter(KEY_Y)
			73:
				a.tastatur.hoch(KEY_Y)
			80:
				a.tastatur.runter(KEY_X)
				a.tastatur.hoch(KEY_X)
			100:
				a.tastatur.runter(KEY_LEFT)
				a.tastatur.runter(KEY_UP)
			150:
				a.tastatur.loslassen()
		a.tick()
	a.tastatur.runter(KEY_F2)
	_ok(a.aufzeichnung_ab == null, "Sitzung: zweites F2 beendet die Aufzeichnung")
	var fertig: Array = a.nimmAufzeichnungen()
	_gleich(fertig.size(), 1, "Sitzung: eine fertige Aufzeichnung")
	_gleich(a.nimmAufzeichnungen().size(), 0, "Sitzung: abgeholt ist abgeholt")
	var text: String = (fertig[0] as Dictionary)["text"]
	_gleich((fertig[0] as Dictionary)["seed"], 9, "Aufzeichnung: Seed")
	_ok(text.contains("# seed=9\n"), "Aufzeichnung: Kopf mit # seed=N")
	_gleich(DarstellungSitzung.seedAusEingabe(text), 9, "Aufzeichnung: seedAusEingabe liest den Kopf")
	var folge: PruefEingabe.Eingabefolge = PruefEingabe.parseEingabe(text)
	var gleichT: bool = true
	for f in range(1, 241):
		if PruefEingabe.tastenIn(folge, f) != a.tastenVon(f):
			gleichT = false
	_ok(gleichT, "Aufzeichnung: parseEingabe ergibt T(1) bis T(240) des Laufs")
	_ok(a.tastenVon(1) == KernTasten.TASTE_R, "Aufzeichnung: erster Frame hat R")
	# Abspielen der Aufzeichnung ab Spielstart ergibt dieselben Protokollzeilen
	var b: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	b.protokollSetzen(true)
	b.ladeEingabe(text)
	_gleich(b.seed_wert, 9, "Sitzung: Seed aus der Eingabedatei")
	_gleich(b.quelle(), "eingabe", "Sitzung: Quelle Eingabe")
	for _i in range(240):
		b.tick()
	_gleich(b.welt.frame, 240, "Sitzung: Eingabe abgespielt")
	var gleichZ: bool = a.schreiber.protokollZeilen.size() == b.schreiber.protokollZeilen.size()
	if gleichZ:
		var ka: int = VergleichHilfe.kopfIndex(PackedStringArray(a.schreiber.protokollZeilen))
		for i in range(ka + 1, a.schreiber.protokollZeilen.size()):
			if a.schreiber.protokollZeilen[i] != b.schreiber.protokollZeilen[i]:
				gleichZ = false
				break
	_ok(gleichZ, "Aufzeichnung abgespielt = aufgezeichneter Lauf (Protokollzeilen)")
	# F3 holt aus der Eingabedatei zur Tastatur zurück
	b.tastatur.runter(KEY_F3)
	_gleich(b.quelle(), "tastatur", "Sitzung: F3 kehrt zur Tastatur zurück")
	# Neustart beendet eine laufende Aufzeichnung und legt sie ab
	var n: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	n.tastatur.runter(KEY_F2)
	n.tick()
	n.tastatur.runter(KEY_F3)
	_gleich(n.nimmAufzeichnungen().size(), 1, "Sitzung: Neustart legt die laufende Aufzeichnung ab")
	_ok(n.aufzeichnung_ab == null, "Sitzung: nach dem Neustart keine Aufzeichnung")
	# Prüfszene: endet nach endframe wie der Prüflauf
	var szenentext: String = "szene name=kurz endframe=20 seed=1 buehne=scheibe\n"
	var p: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	p.ladeSzene(PruefSzene.parseSzene(szenentext), stage, "")
	for _i in range(30):
		p.tick()
	_gleich(p.welt.frame, 20, "Sitzung: Prüfszene endet nach endframe")
	_ok(p.amEnde(), "Sitzung: amEnde nach endframe")
	_ok(not p.schritt(0), "Sitzung: am Ende läuft kein Schritt")


# ===========================================================================
# (a) und (c) Vorführung mit Zeichnen
# ===========================================================================

const SCHRITTE: int = 600

## Fingerabdruck des gesamten Weltzustands (alle Skriptvariablen rekursiv).
static func abdruck(v: Variant, tiefe: int, besucht: Dictionary) -> String:
	if tiefe > 14:
		return "…"
	match typeof(v):
		TYPE_NIL:
			return "null"
		TYPE_OBJECT:
			var o: Object = v
			if o == null:
				return "null"
			var id: int = o.get_instance_id()
			if besucht.has(id):
				return "@%d" % besucht[id]
			besucht[id] = besucht.size()
			if o.get_script() == null:
				return "<%s>" % o.get_class()
			var teile: PackedStringArray = PackedStringArray()
			for p: Dictionary in o.get_property_list():
				if (p["usage"] as int) & PROPERTY_USAGE_SCRIPT_VARIABLE:
					teile.append("%s=%s" % [p["name"], abdruck(o.get(p["name"] as String), tiefe + 1, besucht)])
			return "{" + ",".join(teile) + "}"
		TYPE_ARRAY:
			var arr: Array = v
			var t: PackedStringArray = PackedStringArray()
			for x: Variant in arr:
				t.append(abdruck(x, tiefe + 1, besucht))
			return "[" + ",".join(t) + "]"
		TYPE_DICTIONARY:
			var d: Dictionary = v
			var t2: PackedStringArray = PackedStringArray()
			for k: Variant in d.keys():
				t2.append("%s:%s" % [str(k), abdruck(d[k], tiefe + 1, besucht)])
			return "{" + ",".join(t2) + "}"
		_:
			return var_to_str(v)


## Zeichnet ein ganzes Bild mit allem, was die Darstellung kann.
func _zeichneAlles(zn: DarstellungZeichner, s: DarstellungSitzung) -> void:
	var a: KernRahmen.AnzeigeDaten = DarstellungZeichnen.zeichneBild(zn, s.welt)
	if s.debug:
		DarstellungDebug.zeichneDebugWelt(zn, s.welt)
		DarstellungDebug.zeichneDebugText(zn, s.welt, s.debugInfo())
	DarstellungZeichnen.zeichneObersteEbene(zn, a, s.ansicht("HINWEIS"))


func vorfuehrung() -> void:
	var w: String = _wurzel()
	var szene: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/szenen/vorfuehrung.txt"))
	var eingabe: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/eingaben/vorfuehrung.txt"))
	var ref_roh: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/referenz/alle/vorfuehrung.protokoll.csv"))
	_ok(szene != null and eingabe != null and ref_roh != null, "Vorführung: Dateien lesbar")
	if szene == null or eingabe == null or ref_roh == null:
		return
	var stage: String = _stage("scheibe")
	var start: KernStart.Pruefstart = PruefSzene.parseSzene(szene as String)
	# A: mit Zeichnen; B: ohne Zeichnen
	var mit: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	mit.protokollSetzen(true)
	mit.ladeSzene(PruefSzene.parseSzene(szene as String), stage, eingabe as String)
	var ohne: DarstellungSitzung = DarstellungSitzung.new(stage, 1)
	ohne.protokollSetzen(true)
	ohne.ladeSzene(PruefSzene.parseSzene(szene as String), stage, eingabe as String)
	_gleich(mit.welt.frame, 0, "Vorführung: Frame 0")
	_gleich(mit.start.endframe, start.endframe, "Vorführung: endframe")
	# echtes CanvasItem im SceneTree
	var knoten: Node2D = Node2D.new()
	var baum: SceneTree = Engine.get_main_loop() as SceneTree
	var im_baum: bool = baum != null
	if im_baum:
		baum.root.add_child(knoten)
	var zn: DarstellungZeichner = DarstellungZeichner.new(knoten)
	# zwei weitere Ebenen für die zweiteilige Zeichnung (nur zum Zählen und Vergleichen)
	var zn_h: DarstellungZeichner = DarstellungZeichner.new(null)
	var zn_v: DarstellungZeichner = DarstellungZeichner.new(null)
	var zn_g: DarstellungZeichner = DarstellungZeichner.new(null)
	var zn_o: DarstellungZeichner = DarstellungZeichner.new(null)
	for z: DarstellungZeichner in [zn_h, zn_v, zn_g, zn_o]:
		z.aufzeichnen = true
	var unveraendert: bool = true
	var genug: bool = true
	var teilgleich: bool = true
	var teilgleich_extern: bool = true
	var abdruecke: int = 0
	var davor: int = 0
	for i in range(SCHRITTE):
		mit.debug = (i % 7) < 3
		mit.pause = (i % 11) == 5
		ohne.logikSchritt()
		mit.logikSchritt()
		if (i % 100) == 99:
			# Fingerabdruck der ganzen Welt vor dem Zeichnen
			var vor: String = abdruck(mit.welt, 0, {}).md5_text()
			_zeichneAlles(zn, mit)
			var nach: String = abdruck(mit.welt, 0, {}).md5_text()
			abdruecke += 1
			if vor != nach:
				unveraendert = false
			# zweiteilige Zeichnung gegen die ganze: gleiche Befehlsfolge
			var ganz: DarstellungZeichner = DarstellungZeichner.new(null)
			ganz.aufzeichnen = true
			DarstellungZeichnen.zeichneBild(ganz, mit.welt)
			zn_h.leeren()
			zn_v.leeren()
			DarstellungZeichnen.zeichneBildTeil(zn_h, zn_v, mit.welt, false)
			if var_to_str(ganz.befehle) != var_to_str(zn_h.befehle + zn_v.befehle):
				teilgleich = false
			# mit figur_extern: dieselben Befehle ohne den Körper der Figur (= ohne_figur)
			zn_h.leeren()
			zn_v.leeren()
			DarstellungZeichnen.zeichneBildTeil(zn_h, zn_v, mit.welt, true)
			zn_o.leeren()
			DarstellungZeichnen.zeichneBild(zn_o, mit.welt, true)
			if var_to_str(zn_o.befehle) != var_to_str(zn_h.befehle + zn_v.befehle):
				teilgleich_extern = false
			if zn_o.befehle.size() >= ganz.befehle.size():
				teilgleich_extern = false
		else:
			davor = zn.zaehler
			_zeichneAlles(zn, mit)
			if zn.zaehler - davor < 100:
				genug = false
		knoten.queue_redraw()
	_gleich(mit.welt.frame, SCHRITTE, "Vorführung: %d Schritte mit Darstellung" % SCHRITTE)
	_ok(genug, "Vorführung: jedes Bild hat mindestens 100 Zeichenbefehle")
	_ok(unveraendert, "Zeichnen liest nur: Fingerabdruck der Welt vor und nach dem Zeichnen gleich (%d Mal)" % abdruecke)
	_ok(teilgleich, "zweiteilige Zeichnung (figur_extern aus) = ganze Zeichnung, Befehl für Befehl")
	_ok(teilgleich_extern, "zweiteilige Zeichnung mit figur_extern = Szene ohne Körper der Figur")
	# Protokoll gegen die Referenz (Kopf und die ersten 600 Zeilen)
	var ref: PackedStringArray = (ref_roh as String).split("\n")
	var ki: int = VergleichHilfe.kopfIndex(ref)
	_ok(ki > 0, "Vorführung: Referenzkopf gefunden")
	var bis: int = ki + 1 + SCHRITTE
	_gleich(mit.schreiber.protokollZeilen.size(), bis, "Vorführung: Zeilen im Protokoll (Kopf, Spalten, 600 Frames)")
	var erste: int = -1
	for z in range(mini(bis, mit.schreiber.protokollZeilen.size())):
		if mit.schreiber.protokollZeilen[z] != ref[z]:
			erste = z
			break
	_gleich(erste, -1, "Vorführung mit Darstellung: Protokoll = Referenz (erste abweichende Zeile)")
	# ohne Zeichnen dasselbe Protokoll
	_ok(mit.schreiber.protokollZeilen == ohne.schreiber.protokollZeilen, "Protokoll mit und ohne Zeichnen gleich")
	_ok(mit.schreiber.objektZeilen == ohne.schreiber.objektZeilen, "Objektprotokoll mit und ohne Zeichnen gleich")
	# bis zum Ende der Szene weiter: Sitzung hält an
	for _i in range(start.endframe - SCHRITTE + 20):
		mit.logikSchritt()
	_gleich(mit.welt.frame, start.endframe, "Vorführung: Lauf endet nach endframe")
	_ok(mit.amEnde(), "Vorführung: amEnde")
	knoten.free()
