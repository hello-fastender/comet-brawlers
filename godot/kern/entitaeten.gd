# Entitäten, Slots, Angriffsinstanzen und Treffer nach
# docs/spezifikation-kampf.md, Abschnitt 3 (Felder), 4.3 (Aktionen der Figur),
# 5.1 bis 5.5 (Angriffsinstanz), 7 (Reaktionen) und
# docs/spezifikation-welt.md, 4.1 (Slots), 5.2, 6, 7.1 (Zustände der Gegner).
# Port von spiel/src/kern/entitaeten.ts.
#
# Umsetzungsregeln des Ports (gelten für alle Dateien unter godot/kern/):
# - Feldnamen wörtlich wie in TypeScript (x_vor, lp_max, letzter_angreifer …).
# - Alle Positionen, Geschwindigkeiten, Beschleunigungen sind Fest (int, 16.16).
# - Zeichenketten-Aufzählungen (SlotKey, Aktion, Modus, Bahn …) bleiben String.
# - `T | null` ist Variant (null oder T); Slotschlüssel „nicht gesetzt“ ist null.
# - TypeScript-Schnittstellen sind innere Klassen mit Standardwerten, erzeugt
#   mit `.new()`, Felder danach setzen. Die Schnittstelle Animation heißt hier
#   Animationszeiger (Animation ist eine Godot-Klasse).
# - Record<string, number> (timer) ist ein Dictionary; nie darüber iterieren.
class_name KernEntitaeten
extends RefCounted

# ===========================================================================
# Grundtypen und Zustände
# ===========================================================================

## Zustand 0: Slot frei (Kampf 3).
const ZUSTAND_FREI: int = 0
## Zustand 1: normal, verwundbar (Kampf 3).
const ZUSTAND_NORMAL: int = 1
## Zustand 2: am Boden oder unverwundbar (Kampf 3).
const ZUSTAND_BODEN: int = 2
## Zustand 3: Trefferreaktion bzw. geschützt (Kampf 3).
const ZUSTAND_REAKTION: int = 3

## Alle Aktionen der Figur in der Reihenfolge von Kampf 4.3.
const FIGUR_AKTIONEN: Array = [
	"STAND", "LAUF", "SPRINT", "SPRUNG", "LANDUNG", "SCHLAG", "LEERSCHLAG", "SPRUNGANGRIFF",
	"GRIFF", "KNIESTOSS", "WURF", "SPEZIAL", "SPRINTANGRIFF", "SPRINTSPRUNG", "GETROFFEN",
	"UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT", "WAFFE", "AUFNEHMEN", "NEUEINSTIEG",
]

## Alle Reaktionen der Gegner (Kampf 7).
const REAKTIONEN: Array = ["GETROFFEN", "UMGEWORFEN", "LIEGEN", "AUFSTEHEN", "TOT", "GEHALTEN"]


## Animationszeiger (Kampf 3: Animation, Bild, Restdauer; läuft mit der Aktionsuhr).
class Animationszeiger:
	var name: String = ""
	var bild: int = 0
	var rest: int = 0


# ===========================================================================
# Angriffsinstanz (Kampf 3 Feld angriff; 5.1 bis 5.5)
# ===========================================================================

## Trefferfläche (Kampf 5.1) als eine Klasse mit allen Feldern der TypeScript-
## Vereinigung; art wählt, welche gelten: 'abstand', 'fenster', 'punkt',
## 'umkreis', 'gehalten', 'bild'. Felder, die zur art nicht gehören, bleiben
## auf ihrem Standardwert. Erzeugen mit KernEntitaeten.flaeche({...}).
class Flaeche:
	var art: String = ""
	var vorn: int = 0
	var hinten: int = 0
	## abstand: hinten_weg gilt statt hinten, wenn das Ziel wegschaut (null = keins)
	var hinten_weg: Variant = null
	var tiefe: int = 0
	## abstand: Höhengrenze des Angreifers (⌊h⌋ ≤), null = keine
	var hoehe_angreifer_max: Variant = null
	## Höhengrenze des Ziels (⌊h⌋ ≤), null = keine
	var hoehe_ziel_max: Variant = null
	# fenster
	var x_z: int = 0
	var links: int = 0
	var rechts: int = 0
	var dz_min: int = 0
	var dz_max: int = 0
	# punkt
	var x: int = 0
	var z: int = 0
	var richtung: int = 1
	var ziel_blick_versatz: int = 0
	# umkreis
	var halbbreite: int = 0


## Laufende Angriffsinstanz (Kampf 3, Feld angriff; 5.5). Neu mit
## KernEntitaeten.angriffsinstanz({...}).
class Angriffsinstanz:
	var code: String = ""
	## Entität, deren Position und Blick die Fläche bestimmen
	var angreifer: String = ""
	## wem der Treffer zählt
	var urheber: String = ""
	var flaeche: Flaeche = null
	var schaden: int = 0
	## abweichender Schaden gegen den Boss (Landung LN: 10); null = schaden
	var schaden_boss: Variant = null
	var umwerfen: bool = false
	var bahn: String = ""
	## 'blick', 'weg' oder 'bahn' (RichtungsRegel)
	var richtung: String = "blick"
	var trefferstopp: bool = false
	var aktiv: bool = false
	## Ziel bei art 'gehalten' (SlotKey oder null)
	var ziel: Variant = null
	## Menge der schon getroffenen Ziele, in Trefferreihenfolge (SlotKey-Strings)
	var getroffen: Array = []
	var einmal: bool = false
	## Zielseite: 'gegner' oder 'figur'
	var gegen: String = "gegner"
	var behaelter: bool = true
	var beginn: int = 0


## Neue Fläche aus einem Dictionary mit den Feldnamen der TypeScript-Fassung;
## fehlende Felder behalten ihren Standardwert (null bei hinten_weg,
## hoehe_angreifer_max, hoehe_ziel_max).
static func flaeche(p: Dictionary) -> Flaeche:
	var f: Flaeche = Flaeche.new()
	for k: String in p.keys():
		f.set(k, p[k])
	return f


## Neue Angriffsinstanz mit Standardwerten (aktiv false, getroffen leer).
## p hat die Schlüssel des TypeScript-Parameterobjekts: code, angreifer,
## urheber?, flaeche (Flaeche), schaden, schaden_boss?, umwerfen, bahn?,
## richtung?, trefferstopp, ziel?, einmal?, gegen, behaelter?, beginn.
static func angriffsinstanz(p: Dictionary) -> Angriffsinstanz:
	var a: Angriffsinstanz = Angriffsinstanz.new()
	a.code = p["code"]
	a.angreifer = p["angreifer"]
	a.urheber = p["urheber"] if p.get("urheber") != null else a.angreifer
	a.flaeche = p["flaeche"]
	a.schaden = p["schaden"]
	a.schaden_boss = p.get("schaden_boss")
	a.umwerfen = p["umwerfen"]
	if p.get("bahn") != null:
		a.bahn = p["bahn"]
	else:
		a.bahn = "F1" if a.umwerfen else ""
	a.richtung = p["richtung"] if p.get("richtung") != null else "blick"
	a.trefferstopp = p["trefferstopp"]
	a.aktiv = false
	a.ziel = p.get("ziel")
	a.getroffen = []
	a.einmal = p["einmal"] if p.get("einmal") != null else false
	a.gegen = p["gegen"]
	a.behaelter = p["behaelter"] if p.get("behaelter") != null else true
	a.beginn = p["beginn"]
	return a


# ===========================================================================
# Treffer (Folgen, Kampf 5.4, 6, 7; Ereignis T nach Kampf 11.4)
# ===========================================================================

## Ein Treffer eines Frames (Kampf 11.4). wirkung: 'R', 'U', 'X', 'B', 'W' oder ''.
class Treffer:
	var angreifer: String = ""
	var urheber: String = ""
	var ziel: String = ""
	var code: String = ""
	var schaden: int = 0
	var umwerfen: bool = false
	var bahn: String = ""
	## Flugrichtung bei Umwerfen (+1/−1)
	var richtung: int = 1
	## Angreifer steht vor dem Ziel (Boss SA3)
	var von_vorn: bool = false
	var wirkung: String = ""
	var lp_vorher: int = 0
	var instanz: Angriffsinstanz = null


# ===========================================================================
# Entitäten
# ===========================================================================

## Gemeinsame Felder aller Entitäten (Kampf 3).
class EntitaetBasis:
	## Slot dieser Entität (fest): 'f', 's3', 'o25', 'g1'
	var schluessel: String = ""
	## Slotnummer (Figur 0, sn n, on n, gn n)
	var nr: int = 0
	var belegt: bool = false
	var typ: String = ""
	## Position 16.16
	var x: int = 0
	var z: int = 0
	var h: int = 0
	var vx: int = 0
	var vz: int = 0
	var vh: int = 0
	var ax: int = 0
	var gh: int = 0
	## ganzzahlige Position am Ende des Vorframes
	var x_vor: int = 0
	var z_vor: int = 0
	var h_vor: int = 0
	var lp: int = 0
	var lp_vor: int = 0
	var lp_max: int = 0
	var zustand: int = 0
	## Unterphase (Stufe, Variante, Abschnitt)
	var phase: String = ""
	## Aktionsuhr: Frames seit Aktionsbeginn ohne Stoppframes, Beginn = 1
	var uhr: int = 0
	## verbleibende Stoppframes (Kampf 5.3)
	var stopp: int = 0
	var anim: Animationszeiger = Animationszeiger.new()
	var blick: int = 1
	var angriff: Angriffsinstanz = null
	## Slot des Angreifers beim letzten Treffer (SlotKey oder null)
	var letzter_angreifer: Variant = null
	## laufende Bahn (Kampf 5.7): '', 'F1', 'F2', 'F3', 'F4', 'F4b'
	var bahn: String = ""
	var bahn_richtung: int = 1
	var bahn_frame: int = 0
	var bahn_start_x: int = 0
	var bahn_boden: int = 0
	## benannte modulinterne Zähler; nie darüber iterieren
	var timer: Dictionary = {}


## Zustand der Doppeltipp-Erkennung (Kampf 9.1, P22).
class Tipp:
	var lauf: int = 0
	var lauf_dauer: int = 0
	var pause_dauer: int = 0
	var voriger: int = 0
	var voriger_dauer: int = 0
	var erkannt: int = 0


## Geworfener Gegner als Geschoss WG (Kampf 8.5).
class Wurfgeschoss:
	## Slot des Geworfenen
	var ziel: String = ""
	## Druckframe E der Wurfeingabe
	var e: int = 0
	## Flugrichtung des Geworfenen (+1/−1)
	var richtung: int = 1
	## Angriffsinstanz WG am Geworfenen (urheber 'f')
	var inst: Angriffsinstanz = null


## Spielfigur (Kampf 3, Zusatzfelder; Kampf 4 bis 10).
class Figur extends EntitaetBasis:
	var aktion: String = "STAND"
	var schutz: int = 0
	var kombo: int = 0
	var kombo_h: int = 0
	var griff_ziel: Variant = null
	var griffsperre: int = 0
	var haltefrist: int = 0
	## '' oder 'RW'
	var waffe: String = ""
	var munition: int = 0
	var sprint_n: int = 0
	var sprint_tempo: int = 0
	var sprint_richtung: int = 0
	var tipp: Tipp = Tipp.new()
	var liege_druecke: int = 0
	var p: int = 0
	var p_tasten: int = 0
	var sprung_j: int = 0
	var sprung_tasten: int = 0
	var angriff_a: int = 0
	var treffer_h: int = 0
	var treffer_frames: int = 0
	var druecke_ab: int = 0
	var richtung_ab: int = 0
	var ausfallschritt: int = 0
	var spezial_stufen: int = 0
	var kosten_frame: int = 0
	var getroffen_h: int = 0
	var tod_t: int = 0
	var neueinstieg_n: int = 0
	var landung_ln: int = 0
	var waffe_fallen_frame: int = 0
	var knie_zahl: int = 0
	var wurf_e: int = 0
	var wurf_ziel: Variant = null
	## '', 'V' oder 'R'
	var wurf_richtung: String = ""
	var rutsch_v: int = 0
	var aufnehmen_ziel: Variant = null
	var tiefe_ab: int = 0
	## Frame, ab dem die Kettenpose mit Treffer in STAND übergeht; FRAME_NIE = keiner
	var stand_ab: int = KernWerte.FRAME_NIE
	var leerschlag: bool = false
	## −1, 0 oder 1
	var sprung_dx: int = 0
	var sprung_angriff: bool = false
	## '', 'N', 'R', 'H', 'T'
	var sprung_variante: String = ""
	var ss_n: int = 0
	var los_frame: int = KernWerte.FRAME_NIE
	var liege_ende: int = 0
	var neueinstieg_bereit: bool = false
	## laufende Wurfgeschosse WG (Array von Wurfgeschoss), in Reihenfolge der Würfe
	var wuerfe: Array = []

	func _init() -> void:
		typ = "Figur"
		schluessel = "f"
		nr = 0
		belegt = true
		lp = KernWerte.FIGUR_LP
		lp_vor = KernWerte.FIGUR_LP
		lp_max = KernWerte.FIGUR_LP
		zustand = ZUSTAND_NORMAL
		uhr = 1


## Eigene Zustände des Bosses Ballast (Welt 7.1 bis 7.4), geführt von
## gegner/boss*.gd. Frames: 0 heißt „nicht gesetzt“.
class BossFelder:
	## laufender Angriff: '', 'AS', 'AN', 'KP'
	var art: String = ""
	var wahl: String = ""
	var schwung_a: int = 0
	var treffer: bool = false
	var bereit_ab: int = 0
	## −1, 0 oder 1
	var geh_x: int = 0
	var geh_z: int = 0
	var lauf_n: int = 0
	var lauf_weg: int = 0
	var lauf_ende: bool = false
	var auslauf_n: int = 0
	var kp_x0: int = 0
	var kp_z0: int = 0
	var kp_dx: int = 0
	var kp_dz: int = 0
	var kp_k: int = 0
	var kp_stopp: int = 0
	var kp_letzt: int = 0
	var kp_landung: int = 0
	var stoss_beginn: int = 0
	var stoss_richtung: int = 1
	var stoss_weg: int = 0
	var stoss_offen: bool = false
	## Bahn der laufenden Reaktion: '', 'umwerfen', 'knie', 'wurf', 'explosion', 'tod'
	var bahn: String = ""
	var frei_ab: int = 0
	var taumeln_weg: int = 0
	var sa_faellig: int = 0
	var gehalten: bool = false


## Gegner in s0 bis s19 (Kampf 3; Welt 4 bis 8).
class Gegner extends EntitaetBasis:
	var aktion: String = "STAND"
	## sn_modus (Welt 11.4)
	var modus: String = "FREI"
	var modus_uhr: int = 0
	## 'leicht', 'schwer', 'fern', 'boss'
	var rolle: String = "leicht"
	var logik: bool = true
	var erlaubnis: bool = true
	var vorplatziert: bool = false
	## 'start' oder 'rang'
	var werte: String = "rang"
	var lp_offen: bool = false
	## '', 'hocke', 'versteck', 'luke', 'rand_links', 'rand_rechts', 'boss'
	var auftritt: String = ""
	var welle: int = 0
	var rang_beim_erscheinen: int = 0
	var gehalten_von: Variant = null
	var liegedauer: int = 0
	var reaktion_h: int = 0
	var ruhe_frame: int = 0
	var pruefangriff: int = 0
	var zufall: KernZufall.Zufall = KernZufall.Zufall.new()
	## +1 rechts der Figur
	var seite: int = 1
	## '', 'L', 'R'
	var recht: String = ""
	var zielrecht: bool = false
	var angriff_code: String = ""
	var ziel_abstand: int = 0
	var ziel_x: int = 0
	var schaden: int = 0
	var angriff_a: int = 0
	var angriff_aktiv_ende: int = 0
	var angriff_abgebrochen: bool = false
	var angriff_treffer: int = 0
	var pause: int = 0
	var kampfhaltung_s: int = 0
	## 'normal' oder 'schnell'
	var gehstufe: String = "normal"
	var gehbefehl_rest: int = 0
	var haltabstand: int = 0
	var serie: bool = false
	var gruppe_rest: int = 0
	var gruppe_umwerf: String = ""
	var abwarten_rest: int = 0
	var verfolgung_rest: int = 0
	var nachlauf_ende: int = 0
	var weckreiz_w: int = 0
	var kampffaehig_ab: int = 0
	var weckreiz_ab: int = 0
	var lp_bonus: int = 0
	var ohne_punkte: bool = false
	var zielpunkt_x: int = 0
	var zielpunkt_z: int = 0
	var waffe_gefallen: bool = false
	var lp_folge: int = 0
	## 0 oder 1
	var folge: int = 0
	var folge_h: int = 0
	var naechster_angriff: int = 0
	var schwung: int = 0
	var angriffe_an: bool = true
	var bewegung_an: bool = true
	var tod_t: int = 0
	var frei_frame: int = 0
	var getroffen_frame: int = 0
	var vorn_geschuetzt: bool = false
	var boss: BossFelder = BossFelder.new()

	func _init() -> void:
		aktion = "STAND"


## Objekt in o20 bis o59 oder Geschoss der Figur in g0 bis g4 (Kampf 3; Welt 9).
class Objekt extends EntitaetBasis:
	var aktion: String = ""
	## Gegenstand oder Behälterart; '' sonst
	var art: String = ""
	var id: String = ""
	var munition: int = 0
	var liegezeit: int = 0
	var landung_l: int = 0
	var aufnehmbar: bool = false
	var sichtbar: bool = true
	## Inhalt eines Behälters: Gegenstandsart, 'leer' oder ''
	var inhalt: String = ""
	var zerbrochen: bool = false
	var zerbrochen_h: int = 0
	## '', 'FLUG', 'EXPLOSION'
	var flugphase: String = ""
	var flug_n: int = 0
	## '', 'behaelter', 'zuender'
	var flugart: String = ""
	var flug_h0: int = 0
	var liegt_ab: int = 0
	var lebensdauer: int = 0
	var einschlag_x: int = 0
	var einschlag_z: int = 0
	var besitzer: Variant = null
	var abschuss: int = 0


## Die Slottabelle der Welt (Kampf 3). KernWelt erfüllt diese Schnittstelle
## (gleiche Felder figur, gegner, objekte, geschosse).
class SlotTabelle:
	var figur: Figur = null
	## s0 bis s19, Index = Slotnummer
	var gegner: Array = []
	## o20 bis o59, Index = Slotnummer − 20
	var objekte: Array = []
	## g0 bis g4, Index = Slotnummer
	var geschosse: Array = []


# ===========================================================================
# Leere Entitäten
# ===========================================================================

## Figur im Grundzustand (STAND, 72 LP, Zustand 1, Blick rechts, Position 0).
static func figurNeu() -> Figur:
	return Figur.new()


## Freier Gegnerslot sn.
static func gegnerLeer(nr: int) -> Gegner:
	var g: Gegner = Gegner.new()
	g.schluessel = "s%d" % nr
	g.nr = nr
	return g


## Bosszustände im Grundzustand (kein Angriff, keine Bahn).
static func bossFelderLeer() -> BossFelder:
	return BossFelder.new()


## Freier Objektslot on (nr 20 bis 59) bzw. Geschossslot gn (nr 0 bis 4).
static func objektLeer(schluessel: String, nr: int) -> Objekt:
	var o: Objekt = Objekt.new()
	o.schluessel = schluessel
	o.nr = nr
	return o


## Neue, leere Slottabelle (Figur im Grundzustand).
static func slotTabelleNeu() -> SlotTabelle:
	var t: SlotTabelle = SlotTabelle.new()
	t.figur = figurNeu()
	for i in range(KernWerte.GEGNER_SLOTS):
		t.gegner.append(gegnerLeer(i))
	for i in range(KernWerte.OBJEKT_SLOTS):
		t.objekte.append(objektLeer("o%d" % (KernWerte.OBJEKT_SLOT_ERSTER + i), KernWerte.OBJEKT_SLOT_ERSTER + i))
	for i in range(KernWerte.GESCHOSS_SLOTS):
		t.geschosse.append(objektLeer("g%d" % i, i))
	return t


## Setzt alle Felder eines Slots auf die Standardwerte einer neuen Instanz
## (TypeScript: Object.assign(e, gegnerLeer(nr))); schluessel und nr bleiben.
static func _zuruecksetzen(e: EntitaetBasis, neu: EntitaetBasis) -> void:
	var schluessel: String = e.schluessel
	var nr: int = e.nr
	for p: Dictionary in e.get_property_list():
		if (p["usage"] as int) & PROPERTY_USAGE_SCRIPT_VARIABLE:
			e.set(p["name"] as String, neu.get(p["name"] as String))
	e.schluessel = schluessel
	e.nr = nr


# ===========================================================================
# Slots anlegen und freigeben (Kampf 3: kleinster freier Slot des Bereichs)
# ===========================================================================

## Kleinster freier Gegnerslot ab `ab` (Standard s1, Welt 4.1), sonst null.
static func freierGegner(t: Object, ab: int = KernWerte.ERSTER_GEGNERSLOT) -> Gegner:
	var liste: Array = t.gegner
	for i in range(ab, liste.size()):
		var g: Gegner = liste[i]
		if not g.belegt:
			return g
	return null


## Bosslot s0, wenn frei, sonst null (Welt 4.1).
static func freierBossSlot(t: Object) -> Gegner:
	var g: Gegner = t.gegner[KernWerte.BOSS_SLOT]
	return null if g.belegt else g


## Kleinster freier Objektslot o20 bis o59, sonst null (Welt 9.1).
static func freiesObjekt(t: Object) -> Objekt:
	for o: Objekt in t.objekte:
		if not o.belegt:
			return o
	return null


## Kleinster freier Geschossslot g0 bis g4, sonst null (Kampf 10.3).
static func freiesGeschoss(t: Object) -> Objekt:
	for o: Objekt in t.geschosse:
		if not o.belegt:
			return o
	return null


## Setzt einen Gegnerslot auf den leeren Zustand zurück und belegt ihn (Zustand 1).
static func gegnerBelegen(g: Gegner, typ: String) -> Gegner:
	_zuruecksetzen(g, Gegner.new())
	g.belegt = true
	g.typ = typ
	g.zustand = ZUSTAND_NORMAL
	return g


## Setzt einen Objekt- oder Geschossslot zurück und belegt ihn (Zustand 1).
static func objektBelegen(o: Objekt, typ: String) -> Objekt:
	_zuruecksetzen(o, Objekt.new())
	o.belegt = true
	o.typ = typ
	o.zustand = ZUSTAND_NORMAL
	return o


## Gibt einen Gegner-, Objekt- oder Geschossslot frei (belegt false, Zustand 0).
static func freigeben(e: EntitaetBasis) -> void:
	if e.schluessel.begins_with("s"):
		_zuruecksetzen(e, Gegner.new())
	else:
		_zuruecksetzen(e, Objekt.new())


## Entität zu einem Slot (Figur, Gegner oder Objekt), oder null, wenn es den Slot nicht gibt.
static func entitaet(t: Object, key: String) -> EntitaetBasis:
	if key == "f":
		return t.figur
	var nr: int = key.substr(1).to_int()
	match key[0]:
		"s":
			return t.gegner[nr] if nr >= 0 and nr < t.gegner.size() else null
		"o":
			var i: int = nr - KernWerte.OBJEKT_SLOT_ERSTER
			return t.objekte[i] if i >= 0 and i < t.objekte.size() else null
		"g":
			return t.geschosse[nr] if nr >= 0 and nr < t.geschosse.size() else null
	return null


## Gegner zu einem Slot oder null (key kann null sein).
static func gegnerVon(t: Object, key: Variant) -> Gegner:
	if key == null or not (key as String).begins_with("s"):
		return null
	var nr: int = (key as String).substr(1).to_int()
	return t.gegner[nr] if nr >= 0 and nr < t.gegner.size() else null


## Objekt (o20 bis o59) oder Geschoss der Figur (g0 bis g4) zu einem Slot, sonst null.
static func objektVon(t: Object, key: Variant) -> Objekt:
	if key == null:
		return null
	var k: String = key
	var nr: int = k.substr(1).to_int()
	if k.begins_with("o"):
		var i: int = nr - KernWerte.OBJEKT_SLOT_ERSTER
		return t.objekte[i] if i >= 0 and i < t.objekte.size() else null
	if k.begins_with("g"):
		return t.geschosse[nr] if nr >= 0 and nr < t.geschosse.size() else null
	return null


## Name eines Beteiligten im Ereignis (Kampf 11.4): F, sn, on, gn.
static func beteiligter(key: String) -> String:
	return "F" if key == "f" else key


## Ist der Slot ein Gegnerslot?
static func istGegnerSlot(key: String) -> bool:
	return key.begins_with("s")


# ===========================================================================
# Vorframe-Kopien (Kampf 3: x_vor, z_vor, h_vor, lp_vor)
# ===========================================================================

static func _vorframeEntitaet(e: EntitaetBasis) -> void:
	e.x_vor = KernFestkomma.ganz(e.x)
	e.z_vor = KernFestkomma.ganz(e.z)
	e.h_vor = KernFestkomma.ganz(e.h)
	e.lp_vor = e.lp


## Kopiert für alle Entitäten die ganzzahlige Position und die LP als
## Vorframe-Werte (zu Beginn jedes Logikschritts, vor W1).
static func vorframeKopieren(t: Object) -> void:
	_vorframeEntitaet(t.figur)
	for g: EntitaetBasis in t.gegner:
		_vorframeEntitaet(g)
	for o: EntitaetBasis in t.objekte:
		_vorframeEntitaet(o)
	for o: EntitaetBasis in t.geschosse:
		_vorframeEntitaet(o)


# ===========================================================================
# Abstände und Hilfsabfragen
# ===========================================================================

## Abstände nach Kampf 2.3 an ganzzahligen Positionen: Ziel minus Angreifer, d_vorn = dx · Blick des Angreifers.
class Abstand:
	var dx: int = 0
	var dz: int = 0
	var d_vorn: int = 0


## Abstände von a (Angreifer) zu z (Ziel) nach Kampf 2.3.
static func abstand(a: EntitaetBasis, z: EntitaetBasis) -> Abstand:
	var r: Abstand = Abstand.new()
	r.dx = KernFestkomma.ganz(z.x) - KernFestkomma.ganz(a.x)
	r.dz = KernFestkomma.ganz(z.z) - KernFestkomma.ganz(a.z)
	r.d_vorn = r.dx * a.blick
	return r


## Schaut e auf andere zu? (gleiches x zählt als zuschauen)
static func schautZu(e: EntitaetBasis, andere: EntitaetBasis) -> bool:
	var dx: int = KernFestkomma.ganz(andere.x) - KernFestkomma.ganz(e.x)
	return dx * e.blick >= 0


## Blick zur anderen Entität; bei gleichem x bleibt der bisherige.
static func blickZu(e: EntitaetBasis, andere: EntitaetBasis) -> int:
	var dx: int = KernFestkomma.ganz(andere.x) - KernFestkomma.ganz(e.x)
	if dx > 0:
		return 1
	if dx < 0:
		return -1
	return e.blick


## Protokolltext der Blickrichtung (Kampf 11.3): R oder L.
static func blickText(b: int) -> String:
	return "R" if b == 1 else "L"


## Setzt den Modus eines Gegners (sn_modus) und beginnt sn_timer neu mit 1
## (gleicher Modus: keine Änderung).
static func modusSetzen(g: Gegner, m: String) -> void:
	if g.modus == m:
		return
	g.modus = m
	g.modus_uhr = 1


## Ist der Modus eine Reaktion nach Kampf 7?
static func istReaktion(m: String) -> bool:
	return REAKTIONEN.has(m)


## Lebend nach Welt 4.3: vom Weckreiz bzw. Anlegen an, bis die LP unter 0
## fallen; wartende und sterbende Gegner zählen nicht.
static func istLebend(g: Gegner) -> bool:
	return g.belegt and g.modus != "WARTEN" and g.modus != "TOT" and g.lp >= 0


## Im aktiven Fenster nach Welt 4.1: −64 ≤ ⌊x⌋ − K ≤ 447.
static func imFenster(g: EntitaetBasis, kameraX: int) -> bool:
	var d: int = KernFestkomma.ganz(g.x) - kameraX
	return d >= KernWerte.FENSTER_LINKS and d <= KernWerte.FENSTER_RECHTS
