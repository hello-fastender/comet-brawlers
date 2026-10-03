# Gegenstände und Behälter nach docs/spezifikation-welt.md, Abschnitt 9 (K3,
# Stufe 2): Slots 9.1, Behälter 9.2, Gegenstände 9.3 (Erscheinen in h+1,
# Flug 48 Frames, Landung L = h+49, Liegezeit 700 + 92 mit Blinken,
# Scrollen, Stage-Ende, leere Waffe) und die Waffe des toten Zünders (Welt 6).
# Die Seite der Figur (Aufnehmen, Essen, Waffe fallen lassen, Kampf 10)
# baut K1 mit den Hilfen unten.
# Port von spiel/src/kern/gegenstaende.ts.
#
# Schnittstelle für K1 (Kampf 10.1 bis 10.4):
# - Aufnehmbar ist ein Objekt o mit o.belegt, o.typ == 'Gegenstand' und
#   o.aufnehmbar (ab L, nicht im Flug); Art o.art, Munition o.munition,
#   Liegezeit o.liegezeit, sichtbar o.sichtbar (Blinken). Bereich und Ablauf
#   nach Kampf 10.1 (werte.gd AUFNEHMEN_BEREICH[o.art], AUFNEHMEN_TIEFE).
# - In P+1: gegenstandAufnehmen(welt, o) gibt { art, munition } zurück und
#   gibt den Slot frei; das Ereignis AU:F>on:Art schreibt K1 vorher.
# - Waffe fallen lassen bzw. Tausch (Kampf 10.4): gegenstandAblegen(welt,
#   'Raketenwerfer', x, z, munition) legt sie gelandet und aufnehmbar ab,
#   L = laufender Frame (Liegezeit 0); WA schreibt K1.
# - Leere Waffe (Kampf 10.3): leereWaffeWerfen(welt, x, z), verschwindet nach
#   61 Frames.
# - Punkte für Essen bei 72 LP: rahmen.gd punkteAddieren.
# - Hindernisse der Behälter für schrittBegrenzt (bis einschließlich Frame h
#   des Zerbrechens, Welt 9.2): behaelterHindernisse(welt).
#
# Festlegungen K3 (Lücken, Bericht):
# - Ein zerbrochener Behälter verschwindet in W8 von h+1; sein Inhalt
#   erscheint im selben Schritt im kleinsten freien Objektslot (meist dem
#   Slot des Behälters).
# - Bei welle.7=nur_boss sind die Bosskisten seit Frame 0 zerbrochen; ihr
#   Inhalt erscheint deshalb in Frame 1 und fliegt wie sonst.
# - Ein Treffer auf eine Bosskiste oder einen schon zerbrochenen Behälter
#   bleibt wirkungslos (Wirkung W); VORSCHLAG (K2): solche Behälter gar nicht
#   als Ziel prüfen.
# - Die Waffe des Zünders erscheint in W8 von t an seiner Lage und Höhe,
#   fliegt 34 Frames (n = 1 … 34) mit 2 px/Frame von der Figur weg, liegt ab
#   t+34 am Boden und ist ab L = t+44 aufnehmbar (Ereignis LA in t+44). Eine
#   Wand hält sie in x auf.
# - Behälter, die beim Scrollen verschwinden, schreiben ebenfalls EN:on:S.
# - Ein Gegenstand der Prüfszene (liegt von Beginn an, L19) zählt seine
#   Liegezeit ab seinem ersten W8 (L = 1).
#
# Hinweise zum Port: GegenstandArt ist ein String. gegenstandAufnehmen gibt
# ein Dictionary {art, munition} zurück. Fehlerfälle (throw) sind push_error
# mit unauffälligem Rückgabewert.
class_name KernGegenstaende
extends RefCounted

# ===========================================================================
# Hilfen für andere Module
# ===========================================================================

## Hindernisse der Behälter (Welt 2.2, Punkt 6) für stage.gd schrittBegrenzt
## und begehbar: ein Behälter ist Hindernis bis zum Zerbrechen, auch noch im
## Frame h des Zerbrechens, ab h+1 nicht mehr (Welt 9.2). Einzige Fassung für
## Figur, Raketen der Figur, Gegner, Reaktionsbahnen und Boss.
## Gibt ein Array von KernStage.Hindernis zurück.
static func behaelterHindernisse(welt: KernWelt) -> Array:
	var liste: Array = []
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt or o.typ != "Behälter":
			continue
		if o.zerbrochen and o.zerbrochen_h < welt.frame:
			continue
		liste.append(KernStage.behaelterHindernis(o.schluessel if o.id == "" else o.id, KernFestkomma.ganz(o.x), KernFestkomma.ganz(o.z)))
	return liste


## Ist o ein aufnehmbarer Gegenstand (Welt 9.3: ab L, nicht im Flug)?
static func istAufnehmbar(o: KernEntitaeten.Objekt) -> bool:
	return o.belegt and o.typ == "Gegenstand" and o.aufnehmbar


## Munition eines neuen Gegenstands: Raketenwerfer 3 Schuss (Welt 9.3), sonst 0.
static func munitionVon(art: String) -> int:
	return KernWerte.RAKETENWERFER_MUNITION if art == "Raketenwerfer" else 0


## Legt einen Gegenstand im kleinsten freien Objektslot an; ohne Slot OV:Art und null (Welt 9.1).
static func gegenstandNeu(welt: KernWelt, art: String, x: int, z: int) -> KernEntitaeten.Objekt:
	var o: KernEntitaeten.Objekt = KernEntitaeten.freiesObjekt(welt)
	if o == null:
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["OBJEKT_VOLL"], art])
		return null
	KernEntitaeten.objektBelegen(o, "Gegenstand")
	o.art = art
	o.x = KernFestkomma.ausGanz(x)
	o.z = KernFestkomma.ausGanz(z)
	o.munition = munitionVon(art)
	o.abschuss = welt.frame
	return o


## Legt einen Gegenstand sofort gelandet und aufnehmbar ab (Kampf 10.4: Waffe
## fallen lassen in H+1 bzw. Tausch in P+1, L = laufender Frame, Liegezeit 0).
## Gibt das Objekt zurück, ohne freien Slot null (OV:Art).
static func gegenstandAblegen(welt: KernWelt, art: String, x: int, z: int, munition: int) -> KernEntitaeten.Objekt:
	var o: KernEntitaeten.Objekt = gegenstandNeu(welt, art, x, z)
	if o == null:
		return null
	o.munition = munition
	o.landung_l = welt.frame
	o.liegezeit = 0
	o.aufnehmbar = true
	return o


## Wirft die leere Waffe weg (Kampf 10.3): nicht aufnehmbar, nach 61 Frames entfernt (EN:on:L).
static func leereWaffeWerfen(welt: KernWelt, x: int, z: int) -> KernEntitaeten.Objekt:
	var o: KernEntitaeten.Objekt = KernEntitaeten.freiesObjekt(welt)
	if o == null:
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["OBJEKT_VOLL"], "Raketenwerfer"])
		return null
	KernEntitaeten.objektBelegen(o, "Waffe")
	o.art = "Raketenwerfer"
	o.x = KernFestkomma.ausGanz(x)
	o.z = KernFestkomma.ausGanz(z)
	o.munition = 0
	o.abschuss = welt.frame
	return o


## Nimmt einen aufnehmbaren Gegenstand auf (Kampf 10.1, Wirkung in P+1): gibt Art und Munition zurück, Slot frei.
## Rückgabe: Dictionary {"art": String, "munition": int}.
static func gegenstandAufnehmen(_welt: KernWelt, o: KernEntitaeten.Objekt) -> Dictionary:
	if not istAufnehmbar(o) or o.art == "" or o.art == "Fass" or o.art == "Bosskiste":
		push_error("gegenstandAufnehmen: %s ist kein aufnehmbarer Gegenstand" % o.schluessel)
		return {"art": "", "munition": 0}
	var ergebnis: Dictionary = {"art": o.art, "munition": o.munition}
	KernEntitaeten.freigeben(o)
	return ergebnis


## Zerbricht alle Bosskisten im laufenden Frame (Welt 4.6, 9.2: beim Weckreiz des Bosses); Inhalt in h+1.
static func bosskistenZerbrechen(welt: KernWelt) -> void:
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt or o.typ != "Behälter" or o.art != "Bosskiste" or o.zerbrochen:
			continue
		o.zerbrochen = true
		o.zerbrochen_h = welt.frame


# ===========================================================================
# KS7: Behälter getroffen (Welt 9.2)
# ===========================================================================

## KS7, Zielhandler für Behälter (Welt 9.2): ein Fass zerbricht beim ersten
## Treffer jeder Art im Frame h (Wirkung B); ab h+1 kein Hindernis, Inhalt in
## h+1. Bosskisten und schon zerbrochene Behälter: Wirkung W (siehe Kopf).
static func behaelterGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var o: KernEntitaeten.Objekt = KernEntitaeten.objektVon(welt, t.ziel)
	if o == null or not o.belegt:
		push_error("behaelterGetroffen: %s ist kein belegter Objektslot" % t.ziel)
		return
	t.lp_vorher = o.lp
	var zerbricht: bool = o.typ == "Behälter" and o.art == "Fass" and not o.zerbrochen
	t.wirkung = "B" if zerbricht else "W"
	KernEreignisse.ereignisTreffer(welt, t)
	if not zerbricht:
		return
	o.zerbrochen = true
	o.zerbrochen_h = welt.frame


# ===========================================================================
# W6: Verschwinden beim Scrollen (Welt 9.2, 9.3)
# ===========================================================================

## W6, nach der Kamera: Gegenstände ab K − ⌊x⌋ ≥ 163 und Behälter ab 195 entfernen, Ereignis EN:on:S.
static func gegenstaendeScrollen(welt: KernWelt) -> void:
	var k: int = welt.kamera.x
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt:
			continue
		var links: int = k - KernFestkomma.ganz(o.x)
		var weg: bool = ((o.typ == "Gegenstand" or o.typ == "Waffe") and links >= KernWerte.SCROLL_GEGENSTAND) or (o.typ == "Behälter" and links >= KernWerte.SCROLL_BEHAELTER)
		if not weg:
			continue
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ENTFERNT"], o.schluessel, "S"])
		KernEntitaeten.freigeben(o)


# ===========================================================================
# W8: Erscheinen, Flug, Liegezeit (Welt 9.3, 6)
# ===========================================================================

## Höhe im n-ten Frame nach dem Erscheinen aus einem Behälter: ⌊n·(48 − n)·35/576⌋ px (Welt 9.3).
static func flughoeheBehaelter(n: int) -> int:
	return KernFestkomma.divGanz(n * (KernWerte.GEGENSTAND_FLUG - n) * KernWerte.GEGENSTAND_SCHEITEL, KernWerte.GEGENSTAND_FLUG_TEILER)


## Bogen der Zünderwaffe über der Höhe in t: ⌊n·(34 − n)·61/289⌋ px (Welt 6).
static func flughoeheZuenderwaffe(n: int) -> int:
	return KernFestkomma.divGanz(n * (KernWerte.ZUENDER_WAFFE_FLUG - n) * KernWerte.ZUENDER_WAFFE_HOEHE, KernWerte.ZUENDER_WAFFE_TEILER)


## Inhalt zerbrochener Behälter in h+1: Behälter weg, Gegenstand erscheint am Ort, Höhe 0, ER:on:Art.
static func behaelterOeffnen(welt: KernWelt) -> void:
	var f: int = welt.frame
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt or o.typ != "Behälter" or not o.zerbrochen or f != o.zerbrochen_h + 1:
			continue
		var inhalt: String = o.inhalt
		var x: int = KernFestkomma.ganz(o.x)
		var z: int = KernFestkomma.ganz(o.z)
		KernEntitaeten.freigeben(o)
		if inhalt == "leer" or inhalt == "":
			continue
		var neu: KernEntitaeten.Objekt = gegenstandNeu(welt, inhalt, x, z)
		if neu == null:
			continue
		neu.flugphase = "FLUG"
		neu.flug_n = 0
		neu.flugart = "behaelter"
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ERSCHEINT"], neu.schluessel, inhalt])


## Waffe des toten Zünders ab t (Welt 6): Raketenwerfer mit 3 Schuss, unabhängig von seinen Schüssen.
static func zuenderWaffen(welt: KernWelt) -> void:
	var fig: KernEntitaeten.Figur = welt.figur
	for g: KernEntitaeten.Gegner in welt.gegner:
		if not g.belegt or g.typ != "Zünder" or g.lp >= 0 or g.ohne_punkte or g.waffe_gefallen:
			continue
		g.waffe_gefallen = true
		var neu: KernEntitaeten.Objekt = gegenstandNeu(welt, "Raketenwerfer", KernFestkomma.ganz(g.x), KernFestkomma.ganz(g.z))
		if neu == null:
			continue
		var dx: int = KernFestkomma.ganz(g.x) - KernFestkomma.ganz(fig.x)
		var richtung: int
		if dx > 0:
			richtung = 1
		elif dx < 0:
			richtung = -1
		else:
			richtung = -1 if g.blick == 1 else 1
		neu.h = g.h
		neu.flugphase = "FLUG"
		neu.flug_n = 0
		neu.bahn_richtung = richtung
		neu.flugart = "zuender"
		neu.flug_h0 = g.h
		neu.liegt_ab = welt.frame + KernWerte.ZUENDER_WAFFE_LIEGT_AB
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ERSCHEINT"], neu.schluessel, "Raketenwerfer"])


static func landen(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	o.landung_l = welt.frame
	o.liegezeit = 0
	o.aufnehmbar = true
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["GELANDET"], o.schluessel])


## Flug eines Gegenstands aus einem Behälter: n = 1 … 48, gelandet bei n = 48 (L = h+49).
static func flugBehaelter(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	o.flug_n += 1
	var n: int = o.flug_n
	o.h = KernFestkomma.ausGanz(flughoeheBehaelter(n))
	if n >= KernWerte.GEGENSTAND_FLUG:
		o.h = 0
		o.flugphase = ""
		landen(welt, o)


## Flug der Zünderwaffe: n = 1 … 34 mit 2 px/Frame von der Figur weg, aufnehmbar ab L = t+44.
static func flugZuender(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	if o.flugphase == "FLUG":
		o.flug_n += 1
		var n: int = o.flug_n
		var b: KernStage.Begrenzung = KernStage.Begrenzung.new()
		b.stage = welt.stage
		b.zusatz = []
		b.x_min = null
		b.x_max = null
		var schritt: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(b, o.x, o.z, o.h, KernFestkomma.mulGanz(KernWerte.ZUENDER_WAFFE_X, o.bahn_richtung), 0)
		o.x = schritt.x
		o.h = KernFestkomma.add(o.flug_h0, KernFestkomma.ausGanz(flughoeheZuenderwaffe(n)))
		if n >= KernWerte.ZUENDER_WAFFE_FLUG:
			o.h = 0
			o.flugphase = ""
	if welt.frame == o.liegt_ab:
		landen(welt, o)


## Liegezeit und Blinken (Welt 9.3): Waffen sichtbar bis 699, Blinken 700 bis
## 791 (BLINKEN_TAKT Frames sichtbar, ebenso viele unsichtbar; Zweierpotenz,
## daher als Bitmaske ohne Division, Kampf 2.4), entfernt bei 792; Essen unbegrenzt.
static func liegen(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	o.liegezeit = welt.frame - o.landung_l
	if o.art != "Raketenwerfer":
		return
	if o.liegezeit >= KernWerte.LIEGEZEIT_ENTFERNT:
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ENTFERNT"], o.schluessel, "L"])
		KernEntitaeten.freigeben(o)
		return
	o.sichtbar = o.liegezeit < KernWerte.LIEGEZEIT_WAFFE or (((o.liegezeit - KernWerte.LIEGEZEIT_WAFFE) & KernWerte.BLINKEN_TAKT) == 0)


## W8 (Welt 9.3): Inhalt zerbrochener Behälter in h+1 (ER:on:Art), Waffe des
## toten Zünders in t, Flug (LA:on), Liegezeit und Blinken (sichtbar),
## Entfernen nach der Liegezeit (EN:on:L), leere Waffen nach 61 Frames
## (EN:on:L), alle Gegenstände in t+480 nach dem Fall des Bosses (EN:on:E).
static func gegenstaendeSchritt(welt: KernWelt) -> void:
	var f: int = welt.frame
	behaelterOeffnen(welt)
	zuenderWaffen(welt)
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt:
			continue
		if o.typ == "Waffe":
			if f - o.abschuss >= KernWerte.LEERE_WAFFE_LEBENSDAUER:
				KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ENTFERNT"], o.schluessel, "L"])
				KernEntitaeten.freigeben(o)
			continue
		if o.typ != "Gegenstand":
			continue
		if o.landung_l == 0 and o.flugart == "" and o.aufnehmbar:
			o.landung_l = f
		if o.landung_l == 0 and o.abschuss < f:
			if o.flugart == "behaelter":
				flugBehaelter(welt, o)
			elif o.flugart == "zuender":
				flugZuender(welt, o)
			continue
		if o.landung_l > 0:
			liegen(welt, o)
	var t: int = welt.rahmen.boss_t
	if t > 0 and f == t + KernWerte.STAGE_ENDE_ENTFERNEN:
		for o: KernEntitaeten.Objekt in welt.objekte:
			if not o.belegt or (o.typ != "Gegenstand" and o.typ != "Waffe"):
				continue
			KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ENTFERNT"], o.schluessel, "E"])
			KernEntitaeten.freigeben(o)
