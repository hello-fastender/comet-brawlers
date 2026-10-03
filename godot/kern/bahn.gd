# Flugbahnen F1 bis F4b nach docs/spezifikation-kampf.md, 5.7: gemeinsam
# für die Trefferreaktion der Gegner (gegner/reaktion.gd), die Figur auf F1
# und F4 (schaden.gd, auch aus der Luft nach P15) und den Boss mit eigenem
# Auslauf (Parameter d von bahnSchritt); dazu das Loslassen beim Wurf (F3).
# Port von spiel/src/kern/bahn.ts.
#
# Zustand je Entität: bahn, bahn_richtung, bahn_frame, bahn_start_x, vx, ax,
# vh, gh und bahn_boden (Bahnframe des Bodenkontakts).
#
# Abweichung vom Aufbau der TypeScript-Fassung: BAHNEN (Record mit Objekten)
# kann in GDScript keine Konstante sein; bahnDaten(art) liefert die Daten der
# Bahn art ('F1', 'F2', 'F3', 'F4', 'F4b') und ersetzt BAHNEN[art]. Die Bahnart
# ist ein String (BahnArt = Bahn ohne die leere Kennung), die Lage nach einem
# Bahnschritt ('stillstand', 'luft', 'boden', 'rutschen', 'ruhe') ebenfalls.
class_name KernBahn
extends RefCounted

## Daten einer Flugbahn (Kampf 5.7). Je Bahnframe: x += vx · Richtung, danach
## vx −= ax; h += vh, danach vh −= gh; wird h ≤ 0, ist h = 0 (Bodenkontakt).
## Nach dem Bodenkontakt läuft x bis zur Ruhe weiter, die Höhe bleibt 0 (P13).
class BahnDaten:
	## Stillstandsframes W+1 bis W+stillstand; erster Bahnframe W+stillstand+1
	var stillstand: int = 0
	var vx: int = 0
	var ax: int = 0
	var vh: int = 0
	var gh: int = 0
	## Höhe ab W+1 (F2: 16 px); null = die aktuelle Höhe bleibt (Treffer in der Luft, P15)
	var start_h: Variant = null
	## Bahnframes vom Bodenkontakt bis zur Ruhe (F1: Boden W+46, Ruhe W+55 → 9).
	## Relativ zum Bodenkontakt, damit eine Bahn aus der Luft (P15) erst nach
	## dem Bodenkontakt zur Ruhe kommt; vom Boden aus gibt das genau die Tabelle.
	var nach_boden: int = 0
	## x-Geschwindigkeit nach dem Bodenkontakt (F4b: Rollen 2,0 ab t+41); null = vx läuft weiter
	var boden_vx: Variant = null


## Frame des Loslassens beim Wurf relativ zu W = E+1 (E+22, Kampf 8.4).
const WURF_LOSLASSEN_K: int = KernWerte.WURF_LOSLASSEN - KernWerte.WURF_TREFFER


## Neue Bahndaten aus den Feldern der TypeScript-Schnittstelle BahnDaten
## (Hilfsfunktion für BAHNEN und für eigene Bahnen wie die des Bosses).
static func bahnDatenNeu(stillstand: int, vx: int, ax: int, vh: int, gh: int, start_h: Variant, nach_boden: int, boden_vx: Variant) -> BahnDaten:
	var d: BahnDaten = BahnDaten.new()
	d.stillstand = stillstand
	d.vx = vx
	d.ax = ax
	d.vh = vh
	d.gh = gh
	d.start_h = start_h
	d.nach_boden = nach_boden
	d.boden_vx = boden_vx
	return d


## Die Bahnen aus Kampf 5.7, Frames relativ zum Treffer W (beim Wurf W = E+1).
## Ersetzt BAHNEN[art]; jeder Aufruf liefert frische Daten.
static func bahnDaten(art: String) -> BahnDaten:
	match art:
		# F1 Umwerfen: Stillstand W+1 bis W+8, Boden W+46 bei 109,25, Ruhe W+55 bei 135,125
		"F1":
			return bahnDatenNeu(KernWerte.F1_STILLSTAND, KernWerte.F1_VX, KernWerte.F1_AX, KernWerte.F1_VH, KernWerte.F1_GH, null, KernWerte.F1_RUHE - KernWerte.F1_BODEN, null)
		# F2 dritter Kniestoß: wie F1 aus 16 px Höhe, Boden W+49, Ruhe W+58
		"F2":
			return bahnDatenNeu(KernWerte.F1_STILLSTAND, KernWerte.F1_VX, KernWerte.F1_AX, KernWerte.F1_VH, KernWerte.F1_GH, KernWerte.F2_START_HOEHE, KernWerte.F2_RUHE - KernWerte.F2_BODEN, null)
		# F3 Wurf: getragen bis E+21, losgelassen E+22, erster Bahnframe E+23, Boden E+59, Ruhe E+71
		"F3":
			return bahnDatenNeu(KernWerte.F3_ERSTER - KernWerte.WURF_TREFFER - 1, KernWerte.F3_VX, KernWerte.F3_AX, KernWerte.F3_VH, KernWerte.F3_GH, null, KernWerte.F3_RUHE - KernWerte.F3_BODEN, null)
		# F4 Tod: Stillstand t+1, t+2, Boden t+40, Ruhe t+49
		"F4":
			return bahnDatenNeu(KernWerte.F4_STILLSTAND, KernWerte.F1_VX, KernWerte.F1_AX, KernWerte.F1_VH, KernWerte.F1_GH, null, KernWerte.F4_RUHE - KernWerte.F4_BODEN, null)
		# F4b Tod durch Stufe 2: wie F4, ab t+41 Rollen 2,0 bis t+72
		"F4b":
			return bahnDatenNeu(KernWerte.F4_STILLSTAND, KernWerte.F1_VX, KernWerte.F1_AX, KernWerte.F1_VH, KernWerte.F1_GH, null, KernWerte.F4B_ROLLEN_BIS - KernWerte.F4_BODEN, KernWerte.F4B_ROLLEN)
	push_error("bahnDaten: unbekannte Bahn „%s“" % art)
	return null


## Beginnt eine Bahn am Trefferort (Kampf 5.7): setzt bahn, bahn_richtung,
## bahn_start_x, vx, ax, vh, gh; bahn_frame 0. Die Höhe bleibt, wie sie ist
## (am Boden 0; in der Luft beginnt die Bahn dort, P15).
static func bahnStarten(e: KernEntitaeten.EntitaetBasis, bahn: String, richtung: int) -> void:
	var d: BahnDaten = bahnDaten(bahn)
	e.bahn = bahn
	e.bahn_richtung = richtung
	e.bahn_frame = 0
	e.bahn_start_x = e.x
	e.vx = d.vx
	e.ax = d.ax
	e.vh = d.vh
	e.gh = d.gh
	e.vz = 0
	e.bahn_boden = 0


## Ein Frame der laufenden Bahn (Kampf 5.7). k = Frames seit dem Treffer
## (Frame W+k). Stillstand bis W+stillstand (F2 setzt dort 16 px Höhe), dann
## je Bahnframe x, danach h; x wird durch b begrenzt (Welt 2.2: Band,
## Hindernisse, Wände; null = unbegrenzt). Nach dem Bodenkontakt (vh und gh
## werden 0) läuft x mit vx bzw. boden_vx weiter, bis nach_boden Frames später
## die Ruhe erreicht ist; danach bewegt sich nichts mehr.
##
## Rückgabe: 'ruhe' im Frame, in dem die Ruhe erreicht ist, und danach.
## Für die Gegner (reaktion.gd), die Figur auf F1 und F4, auch aus der Luft
## (schaden.gd), und den Boss mit eigenem Auslauf über den Parameter d.
static func bahnSchritt(e: KernEntitaeten.EntitaetBasis, k: int, b: KernStage.Begrenzung, d: BahnDaten = null) -> String:
	if d == null and e.bahn == "":
		return "ruhe"
	var daten: BahnDaten = bahnDaten(e.bahn) if d == null else d
	if k < 1:
		return "stillstand"
	if k <= daten.stillstand:
		if k == 1 and daten.start_h != null:
			e.h = daten.start_h as int
		return "stillstand"
	var n: int = k - daten.stillstand
	var boden: int = e.bahn_boden
	if boden > 0 and n > boden + daten.nach_boden:
		return "ruhe"
	e.bahn_frame = n
	# x
	var v: int = (daten.boden_vx as int) if (boden > 0 and daten.boden_vx != null) else e.vx
	var dx: int = KernFestkomma.mulGanz(v, e.bahn_richtung)
	if b == null:
		e.x = KernFestkomma.add(e.x, dx)
	else:
		var erg: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(b, e.x, e.z, e.h, dx, 0)
		e.x = erg.x
	e.vx = KernFestkomma.maxF(0, KernFestkomma.sub(e.vx, e.ax))
	# Höhe
	if boden == 0:
		e.h = KernFestkomma.add(e.h, e.vh)
		e.vh = KernFestkomma.sub(e.vh, e.gh)
		if e.h > 0:
			return "luft"
		e.h = 0
		e.vh = 0
		e.gh = 0
		e.bahn_boden = n
		return "ruhe" if daten.nach_boden == 0 else "boden"
	return "ruhe" if n >= boden + daten.nach_boden else "rutschen"


## Wurfbahn F3, k Frames nach dem Treffer W = E+1: Der Geworfene bleibt E+1
## bis E+21 in der Haltelage (die Figur ist gebunden und steht) und wird in
## E+22 in 59 px Höhe 13 px vor bzw. hinter der Figur losgelassen, in
## Flugrichtung (P19, Kampf 8.4); die Tiefe bleibt. Für Gegner (reaktion.gd)
## und Boss (boss_bahn.gd), vor bahnSchritt im selben Frame aufzurufen.
static func wurfLoslassen(welt: KernWelt, e: KernEntitaeten.EntitaetBasis, k: int) -> void:
	if e.bahn != "F3" or k != WURF_LOSLASSEN_K:
		return
	e.x = KernFestkomma.add(welt.figur.x, KernFestkomma.mulGanz(KernFestkomma.ausGanz(KernWerte.WURF_LOSLASS_X), e.bahn_richtung))
	e.h = KernFestkomma.ausGanz(KernWerte.WURF_LOSLASS_HOEHE)
