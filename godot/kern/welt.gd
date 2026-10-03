# Welt und Logikschritt der Scheibe nach docs/spezifikation-kampf.md, 2.2
# (KS1 bis KS7) und docs/spezifikation-welt.md, 1 „Ablauf eines Frames“
# (W1 bis W8).
# Port von spiel/src/kern/welt.ts. Der Vertrag für die Module (Abschnitt 1 bis
# 9 im Kopf von welt.ts) gilt unverändert; die Reihenfolge der Aufrufe in
# logikSchritt ist dieselbe wie in der TypeScript-Fassung.
#
# Die Welt erfüllt die Schnittstelle SlotTabelle: figur, gegner, objekte,
# geschosse. Aller Zustand eines Laufs steht in der Welt (keine statischen
# Variablen).
class_name KernWelt
extends RefCounted

# ===========================================================================
# Zustand
# ===========================================================================

## Eingabe des laufenden Logikschritts f (Kampf 2.1).
class Eingabe:
	## T(f): zu Beginn von f abgefragt und aufgezeichnet (Spalte tasten)
	var t: int = 0
	## T(f−1): wertet der Logikschritt f aus
	var t1: int = 0
	## T(f−2): für neue Drücke in T(f−1)
	var t2: int = 0
	## neue Drücke in T(f−1), in KS1 bestimmt (Kampf 2.1)
	var neu: int = 0


## Rang (Welt 8), Spalten rang und rang_zaehler.
class RangZustand:
	var rang: int = 0
	## Rang-Uhr r
	var zaehler: int = 0
	## rang.fest: Rang-Uhr steht (Welt 11.3)
	var fest: bool = false


## Kamera (Welt 3). modus: 'FREI', 'SPERRE', 'HALT', 'BLENDE', 'ARENA', 'ENDE'.
class KameraZustand:
	## K, ganzzahlig
	var x: int = 0
	## Ky, ganzzahlig
	var y: int = 0
	var modus: String = "FREI"
	## Kamera fest (Prüfbühne, Kampf 11.2)
	var fest: bool = false
	## Bildschütteln (KA10), nur Darstellung: Spalte schuetteln „x/y“
	var schuetteln_x: int = 0
	var schuetteln_y: int = 0
	## Anlass und erster Frame des laufenden Bildschüttelns (KA10); '' = keins
	var schuetteln_art: String = ""
	var schuetteln_ab: int = 0
	## Pfeil „weiter“ (KA5), Spalte pfeil: 0 oder 1
	var pfeil: int = 0
	## Frame c der Blende (KA13), 0 = keine
	var blende_c: int = 0
	## Schnitt ausgeführt (KA3, KA13)
	var schnitt_ausgefuehrt: bool = false
	## Frame, ab dem die Totzone der Arena gilt (KA7), 0 = nicht in der Arena
	var arena_ab: int = 0
	## Frame und Kamera-x der letzten Sperrfreigabe (KA5)
	var freigabe_frame: int = 0
	var freigabe_x: int = 0


## Sperre der Stage im Lauf (Welt 3, KA4).
class SperreZustand extends KernStage.SperreSatz:
	var freigegeben: bool = false


## Halt der Stage im Lauf (Welt 3, KA6).
class HaltZustand extends KernStage.HaltSatz:
	var freigegeben: bool = false


## Eine Welle im Lauf (Welt 4.4).
class WelleZustand:
	var satz: KernStage.WelleSatz = null
	## welle.n=aus (Welt 11.3)
	var aus: bool = false
	var ausgeloest: bool = false
	## Frame der Auslösung, 0 = noch nicht
	var frame: int = 0


## Vorgemerkter neuer Gegner (Welt 4.4: Anlegen in W3 von f + 1 + verzoegerung).
class Vormerkung:
	## Frame, in dessen W3 der Gegner angelegt wird
	var frame: int = 0
	var eintrag: KernStage.EintragSatz = null
	var bonus: int = 0


## Wellen (Welt 4).
class WellenZustand:
	## Array von WelleZustand
	var liste: Array = []
	## ausgelöste Wellen in Reihenfolge der Auslösung (Spalte wellen, z. B. 1-2-7)
	var ausgeloest: Array = []
	## Array von Vormerkung
	var vorgemerkt: Array = []
	## besiegte Wellen (KA4), von wellenPruefen gesetzt
	var besiegt: Array = []
	## welle.7=nur_boss (Welt 11.3)
	var nur_boss: bool = false


## Halter der Rechte (Welt 5.7, 6), Slotnummern oder null (Spalten recht_l, recht_r, zielrecht).
class RechteZustand:
	var l: Variant = null
	var r: Variant = null
	var ziel: Variant = null


## Rahmen (Welt 10). phase: 'SPIEL', 'TOD', 'NEUEINSTIEG', 'BLENDE', 'ENDE', 'GAMEOVER'.
class RahmenZustand:
	## Leben einschließlich des laufenden (Welt 10.3)
	var leben: int = 0
	var punkte: int = 0
	## Slot (Nummer) der Gegneranzeige (Welt 10.1), null = keine
	var anzeige: Variant = null
	## Typ (Name) und LP des angezeigten Gegners (Welt 10.1)
	var anzeige_typ: String = ""
	var anzeige_lp: int = 0
	var anzeige_lebt: bool = false
	var phase: String = "SPIEL"
	## 1 wertet Eingaben aus, 0 nicht (Welt 11.4)
	var steuerung: int = 1
	## Frame t des Bossfalls (Welt 10.5), 0 = noch nicht
	var boss_t: int = 0
	## Frame des Game Over, 0 = keins
	var gameover_frame: int = 0


## Stand vom Ende des Vorframes (Welt 1: Sperren, Halte, Weckreiz lesen ihn).
class Vorframe:
	var lebende: int = 0
	var kamera_x: int = 0
	var kamera_y: int = 0
	var kamera_modus: String = "FREI"
	var besiegt: Array = []
	## ganzzahlige Lage der Figur
	var figur_x: int = 0
	var figur_z: int = 0


## Nummer des laufenden bzw. zuletzt gelaufenen Logikschritts; 0 vor dem ersten.
var frame: int = 0
var stage: KernStage.Stage = null
var start: KernStart.Pruefstart = null
var eingabe: Eingabe = Eingabe.new()
## Hauptgenerator (Welt 11.1), Spalte zufall_haupt = zufall.ziehungen
var zufall: KernZufall.Zufall = null
## fest.<entscheidung>=wert (Welt 11.3), Dictionary String → String
var fest: Dictionary = {}
var rang: RangZustand = RangZustand.new()
var kamera: KameraZustand = KameraZustand.new()
## Array von SperreZustand
var sperren: Array = []
## Array von HaltZustand
var halte: Array = []
var wellen: WellenZustand = WellenZustand.new()
var rechte: RechteZustand = RechteZustand.new()
var rahmen: RahmenZustand = RahmenZustand.new()
## lebende Gegner (Welt 4.3), Spalte lebende
var lebende: int = 0
## Treffer dieses Frames (KS6, KS7): Array von KernEntitaeten.Treffer
var treffer: Array = []
## Ereignisse dieses Frames (Kampf 11.4), Spalte ereignis: Array von String
var ereignisse: Array = []
## Prüfangriff i (Reihenfolge in start.pruefangriffe) ist beendet und beginnt nicht neu (Kampf 11.2)
var pruefangriffe_beendet: Array = []
var vorframe: Vorframe = Vorframe.new()
## Ende der Scheibe erreicht (Welt 10.5): der Prüflauf hört nach dieser Zeile auf
var beendet: bool = false

# Slottabelle (Kampf 3)
var figur: KernEntitaeten.Figur = null
## s0 bis s19, Index = Slotnummer
var gegner: Array = []
## o20 bis o59, Index = Slotnummer − 20
var objekte: Array = []
## g0 bis g4, Index = Slotnummer
var geschosse: Array = []


# ===========================================================================
# Anlegen der Welt
# ===========================================================================

static func lebendeZaehlen(welt: KernWelt) -> int:
	var n: int = 0
	for g: KernEntitaeten.Gegner in welt.gegner:
		if KernEntitaeten.istLebend(g):
			n += 1
	return n


static func vorframeSetzen(welt: KernWelt) -> void:
	var v: Vorframe = Vorframe.new()
	v.lebende = welt.lebende
	v.kamera_x = welt.kamera.x
	v.kamera_y = welt.kamera.y
	v.kamera_modus = welt.kamera.modus
	v.besiegt = welt.wellen.besiegt.duplicate()
	v.figur_x = KernFestkomma.ganz(welt.figur.x)
	v.figur_z = KernFestkomma.ganz(welt.figur.z)
	welt.vorframe = v


## Legt die Welt aus Stage und Prüfstart an (Welt 2, 4.1, 11.3; Kampf 11.2).
## Danach ist frame = 0; der erste logikSchritt ist Frame 1 (Kampf 2.1).
static func erzeugeWelt(stage_daten: KernStage.Stage, start_daten: KernStart.Pruefstart) -> KernWelt:
	if start_daten.buehne != stage_daten.id:
		push_error("Prüfstart verlangt Bühne „%s“, geladen ist „%s“" % [start_daten.buehne, stage_daten.id])
	for e: KernStart.EingriffDaten in start_daten.eingriffe:
		KernEingriffe.eingriffPruefen(e)
	var slots: KernEntitaeten.SlotTabelle = KernEntitaeten.slotTabelleNeu()
	var kx: int = 0 if start_daten.kamera_x == null else start_daten.kamera_x
	var welt: KernWelt = KernWelt.new()
	welt.figur = slots.figur
	welt.gegner = slots.gegner
	welt.objekte = slots.objekte
	welt.geschosse = slots.geschosse
	welt.frame = 0
	welt.stage = stage_daten
	welt.start = start_daten
	welt.eingabe = Eingabe.new()
	welt.zufall = KernZufall.zufallNeu(start_daten.seed)
	welt.fest = start_daten.fest.duplicate()
	welt.rang = RangZustand.new()
	welt.rang.rang = KernWerte.RANG_START if start_daten.rang == null else start_daten.rang
	welt.rang.zaehler = 0
	welt.rang.fest = start_daten.rang_fest
	var k: KameraZustand = KameraZustand.new()
	k.x = kx
	k.y = KernStage.kameraY(stage_daten, kx)
	k.modus = "FREI" if start_daten.kamera_modus == null else start_daten.kamera_modus
	k.fest = stage_daten.kamera_fest
	k.arena_ab = KernWerte.ERSTER_FRAME if start_daten.kamera_modus == "ARENA" else 0
	welt.kamera = k
	for s: KernStage.SperreSatz in stage_daten.sperren:
		if start_daten.sperren_aus.has(s.id):
			continue
		var sz: SperreZustand = SperreZustand.new()
		sz.id = s.id
		sz.kamera_x = s.kamera_x
		sz.welle = s.welle
		sz.freigegeben = false
		welt.sperren.append(sz)
	for h: KernStage.HaltSatz in stage_daten.halte:
		if start_daten.halte_aus.has(h.id):
			continue
		var hz: HaltZustand = HaltZustand.new()
		hz.id = h.id
		hz.kamera_x = h.kamera_x
		hz.max_lebende = h.max_lebende
		hz.freigegeben = false
		welt.halte.append(hz)
	welt.wellen = WellenZustand.new()
	for w: KernStage.WelleSatz in stage_daten.wellen:
		var wz: WelleZustand = WelleZustand.new()
		wz.satz = w
		wz.aus = start_daten.wellen_aus.has(w.nr)
		wz.ausgeloest = false
		wz.frame = 0
		welt.wellen.liste.append(wz)
	welt.wellen.nur_boss = start_daten.welle7_nur_boss
	welt.rechte = RechteZustand.new()
	var r: RahmenZustand = RahmenZustand.new()
	r.leben = KernWerte.LEBEN_START
	r.punkte = 0
	r.anzeige = null
	r.anzeige_typ = ""
	r.anzeige_lp = 0
	r.anzeige_lebt = false
	r.phase = "SPIEL"
	r.steuerung = 1
	r.boss_t = 0
	r.gameover_frame = 0
	welt.rahmen = r
	welt.lebende = 0
	welt.treffer = []
	welt.ereignisse = []
	for _p in start_daten.pruefangriffe:
		welt.pruefangriffe_beendet.append(false)
	welt.vorframe = Vorframe.new()
	welt.vorframe.kamera_x = kx
	welt.beendet = false

	# Figur (Kampf 11.2: x, z, blick, lp, waffe, munition; sonst Start der Stage)
	var f: KernEntitaeten.Figur = welt.figur
	f.x = KernFestkomma.ausGanz(stage_daten.start_x if start_daten.figur.x == null else start_daten.figur.x)
	f.z = KernFestkomma.ausGanz(stage_daten.start_z if start_daten.figur.z == null else start_daten.figur.z)
	f.blick = stage_daten.start_blick if start_daten.figur.blick == null else start_daten.figur.blick
	f.lp = KernWerte.FIGUR_LP if start_daten.figur.lp == null else start_daten.figur.lp
	f.lp_max = KernWerte.FIGUR_LP
	f.waffe = "" if start_daten.figur.waffe == null else start_daten.figur.waffe
	if start_daten.figur.munition == null:
		f.munition = KernWerte.RAKETENWERFER_MUNITION if f.waffe == "RW" else 0
	else:
		f.munition = start_daten.figur.munition

	# Vorplatzierte Gegner der Stage (Welt 4.1): Boss in s0, übrige ab s1 in Zeilenfolge;
	# der Slot bleibt reserviert, auch wenn die Welle aus ist.
	var naechster: int = KernWerte.ERSTER_GEGNERSLOT
	var boss_gesehen: bool = false
	for satz: KernStage.GegnerSatz in stage_daten.gegner:
		var nr: int
		if satz.typ == "Ballast":
			if boss_gesehen:
				push_error("Stage mit zwei Bossen")
			boss_gesehen = true
			nr = KernWerte.BOSS_SLOT
		else:
			nr = naechster
			naechster += 1
		if nr >= KernWerte.GEGNER_SLOTS:
			push_error("Stage mit mehr vorplatzierten Gegnern als Slots")
		if start_daten.wellen_aus.has(satz.welle):
			continue
		KernAnlegen.gegnerAusStage(welt, welt.gegner[nr], satz)

	# Gegner der Prüfszene, die von Beginn an da sind (ersetzen einen Stage-Gegner im selben Slot)
	for gs: KernStart.GegnerStart in start_daten.gegner:
		if KernStart.vonBeginn(gs):
			KernAnlegen.gegnerAusSzene(welt, gs)

	# Zufall je Gegner beim Laden, Slots aufsteigend (Welt 11.1)
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			KernAnlegen.gegnerZufallGeben(welt, g)

	# Übergabe an die Gegnerlogik, Slots aufsteigend
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			KernAnlegen.gegnerUebergeben(welt, g)

	# Behälter der Stage in Zeilenfolge, dann zusätzliche des Prüfstarts (Welt 9.1, 11.3)
	var objekt_nr: int = 0
	var behaelter: Array = []
	for b: KernStage.BehaelterSatz in stage_daten.behaelter:
		if not start_daten.behaelter_aus.has(b.id):
			behaelter.append(b)
	for b in start_daten.behaelter_zusatz:
		behaelter.append(b)
	for b: Object in behaelter:
		if objekt_nr >= welt.objekte.size():
			push_error("mehr Behälter als Objektslots")
			break
		var o: KernEntitaeten.Objekt = welt.objekte[objekt_nr]
		KernAnlegen.behaelterAnlegen(o, b, start_daten.welle7_nur_boss and b.art == "Bosskiste")
		objekt_nr += 1
	# Objekte der Prüfszene in ihren Slots
	for os: KernStart.ObjektStart in start_daten.objekte:
		var o2: KernEntitaeten.Objekt = welt.objekte[os.slot - KernWerte.OBJEKT_SLOT_ERSTER]
		if o2 != null and o2.belegt:
			push_error("Objektslot o%d ist schon belegt" % os.slot)
		KernAnlegen.objektAusSzene(welt, os)

	KernFigur.figurInitialisieren(welt)
	welt.lebende = lebendeZaehlen(welt)
	KernEntitaeten.vorframeKopieren(welt)
	vorframeSetzen(welt)
	return welt


# ===========================================================================
# Logikschritt
# ===========================================================================

## W4: Entscheidung eines Gegners nach Typ (Abschnitt 1 des Vertrags).
static func gegnerEntscheidung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.typ == "Ballast":
		KernGegnerBoss.bossEntscheidung(welt, g)
		return
	if not g.logik or g.typ == "Puppe":
		KernGegnerReaktion.puppeEntscheidung(welt, g)
		return
	if KernEntitaeten.istReaktion(g.modus):
		return
	if g.typ == "Bolzer" or g.typ == "Rammbock":
		KernGegnerNah.nahEntscheidung(welt, g)
	elif g.typ == "Zünder":
		KernGegnerFern.fernEntscheidung(welt, g)


## KS3: Reaktion oder Bewegung eines Gegners.
static func gegnerBewegung(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.typ == "Ballast":
		KernGegnerBoss.bossBewegung(welt, g)
		return
	if KernGegnerReaktion.reaktionSchritt(welt, g):
		return
	if not g.logik or g.typ == "Puppe":
		return
	if g.typ == "Bolzer" or g.typ == "Rammbock":
		KernGegnerNah.nahBewegung(welt, g)
	elif g.typ == "Zünder":
		KernGegnerFern.fernBewegung(welt, g)


## KS5: Abbruchprüfung eines Gegners.
static func gegnerAbbruch(welt: KernWelt, g: KernEntitaeten.Gegner) -> void:
	if g.typ == "Ballast":
		KernGegnerBoss.bossAbbruch(welt, g)
		return
	if not g.logik or g.typ == "Puppe" or KernEntitaeten.istReaktion(g.modus):
		return
	if g.typ == "Bolzer" or g.typ == "Rammbock":
		KernGegnerNah.nahAbbruch(welt, g)
	elif g.typ == "Zünder":
		KernGegnerFern.fernAbbruch(welt, g)


## KS7: Treffer an Ziel- und Urheberhandler verteilen (Abschnitt 1 und 3 des Vertrags).
static func trefferVerteilen(welt: KernWelt) -> void:
	for t: KernEntitaeten.Treffer in welt.treffer:
		if t.ziel == "f":
			KernSchaden.figurGetroffen(welt, t)
		elif KernEntitaeten.istGegnerSlot(t.ziel):
			var g: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.ziel)
			if g == null or not g.belegt:
				push_error("KS7: Treffer auf freien Gegnerslot %s" % t.ziel)
				continue
			if g.typ == "Ballast":
				KernGegnerBoss.bossGetroffen(welt, t)
			else:
				KernGegnerReaktion.gegnerGetroffen(welt, t)
		else:
			var o: KernEntitaeten.Objekt = KernEntitaeten.objektVon(welt, t.ziel)
			if o == null or not o.belegt:
				push_error("KS7: Treffer auf freien Slot %s" % t.ziel)
				continue
			KernGegenstaende.behaelterGetroffen(welt, t)
		if t.wirkung == "":
			push_error("KS7: Zielhandler für %s hat keine Wirkung gesetzt (Vertrag 3)" % t.ziel)
	for t: KernEntitaeten.Treffer in welt.treffer:
		if t.wirkung == "W":
			continue
		if t.urheber == "f":
			KernFigur.figurHatGetroffen(welt, t)
			continue
		var g2: KernEntitaeten.Gegner = KernEntitaeten.gegnerVon(welt, t.urheber)
		if g2 == null or not g2.logik:
			continue
		if g2.typ == "Ballast":
			KernGegnerBoss.bossHatGetroffen(welt, t)
		elif g2.typ == "Bolzer" or g2.typ == "Rammbock":
			KernGegnerNah.nahHatGetroffen(welt, t)
		elif g2.typ == "Zünder":
			KernGegnerFern.fernHatGetroffen(welt, t)


## Ein Logikschritt (Frame f = welt.frame + 1) mit der Tastenmenge T(f), die
## zu Beginn von f abgefragt wurde. Die Figur wertet T(f−1) aus (ein Frame
## Latenz, Kampf 2.1). Reihenfolge: Abschnitt 1 des Vertrags in welt.ts.
static func logikSchritt(welt: KernWelt, tasten: int) -> void:
	welt.frame += 1
	var e: Eingabe = welt.eingabe
	e.t2 = e.t1
	e.t1 = e.t
	e.t = tasten & KernTasten.ALLE
	e.neu = KernTasten.KEINE
	welt.ereignisse = []
	welt.treffer = []
	KernEntitaeten.vorframeKopieren(welt)
	vorframeSetzen(welt)
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			g.modus_uhr += 1

	# W1 Eingriffe
	KernEingriffe.eingriffeAusfuehren(welt)
	# W2 Rang
	KernRang.rangSchritt(welt)
	# W3 vorgemerkte Gegner, Weckreiz
	KernWellen.wellenAnlegen(welt)
	# W4 steuerung und Phase dieses Frames, Entscheidungen der Gegner und des Bosses
	KernRahmen.rahmenVorlauf(welt)
	KernGegnerNah.rechteSchritt(welt)
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			gegnerEntscheidung(welt, g)

	# KS1 Eingabe, neue Drücke, Sprint-Erkennung
	e.neu = KernTasten.neuGedrueckt(e.t1, e.t2)
	KernFigur.figurEingabe(welt)
	# KS2 Figur
	KernFigur.figurSchritt(welt)
	# KS3 Gegner, dann Prüfangriffe
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			gegnerBewegung(welt, g)
	KernTreffer.pruefangriffeSchritt(welt)
	# KS4 Geschosse
	KernFigur.figurGeschosseSchritt(welt)
	KernGegnerFern.fernGeschosseSchritt(welt)
	# KS5 Abbruchprüfung
	for g: KernEntitaeten.Gegner in welt.gegner:
		if g.belegt:
			gegnerAbbruch(welt, g)
	# KS6 Trefferprüfung
	KernTreffer.trefferPruefen(welt)
	# KS7 Folgen
	trefferVerteilen(welt)
	KernTreffer.trefferFolgen(welt)
	KernFigur.griffPruefen(welt)

	# W5 Super-Armor, Fall, Punkte, Gegneranzeige
	KernGegnerBoss.bossW5(welt)
	KernRahmen.rahmenW5(welt)
	# W6 Kamera, Verschwinden beim Scrollen
	KernKamera.kameraSchritt(welt)
	KernGegenstaende.gegenstaendeScrollen(welt)
	# W7 Wellen
	KernWellen.wellenPruefen(welt)
	# W8 Gegenstände, Rahmen
	KernGegenstaende.gegenstaendeSchritt(welt)
	KernRahmen.rahmenSchritt(welt)
