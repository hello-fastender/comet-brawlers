## Gegner aus Video-Clips (Weg wie DarstellungVelaFrames, Ordner `res://grafik/<figur>_video/<clip>/`): je Gegnerplatz
## ein DarstellungVelaFrames-Node, der das zum Zustand des Gegners passende Bild zeigt. Die Clips sind in
## DarstellungVelaFrames unter dem Namen `<figur>_<clip>` registriert (clip_registrieren), so gelten Laden,
## Speicherbudget, Maßstab und Anker unverändert. Der Node liest die Welt nur.
##
## Stand 2026-10-18: einzige Figur ist Darja (`darja`, docs/grok-prompts-darja.md) mit dem Clip `stand`; sie steht
## vorläufig für den Gegnertyp Bolzer (FIGUR_JE_TYP), bis das Design die Rolle festlegt. Zuordnung Zustand → Clip:
##   Form „stand“ (DarstellungZeichnen.gegnerForm: nicht liegend, nicht hockend) und Aktion STAND, ANKUENDIGUNG, GEHEN
##   oder NACHLAUF (Modi WARTEN mit Auftritt, ANNAEHERN, KAMPFHALTUNG, NACHLAUF, FREI …)   stand (Schleife, Echtzeit)
##   alles andere (AUFTRITT, ANGRIFF, GETROFFEN, UMGEWORFEN, LIEGEN, AUFSTEHEN, GEHALTEN, TOT)  kein Clip (Platzhalter)
## GEHEN und NACHLAUF zeigen vorerst den Stand, bis ein Gehzyklus vorliegt (docs/grok-prompts-darja.md, Abschnitt 5).
class_name DarstellungGegnerFrames
extends Node2D

## Gegnertyp → Figur, deren Clips ihn zeigen.
const FIGUR_JE_TYP: Dictionary = {"Bolzer": "darja"}
## Figur → Clips, die es gibt (Ordner res://grafik/<figur>_video/<clip>/).
const CLIPS_JE_FIGUR: Dictionary = {"darja": ["stand"]}
## Aktionen, die der Clip `stand` abdeckt.
const STAND_AKTIONEN: Array[String] = ["STAND", "ANKUENDIGUNG", "GEHEN", "NACHLAUF"]

## Gegnerplätze (Index in welt.gegner), die gerade ein Clip zeigt; DarstellungZeichnen lässt für sie den Körper weg.
static var extern: Dictionary = {}

var _nodes: Array[DarstellungVelaFrames] = []


func _init() -> void:
	name = "GegnerFrames"


## Registriert alle Clips aller Figuren einmal. Rückgabe: true, wenn mindestens ein Clip lesbar ist.
static func registrieren() -> bool:
	var einer: bool = false
	for figur: String in CLIPS_JE_FIGUR:
		for clip: String in CLIPS_JE_FIGUR[figur]:
			var name: String = figur + "_" + clip
			if not DarstellungVelaFrames.clip_daten(name).is_empty():
				einer = true
			elif DarstellungVelaFrames.clip_registrieren(name, "res://grafik/%s_video/%s/" % [figur, clip]):
				einer = true
	return einer


## Gibt es für mindestens eine Figur einen Clip?
static func bereit() -> bool:
	return registrieren()


## Welcher Clip (voller Name) zeigt den Gegner, oder "" (Platzhalter). Reine Funktion.
static func clip_fuer(g: KernEntitaeten.Gegner) -> String:
	if not FIGUR_JE_TYP.has(g.typ):
		return ""
	var figur: String = FIGUR_JE_TYP[g.typ]
	if DarstellungZeichnen.gegnerForm(g) != "stand" or not STAND_AKTIONEN.has(g.aktion):
		return ""
	if not (CLIPS_JE_FIGUR[figur] as Array).has("stand"):
		return ""
	return figur + "_stand"


## Bildindex (0-basiert) zum Clip und Weltframe: der Stand läuft als Schleife in Echtzeit, hin und her bei
## schleife=pingpong (wie Velas stand in DarstellungVelaFramesTabelle).
static func bildindex(clip: String, d: Dictionary, frame: int) -> int:
	var n: int = DarstellungVelaFramesTabelle.zyklus_laenge(d)
	var ticks: int = DarstellungVelaFramesTabelle.zyklus_ticks(clip, d)
	var start: int = int(d["zyklus_start"])
	var uhr: int = maxi(frame, 1)
	if String(d.get("schleife", "")) == "pingpong":
		return DarstellungVelaFramesTabelle.hin_und_her(uhr, ticks, start, n)
	return DarstellungVelaFramesTabelle.schleife(uhr, ticks, start, n)


## Setzt alle Nodes nach der Welt: Lage (Fußpunkt in Bildpixeln wie bei der Figur), Bild und Blick; füllt `extern`.
## Nicht sichtbare Gegner und solche ohne Clip verstecken ihren Node.
func aus_welt(welt: KernWelt) -> void:
	extern.clear()
	var k: DarstellungZeichnen.Kamera = DarstellungZeichnen.kameraVon(welt)
	for i in range(welt.gegner.size()):
		var g: KernEntitaeten.Gegner = welt.gegner[i]
		var node: DarstellungVelaFrames = _node(i)
		var clip: String = clip_fuer(g) if DarstellungZeichnen.gegnerSichtbar(welt, g) else ""
		if clip == "":
			node.visible = false
			continue
		var d: Dictionary = DarstellungVelaFrames.clip_daten(clip)
		if d.is_empty():
			node.visible = false
			continue
		if DarstellungVelaFrames.nachladen and not DarstellungVelaFrames.ist_bereit(clip):
			DarstellungVelaFrames.vormerken(clip)
			node.visible = false
			continue
		if not node.aus_clip_bild(clip, bildindex(clip, d, welt.frame), g.blick):
			continue
		var l: DarstellungZeichnen.Lage = DarstellungZeichnen.lageVon(k, g)
		node.position = Vector2(
			float(l.x + welt.kamera.schuetteln_x) * DarstellungMasse.DARSTELLUNG + DarstellungMasse.DARSTELLUNG * 0.5,
			float(l.fuss + welt.kamera.schuetteln_y) * DarstellungMasse.DARSTELLUNG
		)
		# Tiefe wie DarstellungZeichnen.stueckVor: hinten zuerst (⌊z⌋ absteigend), bei gleicher Tiefe Gegner vor der Figur.
		# Dieser Node liegt auf z_index 0 nach der Ebene Hinten, die Figur auf 1, die Ebene Vorn auf 30: ein Gegner hinter
		# der Figur bekommt 0 (über dem Hintergrund, unter der Figur), einer davor 2 (über der Figur, unter Vorn). Objekte
		# zwischen Gegner und Figur ordnet das nur näherungsweise.
		var fz: int = KernFestkomma.ganz(welt.figur.z)
		var gz: int = KernFestkomma.ganz(g.z)
		node.z_index = 0 if gz >= fz else 2
		extern[i] = true


func _node(i: int) -> DarstellungVelaFrames:
	while _nodes.size() <= i:
		var n: DarstellungVelaFrames = DarstellungVelaFrames.new()
		n.name = "Gegner%d" % _nodes.size()
		n.visible = false
		add_child(n)
		_nodes.append(n)
	return _nodes[i]
