# Test: Die Darstellung mit der Vela-Puppe ändert das Protokoll nicht
# (Auftrag 6, Phase 2, Punkt 3). Die ganze Spielszene spiel.tscn mit Puppe und
# beiden Zeichenebenen wird in den Baum gehängt, die Vorführung läuft 600
# Logikschritte; nach jedem Schritt aktualisiert die Darstellung die Puppe
# (Pose, Lage, Blick) und stößt das Neuzeichnen an. Das Protokoll muss Zeile
# für Zeile der Referenz entsprechen.
class_name PuppeProtokollTest
extends RefCounted

const SCHRITTE: int = 600


static func lauf() -> Dictionary:
	var geprueft: int = 0
	var fehler: Array[String] = []
	var w: String = VergleichHilfe.wurzel()
	var ref_roh: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/referenz/alle/vorfuehrung.protokoll.csv"))
	geprueft += 1
	if ref_roh == null:
		fehler.append("Puppe: Referenz fehlt")
		return {"geprueft": geprueft, "fehler": fehler}
	var spiel_skript: GDScript = load("res://darstellung/spiel.gd")
	var argumente: Dictionary = spiel_skript.call("parseArgumente", PackedStringArray(["--szene", "spiel/tests/szenen/vorfuehrung.txt", "--eingabe", "spiel/tests/eingaben/vorfuehrung.txt", "--puppe"]))
	var spiel: Node2D = (load("res://darstellung/spiel.tscn") as PackedScene).instantiate()
	spiel.set("automatisch", false)
	spiel.set("argumente", argumente)
	# Ein Testlauf in _init hat noch keinen laufenden Baum: _ready von Hand rufen.
	spiel.call("_ready")
	var sitzung: DarstellungSitzung = spiel.get("sitzung")
	geprueft += 1
	if sitzung == null:
		fehler.append("Puppe: Spiel nicht gestartet")
		spiel.free()
		return {"geprueft": geprueft, "fehler": fehler}
	sitzung.protokollSetzen(true)
	var pose_gezaehlt: int = 0
	var sichtbar: int = 0
	for _i in range(SCHRITTE):
		sitzung.logikSchritt()
		spiel.call("_puppeAktualisieren")
		var puppe: Node2D = spiel.get("_puppe")
		if puppe != null and puppe.visible:
			sichtbar += 1
		pose_gezaehlt += 1
	geprueft += 1
	if sichtbar == 0:
		fehler.append("Puppe: in 600 Schritten nie sichtbar (Stand, Lauf oder Kette erwartet)")
	var ref: PackedStringArray = (ref_roh as String).split("\n")
	var ki: int = VergleichHilfe.kopfIndex(ref)
	var bis: int = ki + 1 + SCHRITTE
	geprueft += 1
	if sitzung.schreiber.protokollZeilen.size() != bis:
		fehler.append("Puppe: %d Protokollzeilen, erwartet %d" % [sitzung.schreiber.protokollZeilen.size(), bis])
	else:
		for z in range(bis):
			if sitzung.schreiber.protokollZeilen[z] != ref[z]:
				fehler.append("Puppe: Protokoll weicht in Zeile %d von der Referenz ab" % (z + 1))
				break
	spiel.free()
	return {"geprueft": geprueft, "fehler": fehler}
