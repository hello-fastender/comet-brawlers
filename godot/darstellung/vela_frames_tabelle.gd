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
## Zuordnung Aktion → Clip (Tabelle; Zeiten aus KernWerte, die Logik bleibt maßgeblich; `wahl` liefert sie je Figur):
##   STAND                          stand           Schleife (Echtzeit), bei `schleife=pingpong` hin und her
##   LAUF                           gehen           Schleife, Dauer aus der Schrittlänge (zyklus_ticks)
##   SPRINT                         sprint          Schleife nach der zurückgelegten Strecke (sprint_bild): kein Rutschen
##   SCHLAG, LEERSCHLAG             kette1 … 4      schlag (Kette 4 mit zwei Fenstern, wenn der Clip `kontakt1` hat)
##   SPRUNG                         sprung          sprung: uhr 1 Hocke; 2 bis 21 Absprung bis Scheitel; 22 bis 41 bis zum
##                                                   letzten Luftbild; (nach einem Sprungangriff aus vh rückgerechnet)
##   LANDUNG                        sprung          landung: Aufsetzen bis Aufrichten über LANDUNG_DAUER (6) Ticks
##   GETROFFEN                      getroffen_vorn  treffer: Auslenkung früh (uhr 3 bis 6), Rückkehr bis uhr 27;
##                                                   nur wenn der Angreifer vorn steht (G1-11), sonst Puppe/Platzhalter
##   UMGEWORFEN                     umgeworfen      flug: Stillstand uhr 1 bis 9, Flug nach bahn_frame, Aufprall im
##                                                   Bodenkontaktframe (bahn_boden), danach 7 Ticks bis zum Liegen
##   TOT                            umgeworfen,     wie UMGEWORFEN mit dem Stillstand von F4 (2); ab der Ruhe (phase R)
##                                  liegen          das Liegebild
##   LIEGEN                         liegen          hält das Bild
##   AUFSTEHEN                      aufstehen       uhr 1 bis 26 gleichmäßig über den Clip bis zur Kampfhaltung
##   SPRUNGANGRIFF, SPRINTSPRUNG, NEUEINSTIEG und alle übrigen: kein Clip (Puppe, sonst Platzhalter).
## UMGEWORFEN, TOT, LIEGEN und AUFSTEHEN zeigen den Clip so gespiegelt, dass der Flug in `bahn_richtung` geht (der Clip
## fliegt nach links, Blick des Clips nach rechts): Blick = −bahn_richtung (G1-12, G7-10).
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
##   („vorwaerts“ oder „rueckwaerts“), unscharf (Array[int], 0-basiert), schritt_px, schleife („“ oder „pingpong“),
##   ereignis (Dictionary Name → Bildnummer 0-basiert aus den Zeilen `ereignis_<name>`: hocke, absprung, scheitel,
##   aufsetzen, tief, ruhe; start, kontakt, rueckzug; abheben, aufprall, liegt; kontakt1 …), kontakt1 (erstes
##   Trefferfenster der Kette 4, sonst gleich kontakt); leer, wenn Pflichtfelder fehlen.
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
	d["schritt_px"] = int(roh.get("schritt_px", "0"))
	d["schleife"] = String(roh.get("schleife", ""))
	var ev: Dictionary = {}
	for k: String in roh:
		if k.begins_with("ereignis_") and k != "ereignis_metrik":
			ev[k.substr(9)] = maxi(int(roh[k]) - 1, 0)
	d["ereignis"] = ev
	d["kontakt1"] = int(ev.get("kontakt1", d["kontakt"]))
	return d


# ---------------------------------------------------------------------------
# Aktion → Clip
# ---------------------------------------------------------------------------

## Name des Clips zur Aktion der Figur („“ = keiner vorgesehen). Kettenstufe 1 bis 4 nur bei SCHLAG/LEERSCHLAG. TOT nennt
## `umgeworfen`; ab der Ruhe zeigt `wahl` das Liegebild.
static func clip_name(aktion: String, stufe: int) -> String:
	match aktion:
		"STAND":
			return "stand"
		"LAUF":
			return "gehen"
		"SCHLAG", "LEERSCHLAG":
			return "kette%d" % clampi(stufe, 1, KernWerte.KOMBO_MAX)
		"SPRINT":
			return "sprint"
		"SPRUNG", "LANDUNG":
			return "sprung"
		"GETROFFEN":
			return "getroffen_vorn"
		"UMGEWORFEN", "TOT":
			return "umgeworfen"
		"LIEGEN":
			return "liegen"
		"AUFSTEHEN":
			return "aufstehen"
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
	if name.contains("gehen") or name.contains("sprint"):
		var t: int = int(d.get("zyklus_ticks", 0))
		if t <= 0:
			return GEHEN_TICKS_STANDARD
		return clampi(t, GEHEN_TICKS_MIN, GEHEN_TICKS_MAX)
	# Echtzeit: n Bilder mit der Bildrate der Quelle (hin und her: 2 · (n − 1) Bildschritte)
	var n: int = maxi(zyklus_laenge(d), 1)
	if String(d.get("schleife", "")) == "pingpong":
		n = maxi(2 * (n - 1), 1)
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


## Schleife hin und her: Der Zyklus (n Bilder) läuft vorwärts bis zum letzten Bild und rückwärts bis zum ersten; die
## Ticks T gelten für 2 · (n − 1) Bildschritte. Jedes Bild kommt auf der Strecke gleich oft vor (± 1).
static func hin_und_her(uhr: int, ticks: int, start: int, n: int) -> int:
	if n <= 1:
		return start
	var t: int = maxi(ticks, 1)
	var periode: int = 2 * (n - 1)
	var p: int = posmod(maxi(uhr, 1) - 1, t) * periode / t
	return start + (p if p <= n - 1 else periode - p)


## Ganzzahldivision mit Abrunden (auch für negative Zähler).
static func _abrunden(a: int, b: int) -> int:
	var q: int = a / b
	if a % b != 0 and (a < 0) != (b < 0):
		q -= 1
	return q


## Ablauf eines Schlags oder Treffers über `dauer` Ticks: Uhr 1 bis von − 1 die Bilder von „Ausholen-Ende“ bis vor den
## Kontakt (Mitte jedes Abschnitts), Uhr von bis `bis` das Kontaktbild, danach vom Rückzug bis zur Ruhe über die
## verbleibenden Ticks (im letzten Tick ist die Ruhe erreicht; im ersten nach den aktiven Frames steht schon ein Bild des
## Rückzugs).
static func _ablauf(uhr: int, von: int, bis: int, dauer: int, d: Dictionary) -> int:
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
	var n_rest: int = dauer - bis
	var j: int = u - bis
	return rueck_start + _abrunden(2 * j * (ruhe - rueck_start) + n_rest, 2 * n_rest)


## Schlagclip (kette1 bis kette4): Bildindex zur Uhr (Beginn 1), Dauer und aktive Frames aus KernWerte. Kette 4 mit
## `kontakt1` im Clip: zwei Fenster (KETTE_AKTIV_VON/BIS und KETTE4_ZWEITES_FENSTER_VON/BIS): davor vom ersten Bild bis
## zum ersten Kontaktbild, dazwischen die Drehung (Bilder zwischen den Kontakten), im zweiten Fenster der Tritt.
static func schlag(uhr: int, stufe: int, d: Dictionary) -> int:
	var s: int = clampi(stufe, 1, KernWerte.KOMBO_MAX)
	var von: int = KernWerte.KETTE_AKTIV_VON[s - 1]
	var bis: int = KernWerte.KETTE_AKTIV_BIS[s - 1]
	var dauer: int = kette_dauer(s)
	var kontakt: int = clampi(int(d["kontakt"]), 0, int(d["bilder"]) - 1)
	var k1: int = clampi(int(d.get("kontakt1", kontakt)), 0, kontakt)
	if s == KernWerte.KOMBO_MAX and k1 < kontakt:
		var von2: int = KernWerte.KETTE4_ZWEITES_FENSTER_VON
		var bis2: int = KernWerte.KETTE4_ZWEITES_FENSTER_BIS
		var u: int = clampi(uhr, 1, dauer)
		if u < von:
			var d1: Dictionary = d.duplicate()
			d1["ausholen"] = 0
			d1["kontakt"] = k1
			return _ablauf(u, von, bis, dauer, d1)
		if u <= bis:
			return k1
		if u < von2:
			return mini(k1 + (u - bis) * (kontakt - k1) / (von2 - bis), kontakt - 1)
		if u <= bis2:
			return kontakt
		var d2: Dictionary = d.duplicate()
		return _ablauf(u, von2, bis2, dauer, d2)
	return _ablauf(uhr, von, bis, dauer, d)


# ---------------------------------------------------------------------------
# Sprint, Sprung, Treffer, Flug, Liegen, Aufstehen
# ---------------------------------------------------------------------------

## Geschwindigkeit (16.16 Spielpixel je Tick) im Sprintframe n (Kampf 9.2): n = 1 wie Gehen, ab 2 3,875 − 0,125 · ⌊(n − 1) / 6⌋.
static func sprint_tempo(n: int) -> int:
	if n <= 1:
		return KernWerte.SPRINT_X_FRAME1
	return KernWerte.SPRINT_V_START - KernWerte.SPRINT_V_STUFE * ((n - 1) / KernWerte.SPRINT_STUFE_FRAMES)


## Strecke (16.16 Spielpixel), die die Figur in den Sprintframes 1 bis n zurückgelegt hat.
static func sprint_strecke(n: int) -> int:
	var summe: int = 0
	for k: int in range(1, n + 1):
		summe += sprint_tempo(k)
	return summe


## Sprint: Der Zyklus (Doppelschritt, n Bilder) läuft nach der zurückgelegten Strecke: eine Zyklenlänge entspricht
## `schritt_px` Spielpixeln (2 · Schrittlänge in Bildpixeln bei 2 Bildpixeln je Spielpixel), die Füße rutschen also nicht,
## auch wenn das Tempo mit den Sprintframes sinkt. Ohne Schrittlänge im Clip: die Schleife über die Zyklusdauer des Clips.
## Die Phase im Sprintframe n ist die Strecke bis zum Ende des Frames n − 1 (Sprintframe 1 zeigt das Startbild).
static func sprint_bild(sprint_n: int, d: Dictionary) -> int:
	var bilder: int = int(d["bilder"])
	var start: int = clampi(int(d.get("zyklus_start", 0)), 0, maxi(bilder - 1, 0))
	var n: int = zyklus_laenge(d)
	var z: int = int(d.get("schritt_px", 0)) * 65536
	if z <= 0:
		return clampi(schleife(sprint_n, zyklus_ticks("sprint", d), start, n), 0, bilder - 1)
	var p: int = sprint_strecke(maxi(sprint_n, 1) - 1) % z
	return clampi(start + p * n / z, 0, bilder - 1)


## Sprung: Sprunguhr u (Beginn 1 in J+1, Kampf 4.3/4.4) → Bild. u = 1 Hocke (am Boden), 2 (Absprung) bis 21 (Scheitel) vom
## Absprungbild zum Scheitelbild, 22 bis 41 (letzter Luftframe) zum letzten Bild vor dem Aufsetzen; danach hält es.
static func sprung(u: int, d: Dictionary) -> int:
	var bilder: int = int(d["bilder"])
	var ev: Dictionary = d["ereignis"]
	var absprung: int = clampi(int(ev.get("absprung", 0)), 0, bilder - 1)
	var scheitel: int = clampi(int(ev.get("scheitel", absprung)), absprung, bilder - 1)
	var aufsetzen: int = clampi(int(ev.get("aufsetzen", scheitel + 1)), scheitel + 1, bilder - 1)
	var hocke: int = clampi(int(ev.get("hocke", maxi(absprung - 1, 0))), 0, absprung)
	var uu: int = maxi(u, 1)
	if uu <= 1:
		return hocke
	if uu <= KernWerte.SPRUNG_SCHEITEL_FRAME:
		return absprung + (uu - KernWerte.SPRUNG_ABSPRUNG) * (scheitel - absprung) / (KernWerte.SPRUNG_SCHEITEL_FRAME - KernWerte.SPRUNG_ABSPRUNG)
	var v: int = mini(uu, KernWerte.SPRUNG_LETZTER_LUFTFRAME)
	return scheitel + (v - KernWerte.SPRUNG_SCHEITEL_FRAME) * (aufsetzen - 1 - scheitel) / (KernWerte.SPRUNG_LETZTER_LUFTFRAME - KernWerte.SPRUNG_SCHEITEL_FRAME)


## Sprunguhr aus der Sprunggeschwindigkeit (nach einem Sprungangriff beginnt `uhr` neu): vh sinkt je Luftframe um die
## Schwerkraft, der Absprung in J+2 (uhr 2) hat vh = Start − Schwerkraft.
static func sprung_uhr(uhr: int, vh: int, nach_angriff: bool) -> int:
	if not nach_angriff:
		return uhr
	return clampi((KernWerte.SPRUNG_VH_START - vh) / KernWerte.SPRUNG_SCHWERKRAFT + 1, 1, KernWerte.SPRUNG_LETZTER_LUFTFRAME)


## Landung: Landeuhr u (1 bis LANDUNG_DAUER, Aufsetzen in J+42) → Bild vom Aufsetzen bis zum Aufrichten (`ruhe`).
static func landung(u: int, d: Dictionary) -> int:
	var bilder: int = int(d["bilder"])
	var ev: Dictionary = d["ereignis"]
	var aufsetzen: int = clampi(int(ev.get("aufsetzen", 0)), 0, bilder - 1)
	var ruhe: int = clampi(int(ev.get("ruhe", bilder - 1)), aufsetzen, bilder - 1)
	var uu: int = clampi(u, 1, KernWerte.LANDUNG_DAUER)
	return aufsetzen + (uu - 1) * (ruhe - aufsetzen) / (KernWerte.LANDUNG_DAUER - 1)


## Treffer: eigene Darstellungsfestlegung (keine Spielmechanik): Die Auslenkung steht ab uhr TREFFER_KONTAKT_VON bis
## TREFFER_KONTAKT_BIS, danach die Rückkehr bis zum Ende von GETROFFEN (27 Frames, KernWerte.GETROFFEN_DAUER).
const TREFFER_KONTAKT_VON: int = 3
const TREFFER_KONTAKT_BIS: int = 6


static func treffer(u: int, d: Dictionary) -> int:
	var dd: Dictionary = d.duplicate()
	var ev: Dictionary = d["ereignis"]
	dd["ausholen"] = int(ev.get("start", 0))
	dd["kontakt"] = int(ev.get("kontakt", d["kontakt"]))
	dd["rueckzug"] = int(ev.get("rueckzug", dd["kontakt"]))
	dd["ruhe"] = int(ev.get("ruhe", int(d["bilder"]) - 1))
	dd["rueckkehr"] = "vorwaerts"
	return _ablauf(u, TREFFER_KONTAKT_VON, TREFFER_KONTAKT_BIS, KernWerte.GETROFFEN_DAUER, dd)


## Ticks vom Aufprall bis zum Liegen (die Bahn läuft bis zur Ruhe, 9 Frames; UMGEWORFEN endet 7 Frames nach dem Bodenkontakt,
## danach zeigt LIEGEN das Bild).
const FLUG_NACH_AUFPRALL: int = 7


## Flug (UMGEWORFEN, TOT): `uhr` (Beginn 1 im Treffer-Frame), Bahnframe, Bahnframe des Bodenkontakts (0 = noch in der
## Luft, Kampf 5.7, bahn.gd) und Stillstandsframes der Bahn (F1: 8, F4: 2).
##  Stillstand (bahn_frame 0): uhr 1 bis stillstand + 1 vom Treffer bis zum Abheben.
##  Flug (Bahnframe 1 bis F1_BODEN − F1_STILLSTAND − 1): vom Abheben bis vor den Aufprall; bleibt die Figur länger in der
##    Luft (Treffer aus der Luft), hält das letzte Luftbild.
##  Bodenkontakt (bahn_boden = bahn_frame): das Aufprallbild; danach FLUG_NACH_AUFPRALL Ticks bis zum Liegen.
static func flug(uhr: int, bahn_frame: int, bahn_boden: int, stillstand: int, d: Dictionary) -> int:
	var bilder: int = int(d["bilder"])
	var ev: Dictionary = d["ereignis"]
	var start: int = clampi(int(ev.get("start", 0)), 0, bilder - 1)
	var abheben: int = clampi(int(ev.get("abheben", start + 1)), start + 1, bilder - 1)
	var aufprall: int = clampi(int(ev.get("aufprall", abheben + 1)), abheben + 1, bilder - 1)
	var liegt: int = clampi(int(ev.get("liegt", bilder - 1)), aufprall, bilder - 1)
	if bahn_boden > 0:
		var m: int = clampi(bahn_frame - bahn_boden, 0, FLUG_NACH_AUFPRALL)
		return aufprall + m * (liegt - aufprall) / FLUG_NACH_AUFPRALL
	if bahn_frame >= 1:
		var luft: int = KernWerte.F1_BODEN - KernWerte.F1_STILLSTAND - 2
		var n: int = mini(bahn_frame - 1, luft)
		return abheben + n * (aufprall - 1 - abheben) / luft
	var u: int = clampi(uhr, 1, stillstand + 1)
	return start + (u - 1) * (abheben - 1 - start) / maxi(stillstand, 1)


## Aufstehen: Aktionsuhr 1 bis FIGUR_AUFSTEHEN_DAUER gleichmäßig vom ersten Bild (liegt wie `liegen`) bis zur Kampfhaltung.
static func aufstehen(u: int, d: Dictionary) -> int:
	var bilder: int = int(d["bilder"])
	var ev: Dictionary = d["ereignis"]
	var ruhe: int = clampi(int(ev.get("ruhe", bilder - 1)), 0, bilder - 1)
	var uu: int = clampi(u, 1, KernWerte.FIGUR_AUFSTEHEN_DAUER)
	return (uu - 1) * ruhe / (KernWerte.FIGUR_AUFSTEHEN_DAUER - 1)


## Bildindex für einen Clip nach Name und Aktionsuhr (Schlagclips: Name mit „kette“ und Stufe 1 bis 4; sprung: Sprunguhr;
## getroffen_vorn, aufstehen: Aktionsuhr; liegen hält das erste Bild; sonst Schleife, bei `schleife=pingpong` hin und her).
## Flug und Landung brauchen mehr als die Uhr: `flug`, `landung`.
static func bildindex(name: String, uhr: int, d: Dictionary) -> int:
	var stufe: int = stufe_aus_name(name)
	var bilder: int = int(d["bilder"])
	var i: int = 0
	if stufe > 0:
		i = schlag(uhr, stufe, d)
	elif name == "sprung":
		i = sprung(uhr, d)
	elif name == "getroffen_vorn":
		i = treffer(uhr, d)
	elif name == "aufstehen":
		i = aufstehen(uhr, d)
	elif name == "liegen":
		i = 0
	else:
		var start: int = clampi(int(d.get("zyklus_start", 0)), 0, bilder - 1)
		if String(d.get("schleife", "")) == "pingpong":
			i = hin_und_her(uhr, zyklus_ticks(name, d), start, zyklus_laenge(d))
		else:
			i = schleife(uhr, zyklus_ticks(name, d), start, zyklus_laenge(d))
	return clampi(i, 0, bilder - 1)


## Alle Bildindizes einer Aktion von Uhr 1 bis `bis` (Kontaktbögen, GIFs, Tests).
static func verlauf(name: String, bis: int, d: Dictionary) -> Array[int]:
	var a: Array[int] = []
	for u: int in range(1, bis + 1):
		a.append(bildindex(name, u, d))
	return a


# ---------------------------------------------------------------------------
# Wahl je Figur: Clip, Zeitgrößen, Blick
# ---------------------------------------------------------------------------

## Steht der letzte Angreifer vor der Figur (G1-11)? Vorzeichen von x_Angreifer − x_Figur gleich blick, bei Gleichheit vorn.
## Ohne Welt, ohne Angreifer oder bei einem verschwundenen Angreifer: vorn.
static func angreifer_vorn(f: KernEntitaeten.Figur, welt: KernWelt) -> bool:
	if welt == null or f.letzter_angreifer == null:
		return true
	var e: KernEntitaeten.EntitaetBasis = KernEntitaeten.entitaet(welt, f.letzter_angreifer as String)
	if e == null:
		return true
	var dx: int = KernFestkomma.ganz(e.x) - KernFestkomma.ganz(f.x)
	return dx == 0 or signi(dx) == f.blick


## Zuordnung Zustand der Figur → Clip und Zeitgrößen. Rückgabe ({} = kein Clip vorgesehen, Puppe oder Platzhalter):
##   clip, art (schleife, sprint, schlag, sprung, landung, treffer, flug, liegen, aufstehen), uhr, stufe (Schlag),
##   sprint_n, bahn_frame, bahn_boden, stillstand, blick (1 oder −1: Blick, mit dem der Clip gezeigt wird).
static func wahl(f: KernEntitaeten.Figur, welt: KernWelt = null) -> Dictionary:
	var u: int = maxi(f.uhr, 1)
	var flugblick: int = -f.bahn_richtung if f.bahn_richtung != 0 else -f.blick
	match f.aktion:
		"STAND":
			return {"clip": "stand", "art": "schleife", "uhr": u, "blick": f.blick}
		"LAUF":
			return {"clip": "gehen", "art": "schleife", "uhr": f.uhr, "blick": f.blick}
		"SPRINT":
			return {"clip": "sprint", "art": "sprint", "uhr": u, "sprint_n": maxi(f.sprint_n, 1), "blick": f.blick}
		"SCHLAG", "LEERSCHLAG":
			var stufe: int = DarstellungVelaPosen.kette_stufe(f)
			return {"clip": "kette%d" % stufe, "art": "schlag", "uhr": DarstellungVelaPosen.kette_uhr(f), "stufe": stufe, "blick": f.blick}
		"SPRUNG":
			return {"clip": "sprung", "art": "sprung", "uhr": sprung_uhr(u, f.vh, f.sprung_angriff), "blick": f.blick}
		"LANDUNG":
			return {"clip": "sprung", "art": "landung", "uhr": u, "blick": f.blick}
		"GETROFFEN":
			if not angreifer_vorn(f, welt):
				return {}
			return {"clip": "getroffen_vorn", "art": "treffer", "uhr": u, "blick": f.blick}
		"UMGEWORFEN":
			return {"clip": "umgeworfen", "art": "flug", "uhr": u, "bahn_frame": f.bahn_frame, "bahn_boden": f.bahn_boden, "stillstand": KernWerte.F1_STILLSTAND, "blick": flugblick}
		"TOT":
			if f.phase == "R":
				return {"clip": "liegen", "art": "liegen", "uhr": u, "blick": flugblick}
			return {"clip": "umgeworfen", "art": "flug", "uhr": u, "bahn_frame": f.bahn_frame, "bahn_boden": f.bahn_boden, "stillstand": KernWerte.F4_STILLSTAND, "blick": flugblick}
		"LIEGEN":
			return {"clip": "liegen", "art": "liegen", "uhr": u, "blick": flugblick}
		"AUFSTEHEN":
			return {"clip": "aufstehen", "art": "aufstehen", "uhr": u, "blick": flugblick}
	return {}


## Bildindex (0-basiert) zu einer Wahl und den Clipdaten.
static func bildindex_wahl(w: Dictionary, d: Dictionary) -> int:
	var name: String = String(w["clip"])
	var bilder: int = int(d["bilder"])
	var i: int = 0
	match String(w["art"]):
		"sprint":
			i = sprint_bild(int(w["sprint_n"]), d)
		"landung":
			i = landung(int(w["uhr"]), d)
		"flug":
			i = flug(int(w["uhr"]), int(w["bahn_frame"]), int(w["bahn_boden"]), int(w["stillstand"]), d)
		_:
			i = bildindex(name, int(w["uhr"]), d)
	return clampi(i, 0, bilder - 1)
