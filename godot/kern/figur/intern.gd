# Annahme der Eingaben der Spielfigur (K1) nach docs/spezifikation-kampf.md,
# 2.1 (T(f−1), neue Drücke, kein Eingabepuffer) und 4.3 („Drücke ab X“).
# Der Zustand der Figur steht vollständig in welt.figur (entitaeten.gd,
# Figur); hier stehen nur die Hilfen für die Eingabe.
# Port von spiel/src/kern/figur/intern.ts.
class_name KernFigurIntern
extends RefCounted

# ===========================================================================
# Eingabe (Kampf 2.1, 4.3)
# ===========================================================================

## Eingabe des Schritts f: T(f−1) und die neuen Drücke darin, bei steuerung 0 keine (Welt 3 KA13, 10.3, 10.5).
class Eingang:
	## T(f−1)
	var t: int = 0
	## neue Drücke in T(f−1)
	var neu: int = 0
	## Druckframe q = f − 1
	var q: int = 0


## Eingabe für den laufenden Schritt; bei steuerung 0 leer (Ausnahme Neueinstieg: schaden.gd liest roh).
static func eingang(welt: KernWelt) -> Eingang:
	var an: bool = welt.rahmen.steuerung == 1
	var r: Eingang = Eingang.new()
	r.t = welt.eingabe.t1 if an else KernTasten.KEINE
	r.neu = welt.eingabe.neu if an else KernTasten.KEINE
	r.q = welt.frame - 1
	return r


## Von der Aktion angenommene Drücke (Kampf 4.3, „Drücke ab X“).
class Angenommen extends Eingang:
	## A neu und angenommen
	var a: bool = false
	## S neu und angenommen
	var s: bool = false
	## angenommene Richtungsmenge (0 = keine)
	var richtung: int = 0


## Hat die Richtungsmenge eine wirksame Richtung (P1: L und R zugleich bzw. O und U zugleich zählen nicht)?
static func hatRichtung(r: int) -> bool:
	return KernTasten.richtungX(r) != 0 or KernTasten.richtungZ(r) != 0


## Filtert die Eingabe nach den Schwellen der Aktion (Kampf 4.3): A und S ab
## druecke_ab, eine Richtung mit L oder R ab richtung_ab, eine Richtung nur in
## der Tiefe ab tiefe_ab. Tasten aus früheren Frames verfallen.
static func angenommen(f: KernEntitaeten.Figur, e: Eingang) -> Angenommen:
	var druecke: bool = e.q >= f.druecke_ab
	var r: int = KernTasten.richtungsteil(e.t)
	var richtung: int = KernTasten.KEINE
	if KernTasten.richtungX(r) != 0:
		if e.q >= f.richtung_ab:
			richtung = r
	elif KernTasten.richtungZ(r) != 0:
		if e.q >= f.tiefe_ab:
			richtung = r
	var n: Angenommen = Angenommen.new()
	n.t = e.t
	n.neu = e.neu
	n.q = e.q
	n.a = druecke and KernTasten.hat(e.neu, KernTasten.TASTE_A)
	n.s = druecke and KernTasten.hat(e.neu, KernTasten.TASTE_S)
	n.richtung = richtung
	return n


## Setzt alle drei Schwellen (Kampf 4.3: „Drücke ab X“).
static func schwellenSetzen(f: KernEntitaeten.Figur, druecke: int, richtung: int, tiefe: int) -> void:
	f.druecke_ab = druecke
	f.richtung_ab = richtung
	f.tiefe_ab = tiefe
