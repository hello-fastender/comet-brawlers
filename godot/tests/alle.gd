# Testlauf (Auftrag 6, 3.3):
#
#   godot --headless --path godot --script res://tests/alle.gd [-- --nur <Teil>] [-- --ohne-szenen]
#
# (1) Grundlagentests: Festkomma, Zufall, Tasten, Eingabeparser, Stage-Parser,
#     Protokollformat (Werte aus spiel/tests/*.test.ts).
# (2) Reinheitstest: in godot/kern/ kommen die verbotenen Wörter nicht vor
#     (analog spiel/tests/reinheit.test.ts).
# (3) Alle Szenen unter spiel/tests/szenen/: Prüflauf mit der gleichnamigen
#     Eingabe unter spiel/tests/eingaben/ (ohne Datei: ohne Tasten), byteweiser
#     Vergleich von protokoll.csv und objekte.csv mit
#     spiel/tests/referenz/alle/<name>.protokoll.csv und <name>.objekte.csv;
#     dazu ein Determinismustest (zwei Läufe, gleiche MD5).
#
# --nur <Teil>     nur Szenen, deren Name <Teil> enthält
# --ohne-szenen    Teil (3) überspringen
# Exit-Code 1 bei irgendeiner Abweichung.
extends SceneTree

## Verbotene Wörter in godot/kern/ (PORTREGELN, Abschnitt Zahlen); als Muster für RegEx.
const VERBOTEN: Array[String] = ["\\bfloat", "\\bVector2", "\\bRect2", "\\brandi", "\\brandf", "\\bTime\\.", "\\bOS\\.", "\\bsignal"]

## Die ersten zehn Zustände nach je einer Ziehung für Seed 1 (Welt 11.1).
const SEED_1_FOLGE: Array[int] = [270369, 67634689, 2647435461, 307599695, 2398689233, 745495504, 632435482, 435756210, 2005365029, 2916098932]

var _geprueft: int = 0
var _fehler: int = 0
var _gruppe_fehler: int = 0
var _meldungen: Array[String] = []
var _dauer_summe: int = 0


# ===========================================================================
# Prüfhilfen
# ===========================================================================

func _ok(bedingung: bool, name: String) -> void:
	_geprueft += 1
	if not bedingung:
		_fehler += 1
		_gruppe_fehler += 1
		_meldungen.append("    " + name)


func _gleich(ist: Variant, soll: Variant, name: String) -> void:
	_geprueft += 1
	if typeof(ist) != typeof(soll) or ist != soll:
		_fehler += 1
		_gruppe_fehler += 1
		_meldungen.append("    %s: ist %s, soll %s" % [name, var_to_str(ist), var_to_str(soll)])


## Führt eine Testgruppe aus und meldet ok oder FEHLER mit den Einzelmeldungen.
func _gruppe(titel: String, f: Callable) -> void:
	var vorher: int = _geprueft
	_gruppe_fehler = 0
	_meldungen = []
	f.call()
	if _gruppe_fehler == 0:
		print("ok %s (%d Prüfungen)" % [titel, _geprueft - vorher])
	else:
		print("FEHLER %s: %d von %d Prüfungen" % [titel, _gruppe_fehler, _geprueft - vorher])
		for m in _meldungen:
			print(m)


# ===========================================================================
# (1) Grundlagentests
# ===========================================================================

func _test_festkomma() -> void:
	var EINS: int = KernFestkomma.EINS
	# Rohwerte aus Kampf 2.4 (ausDezimal entfällt: die Werte stehen als Rohwert da)
	_gleich(KernFestkomma.ausBruch(70, 256), 17920, "ausBruch(70, 256)")
	_gleich(KernFestkomma.ausBruch(13, 64), 13312, "ausBruch(13, 64)")
	_gleich(KernFestkomma.ausBruch(29, 64), 29696, "ausBruch(29, 64)")
	_gleich(KernFestkomma.ausGanz(-3), -3 * EINS, "ausGanz(-3)")
	# add, sub, neg, abs mit 32-Bit-Überlauf
	_gleich(KernFestkomma.add(81920, 49152), KernFestkomma.ausGanz(2), "add(1.25, 0.75)")
	_gleich(KernFestkomma.sub(81920, 131072), -49152, "sub(1.25, 2)")
	_gleich(KernFestkomma.add(0x7fffffff, 1), -2147483648, "add Überlauf")
	_gleich(KernFestkomma.neg(163840), -163840, "neg(2.5)")
	_gleich(KernFestkomma.abs(-163840), 163840, "abs(-2.5)")
	# mul mit exaktem Zwischenwert, Rundung nach −∞
	_gleich(KernFestkomma.mul(98304, KernFestkomma.ausGanz(2)), KernFestkomma.ausGanz(3), "mul(1.5, 2)")
	_gleich(KernFestkomma.mul(-98304, 32768), -49152, "mul(-1.5, 0.5)")
	_gleich(KernFestkomma.mul(KernFestkomma.ausGanz(300), KernFestkomma.ausGanz(100)), KernFestkomma.ausGanz(30000), "mul(300, 100)")
	_gleich(KernFestkomma.mul(1, 1), 0, "mul(1, 1)")
	_gleich(KernFestkomma.mul(-1, 1), -1, "mul(-1, 1)")
	# 29/64 · 3,875 = 1,755859375 (Kampf 9.2, Sprintframes 2 bis 6 diagonal)
	_gleich(KernFestkomma.mul(KernFestkomma.ausBruch(29, 64), 253952), 115072, "mul(29/64, 3.875)")
	# Vergleich mit einer unabhängigen Rechnung (divGanz statt Verschiebung) über eine feste Zahlenfolge
	var r: int = 1
	var abweichungen: int = 0
	for i in range(2000):
		r = KernZufall.xorshift32(r)
		var a: int = KernFestkomma.zu32(r)
		r = KernZufall.xorshift32(r)
		var b: int = KernFestkomma.zu32(r) >> (i % 17)
		var erwartet: int = KernFestkomma.zu32(KernFestkomma.divGanz(a * b, 65536))
		if KernFestkomma.mul(a, b) != erwartet:
			abweichungen += 1
	_gleich(abweichungen, 0, "mul gegen divGanz über 2000 Paare")
	_gleich(KernFestkomma.mulGanz(114688, 3), 344064, "mulGanz(1.75, 3)")
	# divGanz nur durch positive ganze Zahl, Rundung nach −∞
	_gleich(KernFestkomma.divGanz(7, 2), 3, "divGanz(7, 2)")
	_gleich(KernFestkomma.divGanz(-7, 2), -4, "divGanz(-7, 2)")
	_gleich(KernFestkomma.divGanz(-8, 2), -4, "divGanz(-8, 2)")
	_gleich(KernFestkomma.divGanz(0, 5), 0, "divGanz(0, 5)")
	_gleich(KernFestkomma.divGanz(KernFestkomma.ausGanz(-1), 3), -21846, "divGanz(-1, 3) als Fest")
	# Tempostufe des Sprints ⌊(n − 1)/6⌋ (Kampf 9.2)
	_gleich(KernFestkomma.divGanz(90 - 1, 6), 14, "divGanz(89, 6)")
	# ganz, nachkomma, Vergleiche
	_gleich(KernFestkomma.ganz(163840), 2, "ganz(2.5)")
	_gleich(KernFestkomma.ganz(-16384), -1, "ganz(-0.25)")
	_gleich(KernFestkomma.nachkomma(-16384), 49152, "nachkomma(-0.25)")
	_gleich(KernFestkomma.vergleich(1, 2), -1, "vergleich(1, 2)")
	_gleich(KernFestkomma.vergleich(2, 2), 0, "vergleich(2, 2)")
	_gleich(KernFestkomma.vergleich(3, 2), 1, "vergleich(3, 2)")
	_ok(KernFestkomma.gleich(5, 5) and KernFestkomma.kleiner(4, 5) and KernFestkomma.kleinerGleich(5, 5) \
			and KernFestkomma.groesser(6, 5) and KernFestkomma.groesserGleich(5, 5), "gleich, kleiner, groesser")
	_gleich(KernFestkomma.minF(-1, 2), -1, "minF")
	_gleich(KernFestkomma.maxF(-1, 2), 2, "maxF")
	_gleich(KernFestkomma.vorzeichen(-7), -1, "vorzeichen(-7)")
	_gleich(KernFestkomma.vorzeichen(0), 0, "vorzeichen(0)")
	# Formatierung nach Kampf 11.3
	_gleich(KernFestkomma.zuDezimalText(8855552), "135.125", "zuDezimalText(135.125)")
	_gleich(KernFestkomma.zuDezimalText(3358720), "51.25", "zuDezimalText(51.25)")
	_gleich(KernFestkomma.zuDezimalText(6553600), "100", "zuDezimalText(100)")
	_gleich(KernFestkomma.zuDezimalText(-32768), "-0.5", "zuDezimalText(-0.5)")
	_gleich(KernFestkomma.zuDezimalText(0), "0", "zuDezimalText(0)")
	_gleich(KernFestkomma.zuDezimalText(1), "0.0000152587890625", "zuDezimalText(1)")
	_gleich(KernFestkomma.zuDezimalText(115072), "1.755859375", "zuDezimalText(1.755859375)")
	_gleich(KernFestkomma.zuDezimalText(-2147483648), "-32768", "zuDezimalText(kleinster Wert)")
	# Sprungbahn exakt (Kampf 4.4: Scheitel 51,25, J+41 2,5)
	var h: int = 0
	var vh: int = 323584
	var verlauf: Array[String] = []
	for n in range(1, 41):
		h = KernFestkomma.add(h, vh)
		vh = KernFestkomma.sub(vh, 16384)
		verlauf.append(KernFestkomma.zuDezimalText(h))
	_gleich(verlauf[0], "4.9375", "Sprungbahn J+2")
	_gleich(verlauf[19], "51.25", "Sprungbahn J+21")
	_gleich(verlauf[39], "2.5", "Sprungbahn J+41")
	# produktGroesser vergleicht a·b > c·d exakt, auch über 32 Bit
	_gleich(KernFestkomma.produktGroesser(3, 4, 2, 5), true, "produktGroesser(3,4,2,5)")
	_gleich(KernFestkomma.produktGroesser(2, 5, 3, 4), false, "produktGroesser(2,5,3,4)")
	_gleich(KernFestkomma.produktGroesser(2, 6, 3, 4), false, "produktGroesser(2,6,3,4)")
	_gleich(KernFestkomma.produktGroesser(32767, EINS, 3227, 665398), true, "produktGroesser über 2^31 (a)")
	_gleich(KernFestkomma.produktGroesser(32767, EINS, 3228, 665398), false, "produktGroesser über 2^31 (b)")
	_gleich(KernFestkomma.produktGroesser(1, EINS, 32767, 665398), false, "produktGroesser über 2^31 (c)")
	_gleich(KernFestkomma.produktGroesser(2147483647, 2147483647, 2147483647, 2147483646), true, "produktGroesser 2^31−1")


func _test_zufall() -> void:
	# Xorshift32 für Seed 1, die ersten zehn Zustände
	var z: KernZufall.Zufall = KernZufall.zufallNeu(1)
	var folge: Array[int] = []
	for i in range(10):
		folge.append(KernZufall.ziehen(z))
	_gleich(folge, SEED_1_FOLGE, "Folge für Seed 1")
	_gleich(z.ziehungen, 10, "Ziehungen nach zehn Ziehungen")
	_gleich(KernZufall.xorshift32(1), SEED_1_FOLGE[0], "xorshift32(1)")
	# Seed wird als uint32 gelesen
	_gleich(KernZufall.zufallNeu(-1).zustand, 4294967295, "Seed -1 als uint32")
	# Ziehung aus n ist ⌊r · n / 2^32⌋ mit dem neuen Zustand
	for n: int in [1, 2, 3, 4, 8, 100, 1000]:
		var z2: KernZufall.Zufall = KernZufall.zufallNeu(1)
		for i in range(10):
			var w: int = KernZufall.ziehenAus(z2, n)
			var erwartet: int = KernFestkomma.divGanz(SEED_1_FOLGE[i] * n, KernZufall.ZWEI_HOCH_32)
			_gleich(w, erwartet, "ziehenAus n=%d, i=%d" % [n, i])
		_gleich(z2.ziehungen, 10, "Ziehungen n=%d" % n)
	# Wahl aus einer Liste und aus einem Bereich in Schritten
	var z3: KernZufall.Zufall = KernZufall.zufallNeu(12345)
	var gesehen: Dictionary = {}
	var im_bereich: bool = true
	for i in range(2000):
		var w2: int = KernZufall.bereich(z3, 16, 44, 4)
		if w2 < 16 or w2 > 44 or (w2 - 16) % 4 != 0:
			im_bereich = false
		gesehen[w2] = true
	_ok(im_bereich, "bereich(16, 44, 4) liegt im Raster")
	_gleich(gesehen.size(), 8, "bereich: alle acht Werte gesehen")
	_gleich(z3.ziehungen, 2000, "bereich: eine Ziehung je Aufruf")
	var liste: Array = ["BA", "BB", "BC"]
	var a: KernZufall.Zufall = KernZufall.zufallNeu(1)
	var b: KernZufall.Zufall = KernZufall.zufallKopie(a)
	var wahl_gleich: bool = true
	for i in range(50):
		if KernZufall.wahl(a, liste) != liste[KernZufall.ziehenAus(b, 3)]:
			wahl_gleich = false
	_ok(wahl_gleich, "wahl entspricht ziehenAus")
	# Anteile in Prozent mit festen Grenzen (70/25/5 heißt 0–69, 70–94, 95–99)
	var z4: KernZufall.Zufall = KernZufall.zufallNeu(7)
	var kopie: KernZufall.Zufall = KernZufall.zufallKopie(z4)
	var zaehler: Array[int] = [0, 0, 0]
	var anteil_gleich: bool = true
	for i in range(5000):
		var k: int = KernZufall.anteil(z4, [70, 25, 5])
		var w3: int = KernZufall.ziehenAus(kopie, 100)
		var erwartet2: int = 0 if w3 < 70 else (1 if w3 < 95 else 2)
		if k != erwartet2:
			anteil_gleich = false
		zaehler[k] += 1
	_ok(anteil_gleich, "anteil: Grenzen 70/25/5")
	_ok(zaehler[0] > zaehler[1] and zaehler[1] > zaehler[2], "anteil: Häufigkeiten absteigend")
	var p: KernZufall.Zufall = KernZufall.zufallNeu(1)
	_gleich(KernZufall.prozent(p, 1), KernZufall.ziehenAus(KernZufall.zufallNeu(1), 100) < 1, "prozent")
	# Generator je Gegner aus einer Ziehung des Hauptgenerators
	var haupt: KernZufall.Zufall = KernZufall.zufallNeu(1)
	var g0: KernZufall.Zufall = KernZufall.gegnerZufall(haupt)
	var g1: KernZufall.Zufall = KernZufall.gegnerZufall(haupt)
	_gleich(haupt.ziehungen, 2, "Hauptgenerator nach zwei Gegnern")
	_gleich(g0.zustand, SEED_1_FOLGE[0], "Gegner 0 Startwert")
	_gleich(g1.zustand, SEED_1_FOLGE[1], "Gegner 1 Startwert")
	_gleich(g0.ziehungen, 0, "Gegner 0 Ziehungen")
	KernZufall.ziehen(g0)
	_gleich(haupt.ziehungen, 2, "Ziehung des Gegners ändert den Hauptgenerator nicht")
	_gleich(g1.zustand, SEED_1_FOLGE[1], "Ziehung ändert andere Gegner nicht")


func _test_tasten() -> void:
	_gleich(KernTasten.TASTE_L | KernTasten.TASTE_R | KernTasten.TASTE_O | KernTasten.TASTE_U | KernTasten.TASTE_A | KernTasten.TASTE_S, KernTasten.ALLE, "ALLE")
	_gleich(KernTasten.tastenZuText(KernTasten.tastenAusText("SARO")), "ROAS", "Reihenfolge L R O U A S")
	_gleich(KernTasten.tastenZuText(KernTasten.TASTE_S | KernTasten.TASTE_O), "OS", "tastenZuText(S|O)")
	_gleich(KernTasten.tastenZuText(KernTasten.KEINE), "", "tastenZuText(KEINE)")
	_gleich(KernTasten.tastenAusText("RA"), KernTasten.TASTE_R | KernTasten.TASTE_A, "tastenAusText(RA)")
	_gleich(KernTasten.tastenAusText(""), KernTasten.KEINE, "tastenAusText leer")
	# P1: L und R zugleich keine x-Richtung, O und U zugleich keine Tiefenrichtung
	_gleich(KernTasten.richtungX(KernTasten.tastenAusText("LR")), 0, "richtungX(LR)")
	_gleich(KernTasten.richtungX(KernTasten.tastenAusText("L")), -1, "richtungX(L)")
	_gleich(KernTasten.richtungX(KernTasten.tastenAusText("R")), 1, "richtungX(R)")
	_gleich(KernTasten.richtungZ(KernTasten.tastenAusText("OU")), 0, "richtungZ(OU)")
	_gleich(KernTasten.richtungZ(KernTasten.tastenAusText("O")), 1, "richtungZ(O)")
	_gleich(KernTasten.richtungZ(KernTasten.tastenAusText("U")), -1, "richtungZ(U)")
	# neue Drücke
	_gleich(KernTasten.neuGedrueckt(KernTasten.TASTE_R | KernTasten.TASTE_A, KernTasten.TASTE_A), KernTasten.TASTE_R, "neuGedrueckt")
	_ok(KernTasten.hat(KernTasten.TASTE_R | KernTasten.TASTE_A, KernTasten.TASTE_A), "hat")
	_ok(not KernTasten.hatAlle(KernTasten.TASTE_R, KernTasten.TASTE_R | KernTasten.TASTE_A), "hatAlle")
	_gleich(KernTasten.richtungsteil(KernTasten.TASTE_R | KernTasten.TASTE_A), KernTasten.TASTE_R, "richtungsteil")


func _test_eingabe() -> void:
	var text: Variant = VergleichHilfe.lesen(VergleichHilfe.wurzel().path_join("spiel/tests/eingaben/beispiel.txt"))
	_ok(text != null, "Eingabedatei beispiel.txt vorhanden")
	if text == null:
		return
	var e: PruefEingabe.Eingabefolge = PruefEingabe.parseEingabe(text as String)
	_gleich(e.letzter, 40, "letzter Frame")
	_gleich(PruefEingabe.tastenIn(e, 1), 0, "T(1)")
	_gleich(PruefEingabe.tastenIn(e, 10), KernTasten.TASTE_A, "T(10)")
	_gleich(PruefEingabe.tastenIn(e, 11), 0, "T(11)")
	_gleich(PruefEingabe.tastenIn(e, 24), KernTasten.TASTE_A, "T(24)")
	_gleich(PruefEingabe.tastenIn(e, 30), KernTasten.TASTE_R, "T(30)")
	_gleich(PruefEingabe.tastenIn(e, 35), KernTasten.TASTE_R | KernTasten.TASTE_A, "T(35)")
	_gleich(PruefEingabe.tastenIn(e, 36), KernTasten.TASTE_R | KernTasten.TASTE_A, "T(36)")
	_gleich(PruefEingabe.tastenIn(e, 40), KernTasten.TASTE_R, "T(40)")
	_gleich(PruefEingabe.tastenIn(e, 41), 0, "T(41)")
	_gleich(PruefEingabe.tastenIn(e, 100000), 0, "T(100000)")
	# Aufzeichnung je Lauf gleicher Tastenmengen, aufsteigend
	var aufzeichnung: String = PruefEingabe.eingabeText(func(f: int) -> int: return PruefEingabe.tastenIn(e, f), e.letzter)
	_gleich(aufzeichnung, "10,10,A\n24,24,A\n30,34,R\n35,36,RA\n37,40,R\n", "eingabeText")
	var wieder: PruefEingabe.Eingabefolge = PruefEingabe.parseEingabe(aufzeichnung)
	var gleich: bool = true
	for f in range(1, 46):
		if PruefEingabe.tastenIn(wieder, f) != PruefEingabe.tastenIn(e, f):
			gleich = false
	_ok(gleich, "Aufzeichnung gelesen ergibt dieselben Tasten")
	_gleich(PruefEingabe.eingabeText(func(_f: int) -> int: return 0, 10), "", "eingabeText ohne Taste")
	_gleich(PruefEingabe.tastenIn(PruefEingabe.parseEingabe("1,3,\n"), 2), 0, "Zeile ohne Tasten")
	_gleich(PruefEingabe.parseEingabe("").letzter, 0, "leere Eingabe")
	# Kommentare, Leerzeilen, CRLF und Überlappung
	var f2: PruefEingabe.Eingabefolge = PruefEingabe.parseEingabe("# Kommentar\r\n\r\n2,4,r\r\n3,5,A\r\n")
	_gleich(PruefEingabe.tastenIn(f2, 2), KernTasten.TASTE_R, "CRLF T(2)")
	_gleich(PruefEingabe.tastenIn(f2, 3), KernTasten.TASTE_R | KernTasten.TASTE_A, "Überlappung T(3)")
	_gleich(PruefEingabe.tastenIn(f2, 5), KernTasten.TASTE_A, "T(5)")
	_gleich(f2.letzter, 5, "letzter Frame (5)")


func _test_stage() -> void:
	var s: KernStage.Stage = KernStage.parseStage(_stage_text("pruefbuehne"))
	_gleich(s.id, "pruefbuehne", "Prüfbühne id")
	_gleich(s.x_ende, 4000, "Prüfbühne x_ende")
	_gleich(s.kamera_fest, true, "Prüfbühne kamera_fest")
	_gleich(s.raender, false, "Prüfbühne raender")
	_gleich([s.start_x, s.start_z, s.start_blick], [100, 100, 1], "Prüfbühne Start")
	_gleich(KernStage.bandGrenzen(s, 0), {"unten": 10, "oben": 197}, "Prüfbühne Band bei 0")
	_gleich(KernStage.bandGrenzen(s, 3999), {"unten": 10, "oben": 197}, "Prüfbühne Band bei 3999")
	_gleich(KernStage.bandGrenzen(s, 4000), null, "Prüfbühne Band bei 4000")
	_gleich(KernStage.kameraY(s, 0), 0, "Prüfbühne kameraY(0)")
	_gleich(s.wellen.size(), 0, "Prüfbühne Wellen")
	_gleich(s.gegner.size(), 0, "Prüfbühne Gegner")

	var t: KernStage.Stage = KernStage.parseStage(_stage_text("scheibe"))
	_gleich([t.id, t.x_ende, t.kamera_x_max, t.start_x, t.start_z, t.start_blick], ["scheibe", 2304, 1920, 64, 170, 1], "Scheibe Kopfwerte")
	_gleich(t.baender.size(), 3, "Scheibe Bänder")
	_gleich(KernStage.bandGrenzen(t, 0), {"unten": 138, "oben": 213}, "Scheibe Band bei 0")
	_gleich(KernStage.bandGrenzen(t, 399), {"unten": 138, "oben": 213}, "Scheibe Band bei 399")
	_gleich(KernStage.bandGrenzen(t, 400), {"unten": 138, "oben": 229}, "Scheibe Band bei 400")
	_gleich(KernStage.bandGrenzen(t, 849), {"unten": 138, "oben": 229}, "Scheibe Band bei 849")
	_gleich(KernStage.bandGrenzen(t, 850), null, "Scheibe Band bei 850")
	_gleich(KernStage.bandGrenzen(t, 1699), null, "Scheibe Band bei 1699")
	_gleich(KernStage.bandGrenzen(t, 1700), {"unten": 10, "oben": 101}, "Scheibe Band bei 1700")
	_gleich(KernStage.bandGrenzen(t, 2303), {"unten": 10, "oben": 101}, "Scheibe Band bei 2303")
	_gleich(KernStage.kameraY(t, 0), 128, "Scheibe kameraY(0)")
	_gleich(KernStage.kameraY(t, 466), 128, "Scheibe kameraY(466)")
	# zwischen zwei Sätzen: Wert des vorigen
	_gleich(KernStage.kameraY(t, 1000), 128, "Scheibe kameraY(1000)")
	_gleich(KernStage.kameraY(t, 1792), 0, "Scheibe kameraY(1792)")
	_gleich(KernStage.kameraY(t, 1920), 0, "Scheibe kameraY(1920)")
	var behaelter: Array = []
	for b: KernStage.BehaelterSatz in t.behaelter:
		behaelter.append([b.id, b.art, b.x, b.z, b.inhalt])
	_gleich(behaelter, [
		["F1", "Fass", 560, 158, "Kometenbraten"],
		["B1", "Bosskiste", 2040, 95, "Raketenwerfer"],
		["B2", "Bosskiste", 2080, 95, "Raketenwerfer"],
		["B3", "Bosskiste", 2120, 95, "leer"],
	], "Scheibe Behälter")
	var gegner: Array = []
	for g: KernStage.GegnerSatz in t.gegner:
		gegner.append([g.typ, g.x, g.z, g.auftritt, g.welle, g.werte])
	_gleich(gegner, [
		["Ballast", 2080, 80, "boss", 7, "start"],
		["Bolzer", 368, 206, "versteck", 1, "start"],
		["Bolzer", 633, 168, "hocke", 2, "start"],
		["Rammbock", 663, 208, "hocke", 2, "start"],
	], "Scheibe Gegner")
	var wellen: Array = []
	for w: KernStage.WelleSatz in t.wellen:
		wellen.append([w.nr, w.ausloeser, w.wert])
	_gleich(wellen, [[1, "figur_abstand", 150], [2, "kamera", 250], [7, "arena", 0], [9, "boss_lp", 25]], "Scheibe Wellen")
	var eintraege: Array = []
	for e: KernStage.EintragSatz in t.eintraege:
		eintraege.append([e.welle, e.typ, e.auftritt, e.z])
	_ok(eintraege.size() >= 3, "Scheibe Einträge")
	_gleich(eintraege.slice(0, 2), [[7, "Bolzer", "rand_links", 30], [7, "Bolzer", "rand_links", 80]], "Scheibe erste Einträge")
	_gleich(eintraege[2], [9, "Zünder", "rand_links", 55], "Scheibe dritter Eintrag")


func _stage_text(buehne: String) -> String:
	var text: Variant = VergleichHilfe.lesen(VergleichHilfe.wurzel().path_join("spiel/daten/stages/%s.txt" % buehne))
	if text == null:
		_ok(false, "Stage-Datei %s vorhanden" % buehne)
		return ""
	return text as String


## Eine Welt von Hand aufbauen (ohne erzeugeWelt), um das Protokollformat zu prüfen.
func _welt_von_hand() -> KernWelt:
	var t: KernEntitaeten.SlotTabelle = KernEntitaeten.slotTabelleNeu()
	var w: KernWelt = KernWelt.new()
	w.figur = t.figur
	w.gegner = t.gegner
	w.objekte = t.objekte
	w.geschosse = t.geschosse
	w.zufall = KernZufall.zufallNeu(1)
	return w


func _test_protokollformat() -> void:
	var s: Array[String] = PruefProtokoll.protokollSpalten()
	_gleich(s.size(), 22 + 20 * 10 + 13 + 20 * 6 + 2 + 1, "Spaltenzahl")
	var eindeutig: Dictionary = {}
	for name in s:
		eindeutig[name] = true
	_gleich(eindeutig.size(), s.size(), "Spaltennamen eindeutig")
	_gleich(s.slice(0, 22), [
		"frame", "tasten", "f_x", "f_z", "f_h", "f_lp", "f_zst", "f_akt", "f_ph", "f_uhr", "f_stopp", "f_schutz",
		"f_blick", "kombo", "f_waffe", "f_mun", "f_sprint", "rang", "rang_zaehler", "kamera_x", "kamera_y", "zufall_haupt",
	], "Spalten 0 bis 21")
	_gleich(s.slice(22, 32), ["s0_typ", "s0_x", "s0_z", "s0_h", "s0_lp", "s0_zst", "s0_akt", "s0_modus", "s0_ph", "s0_blick"], "Spalten s0")
	_gleich(s[221], "s19_blick", "Spalte 221")
	_gleich(s.slice(222, 235), [
		"kamera_modus", "schuetteln", "lebende", "wellen", "pfeil", "recht_l", "recht_r", "zielrecht", "leben", "punkte",
		"anzeige", "phase", "steuerung",
	], "Spalten der Welt")
	_gleich(s.slice(235, 241), ["s0_recht", "s0_angriff", "s0_ziel", "s0_schaden", "s0_timer", "s0_zufall"], "Spalten s0 der Welt")
	_gleich(s[354], "s19_zufall", "Spalte 354")
	_gleich(s.slice(355), ["s0_lpfolge", "s0_folge", "ereignis"], "Spalten am Ende")
	_gleich(PruefProtokoll.OBJEKT_SPALTEN, ["frame", "slot", "typ", "art", "x", "z", "h", "zst", "lp", "munition", "liegezeit", "inhalt", "flugphase"], "OBJEKT_SPALTEN")
	_gleich(PruefProtokoll.PROTOKOLL_VERSION, "comet-brawlers-scheibe-0.1", "PROTOKOLL_VERSION")

	# Kopf
	var start: KernStart.Pruefstart = KernStart.Pruefstart.new()
	start.name = "probe"
	start.seed = 5
	_gleich(PruefProtokoll.protokollKopf(start, "abc"), ["# version=comet-brawlers-scheibe-0.1", "# szene=probe", "# seed=5", "# eingabe_md5=abc"], "protokollKopf")
	_gleich(PruefProtokoll.objektKopf(start, "abc"), ["# version=comet-brawlers-scheibe-0.1", "# szene=probe", "# seed=5", "# eingabe_md5=abc"], "objektKopf")

	# Zeile einer von Hand aufgebauten Welt
	var welt: KernWelt = _welt_von_hand()
	welt.frame = 7
	welt.eingabe.t = KernTasten.TASTE_R | KernTasten.TASTE_A
	welt.figur.x = KernFestkomma.ausGanz(100) + 32768
	welt.figur.z = KernFestkomma.ausGanz(100)
	var g2: KernEntitaeten.Gegner = KernEntitaeten.gegnerBelegen(welt.gegner[2], "Bolzer")
	g2.x = KernFestkomma.ausGanz(146)
	g2.z = -32768
	g2.lp = 12
	g2.recht = "L"
	g2.modus_uhr = 4
	welt.wellen.ausgeloest = [1, 2, 7]
	welt.rechte.l = 3
	welt.rahmen.leben = 3
	welt.ereignisse = ["EI:s0.x=200", "WL:7"]
	var zeile: String = PruefProtokoll.protokollZeile(welt)
	_ok(not zeile.contains("\n"), "Zeile ohne Zeilenumbruch")
	var felder: PackedStringArray = zeile.split(",")
	_gleich(felder.size(), s.size(), "Felderzahl der Zeile")
	if felder.size() == s.size():
		var wert: Dictionary = {}
		for i in range(s.size()):
			wert[s[i]] = felder[i]
		_gleich(wert["frame"], "7", "frame")
		_gleich(wert["tasten"], "RA", "tasten")
		_gleich(wert["f_x"], "100.5", "f_x")
		_gleich(wert["f_z"], "100", "f_z")
		_gleich(wert["f_h"], "0", "f_h")
		_gleich(wert["f_lp"], "72", "f_lp")
		_gleich(wert["f_zst"], "1", "f_zst")
		_gleich(wert["f_akt"], "STAND", "f_akt")
		_gleich(wert["f_ph"], "", "f_ph")
		_gleich(wert["f_uhr"], "1", "f_uhr")
		_gleich(wert["f_blick"], "R", "f_blick")
		_gleich(wert["f_waffe"], "", "f_waffe")
		_gleich(wert["zufall_haupt"], "0", "zufall_haupt")
		_gleich(wert["s0_typ"], "", "freier Slot s0_typ")
		_gleich(wert["s19_blick"], "", "freier Slot s19_blick")
		_gleich(wert["s1_recht"], "", "freier Slot s1_recht")
		_gleich(wert["s19_zufall"], "", "freier Slot s19_zufall")
		_gleich(wert["s2_typ"], "Bolzer", "s2_typ")
		_gleich(wert["s2_x"], "146", "s2_x")
		_gleich(wert["s2_z"], "-0.5", "s2_z")
		_gleich(wert["s2_lp"], "12", "s2_lp")
		_gleich(wert["s2_zst"], "1", "s2_zst")
		_gleich(wert["s2_akt"], "STAND", "s2_akt")
		_gleich(wert["s2_modus"], "FREI", "s2_modus")
		_gleich(wert["s2_blick"], "R", "s2_blick")
		_gleich(wert["s2_recht"], "L", "s2_recht")
		_gleich(wert["s2_timer"], "4", "s2_timer")
		_gleich(wert["s2_zufall"], "0", "s2_zufall")
		_gleich(wert["kamera_modus"], "FREI", "kamera_modus")
		_gleich(wert["schuetteln"], "0/0", "schuetteln")
		_gleich(wert["lebende"], "0", "lebende")
		_gleich(wert["wellen"], "1-2-7", "wellen")
		_gleich(wert["pfeil"], "0", "pfeil")
		_gleich(wert["recht_l"], "3", "recht_l")
		_gleich(wert["recht_r"], "", "recht_r")
		_gleich(wert["zielrecht"], "", "zielrecht")
		_gleich(wert["leben"], "3", "leben")
		_gleich(wert["anzeige"], "", "anzeige")
		_gleich(wert["phase"], "SPIEL", "phase")
		_gleich(wert["steuerung"], "1", "steuerung")
		_gleich(wert["s0_lpfolge"], "", "s0_lpfolge ohne Boss")
		_gleich(wert["s0_folge"], "", "s0_folge ohne Boss")
		_gleich(wert["ereignis"], "EI:s0.x=200;WL:7", "ereignis")
	# Boss belegt: lpfolge und folge erscheinen
	var boss: KernEntitaeten.Gegner = KernEntitaeten.gegnerBelegen(welt.gegner[0], "Ballast")
	boss.lp_folge = 40
	boss.folge = 1
	welt.ereignisse = []
	var f2: PackedStringArray = PruefProtokoll.protokollZeile(welt).split(",")
	_gleich(f2[355], "40", "s0_lpfolge mit Boss")
	_gleich(f2[356], "1", "s0_folge mit Boss")
	_gleich(f2[357], "", "leere Ereignisliste")

	# Objektprotokoll: belegte Objekte in o20 bis o59, dann Geschosse g0 bis g4
	_gleich(PruefProtokoll.objektZeilen(welt), [] as Array[String], "keine belegten Objekte")
	var o: KernEntitaeten.Objekt = KernEntitaeten.objektBelegen(welt.objekte[4], "Behälter")
	o.art = "Fass"
	o.x = KernFestkomma.ausGanz(150)
	o.z = KernFestkomma.ausGanz(60)
	o.inhalt = "Raketenwerfer"
	var gs: KernEntitaeten.Objekt = KernEntitaeten.objektBelegen(welt.geschosse[1], "Rakete")
	gs.x = KernFestkomma.ausGanz(10) + 16384
	gs.h = KernFestkomma.ausGanz(5)
	gs.flugphase = "FLUG"
	_gleich(PruefProtokoll.objektZeilen(welt), [
		"7,o24,Behälter,Fass,150,60,0,1,0,0,0,Raketenwerfer,",
		"7,g1,Rakete,,10.25,0,5,1,0,0,0,,FLUG",
	] as Array[String], "objektZeilen")

	# Protokollschreiber: Kopf, Spaltenzeile, eine Zeile je Frame
	var schreiber: PruefPruefung.Protokollschreiber = PruefPruefung.protokollschreiberNeu(start, "abc")
	schreiber.frame(welt)
	var pz: PackedStringArray = schreiber.protokoll().split("\n")
	_gleich(pz.size(), 4 + 1 + 1 + 1, "Zeilen des Protokolls (Kopf, Spalten, Frame, Schluss)")
	_gleich(pz[pz.size() - 1], "", "Protokoll endet mit LF")
	var oz: PackedStringArray = schreiber.objekte().split("\n")
	_gleich(oz.size(), 4 + 1 + 2 + 1, "Zeilen der Objekte")
	_gleich(oz[4], ",".join(PackedStringArray(PruefProtokoll.OBJEKT_SPALTEN)), "Objektspalten")
	_ok(not schreiber.protokoll().contains("\r"), "kein CR im Protokoll")
	_gleich(PruefPruefung.md5Text("abc"), "900150983cd24fb0d6963f7d28e17f72", "md5 von abc")
	_gleich(PruefPruefung.md5Text("Bühne ä"), "Bühne ä".md5_text(), "md5 von Umlauten")


# ===========================================================================
# (2) Reinheitstest
# ===========================================================================

func _gd_dateien(ordner: String) -> Array[String]:
	var liste: Array[String] = []
	var d: DirAccess = DirAccess.open(ordner)
	if d == null:
		return liste
	var dateien: PackedStringArray = d.get_files()
	dateien.sort()
	for name in dateien:
		if name.ends_with(".gd"):
			liste.append(ordner.path_join(name))
	var ordnerliste: PackedStringArray = d.get_directories()
	ordnerliste.sort()
	for name in ordnerliste:
		liste.append_array(_gd_dateien(ordner.path_join(name)))
	return liste


func _test_reinheit() -> void:
	var kern: String = VergleichHilfe.wurzel().path_join("godot/kern")
	var liste: Array[String] = _gd_dateien(kern)
	_ok(liste.size() >= 10, "mindestens zehn Dateien in godot/kern (gefunden: %d)" % liste.size())
	var muster: Array[RegEx] = []
	for m in VERBOTEN:
		var r: RegEx = RegEx.new()
		r.compile(m)
		muster.append(r)
	for datei in liste:
		var text: Variant = VergleichHilfe.lesen(datei)
		if text == null:
			_ok(false, "%s nicht lesbar" % datei)
			continue
		var zeilen: PackedStringArray = (text as String).split("\n")
		for i in range(zeilen.size()):
			for r in muster:
				if r.search(zeilen[i]) != null:
					_ok(false, "%s Zeile %d enthält %s" % [datei.trim_prefix(kern + "/"), i + 1, r.get_pattern()])
	_ok(true, "Reinheit geprüft")


# ===========================================================================
# (3) Szenen
# ===========================================================================

## Prüflauf einer Szene; Ergebnis oder null (Skriptfehler).
func _lauf(name: String) -> PruefPruefung.PruefErgebnis:
	var w: String = VergleichHilfe.wurzel()
	var szene: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/szenen/%s.txt" % name))
	if szene == null:
		return null
	var eingabe: Variant = VergleichHilfe.lesen(w.path_join("spiel/tests/eingaben/%s.txt" % name))
	var eingang: PruefPruefung.PruefEingang = PruefPruefung.PruefEingang.new()
	eingang.szeneText = szene as String
	eingang.eingabeText = "" if eingabe == null else eingabe as String
	eingang.stageText = VergleichHilfe.stageAusOrdner(w.path_join("spiel/daten/stages"))
	eingang.md5 = Callable(PruefPruefung, "md5Text")
	return PruefPruefung.pruefLauf(eingang)


## Vergleicht einen erzeugten Text byteweise mit der Referenzdatei; "" bei Gleichheit, sonst die Meldung.
func _vergleiche(titel: String, ist: String, ref_pfad: String) -> String:
	var soll_bytes: Variant = VergleichHilfe.lesenBytes(ref_pfad)
	if soll_bytes == null:
		return "%s: Referenzdatei fehlt (%s)" % [titel, ref_pfad]
	if ist.to_utf8_buffer() == (soll_bytes as PackedByteArray):
		return ""
	var soll: String = (soll_bytes as PackedByteArray).get_string_from_utf8()
	var meldung: String = VergleichHilfe.kurzbericht(ist, soll)
	if meldung == "":
		meldung = "Bytes verschieden, Zeilen gleich"
	return "%s: erste abweichende %s" % [titel, meldung]


## Eine Szene laufen lassen und mit der Referenz vergleichen; "" bei Erfolg, sonst die Fehlermeldung.
func _szene_pruefen(name: String) -> String:
	var ergebnis: PruefPruefung.PruefErgebnis = _lauf(name)
	if ergebnis == null:
		return "Lauf ohne Ergebnis (Skriptfehler oder Szenendatei fehlt)"
	var ref: String = VergleichHilfe.wurzel().path_join("spiel/tests/referenz/alle/%s" % name)
	var fehler: Array[String] = []
	var a: String = _vergleiche("protokoll.csv", ergebnis.protokoll, ref + ".protokoll.csv")
	if a != "":
		fehler.append(a)
	var b: String = _vergleiche("objekte.csv", ergebnis.objekte, ref + ".objekte.csv")
	if b != "":
		fehler.append(b)
	return "; ".join(PackedStringArray(fehler))


func _szenennamen() -> Array[String]:
	var namen: Array[String] = []
	var d: DirAccess = DirAccess.open(VergleichHilfe.wurzel().path_join("spiel/tests/szenen"))
	if d == null:
		return namen
	var dateien: PackedStringArray = d.get_files()
	for datei in dateien:
		if datei.ends_with(".txt"):
			namen.append(datei.trim_suffix(".txt"))
	namen.sort()
	return namen


func _szenen(nur: String) -> void:
	var namen: Array[String] = _szenennamen()
	if nur == "" and namen.size() != 74:
		_fehler += 1
		print("FEHLER Szenenliste: %d Szenen gefunden, erwartet 74" % namen.size())
	var ok: int = 0
	var gelaufen: int = 0
	var erste: String = ""
	for name in namen:
		if nur != "" and not name.contains(nur):
			continue
		if erste == "":
			erste = name
		gelaufen += 1
		_geprueft += 1
		var t0: int = Time.get_ticks_msec()
		var meldung: String = _szene_pruefen(name)
		var dauer: int = Time.get_ticks_msec() - t0
		if meldung == "":
			ok += 1
			print("ok %s" % name)
		else:
			_fehler += 1
			print("FEHLER %s: %s" % [name, meldung])
		_dauer_summe += dauer
	print("Szenen: %d von %d ok (Laufzeit der Läufe %.1f s)" % [ok, gelaufen, _dauer_summe / 1000.0])
	if gelaufen == 0:
		_fehler += 1
		print("FEHLER keine Szene gelaufen (Filter „%s“)" % nur)
	# Determinismus: zwei Läufe derselben Szene liefern gleiche MD5
	if erste != "":
		var l1: PruefPruefung.PruefErgebnis = _lauf(erste)
		var l2: PruefPruefung.PruefErgebnis = _lauf(erste)
		_geprueft += 1
		if l1 == null or l2 == null:
			_fehler += 1
			print("FEHLER Determinismus %s: Lauf ohne Ergebnis" % erste)
		elif l1.protokoll.md5_text() == l2.protokoll.md5_text() and l1.objekte.md5_text() == l2.objekte.md5_text():
			print("ok Determinismus %s (protokoll.csv %s)" % [erste, l1.protokoll.md5_text()])
		else:
			_fehler += 1
			print("FEHLER Determinismus %s: zwei Läufe liefern verschiedene MD5" % erste)



## Meldet das Ergebnis eines Testmoduls mit der Schnittstelle lauf() -> {"geprueft", "fehler"}.
func _modul(titel: String, r: Dictionary) -> void:
	var n: int = r["geprueft"] as int
	var fehler: Array = r["fehler"] as Array
	_geprueft += n
	_fehler += fehler.size()
	if fehler.is_empty():
		print("ok %s (%d Prüfungen)" % [titel, n])
	else:
		print("FEHLER %s: %d von %d Prüfungen" % [titel, fehler.size(), n])
		for f: String in fehler:
			print("    %s" % f)


# ===========================================================================
# Hauptablauf
# ===========================================================================

func _init() -> void:
	var t0: int = Time.get_ticks_msec()
	var argv: PackedStringArray = OS.get_cmdline_user_args()
	var nur: String = ""
	var ohne_szenen: bool = false
	var i: int = 0
	while i < argv.size():
		if argv[i] == "--nur" and i + 1 < argv.size():
			nur = argv[i + 1]
			i += 2
		elif argv[i] == "--ohne-szenen":
			ohne_szenen = true
			i += 1
		else:
			printerr("unerwartetes Argument „%s“ (erlaubt: --nur <Teil>, --ohne-szenen)" % argv[i])
			quit(1)
			return
	_gruppe("Festkomma", _test_festkomma)
	_gruppe("Zufall", _test_zufall)
	_gruppe("Tasten", _test_tasten)
	_gruppe("Eingabeparser", _test_eingabe)
	_gruppe("Stage-Parser", _test_stage)
	_gruppe("Protokollformat", _test_protokollformat)
	_gruppe("Reinheit von godot/kern", _test_reinheit)
	_modul("Darstellung", DarstellungTest.lauf())
	_modul("Vela-Puppe", VelaTest.lauf())
	_modul("Darstellung mit Puppe", PuppeProtokollTest.lauf())
	if not ohne_szenen:
		_szenen(nur)
	var sekunden: float = (Time.get_ticks_msec() - t0) / 1000.0
	if _fehler == 0:
		print("ALLE TESTS BESTANDEN (%d Prüfungen, %.1f s)" % [_geprueft, sekunden])
		quit(0)
	else:
		print("FEHLER: %d Abweichungen bei %d Prüfungen (%.1f s)" % [_fehler, _geprueft, sekunden])
		quit(1)
