## Druckt den Messbericht der Vela-Bewegung:
##   godot --headless --path godot --script res://werkzeuge/qa_bericht.gd
extends SceneTree

func _init() -> void:
	print(VelaQa.bericht())
	quit(0)
