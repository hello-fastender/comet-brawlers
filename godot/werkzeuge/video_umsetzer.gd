extends SceneTree
## Video-Umsetzer: macht aus einem kurzen Video von Vela (Grok, Weg „Vela als Video“,
## docs/grafik-bestellung.md) eine Bildfolge für das Spiel (Pixelkunst, 142 Bildpixel hohe Figur,
## höchstens 64 Farben, harte Kante) samt `clip.txt` mit den erkannten Zyklus- und Ereignisdaten.
## Die Zuordnung der Bilder zur Aktionsuhr der Logik macht DarstellungVelaFramesTabelle.
##
## Aufruf (Repo-Wurzel; Pfade ab Repo-Wurzel oder absolut):
##   godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- \
##       --video <datei> --name <clip> [--aus godot/grafik/vela_video] [--schluessel gruen|ecke] \
##       [--hoehe 142] [--zyklus <n>] [--ereignis vorn|hoch] [--bilder <n>] [--behalte]
##
##   --video <datei>      mp4, webm, gif oder webp (alles, was ffmpeg liest)
##   --name <clip>        Name des Clips (a-z, 0-9, _), Ordner <aus>/<clip>/ (gehen, stand, kette1 …)
##   --aus <ordner>       Ausgabeordner (Standard godot/grafik/vela_video)
##   --schluessel gruen   (Standard) Chroma-Grün: Hintergrund ist, wo Grün stark über Rot und Blau
##                        liegt (weniger als die Hälfte des Randwerts bleibt Figur); Kantenpixel werden
##                        entmischt (Grünstich weg). Ist der Rand nicht grün, fällt es auf `ecke` zurück.
##   --schluessel ecke    beliebige Hintergrundfarbe: Medianfarbe der Ränder, Figur ist, was mehr als
##                        40 Stufen (größter Kanalunterschied) davon abweicht
##   --hoehe <n>          Höhe der Figur im ersten Bild in Bildpixeln (Standard 142)
##   --zyklus <n>         Zykluslänge in Bildern vorgeben (0 = ganzer Clip), statt sie zu suchen
##   --ereignis vorn      Kontakt = größte Ausdehnung nach vorn (Standard, Schläge, Tritte);
##                        hoch = höchster Punkt (Haken von unten)
##   --bilder <n>         nur die ersten n Videobilder verarbeiten (zum Probieren)
##   --behalte            Temp-Ordner mit den Zwischenbildern nicht löschen
##
## Ablauf (Begründungen in docs/grafik.md, „Vela als Video“):
##  1. ffmpeg (per OS.execute, ohne Shell) zerlegt das Video in PNG-Einzelbilder, alle Bilder
##     (`-fps_mode passthrough`), flächengemittelt auf eine Arbeitsauflösung, in der die Figur etwa
##     doppelt so hoch ist wie das Ziel (284 px). Das erste Bild wird vorher einmal ausgemessen.
##  2. Freistellen je Bild: Schlüsselfarbe = Median der Ränder; weicher Alpha (Grün-Dominanz) nur zum
##     Entmischen der Kante, dann hart; Löcher füllen (nur vom Rand aus unerreichbare Flächen, die nicht
##     wie der Hintergrund aussehen); Inseln weg (größte Fläche plus nahe Teile bleiben).
##  3. Unschärfe: Anteil weicher Kantenpixel an der Silhouette; Bilder unter 75 % des Clipmedians werden
##     als „unscharf“ vermerkt, ganz vorn und ganz hinten (höchstens je ein Viertel) abgeschnitten.
##  4. Maßstab: Höhe der Figur im ersten Bild auf --hoehe, ein Faktor für den ganzen Clip, Box-Filter
##     (Flächenmittel, Deckung ab 1/2, wie umsetzer.gd). Die Kamera ist fest, die Lage der Figur im
##     Bild bleibt erhalten (Sprünge, Hüpfen). Anker: x = Mitte der untersten 6 Zeilen im ersten Bild,
##     y = unterste Figurzeile des ersten Bildes. Zuschnitt auf die Vereinigung aller Figuren plus 2 px.
##  5. Palette: Medianschnitt (umsetzer.gd) über alle Bilder gemeinsam, 63 Farben + durchsichtig.
##  6. Zyklus (Bildpaare i, i+n) und Ereignisse (Ausholen, Kontakt, Ruhe) in clip.txt.
## Alles deterministisch: Ganzzahlen (Festkomma 16.16 beim Verkleinern), feste Reihenfolgen.

const AUS_STANDARD: String = "godot/grafik/vela_video"
const ZIELHOEHE_STANDARD: int = 142
## Farben ohne „durchsichtig“ (64 Farben insgesamt, E25).
const HOECHST_FARBEN: int = 63
## Figur in der Arbeitsauflösung: Vielfaches der Zielhöhe.
const ARBEIT: int = 2
const SONDE_HOEHE: int = 360
## Abstand (größter Kanalunterschied) zur Randfarbe im Modus ecke.
const TOL_ECKE: int = 40
## Kleinste Grün-Dominanz (g − max(r, b)) des Randes, ab der der Modus gruen gilt.
const GRUEN_DOM_MIN: int = 60
## Modus gruen: Hintergrund ist, was grün DOMINIERT (Farbton), nicht was hell ist: (g − max(r, b)) / g
## mindestens so viel Prozent (aus dem Rand abgeleitet, höchstens GRUEN_RHO_MAX) und g mindestens GRUEN_G_MIN.
## So fällt auch ein weicher dunkelgrüner Schatten weg; dunkelblaue Hose, schwarzes Top und dunkle Stiefel
## (Blau oder Schwarz dominiert, g klein) bleiben Figur.
const GRUEN_RHO_MAX: int = 65
const GRUEN_G_MIN: int = 16
## Einblendbilder (Überblenden von Schwarz zu Grün) erkennt man an der Randfarbe: weicht sie um mehr als
## STABIL_TOL von der Medianrandfarbe aller Bilder ab, ist das Bild nicht stabil.
const STABIL_TOL: int = 20
## Fläche, die vom Rand aus nicht erreichbar ist und im Mittel weiter als LOCH_TOL von der Randfarbe
## liegt, ist Figur (dunkle Kleidung); kleiner als LOCH_MIN gilt immer als Figur (Rauschen).
const LOCH_TOL: int = 24
const LOCH_MIN: int = 6
## Kleinere Flecken sind Staub, auch wenn sie nah an der Figur liegen.
const FLECK_MIN: int = 4
## „Nah“: Radius der Erweiterung der größten Fläche = Figurhöhe / NAH_TEILER (Zopfspitzen, abgesetzte Hand).
const NAH_TEILER: int = 25
const RAND: int = 2
const FUSS_ZEILEN: int = 6
const FUSS_BAND: int = 10
## Raster der Bildunterschrift für Zyklus und Ereignisse.
const SIG: int = 24
const ZYKLUS_MIN: int = 3
## Täler der Paarunterschiede: tief (Prozent des Bergs davor) bzw. noch zulässig, wenn es kein tiefes gibt.
const TAL_STRENG: int = 60
const TAL_LOCKER: int = 90
const UNSCHARF_PROZENT: int = 75
const TRIMM_PROZENT: int = 25
const KONTAKT_TOL: int = 1

var _p: Dictionary = {}
var _temp: String = ""
var _behalte: bool = false


func _init() -> void:
	_lauf.call_deferred()


func _fehler(text: String) -> void:
	printerr("FEHLER: " + text)
	_aufraeumen()
	quit(1)


func _aufraeumen() -> void:
	if _temp != "" and not _behalte and DirAccess.dir_exists_absolute(_temp):
		var d: DirAccess = DirAccess.open(_temp)
		if d != null:
			for n: String in d.get_files():
				d.remove(n)
		DirAccess.remove_absolute(_temp)


static func wurzel() -> String:
	return ProjectSettings.globalize_path("res://").path_join("..").simplify_path()


static func absolut(pfad: String) -> String:
	if pfad.is_absolute_path():
		return pfad.simplify_path()
	return wurzel().path_join(pfad).simplify_path()


func _argumente() -> Dictionary:
	var aus: Dictionary = {}
	var a: PackedStringArray = OS.get_cmdline_user_args()
	var i: int = 0
	while i < a.size():
		if a[i].begins_with("--"):
			if i + 1 < a.size() and not a[i + 1].begins_with("--"):
				aus[a[i].substr(2)] = a[i + 1]
				i += 2
				continue
			aus[a[i].substr(2)] = "1"
		else:
			aus["_unerwartet"] = a[i]
		i += 1
	return aus


# ===========================================================================
# Ablauf
# ===========================================================================

func _lauf() -> void:
	var t0: int = Time.get_ticks_msec()
	var arg: Dictionary = _argumente()
	if arg.has("_unerwartet"):
		_fehler("unerwartetes Argument „%s“" % arg["_unerwartet"])
		return
	var video: String = String(arg.get("video", ""))
	var name: String = String(arg.get("name", ""))
	if video == "" or name == "":
		_fehler("Aufruf: --video <datei> --name <clip> [--aus <ordner>] [--schluessel gruen|ecke] [--hoehe 142] [--zyklus n] [--ereignis vorn|hoch] [--bilder n] [--behalte]")
		return
	var muster: RegEx = RegEx.new()
	muster.compile("^[a-z0-9_]+$")
	if muster.search(name) == null:
		_fehler("Clipname „%s“ ungültig (a-z, 0-9, _)" % name)
		return
	var schluessel_modus: String = String(arg.get("schluessel", "gruen"))
	if schluessel_modus != "gruen" and schluessel_modus != "ecke":
		_fehler("--schluessel: gruen oder ecke")
		return
	var ereignis: String = String(arg.get("ereignis", "vorn"))
	if ereignis != "vorn" and ereignis != "hoch":
		_fehler("--ereignis: vorn oder hoch")
		return
	var ziel_hoehe: int = int(arg.get("hoehe", str(ZIELHOEHE_STANDARD)))
	if ziel_hoehe < 16 or ziel_hoehe > 600:
		_fehler("--hoehe außerhalb 16 bis 600")
		return
	_behalte = arg.has("behalte")
	var video_pfad: String = absolut(video)
	var aus_ordner: String = absolut(String(arg.get("aus", AUS_STANDARD)))
	if not FileAccess.file_exists(video_pfad):
		_fehler("Video %s nicht gefunden" % video_pfad)
		return
	var ffv: String = ffmpeg_version()
	if ffv == "":
		_fehler("ffmpeg nicht gefunden oder nicht ausführbar (erwartet im PATH, z. B. /usr/bin/ffmpeg)")
		return
	var info: Dictionary = sonde(video_pfad)
	if info.is_empty():
		_fehler("Video %s unlesbar (ffmpeg findet keinen Videostrom)" % video_pfad)
		return
	print("Quelle: %s, %d x %d, %s Bilder/s, %s" % [video_pfad, info["breite"], info["hoehe"], info["fps"], ffv])
	_temp = ProjectSettings.globalize_path("user://video_umsetzer").path_join(name)
	DirAccess.make_dir_recursive_absolute(_temp)
	_temp_leeren()

	# --- 1. ein Bild bei 0,5 s ausmessen (Sonde; die ersten Bilder können Einblendungen sein) ---------------------------------------------------
	var sonde_h: int = mini(int(info["hoehe"]), SONDE_HOEHE)
	var sonde_w: int = roundi(float(info["breite"]) * float(sonde_h) / float(info["hoehe"]))
	var sonde_pfad: String = _temp.path_join("sonde.png")
	var r: Dictionary = ffmpeg_lauf(["-y", "-loglevel", "error", "-ss", "0.5", "-i", video_pfad, "-frames:v", "1", "-vf", "scale=%d:%d:flags=area" % [sonde_w, sonde_h], sonde_pfad])
	if int(r["code"]) != 0 or not FileAccess.file_exists(sonde_pfad):
		# sehr kurzes Video: das erste Bild
		r = ffmpeg_lauf(["-y", "-loglevel", "error", "-i", video_pfad, "-frames:v", "1", "-vf", "scale=%d:%d:flags=area" % [sonde_w, sonde_h], sonde_pfad])
	if int(r["code"]) != 0 or not FileAccess.file_exists(sonde_pfad):
		_fehler("Video %s unlesbar: %s" % [video_pfad, String(r["text"]).strip_edges()])
		return
	var sonde_bild: Image = bild_laden(sonde_pfad)
	if sonde_bild == null:
		_fehler("Sondenbild unlesbar")
		return
	var sd: PackedByteArray = sonde_bild.get_data()
	var sw: int = sonde_bild.get_width()
	var sh: int = sonde_bild.get_height()
	var key0: Vector3i = schluessel_farbe(sd, sw, sh)
	var modus: String = schluessel_modus
	if modus == "gruen" and gruen_dominanz(key0) < GRUEN_DOM_MIN:
		print("Hinweis: Rand (%d, %d, %d) ist nicht grün, Modus ecke" % [key0.x, key0.y, key0.z])
		modus = "ecke"
	var sonde_fig: Dictionary = freistellen(sd, sw, sh, key0, modus)
	var sonde_rahmen: Rect2i = maske_rahmen(sonde_fig["maske"], sw, sh)
	if sonde_rahmen.size.y == 0:
		_fehler("keine Figur im Sondenbild gefunden (Schlüsselfarbe (%d, %d, %d), Modus %s)" % [key0.x, key0.y, key0.z, modus])
		return
	# Arbeitsauflösung: Figur etwa ARBEIT × Zielhöhe hoch (nie über der Auflösung der Quelle)
	var arbeit_h: int = mini(int(info["hoehe"]), roundi(float(sonde_h) * float(ARBEIT * ziel_hoehe) / float(sonde_rahmen.size.y)))
	arbeit_h = maxi(arbeit_h, 64)
	var arbeit_w: int = maxi(16, roundi(float(info["breite"]) * float(arbeit_h) / float(info["hoehe"])))
	print("Sondenbild: Figur %d Zeilen hoch bei %d, Arbeitsauflösung %d x %d, Schlüssel (%d, %d, %d) %s" % [sonde_rahmen.size.y, sonde_h, arbeit_w, arbeit_h, key0.x, key0.y, key0.z, modus])

	# --- 2. alle Bilder zerlegen ---------------------------------------------------------------
	var args: Array = ["-y", "-loglevel", "error", "-i", video_pfad, "-an", "-fps_mode", "passthrough", "-vf", "scale=%d:%d:flags=area" % [arbeit_w, arbeit_h]]
	if arg.has("bilder"):
		args.append_array(["-frames:v", str(int(arg["bilder"]))])
	args.append_array(["-start_number", "1", _temp.path_join("w_%04d.png")])
	r = ffmpeg_lauf(args)
	if int(r["code"]) != 0:
		_fehler("ffmpeg konnte das Video nicht zerlegen: %s" % String(r["text"]).strip_edges())
		return
	var quell_zahl: int = 0
	while FileAccess.file_exists(_temp.path_join("w_%04d.png" % (quell_zahl + 1))):
		quell_zahl += 1
	if quell_zahl < 2:
		_fehler("weniger als 2 Bilder im Video")
		return
	print("Videobilder: %d (%.1f s)" % [quell_zahl, _sek(t0)])

	# --- 3. Randfarbe und grober Rahmen je Bild; Einblendbilder erkennen ----------------------------
	var keys: Array[Vector3i] = []
	var rahmen_je: Array[Rect2i] = []
	for i: int in quell_zahl:
		var b: Image = bild_laden(_temp.path_join("w_%04d.png" % (i + 1)))
		if b == null or b.get_width() != arbeit_w or b.get_height() != arbeit_h:
			_fehler("Bild %d unlesbar oder falsche Größe" % (i + 1))
			return
		var bd: PackedByteArray = b.get_data()
		var k: Vector3i = schluessel_farbe(bd, arbeit_w, arbeit_h)
		keys.append(k)
		rahmen_je.append(grober_rahmen(bd, arbeit_w, arbeit_h, k, modus, 3))
	var kr: Array[int] = []
	var kg: Array[int] = []
	var kb: Array[int] = []
	for k: Vector3i in keys:
		kr.append(k.x)
		kg.append(k.y)
		kb.append(k.z)
	var ref_key: Vector3i = Vector3i(median_int(kr), median_int(kg), median_int(kb))
	var stabil: Array[bool] = []
	for k: Vector3i in keys:
		stabil.append(maxi(absi(k.x - ref_key.x), maxi(absi(k.y - ref_key.y), absi(k.z - ref_key.z))) <= STABIL_TOL)
	var s_von: int = 0
	var s_bis: int = quell_zahl - 1
	while s_von < quell_zahl - 1 and not stabil[s_von]:
		s_von += 1
	while s_bis > s_von and not stabil[s_bis]:
		s_bis -= 1
	var einblend_vorn: int = s_von
	var einblend_hinten: int = quell_zahl - 1 - s_bis
	print("Randfarbe (Median) (%d, %d, %d); Einblendbilder: %d vorn, %d hinten" % [ref_key.x, ref_key.y, ref_key.z, einblend_vorn, einblend_hinten])
	var rahmen: Rect2i = Rect2i()
	var hat_rahmen: bool = false
	for i: int in range(s_von, s_bis + 1):
		var rh: Rect2i = rahmen_je[i]
		if rh.size.x > 0:
			rahmen = rahmen.merge(rh) if hat_rahmen else rh
			hat_rahmen = true
	if not hat_rahmen:
		_fehler("keine Figur in den Bildern gefunden")
		return
	var rand_px: int = maxi(8, arbeit_h / 40)
	rahmen = rahmen.grow(rand_px).intersection(Rect2i(0, 0, arbeit_w, arbeit_h))
	print("Zuschnitt (Arbeitsauflösung): %s" % str(rahmen))

	# --- 4. Feinarbeit: freistellen je Bild ----------------------------------------------------
	var bilder: Array = []
	for i: int in range(s_von, s_bis + 1):
		var b: Image = bild_laden(_temp.path_join("w_%04d.png" % (i + 1)))
		var bd: PackedByteArray = b.get_data()
		var k: Vector3i = keys[i]
		var ausschnitt: PackedByteArray = zuschneiden_rgb(bd, arbeit_w, rahmen)
		var fig: Dictionary = freistellen(ausschnitt, rahmen.size.x, rahmen.size.y, k, modus)
		fig["nr"] = i
		bilder.append(fig)
	print("Freigestellt (%.1f s)" % _sek(t0))

	# --- 5. Unschärfe: vermerken, vorn und hinten abschneiden -----------------------------------
	var schaerfe: Array[int] = []
	for fig: Dictionary in bilder:
		schaerfe.append(int(fig["schaerfe"]))
	var med: int = median_int(schaerfe)
	var unscharf_flag: Array[bool] = []
	for s: int in schaerfe:
		unscharf_flag.append(s * 100 < med * UNSCHARF_PROZENT)
	var vorn_weg: int = 0
	var hinten_weg: int = 0
	var rest: int = bilder.size()
	var max_weg: int = rest * TRIMM_PROZENT / 100
	while vorn_weg < max_weg and unscharf_flag[vorn_weg]:
		vorn_weg += 1
	while hinten_weg < max_weg and unscharf_flag[rest - 1 - hinten_weg]:
		hinten_weg += 1
	var behalten: Array = bilder.slice(vorn_weg, rest - hinten_weg)
	var unscharf_liste: PackedInt32Array = PackedInt32Array()
	for i: int in behalten.size():
		if unscharf_flag[vorn_weg + i]:
			unscharf_liste.append(i + 1)
	print("Schärfe: Median %d, unscharf %s, vorn %d und hinten %d abgeschnitten" % [med, str(unscharf_liste), vorn_weg, hinten_weg])

	# --- 6. Maßstab und Anker aus dem ersten behaltenen Bild; Verkleinern -----------------------------
	var bw: int = rahmen.size.x
	var bh: int = rahmen.size.y
	var ref: Dictionary = behalten[0]
	var gitter: Dictionary = gitter_bestimmen(ref["maske"], bw, bh, ziel_hoehe)
	if gitter.is_empty():
		_fehler("erstes Bild ohne Figur")
		return
	var finale: Array = []
	for fig: Dictionary in behalten:
		finale.append(herunter(fig["maske"], fig["farbe"], bw, bh, gitter))
	# Vereinigung aller Figuren
	var gb: int = int(gitter["breite"])
	var gh: int = int(gitter["hoehe"])
	var x0: int = gb
	var y0: int = gh
	var x1: int = -1
	var y1: int = -1
	for f: PackedByteArray in finale:
		for y: int in gh:
			var z: int = y * gb * 4
			for x: int in gb:
				if f[z + x * 4 + 3] != 0:
					if x < x0:
						x0 = x
					if x > x1:
						x1 = x
					if y < y0:
						y0 = y
					if y > y1:
						y1 = y
	if x1 < 0:
		_fehler("nach dem Verkleinern ist nichts übrig")
		return
	x0 -= RAND
	y0 -= RAND
	x1 += RAND
	y1 += RAND
	var ob: int = x1 - x0 + 1
	var oh: int = y1 - y0 + 1
	var ausgabe: Array = []
	for f: PackedByteArray in finale:
		ausgabe.append(zuschnitt_rgba(f, gb, gh, x0, y0, ob, oh))
	# Anker im ersten Bild (Gitter, dann Zuschnitt)
	var ank: Vector2i = anker_bestimmen(ausgabe[0], ob, oh)
	print("Maßstab: erstes Bild %d Zeilen, Faktor %.5f (Arbeitsauflösung), Bild %d x %d, Anker %s (%.1f s)" % [int(gitter["hoehe_erstes"]), float(gitter["faktor"]), ob, oh, str(ank), _sek(t0)])

	# --- 7. Palette über alle Bilder ---------------------------------------------------------------
	var pal: Dictionary = palette_anwenden(ausgabe)
	print("Palette: %d Farben aus %d Zwischenstufen" % [pal["farben"], pal["klassen"]])

	# --- 8. Zyklus und Ereignisse --------------------------------------------------------------
	var sigs: Array = []
	for f: PackedByteArray in ausgabe:
		sigs.append(signatur(f, ob, oh))
	var zyk: Dictionary
	if arg.has("zyklus"):
		var zn: int = int(arg["zyklus"])
		if zn <= 0 or zn > ausgabe.size():
			zn = ausgabe.size()
		zyk = zyklus_start_fuer(sigs, zn)
	else:
		zyk = zyklus_suchen(sigs)
	var vorn_liste: Array[int] = []
	var hoch_liste: Array[int] = []
	for f: PackedByteArray in ausgabe:
		var e: Vector2i = ausdehnung(f, ob, oh, ank.x)
		vorn_liste.append(e.x)
		hoch_liste.append(e.y)
	var ereignisse: Dictionary = ereignisse_suchen(sigs, vorn_liste, hoch_liste, ereignis)
	var schritt: Dictionary = schrittlaenge(ausgabe, ob, oh, ank.y, int(zyk["start"]), int(zyk["n"]))
	print("Zyklus: %s (Kandidaten %s, Güte %d %%, Schluss %d %% eines Bildschritts); Ereignisse: %s; Schritt: %s" % [str({"n": zyk["n"], "start": zyk["start"], "fehler": zyk["fehler"]}), str(zyk["kandidaten"]), zyk["guete"], zyk["bewegung"], str(ereignisse), str(schritt)])

	# --- 9. schreiben --------------------------------------------------------------------------------
	var ziel: String = aus_ordner.path_join(name)
	DirAccess.make_dir_recursive_absolute(ziel)
	var alt: DirAccess = DirAccess.open(ziel)
	for n: String in alt.get_files():
		if n.begins_with("f_") or n == "clip.txt":
			alt.remove(n)
	for i: int in ausgabe.size():
		var img: Image = Image.create_from_data(ob, oh, false, Image.FORMAT_RGBA8, ausgabe[i])
		img.save_png(ziel.path_join("f_%04d.png" % (i + 1)))
	var text: PackedStringArray = PackedStringArray()
	text.append("# Clip %s, erzeugt von werkzeuge/video_umsetzer.gd (nicht von Hand ändern). Bilder 1-basiert wie f_0001.png." % name)
	text.append("version=1")
	text.append("name=" + name)
	text.append("quelle=" + video_pfad.get_file())
	text.append("ffmpeg=" + ffv)
	text.append("fps=" + String(info["fps"]))
	text.append("quell_bilder=%d" % quell_zahl)
	text.append("einblendung_weg=%d,%d" % [einblend_vorn, einblend_hinten])
	text.append("verworfen_anfang=%d" % (einblend_vorn + vorn_weg))
	text.append("verworfen_ende=%d" % (einblend_hinten + hinten_weg))
	text.append("bilder=%d" % ausgabe.size())
	text.append("groesse=%d,%d" % [ob, oh])
	text.append("anker=%d,%d" % [ank.x, ank.y])
	text.append("hoehe=%d" % ziel_hoehe)
	text.append("massstab=%.5f" % (float(gitter["faktor"]) * float(arbeit_h) / float(info["hoehe"])))
	text.append("farben=%d" % int(pal["farben"]))
	text.append("schluessel=%s,%d,%d,%d" % [modus, key0.x, key0.y, key0.z])
	text.append("unscharf=" + ",".join(Array(unscharf_liste).map(func(v: int) -> String: return str(v))))
	text.append("zyklus_bilder=%d" % int(zyk["n"]))
	text.append("zyklus_start=%d" % (int(zyk["start"]) + 1))
	text.append("zyklus_fehler=%d" % int(zyk["fehler"]))
	text.append("zyklus_guete=%d" % int(zyk["guete"]))
	text.append("zyklus_schluss_in_schritten=%d" % int(zyk["bewegung"]))
	var kand_text: PackedStringArray = PackedStringArray()
	for k: Array in (zyk["kandidaten"] as Array):
		kand_text.append("%d:%d:%d" % [k[0], k[1], k[2]])
	text.append("# zyklus_kandidaten = Länge:Wert:Tiefe in Prozent")
	text.append("zyklus_kandidaten=" + ",".join(kand_text))
	var wt: PackedStringArray = PackedStringArray()
	var wk: Array = (zyk["werte"] as Dictionary).keys()
	wk.sort()
	for k: int in wk:
		wt.append("%d:%d" % [k, (zyk["werte"] as Dictionary)[k]])
	text.append("zyklus_werte=" + ",".join(wt))
	text.append("schritt_px=%d" % int(schritt["schritt"]))
	text.append("zyklus_ticks=%d" % int(schritt["ticks"]))
	text.append("ereignis_metrik=" + ereignis)
	text.append("ausholen=%d" % (int(ereignisse["ausholen"]) + 1))
	text.append("kontakt=%d" % (int(ereignisse["kontakt"]) + 1))
	text.append("ruhe=%d" % (int(ereignisse["ruhe"]) + 1))
	text.append("bewegung_ab=%d" % (int(ereignisse["bewegung"]) + 1))
	text.append("ruhe_schwelle=%d" % int(ereignisse["schwelle"]))
	text.append("vorn=" + ",".join(Array(vorn_liste).map(func(v: int) -> String: return str(v))))
	text.append("hoch=" + ",".join(Array(hoch_liste).map(func(v: int) -> String: return str(v))))
	var datei: FileAccess = FileAccess.open(ziel.path_join("clip.txt"), FileAccess.WRITE)
	datei.store_string("\n".join(text) + "\n")
	datei.close()
	print("Geschrieben: %s (%d Bilder, %.1f s)" % [ziel, ausgabe.size(), _sek(t0)])
	_aufraeumen()
	quit(0)


func _sek(t0: int) -> float:
	return float(Time.get_ticks_msec() - t0) / 1000.0


func _temp_leeren() -> void:
	var d: DirAccess = DirAccess.open(_temp)
	if d != null:
		for n: String in d.get_files():
			d.remove(n)


# ===========================================================================
# ffmpeg
# ===========================================================================

static func ffmpeg_lauf(args: Array) -> Dictionary:
	var ausgabe: Array = []
	var teile: PackedStringArray = PackedStringArray()
	for a: Variant in args:
		teile.append(str(a))
	var code: int = OS.execute("ffmpeg", teile, ausgabe, true)
	return {"code": code, "text": "".join(PackedStringArray(ausgabe))}


## Erste Zeile von `ffmpeg -version` („ffmpeg version 6.1.1-3ubuntu5“), leer bei einem Fehler.
static func ffmpeg_version() -> String:
	var r: Dictionary = ffmpeg_lauf(["-version"])
	if int(r["code"]) != 0:
		return ""
	var z: String = String(r["text"]).split("\n")[0]
	var p: int = z.find(" Copyright")
	return (z.substr(0, p) if p > 0 else z).strip_edges()


## Breite, Höhe und Bildrate des ersten Videostroms; leer, wenn ffmpeg nichts findet.
static func sonde(pfad: String) -> Dictionary:
	var r: Dictionary = ffmpeg_lauf(["-hide_banner", "-i", pfad])
	for z: String in String(r["text"]).split("\n"):
		if z.find("Video:") < 0:
			continue
		var m: RegEx = RegEx.new()
		m.compile("[ ,](\\d{2,5})x(\\d{2,5})[ ,\\[]")
		var t: RegExMatch = m.search(z)
		if t == null:
			continue
		var f: RegEx = RegEx.new()
		f.compile("([0-9.]+) fps")
		var ft: RegExMatch = f.search(z)
		return {"breite": int(t.get_string(1)), "hoehe": int(t.get_string(2)), "fps": ft.get_string(1) if ft != null else "0"}
	return {}


static func bild_laden(pfad: String) -> Image:
	var b: Image = Image.load_from_file(pfad)
	if b == null or b.is_empty():
		return null
	b.convert(Image.FORMAT_RGB8)
	return b


# ===========================================================================
# Schlüsselfarbe und Freistellen
# ===========================================================================

static func gruen_dominanz(k: Vector3i) -> int:
	return k.y - maxi(k.x, k.z)


## Schwelle (Prozent) des Grünanteils (g − max(r, b)) / g, ab der ein Punkt Hintergrund ist.
static func gruen_grenze(key: Vector3i) -> int:
	var rho0: int = gruen_dominanz(key) * 100 / maxi(key.y, 1)
	return clampi(rho0 * 65 / 100, 30, GRUEN_RHO_MAX)


static func median_hist(hist: PackedInt32Array, n: int) -> int:
	var halb: int = (n + 1) / 2
	var s: int = 0
	for v: int in 256:
		s += hist[v]
		if s >= halb:
			return v
	return 255


## Median je Kanal der Randstreifen (4 px, bei kleinen Bildern schmaler).
static func schluessel_farbe(d: PackedByteArray, w: int, h: int) -> Vector3i:
	var hr: PackedInt32Array = PackedInt32Array()
	hr.resize(256)
	var hg: PackedInt32Array = hr.duplicate()
	var hb: PackedInt32Array = hr.duplicate()
	var band: int = maxi(1, mini(4, mini(w, h) / 4))
	var n: int = 0
	for y: int in h:
		var ganz: bool = y < band or y >= h - band
		var x: int = 0
		while x < w:
			if not ganz and x == band:
				x = w - band
				continue
			var i: int = (y * w + x) * 3
			hr[d[i]] += 1
			hg[d[i + 1]] += 1
			hb[d[i + 2]] += 1
			n += 1
			x += 1
	return Vector3i(median_hist(hr, n), median_hist(hg, n), median_hist(hb, n))


## Ist der Punkt Figur? (grobe Prüfung für Stichproben)
static func ist_figur(r: int, g: int, b: int, key: Vector3i, modus: String) -> bool:
	if modus == "gruen":
		var m: int = r if r > b else b
		return not (g >= GRUEN_G_MIN and (g - m) * 100 >= gruen_grenze(key) * g)
	var dr: int = absi(r - key.x)
	var dg: int = absi(g - key.y)
	var db: int = absi(b - key.z)
	return maxi(dr, maxi(dg, db)) > TOL_ECKE


## Umschließendes Rechteck der Stichproben (alle `schritt` Pixel), die Figur sind; Größe 0, wenn keine.
## Ein Punkt allein zählt nicht (Rauschen): mindestens zwei Treffer je Zeile und Spalte-Nachbarschaft.
static func grober_rahmen(d: PackedByteArray, w: int, h: int, key: Vector3i, modus: String, schritt: int) -> Rect2i:
	var x0: int = w
	var y0: int = h
	var x1: int = -1
	var y1: int = -1
	var y: int = 0
	while y < h:
		var treffer: int = 0
		var zx0: int = w
		var zx1: int = -1
		var x: int = 0
		while x < w:
			var i: int = (y * w + x) * 3
			if ist_figur(d[i], d[i + 1], d[i + 2], key, modus):
				treffer += 1
				if x < zx0:
					zx0 = x
				zx1 = x
			x += schritt
		if treffer >= 2:
			if zx0 < x0:
				x0 = zx0
			if zx1 > x1:
				x1 = zx1
			if y < y0:
				y0 = y
			y1 = y
		y += schritt
	if x1 < 0:
		return Rect2i()
	return Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1)


static func zuschneiden_rgb(d: PackedByteArray, w: int, r: Rect2i) -> PackedByteArray:
	var aus: PackedByteArray = PackedByteArray()
	for y: int in range(r.position.y, r.end.y):
		aus.append_array(d.slice((y * w + r.position.x) * 3, (y * w + r.end.x) * 3))
	return aus


## Umschließendes Rechteck der Maske (Größe 0, wenn leer).
static func maske_rahmen(m: PackedByteArray, w: int, h: int) -> Rect2i:
	var x0: int = w
	var y0: int = h
	var x1: int = -1
	var y1: int = -1
	for y: int in h:
		var z: int = y * w
		for x: int in w:
			if m[z + x] != 0:
				if x < x0:
					x0 = x
				if x > x1:
					x1 = x
				if y < y0:
					y0 = y
				if y > y1:
					y1 = y
	if x1 < 0:
		return Rect2i()
	return Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1)


## Stellt ein RGB-Bild (w × h) frei. Rückgabe: maske (1 = Figur), farbe (RGB, an Kanten entmischt),
## schaerfe (1000 · Kantenpixel / (Kantenpixel + weiche Pixel)).
static func freistellen(d: PackedByteArray, w: int, h: int, key: Vector3i, modus: String) -> Dictionary:
	var n: int = w * h
	var alpha: PackedByteArray = PackedByteArray()
	alpha.resize(n)
	var maske: PackedByteArray = PackedByteArray()
	maske.resize(n)
	var farbe: PackedByteArray = d.duplicate()
	var weich: int = 0
	if modus == "gruen":
		var grenze: int = gruen_grenze(key)
		var halb: int = grenze / 2
		for p: int in n:
			var i: int = p * 3
			var r: int = d[i]
			var g: int = d[i + 1]
			var b: int = d[i + 2]
			var m: int = r if r > b else b
			var a: int = 255
			if g >= GRUEN_G_MIN:
				var rho: int = (g - m) * 100 / g
				if rho >= grenze:
					a = 0
				elif rho > halb:
					a = 255 * (grenze - rho) / (grenze - halb)
			alpha[p] = a
			if a >= 128:
				maske[p] = 1
			if a > 32 and a < 224:
				weich += 1
			# Grünstich an den Kanten: Grün auf den Wert des größeren der beiden anderen Kanäle begrenzen
			if g > m:
				farbe[i + 1] = m
	else:
		for p: int in n:
			var i: int = p * 3
			var dr: int = absi(d[i] - key.x)
			var dg: int = absi(d[i + 1] - key.y)
			var db: int = absi(d[i + 2] - key.z)
			var dist: int = maxi(dr, maxi(dg, db))
			var a: int = mini(255, dist * 128 / TOL_ECKE)
			alpha[p] = a
			if a >= 128:
				maske[p] = 1
			if a > 32 and a < 224:
				weich += 1
	_loecher_fuellen(maske, alpha, d, w, h, key)
	_inseln_entfernen(maske, w, h)
	var rand: int = 0
	for y: int in h:
		for x: int in w:
			var p: int = y * w + x
			if maske[p] == 0:
				continue
			if x == 0 or y == 0 or x == w - 1 or y == h - 1 or maske[p - 1] == 0 or maske[p + 1] == 0 or maske[p - w] == 0 or maske[p + w] == 0:
				rand += 1
	var schaerfe: int = 1000 * rand / (rand + weich) if rand + weich > 0 else 0
	return {"maske": maske, "farbe": farbe, "schaerfe": schaerfe}


## Vom Rand aus (4er-Nachbarschaft) unerreichbare Flächen ohne Figur: Figur, wenn klein (Rauschen) oder
## im Mittel weiter als LOCH_TOL von der Schlüsselfarbe entfernt (dunkle Kleidung). Echte Lücken zwischen
## Arm und Rumpf zeigen die Schlüsselfarbe selbst und bleiben durchsichtig.
static func _loecher_fuellen(maske: PackedByteArray, alpha: PackedByteArray, d: PackedByteArray, w: int, h: int, key: Vector3i) -> void:
	var n: int = w * h
	var aussen: PackedByteArray = PackedByteArray()
	aussen.resize(n)
	var stapel: PackedInt32Array = PackedInt32Array()
	stapel.resize(n)
	var sp: int = 0
	for x: int in w:
		for y: int in [0, h - 1]:
			var p: int = y * w + x
			if maske[p] == 0 and aussen[p] == 0:
				aussen[p] = 1
				stapel[sp] = p
				sp += 1
	for y: int in h:
		for x: int in [0, w - 1]:
			var p: int = y * w + x
			if maske[p] == 0 and aussen[p] == 0:
				aussen[p] = 1
				stapel[sp] = p
				sp += 1
	while sp > 0:
		sp -= 1
		var p: int = stapel[sp]
		var px: int = p % w
		var py: int = p / w
		if px > 0 and maske[p - 1] == 0 and aussen[p - 1] == 0:
			aussen[p - 1] = 1
			stapel[sp] = p - 1
			sp += 1
		if px < w - 1 and maske[p + 1] == 0 and aussen[p + 1] == 0:
			aussen[p + 1] = 1
			stapel[sp] = p + 1
			sp += 1
		if py > 0 and maske[p - w] == 0 and aussen[p - w] == 0:
			aussen[p - w] = 1
			stapel[sp] = p - w
			sp += 1
		if py < h - 1 and maske[p + w] == 0 and aussen[p + w] == 0:
			aussen[p + w] = 1
			stapel[sp] = p + w
			sp += 1
	# übrige Nicht-Figur-Pixel: Flächen einzeln prüfen
	for s: int in n:
		if maske[s] != 0 or aussen[s] != 0:
			continue
		var liste: PackedInt32Array = PackedInt32Array()
		aussen[s] = 2
		liste.append(s)
		var i: int = 0
		var summe: int = 0
		while i < liste.size():
			var p: int = liste[i]
			i += 1
			var q: int = p * 3
			summe += maxi(absi(d[q] - key.x), maxi(absi(d[q + 1] - key.y), absi(d[q + 2] - key.z)))
			var px: int = p % w
			var py: int = p / w
			if px > 0 and maske[p - 1] == 0 and aussen[p - 1] == 0:
				aussen[p - 1] = 2
				liste.append(p - 1)
			if px < w - 1 and maske[p + 1] == 0 and aussen[p + 1] == 0:
				aussen[p + 1] = 2
				liste.append(p + 1)
			if py > 0 and maske[p - w] == 0 and aussen[p - w] == 0:
				aussen[p - w] = 2
				liste.append(p - w)
			if py < h - 1 and maske[p + w] == 0 and aussen[p + w] == 0:
				aussen[p + w] = 2
				liste.append(p + w)
		if liste.size() < LOCH_MIN or summe / liste.size() > LOCH_TOL:
			for p: int in liste:
				maske[p] = 1
				alpha[p] = 255


## Behält die größte zusammenhängende Fläche (8er-Nachbarschaft) und alle Teile in ihrer Nähe
## (Radius Höhe/NAH_TEILER); alles andere und alles unter FLECK_MIN Pixeln fällt weg.
static func _inseln_entfernen(maske: PackedByteArray, w: int, h: int) -> void:
	var n: int = w * h
	var marke: PackedInt32Array = PackedInt32Array()
	marke.resize(n)
	var groessen: Array[int] = [0]
	var liste: PackedInt32Array = PackedInt32Array()
	liste.resize(n)
	var anzahl: int = 0
	for s: int in n:
		if maske[s] == 0 or marke[s] != 0:
			continue
		anzahl += 1
		marke[s] = anzahl
		var kopf: int = 0
		var ende: int = 0
		liste[ende] = s
		ende += 1
		while kopf < ende:
			var p: int = liste[kopf]
			kopf += 1
			var px: int = p % w
			var py: int = p / w
			for dy: int in range(maxi(py - 1, 0), mini(py + 2, h)):
				for dx: int in range(maxi(px - 1, 0), mini(px + 2, w)):
					var q: int = dy * w + dx
					if maske[q] != 0 and marke[q] == 0:
						marke[q] = anzahl
						liste[ende] = q
						ende += 1
		groessen.append(ende)
	if anzahl == 0:
		return
	var groesste: int = 1
	for k: int in range(2, anzahl + 1):
		if groessen[k] > groessen[groesste]:
			groesste = k
	# Erweiterung der größten Fläche um den Radius (quadratisch, zwei Durchläufe)
	var rb: int = maske_rahmen_marke(marke, w, h, groesste)
	var radius: int = maxi(2, rb / NAH_TEILER)
	var hd: PackedByteArray = PackedByteArray()
	hd.resize(n)
	for y: int in h:
		var letzte: int = -1000000
		for x: int in w:
			if marke[y * w + x] == groesste:
				letzte = x
			if x - letzte <= radius:
				hd[y * w + x] = 1
		letzte = 1000000
		for x: int in range(w - 1, -1, -1):
			if marke[y * w + x] == groesste:
				letzte = x
			if letzte - x <= radius:
				hd[y * w + x] = 1
	var vd: PackedByteArray = PackedByteArray()
	vd.resize(n)
	for x: int in w:
		var letzte: int = -1000000
		for y: int in h:
			if hd[y * w + x] != 0:
				letzte = y
			if y - letzte <= radius:
				vd[y * w + x] = 1
		letzte = 1000000
		for y: int in range(h - 1, -1, -1):
			if hd[y * w + x] != 0:
				letzte = y
			if letzte - y <= radius:
				vd[y * w + x] = 1
	var behalte: PackedByteArray = PackedByteArray()
	behalte.resize(anzahl + 1)
	behalte[groesste] = 1
	for p: int in n:
		var k: int = marke[p]
		if k != 0 and vd[p] != 0 and groessen[k] >= FLECK_MIN:
			behalte[k] = 1
	for p: int in n:
		var k: int = marke[p]
		if k != 0 and behalte[k] == 0:
			maske[p] = 0


## Höhe des umschließenden Rechtecks der Fläche `k` in der Markenkarte.
static func maske_rahmen_marke(marke: PackedInt32Array, w: int, h: int, k: int) -> int:
	var y0: int = h
	var y1: int = -1
	for y: int in h:
		for x: int in w:
			if marke[y * w + x] == k:
				if y < y0:
					y0 = y
				y1 = y
				break
	return y1 - y0 + 1 if y1 >= 0 else 0


static func median_int(a: Array[int]) -> int:
	var b: Array[int] = a.duplicate()
	b.sort()
	if b.is_empty():
		return 0
	return b[b.size() / 2]


# ===========================================================================
# Maßstab, Gitter, Verkleinern (Box-Filter, Festkomma 16.16)
# ===========================================================================

## Legt das Gitter des Clips fest: Anker im Arbeitsbild (Mitte der Füße, Bodenlinie) aus dem ersten Bild
## und den Faktor so, dass die Figur im ersten Bild genau `ziel` Zeilen hoch wird.
## Rückgabe: xa16, yb16, inv16 (Arbeitspixel je Zielpixel in 16.16), imin, jmin, breite, hoehe (Gitter über das ganze
## Arbeitsbild), faktor (Zielpixel je Arbeitspixel), hoehe_erstes.
static func gitter_bestimmen(maske: PackedByteArray, w: int, h: int, ziel: int) -> Dictionary:
	var rf: Rect2i = maske_rahmen(maske, w, h)
	if rf.size.y == 0:
		return {}
	var yl: int = rf.end.y - 1
	var inv: float = float(rf.size.y) / float(ziel)
	var beste: Dictionary = {}
	var bester_abstand: int = 1000000
	for versuch: int in 12:
		var inv16: int = roundi(inv * 65536.0)
		var fb: int = maxi(1, roundi(float(FUSS_ZEILEN) * inv))
		var xmin: int = w
		var xmax: int = -1
		for y: int in range(maxi(rf.position.y, yl - fb + 1), yl + 1):
			for x: int in w:
				if maske[y * w + x] != 0:
					if x < xmin:
						xmin = x
					if x > xmax:
						xmax = x
		var xa16: int = (xmin + xmax + 1) * 65536 / 2
		var yb16: int = (yl + 1) * 65536
		var g: Dictionary = _gitter(xa16, yb16, inv16, w, h)
		var f: PackedByteArray = herunter(maske, PackedByteArray(), w, h, g, true)
		var hoehe: int = _figurhoehe(f, int(g["breite"]), int(g["hoehe"]))
		var abstand: int = absi(hoehe - ziel)
		if abstand < bester_abstand:
			bester_abstand = abstand
			g["hoehe_erstes"] = hoehe
			g["faktor"] = 65536.0 / float(inv16)
			beste = g
		if hoehe == ziel:
			break
		inv *= float(hoehe) / float(ziel)
	return beste


static func _gitter(xa16: int, yb16: int, inv16: int, w: int, h: int) -> Dictionary:
	var inv: float = float(inv16) / 65536.0
	var imin: int = floori(-float(xa16) / 65536.0 / inv) - 1
	var imax: int = ceili((float(w) - float(xa16) / 65536.0) / inv) + 1
	var jmin: int = floori(-float(yb16) / 65536.0 / inv) - 1
	var jmax: int = ceili((float(h) - float(yb16) / 65536.0) / inv) + 1
	return {"xa16": xa16, "yb16": yb16, "inv16": inv16, "imin": imin, "jmin": jmin, "breite": imax - imin + 1, "hoehe": jmax - jmin + 1}


static func _figurhoehe(f: PackedByteArray, b: int, h: int) -> int:
	var y0: int = h
	var y1: int = -1
	for y: int in h:
		for x: int in b:
			if f[(y * b + x) * 4 + 3] != 0:
				if y < y0:
					y0 = y
				y1 = y
				break
	return y1 - y0 + 1 if y1 >= 0 else 0


## Verkleinert Maske und Farbe auf das Gitter (RGBA8). Box-Filter: Ein Zielpixel ist deckend, wenn
## mindestens die Hälfte seiner Fläche Figur ist; die Farbe ist das Flächenmittel der Figurpixel.
## `nur_maske`: Farbe ignorieren (Maßstabssuche).
static func herunter(maske: PackedByteArray, farbe: PackedByteArray, w: int, h: int, g: Dictionary, nur_maske: bool = false) -> PackedByteArray:
	var b: int = g["breite"]
	var gh: int = g["hoehe"]
	var imin: int = g["imin"]
	var jmin: int = g["jmin"]
	var xa16: int = g["xa16"]
	var yb16: int = g["yb16"]
	var inv16: int = g["inv16"]
	var aus: PackedByteArray = PackedByteArray()
	aus.resize(b * gh * 4)
	var w16: int = w * 65536
	var h16: int = h * 65536
	for gj: int in gh:
		var yt: int = yb16 + (jmin + gj) * inv16
		var yu: int = yt + inv16
		if yu <= 0 or yt >= h16:
			continue
		var py0: int = maxi(0, yt >> 16)
		var py1: int = mini(h - 1, (yu - 1) >> 16)
		for gi: int in b:
			var i: int = imin + gi
			var xl: int = xa16 + (((2 * i - 1) * inv16) >> 1)
			var xr: int = xa16 + (((2 * i + 1) * inv16) >> 1)
			if xr <= 0 or xl >= w16:
				continue
			var px0: int = maxi(0, xl >> 16)
			var px1: int = mini(w - 1, (xr - 1) >> 16)
			var gesamt: int = (xr - xl) * (yu - yt)
			var deck: int = 0
			var sr: int = 0
			var sg: int = 0
			var sb: int = 0
			for py: int in range(py0, py1 + 1):
				var wy: int = mini(yu, (py + 1) << 16) - maxi(yt, py << 16)
				var z: int = py * w
				for px: int in range(px0, px1 + 1):
					if maske[z + px] == 0:
						continue
					var wx: int = mini(xr, (px + 1) << 16) - maxi(xl, px << 16)
					var wgt: int = wx * wy
					deck += wgt
					if not nur_maske:
						var q: int = (z + px) * 3
						sr += farbe[q] * wgt
						sg += farbe[q + 1] * wgt
						sb += farbe[q + 2] * wgt
			if deck * 2 >= gesamt and deck > 0:
				var o: int = (gj * b + gi) * 4
				if not nur_maske:
					aus[o] = (sr + deck / 2) / deck
					aus[o + 1] = (sg + deck / 2) / deck
					aus[o + 2] = (sb + deck / 2) / deck
				aus[o + 3] = 255
	return aus


static func zuschnitt_rgba(f: PackedByteArray, b: int, _h: int, x0: int, y0: int, ob: int, oh: int) -> PackedByteArray:
	var aus: PackedByteArray = PackedByteArray()
	aus.resize(ob * oh * 4)
	for y: int in oh:
		var qy: int = y0 + y
		var zeile: int = (qy * b + x0) * 4
		for x: int in ob:
			var qx: int = x0 + x
			if qx < 0 or qx >= b or qy < 0:
				continue
			var s: int = zeile + x * 4
			if s + 3 >= f.size():
				continue
			var o: int = (y * ob + x) * 4
			aus[o] = f[s]
			aus[o + 1] = f[s + 1]
			aus[o + 2] = f[s + 2]
			aus[o + 3] = f[s + 3]
	return aus


## Anker im zugeschnittenen ersten Bild: x = Mitte der untersten FUSS_ZEILEN Zeilen der Figur,
## y = unterste Figurzeile.
static func anker_bestimmen(f: PackedByteArray, b: int, h: int) -> Vector2i:
	var unten: int = -1
	for y: int in range(h - 1, -1, -1):
		for x: int in b:
			if f[(y * b + x) * 4 + 3] != 0:
				unten = y
				break
		if unten >= 0:
			break
	if unten < 0:
		return Vector2i(0, 0)
	var xmin: int = b
	var xmax: int = -1
	for y: int in range(maxi(0, unten - FUSS_ZEILEN + 1), unten + 1):
		for x: int in b:
			if f[(y * b + x) * 4 + 3] != 0:
				if x < xmin:
					xmin = x
				if x > xmax:
					xmax = x
	return Vector2i((xmin + xmax) / 2, unten)


# ===========================================================================
# Palette (Medianschnitt aus umsetzer.gd; Farben vorher auf 5 Bit je Kanal gebündelt)
# ===========================================================================

## Wendet höchstens HOECHST_FARBEN Farben gemeinsam auf alle Bilder an (RGBA8 in place). Rückgabe: farben, klassen.
static func palette_anwenden(bilder: Array) -> Dictionary:
	var summen: Dictionary = {}
	for f: PackedByteArray in bilder:
		for p: int in f.size() / 4:
			var o: int = p * 4
			if f[o + 3] == 0:
				continue
			var k: int = ((f[o] >> 3) << 10) | ((f[o + 1] >> 3) << 5) | (f[o + 2] >> 3)
			var s: Array = summen.get(k, [0, 0, 0, 0])
			s[0] += f[o]
			s[1] += f[o + 1]
			s[2] += f[o + 2]
			s[3] += 1
			summen[k] = s
	var haeufig: Dictionary = {}
	var klasse_farbe: Dictionary = {}
	var schluessel: Array = summen.keys()
	schluessel.sort()
	for k: int in schluessel:
		var s: Array = summen[k]
		var c: int = (((s[0] + s[3] / 2) / s[3]) << 16) | (((s[1] + s[3] / 2) / s[3]) << 8) | ((s[2] + s[3] / 2) / s[3])
		klasse_farbe[k] = c
		haeufig[c] = int(haeufig.get(c, 0)) + int(s[3])
	var umsetzer: GDScript = load("res://werkzeuge/umsetzer.gd")
	var palette: Array = []
	if haeufig.size() <= HOECHST_FARBEN:
		palette = haeufig.keys()
		palette.sort()
	else:
		palette = umsetzer.call("medianschnitt", haeufig, HOECHST_FARBEN, 2)
	var abbildung: Dictionary = {}
	for k: int in schluessel:
		var c: int = klasse_farbe[k]
		abbildung[k] = palette[int(umsetzer.call("naechste_farbe", c, palette))]
	for fi: int in bilder.size():
		var f: PackedByteArray = bilder[fi]
		for p: int in f.size() / 4:
			var o: int = p * 4
			if f[o + 3] == 0:
				f[o] = 0
				f[o + 1] = 0
				f[o + 2] = 0
				continue
			var k: int = ((f[o] >> 3) << 10) | ((f[o + 1] >> 3) << 5) | (f[o + 2] >> 3)
			var c: int = abbildung[k]
			f[o] = (c >> 16) & 255
			f[o + 1] = (c >> 8) & 255
			f[o + 2] = c & 255
		bilder[fi] = f
	var benutzt: Dictionary = {}
	for c: int in abbildung.values():
		benutzt[c] = true
	return {"farben": benutzt.size(), "klassen": summen.size(), "palette": palette}


# ===========================================================================
# Erkennung: Bildunterschriften, Zyklus, Ereignisse, Schrittlänge
# ===========================================================================

## Bildunterschrift: SIG × SIG Zellen, je Zelle Deckung und vormultiplizierte Farbe (4 Bytes).
static func signatur(f: PackedByteArray, b: int, h: int) -> PackedByteArray:
	var s: PackedInt32Array = PackedInt32Array()
	s.resize(SIG * SIG * 4)
	var flaeche: PackedInt32Array = PackedInt32Array()
	flaeche.resize(SIG * SIG)
	for y: int in h:
		var zy: int = y * SIG / h
		for x: int in b:
			var zx: int = x * SIG / b
			var z: int = zy * SIG + zx
			flaeche[z] += 1
			var o: int = (y * b + x) * 4
			if f[o + 3] != 0:
				s[z * 4] += 255
				s[z * 4 + 1] += f[o]
				s[z * 4 + 2] += f[o + 1]
				s[z * 4 + 3] += f[o + 2]
	var aus: PackedByteArray = PackedByteArray()
	aus.resize(SIG * SIG * 4)
	for z: int in SIG * SIG:
		if flaeche[z] == 0:
			continue
		for k: int in 4:
			aus[z * 4 + k] = s[z * 4 + k] / flaeche[z]
	return aus


static func sig_abstand(a: PackedByteArray, b: PackedByteArray) -> int:
	var s: int = 0
	for k: int in a.size():
		var v: int = a[k] - b[k]
		s += v if v >= 0 else -v
	return s


## Zyklus aus Bildpaaren (i, i + n). Für jedes n ist der Wert der mittlere Unterschied der Bildunterschriften von
## Bild i und Bild i + n. Zykluslänge = kleinstes n, das ein lokales Minimum ist und höchstens 60 % des größten
## Wertes davor erreicht (ein Tal nach einem Berg; ein stetig wachsender Verlauf einer langsamen Bewegung hat keines).
## Findet sich keines, ist der ganze Clip der Zyklus. Der Start ist das Bild mit dem kleinsten Schließfehler
## D(i, i + n) unter den Anfängen, in deren Abschnitt Bewegung ist (mittlerer Unterschied aufeinanderfolgender
## Bilder mindestens die Hälfte des oberen Viertels), damit nicht ein ruhiger Anfang oder Schluss gewählt wird.
## Rückgabe: n, start (0-basiert), fehler (D(start, start + n)), guete (Prozent unter dem Median der Werte),
## bewegung (Schließfehler in Prozent des mittleren Unterschieds aufeinanderfolgender Bilder im Zyklus),
## kandidaten (Array von [n, Wert]), werte (Dictionary n → Wert).
static func zyklus_suchen(sigs: Array) -> Dictionary:
	var zahl: int = sigs.size()
	var nmax: int = zahl / 2
	if nmax < ZYKLUS_MIN + 2:
		return zyklus_start_fuer(sigs, zahl)
	var werte: Dictionary = {}
	var liste: Array[int] = []
	for n: int in range(ZYKLUS_MIN, nmax + 1):
		var s: int = 0
		for i: int in zahl - n:
			s += sig_abstand(sigs[i], sigs[i + n])
		var mittel: int = s * 16 / (zahl - n)
		werte[n] = mittel
		liste.append(mittel)
	# Täler (lokale Minima nach einem Berg), mit Tiefe in Prozent unter dem größten Wert davor
	var kandidaten: Array = []
	var berg: int = 0
	for n: int in range(ZYKLUS_MIN, nmax + 1):
		var w: int = werte[n]
		var links: int = int(werte.get(n - 1, 1 << 60))
		var rechts: int = int(werte.get(n + 1, 1 << 60))
		if n > ZYKLUS_MIN and w <= links and w <= rechts and w * 100 <= berg * TAL_LOCKER:
			kandidaten.append([n, w, 100 - w * 100 / maxi(berg, 1)])
		berg = maxi(berg, w)
	# erstes tiefes Tal (höchstens 60 % des Bergs), sonst das erste flache (höchstens TAL_LOCKER %)
	var wahl: int = -1
	for k: int in kandidaten.size():
		if int((kandidaten[k] as Array)[2]) >= 100 - TAL_STRENG:
			wahl = k
			break
	if wahl < 0 and not kandidaten.is_empty():
		wahl = 0
	var r: Dictionary
	if wahl < 0:
		r = zyklus_start_fuer(sigs, zahl)
	else:
		r = zyklus_start_fuer(sigs, int((kandidaten[wahl] as Array)[0]))
		r["guete"] = int((kandidaten[wahl] as Array)[2])
	r["kandidaten"] = kandidaten
	r["werte"] = werte
	return r


## Mittlerer Unterschied aufeinanderfolgender Bilder (Bewegung) je Bild i (zu i + 1), für den ganzen Clip.
static func bewegung_je_bild(sigs: Array) -> Array[int]:
	var b: Array[int] = []
	for i: int in sigs.size() - 1:
		b.append(sig_abstand(sigs[i], sigs[i + 1]))
	return b


## Bester Startpunkt für die Zykluslänge n; bei n = Bilderzahl der ganze Clip (Start 0, Schließfehler letzter → erster).
static func zyklus_start_fuer(sigs: Array, n: int) -> Dictionary:
	var zahl: int = sigs.size()
	var bew: Array[int] = bewegung_je_bild(sigs)
	var sortiert: Array[int] = bew.duplicate()
	sortiert.sort()
	var viertel: int = sortiert[sortiert.size() * 3 / 4] if not sortiert.is_empty() else 0
	var mittel_bew: int = 0
	if n >= zahl:
		for v: int in bew:
			mittel_bew += v
		mittel_bew = mittel_bew / maxi(bew.size(), 1)
		var fe: int = sig_abstand(sigs[zahl - 1], sigs[0])
		return {"n": zahl, "start": 0, "fehler": fe, "bewegung": fe * 100 / maxi(mittel_bew, 1), "guete": 0, "kandidaten": [], "werte": {}}
	var bester: int = 1 << 60
	var start: int = -1
	for i: int in zahl - n:
		var summe: int = 0
		for k: int in range(i, i + n):
			summe += bew[k]
		if summe * 2 < viertel * n:
			continue
		var d: int = sig_abstand(sigs[i], sigs[i + n])
		if d < bester:
			bester = d
			start = i
	if start < 0:
		# keine Bewegung im Clip: kleinster Schließfehler überall
		for i: int in zahl - n:
			var d: int = sig_abstand(sigs[i], sigs[i + n])
			if d < bester:
				bester = d
				start = i
	var sm: int = 0
	for k: int in range(start, start + n):
		sm += bew[k]
	return {"n": n, "start": start, "fehler": bester, "bewegung": bester * 100 / maxi(sm / n, 1), "guete": 0, "kandidaten": [], "werte": {}}


## Größte Ausdehnung der Figur nach vorn (x relativ zum Anker, nach rechts) und höchster Punkt
## (Abstand der obersten Zeile von der Bildoberkante; kleiner = höher). Rückgabe Vector2i(vorn, oben).
static func ausdehnung(f: PackedByteArray, b: int, h: int, ankerx: int) -> Vector2i:
	var vorn: int = -100000
	var oben: int = h
	for y: int in h:
		for x: int in b:
			if f[(y * b + x) * 4 + 3] != 0:
				if x - ankerx > vorn:
					vorn = x - ankerx
				if y < oben:
					oben = y
	return Vector2i(vorn, oben)


## Ausholen-Ende, Kontakt, Ruhe (0-basierte Bildnummern).
##  Kontakt: erstes Bild, dessen Ausdehnung (vorn: nach rechts, hoch: nach oben) höchstens ein Zehntel des Hubs
##           (mindestens KONTAKT_TOL) unter dem Größtwert des Clips liegt (die Pose vor dem Zurückziehen; ein leicht
##           weiter ausholender Nachschwung zählt nicht).
##  Ausholen-Ende: letztes Bild bis zum Kontakt, dessen Ausdehnung höchstens diese Toleranz über dem Kleinstwert
##           bis dahin liegt (am weitesten zurückgezogen, danach beginnt der Schlag).
##  Ruhe: erstes Bild nach dem Kontakt, das dem ersten Bild wieder gleicht (Bildunterschrift höchstens ein
##           Sechstel des größten Unterschieds zum ersten Bild).
##  Bewegung: erstes Bild, das sich vom ersten Bild unterscheidet (über derselben Schwelle).
static func ereignisse_suchen(sigs: Array, vorn: Array[int], hoch: Array[int], metrik: String) -> Dictionary:
	var zahl: int = sigs.size()
	var mass: Array[int] = []
	for i: int in zahl:
		mass.append(vorn[i] if metrik == "vorn" else -hoch[i])
	var spitze: int = mass[0]
	for v: int in mass:
		spitze = maxi(spitze, v)
	var am: int = 0
	for i: int in zahl:
		if mass[i] == spitze:
			am = i
			break
	var kl: int = mass[0]
	for i: int in range(0, am + 1):
		kl = mini(kl, mass[i])
	# Toleranz: ein Zehntel des Hubs (Ausholen bis Spitze), mindestens KONTAKT_TOL Bildpixel
	var tol: int = maxi(KONTAKT_TOL, (spitze - kl) / 10)
	var kontakt: int = 0
	for i: int in zahl:
		if mass[i] >= spitze - tol:
			kontakt = i
			break
	var kleinst: int = mass[0]
	for i: int in range(0, kontakt + 1):
		kleinst = mini(kleinst, mass[i])
	var ausholen: int = 0
	for i: int in range(0, kontakt + 1):
		if mass[i] <= kleinst + tol:
			ausholen = i
	var d0: Array[int] = []
	var gipfel: int = 0
	for i: int in zahl:
		var d: int = sig_abstand(sigs[i], sigs[0])
		d0.append(d)
		gipfel = maxi(gipfel, d)
	var schwelle: int = maxi(gipfel / 6, 1)
	var bewegung: int = 0
	for i: int in range(1, zahl):
		if d0[i] > schwelle:
			bewegung = i
			break
	var ruhe: int = zahl - 1
	for i: int in range(kontakt + 1, zahl):
		if d0[i] <= schwelle:
			ruhe = i
			break
	return {"ausholen": ausholen, "kontakt": kontakt, "ruhe": ruhe, "bewegung": bewegung, "schwelle": schwelle}


## Schrittlänge für das Gehen: Im Fußband (die untersten FUSS_BAND Zeilen über der Bodenlinie `bodeny`) ist die Breite
## der Figur am größten, wenn die Füße auseinander stehen, und am kleinsten, wenn sie zusammen stehen; der
## Unterschied ist die Schrittlänge in Bildpixeln. Ein Doppelschritt (der Zyklus) ist zwei Schritte lang; mit
## dem Gehtempo der Logik (KernWerte.LAUF_X · 2 Bildpixel je Tick) ergibt sich die Zyklusdauer in Ticks,
## damit der Standfuß nicht rutscht. Nicht messbar (Schritt unter 8 px): 24 Ticks.
## Gemessen wird über die Bilder des Zyklus (start, n).
static func schrittlaenge(bilder: Array, b: int, h: int, bodeny: int, start: int, n: int) -> Dictionary:
	var kleinst: int = 1 << 30
	var groesst: int = 0
	for i: int in range(start, mini(start + n, bilder.size())):
		var f: PackedByteArray = bilder[i]
		var xmin: int = b
		var xmax: int = -1
		for y: int in range(maxi(0, bodeny - FUSS_BAND + 1), mini(h, bodeny + 1)):
			for x: int in b:
				if f[(y * b + x) * 4 + 3] != 0:
					if x < xmin:
						xmin = x
					if x > xmax:
						xmax = x
		if xmax >= xmin:
			var breite: int = xmax - xmin + 1
			kleinst = mini(kleinst, breite)
			groesst = maxi(groesst, breite)
	var schritt: int = groesst - kleinst if groesst > 0 else 0
	var ticks: int = 24
	if schritt >= 8:
		ticks = clampi((schritt * 65536 + KernWerte.LAUF_X / 2) / KernWerte.LAUF_X, 12, 60)
	return {"schritt": schritt, "ticks": ticks}
