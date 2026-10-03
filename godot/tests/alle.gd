# Testlauf: godot --headless --path godot --script res://tests/alle.gd
extends SceneTree

func _init() -> void:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerLeer(3)
	print(g.schluessel, " ", KernFestkomma.ganz(-1), " ", KernFestkomma.divGanz(-7, 2), " ", KernFestkomma.mul(-1, 1), " ", KernFestkomma.zuDezimalText(-32768 * 65536))
	var t: KernEntitaeten.SlotTabelle = KernEntitaeten.slotTabelleNeu()
	print(t.gegner.size(), " ", t.objekte.size(), " ", KernEntitaeten.freierGegner(t).schluessel)
	var gb: KernEntitaeten.Gegner = KernEntitaeten.gegnerBelegen(KernEntitaeten.freierGegner(t), "Bolzer")
	print(gb.schluessel, gb.belegt, gb.typ, gb.zufall.zustand)
	var z: KernZufall.Zufall = KernZufall.zufallNeu(1)
	var folge: Array = []
	for i in range(10):
		folge.append(KernZufall.ziehen(z))
	print(folge)
	quit(0)
