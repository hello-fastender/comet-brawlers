# Prüflauf auf der Kommandozeile (Kampf 11.2, 11.6; Auftrag 3, 2.4;
# Auftrag 6, 3.3). Port von spiel/src/pruef/lauf.ts:
#
#   godot --headless --path godot --script res://pruef/lauf.gd -- --szene <datei> --eingabe <datei> --aus <ordner> [--stages <ordner>]
#
# Liest Szene und Eingabedatei, lädt die Stage aus spiel/daten/stages/<buehne>.txt
# (oder --stages), läuft bis endframe, schreibt protokoll.csv und objekte.csv
# nach --aus und gibt beide MD5 aus. Ohne --eingabe läuft er ohne Tasten.
# Relative Pfade gelten ab dem Repo-Wurzelverzeichnis; absolute Pfade bleiben.
# Exit-Code 1 bei Fehlern.
extends SceneTree


## Repo-Wurzelverzeichnis (der Ordner über godot/).
func _wurzel() -> String:
	return ProjectSettings.globalize_path("res://").path_join("..").simplify_path()


## Pfad absolut machen: relative Pfade ab der Repo-Wurzel.
func _absolut(pfad: String) -> String:
	if pfad.is_absolute_path():
		return pfad.simplify_path()
	return _wurzel().path_join(pfad).simplify_path()


## Liest eine Textdatei als UTF-8; null, wenn es sie nicht gibt.
func _lesen(pfad: String) -> Variant:
	if not FileAccess.file_exists(pfad):
		return null
	return FileAccess.get_file_as_string(pfad)


func _schreiben(pfad: String, text: String) -> bool:
	var datei: FileAccess = FileAccess.open(pfad, FileAccess.WRITE)
	if datei == null:
		return false
	datei.store_string(text)
	datei.close()
	return true


## Liest die Stage-Datei einer Bühne aus einem Ordner.
func _stageAusOrdner(ordner: String) -> Callable:
	return func(buehne: String) -> String:
		var muster: RegEx = RegEx.new()
		muster.compile("^[a-z0-9_]+$")
		if muster.search(buehne) == null:
			push_error("Bühnenname „%s“ ungültig" % buehne)
			return ""
		var text: Variant = _lesen(ordner.path_join("%s.txt" % buehne))
		if text == null:
			push_error("Stage-Datei für Bühne „%s“ nicht gefunden in %s" % [buehne, ordner])
			return ""
		return text as String


## Argumente --name wert → Dictionary; Fehler: Dictionary mit Schlüssel "fehler".
func _argumente(argv: PackedStringArray) -> Dictionary:
	var a: Dictionary = {}
	var i: int = 0
	while i < argv.size():
		var name: String = argv[i]
		if not name.begins_with("--"):
			return {"fehler": "unerwartetes Argument „%s“" % name}
		if i + 1 >= argv.size() or argv[i + 1].begins_with("--"):
			return {"fehler": "Argument %s ohne Wert" % name}
		a[name.substr(2)] = argv[i + 1]
		i += 2
	return a


func _haupt() -> int:
	var a: Dictionary = _argumente(OS.get_cmdline_user_args())
	if a.has("fehler"):
		printerr("Prüflauf abgebrochen: %s" % a["fehler"])
		return 1
	if not a.has("szene") or not a.has("aus"):
		printerr("Prüflauf abgebrochen: Aufruf: lauf.gd -- --szene <datei> --eingabe <datei> --aus <ordner> [--stages <ordner>]")
		return 1
	var szene_pfad: String = _absolut(a["szene"] as String)
	var szene_text: Variant = _lesen(szene_pfad)
	if szene_text == null:
		printerr("Prüflauf abgebrochen: Szenendatei %s nicht gefunden" % szene_pfad)
		return 1
	var eingabe_text: String = ""
	if a.has("eingabe"):
		var eingabe_pfad: String = _absolut(a["eingabe"] as String)
		var et: Variant = _lesen(eingabe_pfad)
		if et == null:
			printerr("Prüflauf abgebrochen: Eingabedatei %s nicht gefunden" % eingabe_pfad)
			return 1
		eingabe_text = et as String
	var stage_ordner: String = _wurzel().path_join("spiel/daten/stages").simplify_path()
	if a.has("stages"):
		stage_ordner = _absolut(a["stages"] as String)
	var eingang: PruefPruefung.PruefEingang = PruefPruefung.PruefEingang.new()
	eingang.szeneText = szene_text as String
	eingang.eingabeText = eingabe_text
	eingang.stageText = _stageAusOrdner(stage_ordner)
	eingang.md5 = Callable(PruefPruefung, "md5Text")
	var ergebnis: PruefPruefung.PruefErgebnis = PruefPruefung.pruefLauf(eingang)
	if ergebnis == null:
		printerr("Prüflauf abgebrochen: der Lauf lieferte kein Ergebnis (Skriptfehler)")
		return 1
	var aus: String = _absolut(a["aus"] as String)
	var fehler: Error = DirAccess.make_dir_recursive_absolute(aus)
	if fehler != OK:
		printerr("Prüflauf abgebrochen: Ordner %s nicht anlegbar (Fehler %d)" % [aus, fehler])
		return 1
	if not _schreiben(aus.path_join("protokoll.csv"), ergebnis.protokoll):
		printerr("Prüflauf abgebrochen: protokoll.csv nicht schreibbar")
		return 1
	if not _schreiben(aus.path_join("objekte.csv"), ergebnis.objekte):
		printerr("Prüflauf abgebrochen: objekte.csv nicht schreibbar")
		return 1
	print("protokoll.csv %s" % ergebnis.protokoll.md5_text())
	print("objekte.csv %s" % ergebnis.objekte.md5_text())
	return 0


func _init() -> void:
	quit(_haupt())
