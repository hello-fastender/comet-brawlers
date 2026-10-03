# Stage-Daten nach docs/spezifikation-welt.md, Abschnitt 2.
# Port von spiel/src/kern/stage.ts.
#
# Format (Welt 2.1): UTF-8, je Zeile ein Datensatz, zuerst die Satzart, dann
# Felder name=wert, getrennt durch Leerzeichen; # leitet einen Kommentar ein.
# Koordinaten sind ganze Pixel. Die Reihenfolge der gegner-Zeilen bestimmt
# die Slots (Welt 4.1), die der behaelter-Zeilen die Objektslots (Welt 9.1).
#
# Ergänzung K0 für die Prüfbühne (Kampf 11.2), im Satz stage:
#   kamera=fest   Kamera bleibt bei Kamera-x und Kamera-y des Starts
#   raender=aus   Welt 2.2 Punkt 4 (Bildränder und Stage-Ränder der Figur) gilt nicht
#
# Der Kern liest keine Dateien: parseStage nimmt den Text.
#
# Abweichungen des Ports von der TypeScript-Fassung:
# - throw (SyntaxError) wird zu push_error mit demselben Meldungstext; die
#   Funktion liefert danach einen unauffälligen Wert und macht weiter.
# - Die Fehlerrückrufe `fehler: () => Error` sind Callable, die den
#   Meldungstext (String) liefern.
# - `new Felder(zeile)` heißt felderNeu(zeile).
# - Die regulären Ausdrücke mit \s und trim() von JavaScript werden über die
#   Zeichenklasse LEERRAUM nachgebildet (trimmen, leerraumTrennen).
class_name KernStage
extends RefCounted

# ===========================================================================
# Typen
# ===========================================================================

## Zeichen, die JavaScript als Leerraum (\s, trim) behandelt.
const LEERRAUM: String = " \\t\\n\\x0b\\f\\r\\x{a0}\\x{1680}\\x{2000}-\\x{200a}\\x{2028}\\x{2029}\\x{202f}\\x{205f}\\x{3000}\\x{feff}"


## Tiefenband für x0 ≤ x < x1, Grenzen linear (Welt 2.1).
class Band:
	var x0: int = 0
	var x1: int = 0
	var unten0: int = 0
	var unten1: int = 0
	var oben0: int = 0
	var oben1: int = 0


## Ky als Funktion von K, linear, abgerundet (Welt 2.1).
class KameraYSatz:
	var k0: int = 0
	var k1: int = 0
	var y0: int = 0
	var y1: int = 0


## Punkt in der Ebene x/z.
class Punkt:
	var x: int = 0
	var z: int = 0


## Festes konvexes Vieleck in der Ebene x/z mit Höhe (Welt 2.1, 2.2).
class Hindernis:
	var id: String = ""
	## Array von Punkt
	var punkte: Array = []
	var hoehe: int = 0


## Vorder- oder Hintergrundbild, ohne Wirkung auf die Logik (Welt 2.1).
class BildSatz:
	var id: String = ""
	var x0: int = 0
	var x1: int = 0
	## Zeilen (vordergrund)
	var zeilen: int = 0
	## Bildname (hintergrund)
	var bild: String = ""


## Behälter (Welt 2.1, 9.2). art: BehaelterArt, inhalt: GegenstandArt oder 'leer'.
class BehaelterSatz:
	var id: String = ""
	var art: String = ""
	var x: int = 0
	var z: int = 0
	var inhalt: String = ""


## Vorplatzierter Gegner (Welt 2.1). typ: GegnerTyp, auftritt: Auftritt,
## werte: 'start' oder 'rang', blick: Blick (1 oder −1).
class GegnerSatz:
	var typ: String = ""
	var x: int = 0
	var z: int = 0
	var auftritt: String = ""
	var welle: int = 0
	var werte: String = ""
	var blick: int = 1


## Auslöser einer Welle (Welt 2.1, 4.4). ausloeser (Typ Ausloeser):
## 'kamera', 'figur_abstand', 'arena' oder 'boss_lp'.
class WelleSatz:
	var nr: int = 0
	var ausloeser: String = ""
	var wert: int = 0
	## Zusatzbedingung lebende ≤ n, null = keine
	var lebende_max: Variant = null
	var bonus: int = 0


## Neu erscheinender Gegner einer Welle (Welt 2.1).
class EintragSatz:
	var welle: int = 0
	var typ: String = ""
	var auftritt: String = ""
	var z: int = 0
	var verzoegerung: int = 0


## Sperre bis „Welle besiegt“ (Welt 2.1, KA4).
class SperreSatz:
	var id: String = ""
	var kamera_x: int = 0
	var welle: int = 0


## Halt, solange mehr Gegner leben (Welt 2.1, KA6).
class HaltSatz:
	var id: String = ""
	var kamera_x: int = 0
	var max_lebende: int = 0


## Blende in einen anderen Teil der Stage (Welt 2.1, KA13).
class SchnittSatz:
	var kamera_x: int = 0
	var figur_x: int = 0
	var ziel_kamera_x: int = 0
	var ziel_x: int = 0
	var ziel_z: int = 0


## Bossarena (Welt 2.1, KA7, KA8).
class ArenaSatz:
	var k0: int = 0
	var k1: int = 0
	var totzone_links: int = 0
	var totzone_rechts: int = 0


## Eine geladene Stage (Welt 2).
class Stage:
	var id: String = ""
	var name: String = ""
	var x_ende: int = 0
	var kamera_x_max: int = 0
	var start_x: int = 0
	var start_z: int = 0
	var start_blick: int = 1
	## Kamera fest (Prüfbühne, Kampf 11.2)
	var kamera_fest: bool = false
	## Welt 2.2 Punkt 4 gilt (false auf der Prüfbühne)
	var raender: bool = true
	## Array von Band
	var baender: Array = []
	## Array von KameraYSatz
	var kamera_y: Array = []
	## Array von Hindernis
	var hindernisse: Array = []
	## Array von BildSatz
	var vordergrund: Array = []
	## Array von BildSatz
	var hintergrund: Array = []
	## Array von BehaelterSatz
	var behaelter: Array = []
	## Array von GegnerSatz
	var gegner: Array = []
	## Array von WelleSatz
	var wellen: Array = []
	## Array von EintragSatz
	var eintraege: Array = []
	## Array von SperreSatz
	var sperren: Array = []
	## Array von HaltSatz
	var halte: Array = []
	## Array von SchnittSatz
	var schnitte: Array = []
	## ArenaSatz oder null
	var arena: Variant = null


# ===========================================================================
# Zeilenformat (gemeinsam mit der Prüfszene, pruef/szene.gd)
# ===========================================================================

## Eine Datenzeile: Satzart und Felder in ihrer Reihenfolge.
class SatzZeile:
	## Zeilennummer ab 1
	var nr: int = 0
	var satzart: String = ""
	## Felder in Dateireihenfolge, Array von [name, wert] (beides String);
	## ein Feld ohne „=“ hat den Wert „ja“
	var felder: Array = []


## Treffer eines regulären Ausdrucks im ganzen Text oder null (Hilfsfunktion
## des Ports; JavaScript: /muster/.exec(text)).
static func regexTreffer(muster: String, text: String) -> RegExMatch:
	var re: RegEx = RegEx.new()
	re.compile(muster)
	return re.search(text)


## JavaScript text.trim(): entfernt Leerraum an beiden Enden.
static func trimmen(text: String) -> String:
	var re: RegEx = RegEx.new()
	re.compile("^[" + LEERRAUM + "]+|[" + LEERRAUM + "]+$")
	return re.sub(text, "", true)


## JavaScript text.split(/\s+/): trennt an Folgen von Leerraum.
static func leerraumTrennen(text: String) -> Array:
	var re: RegEx = RegEx.new()
	re.compile("[" + LEERRAUM + "]+")
	var teile: Array = []
	var pos: int = 0
	for m: RegExMatch in re.search_all(text):
		teile.append(text.substr(pos, m.get_start() - pos))
		pos = m.get_end()
	teile.append(text.substr(pos))
	return teile


## Meldungstext einer Zeile: „Zeile n (satzart): was“ (SyntaxError der Stage).
static func zeilenFehler(zeile: SatzZeile, was: String) -> String:
	return "Zeile %d (%s): %s" % [zeile.nr, zeile.satzart, was]


## Fehlerrückruf für zeile und was (TypeScript: fehler(was)).
static func fehlerFuer(zeile: SatzZeile, was: String) -> Callable:
	return func() -> String: return zeilenFehler(zeile, was)


## Zerlegt einen Text im Satzformat (Welt 2.1) in Datenzeilen. # beginnt einen
## Kommentar bis zum Zeilenende; leere Zeilen entfallen. Doppelte Feldnamen in
## einer Zeile sind ein Fehler (der Port meldet ihn und überspringt das Feld).
static func satzZeilen(text: String) -> Array:
	var zeilen: Array = []
	var ohne_bom: String = text.substr(1) if text.begins_with("﻿") else text
	var roh: PackedStringArray = ohne_bom.split("\n")
	for i in range(roh.size()):
		var zeile_roh: String = roh[i]
		if zeile_roh.ends_with("\r"):
			zeile_roh = zeile_roh.substr(0, zeile_roh.length() - 1)
		var kommentar: int = zeile_roh.find("#")
		if kommentar >= 0:
			zeile_roh = zeile_roh.substr(0, kommentar)
		var ohneKommentar: String = trimmen(zeile_roh)
		if ohneKommentar == "":
			continue
		var teile: Array = leerraumTrennen(ohneKommentar)
		var satzart: String = teile[0]
		var felder: Array = []
		var gesehen: Dictionary = {}
		for k in range(1, teile.size()):
			var teil: String = teile[k]
			var p: int = teil.find("=")
			var name: String = teil if p < 0 else teil.substr(0, p)
			var wert: String = "ja" if p < 0 else teil.substr(p + 1)
			if name == "":
				push_error("Zeile %d: Feld ohne Namen („%s“)" % [i + 1, teil])
				continue
			if gesehen.has(name):
				push_error("Zeile %d: Feld „%s“ doppelt" % [i + 1, name])
				continue
			gesehen[name] = true
			felder.append([name, wert])
		var z: SatzZeile = SatzZeile.new()
		z.nr = i + 1
		z.satzart = satzart
		z.felder = felder
		zeilen.append(z)
	return zeilen


## Zugriff auf die Felder einer Zeile mit Prüfung. Erzeugen mit felderNeu(zeile).
class Felder:
	var zeile: SatzZeile = null
	var werte: Dictionary = {}
	var benutzt: Dictionary = {}

	func fehler(text_: String) -> String:
		return "Zeile %d (%s): %s" % [zeile.nr, zeile.satzart, text_]

	func hat(name: String) -> bool:
		return werte.has(name)

	## Text eines Feldes; standard (null = keiner). Fehlt das Feld ohne
	## Standard, meldet der Port den Fehler und liefert "".
	func text(name: String, standard: Variant = null) -> String:
		benutzt[name] = true
		if werte.has(name):
			return werte[name]
		if standard != null:
			return standard as String
		push_error(fehler("Feld „%s“ fehlt" % name))
		return ""

	## Ganze Zahl; standard (null = keiner). Keine ganze Zahl: Meldung und 0.
	func ganz(name: String, standard: Variant = null) -> int:
		if standard == null and not werte.has(name):
			# fehlendes Feld ohne Standard: text() meldet es einmal
			text(name)
			return 0
		var w: String = text(name, null if standard == null else str(standard))
		if KernStage.regexTreffer("^-?\\d+$", w) == null:
			push_error(fehler("Feld „%s“ muss eine ganze Zahl sein, nicht „%s“" % [name, w]))
			return 0
		return w.to_int()

	## Optionale ganze Zahl: null, wenn das Feld fehlt.
	func ganzOder(name: String) -> Variant:
		return ganz(name) if hat(name) else null

	func jaNein(name: String, standard: Variant = null) -> bool:
		var vorgabe: Variant = null
		if standard != null:
			vorgabe = "ja" if standard else "nein"
		var w: String = text(name, vorgabe).to_lower()
		if w == "ja" or w == "an" or w == "1":
			return true
		if w == "nein" or w == "aus" or w == "0":
			return false
		push_error(fehler("Feld „%s“ muss ja/nein bzw. an/aus sein, nicht „%s“" % [name, w]))
		return false

	func blick(name: String, standard: Variant = null) -> int:
		var vorgabe: Variant = null
		if standard != null:
			vorgabe = "rechts" if standard == 1 else "links"
		var w: String = text(name, vorgabe)
		return KernStage.blickAusText(w, func() -> String: return fehler("Feld „%s“: Blick „%s“ unbekannt (rechts/links/R/L)" % [name, w]))

	## Meldet, wenn die Zeile Felder enthält, die nicht gelesen wurden.
	func pruefeRest() -> void:
		for eintrag: Array in zeile.felder:
			var name: String = eintrag[0]
			if not benutzt.has(name):
				push_error(fehler("unbekanntes Feld „%s“" % name))


## Neue Feldprüfung für eine Zeile (TypeScript: new Felder(zeile)).
static func felderNeu(zeile: SatzZeile) -> Felder:
	var f: Felder = Felder.new()
	f.zeile = zeile
	for eintrag: Array in zeile.felder:
		f.werte[eintrag[0]] = eintrag[1]
	return f


## Blick aus „rechts“, „links“, „R“, „L“, „+1“, „-1“. Bei unbekanntem Text
## meldet der Port fehler() und liefert 1.
static func blickAusText(w: String, fehler: Callable) -> int:
	var k: String = w.to_lower()
	if k == "rechts" or k == "r" or k == "1" or k == "+1":
		return 1
	if k == "links" or k == "l" or k == "-1":
		return -1
	push_error(fehler.call())
	return 1


## Gegnertyp aus Text (Groß-/Kleinschreibung egal, „Zuender“ = „Zünder“).
static func gegnerTypAusText(w: String, fehler: Callable) -> String:
	var k: String = w.to_lower()
	# JavaScript replace('ue', 'ü') ersetzt nur das erste Vorkommen
	var p: int = k.find("ue")
	if p >= 0:
		k = k.substr(0, p) + "ü" + k.substr(p + 2)
	match k:
		"bolzer":
			return "Bolzer"
		"rammbock":
			return "Rammbock"
		"zünder":
			return "Zünder"
		"ballast":
			return "Ballast"
		"puppe":
			return "Puppe"
		_:
			push_error(fehler.call())
			return ""


## Gegenstandsart aus Text (Groß-/Kleinschreibung egal).
static func gegenstandAusText(w: String, fehler: Callable) -> String:
	match w.to_lower():
		"kometenbraten":
			return "Kometenbraten"
		"eisnudelschale":
			return "Eisnudelschale"
		"sternbeeren":
			return "Sternbeeren"
		"raketenwerfer", "rw":
			return "Raketenwerfer"
		_:
			push_error(fehler.call())
			return ""


## Behälterart aus Text.
static func behaelterArtAusText(w: String, fehler: Callable) -> String:
	match w.to_lower():
		"fass":
			return "Fass"
		"bosskiste":
			return "Bosskiste"
		_:
			push_error(fehler.call())
			return ""


## Behälterinhalt: Gegenstandsart oder „leer“.
static func inhaltAusText(w: String, fehler: Callable) -> String:
	if w.to_lower() == "leer":
		return "leer"
	return gegenstandAusText(w, fehler)


## Auftritt aus Text (Welt 4.2).
static func auftrittAusText(w: String, fehler: Callable) -> String:
	match w:
		"hocke", "versteck", "luke", "rand_links", "rand_rechts", "boss":
			return w
		_:
			push_error(fehler.call())
			return ""


# ===========================================================================
# Parser
# ===========================================================================

static func stageLeer() -> Stage:
	var s: Stage = Stage.new()
	s.id = ""
	s.name = ""
	s.x_ende = 0
	s.kamera_x_max = 0
	s.start_x = 0
	s.start_z = 0
	s.start_blick = 1
	s.kamera_fest = false
	s.raender = true
	s.baender = []
	s.kamera_y = []
	s.hindernisse = []
	s.vordergrund = []
	s.hintergrund = []
	s.behaelter = []
	s.gegner = []
	s.wellen = []
	s.eintraege = []
	s.sperren = []
	s.halte = []
	s.schnitte = []
	s.arena = null
	return s


## Array von Punkt; bei Fehler Meldung und leeres Array.
static func punkteAusText(w: String, fehler: Callable) -> Array:
	var punkte: Array = []
	for teil: String in w.split(";"):
		if trimmen(teil) == "":
			continue
		var m: RegExMatch = regexTreffer("^(-?\\d+):(-?\\d+)$", trimmen(teil))
		if m == null:
			push_error(fehler.call())
			return []
		var p: Punkt = Punkt.new()
		p.x = m.get_string(1).to_int()
		p.z = m.get_string(2).to_int()
		punkte.append(p)
	if punkte.size() < 3:
		push_error(fehler.call())
		return []
	return punkte


## Zusatzbedingung „lebende≤n“ bzw. „lebende<=n“ (Welt 4.4). Bei Fehler
## Meldung und 0.
static func bedingungAusText(w: String, fehler: Callable) -> int:
	var m: RegExMatch = regexTreffer("^lebende(?:≤|<=)(\\d+)$", w)
	if m == null:
		push_error(fehler.call())
		return 0
	return m.get_string(1).to_int()


## Liest Stage-Daten nach Welt 2.1. Meldet unbekannte Satzarten oder Felder
## (push_error) und liest dann mit der nächsten Zeile weiter.
static func parseStage(text: String) -> Stage:
	var s: Stage = stageLeer()
	var stageGesehen: bool = false
	for zeile: SatzZeile in satzZeilen(text):
		var f: Felder = felderNeu(zeile)
		match zeile.satzart:
			"stage":
				if stageGesehen:
					push_error("Zeile %d: zweiter Satz stage" % zeile.nr)
					continue
				stageGesehen = true
				s.id = f.text("id")
				s.name = f.text("name", s.id)
				s.x_ende = f.ganz("x_ende")
				s.kamera_x_max = f.ganz("kamera_x_max")
				s.start_x = f.ganz("start_x")
				s.start_z = f.ganz("start_z")
				s.start_blick = f.blick("start_blick", 1)
				var kamera: String = f.text("kamera", "folgt")
				if kamera != "fest" and kamera != "folgt":
					push_error(zeilenFehler(zeile, "kamera=%s unbekannt (fest/folgt)" % kamera))
					continue
				s.kamera_fest = kamera == "fest"
				s.raender = f.jaNein("raender", true)
			"band":
				var band: Band = Band.new()
				band.x0 = f.ganz("x0")
				band.x1 = f.ganz("x1")
				band.unten0 = f.ganz("unten0")
				band.unten1 = f.ganz("unten1")
				band.oben0 = f.ganz("oben0")
				band.oben1 = f.ganz("oben1")
				s.baender.append(band)
			"kamera_y":
				var ky: KameraYSatz = KameraYSatz.new()
				ky.k0 = f.ganz("k0")
				ky.k1 = f.ganz("k1")
				ky.y0 = f.ganz("y0")
				ky.y1 = f.ganz("y1")
				s.kamera_y.append(ky)
			"hindernis":
				var hi: Hindernis = Hindernis.new()
				hi.id = f.text("id")
				hi.punkte = punkteAusText(f.text("punkte"), fehlerFuer(zeile, "punkte erwartet als x:z;x:z;… mit mindestens drei Punkten"))
				hi.hoehe = f.ganz("hoehe")
				s.hindernisse.append(hi)
			"vordergrund", "hintergrund":
				var b: BildSatz = BildSatz.new()
				b.id = f.text("id")
				b.x0 = f.ganz("x0")
				b.x1 = f.ganz("x1")
				b.zeilen = f.ganz("zeilen", 0)
				b.bild = f.text("bild", "")
				if zeile.satzart == "vordergrund":
					s.vordergrund.append(b)
				else:
					s.hintergrund.append(b)
			"behaelter":
				var bh: BehaelterSatz = BehaelterSatz.new()
				bh.id = f.text("id")
				bh.art = behaelterArtAusText(f.text("art"), fehlerFuer(zeile, "art unbekannt (fass/bosskiste)"))
				bh.x = f.ganz("x")
				bh.z = f.ganz("z")
				bh.inhalt = inhaltAusText(f.text("inhalt", "leer"), fehlerFuer(zeile, "inhalt unbekannt"))
				s.behaelter.append(bh)
			"gegner":
				var werte: String = f.text("werte", "rang")
				if werte != "start" and werte != "rang":
					push_error(zeilenFehler(zeile, "werte=%s unbekannt (start/rang)" % werte))
					continue
				var gs: GegnerSatz = GegnerSatz.new()
				gs.typ = gegnerTypAusText(f.text("typ"), fehlerFuer(zeile, "typ unbekannt"))
				gs.x = f.ganz("x")
				gs.z = f.ganz("z")
				gs.auftritt = auftrittAusText(f.text("auftritt"), fehlerFuer(zeile, "auftritt unbekannt"))
				gs.welle = f.ganz("welle", 0)
				gs.werte = werte
				gs.blick = f.blick("blick", -1)
				s.gegner.append(gs)
			"welle":
				var a: String = f.text("ausloeser")
				if a != "kamera" and a != "figur_abstand" and a != "arena" and a != "boss_lp":
					push_error(zeilenFehler(zeile, "ausloeser=%s unbekannt (kamera/figur_abstand/arena/boss_lp)" % a))
					continue
				var ws: WelleSatz = WelleSatz.new()
				ws.nr = f.ganz("nr")
				ws.ausloeser = a
				ws.wert = f.ganz("wert", 0)
				if f.hat("bedingung"):
					ws.lebende_max = bedingungAusText(f.text("bedingung"), fehlerFuer(zeile, "bedingung erwartet als lebende≤n"))
				else:
					ws.lebende_max = null
				ws.bonus = f.ganz("bonus", 0)
				s.wellen.append(ws)
			"eintrag":
				var es: EintragSatz = EintragSatz.new()
				es.welle = f.ganz("welle")
				es.typ = gegnerTypAusText(f.text("typ"), fehlerFuer(zeile, "typ unbekannt"))
				es.auftritt = auftrittAusText(f.text("auftritt"), fehlerFuer(zeile, "auftritt unbekannt"))
				es.z = f.ganz("z")
				es.verzoegerung = f.ganz("verzoegerung", 0)
				s.eintraege.append(es)
			"sperre":
				var sp: SperreSatz = SperreSatz.new()
				sp.id = f.text("id")
				sp.kamera_x = f.ganz("kamera_x")
				sp.welle = f.ganz("welle")
				s.sperren.append(sp)
			"halt":
				var ha: HaltSatz = HaltSatz.new()
				ha.id = f.text("id")
				ha.kamera_x = f.ganz("kamera_x")
				ha.max_lebende = f.ganz("max_lebende")
				s.halte.append(ha)
			"schnitt":
				var sc: SchnittSatz = SchnittSatz.new()
				sc.kamera_x = f.ganz("kamera_x")
				sc.figur_x = f.ganz("figur_x")
				sc.ziel_kamera_x = f.ganz("ziel_kamera_x")
				sc.ziel_x = f.ganz("ziel_x")
				sc.ziel_z = f.ganz("ziel_z")
				s.schnitte.append(sc)
			"arena":
				if s.arena != null:
					push_error("Zeile %d: zweiter Satz arena" % zeile.nr)
					continue
				var ar: ArenaSatz = ArenaSatz.new()
				ar.k0 = f.ganz("k0")
				ar.k1 = f.ganz("k1")
				ar.totzone_links = f.ganz("totzone_links")
				ar.totzone_rechts = f.ganz("totzone_rechts")
				s.arena = ar
			_:
				push_error("Zeile %d: unbekannte Satzart „%s“" % [zeile.nr, zeile.satzart])
				continue
		f.pruefeRest()
	if not stageGesehen:
		push_error("Stage-Daten ohne Satz stage")
		return s
	for b: Band in s.baender:
		if b.x1 <= b.x0:
			push_error("band x0=%d x1=%d: x1 muss größer als x0 sein" % [b.x0, b.x1])
	return s


# ===========================================================================
# Bänder und Kamera-y (Welt 2.1, 2.2, 2.4)
# ===========================================================================

## Linearer Verlauf zwischen (a0 bei p0) und (a1 bei p1), abgerundet (Kampf 2.4).
static func linear(a0: int, a1: int, p0: int, p1: int, p: int) -> int:
	if p1 == p0:
		return a0
	return a0 + KernFestkomma.divGanz((a1 - a0) * (p - p0), p1 - p0)


## Band für die ganzzahlige Welt-x, oder null, wenn kein Band dort liegt.
static func bandBei(stage: Stage, x: int) -> Band:
	for b: Band in stage.baender:
		if x >= b.x0 and x < b.x1:
			return b
	return null


## Grenzen des Tiefenbands bei x: Dictionary mit den Schlüsseln „unten“ und
## „oben“, abgerundet; null außerhalb aller Bänder.
static func bandGrenzen(stage: Stage, x: int) -> Variant:
	var b: Band = bandBei(stage, x)
	if b == null:
		return null
	return {
		"unten": linear(b.unten0, b.unten1, b.x0, b.x1, x),
		"oben": linear(b.oben0, b.oben1, b.x0, b.x1, x),
	}


## Untergrenze unten(x) des Tiefenbands, null außerhalb.
static func bandUnten(stage: Stage, x: int) -> Variant:
	var g: Variant = bandGrenzen(stage, x)
	if g == null:
		return null
	return g["unten"]


## Obergrenze oben(x) des Tiefenbands, null außerhalb.
static func bandOben(stage: Stage, x: int) -> Variant:
	var g: Variant = bandGrenzen(stage, x)
	if g == null:
		return null
	return g["oben"]


## Ky für Kamera-x K (Welt 2.1, KA9): innerhalb eines Satzes linear,
## abgerundet; zwischen zwei Sätzen der Wert des vorigen (dessen y1); vor dem
## ersten Satz dessen y0 (Festlegung K0); ohne Sätze 0.
static func kameraY(stage: Stage, k: int) -> int:
	# stabiler Einfügesort nach k0 (wie Array.prototype.sort)
	var saetze: Array = []
	for s: KameraYSatz in stage.kamera_y:
		var i: int = saetze.size()
		while i > 0 and (saetze[i - 1] as KameraYSatz).k0 - s.k0 > 0:
			i -= 1
		saetze.insert(i, s)
	if saetze.size() == 0:
		return 0
	var wert: int = (saetze[0] as KameraYSatz).y0
	for s: KameraYSatz in saetze:
		if k < s.k0:
			break
		if k <= s.k1:
			return linear(s.y0, s.y1, s.k0, s.k1, k)
		wert = s.y1
	return wert


# ===========================================================================
# Hindernisse und begehbare Fläche (Welt 2.2)
# ===========================================================================

## Liegt der ganzzahlige Punkt (x, z) im konvexen Vieleck? Der Rand zählt als
## innen (Festlegung K0). Die Umlaufrichtung ist gleichgültig.
static func inHindernis(h: Hindernis, x: int, z: int) -> bool:
	var positiv: bool = false
	var negativ: bool = false
	var n: int = h.punkte.size()
	for i in range(n):
		var a: Punkt = h.punkte[i]
		var b: Punkt = h.punkte[(i + 1) % n]
		var kreuz: int = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x)
		if kreuz > 0:
			positiv = true
		elif kreuz < 0:
			negativ = true
		if positiv and negativ:
			return false
	return true


## Hindernis eines unzerbrochenen Behälters: Grundfläche x ± 12, z ± 6, Höhe 32 (Welt 2.2, Punkt 6).
static func behaelterHindernis(id: String, x: int, z: int) -> Hindernis:
	var h: Hindernis = Hindernis.new()
	h.id = id
	var p1: Punkt = Punkt.new()
	p1.x = x - KernWerte.BEHAELTER_HALB_X
	p1.z = z - KernWerte.BEHAELTER_HALB_Z
	var p2: Punkt = Punkt.new()
	p2.x = x - KernWerte.BEHAELTER_HALB_X
	p2.z = z + KernWerte.BEHAELTER_HALB_Z
	var p3: Punkt = Punkt.new()
	p3.x = x + KernWerte.BEHAELTER_HALB_X
	p3.z = z + KernWerte.BEHAELTER_HALB_Z
	var p4: Punkt = Punkt.new()
	p4.x = x + KernWerte.BEHAELTER_HALB_X
	p4.z = z - KernWerte.BEHAELTER_HALB_Z
	h.punkte = [p1, p2, p3, p4]
	h.hoehe = KernWerte.BEHAELTER_HOEHE
	return h


## Begehbar nach Welt 2.2 Punkt 1 und 3 für ganzzahlige Lage (x, z) und Höhe
## h (⌊h⌋): unten(x) ≤ z ≤ oben(x) und in keinem Hindernis, dessen Höhe größer
## als h ist. zusatz: weitere Hindernisse (z. B. unzerbrochene Behälter).
static func begehbar(stage: Stage, x: int, z: int, h: int = 0, zusatz: Array = []) -> bool:
	var g: Variant = bandGrenzen(stage, x)
	if g == null or z < (g["unten"] as int) or z > (g["oben"] as int):
		return false
	for hi: Hindernis in stage.hindernisse:
		if hi.hoehe > h and inHindernis(hi, x, z):
			return false
	for hi: Hindernis in zusatz:
		if hi.hoehe > h and inHindernis(hi, x, z):
			return false
	return true


## Begrenzung eines Schritts (Welt 2.2).
class Begrenzung:
	var stage: Stage = null
	## weitere Hindernisse, z. B. unzerbrochene Behälter (behaelterHindernis): Array von Hindernis
	var zusatz: Array = []
	## Ränder der Figur in x als Fest (Welt 2.2 Punkt 4), null = keine (Gegner, Prüfbühne)
	var x_min: Variant = null
	var x_max: Variant = null


## Ergebnis eines begrenzten Schritts.
class SchrittErgebnis:
	var x: int = 0
	var z: int = 0
	## der Schritt in x bzw. z wurde verkürzt
	var blockiert_x: bool = false
	var blockiert_z: bool = false


## Ganzzahlige Lagen strikt hinter `von` bis einschließlich `bis` in
## Schrittrichtung, in Reihenfolge des Weges.
static func ganzeLagen(von: int, bis: int) -> Array:
	var lagen: Array = []
	if bis > von:
		var c: int = KernFestkomma.ganz(von) + 1
		while KernFestkomma.ausGanz(c) <= bis:
			lagen.append(c)
			c += 1
	elif bis < von:
		var start: int = KernFestkomma.ganz(von) - 1 if KernFestkomma.nachkomma(von) == 0 else KernFestkomma.ganz(von)
		var c2: int = start
		while KernFestkomma.ausGanz(c2) >= bis:
			lagen.append(c2)
			c2 -= 1
	return lagen


## Begrenzt das Ziel einer Achse auf [grenze_min, grenze_max] (Fest), ohne über
## die Ausgangslage hinaus zurückzuschieben. (TypeScript: min, max.)
static func randBegrenzen(alt: int, neu: int, grenze_min: Variant, grenze_max: Variant) -> int:
	var n: int = neu
	if grenze_min != null and n < (grenze_min as int):
		n = alt if alt < (grenze_min as int) else (grenze_min as int)
	if grenze_max != null and n > (grenze_max as int):
		n = alt if alt > (grenze_max as int) else (grenze_max as int)
	return n


## Schritt um (dx, dz) nach Welt 2.2 Punkt 2: erst x, dann z. Würde ein Schritt
## die begehbare Fläche verlassen, endet er an ihrer Kante: auf der letzten
## ganzzahligen begehbaren Lage des Weges (Nachkommaanteil 0); gibt es keine,
## bleibt die Achse stehen. Die andere Achse bewegt sich weiter. Ränder der
## Figur (x_min, x_max) begrenzen x auf den genauen Wert (Welt-Test T1: Wand
## K + 24). Festlegung K0 für „an ihrer Kante“; Stufe 2 nutzt diese Funktion
## für Figur und Gegner.
static func schrittBegrenzt(b: Begrenzung, x: int, z: int, h: int, dx: int, dz: int) -> SchrittErgebnis:
	var hg: int = KernFestkomma.ganz(h)
	var nx: int = x
	var blockiertX: bool = false
	if dx != 0:
		var ziel: int = randBegrenzen(x, KernFestkomma.add(x, dx), b.x_min, b.x_max)
		blockiertX = ziel != KernFestkomma.add(x, dx)
		if begehbar(b.stage, KernFestkomma.ganz(ziel), KernFestkomma.ganz(z), hg, b.zusatz):
			nx = ziel
		else:
			blockiertX = true
			for c: int in ganzeLagen(x, ziel):
				if not begehbar(b.stage, c, KernFestkomma.ganz(z), hg, b.zusatz):
					break
				nx = KernFestkomma.ausGanz(c)
	var nz: int = z
	var blockiertZ: bool = false
	if dz != 0:
		var ziel2: int = KernFestkomma.add(z, dz)
		if begehbar(b.stage, KernFestkomma.ganz(nx), KernFestkomma.ganz(ziel2), hg, b.zusatz):
			nz = ziel2
		else:
			blockiertZ = true
			for c2: int in ganzeLagen(z, ziel2):
				if not begehbar(b.stage, KernFestkomma.ganz(nx), c2, hg, b.zusatz):
					break
				nz = KernFestkomma.ausGanz(c2)
	var e: SchrittErgebnis = SchrittErgebnis.new()
	e.x = nx
	e.z = nz
	e.blockiert_x = blockiertX
	e.blockiert_z = blockiertZ
	return e
