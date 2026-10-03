# Trefferreaktion der Gegner (K2) nach docs/spezifikation-kampf.md, Abschnitt 7
# (23 Frames ohne Rückstoß mit Neustart, E3; Umwerfen, Liegen, Aufstehen,
# kein Schutz danach, E4; Tod und Slotfreigabe; genau 0 LP lebt weiter;
# gehalten), Flugbahnen F1 bis F4b nach Abschnitt 5.7 und Puppen nach 11.2.
# Port von spiel/src/kern/gegner/reaktion.ts.
#
# Ablauf je Gegner (außer dem Boss, den K4 führt):
#   KS7  gegnerGetroffen: Wirkung bestimmen, Ereignis T, LP, Reaktion beginnen
#   KS3  reaktionSchritt: Reaktion fortschreiben (Stillstand, Bahn, Liegen,
#        Aufstehen, Tod, Slot frei); true, solange der Gegner reagiert
#   W4   puppeEntscheidung: Puppe schaut zur Figur
#
# Zustand je Reaktion (Kampf 7). Der Trefferframe h bzw. W bzw. t zeigt die
# Reaktion schon (Modus, Aktion); Zustand 2 gilt ab W+1 bzw. t+1, im
# Trefferframe selbst steht Zustand 3 (Festlegung K2 nach dem Wortlaut
# „2 von W+1 bis G−1“, „2 ab t+1“; ein schon gehaltener Gegner bleibt 2).
#   GETROFFEN   3 von h bis h+22, frei (1, FREI) ab h+23, Neustart je Treffer
#   UMGEWORFEN  Bahn F1, F2 oder F3, 2 ab W+1; in der Ruhe LIEGEN
#   LIEGEN      leicht 32 (nach Wurf 16), schwer 16 bis 44 (P18), Zufall bei der Ruhe
#   AUFSTEHEN   18 Frames; G = Ruhe + Liegen + 18: Zustand 1, FREI (E4: ohne Schutz)
#   TOT         Bahn F4 (nach KT2 F4b, nach Wurf F3), 2 ab t+1, Slot frei t+79 (t+111, t+101)
#   GEHALTEN    führt K1 (Griff, Haltelage, Wurf); hier nur Logik ruht
#
# Die Bahnberechnung (BAHNEN, bahnStarten, bahnSchritt, BahnDaten) steht in
# bahn.gd (KernBahn). Die TypeScript-Fassung exportiert sie hier unter
# denselben Namen weiter; die Weiterleitungen stehen unten im Abschnitt
# „Flugbahnen“. Die Figur (schaden.gd, F1 und F4, P15) und der Boss (F1 mit
# anderem Auslauf) nutzen sie ebenso.
#
# Eigener Zustand am Gegner: bahn_boden (bahn.gd) und ruhe_frame (Beginn
# des Liegens).
class_name KernGegnerReaktion
extends RefCounted

# ===========================================================================
# Flugbahnen (Kampf 5.7): gemeinsam in bahn.gd, hier weiter bereitgestellt
# ===========================================================================
# TypeScript: export { BAHNEN, bahnSchritt, bahnStarten, wurfLoslassen } from
# '../bahn.ts'. Die Konstante BAHNEN und die Typen BahnArt, BahnDaten, BahnLage
# bleiben in KernBahn (KernBahn.BAHNEN).


## Weiterleitung an KernBahn.bahnStarten.
static func bahnStarten(e: KernEntitaeten.EntitaetBasis, bahn: String, richtung: int) -> void:
	KernBahn.bahnStarten(e, bahn, richtung)


## Weiterleitung an KernBahn.bahnSchritt; b ist null oder eine KernStage.Begrenzung,
## d null oder die Bahndaten (KernBahn.BahnDaten).
static func bahnSchritt(e: KernEntitaeten.EntitaetBasis, k: int, b: KernStage.Begrenzung, d: Variant = null) -> String:
	return KernBahn.bahnSchritt(e, k, b, d)


## Weiterleitung an KernBahn.wurfLoslassen.
static func wurfLoslassen(welt: KernWelt, e: KernEntitaeten.EntitaetBasis, k: int) -> void:
	KernBahn.wurfLoslassen(welt, e, k)


## Begrenzung einer Gegnerbahn (Welt 2.2 Punkt 5): Band, Hindernisse und
## unzerbrochene Behälter, nicht die Bildränder; geworfene Gegner (F3) bleiben
## höchstens 96 px außerhalb des Bildes (Kampf 5.7), außer auf einer Bühne
## ohne Ränder (Prüfbühne, Kampf 11.2).
static func gegnerBegrenzung(welt: KernWelt, g: KernEntitaeten.Gegner) -> KernStage.Begrenzung:
	var zusatz: Array = KernGegenstaende.behaelterHindernisse(welt)
	var xMin: Variant = null
	var xMax: Variant = null
	if g.bahn == "F3" and welt.stage.raender:
		xMin = KernFestkomma.ausGanz(welt.kamera.x - KernWerte.WURF_AUSSERHALB_MAX)
		xMax = KernFestkomma.ausGanz(welt.kamera.x + KernWerte.BILD_BREITE - 1 + KernWerte.WURF_AUSSERHALB_MAX)
	var b: KernStage.Begrenzung = KernStage.Begrenzung.new()
	b.stage = welt.stage
	b.zusatz = zusatz
	b.x_min = xMin
	b.x_max = xMax
	return b


# ===========================================================================
# Hilfen
# ===========================================================================

static func gegenrichtung(b: int) -> int:
	return -1 if b == 1 else 1


## Neuer Animationszeiger (TypeScript: Objektliteral { name, bild, rest }).
static func animNeu(name: String, bild: int, rest: int) -> KernEntitaeten.Animationszeiger:
	var a: KernEntitaeten.Animationszeiger = KernEntitaeten.Animationszeiger.new()
	a.name = name
	a.bild = bild
	a.rest = rest
	return a


## Flugrichtung von der Figur weg (Tod ohne Angreifer, Welt 7.6); bei gleichem x Blick der Figur (wie P14).
static func vonFigurWeg(welt: KernWelt, g: KernEntitaeten.Gegner) -> int:
	var dx: int = KernFestkomma.ganz(g.x) - KernFestkomma.ganz(welt.figur.x)
	if dx > 0:
		return 1
	if dx < 0:
		return -1
	return welt.figur.blick


## Flugrichtung des Getroffenen: t.richtung (Regel der Instanz, treffer.gd).
## Beim Wurf gilt die Wurfrichtung der Figur (vorwärts in Blickrichtung,
## rückwärts entgegen, Kampf 8.2), falls K1 sie gesetzt hat.
static func flugrichtung(welt: KernWelt, g: KernEntitaeten.Gegner, t: KernEntitaeten.Treffer) -> int:
	var f: KernEntitaeten.Figur = welt.figur
	if t.code == "WU" and f.wurf_ziel == g.schluessel:
		if f.wurf_richtung == "V":
			return f.blick
		if f.wurf_richtung == "R":
			return gegenrichtung(f.blick)
	return t.richtung


## Bricht einen eigenen laufenden Angriff ab (Kampf 7); fremde Instanzen (WG der Figur) bleiben.
static func eigenenAngriffAbbrechen(g: KernEntitaeten.Gegner) -> void:
	if g.angriff != null and g.angriff.urheber == g.schluessel:
		g.angriff = null


## Im Trefferframe Zustand 3, ab dem nächsten Frame 2 (siehe Kopf); ein schon gehaltener Gegner bleibt 2.
static func zustandImTrefferframe(g: KernEntitaeten.Gegner) -> void:
	if g.zustand != KernEntitaeten.ZUSTAND_BODEN:
		g.zustand = KernEntitaeten.ZUSTAND_REAKTION


## Bahn beim Tod (Kampf 7): nach Wurf F3, nach Kettenstufe 2 F4b, sonst F4.
static func todesbahn(t: KernEntitaeten.Treffer) -> String:
	if t.code == "WU" or t.bahn == "F3":
		return "F3"
	if t.code == "KT2":
		return "F4b"
	return "F4"


## Slot frei nach dem Tod (Kampf 7): t+79, nach Stufe 2 t+111, nach Wurf t+101.
static func slotFreiNach(bahn: String) -> int:
	if bahn == "F3":
		return KernWerte.SLOT_FREI_WURF
	if bahn == "F4b":
		return KernWerte.SLOT_FREI_STUFE2
	return KernWerte.SLOT_FREI_TOD


# ===========================================================================
# Reaktionen beginnen und beenden (auch für K1 und K4)
# ===========================================================================

## GETROFFEN beginnen bzw. neu starten (Kampf 7, E3): Zustand 3 ab h, Stillstand
## h+1 bis h+8, frei ab h+23; kein Rückstoß, Welt-x bleibt. Ein laufender
## eigener Angriff ist abgebrochen, das Zielrecht frei; das Nahkampfrecht
## bleibt (Welt 5.7 E-4).
static func getroffenBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	g.reaktion_h = welt.frame
	g.uhr = 1
	KernEntitaeten.modusSetzen(g, "GETROFFEN")
	g.aktion = "GETROFFEN"
	g.zustand = KernEntitaeten.ZUSTAND_REAKTION
	g.phase = ""
	g.anim = animNeu("GETROFFEN", 0, 0)
	eigenenAngriffAbbrechen(g)
	KernGegnerRechte.rechteBeiReaktion(welt, g, "GETROFFEN")


## UMGEWORFEN beginnen (Kampf 7): Bahn F1, F2 oder F3 in richtung, Zustand 2 ab
## W+1, nicht treffbar und nicht greifbar bis G−1. Rechte abgeben (E-4).
static func umwerfenBeginnen(welt: KernWelt, g: KernEntitaeten.Gegner, bahn: String, richtung: int) -> void:
	g.reaktion_h = welt.frame
	g.uhr = 1
	KernEntitaeten.modusSetzen(g, "UMGEWORFEN")
	g.aktion = "UMGEWORFEN"
	zustandImTrefferframe(g)
	g.phase = bahn
	g.liegedauer = 0
	g.gehalten_von = null
	g.anim = animNeu("UMGEWORFEN", 0, 0)
	KernBahn.bahnStarten(g, bahn, richtung)
	eigenenAngriffAbbrechen(g)
	KernGegnerRechte.rechteBeiReaktion(welt, g, "UMGEWORFEN")


## TOT einleiten (Kampf 7): t = dieser Frame, Bahn F4 (F4b, F3), Zustand 2 ab
## t+1, nimmt keine Treffer an und trifft nicht, Slot frei in t+79 (t+111,
## t+101). Auch für K4 (Welt 7.6: Fall des Bosses, Flug von der Figur weg,
## richtung = vonFigurWeg) und für den Tod ohne Treffer (Eingriff).
static func todEinleiten(welt: KernWelt, g: KernEntitaeten.Gegner, bahn: String, richtung: int) -> void:
	g.tod_t = welt.frame
	g.reaktion_h = welt.frame
	g.frei_frame = welt.frame + slotFreiNach(bahn)
	g.uhr = 1
	KernEntitaeten.modusSetzen(g, "TOT")
	g.aktion = "TOT"
	zustandImTrefferframe(g)
	g.phase = bahn
	g.gehalten_von = null
	g.anim = animNeu("TOT", 0, 0)
	KernBahn.bahnStarten(g, bahn, richtung)
	eigenenAngriffAbbrechen(g)
	KernGegnerRechte.rechteBeiReaktion(welt, g, "TOT")


## Reaktion beendet (Kampf 7): Zustand 1, Modus FREI, Aktion STAND, Bahn
## gelöscht. Die Gegnerlogik wählt im nächsten W4 (Vertrag 6); eine Puppe wird
## dort wieder PUPPE. Kein Schutz danach (E4).
static func reaktionBeenden(g: KernEntitaeten.Gegner) -> void:
	g.zustand = KernEntitaeten.ZUSTAND_NORMAL
	KernEntitaeten.modusSetzen(g, "FREI")
	g.aktion = "STAND"
	g.phase = ""
	g.bahn = ""
	g.bahn_frame = 0
	g.vx = 0
	g.vh = 0
	g.ax = 0
	g.gh = 0
	g.anim = animNeu("STAND", 0, 0)


## Liegedauer ab der Ruhe (Kampf 7, P18), gezogen im Frame der Ruhe (Welt
## 11.2): leicht 32 (nach einem Wurf 16), schwer gleichverteilt 16, 20, …, 44
## aus g.zufall; Boss: LIEGEN und AUFSTEHEN zusammen 42 bis 70 in
## Viererschritten (Welt 7.1), hier als Liegedauer ohne die 18 Frames
## Aufstehen. Ein Fernkämpfer liegt wie ein leichter (Festlegung K2, Lücke).
## welt.fest['liegedauer'] ersetzt eine Ziehung nach der Ziehung (Welt 11.3).
static func liegedauerZiehen(welt: KernWelt, g: KernEntitaeten.Gegner) -> int:
	var dauer: int
	if g.rolle == "schwer":
		dauer = KernZufall.bereich(g.zufall, KernWerte.LIEGEN_SCHWER_VON, KernWerte.LIEGEN_SCHWER_BIS, KernWerte.LIEGEN_SCHWER_SCHRITT)
	elif g.rolle == "boss":
		dauer = KernZufall.bereich(g.zufall, KernWerte.BOSS_LIEGEN_VON, KernWerte.BOSS_LIEGEN_BIS, KernWerte.BOSS_ZUFALL_SCHRITT) - KernWerte.AUFSTEHEN_GEGNER
	else:
		return KernWerte.LIEGEN_LEICHT_WURF if g.bahn == "F3" else KernWerte.LIEGEN_LEICHT
	var fest: Variant = welt.fest.get("liegedauer")
	if fest != null:
		# Number(fest) mit Integer-Prüfung: nur Zeichenketten aus ganzen Zahlen
		var text: String = str(fest)
		if not text.is_valid_int() or text.to_int() < 1:
			push_error("fest.liegedauer muss eine positive ganze Zahl sein, nicht „%s“" % text)
			return dauer
		dauer = text.to_int()
	return dauer


## Griff (Kampf 7 GEHALTEN, 8.1), Hilfe für K1: Modus GEHALTEN, Zustand 2,
## gehalten_von; eigener Angriff abgebrochen, Rechte abgegeben (Welt 5.7 E-4).
## Haltelage, Ereignis G und Haltefrist führt K1.
static func gegnerGreifen(welt: KernWelt, g: KernEntitaeten.Gegner, von: String) -> void:
	KernEntitaeten.modusSetzen(g, "GEHALTEN")
	g.aktion = "GEHALTEN"
	g.zustand = KernEntitaeten.ZUSTAND_BODEN
	g.gehalten_von = von
	g.phase = ""
	eigenenAngriffAbbrechen(g)
	KernGegnerRechte.rechteBeiReaktion(welt, g, "GEHALTEN")


## Losreißen (Kampf 7, 8.3), Hilfe für K1: frei, Zustand 1, Modus FREI (Logik nach Welt 5.9). Ereignis L schreibt K1.
static func gegnerLosreissen(g: KernEntitaeten.Gegner) -> void:
	g.gehalten_von = null
	reaktionBeenden(g)


# ===========================================================================
# KS7: Zielhandler
# ===========================================================================

## KS7, Zielhandler für Gegner außer dem Boss (Kampf 6.2, 7), in der
## Reihenfolge von welt.treffer. Setzt t.lp_vorher und t.wirkung (X bei LP < 0,
## U bei Umwerfen, sonst R; W, wenn der Gegner schon stirbt), schreibt als
## Erstes das Ereignis T, dann LP, letzter_angreifer (= Urheber),
## getroffen_frame (Urheber Figur) und die Reaktion. Genau 0 LP: normale
## Reaktion, der Gegner lebt weiter (K6). Ein gehaltener Gegner bleibt bei
## einem Treffer ohne Umwerfen gehalten (Kniestoß 1 und 2).
static func gegnerGetroffen(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.ziel)
	if g == null or not g.belegt:
		push_error("gegnerGetroffen: Gegnerslot %s ist frei" % t.ziel)
		return
	t.lp_vorher = g.lp
	if g.modus == "TOT" or g.lp < 0:
		# Der sterbende Gegner nimmt keine Treffer an (Kampf 7); kommt nur vor,
		# wenn ein anderer Treffer desselben Frames ihn schon getötet hat.
		t.wirkung = "W"
		KernEreignisse.ereignisTreffer(welt, t)
		return
	var lp: int = g.lp - t.schaden
	t.wirkung = "X" if lp < 0 else ("U" if t.umwerfen else "R")
	KernEreignisse.ereignisTreffer(welt, t)
	g.lp = lp
	g.letzter_angreifer = t.urheber
	if t.urheber == "f":
		g.getroffen_frame = welt.frame
	var richtung: int = flugrichtung(welt, g, t)
	if t.wirkung == "X":
		todEinleiten(welt, g, todesbahn(t), richtung)
	elif t.wirkung == "U":
		var bahn: String = "F1" if t.bahn == "" else t.bahn
		umwerfenBeginnen(welt, g, bahn, richtung)
	elif g.modus == "GEHALTEN":
		g.reaktion_h = welt.frame
	else:
		getroffenBeginnen(welt, g)


# ===========================================================================
# KS3: Reaktion fortschreiben
# ===========================================================================

## GETROFFEN: Stillstand, Zittern nur in der Darstellung, frei ab h+23 (Kampf 7).
static func getroffenSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var k: int = welt.frame - g.reaktion_h
	g.uhr = k + 1
	var bild: int = 0
	for w: int in KernWerte.REAKTION_ANIMATION:
		if k >= w:
			bild += 1
	g.anim = animNeu("GETROFFEN", bild, 0)
	if k >= KernWerte.REAKTION_DAUER:
		reaktionBeenden(g)
	return true


## UMGEWORFEN, LIEGEN, AUFSTEHEN (Kampf 7).
static func bodenSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var k: int = welt.frame - g.reaktion_h
	g.uhr = k + 1
	if k >= 1:
		g.zustand = KernEntitaeten.ZUSTAND_BODEN
	if g.modus == "UMGEWORFEN":
		KernBahn.wurfLoslassen(welt, g, k)
		var lage: String = KernBahn.bahnSchritt(g, k, gegnerBegrenzung(welt, g))
		if lage == "ruhe":
			g.liegedauer = liegedauerZiehen(welt, g)
			g.ruhe_frame = welt.frame
			KernEntitaeten.modusSetzen(g, "LIEGEN")
			g.aktion = "LIEGEN"
			g.phase = ""
			g.anim = animNeu("LIEGEN", 0, 0)
		return true
	var r: int = welt.frame - (g.ruhe_frame if g.ruhe_frame > 0 else welt.frame)
	if g.modus == "LIEGEN" and r >= g.liegedauer:
		KernEntitaeten.modusSetzen(g, "AUFSTEHEN")
		g.aktion = "AUFSTEHEN"
		g.anim = animNeu("AUFSTEHEN", 0, 0)
	if g.modus == "AUFSTEHEN" and r >= g.liegedauer + KernWerte.AUFSTEHEN_GEGNER:
		reaktionBeenden(g)
	return true


## TOT: Bahn bis zur Ruhe, Slot frei mit Ereignis FR:sn (Kampf 7).
static func todSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	var k: int = welt.frame - g.tod_t
	g.uhr = k + 1
	if welt.frame >= g.frei_frame:
		var slot: String = g.schluessel
		KernEntitaeten.freigeben(g)
		KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["FREI"], slot])
		return true
	if k >= 1:
		g.zustand = KernEntitaeten.ZUSTAND_BODEN
	KernBahn.wurfLoslassen(welt, g, k)
	KernBahn.bahnSchritt(g, k, gegnerBegrenzung(welt, g))
	return true


## KS3 für Gegner außer dem Boss: läuft eine Reaktion (GETROFFEN, UMGEWORFEN,
## LIEGEN, AUFSTEHEN, TOT, GEHALTEN), schreibt sie fort und gibt true zurück;
## welt.gd bewegt den Gegner dann in diesem Frame nicht weiter. Auch im Frame,
## in dem die Reaktion endet (h+23, G), gibt sie true zurück: Bewegung erst ab
## dem nächsten Frame (mechanik „Trefferreaktion der Gegner“: ab h+24 bzw. G+1).
## LP < 0 ohne TOT (Eingriff) ist der Tod in diesem Frame, Flug von der Figur weg.
static func reaktionSchritt(welt: KernWelt, g: KernEntitaeten.Gegner) -> bool:
	if not g.belegt:
		return false
	if g.lp < 0 and g.modus != "TOT":
		todEinleiten(welt, g, "F4", vonFigurWeg(welt, g))
		return true
	match g.modus:
		"GETROFFEN":
			return getroffenSchritt(welt, g)
		"UMGEWORFEN", "LIEGEN", "AUFSTEHEN":
			return bodenSchritt(welt, g)
		"TOT":
			return todSchritt(welt, g)
		"GEHALTEN":
			return true
		_:
			return KernEntitaeten.istReaktion(g.modus)


# ===========================================================================
# W4: Puppe
# ===========================================================================

## W4 für Gegner mit Logik aus (Puppe, Kampf 11.2): steht, schaut in jedem
## Frame mit Zustand 1 zur Figur. Nach einer Reaktion (FREI) wieder PUPPE.
## In einer Reaktion dreht sie sich nicht um (Kampf 5.2).
static func puppeEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.zustand != KernEntitaeten.ZUSTAND_NORMAL:
		return
	if g.modus == "FREI":
		KernEntitaeten.modusSetzen(g, "PUPPE")
		g.aktion = "STAND"
	g.blick = KernEntitaeten.blickZu(g, welt.figur)
