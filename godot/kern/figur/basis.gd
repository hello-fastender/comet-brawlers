# Grundbausteine der Spielfigur (K1): Aktionswechsel nach
# docs/spezifikation-kampf.md, 4.1 und 4.3, Sprungbeginn (4.3, 4.4) und
# Bewegung mit Begrenzung durch Tiefenband, Hindernisse, Behälter und
# Bildränder (docs/spezifikation-welt.md, 2.2).
# Port von spiel/src/kern/figur/basis.ts.
class_name KernFigurBasis
extends RefCounted

## Aktionen, in denen die Figur Drücke nach 4.2 frei annimmt (Kampf 4.2).
const FREIE_AKTIONEN: Array[String] = ["STAND", "LAUF", "SPRINT"]

## Aktionen, die eine laufende Instanz SS nicht beenden (Kampf 9.3).
const SS_BLEIBT: Array[String] = ["LANDUNG", "STAND", "LAUF"]


## Beginnt eine neue Aktion (Kampf 4.1, 4.3): uhr = 1, Unterphase, Ende der
## laufenden Angriffsinstanz (SS läuft in LANDUNG, STAND und LAUF weiter,
## Kampf 9.3), Kombostufe 0 außerhalb von SCHLAG (5.6, P12), Sprintframe 0
## außerhalb von SPRINT. Schwellen: in STAND, LAUF und SPRINT Drücke ab dem
## laufenden Frame, sonst „nie“, bis die Aktion sie setzt.
static func aktionSetzen(welt: KernWelt, aktion: String, phase: String = "") -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var a: KernEntitaeten.Angriffsinstanz = f.angriff
	if a != null and not (a.code == "SS" and SS_BLEIBT.has(aktion)):
		f.angriff = null
	if f.angriff == null:
		f.ss_n = 0
	f.aktion = aktion
	f.phase = phase
	f.uhr = 1
	f.treffer_h = 0
	f.treffer_frames = 0
	if aktion != "SCHLAG":
		f.kombo = 0
		f.ausfallschritt = 0
	if aktion != "SPRINT":
		f.sprint_n = 0
	if FREIE_AKTIONEN.has(aktion):
		KernFigurIntern.schwellenSetzen(f, welt.frame, welt.frame, welt.frame)
	else:
		KernFigurIntern.schwellenSetzen(f, KernWerte.FRAME_NIE, KernWerte.FRAME_NIE, KernWerte.FRAME_NIE)


## STAND als Ende einer Aktion (Kampf 4.3): Drücke ab diesem Frame.
static func standBeginnen(welt: KernWelt) -> void:
	aktionSetzen(welt, "STAND")


## SPRUNG bzw. SPRINTSPRUNG ab J+1 (Kampf 4.3, 4.4, 9.3): J = Druckframe,
## T(J) bestimmt die x-Richtung (Sprintsprung: Sprintrichtung = Blick); A ab
## J+1; Absprung in J+2 mit vh = 4,9375.
static func sprungBeginnen(welt: KernWelt, sprint: bool, tasten: int) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	aktionSetzen(welt, "SPRINTSPRUNG" if sprint else "SPRUNG")
	f.sprung_j = welt.frame - 1
	f.sprung_tasten = tasten
	f.vh = KernWerte.SPRUNG_VH_START
	f.angriff_a = 0
	f.sprung_dx = f.blick if sprint else KernTasten.richtungX(tasten)
	f.sprung_angriff = false
	f.sprung_variante = ""
	f.druecke_ab = f.sprung_j + KernWerte.SPRUNGANGRIFF_DRUCK_VON


# ===========================================================================
# Bewegung (Welt 2.2)
# ===========================================================================

## Begrenzung der Figur (Welt 2.2): Band, Hindernisse, Behälter und die Ränder
## K + 24 ≤ x ≤ K + 360, 24 ≤ x ≤ x_ende − 24 mit Kamera-x des Vorframes
## (welt.kamera.x gilt im Kampfschritt unverändert, Kampf 2.2).
static func begrenzung(welt: KernWelt) -> KernStage.Begrenzung:
	var st: KernStage.Stage = welt.stage
	var b: KernStage.Begrenzung = KernStage.Begrenzung.new()
	if not st.raender:
		b.stage = st
		b.zusatz = KernGegenstaende.behaelterHindernisse(welt)
		b.x_min = null
		b.x_max = null
		return b
	var k: int = welt.kamera.x
	var links: int = maxi(k + KernWerte.FIGUR_RAND, KernWerte.FIGUR_RAND)
	var rechts: int = mini(k + KernWerte.FIGUR_RAND_RECHTS, st.x_ende - KernWerte.FIGUR_RAND)
	b.stage = st
	b.zusatz = KernGegenstaende.behaelterHindernisse(welt)
	b.x_min = KernFestkomma.ausGanz(links)
	b.x_max = KernFestkomma.ausGanz(rechts)
	return b


## Bewegt die Figur um (dx, dz) mit Begrenzung (Welt 2.2 Punkt 2: erst x, dann z, Stopp an der Kante).
static func bewegen(welt: KernWelt, dx: int, dz: int) -> void:
	if dx == 0 and dz == 0:
		return
	var f: KernEntitaeten.Figur = welt.figur
	var r: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(begrenzung(welt), f.x, f.z, f.h, dx, dz)
	f.x = r.x
	f.z = r.z


## Aufsetzen innerhalb eines Hindernisses (Welt 2.2, Punkt 3): z wird zur
## näheren freien Kante geschoben, bei Gleichstand nach vorn (z kleiner).
static func aufsetzen(welt: KernWelt) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var x: int = KernFestkomma.ganz(f.x)
	var z: int = KernFestkomma.ganz(f.z)
	var zusatz: Array = KernGegenstaende.behaelterHindernisse(welt)
	if KernStage.begehbar(welt.stage, x, z, 0, zusatz):
		return
	# band: Dictionary { unten, oben } oder null
	var band: Variant = KernStage.bandGrenzen(welt.stage, x)
	if band == null:
		return
	var weite: int = (band["oben"] as int) - (band["unten"] as int)
	for d in range(1, weite + 1):
		if KernStage.begehbar(welt.stage, x, z - d, 0, zusatz):
			f.z = KernFestkomma.ausGanz(z - d)
			return
		if KernStage.begehbar(welt.stage, x, z + d, 0, zusatz):
			f.z = KernFestkomma.ausGanz(z + d)
			return
