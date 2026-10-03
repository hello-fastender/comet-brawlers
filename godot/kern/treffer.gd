# Trefferprüfung (K2) nach docs/spezifikation-kampf.md, Abschnitt 5 (Flächen
# 5.1, aktive Frames und Trefferstopp 5.3, Reihenfolge im Frame 5.4, ein
# Treffer je Ziel 5.5, Gegnerangriffe und Geschosse 5.8) und Prüfangriffe
# (11.2). Behälter als Trefferziele nach docs/spezifikation-welt.md, 9.2.
# Port von spiel/src/kern/treffer.ts.
#
# Eingang: die Angriffsinstanzen in figur.angriff, geschosse[n].angriff,
# gegner[n].angriff und objekte[n].angriff (gemeinsame Schnittstelle
# Angriffsinstanz aus entitaeten.gd; aktiv vom Besitzer vor KS6 gesetzt).
# Ausgang: welt.treffer in der Reihenfolge von Kampf 5.4; jede Instanz trägt
# ihre Ziele in getroffen ein. LP, Reaktion und Ereignis T schreiben erst die
# Zielhandler in KS7; trefferFolgen räumt danach auf (P11).
#
# Reihenfolge in trefferPruefen (Kampf 5.4):
#   1. figur.angriff, dann g0 bis g4: gegen Gegner s0 bis s19, dann Behälter o20 bis o59
#   2. geworfener Gegner (Instanz WG am Gegnerslot, gegen 'gegner'), Slots aufsteigend
#   3. gegner[s0 … s19].angriff und objekte[o20 … o59].angriff gegen die Figur,
#      dann gegen Behälter. Ein Gegner, der in 1 oder 2 getroffen wurde,
#      prüft in 3 nicht (Angriff abgebrochen; der Boss nur in diesem Frame
#      nicht, SA3); ein sterbender Gegner trifft nie.
#
# Innerhalb eines Frames rechnet die Prüfung die Folgen schon angelegter
# Treffer vor (Festlegung K2): Ein Gegner, der umgeworfen wird oder unter
# 0 LP fällt, und ein schon getroffener Behälter sind für spätere Instanzen
# desselben Frames nicht mehr treffbar (wie bei sofortiger Anwendung im
# Vorbild); für spätere Frames dieser Instanzen bleibt das Ziel offen (5.5).
# Die Figur prüft figurGetroffen der Reihe nach selbst (Schutz nach dem
# ersten wirksamen Treffer macht weitere wirkungslos).
#
# Der Stand der Prüfung innerhalb eines Frames (TypeScript: Schnittstelle
# Lauf, nicht exportiert) ist hier ein Dictionary mit den Schlüsseln
#   "aus"         Menge (Schlüssel → true) der Ziele, die nach einem schon
#                 angelegten Treffer dieses Frames nicht mehr treffbar sind
#   "lp"          Schlüssel → vorgerechnete LP der in diesem Frame getroffenen Gegner
#   "getroffen12" Menge der Gegner, die in Punkt 1 oder 2 getroffen wurden (Kampf 5.4)
class_name KernTreffer
extends RefCounted

# ===========================================================================
# Treffbarkeit
# ===========================================================================

## Modi, in denen ein Gegner für keinen Angriff treffbar ist (Kampf 5.5, 7; Welt 4.2).
const NICHT_TREFFBAR: Array = ["UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT", "GEHALTEN", "WARTEN", "AUFTRITT"]

## Angriffe der haltenden Figur, die den gehaltenen Gegner treffen (Kampf 5.5, 7 GEHALTEN).
const GEHALTEN_TREFFBAR_DURCH: Array = ["KN", "WU", "SP"]


## Ist der Gegner für Angriffe der Figur treffbar (Kampf 5.5, Welt 4.1)?
## Belegt, Zustand 1 oder 3, nicht umgeworfen, liegend, aufstehend, tot,
## gehalten, wartend oder im Auftritt, LP ≥ 0 und im aktiven Fenster
## −64 ≤ ⌊x⌋ − K ≤ 447 (Raketen treffen ab K + 448 nicht, Kampf 10.3).
## Gehaltene trifft nur die haltende Figur (siehe trefferPruefen).
static func treffbar(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if not g.belegt:
		return false
	if g.zustand != KernEntitaeten.ZUSTAND_NORMAL and g.zustand != KernEntitaeten.ZUSTAND_REAKTION:
		return false
	if g.lp < 0 or NICHT_TREFFBAR.has(g.modus):
		return false
	return KernEntitaeten.imFenster(g, welt.kamera.x)


## Behälter als Ziel (Welt 9.2): ein unzerbrochenes Fass; Bosskisten zerbrechen nur beim Weckreiz des Bosses.
static func behaelterTreffbar(o: KernEntitaeten.Objekt) -> bool:
	return o.belegt and o.typ == "Behälter" and o.art == "Fass" and not o.zerbrochen


## Angreifer steht vor dem Ziel, in dessen Blickrichtung (dx · Blick_Ziel ≥ 0; Treffer.von_vorn, Boss SA3).
static func vonVorn(angreifer: KernEntitaeten.EntitaetBasis, ziel: KernEntitaeten.EntitaetBasis) -> bool:
	return (KernFestkomma.ganz(angreifer.x) - KernFestkomma.ganz(ziel.x)) * ziel.blick >= 0


## Treffbarkeit eines Gegners für eine bestimmte Instanz (gehalten, Boss von vorn).
static func gegnerOffen(welt: KernWelt, inst: KernEntitaeten.Angriffsinstanz, angreifer: KernEntitaeten.EntitaetBasis, g: KernEntitaeten.Gegner) -> bool:
	if not g.belegt:
		return false
	if g.modus == "GEHALTEN":
		return g.lp >= 0 and g.gehalten_von == inst.urheber and GEHALTEN_TREFFBAR_DURCH.has(inst.code) and KernEntitaeten.imFenster(g, welt.kamera.x)
	if not treffbar(welt, g):
		return false
	# Boss im Armschwung ab dem zweiten aktiven Frame (Welt 7.1), gesetzt von K4 in KS3
	if g.vorn_geschuetzt and vonVorn(angreifer, g):
		return false
	return true


# ===========================================================================
# Flächen (Kampf 5.1)
# ===========================================================================

## maximum ist null (keine Grenze) oder eine ganze Zahl.
static func hoeheErlaubt(maximum: Variant, e: KernEntitaeten.EntitaetBasis) -> bool:
	return maximum == null or KernFestkomma.ganz(e.h) <= (maximum as int)


## Liegt ziel in der Fläche der Instanz (Kampf 5.1), an ganzzahligen Positionen
## am Ende des Frames (Kampf 2.3)? dz in Kampf-Konvention (Ziel minus Ursprung).
## - abstand: −hinten ≤ d_vorn ≤ vorn (hinten_weg, wenn ein Gegner als Ziel vom
##   Angreifer wegschaut, K8), |dz| ≤ tiefe, Höhe des Angreifers und des Ziels
## - fenster: x_z − links ≤ ⌊x_Ziel⌋ ≤ x_z + rechts, dz_min ≤ dz ≤ dz_max,
##   d_vorn ≥ −hinten, Zielhöhe (Welt 5.4)
## - punkt: d = ((⌊x_Ziel⌋ + versatz · Blick_Ziel) − x) · richtung in
##   [−hinten, vorn], |⌊z_Ziel⌋ − z| ≤ tiefe; x und z sind ganze Pixel
##   (⌊Einschlag⌋), mechanik „Fernangriffe der Gegner“, Trefferfläche
## - umkreis: |dx| ≤ halbbreite, |dz| ≤ tiefe um den Angreifer (nie er selbst)
## - gehalten: nur inst.ziel
## - bild: 0 ≤ ⌊x⌋ − Kamera-x ≤ 383 (Kampf 6.5, P30)
## Treffbarkeit (Zustand, Fenster, getroffen) prüft diese Funktion nicht.
static func inFlaeche(welt: KernWelt, inst: KernEntitaeten.Angriffsinstanz, angreifer: KernEntitaeten.EntitaetBasis, ziel: KernEntitaeten.EntitaetBasis) -> bool:
	var fl: KernEntitaeten.Flaeche = inst.flaeche
	match fl.art:
		"abstand":
			var a: KernEntitaeten.Abstand = KernEntitaeten.abstand(angreifer, ziel)
			var weg: bool = fl.hinten_weg != null and KernEntitaeten.istGegnerSlot(ziel.schluessel) and not KernEntitaeten.schautZu(ziel, angreifer)
			var hinten: int = (fl.hinten_weg as int) if (weg and fl.hinten_weg != null) else fl.hinten
			if a.d_vorn < -hinten or a.d_vorn > fl.vorn:
				return false
			if absi(a.dz) > fl.tiefe:
				return false
			if not hoeheErlaubt(fl.hoehe_angreifer_max, angreifer):
				return false
			return hoeheErlaubt(fl.hoehe_ziel_max, ziel)
		"fenster":
			var x: int = KernFestkomma.ganz(ziel.x)
			if x < fl.x_z - fl.links or x > fl.x_z + fl.rechts:
				return false
			var a: KernEntitaeten.Abstand = KernEntitaeten.abstand(angreifer, ziel)
			if a.dz < fl.dz_min or a.dz > fl.dz_max:
				return false
			if a.d_vorn < -fl.hinten:
				return false
			return hoeheErlaubt(fl.hoehe_ziel_max, ziel)
		"punkt":
			var d: int = (KernFestkomma.ganz(ziel.x) + fl.ziel_blick_versatz * ziel.blick - fl.x) * fl.richtung
			if d < -fl.hinten or d > fl.vorn:
				return false
			if absi(KernFestkomma.ganz(ziel.z) - fl.z) > fl.tiefe:
				return false
			return hoeheErlaubt(fl.hoehe_ziel_max, ziel)
		"umkreis":
			if ziel.schluessel == angreifer.schluessel:
				return false
			var a: KernEntitaeten.Abstand = KernEntitaeten.abstand(angreifer, ziel)
			if absi(a.dx) > fl.halbbreite or absi(a.dz) > fl.tiefe:
				return false
			return hoeheErlaubt(fl.hoehe_ziel_max, ziel)
		"gehalten":
			return inst.ziel != null and inst.ziel == ziel.schluessel
		"bild":
			var d: int = KernFestkomma.ganz(ziel.x) - welt.kamera.x
			return d >= 0 and d <= KernWerte.IM_BILD_MAX
	return false


# ===========================================================================
# Treffer anlegen
# ===========================================================================

static func gegenrichtung(b: int) -> int:
	return -1 if b == 1 else 1


## „vom Angreifer weg“: d_vorn ≥ 0 → Blick des Angreifers, sonst entgegen (9.4; P14).
static func wegVom(angreifer: KernEntitaeten.EntitaetBasis, ziel: KernEntitaeten.EntitaetBasis) -> int:
	return angreifer.blick if KernEntitaeten.abstand(angreifer, ziel).d_vorn >= 0 else gegenrichtung(angreifer.blick)


## Flugrichtung bei Umwerfen (Kampf 5.7): die Figur fliegt immer vom Angreifer
## weg (P14); sonst nach der RichtungsRegel der Instanz (blick: Blick des
## Angreifers; weg: vom Angreifer weg; bahn: bahn_richtung des Angreifers).
static func flugrichtung(inst: KernEntitaeten.Angriffsinstanz, angreifer: KernEntitaeten.EntitaetBasis, ziel: KernEntitaeten.EntitaetBasis) -> int:
	if ziel.schluessel == "f":
		return wegVom(angreifer, ziel)
	match inst.richtung:
		"blick":
			return angreifer.blick
		"weg":
			return wegVom(angreifer, ziel)
		"bahn":
			return angreifer.bahn_richtung
	return angreifer.blick


static func trefferAnlegen(welt: KernWelt, inst: KernEntitaeten.Angriffsinstanz, angreifer: KernEntitaeten.EntitaetBasis, ziel: KernEntitaeten.EntitaetBasis, boss: bool) -> KernEntitaeten.Treffer:
	var schaden: int = (inst.schaden_boss as int) if (boss and inst.schaden_boss != null) else inst.schaden
	var t: KernEntitaeten.Treffer = KernEntitaeten.Treffer.new()
	t.angreifer = inst.angreifer
	t.urheber = inst.urheber
	t.ziel = ziel.schluessel
	t.code = inst.code
	t.schaden = schaden
	t.umwerfen = inst.umwerfen
	t.bahn = inst.bahn
	t.richtung = flugrichtung(inst, angreifer, ziel)
	t.von_vorn = vonVorn(angreifer, ziel)
	t.wirkung = ""
	t.lp_vorher = ziel.lp
	t.instanz = inst
	welt.treffer.append(t)
	inst.getroffen.append(ziel.schluessel)
	return t


## Gegner als Ziel einer Instanz der Figur oder des geworfenen Gegners (Punkt 1 und 2).
static func gegenGegner(welt: KernWelt, lauf: Dictionary, inst: KernEntitaeten.Angriffsinstanz, angreifer: KernEntitaeten.EntitaetBasis) -> void:
	var aus: Dictionary = lauf["aus"]
	var lp_stand: Dictionary = lauf["lp"]
	var getroffen12: Dictionary = lauf["getroffen12"]
	for g: KernEntitaeten.Gegner in welt.gegner:
		var key: String = g.schluessel
		if key == angreifer.schluessel or inst.getroffen.has(key) or aus.has(key):
			continue
		if not gegnerOffen(welt, inst, angreifer, g) or not inFlaeche(welt, inst, angreifer, g):
			continue
		var t: KernEntitaeten.Treffer = trefferAnlegen(welt, inst, angreifer, g, g.typ == "Ballast")
		var rest: int = (lp_stand.get(key, g.lp) as int) - t.schaden
		lp_stand[key] = rest
		if inst.umwerfen or rest < 0:
			aus[key] = true
		getroffen12[key] = true


## Behälter als Ziel (Welt 9.2): jeder Treffer jeder Art zerbricht ein Fass, auch Gegnerangriffe.
static func gegenBehaelter(welt: KernWelt, lauf: Dictionary, inst: KernEntitaeten.Angriffsinstanz, angreifer: KernEntitaeten.EntitaetBasis) -> void:
	if not inst.behaelter or inst.flaeche.art == "gehalten" or inst.flaeche.art == "bild":
		return
	var aus: Dictionary = lauf["aus"]
	for o: KernEntitaeten.Objekt in welt.objekte:
		var key: String = o.schluessel
		if not behaelterTreffbar(o) or inst.getroffen.has(key) or aus.has(key):
			continue
		if not inFlaeche(welt, inst, angreifer, o):
			continue
		trefferAnlegen(welt, inst, angreifer, o, false)
		aus[key] = true


## Angreifende Entität einer aktiven Instanz der passenden Seite, sonst null.
## gegen ist 'gegner' oder 'figur'.
static func angreiferVon(welt: KernWelt, inst: KernEntitaeten.Angriffsinstanz, gegen: String) -> KernEntitaeten.EntitaetBasis:
	if inst == null or not inst.aktiv or inst.gegen != gegen:
		return null
	var a: KernEntitaeten.EntitaetBasis = KernEntitaeten.entitaet(welt, inst.angreifer)
	return a if (a != null and a.belegt) else null


## Punkt 1 und 2: Instanz gegen Gegner und Behälter.
static func pruefeGegenGegner(welt: KernWelt, lauf: Dictionary, inst: KernEntitaeten.Angriffsinstanz) -> void:
	var angreifer: KernEntitaeten.EntitaetBasis = angreiferVon(welt, inst, "gegner")
	if inst == null or angreifer == null:
		return
	gegenGegner(welt, lauf, inst, angreifer)
	gegenBehaelter(welt, lauf, inst, angreifer)


## Punkt 3: Instanz eines Gegners oder Gegnergeschosses gegen die Figur, dann
## gegen Behälter. Ein Gegnerangriff trifft die Figur in seinem ersten aktiven
## Frame, in dem sie in der Fläche steht (5.8); hat er sie wirksam getroffen
## (einmal), prüft er nicht mehr. Wirkungslose Treffer im Schutz nimmt
## trefferFolgen wieder aus getroffen heraus (P11).
static func pruefeGegenFigur(welt: KernWelt, lauf: Dictionary, inst: KernEntitaeten.Angriffsinstanz) -> void:
	var angreifer: KernEntitaeten.EntitaetBasis = angreiferVon(welt, inst, "figur")
	if inst == null or angreifer == null:
		return
	if inst.einmal and inst.getroffen.has("f"):
		return
	var f: KernEntitaeten.Figur = welt.figur
	if not inst.getroffen.has("f") and inFlaeche(welt, inst, angreifer, f):
		trefferAnlegen(welt, inst, angreifer, f, false)
	gegenBehaelter(welt, lauf, inst, angreifer)


## Darf der Angriff dieses Gegners in Punkt 3 prüfen (Kampf 5.4, 7)?
static func gegnerDarfPruefen(lauf: Dictionary, g: KernEntitaeten.Gegner) -> bool:
	if g.lp < 0 or g.modus == "TOT":
		return false
	var getroffen12: Dictionary = lauf["getroffen12"]
	if getroffen12.has(g.schluessel):
		return false
	if g.typ != "Ballast" and KernEntitaeten.istReaktion(g.modus):
		return false
	return true


## KS6 (Kampf 5.4): prüft alle aktiven Instanzen an den Positionen nach KS2
## bis KS4 und legt die Treffer in welt.treffer an (Reihenfolge im Kopf dieser
## Datei). Je Treffer: schaden (schaden_boss beim Boss), umwerfen, bahn,
## richtung (Kampf 5.7: Figur vom Angreifer weg, P14; sonst RichtungsRegel),
## von_vorn, lp_vorher = aktuelle LP; wirkung bleibt ''.
static func trefferPruefen(welt: KernWelt) -> void:
	var lauf: Dictionary = {"aus": {}, "lp": {}, "getroffen12": {}}
	# 1. Figur und ihre Geschosse gegen Gegner und Behälter
	pruefeGegenGegner(welt, lauf, welt.figur.angriff)
	for o: KernEntitaeten.Objekt in welt.geschosse:
		if o.belegt:
			pruefeGegenGegner(welt, lauf, o.angriff)
	# 2. geworfener Gegner gegen andere Gegner und Behälter
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			pruefeGegenGegner(welt, lauf, g.angriff)
	# 3. Gegner und ihre Geschosse gegen die Figur
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt and gegnerDarfPruefen(lauf, g):
			pruefeGegenFigur(welt, lauf, g.angriff)
	for o: KernEntitaeten.Objekt in welt.objekte:
		if o.belegt:
			pruefeGegenFigur(welt, lauf, o.angriff)


# ===========================================================================
# Prüfangriffe (Kampf 11.2)
# ===========================================================================

## Instanz PA nach Kampf 11.2: Figur −4 bis 60 px vor dem Gegner, |dz| ≤ 10, Figurhöhe ≤ 48, ohne Trefferstopp.
static func pruefangriffInstanz(g: KernEntitaeten.Gegner, p: KernStart.PruefangriffDaten) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "PA",
		"angreifer": g.schluessel,
		"flaeche": KernEntitaeten.flaeche({
			"art": "abstand",
			"vorn": KernWerte.PA_VORN,
			"hinten": KernWerte.PA_HINTEN,
			"hinten_weg": null,
			"tiefe": KernWerte.PA_TIEFE,
			"hoehe_angreifer_max": null,
			"hoehe_ziel_max": KernWerte.PA_HOEHE_MAX,
		}),
		"schaden": p.schaden,
		"umwerfen": p.umwerfen,
		"richtung": "weg",
		"trefferstopp": false,
		"einmal": true,
		"gegen": "figur",
		# Festlegung K2: Kampf 11.2 nennt als Ziel nur die Figur
		"behaelter": false,
		"beginn": p.von,
	})


## Beendet den laufenden Prüfangriff eines Gegners für immer (getroffen,
## Kampf 11.2). „Beendet“ gehört zum Prüfangriff (welt.pruefangriffe_beendet),
## nicht zum Gegner: Er beginnt auch für einen neuen Gegner im selben Slot
## nicht neu.
static func pruefangriffBeenden(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.pruefangriff > 0:
		# TypeScript-Felder wachsen beim Schreiben; hier bei Bedarf auffüllen
		while welt.pruefangriffe_beendet.size() < g.pruefangriff:
			welt.pruefangriffe_beendet.append(false)
		welt.pruefangriffe_beendet[g.pruefangriff - 1] = true
	g.pruefangriff = 0
	if g.angriff != null and g.angriff.code == "PA":
		g.angriff = null


## KS3, nach der Bewegung der Gegner (Kampf 11.2): Prüfangriffe aus
## welt.start.pruefangriffe in Szenenreihenfolge. In den Frames von bis führt
## der Gegner die Instanz PA (aktiv); sie endet, wenn der Gegner getroffen
## wird (trefferFolgen) oder Zustand 1 verlässt, und beginnt dann nicht neu.
## Ein eigener Angriff des Gegners geht vor (Puppen haben keinen).
static func pruefangriffeSchritt(welt: KernWelt) -> void:
	var f: int = welt.frame
	var liste: Array = welt.start.pruefangriffe
	for i in range(liste.size()):
		var p: KernStart.PruefangriffDaten = liste[i]
		var g: KernEntitaeten.Gegner = welt.gegner[p.slot] if (p.slot >= 0 and p.slot < welt.gegner.size()) else null
		if g == null or not g.belegt or f < p.von:
			continue
		var meine: bool = g.angriff != null and g.angriff.code == "PA" and g.pruefangriff == i + 1
		var beendet: bool = i < welt.pruefangriffe_beendet.size() and welt.pruefangriffe_beendet[i] == true
		if f > p.bis or beendet or g.zustand != KernEntitaeten.ZUSTAND_NORMAL:
			if f <= p.bis:
				while welt.pruefangriffe_beendet.size() <= i:
					welt.pruefangriffe_beendet.append(false)
				welt.pruefangriffe_beendet[i] = true
			if meine:
				g.angriff = null
				g.pruefangriff = 0
			continue
		var inst: KernEntitaeten.Angriffsinstanz = g.angriff
		if not meine or inst == null:
			if inst != null and inst.code != "PA":
				continue
			inst = pruefangriffInstanz(g, p)
			g.angriff = inst
			g.pruefangriff = i + 1
		inst.aktiv = true


# ===========================================================================
# KS7: Nacharbeit und Auskunft für die Urheberhandler
# ===========================================================================

## KS7, nach allen Ziel- und Urheberhandlern: Ein wirkungsloser Treffer im
## Schutz zählt für den Angreifer nicht (P11, 5.5): das Ziel kommt wieder aus
## instanz.getroffen heraus, der Angriff bleibt aktiv und kann in einem
## späteren aktiven Frame treffen. Ein wirksam getroffener Gegner beendet
## seinen Prüfangriff (Kampf 11.2).
static func trefferFolgen(welt: KernWelt) -> void:
	for t: KernEntitaeten.Treffer in welt.treffer:
		if t.wirkung == "W":
			var i: int = t.instanz.getroffen.rfind(t.ziel)
			if i >= 0:
				t.instanz.getroffen.remove_at(i)
			continue
		var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.ziel)
		if g != null and g.belegt:
			pruefangriffBeenden(welt, g)


## Ist der Treffer wirksam (Zielhandler fertig, Wirkung R, U, X oder B)?
static func wirksam(t: KernEntitaeten.Treffer) -> bool:
	return t.wirkung != "" and t.wirkung != "W"


## Hat die Instanz in diesem Frame mindestens ein Ziel wirksam getroffen
## (Kampf 5.3)? Gültig in KS7 nach den Zielhandlern, also im Urheberhandler.
## Behältertreffer zählen (P12, 6.4).
static func instanzHatGetroffen(welt: KernWelt, inst: KernEntitaeten.Angriffsinstanz) -> bool:
	for t: KernEntitaeten.Treffer in welt.treffer:
		if t.instanz == inst and wirksam(t):
			return true
	return false


## Ist t der erste wirksame Treffer seiner Instanz in diesem Frame? Für den
## Trefferstopp „einmal 7 Frames je Frame mit Treffern“ (Kampf 5.3, mechanik
## „Trefferreaktion der Gegner“, Mehrere Gegner): der Urheberhandler setzt
## stopp nur, wenn das true ist.
static func ersterWirksamerTreffer(welt: KernWelt, t: KernEntitaeten.Treffer) -> bool:
	for u: KernEntitaeten.Treffer in welt.treffer:
		if u.instanz == t.instanz and wirksam(u):
			return u == t
	return false
