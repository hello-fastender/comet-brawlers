# Werkzeug für die Fehlersuche: zwei Protokolle vergleichen.
#
#   godot --headless --path godot --script res://tests/vergleich.gd -- --ist <datei> --soll <datei>
#
# Zeigt die erste abweichende Zeile mit Frame, Spaltenname, beiden Werten und
# den fünf Zeilen davor (je nur Frame und abweichende Spalte). Pfade relativ
# zur Repo-Wurzel oder absolut. Exit-Code 1 bei Abweichung oder Fehler, 0 bei
# Gleichheit.
extends SceneTree


func _haupt() -> int:
	var argv: PackedStringArray = OS.get_cmdline_user_args()
	var ist_pfad: String = ""
	var soll_pfad: String = ""
	var i: int = 0
	while i < argv.size():
		if argv[i] == "--ist" and i + 1 < argv.size():
			ist_pfad = argv[i + 1]
			i += 2
		elif argv[i] == "--soll" and i + 1 < argv.size():
			soll_pfad = argv[i + 1]
			i += 2
		else:
			printerr("unerwartetes Argument „%s“" % argv[i])
			return 1
	if ist_pfad == "" or soll_pfad == "":
		printerr("Aufruf: vergleich.gd -- --ist <datei> --soll <datei>")
		return 1
	ist_pfad = VergleichHilfe.absolut(ist_pfad)
	soll_pfad = VergleichHilfe.absolut(soll_pfad)
	var ist: Variant = VergleichHilfe.lesen(ist_pfad)
	var soll: Variant = VergleichHilfe.lesen(soll_pfad)
	if ist == null:
		printerr("Datei nicht gefunden: %s" % ist_pfad)
		return 1
	if soll == null:
		printerr("Datei nicht gefunden: %s" % soll_pfad)
		return 1
	var meldung: String = VergleichHilfe.bericht(ist as String, soll as String)
	if meldung == "":
		print("gleich: %s" % soll_pfad)
		return 0
	print("ABWEICHUNG %s gegen %s" % [ist_pfad, soll_pfad])
	print(meldung)
	return 1


func _init() -> void:
	quit(_haupt())
