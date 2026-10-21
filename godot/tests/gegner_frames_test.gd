## Tests der Gegner-Clips (DarstellungGegnerFrames): Jede Aktion eines Gegnertyps mit Figur bekommt den erwarteten Clip,
## damit kein Platzhalter-Rechteck zwischen den gemalten Bildern erscheint. Anlass: Der Sprungtritt des Rammbocks heißt in
## der Logik SPRUNG und zeigte das Rechteck (2026-10-21).
class_name GegnerFramesTest
extends RefCounted

static var _geprueft: int = 0
static var _fehler: Array[String] = []


static func lauf() -> Dictionary:
	_geprueft = 0
	_fehler = []
	_zuordnung()
	return {"geprueft": _geprueft, "fehler": _fehler}


static func _gleich(ist: Variant, soll: Variant, name: String) -> void:
	_geprueft += 1
	if ist != soll:
		_fehler.append("%s: ist %s, soll %s" % [name, str(ist), str(soll)])


static func _gegner(typ: String, aktion: String, modus: String, code: String = "", auftritt: String = "") -> KernEntitaeten.Gegner:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerLeer(0)
	g.typ = typ
	g.aktion = aktion
	g.modus = modus
	g.angriff_code = code
	g.auftritt = auftritt
	return g


static func _zuordnung() -> void:
	# [Typ, Aktion, Modus, Angriffscode, Auftritt, erwarteter Clip]
	var faelle: Array = [
		["Rammbock", "STAND", "STAND", "", "", "vroni_stand"],
		["Rammbock", "GEHEN", "GEHEN", "", "", "vroni_gehen"],
		["Rammbock", "ANGRIFF", "ANGRIFF", "RA", "", "vroni_schlag"],
		["Rammbock", "ANGRIFF", "ANGRIFF", "RB", "", "vroni_schlag"],
		["Rammbock", "ANGRIFF", "ANGRIFF", "RU", "", "vroni_umwerfschlag"],
		["Rammbock", "SPRUNG", "ANGRIFF", "RS", "", "vroni_sprungtritt"],
		["Rammbock", "NACHLAUF", "NACHLAUF", "RS", "", "vroni_sprungtritt"],
		["Rammbock", "NACHLAUF", "NACHLAUF", "RU", "", "vroni_umwerfschlag"],
		["Rammbock", "GETROFFEN", "GETROFFEN", "", "", "vroni_getroffen"],
		["Rammbock", "UMGEWORFEN", "UMGEWORFEN", "", "", "vroni_umgeworfen"],
		["Rammbock", "LIEGEN", "LIEGEN", "", "", "vroni_liegen"],
		["Rammbock", "GEHALTEN", "GEHALTEN", "", "", "vroni_gehalten"],
		["Rammbock", "WARTEN", "WARTEN", "", "hocke", "vroni_hocke"],
		["Rammbock", "AUFTRITT", "AUFTRITT", "", "hocke", "vroni_auftritt"],
		["Rammbock", "SPOTT", "SPOTT", "", "", "vroni_spott"],
		["Bolzer", "ANGRIFF", "ANGRIFF", "BUA", "", "darja_schlag"],
		["Bolzer", "SPRUNG", "ANGRIFF", "RS", "", "darja_schlag"],
	]
	for f: Array in faelle:
		var g: KernEntitaeten.Gegner = _gegner(f[0], f[1], f[2], f[3], f[4])
		_gleich(DarstellungGegnerFrames.clip_fuer(g), f[5], "%s %s %s" % [f[0], f[1], f[3]])
	# jeder Clip in CLIPS_JE_FIGUR liegt als Ordner mit clip.txt vor
	for figur: String in DarstellungGegnerFrames.CLIPS_JE_FIGUR:
		for clip: String in DarstellungGegnerFrames.CLIPS_JE_FIGUR[figur]:
			var pfad: String = "res://grafik/%s_video/%s/clip.txt" % [figur, clip]
			_gleich(FileAccess.file_exists(pfad), true, pfad)
