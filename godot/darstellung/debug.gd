# Debug-Anzeige (Taste F1) nach docs/spezifikation-welt.md, 10.6 und
# Auftrag 3, 2.5. Port von spiel/src/darstellung/debug.ts. Sie liest nur die
# Welt, wird nicht aufgezeichnet und ändert weder Logik noch Protokoll. Sie
# zeichnet in Spielpixeln (Linien und Schrift 3 × 5 je Spielpixel, über die
# Zeichenklasse; Auftrag 5).
#
# Inhalt:
#   Text: Frame, T(f), Rang und Rang-Uhr, Seed und Ziehungen, K, Ky,
#         Kameramodus, Bildschütteln, aktives Fenster, Halter der Rechte,
#         Lebende, Wellen, Phase, Steuerung, Zustand der Figur, Ereignisse.
#   Welt: Trefferflächen aller Angriffsinstanzen als Kästen in x/z mit Höhe
#         (aktiv kräftig, sonst gestrichelt), Treffer des Frames, Zielpunkte
#         und Abbruchfenster der Gegner, Zustandsnamen, Seite, Recht,
#         Aufnahmebereiche, Grundflächen der Behälter, Hindernisse,
#         Folgepunkt, Totzone der Arena.
class_name DarstellungDebug
extends RefCounted


## Angaben außerhalb der Welt für die Debug-Anzeige.
class DebugInfo:
	var seed_wert: int = 0
	## gehaltene Spieltasten (Tastatur)
	var tasten: int = 0
	## "tastatur" oder "eingabe"
	var quelle: String = "tastatur"
	var pause: bool = false


# ===========================================================================
# Hilfen
# ===========================================================================

static func kasten(zn: DarstellungZeichner, x0: float, y0: float, x1: float, y1: float, farbe: Color, gestrichelt: bool) -> void:
	zn.umriss(minf(x0, x1), minf(y0, y1), absf(x1 - x0), absf(y1 - y0), farbe, DarstellungMasse.STRICH if gestrichelt else null)


static func strich(zn: DarstellungZeichner, x0: float, y0: float, x1: float, y1: float, farbe: Color, gestrichelt: bool = false) -> void:
	zn.linie(x0, y0, x1, y1, farbe, DarstellungMasse.STRICH if gestrichelt else null)


static func kreuz(zn: DarstellungZeichner, x: float, y: float, farbe: Color) -> void:
	var z: int = DarstellungMasse.ZIELKREUZ
	strich(zn, x - z, y - z, x + z, y + z, farbe)
	strich(zn, x - z, y + z, x + z, y - z, farbe)


## Text mit dunklem Grund, damit er auf jeder Fläche lesbar ist.
static func marke(zn: DarstellungZeichner, inhalt: String, x: float, y: float, farbe: Color) -> void:
	var s3: DarstellungSchrift.Schrift = DarstellungSchrift.SCHRIFT_3X5
	var b: int = DarstellungSchrift.textBreite(s3, inhalt)
	zn.rechteck(floori(x + 0.5) - 1, floori(y + 0.5) - 1, b + 2, s3.hoehe + 2, DarstellungMasse.FARBE.debug_grund)
	zn.text(s3, inhalt, x, y, farbe)


## Marken über einem Körper; die letzte Zeile steht direkt über dem Umriss.
static func markenUeber(zn: DarstellungZeichner, r: DarstellungZeichnen.Koerper, zeilen: Array, farbe: Color) -> void:
	var dm: Dictionary = DarstellungMasse.DEBUG_MARKE
	var y: int = r.oben - (dm["ueber"] as int) - zeilen.size() * (dm["abstand"] as int)
	for z: String in zeilen:
		marke(zn, z, r.links, y, farbe)
		y += dm["abstand"] as int


static func leerOder(n: Variant) -> String:
	return "-" if n == null else "S%d" % (n as int)


# ===========================================================================
# Trefferflächen (Kampf 5.1; Flächenarten in entitaeten.gd, Prüfung in treffer.gd)
# ===========================================================================

## Bereich der Fußpunkte möglicher Ziele in x/z (ganze Pixel, Grenzen eingeschlossen) und Höhengrenze.
class Bereich:
	var x0: int = 0
	var x1: int = 0
	var z0: int = 0
	var z1: int = 0
	## Höhengrenze des Ziels oder null
	var hoehe: Variant = null


static func bereichNeu(x0: int, x1: int, z0: int, z1: int, hoehe: Variant) -> Bereich:
	var b: Bereich = Bereich.new()
	b.x0 = x0
	b.x1 = x1
	b.z0 = z0
	b.z1 = z1
	b.hoehe = hoehe
	return b


## Bereich einer Fläche zum Angreifer, wie inFlaeche (treffer.gd) ihn prüft:
## abstand: −hinten ≤ d_vorn ≤ vorn, |dz| ≤ tiefe; fenster: x_z − links bis
## x_z + rechts, dz_min bis dz_max, dazu d_vorn ≥ −hinten; punkt: um den
## festen Punkt in Richtung richtung; umkreis: |dx| ≤ halbbreite. gehalten
## und bild haben keinen Kasten (null).
static func flaechenBereich(welt: KernWelt, inst: KernEntitaeten.Angriffsinstanz, a: KernEntitaeten.EntitaetBasis) -> Variant:
	var fl: KernEntitaeten.Flaeche = inst.flaeche
	var ax: int = KernFestkomma.ganz(a.x)
	var az: int = KernFestkomma.ganz(a.z)
	match fl.art:
		"abstand":
			var x0: int = ax - fl.hinten if a.blick == 1 else ax - fl.vorn
			var x1: int = ax + fl.vorn if a.blick == 1 else ax + fl.hinten
			return bereichNeu(x0, x1, az - fl.tiefe, az + fl.tiefe, fl.hoehe_ziel_max)
		"fenster":
			var fx0: int = fl.x_z - fl.links
			var fx1: int = fl.x_z + fl.rechts
			if a.blick == 1:
				fx0 = maxi(fx0, ax - fl.hinten)
			else:
				fx1 = mini(fx1, ax + fl.hinten)
			return bereichNeu(fx0, fx1, az + fl.dz_min, az + fl.dz_max, fl.hoehe_ziel_max)
		"punkt":
			var px0: int = fl.x - fl.hinten if fl.richtung == 1 else fl.x - fl.vorn
			var px1: int = fl.x + fl.vorn if fl.richtung == 1 else fl.x + fl.hinten
			return bereichNeu(px0, px1, fl.z - fl.tiefe, fl.z + fl.tiefe, fl.hoehe_ziel_max)
		"umkreis":
			return bereichNeu(ax - fl.halbbreite, ax + fl.halbbreite, az - fl.tiefe, az + fl.tiefe, fl.hoehe_ziel_max)
		"bild":
			return bereichNeu(welt.kamera.x, welt.kamera.x + KernWerte.IM_BILD_MAX, az, az, null)
		"gehalten":
			return null
	return null


static func zeichneFlaeche(zn: DarstellungZeichner, welt: KernWelt, k: DarstellungZeichnen.Kamera, inst: KernEntitaeten.Angriffsinstanz) -> void:
	var farbe_dict: Dictionary = DarstellungMasse.FARBE
	var a: KernEntitaeten.EntitaetBasis = KernEntitaeten.entitaet(welt, inst.angreifer)
	if a == null or not a.belegt:
		return
	var farbe: Color
	if not inst.aktiv:
		farbe = farbe_dict.flaeche_inaktiv
	elif inst.gegen == "gegner":
		farbe = farbe_dict.flaeche_gegner
	else:
		farbe = farbe_dict.flaeche_figur
	var gestrichelt: bool = not inst.aktiv
	var dm: Dictionary = DarstellungMasse.DEBUG_MARKE
	if inst.flaeche.art == "gehalten":
		var ziel: KernEntitaeten.EntitaetBasis = null if inst.ziel == null else KernEntitaeten.entitaet(welt, inst.ziel as String)
		if ziel == null:
			return
		var la: DarstellungZeichnen.Lage = DarstellungZeichnen.lageVon(k, a)
		var lz: DarstellungZeichnen.Lage = DarstellungZeichnen.lageVon(k, ziel)
		strich(zn, la.x, la.schatten, lz.x, lz.schatten, farbe, gestrichelt)
		marke(zn, inst.code, lz.x, lz.schatten + (dm["ueber"] as int), farbe)
		return
	var bv: Variant = flaechenBereich(welt, inst, a)
	if bv == null:
		return
	var b: Bereich = bv
	if inst.flaeche.art == "bild":
		kasten(zn, 0, 0, KernWerte.BILD_BREITE - 1, KernWerte.BILD_HOEHE - 1, farbe, gestrichelt)
		marke(zn, "%s BILD" % inst.code, DarstellungMasse.DEBUG_TEXT["x"] as int, KernWerte.BILD_HOEHE - (DarstellungMasse.DEBUG_TEXT["abstand"] as int), farbe)
		return
	# Fußpunkte x0 … x1 und z0 … z1 eingeschlossen: Kasten bis zur Außenkante des letzten Pixels
	var sx0: int = DarstellungZeichnen.bildX(k, b.x0)
	var sx1: int = DarstellungZeichnen.bildX(k, b.x1) + 1
	var syVorn: int = DarstellungZeichnen.bildY(k, b.z0) + 1
	var syHinten: int = DarstellungZeichnen.bildY(k, b.z1)
	kasten(zn, sx0, syHinten, sx1, syVorn, farbe, gestrichelt)
	if b.hoehe != null and (b.hoehe as int) > 0:
		var hoehe: int = b.hoehe
		# Höhengrenze des Ziels als zweiter Kasten darüber, verbunden an den vorderen Ecken
		kasten(zn, sx0, syHinten - hoehe, sx1, syVorn - hoehe, farbe, true)
		strich(zn, sx0, syVorn, sx0, syVorn - hoehe, farbe, true)
		strich(zn, sx1, syVorn, sx1, syVorn - hoehe, farbe, true)
	# Kennung innen an der hinteren linken Ecke
	marke(zn, inst.code, sx0 + 1, syHinten + 1, farbe)


static func alleInstanzen(welt: KernWelt) -> Array:
	var liste: Array = []
	if welt.figur.angriff != null:
		liste.append(welt.figur.angriff)
	var alle: Array = []
	alle.append_array(welt.geschosse)
	alle.append_array(welt.gegner)
	alle.append_array(welt.objekte)
	for e: KernEntitaeten.EntitaetBasis in alle:
		if e.belegt and e.angriff != null:
			liste.append(e.angriff)
	return liste


# ===========================================================================
# Gegner, Objekte, Stage
# ===========================================================================

static func gegnerMarken(g: KernEntitaeten.Gegner) -> Array:
	var recht: String = " RECHT %s" % g.recht if g.recht != "" else ""
	var zielrecht: String = " ZIELRECHT" if g.zielrecht else ""
	var zeilen: Array = [
		"S%d %s T%d" % [g.nr, g.modus, g.modus_uhr],
		"%s LP %d SEITE %s%s%s" % [g.aktion, g.lp, KernEntitaeten.blickText(g.seite), recht, zielrecht],
	]
	if g.angriff_code != "":
		zeilen.append("%s Z %d SCHADEN %d" % [g.angriff_code, g.ziel_abstand, g.schaden])
	return zeilen


static func zeichneZielpunkt(zn: DarstellungZeichner, k: DarstellungZeichnen.Kamera, g: KernEntitaeten.Gegner) -> void:
	var zielpunkt: Color = DarstellungMasse.FARBE.zielpunkt
	if g.typ == "Zünder":
		if g.zielpunkt_x == 0 and g.zielpunkt_z == 0:
			return
		kreuz(zn, DarstellungZeichnen.bildX(k, g.zielpunkt_x), DarstellungZeichnen.bildY(k, g.zielpunkt_z), zielpunkt)
		return
	if g.ziel_x == 0:
		return
	var y: int = DarstellungZeichnen.bildY(k, KernFestkomma.ganz(g.z))
	var x: int = DarstellungZeichnen.bildX(k, g.ziel_x)
	kreuz(zn, x, y, zielpunkt)
	if g.typ == "Bolzer" or g.typ == "Rammbock":
		# Abbruchfenster nach Welt 5.4: x_Z − 32 bis x_Z + 31
		strich(zn, x - KernWerte.ABBRUCH_LINKS, y, x + KernWerte.ABBRUCH_RECHTS, y, zielpunkt, true)


static func zeichneAufnahme(zn: DarstellungZeichner, welt: KernWelt, k: DarstellungZeichnen.Kamera, o: KernEntitaeten.Objekt) -> void:
	if o.typ != "Gegenstand" or not o.aufnehmbar or o.art == "" or o.art == "Fass" or o.art == "Bosskiste":
		return
	var bereich: Dictionary = (KernWerte.AUFNEHMEN_BEREICH as Dictionary)[o.art]
	# Fußpunkte der Figur, von denen aus sie aufnimmt: d_vorn = (x_o − x_f) · Blick in −hinten … vorn
	var ox: int = KernFestkomma.ganz(o.x)
	var oz: int = KernFestkomma.ganz(o.z)
	var blick: int = welt.figur.blick
	var x0: int = ox - (bereich["vorn"] as int) if blick == 1 else ox - (bereich["hinten"] as int)
	var x1: int = ox + (bereich["hinten"] as int) if blick == 1 else ox + (bereich["vorn"] as int)
	kasten(
		zn,
		DarstellungZeichnen.bildX(k, x0),
		DarstellungZeichnen.bildY(k, oz + KernWerte.AUFNEHMEN_TIEFE),
		DarstellungZeichnen.bildX(k, x1) + 1,
		DarstellungZeichnen.bildY(k, oz - KernWerte.AUFNEHMEN_TIEFE) + 1,
		DarstellungMasse.FARBE.aufnahme,
		true
	)


static func zeichneBehaelterFlaeche(zn: DarstellungZeichner, k: DarstellungZeichnen.Kamera, o: KernEntitaeten.Objekt) -> void:
	if o.typ != "Behälter" or o.zerbrochen:
		return
	var x: int = KernFestkomma.ganz(o.x)
	var z: int = KernFestkomma.ganz(o.z)
	kasten(
		zn,
		DarstellungZeichnen.bildX(k, x - KernWerte.BEHAELTER_HALB_X),
		DarstellungZeichnen.bildY(k, z + KernWerte.BEHAELTER_HALB_Z),
		DarstellungZeichnen.bildX(k, x + KernWerte.BEHAELTER_HALB_X) + 1,
		DarstellungZeichnen.bildY(k, z - KernWerte.BEHAELTER_HALB_Z) + 1,
		DarstellungMasse.FARBE.hindernis,
		true
	)


# ===========================================================================
# Ebenen
# ===========================================================================

## Debug-Inhalte in Weltlage (mit Bildschütteln wie die Szene).
static func zeichneDebugWelt(zn: DarstellungZeichner, welt: KernWelt) -> void:
	var farbe: Dictionary = DarstellungMasse.FARBE
	var k: DarstellungZeichnen.Kamera = DarstellungZeichnen.kameraVon(welt)
	var dm: Dictionary = DarstellungMasse.DEBUG_MARKE
	zn.sichern()
	zn.verschieben(welt.kamera.schuetteln_x, welt.kamera.schuetteln_y)
	# Hindernisse und Grundflächen der Behälter
	for h: KernStage.Hindernis in welt.stage.hindernisse:
		DarstellungZeichnen.zeichneHindernis(zn, k, h, farbe.hindernis_flaeche)
	for o: KernEntitaeten.Objekt in welt.objekte:
		if o.belegt:
			zeichneBehaelterFlaeche(zn, k, o)
	# Folgepunkt (KA1) und Totzone der Arena (KA8)
	strich(zn, KernWerte.KAMERA_FOLGEPUNKT, 0, KernWerte.KAMERA_FOLGEPUNKT, KernWerte.BILD_HOEHE - 1, farbe.folgepunkt, true)
	if welt.stage.arena != null and welt.kamera.modus == "ARENA":
		var arena: KernStage.ArenaSatz = welt.stage.arena
		strich(zn, arena.totzone_links, 0, arena.totzone_links, KernWerte.BILD_HOEHE - 1, farbe.totzone, true)
		strich(zn, arena.totzone_rechts, 0, arena.totzone_rechts, KernWerte.BILD_HOEHE - 1, farbe.totzone, true)
	# Aufnahmebereiche, Zielpunkte
	for o: KernEntitaeten.Objekt in welt.objekte:
		if o.belegt:
			zeichneAufnahme(zn, welt, k, o)
	for g: KernEntitaeten.Gegner in welt.gegner:
		if DarstellungZeichnen.gegnerSichtbar(welt, g):
			zeichneZielpunkt(zn, k, g)
	# Trefferflächen aller Angriffsinstanzen
	for inst: KernEntitaeten.Angriffsinstanz in alleInstanzen(welt):
		zeichneFlaeche(zn, welt, k, inst)
	# Treffer dieses Frames: Ziel weiß umrahmt
	var zk: int = DarstellungMasse.ZIELKREUZ
	for t: KernEntitaeten.Treffer in welt.treffer:
		var ziel: KernEntitaeten.EntitaetBasis = KernEntitaeten.entitaet(welt, t.ziel)
		if ziel == null or not ziel.belegt:
			continue
		var l: DarstellungZeichnen.Lage = DarstellungZeichnen.lageVon(k, ziel)
		kasten(zn, l.x - zk * 2, l.fuss - zk * 2, l.x + zk * 2, l.fuss, farbe.treffer, false)
	# Zustandsnamen
	for g: KernEntitaeten.Gegner in welt.gegner:
		if DarstellungZeichnen.gegnerSichtbar(welt, g):
			markenUeber(zn, DarstellungZeichnen.gegnerRechteck(k, g), gegnerMarken(g), farbe.debug_text)
	var objekte: Array = []
	objekte.append_array(welt.objekte)
	objekte.append_array(welt.geschosse)
	for o: KernEntitaeten.Objekt in objekte:
		if not DarstellungZeichnen.objektSichtbar(o):
			continue
		var lo: DarstellungZeichnen.Lage = DarstellungZeichnen.lageVon(k, o)
		var art: String = o.art if o.art != "" else o.typ
		var phase: String = " %s" % o.flugphase if o.flugphase != "" else ""
		marke(zn, "%s %s%s" % [o.schluessel.to_upper(), art, phase], lo.x, lo.schatten + (dm["ueber"] as int), farbe.debug_text)
	# Figur: Marke unter dem Schatten, damit sie nicht mit den Marken der Gegner kollidiert
	var f: KernEntitaeten.Figur = welt.figur
	var lf: DarstellungZeichnen.Lage = DarstellungZeichnen.lageVon(k, f)
	var rf: DarstellungZeichnen.Koerper = DarstellungZeichnen.figurRechteck(k, f)
	var fphase: String = " %s" % f.phase if f.phase != "" else ""
	marke(zn, "F %s%s UHR %d" % [f.aktion, fphase, f.uhr], rf.links, lf.schatten + (dm["ueber"] as int) + (dm["abstand"] as int), farbe.debug_text)
	zn.zurueck()


## Bricht einen langen Text in Zeilen, die in die Bildbreite passen.
static func umbrechen(inhalt: String) -> Array:
	var maximal: int = KernFestkomma.divGanz(KernWerte.BILD_BREITE - (DarstellungMasse.DEBUG_TEXT["x"] as int) * 2, DarstellungSchrift.SCHRIFT_3X5.vorschub)
	var zeilen: Array = []
	var i: int = 0
	while i < inhalt.length():
		zeilen.append(inhalt.substr(i, maximal))
		i += maximal
	return zeilen


## Ganzzahlen eines Arrays mit Trenner verbinden.
static func verbinden(liste: Array, trenner: String) -> String:
	var teile: PackedStringArray = PackedStringArray()
	for x: Variant in liste:
		teile.append(str(x))
	return trenner.join(teile)


## Debug-Text oben links unter der Anzeigeleiste (ohne Bildschütteln).
static func zeichneDebugText(zn: DarstellungZeichner, welt: KernWelt, info: DebugInfo) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var k: KernWelt.KameraZustand = welt.kamera
	var r: KernWelt.RechteZustand = welt.rechte
	var t_text: String = KernTasten.tastenZuText(welt.eingabe.t)
	var gehalten: String = KernTasten.tastenZuText(info.tasten)
	var wellen: String = verbinden(welt.wellen.ausgeloest, "-")
	var zeilen: Array = [
		"FRAME %d  T %s  GEHALTEN %s  QUELLE %s%s" % [welt.frame, "-" if t_text == "" else t_text, "-" if gehalten == "" else gehalten, "EINGABEDATEI" if info.quelle == "eingabe" else "TASTATUR", "  PAUSE" if info.pause else ""],
		"RANG %d UHR %d%s  SEED %d ZIEHUNGEN %d" % [welt.rang.rang, welt.rang.zaehler, " FEST" if welt.rang.fest else "", info.seed_wert, welt.zufall.ziehungen],
		"K %d KY %d %s  SCHUETTELN %d/%d  FENSTER %d BIS %d" % [k.x, k.y, k.modus, k.schuetteln_x, k.schuetteln_y, k.x + KernWerte.FENSTER_LINKS, k.x + KernWerte.FENSTER_RECHTS],
		"RECHT L %s R %s ZIEL %s  LEBENDE %d  WELLEN %s" % [leerOder(r.l), leerOder(r.r), leerOder(r.ziel), welt.lebende, "-" if wellen == "" else wellen],
		"PHASE %s STEUERUNG %d  LEBEN %d  PUNKTE %d" % [welt.rahmen.phase, welt.rahmen.steuerung, welt.rahmen.leben, welt.rahmen.punkte],
		"FIGUR X %s Z %s H %s LP %d ZST %d SCHUTZ %d KOMBO %d STOPP %d SPRINT %d" % [KernFestkomma.zuDezimalText(f.x), KernFestkomma.zuDezimalText(f.z), KernFestkomma.zuDezimalText(f.h), f.lp, f.zustand, f.schutz, f.kombo, f.stopp, f.sprint_n],
	]
	if welt.ereignisse.size() > 0:
		zeilen.append_array(umbrechen("EREIGNIS %s" % verbinden(welt.ereignisse, " ")))
	var y: int = DarstellungMasse.DEBUG_TEXT["zeile"]
	for z: String in zeilen:
		marke(zn, z, DarstellungMasse.DEBUG_TEXT["x"] as int, y, DarstellungMasse.FARBE.debug_text)
		y += DarstellungMasse.DEBUG_TEXT["abstand"] as int
