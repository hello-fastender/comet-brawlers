# Gemeinsame Hilfen des Bosses Ballast (K4) nach
# docs/spezifikation-welt.md, Abschnitt 7.
# Port von spiel/src/kern/gegner/boss_zustand.ts.
#
# Die eigenen Zustände des Bosses stehen in g.boss (entitaeten.gd
# BossFelder): Angriff, Wahl, Abläufe von Armschwung, Ansturm und Presse,
# Stoß, Bahn, Taumeln und Super-Armor; Positionen und Wege als Fest, Codes
# als Zeichenketten.
class_name KernGegnerBossZustand
extends RefCounted

# ===========================================================================
# Hilfen
# ===========================================================================

## Eigener Angriff (Welt 7.4, SA3): von A bis zum letzten aktiven Frame, also ANKUENDIGUNG und ANGRIFF.
static func eigenerAngriff(g: KernEntitaeten.Gegner) -> bool:
	return g.modus == "ANKUENDIGUNG" or g.modus == "ANGRIFF"


## Gehört die Instanz im Feld angriff dem Boss selbst (nicht WG der Figur am geworfenen Boss)?
static func eigeneInstanz(g: KernEntitaeten.Gegner) -> bool:
	return g.angriff != null and g.angriff.urheber == g.schluessel


## Beendet den eigenen Angriff (Kampf 7: laufende Angriffe sind abgebrochen); fremde Instanzen bleiben.
static func eigenenAngriffBeenden(g: KernEntitaeten.Gegner) -> void:
	if eigeneInstanz(g):
		g.angriff = null
	g.boss.art = ""


## Begrenzung eines Bossschritts (Welt 2.2 Punkt 5): Band, Hindernisse und
## unzerbrochene Behälter (gegenstaende.gd behaelterHindernisse: ab h+1 kein
## Hindernis, Welt 9.2), nicht die Bildränder; dazu der Arenarand (Welt 7.3:
## Ansturm endet am Arenarand, Rückzug an der Arenawand kürzer): x von k0
## bis k1 + Bildbreite (Festlegung K4, Lücke).
static func bossBegrenzung(welt: KernWelt) -> KernStage.Begrenzung:
	var a: Variant = welt.stage.arena
	var b: KernStage.Begrenzung = KernStage.Begrenzung.new()
	b.stage = welt.stage
	b.zusatz = KernGegenstaende.behaelterHindernisse(welt)
	b.x_min = null if a == null else KernFestkomma.ausGanz(a.k0)
	b.x_max = null if a == null else KernFestkomma.ausGanz(a.k1 + KernWerte.BILD_BREITE)
	return b


## Schritt des Bosses um (dx, dz) mit stage.gd schrittBegrenzt (erst x, dann z, Stopp an der Kante).
static func bossSchritt(welt: KernWelt, g: KernEntitaeten.Gegner, dx: int, dz: int) -> KernStage.SchrittErgebnis:
	var r: KernStage.SchrittErgebnis = KernStage.schrittBegrenzt(bossBegrenzung(welt), g.x, g.z, g.h, dx, dz)
	g.x = r.x
	g.z = r.z
	return r


## Ganze Zahl aus welt.fest[name] (Welt 11.3: ersetzt das Ergebnis einer
## Ziehung nach der Ziehung) oder null, wenn nicht gesetzt.
## Rückgabe: int oder null.
static func festZahl(welt: KernWelt, name: String, von: int, bis: int) -> Variant:
	if not welt.fest.has(name):
		return null
	var w: Variant = welt.fest[name]
	# Number(w): leere Zeichenkette ergibt 0; sonst ganze Zahl oder Fehler
	var text: String = str(w).strip_edges()
	var n: int = 0
	var ganzzahl: bool = true
	if text != "":
		if text.is_valid_int():
			n = text.to_int()
		else:
			ganzzahl = false
	if not ganzzahl or n < von or n > bis:
		push_error("fest.%s muss eine ganze Zahl von %d bis %d sein, nicht „%s“" % [name, von, bis, str(w)])
		return null
	return n
