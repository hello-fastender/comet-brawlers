## Vela aus den Bildfolgen der Video-Clips (Weg „Vela als Video“): ein Sprite, das je Tick genau ein Bild
## des Clips zeigt. Die Bilder und clip.txt stammen aus `res://grafik/vela_video/<clip>/` (erzeugt von
## werkzeuge/video_umsetzer.gd); geladen wird per Dateizugriff, ohne Editor-Import, kein Überblenden.
## Zwei Arten von Clips, die im Spiel gemischt vorkommen dürfen:
##   Pixel-Clip (Standard): Pixelkunst, 142 Bildpixel hohe Figur, höchstens 64 Farben, harte Kante, PNG mit Palette;
##     Texturfilter NEAREST, Sprite im Maßstab 1.
##   HD-Clip (clip.txt `weich=1`, Umsetzer `--hd`): gemalter Look, RGBA 8 Bit mit weicher Kante, verlustfreies WebP
##     oder PNG, Figur z. B. 360 Dateipixel hoch; Texturfilter LINEAR (ohne Mipmaps: schärfer, sie machten das auf
##     0,39 verkleinerte Bild sichtbar unscharf), Sprite im Maßstab `skala` (Spielbildpixel je Dateipixel, z. B.
##     142 / 360): im Spiel ist die Figur so groß wie die Pixel-Figur, nur feiner aufgelöst.
##
## Ursprung des Nodes = Fußpunkt in Bildpixeln (wie bei der Puppe; Spiegelachse in der Mitte der Fußspalte,
## die Hauptsitzung setzt `position` aus DarstellungZeichnen.figurFuss(welt) + 1 Bildpixel nach rechts). Der
## Anker aus clip.txt (Mitte der Füße, Bodenlinie) wird abgezogen. Blick links: scale.x = −1.
##
## Welche Aktion mit welchem Clip gezeigt wird und welches Bild zur Aktionsuhr gehört, steht in
## DarstellungVelaFramesTabelle (reine Funktionen). Der Node liest die Welt nur.
class_name DarstellungVelaFrames
extends Node2D

const ORDNER: String = "res://grafik/vela_video/"

## Geladene Clips: Name → {"daten": Dictionary, "bilder": Array[Image], "texturen": Array[ImageTexture]};
## leeres Dictionary = es gibt keinen (brauchbaren) Clip dieses Namens.
static var _clips: Dictionary = {}

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
# Clips laden
# ---------------------------------------------------------------------------

## Lädt den Clip (einmal, danach aus dem Speicher). Leer, wenn es ihn nicht gibt oder er nicht lesbar ist.
static func clip_laden(clip: String) -> Dictionary:
	if _clips.has(clip):
		return _clips[clip]
	var ergebnis: Dictionary = _lade_von_platte(clip)
	_clips[clip] = ergebnis
	return ergebnis


## Lädt einen Clip aus einem beliebigen Ordner (absoluter Pfad oder res://…, mit Schrägstrich am Ende) und merkt ihn unter
## dem Namen `clip`, auch wenn es dort schon einen gab (Werkzeuge und Tests, z. B. HD-Clips außerhalb des Projekts).
## Rückgabe: true, wenn der Clip lesbar ist.
static func clip_registrieren(clip: String, ordner: String) -> bool:
	var ergebnis: Dictionary = _lade_von_platte(clip, ordner)
	_clips[clip] = ergebnis
	return not ergebnis.is_empty()


static func _lade_von_platte(clip: String, ordner: String = "") -> Dictionary:
	if ordner == "":
		ordner = ORDNER + clip + "/"
	var text: String = FileAccess.get_file_as_string(ordner + "clip.txt")
	if text == "":
		return {}
	var daten: Dictionary = DarstellungVelaFramesTabelle.clip_lesen(text)
	if daten.is_empty() or int(daten["bilder"]) < 1:
		return {}
	var bilder: Array[Image] = []
	var texturen: Array[ImageTexture] = []
	for i: int in int(daten["bilder"]):
		var endung: String = "webp" if String(daten["format"]) == "webp" else "png"
		var bytes: PackedByteArray = FileAccess.get_file_as_bytes(ordner + "f_%04d.%s" % [i + 1, endung])
		var bild: Image = Image.new()
		var fehler: int = ERR_INVALID_DATA
		if not bytes.is_empty():
			fehler = bild.load_webp_from_buffer(bytes) if endung == "webp" else bild.load_png_from_buffer(bytes)
		if fehler != OK:
			push_error("Clip %s: Bild %d fehlt oder ist unlesbar" % [clip, i + 1])
			return {}
		bild.convert(Image.FORMAT_RGBA8)
		bilder.append(bild)
		texturen.append(ImageTexture.create_from_image(bild))
	return {"daten": daten, "bilder": bilder, "texturen": texturen}


## Vergisst alle geladenen Clips (Tests, nach neuem Umsetzerlauf).
static func clips_vergessen() -> void:
	_clips.clear()


## Die Clipdaten (clip.txt) oder ein leeres Dictionary.
static func clip_daten(clip: String) -> Dictionary:
	var c: Dictionary = clip_laden(clip)
	return c["daten"] if not c.is_empty() else {}


## Ist für den Zustand der Figur ein Clip vorgesehen und geladen (sonst zeigt die Puppe oder der Platzhalter)? Die Tabelle
## steht in DarstellungVelaFramesTabelle (Kopf). `welt` entscheidet bei GETROFFEN über vorn oder hinten (ohne Welt: vorn).
static func abgedeckt(f: KernEntitaeten.Figur, welt: KernWelt = null) -> bool:
	var w: Dictionary = DarstellungVelaFramesTabelle.wahl(f, welt)
	return not w.is_empty() and not clip_laden(String(w["clip"])).is_empty()


# ---------------------------------------------------------------------------
# Anzeige
# ---------------------------------------------------------------------------

## Zeigt die Figur nach ihrem Zustand (Aktion, Aktionsuhr, Blick); liest die Welt nur. Nicht abgedeckte Aktionen
## verstecken den Node.
func aus_figur(f: KernEntitaeten.Figur, welt: KernWelt) -> void:
	var w: Dictionary = DarstellungVelaFramesTabelle.wahl(f, welt)
	if w.is_empty() or clip_laden(String(w["clip"])).is_empty():
		visible = false
		return
	var c: Dictionary = clip_laden(String(w["clip"]))
	aus_clip_bild(String(w["clip"]), DarstellungVelaFramesTabelle.bildindex_wahl(w, c["daten"]), int(w["blick"]))


## Zeigt den Clip `clip` zur Aktionsuhr `zeit_ticks` (Beginn 1) mit Blick 1 (rechts) oder −1 (links).
## Für Tests und Kontaktbögen. Gibt false zurück (und versteckt den Node), wenn der Clip fehlt.
func aus_clip(clip: String, zeit_ticks: int, blick: int) -> bool:
	var c: Dictionary = clip_laden(clip)
	if c.is_empty():
		visible = false
		return false
	var d: Dictionary = c["daten"]
	return aus_clip_bild(clip, DarstellungVelaFramesTabelle.bildindex(clip, zeit_ticks, d), blick)


## Zeigt das Bild `index` (0-basiert) des Clips unmittelbar (Kontaktbögen).
func aus_clip_bild(clip: String, index: int, blick: int) -> bool:
	var c: Dictionary = clip_laden(clip)
	if c.is_empty():
		visible = false
		return false
	var d: Dictionary = c["daten"]
	var i: int = clampi(index, 0, int(d["bilder"]) - 1)
	_clip = clip
	_index = i
	_blick = -1 if blick < 0 else 1
	_sprite.texture = (c["texturen"] as Array)[i]
	# Anker (Mitte der Fußspalte, unterste Figurzeile) liegt im Ursprung: Spalte um ihre Mitte, Zeile über dem Boden.
	# Pixel-Clip: (ankerx + 0,5, ankery + 1) Pixel, Maßstab 1, NEAREST. HD-Clip: Fußpunkt in Dateipixeln, Maßstab `skala`, LINEAR.
	var weich: bool = bool(d["weich"])
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR if weich else CanvasItem.TEXTURE_FILTER_NEAREST
	_sprite.scale = Vector2(float(d["skala"]), float(d["skala"]))
	_sprite.offset = -(d["fuss"] as Vector2)
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


## Das gezeigte Bild (RGBA8, unverändert aus der Datei) oder null.
func aktuelles_bild() -> Image:
	if _clip == "" or _index < 0:
		return null
	var c: Dictionary = clip_laden(_clip)
	if c.is_empty():
		return null
	return (c["bilder"] as Array)[_index]
