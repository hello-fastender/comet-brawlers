## Test der 3D-Vela (Versuch „Vela in 3D“, docs/dreid-vela.md): Clipdaten der 3D-Clips, Abbildung Aktion/Uhr → Zeit
## (DarstellungVela3DTabelle), Modell und Animationen laden, Pose (Fäuste, Hüfte in der Mitte, Boden in der Luft, Überblendung).
## Läuft ohne Fenster und ohne Baum (unter --headless wird nichts gezeichnet; die Posen rechnet der Node von Hand aus den Spuren,
## sie brauchen weder einen AnimationPlayer noch laufende Bilder):
##   godot --headless --path godot --script res://tests/alle.gd
## Einbindung: `var r := Vela3DTest.lauf()`; r["geprueft"] Zahl der Prüfungen, r["fehler"] Meldungen.
class_name Vela3DTest
extends RefCounted

## Clips der 3D-Vela (Namen der gemalten Clips, werkzeuge/dreid_clips.json).
const CLIPS: Array[String] = ["stand", "gehen", "sprint", "kette1", "kette2", "kette3", "kette4", "sprung", "getroffen_vorn", "umgeworfen", "liegen", "aufstehen"]
const EINHEIT: int = DarstellungVela3DTabelle.EINHEIT
## Winkeltoleranz in rad beim Vergleichen von Drehungen: acos nahe 1 verstärkt Rundungsfehler der Fließkommazahlen auf einige 1e-4
const WINKEL_EPS: float = 0.003

var _geprueft: int = 0
var _fehler: Array[String] = []
var _wurzel: Node = null


static func lauf() -> Dictionary:
	var t: Vela3DTest = Vela3DTest.new()
	t._alles()
	DarstellungVela3DTabelle.vergessen()
	return {"geprueft": t._geprueft, "fehler": t._fehler}


func _ok(bedingung: bool, name: String) -> void:
	_geprueft += 1
	if not bedingung:
		_fehler.append(name)


func _gleich(ist: Variant, soll: Variant, name: String) -> void:
	_geprueft += 1
	if typeof(ist) != typeof(soll) or ist != soll:
		_fehler.append("%s: ist %s, soll %s" % [name, var_to_str(ist), var_to_str(soll)])


func _nahe(ist: float, soll: float, eps: float, name: String) -> void:
	_geprueft += 1
	if absf(ist - soll) > eps:
		_fehler.append("%s: ist %.4f, soll %.4f ± %.4f" % [name, ist, soll, eps])


func _figur(aktion: String, uhr: int = 1) -> KernEntitaeten.Figur:
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	f.aktion = aktion
	f.uhr = uhr
	return f


func _alles() -> void:
	DarstellungVela3DTabelle.vergessen()
	_clipdaten()
	_ereignisse()
	_abdeckung()
	_zeiten()
	if DarstellungVela3D.bereit():
		_modell()
	else:
		_ok(false, "Modell und Animationen unter grafik/vela_3d/ vorhanden")


# ---------------------------------------------------------------------------
# Clipdaten
# ---------------------------------------------------------------------------

func _daten(clip: String) -> Dictionary:
	return DarstellungVela3DTabelle.clip_daten(clip)


func _clipdaten() -> void:
	for c: String in CLIPS:
		var d: Dictionary = _daten(c)
		_ok(not d.is_empty(), "Clipdaten %s lesbar" % c)
		if d.is_empty():
			continue
		_gleich(int(d["fps"]), EINHEIT, "%s: Zeiteinheit 1/%d s" % [c, EINHEIT])
		_ok(int(d["bilder"]) >= 1, "%s: mindestens ein Bild" % c)
	_ok(_daten("gibt_es_nicht").is_empty(), "unbekannter Clip ist leer")
	# Schleifen: Gehen und Sprint messen die Schrittlänge, der Stand läuft hin und her
	for c: String in ["gehen", "sprint"]:
		var d: Dictionary = _daten(c)
		_ok(int(d["schritt_px"]) > 20 and int(d["schritt_px"]) < 300, "%s: Schrittlänge in Spielpixeln plausibel (%d)" % [c, int(d["schritt_px"])])
		_ok(int(d["zyklus_ticks"]) >= DarstellungVelaFramesTabelle.GEHEN_TICKS_MIN and int(d["zyklus_ticks"]) <= DarstellungVelaFramesTabelle.GEHEN_TICKS_MAX, "%s: Zyklus in Ticks innerhalb der Grenzen der Tabelle (%d)" % [c, int(d["zyklus_ticks"])])
	_gleich(String(_daten("stand")["schleife"]), "pingpong", "stand: Schleife hin und her")


func _ereignisse() -> void:
	var bilder: Callable = func(c: String) -> int: return int(_daten(c)["bilder"])
	for k: int in [1, 2, 3, 4]:
		var c: String = "kette%d" % k
		var d: Dictionary = _daten(c)
		_ok(int(d["ausholen"]) < int(d["kontakt"]) and int(d["kontakt"]) <= int(d["rueckzug"]) and int(d["rueckzug"]) < int(d["ruhe"]) and int(d["ruhe"]) < int(d["bilder"]), "%s: ausholen < kontakt ≤ rueckzug < ruhe < Ende" % c)
	var k4: Dictionary = _daten("kette4")
	_ok(int(k4["kontakt1"]) > int(k4["ausholen"]) and int(k4["kontakt1"]) < int(k4["kontakt"]), "kette4: erstes Trefferfenster liegt vor dem zweiten (kontakt1 < kontakt)")
	var sp: Dictionary = (_daten("sprung")["ereignis"] as Dictionary)
	_ok(int(sp["hocke"]) <= int(sp["absprung"]) and int(sp["absprung"]) < int(sp["scheitel"]) and int(sp["scheitel"]) < int(sp["aufsetzen"]) and int(sp["aufsetzen"]) <= int(sp["ruhe"]) and int(sp["ruhe"]) < bilder.call("sprung"), "sprung: hocke ≤ absprung < scheitel < aufsetzen ≤ ruhe < Ende")
	var gv: Dictionary = (_daten("getroffen_vorn")["ereignis"] as Dictionary)
	_ok(int(gv["start"]) < int(gv["kontakt"]) and int(gv["kontakt"]) <= int(gv["rueckzug"]) and int(gv["rueckzug"]) < int(gv["ruhe"]) and int(gv["ruhe"]) < bilder.call("getroffen_vorn"), "getroffen_vorn: start < kontakt ≤ rueckzug < ruhe < Ende")
	var um: Dictionary = (_daten("umgeworfen")["ereignis"] as Dictionary)
	_ok(int(um["start"]) < int(um["abheben"]) and int(um["abheben"]) < int(um["aufprall"]) and int(um["aufprall"]) < int(um["liegt"]) and int(um["liegt"]) < bilder.call("umgeworfen"), "umgeworfen: start < abheben < aufprall < liegt < Ende")
	var au: Dictionary = (_daten("aufstehen")["ereignis"] as Dictionary)
	_ok(int(au["ruhe"]) == bilder.call("aufstehen") - 1, "aufstehen: ruhe ist das letzte Bild")


# ---------------------------------------------------------------------------
# Abdeckung und Zeiten
# ---------------------------------------------------------------------------

func _abdeckung() -> void:
	for paar: Array in [["STAND", "stand"], ["LAUF", "gehen"], ["SPRINT", "sprint"], ["SPRUNG", "sprung"], ["LANDUNG", "sprung"], ["GETROFFEN", "getroffen_vorn"],
			["UMGEWORFEN", "umgeworfen"], ["LIEGEN", "liegen"], ["AUFSTEHEN", "aufstehen"]]:
		var f: KernEntitaeten.Figur = _figur(paar[0])
		var w: Dictionary = DarstellungVela3DTabelle.wahl(f)
		_ok(DarstellungVela3DTabelle.abgedeckt(f), "abgedeckt: %s" % paar[0])
		_gleich(String(w.get("clip", "")), paar[1], "%s zeigt den Clip %s" % [paar[0], paar[1]])
	for k: int in [1, 2, 3, 4]:
		var f: KernEntitaeten.Figur = _figur("SCHLAG")
		f.kombo = k
		_gleich(String(DarstellungVela3DTabelle.wahl(f).get("clip", "")), "kette%d" % k, "SCHLAG Stufe %d zeigt kette%d" % [k, k])
	var t: KernEntitaeten.Figur = _figur("TOT")
	_gleich(String(DarstellungVela3DTabelle.wahl(t).get("clip", "")), "umgeworfen", "TOT zeigt umgeworfen")
	t.phase = "R"
	_gleich(String(DarstellungVela3DTabelle.wahl(t).get("clip", "")), "liegen", "TOT ab der Ruhe zeigt liegen")
	# ohne 3D-Clip: nicht abgedeckt (Rückfall auf gemalte Vela, Puppe, Platzhalter)
	for a: String in ["GRIFF", "WURF", "KNIESTOSS", "SPEZIAL", "SPRINTANGRIFF", "WAFFE", "AUFNEHMEN", "NEUEINSTIEG"]:
		_ok(not DarstellungVela3DTabelle.abgedeckt(_figur(a)), "nicht abgedeckt: %s hat keinen 3D-Clip" % a)
	var sa: KernEntitaeten.Figur = _figur("SPRUNGANGRIFF")
	sa.sprung_variante = "N"
	_ok(not DarstellungVela3DTabelle.abgedeckt(sa), "nicht abgedeckt: SPRUNGANGRIFF (kein Clip sprungtritt)")
	# Ersatzclip: ein fehlender Clip lässt die Aktion offen, ein eingesetzter deckt sie ab
	DarstellungVela3DTabelle.ersatz_setzen("stand", {"bilder": 10, "ereignis": {}, "fps": EINHEIT, "zyklus_start": 0, "zyklus_bilder": 10, "schleife": "", "name": "stand"})
	_ok(DarstellungVela3DTabelle.abgedeckt(_figur("STAND")), "Ersatzclip deckt STAND ab")
	DarstellungVela3DTabelle.ersatz_setzen("stand", {})
	_ok(DarstellungVela3DTabelle.abgedeckt(_figur("STAND")), "nach dem Entfernen des Ersatzes wieder die Datei")


func _zeit(f: KernEntitaeten.Figur) -> float:
	return DarstellungVela3DTabelle.zeit(DarstellungVela3DTabelle.wahl(f))


func _zeiten() -> void:
	# alle Zeiten liegen im Clip
	var laengen: Dictionary = {}
	for c: String in CLIPS:
		laengen[c] = float(int(_daten(c)["bilder"]) - 1) / float(EINHEIT)
	for aktion: String in ["STAND", "LAUF", "SPRINT", "SPRUNG", "LANDUNG", "GETROFFEN", "LIEGEN", "AUFSTEHEN"]:
		var f: KernEntitaeten.Figur = _figur(aktion)
		var ok: bool = true
		for u: int in range(1, 130):
			f.uhr = u
			f.sprint_n = u
			f.vh = KernWerte.SPRUNG_VH_START - u * KernWerte.SPRUNG_SCHWERKRAFT
			var w: Dictionary = DarstellungVela3DTabelle.wahl(f)
			var z: float = DarstellungVela3DTabelle.zeit(w)
			if z < 0.0 or z > float(laengen[String(w["clip"])]) + 0.0001:
				ok = false
		_ok(ok, "%s: Zeit liegt für Uhr 1 bis 129 im Clip" % aktion)
	# Kette 1: im ersten aktiven Frame (uhr 2) das Kontaktbild, bis zum letzten aktiven (5) gehalten
	var k1: Dictionary = _daten("kette1")
	var f1: KernEntitaeten.Figur = _figur("SCHLAG")
	f1.kombo = 1
	for u: int in range(KernWerte.KETTE_AKTIV_VON[0], KernWerte.KETTE_AKTIV_BIS[0] + 1):
		f1.uhr = u
		_nahe(_zeit(f1), float(int(k1["kontakt"])) / float(EINHEIT), 0.0001, "Kette 1: Kontaktpose in uhr %d" % u)
	f1.uhr = 1
	_ok(_zeit(f1) > float(int(k1["ausholen"])) / float(EINHEIT) and _zeit(f1) < float(int(k1["kontakt"])) / float(EINHEIT), "Kette 1: uhr 1 zwischen Ausholen und Kontakt")
	f1.uhr = KernWerte.LEERSCHLAG_DAUER
	_ok(_zeit(f1) <= float(int(k1["ruhe"])) / float(EINHEIT) + 0.0001 and _zeit(f1) > float(int(k1["rueckzug"])) / float(EINHEIT), "Kette 1: im letzten Tick zurück bis zur Ruhe")
	# Kette 4: zwei Fenster
	var k4: Dictionary = _daten("kette4")
	var f4: KernEntitaeten.Figur = _figur("SCHLAG")
	f4.kombo = 4
	f4.uhr = KernWerte.KETTE_AKTIV_VON[3]
	_nahe(_zeit(f4), float(int(k4["kontakt1"])) / float(EINHEIT), 0.0001, "Kette 4: erstes Fenster zeigt kontakt1")
	f4.uhr = KernWerte.KETTE4_ZWEITES_FENSTER_VON
	_nahe(_zeit(f4), float(int(k4["kontakt"])) / float(EINHEIT), 0.0001, "Kette 4: zweites Fenster zeigt kontakt")
	# Sprung: Hocke in uhr 1, Scheitel in uhr 21, vor dem Aufsetzen in uhr 41
	var sp: Dictionary = (_daten("sprung")["ereignis"] as Dictionary)
	var fs: KernEntitaeten.Figur = _figur("SPRUNG")
	_nahe(_zeit(fs), float(int(sp["hocke"])) / float(EINHEIT), 0.0001, "Sprung: uhr 1 ist die Hocke")
	fs.uhr = KernWerte.SPRUNG_SCHEITEL_FRAME
	_nahe(_zeit(fs), float(int(sp["scheitel"])) / float(EINHEIT), 0.0001, "Sprung: uhr 21 ist der Scheitel")
	fs.uhr = KernWerte.SPRUNG_LETZTER_LUFTFRAME
	_ok(_zeit(fs) < float(int(sp["aufsetzen"])) / float(EINHEIT) + 0.0001 and _zeit(fs) > float(int(sp["scheitel"])) / float(EINHEIT), "Sprung: letzter Luftframe kurz vor dem Aufsetzen")
	# Aufstehen: erstes Bild bis Kampfhaltung über FIGUR_AUFSTEHEN_DAUER Ticks
	var fa: KernEntitaeten.Figur = _figur("AUFSTEHEN")
	_nahe(_zeit(fa), 0.0, 0.0001, "Aufstehen: uhr 1 ist das erste Bild")
	fa.uhr = KernWerte.FIGUR_AUFSTEHEN_DAUER
	_nahe(_zeit(fa), laengen["aufstehen"], 0.0001, "Aufstehen: letzter Tick ist die Kampfhaltung")
	# Stand: Echtzeit, Schleife hin und her mit der Länge des Clips
	var st: Dictionary = _daten("stand")
	var periode: int = DarstellungVelaFramesTabelle.zyklus_ticks("stand", st)
	var fst: KernEntitaeten.Figur = _figur("STAND")
	_nahe(_zeit(fst), 0.0, 0.0001, "Stand: uhr 1 beginnt am Anfang")
	fst.uhr = 1 + periode / 2
	_nahe(_zeit(fst), laengen["stand"], 0.02, "Stand: nach einer halben Periode am Ende des Clips")
	fst.uhr = 1 + periode
	_nahe(_zeit(fst), 0.0, 0.0001, "Stand: nach einer Periode wieder am Anfang (hin und her)")
	# Blick: der Flug zeigt entgegen der Bahn
	var fu: KernEntitaeten.Figur = _figur("UMGEWORFEN")
	fu.bahn_richtung = -1
	_gleich(int(DarstellungVela3DTabelle.wahl(fu)["blick"]), 1, "Umgeworfen: Flug nach links, Blick nach rechts")
	fu.bahn_richtung = 1
	_gleich(int(DarstellungVela3DTabelle.wahl(fu)["blick"]), -1, "Umgeworfen: Flug nach rechts, Blick nach links")


# ---------------------------------------------------------------------------
# Modell und Pose
# ---------------------------------------------------------------------------

func _modell() -> void:
	# Der Node steht hier nicht im Baum (der Test läuft in _init von alle.gd); laden() und die Pose brauchen ihn nicht.
	var v: DarstellungVela3D = DarstellungVela3D.new()
	_ok(v.laden(), "3D-Vela: Modell und Animationen laden")
	if not v.geladen():
		v.free()
		return
	var sk: Skeleton3D = v.skelett()
	var ap: AnimationLibrary = v.animationen()
	_gleich(sk.get_bone_count(), 65, "Skelett: 65 Knochen (Mixamo)")
	_ok(sk.find_bone("mixamorig_Hips") >= 0 and sk.find_bone("mixamorig_LeftHandIndex3") >= 0, "Skelett: Hüfte und Fingerglieder vorhanden")
	_gleich(ap.get_animation_list().size(), CLIPS.size(), "Animationen: ein Clip je Eintrag")
	# jede Spur zeigt auf einen Knochen des Modells (sonst bliebe das Glied in der Ruhepose stehen)
	var fehlend: Array[String] = []
	for c: String in CLIPS:
		_ok(ap.has_animation(c), "Animation %s vorhanden" % c)
		if not ap.has_animation(c):
			continue
		var a: Animation = ap.get_animation(c)
		_ok(a.get_track_count() >= 20, "%s: mindestens 20 Spuren" % c)
		for i: int in a.get_track_count():
			var pfad: String = String(a.track_get_path(i))
			var knochen: String = pfad.substr(pfad.rfind(":") + 1)
			if sk.find_bone(knochen) < 0 and not fehlend.has(knochen):
				fehlend.append(knochen)
	_ok(fehlend.is_empty(), "alle Spuren treffen Knochen des Modells (fehlend: %s)" % str(fehlend))
	_gleich(String(v.modell().get_path_to(sk)), "Armature/Skeleton3D", "Pfad des Skeletts wie beim Bauen")
	# Pose Kette 1 im Kontakt: Hand weit vorn, Fäuste, Hüfte in der Mitte
	var hueft: int = sk.find_bone("mixamorig_Hips")
	var ruhe: Vector3 = sk.get_bone_pose(hueft).origin
	var f1: KernEntitaeten.Figur = _figur("SCHLAG", KernWerte.KETTE_AKTIV_VON[0])
	f1.kombo = 1
	v.aus_figur(f1, null)
	_gleich(v.clip_name(), "kette1", "Pose: Clip kette1")
	_ok(v.visible, "Pose: sichtbar")
	var pos: Vector3 = sk.get_bone_pose_position(hueft)
	_nahe(pos.x, ruhe.x, 0.0001, "Pose: Hüfte waagrecht in der Mitte (x)")
	_nahe(pos.z, ruhe.z, 0.0001, "Pose: Hüfte waagrecht in der Mitte (z)")
	var vorn: float = 0.0
	for n: String in ["mixamorig_LeftHand", "mixamorig_RightHand"]:
		var d: Vector3 = v.knochen_global(sk.find_bone(n)).origin - v.knochen_global(hueft).origin
		vorn = maxf(vorn, d.z)
	_ok(vorn > 0.3, "Pose: Hand im Kontakt weit vorn (%.2f)" % vorn)
	# Fäuste: Fingerglied gegenüber der Ruhe um FAUST_GRAD gedreht, in jedem Bild gleich (kein Aufsummieren)
	var finger: int = sk.find_bone("mixamorig_RightHandMiddle2")
	var winkel1: float = rad_to_deg(sk.get_bone_pose_rotation(finger).angle_to(sk.get_bone_rest(finger).basis.get_rotation_quaternion()))
	_nahe(winkel1, DarstellungVela3D.FAUST_GRAD, 0.5, "Fäuste: Fingerglied um FAUST_GRAD eingerollt")
	for u: int in range(1, 6):
		f1.uhr = u
		v.aus_figur(f1, null)
	var winkel2: float = rad_to_deg(sk.get_bone_pose_rotation(finger).angle_to(sk.get_bone_rest(finger).basis.get_rotation_quaternion()))
	_nahe(winkel2, winkel1, 0.01, "Fäuste: nach mehreren Bildern unverändert")
	# Blick links
	var fl: KernEntitaeten.Figur = _figur("STAND")
	fl.blick = -1
	v.aus_figur(fl, null)
	_nahe(v.scale.x, -1.0, 0.0001, "Blick links spiegelt den Node")
	fl.blick = 1
	v.aus_figur(fl, null)
	_nahe(v.scale.x, 1.0, 0.0001, "Blick rechts: Maßstab 1")
	# Boden: im Sprung kommt die Höhe aus der Logik, die Zehen stehen am Fußpunkt
	var fs: KernEntitaeten.Figur = _figur("SPRUNG", KernWerte.SPRUNG_SCHEITEL_FRAME)
	v.aus_figur(fs, null)
	_ok(v.luft_abzug() > 0.2, "Sprung: im Scheitel zieht der Clip die Höhe der Füße ab (%.2f)" % v.luft_abzug())
	var y_zeh: float = 1000.0
	for n: String in ["mixamorig_LeftToeBase", "mixamorig_RightToeBase"]:
		y_zeh = minf(y_zeh, v.knochen_global(sk.find_bone(n)).origin.y - v.luft_abzug())
	_ok(y_zeh < 0.05, "Sprung: tiefere Zehe nach dem Abzug am Boden (%.3f)" % y_zeh)
	fs.uhr = 1
	v.aus_figur(fs, null)
	_nahe(v.luft_abzug(), 0.0, 0.01, "Sprung: in der Hocke (uhr 1) kein Abzug")
	var fk: KernEntitaeten.Figur = _figur("STAND")
	v.aus_figur(fk, null)
	_nahe(v.luft_abzug(), 0.0, 0.0001, "Stand: kein Abzug")
	# Überblendung: Wechsel von Gehen zu Stand mischt über BLEND_TICKS Logikschritte (Schritte der Welt zählen, hier von Hand)
	var wl: KernWelt = KernWelt.new()
	var fg: KernEntitaeten.Figur = _figur("LAUF", 10)
	wl.frame = 100
	v.aus_figur(fg, wl)
	var rot_gehen: Quaternion = sk.get_bone_pose_rotation(sk.find_bone("mixamorig_LeftUpLeg"))
	var fst2: KernEntitaeten.Figur = _figur("STAND", 1)
	wl.frame = 101
	v.aus_figur(fst2, wl)
	var rot_misch: Quaternion = sk.get_bone_pose_rotation(sk.find_bone("mixamorig_LeftUpLeg"))
	var bib_stand: Quaternion = _bein_im_stand(v, 1)
	_ok(rot_misch.angle_to(bib_stand) > 0.01, "Überblendung: im ersten Schritt nach dem Wechsel noch nicht die Standpose")
	_ok(rot_misch.angle_to(rot_gehen) > 0.001, "Überblendung: im ersten Schritt schon ein Stück weg vom Gehen")
	for s: int in range(2, DarstellungVela3D.BLEND_TICKS["stand"] + 2):
		wl.frame = 100 + s
		fst2.uhr = s
		v.aus_figur(fst2, wl)
	var rot_ende: Quaternion = sk.get_bone_pose_rotation(sk.find_bone("mixamorig_LeftUpLeg"))
	_nahe(rot_ende.angle_to(_bein_im_stand(v, fst2.uhr)), 0.0, WINKEL_EPS, "Überblendung: nach BLEND_TICKS Schritten die reine Standpose")
	# Schlag wird nicht überblendet: sofort die Pose des Clips
	var fsl: KernEntitaeten.Figur = _figur("SCHLAG", KernWerte.KETTE_AKTIV_VON[0])
	fsl.kombo = 1
	wl.frame = 200
	v.aus_figur(fst2, wl)
	wl.frame = 201
	v.aus_figur(fsl, wl)
	var rot_schlag: Quaternion = sk.get_bone_pose_rotation(sk.find_bone("mixamorig_LeftUpLeg"))
	_nahe(rot_schlag.angle_to(_bein_im_clip(v, fsl)), 0.0, WINKEL_EPS, "Schlag: ohne Überblendung sofort die Pose des Clips")
	# Lücke im Aufruf (Foto nach vielen Schritten): keine Überblendung aus einer alten Pose
	wl.frame = 500
	fst2.uhr = 3
	v.aus_figur(fg, wl)
	wl.frame = 900
	v.aus_figur(fst2, wl)
	_nahe(sk.get_bone_pose_rotation(sk.find_bone("mixamorig_LeftUpLeg")).angle_to(_bein_im_stand(v, fst2.uhr)), 0.0, WINKEL_EPS, "Lücke: nach 400 Schritten ohne Aufruf keine Überblendung")
	# Verstecken hält das Zeichnen des Raums an
	v.verstecken()
	_ok(not v.visible, "verstecken: unsichtbar")
	v.free()


## Linker Oberschenkel in der Pose, die der Clip stand zur Uhr `uhr` ohne Überblendung hat.
func _bein_im_stand(v: DarstellungVela3D, uhr: int) -> Quaternion:
	return _bein_im_clip(v, _figur("STAND", uhr))


func _bein_im_clip(v: DarstellungVela3D, f: KernEntitaeten.Figur) -> Quaternion:
	var w: Dictionary = DarstellungVela3DTabelle.wahl(f)
	var a: Animation = v.animationen().get_animation(String(w["clip"]))
	var t: float = DarstellungVela3DTabelle.zeit(w)
	for i: int in a.get_track_count():
		if String(a.track_get_path(i)).ends_with(":mixamorig_LeftUpLeg") and a.track_get_type(i) == Animation.TYPE_ROTATION_3D:
			return a.rotation_track_interpolate(i, t)
	return Quaternion.IDENTITY
