# Prüfszene nach docs/spezifikation-kampf.md, 11.2 und Prüfstart nach
# docs/spezifikation-welt.md, 11.3, in einem Textformat wie die Stage-Daten
# (Welt 2.1): je Zeile ein Satz, Felder name=wert, # Kommentar. Beschreibung
# in docs/scheibe.md, Abschnitt „Formate“. Ohne Dateizugriff.
# Port von spiel/src/pruef/szene.ts.
#
#   szene        name= endframe= seed=1 (SEED_KAMPF_TESTS) buehne=pruefbuehne|scheibe
#   pruefstart   Schlüssel aus Welt 11.3 in deren Schreibweise (mehrere Sätze erlaubt,
#                spätere Angaben gelten): rang= rang.fest kamera.x= kamera.modus=
#                welle.N=aus|an|nur_boss sperre.ID=aus halt.ID=aus behaelter.ID=aus
#                behaelter.ID=art,x,z,inhalt gegner.sN.erlaubnis=aus boss.angriffe=aus
#                boss.bewegung=aus boss.lp=N fest.NAME=WERT figur.x= figur.z= …
#   figur        x= z= blick= lp= waffe=RW|leer munition=
#   gegner       slot= typ= rolle= x= z= blick= lp= lp_max= vorplatziert= logik= erlaubnis= erscheint=
#   objekt       slot= typ= art= x= z= munition= inhalt= id=
#   eingriff     frame= ziel= feld= wert=
#   pruefangriff slot= von= bis= schaden= umwerfen=
#
# Abweichung des Ports: throw (SyntaxError) wird zu push_error mit demselben
# Meldungstext. fehlerIn liefert den Meldungstext (String). Nach einem Fehler
# wird die Zeile übersprungen (gegnerSatz und objektSatz liefern dann null).
class_name PruefSzene
extends RefCounted


## Meldungstext einer Szenenzeile (TypeScript: SyntaxError).
static func fehlerIn(z: KernStage.SatzZeile, text: String) -> String:
	return "Szene Zeile %d (%s): %s" % [z.nr, z.satzart, text]


## Ganze Zahl aus w; keine ganze Zahl: Meldung und 0.
static func ganzText(z: KernStage.SatzZeile, name: String, w: String) -> int:
	if KernStage.regexTreffer("^-?\\d+$", w) == null:
		push_error(fehlerIn(z, "%s muss eine ganze Zahl sein, nicht „%s“" % [name, w]))
		return 0
	return w.to_int()


## an/ja → true, aus/nein → false; sonst Meldung und false.
static func anAus(z: KernStage.SatzZeile, name: String, w: String) -> bool:
	var k: String = w.to_lower()
	if k == "an" or k == "ja":
		return true
	if k == "aus" or k == "nein":
		return false
	push_error(fehlerIn(z, "%s muss an/aus (ja/nein) sein, nicht „%s“" % [name, w]))
	return false


## Rolle aus Text; unbekannt: Meldung und "".
static func rolleAusText(z: KernStage.SatzZeile, w: String) -> String:
	if w == "leicht" or w == "schwer" or w == "fern" or w == "boss":
		return w
	push_error(fehlerIn(z, "rolle „%s“ unbekannt (leicht/schwer/fern/boss)" % w))
	return ""


## ObjektTyp aus Text; unbekannt: Meldung und "".
static func objektTypAusText(z: KernStage.SatzZeile, w: String) -> String:
	match w.to_lower():
		"gegenstand":
			return "Gegenstand"
		"behälter", "behaelter":
			return "Behälter"
		"rakete":
			return "Rakete"
		"waffe":
			return "Waffe"
		"effekt":
			return "Effekt"
		_:
			push_error(fehlerIn(z, "typ „%s“ unbekannt (Gegenstand/Behälter/Rakete/Waffe/Effekt)" % w))
			return ""


## Nimmt wert in die Liste auf, wenn er noch fehlt.
static func hinzu(liste: Array, wert: Variant) -> void:
	if not liste.has(wert):
		liste.append(wert)


## Entfernt das erste Vorkommen von wert aus der Liste.
static func entferne(liste: Array, wert: Variant) -> void:
	var i: int = liste.find(wert)
	if i >= 0:
		liste.remove_at(i)


static func figurFeld(z: KernStage.SatzZeile, figur: KernStart.FigurStart, name: String, w: String) -> void:
	match name:
		"x":
			figur.x = ganzText(z, name, w)
		"z":
			figur.z = ganzText(z, name, w)
		"blick":
			figur.blick = KernStage.blickAusText(w, func() -> String: return fehlerIn(z, "blick „%s“ unbekannt" % w))
		"lp":
			figur.lp = ganzText(z, name, w)
		"waffe":
			if w != "RW" and w != "leer" and w != "":
				push_error(fehlerIn(z, "waffe muss RW oder leer sein"))
				return
			figur.waffe = "RW" if w == "RW" else ""
		"munition":
			figur.munition = ganzText(z, name, w)
		_:
			push_error(fehlerIn(z, "unbekanntes Feld der Figur „%s“" % name))


## Ein Schlüssel des Prüfstarts (Welt 11.3).
static func pruefstartFeld(z: KernStage.SatzZeile, s: KernStart.Pruefstart, name: String, w: String) -> void:
	var m: RegExMatch = null
	if name == "rang":
		s.rang = ganzText(z, name, w)
	elif name == "rang.fest":
		s.rang_fest = anAus(z, name, w)
	elif name == "kamera.x":
		s.kamera_x = ganzText(z, name, w)
	elif name == "kamera.modus":
		var gefunden: bool = false
		for k: String in KernEingriffe.KAMERA_MODI:
			if k == w:
				gefunden = true
				break
		if not gefunden:
			push_error(fehlerIn(z, "kamera.modus „%s“ unbekannt (%s)" % [w, " ".join(PackedStringArray(KernEingriffe.KAMERA_MODI))]))
			return
		s.kamera_modus = w
	elif KernStage.regexTreffer("^welle\\.(\\d+)$", name) != null:
		m = KernStage.regexTreffer("^welle\\.(\\d+)$", name)
		var nr: int = m.get_string(1).to_int()
		if w == "aus":
			hinzu(s.wellen_aus, nr)
		elif w == "an":
			entferne(s.wellen_aus, nr)
		elif w == "nur_boss":
			if nr != KernWerte.BOSS_WELLE_SCHEIBE:
				push_error(fehlerIn(z, "nur_boss gibt es nur für welle.%d" % KernWerte.BOSS_WELLE_SCHEIBE))
				return
			entferne(s.wellen_aus, nr)
			s.welle7_nur_boss = true
		else:
			push_error(fehlerIn(z, "%s=%s: erlaubt aus, an, nur_boss" % [name, w]))
	elif KernStage.regexTreffer("^sperre\\.(.+)$", name) != null:
		m = KernStage.regexTreffer("^sperre\\.(.+)$", name)
		if anAus(z, name, w):
			entferne(s.sperren_aus, m.get_string(1))
		else:
			hinzu(s.sperren_aus, m.get_string(1))
	elif KernStage.regexTreffer("^halt\\.(.+)$", name) != null:
		m = KernStage.regexTreffer("^halt\\.(.+)$", name)
		if anAus(z, name, w):
			entferne(s.halte_aus, m.get_string(1))
		else:
			hinzu(s.halte_aus, m.get_string(1))
	elif KernStage.regexTreffer("^behaelter\\.(.+)$", name) != null:
		m = KernStage.regexTreffer("^behaelter\\.(.+)$", name)
		var id: String = m.get_string(1)
		if w == "aus":
			hinzu(s.behaelter_aus, id)
		else:
			var teile: PackedStringArray = w.split(",")
			if teile.size() != 4:
				push_error(fehlerIn(z, "%s: erwartet aus oder art,x,z,inhalt" % name))
				return
			var art: String = teile[0]
			var x: String = teile[1]
			var zz: String = teile[2]
			var inhalt: String = teile[3]
			var b: KernStart.BehaelterZusatz = KernStart.BehaelterZusatz.new()
			b.id = id
			b.art = KernStage.behaelterArtAusText(art, func() -> String: return fehlerIn(z, "Behälterart „%s“ unbekannt" % art))
			b.x = ganzText(z, "x", x)
			b.z = ganzText(z, "z", zz)
			b.inhalt = KernStage.inhaltAusText(inhalt, func() -> String: return fehlerIn(z, "Inhalt „%s“ unbekannt" % inhalt))
			s.behaelter_zusatz.append(b)
	elif KernStage.regexTreffer("^gegner\\.s(\\d+)\\.erlaubnis$", name) != null:
		m = KernStage.regexTreffer("^gegner\\.s(\\d+)\\.erlaubnis$", name)
		var slot: int = m.get_string(1).to_int()
		if anAus(z, name, w):
			entferne(s.erlaubnis_aus, slot)
		else:
			hinzu(s.erlaubnis_aus, slot)
	elif name == "boss.angriffe":
		s.boss_angriffe = anAus(z, name, w)
	elif name == "boss.bewegung":
		s.boss_bewegung = anAus(z, name, w)
	elif name == "boss.lp":
		s.boss_lp = ganzText(z, name, w)
	elif KernStage.regexTreffer("^fest\\.(.+)$", name) != null:
		m = KernStage.regexTreffer("^fest\\.(.+)$", name)
		s.fest[m.get_string(1)] = w
	elif KernStage.regexTreffer("^figur\\.(.+)$", name) != null:
		m = KernStage.regexTreffer("^figur\\.(.+)$", name)
		figurFeld(z, s.figur, m.get_string(1), w)
	else:
		push_error(fehlerIn(z, "unbekannter Schlüssel des Prüfstarts „%s“" % name))


## Gegner einer Szene; bei einem Fehler Meldung und null.
static func gegnerSatz(z: KernStage.SatzZeile) -> KernStart.GegnerStart:
	var f: KernStage.Felder = KernStage.felderNeu(z)
	var slot: int = f.ganz("slot")
	if slot < 0 or slot >= KernWerte.GEGNER_SLOTS:
		push_error(fehlerIn(z, "slot %d außerhalb 0 bis %d" % [slot, KernWerte.GEGNER_SLOTS - 1]))
		return null
	var typ: String = KernStage.gegnerTypAusText(f.text("typ"), func() -> String: return fehlerIn(z, "typ „%s“ unbekannt" % f.text("typ")))
	var g: KernStart.GegnerStart = KernStart.GegnerStart.new()
	g.slot = slot
	g.typ = typ
	g.rolle = rolleAusText(z, f.text("rolle")) if f.hat("rolle") else KernAnlegen.rolleVon(typ)
	g.x = f.ganz("x")
	g.z = f.ganz("z")
	g.blick = f.blick("blick") if f.hat("blick") else null
	g.lp = f.ganzOder("lp")
	g.lp_max = f.ganzOder("lp_max")
	g.vorplatziert = f.jaNein("vorplatziert", false)
	g.logik = f.jaNein("logik", typ != "Puppe")
	g.erlaubnis = f.jaNein("erlaubnis", true)
	g.erscheint = f.ganz("erscheint", 0)
	f.pruefeRest()
	return g


## Objekt einer Szene; bei einem Fehler Meldung und null.
static func objektSatz(z: KernStage.SatzZeile) -> KernStart.ObjektStart:
	var f: KernStage.Felder = KernStage.felderNeu(z)
	var slot: int = f.ganz("slot")
	if slot < KernWerte.OBJEKT_SLOT_ERSTER or slot > KernWerte.OBJEKT_SLOT_LETZTER:
		push_error(fehlerIn(z, "slot %d außerhalb %d bis %d" % [slot, KernWerte.OBJEKT_SLOT_ERSTER, KernWerte.OBJEKT_SLOT_LETZTER]))
		return null
	var typ: String = objektTypAusText(z, f.text("typ"))
	var artText: String = f.text("art", "")
	var art: String = ""
	if artText != "":
		if typ == "Behälter":
			art = KernStage.behaelterArtAusText(artText, func() -> String: return fehlerIn(z, "Behälterart „%s“ unbekannt" % artText))
		else:
			art = KernStage.gegenstandAusText(artText, func() -> String: return fehlerIn(z, "Gegenstand „%s“ unbekannt" % artText))
	var inhaltText: String = f.text("inhalt", "leer" if typ == "Behälter" else "")
	var o: KernStart.ObjektStart = KernStart.ObjektStart.new()
	o.slot = slot
	o.typ = typ
	o.art = art
	o.x = f.ganz("x")
	o.z = f.ganz("z")
	o.munition = f.ganz("munition", 0)
	o.inhalt = "" if inhaltText == "" else KernStage.inhaltAusText(inhaltText, func() -> String: return fehlerIn(z, "Inhalt „%s“ unbekannt" % inhaltText))
	o.id = f.text("id", "o%d" % slot)
	f.pruefeRest()
	return o


## Liest eine Prüfszene in einen Prüfstart (Kampf 11.2, Welt 11.3).
static func parseSzene(text: String) -> KernStart.Pruefstart:
	var s: KernStart.Pruefstart = KernStart.standardStart(KernWerte.SEED_KAMPF_TESTS, "pruefbuehne")
	s.name = ""
	s.rang = KernWerte.PRUEF_RANG_STANDARD
	var szeneGesehen: bool = false
	var figurGesehen: bool = false
	for z: KernStage.SatzZeile in KernStage.satzZeilen(text):
		match z.satzart:
			"szene":
				if szeneGesehen:
					push_error(fehlerIn(z, "zweiter Satz szene"))
					continue
				szeneGesehen = true
				var f: KernStage.Felder = KernStage.felderNeu(z)
				s.name = f.text("name")
				s.endframe = f.ganz("endframe")
				s.seed = f.ganz("seed", KernWerte.SEED_KAMPF_TESTS)
				s.buehne = f.text("buehne", "pruefbuehne")
				f.pruefeRest()
				if s.endframe < 1:
					push_error(fehlerIn(z, "endframe muss ≥ 1 sein"))
					continue
				if s.seed == 0:
					push_error(fehlerIn(z, "seed 0 ist verboten (Welt 11.1)"))
					continue
			"pruefstart":
				for eintrag: Array in z.felder:
					pruefstartFeld(z, s, eintrag[0], eintrag[1])
			"figur":
				if figurGesehen:
					push_error(fehlerIn(z, "zweiter Satz figur"))
					continue
				figurGesehen = true
				for eintrag2: Array in z.felder:
					figurFeld(z, s.figur, eintrag2[0], eintrag2[1])
			"gegner":
				var g: KernStart.GegnerStart = gegnerSatz(z)
				if g == null:
					continue
				var doppelt: bool = false
				for x: KernStart.GegnerStart in s.gegner:
					if x.slot == g.slot and x.erscheint == g.erscheint:
						doppelt = true
						break
				if doppelt:
					push_error(fehlerIn(z, "Gegnerslot s%d doppelt" % g.slot))
					continue
				s.gegner.append(g)
			"objekt":
				var o: KernStart.ObjektStart = objektSatz(z)
				if o == null:
					continue
				var doppelt_o: bool = false
				for x2: KernStart.ObjektStart in s.objekte:
					if x2.slot == o.slot:
						doppelt_o = true
						break
				if doppelt_o:
					push_error(fehlerIn(z, "Objektslot o%d doppelt" % o.slot))
					continue
				s.objekte.append(o)
			"eingriff":
				var f2: KernStage.Felder = KernStage.felderNeu(z)
				var e: KernStart.EingriffDaten = KernStart.EingriffDaten.new()
				e.frame = f2.ganz("frame")
				e.ziel = f2.text("ziel")
				e.feld = f2.text("feld")
				e.wert = f2.text("wert")
				s.eingriffe.append(e)
				f2.pruefeRest()
			"pruefangriff":
				var f3: KernStage.Felder = KernStage.felderNeu(z)
				var p: KernStart.PruefangriffDaten = KernStart.PruefangriffDaten.new()
				p.slot = f3.ganz("slot")
				p.von = f3.ganz("von")
				p.bis = f3.ganz("bis")
				p.schaden = f3.ganz("schaden")
				p.umwerfen = f3.jaNein("umwerfen", false)
				f3.pruefeRest()
				if p.slot < 0 or p.slot >= KernWerte.GEGNER_SLOTS:
					push_error(fehlerIn(z, "slot %d außerhalb 0 bis %d" % [p.slot, KernWerte.GEGNER_SLOTS - 1]))
					continue
				if p.von < 1 or p.bis < p.von:
					push_error(fehlerIn(z, "von muss ≥ 1 und bis ≥ von sein"))
					continue
				s.pruefangriffe.append(p)
			_:
				push_error(fehlerIn(z, "unbekannte Satzart „%s“" % z.satzart))
	if not szeneGesehen:
		push_error("Szene ohne Satz szene")
	return s
