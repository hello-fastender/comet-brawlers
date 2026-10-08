# Maße, Farben und Lagen der Platzhaltergrafik (Auftrag 3, 2.5).
# Port von spiel/src/darstellung/masse.ts.
#
# Zahlen der Spezifikation (Bildgröße, Bildschirm-y, Anzeigeleiste, Blende,
# aktives Fenster, Behälter) kommen aus kern/werte.gd. Diese Datei hält nur
# Werte der Darstellung, die die Spezifikation frei lässt (Farben,
# Schriftgrößen, Lagen der Debug-Anzeige), und die Umrisse aus den
# Designdokumenten; je Wert ein Kommentar mit Herkunft. Keine Logik.
#
# Umsetzung: Umrisse und Maße mit mehreren Feldern sind const-Dictionaries
# (Zugriff mit Punkt: UMRISS_FIGUR.breite); FARBE ist ein Dictionary mit
# Color-Werten (FARBE.figur), die rgba()-Farben der TypeScript-Fassung stehen
# als Color mit Alpha. Die Sprite-Werte (Blätter, Werferpunkte, Funken) der
# TypeScript-Fassung entfallen: Sprites kommen später als Puppe.
class_name DarstellungMasse
extends RefCounted

# ===========================================================================
# Darstellung bei vierfacher Auflösung (E25 Faktor 2, E28 Faktor 4; Auftrag 5,
# Phase 1, U1; docs/grafik.md 9.10)
# ===========================================================================

## Bildpixel je Spielpixel: Das Spielbild hat DARSTELLUNG · 384 × DARSTELLUNG · 224
## Bildpixel (E28: 1536 × 896; project.godot, Viewport), die Logik und alle Lagen der
## Darstellung rechnen in Spielpixeln. Nur die Zeichenklasse (zeichner.gd) multipliziert
## damit; Clips und Puppe sind für ASSET_BASIS vermessen und werden um ASSET_ZU_BILD vergrößert.
const DARSTELLUNG: int = 4
## Bildpixel je Spielpixel, in denen die Pixel-Grafiken (Puppe, Pixel-Clips, `clip.txt`, Gehtempo der Puppe) vermessen
## sind: E25, 768 × 448. Wird nie geändert, solange diese Grafiken in ihrer Vermessung gelten.
const ASSET_BASIS: int = 2
## Vergrößerung der Puppe und der Clips gegenüber ihrer Vermessung (E28: 4 / 2 = 2, ganzzahlig, die Pixel bleiben scharf).
const ASSET_ZU_BILD: int = DARSTELLUNG / ASSET_BASIS

# ===========================================================================
# Umrisse (Breite × Höhe mit Schatten, px)
# ===========================================================================

## Umriss einer Figur im Stand: breite und hoehe mit Schatten, schatten = Breite des Schattens.
## Vela 57 × 76 (docs/design.md, 5: „wie die Referenzfigur“); Schatten 36 wie im Vorbild (research/captcomm/grafik/README.md: Ellipse 36 × 11).
const UMRISS_FIGUR: Dictionary = {"breite": 57, "hoehe": 76, "schatten": 36}

## Gegner nach docs/design-gegner-stages.md, 1 (beschlossen E9): Bolzer 57 × 72,
## Rammbock 60 × 76, Zünder 64 × 72. Ballast 70 × 100 nach Auftrag 3, 2.5
## (die Designdokumente nennen für ihn keinen Umriss). Puppe wie ein Bolzer.
## Schatten etwa 5/8 der Breite (Vorbild: 36 bei 57).
const UMRISS_GEGNER: Dictionary = {
	"Bolzer": {"breite": 57, "hoehe": 72, "schatten": 36},
	"Rammbock": {"breite": 60, "hoehe": 76, "schatten": 38},
	"Zünder": {"breite": 64, "hoehe": 72, "schatten": 40},
	"Ballast": {"breite": 70, "hoehe": 100, "schatten": 48},
	"Puppe": {"breite": 57, "hoehe": 72, "schatten": 36},
}

## Höhe der Schattenellipse (Vorbild 10 bis 11 px, research/captcomm/grafik/README.md).
const SCHATTEN_HOEHE: int = 10
## Liegende Figuren: Breite = Höhe des Umrisses, Höhe = Breite des Umrisses / LIEGEND_TEILER (Lesbarkeit).
const LIEGEND_TEILER: int = 3
## Hockende und aufstehende Figuren: Höhe = Höhe des Umrisses · HOCKE_ZAEHLER / HOCKE_NENNER.
const HOCKE_ZAEHLER: int = 2
const HOCKE_NENNER: int = 3
## Dreieck der Blickrichtung: Abstand vom oberen Rand, halbe Höhe, Länge über den Rand hinaus.
const BLICK_OBEN: int = 8
const BLICK_HALB: int = 4
const BLICK_LAENGE: int = 5
## Sprint: Bewegungsstriche hinter der Figur (Anzahl, Länge, Abstand vom Körper, Zeilenabstand ab dem oberen Rand).
const SPRINT_STRICHE: Dictionary = {"anzahl": 3, "laenge": 14, "abstand": 4, "zeile": 14}
## Raketenwerfer in der Hand der Figur: Länge, Höhe, Abstand vom oberen Rand.
const WAFFE_HAND: Dictionary = {"laenge": 22, "hoehe": 5, "oben": 22}

## Gegenstände (Platzhalter): Breite × Höhe in px.
const UMRISS_GEGENSTAND: Dictionary = {
	"Kometenbraten": {"breite": 16, "hoehe": 10},
	"Eisnudelschale": {"breite": 16, "hoehe": 10},
	"Sternbeeren": {"breite": 12, "hoehe": 8},
	"Raketenwerfer": {"breite": 28, "hoehe": 10},
}
## Weggeworfene leere Waffe (Kampf 10.4).
const UMRISS_WAFFE: Dictionary = {"breite": 28, "hoehe": 8}
## Rakete im Flug (Kampf 10.3; Welt 6).
const UMRISS_RAKETE: Dictionary = {"breite": 14, "hoehe": 6}
## Explosion: Halbachsen der Ellipse (Platzhalter).
const EXPLOSION: Dictionary = {"rx": 22, "ry": 14}
## Effekt (Platzhalter): Kantenlänge.
const UMRISS_EFFEKT: int = 10
## Zerbrochener Behälter: Höhe der Trümmer.
const TRUEMMER_HOEHE: int = 6
## Schatten kleiner Objekte: Breite = Breite des Objekts, Höhe = SCHATTEN_HOEHE / 2.
const SCHATTEN_KLEIN_TEILER: int = 2

# ===========================================================================
# Hintergrund (Welt 2.1, 2.3: Farbflächen je Abschnitt, Tiefenband als Linien)
# ===========================================================================

## Abstand der Tiefenlinien im Band (z) und der Bodenmarken (x), px.
const TIEFENLINIE_ABSTAND: int = 16
const BODENMARKE_ABSTAND: int = 64
## Höhe der Hintergrundbilder über der Obergrenze des Bandes, px (Platzhalter).
const HINTERGRUND_HOEHE: int = 72
## Abstand der Beschriftung vom Rand eines Hintergrundbilds, px.
const HINTERGRUND_RAND: int = 3

# ===========================================================================
# Anzeige (Welt 10.1; Lagen aus werte.gd ANZEIGE)
# ===========================================================================

## Symbol der Leben: Breite und Höhe in px; die Zahl folgt nach LEBEN_ABSTAND px.
const LEBEN_SYMBOL: Dictionary = {"breite": 5, "hoehe": 7}
const LEBEN_ABSTAND: int = 8
## Pfeil „weiter“: Dicke des Schafts = Höhe des Pfeils / PFEIL_SCHAFT_TEILER · 2.
const PFEIL_SCHAFT_TEILER: int = 4
## Große Texte (PAUSE, STAGE CLEAR, GAME OVER): Vergrößerung der Schrift 5 × 7 und Zeilenabstand.
const GROSS_FAKTOR: int = 2
const GROSS_ZEILE: int = 20
## Rand des Kastens hinter großen Texten, px.
const TEXTKASTEN_RAND: int = 4
## Anzeige der Aufzeichnung (F2) oben rechts: Abstand vom rechten Rand, Zeile.
const AUFZEICHNUNG_LAGE: Dictionary = {"rechts": 8, "zeile": 6}
## Hinweis (Pfad der gespeicherten Aufzeichnung u. ä., nur Godot-Fassung): Rand links, Abstand vom unteren Rand, Zeilenabstand, Dauer in Bildern.
const HINWEIS: Dictionary = {"x": 4, "unten": 14, "abstand": 7, "dauer": 600}

# ===========================================================================
# Debug-Anzeige (Welt 10.6; Auftrag 3, 2.5)
# ===========================================================================

## Debug-Text: erste Zeile, linker Rand, Zeilenabstand (Schrift 3 × 5).
const DEBUG_TEXT: Dictionary = {"zeile": 28, "x": 4, "abstand": 7}
## Beschriftung über einer Figur: Abstand über dem Umriss, Zeilenabstand.
const DEBUG_MARKE: Dictionary = {"ueber": 3, "abstand": 7}
## Halbe Größe des Kreuzes am Zielpunkt, px.
const ZIELKREUZ: int = 3
## Strichmuster für Höhenkästen und inaktive Flächen.
const STRICH: Array = [2, 2]

# ===========================================================================
# Farben
# ===========================================================================

const FARBE: Dictionary = {
	"rand": Color("#000000"),
	# Figur Vela und Gegner im Stand, je Typ
	"figur": Color("#3fa7ff"),
	"gegner": {"Bolzer": Color("#7fae4f"), "Rammbock": Color("#c07a3a"), "Zünder": Color("#4fa3a8"), "Ballast": Color("#9a56c4"), "Puppe": Color("#b7a98a")},
	# Zustandsfarben (Auftrag 3, 2.5)
	"angriff_aktiv": Color("#ff4b2b"),
	"angriff": Color("#ff9a3c"),
	"ankuendigung": Color("#ffd23f"),
	"getroffen": Color("#ffffff"),
	"liegen": Color("#8a8f99"),
	"gehalten": Color("#d9a6ff"),
	"griff": Color("#6fd6ff"),
	"wartend": Color("#5a5f6a"),
	"kontur": Color("#10131a"),
	"blick": Color("#10131a"),
	"schatten": Color(0 / 255.0, 0 / 255.0, 0 / 255.0, 0.45),
	"waffe": Color("#3c9a48"),
	"sprint": Color(255 / 255.0, 255 / 255.0, 255 / 255.0, 0.6),
	# Objekte
	"fass": Color("#8b5a2b"),
	"bosskiste": Color("#6f7f8f"),
	"truemmer": Color("#5b4630"),
	"gegenstand": {"Kometenbraten": Color("#e8643c"), "Eisnudelschale": Color("#bfe6ff"), "Sternbeeren": Color("#e04fd0"), "Raketenwerfer": Color("#3c9a48")},
	"rakete": Color("#ffe14d"),
	"explosion": Color(255 / 255.0, 140 / 255.0, 40 / 255.0, 0.75),
	"effekt": Color("#ffffff"),
	# Hintergrund: Wand und Boden je Band (zyklisch), Bildflächen je Hintergrundsatz (zyklisch)
	"wand": [Color("#1c2a44"), Color("#2d2341"), Color("#283028")],
	"boden": [Color("#3a4762"), Color("#4a3f58"), Color("#465140")],
	"bild": [Color("#4a5a7a"), Color("#6a4a6e"), Color("#56604a"), Color("#7a6040")],
	"bild_text": Color(255 / 255.0, 255 / 255.0, 255 / 255.0, 0.45),
	"leer": Color("#0b0d12"),
	"bandkante": Color("#9fd8ff"),
	"tiefenlinie": Color(255 / 255.0, 255 / 255.0, 255 / 255.0, 0.07),
	"bodenmarke": Color(255 / 255.0, 255 / 255.0, 255 / 255.0, 0.10),
	"vordergrund": Color(12 / 255.0, 14 / 255.0, 22 / 255.0, 0.55),
	"vordergrund_kante": Color(160 / 255.0, 170 / 255.0, 190 / 255.0, 0.6),
	# Anzeige
	"text": Color("#f2f4f8"),
	"balken_grund": Color("#1a1d24"),
	"balken_rand": Color("#606775"),
	# Lagen der LP-Balken: Farbe n (1 grün, 2 gelb, 3 orange; Welt 10.1, Richtwert grafik/README.md)
	"lagen": [Color("#1a1d24"), Color("#3ccf4e"), Color("#f2d431"), Color("#f28a1e")],
	"pfeil": Color("#ffd23f"),
	"textkasten": Color(0 / 255.0, 0 / 255.0, 0 / 255.0, 0.6),
	"aufzeichnung": Color("#ff3b3b"),
	# Debug
	"debug_text": Color("#e8f0ff"),
	"debug_grund": Color(0 / 255.0, 0 / 255.0, 0 / 255.0, 0.55),
	"flaeche_gegner": Color("#00e5ff"),
	"flaeche_figur": Color("#ff3366"),
	"flaeche_inaktiv": Color(200 / 255.0, 200 / 255.0, 200 / 255.0, 0.55),
	"zielpunkt": Color("#ffe14d"),
	"folgepunkt": Color(255 / 255.0, 255 / 255.0, 255 / 255.0, 0.35),
	"totzone": Color(255 / 255.0, 210 / 255.0, 63 / 255.0, 0.5),
	"aufnahme": Color("#7dff8a"),
	"hindernis": Color("#ff9a3c"),
	"hindernis_flaeche": Color(0 / 255.0, 0 / 255.0, 0 / 255.0, 0.35),
	"treffer": Color("#ffffff"),
}
