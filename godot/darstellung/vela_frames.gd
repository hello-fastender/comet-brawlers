## Vela aus den Bildfolgen der Video-Clips (Weg „Vela als Video“): ein Sprite, das je Tick genau ein Bild
## des Clips zeigt. Die Bilder und clip.txt stammen aus `res://grafik/vela_video/<clip>/` (erzeugt von
## werkzeuge/video_umsetzer.gd); geladen wird per Dateizugriff, ohne Editor-Import, kein Überblenden.
## Zwei Arten von Clips, die im Spiel gemischt vorkommen dürfen:
##   Pixel-Clip (Standard): Pixelkunst, 142 Basispixel hohe Figur, höchstens 64 Farben, harte Kante, PNG mit Palette;
##     Texturfilter NEAREST, Sprite im Maßstab ASSET_ZU_BILD (ganzzahlig, scharf).
##   HD-Clip (clip.txt `weich=1`, Umsetzer `--hd`): gemalter Look, RGBA 8 Bit mit weicher Kante, verlustfreies WebP
##     oder PNG, Figur z. B. 360 Dateipixel hoch; Texturfilter LINEAR (ohne Mipmaps: schärfer), Sprite im Maßstab
##     `skala` · ASSET_ZU_BILD (`skala` = Basispixel je Dateipixel, z. B. 142 / 360).
##
## Basispixel: Die Clips (Pixel wie HD) sind für ein Bild von 768 × 448 vermessen (DarstellungMasse.ASSET_BASIS = 2 Bildpixel
## je Spielpixel, E25); clip.txt (Größe, Anker, Schrittlänge, Skala) bleibt in diesen Einheiten gültig. Das Spielbild hat
## DARSTELLUNG Bildpixel je Spielpixel (E28: 4), der Sprite wird um ASSET_ZU_BILD = DARSTELLUNG / ASSET_BASIS vergrößert.
##
## Ursprung des Nodes = Fußpunkt in Bildpixeln (wie bei der Puppe; Spiegelachse in der Mitte der Fußspalte,
## die Hauptsitzung setzt `position` aus DarstellungZeichnen.figurFuss(welt) + DARSTELLUNG / 2 Bildpixel nach rechts).
## Der Anker aus clip.txt (Mitte der Füße, Bodenlinie) wird abgezogen. Blick links: scale.x = −1.
##
## Welche Aktion mit welchem Clip gezeigt wird und welches Bild zur Aktionsuhr gehört, steht in
## DarstellungVelaFramesTabelle (reine Funktionen). Der Node liest die Welt nur.
##
## Arbeitsspeicher (E27, Teil A): Je Bild hält der Speicher nur die Textur, nicht das Image (Bilder für Tests und
## Werkzeuge liest `bild_aus_datei` bei Bedarf neu aus der Datei, verlustfrei, also pixelgleich). Die Textur wird auf
## den sichtbaren Teil des Bildes zugeschnitten (`Image.get_used_rect()` plus 1 Pixel Rand; der Rest ist Alpha 0), der
## Versatz steht in `bild_versatz`. Clips werden nach Bedarf geladen:
##   - Modus `nachladen` aus (Standard; Tests und Werkzeuge): `clip_laden` und `abgedeckt` laden den Clip sofort ganz.
##   - Modus `nachladen` an (Spiel, `spiel.gd`): `abgedeckt` lädt nie; ein noch nicht geladener Clip gilt als nicht
##     abgedeckt (die Darstellung zeigt Puppe oder Platzhalter, ohne Flackern: die Quelle wechselt einmal, sobald der Clip
##     bereit ist) und wird vorgemerkt. `vorausladen_schritt` lädt im Leerlauf Häppchen: zuerst die vorgemerkten Clips,
##     dann VORAUS_REIHE, nie mehr als ein Zeitbudget je Aufruf (mindestens ein Bild).
##   - Speicherbudget `SPEICHER_BUDGET_MB`: Wird es durch einen angeforderten Clip überschritten, entlädt die Klasse die am
##     längsten nicht benutzten Clips ganz (LRU). Der gerade gezeigte Clip und die schutz_zuletzt zuletzt benutzten bleiben.
##     Das Vorausladen entlädt nie, es hört beim Budget auf.
class_name DarstellungVelaFrames
extends Node2D

const ORDNER: String = "res://grafik/vela_video/"

## Vergrößerung der Clips gegenüber ihrer Vermessung (DarstellungMasse.ASSET_ZU_BILD: E28, 4 / 2 = 2).
const ASSET_ZU_BILD: int = DarstellungMasse.ASSET_ZU_BILD

## Obergrenze des Texturspeichers aller geladenen Clips in MB (4 Byte je Pixel). Alle fünfzehn gemalten Vela-Clips brauchen
## nach dem Zuschnitt rund 209 MB (docs/godot.md, „Speicher“, Stand 2026-10-08); die Obergrenze lässt sie alle zugleich
## im Speicher, damit nie ein Clip mitten im Spiel fehlt (Rückfall auf die Puppe wäre ein sichtbarer Stilbruch). Für weitere
## Figuren reicht das nicht: dort müssen Texturen komprimiert oder nur die Clips der Bühne geladen werden.
const SPEICHER_BUDGET_MB: int = 256
## Zeitbudget (µs) eines Aufrufs von vorausladen_schritt im Leerlauf und bei vorgemerkten Clips.
const VORAUS_LEERLAUF_US: int = 3000
const VORAUS_BEDARF_US: int = 6000
## Reihenfolge des Vorausladens (wahrscheinlichste Clips zuerst).
const VORAUS_REIHE: Array[String] = [
	"stand", "gehen", "kette1", "sprint", "sprung", "sprungtritt", "kette2", "kette3", "kette4",
	"getroffen_vorn", "umgeworfen", "liegen", "aufstehen", "griff", "wurf",
]

## Geladene Clips: Name → {"daten": Dictionary, "ordner": String, "texturen": Array[Texture2D] (null = noch nicht
## geladen), "versatz": Array[Vector2] (linke obere Ecke der zugeschnittenen Textur im Dateibild), "bytes": int,
## "geladen": int (Zahl geladener Bilder), "bereit": bool (alle Bilder geladen), "benutzt": int (Zähler der letzten Benutzung)}.
## Clips ohne brauchbare Dateien stehen in _fehlt.
static var _clips: Dictionary = {}
static var _daten: Dictionary = {}
static var _ordner: Dictionary = {}
static var _fehlt: Dictionary = {}
static var _alias: Dictionary = {}
static var _vorgemerkt: Array[String] = []
static var _benutzt_zaehler: int = 0
static var _gezeigt: String = ""
## Ladestatistik (Messung): Clip → {"bilder": int, "us": int, "max_us": int}
static var ladezeiten: Dictionary = {}

## Modus „nachladen“ (siehe Kopf): im Spiel an, sonst aus.
static var nachladen: bool = false
## Speicherbudget in Byte (Tests dürfen es senken).
static var budget_bytes: int = SPEICHER_BUDGET_MB * 1048576
## So viele zuletzt benutzte Clips (außer dem gezeigten und dem angeforderten) bleiben beim Entladen unberührt.
static var schutz_zuletzt: int = 2

## Vergrößerung gegenüber der Vermessung der Clips. Im Spiel ASSET_ZU_BILD; Werkzeuge, die in Basispixeln zeichnen
## (Kontaktbögen, Vorschau), setzen 1.
var asset_zu_bild: int = ASSET_ZU_BILD

var _sprite: Sprite2D = null
var _clip: String = ""
var _index: int = -1
var _blick: int = 1


func _init() -> void:
	name = "VelaFrames"
	_sprite = Sprite2D.new()
	_sprite.name = "Bild"
	_sprite.centered = false
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_sprite)


# ---------------------------------------------------------------------------
# Clipdaten (nur clip.txt, ohne Bilder)
# ---------------------------------------------------------------------------

## Die Clipdaten (clip.txt) oder ein leeres Dictionary; lädt keine Bilder.
static func clip_daten(clip: String) -> Dictionary:
	var name: String = String(_alias.get(clip, clip))
	if _daten.has(name):
		return _daten[name]
	if _fehlt.has(name):
		return {}
	var ordner: String = String(_ordner.get(name, ORDNER + name + "/"))
	var text: String = FileAccess.get_file_as_string(ordner + "clip.txt")
	var daten: Dictionary = {}
	if text != "":
		daten = DarstellungVelaFramesTabelle.clip_lesen(text)
		if daten.is_empty() or int(daten["bilder"]) < 1:
			daten = {}
	if daten.is_empty():
		_fehlt[name] = true
		return {}
	_daten[name] = daten
	_ordner[name] = ordner
	return daten


## Registriert einen Clip aus einem beliebigen Ordner (absoluter Pfad oder res://…, mit Schrägstrich am Ende) unter
## dem Namen `clip` und vergisst einen früheren Clip dieses Namens (Werkzeuge und Tests, z. B. HD-Clips außerhalb des
## Projekts). Die Bilder werden erst bei Bedarf geladen. Rückgabe: true, wenn clip.txt lesbar ist.
static func clip_registrieren(clip: String, ordner: String) -> bool:
	clip_entladen(clip)
	_daten.erase(clip)
	_fehlt.erase(clip)
	_alias.erase(clip)
	_ordner[clip] = ordner
	return not clip_daten(clip).is_empty()


## Lässt den Namen `alias` auf den Clip `quelle` zeigen (Tests: ein Testclip als „stand“). Entfernt ihn mit quelle = "".
static func clip_alias(alias: String, quelle: String) -> void:
	clip_entladen(alias)
	if quelle == "":
		_alias.erase(alias)
	else:
		_alias[alias] = quelle


## Vergisst alle geladenen Clips und alle Registrierungen (Tests, nach neuem Umsetzerlauf).
static func clips_vergessen() -> void:
	_clips.clear()
	_daten.clear()
	_ordner.clear()
	_fehlt.clear()
	_alias.clear()
	_vorgemerkt.clear()
	_gezeigt = ""
	ladezeiten.clear()


# ---------------------------------------------------------------------------
# Laden und Entladen
# ---------------------------------------------------------------------------

## Lädt den Clip ganz (sofort, falls noch nicht geladen) und gibt ihn zurück: Dictionary wie in `_clips` (Kopf), mit
## "daten". Leer, wenn es ihn nicht gibt oder er nicht lesbar ist. Entlädt dafür bei Bedarf ältere Clips (LRU).
static func clip_laden(clip: String) -> Dictionary:
	var name: String = String(_alias.get(clip, clip))
	var c: Dictionary = _eintrag(name)
	if c.is_empty():
		return {}
	if not bool(c["bereit"]):
		_platz_schaffen(name)
		while not bool(c["bereit"]):
			if not _bild_laden(name, c):
				return {}
	_benutzt_zaehler += 1
	c["benutzt"] = _benutzt_zaehler
	return c


## Der Clip ist ganz im Speicher.
static func ist_bereit(clip: String) -> bool:
	var c: Variant = _clips.get(String(_alias.get(clip, clip)))
	return c != null and bool((c as Dictionary)["bereit"])


## Lädt ein Häppchen: erst vorgemerkte Clips, dann VORAUS_REIHE, solange `budget_us` nicht verbraucht ist (mindestens
## ein Bild). Entlädt nie. Rückgabe: true, wenn noch etwas zu laden bleibt.
static func vorausladen_schritt(budget_us: int = VORAUS_LEERLAUF_US) -> bool:
	var t0: int = Time.get_ticks_usec()
	while true:
		var name: String = _naechster_clip()
		if name == "":
			return false
		var c: Dictionary = _eintrag(name)
		if c.is_empty():
			continue
		if not _bild_laden(name, c):
			continue
		if Time.get_ticks_usec() - t0 >= budget_us:
			return _naechster_clip() != ""
	return false


## Zeitbudget für den nächsten Aufruf von vorausladen_schritt: größer, solange ein Clip vorgemerkt ist.
static func vorausladen_budget_us() -> int:
	return VORAUS_BEDARF_US if not _vorgemerkt.is_empty() else VORAUS_LEERLAUF_US


## Lädt alle Clips der Reihe ganz und sofort (Werkzeuge und Tests, die immer das gemalte Bild brauchen), bis das Budget
## erreicht ist, ohne zu entladen.
static func alle_vorausladen() -> void:
	while vorausladen_schritt(1 << 40):
		pass


## Entlädt den Clip (Texturen frei); die Clipdaten bleiben.
static func clip_entladen(clip: String) -> void:
	var name: String = String(_alias.get(clip, clip))
	_clips.erase(name)
	if _gezeigt == name:
		_gezeigt = ""


## Texturspeicher aller geladenen Clips in Byte (4 Byte je Pixel der zugeschnittenen Texturen).
static func speicher_bytes() -> int:
	var s: int = 0
	for c: Dictionary in _clips.values():
		s += int(c["bytes"])
	return s


## Namen der (ganz oder teilweise) geladenen Clips.
static func geladene_clips() -> Array[String]:
	var r: Array[String] = []
	for k: String in _clips:
		r.append(k)
	return r


## Bytes, die der Clip ganz geladen höchstens braucht (ohne Zuschnitt: Dateigröße · 4 · Bilder).
static func clip_bytes_hoechstens(clip: String) -> int:
	var d: Dictionary = clip_daten(clip)
	if d.is_empty():
		return 0
	return int(d["bild_breite"]) * int(d["bild_hoehe"]) * 4 * int(d["bilder"])


## Merkt einen Clip zum Nachladen vor (Modus nachladen): vorausladen_schritt lädt ihn vor der Reihe.
static func vormerken(clip: String) -> void:
	var name: String = String(_alias.get(clip, clip))
	if not _vorgemerkt.has(name) and not ist_bereit(name) and not clip_daten(name).is_empty():
		_vorgemerkt.append(name)


## Der Eintrag für `clip` (angelegt, wenn nötig, noch ohne Bilder); leer, wenn es den Clip nicht gibt.
static func _eintrag(name: String) -> Dictionary:
	if _clips.has(name):
		return _clips[name]
	var d: Dictionary = clip_daten(name)
	if d.is_empty():
		return {}
	var n: int = int(d["bilder"])
	var tex: Array = []
	var versatz: Array = []
	tex.resize(n)
	versatz.resize(n)
	versatz.fill(Vector2.ZERO)
	var c: Dictionary = {"daten": d, "ordner": _ordner[name], "texturen": tex, "versatz": versatz, "bytes": 0, "geladen": 0, "bereit": false, "benutzt": _benutzt_zaehler}
	_clips[name] = c
	return c


## Der nächste Clip, der noch Bilder braucht und ins Budget passt: erst vorgemerkte, dann VORAUS_REIHE; "" = fertig.
static func _naechster_clip() -> String:
	while not _vorgemerkt.is_empty():
		var v: String = _vorgemerkt[0]
		if ist_bereit(v) or clip_daten(v).is_empty() or _fehlt.has(v):
			_vorgemerkt.remove_at(0)
			continue
		# vorgemerkt = wird gebraucht: darf ältere Clips verdrängen
		if not _clips.has(v):
			_platz_schaffen(v)
		return v
	for name: String in VORAUS_REIHE:
		if ist_bereit(name) or _fehlt.has(name) or clip_daten(name).is_empty():
			continue
		if _clips.has(name):
			return name
		if speicher_bytes() + clip_bytes_hoechstens(name) <= budget_bytes:
			return name
		# passt nicht ins Budget: Vorausladen hört hier auf (kein Entladen für Vorgriff)
		return ""
	return ""


## Entlädt die am längsten nicht benutzten Clips, bis `neu` (ganz geladen, höchstens) ins Budget passt. Der gezeigte
## Clip und die schutz_zuletzt zuletzt benutzten bleiben.
static func _platz_schaffen(neu: String) -> void:
	var brauche: int = clip_bytes_hoechstens(neu)
	if _clips.has(neu):
		brauche -= int((_clips[neu] as Dictionary)["bytes"])
	while speicher_bytes() + brauche > budget_bytes:
		# geschützt: der Clip selbst, der gezeigte und die schutz_zuletzt zuletzt benutzten
		var geschuetzt: Array[String] = [neu]
		if _gezeigt != "":
			geschuetzt.append(_gezeigt)
		var reihe: Array = _clips.keys()
		reihe.sort_custom(func(a: String, b: String) -> bool: return int((_clips[a] as Dictionary)["benutzt"]) > int((_clips[b] as Dictionary)["benutzt"]))
		var zuletzt: int = 0
		for k: String in reihe:
			if zuletzt >= schutz_zuletzt:
				break
			if not geschuetzt.has(k):
				geschuetzt.append(k)
				zuletzt += 1
		var opfer: String = ""
		var aelteste: int = 1 << 60
		for k: String in _clips:
			if geschuetzt.has(k):
				continue
			var b: int = int((_clips[k] as Dictionary)["benutzt"])
			if b < aelteste:
				aelteste = b
				opfer = k
		if opfer == "":
			return
		_clips.erase(opfer)


## Lädt das nächste fehlende Bild des Clips (Datei lesen, entpacken, zuschneiden, Textur anlegen, Image verwerfen).
## false bei einem Fehler (der Clip gilt dann als nicht vorhanden).
static func _bild_laden(name: String, c: Dictionary) -> bool:
	var d: Dictionary = c["daten"]
	var i: int = int(c["geladen"])
	var t0: int = Time.get_ticks_usec()
	var bild: Image = bild_aus_datei(name, i)
	if bild == null:
		push_error("Clip %s: Bild %d fehlt oder ist unlesbar" % [name, i + 1])
		_clips.erase(name)
		_fehlt[name] = true
		_daten.erase(name)
		return false
	var rahmen: Rect2i = bild.get_used_rect().grow(1).intersection(Rect2i(Vector2i.ZERO, bild.get_size()))
	if bild.get_used_rect().size == Vector2i.ZERO:
		rahmen = Rect2i(0, 0, 1, 1)
	if rahmen.size != bild.get_size():
		bild = bild.get_region(rahmen)
	(c["texturen"] as Array)[i] = ImageTexture.create_from_image(bild)
	(c["versatz"] as Array)[i] = Vector2(rahmen.position)
	c["bytes"] = int(c["bytes"]) + bild.get_width() * bild.get_height() * 4
	c["geladen"] = i + 1
	if i + 1 >= int(d["bilder"]):
		c["bereit"] = true
	var us: int = Time.get_ticks_usec() - t0
	var z: Dictionary = ladezeiten.get(name, {"bilder": 0, "us": 0, "max_us": 0})
	z["bilder"] = int(z["bilder"]) + 1
	z["us"] = int(z["us"]) + us
	z["max_us"] = maxi(int(z["max_us"]), us)
	ladezeiten[name] = z
	return true


## Das Bild `index` (0-basiert) des Clips unmittelbar aus der Datei, als RGBA8, vollständig (nicht zugeschnitten);
## null, wenn die Datei fehlt oder unlesbar ist. Für Tests und Werkzeuge: der Speicher hält die Bilder nicht.
static func bild_aus_datei(clip: String, index: int) -> Image:
	var d: Dictionary = clip_daten(clip)
	if d.is_empty():
		return null
	var name: String = String(_alias.get(clip, clip))
	var ordner: String = String(_ordner.get(name, ORDNER + name + "/"))
	var endung: String = "webp" if String(d["format"]) == "webp" else "png"
	var bytes: PackedByteArray = FileAccess.get_file_as_bytes(ordner + "f_%04d.%s" % [index + 1, endung])
	if bytes.is_empty():
		return null
	var bild: Image = Image.new()
	var fehler: int = bild.load_webp_from_buffer(bytes) if endung == "webp" else bild.load_png_from_buffer(bytes)
	if fehler != OK:
		return null
	bild.convert(Image.FORMAT_RGBA8)
	return bild


## Versatz (Dateipixel) der linken oberen Ecke der Textur im Dateibild; Vector2.ZERO, wenn nicht geladen.
static func bild_versatz(clip: String, index: int) -> Vector2:
	var c: Variant = _clips.get(String(_alias.get(clip, clip)))
	if c == null or index < 0 or index >= (c as Dictionary)["versatz"].size():
		return Vector2.ZERO
	return ((c as Dictionary)["versatz"] as Array)[index]


## Die Textur des Bildes (zugeschnitten, siehe bild_versatz) oder null. Lädt den Clip bei Bedarf ganz.
static func bild_textur(clip: String, index: int) -> Texture2D:
	var c: Dictionary = clip_laden(clip)
	if c.is_empty() or index < 0 or index >= (c["texturen"] as Array).size():
		return null
	return (c["texturen"] as Array)[index]


## Ist für den Zustand der Figur ein Clip vorgesehen und bereit (sonst zeigt die Puppe oder der Platzhalter)? Die Tabelle
## steht in DarstellungVelaFramesTabelle (Kopf). `welt` entscheidet bei GETROFFEN über vorn oder hinten (ohne Welt: vorn).
## Modus nachladen: lädt nie, merkt einen fehlenden Clip nur vor; sonst lädt es den Clip sofort.
static func abgedeckt(f: KernEntitaeten.Figur, welt: KernWelt = null) -> bool:
	var w: Dictionary = DarstellungVelaFramesTabelle.wahl(f, welt)
	if w.is_empty():
		return false
	var clip: String = String(w["clip"])
	if nachladen:
		if clip_daten(clip).is_empty():
			return false
		if not ist_bereit(clip):
			vormerken(clip)
			return false
		_benutzt_zaehler += 1
		(_clips[String(_alias.get(clip, clip))] as Dictionary)["benutzt"] = _benutzt_zaehler
		return true
	return not clip_laden(clip).is_empty()


# ---------------------------------------------------------------------------
# Anzeige
# ---------------------------------------------------------------------------

## Zeigt die Figur nach ihrem Zustand (Aktion, Aktionsuhr, Blick); liest die Welt nur. Nicht abgedeckte Aktionen
## verstecken den Node.
func aus_figur(f: KernEntitaeten.Figur, welt: KernWelt) -> void:
	var w: Dictionary = DarstellungVelaFramesTabelle.wahl(f, welt)
	if w.is_empty() or not _verfuegbar(String(w["clip"])):
		visible = false
		return
	var d: Dictionary = clip_daten(String(w["clip"]))
	aus_clip_bild(String(w["clip"]), DarstellungVelaFramesTabelle.bildindex_wahl(w, d), int(w["blick"]))


## Im Modus nachladen zählt nur ein bereiter Clip, sonst wird er geladen (clip_laden).
static func _verfuegbar(clip: String) -> bool:
	if nachladen:
		return ist_bereit(clip)
	return not clip_laden(clip).is_empty()


## Zeigt den Clip `clip` zur Aktionsuhr `zeit_ticks` (Beginn 1) mit Blick 1 (rechts) oder −1 (links).
## Für Tests und Kontaktbögen. Gibt false zurück (und versteckt den Node), wenn der Clip fehlt.
func aus_clip(clip: String, zeit_ticks: int, blick: int) -> bool:
	var d: Dictionary = clip_daten(clip)
	if d.is_empty():
		visible = false
		return false
	return aus_clip_bild(clip, DarstellungVelaFramesTabelle.bildindex(clip, zeit_ticks, d), blick)


## Zeigt das Bild `index` (0-basiert) des Clips unmittelbar (Kontaktbögen). Lädt den Clip bei Bedarf ganz (auch im Modus
## nachladen: wer es direkt aufruft, will das Bild jetzt).
func aus_clip_bild(clip: String, index: int, blick: int) -> bool:
	var c: Dictionary = clip_laden(clip)
	if c.is_empty():
		visible = false
		return false
	var d: Dictionary = c["daten"]
	var i: int = clampi(index, 0, int(d["bilder"]) - 1)
	_clip = clip
	_gezeigt = String(_alias.get(clip, clip))
	_index = i
	_blick = -1 if blick < 0 else 1
	_sprite.texture = (c["texturen"] as Array)[i]
	# Anker (Mitte der Fußspalte, unterste Figurzeile) liegt im Ursprung: Spalte um ihre Mitte, Zeile über dem Boden.
	# Pixel-Clip: (ankerx + 0,5, ankery + 1) Basispixel, NEAREST. HD-Clip: Fußpunkt in Dateipixeln, Maßstab `skala`, LINEAR.
	# Beide werden um ASSET_ZU_BILD vergrößert. Die Textur ist zugeschnitten: ihr Versatz im Dateibild kommt dazu.
	var weich: bool = bool(d["weich"])
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR if weich else CanvasItem.TEXTURE_FILTER_NEAREST
	var m: float = float(d["skala"]) * float(asset_zu_bild)
	_sprite.scale = Vector2(m, m)
	_sprite.offset = (c["versatz"] as Array)[i] - (d["fuss"] as Vector2)
	scale = Vector2(float(_blick), 1.0)
	visible = true
	return true


func clip_name() -> String:
	return _clip


## Index (0-basiert) des gezeigten Bildes, −1 vor der ersten Anzeige.
func bild_index() -> int:
	return _index


func blick() -> int:
	return _blick


## Das gezeigte Bild (RGBA8, unverändert aus der Datei, neu gelesen, vollständig) oder null. Nur für Tests.
func aktuelles_bild() -> Image:
	if _clip == "" or _index < 0:
		return null
	return bild_aus_datei(_clip, _index)


## Die Textur des gezeigten Bildes (zugeschnitten) oder null.
func aktuelle_textur() -> Texture2D:
	return _sprite.texture
