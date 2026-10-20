## Gegner aus Video-Clips (Weg wie DarstellungVelaFrames, Ordner `res://grafik/<figur>_video/<clip>/`): je Gegnerplatz
## ein DarstellungVelaFrames-Node, der das zum Zustand des Gegners passende Bild zeigt. Die Clips sind in
## DarstellungVelaFrames unter dem Namen `<figur>_<clip>` registriert (clip_registrieren), so gelten Laden,
## Speicherbudget, Maßstab und Anker unverändert. Der Node liest die Welt nur.
##
## Stand 2026-10-20: Darja (`darja`, docs/grok-prompts-darja.md) steht vorläufig für den Gegnertyp Bolzer, Vroni
## (`vroni`, docs/grok-prompts-rammbock.md) für den Rammbock (FIGUR_JE_TYP). Zuordnung Aktion → Clip in clip_fuer, Bilder
## in bildindex:
##   STAND, ANKUENDIGUNG → stand; GEHEN, NACHLAUF ohne Angriff → gehen; ANGRIFF → Clip des Angriffscodes (ANGRIFF_CLIP,
##   ohne eigenen Clip schlag), NACHLAUF danach → derselbe Clip rückwärts (sprungtritt vorwärts bis zur Landung); GETROFFEN → getroffen; UMGEWORFEN, TOT → umgeworfen; LIEGEN → liegen; AUFSTEHEN → aufstehen;
##   GEHALTEN → gehalten; WARTEN hockend → hocke; AUFTRITT aus der Hocke → auftritt; SPOTT → spott (über SPOTT_DAUER).
##   Ohne Clip (Auftritt aus Versteck oder Rand, TAUMELN …) zeichnet die Darstellung den Platzhalter.
class_name DarstellungGegnerFrames
extends Node2D

## Gegnertyp → Figur, deren Clips ihn zeigen.
const FIGUR_JE_TYP: Dictionary = {"Bolzer": "darja", "Rammbock": "vroni"}
## Figur → Clips, die es gibt (Ordner res://grafik/<figur>_video/<clip>/).
const CLIPS_JE_FIGUR: Dictionary = {
	"darja": ["stand", "gehen", "schlag", "getroffen", "umgeworfen", "liegen", "aufstehen", "gehalten", "hocke", "auftritt", "spott"],
	"vroni": ["stand", "gehen", "schlag", "umwerfschlag", "sprungtritt", "getroffen", "umgeworfen", "liegen", "aufstehen",
		"gehalten", "hocke", "auftritt", "spott"],
}
## Angriffscode (docs/spezifikation-welt.md, 5.5) → Clip; fehlt der Clip bei der Figur, zeigt `schlag` den Angriff.
const ANGRIFF_CLIP: Dictionary = {"RU": "umwerfschlag", "RS": "sprungtritt"}
## Clips, die den Angriff nach der Angriffsuhr zeigen (bildindex).
const ANGRIFF_CLIPS: Array[String] = ["schlag", "umwerfschlag", "sprungtritt"]
## Aktionen, die der Clip `stand` abdeckt, und Aktionen, die `gehen` abdeckt (ohne Gehclip zeigt sie `stand`).
const STAND_AKTIONEN: Array[String] = ["STAND", "ANKUENDIGUNG", "GEHEN", "NACHLAUF"]
const GEHEN_AKTIONEN: Array[String] = ["GEHEN", "NACHLAUF"]
## Auftritt aus der Hocke je Typ: Frames bis kampffähig (docs/spezifikation-welt.md, 4.2; Darstellungswert, die Logik
## bleibt maßgeblich).
const AUFTRITT_HOCKE_DAUER: Dictionary = {"Bolzer": KernWerte.AUFTRITT_HOCKE_BOLZER, "Rammbock": KernWerte.AUFTRITT_HOCKE_RAMMBOCK}

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
	var clips: Array = CLIPS_JE_FIGUR[figur]
	var name: String = ""
	match g.aktion:
		"GEHALTEN":
			name = "gehalten"
		"UMGEWORFEN", "TOT":
			name = "umgeworfen"
		"LIEGEN":
			name = "liegen"
		"AUFSTEHEN":
			name = "aufstehen"
		"GETROFFEN":
			name = "getroffen"
		"WARTEN":
			if g.auftritt == "hocke" and DarstellungZeichnen.gegnerForm(g) == "hocke":
				name = "hocke"
		"AUFTRITT":
			if g.auftritt == "hocke":
				name = "auftritt"
		"ANGRIFF":
			if g.modus == "ANGRIFF" and _nahangriff(g.angriff_code):
				name = _angriff_clip(g.angriff_code, clips)
		"NACHLAUF":
			name = _angriff_clip(g.angriff_code, clips) if _nahangriff(g.angriff_code) else "gehen"
		"GEHEN":
			name = "gehen"
		"STAND", "ANKUENDIGUNG":
			name = "stand"
		"SPOTT":
			name = "spott"
	if name == "":
		return ""
	if not clips.has(name):
		# ohne Gehclip zeigt Gehen den Stand
		if name == "gehen" and clips.has("stand"):
			return figur + "_stand"
		return ""
	# stehende Clips nur in stehender Form (nicht liegend, nicht hockend)
	if ["stand", "gehen", "schlag", "umwerfschlag", "sprungtritt", "getroffen", "spott"].has(name) \
			and DarstellungZeichnen.gegnerForm(g) != "stand":
		return ""
	return figur + "_" + name


## Nahangriff von Bolzer oder Rammbock (Code in KernWerte.NAH_ANGRIFFE)?
static func _nahangriff(code: String) -> bool:
	return KernWerte.NAH_ANGRIFFE.has(code)


static func _angriff_clip(code: String, clips: Array) -> String:
	var name: String = String(ANGRIFF_CLIP.get(code, "schlag"))
	return name if clips.has(name) else "schlag"


## Blick des Clips: Flug, Liegen und Aufstehen zeigen den Clip so gespiegelt, dass der Flug in bahn_richtung geht
## (der Clip fliegt nach links, Blick nach rechts), wie DarstellungVelaFramesTabelle.wahl.
static func blick_fuer(clip: String, g: KernEntitaeten.Gegner) -> int:
	if clip.ends_with("_umgeworfen") or clip.ends_with("_liegen") or clip.ends_with("_aufstehen"):
		return -g.bahn_richtung if g.bahn_richtung != 0 else -g.blick
	return g.blick


## Bildindex (0-basiert) zu Clip, Clipdaten, Gegner und Welt. Reine Funktion.
##   stand, gehen, gehalten, hocke: Schleife über welt.frame (hin und her bei schleife=pingpong, gehen mit zyklus_ticks).
##   schlag im Modus ANGRIFF: rel = Frames seit Angriffsbeginn (angriff_a); vor aktiv_von laufen die Bilder 0 bis kontakt − 1
##     gleichmäßig über die Startframes, im Trefferfenster (aktiv_von bis aktiv_bis, KernWerte.NAH_ANGRIFFE) steht das
##     Kontaktbild, danach rueckzug; im Nachlauf rückwärts von rueckzug nach Bild 0 über die Nachlaufdauer.
##   getroffen: wie DarstellungVelaFramesTabelle.treffer über KernWerte.REAKTION_DAUER, Uhr ab reaktion_h.
##   umgeworfen (UMGEWORFEN, TOT): DarstellungVelaFramesTabelle.flug mit der Bahn des Gegners (Stillstand F4 beim Tod).
##   liegen: Bild 0. aufstehen: gleichmäßig über KernWerte.AUFSTEHEN_GEGNER Frames ab ruhe_frame + liegedauer.
##   auftritt: gleichmäßig über die Auftrittsdauer aus der Hocke (KernWerte.AUFTRITT_DAUER „hocke“ des Typs).
static func bildindex(clip: String, d: Dictionary, g: KernEntitaeten.Gegner, welt: KernWelt) -> int:
	var bilder: int = int(d["bilder"])
	if clip.ends_with("_getroffen"):
		var ev: Dictionary = d["ereignis"]
		var dd: Dictionary = d.duplicate()
		dd["ausholen"] = int(ev.get("start", 0))
		dd["kontakt"] = int(ev.get("kontakt", d["kontakt"]))
		dd["rueckzug"] = int(ev.get("rueckzug", dd["kontakt"]))
		dd["ruhe"] = int(ev.get("ruhe", bilder - 1))
		dd["rueckkehr"] = "vorwaerts"
		var u: int = maxi(welt.frame - g.reaktion_h + 1, 1)
		return DarstellungVelaFramesTabelle._ablauf(u, DarstellungVelaFramesTabelle.TREFFER_KONTAKT_VON,
			DarstellungVelaFramesTabelle.TREFFER_KONTAKT_BIS, KernWerte.REAKTION_DAUER, dd)
	if clip.ends_with("_umgeworfen"):
		var still: int = KernWerte.F4_STILLSTAND if g.aktion == "TOT" else KernWerte.F1_STILLSTAND
		return DarstellungVelaFramesTabelle.flug(maxi(g.uhr, 1), g.bahn_frame, g.bahn_boden, still, d)
	if clip.ends_with("_liegen"):
		return 0
	if clip.ends_with("_aufstehen"):
		var ruhe: int = clampi(int((d["ereignis"] as Dictionary).get("ruhe", bilder - 1)), 0, bilder - 1)
		var beginn: int = g.ruhe_frame + g.liegedauer
		var ua: int = clampi(welt.frame - beginn + 1, 1, KernWerte.AUFSTEHEN_GEGNER)
		return (ua - 1) * ruhe / maxi(KernWerte.AUFSTEHEN_GEGNER - 1, 1)
	if clip.ends_with("_auftritt"):
		var dauer: int = int(AUFTRITT_HOCKE_DAUER.get(g.typ, KernWerte.AUFTRITT_HOCKE_BOLZER))
		var ut: int = clampi(g.modus_uhr, 1, dauer)
		return (ut - 1) * (bilder - 1) / maxi(dauer - 1, 1)
	if clip.ends_with("_spott"):
		var us: int = clampi(g.modus_uhr, 1, KernWerte.SPOTT_DAUER)
		return (us - 1) * (bilder - 1) / maxi(KernWerte.SPOTT_DAUER - 1, 1)
	if ANGRIFF_CLIPS.has(clip.get_slice("_", clip.get_slice_count("_") - 1)):
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
		var dauer_n: int = maxi(g.nachlauf_ende - g.angriff_aktiv_ende, 1)
		var un: int = clampi(welt.frame - g.angriff_aktiv_ende, 0, dauer_n)
		if clip.ends_with("_sprungtritt"):
			# nach dem Tritt vorwärts bis zur Landung (ruhe), nicht rückwärts in die Hocke vor dem Absprung
			var ruhe: int = clampi(int(d.get("ruhe", bilder - 1)), rueckzug, bilder - 1)
			return rueckzug + un * (ruhe - rueckzug) / dauer_n
		return clampi(rueckzug - un * rueckzug / dauer_n, 0, rueckzug)
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
		if not node.aus_clip_bild(clip, bildindex(clip, d, g, welt), blick_fuer(clip, g)):
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
