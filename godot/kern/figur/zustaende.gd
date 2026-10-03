# Zustandsautomat der Spielfigur (K1) nach docs/spezifikation-kampf.md,
# Abschnitt 4 (4.1 Grundregeln, 4.2 Vorrang der Drücke, 4.3 Zustände, 4.4
# Bewegung im Sprung), Kette 5.6, Griff und Wurf 8.2 bis 8.4, Sprint 9.1 bis
# 9.3, Spezialangriff 9.4, Waffen 10.
# Port von spiel/src/kern/figur/zustaende.ts.
#
# Zeitregel (Kampf 2.1, 4.3): Der Schritt f wertet T(f−1) aus (Druckframe
# q = f − 1). Eine Aktion, die in f beginnt, hat uhr 1 in f. „Drücke ab X“
# heißt q ≥ X; die Schwellen stehen in figur.druecke_ab, figur.richtung_ab
# und (nur Tiefe) figur.tiefe_ab. Endet eine Aktion in X mit STAND, nimmt
# die Figur Drücke ab X an (T(X) wirkt in X+1).
class_name KernFigurZustaende
extends RefCounted

## Unterphase der Kettenstufe bzw. des Kniestoßes 1 bis 4 (Kampf 11.3).
const STUFEN_PHASE: Array[String] = ["1", "2", "3", "4"]

## Nachlauf ohne Treffer je Stufe 1 bis 4 (Kampf 4.3, K1, K2, K3): Dauer der Aktion, A und S ab, Richtung ab (Abstand zu P bzw. D).
const LEER_DAUER: Array[int] = [KernWerte.LEERSCHLAG_DAUER, KernWerte.KETTE2_LEER_DAUER, KernWerte.KETTE3_LEER_DAUER, KernWerte.KETTE4_DAUER]
const LEER_DRUECKE_AB: Array[int] = [KernWerte.LEERSCHLAG_DRUECKE_AB, KernWerte.KETTE2_LEER_DRUECKE_AB, KernWerte.KETTE3_LEER_DRUECKE_AB, KernWerte.FRAME_NIE]
const LEER_RICHTUNG_AB: Array[int] = [KernWerte.LEERSCHLAG_RICHTUNG_AB, KernWerte.KETTE2_LEER_RICHTUNG_AB, KernWerte.KETTE3_LEER_RICHTUNG_AB, KernWerte.FRAME_NIE]


static func stufenPhase(n: int) -> String:
	# STUFEN_PHASE[n - 1] ?? '' (JavaScript: ungültiger Index gibt undefined)
	if n - 1 < 0 or n - 1 >= STUFEN_PHASE.size():
		return ""
	return STUFEN_PHASE[n - 1]


## Taste der Blickrichtung.
static func blickTaste(blick: int) -> int:
	return KernTasten.TASTE_R if blick == 1 else KernTasten.TASTE_L


# ===========================================================================
# KS1: Doppeltipp-Erkennung (Kampf 9.1, P22)
# ===========================================================================

## Schreibt die Tipp-Erkennung mit der Richtungsmenge d aus T(f−1) fort. Ein
## Tipp ist eine ununterbrochene Folge derselben Richtungsmenge mit L oder R;
## Pause heißt keine Richtung. Gibt true zurück, wenn in diesem Druckframe D2
## ein Tipp beginnt, der dem vorigen gleicht, der vorige 1 bis 10 Frames
## dauerte und dazwischen 1 bis 10 Frames ohne Richtung lagen.
static func tippFortschreiben(tipp: KernEntitaeten.Tipp, d: int) -> bool:
	if KernTasten.hat(d, KernTasten.TASTE_L | KernTasten.TASTE_R):
		if d == tipp.lauf:
			tipp.lauf_dauer += 1
			return false
		if tipp.lauf != 0:
			tipp.voriger = tipp.lauf
			tipp.voriger_dauer = tipp.lauf_dauer
			tipp.pause_dauer = 0
		var doppel: bool = (
			d == tipp.voriger
			and tipp.voriger_dauer >= 1
			and tipp.voriger_dauer <= KernWerte.SPRINT_TIPP_MAX
			and tipp.pause_dauer >= 1
			and tipp.pause_dauer <= KernWerte.SPRINT_PAUSE_MAX
		)
		tipp.lauf = d
		tipp.lauf_dauer = 1
		return doppel
	if tipp.lauf != 0:
		tipp.voriger = tipp.lauf
		tipp.voriger_dauer = tipp.lauf_dauer
		tipp.lauf = 0
		tipp.lauf_dauer = 0
		tipp.pause_dauer = 0
	if d == 0:
		tipp.pause_dauer += 1
	else:
		# nur O oder U: keine Pause, der vorige Tipp zählt nicht mehr (P22)
		tipp.pause_dauer = 0
		tipp.voriger = 0
		tipp.voriger_dauer = 0
	return false


## KS1 (Kampf 2.2): Sprint-Erkennung mit T(f−1) fortschreiben.
static func figurKs1(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var e: KernFigurIntern.Eingang = KernFigurIntern.eingang(welt)
	if tippFortschreiben(f.tipp, KernTasten.richtungsteil(e.t)):
		f.tipp.erkannt = welt.frame


# ===========================================================================
# 4.2 Vorrang der Drücke
# ===========================================================================

## Wahl des Vorrangs (TypeScript: Schnittstelle Wahl). ziel ist eine von
## 'SPEZIAL', 'SPRINTANGRIFF', 'AUFNEHMEN', 'WAFFE', 'SCHLAG', 'SPRUNG',
## 'SPRINTSPRUNG', 'SPRINT', 'LAUF'.
class Wahl:
	var ziel: String = ""
	var gegenstand: KernEntitaeten.Objekt = null


static func _wahlNeu(ziel: String, gegenstand: KernEntitaeten.Objekt) -> Wahl:
	var w: Wahl = Wahl.new()
	w.ziel = ziel
	w.gegenstand = gegenstand
	return w


## Vorrang der Drücke (Kampf 4.2) auf den angenommenen Drücken. frei: Figur in
## STAND, LAUF oder SPRINT; im Nachlauf anderer Aktionen (frei = false) gibt
## es keinen Spezialangriff, kein Aufnehmen und keinen Sprint (9.1, 9.4, 10.1),
## A gibt dort den Schlag bzw. die nächste Kettenstufe (5.6).
static func vorrang(welt: KernWelt, ein: KernFigurIntern.Angenommen, frei: bool) -> Wahl:
	var f: KernEntitaeten.Figur = welt.figur
	var imSprint: bool = f.aktion == "SPRINT"
	var amBoden: bool = (f.aktion == "STAND" or f.aktion == "LAUF") and f.h == 0
	if frei and ein.a and ein.s and f.lp > 0:
		return _wahlNeu("SPEZIAL", null)
	if ein.a and imSprint:
		return _wahlNeu("SPRINTANGRIFF", null)
	if frei and ein.a and amBoden:
		var o: KernEntitaeten.Objekt = KernFigurWaffen.gegenstandSuchen(welt)
		if o != null:
			return _wahlNeu("AUFNEHMEN", o)
	if ein.a and f.waffe != "":
		return _wahlNeu("WAFFE", null)
	if ein.a:
		return _wahlNeu("SCHLAG", null)
	if ein.s:
		return _wahlNeu("SPRINTSPRUNG" if imSprint else "SPRUNG", null)
	if frei and amBoden and f.tipp.erkannt == welt.frame and KernFigurIntern.hatRichtung(ein.richtung):
		return _wahlNeu("SPRINT", null)
	if KernFigurIntern.hatRichtung(ein.richtung):
		return _wahlNeu("LAUF", null)
	return null


## Führt die gewählte Aktion aus (Beginn in diesem Frame).
static func starten(welt: KernWelt, w: Wahl, ein: KernFigurIntern.Angenommen) -> void:
	match w.ziel:
		"SPEZIAL":
			spezialBeginnen(welt)
			return
		"SPRINTANGRIFF":
			sprintangriffBeginnen(welt, ein)
			return
		"AUFNEHMEN":
			if w.gegenstand != null:
				aufnehmenBeginnen(welt, w.gegenstand)
			return
		"WAFFE":
			waffeBeginnen(welt)
			return
		"SCHLAG":
			schlagBeginnen(welt, kettenStufe(welt, ein.q), ein)
			return
		"SPRUNG":
			KernFigurBasis.sprungBeginnen(welt, false, ein.t)
			return
		"SPRINTSPRUNG":
			KernFigurBasis.sprungBeginnen(welt, true, ein.t)
			return
		"SPRINT":
			sprintBeginnen(welt, ein)
			return
		"LAUF":
			laufen(welt, ein.richtung)
			return


# ===========================================================================
# STAND, LAUF, SPRINT (Kampf 4.3, 9.1, 9.2)
# ===========================================================================

## LAUF (Kampf 4.3): x 1,75, Tiefe 1,0, diagonal 1,25 und 0,75; Blick mit L oder R im ersten Bewegungsframe (4.1).
static func laufen(welt: KernWelt, richtung: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var rx: int = KernTasten.richtungX(richtung)
	var rz: int = KernTasten.richtungZ(richtung)
	if f.aktion != "LAUF":
		KernFigurBasis.aktionSetzen(welt, "LAUF")
	else:
		f.uhr += 1
	if rx != 0:
		f.blick = rx
	var vx: int = 0
	var vz: int = 0
	if rx != 0 and rz != 0:
		vx = KernWerte.LAUF_DIAGONAL_X
		vz = KernWerte.LAUF_DIAGONAL_Z
	elif rx != 0:
		vx = KernWerte.LAUF_X
	else:
		vz = KernWerte.LAUF_Z
	KernFigurBasis.bewegen(welt, KernFestkomma.mulGanz(vx, rx), KernFestkomma.mulGanz(vz, rz))


## Bewegung im Sprintframe n (Kampf 9.2): n = 1 wie Gehen, ab 2 v(n) =
## 3,875 − 0,125·⌊(n − 1)/6⌋; diagonal 0,75·v und 29/64·v (P23, ohne den
## Fehler des Vorbilds). sprint_tempo = x-Tempo dieses Frames (9.3).
static func sprintBewegen(welt: KernWelt, rz: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var n: int = f.sprint_n
	var vx: int
	var vz: int = 0
	if n <= 1:
		vx = KernWerte.SPRINT_DIAGONAL_X_FRAME1 if rz != 0 else KernWerte.SPRINT_X_FRAME1
		if rz != 0:
			vz = KernWerte.SPRINT_DIAGONAL_Z_FRAME1
	else:
		var v: int = KernFestkomma.sub(KernWerte.SPRINT_V_START, KernFestkomma.mulGanz(KernWerte.SPRINT_V_STUFE, KernFestkomma.divGanz(n - 1, KernWerte.SPRINT_STUFE_FRAMES)))
		if rz != 0:
			vx = KernFestkomma.mul(v, KernWerte.SPRINT_FAKTOR_DIAGONAL_X)
			vz = KernFestkomma.mul(v, KernWerte.SPRINT_FAKTOR_DIAGONAL_Z)
		else:
			vx = v
	f.sprint_tempo = vx
	KernFigurBasis.bewegen(welt, KernFestkomma.mulGanz(vx, f.blick), KernFestkomma.mulGanz(vz, rz))


## SPRINT ab D2+1 (Kampf 9.1, 9.2): Sprintframe 1, Blick = Sprintrichtung, Ereignis SP:F:1.
static func sprintBeginnen(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "SPRINT")
	f.sprint_n = 1
	f.sprint_richtung = KernTasten.richtungsteil(ein.richtung)
	var rx: int = KernTasten.richtungX(ein.richtung)
	if rx != 0:
		f.blick = rx
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["SPRINT"], "F", f.sprint_n])
	sprintBewegen(welt, KernTasten.richtungZ(ein.richtung))


## Sprint fortsetzen (Kampf 9.2): solange die Sprintrichtung in T(f−1) liegt,
## höchstens 90 Sprintframes; O oder U dazu diagonal. Sonst (losgelassen, nur
## noch O oder U, Gegenrichtung, nach 90 Frames) 1 Frame STAND ohne Bewegung.
static func sprintFortsetzen(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.sprint_n >= KernWerte.SPRINT_MAX_FRAMES or KernTasten.richtungX(ein.richtung) != f.blick:
		KernFigurBasis.standBeginnen(welt)
		return
	f.sprint_n += 1
	f.uhr += 1
	sprintBewegen(welt, KernTasten.richtungZ(ein.richtung))


## STAND, LAUF und SPRINT: Drücke nach 4.2.
static func freiSchritt(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var w: Wahl = vorrang(welt, ein, true)
	if w != null and w.ziel != "LAUF":
		starten(welt, w, ein)
		return
	if f.aktion == "SPRINT":
		sprintFortsetzen(welt, ein)
		return
	if w != null:
		laufen(welt, ein.richtung)
		return
	if f.aktion != "STAND":
		KernFigurBasis.standBeginnen(welt)
	else:
		f.uhr += 1


# ===========================================================================
# SPRUNG, SPRUNGANGRIFF, SPRINTSPRUNG, LANDUNG (Kampf 4.3, 4.4, 5.2, 9.3)
# ===========================================================================

## Ein Bahnschritt des Sprungs (Kampf 4.4): h += vh, danach vh −= 0,25; x ±2,25
## nach T(J) (im Aufsetzframe noch einmal), Tiefe ±0,5 je Luftframe nach
## T(f−1); wird h ≤ 0, ist h = 0 und die Landung beginnt (Welt 2.2 Punkt 3).
static func sprungBahn(welt: KernWelt, t: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var hNeu: int = KernFestkomma.add(f.h, f.vh)
	f.vh = KernFestkomma.sub(f.vh, KernWerte.SPRUNG_SCHWERKRAFT)
	var dx: int = KernFestkomma.mulGanz(KernWerte.SPRUNG_X, f.sprung_dx)
	if hNeu <= 0:
		f.h = 0
		KernFigurBasis.bewegen(welt, dx, 0)
		KernFigurBasis.aufsetzen(welt)
		KernFigurBasis.aktionSetzen(welt, "LANDUNG")
		return
	f.h = hNeu
	KernFigurBasis.bewegen(welt, dx, KernFestkomma.mulGanz(KernWerte.SPRUNG_Z, KernTasten.richtungZ(t)))


## Sprungangriff ab A+1 (Kampf 4.3, 5.2): Variante runter (T(A) mit U), sonst
## Richtung (T(J) mit L oder R), sonst hoch (T(J) mit O, P10), sonst neutral;
## die Höhe steht in A+1 einen Frame still.
static func sprungangriffBeginnen(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var v: String = "N"
	if KernTasten.richtungZ(ein.t) == -1:
		v = "T"
	elif KernTasten.richtungX(f.sprung_tasten) != 0:
		v = "R"
	elif KernTasten.richtungZ(f.sprung_tasten) == 1:
		v = "H"
	KernFigurBasis.aktionSetzen(welt, "SPRUNGANGRIFF", v)
	f.sprung_angriff = true
	f.sprung_variante = v
	f.p = ein.q
	f.angriff_a = ein.q
	f.angriff = KernFigurAngriffe.sprungangriffInstanz(v, ein.q)


## Sprint-Sprungangriff ab A+1 (Kampf 9.3, E15): Figur bleibt in SPRINTSPRUNG (f_ph SS), keine Höhenpause.
static func ssBeginnen(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.phase = "SS"
	f.angriff = KernFigurAngriffe.ssInstanz(ein.q)
	f.angriff_a = ein.q
	f.ss_n = 1
	f.sprung_angriff = true


## SPRUNG, SPRINTSPRUNG, SPRUNGANGRIFF: A ab J+1 gibt den Angriff (einmal je Sprung), sonst Bahn.
static func luftSchritt(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if not f.sprung_angriff and ein.a:
		if f.aktion == "SPRUNG":
			sprungangriffBeginnen(welt, ein)
			return
		if f.aktion == "SPRINTSPRUNG":
			ssBeginnen(welt, ein)
	if f.aktion == "SPRUNGANGRIFF" and f.sprung_variante == "H" and f.uhr > KernWerte.SPRUNGANGRIFF_HOCH_AKTION_BIS:
		KernFigurBasis.aktionSetzen(welt, "SPRUNG")
	sprungBahn(welt, ein.t)


## LANDUNG (Kampf 4.3): 6 Frames ab dem Aufsetzen; S neu (auch mit A) in
## Landeframe 1 bis 5 gibt einen neuen Sprung ab Druck+1 (P2), alle anderen
## Drücke verfallen; STAND und Drücke ab Landeframe 7.
static func landungSchritt(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if KernTasten.hat(ein.neu, KernTasten.TASTE_S) and f.uhr <= KernWerte.LANDUNG_NEUSPRUNG_BIS + 1:
		KernFigurBasis.sprungBeginnen(welt, false, ein.t)
		return
	if f.uhr > KernWerte.LANDUNG_DAUER:
		KernFigurBasis.standBeginnen(welt)


# ===========================================================================
# SCHLAG, LEERSCHLAG (Kampf 4.3, 5.2, 5.6)
# ===========================================================================

## Stufe eines neuen Kettenschlags (Kampf 5.6): nächste Stufe, wenn die
## laufende Stufe k getroffen hat und q im Kombofenster liegt (Stufe 2: h+12
## bis h+27, Stufe 3 und 4: h+11 bis h+26); sonst neue Kette mit Stufe 1.
static func kettenStufe(welt: KernWelt, q: int) -> int:
	var f: KernEntitaeten.Figur = welt.figur
	var k: int = f.kombo
	if f.aktion != "SCHLAG" or f.treffer_h == 0 or k < 1 or k >= KernWerte.KOMBO_MAX or f.ausfallschritt < 0:
		return 1
	var h: int = f.kombo_h
	if q >= h + KernFigurAngriffe.tab(KernWerte.KOMBO_FENSTER_VON, k) and q <= h + KernFigurAngriffe.tab(KernWerte.KOMBO_FENSTER_BIS, k):
		return k + 1
	return 1


## Nachlauf ohne Treffer (Kampf 4.3, K1, K2; P29): Stufe 1 wird LEERSCHLAG;
## Drücke nach der Tabelle der Stufe, frühestens ab dem Frame nach dem letzten
## aktiven Frame (Ausfallschritt); Stufe 4 nimmt bis zum Ende nichts an.
static func leerSetzen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.leerschlag = true
	var k: int = f.kombo - 1
	if k == 0:
		f.aktion = "LEERSCHLAG"
	var druecke: int = maxi(f.p + KernFigurAngriffe.tab(LEER_DRUECKE_AB, k), welt.frame)
	var richtung: int = maxi(f.p + KernFigurAngriffe.tab(LEER_RICHTUNG_AB, k), welt.frame)
	KernFigurIntern.schwellenSetzen(f, druecke, richtung, richtung)


## Dauer der Aktion ohne Treffer je Stufe (Kampf 4.3): 16, 16, 17, 25.
static func leerDauer(stufe: int) -> int:
	return KernFigurAngriffe.tab(LEER_DAUER, stufe - 1)


## Ausfallschritt bzw. Schritt weg in D+1 bis D+4: 8, 6, 4, 2 px in Blickrichtung (Kampf 5.6).
static func ausfallBewegen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	if f.ausfallschritt == 0 or f.uhr > KernWerte.AUSFALLSCHRITT.size():
		return
	KernFigurBasis.bewegen(welt, KernFestkomma.mulGanz(KernFestkomma.ausGanz(KernFigurAngriffe.tab(KernWerte.AUSFALLSCHRITT, f.uhr - 1)), f.blick), 0)


## SCHLAG der Stufe k ab P+1 bzw. D+1 (Kampf 4.3, 5.6): Ereignis KE:F:k. Ab
## Stufe 2 mit Blickrichtung in T(D) Ausfallschritt (aktiv später), mit
## Gegenrichtung Umdrehen und Schritt weg ohne aktive Frames, Kette abgebrochen.
static func schlagBeginnen(welt: KernWelt, stufe: int, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "SCHLAG", stufenPhase(stufe))
	f.kombo = stufe
	f.p = ein.q
	f.p_tasten = ein.t
	var ausfall: int = 0
	if stufe > 1:
		var rx: int = KernTasten.richtungX(ein.t)
		if rx == f.blick:
			ausfall = 1
		elif rx != 0:
			ausfall = -1
			f.blick = rx
	f.ausfallschritt = ausfall
	f.leerschlag = false
	f.stand_ab = KernWerte.FRAME_NIE
	if ausfall < 0:
		f.angriff = null
	else:
		f.angriff = KernFigurAngriffe.ketteInstanz(stufe, ein.q)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["KETTE"], "F", stufe])
	if ausfall < 0:
		leerSetzen(welt)
	ausfallBewegen(welt)


## SCHLAG und LEERSCHLAG: Drücke nach den Schwellen der Stufe, Ende nach Treffer oder Leerschlag (Kampf 4.3).
static func schlagSchritt(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	var w: Wahl = vorrang(welt, ein, false)
	if w != null:
		starten(welt, w, ein)
		return
	ausfallBewegen(welt)
	var letzter: int
	if f.kombo == KernWerte.KOMBO_MAX:
		letzter = KernWerte.KETTE4_ZWEITES_FENSTER_BIS
	else:
		letzter = KernFigurAngriffe.ketteFenster(f.kombo, f.ausfallschritt)["bis"]
	if f.treffer_h == 0 and not f.leerschlag and f.uhr > letzter:
		leerSetzen(welt)
	if f.kombo == KernWerte.KOMBO_MAX:
		if f.uhr > KernWerte.KETTE4_DAUER:
			KernFigurBasis.standBeginnen(welt)
		return
	if f.treffer_h > 0:
		if welt.frame >= f.stand_ab:
			KernFigurBasis.standBeginnen(welt)
		return
	if f.leerschlag and f.uhr > leerDauer(f.kombo):
		KernFigurBasis.standBeginnen(welt)


# ===========================================================================
# GRIFF, KNIESTOSS, WURF (Kampf 8.2 bis 8.4)
# ===========================================================================

## KNIESTOSS ab K+1 (Kampf 8.3): Treffer K+5, Haltefrist neu bis K+60 (P21), Drücke ab K+18; der dritte wirft um.
static func knieBeginnen(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var ziel: Variant = f.griff_ziel
	if ziel == null:
		return
	var nr: int = f.knie_zahl + 1
	KernFigurBasis.aktionSetzen(welt, "KNIESTOSS", stufenPhase(nr))
	f.knie_zahl = nr
	f.p = ein.q
	var ab: int = ein.q + KernWerte.KNIESTOSS_DRUECKE_AB
	KernFigurIntern.schwellenSetzen(f, ab, ab, ab)
	f.los_frame = ein.q + KernWerte.HALTEFRIST + 1
	f.haltefrist = KernWerte.HALTEFRIST
	f.angriff = KernFigurAngriffe.knieInstanz(ziel as String, nr == KernWerte.KNIESTOSS_UMWERFEN_NR, ein.q)


## WURF ab E+1 (Kampf 8.4): Treffer WU in E+1 (14 LP, Bahn F3 in
## Wurfrichtung), Figur gebunden bis E+37; Wurfgeschoss WG E+1 bis E+58
## (8.5); Ereignis WU:F>sn:V oder R.
static func wurfBeginnen(welt: KernWelt, ein: KernFigurIntern.Angenommen, r: String) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var ziel: Variant = f.griff_ziel
	if ziel == null:
		return
	KernFigurBasis.aktionSetzen(welt, "WURF", r)
	var richtung: int
	if r == "V":
		richtung = f.blick
	else:
		richtung = -1 if f.blick == 1 else 1
	f.p = ein.q
	f.wurf_e = ein.q
	f.wurf_ziel = ziel
	f.wurf_richtung = r
	f.bahn_richtung = richtung
	f.angriff = KernFigurAngriffe.wurfInstanz(ziel as String, ein.q)
	var wg: KernEntitaeten.Wurfgeschoss = KernEntitaeten.Wurfgeschoss.new()
	wg.ziel = ziel as String
	wg.e = ein.q
	wg.richtung = richtung
	wg.inst = KernFigurAngriffe.wgInstanz(ziel as String, ein.q)
	f.wuerfe.append(wg)
	KernEreignisse.ereignis(welt, [KernEreignisse.EREIGNIS["WURF"], KernEreignisse.pfeil("f", ziel as String), r])


## Drücke im Griff (Kampf 8.2): A und S → Spezialangriff; A ohne Richtung (oder
## L und R) → Kniestoß; A mit Richtung → Wurf vorwärts, wenn sie die
## Blickrichtung enthält, sonst rückwärts (Richtung aus T(E)); S allein →
## Gegner frei, Sprung. Gibt true zurück, wenn eine Aktion begonnen hat.
static func griffEingabe(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> bool:
	var f: KernEntitaeten.Figur = welt.figur
	if ein.a and ein.s and f.lp > 0:
		spezialBeginnen(welt)
		return true
	if ein.a:
		var rx: int = KernTasten.richtungX(ein.t)
		var rz: int = KernTasten.richtungZ(ein.t)
		if rx == 0 and rz == 0:
			knieBeginnen(welt, ein)
		else:
			wurfBeginnen(welt, ein, "V" if rx == f.blick else "R")
		return true
	if ein.s:
		KernFigurGriff.griffLoesen(welt)
		KernFigurBasis.sprungBeginnen(welt, false, ein.t)
		return true
	return false


## GRIFF (Kampf 4.3, 8.3): Drücke ab g+1 bzw. K+18; ohne Eingabe Losreißen in g+61 bzw. K+61, Griffsperre 30.
static func griffSchritt(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if KernFigurGriff.gehaltener(welt) == null:
		KernFigurGriff.griffBeenden(welt)
		KernFigurBasis.standBeginnen(welt)
		return
	if griffEingabe(welt, ein):
		return
	if welt.frame >= f.los_frame:
		KernFigurGriff.griffLoesen(welt)
		KernFigurBasis.standBeginnen(welt)
		f.griffsperre = KernWerte.GRIFFSPERRE
		return
	f.haltefrist = maxi(f.los_frame - 1 - welt.frame, 0)


## KNIESTOSS (Kampf 4.3): gehalten ab K+23 (GRIFF); nach dem dritten bzw. ohne Gehaltenen STAND ab K+23, Drücke ab K+18 (P21).
static func knieSchritt(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if KernFigurGriff.gehaltener(welt) != null:
		if griffEingabe(welt, ein):
			return
		if f.uhr >= KernWerte.KNIESTOSS_GEHALTEN_AB:
			var ab: int = f.druecke_ab
			KernFigurBasis.aktionSetzen(welt, "GRIFF")
			f.druecke_ab = ab
		return
	if f.griff_ziel != null:
		KernFigurGriff.griffBeenden(welt)
	var w: Wahl = vorrang(welt, ein, false)
	if w != null:
		starten(welt, w, ein)
		return
	if f.uhr >= KernWerte.KNIESTOSS_GEHALTEN_AB:
		KernFigurBasis.standBeginnen(welt)


## WURF: gebunden E+1 bis E+37, STAND ab E+38 (Kampf 4.3, 8.4).
static func wurfSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if f.uhr > KernWerte.WURF_GEBUNDEN_BIS:
		KernFigurBasis.standBeginnen(welt)


# ===========================================================================
# SPEZIAL, SPRINTANGRIFF, GETROFFEN, WAFFE, AUFNEHMEN
# ===========================================================================

## SPEZIAL ab P+1 (Kampf 9.4): keine Bewegung, zustand 3; aus dem Griff bleibt der Gehaltene in der Haltelage.
static func spezialBeginnen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var q: int = welt.frame - 1
	KernFigurBasis.aktionSetzen(welt, "SPEZIAL")
	f.p = q
	f.spezial_stufen = 0
	f.kosten_frame = 0
	f.angriff = KernFigurAngriffe.spezialInstanz(q)


## SPEZIAL: uhr 1 bis 50 (je Stufe mit Treffer 7 Stoppframes mehr), danach STAND mit schutz 20 (Kampf 6.3, 9.4).
static func spezialSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if f.uhr <= KernWerte.SPEZIAL_DAUER:
		return
	if f.griff_ziel != null:
		KernFigurGriff.griffLoesen(welt)
	KernFigurBasis.standBeginnen(welt)
	f.schutz = KernWerte.SPEZIAL_SCHUTZ_DANACH


## SPRINTANGRIFF ab A+1 (Kampf 9.3): in A+1 steht die Figur; lag die
## Sprintrichtung auch in T(A), rutscht sie ab A+2 mit dem Tempo des
## Sprintframes A, je Frame 0,15625 weniger, solange es über 0 liegt (P24).
static func sprintangriffBeginnen(welt: KernWelt, ein: KernFigurIntern.Angenommen) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var tempo: int = f.sprint_tempo
	var rutschen: bool = KernTasten.hat(ein.t, blickTaste(f.blick))
	KernFigurBasis.aktionSetzen(welt, "SPRINTANGRIFF")
	f.p = ein.q
	f.angriff_a = ein.q
	f.rutsch_v = tempo if rutschen else 0
	f.angriff = KernFigurAngriffe.sprintangriffInstanz(ein.q)


## SPRINTANGRIFF: uhr 1 bis 35 (je Frame mit Treffer 7 mehr), Rutschen nur in x, nicht in Stoppframes.
static func sprintangriffSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if f.uhr > KernWerte.SPRINTANGRIFF_DAUER:
		KernFigurBasis.standBeginnen(welt)
		return
	if f.uhr >= KernWerte.SPRINTANGRIFF_RUTSCHEN_AB and f.rutsch_v > 0:
		KernFigurBasis.bewegen(welt, KernFestkomma.mulGanz(f.rutsch_v, f.blick), 0)
		f.rutsch_v = KernFestkomma.sub(f.rutsch_v, KernWerte.SPRINTANGRIFF_RUTSCH_ABNAHME)


## GETROFFEN H bis H+26 (Kampf 4.3, P3): nur A und S neu ab Druckframe H+8 geben den Spezialangriff; STAND in H+27.
static func getroffenSchritt(welt: KernWelt, e: KernFigurIntern.Eingang) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if KernTasten.hat(e.neu, KernTasten.TASTE_A) and KernTasten.hat(e.neu, KernTasten.TASTE_S) and e.q >= f.getroffen_h + KernWerte.SPEZIAL_AUS_GETROFFEN_AB and f.lp > 0:
		spezialBeginnen(welt)
		return
	if f.uhr > KernWerte.GETROFFEN_DAUER:
		KernFigurBasis.standBeginnen(welt)


## WAFFE ab P+1 (Kampf 10.3, P5): Abschuss in P+7, STAND und Drücke ab P+18; leere Waffe in P+18 weggeworfen.
static func waffeBeginnen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "WAFFE")
	f.p = welt.frame - 1


static func waffeSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if f.uhr == KernWerte.RAKETE_ABSCHUSS:
		KernFigurWaffen.raketeAbschiessen(welt)
	if f.uhr > KernWerte.WAFFE_DAUER:
		KernFigurBasis.standBeginnen(welt)
		if f.waffe != "" and f.munition <= 0:
			KernFigurWaffen.waffeWegwerfen(welt)


## AUFNEHMEN ab P+1 (Kampf 10.1): Wirkung in P+1, Aktion bis P+7, Drücke ab P+8.
static func aufnehmenBeginnen(welt: KernWelt, o: KernEntitaeten.Objekt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernFigurBasis.aktionSetzen(welt, "AUFNEHMEN")
	f.p = welt.frame - 1
	f.aufnehmen_ziel = o.schluessel
	KernFigurWaffen.aufnehmenWirkung(welt, o)


static func aufnehmenSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	f.uhr += 1
	if f.uhr > KernWerte.AUFNEHMEN_DAUER:
		f.aufnehmen_ziel = null
		KernFigurBasis.standBeginnen(welt)


# ===========================================================================
# KS2
# ===========================================================================

## Zustandsübergang und Bewegung eines Frames ohne Stopp (Kampf 4.3).
static func aktionSchritt(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var e: KernFigurIntern.Eingang = KernFigurIntern.eingang(welt)
	var ein: KernFigurIntern.Angenommen = KernFigurIntern.angenommen(f, e)
	match f.aktion:
		"STAND", "LAUF", "SPRINT":
			freiSchritt(welt, ein)
			return
		"SPRUNG", "SPRINTSPRUNG", "SPRUNGANGRIFF":
			luftSchritt(welt, ein)
			return
		"LANDUNG":
			landungSchritt(welt, ein)
			return
		"SCHLAG", "LEERSCHLAG":
			schlagSchritt(welt, ein)
			return
		"GRIFF":
			griffSchritt(welt, ein)
			return
		"KNIESTOSS":
			knieSchritt(welt, ein)
			return
		"WURF":
			wurfSchritt(welt)
			return
		"SPEZIAL":
			spezialSchritt(welt)
			return
		"SPRINTANGRIFF":
			sprintangriffSchritt(welt)
			return
		"GETROFFEN":
			getroffenSchritt(welt, e)
			return
		"UMGEWORFEN", "LIEGEN", "AUFSTEHEN":
			KernSchaden.bodenSchritt(welt)
			return
		"TOT":
			KernSchaden.todSchritt(welt)
			return
		"WAFFE":
			waffeSchritt(welt)
			return
		"AUFNEHMEN":
			aufnehmenSchritt(welt)
			return
		"NEUEINSTIEG":
			KernSchaden.neueinstiegSchritt(welt)
			return


## KS2 (Kampf 2.2): Timer (schutz, griffsperre), Kosten des Spezialangriffs in
## h+8, Waffe fallen lassen in H+1, Tod nach Eingriff; dann Stoppframe (uhr,
## Bewegung und Instanz stehen, Kampf 5.3) oder Zustandsübergang mit
## Bewegung; zuletzt aktive Frames der Instanz und zustand.
static func figurKs2(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	KernSchaden.schutzZaehlen(welt)
	if f.griffsperre > 0:
		f.griffsperre -= 1
	KernSchaden.kostenSchritt(welt)
	if f.waffe_fallen_frame != 0 and f.waffe_fallen_frame == welt.frame:
		KernFigurWaffen.waffeFallen(welt)
	var stoppframe: bool = false
	if f.lp < 0 and f.lp_vor >= 0 and f.aktion != "TOT":
		KernSchaden.eingriffTodPruefen(welt)
	elif f.stopp > 0:
		f.stopp -= 1
		stoppframe = true
	else:
		if f.angriff != null and f.angriff.code == "SS":
			f.ss_n += 1
		aktionSchritt(welt)
		if f.angriff != null and f.angriff.code == "SS" and f.ss_n > KernWerte.SS_ZWEITER_AKTIV_BIS:
			f.angriff = null
			f.ss_n = 0
	KernFigurAngriffe.angriffAktivSetzen(welt, stoppframe)
	KernSchaden.figurZustandSetzen(welt)


# ===========================================================================
# KS7, Urheberseite
# ===========================================================================

## KS7, Urheberhandler (Kampf 5.3, 5.6, 6.4, 8): für jeden wirksamen Treffer
## mit urheber 'f'. Griff endet mit Wurf, Spezialangriff, Umwerfen oder Tod
## des Gehaltenen. Für die laufende Instanz der Figur: Trefferstopp 7 einmal
## je Frame (Kette, Sprungangriff, Sprintangriff; SS nur in A+13; SP einmal
## je Flächenstufe; nicht KN, WU, LN), Kette fortschreiben (kombo_h, Schwellen
## der Pose), Kosten des Spezialangriffs in h+8 vormerken.
static func figurUrheberTreffer(welt: KernWelt, t: KernEntitaeten.Treffer) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var jetzt: int = welt.frame
	if f.griff_ziel != null and t.ziel == f.griff_ziel:
		if t.code == "WU" or t.code == "SP" or t.wirkung == "X" or t.wirkung == "U":
			KernFigurGriff.griffBeenden(welt)
	if t.instanz != f.angriff:
		return
	# treffer_h ist bis hierhin nur in diesem Handler gesetzt worden: ungleich
	# jetzt heißt erster wirksamer Treffer dieser Aktion in diesem Frame
	if f.treffer_h != jetzt:
		f.treffer_frames += 1
	f.treffer_h = jetzt
	match t.code:
		"KT1", "KT2", "KT3", "KT4":
			f.kombo_h = jetzt
			if f.kombo == 1:
				KernFigurIntern.schwellenSetzen(f, jetzt + KernWerte.KETTE1_DRUECKE_AB, jetzt + KernWerte.KETTE1_RICHTUNG_AB, jetzt + KernWerte.KETTE1_TIEFE_BEWEGUNG_AB - 1)
				f.stand_ab = jetzt + KernWerte.KETTE1_STAND_AB
			elif f.kombo < KernWerte.KOMBO_MAX:
				KernFigurIntern.schwellenSetzen(f, jetzt + KernWerte.KETTE23_DRUECKE_AB, jetzt + KernWerte.KETTE23_RICHTUNG_AB, jetzt + KernWerte.KETTE23_TIEFE_BEWEGUNG_AB - 1)
				f.stand_ab = jetzt + KernWerte.KETTE23_STAND_AB
			f.stopp = KernWerte.TREFFERSTOPP
			return
		"SN", "SR", "SH", "ST", "SA":
			f.stopp = KernWerte.TREFFERSTOPP
			return
		"SS":
			if f.ss_n == KernWerte.SS_ERSTER_AKTIV:
				f.stopp = KernWerte.TREFFERSTOPP
			return
		"SP":
			var k: int = KernFigurAngriffe.spezialStufe(f.uhr)
			if k < 0:
				return
			if f.spezial_stufen == 0:
				f.kosten_frame = jetzt + KernWerte.SPEZIAL_KOSTEN_NACH
			var bit: int = 1 << k
			if (f.spezial_stufen & bit) == 0:
				f.spezial_stufen |= bit
				f.stopp = KernWerte.TREFFERSTOPP
			return
		_:
			return
