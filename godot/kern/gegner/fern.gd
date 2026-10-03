# Fernkämpfer Zünder nach docs/spezifikation-welt.md, Abschnitt 6 mit E17
# (K3, Stufe 2): Zielpunkt (128 px in der Tiefe der Figur oder 120 px mit
# 24 px Versatz, Wahl aus g.zufall), Zielbeginn höchstens 8 px in x und
# 6 px in der Tiefe vom Zielpunkt, Zielrecht, ZIELEN genau 60 Frames mit
# Tiefenschritten, SCHUSS ZR (17 Frames, Rakete in Q = A+6), Rakete und
# Explosion (Q+20 bzw. an einer Wand, Explosion 9 Frames als Instanz mit
# Fläche punkt), Zurückweichen, Kolbenhieb ZK mit Nahkampfrecht. Die Waffe
# beim Tod legt gegenstaende.gd ab.
# Port von spiel/src/kern/gegner/fern.ts.
#
# Festlegungen K3 (Lücken, Bericht):
# - „Zurückweichen: geht vom Zielpunkt weg“ ist gelesen als: Er geht mit
#   Blick zur Figur zu seinem Zielpunkt, also von der Figur weg (Zustand
#   ZURUECK, solange |dx| < 100); Zielbeginn gilt dort wie in ANNAEHERN.
# - Im Zielen bleibt der Blick vom Zielbeginn; so kann die Figur „hinter ihm“
#   stehen (Abbruch). Ein Abbruch des Zielens schreibt kein AA (kein Angriff
#   begonnen); die Zielpunktwahl bleibt.
# - Das Zielrecht wird ohne Ereignis abgegeben (RA gilt dem Nahkampfrecht).
# - Kolbenhieb: Nachlauf wie BA (12–36, mit Treffer 16–36 Frames), danach gibt
#   er das Nahkampfrecht ab. „Bildrand“ hinter ihm: K bzw. K + 383.
# - Der Bildrand hält die Rakete nicht auf (Welt 6: offen); eine Wand ist das
#   Ende des Tiefenbands bzw. ein Hindernis jeder Höhe (Festlegung Q1: die
#   Flughöhe ist nur Darstellung, Welt 6; wie bei der Rakete der Figur, L83).
#   Behälter halten sie nicht auf. Einschlag: EX:on, Bildschütteln (KA10).
# - fest.zielpunkt: 128, 120h (24 px nach hinten) oder 120v (24 px nach vorn).
class_name KernGegnerFern
extends RefCounted

## Werte des Kolbenhiebs: wie Bolzer Schlag A (Welt 6).
const KOLBEN: Dictionary = KernWerte.NAH_ANGRIFFE["BA"]
## Explosion d = 1 … 9 Frames nach dem Einschlag (Q+21 bis Q+29 bei Einschlag in Q+20, Welt 6).
const EXPLOSION_VON: int = KernWerte.ZR_EXPLOSION_VON - KernWerte.ZR_EINSCHLAG
const EXPLOSION_BIS: int = KernWerte.ZR_EXPLOSION_BIS - KernWerte.ZR_EINSCHLAG

## Werte von fest.zielpunkt in der Reihenfolge der Ziehung (Welt 6, 11.2).
const ZIELPUNKTE: Array[String] = ["128", "120h", "120v"]

# ===========================================================================
# Zielpunkt (Welt 6)
# ===========================================================================

## Zielpunkt ziehen: gleichverteilt aus drei Punkten (Welt 6), fest.zielpunkt ersetzt das Ergebnis.
static func zielpunktZiehen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var i: int = KernZufall.ziehenAus(g.zufall, KernWerte.ZIELPUNKT_AUS)
	var t: Variant = welt.fest.get("zielpunkt")
	if t != null:
		var j: int = ZIELPUNKTE.find(t as String)
		if j < 0:
			push_error("fest.zielpunkt=%s: erlaubt sind %s" % [t, " ".join(ZIELPUNKTE)])
			return
		i = j
	g.timer["zielwahl"] = i
	g.timer["zielwahl_gesetzt"] = 1


## Zielpunkt zur aktuellen Lage der Figur (Welt 6), begrenzt auf K + 16 … K + 368 und das Band; setzt g.zielpunkt_x, g.zielpunkt_z.
static func zielpunktBerechnen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var fig: KernEntitaeten.Figur = welt.figur
	var wahl: int = KernGegnerNah.tm(g, "zielwahl")
	var abstand: int = KernWerte.ZIELPUNKT_GERADE if wahl == 0 else KernWerte.ZIELPUNKT_VERSATZ_X
	var versatz: int = KernWerte.ZIELPUNKT_VERSATZ_Z if wahl == 1 else (-KernWerte.ZIELPUNKT_VERSATZ_Z if wahl == 2 else 0)
	var dx: int = KernFestkomma.ganz(g.x) - KernFestkomma.ganz(fig.x)
	var seite: int = 1 if dx > 0 else (-1 if dx < 0 else g.seite)
	g.seite = seite
	g.zielpunkt_x = KernGegnerNahGehen.fensterX(welt, KernFestkomma.ganz(fig.x) + seite * abstand)
	g.zielpunkt_z = KernGegnerNahGehen.bandZ(welt, g.zielpunkt_x, KernFestkomma.ganz(fig.z) + versatz)


## Steht er am Zielpunkt (höchstens 8 px in x und 6 px in der Tiefe, Welt 6)?
static func amZielpunkt(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	zielpunktBerechnen(welt, g)
	return absi(KernFestkomma.ganz(g.x) - g.zielpunkt_x) <= KernWerte.ZIELBEGINN_X and absi(KernFestkomma.ganz(g.z) - g.zielpunkt_z) <= KernWerte.ZIELBEGINN_Z


# ===========================================================================
# Zustandswechsel
# ===========================================================================

static func beginneAnnaehern(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.angriff = null
	if g.angriff_code == "ZK":
		g.angriff_code = ""
	var zurueck: bool = absi(KernGegnerNah.weltAbstand(welt, g)["dx"] as int) < KernWerte.ZURUECKWEICHEN_ABSTAND
	KernEntitaeten.modusSetzen(g, "ZURUECK" if zurueck else "ANNAEHERN")
	g.gehbefehl_rest = 0
	g.timer["angekommen"] = 0


static func beginneZielen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernEntitaeten.modusSetzen(g, "ZIELEN")
	g.timer["ziel_z"] = welt.frame
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	g.aktion = "ZIELEN"


## Schuss ZR in A = z+60 (Welt 6): Schaden nach dem Rang, AS:sn:ZR; die Rakete folgt in Q = A+6.
static func beginneSchuss(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	KernEntitaeten.modusSetzen(g, "SCHUSS")
	g.angriff_a = welt.frame
	g.angriff_code = "ZR"
	g.schaden = KernWerte.SCHADEN_ZUENDER_RAKETE[KernRang.rangstufe(welt.rang.rang)]
	g.aktion = "SCHUSS"
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ANGRIFF"], g.schluessel, "ZR"])


## Kolbenhieb möglich (Welt 6): hinter ihm weniger als 24 px bis zum Bildrand, |dx| ≤ 60, im Fenster, keine Sperre (E-10).
static func kolbenhiebMoeglich(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var dx: int = KernGegnerNah.weltAbstand(welt, g)["dx"]
	if absi(dx) > KernWerte.KOLBENHIEB_DX or not KernEntitaeten.imFenster(g, welt.kamera.x) or KernGegnerNah.rechteGesperrt(welt):
		return false
	var x: int = KernFestkomma.ganz(g.x)
	var k: int = welt.kamera.x
	var blick: int = KernEntitaeten.blickZu(g, welt.figur)
	var rand: int = x - k if blick == 1 else k + KernWerte.IM_BILD_MAX - x
	return rand < KernWerte.KOLBENHIEB_RAND


## Kolbenhieb ZK (Welt 6): wie BA, Fenster nach 5.4, Schaden wie ein später Bolzer.
static func beginneKolbenhieb(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var f: int = welt.frame
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	KernGegnerNah.zielabstandSetzen(welt, g)
	g.schaden = KernWerte.SCHADEN_BOLZER[KernRang.rangstufe(welt.rang.rang)]
	g.angriff_code = "ZK"
	g.angriff_a = f
	g.angriff_abgebrochen = false
	g.angriff_treffer = 0
	g.angriff_aktiv_ende = f + (KOLBEN["aktiv_bis"] as int)
	g.timer["kolben_nachlauf"] = 0
	g.angriff = KernEntitaeten.angriffsinstanz({
		"code": "ZK",
		"angreifer": g.schluessel,
		"flaeche": KernGegnerNah.nahFenster(g),
		"schaden": g.schaden,
		"umwerfen": KOLBEN["umwerfen"],
		"richtung": "weg",
		"trefferstopp": true,
		"einmal": true,
		"gegen": "figur",
		"beginn": f,
	})
	KernEntitaeten.modusSetzen(g, "KOLBENHIEB")
	g.aktion = "ANGRIFF"
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ANGRIFF"], g.schluessel, "ZK"])


## W4 im Kolbenhieb: nach den aktiven Frames Nachlauf wie BA, danach Recht abgeben und neu annähern.
static func kolbenEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var f: int = welt.frame
	if g.recht == "":
		beginneAnnaehern(welt, g)
		return
	if KernGegnerNah.tm(g, "kolben_nachlauf") == 0:
		if f <= g.angriff_aktiv_ende:
			return
		g.angriff = null
		var grenzen: Array = KOLBEN["nachlauf_mit"] if g.angriff_treffer > 0 else KOLBEN["nachlauf_ohne"]
		var a: int = grenzen[0]
		var b: int = grenzen[1]
		var n: int = KernGegnerNah.festZahl(welt, "nachlauf", KernZufall.bereich(g.zufall, a, b))
		g.timer["kolben_nachlauf"] = 1
		g.nachlauf_ende = f + n - 1
		g.aktion = "NACHLAUF"
		if n > 0:
			return
	if f > g.nachlauf_ende:
		KernGegnerRechte.rechtAbgeben(welt, g)
		beginneAnnaehern(welt, g)


# ===========================================================================
# W4
# ===========================================================================

## W4 für einen Zünder (nicht in einer Reaktion): Zustand (ANNAEHERN, BEREIT,
## ZIELEN, SCHUSS, ZURUECK, KOLBENHIEB), Zielrecht und Nahkampfrecht anfordern
## (Slots aufsteigend), Zielpunkt aus g.zufall, Angriffsbeginn.
static func fernEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.lp < 0:
		return
	var f: int = welt.frame
	if g.recht == "":
		var dx: int = KernGegnerNah.weltAbstand(welt, g)["dx"]
		if dx != 0:
			g.seite = 1 if dx > 0 else -1
	match g.modus:
		"WARTEN":
			g.aktion = "WARTEN"
			return
		"AUFTRITT":
			if f < g.kampffaehig_ab:
				return
			g.zustand = KernEntitaeten.ZUSTAND_NORMAL
			if KernGegnerNah.tm(g, "zielwahl_gesetzt") != 1:
				zielpunktZiehen(welt, g)
			beginneAnnaehern(welt, g)
		"FREI":
			if g.recht != "":
				KernGegnerRechte.rechtAbgeben(welt, g)
			if KernGegnerNah.tm(g, "zielwahl_gesetzt") != 1:
				zielpunktZiehen(welt, g)
			beginneAnnaehern(welt, g)
		"ZIELEN":
			if not g.zielrecht:
				beginneAnnaehern(welt, g)
			else:
				if f >= KernGegnerNah.tm(g, "ziel_z") + KernWerte.ZIELEN_DAUER:
					beginneSchuss(welt, g)
				return
		"SCHUSS":
			if f < g.angriff_a + KernWerte.SCHUSS_DAUER:
				return
			g.angriff_code = ""
			KernGegnerRechte.zielrechtAbgeben(welt, g)
			zielpunktZiehen(welt, g)
			if amZielpunkt(welt, g):
				if KernGegnerNah.zielrechtAnfordern(welt, g):
					beginneZielen(welt, g)
					return
				KernEntitaeten.modusSetzen(g, "BEREIT")
				g.aktion = "STAND"
				return
			beginneAnnaehern(welt, g)
		"KOLBENHIEB":
			kolbenEntscheidung(welt, g)
			if g.modus == "KOLBENHIEB":
				return
		"ANNAEHERN", "ZURUECK", "BEREIT":
			pass
		_:
			return
	# ANNAEHERN, ZURUECK, BEREIT
	if kolbenhiebMoeglich(welt, g) and KernGegnerNah.rechtAnfordern(welt, g):
		beginneKolbenhieb(welt, g)
		return
	if g.modus == "BEREIT" or KernGegnerNah.tm(g, "angekommen") == 1:
		g.timer["angekommen"] = 0
		if amZielpunkt(welt, g):
			if KernGegnerNah.zielrechtAnfordern(welt, g):
				beginneZielen(welt, g)
				return
			KernEntitaeten.modusSetzen(g, "BEREIT")
			g.aktion = "STAND"
			return
	var zurueck: bool = absi(KernGegnerNah.weltAbstand(welt, g)["dx"] as int) < KernWerte.ZURUECKWEICHEN_ABSTAND
	KernEntitaeten.modusSetzen(g, "ZURUECK" if zurueck else "ANNAEHERN")
	if g.gehbefehl_rest <= 0:
		KernGegnerNah.gehstufeZiehen(welt, g)


# ===========================================================================
# KS3
# ===========================================================================

## Rakete in Q = A+6 im kleinsten freien Objektslot, 45 px vor ihm, 44 px hoch, in seiner Tiefe (Welt 6).
static func raketeAbfeuern(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var o: KernEntitaeten.Objekt = KernEntitaeten.freiesObjekt(welt)
	if o == null:
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["OBJEKT_VOLL"], "Rakete"])
		return
	KernEntitaeten.objektBelegen(o, "Rakete")
	o.x = KernFestkomma.ausGanz(KernFestkomma.ganz(g.x) + g.blick * KernWerte.ZR_RAKETE_X)
	o.z = g.z
	o.h = KernWerte.ZR_RAKETE_H
	o.blick = g.blick
	o.bahn_richtung = g.blick
	o.besitzer = g.schluessel
	o.abschuss = welt.frame
	o.flugphase = "FLUG"
	o.flug_n = 0
	o.timer["schaden"] = g.schaden


static func gehenZumZielpunkt(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	if amZielpunkt(welt, g):
		g.timer["angekommen"] = 1
		g.aktion = "STAND"
		return
	KernGegnerNahGehen.gehen(welt, g, g.zielpunkt_x, g.zielpunkt_z, KernGegnerNahGehen.gehTempo(g))
	if g.gehbefehl_rest > 0:
		g.gehbefehl_rest -= 1
	g.aktion = "GEHEN"
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
	if amZielpunkt(welt, g):
		g.timer["angekommen"] = 1


## Tiefenschritt im Zielen (Welt 6): dz nach dem Vorframe außerhalb von −6 … +5 → ein Schritt in der Tiefe zur Figur.
static func zielenTiefe(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	var dz: int = g.z_vor - welt.figur.z_vor
	if dz >= KernWerte.ZIELEN_DZ_MIN and dz <= KernWerte.ZIELEN_DZ_MAX:
		return
	var v: int = KernGegnerNahGehen.tiefenTempo(KernGegnerNahGehen.gehTempo(g))
	var r: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(KernGegnerNahGehen.gegnerBegrenzung(welt), g.x, g.z, g.h, 0, KernFestkomma.neg(v) if dz > 0 else v)
	g.z = r.z


## KS3 für einen Zünder: Bewegung, Zielen mit Tiefenschritten, Schuss (Rakete in Q = A+6 im kleinsten freien Objektslot).
static func fernBewegung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.lp < 0:
		return
	var f: int = welt.frame
	match g.modus:
		"WARTEN":
			g.aktion = "WARTEN"
		"AUFTRITT":
			g.aktion = "AUFTRITT"
		"ANNAEHERN", "ZURUECK":
			gehenZumZielpunkt(welt, g)
		"BEREIT":
			zielpunktBerechnen(welt, g)
			g.blick = KernEntitaeten.blickZu(g, welt.figur)
			g.aktion = "STAND"
		"ZIELEN":
			g.aktion = "ZIELEN"
			zielenTiefe(welt, g)
		"SCHUSS":
			g.aktion = "SCHUSS"
			if f == g.angriff_a + KernWerte.ZR_RAKETE_AB:
				raketeAbfeuern(welt, g)
		"KOLBENHIEB":
			var inst: KernEntitaeten.Angriffsinstanz = g.angriff
			if inst != null:
				var rel: int = f - g.angriff_a
				inst.aktiv = rel >= (KOLBEN["aktiv_von"] as int) and rel <= (KOLBEN["aktiv_bis"] as int) and g.angriff_treffer == 0 and not g.angriff_abgebrochen
		_:
			g.aktion = "STAND"


# ===========================================================================
# KS5, KS7
# ===========================================================================

## KS5: Abbruch des Zielens (Figur hinter ihm oder |dx| > 200) bzw. des Kolbenhiebs (Fenster nach 5.4).
static func fernAbbruch(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.modus == "ZIELEN":
		var dx: int = KernGegnerNah.weltAbstand(welt, g)["dx"]
		var hinter: bool = -dx * g.blick < 0
		if hinter or absi(dx) > KernWerte.ZIELEN_ABBRUCH_DX:
			KernGegnerRechte.zielrechtAbgeben(welt, g)
			beginneAnnaehern(welt, g)
		return
	if g.modus != "KOLBENHIEB" or g.angriff == null or g.angriff_treffer > 0:
		return
	var rel: int = welt.frame - g.angriff_a
	if rel < 1 or rel > (KOLBEN["aktiv_bis"] as int):
		return
	if not KernGegnerNah.ausserhalbAbbruchfenster(welt, g):
		return
	g.angriff = null
	g.angriff_abgebrochen = true
	g.angriff_code = ""
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["ABBRUCH"], g.schluessel])
	KernGegnerRechte.rechtAbgeben(welt, g)
	beginneAnnaehern(welt, g)


## KS7, Seite des Urhebers: wirksamer Treffer des Zünders (Kolbenhieb ZK: aktive Pose 7 Frames länger; Explosion ZR: nichts).
static func fernHatGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.urheber)
	if g == null or t.code != "ZK" or g.modus != "KOLBENHIEB":
		return
	g.angriff_treffer = welt.frame
	g.angriff_aktiv_ende = g.angriff_a + (KOLBEN["aktiv_bis"] as int) + KernWerte.GEGNER_TREFFERSTOPP
	if g.angriff != null:
		g.angriff.aktiv = false


# ===========================================================================
# KS4: Raketen der Zünder (o20 bis o59)
# ===========================================================================

## Einschlag (Welt 6): Explosion als Angriffsinstanz des Objektslots mit Fläche punkt, EX:on, Bildschütteln.
static func einschlag(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	o.flugphase = "EXPLOSION"
	o.timer["einschlag"] = welt.frame
	o.einschlag_x = KernFestkomma.ganz(o.x)
	o.einschlag_z = KernFestkomma.ganz(o.z)
	o.angriff = KernEntitaeten.angriffsinstanz({
		"code": "ZR",
		"angreifer": o.schluessel,
		"urheber": o.schluessel if o.besitzer == null else o.besitzer,
		"flaeche": KernEntitaeten.flaeche({
			"art": "punkt",
			"x": o.einschlag_x,
			"z": o.einschlag_z,
			"richtung": 1,
			"vorn": KernWerte.ZR_EXPLOSION_H - 1,
			"hinten": KernWerte.ZR_EXPLOSION_H,
			"tiefe": KernWerte.ZR_EXPLOSION_TIEFE,
			"ziel_blick_versatz": KernWerte.ZR_BLICK_VERSATZ,
			"hoehe_ziel_max": KernWerte.ZR_EXPLOSION_HOEHE_MAX,
		}),
		"schaden": tm2(o, "schaden"),
		"umwerfen": true,
		"richtung": "weg",
		"trefferstopp": false,
		"einmal": true,
		"gegen": "figur",
		"behaelter": true,
		"beginn": welt.frame,
	})
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["EINSCHLAG"], o.schluessel])
	KernKamera.schuettelnStarten(welt, "explosion")


static func tm2(o: KernEntitaeten.Objekt, name: String) -> int:
	return o.timer.get(name, 0)


## Ist o eine Rakete eines Zünders (Besitzer ein Gegnerslot)?
static func istZuenderRakete(o: KernEntitaeten.Objekt) -> bool:
	var b: Variant = o.besitzer
	return o.belegt and o.typ == "Rakete" and b != null and (b as String).begins_with("s")


## KS4 (Kampf 2.2): Geschosse der Gegner in o20 bis o59, Slots aufsteigend:
## Flug der Rakete (5 px/Frame ab Q+1, Höhe 44 → 1 je Frame um 43/20 px,
## nur Darstellung),
## Einschlag in Q+20 bzw. an einer Wand, Explosion Q+21 bis Q+29 als
## Angriffsinstanz des Objektslots (urheber = Zünder, gegen 'figur'), danach frei.
static func fernGeschosseSchritt(welt: KernWelt) -> void:
	var f: int = welt.frame
	for o: KernEntitaeten.Objekt in welt.objekte:
		if not istZuenderRakete(o):
			continue
		if o.flugphase == "FLUG":
			if f <= o.abschuss:
				continue
			var n: int = f - o.abschuss
			var nx: int = KernFestkomma.add(o.x, KernFestkomma.mulGanz(KernWerte.ZR_RAKETE_V, o.bahn_richtung))
			# Wand ohne die Flughöhe: die Höhe ist nur Darstellung (Welt 6)
			var wand: bool = not KernStage.begehbar(welt.stage, KernFestkomma.ganz(nx), KernFestkomma.ganz(o.z), 0)
			if not wand:
				o.x = nx
				o.flug_n = n
				o.h = KernFestkomma.maxF(KernFestkomma.sub(o.h, KernWerte.ZR_RAKETE_SINKEN), KernWerte.ZR_RAKETE_H_MIN)
			if wand or n >= KernWerte.ZR_EINSCHLAG:
				einschlag(welt, o)
			continue
		if o.flugphase == "EXPLOSION":
			var d: int = f - tm2(o, "einschlag")
			if d > EXPLOSION_BIS:
				KernEntitaeten.freigeben(o)
				continue
			if o.angriff != null:
				o.angriff.aktiv = d >= EXPLOSION_VON
