# Eingriffe eines Prüfstarts in W1 nach docs/spezifikation-welt.md, 11.3 und
# docs/spezifikation-kampf.md, 11.2.
# Port von spiel/src/kern/eingriffe.ts.
#
# Ein Eingriff `frame, ziel, feld, wert` setzt in W1 des Frames einen Wert,
# Nachkommaanteil 0, und schreibt das Ereignis EI:<ziel>.<feld>=<wert>. Er
# setzt nur das Feld; Folgen (z. B. Tod bei LP < 0 ≤ lp_vor) erkennt das
# zuständige Modul im selben Frame. Gegner der Prüfszene mit erscheint = f
# (f > 1) erscheinen ebenfalls in W1, vor den übrigen Eingriffen, Slots
# aufsteigend (Festlegung K0 für „in Frame f erscheint ein Gegner“).
#
# Ziele und Felder:
#   f        x z h (px), lp, lp_max, blick (R/L), schutz, waffe (RW/leer), munition
#   sN       x z h, lp, lp_max, blick
#   oN, gN   x z h, lp, munition, liegezeit
#   rang     wert, zaehler, fest (ja/nein)
#   kamera   x (Ky nach kamera_y), modus
#   welle.N  jetzt (löst Welle N aus, wellen.gd welleAusloesen)
#
# Fehlerbehandlung: TypeScript wirft einen RangeError. Der Port meldet den
# Fehler mit push_error (fehler) und bricht die Funktion mit einem
# unauffälligen Rückgabewert ab; eingriffPruefen gibt dazu true (gültig) oder
# false zurück.
class_name KernEingriffe
extends RefCounted

## Kamera-Modi für Eingriffe und Prüfstart (Welt 3).
const KAMERA_MODI: Array[String] = ["FREI", "SPERRE", "HALT", "BLENDE", "ARENA", "ENDE"]

const FELDER_FIGUR: PackedStringArray = ["x", "z", "h", "lp", "lp_max", "blick", "schutz", "waffe", "munition"]
const FELDER_GEGNER: PackedStringArray = ["x", "z", "h", "lp", "lp_max", "blick"]
const FELDER_OBJEKT: PackedStringArray = ["x", "z", "h", "lp", "munition", "liegezeit"]
const FELDER_RANG: PackedStringArray = ["wert", "zaehler", "fest"]
const FELDER_KAMERA: PackedStringArray = ["x", "modus"]


## Meldet einen Fehler zu einem Eingriff (TypeScript: new RangeError(…) und throw).
static func fehler(e: KernStart.EingriffDaten, text: String) -> void:
	push_error("Eingriff frame=%d ziel=%s feld=%s wert=%s: %s" % [e.frame, e.ziel, e.feld, e.wert, text])


## Nur Ziffern 0 bis 9 und mindestens eine (JavaScript: /^\d+$/ ohne Treffer auf Zeilenenden).
static func nurZiffern(s: String) -> bool:
	if s.is_empty():
		return false
	for zeichen in s:
		if zeichen < "0" or zeichen > "9":
			return false
	return true


## Nummer N, wenn s die Form „<vorsatz>N“ hat (nur Ziffern), sonst -1.
static func nummerNach(s: String, vorsatz: String) -> int:
	if not s.begins_with(vorsatz):
		return -1
	var rest: String = s.substr(vorsatz.length())
	if not nurZiffern(rest):
		return -1
	return rest.to_int()


static func ganzzahl(e: KernStart.EingriffDaten) -> int:
	var w: String = e.wert
	var ziffern: String = w.substr(1) if w.begins_with("-") else w
	if not nurZiffern(ziffern):
		fehler(e, "Wert muss eine ganze Zahl sein")
		return 0
	return w.to_int()


static func koordinate(e: KernStart.EingriffDaten) -> int:
	var n: int = ganzzahl(e)
	if absi(n) > KernWerte.KOORDINATE_MAX:
		fehler(e, "Koordinate außerhalb ±%d" % KernWerte.KOORDINATE_MAX)
		return 0
	return KernFestkomma.ausGanz(n)


static func blickWert(e: KernStart.EingriffDaten) -> int:
	return KernStage.blickAusText(e.wert, func() -> String: return "Eingriff frame=%d ziel=%s feld=%s wert=%s: Blick muss R oder L sein" % [e.frame, e.ziel, e.feld, e.wert])


## Prüft einen Eingriff beim Laden (meldet einen Fehler bei unbekanntem Ziel oder Feld).
## Rückgabe: true, wenn der Eingriff gültig ist.
static func eingriffPruefen(e: KernStart.EingriffDaten) -> bool:
	if e.frame < KernWerte.ERSTER_FRAME:
		fehler(e, "frame muss ≥ 1 sein")
		return false
	var welle: int = nummerNach(e.ziel, "welle.")
	if welle >= 0:
		if e.feld != "jetzt":
			fehler(e, "für welle.N gibt es nur das Feld jetzt")
			return false
		return true
	var felder: PackedStringArray
	if e.ziel == "f":
		felder = FELDER_FIGUR
	elif nummerNach(e.ziel, "s") >= 0:
		felder = FELDER_GEGNER
	elif nummerNach(e.ziel, "o") >= 0 or nummerNach(e.ziel, "g") >= 0:
		felder = FELDER_OBJEKT
	elif e.ziel == "rang":
		felder = FELDER_RANG
	elif e.ziel == "kamera":
		felder = FELDER_KAMERA
	else:
		fehler(e, "unbekanntes Ziel (f, sN, oN, gN, rang, kamera, welle.N)")
		return false
	if not felder.has(e.feld):
		fehler(e, "unbekanntes Feld (erlaubt: %s)" % " ".join(felder))
		return false
	return true


static func setzeGemeinsam(ziel: KernEntitaeten.EntitaetBasis, e: KernStart.EingriffDaten) -> bool:
	match e.feld:
		"x":
			ziel.x = koordinate(e)
			return true
		"z":
			ziel.z = koordinate(e)
			return true
		"h":
			ziel.h = koordinate(e)
			return true
		"lp":
			ziel.lp = ganzzahl(e)
			return true
		"lp_max":
			ziel.lp_max = ganzzahl(e)
			return true
		_:
			return false


## Wendet einen Eingriff an (W1) und schreibt EI.
static func eingriffAnwenden(welt: KernWelt, e: KernStart.EingriffDaten) -> void:
	if not eingriffPruefen(e):
		return
	var welle: int = nummerNach(e.ziel, "welle.")
	if welle >= 0:
		KernWellen.welleAusloesen(welt, welle)
	elif e.ziel == "rang":
		if e.feld == "wert":
			welt.rang.rang = ganzzahl(e)
		elif e.feld == "zaehler":
			welt.rang.zaehler = ganzzahl(e)
		else:
			welt.rang.fest = e.wert == "ja" or e.wert == "an"
	elif e.ziel == "kamera":
		if e.feld == "x":
			welt.kamera.x = ganzzahl(e)
			welt.kamera.y = KernStage.kameraY(welt.stage, welt.kamera.x)
		else:
			var m: Variant = null
			for k: String in KAMERA_MODI:
				if k == e.wert:
					m = k
					break
			if m == null:
				fehler(e, "Modus unbekannt (%s)" % " ".join(PackedStringArray(KAMERA_MODI)))
				return
			welt.kamera.modus = m as String
	else:
		var ziel: KernEntitaeten.EntitaetBasis = KernEntitaeten.entitaet(welt, e.ziel)
		if ziel == null:
			fehler(e, "Slot gibt es nicht")
			return
		if not setzeGemeinsam(ziel, e):
			if e.feld == "blick":
				ziel.blick = blickWert(e)
			elif ziel == welt.figur:
				var f: KernEntitaeten.Figur = welt.figur
				if e.feld == "schutz":
					f.schutz = ganzzahl(e)
				elif e.feld == "munition":
					f.munition = ganzzahl(e)
				elif e.feld == "waffe":
					if e.wert != "RW" and e.wert != "leer" and e.wert != "":
						fehler(e, "Waffe muss RW oder leer sein")
						return
					f.waffe = "RW" if e.wert == "RW" else ""
			else:
				var o: KernEntitaeten.Objekt = KernEntitaeten.objektVon(welt, ziel.schluessel)
				if o == null:
					fehler(e, "Feld gibt es nur für Objekte")
					return
				if e.feld == "munition":
					o.munition = ganzzahl(e)
				elif e.feld == "liegezeit":
					o.liegezeit = ganzzahl(e)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["EINGRIFF"], KernEreignisse.eingriffText(e.ziel, e.feld, e.wert)])


## Gegner der Prüfszene, die in Frame f (f > 1) erscheinen, Slots aufsteigend
## (stabil sortiert wie Array.prototype.sort).
static func erscheinendeGegner(welt: KernWelt, f: int) -> Array:
	var liste: Array = []
	for g: KernStart.GegnerStart in welt.start.gegner:
		if g.erscheint > KernWerte.ERSTER_FRAME and g.erscheint == f:
			liste.append(g)
	# stabiler Einfügesort nach slot
	for i in range(1, liste.size()):
		var x: KernStart.GegnerStart = liste[i]
		var j: int = i - 1
		while j >= 0 and (liste[j] as KernStart.GegnerStart).slot > x.slot:
			liste[j + 1] = liste[j]
			j -= 1
		liste[j + 1] = x
	return liste


## W1 (Welt 1, 11.3): erscheinende Gegner und Eingriffe dieses Frames in Szenenreihenfolge.
static func eingriffeAusfuehren(welt: KernWelt) -> void:
	var f: int = welt.frame
	for gs: KernStart.GegnerStart in erscheinendeGegner(welt, f):
		var g: KernEntitaeten.Gegner = KernAnlegen.gegnerAusSzene(welt, gs)
		KernAnlegen.gegnerZufallGeben(welt, g)
		KernAnlegen.gegnerUebergeben(welt, g)
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["EINGRIFF"], KernEreignisse.eingriffText(g.schluessel, "erscheint", gs.typ)])
	for e: KernStart.EingriffDaten in welt.start.eingriffe:
		if e.frame == f:
			eingriffAnwenden(welt, e)
