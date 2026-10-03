extends SceneTree
## Umsetzer für das Teileblatt von Vela (Auftrag 6, Phase 2; Auftrag 5, 2c).
##
## Schneidet die Körperteile aus `spiel/grafik/quelle/fremd/vela/vela_t_teile.png`,
## stellt sie frei, skaliert sie auf den Maßstab der ganzen Figur (142 Bildpixel
## von der Sohle bis zum Scheitel bei 2×), quantisiert alle Teile gemeinsam auf
## höchstens 64 Farben (Medianschnitt, Vorlage `spiel/grafik/quelle/medianschnitt.ts`)
## und schreibt `godot/grafik/vela/<teil>.png` und `teile.txt`.
##
## Aufruf (Repo-Wurzel):
##   godot --headless --path godot --script res://werkzeuge/umsetzer.gd
##   Optionen nach `--`: --quelle <png> --aus <ordner> --roh <ordner> (Teile vor der
##   Palette zur Sichtprüfung) --filter box|nearest
##
## Nur Image-Klasse, keine Fremdbibliothek.

const QUELLE := "spiel/grafik/quelle/fremd/vela/vela_t_teile.png"
const AUS := "godot/grafik/vela"
## Zielhöhe der ganzen Figur in Bildpixeln (Sohle bis höchster Punkt des Kopfes, bei 2×).
const ZIELHOEHE := 142
## Farbbudget der Figur (Auftrag 5, Abschnitt 1).
const HOECHST_FARBEN := 64
## Abstand (größter Kanalunterschied) zur Hintergrundfarbe, ab dem ein Pixel Figur ist.
## Der Grund des Blattes ist einfarbig (24 bis 25, 26 bis 27, 28 bis 31) mit Rauschen
## von höchstens 4; gemessen am Blatt (Bericht, Abschnitt Freistellen).
const TOLERANZ := 6
## Bereiche unter dieser Pixelzahl sind Staub (Kompressionsblöcke im Grund) und fallen weg.
const MINDEST_FLAECHE := 400

## Teile des Blattes: Name, Suchrechteck in Quellpixeln (die Bereiche liegen ganz darin).
## Die Rechtecke sind die Zellen des Blattes nach Sichtprüfung.
const ZELLEN: Array = [
	["kopf", Rect2i(100, 50, 280, 320)],
	["zopf", Rect2i(380, 50, 450, 440)],
	["rumpf", Rect2i(90, 390, 300, 420)],
	["becken", Rect2i(420, 500, 300, 280)],
	["aermel_gestreckt", Rect2i(60, 820, 180, 400)],
	["aermel_angewinkelt", Rect2i(250, 820, 200, 420)],
	["faust", Rect2i(470, 820, 200, 170)],
	["hand_offen", Rect2i(480, 1000, 200, 240)],
	["bein_a", Rect2i(110, 1270, 190, 380)],
	["bein_b", Rect2i(420, 1260, 160, 430)],
	["stiefel_seite", Rect2i(110, 1720, 260, 220)],
	["stiefel_vorn", Rect2i(420, 1700, 160, 270)],
	["ganz", Rect2i(770, 390, 540, 1240)],
]


func _init() -> void:
	var arg := _argumente()
	var wurzel := ProjectSettings.globalize_path("res://").path_join("..").simplify_path()
	var quelle: String = arg.get("quelle", wurzel.path_join(QUELLE))
	var aus: String = arg.get("aus", wurzel.path_join(AUS))
	var filter: String = arg.get("filter", "box")
	var roh_ordner: String = arg.get("roh", "")
	var bild := Image.load_from_file(quelle)
	if bild == null or bild.is_empty():
		push_error("Quelle nicht lesbar: " + quelle)
		quit(1)
		return
	bild.convert(Image.FORMAT_RGBA8)
	print("Quelle ", quelle, " ", bild.get_width(), " x ", bild.get_height())
	var zellen := ausschneiden(bild, filter)
	var teile := zerlegen(zellen)
	if roh_ordner != "":
		DirAccess.make_dir_recursive_absolute(roh_ordner)
		for n in teile:
			(teile[n] as Image).save_png(roh_ordner.path_join(n + ".png"))
	var ergebnis := palette_anwenden(teile)
	DirAccess.make_dir_recursive_absolute(aus)
	for n in teile:
		(teile[n] as Image).save_png(aus.path_join(n + ".png"))
	var text := teile_text(teile, ergebnis)
	var f := FileAccess.open(aus.path_join("teile.txt"), FileAccess.WRITE)
	f.store_string(text)
	f.close()
	print("Teile: ", teile.size(), ", Farben: ", ergebnis["farben"], " (Quelle ", ergebnis["quellfarben"], "), mittlerer Abstand ", snappedf(ergebnis["mittel"], 0.01), ", größter ", snappedf(ergebnis["groesst"], 0.1))
	quit(0)


func _argumente() -> Dictionary:
	var aus := {}
	var a := OS.get_cmdline_user_args()
	var i := 0
	while i < a.size():
		if a[i].begins_with("--") and i + 1 < a.size():
			aus[a[i].substr(2)] = a[i + 1]
			i += 2
		else:
			i += 1
	return aus


## Mittlere Farbe der vier Ecken (8 × 8) als Hintergrund.
static func hintergrund(bild: Image) -> Vector3i:
	var w := bild.get_width()
	var h := bild.get_height()
	var s := Vector3.ZERO
	var n := 0
	for ecke in [Vector2i(0, 0), Vector2i(w - 8, 0), Vector2i(0, h - 8), Vector2i(w - 8, h - 8)]:
		for y in 8:
			for x in 8:
				var c := bild.get_pixel(ecke.x + x, ecke.y + y)
				s += Vector3(c.r8, c.g8, c.b8)
				n += 1
	return Vector3i(roundi(s.x / n), roundi(s.y / n), roundi(s.z / n))


## Freistellmaske: 1 = Figur. Figur ist, was vom Hintergrund abweicht (größter
## Kanalunterschied über der Toleranz) oder vom Rand aus nicht erreichbar ist
## (dunkle Flächen im Inneren wie Hose und Top bleiben so ohne Löcher). Staub fällt weg.
static func freistellen(bild: Image) -> PackedByteArray:
	var w := bild.get_width()
	var h := bild.get_height()
	var d := bild.get_data()
	var bg := hintergrund(bild)
	var abw := PackedByteArray()
	abw.resize(w * h)
	for p in w * h:
		var i := p * 4
		var m := maxi(maxi(absi(d[i] - bg.x), absi(d[i + 1] - bg.y)), absi(d[i + 2] - bg.z))
		abw[p] = 1 if m > TOLERANZ else 0
	# Außenraum: Flutfüllung vom Rand über Nicht-Figur (4er-Nachbarschaft, damit
	# schmale Diagonalen der Kontur nicht durchlässig sind)
	var aussen := PackedByteArray()
	aussen.resize(w * h)
	var stapel: Array[int] = []
	for x in w:
		for y in [0, h - 1]:
			var p: int = y * w + x
			if abw[p] == 0 and aussen[p] == 0:
				aussen[p] = 1
				stapel.append(p)
	for y in h:
		for x in [0, w - 1]:
			var p: int = y * w + x
			if abw[p] == 0 and aussen[p] == 0:
				aussen[p] = 1
				stapel.append(p)
	while not stapel.is_empty():
		var p: int = stapel.pop_back()
		var px := p % w
		var py := p / w
		for n in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nx: int = px + n.x
			var ny: int = py + n.y
			if nx < 0 or ny < 0 or nx >= w or ny >= h:
				continue
			var q: int = ny * w + nx
			if aussen[q] == 0 and abw[q] == 0:
				aussen[q] = 1
				stapel.append(q)
	var maske := PackedByteArray()
	maske.resize(w * h)
	for p in w * h:
		maske[p] = 1 if aussen[p] == 0 else 0
	# Staub entfernen (Bereiche unter MINDEST_FLAECHE, 8er-Nachbarschaft)
	var marke := PackedByteArray()
	marke.resize(w * h)
	for s in w * h:
		if maske[s] == 0 or marke[s] != 0:
			continue
		var liste: Array[int] = [s]
		marke[s] = 1
		var i := 0
		while i < liste.size():
			var p: int = liste[i]
			i += 1
			var px := p % w
			var py := p / w
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var nx := px + dx
					var ny := py + dy
					if nx < 0 or ny < 0 or nx >= w or ny >= h:
						continue
					var q := ny * w + nx
					if maske[q] == 1 and marke[q] == 0:
						marke[q] = 1
						liste.append(q)
		if liste.size() < MINDEST_FLAECHE:
			for p in liste:
				maske[p] = 0
	return maske


## Schneidet alle Teile aus, stellt sie frei und skaliert sie. Gibt Name → Image (RGBA8, gleicher Maßstab) zurück.
func ausschneiden(bild: Image, filter: String) -> Dictionary:
	var w := bild.get_width()
	var maske := freistellen(bild)
	# Umschließendes Rechteck der Figur je Zelle (nur Maskenpixel der Zelle)
	var rechtecke := {}
	for z in ZELLEN:
		var r: Rect2i = z[1]
		var x0 := 1 << 30
		var y0 := 1 << 30
		var x1 := -1
		var y1 := -1
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				if maske[y * w + x] == 1:
					x0 = mini(x0, x)
					y0 = mini(y0, y)
					x1 = maxi(x1, x)
					y1 = maxi(y1, y)
		if x1 < 0:
			push_error("Zelle leer: " + z[0])
			continue
		rechtecke[z[0]] = Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
	var ganz: Rect2i = rechtecke["ganz"]
	var faktor := float(ZIELHOEHE) / float(ganz.size.y)
	print("Maßstab: ganze Figur ", ganz.size, " Quellpixel -> Faktor ", faktor)
	var aus := {}
	for z in ZELLEN:
		var name: String = z[0]
		var r: Rect2i = rechtecke[name]
		var zelle: Rect2i = z[1]
		var ziel_b := maxi(1, roundi(r.size.x * faktor))
		var ziel_h := maxi(1, roundi(r.size.y * faktor))
		if name == "ganz":
			ziel_h = ZIELHOEHE
		aus[name] = skalieren(bild, maske, w, r, zelle, ziel_b, ziel_h, filter)
		print("  ", name, " ", r.size, " -> ", ziel_b, " x ", ziel_h)
	return aus


## Verkleinert den Bereich r. Maske nur innerhalb der Zelle. box: Flächenmittel der
## Figurpixel (Deckung >= 1/2 deckend), nearest: Mittelpunktprobe.
static func skalieren(bild: Image, maske: PackedByteArray, w: int, r: Rect2i, zelle: Rect2i, zb: int, zh: int, filter: String) -> Image:
	var d := bild.get_data()
	var aus := Image.create(zb, zh, false, Image.FORMAT_RGBA8)
	var sx := float(r.size.x) / zb
	var sy := float(r.size.y) / zh
	for j in zh:
		for i in zb:
			var xa := r.position.x + i * sx
			var xb := xa + sx
			var ya := r.position.y + j * sy
			var yb := ya + sy
			if filter == "nearest":
				var px := clampi(int((xa + xb) * 0.5), r.position.x, r.end.x - 1)
				var py := clampi(int((ya + yb) * 0.5), r.position.y, r.end.y - 1)
				if maske[py * w + px] == 1 and zelle.has_point(Vector2i(px, py)):
					var k := (py * w + px) * 4
					aus.set_pixel(i, j, Color8(d[k], d[k + 1], d[k + 2]))
				continue
			var sr := 0.0
			var sg := 0.0
			var sb := 0.0
			var sum_w := 0.0
			var flaeche := 0.0
			for py in range(int(floorf(ya)), int(ceilf(yb))):
				var hy := minf(yb, py + 1.0) - maxf(ya, float(py))
				for px in range(int(floorf(xa)), int(ceilf(xb))):
					var hx := minf(xb, px + 1.0) - maxf(xa, float(px))
					var gew := hx * hy
					flaeche += gew
					if px < zelle.position.x or py < zelle.position.y or px >= zelle.end.x or py >= zelle.end.y:
						continue
					if maske[py * w + px] == 1:
						var k := (py * w + px) * 4
						sr += d[k] * gew
						sg += d[k + 1] * gew
						sb += d[k + 2] * gew
						sum_w += gew
			if sum_w >= flaeche * 0.5 and sum_w > 0.0:
				aus.set_pixel(i, j, Color8(roundi(sr / sum_w), roundi(sg / sum_w), roundi(sb / sum_w)))
	return aus


# ===========================================================================
# Zerlegen: Gelenke an Ärmeln und Beinen, Gelenktabelle
# ===========================================================================

## Teile der Puppe: Name, Zelle des Blattes, erste und letzte Zeile (exklusiv, -1 = Ende).
## Ärmel und Beine werden an Ellbogen und Knie geschnitten, beide Hälften überlappen
## um einige Zeilen (Unterarm und Unterschenkel liegen hinter Oberarm und Oberschenkel,
## dort liegen dieselben Pixel wie im Blatt; beim Beugen füllt der überlappte Teil die Lücke).
const TEILE: Array = [
	["kopf", "kopf", 0, -1],
	["zopf", "zopf", 0, -1],
	["rumpf", "rumpf", 0, -1],
	["becken", "becken", 0, -1],
	["oberarm", "aermel_gestreckt", 0, 26],
	["unterarm", "aermel_gestreckt", 19, -1],
	["faust", "faust", 0, -1],
	["hand_offen", "hand_offen", 0, -1],
	["oberschenkel", "bein_a", 0, 27],
	["unterschenkel", "bein_b", 18, -1],
	["stiefel_seite", "stiefel_seite", 0, -1],
	["stiefel_vorn", "stiefel_vorn", 0, -1],
	["massstab", "ganz", 0, -1],
]

## Gelenke je Bone und Teilbild: Teil (Name der Bilddatei ohne .png), Bone, Eltern-Bone,
## Ansatz = Gelenk am Elternteil in Koordinaten des Elternbildes, Drehpunkt in Koordinaten
## des eigenen Bildes, Ruhedrehung des Bildes in Grad (Godot, im Uhrzeigersinn positiv;
## sie dreht das Bild um den Drehpunkt, damit das Glied in Ruhe nach unten zeigt).
## Von Hand nach dem Bild gesetzt und am zusammengesetzten Stand geprüft.
## Spalten: teil, bone, eltern, ansatz_x, ansatz_y, dreh_x, dreh_y, ruhe
const GELENKE: Array = [
	["becken", "Becken", "-", 0, 0, 15, 4, 0],
	["rumpf", "Rumpf", "Becken", 15, 4, 16, 40, 0],
	["kopf", "Kopf", "Rumpf", 17, 5, 12, 29, 0],
	["zopf", "Zopf", "Kopf", 2, 5, -1, -1, 0],
	["oberarm", "OberarmV", "Rumpf", 30, 13, 9, 5, 0],
	["oberarm", "OberarmH", "Rumpf", 5, 14, 9, 5, 0],
	["unterarm", "UnterarmV", "OberarmV", 8, 24, 8, 5, 0],
	["unterarm", "UnterarmH", "OberarmH", 8, 24, 8, 5, 0],
	["faust", "HandV", "UnterarmV", 13, 22, 3, 8, 90],
	["faust", "HandH", "UnterarmH", 13, 22, 3, 8, 90],
	["hand_offen", "HandV", "UnterarmV", 13, 22, 10, 21, 180],
	["hand_offen", "HandH", "UnterarmH", 13, 22, 10, 21, 180],
	["oberschenkel", "OberschenkelV", "Becken", 20, 14, 9, 5, 0],
	["oberschenkel", "OberschenkelH", "Becken", 10, 14, 9, 5, 0],
	["unterschenkel", "UnterschenkelV", "OberschenkelV", 9, 23, 8, 5, 0],
	["unterschenkel", "UnterschenkelH", "OberschenkelH", 9, 23, 8, 5, 0],
	["stiefel_seite", "FussV", "UnterschenkelV", 8, 26, 7, 5, 0],
	["stiefel_seite", "FussH", "UnterschenkelH", 8, 26, 7, 5, 0],
	["stiefel_vorn", "FussV", "UnterschenkelV", 8, 26, 7, 5, 0],
	["stiefel_vorn", "FussH", "UnterschenkelH", 8, 26, 7, 5, 0],
]


## Schneidet die Teile aus den Zellen (Zeilenbereiche) und gibt Name → Image zurück.
static func zerlegen(zellen: Dictionary) -> Dictionary:
	var aus := {}
	for t in TEILE:
		var z: Image = zellen[t[1]]
		var y0: int = t[2]
		var y1: int = t[3] if t[3] >= 0 else z.get_height()
		aus[t[0]] = z.get_region(Rect2i(0, y0, z.get_width(), y1 - y0))
	# Oberschenkel unten abrunden (Knie), damit der gerade Schnitt beim Beugen nicht als Kante auffällt
	abrunden_unten(aus["oberschenkel"], 9)
	return aus


## Rundet die unteren Ecken eines Teilbildes mit einer Halbellipse (Höhe ry) ab; die neue Kante
## bekommt die dunkelste Farbe des Bildes als Kontur.
static func abrunden_unten(bild: Image, ry: int) -> void:
	var w := bild.get_width()
	var h := bild.get_height()
	var dunkel := Color(0, 0, 0, 1)
	var dl := 1e9
	for y in h:
		for x in w:
			var c := bild.get_pixel(x, y)
			if c.a > 0.5 and c.get_luminance() < dl:
				dl = c.get_luminance()
				dunkel = c
	var mitte_y := h - 1 - ry
	var entfernt: Array[Vector2i] = []
	for y in range(mitte_y, h):
		for x in w:
			var nx := (x + 0.5 - w / 2.0) / (w / 2.0)
			var ny := (y + 0.5 - mitte_y) / float(ry + 1)
			if nx * nx + ny * ny > 1.0:
				entfernt.append(Vector2i(x, y))
	for p in entfernt:
		bild.set_pixelv(p, Color(0, 0, 0, 0))
	for y in range(mitte_y, h):
		for x in w:
			if bild.get_pixel(x, y).a < 0.5:
				continue
			for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var q: Vector2i = Vector2i(x, y) + d
				if q.x < 0 or q.x >= w or q.y >= h or bild.get_pixelv(q).a < 0.5:
					bild.set_pixel(x, y, dunkel)
					break


## Mittelpunkt der blauen Haarbandpixel (Blau über Rot) im Bild, sonst (-1, -1).
static func haarband(bild: Image) -> Vector2i:
	var sx := 0
	var sy := 0
	var n := 0
	for y in bild.get_height():
		for x in bild.get_width():
			var c := bild.get_pixel(x, y)
			if c.a > 0.5 and c.b8 > c.r8 + 20 and c.b8 > c.g8 + 10:
				sx += x
				sy += y
				n += 1
	if n == 0:
		return Vector2i(-1, -1)
	return Vector2i(roundi(float(sx) / n), roundi(float(sy) / n))


# ===========================================================================
# Palette: Medianschnitt über alle Teile gemeinsam
# (Vorlage spiel/grafik/quelle/medianschnitt.ts)
# ===========================================================================

## Gewichte der Kanäle beim Teilen (Mittel der redmean-Gewichte).
const GEWICHT: Array = [2.0, 4.0, 3.0]


static func farbe_kanaele(k: int) -> Array:
	return [(k >> 16) & 255, (k >> 8) & 255, k & 255]


## Abstand wie `farbAbstand` in `farbe.ts` (redmean).
static func farb_abstand(a: int, b: int) -> float:
	var ka := farbe_kanaele(a)
	var kb := farbe_kanaele(b)
	var rm: float = (ka[0] + kb[0]) / 2.0
	var dr: float = ka[0] - kb[0]
	var dg: float = ka[1] - kb[1]
	var db: float = ka[2] - kb[2]
	return sqrt((2.0 + rm / 256.0) * dr * dr + 4.0 * dg * dg + (2.0 + (255.0 - rm) / 256.0) * db * db)


static func naechste_farbe(p: int, palette: Array) -> int:
	var beste := 0
	var bester := INF
	for i in palette.size():
		var d := farb_abstand(p, palette[i])
		if d < bester:
			bester = d
			beste = i
	return beste


## Eine Kiste: Indizes in die Farbliste, Mittel, Gewicht, Fehler je Achse.
static func kiste(glieder: Array, kan: Array, n: Array) -> Dictionary:
	var w := 0.0
	var s := [0.0, 0.0, 0.0]
	for i in glieder:
		var z: float = n[i]
		w += z
		for a in 3:
			s[a] += z * kan[i][a]
	var mittel := [s[0] / w, s[1] / w, s[2] / w]
	var fehler := [0.0, 0.0, 0.0]
	for i in glieder:
		var z: float = n[i]
		for a in 3:
			var d: float = kan[i][a] - mittel[a]
			fehler[a] += z * d * d * GEWICHT[a]
	return {"glieder": glieder, "mittel": mittel, "gewicht": w, "fehler": fehler}


static func staerkste_achse(k: Dictionary) -> int:
	var beste := 0
	for a in range(1, 3):
		if k["fehler"][a] > k["fehler"][beste]:
			beste = a
	return beste


static func als_farbe(m: Array) -> int:
	return (roundi(m[0]) << 16) | (roundi(m[1]) << 8) | roundi(m[2])


## Medianschnitt: Häufigkeit Farbe → Pixelzahl, höchstens `hoechst` Farben, `runden` Runden Nachschärfen.
## Gibt die Palette (nach Helligkeit aufsteigend) zurück.
static func medianschnitt(haeufig: Dictionary, hoechst: int, runden: int = 2) -> Array:
	var farben: Array = haeufig.keys()
	farben.sort()
	if farben.is_empty():
		return []
	var kan: Array = []
	var n: Array = []
	for f in farben:
		kan.append(farbe_kanaele(f))
		n.append(haeufig[f])
	var alle: Array = range(farben.size())
	var kisten: Array = [kiste(alle, kan, n)]
	while kisten.size() < hoechst:
		var wahl := -1
		var groesst := -1.0
		for i in kisten.size():
			var k: Dictionary = kisten[i]
			if k["glieder"].size() < 2:
				continue
			var fe: float = k["fehler"][staerkste_achse(k)]
			if fe > groesst:
				groesst = fe
				wahl = i
		if wahl < 0:
			break
		var k: Dictionary = kisten[wahl]
		var a := staerkste_achse(k)
		var sortiert: Array = k["glieder"].duplicate()
		sortiert.sort_custom(func(i: int, j: int) -> bool:
			if kan[i][a] != kan[j][a]:
				return kan[i][a] < kan[j][a]
			return farben[i] < farben[j])
		var summe := 0.0
		var schnitt := 1
		for i in sortiert.size() - 1:
			summe += n[sortiert[i]]
			schnitt = i + 1
			if 2.0 * summe >= k["gewicht"]:
				break
		var links := kiste(sortiert.slice(0, schnitt), kan, n)
		var rechts := kiste(sortiert.slice(schnitt), kan, n)
		kisten = kisten.slice(0, wahl) + [links, rechts] + kisten.slice(wahl + 1)
	var palette: Array = []
	for k in kisten:
		palette.append(als_farbe(k["mittel"]))
	for r in runden:
		var summen: Array = []
		for p in palette:
			summen.append([0.0, 0.0, 0.0, 0.0])
		for i in farben.size():
			var s: Array = summen[naechste_farbe(farben[i], palette)]
			var z: float = n[i]
			for a in 3:
				s[a] += z * kan[i][a]
			s[3] += z
		for i in palette.size():
			var s: Array = summen[i]
			if s[3] > 0.0:
				palette[i] = als_farbe([s[0] / s[3], s[1] / s[3], s[2] / s[3]])
	# Doppelte entfernen, nach Helligkeit ordnen
	var einmalig: Dictionary = {}
	for p in palette:
		einmalig[p] = true
	palette = einmalig.keys()
	palette.sort_custom(func(a: int, b: int) -> bool:
		var ha := helligkeit(a)
		var hb := helligkeit(b)
		if ha != hb:
			return ha < hb
		return a < b)
	return palette


static func helligkeit(p: int) -> float:
	var c := farbe_kanaele(p)
	return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


## Zählt die Farben aller Teile, wendet den Medianschnitt an (nur wenn mehr als HOECHST_FARBEN
## Farben vorkommen) und ersetzt jede Farbe durch die nächste Palettenfarbe. Gibt Kennzahlen zurück.
static func palette_anwenden(teile: Dictionary) -> Dictionary:
	var haeufig: Dictionary = {}
	for n in teile:
		var b: Image = teile[n]
		for y in b.get_height():
			for x in b.get_width():
				var c := b.get_pixel(x, y)
				if c.a < 0.5:
					continue
				var k := (c.r8 << 16) | (c.g8 << 8) | c.b8
				haeufig[k] = haeufig.get(k, 0) + 1
	var quellfarben := haeufig.size()
	if quellfarben <= HOECHST_FARBEN:
		return {"farben": quellfarben, "quellfarben": quellfarben, "mittel": 0.0, "groesst": 0.0, "palette": haeufig.keys()}
	var palette := medianschnitt(haeufig, HOECHST_FARBEN)
	var abbildung: Dictionary = {}
	var summe := 0.0
	var pixel := 0
	var groesst := 0.0
	for f in haeufig:
		var j := naechste_farbe(f, palette)
		abbildung[f] = palette[j]
		var d := farb_abstand(f, palette[j])
		summe += d * haeufig[f]
		pixel += haeufig[f]
		groesst = maxf(groesst, d)
	for n in teile:
		var b: Image = teile[n]
		for y in b.get_height():
			for x in b.get_width():
				var c := b.get_pixel(x, y)
				if c.a < 0.5:
					b.set_pixel(x, y, Color(0, 0, 0, 0))
					continue
				var p: int = abbildung[(c.r8 << 16) | (c.g8 << 8) | c.b8]
				b.set_pixel(x, y, Color8((p >> 16) & 255, (p >> 8) & 255, p & 255))
	return {"farben": palette.size(), "quellfarben": quellfarben, "mittel": summe / pixel, "groesst": groesst, "palette": palette}


# ===========================================================================
# teile.txt
# ===========================================================================

static func teile_text(teile: Dictionary, ergebnis: Dictionary) -> String:
	var z: PackedStringArray = []
	z.append("# Teile von Vela (erzeugt von werkzeuge/umsetzer.gd, nicht von Hand ändern)")
	z.append("# Quelle: spiel/grafik/quelle/fremd/vela/vela_t_teile.png, Maßstab: ganze Figur 142 Bildpixel hoch (2x)")
	z.append("# Farben insgesamt: %d (Quellfarben %d, Medianschnitt, höchstens %d)" % [ergebnis["farben"], ergebnis["quellfarben"], HOECHST_FARBEN])
	z.append("# Koordinaten in Pixeln des jeweiligen Teilbildes, Ursprung oben links.")
	z.append("# datei  <name> <breite> <hoehe>")
	z.append("# gelenk <bone> <datei> <eltern-bone> <ansatz_x> <ansatz_y> <dreh_x> <dreh_y> <ruhe_grad>")
	z.append("#   ansatz = Gelenk am Elternteil (Koordinaten des Elternbildes, das zuerst für den Bone genannt ist)")
	z.append("#   dreh   = Drehpunkt im eigenen Bild (liegt auf dem Gelenk), ruhe = Ruhedrehung des Bildes um dreh")
	var namen: Array = []
	for t in TEILE:
		namen.append(t[0])
	for n in namen:
		var b: Image = teile[n]
		z.append("datei %s %d %d" % [n, b.get_width(), b.get_height()])
	for g in GELENKE:
		var dx: int = g[5]
		var dy: int = g[6]
		if dx < 0:
			var hb := haarband(teile[g[0]])
			dx = hb.x
			dy = hb.y
		z.append("gelenk %s %s %s %d %d %d %d %d" % [g[1], g[0], g[2], g[3], g[4], dx, dy, g[7]])
	return "\n".join(z) + "\n"
