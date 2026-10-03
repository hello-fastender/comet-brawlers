# Hilfen für die Fehlersuche und die Tests: Pfade, Dateien lesen, zwei
# Protokolle (protokoll.csv oder objekte.csv) vergleichen und die erste
# abweichende Zeile samt Frame und Spaltenname melden.
# Genutzt von tests/vergleich.gd und tests/alle.gd. Gehört nicht zum Kern.
class_name VergleichHilfe
extends RefCounted

## Zahl der Zeilen vor der Abweichung, die der Bericht zeigt.
const ZEILEN_DAVOR: int = 5


## Repo-Wurzelverzeichnis (der Ordner über godot/), absolut.
static func wurzel() -> String:
	return ProjectSettings.globalize_path("res://").path_join("..").simplify_path()


## Pfad absolut machen: relative Pfade gelten ab der Repo-Wurzel.
static func absolut(pfad: String) -> String:
	if pfad.is_absolute_path():
		return pfad.simplify_path()
	return wurzel().path_join(pfad).simplify_path()


## Liest eine Textdatei (UTF-8, ohne Umbruchumwandlung); null, wenn es sie nicht gibt.
static func lesen(pfad: String) -> Variant:
	if not FileAccess.file_exists(pfad):
		return null
	return FileAccess.get_file_as_string(pfad)


## Liest die Bytes einer Datei; null, wenn es sie nicht gibt.
static func lesenBytes(pfad: String) -> Variant:
	if not FileAccess.file_exists(pfad):
		return null
	return FileAccess.get_file_as_bytes(pfad)


## Liest die Stage-Datei einer Bühne aus einem Ordner (Callable buehne → Text).
static func stageAusOrdner(ordner: String) -> Callable:
	return func(buehne: String) -> String:
		var muster: RegEx = RegEx.new()
		muster.compile("^[a-z0-9_]+$")
		if muster.search(buehne) == null:
			push_error("Bühnenname „%s“ ungültig" % buehne)
			return ""
		var text: Variant = lesen(ordner.path_join("%s.txt" % buehne))
		if text == null:
			push_error("Stage-Datei für Bühne „%s“ nicht gefunden in %s" % [buehne, ordner])
			return ""
		return text as String


## Index der Spaltenkopfzeile: die erste Zeile ohne führendes „#“; −1, wenn es keine gibt.
static func kopfIndex(zeilen: PackedStringArray) -> int:
	for i in range(zeilen.size()):
		if not zeilen[i].begins_with("#"):
			return i
	return -1


## Erste abweichende Zeile zweier Protokolltexte. Gleiche Texte: leeres Dictionary.
## Sonst die Schlüssel
##   zeile  (1-basiert), art ("inhalt", "spaltenzahl", "ist_kuerzer", "soll_kuerzer"),
##   frame  (Text der Spalte frame oder "-" im Kopf), spalte (Name oder "(Kopf)"),
##   ist, soll (Werte der abweichenden Spalte bzw. die ganze Kopfzeile),
##   davor  (Array von bis zu fünf Texten der Zeilen davor, je nur Frame und abweichende Spalte),
##   zeilen_ist, zeilen_soll (Zeilenzahlen).
static func erstesAbweichen(ist: String, soll: String) -> Dictionary:
	if ist == soll:
		return {}
	var il: PackedStringArray = ist.split("\n")
	var sl: PackedStringArray = soll.split("\n")
	var kopf: int = kopfIndex(sl)
	var spalten: PackedStringArray = PackedStringArray()
	if kopf >= 0:
		spalten = sl[kopf].split(",")
	var n: int = mini(il.size(), sl.size())
	var i: int = -1
	for k in range(n):
		if il[k] != sl[k]:
			i = k
			break
	var art: String = "inhalt"
	if i < 0:
		# gleiche Zeilen, aber verschieden lang (zum Beispiel ein fehlendes Zeilenende am Schluss)
		i = n
		art = "ist_kuerzer" if il.size() < sl.size() else "soll_kuerzer"
	var ist_zeile: String = il[i] if i < il.size() else ""
	var soll_zeile: String = sl[i] if i < sl.size() else ""
	var im_kopf: bool = ist_zeile.begins_with("#") or soll_zeile.begins_with("#") or i == kopf or kopf < 0
	var ergebnis: Dictionary = {
		"zeile": i + 1,
		"art": art,
		"frame": "-",
		"spalte": "(Kopf)",
		"ist": ist_zeile if i < il.size() else "(Zeile fehlt)",
		"soll": soll_zeile if i < sl.size() else "(Zeile fehlt)",
		"davor": [],
		"zeilen_ist": il.size(),
		"zeilen_soll": sl.size(),
	}
	var spalte_index: int = -1
	if not im_kopf and art == "inhalt":
		var fi: PackedStringArray = ist_zeile.split(",")
		var fs: PackedStringArray = soll_zeile.split(",")
		var m: int = maxi(fi.size(), fs.size())
		for j in range(m):
			var a: String = fi[j] if j < fi.size() else "(Feld fehlt)"
			var b: String = fs[j] if j < fs.size() else "(Feld fehlt)"
			if a != b:
				spalte_index = j
				ergebnis["spalte"] = spalten[j] if j < spalten.size() else "(Feld %d)" % (j + 1)
				ergebnis["ist"] = a
				ergebnis["soll"] = b
				break
		if fi.size() != fs.size():
			ergebnis["art"] = "spaltenzahl"
		ergebnis["frame"] = fs[0] if fs.size() > 0 else fi[0]
	elif not im_kopf:
		# Datenzeile fehlt auf einer Seite
		var vorhanden: PackedStringArray = (ist_zeile if i < il.size() else soll_zeile).split(",")
		ergebnis["frame"] = vorhanden[0]
		ergebnis["spalte"] = "(ganze Zeile)"
	var davor: Array = []
	for k in range(maxi(0, i - ZEILEN_DAVOR), i):
		var z: String = sl[k]
		if z.begins_with("#") or k == kopf or spalte_index < 0:
			davor.append("Zeile %d: %s" % [k + 1, _gekuerzt(z)])
		else:
			var f: PackedStringArray = z.split(",")
			var wert: String = f[spalte_index] if spalte_index < f.size() else "(Feld fehlt)"
			davor.append("Zeile %d: frame=%s %s=%s" % [k + 1, f[0], ergebnis["spalte"], wert])
	ergebnis["davor"] = davor
	return ergebnis


static func _gekuerzt(text: String) -> String:
	if text.length() > 160:
		return text.substr(0, 160) + " …"
	return text


## Meldung zur ersten Abweichung als Text; leer bei gleichen Texten.
static func bericht(ist: String, soll: String) -> String:
	var d: Dictionary = erstesAbweichen(ist, soll)
	if d.is_empty():
		return ""
	var zeilen: PackedStringArray = PackedStringArray()
	zeilen.append("erste abweichende Zeile %d (Frame %s), Spalte %s (%s)" % [d["zeile"], d["frame"], d["spalte"], d["art"]])
	zeilen.append("  ist:  %s" % _gekuerzt(d["ist"] as String))
	zeilen.append("  soll: %s" % _gekuerzt(d["soll"] as String))
	zeilen.append("  Zeilen: ist %d, soll %d" % [d["zeilen_ist"], d["zeilen_soll"]])
	var davor: Array = d["davor"]
	if not davor.is_empty():
		zeilen.append("  die Zeilen davor (soll, gleich im ist):")
		for z: String in davor:
			zeilen.append("    " + z)
	return "\n".join(zeilen)


## Meldung in einer Zeile für die Übersicht von alle.gd.
static func kurzbericht(ist: String, soll: String) -> String:
	var d: Dictionary = erstesAbweichen(ist, soll)
	if d.is_empty():
		return ""
	return "Zeile %d (Frame %s), Spalte %s: ist %s, soll %s" % [
		d["zeile"], d["frame"], d["spalte"], _gekuerzt(d["ist"] as String), _gekuerzt(d["soll"] as String)
	]
