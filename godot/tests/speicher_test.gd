## Test des Arbeitsspeichers der Video-Clips (E27, Teil A): Laden nach Bedarf, Vorausladen in Häppchen, Entladen nach
## dem Budget (LRU), Zuschnitt der Texturen ohne Pixelverlust, Abbildung der Zeit unverändert.
## Läuft ohne Fenster (unter --headless hält der Dummy-Renderer die Bilder der Texturen, `Texture.get_image()` liefert sie):
##   godot --headless --path godot --script res://tests/alle.gd
## Einbindung: `var r := SpeicherTest.lauf()`; r["geprueft"] Zahl der Prüfungen, r["fehler"] Meldungen.
class_name SpeicherTest
extends RefCounted

const F = preload("res://darstellung/vela_frames.gd")
const T = preload("res://darstellung/vela_frames_tabelle.gd")
## Die fünf gemalten Clips (HD) und ein paar Pixel-Clips.
const HD: Array[String] = ["stand", "kette1", "sprint", "sprung", "sprungtritt"]
const PIXEL: Array[String] = ["kette2", "kette3", "kette4"]
## Zielwert (Auftrag E27): Texturspeicher der fünf gemalten Clips nach vollem Vorausladen höchstens 100 MB.
const ZIEL_MB: int = 100
## Obergrenze für das Laden eines Bildes (µs): fängt grobe Rückschritte ab, ohne an der Rechengeschwindigkeit zu hängen.
const BILD_US_MAX: int = 250000

var _geprueft: int = 0
var _fehler: Array[String] = []


static func lauf() -> Dictionary:
	var t: SpeicherTest = SpeicherTest.new()
	t._alles()
	DarstellungVelaFrames.nachladen = false
	DarstellungVelaFrames.budget_bytes = DarstellungVelaFrames.SPEICHER_BUDGET_MB * 1048576
	DarstellungVelaFrames.schutz_zuletzt = 2
	DarstellungVelaFrames.clips_vergessen()
	return {"geprueft": t._geprueft, "fehler": t._fehler}


func _ok(bedingung: bool, name: String) -> void:
	_geprueft += 1
	if not bedingung:
		_fehler.append(name)


func _gleich(ist: Variant, soll: Variant, name: String) -> void:
	_geprueft += 1
	if typeof(ist) != typeof(soll) or ist != soll:
		_fehler.append("%s: ist %s, soll %s" % [name, var_to_str(ist), var_to_str(soll)])


func _alles() -> void:
	DarstellungVelaFrames.clips_vergessen()
	DarstellungVelaFrames.nachladen = false
	_nach_bedarf()
	_kein_pixelverlust()
	_zeit_abbildung()
	_haeppchen()
	_budget()
	_ziel()
	DarstellungVelaFrames.clips_vergessen()


## clip.txt lesen lädt keine Bilder; clip_laden lädt den Clip ganz; clips_vergessen gibt alles frei.
func _nach_bedarf() -> void:
	F.clips_vergessen()
	var d: Dictionary = F.clip_daten("stand")
	_ok(not d.is_empty(), "Bedarf: clip.txt von stand lesbar")
	_gleich(F.speicher_bytes(), 0, "Bedarf: clip_daten lädt keine Bilder")
	_ok(not F.ist_bereit("stand"), "Bedarf: stand noch nicht bereit")
	_gleich(F.geladene_clips().size(), 0, "Bedarf: nichts geladen")
	var c: Dictionary = F.clip_laden("stand")
	_ok(F.ist_bereit("stand") and not c.is_empty(), "Bedarf: clip_laden lädt den Clip ganz")
	_gleich((c["texturen"] as Array).size(), int(d["bilder"]), "Bedarf: eine Textur je Bild")
	_ok(not (c["texturen"] as Array).has(null), "Bedarf: keine Lücke in den Texturen")
	_gleich(F.speicher_bytes(), int(c["bytes"]), "Bedarf: Speicher des einzigen Clips")
	_ok(F.speicher_bytes() > 0 and F.speicher_bytes() <= F.clip_bytes_hoechstens("stand"), "Bedarf: Speicher höchstens Dateigröße · 4 · Bilder")
	_ok(not c.has("bilder"), "Bedarf: der Speicher hält keine Images (nur Texturen)")
	_ok(F.clip_laden("gibt_es_nicht").is_empty() and F.speicher_bytes() == int(c["bytes"]), "Bedarf: unbekannter Clip ist leer und kostet nichts")
	F.clips_vergessen()
	_gleich(F.speicher_bytes(), 0, "Bedarf: clips_vergessen gibt alles frei")


## Der Zuschnitt verliert kein sichtbares Pixel: Textur = Ausschnitt des Dateibildes (Byte für Byte), und alles außerhalb
## des Ausschnitts ist im Dateibild durchsichtig (Alpha 0). Für alle Bilder der gemalten und einiger Pixel-Clips.
func _kein_pixelverlust() -> void:
	for clip: String in HD + PIXEL:
		F.clips_vergessen()
		var c: Dictionary = F.clip_laden(clip)
		_ok(not c.is_empty(), "Pixel %s: Clip lesbar" % clip)
		if c.is_empty():
			continue
		var n: int = int(c["daten"]["bilder"])
		var gleich: int = 0
		var umschliesst: int = 0
		var format_ok: int = 0
		var kleiner: int = 0
		for i: int in n:
			var datei: Image = F.bild_aus_datei(clip, i)
			var tex: Image = (c["texturen"] as Array)[i].get_image()
			var v: Vector2i = Vector2i(F.bild_versatz(clip, i))
			var rahmen: Rect2i = Rect2i(v, tex.get_size())
			if datei.get_region(rahmen).get_data() == tex.get_data():
				gleich += 1
			if rahmen.encloses(datei.get_used_rect()) or datei.get_used_rect().size == Vector2i.ZERO:
				umschliesst += 1
			if tex.get_format() == Image.FORMAT_RGBA8:
				format_ok += 1
			if tex.get_size() != datei.get_size():
				kleiner += 1
		_gleich(gleich, n, "Pixel %s: Textur gleich dem Ausschnitt des Dateibildes (Bilder)" % clip)
		_gleich(umschliesst, n, "Pixel %s: der Ausschnitt umschließt alle sichtbaren Pixel" % clip)
		_gleich(format_ok, n, "Pixel %s: Texturen RGBA8" % clip)
		if HD.has(clip):
			_ok(kleiner > 0, "Pixel %s: der Zuschnitt spart bei mindestens einem Bild Speicher" % clip)
	F.clips_vergessen()


## Die Abbildung Aktionsuhr → Bild hängt nur von clip.txt ab: gleich vor und nach dem Laden und nach Entladen und
## Wiederladen; die Clipdaten bleiben dieselben.
func _zeit_abbildung() -> void:
	for clip: String in ["kette1", "sprung", "stand"]:
		F.clips_vergessen()
		var d: Dictionary = F.clip_daten(clip)
		var vorher: Array[int] = []
		for u: int in range(1, 60):
			vorher.append(T.bildindex(clip, u, d))
		F.clip_laden(clip)
		var nachher: Array[int] = []
		for u: int in range(1, 60):
			nachher.append(T.bildindex(clip, u, F.clip_daten(clip)))
		_gleich(nachher, vorher, "Zeit %s: Abbildung Uhr → Bild vor und nach dem Laden gleich" % clip)
		F.clip_entladen(clip)
		_ok(not F.ist_bereit(clip), "Zeit %s: entladen" % clip)
		F.clip_laden(clip)
		var wieder: Array[int] = []
		for u: int in range(1, 60):
			wieder.append(T.bildindex(clip, u, F.clip_daten(clip)))
		_gleich(wieder, vorher, "Zeit %s: nach Entladen und Wiederladen gleich" % clip)
	# der Abspieler zeigt nach dem Wiederladen dasselbe Bild an derselben Stelle
	F.clips_vergessen()
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	v.aus_clip("kette1", 3, 1)
	var off1: Vector2 = (v.get_node("Bild") as Sprite2D).offset
	var idx1: int = v.bild_index()
	F.clip_entladen("kette1")
	v.aus_clip("kette1", 3, 1)
	_gleich([v.bild_index(), (v.get_node("Bild") as Sprite2D).offset], [idx1, off1], "Zeit: Abspieler zeigt nach dem Wiederladen dasselbe Bild an derselben Stelle")
	v.free()
	F.clips_vergessen()


## Modus nachladen: abgedeckt lädt nie und merkt vor; vorausladen_schritt lädt in Häppchen, vorgemerkte zuerst.
func _haeppchen() -> void:
	F.clips_vergessen()
	F.nachladen = true
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	f.aktion = "STAND"
	_ok(not F.abgedeckt(f), "Häppchen: ungeladener Clip ist nicht abgedeckt (Rückfall auf Puppe oder Platzhalter)")
	_gleich(F.speicher_bytes(), 0, "Häppchen: abgedeckt lädt im Modus nachladen nie")
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	v.aus_figur(f, null)
	_ok(not v.visible, "Häppchen: aus_figur versteckt den Node, solange der Clip fehlt")
	# ein Bild je Aufruf bei Budget 0
	var n: int = int(F.clip_daten("stand")["bilder"])
	var schritte: int = 0
	var monoton: bool = true
	var vorher: int = 0
	while not F.ist_bereit("stand") and schritte < n + 5:
		F.vorausladen_schritt(0)
		schritte += 1
		var jetzt: int = int(((F._clips["stand"] as Dictionary)["geladen"]))
		if jetzt != vorher + 1:
			monoton = false
		vorher = jetzt
	_gleich(schritte, n, "Häppchen: ein Bild je Aufruf bei Zeitbudget 0 (stand: %d Bilder)" % n)
	_ok(monoton, "Häppchen: jeder Aufruf lädt genau ein Bild")
	_ok(F.abgedeckt(f), "Häppchen: nach dem Laden ist der Clip abgedeckt")
	v.aus_figur(f, null)
	_ok(v.visible and v.clip_name() == "stand", "Häppchen: danach zeigt aus_figur den Clip")
	v.free()
	# vorgemerkter Clip kommt vor der Reihe dran
	F.clips_vergessen()
	F.nachladen = true
	f.aktion = "SPRINT"
	_ok(not F.abgedeckt(f), "Häppchen: sprint noch nicht abgedeckt")
	F.vorausladen_schritt(0)
	_ok(F._clips.has("sprint") and not F._clips.has("stand"), "Häppchen: der vorgemerkte Clip (sprint) wird vor der Reihe (stand) geladen")
	_ok(F.vorausladen_budget_us() >= F.VORAUS_LEERLAUF_US, "Häppchen: Zeitbudget mindestens das des Leerlaufs")
	# Vorausladen bis zum Ende: alle Clips der Reihe, die ins Budget passen
	F.clips_vergessen()
	F.nachladen = true
	var aufrufe: int = 0
	while F.vorausladen_schritt(F.VORAUS_LEERLAUF_US) and aufrufe < 100000:
		aufrufe += 1
	_ok(aufrufe > 10, "Häppchen: das Vorausladen braucht viele Aufrufe (%d), nicht einen" % aufrufe)
	var alle: bool = true
	for clip: String in F.VORAUS_REIHE:
		if not F.clip_daten(clip).is_empty() and not F.ist_bereit(clip):
			alle = false
	_ok(alle, "Häppchen: nach dem Vorvorausladen sind alle Clips der Reihe bereit")
	_ok(F.speicher_bytes() <= F.budget_bytes, "Häppchen: Speicher im Budget (%.1f MB)" % (float(F.speicher_bytes()) / 1048576.0))
	_ok(not F.vorausladen_schritt(0), "Häppchen: danach gibt es nichts mehr zu laden")
	var max_us: int = 0
	for k: String in F.ladezeiten:
		max_us = maxi(max_us, int((F.ladezeiten[k] as Dictionary)["max_us"]))
	_ok(max_us < BILD_US_MAX, "Häppchen: kein Bild braucht mehr als %d ms zum Laden (größtes: %.1f ms)" % [BILD_US_MAX / 1000, max_us / 1000.0])
	F.nachladen = false
	F.clips_vergessen()


## Budget: Wird es überschritten, fliegt der am längsten nicht benutzte Clip ganz raus; der gezeigte bleibt.
func _budget() -> void:
	F.clips_vergessen()
	F.nachladen = false
	F.schutz_zuletzt = 0
	var gross: int = F.budget_bytes
	# Budget: kette2 (fertig geladen) plus das Höchstmaß von kette4; kette3 und kette2 passen zusammen hinein
	F.budget_bytes = 1 << 40
	var b2: int = int(F.clip_laden("kette2")["bytes"])
	F.clips_vergessen()
	F.budget_bytes = b2 + F.clip_bytes_hoechstens("kette4")
	F.clip_laden("kette3")
	F.clip_laden("kette2")
	_ok(F.ist_bereit("kette3") and F.ist_bereit("kette2"), "Budget: kette3 und kette2 passen zusammen ins Budget")
	F.clip_laden("kette4")
	_ok(F.ist_bereit("kette4"), "Budget: kette4 geladen")
	_ok(not F.ist_bereit("kette3"), "Budget: der am längsten nicht benutzte Clip (kette3) wurde entladen")
	_ok(F.ist_bereit("kette2"), "Budget: der zuletzt benutzte Clip (kette2) blieb")
	_ok(F.speicher_bytes() <= F.budget_bytes, "Budget: Speicher im Budget nach dem Entladen (%d von %d Byte)" % [F.speicher_bytes(), F.budget_bytes])
	# Der gezeigte Clip bleibt, auch wenn er der älteste ist
	F.clips_vergessen()
	var v: DarstellungVelaFrames = DarstellungVelaFrames.new()
	v.aus_clip_bild("kette3", 0, 1)
	F.clip_laden("kette2")
	F.clip_laden("kette4")
	_ok(F.ist_bereit("kette3"), "Budget: der gezeigte Clip bleibt, obwohl er der älteste ist")
	_ok(F.ist_bereit("kette4"), "Budget: der angeforderte Clip ist geladen")
	_ok(not F.ist_bereit("kette2"), "Budget: stattdessen fliegt der nächstältere Clip raus")
	v.free()
	# Geschützte „zuletzt benutzte“: mit schutz_zuletzt = 1 bleibt auch der zweitjüngste
	F.clips_vergessen()
	F.schutz_zuletzt = 1
	F.clip_laden("kette3")
	F.clip_laden("kette2")
	F.clip_laden("kette4")
	_ok(F.ist_bereit("kette2") and F.ist_bereit("kette4"), "Budget: schutz_zuletzt = 1 schützt den zuletzt benutzten Clip")
	F.schutz_zuletzt = 0
	# Nach dem Entladen lädt der Clip auf Anforderung wieder
	var g: Dictionary = F.clip_laden("kette3")
	_ok(not g.is_empty() and F.ist_bereit("kette3"), "Budget: ein entladener Clip lädt auf Anforderung wieder")
	# Vorausladen entlädt nie: ist das Budget schon überschritten, bleibt alles, wie es ist
	F.clips_vergessen()
	F.nachladen = true
	F.budget_bytes = F.clip_bytes_hoechstens("stand") + 1000
	F.clip_laden("sprung")
	var vor: int = F.speicher_bytes()
	var aufrufe: int = 0
	while F.vorausladen_schritt(F.VORAUS_LEERLAUF_US) and aufrufe < 100000:
		aufrufe += 1
	_ok(F.ist_bereit("sprung"), "Budget: Vorausladen entlädt nichts (sprung bleibt)")
	_gleich(F.speicher_bytes(), vor, "Budget: Vorausladen lädt über dem Budget nichts nach")
	F.nachladen = false
	F.budget_bytes = gross
	F.schutz_zuletzt = 2
	F.clips_vergessen()


## Zielwert: die fünf gemalten Clips zusammen, vollständig vorausgeladen, höchstens ZIEL_MB.
func _ziel() -> void:
	F.clips_vergessen()
	F.budget_bytes = 1 << 40
	var roh: int = 0
	for clip: String in HD:
		F.clip_laden(clip)
		roh += F.clip_bytes_hoechstens(clip)
	var mb: float = float(F.speicher_bytes()) / 1048576.0
	print("Speicher der fünf gemalten Clips: %.1f MB (ohne Zuschnitt %.1f MB)" % [mb, float(roh) / 1048576.0])
	_ok(mb <= float(ZIEL_MB), "Ziel: die fünf gemalten Clips brauchen %.1f MB Texturen (Ziel höchstens %d MB)" % [mb, ZIEL_MB])
	_ok(F.speicher_bytes() < roh, "Ziel: Zuschnitt spart gegenüber dem vollen Rechteck (%.1f von %.1f MB)" % [mb, float(roh) / 1048576.0])
	F.budget_bytes = F.SPEICHER_BUDGET_MB * 1048576
	_ok(F.speicher_bytes() <= F.budget_bytes, "Ziel: die fünf gemalten Clips passen ins Budget von %d MB" % F.SPEICHER_BUDGET_MB)
	F.clips_vergessen()
