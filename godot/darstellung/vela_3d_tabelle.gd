## Zuordnung Aktion/Aktionsuhr der Logik → Clip und Zeit der 3D-Vela (Versuch „Vela in 3D“, docs/dreid-vela.md).
##
## Die Logik bleibt Taktgeber, wie bei den gemalten Clips (DarstellungVelaFramesTabelle): `f.uhr` wird auf einen Zeitpunkt des
## Clips abgebildet. Die Tabelle der gemalten Clips (welche Aktion welchen Clip zeigt, welches Bild zu welcher Uhr gehört, Blick)
## gilt unverändert; die Clipdaten der 3D-Clips (`grafik/vela_3d/clips/<name>.txt`, geschrieben von werkzeuge/dreid_bauen.gd) haben
## dasselbe Format, aber die Zeiteinheit 1/EINHEIT s statt Bildnummern. Der „Bildindex“ der gemalten Tabelle ist hier also eine Zeit
## in 1/240 s; `zeit` rechnet sie in Sekunden um. Reine Funktionen, kein Zustand außer dem Zwischenspeicher der Clipdaten.
##
## Abgedeckt sind die Aktionen, für die es einen 3D-Clip gibt (STAND, LAUF, SPRINT, SCHLAG/LEERSCHLAG 1 bis 4, SPRUNG, LANDUNG,
## GETROFFEN, UMGEWORFEN, TOT, LIEGEN, AUFSTEHEN); für GRIFF, WURF, SPRUNGANGRIFF und alle übrigen zeigt das Spiel die gemalte
## Vela, die Puppe oder den Platzhalter (Rückfall in spiel.gd).
class_name DarstellungVela3DTabelle
extends RefCounted

const ORDNER: String = "res://grafik/vela_3d/"
## Zeiteinheit der Clipdaten (1/EINHEIT s), wie in werkzeuge/dreid_bauen.gd.
const EINHEIT: int = 240
## Clips, bei denen die Figur in der Luft ist: die Höhe der Füße über dem Boden liefert die Logik, nicht der Clip.
const LUFT_ARTEN: Array[String] = ["sprung", "tritt", "landung"]

static var _daten: Dictionary = {}
static var _fehlt: Dictionary = {}
## Clips, die ein Test oder Werkzeug an Stelle der Dateien einsetzt: Name → Clipdaten.
static var _ersatz: Dictionary = {}


## Clipdaten (Dictionary wie DarstellungVelaFramesTabelle.clip_lesen) oder leer, wenn es den 3D-Clip nicht gibt.
static func clip_daten(clip: String) -> Dictionary:
	if _ersatz.has(clip):
		return _ersatz[clip]
	if _daten.has(clip):
		return _daten[clip]
	if _fehlt.has(clip):
		return {}
	var text: String = FileAccess.get_file_as_string(ORDNER + "clips/" + clip + ".txt")
	var d: Dictionary = {}
	if text != "":
		d = DarstellungVelaFramesTabelle.clip_lesen(text)
		if d.is_empty() or int(d["bilder"]) < 1:
			d = {}
	if d.is_empty():
		_fehlt[clip] = true
		return {}
	_daten[clip] = d
	return d


## Vergisst die gelesenen Clipdaten und alle Ersatzclips (Tests).
static func vergessen() -> void:
	_daten.clear()
	_fehlt.clear()
	_ersatz.clear()


## Setzt für einen Clip Clipdaten ein (Tests); leere Daten entfernen den Ersatz.
static func ersatz_setzen(clip: String, d: Dictionary) -> void:
	if d.is_empty():
		_ersatz.erase(clip)
	else:
		_ersatz[clip] = d


## Zuordnung Zustand der Figur → Clip, Zeitgrößen und Blick wie in DarstellungVelaFramesTabelle.wahl; leer, wenn kein 3D-Clip
## vorgesehen ist (Rückfall auf die gemalte Vela, Puppe oder Platzhalter).
static func wahl(f: KernEntitaeten.Figur, welt: KernWelt = null) -> Dictionary:
	var w: Dictionary = DarstellungVelaFramesTabelle.wahl(f, welt)
	if w.is_empty() or clip_daten(String(w["clip"])).is_empty():
		return {}
	return w


## Ist für den Zustand der Figur ein 3D-Clip vorgesehen und lesbar?
static func abgedeckt(f: KernEntitaeten.Figur, welt: KernWelt = null) -> bool:
	return not wahl(f, welt).is_empty()


## Zeit im Clip in Sekunden zu einer Wahl (Ergebnis von `wahl`).
static func zeit(w: Dictionary) -> float:
	var d: Dictionary = clip_daten(String(w["clip"]))
	return float(DarstellungVelaFramesTabelle.bildindex_wahl(w, d)) / float(EINHEIT)


## Befindet sich die Figur in diesem Clip in der Luft (die Höhe kommt aus der Logik, nicht aus dem Clip)?
static func in_der_luft(w: Dictionary) -> bool:
	return LUFT_ARTEN.has(String(w["art"]))
