## Test der Vela-Puppe (Auftrag 6, Phase 2): Teile, Farben, Maßstab, Posen, Zuordnung.
## Läuft ohne Fenster:  godot --headless --path godot --script res://tests/alle.gd
## (Einbindung: `var r := VelaTest.lauf()`; r["geprueft"] Zahl der Prüfungen, r["fehler"] Meldungen.)
class_name VelaTest
extends RefCounted

const ORDNER: String = "res://grafik/vela/"
## Höhe der ganzen Figur im Maßstab, Bildpixel bei 2× (Auftrag 5, Abschnitt 1).
const MASSSTAB_HOEHE: int = 142
const HOECHST_FARBEN: int = 64

var _geprueft: int = 0
var _fehler: Array[String] = []


static func lauf() -> Dictionary:
	var t: VelaTest = VelaTest.new()
	t._alles()
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
	var puppe: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	_ok(puppe.geladen, "Puppe geladen: " + puppe.fehler)
	if not puppe.geladen:
		return
	_teile(puppe)
	_posen(puppe)
	_zeiten()
	_zuordnung(puppe)
	_bodenkontakt(puppe)
	puppe.free()


# ---------------------------------------------------------------------------
# Teile: Dateien, Größe, Farben, Maßstab, teile.txt vollständig
# ---------------------------------------------------------------------------

func _teile(puppe: DarstellungVelaPuppe) -> void:
	var text: String = FileAccess.get_file_as_string(ORDNER + "teile.txt")
	_ok(text != "", "teile.txt vorhanden")
	var dateien: Dictionary = {}
	var gelenk_bones: Dictionary = {}
	for zeile: String in text.split("\n"):
		var z: String = zeile.strip_edges()
		if z == "" or z.begins_with("#"):
			continue
		var f: PackedStringArray = z.split(" ", false)
		if f[0] == "datei":
			_gleich(f.size(), 4, "datei-Zeile hat 4 Felder: " + z)
			dateien[f[1]] = Vector2i(int(f[2]), int(f[3]))
		elif f[0] == "gelenk":
			_gleich(f.size(), 9, "gelenk-Zeile hat 9 Felder: " + z)
			gelenk_bones[f[1]] = true
			_ok(dateien.has(f[2]), "Gelenk verweist auf bekanntes Teil: " + z)
			var teil_gr: Vector2i = dateien.get(f[2], Vector2i.ZERO)
			var dreh: Vector2i = Vector2i(int(f[6]), int(f[7]))
			_ok(dreh.x >= 0 and dreh.y >= 0 and dreh.x < teil_gr.x and dreh.y < teil_gr.y, "Drehpunkt liegt im Teilbild: " + z)
			if f[3] != "-":
				_ok(DarstellungVelaPuppe.BONES.has(f[3]), "Elternbone bekannt: " + z)
				var eltern_teil: Vector2i = _eltern_groesse(text, f[3], dateien)
				var an: Vector2i = Vector2i(int(f[4]), int(f[5]))
				_ok(an.x >= 0 and an.y >= 0 and an.x < eltern_teil.x and an.y < eltern_teil.y, "Ansatz liegt im Elternbild: " + z)
	for b: String in DarstellungVelaPuppe.BONES:
		_ok(gelenk_bones.has(b), "teile.txt setzt Gelenk für " + b)
	_ok(dateien.has("massstab"), "Maßstabsfigur in teile.txt")
	# Farben über alle Teilbilder
	var farben: Dictionary = {}
	for n: String in dateien:
		var bild: Image = DarstellungVelaPuppe.lade_png(ORDNER + n + ".png")
		_ok(bild != null and not bild.is_empty(), "Teildatei vorhanden: " + n)
		if bild == null or bild.is_empty():
			continue
		bild.convert(Image.FORMAT_RGBA8)
		var gr: Vector2i = dateien[n]
		_gleich(bild.get_size(), gr, "Größe laut teile.txt: " + n)
		var halb: bool = false
		for y: int in bild.get_height():
			for x: int in bild.get_width():
				var c: Color = bild.get_pixel(x, y)
				if c.a8 != 0 and c.a8 != 255:
					halb = true
				if c.a8 == 255:
					farben[(c.r8 << 16) | (c.g8 << 8) | c.b8] = true
		_ok(not halb, "keine Halbtransparenz: " + n)
		if n == "massstab":
			_gleich(bild.get_height(), MASSSTAB_HOEHE, "Maßstab: ganze Figur 142 px hoch")
			_gleich(_deckende_hoehe(bild), MASSSTAB_HOEHE, "Maßstab: deckende Höhe Sohle bis Scheitel")
	_ok(farben.size() <= HOECHST_FARBEN, "höchstens 64 Farben insgesamt (%d)" % farben.size())
	_ok(farben.size() > 8, "Farben nicht leer (%d)" % farben.size())
	# Puppe hat zu jedem Teil ein Sprite
	for b: String in DarstellungVelaPuppe.BONES:
		_ok(puppe.bones.has(b), "Bone vorhanden: " + b)


func _eltern_groesse(text: String, bone: String, dateien: Dictionary) -> Vector2i:
	for zeile: String in text.split("\n"):
		var f: PackedStringArray = zeile.strip_edges().split(" ", false)
		if f.size() == 9 and f[0] == "gelenk" and f[1] == bone:
			return dateien.get(f[2], Vector2i.ZERO)
	return Vector2i.ZERO


func _deckende_hoehe(bild: Image) -> int:
	var oben: int = bild.get_height()
	var unten: int = -1
	for y: int in bild.get_height():
		for x: int in bild.get_width():
			if bild.get_pixel(x, y).a8 == 255:
				oben = mini(oben, y)
				unten = maxi(unten, y)
	return unten - oben + 1


# ---------------------------------------------------------------------------
# Posen: jede Pose setzt alle Bones
# ---------------------------------------------------------------------------

func _posen(puppe: DarstellungVelaPuppe) -> void:
	for anim: String in DarstellungVelaPosen.animationen():
		var liste: Array = DarstellungVelaPosen.posen(anim)
		_gleich(liste.size(), DarstellungVelaPosen.dauern(anim).size(), "Bildzahl = Zahl der Dauern: " + anim)
		for i: int in liste.size():
			var p: Dictionary = liste[i]
			var w: Dictionary = p["winkel"]
			var name: String = "%s Bild %d" % [anim, i]
			_gleich(w.size(), DarstellungVelaPuppe.BONES.size(), "Pose setzt alle Bones: " + name)
			for b: String in DarstellungVelaPuppe.BONES:
				_ok(w.has(b), "Pose setzt Bone %s: %s" % [b, name])
			for k: String in (p["tausch"] as Dictionary):
				var gueltig: bool = false
				for g: DarstellungVelaPuppe.Gelenk in (puppe.gelenke.get(k, []) as Array):
					if g.teil == (p["tausch"] as Dictionary)[k]:
						gueltig = true
				_ok(gueltig, "Tausch ist ein Teilbild des Bones (%s %s)" % [k, name])
			for k: String in (p["ebenen"] as Dictionary):
				var z: int = (p["ebenen"] as Dictionary)[k]
				_ok(z >= 0 and z < DarstellungVelaPuppe.EBENEN_BREITE, "Ebene im Bereich: %s %s" % [k, name])
			# Puppe übernimmt jeden Winkel
			puppe.setze_pose(p)
			for b: String in DarstellungVelaPuppe.BONES:
				var bone: Bone2D = puppe.bones[b]
				_ok(absf(bone.rotation + deg_to_rad(float(w[b]))) < 1e-5, "Bone %s übernimmt den Winkel: %s" % [b, name])


# ---------------------------------------------------------------------------
# Zeiten: Bilddauern gegen KernWerte, Trefferbild im ersten aktiven Frame
# ---------------------------------------------------------------------------

func _summe(a: Array) -> int:
	var s: int = 0
	for v: int in a:
		s += v
	return s


func _zeiten() -> void:
	_gleich(_summe(DarstellungVelaPosen.dauern("kette1")), KernWerte.LEERSCHLAG_DAUER, "Kette 1 Summe der Dauern = LEERSCHLAG_DAUER")
	_gleich(_summe(DarstellungVelaPosen.dauern("kette2")), KernWerte.KETTE2_LEER_DAUER, "Kette 2 Summe = KETTE2_LEER_DAUER")
	_gleich(_summe(DarstellungVelaPosen.dauern("kette3")), KernWerte.KETTE3_LEER_DAUER, "Kette 3 Summe = KETTE3_LEER_DAUER")
	_gleich(_summe(DarstellungVelaPosen.dauern("kette4")), KernWerte.KETTE4_DAUER, "Kette 4 Summe = KETTE4_DAUER")
	_gleich(DarstellungVelaPosen.dauern("gehen").size(), 12, "Gehen hat 12 Bilder")
	_gleich(_summe(DarstellungVelaPosen.dauern("gehen")), 48, "Gehen: 12 Bilder zu 4 Frames")
	for stufe: int in range(1, 5):
		var anim: String = "kette%d" % stufe
		var von: int = KernWerte.KETTE_AKTIV_VON[stufe - 1]
		var bis: int = KernWerte.KETTE_AKTIV_BIS[stufe - 1]
		var treffer: int = DarstellungVelaPosen.treffer_bild(stufe)
		var posen: Array = DarstellungVelaPosen.posen(anim)
		_gleich(DarstellungVelaPosen.bild_index(anim, von), treffer, "Trefferbild im ersten aktiven Frame: " + anim)
		_ok(DarstellungVelaPosen.pose(anim, von) == posen[treffer], "Pose im ersten aktiven Frame ist das Trefferbild: " + anim)
		_ok(DarstellungVelaPosen.bild_index(anim, von - 1) != treffer, "Trefferbild beginnt erst im ersten aktiven Frame: " + anim)
		for u: int in range(von, bis + 1):
			_gleich(DarstellungVelaPosen.bild_index(anim, u), treffer, "Trefferbild hält in allen aktiven Frames: %s uhr %d" % [anim, u])
		# Treffer: der Arm bzw. das Bein ist gestreckt, also anders als die Standpose
		_ok(posen[treffer]["winkel"] != DarstellungVelaPosen.posen("stand")[0]["winkel"], "Trefferbild unterscheidet sich vom Stand: " + anim)
	var zweites: int = DarstellungVelaPosen.treffer_bild_zweites_fenster()
	for u: int in range(KernWerte.KETTE4_ZWEITES_FENSTER_VON, KernWerte.KETTE4_ZWEITES_FENSTER_BIS + 1):
		_gleich(DarstellungVelaPosen.bild_index("kette4", u), zweites, "Kette 4 zweites Fenster: Trefferbild uhr %d" % u)
	# Schleife des Gehens
	_gleich(DarstellungVelaPosen.bild_index("gehen", 1), 0, "Gehen uhr 1 = Bild 0")
	_gleich(DarstellungVelaPosen.bild_index("gehen", 4), 0, "Gehen uhr 4 = Bild 0")
	_gleich(DarstellungVelaPosen.bild_index("gehen", 5), 1, "Gehen uhr 5 = Bild 1")
	_gleich(DarstellungVelaPosen.bild_index("gehen", 49), 0, "Gehen Schleife: uhr 49 = Bild 0")
	_gleich(DarstellungVelaPosen.bild_index("kette1", 999), 5, "Kette hält das letzte Bild")


# ---------------------------------------------------------------------------
# Zuordnung Aktion/Uhr → Pose: deterministisch, Rückfall, Blick
# ---------------------------------------------------------------------------

func _figur(aktion: String, uhr: int, kombo: int = 0, blick: int = 1) -> KernEntitaeten.Figur:
	var f: KernEntitaeten.Figur = KernEntitaeten.Figur.new()
	f.aktion = aktion
	f.uhr = uhr
	f.kombo = kombo
	f.blick = blick
	return f


func _zuordnung(puppe: DarstellungVelaPuppe) -> void:
	var z: Dictionary = DarstellungVelaPosen.zuordnung(_figur("STAND", 17), null)
	_gleich(z["animation"], "stand", "STAND → stand")
	z = DarstellungVelaPosen.zuordnung(_figur("LAUF", 9), null)
	_gleich(z["animation"], "gehen", "LAUF → gehen")
	_gleich(z["uhr"], 9, "LAUF übernimmt die Uhr")
	for k: int in range(1, 5):
		z = DarstellungVelaPosen.zuordnung(_figur("SCHLAG", KernWerte.KETTE_AKTIV_VON[k - 1], k), null)
		_gleich(z["animation"], "kette%d" % k, "SCHLAG kombo %d → kette%d" % [k, k])
		_gleich(DarstellungVelaPosen.bild_index(z["animation"], z["uhr"]), DarstellungVelaPosen.treffer_bild(k), "SCHLAG kombo %d im ersten aktiven Frame zeigt das Trefferbild" % k)
		z = DarstellungVelaPosen.zuordnung(_figur("LEERSCHLAG", 1, k), null)
		_gleich(z["animation"], "kette%d" % k, "LEERSCHLAG kombo %d → kette%d" % [k, k])
	# Ausfallschritt: die Bilder verschieben sich, das Trefferbild bleibt im ersten aktiven Frame
	for k: int in range(2, 5):
		var f: KernEntitaeten.Figur = _figur("SCHLAG", KernWerte.AUSFALL_AKTIV_VON[k - 1], k)
		f.ausfallschritt = 1
		z = DarstellungVelaPosen.zuordnung(f, null)
		_gleich(DarstellungVelaPosen.bild_index(z["animation"], z["uhr"]), DarstellungVelaPosen.treffer_bild(k), "Ausfallschritt: Trefferbild im ersten aktiven Frame, Kette %d" % k)
	# Rückfall
	for a: String in ["SPRUNG", "GRIFF", "GETROFFEN", "TOT"]:
		z = DarstellungVelaPosen.zuordnung(_figur(a, 5), null)
		_gleich(z["animation"], "stand", "Rückfall auf stand: " + a)
		_ok(not DarstellungVelaPosen.abgedeckt(_figur(a, 5)), "nicht abgedeckt: " + a)
	_ok(DarstellungVelaPosen.abgedeckt(_figur("SCHLAG", 1, 1)), "SCHLAG abgedeckt")
	# deterministisch: gleiche Eingabe, gleiche Pose
	for anim: String in DarstellungVelaPosen.animationen():
		for u: int in range(1, 60):
			_ok(DarstellungVelaPosen.pose(anim, u) == DarstellungVelaPosen.pose(anim, u), "Pose deterministisch: %s uhr %d" % [anim, u])
	var p1: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	var p2: DarstellungVelaPuppe = DarstellungVelaPuppe.new()
	for anim: String in DarstellungVelaPosen.animationen():
		for u: int in [1, 2, 3, 4, 7, 17, 20, 30]:
			p1.aus_animation(anim, u, 1)
			p2.aus_animation("stand", 1, -1)
			p2.aus_animation(anim, u, 1)
			var gleich: bool = true
			for b: String in DarstellungVelaPuppe.BONES:
				gleich = gleich and p1.bone_ort(b) == p2.bone_ort(b) and p1.bone_drehung(b) == p2.bone_drehung(b)
			_ok(gleich, "Puppe deterministisch (unabhängig von der Vorgeschichte): %s uhr %d" % [anim, u])
	# Blick links spiegelt, rechts nicht
	var f1: KernEntitaeten.Figur = _figur("LAUF", 5, 0, -1)
	p1.aus_figur(f1, null)
	_ok(p1.scale.x < 0.0, "Blick links spiegelt die Puppe")
	f1.blick = 1
	p1.aus_figur(f1, null)
	_ok(p1.scale.x > 0.0, "Blick rechts spiegelt nicht")
	_gleich(p1.animation_name(), "gehen", "aus_figur setzt die Animation")
	_gleich(p1.animation_uhr(), 5, "aus_figur setzt die Uhr")
	# aus_figur ändert die Figur nicht
	var f2: KernEntitaeten.Figur = _figur("SCHLAG", 3, 2)
	p1.aus_figur(f2, null)
	_gleich([f2.aktion, f2.uhr, f2.kombo, f2.blick], ["SCHLAG", 3, 2, 1], "aus_figur liest den Kern nur")
	p1.free()
	p2.free()


# ---------------------------------------------------------------------------
# Bodenkontakt: Sohle des tiefsten Fußes auf y = 0
# ---------------------------------------------------------------------------

func _bodenkontakt(puppe: DarstellungVelaPuppe) -> void:
	for anim: String in DarstellungVelaPosen.animationen():
		var liste: Array = DarstellungVelaPosen.posen(anim)
		for i: int in liste.size():
			puppe.setze_pose(liste[i])
			_ok(absf(puppe.sohle_y()) < 0.01, "Sohle auf y = 0: %s Bild %d (%.3f)" % [anim, i, puppe.sohle_y()])
			var r: Rect2 = puppe.umriss()
			_ok(r.size.y <= 160.0 and r.size.y >= 60.0, "Höhe der Puppe plausibel: %s Bild %d (%.0f)" % [anim, i, r.size.y])
