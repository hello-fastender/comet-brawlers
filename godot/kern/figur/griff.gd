# Griff, Haltelage, Losreißen und geworfener Gegner als Geschoss (K1) nach
# docs/spezifikation-kampf.md, 8.1 (Griff am Ende eines LAUF-Frames), 8.3
# (Haltefrist), 8.4 (Wurf) und 8.5 (WG E+1 bis E+58), P16, P19, P20.
# Port von spiel/src/kern/figur/griff.ts.
#
# Zustand des Gegners: Greifen und Losreißen über die Hilfen von K2
# (gegner/reaktion.gd gegnerGreifen, gegnerLosreissen: Modus GEHALTEN bzw.
# FREI, Zustand, Rechte). Die Bahn F3 des Geworfenen führt K2 (Loslassen in
# E+22, erster Bahnframe E+23); K1 führt die Instanz WG am Geworfenen.
class_name KernFigurGriff
extends RefCounted


## Gehaltener Gegner, solange der Griff besteht (gehalten_von = Figur), sonst null.
static func gehaltener(welt: KernWelt) -> KernEntitaeten.Gegner:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, welt.figur.griff_ziel)
	if g == null or not g.belegt or g.gehalten_von != "f":
		return null
	return g


## Haltelage 19 px vor der Figur in ihrer Tiefe, am Boden (Kampf 8.1, P19).
static func haltelageSetzen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	g.x = KernFestkomma.add(f.x, KernFestkomma.mulGanz(KernFestkomma.ausGanz(KernWerte.HALTELAGE), f.blick))
	g.z = f.z
	g.h = 0


## Griff endet ohne Freilassen (Wurf, dritter Kniestoß, Spezialangriff, Tod des Gehaltenen: K2 setzt die Reaktion).
static func griffBeenden(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, f.griff_ziel)
	if g != null and g.gehalten_von == "f":
		g.gehalten_von = null
	f.griff_ziel = null
	f.knie_zahl = 0
	f.haltefrist = 0


## Gegner frei (Losreißen nach 8.3, Sprung im Griff nach 8.2, wirksamer
## Treffer gegen die Figur nach P16): Modus FREI, Zustand 1, Ereignis L:sn.
static func griffLoesen(welt: KernWelt) -> void:
	var g: KernEntitaeten.Gegner = gehaltener(welt)
	griffBeenden(welt)
	if g == null:
		return
	KernGegnerReaktion.gegnerLosreissen(g)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["LOSREISSEN"], g.schluessel])


## Greifbar (Kampf 7, 8.1): Zustand 1, nicht in aktiven Angriffsframes, am Boden.
static func greifbar(g: KernEntitaeten.Gegner) -> bool:
	if not g.belegt or g.typ == "" or g.zustand != KernEntitaeten.ZUSTAND_NORMAL:
		return false
	if g.angriff != null and g.angriff.aktiv:
		return false
	return KernFestkomma.ganz(g.h) == 0


## Ende KS7 (Kampf 8.1): Griff am Ende eines LAUF-Frames, |dz| ≤ 10; vorn 0
## bis 39 (schaut zur Figur) bzw. 0 bis 14 (schaut weg), hinten −24 bis −1 nur
## wenn er zur Figur schaut; nicht in der Griffsperre. Mehrere Kandidaten:
## kleinstes |dx|, dann kleinste Slotnummer (P20). Im Griff-Frame Haltelage,
## Ereignis G:F>sn, Haltefrist bis g+60, Drücke ab g+1.
static func griffPruefenIntern(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.aktion != "LAUF" or f.griffsperre > 0 or f.h != 0:
		return
	var ziel: KernEntitaeten.Gegner = null
	var besterDx: int = 0
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not greifbar(g):
			continue
		var a: KernEntitaeten.Abstand = KernEntitaeten.abstand(f, g)
		if absi(a.dz) > KernWerte.GRIFF_TIEFE:
			continue
		var schaut: bool = KernEntitaeten.schautZu(g, f)
		var passt: bool
		if a.d_vorn >= 0:
			passt = a.d_vorn <= (KernWerte.GRIFF_VORN_ANSCHAUEN if schaut else KernWerte.GRIFF_VORN_WEG)
		else:
			passt = schaut and a.d_vorn >= -KernWerte.GRIFF_HINTEN
		if not passt:
			continue
		var dx: int = absi(a.dx)
		if ziel == null or dx < besterDx:
			ziel = g
			besterDx = dx
	if ziel == null:
		return
	KernFigurBasis.aktionSetzen(welt, "GRIFF")
	f.druecke_ab = welt.frame + 1
	f.griff_ziel = ziel.schluessel
	f.knie_zahl = 0
	f.haltefrist = KernWerte.HALTEFRIST
	f.los_frame = welt.frame + KernWerte.HALTEFRIST + 1
	KernGegnerReaktion.gegnerGreifen(welt, ziel, "f")
	haltelageSetzen(welt, ziel)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["GRIFF"], KernEreignisse.pfeil("f", ziel.schluessel)])


## KS4: Instanzen WG der geworfenen Gegner (Kampf 8.5): aktiv E+1 bis E+58,
## am Geworfenen (urheber Figur), Flugrichtung als bahn_richtung; danach
## entfernt. Die Instanz wird jeden Frame wieder in g.angriff eingesetzt, damit
## ihre Menge der Getroffenen erhalten bleibt. Dazu die Haltelage eines
## gehaltenen Gegners (P19).
static func wurfGeschosseSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var bleiben: Array = []
	for w: KernEntitaeten.Wurfgeschoss in f.wuerfe:
		var gw: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, w.ziel)
		var d: int = welt.frame - w.e
		if gw == null or not gw.belegt or d > KernWerte.WG_BIS:
			if gw != null and gw.angriff == w.inst:
				gw.angriff = null
			continue
		gw.bahn_richtung = w.richtung
		gw.angriff = w.inst
		w.inst.aktiv = d >= 1
		bleiben.append(w)
	f.wuerfe = bleiben
	var g: KernEntitaeten.Gegner = gehaltener(welt)
	if g != null:
		haltelageSetzen(welt, g)
