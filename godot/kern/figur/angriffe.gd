# Angriffsinstanzen der Spielfigur (K1) nach docs/spezifikation-kampf.md,
# 5.2 (Flächen, Schaden, Umwerfen), 5.3 (aktive Frames nach der Aktionsuhr,
# Stoppframes), 5.6 (Ausfallschritt), 6.5 (Landung beim Neueinstieg),
# 8 (Kniestoß, Wurf, geworfener Gegner), 9.3 (Sprint-Sprungangriff), 9.4
# (Spezialangriff mit wachsender Fläche), 10.3 (Raketenexplosion).
# Port von spiel/src/kern/figur/angriffe.ts.
#
# Schnittstelle zu treffer.gd (K2): Die Figur legt ihre Instanz in
# figur.angriff an, setzt aktiv vor KS6 für jeden Frame (false in
# Stoppframes) und entfernt sie am Ende. Flächen nach entitaeten.gd Flaeche;
# hoehe_angreifer_max ist die Grenze ⌊h⌋ der Figur (0 = nur am Boden).
#
# Abweichungen der Schreibweise: Die Flächen werden mit
# KernEntitaeten.flaeche({...}) aus einem Dictionary mit den Feldnamen der
# TypeScript-Fassung erzeugt, die Instanzen mit KernEntitaeten.angriffsinstanz.
# Der Rückgabewert von ketteFenster ist ein Dictionary mit den Schlüsseln von
# und bis.
class_name KernFigurAngriffe
extends RefCounted

## Codes der Kettenstufen 1 bis 4 (Kampf 5.2).
const KETTE_CODES: Array[String] = ["KT1", "KT2", "KT3", "KT4"]


## Eintrag i einer Wertetabelle (Index geprüft).
static func tab(werte: Array, i: int) -> int:
	if i < 0 or i >= werte.size():
		push_error("Tabellenindex %d außerhalb (Länge %d)" % [i, werte.size()])
		return 0
	return werte[i] as int


## Sprungangriff-Werte je Variante (Kampf 5.2).
static func sprungWerte(v: String) -> Dictionary:
	match v:
		"R":
			return KernWerte.SPRUNGANGRIFF["R"]
		"H":
			return KernWerte.SPRUNGANGRIFF["H"]
		"T":
			return KernWerte.SPRUNGANGRIFF["T"]
		_:
			return KernWerte.SPRUNGANGRIFF["N"]


# ===========================================================================
# Instanzen anlegen (Schaden steht beim Angriffsbeginn fest)
# ===========================================================================

## Kettenstufe 1 bis 4 (Kampf 5.2): Boden, Tiefe 12, hinten je nach Blick des Ziels (K8), Stufe 4 wirft um.
static func ketteInstanz(stufe: int, beginn: int) -> KernEntitaeten.Angriffsinstanz:
	var i: int = stufe - 1
	if i < 0 or i >= KETTE_CODES.size():
		push_error("Kettenstufe %d" % stufe)
		return null
	var code: String = KETTE_CODES[i]
	return KernEntitaeten.angriffsinstanz({
		"code": code,
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "abstand",
			"vorn": tab(KernWerte.KETTE_VORN, i),
			"hinten": tab(KernWerte.KETTE_HINTEN, i),
			"hinten_weg": tab(KernWerte.KETTE_HINTEN_WEG, i),
			"tiefe": KernWerte.KETTE_TIEFE,
			"hoehe_angreifer_max": 0,
			"hoehe_ziel_max": null,
		}),
		"schaden": tab(KernWerte.KETTE_SCHADEN, i),
		"umwerfen": stufe == KernWerte.KOMBO_MAX,
		"richtung": "blick",
		"trefferstopp": true,
		"gegen": "gegner",
		"beginn": beginn,
	})


## Sprungangriff N, R, H oder T (Kampf 5.2): Höhengrenze der Figur je Variante.
static func sprungangriffInstanz(v: String, beginn: int) -> KernEntitaeten.Angriffsinstanz:
	var w: Dictionary = sprungWerte(v)
	return KernEntitaeten.angriffsinstanz({
		"code": w["code"],
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "abstand", "vorn": w["vorn"], "hinten": w["hinten"], "hinten_weg": null,
			"tiefe": w["tiefe"], "hoehe_angreifer_max": w["hoehe_max"], "hoehe_ziel_max": null,
		}),
		"schaden": w["schaden"],
		"umwerfen": w["umwerfen"],
		"richtung": "blick",
		"trefferstopp": true,
		"gegen": "gegner",
		"beginn": beginn,
	})


## Sprintangriff SA (Kampf 5.2, 9.3).
static func sprintangriffInstanz(beginn: int) -> KernEntitaeten.Angriffsinstanz:
	var w: Dictionary = KernWerte.SPRINTANGRIFF
	return KernEntitaeten.angriffsinstanz({
		"code": w["code"],
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "abstand", "vorn": w["vorn"], "hinten": w["hinten"], "hinten_weg": null,
			"tiefe": w["tiefe"], "hoehe_angreifer_max": 0, "hoehe_ziel_max": null,
		}),
		"schaden": w["schaden"],
		"umwerfen": w["umwerfen"],
		"richtung": "blick",
		"trefferstopp": true,
		"gegen": "gegner",
		"beginn": beginn,
	})


## Sprint-Sprungangriff SS (Kampf 5.2, 9.3, P7, E15): 38 bis 147 px vor der Figur; Höhengrenze je aktivem Frame.
static func ssInstanz(beginn: int) -> KernEntitaeten.Angriffsinstanz:
	var w: Dictionary = KernWerte.SPRINT_SPRUNGANGRIFF
	return KernEntitaeten.angriffsinstanz({
		"code": w["code"],
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "abstand", "vorn": w["vorn"], "hinten": w["hinten"], "hinten_weg": null,
			"tiefe": w["tiefe"], "hoehe_angreifer_max": KernWerte.SS_ERSTER_HOEHE_MAX, "hoehe_ziel_max": null,
		}),
		"schaden": w["schaden"],
		"umwerfen": w["umwerfen"],
		"richtung": "blick",
		"trefferstopp": true,
		"gegen": "gegner",
		"beginn": beginn,
	})


## Spezialangriff SP (Kampf 5.2, 9.4): Fläche der Stufe 1, wächst je Stufe; Umwerfen von der Figur weg.
static func spezialInstanz(beginn: int) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "SP",
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "abstand",
			"vorn": tab(KernWerte.SPEZIAL_VORN, 0),
			"hinten": tab(KernWerte.SPEZIAL_HINTEN, 0),
			"hinten_weg": null,
			"tiefe": KernWerte.SPEZIAL_TIEFE,
			"hoehe_angreifer_max": 0,
			"hoehe_ziel_max": null,
		}),
		"schaden": KernWerte.SPEZIAL_SCHADEN,
		"umwerfen": true,
		"richtung": "weg",
		"trefferstopp": true,
		"gegen": "gegner",
		"beginn": beginn,
	})


## Kniestoß KN (Kampf 5.2, 8.3): nur der gehaltene Gegner; der dritte wirft um (Bahn F2 in Blickrichtung).
static func knieInstanz(ziel: String, umwerfen: bool, beginn: int) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "KN",
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({ "art": "gehalten" }),
		"schaden": KernWerte.KNIESTOSS_SCHADEN,
		"umwerfen": umwerfen,
		"bahn": "F2" if umwerfen else "",
		"richtung": "blick",
		"trefferstopp": false,
		"ziel": ziel,
		"gegen": "gegner",
		"behaelter": false,
		"beginn": beginn,
	})


## Wurf WU (Kampf 5.2, 8.4): nur der gehaltene Gegner in E+1, Bahn F3 in Wurfrichtung (figur.bahn_richtung).
static func wurfInstanz(ziel: String, beginn: int) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "WU",
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({ "art": "gehalten" }),
		"schaden": KernWerte.WURF_SCHADEN,
		"umwerfen": true,
		"bahn": "F3",
		"richtung": "bahn",
		"trefferstopp": false,
		"ziel": ziel,
		"gegen": "gegner",
		"behaelter": false,
		"beginn": beginn,
	})


## Geworfener Gegner WG (Kampf 5.2, 8.5, P8): |dx| ≤ 52, |dz| ≤ 17 um den Geworfenen, F1 in seiner Flugrichtung.
static func wgInstanz(geworfener: String, beginn: int) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "WG",
		"angreifer": geworfener,
		"urheber": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "umkreis", "halbbreite": KernWerte.WG_HALBBREITE, "tiefe": KernWerte.WG_TIEFE, "hoehe_ziel_max": null,
		}),
		"schaden": KernWerte.WG_SCHADEN,
		"umwerfen": true,
		"richtung": "bahn",
		"trefferstopp": false,
		"gegen": "gegner",
		"beginn": beginn,
	})


## Landung beim Neueinstieg LN (Kampf 6.5, P30): jeder wache Gegner im Bild, 5 LP, Boss 10 LP, F1 von der Figur weg.
static func landungInstanz(beginn: int) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "LN",
		"angreifer": "f",
		"flaeche": KernEntitaeten.flaeche({ "art": "bild" }),
		"schaden": KernWerte.NEUEINSTIEG_LANDUNG_SCHADEN,
		"schaden_boss": KernWerte.NEUEINSTIEG_LANDUNG_SCHADEN_BOSS,
		"umwerfen": true,
		"richtung": "weg",
		"trefferstopp": false,
		"gegen": "gegner",
		"behaelter": false,
		"beginn": beginn,
	})


## Raketenexplosion RX am Geschossslot (Kampf 5.2, 10.3, P9, E14): Einschlag
## −66 bis +90 in Flugrichtung, Tiefe 28, 8 LP, F1 in Flugrichtung
## (bahn_richtung der Rakete), zerbricht Behälter.
static func explosionInstanz(rakete: String, x: int, z: int, richtung: int, beginn: int) -> KernEntitaeten.Angriffsinstanz:
	return KernEntitaeten.angriffsinstanz({
		"code": "RX",
		"angreifer": rakete,
		"urheber": "f",
		"flaeche": KernEntitaeten.flaeche({
			"art": "punkt", "x": x, "z": z, "richtung": richtung, "vorn": KernWerte.RX_VORN,
			"hinten": KernWerte.RX_HINTEN, "tiefe": KernWerte.RX_TIEFE, "ziel_blick_versatz": 0, "hoehe_ziel_max": null,
		}),
		"schaden": KernWerte.RX_SCHADEN,
		"umwerfen": true,
		"richtung": "bahn",
		"trefferstopp": false,
		"gegen": "gegner",
		"beginn": beginn,
	})


# ===========================================================================
# Aktive Frames (Kampf 5.3: nach der Aktionsuhr, nicht in Stoppframes)
# ===========================================================================

## Index der Flächenstufe des Spezialangriffs zur Aktionsuhr (Kampf 9.4), −1 außerhalb.
static func spezialStufe(uhr: int) -> int:
	if uhr > KernWerte.SPEZIAL_AKTIV_BIS:
		return -1
	var k: int = -1
	for i in range(KernWerte.SPEZIAL_STUFE_VON.size()):
		if uhr >= tab(KernWerte.SPEZIAL_STUFE_VON, i):
			k = i
	return k


## Erster und letzter aktiver Frame (Aktionsuhr) der Kettenstufe, mit Ausfallschritt (Kampf 5.2, 5.6).
## Rückgabe: Dictionary mit den Schlüsseln von und bis.
static func ketteFenster(stufe: int, ausfall: int) -> Dictionary:
	var i: int = stufe - 1
	if ausfall > 0:
		return { "von": tab(KernWerte.AUSFALL_AKTIV_VON, i), "bis": tab(KernWerte.AUSFALL_AKTIV_BIS, i) }
	return { "von": tab(KernWerte.KETTE_AKTIV_VON, i), "bis": tab(KernWerte.KETTE_AKTIV_BIS, i) }


## Ist die Kettenstufe in diesem Frame aktiv (Kampf 5.2: Stufe 4 ohne Treffer erneut uhr 17 bis 20)?
static func ketteAktiv(welt: KernWelt) -> bool:
	var f: KernEntitaeten.Figur = welt.figur
	if f.aktion != "SCHLAG" and f.aktion != "LEERSCHLAG":
		return false
	if f.ausfallschritt < 0:
		return false
	var w: Dictionary = ketteFenster(f.kombo, f.ausfallschritt)
	if f.uhr >= (w["von"] as int) and f.uhr <= (w["bis"] as int):
		return true
	return f.kombo == KernWerte.KOMBO_MAX and f.treffer_h == 0 and f.uhr >= KernWerte.KETTE4_ZWEITES_FENSTER_VON and f.uhr <= KernWerte.KETTE4_ZWEITES_FENSTER_BIS


## Setzt figur.angriff.aktiv für diesen Frame (vor KS6). In Stoppframes prüft
## die Instanz nicht (Kampf 5.3). Beim Spezialangriff wächst die Fläche je
## Stufe (9.4), beim Sprint-Sprungangriff gilt je Abschnitt eine eigene
## Höhengrenze (9.3).
static func angriffAktivSetzen(welt: KernWelt, stoppframe: bool) -> void:
	var f: KernEntitaeten.Figur = welt.figur
	var a: KernEntitaeten.Angriffsinstanz = f.angriff
	if a == null:
		return
	if stoppframe:
		a.aktiv = false
		return
	match a.code:
		"KT1", "KT2", "KT3", "KT4":
			a.aktiv = ketteAktiv(welt)
			return
		"SN", "SR", "SH", "ST":
			var w: Dictionary = sprungWerte(f.sprung_variante)
			a.aktiv = f.aktion == "SPRUNGANGRIFF" and f.uhr >= (w["aktiv_von"] as int) and f.uhr <= (w["aktiv_bis"] as int) and f.h > 0
			return
		"SA":
			a.aktiv = f.aktion == "SPRINTANGRIFF" and f.uhr >= (KernWerte.SPRINTANGRIFF["aktiv_von"] as int) and f.uhr <= (KernWerte.SPRINTANGRIFF["aktiv_bis"] as int)
			return
		"SS":
			var fl: KernEntitaeten.Flaeche = a.flaeche
			if f.ss_n == KernWerte.SS_ERSTER_AKTIV:
				a.aktiv = true
				if fl.art == "abstand":
					fl.hoehe_angreifer_max = KernWerte.SS_ERSTER_HOEHE_MAX
			elif f.ss_n >= KernWerte.SS_ZWEITER_AKTIV_VON and f.ss_n <= KernWerte.SS_ZWEITER_AKTIV_BIS:
				a.aktiv = true
				if fl.art == "abstand":
					fl.hoehe_angreifer_max = KernWerte.SS_ZWEITER_HOEHE_MAX
			else:
				a.aktiv = false
			return
		"SP":
			var k: int = spezialStufe(f.uhr) if f.aktion == "SPEZIAL" else -1
			a.aktiv = k >= 0
			if k >= 0 and a.flaeche.art == "abstand":
				a.flaeche.vorn = tab(KernWerte.SPEZIAL_VORN, k)
				a.flaeche.hinten = tab(KernWerte.SPEZIAL_HINTEN, k)
			return
		"KN":
			a.aktiv = f.aktion == "KNIESTOSS" and f.uhr == KernWerte.KNIESTOSS_TREFFER
			return
		"WU":
			a.aktiv = f.aktion == "WURF" and f.uhr == KernWerte.WURF_TREFFER
			return
		"LN":
			a.aktiv = welt.frame == f.landung_ln
			return
		_:
			a.aktiv = false
