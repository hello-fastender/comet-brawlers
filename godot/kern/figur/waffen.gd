# Gegenstände und Waffen auf der Seite der Figur (K1) nach
# docs/spezifikation-kampf.md, 10.1 (Aufnehmen), 10.2 (Essen), 10.3
# (Raketenwerfer, Rakete, Explosion) und 10.4 (Verlieren, Tausch).
# Port von spiel/src/kern/figur/waffen.ts.
#
# Liegezeit, Blinken und Verschwinden der Gegenstände zählt K3
# (gegenstaende.gd, Welt 9.3): Die Figur legt eine fallen gelassene Waffe mit
# landung_l = L und liegezeit 0 an, eine leere Waffe als Objekt typ Waffe mit
# lebensdauer 61.
class_name KernFigurWaffen
extends RefCounted

## Art der Waffe in der Hand als Gegenstand (Kampf 10.3: in der Scheibe nur der Raketenwerfer).
const WAFFE_ART: String = "Raketenwerfer"


## Gegenstand in Aufnahmereichweite (Kampf 10.1): aufnehmbar, |dz| ≤ 12,
## d_vorn im Bereich seiner Art, für beide Blickrichtungen gleich (E14);
## mehrere: kleinstes |dx|, dann kleinste Slotnummer (P20).
static func gegenstandSuchen(welt: KernWelt) -> KernEntitaeten.Objekt:
	var f: KernEntitaeten.Figur = welt.figur
	var ziel: KernEntitaeten.Objekt = null
	var besterDx: int = 0
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not o.belegt or o.typ != "Gegenstand" or not o.aufnehmbar:
			continue
		if o.art != "Raketenwerfer" and o.art != "Kometenbraten" and o.art != "Eisnudelschale" and o.art != "Sternbeeren":
			continue
		var bereich: Dictionary = KernWerte.AUFNEHMEN_BEREICH[o.art]
		var a: KernEntitaeten.Abstand = KernEntitaeten.abstand(f, o)
		if absi(a.dz) > KernWerte.AUFNEHMEN_TIEFE:
			continue
		if a.d_vorn < -(bereich["hinten"] as int) or a.d_vorn > (bereich["vorn"] as int):
			continue
		var dx: int = absi(a.dx)
		if ziel == null or dx < besterDx:
			ziel = o
			besterDx = dx
	return ziel


## Legt eine Waffe am Ort der Figur auf Höhe 0 ab (Kampf 10.4, P27): Liegezeit 700 ab L = dieser Frame, aufnehmbar.
static func waffeAblegen(welt: KernWelt, munition: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var o: KernEntitaeten.Objekt = KernEntitaeten.freiesObjekt(welt)
	if o == null:
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["OBJEKT_VOLL"], WAFFE_ART])
		return
	KernEntitaeten.objektBelegen(o, "Gegenstand")
	o.art = WAFFE_ART
	o.id = o.schluessel
	o.x = f.x
	o.z = f.z
	o.h = 0
	o.munition = munition
	o.aufnehmbar = true
	o.landung_l = welt.frame
	o.liegezeit = 0
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["WAFFE_FALLEN"], "F", WAFFE_ART, munition])


## Wirkung des Aufnehmens in P+1 (Kampf 10.1 bis 10.4): Gegenstand weg,
## Ereignis AU:F>on:Art; Waffe in die Hand (eine alte fällt mit Restmunition),
## Essen heilt bis 72 LP, bei 72 LP 100 Punkte statt der Heilung (Welt 10.2).
static func aufnehmenWirkung(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var art: String = o.art
	var munition: int = o.munition
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["AUFNEHMEN"], KernEreignisse.pfeil("f", o.schluessel), art])
	KernEntitaeten.freigeben(o)
	if art == "Raketenwerfer":
		var alte: Variant = f.munition if f.waffe != "" else null
		f.waffe = "RW"
		f.munition = munition
		if alte != null:
			waffeAblegen(welt, alte as int)
		return
	if f.lp >= KernWerte.FIGUR_LP:
		welt.rahmen.punkte += KernWerte.PUNKTE_ESSEN_VOLL
		return
	var lp: int = KernWerte.FIGUR_LP
	if art == "Eisnudelschale":
		lp = f.lp + KernFigurAngriffe.tab(KernWerte.HEILUNG_EISNUDELSCHALE, 0)
	elif art == "Sternbeeren":
		lp = f.lp + KernFigurAngriffe.tab(KernWerte.HEILUNG_STERNBEEREN, 0)
	f.lp = mini(lp, KernWerte.FIGUR_LP)


## Waffe fällt in H+1 nach einem wirksamen Gegnertreffer (Kampf 10.4): Ereignis WA:F:Art:Munition.
static func waffeFallen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.waffe_fallen_frame = 0
	if f.waffe == "":
		return
	var munition: int = f.munition
	f.waffe = ""
	f.munition = 0
	waffeAblegen(welt, munition)


## Munition leer: in P+18 weggeworfen, nicht aufnehmbar, nach 61 Frames verschwunden (Kampf 10.3; K3 zählt lebensdauer).
static func waffeWegwerfen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.waffe = ""
	f.munition = 0
	var o: KernEntitaeten.Objekt = KernEntitaeten.freiesObjekt(welt)
	if o == null:
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["OBJEKT_VOLL"], WAFFE_ART])
		return
	KernEntitaeten.objektBelegen(o, "Waffe")
	o.art = WAFFE_ART
	o.id = o.schluessel
	o.x = f.x
	o.z = f.z
	o.h = 0
	o.aufnehmbar = false
	o.lebensdauer = KernWerte.LEERE_WAFFE_LEBENSDAUER
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["WAFFE_FALLEN"], "F", WAFFE_ART, 0])


## Abschuss in P+7 (Kampf 10.3): Munition −1, Rakete im ersten freien Slot g0
## bis g4, 58 px vor der Figur, 50 px hoch, in ihrer Tiefe, Blickrichtung der
## Figur; Ereignis AB:gn. Im Abschussframe steht die Rakete.
static func raketeAbschiessen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.munition <= 0:
		return
	f.munition -= 1
	var o: KernEntitaeten.Objekt = KernEntitaeten.freiesGeschoss(welt)
	if o == null:
		return
	KernEntitaeten.objektBelegen(o, "Rakete")
	o.id = o.schluessel
	o.x = KernFestkomma.add(f.x, KernFestkomma.mulGanz(KernFestkomma.ausGanz(KernWerte.RAKETE_START_X), f.blick))
	o.z = f.z
	o.h = KernWerte.RAKETE_START_H
	o.blick = f.blick
	o.bahn_richtung = f.blick
	o.flugphase = "FLUG"
	o.besitzer = "f"
	o.abschuss = f.p
	o.flug_n = 0
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ABSCHUSS"], o.schluessel])


## Kann die Rakete nach x fliegen (Kampf 10.3: Einschlag früher an Wänden,
## Behältern und am Bildrand)? Wand = Grenze des Tiefenbands bzw. Hindernis,
## Behälter unabhängig von der Flughöhe, Bildrand 0 ≤ x − K ≤ 383 nur, wo die
## Bildränder gelten (Welt 2.2; nicht auf der Prüfbühne).
static func raketeFrei(welt: KernWelt, x: int, z: int) -> bool:
	var gx: int = KernFestkomma.ganz(x)
	if welt.stage.raender:
		var s: int = gx - welt.kamera.x
		if s < 0 or s > KernWerte.IM_BILD_MAX:
			return false
	return KernStage.begehbar(welt.stage, gx, KernFestkomma.ganz(z), 0, KernGegenstaende.behaelterHindernisse(welt))


## Einschlag (Kampf 10.3): Explosion RX am Einschlagpunkt, 15 Frames aktiv, Ereignis EX:gn.
static func einschlag(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	o.flugphase = "EXPLOSION"
	o.einschlag_x = KernFestkomma.ganz(o.x)
	o.einschlag_z = KernFestkomma.ganz(o.z)
	o.lebensdauer = KernWerte.RX_DAUER
	o.angriff = KernFigurAngriffe.explosionInstanz(o.schluessel, o.einschlag_x, o.einschlag_z, o.bahn_richtung, o.abschuss)
	o.angriff.aktiv = true
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["EINSCHLAG"], o.schluessel])


## KS4 (Kampf 10.3): Raketen der Figur in g0 bis g4 aufsteigend. Flug 5 px je
## Frame in x, Höhe sinkt 2,375 px (P9), im Flug kein Treffer; frei fliegend
## Einschlag in P+28 (21 Flugframes), sonst früher an der letzten freien Lage;
## Explosion P+28 bis P+42, danach Slot frei.
static func raketenSchritt(welt: KernWelt) -> void:
	var flugframes: int = KernWerte.RAKETE_EINSCHLAG - KernWerte.RAKETE_ABSCHUSS
	for o: KernEntitaeten.Objekt in welt.geschosse:
		if not o.belegt or o.typ != "Rakete":
			continue
		if o.flugphase == "FLUG":
			if welt.frame <= o.abschuss + KernWerte.RAKETE_ABSCHUSS:
				continue
			o.flug_n += 1
			var nx: int = KernFestkomma.add(o.x, KernFestkomma.mulGanz(KernWerte.RAKETE_V, o.bahn_richtung))
			if not raketeFrei(welt, nx, o.z):
				einschlag(welt, o)
				continue
			o.x = nx
			o.h = KernFestkomma.maxF(KernFestkomma.sub(o.h, KernWerte.RAKETE_SINKEN), 0)
			if o.flug_n >= flugframes:
				einschlag(welt, o)
		elif o.flugphase == "EXPLOSION":
			o.lebensdauer -= 1
			if o.lebensdauer <= 0:
				KernEntitaeten.freigeben(o)
				continue
			if o.angriff != null:
				o.angriff.aktiv = true
