# Spiel der Darstellung (Hauptszene spiel.tscn): dünne Hülle um die
# DarstellungSitzung. Port der Spielschleife aus spiel/src/darstellung/main.ts.
#
# Aufbau: Wurzel Node2D mit zwei Ebenen als Kinder (Hinten, Vorn). Hinten
# zeichnet Hintergrund, alle Schatten und die Stücke bis zur Figur, Vorn die
# Stücke nach der Figur, den Vordergrund, Blende, Anzeigeleiste, Debug-Anzeige
# und die großen Texte. Zwischen den beiden Ebenen ist Platz für die Puppe der
# Figur (puppeEinhaengen). Gezeichnet wird in Bildpixeln (768 × 448,
# Faktor 2 gegenüber den Spielpixeln, E25) über DarstellungZeichner.
#
# Schleife: _physics_process (60 Ticks je Sekunde, höchstens 4 je Bild;
# project.godot, E13) führt je Tick einen Logikschritt aus (sitzung.tick, nicht
# in der Pause) mit dem Tastenstand zu Beginn des Ticks; _process liest nur und
# löst das Neuzeichnen aus (queue_redraw). Tasten über _input
# (DarstellungTastatur), unabhängig von der Maus.
#
# Tasten (docs/scheibe.md): Pfeile = L R O U, Y oder Z = A, X = S, P Pause,
# N Einzelschritt in der Pause, F1 Debug, F2 Eingabeaufzeichnung (Datei nach
# user://aufzeichnung_<seed>.txt), F3 Neustart mit Seed + 1.
#
# Kommandozeile (nach „--“):
#   --seed N          Seed des Spielstarts (Standard 1)
#   --debug           Debug-Anzeige von Beginn an
#   --szene <datei>   Prüfszene statt Spielstart (Pfad ab Repo-Wurzel)
#   --eingabe <datei> Eingabedatei statt Tastatur (mit --szene deren Szene,
#                     sonst ab Spielstart; Seed aus „# seed=N“ der Datei,
#                     wenn --seed fehlt); nach endframe hält die Schleife an
#   --schritte N      führt vor dem ersten Bild N Logikschritte aus und pausiert
#   --pause           beginnt in der Pause
#   --ende            beendet nach dem ersten gezeichneten Bild
extends Node2D

## Ordner der Stage-Dateien, relativ zu res:// (liegt außerhalb des
## Godot-Projekts; im Export später mit kopieren, dann hier ändern).
const STAGE_ORDNER: String = "../spiel/daten/stages"
## Aufzeichnungen der Eingabe (F2) im Nutzerordner.
const AUFZEICHNUNG_PFAD: String = "user://aufzeichnung_%d.txt"


## Eine Zeichenebene: ein Node2D, der in _draw den Rückruf aufruft.
class Ebene extends Node2D:
	var zeichne: Callable = Callable()

	func _draw() -> void:
		if zeichne.is_valid():
			zeichne.call()


var sitzung: DarstellungSitzung = null
## Argumente statt der Kommandozeile (Dictionary wie parseArgumente; Werkzeuge
## wie werkzeuge/foto.gd setzen sie vor add_child), sonst null
var argumente: Variant = null
## Takt aus: Tests und Fotos treiben die Sitzung selbst
var automatisch: bool = true
## Körper der Figur kommt von außen (Puppe), siehe puppeEinhaengen
var figur_extern: bool = false

var _hinten: Ebene = null
var _vorn: Ebene = null
var _zn_hinten: DarstellungZeichner = null
var _zn_vorn: DarstellungZeichner = null
var _puppe: Node2D = null
var _hinweis: String = ""
var _hinweis_rest: int = 0
var _beenden: bool = false
var _gezeichnet: int = 0
var _bilder: int = 0


# ===========================================================================
# Start
# ===========================================================================

## Repo-Wurzelverzeichnis (der Ordner über godot/).
static func wurzel() -> String:
	return ProjectSettings.globalize_path("res://").path_join("..").simplify_path()


## Pfad absolut machen: relative Pfade ab der Repo-Wurzel.
static func absolut(pfad: String) -> String:
	if pfad.is_absolute_path():
		return pfad.simplify_path()
	return wurzel().path_join(pfad).simplify_path()


## Liest eine Textdatei als UTF-8; null, wenn es sie nicht gibt.
static func lesen(pfad: String) -> Variant:
	if not FileAccess.file_exists(pfad):
		return null
	return FileAccess.get_file_as_string(pfad)


## Stage-Datei einer Bühne (Welt 2.3) aus STAGE_ORDNER; leer bei einem Fehler.
static func stageLaden(buehne: String) -> String:
	var muster: RegEx = RegEx.new()
	muster.compile("^[a-z0-9_]+$")
	if muster.search(buehne) == null:
		push_error("Bühnenname „%s“ ungültig" % buehne)
		return ""
	var pfad: String = ProjectSettings.globalize_path("res://").path_join(STAGE_ORDNER).path_join("%s.txt" % buehne).simplify_path()
	var text: Variant = lesen(pfad)
	if text == null:
		push_error("Stage-Datei %s nicht gefunden" % pfad)
		return ""
	return text as String


## Kommandozeilenargumente (nach „--“) in ein Dictionary:
## seed (int, 0 = nicht angegeben), debug, szene, eingabe, schritte (−1 = nicht
## angegeben), pause, ende, fehler (leer oder Meldung).
static func parseArgumente(argv: PackedStringArray) -> Dictionary:
	var a: Dictionary = {"seed": 0, "debug": false, "szene": "", "eingabe": "", "schritte": -1, "pause": false, "ende": false, "fehler": ""}
	var i: int = 0
	while i < argv.size():
		var name: String = argv[i]
		match name:
			"--debug":
				a["debug"] = true
			"--pause":
				a["pause"] = true
			"--ende":
				a["ende"] = true
			"--seed", "--schritte", "--szene", "--eingabe":
				if i + 1 >= argv.size() or argv[i + 1].begins_with("--"):
					a["fehler"] = "Argument %s ohne Wert" % name
					return a
				var wert: String = argv[i + 1]
				i += 1
				if name == "--seed":
					if not wert.is_valid_int() or wert.to_int() <= 0 or wert.to_int() > DarstellungSitzung.SEED_MAX:
						a["fehler"] = "Seed „%s“ ungültig (1 bis %d)" % [wert, DarstellungSitzung.SEED_MAX]
						return a
					a["seed"] = wert.to_int()
				elif name == "--schritte":
					if not wert.is_valid_int() or wert.to_int() < 0:
						a["fehler"] = "Schrittzahl „%s“ ungültig" % wert
						return a
					a["schritte"] = wert.to_int()
				elif name == "--szene":
					a["szene"] = wert
				else:
					a["eingabe"] = wert
			_:
				a["fehler"] = "unerwartetes Argument „%s“" % name
				return a
		i += 1
	return a


## Legt die Sitzung nach den Argumenten an (siehe parseArgumente); false bei
## einem Fehler (Meldung auf der Fehlerausgabe).
func starte(a: Dictionary) -> bool:
	if (a["fehler"] as String) != "":
		printerr("Start abgebrochen: %s" % a["fehler"])
		return false
	var scheibe: String = stageLaden(DarstellungSitzung.BUEHNE)
	if scheibe == "":
		return false
	var seed_wert: int = a["seed"] if (a["seed"] as int) != 0 else DarstellungSitzung.SEED_STANDARD
	sitzung = DarstellungSitzung.new(scheibe, seed_wert)
	var eingabe_text: String = ""
	if (a["eingabe"] as String) != "":
		var et: Variant = lesen(absolut(a["eingabe"] as String))
		if et == null:
			printerr("Start abgebrochen: Eingabedatei %s nicht gefunden" % absolut(a["eingabe"] as String))
			return false
		eingabe_text = et as String
	if (a["szene"] as String) != "":
		var st: Variant = lesen(absolut(a["szene"] as String))
		if st == null:
			printerr("Start abgebrochen: Szenendatei %s nicht gefunden" % absolut(a["szene"] as String))
			return false
		var start: KernStart.Pruefstart = PruefSzene.parseSzene(st as String)
		var stage_text: String = stageLaden(start.buehne)
		if stage_text == "":
			return false
		sitzung.ladeSzene(start, stage_text, eingabe_text)
	elif (a["eingabe"] as String) != "":
		sitzung.ladeEingabe(eingabe_text, a["seed"] as int)
	sitzung.debug = a["debug"]
	sitzung.pause = a["pause"]
	_beenden = a["ende"]
	if (a["schritte"] as int) >= 0:
		# N Logikschritte vor dem ersten Bild, danach Pause
		sitzung.pause = false
		sitzung.schritte_max = a["schritte"]
		if sitzung.welt.frame >= sitzung.schritte_max:
			sitzung.pause = true
		while not sitzung.pause and not sitzung.amEnde():
			sitzung.tick()
		sitzung.pause = true
	return true


func _ready() -> void:
	var a: Dictionary = parseArgumente(OS.get_cmdline_user_args()) if argumente == null else argumente
	if not starte(a):
		get_tree().quit(1)
		return
	_ebenenAnlegen()


## Legt die beiden Zeichenebenen an (Hinten, Vorn).
func _ebenenAnlegen() -> void:
	_hinten = Ebene.new()
	_hinten.name = "Hinten"
	_vorn = Ebene.new()
	_vorn.name = "Vorn"
	add_child(_hinten)
	add_child(_vorn)
	_zn_hinten = DarstellungZeichner.new(_hinten)
	_zn_vorn = DarstellungZeichner.new(_vorn)
	_hinten.zeichne = Callable(self, "_zeichneHinten")
	_vorn.zeichne = Callable(self, "_zeichneVorn")


## Hängt die Puppe der Figur zwischen die beiden Ebenen; ab dann zeichnet die
## Darstellung den Körper der Figur nicht mehr selbst (nur ihren Schatten). Die
## Puppe setzt ihre Lage aus DarstellungZeichnen.figurFuss(sitzung.welt).
func puppeEinhaengen(puppe: Node2D) -> void:
	_puppe = puppe
	figur_extern = true
	add_child(puppe)
	move_child(puppe, _vorn.get_index())


# ===========================================================================
# Schleife
# ===========================================================================

## Ein Logikschritt je Tick (nicht in der Pause), Tastenstand zu Beginn des Ticks.
func _physics_process(_delta: float) -> void:
	if automatisch and sitzung != null:
		sitzung.tick()


## Die Darstellung liest nur: Aufzeichnungen ablegen, Neuzeichnen anstoßen.
func _process(_delta: float) -> void:
	if sitzung == null:
		return
	_bilder += 1
	for f: Dictionary in sitzung.nimmAufzeichnungen():
		_aufzeichnungSpeichern(f["seed"] as int, f["text"] as String)
	if _hinweis_rest > 0:
		_hinweis_rest -= 1
		if _hinweis_rest == 0:
			_hinweis = ""
	_hinten.queue_redraw()
	_vorn.queue_redraw()
	if _beenden and (_gezeichnet >= 1 or _bilder >= 5):
		_ende()


func _ende() -> void:
	var w: KernWelt = sitzung.welt
	print("ende: frame=%d seed=%d quelle=%s pause=%s beendet=%s" % [w.frame, sitzung.seed_wert, sitzung.quelle(), str(sitzung.pause), str(sitzung.amEnde())])
	_beenden = false
	get_tree().quit(0)


func _input(e: InputEvent) -> void:
	if sitzung != null and sitzung.tastatur.eingabe(e):
		get_viewport().set_input_as_handled()


func _notification(was: int) -> void:
	if was == NOTIFICATION_WM_WINDOW_FOCUS_OUT or was == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if sitzung != null:
			sitzung.tastatur.loslassen()


## Schreibt eine Eingabeaufzeichnung (F2) nach user://aufzeichnung_<seed>.txt
## und zeigt den Pfad als Hinweis an.
func _aufzeichnungSpeichern(seed_wert: int, text: String) -> void:
	var pfad: String = AUFZEICHNUNG_PFAD % seed_wert
	var datei: FileAccess = FileAccess.open(pfad, FileAccess.WRITE)
	if datei == null:
		_hinweisSetzen("AUFZEICHNUNG NICHT GESPEICHERT (FEHLER %d)" % FileAccess.get_open_error())
		return
	datei.store_string(text)
	datei.close()
	var echt: String = ProjectSettings.globalize_path(pfad)
	print("Aufzeichnung gespeichert: %s" % echt)
	_hinweisSetzen("AUFZEICHNUNG GESPEICHERT: %s" % echt)


func _hinweisSetzen(text: String) -> void:
	_hinweis = text
	_hinweis_rest = DarstellungMasse.HINWEIS["dauer"]


# ===========================================================================
# Zeichnen (nur lesen)
# ===========================================================================

func _zeichneHinten() -> void:
	DarstellungZeichnen.zeichneBildHinten(_zn_hinten, sitzung.welt, figur_extern)


func _zeichneVorn() -> void:
	var welt: KernWelt = sitzung.welt
	var a: KernRahmen.AnzeigeDaten = DarstellungZeichnen.zeichneBildVorn(_zn_vorn, welt, figur_extern)
	if sitzung.debug:
		DarstellungDebug.zeichneDebugWelt(_zn_vorn, welt)
		DarstellungDebug.zeichneDebugText(_zn_vorn, welt, sitzung.debugInfo())
	DarstellungZeichnen.zeichneObersteEbene(_zn_vorn, a, sitzung.ansicht(_hinweis))
	_gezeichnet += 1
