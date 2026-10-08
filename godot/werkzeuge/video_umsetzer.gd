extends SceneTree
## Video-Umsetzer: macht aus einem kurzen Video von Vela (Grok, Weg „Vela als Video“,
## docs/grafik-bestellung.md) eine Bildfolge für das Spiel (Pixelkunst, 142 Bildpixel hohe Figur,
## höchstens 64 Farben, harte Kante) samt `clip.txt` mit den erkannten Zyklus- und Ereignisdaten.
## Die Zuordnung der Bilder zur Aktionsuhr der Logik macht DarstellungVelaFramesTabelle.
##
## Aufruf (Repo-Wurzel; Pfade ab Repo-Wurzel oder absolut):
##   godot --headless --path godot --script res://werkzeuge/video_umsetzer.gd -- \
##       --video <datei> --name <clip> [--aus godot/grafik/vela_video] [--schluessel gruen|ecke] \
##       [--hoehe 142] [--zyklus <n>] [--ereignis vorn|hoch|sprung|treffer|flug|aufstehen|keine] [--bilder <n>]
##       [--kuerzen ja|nein|auto] [--behalte] [--tol <n>] [--loch <n>] [--fleck <n>] [--staub <n>] [--ab <n>] [--bis <n>]
##       [--faktor <massstab>|--massstab-von <clip>] [--ankerx fest|schwerpunkt|uebergang] [--ankery fest|unten]
##       [--schwerpunkt-ab <n>] [--setze name=n,...] [--schleife pingpong]
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
##                        hoch = höchster Punkt (Haken von unten). sprung, treffer, flug, aufstehen: Ereignisse der
##                        Haltung, Sprungs, Treffers, Flugs und Aufstehens (siehe ereignisse_andere), keine: keine.
##   --bilder <n>         nur die ersten n Videobilder verarbeiten (zum Probieren)
##   --ab <n>, --bis <n>  erstes und letztes zu verarbeitendes Videobild (1-basiert, gezählt nach dem Überspringen
##                        der Einblendung); schneidet einen Abschnitt aus einem langen Video (z. B. Aufstehen aus
##                        dem 12-Sekunden-Video). Die Zahlen stehen als `ab`/`bis` in clip.txt.
##   --tol <n>, --loch <n>, --fleck <n>   nur Modus ecke. tol: Abstand zur Randfarbe (größter Kanalunterschied), ab
##                        dem ein Punkt Figur ist (Standard 40; auf schwarzem Grund 6, damit auch das fast schwarze
##                        Top Figur bleibt); loch: vom Rand unerreichbare Flächen mit mittlerem Abstand über `loch`
##                        sind Figur (Standard 24; auf Schwarz 2: dunkle Kleidung füllen, echte Lücken bleiben offen);
##                        fleck: kleinste Fläche (Pixel in der Arbeitsauflösung), die als Teil der Figur gilt (Standard 4).
##   --ausser a-b,c       Videobilder weglassen (1-basiert wie --ab), z. B. Funken-Effekte eines Treffers, die Grok in
##                        einzelne Bilder gemalt hat. Steht als `ausser=` in clip.txt.
##   --staub <n>          dunkle Streupixel (Bodenstaub) entfernen: dunkle Figurpixel, in deren 7×7-Umgebung (Arbeits-
##                        auflösung) weniger als n Prozent Figur sind (Standard 0 = aus; 38 für das Liegen).
##   --ankerx-video <x>   fester Anker-x in Pixeln des Videos (statt der Fußmitte des ersten Bildes): gleiche Lage für
##                        mehrere Clips aus demselben Video (umgeworfen, liegen, aufstehen).
##   --faktor <m>         Maßstab (clip.txt `massstab`: Spielbildpixel je Videopixel) fest vorgeben, statt die Figur
##                        im ersten Bild auf --hoehe zu bringen (Clips, die nicht in der Kampfhaltung beginnen).
##   --massstab-von <c>   dasselbe, der Maßstab wird aus <aus>/<c>/clip.txt gelesen.
##   --ankerx fest        Standard: Fußmitte des ersten Bildes für alle Bilder (die Figur bleibt auf der Stelle).
##   --ankerx schwerpunkt Der Anker wandert mit dem Schwerpunkt der Silhouette (Flug: die Logik bewegt die Figur, das
##                        Bild zeigt nur die Haltung). Bis Bild --schwerpunkt-ab geht er gleitend von der Fußmitte des
##                        ersten Bildes zum Schwerpunkt; ab da ist es der Schwerpunkt (3-Bild-Mittel).
##   --ankerx mittel      Der Anker ist für alle Bilder der mittlere Schwerpunkt aller Bilder (laufende Figur auf der Stelle:
##                        die Mitte des Körpers steht über dem Fußpunkt der Logik, Arme und Beine pendeln darum).
##   --ankerx uebergang   Der Anker geht gleichmäßig vom Schwerpunkt des ersten (oder von --ankerx-video) zur Fußmitte des
##                        letzten Bildes (Aufstehen: liegt wie `liegen`, steht wie `stand`).
##   --ankery fest        Standard: Bodenlinie des ersten Bildes. --ankery unten: die unterste Figurzeile jedes Bildes liegt
##                        auf dem Anker (Sprung, Flug, Liegen: die Höhe liefert die Logik).
##   --setze n=b,...      Ereignisse von Hand setzen (Name=Bildnummer 1-basiert), überschreibt die Erkennung; steht im
##                        clip.txt unter `setze=`.
##   --schritt lauf       Schrittlänge für das Sprinten (Beinspreizung) statt für das Gehen (Fußband).
##   --schleife pingpong  Schleife hin und her (Zyklus vorwärts, dann rückwärts), wenn kein Zyklus schließt.
##   --kuerzen ja|nein|auto  Wartezeit vor dem Schlag abschneiden (auto: Clips, deren Name „kette“ enthält)
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
## HD-Modus (--hd): Standardhöhe der Figur in Clipbildpixeln, Arbeitsauflösung in Prozent der Zielhöhe (Figur im Arbeitsbild),
## Breite des weichen Übergangs (Arbeitspixel; Standard aus der Figurhöhe, siehe kante_standard), Farbabstand, bis zu dem ein
## Randpixel noch als Mischung aus Figurfarbe und Schlüsselfarbe gilt (WEICH_REST), Alpha unter WEICH_ALPHA_MIN (von 255) fällt weg.
const HD_HOEHE_STANDARD: int = 360
const HD_ARBEIT_PROZENT: int = 150
const WEICH_REST: int = 30
const WEICH_ALPHA_MIN: int = 8
## Abstand von |Figurfarbe − Schlüsselfarbe|, ab dem sich ein Randpixel entmischen lässt (sonst nur die Grün-Dominanz).
const WEICH_ENTMISCHEN_MIN: int = 60
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
## Staub (--staub): dunkle Figurpixel (größter Kanal höchstens STAUB_DUNKEL), in deren (2 · STAUB_RADIUS + 1)²-Fenster
## weniger als `staub` Prozent der Pixel Figur sind, werden entfernt (Bodenstaub, Streupixel an der Kante).
const STAUB_DUNKEL: int = 64
const STAUB_RADIUS: int = 3
## Auch graue Pixel (Staub ist grau, nicht schwarz): größter Kanal höchstens STAUB_GRAU und Farbigkeit (größter minus kleinster Kanal) höchstens STAUB_FARBIG.
const STAUB_GRAU: int = 130
const STAUB_FARBIG: int = 30
const FUSS_ZEILEN: int = 6
const FUSS_BAND: int = 10
## Laufen (--schritt lauf): untere Zeilen, in denen die Beinspreizung gemessen wird, und Länge eines Stiefels in Bildpixeln.
const LAUF_BAND: int = 56
const LAUF_STIEFEL: int = 20
## Raster der Bildunterschrift für Zyklus und Ereignisse.
const SIG: int = 24
const ZYKLUS_MIN: int = 3
## Täler der Paarunterschiede: tief (Prozent des Bergs davor) bzw. noch zulässig, wenn es kein tiefes gibt.
const TAL_STRENG: int = 60
const TAL_LOCKER: int = 90
## Tal gilt als tief ab dieser Tiefe (Prozent unter dem Berg davor); Schließfehler unter SCHLUSS_GUT Prozent eines
## gewöhnlichen Bildschritts sind unauffällig.
const TAL_TIEF: int = 40
const SCHLUSS_GUT: int = 60
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
	if not ["vorn", "hoch", "sprung", "treffer", "flug", "aufstehen", "keine"].has(ereignis):
		_fehler("--ereignis: vorn, hoch, sprung, treffer, flug, aufstehen oder keine")
		return
	var tol: int = int(arg.get("tol", str(TOL_ECKE)))
	var loch: int = int(arg.get("loch", str(LOCH_TOL)))
	var fleck: int = int(arg.get("fleck", str(FLECK_MIN)))
	var staub: int = int(arg.get("staub", "0"))
	var ausser: Dictionary = {}
	for t: String in String(arg.get("ausser", "")).split(",", false):
		var ab_bis: PackedStringArray = t.split("-")
		for nr: int in range(int(ab_bis[0]), int(ab_bis[ab_bis.size() - 1]) + 1):
			ausser[nr] = true
	var ab: int = maxi(int(arg.get("ab", "1")), 1)
	var bis: int = int(arg.get("bis", "0"))
	var anker_x: String = String(arg.get("ankerx", "fest"))
	var anker_y: String = String(arg.get("ankery", "fest"))
	if not ["fest", "schwerpunkt", "uebergang", "mittel"].has(anker_x) or not ["fest", "unten"].has(anker_y):
		_fehler("--ankerx fest|schwerpunkt|uebergang|mittel, --ankery fest|unten")
		return
	var rampe: int = int(arg.get("schwerpunkt-ab", "1"))
	var schleife_art: String = String(arg.get("schleife", ""))
	var setze: Dictionary = {}
	for kv: String in String(arg.get("setze", "")).split(",", false):
		var t: PackedStringArray = kv.split("=")
		if t.size() == 2:
			setze[t[0]] = int(t[1])
	var faktor_vorgabe: float = float(arg.get("faktor", "0"))
	var hd: bool = arg.has("hd")
	var ziel_hoehe: int = int(arg.get("hoehe", str(HD_HOEHE_STANDARD if hd else ZIELHOEHE_STANDARD)))
	if ziel_hoehe < 16 or ziel_hoehe > 600:
		_fehler("--hoehe außerhalb 16 bis 600")
		return
	# Höhe der Figur im Spiel (Bildpixel der Logik) und damit des Analyseclips: im Pixelmodus gleich --hoehe
	var spiel_hoehe: int = int(arg.get("spielhoehe", str(ZIELHOEHE_STANDARD))) if hd else ziel_hoehe
	if spiel_hoehe < 16 or spiel_hoehe > ziel_hoehe:
		_fehler("--spielhoehe außerhalb 16 bis --hoehe")
		return
	var arbeit_prozent: int = int(arg.get("arbeit", str(HD_ARBEIT_PROZENT))) if hd else ARBEIT * 100
	if arbeit_prozent < 100 or arbeit_prozent > 400:
		_fehler("--arbeit außerhalb 100 bis 400 (Prozent der Zielhöhe)")
		return
	var bild_format: String = String(arg.get("format", "png")) if hd else "png"
	if bild_format != "png" and bild_format != "webp":
		_fehler("--format: png oder webp")
		return
	_behalte = arg.has("behalte")
	var video_pfad: String = absolut(video)
	var aus_ordner: String = absolut(String(arg.get("aus", AUS_STANDARD)))
	if arg.has("massstab-von"):
		var ref_text: String = FileAccess.get_file_as_string(aus_ordner.path_join(String(arg["massstab-von"])).path_join("clip.txt"))
		for z: String in ref_text.split("\n"):
			if z.begins_with("massstab="):
				faktor_vorgabe = float(z.substr(9))
		if faktor_vorgabe <= 0.0:
			_fehler("--massstab-von: kein massstab in %s" % String(arg["massstab-von"]))
			return
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
	var sonde_fig: Dictionary = freistellen(sd, sw, sh, key0, modus, tol, loch, fleck, staub)
	var sonde_rahmen: Rect2i = maske_rahmen(sonde_fig["maske"], sw, sh)
	if sonde_rahmen.size.y == 0:
		_fehler("keine Figur im Sondenbild gefunden (Schlüsselfarbe (%d, %d, %d), Modus %s)" % [key0.x, key0.y, key0.z, modus])
		return
	# Arbeitsauflösung: Figur etwa ARBEIT × Zielhöhe hoch (nie über der Auflösung der Quelle)
	var arbeit_h: int = mini(int(info["hoehe"]), roundi(float(sonde_h) * float(arbeit_prozent * ziel_hoehe) / 100.0 / float(sonde_rahmen.size.y)))
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
		rahmen_je.append(grober_rahmen(bd, arbeit_w, arbeit_h, k, modus, 3, tol))
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
	# Abschnitt (--ab, --bis; gezählt ab dem ersten stabilen Bild)
	var abschnitt_vorn: int = ab - 1
	s_von += abschnitt_vorn
	if bis > 0:
		s_bis = mini(s_bis, einblend_vorn + bis - 1)
	if s_von > s_bis:
		_fehler("--ab/--bis: leerer Abschnitt")
		return
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
	# Größe der Figur im Arbeitsbild gegenüber dem Pixelmodus (Prozent): Flecken, Löcher und Staubfenster wachsen mit.
	var skala_p: int = 100
	var kante: int = 0
	if hd:
		var arbeit_fig: float = float(sonde_rahmen.size.y) * float(arbeit_h) / float(sonde_h)
		skala_p = maxi(100, roundi(arbeit_fig * 100.0 / float(ARBEIT * ZIELHOEHE_STANDARD)))
		kante = int(arg.get("kante", "0"))
		if kante <= 0:
			kante = kante_standard(arbeit_fig)
		if not arg.has("fleck"):
			fleck = maxi(FLECK_MIN, FLECK_MIN * skala_p * skala_p / 10000)
		print("HD: Figur im Arbeitsbild %.0f Zeilen (%d %% des Pixelmodus), Übergang %d px, Ziel %d Zeilen (Spiel %d)" % [arbeit_fig, skala_p, kante, ziel_hoehe, spiel_hoehe])
	var bilder: Array = []
	for i: int in range(s_von, s_bis + 1):
		var b: Image = bild_laden(_temp.path_join("w_%04d.png" % (i + 1)))
		var bd: PackedByteArray = b.get_data()
		var k: Vector3i = keys[i]
		var ausschnitt: PackedByteArray = zuschneiden_rgb(bd, arbeit_w, rahmen)
		var fig: Dictionary = freistellen(ausschnitt, rahmen.size.x, rahmen.size.y, k, modus, tol, loch, fleck, staub, skala_p)
		if hd:
			var wr: Dictionary = weich_freistellen(ausschnitt, fig["farbe"], rahmen.size.x, rahmen.size.y, k, modus, fig["maske"], kante, tol)
			fig["wa"] = wr["alpha"]
			fig["wf"] = wr["farbe"]
		fig["nr"] = i
		# Berührt die Figur den Rand des Videos? (Grok schneidet sie dann ab)
		var rm: PackedByteArray = fig["maske"]
		var beschn: int = 0
		var rw: int = rahmen.size.x
		var rh2: int = rahmen.size.y
		for q: int in rw:
			if (rahmen.position.y == 0 and rm[q] != 0) or (rahmen.end.y == arbeit_h and rm[(rh2 - 1) * rw + q] != 0):
				beschn = 1
		for q: int in rh2:
			if (rahmen.position.x == 0 and rm[q * rw] != 0) or (rahmen.end.x == arbeit_w and rm[q * rw + rw - 1] != 0):
				beschn = 1
		fig["beschnitten"] = beschn
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
	if not ausser.is_empty():
		var rest_bilder: Array = []
		for fig: Dictionary in behalten:
			# Videobildnummer 1-basiert wie --ab (gezählt ab dem ersten stabilen Bild)
			if not ausser.has(int(fig["nr"]) - einblend_vorn + 1):
				rest_bilder.append(fig)
		print("Ohne Bilder %s: %d von %d bleiben" % [str(ausser.keys()), rest_bilder.size(), behalten.size()])
		behalten = rest_bilder
	var unscharf_liste: PackedInt32Array = PackedInt32Array()
	for i: int in behalten.size():
		if unscharf_flag[vorn_weg + i]:
			unscharf_liste.append(i + 1)
	print("Schärfe: Median %d, unscharf %s, vorn %d und hinten %d abgeschnitten" % [med, str(unscharf_liste), vorn_weg, hinten_weg])

	# --- 6. Maßstab und Anker aus dem ersten behaltenen Bild; Verkleinern -----------------------------
	var bw: int = rahmen.size.x
	var bh: int = rahmen.size.y
	var ref: Dictionary = behalten[0]
	var gitter: Dictionary = {}
	if faktor_vorgabe > 0.0:
		# Maßstab vorgegeben: Zielpixel je Arbeitspixel = massstab · Quellhöhe / Arbeitshöhe
		var fa: float = faktor_vorgabe * float(info["hoehe"]) / float(arbeit_h)
		var rf: Rect2i = maske_rahmen(ref["maske"], bw, bh)
		if rf.size.y > 0:
			gitter = gitter_fuer(ref["maske"], bw, bh, rf, 1.0 / fa)
	else:
		gitter = gitter_bestimmen(ref["maske"], bw, bh, spiel_hoehe)
	if gitter.is_empty():
		_fehler("erstes Bild ohne Figur")
		return
	var finale: Array = []
	var beschnitten: Array[int] = []
	for fig: Dictionary in behalten:
		beschnitten.append(int(fig["beschnitten"]))
		finale.append(herunter(fig["maske"], fig["farbe"], bw, bh, gitter))
	var gb: int = int(gitter["breite"])
	var gh: int = int(gitter["hoehe"])
	# Kennzahlen je Bild im Gitter und Anker je Bild (Inhaltspunkt, der auf dem Fußpunkt der Logik liegt)
	var kz: Array = []
	for f: PackedByteArray in finale:
		kz.append(kennzahlen(f, gb, gh))
	if int(kz[0]["unten"]) < 0:
		_fehler("nach dem Verkleinern ist nichts übrig")
		return
	var xv_faktor: float = float(arbeit_w) / float(info["breite"])
	var fest_x: int = -1000000
	# Spalte des Gitters ↔ x im Video: Zellmitte i = xa + i · inv im zugeschnittenen Arbeitsbild
	var fussmitte_video: float = (float(gitter["xa16"]) / 65536.0 + float(int(kz[0]["fuss"]) + int(gitter["imin"])) * float(gitter["inv16"]) / 65536.0 + float(rahmen.position.x)) / xv_faktor
	if arg.has("ankerx-video"):
		var xw: float = float(arg["ankerx-video"]) * xv_faktor - float(rahmen.position.x)
		fest_x = roundi((xw - float(gitter["xa16"]) / 65536.0) / (float(gitter["inv16"]) / 65536.0)) - int(gitter["imin"])
	var fussmitte_letzt: float = (float(gitter["xa16"]) / 65536.0 + float(int(kz[kz.size() - 1]["fuss"]) + int(gitter["imin"])) * float(gitter["inv16"]) / 65536.0 + float(rahmen.position.x)) / xv_faktor
	print("Fußmitte des ersten Bildes im Video: x = %.1f, des letzten: x = %.1f" % [fussmitte_video, fussmitte_letzt])
	var ank_je: Array = anker_je_bild(kz, anker_x, anker_y, rampe, fest_x)
	# Vereinigung aller Figuren (nach der Verschiebung auf den gemeinsamen Anker)
	var ref_anker: Vector2i = ank_je[0]
	var x0: int = 1 << 30
	var y0: int = 1 << 30
	var x1: int = -(1 << 30)
	var y1: int = -(1 << 30)
	var versatz: Array[Vector2i] = []
	for i: int in finale.size():
		var v: Vector2i = ref_anker - (ank_je[i] as Vector2i)
		versatz.append(v)
		var k: Dictionary = kz[i]
		if int(k["unten"]) < 0:
			continue
		x0 = mini(x0, int(k["links"]) + v.x)
		x1 = maxi(x1, int(k["rechts"]) + v.x)
		y0 = mini(y0, int(k["oben"]) + v.y)
		y1 = maxi(y1, int(k["unten"]) + v.y)
	x0 -= RAND
	y0 -= RAND
	x1 += RAND
	y1 += RAND
	var ob: int = x1 - x0 + 1
	var oh: int = y1 - y0 + 1
	var ausgabe: Array = []
	for i: int in finale.size():
		ausgabe.append(zuschnitt_rgba(finale[i], gb, gh, x0 - versatz[i].x, y0 - versatz[i].y, ob, oh))
	# Anker im ersten Bild (Zuschnitt)
	var ank: Vector2i = ref_anker - Vector2i(x0, y0)
	print("Maßstab: erstes Bild %d Zeilen, Faktor %.5f (Arbeitsauflösung), Bild %d x %d, Anker %s (%.1f s)" % [int(gitter["hoehe_erstes"]), float(gitter["faktor"]), ob, oh, str(ank), _sek(t0)])
	# Messreihen in Bildpixeln (vor der Verschiebung, relativ zum ersten Bild): Höhe der Unterkante über der Bodenlinie
	# des ersten Bildes und Schwerpunkt in x
	var luft_liste: Array[int] = []
	var schwerp_liste: Array[int] = []
	var breite_liste: Array[int] = []
	var hoehe_liste: Array[int] = []
	for i: int in finale.size():
		var k: Dictionary = kz[i]
		breite_liste.append(int(k["rechts"]) - int(k["links"]) + 1)
		hoehe_liste.append(int(k["unten"]) - int(k["oben"]) + 1)
		luft_liste.append(int(kz[0]["unten"]) - int(k["unten"]))
		schwerp_liste.append(roundi(float(int(k["schw16"]) - int(kz[0]["schw16"])) / 16.0))

	# --- 7. Palette über alle Bilder ---------------------------------------------------------------
	var pal: Dictionary = {"farben": 0, "klassen": 0, "palette": []}
	if hd:
		print("Palette: keine (HD, RGBA 8 Bit)")
	else:
		pal = palette_anwenden(ausgabe)
		print("Palette: %d Farben aus %d Zwischenstufen" % [pal["farben"], pal["klassen"]])

	# --- 8. Zyklus und Ereignisse --------------------------------------------------------------
	var sigs: Array = []
	for f: PackedByteArray in ausgabe:
		sigs.append(signatur(f, ob, oh))
	var vorn_liste: Array[int] = []
	var hoch_liste: Array[int] = []
	for f: PackedByteArray in ausgabe:
		var e: Vector2i = ausdehnung(f, ob, oh, ank.x)
		vorn_liste.append(e.x)
		hoch_liste.append(e.y)
	# Wartezeit vorn (stehende Kampfhaltung vor dem Schlag) abschneiden, ein ruhiges Bild bleibt als erstes
	var kuerzen: String = String(arg.get("kuerzen", "auto"))
	var gekuerzt: int = 0
	if kuerzen == "ja" or (kuerzen == "auto" and name.contains("kette")):
		var e0: Dictionary = ereignisse_suchen(sigs, vorn_liste, hoch_liste, ereignis)
		gekuerzt = maxi(0, int(e0["bewegung"]) - 1)
		if gekuerzt > 0:
			ausgabe = ausgabe.slice(gekuerzt)
			sigs = sigs.slice(gekuerzt)
			vorn_liste = vorn_liste.slice(gekuerzt)
			hoch_liste = hoch_liste.slice(gekuerzt)
			beschnitten = beschnitten.slice(gekuerzt)
			luft_liste = luft_liste.slice(gekuerzt)
			schwerp_liste = schwerp_liste.slice(gekuerzt)
			breite_liste = breite_liste.slice(gekuerzt)
			hoehe_liste = hoehe_liste.slice(gekuerzt)
			print("Wartezeit vorn: %d Bilder abgeschnitten" % gekuerzt)
	var zyk: Dictionary
	if arg.has("zyklus"):
		var zn: int = int(arg["zyklus"])
		if zn <= 0 or zn > ausgabe.size():
			zn = ausgabe.size()
		zyk = zyklus_start_fuer(sigs, zn)
	else:
		zyk = zyklus_suchen(sigs)
	var ereignisse: Dictionary = ereignisse_suchen(sigs, vorn_liste, hoch_liste, ereignis if ereignis == "hoch" else "vorn")
	var andere: Dictionary = ereignisse_andere(ereignis, sigs, {"luft": luft_liste, "breite": breite_liste, "hoehe": hoehe_liste})
	for k: String in setze:
		if ["ausholen", "kontakt", "rueckzug", "ruhe"].has(k):
			ereignisse[k] = int(setze[k]) - 1
			if andere.has(k):
				andere[k] = int(setze[k]) - 1
		else:
			andere[k] = int(setze[k]) - 1
	var schritt: Dictionary = schrittlaenge(ausgabe, ob, oh, ank.y, int(zyk["start"]), int(zyk["n"]), String(arg.get("schritt", "gehen")) == "lauf")
	print("Zyklus: %s (Kandidaten %s, Güte %d %%, Schluss %d %% eines Bildschritts); Ereignisse: %s; Schritt: %s" % [str({"n": zyk["n"], "start": zyk["start"], "fehler": zyk["fehler"]}), str(zyk["kandidaten"]), zyk["guete"], zyk["schluss"], str(ereignisse), str(schritt)])
	print("Weitere Ereignisse (%s, 0-basiert): %s" % [ereignis, str(andere)])

	# --- 8b. HD: Bilder weich auf das HD-Gitter bringen ---------------------------------------------------------
	var hd_ergebnis: Dictionary = {}
	if hd:
		var inv_hd16: int = 0
		if faktor_vorgabe > 0.0:
			inv_hd16 = roundi(float(gitter["inv16"]) * float(spiel_hoehe) / float(ziel_hoehe))
		else:
			inv_hd16 = int(gitter_bestimmen(ref["maske"], bw, bh, ziel_hoehe)["inv16"])
		hd_ergebnis = hd_bilder(behalten.slice(gekuerzt), versatz.slice(gekuerzt), gitter, inv_hd16, x0, y0, ob, oh, ank, bw, bh)
		print("HD-Bilder: %d x %d Clipbildpixel, Skala %.5f Spielbildpixel je Clipbildpixel (%.1f s)" % [hd_ergebnis["breite"], hd_ergebnis["hoehe"], hd_ergebnis["skala"], _sek(t0)])

	# --- 9. schreiben --------------------------------------------------------------------------------
	var ziel: String = aus_ordner.path_join(name)
	DirAccess.make_dir_recursive_absolute(ziel)
	var alt: DirAccess = DirAccess.open(ziel)
	for n: String in alt.get_files():
		if n.begins_with("f_") or n == "clip.txt":
			alt.remove(n)
	var pal_liste: Array = pal["palette"]
	var bytes_summe: int = 0
	for i: int in ausgabe.size():
		var datei_png: FileAccess = FileAccess.open(ziel.path_join("f_%04d.%s" % [i + 1, bild_format]), FileAccess.WRITE)
		var roh: PackedByteArray
		if hd:
			roh = hd_datei(hd_ergebnis["bilder"][i], int(hd_ergebnis["breite"]), int(hd_ergebnis["hoehe"]), bild_format)
		else:
			roh = png_palette(ausgabe[i], ob, oh, pal_liste)
		bytes_summe += roh.size()
		datei_png.store_buffer(roh)
		datei_png.close()
	print("Bilddateien: %d Bytes, im Mittel %d Bytes je Bild" % [bytes_summe, bytes_summe / maxi(ausgabe.size(), 1)])
	var text: PackedStringArray = PackedStringArray()
	text.append("# Clip %s, erzeugt von werkzeuge/video_umsetzer.gd (nicht von Hand ändern). Bilder 1-basiert wie f_0001.png." % name)
	text.append("version=1")
	text.append("name=" + name)
	text.append("quelle=" + video_pfad.get_file())
	text.append("ffmpeg=" + ffv)
	text.append("fps=" + String(info["fps"]))
	text.append("quell_bilder=%d" % quell_zahl)
	text.append("einblendung_weg=%d,%d" % [einblend_vorn, einblend_hinten])
	text.append("verworfen_anfang=%d" % (einblend_vorn + vorn_weg + abschnitt_vorn))
	text.append("verworfen_ende=%d" % (einblend_hinten + hinten_weg))
	text.append("ab=%d" % ab)
	text.append("bis=%d" % bis)
	text.append("bilder=%d" % ausgabe.size())
	if hd:
		text.append("weich=1")
		text.append("format=" + bild_format)
		text.append("groesse=%d,%d" % [hd_ergebnis["breite"], hd_ergebnis["hoehe"]])
		text.append("anker=%d,%d" % [hd_ergebnis["anker"].x, hd_ergebnis["anker"].y])
		var ff: Vector2 = hd_ergebnis["fuss"]
		text.append("fuss_fein=%.3f,%.3f" % [ff.x, ff.y])
		text.append("skala=%.6f" % float(hd_ergebnis["skala"]))
		text.append("spielhoehe=%d" % spiel_hoehe)
		text.append("arbeit_prozent=%d" % arbeit_prozent)
		text.append("kante=%d" % kante)
	else:
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
	text.append("zyklus_schluss_in_schritten=%d" % int(zyk["schluss"]))
	var kand_text: PackedStringArray = PackedStringArray()
	for k: Array in (zyk["kandidaten"] as Array):
		kand_text.append("%d:%d:%d:%d" % [k[0], k[1], k[2], k[3]])
	text.append("# zyklus_kandidaten = Länge:Wert:Tiefe in Prozent:Schließfehler in Prozent eines Bildschritts")
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
	text.append("rueckzug=%d" % (int(ereignisse["rueckzug"]) + 1))
	text.append("ruhe=%d" % (int(ereignisse["ruhe"]) + 1))
	text.append("rueckkehr=" + String(ereignisse["rueckkehr"]))
	text.append("gekuerzt=%d" % gekuerzt)
	text.append("anker_modus=%s,%s,%d" % [anker_x, anker_y, rampe])
	text.append("fussmitte_video=%.1f" % fussmitte_video)
	var beschn_liste: Array[int] = []
	for i: int in beschnitten.size():
		if beschnitten[i] != 0:
			beschn_liste.append(i + 1)
	text.append("beschnitten=" + ",".join(Array(beschn_liste).map(func(v: int) -> String: return str(v))))
	text.append("tol=%d,%d,%d" % [tol, loch, fleck])
	if not ausser.is_empty():
		text.append("ausser=" + ",".join(Array(ausser.keys()).map(func(k: int) -> String: return str(k))))
	if schleife_art != "":
		text.append("schleife=" + schleife_art)
	var ak: Array = andere.keys()
	ak.sort()
	for k: String in ak:
		text.append("ereignis_%s=%d" % [k, int(andere[k]) + 1])
	if not setze.is_empty():
		text.append("setze=" + ",".join(setze.keys().map(func(k: String) -> String: return "%s=%d" % [k, setze[k]])))
	text.append("bewegung_ab=%d" % (int(ereignisse["bewegung"]) + 1))
	text.append("ruhe_schwelle=%d" % int(ereignisse["schwelle"]))
	text.append("vorn=" + ",".join(Array(vorn_liste).map(func(v: int) -> String: return str(v))))
	text.append("hoch=" + ",".join(Array(hoch_liste).map(func(v: int) -> String: return str(v))))
	text.append("luft=" + ",".join(Array(luft_liste).map(func(v: int) -> String: return str(v))))
	text.append("schwerp=" + ",".join(Array(schwerp_liste).map(func(v: int) -> String: return str(v))))
	text.append("breite_sil=" + ",".join(Array(breite_liste).map(func(v: int) -> String: return str(v))))
	text.append("hoehe_sil=" + ",".join(Array(hoehe_liste).map(func(v: int) -> String: return str(v))))
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
static func ist_figur(r: int, g: int, b: int, key: Vector3i, modus: String, tol: int = TOL_ECKE) -> bool:
	if modus == "gruen":
		var m: int = r if r > b else b
		return not (g >= GRUEN_G_MIN and (g - m) * 100 >= gruen_grenze(key) * g)
	var dr: int = absi(r - key.x)
	var dg: int = absi(g - key.y)
	var db: int = absi(b - key.z)
	return maxi(dr, maxi(dg, db)) >= tol


## Umschließendes Rechteck der Stichproben (alle `schritt` Pixel), die Figur sind; Größe 0, wenn keine.
## Ein Punkt allein zählt nicht (Rauschen): mindestens zwei Treffer je Zeile und Spalte-Nachbarschaft.
static func grober_rahmen(d: PackedByteArray, w: int, h: int, key: Vector3i, modus: String, schritt: int, tol: int = TOL_ECKE) -> Rect2i:
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
			if ist_figur(d[i], d[i + 1], d[i + 2], key, modus, tol):
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
## `skala_p`: Größe der Figur im Arbeitsbild in Prozent gegenüber dem Pixelmodus (100); Löcher (LOCH_MIN) und Staubfenster
## (STAUB_RADIUS) wachsen mit (nur HD-Modus).
static func freistellen(d: PackedByteArray, w: int, h: int, key: Vector3i, modus: String, tol: int = TOL_ECKE, loch: int = LOCH_TOL, fleck: int = FLECK_MIN, staub: int = 0, skala_p: int = 100) -> Dictionary:
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
			var a: int = mini(255, dist * 128 / maxi(tol, 1))
			alpha[p] = a
			if a >= 128:
				maske[p] = 1
			if a > 32 and a < 224:
				weich += 1
	_loecher_fuellen(maske, alpha, d, w, h, key, loch, LOCH_MIN * skala_p * skala_p / 10000)
	if staub > 0:
		_staub_entfernen(maske, d, w, h, staub, STAUB_RADIUS * skala_p / 100)
	_inseln_entfernen(maske, w, h, fleck)
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
static func _loecher_fuellen(maske: PackedByteArray, alpha: PackedByteArray, d: PackedByteArray, w: int, h: int, key: Vector3i, loch: int = LOCH_TOL, loch_min: int = LOCH_MIN) -> void:
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
		if liste.size() < loch_min or summe / liste.size() > loch:
			for p: int in liste:
				maske[p] = 1
				alpha[p] = 255


## Entfernt dunkle, einzeln liegende Figurpixel (Staub): siehe STAUB_DUNKEL. Rechnet mit einem Summenbild der Maske.
static func _staub_entfernen(maske: PackedByteArray, d: PackedByteArray, w: int, h: int, prozent: int, radius: int = STAUB_RADIUS) -> void:
	var sb: PackedInt32Array = PackedInt32Array()
	sb.resize((w + 1) * (h + 1))
	for y: int in h:
		var zeile: int = 0
		for x: int in w:
			zeile += maske[y * w + x]
			sb[(y + 1) * (w + 1) + x + 1] = sb[y * (w + 1) + x + 1] + zeile
	var fenster: int = (2 * radius + 1) * (2 * radius + 1)
	var weg: PackedInt32Array = PackedInt32Array()
	for y: int in h:
		for x: int in w:
			var p: int = y * w + x
			if maske[p] == 0:
				continue
			var q: int = p * 3
			var hell: int = maxi(d[q], maxi(d[q + 1], d[q + 2]))
			var farbig: int = hell - mini(d[q], mini(d[q + 1], d[q + 2]))
			if hell > STAUB_DUNKEL and not (hell <= STAUB_GRAU and farbig <= STAUB_FARBIG):
				continue
			var xa: int = maxi(x - radius, 0)
			var xb: int = mini(x + radius + 1, w)
			var ya: int = maxi(y - radius, 0)
			var yb: int = mini(y + radius + 1, h)
			var summe: int = sb[yb * (w + 1) + xb] - sb[ya * (w + 1) + xb] - sb[yb * (w + 1) + xa] + sb[ya * (w + 1) + xa]
			if summe * 100 < prozent * fenster:
				weg.append(p)
	for p: int in weg:
		maske[p] = 0


## Behält die größte zusammenhängende Fläche (8er-Nachbarschaft) und alle Teile in ihrer Nähe
## (Radius Höhe/NAH_TEILER); alles andere und alles unter FLECK_MIN Pixeln fällt weg.
static func _inseln_entfernen(maske: PackedByteArray, w: int, h: int, fleck: int = FLECK_MIN) -> void:
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
		if k != 0 and vd[p] != 0 and groessen[k] >= fleck:
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
# HD-Modus (--hd): weicher Alpha, Entmischen der Kante, Verkleinern mit vormultiplizierten Farben
# ===========================================================================

## Breite des weichen Übergangs in Arbeitspixeln nach der Figurhöhe im Arbeitsbild: 1/150, zwischen 2 und 6.
static func kante_standard(figur_hoehe: float) -> int:
	return clampi(roundi(figur_hoehe / 150.0), 2, 6)


## Weicher Alpha und entmischte Farbe je Arbeitspixel (RGB `d`, w × h) für den HD-Modus. `maske` ist die harte Maske
## von `freistellen` (nach Löchern, Staub und Inseln), `farbe` ihre Farbe (Grünstich im Kern entfernt).
##  - Weit innen (mehr als `kante` Pixel von der Maskenkante) ist Alpha 255 und die Farbe die von `freistellen`; weit
##    außen ist Alpha 0. Nur das Band von `kante` Pixeln beiderseits der Maskenkante wird weich gemacht, so kehren
##    entfernte Inseln und Staub nicht zurück.
##  - Figurfarbe F je Bandpixel: Mittel der schon bekannten Nachbarn (von innen nach außen geschichtet, 8er-Nachbarschaft),
##    also die Farbe der Figur in der Nähe. Alpha aus der Grün-Dominanz (g − max(r, b)) im Vergleich zur Schlüsselfarbe;
##    ist F weit genug von der Schlüsselfarbe entfernt und liegt das Pixel (bis auf WEICH_REST Stufen) auf der Strecke
##    Schlüsselfarbe–F, gilt stattdessen der Entmischungsanteil (Projektion auf diese Strecke): so wird auch blaue oder rote
##    Kleidung am Rand nicht zu dick. Im Modus ecke entscheidet der Abstand zur Schlüsselfarbe.
##  - Farbe: Mischung C = α · F + (1 − α) · K wird nach F aufgelöst; bei kleinem Alpha (unter 40 bis 140 von 255) zählt die
##    Farbe der Nachbarn statt der verrauschten Auflösung; im Modus gruen wird zuletzt Grün auf max(r, b) begrenzt.
## Rückgabe: alpha (0 bis 255), farbe (RGB, gerade, nicht vormultipliziert; nur wo alpha > 0 von Belang).
static func weich_freistellen(d: PackedByteArray, farbe: PackedByteArray, w: int, h: int, key: Vector3i, modus: String, maske: PackedByteArray, kante: int, tol: int) -> Dictionary:
	var n: int = w * h
	# Abstand zur Kante der Maske: +k innen, −k außen (1 = unmittelbar an der Kante), 0 = weiter als `kante` entfernt
	var tiefe: PackedInt32Array = PackedInt32Array()
	tiefe.resize(n)
	var innen: Array = [PackedInt32Array()]
	var aussen: Array = [PackedInt32Array()]
	for y: int in h:
		var z: int = y * w
		for x: int in w:
			var p: int = z + x
			var m: int = maske[p]
			if (x > 0 and maske[p - 1] != m) or (x < w - 1 and maske[p + 1] != m) or (y > 0 and maske[p - w] != m) or (y < h - 1 and maske[p + w] != m):
				if m != 0:
					tiefe[p] = 1
					(innen[0] as PackedInt32Array).append(p)
				else:
					tiefe[p] = -1
					(aussen[0] as PackedInt32Array).append(p)
	for k: int in range(2, kante + 1):
		for art: int in 2:
			var vor: PackedInt32Array = (innen if art == 0 else aussen)[k - 2]
			var neu: PackedInt32Array = PackedInt32Array()
			var m: int = 1 if art == 0 else 0
			var wert: int = k if art == 0 else -k
			for p: int in vor:
				var px: int = p % w
				var py: int = p / w
				for dy: int in range(maxi(py - 1, 0), mini(py + 2, h)):
					for dx: int in range(maxi(px - 1, 0), mini(px + 2, w)):
						var q: int = dy * w + dx
						if tiefe[q] == 0 and maske[q] == m:
							tiefe[q] = wert
							neu.append(q)
			(innen if art == 0 else aussen).append(neu)
	var alpha: PackedByteArray = PackedByteArray()
	alpha.resize(n)
	var bekannt: PackedByteArray = PackedByteArray()
	bekannt.resize(n)
	for p: int in n:
		if maske[p] != 0:
			alpha[p] = 255
			if tiefe[p] == 0:
				bekannt[p] = 1
	var nah: PackedByteArray = farbe.duplicate()
	var aus_f: PackedByteArray = farbe.duplicate()
	# Reihenfolge: innen von tief nach flach, dann außen von nah nach fern
	var ordnung: PackedInt32Array = PackedInt32Array()
	for k: int in range(innen.size() - 1, -1, -1):
		ordnung.append_array(innen[k])
	for k: int in aussen.size():
		ordnung.append_array(aussen[k])
	var ek: int = key.y - maxi(key.x, key.z)
	var rest2: int = WEICH_REST * WEICH_REST
	var min2: int = WEICH_ENTMISCHEN_MIN * WEICH_ENTMISCHEN_MIN
	for p: int in ordnung:
		var i3: int = p * 3
		var cr: int = d[i3]
		var cg: int = d[i3 + 1]
		var cb: int = d[i3 + 2]
		var px: int = p % w
		var py: int = p / w
		var sr: int = 0
		var sg: int = 0
		var sb: int = 0
		var zn: int = 0
		for dy: int in range(maxi(py - 1, 0), mini(py + 2, h)):
			for dx: int in range(maxi(px - 1, 0), mini(px + 2, w)):
				var q: int = dy * w + dx
				if bekannt[q] != 0:
					sr += nah[q * 3]
					sg += nah[q * 3 + 1]
					sb += nah[q * 3 + 2]
					zn += 1
		var hat_f: bool = zn > 0
		var fr: int = (sr + zn / 2) / zn if hat_f else int(farbe[i3])
		var fg: int = (sg + zn / 2) / zn if hat_f else int(farbe[i3 + 1])
		var fb: int = (sb + zn / 2) / zn if hat_f else int(farbe[i3 + 2])
		nah[i3] = fr
		nah[i3 + 1] = fg
		nah[i3 + 2] = fb
		if hat_f:
			bekannt[p] = 1
		# Alpha: Grün-Dominanz (gruen) oder Abstand zur Schlüsselfarbe (ecke)
		var a: int = 255
		if modus == "gruen":
			a = clampi(255 * (ek - (cg - maxi(cr, cb))) / maxi(ek, 1), 0, 255)
		else:
			a = mini(255, maxi(absi(cr - key.x), maxi(absi(cg - key.y), absi(cb - key.z))) * 255 / maxi(2 * tol, 1))
		# Entmischen: Lage des Pixels auf der Strecke Schlüsselfarbe–Figurfarbe
		if hat_f and (a < 255 or modus != "gruen"):
			var fkx: int = fr - key.x
			var fky: int = fg - key.y
			var fkz: int = fb - key.z
			var nn: int = fkx * fkx + fky * fky + fkz * fkz
			if nn >= min2:
				var ckx: int = cr - key.x
				var cky: int = cg - key.y
				var ckz: int = cb - key.z
				var au: int = clampi(255 * (ckx * fkx + cky * fky + ckz * fkz) / nn, 0, 255)
				var ex: int = ckx - fkx * au / 255
				var ey: int = cky - fky * au / 255
				var ez: int = ckz - fkz * au / 255
				if ex * ex + ey * ey + ez * ez <= rest2:
					a = au
		if a < WEICH_ALPHA_MIN:
			a = 0
		elif a > 247:
			a = 255
		alpha[p] = a
		if a == 0 or a == 255:
			continue
		# Farbe: C = α F + (1 − α) K nach F auflösen
		var ur: int = clampi((cr * 255 - (255 - a) * key.x) / a, 0, 255)
		var ug: int = clampi((cg * 255 - (255 - a) * key.y) / a, 0, 255)
		var ub: int = clampi((cb * 255 - (255 - a) * key.z) / a, 0, 255)
		var t: int = clampi((a - 40) * 255 / 100, 0, 255) if hat_f else 255
		var mr: int = (fr * (255 - t) + ur * t) / 255
		var mg: int = (fg * (255 - t) + ug * t) / 255
		var mb: int = (fb * (255 - t) + ub * t) / 255
		if modus == "gruen":
			mg = mini(mg, maxi(mr, mb))
		aus_f[i3] = mr
		aus_f[i3 + 1] = mg
		aus_f[i3 + 2] = mb
	return {"alpha": alpha, "farbe": aus_f}


## Gewichtstabelle einer Achse für das Verkleinern: je Ausgabeindex o das Quellfenster ab `erst[o]` mit `zahl[o]` Gewichten
## (16.16, ab `ab[o]` in `gew`). Fenster der Ausgabe o: [start16 + o · inv16, start16 + (o + 1) · inv16) in Quellpixeln.
## inv16 ≥ 1 (Verkleinern): Box (Überdeckung, Summe inv16); sonst Dreieck (bilinear) um die Fenstermitte, Summe 65536.
## Quellindizes außerhalb 0 bis n_quelle − 1 fehlen (zählen als durchsichtig); `nenner` ist die volle Gewichtssumme.
static func _achse(start16: int, inv16: int, n_aus: int, n_quelle: int) -> Dictionary:
	var erst: PackedInt32Array = PackedInt32Array()
	var zahl: PackedInt32Array = PackedInt32Array()
	var ab: PackedInt32Array = PackedInt32Array()
	var gew: PackedInt32Array = PackedInt32Array()
	var box: bool = inv16 >= 65536
	for o: int in n_aus:
		var a: int = start16 + o * inv16
		var b: int = a + inv16
		var q0: int = 0
		var q1: int = -1
		if box:
			q0 = a >> 16
			q1 = (b - 1) >> 16
		else:
			var c: int = (a + b) >> 1
			q0 = (c - 98304) >> 16
			q1 = (c + 98304) >> 16
		var erster: int = -1
		var zaehler: int = 0
		ab.append(gew.size())
		for q: int in range(q0, q1 + 1):
			if q < 0 or q >= n_quelle:
				continue
			var wq: int = 0
			if box:
				wq = mini(b, (q + 1) << 16) - maxi(a, q << 16)
			else:
				var c2: int = (a + b) >> 1
				wq = maxi(0, 65536 - absi(c2 - ((q << 16) + 32768)))
			if wq <= 0:
				continue
			if erster < 0:
				erster = q
			# lückenlos ab dem ersten Index
			while erster + zaehler < q:
				gew.append(0)
				zaehler += 1
			gew.append(wq)
			zaehler += 1
		erst.append(maxi(erster, 0))
		zahl.append(zaehler)
	return {"erst": erst, "zahl": zahl, "ab": ab, "gew": gew, "nenner": inv16 if box else 65536}


## Verkleinert Alpha `wa` und gerade Farbe `wf` (RGB; w × h Arbeitspixel) auf ein Gitter von ow × oh Pixeln, dessen linke
## obere Ecke bei (x16, y16) (Arbeitspixel, 16.16) liegt und dessen Zellen inv16 (16.16) Arbeitspixel breit sind. Vormultipliziert:
## Farbe = Σ Gewicht · Alpha · Farbe / Σ Gewicht · Alpha, Alpha = Σ Gewicht · Alpha / Σ Gewicht, so blutet an den Kanten weder
## die Schlüsselfarbe noch Schwarz hinein. Rückgabe RGBA8 (gerade, ow · oh · 4 Bytes); wo Alpha 0 ist, ist die Farbe 0.
static func herunter_weich(wa: PackedByteArray, wf: PackedByteArray, w: int, h: int, x16: int, y16: int, inv16: int, ow: int, oh: int) -> PackedByteArray:
	var ax: Dictionary = _achse(x16, inv16, ow, w)
	var ay: Dictionary = _achse(y16, inv16, oh, h)
	var x_erst: PackedInt32Array = ax["erst"]
	var x_zahl: PackedInt32Array = ax["zahl"]
	var x_ab: PackedInt32Array = ax["ab"]
	var x_gew: PackedInt32Array = ax["gew"]
	var y_erst: PackedInt32Array = ay["erst"]
	var y_zahl: PackedInt32Array = ay["zahl"]
	var y_ab: PackedInt32Array = ay["ab"]
	var y_gew: PackedInt32Array = ay["gew"]
	var nenner: int = int(ax["nenner"]) * int(ay["nenner"])
	# Spalten mit Inhalt je Quellzeile (schnelles Überspringen leerer Fenster)
	var zlo: PackedInt32Array = PackedInt32Array()
	var zhi: PackedInt32Array = PackedInt32Array()
	zlo.resize(h)
	zhi.resize(h)
	for y: int in h:
		var lo: int = w
		var hi: int = -1
		var z: int = y * w
		for x: int in w:
			if wa[z + x] != 0:
				if x < lo:
					lo = x
				hi = x
		zlo[y] = lo
		zhi[y] = hi
	var aus: PackedByteArray = PackedByteArray()
	aus.resize(ow * oh * 4)
	for oy: int in oh:
		var yq0: int = y_erst[oy]
		var yn: int = y_zahl[oy]
		var yo: int = y_ab[oy]
		var lo2: int = w
		var hi2: int = -1
		for k: int in yn:
			var qy: int = yq0 + k
			if y_gew[yo + k] != 0 and zhi[qy] >= 0:
				lo2 = mini(lo2, zlo[qy])
				hi2 = maxi(hi2, zhi[qy])
		if hi2 < 0:
			continue
		for ox: int in ow:
			var xq0: int = x_erst[ox]
			var xn: int = x_zahl[ox]
			if xq0 + xn - 1 < lo2 or xq0 > hi2:
				continue
			var xo: int = x_ab[ox]
			var sa: int = 0
			var sr: int = 0
			var sg: int = 0
			var sb: int = 0
			for ky: int in yn:
				var wy: int = y_gew[yo + ky]
				if wy == 0:
					continue
				var z: int = (yq0 + ky) * w + xq0
				for kx: int in xn:
					var a: int = wa[z + kx]
					if a == 0:
						continue
					var wg: int = wy * x_gew[xo + kx] * a
					var c: int = (z + kx) * 3
					sa += wg
					sr += wg * wf[c]
					sg += wg * wf[c + 1]
					sb += wg * wf[c + 2]
			if sa == 0:
				continue
			var al: int = (sa + nenner / 2) / nenner
			if al == 0:
				continue
			var o: int = (oy * ow + ox) * 4
			aus[o] = mini((sr + sa / 2) / sa, 255)
			aus[o + 1] = mini((sg + sa / 2) / sa, 255)
			aus[o + 2] = mini((sb + sa / 2) / sa, 255)
			aus[o + 3] = mini(al, 255)
	return aus


## Farbrand: durchsichtige Pixel (Alpha 0) bis `radius` Pixel neben der Figur bekommen die mittlere Farbe ihrer Nachbarn
## (Alpha bleibt 0). Bei linearer Texturfilterung mischt die Grafikkarte sonst das Schwarz der leeren Pixel in die Kante.
static func farbrand(f: PackedByteArray, b: int, h: int, radius: int) -> void:
	var n: int = b * h
	var gef: PackedByteArray = PackedByteArray()
	gef.resize(n)
	var front: PackedInt32Array = PackedInt32Array()
	for p: int in n:
		if f[p * 4 + 3] != 0:
			gef[p] = 1
	for p: int in n:
		if gef[p] == 0:
			continue
		var x: int = p % b
		var y: int = p / b
		if (x > 0 and gef[p - 1] == 0) or (x < b - 1 and gef[p + 1] == 0) or (y > 0 and gef[p - b] == 0) or (y < h - 1 and gef[p + b] == 0):
			front.append(p)
	for _r: int in radius:
		var neu: PackedInt32Array = PackedInt32Array()
		for p: int in front:
			var px: int = p % b
			var py: int = p / b
			for dy: int in range(maxi(py - 1, 0), mini(py + 2, h)):
				for dx: int in range(maxi(px - 1, 0), mini(px + 2, b)):
					var q: int = dy * b + dx
					if gef[q] == 0:
						gef[q] = 2
						neu.append(q)
		for q: int in neu:
			var qx: int = q % b
			var qy: int = q / b
			var sr: int = 0
			var sg: int = 0
			var sb: int = 0
			var zn: int = 0
			for dy: int in range(maxi(qy - 1, 0), mini(qy + 2, h)):
				for dx: int in range(maxi(qx - 1, 0), mini(qx + 2, b)):
					var s: int = dy * b + dx
					if gef[s] == 1:
						sr += f[s * 4]
						sg += f[s * 4 + 1]
						sb += f[s * 4 + 2]
						zn += 1
			if zn > 0:
				f[q * 4] = (sr + zn / 2) / zn
				f[q * 4 + 1] = (sg + zn / 2) / zn
				f[q * 4 + 2] = (sb + zn / 2) / zn
		for q: int in neu:
			gef[q] = 1
		front = neu


## HD-Bilder eines Clips: bringt Alpha und Farbe jedes Bildes (`figuren`, mit "wa" und "wf" im Zuschnitt bw × bh des
## Arbeitsbildes) auf ein HD-Gitter, das mit dem Spielgitter (`gitter`, Zellen inv16) fluchtet: jede Zelle des Spielgitters
## entspricht s2 = inv16 / inv_hd16 HD-Pixeln. Jedes Bild bekommt dieselbe Verschiebung wie im Pixelmodus (`versatz`, in
## Spielzellen), so liegen Anker und Bewegung genau wie im Pixelclip. Danach Zuschnitt auf die Vereinigung aller Figuren
## plus 2 Pixel und Farbrand. x0, y0, ob, oh, ank: Zuschnitt und Anker des Spielclips (Spielzellen).
## Rückgabe: bilder (RGBA8), breite, hoehe (HD-Pixel), fuss (Fußpunkt als Pixelposition, genau), anker (Ganzzahlen), skala
## (Spielbildpixel je HD-Pixel).
static func hd_bilder(figuren: Array, versatz: Array, gitter: Dictionary, inv_hd16: int, x0: int, y0: int, ob: int, oh: int, ank: Vector2i, bw: int, bh: int) -> Dictionary:
	var inv16: int = gitter["inv16"]
	var xa16: int = gitter["xa16"]
	var yb16: int = gitter["yb16"]
	var imin: int = gitter["imin"]
	var jmin: int = gitter["jmin"]
	var s2: float = float(inv16) / float(inv_hd16)
	var ow: int = ceili(float(ob) * s2)
	var ohd: int = ceili(float(oh) * s2)
	var roh: Array = []
	var bx0: int = ow
	var by0: int = ohd
	var bx1: int = -1
	var by1: int = -1
	for j: int in figuren.size():
		var v: Vector2i = versatz[j]
		var xl16: int = xa16 + (((2 * (imin + x0 - v.x) - 1) * inv16) >> 1)
		var yt16: int = yb16 + (jmin + y0 - v.y) * inv16
		var f: PackedByteArray = herunter_weich(figuren[j]["wa"], figuren[j]["wf"], bw, bh, xl16, yt16, inv_hd16, ow, ohd)
		roh.append(f)
		for y: int in ohd:
			var z: int = y * ow
			for x: int in ow:
				if f[(z + x) * 4 + 3] != 0:
					if x < bx0:
						bx0 = x
					if x > bx1:
						bx1 = x
					if y < by0:
						by0 = y
					if y > by1:
						by1 = y
	if bx1 < 0:
		return {"bilder": roh, "breite": ow, "hoehe": ohd, "fuss": Vector2.ZERO, "anker": Vector2i.ZERO, "skala": 1.0 / s2}
	var rand: int = 2
	var cx0: int = maxi(bx0 - rand, 0)
	var cy0: int = maxi(by0 - rand, 0)
	var cx1: int = mini(bx1 + rand, ow - 1)
	var cy1: int = mini(by1 + rand, ohd - 1)
	var cw: int = cx1 - cx0 + 1
	var ch: int = cy1 - cy0 + 1
	var bilder: Array = []
	for f: PackedByteArray in roh:
		var c: PackedByteArray = PackedByteArray()
		for y: int in range(cy0, cy1 + 1):
			c.append_array(f.slice((y * ow + cx0) * 4, (y * ow + cx1 + 1) * 4))
		farbrand(c, cw, ch, rand)
		bilder.append(c)
	var fuss: Vector2 = Vector2((float(ank.x) + 0.5) * s2 - float(cx0), (float(ank.y) + 1.0) * s2 - float(cy0))
	return {"bilder": bilder, "breite": cw, "hoehe": ch, "fuss": fuss, "anker": Vector2i(roundi(fuss.x - 0.5), roundi(fuss.y - 1.0)), "skala": 1.0 / s2}


## Bilddatei eines HD-Bildes (RGBA8, gerade): PNG oder verlustfreies WebP, mit den Bordmitteln von Godot.
static func hd_datei(f: PackedByteArray, b: int, h: int, format: String) -> PackedByteArray:
	var img: Image = Image.create_from_data(b, h, false, Image.FORMAT_RGBA8, f)
	if format == "webp":
		return img.save_webp_to_buffer(false, 1.0)
	return img.save_png_to_buffer()


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
	var inv: float = float(rf.size.y) / float(ziel)
	var beste: Dictionary = {}
	var bester_abstand: int = 1000000
	for versuch: int in 12:
		var g: Dictionary = gitter_fuer(maske, w, h, rf, inv)
		var hoehe: int = int(g["hoehe_erstes"])
		var abstand: int = absi(hoehe - ziel)
		if abstand < bester_abstand:
			bester_abstand = abstand
			beste = g
		if hoehe == ziel:
			break
		inv *= float(hoehe) / float(ziel)
	return beste


## Gitter für einen festen Maßstab `inv` (Arbeitspixel je Zielpixel): Anker aus der Maske `maske` (Mitte der Füße,
## Bodenlinie), Figurhöhe im Bild als `hoehe_erstes`.
static func gitter_fuer(maske: PackedByteArray, w: int, h: int, rf: Rect2i, inv: float) -> Dictionary:
	var yl: int = rf.end.y - 1
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
	g["hoehe_erstes"] = _figurhoehe(f, int(g["breite"]), int(g["hoehe"]))
	g["faktor"] = 65536.0 / float(inv16)
	return g


## Kennzahlen eines verkleinerten Bildes (RGBA8, b × h): Umriss (links, rechts, oben, unten; unten −1 = leer),
## Fußmitte (Mitte der untersten FUSS_ZEILEN Zeilen), Schwerpunkt in x (1/16 Pixel), Zahl der Figurpixel.
static func kennzahlen(f: PackedByteArray, b: int, h: int) -> Dictionary:
	var links: int = b
	var rechts: int = -1
	var oben: int = h
	var unten: int = -1
	var summe: int = 0
	var zahl: int = 0
	for y: int in h:
		for x: int in b:
			if f[(y * b + x) * 4 + 3] != 0:
				if x < links:
					links = x
				if x > rechts:
					rechts = x
				if y < oben:
					oben = y
				unten = y
				summe += x * 16 + 8
				zahl += 1
	if unten < 0:
		return {"links": 0, "rechts": 0, "oben": 0, "unten": -1, "fuss": 0, "schw16": 0, "zahl": 0}
	var fmin: int = b
	var fmax: int = -1
	for y: int in range(maxi(0, unten - FUSS_ZEILEN + 1), unten + 1):
		for x: int in b:
			if f[(y * b + x) * 4 + 3] != 0:
				if x < fmin:
					fmin = x
				if x > fmax:
					fmax = x
	return {"links": links, "rechts": rechts, "oben": oben, "unten": unten, "fuss": (fmin + fmax) / 2, "schw16": summe / zahl, "zahl": zahl}


## Inhaltspunkt je Bild (Gitterkoordinaten), der auf dem Fußpunkt der Logik liegt; siehe Kopf (--ankerx, --ankery).
## Schwerpunkt: gleitend von der Fußmitte des ersten Bildes (Gewicht 0) zum 3-Bild-Mittel des Schwerpunkts (Gewicht 1) bis
## Bild `rampe` (1-basiert; 1 = gleich der Schwerpunkt). Übergang: vom Schwerpunkt des ersten zur Fußmitte des letzten Bildes.
static func anker_je_bild(kz: Array, ankerx: String, ankery: String, rampe: int, fest_x: int = -1000000) -> Array:
	var n: int = kz.size()
	var aus: Array = []
	for i: int in n:
		var cy: int = int((kz[i] if ankery == "unten" else kz[0])["unten"])
		var cx16: int = int(kz[0]["fuss"]) * 16 if fest_x == -1000000 else fest_x * 16
		if ankerx == "schwerpunkt":
			var summe: int = 0
			var zahl: int = 0
			for j: int in range(maxi(0, i - 1), mini(n, i + 2)):
				if int(kz[j]["unten"]) >= 0:
					summe += int(kz[j]["schw16"])
					zahl += 1
			var s16: int = summe / maxi(zahl, 1)
			var w16: int = 65536
			if rampe > 1:
				w16 = mini(i, rampe - 1) * 65536 / (rampe - 1)
			cx16 = (int(kz[0]["fuss"]) * 16 * (65536 - w16) + s16 * w16) / 65536
		elif ankerx == "mittel":
			var sm: int = 0
			var zm: int = 0
			for j: int in n:
				if int(kz[j]["unten"]) >= 0:
					sm += int(kz[j]["schw16"])
					zm += 1
			cx16 = sm / maxi(zm, 1)
		elif ankerx == "uebergang":
			var a16: int = int(kz[0]["schw16"]) if fest_x == -1000000 else fest_x * 16
			var e16: int = int(kz[n - 1]["fuss"]) * 16
			cx16 = a16 + (e16 - a16) * i / maxi(n - 1, 1)
		aus.append(Vector2i((cx16 + 8) >> 4, cy))
	return aus


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
## Bild i und Bild i + n. Kandidaten sind die Täler (lokale Minima nach einem Berg, höchstens TAL_LOCKER % des
## größten Wertes davor). Für jeden Kandidaten wird der beste Start gesucht und der Schließfehler gemessen:
## Unterschied zwischen Bild start und start + n, getrennt für die obere Bildhälfte (Rumpf, Arme, Kopf) und die
## untere (Beine), jeweils in Prozent des mittleren Unterschieds aufeinanderfolgender Bilder im Zyklus; das
## Schlechtere zählt. So schließt ein gewählter Doppelschritt auch mit der Arm-Silhouette, nicht nur mit den Beinen.
## Gewählt wird der kleinste Kandidat mit tiefem Tal (ab 40 %), dessen Schließfehler höchstens
## max(1,3 · bester + 20, 60) Prozent beträgt; gibt es keinen, der kleinste mit solchem Schließfehler ohne Tiefenbedingung.
## Gibt es keinen Kandidaten, ist der ganze Clip der Zyklus.
## Rückgabe: n, start (0-basiert), fehler (Bytesumme D(start, start + n)), schluss (Prozent, 100 = so groß wie ein
## gewöhnlicher Bildschritt), guete (Tiefe des Tals in Prozent unter dem Berg davor), kandidaten (Array von
## [n, Wert, Tiefe, Schluss]), werte (Dictionary n → Wert).
static func zyklus_suchen(sigs: Array) -> Dictionary:
	var zahl: int = sigs.size()
	var nmax: int = zahl / 2
	if nmax < ZYKLUS_MIN + 2:
		return zyklus_start_fuer(sigs, zahl)
	var werte: Dictionary = {}
	for n: int in range(ZYKLUS_MIN, nmax + 1):
		var s: int = 0
		for i: int in zahl - n:
			s += sig_abstand(sigs[i], sigs[i + n])
		werte[n] = s * 16 / (zahl - n)
	var kandidaten: Array = []
	var berg: int = 0
	var vor: Dictionary = bewegung_vorbereiten(sigs)
	for n: int in range(ZYKLUS_MIN, nmax + 1):
		var w: int = werte[n]
		var links: int = int(werte.get(n - 1, 1 << 60))
		var rechts: int = int(werte.get(n + 1, 1 << 60))
		if n > ZYKLUS_MIN and w <= links and w <= rechts and w * 100 <= berg * TAL_LOCKER:
			var st: Dictionary = bester_start(sigs, n, vor)
			kandidaten.append([n, w, 100 - w * 100 / maxi(berg, 1), int(st["schluss"])])
		berg = maxi(berg, w)
	if kandidaten.is_empty():
		var r0: Dictionary = zyklus_start_fuer(sigs, zahl)
		r0["werte"] = werte
		return r0
	var best: int = 1 << 30
	for k: Array in kandidaten:
		best = mini(best, int(k[3]))
	# erster Kandidat mit tiefem Tal und gutem Schluss; sonst erster mit gutem Schluss; sonst der mit dem besten Schluss
	var grenze: int = maxi(best * 13 / 10 + 20, SCHLUSS_GUT)
	var wahl: Array = []
	for k: Array in kandidaten:
		if int(k[2]) >= TAL_TIEF and int(k[3]) <= grenze:
			wahl = k
			break
	if wahl.is_empty():
		for k: Array in kandidaten:
			if int(k[3]) <= grenze:
				wahl = k
				break
	var r: Dictionary = zyklus_start_fuer(sigs, int(wahl[0]))
	r["guete"] = int(wahl[2])
	r["kandidaten"] = kandidaten
	r["werte"] = werte
	return r


## Vorbereitung für Schließfehler: Unterschiede aufeinanderfolgender Bilder (gesamt, obere und untere Hälfte) als
## Summenfelder und das obere Viertel der Bewegung (für den Bewegungsfilter).
static func bewegung_vorbereiten(sigs: Array) -> Dictionary:
	var zahl: int = sigs.size()
	var gesamt: Array[int] = [0]
	var oben: Array[int] = [0]
	var unten: Array[int] = [0]
	var einzel: Array[int] = []
	for i: int in zahl - 1:
		var o: int = sig_teil(sigs[i], sigs[i + 1], 0)
		var u: int = sig_teil(sigs[i], sigs[i + 1], 1)
		einzel.append(o + u)
		gesamt.append(gesamt[i] + o + u)
		oben.append(oben[i] + o)
		unten.append(unten[i] + u)
	var sortiert: Array[int] = einzel.duplicate()
	sortiert.sort()
	var viertel: int = sortiert[sortiert.size() * 3 / 4] if not sortiert.is_empty() else 0
	var n1: int = maxi(zahl - 1, 1)
	return {"gesamt": gesamt, "oben": oben, "unten": unten, "viertel": viertel, "mittel_o": oben[zahl - 1] / n1 / 4 + 1, "mittel_u": unten[zahl - 1] / n1 / 4 + 1}


## Unterschied zweier Bildunterschriften in der oberen (teil 0) oder unteren (teil 1) Hälfte.
static func sig_teil(a: PackedByteArray, b: PackedByteArray, teil: int) -> int:
	var von: int = 0 if teil == 0 else a.size() / 2
	var bis: int = a.size() / 2 if teil == 0 else a.size()
	var s: int = 0
	for k: int in range(von, bis):
		var v: int = a[k] - b[k]
		s += v if v >= 0 else -v
	return s


## Schließfehler (Prozent eines gewöhnlichen Bildschritts, oben und unten getrennt, das Schlechtere) für Start i, Länge n.
static func schluss_prozent(sigs: Array, i: int, n: int, vor: Dictionary) -> int:
	var oben: Array[int] = vor["oben"]
	var unten: Array[int] = vor["unten"]
	var mo: int = maxi((oben[i + n] - oben[i]) / n, int(vor["mittel_o"]))
	var mu: int = maxi((unten[i + n] - unten[i]) / n, int(vor["mittel_u"]))
	var do_: int = sig_teil(sigs[i], sigs[i + n], 0)
	var du: int = sig_teil(sigs[i], sigs[i + n], 1)
	return maxi(do_ * 100 / mo, du * 100 / mu)


## Bester Start für die Länge n (kleinster Schließfehler unter den Anfängen mit Bewegung).
static func bester_start(sigs: Array, n: int, vor: Dictionary) -> Dictionary:
	var zahl: int = sigs.size()
	var gesamt: Array[int] = vor["gesamt"]
	var bester: int = 1 << 60
	var start: int = -1
	for i: int in zahl - n:
		if (gesamt[i + n] - gesamt[i]) * 2 < int(vor["viertel"]) * n:
			continue
		var sp: int = schluss_prozent(sigs, i, n, vor)
		if sp < bester:
			bester = sp
			start = i
	if start < 0:
		for i: int in zahl - n:
			var sp: int = schluss_prozent(sigs, i, n, vor)
			if sp < bester:
				bester = sp
				start = i
	return {"start": start, "schluss": bester}


## Bester Startpunkt für die Zykluslänge n; bei n = Bilderzahl der ganze Clip (Start 0, Schließfehler letzter → erster).
static func zyklus_start_fuer(sigs: Array, n: int) -> Dictionary:
	var zahl: int = sigs.size()
	var vor: Dictionary = bewegung_vorbereiten(sigs)
	if n >= zahl:
		var mitt: int = maxi((vor["gesamt"] as Array[int])[zahl - 1] / maxi(zahl - 1, 1), 1)
		var fe: int = sig_abstand(sigs[zahl - 1], sigs[0])
		return {"n": zahl, "start": 0, "fehler": fe, "schluss": fe * 100 / mitt, "guete": 0, "kandidaten": [], "werte": {}}
	var st: Dictionary = bester_start(sigs, n, vor)
	var i: int = int(st["start"])
	return {"n": n, "start": i, "fehler": sig_abstand(sigs[i], sigs[i + n]), "schluss": int(st["schluss"]), "guete": 0, "kandidaten": [], "werte": {}}


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


## Ausholen-Ende, Kontakt, Ruhe, Bewegungsbeginn (0-basierte Bildnummern).
##  Kontakt: erstes Bild der vollen Streckung: erstes Bild, dessen Ausdehnung (vorn: nach rechts, hoch: nach oben)
##           höchstens ein Zehntel des Hubs (mindestens KONTAKT_TOL) unter dem Größtwert des Clips liegt; ein
##           Nachschwung, der leicht weiter reicht, zählt nicht.
##  Ausholen-Ende: letztes Bild bis zum Kontakt, dessen Ausdehnung höchstens diese Toleranz über dem Kleinstwert
##           bis dahin liegt (am weitesten zurückgezogen, danach beginnt der Schlag).
##  Ruhe: erstes Bild nach dem Kontakt, das dem ersten Bild wieder gleicht (Bildunterschrift höchstens ein
##           Sechstel des größten Unterschieds zum ersten Bild). Gibt es keines (der Clip endet mit ausgestrecktem
##           Arm), ist `rueckkehr` = „rueckwaerts“ und Ruhe das erste Bild: Die Rückkehr entsteht durch Rückwärtsspielen
##           vom Kontakt zurück. Sonst „vorwaerts“.
##  Rückzug: letztes Bild der vollen Streckung vor der Ruhe (der Arm bleibt im Clip oft lange gestreckt; ab hier läuft
##           die Rückkehr, die Tabelle spielt dazwischen nicht alle Haltebilder ab).
##  Start: erstes Bild, das sich merklich (ein Fünfundzwanzigstel des größten Unterschieds) vom ersten Bild unterscheidet.
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
	var start: int = 0
	for i: int in range(1, zahl):
		if d0[i] > maxi(gipfel / 25, 1):
			start = i
			break
	var ruhe: int = -1
	for i: int in range(kontakt + 1, zahl):
		if d0[i] <= schwelle:
			ruhe = i
			break
	var rueck: String = "vorwaerts"
	if ruhe < 0:
		rueck = "rueckwaerts"
		ruhe = 0
	# Rückzug: letztes Bild der vollen Streckung vor der Ruhe (bei Rückkehr rückwärts: das Kontaktbild selbst)
	var rueckzug: int = kontakt
	# Rückzug-Toleranz größer als die des Kontakts (ein Viertel des Hubs): Ein Arm, der nach dem Überschwingen lange
	# nur wenig kürzer gestreckt bleibt, gilt noch als gehalten.
	var tol_halten: int = maxi(tol, (spitze - kl) / 4)
	if rueck == "vorwaerts":
		for i: int in range(kontakt, ruhe):
			if mass[i] >= spitze - tol_halten:
				rueckzug = i
	return {"ausholen": ausholen, "kontakt": kontakt, "rueckzug": rueckzug, "ruhe": ruhe, "bewegung": start, "schwelle": schwelle, "rueckkehr": rueck}


# ===========================================================================
# PNG mit Palette (kleiner als RGBA: 64 Farben, Index 0 = durchsichtig)
# ===========================================================================

static var _crc_tabelle: PackedInt64Array = PackedInt64Array()


static func _crc32(daten: PackedByteArray) -> int:
	if _crc_tabelle.is_empty():
		_crc_tabelle.resize(256)
		for n: int in 256:
			var c: int = n
			for _k: int in 8:
				c = (0xEDB88320 ^ (c >> 1)) if (c & 1) != 0 else (c >> 1)
			_crc_tabelle[n] = c
	var crc: int = 0xFFFFFFFF
	for b: int in daten:
		crc = _crc_tabelle[(crc ^ b) & 255] ^ (crc >> 8)
	return crc ^ 0xFFFFFFFF


static func _png_block(art: String, daten: PackedByteArray) -> PackedByteArray:
	var aus: PackedByteArray = PackedByteArray()
	var laenge: int = daten.size()
	aus.append_array(PackedByteArray([(laenge >> 24) & 255, (laenge >> 16) & 255, (laenge >> 8) & 255, laenge & 255]))
	var kd: PackedByteArray = art.to_ascii_buffer()
	kd.append_array(daten)
	aus.append_array(kd)
	var crc: int = _crc32(kd)
	aus.append_array(PackedByteArray([(crc >> 24) & 255, (crc >> 16) & 255, (crc >> 8) & 255, crc & 255]))
	return aus


## Schreibt ein RGBA8-Bild (Alpha nur 0 oder 255, Farben aus `palette`) als PNG mit Palette (8 Bit, Index 0 durchsichtig,
## Index k + 1 = palette[k]) und tRNS. Zeilenfilter je Zeile None, Sub oder Up mit der kleinsten Betragssumme (feste Wahl).
static func png_palette(f: PackedByteArray, b: int, h: int, palette: Array) -> PackedByteArray:
	var index: Dictionary = {}
	for k: int in palette.size():
		index[int(palette[k])] = k + 1
	var roh: PackedByteArray = PackedByteArray()
	roh.resize(b * h)
	for p: int in b * h:
		var o: int = p * 4
		if f[o + 3] != 0:
			roh[p] = int(index[(f[o] << 16) | (f[o + 1] << 8) | f[o + 2]])
	var gefiltert: PackedByteArray = PackedByteArray()
	for y: int in h:
		var z: int = y * b
		var best: int = 0
		var beste_summe: int = 1 << 40
		for fa: int in 3:
			var summe: int = 0
			for x: int in b:
				var v: int = roh[z + x]
				var l: int = roh[z + x - 1] if x > 0 else 0
				var u: int = roh[z - b + x] if y > 0 else 0
				var d: int = (v - (0 if fa == 0 else (l if fa == 1 else u))) & 255
				summe += d if d < 128 else 256 - d
			if summe < beste_summe:
				beste_summe = summe
				best = fa
		gefiltert.append(best)
		for x: int in b:
			var v: int = roh[z + x]
			var l: int = roh[z + x - 1] if x > 0 else 0
			var u: int = roh[z - b + x] if y > 0 else 0
			gefiltert.append((v - (0 if best == 0 else (l if best == 1 else u))) & 255)
	var kopf: PackedByteArray = PackedByteArray([(b >> 24) & 255, (b >> 16) & 255, (b >> 8) & 255, b & 255, (h >> 24) & 255, (h >> 16) & 255, (h >> 8) & 255, h & 255, 8, 3, 0, 0, 0])
	var plte: PackedByteArray = PackedByteArray([0, 0, 0])
	for c: int in palette:
		plte.append_array(PackedByteArray([(c >> 16) & 255, (c >> 8) & 255, c & 255]))
	var aus: PackedByteArray = PackedByteArray([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
	aus.append_array(_png_block("IHDR", kopf))
	aus.append_array(_png_block("PLTE", plte))
	aus.append_array(_png_block("tRNS", PackedByteArray([0])))
	aus.append_array(_png_block("IDAT", gefiltert.compress(FileAccess.COMPRESSION_DEFLATE)))
	aus.append_array(_png_block("IEND", PackedByteArray()))
	return aus


## Ereignisse der Clips ohne Schlag (0-basierte Bildnummern) nach `typ`. `m` enthält die Messreihen je Bild:
## luft (Höhe der Unterkante über der Bodenlinie des ersten Bildes, Bildpixel), schwerp, vorn, hoch (Abstand der obersten
## Zeile vom oberen Bildrand, kleiner = höher), breite und hoehe (Silhouette) sowie die Bildunterschriften `sigs`.
##  sprung:    hocke (tiefste Haltung vor dem Absprung), absprung (erstes Bild mit Luft ≥ 2 über dem Boden), scheitel
##             (Mitte des höchsten Abschnitts, höchstens 6 px unter dem Gipfel), aufsetzen (erstes Bild danach mit Luft ≤ 1), tief (tiefste Haltung nach dem
##             Aufsetzen, Höhe der Silhouette am kleinsten), ruhe (erstes Bild danach, dessen Silhouette wieder so hoch ist
##             wie im ersten Bild, 3 px Toleranz).
##  treffer:   start (erstes Bild, das sich vom ersten merklich unterscheidet: ein Fünfundzwanzigstel des größten
##             Unterschieds), kontakt (erstes Bild mit mindestens 95 % der größten Breite der Silhouette: Arme nach außen,
##             größte Auslenkung), rueckzug (letztes solches Bild), ruhe (erstes Bild danach, das dem letzten höchstens
##             ein Sechstel des größten Unterschieds zum letzten Bild gleicht: die Haltung ist erreicht).
##  flug:      start (wie treffer), abheben (erstes Bild mit Luft ≥ 3), scheitel (größte Luft), aufprall (erstes Bild
##             danach, dessen Luft höchstens 3 px über dem tiefsten Stand nach dem Scheitel liegt: der Körper liegt auf),
##             liegt (erstes Bild nach dem Aufprall, das dem letzten höchstens ein Achtel des größten Unterschieds
##             zum letzten Bild gleicht).
##  aufstehen: start (erstes Bild, das sich vom ersten merklich unterscheidet), ruhe (erstes Bild, das dem letzten
##             höchstens ein Sechstel des größten Unterschieds zum letzten Bild gleicht: die Haltung steht).
## Leer bei vorn, hoch, keine.
static func ereignisse_andere(typ: String, sigs: Array, m: Dictionary) -> Dictionary:
	var luft: Array[int] = m["luft"]
	var breite: Array[int] = m["breite"]
	var hoehe: Array[int] = m["hoehe"]
	var n: int = sigs.size()
	var e: Dictionary = {}
	if n < 3 or not ["sprung", "treffer", "flug", "aufstehen"].has(typ):
		return e
	var d0: Array[int] = []
	var dl: Array[int] = []
	var g0: int = 1
	var gl: int = 1
	for i: int in n:
		d0.append(sig_abstand(sigs[i], sigs[0]))
		dl.append(sig_abstand(sigs[i], sigs[n - 1]))
		g0 = maxi(g0, d0[i])
		gl = maxi(gl, dl[i])
	var start: int = 0
	for i: int in range(1, n):
		if d0[i] > maxi(g0 / 25, 1):
			start = i
			break
	if typ == "sprung":
		var gipfel: int = 0
		for i: int in n:
			gipfel = maxi(gipfel, luft[i])
		var ab: int = 0
		for i: int in n:
			if luft[i] >= 2:
				ab = i
				break
		var von: int = -1
		var bis: int = 0
		for i: int in range(ab, n):
			if luft[i] >= gipfel - 6:
				if von < 0:
					von = i
				bis = i
		var scheitel: int = (von + bis) / 2
		var auf: int = n - 1
		for i: int in range(bis + 1, n):
			if luft[i] <= 1:
				auf = i
				break
		var tief: int = auf
		for i: int in range(auf, n):
			if hoehe[i] < hoehe[tief]:
				tief = i
		var hocke: int = 0
		for i: int in range(0, ab):
			if hoehe[i] < hoehe[hocke]:
				hocke = i
		var ruhe: int = n - 1
		for i: int in range(tief, n):
			if hoehe[i] >= hoehe[0] - 3:
				ruhe = i
				break
		e = {"hocke": hocke, "absprung": ab, "scheitel": scheitel, "aufsetzen": auf, "tief": tief, "ruhe": ruhe}
	elif typ == "treffer":
		var wmax: int = 0
		for i: int in n:
			wmax = maxi(wmax, breite[i])
		var kontakt: int = 0
		var rueck: int = 0
		for i: int in n:
			if breite[i] * 100 >= wmax * 95:
				if kontakt == 0:
					kontakt = i
				rueck = i
		var ruhe: int = n - 1
		for i: int in range(rueck, n):
			if dl[i] <= maxi(gl / 6, 1):
				ruhe = i
				break
		e = {"start": start, "kontakt": kontakt, "rueckzug": rueck, "ruhe": ruhe}
	elif typ == "flug":
		var scheitel: int = 0
		for i: int in n:
			if luft[i] > luft[scheitel]:
				scheitel = i
		var ab: int = 0
		for i: int in n:
			if luft[i] >= 3:
				ab = i
				break
		var boden: int = luft[scheitel]
		for i: int in range(scheitel, n):
			boden = mini(boden, luft[i])
		var auf: int = n - 1
		for i: int in range(scheitel, n):
			if luft[i] <= boden + 3:
				auf = i
				break
		var gl2: int = 1
		for i: int in range(auf, n):
			gl2 = maxi(gl2, dl[i])
		var liegt: int = n - 1
		for i: int in range(auf, n):
			if dl[i] <= maxi(gl2 / 8, 1):
				liegt = i
				break
		e = {"start": start, "abheben": ab, "scheitel": scheitel, "aufprall": auf, "liegt": liegt}
	else:
		var ruhe: int = n - 1
		for i: int in n:
			if dl[i] <= maxi(gl / 6, 1):
				ruhe = i
				break
		e = {"start": start, "ruhe": ruhe}
	return e


## Schrittlänge für das Gehen: Im Fußband (die untersten FUSS_BAND Zeilen über der Bodenlinie `bodeny`) ist die Breite
## der Figur am größten, wenn die Füße auseinander stehen, und am kleinsten, wenn sie zusammen stehen; der
## Unterschied ist die Schrittlänge in Bildpixeln. Ein Doppelschritt (der Zyklus) ist zwei Schritte lang; mit
## dem Gehtempo der Logik (KernWerte.LAUF_X · 2 Bildpixel je Tick) ergibt sich die Zyklusdauer in Ticks,
## damit der Standfuß nicht rutscht. Nicht messbar (Schritt unter 8 px): 24 Ticks.
## Gemessen wird über die Bilder des Zyklus (start, n).
static func schrittlaenge(bilder: Array, b: int, h: int, bodeny: int, start: int, n: int, lauf: bool = false) -> Dictionary:
	var kleinst: int = 1 << 30
	var groesst: int = 0
	for i: int in range(start, mini(start + n, bilder.size())):
		var f: PackedByteArray = bilder[i]
		var xmin: int = b
		var xmax: int = -1
		for y: int in range(maxi(0, bodeny - (LAUF_BAND if lauf else FUSS_BAND) + 1), mini(h, bodeny + 1)):
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
	if lauf:
		# Laufen: breiteste Spreizung der Beine (Zehe bis Zehe) minus eine Stiefellänge ist die Schrittlänge; Zyklusdauer
		# in Ticks beim mittleren Sprinttempo (3,5 px je Tick), die Tabelle rechnet das Tempo je Frame selbst
		schritt = maxi(groesst - LAUF_STIEFEL, 8)
		return {"schritt": schritt, "ticks": clampi((schritt * 65536 + 114688) / 229376, 12, 60)}
	var ticks: int = 24
	if schritt >= 8:
		ticks = clampi((schritt * 65536 + KernWerte.LAUF_X / 2) / KernWerte.LAUF_X, 12, 60)
	return {"schritt": schritt, "ticks": ticks}
