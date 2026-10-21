extends SceneTree
## Platzhalter-Suche: spielt alle Testszenen (spiel/tests/szenen) ohne Fenster durch und zählt die Zustände, in denen Vela
## keinen gemalten Clip hat (DarstellungVelaFramesTabelle.wahl leer: Puppe oder Rechteck) oder ein Gegner mit Figur keinen
## Clip bekommt (DarstellungGegnerFrames.clip_fuer leer: Rechteck). Ausgabe je Zustand: Anzahl Frames und erste Szene.
##
## Aufruf: godot --headless --path godot --script res://werkzeuge/platzhalter_suche.gd


func _init() -> void:
	var w: String = VergleichHilfe.wurzel()
	var stages: Callable = VergleichHilfe.stageAusOrdner(w.path_join("spiel/daten/stages"))
	var vela: Dictionary = {}
	var gegner: Dictionary = {}
	var ordner: String = w.path_join("spiel/tests/szenen")
	var namen: PackedStringArray = DirAccess.get_files_at(ordner)
	for datei: String in namen:
		if not datei.ends_with(".txt"):
			continue
		var name: String = datei.get_basename()
		var start: KernStart.Pruefstart = PruefSzene.parseSzene(VergleichHilfe.lesen(ordner.path_join(datei)) as String)
		var stage: KernStage.Stage = KernStage.parseStage(stages.call(start.buehne) as String)
		var eingabe_text: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/eingaben/%s.txt" % name))
		var eingabe: PruefEingabe.Eingabefolge = PruefEingabe.parseEingabe("" if eingabe_text == null else eingabe_text as String)
		var welt: KernWelt = KernWelt.erzeugeWelt(stage, start)
		while welt.frame < start.endframe and not welt.beendet:
			KernWelt.logikSchritt(welt, PruefEingabe.tastenIn(eingabe, welt.frame + 1))
			var f: KernEntitaeten.Figur = welt.figur
			if DarstellungVelaFramesTabelle.wahl(f, welt).is_empty():
				var k: String = f.aktion
				if f.aktion == "GETROFFEN":
					k += " (Angreifer hinten)"
				elif f.aktion == "SPRUNGANGRIFF":
					k += " " + f.sprung_variante
				_zaehlen(vela, k, name)
			for g: KernEntitaeten.Gegner in welt.gegner:
				if not DarstellungGegnerFrames.FIGUR_JE_TYP.has(g.typ) or not DarstellungZeichnen.gegnerSichtbar(welt, g):
					continue
				if DarstellungGegnerFrames.clip_fuer(g) == "":
					var kg: String = "%s aktion=%s modus=%s code=%s auftritt=%s form=%s" % [g.typ, g.aktion, g.modus,
						g.angriff_code, g.auftritt, DarstellungZeichnen.gegnerForm(g)]
					_zaehlen(gegner, kg, name)
	print("Vela ohne gemalten Clip (Frames, erste Szene):")
	_ausgeben(vela)
	print("Gegner ohne Clip (Frames, erste Szene):")
	_ausgeben(gegner)
	quit(0)


func _zaehlen(d: Dictionary, k: String, szene: String) -> void:
	if not d.has(k):
		d[k] = [0, szene]
	d[k][0] += 1


func _ausgeben(d: Dictionary) -> void:
	var ks: Array = d.keys()
	ks.sort_custom(func(a: String, b: String) -> bool: return int(d[a][0]) > int(d[b][0]))
	for k: String in ks:
		print("  %6d  %s  (%s)" % [int(d[k][0]), k, String(d[k][1])])
	if ks.is_empty():
		print("  keine")
