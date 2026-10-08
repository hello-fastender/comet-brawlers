# Zeichnen eines Bildes im logischen Raster 384 × 224 (Auftrag 3, 2.5).
# Port von spiel/src/darstellung/zeichnen.ts (Fassung der Platzhalter mit
# Rechtecken; die Sprite-Fassung entfällt, Sprites kommen als Puppe). Liest nur
# die Welt; ändert sie nie. Alle Lagen in Spielpixeln; die Zeichenklasse
# (zeichner.gd) bringt sie auf die Bildpixel (1536 × 896; E28, vorher E25, Auftrag 5,
# docs/grafik.md 9.10).
#
# Bildschirmposition und Zeichenreihenfolge nach
# docs/spezifikation-kampf.md, 2.5:
#   Bildschirm-x = ⌊x⌋ − Kamera-x
#   Bildschirm-y des Schattens = 234 − (⌊z⌋ − Kamera-y)
#   Bildschirm-y des Fußpunkts = 234 − (⌊z⌋ − Kamera-y) − ⌊h⌋
#   Hintergrund; alle Schatten; Objekte nach ⌊z⌋ absteigend (hinten zuerst),
#   bei gleicher Tiefe Behälter, Gegenstände, Gegner, Figur, Geschosse und
#   Effekte, dann aufsteigende Slotnummer; Vordergrund; zuletzt Anzeige.
# Bildschütteln (Welt 3, KA10) verschiebt nur Hintergrund, Objekte und
# Vordergrund, nie die Anzeige. Die Blende (KA13, Welt 10.5) dunkelt das
# Bild nach anzeige(welt).blende ab; die Anzeigeleiste bleibt sichtbar.
# Gegner zeichnet sie nur im aktiven Fenster (Welt 4.1), wartende nur, wenn
# sie hocken (Welt 4.2).
#
# Zweiteilige Zeichnung (nur Godot-Fassung, für die Puppe): Die Stücke (Figur,
# Gegner, Objekte, Geschosse) lassen sich vor und nach der Figur getrennt
# zeichnen. zeichneSzeneTeil / zeichneBildTeil zeichnen Hintergrund, alle
# Schatten und die Stücke bis vor die Figur auf zn_hinten, die Stücke nach
# der Figur und den Vordergrund auf zn_vorn. Mit figur_extern = true zeichnet
# sie den Körper der Figur nicht (die Puppe als Node2D zwischen den beiden
# Ebenen übernimmt das), ihren Schatten aber schon; ohne figur_extern liegt
# die Figur in der Originalreihenfolge am Ende des hinteren Teils. Wo die
# beiden Ebenen eigene Knoten mit eigenem _draw sind, zeichnen
# zeichneBildHinten und zeichneBildVorn je eine Hälfte.
class_name DarstellungZeichnen
extends RefCounted

# ===========================================================================
# Bildschirmformeln (Kampf 2.5)
# ===========================================================================

## Kamera als ganzzahliges Paar (K, Ky), Welt 3.
class Kamera:
	var x: int = 0
	var y: int = 0


## Bildschirm-x zu einer ganzzahligen Welt-x: ⌊x⌋ − Kamera-x.
static func bildX(k: Kamera, x: int) -> int:
	return x - k.x


## Bildschirm-y zu ganzzahliger Tiefe und Höhe: 234 − (⌊z⌋ − Kamera-y) − ⌊h⌋.
static func bildY(k: Kamera, z: int, h: int = 0) -> int:
	return KernWerte.BILDSCHIRM_Y_BASIS - (z - k.y) - h


## Bildschirmlage einer Entität: Fußpunkt und Schatten.
class Lage:
	var x: int = 0
	var schatten: int = 0
	var fuss: int = 0


## Lage einer Entität nach Kampf 2.5 an ihren ganzzahligen Positionen.
static func lageVon(k: Kamera, e: KernEntitaeten.EntitaetBasis) -> Lage:
	var l: Lage = Lage.new()
	l.x = bildX(k, KernFestkomma.ganz(e.x))
	l.schatten = bildY(k, KernFestkomma.ganz(e.z))
	l.fuss = l.schatten - KernFestkomma.ganz(e.h)
	return l


## Kamera der Welt als ganzzahliges Paar.
static func kameraVon(welt: KernWelt) -> Kamera:
	var k: Kamera = Kamera.new()
	k.x = welt.kamera.x
	k.y = welt.kamera.y
	return k


## Fußpunkt der Figur im Bild in Bildpixeln (für die Puppe): linke obere Ecke
## des Spielpixels (x, Fußzeile), mit Bildschütteln, mal DARSTELLUNG. Der
## Schatten der Figur liegt bei y + ⌊h⌋ · DARSTELLUNG darunter. Spiegeln um
## die Mitte der Spielpixelspalte (x + 0,5) · DARSTELLUNG.
static func figurFuss(welt: KernWelt) -> Vector2:
	var l: Lage = lageVon(kameraVon(welt), welt.figur)
	return Vector2(
		float(l.x + welt.kamera.schuetteln_x) * DarstellungMasse.DARSTELLUNG,
		float(l.fuss + welt.kamera.schuetteln_y) * DarstellungMasse.DARSTELLUNG
	)


## Halbe Höhe des Schattens: der Umriss „mit Schatten“ reicht so weit unter den Fußpunkt.
const SCHATTEN_HALB: int = DarstellungMasse.SCHATTEN_HOEHE / 2

# ===========================================================================
# Grundformen
# ===========================================================================

## Rahmen von 1 px innen an den Kanten des Rechtecks b × h.
static func rahmen(zn: DarstellungZeichner, x: float, y: float, b: float, h: float, farbe: Color) -> void:
	if b <= 0 or h <= 0:
		return
	zn.umriss(x, y, b - 1, h - 1, farbe)


# ===========================================================================
# Hintergrund und Vordergrund (Welt 2.1, 2.3)
# ===========================================================================

static func zyklisch(liste: Array, i: int) -> Color:
	return liste[i % liste.size()]


static func zeichneHintergrund(zn: DarstellungZeichner, welt: KernWelt, k: Kamera) -> void:
	var stage: KernStage.Stage = welt.stage
	var farbe: Dictionary = DarstellungMasse.FARBE
	zn.rechteck(0, 0, KernWerte.BILD_BREITE, KernWerte.BILD_HOEHE, farbe.leer)
	for i in range(stage.baender.size()):
		var b: KernStage.Band = stage.baender[i]
		var sx0: int = bildX(k, b.x0)
		var sx1: int = bildX(k, b.x1)
		if sx1 < 0 or sx0 > KernWerte.BILD_BREITE:
			continue
		var yo0: int = bildY(k, b.oben0)
		var yo1: int = bildY(k, b.oben1)
		var yu0: int = bildY(k, b.unten0)
		var yu1: int = bildY(k, b.unten1)
		# Wand über dem Band, Boden im Band, Kante unter dem Band
		zn.vieleck([Vector2(sx0, 0), Vector2(sx1, 0), Vector2(sx1, yo1), Vector2(sx0, yo0)], zyklisch(farbe.wand, i))
		zn.vieleck([Vector2(sx0, yo0), Vector2(sx1, yo1), Vector2(sx1, yu1), Vector2(sx0, yu0)], zyklisch(farbe.boden, i))
		zn.vieleck([Vector2(sx0, yu0), Vector2(sx1, yu1), Vector2(sx1, KernWerte.BILD_HOEHE), Vector2(sx0, KernWerte.BILD_HOEHE)], farbe.leer)
		# Tiefenlinien (z) und Bodenmarken (x) im Band
		var zMin: int = maxi(b.unten0, b.unten1)
		var zMax: int = mini(b.oben0, b.oben1)
		var z: int = ceili(float(zMin) / DarstellungMasse.TIEFENLINIE_ABSTAND) * DarstellungMasse.TIEFENLINIE_ABSTAND
		while z < zMax:
			if z > zMin:
				zn.linie(sx0, bildY(k, z), sx1 - 1, bildY(k, z), farbe.tiefenlinie)
			z += DarstellungMasse.TIEFENLINIE_ABSTAND
		var x: int = ceili(float(b.x0) / DarstellungMasse.BODENMARKE_ABSTAND) * DarstellungMasse.BODENMARKE_ABSTAND
		while x < b.x1:
			var g: Variant = KernStage.bandGrenzen(stage, x)
			if g != null:
				zn.linie(bildX(k, x), bildY(k, (g as Dictionary)["oben"] as int), bildX(k, x), bildY(k, (g as Dictionary)["unten"] as int), farbe.bodenmarke)
			x += DarstellungMasse.BODENMARKE_ABSTAND
		# Tiefenband als Linien: Ober- und Untergrenze
		zn.linie(sx0, yo0, sx1 - 1, yo1, farbe.bandkante)
		zn.linie(sx0, yu0, sx1 - 1, yu1, farbe.bandkante)
	# Hintergrundbilder als Farbflächen auf der Wand
	for i in range(stage.hintergrund.size()):
		var h: KernStage.BildSatz = stage.hintergrund[i]
		var sx0: int = bildX(k, h.x0)
		var sx1: int = bildX(k, h.x1)
		if sx1 < 0 or sx0 > KernWerte.BILD_BREITE:
			continue
		var links: Variant = KernStage.bandGrenzen(stage, h.x0)
		var rechts: Variant = KernStage.bandGrenzen(stage, h.x1 - 1)
		var oben: Variant = null
		if links != null:
			oben = (links as Dictionary)["oben"]
		if rechts != null and (oben == null or (rechts as Dictionary)["oben"] > oben):
			oben = (rechts as Dictionary)["oben"]
		if oben == null:
			continue
		var unten: int = bildY(k, oben as int)
		var y0: int = maxi(0, unten - DarstellungMasse.HINTERGRUND_HOEHE)
		zn.rechteck(sx0, y0, sx1 - sx0, unten - y0, zyklisch(farbe.bild, i))
		rahmen(zn, sx0, y0, sx1 - sx0, unten - y0, farbe.kontur)
		# Beschriftung am linken Rand der sichtbaren Fläche
		var name: String = h.bild if h.bild != "" else h.id
		zn.text(DarstellungSchrift.SCHRIFT_3X5, name.to_upper(), maxi(sx0, 0) + DarstellungMasse.HINTERGRUND_RAND, y0 + DarstellungMasse.HINTERGRUND_RAND, farbe.bild_text)
	# Hindernisse als Grundfläche (Welt 2.2)
	for h2: KernStage.Hindernis in stage.hindernisse:
		zeichneHindernis(zn, k, h2, farbe.hindernis_flaeche)


## Grundfläche eines Hindernisses in der Ebene x/z (Welt 2.1).
static func zeichneHindernis(zn: DarstellungZeichner, k: Kamera, h: KernStage.Hindernis, farbe: Color) -> void:
	if h.punkte.size() < 2:
		return
	var p: Array = []
	for q: KernStage.Punkt in h.punkte:
		p.append(Vector2(bildX(k, q.x), bildY(k, q.z)))
	zn.vieleck(p, farbe)


static func zeichneVordergrund(zn: DarstellungZeichner, welt: KernWelt, k: Kamera) -> void:
	for v: KernStage.BildSatz in welt.stage.vordergrund:
		var sx0: int = bildX(k, v.x0)
		var sx1: int = bildX(k, v.x1)
		if sx1 < 0 or sx0 > KernWerte.BILD_BREITE:
			continue
		var y0: int = KernWerte.BILD_HOEHE - v.zeilen
		zn.rechteck(sx0, y0, sx1 - sx0, v.zeilen, DarstellungMasse.FARBE.vordergrund)
		zn.linie(sx0, y0, sx1 - 1, y0, DarstellungMasse.FARBE.vordergrund_kante)


# ===========================================================================
# Figuren: Umriss, Zustandsfarbe, Blickrichtung, Höhe
# ===========================================================================

# Form eines Körpers (String): "stand", "hocke" (Auftritt, Aufstehen) oder "liegend".

const FIGUR_LIEGEND: Array = ["UMGEWORFEN", "LIEGEN", "TOT"]
const FIGUR_GRIFF: Array = ["GRIFF", "KNIESTOSS", "WURF"]
const GEGNER_LIEGEND: Array = ["UMGEWORFEN", "LIEGEN", "TOT"]
const GEGNER_ANKUENDIGUNG: Array = ["KAMPFHALTUNG", "ZIELEN", "ANKUENDIGUNG"]


## Rechteck eines Körpers relativ zum Fußpunkt.
class Koerper:
	var links: int = 0
	var oben: int = 0
	var breite: int = 0
	var hoehe: int = 0


## Rechteck des Körpers zum Umriss (Breite × Höhe mit Schatten, Dictionary
## breite/hoehe/schatten) und zur Form.
static func koerperRechteck(l: Lage, u: Dictionary, form: String) -> Koerper:
	var breite: int = u["breite"]
	var hoehe: int = (u["hoehe"] as int) - SCHATTEN_HALB
	if form == "liegend":
		breite = (u["hoehe"] as int) - SCHATTEN_HALB
		hoehe = KernFestkomma.divGanz(u["breite"] as int, DarstellungMasse.LIEGEND_TEILER)
	elif form == "hocke":
		hoehe = KernFestkomma.divGanz((u["hoehe"] as int) * DarstellungMasse.HOCKE_ZAEHLER, DarstellungMasse.HOCKE_NENNER) - SCHATTEN_HALB
	var r: Koerper = Koerper.new()
	r.links = l.x - KernFestkomma.divGanz(breite, 2)
	r.oben = l.fuss - hoehe
	r.breite = breite
	r.hoehe = hoehe
	return r


static func zeichneKoerper(zn: DarstellungZeichner, r: Koerper, farbe: Color, blick: int, form: String, blinkAus: bool) -> void:
	if blinkAus:
		rahmen(zn, r.links, r.oben, r.breite, r.hoehe, farbe)
	else:
		zn.rechteck(r.links, r.oben, r.breite, r.hoehe, farbe)
		rahmen(zn, r.links, r.oben, r.breite, r.hoehe, DarstellungMasse.FARBE.kontur)
	# Blickrichtung als Dreieck an der Vorderkante
	var vorne: int = r.links + r.breite if blick == 1 else r.links
	var y: int = r.oben + KernFestkomma.divGanz(r.hoehe, 2) if form == "liegend" else r.oben + DarstellungMasse.BLICK_OBEN
	zn.vieleck(
		[
			Vector2(vorne, y - DarstellungMasse.BLICK_HALB),
			Vector2(vorne + blick * DarstellungMasse.BLICK_LAENGE, y),
			Vector2(vorne, y + DarstellungMasse.BLICK_HALB),
		],
		DarstellungMasse.FARBE.text
	)


static func schatten(zn: DarstellungZeichner, l: Lage, breite: float, hoehe: float = DarstellungMasse.SCHATTEN_HOEHE) -> void:
	zn.ellipse(l.x, l.schatten, breite / 2.0, hoehe / 2.0, DarstellungMasse.FARBE.schatten)


## Zustandsfarbe der Figur (Auftrag 3, 2.5): Stand, Angriff aktiv, Getroffen, Liegen; Schutz blinkt.
static func figurFarbe(f: KernEntitaeten.Figur) -> Color:
	var farbe: Dictionary = DarstellungMasse.FARBE
	if f.aktion == "GETROFFEN":
		return farbe.getroffen
	if FIGUR_LIEGEND.has(f.aktion) or f.aktion == "AUFSTEHEN":
		return farbe.liegen
	if f.angriff != null and f.angriff.aktiv:
		return farbe.angriff_aktiv
	if f.angriff != null:
		return farbe.angriff
	if FIGUR_GRIFF.has(f.aktion):
		return farbe.griff
	return farbe.figur


static func figurForm(f: KernEntitaeten.Figur) -> String:
	if FIGUR_LIEGEND.has(f.aktion):
		return "liegend"
	if f.aktion == "AUFSTEHEN":
		return "hocke"
	return "stand"


## Schutz blinkend: in jedem zweiten Paar von Frames nur der Rahmen (Kampf 6.3: zustand 3 mit schutz > 0).
static func schutzBlinkt(f: KernEntitaeten.Figur, frame: int) -> bool:
	return f.schutz > 0 and f.zustand == KernEntitaeten.ZUSTAND_REAKTION and ((frame >> 1) & 1) == 1


## Rechteck der Figur im Bild (auch für die Debug-Anzeige).
static func figurRechteck(k: Kamera, f: KernEntitaeten.Figur) -> Koerper:
	return koerperRechteck(lageVon(k, f), DarstellungMasse.UMRISS_FIGUR, figurForm(f))


static func zeichneFigur(zn: DarstellungZeichner, k: Kamera, f: KernEntitaeten.Figur, frame: int) -> void:
	var form: String = figurForm(f)
	var r: Koerper = koerperRechteck(lageVon(k, f), DarstellungMasse.UMRISS_FIGUR, form)
	var blinkAus: bool = schutzBlinkt(f, frame)
	zeichneKoerper(zn, r, figurFarbe(f), f.blick, form, blinkAus)
	if f.aktion == "SPRINT":
		# Bewegungsstriche hinter der Figur
		var sp: Dictionary = DarstellungMasse.SPRINT_STRICHE
		var hinten: int
		if f.blick == 1:
			hinten = r.links - (sp["abstand"] as int) - (sp["laenge"] as int)
		else:
			hinten = r.links + r.breite + (sp["abstand"] as int)
		for i in range(1, (sp["anzahl"] as int) + 1):
			var y: int = r.oben + i * (sp["zeile"] as int)
			zn.linie(hinten, y, hinten + (sp["laenge"] as int) - 1, y, DarstellungMasse.FARBE.sprint)
	if f.waffe == "RW" and form == "stand":
		var wh: Dictionary = DarstellungMasse.WAFFE_HAND
		var x: int
		if f.blick == 1:
			x = r.links + r.breite - (wh["laenge"] as int) + DarstellungMasse.BLICK_LAENGE
		else:
			x = r.links - DarstellungMasse.BLICK_LAENGE
		zn.rechteck(x, r.oben + (wh["oben"] as int), wh["laenge"] as int, wh["hoehe"] as int, DarstellungMasse.FARBE.waffe)


## Zustandsfarbe eines Gegners: Reaktionen, Angriff, Ankündigung, sonst die Farbe des Typs.
static func gegnerFarbe(g: KernEntitaeten.Gegner) -> Color:
	var farbe: Dictionary = DarstellungMasse.FARBE
	if g.modus == "GETROFFEN":
		return farbe.getroffen
	if GEGNER_LIEGEND.has(g.modus) or g.modus == "AUFSTEHEN":
		return farbe.liegen
	if g.modus == "GEHALTEN":
		return farbe.gehalten
	if g.angriff != null and g.angriff.aktiv:
		return farbe.angriff_aktiv
	if g.angriff != null or g.modus == "ANGRIFF" or g.modus == "SCHUSS" or g.modus == "STOSS":
		return farbe.angriff
	if GEGNER_ANKUENDIGUNG.has(g.modus):
		return farbe.ankuendigung
	if g.modus == "WARTEN":
		return farbe.wartend
	if g.typ == "":
		return farbe.wartend
	return (farbe.gegner as Dictionary)[g.typ]


static func gegnerForm(g: KernEntitaeten.Gegner) -> String:
	if GEGNER_LIEGEND.has(g.modus):
		return "liegend"
	if g.modus == "AUFSTEHEN" or g.modus == "WARTEN":
		return "hocke"
	return "stand"


## Wird der Gegner gezeichnet? Belegt, im aktiven Fenster (Welt 4.1), wartend nur hockend (Welt 4.2).
static func gegnerSichtbar(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if not g.belegt or g.typ == "":
		return false
	if not KernEntitaeten.imFenster(g, welt.kamera.x):
		return false
	if g.modus == "WARTEN" and g.auftritt != "hocke":
		return false
	return true


static func gegnerUmriss(g: KernEntitaeten.Gegner) -> Dictionary:
	if g.typ == "":
		return DarstellungMasse.UMRISS_GEGNER["Bolzer"]
	return DarstellungMasse.UMRISS_GEGNER[g.typ]


## Rechteck eines Gegners im Bild (auch für die Debug-Anzeige).
static func gegnerRechteck(k: Kamera, g: KernEntitaeten.Gegner) -> Koerper:
	return koerperRechteck(lageVon(k, g), gegnerUmriss(g), gegnerForm(g))


static func zeichneGegner(zn: DarstellungZeichner, k: Kamera, g: KernEntitaeten.Gegner) -> void:
	var form: String = gegnerForm(g)
	zeichneKoerper(zn, koerperRechteck(lageVon(k, g), gegnerUmriss(g), form), gegnerFarbe(g), g.blick, form, false)


# ===========================================================================
# Objekte und Geschosse (Kampf 3, 10; Welt 6, 9)
# ===========================================================================

## Größe eines Objekts im Bild (Dictionary breite/hoehe), null = nicht zeichnen.
static func objektMass(o: KernEntitaeten.Objekt) -> Variant:
	match o.typ:
		"Behälter":
			return {"breite": KernWerte.BEHAELTER_HALB_X * 2, "hoehe": DarstellungMasse.TRUEMMER_HOEHE if o.zerbrochen else KernWerte.BEHAELTER_HOEHE}
		"Gegenstand":
			if o.art == "" or o.art == "Fass" or o.art == "Bosskiste":
				return null
			return DarstellungMasse.UMRISS_GEGENSTAND[o.art]
		"Waffe":
			return DarstellungMasse.UMRISS_WAFFE
		"Rakete":
			if o.flugphase == "EXPLOSION":
				return {"breite": (DarstellungMasse.EXPLOSION["rx"] as int) * 2, "hoehe": (DarstellungMasse.EXPLOSION["ry"] as int) * 2}
			return DarstellungMasse.UMRISS_RAKETE
		"Effekt":
			return {"breite": DarstellungMasse.UMRISS_EFFEKT, "hoehe": DarstellungMasse.UMRISS_EFFEKT}
		_:
			return null


static func objektFarbe(o: KernEntitaeten.Objekt) -> Color:
	var farbe: Dictionary = DarstellungMasse.FARBE
	match o.typ:
		"Behälter":
			if o.zerbrochen:
				return farbe.truemmer
			return farbe.bosskiste if o.art == "Bosskiste" else farbe.fass
		"Gegenstand":
			if o.art == "" or o.art == "Fass" or o.art == "Bosskiste":
				return farbe.effekt
			return (farbe.gegenstand as Dictionary)[o.art]
		"Waffe":
			return farbe.waffe
		"Rakete":
			return farbe.explosion if o.flugphase == "EXPLOSION" else farbe.rakete
		_:
			return farbe.effekt


## Wird das Objekt gezeichnet? Belegt und sichtbar (Blinken der Liegezeit, Welt 9.3).
static func objektSichtbar(o: KernEntitaeten.Objekt) -> bool:
	return o.belegt and o.sichtbar and objektMass(o) != null


static func objektSchatten(zn: DarstellungZeichner, k: Kamera, o: KernEntitaeten.Objekt) -> void:
	var m: Variant = objektMass(o)
	if m == null or (o.typ == "Rakete" and o.flugphase == "EXPLOSION"):
		return
	schatten(zn, lageVon(k, o), (m as Dictionary)["breite"] as int, float(DarstellungMasse.SCHATTEN_HOEHE) / DarstellungMasse.SCHATTEN_KLEIN_TEILER)


static func zeichneObjekt(zn: DarstellungZeichner, k: Kamera, o: KernEntitaeten.Objekt) -> void:
	var mv: Variant = objektMass(o)
	if mv == null:
		return
	var m: Dictionary = mv
	var breite: int = m["breite"]
	var hoehe: int = m["hoehe"]
	var l: Lage = lageVon(k, o)
	var farbe: Color = objektFarbe(o)
	if o.typ == "Rakete" and o.flugphase == "EXPLOSION":
		zn.ellipse(l.x, l.fuss - (DarstellungMasse.EXPLOSION["ry"] as int), DarstellungMasse.EXPLOSION["rx"] as int, DarstellungMasse.EXPLOSION["ry"] as int, farbe)
		return
	var links: int = l.x - KernFestkomma.divGanz(breite, 2)
	var oben: int = l.fuss - hoehe
	zn.rechteck(links, oben, breite, hoehe, farbe)
	rahmen(zn, links, oben, breite, hoehe, DarstellungMasse.FARBE.kontur)
	if o.typ == "Rakete":
		# Spitze in Flugrichtung
		var vorne: int = links + breite if o.bahn_richtung == 1 else links
		var halb: int = KernFestkomma.divGanz(hoehe, 2)
		zn.vieleck(
			[
				Vector2(vorne, oben),
				Vector2(vorne + o.bahn_richtung * halb, oben + halb),
				Vector2(vorne, oben + hoehe),
			],
			farbe
		)


# ===========================================================================
# Szene in Zeichenreihenfolge (Kampf 2.5)
# ===========================================================================

## Rang bei gleicher Tiefe (Kampf 2.5): Behälter, Gegenstände, Gegner, Figur, Geschosse und Effekte.
const RANG_BEHAELTER: int = 0
const RANG_GEGENSTAND: int = 1
const RANG_GEGNER: int = 2
const RANG_FIGUR: int = 3
const RANG_GESCHOSS: int = 4
const RANG_EFFEKT: int = 5


## Ein Stück der Szene (statt der Rückrufe der TypeScript-Fassung: art wählt
## die Zeichenfunktion, e ist die Entität): art "figur", "gegner" oder "objekt".
class Stueck:
	var z: int = 0
	var rang: int = 0
	var nr: int = 0
	var art: String = ""
	var e: KernEntitaeten.EntitaetBasis = null


static func objektRang(o: KernEntitaeten.Objekt) -> int:
	if o.typ == "Behälter":
		return RANG_BEHAELTER
	if o.typ == "Gegenstand" or o.typ == "Waffe":
		return RANG_GEGENSTAND
	return RANG_GESCHOSS


static func stueckNeu(art: String, e: KernEntitaeten.EntitaetBasis, rang: int) -> Stueck:
	var s: Stueck = Stueck.new()
	s.z = KernFestkomma.ganz(e.z)
	s.rang = rang
	s.nr = e.nr
	s.art = art
	s.e = e
	return s


## Kommt a vor b? hinten zuerst (⌊z⌋ absteigend), dann Rang, dann Slotnummer aufsteigend.
static func stueckVor(a: Stueck, b: Stueck) -> bool:
	if a.z != b.z:
		return a.z > b.z
	if a.rang != b.rang:
		return a.rang < b.rang
	return a.nr < b.nr


## Alle sichtbaren Stücke der Szene in Zeichenreihenfolge (stabil sortiert wie
## Array.prototype.sort).
static func stuecke(welt: KernWelt) -> Array:
	var liste: Array = []
	liste.append(stueckNeu("figur", welt.figur, RANG_FIGUR))
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not gegnerSichtbar(welt, g):
			continue
		liste.append(stueckNeu("gegner", g, RANG_GEGNER))
	var objekte: Array = []
	objekte.append_array(welt.objekte)
	objekte.append_array(welt.geschosse)
	for o: KernEntitaeten.Objekt in objekte:
		if not objektSichtbar(o):
			continue
		liste.append(stueckNeu("objekt", o, objektRang(o)))
	# stabiler Einfügesort
	for i in range(1, liste.size()):
		var s: Stueck = liste[i]
		var j: int = i - 1
		while j >= 0 and stueckVor(s, liste[j]):
			liste[j + 1] = liste[j]
			j -= 1
		liste[j + 1] = s
	return liste


static func stueckSchatten(zn: DarstellungZeichner, k: Kamera, s: Stueck) -> void:
	match s.art:
		"figur":
			schatten(zn, lageVon(k, s.e), DarstellungMasse.UMRISS_FIGUR["schatten"] as int)
		"gegner":
			schatten(zn, lageVon(k, s.e), gegnerUmriss(s.e as KernEntitaeten.Gegner)["schatten"] as int)
		"objekt":
			objektSchatten(zn, k, s.e as KernEntitaeten.Objekt)


static func stueckZeichne(zn: DarstellungZeichner, k: Kamera, welt: KernWelt, s: Stueck) -> void:
	match s.art:
		"figur":
			zeichneFigur(zn, k, s.e as KernEntitaeten.Figur, welt.frame)
		"gegner":
			zeichneGegner(zn, k, s.e as KernEntitaeten.Gegner)
		"objekt":
			zeichneObjekt(zn, k, s.e as KernEntitaeten.Objekt)


## Index der Figur in der Stückliste.
static func figurIndex(liste: Array) -> int:
	for i in range(liste.size()):
		if (liste[i] as Stueck).art == "figur":
			return i
	return liste.size()


## Zeichnet Hintergrund, Schatten, Objekte und Vordergrund mit Bildschütteln
## (KA10). ohne_figur: der Körper der Figur wird ausgelassen (Schatten bleibt).
static func zeichneSzene(zn: DarstellungZeichner, welt: KernWelt, ohne_figur: bool = false) -> void:
	var k: Kamera = kameraVon(welt)
	zn.sichern()
	zn.verschieben(welt.kamera.schuetteln_x, welt.kamera.schuetteln_y)
	zeichneHintergrund(zn, welt, k)
	var liste: Array = stuecke(welt)
	for s: Stueck in liste:
		stueckSchatten(zn, k, s)
	for s: Stueck in liste:
		if ohne_figur and s.art == "figur":
			continue
		stueckZeichne(zn, k, welt, s)
	zeichneVordergrund(zn, welt, k)
	zn.zurueck()


## Hintere Hälfte der Szene: Hintergrund, alle Schatten, die Stücke bis vor
## die Figur (bei figur_extern false einschließlich der Figur).
static func zeichneSzeneHinten(zn: DarstellungZeichner, welt: KernWelt, figur_extern: bool) -> void:
	var k: Kamera = kameraVon(welt)
	zn.sichern()
	zn.verschieben(welt.kamera.schuetteln_x, welt.kamera.schuetteln_y)
	zeichneHintergrund(zn, welt, k)
	var liste: Array = stuecke(welt)
	for s: Stueck in liste:
		stueckSchatten(zn, k, s)
	var fi: int = figurIndex(liste)
	var bis: int = fi if figur_extern else fi + 1
	for i in range(bis):
		stueckZeichne(zn, k, welt, liste[i])
	zn.zurueck()


## Vordere Hälfte der Szene: die Stücke nach der Figur und der Vordergrund.
static func zeichneSzeneVorn(zn: DarstellungZeichner, welt: KernWelt, figur_extern: bool) -> void:
	var k: Kamera = kameraVon(welt)
	zn.sichern()
	zn.verschieben(welt.kamera.schuetteln_x, welt.kamera.schuetteln_y)
	var liste: Array = stuecke(welt)
	var fi: int = figurIndex(liste)
	for i in range(fi + 1, liste.size()):
		stueckZeichne(zn, k, welt, liste[i])
	zeichneVordergrund(zn, welt, k)
	zn.zurueck()


## Zweiteilige Szene: hinten die Stücke vor der Figur (mit Hintergrund und allen
## Schatten), vorn die Stücke danach und der Vordergrund. Mit figur_extern
## fehlt der Körper der Figur (Puppe zwischen den Ebenen), ohne zeichnet der
## hintere Teil die Figur in der Originalreihenfolge.
static func zeichneSzeneTeil(zn_hinten: DarstellungZeichner, zn_vorn: DarstellungZeichner, welt: KernWelt, figur_extern: bool) -> void:
	zeichneSzeneHinten(zn_hinten, welt, figur_extern)
	zeichneSzeneVorn(zn_vorn, welt, figur_extern)


# ===========================================================================
# Blende, Anzeigeleiste, Texte (Welt 10)
# ===========================================================================

## Abdunklung der Blende (KA13, Welt 10.5) nach anzeige(welt).blende: 0 offen bis BLENDE_ZU schwarz.
static func zeichneBlende(zn: DarstellungZeichner, a: KernRahmen.AnzeigeDaten) -> void:
	if a.blende <= 0:
		return
	zn.deckkraft(minf(1.0, float(a.blende) / KernWerte.BLENDE_ZU))
	zn.rechteck(0, 0, KernWerte.BILD_BREITE, KernWerte.BILD_HOEHE, DarstellungMasse.FARBE.rand)
	zn.deckkraft(1.0)


static func zeichneBalken(zn: DarstellungZeichner, lage: Dictionary, b: KernRahmen.Balken) -> void:
	var farbe: Dictionary = DarstellungMasse.FARBE
	var x0: int = lage["x0"]
	var zeile0: int = lage["zeile0"]
	var breite: int = (lage["x1"] as int) - x0 + 1
	var hoehe: int = (lage["zeile1"] as int) - zeile0 + 1
	zn.rechteck(x0 - 1, zeile0 - 1, breite + 2, hoehe + 2, farbe.balken_rand)
	zn.rechteck(x0, zeile0, breite, hoehe, farbe.balken_grund)
	var lagen: Array = farbe.lagen
	if b.unterlage > 0:
		zn.rechteck(x0, zeile0, breite, hoehe, lagen[mini(b.unterlage, lagen.size() - 1)])
	if b.breite > 0:
		zn.rechteck(x0, zeile0, mini(b.breite, breite), hoehe, lagen[mini(b.lage, lagen.size() - 1)])


static func zeichnePfeil(zn: DarstellungZeichner) -> void:
	var p: Dictionary = KernWerte.ANZEIGE["pfeil"]
	var zeile0: int = p["zeile0"]
	var zeile1: int = p["zeile1"]
	var x0: int = p["x0"]
	var x1: int = p["x1"]
	var mitte: int = KernFestkomma.divGanz(zeile0 + zeile1, 2)
	var hoehe: int = zeile1 - zeile0
	var spitze: int = KernFestkomma.divGanz(hoehe, 2)
	var schaft: int = KernFestkomma.divGanz(hoehe, DarstellungMasse.PFEIL_SCHAFT_TEILER)
	zn.rechteck(x0, mitte - schaft, x1 - x0 - spitze, schaft * 2, DarstellungMasse.FARBE.pfeil)
	zn.vieleck(
		[
			Vector2(x1 - spitze, zeile0),
			Vector2(x1, mitte),
			Vector2(x1 - spitze, zeile1),
		],
		DarstellungMasse.FARBE.pfeil
	)


## Anzeigeleiste nach Welt 10.1: Name, Punkte, Leben, LP-Balken, Gegneranzeige, Pfeil „weiter“.
static func zeichneAnzeige(zn: DarstellungZeichner, a: KernRahmen.AnzeigeDaten) -> void:
	var anz: Dictionary = KernWerte.ANZEIGE
	var farbe: Dictionary = DarstellungMasse.FARBE
	var s7: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_5X7
	zn.text(s7, a.name, (anz["name"] as Dictionary)["x"] as int, (anz["name"] as Dictionary)["zeile"] as int, farbe.text)
	zn.text(s7, a.punkte, (anz["punkte"] as Dictionary)["x"] as int, (anz["punkte"] as Dictionary)["zeile"] as int, farbe.text)
	var leben: Dictionary = anz["leben"]
	zn.rechteck(leben["x"] as int, leben["zeile"] as int, (DarstellungMasse.LEBEN_SYMBOL["breite"] as int), (DarstellungMasse.LEBEN_SYMBOL["hoehe"] as int), farbe.figur)
	zn.text(s7, str(a.leben), (leben["x"] as int) + DarstellungMasse.LEBEN_ABSTAND, leben["zeile"] as int, farbe.text)
	zeichneBalken(zn, anz["lp_balken"], a.figur)
	if a.gegner != null:
		var gg: Dictionary = a.gegner
		zn.text(s7, gg["name"] as String, (anz["gegner_name"] as Dictionary)["x"] as int, (anz["gegner_name"] as Dictionary)["zeile"] as int, farbe.text)
		zeichneBalken(zn, anz["gegner_balken"], gg["balken"] as KernRahmen.Balken)
	if a.pfeil:
		zeichnePfeil(zn)


## Große Texte in der Bildmitte (PAUSE, STAGE CLEAR, GAME OVER) mit dunklem Kasten.
static func zeichneGrosseTexte(zn: DarstellungZeichner, zeilen: Array) -> void:
	if zeilen.size() == 0:
		return
	var s7: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_5X7
	var gesamt: int = zeilen.size() * DarstellungMasse.GROSS_ZEILE
	var y: int = KernFestkomma.divGanz(KernWerte.BILD_HOEHE - gesamt, 2)
	var breiteste: int = 0
	for zeile: String in zeilen:
		breiteste = maxi(breiteste, DarstellungSchrift.textBreite(s7, zeile, DarstellungMasse.GROSS_FAKTOR))
	var kx: int = KernFestkomma.divGanz(KernWerte.BILD_BREITE - breiteste, 2) - DarstellungMasse.TEXTKASTEN_RAND
	zn.rechteck(kx, y - DarstellungMasse.TEXTKASTEN_RAND, breiteste + DarstellungMasse.TEXTKASTEN_RAND * 2, gesamt + DarstellungMasse.TEXTKASTEN_RAND, DarstellungMasse.FARBE.textkasten)
	for zeile: String in zeilen:
		var b: int = DarstellungSchrift.textBreite(s7, zeile, DarstellungMasse.GROSS_FAKTOR)
		zn.text(s7, zeile, KernFestkomma.divGanz(KernWerte.BILD_BREITE - b, 2), y, DarstellungMasse.FARBE.text, DarstellungMasse.GROSS_FAKTOR)
		y += DarstellungMasse.GROSS_ZEILE


## Hinweis „AUFZ“ oben rechts, solange die Eingabeaufzeichnung läuft (F2).
static func zeichneAufzeichnung(zn: DarstellungZeichner) -> void:
	var inhalt: String = "AUFZ"
	var s7: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_5X7
	var lage: Dictionary = DarstellungMasse.AUFZEICHNUNG_LAGE
	var b: int = DarstellungSchrift.textBreite(s7, inhalt)
	var x: int = KernWerte.BILD_BREITE - (lage["rechts"] as int) - b
	zn.rechteck(x - DarstellungMasse.LEBEN_ABSTAND, (lage["zeile"] as int) + 1, DarstellungMasse.LEBEN_SYMBOL["breite"] as int, DarstellungMasse.LEBEN_SYMBOL["breite"] as int, DarstellungMasse.FARBE.aufzeichnung)
	zn.text(s7, inhalt, x, lage["zeile"] as int, DarstellungMasse.FARBE.aufzeichnung)


## Hinweiszeilen unten links (Schrift 3 × 5, dunkler Grund); nur Godot-Fassung
## (Pfad der gespeicherten Aufzeichnung). Lange Zeilen werden umbrochen.
static func zeichneHinweis(zn: DarstellungZeichner, text: String) -> void:
	if text == "":
		return
	var s3: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_3X5
	var hw: Dictionary = DarstellungMasse.HINWEIS
	var maximal: int = KernFestkomma.divGanz(KernWerte.BILD_BREITE - (hw["x"] as int) * 2, s3.vorschub)
	var zeilen: Array = []
	var i: int = 0
	while i < text.length():
		zeilen.append(text.substr(i, maximal))
		i += maximal
	var y: int = KernWerte.BILD_HOEHE - (hw["unten"] as int) - (zeilen.size() - 1) * (hw["abstand"] as int)
	for z: String in zeilen:
		var b: int = DarstellungSchrift.textBreite(s3, z)
		zn.rechteck((hw["x"] as int) - 1, y - 1, b + 2, s3.hoehe + 2, DarstellungMasse.FARBE.debug_grund)
		zn.text(s3, z, hw["x"] as int, y, DarstellungMasse.FARBE.debug_text)
		y += hw["abstand"] as int


## Zustand der Darstellung außerhalb der Logik.
class Ansicht:
	var pause: bool = false
	var aufzeichnung: bool = false
	## Hinweis unten links (leer = keiner)
	var hinweis: String = ""


## Ein ganzes Bild ohne Debug-Anzeige: Szene, Blende, Anzeige. Gibt die
## Anzeige-Daten zurück (für die Debug-Anzeige danach). ohne_figur: Körper der
## Figur auslassen (siehe zeichneSzene).
static func zeichneBild(zn: DarstellungZeichner, welt: KernWelt, ohne_figur: bool = false) -> KernRahmen.AnzeigeDaten:
	zn.beginne()
	var a: KernRahmen.AnzeigeDaten = KernRahmen.anzeige(welt)
	zeichneSzene(zn, welt, ohne_figur)
	zeichneBlende(zn, a)
	zeichneAnzeige(zn, a)
	return a


## Ein ganzes Bild in zwei Ebenen: Szene wie zeichneSzeneTeil, Blende und
## Anzeige auf zn_vorn. Gibt die Anzeige-Daten zurück.
static func zeichneBildTeil(zn_hinten: DarstellungZeichner, zn_vorn: DarstellungZeichner, welt: KernWelt, figur_extern: bool) -> KernRahmen.AnzeigeDaten:
	zn_hinten.beginne()
	zn_vorn.beginne()
	var a: KernRahmen.AnzeigeDaten = KernRahmen.anzeige(welt)
	zeichneSzeneTeil(zn_hinten, zn_vorn, welt, figur_extern)
	zeichneBlende(zn_vorn, a)
	zeichneAnzeige(zn_vorn, a)
	return a


## Hintere Ebene für sich (eigener Knoten mit eigenem _draw).
static func zeichneBildHinten(zn: DarstellungZeichner, welt: KernWelt, figur_extern: bool) -> void:
	zn.beginne()
	zeichneSzeneHinten(zn, welt, figur_extern)


## Vordere Ebene für sich: Stücke nach der Figur, Vordergrund, Blende, Anzeige.
## Gibt die Anzeige-Daten zurück.
static func zeichneBildVorn(zn: DarstellungZeichner, welt: KernWelt, figur_extern: bool) -> KernRahmen.AnzeigeDaten:
	zn.beginne()
	var a: KernRahmen.AnzeigeDaten = KernRahmen.anzeige(welt)
	zeichneSzeneVorn(zn, welt, figur_extern)
	zeichneBlende(zn, a)
	zeichneAnzeige(zn, a)
	return a


## Texte über allem (nach der Debug-Anzeige): STAGE CLEAR, GAME OVER, PAUSE, Aufzeichnung, Hinweis.
static func zeichneObersteEbene(zn: DarstellungZeichner, a: KernRahmen.AnzeigeDaten, ansicht: Ansicht) -> void:
	var zeilen: Array = a.texte.duplicate()
	if ansicht.pause:
		zeilen.append("PAUSE")
	zeichneGrosseTexte(zn, zeilen)
	if ansicht.aufzeichnung:
		zeichneAufzeichnung(zn)
	zeichneHinweis(zn, ansicht.hinweis)
