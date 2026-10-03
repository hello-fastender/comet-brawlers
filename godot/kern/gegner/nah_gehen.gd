# Gehen der Gegner nach docs/spezifikation-welt.md, 5.3 (K3, Stufe 2), für
# Nahkämpfer (nah.gd) und Fernkämpfer (fern.gd):
# - Gehrichtung als einer von 32 Sektoren zu 11,25°, aus Δx und Δz zum Ziel
#   über die Tabelle der Tangensgrenzen (werte.gd GEH_TAN_GRENZEN), ohne
#   Winkelfunktion; Schritt (v_x · cos α, v_z · sin α) aus der Tabelle des
#   Gehtempos (werte.gd GEH_SCHRITT_…, je Tempo einmal gerundet, Ellipse).
# - In z höchstens bis zum Ziel.
# - Band und Hindernisse begrenzen (stage.gd schrittBegrenzt, keine
#   Bildränder, Welt 2.2 Punkt 5); blockiert ein Hindernis den Schritt in x,
#   geht der Gegner in der Tiefe zur näheren freien Kante.
# - Haltepunkte und Wartepositionen liegen in K + 16 … K + 368 (Welt 4.1).
#
# Festlegung K3: „nähere freie Kante“ ist die nähere z-Grenze des
# achsparallelen Rechtecks um das Hindernis; bei Gleichstand nach vorn
# (kleineres z).
#
# Port von spiel/src/kern/gegner/nah_gehen.ts.
class_name KernGegnerNahGehen
extends RefCounted


## Gehtempo als Schritttabelle (Welt 5.3): x[k] = v_x · cos(k · 11,25°),
## z[k] = v_z · sin(k · 11,25°) für die Sektoren k = 0 … 8 im Viertel, je
## Tempo einmal auf 1/65536 gerundet (werte.gd GEH_SCHRITT_…).
## Felder x und z: Array von Fest (int).
class Tempo:
	var x: Array = []
	var z: Array = []


## Neues Tempo aus einer Schritttabelle von werte.gd (Schlüssel "x" und "z").
static func _tempoAus(tabelle: Dictionary) -> Tempo:
	var t: Tempo = Tempo.new()
	t.x = tabelle["x"]
	t.z = tabelle["z"]
	return t


## Sektor 90° (nur Tiefe): Zahl der Tangensgrenzen im Viertel.
static func _viertel() -> int:
	return KernWerte.GEH_TAN_GRENZEN.size()


## Eintrag k einer Schritttabelle (Index geprüft).
static func schritt(tabelle: Array, k: int) -> int:
	if k < 0 or k >= tabelle.size():
		push_error("Gehsektor %d außerhalb der Tabelle" % k)
		return 0
	return tabelle[k] as int


## Gehtempo nach Typ und Gehstufe (Welt 5.1, 6).
static func gehTempo(g: KernEntitaeten.Gegner) -> Tempo:
	var schnell: bool = g.gehstufe == "schnell"
	match g.typ:
		"Rammbock":
			return _tempoAus(KernWerte.GEH_SCHRITT_RAMMBOCK_SCHNELL if schnell else KernWerte.GEH_SCHRITT_RAMMBOCK)
		"Zünder":
			return _tempoAus(KernWerte.GEH_SCHRITT_ZUENDER_SCHNELL if schnell else KernWerte.GEH_SCHRITT_ZUENDER)
		_:
			return _tempoAus(KernWerte.GEH_SCHRITT_BOLZER_SCHNELL if schnell else KernWerte.GEH_SCHRITT_BOLZER)


## Volles Tempo in der Tiefe (Schritt nur in z, Sektor 90°).
static func tiefenTempo(t: Tempo) -> int:
	return schritt(t.z, _viertel())


## Sektor im Viertel, 0 (waagrecht) bis 8 (nur Tiefe), aus |Δx| und |Δz| in
## ganzen Pixeln: Zahl der Tangensgrenzen, die |Δz| / |Δx| überschreitet
## (Vergleich |Δz| · 65536 > |Δx| · tan mit festkomma.gd produktGroesser,
## exakt auch über 32 Bit).
static func gehSektor(ax: int, az: int) -> int:
	var k: int = 0
	for t: int in KernWerte.GEH_TAN_GRENZEN:
		if KernFestkomma.produktGroesser(az, KernFestkomma.EINS, ax, t):
			k += 1
	return k


## Schritt (v_x · cos α, v_z · sin α) zum Ziel in Richtung (dx, dz) (ganze Pixel), ohne Begrenzung: aus der Tabelle nachgeschlagen.
## Rückgabe: Dictionary mit sx und sz (Fest).
static func gehSchritt(t: Tempo, dx: int, dz: int) -> Dictionary:
	if dx == 0 and dz == 0:
		return {"sx": 0, "sz": 0}
	var k: int = gehSektor(absi(dx), absi(dz))
	var sx: int = schritt(t.x, k)
	var sz: int = schritt(t.z, k)
	if dx < 0:
		sx = KernFestkomma.neg(sx)
	if dz < 0:
		sz = KernFestkomma.neg(sz)
	return {"sx": sx, "sz": sz}


## Begrenzung der Gegner: Band, Hindernisse, unzerbrochene Behälter, keine Bildränder (Welt 2.2 Punkt 5).
static func gegnerBegrenzung(welt: KernWelt) -> KernStage.Begrenzung:
	var b: KernStage.Begrenzung = KernStage.Begrenzung.new()
	b.stage = welt.stage
	b.zusatz = KernGegenstaende.behaelterHindernisse(welt)
	b.x_min = null
	b.x_max = null
	return b


## x auf K + 16 … K + 368 begrenzt (Welt 4.1).
static func fensterX(welt: KernWelt, x: int) -> int:
	var k: int = welt.kamera.x
	return mini(k + KernWerte.HALTEPUNKT_MAX, maxi(k + KernWerte.HALTEPUNKT_MIN, x))


## z auf das Tiefenband bei x begrenzt (Welt 5.8: Warteposition begrenzt auf das Band).
static func bandZ(welt: KernWelt, x: int, z: int) -> int:
	var b: Variant = KernStage.bandGrenzen(welt.stage, x)
	if b == null:
		return z
	var d: Dictionary = b
	return mini(d["oben"] as int, maxi(d["unten"] as int, z))


## Hindernis (der Stage oder ein Behälter), das die Lage (x, z) in Höhe h sperrt, sonst null.
static func sperrendesHindernis(b: KernStage.Begrenzung, x: int, z: int, h: int) -> KernStage.Hindernis:
	for hi: KernStage.Hindernis in b.stage.hindernisse:
		if hi.hoehe > h and KernStage.inHindernis(hi, x, z):
			return hi
	for hi: KernStage.Hindernis in b.zusatz:
		if hi.hoehe > h and KernStage.inHindernis(hi, x, z):
			return hi
	return null


## Ein Schritt des Gegners zum Ziel (zielX, zielZ) in ganzen Pixeln (Welt 5.3):
## Sektor aus Δx, Δz; in z höchstens bis zum Ziel; nurZ: nur in der Tiefe.
## Setzt g.x, g.z. Gibt zurück, ob der Schritt in x blockiert war.
static func gehen(welt: KernWelt, g: KernEntitaeten.Gegner, zielX: int, zielZ: int, t: Tempo, nurZ: bool = false) -> bool:
	var dx: int = 0 if nurZ else zielX - KernFestkomma.ganz(g.x)
	var dz: int = zielZ - KernFestkomma.ganz(g.z)
	var s: Dictionary = gehSchritt(t, dx, dz)
	var sx: int = s["sx"]
	var sz: int = s["sz"]
	var rest: int = KernFestkomma.sub(KernFestkomma.ausGanz(zielZ), g.z)
	if sz > 0:
		sz = mini(sz, rest) if rest > 0 else 0
	elif sz < 0:
		sz = maxi(sz, rest) if rest < 0 else 0
	var b: KernStage.Begrenzung = gegnerBegrenzung(welt)
	var r: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(b, g.x, g.z, g.h, sx, sz)
	if r.blockiert_x and sx != 0:
		var hi: KernStage.Hindernis = sperrendesHindernis(b, KernFestkomma.ganz(KernFestkomma.add(g.x, sx)), KernFestkomma.ganz(g.z), KernFestkomma.ganz(g.h))
		if hi != null:
			# Unendlich in TypeScript: hier große ganze Zahlen (Punkte liegen weit darunter).
			var zMin: int = 1 << 60
			var zMax: int = -(1 << 60)
			for p: KernStage.Punkt in hi.punkte:
				zMin = mini(zMin, p.z)
				zMax = maxi(zMax, p.z)
			var zg: int = KernFestkomma.ganz(g.z)
			var richtung: int = -1 if zg - zMin <= zMax - zg else 1
			r = KernStage.schrittBegrenzt(b, r.x, g.z, g.h, 0, KernFestkomma.neg(tiefenTempo(t)) if richtung < 0 else tiefenTempo(t))
	g.x = r.x
	g.z = r.z
	return r.blockiert_x


## Ist g weniger als tol (Fest) in x und in z von (x, z) (ganze Pixel) entfernt?
static func nahAn(g: KernEntitaeten.Gegner, x: int, z: int, tol: int) -> bool:
	return KernFestkomma.abs(KernFestkomma.sub(g.x, KernFestkomma.ausGanz(x))) < tol and KernFestkomma.abs(KernFestkomma.sub(g.z, KernFestkomma.ausGanz(z))) < tol
