## Gegner aus Video-Clips (Weg wie DarstellungVelaFrames, Ordner `res://grafik/<figur>_video/<clip>/`): je Gegnerplatz
## ein DarstellungVelaFrames-Node, der das zum Zustand des Gegners passende Bild zeigt. Die Clips sind in
## DarstellungVelaFrames unter dem Namen `<figur>_<clip>` registriert (clip_registrieren), so gelten Laden,
## Speicherbudget, Maßstab und Anker unverändert. Der Node liest die Welt nur.
##
## Stand 2026-10-18: einzige Figur ist Darja (`darja`, docs/grok-prompts-darja.md) mit den Clips `stand` und `gehen`; sie
## steht vorläufig für den Gegnertyp Bolzer (FIGUR_JE_TYP), bis das Design die Rolle festlegt. Zuordnung Zustand → Clip:
##   Form „stand“ (DarstellungZeichnen.gegnerForm: nicht liegend, nicht hockend) und
##     Aktion GEHEN oder NACHLAUF                             gehen (Schleife über welt.frame mit zyklus_ticks des Clips;
##                                                            die Gehstufe des Gegners bleibt unberücksichtigt: bei langsamem
##                                                            Gehen rutschen die Füße etwas)
##     Aktion STAND oder ANKUENDIGUNG                         stand (Schleife hin und her, Echtzeit)
##     Aktion ANGRIFF (Modus ANGRIFF, Bolzer-Code B…)           schlag (Handballenstoß; Bilder nach der Angriffsuhr, siehe bildindex)
##     Aktion NACHLAUF nach einem Bolzer-Angriff                schlag rückwärts (Rückkehr in die Haltung)
##   alles andere (AUFTRITT, GETROFFEN, UMGEWORFEN, LIEGEN, AUFSTEHEN, GEHALTEN, TOT)  kein Clip (Platzhalter)
class_name DarstellungGegnerFrames
extends Node2D

## Gegnertyp → Figur, deren Clips ihn zeigen.
const FIGUR_JE_TYP: Dictionary = {"Bolzer": "darja"}
## Figur → Clips, die es gibt (Ordner res://grafik/<figur>_video/<clip>/).
const CLIPS_JE_FIGUR: Dictionary = {"darja": ["stand", "gehen", "schlag"]}
## Aktionen, die der Clip `stand` abdeckt, und Aktionen, die `gehen` abdeckt (ohne Gehclip zeigt sie `stand`).
const STAND_AKTIONEN: Array[String] = ["STAND", "ANKUENDIGUNG", "GEHEN", "NACHLAUF"]
const GEHEN_AKTIONEN: Array[String] = ["GEHEN", "NACHLAUF"]

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
	if DarstellungZeichnen.gegnerForm(g) != "stand":
		return ""
	var clips: Array = CLIPS_JE_FIGUR[figur]
	if g.aktion == "ANGRIFF" and g.modus == "ANGRIFF" and clips.has("schlag") and g.angriff_code.begins_with("B"):
		return figur + "_schlag"
	if g.aktion == "NACHLAUF" and clips.has("schlag") and g.angriff_code.begins_with("B"):
		return figur + "_schlag"
	if not STAND_AKTIONEN.has(g.aktion):
		return ""
	if GEHEN_AKTIONEN.has(g.aktion) and clips.has("gehen"):
		return figur + "_gehen"
	if not clips.has("stand"):
		return ""
	return figur + "_stand"


## Bildindex (0-basiert) zu Clip, Clipdaten, Gegner und Welt. Reine Funktion.
##   stand, gehen: Schleife über welt.frame (stand hin und her bei schleife=pingpong, gehen mit zyklus_ticks des Clips).
##   schlag im Modus ANGRIFF: rel = Frames seit Angriffsbeginn (angriff_a); vor aktiv_von laufen die Bilder 0 bis kontakt − 1
##     gleichmäßig über die Startframes, im Trefferfenster (aktiv_von bis aktiv_bis, KernWerte.NAH_ANGRIFFE) steht das
##     Kontaktbild, danach rueckzug.
##   schlag im Nachlauf (NACHLAUF nach einem Bolzer-Angriff): Rückkehr rückwärts von rueckzug nach Bild 0 über die Dauer
##     des Nachlaufs (angriff_aktiv_ende bis nachlauf_ende), wie rueckkehr=rueckwaerts der Vela-Tabelle.
static func bildindex(clip: String, d: Dictionary, g: KernEntitaeten.Gegner, welt: KernWelt) -> int:
	var bilder: int = int(d["bilder"])
	if clip.ends_with("_schlag"):
		var kontakt: int = clampi(int(d.get("kontakt", 0)), 0, bilder - 1)
		var rueckzug: int = clampi(int(d.get("rueckzug", kontakt)), kontakt, bilder - 1)
		if g.modus == "ANGRIFF":
			var w: Dictionary = KernWerte.NAH_ANGRIFFE.get(g.angriff_code, {})
			var von: int = maxi(int(w.get("aktiv_von", 1)), 1)
			var bis: int = maxi(int(w.get("aktiv_bis", von)), von)
			var rel: int = maxi(welt.frame - g.angriff_a, 0)
			if rel < von:
				return clampi(rel * kontakt / von, 0, kontakt)
			if rel <= bis:
				return kontakt
			return rueckzug
		# Nachlauf: Rückkehr rückwärts
		var dauer: int = maxi(g.nachlauf_ende - g.angriff_aktiv_ende, 1)
		var u: int = clampi(welt.frame - g.angriff_aktiv_ende, 0, dauer)
		return clampi(rueckzug - u * rueckzug / dauer, 0, rueckzug)
	var n: int = DarstellungVelaFramesTabelle.zyklus_laenge(d)
	var ticks: int = DarstellungVelaFramesTabelle.zyklus_ticks(clip, d)
	var start: int = int(d["zyklus_start"])
	var uhr: int = maxi(welt.frame, 1)
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
		if not node.aus_clip_bild(clip, bildindex(clip, d, g, welt), g.blick):
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
