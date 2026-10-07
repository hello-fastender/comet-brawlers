## Zuordnung Aktion/Aktionsuhr der Logik → Bild eines Video-Clips von Vela (Weg „Vela als Video“,
## docs/grafik-bestellung.md; Umsetzer werkzeuge/video_umsetzer.gd, Clipdaten `clip.txt`).
##
## Die Logik bleibt Taktgeber: `f.uhr` (Frames seit Aktionsbeginn ohne Stoppframes, Beginn 1) wird auf die
## Bildnummer des Clips abgebildet. In Trefferstoppframes steht `uhr`, deshalb hält das Bild. Alles sind
## reine Funktionen (Uhr, Clipdaten) → Bildindex, nur Ganzzahlen, ohne Zufall und ohne Zustand. Es wird nie
## gemischt oder überblendet: jeder Tick zeigt genau ein Quellbild (Auswahl, Überspringen, Wiederholen).
##
## Bildindizes sind 0-basiert (Bild 0 = f_0001.png). Die Clipdaten (`clip_lesen`) enthalten ebenfalls
## 0-basierte Indizes (clip.txt ist 1-basiert wie die Dateinamen).
##
## Schleifenclips (stand, gehen): Der Zyklus aus n Quellbildern ab `zyklus_start` wird auf `zyklus_ticks`
##   Ticks gespreizt: Bild = start + ((uhr − 1) mod T) · n / T. Gehen: T aus der Schrittlänge im Clip (der Umsetzer
##   schreibt `zyklus_ticks`, Doppelschritt = 2 · Schritt bei LAUF_X · 2 Bildpixel je Tick, damit der Standfuß nicht
##   rutscht), Vorgabe 24 Ticks. Stand: Echtzeit (60 Ticks je Sekunde gegen die Bildrate der Quelle).
## Schlagclips (kette1 bis kette4): Ereignisse des Clips auf die Zeiten der Logik:
##   Uhr 1 bis KETTE_AKTIV_VON − 1: die Bilder von „Ausholen-Ende“ bis vor den „Kontakt“ (Mittelwertauswahl),
##   Uhr KETTE_AKTIV_VON bis KETTE_AKTIV_BIS: das Kontaktbild (steht im ersten aktiven Frame, hält bis zum letzten),
##   danach bis zum Ende der Aktion (Dauer laut KernWerte): vom „Rückzug“ (letztes Bild der vollen Streckung; hält der
##   Clip den Arm lange gestreckt, werden diese Haltebilder übersprungen) bis zur „Ruhe“ (Kampfhaltung). Endet der
##   Clip ohne Rückkehr (`rueckkehr=rueckwaerts`), ist die Ruhe das erste Bild des Clips und der Start das Kontaktbild:
##   die Rückkehr läuft dann rückwärts über dieselben Bilder, schneller als das Ausholen vorwärts. Nach der Dauer hält
##   die Ruhe.
class_name DarstellungVelaFramesTabelle
extends RefCounted

## Vorgabe der Gehschleife: Ticks je Doppelschritt, wenn im Clip nicht messbar.
const GEHEN_TICKS_STANDARD: int = 24
const GEHEN_TICKS_MIN: int = 12
const GEHEN_TICKS_MAX: int = 60
## Bilder je Sekunde der Logik.
const TICKS_JE_SEKUNDE: int = 60


# ---------------------------------------------------------------------------
# Clipdaten (clip.txt)
# ---------------------------------------------------------------------------

## Liest clip.txt. Rückgabe: Dictionary mit
##   name, bilder, breite, hoehe, ankerx, ankery, massstab (float), fps (int, 0 unbekannt), farben,
##   zyklus_bilder, zyklus_start, zyklus_ticks, ausholen, kontakt, rueckzug, ruhe (0-basiert), rueckkehr
##   („vorwaerts“ oder „rueckwaerts“), unscharf (Array[int], 0-basiert); leer, wenn Pflichtfelder fehlen.
static func clip_lesen(text: String) -> Dictionary:
	var roh: Dictionary = {}
	for zeile: String in text.split("\n"):
		var z: String = zeile.strip_edges()
		if z == "" or z.begins_with("#"):
			continue
		var p: int = z.find("=")
		if p <= 0:
			continue
		roh[z.substr(0, p)] = z.substr(p + 1)
	for k: String in ["bilder", "groesse", "anker"]:
		if not roh.has(k):
			return {}
	var gr: PackedStringArray = String(roh["groesse"]).split(",")
	var an: PackedStringArray = String(roh["anker"]).split(",")
	if gr.size() != 2 or an.size() != 2:
		return {}
	var d: Dictionary = {}
	d["name"] = String(roh.get("name", ""))
	d["bilder"] = int(roh["bilder"])
	d["breite"] = int(gr[0])
	d["hoehe"] = int(gr[1])
	d["ankerx"] = int(an[0])
	d["ankery"] = int(an[1])
	d["massstab"] = float(roh.get("massstab", "0"))
	d["fps"] = roundi(float(roh.get("fps", "0")))
	d["farben"] = int(roh.get("farben", "0"))
	d["zyklus_bilder"] = int(roh.get("zyklus_bilder", "0"))
	d["zyklus_start"] = maxi(int(roh.get("zyklus_start", "1")) - 1, 0)
	d["zyklus_ticks"] = int(roh.get("zyklus_ticks", "0"))
	d["ausholen"] = maxi(int(roh.get("ausholen", "1")) - 1, 0)
	d["kontakt"] = maxi(int(roh.get("kontakt", "1")) - 1, 0)
	d["rueckzug"] = maxi(int(roh.get("rueckzug", roh.get("kontakt", "1"))) - 1, 0)
	d["ruhe"] = maxi(int(roh.get("ruhe", "1")) - 1, 0)
	d["rueckkehr"] = String(roh.get("rueckkehr", "vorwaerts"))
	var u: Array[int] = []
	for s: String in String(roh.get("unscharf", "")).split(",", false):
		u.append(int(s) - 1)
	d["unscharf"] = u
	return d


# ---------------------------------------------------------------------------
# Aktion → Clip
# ---------------------------------------------------------------------------

## Name des Clips zur Aktion der Figur („“ = keiner vorgesehen). Kettenstufe 1 bis 4 nur bei SCHLAG/LEERSCHLAG.
static func clip_name(aktion: String, stufe: int) -> String:
	match aktion:
		"STAND":
			return "stand"
		"LAUF":
			return "gehen"
		"SCHLAG", "LEERSCHLAG":
			return "kette%d" % clampi(stufe, 1, KernWerte.KOMBO_MAX)
	return ""


## Kettenstufe 1 bis 4 aus dem Clipnamen (Endziffer eines Namens mit „kette“), sonst 0.
static func stufe_aus_name(name: String) -> int:
	if not name.contains("kette") or name.length() == 0:
		return 0
	var z: String = name.substr(name.length() - 1)
	if z.is_valid_int() and int(z) >= 1 and int(z) <= KernWerte.KOMBO_MAX:
		return int(z)
	return 0


## Dauer der Kette in Aktionsuhren (Ticks) nach KernWerte: 16, 16, 17, 25.
static func kette_dauer(stufe: int) -> int:
	match stufe:
		1:
			return KernWerte.LEERSCHLAG_DAUER
		2:
			return KernWerte.KETTE2_LEER_DAUER
		3:
			return KernWerte.KETTE3_LEER_DAUER
	return KernWerte.KETTE4_DAUER


# ---------------------------------------------------------------------------
# Uhr → Bildindex
# ---------------------------------------------------------------------------

## Ticks, über die sich der Zyklus eines Schleifenclips erstreckt.
static func zyklus_ticks(name: String, d: Dictionary) -> int:
	if name.contains("gehen"):
		var t: int = int(d.get("zyklus_ticks", 0))
		if t <= 0:
			return GEHEN_TICKS_STANDARD
		return clampi(t, GEHEN_TICKS_MIN, GEHEN_TICKS_MAX)
	# Echtzeit: n Bilder mit der Bildrate der Quelle
	var n: int = maxi(zyklus_laenge(d), 1)
	var fps: int = int(d.get("fps", 0))
	if fps <= 0:
		return n
	return maxi(1, (n * TICKS_JE_SEKUNDE + fps / 2) / fps)


## Bilder des Zyklus (ab `zyklus_start`), begrenzt auf den Clip.
static func zyklus_laenge(d: Dictionary) -> int:
	var bilder: int = int(d["bilder"])
	var start: int = clampi(int(d.get("zyklus_start", 0)), 0, maxi(bilder - 1, 0))
	var n: int = int(d.get("zyklus_bilder", 0))
	if n <= 0:
		n = bilder
	return clampi(n, 1, bilder - start)


## Schleife: Bildindex zur Uhr (Beginn 1). Jedes Zyklusbild bekommt gleich viele Ticks (± 1); nach T Ticks
## beginnt der Zyklus von vorn (schließt, weil der Umsetzer den Start mit dem kleinsten Schließfehler wählt).
static func schleife(uhr: int, ticks: int, start: int, n: int) -> int:
	var t: int = maxi(ticks, 1)
	var u: int = posmod(maxi(uhr, 1) - 1, t)
	return start + u * n / t


## Ganzzahldivision mit Abrunden (auch für negative Zähler).
static func _abrunden(a: int, b: int) -> int:
	var q: int = a / b
	if a % b != 0 and (a < 0) != (b < 0):
		q -= 1
	return q


## Schlagclip (kette1 bis kette4): Bildindex zur Uhr (Beginn 1), Dauer und aktive Frames aus KernWerte.
static func schlag(uhr: int, stufe: int, d: Dictionary) -> int:
	var s: int = clampi(stufe, 1, KernWerte.KOMBO_MAX)
	var von: int = KernWerte.KETTE_AKTIV_VON[s - 1]
	var bis: int = KernWerte.KETTE_AKTIV_BIS[s - 1]
	var dauer: int = kette_dauer(s)
	var bilder: int = int(d["bilder"])
	var kontakt: int = clampi(int(d["kontakt"]), 0, bilder - 1)
	var ausholen: int = clampi(int(d["ausholen"]), 0, kontakt)
	var ruhe: int = clampi(int(d["ruhe"]), 0, bilder - 1)
	var rueck_start: int = clampi(int(d.get("rueckzug", kontakt)), kontakt, bilder - 1)
	if String(d.get("rueckkehr", "vorwaerts")) == "rueckwaerts":
		ruhe = 0
		rueck_start = kontakt
	elif rueck_start > ruhe:
		rueck_start = kontakt
	var u: int = clampi(uhr, 1, dauer)
	if u < von:
		# Ausholen bis kurz vor dem Kontakt: von − 1 Ticks, Mitte jedes Abschnitts
		var n_vor: int = von - 1
		if kontakt <= ausholen:
			return ausholen
		var i: int = ausholen + (2 * (u - 1) + 1) * (kontakt - ausholen) / (2 * n_vor)
		return mini(i, kontakt - 1)
	if u <= bis:
		return kontakt
	# Rest: vom Rückzug zur Ruhe über die verbleibenden Ticks, im letzten Tick ist die Ruhe erreicht. Im ersten Tick
	# nach den aktiven Frames steht schon ein Bild des Rückzugs, das Kontaktbild gilt nur bis zum letzten aktiven Frame.
	var n_rest: int = dauer - bis
	var j: int = u - bis
	return rueck_start + _abrunden(2 * j * (ruhe - rueck_start) + n_rest, 2 * n_rest)


## Bildindex für einen Clip nach Name (Schlagclips: Name mit „kette“ und Stufe 1 bis 4) und Aktionsuhr.
static func bildindex(name: String, uhr: int, d: Dictionary) -> int:
	var stufe: int = stufe_aus_name(name)
	var bilder: int = int(d["bilder"])
	var i: int = 0
	if stufe > 0:
		i = schlag(uhr, stufe, d)
	else:
		i = schleife(uhr, zyklus_ticks(name, d), clampi(int(d.get("zyklus_start", 0)), 0, bilder - 1), zyklus_laenge(d))
	return clampi(i, 0, bilder - 1)


## Alle Bildindizes einer Aktion von Uhr 1 bis `bis` (Kontaktbögen, GIFs, Tests).
static func verlauf(name: String, bis: int, d: Dictionary) -> Array[int]:
	var a: Array[int] = []
	for u: int in range(1, bis + 1):
		a.append(bildindex(name, u, d))
	return a
